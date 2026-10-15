// Serve la bozza nella rete di casa, per guardarla dal telefono senza pubblicarla.
// Uso: node server-rete.js <cartella> <porta>
const http = require('http');
const fs = require('fs');
const path = require('path');

const radice = path.resolve(process.argv[2]);
const porta = +(process.argv[3] || 8096);
const tipi = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(radice, p);
  if (!file.startsWith(radice)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, dati) => {
    if (err) { res.writeHead(404); res.end('non trovato'); return; }
    res.writeHead(200, {
      'Content-Type': tipi[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',          // sempre i file di adesso
    });
    res.end(dati);
  });
}).listen(porta, '0.0.0.0', () => console.log(`bozza su http://0.0.0.0:${porta}/ da ${radice}`));
