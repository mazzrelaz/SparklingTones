// Sparkling Tones — pc/17-scalette.js: le scalette, solo sul PC (bozza, 18 novembre 2026).
//
// L'idea è dell'utente (docs/scaletta.md): **le scalette si creano fuori dalla Live**, in una
// schermata come i Banchi, coi nomi delle canzoni; **a ogni canzone si assegna un preset** e la
// **scena da cui parte** («Billie Jean» col preset «Pippo», che parte dalla scena «Clean»). Nella Live,
// modo Scene, il selettore in alto sceglie la scaletta e a sinistra dei pulsantoni c'è la lista delle
// canzoni: un clic suona il preset della canzone e poi la sua scena di partenza.
//
// Nel record delle impostazioni (`store.getScalette()`): `[{ uuid, nome, canzoni: [{ uuid, nome,
// preset, partenza }] }]`, il preset **per UUID** (passa da un apparecchio all'altro com'è),
// `partenza` 0–2 o null per la Base. Nessun comando nuovo verso l'ampli: il preset parte come dai
// banchi (`suonaDalBanco`), la scena come dalla schermata Scene (`suonaScena`).
'use strict';

const perUuid = u => (u && tutti.find(r => r.uuid === u)) || null;

live.scaletta = -1;     // la scaletta scelta nel modo Scene (-1: nessuna)
live.canzone = -1;      // la canzone che suona, in quella scaletta

const scalettaLive = () => (live.scaletta >= 0 && scalette[live.scaletta]) || null;

/** Il nome della scena di partenza di una canzone, per la sua etichetta. */
function nomePartenza(c) {
  const s = c.partenza === null || c.partenza === undefined ? null : sceneDi(perUuid(c.preset))[c.partenza];
  return s ? s.nome : tr('Base');
}

async function salvaScalette() {
  await store.setScalette(scalette);
  await ricarica();
  disegnaScalette();
  if (schermoLive) { live.firma = ''; disegnaLive(); }
}

/** La tendina della scena di partenza: Base e le scene del preset della canzone. */
function scegliPartenza(vicino, c) {
  const record = perUuid(c.preset);
  apriTendina(vicino, t => {
    voceTendina(t, tr('Base'), () => { c.partenza = null; salvaScalette(); }, { scelta: c.partenza === null || c.partenza === undefined });
    sceneDi(record).forEach((s, i) =>
      voceTendina(t, testoConNome(s.nome), () => { c.partenza = i; salvaScalette(); }, { scelta: c.partenza === i }));
  });
}

/* ---------------------------------------------------------------- la schermata Scalette */

let schermoScalette = null;

function apriScalette() {
  chiudiSchermi();
  schermoScalette = document.createElement('div');
  schermoScalette.className = 'schermo';
  schermoScalette.innerHTML = `
    <div class="sch-cima">
      <h2>${tr('Scalette')}${aiuto('scalette')}</h2>
      <span class="spazio"></span>
      <button data-f="nuova" class="primario">${tr('Nuova scaletta')}</button>
      <button data-f="chiudi" title="${tr('Chiudi')}">✕</button>
    </div>
    <div class="sch-corpo">
      <aside class="sl-preset">
        <input type="search" data-f="cerca" placeholder="${tr('cerca un preset…')}" autocomplete="off">
        <ul class="sl-elenco" data-f="elenco"></ul>
      </aside>
      <div class="bl-blocchi sc-blocchi" data-f="blocchi"></div>
    </div>`;
  document.body.appendChild(schermoScalette);
  const q = f => schermoScalette.querySelector(`[data-f="${f}"]`);
  q('chiudi').addEventListener('click', chiudiSchermi);
  q('nuova').addEventListener('click', nuovaScaletta);
  q('cerca').addEventListener('input', disegnaScalette);
  disegnaScalette();
}

function chiudiScalette() {
  if (schermoScalette) { schermoScalette.remove(); schermoScalette = null; }
}

function disegnaScalette() {
  if (!schermoScalette) return;
  const q = f => schermoScalette.querySelector(`[data-f="${f}"]`);

  // La libreria: si trascina un preset su una scaletta (canzone nuova) o su una canzone (cambia preset).
  const elenco = q('elenco');
  const scorri = elenco.scrollTop;
  elenco.textContent = '';
  const termine = q('cerca').value.trim().toLowerCase();
  const candidati = ordinaLibreria(tutti.filter(r => visibileSenzaHendrix(r) && (!termine || (r.name || '').toLowerCase().includes(termine))));
  for (const r of candidati) {
    const li = document.createElement('li');
    const fam = famigliaDi(r);
    if (fam) {
      const p = document.createElement('span');
      p.className = 'pallino-fam';
      p.style.setProperty('--famiglia', fam.colore);
      li.appendChild(p);
    }
    li.insertAdjacentHTML('beforeend', `<span class="nome">${testoConNome(r.name)}</span>`);
    if (sceneDi(r).length) li.insertAdjacentHTML('beforeend', `<span class="sc-quante" title="${tr('scene')}">${sceneDi(r).length}</span>`);
    trascinaInScaletta(li, { record: r });
    elenco.appendChild(li);
  }
  if (!candidati.length) elenco.innerHTML = `<li class="nome" style="cursor:default;color:var(--faint)">${tr('Nessun preset.')}</li>`;
  elenco.scrollTop = scorri;

  const blocchi = q('blocchi');
  const scorriB = blocchi.scrollTop;
  blocchi.textContent = '';
  scalette.forEach((s, i) => blocchi.appendChild(bloccoScaletta(s, i)));
  const nuova = document.createElement('button');
  nuova.type = 'button';
  nuova.className = 'bl-nuovo';
  nuova.textContent = tr('＋ nuova scaletta');
  nuova.addEventListener('click', nuovaScaletta);
  blocchi.appendChild(nuova);
  blocchi.scrollTop = scorriB;
}

function bloccoScaletta(s, indice) {
  const box = document.createElement('div');
  box.className = 'bl-blocco sc-blocco';
  box.dataset.scaletta = indice;
  const testa = document.createElement('div');
  testa.className = 'bl-testa';
  testa.innerHTML = `<span class="bl-nome">${testoConNome(s.nome)}</span><span class="bl-conta">${s.canzoni.length}</span>`;
  const matita = document.createElement('button');
  matita.className = 'mini-tasto';
  matita.textContent = '✎';
  matita.title = tr('rinomina o elimina la scaletta');
  matita.addEventListener('click', () => rinominaOEliminaScaletta(s));
  testa.appendChild(matita);
  box.appendChild(testa);

  const ol = document.createElement('ol');
  ol.className = 'bl-posti sc-canzoni';
  s.canzoni.forEach((c, n) => {
    const record = perUuid(c.preset);
    const li = document.createElement('li');
    li.dataset.scaletta = indice;
    li.dataset.canzone = n;
    li.className = record ? '' : 'senza';
    li.innerHTML = `<span class="n">${n + 1}</span>
      <span class="sc-testi"><span class="nome">${testoConNome(c.nome)}</span>
      <span class="sc-preset">${record ? testoConNome(record.name) : tr('preset non più in libreria')}</span></span>`;
    const partenza = document.createElement('button');
    partenza.type = 'button';
    partenza.className = 'sc-partenza';
    partenza.textContent = '▶ ' + nomePartenza(c);
    partenza.title = tr('scena di partenza');
    partenza.disabled = !record;
    partenza.addEventListener('pointerdown', e => e.stopPropagation());
    partenza.addEventListener('click', e => { e.stopPropagation(); scegliPartenza(partenza, c); });
    const via = document.createElement('button');
    via.className = 'mini-tasto via';
    via.textContent = '✕';
    via.title = tr('togli dalla scaletta (il preset resta in libreria)');
    via.addEventListener('pointerdown', e => e.stopPropagation());
    via.addEventListener('click', e => { e.stopPropagation(); s.canzoni.splice(n, 1); salvaScalette(); });
    li.append(partenza, via);
    // Doppio clic sul nome: lo si cambia (il nome della canzone, non quello del preset).
    li.querySelector('.nome').addEventListener('dblclick', async () => {
      const nome = await chiediTesto(tr('nome della canzone'), '', c.nome);
      if (nome && nome.trim()) { c.nome = nome.replace(/\s+/g, ' ').trim(); salvaScalette(); }
    });
    trascinaInScaletta(li, { scaletta: s, canzone: n });
    ol.appendChild(li);
  });
  if (!s.canzoni.length) ol.innerHTML = `<li class="vuoto">${tr('vuota')}</li>`;
  box.appendChild(ol);
  return box;
}

async function nuovaScaletta() {
  const r = await finestra({ titolo: tr('nuova scaletta'),
    campo: { valore: tr('Scaletta {0}', scalette.length + 1) },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Crea la scaletta'), valore: true, primario: true }] });
  if (!r) return;
  scalette.push({ uuid: nuovoUuid(), nome: r.testo.replace(/\s+/g, ' ').trim() || tr('Scaletta {0}', scalette.length + 1), canzoni: [] });
  await salvaScalette();
}

async function rinominaOEliminaScaletta(s) {
  const r = await finestra({ titolo: tr('scaletta'),
    campo: { valore: s.nome },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Elimina la scaletta'), valore: 'via', pericolo: true },
             { testo: tr('Salva il nome'), valore: 'nome', primario: true }] });
  if (!r) return;
  if (r.azione === 'via') {
    if (!await conferma(tr('eliminare la scaletta'), tr('Eliminare la scaletta <strong>{0}</strong>? I preset restano in libreria.',
      testoConNome(s.nome)), { ok: tr('Elimina'), pericolo: true })) return;
    scalette.splice(scalette.indexOf(s), 1);
    live.scaletta = -1;
  } else if (r.testo.trim()) {
    s.nome = r.testo.replace(/\s+/g, ' ').trim();
  }
  await salvaScalette();
}

/* Il trascinamento, col mouse come nei Banchi: un preset della libreria lasciato su una scaletta
   diventa una canzone in fondo (o dove lo si lascia); lasciato su una canzone ne cambia il preset.
   Una canzone presa e lasciata su un'altra della stessa scaletta prende il suo posto. */
let presaSc = null, trascinatoSc = false;

function trascinaInScaletta(el, cosa) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    presaSc = { cosa, el, x: e.clientX, y: e.clientY, fantasma: null, sopra: null };
    trascinatoSc = false;
  });
}

addEventListener('pointermove', e => {
  if (!presaSc) return;
  if (!presaSc.fantasma) {
    if (Math.hypot(e.clientX - presaSc.x, e.clientY - presaSc.y) < 6) return;
    presaSc.fantasma = document.createElement('div');
    presaSc.fantasma.className = 'fantasma';
    presaSc.fantasma.textContent = presaSc.cosa.record ? presaSc.cosa.record.name : presaSc.cosa.scaletta.canzoni[presaSc.cosa.canzone].nome;
    document.body.appendChild(presaSc.fantasma);
    presaSc.el.classList.add('preso');
    if (schermoScalette) schermoScalette.classList.add('trascina');
  }
  presaSc.fantasma.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 8}px)`;
  const sotto = document.elementFromPoint(e.clientX, e.clientY);
  const meta = sotto && (sotto.closest('li[data-canzone]') || sotto.closest('.sc-blocco'));
  if (presaSc.sopra && presaSc.sopra !== meta) presaSc.sopra.classList.remove('sopra');
  presaSc.sopra = meta || null;
  if (meta) meta.classList.add('sopra');
});

addEventListener('pointerup', async () => {
  if (!presaSc) return;
  const { cosa, el, fantasma, sopra } = presaSc;
  presaSc = null;
  if (!fantasma) return;
  trascinatoSc = true;
  setTimeout(() => { trascinatoSc = false; }, 0);
  fantasma.remove();
  el.classList.remove('preso');
  if (schermoScalette) schermoScalette.classList.remove('trascina');
  if (!sopra) return;
  sopra.classList.remove('sopra');
  const s = scalette[+sopra.dataset.scaletta];
  if (!s) return;
  const n = sopra.dataset.canzone !== undefined ? +sopra.dataset.canzone : -1;
  if (cosa.record) {
    if (n >= 0) {
      // Su una canzone: il preset cambia, il nome resta; la scena di partenza torna alla Base
      // (le scene sono del preset di prima).
      s.canzoni[n].preset = cosa.record.uuid;
      s.canzoni[n].partenza = null;
    } else {
      s.canzoni.push({ uuid: nuovoUuid(), nome: cosa.record.name, preset: cosa.record.uuid, partenza: null });
    }
  } else {
    if (cosa.scaletta !== s || n < 0 || n === cosa.canzone) return;
    const [c] = s.canzoni.splice(cosa.canzone, 1);
    s.canzoni.splice(n, 0, c);
  }
  await salvaScalette();
});

/* ---------------------------------------------------------------- nella Live, modo Scene */

function cambiaScaletta(passo) {
  const n = scalette.length + 1;              // più «nessuna»
  live.scaletta = ((live.scaletta + 1 + passo + n) % n) - 1;
  live.canzone = -1;
  store.setSetting('liveScaletta', scalettaLive() ? scalettaLive().uuid : null);
  disegnaLive();
}

/** Alla prima apertura della Live si torna alla scaletta di prima. */
async function scalettaDiPrima() {
  const u = await store.getSetting('liveScaletta', null);
  live.scaletta = scalette.findIndex(s => s.uuid === u);
}

/** Una canzone: il suo preset, poi la sua scena di partenza. */
async function suonaCanzone(n) {
  const s = scalettaLive();
  const c = s && s.canzoni[n];
  if (!c) return;
  const record = perUuid(c.preset);
  if (!record) { stato(tr('«{0}»: il preset non è più in libreria.', c.nome), 'errore'); return; }
  live.canzone = n;
  disegnaLive();
  await suonaDalBanco(record);
  if (!ora || !ora.record || ora.record.uuid !== record.uuid) return;   // non è partito
  if (live.canzone !== n) return;           // nel frattempo è stata scelta un'altra canzone: vince l'ultima
  if (c.partenza !== null && c.partenza !== undefined && sceneDi(recordDiOra())[c.partenza]) await suonaScena(c.partenza);
  else { ora.scena = null; disegnaLive(); }
}

function cambiaCanzone(passo) {
  const s = scalettaLive();
  if (!s || !s.canzoni.length) return;
  const n = live.canzone < 0 ? (passo > 0 ? 0 : s.canzoni.length - 1) : live.canzone + passo;
  if (n < 0 || n >= s.canzoni.length) return;    // in fondo alla scaletta ci si ferma, non si ricomincia
  suonaCanzone(n);
}

/** La lista delle canzoni, a sinistra dei pulsantoni. */
function listaCanzoni() {
  const s = scalettaLive();
  const box = document.createElement('div');
  box.className = 'lv-canzoni';
  const ol = document.createElement('ol');
  s.canzoni.forEach((c, n) => {
    const record = perUuid(c.preset);
    const li = document.createElement('li');
    li.className = (n === live.canzone ? 'sì' : '') + (record ? '' : ' senza');
    li.innerHTML = `<span class="n">${n + 1}</span><span class="sc-testi"><span class="nome">${testoConNome(c.nome)}</span>
      <span class="sc-preset">${record ? testoConNome(record.name) : tr('preset non più in libreria')}</span></span>`;
    const partenza = document.createElement('button');
    partenza.type = 'button';
    partenza.className = 'sc-partenza';
    partenza.textContent = '▶ ' + nomePartenza(c);
    partenza.title = tr('scena di partenza');
    partenza.disabled = !record;
    partenza.addEventListener('click', e => { e.stopPropagation(); scegliPartenza(partenza, c); });
    li.appendChild(partenza);
    li.addEventListener('click', () => suonaCanzone(n));
    ol.appendChild(li);
  });
  if (!s.canzoni.length) ol.innerHTML = `<li class="vuoto">${tr('scaletta vuota')}</li>`;
  box.appendChild(ol);
  return box;
}

$('apri-scalette').addEventListener('click', apriScalette);
