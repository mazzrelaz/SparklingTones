// Sparkling Tones — 05-pannelli.js: I pannelli.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Pannelli
   ==================================================================== */

function apriPannello(id) {
  chiudiPannelli();
  pulisciStatoPannelli();
  $(id).classList.add('aperto');
}

function chiudiPannelli() {
  document.querySelectorAll('.pannello.aperto').forEach(p => p.classList.remove('aperto'));
}

document.querySelectorAll('[data-chiudi]').forEach(b => {
  b.addEventListener('click', () => {
    // L'editor è l'unico pannello dove «Fatto» può buttare via del lavoro: è
    // a un dito di distanza da «Salva» e non chiedeva niente. Se c'è qualcosa
    // di non salvato si chiede, e la chiusura la fa la risposta.
    if (b.dataset.chiudi === 'pannelloEditor' && inModifica && inModifica.toccato) {
      chiediPrimaDiUscire();
      return;
    }
    chiudiPannelli();
    if (b.dataset.chiudi === 'pannelloScegli') sceltaInCorso = null;
    if (b.dataset.chiudi === 'pannelloEditor') inModifica = null;
  });
});

