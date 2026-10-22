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
 */
const SFONDO_PREDEFINITO = { src: 'immagini/classico/ampli.webp', taglio: 0.17, testa: 0.25, largo: 1 };
const SFONDI_CLASSICI = {
  DistortionTS9: { src: 'immagini/classico/tube-drive.webp', taglio: 0.14, testa: 0.35, largo: 1 },
  Overdrive:     { src: 'immagini/classico/over-drive.webp', taglio: 0.22, testa: 0.30, largo: 1.6 },
  LA2AComp:      { src: 'immagini/classico/la-comp.webp', taglio: 0.24, testa: 0.26, largo: 1.4 },
};

/**
 * I parametri che sul pedale vero sono una **levetta a due posizioni**, non un
 * potenziometro (l'utente, 22 ottobre 2026, sul LA Comp): nel neon stanno come
 * levette sull'immagine (`levette` di `spark-immagini.js`), qui diventano la
 * levetta di `cellaInterruttore`, con le due scritte [a 0, a 1] al posto di
 * OFF/ON. I «BPM» dei delay sono già interruttori e non stanno qui. Quale
 * valore sia quale posizione è quello assunto in `spark-immagini.js`: per
 * LA Comp, Optical Comp e SAB Driver **da verificare a orecchio**.
 */
const LEVETTE_CLASSICHE = {
  LA2AComp:       { 0: ['COMP', 'LIMIT'] },
  UniVibe:        { 1: ['VIBRATO', 'CHORUS'] },
  BBEOpticalComp: { 2: ['0 dB', '-15 dB'] },
  SABdriver:      { 3: ['LP', 'HP'] },
};
const scritteLevetta = (effetto, param) =>
  (LEVETTE_CLASSICHE[effetto.name] || {})[param.index] || null;

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
  const sfondo = SFONDI_CLASSICI[effetto.name] || SFONDO_PREDEFINITO;
  blocco.style.setProperty('--sfondo', `url('${sfondo.src}')`);
  blocco.style.setProperty('--taglio', sfondo.taglio);
  blocco.style.setProperty('--testa', sfondo.testa);
  blocco.style.setProperty('--largo', sfondo.largo);

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
  // andare a capo, invece di spezzare la parola a metà.
  comandi.querySelectorAll('.pomello .nome').forEach(nome => {
    nome.textContent = nome.textContent.replace(/\//g, '/​');
  });
  // Le file di manopole dicono quanto posto resta all'immagine (vedi le
  // regole di `.blocco.classico`); i cursori degli equalizzatori ne valgono due.
  blocco.style.setProperty('--righe',
    comandi.classList.contains('cursori') ? 2 : comandi.querySelectorAll('.riga-pomelli').length);
  return blocco;
}

/**
 * Le file di manopole del classico: fino a quattro in una fila sola, poi due
 * file con la più piena sopra (cinque fanno 3 e 2, come l'app ufficiale). Una
 * fila in meno è spazio che va all'immagine: un pedale da tre manopole su due
 * file restava una striscia stretta. L'editor neon resta a `righeDi`.
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
