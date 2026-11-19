/**
 * tools/prove.js — tutte le prove in un comando solo (19 novembre 2026).
 *
 *   node tools/prove.js          le cinque suite di test/ e i giri sulle pagine
 *   node tools/prove.js suite    solo le suite
 *   node tools/prove.js giri     solo i giri (test/giri-*.js)
 *
 * Niente da installare: Node 22 o più (per `WebSocket` e `fetch`) ed Edge, che Windows ha già.
 * Un server statico su 127.0.0.1, a una porta libera, solo GET e chiuso nella cartella del
 * progetto; Edge senza finestra con un profilo nuovo, buttato alla fine: la libreria vera, il
 * service worker e i preset dell'utente non si toccano mai. Esce con 0 se è tutto verde.
 *
 * Prima di oggi le suite andavano lanciate a mano, tre da file:// e due dal riquadro del
 * browser (in headless con `--virtual-time-budget` store restava su «esecuzione…»: il tempo
 * finto finiva prima di IndexedDB). Qui il tempo è vero, e si aspetta il riassunto.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const RADICE = path.resolve(__dirname, '..');
const SUITE = ['protocol', 'transport', 'store', 'backup', 'dropbox'];
const TEMPO_SUITE = 90000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

/* ---------- il server: solo la cartella del progetto, solo da questo PC ---------- */

function avviaServer() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let via;
    try { via = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch (e) { res.writeHead(400); res.end(); return; }
    if (via.endsWith('/')) via += 'index.html';
    const file = path.resolve(RADICE, '.' + via);
    // Il separatore in coda: `spark-altro` non deve passare per `spark` (audit del 15 novembre).
    if (!file.startsWith(RADICE + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, dati) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {
        'Content-Type': TIPI[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : dati);
    });
  });
  return new Promise((ok, ko) => {
    server.once('error', ko);
    server.listen(0, '127.0.0.1', () => ok(server));
  });
}

/* ---------- Edge senza finestra, pilotato dal DevTools Protocol ---------- */

function trovaEdge() {
  const cartelle = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA];
  return cartelle.filter(Boolean)
    .map(c => path.join(c, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
    .find(f => fs.existsSync(f));
}

/** Un canale DevTools verso una pagina: comandi con risposta, ed eventi raccolti. */
class Canale {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.prossimo = 0;
    this.attese = new Map();
    this.ascoltatori = [];
    this.ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.attese.has(m.id)) {
        const { ok, ko } = this.attese.get(m.id);
        this.attese.delete(m.id);
        m.error ? ko(new Error(m.error.message)) : ok(m.result);
      } else if (m.method) {
        for (const a of this.ascoltatori) a(m.method, m.params);
      }
    };
  }
  aperto() {
    return new Promise((ok, ko) => { this.ws.onopen = ok; this.ws.onerror = () => ko(new Error('DevTools non risponde')); });
  }
  manda(method, params) {
    const id = ++this.prossimo;
    this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    return new Promise((ok, ko) => this.attese.set(id, { ok, ko }));
  }
  /** Valuta un'espressione nella pagina e ne restituisce il valore (le promesse si aspettano). */
  async valuta(espressione) {
    const r = await this.manda('Runtime.evaluate',
      { expression: espressione, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const e = r.exceptionDetails;
      throw new Error((e.exception && e.exception.description) || e.text);
    }
    return r.result.value;
  }
  chiudi() { try { this.ws.close(); } catch (e) { /* già chiuso */ } }
}

/**
 * Accende Edge e restituisce `{ pagina, chiudi }`. `pagina.vai(url)` carica e aspetta, gli
 * errori JavaScript della pagina finiscono in `pagina.errori`.
 */
async function avviaBrowser() {
  const exe = trovaEdge();
  if (!exe) throw new Error('Edge non trovato');
  const profilo = fs.mkdtempSync(path.join(os.tmpdir(), 'spark-prove-'));
  const edge = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profilo, 'about:blank'], { stdio: 'ignore' });

  let porta = null;
  const filePorta = path.join(profilo, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !porta; i++) {
    await sleep(100);
    try { porta = Number(fs.readFileSync(filePorta, 'utf8').split('\n')[0]) || null; } catch (e) { /* non ancora */ }
  }
  if (!porta) { edge.kill(); throw new Error('Edge non apre DevTools'); }

  const bersagli = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  const bersaglio = bersagli.find(b => b.type === 'page');
  const pagina = new Canale(bersaglio.webSocketDebuggerUrl);
  await pagina.aperto();
  pagina.errori = [];
  pagina.ascoltatori.push((metodo, p) => {
    if (metodo === 'Runtime.exceptionThrown') {
      const e = p.exceptionDetails;
      pagina.errori.push((e.exception && e.exception.description) || e.text);
    } else if (metodo === 'Runtime.consoleAPICalled' && p.type === 'error') {
      pagina.errori.push(p.args.map(a => a.value !== undefined ? a.value : a.description).join(' '));
    }
  });
  await pagina.manda('Runtime.enable');
  await pagina.manda('Page.enable');

  pagina.vai = async url => {
    // Da about:blank: verso lo stesso indirizzo con `#` il browser non ricaricherebbe la pagina.
    await pagina.manda('Page.navigate', { url: 'about:blank' });
    await pagina.aspetta(`location.href === 'about:blank'`, 5000, 'about:blank');
    pagina.errori.length = 0;
    await pagina.manda('Page.navigate', { url });
    for (let i = 0; i < 200; i++) {
      await sleep(50);
      try {
        if (await pagina.valuta(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`)) return;
      } catch (e) { /* contesto in ricostruzione */ }
    }
    throw new Error('la pagina non finisce di caricare: ' + url);
  };
  /** Aspetta che un'espressione diventi vera (o non vuota); ne restituisce il valore. */
  pagina.aspetta = async (espressione, ms, cosa) => {
    const fine = Date.now() + (ms || 5000);
    let ultimo;
    while (Date.now() < fine) {
      try { ultimo = await pagina.valuta(espressione); if (ultimo) return ultimo; } catch (e) { ultimo = e.message; }
      await sleep(50);
    }
    throw new Error(`tempo scaduto: ${cosa || espressione}`);
  };

  /**
   * Trascina col mouse del browser (eventi veri, non costruiti a mano: `setPointerCapture`
   * li vuole), dal centro dell'elemento di `dx`, `dy` pixel.
   */
  pagina.trascina = async (elemento, dx, dy) => {
    // Si aspetta che stia fermo: un pannello che entra scorrendo lo sposta mentre si preme.
    const centro = () => pagina.valuta(`(e => { e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })(${elemento})`);
    let c = await centro();
    for (let i = 0; i < 30; i++) {
      await sleep(100);
      const d = await centro();
      if (Math.abs(d.x - c.x) < 0.5 && Math.abs(d.y - c.y) < 0.5) break;
      c = d;
    }
    const mouse = (type, x, y, buttons) => pagina.manda('Input.dispatchMouseEvent',
      { type, x, y, button: 'left', buttons, clickCount: 1 });
    await mouse('mousePressed', c.x, c.y, 1);
    for (let i = 1; i <= 5; i++) await mouse('mouseMoved', c.x + dx * i / 5, c.y + dy * i / 5, 1);
    await mouse('mouseReleased', c.x + dx, c.y + dy, 0);
  };

  const chiudi = async () => {
    pagina.chiudi();
    edge.kill();
    await sleep(500);
    for (let i = 0; i < 10; i++) {
      try { fs.rmSync(profilo, { recursive: true, force: true }); break; } catch (e) { await sleep(300); }
    }
  };
  return { pagina, chiudi };
}

/* ---------- le suite ---------- */

async function suite(pagina, base) {
  const esiti = [];
  for (const nome of SUITE) {
    await pagina.vai(`${base}/test/${nome}-test.html`);
    let riassunto;
    try {
      riassunto = await pagina.aspetta(
        `(t => /\\d+ passati/.test(t) && t)(document.getElementById('summary').textContent)`, TEMPO_SUITE);
    } catch (e) {
      esiti.push({ nome, ok: false, riga: 'non finisce (più di 90 s)', falliti: [] });
      continue;
    }
    const falliti = await pagina.valuta(`[...document.querySelectorAll('#out .fail')].map(e => e.textContent.trim())`);
    const m = /(\d+) passati, (\d+) falliti/.exec(riassunto);
    esiti.push({ nome, ok: !!m && m[2] === '0', riga: riassunto.trim(), falliti });
  }
  return esiti;
}

/* ---------- i giri: test/giri-*.js, ognuno esporta { nome, pagina, prove: [{ nome, fai }] } ---------- */

async function giri(pagina, base) {
  const esiti = [];
  const file = fs.readdirSync(path.join(RADICE, 'test')).filter(f => /^giri-.*\.js$/.test(f)).sort();
  for (const f of file) {
    const giro = require(path.join(RADICE, 'test', f));
    // `iniezione`: codice che gira in ogni pagina del giro prima dei suoi script (l'ampli finto
    // del telefono, che la pagina non sa caricare da sola). Solo per questo giro.
    const iniettato = giro.iniezione
      ? (await pagina.manda('Page.addScriptToEvaluateOnNewDocument', { source: giro.iniezione(RADICE) })).identifier
      : null;
    try {
      await provaGiro(pagina, base, giro, esiti);
    } finally {
      if (iniettato) await pagina.manda('Page.removeScriptToEvaluateOnNewDocument', { identifier: iniettato });
    }
  }
  return esiti;
}

async function provaGiro(pagina, base, giro, esiti) {
  for (const prova of giro.prove) {
    const t0 = Date.now();
    try {
      await pagina.vai(`${base}/${giro.pagina}`);
      await prova.fai(pagina, { sleep });
      if (pagina.errori.length) throw new Error('errori nella pagina: ' + pagina.errori.join(' | '));
      esiti.push({ nome: `${giro.nome}: ${prova.nome}`, ok: true, ms: Date.now() - t0 });
    } catch (e) {
      esiti.push({ nome: `${giro.nome}: ${prova.nome}`, ok: false, ms: Date.now() - t0, errore: e.message });
    }
  }
}

/* ---------- tutto insieme ---------- */

async function main() {
  const cosa = process.argv[2] || 'tutto';
  if (!['tutto', 'suite', 'giri'].includes(cosa)) {
    console.log('uso: node tools/prove.js [suite|giri]');
    process.exit(2);
  }
  const server = await avviaServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const { pagina, chiudi } = await avviaBrowser();
  let tuttoVerde = true;
  try {
    if (cosa !== 'giri') {
      console.log('Suite');
      for (const e of await suite(pagina, base)) {
        console.log(`  ${e.ok ? 'ok ' : 'NO '} ${e.nome.padEnd(10)} ${e.riga}`);
        for (const f of e.falliti) console.log(`        ✗ ${f}`);
        if (!e.ok) tuttoVerde = false;
      }
    }
    if (cosa !== 'suite') {
      console.log('Giri');
      const esiti = await giri(pagina, base);
      if (!esiti.length) console.log('  (nessun test/giri-*.js)');
      for (const e of esiti) {
        console.log(`  ${e.ok ? 'ok ' : 'NO '} ${e.nome} (${(e.ms / 1000).toFixed(1)} s)`);
        if (!e.ok) { console.log(`        ✗ ${e.errore}`); tuttoVerde = false; }
      }
    }
  } finally {
    await chiudi();
    server.close();
  }
  console.log(tuttoVerde ? '\nTutto verde.' : '\nQualcosa non va: sopra le righe con NO.');
  process.exit(tuttoVerde ? 0 : 1);
}

if (require.main === module) {
  main().catch(e => { console.error('prove.js: ' + e.message); process.exit(2); });
}
module.exports = { avviaServer, avviaBrowser };
