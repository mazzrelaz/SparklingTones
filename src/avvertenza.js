// Sparkling Tones — avvertenza.js: lo scarico di responsabilità, per il telefono (index.html) e per il PC
// (pc.html, anche dentro l'app Windows).
//
// Regola dell'utente (15 novembre 2026): «tutti devono sapere che lo usano a loro rischio». Alla prima
// apertura — e una volta a chi l'app la usava già prima di oggi — una schermata che non si chiude né con
// Esc né toccando fuori: solo col tasto «Ho capito: lo uso a mio rischio». Lo stesso testo, più corto,
// sta in fondo alla splash «Novità» (`AVVERTENZA_BREVE`), nel benvenuto dell'app Windows, nelle guide e
// sul sito; quello lungo in «Informazioni, licenze e responsabilità».
'use strict';

const AVVERTENZA_CHIAVE = 'sparklingtones-avvertenza';   // la data in cui è stata accettata

function avvertenzaBreve() {
  return tr('Progetto indipendente, senza alcun rapporto con Positive Grid. Fornito così com\'è, senza garanzie: lo usi a tuo rischio.');
}

function mostraAvvertenza(quando) {
  const velo = document.createElement('div');
  velo.className = 'velo-novita velo-avvertenza';
  velo.innerHTML =
    '<div class="novita avvertenza" role="alertdialog" aria-modal="true" aria-labelledby="avvertenza-titolo">' +
      '<div class="novita-testa">' +
        '<div class="novita-sopra">' + tr('Prima di cominciare') + '</div>' +
        '<div class="novita-titolo" id="avvertenza-titolo">⚠️ ' + tr('Lo usi a tuo rischio') + '</div>' +
      '</div>' +
      '<div class="avvertenza-corpo">' +
        '<p>' + tr('SparklingTones è un progetto <strong>amatoriale e indipendente</strong>, gratuito, <strong>senza alcun rapporto con Positive Grid</strong>.') + '</p>' +
        '<p>' + tr('È fornito <strong>così com\'è, senza garanzie di alcun tipo</strong>. L\'autore <strong>non risponde di nessun danno</strong>: preset persi o sovrascritti, un amplificatore che si blocca o si guasta, qualunque conseguenza dei comandi mandati via Bluetooth.') + '</p>' +
        '<p>' + tr('Tieni un backup dei preset a cui tieni. Continuando accetti di usare l\'app <strong>a tuo rischio</strong>.') + '</p>' +
      '</div>' +
      '<button class="novita-ok">' + tr('Ho capito: lo uso a mio rischio') + '</button>' +
    '</div>';
  velo.querySelector('.novita-ok').addEventListener('click', () => {
    try { localStorage.setItem(AVVERTENZA_CHIAVE, new Date().toISOString().slice(0, 10)); } catch (e) {}
    velo.classList.add('via');
    setTimeout(() => velo.remove(), 200);
    if (quando) quando();
  });
  document.body.appendChild(velo);
}

(function controllaAvvertenza() {
  let accettata = null;
  try { accettata = localStorage.getItem(AVVERTENZA_CHIAVE); } catch (e) { /* senza memoria: si mostra */ }
  if (accettata && location.hash !== '#avvertenza') return;
  // Dopo la partenza (l'avvio chiude i pannelli), e sopra a benvenuto e Novità.
  setTimeout(() => mostraAvvertenza(), 300);
})();
