/**
 * spark-transport.js — connessione BLE allo Spark 2 e scambio di messaggi.
 *
 * Dipende da spark-protocol.js (window.Spark), che va caricato prima.
 * Questo modulo si occupa solo di trasporto: connessione, coda di invio,
 * riassemblaggio, attesa delle risposte. Non conosce il significato dei comandi.
 *
 * Vincoli dell'hardware, verificati sul dispositivo:
 *   - 0xFFC1 supporta solo writeWithoutResponse: nessun errore GATT viene
 *     sollevato se l'ampli scarta il messaggio
 *   - una singola write per messaggio va bene fino ad almeno 44 byte, e
 *     l'ampli notifica pacchetti da 39: l'MTU negoziato è ampio
 *   - le scritture ricevono un ack 0x04nn con lo stesso sub-comando e sequence,
 *     ma l'ack conferma la ricezione, NON l'esecuzione
 *   - writeWithoutResponse non ha controllo di flusso: gli invii vanno
 *     serializzati e distanziati, altrimenti si perdono
 */
window.SparkTransport = (function () {
  'use strict';

  const SERVICE_UUID     = 0xffc0;
  const CHAR_WRITE_UUID  = 0xffc1;
  const CHAR_NOTIFY_UUID = 0xffc2;

  const SEND_GAP_MS        = 30;    // pausa fra invii consecutivi
  const DEFAULT_TIMEOUT    = 2500;
  const PRESET_ACK_TIMEOUT = 700;   // il firmware si sblocca da solo dopo 500 ms
  const CMD_ACK_FINAL      = 0x05;  // ack dell'ultimo chunk di un preset

  // Oltre questa soglia lo Spark 2 si disconnette invece di rispondere.
  // Il massimo verificato funzionante è 44 byte; l'ampli per conto suo non
  // supera i 39. Vedi captures/2026-08-10-sweep-lunghezza.txt.
  const SAFE_WRITE_BYTES   = 60;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function SparkTransport(handlers) {
    handlers = handlers || {};
    this.onStatus  = handlers.onStatus  || function () {};
    this.onMessage = handlers.onMessage || function () {};
    this.onLog     = handlers.onLog     || function () {};

    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;

    this.seq = 0x01;
    this.waiters = [];
    this.sendChain = Promise.resolve();

    this.assembler = new Spark.MessageAssembler(this._handleMessage.bind(this));

    // stato riportato dall'ampli
    this.state = { name: null, serial: null, firmware: null, currentPreset: null };
  }

  SparkTransport.prototype = {

    get connected() {
      return !!(this.device && this.device.gatt.connected);
    },

    /* ---------------------------------------------------------------- */

    async connect() {
      if (!navigator.bluetooth) throw new Error('Web Bluetooth non disponibile in questo browser');

      this.onStatus('connecting', 'Ricerca dispositivo…');
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });
      this.device.addEventListener('gattserverdisconnected', () => {
        this.writeChar = this.notifyChar = null;
        this.assembler.reset();
        this._failAllWaiters('connessione persa');
        this.onStatus('disconnected', 'Disconnesso');
      });

      this.onStatus('connecting', 'Connessione GATT…');
      const server  = await this.device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      this.writeChar  = await service.getCharacteristic(CHAR_WRITE_UUID);
      this.notifyChar = await service.getCharacteristic(CHAR_NOTIFY_UUID);

      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', e => {
        this.assembler.feed(new Uint8Array(e.target.value.buffer));
      });

      this.onStatus('connected', this.device.name || 'Spark');
      this.onLog(`connesso a ${this.device.name}`);
      return this.device.name;
    },

    async disconnect() {
      if (this.connected) this.device.gatt.disconnect();
    },

    /* ---------------------------------------------------------------- */

    /**
     * Nei messaggi app→ampli il contatore resta fra 0x01 e 0x3e
     * (`oc_seq` in SparkIO.ino:1116-1119). Sopra 0x3f è il campo che l'ampli
     * usa per i propri invii verso l'app.
     */
    _nextSeq() {
      const s = this.seq;
      this.seq = this.seq + 1;
      if (this.seq >= 0x3f) this.seq = 0x01;
      return s;
    },

    /**
     * Invia un comando. Gli invii vengono serializzati e distanziati:
     * writeWithoutResponse non ha controllo di flusso.
     * @returns il sequence number usato, per correlare la risposta
     */
    send(command, forcedSeq, withBlockHeader) {
      if (!this.writeChar) return Promise.reject(new Error('non connesso'));
      const seq   = forcedSeq === undefined ? this._nextSeq() : forcedSeq;
      const bytes = new Uint8Array(Spark.encode(command, seq, !!withBlockHeader));

      if (bytes.length > SAFE_WRITE_BYTES) {
        this.onLog(`attenzione: messaggio da ${bytes.length} byte, oltre i ` +
                   `${SAFE_WRITE_BYTES} verificati — l'ampli potrebbe disconnettersi`);
      }

      this.sendChain = this.sendChain.then(async () => {
        await this.writeChar.writeValueWithoutResponse(bytes);
        this.onLog(`TX 0x${hex(command.cmd)}${hex(command.sub)} seq=0x${hex(seq)} ${bytes.length}B`);
        await sleep(SEND_GAP_MS);
      }).catch(err => {
        this.onLog('errore invio: ' + err.message);
      });

      return this.sendChain.then(() => seq);
    },

    /**
     * Invia e aspetta una risposta che soddisfi il predicato.
     * @returns il messaggio, oppure null se scade il tempo
     */
    async request(command, match, timeoutMs) {
      const pending = this._wait(match, timeoutMs || DEFAULT_TIMEOUT);
      await this.send(command);
      return pending;
    },

    _wait(match, timeoutMs) {
      return new Promise(resolve => {
        const waiter = { match, resolve };
        this.waiters.push(waiter);
        setTimeout(() => {
          if (this._removeWaiter(waiter)) resolve(null);
        }, timeoutMs);
      });
    },

    _removeWaiter(waiter) {
      const i = this.waiters.indexOf(waiter);
      if (i === -1) return false;
      this.waiters.splice(i, 1);
      return true;
    },

    _failAllWaiters(reason) {
      const pending = this.waiters.splice(0);
      pending.forEach(w => w.resolve(null));
      if (pending.length) this.onLog(`${pending.length} attese annullate: ${reason}`);
    },

    _handleMessage(msg) {
      this._trackState(msg);
      // una copia: un waiter può rimuoversi mentre iteriamo
      for (const waiter of this.waiters.slice()) {
        if (waiter.match(msg)) {
          this._removeWaiter(waiter);
          waiter.resolve(msg);
        }
      }
      this.onMessage(msg);
    },

    _trackState(msg) {
      if (msg.cmd !== Spark.CMD_NOTIFY) return;
      try {
        if (msg.sub === 0x10 || msg.sub === 0x38) {
          this.state.currentPreset = msg.data[msg.data.length - 1];
        } else if (msg.sub === 0x11) {
          this.state.name = new Spark.Reader(msg.data).prefixedString();
        } else if (msg.sub === 0x23) {
          this.state.serial = new Spark.Reader(msg.data).prefixedString();
        }
      } catch (e) {
        // messaggio inatteso: lo stato resta com'era, non è un errore fatale
      }
    },

    /* ----------------------------------------------------------------
       Preset
       La risposta a 0x0201 arriva su più messaggi 0x0301 che condividono
       il sequence number della richiesta. Vanno raccolti finché il conteggio
       dichiarato nel sub-header non è completo.
       ---------------------------------------------------------------- */

    async readPreset(index, timeoutMs) {
      const preset = await this._readPresetVia(
        Spark.commands.getPreset(index), `preset ${index}`, timeoutMs);
      if (preset) preset.slot = index;
      return preset;
    },

    /** Legge il suono attualmente attivo, che non è uno degli slot salvati. */
    readLiveState(timeoutMs) {
      return this._readPresetVia(Spark.commands.getLiveState(), 'stato live', timeoutMs);
    },

    async _readPresetVia(command, label, timeoutMs) {
      const timeout = timeoutMs || 4000;
      const chunks = [];
      let expectedSeq = null;

      const done = new Promise(resolve => {
        const waiter = {
          match: msg => {
            if (msg.cmd !== Spark.CMD_NOTIFY || msg.sub !== 0x01) return false;
            if (expectedSeq !== null && msg.seq !== expectedSeq) return false;
            chunks.push(msg);
            const asm = Spark.assemblePresetPayload(chunks);
            return asm.complete;                 // resta in ascolto finché non è completo
          },
          resolve,
        };
        this.waiters.push(waiter);
        setTimeout(() => { if (this._removeWaiter(waiter)) resolve(null); }, timeout);
      });

      expectedSeq = await this.send(command);
      const last = await done;
      if (!last) {
        this.onLog(`${label}: nessuna risposta completa (${chunks.length} chunk ricevuti)`);
        return null;
      }

      const payload = Spark.assemblePresetPayload(chunks).payload;
      try {
        return Spark.parsePreset(payload);
      } catch (err) {
        // Il payload viene conservato: un errore di parsing significa che
        // l'ampli ha mandato qualcosa che non sappiamo ancora leggere, ed è
        // esattamente il materiale che serve per capire cosa.
        this.lastFailedPayload = { label, payload, error: err.message, at: new Date().toISOString() };
        this.onLog(`${label}: errore di parsing — ${err.message} ` +
                   `(payload di ${payload.length} byte conservato)`);
        return null;
      }
    },

    /**
     * Legge i preset da 0 in su finché rispondono.
     * Lo Spark 2 riporta un preset corrente pari a 6, fuori dal range 0-3
     * documentato per lo Spark 40: quanti slot esistano davvero non è noto,
     * quindi si prova e si vede chi risponde.
     */
    async readLibrary(maxSlots, onProgress) {
      const max = maxSlots || 8;
      const presets = [];
      for (let i = 0; i < max; i++) {
        if (onProgress) onProgress(i, max);
        const preset = await this.readPreset(i);
        if (preset) presets.push(preset);
        else this.onLog(`slot ${i}: vuoto o non risponde`);
        await sleep(150);
      }
      return presets;
    },

    /* ---------------------------------------------------------------- */

    /** Interroga l'ampli per nome, seriale e preset corrente. */
    async identify() {
      await this.request(Spark.commands.getName(),
        m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x11);
      await this.request(Spark.commands.getSerial(),
        m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x23);
      await this.request(Spark.commands.getCurrentPreset(),
        m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x10);
      return this.state;
    },

    /* ----------------------------------------------------------------
       Scrittura di un preset intero (0x0101)
       ---------------------------------------------------------------- */

    /**
     * Manda un preset all'ampli, un chunk per volta, aspettando l'ack fra
     * l'uno e l'altro: il firmware blocca gli invii successivi finché non ha
     * confermato il precedente (`ok_to_send` in SparkIO.ino:1251).
     * L'ack può essere 0x0401 sui chunk intermedi o 0x0501 sull'ultimo.
     *
     * Tutti i chunk vanno con **lo stesso sequence number**: è così che
     * l'ampli manda i propri preset, ed è per seq che noi raggruppiamo i
     * chunk in arrivo. Se anche il suo riassemblatore funziona così,
     * incrementare il seq a ogni chunk — come fa `ChunkOut::process` per lo
     * Spark 40 — gli farebbe vedere 16 messaggi scollegati e incompleti:
     * li confermerebbe tutti senza assemblarne nessuno.
     *
     * @param target slot 0-7, oppure Spark.LIVE_TARGET per cambiare solo il
     *               suono corrente senza sovrascrivere nulla di salvato
     * @param options varianti da provare quando l'ampli non applica il preset:
     *                `incrementSeq` (comportamento Spark 40), `includeTail`,
     *                `blockHeader`, `chunkSize`, `ackTimeout`
     * @returns {{ok: boolean, sent: number, total: number, acks: number, error?: string}}
     */
    async writePreset(preset, target, onProgress, options) {
      if (!this.writeChar) throw new Error('non connesso');
      const opts = options || {};

      // I due float di coda non vengono mandati: `create_preset` non li scrive
      // (SparkIO.ino:1019) e nemmeno l'ampli li usa per lo stato live.
      const payload = Spark.serializePreset(preset, target, { omitTail: !opts.includeTail });
      const chunks  = Spark.splitPresetIntoChunks(payload, opts.chunkSize);
      const seq     = this._nextSeq();
      this.onLog(`invio "${preset.name}" → bank ${payload[0]} numero ${payload[1]}: ` +
                 `${payload.length} byte in ${chunks.length} chunk, ` +
                 (opts.incrementSeq ? 'seq crescente' : `seq 0x${hex(seq)} per tutti`) +
                 (opts.includeTail ? ', con coda' : ''));

      let acks = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (onProgress) onProgress(i, chunks.length);
        const pending = this._wait(
          m => (m.cmd === Spark.CMD_ACK || m.cmd === CMD_ACK_FINAL) && m.sub === 0x01,
          opts.ackTimeout || PRESET_ACK_TIMEOUT);
        try {
          await this.send({ cmd: Spark.CMD_ACTION, sub: 0x01, data: chunks[i] },
                          opts.incrementSeq ? undefined : seq,
                          opts.blockHeader);
        } catch (err) {
          const error = `errore GATT al chunk ${i + 1} di ${chunks.length}: ${err.message}`;
          this.onLog(error);
          return { ok: false, sent: i, total: chunks.length, acks, error };
        }
        if (await pending) acks++;
        // Un ack mancante non è motivo di fermarsi: anche il firmware si
        // sblocca da solo dopo mezzo secondo (SparkIO.ino:139-142).
      }
      if (acks < chunks.length) {
        this.onLog(`inviati tutti i chunk, ma solo ${acks} confermati su ${chunks.length}`);
      }
      return { ok: true, sent: chunks.length, total: chunks.length, acks };
    },

    /**
     * Carica un preset e lo fa suonare subito.
     *
     * Due passaggi, e servono entrambi: `0x0101` verso il preset software
     * riempie un buffer, `0x0138` dice all'ampli di passare a quel buffer.
     * Senza il secondo l'ampli conferma tutti i chunk e continua a suonare
     * quello di prima — verificato sull'hardware.
     *
     * Non sovrascrive nessuno slot salvato.
     */
    async loadPreset(preset, onProgress, options) {
      const esito = await this.writePreset(preset, Spark.SOFTWARE_TARGET, onProgress, options);
      if (!esito.ok) return esito;
      await this.send(Spark.commands.changePreset(Spark.SOFTWARE_PRESET));
      this.onLog('passato al preset software');
      return esito;
    },

    /**
     * Carica un preset e lo salva in uno slot dell'ampli, sovrascrivendolo.
     * Stessa prima metà di loadPreset, poi `0x0127` invece di `0x0138`.
     *
     * Alla fine seleziona lo slot appena scritto. Senza, l'ampli resterebbe
     * sul buffer software e il LED continuerebbe a lampeggiare come se
     * stesse suonando qualcosa di non salvato — che è vero, ma confonde.
     * `{activate: false}` per non farlo.
     */
    async storePreset(preset, slot, onProgress, options) {
      const opts  = options || {};
      const esito = await this.writePreset(preset, Spark.SOFTWARE_TARGET, onProgress, opts);
      if (!esito.ok) return esito;

      await this.send(Spark.commands.savePreset(slot));
      this.onLog(`salvato nello slot ${slot}`);

      if (opts.activate !== false) {
        await this.send(Spark.commands.changePreset(slot));
        this.onLog(`selezionato lo slot ${slot}`);
      }
      return esito;
    },

    /** Invia un comando di scrittura e aspetta l'ack. Ack ≠ eseguito. */
    async sendAndAwaitAck(command, timeoutMs) {
      const pending = this._wait(
        m => m.cmd === Spark.CMD_ACK && m.sub === command.sub,
        timeoutMs || DEFAULT_TIMEOUT);
      await this.send(command);
      return pending;
    },
  };

  const hex = b => b.toString(16).padStart(2, '0');

  return SparkTransport;
})();
