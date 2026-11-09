// Costruisce «Immagini Spark.html» da «Immagini Pulze.html»: stessa pagina, stesso stile dei prompt,
// i modelli dello Spark 2 al posto di quelli del Pulze. Uso: node genera-immagini-spark.js
'use strict';
const fs = require('fs');
const path = require('path');

const SPARK = 'C:/Users/massi/Progetti Claude/spark';
const PULZE = 'C:/Users/massi/Desktop/Progetti/Immagini Pulze.html';
const USCITA = 'C:/Users/massi/Desktop/Progetti/Immagini Spark.html';

global.window = {};
eval(fs.readFileSync(path.join(SPARK, 'src/spark-effetti.js'), 'utf8'));
const E = window.SparkEffetti;

// L'apparecchio vero e da dove viene (9 novembre 2026). **Il riferimento sono le immagini dell'editor
// classico** (`immagini/classico/`, scelta dell'utente): il pedale che lì è disegnato. Dove il classico
// non dice niente di diverso valgono le fonti ufficiali di Positive Grid (help.positivegrid.com):
//  - Spark: la «Amp & Effect List» dello Spark (ampli e pacchetto Hendrix);
//  - BIAS FX 2: la «Effect List» di BIAS FX 2 Desktop, da cui vengono gli effetti dello Spark (stesso nome);
//  - nome interno: l'identificativo che lo Spark manda (es. `ProCoRat`).
// Vuoto = nessun apparecchio vero: design originale (regola dell'utente).
const VERO = {
  'bias.noisegate': ['', 'originale (BIAS FX 2: PG Original)'],
  LA2AComp: ['Teletronix LA-2A', "classico: l'LA-2A fatto pedale (BIAS FX 2: Studio Comp)"],
  BlueComp: ['Boss CS-3 Compression Sustainer', 'classico (BIAS FX 2 dice Boss CS-1)'],
  Compressor: ['MXR Dyna Comp', 'classico e BIAS FX 2: Red Comp'],
  BassComp: ['', 'nessuna fonte: originale'],
  BBEOpticalComp: ['BBE Opto Stomp', 'classico e BIAS FX 2: Opto Comp'],
  'JH.Vox846': ['Vox V846 wah-wah pedal', 'classico e Spark: J.H. Legendary Wah'],
  AutoWah: ['', 'classico: un wah rosso che non è un modello vero, quindi originale'],
  Booster: ['MXR Micro Amp', 'classico (BIAS FX 2 dice Xotic RC Boost)'],
  KlonCentaurSilver: ['Klon Centaur (gold)', 'classico e BIAS FX 2: Clone Drive'],
  DistortionTS9: ['Ibanez TS-808 Tube Screamer', 'classico'],
  Overdrive: ['Boss OD-3', 'classico e BIAS FX 2: Vintage Overdrive'],
  'JH.AxisFuzz': ['Roger Mayer Axis Fuzz', 'classico e Spark: pacchetto Hendrix'],
  'JH.SupaFuzz': ['Marshall Supa Fuzz', 'classico e Spark: pacchetto Hendrix'],
  'JH.Octavia': ['Roger Mayer Octavia', 'classico e Spark: pacchetto Hendrix'],
  'JH.FuzzTone': ['Maestro FZ-1 Fuzz-Tone', 'classico e Spark: pacchetto Hendrix'],
  Fuzz: ['Dallas Arbiter Fuzz Face (red)', 'classico (BIAS FX 2 dice Dunlop Germanium Fuzz Face)'],
  ProCoRat: ['ProCo RAT', 'classico e nome interno ProCoRat'],
  BassBigMuff: ['Electro-Harmonix Bass Big Muff Pi', 'classico e nome interno BassBigMuff'],
  GuitarMuff: ['Electro-Harmonix Little Big Muff Pi', 'classico (BIAS FX 2 dice Big Muff Pi)'],
  MaestroBassmaster: ['Maestro Bass Brassmaster', 'classico e nome interno MaestroBassmaster'],
  SABdriver: ['Fulltone Plexi-Drive', 'classico (BIAS FX 2 dice Fulltone OCD)'],
  Tremolo: ['Mad Professor Mellow Yellow Tremolo', 'classico (BIAS FX 2 dice Dunlop TS-1)'],
  ChorusAnalog: ['Boss CH-1 Super Chorus', 'classico (BIAS FX 2 dice MXR M134)'],
  Flanger: ['Electro-Harmonix Electric Mistress', 'classico e BIAS FX 2: Flanger'],
  Phaser: ['', 'nessuna fonte: originale'],
  Vibrato01: ['BBE Mind Bender', 'classico e BIAS FX 2: Vibrato'],
  UniVibe: ['Univox Uni-Vibe', 'classico e BIAS FX 2: Uni-Vibe'],
  'JH.VoodooVibeJr': ['Roger Mayer Voodoo-Vibe Jr', 'classico e Spark: pacchetto Hendrix'],
  Cloner: ['Electro-Harmonix Small Clone', 'classico e BIAS FX 2: Cloner'],
  MiniVibe: ['Voodoo Lab Micro Vibe', 'classico (BIAS FX 2 dice Voodoo Lab Analog Chorus)'],
  Tremolator: ['Demeter TRM-1 Tremulator', 'classico e BIAS FX 2: Tremulator'],
  TremoloSquare: ['', 'nessuna fonte: originale'],
  GuitarEQ6: ['MXR M109 Six Band EQ', "classico: l'MXR, ma blu (BIAS FX 2: EQ6)"],
  BassEQ6: ['', 'nessuna fonte: originale'],
  DelayMono: ['Boss DD-3', 'classico e BIAS FX 2: Delay'],
  DelayEchoFilt: ['', 'nessuna fonte: originale'],
  VintageDelay: ['', 'nessuna fonte: originale'],
  DelayReverse: ['', 'classico: un disegno originale (BIAS FX 2 dice EHX Stereo Memory Man)'],
  DelayMultiHead: ['', 'nessuna fonte: originale'],
  DelayRe201: ['Roland RE-201 Space Echo', 'classico e nome interno DelayRe201'],
};
// Gli ampli: la mappa `AMPLI` di spark-effetti.js, che è la lista ufficiale dello Spark (e il classico la segue).
const AMPLI_VERI = { 'JH.Bassman50Silver': 'Fender 1968 Bassman 50', 'JH.DualShowman': 'Fender Dual Showman',
  'JH.Sunn100': 'Sunn 100S', 'JH.SoundCity100': 'Sound City One Hundred', 'JH.JTM45': 'Marshall JTM45/100' };

// Aspetti scritti a mano dove serve (in inglese, come nel Pulze): quello che il classico ha di diverso dall'originale.
const ASPETTO = {
  GuitarEQ6: 'blue enclosure instead of black; six vertical EQ sliders labelled 100, 200, 400, 800, 1.6K, 3.2K plus a level slider, no round knobs',
  BassEQ6: 'six vertical EQ sliders plus a level slider, no round knobs',
  LA2AComp: 'reimagined as a compact stompbox, not a rack unit: grey metal enclosure with corner screws, two black studio knobs with numbered scales, a small red LED',
  UniVibe: 'the original black Uni-Vibe control console (a wide low box, not a stompbox)',
  'JH.Vox846': 'a classic rocker wah pedal with a treadle, no knobs',
  AutoWah: 'a vintage rocker wah-wah pedal: red enclosure, black ribbed treadle, a metal name plate on the front, no knobs',
  DelayReverse: 'blue enclosure with a darker blue zigzag chevron pattern, cream knobs, a small BPM toggle switch, big distressed stencil lettering',
};

const slug = s => s.toLowerCase().replace(/^j\.h\.\s*/, 'jh-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CLASSI = ['Gate', 'Comp e wah', 'Drive', 'Ampli', 'Mod / EQ', 'Delay', 'Riverberi'];
const DATI = [];

function manopoleDi(id) {
  if (id === 'JH.Vox846' || E.aCursori(id)) return [];
  const m = (E.TABELLA[id] || {}).manopole || [];
  return m.filter(n => n !== 'BPM' && n !== 'Tipo');
}

E.MODELLI.forEach((ids, pos) => {
  for (const id of ids) {
    if (id === 'bias.reverb') continue;
    const amp = pos === 3;
    const nome = E.nome(id);
    let vero, fonte, classe;
    if (amp) {
      const reale = AMPLI_VERI[id] || E.ampliReale(id) || '';
      vero = /originale Positive Grid/.test(reale) ? '' : reale;
      fonte = vero ? 'Spark: Amp & Effect List' : 'Spark: PG Original';
      classe = E.ampliGruppo(id);
    } else {
      [vero, fonte] = VERO[id] || ['', 'nessuna fonte'];
      classe = CLASSI[pos === 0 ? 0 : pos === 1 ? 1 : pos === 2 ? 2 : pos === 4 ? 4 : 5];
    }
    if (E.eHendrix(id)) classe = 'Pacchetto Jimi Hendrix';
    DATI.push({ nome, tipo: amp ? 'amp' : 'pedale', classe, gruppo: CLASSI[pos],
      base: vero ? 'Based on ' + vero : 'Positive Grid original design', file: slug(nome) + '.png',
      modelli: [id], manopole: manopoleDi(id), vero, fonte, aspetto: ASPETTO[id] || '' });
  }
});
// L'Auto Wah gratuito: stesso identificativo del Legendary Wah, ma un'altra voce e un'altra immagine.
DATI.splice(DATI.findIndex(d => d.modelli[0] === 'JH.Vox846') + 1, 0, {
  nome: 'Auto Wah', tipo: 'pedale', classe: 'Comp e wah', gruppo: 'Comp e wah', base: 'Positive Grid original design',
  file: 'auto-wah.png', modelli: ['AutoWah'], manopole: ['Sensitivity'], vero: VERO.AutoWah[0], fonte: VERO.AutoWah[1],
  aspetto: ASPETTO.AutoWah });
// I nove riverberi: nove modelli, originali Positive Grid.
for (const tipo of E.nomiPosizioni('bias.reverb', 6)) {
  DATI.push({ nome: tipo, tipo: 'pedale', classe: 'Riverberi', gruppo: 'Riverberi', base: 'Positive Grid original reverb',
    file: 'reverb-' + slug(tipo) + '.png', modelli: ['bias.reverb:' + tipo],
    manopole: ['Level', 'Damping', 'Low Cut', 'High Cut', 'Dwell', 'Time'], vero: '', fonte: 'Spark: PG Original', aspetto: '' });
}

// ---------------------------------------------------------------- la pagina
let h = fs.readFileSync(PULZE, 'utf8');
const sost = (a, b, tutti) => {
  if (!h.includes(a)) throw new Error('manca: ' + a.slice(0, 80));
  h = tutti ? h.split(a).join(b) : h.replace(a, b);
};
h = h.replace(/const DATI = \[.*?\];\n/s, () => 'const DATI = ' + JSON.stringify(DATI) + ';\n');
sost('<title>Immagini Pulze</title>', '<title>Immagini Spark</title>');
sost('<h1>Immagini Pulze</h1>', '<h1>Immagini Spark</h1>');
sost('Le immagini dei modelli del Pulze Mini, una alla volta', 'Le immagini dei modelli dello Spark 2, una alla volta, nello stesso stile di quelle del Pulze');
h = h.replace(/\/\/ I modelli: dal catalogo della Pulze Editor[^\n]*\n\/\/[^\n]*\n\/\/[^\n]*\n/, () =>
  "// I modelli dello Spark 2 (src/spark-effetti.js: nome, manopole) con l'apparecchio vero e la sua fonte: per gli ampli e il\n" +
  "// pacchetto Hendrix la «Amp & Effect List» ufficiale dello Spark, per gli effetti la «Effect List» di BIAS FX 2 (stesso nome),\n" +
  "// o l'identificativo interno; «nessuna fonte» = design originale. I riverberi sono nove modelli. Generato il 2026-11-09\n" +
  "// da genera-immagini-spark.js partendo da «Immagini Pulze.html», di cui resta tutto il resto (stile, prompt, cartella).\n");
sost("'pulze-", "'spark-img-", true);
sost("'immagini-pulze'", "'immagini-spark'", true);
// le linguette: per posto della catena, come lo Spark
sost(`const TAB = [
  ['effetti', 'Effetti', i => i.tipo === 'pedale'],
  ['ampli', 'Ampli', i => i.tipo === 'amp'],
  ['cabinet', 'Cabinet', i => i.tipo === 'cab'],
  ['acustici', 'Acustici', i => i.tipo === 'strumento'],
  ['altro', 'Sound Clone e IR', i => i.tipo === 'clone' || i.tipo === 'ir'],
];`, `const TAB = [
  ['comp', 'Gate, comp e wah', i => i.gruppo === 'Gate' || i.gruppo === 'Comp e wah'],
  ['drive', 'Drive', i => i.gruppo === 'Drive'],
  ['ampli', 'Ampli', i => i.gruppo === 'Ampli'],
  ['mod', 'Mod / EQ', i => i.gruppo === 'Mod / EQ'],
  ['delay', 'Delay', i => i.gruppo === 'Delay'],
  ['riverberi', 'Riverberi', i => i.gruppo === 'Riverberi'],
];`);
sost("let tab = leggi('spark-img-tab') || 'effetti';", "let tab = leggi('spark-img-tab') || 'comp';");
sost("const k = i.tipo === 'amp' ? 'Ampli' : i.classe;", "const k = i.classe;");
// la fonte dell'apparecchio vero, sulla carta e nella finestra
sost("d.querySelector('.sotto').textContent = i.modelli.length > 1 ? 'per ' + i.modelli.join(', ') : i.base;",
  "d.querySelector('.sotto').textContent = (aspetto(i).vero || 'design originale') + ' · ' + i.fonte;");
sost("$('fSotto').textContent = FORMATO[i.tipo] + ' · ' + (i.base || '') + (i.modelli.length > 1 ? ' · per ' + i.modelli.join(', ') : '');",
  "$('fSotto').textContent = FORMATO[i.tipo] + ' · ' + i.modelli.join(', ') + ' · fonte: ' + i.fonte;");
sost("const fabbrica = i => ({ vero: i.vero || (/^based on/i.test(i.base) ? i.base.replace(/^based on (a |an |the )?/i, '') : ''),",
  "const fabbrica = i => ({ vero: i.vero || '',");
fs.writeFileSync(USCITA, h);

const conta = {};
for (const d of DATI) conta[d.gruppo] = (conta[d.gruppo] || 0) + 1;
console.log('scritto', USCITA, DATI.length, 'modelli', conta);
console.log('senza apparecchio vero:', DATI.filter(d => !d.vero).map(d => d.nome).join(', '));
const doppi = DATI.map(d => d.file).filter((f, i, a) => a.indexOf(f) !== i);
if (doppi.length) console.log('FILE DOPPI', doppi);
