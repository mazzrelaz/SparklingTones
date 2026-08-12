/**
 * spark-protocol.js — codifica e decodifica del protocollo Positive Grid Spark 2.
 *
 * Modulo puro: nessun I/O, nessun DOM. Tutto ciò che riguarda BLE sta altrove.
 *
 * Riferimenti:
 *   Spark Protocol Description v3.x (Paul Hamshere) — formato di base, per Spark 40
 *   paulhamsh/Spark SparkESP32/SparkIO.ino          — implementazione funzionante
 *   captures/                                        — catture dal nostro Spark 2
 *
 * Differenze dello Spark 2 verificate sull'hardware, non documentate altrove:
 *   - i comandi sugli effetti richiedono un byte 0x00 in coda al payload logico,
 *     altrimenti l'ampli risponde con ack ma non applica il comando
 *   - 0x022a (leggi checksum preset) non risponde mai
 *
 * È un classic script e non un ES module di proposito: il progetto deve restare
 * apribile da file:// senza build step né server locale, e i moduli ES sono
 * bloccati dal CORS su file://.
 */
window.Spark = (function () {
  'use strict';

  /* ======================================================================
     Codifica 7bit/8bit
     Ogni gruppo di 7 byte reali è preceduto da un byte "bits8" che raccoglie
     gli MSB mancanti, ordine LSB-first. Verificato contro SparkIO.ino:1069
     e contro catture reali dell'ampli.
     ====================================================================== */

  function pack7bit8bit(data) {
    const out = [];
    for (let i = 0; i < data.length; i += 7) {
      const group = data.slice(i, i + 7);
      let bits8 = 0;
      const stripped = group.map((b, idx) => {
        if (b & 0x80) { bits8 |= (1 << idx); return b & 0x7f; }
        return b;
      });
      out.push(bits8, ...stripped);
    }
    return out;
  }

  function unpack7bit8bit(packed) {
    const out = [];
    for (let i = 0; i < packed.length; i += 8) {
      const bits8 = packed[i];
      const group = packed.slice(i + 1, i + 8);
      group.forEach((b, idx) => out.push((bits8 & (1 << idx)) ? (b | 0x80) : b));
    }
    return out;
  }

  /** XOR a 8 bit dei byte dati già impacchettati, bits8 inclusi. */
  function xorChecksum(bytes) {
    let cs = 0;
    for (const b of bytes) cs ^= b;
    return cs & 0xff;
  }

  /* ======================================================================
     Tipi dati (msgpack "rotto")
     ====================================================================== */

  const TYPE = {
    INT_MAX:      0x7f,
    ARRAY_BASE:   0x90,   // 0x90..0x9f = fixarray di 0..15
    STR_BASE:     0xa0,   // 0xa0..0xbf = stringa di 0..31 caratteri
    FALSE:        0xc2,
    TRUE:         0xc3,
    FLOAT:        0xca,   // + 4 byte IEEE-754 big endian
    UINT8:        0xcc,
    UINT16:       0xcd,
    UINT32:       0xce,
    LONG_STR:     0xd9,   // + 1 byte lunghezza + caratteri
  };

  function encFloat(v) {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, v, false);
    return [TYPE.FLOAT, dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)];
  }

  /** [len, 0xa0+len, ascii] — write_prefixed_string() in SparkIO.ino:825 */
  function encPrefixedString(s) {
    const out = [s.length, TYPE.STR_BASE + s.length];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /** [0xa0+len, ascii] — write_string() in SparkIO.ino:836 */
  function encShortString(s) {
    const out = [TYPE.STR_BASE + s.length];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /**
   * Stringa corta se ci sta nei 31 caratteri, altrimenti long string.
   * `create_preset` fa lo stesso per la descrizione (SparkIO.ino:1030): senza,
   * un nome lungo produrrebbe un tag `0xa0+len` che sconfina in un altro tipo.
   * Serve per i preset importati dall'app ufficiale, che non hanno il limite
   * di lunghezza dei nomi.
   */
  function encAutoString(s) {
    return s.length <= 31
      ? encShortString(s)
      : [TYPE.LONG_STR, s.length & 0xff, ...strBytes(s)];
  }

  const encByte  = b  => [b & 0xff];
  const encOnOff = on => [on ? TYPE.TRUE : TYPE.FALSE];

  /* ======================================================================
     Lettura sequenziale dei valori
     Il formato non è msgpack valido, quindi serve un lettore che dia
     controllo esplicito su cosa ci si aspetta a ogni passo.
     ====================================================================== */

  function Reader(bytes) {
    this.b = bytes;
    this.i = 0;
  }

  Reader.prototype = {
    get remaining() { return this.b.length - this.i; },
    peek()  { return this.b[this.i]; },
    u8()    { return this.b[this.i++]; },
    skip(n) { this.i += n; },

    /** Intero: valore diretto 0x00-0x7f, oppure 0xcc/0xcd/0xce con prefisso. */
    int() {
      const b = this.u8();
      if (b <= TYPE.INT_MAX)   return b;
      if (b === TYPE.UINT8)    return this.u8();
      if (b === TYPE.UINT16)   return (this.u8() << 8) | this.u8();
      if (b === TYPE.UINT32)   return ((this.u8() << 24) >>> 0) + (this.u8() << 16) + (this.u8() << 8) + this.u8();
      throw new Error(`atteso intero a ${this.i - 1}, trovato 0x${b.toString(16)}`);
    },

    float() {
      const b = this.u8();
      if (b !== TYPE.FLOAT) throw new Error(`atteso float a ${this.i - 1}, trovato 0x${b.toString(16)}`);
      const dv = new DataView(new ArrayBuffer(4));
      for (let k = 0; k < 4; k++) dv.setUint8(k, this.u8());
      return dv.getFloat32(0, false);
    },

    bool() {
      const b = this.u8();
      if (b === TYPE.TRUE)  return true;
      if (b === TYPE.FALSE) return false;
      throw new Error(`atteso booleano a ${this.i - 1}, trovato 0x${b.toString(16)}`);
    },

    string() {
      const b = this.u8();
      let len;
      if (b >= TYPE.STR_BASE && b <= 0xbf)  len = b - TYPE.STR_BASE;
      else if (b === TYPE.LONG_STR)         len = this.u8();
      else throw new Error(`attesa stringa a ${this.i - 1}, trovato 0x${b.toString(16)}`);
      let s = '';
      for (let k = 0; k < len; k++) s += String.fromCharCode(this.u8());
      return s;
    },

    /**
     * Stringa preceduta da un byte di lunghezza ridondante: [len, 0xa0+len, ascii].
     * È la forma che l'ampli usa nei messaggi 0x0311 (nome) e 0x0323 (seriale),
     * e quella prodotta da encPrefixedString.
     */
    prefixedString() {
      const declared = this.int();
      const s = this.string();
      if (s.length !== declared) {
        throw new Error(`lunghezza dichiarata ${declared} ma stringa di ${s.length}`);
      }
      return s;
    },

    arrayLen() {
      const b = this.u8();
      if (b >= TYPE.ARRAY_BASE && b <= 0x9f) return b - TYPE.ARRAY_BASE;
      throw new Error(`atteso array a ${this.i - 1}, trovato 0x${b.toString(16)}`);
    },
  };

  /**
   * Decodifica esplorativa: legge valori finché può, senza aspettarsi
   * una struttura. Serve per ispezionare messaggi sconosciuti, non per
   * il parsing vero.
   */
  function decodeValues(data) {
    const r = new Reader(data);
    const out = [];
    while (r.remaining > 0) {
      const b = r.peek();
      try {
        if (b <= TYPE.INT_MAX)                        out.push(r.int());
        else if (b >= TYPE.ARRAY_BASE && b <= 0x9f)   out.push(`array[${r.arrayLen()}]`);
        else if (b >= TYPE.STR_BASE && b <= 0xbf)     out.push(JSON.stringify(r.string()));
        else if (b === TYPE.LONG_STR)                 out.push(JSON.stringify(r.string()));
        else if (b === TYPE.FALSE || b === TYPE.TRUE) out.push(r.bool());
        else if (b === TYPE.FLOAT)                    out.push(+r.float().toFixed(6));
        else if (b === TYPE.UINT8 || b === TYPE.UINT16 || b === TYPE.UINT32) out.push(r.int());
        else { out.push('?' + b.toString(16).padStart(2, '0')); r.skip(1); }
      } catch (e) {
        out.push('!' + e.message);
        break;
      }
    }
    return out;
  }

  /* ======================================================================
     Costruzione messaggi
     chunk: F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7
     ====================================================================== */

  function buildChunk(cmd, sub, rawData, seq) {
    const packed = pack7bit8bit(rawData);
    return [0xf0, 0x01, seq & 0xff, xorChecksum(packed), cmd, sub, ...packed, 0xf7];
  }

  /**
   * Block header di 16 byte, byte 6 = lunghezza totale.
   * paulhamsh lo mette sempre (BlockOut::process, SparkIO.ino:1202), ma sul
   * nostro Spark 2 è indifferente: verificato con sweep su 0x0201 fino a 44
   * byte, con e senza header, stesso esito.
   */
  function wrapBlock(chunk) {
    const total = (16 + chunk.length) & 0xff;
    return [0x01, 0xfe, 0x00, 0x00, 0x53, 0xfe, total, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...chunk];
  }

  /* ======================================================================
     Comandi
     Il byte 0x00 finale è obbligatorio sui comandi che riferiscono un
     effetto: senza, l'ampli risponde con ack ma non applica il comando.
     ====================================================================== */

  const CMD_ACTION = 0x01;   // scritture
  const CMD_QUERY  = 0x02;   // letture
  const CMD_NOTIFY = 0x03;   // notifiche dall'ampli
  const CMD_ACK    = 0x04;

  const commands = {
    /** [banco, target]. Il banco è sempre 0 (Spark.ino:319). Niente 0x00 finale. */
    changePreset: (target, bank) => ({
      cmd: CMD_ACTION, sub: 0x38,
      data: [...encByte(bank === undefined ? 0x00 : bank), ...encByte(target)],
    }),

    effectOnOff: (name, on) => ({
      cmd: CMD_ACTION, sub: 0x15,
      data: [...encPrefixedString(name), ...encOnOff(on), 0x00],
    }),

    changeParam: (name, param, value) => ({
      cmd: CMD_ACTION, sub: 0x04,
      data: [...encPrefixedString(name), ...encByte(param), ...encFloat(clamp01(value)), 0x00],
    }),

    /**
     * Salva nello slot indicato quello che c'è nel preset software.
     * `save_hardware_preset` in SparkIO.ino:947.
     */
    savePreset: slot => ({
      cmd: CMD_ACTION, sub: 0x27,
      data: [...encByte(0x00), ...encByte(slot)],
    }),

    changeEffectModel: (oldName, newName) => ({
      cmd: CMD_ACTION, sub: 0x06,
      data: [...encPrefixedString(oldName), ...encPrefixedString(newName), 0x00],
    }),

    getPreset:        n  => ({ cmd: CMD_QUERY, sub: 0x01, data: [0x00, n & 0xff] }),
    getLiveState:     () => ({ cmd: CMD_QUERY, sub: 0x01, data: [0x01, 0x00] }),
    getCurrentPreset: () => ({ cmd: CMD_QUERY, sub: 0x10, data: [] }),
    getName:          () => ({ cmd: CMD_QUERY, sub: 0x11, data: [] }),
    getSerial:        () => ({ cmd: CMD_QUERY, sub: 0x23, data: [] }),
    getFirmware:      () => ({ cmd: CMD_QUERY, sub: 0x2f, data: [] }),
  };

  const clamp01 = v => Math.max(0, Math.min(1, v));

  /** Trasforma il risultato di commands.* nei byte da scrivere sulla 0xFFC1. */
  function encode(command, seq, withBlockHeader) {
    const chunk = buildChunk(command.cmd, command.sub, command.data, seq);
    return withBlockHeader ? wrapBlock(chunk) : chunk;
  }

  /* ======================================================================
     Ricezione
     ====================================================================== */

  /**
   * Riassembla i frammenti BLE in messaggi completi cercando F0 … F7.
   * L'ampli spezza le notifiche lunghe su più pacchetti.
   */
  function MessageAssembler(onMessage) {
    this.buffer = [];
    this.onMessage = onMessage;
  }

  MessageAssembler.prototype.feed = function (bytes) {
    for (const b of bytes) {
      if (this.buffer.length === 0) {
        if (b === 0xf0) this.buffer.push(b);
        continue;                                  // scarta byte orfani prima di F0
      }
      this.buffer.push(b);
      if (b === 0xf7) {
        this.onMessage(parseMessage(this.buffer));
        this.buffer = [];
      }
    }
  };

  MessageAssembler.prototype.reset = function () { this.buffer = []; };

  function parseMessage(msg) {
    const packed = Array.from(msg.slice(6, msg.length - 1));
    return {
      raw:        Array.from(msg),
      seq:        msg[2],
      cmd:        msg[4],
      sub:        msg[5],
      data:       unpack7bit8bit(packed),
      checksumOk: xorChecksum(packed) === msg[3],
    };
  }

  /* ======================================================================
     Preset (0x0301)
     Arrivano su più chunk. Ogni chunk, dopo lo spacchettamento, inizia con
     un sub-header di 3 byte: [numero totale di chunk, indice, byte utili].
     L'ultimo byte dell'ultimo chunk è un checksum, somma modulo 256.
     ====================================================================== */

  function assemblePresetPayload(messages) {
    const chunks = [];
    let total = null;
    for (const m of messages) {
      const [t, index, size] = m.data;
      total = t;
      chunks[index] = m.data.slice(3, 3 + size);
    }
    const received = chunks.filter(Boolean).length;
    return {
      total,
      received,
      complete: total !== null && received === total,
      payload:  chunks.flat(),
    };
  }

  /** Marcatore costante fra indice e valore di ogni parametro. Significato ignoto. */
  const PARAM_MARKER = 0x91;

  /**
   * Struttura (Hamshere v3.x, confermata su cattura reale dello Spark 2):
   *   banco, numero, UUID, nome, versione, descrizione, icona, BPM,
   *   array di 7 effetti { nome, attivo, array di parametri },
   *   due float di significato ignoto, checksum
   * Ogni parametro è: indice, marcatore 0x91, valore float.
   */
  function parsePreset(payload) {
    const r = new Reader(payload);
    const preset = {
      bank:        r.int(),
      number:      r.int(),
      uuid:        r.string(),
      name:        r.string(),
      version:     r.string(),
      description: r.string(),
      icon:        r.string(),
      bpm:         r.float(),
      effects:     [],
    };

    const effectCount = r.arrayLen();
    for (let i = 0; i < effectCount; i++) {
      const effect = { name: r.string(), enabled: r.bool(), params: [] };
      const paramCount = r.arrayLen();
      for (let p = 0; p < paramCount; p++) {
        const index  = r.int();
        const marker = r.u8();
        if (marker !== PARAM_MARKER) {
          throw new Error(`marcatore inatteso 0x${marker.toString(16)} nel parametro ` +
                          `${index} di ${effect.name}`);
        }
        effect.params.push({ index, value: r.float() });
      }
      preset.effects.push(effect);
    }

    // Coda di significato ignoto, presente solo su alcuni preset: i preset
    // salvati ne hanno due (9990.0 e 0.5), lo stato live nessuno. Si legge
    // quello che c'è e lo si conserva, per poter ri-serializzare senza perdite.
    preset.tail = [];
    while (r.remaining > 1 && r.peek() === TYPE.FLOAT) preset.tail.push(r.float());

    preset.checksum = r.remaining > 0 ? r.u8() : null;

    if (r.remaining > 0) {
      throw new Error(`${r.remaining} byte non consumati in coda al preset`);
    }
    return preset;
  }

  /**
   * I preset si indirizzano con una coppia [bank, numero], la stessa che
   * funziona in lettura: `0x0201` con [0x00, n] legge lo slot n, con
   * [0x01, 0x00] legge il suono attualmente attivo.
   *
   * In **scrittura** invece si passa sempre per il preset software `0x7f`:
   * `0x0101` verso [0x00, 0x7f] carica il preset in un buffer, ma l'ampli
   * continua a suonare lo slot selezionato finché non gli si dice di passare
   * al software con `0x0138`. Scrivere direttamente su [0x01, 0x00] o su uno
   * slot produce ack regolari e nessun effetto.
   */
  /**
   * Il pannello dello Spark 2 ha 4 LED bicolore, non 8: rosso per il banco A
   * (slot 0-3), verde per il banco B (slot 4-7). Lo slot 5 si presenta quindi
   * come "secondo LED verde". Il numero inviato corrisponde sempre: è solo
   * il modo di mostrarlo che è diverso.
   */
  const SLOTS_PER_BANK = 4;

  function slotLabel(n) {
    const bank     = n < SLOTS_PER_BANK ? 'A' : 'B';
    const position = (n % SLOTS_PER_BANK) + 1;
    return {
      bank, position,
      color: bank === 'A' ? 'rosso' : 'verde',
      label: bank + position,
    };
  }

  const LIVE_TARGET      = { bank: 0x01, number: 0x00 };
  const slotTarget       = n => ({ bank: 0x00, number: n });
  const SOFTWARE_PRESET  = 0x7f;
  const SOFTWARE_TARGET  = { bank: 0x00, number: SOFTWARE_PRESET };

  function normalizeTarget(target, fallback) {
    if (target === undefined || target === null) return { bank: 0x00, number: fallback };
    if (typeof target === 'number') return slotTarget(target);
    return { bank: target.bank, number: target.number };
  }

  /**
   * Checksum finale del preset: somma modulo 256 di tutto il payload
   * tranne i primi due byte e il checksum stesso.
   *
   * L'esclusione dei primi due viene da `create_preset` (SparkIO.ino:1025),
   * che li scrive con `write_byte_no_chksum`. Sulle nostre catture valgono
   * entrambi zero, quindi non possiamo verificarla: se una scrittura verso
   * uno slot diverso da 0 venisse rifiutata, è il primo posto dove guardare.
   */
  function presetChecksum(payloadWithoutChecksum) {
    let sum = 0;
    for (let i = 2; i < payloadWithoutChecksum.length; i++) sum += payloadWithoutChecksum[i];
    return sum & 0xff;
  }

  /**
   * Inverso di parsePreset. Serve sia per scrivere preset sull'ampli sia,
   * soprattutto, come verifica: se la ri-serializzazione riproduce i byte
   * originali, la struttura è stata interpretata correttamente anche dove
   * il significato dei campi resta ignoto.
   *
   * @param target destinazione: un numero (slot nel bank 0), oppure una
   *               coppia {bank, number}. Usa LIVE_TARGET per cambiare il
   *               suono corrente senza sovrascrivere nulla di salvato.
   * @param options `{omitTail: true}` per non scrivere i float di coda:
   *                `create_preset` non li manda, e nemmeno l'ampli li usa
   *                per lo stato live
   */
  function serializePreset(preset, target, options) {
    const opts = options || {};
    const dest = normalizeTarget(target, preset.number);
    const out = [
      ...encByte(dest.bank),
      ...encByte(dest.number),
      TYPE.LONG_STR, preset.uuid.length, ...strBytes(preset.uuid),
      ...encAutoString(preset.name),
      ...encAutoString(preset.version),
      ...encAutoString(preset.description),
      ...encAutoString(preset.icon),
      ...encFloat(preset.bpm),
      TYPE.ARRAY_BASE + preset.effects.length,
    ];

    for (const effect of preset.effects) {
      out.push(...encAutoString(effect.name));
      out.push(...encOnOff(effect.enabled));
      out.push(TYPE.ARRAY_BASE + effect.params.length);
      for (const param of effect.params) {
        out.push(param.index, PARAM_MARKER, ...encFloat(param.value));
      }
    }

    if (!opts.omitTail) {
      for (const value of preset.tail || []) out.push(...encFloat(value));
    }
    out.push(presetChecksum(out));
    return out;
  }

  /**
   * Controlla che un preset sia serializzabile prima di mandarlo.
   *
   * Serve perché **l'ack non è una verifica**: l'ampli conferma la ricezione
   * di ogni chunk anche quando il payload è malformato, e poi lo ignora in
   * silenzio. Il risultato è indistinguibile da un guasto della connessione.
   * Un valore non numerico, per esempio, diventa un float NaN che passa la
   * codifica senza un lamento.
   *
   * Gli `errori` impediscono la codifica o producono byte senza senso; gli
   * `avvisi` sono cose strane ma che l'ampli potrebbe digerire.
   *
   * @returns {{errori: string[], avvisi: string[]}}
   */
  function controllaPreset(preset) {
    const errori = [], avvisi = [];
    const numero = v => typeof v === 'number' && Number.isFinite(v);

    if (!preset || typeof preset !== 'object') {
      return { errori: ['non è un preset'], avvisi };
    }
    if (typeof preset.uuid !== 'string' || !preset.uuid) errori.push('manca l\'UUID');
    else if (preset.uuid.length !== 36) avvisi.push(`UUID di ${preset.uuid.length} caratteri invece di 36`);

    for (const campo of ['name', 'version', 'description', 'icon']) {
      if (typeof preset[campo] !== 'string') errori.push(`il campo ${campo} non è testo`);
    }
    if (!numero(preset.bpm)) errori.push('i BPM non sono un numero');

    if (!Array.isArray(preset.effects)) {
      errori.push('manca la catena effetti');
      return { errori, avvisi };
    }
    // Un fixarray arriva a 15: oltre, `ARRAY_BASE + n` sconfina in un altro tipo.
    if (preset.effects.length > 15) errori.push(`${preset.effects.length} effetti: oltre i 15 di un fixarray`);
    if (preset.effects.length !== 7) avvisi.push(`${preset.effects.length} effetti invece dei 7 soliti`);

    preset.effects.forEach((effetto, i) => {
      const dove = `effetto ${i + 1}`;
      if (!effetto || typeof effetto !== 'object') { errori.push(`${dove}: non è un effetto`); return; }
      if (typeof effetto.name !== 'string' || !effetto.name) errori.push(`${dove}: manca il nome`);
      if (!Array.isArray(effetto.params)) { errori.push(`${dove}: mancano i parametri`); return; }
      if (effetto.params.length > 15) {
        errori.push(`${dove}: ${effetto.params.length} parametri, oltre i 15 di un fixarray`);
      }
      effetto.params.forEach((param, j) => {
        const nome = `${effetto.name || dove}, parametro ${j + 1}`;
        if (!param || typeof param !== 'object') { errori.push(`${nome}: non è un parametro`); return; }
        if (!numero(param.value)) errori.push(`${nome}: il valore non è un numero (${param.value})`);
        else if (param.value < 0 || param.value > 1) avvisi.push(`${nome}: valore ${param.value} fuori da 0..1`);
        if (!Number.isInteger(param.index) || param.index < 0 || param.index > 127) {
          errori.push(`${nome}: indice ${param.index} non valido`);
        }
      });
    });

    for (const value of preset.tail || []) {
      if (!numero(value)) errori.push('la coda contiene un valore non numerico');
    }
    return { errori, avvisi };
  }

  /**
   * Byte di payload per chunk quando mandiamo un preset.
   *
   * paulhamsh usa 128 (`chunk_size` in SparkChunkOut), ma è pensato per un
   * ESP32 che negozia un MTU grande: 128 byte di payload diventano un
   * messaggio da 154 byte in una sola write BLE, e il nostro Spark 2 a quel
   * punto si disconnette. 25 è invece la dimensione che l'ampli sceglie
   * quando è lui a mandarci un preset, e produce messaggi da 39 byte,
   * identici alle sue notifiche.
   */
  const PRESET_CHUNK_SIZE = 25;

  /**
   * Spezza il payload di un preset nei chunk di un messaggio 0x0101.
   * Ogni chunk porta il sub-header [chunk totali, indice, byte utili],
   * lo stesso che l'ampli usa quando è lui a mandarci un preset.
   *
   * paulhamsh calcola il numero di chunk come `len/size + 1`, che sbaglia
   * quando la lunghezza è un multiplo esatto: qui si arrotonda per eccesso.
   */
  function splitPresetIntoChunks(payload, chunkSize) {
    const size  = chunkSize || PRESET_CHUNK_SIZE;
    const total = Math.max(1, Math.ceil(payload.length / size));
    const chunks = [];
    for (let i = 0; i < total; i++) {
      const slice = payload.slice(i * size, (i + 1) * size);
      chunks.push([total, i, slice.length, ...slice]);
    }
    return chunks;
  }

  function strBytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /* ====================================================================== */

  return {
    pack7bit8bit, unpack7bit8bit, xorChecksum,
    encFloat, encPrefixedString, encShortString, encAutoString, encByte, encOnOff,
    Reader, decodeValues,
    buildChunk, wrapBlock, encode, commands,
    MessageAssembler, parseMessage,
    assemblePresetPayload, parsePreset, serializePreset, splitPresetIntoChunks,
    controllaPreset,
    presetChecksum, PARAM_MARKER, PRESET_CHUNK_SIZE,
    LIVE_TARGET, slotTarget, SOFTWARE_PRESET, SOFTWARE_TARGET,
    slotLabel, SLOTS_PER_BANK,
    CMD_ACTION, CMD_QUERY, CMD_NOTIFY, CMD_ACK, TYPE,
  };
})();
