// Sparkling Tones — 02-stato.js: Lo stato in memoria.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Stato in memoria
   ==================================================================== */

let tutti      = [];      // tutti i record, nell'ordine dell'utente
let suAmpli    = [];      // un posto per slot dell'ampli: il record che ci sta, o null
// Quale ampli: lo Spark 2 ha otto slot in due banchi, lo Spark NEO quattro
// (CH1–CH4). È l'ultimo collegato, anche senza radio: gli slot in libreria
// sono i suoi, perché alla connessione si rileggono tutti.
let modelloAmpli = Spark.profiloAmpli(null);
let categorie  = [];      // {nome, quanti}
let banchi     = [];      // banchi salvati, quelli inventati dall'utente
let nomiParam  = {};      // nomi dati dall'utente ai parametri, per modello
let famiglie   = [];      // {id, nome, colore}: clean, drive, acoustic, bass

// Niente preferiti: tolti su richiesta dell'utente. Il campo `favorite` resta
// nei record e nello store — cancellarlo butterebbe via delle scelte già
// fatte — ma non si vede e non filtra più niente.
const vista = { cerca: '', categoria: '', aperto: null, ordine: 'nome' };
/** La tendina dell'ordinamento: sta nell'intestazione e vive quanto la pagina. */
let tendinaOrdine = null;
const live  = { banco: 'ampli', modifica: false, attivo: null, occupato: false,
                sposta: null };   // il posto che si sta spostando, in modifica

/** Il banco fisso non è salvato da nessuna parte: è quello che c'è sull'ampli. */
const BANCO_AMPLI = 'ampli';

async function ricarica() {
  tutti     = await store.all();
  modelloAmpli = Spark.profiloAmpli(
    (spark.connected && spark.state.name) || await store.getSetting('ultimoAmpli', null));
  suAmpli   = (await store.hardware()).slice(0, modelloAmpli.slot);
  categorie = await store.allCategories();
  banchi    = await store.getBanks();
  nomiParam = await store.getParamNames();
  famiglie  = await store.getFamiglie();
  vista.ordine = await store.getSetting('ordineLibreria', 'nome');
  if (live.banco !== BANCO_AMPLI && !banchi.some(b => b.id === live.banco)) {
    live.banco = BANCO_AMPLI;
  }
}

/**
 * I modelli che questo ampli ha davvero, ricavati dai preset in libreria.
 *
 * Serve perché l'elenco di `MODELLI` viene dal catalogo di Soundshed e **non è
 * verificato sullo Spark 2**: un nome che l'ampli non conosce non è solo
 * inutile, è dannoso — `0x0106` gli chiede di ricostruire un blocco DSP che non
 * esiste, e l'utente ha visto l'ampli andare in palla con `TrebleBooster`, che
 * su questo ampli non c'è (c'è solo `Booster`).
 *
 * Non possiamo chiedere all'ampli cosa conosce. Ma se un modello compare in un
 * preset che dall'ampli è uscito, allora quel modello c'è di sicuro: è l'unica
 * prova che abbiamo, e vale la pena mostrarla.
 */
function modelliVisti() {
  const visti = new Set();
  for (const record of tutti) {
    for (const e of (record.effects || [])) if (e.name) visti.add(e.name);
  }
  return visti;
}

/**
 * Un blocco vero con quel modello dentro, pescato dalla libreria.
 *
 * Serve a cambiare modello **senza ampli**: da fermi non sappiamo quante
 * manopole abbia un modello, e inventarne il numero vuol dire costruire il
 * preset che pianta l'ampli. Ma se quel modello sta in un preset **uscito
 * dall'ampli**, allora esiste, e quel blocco dice esattamente quanti
 * parametri ha e con che valori l'ampli li ha mandati: si copia quello,
 * invece di indovinare. È la stessa regola con cui si costruisce un preset
 * nuovo — lo scheletro si prende da uno vero, mai dal catalogo.
 *
 * Torna `{ params, da }` — `da` è il nome del preset da cui viene, che serve
 * a dirlo nel log: chi gira le manopole ha diritto di sapere da dove
 * arrivano i valori che si ritrova.
 */
function campioneModello(nome) {
  for (const record of tutti) {
    for (const e of (record.effects || [])) {
      if (e.name === nome && (e.params || []).length) {
        return { params: e.params.map(p => ({ index: p.index, value: p.value })),
                 da: record.name || tr('(senza nome)') };
      }
    }
  }
  return null;
}

/**
 * L'ordine della libreria. È una scelta dell'utente e va ricordata: cambiarla
 * a ogni ricaricamento sarebbe un fastidio quotidiano, quindi sta fra le
 * preferenze.
 *
 * A parità — stessa data, stessa famiglia, nessuna famiglia — si ricade
 * **sempre sul nome**: due preset che il criterio non distingue devono almeno
 * restare in un ordine stabile, altrimenti l'elenco si rimescola sotto le dita
 * a ogni ridisegno.
 */
function ordinaLibreria(lista) {
  const perNome = (a, b) =>
    (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' });
  const copia = lista.slice();

  if (vista.ordine === 'aggiunto') {
    return copia.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || perNome(a, b));
  }
  if (vista.ordine === 'modificato') {
    return copia.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || perNome(a, b));
  }
  if (vista.ordine === 'famiglia') {
    // Chi non ha famiglia va in fondo, non in cima: è l'assenza di una scelta,
    // non una categoria a sé che meriti il primo posto.
    const rango = r => {
      const i = famiglie.findIndex(f => f.id === r.famiglia);
      return i === -1 ? famiglie.length : i;
    };
    return copia.sort((a, b) => rango(a) - rango(b) || perNome(a, b));
  }
  return copia.sort(perNome);
}

const perId = id => tutti.find(r => r.id === id) || null;

/**
 * Gli slot dell'ampli occupati da un preset: sono una lista, non un numero.
 * Solo quelli che l'ampli di adesso ha: uno slot 6 sul NEO non esiste, e un
 * `0x0138` mandato lì sarebbe un comando a vuoto.
 */
const slotsDi   = record => ((record && record.slots) || []).filter(s => s < modelloAmpli.slot);
const residente = record => slotsDi(record).length > 0;
/** Come si chiama uno slot su quest'ampli: A1…B4 sullo Spark 2, CH1…CH4 sul NEO. */
const postoAmpli = slot => Spark.slotLabel(slot, modelloAmpli);
const etichetteSlot = record =>
  slotsDi(record).map(s => postoAmpli(s).label).join(' ');
/** Il titolo di uno slot: sullo Spark 2 col LED del pannello, sul NEO non c'è. */
const titoloSlot = slot => {
  const posizione = postoAmpli(slot);
  return posizione.color
    ? tr`slot ${slot} — LED ${nomeColore(posizione.color)} numero ${posizione.position}`
    : `slot ${slot} — ${posizione.label}`;
};
/** Il colore di un LED dell'ampli, da mostrare: `Spark.slotLabel` lo dà in italiano. */
const nomeColore = colore => colore === 'rosso' ? tr('rosso') : tr('verde');

