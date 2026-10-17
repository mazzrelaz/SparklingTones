// Lo sfondo scelto, nero o grigio, va messo prima che la pagina si disegni:
// altrimenti a ogni apertura lampeggia l'altro. Senza una scelta: grigio.
// Sta in un file a parte, caricato in testa a index.html, e non più dentro la
// pagina: la Content-Security-Policy (17 ottobre 2026) non lascia girare
// nessuno script scritto nell'HTML.
(function () {
  var sfondo = 'grigio';
  try { sfondo = localStorage.getItem('sfondo') || 'grigio'; } catch (e) {}
  if (sfondo === 'grigio') {
    document.documentElement.classList.add('grigio');
    document.querySelector('meta[name=theme-color]').setAttribute('content', '#101010');
  }
})();
