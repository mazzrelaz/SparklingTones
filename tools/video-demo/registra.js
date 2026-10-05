// Registra il video dimostrativo dell'app.
//
//   node tools/video-demo/registra.js <cartella di uscita> [it|en]
//
// Apre Edge senza finestra in formato telefono, con l'ampli finto
// (ampli-finto.js) al posto del Bluetooth, e recita il copione qui sotto
// toccando l'app come un dito. I fotogrammi arrivano dallo screencast di
// Chrome DevTools; alla fine monta.html li rimonta in tempo reale su un
// canvas verticale 1080×1920 con le didascalie, e MediaRecorder ne fa un MP4.
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
const FOTO = path.join(USCITA, 'fotogrammi');
const PORTA_WEB = 8123, PORTA_CDP = 9333;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LARGO = 390, ALTO = 844, DPR = 2;

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
      fs.writeFileSync(path.join(USCITA, nome), Buffer.concat(pezzi));
      res.end('ok');
      if (fineMontaggio) fineMontaggio(nome);
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
    `--user-data-dir=${profilo}`, '--no-first-run', '--hide-scrollbars', '--mute-audio',
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
    editor: 'L\'editor: la catena effetti, blocco per blocco',
    manopole: 'Giri le manopole e l\'ampli cambia mentre suoni',
    modello: 'Cambi pedale o ampli da un elenco',
    salva: 'Salvi in libreria solo quando ti piace',
    live: 'La vista live: pulsantoni da toccare suonando',
    banco: 'I banchi: otto suoni a portata di piede',
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
  },
};
const T = TESTI[LINGUA] || TESTI.it;

async function main() {
  fs.mkdirSync(FOTO, { recursive: true });
  for (const f of fs.readdirSync(FOTO)) fs.unlinkSync(path.join(FOTO, f));
  await new Promise(r => server.listen(PORTA_WEB, r));
  const { edge, cdp } = await apriEdge();

  try {
    await cdp.manda('Page.enable');
    await cdp.manda('Runtime.enable');
    await cdp.manda('Emulation.setDeviceMetricsOverride',
      { width: LARGO, height: ALTO, deviceScaleFactor: DPR, mobile: true });

    const catture = JSON.parse(fs.readFileSync(path.join(RADICE, 'captures/2026-08-10-libreria-8-preset.json'), 'utf8'));
    const slot = Array.isArray(catture) ? catture : Object.values(catture);
    // Niente invito a installare la PWA in mezzo al video.
    const prima = `try { localStorage.setItem('pwa-installa-no', '1'); } catch (_) {}
` +
      `window.__PRESET_AMPLI = ${JSON.stringify(slot)};\n` +
      fs.readFileSync(path.join(__dirname, 'ampli-finto.js'), 'utf8') + '\n' +
      fs.readFileSync(path.join(__dirname, 'dito.js'), 'utf8');
    await cdp.manda('Page.addScriptToEvaluateOnNewDocument', { source: prima });

    const app = `http://localhost:${PORTA_WEB}/index.html?lang=${LINGUA}`;
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
      const banco = await store.addBank('Concerto');
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
    const dici = testo => didascalie.push({ t: ora(), testo });
    // Un cartello a tutto schermo, disegnato dal montaggio sopra l'app ferma.
    const cartelli = [];
    async function cartello(righe, ms) {
      const t0 = ora();
      await dorme(ms);
      cartelli.push({ t0, t1: ora(), righe });
    }
    async function scrivi(testo) {
      for (const c of testo) { await cdp.manda('Input.insertText', { text: c }); await dorme(120); }
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
    const bottone = t => centro(`[...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.trim() === ${JSON.stringify(t)})`);
    const conTesto = (sel, t) => centro(`[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.offsetParent && e.textContent.includes(${JSON.stringify(t)}))`);

    /* ---------- il copione ---------- */

    await cdp.manda('Page.startScreencast',
      { format: 'jpeg', quality: 88, maxWidth: LARGO * DPR, maxHeight: ALTO * DPR, everyNthFrame: 1 });
    const inizio = ora();
    await cdp.js('__dito.mostra(-100,-100)');
    await dorme(3200);                                        // sotto il titolo

    dici(T.connetti);
    await tocca(await centro("document.getElementById('status')"), 300);
    await cdp.js('__dito.nascondi()');
    await dorme(1600);
    dici(T.letti);
    // La didascalia resta finché gli otto slot non si sono riempiti, e un po' oltre.
    for (let i = 0; i < 100 && await cdp.js("[...document.querySelectorAll('.slotcard')].some(e => e.textContent.includes('non ancora letto'))"); i++) {
      await dorme(100);
    }
    await dorme(1800);

    dici(T.libreria);
    await scorri(560, 1100);
    await dorme(1200);
    dici(T.suona);
    await tocca(await centro(`[...document.querySelectorAll('#listaLibreria .row')].find(r => r.textContent.includes('Blues Breaker')).querySelector('.via')`), 2400);

    await scorri(-560, 900);
    dici(T.scheda);
    await tocca(await centro("document.querySelector('.slotcard')"), 600);
    await scorri(330, 800);
    await dorme(1800);

    dici(T.editor);
    await tocca(await bottone('Regola'), 2200);
    dici(T.manopole);
    await trascina(await centro("document.querySelectorAll('.pomello')[0]"), -70, 900);
    await dorme(300);
    await trascina(await centro("document.querySelectorAll('.pomello')[3]"), 55, 800);
    await dorme(900);

    dici(T.modello);
    await tocca(await conTesto('button.tassello', 'Drive'), 700);
    await tocca(await centro("document.querySelector('button.nome-effetto')"), 1100);
    await tocca(await conTesto('.elenco-voce', 'Tube Drive'), 1400);
    await trascina(await centro("document.querySelectorAll('.pomello')[0]"), -50, 700);
    await dorme(700);

    dici(T.salva);
    await tocca(await centro("document.getElementById('btnSalvaModifiche')"), 1500);
    await tocca(await centro("document.querySelector('[data-chiudi=pannelloEditor]')"), 1000);

    await scorri(-(await cdp.js('scrollY')), 700);
    dici(T.live);
    await tocca(await centro("document.getElementById('btnVista')"), 1000);
    for (const s of ['A2', 'B1', 'A4']) {
      await tocca(await conTesto('.pad', s), 1100);
    }
    dici(T.banco);
    await tocca(await conTesto('#banchi .banco', 'Concerto'), 1000);
    await tocca(await conTesto('.pad', 'Blues'), 1700);
    await tocca(await conTesto('.pad', 'Lead'), 1700);

    dici(T.nuovoBanco);
    await tocca(await conTesto('#banchi .banco', '＋'), 900);
    await cdp.js("document.querySelector('.elenco-campo').select()");
    await scrivi('Prove');
    await dorme(500);
    await tocca(await bottone('Crea il banco'), 900);
    dici(T.riempi);
    for (const [i, nome] of [[0, 'Funk Rhythm'], [1, 'Crunch Rock'], [2, 'Lead Hendrix']]) {
      await tocca(await centro(`document.querySelectorAll('.pad')[${i}]`), 800);
      await tocca(await conTesto('#elencoScegli .voce', nome), 900);
    }
    await tocca(await centro("document.getElementById('btnMenu')"), 600);
    await tocca(await centro("document.getElementById('btnModifica')"), 1500);

    await cdp.js('__dito.nascondi()');
    dici(null);
    await cartello(T.cartello, 12000);
    dici(T.pedale);
    await tocca(await centro("document.getElementById('btnMenu')"), 600);
    await tocca(await centro("document.getElementById('btnPedale')"), 1300);
    await tocca(await centro("document.getElementById('btnPedaleConnetti')"), 2600);
    dici(T.slotPedale);
    await tocca(await centro("document.querySelectorAll('#pannelloPedale .tendina-finta')[1]"), 900);
    await tocca(await conTesto('.elenco-voce', 'slot 2'), 900);
    await tocca(await centro("document.getElementById('btnMandaAlPedale')"), 2400);
    dici(T.inviato);
    await scorri(320, 1000, '#pannelloPedale');
    await dorme(3200);
    await cdp.js('__dito.nascondi()');
    dici(null);
    await dorme(4500);                                        // sotto il finale
    const fine = ora();
    await cdp.manda('Page.stopScreencast');
    await dorme(300);

    const linea = { inizio, fine, fotogrammi, didascalie, cartelli, testi: T, largo: LARGO * DPR, alto: ALTO * DPR };
    fs.writeFileSync(path.join(USCITA, 'linea.json'), JSON.stringify(linea));
    console.log(`registrati ${fotogrammi.length} fotogrammi in ${(fine - inizio).toFixed(1)} s`);

    /* ---------- il montaggio ---------- */

    const fatto = new Promise(r => { fineMontaggio = r; });
    carico = cdp.evento('Page.loadEventFired');
    await cdp.manda('Emulation.clearDeviceMetricsOverride');
    await cdp.manda('Page.navigate', { url: `http://localhost:${PORTA_WEB}/tools/video-demo/monta.html` });
    await carico;
    const tipo = await cdp.js('monta()');
    console.log('montaggio:', tipo);
    const nome = await fatto;
    console.log('salvato', path.join(USCITA, nome));
  } finally {
    edge.kill();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
