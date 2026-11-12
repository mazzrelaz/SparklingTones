// Fa le icone del pacchetto per il Microsoft Store (build/appx/) da build/icon.png.
// Si lancia con Electron, che sa ridimensionare le immagini senza altro:
//   npx electron tools-icone-store.js
// Le tessere larghe hanno l'icona al centro su fondo scuro, come la finestra.
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const icona = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
  if (icona.isEmpty()) { console.error('build/icon.png non trovata'); app.exit(1); return; }
  const cartella = path.join(__dirname, 'build', 'appx');
  fs.mkdirSync(cartella, { recursive: true });

  const quadrata = (nome, lato) => {
    fs.writeFileSync(path.join(cartella, nome), icona.resize({ width: lato, height: lato, quality: 'best' }).toPNG());
  };
  // Fondo #111111 e icona alta quanto il 70% della tessera, al centro.
  const larga = (nome, w, h) => {
    const lato = Math.round(h * 0.7);
    const piccola = icona.resize({ width: lato, height: lato, quality: 'best' }).toBitmap();   // BGRA
    const buf = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) buf.set([0x11, 0x11, 0x11, 0xff], i * 4);
    const x0 = Math.round((w - lato) / 2), y0 = Math.round((h - lato) / 2);
    for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
      const s = (y * lato + x) * 4, d = ((y0 + y) * w + x0 + x) * 4, a = piccola[s + 3] / 255;
      for (let c = 0; c < 3; c++) buf[d + c] = Math.round(piccola[s + c] * a + buf[d + c] * (1 - a));
    }
    fs.writeFileSync(path.join(cartella, nome), nativeImage.createFromBitmap(buf, { width: w, height: h }).toPNG());
  };

  quadrata('StoreLogo.png', 50);
  quadrata('Square44x44Logo.png', 44);
  quadrata('Square150x150Logo.png', 150);
  quadrata('LargeTile.png', 310);
  larga('Wide310x150Logo.png', 310, 150);
  console.log('icone fatte in', cartella);
  app.quit();
});
