// Sparkling Tones — pc/04-ampli.js: il collegamento, gli slot dell'ampli e quale preset sta sul palco.
//
// Come nell'app: appena collegati si leggono gli slot e si riversano in libreria
// (`importFromAmp`, che non tocca il lavoro dell'utente); poi si rilegge il suono che l'ampli
// sta facendo, e quello va sul palco. Uno slot si fa suonare **selezionandolo** con `0x0138`
// (istantaneo, niente scritture); un preset che non sta in nessuno slot va nel preset software
// (`loadPreset`: `0x0101` su `0x7f` + `0x0138`), come «Regola» nell'app.
'use strict';

/* ---------------------------------------------------------------- il tasto Collega */

function segnaCollegamento(s, etichetta) {
  const b = $('collega');
  const acceso = s === 'connected';
  b.classList.toggle('attivo', acceso);
  b.classList.toggle('primario', !acceso && s !== 'connecting');
  b.classList.toggle('attesa', s === 'connecting');
  $('collega-testo').textContent = acceso ? tr('Collegato') : s === 'connecting' ? (etichetta || tr('collego…')) : tr('Collega');
  b.disabled = s === 'connecting';
  b.title = acceso ? tr('scollega l\'ampli') : tr('collega l\'amplificatore via Bluetooth');
  $('nome-ampli').textContent = acceso && spark.state.name ? spark.state.name : '';
  // L'ampli è caduto col preset sul palco: quello che si vede resta, ma da qui in poi non parte
  // più niente. Diventa una copia da salvare in libreria, come l'editor dell'app senza ampli.
  if (!acceso && s !== 'connecting' && ora && !ora.offline) {
    ora.offline = true;
    ascoltoBase = false;
    stato(tr('l\'ampli si è scollegato: le modifiche restano qui, salvale in libreria.'), 'errore');
  }
  disegnaTutto();
  seguiAccordatore();
}

async function collega() {
  if (spark.connected) {
    const domanda = ora && ora.toccato
      ? tr('Hai delle modifiche non salvate: restano sullo schermo, ma l\'ampli non le riceverà più. Scollegare?')
      : tr('Scollegare l\'ampli?');
    if (await conferma(tr('scollegare'), domanda, { ok: tr('Scollega') })) await spark.disconnect();
    return;
  }
  if (!navigator.bluetooth && !spark.finto) {
    await avvisa(tr('niente Bluetooth'), tr('Questo browser non ha il Bluetooth per le pagine web: ' +
      'apri la pagina con Chrome o Edge aggiornati.'));
    return;
  }
  if (!await chiediPrimaDiLasciare()) return;
  try {
    await spark.connect();
    await spark.identify();
    if (spark.state.name) await store.setSetting('ultimoAmpli', spark.state.name);
    segnaCollegamento('connected');
    await leggiSlot();
    const s = spark.state.currentPreset;
    await apriDalVivo(Number.isInteger(s) && s < profilo.slot ? s : null);
  } catch (err) {
    stato(tr('errore: {0}', err.message), 'errore');
  }
}
$('collega').addEventListener('click', collega);

/** Legge gli slot e li riversa in libreria, come l'app appena collegata. */
async function leggiSlot() {
  try {
    const presets = await spark.readLibrary(profilo.slot, (i, max) => stato(tr('lettura slot {0} di {1}…', i + 1, max)));
    const slotVuoti = [];
    for (let s = profilo.slot; s < 8; s++) slotVuoti.push(s);
    const { added, omonimi } = await store.importFromAmp(presets, { slotVuoti });
    await ricarica();
    let detto = tr('letti {0} slot dall\'ampli', presets.length);
    if (added) detto += tr(', {0} nuovi in libreria', added);
    if (omonimi.length) detto += tr(' ({0} con un nome che c\'era già: non copiati)', omonimi.length);
    stato(detto, 'ok');
  } catch (err) {
    stato(tr('lettura interrotta: {0}', err.message), 'errore');
    await ricarica();
  }
}

/* ---------------------------------------------------------------- il preset sul palco */

function mettiSulPalco({ record, slot, letto, offline }) {
  const fonte = letto || record;
  const scelto = ora ? ora.scelto : 3;
  ora = {
    record: record || null,
    slot,
    nome: (fonte && fonte.name) || tr('(senza nome)'),
    effetti: copiaEffetti(fonte.effects),
    bpm: bpmDi(fonte),
    toccato: false,
    offline,
    attendibile: !offline,
    scelto: scelto < fonte.effects.length ? scelto : 0,
  };
  ora.meta = { uuid: fonte.uuid, version: fonte.version, description: fonte.description, icon: fonte.icon };
  ora.base = istantanea();
  ascoltoBase = false;
  modificheDaParte = null;
  azzeraStoria();
  $('cerca-modello').value = '';
  disegnaTutto();
}

/** Il record in libreria di un preset letto dall'ampli: per UUID, poi per nome. */
async function recordDi(letto) {
  return (letto.uuid ? await store.byUuid(letto.uuid) : null) || await store._omonimo(letto.name, null);
}

/** Rilegge il suono che l'ampli sta facendo e lo mette sul palco. */
async function apriDalVivo(slot) {
  stato(tr('leggo il suono che l\'ampli sta facendo…'));
  const letto = await spark.readLiveState();
  if (!letto) {
    // Senza la lettura le manopole partirebbero da valori che potrebbero non essere quelli veri.
    stato(tr('non riesco a rileggere il suono corrente: riprova con ⟳.'), 'errore');
    disegnaTutto();
    return false;
  }
  mettiSulPalco({ record: await recordDi(letto), slot, letto, offline: false });
  stato(tr('«{0}» è sull\'ampli: gira pure.', ora.nome), 'ok');
  return true;
}

/** Fa suonare uno slot (`0x0138`) e lo porta sul palco; senza ampli apre la sua copia in libreria. */
async function apriSlot(n) {
  if (n < 0 || n >= profilo.slot) return;
  if (ora && ora.slot === n && !ora.offline) return;
  if (!await chiediPrimaDiLasciare()) return;
  if (!spark.connected) {
    const record = suAmpli[n];
    if (!record) {
      stato(tr('di {0} non so niente: collega l\'ampli per leggerlo.', nomeSlot(n)), 'errore');
      return;
    }
    mettiSulPalco({ record, slot: n, offline: true });
    stato(tr('«{0}»: regolazioni senza ampli, sulla copia in libreria.', record.name));
    return;
  }
  await occupa(async () => {
    await codaVuota();
    await spark.send(Spark.commands.changePreset(n));
    // Il suono cambia subito (`0x0138`, come i pulsantoni dell'app); il palco mostra **subito** la
    // copia in libreria di quello slot, coi comandi fermi (`occupa`) finché la rilettura
    // dall'ampli non dà i valori veri: girare manopole su valori non riletti resta vietato.
    // (9 novembre 2026: l'utente lo trovava lento quando il palco aspettava la rilettura.)
    const record = suAmpli[n];
    if (record) {
      mettiSulPalco({ record, slot: n, offline: false });
      ora.attendibile = false;
      stato(tr('«{0}» — {1}', record.name, nomeSlot(n)));
    }
    await attendi(120);
    if (!await apriDalVivo(n) && record) {
      ora = null;          // senza la rilettura non si regola niente
      disegnaTutto();
    }
  });
}

/**
 * Un preset della libreria che non sta (per forza) in uno slot: con l'ampli va nel preset
 * software e si rilegge, come «Regola» nell'app; senza, si apre la copia in libreria.
 */
async function apriRecord(record) {
  if (!await chiediPrimaDiLasciare()) return;
  if (!spark.connected) {
    mettiSulPalco({ record, slot: null, offline: true });
    stato(tr('«{0}»: regolazioni senza ampli, sulla copia in libreria.', record.name));
    return;
  }
  const controllo = Spark.controllaPreset(record, { modelli: SparkEffetti.MODELLI.flat() });
  if (controllo.errori.length) {
    await avvisa(tr('non si può mandare'), tr('«{0}» non è mandabile così com\'è: {1}.',
      testoConNome(record.name), testoConNome(controllo.errori.slice(0, 3).join('; '))));
    return;
  }
  await occupa(async () => {
    const t0 = performance.now();
    const esito = await spark.loadPreset(record, (i, tot) => stato(tr('invio «{0}»: chunk {1} di {2}…', record.name, i + 1, tot)));
    if (!esito.ok) { stato(tr('invio interrotto: {0}', esito.error), 'errore'); return; }
    // Quanto ci mette il suono a partire, nel registro (12 novembre 2026: ~600 ms con la connessione veloce).
    const ms = Math.round(performance.now() - t0);
    console.log(`[tempo] «${record.name}»: ${esito.total} chunk, ${esito.acks} ack, ${ms} ms`);
    await attendi(400);
    const letto = await spark.readLiveState();
    if (!letto) { stato(tr('non riesco a rileggere il suono corrente.'), 'errore'); return; }
    mettiSulPalco({ record, slot: null, letto, offline: false });
    stato(tr('«{0}» è sull\'ampli: gira pure.', record.name), 'ok');
    if (schermoLive) { live.firma = ''; disegnaLive(); }
  });
}

/**
 * Prima di lasciare un preset con del lavoro non salvato: **tre vie**, come nell'app. Tornare
 * indietro (Esc, clic fuori) lascia tutto com'è. Torna true se si può andare avanti.
 */
async function chiediPrimaDiLasciare() {
  if (!ora || !ora.toccato) return true;
  const scelta = await finestra({
    titolo: tr('modifiche non salvate'),
    testo: tr('Hai girato qualcosa in <strong>{0}</strong> e non l\'hai ancora salvato.', testoConNome(ora.nome)) + ' ' +
      (ora.offline ? tr('Andando avanti così le modifiche vanno perse.')
                   : tr('Andando avanti così le perdi: in libreria e negli slot non ne resta niente.')),
    azioni: [
      { testo: tr('Torna al preset'), valore: null },
      { testo: tr('Annulla'), valore: 'via', pericolo: true },
      { testo: tr('Salva…'), valore: 'salva', primario: true },
    ],
  });
  if (scelta === 'via') { ora.toccato = false; return true; }
  if (scelta === 'salva') return await apriSalva();
  return false;
}

/* ---------------------------------------------------------------- la fila degli slot */

/* Gli slot stanno in cima alla libreria (`06-libreria.js`); qui restano ‹ ›, che li scorrono. */
function disegnaSlot() {
  disegnaLibreria();
  disegnaBanchi();
  const qui = ora && ora.slot !== null ? ora.slot : -1;
  $('prima').title = qui >= 0 ? tr('slot prima') : tr('ultimo slot');
  $('dopo').title = qui >= 0 ? tr('slot dopo') : tr('primo slot');
}

$('prima').addEventListener('click', () => {
  const qui = ora && ora.slot !== null ? ora.slot : 0;
  apriSlot((qui - 1 + profilo.slot) % profilo.slot);
});
$('dopo').addEventListener('click', () => {
  const qui = ora && ora.slot !== null ? ora.slot : -1;
  apriSlot((qui + 1) % profilo.slot);
});

$('rileggi').addEventListener('click', async () => {
  if (!spark.connected) return;
  if (ora && ora.toccato && !await conferma(tr('rileggere dall\'ampli'),
    tr('Rileggendo, sullo schermo torna quello che l\'ampli sta suonando adesso. Le modifiche non salvate ' +
       'restano sull\'ampli finché non cambi preset, ma qui spariscono.'), { ok: tr('Rileggi') })) return;
  await occupa(async () => {
    await codaVuota();
    await spark.request(Spark.commands.getCurrentPreset(), m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x10, 1500);
    const s = spark.state.currentPreset;
    await apriDalVivo(Number.isInteger(s) && s < profilo.slot ? s : null);
  });
});

/* Chi chiude o ricarica la pagina con del lavoro non salvato riceve la domanda del browser:
   l'unica finestra di sistema che resta, perché qui non se ne può disegnare una nostra. */
addEventListener('beforeunload', e => {
  if (ora && ora.toccato) { e.preventDefault(); e.returnValue = ''; }
});
