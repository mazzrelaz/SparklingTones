/**
 * Sparkling Tones — sync-auto.js: la libreria uguale su tutti gli apparecchi, da sola.
 *
 * Chiesto dall'utente il 9 novembre 2026, al posto di «Manda su» e «Prendi»:
 * «faccio dei cambiamenti dal telefono e in automatico sul pc mi ritrovo la
 * stessa situazione». Il trasporto resta `dropbox-sync.js`, la fusione è
 * `store.fondiSincro` (per ogni preset vince la modifica più recente). Qui c'è
 * solo il **quando**:
 *
 * - all'apertura, quando l'app torna in primo piano o la rete torna, e ogni
 *   minuto mentre è aperta: si guarda la versione del file lassù (una chiamata
 *   piccola) e lo si scarica solo se è cambiato;
 * - dopo ogni cambiamento della libreria, qualche secondo dopo l'ultimo: si
 *   riprende lassù, si fonde, e si manda su il risultato;
 * - si scrive solo se lassù c'è ancora la versione letta. Se l'altro
 *   apparecchio ha scritto in mezzo, si ricomincia dal giro di lettura: nessuno
 *   cancella il lavoro dell'altro;
 * - senza rete si lavora lo stesso: il cambiamento resta segnato
 *   (`sincroPendente`, anche a app chiusa) e parte quando la rete torna;
 * - **se una fusione cancellerebbe più di SOGLIA preset si chiede prima**: è
 *   il guaio dello stesso giorno (una libreria svuotata da una parte).
 *   Rispondere di no li tiene, e li fa tornare anche dall'altra parte.
 *
 * Il backup di sicurezza (`PERCORSO_SICUREZZA`) è un altro file, che qui non
 * si tocca mai: lo scrive e lo rilegge solo l'utente.
 */
window.SyncAuto = (function () {
  'use strict';
  const tr = window.tr || ((s, ...v) => Array.isArray(s)
    ? s.reduce((a, p, i) => a + v[i - 1] + p) : s.replace(/\{(\d+)\}/g, (m, i) => v[i]));

  /** Oltre quanti preset cancellati in un colpo solo si chiede. */
  const SOGLIA = 5;
  /** Quanto si aspetta dopo l'ultimo cambiamento prima di mandare su. */
  const PAUSA_MS = 4000;
  /** Ogni quanto si guarda lassù mentre l'app è aperta e in primo piano. */
  const OGNI_MS = 60 * 1000;
  /** Giri di lettura-fusione-scrittura prima di arrendersi ai conflitti. */
  const GIRI = 4;

  /**
   * Due istantanee uguali per la libreria: senza la data dell'esportazione e
   * senza gli id, che sono di ogni apparecchio. Se dopo la fusione quella di
   * qui è uguale a quella lassù, non si manda niente.
   */
  function canonica(backup) {
    const presets = (backup.presets || []).map(p => {
      const c = Object.assign({}, p);
      delete c.id;
      delete c.slots;
      return c;
    }).sort((a, b) => String(a.uuid).localeCompare(String(b.uuid)));
    return JSON.stringify(Object.assign({}, backup, { exportedAt: null, presets }));
  }

  const senzaRete = err => !navigator.onLine || err instanceof TypeError;

  /**
   * opzioni: store, dropbox (un DropboxSync.Client), e tre ascoltatori:
   * - `chiediCancellazioni(preset)` → true per cancellarli, false per tenerli;
   * - `quandoArriva(esito)` dopo una fusione che ha cambiato qualcosa qui;
   * - `quandoStato({ stato, quando, errore })`, stato fra 'in corso', 'ok',
   *   'senza rete', 'errore'.
   */
  function Motore(opzioni) {
    const o = opzioni || {};
    this.store   = o.store;
    this.dropbox = o.dropbox;
    this.chiediCancellazioni = o.chiediCancellazioni || (async () => false);
    this.quandoArriva = o.quandoArriva || (() => {});
    this.quandoStato  = o.quandoStato  || (() => {});
    this.pausaMs = o.pausaMs !== undefined ? o.pausaMs : PAUSA_MS;
    this.ogniMs  = o.ogniMs  !== undefined ? o.ogniMs  : OGNI_MS;
    this.acceso = false;
    this.inCorso = null;          // la promessa del giro in corso
    this.ancora = false;          // un altro giro richiesto mentre questo girava
    this.pendente = false;        // c'è qualcosa di qui da mandare su
    this.ultimoRev = null;        // l'ultima versione lassù già fusa qui
    this.ultimo = { stato: 'in corso', quando: null, errore: null };
    this._timer = null;
    this._ogni = null;
    this._ascolta = {
      visibile: () => { if (document.visibilityState === 'visible') this.sincronizza(); },
      rete: () => this.sincronizza(),
    };
  }

  Motore.prototype = {

    async avvia() {
      if (this.acceso) return this.sincronizza();
      this.acceso = true;
      this.pendente  = await this.store.getSetting('sincroPendente', false);
      this.ultimoRev = await this.store.getSetting('sincroRev', null);
      this.store.onCambio = () => this._cambiato();
      document.addEventListener('visibilitychange', this._ascolta.visibile);
      window.addEventListener('online', this._ascolta.rete);
      // `setInterval` e non `requestAnimationFrame`: gira anche dove l'altro no.
      if (this.ogniMs) {
        this._ogni = setInterval(() => {
          if (document.visibilityState === 'visible') this.sincronizza();
        }, this.ogniMs);
      }
      return this.sincronizza();
    },

    ferma() {
      this.acceso = false;
      if (this.store.onCambio) this.store.onCambio = null;
      document.removeEventListener('visibilitychange', this._ascolta.visibile);
      window.removeEventListener('online', this._ascolta.rete);
      clearTimeout(this._timer);
      clearInterval(this._ogni);
      this._timer = this._ogni = null;
    },

    /** Un cambiamento qui: si segna subito, si manda dopo l'ultimo di una raffica. */
    _cambiato() {
      if (!this.pendente) {
        this.pendente = true;
        this.store.setSetting('sincroPendente', true).catch(() => {});
      }
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.sincronizza(), this.pausaMs);
    },

    _stato(stato, errore) {
      this.ultimo = { stato, quando: stato === 'ok' ? Date.now() : this.ultimo.quando, errore: errore || null };
      try { this.quandoStato(this.ultimo); } catch (err) { /* lo stato non ferma il sync */ }
    },

    /**
     * Un giro. Se ne è già in corso uno, se ne chiede un altro alla fine: un
     * cambiamento arrivato a metà giro non deve restare indietro.
     */
    sincronizza() {
      if (!this.acceso || !this.dropbox || !this.dropbox.autorizzato()) return Promise.resolve();
      if (this.inCorso) { this.ancora = true; return this.inCorso; }
      this.inCorso = this._giro().finally(() => {
        this.inCorso = null;
        if (this.ancora) { this.ancora = false; this.sincronizza(); }
      });
      return this.inCorso;
    },

    async _giro() {
      clearTimeout(this._timer);
      this._stato('in corso');
      try {
        for (let giro = 0; giro < GIRI; giro++) {
          const info = await this.dropbox.info();
          if (info && info.rev === this.ultimoRev && !this.pendente) break;   // niente di nuovo

          let remoto = null;
          if (info) {
            remoto = JSON.parse(await this.dropbox.scarica());
            const via = await this.store.daCancellareSincro(remoto);
            const tieni = via.length > SOGLIA && !(await this.chiediCancellazioni(via));
            const esito = await this.store.fondiSincro(remoto, { tieni });
            if (esito.arrivati || esito.cambiati || esito.cancellati || esito.impostazioni) {
              await this.quandoArriva(esito);
            }
            // Tenere quei preset li ha ritoccati qui: vanno mandati su.
            if (tieni) this.pendente = true;
          }

          // Da qui un cambiamento nuovo fa ripartire un altro giro.
          this.pendente = false;
          const locale = await this.store.exportAll();
          if (remoto && canonica(locale) === canonica(remoto)) {
            await this._fatto(info.rev);
            break;
          }
          try {
            const scritto = await this.dropbox.scriviSe(JSON.stringify(locale, null, 2), info ? info.rev : null);
            await this._fatto(scritto.rev);
            break;
          } catch (err) {
            this.pendente = true;
            if (err.conflitto && giro < GIRI - 1) continue;   // l'altro ha scritto in mezzo: si rilegge
            throw err;
          }
        }
        this._stato('ok');
      } catch (err) {
        this._stato(senzaRete(err) ? 'senza rete' : 'errore', err);
      }
    },

    async _fatto(rev) {
      this.ultimoRev = rev;
      await this.store.setSetting('sincroRev', rev);
      if (!this.pendente) await this.store.setSetting('sincroPendente', false);
    },
  };

  return { Motore, SOGLIA, canonica };
})();
