// Sparkling Tones — 16-bozza-pulsanti.js: SOLO NELLA BOZZA, non si pubblica.
// Il selettore per confrontare sul telefono i tre vestiti cyberpunk dei
// pulsantoni della vista Live (16 ottobre 2026): «Ora» è quello pubblicato,
// D, E e F le proposte (A, B e C bocciate) (gli stili stanno in index.html, `body.pad-…`).
'use strict';
(function () {
  const VOCI = [['', 'Ora'], ['d', 'D'], ['e', 'E'], ['f', 'F']];
  let scelta;
  try { scelta = localStorage.getItem('bozza-pad'); } catch (e) { scelta = null; }
  if (!['', 'd', 'e', 'f'].includes(scelta)) scelta = 'd';

  const box = document.createElement('div');
  box.id = 'bozzaPad';
  const metti = v => {
    scelta = v;
    try { localStorage.setItem('bozza-pad', v); } catch (e) {}
    for (const [k] of VOCI) document.body.classList.toggle('pad-' + k, !!k && k === v);
    box.querySelectorAll('button').forEach(b => b.classList.toggle('scelto', b.dataset.v === v));
  };
  for (const [v, testo] of VOCI) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = v;
    b.textContent = testo;
    b.addEventListener('click', () => metti(v));
    box.appendChild(b);
  }
  document.body.appendChild(box);
  metti(scelta);
})();
