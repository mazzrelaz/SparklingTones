/**
 * pedale-ponte.js — il contratto fra l'app e il pedale ESP32
 * ===========================================================
 *
 * Costruisce il blocco che descrive un banco e lo manda al pedale via BLE.
 * **Dentro ci sono i frame gia' serializzati**, prodotti dallo stesso encoder
 * che parla con l'ampli: il firmware non serializza niente e non conosce il
 * formato dei preset dello Spark. Corregge il sequence number all'indice 2 —
 * che il checksum non copre, perche' e' uno XOR dei soli byte impacchettati —
 * e scrive.
 *
 * L'altra sponda di questo file e' `pedale/prova-ble/banchi.h`: **il formato
 * sta scritto in tutti e due i posti e va cambiato insieme.** E' la ragione
 * per cui firmware e app stanno nello stesso repo.
 *
 * Formato del blocco:
 *
 *   "SPB1"                        4 byte
 *   slot                          1     0..7
 *   len + nome del banco          1 + n
 *   quanti posti                  1     sempre 8
 *   per ogni posto:
 *     presente                    1     0 = vuoto, e finisce li'
 *     len + uuid                  1 + n
 *     len + nome del preset       1 + n
 *     quanti chunk                1
 *     per ogni chunk: len + byte  1 + n
 */
window.PedalePonte = (function () {
  'use strict';

  /* UUID del servizio del pedale. Nostri, non dello Spark. */
  const SERVIZIO = '7a9c0000-4b2e-4f6a-9d3c-1e5f8b2a6c40';
  const COMANDO  = '7a9c0001-4b2e-4f6a-9d3c-1e5f8b2a6c40';
  const STATO    = '7a9c0002-4b2e-4f6a-9d3c-1e5f8b2a6c40';

  const CMD = { CIAO: 0x01, ELENCA: 0x02, INIZIA: 0x10, PEZZO: 0x11,
                FINE: 0x12, CANCELLA: 0x20, USA: 0x21, SCAMBIA: 0x22 };
  const RSP = { 0x81: 'info', 0x82: 'elenco', 0x8f: 'errore' };

  const POSTI = 8;
  const TESTO_MAX = 39;          // il firmware tiene 40 byte col terminatore
  /* Quanto si scrive per volta. L'MTU negoziato e' 256, quindi 180 sta
     comodo: non e' il collo di bottiglia, e stare larghi evita di scoprire
     il limite vero durante un concerto. */
  const PASSO = 180;

  function testo(s) {
    const byte = new TextEncoder().encode(String(s == null ? '' : s));
    const n = Math.min(byte.length, TESTO_MAX);
    return [n, ...byte.subarray(0, n)];
  }

  /**
   * I frame pronti da scrivere sulla 0xFFC1 per far suonare questo preset.
   * Seq 0x01 per tutti: **tutti i chunk di un preset devono avere lo stesso**,
   * altrimenti l'ampli li vede come messaggi scollegati e li conferma senza
   * assemblarne nessuno. Il pedale lo ripatcha a ogni invio.
   */
  function frameDiPreset(record) {
    const payload = Spark.serializePreset(record, Spark.SOFTWARE_TARGET, { omitTail: true });
    const chunks  = Spark.splitPresetIntoChunks(payload);
    return chunks.map(c =>
      Spark.encode({ cmd: Spark.CMD_ACTION, sub: 0x01, data: c }, 0x01, false));
  }

  /**
   * @param banco {nome, posti: [record|null × 8]}
   * @param slot  dove va messo nel pedale, 0..7
   */
  function blocco(banco, slot) {
    // Un banco senza preset il pedale lo accetterebbe e poi resterebbe muto:
    // meglio fermarsi qui, dove si puo' ancora dire perche'.
    if (!(banco.posti || []).some(Boolean))
      throw new Error(`il banco "${banco.nome}" non ha nemmeno un preset dentro`);

    const out = [0x53, 0x50, 0x42, 0x31, slot & 0xff];   // "SPB1"
    out.push(...testo(banco.nome));
    out.push(POSTI);

    for (let i = 0; i < POSTI; i++) {
      const record = (banco.posti || [])[i];
      if (!record) { out.push(0); continue; }
      // Un record senza catena di effetti non e' un preset: mandarlo
      // produrrebbe un banco che il pedale accetta e non sa suonare.
      if (!record.effects) throw new Error(`"${record.name}" non ha dati sonori`);
      out.push(1);
      out.push(...testo(record.uuid || record.id || ''));
      out.push(...testo(record.name || ''));
      const frames = frameDiPreset(record);
      out.push(frames.length);
      for (const f of frames) out.push(f.length, ...f);
    }
    return new Uint8Array(out);
  }

  const checksum = blob => blob.reduce((a, b) => a ^ b, 0);

  /**
   * Manda un blocco al pedale. `chComando` e' la caratteristica di scrittura.
   * Si scrive **con risposta**: sono una trentina di scritture, la lentezza e'
   * irrilevante e in cambio si sa subito se una si perde — al contrario di
   * quello che facciamo con l'ampli, dove non c'e' scelta.
   */
  async function invia(chComando, banco, slot, avanzamento) {
    const blob = blocco(banco, slot);

    const testa = new Uint8Array(6);
    testa[0] = CMD.INIZIA;
    testa[1] = slot;
    new DataView(testa.buffer).setUint32(2, blob.length, true);
    await chComando.writeValueWithResponse(testa);

    for (let off = 0; off < blob.length; off += PASSO) {
      const pezzo = blob.subarray(off, off + PASSO);
      const m = new Uint8Array(3 + pezzo.length);
      m[0] = CMD.PEZZO;
      m[1] = off & 0xff;
      m[2] = (off >> 8) & 0xff;
      m.set(pezzo, 3);
      await chComando.writeValueWithResponse(m);
      if (avanzamento) avanzamento(Math.min(off + PASSO, blob.length), blob.length);
    }

    await chComando.writeValueWithResponse(new Uint8Array([CMD.FINE, checksum(blob)]));
    return blob.length;
  }

  /** «0:Concerto:8\n1:Casa:3\n» → [{slot, nome, pieni}] */
  function leggiElenco(testo) {
    return String(testo || '').split('\n').filter(Boolean).map(riga => {
      const p = riga.split(':');
      return { slot: Number(p[0]), nome: p[1] || '', pieni: Number(p[2]) || 0 };
    });
  }

  return { SERVIZIO, COMANDO, STATO, CMD, RSP, POSTI,
           frameDiPreset, blocco, checksum, invia, leggiElenco };
})();
