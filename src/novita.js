// Sparkling Tones — novita.js: la splash «Novità», per il telefono (index.html)
// e per il PC (pc.html). Ogni voce può dire `dove: 'pc'` o `dove: 'telefono'`;
// senza, vale per tutte e due.
// Regola dell'utente (13 novembre 2026): ogni aggiornamento pubblicato porta
// le sue novità, che si vedono una volta sola alla prima apertura dopo
// l'aggiornamento. Chi apre l'app per la prima volta non le vede: per lui è
// tutto nuovo.
//
// Per pubblicare: una voce nuova IN CIMA a NOVITA, con la stessa versione di
// VERSIONE in sw.js.
'use strict';

const NOVITA = [
  {
    versione: 'v155',
    data: '13 novembre 2026',
    voci: [
      { icona: '▶️', titolo: tr('Video brevi su YouTube'),
        testo: tr('Sette video brevi, uno per sezione dell\'app: collegarsi, la libreria, la scheda del preset, l\'editor, il Live, l\'accordatore e il backup. Li trovi dalla guida, sul canale SparklingTones.') },
    ],
  },
  {
    versione: 'v154',
    data: '13 novembre 2026',
    voci: [
      { icona: '🎛️', titolo: tr('Live (beta)'),
        testo: tr('Una vista per suonare dal vivo: banchi di preset o pedali stomp, da comandare col mouse o con una pedaliera MIDI, via cavo o Bluetooth. È in prova: se qualcosa non va, scrivimi.'), dove: 'pc' },
      { icona: '⏱️', titolo: tr('Tap tempo'),
        testo: tr('Accanto ai BPM c\'è il pulsante Tap: batti il tempo e il delay lo segue.'), dove: 'pc' },
      { icona: '❓', titolo: tr('Guida e spiegazioni'),
        testo: tr('Una guida per il computer con le schermate vere, e un «?» accanto alle funzioni più complesse.'), dove: 'pc' },
      { icona: '🔁', titolo: tr('Connessione più tenace'),
        testo: tr('Se il collegamento con l\'ampli cade appena aperto, l\'app riprova da sola.') },
      { icona: '☕', titolo: tr('Sempre gratis'),
        testo: tr('L\'app resta gratuita. Se ti è utile, un caffè dal menu Altro aiuta a farla crescere.'), dove: 'telefono' },
      { icona: '☕', titolo: tr('Sempre gratis'),
        testo: tr('L\'app resta gratuita. Se ti è utile, un caffè dal menu in alto a destra aiuta a farla crescere.'), dove: 'pc' },
    ],
  },
];

const NOVITA_PC = /pc\.html$/.test(location.pathname);
const NOVITA_QUI = NOVITA_PC ? 'pc' : 'telefono';
// Telefono e PC stanno sulla stessa origine: ognuno tiene il suo segno.
const CHIAVE_NOVITA = NOVITA_PC ? 'spark.novitaViste.pc' : 'spark.novitaViste';

function mostraNovita(n) {
  const velo = document.createElement('div');
  velo.className = 'velo-novita';
  velo.innerHTML =
    '<div class="novita" role="dialog" aria-modal="true">' +
      '<div class="novita-testa">' +
        '<div class="novita-sopra">' + tr('Novità') + ' · ' + n.versione + '</div>' +
        '<div class="novita-titolo">' + tr('Cosa c\'è di nuovo') + '</div>' +
        '<div class="novita-data">' + n.data + '</div>' +
      '</div>' +
      '<ul class="novita-voci">' +
        n.voci.filter(v => !v.dove || v.dove === NOVITA_QUI).map(v =>
          '<li><span class="novita-icona">' + v.icona + '</span>' +
          '<div><strong>' + v.titolo + '</strong><span>' + v.testo + '</span></div></li>').join('') +
      '</ul>' +
      '<button class="novita-ok">' + tr('Ho capito') + '</button>' +
    '</div>';
  const chiudi = () => {
    velo.classList.add('via');
    setTimeout(() => velo.remove(), 200);
    document.removeEventListener('keydown', tasto);
  };
  const tasto = e => { if (e.key === 'Escape') chiudi(); };
  velo.querySelector('.novita-ok').addEventListener('click', chiudi);
  velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
  document.addEventListener('keydown', tasto);
  document.body.appendChild(velo);
}

(function controllaNovita() {
  const ultima = NOVITA[0];
  let vista = null;
  try { vista = localStorage.getItem(CHIAVE_NOVITA); } catch (e) { return; }
  // Prima apertura in assoluto: niente splash, si segna e basta.
  // Si riconosce da un localStorage ancora vuoto.
  // Nell'app Windows il benvenuto del primo avvio (pc/13-benvenuto.js, che gira
  // prima) ha già scritto la sua chiave: se è aperto, è un primo avvio.
  const giaUsata = (vista !== null || localStorage.length > 0) &&
    !document.querySelector('.benvenuto-velo');
  try { localStorage.setItem(CHIAVE_NOVITA, ultima.versione); } catch (e) {}
  const prova = location.hash === '#novita';   // per le bozze: la mostra sempre
  if (!prova && (vista === ultima.versione || !giaUsata)) return;
  // Dopo la partenza: l'avvio chiude i pannelli.
  setTimeout(() => mostraNovita(ultima), 600);
})();
