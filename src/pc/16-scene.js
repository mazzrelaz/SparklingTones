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
// Si salvano da «Salva…» nell'editor («Salva come scena»), si suonano dal quarto modo della Live.
'use strict';

const SCENA_PAUSA = 80;
const SCENA_TETTO = 12;
// Tre scene più la Base: quattro, quanti gli switch di un MIDI controller (regola dell'utente,
// 18 novembre 2026). Lo switch del posto n (1–4 nella metà) suona la Base o la scena n−1.
const SCENE_MAX = 3;

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

/** Il quarto modo della Live: Base e le scene del preset che suona, come pulsantoni. */
function disegnaScene(corpo) {
  const record = recordDiOra();
  const scene = sceneDi(record);
  if (!record || !scene.length) {
    const vuoto = document.createElement('div');
    vuoto.className = 'lv-scene-vuoto';
    vuoto.textContent = record ? tr('Questo preset non ha scene.') : tr('prima fai suonare un preset.');
    corpo.appendChild(vuoto);
    return;
  }
  const attiva = ora.scena === undefined ? null : ora.scena;
  const griglia = document.createElement('div');
  // Gli stessi pulsantoni del modo Preset (chiesto dall'utente): griglia da quattro, LED, nome, switch.
  griglia.className = 'lv-griglia lv-scene';
  [null, ...scene.map((_, i) => i)].forEach(indice => {
    const s = indice === null ? null : scene[indice];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `lv-posto meta-a scena${attiva === indice ? ' sì' : ''}`;
    const n = indice === null ? 0 : indice + 1;
    el.innerHTML = `${etichetteSwitch(sw => sw.preset && !sw.preset.startsWith('g:') && postoDiSwitch(sw) % 4 === n)}<span class="lv-num">${indice === null ? tr('Base') : tr('Scena {0}', indice + 1)}</span>
      <span class="lv-led"></span><span class="lv-nome">${s ? testoConNome(s.nome) : testoConNome(record.name)}</span><span class="lv-sw"></span>`;
    el.addEventListener('click', () => suonaScena(indice));
    if (s) {
      const matita = document.createElement('span');
      matita.className = 'lv-matita';
      matita.title = tr('Rinomina o elimina');
      matita.textContent = '✎';
      matita.addEventListener('click', e => { e.stopPropagation(); rinominaOEliminaScena(record, indice); });
      el.appendChild(matita);
    }
    griglia.appendChild(el);
  });
  corpo.appendChild(griglia);
}

async function rinominaOEliminaScena(record, indice) {
  const scena = record.scene[indice];
  const r = await finestra({
    titolo: tr('scena'),
    campo: { valore: scena.nome },
    azioni: [
      { testo: tr('Annulla'), valore: null },
      { testo: tr('Elimina la scena'), valore: 'via', pericolo: true },
      { testo: tr('Salva il nome'), valore: 'nome', primario: true },
    ],
  });
  if (!r) return;
  const fresco = await store.get(record.id);
  if (!fresco || !fresco.scene || !fresco.scene[indice]) return;
  if (r.azione === 'via') {
    fresco.scene.splice(indice, 1);
    if (ora && ora.scena === indice) ora.scena = null;
  } else {
    const nome = r.testo.replace(/\s+/g, ' ').trim();
    if (!nome) return;
    fresco.scene[indice].nome = nome;
  }
  await store.put(fresco);
  await ricarica(); disegnaTutto();
  disegnaLive();
}

/** Uno switch della pedaliera nel modo Scene: il suo posto nella metà dice quale scena. */
function scenaDaSwitch(s) {
  const i = postoDiSwitch(s);
  if (i < 0) return;
  const n = i % 4;
  if (n === 0) { suonaScena(null); return; }
  if (sceneDi(recordDiOra())[n - 1]) suonaScena(n - 1);
}

/* ---------------------------------------------------------------- «Salva come scena» */

/** Le differenze fra quello che suona e il preset salvato; null se cambia un modello. */
function differenzeScena(record, effetti) {
  const cambi = {}, accesi = {};
  for (let b = 0; b < record.effects.length; b++) {
    const prima = record.effects[b], adesso = effetti[b];
    if (!adesso || adesso.name !== prima.name) return null;
    if (adesso.enabled !== prima.enabled) accesi[adesso.name] = adesso.enabled;
    for (const par of adesso.params) {
      const vecchio = prima.params.find(x => x.index === par.index);
      if (vecchio && Math.abs(vecchio.value - par.value) > 0.001) cambi[adesso.name + '#' + par.index] = par.value;
    }
  }
  return { cambi, accesi };
}

async function salvaComeScena() {
  const record = ora && ora.record ? await store.get(ora.record.id) : null;
  if (!record) {
    await avvisa(tr('scena'), tr('Prima salva il preset in libreria: una scena è una variante di un preset salvato.'));
    return false;
  }
  const diff = differenzeScena(record, ora.effetti);
  if (!diff) {
    await avvisa(tr('scena'), tr('Hai cambiato un modello: una scena cambia solo manopole e acceso/spento. ' +
      'Per un modello diverso serve un preset nuovo.'));
    return false;
  }
  const quanti = Object.keys(diff.cambi).length + Object.keys(diff.accesi).length;
  if (!quanti) {
    await avvisa(tr('scena'), tr('È uguale al preset salvato: non c\'è niente da mettere in una scena.'));
    return false;
  }
  if (sceneDi(record).length >= SCENE_MAX) {
    await avvisa(tr('scena'), tr('Ci sono già {0} scene: eliminane una dalla Live, modo Scene.', SCENE_MAX));
    return false;
  }
  const nome = await chiediTesto(tr('nuova scena'),
    tr('{0} cambi rispetto a <strong>{1}</strong>.', quanti, testoConNome(record.name)),
    tr('Scena {0}', sceneDi(record).length + 1));
  if (nome === null || !nome.trim()) return false;
  record.scene = [...sceneDi(record), { nome: nome.replace(/\s+/g, ' ').trim(), ...diff }];
  await store.put(record);
  await ricarica(); disegnaTutto();
  // Il lavoro è finito nella scena, non nel preset: «modificato» si spegne e la scena resta accesa.
  ora.record = record;
  ora.scena = record.scene.length - 1;
  ora.toccato = false;
  disegnaTutto();
  stato(tr('scena «{0}» salvata in «{1}»', nome.trim(), record.name), 'ok');
  return true;
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
        { nome: 'Solo', cambi: { ...gain(drive, 0.3), ...gain(delay, 0.15) }, accesi: { [delay.name]: true } },
        { nome: 'Pulito', cambi: gain(ampli, -0.4), accesi: { [drive.name]: false } },
      ];
      await store.put(record);
    }
    await ricarica(); disegnaTutto();
  }, 1000);
}
