/**
 * preset-store.js — libreria locale dei preset su IndexedDB.
 *
 * Nessuna dipendenza dagli altri moduli: qui i preset sono solo dati.
 * Il formato dei record è quello prodotto da Spark.parsePreset, più i campi
 * di organizzazione che l'ampli non conosce (tag, note, preferiti, ordine).
 *
 * Il punto delicato è `importFromAmp`: rileggere la libreria dall'ampli non
 * deve mai cancellare il lavoro di organizzazione fatto dall'utente. I preset
 * vengono riconosciuti per UUID e di essi si aggiorna solo la parte sonora.
 *
 * Classic script come il resto del progetto: niente ES module, niente build.
 */
window.PresetStore = (function () {
  'use strict';

  const DB_VERSION = 2;
  const STORE      = 'presets';
  const SETTINGS   = 'settings';   // banchi, categorie e preferenze, una riga per chiave

  /** Un banco ha gli stessi otto posti degli slot dell'ampli: 4 e 4. */
  const POSTI_PER_BANCO = 8;

  /**
   * Le tre famiglie di suono, con un colore di partenza ciascuna. Sono
   * fisse: tre, non di più, perché servono a riconoscere un preset senza
   * leggerlo — e più di tre colori non si distinguono con un'occhiata.
   * I colori si cambiano (`setColoreFamiglia`): questi servono solo a
   * partire da qualcosa di distinguibile sul fondo scuro.
   *
   * **Il verde non è di nessuna delle tre, ed è voluto**: nella vista live è il
   * LED di chi la famiglia non ce l'ha, quindi darlo anche a una famiglia
   * farebbe sembrare acoustic ogni preset non catalogato.
   */
  const FAMIGLIE = [
    { id: 'clean',    nome: 'Clean',    colore: '#0a84ff' },   // blu elettrico
    { id: 'drive',    nome: 'Drive',    colore: '#ff3b30' },   // rosso
    { id: 'acoustic', nome: 'Acoustic', colore: '#ffd21e' },   // giallo
  ];

  /**
   * Gli slot dell'ampli in cui sta un preset, come lista ordinata.
   *
   * È una lista e non un numero perché lo stesso preset può stare in più
   * slot: capita appena si copia un suono in due posti, e con un campo solo
   * l'ultimo letto vinceva e l'altro slot sembrava vuoto. Accetta anche i
   * record vecchi, che avevano `slot` singolo, e li converte.
   */
  function normalizzaSlots(record) {
    const grezzi = Array.isArray(record.slots)
      ? record.slots
      : (record.slot === null || record.slot === undefined ? [] : [record.slot]);

    record.slots = [...new Set(grezzi)]
      .filter(s => Number.isInteger(s) && s >= 0 && s < POSTI_PER_BANCO)
      .sort((a, b) => a - b);

    delete record.slot;    // una sola verità: due campi divergerebbero
    return record;
  }

  /** Campi che descrivono il suono: arrivano dall'ampli e vengono sovrascritti. */
  const SOUND_FIELDS = ['name', 'version', 'description', 'icon', 'bpm',
                        'effects', 'tail', 'checksum'];

  /** Campi dell'utente: non vengono mai toccati da un import. */
  const USER_FIELDS  = ['tags', 'notes', 'favorite', 'order'];

  const promisify = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });

  function PresetStore(dbName) {
    this.dbName = dbName || 'spark-controller';
    this.db = null;
  }

  PresetStore.prototype = {

    async open() {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('uuid',  'uuid',  { unique: false });
          store.createIndex('order', 'order', { unique: false });
          store.createIndex('tags',  'tags',  { unique: false, multiEntry: true });
        }
        // Aggiunto nella versione 2: chi aveva già una libreria la conserva.
        if (!db.objectStoreNames.contains(SETTINGS)) {
          db.createObjectStore(SETTINGS, { keyPath: 'key' });
        }
      };
      this.db = await promisify(request);
      await this._migraScalettaInBanco();
      await this._migraSlotInLista();
      await this._migraBanchiConUuid();
      return this;
    },

    close() {
      if (this.db) { this.db.close(); this.db = null; }
    },

    _tx(mode, which) {
      if (!this.db) throw new Error('store non aperto: chiama open() prima');
      const name = which || STORE;
      return this.db.transaction(name, mode).objectStore(name);
    },

    /* ----------------------------------------------------------------
       Preferenze e scaletta
       ---------------------------------------------------------------- */

    async getSetting(key, fallback) {
      const row = await promisify(this._tx('readonly', SETTINGS).get(key));
      return row === undefined ? fallback : row.value;
    },

    setSetting(key, value) {
      return promisify(this._tx('readwrite', SETTINGS).put({ key, value }));
    },

    /**
     * La scaletta è una lista di id di preset. Gli id che non esistono più
     * vengono scartati in lettura, così cancellare un preset non lascia
     * buchi né pulsanti morti.
     */
    async getSetlist() {
      const ids  = await this.getSetting('setlist', []);
      const vivi = [];
      for (const id of ids) {
        const record = await this.get(id);
        if (record) vivi.push(record);
      }
      return vivi;
    },

    setSetlist(ids) {
      return this.setSetting('setlist', ids);
    },

    async addToSetlist(id) {
      const ids = await this.getSetting('setlist', []);
      if (!ids.includes(id)) ids.push(id);
      await this.setSetlist(ids);
      return ids;
    },

    async removeFromSetlist(id) {
      const ids = (await this.getSetting('setlist', [])).filter(x => x !== id);
      await this.setSetlist(ids);
      return ids;
    },

    /* ----------------------------------------------------------------
       Banchi della vista live

       Un banco è una fila di otto posti, come gli otto slot dell'ampli.
       Il banco degli otto preset hardware non è salvato: si ricava dal
       campo `slot` dei record (vedi `hardware()`), così resta sempre
       aderente a quello che c'è davvero sull'ampli e non può divergere.
       Qui si salvano solo i banchi inventati dall'utente.
       ---------------------------------------------------------------- */

    /** Otto posti, riempiti con quello che c'è e completati con dei vuoti. */
    _ottoPosti(ids) {
      const posti = (ids || []).slice(0, POSTI_PER_BANCO);
      while (posti.length < POSTI_PER_BANCO) posti.push(null);
      return posti;
    },

    /**
     * I banchi salvati. Gli id di preset cancellati diventano posti vuoti:
     * come per la scaletta, meglio un buco che un pulsante morto.
     */
    async getBanks() {
      const banchi = await this.getSetting('banchi', []);
      const vivi   = new Set((await this.all()).map(r => r.id));
      return banchi.map(banco => ({
        id:    banco.id,
        uuid:  banco.uuid,
        nome:  banco.nome,
        posti: this._ottoPosti(banco.posti).map(id => (vivi.has(id) ? id : null)),
      }));
    },

    setBanks(banchi) {
      return this.setSetting('banchi', banchi);
    },

    async addBank(nome) {
      const banchi = await this.getSetting('banchi', []);
      const id = banchi.reduce((max, b) => Math.max(max, b.id), 0) + 1;
      const banco = { id, uuid: nuovoUuid(),
                      nome: String(nome || '').trim() || `Banco ${banchi.length + 1}`,
                      posti: this._ottoPosti([]) };
      banchi.push(banco);
      await this.setBanks(banchi);
      return banco;
    },

    /**
     * I banchi come vanno in un backup: i posti per UUID e non per id,
     * perché l'id è locale e sull'altro dispositivo indica un altro preset.
     * Un posto il cui preset non c'è più viaggia vuoto.
     */
    async _banchiPerBackup() {
      const uuidDi = new Map((await this.all()).map(r => [r.id, r.uuid || null]));
      return (await this.getBanks()).map(banco => ({
        uuid:  banco.uuid,
        nome:  banco.nome,
        posti: banco.posti.map(id => (id === null ? null : (uuidDi.get(id) || null))),
      }));
    },

    /**
     * I banchi che arrivano da un backup si fondono per UUID: quello che
     * riconosce lo aggiorna, quello che non conosce lo aggiunge in coda, e i
     * banchi che esistono solo qui li lascia stare. Il banco che arriva vince
     * su quello che c'è, perché reimportare è un gesto esplicito — ma non può
     * togliere niente dalla libreria, solo comporre i suoi otto posti.
     *
     * Un preset che qui non c'è lascia un posto vuoto, come già fa getBanks
     * con un id morto.
     */
    async _importaBanchi(banchi) {
      if (!Array.isArray(banchi) || banchi.length === 0) return;
      const idDi   = new Map((await this.all()).map(r => [r.uuid, r.id]));
      const nostri = await this.getSetting('banchi', []);
      let prossimo = nostri.reduce((max, b) => Math.max(max, b.id), 0) + 1;

      for (const arrivo of banchi) {
        const posti = this._ottoPosti(arrivo.posti)
          .map(uuid => (uuid && idDi.has(uuid) ? idDi.get(uuid) : null));
        // Senza UUID vale il nome: succede con un backup scritto a mano o
        // con un banco nato prima che i banchi avessero un UUID.
        const mio = nostri.find(b => (arrivo.uuid && b.uuid === arrivo.uuid) ||
                                     (!arrivo.uuid && stessoNome(b.nome, arrivo.nome)));
        if (mio) {
          mio.nome  = String(arrivo.nome || '').trim() || mio.nome;
          mio.posti = posti;
        } else {
          nostri.push({ id: prossimo++, uuid: arrivo.uuid || nuovoUuid(),
                        nome: String(arrivo.nome || '').trim() || `Banco ${nostri.length + 1}`,
                        posti });
        }
      }
      await this.setBanks(nostri);
    },

    async renameBank(id, nome) {
      const banchi = await this.getSetting('banchi', []);
      const banco  = banchi.find(b => b.id === id);
      if (!banco) throw new Error(`banco ${id} inesistente`);
      banco.nome = String(nome || '').trim() || banco.nome;
      await this.setBanks(banchi);
      return banco;
    },

    async removeBank(id) {
      const banchi = (await this.getSetting('banchi', [])).filter(b => b.id !== id);
      await this.setBanks(banchi);
      return banchi;
    },

    /** Mette un preset in un posto del banco, o lo svuota con null. */
    async setBankSlot(id, posto, presetId) {
      if (posto < 0 || posto >= POSTI_PER_BANCO) {
        throw new Error(`posto ${posto} fuori dal banco: ce ne sono ${POSTI_PER_BANCO}`);
      }
      const banchi = await this.getSetting('banchi', []);
      const banco  = banchi.find(b => b.id === id);
      if (!banco) throw new Error(`banco ${id} inesistente`);
      banco.posti = this._ottoPosti(banco.posti);
      banco.posti[posto] = presetId === undefined ? null : presetId;
      await this.setBanks(banchi);
      return banco;
    },

    /**
     * Gli otto preset che stanno negli slot dell'ampli, per numero di slot.
     * I posti di cui non sappiamo niente restano null: la libreria conosce
     * uno slot solo dopo averlo letto o scritto.
     */
    async hardware() {
      const posti = new Array(POSTI_PER_BANCO).fill(null);
      for (const record of await this.all()) {
        for (const slot of normalizzaSlots(record).slots) posti[slot] = record;
      }
      return posti;
    },

    /**
     * I record vecchi avevano `slot` singolo: diventa una lista, una volta
     * sola. Senza, un preset copiato in due slot ne mostrerebbe uno solo e
     * l'altro sembrerebbe vuoto — che è esattamente il difetto che la lista
     * risolve.
     */
    async _migraSlotInLista() {
      if (await this.getSetting('slotComeLista', false)) return;
      for (const record of await this.all()) {
        if (Array.isArray(record.slots) && record.slot === undefined) continue;
        await this.put(normalizzaSlots(record));
      }
      await this.setSetting('slotComeLista', true);
    },

    /**
     * La scaletta di prima diventa un banco, una volta sola. Chi aveva già
     * composto una scaletta se la ritrova come primo banco invece di dover
     * ricominciare da capo.
     */
    async _migraScalettaInBanco() {
      if (await this.getSetting('banchi', null) !== null) return;
      const ids = await this.getSetting('setlist', []);
      if (ids.length === 0) { await this.setBanks([]); return; }
      await this.setBanks([{ id: 1, nome: 'Scaletta', posti: this._ottoPosti(ids) }]);
    },

    /**
     * I banchi nati prima del sync non hanno un UUID, e senza quello due
     * dispositivi non possono riconoscere lo stesso banco: al primo scambio
     * ne nascerebbe un doppione a testa. Si assegna una volta sola, a chi non
     * ce l'ha, e da lì in poi il banco ha un'identità che sopravvive
     * all'export.
     */
    async _migraBanchiConUuid() {
      const banchi = await this.getSetting('banchi', []);
      if (!Array.isArray(banchi) || banchi.every(b => b.uuid)) return;
      for (const banco of banchi) if (!banco.uuid) banco.uuid = nuovoUuid();
      await this.setBanks(banchi);
    },

    /* ---------------------------------------------------------------- */

    /** Aggiunge un preset, completandolo con i campi di organizzazione. */
    async add(preset) {
      const now = Date.now();
      const record = normalizzaSlots(Object.assign({}, preset, {
        tags:     normalizeTags(preset.tags || []),
        notes:    preset.notes    || '',
        favorite: preset.favorite || false,
        order:    preset.order !== undefined ? preset.order : await this._nextOrder(),
        createdAt: now,
        updatedAt: now,
      }));
      delete record.id;
      record.id = await promisify(this._tx('readwrite').add(record));
      // Se quell'UUID era stato cancellato, ora è tornato: via la lapide, o
      // il prossimo import lo ricancellerebbe.
      if (record.uuid) await this._dimenticaCancellato(record.uuid);
      return record.id;
    },

    async put(record) {
      record.updatedAt = Date.now();
      return promisify(this._tx('readwrite').put(record));
    },

    get(id)    { return promisify(this._tx('readonly').get(id)); },
    clear()    { return promisify(this._tx('readwrite').clear()); },

    /**
     * Cancella un preset e ne segna l'UUID fra i cancellati. Senza quella
     * lapide la fusione per UUID non distingue «cancellato» da «non ancora
     * arrivato», e il primo backup di un altro dispositivo lo farebbe
     * risuscitare.
     */
    async remove(id) {
      const record = await this.get(id);
      await promisify(this._tx('readwrite').delete(id));
      if (record && record.uuid) {
        const tombe = await this.getSetting('cancellati', {});
        tombe[record.uuid] = Date.now();
        await this.setSetting('cancellati', tombe);
      }
    },

    /** Un preset tornato in libreria non è più cancellato. */
    async _dimenticaCancellato(uuid) {
      const tombe = await this.getSetting('cancellati', {});
      if (tombe[uuid] === undefined) return;
      delete tombe[uuid];
      await this.setSetting('cancellati', tombe);
    },

    /**
     * Toglie dalla libreria tutto quello che non sta sull'ampli, e restituisce
     * quanti ne ha tolti.
     *
     * Gli otto slot restano, e non è una gentilezza: sono i preset che l'ampli
     * suona adesso, quindi la prima lettura li rimetterebbe dentro comunque —
     * ma senza tag, note, famiglia e ordine, che a quel punto sarebbero persi
     * davvero. Meglio non toglierli affatto.
     *
     * Passa da `remove`, quindi ogni preset lascia la sua lapide: senza, il
     * primo «Prendi da Dropbox» li farebbe tornare tutti, ed è esattamente
     * quello che uno non si aspetta dopo aver svuotato la libreria.
     */
    async svuotaTranneAmpli() {
      const daTogliere = (await this.all())
        .filter(record => normalizzaSlots(record).slots.length === 0);
      for (const record of daTogliere) await this.remove(record.id);
      return daTogliere.length;
    },

    /**
     * Copia un preset: stesso suono, identità nuova. È il modo vero di farne
     * uno — si parte da un suono che funziona e lo si storce, non dal nulla.
     *
     * Tre cose devono cambiare, e sono tutte trappole se non cambiano:
     * l'**UUID**, o la prossima lettura dall'ampli scambierebbe la copia per
     * l'originale e ne aggiornerebbe uno solo; gli **slot**, perché la copia
     * sull'ampli non c'è; e il **nome**, perché due righe identiche in
     * libreria non si distinguono.
     */
    async duplicate(id, nome) {
      const originale = await this.get(id);
      if (!originale) throw new Error(`preset ${id} inesistente`);

      const copia = Object.assign({}, originale, {
        uuid:  nuovoUuid(),
        slots: [],
        name:  String(nome || '').trim() ||
               await this._nomeLibero(originale.name),
        order: originale.order + 0.5,     // subito sotto l'originale
      });
      delete copia.id;
      const nuovoId = await this.add(copia);
      await this.move(nuovoId, originale.order + 1);   // e rinumera 0..n-1
      return nuovoId;
    },

    /** «Clean Twin» → «Clean Twin (copia)», e se c'è già, «(copia 2)». */
    async _nomeLibero(nome) {
      const presi = new Set((await this.all())
        .map(r => String(r.name || '').trim().toLowerCase()));
      const base = String(nome || 'Senza nome').trim();
      let proposto = `${base} (copia)`;
      for (let n = 2; presi.has(proposto.toLowerCase()); n++) proposto = `${base} (copia ${n})`;
      return proposto;
    },

    /** Tutti i preset, nell'ordine manuale scelto dall'utente. */
    async all() {
      const records = await promisify(this._tx('readonly').getAll());
      return records.sort((a, b) => a.order - b.order);
    },

    async byUuid(uuid) {
      return promisify(this._tx('readonly').index('uuid').get(uuid));
    },

    async count() {
      return promisify(this._tx('readonly').count());
    },

    async _nextOrder() {
      const records = await promisify(this._tx('readonly').getAll());
      return records.length === 0 ? 0 : Math.max(...records.map(r => r.order)) + 1;
    },

    /* ----------------------------------------------------------------
       Import dall'ampli
       ---------------------------------------------------------------- */

    /**
     * Inserisce i preset letti dall'ampli. Quelli già presenti (stesso UUID)
     * vengono aggiornati solo nella parte sonora: tag, note, preferiti e
     * ordine restano quelli dell'utente.
     * @returns {{added: number, updated: number}}
     */
    async importFromAmp(presets) {
      let added = 0, updated = 0;
      const visti = new Map();          // slot letto → uuid che ci sta

      for (const preset of presets) {
        if (preset.slot !== null && preset.slot !== undefined) {
          visti.set(preset.slot, preset.uuid);
        }
        const existing = preset.uuid ? await this.byUuid(preset.uuid) : null;
        if (existing) {
          for (const field of SOUND_FIELDS) {
            if (preset[field] !== undefined) existing[field] = preset[field];
          }
          await this.put(existing);
          updated++;
        } else {
          await this.add(Object.assign({}, preset, { slots: [], slot: undefined }));
          added++;
        }
      }

      await this._sistemaSlot(visti);
      return { added, updated };
    },

    /**
     * Riscrive gli slot a partire da quelli appena osservati sull'ampli.
     *
     * Si toccano **solo gli slot osservati**: se la lettura di uno è fallita
     * non sappiamo cosa ci sia, e cancellarlo lo farebbe sparire dalla
     * libreria per un timeout. Chi teneva uno slot osservato che ora è di un
     * altro lo perde; chi lo ha appena preso lo acquista.
     *
     * @param visti Map da numero di slot all'uuid che ci sta adesso
     */
    async _sistemaSlot(visti) {
      if (visti.size === 0) return;
      const osservati = new Set(visti.keys());

      for (const record of await this.all()) {
        normalizzaSlots(record);
        const restano = record.slots.filter(s => !osservati.has(s));
        const suoi    = [...visti.entries()]
          .filter(([, uuid]) => uuid && uuid === record.uuid)
          .map(([slot]) => slot);

        const nuovi = [...new Set(restano.concat(suoi))].sort((a, b) => a - b);
        if (nuovi.join(',') !== record.slots.join(',')) {
          record.slots = nuovi;
          await this.put(record);
        }
      }
    },

    /**
     * Inserisce i preset letti dal backup dell'app ufficiale.
     *
     * **Le categorie del backup non entrano in libreria.** `parseBackup` le
     * riporta fedelmente perché stanno nel file, ma qui la catalogazione è
     * dell'utente: quella dell'app ufficiale arriverebbe con decine di nomi
     * mai scelti da nessuno. Chi la vuole comunque passa
     * `{categorieDalBackup: true}`, e allora vengono **aggiunte** a quelle
     * già presenti — reimportare non deve mai cancellare il lavoro fatto qui.
     *
     * @returns {{added: number, updated: number}}
     */
    async importFromBackup(presets, options) {
      const dalBackup = !!(options && options.categorieDalBackup);
      let added = 0, updated = 0;
      for (const preset of presets) {
        const arrivo = dalBackup ? preset : Object.assign({}, preset, { tags: [] });
        const existing = arrivo.uuid ? await this.byUuid(arrivo.uuid) : null;
        if (existing) {
          for (const field of SOUND_FIELDS) {
            if (arrivo[field] !== undefined) existing[field] = arrivo[field];
          }
          if (dalBackup) {
            existing.tags = normalizeTags([...(existing.tags || []), ...(arrivo.tags || [])]);
          }
          await this.put(existing);
          updated++;
        } else {
          await this.add(arrivo);
          added++;
        }
      }
      return { added, updated };
    },

    /**
     * Registra quali preset stanno adesso negli slot dell'ampli, dopo averli
     * scritti. A chi teneva uno slot riassegnato lo slot viene tolto,
     * altrimenti la libreria mostrerebbe due preset nello stesso posto.
     * @param assegnazioni oggetto {idPreset: slot}
     */
    async assignSlots(assegnazioni) {
      const visti = new Map();
      for (const [id, slot] of Object.entries(assegnazioni)) {
        const record = await this.get(Number(id));
        if (record) visti.set(slot, record.uuid);
      }
      await this._sistemaSlot(visti);
    },

    /* ----------------------------------------------------------------
       Organizzazione
       ---------------------------------------------------------------- */

    async _update(id, change) {
      const record = await this.get(id);
      if (!record) throw new Error(`preset ${id} inesistente`);
      change(record);
      await this.put(record);
      return record;
    },

    setTags(id, tags)   { return this._update(id, r => { r.tags = normalizeTags(tags); }); },
    setNotes(id, notes) { return this._update(id, r => { r.notes = notes; }); },
    setName(id, name)   { return this._update(id, r => { r.name = name; }); },

    /* ----------------------------------------------------------------
       Famiglia di suono

       **Non è una categoria come le altre, ed è il punto.** Le categorie
       (`tags`) sono lo stile — Pink Floyd, jazz, il pezzo — e un preset ne
       può avere quante ne vuole. La famiglia risponde a un'altra domanda:
       *che tipo di suono è*. Sono tre, una sola per preset, e servono a
       riconoscerlo a colpo d'occhio dal colore senza leggere niente.

       Un preset senza famiglia resta senza colore: metterceli tutti per
       forza vorrebbe dire inventare, e un colore sbagliato qui è peggio di
       nessun colore, perché lo si legge senza pensarci.
       ---------------------------------------------------------------- */

    /**
     * Assegna la famiglia, o la toglie con null. Un valore che non è una
     * delle tre viene rifiutato: meglio un errore adesso che un colore che
     * non compare e non si capisce perché.
     */
    setFamiglia(id, famiglia) {
      const valore = famiglia ? String(famiglia).trim().toLowerCase() : null;
      if (valore && !FAMIGLIE.some(f => f.id === valore)) {
        throw new Error(`famiglia sconosciuta: ${famiglia}`);
      }
      return this._update(id, r => {
        if (valore) r.famiglia = valore;
        else        delete r.famiglia;
      });
    },

    /** Le tre famiglie col colore in uso: quello scelto dall'utente o il nostro. */
    async getFamiglie() {
      const scelti = await this.getSetting('coloriFamiglia', {});
      return FAMIGLIE.map(f => ({
        id: f.id,
        nome: f.nome,
        colore: scelti[f.id] || f.colore,
        suo: !!scelti[f.id],
      }));
    },

    /** Cambia il colore di una famiglia. Vuoto rimette quello di partenza. */
    async setColoreFamiglia(id, colore) {
      const chiave = String(id).trim().toLowerCase();
      if (!FAMIGLIE.some(f => f.id === chiave)) {
        throw new Error(`famiglia sconosciuta: ${id}`);
      }
      const scelti = Object.assign({}, await this.getSetting('coloriFamiglia', {}));
      if (colore) scelti[chiave] = String(colore);
      else        delete scelti[chiave];
      await this.setSetting('coloriFamiglia', scelti);
      return this.getFamiglie();
    },

    async addTag(id, tag) {
      return this._update(id, r => { r.tags = normalizeTags([...r.tags, tag]); });
    },

    async removeTag(id, tag) {
      const wanted = String(tag).trim().toLowerCase();
      return this._update(id, r => { r.tags = r.tags.filter(t => t.toLowerCase() !== wanted); });
    },

    async toggleFavorite(id) {
      const record = await this._update(id, r => { r.favorite = !r.favorite; });
      return record.favorite;
    },

    /**
     * Sposta un preset alla posizione indicata e rinumera l'intera libreria.
     * Rinumerare tutto è sprecato in teoria, ma la libreria è di poche decine
     * di elementi e così l'ordine resta sempre 0..n-1 senza buchi.
     */
    async move(id, newIndex) {
      const records = await this.all();
      const from = records.findIndex(r => r.id === id);
      if (from === -1) throw new Error(`preset ${id} inesistente`);

      const target = Math.max(0, Math.min(records.length - 1, newIndex));
      records.splice(target, 0, records.splice(from, 1)[0]);

      for (let i = 0; i < records.length; i++) {
        if (records[i].order !== i) {
          records[i].order = i;
          await this.put(records[i]);
        }
      }
      return records.map(r => r.id);
    },

    /* ----------------------------------------------------------------
       Ricerca
       ---------------------------------------------------------------- */

    /**
     * Ricerca testuale su nome, descrizione, note, tag e nomi degli effetti.
     * Tutti i termini devono comparire. La libreria è piccola, quindi si
     * filtra in memoria: IndexedDB non ha ricerca full-text.
     */
    async search(query, options) {
      const opts    = options || {};
      const records = await this.all();
      const terms   = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);

      return records.filter(record => {
        if (opts.favoritesOnly && !record.favorite) return false;
        if (opts.tag && !record.tags.some(t => t.toLowerCase() === opts.tag.toLowerCase())) return false;
        if (terms.length === 0) return true;
        const haystack = haystackOf(record);
        return terms.every(term => haystack.includes(term));
      });
    },

    /* ----------------------------------------------------------------
       Nomi dei parametri

       L'ampli manda i parametri di un effetto come indici, senza nomi, e non
       esiste una tabella da cui dedurli: né nella documentazione del
       protocollo né nei sorgenti di riferimento. Inventarli sarebbe peggio
       che lasciare un numero, perché un'etichetta sbagliata sopra una
       manopola che cambia il suono si crede.

       Quindi li scrive l'utente, girando e ascoltando. Sono salvati **per
       modello di effetto**, non per preset: chi battezza «Mix» il parametro 1
       di DelayRe201 lo vede così in ogni preset che usa quel delay.
       ---------------------------------------------------------------- */

    async getParamNames() {
      return this.getSetting('nomiParametri', {});
    },

    /** Il nome dato dall'utente, o null se non ne ha ancora dato uno. */
    async paramName(effetto, indice) {
      const tutti = await this.getParamNames();
      const suoi = tutti[effetto];
      return (suoi && suoi[indice]) || null;
    },

    /** Battezza un parametro. Un nome vuoto lo riporta al numero. */
    async setParamName(effetto, indice, nome) {
      const tutti = await this.getParamNames();
      const pulito = String(nome || '').trim();
      const suoi = Object.assign({}, tutti[effetto]);

      if (pulito) suoi[indice] = pulito;
      else        delete suoi[indice];

      if (Object.keys(suoi).length) tutti[effetto] = suoi;
      else                          delete tutti[effetto];

      await this.setSetting('nomiParametri', tutti);
      return tutti;
    },

    /* ----------------------------------------------------------------
       Categorie

       Le categorie sono le stesse etichette del campo `tags` dei record,
       ma con un elenco governato dall'utente accanto: serve a poterne
       creare una prima di avere qualcosa da metterci dentro, e a tenere
       l'ordine in cui l'ha decisa lei invece che quello di frequenza.

       L'elenco mostrato è l'unione fra quello salvato e quelle davvero in
       uso: se un'etichetta arriva da un import o da un backup compare lo
       stesso, senza doverla registrare a parte.
       ---------------------------------------------------------------- */

    /**
     * Le categorie, nell'ordine scelto dall'utente, con quanti preset ne
     * fanno parte. Quelle create e non ancora usate ci sono, con zero.
     */
    async allCategories() {
      const elenco  = await this.getSetting('categorie', []);
      const records = await this.all();

      const conta = new Map();
      for (const record of records) {
        for (const tag of record.tags || []) {
          const chiave = tag.toLowerCase();
          if (!conta.has(chiave)) conta.set(chiave, { nome: tag, quanti: 0 });
          conta.get(chiave).quanti++;
        }
      }

      const fuori = [];
      const viste = new Set();
      for (const nome of elenco) {
        const chiave = nome.toLowerCase();
        viste.add(chiave);
        fuori.push({ nome, quanti: conta.has(chiave) ? conta.get(chiave).quanti : 0 });
      }
      // Le etichette in uso ma non nell'elenco vanno in fondo, alfabetiche.
      const orfane = [...conta.entries()]
        .filter(([chiave]) => !viste.has(chiave))
        .map(([, v]) => v)
        .sort((a, b) => a.nome.localeCompare(b.nome));

      return fuori.concat(orfane);
    },

    /** Crea una categoria vuota. Ripetere il nome non fa danni. */
    async addCategory(nome) {
      const pulito = String(nome || '').trim();
      if (!pulito) throw new Error('la categoria vuole un nome');
      const elenco = await this.getSetting('categorie', []);
      if (!elenco.some(n => n.toLowerCase() === pulito.toLowerCase())) {
        elenco.push(pulito);
        await this.setSetting('categorie', elenco);
      }
      return elenco;
    },

    /** Rinomina la categoria ovunque compaia, elenco e preset. */
    async renameCategory(vecchio, nuovo) {
      const da = String(vecchio || '').trim().toLowerCase();
      const a  = String(nuovo   || '').trim();
      if (!da || !a) throw new Error('serve sia il vecchio nome sia il nuovo');

      const elenco = (await this.getSetting('categorie', []))
        .map(n => (n.toLowerCase() === da ? a : n));
      if (!elenco.some(n => n.toLowerCase() === a.toLowerCase())) elenco.push(a);
      await this.setSetting('categorie', normalizeTags(elenco));

      for (const record of await this.all()) {
        if (!(record.tags || []).some(t => t.toLowerCase() === da)) continue;
        record.tags = normalizeTags(record.tags.map(t => (t.toLowerCase() === da ? a : t)));
        await this.put(record);
      }
    },

    /** Toglie la categoria dall'elenco e da tutti i preset che la portano. */
    async removeCategory(nome) {
      const via = String(nome || '').trim().toLowerCase();
      if (!via) return;

      const elenco = (await this.getSetting('categorie', []))
        .filter(n => n.toLowerCase() !== via);
      await this.setSetting('categorie', elenco);

      for (const record of await this.all()) {
        if (!(record.tags || []).some(t => t.toLowerCase() === via)) continue;
        record.tags = record.tags.filter(t => t.toLowerCase() !== via);
        await this.put(record);
      }
    },

    /**
     * Azzera la catalogazione: nessuna categoria, e nessun preset ne porta
     * più. I preset non si toccano, perdono solo l'etichetta. Serve a
     * ripartire da zero dopo un import che ha portato categorie non volute.
     * @returns quante categorie sono state tolte
     */
    async clearCategories() {
      const quante = (await this.allCategories()).length;
      await this.setSetting('categorie', []);
      for (const record of await this.all()) {
        if ((record.tags || []).length === 0) continue;
        record.tags = [];
        await this.put(record);
      }
      return quante;
    },

    /** Sposta una categoria nell'elenco: l'ordine è quello che si vede. */
    async moveCategory(nome, nuovoIndice) {
      const elenco = (await this.allCategories()).map(c => c.nome);
      const da = elenco.findIndex(n => n.toLowerCase() === String(nome).trim().toLowerCase());
      if (da === -1) throw new Error(`categoria «${nome}» inesistente`);
      const a = Math.max(0, Math.min(elenco.length - 1, nuovoIndice));
      elenco.splice(a, 0, elenco.splice(da, 1)[0]);
      await this.setSetting('categorie', elenco);
      return elenco;
    },

    /** Elenco dei tag usati, con quante volte, in ordine di frequenza. */
    async allTags() {
      const records = await this.all();
      const counts = new Map();
      for (const record of records) {
        for (const tag of record.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
      }
      return [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    },

    /* ----------------------------------------------------------------
       Backup
       ---------------------------------------------------------------- */

    /**
     * Nel backup vanno anche categorie e nomi dei parametri: sono lavoro
     * dell'utente che non si ricava da nessun'altra parte, e perderli
     * esportando sarebbe il modo più stupido di buttarli via.
     *
     * Dalla versione 2 ci sono anche i banchi e i preset cancellati, perché
     * il backup è diventato anche il mezzo per tenere allineati due
     * dispositivi, e non solo per non perdere niente:
     *
     * - i banchi puntano agli id dei preset, che sono locali e reimportando
     *   cambiano: è la ragione per cui prima restavano fuori. Qui viaggiano
     *   per UUID, e all'arrivo si ritraducono;
     * - senza la lista dei cancellati la fusione per UUID non distingue
     *   «cancellato» da «non ancora arrivato», e un preset buttato via su un
     *   dispositivo tornerebbe dall'altro al primo scambio.
     */
    async exportAll() {
      return {
        format:        'spark-controller-library',
        version:       2,
        exportedAt:    new Date().toISOString(),
        categorie:     await this.getSetting('categorie', []),
        nomiParametri: await this.getParamNames(),
        coloriFamiglia: await this.getSetting('coloriFamiglia', {}),
        banchi:        await this._banchiPerBackup(),
        cancellati:    await this.getSetting('cancellati', {}),
        presets:       await this.all(),
      };
    },

    /**
     * Reimporta un backup. Di default aggiunge a quanto c'è; con
     * `replace` svuota prima la libreria.
     *
     * Le cancellazioni si propagano, ma non vincono sempre: un preset viene
     * tolto solo se qui non è stato toccato dopo la data in cui l'altro
     * dispositivo l'ha cancellato. Se nel frattempo è stato modificato — o
     * riletto dall'ampli, che ai fini della data è lo stesso — resta dov'è:
     * fra perdere lavoro e tenersi un preset di troppo, la regola della
     * libreria è chiara.
     */
    async importBackup(backup, options) {
      const opts = options || {};
      if (!backup || backup.format !== 'spark-controller-library') {
        throw new Error('il file non è un backup della libreria');
      }
      if (opts.replace) await this.clear();

      // Categorie e nomi dei parametri si aggiungono a quelli che ci sono
      // già: reimportare un backup vecchio non deve cancellare i battesimi
      // fatti da allora.
      if (Array.isArray(backup.categorie) && backup.categorie.length) {
        const elenco = await this.getSetting('categorie', []);
        await this.setSetting('categorie',
          normalizeTags(elenco.concat(backup.categorie)));
      }
      if (backup.coloriFamiglia && typeof backup.coloriFamiglia === 'object') {
        const scelti = await this.getSetting('coloriFamiglia', {});
        await this.setSetting('coloriFamiglia',
          Object.assign({}, backup.coloriFamiglia, scelti));
      }
      if (backup.nomiParametri && typeof backup.nomiParametri === 'object') {
        const tutti = await this.getParamNames();
        for (const [effetto, suoi] of Object.entries(backup.nomiParametri)) {
          tutti[effetto] = Object.assign({}, suoi, tutti[effetto]);
        }
        await this.setSetting('nomiParametri', tutti);
      }

      // Le due liste di lapidi si fondono tenendo la data più vecchia fra le
      // due: è quella che dice davvero quando il preset è stato cancellato.
      // Fondendole, la cancellazione continua a viaggiare verso un terzo
      // dispositivo che non l'ha ancora vista.
      const tombe  = opts.replace ? {} : await this.getSetting('cancellati', {});
      const arrivo = (backup.cancellati && typeof backup.cancellati === 'object')
        ? backup.cancellati : {};
      for (const [uuid, quando] of Object.entries(arrivo)) {
        if (tombe[uuid] === undefined || quando < tombe[uuid]) tombe[uuid] = quando;
      }

      // Si cancella prima di importare: se lo stesso backup porta la lapide e
      // un preset più recente, deve vincere il preset, e lo fa perché il
      // ciclo qui sotto lo riaggiunge.
      if (!opts.replace) {
        for (const [uuid, quando] of Object.entries(tombe)) {
          const locale = await this.byUuid(uuid);
          if (locale && !((locale.updatedAt || 0) > quando)) {
            await promisify(this._tx('readwrite').delete(locale.id));
          }
        }
      }

      let imported = 0;
      for (const preset of backup.presets) {
        const copy = Object.assign({}, preset);
        delete copy.id;

        // Un preset cancellato altrove non risuscita, a meno che la copia che
        // arriva sia più recente della cancellazione.
        const cancellato = copy.uuid ? tombe[copy.uuid] : undefined;
        if (!opts.replace && cancellato !== undefined &&
            !((copy.updatedAt || 0) > cancellato)) continue;
        if (copy.uuid) delete tombe[copy.uuid];   // è tornato: la lapide non serve più

        if (opts.replace) {
          await this.add(copy);
        } else {
          const existing = copy.uuid ? await this.byUuid(copy.uuid) : null;
          if (existing) {
            USER_FIELDS.forEach(f => { if (copy[f] !== undefined) existing[f] = copy[f]; });
            SOUND_FIELDS.forEach(f => { if (copy[f] !== undefined) existing[f] = copy[f]; });
            await this.put(existing);
          } else {
            await this.add(copy);
          }
        }
        imported++;
      }

      await this.setSetting('cancellati', tombe);
      await this._importaBanchi(backup.banchi);   // dopo i preset: gli UUID devono esserci
      return imported;
    },
  };

  /* ------------------------------------------------------------------ */

  /**
   * Un UUID: l'identità di un preset o di un banco fra due dispositivi.
   *
   * `crypto.randomUUID` vuole un contesto sicuro — c'è su https e su `file://`,
   * non su un http qualunque — e la riserva **deve avere la stessa forma**, non
   * solo essere diversa dalle altre: lo stesso UUID finisce dentro il preset
   * che va all'ampli, dove il campo è di 36 caratteri (`spark-protocol.js`
   * avvisa se non lo è).
   */
  function nuovoUuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;        // versione 4
    b[8] = (b[8] & 0x3f) | 0x80;        // variante
    const hex = [...b].map(n => n.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
           '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  /** Due nomi di banco uguali a meno di spazi e maiuscole. */
  function stessoNome(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  /** Tag ripuliti: senza spazi ai bordi, senza vuoti, senza duplicati. */
  function normalizeTags(tags) {
    const seen = new Set();
    const out = [];
    for (const raw of tags) {
      const tag = String(raw).trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out;
  }

  function haystackOf(record) {
    return [
      record.name,
      record.description,
      record.notes,
      (record.tags || []).join(' '),
      (record.effects || []).map(e => e.name).join(' '),
    ].join(' ').toLowerCase();
  }

  /** Cancella del tutto un database. Usato dai test. */
  PresetStore.deleteDatabase = function (dbName) {
    return promisify(indexedDB.deleteDatabase(dbName));
  };

  PresetStore.SOUND_FIELDS    = SOUND_FIELDS;
  PresetStore.USER_FIELDS     = USER_FIELDS;
  PresetStore.POSTI_PER_BANCO = POSTI_PER_BANCO;
  PresetStore.normalizzaSlots = normalizzaSlots;

  return PresetStore;
})();
