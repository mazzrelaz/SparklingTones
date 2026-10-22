// Sparkling Tones — 17-editor-classico.js: L'editor classico.
// Un pezzo dello script dell'app. I pezzi si caricano in fila, nell'ordine del
// numero, come script classici: const, let e funzioni di uno si vedono negli
// altri. Una funzione si puo' chiamare da ovunque quando l'app gira, ma il
// codice che parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   L'editor classico (22 ottobre 2026, chiesto dall'utente)

   Un secondo vestito dell'editor, da scegliere in Impostazioni: invece dei
   blocchi disegnati dell'editor «neon» (quello di prima), l'ampli sullo sfondo e manopole grandi con la corona
   dentata, come la pagina dell'ampli dell'app ufficiale. Cambia **solo il
   disegno**: catena, tocchi, invio dei parametri e salvataggio restano quelli
   di `10-editor-disegno.js`, che chiama di qui `tasselloClassico`,
   `bloccoClassico` e `coronaClassica` quando `editorClassico()` dice sì.
   ==================================================================== */

/**
 * Le immagini dietro il blocco a fuoco, per modello (le genera l'utente, 2:3,
 * 1024 × 1536, col prompt dei pedali vintage). Un modello senza immagine
 * prende l'ampli. `taglio` è quanto muro vuoto si toglie in alto, `testa`
 * quanta immagine resta sopra il titolo: tutti e due in frazioni dell'altezza,
 * `largo` quante volte il pannello può essere larga (i lati bui escono),
 * presi a occhio sull'immagine (il soggetto comincia al taglio; il titolo
 * e le manopole coprono la parte bassa, come le casse dell'ampli).
 * `led`: centro e raggio della spia disegnata, in frazioni della larghezza
 * (x, r) e dell'altezza (y), misurati dai pixel rossi; sopra ci va la spia
 * finta che segue l'acceso/spento del blocco (`spiaClassica`).
 */
const SFONDO_PREDEFINITO = { src: 'immagini/classico/ampli.webp', taglio: 0.17, testa: 0.25, largo: 1,
                             led: { x: 0.2969, y: 0.3356, r: 0.0078 } };
const SFONDI_CLASSICI = {
  'bias.noisegate': { src: 'immagini/classico/noise-gate.webp', taglio: 0.22, testa: 0.30, largo: 1.6,
                   led: { x: 0.5171, y: 0.2858, r: 0.0098 } },
  // I wah non hanno LED. Lo stesso modello è anche l'«Auto Wah» gratuito,
  // che ha la sua immagine (`sfondoClassico`).
  'JH.Vox846':   { src: 'immagini/classico/legendary-wah.webp', taglio: 0.20, testa: 0.30, largo: 1.6 },
  AutoWah:       { src: 'immagini/classico/auto-wah.webp', taglio: 0.21, testa: 0.30, largo: 1.6 },
  DistortionTS9: { src: 'immagini/classico/tube-drive.webp', taglio: 0.14, testa: 0.35, largo: 1,
                   led: { x: 0.4999, y: 0.1834, r: 0.0107 } },
  Overdrive:     { src: 'immagini/classico/over-drive.webp', taglio: 0.22, testa: 0.30, largo: 1.6,
                   led: { x: 0.4995, y: 0.2692, r: 0.0122 } },
  LA2AComp:      { src: 'immagini/classico/la-comp.webp', taglio: 0.24, testa: 0.26, largo: 1.4,
                   led: { x: 0.5, y: 0.526, r: 0.0117 } },
  BlueComp:       { src: 'immagini/classico/sustain-comp.webp', taglio: 0.23, testa: 0.28, largo: 1.4,
                   led: { x: 0.5018, y: 0.2654, r: 0.0098 } },
  BBEOpticalComp: { src: 'immagini/classico/optical-comp.webp', taglio: 0.24, testa: 0.26, largo: 1.5,
                   led: { x: 0.499, y: 0.2905, r: 0.0127 } },
  BassComp:       { src: 'immagini/classico/bass-comp.webp', taglio: 0.20, testa: 0.28, largo: 1.4,
                   led: { x: 0.5059, y: 0.2554, r: 0.0098 } },
  Compressor:     { src: 'immagini/classico/red-comp.webp', taglio: 0.18, testa: 0.28, largo: 1.5,
                   led: { x: 0.499, y: 0.4766, r: 0.0156 } },
};

/**
 * L'immagine di un modello. Il wah, senza il pacchetto Hendrix, è l'Auto Wah
 * gratuito e ha la sua, come nel neon (`immagineBlocco`).
 */
const sfondoClassico = modello =>
  SFONDI_CLASSICI[modello === 'JH.Vox846' && !haHendrix() ? 'AutoWah' : modello];

/**
 * I parametri che sul pedale vero sono una **levetta a due posizioni**, non un
 * potenziometro (l'utente, 22 ottobre 2026, sul LA Comp): nel neon stanno come
 * levette sull'immagine (`levette` di `spark-immagini.js`), qui diventano la
 * levetta di `cellaInterruttore`, **senza scritta sotto** (l'utente: «è solo
 * limit/compress»): il nome dice le due posizioni, la prima in alto. I «BPM»
 * dei delay sono già interruttori e non stanno qui. Quale valore sia quale
 * posizione è quello assunto in `spark-immagini.js`: per LA Comp, Optical
 * Comp e SAB Driver **da verificare a orecchio**.
 */
const LEVETTE_CLASSICHE = {
  LA2AComp:       [0],   // Limit (su) / Compress
  UniVibe:        [1],   // Chorus (su) / Vibrato
  BBEOpticalComp: [2],   // Pad: -15 dB (su) / 0 dB
  SABdriver:      [3],   // HP (su) / LP
};
const levettaClassica = (effetto, param) =>
  (LEVETTE_CLASSICHE[effetto.name] || []).includes(param.index);

/** Il raggio dell'arco sottile attorno alla manopola classica (viewBox 100). */
const RAGGIO_CLASSICO = 47;

/** Il colore dell'arco e delle cose accese: il crema dei pannelli degli ampli. */
const CREMA = '#e6cfa4';

/**
 * Le icone dei tasselli, una per posto della catena (tratti su 20 × 20).
 * Gli equalizzatori hanno la loro, perché stanno dove sta un pedale qualunque.
 */
const ICONE_CATENA = [
  'M5 4v12M15 4v12M2 10h3M15 10h3M8 10h4',                                  // noise gate
  'M10 2v5M7 4.5L10 7l3-2.5M10 18v-5M7 15.5L10 13l3 2.5M3 10h14',          // comp / wah
  'M5 2.5h10v15H5zM8 14h4M10 8.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',        // drive
  'M2 5h16v10H2zM4.5 8h11M5.5 12h0M8.5 12h0M11.5 12h0M14.5 12h0',          // ampli
  'M2 10c2-6 4-6 6 0s4 6 6 0c1-3 2-4 4-4',                                   // modulazione
  'M4 6a6 6 0 0 1 0 8M8 4a9 9 0 0 1 0 12M12 2a12 12 0 0 1 0 16',           // delay
  'M10 10m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M6 5.5a6 6 0 0 0 0 9M14 5.5a6 6 0 0 1 0 9M3 3a10 10 0 0 0 0 14M17 3a10 10 0 0 1 0 14',
];
const ICONA_EQ = 'M4 17V10M4 6V3M10 17v-4M10 9V3M16 17V8M16 4V3M2 10h4M8 9h4M14 6h4';
const ICONA_ACCENDI = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5v7M6 4.8a6.5 6.5 0 1 0 8 0"/></svg>';

function iconaCatena(effetto, posizione) {
  const tratti = SparkEffetti.aCursori(effetto.name) ? ICONA_EQ
                                                      : ICONE_CATENA[posizione] || ICONE_CATENA[3];
  const box = document.createElement('span');
  box.className = 'icona';
  box.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${tratti}"/></svg>`;
  return box;
}

/** Il nome che il blocco porta: il tipo, se il modello è uno solo (il riverbero). */
const titoloModello = (effetto, posizione) =>
  (candidatiModello(effetto, posizione).length < 2 && nomeTipo(effetto)) ||
  nomeBlocco(effetto.name);

/**
 * Il tassello classico: l'icona in un quadratino, sotto il posto della catena
 * e il modello, come nell'app ufficiale. Un tocco e il doppio tocco restano
 * quelli di `tassello`, che lo riempie con questa.
 */
function tasselloClassico(t, effetto, posizione) {
  t.classList.add('classico');
  const testi = document.createElement('span');
  testi.className = 'testi';
  const cat = document.createElement('span');
  cat.className = 'cat';
  cat.textContent = Spark.CATENA[posizione] || tr`posizione ${posizione + 1}`;
  const modello = document.createElement('span');
  modello.className = 'modello';
  modello.textContent = titoloModello(effetto, posizione);
  testi.append(cat, modello);
  t.append(iconaCatena(effetto, posizione), testi);
}

/**
 * Il blocco a fuoco classico: il posto della catena e il nome del modello in
 * grande sopra l'ampli, il tasto d'accensione accanto, e sotto le manopole.
 * Il nome si tocca per cambiare modello (o tipo), come il doppio tocco sul
 * tassello; il noise gate, che non ha niente da scegliere, non apre niente.
 */
function bloccoClassico(effetto, posizione) {
  const blocco = document.createElement('div');
  blocco.className = 'blocco aFuoco classico' + (effetto.enabled ? '' : ' spento');
  blocco.style.setProperty('--cat', CREMA);
  const sfondo = sfondoClassico(effetto.name) || SFONDO_PREDEFINITO;
  // Un pedale sta più piccolo dell'ampli (`.pedale` nelle regole).
  if (sfondo !== SFONDO_PREDEFINITO) blocco.classList.add('pedale');
  blocco.style.setProperty('--sfondo', `url('${sfondo.src}')`);
  blocco.style.setProperty('--taglio', sfondo.taglio);
  blocco.style.setProperty('--testa', sfondo.testa);
  blocco.style.setProperty('--largo', sfondo.largo);
  if (sfondo.led) blocco.appendChild(spiaClassica(sfondo.led, effetto.enabled));

  const titolo = document.createElement('div');
  titolo.className = 'titolo-classico';
  const testi = document.createElement('div');
  testi.className = 'testi';
  const cat = document.createElement('div');
  cat.className = 'cat';
  cat.textContent = Spark.CATENA[posizione] || tr`posizione ${posizione + 1}`;
  const nome = document.createElement('button');
  nome.type = 'button';
  nome.className = 'nome-modello';
  nome.textContent = titoloModello(effetto, posizione);
  if (candidatiModello(effetto, posizione).length > 1 || paramScelta(effetto)) {
    const freccia = document.createElement('span');
    freccia.className = 'freccia';
    freccia.setAttribute('aria-hidden', 'true');
    nome.appendChild(freccia);
    nome.addEventListener('click', () => apriSceltaModello(posizione));
  } else {
    nome.disabled = true;
  }
  testi.append(cat, nome);

  const accendi = document.createElement('button');
  accendi.type = 'button';
  accendi.className = 'accendi' + (effetto.enabled ? ' acceso' : '');
  accendi.title = effetto.enabled ? tr('acceso') : tr('spento');
  accendi.innerHTML = ICONA_ACCENDI;
  accendi.addEventListener('click', () => cambiaAcceso(effetto));
  titolo.append(testi, accendi);
  blocco.appendChild(titolo);

  // La nota Hendrix, se serve, è quella dell'editor neon; il suo
  // interruttore qui è il tasto tondo, e non si ripete.
  const riga = intestazioneBlocco(effetto);
  riga.querySelector('.interruttore').remove();
  if (riga.childElementCount) blocco.appendChild(riga);

  const comandi = griglia(effetto, posizione);
  blocco.appendChild(comandi);
  // Un nome lungo va su due righe: dopo la barra (LIMIT/COMPRESS) si può
  // andare a capo (uno spazio largo zero), invece di spezzare la parola a metà.
  comandi.querySelectorAll('.pomello .nome').forEach(nome => {
    nome.textContent = nome.textContent.replace(/\//g, '/\u200b');
  });
  // Le file di comandi dicono quanto posto resta all'immagine (vedi le
  // regole di `.blocco.classico`); i cursori degli equalizzatori ne valgono due.
  blocco.style.setProperty('--righe',
    comandi.classList.contains('cursori') ? 2 : comandi.querySelectorAll('.riga-pomelli').length);
  return blocco;
}

/**
 * La miniatura di un modello nell'elenco del classico (l'utente, 22 ottobre
 * 2026): un quadrato ritagliato dall'immagine grande, il 56% centrale della
 * larghezza a partire dal taglio, cioè la parte alta del pedale (manopole e
 * nome). L'immagine è 2:3, quindi è alta 1,5 / 0,56 = 2,68 volte il riquadro,
 * e il taglio in percentuale di `background-position` è taglio × 2,68 / 1,68.
 * I modelli senza immagine classica tengono quella del neon (`null` qui).
 */
function miniaturaClassica(modello) {
  const sfondo = sfondoClassico(modello);
  if (!sfondo) return null;
  const alta = 1.5 / 0.56;
  return { src: sfondo.src,
           posizione: `50% ${(sfondo.taglio * alta / (alta - 1) * 100).toFixed(1)}%` };
}

/**
 * La spia finta sopra il LED dell'immagine (l'utente, 22 ottobre 2026): spenta
 * col blocco spento — un tondo scuro che copre il rosso disegnato — e col
 * blocco acceso un alone rosso attorno. Sta dietro i comandi, come
 * l'immagine; le misure le fanno le regole di `.spia-classica`.
 */
function spiaClassica(led, acceso) {
  const spia = document.createElement('span');
  spia.className = 'spia-classica' + (acceso ? ' accesa' : '');
  spia.style.setProperty('--lx', led.x);
  spia.style.setProperty('--ly', led.y);
  spia.style.setProperty('--lr', led.r);
  return spia;
}

/**
 * Le file dei comandi del classico: fino a quattro in una fila sola, poi due
 * file con la più piena sopra (cinque fanno 3 e 2, come l'app ufficiale). Una
 * fila in meno è spazio che va all'immagine. Provate e scartate dall'utente
 * (22 ottobre 2026) le due file sempre, col titolo fermo: l'immagine o
 * rimpiccioliva o finiva sotto i comandi. L'editor neon resta a `righeDi`.
 */
function righeClassiche(quante) {
  if (quante <= 4) return [quante];
  const righe = Math.ceil(quante / 4), fuori = [];
  let restano = quante;
  for (let r = righe; r > 0; r--) {
    const quanti = Math.ceil(restano / r);
    fuori.push(quanti);
    restano -= quanti;
  }
  return fuori;
}

/**
 * L'ordine dei comandi nel classico. In una fila sola **le levette stanno in
 * mezzo alle manopole** (l'utente, 22 ottobre 2026: sul LA Comp la levetta fra
 * Gain e Peak Reduction); su due file vanno in fondo, come il «BPM» dei delay.
 * `ordine` è quello di `griglia`, indici in `vere`.
 */
function ordineClassico(effetto, vere, ordine) {
  const leva = i => SparkEffetti.interruttore(effetto.name, vere[i].index) ||
                    levettaClassica(effetto, vere[i]);
  const manopole = ordine.filter(i => !leva(i)), levette = ordine.filter(leva);
  if (righeClassiche(ordine.length).length > 1) return [...manopole, ...levette];
  const meta = Math.ceil(manopole.length / 2);
  return [...manopole.slice(0, meta), ...levette, ...manopole.slice(meta)];
}

/**
 * La corona della manopola classica, fra il corpo e la tacca: il profilo di
 * un ingranaggio a 24 denti (i fianchi un po' inclinati, come una zigrinatura
 * vista dall'alto) e il cerchio liscio in mezzo. `cerchio` è quello di
 * `pomello`. Il profilo si calcola una volta sola: è uguale per tutte.
 */
const DENTI_CLASSICI = (() => {
  const denti = 24, dentro = 30.5, fuori = 35;
  const punto = (r, a) => `${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`;
  const passo = 2 * Math.PI / denti;
  let d = '';
  for (let i = 0; i < denti; i++) {
    const a = i * passo;
    d += (i ? 'L' : 'M') + punto(dentro, a) + 'L' + punto(fuori, a + passo * 0.12) +
         'L' + punto(fuori, a + passo * 0.46) + 'L' + punto(dentro, a + passo * 0.58);
  }
  return d + 'Z';
})();

function coronaClassica(cerchio) {
  const denti = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  denti.setAttribute('class', 'denti');
  denti.setAttribute('d', DENTI_CLASSICI);
  return [denti, cerchio(26, 'anello')];
}

// La scelta in Impostazioni: cambia subito l'editor, se è aperto.
function segnaEditor() {
  for (const tasto of document.querySelectorAll('#sceltaEditor [data-editor]')) {
    tasto.classList.toggle('primary', (tasto.dataset.editor === 'classico') === editorClassico());
  }
}
for (const tasto of document.querySelectorAll('#sceltaEditor [data-editor]')) {
  tasto.addEventListener('click', () => {
    try { localStorage.setItem('editor', tasto.dataset.editor); } catch (e) { /* resta com'era */ }
    segnaEditor();
    if (inModifica) disegnaCatena();
  });
}
segnaEditor();
