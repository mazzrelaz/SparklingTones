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
   computer al telefono. Il trasporto sta in `dropbox-sync.js`, il quando in
   `sync-auto.js`: dal 9 novembre 2026 la libreria si allinea da sola (prima
   erano due gesti, «Manda su» e «Prendi»). Qui c'è il pannello, e il backup
   di sicurezza: un file a parte che scrive e rilegge solo l'utente, a mano,
   per quando il sync ha combinato un guaio.
   ==================================================================== */

// Vive per tutta la sessione: dentro ci sta il token di accesso, che dura
// quattro ore e si rifà da sé. Il refresh token invece sta in `settings`.
let dropbox = null;
let sincro = null;          // il sync automatico, acceso finché Dropbox è collegato

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
  avviaSincro();              // senza await: la partenza dell'app non aspetta la rete
}

/**
 * Il sync automatico. Quello che arriva da lassù ridisegna la libreria; una
 * fusione che cancellerebbe più di `SyncAuto.SOGLIA` preset chiede prima
 * (il guaio del 9 novembre: una libreria svuotata da una parte).
 */
function avviaSincro() {
  if (!dropbox || !dropbox.autorizzato()) return;
  if (!sincro) {
    sincro = new SyncAuto.Motore({
      store, dropbox,
      chiediCancellazioni: via => conferma(tr('cancellare anche qui'),
        tr('Sull\'altro apparecchio sono stati cancellati <strong>{0} preset</strong>, fra cui {1}. ' +
        'Cancellarli anche qui? Se rispondi di no restano, e tornano anche di là.',
        via.length, testoConNome(via.slice(0, 3).map(r => '«' + r.name + '»').join(', '))),
        { ok: tr('Cancella {0} preset', via.length), pericolo: true }),
      quandoArriva: async esito => {
        const pezzi = [];
        if (esito.arrivati)   pezzi.push(tr('{0} nuovi', esito.arrivati));
        if (esito.cambiati)   pezzi.push(tr('{0} cambiati', esito.cambiati));
        if (esito.cancellati) pezzi.push(tr('{0} cancellati', esito.cancellati));
        if (pezzi.length) logLine(tr('dall\'altro apparecchio: {0}', pezzi.join(', ')));
        await ricarica();
        disegnaPreset();
        disegnaLive();
      },
      quandoStato: disegnaSincro,
    });
  }
  sincro.avvia();
}

function disegnaSincro(st) {
  const riga = $('dropboxQuando');
  if (!riga || !st) return;
  const ora = st.quando ? new Date(st.quando).toLocaleTimeString(Lingua.attuale, { hour: '2-digit', minute: '2-digit' }) : null;
  riga.textContent =
      st.stato === 'in corso'   ? tr('allineo la libreria con Dropbox…')
    : st.stato === 'ok'         ? tr('Libreria allineata con Dropbox alle {0}.', ora)
    : st.stato === 'senza rete' ? tr('Senza rete: le modifiche partono quando torna.')
    : tr('Il sync con Dropbox si è fermato: {0}', st.errore ? st.errore.message : '?');
}

function disegnaDropbox() {
  const collegato = Boolean(dropbox && dropbox.autorizzato());
  $('dropboxCollegato').hidden   = !collegato;
  $('dropboxDaCollegare').hidden = collegato;
}

/**
 * Aprendo il pannello: un giro di sync (costa una chiamata se lassù non è
 * cambiato niente) e la data del backup di sicurezza, che è la cosa da sapere
 * prima di sostituirlo o di rimetterlo.
 */
async function leggiDataDropbox() {
  if (!dropbox || !dropbox.autorizzato()) return;
  if (sincro) { disegnaSincro(sincro.ultimo); sincro.sincronizza(); }
  const riga = $('sicurezzaQuando');
  try {
    const info = await dropbox.info(DropboxSync.PERCORSO_SICUREZZA);
    riga.textContent = info
      ? tr('Backup di sicurezza del {0}.', new Date(info.quando).toLocaleString(Lingua.attuale))
      : tr('Nessun backup di sicurezza.');
  } catch (err) {
    riga.textContent = '';
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
    avviaSincro();
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

/* Il backup di sicurezza: la libreria di adesso, in un file suo che il sync
   non tocca. Si sostituisce solo a mano, e prima si dice di quando è quello
   che c'è: sostituire un backup buono con una libreria rotta è il guaio da
   evitare. */
$('btnSicurezzaFai').addEventListener('click', async () => {
  try {
    const info   = await dropbox.info(DropboxSync.PERCORSO_SICUREZZA);
    const backup = await store.exportAll();
    const n = backup.presets.length;
    if (!await conferma(tr('backup di sicurezza'), info
      ? tr('Sostituire il backup di sicurezza del {0} con la libreria di adesso, <strong>{1} preset</strong>?',
           new Date(info.quando).toLocaleString(Lingua.attuale), n)
      : tr('Mettere da parte su Dropbox la libreria di adesso, <strong>{0} preset</strong>?', n),
      { ok: tr('Fai il backup') })) return;
    statoDelPannello(tr('faccio il backup di sicurezza…'));
    await dropbox.carica(JSON.stringify(backup, null, 2), DropboxSync.PERCORSO_SICUREZZA);
    logLine(tr('backup di sicurezza fatto: {0} preset', n));
    statoDelPannello('');
    await leggiDataDropbox();
  } catch (err) {
    statoDelPannello(tr('non sono riuscito a fare il backup: {0}', err.message));
  }
});

/* Rimetterlo: come «Importa un file» (senza lapidi), quindi rientra tutto,
   anche quello cancellato dopo. I preset rimessi prendono la data di adesso,
   e il sync li porta anche sugli altri apparecchi. */
$('btnSicurezzaRipristina').addEventListener('click', async () => {
  try {
    const info = await dropbox.info(DropboxSync.PERCORSO_SICUREZZA);
    if (!info) {
      await avvisa(tr('nessun backup di sicurezza'), tr('Su Dropbox non c\'è ancora un backup di sicurezza.'));
      return;
    }
    const json = JSON.parse(await dropbox.scarica(DropboxSync.PERCORSO_SICUREZZA));
    const n = (json.presets || []).length;
    if (!await conferma(tr('ripristinare il backup di sicurezza'),
      tr('Rimettere in libreria i <strong>{0} preset</strong> del backup di sicurezza del {1}? ' +
      'Quelli che hai già tornano come erano allora. Non viene cancellato niente.',
      n, new Date(info.quando).toLocaleString(Lingua.attuale)),
      { ok: tr('Ripristina') })) return;
    statoDelPannello(tr('rimetto il backup di sicurezza…'));
    const quanti = await store.importBackup(json, { lapidi: false });
    logLine(tr('{0} preset rimessi dal backup di sicurezza', quanti));
    statoDelPannello('');
    await ricarica();
    disegnaPreset();
    disegnaLive();
  } catch (err) {
    statoDelPannello(tr('non sono riuscito a rimetterlo: {0}', err.message));
  }
});

$('btnDropboxVia').addEventListener('click', async () => {
  if (!await conferma(tr('scollegare Dropbox'),
    tr('Scollegare Dropbox? La libreria qui e quella lassù restano dove sono: ' +
    'smettono solo di parlarsi.'), { ok: tr('Scollega') })) return;
  if (sincro) { sincro.ferma(); sincro = null; }
  const revocato = await dropbox.scollega();
  disegnaDropbox();
  $('dropboxQuando').textContent = '';
  $('sicurezzaQuando').textContent = '';
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
    tr('<strong>{0} preset, e non si torna indietro.</strong> Con Dropbox collegato ' +
    'spariscono anche dagli altri apparecchi.', quanti),
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

