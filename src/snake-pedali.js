'use strict';
/**
 * StompSnake — il passatempo fra una canzone e l'altra.
 *
 * Il file si chiama ancora `snake-pedali.js`: il nome sullo schermo gliel'ha
 * dato l'utente dopo, e rinominare il file vorrebbe dire toccare anche
 * `index.html` e il guscio in `sw.js` per niente.
 *
 * Sta in un file suo e non in `index.html` per una ragione sola: è una
 * goliardata, e una goliardata non deve pesare su un file che già costa
 * cinquantamila token da leggere. Vive per conto proprio — si costruisce lo
 * schermo, si porta il suo CSS, e **non tocca niente dell'app**: né il
 * Bluetooth, né la libreria, né lo stato. L'unico contatto con il resto del
 * mondo è `SnakePedali.apri()`.
 *
 * Il vestito è a 8 bit sul serio: si disegna su una tela da 208×224 pixel
 * veri e la si ingrandisce con `image-rendering:pixelated`. Disegnare grande
 * e rimpicciolire darebbe pixel sfumati, che è l'esatto contrario.
 *
 * Il serpente è una catena di pedalini attaccati col cavo, e mangia batterie
 * da 9 volt. Più ne mangia, più la catena si allunga e più va veloce — come
 * nella vita.
 */
window.SnakePedali = (function () {

  /* ---- misure ---- */
  const CELLA = 16;                 // un pedalino sta in sedici pixel
  const COLONNE = 12, RIGHE = 13;
  const BORDO = 8;                  // la custodia intorno al campo
  const LARG = COLONNE * CELLA + BORDO * 2;
  const ALT = RIGHE * CELLA + BORDO * 2;

  /* Il wah è il premio: compare ogni dieci batterie, resta lì il tempo che
     ha e poi se ne va. Vale tre pedalini in un colpo solo — un wah, in una
     catena, si sente. */
  const WAH_OGNI = 10;
  const WAH_DURATA = 9000;
  const WAH_LAMPEGGIA = 3000;       // gli ultimi secondi, per dire che scappa
  const WAH_VALE = 3;

  /* Ogni cinque pedalini raccolti parte un accordo, e non è sempre lo stesso:
     quattro power chord in fila — tonica, quinta, ottava — che girano. Un bip
     non festeggia niente. */
  const ACCORDO_OGNI = 5;
  const ACCORDI = [
    [82.41, 123.47, 164.81],    // MI
    [98.00, 146.83, 196.00],    // SOL
    [110.00, 164.81, 220.00],   // LA
    [146.83, 220.00, 293.66],   // RE
  ];

  /* La cadenza: millisecondi per casella. Si parte **piano** — a 210 era già
     svelta al primo tasto, e con una catena corta non c'è niente da capire,
     solo da reagire. La fretta se la deve guadagnare la partita: ogni
     batteria toglie `CALO`, e sotto `PASSO_MINIMO` non si scende. Al minimo
     ci si arriva alla ventitreesima batteria, che a quel punto la catena è
     lunga mezza pedaliera e il difficile è quella, non la velocità. */
  const PASSO_INIZIALE = 330;
  const PASSO_MINIMO = 110;
  const CALO = 10;
  const CHIAVE_RECORD = 'snake-pedali-record';
  const CHIAVE_SUONO = 'snake-pedali-suono';

  /* I pedalini: colore del corpo, luce in alto a sinistra, ombra in basso a
     destra. I nomi sono inventati apposta — sono scherzi, non marchi. */
  const PEDALI = [
    { corpo: '#e07a1c', luce: '#ffb04d', ombra: '#8a4408', nome: 'DIRT-1' },
    { corpo: '#2f6fd0', luce: '#6fa8ff', ombra: '#173d78', nome: 'CHORUZZO' },
    { corpo: '#d8cf28', luce: '#fff08a', ombra: '#7d7710', nome: 'DELAI-2' },
    { corpo: '#3fa860', luce: '#82e0a0', ombra: '#1d5c34', nome: 'TREMOLONE' },
    { corpo: '#b8bcc6', luce: '#eef0f5', ombra: '#6b6f78', nome: 'COMPRESSONE' },
    { corpo: '#8a4fd0', luce: '#c091ff', ombra: '#4a2478', nome: 'FLANGIONE' },
    { corpo: '#d02f4f', luce: '#ff7f97', ombra: '#78152a', nome: 'FUZZONE' },
    { corpo: '#2fb6c0', luce: '#7fe8f0', ombra: '#14646c', nome: 'WHAM-WHAM' },
  ];

  /* Il logo che ha fatto l'utente, senza i margini vuoti intorno. Se il file
     non rispondesse — non c'è, o non è ancora arrivato in cache — resta la
     scritta, che occupa lo stesso spazio: la fascia non cambia altezza e il
     campo non salta.

     **È un JPEG su fondo nero e non un PNG trasparente**, ed è una scelta:
     il pannello è nero pieno in tutte e due le viste, quindi si vede uguale,
     e il PNG con l'alfa pesava 384 KB contro 76.

     **Non sta nel `GUSCIO` di `sw.js` apposta**: il guscio è quello che serve
     a far partire l'app da spenta, e il logo di un passatempo lì dentro non
     ci va. Se lo prende da sé la prima volta che si apre il gioco, e da
     allora c'è anche offline. */
  const LOGO = 'icons/stompsnake.jpg';

  const SCHERMO =
    '<div class="barra-alta">' +
      '<h2 style="flex:1">StompSnake</h2>' +
      '<button class="piccolo" data-snake="suono">suono</button>' +
      '<button class="primary" data-snake="chiudi">Fatto</button>' +
    '</div>' +
    '<div class="snake-scena">' +
      // Il marchio sopra il campo. Finché l'immagine non c'è si vede la
      // scritta, che tiene lo stesso spazio: così il campo non salta in su
      // il giorno che il file arriva.
      '<div class="snake-marchio">' +
        '<img data-snake="marchio" src="' + LOGO + '" alt="StompSnake" hidden>' +
        '<span data-snake="marchioScritto">STOMP<b>SNAKE</b></span>' +
      '</div>' +
      '<div class="snake-hud">' +
        '<span>Pedali <b data-snake="punti">0</b></span>' +
        '<span class="snake-nome" data-snake="nome">&nbsp;</span>' +
        '<span>Record <b data-snake="record">0</b></span>' +
      '</div>' +
      '<div class="snake-tela">' +
        '<canvas width="' + LARG + '" height="' + ALT + '"></canvas>' +
        '<div class="snake-fine" data-snake="fine" hidden>' +
          '<div class="snake-titolo" data-snake="titolo">Fine</div>' +
          '<div class="snake-motivo" data-snake="motivo"></div>' +
          '<button class="primary" data-snake="ancora">Un&#39;altra</button>' +
        '</div>' +
      '</div>' +
      '<div class="snake-pad">' +
        '<button data-dir="su" aria-label="su">&#9650;</button>' +
        '<button data-dir="sx" aria-label="sinistra">&#9664;</button>' +
        '<button data-dir="giu" aria-label="giu">&#9660;</button>' +
        '<button data-dir="dx" aria-label="destra">&#9654;</button>' +
      '</div>' +
      // Corta di proposito: il logo si è preso lo spazio, e questa riga la si
      // legge una volta sola. L'ampli non c'entra niente comunque.
      '<p class="spiega snake-aiuto">Col dito sul campo, o coi tasti qui sopra. ' +
        'Frecce e WASD, spazio per la pausa.</p>' +
    '</div>';

  const CSS =
    // L'arcobaleno del neon sta scritto una volta sola: lo usano il bordo del
    // campo, il suo alone e i tasti, e devono essere lo stesso arcobaleno o
    // l'onda non sembra una sola.
    '#pannelloSnake { z-index:20;' +
      ' --arcobaleno:linear-gradient(90deg,#ff2d55,#ff9500,#ffe600,#34e07a,' +
      '#00c8ff,#7a5cff,#ff2d55); }' +
    '@keyframes snake-onda { to { background-position:200% 50%; } }' +
    // Chi ha chiesto meno animazioni non se le ritrova addosso: il bordo
    // resta, l'onda si ferma.
    '@media (prefers-reduced-motion: reduce) { #pannelloSnake * { animation:none !important; } }' +
    // La tela è alta quanto è larga, e una tela larga quanto il telefono
    // spingerebbe la pulsantiera sotto il bordo dello schermo: la larghezza
    // la decide l'altezza che c'è.
    '.snake-scena { max-width:min(420px, 37vh); margin:0 auto; }' +
    // La fascia del marchio: altezza fissa, così il campo sta sempre allo
    // stesso posto con o senza immagine.
    '.snake-marchio { height:min(140px, 19vh); display:flex; align-items:center;' +
      ' justify-content:center; margin-bottom:8px; overflow:hidden; }' +
    // Qui **non** va `image-rendering:pixelated`: il logo è un disegno grande
    // rimpicciolito, non pixel art a misura, e a pixel secchi si sgranerebbe.
    // La tela è l'opposto e infatti lì ci va.
    '.snake-marchio img { max-height:100%; max-width:100%; width:auto;' +
      ' display:block; }' +
    // `hidden` da solo qui non basta: è `display:none` di sistema, e qualunque
    // `display` scritto da noi lo scavalca. Senza questa riga il segnaposto
    // dell'immagine mancante si vede, rotto, accanto alla scritta.
    '.snake-marchio img[hidden], .snake-marchio span[hidden] { display:none; }' +
    '.snake-marchio span { font-family:var(--strumento);' +
      ' font-size:clamp(1rem, 6vw, 1.35rem); font-weight:700;' +
      ' letter-spacing:0.14em; color:var(--text); white-space:nowrap; }' +
    '.snake-marchio b { color:var(--accent); }' +
    '.snake-hud { display:flex; justify-content:space-between; align-items:baseline;' +
      ' gap:8px; margin-bottom:6px; font-family:var(--strumento); font-size:0.72rem;' +
      ' letter-spacing:0.08em; text-transform:uppercase; color:var(--dim); }' +
    '.snake-hud b { color:var(--text); font-size:0.95rem; }' +
    '.snake-nome { color:var(--gold); text-align:center; flex:1;' +
      ' overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }' +
    // Il bordo al neon. Il trucco sono due sfondi sovrapposti: il nero pieno
    // ritagliato sul riquadro interno, l'arcobaleno su tutto — bordo
    // compreso — e largo il doppio, così scorrendo di 200% fa un'onda che
    // torna al punto di partenza senza scatti. Il bordo dev'essere
    // trasparente, o coprirebbe l'arcobaleno.
    '.snake-tela { position:relative; z-index:0; border:3px solid transparent;' +
      ' border-radius:10px; background-image:linear-gradient(#000,#000), var(--arcobaleno);' +
      ' background-origin:border-box; background-clip:padding-box, border-box;' +
      ' background-size:auto, 200% 100%; animation:snake-onda 5s linear infinite; }' +
    // L'alone: lo stesso arcobaleno sfocato dietro, che è quello che fa
    // sembrare acceso un bordo invece che disegnato.
    '.snake-tela::before { content:""; position:absolute; inset:-5px; z-index:-1;' +
      ' border-radius:14px; background:var(--arcobaleno); background-size:200% 100%;' +
      ' filter:blur(11px); opacity:0.5; animation:snake-onda 5s linear infinite; }' +
    '.snake-tela canvas { display:block; width:100%; height:auto; background:#0a0a0c;' +
      ' image-rendering:pixelated; image-rendering:crisp-edges;' +
      // La cassa è disegnata dentro la tela, coi suoi pixel: qui niente
      // bordo, o sarebbero due cornici dentro il neon.
      ' border-radius:7px; touch-action:none; }' +
    '.snake-fine { position:absolute; inset:0; display:flex; flex-direction:column;' +
      ' align-items:center; justify-content:center; gap:10px; text-align:center;' +
      ' padding:16px; background:rgba(0,0,0,0.82); border-radius:4px;' +
      ' font-family:var(--strumento); }' +
    '.snake-fine[hidden] { display:none; }' +
    '.snake-titolo { font-size:1.15rem; font-weight:700; letter-spacing:0.04em;' +
      ' color:var(--accent); }' +
    '.snake-motivo { font-size:0.82rem; color:var(--text); max-width:26ch; line-height:1.45; }' +
    '.snake-pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px;' +
      ' max-width:270px; margin:12px auto 0; }' +
    // I tasti hanno lo stesso bordo del campo, e ognuno parte con un ritardo
    // suo: l'onda non lampeggia tutta insieme, gira intorno alla pulsantiera.
    '.snake-pad button { font-size:1.1rem; padding:13px 0; font-family:var(--strumento);' +
      ' position:relative; z-index:0; border:2px solid transparent; border-radius:10px;' +
      ' background-image:linear-gradient(var(--panel),var(--panel)), var(--arcobaleno);' +
      ' background-origin:border-box; background-clip:padding-box, border-box;' +
      ' background-size:auto, 200% 100%; animation:snake-onda 5s linear infinite; }' +
    '.snake-pad [data-dir="su"] { grid-column:2; grid-row:1; animation-delay:0s; }' +
    '.snake-pad [data-dir="dx"] { grid-column:3; grid-row:2; animation-delay:-1.25s; }' +
    '.snake-pad [data-dir="giu"] { grid-column:2; grid-row:2; animation-delay:-2.5s; }' +
    '.snake-pad [data-dir="sx"] { grid-column:1; grid-row:2; animation-delay:-3.75s; }' +
    '.snake-aiuto { margin-top:14px; text-align:center; }';

  let pannello = null, tela = null, ctx = null;
  const parti = {};
  let partita = null, timer = 0, ultimo = 0, accumulo = 0;
  let suonoAcceso = leggi(CHIAVE_SUONO, '1') !== '0';
  let record = parseInt(leggi(CHIAVE_RECORD, '0'), 10) || 0;
  let audio = null;

  /* ------------------------------------------------------------------
     Memoria: `localStorage` e non il database dei preset, perché questa
     roba non deve finire in un backup né viaggiare su Dropbox. Se il
     browser lo nega — succede, e da `file://` succede più spesso — si
     gioca lo stesso, solo senza record.
     ------------------------------------------------------------------ */
  function leggi(chiave, difetto) {
    try {
      const valore = localStorage.getItem(chiave);
      return valore === null ? difetto : valore;
    } catch (errore) { return difetto; }
  }

  function scrivi(chiave, valore) {
    try { localStorage.setItem(chiave, valore); } catch (errore) { /* pazienza */ }
  }

  /* ------------------------------------------------------------------
     Costruzione dello schermo. Riusa `.pannello`, `.primary`, `.piccolo` e
     `.spiega` dell'app: un pannello vestito per conto suo si vedrebbe
     subito che è un corpo estraneo.
     ------------------------------------------------------------------ */
  function costruisci() {
    const stile = document.createElement('style');
    stile.textContent = CSS;
    document.head.appendChild(stile);

    pannello = document.createElement('div');
    pannello.className = 'pannello';
    pannello.id = 'pannelloSnake';
    pannello.innerHTML = SCHERMO;
    document.body.appendChild(pannello);

    pannello.querySelectorAll('[data-snake]').forEach(el => { parti[el.dataset.snake] = el; });
    tela = pannello.querySelector('canvas');
    ctx = tela.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Il marchio si scopre solo se il file c'è davvero: `onerror` non fa
    // niente e resta la scritta. `complete` copre il caso in cui l'immagine
    // fosse già in cache e il carico fosse finito prima di arrivare qui.
    parti.marchio.addEventListener('load', mostraMarchio);
    if (parti.marchio.complete && parti.marchio.naturalWidth) mostraMarchio();

    parti.chiudi.addEventListener('click', chiudi);
    parti.ancora.addEventListener('click', () => { partita = nuova(); });
    parti.suono.addEventListener('click', () => {
      suonoAcceso = !suonoAcceso;
      scrivi(CHIAVE_SUONO, suonoAcceso ? '1' : '0');
      mostraSuono();
    });
    mostraSuono();

    pannello.querySelectorAll('[data-dir]').forEach(bottone => {
      bottone.addEventListener('click', () => sterza(bottone.dataset.dir));
    });

    // Col dito si scorre sulla tela. Il gesto vale dal primo movimento che
    // supera i venti pixel: aspettare che il dito si alzi darebbe un ritardo
    // che in un gioco a caselle si sente tutto.
    let partenza = null;
    tela.addEventListener('pointerdown', evento => {
      partenza = { x: evento.clientX, y: evento.clientY };
    });
    tela.addEventListener('pointermove', evento => {
      if (!partenza) return;
      const dx = evento.clientX - partenza.x, dy = evento.clientY - partenza.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      sterza(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dx' : 'sx') : (dy > 0 ? 'giu' : 'su'));
      partenza = null;
    });
    tela.addEventListener('pointerup', () => { partenza = null; });
    tela.addEventListener('pointercancel', () => { partenza = null; });

    document.addEventListener('keydown', tasto);
  }

  function mostraMarchio() {
    parti.marchio.hidden = false;
    parti.marchioScritto.hidden = true;
  }

  function mostraSuono() {
    parti.suono.textContent = suonoAcceso ? '♪ suono' : '✕ muto';
  }

  const TASTI = {
    ArrowUp: 'su', ArrowDown: 'giu', ArrowLeft: 'sx', ArrowRight: 'dx',
    w: 'su', s: 'giu', a: 'sx', d: 'dx',
  };

  function tasto(evento) {
    if (!aperto()) return;
    if (evento.key === 'Escape') { chiudi(); return; }
    if (evento.key === ' ' || evento.key === 'p') {
      if (!partita.finita) partita.pausa = !partita.pausa;
      evento.preventDefault();
      return;
    }
    if (evento.key === 'Enter' && partita.finita) { partita = nuova(); return; }
    const dove = TASTI[evento.key] || TASTI[String(evento.key).toLowerCase()];
    if (!dove) return;
    sterza(dove);
    evento.preventDefault();   // o le frecce fanno scorrere la pagina di sotto
  }

  const VERSI = {
    su: { x: 0, y: -1 }, giu: { x: 0, y: 1 },
    sx: { x: -1, y: 0 }, dx: { x: 1, y: 0 },
  };

  /**
   * La sterzata si **accoda** invece di sostituire quella in attesa: due
   * tocchi rapidi dentro lo stesso passo (destra e poi su, che è una curva a
   * elle) con una variabile sola si mangerebbero a vicenda e la catena
   * girerebbe una volta sola. Al massimo due, che è quanto serve.
   */
  function sterza(dove) {
    if (!partita || partita.finita) return;
    partita.pausa = false;
    // Qualunque comando fa partire la catena, anche quello che non gira
    // niente: il primo tasto che viene in mente è «su», che è la direzione
    // in cui il serpente già guarda, e con la partenza legata alla sola
    // sterzata utile lì non succedeva niente.
    partita.partito = true;
    const verso = VERSI[dove];
    const ultimoVerso = partita.coda.length
      ? partita.coda[partita.coda.length - 1]
      : partita.verso;
    if (verso.x === -ultimoVerso.x && verso.y === -ultimoVerso.y) return;  // dietrofront: no
    if (verso.x === ultimoVerso.x && verso.y === ultimoVerso.y) return;
    if (partita.coda.length < 2) partita.coda.push(verso);
  }

  /* ------------------------------------------------------------------
     La partita
     ------------------------------------------------------------------ */
  function nuova() {
    const p = {
      catena: [{ x: 5, y: 8 }, { x: 5, y: 9 }, { x: 5, y: 10 }],
      verso: { x: 0, y: -1 },
      coda: [],
      punti: 0,
      passo: PASSO_INIZIALE,
      batteria: null,
      wah: null,          // { x, y, resta } quando il premio è in campo
      prossimoWah: WAH_OGNI,
      prossimoAccordo: ACCORDO_OGNI,
      accordo: 0,         // quale power chord tocca al prossimo traguardo
      cresci: 0,          // caselle da allungare ancora, senza tagliare la coda
      finita: null,
      pausa: false,
      partito: false,     // finché non si tocca un tasto la catena sta ferma
      battito: 0,
    };
    p.batteria = postoLibero(p);
    parti.fine.hidden = true;
    parti.nome.textContent = 'pronti? muovi';
    accumulo = 0;
    parti.punti.textContent = '0';
    parti.record.textContent = record;
    return p;
  }

  /** Una casella libera a caso: né sotto la catena, né sotto quello che c'è già. */
  function postoLibero(p, ancheQuesti) {
    const presi = p.catena.concat(ancheQuesti || []);
    const liberi = [];
    for (let y = 0; y < RIGHE; y++) {
      for (let x = 0; x < COLONNE; x++) {
        if (!presi.some(s => s && s.x === x && s.y === y)) liberi.push({ x: x, y: y });
      }
    }
    if (!liberi.length) return null;   // pedaliera piena: bravo
    return liberi[Math.floor(Math.random() * liberi.length)];
  }

  function avanza() {
    const p = partita;
    if (p.coda.length) p.verso = p.coda.shift();
    const testa = { x: p.catena[0].x + p.verso.x, y: p.catena[0].y + p.verso.y };

    if (testa.x < 0 || testa.x >= COLONNE || testa.y < 0 || testa.y >= RIGHE) {
      morte('Sei caduto giù dalla pedaliera.');
      return;
    }
    // La coda si sposta nello stesso istante, quindi finirci sopra non è uno
    // scontro: è l'unica casella occupata che si sta liberando adesso.
    const corpo = p.catena.slice(0, p.catena.length - 1);
    if (corpo.some(s => s.x === testa.x && s.y === testa.y)) {
      morte('Ti sei attorcigliato i cavi.');
      return;
    }

    p.catena.unshift(testa);
    let mangiataBatteria = false;

    if (p.batteria && testa.x === p.batteria.x && testa.y === p.batteria.y) {
      p.punti++;
      p.cresci++;
      p.batteria = postoLibero(p, [p.wah]);
      parti.nome.textContent = '+ ' + PEDALI[p.punti % PEDALI.length].nome;
      bip(660, 0.05);
      setTimeout(() => bip(990, 0.06), 55);
      mangiataBatteria = true;
    } else if (p.wah && testa.x === p.wah.x && testa.y === p.wah.y) {
      p.punti += WAH_VALE;
      p.cresci += WAH_VALE;
      p.wah = null;
      parti.nome.textContent = '+ WAH! ne vale ' + WAH_VALE;
      // due note che salgono e ridiscendono: è un wah, si sente
      bip(440, 0.06);
      setTimeout(() => bip(880, 0.06), 60);
      setTimeout(() => bip(560, 0.10), 130);
    }

    p.passo = Math.max(PASSO_MINIMO, PASSO_INIZIALE - p.punti * CALO);
    parti.punti.textContent = p.punti;

    // L'accordo del traguardo. La soglia si porta avanti con un `while` e non
    // con un resto: il wah vale tre pedalini in un colpo, quindi il conto può
    // scavalcare il cinque invece di posarcisi sopra.
    let festa = false;
    if (p.punti >= p.prossimoAccordo) {
      while (p.punti >= p.prossimoAccordo) p.prossimoAccordo += ACCORDO_OGNI;
      accordo(ACCORDI[p.accordo++ % ACCORDI.length]);
      festa = true;
    }

    // Il wah arriva dopo l'accordo, e se l'accordo è appena partito entra
    // zitto: due suoni sopra lo stesso passo diventano una poltiglia.
    if (mangiataBatteria && p.punti >= p.prossimoWah) facciaIlWah(p, !festa);

    // La coda si taglia sempre, tranne per le caselle che la catena deve
    // ancora allungarsi: così il wah, che ne vale tre, cresce di tre passi
    // invece che di tre pezzi comparsi tutti insieme dal nulla.
    if (p.cresci > 0) p.cresci--;
    else p.catena.pop();

    if (!p.batteria) morte('Pedaliera piena. Non ci sta più niente.');
  }

  /** Il premio compare, e da lì comincia a scappare. */
  function facciaIlWah(p, conSuono) {
    p.prossimoWah += WAH_OGNI;
    const posto = postoLibero(p, [p.batteria]);
    if (!posto) return;               // non c'è dove metterlo, pazienza
    p.wah = { x: posto.x, y: posto.y, resta: WAH_DURATA };
    parti.nome.textContent = 'un wah! prendilo';
    if (!conSuono) return;
    bip(520, 0.05);
    setTimeout(() => bip(700, 0.05), 70);
    setTimeout(() => bip(900, 0.07), 140);
  }

  function morte(motivo) {
    const p = partita;
    p.finita = motivo;
    bip(320, 0.12);
    setTimeout(() => bip(200, 0.18), 110);

    let titolo = 'Fine dei giochi';
    if (p.punti > record) {
      record = p.punti;
      scrivi(CHIAVE_RECORD, String(record));
      titolo = 'Record nuovo!';
    }
    parti.titolo.textContent = titolo;
    parti.motivo.textContent = motivo + ' ' + p.punti +
      (p.punti === 1 ? ' batteria da 9 volt, ' : ' batterie da 9 volt, ') +
      p.catena.length + ' pedalini in catena.';
    parti.fine.hidden = false;
    parti.punti.textContent = p.punti;
    parti.record.textContent = record;
  }

  /* ------------------------------------------------------------------
     Il disegno, tutto a pixel interi
     ------------------------------------------------------------------ */
  const px = n => BORDO + n * CELLA;

  function r(x, y, larghezza, altezza, colore) {
    ctx.fillStyle = colore;
    ctx.fillRect(x, y, larghezza, altezza);
  }

  function disegna() {
    const p = partita;

    // il pavimento della pedaliera, con la sua trama a puntini
    r(0, 0, LARG, ALT, '#0d0d10');
    ctx.fillStyle = '#16171b';
    for (let y = BORDO; y < ALT - BORDO; y += 8) {
      const sfasa = ((y - BORDO) / 8) % 2 ? 4 : 0;
      for (let x = BORDO + sfasa; x < LARG - BORDO; x += 8) ctx.fillRect(x, y, 1, 1);
    }
    cornice();

    if (p.batteria) batteria(p.batteria, p.battito);
    if (p.wah) wahwah(p.wah, p.battito);

    // i cavi prima, i pedalini sopra: così del cavo si vede solo il pezzo che
    // passa fra una scatoletta e l'altra, come sul pavimento vero
    for (let i = 0; i < p.catena.length - 1; i++) cavo(p.catena[i], p.catena[i + 1]);
    for (let i = p.catena.length - 1; i >= 0; i--) {
      pedalino(p.catena[i], i, i === 0, p.battito);
    }

    if (p.pausa && !p.finita) {
      r(0, Math.floor(ALT / 2) - 10, LARG, 20, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = '#f0c040';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSA', LARG / 2, Math.floor(ALT / 2) + 4);
    }
  }

  /**
   * La custodia: il campo sta dentro una cassa da trasporto, con le
   * squadrette di metallo agli angoli e la vite che le tiene. Serve a dare
   * un bordo a un rettangolo che altrimenti finisce nel nero della pagina —
   * e a un gioco di pedalini una cassa da pedaliera sta bene addosso.
   */
  function cornice() {
    const legno = '#2a2c33', metallo = '#8d929c';

    // la cassa, con la luce che viene da sopra a sinistra
    r(0, 0, LARG, BORDO, legno); r(0, ALT - BORDO, LARG, BORDO, legno);
    r(0, 0, BORDO, ALT, legno); r(LARG - BORDO, 0, BORDO, ALT, legno);
    r(0, 0, LARG, 1, '#4a4e57'); r(0, 0, 1, ALT, '#4a4e57');
    r(0, ALT - 1, LARG, 1, '#15161a'); r(LARG - 1, 0, 1, ALT, '#15161a');

    // lo scalino attorno alla vasca, che dà profondità
    const dentro = BORDO - 1;
    r(dentro, dentro, LARG - dentro * 2, 1, '#15161a');
    r(dentro, dentro, 1, ALT - dentro * 2, '#15161a');
    r(dentro, ALT - dentro - 1, LARG - dentro * 2, 1, '#4a4e57');
    r(LARG - dentro - 1, dentro, 1, ALT - dentro * 2, '#4a4e57');

    // le quattro squadrette, ognuna con la sua vite
    squadretta(1, 1, 1, 1);
    squadretta(LARG - 2, 1, -1, 1);
    squadretta(1, ALT - 2, 1, -1);
    squadretta(LARG - 2, ALT - 2, -1, -1);

    function squadretta(x, y, versoX, versoY) {
      const lungo = 9, spesso = 3;
      const sinistra = versoX > 0 ? x : x - lungo + 1;
      const alto = versoY > 0 ? y : y - lungo + 1;
      r(sinistra, versoY > 0 ? y : y - spesso + 1, lungo, spesso, metallo);
      r(versoX > 0 ? x : x - spesso + 1, alto, spesso, lungo, metallo);
      // la vite nel gomito, col taglio del cacciavite
      const vx = versoX > 0 ? x + 4 : x - 5, vy = versoY > 0 ? y : y - 2;
      r(vx, vy, 3, 3, '#d8d8dc');
      r(vx + 1, vy + 1, 1, 1, '#5a5f68');
    }
  }

  /**
   * Il wah: il premio. Visto di fianco, com'è davvero — una rampa che sale,
   * la piastra di metallo sopra, la base sotto. Quando sta per scappare
   * lampeggia, e i tre gradini si accendono a turno come una spazzata.
   */
  function wahwah(cella, battito) {
    const x = px(cella.x), y = px(cella.y);
    const quasiFinito = partita.wah.resta <= WAH_LAMPEGGIA;
    if (quasiFinito && battito % 2) return;

    r(x + 1, y + 11, 14, 3, '#5a5f68');      // la base
    r(x + 1, y + 13, 14, 1, '#15161a');
    for (let i = 0; i < 4; i++) {
      const sinistra = x + 2 + i * 3, alto = y + 8 - i * 2;
      r(sinistra, alto, 3, y + 12 - alto, '#3a3b45');
      r(sinistra, alto, 3, 1, i === 3 ? '#e8ecf2' : '#b6bcc6');
    }
    r(x + 2, y + 9, 2, 2, '#f0c040');        // la punta, dove si preme
    r(x + 12, y + 9, 2, 2, '#ff3b30');       // il LED, sul tacco
  }

  /**
   * Il cavo fra due pedalini. Grigio e non nero: fra una scatoletta e l'altra
   * restano tre pixel di pavimento, e su un pavimento quasi nero un cavo nero
   * non c'è. Le due estremità sono i jack, che spuntano da sotto le scatole.
   */
  function cavo(a, b) {
    const guaina = '#5a5f68', jack = '#c8ccd4';
    if (a.y === b.y) {
      const cucitura = px(Math.max(a.x, b.x));
      r(cucitura - 6, px(a.y) + 6, 12, 3, guaina);
      r(cucitura - 6, px(a.y) + 6, 3, 3, jack);
      r(cucitura + 3, px(a.y) + 6, 3, 3, jack);
    } else {
      const cucitura = px(Math.max(a.y, b.y));
      r(px(a.x) + 6, cucitura - 6, 3, 12, guaina);
      r(px(a.x) + 6, cucitura - 6, 3, 3, jack);
      r(px(a.x) + 6, cucitura + 3, 3, 3, jack);
    }
  }

  /**
   * Un pedalino in tredici pixel per tredici: corpo, due manopole, il LED e
   * il pulsantone. Meno di così non si riconosce, di più non ci sta.
   */
  function pedalino(cella, indice, testa, battito) {
    const c = PEDALI[indice % PEDALI.length];
    const x = px(cella.x) + 1, y = px(cella.y) + 1;

    r(x, y, 13, 13, c.corpo);
    r(x, y, 13, 1, c.luce);
    r(x, y, 1, 13, c.luce);
    r(x, y + 12, 13, 1, c.ombra);
    r(x + 12, y, 1, 13, c.ombra);

    // Manopole agli angoli e non affiancate in mezzo: in mezzo, con il
    // pulsantone sotto, veniva fuori una faccina invece di un pedale.
    r(x + 1, y + 1, 3, 3, '#1b1b1f'); r(x + 2, y + 1, 1, 1, '#d8d8dc');
    r(x + 9, y + 1, 3, 3, '#1b1b1f'); r(x + 10, y + 2, 1, 1, '#d8d8dc');

    // il LED: sulla testa è rosso e pulsa, sugli altri è verde fisso — sono
    // tutti accesi, è una catena che sta suonando
    r(x + 6, y + 1, 1, 2, testa ? (battito % 2 ? '#ff3b30' : '#ff9a94') : '#7fe08a');

    // Il pedale da pestare: due terzi buoni della scatoletta, come su quelli
    // veri. È lui a far riconoscere un pedalino invece di un quadrato.
    r(x + 1, y + 5, 11, 8, c.ombra);
    r(x + 1, y + 5, 11, 1, c.luce);
    r(x + 4, y + 9, 5, 2, '#c8ccd4');
    r(x + 4, y + 11, 5, 1, '#3a3a42');
  }

  function batteria(cella, battito) {
    const x = px(cella.x), y = px(cella.y);
    const scuro = '#1c1c20';
    r(x + 4, y, 2, 2, '#e0c060');            // i due poli, uno tondo e uno a corona
    r(x + 8, y, 3, 2, '#e0c060');
    r(x + 3, y + 2, 10, 2, '#c8ccd4');       // il cappello di metallo
    r(x + 3, y + 4, 10, 11, scuro);          // il corpo
    r(x + 3, y + 4, 1, 11, '#3a3a42');
    r(x + 12, y + 4, 1, 11, '#0a0a0c');
    r(x + 4, y + 6, 8, 5, '#f0c040');        // la fascia gialla, con su «9V»
    r(x + 5, y + 7, 3, 1, scuro); r(x + 5, y + 8, 1, 1, scuro);
    r(x + 7, y + 8, 1, 1, scuro); r(x + 5, y + 9, 3, 1, scuro);
    r(x + 9, y + 7, 1, 2, scuro); r(x + 11, y + 7, 1, 2, scuro);
    r(x + 10, y + 9, 1, 1, scuro);
    if (battito % 2) r(x + 2, y + 3, 1, 12, '#5a4a10');   // il lampeggio
  }

  /* ------------------------------------------------------------------
     Il suono: quattro onde quadre e via. Niente campioni da scaricare, e
     comunque si può spegnere — fra una canzone e l'altra c'è chi ha ancora
     le cuffie in testa.
     ------------------------------------------------------------------ */
  /** Il motore audio, acceso alla prima nota e non prima. */
  function motore() {
    if (!suonoAcceso) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      // I browser tengono l'audio sospeso finché non c'è un gesto: qui il
      // gesto c'è sempre, perché si suona premendo qualcosa.
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch (errore) { return null; }   // senza audio si gioca uguale
  }

  function bip(frequenza, durata) {
    const a = motore();
    if (!a) return;
    try {
      const oscillatore = a.createOscillator(), volume = a.createGain();
      oscillatore.type = 'square';
      oscillatore.frequency.value = frequenza;
      oscillatore.connect(volume);
      volume.connect(a.destination);
      const ora = a.currentTime;
      volume.gain.setValueAtTime(0.05, ora);
      volume.gain.exponentialRampToValueAtTime(0.0001, ora + durata);
      oscillatore.start(ora);
      oscillatore.stop(ora + durata + 0.02);
    } catch (errore) { /* pazienza */ }
  }

  /**
   * La curva del distorsore: è quella classica, e quello che fa è schiacciare
   * i picchi dell'onda. Si calcola una volta sola perché sono 256 numeri che
   * non cambiano mai.
   */
  let curvaDistorsione = null;
  function curva() {
    if (curvaDistorsione) return curvaDistorsione;
    const punti = 256, quanto = 42;
    curvaDistorsione = new Float32Array(punti);
    for (let i = 0; i < punti; i++) {
      const x = (i * 2) / punti - 1;
      curvaDistorsione[i] = ((3 + quanto) * x * 20 * Math.PI / 180) /
                            (Math.PI + quanto * Math.abs(x));
    }
    return curvaDistorsione;
  }

  /**
   * L'accordo di premio, ogni cinque pedalini. Non è un campione: sono tre
   * corde — tonica, quinta, ottava — fatte con onde a dente di sega, due voci
   * per corda leggermente scordate fra loro perché una sola suona finta, e
   * tutte dentro un distorsore. Le corde partono **sfalsate di diciotto
   * millisecondi**: è la pennata, ed è quella a far sentire una chitarra
   * invece di un organo. Il filtro in fondo toglie lo stridulo che la
   * distorsione tira fuori dal dente di sega.
   */
  function accordo(corde) {
    const a = motore();
    if (!a) return;
    try {
      const ora = a.currentTime;
      const distorsore = a.createWaveShaper();
      distorsore.curve = curva();
      distorsore.oversample = '4x';
      // Le sei voci entrano nel distorsore **abbassate**: a piena ampiezza la
      // somma arriva a sei volte il fondoscala e la curva schiaccia tutto in
      // un'onda quadra, che è un rumore, non un accordo. Con lo 0,3 la curva
      // lavora sul ginocchio, che è dove si sente la chitarra.
      const ingresso = a.createGain();
      ingresso.gain.value = 0.3;
      ingresso.connect(distorsore);

      const filtro = a.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 2400;
      const volume = a.createGain();
      volume.gain.setValueAtTime(0.0001, ora);
      volume.gain.exponentialRampToValueAtTime(0.07, ora + 0.014);
      volume.gain.exponentialRampToValueAtTime(0.0001, ora + 0.5);
      distorsore.connect(filtro);
      filtro.connect(volume);
      volume.connect(a.destination);

      corde.forEach((frequenza, i) => {
        [-7, 7].forEach(scordatura => {
          const o = a.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = frequenza;
          o.detune.value = scordatura;
          o.connect(ingresso);
          o.start(ora + i * 0.018);
          o.stop(ora + 0.56);
        });
      });
    } catch (errore) { /* pazienza */ }
  }

  /* ------------------------------------------------------------------
     Il ciclo.
     Un timer e non `requestAnimationFrame`: qui non si interpola niente —
     tutto si muove di una casella alla volta — quindi la fluidità del
     fotogramma non serve, e un timer si può far girare anche in un browser
     senza schermo, che è l'unico modo di provare questa roba dalla mia
     parte. Il passo del timer è più fitto del passo del gioco, così la
     cadenza vera resta quella dell'accumulo.
     ------------------------------------------------------------------ */
  const BATTITO = 30;
  const aperto = () => !!pannello && pannello.classList.contains('aperto');

  function ciclo() {
    // Il logo, o un passaggio alla vista live, chiudono tutti i pannelli
    // senza passare da qui: il ciclo se ne accorge e si ferma da solo.
    if (!aperto()) { ultimo = 0; clearInterval(timer); timer = 0; return; }

    const ora = performance.now();
    let passato = ultimo ? ora - ultimo : 0;
    ultimo = ora;
    // Tornando da un'altra scheda il browser consegna tutto il tempo
    // arretrato insieme: recuperarlo vorrebbe dire trovare la partita già
    // finita, contro un muro visto da nessuno.
    if (passato > 400) passato = 0;

    const p = partita;
    p.battito = Math.floor(ora / 260);
    if (!p.finita && !p.pausa && (p.partito || p.coda.length)) {
      p.partito = true;
      accumulo += passato;
      while (accumulo >= p.passo && !p.finita) { accumulo -= p.passo; avanza(); }

      // Il wah scappa a tempo, non a passi: dev'essere una fretta che si
      // sente anche stando fermi a guardarlo.
      if (p.wah) {
        p.wah.resta -= passato;
        if (p.wah.resta <= 0) {
          p.wah = null;
          parti.nome.textContent = 'il wah se n\'è andato';
          bip(300, 0.09);
        }
      }
    }
    disegna();
  }

  /* ------------------------------------------------------------------
     Le due porte
     ------------------------------------------------------------------ */
  function apri() {
    if (!pannello) costruisci();
    partita = nuova();
    pannello.classList.add('aperto');
    ultimo = 0;
    if (!timer) timer = setInterval(ciclo, BATTITO);
    disegna();
  }

  function chiudi() {
    if (!pannello) return;
    pannello.classList.remove('aperto');
    if (timer) { clearInterval(timer); timer = 0; }
  }

  return { apri: apri, chiudi: chiudi };
})();
