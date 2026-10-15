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
// lo spegne).
'use strict';
(function () {
  const TABELLA = {
    BlueComp: {
      src: 'immagini/blocchi/BlueComp.png', w: 509, h: 496,
      manopole: [
        { indice: 0, x: 112,   y: 89, r: 57, a: 0 },     // Level
        { indice: 3, x: 396.5, y: 92, r: 56, a: -56 },   // Sustain
        { indice: 1, x: 195,   y: 196, r: 40, a: 0 },     // Tone
        { indice: 2, x: 315,   y: 197, r: 40, a: -14 },   // Attack
      ],
      led: { x: 254, y: 84, r: 13 },
      pulsante: { x: 255, y: 436, r: 30 },
    },
    // Le immagini sono scontornate (sfondo nero tolto, PNG trasparente) e
    // ritagliate: le misure sono già spostate sul ritaglio.
    //
    // Il Blackface Duo dell'utente (15 ottobre 2026), senza manopole: i centri
    // sono i puntini bianchi in mezzo alle scale, trovati dai pixel; il raggio
    // sta dentro l'arco della scala (46 px su Gain, Middle e Volume, 39 su
    // Bass e Treble), che così resta visibile. Pulsante: la levetta ON/OFF.
    Twin: {
      src: 'immagini/blocchi/Twin.png', w: 1304, h: 707,
      manopola: { src: 'immagini/blocchi/manopola-neon.svg', w: 100, h: 100, x: 50, y: 50, r: 49 },
      manopole: [
        { indice: 0, x: 271.3,  y: 522.7, r: 38 },   // Gain
        { indice: 3, x: 458.5,  y: 522.7, r: 32 },   // Bass
        { indice: 2, x: 647.1,  y: 522.7, r: 38 },   // Middle
        { indice: 1, x: 835.6,  y: 522.7, r: 32 },   // Treble
        { indice: 4, x: 1022.8, y: 522.7, r: 38 },   // Master (Volume)
      ],
      led: { x: 109, y: 470.5, r: 16 },
      pulsante: { x: 104, y: 562, r: 34 },
    },
  };

  window.SparkImmagini = {
    /** L'immagine di un modello, o null se non ce l'ha. */
    di: modello => TABELLA[modello] || null,
  };
})();
