// Sparkling Tones — pc/01-base.js: la pagina per il PC (pc.html), le cose che servono a tutti.
//
// La versione per il PC nasce il 9 novembre 2026, chiesta dall'utente «come il Pulze editor»:
// una pagina a parte, che **non tocca l'app del telefono**, con l'editor della catena e il
// backup / Dropbox. Sta allo stesso indirizzo dell'app, quindi la libreria (IndexedDB) è la
// stessa. Usa gli stessi moduli (`spark-protocol`, `spark-transport`, `preset-store`,
// `dropbox-sync`) e **gli stessi comandi** dell'editor dell'app, con le stesse regole: niente
// di nuovo verso l'ampli.
//
// I file di `src/pc/` si caricano in fila come quelli di `src/app/`: script classici, const e
// funzioni si vedono fra un file e l'altro, ma il codice che gira al caricamento usa solo
// quello dei file prima.
'use strict';

Lingua.traduciPagina();

const $ = id => document.getElementById(id);
const store = new PresetStore();
const attendi = ms => new Promise(r => setTimeout(r, ms));

/** Il testo di un nome che viene dai dati, pronto per finire in un HTML. */
function testoConNome(nome) {
  const d = document.createElement('div');
  d.textContent = String(nome == null ? '' : nome);
  return d.innerHTML;
}

/* ---------------------------------------------------------------- la riga di stato
   Una riga sola sotto il nome del preset: dice l'ultima cosa successa. Il resto va in un
   registro in memoria, che finisce nella segnalazione di un problema. */
const registro = [];
let timerStato = null;

function stato(testo, tipo) {
  const el = $('stato');
  el.textContent = testo || '';
  el.title = testo || '';
  if (tipo) el.dataset.tipo = tipo; else delete el.dataset.tipo;
  if (testo) registro.push(new Date().toLocaleTimeString() + ' ' + testo);
  if (registro.length > 300) registro.splice(0, registro.length - 300);
  clearTimeout(timerStato);
  // Un messaggio d'esito si spegne da solo: rimasto lì per sempre direbbe una cosa vecchia.
  if (tipo === 'ok') timerStato = setTimeout(() => { if (el.textContent === testo) stato(''); }, 6000);
}

/* ---------------------------------------------------------------- le tendine
   Mai `<select>` (regola dell'app): una tendina disegnata qui, che si chiude con Esc o
   cliccando fuori. */
let tendinaAperta = null;

function chiudiTendina() {
  if (tendinaAperta) { tendinaAperta.remove(); tendinaAperta = null; }
}

function apriTendina(vicino, riempi, { destra = false } = {}) {
  chiudiTendina();
  const t = document.createElement('div');
  t.className = 'tendina';
  riempi(t);
  document.body.appendChild(t);
  const r = vicino.getBoundingClientRect(), h = t.offsetHeight, w = t.offsetWidth;
  const x = destra ? r.right - w : r.left;
  t.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
  t.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - h - 4)) + 'px';
  tendinaAperta = t;
  const scelta = t.querySelector('.sì');
  if (scelta) scelta.scrollIntoView({ block: 'center' });
  return t;
}

/** Una voce di tendina: testo (o HTML) e cosa fa. */
function voceTendina(contenitore, html, quando, { scelta = false, classe = '' } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = html;
  if (scelta) b.classList.add('sì');
  if (classe) b.className += ' ' + classe;
  b.addEventListener('click', () => { chiudiTendina(); quando(); });
  contenitore.appendChild(b);
  return b;
}

addEventListener('pointerdown', e => {
  if (tendinaAperta && !tendinaAperta.contains(e.target)) chiudiTendina();
}, true);

/* ---------------------------------------------------------------- le finestre
   Mai `confirm()`, `alert()` o `prompt()` (regola dell'app): tutto passa da qui ed è
   asincrono. Esc e il clic fuori valgono «annulla» (`null`). */
let finestraAperta = null;

function chiudiFinestra(valore) {
  if (!finestraAperta) return;
  const { velo, risolvi } = finestraAperta;
  finestraAperta = null;
  velo.remove();
  risolvi(valore === undefined ? null : valore);
}

/**
 * @param titolo, testo (HTML), campo ({valore, invito}) e azioni ([{testo, valore, primario,
 *        pericolo}]); `corpo` è un elemento già pronto da mettere sotto il testo.
 * @returns il valore dell'azione scelta (col campo: `{azione, testo}`), o null.
 */
function finestra({ titolo, testo, campo, azioni, corpo, larga, icona, aiutoDi }) {
  chiudiFinestra(null);
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    const box = document.createElement('div');
    box.className = 'finestra';
    if (larga) box.style.width = 'min(640px, calc(100vw - 32px))';
    // Il titolo: l'icona della funzione (un tracciato SVG) e il suo «?», se ce li ha.
    const h = document.createElement('h2');
    if (icona) h.innerHTML = `<span class="icona-titolo"><svg class="ico" viewBox="0 0 24 24">${icona}</svg></span>`;
    h.insertAdjacentHTML('beforeend', '<span></span>');
    h.lastChild.textContent = titolo;
    if (aiutoDi) h.insertAdjacentHTML('beforeend', aiuto(aiutoDi));
    box.appendChild(h);
    if (testo) {
      const p = document.createElement('div');
      p.className = 'testo';
      p.innerHTML = testo;
      box.appendChild(p);
    }
    let input = null;
    if (campo) {
      input = document.createElement('input');
      input.type = 'text';
      input.value = campo.valore || '';
      if (campo.invito) input.placeholder = campo.invito;
      if (campo.max) input.maxLength = campo.max;
      box.appendChild(input);
    }
    if (corpo) box.appendChild(corpo);
    const piede = document.createElement('div');
    piede.className = 'piede';
    for (const a of azioni || [{ testo: tr('Chiudi'), valore: true, primario: true }]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.testo;
      if (a.primario) b.classList.add('primario');
      if (a.pericolo) b.classList.add('pericolo');
      b.addEventListener('click', () => {
        if (a.valore === null) return chiudiFinestra(null);
        chiudiFinestra(input ? { azione: a.valore, testo: input.value } : a.valore);
      });
      piede.appendChild(b);
    }
    box.appendChild(piede);
    velo.appendChild(box);
    velo.addEventListener('pointerdown', e => { if (e.target === velo) chiudiFinestra(null); });
    document.body.appendChild(velo);
    finestraAperta = { velo, risolvi };
    if (input) {
      input.focus();
      input.select();
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const primo = (azioni || []).find(a => a.primario);
        if (primo) chiudiFinestra({ azione: primo.valore, testo: input.value });
      });
    }
  });
}

async function conferma(titolo, testo, { ok = tr('Procedi'), pericolo = false } = {}) {
  return (await finestra({ titolo, testo, azioni: [
    { testo: tr('Annulla'), valore: null },
    { testo: ok, valore: true, primario: !pericolo, pericolo },
  ] })) === true;
}

function avvisa(titolo, testo) {
  return finestra({ titolo, testo });
}

addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (tendinaAperta) chiudiTendina();
  else if (finestraAperta) chiudiFinestra(null);
});

/* ---------------------------------------------------------------- un file da scaricare */
function scaricaFile(nome, testo, tipo = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([testo], { type: tipo }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Un nome usabile come nome di file. */
const nomeFile = nome => String(nome || 'preset').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'preset';

/* ---------------------------------------------------------------- il pacchetto Hendrix
   La stessa scelta dell'app (`localStorage.hendrix`, stessa origine): col «no» i modelli
   `JH.*` spariscono dagli elenchi e il wah si chiama «Auto Wah». */
function haHendrix() {
  try { return localStorage.getItem('hendrix') !== 'no'; } catch (e) { return true; }
}

// La sezione Pedale serve solo a chi ha il pedale: spenta finché non la si accende.
function haPedale() {
  try { return localStorage.getItem('pedale-pc') === 'si'; } catch (e) { return false; }
}

/* ---------------------------------------------------------------- i «?» delle cose complesse
   Un tondino accanto alla funzione; il clic apre la spiegazione. Chiesti dall'utente l'11
   novembre 2026 per IA, Dropbox, backup di sicurezza, Hendrix, banchi, pedale, A/B. */
const AIUTI = {
  ia: () => [tr('Genera con l\'IA'),
    tr('<p>Descrivi il suono che vuoi, per esempio «crunch anni \'70 con un po\' di delay».</p>' +
       '<p>«Copia la domanda» mette negli appunti una richiesta completa per l\'IA, con l\'elenco degli effetti che il tuo ampli ha davvero. ' +
       'Incollala nella chat che usi già (ChatGPT, Claude, Gemini…), poi copia la sua risposta e incollala qui sotto.</p>' +
       '<p>Il preset nuovo va sull\'ampli <strong>senza essere salvato</strong>: lo provi, lo ritocchi, e resta in libreria solo se premi «Salva…». ' +
       'L\'app non manda niente a nessuno: la chat la apri tu.</p>')],
  dropbox: () => [tr('Dropbox'),
    tr('<p>Con Dropbox collegato la libreria si tiene allineata da sola fra i tuoi dispositivi: telefono, browser del computer, app per Windows.</p>' +
       '<p>Se lo stesso preset è cambiato in due posti vince la modifica più recente. Gli slot dell\'ampli non viaggiano: ogni dispositivo li legge dall\'ampli. ' +
       'Se in un colpo solo sparirebbero più di 5 preset, l\'app prima chiede.</p>' +
       '<p>Per collegarlo serve una «app key» di Dropbox, che si crea una volta sola: la guida spiega i passi. ' +
       'Poi «Collega Dropbox», autorizzi nel browser e incolli qui il codice che Dropbox ti mostra.</p>')],
  sicurezza: () => [tr('Backup di sicurezza'),
    tr('<p>È una copia della libreria messa da parte su Dropbox, in un file suo. Il sync automatico non la tocca mai.</p>' +
       '<p>Fanne una prima di un grosso riordino: se qualcosa va storto, «Ripristina il backup di sicurezza» riporta la libreria com\'era. ' +
       'Ce n\'è una sola: farne una nuova sostituisce la vecchia.</p>')],
  hendrix: () => [tr('Pacchetto Jimi Hendrix'),
    tr('<p>Positive Grid vende a parte un pacchetto di effetti Hendrix. Si sblocca con l\'app ufficiale Spark e lo sblocco resta nell\'ampli: questa app non lo può sbloccare.</p>' +
       '<p>Scegli «Sì» se ce l\'hai: gli effetti Hendrix compaiono nelle liste, segnati «JH». ' +
       'Scegli «No» se non ce l\'hai: spariscono, e i preset che li usano non si vedono, perché sull\'ampli non suonerebbero.</p>')],
  banchi: () => [tr('Banchi'),
    tr('<p>Un banco è un gruppo di otto preset, come una scaletta per un concerto o una prova. Trascini i preset dalla libreria nei suoi posti.</p>' +
       '<p>Un clic su un posto fa suonare quel preset. I banchi stanno solo in libreria: <strong>non scrivono mai negli slot dell\'ampli</strong>. ' +
       'Il banco «Ampli» è un\'altra cosa: mostra gli otto preset salvati negli slot, e qui non si modifica.</p>' +
       '<p>I banchi sono anche quello che suona il pedale SparklingTones.</p>')],
  pedale: () => [tr('Pedale SparklingTones'),
    tr('<p>Il pedale è una pedaliera da costruire, collegata allo Spark in Bluetooth: suona i tuoi banchi senza telefono né computer. Se non ce l\'hai, spegni questa sezione in Impostazioni.</p>' +
       '<p><strong>Collegarlo.</strong> Sul pedale tieni premuti insieme i due tasti banco per un secondo e mezzo: resta aperto per due minuti. Poi qui premi «Cerca» e sceglilo dalla lista. ' +
       'Mentre è collegato al computer il pedale lascia l\'ampli; quando lo stacchi torna da solo allo Spark.</p>' +
       '<p><strong>Mandare un banco.</strong> Scegli il banco e il posto del pedale, poi «Manda al pedale». Se un banco cambia nell\'app, qui lo vedi segnato da aggiornare.</p>' +
       '<p><strong>Riordinare.</strong> In «Nel pedale» sposti o togli i banchi; le modifiche vanno sul pedale tutte insieme con «Aggiorna il pedale».</p>' +
       '<p>Se un footswitch non fa niente, controlla prima che il pedale non sia ancora collegato qui.</p>')],
  ab: () => [tr('A/B'),
    tr('<p>Mentre ritocchi un preset, A/B ti fa ascoltare com\'era salvato. Premilo di nuovo e torni alle tue modifiche.</p>' +
       '<p>Così senti se la modifica migliora davvero il suono, prima di salvarla. Mentre ascolti la versione salvata i comandi sono fermi.</p>')],
};
const aiuto = chiave => `<button type="button" class="aiuto" data-aiuto="${chiave}">?</button>`;
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.aiuto');
  if (!b || !AIUTI[b.dataset.aiuto]) return;
  e.preventDefault(); e.stopPropagation();
  const [titolo, testo] = AIUTI[b.dataset.aiuto]();
  mostraAiuto(titolo, testo);
}, true);

// Una finestrella sua, sopra a tutto: `finestra()` ne tiene una sola e chiuderebbe quella sotto
// (le Impostazioni). Si chiude col clic fuori, con «OK» o con Esc.
function mostraAiuto(titolo, testo) {
  document.querySelector('.velo-aiuto')?.remove();
  const velo = document.createElement('div');
  velo.className = 'velo-aiuto';
  velo.innerHTML = `<div class="carta-aiuto" role="dialog"><h2></h2><div class="testo-aiuto">${testo}</div>
    <div class="riga-azioni"><button class="primario">OK</button></div></div>`;
  velo.querySelector('h2').textContent = titolo;
  const chiudi = () => { velo.remove(); removeEventListener('keydown', esc, true); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); chiudi(); } };
  velo.addEventListener('click', e => { if (e.target === velo || e.target.closest('button')) chiudi(); });
  addEventListener('keydown', esc, true);
  document.body.appendChild(velo);
  velo.querySelector('button').focus();
}

const mostraValore = v => (v * 10).toFixed(1);
