/**
 * spark-backup.js — legge il backup dei preset dell'app ufficiale Positive Grid.
 *
 * L'app Spark salva su Dropbox un file `preset_backup.zip` così strutturato:
 *
 *   preset_backup/Presets/<Categoria>/category.json
 *   preset_backup/Presets/<Categoria>/<UUID>/preset.json
 *   preset_backup/Presets/<Categoria>/<UUID>/icon.png
 *
 * Le cartelle di categoria diventano tag nella nostra libreria. Le icone si
 * ignorano: sono immagini generiche da mezzo mega l'una.
 *
 * Lo zip viene aperto senza librerie esterne: la struttura è poca cosa e per
 * la decompressione basta DecompressionStream, che i browser hanno già.
 */
window.SparkBackup = (function () {
  'use strict';

  const EOCD_SIG    = 0x06054b50;   // fine della central directory
  const CENTRAL_SIG = 0x02014b50;   // voce della central directory

  /**
   * Estrae dallo zip i file che interessano.
   * @param wanted funzione che riceve il percorso e dice se serve
   * @returns Map percorso → Uint8Array
   */
  async function readZip(buffer, wanted) {
    const view  = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const eocd  = trovaEOCD(view);
    if (eocd < 0) throw new Error('non sembra un file zip');

    const quante = view.getUint16(eocd + 10, true);
    let p        = view.getUint32(eocd + 16, true);

    const out = new Map();
    for (let i = 0; i < quante; i++) {
      if (view.getUint32(p, true) !== CENTRAL_SIG) break;

      const metodo      = view.getUint16(p + 10, true);
      const compressa   = view.getUint32(p + 20, true);
      const lunghNome   = view.getUint16(p + 28, true);
      const lunghExtra  = view.getUint16(p + 30, true);
      const lunghNota   = view.getUint16(p + 32, true);
      const offsetLocal = view.getUint32(p + 42, true);
      const nome        = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + lunghNome));

      p += 46 + lunghNome + lunghExtra + lunghNota;
      if (wanted && !wanted(nome)) continue;

      // L'intestazione locale ripete nome ed extra, con lunghezze proprie.
      const lNome  = view.getUint16(offsetLocal + 26, true);
      const lExtra = view.getUint16(offsetLocal + 28, true);
      const inizio = offsetLocal + 30 + lNome + lExtra;
      const dati   = bytes.subarray(inizio, inizio + compressa);

      out.set(nome, metodo === 0 ? dati : await sgonfia(dati));
    }
    return out;
  }

  /** L'EOCD sta in fondo, ma può avere una nota dopo: si cerca all'indietro. */
  function trovaEOCD(view) {
    const minimo = Math.max(0, view.byteLength - 66000);
    for (let i = view.byteLength - 22; i >= minimo; i--) {
      if (view.getUint32(i, true) === EOCD_SIG) return i;
    }
    return -1;
  }

  async function sgonfia(dati) {
    const stream = new Blob([dati]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* ================================================================== */

  const PERCORSO_PRESET = /^preset_backup\/Presets\/([^/]+)\/[^/]+\/preset\.json$/;

  /**
   * Converte il backup nei record della nostra libreria.
   * @returns {{presets: Array, categorie: Array, saltati: Array}}
   */
  async function parseBackup(buffer) {
    const files = await readZip(buffer, nome => PERCORSO_PRESET.test(nome));
    if (files.size === 0) {
      throw new Error('nessun preset trovato: è il backup dell\'app Spark?');
    }

    const decoder   = new TextDecoder();
    const presets   = [];
    const categorie = new Set();
    const saltati   = [];

    for (const [percorso, contenuto] of files) {
      const categoria = percorso.match(PERCORSO_PRESET)[1];
      categorie.add(categoria);
      try {
        presets.push(convertiPreset(JSON.parse(decoder.decode(contenuto)), categoria));
      } catch (err) {
        saltati.push({ percorso, motivo: err.message });
      }
    }
    return { presets, categorie: [...categorie].sort(), saltati };
  }

  /**
   * Il formato dell'app è già molto vicino al nostro: `sigpath` è la catena
   * effetti, `dspId` il nome, `active` l'interruttore. Le differenze sono che
   * i metadati stanno sotto `meta` e che qualche parametro è un booleano
   * invece di un numero — 21 su 105 preset nel backup di riferimento.
   */
  function convertiPreset(json, categoria) {
    const meta = json.meta || {};
    if (!meta.id)     throw new Error('manca meta.id');
    if (!json.sigpath) throw new Error('manca sigpath');

    return {
      bank:        0,
      number:      0,
      uuid:        testo(meta.id, ''),
      name:        testo(meta.name, '') || '(senza nome)',
      version:     testo(meta.version, '') || '0.7',
      description: testo(meta.description, ''),
      icon:        testo(meta.icon, '') || 'icon.png',
      bpm:         typeof json.bpm === 'number' ? json.bpm : 120,
      effects:     json.sigpath.map(convertiEffetto),
      tail:        [],
      checksum:    null,
      slot:        null,
      tags:        [categoria],
      origine:     'app ufficiale',
    };
  }

  function convertiEffetto(fx) {
    return {
      name:    fx.dspId,
      enabled: !!fx.active,
      params:  (fx.params || [])
        .map(p => ({ index: indice(p.index), value: numero(p.value) }))
        .sort((a, b) => a.index - b.index),
    };
  }

  /** Qualche parametro arriva come booleano: l'ampli vuole comunque un float. */
  function numero(v) {
    if (v === true)  return 1;
    if (v === false) return 0;
    return typeof v === 'number' ? v : 0;
  }

  /**
   * L'indice di un parametro finisce nel payload come byte crudo: se arriva
   * come stringa, o non arriva, produrrebbe un byte senza senso che l'ampli
   * conferma e poi ignora.
   */
  function indice(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }

  /**
   * I campi di testo del preset vanno codificati come stringhe: nel JSON
   * dell'app possono arrivare come numeri (una `version` scritta `0.7` invece
   * di `"0.7"`), e `encAutoString` su un numero produce byte senza senso che
   * l'ampli conferma senza applicare. Silenzio, non errore: il peggior modo
   * di fallire.
   */
  function testo(v, ripiego) {
    if (typeof v === 'string') return v;
    if (v === undefined || v === null) return ripiego;
    return String(v);
  }

  return { readZip, parseBackup, convertiPreset };
})();
