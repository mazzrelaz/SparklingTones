// Sparkling Tones — spark-immagini.js: le immagini dei blocchi per l'editor.
//
// Bozza del 15 ottobre 2026. Un modello che ha un'immagine si regola girando
// le manopole sull'immagine stessa; uno che non ce l'ha resta come prima.
//
// Le immagini le disegna l'utente **senza manopole**, con un puntino bianco al
// centro di ognuna; lo sfondo nero lo togliamo noi (`tools/togli-sfondo/`, che
// ritaglia, rimpicciolisce a 900 px e salva in WebP trasparente). Le misure
// sono in pixel dell'immagine finita (w × h): centro della manopola (x, y),
// trovato dal puntino, e raggio (r), poco dentro l'arco della scala.
// `indice` è il parametro dell'ampli che quella manopola muove.
//
// Le manopole le disegniamo noi (`manopola`, col segno in alto, a metà corsa),
// nei colori di ogni blocco; una manopola può avere la sua. Del disegno si dà
// il centro e il raggio del cerchio, nei suoi pixel: si ingrandisce finché il
// suo cerchio combacia con quello del blocco, e gira attorno al suo centro.
// Senza `manopola` l'app ritaglia il cerchio dall'immagine e gira quello (per
// un'immagine con le manopole dentro; `a` è dove punta il segno, in gradi da
// ore 12, negativo a sinistra): resta, ma non lo usa più nessuno.
//
// `led` è la spia (accesa col blocco), `pulsante` il footswitch o la levetta
// (lo accende e lo spegne).
'use strict';
(function () {
  const manopola = colore =>
    ({ src: `immagini/blocchi/manopola-${colore}.svg`, w: 100, h: 100, x: 50, y: 50, r: 49 });

  const TABELLA = {
    // Il Sustainer cyberpunk (al posto di quello azzurro del primo giro).
    BlueComp: {
      src: 'immagini/blocchi/BlueComp.webp', w: 900, h: 906,
      manopola: manopola('viola'),
      manopole: [
        { indice: 0, x: 198.7, y: 175,   r: 78.6 },   // Level
        { indice: 3, x: 704.2, y: 175,   r: 78.6 },   // Sustain
        { indice: 1, x: 345.6, y: 361.3, r: 57.1 },   // Tone
        { indice: 2, x: 558.8, y: 361.3, r: 57.1 },   // Attack
      ],
      led: { x: 451.8, y: 158.9, r: 23.2 },
      pulsante: { x: 450.9, y: 791.1, r: 62.5 },
    },
    DistortionTS9: {                                  // Tube Drive
      src: 'immagini/blocchi/DistortionTS9.webp', w: 774, h: 1155,
      manopola: manopola('verde'),
      manopole: [
        { indice: 0, x: 198.4, y: 192.9, r: 66 },     // Overdrive
        { indice: 2, x: 571.8, y: 192.8, r: 66 },     // Level
        { indice: 1, x: 385.6, y: 376.5, r: 54 },     // Tone
      ],
      led: { x: 385, y: 92, r: 20 },
      pulsante: { x: 385, y: 942, r: 70 },
    },
    // Il Silver 120 con la sua cassa sotto, per riempire il riquadro: i primi
    // tre comandi sul pannello azzurro, Treble e Volume su quello verde.
    RolandJC120: {
      src: 'immagini/blocchi/RolandJC120.webp', w: 900, h: 877,
      manopola: manopola('azzurra'),
      manopole: [
        { indice: 0, x: 205.9, y: 340, r: 30.9 },     // Gain
        { indice: 3, x: 326.9, y: 340, r: 27.1 },     // Bass
        { indice: 2, x: 447.6, y: 340, r: 30.9 },     // Middle
        { indice: 1, x: 568.6, y: 340, r: 27.1, manopola: manopola('verde') },  // Treble
        { indice: 4, x: 688.9, y: 340, r: 30.9, manopola: manopola('verde') },  // Master (Volume)
      ],
      led: { x: 102, y: 306.9, r: 11.2 },
      pulsante: { x: 100.6, y: 359.7, r: 23.4 },
    },
    // Il Blackface Duo: i centri sono i puntini bianchi in mezzo alle scale; il
    // raggio sta dentro l'arco (Gain, Middle e Volume più larghi di Bass e
    // Treble), che così resta visibile. Pulsante: la levetta ON/OFF.
    Twin: {
      src: 'immagini/blocchi/Twin.webp', w: 900, h: 488,
      manopola: manopola('neon'),
      manopole: [
        { indice: 0, x: 187.2, y: 360.8, r: 26.2 },   // Gain
        { indice: 3, x: 316.4, y: 360.8, r: 22.1 },   // Bass
        { indice: 2, x: 446.6, y: 360.8, r: 26.2 },   // Middle
        { indice: 1, x: 576.7, y: 360.8, r: 22.1 },   // Treble
        { indice: 4, x: 705.9, y: 360.8, r: 26.2 },   // Master (Volume)
      ],
      led: { x: 75.2, y: 324.7, r: 11 },
      pulsante: { x: 71.8, y: 387.9, r: 23.5 },
    },
  };

  window.SparkImmagini = {
    /** L'immagine di un modello, o null se non ce l'ha. */
    di: modello => TABELLA[modello] || null,
    /**
     * La misura fissa del riquadro nell'editor: quella del Silver 120, il blocco
     * con le manopole più piccole. Gli altri ci stanno dentro, rimpiccioliti.
     */
    RIQUADRO: { w: TABELLA.RolandJC120.w, h: TABELLA.RolandJC120.h },
  };
})();
