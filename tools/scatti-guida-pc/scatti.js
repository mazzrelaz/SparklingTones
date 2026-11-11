// Scatta le schermate di pc.html (ampli finto) per la guida del computer, e misura
// dove stanno davvero gli elementi da numerare: i numeri non si mettono a occhio.
// Uso: electron scatti.js <cartella di uscita>
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[process.argv.length - 1];
app.setPath('userData', path.join(OUT, '..', 'profilo-scatti'));
const L = 1440, A = 900;
const attesa = ms => new Promise(r => setTimeout(r, ms));
const pins = {};

app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: L, height: A, show: true, useContentSize: true,
    webPreferences: { backgroundThrottling: false, zoomFactor: 1 } });
  const js = c => w.webContents.executeJavaScript(`(async () => { ${c} })()`);

  // punti: [numero, selettore, 'zona' | 'pezzo']; altezza: dove tagliare la foto
  const scatta = async (nome, punti, altezza = A) => {
    await attesa(800);
    const misure = await js(`return ${JSON.stringify(punti)}.map(([n, sel, tipo]) => {
      const e = typeof sel === 'string' ? document.querySelector(sel) : null;
      if (!e) return { n, manca: sel };
      const r = e.getBoundingClientRect();
      // zona: il numero dentro l'angolo in alto a sinistra; pezzo: sull'angolo, mezzo fuori
      // zona@fx,fy: un punto dentro la zona; sinistra/destra/sopra/sotto: accanto al pezzo, fuori
      let x, y;
      if (tipo.startsWith('zona')) { const [fx, fy] = (tipo.split('@')[1] || '0.02,0.04').split(',').map(Number);
        x = r.left + r.width * fx; y = r.top + r.height * fy; if (fx < 0.1) x = Math.max(x, r.left + 18); if (fy < 0.1) y = Math.max(y, r.top + 18); }
      else if (tipo === 'sinistra') { x = r.left - 34; y = r.top + r.height / 2; }
      else if (tipo === 'destra') { x = r.right + 48; y = r.top + r.height / 2; }
      else if (tipo === 'sopra') { x = r.left + r.width / 2; y = r.top - 38; }
      else { x = r.left + r.width / 2; y = r.bottom + 28; }
      return { n, x, y };
    });`);
    for (const m of misure) if (m.manca) throw new Error(nome + ': non trovo ' + m.manca);
    pins[nome] = { altezza, punti: misure.map(m => ({ n: m.n, x: +(m.x / L * 100).toFixed(2), y: +(m.y / altezza * 100).toFixed(2) })) };
    const img = await w.webContents.capturePage({ x: 0, y: 0, width: L, height: altezza });
    const png = img.toDataURL();
    const webp = await js(`return await new Promise(r => { const i = new Image(); i.onload = () => {
      const c = document.createElement('canvas'); c.width = ${L}; c.height = ${altezza};
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); r(c.toDataURL('image/webp', 0.86)); }; i.src = ${JSON.stringify(png)}; });`);
    fs.writeFileSync(path.join(OUT, nome + '.webp'), Buffer.from(webp.split(',')[1], 'base64'));
    console.log('scatto', nome, JSON.stringify(pins[nome]));
  };

  await w.loadURL('http://localhost:8099/pc.html?scatti=1#finto');
  await js(`localStorage.setItem('lingua','it'); localStorage.setItem('pedale-pc','si'); localStorage.setItem('hendrix','si');`);
  await w.loadURL('http://localhost:8099/pc.html?scatti=2#finto');
  await attesa(1500);
  await js(`document.getElementById('collega').click();`);
  await attesa(4000);
  await js(`const r = document.querySelector('#elenco-corpo [data-id], #elenco-corpo li, #elenco-corpo .riga'); r && r.click();`);
  await attesa(2500);
  await js(`const b = document.querySelectorAll('#catena .anello .miniatura')[3]; b && b.click();`);
  await attesa(1200);
  await js(`stato('');`).catch(() => {});

  await scatta('pc-principale', [
    [1, 'header.barra', 'zona@0.42,0.5'], [2, '.sotto-barra', 'zona@0.352,0.5'], [3, '#palco', 'zona@0.02,0.04'],
    [4, '#elenco', 'zona@0.5,0.82'], [5, '#sezione-catena', 'zona@0.968,0.12']]);
  await scatta('pc-suono', [
    [1, '#catena .anello:nth-child(3) .chip', 'sinistra'], [2, '#catena .anello:nth-child(3) .mod', 'sinistra'],
    [3, '#manopole li', 'sinistra'], [4, '#cerca-modello', 'sinistra'], [5, 'header.barra .gruppo', 'sotto']]);

  await js(`const ids = (await store.all()).map(r => r.id).slice(0, 6);
    await store.setBanks([{ id: 'b1', uuid: 'b1', nome: 'Concerto sabato', posti: [...ids, null, null] },
                          { id: 'b2', uuid: 'b2', nome: 'Prove', posti: [ids[1], ids[3], null, null, null, null, null, null] }]);
    await aggiornaBanchi(); apriBanchi();`);
  await scatta('pc-banchi', [
    [1, '.sl-preset', 'zona@0.5,0.6'], [2, '[data-f="blocchi"] > :nth-child(1)', 'sopra'],
    [3, '[data-f="blocchi"] > :nth-child(2)', 'sopra'], [4, '[data-f="nuovo"]', 'sinistra']], 700);
  await js(`chiudiSchermi();`);

  await js(`apriPedale();`);
  await scatta('pc-pedale', [
    [1, '[data-f="cerca"]', 'sinistra'], [2, '[data-f="manda"]', 'destra'], [3, '[data-f="slots"]', 'zona@0.5,0.5']], 500);
  await js(`chiudiSchermi();`);

  await js(`apriGeneraIA();`);
  await attesa(500);
  await js(`const t = document.querySelector('[data-f="descrizione"]'); if (t) t.value = 'crunch anni 70 con un po\\' di delay';`);
  await scatta('pc-ia', [
    [1, '[data-f="descrizione"]', 'sinistra'], [2, '[data-f="copia"]', 'destra'],
    [3, '[data-f="risposta"]', 'sinistra'], [4, '.finestra button.primario:last-of-type', 'sopra']]);
  await js(`chiudiFinestra(null);`);

  await js(`apriImpostazioni();`);
  await scatta('pc-impostazioni', []);
  fs.writeFileSync(path.join(OUT, 'pins.json'), JSON.stringify(pins, null, 1));
  app.quit();
});
