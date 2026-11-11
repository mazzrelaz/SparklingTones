// La finestra di scelta del dispositivo Bluetooth, disegnata sopra la pagina.
// Non tocca il codice dell'app: si accende solo quando parte requestDevice().
const { ipcRenderer } = require('electron');

let box = null, lista = null;

function chiudi(id) {
  ipcRenderer.send('bt-scelto', id || '');
  if (box) { box.remove(); box = null; lista = null; }
}

function apri() {
  box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);' +
    'display:flex;align-items:center;justify-content:center;font:15px system-ui,sans-serif';
  box.innerHTML =
    '<div style="background:#1c1c1c;color:#eee;border-radius:10px;padding:18px 20px;min-width:340px;max-width:90vw">' +
    '<div style="font-weight:600;margin-bottom:10px">Dispositivi Bluetooth</div>' +
    '<div class="bt-lista" style="max-height:50vh;overflow:auto"><div style="opacity:.6">Ricerca…</div></div>' +
    '<div style="text-align:right;margin-top:14px"><button class="bt-annulla" ' +
    'style="background:#333;color:#eee;border:0;border-radius:6px;padding:7px 14px;cursor:pointer">Annulla</button></div></div>';
  box.addEventListener('click', e => { if (e.target === box) chiudi(''); });
  box.querySelector('.bt-annulla').onclick = () => chiudi('');
  lista = box.querySelector('.bt-lista');
  document.body.appendChild(box);
}

addEventListener('keydown', e => { if (box && e.key === 'Escape') chiudi(''); });

ipcRenderer.on('bt-dispositivi', (_e, { nuovaRicerca, dispositivi }) => {
  if (nuovaRicerca && box) { box.remove(); box = null; }
  if (!box) apri();
  if (!dispositivi.length) return;
  lista.innerHTML = '';
  for (const d of dispositivi) {
    const b = document.createElement('button');
    b.textContent = d.nome || d.id;
    b.style.cssText = 'display:block;width:100%;text-align:left;background:#2a2a2a;color:#eee;' +
      'border:0;border-radius:6px;padding:9px 12px;margin:4px 0;cursor:pointer';
    b.onclick = () => chiudi(d.id);
    lista.appendChild(b);
  }
});
