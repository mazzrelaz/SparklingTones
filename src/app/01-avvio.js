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
/** Il nome dell'ampli collegato, come lo annuncia lui («Spark 2», «Spark NEO»). */
const nomeAmpliOra = () => (spark.connected && spark.state.name) || tr('collegato');

const spark = new SparkTransport({
  onStatus: (state, label) => {
    const el = $('status');
    const acceso = state === 'connected';
    el.className = 'stato-conn ' + (acceso ? 'on' : state === 'connecting' ? 'wait' : 'off');
    // Da connesso il bollino porta il nome dell'ampli (14 ottobre 2026): la
    // barra in alto adesso ha posto, e con due ampli dice quale. Il nome vero
    // arriva con `identify()`, poco dopo: fino ad allora dice «collegato».
    el.textContent = acceso ? nomeAmpliOra() : state === 'connecting' ? label : tr('Collega');
    el.title = acceso ? tr('tocca per rileggere gli slot, importare il suono o scollegarti')
                      : tr('collega l\'amplificatore via Bluetooth');
    $('nomeAmpli').textContent = nomeAmpliOra();
    // Da connesso il bollino si tocca: apre il pannellino dell'ampli. Se l'ampli
    // cade col pannellino aperto, il pannellino se ne va con lui.
    el.disabled = state === 'connecting';
    if (!acceso) {
      $('foglioAmpli').hidden = true;
      el.setAttribute('aria-expanded', 'false');
    }
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

