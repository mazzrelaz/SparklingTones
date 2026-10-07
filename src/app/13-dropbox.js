// Sparkling Tones — 13-dropbox.js: Dropbox.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Dropbox — la stessa libreria sul computer e sul telefono

   Il problema che risolve: `file://` e `https://` sono due origini con due
   IndexedDB diversi, e la libreria non passa dall'una all'altra né dal
   computer al telefono. Il trasporto sta in `dropbox-sync.js`; qui c'è solo
   il pannello, e la regola dei due gesti espliciti.
   ==================================================================== */

// Vive per tutta la sessione: dentro ci sta il token di accesso, che dura
// quattro ore e si rifà da sé. Il refresh token invece sta in `settings`.
let dropbox = null;

async function preparaDropbox() {
  dropbox = new DropboxSync.Client({
    appKey:       await store.getSetting('dropboxChiave', ''),
    refreshToken: await store.getSetting('dropboxRefresh', null),
    salvaRefresh: valore => store.setSetting('dropboxRefresh', valore),
  });
  $('dropboxChiave').value = dropbox.appKey;
  disegnaDropbox();

  // Un'autorizzazione lasciata a metà va **ripresa**, non ricominciata. Fra
  // l'apertura della pagina di Dropbox e il ritorno qui la scheda può essere
  // ricaricata — sul telefono succede quasi sempre — e con lei sparisce il
  // campo dove incollare il codice. Chi torna con un codice in mano e non
  // trova dove metterlo ripreme «Collega»: e quello genera un verifier nuovo,
  // che rende quel codice inservibile per sempre. È la trappola che fa dire
  // «inserisco il codice e non funziona».
  const inSospeso = await store.getSetting('dropboxVerifier', null);
  if (inSospeso && !dropbox.autorizzato() && dropbox.appKey) {
    $('dropboxPassoDue').hidden = false;
    $('dropboxLink').href = DropboxSync.urlAutorizza(
      dropbox.appKey, await DropboxSync.sfida(inSospeso));
  }
}

function disegnaDropbox() {
  const collegato = Boolean(dropbox && dropbox.autorizzato());
  $('dropboxCollegato').hidden   = !collegato;
  $('dropboxDaCollegare').hidden = collegato;
}

/**
 * La data del file lassù, accanto ai pulsanti. Prendere qualcosa senza
 * sapere se è più vecchio di quello che si ha è il modo migliore di
 * pentirsene, e una riga di testo costa una chiamata sola.
 */
async function leggiDataDropbox() {
  if (!dropbox || !dropbox.autorizzato()) return;
  const riga = $('dropboxQuando');
  riga.textContent = tr('controllo cosa c\'è su Dropbox…');
  try {
    const info = await dropbox.info();
    riga.textContent = info
      ? tr('Lassù: {0}, {1} KB.', new Date(info.quando).toLocaleString(Lingua.attuale),
           Math.round(info.byte / 1024))
      : tr('Su Dropbox non c\'è ancora niente: il primo invio lo crea.');
  } catch (err) {
    riga.textContent = tr('non riesco a leggere Dropbox: {0}', err.message);
  }
}

$('btnDropboxCollega').addEventListener('click', async () => {
  const chiave = $('dropboxChiave').value.trim();
  if (!chiave) { statoDelPannello(tr('serve l\'app key della tua app Dropbox')); return; }
  await store.setSetting('dropboxChiave', chiave);
  dropbox.appKey = chiave;
  try {
    // Il verifier si **riusa**, non si rigenera. Un verifier non scade e non
    // si consuma: lo stesso segreto vale per quante pagine di autorizzazione
    // si vuole, e la pagina riaperta dà ogni volta un codice nuovo che
    // combacia. Rigenerarlo a ogni «Collega» invece uccideva il codice che
    // l'utente aveva appena copiato — e Dropbox lo rifiuta dicendo «code
    // doesn't exist or has expired», che manda a cercare nel posto sbagliato.
    // Si butta solo quando l'autorizzazione riesce.
    let verifier = await store.getSetting('dropboxVerifier', null);
    if (!verifier) {
      verifier = DropboxSync.nuovoVerifier();
      await store.setSetting('dropboxVerifier', verifier);
    }
    const url = DropboxSync.urlAutorizza(chiave, await DropboxSync.sfida(verifier));
    $('dropboxPassoDue').hidden = false;
    $('dropboxLink').href = url;
    // Se il browser blocca la finestra, `window.open` torna null e non
    // succede niente: da fuori il pulsante sembra rotto. Il link resta lì da
    // toccare, e va detto.
    const finestra = window.open(url, '_blank', 'noopener');
    statoDelPannello(finestra
      ? tr('autorizza su Dropbox, poi incolla qui il codice')
      : tr('il browser ha bloccato la finestra: apri Dropbox col link qui sopra'));
  } catch (err) {
    statoDelPannello(tr('non riesco a partire: {0}', err.message));
  }
});

$('btnDropboxFine').addEventListener('click', async () => {
  const codice = $('dropboxCodice').value.trim();
  if (!codice) { statoDelPannello(tr('incolla il codice che ti ha dato Dropbox')); return; }
  const verifier = await store.getSetting('dropboxVerifier', null);
  if (!verifier) { statoDelPannello(tr('l\'autorizzazione è scaduta: ricomincia')); return; }
  try {
    await dropbox.completaAutorizzazione(verifier, codice);
    await store.setSetting('dropboxVerifier', null);
    $('dropboxCodice').value = '';
    $('dropboxPassoDue').hidden = true;
    disegnaDropbox();
    logLine(tr('Dropbox collegato'));
    await leggiDataDropbox();
  } catch (err) {
    // Il verifier non si butta: la pagina di Dropbox si riapre dallo stesso
    // link e dà un codice nuovo per lo stesso segreto. Un codice si spende una
    // volta sola, ed è la causa di gran lunga più probabile di questo errore.
    statoDelPannello(tr('Dropbox non ha accettato il codice ({0}). ' +
      'Un codice vale una volta sola: riapri Dropbox col link qui sopra e ' +
      'incolla quello nuovo.', err.message));
  }
});

$('btnDropboxSu').addEventListener('click', async () => {
  statoDelPannello(tr('mando la libreria su Dropbox…'));
  try {
    const backup = await store.exportAll();
    await dropbox.carica(JSON.stringify(backup, null, 2));
    logLine(tr`${backup.presets.length} preset mandati su Dropbox`);
    await leggiDataDropbox();
  } catch (err) {
    statoDelPannello(tr('non sono riuscito a mandarla su: {0}', err.message));
  }
});

$('btnDropboxGiu').addEventListener('click', async () => {
  // Prendere può anche togliere: un preset cancellato sull'altro apparecchio
  // sparisce anche qui. È il gesto meno reversibile dei due, e va chiesto.
  if (!await conferma(tr('prendere da Dropbox'),
    tr('Prendere la libreria da Dropbox e fonderla con questa? ' +
    '<strong>Quello che è stato cancellato sull\'altro apparecchio sparisce anche ' +
    'qui</strong>, se qui non l\'hai toccato dopo.'),
    { ok: tr('Prendi e fondi') })) return;
  statoDelPannello(tr('prendo la libreria da Dropbox…'));
  try {
    const testo  = await dropbox.scarica();
    const quanti = await store.importBackup(JSON.parse(testo));
    logLine(tr`${quanti} preset presi da Dropbox`);
    await ricarica();
    disegnaPreset();
    disegnaLive();
    await leggiDataDropbox();
  } catch (err) {
    statoDelPannello(tr('non sono riuscito a prenderla: {0}', err.message));
  }
});

$('btnDropboxVia').addEventListener('click', async () => {
  if (!await conferma(tr('scollegare Dropbox'),
    tr('Scollegare Dropbox? La libreria qui e quella lassù restano dove sono: ' +
    'smettono solo di parlarsi.'), { ok: tr('Scollega') })) return;
  const revocato = await dropbox.scollega();
  disegnaDropbox();
  logLine(revocato
    ? tr('Dropbox scollegato, e l\'autorizzazione è revocata anche lassù')
    : tr('Dropbox scollegato qui, ma lassù non ho potuto revocare l\'autorizzazione: ' +
      'se vuoi, toglila da dropbox.com, nelle app collegate'));
});

/**
 * Fare piazza pulita. Due conferme, e non è un vezzo: la prima dice quanti
 * preset spariscono, la seconda dice che non si torna indietro e che, con
 * Dropbox collegato, la cosa viaggia. Chi preme due volte sa cosa fa.
 *
 * Gli otto dell'ampli restano: sono quelli che l'ampli suona adesso, quindi
 * la prima lettura li rimetterebbe dentro comunque — ma spogliati di tag,
 * note e famiglia, e quello sì che sarebbe lavoro perso.
 */
$('btnSvuota').addEventListener('click', async () => {
  const quanti = (await store.all()).filter(r => !(r.slots || []).length).length;
  if (!quanti) {
    statoDelPannello(tr('non c\'è niente da togliere: in libreria ci sono solo gli otto dell\'ampli'));
    return;
  }
  if (!await conferma(tr('svuotare la libreria'),
    tr('Eliminare <strong>{0} preset</strong> dalla libreria? Restano solo quelli ' +
    'caricati sull\'ampli, e l\'ampli non viene toccato.', quanti),
    { ok: tr`Elimina ${quanti} preset`, pericolo: true })) return;
  if (!await conferma(tr('ultima conferma'),
    tr('<strong>{0} preset, e non si torna indietro.</strong> Se usi Dropbox, al ' +
    'prossimo «Manda su» spariranno anche dagli altri apparecchi.', quanti),
    { ok: tr('Sì, elimina'), pericolo: true })) return;

  statoDelPannello(tr('elimino…'));
  const tolti = await store.svuotaTranneAmpli();
  logLine(tr`${tolti} preset eliminati dalla libreria; gli otto dell'ampli restano`);
  vista.aperto = null;
  await ricarica();
  disegnaPreset();
  disegnaLive();
});

/**
 * Il marchio va in ogni schermata, pannelli compresi. Si copia quello
 * dell'intestazione invece di ripeterlo cinque volte nel markup: così i
 * pannelli che si aggiungeranno ce l'hanno senza doverselo ricordare, e se
 * il file del logo manca non si copia niente — l'originale si è già tolto
 * da solo e non resta un'icona rotta in cima a ogni pannello.
 */
/**
 * Il marchio riporta ai preset da dovunque ci si trovi: pannello aperto,
 * vista live, editor. È la via d'uscita che ci si aspetta da un logo, e in
 * un'app senza barra di navigazione è l'unica sempre presente.
 *
 * Il clic si ascolta sul documento invece che sui singoli loghi: le copie nei
 * pannelli nascono da `cloneNode`, che gli ascoltatori non li porta dietro.
 */
document.addEventListener('click', evento => {
  if (!evento.target.classList.contains('logo')) return;

  // Il logo sta anche in cima all'editor, e da lì butterebbe via il lavoro
  // esattamente come faceva «Fatto». Stessa domanda, e il ritorno ai preset
  // parte solo se si esce davvero.
  if (inModifica && inModifica.toccato) {
    chiediPrimaDiUscire(() => { sceltaInCorso = null; if (inLive()) location.hash = '#preset'; });
    return;
  }

  chiudiPannelli();
  inModifica = null;          // il pannello si chiude: lo stato va con lui
  sceltaInCorso = null;
  if (inLive()) location.hash = '#preset';
});

function marchioNeiPannelli() {
  const logo = document.querySelector('header .logo');
  if (!logo || !logo.complete || logo.naturalWidth === 0) return;
  // Solo la **prima** barra di ogni pannello: `.barra-alta` serve anche alle
  // righe di mezzo (quella per aggiungere una categoria, quella per cercare
  // un modello), e il marchio finiva anche lì — due loghi nella stessa pagina.
  document.querySelectorAll('.pannello').forEach(pannello => {
    const barra = pannello.querySelector(':scope > .barra-alta');
    if (barra) barra.insertBefore(logo.cloneNode(false), barra.firstChild);
  });
}

// Non aspetta l'avvio: i pannelli sono già nel documento e il marchio non
// dipende da niente che si legga dal database.
(function () {
  const logo = document.querySelector('header .logo');
  if (logo && !logo.complete) logo.addEventListener('load', marchioNeiPannelli, { once: true });
  else marchioNeiPannelli();
})();

