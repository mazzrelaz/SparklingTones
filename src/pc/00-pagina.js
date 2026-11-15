// Sparkling Tones — pc/00-pagina.js: le due righe che stavano in linea in pc.html.
// Audit del 15 novembre 2026: con la Content-Security-Policy (script-src 'self') uno script
// scritto dentro la pagina non parte più, quindi stanno qui. Va caricato per primo, prima di
// src/lingua.js, che legge LINGUA_PREDEFINITA.
'use strict';

// La prima volta si apre in inglese; la scelta dell'utente poi vince.
window.LINGUA_PREDEFINITA = 'en';

// Installabile come app a parte (pc.webmanifest): lo stesso service worker dell'app, che ha già
// la pagina nel guscio. Solo sul web: nell'exe (spark://) e da file:// non c'è.
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
