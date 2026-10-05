// La voce del video fatta da Kokoro (open source, Apache 2.0) invece che
// registrata: un pezzo per scena, ognuno messo all'inizio della sua scena.
//
//   node tools/video-demo/voce-sintetica.mjs <cartella kokoro> <cartella di uscita> [voce]
//
// <cartella kokoro> è una cartella con `npm install kokoro-js` dentro: l'app
// resta senza dipendenze, e il modello (~400 MB, scaricato alla prima volta
// da Hugging Face) non entra nel repository. La voce di difetto è am_michael,
// scelta dall'utente il 5 ottobre 2026.
//
// Scrive nella cartella di uscita voce.wav e voce.json; poi
//   node tools/video-demo/registra.js <cartella di uscita> en --voce voce.json

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [, , dirKokoro, uscita, voce = 'am_michael'] = process.argv;
const richiedi = createRequire(path.join(path.resolve(dirKokoro), 'package.json'));
const { KokoroTTS } = await import(pathToFileURL(richiedi.resolve('kokoro-js')).href);

// Il testo di testo-voce.en.md, scritto per la pronuncia: «Sparkling Tones»
// staccato, le virgolette dritte.
const PEZZI = [
  ['titolo', 'This is Sparkling Tones.'],
  ['connetti', 'An app to control your Spark from your phone. Tap "Connect"… and in a moment it reads the eight presets stored in the amp, all by itself.'],
  ['libreria', 'Below is your library, with all your other sounds. Tap the red triangle, and the preset goes to the amp and plays straight away.'],
  ['scheda', 'Every preset has its own card: name, sound family, categories and notes.'],
  ['editor', '"Tweak" opens the editor: the whole effects chain, from noise gate to reverb. Turn a knob… and the amp changes while you play.'],
  ['modello', 'Want a different overdrive, or another amp? Pick it from a list, and next to it you see which pedal or amp it\'s modelled on.'],
  ['salva', 'Nothing is saved until you decide. When you like it: "Save".'],
  ['live', 'Then there\'s the live view: big buttons you can hit while you play. The sound changes instantly.'],
  ['banco', 'And there are banks: eight sounds of your choice, in any order, taken from your whole library.'],
  ['nuovoBanco', 'Making one takes a moment. Tap "plus bank", give it a name, say "Rehearsal"… and fill the spots one at a time: one tap on the spot, one tap on the preset. The banks you make never write to the amp: its eight presets stay as they are.'],
  ['cartello', 'And then there\'s the pedal. Four footswitches for four sounds; the fifth flips between half A and half B. The display and the LEDs tell you what\'s playing.'],
  ['pedale', 'You build your banks here, at your own pace, and send them to the pedal over Bluetooth: just hold the pedal\'s two bank buttons together.'],
  ['slotPedale', 'Choose which bank, and which of the pedal\'s eight spots. Press "Send"… a couple of seconds, and it\'s in.'],
  ['inviato', 'It stays there, even with the pedal switched off. On stage the pedal talks to the Spark on its own: your phone can stay at home.'],
  ['finale', 'Sparkling Tones: free, works offline, with the Spark 2 and the Spark NEO.'],
];

// Quanto dura almeno ogni scena senza voce, misurato sulla registrazione
// inglese del 5 ottobre 2026 (dalla didascalia alla successiva): la voce può
// solo allungarla. Il cartello non ha un minimo suo: dura quanto la voce.
const MINIMO = { connetti: 8.7, libreria: 9.4, scheda: 5.5, editor: 10.3, modello: 10.1,
                 salva: 6.6, live: 7.5, banco: 8.0, nuovoBanco: 19.5, cartello: 6.0,
                 pedale: 8.1, slotPedale: 7.8, inviato: 5.4, finale: 4.5 };
const PAUSA = 0.7;         // fra la fine di un pezzo e l'inizio del successivo
const MARGINE = 0.6;       // in più sul minimo della scena, perché le scene non sono al decimo

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const clip = [];
for (const [chiave, testo] of PEZZI) {
  const a = await tts.generate(testo, { voice: voce });
  clip.push({ chiave, audio: a.audio, sr: a.sampling_rate, secondi: a.audio.length / a.sampling_rate });
  console.log(chiave.padEnd(11), (a.audio.length / a.sampling_rate).toFixed(1), 's');
}

// i tempi: il titolo sta sotto il cartello d'apertura, poi ogni scena parte
// quando sono finiti sia la voce di prima sia la scena di prima
const tempi = {};
let t = 0.8, prima = null;
for (const c of clip) {
  if (prima) t = Math.max(t + prima.secondi + PAUSA, c.chiave === 'connetti' ? 3.2 : t + (MINIMO[prima.chiave] || 0) + MARGINE);
  c.inizio = t;
  if (c.chiave !== 'titolo') tempi[c.chiave] = +t.toFixed(2);
  prima = c;
}
const ultimo = clip[clip.length - 1];
const fine = +(ultimo.inizio + Math.max(ultimo.secondi + 1.5, MINIMO.finale)).toFixed(2);

// una traccia sola, mono, con ogni pezzo al suo posto
const sr = clip[0].sr;
const traccia = new Float32Array(Math.ceil(fine * sr));
for (const c of clip) traccia.set(c.audio.subarray(0, traccia.length - Math.round(c.inizio * sr)), Math.round(c.inizio * sr));
const wav = Buffer.alloc(44 + traccia.length * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + traccia.length * 2, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24);
wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(traccia.length * 2, 40);
traccia.forEach((v, k) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + 2 * k));
fs.mkdirSync(uscita, { recursive: true });
fs.writeFileSync(path.join(uscita, 'voce.wav'), wav);
// `pezzi`: dove sta ogni pezzo in voce.wav e quanto dura. Con questi il
// registratore non usa `tempi` (che restano come stima): ogni scena aspetta il
// pezzo di prima, e il montaggio mette ogni pezzo dove la sua scena è partita.
const pezzi = Object.fromEntries(clip.map(c => [c.chiave, { da: +c.inizio.toFixed(3), durata: +c.secondi.toFixed(3) }]));
fs.writeFileSync(path.join(uscita, 'voce.json'), JSON.stringify({ file: 'voce.wav', taglio: 0, pausa: PAUSA, pezzi, tempi, fine, silenzi: [] }, null, 2));
console.log('tempi', JSON.stringify(tempi), 'fine', fine);
