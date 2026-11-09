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

// L'apparecchio vero e da dove viene. Fonti (lette il 9 novembre 2026):
//  - Spark: help.positivegrid.com, «Amp & Effect List» dello Spark (ampli e pacchetto Hendrix);
//  - BIAS FX 2: help.positivegrid.com, «Effect List» di BIAS FX 2 Desktop, da cui vengono gli effetti
//    dello Spark: vale quando il nome è lo stesso;
//  - nome interno: l'identificativo che lo Spark manda (es. `ProCoRat`), che dice il pedale da sé.
// Vuoto = nessuna fonte: design originale, finché l'utente non scrive un apparecchio.
const VERO = {
  'bias.noisegate': ['', 'BIAS FX 2: Noise Gate = PG Original'],
  LA2AComp: ['Teletronix LA-2A', 'BIAS FX 2: Studio Comp'],
  BlueComp: ['Boss CS-1', 'BIAS FX 2: Blue Comp (le immagini del classico usano il CS-3)'],
  Compressor: ['MXR Dyna Comp', 'BIAS FX 2: Red Comp'],
  BassComp: ['', 'nessuna fonte'],
  BBEOpticalComp: ['BBE Opto Stomp', 'BIAS FX 2: Opto Comp'],
  'JH.Vox846': ['Vox V846 wah-wah pedal', 'Spark: J.H. Legendary Wah'],
  AutoWah: ['Boss AW-2 Auto Wah', 'BIAS FX 2: Auto Wah'],
  Booster: ['Xotic RC Boost', 'BIAS FX 2: Booster (il classico usa l\'MXR Micro Amp)'],
  KlonCentaurSilver: ['Klon Centaur (silver)', 'BIAS FX 2: Clone Drive'],
  DistortionTS9: ['Ibanez TS9 Tube Screamer', 'nome interno DistortionTS9 (il classico usa il TS-808)'],
  Overdrive: ['Boss OD-3', 'BIAS FX 2: Vintage Overdrive'],
  'JH.AxisFuzz': ['Roger Mayer Axis Fuzz', 'Spark: pacchetto Hendrix'],
  'JH.SupaFuzz': ['Marshall Supa Fuzz', 'Spark: pacchetto Hendrix'],
  'JH.Octavia': ['Roger Mayer Octavia', 'Spark: pacchetto Hendrix'],
  'JH.FuzzTone': ['Maestro FZ-1 Fuzz-Tone', 'Spark: pacchetto Hendrix'],
  Fuzz: ['Dunlop Germanium Fuzz Face', 'BIAS FX 2: VintageFuzz'],
  ProCoRat: ['ProCo RAT', 'nome interno ProCoRat'],
  BassBigMuff: ['Electro-Harmonix Bass Big Muff Pi', 'nome interno BassBigMuff'],
  GuitarMuff: ['Electro-Harmonix Big Muff Pi', 'BIAS FX 2: Guitar Muff (il classico usa il Little Big Muff)'],
  MaestroBassmaster: ['Maestro Bass Brassmaster', 'nome interno MaestroBassmaster'],
  SABdriver: ['Fulltone OCD', 'BIAS FX 2: SAB Driver'],
  Tremolo: ['Dunlop TS-1 Stereo Tremolo', 'BIAS FX 2: Tremolo'],
  ChorusAnalog: ['MXR M134 Stereo Chorus', 'BIAS FX 2: Chorus'],
  Flanger: ['Electro-Harmonix Electric Mistress', 'BIAS FX 2: Flanger'],
  Phaser: ['', 'nessuna fonte (in BIAS FX 2: Orange Phaser = MXR Phase 90, Phaser Pro = Boss PH-2)'],
  Vibrato01: ['BBE Mind Bender', 'BIAS FX 2: Vibrato'],
  UniVibe: ['Univox Uni-Vibe', 'BIAS FX 2: Uni-Vibe'],
  'JH.VoodooVibeJr': ['Roger Mayer Voodoo-Vibe Jr', 'Spark: pacchetto Hendrix'],
  Cloner: ['Electro-Harmonix Small Clone', 'BIAS FX 2: Cloner'],
  MiniVibe: ['Voodoo Lab Analog Chorus', 'BIAS FX 2: Classic Vibe'],
  Tremolator: ['Demeter TRM-1 Tremulator', 'BIAS FX 2: Tremulator'],
  TremoloSquare: ['', 'nessuna fonte'],
  GuitarEQ6: ['MXR M109S Six Band EQ', 'BIAS FX 2: EQ6 (nel classico il Guitar EQ è blu)'],
  BassEQ6: ['', 'nessuna fonte (nel classico il Bass EQ è nero)'],
  DelayMono: ['Boss DD-3', 'BIAS FX 2: Delay'],
  DelayEchoFilt: ['', 'nessuna fonte'],
  VintageDelay: ['', 'nessuna fonte'],
  DelayReverse: ['Electro-Harmonix Stereo Memory Man', 'BIAS FX 2: Reverse Delay'],
  DelayMultiHead: ['', 'nessuna fonte'],
  DelayRe201: ['Roland RE-201 Space Echo', 'nome interno DelayRe201'],
};
// Gli ampli: la mappa `AMPLI` di spark-effetti.js, che è la lista ufficiale dello Spark.
const AMPLI_VERI = { 'JH.Bassman50Silver': 'Fender 1968 Bassman 50', 'JH.DualShowman': 'Fender Dual Showman',
  'JH.Sunn100': 'Sunn 100S', 'JH.SoundCity100': 'Sound City One Hundred', 'JH.JTM45': 'Marshall JTM45/100' };

// Aspetti scritti a mano dove serve (in inglese, come nel Pulze).
const ASPETTO = {
  GuitarEQ6: 'six vertical EQ sliders plus a level slider, no round knobs',
  BassEQ6: 'black enclosure, six vertical EQ sliders plus a level slider, no round knobs',
  'JH.Vox846': 'a classic rocker wah pedal with a treadle, no knobs',
  AutoWah: 'a compact auto-wah stompbox',
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
  nome: 'Auto Wah', tipo: 'pedale', classe: 'Comp e wah', gruppo: 'Comp e wah', base: 'Based on Boss AW-2 Auto Wah',
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
