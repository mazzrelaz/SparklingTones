// Il video dimostrativo del pedale, disegnato (19 ottobre 2026).
//
//   node tools/video-demo/pedale-video.js <cartella di uscita>
//
// Nella cartella di uscita servono, se ci sono:
//   voce.json + voce.wav  la voce a pezzi, da
//       node tools/video-demo/voce-sintetica.mjs <kokoro> <uscita> --testo tools/video-demo/pedale-voce.en.json
//   telefono.jpg          la schermata dell'app che manda il banco, per la scena del ponte
//                         (un fotogramma del video dell'app, pannello «Pedal»)
//
// Apre Edge senza finestra su pedale-video.html, che disegna e codifica ogni
// fotogramma da sé (1920×1080, 30 fps esatti, WebCodecs), e scrive demo.mp4
// con scrivi-mp4.js. Niente dipendenze, come registra.js.

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RADICE = path.resolve(__dirname, '..', '..');
const USCITA = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'spark-video-pedale'));
const PORTA_WEB = 8124, PORTA_CDP = 9334;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const dorme = ms => new Promise(r => setTimeout(r, ms));

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg', '.wav': 'audio/wav' };

let fine = null;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__salva') {
    const nome = path.basename(url.searchParams.get('nome') || 'x');
    const pezzi = [];
    req.on('data', d => pezzi.push(d));
    req.on('end', () => {
      if (nome === 'passo') { console.log(new Date().toLocaleTimeString(), 'fotogrammi', Buffer.concat(pezzi).toString()); return res.end('ok'); }
      fs.writeFileSync(path.join(USCITA, nome), Buffer.concat(pezzi));
      res.end('ok');
      if (fine && (nome === 'fatto.json' || nome === 'errore.txt')) fine(nome);
    });
    return;
  }
  const file = url.pathname.startsWith('/__uscita/')
    ? path.join(USCITA, decodeURIComponent(url.pathname.slice(10)))
    : path.join(RADICE, decodeURIComponent(url.pathname));
  fs.readFile(file, (err, dati) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', TIPI[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(dati);
  });
});

async function main() {
  fs.mkdirSync(USCITA, { recursive: true });
  for (const f of ['fatto.json', 'errore.txt', 'video.bin', 'audio.bin']) fs.rmSync(path.join(USCITA, f), { force: true });
  await new Promise(r => server.listen(PORTA_WEB, r));
  const profilo = path.join(USCITA, 'profilo-edge');
  fs.rmSync(profilo, { recursive: true, force: true });
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${profilo}`,
    '--no-first-run', '--hide-scrollbars', '--mute-audio', '--window-size=1000,600', 'about:blank'], { stdio: 'ignore' });
  try {
    let ws = null;
    for (let i = 0; i < 50 && !ws; i++) {
      try {
        const p = (await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`)).json()).find(x => x.type === 'page');
        if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; }); }
      } catch (_) { ws = null; }
      if (!ws) await dorme(200);
    }
    if (!ws) throw new Error('Edge non risponde');
    let n = 0;
    const attese = new Map(), ascolti = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) { const a = attese.get(m.id); attese.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
      else ascolti.forEach(f => f(m));
    };
    const manda = (method, params = {}) => new Promise((res, rej) => {
      const id = ++n; attese.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
    });
    await manda('Page.enable');
    const carico = new Promise(r => ascolti.push(m => { if (m.method === 'Page.loadEventFired') r(); }));
    await manda('Page.navigate', { url: `http://localhost:${PORTA_WEB}/tools/video-demo/pedale-video.html` });
    await carico;
    const fatto = new Promise(r => { fine = r; });
    const r = await manda('Runtime.evaluate', { expression: 'gira()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    console.log('video:', r.result.value);
    const nome = await fatto;
    if (nome === 'errore.txt') throw new Error(fs.readFileSync(path.join(USCITA, nome), 'utf8'));
    const mp4 = require('./scrivi-mp4')(USCITA);
    console.log('salvato', mp4.file, `(${mp4.secondi} s, ${mp4.fotogrammi} fotogrammi, ${mp4.pacchettiAudio} pacchetti audio)`);
  } finally {
    edge.kill();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
