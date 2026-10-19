// Il server della pagina voce-openai.html: la serve, e salva la voce che fa.
//
//   node tools/video-demo/voce-openai.js <cartella base>
//
// Poi nel browser: http://localhost:8125/tools/video-demo/voce-openai.html
// La pagina manda voce.wav e voce.json di ogni video; finiscono in
// <cartella base>/app e <cartella base>/pedale, pronti per
//   node tools/video-demo/registra.js <base>/app it --voce voce.json
//   node tools/video-demo/pedale-video.js <base>/pedale
// La chiave di OpenAI non passa di qui: la pagina chiama api.openai.com da sé.

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RADICE = path.resolve(__dirname, '..', '..');
const BASE = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'spark-voce'));
const TIPI = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  console.log(new Date().toLocaleTimeString(), req.method, url.pathname + url.search);
  if (req.method === 'POST' && url.pathname === '/__salva') {
    const cartella = url.searchParams.get('cartella');
    const nome = path.basename(url.searchParams.get('nome') || '');
    if (!['app', 'pedale'].includes(cartella) || !['voce.wav', 'voce.json'].includes(nome)) { res.statusCode = 400; return res.end(); }
    const pezzi = [];
    req.on('data', d => pezzi.push(d));
    req.on('end', () => {
      fs.mkdirSync(path.join(BASE, cartella), { recursive: true });
      fs.writeFileSync(path.join(BASE, cartella, nome), Buffer.concat(pezzi));
      console.log('salvato', path.join(cartella, nome));
      res.end('ok');
    });
    return;
  }
  // solo la cartella dello strumento
  const file = path.join(__dirname, path.basename(url.pathname));
  fs.readFile(file, (err, dati) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', TIPI[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');      // Chrome teneva la versione vecchia della pagina
    res.end(dati);
  });
}).listen(8125, '127.0.0.1', () => console.log('voce su http://localhost:8125/tools/video-demo/voce-openai.html →', BASE));
