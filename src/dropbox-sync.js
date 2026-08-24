/**
 * dropbox-sync.js — porta la libreria su Dropbox e la riprende.
 *
 * Serve a un problema preciso: `file://` e `https://` sono due origini con
 * due IndexedDB diversi, e la libreria non passa dall'una all'altra — né dal
 * computer al telefono. Metà del lavoro era già in `preset-store.js`, che
 * esporta un'istantanea e la reimporta fondendo per UUID; qui c'è solo il
 * trasporto.
 *
 * Due gesti espliciti, «manda» e «prendi», mai un sync silenzioso: una
 * fusione sbagliata che nessuno ha chiesto è esattamente il difetto che
 * questo progetto ha deciso di non avere.
 *
 * **Niente server.** Le API di Dropbox rispondono con i CORS aperti e
 * accettano OAuth PKCE, che è pensato apposta per le app che non possono
 * tenere un segreto — e una pagina statica non può. Quindi basta la pagina,
 * da GitHub Pages come da `file://`.
 *
 * **E niente redirect.** L'autorizzazione va a `response_type=code` senza
 * `redirect_uri`: Dropbox mostra un codice da incollare. Costa un
 * copia-incolla una volta sola, e in cambio funziona identico da `file://`,
 * da https e dal telefono, senza registrare nessun indirizzo di ritorno e
 * senza dover intercettare un ritorno dentro una pagina sola.
 *
 * Il token di accesso dura quattro ore: si chiede `token_access_type=offline`
 * e si tiene il refresh token, che non scade, così l'autorizzazione si fa una
 * volta e basta.
 *
 * Classic script come il resto del progetto: niente ES module, niente build.
 */
window.DropboxSync = (function () {
  'use strict';

  /** In un'app «scoped» questo percorso sta dentro Apps/<nome>/, non nella
   *  radice di Dropbox: l'app vede solo la sua cartella e nient'altro. */
  const PERCORSO = '/spark-libreria.json';

  const AUTORIZZA = 'https://www.dropbox.com/oauth2/authorize';
  const TOKEN     = 'https://api.dropboxapi.com/oauth2/token';
  const RPC       = 'https://api.dropboxapi.com/2/';
  const CONTENUTO = 'https://content.dropboxapi.com/2/';

  /** Il token si rinnova un minuto prima di scadere, non allo scadere. */
  const MARGINE_MS = 60 * 1000;

  /* ------------------------------------------------------------------ */

  const base64url = bytes => btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  /** Il segreto di questa autorizzazione: casuale, e non esce mai di qui. */
  function nuovoVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64url(bytes);
  }

  /**
   * La sfida che accompagna la richiesta: l'hash del verifier, non il
   * verifier. È tutto il senso di PKCE — chi intercetta il codice non può
   * spenderlo senza il segreto, che non ha mai viaggiato.
   */
  async function sfida(verifier) {
    const digest = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(verifier));
    return base64url(new Uint8Array(digest));
  }

  function urlAutorizza(appKey, challenge) {
    const q = new URLSearchParams({
      client_id: appKey,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      token_access_type: 'offline',     // vogliamo anche il refresh token
    });
    return AUTORIZZA + '?' + q.toString();
  }

  /**
   * L'argomento di una chiamata «content» viaggia in un'intestazione HTTP, e
   * un'intestazione ammette solo ASCII: un accento nel nome di un file
   * farebbe fallire la richiesta con un errore che non parla di accenti.
   * Quindi tutto quello che sta sopra il 127 esce come \uXXXX, che dentro un
   * JSON vuol dire lo stesso carattere.
   */
  function arg(oggetto) {
    const testo = JSON.stringify(oggetto);
    let fuori = '';
    for (let i = 0; i < testo.length; i++) {
      const n = testo.charCodeAt(i);
      fuori += n < 128 ? testo[i] : '\\u' + n.toString(16).padStart(4, '0');
    }
    return fuori;
  }

  /**
   * Dropbox descrive i suoi errori in JSON, ma il testo che ci mette dentro è
   * per chi scrive il programma. Qui si traduce solo quello che l'utente può
   * davvero incontrare; per il resto vale il testo grezzo, che è comunque
   * meglio di «errore».
   */
  function messaggioErrore(stato, corpo) {
    const testo = typeof corpo === 'string' ? corpo : JSON.stringify(corpo || {});
    if (/path\/not_found/.test(testo)) {
      return 'su Dropbox non c\'è ancora nessuna libreria: mandala su tu per primo';
    }
    if (stato === 401 || /expired_access_token|invalid_access_token/.test(testo)) {
      return 'l\'autorizzazione a Dropbox non vale più: rifalla';
    }
    if (/insufficient_space/.test(testo)) return 'lo spazio su Dropbox è finito';
    if (stato === 429) return 'Dropbox chiede di aspettare un momento e riprovare';
    if (stato >= 500)  return 'Dropbox non risponde bene: riprova fra poco';
    return 'Dropbox ha rifiutato (' + stato + '): ' + testo.slice(0, 200);
  }

  /* ------------------------------------------------------------------ */

  /**
   * Il collegamento a Dropbox. Tiene il refresh token — che è la cosa da
   * conservare — e si rifà da sé il token di accesso quando scade.
   *
   * `opzioni.salvaRefresh` viene chiamata quando il refresh token cambia: è
   * il modo di non sapere niente di IndexedDB da qui dentro.
   * `opzioni.fetch` esiste per i test, che non hanno una rete.
   */
  function Client(opzioni) {
    const o = opzioni || {};
    this.appKey       = o.appKey || '';
    this.refresh      = o.refreshToken || null;
    this.salvaRefresh = o.salvaRefresh || (() => {});
    this.fetch        = o.fetch || ((...a) => window.fetch(...a));
    this.token        = null;
    this.scadeA       = 0;
  }

  Client.prototype = {

    autorizzato() { return Boolean(this.appKey && this.refresh); },

    /** Il primo passo: l'indirizzo da aprire e il verifier da tenersi. */
    async iniziaAutorizzazione() {
      if (!this.appKey) throw new Error('manca la chiave dell\'app Dropbox');
      const verifier = nuovoVerifier();
      return { verifier, url: urlAutorizza(this.appKey, await sfida(verifier)) };
    },

    /** Il secondo: il codice incollato dall'utente diventa un refresh token. */
    async completaAutorizzazione(verifier, codice) {
      const risposta = await this._token({
        code: String(codice || '').trim(),
        grant_type: 'authorization_code',
        code_verifier: verifier,
        client_id: this.appKey,
      });
      if (!risposta.refresh_token) {
        // Senza refresh token l'autorizzazione varrebbe quattro ore e poi
        // andrebbe rifatta: meglio dirlo subito che scoprirlo a un concerto.
        throw new Error('Dropbox non ha dato un refresh token: rifai l\'autorizzazione');
      }
      this.refresh = risposta.refresh_token;
      await this.salvaRefresh(this.refresh);
      return this.refresh;
    },

    /** Dimentica l'autorizzazione, senza toccare niente su Dropbox. */
    async scollega() {
      this.refresh = null;
      this.token   = null;
      this.scadeA  = 0;
      await this.salvaRefresh(null);
    },

    /** Manda su l'istantanea della libreria. Sovrascrive quella di prima. */
    async carica(testo) {
      const risposta = await this._chiama(CONTENUTO + 'files/upload', {
        headers: {
          'Dropbox-API-Arg': arg({ path: PERCORSO, mode: 'overwrite', mute: true }),
          'Content-Type': 'application/octet-stream',
        },
        body: new Blob([testo], { type: 'application/octet-stream' }),
      });
      return risposta.json();
    },

    /** Riprende l'istantanea. Torna il testo, che sta al chiamante fondere. */
    async scarica() {
      const risposta = await this._chiama(CONTENUTO + 'files/download', {
        headers: { 'Dropbox-API-Arg': arg({ path: PERCORSO }) },
      });
      return risposta.text();
    },

    /**
     * Quando è stata scritta lassù, e quanto è grande. Serve a mettere una
     * data accanto al pulsante: prendere qualcosa senza sapere se è più
     * vecchio di quello che si ha è il modo migliore di pentirsene.
     * Se lassù non c'è ancora niente torna `null`, che non è un errore.
     */
    async info() {
      try {
        const risposta = await this._chiama(RPC + 'files/get_metadata', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: PERCORSO }),
        });
        const dati = await risposta.json();
        return { quando: dati.server_modified, byte: dati.size };
      } catch (err) {
        if (/nessuna libreria/.test(err.message)) return null;
        throw err;
      }
    },

    /* ---------------------------------------------------------------- */

    async _token(campi) {
      const risposta = await this.fetch(TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(campi).toString(),
      });
      const testo = await risposta.text();
      if (!risposta.ok) throw new Error(messaggioErrore(risposta.status, testo));
      return JSON.parse(testo);
    },

    /** Un token di accesso valido, rinnovandolo se serve. */
    async _accesso() {
      if (this.token && Date.now() < this.scadeA - MARGINE_MS) return this.token;
      if (!this.refresh) throw new Error('Dropbox non è ancora collegato');
      const risposta = await this._token({
        grant_type: 'refresh_token',
        refresh_token: this.refresh,
        client_id: this.appKey,
      });
      this.token  = risposta.access_token;
      this.scadeA = Date.now() + (risposta.expires_in || 14400) * 1000;
      return this.token;
    },

    async _chiama(url, opzioni) {
      const token = await this._accesso();
      const headers = Object.assign({ Authorization: 'Bearer ' + token },
                                    opzioni.headers || {});
      const risposta = await this.fetch(url, {
        method: 'POST', headers, body: opzioni.body,
      });
      if (!risposta.ok) {
        throw new Error(messaggioErrore(risposta.status, await risposta.text()));
      }
      return risposta;
    },
  };

  return {
    Client, PERCORSO,
    nuovoVerifier, sfida, urlAutorizza, arg, messaggioErrore,
  };
})();
