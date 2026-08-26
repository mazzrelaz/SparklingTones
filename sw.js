/**
 * Service worker: rende l'app installabile e utilizzabile senza rete.
 *
 * Il caso d'uso che comanda le scelte qui dentro è il concerto: telefono
 * accanto all'ampli, connessione dati assente o inaffidabile, e nessuna
 * voglia di aspettare che una pagina si carichi fra un pezzo e l'altro.
 * Quindi si risponde **sempre dalla cache** quando c'è, e l'aggiornamento
 * si scarica in sottofondo per la volta dopo (stale-while-revalidate).
 *
 * La versione va alzata a ogni rilascio: è quello che fa scattare install,
 * ripulisce le cache vecchie e fa comparire l'avviso di aggiornamento.
 * Anche dimenticandosene, la revalidate in sottofondo rinfresca comunque i
 * file — solo con un caricamento di ritardo.
 */
'use strict';

const VERSIONE = 'v50';
const CACHE = 'spark-' + VERSIONE;

/** Tutto quello che serve per far partire l'app da spenta, senza rete. */
const GUSCIO = [
  './',
  './index.html',
  './live.html',
  './manifest.webmanifest',
  './src/spark-protocol.js',
  './src/spark-effetti.js',
  './src/spark-transport.js',
  './src/preset-store.js',
  './src/dropbox-sync.js',
  './src/pedale-ponte.js',
  './src/spark-backup.js',
  './src/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './fonts/inter-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
  './icons/logo.svg',
  // Attenzione ad aggiungere qui un file che non esiste ancora: `cache.addAll`
  // fallisce in blocco su un solo 404, e con l'install fallito l'app non
  // funzionerebbe più offline. `logo-mark.svg` non c'è apposta — serve solo a
  // generare le icone, non viene mai caricato dall'app.
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 'reload' scavalca la cache HTTP del browser: senza, si rischia di
    // precaricare nella cache nuova gli stessi file vecchi.
    await cache.addAll(GUSCIO.map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi
      .filter(nome => nome.startsWith('spark-') && nome !== CACHE)
      .map(nome => caches.delete(nome)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const richiesta = event.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(rispondi(event));
});

/**
 * Stale-while-revalidate: la copia in cache parte subito, la rete la
 * aggiorna per la volta dopo. Se non c'è copia si aspetta la rete, e se
 * anche quella manca si ripiega sulla pagina principale — così aprire
 * l'app offline non finisce mai sul dinosauro.
 */
async function rispondi(event) {
  const richiesta = event.request;
  const cache = await caches.open(CACHE);

  // L'ancora fa parte dell'url di una Request, quindi finirebbe nella chiave
  // di cache: `index.html`, `index.html#live` e `index.html#libreria` sarebbero
  // tre voci diverse dello stesso file, aggiornate ognuna per conto suo — e
  // nessuna sarebbe quella precaricata all'installazione. Si toglie.
  const url = new URL(richiesta.url);
  const chiave = url.origin + url.pathname + url.search;

  const salvata = await cache.match(chiave);

  const dallaRete = fetch(richiesta).then(risposta => {
    // Le risposte opache o fallite non si mettono in cache: sostituirebbero
    // un file buono con un errore, e l'app resterebbe rotta anche online.
    if (risposta && risposta.ok && risposta.type === 'basic') {
      cache.put(chiave, risposta.clone());
    }
    return risposta;
  }).catch(() => null);

  if (salvata) {
    event.waitUntil(dallaRete);
    return salvata;
  }

  const risposta = await dallaRete;
  if (risposta) return risposta;

  if (richiesta.mode === 'navigate') {
    const casa = await cache.match('./index.html');
    if (casa) return casa;
  }
  return new Response('Non disponibile offline.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// La pagina chiede l'aggiornamento solo quando l'utente lo accetta: durante
// un concerto un ricaricamento a sorpresa è l'ultima cosa che serve.
self.addEventListener('message', event => {
  if (event.data === 'aggiorna') self.skipWaiting();
});
