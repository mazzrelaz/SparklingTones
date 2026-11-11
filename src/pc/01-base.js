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
function finestra({ titolo, testo, campo, azioni, corpo, larga }) {
  chiudiFinestra(null);
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    const box = document.createElement('div');
    box.className = 'finestra';
    if (larga) box.style.width = 'min(640px, calc(100vw - 32px))';
    const h = document.createElement('h2');
    h.textContent = titolo;
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

const mostraValore = v => (v * 10).toFixed(1);
