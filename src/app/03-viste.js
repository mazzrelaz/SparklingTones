// Sparkling Tones — 03-viste.js: Le due viste, Preset e Live, nello stesso documento.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Le due viste
   Il passaggio va sull'hash invece che su una variabile: così il tasto
   indietro di Android torna ai preset invece di chiudere l'app, e la
   scorciatoia «Live» del telefono può puntare dritta qui.
   ==================================================================== */

const inLive = () => location.hash === '#live';

async function applicaVista() {
  const live_ = inLive();
  document.body.classList.toggle('vista-live', live_);
  segnaSchede();
  if (!live_) chiudiPannelli();
  // La scheda di un preset è della vista Preset: andando in Live si chiude.
  if (live_) vista.aperto = null;

  await ricarica();
  disegnaPreset();
  disegnaLive();
}

window.addEventListener('hashchange', () => { applicaVista(); });
// Le due schede della barra in basso. Toccare quella in cui si è già chiude la
// scheda aperta e riporta in cima: è dove ci si aspetta di tornare, come nelle
// app del telefono.
/**
 * Quale scheda della barra è accesa: il Pedale quando la sua pagina è aperta,
 * altrimenti la vista in cui si è. La chiamano anche apriPannello e
 * chiudiPannelli, perché il Pedale è una pagina come le altre.
 */
function segnaSchede() {
  const pedaleAperto = $('pannelloPedale').classList.contains('aperto');
  $('tabPedale').classList.toggle('scelta', pedaleAperto);
  $('tabPreset').classList.toggle('scelta', !pedaleAperto && !inLive());
  $('tabLive').classList.toggle('scelta', !pedaleAperto && inLive());
}

$('tabPreset').addEventListener('click', () => {
  const cera = !!document.querySelector('.pannello.aperto');
  if (!chiudiPannelloAperto()) return;
  if (inLive()) { location.hash = 'preset'; return; }
  if (cera) return;                      // il primo tocco chiude il pannello e basta
  if (vista.aperto) { vista.aperto = null; disegnaPreset(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('tabLive').addEventListener('click', () => {
  if (!chiudiPannelloAperto()) return;
  location.hash = 'live';
});

/**
 * La barra in basso sta anche sopra i pannelli (guida, impostazioni, editor…):
 * toccandola, prima si chiude il pannello aperto col suo stesso «Fatto», così
 * l'editor con lavoro non salvato chiede — e allora ci si ferma lì, finché non
 * si risponde. Torna true se non resta aperto niente.
 */
function chiudiPannelloAperto() {
  const aperto = document.querySelector('.pannello.aperto');
  if (!aperto) return true;
  const fatto = aperto.querySelector('[data-chiudi]');
  if (fatto) fatto.click();
  else chiudiPannelli();
  return !document.querySelector('.pannello.aperto');
}

/**
 * Un menu che si apre da un tasto: «Altro» della barra in basso, il bollino
 * dell'ampli, il «⋯» dell'editor.
 *
 * Si chiude da sola in tre modi — scegliendo una voce, toccando fuori, con
 * Esc — perché una tendina che resta aperta copre la libreria e sul telefono
 * non c'è nessun posto «fuori» ovvio dove toccare. La voce non la esegue
 * questo codice: dentro ci sono i pulsanti di sempre, coi loro listener.
 */
function collegaMenu(idTasto, idTendina, { puoAprire = () => true } = {}) {
  const tasto = $(idTasto), tendina = $(idTendina);
  const apri = aperto => {
    tendina.hidden = !aperto;
    tasto.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    tasto.classList.toggle('aperto', aperto);
    aggiornaVelo();
    // La tendina si appoggia al bordo destro del suo tasto, che è giusto
    // finché il tasto sta a destra. Se un giorno finisse a sinistra — una
    // barra che va a capo basta — uscirebbe dallo schermo: qui si misura e
    // nel caso si ribalta. Costa una lettura, e solo all'apertura.
    if (aperto && tendina.classList.contains('tendina')) {
      tendina.style.left = tendina.style.right = '';
      if (tendina.getBoundingClientRect().left < 8) {
        tendina.style.left = '0'; tendina.style.right = 'auto';
      }
    }
  };
  // `puoAprire` lascia il tocco a un altro listener: il bollino dell'ampli,
  // senza ampli, collega invece di aprire.
  tasto.addEventListener('click', evento => {
    if (tendina.hidden && !puoAprire()) return;
    evento.stopPropagation();
    apri(tendina.hidden);
  });
  // Scegliere una voce chiude: quello che la voce fa lo fa il suo listener,
  // che è quello di sempre — qui i pulsanti sono gli stessi di prima.
  tendina.addEventListener('click', evento => {
    if (evento.target.closest('button')) apri(false);
  });
  document.addEventListener('click', evento => {
    if (!tendina.hidden && !tendina.contains(evento.target) &&
        !tasto.contains(evento.target)) apri(false);
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !tendina.hidden) apri(false);
  });
  // Cambiando vista il menu contiene altre voci: lasciarlo aperto mostrerebbe
  // per un istante quelle della vista che si sta lasciando.
  window.addEventListener('hashchange', () => apri(false));
}
/**
 * Il velo dietro i fogli che salgono dal basso — il menu «Altro» e la scheda
 * di un preset — c'è finché ne resta aperto uno. Toccarlo chiude: il menu lo
 * chiude `collegaMenu` (è un tocco fuori), la scheda qui.
 */
function aggiornaVelo() {
  $('velo').hidden = $('menuAltro').hidden && $('foglioPreset').hidden;
  $('velo').classList.toggle('sopra', !$('menuAltro').hidden);
}
$('velo').addEventListener('click', () => {
  if (!$('foglioPreset').hidden) { vista.aperto = null; disegnaPreset(); }
});
// Esc chiude la scheda, se non c'è sopra un elenco o una domanda: quelli si
// chiudono da sé con lo stesso tasto, e uno alla volta.
document.addEventListener('keydown', evento => {
  if (evento.key !== 'Escape' || $('foglioPreset').hidden) return;
  if (document.querySelector('.velo-elenco') || document.querySelector('.pannello.aperto')) return;
  if (!$('menuAltro').hidden) return;
  vista.aperto = null;
  disegnaPreset();
});

collegaMenu('tabAltro', 'menuAltro');
collegaMenu('status', 'foglioAmpli', { puoAprire: () => spark.connected });

