'use strict';
/**
 * Snake dei pedalini — il passatempo fra una canzone e l'altra.
 *
 * Sta in un file suo e non in `index.html` per una ragione sola: è una
 * goliardata, e una goliardata non deve pesare su un file che già costa
 * cinquantamila token da leggere. Vive per conto proprio — si costruisce lo
 * schermo, si porta il suo CSS, e **non tocca niente dell'app**: né il
 * Bluetooth, né la libreria, né lo stato. L'unico contatto con il resto del
 * mondo è `SnakePedali.apri()`.
 *
 * Il vestito è a 8 bit sul serio: si disegna su una tela da 200×216 pixel
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
  const BORDO = 4;                  // la cornice della pedaliera
  const LARG = COLONNE * CELLA + BORDO * 2;
  const ALT = RIGHE * CELLA + BORDO * 2;

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

  const SCHERMO =
    '<div class="barra-alta">' +
      '<h2 style="flex:1">Snake dei pedalini</h2>' +
      '<button class="piccolo" data-snake="suono">suono</button>' +
      '<button class="primary" data-snake="chiudi">Fatto</button>' +
    '</div>' +
    '<div class="snake-scena">' +
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
      '<p class="spiega snake-aiuto">Frecce o WASD, spazio per la pausa. ' +
        'Col dito si scorre sullo schermo, oppure si usano i tasti qui sopra. ' +
        'L&#39;ampli non c&#39;entra niente: da qui non parte nessun comando.</p>' +
    '</div>';

  const CSS =
    '#pannelloSnake { z-index:20; }' +
    // La tela è alta quanto è larga, e una tela larga quanto il telefono
    // spingerebbe la pulsantiera sotto il bordo dello schermo: la larghezza
    // la decide l'altezza che c'è.
    '.snake-scena { max-width:min(420px, 58vh); margin:0 auto; }' +
    '.snake-hud { display:flex; justify-content:space-between; align-items:baseline;' +
      ' gap:8px; margin-bottom:6px; font-family:var(--strumento); font-size:0.72rem;' +
      ' letter-spacing:0.08em; text-transform:uppercase; color:var(--dim); }' +
    '.snake-hud b { color:var(--text); font-size:0.95rem; }' +
    '.snake-nome { color:var(--gold); text-align:center; flex:1;' +
      ' overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }' +
    '.snake-tela { position:relative; }' +
    '.snake-tela canvas { display:block; width:100%; height:auto; background:#0a0a0c;' +
      ' image-rendering:pixelated; image-rendering:crisp-edges;' +
      ' border:1px solid var(--line); border-radius:4px; touch-action:none; }' +
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
    '.snake-pad button { font-size:1.1rem; padding:13px 0; font-family:var(--strumento); }' +
    '.snake-pad [data-dir="su"] { grid-column:2; grid-row:1; }' +
    '.snake-pad [data-dir="sx"] { grid-column:1; grid-row:2; }' +
    '.snake-pad [data-dir="giu"] { grid-column:2; grid-row:2; }' +
    '.snake-pad [data-dir="dx"] { grid-column:3; grid-row:2; }' +
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

  function postoLibero(p) {
    const liberi = [];
    for (let y = 0; y < RIGHE; y++) {
      for (let x = 0; x < COLONNE; x++) {
        if (!p.catena.some(s => s.x === x && s.y === y)) liberi.push({ x: x, y: y });
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

    if (p.batteria && testa.x === p.batteria.x && testa.y === p.batteria.y) {
      p.punti++;
      p.passo = Math.max(PASSO_MINIMO, PASSO_INIZIALE - p.punti * CALO);
      p.batteria = postoLibero(p);
      parti.nome.textContent = '+ ' + PEDALI[p.punti % PEDALI.length].nome;
      parti.punti.textContent = p.punti;
      bip(660, 0.05);
      setTimeout(() => bip(990, 0.06), 55);
      if (!p.batteria) morte('Pedaliera piena. Non ci sta più niente.');
    } else {
      p.catena.pop();
    }
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
    // la cornice: chiara sopra e a sinistra, scura sotto e a destra, che è
    // quanto basta perché il piano sembri stare dentro qualcosa
    r(0, 0, LARG, 2, '#33363d'); r(0, 0, 2, ALT, '#33363d');
    r(0, ALT - 2, LARG, 2, '#1a1c20'); r(LARG - 2, 0, 2, ALT, '#1a1c20');

    if (p.batteria) batteria(p.batteria, p.battito);

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
  function bip(frequenza, durata) {
    if (!suonoAcceso) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillatore = audio.createOscillator(), volume = audio.createGain();
      oscillatore.type = 'square';
      oscillatore.frequency.value = frequenza;
      oscillatore.connect(volume);
      volume.connect(audio.destination);
      const ora = audio.currentTime;
      volume.gain.setValueAtTime(0.05, ora);
      volume.gain.exponentialRampToValueAtTime(0.0001, ora + durata);
      oscillatore.start(ora);
      oscillatore.stop(ora + durata + 0.02);
    } catch (errore) { /* senza audio si gioca uguale */ }
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
