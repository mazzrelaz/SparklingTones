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
      const banco = { id, nome: String(nome || '').trim() || `Banco ${banchi.length + 1}`,
                      posti: this._ottoPosti([]) };
      banchi.push(banco);
      await this.setBanks(banchi);
      return banco;
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
        if (record.slot !== null && record.slot !== undefined &&
            record.slot >= 0 && record.slot < POSTI_PER_BANCO) {
          posti[record.slot] = record;
        }
      }
      return posti;
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

    /* ---------------------------------------------------------------- */

    /** Aggiunge un preset, completandolo con i campi di organizzazione. */
    async add(preset) {
      const now = Date.now();
      const record = Object.assign({}, preset, {
        tags:     normalizeTags(preset.tags || []),
        notes:    preset.notes    || '',
        favorite: preset.favorite || false,
        order:    preset.order !== undefined ? preset.order : await this._nextOrder(),
        createdAt: now,
        updatedAt: now,
      });
      delete record.id;
      record.id = await promisify(this._tx('readwrite').add(record));
      return record.id;
    },

    async put(record) {
      record.updatedAt = Date.now();
      return promisify(this._tx('readwrite').put(record));
    },

    get(id)    { return promisify(this._tx('readonly').get(id)); },
    remove(id) { return promisify(this._tx('readwrite').delete(id)); },
    clear()    { return promisify(this._tx('readwrite').clear()); },

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
      for (const preset of presets) {
        const existing = preset.uuid ? await this.byUuid(preset.uuid) : null;
        if (existing) {
          for (const field of SOUND_FIELDS) {
            if (preset[field] !== undefined) existing[field] = preset[field];
          }
          existing.slot = preset.slot;
          await this.put(existing);
          updated++;
        } else {
          await this.add(preset);
          added++;
        }
      }
      return { added, updated };
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
     * Registra quali preset stanno adesso negli slot dell'ampli.
     * A chi teneva uno slot che è stato riassegnato lo slot viene tolto,
     * altrimenti la libreria mostrerebbe due preset nello stesso posto.
     * @param assegnazioni oggetto {idPreset: slot}
     */
    async assignSlots(assegnazioni) {
      const occupati = Object.values(assegnazioni);
      for (const record of await this.all()) {
        const nuovo = assegnazioni[record.id];
        if (nuovo !== undefined) {
          if (record.slot !== nuovo) { record.slot = nuovo; await this.put(record); }
        } else if (record.slot !== null && record.slot !== undefined &&
                   occupati.includes(record.slot)) {
          record.slot = null;
          await this.put(record);
        }
      }
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

    async exportAll() {
      return {
        format:     'spark-controller-library',
        version:    1,
        exportedAt: new Date().toISOString(),
        presets:    await this.all(),
      };
    },

    /**
     * Reimporta un backup. Di default aggiunge a quanto c'è; con
     * `replace` svuota prima la libreria.
     */
    async importBackup(backup, options) {
      const opts = options || {};
      if (!backup || backup.format !== 'spark-controller-library') {
        throw new Error('il file non è un backup della libreria');
      }
      if (opts.replace) await this.clear();

      let imported = 0;
      for (const preset of backup.presets) {
        const copy = Object.assign({}, preset);
        delete copy.id;
        if (opts.replace) {
          await this.add(copy);
          imported++;
        } else {
          const existing = copy.uuid ? await this.byUuid(copy.uuid) : null;
          if (existing) {
            USER_FIELDS.forEach(f => { if (copy[f] !== undefined) existing[f] = copy[f]; });
            SOUND_FIELDS.forEach(f => { if (copy[f] !== undefined) existing[f] = copy[f]; });
            await this.put(existing);
          } else {
            await this.add(copy);
          }
          imported++;
        }
      }
      return imported;
    },
  };

  /* ------------------------------------------------------------------ */

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

  return PresetStore;
})();
