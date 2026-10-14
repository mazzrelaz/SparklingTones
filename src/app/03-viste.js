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
  $('tabPreset').classList.toggle('scelta', !live_);
  $('tabLive').classList.toggle('scelta', live_);
  if (!live_) chiudiPannelli();

  await ricarica();
  disegnaPreset();
  disegnaLive();
}

window.addEventListener('hashchange', () => { applicaVista(); });
// Le due schede della barra in basso. Toccare quella in cui si è già riporta
// in cima: è dove ci si aspetta di tornare, come nelle app del telefono.
$('tabPreset').addEventListener('click', () => {
  if (inLive()) location.hash = 'preset';
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('tabLive').addEventListener('click', () => { location.hash = 'live'; });

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
collegaMenu('tabAltro', 'menuAltro');
collegaMenu('status', 'foglioAmpli', { puoAprire: () => spark.connected });
collegaMenu('btnMenuEditor', 'menuEditor');

