// Il comportamento della guida all'uso, comune a guida.html e guida.en.html.
'use strict';
(function () {
  const dentroApp = window.self !== window.top;

  // Letta da sola (dal sito, da un link) la guida porta all'app e all'altra
  // lingua; dentro l'app c'è già il «Fatto» del pannello, e la lingua è quella
  // scelta lì.
  if (!dentroApp) document.querySelector('.fuori').hidden = false;

  // L'indice scorre senza toccare l'hash: dentro l'iframe ogni ancora sarebbe
  // un passo di cronologia, e l'indietro di Android sfoglierebbe la guida.
  document.addEventListener('click', evento => {
    const a = evento.target.closest('a[href^="#"]');
    if (!a) return;
    const dove = document.getElementById(a.getAttribute('href').slice(1));
    if (!dove) return;
    evento.preventDefault();
    dove.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Il capitolo che si sta leggendo si accende nell'indice.
  const voci = [...document.querySelectorAll('nav.indice a')];
  const capitoli = voci.map(a => document.getElementById(a.getAttribute('href').slice(1)));
  const accendi = () => {
    let qui = 0;
    capitoli.forEach((c, i) => { if (c.getBoundingClientRect().top < 140) qui = i; });
    voci.forEach((a, i) => a.classList.toggle('qui', i === qui && window.scrollY > 200));
    const voce = voci[qui];
    const fila = voce.parentElement;
    if (voce.offsetLeft < fila.scrollLeft || voce.offsetLeft + voce.offsetWidth > fila.scrollLeft + fila.clientWidth) {
      fila.scrollLeft = voce.offsetLeft - 16;
    }
  };
  window.addEventListener('scroll', accendi, { passive: true });
  accendi();

  // Le manopole disegnate: lo stesso arco di 270 gradi dell'editor vero.
  const R = 22, C = 2 * Math.PI * R, GIRO = C * 0.75;
  document.querySelectorAll('.manopola[data-v]').forEach(m => {
    const v = parseFloat(m.dataset.v);
    const angolo = 135 + 270 * v;
    const rad = angolo * Math.PI / 180;
    const x = 28 + Math.cos(rad) * 13, y = 28 + Math.sin(rad) * 13;
    const x2 = 28 + Math.cos(rad) * 21, y2 = 28 + Math.sin(rad) * 21;
    const svg =
      '<svg viewBox="0 0 56 56" aria-hidden="true">' +
      '<circle cx="28" cy="28" r="17" fill="#15171b" stroke="#2a2d33"/>' +
      `<circle cx="28" cy="28" r="${R}" fill="none" stroke="#24262c" stroke-width="4" stroke-linecap="round"` +
      ` stroke-dasharray="${GIRO} ${C}" transform="rotate(135 28 28)"/>` +
      `<circle cx="28" cy="28" r="${R}" fill="none" stroke="var(--cat)" stroke-width="4" stroke-linecap="round"` +
      ` stroke-dasharray="${GIRO * v} ${C}" transform="rotate(135 28 28)"` +
      ' style="filter:drop-shadow(0 0 4px var(--cat))"/>' +
      `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="var(--cat)" stroke-width="3" stroke-linecap="round"/>` +
      '</svg>';
    m.insertAdjacentHTML('afterbegin', svg);
  });
})();
