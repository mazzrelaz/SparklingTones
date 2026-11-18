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

// Il layout si scrive dal ponte al manico, una lettera per posizione: S single coil, H humbucker,
// M mini humbucker, P P-90, «-» posizione vuota (18 novembre: «--H» = un humbucker solo al manico).
// Due lettere sono ponte e manico, una il solo ponte.
const LAYOUT_PICKUP = ['SSS', 'HSS', 'HSH', 'HH', 'SS', 'PP', 'HS', 'MM', 'H', 'S', 'P'];
const TIPI_PICKUP = { S: 'single coil', H: 'humbucker', M: 'mini humbucker', P: 'P-90' };

const layoutBuono = l => /^[SHMP-]{1,3}$/.test(l) && /[SHMP]/.test(l);
const haHumbucker = l => /[HM]/.test(l);
/** Le posizioni dal manico con un pickup vero (non «-»). */
const postiVeri = l => l.split('').reverse().map((c, i) => (c === '-' ? -1 : i)).filter(i => i >= 0);

/** I nomi dei posti dal manico al ponte, per n pickup. */
function postiPickup(n) {
  return n === 3 ? [tr('Manico'), tr('Centrale'), tr('Ponte')]
    : n === 2 ? [tr('Manico'), tr('Ponte')] : [tr('Ponte')];
}

/** La risposta dell'IA ({ layout, on: ['bridge', …], split, tip }) → pk, o null. */
function pickupDaIA(pk) {
  if (!pk || typeof pk !== 'object') return null;
  const layout = String(pk.layout || '').toUpperCase().replace(/[^SHMP-]/g, '').slice(0, 3);
  if (!layoutBuono(layout)) return null;
  const posti = layout.length === 3 ? ['neck', 'middle', 'bridge'] : layout.length === 2 ? ['neck', 'bridge'] : ['bridge'];
  const sinonimi = { manico: 'neck', neck: 'neck', centrale: 'middle', middle: 'middle', mid: 'middle', ponte: 'bridge', bridge: 'bridge' };
  const on = (Array.isArray(pk.on) ? pk.on : String(pk.on || '').split(/[\s,+]+/))
    .map(x => sinonimi[String(x).toLowerCase().trim()]).filter(Boolean);
  const veri = postiVeri(layout);
  const attivi = posti.map((p, i) => (on.includes(p) && veri.includes(i) ? i : -1)).filter(i => i >= 0);
  if (!attivi.length) return null;
  const split = pk.split === true || pk.split === 1 || /^(true|1|yes|si|sì)$/i.test(String(pk.split));
  return { layout, attivi, split: split && haHumbucker(layout), consiglio: String(pk.tip || '').trim().slice(0, 300) };
}

/**
 * Gli stessi pickup su un'altra chitarra: con un numero diverso di pickup i posti cambiano, e si
 * tengono manico e ponte (il centrale va solo su una chitarra a tre). Un posto vuoto della chitarra
 * nuova si spegne; se non resta niente, si accende il pickup più vicino al ponte. Modifica pk e lo rende.
 */
function adattaLayout(pk, layout) {
  const prima = pk.layout.length, n = layout.length;
  pk.layout = layout;
  if (n !== prima) {
    pk.attivi = pk.attivi.map(i => (i === prima - 1 ? n - 1 : i === 0 ? 0 : (n === 3 ? 1 : -1)))
      .filter((i, k, a) => i >= 0 && i < n && a.indexOf(i) === k).sort();
  }
  const veri = postiVeri(layout);
  pk.attivi = pk.attivi.filter(i => veri.includes(i));
  if (!pk.attivi.length && veri.length) pk.attivi = [veri[veri.length - 1]];
  if (!haHumbucker(layout)) pk.split = false;
  return pk;
}

/* ---------------------------------------------------------------- la chitarra dell'utente */

// «La mia chitarra» di «Genera con l'IA» (18 novembre, chiesto dall'utente): si ricorda in questo
// browser. '' = non detta: l'IA sceglie la chitarra dell'artista; 'altra' = la costruisce l'utente,
// un pickup per posizione (il ponte c'è sempre, il centrale solo col manico).
// Niente H, S e P da soli fra i pulsanti: un pickup solo non dice se sta al ponte o al manico
// (l'utente non li capiva); una chitarra a un pickup si fa in «Altra», col solo ponte.
const CHITARRE = ['SSS', 'HSS', 'HSH', 'HH', 'SS', 'PP', 'HS'];
// Sotto la sigla, la chitarra tipica (nomi di modelli: non si traducono).
const TIPO_CHITARRA = { SSS: 'Strat', HSS: 'Fat Strat', HSH: 'Superstrat', HH: 'Les Paul', SS: 'Tele',
                        PP: 'P-90', HS: 'Tele Deluxe' };

/** Il disegnino dei pickup per i pulsanti, dal manico al ponte (il layout si scrive dal ponte). */
function miniChitarra(layout) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 60 28');
  svg.setAttribute('aria-hidden', 'true');
  const pezzi = layoutBuono(layout || '') ? layout.split('').reverse() : [];
  const largo = { S: 6, P: 10, M: 10, H: 13 };
  // Ogni posizione al suo posto (manico a sinistra), così un pickup solo al manico si vede lì.
  const xs = pezzi.length === 3 ? [13, 30, 47] : pezzi.length === 2 ? [17, 43] : [30];
  pezzi.forEach((t, i) => {
    if (t === '-') return;
    const x = xs[i] - largo[t] / 2;
    const r = document.createElementNS(NS, 'rect');
    Object.entries({ x, y: t === 'M' ? 5 : 3, width: largo[t], height: t === 'M' ? 18 : 22, rx: t === 'S' ? 3 : 2 })
      .forEach(([k, v]) => r.setAttribute(k, v));
    svg.appendChild(r);
    if (t === 'H' || t === 'M') {
      const l = document.createElementNS(NS, 'line');
      Object.entries({ x1: xs[i], y1: t === 'M' ? 5 : 3, x2: xs[i], y2: t === 'M' ? 23 : 25 }).forEach(([k, v]) => l.setAttribute(k, v));
      svg.appendChild(l);
    }
  });
  if (!pezzi.length) {
    const l = document.createElementNS(NS, 'path');
    // «Altra»: una matita; «Nessuna»: un trattino.
    l.setAttribute('d', layout === 'altra' ? 'M23 21h4l9-9-4-4-9 9zM30.5 10.5l4 4' : 'M22 14h16');
    svg.appendChild(l);
  }
  return svg;
}

const leggi = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* resta per questa volta */ } };

/** Il pulsante scelto: '', 'altra' o una delle `CHITARRE`. */
function sceltaMiaChitarra() {
  const v = leggi('chitarra-pc', '');
  return v === 'altra' || CHITARRE.includes(v) ? v : '';
}

/** La chitarra costruita in «Altra»: { manico, centrale, ponte }, ognuno '' / 'S' / 'H' / 'M' / 'P'. */
function chitarraAltra() {
  let c = null;
  try { c = JSON.parse(leggi('chitarra-pc-altra', 'null')); } catch (e) { c = null; }
  if (!c || typeof c !== 'object') c = { manico: 'H', centrale: '', ponte: 'H' };
  const tipo = v => (['S', 'H', 'M', 'P'].includes(v) ? v : '');
  const pos = { manico: tipo(c.manico), centrale: tipo(c.centrale), ponte: tipo(c.ponte) };
  if (!pos.manico && !pos.centrale && !pos.ponte) pos.ponte = 'H';   // almeno un pickup
  return pos;
}
/**
 * Le posizioni → il layout come si scrive, dal ponte al manico: «HSS»; senza centrale ponte e
 * manico in due lettere («HH»), il solo ponte in una; gli altri casi coi posti vuoti («--H»).
 */
function layoutDa(pos) {
  const v = c => c || '-';
  if (!pos.centrale && pos.ponte && pos.manico) return pos.ponte + pos.manico;
  if (!pos.centrale && !pos.manico) return pos.ponte;
  return v(pos.ponte) + v(pos.centrale) + v(pos.manico);
}

/** La chitarra come layout ('SSS', '--H'…), o '' se non detta. */
function miaChitarra() {
  const v = sceltaMiaChitarra();
  return v === 'altra' ? layoutDa(chitarraAltra()) : v;
}

/** Gli humbucker della chitarra si possono splittare? (Sì finché non si dice di no.) */
const splitPossibile = () => leggi('chitarra-pc-split', 'si') !== 'no';

/** I pulsanti «La mia chitarra»: il disegnino dei pickup, la sigla, la chitarra tipica; in fondo «Altra». */
function sceltaChitarra() {
  const tutto = document.createElement('div');
  const griglia = document.createElement('div');
  griglia.className = 'scelta-chitarra';
  // «Altra»: per ogni posizione il suo pickup, a pulsanti.
  const costruisci = document.createElement('div');
  costruisci.className = 'chitarra-altra';
  // Gli humbucker si splittano? Solo se la chitarra scelta ne ha.
  const rigaSplit = document.createElement('div');
  rigaSplit.className = 'riga-posizione';
  let altra = null;

  const posizione = (nome, scelte) => {
    const riga = document.createElement('div');
    riga.className = 'riga-posizione';
    const etichetta = document.createElement('span');
    etichetta.textContent = nome;
    const fila = document.createElement('div');
    fila.className = 'pk-scelte';
    for (const { testo, sì, quando, spento } of scelte) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = testo;
      b.classList.toggle('sì', sì);
      b.disabled = !!spento;
      b.addEventListener('click', quando);
      fila.appendChild(b);
    }
    riga.append(etichetta, fila);
    return riga;
  };

  const disegnaSplit = () => {
    const l = miaChitarra();
    rigaSplit.hidden = !haHumbucker(l);
    rigaSplit.replaceChildren(...posizione(tr('Humbucker splittabili'), [
      { testo: tr('Sì'), sì: splitPossibile(), quando: () => { scrivi('chitarra-pc-split', 'si'); disegnaSplit(); } },
      { testo: tr('No'), sì: !splitPossibile(), quando: () => { scrivi('chitarra-pc-split', 'no'); disegnaSplit(); } },
    ]).childNodes);
  };

  const disegnaAltra = () => {
    const pos = chitarraAltra();
    const l = layoutDa(pos);
    altra.replaceChild(miniChitarra(l), altra.querySelector('svg'));
    altra.querySelector('span').textContent = l;
    costruisci.textContent = '';
    const quanti = [pos.manico, pos.centrale, pos.ponte].filter(Boolean).length;
    for (const [chiave, nome] of [['manico', tr('Manico')], ['centrale', tr('Centrale')], ['ponte', tr('Ponte')]]) {
      costruisci.appendChild(posizione(nome, ['', 'S', 'H', 'M', 'P'].map(v => ({
        testo: v ? { S: 'Single coil', H: 'Humbucker', M: 'Mini humbucker', P: 'P-90' }[v] : tr('niente'),
        sì: pos[chiave] === v,
        // Almeno un pickup: l'ultimo rimasto non si toglie.
        spento: v === '' && pos[chiave] && quanti === 1,
        quando: () => {
          scrivi('chitarra-pc-altra', JSON.stringify(Object.assign(pos, { [chiave]: v })));
          disegnaAltra();
        },
      }))));
    }
    disegnaSplit();
  };

  const segna = v => {
    griglia.querySelectorAll('button').forEach(x => x.classList.toggle('sì', x.dataset.v === v));
    costruisci.hidden = v !== 'altra';
    disegnaSplit();
  };
  for (const v of [''].concat(CHITARRE, 'altra')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = v;
    b.appendChild(miniChitarra(v));
    const sigla = document.createElement('b');
    sigla.textContent = v === 'altra' ? tr('Altra') : v || tr('Nessuna');
    const tipo = document.createElement('span');
    tipo.textContent = v ? TIPO_CHITARRA[v] || '' : tr('non indicata');
    b.append(sigla, tipo);
    b.addEventListener('click', () => { scrivi('chitarra-pc', v); segna(v); });
    if (v === 'altra') altra = b;
    griglia.appendChild(b);
  }
  disegnaAltra();
  segna(sceltaMiaChitarra());
  tutto.append(griglia, costruisci, rigaSplit);
  return tutto;
}

/** Un pk letto dalla libreria (o da un backup), controllato; null se non va. */
function pickupValido(pk) {
  if (!pk || typeof pk !== 'object' || !layoutBuono(String(pk.layout || '')) || !Array.isArray(pk.attivi)) return null;
  const veri = postiVeri(pk.layout);
  const attivi = pk.attivi.filter(i => Number.isInteger(i) && veri.includes(i));
  if (!attivi.length) return null;
  return { layout: pk.layout, attivi, split: !!pk.split && haHumbucker(pk.layout), consiglio: String(pk.consiglio || '') };
}

/** «HSS (humbucker / single coil) · Ponte · split». */
function descriviPickup(pk) {
  const posti = postiPickup(pk.layout.length);
  const tipo = [...new Set(pk.layout.replace(/-/g, '').split(''))].map(c => TIPI_PICKUP[c]).join(' / ');
  const accesi = pk.attivi.map(i => posti[i]).join(' + ') || '—';
  return `${pk.layout} (${tipo}) · ${accesi}` + (pk.split && haHumbucker(pk.layout) ? ' · split' : '');
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
    if (tipo === '-') return;          // posizione vuota: niente pickup né nome
    const x = xs[i];
    const acceso = pk.attivi.includes(i);
    const g = nodo('g', alClic ? { class: 'pk-cliccabile' } : {}, svg);
    if (tipo === 'H' || tipo === 'M') {
      // Due bobine (il mini humbucker più stretto e più corto); con lo split resta accesa solo quella verso il ponte.
      const mini = tipo === 'M';
      const [mezzo, bob, y0, alto] = mini ? [16, 7, 26, 86] : [20, 9, 18, 102];
      nodo('rect', { x: x - mezzo, y: y0, width: mezzo * 2, height: alto, rx: 5, class: 'pk-spento' }, g);
      [-bob, bob].forEach((dx, b) => {
        const viva = acceso && !(pk.split && b === 0);
        nodo('rect', { x: x + dx - (bob - 1), y: y0 + 4, width: (bob - 1) * 2, height: alto - 8, rx: bob - 1,
          class: viva ? 'pk-acceso' : 'pk-spento' }, g);
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

/** La descrizione, il disegno e il consiglio: nella finestrella e nel risultato di «Genera con l'IA». */
function cartaPickup(pk) {
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
  return corpo;
}

/** La finestrella: il disegno, la descrizione e il consiglio; «Modifica» apre la matita. */
async function mostraPickup() {
  if (!ora) return;
  const pk = pickupValido(ora.pickup);
  if (!pk) return modificaPickup();
  const scelta = await finestra({
    titolo: tr('Pickup consigliati'),
    icona: ICONE.chitarra,
    corpo: cartaPickup(pk),
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
    // Fra le scelte anche la chitarra dell'utente e quella del preset, se sono fuori elenco («--H», «MPS»…).
    for (const l of [...new Set(LAYOUT_PICKUP.concat(miaChitarra() || [], pk.layout))]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = l;
      b.classList.toggle('sì', l === pk.layout);
      b.addEventListener('click', () => { adattaLayout(pk, l); ridisegna(); });
      scelte.appendChild(b);
    }
    const disegno = q('disegno');
    disegno.textContent = '';
    disegno.appendChild(disegnoPickup(pk, i => {
      pk.attivi = pk.attivi.includes(i) ? pk.attivi.filter(x => x !== i) : pk.attivi.concat(i).sort();
      ridisegna();
    }));
    q('split').classList.toggle('sì', !!pk.split);
    q('split').disabled = !haHumbucker(pk.layout);
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
