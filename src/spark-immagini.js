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
//   gira: è il modo pulito, con l'immagine del blocco **senza** manopole. Anche
//   della manopola si dà il centro e il raggio del cerchio, nei suoi pixel: non
//   è per forza quadrata, e la freccia può uscire dal cerchio. Si ingrandisce
//   finché il suo cerchio combacia con quello del blocco, e gira attorno al
//   suo centro, senza tagliare niente;
// - senza, l'app ritaglia il cerchio dall'immagine e gira quello. Funziona con
//   un'immagine intera, ma quello che sporge dal cerchio resta fermo. `a` è
//   dove punta il segno nell'immagine, in gradi da ore 12 (negativo a sinistra).
//
// `led` è la spia (accesa col blocco), `pulsante` il footswitch (lo accende e
// lo spegne). `comandi`, facoltativo: i rettangoli che sul telefono si
// mostrano al posto dell'immagine intera, uno sopra l'altro.
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
    // Il Blackface Duo dell'utente (15 ottobre 2026), senza manopole: i centri
    // sono i puntini bianchi in mezzo alle scale, trovati dai pixel; il raggio
    // sta dentro l'arco della scala (46 px su Gain, Middle e Volume, 39 su
    // Bass e Treble), che così resta visibile. Pulsante: la levetta ON/OFF.
    Twin: {
      src: 'immagini/blocchi/Twin.jpg', w: 1418, h: 736,
      manopola: { src: 'immagini/blocchi/manopola-neon.svg', w: 100, h: 100, x: 50, y: 50, r: 49 },
      manopole: [
        { indice: 0, x: 333.3,  y: 542.7, r: 38 },   // Gain
        { indice: 3, x: 520.5,  y: 542.7, r: 32 },   // Bass
        { indice: 2, x: 709.1,  y: 542.7, r: 38 },   // Middle
        { indice: 1, x: 897.6,  y: 542.7, r: 32 },   // Treble
        { indice: 4, x: 1084.8, y: 542.7, r: 38 },   // Master (Volume)
      ],
      led: { x: 171, y: 490.5, r: 16 },
      pulsante: { x: 166, y: 582, r: 34 },
      // Sul telefono si vedono solo i due pannelli dei comandi, uno sopra
      // l'altro: spia, Gain, Bass e Middle; poi Treble e Volume.
      comandi: [{ x: 118, y: 452, w: 684, h: 198 }, { x: 806, y: 452, w: 358, h: 198 }],
    },
  };

  window.SparkImmagini = {
    /** L'immagine di un modello, o null se non ce l'ha. */
    di: modello => TABELLA[modello] || null,
  };
})();
