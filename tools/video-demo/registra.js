// Registra il video dimostrativo dell'app.
//
//   node tools/video-demo/registra.js <cartella di uscita> [it|en] [--voce voce.json] [--solo-montaggio]
//
// --solo-montaggio rifà soltanto il montaggio dai fotogrammi già registrati in
// quella cartella (linea.json e fotogrammi/), con la voce se c'è --voce.
//
// Con --voce il copione va coi tempi di una voce registrata (testo-voce.md):
// voce.json sta nella cartella di uscita e dice il file audio, quanti secondi
// tagliarne in testa, e quando parte ogni pezzo nel video:
//   { "file": "voce.mp3", "taglio": 4.5, "tempi": { "connetti": 3.5, … },
//     "finale": 134.5, "fine": 141.5, "silenzi": [[142.0, 144.5]] }
// «silenzi» sono tratti dell'audio da zittire (rumori), in secondi del file.
// Ogni didascalia con un tempo aspetta il suo pezzo prima di partire; il
// montaggio mette l'audio nell'MP4.
//
// Apre Edge senza finestra in formato telefono, con l'ampli finto
// (ampli-finto.js) al posto del Bluetooth, e recita il copione qui sotto
// toccando l'app come un dito. I fotogrammi arrivano dallo screencast di
// Chrome DevTools; alla fine monta.html li rimonta in tempo reale su un
// canvas verticale 1080×1920 con le didascalie e li codifica a 30 fps fissi
// (WebCodecs); scrivi-mp4.js ne fa un MP4 classico, che DaVinci Resolve importa.
//
// Niente dipendenze: Node 24 ha già WebSocket e fetch.

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RADICE = path.resolve(__dirname, '..', '..');
const USCITA = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'spark-video'));
const LINGUA = process.argv[3] === 'en' ? 'en' : 'it';
const iVoce = process.argv.indexOf('--voce');
// --scena connetti: un video corto, solo quella sezione (la serie per YouTube)
const iScena = process.argv.indexOf('--scena');
const SCENA = iScena > 0 ? process.argv[iScena + 1] : null;
const SOLO_MONTAGGIO = process.argv.includes('--solo-montaggio');
const VOCE = iVoce > 0 ? JSON.parse(fs.readFileSync(path.resolve(USCITA, process.argv[iVoce + 1]), 'utf8')) : null;
const FOTO = path.join(USCITA, 'fotogrammi');
const PORTA_WEB = 8123, PORTA_CDP = 9333;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// I video del PC (scene «pc-…»): pc.html in una finestra 1440×810, fotogrammi 1920×1080.
const PC = !!(SCENA && SCENA.startsWith('pc-'));
const LARGO = PC ? 1440 : 390, ALTO = PC ? 810 : 844, DPR = PC ? 4 / 3 : 2;

const dorme = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------- server */

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.css': 'text/css', '.jpg': 'image/jpeg' };

let fineMontaggio = null;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__salva') {
    const nome = path.basename(url.searchParams.get('nome') || 'demo.mp4');
    const pezzi = [];
    req.on('data', d => pezzi.push(d));
    req.on('end', () => {
      if (nome === 'passo') { console.log(new Date().toLocaleTimeString(), 'montaggio', Buffer.concat(pezzi).toString()); return res.end('ok'); }
      fs.writeFileSync(path.join(USCITA, nome), Buffer.concat(pezzi));
      res.end('ok');
      if (fineMontaggio && (nome === 'fatto.json' || nome === 'errore.txt')) fineMontaggio(nome);
    });
    return;
  }
  let file = url.pathname.startsWith('/__uscita/')
    ? path.join(USCITA, decodeURIComponent(url.pathname.slice(10)))
    : path.join(RADICE, decodeURIComponent(url.pathname));
  if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
  fs.readFile(file, (err, dati) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', TIPI[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(dati);
  });
});

/* ------------------------------------------------------------------- CDP */

class Cdp {
  constructor(ws) {
    this.ws = ws; this.n = 0; this.attese = new Map(); this.ascolti = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) {
        const a = this.attese.get(m.id); this.attese.delete(m.id);
        if (m.error) a.rej(new Error(m.error.message)); else a.res(m.result);
      } else this.ascolti.forEach(f => f(m));
    };
  }
  manda(method, params = {}) {
    const id = ++this.n;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.attese.set(id, { res, rej }));
  }
  evento(nome) {
    return new Promise(res => {
      const f = m => { if (m.method === nome) { this.ascolti.splice(this.ascolti.indexOf(f), 1); res(m.params); } };
      this.ascolti.push(f);
    });
  }
  async js(espressione) {
    const r = await this.manda('Runtime.evaluate',
      { expression: espressione, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

async function apriEdge() {
  const profilo = path.join(USCITA, 'profilo-edge');
  fs.rmSync(profilo, { recursive: true, force: true });
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`,
    `--user-data-dir=${profilo}`, '--no-first-run', '--hide-scrollbars', ...(VOCE ? [] : ['--mute-audio']),
    `--window-size=${LARGO},${ALTO}`, '--autoplay-policy=no-user-gesture-required',
    `--lang=${LINGUA}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      const pagine = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`)).json();
      const p = pagine.find(x => x.type === 'page');
      if (p) {
        const ws = new WebSocket(p.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        return { edge, cdp: new Cdp(ws) };
      }
    } catch (_) { /* non ancora su */ }
    await dorme(200);
  }
  throw new Error('Edge non risponde');
}

/* ----------------------------------------------------------------- regia */

const TESTI = {
  it: {
    titolo: 'SparklingTones', sottotitolo: 'Il tuo Spark 2, dal telefono e dal pedale',
    connetti: 'Un tocco, e si collega via Bluetooth',
    letti: 'Legge da solo gli otto preset dell\'ampli',
    libreria: 'Sotto, la tua libreria: tutti gli altri suoni',
    suona: '▶ lo manda all\'ampli, e suona subito',
    scheda: 'Ogni preset: nome, famiglia, categorie, note',
    editor: 'L\'editor: ogni pedale e ogni ampli, disegnato',
    manopole: 'Giri le manopole sul disegno e l\'ampli cambia mentre suoni',
    modello: 'Due tocchi su un blocco: cambi pedale o ampli',
    salva: 'Salvi in libreria solo quando ti piace',
    live: 'La vista live: pulsantoni da toccare suonando',
    banco: 'I banchi: otto suoni a portata di piede',
    tieni: 'Tieni premuto due secondi: sei nelle sue manopole',
    nuovoBanco: 'Un banco nuovo: gli dai un nome…',
    riempi: '…e ci metti i suoni della libreria',
    cartello: ['E poi c’è il pedale', 'quattro footswitch, quattro suoni',
               'il quinto passa da A a B', 'display e LED: sai cosa suona',
               'va da solo con lo Spark'],
    pedale: 'I banchi li mandi al pedale via Bluetooth',
    slotPedale: 'Scegli il banco e il posto nel pedale',
    inviato: 'Lì restano, anche a pedale spento',
    fine1: 'SparklingTones', fine2: 'web app gratuita · anche offline',
    fine3: 'mazzrelaz.github.io/SparklingTones',
    nota: 'registrato con ampli e pedale simulati',
    bancoPronto: 'Concerto', bancoNuovo: 'Prove',
  },
  en: {
    titolo: 'SparklingTones', sottotitolo: 'Your Spark 2, from your phone and your feet',
    connetti: 'One tap, and it connects over Bluetooth',
    letti: 'It reads the amp’s eight presets by itself',
    libreria: 'Below, your library: all your other sounds',
    suona: '▶ sends it to the amp, and it plays at once',
    scheda: 'Every preset: name, family, categories, notes',
    editor: 'The editor: every pedal and every amp, drawn',
    manopole: 'Turn the knobs on the drawing, the amp follows',
    modello: 'Two taps on a block: swap the pedal or the amp',
    salva: 'Save to the library only when you like it',
    live: 'Live view: big buttons to hit while you play',
    banco: 'Banks: eight sounds at your feet',
    tieni: 'Hold a button two seconds: straight into its knobs',
    nuovoBanco: 'A new bank: give it a name…',
    riempi: '…and fill it from your library',
    cartello: ['And then there’s the pedal', 'four footswitches, four sounds',
               'the fifth flips between A and B', 'display and LEDs: you see what’s on',
               'it runs on its own with the Spark'],
    pedale: 'Send your banks to the pedal over Bluetooth',
    slotPedale: 'Pick the bank and its place in the pedal',
    inviato: 'They stay there, even with the pedal off',
    fine1: 'SparklingTones', fine2: 'free web app · works offline',
    fine3: 'mazzrelaz.github.io/SparklingTones',
    nota: 'recorded with a simulated amp and pedal',
    bancoPronto: 'Gig', bancoNuovo: 'Rehearsal',
    libSuona: '▶ plays it on the amp at once',
    libCerca: 'Search by name',
    libFiltri: 'Or filter by family: clean, drive, acoustic',
    libOrdina: 'Sort it the way you like',
    schApri: 'Tap a preset: its card opens',
    schSuona: '«Play» sends it to the amp',
    schDuplica: '«Copy» makes a copy to play with',
    schSlot: '«Put in a slot» writes it into the amp',
    schFatto: 'The old preset stays safe in your library',
    edApri: '«Tweak» opens the editor',
    edManopole: 'Drag a knob up or down: the amp follows',
    edBlocco: 'Tap a block in the chain to edit it',
    edModello: 'Tap the name to swap the model',
    edSalva: 'Save when you like it',
    edNeon: 'Prefer pedals? Settings → Editor: Neon',
    edNeonVisto: 'The same preset, drawn as real pedals',
    liveAmpli: 'Your banks never write to the amp',
    tunApri: 'The tuner, one tap away',
    tunNota: 'Play a string: note and needle from the amp',
    bakApri: 'More → Settings and backup',
    bakEsporta: 'Export the library to a file, import it anywhere',
    bakDropbox: 'Or keep it in sync with Dropbox',
    pcCollega: 'One click on «Connect»',
    pcLetti: 'The amp’s eight presets, read by themselves',
    pcFrecce: 'The arrows step through the slots',
    pcLibreria: 'Your library on the right: click to play',
    pcCatena: 'The whole chain, always in view',
    pcBlocco: 'Click a pedal to edit it',
    pcManopola: 'Drag a knob, or use the mouse wheel',
    pcModello: 'Pick another model from the list',
    pcAcceso: 'Switch a block on and off',
    pcAB: 'A/B: compare with the saved preset',
    pcAnnulla: 'Undo and redo every change',
    pcCerca: 'Search the library',
    pcMenu: 'More actions for every preset',
    pcBanchi: 'Banks: build your set lists',
    pcLive: 'Live view: big tiles for the stage',
    pcLiveTocca: 'Click a tile and it plays',
    pcPedaliera: 'Map a MIDI footswitch to every tile',
    pcIa: 'Generate with AI: describe the sound you want',
    pcIaCopia: 'Copy the request into your AI chat',
    pcIaIncolla: 'Paste the answer back: a new preset',
  },
};
const T = TESTI[LINGUA] || TESTI.it;
const SCENE = {
  connetti: { it: '1 · Collegarsi allo Spark', en: '1 · Connecting to your Spark' },
  libreria: { it: '2 · La libreria', en: '2 · Your library' },
  scheda: { it: '3 · La scheda del preset', en: '3 · The preset card' },
  editor: { it: '4 · L’editor', en: '4 · The editor' },
  live: { it: '5 · Live e banchi', en: '5 · Live view and banks' },
  tuner: { it: '6 · L’accordatore', en: '6 · The tuner' },
  backup: { it: '7 · Backup e Dropbox', en: '7 · Backup and Dropbox' },
  'pc-prova': { it: 'prova', en: 'test' },
  'pc-collega': { it: 'PC 1 · Panoramica', en: 'Desktop 1 · Overview and connecting' },
  'pc-editor': { it: 'PC 2 · L’editor', en: 'Desktop 2 · The editor' },
  'pc-libreria': { it: 'PC 3 · Libreria e banchi', en: 'Desktop 3 · Library and banks' },
  'pc-live': { it: 'PC 4 · Live', en: 'Desktop 4 · Live view and MIDI footswitch' },
  'pc-ia': { it: 'PC 5 · Genera con l’IA', en: 'Desktop 5 · Generate with AI' },
};
if (SCENA) T.sottotitolo = SCENE[SCENA][LINGUA];
// Una voce fatta da un'IA di un servizio (OpenAI): le sue regole vogliono che il video lo dica.
if (VOCE && VOCE.modello) T.nota += LINGUA === 'en' ? ' · AI-generated voice' : ' · voce generata con IA';

async function main() {
  fs.mkdirSync(FOTO, { recursive: true });
  // in «solo montaggio» i fotogrammi sono proprio quello che serve: guai a toglierli
  if (!SOLO_MONTAGGIO) for (const f of fs.readdirSync(FOTO)) fs.unlinkSync(path.join(FOTO, f));
  await new Promise(r => server.listen(PORTA_WEB, r));
  const { edge, cdp } = await apriEdge();

  try {
    await cdp.manda('Page.enable');
    await cdp.manda('Runtime.enable');
    // «Vuoi uscire?» (il PC con modifiche non salvate) bloccherebbe il passaggio al montaggio.
    cdp.ascolti.push(m => { if (m.method === 'Page.javascriptDialogOpening') cdp.manda('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    if (!SOLO_MONTAGGIO) {
    await cdp.manda('Emulation.setDeviceMetricsOverride',
      { width: LARGO, height: ALTO, deviceScaleFactor: DPR, mobile: !PC });

    const catture = JSON.parse(fs.readFileSync(path.join(RADICE, 'captures/2026-08-10-libreria-8-preset.json'), 'utf8'));
    const slot = Array.isArray(catture) ? catture : Object.values(catture);
    // Niente invito a installare la PWA in mezzo al video.
    const prima = `try { localStorage.setItem('pwa-installa-no', '1'); } catch (_) {}
window.__BANCO_PEDALE = ${JSON.stringify(T.bancoPronto)};
` +
      `window.__PRESET_AMPLI = ${JSON.stringify(slot)};\n` +
      fs.readFileSync(path.join(__dirname, 'ampli-finto.js'), 'utf8') + '\n' +
      fs.readFileSync(path.join(__dirname, 'dito.js'), 'utf8');
    await cdp.manda('Page.addScriptToEvaluateOnNewDocument', { source: prima });

    const app = `http://localhost:${PORTA_WEB}/${PC ? 'pc.html' : 'index.html'}?lang=${LINGUA}`;
    let carico = cdp.evento('Page.loadEventFired');
    await cdp.manda('Page.navigate', { url: app });
    await carico; await dorme(1500);

    // La libreria finta: preset fatti dalle catture con altri nomi, e un banco.
    await cdp.js(`(async () => {
      const base = window.__PRESET_AMPLI;
      const nomi = [['Blues Breaker',5,'drive'],['Funk Rhythm',0,'clean'],['Lead Hendrix',7,'drive'],
                    ['Ambient Swell',4,'clean'],['Crunch Rock',2,'drive'],['Jazz Clean',6,'clean'],
                    ['Acoustic Strum',4,'acoustic']];
      const lista = nomi.map(([n, i], k) => {
        const p = JSON.parse(JSON.stringify(base[i]));
        p.name = n; p.uuid = 'dem00000-0000-4000-8000-00000000000' + k; delete p.slot; return p;
      });
      await store.importFromAmp(lista);
      const tutti = await store.all();
      for (const [n, , f] of nomi) {
        const r = tutti.find(x => x.name === n);
        try { await store.setFamiglia(r.id, f); } catch (e) {}
      }
      const id = n => tutti.find(x => x.name === n).id;
      const banco = await store.addBank(${JSON.stringify(T.bancoPronto)});
      const banchi = await store.getSetting('banchi', []);
      banchi.find(b => b.id === banco.id).posti =
        ['Funk Rhythm','Blues Breaker','Crunch Rock','Lead Hendrix',
         'Jazz Clean','Ambient Swell','Acoustic Strum',null].map(n => n && id(n));
      await store.setBanks(banchi);
    })()`);
    carico = cdp.evento('Page.loadEventFired');
    await cdp.manda('Page.reload', { ignoreCache: true });
    await carico; await dorme(2000);
    await cdp.js('scrollTo(0, 0)');

    /* ---------- strumenti del copione ---------- */

    const fotogrammi = [], didascalie = [];
    let n = 0;
    cdp.ascolti.push(m => {
      if (m.method !== 'Page.screencastFrame') return;
      const nome = `f${String(n++).padStart(5, '0')}.jpg`;
      fs.writeFileSync(path.join(FOTO, nome), Buffer.from(m.params.data, 'base64'));
      fotogrammi.push({ t: m.params.metadata.timestamp, f: nome });
      cdp.manda('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    });
    const ora = () => Date.now() / 1000;
    // Con la voce, la didascalia aspetta il suo pezzo (un po' prima: si legge
    // e poi si sente). Senza, parte subito.
    // Con una voce a pezzi (voce-sintetica.mjs) invece i tempi non sono
    // fissati prima: la scena aspetta che il pezzo di prima sia finito, e il
    // suo pezzo partirà quando la scena è partita davvero (`momenti`, che il
    // montaggio usa per mettere ogni pezzo al suo posto).
    const momenti = {};
    let ultimoPezzo = null;
    const finitoIlPezzo = async () => {
      if (!ultimoPezzo) return;
      const libero = momenti[ultimoPezzo] + VOCE.pezzi[ultimoPezzo].durata + (VOCE.pausa || 0.7);
      while (ora() - inizio < libero - 0.3) await dorme(20);
    };
    const aspetta = async chiave => {
      if (VOCE && VOCE.pezzi) {
        if (!VOCE.pezzi[chiave]) return;
        await finitoIlPezzo();
        momenti[chiave] = ora() - inizio + 0.3;      // la didascalia appare, la voce subito dopo
        ultimoPezzo = chiave;
        return;
      }
      const quando = VOCE && VOCE.tempi[chiave];
      if (quando === undefined) return;
      while (ora() - inizio < quando - 0.3) await dorme(20);
    };
    const dici = async chiave => {
      if (chiave) await aspetta(chiave);
      didascalie.push({ t: ora(), testo: chiave ? T[chiave] : null });
    };
    // Un cartello a tutto schermo, disegnato dal montaggio sopra l'app ferma.
    const cartelli = [];
    async function cartello(righe, ms, finoA) {
      await aspetta('cartello');
      const t0 = ora();
      if (VOCE && VOCE.pezzi) await finitoIlPezzo();            // il cartello dura quanto la sua voce
      else if (VOCE && VOCE.tempi[finoA] !== undefined) await aspetta(finoA);
      else await dorme(ms);
      cartelli.push({ t0, t1: ora(), righe });
    }
    async function scrivi(testo) {
      for (const c of testo) { await cdp.manda('Input.insertText', { text: c }); await dorme(90); }
    }

    let dito = { x: LARGO / 2, y: ALTO * 0.62 };
    const mouse = (type, x, y, extra = {}) =>
      cdp.manda('Input.dispatchMouseEvent', { type, x, y, button: 'left', pointerType: 'mouse', ...extra });

    async function muovi(x, y, ms = 450, premuto = false) {
      const da = { ...dito }, passi = Math.max(1, Math.round(ms / 16));
      for (let i = 1; i <= passi; i++) {
        const k = i / passi, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        dito = { x: da.x + (x - da.x) * e, y: da.y + (y - da.y) * e };
        await cdp.js(`__dito.mostra(${dito.x},${dito.y})`);
        await mouse('mouseMoved', dito.x, dito.y, premuto ? { buttons: 1 } : { button: 'none' });
        await dorme(16);
      }
    }
    async function tocca(p, attesa = 600) {
      await muovi(p.x, p.y);
      await dorme(140);
      await cdp.js('__dito.premi(true)');
      await mouse('mousePressed', p.x, p.y, { clickCount: 1, buttons: 1 });
      await dorme(110);
      await mouse('mouseReleased', p.x, p.y, { clickCount: 1 });
      await cdp.js('__dito.premi(false)');
      await dorme(attesa);
    }
    // Due tocchi ravvicinati: l'editor apre la scelta del modello solo se il
    // secondo arriva entro 400 ms (DOPPIO_TOCCO_MS).
    async function doppioTocco(p, attesa = 600) {
      await muovi(p.x, p.y);
      await dorme(140);
      for (let i = 0; i < 2; i++) {
        await cdp.js('__dito.premi(true)');
        await mouse('mousePressed', p.x, p.y, { clickCount: i + 1, buttons: 1 });
        await dorme(70);
        await mouse('mouseReleased', p.x, p.y, { clickCount: i + 1 });
        await cdp.js('__dito.premi(false)');
        if (!i) await dorme(110);
      }
      await dorme(attesa);
    }
    async function trascina(p, dy, ms = 900) {
      await muovi(p.x, p.y);
      await dorme(150);
      await cdp.js('__dito.premi(true)');
      await mouse('mousePressed', p.x, p.y, { clickCount: 1, buttons: 1 });
      await muovi(p.x, p.y + dy, ms, true);
      await mouse('mouseReleased', dito.x, dito.y, { clickCount: 1 });
      await cdp.js('__dito.premi(false)');
    }
    // Lo scorrimento del documento, o di un pannello, col dito che lo accompagna.
    async function scorri(dy, ms = 900, dove) {
      const el = dove ? `document.querySelector(${JSON.stringify(dove)})` : null;
      const da = await cdp.js(el ? el + '.scrollTop' : 'scrollY');
      const x = LARGO * 0.55, y0 = dy > 0 ? ALTO * 0.75 : ALTO * 0.3;
      await muovi(x, y0, 350);
      await cdp.js('__dito.premi(true)');
      const passi = Math.round(ms / 16);
      for (let i = 1; i <= passi; i++) {
        const k = i / passi, e = 1 - Math.pow(1 - k, 3);
        await cdp.js(`${el ? el + '.scrollTop = ' : 'scrollTo(0, '}${da + dy * e}${el ? '' : ')'}; __dito.mostra(${x}, ${y0 - dy * e * 0.5})`);
        await dorme(16);
      }
      dito = { x, y: y0 - dy * 0.5 };
      await cdp.js('__dito.premi(false)');
    }
    const centro = async espr => {
      const p = await cdp.js(`(() => { const e = ${espr}; if (!e) return null;
        const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (!p) {
        const foto = await cdp.manda('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(USCITA, 'errore.png'), Buffer.from(foto.data, 'base64'));
        throw new Error('non trovo: ' + espr);
      }
      return p;
    };
    const tradotto = t => cdp.js(`tr(${JSON.stringify(t)})`);
    const bottone = async t => centro(`[...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.trim() === ${JSON.stringify(await tradotto(t))})`);
    const conTesto = (sel, t) => centro(`[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.offsetParent && e.textContent.includes(${JSON.stringify(t)}))`);

    async function scenaLibreria() {
      await dici('libSuona');
      await scorri(260, 900);
      await dorme(500);
      await tocca(await centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes('Blues Breaker')).querySelector('.via')`), 1800);
      await tocca(await centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes('Jazz Clean')).querySelector('.via')`), 1500);
      await dici('libCerca');
      await scorri(-(await cdp.js('scrollY')), 700);
      await tocca(await centro("document.getElementById('search')"), 300);
      await scrivi('crunch');
      await dorme(1800);
      await cdp.js("const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); s.blur()");
      await dorme(600);
      await dici('libFiltri');
      await tocca(await conTesto('#filtriCategoria > *', await tradotto('Drive')), 1600);
      await tocca(await conTesto('#filtriCategoria > *', await tradotto('Clean')), 1600);
      await tocca(await conTesto('#filtriCategoria > *', await tradotto('tutti')), 900);
      await dici('libOrdina');
      await tocca(await centro("document.getElementById('btnOrdina')"), 1800);
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await dorme(800);
    }

    async function scenaScheda() {
      const riga = n => centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes(${JSON.stringify(n)})).querySelector('.name, .nome') || [...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes(${JSON.stringify(n)}))`);
      await scorri(260, 900);
      await dici('schApri');
      await tocca(await riga('Blues Breaker'), 1800);
      await dici('schSuona');
      await tocca(await bottone('Suona'), 2400);
      await dici('schDuplica');
      await tocca(await bottone('Duplica'), 2200);
      await tocca(await centro("document.querySelector('#foglioPreset [aria-label=\"' + tr('chiudi') + '\"]')"), 900);
      await tocca(await riga('Crunch Rock'), 1500);
      await dici('schSlot');
      await tocca(await bottone('Metti in uno slot'), 1300);
      await tocca(await conTesto('.elenco-voce', 'B3'), 1300);
      await tocca(await centro(`[...document.querySelectorAll('button')].filter(b => b.offsetParent && b.textContent.includes('B3 (slot')).pop()`), 3500);
      await dici('schFatto');
      await tocca(await centro("document.querySelector('#foglioPreset [aria-label=\"' + tr('chiudi') + '\"]')"), 900);
      await scorri(-(await cdp.js('scrollY')), 800);
      await dorme(1500);
      await scorri(330, 900);
      await dorme(1500);
    }

    async function scenaEditor() {
      const riga = n => centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes(${JSON.stringify(n)})).querySelector('.name')`);
      const regola = async () => tocca(await centro(`[...document.querySelectorAll('#foglioPreset button')].find(b => b.textContent.trim() === ${JSON.stringify(await tradotto('Regola'))})`), 2400);
      await scorri(260, 900);
      await tocca(await riga('Blues Breaker'), 1200);
      await dici('edApri');
      await regola();
      await dici('edManopole');
      await trascina(await centro("document.querySelectorAll('#pannelloEditor .pomello')[0]"), -80, 1000);
      await dorme(300);
      await trascina(await centro("document.querySelectorAll('#pannelloEditor .pomello')[2]"), 60, 900);
      await dorme(800);
      await dici('edBlocco');
      await cdp.js(`[...document.querySelectorAll('#pannelloEditor .tassello')].find(t => t.querySelector('.cat') && t.querySelector('.cat').textContent.trim() === ${JSON.stringify(await tradotto('Drive'))}).scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })`);
      await dorme(700);
      await tocca(await centro(`[...document.querySelectorAll('#pannelloEditor .tassello')].find(t => t.querySelector('.cat') && t.querySelector('.cat').textContent.trim() === ${JSON.stringify(await tradotto('Drive'))})`), 1600);
      await trascina(await centro("document.querySelectorAll('#pannelloEditor .pomello')[0]"), -60, 800);
      await dorme(600);
      await dici('edModello');
      await tocca(await centro("document.querySelector('#pannelloEditor .nome-modello')"), 1300);
      await cdp.js("[...document.querySelectorAll('.elenco-voce')].find(e => e.textContent.includes('Tube Drive')).scrollIntoView({ block: 'center', behavior: 'smooth' })");
      await dorme(700);
      await tocca(await conTesto('.elenco-voce', 'Tube Drive'), 1600);
      await dici('edSalva');
      await tocca(await centro("document.getElementById('btnSalvaModifiche')"), 1500);
      await tocca(await centro("document.querySelector('[data-chiudi=pannelloEditor]')"), 1000);
      await dici('edNeon');
      await tocca(await centro("document.getElementById('tabAltro')"), 900);
      await tocca(await centro("document.getElementById('btnAltro')"), 1300);
      await cdp.js("document.getElementById('sceltaEditor').scrollIntoView({ block: 'center', behavior: 'smooth' })");
      await dorme(900);
      await tocca(await centro("document.querySelector('#sceltaEditor [data-editor=neon]')"), 1300);
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await dorme(800);
      await tocca(await centro("document.getElementById('tabPreset')"), 1000);
      await scorri(260 - (await cdp.js('scrollY')), 700);
      await dorme(500);
      await tocca(await riga('Blues Breaker'), 1200);
      if (await cdp.js("document.getElementById('foglioPreset').hidden")) await tocca(await riga('Blues Breaker'), 1200);
      await dici('edNeonVisto');
      await regola();
      await trascina(await centro("document.querySelectorAll('.manopola-img')[0]"), -60, 900);
      await dorme(2500);
    }

    async function scenaLive() {
      await dici('live');
      await tocca(await centro("document.getElementById('tabLive')"), 1000);
      for (const s of ['A2', 'B1', 'A4']) await tocca(await conTesto('.pad', s), 1100);
      await dici('banco');
      await tocca(await conTesto('#banchi .banco', T.bancoPronto), 1000);
      await tocca(await conTesto('.pad', 'Blues'), 1500);
      await tocca(await conTesto('.pad', 'Lead'), 1500);
      await dici('tieni');
      const funk = await conTesto('.pad', 'Funk');
      await muovi(funk.x, funk.y);
      await dorme(140);
      await cdp.js('__dito.premi(true)');
      await mouse('mousePressed', funk.x, funk.y, { clickCount: 1, buttons: 1 });
      await dorme(2400);
      await mouse('mouseReleased', funk.x, funk.y, { clickCount: 1 });
      await cdp.js('__dito.premi(false)');
      await dorme(2200);
      await tocca(await centro("document.querySelector('[data-chiudi=pannelloEditor]')"), 900);
      await dici('nuovoBanco');
      await tocca(await conTesto('#banchi .banco', '＋'), 900);
      await cdp.js("document.querySelector('.elenco-campo').select()");
      await scrivi(T.bancoNuovo);
      await dorme(500);
      await tocca(await bottone('Crea il banco'), 900);
      await dici('riempi');
      for (const [i, nome] of [[0, 'Funk Rhythm'], [1, 'Crunch Rock'], [2, 'Lead Hendrix'], [3, 'Jazz Clean']]) {
        await tocca(await centro(`document.querySelectorAll('.pad')[${i}]`), 650);
        await tocca(await conTesto('#elencoScegli .voce', nome), 700);
      }
      await tocca(await centro("document.getElementById('btnModifica')"), 800);
      await dici('liveAmpli');
      await tocca(await conTesto('.pad', 'Crunch'), 1500);
      await tocca(await conTesto('.pad', 'Jazz'), 2000);
    }
    async function scenaTuner() {
      await dici('tunApri');
      await tocca(await centro("document.getElementById('tabAccordatore')"), 6000);
      await dici('tunNota');
      await dorme(6000);
    }
    async function scenaBackup() {
      await dici('bakApri');
      await tocca(await centro("document.getElementById('tabAltro')"), 900);
      await tocca(await centro("document.getElementById('btnAltro')"), 1500);
      await cdp.js("[...document.querySelectorAll('h2, .imp-titolo, .sezione-titolo')].find(e => /backup/i.test(e.textContent)).scrollIntoView({ block: 'start', behavior: 'smooth' })");
      await dorme(1500);
      await dici('bakEsporta');
      await dorme(3500);
      await dici('bakDropbox');
      await cdp.js("[...document.querySelectorAll('h2, .imp-titolo, .sezione-titolo')].find(e => /dropbox/i.test(e.textContent)).scrollIntoView({ block: 'start', behavior: 'smooth' })");
      await dorme(5000);
    }

    const rigaPc = async n => {
      await cdp.js(`(() => { const r = [...document.querySelectorAll('#elenco-corpo .riga-preset')].find(r => r.textContent.includes(${JSON.stringify(n)})); r && r.scrollIntoView({ block: 'center', behavior: 'smooth' }); })()`);
      await dorme(600);
      return rigaPcSubito(n);
    };
    const rigaPcSubito = n => centro(`[...document.querySelectorAll('#elenco-corpo .riga-preset')].find(r => r.textContent.includes(${JSON.stringify(n)}))`);
    const miniatura = i => centro(`document.querySelectorAll('#catena .miniatura')[${i}]`);
    const esc = async () => {
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp.manda('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    };
    async function scenaPcCollega() {
      await dici('pcCollega');
      await tocca(await centro("document.getElementById('collega')"), 300);
      await dici('pcLetti');
      await dorme(4500);
      await dici('pcFrecce');
      await tocca(await centro("document.getElementById('dopo')"), 1400);
      await tocca(await centro("document.getElementById('dopo')"), 1400);
      await tocca(await centro("document.getElementById('prima')"), 1400);
      await dici('pcLibreria');
      await tocca(await rigaPc('Blues Breaker'), 1800);
      await tocca(await rigaPc('Jazz Clean'), 1800);
      await dici('pcCatena');
      await muovi(LARGO * 0.2, ALTO * 0.8, 700); await muovi(LARGO * 0.75, ALTO * 0.8, 1600);
      await dorme(1500);
    }
    async function scenaPcEditor() {
      await tocca(await rigaPc('Blues Breaker'), 1500);
      await dici('pcBlocco');
      await tocca(await miniatura(2), 1500);
      await dici('pcManopola');
      await trascina(await centro("document.querySelectorAll('#manopole .girevole')[0]"), -70, 1000);
      await dorme(300);
      await trascina(await centro("document.querySelectorAll('#manopole .girevole')[1]"), 50, 800);
      await dorme(700);
      await dici('pcModello');
      await tocca(await centro("[...document.querySelectorAll('#lista-modelli button')].filter(b => !b.classList.contains('sì'))[2]"), 1800);
      await tocca(await miniatura(3), 1300);
      await tocca(await centro("[...document.querySelectorAll('#lista-modelli button')].filter(b => !b.classList.contains('sì'))[5]"), 1800);
      await dici('pcAcceso');
      await tocca(await centro("document.querySelectorAll('#catena .chip')[4]"), 1300);
      await tocca(await centro("document.querySelectorAll('#catena .chip')[4]"), 1300);
      await dici('pcAB');
      await tocca(await centro("document.getElementById('confronta')"), 1800);
      await tocca(await centro("document.getElementById('confronta')"), 1500);
      await dici('pcAnnulla');
      await tocca(await centro("document.getElementById('annulla')"), 1000);
      await tocca(await centro("document.getElementById('annulla')"), 1000);
      await tocca(await centro("document.getElementById('ripeti')"), 1500);
    }
    async function scenaPcLibreria() {
      await dici('pcLibreria');
      await tocca(await rigaPc('Funk Rhythm'), 1500);
      await dici('pcCerca');
      await tocca(await centro("document.getElementById('elenco-cerca')"), 300);
      await scrivi('lead');
      await dorme(1800);
      await cdp.js("const s = document.getElementById('elenco-cerca'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); s.blur()");
      await dorme(600);
      await dici('pcMenu');
      await tocca(await centro("[...document.querySelectorAll('#elenco-corpo .riga-preset')].find(r => r.textContent.includes('Crunch Rock')).querySelector('.altro')"), 2400);
      await esc(); await dorme(600);
      await dici('pcBanchi');
      await tocca(await centro("document.getElementById('apri-banchi')"), 4000);
    }
    async function scenaPcLive() {
      await dici('pcLive');
      await tocca(await centro("document.getElementById('apri-live')"), 1800);
      await dici('pcLiveTocca');
      for (const i of [1, 4, 2]) await tocca(await centro(`document.querySelectorAll('.lv-griglia > *')[${i}]`), 1400);
      await dici('pcPedaliera');
      await tocca(await conTesto('button', 'Foot controller'), 4500);
    }
    async function scenaPcIa() {
      await dici('pcIa');
      await tocca(await centro("document.getElementById('genera-ia')"), 1500);
      const area = await cdp.js("!![...document.querySelectorAll('textarea')].find(t => t.offsetParent)");
      if (area) {
        await tocca(await centro("[...document.querySelectorAll('textarea')].find(t => t.offsetParent)"), 300);
        await scrivi('warm blues lead, like a Strat into a cranked Fender');
      }
      await dorme(1500);
      await dici('pcIaCopia');
      await tocca(await conTesto('button', 'Copy the request'), 3000);
      await dici('pcIaIncolla');
      await dorme(3500);
    }

    /* ---------- il copione ---------- */

    if (SCENA === 'editor') await cdp.js("localStorage.setItem('editor', 'classico')");
    if (SCENA && SCENA !== 'connetti' && SCENA !== 'pc-collega') {
      await cdp.js(PC ? "document.getElementById('collega').click()" : "document.getElementById('status').click()");
      if (PC) await dorme(4000);
      else for (let i = 0; i < 100 && await cdp.js("!document.querySelector('.slotcard') || [...document.querySelectorAll('.slotcard')].some(e => e.textContent.includes(tr('non letto')))"); i++) await dorme(100);
      await dorme(1500);
    }
    await cdp.manda('Page.startScreencast',
      { format: 'jpeg', quality: 88, maxWidth: LARGO * DPR, maxHeight: ALTO * DPR, everyNthFrame: 1 });
    const inizio = ora();
    if (VOCE && VOCE.pezzi && VOCE.pezzi.titolo) { momenti.titolo = 0.8; ultimoPezzo = 'titolo'; }
    await cdp.js('__dito.mostra(-100,-100)');
    await dorme(3200);                                        // sotto il titolo

    if (SCENA === 'libreria') await scenaLibreria();
    else if (SCENA === 'scheda') await scenaScheda();
    else if (SCENA === 'editor') await scenaEditor();
    else if (SCENA === 'live') await scenaLive();
    else if (SCENA === 'tuner') await scenaTuner();
    else if (SCENA === 'backup') await scenaBackup();
    else if (SCENA === 'pc-prova') await dorme(3000);
    else if (SCENA === 'pc-collega') await scenaPcCollega();
    else if (SCENA === 'pc-editor') await scenaPcEditor();
    else if (SCENA === 'pc-libreria') await scenaPcLibreria();
    else if (SCENA === 'pc-live') await scenaPcLive();
    else if (SCENA === 'pc-ia') await scenaPcIa();
    else {
    await dici('connetti');
    await tocca(await centro("document.getElementById('status')"), 300);
    await cdp.js('__dito.nascondi()');
    await dorme(1600);
    await dici('letti');
    // La didascalia resta finché gli otto slot non si sono riempiti, e un po' oltre.
    // L'interfaccia del 14-17 ottobre 2026: barra in basso, scheda che sale dal
    // basso, editor coi disegni dei blocchi (manopole `.manopola-img`, modello
    // col doppio tocco sul tassello), pulsantoni col circuito e pressione lunga.
    for (let i = 0; i < 100 && await cdp.js("[...document.querySelectorAll('.slotcard')].some(e => e.textContent.includes(tr('non letto')))"); i++) {
      await dorme(100);
    }
    await dorme(1800);

    await dici('libreria');
    await scorri(420, 1100);
    await dorme(SCENA ? 2600 : 1200);
    }
    if (!SCENA) {
    await dici('suona');
    await tocca(await centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes('Blues Breaker')).querySelector('.via')`), 2400);

    await scorri(-(await cdp.js('scrollY')), 900);
    await dici('scheda');
    await tocca(await centro("document.querySelector('.slotcard')"), 2600);

    await dici('editor');
    await tocca(await centro(`[...document.querySelectorAll('#foglioPreset button')].find(b => b.textContent.trim() === ${JSON.stringify(await tradotto('Regola'))})`), 2400);
    await dici('manopole');
    await trascina(await centro("document.querySelectorAll('.manopola-img')[0]"), -70, 900);
    await dorme(300);
    await trascina(await centro("document.querySelectorAll('.manopola-img')[3]"), 55, 800);
    await dorme(900);

    await dici('modello');
    const drive = await conTesto('.tassello', await tradotto('Drive'));
    await doppioTocco(drive, 1300);
    // l'elenco si apre sul modello di adesso: Tube Drive sta più su, mezzo coperto
    await cdp.js("[...document.querySelectorAll('.elenco-voce')].find(e => e.textContent.includes('Tube Drive')).scrollIntoView({ block: 'center', behavior: 'smooth' })");
    await dorme(700);
    await tocca(await conTesto('.elenco-voce', 'Tube Drive'), 1500);
    await trascina(await centro("document.querySelectorAll('.manopola-img')[0]"), -50, 700);
    await dorme(700);

    await dici('salva');
    await tocca(await centro("document.getElementById('btnSalvaModifiche')"), 1500);
    await tocca(await centro("document.querySelector('[data-chiudi=pannelloEditor]')"), 1000);

    await dici('live');
    await tocca(await centro("document.getElementById('tabLive')"), 1000);
    for (const s of ['A2', 'B1']) {
      await tocca(await conTesto('.pad', s), 1000);
    }
    await dici('banco');
    await tocca(await conTesto('#banchi .banco', T.bancoPronto), 1000);
    await tocca(await conTesto('.pad', 'Blues'), 1700);
    await tocca(await conTesto('.pad', 'Lead'), 1700);

    // La pressione lunga: due secondi col dito fermo, la barretta si riempie e
    // si apre l'editor di quel preset; poi Fatto, e si è di nuovo in Live.
    await dici('tieni');
    const funk = await conTesto('.pad', 'Funk');
    await muovi(funk.x, funk.y);
    await dorme(140);
    await cdp.js('__dito.premi(true)');
    await mouse('mousePressed', funk.x, funk.y, { clickCount: 1, buttons: 1 });
    await dorme(2400);
    await mouse('mouseReleased', funk.x, funk.y, { clickCount: 1 });
    await cdp.js('__dito.premi(false)');
    await dorme(1800);
    // niente manopole qui: «Fatto» chiederebbe di salvare, e la scena si allunga
    await dorme(600);
    await tocca(await centro("document.querySelector('[data-chiudi=pannelloEditor]')"), 900);

    await dici('nuovoBanco');
    await tocca(await conTesto('#banchi .banco', '＋'), 900);
    await cdp.js("document.querySelector('.elenco-campo').select()");
    await scrivi(T.bancoNuovo);
    await dorme(500);
    await tocca(await bottone('Crea il banco'), 900);
    await dici('riempi');
    for (const [i, nome] of [[0, 'Funk Rhythm'], [1, 'Crunch Rock'], [2, 'Lead Hendrix']]) {
      await tocca(await centro(`document.querySelectorAll('.pad')[${i}]`), 650);
      await tocca(await conTesto('#elencoScegli .voce', nome), 700);
    }
    await tocca(await centro("document.getElementById('btnModifica')"), 800);

    await cdp.js('__dito.nascondi()');
    await dici(null);
    await cartello(T.cartello, 12000, 'pedale');
    await dici('pedale');
    await tocca(await centro("document.getElementById('tabPedale')"), 1300);
    await tocca(await centro("document.getElementById('btnPedaleConnetti')"), 2600);
    await dici('slotPedale');
    await tocca(await centro("document.querySelectorAll('#pannelloPedale .tendina-finta')[1]"), 900);
    await tocca(await conTesto('.elenco-voce', 'slot 2'), 900);
    await tocca(await centro("document.getElementById('btnMandaAlPedale')"), 2400);
    await dici('inviato');
    await scorri(320, 1000, '#pannelloPedale');
    await dorme(3200);
    }
    await cdp.js('__dito.nascondi()');
    await dici(null);
    let outro = 4.5;                                          // sotto il finale
    if (VOCE && VOCE.pezzi) {
      await aspetta('finale');
      const t = ora() - inizio;
      outro = Math.max(4.5, VOCE.pezzi.finale.durata + 1.5);
      while (ora() - inizio < t + outro) await dorme(20);
    } else if (VOCE) {
      await aspetta('finale');
      const t = ora() - inizio;
      while (ora() - inizio < VOCE.fine) await dorme(20);
      outro = VOCE.fine - t;
    } else await dorme(4500);
    const fine = ora();
    await cdp.manda('Page.stopScreencast');
    await dorme(300);

    const linea = { inizio, fine, outro, voce: VOCE && { file: VOCE.file, taglio: VOCE.taglio, silenzi: VOCE.silenzi || [],
                                      pezzi: VOCE.pezzi, momenti },
                    fotogrammi, didascalie, cartelli, testi: T, largo: LARGO * DPR, alto: ALTO * DPR, orizzontale: PC };
    fs.writeFileSync(path.join(USCITA, 'linea.json'), JSON.stringify(linea));
    console.log(`registrati ${fotogrammi.length} fotogrammi in ${(fine - inizio).toFixed(1)} s`);

    }
    if (SOLO_MONTAGGIO && VOCE) {
      // la voce di adesso, che può avere silenzi nuovi
      const linea = JSON.parse(fs.readFileSync(path.join(USCITA, 'linea.json'), 'utf8'));
      // pezzi e momenti restano: senza, la voce perdeva i tempi delle scene
      linea.voce = { ...linea.voce, file: VOCE.file, taglio: VOCE.taglio, silenzi: VOCE.silenzi || [] };
      fs.writeFileSync(path.join(USCITA, 'linea.json'), JSON.stringify(linea));
    }

    /* ---------- il montaggio ---------- */

    const fatto = new Promise(r => { fineMontaggio = r; });
    const carico = cdp.evento('Page.loadEventFired');
    await cdp.manda('Emulation.clearDeviceMetricsOverride');
    await cdp.manda('Page.navigate', { url: `http://localhost:${PORTA_WEB}/tools/video-demo/monta.html` });
    await carico;
    const tipo = await cdp.js('monta()');
    console.log('montaggio:', tipo);
    const nome = await fatto;
    if (nome === 'errore.txt') throw new Error('montaggio: ' + fs.readFileSync(path.join(USCITA, nome), 'utf8'));
    const mp4 = require('./scrivi-mp4')(USCITA);
    console.log('salvato', mp4.file, `(${mp4.secondi} s, ${mp4.fotogrammi} fotogrammi, ${mp4.pacchettiAudio} pacchetti audio)`);
  } finally {
    // edge.kill() lascia vivi i figli, che tengono la porta e la cache del
    // profilo: il video dopo si montava coi dati di quello prima. Si chiudono
    // tutti gli Edge col profilo di questa cartella.
    edge.kill();
    require('child_process').spawnSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -like '*" +
      path.join(USCITA, 'profilo-edge').replace(/'/g, "''") + "*' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }"]);
    server.close();
  }
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
