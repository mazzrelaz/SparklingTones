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
  const SETTINGS   = 'settings';   // scaletta e preferenze, una riga per chiave

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
     * Inserisce i preset letti dal backup dell'app ufficiale. Le categorie
     * dell'app arrivano come tag e vengono **aggiunte** a quelli esistenti:
     * reimportare il backup non deve cancellare la catalogazione fatta qui.
     * @returns {{added: number, updated: number}}
     */
    async importFromBackup(presets) {
      let added = 0, updated = 0;
      for (const preset of presets) {
        const existing = preset.uuid ? await this.byUuid(preset.uuid) : null;
        if (existing) {
          for (const field of SOUND_FIELDS) {
            if (preset[field] !== undefined) existing[field] = preset[field];
          }
          existing.tags = normalizeTags([...(existing.tags || []), ...(preset.tags || [])]);
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

  PresetStore.SOUND_FIELDS = SOUND_FIELDS;
  PresetStore.USER_FIELDS  = USER_FIELDS;

  return PresetStore;
})();
