// Sparkling Tones — pc/15-looper.js: il looper dello Spark 2 nella Live del PC (14 novembre 2026).
//
// La stessa logica del pedale (`pedale/prova-ble/07-looper.ino`, tutto in `docs/looper.md`), in JS:
// comanda il looper dell'ampli con `0x0175`, legge lo stato da `0x0375`, la posizione nel giro da
// `0x0377` e bpm, battute, «libero» e click da `0x0376`. **Il conteggio prima del rec lo facciamo
// noi** (l'`02` dell'ampli riceve l'ack e non conta): quattro tempi a loop vuoto, il click dalle
// casse del PC con Web Audio (gli stessi due toni del pedale, 2700 e 1800 Hz, 40 ms), e `04` 40 ms
// prima dell'«uno». Cose verificate sul pedale, e che qui valgono uguali:
//  - a `09` e `0b` mandati da noi l'ampli dà solo l'ack, senza `0x0375`: lo stato lo segniamo noi;
//  - la sovraincisione è solo `0b` (con `08` dietro il loop si riavvolge);
//  - `0d` durante la sovraincisione non fa niente: prima `0c`, poi `0d`;
//  - battute e tempo si cambiano **solo a loop vuoto davvero** (con un loop registrato l'ampli
//    s'impalla), e un loop registrato tiene il suo tempo anche se il preset ne porta un altro.
'use strict';

const LP = { VUOTO: 0x00, CONTA: 0x02, REC: 0x04, CHIUDI: 0x05, FATTO: 0x07, SUONA: 0x08, FERMA: 0x09,
  CANCELLA: 0x0a, DUB: 0x0b, FINE_DUB: 0x0c, ANNULLA: 0x0d, RIPETI: 0x0e };
const BATTUTE = [1, 2, 4, 8, 12, 16, 0];      // 0 = libero
const AZIONI_LOOPER = [
  { id: 'rec', nome: () => tr('Registra / sovraincidi') },
  { id: 'suona', nome: () => tr('Suona') },
  { id: 'ferma', nome: () => tr('Ferma') },
  { id: 'annulla', nome: () => tr('Annulla / ripeti') },
  { id: 'cancella', nome: () => tr('Cancella il loop') },
  { id: 'tap', nome: () => tr('Tap tempo') },
];

const looper = {
  stato: 'vuoto',     // vuoto | conta | rec | suona | dub | fermo
  annullato: false,   // l'ultima sovraincisione è stata annullata: il prossimo tocco la ripete
  pos: null,          // 0…1 nel giro, dall'ultimo 0x0377 (null: non arriva)
  posQuando: 0,
  imp: null,          // l'ultimo 0x0376
  bpm: 120, battute: 4, libero: false, click: true,
  tempoConta: 0,      // nel conteggio: i tempi che mancano (4…1, o 8…1)
  battuteConta: 1,    // il conteggio prima del rec: una o due battute (si ricorda in `looperConta`)
  timerConta: [],
  tap: [],
};

/* ---------------------------------------------------------------- dall'ampli */

/** I campi di `0x0376`: `<bpm> <count> <battute> <libero> <click> …`. */
function leggiImpostazioniLooper(d) {
  const k = d[0] === 0xcc ? 2 : 1;
  if (d.length < k + 4) return null;
  return { bpm: Spark.bpmDaImpostazioni(d), battute: d[k + 1], libero: d[k + 2] === 0xc3, click: d[k + 3] === 0xc3 };
}

function loopVuoto() { return looper.stato === 'vuoto' && !(looper.pos !== null && Date.now() - looper.posQuando < 800); }

function riceviLooper(msg) {
  if (msg.cmd !== Spark.CMD_NOTIFY) return;
  if (msg.sub === 0x76) {
    looper.imp = Array.from(msg.data);
    const i = leggiImpostazioniLooper(msg.data);
    if (!i) return;
    if (loopVuoto()) { looper.bpm = i.bpm || looper.bpm; looper.battute = i.battute; looper.libero = i.libero; }
    ridisegnaLooper(true);
  } else if (msg.sub === 0x63) {
    try { const v = new Spark.Reader(msg.data).float(); if (isFinite(v) && loopVuoto()) looper.bpm = Math.round(v); } catch (e) {}
    ridisegnaLooper(true);
  } else if (msg.sub === 0x77) {
    if (Date.now() - (looper.cancellato || 0) < 1500) return;   // gli ultimi del loop appena cancellato
    try { looper.pos = new Spark.Reader(msg.data).float(); looper.posQuando = Date.now(); } catch (e) {}
    if (looper.stato === 'vuoto' || looper.stato === 'fermo') { looper.stato = 'suona'; ridisegnaLooper(true); }
  } else if (msg.sub === 0x75 && msg.data.length) {
    eventoLooper(msg.data[msg.data.length - 1]);
  }
}

/** Uno stato, detto dall'ampli o segnato da noi quando l'ampli tace. */
function eventoLooper(c) {
  const prima = looper.stato;
  // L'ampli dice «vuoto» ~1,2 s dopo una cancellazione: se nel frattempo è partito il conteggio,
  // quel «vuoto» è vecchio e non deve fermarlo (era il cerchio che s'impallava).
  if ((c === LP.VUOTO || c === LP.CANCELLA) && prima === 'conta') return;
  if (c === LP.VUOTO || c === LP.CANCELLA) { if (c === LP.CANCELLA) looper.cancellato = Date.now(); looper.stato = 'vuoto'; looper.pos = null; looper.annullato = false; }
  else if (c === LP.REC) { if (prima !== 'conta' || !looper.timerConta.length) fermaConteggio(); looper.stato = 'rec'; looper.pos = 0; looper.posQuando = Date.now(); }
  else if (c === LP.FATTO || c === LP.SUONA || c === LP.FINE_DUB) looper.stato = 'suona';
  else if (c === LP.FERMA) looper.stato = 'fermo';
  else if (c === LP.DUB) { looper.stato = 'dub'; looper.annullato = false; }
  if (looper.stato === 'vuoto' && prima !== 'vuoto') spark.send(Spark.commands.getLooperSettings()).catch(() => {});
  ridisegnaLooper(true);
}

/* ---------------------------------------------------------------- verso l'ampli */

function senzaAmpliLooper() { avvisa(tr('ampli non collegato'), tr('Collega lo Spark 2 per usare il looper.')); }

function mandaLooper(c) {
  if (!spark.connected) { senzaAmpliLooper(); return false; }
  spark.send(Spark.commands.looper(c)).catch(e => stato(tr('looper: {0}', e.message), 'errore'));
  return true;
}

/** Entrando nel looper: chi sta suonando, e con che tempo. */
function chiediLooper() {
  if (!spark.connected) return;
  spark.send(Spark.commands.getLooperState()).then(() => spark.send(Spark.commands.getLooperSettings())).catch(() => {});
}

function azioneLooper(id) {
  if (!spark.connected) { senzaAmpliLooper(); return; }
  const s = looper.stato;
  if (id === 'rec') {
    if (s === 'vuoto') { if (looper.libero) { if (mandaLooper(LP.REC)) eventoLooper(LP.REC); } else contaERegistra(); }
    else if (s === 'conta') fermaConteggio(true);
    else if (s === 'rec') mandaLooper(LP.CHIUDI);
    else if (s === 'dub') { if (mandaLooper(LP.FINE_DUB)) eventoLooper(LP.FINE_DUB); }
    else if (mandaLooper(LP.DUB)) eventoLooper(LP.DUB);
  } else if (id === 'suona') {
    if (s === 'fermo' && mandaLooper(LP.SUONA)) eventoLooper(LP.SUONA);
  } else if (id === 'ferma') {
    if (s === 'conta') { fermaConteggio(true); return; }
    if (s === 'dub') mandaLooper(LP.FINE_DUB);
    if ((s === 'suona' || s === 'dub' || s === 'rec') && mandaLooper(LP.FERMA)) eventoLooper(LP.FERMA);
  } else if (id === 'annulla') {
    if (s === 'vuoto' || s === 'conta' || s === 'rec') return;
    if (s === 'dub') { mandaLooper(LP.FINE_DUB); eventoLooper(LP.FINE_DUB); }
    mandaLooper(looper.annullato ? LP.RIPETI : LP.ANNULLA);
    looper.annullato = !looper.annullato;
    stato(looper.annullato ? tr('sovraincisione annullata') : tr('sovraincisione ripetuta'));
  } else if (id === 'cancella') {
    if (s === 'conta') fermaConteggio(true);
    if (s !== 'vuoto' && mandaLooper(LP.CANCELLA)) looper.cancellato = Date.now();
  } else if (id === 'tap') tapLooper();
  ridisegnaLooper(true);
}

/* ---------------------------------------------------------------- il conteggio */

let audioLooper = null;
function clic(uno, quando) {
  try {
    if (!audioLooper) audioLooper = new (window.AudioContext || window.webkitAudioContext)();
    if (audioLooper.state === 'suspended') audioLooper.resume();
    const t = quando || audioLooper.currentTime;
    const o = audioLooper.createOscillator(), g = audioLooper.createGain();
    o.type = 'square';
    o.frequency.value = uno ? 2700 : 1800;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g).connect(audioLooper.destination);
    o.start(t); o.stop(t + 0.045);
  } catch (e) { /* niente audio: il conteggio resta a schermo */ }
}

function contaERegistra() {
  fermaConteggio();
  const passo = 60000 / (looper.bpm || 120);
  const tempi = 4 * looper.battuteConta;
  looper.stato = 'conta';
  looper.inizioConta = Date.now();
  for (let n = 0; n < tempi; n++) {
    looper.timerConta.push(setTimeout(() => {
      looper.tempoConta = tempi - n;
      if (looper.click) clic(n % 4 === 0);
      ridisegnaLooper(true);
    }, n * passo));
  }
  looper.timerConta.push(setTimeout(() => { looper.timerConta = []; if (mandaLooper(LP.REC)) eventoLooper(LP.REC); }, tempi * passo - 40));
  ridisegnaLooper(true);
}

function fermaConteggio(annulla) {
  looper.timerConta.forEach(clearTimeout);
  looper.timerConta = [];
  looper.tempoConta = 0;
  if (annulla && looper.stato === 'conta') looper.stato = 'vuoto';
}

/* ---------------------------------------------------------------- battute e tempo, a loop vuoto */

function scriviImpostazioniLooper(cambia) {
  if (!spark.connected) { senzaAmpliLooper(); return; }
  if (!loopVuoto()) { stato(tr('con un loop registrato battute e tempo non si cambiano')); return; }
  const d = looper.imp;
  if (!d || !leggiImpostazioniLooper(d)) { chiediLooper(); stato(tr('l\'ampli non ha ancora detto le impostazioni del looper')); return; }
  let nuove;
  try {
    nuove = Spark.impostazioniConBpm(d, cambia.bpm || looper.bpm);
    const k = nuove[0] === 0xcc ? 2 : 1;
    if (cambia.battute !== undefined) {
      if (cambia.battute) { nuove[k + 1] = cambia.battute; nuove[k + 2] = 0xc2; } else nuove[k + 2] = 0xc3;
    }
  } catch (e) { stato(e.message, 'errore'); return; }
  spark.send(Spark.commands.setLooperSettings(nuove)).catch(() => {});
  looper.imp = nuove;
  if (spark.state) spark.state.impostazioniLooper = nuove;
  Object.assign(looper, leggiImpostazioniLooper(nuove));
  ridisegnaLooper(true);
}

function cambiaBattute(passo) {
  const i = BATTUTE.indexOf(looper.libero ? 0 : looper.battute);
  const j = Math.max(0, Math.min(BATTUTE.length - 1, (i < 0 ? 2 : i) + passo));
  scriviImpostazioniLooper({ battute: BATTUTE[j] });
}

/** Il tempo con le frecce: subito a schermo, all'ampli quando ci si ferma (un 0x0176 solo). */
let bpmInAttesa = null;
function cambiaBpm(passo) {
  if (!loopVuoto()) { stato(tr('con un loop registrato battute e tempo non si cambiano')); return; }
  looper.bpm = Math.max(40, Math.min(250, looper.bpm + passo));
  const b = schermoLive && schermoLive.querySelector('.lp-tempo-chip b');
  if (b) b.innerHTML = `${looper.bpm} <small>bpm</small>`;
  clearTimeout(bpmInAttesa);
  bpmInAttesa = setTimeout(() => scriviImpostazioniLooper({ bpm: looper.bpm }), 300);
}

function tapLooper() {
  const ora_ = Date.now();
  looper.tap = looper.tap.filter(t => ora_ - t < 2500).concat(ora_);
  if (looper.tap.length < 2) return;
  const d = (looper.tap[looper.tap.length - 1] - looper.tap[0]) / (looper.tap.length - 1);
  const bpm = Math.round(60000 / d);
  if (bpm >= 40 && bpm <= 250) scriviImpostazioniLooper({ bpm });
}

/* ---------------------------------------------------------------- lo schermo */
// Lo stile del tuner: tacche al neon con il bagliore, ciano → viola → fucsia lungo il giro, un
// numero grande al centro. Una tacca per tempo; quella dell'«uno» di ogni battuta più lunga.
// **Niente `filter` animati** (in Chromium rompono il disegno): il bagliore si accende e si
// spegne con una classe, come le tacche del tuner.

const NOMI_STATO = { vuoto: () => tr('pronto'), conta: () => tr('conteggio'), rec: () => tr('registra'),
  suona: () => tr('suona'), dub: () => tr('sovraincide'), fermo: () => tr('fermo') };

/** La posizione nel giro adesso: dall'ultimo 0x0377, portata avanti col tempo passato. */
function posLooper() {
  if (looper.pos === null) return null;
  if (looper.stato === 'fermo') return looper.pos;
  const giro = looper.libero ? 0 : looper.battute * 4 * 60000 / looper.bpm;
  const p = looper.pos + (giro ? (Date.now() - looper.posQuando) / giro : 0);
  return Math.min(p, 0.999);
}

const tintaLp = (a, b, f) => a.map((x, k) => Math.round(x + (b[k] - x) * f));
const CIANO_LP = [43, 228, 255], VIOLA_LP = [123, 92, 255], FUCSIA_LP = [255, 43, 214];
function coloreTacca(f) {
  const rgb = f < 0.5 ? tintaLp(CIANO_LP, VIOLA_LP, f * 2) : tintaLp(VIOLA_LP, FUCSIA_LP, (f - 0.5) * 2);
  return `rgb(${rgb.join(',')})`;
}

/** Le tacche: quante, quante accese, quale è il tempo di adesso. */
function taccheLooper() {
  const s = looper.stato;
  if (s === 'conta') {
    // Il conteggio gira come il loop: la testa bianca scorre di continuo, la scia è rossa.
    const tempi = 4 * looper.battuteConta, per = Math.max(1, Math.round(72 / tempi)), n = tempi * per;
    const f = Math.min(0.999, Math.max(0, (Date.now() - looper.inizioConta) / (tempi * 60000 / (looper.bpm || 120))));
    const k = Math.floor(f * n);
    return { n, accese: k + 1, ora: k, battuta: 4 * per };
  }
  const n = looper.libero ? 32 : 4 * Math.max(1, looper.battute);
  const p = posLooper();
  if (s === 'vuoto') return { n, accese: 0, ora: -1, battuta: looper.libero ? 0 : 4 };
  if (p === null) return { n, accese: s === 'rec' ? n : 0, ora: -1, battuta: looper.libero ? 0 : 4 };
  const k = Math.min(n - 1, Math.floor(p * n + 1e-6));
  return { n, accese: k + 1, ora: k, battuta: looper.libero ? 0 : 4 };
}

function anelloLooper() {
  const t = taccheLooper();
  const c = 160, giro = 2 * Math.PI;
  let tacche = '';
  // Tante tacche fitte (circa 72, come il quadrante del tuner), accese un tempo alla volta.
  const per = Math.max(1, Math.round(72 / t.n)), tot = t.n * per;
  for (let j = 0; j < tot; j++) {
    const k = Math.floor(j / per);
    const a = (j + 0.5) * giro / tot;
    const uno = t.battuta && j % (per * t.battuta) === 0;
    const dentro = uno ? 108 : 124, fuori = 146;
    const x = d => (c + d * Math.sin(a)).toFixed(1), y = d => (c - d * Math.cos(a)).toFixed(1);
    const accesa = k < t.accese, ora = k === t.ora;
    tacche += `<line class="lp-tacca${uno ? ' uno' : ''}${accesa ? ' accesa' : ''}${ora ? ' ora' : ''}" x1="${x(dentro)}" y1="${y(dentro)}" x2="${x(fuori)}" y2="${y(fuori)}" style="color:${coloreTacca(j / Math.max(1, tot - 1))}"/>`;
  }
  const s = looper.stato;
  let grande, piccolo;
  if (s === 'conta') { grande = String(looper.tempoConta % 4 || 4); piccolo = looper.battuteConta > 1 ? tr('battuta {0} di {1}', String(looper.battuteConta - Math.ceil(looper.tempoConta / 4) + 1), String(looper.battuteConta)) : ''; }
  else if (s === 'vuoto') { grande = looper.libero ? '∞' : String(looper.battute); piccolo = looper.libero ? tr('libero') : looper.battute === 1 ? tr('battuta') : tr('battute'); }
  else if (t.ora >= 0 && !looper.libero) { grande = `${Math.floor(t.ora / 4) + 1}<tspan class="lp-tempo">/${t.ora % 4 + 1}</tspan>`; piccolo = tr('di {0}', String(looper.battute)); }
  else { grande = { rec: '●', dub: '◉', suona: '▶', fermo: '■' }[s] || ''; piccolo = ''; }
  return `<svg viewBox="0 0 320 320" class="lp-anello st-${s}">
    <circle class="lp-fondo" cx="160" cy="160" r="100"/>${tacche}
    <text x="160" y="${piccolo ? 172 : 184}" class="lp-grande">${grande}</text>
    <text x="160" y="208" class="lp-piccolo">${piccolo}</text></svg>`;
}

let firmaLp = '';
/** `forza`: è cambiato lo stato; altrimenti si ridisegna solo l'anello, se è cambiato. */
function ridisegnaLooper(forza) {
  if (!schermoLive || !live.looper || live.vista !== 'live') return;
  const box = schermoLive.querySelector('.lp');
  if (!box) return;
  if (forza) { riempiLooper(box); return; }
  const svg = anelloLooper();
  if (svg !== firmaLp) { firmaLp = svg; box.querySelector('.lp-cerchio').innerHTML = svg; }
}
setInterval(() => ridisegnaLooper(false), 50);

let contaLetta = false;
function disegnaLooper(corpo) {
  const box = document.createElement('div');
  box.className = 'lp';
  corpo.appendChild(box);
  riempiLooper(box);
  if (!contaLetta) {
    contaLetta = true;
    store.getSetting('looperConta', 1).then(v => { looper.battuteConta = v === 2 ? 2 : 1; ridisegnaLooper(true); }).catch(() => {});
  }
}

const ICONE_LP = {
  rec: '<circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none"/>',
  chiudi: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  dub: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
  suona: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  ferma: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none"/>',
  annulla: '<path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H11"/>',
  ripeti: '<path d="m15 7 4.5 4.5L15 16M19 11.5H9.5a5 5 0 0 0 0 10H13"/>',
  cancella: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
};
const iconaLp = n => `<svg viewBox="0 0 24 24" class="lp-ico">${ICONE_LP[n]}</svg>`;

function riempiLooper(box) {
  const s = looper.stato, vuoto = loopVuoto();
  const tasto = (id, ico, testo, colore, acceso, spento) =>
    `<button type="button" class="lp-tasto c-${colore}${acceso ? ' sì' : ''}${spento ? ' spento' : ''}" data-l="${id}">${etichetteSwitch(x => x.looper === id)}<span class="lp-bottone">${iconaLp(ico)}</span><span class="lp-nome">${testo}</span></button>`;
  const chip = (gruppo, v, testo, sì) => `<button type="button" data-${gruppo}="${v}" class="${sì ? 'sì' : ''}">${testo}</button>`;
  const recIco = s === 'rec' || s === 'dub' ? 'chiudi' : vuoto || s === 'conta' ? 'rec' : 'dub';
  const recTesto = s === 'rec' || s === 'dub' ? tr('Chiudi') : s === 'conta' ? tr('Annulla il conteggio') : vuoto ? tr('Registra') : tr('Sovraincidi');
  firmaLp = anelloLooper();
  // I tasti si rifanno solo se cambiano: rifarli sotto il mouse perde il clic (premuto sul
  // vecchio, rilasciato sul nuovo), e il conteggio e l'ampli chiedono di ridisegnare spesso.
  const lato = `
    <div class="lp-lato">
      <div class="lp-stato st-${s}"><span class="lp-led"></span><span>${NOMI_STATO[s]()}</span><span class="lp-bpm"><b>${looper.bpm}</b> bpm</span></div>
      <div class="lp-imp${vuoto ? '' : ' bloccate'}">
        <div class="lp-riga"><small>${tr('Lunghezza')}</small><div class="lp-chip">${BATTUTE.map(b => chip('b', b, b ? String(b) : '∞', looper.libero ? !b : b === looper.battute)).join('')}</div></div>
        <div class="lp-riga"><small>${tr('Conteggio')}</small><div class="lp-chip">${chip('c', 1, tr('1 battuta'), looper.battuteConta === 1)}${chip('c', 2, tr('2 battute'), looper.battuteConta === 2)}</div>
          <div class="lp-chip">${chip('click', 1, tr('Click'), looper.click)}</div>
</div>
        <div class="lp-riga blocca"><small>${tr('Tempo')}</small><div class="lp-chip lp-tempo-chip">${chip('bpm', -1, '◀', false)}<b>${looper.bpm} <small>bpm</small></b>${chip('bpm', 1, '▶', false)}</div>
          <div class="lp-chip">${chip('tap', 1, tr('Tap'), false)}</div></div>
      </div>
      <div class="lp-tasti">
        ${tasto('rec', recIco, recTesto, s === 'dub' || (!vuoto && s !== 'rec' && s !== 'conta') ? 'ambra' : 'rosso', s === 'rec' || s === 'dub' || s === 'conta')}
        ${tasto('suona', 'suona', tr('Suona'), 'ciano', s === 'suona', s !== 'fermo')}
        ${tasto('ferma', 'ferma', tr('Ferma'), 'viola', s === 'fermo', vuoto && s !== 'conta')}
        ${tasto('annulla', looper.annullato ? 'ripeti' : 'annulla', looper.annullato ? tr('Ripeti') : tr('Annulla'), 'viola', false, vuoto || s === 'rec' || s === 'conta')}
        ${tasto('cancella', 'cancella', tr('Cancella'), 'fucsia', false, vuoto && s !== 'conta')}
      </div>
    </div>`;
  if (box._lato === lato && box.querySelector('.lp-cerchio')) { box.querySelector('.lp-cerchio').innerHTML = firmaLp; return; }
  box._lato = lato;
  box.innerHTML = `<div class="lp-cerchio">${firmaLp}</div>${lato}`;
  box.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.l;
    if (id === 'cancella') { if (await conferma(tr('cancellare il loop?'), '', { ok: tr('Cancella'), pericolo: true })) azioneLooper('cancella'); }
    else azioneLooper(id);
  }));
  box.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => scriviImpostazioniLooper({ battute: +b.dataset.b })));
  box.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
    if (looper.stato === 'conta') return;
    looper.battuteConta = +b.dataset.c;
    store.setSetting('looperConta', looper.battuteConta).catch(() => {});
    ridisegnaLooper(true);
  }));
  box.querySelector('[data-click]').addEventListener('click', () => { looper.click = !looper.click; ridisegnaLooper(true); });
  box.querySelector('[data-tap]').addEventListener('click', tapLooper);
  // Le frecce del tempo: un bpm a clic, cinque con Maiusc; tenute premute vanno da sole.
  box.querySelectorAll('[data-bpm]').forEach(b => {
    let ripeti = null;
    const passo = e => cambiaBpm(+b.dataset.bpm * (e.shiftKey ? 5 : 1));
    const basta = () => { clearTimeout(ripeti); clearInterval(ripeti); ripeti = null; };
    b.addEventListener('pointerdown', e => { passo(e); basta(); ripeti = setTimeout(() => { ripeti = setInterval(() => passo(e), 70); }, 400); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, basta));
  });
}
