// Sparkling Tones — pc/16-pickup.js: i pickup consigliati di un preset.
'use strict';

/* ====================================================================
   Pickup consigliati (18 novembre 2026, come la v8.8 di Pulze Control)

   «Genera con l'IA» chiede anche la configurazione dei pickup ideale per il
   suono: che chitarra (SSS, HSS, HH…), quali pickup accesi, lo split, e un
   consiglio su selettore e manopole. Sul palco un'icona (in cima a destra,
   accesa se il preset li ha) apre la finestrella che li disegna; da lì
   «Modifica» li cambia, o li aggiunge a qualsiasi preset.

   pk = { layout: 'HSS' (come si scrive: dal ponte al manico), attivi: [indici
   dal manico], split, consiglio }. Sta nel record della libreria (`pickup`,
   fra i campi dell'utente: un import dall'ampli non lo tocca, backup e sync lo
   portano; tolto vale `null`, così anche la cancellazione viaggia). Un preset
   non ancora in libreria la tiene in `ora.pickup` finché «Salva…» non lo
   mette dentro. L'ampli non ne sa niente.
   ==================================================================== */

const LAYOUT_PICKUP = ['SSS', 'HSS', 'HSH', 'HH', 'SS', 'PP', 'HS', 'H', 'S', 'P'];

/** I nomi dei posti dal manico al ponte, per n pickup. */
function postiPickup(n) {
  return n === 3 ? [tr('Manico'), tr('Centrale'), tr('Ponte')]
    : n === 2 ? [tr('Manico'), tr('Ponte')] : [tr('Ponte')];
}

/** La risposta dell'IA ({ layout, on: ['bridge', …], split, tip }) → pk, o null. */
function pickupDaIA(pk) {
  if (!pk || typeof pk !== 'object') return null;
  const layout = String(pk.layout || '').toUpperCase().replace(/[^SHP]/g, '').slice(0, 3);
  if (!layout) return null;
  const posti = layout.length === 3 ? ['neck', 'middle', 'bridge'] : layout.length === 2 ? ['neck', 'bridge'] : ['bridge'];
  const sinonimi = { manico: 'neck', neck: 'neck', centrale: 'middle', middle: 'middle', mid: 'middle', ponte: 'bridge', bridge: 'bridge' };
  const on = (Array.isArray(pk.on) ? pk.on : String(pk.on || '').split(/[\s,+]+/))
    .map(x => sinonimi[String(x).toLowerCase().trim()]).filter(Boolean);
  const attivi = posti.map((p, i) => (on.includes(p) ? i : -1)).filter(i => i >= 0);
  if (!attivi.length) return null;
  const split = pk.split === true || pk.split === 1 || /^(true|1|yes|si|sì)$/i.test(String(pk.split));
  return { layout, attivi, split: split && layout.includes('H'), consiglio: String(pk.tip || '').trim().slice(0, 300) };
}

/** Un pk letto dalla libreria (o da un backup), controllato; null se non va. */
function pickupValido(pk) {
  if (!pk || typeof pk !== 'object' || !LAYOUT_PICKUP.includes(pk.layout) || !Array.isArray(pk.attivi)) return null;
  const attivi = pk.attivi.filter(i => Number.isInteger(i) && i >= 0 && i < pk.layout.length);
  if (!attivi.length) return null;
  return { layout: pk.layout, attivi, split: !!pk.split && pk.layout.includes('H'), consiglio: String(pk.consiglio || '') };
}

/** «HSS (humbucker / single coil) · Ponte · split». */
function descriviPickup(pk) {
  const tipi = { S: 'single coil', H: 'humbucker', P: 'P-90' };
  const posti = postiPickup(pk.layout.length);
  const tipo = [...new Set(pk.layout.split(''))].map(c => tipi[c]).join(' / ');
  const accesi = pk.attivi.map(i => posti[i]).join(' + ') || '—';
  return `${pk.layout} (${tipo}) · ${accesi}` + (pk.split && pk.layout.includes('H') ? ' · split' : '');
}

/** Il disegno dei pickup dal manico al ponte, accesi quelli da usare. alClic(i): si clicca un pickup. */
function disegnoPickup(pk, alClic) {
  const n = pk.layout.length;
  const posti = postiPickup(n);
  const xs = n === 3 ? [110, 210, 310] : n === 2 ? [130, 290] : [290];
  const NS = 'http://www.w3.org/2000/svg';
  const nodo = (tag, attr, padre) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
    if (padre) padre.appendChild(e);
    return e;
  };
  const svg = nodo('svg', { viewBox: '0 0 420 160', role: 'img' });
  nodo('rect', { x: 10, y: 8, width: 400, height: 122, rx: 22, class: 'pk-corpo' }, svg);
  const corde = [34, 48, 62, 76, 90, 104];
  const poli = (g, x, acceso) => {
    const gp = nodo('g', { class: 'pk-poli' + (acceso ? ' acceso' : '') }, g);
    corde.forEach(y => nodo('circle', { cx: x, cy: y, r: 3.2, class: 'pk-polo' }, gp));
  };
  // Il layout si scrive dal ponte al manico (HSS = humbucker al ponte): il disegno va dal manico.
  pk.layout.split('').reverse().forEach((tipo, i) => {
    const x = xs[i];
    const acceso = pk.attivi.includes(i);
    const g = nodo('g', alClic ? { class: 'pk-cliccabile' } : {}, svg);
    if (tipo === 'H') {
      // Due bobine; con lo split resta accesa solo quella verso il ponte.
      nodo('rect', { x: x - 20, y: 18, width: 40, height: 102, rx: 5, class: 'pk-spento' }, g);
      [-9, 9].forEach((dx, b) => {
        const viva = acceso && !(pk.split && b === 0);
        nodo('rect', { x: x + dx - 8, y: 22, width: 16, height: 94, rx: 8, class: viva ? 'pk-acceso' : 'pk-spento' }, g);
        poli(g, x + dx, viva);
      });
    } else {
      const largo = tipo === 'P' ? 30 : 18;
      nodo('rect', { x: x - largo / 2, y: 20, width: largo, height: 98, rx: tipo === 'P' ? 6 : 9,
        class: acceso ? 'pk-acceso' : 'pk-spento' }, g);
      poli(g, x, acceso);
    }
    const t = nodo('text', { x, y: 150, class: acceso ? 'acceso' : '' }, svg);
    t.textContent = posti[i];
    if (alClic) {
      nodo('rect', { x: x - 34, y: 8, width: 68, height: 150, class: 'pk-zona' }, g);
      g.addEventListener('click', () => alClic(i));
    }
  });
  corde.forEach(y => nodo('line', { x1: 10, y1: y, x2: 410, y2: y, class: 'pk-corda' }, svg));
  svg.setAttribute('aria-label', descriviPickup(pk));
  return svg;
}

/* ---------------------------------------------------------------- l'icona e la finestrella */

function pickupVisibili() {
  try { return localStorage.getItem('pickup-pc') !== 'no'; } catch (e) { return true; }
}

function cambiaVistaPickup() {
  try { localStorage.setItem('pickup-pc', pickupVisibili() ? 'no' : 'si'); } catch (e) { /* resta per questa volta */ }
  disegnaPannelloPickup();
}

/**
 * L'icona in cima al palco (18 novembre: il riquadro sotto le manopole faceva scorrere la colonna,
 * e l'utente non vuole scorrere): accesa se il preset ha i pickup, il clic apre la finestrella.
 */
function disegnaPannelloPickup() {
  const b = $('pk-apri');
  b.hidden = !ora || !pickupVisibili();
  if (b.hidden) return;
  const pk = pickupValido(ora.pickup);
  b.classList.toggle('ha', !!pk);
  b.title = pk ? tr('Pickup consigliati') + ': ' + descriviPickup(pk) : tr('Pickup consigliati');
}

/** La finestrella: il disegno, la descrizione e il consiglio; «Modifica» apre la matita. */
async function mostraPickup() {
  if (!ora) return;
  const pk = pickupValido(ora.pickup);
  if (!pk) return modificaPickup();
  const corpo = document.createElement('div');
  corpo.className = 'pk-vista';
  const sotto = document.createElement('p');
  sotto.className = 'pk-sotto';
  sotto.textContent = descriviPickup(pk);
  const disegno = document.createElement('div');
  disegno.className = 'pickup-disegno';
  disegno.appendChild(disegnoPickup(pk));
  corpo.append(sotto, disegno);
  if (pk.consiglio) {
    const nota = document.createElement('p');
    nota.className = 'pk-nota';
    nota.textContent = pk.consiglio;
    corpo.appendChild(nota);
  }
  const scelta = await finestra({
    titolo: tr('Pickup consigliati'),
    icona: ICONE.chitarra,
    corpo,
    azioni: [{ testo: tr('Modifica'), valore: 'modifica' }, { testo: tr('Chiudi'), valore: null, primario: true }],
  });
  if (scelta === 'modifica') await modificaPickup();
}

/** I pickup del preset sul palco cambiati: in libreria subito, se il preset c'è. */
async function scriviPickup(pk) {
  ora.pickup = pk;
  disegnaPannelloPickup();
  if (!ora.record) return;
  try {
    const record = await store._update(ora.record.id, r => { r.pickup = pk; });
    ora.record = record;
    await ricarica();
  } catch (err) {
    stato(tr('salvataggio fallito: {0}', err.message), 'errore');
  }
}

/** La matita: tipo di chitarra, pickup accesi con un clic, split e nota. */
async function modificaPickup() {
  if (!ora) return;
  const pk = pickupValido(ora.pickup) || { layout: 'SSS', attivi: [], split: false, consiglio: '' };
  const corpo = document.createElement('div');
  corpo.className = 'pk-finestra';
  corpo.innerHTML = `
    <div class="pk-scelte" data-f="layout"></div>
    <div class="pickup-disegno" data-f="disegno"></div>
    <div class="pk-scelte"><button type="button" data-f="split">Split</button></div>
    <input type="text" data-f="testo" maxlength="300" autocomplete="off" placeholder="${tr('Nota (selettore, manopole…)')}">`;
  const q = f => corpo.querySelector(`[data-f="${f}"]`);
  q('testo').value = pk.consiglio || '';

  const ridisegna = () => {
    const scelte = q('layout');
    scelte.textContent = '';
    for (const l of LAYOUT_PICKUP) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = l;
      b.classList.toggle('sì', l === pk.layout);
      b.addEventListener('click', () => {
        const prima = pk.layout.length, n = l.length;
        pk.layout = l;
        // Con un numero diverso di pickup i posti cambiano: si tengono manico e ponte.
        if (n !== prima) {
          pk.attivi = pk.attivi.map(i => (i === prima - 1 ? n - 1 : i === 0 ? 0 : (n === 3 ? 1 : -1)))
            .filter((i, k, a) => i >= 0 && i < n && a.indexOf(i) === k).sort();
        }
        if (!l.includes('H')) pk.split = false;
        ridisegna();
      });
      scelte.appendChild(b);
    }
    const disegno = q('disegno');
    disegno.textContent = '';
    disegno.appendChild(disegnoPickup(pk, i => {
      pk.attivi = pk.attivi.includes(i) ? pk.attivi.filter(x => x !== i) : pk.attivi.concat(i).sort();
      ridisegna();
    }));
    q('split').classList.toggle('sì', !!pk.split);
    q('split').disabled = !pk.layout.includes('H');
  };
  q('split').addEventListener('click', () => { pk.split = !pk.split; ridisegna(); });
  ridisegna();

  const scelta = await finestra({
    titolo: tr('Pickup consigliati'),
    icona: ICONE.chitarra,
    corpo,
    larga: true,
    azioni: [{ testo: tr('Togli'), valore: 'togli', pericolo: true }, { testo: tr('Annulla'), valore: null },
             { testo: tr('Fatto'), valore: 'fatto', primario: true }],
  });
  if (!scelta || !ora) return;
  if (scelta === 'togli' || !pk.attivi.length) return scriviPickup(null);
  pk.consiglio = q('testo').value.replace(/\s+/g, ' ').trim();
  await scriviPickup(pk);
}

$('pk-apri').addEventListener('click', mostraPickup);
