// Sparkling Tones — pc/07-banchi.js: i banchi, in una schermata come le Songlist del Pulze editor.
//
// A sinistra la libreria, da cui si trascina; a destra un riquadro per banco con i suoi otto posti
// (quattro per piede, come i pulsantoni della vista Live). Il banco «Ampli» è quello degli slot e
// non si modifica qui. Le regole sono quelle della vista Live dell'app: **i banchi dell'utente non
// scrivono mai sull'ampli** (stanno solo in libreria), un clic su un posto fa suonare quel preset
// (istantaneo con `0x0138` se sta in uno slot, altrimenti nel preset software) e lo porta sul palco.
'use strict';

let schermoBanchi = null;

function apriBanchi() {
  chiudiSchermi();
  schermoBanchi = document.createElement('div');
  schermoBanchi.className = 'schermo';
  schermoBanchi.innerHTML = `
    <div class="sch-cima">
      <h2>${tr('Banchi')}${aiuto('banchi')}</h2>
      <span class="spazio"></span>
      <button data-f="nuovo" class="primario">${tr('Nuovo banco')}</button>
      <button data-f="chiudi" title="${tr('Chiudi')}">✕</button>
    </div>
    <div class="sch-corpo">
      <aside class="sl-preset">
        <input type="search" data-f="cerca" placeholder="${tr('cerca un preset…')}" autocomplete="off">
        <ul class="sl-elenco" data-f="elenco"></ul>
      </aside>
      <div class="bl-blocchi" data-f="blocchi"></div>
    </div>`;
  document.body.appendChild(schermoBanchi);
  const q = f => schermoBanchi.querySelector(`[data-f="${f}"]`);
  q('chiudi').addEventListener('click', chiudiSchermi);
  q('nuovo').addEventListener('click', nuovoBanco);
  q('cerca').addEventListener('input', disegnaBanchi);
  disegnaBanchi();
}

function chiudiSchermi() {
  if (schermoBanchi) { schermoBanchi.remove(); schermoBanchi = null; }
  if (typeof chiudiPedale === 'function') chiudiPedale();
  if (typeof chiudiAccordatore === 'function') chiudiAccordatore();
  if (typeof chiudiLive === 'function') chiudiLive();
}

addEventListener('keydown', e => {
  if (e.key === 'Escape' && !tendinaAperta && !finestraAperta && (schermoBanchi || schermoPedale || schermoTuner)) chiudiSchermi();
});

/** Suona un preset da un banco, come un pulsantone della vista Live, e lo porta sul palco. */
function suonaDalBanco(record) {
  if (!record) return;
  return residente(record) ? apriSlot(slotsDi(record)[0]) : apriRecord(record);
}

const suonaOra = record => !!(ora && record && (ora.record && ora.record.id === record.id ||
  ora.slot !== null && slotsDi(record).includes(ora.slot)));

function disegnaBanchi() {
  if (!schermoBanchi) return;
  const q = f => schermoBanchi.querySelector(`[data-f="${f}"]`);

  // La libreria, da cui si trascina.
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
    for (const s of slotsDi(r)) li.appendChild(etichettaAmpli(s));
    li.addEventListener('dblclick', () => suonaDalBanco(r));
    trascinabile(li, { record: r });
    elenco.appendChild(li);
  }
  if (!candidati.length) elenco.innerHTML = `<li class="nome" style="cursor:default;color:var(--faint)">${tr('Nessun preset.')}</li>`;
  elenco.scrollTop = scorri;

  // I banchi.
  const blocchi = q('blocchi');
  const scorriB = blocchi.scrollTop;
  blocchi.textContent = '';
  blocchi.appendChild(bloccoBanco(null));
  for (const b of banchi) blocchi.appendChild(bloccoBanco(b));
  const nuovo = document.createElement('button');
  nuovo.type = 'button';
  nuovo.className = 'bl-nuovo';
  nuovo.textContent = tr('＋ nuovo banco');
  nuovo.addEventListener('click', nuovoBanco);
  blocchi.appendChild(nuovo);
  blocchi.scrollTop = scorriB;
}

/** Il riquadro di un banco; `null` è il banco «Ampli» (gli slot, solo da guardare e suonare). */
function bloccoBanco(banco) {
  const box = document.createElement('div');
  box.className = 'bl-blocco' + (banco ? '' : ' ampli');
  const posti = banco ? banco.posti.map(id => (id === null ? null : perId(id))) : suAmpli.slice();
  const pieni = posti.filter(Boolean).length;

  const testa = document.createElement('div');
  testa.className = 'bl-testa';
  testa.innerHTML = `<span class="bl-nome">${testoConNome(banco ? banco.nome : tr('Ampli'))}</span>
    <span class="bl-conta">${pieni}/${posti.length}</span>`;
  if (banco) {
    const matita = document.createElement('button');
    matita.className = 'mini-tasto';
    matita.textContent = '✎';
    matita.title = tr('rinomina o elimina il banco');
    matita.addEventListener('pointerdown', e => e.stopPropagation());   // la matita non prende il banco
    matita.addEventListener('click', () => rinominaOEliminaBanco(banco));
    testa.appendChild(matita);
    box.dataset.banco = banco.id;
    // Presa per la testa, il banco intero si sposta fra gli altri (come le Songlist del Pulze).
    testa.addEventListener('pointerdown', e => trascinaBanco(e, box));
  } else {
    testa.title = tr('gli slot dell\'ampli: sempre istantanei. Si cambiano scrivendo un preset in uno slot.');
  }
  box.appendChild(testa);

  const ul = document.createElement('ul');
  ul.className = 'bl-posti';
  posti.forEach((record, posto) => {
    const li = document.createElement('li');
    li.className = (record ? '' : 'vuoto') + (suonaOra(record) ? ' suona' : '') + (posto === 4 && posti.length === 8 ? ' lato' : '');
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = banco ? posto + 1 : nomeSlot(posto);
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = record ? record.name : banco ? tr('vuoto') : tr('non ancora letto');
    li.append(n, nome);
    if (banco) {
      li.dataset.banco = banco.id;
      li.dataset.posto = posto;
      if (record) {
        const via = document.createElement('button');
        via.className = 'mini-tasto via';
        via.textContent = '✕';
        via.title = tr('togli dal banco (il preset resta in libreria)');
        via.addEventListener('pointerdown', e => e.stopPropagation());
        via.addEventListener('click', async e => {
          e.stopPropagation();
          await store.setBankSlot(banco.id, posto, null);
          await aggiornaBanchi();
        });
        li.appendChild(via);
        trascinabile(li, { record, banco, posto });
      }
    }
    if (record) li.addEventListener('click', () => { if (!trascinato) suonaDalBanco(record); });
    ul.appendChild(li);
  });
  box.appendChild(ul);

  if (banco) {
    const piede = document.createElement('div');
    piede.className = 'bl-piede';
    const pedale = document.createElement('button');
    pedale.type = 'button';
    pedale.textContent = tr('Manda al pedale…');
    pedale.disabled = !pieni;
    pedale.addEventListener('click', () => apriPedale(banco.id));
    piede.appendChild(pedale);
    box.appendChild(piede);
  }
  return box;
}

async function aggiornaBanchi() {
  await ricarica();
  disegnaBanchi();
  disegnaLibreria();
  if (typeof aggiornaPallinoPedale === 'function') aggiornaPallinoPedale();
}

async function nuovoBanco() {
  const r = await finestra({ titolo: tr('nuovo banco'),
    campo: { valore: tr('Banco {0}', banchi.length + 1) },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Crea il banco'), valore: true, primario: true }] });
  if (!r) return;
  await store.addBank(r.testo);
  await aggiornaBanchi();
}

async function rinominaOEliminaBanco(banco) {
  const r = await finestra({ titolo: tr('banco'),
    campo: { valore: banco.nome },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Elimina il banco'), valore: 'via', pericolo: true },
             { testo: tr('Salva il nome'), valore: 'nome', primario: true }] });
  if (!r) return;
  if (r.azione === 'via') {
    if (!await conferma(tr('eliminare il banco'), tr('Eliminare il banco <strong>{0}</strong>? I preset restano in libreria.',
      testoConNome(banco.nome)), { ok: tr('Elimina'), pericolo: true })) return;
    await store.removeBank(banco.id);
  } else if (r.testo.trim() && r.testo.trim() !== banco.nome) {
    await store.renameBank(banco.id, r.testo.trim());
  }
  await aggiornaBanchi();
}

/* ---------------------------------------------------------------- il trascinamento
   Col mouse, senza il drag and drop del browser: si prende una riga (della libreria o di un
   banco), un fantasma segue il puntatore, e dove la si lascia — un posto, o la testa di un banco
   (il primo posto libero) — va il preset. Da posto a posto si scambiano. */
let presa = null, trascinato = false;

/** `sbiadito`: l'elemento che si sbiadisce mentre lo si porta (di solito quello preso; per un banco il riquadro). */
function trascinabile(el, cosa, sbiadito) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    presa = { cosa, el: sbiadito || el, x: e.clientX, y: e.clientY, fantasma: null, sopra: null };
    trascinato = false;
  });
}

/**
 * Un banco preso per la testa, come i blocchi delle Songlist del Pulze: una sua copia segue il mouse
 * (appena inclinata), al suo posto resta un riquadro tratteggiato che si sposta nella griglia mentre
 * gli altri banchi scivolano (FLIP); lasciando, la copia atterra sul riquadro e l'ordine si salva.
 * Niente `requestAnimationFrame` (nel riquadro del browser non gira): la transizione parte dopo un
 * ricalcolo forzato della posizione.
 */
function trascinaBanco(e, b) {
  if (e.button !== 0 || !schermoBanchi) return;
  const griglia = schermoBanchi.querySelector('[data-f="blocchi"]');
  const x0 = e.clientX, y0 = e.clientY;
  let copia = null, dx = 0, dy = 0, ultimoScambio = 0;
  const muovi = ev => {
    if (!copia) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      const r = b.getBoundingClientRect();
      dx = x0 - r.left; dy = y0 - r.top;
      copia = b.cloneNode(true);
      copia.classList.add('blocco-volante');
      copia.style.width = r.width + 'px';
      copia.style.height = r.height + 'px';
      schermoBanchi.appendChild(copia);
      b.classList.add('segnaposto');
      schermoBanchi.classList.add('trascina');
    }
    ev.preventDefault();
    copia.style.transform = `translate(${ev.clientX - dx}px, ${ev.clientY - dy}px) rotate(1.5deg)`;
    // vicino ai bordi la griglia scorre da sola
    const rg = griglia.getBoundingClientRect();
    if (ev.clientY < rg.top + 40) griglia.scrollTop -= 12;
    else if (ev.clientY > rg.bottom - 40) griglia.scrollTop += 12;
    // un altro banco sotto il mouse: il riquadro tratteggiato va al suo posto (al più uno scambio ogni
    // 200 ms, così i banchi che stanno scivolando non rimbalzano)
    const sotto = document.elementFromPoint(ev.clientX, ev.clientY);
    const t = sotto && sotto.closest('.bl-blocco[data-banco]');
    if (!t || t === b || !griglia.contains(t) || performance.now() - ultimoScambio < 200) return;
    ultimoScambio = performance.now();
    const figli = [...griglia.children];
    const prima = new Map(figli.map(x => [x, x.getBoundingClientRect()]));
    griglia.insertBefore(b, figli.indexOf(b) < figli.indexOf(t) ? t.nextSibling : t);
    for (const x of figli) {
      if (x === b) continue;
      const r0 = prima.get(x), r1 = x.getBoundingClientRect();
      if (r0.left === r1.left && r0.top === r1.top) continue;
      x.style.transition = 'none';
      x.style.transform = `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px)`;
      x.getBoundingClientRect();                 // fissa la partenza, poi scivola al posto nuovo
      x.style.transition = 'transform 0.18s ease';
      x.style.transform = '';
    }
  };
  const fine = () => {
    document.removeEventListener('pointermove', muovi);
    document.removeEventListener('pointerup', fine);
    document.removeEventListener('pointercancel', fine);
    if (!copia) return;
    // la copia «atterra» sul riquadro tratteggiato, poi si salva e si ridisegna con l'ordine nuovo
    const r = b.getBoundingClientRect();
    copia.style.transition = 'transform 0.15s ease';
    copia.style.transform = `translate(${r.left}px, ${r.top}px)`;
    const ordine = [...griglia.querySelectorAll('.bl-blocco[data-banco]')].map(x => x.dataset.banco);
    setTimeout(async () => {
      copia.remove();
      if (schermoBanchi) schermoBanchi.classList.remove('trascina');
      b.classList.remove('segnaposto');
      await ordinaBanchi(ordine);
    }, 150);
  };
  document.addEventListener('pointermove', muovi);
  document.addEventListener('pointerup', fine);
  document.addEventListener('pointercancel', fine);
}

/** Salva i banchi nell'ordine dato (id come stanno nella griglia); lo stesso ordine vale nella vista Live. */
async function ordinaBanchi(ordine) {
  const salvati = await store.getSetting('banchi', []);
  const nuovi = ordine.map(id => salvati.find(x => String(x.id) === id)).filter(Boolean);
  for (const x of salvati) if (!nuovi.includes(x)) nuovi.push(x);
  if (nuovi.every((x, i) => x === salvati[i])) { disegnaBanchi(); return; }
  await store.setBanks(nuovi);
  await aggiornaBanchi();
}

addEventListener('pointermove', e => {
  if (!presa) return;
  if (!presa.fantasma) {
    if (Math.hypot(e.clientX - presa.x, e.clientY - presa.y) < 6) return;
    presa.fantasma = document.createElement('div');
    presa.fantasma.className = 'fantasma';
    presa.fantasma.textContent = presa.cosa.record.name;
    document.body.appendChild(presa.fantasma);
    presa.el.classList.add('preso');
    if (schermoBanchi) schermoBanchi.classList.add('trascina');
  }
  presa.fantasma.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 8}px)`;
  const sotto = document.elementFromPoint(e.clientX, e.clientY);
  const meta = sotto && (sotto.closest('li[data-posto]') || sotto.closest('.bl-blocco[data-banco]'));
  if (presa.sopra && presa.sopra !== meta) presa.sopra.classList.remove('sopra');
  presa.sopra = meta || null;
  if (meta) meta.classList.add('sopra');
});

addEventListener('pointerup', async () => {
  if (!presa) return;
  const { cosa, el, fantasma, sopra } = presa;
  presa = null;
  if (!fantasma) return;
  trascinato = true;
  setTimeout(() => { trascinato = false; }, 0);   // il clic che segue il rilascio non deve suonare
  fantasma.remove();
  el.classList.remove('preso');
  if (schermoBanchi) schermoBanchi.classList.remove('trascina');
  if (!sopra) return;
  sopra.classList.remove('sopra');
  const banco = banchi.find(b => String(b.id) === sopra.dataset.banco);
  if (!banco) return;
  let posto = sopra.dataset.posto !== undefined ? Number(sopra.dataset.posto) : banco.posti.indexOf(null);

  if (cosa.banco) {
    // Da un posto a un altro: dentro lo stesso banco si scambiano, verso un altro banco si copia.
    if (cosa.banco.id === banco.id) {
      if (posto === cosa.posto || posto < 0) return;
      const altro = banco.posti[posto];
      await store.setBankSlot(banco.id, posto, cosa.record.id);
      await store.setBankSlot(banco.id, cosa.posto, altro);
      await aggiornaBanchi();
      return;
    }
  }
  if (posto < 0) {
    await avvisa(tr('banco pieno'), tr('<strong>{0}</strong> ha tutti e otto i posti occupati: lascialo su un posto per sostituirlo.',
      testoConNome(banco.nome)));
    return;
  }
  await store.setBankSlot(banco.id, posto, cosa.record.id);
  await aggiornaBanchi();
  stato(tr('«{0}» → «{1}», posto {2}', cosa.record.name, banco.nome, posto + 1), 'ok');
});

$('apri-banchi').addEventListener('click', apriBanchi);
