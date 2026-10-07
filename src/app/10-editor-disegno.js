// Sparkling Tones — 10-editor-disegno.js: Il disegno dell'editor.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Il disegno dell'editor: la catena in cima, un blocco alla volta sotto

   Scelto dall'utente in `design/proposte-editor.html`, che esiste apposta per
   far prendere questa decisione guardando invece che ragionando. Prima i
   sette blocchi stavano tutti aperti: erano tre schermate, e non si sapeva
   mai a che punto della catena si stessero mettendo le mani.
   ==================================================================== */

/**
 * Un colore acceso per posizione della catena, così la categoria si riconosce
 * senza leggerla. Sono tinte sature con l'alone, e il fondo dei tasselli è
 * **più scuro** della pagina: il neon si vede sul buio, e un pannello grigio
 * smorza tutto quello che ci sta sopra.
 */
const COLORI_CATENA = ['#00d9ff', '#c04bff', '#ff3040', '#ffd21e',
                       '#17e39b', '#3aa0ff', '#8b6bff'];
const coloreDi = posizione => COLORI_CATENA[posizione % COLORI_CATENA.length];

/**
 * I valori viaggiano da 0 a 1 — è quello che vuole l'ampli — ma si leggono da
 * 0 a 10 con un decimale, come sulle manopole vere: «6.1» dice qualcosa a chi
 * suona, «0.61» no. Il numero mostrato non entra mai in un comando.
 */
const mostraValore = valore => (valore * 10).toFixed(1);

/**
 * L'ordine in cui si leggono le manopole sullo schermo. Su un ampli è quello
 * del frontale — Gain, Bass, Middle, Treble, Master — mentre negli indici
 * Treble e Bass stanno al contrario (vedi `spark-effetti.js`).
 *
 * Si riconosce **dai nomi**, non dalla posizione nella catena: è avere quei
 * cinque comandi che fa di un blocco un frontale, non dove sta. Se i nomi non
 * combaciano si resta all'ordine degli indici, che è sempre vero.
 */
const TONI = ['Gain', 'Treble', 'Middle', 'Bass', 'Master'];
function èFrontale(effetto, vere) {
  if (vere.length !== 5) return false;
  return TONI.every((atteso, i) =>
    SparkEffetti.manopola(effetto.name, vere[i].index, vere.length) === atteso);
}


/**
 * L'insegna col nome del preset, accesa del colore della sua famiglia di
 * suono. Senza famiglia resta bianca: inventarle un colore qui vorrebbe dire
 * far leggere una famiglia che non c'è.
 */
function accendiInsegna(record) {
  const scelta = record && record.famiglia &&
                 famiglie.find(f => f.id === record.famiglia);
  $('titoloEditor').textContent = record.name;
  $('riquadroPreset').style.setProperty('--fam', scelta ? scelta.colore : '#ffffff');
}
function disegnaCatena() {
  const catena = $('catena');
  catena.innerHTML = '';
  if (!inModifica) return;

  const quanti = inModifica.effetti.length;
  if (!quanti) return;
  if (inModifica.scelto === undefined || inModifica.scelto >= quanti) {
    inModifica.scelto = Math.min(3, quanti - 1);      // si parte dall'ampli
  }

  catena.appendChild(striscia());
  catena.appendChild(bloccoAFuoco(inModifica.effetti[inModifica.scelto],
                                  inModifica.scelto));
  // Il tassello scelto va portato in vista da sé: cambiando blocco con le
  // frecce la striscia resterebbe ferma, e sembrerebbe che non sia successo
  // niente. Si sposta la striscia a mano invece di `scrollIntoView`, che
  // trascina anche la pagina sotto e fa saltare il pannello.
  //
  // E si aspetta un giro di disegno: all'apertura questa funzione gira mentre
  // il pannello è ancora nascosto, e un elemento nascosto è largo zero — il
  // conto verrebbe zero e la striscia resterebbe al primo tassello.
  requestAnimationFrame(() => {
    const scelto = catena.querySelector('.tassello.scelto');
    const fila   = catena.querySelector('.striscia');
    if (!scelto || !fila || !fila.clientWidth) return;
    fila.scrollLeft = scelto.offsetLeft - (fila.clientWidth - scelto.offsetWidth) / 2;
  });
}

/** La fila dei sette blocchi, nell'ordine del segnale. */
function striscia() {
  const fila = document.createElement('div');
  fila.className = 'striscia';
  inModifica.effetti.forEach((effetto, posizione) => {
    if (posizione) {
      const filo = document.createElement('div');
      filo.className = 'filo';
      fila.appendChild(filo);
    }
    fila.appendChild(tassello(effetto, posizione));
  });
  return fila;
}

function tassello(effetto, posizione) {
  const scelto = posizione === inModifica.scelto;
  const t = document.createElement('button');
  t.type = 'button';
  t.className = 'tassello' + (scelto ? ' scelto' : '') +
                (effetto.enabled ? ' acceso' : ' spento');
  t.style.setProperty('--cat', coloreDi(posizione));
  t.title = effetto.name;          // l'identificativo dell'ampli resta a portata

  const led = document.createElement('span');
  led.className = 'led';

  const cat = document.createElement('div');
  cat.className = 'cat';
  cat.textContent = Spark.CATENA[posizione] || tr`posizione ${posizione + 1}`;

  const modello = document.createElement('div');
  modello.className = 'modello';
  modello.textContent = SparkEffetti.nome(effetto.name);

  const barre = barrette(effetto);
  if (scelto) inModifica.barreAFuoco = barre;    // si aggiornano girando

  t.append(led, cat, modello, barre);
  t.addEventListener('click', () => {
    inModifica.scelto = posizione;
    disegnaCatena();
  });
  return t;
}

/**
 * Le barrettine coi valori delle prime cinque manopole. Non si leggono i
 * numeri: si vede la forma del suono, e si capisce quale blocco andare a
 * toccare prima di toccarlo.
 */
function barrette(effetto) {
  const box = document.createElement('div');
  box.className = 'barrette';
  manopoleVere(effetto).slice(0, 5).forEach(param => {
    const barra = document.createElement('i');
    barra.style.height = Math.max(2, Math.round(param.value * 16)) + 'px';
    box.appendChild(barra);
  });
  return box;
}

/** Le manopole vere: senza i parametri che manopole non sono. */
const manopoleVere = effetto =>
  effetto.params.filter(p => !SparkEffetti.extra(effetto.name, p.index));

/* ------------------------------------------------------------------ */

function bloccoAFuoco(effetto, posizione) {
  const blocco = document.createElement('div');
  blocco.className = 'blocco aFuoco' + (effetto.enabled ? '' : ' spento');
  blocco.style.setProperty('--cat', coloreDi(posizione));

  blocco.appendChild(barraPosizione(posizione));
  blocco.appendChild(intestazioneBlocco(effetto, posizione));
  blocco.appendChild(griglia(effetto, posizione));

  // Qui c'era l'avviso «è spento: le manopole non si sentono». Tolto il 26
  // agosto 2026 su richiesta — nessun messaggio in questo pannello. Che sia
  // spento lo dicono già l'interruttore, che porta scritto «spento», e il
  // blocco intero che si smorza.

  // Il cassetto dei parametri che non sono manopole non compare più (26 agosto
  // 2026, su richiesta): era l'ultima riga di testo rimasta in questo pannello,
  // e quel parametro in più è l'acceso/spento del blocco, che l'interruttore
  // qui sopra già comanda. `cassettoExtra` resta, se un giorno servisse
  // rivederli.
  return blocco;
}

/** ‹ CATEGORIA › — si cambia blocco anche senza tornare sulla striscia. */
function barraPosizione(posizione) {
  const barra = document.createElement('div');
  barra.className = 'barra-posizione';

  const vaiA = (dove, segno, etichetta) => {
    const tasto = document.createElement('button');
    tasto.type = 'button';
    tasto.className = 'freccia';
    tasto.textContent = segno;
    tasto.title = etichetta;
    tasto.disabled = dove < 0 || dove >= inModifica.effetti.length;
    tasto.addEventListener('click', () => {
      inModifica.scelto = dove;
      disegnaCatena();
    });
    return tasto;
  };

  const dove = document.createElement('div');
  dove.className = 'dove';
  dove.textContent = Spark.CATENA[posizione] || tr`posizione ${posizione + 1}`;

  barra.append(vaiA(posizione - 1, '‹', tr('il blocco prima')), dove,
               vaiA(posizione + 1, '›', tr('il blocco dopo')));
  return barra;
}

/**
 * Il nome del blocco è una tendina: da lì si cambia il modello. L'era di un
 * pulsante «cambia» accanto al nome è finita perché nessuno collegava il
 * pulsante al nome che stava leggendo.
 */
/**
 * L'elenco da cui si sceglie un modello o un tipo.
 *
 * Disegnato invece di usare un `<select>` perché sul telefono quello apre il
 * menu di sistema: caratteri suoi, che i nostri fogli di stile non toccano, e
 * ogni voce lunga mandata a capo su due righe. Trentanove ampli così sono uno
 * schermo e mezzo da scorrere. Qui ogni voce sta su **una riga**, e se il nome
 * non ci sta si tronca invece di raddoppiare l'altezza.
 *
 * `voci` è una lista di `{ valore, testo, gruppo, spento, title }`: il gruppo
 * fa da intestazione quando cambia, e le voci spente si leggono ma non si
 * prendono.
 */
/** Il nome di un gruppo da mostrare: due di `GRUPPI_AMPLI` sono parole italiane. */
const nomeGruppo = gruppo =>
  ({ Acustico: tr('Acustico'), Basso: tr('Basso') })[gruppo] || gruppo;

function apriElenco(titolo, voci, scelto, quando) {
  const velo = document.createElement('div');
  velo.className = 'velo-elenco';
  const box = document.createElement('div');
  box.className = 'elenco-scelta';

  const testa = document.createElement('div');
  testa.className = 'elenco-testa';
  testa.textContent = titolo;
  const lista = document.createElement('div');
  lista.className = 'elenco-corpo';

  let gruppoOra = null;
  for (const voce of voci) {
    if (voce.gruppo && voce.gruppo !== gruppoOra) {
      gruppoOra = voce.gruppo;
      const g = document.createElement('div');
      g.className = 'elenco-gruppo';
      g.textContent = nomeGruppo(voce.gruppo);
      lista.appendChild(g);

      // **Il momento della scelta è questo**, e non dopo aver sentito il
      // silenzio: questi modelli entrano in catena e restano muti finché
      // l'app ufficiale non li sblocca (vedi `CLAUDE.md`). La nota sta qui e
      // non su ogni voce — sotto l'intestazione vale per tutte, e ripeterla
      // quattordici volte sarebbe rumore.
      if (voce.gruppo === SparkEffetti.GRUPPO_HENDRIX) {
        const nota = document.createElement('div');
        nota.className = 'elenco-nota';
        nota.textContent = tr('Suonano solo se l\'app ufficiale si è collegata ' +
          'all\'ampli almeno una volta da quando è acceso. Altrimenti li vedi ' +
          'in catena ma non li senti.');
        lista.appendChild(nota);
      }
    }
    const riga = document.createElement('button');
    riga.type = 'button';
    riga.className = 'elenco-voce' + (voce.valore === scelto ? ' scelta' : '') +
                     (voce.spento ? ' spenta' : '');
    riga.textContent = voce.testo;
    riga.title = voce.title || voce.testo;
    if (voce.spento) riga.disabled = true;
    else riga.addEventListener('click', () => { chiudi(); quando(voce.valore); });
    lista.appendChild(riga);
  }

  box.append(testa, lista);
  velo.appendChild(box);
  document.body.appendChild(velo);

  function chiudi() {
    velo.remove();
    document.removeEventListener('keydown', tasto);
  }
  function tasto(evento) { if (evento.key === 'Escape') chiudi(); }
  document.addEventListener('keydown', tasto);
  velo.addEventListener('click', evento => { if (evento.target === velo) chiudi(); });

  // L'elenco si apre **su quello che c'è adesso**, non in cima: con trentanove
  // voci, arrivare e non vedere la propria vuol dire scorrere a caso.
  requestAnimationFrame(() => {
    const qui = lista.querySelector('.scelta');
    if (qui) lista.scrollTop = qui.offsetTop - lista.clientHeight / 2 + qui.offsetHeight / 2;
  });
}

/**
 * Una tendina che si apre con `apriElenco` invece che col menu del sistema.
 *
 * Fuori è un campo come gli altri, dentro è l'elenco dell'editor. Serve perché
 * un `<select>` vero lo disegna il sistema operativo: sul telefono arriva il
 * menu di Android — carattere suo, fondo chiaro in un'app tutta nera, e le voci
 * lunghe a capo su due righe — e non c'è foglio di stile che lo tocchi.
 *
 * Il valore scelto sta in `.valore`, che è quello che prima si leggeva da
 * `.value`. `aggiorna(v)` lo cambia da fuori, come faceva `select.value = …`.
 */
function tendinaFinta(titolo, voci, valore, quando) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tendina-finta';
  b.valore = valore;

  const testo = document.createElement('span');
  testo.className = 'testo';
  const freccia = document.createElement('span');
  freccia.className = 'freccia';
  freccia.textContent = '▾';
  b.append(testo, freccia);

  b.aggiorna = nuovo => {
    if (nuovo !== undefined) b.valore = nuovo;
    const voce = voci.find(v => v.valore === b.valore);
    testo.textContent = voce ? voce.testo : '';
    b.title = voce ? (voce.title || voce.testo) : titolo;
  };
  b.aggiorna();

  b.addEventListener('click', () => apriElenco(titolo, voci, b.valore, scelto => {
    b.aggiorna(scelto);
    if (quando) quando(scelto);
  }));
  return b;
}

/* --------------------------------------------------------------------
   Le finestre nostre, al posto di quelle del browser

   `confirm()`, `alert()` e `prompt()` aprono la finestra del sistema, ed è la
   stessa ragione della tendina: carattere suo, fondo chiaro, e sul telefono il
   nome del sito scritto in cima come su un sito qualunque. Ma ce n'è una più
   grossa, ed è la stessa che ha fatto nascere la domanda dell'editor: **un
   `confirm()` ha due vie sole**, e quando la risposta giusta è una terza va
   infilata per forza in una delle due.

   Stessa scatola dell'elenco dei modelli e della domanda dell'editor: è
   l'unica finestra che questa app apre sopra il resto, e ne basta una.
   -------------------------------------------------------------------- */

/**
 * Una domanda con dei bottoni, e all'occorrenza un campo da riempire.
 *
 * Torna il valore del bottone premuto, e **`null` se si esce senza scegliere**
 * — Esc, tocco fuori — che è la via d'uscita che rimette tutto com'era.
 * Un'azione con `vuoleTesto` torna invece quello che c'è scritto nel campo.
 *
 * @param azioni lista di `{ testo, valore, classe, vuoleTesto }`
 * @param campo  `{ valore, invito }` se la domanda ha qualcosa da scrivere
 */
function finestra({ titolo, testo, azioni, campo }) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo-elenco';
    const box = document.createElement('div');
    box.className = 'elenco-scelta';

    const testa = document.createElement('div');
    testa.className = 'elenco-testa';
    testa.textContent = titolo;
    box.appendChild(testa);

    if (testo) {
      const domanda = document.createElement('div');
      domanda.className = 'elenco-domanda';
      // `innerHTML` perché le domande hanno il grassetto sulla parte che
      // conta, come nell'editor. I testi sono nostri, non arrivano da fuori;
      // i nomi dei preset ci entrano solo da `testoConNome`, che li scappa.
      domanda.innerHTML = testo;
      box.appendChild(domanda);
    }

    let ingresso = null;
    if (campo) {
      ingresso = document.createElement('input');
      ingresso.type = 'text';
      ingresso.className = 'elenco-campo';
      ingresso.value = campo.valore || '';
      if (campo.invito) ingresso.placeholder = campo.invito;
      box.appendChild(ingresso);
    }

    const riga = document.createElement('div');
    riga.className = 'elenco-azioni';
    let primo = null;
    for (const azione of azioni) {
      const b = document.createElement('button');
      b.type = 'button';
      if (azione.classe) b.className = azione.classe;
      b.textContent = azione.testo;
      b.addEventListener('click', () => {
        if (azione.vuoleTesto) {
          const scritto = ingresso.value.trim();
          if (!scritto) { ingresso.focus(); return; }   // niente nome, niente da fare
          chiudi(scritto);
        } else {
          chiudi(azione.valore);
        }
      });
      if (!primo) primo = b;
      riga.appendChild(b);
    }
    box.appendChild(riga);
    velo.appendChild(box);
    document.body.appendChild(velo);

    // Col campo il dito è già lì: si scrive e si preme invio. Senza, il fuoco
    // va sulla prima azione, che è quella che si vuole quasi sempre.
    if (ingresso) { ingresso.focus(); ingresso.select(); }
    else if (primo) primo.focus();

    if (ingresso) ingresso.addEventListener('keydown', evento => {
      if (evento.key === 'Enter') { evento.preventDefault(); primo.click(); }
    });

    function chiudi(valore) {
      velo.remove();
      document.removeEventListener('keydown', tasto);
      risolvi(valore === undefined ? null : valore);
    }
    function tasto(evento) { if (evento.key === 'Escape') chiudi(null); }
    document.addEventListener('keydown', tasto);
    velo.addEventListener('click', evento => { if (evento.target === velo) chiudi(null); });
  });
}

/** Un nome che viene dai dati, messo dentro una domanda che è HTML. */
function testoConNome(nome) {
  return String(nome).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sì o no. Il no è sempre l'ultima riga, ed è anche Esc e il tocco fuori. */
function conferma(titolo, testo, { ok = tr('Procedi'), pericolo = false } = {}) {
  return finestra({
    titolo, testo,
    azioni: [
      { testo: ok, valore: true, classe: pericolo ? 'pericolo' : 'primary' },
      { testo: tr('Annulla'), valore: false },
    ],
  }).then(scelto => scelto === true);
}

/** Una cosa da sapere e basta: un bottone solo, che non decide niente. */
function avvisa(titolo, testo) {
  return finestra({ titolo, testo,
                    azioni: [{ testo: tr('Ho capito'), valore: true, classe: 'primary' }] });
}

/** Qualcosa da scrivere. Torna il testo, o `null` se non se n'è fatto niente. */
function chiediTesto(titolo, testo, valore = '', { ok = tr('Salva'), invito } = {}) {
  return finestra({
    titolo, testo,
    campo: { valore, invito },
    azioni: [
      { testo: ok, classe: 'primary', vuoleTesto: true },
      { testo: tr('Annulla'), valore: null },
    ],
  });
}

/**
 * Il parametro che **sceglie fra cose** invece di dosare — il tipo di
 * riverbero è l'unico che conosciamo. Serve saperlo in due posti, perché
 * quando il modello è uno solo è questo che finisce nella tendina grande.
 */
function paramScelta(effetto) {
  return manopoleVere(effetto)
    .find(p => SparkEffetti.posizioni(effetto.name, p.index) > 0) || null;
}

/** I modelli possibili in questa posizione della catena, corrente compreso. */
function candidatiModello(effetto, posizione) {
  const candidati = (SparkEffetti.MODELLI[posizione] || []).slice();
  if (!candidati.includes(effetto.name)) candidati.unshift(effetto.name);
  return candidati;
}

function intestazioneBlocco(effetto, posizione) {
  const candidati = candidatiModello(effetto, posizione);
  // **Senza ampli i modelli mai visti restano nell'elenco, ma spenti.** Prima
  // li toglievo, ed era sbagliato: la tendina passava da quaranta voci a sette
  // e sembrava che il catalogo fosse sparito. Spenti si vedono, si legge a cosa
  // sono ispirati, e non si possono scegliere — che è tutto quello che serviva.
  // La ragione per cui non si possono scegliere non è cambiata: di un modello
  // mai visto non sappiamo quante manopole abbia, e senza ampli non c'è nessuno
  // a cui chiederlo. Di uno visto sì, perché sta in un preset uscito
  // dall'ampli — vedi `campioneModello`.
  // **Senza ampli si sceglie qualunque modello**, e non è un cedimento: è che
  // adesso sappiamo com'è fatto ogni blocco. La regola non è mai stata «solo
  // quelli già visti», era «solo quelli di cui sappiamo quante manopole hanno»
  // — e da quando il catalogo è verificato contro l'app ufficiale, la tabella
  // lo dice per **tutti e settantotto** i modelli cambiabili.
  //
  // Che il numero della tabella sia quello vero l'ha detto la misura, il 26
  // agosto 2026: nei ventiquattro blocchi dei preset usciti dall'ampli in
  // `captures/`, ventidue modelli diversi, il numero di parametri coincide
  // sempre con il numero di nomi. Le due eccezioni — noise gate e riverbero,
  // che hanno un parametro in più, l'acceso/spento — sono proprio i due blocchi
  // con **un modello solo**, che quindi non si cambiano mai.
  const spento = () => false;

  // **Dove non c'è niente da scegliere, la tendina non c'è.** Il noise gate ha
  // un modello e basta; il riverbero pure, e offline può restare a voce sola
  // anche un blocco qualsiasi, se la libreria non ha mai visto altro. Una
  // tendina con una riga invita ad aprirla per scoprire che non c'è niente
  // dentro. Al suo posto, se l'effetto sceglie fra **tipi** — il riverbero —
  // ci va quella scelta lì, che è quella vera di quel blocco (chiesto
  // dall'utente il 26 agosto 2026: stava in una casella in fondo alle manopole
  // e non la trovava nessuno).
  if (candidati.length < 2) {
    const param = paramScelta(effetto);
    return param ? intestazioneScelta(effetto, param)
                 : intestazioneFissa(effetto);
  }

  // **Non è un `<select>`**, e la ragione è il telefono: lì il menu di sistema
  // ignora i nostri caratteri, e con «Silver 120 — Roland JC120» manda ogni
  // voce a capo su due righe — trentanove ampli così sono uno schermo e mezzo
  // da scorrere. Un elenco disegnato da noi tiene ogni ampli su **una riga**.
  const scelta = document.createElement('button');
  scelta.type = 'button';
  scelta.className = 'nome-effetto';
  scelta.title = tr('tocca per mettere un altro modello in questa posizione');
  const voci = [];

  // I modelli **usciti da questo ampli** vengono per primi: esistono di sicuro.
  // Gli altri arrivano dal catalogo di Soundshed e non sono verificati —
  // chiederne uno che l'ampli non ha vuol dire fargli ricostruire un blocco DSP
  // inesistente, ed è così che `TrebleBooster` lo mandava in palla.
  //
  // La distinzione resta, ma **senza scritte**: una riga separatrice fra i due
  // mucchi. Le intestazioni dicevano la stessa cosa occupando due righe di
  // parole in un elenco che si sfoglia col pollice.
  const metti = (modello, gruppo) => {
    // Accanto al nome di fantasia, l'apparecchio vero: «Silver 120» non dice
    // niente, «Roland JC120» sì, e chi cerca un suono pensa a quello.
    const reale = SparkEffetti.ampliReale(modello);
    voci.push({
      valore: modello,
      testo: SparkEffetti.nome(modello) + (reale ? ' — ' + reale : ''),
      gruppo: gruppo || null,
      spento: spento(modello),
      title: spento(modello)
        ? tr('{0} — serve l\'ampli: la tua libreria non l\'ha mai visto, ' +
          'quindi non sappiamo quante manopole abbia', modello)
        : modello,
    });
  };

  // **Gli amplificatori si dividono per famiglia** — clean, crunch, metal… —
  // come nell'elenco ufficiale di Positive Grid: sono quaranta, e una fila
  // unica non la sfoglia nessuno. Gli altri effetti restano una fila sola,
  // che sono pochi.
  const raggruppa = candidati.some(m => SparkEffetti.ampliGruppo(m));
  if (raggruppa) {
    for (const gruppo of SparkEffetti.GRUPPI_AMPLI) {
      candidati.filter(m => SparkEffetti.ampliGruppo(m) === gruppo)
               .forEach(m => metti(m, gruppo));
    }
    // Chi non sta nell'elenco ufficiale finisce qui, ed è un avvertimento più
    // preciso di quello di prima: di questi non sappiamo nemmeno se l'ampli li
    // abbia. Dal 26 agosto 2026 il gruppo è vuoto — l'utente ha fotografato
    // l'elenco vero e gli otto di troppo sono stati tolti — ma il codice resta
    // per il giorno che al catalogo si aggiunge un nome nuovo.
    candidati.filter(m => !SparkEffetti.ampliGruppo(m))
             .forEach(m => metti(m, tr('fuori dall\'elenco Positive Grid')));
  } else {
    // **L'ordine è quello dell'app ufficiale**, com'è scritto in `MODELLI`, con
    // una sola eccezione: **gli Hendrix vanno in fondo**, sotto la loro
    // intestazione. Chiesto dall'utente il 26 agosto 2026, e per una ragione
    // che vale più dell'ordine — sono l'unico contenuto a pagamento, l'unico
    // che può entrare in catena e restare muto, e sparsi in mezzo agli altri
    // sembravano effetti come tutti gli altri. Fino a ieri i modelli mai visti
    // finivano in fondo sotto «dal catalogo, da provare», che aveva senso
    // finché il catalogo era incerto: adesso è verificato tutto contro l'app.
    candidati.filter(m => !SparkEffetti.eHendrix(m)).forEach(m => metti(m));
    candidati.filter(m => SparkEffetti.eHendrix(m))
             .forEach(m => metti(m, SparkEffetti.GRUPPO_HENDRIX));
  }
  // L'elenco non è per forza completo: l'ampli conosce modelli che nessuna
  // fonte elenca, e senza questa via non ci si arriverebbe mai. Senza ampli
  // però non c'è: un nome scritto a mano non si può né verificare né misurare.
  // Qui c'era «altro modello, a mano…», per i modelli che nessuna fonte
  // elenca. Tolta il 26 agosto 2026 su richiesta: da quando il catalogo è
  // stato verificato contro l'app ufficiale, l'elenco è quello completo, e una
  // voce che chiede di scrivere un nome a mano non serve più a niente.

  const reale = SparkEffetti.ampliReale(effetto.name);
  scelta.textContent = SparkEffetti.nome(effetto.name) + (reale ? ' — ' + reale : '');

  // Senza ampli il modello **si cambia dal 26 agosto 2026**, chiesto
  // dall'utente. Prima era spento, e la ragione era buona: cambiarlo vuol dire
  // fargli ricostruire un blocco DSP e poi rileggere quanti parametri ha
  // quello nuovo, e inventarne il numero è come costruire a tavolino il preset
  // che pianta l'ampli. La via d'uscita non è tirare a indovinare: è **copiare
  // un blocco vero**, preso da un preset della libreria che quel modello ce
  // l'ha già. Per questo qui offline restano solo i modelli visti.
  if (inModifica.offline) {
    scelta.title = tr('senza ampli si può mettere solo un modello che la libreria ' +
                   'ha già visto: di quello sappiamo quante manopole ha');
  }

  scelta.addEventListener('click', () => {
    apriElenco(Spark.CATENA[posizione], voci, effetto.name,
               valore => cambiaModello(posizione, valore));
  });

  const riga = document.createElement('div');
  riga.className = 'riga-modello';
  riga.appendChild(scelta);

  // Scelto un Hendrix, la ragione per cui non si sente resta scritta finché
  // quel blocco è quello: sceglierlo e sentirlo muto sono due momenti diversi,
  // e in mezzo può passare tutto il tempo che serve a dimenticarsene.
  if (SparkEffetti.eHendrix(effetto.name)) {
    const nota = document.createElement('div');
    nota.className = 'nota-jh';
    const bollo = document.createElement('span');
    bollo.className = 'jh';
    const pallino = document.createElement('span');
    pallino.className = 'pallino';
    bollo.append(pallino, 'JH');
    const testo = document.createElement('span');
    testo.textContent = tr('non si sente finché l\'app ufficiale non lo sblocca');
    nota.append(bollo, testo);
    riga.appendChild(nota);
  }

  riga.appendChild(interruttoreDi(effetto));
  return riga;
}

/** L'acceso/spento del blocco, sotto il titolo e a tutta larghezza. */
function interruttoreDi(effetto) {
  const interruttore = document.createElement('button');
  interruttore.type = 'button';
  interruttore.className = 'interruttore' + (effetto.enabled ? ' acceso' : '');
  interruttore.textContent = effetto.enabled ? tr('acceso') : tr('spento');
  interruttore.addEventListener('click', async () => {
    effetto.enabled = !effetto.enabled;
    segnaModificato();
    if (!inModifica.offline) {
      try {
        await spark.send(Spark.commands.effectOnOff(effetto.name, effetto.enabled));
      } catch (err) {
        logLine(tr('errore: {0}', err.message), true);
      }
    }
    // L'ampli scrive lui l'acceso/spento anche nel parametro che lo rispecchia
    // (misurato: spegnendo il blocco quel parametro va a 0). Se non lo
    // seguiamo qui, lo schermo resta a dire il contrario finché non si rilegge.
    if (SparkEffetti.nomeExtra(effetto.name)) {
      effetto.params.forEach(p => {
        if (SparkEffetti.extra(effetto.name, p.index)) p.value = effetto.enabled ? 1 : 0;
      });
    }
    disegnaCatena();
  });
  return interruttore;
}

/**
 * Il titolo di un blocco che non ha niente da scegliere: il noise gate. Ha lo
 * stesso posto e la stessa taglia della tendina, così la catena non balla
 * passando da un blocco all'altro — solo, non si apre.
 */
function intestazioneFissa(effetto) {
  const riga = document.createElement('div');
  riga.className = 'riga-modello';
  const titolo = document.createElement('div');
  titolo.className = 'nome-effetto fisso';
  titolo.textContent = SparkEffetti.nome(effetto.name);
  titolo.title = effetto.name;
  riga.append(titolo, interruttoreDi(effetto));
  return riga;
}

/**
 * Il titolo di un blocco il cui modello è unico ma che sceglie fra **tipi** —
 * il riverbero. La tendina grande governa quel parametro invece del modello:
 * per chi suona «Plate Rich» *è* il nome di quel blocco, e cercarlo in una
 * casella in fondo alle manopole era il posto sbagliato.
 */
function intestazioneScelta(effetto, param) {
  const riga = document.createElement('div');
  riga.className = 'riga-modello';

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'nome-effetto';
  menu.title = tr('tocca per cambiare tipo');

  const quante = SparkEffetti.posizioni(effetto.name, param.index);
  const nomi = SparkEffetti.nomiPosizioni(effetto.name, param.index);
  const voci = [];
  for (let n = 0; n < quante; n++) {
    voci.push({ valore: String(SparkEffetti.valorePosizione(n)),
                testo: nomi ? nomi[n] : tr('posizione {0}', n + 1) });
  }
  const dove = SparkEffetti.posizioneDi(param.value, quante);
  // L'ampli riporta un valore che non è nessuna delle posizioni note: si
  // aggiunge invece di spostarlo di nascosto su quella più vicina.
  if (dove === -1) {
    voci.push({ valore: String(param.value),
                testo: tr('valore dell\'ampli ({0})', mostraValore(param.value)) });
  }
  const ora = String(dove === -1 ? param.value : SparkEffetti.valorePosizione(dove));
  menu.textContent = (voci.find(v => v.valore === ora) || {}).testo ||
                     SparkEffetti.nome(effetto.name);

  menu.addEventListener('click', () => {
    apriElenco(Spark.CATENA[Spark.CATENA.length - 1], voci, ora, valore => {
      param.value = Number(valore);
      aggiornaBarrette();
      mandaParametro(effetto.name, param.index, param.value);
      disegnaCatena();
    });
  });

  riga.append(menu, interruttoreDi(effetto));
  return riga;
}

/* ------------------------------------------------------------------
   Le manopole
   ------------------------------------------------------------------ */

/**
 * Le manopole si dispongono a piramide, non a griglia piena: l'ultima riga sta
 * in centro. Quattro fanno 2 e 2, non 3 e 1; tre fanno 2 e 1; cinque fanno 3 e
 * 2. È come stanno i comandi su un pannello vero, e una manopola spaiata in
 * fondo a sinistra si vede subito che è un avanzo di riempimento.
 *
 * Una riga sola fino a due; da tre in su si taglia a metà, con la riga più
 * piena sopra. Oltre le quattro per riga si va a tre righe, perché più di
 * quattro pomelli affiancati su un telefono diventano bottoni da spillo.
 */
function righeDi(quante) {
  if (quante <= 2) return [quante];
  let righe = 2;
  while (Math.ceil(quante / righe) > 4) righe++;
  const fuori = [];
  let restano = quante;
  for (let r = righe; r > 0; r--) {
    const quanti = Math.ceil(restano / r);
    fuori.push(quanti);
    restano -= quanti;
  }
  return fuori;
}

function griglia(effetto, posizione) {
  let vere = manopoleVere(effetto);

  // **Gli equalizzatori si regolano a cursori**, tutti in fila come sul pedale
  // vero: sei bande più il livello, e la posizione delle tacche disegna la
  // curva. Sette pomelli invece non si leggono come una curva, si leggono uno
  // per uno (chiesto dall'utente il 26 agosto 2026).
  if (SparkEffetti.aCursori(effetto.name)) {
    const box = document.createElement('div');
    box.className = 'pomelli cursori';
    const riga = document.createElement('div');
    riga.className = 'riga-cursori';
    vere.forEach(param => riga.appendChild(cursore(effetto, param)));
    box.appendChild(riga);
    return box;
  }
  // Il parametro finito nel titolo non si ripete qui sotto: quando il modello
  // è unico, la tendina grande è già quella dei tipi.
  if (candidatiModello(effetto, posizione).length < 2) {
    const suTitolo = paramScelta(effetto);
    if (suTitolo) vere = vere.filter(p => p !== suTitolo);
  }
  const frontale = èFrontale(effetto, vere);
  // Gain, Bass, Middle, Treble, Master: l'ordine del frontale, non quello
  // degli indici.
  const ordine = frontale ? [0, 3, 2, 1, 4] : vere.map((_, i) => i);

  const box = document.createElement('div');
  box.className = 'pomelli';
  let da = 0;
  for (const quanti of righeDi(ordine.length)) {
    const riga = document.createElement('div');
    riga.className = 'riga-pomelli';
    ordine.slice(da, da + quanti).forEach(i => riga.appendChild(cella(effetto, vere[i])));
    box.appendChild(riga);
    da += quanti;
  }
  return box;
}

function cella(effetto, param) {
  // Certi parametri scelgono fra cose invece di scorrere — il tipo di
  // riverbero è l'unico che conosciamo. Con un pomello azzeccare la posizione
  // sarebbe un terno al lotto, quindi lì ci va un elenco.
  if (SparkEffetti.interruttore(effetto.name, param.index)) return cellaInterruttore(effetto, param);
  const quante = SparkEffetti.posizioni(effetto.name, param.index);
  return quante ? cellaScelta(effetto, param, quante) : pomello(effetto, param);
}

/**
 * Un parametro che è un acceso/spento: il «BPM» dei delay e del Tremolator,
 * che segue il tempo o no. Nell'app ufficiale è un interruttore e nei preset
 * veri vale solo 0 o 1; un pomello da 0 a 10 faceva credere a valori in mezzo
 * che non esistono (l'utente, 7 ottobre 2026). Acceso manda 1, spento 0; un
 * valore letto si considera acceso da 0,5 in su, come gli altri interruttori
 * dell'ampli.
 */
function cellaInterruttore(effetto, param) {
  // Una levetta della taglia di un pomello, nella stessa fila (l'utente, 7
  // ottobre 2026: il tasto di prima «fa cagare»): una pista verticale col
  // pallino in alto e illuminato quando segue il tempo, in basso e grigio
  // quando no. Sotto, come ai pomelli, il nome e ON/OFF al posto del numero.
  const box = document.createElement('div');
  box.className = 'pomello leva';
  box.setAttribute('role', 'switch');
  box.tabIndex = 0;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  const pista = document.createElementNS(ns, 'rect');
  pista.setAttribute('class', 'pista-leva');
  pista.setAttribute('x', 33); pista.setAttribute('y', 8);
  pista.setAttribute('width', 34); pista.setAttribute('height', 84);
  pista.setAttribute('rx', 17);
  const pallino = document.createElementNS(ns, 'circle');
  pallino.setAttribute('class', 'pallino');
  pallino.setAttribute('cx', 50); pallino.setAttribute('r', 12);
  svg.append(pista, pallino);

  const valore = document.createElement('div');
  valore.className = 'val';
  box.append(svg, etichettaDi(effetto, param, manopoleVere(effetto).length), valore);

  const disegna = () => {
    const acceso = param.value >= 0.5;
    box.classList.toggle('acceso', acceso);
    box.setAttribute('aria-checked', acceso ? 'true' : 'false');
    pallino.setAttribute('cy', acceso ? 29 : 71);
    valore.textContent = acceso ? 'ON' : 'OFF';
  };
  const scatta = () => {
    param.value = param.value >= 0.5 ? 0 : 1;
    disegna();
    aggiornaBarrette();
    mandaParametro(effetto.name, param.index, param.value);
  };
  box.addEventListener('click', evento => {
    if (evento.target.classList.contains('nome')) return;   // lì si battezza
    scatta();
  });
  box.addEventListener('keydown', evento => {
    if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); scatta(); }
  });
  disegna();
  return box;
}

/**
 * L'etichetta di una manopola, coi suoi tre stati che si distinguono a vista:
 * il nome che hai messo tu vince sempre, quello della tabella è una proposta
 * ancora da verificare a orecchio, e il numero è la verità quando non
 * sappiamo niente. Si tocca per battezzarla, e vale per il modello — quindi
 * una volta sola, in ogni preset che lo usa.
 */
function etichettaDi(effetto, param, quante) {
  const dato     = (nomiParam[effetto.name] || {})[param.index];
  const proposto = SparkEffetti.manopola(effetto.name, param.index, quante);

  const nome = document.createElement('div');
  nome.className = 'nome' + (dato ? '' : proposto ? ' daTabella' : ' senzaNome');
  nome.textContent = dato || proposto || (param.index + 1);
  nome.title = dato
    ? tr`«${dato}», nome tuo — tocca per cambiarlo`
    : proposto
      ? tr`«${proposto}» arriva dalla tabella: gira e senti se torna. Tocca per correggerlo.`
      : tr('tocca per dargli un nome: varrà per ogni preset che usa {0}', effetto.name);
  nome.addEventListener('click', async evento => {
    evento.stopPropagation();
    // Anche qui la scorciatoia «campo vuoto = rimetti quello di prima» era
    // una regola scritta fra parentesi che nessuno legge: adesso è un bottone.
    const azioni = [{ testo: tr('Salva il nome'), classe: 'primary', vuoleTesto: true }];
    if (dato) azioni.push({ testo: tr('Rimetti quello di partenza'), valore: '' });
    azioni.push({ testo: tr('Annulla'), valore: null });

    const scelto = await finestra({
      titolo: tr`manopola ${param.index + 1} di ${SparkEffetti.nome(effetto.name)}`,
      testo: tr('Il nome vale per <strong>ogni preset che usa {0}</strong>, non solo ' +
             'per questo. Gira e senti cosa fa, poi chiamala come la chiami tu.',
             testoConNome(SparkEffetti.nome(effetto.name))),
      campo: { valore: dato || proposto || '', invito: tr('tono, mix, tempo…') },
      azioni,
    });
    if (scelto === null) return;
    await store.setParamName(effetto.name, param.index, scelto);
    nomiParam = await store.getParamNames();
    disegnaCatena();
  });
  return nome;
}

/**
 * Il pomello. Si gira trascinando **in verticale**, non in cerchio: col dito
 * il cerchio è un terno al lotto, e su un pedale vero nessuno gira guardando
 * il polso. Trecento pixel di corsa da zero a uno, che è più fine di un
 * cursore largo quanto lo schermo.
 *
 * L'alone è il disegno stesso sfocato due volte, e sta solo sull'arco e sulla
 * tacca: alonando anche il corpo scuro verrebbe una macchia. L'SVG deve
 * lasciarlo uscire (`overflow:visible`), o il bagliore viene tagliato di netto
 * e attorno a ogni manopola compare un quadrato.
 */
const RAGGIO = 34, GIRO = 2 * Math.PI * RAGGIO * 0.75;   // 270 gradi di corsa
const CORSA_PX = 300;                                    // pixel da zero a uno

function pomello(effetto, param) {
  const box = document.createElement('div');
  box.className = 'pomello';

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');

  const cerchio = (raggio, classe) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', raggio);
    if (classe) c.setAttribute('class', classe);
    return c;
  };

  const guida = cerchio(RAGGIO, 'guida');
  guida.setAttribute('fill', 'none');
  guida.setAttribute('stroke-dasharray', `${GIRO} 999`);

  const arco = cerchio(RAGGIO, 'arco');
  arco.setAttribute('fill', 'none');

  const corpo = cerchio(24, 'corpo');

  const tacca = document.createElementNS(ns, 'line');
  tacca.setAttribute('class', 'tacca');
  tacca.setAttribute('x1', 50); tacca.setAttribute('y1', 32);
  tacca.setAttribute('x2', 50); tacca.setAttribute('y2', 46);

  svg.append(guida, arco, corpo, tacca);

  const valore = document.createElement('div');
  valore.className = 'val';
  box.append(svg, etichettaDi(effetto, param, manopoleVere(effetto).length), valore);

  /* La tacca deve stare sulla punta dell'arco, e le due cose partono da posti
     diversi: l'arco è un cerchio, che in SVG comincia a ore 3 e il CSS ruota
     di 135° per farlo partire da ore 7:30; la tacca invece è disegnata verso
     l'alto, quindi il suo zero è ore 12. Da lì i **−135°**: la corsa va da ore
     7:30 a ore 4:30, con la zona morta in basso, come su un ampli vero. */
  const disegna = () => {
    arco.setAttribute('stroke-dasharray', `${GIRO * param.value} 999`);
    tacca.setAttribute('transform', `rotate(${-135 + param.value * 270} 50 50)`);
    valore.textContent = mostraValore(param.value);
  };
  disegna();

  let partenzaY = null, partenzaV = 0;
  box.addEventListener('pointerdown', evento => {
    if (evento.target.classList.contains('nome')) return;   // lì si battezza
    partenzaY = evento.clientY;
    partenzaV = param.value;
    box.setPointerCapture(evento.pointerId);
    mostraBolla(box, param.value);
  });
  box.addEventListener('pointermove', evento => {
    if (partenzaY === null) return;
    const passo = (partenzaY - evento.clientY) / CORSA_PX;
    param.value = Math.min(1, Math.max(0, partenzaV + passo));
    disegna();
    mostraBolla(box, param.value);
    aggiornaBarrette();
    mandaParametro(effetto.name, param.index, param.value);
  });
  const fine = () => { partenzaY = null; nascondiBolla(); };
  box.addEventListener('pointerup', fine);
  box.addEventListener('pointercancel', fine);
  return box;
}

/**
 * Un cursore verticale, per gli equalizzatori.
 *
 * Si trascina come un pomello — stessa corsa in pixel, così il dito impara un
 * gesto solo — ma qui la posizione della tacca **è** il valore, e sette tacche
 * in fila disegnano la curva senza doverle leggere una per una. È come sono
 * fatti i due pedali EQ nell'app ufficiale.
 */
function cursore(effetto, param) {
  const box = document.createElement('div');
  box.className = 'cursore';

  const pista = document.createElement('div');
  pista.className = 'pista';
  const tacca = document.createElement('div');
  tacca.className = 'tacca-cursore';
  const riempi = document.createElement('div');
  riempi.className = 'riempi';
  pista.append(riempi, tacca);

  const valore = document.createElement('div');
  valore.className = 'val';
  box.append(pista, etichettaDi(effetto, param, manopoleVere(effetto).length), valore);

  const disegna = () => {
    // Da sotto verso l'alto: zero in fondo, dieci in cima, come uno slider vero.
    tacca.style.bottom = `calc(${param.value * 100}% - 5px)`;
    riempi.style.height = `${param.value * 100}%`;
    valore.textContent = mostraValore(param.value);
  };
  disegna();

  let partenzaY = null, partenzaV = 0;
  box.addEventListener('pointerdown', evento => {
    if (evento.target.classList.contains('nome')) return;   // lì si battezza
    partenzaY = evento.clientY;
    partenzaV = param.value;
    box.setPointerCapture(evento.pointerId);
    mostraBolla(box, param.value);
  });
  box.addEventListener('pointermove', evento => {
    if (partenzaY === null) return;
    const passo = (partenzaY - evento.clientY) / CORSA_PX;
    param.value = Math.min(1, Math.max(0, partenzaV + passo));
    disegna();
    mostraBolla(box, param.value);
    aggiornaBarrette();
    mandaParametro(effetto.name, param.index, param.value);
  });
  const fine = () => { partenzaY = null; nascondiBolla(); };
  box.addEventListener('pointerup', fine);
  box.addEventListener('pointercancel', fine);
  return box;
}

/** Il tipo di riverbero e compagnia: un elenco in mezzo ai pomelli. */
/** Le posizioni di un parametro a scelta, e quale è quella di adesso. */
function vociScelta(effetto, param) {
  const quante = SparkEffetti.posizioni(effetto.name, param.index);
  const nomi = SparkEffetti.nomiPosizioni(effetto.name, param.index);
  const voci = [];
  for (let n = 0; n < quante; n++) {
    voci.push({ valore: SparkEffetti.valorePosizione(n),
                testo: nomi ? nomi[n] : tr('posizione {0}', n + 1),
                title: tr`posizione ${n + 1}` });
  }
  const dove = SparkEffetti.posizioneDi(param.value, quante);
  if (dove === -1) {
    // L'ampli riporta un valore che non è nessuna delle posizioni note: si
    // aggiunge invece di spostarlo di nascosto su quella più vicina.
    voci.push({ valore: param.value,
                testo: tr('valore dell\'ampli ({0})', mostraValore(param.value)) });
    return { voci, valore: param.value };
  }
  return { voci, valore: SparkEffetti.valorePosizione(dove) };
}

function cellaScelta(effetto, param, quante) {
  const box = document.createElement('div');
  box.className = 'pomello scelta';

  const { voci, valore } = vociScelta(effetto, param);
  const menu = tendinaFinta(SparkEffetti.nome(effetto.name), voci, valore, scelto => {
    param.value = scelto;
    aggiornaBarrette();
    mandaParametro(effetto.name, param.index, param.value);
  });

  box.append(menu, etichettaDi(effetto, param, manopoleVere(effetto).length));
  return box;
}

/**
 * Le barrettine del tassello a fuoco seguono le manopole mentre si girano.
 * Ridisegnare tutta la catena a ogni pixel rifarebbe il DOM sotto il dito.
 */
function aggiornaBarrette() {
  const barre = inModifica && inModifica.barreAFuoco;
  if (!barre || !barre.isConnected) return;
  const valori = manopoleVere(inModifica.effetti[inModifica.scelto]).slice(0, 5);
  barre.querySelectorAll('i').forEach((barra, i) => {
    if (valori[i]) barra.style.height = Math.max(2, Math.round(valori[i].value * 16)) + 'px';
  });
}

/** Il valore grande mentre si trascina: sotto il dito il numerino non si vede. */
function mostraBolla(dentro, valore) {
  const bolla = $('bolla');
  const r = dentro.getBoundingClientRect();
  bolla.textContent = mostraValore(valore);
  bolla.hidden = false;
  bolla.style.left = (r.left + r.width / 2) + 'px';
  bolla.style.top  = r.top + 'px';
}
function nascondiBolla() { $('bolla').hidden = true; }

/**
 * I parametri che manopole non sono restano in fondo, in un cassetto: non si
 * nascondono — si possono muovere — ma stanno da parte, così le manopole vere
 * si contano a colpo d'occhio e tornano con quelle dell'app ufficiale.
 */
function cassettoExtra(effetto) {
  const fuori = effetto.params.filter(p => SparkEffetti.extra(effetto.name, p.index));
  if (!fuori.length) return null;

  const cassetto = document.createElement('details');
  cassetto.className = 'extra';
  const titolo = document.createElement('summary');
  const cosaSia = SparkEffetti.nomeExtra(effetto.name);
  titolo.textContent = fuori.length === 1
    ? (cosaSia ? tr('1 parametro che non è una manopola: {0}', cosaSia.toLowerCase())
               : tr('1 parametro che non è una manopola'))
    : tr`${fuori.length} parametri che non sono manopole`;
  const quante = SparkEffetti.TABELLA[effetto.name] &&
                 SparkEffetti.TABELLA[effetto.name].quante;
  if (quante) {
    titolo.title = tr('{0} ha {1} manopole, ma su ' +
      'certi preset l\'ampli manda qualche parametro in più. Restano qui, e si ' +
      'possono muovere.', SparkEffetti.nome(effetto.name), quante);
  }
  cassetto.appendChild(titolo);
  fuori.forEach(param => cassetto.appendChild(rigaExtra(effetto, param)));
  return cassetto;
}

/**
 * Una riga del cassetto: il parametro in più di cui sappiamo il significato
 * non è un cursore. Sul noise gate è l'acceso/spento del blocco: un cursore lì
 * lo spegnerebbe di nascosto mentre l'interruttore in cima continua a dire
 * «acceso». Si mostra e basta — si cambia dall'interruttore, che è esattamente
 * quello che fa l'app ufficiale. Gli altri, di cui non sappiamo niente,
 * restano muovibili.
 */
function rigaExtra(effetto, param) {
  const riga = document.createElement('div');
  riga.className = 'manopola';

  const etichetta = document.createElement('div');
  etichetta.className = 'etichetta';
  const nome = etichettaDi(effetto, param, manopoleVere(effetto).length);
  nome.classList.add('numero');
  const valore = document.createElement('span');
  valore.className = 'valore';
  valore.textContent = mostraValore(param.value);
  etichetta.append(nome, valore);
  riga.appendChild(etichetta);

  const nomeExtra = SparkEffetti.nomeExtra(effetto.name);
  if (nomeExtra) {
    nome.classList.add('daTabella');
    nome.textContent = nomeExtra;
    nome.title = tr('«{0}», misurato sull\'ampli: sotto la metà il blocco è ' +
                 'spento, sopra è acceso. È l\'interruttore qui sopra, visto da ' +
                 'un\'altra parte.', nomeExtra);
    const spiega = document.createElement('div');
    spiega.className = 'spiega-extra';
    spiega.textContent = param.value >= 0.5
      ? tr('acceso — si cambia dall\'interruttore in cima al blocco')
      : tr('spento — si cambia dall\'interruttore in cima al blocco');

    riga.appendChild(spiega);
    return riga;
  }

  const cursore = document.createElement('input');
  cursore.type = 'range';
  cursore.className = 'cursore';
  cursore.min = 0; cursore.max = 1; cursore.step = 0.01;
  cursore.value = param.value;
  cursore.style.setProperty('--p', param.value);
  const muovi = () => {
    param.value = Number(cursore.value);
    cursore.style.setProperty('--p', param.value);
    valore.textContent = mostraValore(param.value);
    mandaParametro(effetto.name, param.index, param.value);
  };
  cursore.addEventListener('input', muovi);
  cursore.addEventListener('change', muovi);
  riga.appendChild(cursore);
  return riga;
}

/* ---- cambio del modello in una posizione della catena ---------------
   Si sceglie dalla tendina che è il nome stesso del blocco: prima c'era un
   pulsante «cambia» che apriva un pannello a parte con la ricerca, e nessuno
   collegava quel pannello al nome che stava leggendo. La ricerca serviva con
   quaranta modelli di ampli, ma una tendina nativa si sfoglia con il pollice
   e sul telefono si apre a tutto schermo: fa lo stesso lavoro senza portare
   fuori da dove si sta lavorando. */

/**
 * `0x0106` scambia il modello di un blocco. Dopo il cambio **i parametri sono
 * altri**: cambiano di numero e di significato, e i valori di prima non
 * vogliono dire più niente. Quindi si rilegge la catena dall'ampli invece di
 * indovinare, com'è la regola di questo editor.
 *
 * **Il nome vecchio si richiede all'ampli anche prima di mandare il comando**,
 * e non si prende da quello che c'è scritto sullo schermo. Il comando dice
 * «al posto di questo mettimi quello», quindi se il primo nome non è davvero
 * lì l'ampli lo ignora — in silenzio, come sempre. E lo schermo può essere
 * rimasto indietro per più di un motivo: una rilettura andata a vuoto, il
 * suono cambiato dall'app ufficiale, una manopola girata sull'ampli. Bastava
 * una di queste una volta sola e da lì in poi ogni cambio falliva, sempre.
 */
async function cambiaModello(posizione, nuovo) {
  // «Non dovrebbe mai capitare», e proprio per questo se capita va detto:
  // tornare indietro in silenzio lascia la tendina sul nome nuovo mentre
  // l'ampli ha ancora il vecchio, che è la bugia peggiore di tutte.
  if (!inModifica) { logLine(tr('l\'editor non è più aperto: riapri «Regola».')); return; }

  // L'editor aperto senza ampli resta senza ampli anche se nel frattempo la
  // connessione arriva: quello che l'ampli suona adesso è un altro suono, e
  // rileggerlo sostituirebbe di soppiatto la catena su cui si sta lavorando.
  // Senza ampli il cambio si fa **copiando un blocco vero**: nome, numero di
  // parametri e valori vengono da un preset della libreria che quel modello
  // ce l'ha già, quindi il blocco che ne esce è uno che l'ampli ha davvero
  // prodotto. Non si inventa niente, ed è la stessa regola con cui si
  // costruisce un preset nuovo. Resta acceso o spento com'era: quello è una
  // scelta dell'utente, non una proprietà del modello.
  if (inModifica.offline) {
    const blocco = inModifica.effetti[posizione];
    if (!blocco) { logLine(tr('quel blocco non esiste nella catena.'), true); return; }
    if (nuovo === blocco.name) { logLine(tr`${nuovo} c'era già.`); return; }

    // Un ampli si mette anche se la libreria non l'ha mai visto: hanno tutti e
    // trentanove le stesse cinque manopole (misurato, vedi `intestazioneBlocco`),
    // quindi il blocco resta com'è e cambia solo il nome — e i valori vogliono
    // dire la stessa cosa da un ampli all'altro.
    if (SparkEffetti.ampliGruppo(nuovo) && blocco.params.length === 5) {
      const vecchio = blocco.name;
      blocco.name = nuovo;
      segnaModificato();
      disegnaCatena();
      logLine(tr('{0} → {1}, con le ' +
              'stesse manopole. Senza ampli non si sente: si salva in libreria ' +
              'e si prova alla prossima connessione.', SparkEffetti.nome(vecchio), SparkEffetti.nome(nuovo)));
      return;
    }

    const vecchio = blocco.name;

    // **Prima si copia, poi si costruisce.** Se quel modello sta già in un
    // preset della libreria si prendono numero di parametri *e* valori da lì:
    // è un blocco che l'ampli ha davvero prodotto, quindi non c'è niente da
    // indovinare. Solo se non c'è si costruisce dalla tabella, che dice quante
    // manopole ha ogni modello — verificato sui preset veri, vedi
    // `intestazioneBlocco` — e i valori partono da metà corsa.
    const campione = campioneModello(nuovo);
    if (campione) {
      blocco.name = nuovo;
      segnaModificato();
      blocco.params = campione.params;
      disegnaCatena();
      logLine(tr('{0} → {1}, con le ' +
              'manopole che aveva in «{2}». Senza ampli non si sente: ' +
              'si salva in libreria e si prova alla prossima connessione.', SparkEffetti.nome(vecchio), SparkEffetti.nome(nuovo), campione.da));
      return;
    }

    const quante = SparkEffetti.quanteManopole(nuovo);
    if (!quante) {
      logLine(tr('senza ampli non posso mettere {0}: non so ' +
              'quante manopole abbia. Connetti l\'ampli e riapri «Regola».', SparkEffetti.nome(nuovo)), true);
      disegnaCatena();                  // la tendina torna a dire la verità
      return;
    }
    blocco.name = nuovo;
    segnaModificato();
    blocco.params = Array.from({ length: quante },
                               (_, i) => ({ index: i, value: 0.5 }));
    disegnaCatena();
    logLine(tr('{0} → {1}, con le ' +
            '{2} manopole a metà corsa: la tua libreria non ha nessun preset ' +
            'con quel modello da cui copiarle. Senza ampli non si sente: si salva ' +
            'in libreria e si prova alla prossima connessione.', SparkEffetti.nome(vecchio), SparkEffetti.nome(nuovo), quante));
    return;
  }

  if (!spark.connected) {
    logLine(tr('ampli non connesso: il cambio non è partito.'), true);
    disegnaCatena();                    // la tendina torna a dire la verità
    return;
  }

  try {
    // La catena si rilegge **solo se non ci fidiamo più** di quella che
    // abbiamo. Riletta a ogni cambio comunque, si raddoppiavano le letture, e
    // ogni lettura sono sedici messaggi che l'ampli deve tirare fuori mentre
    // sta ancora ricostruendo un blocco: l'ampli si è bloccato davvero, il 13
    // agosto 2026, e c'è voluto staccare la corrente.
    let prima = inModifica.effetti;
    if (!inModifica.attendibile) {
      logProgress(tr('guardo cosa c\'è adesso in quel blocco…'));
      prima = await aggiornaCatenaDallAmpli();
    }
    if (!prima) {
      logLine(tr('non riesco a leggere la catena dall\'ampli: senza sapere cosa ' +
              'c\'è adesso, il cambio partirebbe alla cieca. Se si ripete, ' +
              'chiudi l\'editor e riconnetti l\'ampli.'), true);
      disegnaCatena();
      return;
    }

    const vecchio = prima[posizione] && prima[posizione].name;
    if (!vecchio) {
      logLine(tr('quel blocco non esiste nella catena letta.'), true);
      disegnaCatena();
      return;
    }
    if (nuovo === vecchio) { logLine(tr`${nuovo} c'era già.`); return; }

    logProgress(tr`sostituisco ${vecchio} con ${nuovo}…`);
    await spark.send(Spark.commands.changeEffectModel(vecchio, nuovo));
    segnaModificato();
    // Cambiare modello vuol dire ricostruire un blocco DSP: è il comando più
    // pesante che gli mandiamo, e la lettura che segue è la più impegnativa.
    // Un secondo di respiro costa meno di un ampli da riavviare.
    await new Promise(r => setTimeout(r, 1000));

    const dopo = await aggiornaCatenaDallAmpli();
    if (!dopo) {
      logLine(tr('comando mandato, ma non riesco a rileggere la catena: ' +
              'riapri «Regola» per vedere com\'è rimasta.'), true);
      return;
    }

    if (dopo[posizione] && dopo[posizione].name === nuovo) {
      logLine(tr`${vecchio} → ${nuovo}. Verificato rileggendo la catena dall'ampli.`);
    } else {
      logLine(tr('il comando è partito ma quel blocco riporta ancora ' +
              '{0}: il modello ' +
              'potrebbe non esistere con questo nome.', dopo[posizione] ? dopo[posizione].name : '?'), true);
    }
  } catch (err) {
    logLine(tr('cambio modello fallito: {0}', err.message), true);
  }
}

/**
 * Rilegge la catena dall'ampli e la rimette nell'editor, disegno compreso.
 * Restituisce gli effetti letti, o null se la lettura non è riuscita — e in
 * quel caso **non tocca niente**: meglio un editor che dice di non sapere che
 * uno che mostra la catena di prima come se fosse quella di adesso.
 */
async function aggiornaCatenaDallAmpli() {
  const attuale = await spark.readLiveState();
  if (!inModifica) return null;
  if (!attuale) {
    // Da qui in poi non sappiamo più cosa c'è davvero sull'ampli: quello che
    // resta sullo schermo è l'ultima cosa vista, e va trattato come tale.
    inModifica.attendibile = false;
    return null;
  }
  inModifica.effetti = attuale.effects.map(e => ({
    name: e.name,
    enabled: e.enabled,
    params: e.params.map(p => ({ index: p.index, value: p.value })),
  }));
  inModifica.attendibile = true;
  disegnaCatena();
  return inModifica.effetti;
}

/**
 * Un cursore trascinato genera decine di eventi al secondo, e ogni comando è
 * una scrittura BLE. **`writeWithoutResponse` non ha nessun controllo di
 * flusso**: la promessa si risolve quando il sistema ha preso in carico la
 * scrittura, non quando l'ampli l'ha ricevuta. Quindi l'app può correre più
 * della radio, e l'ampli si strozza — sintomo: si pianta e serve staccare la
 * corrente.
 *
 * Per questo l'invio è **autocadenzato** e non a timer: il prossimo parte solo
 * quando il precedente è finito, più una pausa. Così la coda non può crescere,
 * qualunque cosa faccia il dito, e il ritmo si adatta da sé alla connessione.
 * La versione a timer poteva sovrapporsi a sé stessa — `svuotaCoda` azzerava
 * `timerInvio` prima di aspettare gli invii — e accumulava arretrato.
 *
 * Si tiene solo l'ultimo valore per manopola, e **l'ultimo parte sempre**:
 * altrimenti si resterebbe fermi un pelo prima di dove si è lasciato.
 */
const PAUSA_PARAMETRO = 90;   // ms fra la fine di un invio e l'inizio del prossimo

const inAttesa = new Map();
let invioInCorso = false, timerInvio = null;

function mandaParametro(nomeEffetto, indice, valore) {
  // Tutte e cinque le manopole — pomello, cursore, tendina, trascinamento —
  // passano di qui dopo aver scritto il valore nella catena di lavoro, quindi
  // è il posto giusto per accorgersi che c'è del lavoro da salvare. **Prima
  // del ritorno di sotto**: senza ampli il valore è cambiato lo stesso.
  segnaModificato();
  // Senza ampli il valore è già stato scritto nella catena di lavoro dal
  // chiamante: qui non c'è niente da mandare, e mettere in coda comandi che
  // nessuno spedirà lascerebbe solo un arretrato pronto a partire tutto
  // insieme se l'ampli si connettesse a metà.
  if (inModifica && inModifica.offline) return;
  inAttesa.set(nomeEffetto + '#' + indice, { nomeEffetto, indice, valore });
  avviaInvioParametri();
}

function avviaInvioParametri() {
  if (invioInCorso || timerInvio || !inAttesa.size) return;
  timerInvio = setTimeout(svuotaCoda, PAUSA_PARAMETRO);
}

async function svuotaCoda() {
  timerInvio = null;
  invioInCorso = true;
  const daMandare = [...inAttesa.values()];
  inAttesa.clear();
  try {
    for (const { nomeEffetto, indice, valore } of daMandare) {
      await spark.send(Spark.commands.changeParam(nomeEffetto, indice, valore));
    }
  } catch (err) {
    logLine(tr('errore: {0}', err.message), true);
    inAttesa.clear();          // non si insiste su una connessione che non va
  }
  invioInCorso = false;
  avviaInvioParametri();       // se nel frattempo il dito ha mosso ancora
}

/**
 * Ricarica la catena da quello che l'ampli ha davvero adesso, senza
 * rimandargli il preset. Serve quando la verità può essere cambiata sotto:
 * una manopola girata sull'ampli, l'app ufficiale, un comando che non sappiamo
 * se ha attecchito — e serve per misurare, perché il modo di capire cos'è un
 * parametro è scrivergli un valore e guardare cosa ci ridà l'ampli.
 */
$('btnRileggi').addEventListener('click', async () => {
  if (!inModifica) return;
  if (inModifica.offline) {
    logLine(tr('stai regolando la copia in libreria: non c\'è nessun ampli da rileggere.'), true);
    return;
  }
  if (!spark.connected) {
    logLine(tr('ampli non connesso: non c\'è niente da rileggere.'), true);
    return;
  }
  logProgress(tr('rileggo la catena dall\'ampli…'));
  const catena = await aggiornaCatenaDallAmpli();
  // La riuscita finisce solo nel log: nel pannello ci va quello che non va.
  logLine(catena
    ? tr('catena riletta: adesso sullo schermo c\'è quello che ha l\'ampli.')
    : tr('non riesco a rileggere la catena: quello che vedi è l\'ultima cosa vista.'),
    !catena);
});

/* ---- il lavoro non salvato, e come si vede -------------------------------
   Due richieste dell'utente del 26 agosto 2026, e sono la stessa cosa vista da
   due lati: **premendo «Salva» non si aveva la certezza di niente**, e **con
   «Fatto» si buttava via tutto per sbaglio**. In mezzo c'è un dato solo — c'è
   del lavoro non salvato, sì o no — che prima non esisteva da nessuna parte.

   La risposta la dà **il tasto «Salva»**, e non un messaggio: in questo
   pannello non deve comparirne nessuno, deciso dall'utente poche ore prima.
   Il tasto è anche il posto dove si sta già guardando quando ci si chiede se
   è stato salvato. */

/** Qualcosa è cambiato: da qui in poi uscire vuol dire perdere del lavoro. */
function segnaModificato() {
  if (!inModifica || inModifica.toccato) return;
  inModifica.toccato = true;
  aggiornaTastoSalva();
}

let timerSalvato = null;

/**
 * Il tasto «Salva» racconta lo stato: acceso col pallino se c'è del lavoro da
 * salvare, con la spunta verde per qualche secondo appena salvato, spento e
 * normale quando non c'è niente in sospeso.
 *
 * **Non si disabilita mai quando non c'è niente di toccato**, e non è una
 * dimenticanza: aperto l'editor con l'ampli acceso, la catena viene da una
 * lettura vera, che può già essere diversa da quella in libreria — una
 * manopola girata sull'ampli, l'app ufficiale. Salvare in quel momento è
 * un'operazione che ha senso, ed è quella che porta in libreria quello che
 * l'ampli sta suonando.
 */
function aggiornaTastoSalva(appenaSalvato) {
  const tasto = $('btnSalvaModifiche');
  clearTimeout(timerSalvato);
  tasto.classList.remove('da-salvare', 'salvato');

  if (appenaSalvato) {
    tasto.textContent = tr('✓ Salvato');
    tasto.classList.add('salvato');
    // Poi torna com'era: una spunta che resta per sempre finirebbe per dire
    // «salvato» anche dopo la prossima manopola girata.
    timerSalvato = setTimeout(() => aggiornaTastoSalva(), 2600);
    return;
  }

  // Il testo lungo sparisce sul telefono: quelle due parole in più sono la
  // differenza fra una riga sola e una barra che va a capo.
  tasto.textContent = tr('Salva');
  const lungo = document.createElement('span');
  lungo.className = 'solo-largo';
  lungo.textContent = tr(' in libreria');
  tasto.appendChild(lungo);
  if (inModifica && inModifica.toccato) tasto.classList.add('da-salvare');
}

/**
 * Scrive la catena dell'editor sul record in libreria.
 *
 * Torna `true` solo se ha davvero salvato: chi la chiama per uscire deve
 * sapere se può chiudere, e chiudere dopo un salvataggio fallito sarebbe
 * esattamente il modo di perdere il lavoro che si stava cercando di salvare.
 */
async function salvaModifiche() {
  if (!inModifica) return false;
  const { record, effetti } = inModifica;
  const aggiornato = await store.get(record.id);
  if (!aggiornato) { logLine(tr('il preset non è più in libreria.'), true); return false; }

  aggiornato.effects = effetti.map(e => ({
    name: e.name,
    enabled: e.enabled,
    params: e.params.map(p => ({ index: p.index, value: p.value })),
  }));
  // Il tempo è un campo del preset come gli altri: si salva qui e riparte con
  // lui la prossima volta che il preset va all'ampli.
  if (inModifica.bpm) aggiornato.bpm = inModifica.bpm;
  await store.put(aggiornato);
  inModifica.toccato = false;
  aggiornaTastoSalva(true);
  logLine(tr('modifiche salvate su «{0}» in libreria. ' +
          'Sull\'ampli il preset salvato non cambia finché non lo riscrivi in uno slot.', aggiornato.name));
  await ricarica();
  disegnaPreset();
  disegnaLive();
  return true;
}

$('btnSalvaModifiche').addEventListener('click', () => salvaModifiche());

/** Chiude l'editor per davvero: il pannello se ne va e lo stato con lui. */
function chiudiEditor() {
  chiudiPannelli();
  inModifica = null;
  clearTimeout(timerSalvato);
}

/**
 * La domanda prima di uscire con del lavoro non salvato.
 *
 * **Tre vie, non due**, e la terza è il punto: con un `confirm()` di sistema
 * l'unica alternativa a «salva» è «butta via», e un dito che sbaglia bottone
 * perde il lavoro proprio nel momento in cui gli si stava chiedendo di
 * salvarlo. «Torna all'editor» è la via d'uscita che rimette tutto com'era, ed
 * è anche quella che si prende toccando fuori o premendo Esc.
 */
function chiediPrimaDiUscire(dopo) {
  const velo = document.createElement('div');
  velo.className = 'velo-elenco';
  const box = document.createElement('div');
  box.className = 'elenco-scelta';

  const testa = document.createElement('div');
  testa.className = 'elenco-testa';
  testa.textContent = tr('modifiche non salvate');

  // Dove vanno a finire le modifiche buttate via **dipende dalla modalità**, e
  // dire «restano sull'ampli» a chi sta lavorando sul divano sarebbe una bugia:
  // senza ampli non è mai partito niente e si perde tutto.
  const domanda = document.createElement('div');
  domanda.className = 'elenco-domanda';
  domanda.innerHTML = tr('Hai girato qualcosa e <strong>non l\'hai ancora salvato ' +
    'in libreria</strong>.') + ' ' + (inModifica && inModifica.offline
      ? tr('Uscendo così vanno perse: senza ampli non sono andate da nessuna parte.')
      : tr('Uscendo così le perdi: l\'ampli continua a suonarle finché non cambi ' +
        'preset, ma in libreria non ne resta niente.'));

  const azioni = document.createElement('div');
  azioni.className = 'elenco-azioni';

  const salva = document.createElement('button');
  salva.className = 'primary';
  salva.textContent = tr('Salva ed esci');
  salva.addEventListener('click', async () => {
    salva.disabled = true;
    // Se il salvataggio non riesce non si chiude niente: la domanda resta lì e
    // il log dice cos'è andato storto.
    if (await salvaModifiche()) esci();
    else salva.disabled = false;
  });

  const butta = document.createElement('button');
  butta.textContent = tr('Esci senza salvare');
  butta.addEventListener('click', esci);

  // Chi ha chiesto di uscire può volere anche dell'altro — il logo, per dire,
  // chiude l'editor **e** torna ai preset. Quel seguito parte solo quando si
  // esce davvero, mai quando si torna indietro.
  function esci() {
    chiudi();
    chiudiEditor();
    if (dopo) dopo();
  }

  const torna = document.createElement('button');
  torna.textContent = tr('Torna all\'editor');
  torna.addEventListener('click', () => chiudi());

  azioni.append(salva, butta, torna);
  box.append(testa, domanda, azioni);
  velo.appendChild(box);
  document.body.appendChild(velo);
  salva.focus();

  function chiudi() {
    velo.remove();
    document.removeEventListener('keydown', tasto);
  }
  function tasto(evento) { if (evento.key === 'Escape') chiudi(); }
  document.addEventListener('keydown', tasto);
  velo.addEventListener('click', evento => { if (evento.target === velo) chiudi(); });
}

