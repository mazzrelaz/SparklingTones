// SparklingTones per Windows: la stessa pc.html, dentro una finestra Electron.
// I file si servono da un protocollo nostro (spark://app/), così l'origine resta
// sempre la stessa e la libreria in IndexedDB non si perde fra un avvio e l'altro.
const { app, BrowserWindow, protocol, net, ipcMain, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// In sviluppo i file sono quelli del repository (la cartella sopra);
// nell'installer andranno copiati in resources/web.
const RADICE = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, '..');

protocol.registerSchemesAsPrivileged([{
  scheme: 'spark',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

function apriFinestra() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#111111',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  // Web Bluetooth: Electron non mostra la scelta del dispositivo, la facciamo noi.
  // L'evento arriva più volte mentre la ricerca trova dispositivi nuovi.
  let scegli = null;
  win.webContents.on('select-bluetooth-device', (event, dispositivi, callback) => {
    event.preventDefault();
    const nuovaRicerca = !scegli;
    scegli = callback;
    win.webContents.send('bt-dispositivi', {
      nuovaRicerca,
      dispositivi: dispositivi.map(d => ({ id: d.deviceId, nome: d.deviceName || '' }))
    });
  });
  ipcMain.removeAllListeners('bt-scelto');
  ipcMain.on('bt-scelto', (_e, id) => {
    if (scegli) { scegli(id || ''); scegli = null; }   // '' = annullato
  });

  // I link esterni (caffè, guida online, Dropbox) si aprono nel browser.
  // Le pagine nostre (la guida) si aprono nell'app pubblicata.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('spark://app/')) {
      shell.openExternal('https://mazzrelaz.github.io/SparklingTones/' + url.slice('spark://app/'.length));
    } else if (/^(https?|mailto):/.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // «Segnala un problema» cambia location.href verso mailto: va al programma di posta.
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('spark://')) return;
    event.preventDefault();
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
  });

  win.loadURL('spark://app/pc.html');
}

app.whenReady().then(() => {
  protocol.handle('spark', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '');
    const file = path.normalize(path.join(RADICE, rel));
    if (!file.startsWith(RADICE)) return new Response('no', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  apriFinestra();
});

app.on('window-all-closed', () => app.quit());
