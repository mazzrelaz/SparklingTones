// Sparkling Tones — 04-log.js: Il log.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Log
   ==================================================================== */

// Nella vista preset il log tiene le ultime righe: i messaggi del trasporto
// sono spesso la parte diagnostica più utile. Nella live è una riga sola:
// lì si suona, non si legge.
const righeLog = [];
let logProvvisorio = false;

/* Le ultime righe con l'ora, per «Segnala un problema» (9 ottobre 2026): a
 * schermo ne restano otto, a chi cerca un difetto ne servono di più. Le righe
 * di avanzamento no: si sostituiscono a vicenda e non dicono niente dopo. */
const registroLungo = [];

function logLine(msg, risposta) {
  if (logProvvisorio) righeLog.pop();
  logProvvisorio = false;
  registroLungo.push(new Date().toTimeString().slice(0, 8) + '  ' + msg);
  if (registroLungo.length > 40) registroLungo.shift();
  righeLog.push(msg);
  if (righeLog.length > 8) righeLog.shift();
  $('log').textContent = righeLog.join('\n');
  $('logLive').textContent = msg;
  statoDelPannello(msg, risposta);
}

/** Riga di avanzamento: la successiva la sostituisce invece di accodarsi. */
function logProgress(msg) {
  if (logProvvisorio) righeLog.pop();
  righeLog.push(msg);
  logProvvisorio = true;
  $('log').textContent = righeLog.join('\n');
  $('logLive').textContent = msg;
  statoDelPannello(msg);
}

/**
 * Un pannello aperto copre tutto lo schermo, log compreso: un messaggio
 * scritto mentre si è lì dentro non lo vede nessuno, e un comando che
 * fallisce sembra un comando che non fa niente. Ogni pannello che parla con
 * l'ampli ha la sua riga di stato, e ci finisce l'ultimo messaggio.
 */
/**
 * @param risposta true se il messaggio **risponde a un gesto** dell'utente:
 *   un comando fallito, l'esito di un pulsante che ha appena premuto. I
 *   pannelli marcati `data-solo-risposte` — l'editor — mostrano solo quelli:
 *   lì lo schermo serve alla catena, e una riga che racconta «è sull'ampli,
 *   gira pure» a nessuno che l'abbia chiesto è solo un ingombro.
 */
function statoDelPannello(msg, risposta) {
  const riga = document.querySelector('.pannello.aperto .stato-pannello');
  if (!riga) return;
  if (riga.dataset.soloRisposte !== undefined && !risposta) return;
  riga.textContent = msg;
  riga.hidden = false;
}

/** Si riparte puliti a ogni apertura: lo stato di prima non riguarda questa. */
function pulisciStatoPannelli() {
  document.querySelectorAll('.stato-pannello').forEach(r => {
    r.textContent = '';
    r.hidden = true;
  });
}

