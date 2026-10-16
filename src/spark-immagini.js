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
// (lo accende e lo spegne). `levette`: interruttori di un parametro (0 o 1),
// ritagliati dall'immagine e capovolti quando stanno giù.
'use strict';
(function () {
  const manopola = colore =>
    ({ src: `immagini/blocchi/manopola-${colore}.svg`, w: 100, h: 100, x: 50, y: 50, r: 49 });

  const TABELLA = {
    // L'Auto Wah gratuito: il wah in Auto Detect (vedi `eAutoWahLibero`), per chi
    // non ha il pacchetto Hendrix. Power accende e spegne, la sola manopola è la
    // Sensitivity (parametro 4); la colonna di puntini respira come in Auto Detect.
    AutoWah: {
      src: 'immagini/blocchi/AutoWah.webp', w: 900, h: 1012,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 4, x: 739.8, y: 565.4, r: 66 },   // Sensitivity
      ],
      led: { x: 826.5, y: 339.3, r: 19.3 },
      pulsante: { x: 738.4, y: 340.2, w: 289.8, h: 115.9 },          // Power
      barra: { x: 512.7, y0: 134.8, y1: 874.6, n: 20, r: 8 },
    },
    // Il Legendary Wah. Niente manopole sull'immagine: a mano il wah non si muove
    // più (aggiornamento di Positive Grid, 2026). Power accende e spegne, Auto
    // apre il pannellino delle modalità (`tasti`); la colonna di puntini
    // (`barra`) sale e scende con la forma d'onda, come nell'app ufficiale.
    'JH.Vox846': {
      src: 'immagini/blocchi/JH.Vox846.webp', w: 900, h: 992,
      manopole: [],
      led: { x: 813.8, y: 374.8, r: 14 },
      pulsante: { x: 733.4, y: 368.6, w: 288.2, h: 119.2 },          // Power
      tasti: [{ x: 726.7, y: 553.9, w: 313.6, h: 128.8, apre: 'autowah' }],
      barra: { x: 502.2, y0: 129.7, y1: 858.8, n: 20, r: 8 },
    },
    // Optical Comp. Il parametro 2, Pad, è la levetta in mezzo: in alto -15 dB,
    // in basso 0 dB. **Da verificare a orecchio**: si assume 1 = -15 dB = in alto.
    BBEOpticalComp: {
      src: 'immagini/blocchi/BBEOpticalComp.webp', w: 900, h: 1341,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 0, x: 249.4, y: 276.8, r: 95.4 },   // Volume
        { indice: 1, x: 649.8, y: 276.8, r: 95.4, manopola: manopola('azzurra') },   // Comp
      ],
      levette: [
        { indice: 2, x: 450.5, y: 448.9, r: 53.3, su: 1 },   // Pad: -15 dB (su) / 0 dB (giù)
      ],
      led: { x: 449.6, y: 113, r: 30.9 },
      pulsante: { x: 450.5, y: 1132.9, r: 92.6 },
    },
    BassComp: {                                       // Bass Comp
      src: 'immagini/blocchi/BassComp.webp', w: 900, h: 1361,
      manopola: manopola('azzurra'),
      manopole: [
        { indice: 0, x: 249.2, y: 282.5, r: 99.7 },   // Comp
        { indice: 1, x: 649,   y: 282.5, r: 99.7 },   // Gain
      ],
      led: { x: 449, y: 110, r: 30.2 },
      pulsante: { x: 449, y: 1161.2, r: 84.6 },
    },
    Compressor: {                                     // Red Comp
      src: 'immagini/blocchi/Compressor.webp', w: 832, h: 1227,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 0, x: 234.6, y: 257.5, r: 72 },     // Output
        { indice: 1, x: 593,   y: 257.4, r: 72 },     // Sensitivity
      ],
      led: { x: 415, y: 107, r: 28 },
      pulsante: { x: 415, y: 1047, r: 90 },
    },
    // LA Comp. Il parametro 0, Limit/Compress, è la levetta in mezzo: nei preset
    // veri vale sempre 0. **Da verificare a orecchio quale sia Limit**: qui si
    // assume 1 = Limit = levetta in alto, com'è disegnata.
    LA2AComp: {
      src: 'immagini/blocchi/LA2AComp.webp', w: 900, h: 1327,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 1, x: 251.6, y: 278.6, r: 84.7 },   // Gain
        { indice: 2, x: 650.8, y: 278.5, r: 84.7 },   // Peak Reduction
      ],
      levette: [
        { indice: 0, x: 449.5, y: 444.1, r: 53.6, su: 1 },   // Limit (su) / Compress (giù)
      ],
      led: { x: 449.5, y: 115.8, r: 25.4 },
      pulsante: { x: 449.5, y: 1105, r: 76.2 },
    },
    'bias.noisegate': {                               // Noise Gate, rosso
      src: 'immagini/blocchi/bias.noisegate.webp', w: 900, h: 1349,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 0, x: 254.2, y: 285.8, r: 71.9 },   // Threshold
        { indice: 1, x: 650.9, y: 285.8, r: 71.9 },   // Decay
      ],
      led: { x: 450.3, y: 122.5, r: 21.3 },
      pulsante: { x: 450.3, y: 1085.7, r: 60.4 },
    },
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
    // Clone Drive: ogni manopola nel colore della sua scala (Gain arancione,
    // Output viola, Treble azzurro). Pulsante: il cerchio sotto l'arciere.
    KlonCentaurSilver: {
      src: 'immagini/blocchi/KlonCentaurSilver.webp', w: 900, h: 1313,
      manopola: manopola('arancione'),
      manopole: [
        { indice: 2, x: 227.5, y: 221.8, r: 83.4 },   // Gain
        { indice: 0, x: 672.6, y: 221.9, r: 83.4, manopola: manopola('viola') },     // Output
        { indice: 1, x: 449.9, y: 438.9, r: 69,   manopola: manopola('azzurra') },   // Treble
      ],
      led: { x: 449.9, y: 99.1, r: 13 },
      pulsante: { x: 444, y: 1083, r: 58 },
    },
    Overdrive: {                                      // Over Drive, giallo
      src: 'immagini/blocchi/Overdrive.webp', w: 900, h: 1296,
      manopola: manopola('gialla'),
      manopole: [
        { indice: 0, x: 238.1, y: 213.7, r: 74.8 },   // Level
        { indice: 2, x: 659.2, y: 213.7, r: 74.8 },   // Drive
        { indice: 1, x: 449.2, y: 419.6, r: 62.1 },   // Tone
      ],
      led: { x: 450.2, y: 101.5, r: 18.8 },             // Check
      pulsante: { x: 450, y: 1059.1, r: 61 },
    },
    // J.H. Axle Fuzz, lo scudo: l'originale è già sotto i 900 px, resta alla sua
    // misura. Pulsante: il cerchio dentro l'ovale, sotto la firma.
    'JH.AxisFuzz': {
      src: 'immagini/blocchi/JH.AxisFuzz.webp', w: 887, h: 1013,
      manopola: manopola('arancione'),
      manopole: [
        { indice: 0, x: 248.5, y: 208.5, r: 56 },     // Volume
        { indice: 1, x: 633.1, y: 208.6, r: 56 },     // Drive
      ],
      led: { x: 440.3, y: 129.2, r: 17 },
      pulsante: { x: 441, y: 589, r: 60 },
    },
    // J.H. Super Fuzz. Qui le manopole disegnate sono cerchi neri col segno
    // bianco, non puntini: i centri vengono dall'anello rosso attorno (raggio
    // ~92), e la nostra manopola copre il segno.
    'JH.SupaFuzz': {
      src: 'immagini/blocchi/JH.SupaFuzz.webp', w: 702, h: 1341,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 0, x: 181, y: 229.5, r: 88 },       // Volume
        { indice: 1, x: 520, y: 229,   r: 88 },       // Filter
      ],
      led: { x: 350.7, y: 115.8, r: 16 },
      pulsante: { x: 351, y: 943, r: 48 },
    },
    // J.H. Octave Fuzz: scale azzurre e viola, la manopola «neon». Il raggio sta
    // dentro l'arco grigio sottile; pulsante: l'esagono in basso.
    'JH.Octavia': {
      src: 'immagini/blocchi/JH.Octavia.webp', w: 900, h: 1530,
      manopola: manopola('neon'),
      manopole: [
        { indice: 0, x: 231.2, y: 440.6, r: 89.7 },   // Level
        { indice: 1, x: 662.8, y: 440.5, r: 89.7 },   // Fuzz
      ],
      led: { x: 445.8, y: 180.5, r: 18.5 },
      pulsante: { x: 447.1, y: 1203.1, r: 81 },
    },
    // J.H. Fuzz Zone: Volume azzurro, Attack rosa (manopola-rosa.svg), dentro
    // l'arco della scala. La spia è il cerchio più interno dei tre rossi.
    'JH.FuzzTone': {
      src: 'immagini/blocchi/JH.FuzzTone.webp', w: 900, h: 1434,
      manopola: manopola('azzurra'),
      manopole: [
        { indice: 0, x: 231.7, y: 414,   r: 98 },     // Volume
        { indice: 1, x: 665.5, y: 414.1, r: 98, manopola: manopola('rosa') },   // Attack
      ],
      led: { x: 449.4, y: 177.3, r: 31.7 },
      pulsante: { x: 450, y: 1104.1, r: 132.6 },
    },
    // Booster: una manopola sola, il Gain, dentro il cerchio viola. La spia è
    // l'anello rosso sotto la scritta GAIN; pulsante: il cerchio sotto il razzo.
    Booster: {
      src: 'immagini/blocchi/Booster.webp', w: 900, h: 1480,
      manopola: manopola('viola'),
      manopole: [
        { indice: 0, x: 447.4, y: 282.6, r: 106.1 },  // Gain
      ],
      led: { x: 447.7, y: 582.6, r: 24.2 },
      pulsante: { x: 447.7, y: 1153, r: 75.8 },
    },
    // Fuzz Face: attorno ai puntini non c'è una scala, quindi il raggio lo
    // decide la cornice (le manopole grandi quanto ci stanno, ~50 px di aria).
    Fuzz: {
      src: 'immagini/blocchi/Fuzz.webp', w: 900, h: 1561,
      manopola: manopola('rossa'),
      manopole: [
        { indice: 0, x: 215.2, y: 212.2, r: 125.2 },  // Volume
        { indice: 1, x: 678.9, y: 211,   r: 125.2 },  // Fuzz
      ],
      led: { x: 449.1, y: 121.7, r: 23.3 },
      pulsante: { x: 450, y: 1255.2, r: 68 },
    },
    // Black Op: la manopola copre il cerchio interno e lascia l'anello attorno
    // (e la scala bianca) in vista. Contorni da azzurro a viola: la «neon».
    ProCoRat: {
      src: 'immagini/blocchi/ProCoRat.webp', w: 900, h: 1355,
      manopola: manopola('neon'),
      manopole: [
        { indice: 0, x: 227.9, y: 214.5, r: 114.2 },  // Distortion
        { indice: 2, x: 672.6, y: 214.4, r: 114.2 },  // Volume
        { indice: 1, x: 448.8, y: 432.5, r: 94.3 },   // Filter
      ],
      led: { x: 449.2, y: 100.2, r: 19.1 },
      pulsante: { x: 450, y: 1120.2, r: 51.6 },
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
