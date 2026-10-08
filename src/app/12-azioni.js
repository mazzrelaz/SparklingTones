// Sparkling Tones — 12-azioni.js: Le azioni comuni.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Azioni comuni
   ==================================================================== */

$('btnAltro').addEventListener('click', () => {
  apriPannello('pannelloAltro');
  leggiDataDropbox();          // la data di lassù si legge aprendo, non a ogni avvio
});
$('btnAbout').addEventListener('click', () => apriPannello('pannelloAbout'));

// La lingua cambia ricaricando la pagina: con l'ampli collegato vuol dire
// perderlo, quindi prima si chiede.
for (const tasto of document.querySelectorAll('#sceltaLingua [data-lingua]')) {
  const lingua = tasto.dataset.lingua;
  tasto.classList.toggle('primary', lingua === Lingua.attuale);
  tasto.addEventListener('click', async () => {
    if (lingua === Lingua.attuale) return;
    if (spark.connected && !await conferma(tr('Cambiare lingua?'),
        tr('La pagina si ricarica e l\'ampli si scollega.'), { ok: tr('Cambia') })) return;
    Lingua.imposta(lingua);
  });
}

// La goliardata, fra una canzone e l'altra. Si apre **sopra** «Altro» invece
// che al posto suo — `apriPannello` chiuderebbe tutto — così «Fatto» riporta
// dov'era. Il gioco non tocca niente: né la radio, né la libreria.
$('btnSnake').addEventListener('click', () => SnakePedali.apri());

// La guida dell'editor serve una volta sola, poi è un muro di testo fra te e
// le manopole. Sta dietro il «?» in cima, e si chiude da sé riaprendo
// l'editor: chi lo riapre vuole girare, non rileggere.
// La guida si carica la prima volta che la si apre, non all'avvio: sono
// pagine che servono di rado, e l'app deve partire svelta. Poi resta lì, e
// riaprendola si ritrova il punto dove si era arrivati. La lingua è quella
// dell'app: l'inglese ha la sua pagina, tradotta per intero.
$('btnGuida').addEventListener('click', () => {
  const cornice = $('corniceGuida');
  if (!cornice.getAttribute('src')) {
    cornice.src = Lingua.attuale === 'en' ? 'guida.en.html' : 'guida.html';
  }
  apriPannello('pannelloGuida');
});

$('btnAiutoEditor').addEventListener('click', () => {
  const guida = $('aiutoEditor');
  guida.hidden = !guida.hidden;
});

$('status').addEventListener('click', async () => {
  if ($('status').disabled) return;          // connesso: la spia non riconnette
  try {
    await spark.connect();
    await spark.identify();
    $('status').title = spark.state.name || tr('connesso');
    // Il nome dice quanti slot ha (Spark 2 otto, NEO quattro), e resta per
    // quando l'ampli è spento: gli slot in libreria sono i suoi.
    if (spark.state.name) await store.setSetting('ultimoAmpli', spark.state.name);
    // Appena connessi si legge da soli: la prima cosa che serve sapere è
    // cosa c'è davvero negli otto slot, e chiederlo a mano ogni volta è un
    // passaggio che si dimentica. `importFromAmp` non tocca il lavoro
    // dell'utente, quindi farlo in automatico non costa niente.
    await leggiDallAmpli();
  } catch (err) {
    logLine(tr('errore: {0}', err.message));
  }
});

$('btnRead').addEventListener('click', () => leggiDallAmpli());

/**
 * La riga che spiega un pulsante premuto senza ampli. Una sola, perché il
 * motivo è sempre lo stesso e cambia solo cosa si stava per fare.
 */
const senzaAmpli = cosa =>
  tr`per ${cosa} serve l'amplificatore: premi CONNETTI in alto e riprova.`;

/**
 * Legge gli otto slot e li riversa in libreria.
 *
 * Durante la lettura i pulsantoni della vista live restano spenti: l'ampli
 * sta rispondendo a otto richieste in fila, e premerne uno nel mezzo
 * infilerebbe un comando dentro una conversazione già in corso.
 */
async function leggiDallAmpli() {
  if (!spark.connected) return logLine(senzaAmpli(tr('leggere gli otto slot')));
  $('btnRead').disabled = true;
  live.occupato = true;
  disegnaLive();

  try {
    // Gli slot che quest'ampli non ha valgono come letti e vuoti: chi li
    // teneva su un altro ampli li perde, e torna nella libreria qui sotto.
    const profilo = Spark.profiloAmpli(spark.state.name);
    const presets = await spark.readLibrary(profilo.slot, (i, max) => {
      logProgress(tr`lettura slot ${i + 1} di ${max}…`);
    });
    const slotVuoti = [];
    for (let s = profilo.slot; s < 8; s++) slotVuoti.push(s);
    const { added, updated, omonimi } = await store.importFromAmp(presets, { slotVuoti });
    logLine(tr`letti ${presets.length} preset dall'ampli: ${added} nuovi, ${updated} aggiornati`);
    // Un nome che c'è già non entra due volte: si dice quali, e se l'ampli ha
    // un suono diverso da quello in libreria (che non si tocca).
    for (const o of omonimi) {
      logLine(o.suonoDiverso
        ? tr('«{0}» c\'è già in libreria: non lo copio. Sull\'ampli il suono è diverso, ' +
             'in libreria resta il tuo.', o.nome)
        : tr('«{0}» c\'è già in libreria: non lo copio.', o.nome));
    }
  } catch (err) {
    logLine(tr('lettura interrotta: {0}', err.message));
  }

  live.occupato = false;
  $('btnRead').disabled = false;
  await ricarica();
  disegnaPreset();
  disegnaLive();
}

/**
 * «Importa preset attuale»: legge quello che l'ampli sta suonando e lo offre
 * alla libreria. È l'altro modo di fare un preset nuovo — si girano le
 * manopole vere, o si sceglie un tono dall'app ufficiale, e poi lo si prende.
 * `readLiveState` non torna nessuno slot, e va bene così: quel suono sta nel
 * buffer, non in uno degli otto.
 *
 * **Sta nella tendina «⋯» e non nel pannello «Altro»** (28 agosto 2026,
 * chiesto dall'utente): là dentro è una voce di manutenzione fra esportazioni
 * e Dropbox, mentre questa è la strada più corta per portarsi in libreria un
 * suono dell'app ufficiale, e si usa con l'ampli acceso davanti.
 *
 * Se quell'UUID è già in libreria non se ne fa un doppione: si aggiorna la
 * parte sonora e basta, che è la regola di `importFromAmp` — tag, note,
 * famiglia e ordine sono lavoro dell'utente e non si toccano.
 */
$('btnLive').addEventListener('click', async () => {
  if (!spark.connected) return logLine(senzaAmpli(tr('prendere il suono di adesso')));
  $('btnLive').disabled = true;
  spark.lastFailedPayload = null;
  logProgress(tr('leggo il suono che l\'ampli sta facendo…'));
  const corrente = await spark.readLiveState();
  if (corrente) {
    const catena = corrente.effects.filter(e => e.enabled).map(e => e.name).join(' · ');
    logLine(tr`suono corrente: «${corrente.name}» — ${catena}`);

    // Lo stesso preset, o uno con lo stesso nome: un nome non entra due volte.
    const esistente = (corrente.uuid ? await store.byUuid(corrente.uuid) : null) ||
                      await store._omonimo(corrente.name, null);
    const domanda = esistente
      ? tr('<strong>{0}</strong> è già in libreria. ' +
        'Aggiornarne il suono con quello che l\'ampli sta suonando adesso? ' +
        'Tag, note e famiglia restano.', testoConNome(esistente.name))
      : tr('Salvare <strong>{0}</strong> in libreria ' +
        'come preset nuovo?', testoConNome(corrente.name));
    if (await conferma(esistente ? tr('aggiornare il suono') : tr('salvare in libreria'), domanda,
                       { ok: esistente ? tr('Aggiorna il suono') : tr('Salva in libreria') })) {
      const { added } = await store.importFromAmp([corrente], { aggiornaOmonimi: true });
      logLine(added ? tr`«${corrente.name}» aggiunto alla libreria`
                    : tr`«${corrente.name}» aggiornato in libreria`);
      await ricarica();
      disegnaPreset();
      disegnaLive();
    }
  } else if (spark.lastFailedPayload) {
    scaricaDiagnostica();
    logLine(tr('non so leggere il suono corrente: payload grezzo scaricato nei Download.'));
  } else {
    logLine(tr('nessuna risposta alla lettura del suono corrente.'));
  }
  $('btnLive').disabled = false;
});

$('search').addEventListener('input', event => {
  vista.cerca = event.target.value;
  disegnaPreset();
});

/**
 * La tendina dell'ordinamento, montata una volta sola: sta nell'intestazione,
 * che non viene ridisegnata, quindi il bottone campa quanto la pagina e
 * `disegnaPreset` gli dice solo cosa mostrare.
 */
const ORDINI = [
  { valore: 'nome',       testo: tr('nome') },
  { valore: 'aggiunto',   testo: tr('aggiunti di recente') },
  { valore: 'modificato', testo: tr('modificati di recente') },
  { valore: 'famiglia',   testo: tr('famiglia di suono') },
];
tendinaOrdine = tendinaFinta(tr('come ordinare la libreria'), ORDINI, vista.ordine,
  async scelto => {
    vista.ordine = scelto;
    disegnaPreset();                     // prima si vede, poi si salva
    await store.setSetting('ordineLibreria', vista.ordine);
  });
$('postoOrdina').replaceWith(tendinaOrdine);

$('btnExport').addEventListener('click', async () => {
  const backup = await store.exportAll();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spark-libreria-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('btnImport').addEventListener('click', () => $('fileInput').click());

/**
 * Un file solo, e tre cose diverse dentro: il nostro backup, il
 * `preset_backup.zip` dell'app ufficiale, o **un preset singolo** uscito da
 * lì. Si decide dal **contenuto e non dall'estensione**: un tono condiviso
 * dall'app ufficiale può chiamarsi in qualunque modo, e uno zip lo dice da sé
 * coi suoi primi due byte (`PK`). Chiedere all'utente di sapere che cos'ha in
 * mano sarebbe chiedergli la cosa che non sa.
 */
$('fileInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) await importaBackupUfficiale(file, buffer);
    else                                        await importaJson(file, bytes);
    await ricarica();
    disegnaPreset();
    disegnaLive();
  } catch (err) {
    logLine(tr('importazione fallita: {0}', err.message));
  }
  event.target.value = '';
});

/**
 * Il file non è uno zip: o è il nostro backup, o è roba dell'app ufficiale.
 * Il nostro si riconosce da `presets`, che è la sua unica forma; tutto il
 * resto lo guarda `trovaPresetUfficiali`, che cerca la catena e non l'incarto.
 */
async function importaJson(file, bytes) {
  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    throw new Error(tr`${file.name} non è né uno zip né un JSON`);
  }

  if (json && Array.isArray(json.presets)) {
    // Un file non è un altro apparecchio: le sue cancellazioni non valgono
    // (lapidi: false), e prima di toccare la libreria si chiede.
    const n = json.presets.length;
    if (!await conferma(tr('importare un backup'),
      tr('Mettere in libreria <strong>{0} preset</strong> da ' +
      '<strong>{1}</strong>? I preset che hai già prendono il ' +
      'suono <strong>e anche tag, note e ordine</strong> del file. Non viene cancellato niente.', n, testoConNome(file.name)),
      { ok: n === 1 ? tr('Importa il preset') : tr`Importa ${n} preset` })) return;
    const quanti = await store.importBackup(json, { lapidi: false });
    logLine(tr`importati ${quanti} preset da ${file.name}`);
    return;
  }

  const grezzi = SparkBackup.trovaPresetUfficiali(json);
  if (grezzi.length === 0) {
    throw new Error(tr`in ${file.name} non c'è nessun preset che sappia leggere`);
  }
  await importaPresetSciolti(grezzi, file.name);
}

/**
 * Preset singoli dell'app ufficiale, fuori dal backup: un tono esportato o
 * condiviso. Passano dallo stesso `convertiPreset` del backup — è lì che i
 * booleani diventano numeri e gli indici byte — e dalla stessa
 * `importFromBackup`, quindi valgono le regole della libreria: se quell'UUID
 * c'è già si aggiorna il suono e **tag, note e famiglia restano**.
 *
 * **Senza `meta.id` gliene diamo uno noi**, perché un tono condiviso può
 * arrivare senza: è meglio di un'importazione che fallisce, ma va detto —
 * reimportando lo stesso file si fa un doppione invece di aggiornare.
 */
async function importaPresetSciolti(grezzi, nomeFile) {
  const presets = [];
  let inventati = 0;
  const saltati = [];

  for (const grezzo of grezzi) {
    const meta = grezzo.meta || {};
    const conId = meta.id ? grezzo
      : (inventati++, Object.assign({}, grezzo,
          { meta: Object.assign({}, meta, { id: crypto.randomUUID() }) }));
    try {
      presets.push(SparkBackup.convertiPreset(conId, null));
    } catch (err) {
      saltati.push(err.message);
    }
  }
  if (presets.length === 0) {
    throw new Error(`${nomeFile}: ${saltati[0] || tr('nessun preset leggibile')}`);
  }

  const nomi = presets.map(p => p.name).join(' · ');
  const uno  = presets.length === 1;
  if (!await conferma(uno ? tr('importare il preset') : tr('importare i preset'),
    (uno ? tr`Mettere in libreria <strong>${testoConNome(presets[0].name)}</strong>?`
         : tr('Mettere in libreria <strong>{0} preset</strong> ' +
           '({1})?', presets.length, testoConNome(nomi))) +
    tr(' Se ce l\'hai già, se ne aggiorna il suono: tag, note e famiglia restano.'),
    { ok: uno ? tr('Importa il preset') : tr('Importa') })) return;

  const { added, updated } = await store.importFromBackup(presets);
  logLine(tr`da ${nomeFile}: ${added} nuovi, ${updated} aggiornati — ${nomi}`);
  if (inventati) {
    logLine(tr('{0} preset non portavano un identificativo: gliene ho dato uno io, ' +
            'quindi reimportando lo stesso file se ne fa un doppione.', inventati));
  }
  if (saltati.length) logLine(tr`${saltati.length} saltati: ${saltati[0]}`);
}

/** preset_backup.zip dell'app ufficiale: le sue categorie restano fuori. */
async function importaBackupUfficiale(file, buffer) {
  logLine(tr`leggo ${file.name}…`);
  const { presets, saltati } = await SparkBackup.parseBackup(buffer);

  const { added, updated } = await store.importFromBackup(presets);
  logLine(tr`${presets.length} preset dal backup dell'app: ${added} nuovi, ${updated} aggiornati`);
  logLine(tr('le categorie dell\'app ufficiale non sono state importate: ' +
          'le tue le fai da «Categorie».'));
  if (saltati.length) {
    logLine(tr`${saltati.length} preset saltati: ${saltati[0].motivo}`);
  }
}

/* ====================================================================
   Doppioni
   ==================================================================== */

/*
 * I preset con lo stesso nome (spazi ai bordi, spazi ripetuti e maiuscole non
 * contano: `PresetStore.chiaveNome`), da
 * guardare e scegliere a mano: chiesto dall'utente il 7 ottobre 2026, dopo che
 * il backup dell'app ufficiale, il NEO e i salvataggi sull'ampli li avevano
 * fatti entrare con UUID diversi. Da allora un nome che c'è già non entra più
 * dall'ampli (`importFromAmp`); questi sono quelli rimasti da prima.
 *
 * Niente si toglie da solo: per ogni preset quando è entrato, se sta
 * sull'ampli, tag e note, e una lettera per il suono — stessa lettera, stessa
 * catena con gli stessi valori.
 */
$('btnDoppioni').addEventListener('click', () => {
  apriPannello('pannelloDoppioni');
  disegnaDoppioni();
});

function gruppiDoppioni() {
  const perNome = new Map();
  for (const record of tutti) {
    const chiave = PresetStore.chiaveNome(record.name);   // spazi ripetuti e maiuscole non contano
    if (!chiave) continue;
    if (!perNome.has(chiave)) perNome.set(chiave, []);
    perNome.get(chiave).push(record);
  }
  return [...perNome.values()]
    .filter(g => g.length > 1)
    .map(g => g.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)))
    .sort((a, b) => (a[0].name || '').localeCompare(b[0].name || '', 'it', { sensitivity: 'base' }));
}

function disegnaDoppioni() {
  const lista = $('listaDoppioni');
  lista.innerHTML = '';
  const gruppi = gruppiDoppioni();
  if (!gruppi.length) {
    const vuoto = document.createElement('p');
    vuoto.className = 'spiega';
    vuoto.textContent = tr('Nessun doppione: ogni nome compare una volta sola.');
    lista.appendChild(vuoto);
    return;
  }
  const quando = t => t ? new Date(t).toLocaleString(Lingua.attuale,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const suono = r => JSON.stringify([r.effects || [], r.bpm]);

  for (const gruppo of gruppi) {
    const box = document.createElement('div');
    box.className = 'gruppo-doppioni';
    const titolo = document.createElement('h4');
    titolo.textContent = tr`«${gruppo[0].name.trim().replace(/\s+/g, ' ')}», ${gruppo.length} volte`;
    box.appendChild(titolo);

    const lettere = new Map();       // suono -> lettera, nell'ordine in cui compaiono
    for (const record of gruppo) {
      if (!lettere.has(suono(record))) lettere.set(suono(record), String.fromCharCode(65 + lettere.size));
      const riga = document.createElement('div');
      riga.className = 'riga-doppione';

      const lettera = document.createElement('span');
      lettera.className = 'lettera';
      lettera.textContent = lettere.get(suono(record));
      lettera.title = tr('stessa lettera, stesso suono');

      const dati = document.createElement('div');
      dati.className = 'dati';
      const catena = document.createElement('div');
      catena.className = 'catena';
      catena.textContent = (record.effects || []).filter(e => e.enabled)
        .map(e => SparkEffetti.nome(e.name)).join(' · ') || tr('(catena vuota)');
      const sotto = document.createElement('div');
      const pezzi = [tr('entrato il {0}', quando(record.createdAt))];
      if (residente(record)) pezzi.push(tr('sull\'ampli in {0}', etichetteSlot(record)));
      if ((record.tags || []).length) pezzi.push(tr('{0} tag', record.tags.length));
      if (record.notes) pezzi.push(tr('con note'));
      if (record.famiglia) pezzi.push(tr('con famiglia'));
      // I banchi tengono i preset per identità, non per nome: togliere la
      // copia che sta in un banco ne svuota il posto (7 ottobre 2026).
      const neiBanchi = banchi.filter(b => (b.posti || []).includes(record.id)).map(b => b.nome);
      if (neiBanchi.length) pezzi.push(tr('nei banchi: {0}', neiBanchi.join(', ')));
      sotto.textContent = pezzi.join(' · ');
      dati.append(catena, sotto);

      const togli = document.createElement('button');
      togli.className = 'pericolo piccolo';
      togli.textContent = tr('Elimina');
      togli.addEventListener('click', async () => {
        const sullAmpli = residente(record)
          ? tr(' Sta sull\'ampli in {0}: l\'ampli non viene toccato, e alla prossima lettura ' +
               'quello slot andrà a uno degli altri con lo stesso nome.', etichetteSlot(record))
          : '';
        const banchiSuoi = banchi.filter(b => (b.posti || []).includes(record.id)).map(b => b.nome);
        const neiBanchiTesto = banchiSuoi.length
          ? ' ' + tr('<strong>Sta nei banchi {0}</strong>: quel posto resterà vuoto, e lo ' +
                     'riempi tu con uno degli altri.', testoConNome(banchiSuoi.join(', ')))
          : '';
        if (!await conferma(tr('eliminare un doppione'),
          tr('Eliminare <strong>{0}</strong>, entrato il {1}? Gli altri con lo stesso nome restano.',
             testoConNome(record.name), quando(record.createdAt)) + sullAmpli + neiBanchiTesto,
          { ok: tr('Elimina'), pericolo: true })) return;
        await store.remove(record.id);
        logLine(tr`doppione eliminato: «${record.name}» del ${quando(record.createdAt)}`);
        if (vista.aperto && String(vista.aperto).startsWith(record.id + ':')) vista.aperto = null;
        await ricarica();
        disegnaPreset();
        disegnaLive();
        disegnaDoppioni();
      });

      riga.append(lettera, dati, togli);
      box.appendChild(riga);
    }
    lista.appendChild(box);
  }
}
