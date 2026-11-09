// Sparkling Tones — pc/02-stato.js: l'ampli, la libreria e il preset che si sta regolando.
'use strict';

const POSTI = ['GATE', 'COMP', 'DRIVE', 'AMP', 'MOD', 'DELAY', 'REVERB'];

/* ---------------------------------------------------------------- l'ampli
   `let`: con `pc.html#finto` (prove senza ampli) `10-partenza.js` lo sostituisce con l'ampli
   finto di `test/ampli-finto.js`, che ha la stessa interfaccia. */
const gestoriAmpli = {
  onStatus: (s, etichetta) => segnaCollegamento(s, etichetta),
  onMessage: msg => riceviAccordatore(msg),
  // Ogni scrittura (`TX …`) resta nella console: girando una manopola sono decine al secondo.
  onLog: msg => { if (msg.startsWith('TX ')) console.debug(msg); else registro.push(msg); },
};
let spark = new SparkTransport(gestoriAmpli);

/* ---------------------------------------------------------------- la libreria */
let tutti = [];          // tutti i record
let suAmpli = [];        // un posto per slot: il record che ci sta, o null
let nomiParam = {};      // i nomi dati dall'utente ai parametri, per modello
let profilo = Spark.profiloAmpli(null);   // Spark 2: otto slot in due banchi; NEO: quattro
let famiglie = [];       // {id, nome, colore}: clean, drive, acoustic, bass
let categorie = [];      // {nome, quanti}
let banchi = [];         // i banchi dell'utente: {id, nome, posti: otto id o null}

async function ricarica() {
  tutti = await store.all();
  profilo = Spark.profiloAmpli((spark.connected && spark.state.name) || await store.getSetting('ultimoAmpli', null));
  suAmpli = (await store.hardware()).slice(0, profilo.slot);
  nomiParam = await store.getParamNames();
  famiglie = await store.getFamiglie();
  categorie = await store.allCategories();
  banchi = await store.getBanks();
  vista.ordine = await store.getSetting('ordineLibreria', vista.ordine);
}

/** Come si guarda la libreria: ricerca, filtri e ordine (l'ordine si ricorda, come nell'app). */
const vista = { cerca: '', categoria: '', famiglia: '', ordine: 'nome' };

const perId = id => tutti.find(r => r.id === id) || null;
const slotsDi = record => ((record && record.slots) || []).filter(s => s < profilo.slot);
const residente = record => slotsDi(record).length > 0;
const etichetteSlot = record => slotsDi(record).map(s => nomeSlot(s)).join(' ');
const famigliaDi = record => (record && record.famiglia && famiglie.find(f => f.id === record.famiglia)) || null;
/** Senza il pacchetto Hendrix i preset che lo vogliono non si vedono (come nell'app). */
const visibileSenzaHendrix = record => haHendrix() || !SparkEffetti.presetConHendrix(record && record.effects);

/** L'etichetta colorata di uno slot: rossa per il banco A, verde per il B, grigia sul NEO. */
function etichettaAmpli(slot) {
  const info = Spark.slotLabel(slot, profilo);
  const el = document.createElement('span');
  el.className = 'etichetta-ampli' + (info.bank === 'A' ? ' a' : info.bank === 'B' ? ' b' : '');
  el.textContent = info.label;
  return el;
}

/* ---------------------------------------------------------------- il preset sul palco
   `ora` è il preset che si sta regolando, o null. Con l'ampli collegato la catena viene
   **dall'ampli** (riletta), come nell'editor dell'app: la verità è lì. Senza ampli è la
   copia in libreria (`offline`), e la modalità non cambia finché non si apre un altro preset.

   { record   il record in libreria, o null se l'ampli suona qualcosa che lì non c'è
     slot     lo slot dell'ampli da cui viene, o null (preset software)
     nome, effetti, bpm
     base     { effetti, bpm } com'era salvato: serve all'A/B e a dire «modificato»
     toccato  c'è del lavoro non salvato
     offline  senza ampli: non parte niente sulla radio
     scelto   la posizione della catena che sta sul palco } */
let ora = null;

const copiaEffetti = effetti => (effetti || []).map(e => ({
  name: e.name,
  enabled: e.enabled,
  params: (e.params || []).map(p => ({ index: p.index, value: p.value })),
}));

const istantanea = () => ({ effetti: copiaEffetti(ora.effetti), bpm: ora.bpm });

const TEMPO_PREDEFINITO = 120;
function bpmDi(preset) {
  const v = Math.round((preset && preset.bpm) || 0);
  return (v >= Spark.BPM_MIN && v <= Spark.BPM_MAX) ? v : TEMPO_PREDEFINITO;
}

/* ---------------------------------------------------------------- nomi e immagini dei blocchi */

/** Le manopole vere di un blocco: senza il parametro in più che rispecchia l'acceso/spento. */
const manopoleVere = effetto => effetto.params.filter(p => !SparkEffetti.extra(effetto.name, p.index));

/** Il parametro che sceglie fra posizioni con un nome (il modello del riverbero), o null. */
const paramScelta = effetto =>
  manopoleVere(effetto).find(p => SparkEffetti.posizioni(effetto.name, p.index) > 0) || null;

/** I riverberi: il modello è il nome della posizione scelta («Plate Rich»). */
const eRiverbero = effetto => effetto && effetto.name === 'bias.reverb';
function modelloRiverbero(effetto) {
  const p = paramScelta(effetto);
  if (!p) return null;
  const nomi = SparkEffetti.nomiPosizioni(effetto.name, p.index);
  const dove = SparkEffetti.posizioneDi(p.value, SparkEffetti.posizioni(effetto.name, p.index));
  return nomi && dove >= 0 ? nomi[dove] : null;
}

/** Il nome di un modello come lo vede chi suona (il wah senza pacchetto Hendrix è «Auto Wah»). */
const nomeModello = id => id === 'JH.Vox846' && !haHendrix() ? tr('Auto Wah') : SparkEffetti.nome(id);

/** Il nome di un blocco: per i riverberi quello del modello scelto. */
const nomeBlocco = effetto => (eRiverbero(effetto) && modelloRiverbero(effetto)) || nomeModello(effetto.name);

/** L'immagine (del neon, per ora) di un blocco, o null. */
function immagineBlocco(effetto) {
  const id = effetto.name === 'JH.Vox846' && !haHendrix() ? 'AutoWah' : effetto.name;
  const info = SparkImmagini.di(id, eRiverbero(effetto) ? modelloRiverbero(effetto) : null);
  return info ? info.src : null;
}

/** Il bollo «JH» accanto a un modello Hendrix (non nella vista live né sul pedale: qui sì). */
const bolloJH = id => (haHendrix() && SparkEffetti.eHendrix(id) && !(id === 'JH.Vox846' && !haHendrix()))
  ? ' <span class="jh">JH</span>' : '';

/** Il nome di una manopola: quello dato dall'utente, poi la tabella, poi il numero. */
function nomeManopola(effetto, param) {
  const dato = (nomiParam[effetto.name] || {})[param.index];
  return dato || SparkEffetti.manopola(effetto.name, param.index, manopoleVere(effetto).length)
    || tr('Parametro {0}', param.index + 1);
}

/** L'etichetta di uno slot: A1…B4, o CH1…CH4 sul NEO. */
const nomeSlot = n => Spark.slotLabel(n, profilo).label;

/**
 * Un blocco vero con quel modello, pescato dalla libreria: per cambiare modello **senza
 * ampli** si copia un blocco che l'ampli ha prodotto, non si inventa (`campioneModello`
 * dell'app, stessa regola).
 */
function campioneModello(nome) {
  for (const record of tutti) {
    for (const e of (record.effects || [])) {
      if (e.name === nome && (e.params || []).length) {
        return { params: e.params.map(p => ({ index: p.index, value: p.value })), da: record.name };
      }
    }
  }
  return null;
}
