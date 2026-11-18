// Sparkling Tones — pc/16-scene.js: le scene di un preset, solo sul PC (bozza, 18 novembre 2026).
//
// Studio e misure in docs/scene.md. Una scena è una variante dello stesso preset: **cambia solo
// manopole e acceso/spento, mai un modello**. Nel record: `record.scene = [{ nome,
// cambi: { 'Effetto#indice': valore }, accesi: { Effetto: bool } }]`.
//
// Si manda **in valori assoluti su un insieme fisso**: per ogni manopola che una qualunque scena del
// preset tocca parte il valore della scena scelta (o del preset, per «Base»), così il risultato non
// dipende da cosa suonava prima. 80 ms fra un comando e l'altro (scelta dell'utente); oltre
// SCENA_TETTO comandi si manda il preset intero con i valori già dentro.
//
// **Tutto dalla schermata Scene della Live** (regola dell'utente): sotto ogni pulsantone la catena
// con le immagini (accesi a colori, spenti al buio); tenendo premuto un pulsantone si apre il
// riquadro che modifica la scena, e la si sente mentre la si regola.
'use strict';

const SCENA_PAUSA = 80;
const SCENA_TETTO = 12;
// Tre scene più la Base: quattro, quanti gli switch di un MIDI controller (regola dell'utente,
// 18 novembre 2026). Lo switch del posto n (1–4 nella metà) suona la Base o la scena n−1.
const SCENE_MAX = 3;
const SCENA_PRESSIONE = 700;   // ms tenendo premuto per aprire il riquadro

live.scene = false;     // il modo Scene della Live

const sceneDi = record => (record && Array.isArray(record.scene)) ? record.scene : [];

/** Il record in libreria di quello che suona, fresco (le scene cambiano anche da qui). */
const recordDiOra = () => (ora && ora.record ? tutti.find(r => r.id === ora.record.id) || ora.record : null);

function presetConScena(record, scena) {
  const p = { effects: copiaEffetti(record.effects) };
  if (!scena) return p;
  for (const e of p.effects) {
    if (e.name in scena.accesi) e.enabled = scena.accesi[e.name];
    for (const par of e.params) {
      const k = e.name + '#' + par.index;
      if (k in scena.cambi) par.value = scena.cambi[k];
    }
  }
  return p;
}

function comandiScena(record, scena) {
  const bersaglio = presetConScena(record, scena);
  const chiavi = new Set(), accesi = new Set();
  for (const s of sceneDi(record)) {
    Object.keys(s.cambi).forEach(k => chiavi.add(k));
    Object.keys(s.accesi).forEach(n => accesi.add(n));
  }
  const comandi = [];
  for (const nome of accesi) {
    const e = bersaglio.effects.find(x => x.name === nome);
    if (e) comandi.push(Spark.commands.effectOnOff(nome, e.enabled));
  }
  for (const k of chiavi) {
    const [nome, i] = k.split('#');
    const e = bersaglio.effects.find(x => x.name === nome);
    const par = e && e.params.find(x => x.index === +i);
    if (par) comandi.push(Spark.commands.changeParam(nome, +i, par.value));
  }
  return { comandi, bersaglio };
}

/** Le differenze fra una catena e il preset salvato: quello che finisce nella scena. */
function differenzeScena(record, effetti) {
  const cambi = {}, accesi = {};
  record.effects.forEach((prima, b) => {
    const adesso = effetti[b];
    if (adesso.enabled !== prima.enabled) accesi[adesso.name] = adesso.enabled;
    for (const par of adesso.params) {
      const vecchio = prima.params.find(x => x.index === par.index);
      if (vecchio && Math.abs(vecchio.value - par.value) > 0.001) cambi[adesso.name + '#' + par.index] = par.value;
    }
  });
  return { cambi, accesi };
}

let scenaInCorso = false;

async function suonaScena(indice) {
  const record = recordDiOra();
  if (!record || scenaInCorso) return;
  const scena = indice === null ? null : sceneDi(record)[indice];
  const { comandi, bersaglio } = comandiScena(record, scena);
  // Il palco segue la scena: l'editor mostra le manopole come suonano. Non è lavoro da salvare.
  const prima = ora.toccato;
  ora.effetti = copiaEffetti(bersaglio.effects);
  ora.scena = indice;
  ora.toccato = prima;
  disegnaTutto();
  disegnaLive();
  if (ora.offline || !spark.connected) return;
  scenaInCorso = true;
  try {
    if (comandi.length > SCENA_TETTO) {
      await spark.loadPreset(Object.assign({}, record, { effects: bersaglio.effects }));
    } else {
      for (const c of comandi) {
        await spark.send(c);
        await new Promise(r => setTimeout(r, SCENA_PAUSA));
      }
    }
  } catch (err) {
    stato(tr('errore: {0}', err.message), 'errore');
  }
  scenaInCorso = false;
}

/* ---------------------------------------------------------------- la schermata */

// Sotto i pulsantoni la catena è fatta di quadrati pastello col nome dell'effetto (chiesto
// dall'utente): il noise gate da solo in alto al centro, poi comp, drive, ampli e sotto mod, delay,
// riverbero. Ogni tipo ha il suo colore; gli spenti sono scuri, col nome spento. [riga, colonna].
const DISPOSIZIONE_133 = [[1, 2], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]];
const COLORI_BLOCCO = ['#d5dae2', '#b9ead7', '#ffc2bd', '#ffdcb5', '#d4c6ec', '#bcd6f0', '#f6cfe4'];

/**
 * La catena di una scena, con gli spenti al buio. `quando` la rende cliccabile (il riquadro, in fila);
 * senza, è quella sotto il pulsantone, a U.
 */
function catenaScena(effetti, quando) {
  const div = document.createElement('div');
  div.className = 'lv-catena ' + (quando ? 'fila' : 'quadri');
  effetti.forEach((e, b) => {
    const img = immagineBlocco(e);
    const el = document.createElement(quando ? 'button' : 'span');
    if (quando) el.type = 'button';
    else {
      el.style.gridRow = DISPOSIZIONE_133[b][0];
      el.style.gridColumn = DISPOSIZIONE_133[b][1];
      el.style.setProperty('--colore', COLORI_BLOCCO[b]);
    }
    el.className = 'lv-anello' + (e.enabled ? '' : ' spento');
    el.title = `${tr(Spark.CATENA[b])} · ${nomeBlocco(e)} · ${e.enabled ? tr('acceso') : tr('spento')}`;
    el.innerHTML = quando && img ? `<img src="${img}" alt="">` : `<span class="lv-anello-nome">${testoConNome(nomeBlocco(e))}</span>`;
    if (quando) el.addEventListener('click', () => quando(b));
    div.appendChild(el);
  });
  // La linea si traccia quando la catena è sulla pagina e ha le sue misure.
  setTimeout(() => tracciaFilo(div), 0);
  return div;
}

/**
 * La linea della catena, come quella della catena in home: sottile, grigia, dietro le immagini, con
 * un pallino IN dove entra il suono e uno OUT dove esce. Niente frecce. Nella U il percorso è ad
 * angoli retti: IN a sinistra → gate → giù e a sinistra → 2, 3, 4 → a destra → 5, 6, 7 → su fino a OUT, in alto.
 */
function tracciaFilo(catena) {
  if (!catena.isConnected || !catena.classList.contains('fila')) return;   // la linea solo nel riquadro
  catena.querySelectorAll('.lv-filo').forEach(s => s.remove());
  const base = catena.getBoundingClientRect();
  const c = [...catena.querySelectorAll('.lv-anello')].map(a => {
    const r = a.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, alto: r.top - base.top, basso: r.bottom - base.top };
  });
  if (c.length < 7) return;
  const margine = 10;
  let punti;
  if (catena.classList.contains('a-u')) {
    const meta = (c[0].basso + c[1].alto) / 2;                // fra il gate e la prima riga sotto
    punti = [[margine, c[0].y], [c[0].x, c[0].y], [c[0].x, meta], [c[1].x, meta],
      [c[1].x, c[3].y], [c[4].x, c[3].y], [c[4].x, margine]];   // OUT in alto, sopra la colonna destra
  } else {
    punti = [[margine, c[0].y], ...c.map(p => [p.x, p.y]), [base.width - margine, c[0].y]];
  }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'lv-filo');
  svg.setAttribute('width', base.width);
  svg.setAttribute('height', base.height);
  const linea = document.createElementNS(ns, 'polyline');
  linea.setAttribute('points', punti.map(p => p.join(',')).join(' '));
  svg.appendChild(linea);
  const fine = punti[punti.length - 1], inAlto = fine[1] === margine;
  for (const [[x, y], testo, aLato] of [[punti[0], 'IN', false], [fine, 'OUT', inAlto]]) {
    const tondo = document.createElementNS(ns, 'circle');
    tondo.setAttribute('cx', x); tondo.setAttribute('cy', y); tondo.setAttribute('r', 6);
    const scritta = document.createElementNS(ns, 'text');
    scritta.setAttribute('x', aLato ? x + 12 : x); scritta.setAttribute('y', aLato ? y + 4 : y + 20);
    if (aLato) scritta.setAttribute('text-anchor', 'start');
    scritta.textContent = testo;
    svg.append(tondo, scritta);
  }
  catena.prepend(svg);
}
addEventListener('resize', () => document.querySelectorAll('.lv-catena').forEach(tracciaFilo));

/** Il quarto modo della Live: Base e tre scene, ognuna con la sua catena sotto. */
function disegnaScene(corpo) {
  const record = recordDiOra();
  if (!record) {
    const vuoto = document.createElement('div');
    vuoto.className = 'lv-scene-vuoto';
    vuoto.textContent = tr('prima fai suonare un preset.');
    corpo.appendChild(vuoto);
    return;
  }
  const scene = sceneDi(record);
  const attiva = ora.scena === undefined ? null : ora.scena;
  const griglia = document.createElement('div');
  // Gli stessi pulsantoni del modo Preset (chiesto dall'utente): griglia da quattro, LED, nome, switch.
  griglia.className = 'lv-griglia lv-scene';
  [null, 0, 1, 2].slice(0, SCENE_MAX + 1).forEach(indice => {
    const s = indice === null ? null : scene[indice];
    const vuota = indice !== null && !s;
    const n = indice === null ? 0 : indice + 1;
    const colonna = document.createElement('div');
    colonna.className = 'lv-colonna';
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `lv-posto meta-a scena${!vuota && attiva === indice ? ' sì' : ''}${vuota ? ' vuoto' : ''}`;
    el.innerHTML = `${etichetteSwitch(sw => sw.preset && !sw.preset.startsWith('g:') && postoDiSwitch(sw) % 4 === n)}<span class="lv-num">${indice === null ? tr('Base') : tr('Scena {0}', n)}</span>
      <span class="lv-led"></span><span class="lv-nome">${s ? testoConNome(s.nome) : vuota ? tr('vuota') : testoConNome(record.name)}</span><span class="lv-sw"></span>
      <span class="lv-carica"></span>`;
    // Un clic suona; tenendo premuto si apre il riquadro (sulla Base no: il preset si cambia nell'editor).
    let lunga = false, timer = null;
    const molla = () => { clearTimeout(timer); el.classList.remove('carica'); };
    if (indice !== null) {
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        lunga = false;
        el.classList.add('carica');
        timer = setTimeout(() => { lunga = true; molla(); apriRiquadroScena(record, indice); }, SCENA_PRESSIONE);
      });
      el.addEventListener('pointerup', molla);
      el.addEventListener('pointerleave', molla);
    }
    el.addEventListener('click', () => {
      if (lunga) { lunga = false; return; }
      if (!vuota) suonaScena(indice);
    });
    colonna.appendChild(el);
    colonna.appendChild(vuota ? Object.assign(document.createElement('div'), { className: 'lv-catena vuota' })
      : catenaScena(presetConScena(record, s).effects));
    griglia.appendChild(colonna);
  });
  corpo.appendChild(griglia);
}

/** Uno switch della pedaliera nel modo Scene: il suo posto nella metà dice quale scena. */
function scenaDaSwitch(s) {
  const i = postoDiSwitch(s);
  if (i < 0) return;
  const n = i % 4;
  if (n === 0) { suonaScena(null); return; }
  if (sceneDi(recordDiOra())[n - 1]) suonaScena(n - 1);
}

/* ---------------------------------------------------------------- il riquadro della scena */

// Le manopole mosse nel riquadro partono subito, una alla volta con la solita pausa: si tiene
// solo l'ultimo valore per manopola, e l'ultimo parte sempre.
const codaScena = new Map();
let timerCodaScena = null;
function mandaInScena(chiave, comando) {
  if (!ora || ora.offline || !spark.connected) return;
  codaScena.set(chiave, comando);
  if (!timerCodaScena) timerCodaScena = setTimeout(svuotaCodaScena, SCENA_PAUSA);
}
async function svuotaCodaScena() {
  const comandi = [...codaScena.values()];
  codaScena.clear();
  for (const c of comandi) {
    try { await spark.send(c); } catch (err) { stato(tr('errore: {0}', err.message), 'errore'); }
    await new Promise(r => setTimeout(r, SCENA_PAUSA));
  }
  timerCodaScena = codaScena.size ? setTimeout(svuotaCodaScena, SCENA_PAUSA) : null;
}

async function apriRiquadroScena(record, indice) {
  record = await store.get(record.id);
  if (!record) return;
  const scene = sceneDi(record);
  const nuova = !scene[indice];
  if (nuova) indice = scene.length;          // le scene stanno in fila: una nuova va dopo le altre
  // Si lavora su una copia della catena; mentre la si regola, la scena suona.
  const lavoro = presetConScena(record, scene[indice] || null).effects;
  if (!nuova) await suonaScena(indice);
  else { ora.effetti = copiaEffetti(lavoro); ora.scena = null; }
  let scelto = 2;   // si parte dal drive

  const corpo = document.createElement('div');
  corpo.className = 'riquadro-scena';
  const disegna = () => {
    corpo.textContent = '';
    corpo.appendChild(catenaScena(lavoro, b => { scelto = b; disegna(); }));
    corpo.querySelectorAll('.lv-anello')[scelto].classList.add('scelto');
    const e = lavoro[scelto];
    const testa = document.createElement('div');
    testa.className = 'rs-testa';
    testa.innerHTML = `<b>${tr(Spark.CATENA[scelto])} · ${testoConNome(nomeBlocco(e))}</b>`;
    const leva = document.createElement('button');
    leva.type = 'button';
    leva.className = 'rs-acceso' + (e.enabled ? ' sì' : '');
    leva.textContent = e.enabled ? tr('acceso') : tr('spento');
    leva.addEventListener('click', () => {
      e.enabled = !e.enabled;
      mandaInScena('acceso#' + e.name, Spark.commands.effectOnOff(e.name, e.enabled));
      disegna();
    });
    testa.appendChild(leva);
    corpo.appendChild(testa);
    const manopole = document.createElement('div');
    manopole.className = 'rs-manopole';
    // Solo le manopole: niente modello, niente tipo di riverbero (una scena non cambia modello).
    for (const p of manopoleVere(e)) {
      if (SparkEffetti.posizioni(e.name, p.index)) continue;
      const riga = document.createElement('label');
      riga.className = 'rs-manopola';
      const interr = SparkEffetti.interruttore(e.name, p.index);
      riga.innerHTML = `<span>${testoConNome(nomeManopola(e, p))}</span>`;
      const cursore = document.createElement('input');
      cursore.type = 'range';
      cursore.min = 0; cursore.max = interr ? 1 : 100; cursore.step = 1;
      cursore.value = interr ? (p.value >= 0.5 ? 1 : 0) : Math.round(p.value * 100);
      const val = document.createElement('output');
      const scrivi = () => { val.textContent = interr ? (p.value >= 0.5 ? 'ON' : 'OFF') : (p.value * 10).toFixed(1); };
      scrivi();
      cursore.addEventListener('input', () => {
        p.value = interr ? +cursore.value : cursore.value / 100;
        scrivi();
        mandaInScena(e.name + '#' + p.index, Spark.commands.changeParam(e.name, p.index, p.value));
      });
      riga.append(cursore, val);
      manopole.appendChild(riga);
    }
    corpo.appendChild(manopole);
  };
  disegna();

  const azioni = [{ testo: tr('Annulla'), valore: null }];
  if (!nuova) azioni.push({ testo: tr('Elimina la scena'), valore: 'via', pericolo: true });
  azioni.push({ testo: tr('Salva la scena'), valore: 'salva', primario: true });
  const promessa = finestra({
    titolo: nuova ? tr('nuova scena') : tr('Scena {0}', indice + 1),
    campo: { valore: nuova ? tr('Scena {0}', indice + 1) : scene[indice].nome, invito: tr('nome della scena') },
    corpo,
    azioni,
  });
  const box = corpo.closest('.finestra');
  if (box) box.style.width = 'min(860px, calc(100vw - 32px))';
  const r = await promessa;

  const fresco = await store.get(record.id);
  if (r && fresco) {
    fresco.scene = sceneDi(fresco);
    if (r.azione === 'via') {
      fresco.scene.splice(indice, 1);
      if (ora.scena === indice) ora.scena = null;
    } else {
      const nome = (r.testo || '').replace(/\s+/g, ' ').trim() || tr('Scena {0}', indice + 1);
      fresco.scene[indice] = { nome, ...differenzeScena(fresco, lavoro) };
    }
    await store.put(fresco);
    await ricarica();
    if (ora && ora.record && ora.record.id === fresco.id) ora.record = fresco;
  }
  // Si torna a quello che deve suonare: la scena salvata, o quella di prima se si annulla o si elimina.
  await suonaScena(r && r.azione === 'salva' ? indice : (ora.scena === undefined ? null : ora.scena));
}

/* ---- SOLO BOZZA (pc.html?bozza#finto): due preset finti con le scene già fatte. ---- */
if (/bozza/.test(location.search)) {
  // La libreria la riempie l'ampli finto quando si collega: si aspetta che ci sia.
  const aspetta = setInterval(async () => {
    const elenco = await store.all();
    if (!elenco.length) return;
    clearInterval(aspetta);
    for (const record of elenco.slice(0, 2)) {
      if (sceneDi(record).length) continue;
      const fx = record.effects;
      const drive = fx[2], delay = fx[5], ampli = fx[3];
      const gain = (e, d) => ({ [e.name + '#0']: Math.max(0, Math.min(1, e.params[0].value + d)) });
      record.scene = [
        { nome: 'Ritmica', cambi: gain(drive, -0.2), accesi: { [delay.name]: false } },
        { nome: 'Solo', cambi: { ...gain(drive, 0.3), ...gain(delay, 0.15) }, accesi: { [delay.name]: true, [drive.name]: true } },
        { nome: 'Pulito', cambi: gain(ampli, -0.4), accesi: { [drive.name]: false } },
      ];
      await store.put(record);
    }
    await ricarica(); disegnaTutto();
  }, 1000);
}
