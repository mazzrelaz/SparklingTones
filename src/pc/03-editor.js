// Sparkling Tones — pc/03-editor.js: il palco, la catena, le manopole e quello che parte verso l'ampli.
//
// I comandi e le regole sono quelli dell'editor dell'app (`src/app/09-editor.js`,
// `10-editor-disegno.js`): manopole con `0x0104` autocadenzato (`PAUSA_PARAMETRO`), acceso/spento
// con `0x0115`, cambio di modello con `0x0106` e rilettura della catena, tempo con `0x0176`.
'use strict';

/* ================================================================ il disegno */

function disegnaTutto() {
  const pieno = !!ora;
  $('palco-vuoto').hidden = pieno;
  $('palco').hidden = !pieno;
  $('sezione-catena').hidden = !pieno;
  disegnaTesta();
  disegnaSlot();
  if (!pieno) { disegnaVuoto(); return; }
  disegnaPalco();
  disegnaCatena();
}

function disegnaVuoto() {
  const testo = $('palco-vuoto-testo');
  if (!navigator.bluetooth && !spark.finto) {
    testo.innerHTML = tr('Questo browser non ha il Bluetooth per le pagine web. Apri questa pagina con ' +
      '<b>Chrome</b> o <b>Edge</b> aggiornati.');
    return;
  }
  testo.textContent = spark.connected ? tr('Sto leggendo l\'ampli…') : '';
  if (!spark.connected) {
    const b = document.createElement('button');
    b.className = 'primario';
    b.textContent = tr('Collega');
    b.addEventListener('click', collega);
    testo.appendChild(b);
  }
}

/** Il nome, dove sta, «modificato», il tempo e i tasti che dipendono dallo stato. */
function disegnaTesta() {
  const pieno = !!ora;
  $('preset-nome').textContent = pieno ? ora.nome : '—';
  const dove = $('preset-dove');
  dove.hidden = !pieno;
  if (pieno) {
    dove.textContent = ora.offline ? tr('senza ampli')
      : ora.slot !== null ? nomeSlot(ora.slot) : tr('software');
    dove.title = ora.offline ? tr('copia in libreria: non si sente niente')
      : ora.slot !== null ? tr('lo slot dell\'ampli da cui viene') : tr('il preset software dell\'ampli');
  }
  const mod = $('modificato');
  mod.hidden = !(pieno && (ora.toccato || ascoltoBase));
  mod.classList.toggle('confronto', ascoltoBase);
  mod.textContent = ascoltoBase ? tr('ascolti il preset salvato') : tr('modificato · non salvato');
  mod.title = mod.textContent;   // sotto i 1280 px resta solo il pallino
  $('salva').classList.toggle('da-salvare', pieno && ora.toccato);
  $('salva').disabled = !pieno || ascoltoBase;
  $('esporta').disabled = !pieno;
  $('annulla').disabled = !pieno || ascoltoBase || !storia.indietro.length;
  $('ripeti').disabled = !pieno || ascoltoBase || !storia.avanti.length;
  $('confronta').disabled = !pieno || (!ora.toccato && !ascoltoBase);
  $('confronta').classList.toggle('attivo', ascoltoBase);
  $('bpm').disabled = !pieno || ascoltoBase;
  if (document.activeElement !== $('bpm')) $('bpm').value = pieno ? ora.bpm : '';
  $('rileggi').disabled = !spark.connected;
  // ‹ › si spengono solo mentre l'ampli lavora: qui, perché `occupa` alla fine ridisegna la testa.
  $('prima').disabled = $('dopo').disabled = occupato || ascoltoBase || !(spark.connected || suAmpli.some(Boolean));
  document.body.classList.toggle('fermo', ascoltoBase || occupato);
}

/* ---------------------------------------------------------------- il palco */

function disegnaPalco() {
  const effetto = ora.effetti[ora.scelto];
  if (!effetto) return;
  $('palco').classList.toggle('spento', !effetto.enabled);

  const foto = $('foto');
  foto.textContent = '';
  const src = immagineBlocco(effetto);
  if (src) {
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.onerror = () => { foto.innerHTML = `<span class="foto-vuota">${POSTI[ora.scelto]}</span>`; };
    foto.appendChild(img);
  } else {
    foto.innerHTML = `<span class="foto-vuota">${POSTI[ora.scelto]}</span>`;
  }

  const chip = $('det-chip');
  chip.textContent = POSTI[ora.scelto];
  chip.classList.toggle('on', effetto.enabled);
  chip.onclick = () => cambiaAcceso(ora.scelto);
  $('det-pos').textContent = Spark.CATENA[ora.scelto] + ' · ' + (effetto.enabled ? tr('acceso') : tr('spento'));
  $('det-nome').innerHTML = testoConNome(nomeBlocco(effetto)) + bolloJH(effetto.name);
  const reale = SparkEffetti.ampliReale(effetto.name);
  const gruppo = SparkEffetti.ampliGruppo(effetto.name);
  $('det-sotto').textContent = ora.scelto === 3 && gruppo
    ? gruppo + (reale ? ' · ' + tr('ispirato a {0}', reale) : '')
    : eRiverbero(effetto) ? tr('Riverbero') : '';

  disegnaManopole(effetto);
  disegnaModelli();
}

const TONI = ['Gain', 'Treble', 'Middle', 'Bass', 'Master'];

function disegnaManopole(effetto) {
  const ul = $('manopole');
  ul.textContent = '';
  // Il modello del riverbero sta nell'elenco dei modelli, non fra le manopole.
  const vere = manopoleVere(effetto).filter(p => !(eRiverbero(effetto) && p === paramScelta(effetto)));
  // Gain, Bass, Middle, Treble, Master: l'ordine del frontale, non quello degli indici (come l'app).
  const frontale = vere.length === 5 &&
    TONI.every((t, i) => SparkEffetti.manopola(effetto.name, vere[i].index, vere.length) === t);
  const ordine = frontale ? [0, 3, 2, 1, 4] : vere.map((_, i) => i);
  for (const i of ordine) ul.appendChild(comando(effetto, vere[i]));
}

function comando(effetto, param) {
  const li = document.createElement('li');
  li.className = 'comando';
  const nome = nomeManopola(effetto, param);
  const quante = SparkEffetti.posizioni(effetto.name, param.index);

  if (SparkEffetti.interruttore(effetto.name, param.index)) {
    const acceso = param.value >= 0.5;
    li.classList.add('leva');
    li.classList.toggle('acceso', acceso);
    li.innerHTML = `<svg viewBox="0 0 100 100" width="78" height="78"><rect class="pista-leva" x="33" y="8" width="34" height="84" rx="17"/>
      <circle class="pallino" cx="50" cy="${acceso ? 29 : 71}" r="12"/></svg>`;
    li.addEventListener('click', () => {
      registra(effetto.name + '#' + param.index, true);
      param.value = acceso ? 0 : 1;
      mandaParametro(effetto.name, param.index, param.value);
      disegnaPalco();
    });
    li.append(testoIn('nome', nome), testoIn('val', acceso ? 'ON' : 'OFF'));
    return li;
  }

  if (quante) {
    li.classList.add('largo');
    const nomi = SparkEffetti.nomiPosizioni(effetto.name, param.index);
    const dove = SparkEffetti.posizioneDi(param.value, quante);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta';
    b.textContent = dove >= 0 ? (nomi ? nomi[dove] : tr('posizione {0}', dove + 1))
                              : tr('valore dell\'ampli ({0})', mostraValore(param.value));
    b.addEventListener('click', () => apriTendina(b, t => {
      for (let n = 0; n < quante; n++) {
        voceTendina(t, testoConNome(nomi ? nomi[n] : tr('posizione {0}', n + 1)), () => {
          registra(effetto.name + '#' + param.index, true);
          param.value = SparkEffetti.valorePosizione(n);
          mandaParametro(effetto.name, param.index, param.value);
          disegnaPalco();
        }, { scelta: n === dove });
      }
    }));
    li.append(b, testoIn('nome', nome));
    return li;
  }

  const val = testoIn('val', mostraValore(param.value));
  li.append(girevole(param.value, v => {
    registra(effetto.name + '#' + param.index);
    param.value = v;
    val.textContent = mostraValore(v);
    mandaParametro(effetto.name, param.index, v);
  }), testoIn('nome', nome), val);
  return li;
}

function testoIn(classe, testo) {
  const s = document.createElement('span');
  s.className = classe;
  s.textContent = testo;
  return s;
}

/* La manopola dell'editor classico (`pomello` + `coronaClassica` dell'app): arco sottile crema
   fuori, corpo, corona a 24 denti, anello liscio e tacca bianca. Gli stessi gesti: trascinare in
   verticale (300 px da zero a uno), più la rotella, il Maiusc per andare piano e il doppio clic. */
const CORSA_PX = 300;
const DENTI_CLASSICI = (() => {
  const denti = 24, dentro = 30.5, fuori = 35, passo = 2 * Math.PI / denti;
  const punto = (r, a) => `${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < denti; i++) {
    const a = i * passo;
    d += (i ? 'L' : 'M') + punto(dentro, a) + 'L' + punto(fuori, a + passo * 0.12) +
         'L' + punto(fuori, a + passo * 0.46) + 'L' + punto(dentro, a + passo * 0.58);
  }
  return d + 'Z';
})();

function girevole(valore, cambia) {
  const NS = 'http://www.w3.org/2000/svg', R = 47, GIRO = 2 * Math.PI * R * 0.75;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', 78);
  svg.setAttribute('height', 78);
  svg.classList.add('girevole');
  const el = (tag, attr) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attr) e.setAttribute(k, attr[k]);
    svg.appendChild(e);
    return e;
  };
  el('circle', { cx: 50, cy: 50, r: R, class: 'guida', fill: 'none', 'stroke-dasharray': `${GIRO} 999` });
  const arco = el('circle', { cx: 50, cy: 50, r: R, class: 'arco', fill: 'none' });
  el('circle', { cx: 50, cy: 50, r: 39, class: 'corpo' });
  el('path', { d: DENTI_CLASSICI, class: 'denti' });
  el('circle', { cx: 50, cy: 50, r: 26, class: 'anello' });
  const tacca = el('line', { x1: 50, y1: 25, x2: 50, y2: 41, class: 'tacca' });
  const disegna = () => {
    arco.setAttribute('stroke-dasharray', `${GIRO * valore} 999`);
    tacca.setAttribute('transform', `rotate(${-135 + valore * 270} 50 50)`);
  };
  const metti = v => {
    v = Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
    if (v === valore) return;
    valore = v;
    disegna();
    cambia(v);
  };
  disegna();

  let y0 = null, v0 = 0;
  svg.addEventListener('pointerdown', e => {
    y0 = e.clientY; v0 = valore;
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (y0 === null) return;
    metti(v0 + (y0 - e.clientY) / CORSA_PX * (e.shiftKey ? 0.2 : 1));
  });
  const fine = () => { y0 = null; };
  svg.addEventListener('pointerup', fine);
  svg.addEventListener('pointercancel', fine);
  svg.addEventListener('wheel', e => { e.preventDefault(); metti(valore + (e.deltaY < 0 ? 0.01 : -0.01)); }, { passive: false });
  svg.addEventListener('dblclick', () => metti(0.5));
  return svg;
}

/* ---------------------------------------------------------------- l'elenco dei modelli */

/** I modelli di una posizione, a famiglie: gli ampli per gruppo, gli Hendrix in fondo. */
function famiglieDi(posizione, attuale) {
  const visibile = id => haHendrix() || !SparkEffetti.eHendrix(id) || id === 'JH.Vox846';
  const ids = (SparkEffetti.MODELLI[posizione] || []).filter(visibile);
  // Un modello che l'ampli ha mandato ma che non è in elenco resta in cima: è quello che suona.
  const fuori = attuale && !ids.includes(attuale) ? [[null, [attuale]]] : [];
  if (posizione === 3) {
    const gruppi = SparkEffetti.GRUPPI_AMPLI
      .map(g => [g, ids.filter(id => SparkEffetti.ampliGruppo(id) === g)])
      .filter(([, l]) => l.length);
    return fuori.concat(gruppi);
  }
  const base = ids.filter(id => !SparkEffetti.eHendrix(id) || id === 'JH.Vox846' && !haHendrix());
  const jh = ids.filter(id => !base.includes(id));
  return fuori.concat([[null, base]], jh.length ? [[SparkEffetti.GRUPPO_HENDRIX, jh]] : []);
}

/** I nove riverberi: il modello è la posizione del parametro di scelta. */
function modelliRiverbero(effetto) {
  const p = paramScelta(effetto);
  if (!p) return [];
  const quante = SparkEffetti.posizioni(effetto.name, p.index);
  const nomi = SparkEffetti.nomiPosizioni(effetto.name, p.index) || [];
  const dove = SparkEffetti.posizioneDi(p.value, quante);
  return nomi.map((nome, n) => ({ nome, n, scelto: n === dove }));
}

function scegliRiverbero(posizione, n) {
  const effetto = ora.effetti[posizione];
  const p = paramScelta(effetto);
  if (!p) return;
  registra('modello#' + posizione, true);
  p.value = SparkEffetti.valorePosizione(n);
  mandaParametro(effetto.name, p.index, p.value);
  disegnaPalco();
  disegnaCatena();
}

function disegnaModelli() {
  const ul = $('lista-modelli');
  ul.textContent = '';
  const effetto = ora.effetti[ora.scelto];
  const filtro = $('cerca-modello').value.trim().toLowerCase();
  const passa = nome => !filtro || nome.toLowerCase().includes(filtro);
  const voce = (html, scelto, quando) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = html;
    if (scelto) b.classList.add('sì');
    b.addEventListener('click', quando);
    li.appendChild(b);
    ul.appendChild(li);
  };

  if (eRiverbero(effetto)) {
    for (const m of modelliRiverbero(effetto)) {
      if (passa(m.nome)) voce(testoConNome(m.nome), m.scelto, () => scegliRiverbero(ora.scelto, m.n));
    }
  } else {
    for (const [famiglia, ids] of famiglieDi(ora.scelto, effetto.name)) {
      const visti = ids.filter(id => passa(nomeModello(id)));
      if (!visti.length) continue;
      if (famiglia) {
        const f = document.createElement('li');
        f.className = 'famiglia';
        f.textContent = famiglia;
        ul.appendChild(f);
      }
      for (const id of visti) {
        voce(testoConNome(nomeModello(id)) + bolloJH(id), id === effetto.name, () => cambiaModello(ora.scelto, id));
      }
    }
  }
  if (!ul.children.length) ul.innerHTML = `<li class="nessuno">${tr('Nessun modello')}</li>`;
}
$('cerca-modello').addEventListener('input', () => { if (ora) disegnaModelli(); });

/* ---------------------------------------------------------------- la catena */

function disegnaCatena() {
  const cat = $('catena');
  cat.textContent = '';
  ora.effetti.forEach((effetto, pos) => {
    const a = document.createElement('div');
    a.className = 'anello' + (effetto.enabled ? '' : ' spento') + (pos === ora.scelto ? ' scelto' : '');

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (effetto.enabled ? ' on' : '');
    chip.textContent = POSTI[pos] || String(pos + 1);
    chip.title = tr('acceso / spento');
    chip.addEventListener('click', () => cambiaAcceso(pos));

    const m = document.createElement('div');
    m.className = 'miniatura';
    m.title = tr('sul palco');
    m.innerHTML = `<span class="pos">${pos + 1}</span>`;
    const src = immagineBlocco(effetto);
    if (src) {
      const img = new Image();
      img.src = src;
      img.alt = '';
      m.appendChild(img);
    } else {
      m.insertAdjacentHTML('beforeend', `<span class="senza">${POSTI[pos] || ''}</span>`);
    }
    m.addEventListener('click', () => {
      ora.scelto = pos;
      $('cerca-modello').value = '';
      disegnaPalco();
      disegnaCatena();
    });

    const mod = document.createElement('button');
    mod.type = 'button';
    mod.className = 'mod';
    mod.innerHTML = testoConNome(nomeBlocco(effetto)) + bolloJH(effetto.name);
    if (eRiverbero(effetto)) {
      mod.addEventListener('click', () => apriTendina(mod, t => {
        for (const r of modelliRiverbero(effetto)) {
          voceTendina(t, testoConNome(r.nome), () => scegliRiverbero(pos, r.n), { scelta: r.scelto });
        }
      }));
    } else if ((SparkEffetti.MODELLI[pos] || []).length > 1) {
      mod.addEventListener('click', () => apriTendina(mod, t => {
        for (const [famiglia, ids] of famiglieDi(pos, effetto.name)) {
          if (famiglia) t.insertAdjacentHTML('beforeend', `<div class="famiglia">${testoConNome(famiglia)}</div>`);
          for (const id of ids) {
            voceTendina(t, testoConNome(nomeModello(id)) + bolloJH(id), () => cambiaModello(pos, id),
                        { scelta: id === effetto.name });
          }
        }
      }));
    } else {
      mod.disabled = true;
    }
    a.append(chip, m, mod);
    cat.appendChild(a);
  });
}

/* ================================================================ le modifiche */

/** Qualcosa è cambiato: da qui in poi uscire vuol dire perdere del lavoro. */
function segnaModificato() {
  if (!ora || ora.toccato) return;
  ora.toccato = true;
  disegnaTesta();
}

/** Accende o spegne un blocco (`0x0115`), dall'etichetta della catena o del palco. */
async function cambiaAcceso(pos) {
  const effetto = ora && ora.effetti[pos];
  if (!effetto) return;
  registra('acceso#' + pos, true);
  effetto.enabled = !effetto.enabled;
  // L'ampli scrive l'acceso/spento anche nel parametro che lo rispecchia: lo si segue qui.
  if (SparkEffetti.nomeExtra(effetto.name)) {
    effetto.params.forEach(p => { if (SparkEffetti.extra(effetto.name, p.index)) p.value = effetto.enabled ? 1 : 0; });
  }
  segnaModificato();
  disegnaCatena();
  if (pos === ora.scelto) disegnaPalco();
  if (ora.offline || !spark.connected) return;
  try {
    await spark.send(Spark.commands.effectOnOff(effetto.name, effetto.enabled));
  } catch (err) {
    stato(tr('errore: {0}', err.message), 'errore');
  }
}

/* ---------------------------------------------------------------- l'invio delle manopole
   Autocadenzato, come nell'app: il prossimo invio parte solo quando il precedente è finito, più
   una pausa; si tiene solo l'ultimo valore per manopola e l'ultimo parte sempre.
   `writeWithoutResponse` non ha controllo di flusso, e un ampli strozzato si pianta. */
const PAUSA_PARAMETRO = 90;
const inAttesa = new Map();
let invioInCorso = false, timerInvio = null;

function mandaParametro(nomeEffetto, indice, valore) {
  segnaModificato();
  if (!ora || ora.offline || !spark.connected) return;
  inAttesa.set(nomeEffetto + '#' + indice, { nomeEffetto, indice, valore });
  avviaInvioParametri();
}

function avviaInvioParametri() {
  if (invioInCorso || timerInvio || !inAttesa.size) return;
  timerInvio = setTimeout(svuotaCoda, PAUSA_PARAMETRO);
}

async function svuotaCoda() {
  timerInvio = null;
  invioInCorso = true;
  const daMandare = [...inAttesa.values()];
  inAttesa.clear();
  try {
    for (const { nomeEffetto, indice, valore } of daMandare) {
      await spark.send(Spark.commands.changeParam(nomeEffetto, indice, valore));
    }
  } catch (err) {
    stato(tr('errore: {0}', err.message), 'errore');
    inAttesa.clear();
  }
  invioInCorso = false;
  avviaInvioParametri();
}

/** Aspetta che le manopole girate siano partite tutte. */
async function codaVuota() {
  while (invioInCorso || timerInvio || inAttesa.size) await attendi(30);
}

/* ---------------------------------------------------------------- il tempo */

async function cambiaTempo(bpm) {
  if (!ora) return;
  const n = Math.max(Spark.BPM_MIN, Math.min(Spark.BPM_MAX, Math.round(bpm)));
  if (!isFinite(n) || n === ora.bpm) { disegnaTesta(); return; }
  registra('bpm', true);
  ora.bpm = n;
  segnaModificato();
  disegnaTesta();
  if (ora.offline || !spark.connected) return;
  try { await spark.setBpm(n); } catch (err) { stato(tr('errore: {0}', err.message), 'errore'); }
}

$('bpm').addEventListener('change', () => cambiaTempo(Number($('bpm').value)));
$('bpm').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('bpm').blur();
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (ora) cambiaTempo(ora.bpm + (e.key === 'ArrowUp' ? 1 : -1));
  }
});

// Il tap tempo: la media degli ultimi intervalli; una pausa di oltre 2 s ricomincia la conta.
const colpiTap = [];
$('tap').addEventListener('click', () => {
  if (!ora || $('bpm').disabled) return;
  const adesso = performance.now();
  if (colpiTap.length && adesso - colpiTap[colpiTap.length - 1] > 2000) colpiTap.length = 0;
  colpiTap.push(adesso);
  if (colpiTap.length > 5) colpiTap.shift();
  $('tap').classList.add('battuto');
  setTimeout(() => $('tap').classList.remove('battuto'), 90);
  if (colpiTap.length < 2) return;
  const passo = (colpiTap[colpiTap.length - 1] - colpiTap[0]) / (colpiTap.length - 1);
  cambiaTempo(60000 / passo);
});

/* ---------------------------------------------------------------- il cambio di modello */

/**
 * Con l'ampli: `0x0106` col nome di adesso (riletto se non ci si fida più), un secondo di
 * respiro, e la catena riletta dall'ampli per vedere se il modello è cambiato davvero.
 * Senza ampli: **prima si copia** un blocco vero dalla libreria, **poi si costruisce** dalla
 * tabella (`campioneModello`). Un ampli prende il nome nuovo e tiene le sue cinque manopole.
 */
async function cambiaModello(posizione, nuovo) {
  if (!ora) return;
  const blocco = ora.effetti[posizione];
  if (!blocco || blocco.name === nuovo) return;
  const vecchio = blocco.name;

  if (ora.offline) {
    let params = null, da = null;
    if (SparkEffetti.ampliGruppo(nuovo) && blocco.params.length === 5) {
      params = blocco.params;
    } else {
      const campione = campioneModello(nuovo);
      if (campione) { params = campione.params; da = campione.da; }
      else {
        const quante = SparkEffetti.quanteManopole(nuovo);
        if (!quante) {
          stato(tr('senza ampli non posso mettere {0}: non so quante manopole abbia.', nomeModello(nuovo)), 'errore');
          return;
        }
        params = Array.from({ length: quante }, (_, i) => ({ index: i, value: 0.5 }));
      }
    }
    registra('modello#' + posizione, true);
    blocco.name = nuovo;
    blocco.params = params;
    segnaModificato();
    disegnaPalco();
    disegnaCatena();
    stato(da ? tr('{0} → {1}, con le manopole che aveva in «{2}». Senza ampli non si sente.',
                  nomeModello(vecchio), nomeModello(nuovo), da)
             : tr('{0} → {1}. Senza ampli non si sente.', nomeModello(vecchio), nomeModello(nuovo)));
    return;
  }

  if (!spark.connected) { stato(tr('ampli non collegato: il cambio non è partito.'), 'errore'); return; }
  registra('modello#' + posizione, true);
  await occupa(async () => {
    await codaVuota();
    let prima = ora.effetti;
    if (!ora.attendibile) prima = await rileggiCatena();
    if (!prima || !prima[posizione]) {
      stato(tr('non riesco a leggere la catena dall\'ampli: il cambio non è partito.'), 'errore');
      return;
    }
    const daCambiare = prima[posizione].name;
    if (daCambiare === nuovo) return;
    stato(tr('sostituisco {0} con {1}…', nomeModello(daCambiare), nomeModello(nuovo)));
    await spark.send(Spark.commands.changeEffectModel(daCambiare, nuovo));
    segnaModificato();
    await attendi(1000);
    const dopo = await rileggiCatena();
    if (!dopo) stato(tr('comando mandato, ma non riesco a rileggere la catena.'), 'errore');
    else if (dopo[posizione] && dopo[posizione].name === nuovo) {
      stato(tr('{0} → {1}. Verificato rileggendo la catena dall\'ampli.', nomeModello(daCambiare), nomeModello(nuovo)), 'ok');
    } else {
      stato(tr('il comando è partito ma quel blocco riporta ancora {0}.', dopo[posizione] ? dopo[posizione].name : '?'), 'errore');
    }
  });
}

/**
 * Rilegge la catena dall'ampli e la mette nel palco. Torna gli effetti, o null: e in quel
 * caso **non tocca niente**, ma da lì in poi non ci si fida più di quello che si vede.
 */
async function rileggiCatena() {
  const letto = await spark.readLiveState();
  if (!ora) return null;
  if (!letto) { ora.attendibile = false; return null; }
  ora.effetti = copiaEffetti(letto.effects);
  ora.attendibile = true;
  if (ora.scelto >= ora.effetti.length) ora.scelto = 0;
  disegnaPalco();
  disegnaCatena();
  return ora.effetti;
}

/** Mentre l'ampli lavora (cambio di modello, A/B, annulla) i comandi non si toccano. */
let occupato = false;
async function occupa(lavoro) {
  occupato = true;
  disegnaTesta();
  try { return await lavoro(); }
  catch (err) { stato(tr('errore: {0}', err.message), 'errore'); }
  finally { occupato = false; disegnaTesta(); }
}

/* ================================================================ annulla, ripeti, A/B
   Prima di ogni modifica a mano si tiene un'istantanea (catena e tempo); la stessa manopola
   girata di seguito è un passo solo. Tornare indietro manda all'ampli **solo le differenze**,
   con gli stessi comandi delle modifiche a mano. La storia si azzera cambiando preset. */
const PASSI = 100, STESSO_GESTO_MS = 800;
const storia = { indietro: [], avanti: [], ultimo: null, quando: 0 };

function azzeraStoria() {
  storia.indietro = [];
  storia.avanti = [];
  storia.ultimo = null;
}

/** @param secco  un gesto che non si fonde col precedente (un clic, non una manopola che gira) */
function registra(chiave, secco) {
  if (!ora) return;
  const adesso = Date.now();
  if (!secco && chiave === storia.ultimo && adesso - storia.quando < STESSO_GESTO_MS) {
    storia.quando = adesso;
    return;
  }
  storia.indietro.push(istantanea());
  if (storia.indietro.length > PASSI) storia.indietro.shift();
  storia.avanti = [];
  storia.ultimo = secco ? null : chiave;
  storia.quando = adesso;
  disegnaTesta();
}

async function annulla() {
  if (!ora || !storia.indietro.length) return;
  const meta = storia.indietro.pop();
  storia.avanti.push(istantanea());
  storia.ultimo = null;
  await applica(meta);
  ora.toccato = true;
  disegnaTesta();
}

async function ripeti() {
  if (!ora || !storia.avanti.length) return;
  const meta = storia.avanti.pop();
  storia.indietro.push(istantanea());
  storia.ultimo = null;
  await applica(meta);
  ora.toccato = true;
  disegnaTesta();
}

$('annulla').addEventListener('click', annulla);
$('ripeti').addEventListener('click', ripeti);

/**
 * Porta il preset sul palco a `meta` ({effetti, bpm}). Con l'ampli manda solo quello che
 * cambia: prima i modelli (`0x0106` e un secondo di respiro), poi le manopole una alla volta
 * (`PAUSA_PARAMETRO` fra l'una e l'altra), poi gli acceso/spento e il tempo. Se un modello è
 * cambiato, alla fine si rilegge la catena per sapere com'è davvero.
 */
async function applica(meta) {
  if (ora.offline || !spark.connected) {
    ora.effetti = copiaEffetti(meta.effetti);
    ora.bpm = meta.bpm;
    disegnaTutto();
    return;
  }
  await occupa(async () => {
    await codaVuota();
    let modelliCambiati = false;
    for (let pos = 0; pos < meta.effetti.length; pos++) {
      const voluto = meta.effetti[pos], qui = ora.effetti[pos];
      if (!qui) continue;
      if (qui.name !== voluto.name) {
        await spark.send(Spark.commands.changeEffectModel(qui.name, voluto.name));
        await attendi(1000);
        modelliCambiati = true;
        qui.name = voluto.name;
        qui.params = voluto.params.map(p => ({ index: p.index, value: NaN }));   // tutte da mandare
      }
      for (const p of voluto.params) {
        if (SparkEffetti.extra(voluto.name, p.index)) continue;   // lo segue l'acceso/spento
        const suo = qui.params.find(q => q.index === p.index);
        if (suo && Math.abs(suo.value - p.value) < 1e-6) continue;
        await spark.send(Spark.commands.changeParam(voluto.name, p.index, p.value));
        await attendi(PAUSA_PARAMETRO);
      }
      if (qui.enabled !== voluto.enabled) {
        await spark.send(Spark.commands.effectOnOff(voluto.name, voluto.enabled));
        await attendi(PAUSA_PARAMETRO);
      }
    }
    if (meta.bpm !== ora.bpm) await spark.setBpm(meta.bpm);
    ora.effetti = copiaEffetti(meta.effetti);
    ora.bpm = meta.bpm;
    if (modelliCambiati) {
      await attendi(300);
      await rileggiCatena();
    }
  });
  disegnaTutto();
}

/* L'A/B: alla prima modifica `ora.base` è il preset com'era salvato. A/B lo fa sentire (Salva e le
   manopole fermi), ripremuto torna alle modifiche. */
let ascoltoBase = false, modificheDaParte = null;

$('confronta').addEventListener('click', async () => {
  if (!ora) return;
  if (!ascoltoBase) {
    if (!ora.toccato) return;
    modificheDaParte = istantanea();
    ascoltoBase = true;
    await applica(ora.base);
  } else {
    ascoltoBase = false;
    await applica(modificheDaParte);
    modificheDaParte = null;
  }
  disegnaTesta();
});
