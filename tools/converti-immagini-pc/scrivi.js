// Legge i dom-*.txt di converti.html e scrive le WebP; stampa misure, peso e se lo sfondo era trasparente.
'use strict';
const fs = require('fs');
const path = require('path');
const [qui, uscita] = process.argv.slice(2);
let n = 0, byte = 0;
const opachi = [], errori = [];
for (const f of fs.readdirSync(qui).filter(f => /^dom-\d+\.txt$/.test(f))) {
  const tutto = fs.readFileSync(path.join(qui, f), 'utf8');
  const t = tutto.slice(0, tutto.indexOf('</pre>'));   // solo l'uscita, non il sorgente dello script
  if (!t.includes('FINITO')) errori.push(f + ': pagina non finita');
  for (const m of t.matchAll(/FILE (\S+) (\d+) (\d+) ([TO]) data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)) {
    const nome = m[1].replace(/\.png$/, '.webp');
    const b = Buffer.from(m[5], 'base64');
    fs.writeFileSync(path.join(uscita, nome), b);
    n++; byte += b.length;
    if (m[4] === 'O') opachi.push(m[1]);
  }
  for (const m of t.matchAll(/ERRORE (\S+) (.*)/g)) errori.push(m[1] + ': ' + m[2]);
}
console.log(`${n} WebP, ${(byte / 1048576).toFixed(1)} MB`);
if (opachi.length) console.log('sfondo NON trasparente:', opachi.join(', '));
if (errori.length) console.log('errori:', errori.join(' | '));
