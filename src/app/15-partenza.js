// Sparkling Tones — 15-partenza.js: La partenza.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ==================================================================== */

(async function start() {
  // Prima di tutto il resto: non dipende dal database, e se il database
  // tardasse o non partisse questo si deve vedere lo stesso.
  // Un pulsante spento e basta è la cosa peggiore: sembra un'app rotta.
  // Su iPhone e iPad Safari e Chrome il Bluetooth per le pagine non ce l'hanno
  // (su iOS ogni browser usa il motore di Apple). Bluefy, un browser gratuito
  // fatto apposta, sì: provato dall'utente su iPad il 20 ottobre 2026, va tutto.
  // Quindi lì si consiglia Bluefy, e si dice cosa funziona lo stesso.
  if (!navigator.bluetooth) {
    $('status').disabled = true;
    $('status').title = tr('questo browser non può parlare col Bluetooth');
    $('btnRead').title = $('status').title;
    const avviso = $('senzaBluetooth');
    avviso.hidden = false;
    avviso.innerHTML = mela()
      ? tr('Su iPhone e iPad <strong>Safari e Chrome non possono usare il Bluetooth</strong>, ' +
        'quindi l\'amplificatore da qui non si connette. Si connette invece da ' +
        '<strong>Bluefy</strong>, un browser gratuito dell\'App Store: aprila lì, a questo ' +
        'stesso indirizzo. Qui la libreria funziona lo stesso: sfogliare, cercare, ' +
        'organizzare, importare ed esportare.')
      : tr('Questo browser non ha il Bluetooth per le pagine web, quindi l\'amplificatore da ' +
        'qui non si connette. La libreria funziona tutta lo stesso. Con Chrome, Edge o ' +
        'Opera aggiornati, su Android o su computer, si connette.');
    logLine(tr('Web Bluetooth non disponibile: la libreria resta consultabile, ' +
            'ma non si può leggere dall\'ampli.'));

  }

  // «Genera con l'IA» è stata tolta il 19 ottobre 2026: le chiavi API e le
  // scelte che aveva salvato in questo browser non servono più, e una chiave
  // non deve restare dove nessuno la vede.
  try {
    ['openai-chiave', 'openai-modello', 'anthropic-chiave', 'anthropic-modello',
     'ia-servizio', 'ia-sbloccata'].forEach(k => localStorage.removeItem(k));
  } catch (e) { /* senza localStorage non c'è niente da togliere */ }

  await store.open();
  await preparaDropbox();
  await applicaVista();
})();
