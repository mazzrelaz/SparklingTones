// Sparkling Tones — spark-immagini.js: le immagini dei blocchi per l'editor.
//
// Bozza del 15 ottobre 2026. Un modello che ha un'immagine si regola girando
// le manopole sull'immagine stessa; uno che non ce l'ha resta come prima.
//
// Le misure sono in pixel dell'immagine (w × h): centro della manopola (x, y)
// e raggio (r). `indice` è il parametro dell'ampli che quella manopola muove.
//
// Le manopole si girano in due modi:
// - con `manopola` (un disegno a parte, col segno in alto) l'app la disegna e la
//   gira: è il modo pulito, con l'immagine del blocco **senza** manopole;
// - senza, l'app ritaglia il cerchio dall'immagine e gira quello. Funziona con
//   un'immagine intera, ma quello che sporge dal cerchio resta fermo. `a` è
//   dove punta il segno nell'immagine, in gradi da ore 12 (negativo a sinistra).
//
// `led` è la spia (accesa col blocco), `pulsante` il footswitch (lo accende e
// lo spegne).
'use strict';
(function () {
  const TABELLA = {
    BlueComp: {
      src: 'immagini/blocchi/BlueComp.jpg', w: 512, h: 512,
      manopole: [
        { indice: 0, x: 113,   y: 100, r: 57, a: 0 },     // Level
        { indice: 3, x: 397.5, y: 103, r: 56, a: -56 },   // Sustain
        { indice: 1, x: 196,   y: 207, r: 40, a: 0 },     // Tone
        { indice: 2, x: 316,   y: 208, r: 40, a: -14 },   // Attack
      ],
      led: { x: 255, y: 95, r: 13 },
      pulsante: { x: 256, y: 447, r: 30 },
    },
    Twin: {
      src: 'immagini/blocchi/Twin.svg', w: 512, h: 300,
      manopola: 'immagini/blocchi/manopola-nera.svg',
      manopole: [
        { indice: 0, x: 120, y: 226, r: 24 },   // Gain
        { indice: 3, x: 190, y: 226, r: 24 },   // Bass
        { indice: 2, x: 260, y: 226, r: 24 },   // Middle
        { indice: 1, x: 330, y: 226, r: 24 },   // Treble
        { indice: 4, x: 400, y: 226, r: 24 },   // Master
      ],
      led: { x: 58, y: 226, r: 10 },
      pulsante: { x: 456, y: 222, r: 22 },
    },
  };

  window.SparkImmagini = {
    /** L'immagine di un modello, o null se non ce l'ha. */
    di: modello => TABELLA[modello] || null,
  };
})();
