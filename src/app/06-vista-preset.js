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

/** Il preset passa il filtro di ricerca e categoria? */
function passaIlFiltro(record) {
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

const filtroAttivo = () => !!(vista.cerca || vista.categoria);

function disegnaPreset() {
  disegnaFiltriCategoria();
  if (tendinaOrdine) tendinaOrdine.aggiorna(vista.ordine);

  // Gli otto slot non sono righe di libreria: sono il pannello dell'ampli,
  // due banchi da quattro con i colori dei LED, disposti come li vedi
  // sull'ampli. Il dettaglio di uno slot si apre a tutta larghezza sotto la
  // griglia, altrimenti sfonderebbe la colonna.
  const ampli = $('listaAmpli');
  ampli.innerHTML = '';
  let mostratiSuAmpli = 0;

  const griglia = document.createElement('div');
  griglia.className = 'pannello-ampli';
  let apertoSlot = null;

  // Lo Spark NEO ha quattro slot e nessun banco: una colonna sola, a tutta
  // larghezza, che dispone CH1–CH4 due per riga.
  const banchiAmpli = modelloAmpli.banchi ? [0, 1] : [0];
  for (const banco of banchiAmpli) {
    const colonna = document.createElement('div');
    colonna.className = 'colonna-banco' + (modelloAmpli.banchi ? '' : ' unica');

    const eti = document.createElement('div');
    eti.className = 'banco-eti ' + (modelloAmpli.banchi ? (banco === 0 ? 'a' : 'b') : '');
    eti.textContent = modelloAmpli.banchi ? tr('banco {0}', banco === 0 ? 'A' : 'B')
                                          : modelloAmpli.nome;
    colonna.appendChild(eti);

    for (let posto = 0; posto < 4; posto++) {
      const slot = banco * 4 + posto;
      const record = suAmpli[slot];
      if (record && !passaIlFiltro(record)) continue;
      if (!record && filtroAttivo()) continue;
      mostratiSuAmpli++;
      colonna.appendChild(schedaSlot(record, slot));
      if (record && vista.aperto === record.id + ':' + slot) apertoSlot = { record, slot };
    }
    griglia.appendChild(colonna);
  }
  ampli.appendChild(griglia);

  if (apertoSlot) {
    const sotto = document.createElement('div');
    sotto.className = 'row aperta-sotto';
    sotto.appendChild(dettaglio(apertoSlot.record, apertoSlot.slot));
    ampli.appendChild(sotto);
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

  $('quantiLibreria').textContent = filtroAttivo()
    ? tr`${visibili.length} di ${altri.length}`
    : `${altri.length}`;

  if (visibili.length === 0) {
    const vuoto = document.createElement('div');
    vuoto.className = 'vuoto-sezione';
    vuoto.textContent = altri.length === 0
      ? tr('Nessun preset oltre a quelli sull\'ampli. Connetti e premi «Leggi dall\'ampli», ' +
        'oppure importa un backup da «Altro».')
      : tr('Nessun preset corrisponde alla ricerca.');
    libreria.appendChild(vuoto);
  }
}

function disegnaFiltriCategoria() {
  const barra = $('filtriCategoria');
  barra.innerHTML = '';
  if (categorie.length === 0) {
    barra.style.display = 'none';
    return;
  }
  barra.style.display = '';

  const tutte = document.createElement('span');
  tutte.className = 'pastiglia' + (vista.categoria ? '' : ' attiva');
  tutte.textContent = tr('tutte');
  tutte.addEventListener('click', () => { vista.categoria = ''; disegnaPreset(); });
  barra.appendChild(tutte);

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

  const alto = document.createElement('div');
  alto.className = 'alto';
  const led = document.createElement('span');
  led.className = 'led ' + (posizione.color === 'rosso' ? 'a' : 'b') +
                  (record ? '' : ' spento');
  led.hidden = !posizione.color;          // il NEO non ha LED degli slot
  const sigla = document.createElement('span');
  sigla.className = 'sigla';
  sigla.textContent = posizione.label;
  sigla.title = titoloSlot(slot);
  alto.append(led, sigla);
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
  const basso = document.createElement('div');
  basso.className = 'basso';
  const nome = document.createElement('div');
  nome.className = 'nome-slot';
  nome.textContent = record ? (record.name || tr('(senza nome)')) : tr('non ancora letto');
  if (record) nome.title = record.name || '';   // per intero, se è troncato
  basso.appendChild(nome);
  card.appendChild(basso);

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
 * Il colore della famiglia di suono, se ce l'ha. Chi non ce l'ha resta senza:
 * un colore inventato qui si legge senza pensarci, ed è peggio di nessun colore.
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

  // Solo il nome, per scelta: vedi il commento nel CSS di #listaLibreria.
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
  prova.textContent = '▶';
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

  if (vista.aperto === chiave) riga.appendChild(dettaglio(record, slot));
  return riga;
}

function dettaglio(record, slot) {
  const det = document.createElement('div');
  det.className = 'detail';

  /* nome ---------------------------------------------------------- */
  const boxNome = document.createElement('div');
  boxNome.innerHTML = '<label>' + tr('nome') + '</label>';
  const campoNome = document.createElement('input');
  campoNome.type = 'text';
  campoNome.value = record.name || '';
  campoNome.addEventListener('change', async () => {
    const nuovo = campoNome.value.trim();
    if (!nuovo || nuovo === record.name) { campoNome.value = record.name; return; }
    await store.setName(record.id, nuovo);
    logLine(tr('rinominato in «{0}». Sull\'ampli il nome resta quello vecchio ' +
            'finché non lo riscrivi in uno slot.', nuovo));
    await ricarica();
    disegnaPreset();
  });
  boxNome.appendChild(campoNome);

  // Le schede di libreria hanno già la catena sotto il nome, e ripeterla qui
  // sarebbe leggerla due volte. I posti del pannello dell'ampli invece no —
  // lì c'è solo ampli e drive — quindi la catena intera va mostrata una volta.
  if (slot !== null) boxNome.appendChild(pastiglieCatena(record));

  /* famiglia di suono ---------------------------------------------- */
  // Un asse a sé, che con le categorie non c'entra: quelle sono lo stile
  // (Pink Floyd, jazz, il pezzo), questa è *che tipo di suono è*. Una sola,
  // scelta a mano, e si può togliere — chi non ce l'ha resta senza colore.
  const boxFam = document.createElement('div');
  boxFam.innerHTML = '<label>' + tr('famiglia di suono') + '</label>';
  const scelteFam = document.createElement('div');
  scelteFam.className = 'scelte';

  for (const famiglia of famiglie) {
    const s = document.createElement('span');
    const sua = record.famiglia === famiglia.id;
    s.className = 'scelta famiglia' + (sua ? ' dentro' : '');
    s.style.setProperty('--famiglia', famiglia.colore);
    s.textContent = famiglia.nome;
    s.addEventListener('click', async () => {
      await store.setFamiglia(record.id, sua ? null : famiglia.id);
      await ricarica();
      disegnaPreset();
    });
    scelteFam.appendChild(s);
  }
  boxFam.appendChild(scelteFam);
  if (!record.famiglia) {
    const nota = document.createElement('div');
    nota.className = 'nota-famiglia';
    nota.textContent = tr('senza famiglia: resta senza colore.');
    boxFam.appendChild(nota);
  }

  /* categorie ----------------------------------------------------- */
  const boxCat = document.createElement('div');
  boxCat.innerHTML = '<label>' + tr('categorie') + '</label>';
  const scelte = document.createElement('div');
  scelte.className = 'scelte';
  const sue = new Set((record.tags || []).map(t => t.toLowerCase()));

  for (const { nome } of categorie) {
    const s = document.createElement('span');
    s.className = 'scelta' + (sue.has(nome.toLowerCase()) ? ' dentro' : '');
    s.textContent = (sue.has(nome.toLowerCase()) ? '✓ ' : '＋ ') + nome;
    s.addEventListener('click', async () => {
      if (sue.has(nome.toLowerCase())) await store.removeTag(record.id, nome);
      else                             await store.addTag(record.id, nome);
      await ricarica();
      disegnaPreset();
    });
    scelte.appendChild(s);
  }

  const nuova = document.createElement('span');
  nuova.className = 'scelta';
  nuova.textContent = tr('＋ nuova…');
  nuova.addEventListener('click', async () => {
    const nome = await chiediTesto(tr('nuova categoria'),
      tr('Come si chiama? La userai per filtrare la libreria dalle pastiglie in alto.'),
      '', { ok: tr('Crea e assegna'), invito: tr('blues, prove, casa…') });
    if (!nome) return;
    await store.addCategory(nome);
    await store.addTag(record.id, nome.trim());
    await ricarica();
    disegnaPreset();
  });
  scelte.appendChild(nuova);
  boxCat.appendChild(scelte);

  /* note ---------------------------------------------------------- */
  const boxNote = document.createElement('div');
  boxNote.innerHTML = '<label>' + tr('note') + '</label>';
  const note = document.createElement('textarea');
  note.value = record.notes || '';
  note.placeholder = tr('come suona, quando usarlo, cosa cambiare…');
  note.addEventListener('change', async () => {
    await store.setNotes(record.id, note.value);
    await ricarica();
  });
  boxNote.appendChild(note);

  // Niente «catena effetti» qui sotto: la catena sta già sotto il nome, in
  // cima alla scheda, e ripeterla due volte nello stesso riquadro non
  // aggiunge niente — la si legge una volta sola.

  /* azioni -------------------------------------------------------- */
  const azioni = document.createElement('div');
  azioni.className = 'azioni-blocchi';
  const riga = (extra = '') => {
    const r = document.createElement('div');
    r.className = 'azioni-riga' + (extra ? ' ' + extra : '');
    azioni.appendChild(r);
    return r;
  };
  // Le quattro azioni che si fanno sul preset — provarlo, regolarlo,
  // copiarlo, buttarlo — stanno su **una riga sola e larghe uguali**, chiesto
  // dall'utente il 26 agosto 2026: prima erano sparse su tre righe e la scheda
  // sembrava un elenco di cose scollegate. Sotto, le due che vogliono un
  // «dove» hanno la loro griglia, così i pulsanti e le tendine si incolonnano.
  const rigaSuono = riga('quattro');

  let avvisoAltriSlot = null;
  if (slot !== null) {
    const altri = slotsDi(record).filter(s => s !== slot);
    if (altri.length) {
      avvisoAltriSlot = document.createElement('div');
      avvisoAltriSlot.style.cssText = 'color:var(--dim);font-size:0.76rem';
      avvisoAltriSlot.textContent = tr('Lo stesso preset sta anche in {0}.',
        altri.map(s => postoAmpli(s).label).join(', '));
    }

    // Sta in una riga sua, sopra le quattro: non è un'azione sul preset ma
    // sull'ampli — gli dice quale slot mettere davanti — e compare solo
    // aprendo uno degli otto posti hardware.
    const attiva = document.createElement('button');
    attiva.textContent = tr('Seleziona {0}', postoAmpli(slot).label);
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
    azioni.insertBefore(riga('sola'), rigaSuono).appendChild(attiva);
  }

  // Caricare nel suono corrente non tocca nulla di salvato: è il modo
  // sicuro di provare un preset che sull'ampli non c'è.
  const prova = document.createElement('button');
  prova.className = 'primary';
  prova.textContent = tr('Attiva');
  prova.title = tr('manda il preset all\'ampli senza sovrascrivere nessuno slot');
  prova.disabled = !spark.connected;
  prova.addEventListener('click', () => mandaPreset(record, null));
  rigaSuono.appendChild(prova);

  const regola = document.createElement('button');
  regola.textContent = tr('Regola');
  // Senza ampli si apre lo stesso, sulla copia in libreria: non si sente
  // niente, ma si guarda la catena e si salva. È il caso del divano.
  regola.title = spark.connected
    ? tr('manda il preset all\'ampli e apri le manopole')
    : tr('apri le manopole sulla copia in libreria: senza ampli non si sente, ma si salva');
  regola.addEventListener('click', () => apriEditor(record));
  rigaSuono.appendChild(regola);

  // Gli otto posti dell'ampli, col LED che si vede sul pannello: la sigla da
  // sola (A1, B3) dice poco a chi guarda l'apparecchio invece dello schermo.
  const posti = [];
  for (let i = 0; i < modelloAmpli.slot; i++) {
    const posizione = postoAmpli(i);
    posti.push({ valore: i,
                 testo: posizione.color
                   ? tr`${posizione.label} — LED ${nomeColore(posizione.color)} ${posizione.position}`
                   : posizione.label });
  }
  const scelta = tendinaFinta(tr('dove scriverlo sull\'ampli'), posti,
                              slot !== null ? slot : 0);

  const scrivi = document.createElement('button');
  scrivi.className = 'neon oro';
  scrivi.textContent = tr('Invia a preset HW');
  scrivi.title = tr('sovrascrive il preset presente in quello slot');
  scrivi.disabled = !spark.connected;
  scrivi.addEventListener('click', async () => {
    const dove = scelta.valore;
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
  const rigaSlot = riga('coppia');
  rigaSlot.append(scrivi, scelta);      // prima cosa fa, poi dove

  /* Mettere un preset in un banco live senza passare dalla vista Live.
     Chiesto dall'utente il 14 agosto 2026: si sta già guardando il preset, e
     doverlo ricordare, cambiare vista e ritrovarlo lì dentro è un giro inutile.
     Va nel **primo posto libero** del banco scelto: quale dei quattro tasti sia
     è una cosa che si decide col piede davanti, non da qui, e nella vista Live
     si sposta. Non tocca l'ampli — i banchi inventati non ci scrivono mai. */
  if (banchi.length) {
    const quali = banchi.map(b => {
      const liberi = b.posti.filter(p => p === null).length;
      return { valore: b.id,
               testo: b.nome + (liberi ? tr` — ${liberi} posti liberi` : tr(' — pieno')) };
    });
    const banco = tendinaFinta(tr('in quale banco live'), quali, banchi[0].id);

    const metti = document.createElement('button');
    metti.className = 'neon blu';
    metti.textContent = tr('Metti nel banco');
    metti.title = tr('aggiunge il preset al banco live, senza toccare l\'ampli');
    metti.addEventListener('click', async () => {
      const id = banco.valore;
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
    riga('coppia').append(metti, banco);   // prima cosa fa, poi dove
  }

  // Duplicare è il modo vero di fare un preset nuovo: si parte da un suono
  // che funziona. Non serve l'ampli, quindi il pulsante c'è sempre.
  const duplica = document.createElement('button');
  duplica.textContent = tr('Duplica');
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
  rigaSuono.appendChild(duplica);

  const elimina = document.createElement('button');
  elimina.className = 'pericolo';
  elimina.textContent = tr('Elimina');
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
  // Ultima delle quattro: resta quella che non si torna indietro, e la
  // conferma è lì per quello.
  rigaSuono.appendChild(elimina);

  // Niente riga di identificativi in fondo: c'erano l'UUID e i BPM, tolti su
  // richiesta il 14 agosto 2026. L'UUID serve al codice per riconoscere un
  // preset fra un import e l'altro, non a chi guarda una scheda, e i BPM sono
  // nel preset e non si cambiano da lì.
  det.append(boxNome, boxFam, boxCat, boxNote, azioni);
  if (avvisoAltriSlot) det.appendChild(avvisoAltriSlot);
  return det;
}

/** Nome dello slot come lo mostra l'ampli: "B2 (slot 5)". */
function nomeSlot(n) {
  return `${postoAmpli(n).label} (slot ${n})`;
}

