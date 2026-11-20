// Sparkling Tones — novita.js: la splash «Novità», per il telefono (index.html)
// e per il PC (pc.html). Ogni voce può dire `dove: 'pc'` o `dove: 'telefono'`;
// senza, vale per tutte e due.
// Regola dell'utente (13 novembre 2026): ogni aggiornamento pubblicato porta
// le sue novità, che si vedono una volta sola alla prima apertura dopo
// l'aggiornamento. Chi apre l'app per la prima volta non le vede: per lui è
// tutto nuovo.
//
// Per pubblicare: una voce nuova IN CIMA a NOVITA, con la stessa versione di
// VERSIONE in sw.js.
'use strict';

// La data è scritta in italiano («14 novembre 2026»): in inglese diventa
// «14 November 2026».
const MESI_NOVITA = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
  'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MONTHS_NOVITA = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
function dataNovita(d) {
  if (!window.Lingua || Lingua.attuale !== 'en') return d;
  return d.replace(/[a-z]+/, m => {
    const i = MESI_NOVITA.indexOf(m);
    return i < 0 ? m : MONTHS_NOVITA[i];
  });
}

const NOVITA = [
  {
    versione: 'v172',
    data: '20 novembre 2026',
    voci: [
      { icona: '🛡️', titolo: tr('Ampli più protetto'),
        testo: tr('Un preset con un modello che l\'ampli non conosce non parte più: prima poteva piantarlo.') },
    ],
  },
  {
    versione: 'v171',
    data: '19 novembre 2026',
    voci: [
      { icona: '🧹', titolo: tr('Barra in alto più ordinata'), dove: 'pc',
        testo: tr('Lo slot e «modificato» non coprono più Live, Banchi e Scalette; il bollo «software» non c\'è più.') },
    ],
  },
  {
    versione: 'v170',
    data: '19 novembre 2026',
    voci: [
      { icona: '🎛️', titolo: tr('Le scene'), dove: 'pc',
        testo: tr('Fino a tre scene per preset, più la Base: cambiano manopole ed effetti accesi senza cambiare preset. Nella Live, modo Scene; tenendo premuto un pulsantone la scena si modifica mentre la senti.') },
      { icona: '📋', titolo: tr('Le scalette'), dove: 'pc',
        testo: tr('Le canzoni della serata, ognuna col suo preset e la scena da cui parte. Si preparano da «Scalette» e si suonano dalla Live, modo Scene.') },
      { icona: '🎸', titolo: tr('Pickup consigliati'), dove: 'pc',
        testo: tr('Con «La mia chitarra», «Genera con l\'IA» consiglia anche quali pickup usare; si vedono dall\'icona della chitarra, e si possono scrivere a mano.') },
      { icona: '⏱️', titolo: tr('Pressione lunga più corta'), dove: 'pc',
        testo: tr('Nella Live, la pressione lunga degli switch MIDI si può fissare anche a 0,7 s.') },
      { icona: '🛡️', titolo: tr('Più sicura sul palco'), dove: 'telefono',
        testo: tr('Un preset con un effetto che l\'ampli non conosce non parte più dalla Live né dall\'editor: avrebbe potuto bloccare l\'ampli.') },
      { icona: '📱', titolo: tr('Icona arrotondata'),
        testo: tr('L\'icona dell\'app installata ha gli angoli arrotondati.') },
    ],
  },
  {
    versione: 'v169',
    data: '17 novembre 2026',
    voci: [
      { icona: '🔌', titolo: tr('Spark Mini, GO e 40 sul PC'), dove: 'pc',
        testo: tr('Cambiando preset l\'app aspetta un attimo prima di rileggere il suono, come già sul NEO.') },
    ],
  },
  {
    versione: 'v168',
    data: '16 novembre 2026',
    voci: [
      { icona: '🔌', titolo: tr('Spark NEO più affidabile'),
        testo: tr('Cambiando canale il suono si rilegge senza errori, e se l\'ampli si ferma a metà risposta l\'app riprova da sola.') },
    ],
  },
  {
    versione: 'v167',
    data: '16 novembre 2026',
    voci: [
      { icona: '🔌', titolo: tr('Spark 40'),
        testo: tr('Prima prova di collegamento con lo Spark 40. Se qualcosa non va, «Segnala un problema» in Altro.') },
    ],
  },
  {
    versione: 'v166',
    data: '15 novembre 2026',
    voci: [
      { icona: '🔢', titolo: tr('La versione si vede'),
        testo: tr('In Informazioni c\'è il numero di versione dell\'app, scritto come 1.6.6.') },
      { icona: '✨', titolo: tr('Il logo nella schermata iniziale'), dove: 'pc',
        testo: tr('Prima di collegare l\'ampli, il logo inciso nello sfondo e la versione sotto «Collega».') },
    ],
  },
  {
    versione: 'v165',
    data: '15 novembre 2026',
    voci: [
      { icona: '🔁', titolo: tr('Il looper nella guida'), dove: 'pc',
        testo: tr('La guida del PC spiega il looper della Live: lunghezza, conteggio, click e tutti i tasti.') },
    ],
  },
  {
    versione: 'v164',
    data: '15 novembre 2026',
    voci: [
      { icona: '🖱️', titolo: tr('Dai banchi all\'editor'), dove: 'pc',
        testo: tr('Nei Banchi un doppio clic su un preset lo apre nell\'editor.') },
    ],
  },
  {
    versione: 'v163',
    data: '15 novembre 2026',
    voci: [
      { icona: '🏷️', titolo: tr('Bollo JH intero'), dove: 'pc',
        testo: tr('Nella catena dell\'editor, con un nome lungo il bollo dei modelli Hendrix non si taglia più.') },
      { icona: '🔒', titolo: tr('Più sicura'), dove: 'pc',
        testo: tr('L\'app per Windows passa a una base più recente e chiede solo i permessi che le servono. La pagina per il PC carica solo i suoi file.') },
    ],
  },
  {
    versione: 'v162',
    data: '15 novembre 2026',
    voci: [
      { icona: '🎛️', titolo: tr('Editor del PC più ordinato'), dove: 'pc',
        testo: tr('Negli ampli Gain e Master stanno sopra, Bass, Middle e Treble sotto. I due equalizzatori si regolano a cursori, con Level in fondo.') },
      { icona: '🔧', titolo: tr('Piccole correzioni'), dove: 'pc',
        testo: tr("Nell'app per Windows la scelta del Bluetooth e l'avviso di chiusura ora sono anche in inglese.") },
    ],
  },
  {
    versione: 'v161',
    data: '15 novembre 2026',
    voci: [
      { icona: '⚠️', titolo: tr('Lo usi a tuo rischio'),
        testo: tr('Un promemoria ben visibile: SparklingTones è un progetto indipendente, senza garanzie e senza alcun rapporto con Positive Grid.') },
      { icona: '🔧', titolo: tr('Piccole correzioni'),
        testo: tr('Il looper del PC in inglese, e la finestra delle novità che non si apriva.'), dove: 'pc' },
    ],
  },
  {
    versione: 'v160',
    data: '15 novembre 2026',
    voci: [
      { icona: '🔁', titolo: tr('Il looper sul PC'), dove: 'pc',
        testo: tr('Nella vista Live c\'è il Looper: conteggio, click a tempo e i tasti nello stesso ordine degli switch del pedale.') },
      { icona: '🎛️', titolo: tr('Pedale Bluetooth a portata di mano'), dove: 'pc',
        testo: tr('Nella vista Live un tasto collega il pedale Bluetooth senza passare dal Foot controller.') },
      { icona: '🎧', titolo: tr('Spark NEO, Mini, GO e 40'),
        testo: tr('Con questi ampli si vedono quattro preset (CH1–CH4) e il looper non compare.') },
    ],
  },
  {
    versione: 'v159',
    data: '14 novembre 2026',
    voci: [
      { icona: '🔧', titolo: tr('Piccole correzioni'),
        testo: tr('Questa finestra delle novità ora mostra bene data e icone anche in inglese.') },
    ],
  },
  {
    versione: 'v158',
    data: '14 novembre 2026',
    voci: [
      { icona: '🖥️', titolo: tr('Sul Microsoft Store'),
        testo: tr('L\'app per Windows ora è sul Microsoft Store: gratis, si installa con un clic e si aggiorna da sola. Il link è nella guida del PC e su sparklingtones.com.') },
    ],
  },
  {
    versione: 'v157',
    data: '14 novembre 2026',
    voci: [
      { icona: '▶️', titolo: tr('Un video per capitolo'),
        testo: tr('Nella guida, sotto il titolo di molti capitoli, c\'è il video breve che mostra come si fa.') },
    ],
  },
  {
    versione: 'v156',
    data: '14 novembre 2026',
    voci: [
      { icona: '▶️', titolo: tr('Guida e video'),
        testo: tr('La guida, in italiano e in inglese, ora porta dritta ai video brevi su YouTube.') },
    ],
  },
  {
    versione: 'v155',
    data: '13 novembre 2026',
    voci: [
      { icona: '▶️', titolo: tr('Video brevi su YouTube'),
        testo: tr('Sette video brevi, uno per sezione dell\'app: collegarsi, la libreria, la scheda del preset, l\'editor, il Live, l\'accordatore e il backup. Li trovi dalla guida, sul canale SparklingTones.') },
    ],
  },
  {
    versione: 'v154',
    data: '13 novembre 2026',
    voci: [
      { icona: '🎛️', titolo: tr('Live (beta)'),
        testo: tr('Una vista per suonare dal vivo: banchi di preset o pedali stomp, da comandare col mouse o con una pedaliera MIDI, via cavo o Bluetooth. È in prova: se qualcosa non va, scrivimi.'), dove: 'pc' },
      { icona: '⏱️', titolo: tr('Tap tempo'),
        testo: tr('Accanto ai BPM c\'è il pulsante Tap: batti il tempo e il delay lo segue.'), dove: 'pc' },
      { icona: '❓', titolo: tr('Guida e spiegazioni'),
        testo: tr('Una guida per il computer con le schermate vere, e un «?» accanto alle funzioni più complesse.'), dove: 'pc' },
      { icona: '🔁', titolo: tr('Connessione più tenace'),
        testo: tr('Se il collegamento con l\'ampli cade appena aperto, l\'app riprova da sola.') },
      { icona: '☕', titolo: tr('Sempre gratis'),
        testo: tr('L\'app resta gratuita. Se ti è utile, un caffè dal menu Altro aiuta a farla crescere.'), dove: 'telefono' },
      { icona: '☕', titolo: tr('Sempre gratis'),
        testo: tr('L\'app resta gratuita. Se ti è utile, un caffè dal menu in alto a destra aiuta a farla crescere.'), dove: 'pc' },
    ],
  },
];

const NOVITA_PC = /pc\.html$/.test(location.pathname);
const NOVITA_QUI = NOVITA_PC ? 'pc' : 'telefono';
// Telefono e PC stanno sulla stessa origine: ognuno tiene il suo segno.
const CHIAVE_NOVITA = NOVITA_PC ? 'spark.novitaViste.pc' : 'spark.novitaViste';

function mostraNovita(n) {
  const velo = document.createElement('div');
  velo.className = 'velo-novita';
  velo.innerHTML =
    '<div class="novita" role="dialog" aria-modal="true">' +
      '<div class="novita-testa">' +
        '<div class="novita-sopra">' + tr('Novità') + ' · ' + n.versione + '</div>' +
        '<div class="novita-titolo">' + tr('Cosa c\'è di nuovo') + '</div>' +
        '<div class="novita-data">' + dataNovita(n.data) + '</div>' +
      '</div>' +
      '<ul class="novita-voci">' +
        n.voci.filter(v => !v.dove || v.dove === NOVITA_QUI).map(v =>
          '<li><span class="novita-icona">' + v.icona + '</span>' +
          '<div><strong>' + v.titolo + '</strong><span>' + v.testo + '</span></div></li>').join('') +
      '</ul>' +
      '<p class="novita-rischio">⚠️ ' + tr('Progetto indipendente, senza alcun rapporto con Positive Grid. Fornito così com\'è, senza garanzie: lo usi a tuo rischio.') + '</p>' +
      '<button class="novita-ok">' + tr('Ho capito') + '</button>' +
    '</div>';
  const chiudi = () => {
    velo.classList.add('via');
    setTimeout(() => velo.remove(), 200);
    document.removeEventListener('keydown', tasto);
  };
  const tasto = e => { if (e.key === 'Escape') chiudi(); };
  velo.querySelector('.novita-ok').addEventListener('click', chiudi);
  velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
  document.addEventListener('keydown', tasto);
  document.body.appendChild(velo);
}

// La versione dell'app: la voce in cima a NOVITA ha per regola quella di sw.js.
// Si scrive in ogni `.versione-app` (Informazioni, schermata vuota del PC).
// Per le persone si scrive a cifre puntate (15 novembre 2026, chiesto dall'utente):
// v165 → 1.6.5. La cache e le Novità restano su «v165».
const VERSIONE_APP = NOVITA[0].versione.replace(/^v/, '').split('').join('.');
function scriviVersione(radice) {
  (radice || document).querySelectorAll('.versione-app').forEach(el => {
    el.textContent = tr('Versione {0}', VERSIONE_APP);
  });
}
scriviVersione();

(function controllaNovita() {
  const ultima = NOVITA[0];
  let vista = null;
  try { vista = localStorage.getItem(CHIAVE_NOVITA); } catch (e) { return; }
  // Prima apertura in assoluto: niente splash, si segna e basta.
  // Si riconosce da un localStorage ancora vuoto.
  // Nell'app Windows il benvenuto del primo avvio (pc/13-benvenuto.js, che gira
  // prima) ha già scritto la sua chiave: se è aperto, è un primo avvio.
  const giaUsata = (vista !== null || localStorage.length > 0) &&
    !document.querySelector('.benvenuto-velo');
  try { localStorage.setItem(CHIAVE_NOVITA, ultima.versione); } catch (e) {}
  const prova = location.hash === '#novita';   // per le bozze: la mostra sempre
  if (!prova && (vista === ultima.versione || !giaUsata)) return;
  // Dopo la partenza: l'avvio chiude i pannelli.
  setTimeout(() => mostraNovita(ultima), 600);
})();
