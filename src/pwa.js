/**
 * Registrazione del service worker e le due bandierine che ne derivano:
 * «installa l'app» e «c'è una versione nuova».
 *
 * Sta fuori dalle pagine perché serve identica a index.html e live.html, e
 * come tutto il resto è uno classic script che si appende a window.
 *
 * Da file:// non fa niente: i service worker vogliono un'origine sicura, e
 * lo sviluppo qui gira ancora aprendo i file direttamente. Non è un
 * problema — è anzi comodo, perché nessuna cache si mette in mezzo mentre
 * si modifica il codice.
 */
'use strict';

(function () {
  const SUPPORTATO = 'serviceWorker' in navigator && location.protocol !== 'file:';

  /** Striscia in basso: un messaggio, un pulsante, e via. */
  function striscia(testo, etichetta, azione) {
    const barra = document.createElement('div');
    barra.className = 'pwa-barra';
    barra.innerHTML =
      '<span></span>' +
      '<button type="button" class="pwa-si"></button>' +
      '<button type="button" class="pwa-no" title="chiudi">✕</button>';
    barra.querySelector('span').textContent = testo;
    barra.querySelector('.pwa-si').textContent = etichetta;
    barra.querySelector('.pwa-si').addEventListener('click', () => {
      barra.remove();
      azione();
    });
    barra.querySelector('.pwa-no').addEventListener('click', () => barra.remove());

    if (!document.getElementById('pwa-stile')) {
      const stile = document.createElement('style');
      stile.id = 'pwa-stile';
      stile.textContent = `
        .pwa-barra { position:fixed; left:12px; right:12px; bottom:12px; z-index:100;
          display:flex; align-items:center; gap:10px; max-width:520px; margin:0 auto;
          background:#1e2126; border:1px solid #34383f; border-radius:12px;
          padding:10px 12px; font-size:0.85rem; color:#e8e8ea;
          box-shadow:0 6px 24px rgba(0,0,0,0.5); }
        .pwa-barra span { flex:1; }
        .pwa-barra button { font:inherit; font-size:0.82rem; font-weight:600; border:none;
          cursor:pointer; border-radius:8px; padding:7px 12px; }
        .pwa-barra .pwa-si { background:#e02c2c; color:#fff; }
        .pwa-barra .pwa-no { background:none; color:#8a8f98; padding:7px 4px; }
      `;
      document.head.appendChild(stile);
    }
    document.body.appendChild(barra);
    return barra;
  }

  /* ---- installazione ------------------------------------------------- */

  // Chrome offre l'installazione solo se la si chiede a partire da un gesto
  // dell'utente, quindi l'evento va conservato e speso più tardi.
  let invito = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    invito = event;
    if (localStorage.getItem('pwa-installa-no') === '1') return;
    const barra = striscia('Installa l\'app sul telefono, per averla a portata dall\'ampli.',
      'Installa', async () => {
        invito.prompt();
        await invito.userChoice;
        invito = null;
      });
    barra.querySelector('.pwa-no')
      .addEventListener('click', () => localStorage.setItem('pwa-installa-no', '1'));
  });

  window.addEventListener('appinstalled', () => {
    invito = null;
    localStorage.removeItem('pwa-installa-no');
  });

  /* ---- registrazione e aggiornamenti --------------------------------- */

  if (!SUPPORTATO) return;

  const eraControllata = !!navigator.serviceWorker.controller;

  window.addEventListener('load', async () => {
    let registrazione;
    try {
      registrazione = await navigator.serviceWorker.register('sw.js');
    } catch (err) {
      console.warn('service worker non registrato:', err.message);
      return;
    }

    // Un worker già in attesa significa che l'aggiornamento è pronto da
    // prima: capita quando si chiude la pagina senza accettarlo.
    if (registrazione.waiting && navigator.serviceWorker.controller) proponiAggiornamento(registrazione.waiting);

    registrazione.addEventListener('updatefound', () => {
      const nuovo = registrazione.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', () => {
        // Senza controller è la prima installazione: non c'è niente da
        // aggiornare, l'app è semplicemente diventata disponibile offline.
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) {
          proponiAggiornamento(nuovo);
        }
      });
    });

    // Alla primissima visita il worker prende il controllo con clients.claim()
    // e fa scattare controllerchange senza che ci sia niente da aggiornare:
    // ricaricare lì sarebbe un lampo gratuito in faccia all'utente.
    let ricaricando = !eraControllata;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (ricaricando) return;
      ricaricando = true;
      location.reload();
    });
  });

  function proponiAggiornamento(worker) {
    striscia('C\'è una versione nuova dell\'app.', 'Aggiorna',
      () => worker.postMessage('aggiorna'));
  }
})();
