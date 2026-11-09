// Sparkling Tones — pc/05-file.js: salvare, importare ed esportare, il backup, Dropbox e il menu.
'use strict';

/* ================================================================ Salva…
   Nome, e dove: in libreria sempre (è lì che vive il preset), e — con l'ampli collegato — anche in
   uno slot, scelto qui; di partenza quello da cui viene il preset. Scrivere uno slot è la stessa
   strada di «Scrivi nello slot» dell'app (`storePreset`: `0x0101` su `[0x00, n]`, poi `0x0138`
   via e ritorno) e si verifica rileggendo lo slot. **Sovrascrivere uno slot non perde il preset**
   che c'era: resta in libreria (`_sistemaSlot`). Un nome che c'è già non entra due volte. */

function nuovoUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Il preset sul palco come oggetto completo (catena, tempo e nome di adesso). */
function presetDiOra(nome) {
  const m = ora.meta || {};
  return {
    uuid: m.uuid || nuovoUuid(),
    name: nome || ora.nome,
    version: m.version || '0.7',
    description: m.description || '',
    icon: m.icon || 'icon.png',
    bpm: ora.bpm,
    effects: copiaEffetti(ora.effetti),
  };
}

/** @returns true se ha salvato davvero (chi lo chiama per andare avanti deve saperlo). */
async function apriSalva() {
  if (!ora) return false;
  const collegato = spark.connected && !ora.offline;
  let slotScelto = collegato ? ora.slot : null;

  const corpo = document.createElement('div');
  if (collegato) {
    corpo.innerHTML = `<h3>${tr('Anche nello slot dell\'ampli')}</h3>`;
    const fila = document.createElement('div');
    fila.className = 'scegli-slot';
    const segna = () => fila.querySelectorAll('button').forEach(b =>
      b.classList.toggle('sì', String(slotScelto) === b.dataset.slot));
    const tasto = (testo, valore, titolo) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = testo;
      b.dataset.slot = String(valore);
      if (titolo) b.title = titolo;
      b.addEventListener('click', () => { slotScelto = valore; segna(); });
      fila.appendChild(b);
    };
    tasto(tr('No, solo in libreria'), null);
    for (let n = 0; n < profilo.slot; n++) tasto(nomeSlot(n), n, suAmpli[n] ? suAmpli[n].name : '');
    segna();
    corpo.appendChild(fila);
    const nota = document.createElement('p');
    nota.style.marginTop = '10px';
    nota.textContent = tr('Il preset che stava nello slot non si perde: resta in libreria.');
    corpo.appendChild(nota);
  }

  const azioni = [{ testo: tr('Annulla'), valore: null }];
  if (ora.record) azioni.push({ testo: tr('Salva come nuovo'), valore: 'nuovo' });
  azioni.push({ testo: tr('Salva'), valore: 'salva', primario: true });

  const r = await finestra({
    titolo: tr('salvare il preset'),
    testo: ora.record
      ? tr('In libreria si aggiorna <strong>{0}</strong>: tag, note e famiglia restano. «Salva come nuovo» ne fa una copia.',
           testoConNome(ora.record.name))
      : tr('Il preset va in libreria come preset nuovo.'),
    campo: { valore: ora.nome, invito: tr('nome del preset') },
    corpo,
    azioni,
  });
  if (!r) return false;
  const nome = r.testo.replace(/\s+/g, ' ').trim();
  if (!nome) { await avvisa(tr('manca il nome'), tr('Scrivi un nome per il preset.')); return false; }
  return await salva(nome, r.azione === 'nuovo' || !ora.record, slotScelto);
}

async function salva(nome, comeNuovo, slot) {
  // Un nome che c'è già non entra due volte (regola dell'utente, 7 ottobre 2026).
  const omonimo = await store._omonimo(nome, null);
  if (omonimo && (comeNuovo || omonimo.id !== ora.record.id)) {
    await avvisa(tr('nome già usato'), tr('In libreria c\'è già un preset che si chiama <strong>{0}</strong>: scegli un altro nome.',
      testoConNome(omonimo.name)));
    return false;
  }

  let record;
  try {
    if (comeNuovo) {
      // Una copia vera ha un UUID suo: con quello di prima l'ampli e la libreria la scambierebbero per l'originale.
      // Senza record in libreria il preset dell'ampli entra col suo UUID; una copia ne ha uno nuovo.
      const nuovo = Object.assign(presetDiOra(nome),
        { uuid: ora.record ? nuovoUuid() : ((ora.meta && ora.meta.uuid) || nuovoUuid()), slots: [] });
      const id = await store.add(nuovo);
      record = await store.get(id);
    } else {
      record = await store.get(ora.record.id);
      if (!record) { stato(tr('il preset non è più in libreria.'), 'errore'); return false; }
      record.name = nome;
      record.effects = copiaEffetti(ora.effetti);
      record.bpm = ora.bpm;
      await store.put(record);
    }
  } catch (err) {
    stato(tr('salvataggio fallito: {0}', err.message), 'errore');
    return false;
  }

  ora.record = record;
  ora.nome = record.name;
  ora.meta = { uuid: record.uuid, version: record.version, description: record.description, icon: record.icon };
  ora.base = istantanea();
  ora.toccato = false;
  await ricarica();
  disegnaTutto();
  stato(tr('«{0}» salvato in libreria.', record.name), 'ok');

  if (slot === null || slot === undefined || !spark.connected || ora.offline) return true;
  return await scriviNelloSlot(record, slot);
}

async function scriviNelloSlot(record, slot) {
  const controllo = Spark.controllaPreset(record, { modelli: SparkEffetti.MODELLI.flat() });
  if (controllo.errori.length) {
    stato(tr('«{0}» non si può scrivere sull\'ampli: {1}', record.name, controllo.errori[0]), 'errore');
    return true;   // in libreria è salvato
  }
  let ok = false;
  await occupa(async () => {
    await codaVuota();
    const esito = await spark.storePreset(record, slot,
      (i, tot) => stato(tr('scrivo «{0}» in {1}: chunk {2} di {3}…', record.name, nomeSlot(slot), i + 1, tot)));
    if (!esito.ok) { stato(tr('scrittura interrotta: {0}. Rileggi per controllare.', esito.error), 'errore'); return; }
    await attendi(400);
    // L'ack conferma la ricezione, non l'esecuzione: la prova è ritrovarlo nello slot.
    const letto = await spark.readPreset(slot);
    if (letto && letto.uuid === record.uuid) {
      await store.assignSlots({ [record.id]: slot });
      await ricarica();
      ok = true;
      // Lo slot scritto è anche quello che l'ampli suona adesso: se è il preset del palco basta
      // dirlo, se è un altro (dal menu della libreria) va sul palco lui.
      if (ora && ora.record && ora.record.id === record.id) ora.slot = slot;
      else await apriDalVivo(slot);
      stato(tr('«{0}» è in {1}. Verificato rileggendo lo slot.', record.name, nomeSlot(slot)), 'ok');
    } else {
      stato(tr('in libreria è salvato, ma {0} riporta ancora «{1}»: lo slot non è cambiato.',
        nomeSlot(slot), letto ? letto.name : '?'), 'errore');
    }
  });
  disegnaTutto();
  return true;
}

$('salva').addEventListener('click', () => apriSalva());

/* ================================================================ Esporta e Importa
   Esporta il preset sul palco (modifiche comprese) nel formato del backup della libreria, con un
   preset solo dentro: l'app lo reimporta con «Importa un file». Importa riconosce dal contenuto,
   come l'app (`PK` = backup dell'app ufficiale, `presets` = backup nostro, il resto = preset
   singoli dell'app ufficiale); un preset solo, una volta in libreria, va sul palco. */

$('esporta').addEventListener('click', () => {
  if (!ora) return;
  const preset = presetDiOra();
  if (ora.record) {
    for (const campo of ['tags', 'notes', 'favorite', 'famiglia']) {
      if (ora.record[campo] !== undefined) preset[campo] = ora.record[campo];
    }
  }
  const backup = { format: 'spark-controller-library', version: 2, exportedAt: new Date().toISOString(), presets: [preset] };
  scaricaFile(nomeFile(preset.name) + '.json', JSON.stringify(backup, null, 2));
  stato(tr('«{0}» esportato nei Download.', preset.name), 'ok');
});

$('importa').addEventListener('click', () => $('file-importa').click());

$('file-importa').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) await importaZip(file, buffer);
    else await importaJson(file, bytes);
  } catch (err) {
    stato(tr('importazione fallita: {0}', err.message), 'errore');
  }
});

async function importaZip(file, buffer) {
  stato(tr('leggo {0}…', file.name));
  const { presets, saltati } = await SparkBackup.parseBackup(buffer);
  if (!await conferma(tr('importare il backup dell\'app ufficiale'),
    tr('Mettere in libreria <strong>{0} preset</strong> da <strong>{1}</strong>? Quelli che hai già prendono il ' +
       'suono nuovo; tag, note e famiglia restano.', presets.length, testoConNome(file.name)),
    { ok: tr('Importa') })) { stato(''); return; }
  const { added, updated } = await store.importFromBackup(presets);
  await ricarica();
  stato(tr('{0} preset dal backup: {1} nuovi, {2} aggiornati{3}. Li trovi nell\'app.', presets.length, added, updated,
    saltati.length ? tr(', {0} saltati', saltati.length) : ''), 'ok');
}

async function importaJson(file, bytes) {
  let json;
  try { json = JSON.parse(new TextDecoder().decode(bytes)); }
  catch (err) { throw new Error(tr('{0} non è né uno zip né un JSON', file.name)); }

  if (json && Array.isArray(json.presets)) {
    // Un file non è un altro apparecchio: le sue cancellazioni non valgono (lapidi: false).
    const n = json.presets.length;
    const uno = n === 1 ? json.presets[0] : null;
    if (!await conferma(tr('importare'), uno
      ? tr('Mettere in libreria <strong>{0}</strong> e aprirlo qui? Se ce l\'hai già, ne prende suono, tag e note.',
           testoConNome(uno.name))
      : tr('Mettere in libreria <strong>{0} preset</strong> da <strong>{1}</strong>? I preset che hai già prendono il ' +
           'suono <strong>e anche tag, note e ordine</strong> del file. Non viene cancellato niente.', n, testoConNome(file.name)),
      { ok: uno ? tr('Importa e apri') : tr('Importa {0} preset', n) })) return;
    if (json.format !== 'spark-controller-library') json = Object.assign({ format: 'spark-controller-library' }, json);
    const quanti = await store.importBackup(json, { lapidi: false });
    await ricarica();
    stato(tr('importati {0} preset da {1}', quanti, file.name), 'ok');
    if (uno && uno.uuid) {
      const record = await store.byUuid(uno.uuid);
      if (record) await apriRecord(record);
    }
    return;
  }

  const grezzi = SparkBackup.trovaPresetUfficiali(json);
  if (!grezzi.length) throw new Error(tr('in {0} non c\'è nessun preset che sappia leggere', file.name));
  const presets = [], saltati = [];
  for (const grezzo of grezzi) {
    const meta = grezzo.meta || {};
    const conId = meta.id ? grezzo : Object.assign({}, grezzo, { meta: Object.assign({}, meta, { id: nuovoUuid() }) });
    try { presets.push(SparkBackup.convertiPreset(conId, null)); } catch (err) { saltati.push(err.message); }
  }
  if (!presets.length) throw new Error(saltati[0] || tr('nessun preset leggibile'));
  const uno = presets.length === 1 ? presets[0] : null;
  if (!await conferma(tr('importare'), uno
    ? tr('Mettere in libreria <strong>{0}</strong> e aprirlo qui? Se ce l\'hai già, se ne aggiorna il suono.', testoConNome(uno.name))
    : tr('Mettere in libreria <strong>{0} preset</strong>? Quelli che hai già prendono il suono nuovo.', presets.length),
    { ok: uno ? tr('Importa e apri') : tr('Importa') })) return;
  const { added, updated } = await store.importFromBackup(presets);
  await ricarica();
  stato(tr('da {0}: {1} nuovi, {2} aggiornati', file.name, added, updated), 'ok');
  if (uno) {
    const record = await store.byUuid(uno.uuid);
    if (record) await apriRecord(record);
  }
}

/* ================================================================ Backup e Dropbox
   Gli stessi gesti dell'app, con le stesse impostazioni (stessa origine, stessa libreria):
   scaricare e ripristinare il backup; con Dropbox «Manda su» e «Prendi» (che fonde e può
   togliere: si chiede). Le lapidi valgono solo per il sync, non per un file. */
let dropbox = null;

async function preparaDropbox() {
  dropbox = new DropboxSync.Client({
    appKey: await store.getSetting('dropboxChiave', ''),
    refreshToken: await store.getSetting('dropboxRefresh', null),
    salvaRefresh: valore => store.setSetting('dropboxRefresh', valore),
  });
}

async function apriBackup() {
  const corpo = document.createElement('div');
  const ridisegna = async () => {
    const collegato = dropbox && dropbox.autorizzato();
    const inSospeso = !collegato && await store.getSetting('dropboxVerifier', null);
    corpo.innerHTML = `
      <h3>${tr('Sul PC')}</h3>
      <p>${tr('Un file JSON con tutta la libreria: preset, tag, note, categorie e banchi.')}</p>
      <div class="riga-azioni"><button class="primario" data-f="scarica">${tr('Scarica il backup')}</button>
        <button data-f="ripristina">${tr('Ripristina da un file…')}</button></div>
      <h3>Dropbox</h3>
      <div class="scatola">${collegato ? `
        <div class="stato-db"><span class="lampada on"></span><span data-f="quando">${tr('Collegato.')}</span></div>
        <div class="riga-azioni"><button class="primario" data-f="su">${tr('Manda su')}</button>
          <button data-f="giu">${tr('Prendi da Dropbox')}</button><button data-f="via">${tr('Scollega')}</button></div>` : `
        <p>${tr('L\'app key della tua app Dropbox (come spiegato nella guida dell\'app):')}</p>
        <input type="text" data-f="chiave" autocomplete="off">
        <div class="riga-azioni"><button class="primario" data-f="collega">${tr('Collega Dropbox')}</button></div>
        <div data-f="passo2" ${inSospeso ? '' : 'hidden'}>
          <p style="margin-top:12px">${tr('Autorizza su Dropbox (<a data-f="link" target="_blank" rel="noopener">apri la pagina</a>), poi incolla qui il codice:')}</p>
          <input type="text" data-f="codice" autocomplete="off">
          <div class="riga-azioni"><button class="primario" data-f="fine">${tr('Fatto')}</button></div>
        </div>`}
      </div>
      <p style="margin-top:12px">${tr('La libreria è la stessa dell\'app aperta su questo PC allo stesso indirizzo.')}</p>
      <div class="stato-finestra" data-f="stato"></div>`;
    const q = f => corpo.querySelector(`[data-f="${f}"]`);
    // Il valore si mette da qui e non nell'HTML: un testo dentro un attributo potrebbe uscirne.
    if (q('chiave')) q('chiave').value = dropbox ? dropbox.appKey : '';
    const dire = t => { q('stato').textContent = t || ''; };
    q('scarica').onclick = async () => {
      const backup = await store.exportAll();
      scaricaFile(`spark-libreria-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
      dire(tr('{0} preset scaricati nei Download.', backup.presets.length));
    };
    q('ripristina').onclick = () => { chiudiFinestra(null); $('file-importa').click(); };
    if (collegato) {
      (async () => {
        try {
          const info = await dropbox.info();
          if (q('quando')) q('quando').textContent = info
            ? tr('Collegato. Lassù: {0}, {1} KB.', new Date(info.quando).toLocaleString(Lingua.attuale), Math.round(info.byte / 1024))
            : tr('Collegato. Su Dropbox non c\'è ancora niente: il primo invio lo crea.');
        } catch (err) { dire(tr('non riesco a leggere Dropbox: {0}', err.message)); }
      })();
      q('su').onclick = async () => {
        dire(tr('mando la libreria su Dropbox…'));
        try {
          const backup = await store.exportAll();
          await dropbox.carica(JSON.stringify(backup, null, 2));
          dire(tr('{0} preset mandati su Dropbox.', backup.presets.length));
        } catch (err) { dire(tr('non sono riuscito a mandarla su: {0}', err.message)); }
      };
      q('giu').onclick = async () => {
        chiudiFinestra(null);
        if (!await conferma(tr('prendere da Dropbox'), tr('Prendere la libreria da Dropbox e fonderla con questa? ' +
          '<strong>Quello che è stato cancellato sull\'altro apparecchio sparisce anche qui</strong>, se qui non l\'hai toccato dopo.'),
          { ok: tr('Prendi e fondi') })) return;
        stato(tr('prendo la libreria da Dropbox…'));
        try {
          const quanti = await store.importBackup(JSON.parse(await dropbox.scarica()));
          await ricarica();
          disegnaTutto();
          stato(tr('{0} preset presi da Dropbox.', quanti), 'ok');
        } catch (err) { stato(tr('non sono riuscito a prenderla: {0}', err.message), 'errore'); }
      };
      q('via').onclick = async () => {
        chiudiFinestra(null);
        if (!await conferma(tr('scollegare Dropbox'), tr('Scollegare Dropbox? La libreria qui e quella lassù restano dove sono: ' +
          'smettono solo di parlarsi.'), { ok: tr('Scollega') })) return;
        const revocato = await dropbox.scollega();
        stato(revocato ? tr('Dropbox scollegato.') : tr('Dropbox scollegato qui; lassù toglilo da dropbox.com, nelle app collegate.'), 'ok');
      };
    } else {
      const mettiLink = async verifier => {
        q('link').href = DropboxSync.urlAutorizza(dropbox.appKey, await DropboxSync.sfida(verifier));
        q('passo2').hidden = false;
      };
      if (inSospeso && dropbox.appKey) await mettiLink(inSospeso);
      q('collega').onclick = async () => {
        const chiave = q('chiave').value.trim();
        if (!chiave) { dire(tr('serve l\'app key della tua app Dropbox')); return; }
        await store.setSetting('dropboxChiave', chiave);
        dropbox.appKey = chiave;
        // Il verifier si riusa: rigenerarlo renderebbe inservibile il codice che si sta copiando.
        let verifier = await store.getSetting('dropboxVerifier', null);
        if (!verifier) { verifier = DropboxSync.nuovoVerifier(); await store.setSetting('dropboxVerifier', verifier); }
        await mettiLink(verifier);
        const aperta = window.open(q('link').href, '_blank', 'noopener');
        dire(aperta ? tr('autorizza su Dropbox, poi incolla qui il codice')
                    : tr('il browser ha bloccato la finestra: apri Dropbox col link qui sopra'));
      };
      q('fine').onclick = async () => {
        const codice = q('codice').value.trim();
        if (!codice) { dire(tr('incolla il codice che ti ha dato Dropbox')); return; }
        const verifier = await store.getSetting('dropboxVerifier', null);
        if (!verifier) { dire(tr('l\'autorizzazione è scaduta: ricomincia')); return; }
        try {
          await dropbox.completaAutorizzazione(verifier, codice);
          await store.setSetting('dropboxVerifier', null);
          await ridisegna();
          dire(tr('Dropbox collegato.'));
        } catch (err) {
          dire(tr('Dropbox non ha accettato il codice ({0}). Un codice vale una volta sola: riapri la pagina e incolla quello nuovo.',
            err.message));
        }
      };
    }
  };
  await ridisegna();
  await finestra({ titolo: tr('Backup e Dropbox'), corpo, larga: true });
}

/* ================================================================ Impostazioni */

async function apriImpostazioni() {
  const corpo = document.createElement('div');
  const riga = (etichetta, voci, attuale, quando) => {
    const r = document.createElement('div');
    r.className = 'riga-impost';
    r.innerHTML = `<span>${etichetta}</span>`;
    const seg = document.createElement('div');
    seg.className = 'segmenti';
    for (const [valore, testo] of voci) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = testo;
      if (valore === attuale) b.classList.add('sì');
      b.addEventListener('click', () => quando(valore));
      seg.appendChild(b);
    }
    r.appendChild(seg);
    corpo.appendChild(r);
  };
  riga(tr('Pacchetto Jimi Hendrix'), [['sì', tr('Sì')], ['no', tr('No')]], haHendrix() ? 'sì' : 'no', v => {
    try { localStorage.setItem('hendrix', v === 'no' ? 'no' : 'si'); } catch (e) { /* resta per questa volta */ }
    chiudiFinestra(null);
    disegnaTutto();
  });
  riga(tr('Lingua'), [['it', 'Italiano'], ['en', 'English']], Lingua.attuale, async v => {
    if (v === Lingua.attuale) return;
    if (ora && ora.toccato && !await chiediPrimaDiLasciare()) return;
    if (spark.connected && !await conferma(tr('Cambiare lingua?'), tr('La pagina si ricarica e l\'ampli si scollega.'),
      { ok: tr('Cambia') })) return;
    if (ora) ora.toccato = false;
    Lingua.imposta(v);
  });
  await finestra({ titolo: tr('Impostazioni'), corpo });
}

/* ================================================================ il menu ☰ */
const ICONE = {
  backup: '<path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9M12 12v8M9 15l3-3 3 3"/>',
  impost: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  guida: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  telefono: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  posta: '<path d="M4 6h16v12H4zM4 7l8 6 8-6"/>',
  caffe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
  ampli: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 9h12M7 14h.01M10 14h.01M13 14h.01M16 14h.01"/>',
  cartella: '<path d="M3 5h7l2 2h9v12H3z"/>',
  doppioni: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  gioco: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 13h.01M16 13h.01"/>',
};

/**
 * «Importa preset attuale» dell'app: legge il suono che l'ampli sta facendo e lo porta in
 * libreria (un nome che c'è già si aggiorna, tag e note restano). Utile dopo aver girato le
 * manopole vere o scelto un tono dall'app ufficiale.
 */
async function prendiSuonoAttuale() {
  if (!spark.connected) return avvisa(tr('serve l\'ampli'), tr('Premi «Collega» in alto e riprova.'));
  if (!await chiediPrimaDiLasciare()) return;
  const corrente = await spark.readLiveState();
  if (!corrente) { stato(tr('nessuna risposta alla lettura del suono corrente.'), 'errore'); return; }
  const esistente = (corrente.uuid ? await store.byUuid(corrente.uuid) : null) || await store._omonimo(corrente.name, null);
  if (!await conferma(esistente ? tr('aggiornare il suono') : tr('salvare in libreria'), esistente
    ? tr('<strong>{0}</strong> è già in libreria. Aggiornarne il suono con quello che l\'ampli sta suonando adesso? Tag, note e famiglia restano.',
         testoConNome(esistente.name))
    : tr('Salvare <strong>{0}</strong> in libreria come preset nuovo?', testoConNome(corrente.name)),
    { ok: esistente ? tr('Aggiorna il suono') : tr('Salva in libreria') })) return;
  const { added } = await store.importFromAmp([corrente], { aggiornaOmonimi: true });
  await ricarica();
  mettiSulPalco({ record: await recordDi(corrente), slot: ora ? ora.slot : null, letto: corrente, offline: false });
  stato(added ? tr('«{0}» aggiunto alla libreria', corrente.name) : tr('«{0}» aggiornato in libreria', corrente.name), 'ok');
}
const icona = k => `<svg viewBox="0 0 24 24">${ICONE[k]}</svg>`;

const INDIRIZZO_SEGNALAZIONI = 'mazzbackup@gmail.com';
const PAGINA_CAFFE = 'https://buymeacoffee.com/mazzgear';

function segnalaProblema() {
  const righe = [
    'SparklingTones PC',
    'Browser: ' + navigator.userAgent,
    'Ampli: ' + (spark.state.name || '?') + (spark.connected ? ' — ' + tr('collegato') : ''),
    '', tr('Cosa è successo:'), '', '', '— ' + tr('ultime righe del registro') + ' —',
    ...registro.slice(-25),
  ];
  // Un mailto troppo lungo non si apre: si taglia il registro.
  let corpo = righe.join('\n');
  if (corpo.length > 1800) corpo = corpo.slice(0, 1800);
  location.href = `mailto:${INDIRIZZO_SEGNALAZIONI}?subject=${encodeURIComponent('SparklingTones PC: segnalazione')}` +
    `&body=${encodeURIComponent(corpo)}`;
}

$('menu').addEventListener('click', e => apriTendina(e.currentTarget, t => {
  t.style.minWidth = '260px';
  t.insertAdjacentHTML('beforeend', `<div class="famiglia">${tr('Ampli')}</div>`);
  // Nessuna voce si spegne (regola dell'app): senza ampli rispondono spiegando cosa serve.
  voceTendina(t, icona('ampli') + tr('Rileggi gli slot dell\'ampli'), async () => {
    if (!spark.connected) return avvisa(tr('serve l\'ampli'), tr('Premi «Collega» in alto e riprova.'));
    await occupa(async () => { await codaVuota(); await leggiSlot(); });
    disegnaTutto();
  });
  voceTendina(t, icona('ampli') + tr('Prendi in libreria il suono dell\'ampli'), prendiSuonoAttuale);
  t.insertAdjacentHTML('beforeend', `<div class="famiglia">${tr('Libreria')}</div>`);
  voceTendina(t, icona('cartella') + tr('Categorie e famiglie…'), apriCategorie);
  voceTendina(t, icona('doppioni') + tr('Doppioni…'), () => apriDoppioni('suono'));
  voceTendina(t, icona('backup') + tr('Backup e Dropbox…'), apriBackup);
  voceTendina(t, icona('cestino') + tr('Elimina tutti i preset…'), svuotaLibreria, { classe: 'pericolo' });
  t.insertAdjacentHTML('beforeend', '<hr>');
  voceTendina(t, icona('impost') + tr('Impostazioni…'), apriImpostazioni);
  voceTendina(t, icona('guida') + tr('Guida'), () => window.open(Lingua.attuale === 'en' ? 'guida.en.html' : 'guida.html', '_blank', 'noopener'));
  voceTendina(t, icona('info') + tr('Informazioni, licenze e responsabilità'), apriInformazioni);
  voceTendina(t, icona('telefono') + tr('Apri l\'app per il telefono'), () => window.open('index.html', '_blank', 'noopener'));
  t.insertAdjacentHTML('beforeend', '<hr>');
  voceTendina(t, icona('posta') + tr('Segnala un problema'), segnalaProblema);
  voceTendina(t, icona('gioco') + tr('Fai una pausa'), () => SnakePedali.apri());
  // In un'altra scheda: lasciare la pagina farebbe cadere l'ampli.
  voceTendina(t, icona('caffe') + tr('Offrimi un caffè'), () => window.open(PAGINA_CAFFE, '_blank', 'noopener'), { classe: 'voce-caffe' });
}, { destra: true }));
