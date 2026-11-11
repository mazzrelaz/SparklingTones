// Sparkling Tones — pc/13-benvenuto.js: le due finestre di benvenuto dell'app Windows.
// Solo nell'app installata (pagina servita da spark://): al primo avvio il grazie, al decimo di nuovo il caffè.
// Ognuna una volta sola. Per provarle nel browser: pc.html#benvenuto1 o pc.html#benvenuto2.
'use strict';

const BENVENUTO_CHIAVE = 'sparklingtones-benvenuto';   // { avvii, visto1, visto2 }
const BENVENUTO_CAFFE_AL = 10;

function leggiBenvenuto() {
  try { return JSON.parse(localStorage.getItem(BENVENUTO_CHIAVE)) || {}; } catch (e) { return {}; }
}
function scriviBenvenuto(s) {
  try { localStorage.setItem(BENVENUTO_CHIAVE, JSON.stringify(s)); } catch (e) { /* senza memoria: pazienza */ }
}

function mostraBenvenuto(quale) {
  const velo = document.createElement('div');
  velo.className = 'benvenuto-velo';
  const logo = '<span class="lv-logo benvenuto-logo"><img src="icons/logo.svg" alt="SparklingTones">' +
    '<img class="alone" src="icons/logo.svg" alt=""></span>';
  velo.innerHTML = quale === 1
    ? '<div class="benvenuto">' + logo +
      '<h2>' + tr('Benvenuto in SparklingTones') + '</h2>' +
      '<p>' + tr("Grazie per averlo installato! SparklingTones è e resterà gratuito. Dietro però ci sono centinaia di ore di lavoro: notti passate a decifrare il protocollo dello Spark, a provare e riprovare sull'ampli vero.") + '</p>' +
      '<p>' + tr("Se l'app ti piace, un caffè è il modo più bello per dirmelo e per farla crescere.") + '</p>' +
      '<p class="benvenuto-firma">' + tr('— Massimo, chitarrista. Con metà del tempo passato sugli effetti, oggi suonerebbe meglio di Hendrix.') + '</p>' +
      '<div class="benvenuto-azioni"><button class="primario grande" data-a="chiudi">' + tr('Cominciamo') + '</button>' +
      '<a href="#" class="benvenuto-link" data-a="caffe">☕ ' + tr('Offrimi un caffè') + '</a></div></div>'
    : '<div class="benvenuto">' + logo +
      '<h2>' + tr('Ti sta tornando utile?') + '</h2>' +
      '<p>' + tr("SparklingTones è e resterà gratuito. Dietro però ci sono centinaia di ore di lavoro: notti passate a decifrare il protocollo dello Spark, a provare e riprovare sull'ampli vero.") + '</p>' +
      '<p>' + tr("Se l'app ti piace, un caffè è il modo più bello per dirmelo e per farla crescere.") + '</p>' +
      '<p class="benvenuto-firma">' + tr('— Massimo, chitarrista. Con metà del tempo passato sugli effetti, oggi suonerebbe meglio di Hendrix.') + '</p>' +
      '<div class="benvenuto-azioni"><button class="caffe grande" data-a="caffe">☕ ' + tr('Offrimi un caffè') + '</button>' +
      '<button class="discreto" data-a="chiudi">' + tr('Magari più avanti') + '</button></div></div>';

  const chiudi = () => { velo.remove(); removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') chiudi(); };
  velo.addEventListener('click', e => {
    if (e.target === velo) return chiudi();
    const a = e.target.closest('[data-a]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.a === 'caffe') window.open(PAGINA_CAFFE, '_blank', 'noopener');
    chiudi();
  });
  addEventListener('keydown', esc);
  document.body.appendChild(velo);
  velo.querySelector('[data-a]').focus();
}

(function benvenuto() {
  const prova = /^#benvenuto([12])$/.exec(location.hash);
  if (prova) return mostraBenvenuto(+prova[1]);
  if (location.protocol !== 'spark:') return;     // solo nell'app Windows
  const s = leggiBenvenuto();
  s.avvii = (s.avvii || 0) + 1;
  let quale = 0;
  if (!s.visto1) { s.visto1 = true; quale = 1; }
  else if (!s.visto2 && s.avvii >= BENVENUTO_CAFFE_AL) { s.visto2 = true; quale = 2; }
  scriviBenvenuto(s);
  if (quale) mostraBenvenuto(quale);
})();
