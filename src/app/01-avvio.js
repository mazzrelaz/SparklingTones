// Sparkling Tones — 01-avvio.js: L'inizio: la lingua, $, la libreria e il trasporto Bluetooth.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

// Prima di tutto il resto: il JS che segue trova l'HTML già nella lingua scelta.
Lingua.traduciPagina();

/*
 * Due sezioni, Preset e Live, nello stesso documento.
 *
 * Stare nello stesso documento non è una scelta di comodità: la connessione
 * BLE vive nella pagina, quindi navigare su un altro file la butterebbe via e
 * all'ampli toccherebbe riconnettersi a ogni passaggio. Cambiando solo una
 * classe sul body, `spark` resta lo stesso oggetto.
 */

const $ = id => document.getElementById(id);

const store = new PresetStore();
const spark = new SparkTransport({
  onStatus: (state, label) => {
    const el = $('status');
    const acceso = state === 'connected';
    el.className = 'stato-conn ' + (acceso ? 'on' : state === 'connecting' ? 'wait' : 'off');
    // Da connesso il pulsante dice «CONNESSO» e non il nome dell'ampli: il nome
    // è lungo, cambia la larghezza della barra, e a chi suona non dice niente
    // che non sappia già. Resta nel titolo, per chi ha due amplificatori.
    el.textContent = acceso ? tr('CONNESSO') : state === 'connecting' ? label : tr('CONNETTI');
    el.title = acceso ? (spark.state.name || tr('connesso'))
                      : tr('collega l\'amplificatore via Bluetooth');
    el.disabled = acceso || state === 'connecting';
    // «Leggi dall'ampli» e «Importa preset attuale» **non si spengono qui**:
    // stanno nella tendina «⋯», e un pulsante spento non riceve il clic —
    // quindi la tendina resterebbe aperta senza che succeda niente, che è
    // esattamente come si vede un'app rotta. Da disconnessi rispondono, e
    // dicono che manca la connessione.
    disegnaPreset();
    disegnaLive();
  },
  /**
   * Il trasporto racconta anche ogni singola scrittura (`TX 0x0104 seq=…`).
   * Girando una manopola sono decine di righe al secondo, che coprono i
   * messaggi veri e non dicono niente a chi sta suonando. Restano nella
   * console del browser, dove servono a me e non danno fastidio a nessuno.
   */
  onLog: msg => {
    if (msg.startsWith('TX ')) { console.debug(msg); return; }
    logLine(msg);
  },
});

