// Sparkling Tones — 06-vista-preset.js: La vista preset.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Vista preset
   ==================================================================== */

/** Il preset passa il filtro di ricerca, famiglia e categoria? */
function passaIlFiltro(record) {
  if (vista.famiglia && record.famiglia !== vista.famiglia) return false;
  if (vista.categoria &&
      !(record.tags || []).some(t => t.toLowerCase() === vista.categoria.toLowerCase())) {
    return false;
  }
  const termini = vista.cerca.toLowerCase().split(/\s+/).filter(Boolean);
  if (termini.length === 0) return true;
  const pagliaio = [
    record.name, record.description, record.notes,
    (record.tags || []).join(' '),
    (record.effects || []).map(e => e.name).join(' '),
  ].join(' ').toLowerCase();
  return termini.every(t => pagliaio.includes(t));
}

const filtroAttivo = () => !!(vista.cerca || vista.categoria || vista.famiglia);

function disegnaPreset() {
  disegnaFiltriCategoria();
  $('btnOrdina').title = tr('ordine: {0}', (ORDINI.find(o => o.valore === vista.ordine) || ORDINI[0]).testo);

  // Gli slot non sono righe di libreria: sono il pannello dell'ampli, una
  // griglia da quattro — banco A sopra, B sotto, la sigla col colore del LED
  // (14 ottobre 2026). Il dettaglio di uno slot si apre sotto la griglia.
  const ampli = $('listaAmpli');
  ampli.innerHTML = '';
  let mostratiSuAmpli = 0;

  const griglia = document.createElement('div');
  griglia.className = 'pannello-ampli';

  // Mai letto niente e niente ampli: al posto di otto caselle vuote, l'invito
  // a collegarlo. Gli slot letti l'ultima volta invece restano, anche senza
  // ampli: sono quelli che ha dentro.
  const maiLetto = suAmpli.every(r => !r);
  if (maiLetto && !spark.connected) {
    if (!filtroAttivo()) { ampli.appendChild(invitoCollega()); mostratiSuAmpli = 1; }
  } else {
    for (let slot = 0; slot < modelloAmpli.slot; slot++) {
      const record = suAmpli[slot];
      if (record && !passaIlFiltro(record)) continue;
      if (!record && filtroAttivo()) continue;
      mostratiSuAmpli++;
      griglia.appendChild(schedaSlot(record, slot));
    }
    ampli.appendChild(griglia);
  }

  $('sezAmpli').style.display = mostratiSuAmpli === 0 && filtroAttivo() ? 'none' : '';

  const libreria = $('listaLibreria');
  libreria.innerHTML = '';
  // Per id e non per oggetto: `hardware()` rilegge dal database, quindi
  // restituisce copie diverse dagli stessi record che stanno in `tutti`.
  const sullAmpli = new Set(suAmpli.filter(Boolean).map(r => r.id));
  const altri = tutti.filter(r => !sullAmpli.has(r.id));
  const visibili = ordinaLibreria(altri.filter(passaIlFiltro));
  visibili.forEach(record => libreria.appendChild(rigaPreset(record, null)));

  // Quanti sono sta nella casella di ricerca; mentre si filtra, anche quanti
  // passano.
  $('search').placeholder = tr('cerca fra {0} preset', altri.length);
  $('quantiLibreria').textContent = filtroAttivo()
    ? tr`${visibili.length} di ${altri.length}`
    : '';

  if (visibili.length === 0) {
    const vuoto = document.createElement('div');
    vuoto.className = 'vuoto-sezione';
    vuoto.textContent = altri.length === 0
      ? tr('Nessun preset oltre a quelli sull\'ampli. Collega l\'ampli e i suoi si leggono da soli, ' +
        'oppure importa un backup da «Altro» → «Impostazioni e backup».')
      : tr('Nessun preset corrisponde alla ricerca.');
    libreria.appendChild(vuoto);
  }

  // La scheda aperta sta nel foglio che sale dal basso, anche se il filtro
  // l'ha tolta dall'elenco: si chiude dalla ✕. Se il preset non c'è più
  // (eliminato, o lo slot riletto con un altro), il foglio si chiude da sé.
  let apertoRecord = null, apertoSlot = null;
  if (vista.aperto) {
    const [id, s] = vista.aperto.split(':');
    apertoSlot = s === 'null' ? null : Number(s);
    const record = apertoSlot === null ? tutti.find(r => String(r.id) === id) : suAmpli[apertoSlot];
    if (record && String(record.id) === id) apertoRecord = record;
    else vista.aperto = null;
  }
  disegnaFoglio(apertoRecord, apertoSlot);
}

/**
 * Le pastiglie dei filtri: «tutti», poi le famiglie di suono che qualcuno ha
 * (col loro pallino), poi le categorie. Famiglia e categoria si sommano:
 * «Drive» e «Live» insieme sono i drive che usi dal vivo.
 */
function disegnaFiltriCategoria() {
  const barra = $('filtriCategoria');
  barra.innerHTML = '';
  const usate = famiglie.filter(f => tutti.some(r => r.famiglia === f.id));
  if (categorie.length === 0 && usate.length === 0) {
    barra.style.display = 'none';
    return;
  }
  barra.style.display = '';

  const tutte = document.createElement('span');
  tutte.className = 'pastiglia' + (vista.categoria || vista.famiglia ? '' : ' attiva');
  tutte.textContent = tr('tutti');
  tutte.addEventListener('click', () => {
    vista.categoria = vista.famiglia = '';
    disegnaPreset();
  });
  barra.appendChild(tutte);

  for (const famiglia of usate) {
    const p = document.createElement('span');
    p.className = 'pastiglia' + (vista.famiglia === famiglia.id ? ' attiva' : '');
    const pallino = document.createElement('span');
    pallino.className = 'pallino-fam';
    pallino.style.setProperty('--famiglia', famiglia.colore);
    p.append(pallino, famiglia.nome);
    p.addEventListener('click', () => {
      vista.famiglia = vista.famiglia === famiglia.id ? '' : famiglia.id;
      disegnaPreset();
    });
    barra.appendChild(p);
  }

  for (const { nome, quanti } of categorie) {
    const p = document.createElement('span');
    p.className = 'pastiglia' + (vista.categoria === nome ? ' attiva' : '');
    p.innerHTML = '';
    p.append(nome);
    const q = document.createElement('span');
    q.className = 'quanti';
    q.textContent = quanti;
    p.appendChild(q);
    p.addEventListener('click', () => {
      vista.categoria = vista.categoria === nome ? '' : nome;
      disegnaPreset();
    });
    barra.appendChild(p);
  }
}

/**
 * Un posto del pannello dell'ampli. Mostra poche cose apposta: il LED del
 * banco, la sigla, il nome e — al posto della catena intera — **l'ampli e il
 * drive**, che sono quello che si cerca guardando. Uno slot mai letto si vede
 * tratteggiato e lo dice, invece di far finta di essere vuoto.
 */
function schedaSlot(record, slot) {
  const posizione = postoAmpli(slot);
  const card = document.createElement('div');
  card.className = 'slotcard' + (record ? '' : ' libero');
  // Niente striscia della famiglia qui: tolta su richiesta il 26 agosto 2026.
  // Le otto caselle si guardano tutte insieme, e otto strisce colorate erano
  // un secondo reticolo sopra quello dei bordi. La famiglia resta dov'è utile:
  // nelle righe di libreria qui sotto, e sul LED dei pulsantoni della vista live.

  // Niente LED disegnato (14 ottobre 2026): è la sigla ad avere il colore del
  // LED del suo banco, rosso A e verde B. Il NEO non ha LED: sigla grigia.
  const alto = document.createElement('div');
  alto.className = 'alto';
  const sigla = document.createElement('span');
  sigla.className = 'sigla' + (posizione.color ? (posizione.color === 'rosso' ? ' a' : ' b') : '');
  sigla.textContent = posizione.label;
  sigla.title = titoloSlot(slot);
  alto.append(sigla);
  // Il bollo va **in cima e a destra**: la riga della sigla è l'unica che ha
  // spazio, e il nome sotto sta su due righe e non ne ha da cedere.
  const bollo = bolloHendrix(record);
  if (bollo) alto.appendChild(bollo);
  const live = bolloLive(record);
  if (live) alto.appendChild(live);
  card.appendChild(alto);

  // Nella scheda ci stanno la posizione e il nome, e basta: l'ampli e il drive
  // c'erano ed è stato l'utente a toglierli il 26 agosto 2026. Sono otto
  // caselle che si guardano tutte insieme, e otto righe di effetti in più
  // facevano rumore senza aggiungere niente a chi il preset lo conosce già.
  // La catena resta nel dettaglio, che è dove quel preset lo si guarda davvero.
  const nome = document.createElement('div');
  nome.className = 'nome-slot';
  nome.textContent = record ? (record.name || tr('(senza nome)')) : tr('non letto');
  if (record) nome.title = record.name || '';   // per intero, se è troncato
  card.appendChild(nome);

  if (record) {
    const chiave = record.id + ':' + slot;
    if (vista.aperto === chiave) card.classList.add('attivo');
    card.addEventListener('click', () => {
      vista.aperto = vista.aperto === chiave ? null : chiave;
      disegnaPreset();
    });
  }
  return card;
}

/** Al posto degli slot, quando non se n'è mai letto nessuno e l'ampli non c'è. */
function invitoCollega() {
  const box = document.createElement('div');
  box.className = 'invito-collega';
  box.innerHTML = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M6 7l10 8-5 4V3l5 4-10 8"/></svg>';
  const testo = document.createElement('span');
  testo.textContent = tr('Collega l\'ampli per vedere i suoi preset');
  const collega = document.createElement('button');
  collega.className = 'primary';
  collega.textContent = tr('Collega');
  // Senza Bluetooth il bollino in alto è spento, e questo con lui.
  collega.disabled = $('status').disabled;
  collega.addEventListener('click', () => $('status').click());
  box.append(testo, collega);
  return box;
}

/**
 * La catena a pastiglie, coi nomi leggibili invece degli identificativi
 * dell'ampli: `bias.noisegate · LA2AComp · …` a colpo d'occhio non dice
 * niente. Si mostrano i cinque blocchi che fanno il carattere del suono —
 * drive, ampli, modulazione, delay, riverbero — e i blocchi spenti si vedono
 * spenti invece di sparire: fa parte di com'è fatto quel suono.
 *
 * Il riverbero porta il **tipo** invece della parola «Riverbero», che è
 * sempre la stessa e non distingue niente.
 */
function pastiglieCatena(record) {
  const riga = document.createElement('div');
  riga.className = 'chips';
  const effetti = record.effects || [];

  for (let posizione = 2; posizione <= 6; posizione++) {
    const effetto = effetti[posizione];
    if (!effetto) continue;
    const chip = document.createElement('span');
    chip.className = 'chip' + (effetto.enabled ? '' : ' spento');
    chip.textContent = nomePastiglia(effetto, posizione);
    chip.title = Spark.CATENA[posizione] + ': ' + effetto.name;
    riga.appendChild(chip);
  }
  return riga;
}

function nomePastiglia(effetto, posizione) {
  const nomi = SparkEffetti.nomiPosizioni(effetto.name, 6);
  if (posizione === 6 && nomi) {
    const param = (effetto.params || []).find(p => p.index === 6);
    const dove = param
      ? SparkEffetti.posizioneDi(param.value, SparkEffetti.posizioni(effetto.name, 6))
      : -1;
    if (dove !== -1) return nomi[dove];
  }
  return SparkEffetti.nome(effetto.name);
}

/**
 * Il colore della famiglia di suono, se ce l'ha: la banda a sinistra della riga.
 * Chi non ce l'ha resta senza: un colore inventato qui si legge senza pensarci,
 * ed è peggio di nessun colore.
 */
function coloraFamiglia(elemento, record) {
  const scelta = record && record.famiglia &&
                 famiglie.find(f => f.id === record.famiglia);
  if (!scelta) return;
  elemento.classList.add('con-famiglia');
  elemento.style.setProperty('--famiglia', scelta.colore);
}

/**
 * Il colore del LED di un pulsantone della vista live: quello della famiglia
 * del preset, e **verde** per chi non ne ha una. È l'unico posto dell'app dove
 * chi è senza famiglia prende un colore lo stesso, e il perché sta nel CSS di
 * `.ledpad`. I colori delle famiglie li cambia l'utente, quindi si leggono da
 * `famiglie` e non si scrivono qui.
 */
function coloreLed(record) {
  const scelta = record && record.famiglia &&
                 famiglie.find(f => f.id === record.famiglia);
  return scelta ? scelta.colore : '#34c759';   // il verde, che nessuna famiglia usa
}

function etichettaSlot(slot) {
  const posizione = postoAmpli(slot);
  const el = document.createElement('span');
  el.className = 'slot' + (posizione.color ? (posizione.color === 'rosso' ? ' a' : ' b') : '');
  el.textContent = posizione.label;
  el.title = titoloSlot(slot);
  return el;
}

/**
 * Il bollo «JH» dei preset che hanno un effetto Hendrix in catena, o null.
 *
 * **Il pacchetto Hendrix è l'unico contenuto a pagamento dello Spark 2**, e
 * l'ampli lo tiene spento finché l'app ufficiale non gli manda la sua license
 * key — che è firmata con una chiave che non abbiamo (vedi `CLAUDE.md`). Un
 * preset così, mandato da qui su un ampli appena acceso, parte senza fare
 * rumore dove dovrebbe farne: il fuzz non c'è e l'ampli è un altro.
 *
 * Il bollo lo dice **prima di sceglierlo**, che è l'unico momento in cui
 * serve. Non blocca niente e non chiede niente: quei preset funzionano, dopo
 * che l'app ufficiale si è connessa una volta da quando l'ampli è acceso.
 */
function bolloHendrix(record) {
  const dentro = SparkEffetti.hendrixNellaCatena(record && record.effects);
  if (dentro.length === 0) return null;

  const bollo = document.createElement('span');
  bollo.className = 'jh';
  const pallino = document.createElement('span');
  pallino.className = 'pallino';
  bollo.append(pallino, 'JH');
  bollo.title = tr('{0} — pacchetto Jimi Hendrix. Suonano solo dopo che l\'app ufficiale si è ' +
    'connessa all\'ampli almeno una volta da quando è acceso: prima restano ' +
    'muti, senza dare nessun errore.', dentro.map(n => SparkEffetti.nome(n)).join(' · '));
  return bollo;
}

/**
 * Il bollo «Spark LIVE» dei preset fatti per lo Spark LIVE, o null: hanno
 * effetti del canale del microfono che lo Spark 2 e il NEO non hanno, e
 * arrivano col backup dell'app ufficiale (chiesto dall'utente il 7 ottobre
 * 2026). Non si possono mandare all'ampli: il bollo lo dice prima di provarci.
 */
function bolloLive(record) {
  const dentro = SparkEffetti.liveNellaCatena(record && record.effects);
  if (dentro.length === 0) return null;
  const bollo = document.createElement('span');
  bollo.className = 'bollo-live';
  bollo.textContent = 'Spark LIVE';
  bollo.title = tr('Preset per lo Spark LIVE: {0} esistono solo sul suo canale del microfono. ' +
    'Sullo Spark 2 e sul NEO non si può mandare.',
    [...new Set(dentro)].map(n => SparkEffetti.nome(n)).join(' · '));
  return bollo;
}

function rigaPreset(record, slot) {
  const riga = document.createElement('div');
  riga.className = 'row';
  riga.dataset.id = record.id;
  coloraFamiglia(riga, record);

  const head = document.createElement('div');
  head.className = 'head';

  // Solo il nome, per scelta: vedi il commento nel CSS di `.con-famiglia`.
  const naming = document.createElement('div');
  naming.className = 'naming';
  const nome = document.createElement('div');
  nome.className = 'name';
  nome.textContent = record.name || tr('(senza nome)');
  naming.appendChild(nome);

  head.appendChild(naming);
  const bollo = bolloHendrix(record);
  if (bollo) head.appendChild(bollo);
  const live = bolloLive(record);
  if (live) head.appendChild(live);
  if (slot !== null) head.appendChild(etichettaSlot(slot));

  // Provare un preset è l'azione che si fa più spesso, e stava sepolta nel
  // dettaglio: qui è un tasto solo, senza aprire niente.
  const prova = document.createElement('button');
  prova.className = 'via' + (spark.connected ? ' pronto' : '');
  prova.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z"/></svg>';
  prova.setAttribute('aria-label', tr('suona'));
  prova.title = tr('manda il preset all\'ampli senza sovrascrivere nessuno slot');
  prova.disabled = !spark.connected;
  prova.addEventListener('click', event => {
    event.stopPropagation();
    mandaPreset(record, null);
  });
  head.appendChild(prova);

  // La chiave comprende lo slot: lo stesso preset copiato in due slot compare
  // due volte, e toccarne uno non deve aprire anche l'altro.
  const chiave = record.id + ':' + slot;
  head.addEventListener('click', () => {
    vista.aperto = vista.aperto === chiave ? null : chiave;
    disegnaPreset();
  });
  riga.appendChild(head);

  return riga;
}

/**
 * La scheda di un preset, nel foglio che sale dal basso (14 ottobre 2026, dalle
 * bozze scelte dall'utente). In cima chi è — famiglia, slot, bolli, nome — e le
 * due cose che si fanno di più, **Suona** e **Regola**, grandi. Sotto, piccole,
 * le altre: Duplica, Metti in uno slot, nel banco live, Elimina. Poi come lo si
 * organizza: famiglia e categorie. Le note stanno chiuse e si aprono toccandole.
 */
const ICONE_SCHEDA = {
  suona:    '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z"/></svg>',
  regola:   '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3v14M10 3v14M15 3v14"/><circle cx="5" cy="12" r="2"/><circle cx="10" cy="7" r="2"/><circle cx="15" cy="13" r="2"/></svg>',
  seleziona:'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="2.5"/></svg>',
  duplica:  '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="11" height="11" rx="2"/><path d="M3 13V4a1 1 0 0 1 1-1h9"/></svg>',
  slot:     '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M6 9l4 4 4-4"/><rect x="3" y="14" width="14" height="3" rx="1"/></svg>',
  banco:    '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><path d="M14 11v6M11 14h6"/></svg>',
  elimina:  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>',
  chiudi:   '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  matita:   '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16H4v-3z"/></svg>',
  note:     '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h7l3 3v11H5z"/><path d="M8 10h5M8 13h4"/></svg>',
  giu:      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg>',
  su:       '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 12l5-5 5 5"/></svg>',
};

/** Un pulsante della scheda: icona e scritta. */
function tastoScheda(icona, testo, classe = '') {
  const b = document.createElement('button');
  b.type = 'button';
  if (classe) b.className = classe;
  b.innerHTML = ICONE_SCHEDA[icona];
  const t = document.createElement('span');
  t.textContent = testo;
  b.appendChild(t);
  return b;
}

function dettaglio(record, slot) {
  const det = document.createElement('div');
  det.className = 'scheda';
  const chiave = record.id + ':' + slot;

  /* chi è --------------------------------------------------------- */
  const testa = document.createElement('div');
  testa.className = 'scheda-testa';
  const famiglia = record.famiglia && famiglie.find(f => f.id === record.famiglia);
  if (famiglia) {
    const pallino = document.createElement('span');
    pallino.className = 'pallino-fam';
    pallino.style.setProperty('--famiglia', famiglia.colore);
    testa.append(pallino, famiglia.nome);
  }
  if (slot !== null) testa.appendChild(etichettaSlot(slot));
  const bollo = bolloHendrix(record);
  if (bollo) testa.appendChild(bollo);
  const live = bolloLive(record);
  if (live) testa.appendChild(live);
  const chiudi = document.createElement('button');
  chiudi.type = 'button';
  chiudi.className = 'chiudi';
  chiudi.innerHTML = ICONE_SCHEDA.chiudi;
  chiudi.setAttribute('aria-label', tr('chiudi'));
  chiudi.addEventListener('click', () => { vista.aperto = null; disegnaPreset(); });
  testa.appendChild(chiudi);

  // Il nome si cambia dalla matita, non da un campo sempre aperto: si rinomina
  // di rado, e un campo di testo in cima alla scheda la faceva sembrare un modulo.
  const boxNome = document.createElement('div');
  boxNome.className = 'scheda-nome';
  const titolo = document.createElement('h2');
  titolo.textContent = record.name || tr('(senza nome)');
  const rinomina = document.createElement('button');
  rinomina.type = 'button';
  rinomina.innerHTML = ICONE_SCHEDA.matita;
  rinomina.setAttribute('aria-label', tr('rinomina'));
  rinomina.title = tr('rinomina');
  rinomina.addEventListener('click', async () => {
    const scritto = await chiediTesto(tr('rinomina'), tr('Il nuovo nome del preset.'),
      record.name || '', { ok: tr('Rinomina') });
    const nuovo = scritto && scritto.trim();
    if (!nuovo || nuovo === record.name) return;
    await store.setName(record.id, nuovo);
    logLine(tr('rinominato in «{0}». Sull\'ampli il nome resta quello vecchio ' +
            'finché non lo riscrivi in uno slot.', nuovo));
    await ricarica();
    disegnaPreset();
  });
  boxNome.append(titolo, rinomina);

  // La catena a pastiglie, una volta sola: nelle righe di libreria non c'è.
  det.append(testa, boxNome, pastiglieCatena(record));

  /* le due grandi ------------------------------------------------- */
  const grandi = document.createElement('div');
  grandi.className = 'scheda-grandi';

  // Caricare nel suono corrente non tocca nulla di salvato: è il modo
  // sicuro di provare un preset che sull'ampli non c'è.
  const prova = tastoScheda('suona', tr('Suona'), 'primary');
  prova.title = tr('manda il preset all\'ampli senza sovrascrivere nessuno slot');
  prova.disabled = !spark.connected;
  prova.addEventListener('click', () => mandaPreset(record, null));

  const regola = tastoScheda('regola', tr('Regola'));
  // Senza ampli si apre lo stesso, sulla copia in libreria: non si sente
  // niente, ma si guarda la catena e si salva. È il caso del divano.
  regola.title = spark.connected
    ? tr('manda il preset all\'ampli e apri le manopole')
    : tr('apri le manopole sulla copia in libreria: senza ampli non si sente, ma si salva');
  regola.addEventListener('click', () => apriEditor(record));
  grandi.append(prova, regola);
  det.appendChild(grandi);

  /* le altre, piccole --------------------------------------------- */
  const piccole = document.createElement('div');
  piccole.className = 'scheda-piccole';

  let avvisoAltriSlot = null;
  if (slot !== null) {
    const altri = slotsDi(record).filter(s => s !== slot);
    if (altri.length) {
      avvisoAltriSlot = document.createElement('div');
      avvisoAltriSlot.className = 'nota-altri-slot';
      avvisoAltriSlot.textContent = tr('Lo stesso preset sta anche in {0}.',
        altri.map(s => postoAmpli(s).label).join(', '));
    }

    // Solo aprendo uno dei posti dell'ampli: non è un'azione sul preset ma
    // sull'ampli — gli dice quale slot mettere davanti, senza scrivere nulla.
    const attiva = tastoScheda('seleziona', tr('Seleziona {0}', postoAmpli(slot).label));
    attiva.title = tr('seleziona lo slot sull\'ampli, senza scrivere nulla');
    attiva.disabled = !spark.connected;
    attiva.addEventListener('click', async () => {
      // Sul NEO l'utente ha visto «niente» (2 ottobre 2026), mentre lo stesso
      // `0x0138` dai pulsantoni live funziona: si chiede all'ampli quale slot
      // ha davanti, e la riga dice la sua risposta invece della nostra intenzione.
      // La prima volta la riga non è comparsa affatto (4 ottobre): da qui si
      // vede se il tocco arriva, e se qualcosa si pianta o salta, dove.
      logProgress(tr('mando {0} all\'ampli…', nomeSlot(slot)));
      let ack, msg;
      try {
        ack = await spark.sendAndAwaitAck(Spark.commands.changePreset(slot), 1500);
        logProgress(tr('chiedo all\'ampli cosa ha davanti…'));
        msg = await spark.request(Spark.commands.getCurrentPreset(),
          m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x10, 1500);
      } catch (err) {
        return logLine(tr('{0}: errore — {1}', nomeSlot(slot), err.message));
      }
      const davanti = msg ? msg.data[msg.data.length - 1] : null;
      logLine(davanti === slot
        ? tr`selezionato ${nomeSlot(slot)}`
        : tr('chiesto {0}: l\'ampli {1}, e dice di avere davanti {2}',
             nomeSlot(slot), ack ? tr('ha confermato') : tr('non ha confermato'),
             davanti === null ? '?'
               : davanti === Spark.SOFTWARE_PRESET ? tr('il preset mandato dall\'app')
               : nomeSlot(davanti)));
    });
    piccole.appendChild(attiva);
  }

  // Duplicare è il modo vero di fare un preset nuovo: si parte da un suono
  // che funziona. Non serve l'ampli, quindi il pulsante c'è sempre.
  const duplica = tastoScheda('duplica', tr('Duplica'));
  duplica.title = tr('ne fa una copia in libreria, da storcere a piacere');
  duplica.addEventListener('click', async () => {
    const copiaId = await store.duplicate(record.id);
    const copia = await store.get(copiaId);
    vista.aperto = `${copiaId}:null`;   // si apre la copia, che è quella su cui si lavora
    logLine(tr`«${copia.name}» creato copiando «${record.name}»`);
    await ricarica();
    disegnaPreset();
    disegnaLive();
  });
  piccole.appendChild(duplica);

  // Scriverlo in uno slot: prima si sceglie dove, dall'elenco degli slot col
  // LED che si vede sul pannello — la sigla da sola (A1, B3) dice poco a chi
  // guarda l'apparecchio invece dello schermo — poi si conferma.
  const scrivi = tastoScheda('slot', tr('Metti in uno slot'));
  scrivi.title = tr('sovrascrive il preset presente in quello slot');
  scrivi.disabled = !spark.connected;
  scrivi.addEventListener('click', () => {
    const posti = [];
    for (let i = 0; i < modelloAmpli.slot; i++) {
      const posizione = postoAmpli(i);
      const chi = suAmpli[i];
      posti.push({ valore: i,
                   testo: (posizione.color
                     ? tr`${posizione.label} — LED ${nomeColore(posizione.color)} ${posizione.position}`
                     : posizione.label) + (chi ? ' · ' + (chi.name || '') : '') });
    }
    apriElenco(tr('dove scriverlo sull\'ampli'), posti, slot !== null ? slot : null, async dove => {
      const chiCera = suAmpli[dove];
      const avviso =
        tr('Scrivere <strong>{0}</strong> in {1} sull\'ampli?', testoConNome(record.name), nomeSlot(dove)) +
        ' ' +
        (chiCera && chiCera.id !== record.id
          ? tr('Sovrascrive «{0}», che è già lì — ma la sua copia ' +
            'in libreria resta al sicuro, e ricompare nella lista qui sotto.', testoConNome(chiCera.name))
          : tr('La copia in libreria resta comunque al sicuro.'));
      if (!await conferma(tr('scrivere sull\'ampli'), avviso, { ok: tr('Scrivi {0}', nomeSlot(dove)) })) return;
      mandaPreset(record, dove);
    });
  });
  piccole.appendChild(scrivi);

  /* Mettere un preset in un banco live senza passare dalla vista Live.
     Chiesto dall'utente il 14 agosto 2026: si sta già guardando il preset, e
     doverlo ricordare, cambiare vista e ritrovarlo lì dentro è un giro inutile.
     Va nel **primo posto libero** del banco scelto: quale dei quattro tasti sia
     è una cosa che si decide col piede davanti, non da qui, e nella vista Live
     si sposta. Non tocca l'ampli — i banchi inventati non ci scrivono mai. */
  if (banchi.length) {
    const metti = tastoScheda('banco', tr('Nel banco live'));
    metti.title = tr('aggiunge il preset al banco live, senza toccare l\'ampli');
    metti.addEventListener('click', () => {
      const quali = banchi.map(b => {
        const liberi = b.posti.filter(p => p === null).length;
        return { valore: b.id,
                 testo: b.nome + (liberi ? tr` — ${liberi} posti liberi` : tr(' — pieno')) };
      });
      apriElenco(tr('in quale banco live'), quali, null, async id => {
        const scelto = banchi.find(b => b.id === id);
        if (!scelto) return;

        const giaLi = scelto.posti.indexOf(record.id);
        if (giaLi !== -1) {
          logLine(tr`«${record.name}» era già in «${scelto.nome}», al posto ${giaLi + 1}`);
          return;
        }
        const libero = scelto.posti.indexOf(null);
        if (libero === -1) {
          await avvisa(tr('banco pieno'),
            tr('<strong>{0}</strong> ha tutti e otto i posti ' +
            'occupati. Liberane uno dalla vista Live, oppure scegli un altro banco.', testoConNome(scelto.nome)));
          return;
        }
        await store.setBankSlot(id, libero, record.id);
        logLine(tr`«${record.name}» → «${scelto.nome}», posto ${libero + 1}`);
        await ricarica();
        disegnaPreset();
        disegnaLive();
      });
    });
    piccole.appendChild(metti);
  }

  // Ultima: resta quella che non si torna indietro, e la conferma è lì per quello.
  const elimina = tastoScheda('elimina', tr('Elimina'), 'pericolo');
  elimina.addEventListener('click', async () => {
    if (!await conferma(tr('eliminare dalla libreria'),
      tr('Eliminare <strong>{0}</strong> dalla libreria? ' +
      'L\'ampli non viene toccato: se è caricato in uno slot continua a suonare.', testoConNome(record.name)),
      { ok: tr('Elimina'), pericolo: true })) return;
    await store.remove(record.id);
    vista.aperto = null;
    logLine(tr`«${record.name}» eliminato dalla libreria`);
    await ricarica();
    disegnaPreset();
    disegnaLive();
  });
  piccole.appendChild(elimina);
  det.appendChild(piccole);
  if (avvisoAltriSlot) det.appendChild(avvisoAltriSlot);

  const sep = document.createElement('div');
  sep.className = 'scheda-sep';
  det.appendChild(sep);

  /* famiglia di suono ---------------------------------------------- */
  // Un asse a sé, che con le categorie non c'entra: quelle sono lo stile
  // (Pink Floyd, jazz, il pezzo), questa è *che tipo di suono è*. Una sola,
  // scelta a mano, e si può togliere — chi non ce l'ha resta senza colore.
  const etiFam = document.createElement('div');
  etiFam.className = 'scheda-eti';
  etiFam.textContent = tr('Famiglia');
  const scelteFam = document.createElement('div');
  scelteFam.className = 'scelte';
  for (const fam of famiglie) {
    const s = document.createElement('span');
    const sua = record.famiglia === fam.id;
    s.className = 'scelta famiglia' + (sua ? ' dentro' : '');
    s.style.setProperty('--famiglia', fam.colore);
    s.textContent = fam.nome;
    s.addEventListener('click', async () => {
      await store.setFamiglia(record.id, sua ? null : fam.id);
      await ricarica();
      disegnaPreset();
    });
    scelteFam.appendChild(s);
  }
  det.append(etiFam, scelteFam);

  /* categorie ----------------------------------------------------- */
  const etiCat = document.createElement('div');
  etiCat.className = 'scheda-eti';
  etiCat.textContent = tr('Categorie');
  const scelte = document.createElement('div');
  scelte.className = 'scelte';
  const sue = new Set((record.tags || []).map(t => t.toLowerCase()));
  for (const { nome } of categorie) {
    const s = document.createElement('span');
    s.className = 'scelta' + (sue.has(nome.toLowerCase()) ? ' dentro' : '');
    s.textContent = (sue.has(nome.toLowerCase()) ? '✓ ' : '') + nome;
    s.addEventListener('click', async () => {
      if (sue.has(nome.toLowerCase())) await store.removeTag(record.id, nome);
      else                             await store.addTag(record.id, nome);
      await ricarica();
      disegnaPreset();
    });
    scelte.appendChild(s);
  }
  const nuova = document.createElement('span');
  nuova.className = 'scelta nuova';
  nuova.textContent = tr('＋ nuova…');
  nuova.addEventListener('click', async () => {
    const nome = await chiediTesto(tr('nuova categoria'),
      tr('Come si chiama? La userai per filtrare la libreria dalle pastiglie sopra l\'elenco.'),
      '', { ok: tr('Crea e assegna'), invito: tr('blues, prove, casa…') });
    if (!nome) return;
    await store.addCategory(nome);
    await store.addTag(record.id, nome.trim());
    await ricarica();
    disegnaPreset();
  });
  scelte.appendChild(nuova);
  det.append(etiCat, scelte);

  /* note ---------------------------------------------------------- */
  // Chiuse, scelta dell'utente sulle bozze: si leggono poco, e aperte si
  // prendevano mezza scheda. La riga dice se ce n'è e come cominciano.
  const aperte = vista.noteAperte === chiave;
  const rigaNote = document.createElement('button');
  rigaNote.type = 'button';
  rigaNote.className = 'riga-note';
  rigaNote.setAttribute('aria-expanded', aperte ? 'true' : 'false');
  rigaNote.innerHTML = ICONE_SCHEDA.note;
  const etiNote = document.createElement('span');
  etiNote.textContent = tr('Note');
  const anteprima = document.createElement('span');
  anteprima.className = 'anteprima';
  anteprima.textContent = aperte ? '' : (record.notes || '').trim().split('\n')[0];
  rigaNote.append(etiNote, anteprima);
  rigaNote.insertAdjacentHTML('beforeend', aperte ? ICONE_SCHEDA.su : ICONE_SCHEDA.giu);
  rigaNote.addEventListener('click', () => {
    vista.noteAperte = aperte ? null : chiave;
    disegnaPreset();
    if (!aperte) {
      const campo = $('foglioPreset').querySelector('textarea');
      if (campo) campo.focus();
    }
  });
  det.appendChild(rigaNote);

  if (aperte) {
    const note = document.createElement('textarea');
    note.value = record.notes || '';
    note.placeholder = tr('come suona, quando usarlo, cosa cambiare…');
    note.setAttribute('aria-label', tr('note'));
    note.addEventListener('change', async () => {
      await store.setNotes(record.id, note.value);
      await ricarica();
    });
    det.appendChild(note);
  }

  // Niente riga di identificativi in fondo: c'erano l'UUID e i BPM, tolti su
  // richiesta il 14 agosto 2026. L'UUID serve al codice per riconoscere un
  // preset fra un import e l'altro, non a chi guarda una scheda, e i BPM sono
  // nel preset e non si cambiano da lì.
  return det;
}

/**
 * Il foglio della scheda: si riempie col preset aperto, o si chiude. A ogni
 * ridisegno si rifà da capo, ma resta al punto dove lo si era fatto scorrere.
 */
function disegnaFoglio(record, slot) {
  const foglio = $('foglioPreset');
  if (!record) {
    foglio.hidden = true;
    foglio.innerHTML = '';
  } else {
    const scorso = foglio.hidden ? 0 : foglio.scrollTop;
    foglio.innerHTML = '';
    foglio.appendChild(dettaglio(record, slot));
    foglio.hidden = false;
    foglio.scrollTop = scorso;
  }
  aggiornaVelo();
}

/** Nome dello slot come lo mostra l'ampli: "B2 (slot 5)". */
function nomeSlot(n) {
  return `${postoAmpli(n).label} (slot ${n})`;
}

