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
  // Su iPhone e iPad il Bluetooth dal browser non esiste — non è una scelta
  // di Safari, è che su iOS ogni browser è obbligato a usare il motore di
  // Apple, quindi anche Chrome lì non ce l'ha. Meglio dirlo, e dire cosa
  // funziona lo stesso.
  if (!navigator.bluetooth) {
    $('status').disabled = true;
    $('status').title = tr('questo browser non può parlare col Bluetooth');
    $('btnRead').title = $('status').title;
    const avviso = $('senzaBluetooth');
    avviso.hidden = false;
    avviso.innerHTML = mela()
      ? tr('Su iPhone e iPad <strong>nessun browser può usare il Bluetooth</strong>: su iOS ' +
        'anche Chrome e Firefox girano sul motore di Apple, che non lo prevede — quindi ' +
        'l\'amplificatore da qui non si connette. La libreria però funziona tutta: ' +
        'sfogliare, cercare, organizzare, importare ed esportare. Per suonare serve un ' +
        'telefono o un computer con Chrome, Edge o Opera.')
      : tr('Questo browser non ha il Bluetooth per le pagine web, quindi l\'amplificatore da ' +
        'qui non si connette. La libreria funziona tutta lo stesso. Con Chrome, Edge o ' +
        'Opera aggiornati, su Android o su computer, si connette.');
    logLine(tr('Web Bluetooth non disponibile: la libreria resta consultabile, ' +
            'ma non si può leggere dall\'ampli.'));

  }

  await store.open();
  await preparaDropbox();
  await applicaVista();
})();
