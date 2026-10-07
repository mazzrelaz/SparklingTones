// Sparkling Tones — 09-editor.js: L'editor della catena effetti.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Editor della catena effetti

   Le manopole agiscono sul suono che sta suonando, non su una copia: è il
   motivo per cui esiste, e il motivo per cui prima di aprirlo il preset va
   mandato all'ampli. Lo stato di partenza si rilegge **dall'ampli**, non
   dalla libreria: se l'utente ha girato una manopola vera, la verità è lì.
   ==================================================================== */

let inModifica = null;      // { record, effetti, offline }

/** Una copia della catena, staccata da chi l'ha prodotta. */
const copiaEffetti = effetti => (effetti || []).map(e => ({
  name: e.name,
  enabled: e.enabled,
  params: (e.params || []).map(p => ({ index: p.index, value: p.value })),
}));

/**
 * Senza ampli si regola **la copia in libreria**: i valori di partenza sono
 * quelli del record, che è un'istantanea vera di quel suono, non roba
 * inventata — la regola «meglio niente che manopole finte» resta rispettata.
 * Non si sente niente e non parte niente sulla radio; «Salva in libreria»
 * funziona come sempre.
 *
 * La modalità si decide all'apertura e **non cambia più finché il pannello è
 * aperto**, anche se l'ampli si connette nel frattempo: rileggere la catena a
 * metà lavoro sostituirebbe di soppiatto quello che si sta modificando con
 * quello che l'ampli sta suonando, che è tutt'altro suono.
 */
async function apriEditor(record) {
  if (!spark.connected) {
    inModifica = {
      record,
      offline: true,
      attendibile: false,          // non c'è nessun ampli di cui fidarsi
      effetti: copiaEffetti(record.effects),
      bpm: bpmDelRecord(record),
    };
    battute = [];
    disegnaTempo();
    accendiInsegna(record);
    $('modoEditor').hidden = false;   // lo stato sta sotto il nome, non nel log
    $('aiutoEditor').hidden = true;   // chi riapre vuole girare, non rileggere
    disegnaCatena();
    apriPannello('pannelloEditor');
    aggiornaTastoSalva();   // editor appena aperto: niente in sospeso
    logLine(tr`«${record.name}»: regolazioni senza ampli, sulla copia in libreria.`);
    return;
  }

  logLine(tr`mando «${record.name}» all'ampli per regolarlo…`);
  const esito = await spark.loadPreset(record, (i, total) =>
    logProgress(tr`invio «${record.name}»: chunk ${i + 1} di ${total}…`));
  if (!esito.ok) { logLine(tr`invio interrotto: ${esito.error}`); return; }

  await new Promise(r => setTimeout(r, 400));
  const attuale = await spark.readLiveState();
  if (!attuale) {
    logLine(tr('non riesco a rileggere il suono corrente: senza quello l\'editor ' +
            'partirebbe da valori che potrebbero non essere quelli veri.'));
    return;
  }

  inModifica = {
    record,
    offline: false,
    // La catena viene da una lettura appena fatta: finché una lettura non
    // fallisce, ci si può fidare senza richiederla ogni volta.
    attendibile: true,
    effetti: copiaEffetti(attuale.effects),
    // Il tempo si prende dalla lettura, come la catena: se è stato cambiato
    // col TAP dell'ampli o dall'app ufficiale, la verità è lì e non nel record.
    bpm: bpmDelRecord(attuale),
  };
  battute = [];
  disegnaTempo();
  accendiInsegna(record);
  $('modoEditor').hidden = true;
  $('aiutoEditor').hidden = true;   // chi riapre vuole girare, non rileggere
  disegnaCatena();
  apriPannello('pannelloEditor');
  aggiornaTastoSalva();   // editor appena aperto: niente in sospeso
  // Non finisce nella riga di stato del pannello: nessuno l'ha chiesto, e lì
  // ci vanno solo le risposte a un gesto. Nel log resta.
  logLine(tr`«${record.name}» è sull'ampli: gira pure.`);
}

/* --------------------------------------------------------------------
   Il tempo del preset

   Il bpm **è un campo del preset** (`preset.bpm`, serializzato in `0x0101`),
   non una preferenza dell'app: si salva con lui e torna quando lo si rimanda
   all'ampli. Per questo sta nell'editor e non nella vista live — là si suona,
   qui si costruisce il suono.

   Con l'ampli attaccato il cambio parte subito con `0x0176`, e **gli effetti a
   tempo lo seguono da soli**: l'accoppiamento è dentro l'ampli, lo stesso che
   fa muovere il delay quando si preme TAP sul pannello.
   -------------------------------------------------------------------- */

const TEMPO_PREDEFINITO = 120;    // per i record vecchi, che il bpm non ce l'hanno
const TAP_PAUSA_MS      = 2500;   // oltre questa, è un gesto nuovo e non un tempo
const TAP_MEMORIA       = 5;      // quante battute entrano nella media

let battute  = [];                // gli istanti degli ultimi tap
let timerTap = null;

function bpmDelRecord(record) {
  const v = Math.round((record && record.bpm) || 0);
  return (v >= Spark.BPM_MIN && v <= Spark.BPM_MAX) ? v : TEMPO_PREDEFINITO;
}

function disegnaTempo() {
  if (!inModifica) return;
  $('valoreTempo').innerHTML = `${inModifica.bpm}<span class="un">bpm</span>`;
}

/**
 * Cambia il tempo. Senza ampli **non parte niente sulla radio**: è la stessa
 * regola delle manopole, e per lo stesso motivo — un arretrato partirebbe tutto
 * insieme se l'ampli si connettesse a metà lavoro.
 */
async function cambiaTempo(bpm) {
  if (!inModifica) return;
  const n = Math.max(Spark.BPM_MIN, Math.min(Spark.BPM_MAX, Math.round(bpm)));
  if (!isFinite(n) || n === inModifica.bpm) return;
  inModifica.bpm = n;
  disegnaTempo();
  segnaModificato();
  if (inModifica.offline || !spark.connected) return;
  await spark.setBpm(n);
}

/* Il lampeggio è tutto il riscontro che il tap può avere: in questo pannello
   non compare nessun messaggio, e senza un segno chi batte non sa se il tocco
   è stato preso. */
function lampeggiaTap() {
  const b = $('btnTap');
  b.classList.add('batte');
  clearTimeout(timerTap);
  timerTap = setTimeout(() => b.classList.remove('batte'), 130);
}

function battiIlTempo() {
  if (!inModifica) return;
  const ora = performance.now();
  // Una pausa lunga vuol dire «ricomincio»: due tocchi a distanza di secondi
  // non sono un tempo lento, sono due gesti diversi.
  if (battute.length && ora - battute[battute.length - 1] > TAP_PAUSA_MS) battute = [];
  battute.push(ora);
  if (battute.length > TAP_MEMORIA) battute.shift();
  lampeggiaTap();
  if (battute.length < 2) return;          // con un tocco solo non c'è nessun intervallo
  let somma = 0;
  for (let i = 1; i < battute.length; i++) somma += battute[i] - battute[i - 1];
  cambiaTempo(60000 / (somma / (battute.length - 1)));
}

$('btnTap').addEventListener('click', battiIlTempo);
$('btnTempoGiu').addEventListener('click',
  () => { if (inModifica) cambiaTempo(inModifica.bpm - 1); });
$('btnTempoSu').addEventListener('click',
  () => { if (inModifica) cambiaTempo(inModifica.bpm + 1); });

