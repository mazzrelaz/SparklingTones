// Sparkling Tones — 14-pedale.js: Il pedale ESP32.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Il pedale ESP32

   Un padrone alla volta: mentre l'app è collegata al pedale, **il pedale
   ha mollato l'ampli** e non suona. Appena si stacca se lo riprende da
   solo. Non è un limite tecnico che subiamo, è la scelta che ha reso
   semplice il firmware — e il pannello lo dice, perché altrimenti si
   scambia per un guasto (è già successo tre volte in sviluppo).

   Il formato del blocco sta in `src/pedale-ponte.js`, e la sua altra
   sponda è `pedale/prova-ble/banchi.h`: si cambiano insieme.
   ==================================================================== */

const pedale = {
  device: null, comando: null, stato: null, righe: [],
  slots: [],                 // quello che il pedale ha detto, l'ultima volta
  partenza: new Array(8).fill(null),   // la stessa cosa, per slot
  locale:   new Array(8).fill(null),   // la disposizione che stai sistemando
};

/**
 * Tiene le ultime righe, non solo l'ultima: qui la sequenza conta più del
 * singolo messaggio — «mandato 22 01 00» seguito o non seguito dalla
 * risposta del pedale dice da sola in quale dei due lati sta il difetto.
 */
function logPedale(msg) {
  pedale.righe.push(msg);
  while (pedale.righe.length > 6) pedale.righe.shift();
  const riga = $('statoPannelloPedale');
  riga.textContent = pedale.righe.join('\n');
  // `pulisciStatoPannelli()` nasconde ogni `.stato-pannello` all'apertura, e
  // chi ci scrive deve rimostrarlo — è quello che fa `statoDelPannello`.
  // Senza questa riga il log veniva scritto sempre e non si vedeva mai.
  riga.hidden = false;
}

function statoPedale(su, testo) {
  const el = $('statoPedale');
  el.className = 'status ' + (su ? 'on' : 'off');
  el.textContent = testo;
  $('btnPedaleConnetti').disabled = su;
  $('btnPedaleStacca').disabled = !su;
  aggiornaInvioPedale();
}

/** I preset di un banco salvato, per id. Il banco «Ampli» non c'entra qui. */
function postiDiBanco(banco) {
  return banco.posti.map(id => (id === null ? null : perId(id)));
}

/** Le due tendine del pannello «Pedale», rimontate ogni volta che si apre. */
let tendinaBancoPedale = null;
let tendinaSlotPedale = null;

function bancoDaMandare() {
  const id = tendinaBancoPedale ? tendinaBancoPedale.valore : null;
  return banchi.find(b => b.id === id) || null;
}

/**
 * Il banco si sceglie **dentro il pannello**: la barra dei banchi sta dietro
 * e il pannello la copre, quindi legarsi a quella voleva dire chiudere,
 * cambiare e riaprire per ogni invio.
 *
 * Il banco «Ampli» non compare: è quello che c'è già sull'ampli, mandarlo al
 * pedale non vuol dire niente.
 */
function riempiSceltaBanco() {
  const primaScelto = tendinaBancoPedale ? tendinaBancoPedale.valore : null;
  const voci = banchi.map(b => {
    const quanti = postiDiBanco(b).filter(Boolean).length;
    return { valore: b.id, testo: tr`${b.nome} — ${quanti} preset` };
  });
  if (!banchi.length) voci.push({ valore: null, testo: tr('nessun banco in libreria') });
  // Si riparte da quello che stavi guardando in Live, che quasi sempre è
  // quello che vuoi mandare; se non è un banco vero, dal primo.
  const preferito = banchi.some(b => b.id === primaScelto) ? primaScelto
                  : (bancoCorrente() ? bancoCorrente().id : (banchi[0] || {}).id);

  const nuova = tendinaFinta(tr('quale banco mandare'), voci,
                             preferito === undefined ? null : preferito,
                             aggiornaInvioPedale);
  if (tendinaBancoPedale) tendinaBancoPedale.replaceWith(nuova);
  else                    $('postoBancoDaMandare').replaceWith(nuova);
  // La misura stava sul `<span>` che c'era prima: la riga è del banco, e lo
  // slot accanto è largo quanto la sua parola.
  nuova.style.flex = '1';
  tendinaBancoPedale = nuova;
}

function aggiornaInvioPedale() {
  const banco = bancoDaMandare();
  const quanti = banco ? postiDiBanco(banco).filter(Boolean).length : 0;
  $('notaBancoDaMandare').textContent =
    !banchi.length ? tr('Non hai ancora banchi: creane uno nella vista Live e riempilo.')
    : !quanti      ? tr('Questo banco è vuoto: mettici dentro dei preset prima di mandarlo.')
    : '';
  $('btnMandaAlPedale').disabled = !(pedale.comando && banco && quanti > 0);
}

function disegnaSlotsPedale() {
  const cont = $('slotsPedale');
  cont.innerHTML = '';

  for (let s = 0; s < PedalePonte.POSTI; s++) {
    const v = pedale.locale[s];
    const riga = document.createElement('div');
    riga.className = 'slot-pedale' + (v ? '' : ' vuoto');

    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = s + 1;

    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = v ? v.nome : tr('vuoto');

    riga.append(n, nome);

    if (v) {
      const quanti = document.createElement('span');
      quanti.className = 'quanti';
      quanti.textContent = tr`${v.pieni} preset`;
      riga.appendChild(quanti);

      // Le frecce e l'eliminazione lavorano **solo sulla copia locale**: si
      // sistema tutto con calma e si applica una volta sola. In tempo reale
      // ogni spostamento era un giro completo, e riordinarne tre ne costava
      // sei — oltre a rendere ogni singolo comando un'occasione di errore.
      for (const [segno, verso] of [['↑', -1], ['↓', +1]]) {
        const f = document.createElement('button');
        f.textContent = segno;
        const dove = s + verso;
        f.disabled = dove < 0 || dove >= PedalePonte.POSTI;
        f.addEventListener('click', () => {
          const t = pedale.locale[s];
          pedale.locale[s] = pedale.locale[dove];
          pedale.locale[dove] = t;
          disegnaSlotsPedale();
        });
        riga.appendChild(f);
      }

      const suona = document.createElement('button');
      suona.textContent = tr('Suona');
      // Questo invece è immediato: non è una modifica da applicare, è un
      // ordine di suonare adesso.
      suona.disabled = daApplicare();
      suona.title = suona.disabled ? tr('prima aggiorna il pedale') : tr('fai suonare questo banco');
      suona.addEventListener('click', () => comandoPedale(PedalePonte.CMD.USA, s));

      const canc = document.createElement('button');
      canc.textContent = tr('Togli');
      canc.addEventListener('click', () => {
        pedale.locale[s] = null;
        disegnaSlotsPedale();
      });
      riga.append(suona, canc);
    }
    cont.appendChild(riga);
  }
  aggiornaTastiModifiche();
}

/** La disposizione locale differisce da quella che ha il pedale? */
function daApplicare() {
  for (let s = 0; s < PedalePonte.POSTI; s++) {
    const a = pedale.locale[s], b = pedale.partenza[s];
    if ((a ? a.slot : -1) !== (b ? b.slot : -1)) return true;
  }
  return false;
}

function aggiornaTastiModifiche() {
  const cambiato = daApplicare();
  $('btnApplicaPedale').disabled = !cambiato || !pedale.comando;
  $('btnAnnullaPedale').disabled = !cambiato;
  $('notaModifichePedale').textContent = cambiato
    ? tr('Ci sono spostamenti non ancora applicati al pedale.') : '';
}

/** Riparte dalla disposizione vera del pedale, buttando le modifiche locali. */
function ripartiDaPedale() {
  const perSlot = new Map(pedale.slots.map(v => [v.slot, v]));
  pedale.partenza = Array.from({ length: PedalePonte.POSTI }, (_, s) => perSlot.get(s) || null);
  pedale.locale   = pedale.partenza.slice();
  disegnaSlotsPedale();
}

/**
 * Applica la disposizione locale al pedale: prima le eliminazioni, poi la
 * permutazione realizzata con scambi. Al massimo sette scambi, tutti in coda.
 *
 * Si simula lo stato del pedale mentre si emettono i comandi, invece di
 * ricalcolarlo dopo ognuno: così non serve una rilettura per ogni passo, che
 * era proprio il costo del modo di prima.
 */
async function applicaAlPedale() {
  const stato = pedale.partenza.map(v => (v ? v.slot : null));
  const voluto = pedale.locale.map(v => (v ? v.slot : null));
  const comandi = [];

  for (let s = 0; s < PedalePonte.POSTI; s++) {
    if (stato[s] !== null && !voluto.includes(stato[s])) {
      comandi.push([PedalePonte.CMD.CANCELLA, s]);
      stato[s] = null;
    }
  }
  for (let i = 0; i < PedalePonte.POSTI; i++) {
    if (voluto[i] === null || stato[i] === voluto[i]) continue;
    const j = stato.indexOf(voluto[i]);
    if (j < 0) continue;
    comandi.push([PedalePonte.CMD.SCAMBIA, i, j]);
    const t = stato[i]; stato[i] = stato[j]; stato[j] = t;
  }

  if (!comandi.length) { logPedale(tr('niente da applicare')); return; }
  $('btnApplicaPedale').disabled = true;
  logPedale(tr`applico ${comandi.length} modifiche…`);
  for (const c of comandi) await comandoPedale(...c);
  await comandoPedale(PedalePonte.CMD.ELENCA);
}

/**
 * Coda delle operazioni GATT.
 *
 * **Web Bluetooth ne ammette una alla volta per dispositivo**: farne partire
 * un'altra mentre la prima è in corso la fa morire con «GATT operation
 * already in progress». Ci si casca appena si risponde a una notifica con un
 * comando — che è esattamente quello che fa la rilettura dell'elenco dopo un
 * salvataggio o uno scambio. Il risultato era un pedale che eseguiva e una
 * lista che non si aggiornava mai.
 *
 * È la stessa cura che `spark-transport.js` usa con `sendChain` per l'ampli.
 */
let codaPedale = Promise.resolve();

/** Un errore non deve bloccare la coda, quindi si aggancia sui due lati. */
function inCodaPedale(lavoro) {
  codaPedale = codaPedale.then(lavoro, lavoro);
  return codaPedale;
}

function comandoPedale(...byte) {
  if (!pedale.comando) { logPedale(tr('non collegato al pedale')); return Promise.resolve(); }
  return inCodaPedale(async () => {
    try {
      await pedale.comando.writeValueWithResponse(new Uint8Array(byte));
      logPedale('→ ' + byte.map(b => b.toString(16).padStart(2, '0')).join(' '));
    } catch (err) {
      logPedale(tr('comando fallito: {0}', err.message));
    }
  });
}

function rispostaPedale(e) {
  const v = new Uint8Array(e.target.value.buffer);
  const testo = new TextDecoder().decode(v.subarray(1));
  if (v[0] === 0x82) {                       // l'elenco degli slot
    pedale.slots = PedalePonte.leggiElenco(testo);
    logPedale(tr`elenco: ${pedale.slots.length} slot occupati`);
    ripartiDaPedale();                       // la verità è quella del pedale
    return;
  }
  logPedale('← ' + testo);
  // Solo dopo un salvataggio: gli scambi e le eliminazioni li rileggiamo una
  // volta sola alla fine, non uno per uno.
  if (v[0] === 0x81 && /salvato/.test(testo))
    comandoPedale(PedalePonte.CMD.ELENCA);
}

async function collegaPedale() {
  if (!navigator.bluetooth) { logPedale(tr('questo browser non parla col Bluetooth')); return; }
  try {
    statoPedale(false, tr('ricerca…'));
    pedale.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PedalePonte.SERVIZIO] }],
      optionalServices: [PedalePonte.SERVIZIO],
    });
    pedale.device.addEventListener('gattserverdisconnected', () => {
      pedale.comando = pedale.stato = null;
      pedale.slots = [];
      ripartiDaPedale();
      statoPedale(false, tr('non collegato'));
      logPedale(tr('staccato — il pedale si riprende l\'ampli da solo'));
    });

    const server   = await pedale.device.gatt.connect();
    const servizio = await server.getPrimaryService(PedalePonte.SERVIZIO);
    pedale.comando = await servizio.getCharacteristic(PedalePonte.COMANDO);
    pedale.stato   = await servizio.getCharacteristic(PedalePonte.STATO);
    await pedale.stato.startNotifications();
    pedale.stato.addEventListener('characteristicvaluechanged', rispostaPedale);

    statoPedale(true, pedale.device.name || tr('pedale'));
    logPedale(tr('collegato — da adesso il pedale ha mollato l\'ampli'));
    await comandoPedale(PedalePonte.CMD.ELENCA);
  } catch (err) {
    statoPedale(false, tr('non collegato'));
    // Il caso più probabile non è un guasto: il ponte del pedale è chiuso, e
    // un pedale che non si annuncia non compare nell'elenco del browser.
    const scelto = /cancell|chosen|user/i.test(err.message || '');
    logPedale(tr('connessione fallita: {0}', err.message) +
              (scelto ? tr(' — se nell\'elenco non c\'era nessun pedale, apri il ponte: ' +
                        'due tasti banco insieme per un secondo e mezzo') : ''));
  }
}

async function mandaBancoAlPedale() {
  const banco = bancoDaMandare();
  if (!banco) return;
  const posti = postiDiBanco(banco);
  const slot  = tendinaSlotPedale.valore;
  const barra = $('avanzamentoPedale').firstElementChild;

  $('btnMandaAlPedale').disabled = true;
  // Tutto il trasferimento entra nella coda come un blocco solo: dentro fa
  // una trentina di scritture, e una notifica che arrivasse a metà non deve
  // potersi infilare in mezzo con un comando suo.
  await inCodaPedale(async () => {
    try {
      const t0 = performance.now();
      const byte = await PedalePonte.invia(
        pedale.comando, { nome: banco.nome, posti }, slot,
        (fatti, totale) => { barra.style.width = Math.round(fatti / totale * 100) + '%'; });
      logPedale(tr('"{0}" → slot {1}: {2} byte in {3} ms', banco.nome, slot + 1, byte,
                Math.round(performance.now() - t0)));
    } catch (err) {
      logPedale(tr('invio fallito: {0}', err.message));
    }
  });
  barra.style.width = '0';
  aggiornaInvioPedale();
}


/**
 * Copiare il log serve a riportarlo, e in vista live il testo non si
 * seleziona col dito. Se gli appunti non sono disponibili si ripiega sulla
 * selezione, che è comunque meglio di un tasto che non fa niente.
 */
$('btnCopiaLogPedale').addEventListener('click', async () => {
  const testo = pedale.righe.join('\n');
  const tasto = $('btnCopiaLogPedale');
  const prima = tasto.textContent;
  try {
    await navigator.clipboard.writeText(testo);
    tasto.textContent = tr('copiato');
  } catch (err) {
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents($('statoPannelloPedale'));
    sel.removeAllRanges();
    sel.addRange(r);
    tasto.textContent = tr('selezionato, copia a mano');
  }
  setTimeout(() => { tasto.textContent = prima; }, 2000);
});

$('btnPedale').addEventListener('click', () => {
  if (!tendinaSlotPedale) {
    const posti = Array.from({ length: PedalePonte.POSTI },
                             (_, i) => ({ valore: i, testo: `slot ${i + 1}` }));
    tendinaSlotPedale = tendinaFinta(tr('in quale slot del pedale'), posti, 0);
    $('postoSlotPedale').replaceWith(tendinaSlotPedale);
  }
  riempiSceltaBanco();
  aggiornaInvioPedale();
  disegnaSlotsPedale();
  if (!$('statoPannelloPedale').textContent)
    logPedale(tr('prima apri il ponte sul pedale: tieni premuti insieme i due tasti banco ' +
              'per un secondo e mezzo. Resta aperto due minuti, e il display lo dice'));
  apriPannello('pannelloPedale');
});
$('btnPedaleConnetti').addEventListener('click', collegaPedale);
$('btnPedaleStacca').addEventListener('click', () => {
  if (pedale.device && pedale.device.gatt.connected) pedale.device.gatt.disconnect();
});
$('btnMandaAlPedale').addEventListener('click', mandaBancoAlPedale);
$('btnApplicaPedale').addEventListener('click', applicaAlPedale);
$('btnAnnullaPedale').addEventListener('click', ripartiDaPedale);

/**
 * Siamo su un apparecchio Apple da tasca o da divano? Serve solo a scegliere
 * le parole dell'avviso, non a decidere cosa fare: quello lo decide la
 * presenza di `navigator.bluetooth`, che è il fatto vero.
 *
 * `MacIntel` con più di un dito è un iPad recente: da iPadOS 13 si spaccia
 * per un Mac, e senza quel controllo direbbe le cose di un computer.
 */
function mela() {
  const p = navigator.platform || '';
  return /iPhone|iPad|iPod/.test(p) ||
         (p === 'MacIntel' && navigator.maxTouchPoints > 1);
}

