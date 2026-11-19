# Audit di sicurezza — 17 settembre, 15 e 19 novembre 2026

Fatto su tutto il repository: app (`index.html`, `src/`), service worker, sync Dropbox,
firmware del pedale (`pedale/prova-ble/`), strumenti e catture. Il repository
`mazzrelaz/SparklingTones` è **pubblico**.

## Audit completo — 19 novembre 2026

Quattro giorni e ~50 commit dopo il 15. Riguardate le correzioni del 15, poi tutto quello che è
entrato dopo: Spark 40 (block header) e NEO (rilettura a metà) in `spark-protocol.js` e
`spark-transport.js`, i pickup consigliati e «La mia chitarra» (`src/pc/16-pickup.js`, campo
`pickup` nel sync), «Genera con l'IA», il doppio clic dei Banchi, il firmware 2.42 (ponte, CC del
MIDI, motivo del riavvio), il **ramo `scene`** (scene e scalette, non in `main`), il sito, le
dipendenze, segreti e immagini (anche quelle non tracciate).

### La correzione — lo stesso giorno

**1. corretto il 19 novembre.** `mandabileOAvvisa(record)` in `src/app/08-invio.js` (lo stesso
controllo di `mandaPreset`, con la finestra «non si può mandare» come sul PC) prima di
`loadPreset` nella Live del telefono (solo per un preset che non sta in uno slot) e in «Regola»;
in `blocco()` di `pedale-ponte.js` un errore col nome del preset e del modello, che finisce nel
registro del pedale (e un banco così non ha impronta, come un banco vuoto). Nessuna frase nuova: sono
quelle del PC, già in inglese. Due test in `protocol-test` (173 verdi; transport 67, dropbox 44,
store 172, backup 41). **Provato nell'app locale con un ampli finto**: un preset con
`TrebleBooster` nella Live e in «Regola» si ferma alla finestra e non parte niente; uno buono parte.
Non provato con lo Spark vero, che non serve: l'invio non c'è.

### Da correggere (com'era la mattina)

**1. Il controllo dei modelli inesistenti non copre tutte le strade verso l'ampli — basso-medio,
sul palco.** Dal 17 settembre `controllaPreset(…, { modelli })` ferma un nome che l'ampli non ha
(`TrebleBooster` l'ha piantato: si stacca la corrente). Lo chiamano `mandaPreset` del telefono e,
sul PC, `apriRecord`, `scriviNelloSlot` e «Genera con l'IA». **Non lo chiamano**:

- la **vista Live del telefono** (`src/app/07-vista-live.js`, `attiva()`), per un preset che non sta
  in uno slot: `spark.loadPreset` diretto;
- **«Regola» dell'editor del telefono** (`src/app/09-editor.js`): `spark.loadPreset` diretto;
- i **banchi del pedale** (`src/pedale-ponte.js`, `frameDiPreset`), dal telefono e dal PC: il
  pedale li suona da solo, e `frameAccettabile` guarda solo il comando e la destinazione.

E nessun import lo chiama (file, backup, Dropbox): un preset con un nome sbagliato entra in libreria
senza avvisi. **Il caso vero**: un file di preset preso da un altro (un gruppo Facebook, un forum) o
scritto male, importato sul telefono, suonato dalla Live o messo in un banco del pedale → l'ampli
si pianta a metà serata. **Correzione**: `controllaPreset` prima di `loadPreset` in quei due punti
(con `avvisa`, come sul PC) e in `blocco()` di `pedale-ponte.js` (errore col nome del preset, come
per il banco vuoto); un test in `protocol-test` o `store-test`.

### Prima di portare le scene in `main`

- **I valori delle scene non passano da nessun controllo.** `record.scene` (sync, backup) e le
  `scalette` arrivano come sono: un valore fuori da 0–1 o non numerico va all'ampli con `0x0104`, e
  una scena senza `accesi` o `cambi` fa saltare `presetConScena` (`in` su `undefined`). Da fare
  all'ingresso: valori fra 0 e 1, `accesi` e `cambi` oggetti, al più tre scene. L'HTML invece è a
  posto: nomi di scene, canzoni, preset e switch passano da `testoConNome`.

### Accettati, da sapere

- **`tools/serve.ps1`** (8099, suite e prove) è registrato su `localhost`, ma http.sys risponde anche
  dall'indirizzo di rete se la richiesta dice `Host: localhost` (provato dal PC stesso; da un altro
  apparecchio decide il firewall, non provato). Serve solo il repository, codice già pubblico, e
  **non esce dalla cartella**: `..%2f`, `..%5c` e `../` danno 403 da http.sys (provato).
- **Lo Spark 40 si riconosce dal nome Bluetooth** (`\b40\b`): un apparecchio che si chiamasse con un
  40 riceverebbe i messaggi col block header. Conta solo per farlo funzionare, non per la sicurezza.

### A posto

- **Le correzioni del 15 ci sono tutte**: CSP su `index.html` e `pc.html` (anche sulla v169
  pubblicata), nessuno script in linea; server dei video su `127.0.0.1` e chiusi nella loro
  cartella; `protocol.handle` e `server-rete.js` col separatore in coda; permessi e fuse dell'exe;
  ponte del pedale 2.42 (un PEZZO dopo FINE trova `ricDati` vuoto e viene rifiutato).
- **Pickup e «La mia chitarra»**: `pickupValido` rifà layout, posti e split da capo; la nota si
  scrive con `textContent`, il disegno con `setAttribute`; la chitarra «Custom» da `localStorage` è
  ripulita lettera per lettera. Gli `innerHTML` nuovi contengono solo testi nostri (`tr`).
- **«Genera con l'IA»**: la risposta incollata passa da `JSON.parse`, poi `valoreSicuroIA` e
  `controllaPreset` prima dell'invio.
- **Protocollo**: il block header del 40 si toglie solo su `01 fe`, che negli altri ampli non
  compare; la rilettura del NEO si ritenta una volta sola. Le ultime quattro notifiche grezze nel
  registro sono byte dell'ampli, niente di personale.
- **Firmware**: i CC 102–109 del MIDI hanno l'indice controllato al rilascio; il motivo del riavvio è
  solo sul seriale.
- **Segreti**: nessuna chiave o token, né nei file tracciati né in quelli non tracciati; nessun
  `.pfx`, `.pem` o `.env`. **Immagini nuove** (`design/post-facebook-*`, non ancora in git): nessun
  EXIF né GPS.
- **Dipendenze dell'exe**: `npm audit --omit=dev` **0 falle**; restano le 6 moderate di `minimatch`
  negli attrezzi per compilare (come il 15).
- **Sito**: nessun commit dopo il 15; ancora nessuno script, modulo o iframe; `http` → `https` (301).
- **Sync Dropbox e service worker**: non toccati dal 15, a parte la versione.

### Voto

**Buono.** Una cosa da fare davvero (1: il controllo dei modelli sulle strade che lo saltano, perché
sul palco un ampli piantato è il danno peggiore che l'app possa fare), corretta lo stesso giorno, e
una da fare prima del merge delle scene.

## Audit completo — 15 novembre 2026

Il secondo audit intero, due mesi e ~720 commit dopo il primo. Guardato: app del telefono e del PC
(`src/`, `index.html`, `pc.html`), app Windows (`desktop/`), service worker, firmware del pedale
(`pedale/prova-ble/`), strumenti (`tools/`), sito (`..\sparklingtones-sito`), segreti e foto nel
repository, dipendenze npm. Le novità che parlano con l'esterno dall'ultima volta: **l'app Windows
(Electron, sul Microsoft Store)**, il MIDI della Live del PC (USB e Bluetooth), le modalità MIDI,
Play Acoustic e Pulze del pedale, gli strumenti dei video.

### Le correzioni — lo stesso giorno

Tutti i punti sotto sono stati corretti il 15 novembre:

- **1. Electron 45.3.2** (ed `electron-builder` 26.18.0), app Windows **1.0.2**. `npm audit`: da 18
  falle (una critica, 13 gravi) a 6 moderate, tutte di `minimatch` dentro gli attrezzi per compilare.
  **Provato**: in sviluppo **collegato allo Spark vero** (scelta del Bluetooth, lettura degli otto
  slot, connessione veloce a 15 ms); l'exe impacchettato parte con i fuse e il controllo
  d'integrità dell'`app.asar`. **npm 11 non lancia da solo lo script che scarica Electron**: dopo un
  `npm install` va lanciato `node node_modules/electron/install.js`. **Da provare dall'utente**:
  l'installer 1.0.2 sul PC e il pacchetto per lo Store.
- **2.** `registra.js` e `pedale-video.js` ascoltano solo su `127.0.0.1` e servono solo dentro la
  loro cartella; `server-rete.js` e il `protocol.handle` col separatore in coda. Provato con
  `..%2f` e `..%5c`: 403.
- **3.** `pc.html` ha la stessa CSP di `index.html`; i due script in linea stanno in
  `src/pc/00-pagina.js` (nel guscio di `sw.js`). Tolto l'`onerror=` del logo da `guida-pc*.html`,
  che la pagina legge col DOMParser e che la CSP segnalava. Provato nel browser e nell'exe: nessuna
  violazione, la guida si apre, una `fetch` fuori da Dropbox è bloccata.
- **5.** Permessi dell'exe: solo MIDI, appunti, schermo intero e `mailto`. **Il MIDI semplice, col
  Chromium di Electron 45, arriva come `midiSysex`**: con il solo `midi` la Pedaliera USB era negata
  (provato), quindi si concede anche quello. Microfono e resto negati (provato). Fuse spenti:
  `RunAsNode` (provato: `ELECTRON_RUN_AS_NODE` non fa più niente), `NODE_OPTIONS`, `--inspect`,
  privilegi di `file://`; accesi la cifratura dei cookie, l'integrità dell'asar e «solo
  dall'asar».
- **6.** Firmware **2.42**, caricato: a FINE **il callback consegna il blocco al loop** (`chiu…`) e
  `ricDati` torna libero per il banco dopo. La corsa non era solo teorica: **«Aggiorna tutti» manda
  i banchi uno dopo l'altro senza aspettare la risposta a FINE**, quindi l'INIZIA del secondo poteva
  liberare il buffer che il loop stava salvando. **Verificato lo stesso giorno**: «Aggiorna tutti»
  con due banchi cambiati, uno dopo l'altro, tutti e due salvati (seriale del pedale: «Pink Floyd»
  nello slot 0, «Brian May» nello slot 1, nessun errore).

### Da correggere (com'era la mattina)

**1. Electron è fermo alla 33.2.1 — medio.** L'ultima è la 45.3.2. `npm audit` dà per la 33 una
quarantina di falle note, una dozzina gravi (uso di memoria già liberata, uscite dalla sandbox,
letture fra origini diverse), e dentro c'è il Chromium di fine 2024 senza due anni di correzioni.
Quello che le rende poco raggiungibili: la finestra carica solo i file nostri, niente pagine da
fuori, niente iframe né webview, `contextIsolation` e `sandbox` accesi. Restano i dati che la
pagina elabora (un backup importato, Dropbox, i nomi dei dispositivi Bluetooth a portata), letti
da un motore vecchio, e lo Store distribuisce questa versione. **Correzione**: passare alla 45,
rifare l'installer e il pacchetto per lo Store (1.0.2) e riprovare la scelta del Bluetooth con lo
Spark vero, perché `select-bluetooth-device` e `protocol.handle` sono le parti che cambiano fra
una versione e l'altra. Con l'aggiornamento si sistemano anche le falle di `electron-builder`
(`tar`, `extract-zip`: contano solo sul PC dove si compila, mentre si compila).

**2. Il server degli strumenti dei video lascia leggere ogni file del PC — medio-basso.**
`tools/video-demo/registra.js` e `pedale-video.js` ricavano il file da
`path.join(RADICE, decodeURIComponent(url.pathname))` senza controllare dove finisce: `..%2f`
(la barra scritta in codice) supera il controllo dell'URL e poi risale le cartelle. Provato a
tavolino: `/..%2f..%2fWindows/win.ini` porta fuori dalla radice. E il server ascolta **su tutte
le interfacce** (`listen(porta)` senza indirizzo): **finché si registra un video, chiunque sulla
rete di casa può scaricare qualsiasi file dell'utente.** **Correzione**: `listen(porta,
'127.0.0.1')` e lo stesso controllo di `server-rete.js`, con il separatore in coda
(`file.startsWith(RADICE + path.sep)`).

**3. `pc.html` non ha la Content-Security-Policy — basso-medio.** `index.html` ce l'ha dal 17
ottobre (verificato anche sulla pagina pubblicata); `pc.html` no, ed è la pagina del web **e**
dell'exe. Oggi nessun testo da fuori finisce crudo nell'HTML (sotto), quindi è il rinforzo che
manca, non una falla aperta. Ci sono due `<script>` in linea da spostare in un file (la lingua
predefinita e la registrazione del service worker); poi la stessa regola di `index.html`. Nell'exe
`'self'` è `spark://app`.

**5. L'app Windows dà ogni permesso senza chiedere — basso.** Senza
`session.setPermissionRequestHandler`, Electron concede da solo microfono, fotocamera, posizione,
notifiche, MIDI con SysEx. La pagina è nostra e non chiede niente di questo, quindi oggi non
succede nulla; è una porta da chiudere: permettere solo `midi` (e gli appunti per «Genera con
l'IA»). Nella stessa occasione si possono spegnere i «fuse» che non servono (`RunAsNode`,
`EnableNodeCliInspectArguments`), che lasciano usare l'exe come un Node qualunque.

**6. Il pedale: un PEZZO che arriva dopo FINE — basso.** INIZIA e PEZZO girano nel callback BLE,
FINE nel `loop()`, che libera `ricDati`: un client che mandasse un PEZZO mentre il loop sta
chiudendo il banco scriverebbe in memoria già liberata. La nostra app non lo fa, e serve il ponte
aperto coi due tasti banco. **Correzione**, la prossima volta che si tocca il firmware: in FINE
staccare `ricDati` prima del lavoro pesante, e in PEZZO scartare se c'è un FINE in coda.

### Accettati, da sapere

- **In modalità MIDI chiunque a portata può collegarsi al pedale** (niente accoppiamento, come
  ogni pedale BLE MIDI) e occupare il posto dell'iPad. Non scrive banchi (`onWrite` vuole
  `appCollegata`) e l'ampli lì non c'è.
- **`testoConNome` non protegge le virgolette**: va bene nel testo, **mai dentro un attributo**.
  Controllato con una ricerca su `src/`: oggi nessun valore dei dati sta in un attributo HTML.
- **`server-rete.js`** (la bozza sul telefono) ascolta sulla rete di casa per scelta; serve solo la
  cartella della bozza, codice che è già pubblico. Il controllo `startsWith(radice)` senza
  separatore lascerebbe passare una cartella sorella che comincia con lo stesso nome: da mettere
  a posto insieme al punto 2. Lo stesso nel `protocol.handle` dell'app Windows, dove però accanto
  a `resources\web` non c'è niente.

### A posto

- **Nessun segreto nel repository**: cercati chiavi OpenAI e Anthropic, token Dropbox e GitHub,
  chiavi AWS, chiavi private. Nessun certificato o `.pfx`;
  `desktop/dist` e `node_modules` fuori da git. Il publisher dello Store nel `package.json` è il
  codice che lo Store mostra comunque, senza nomi di persona.
- **Foto**: 333 immagini fra i due repository, **nessuna con EXIF o GPS**.
- **Iniezione di HTML nel codice del PC**: nomi di preset, banchi, switch e sorgenti MIDI passano
  da `testoConNome` o `textContent`; il titolo delle finestre è `textContent`; le immagini dei
  blocchi vengono da tabelle nostre. Niente `eval` né `new Function`.
- **MIDI della Live**: si accettano solo CC e Program Change, senza SysEx, e portano solo ad azioni
  che ci sono già (un posto del banco, uno stomp, il looper); la pedaliera resta in locale, non
  viaggia nei backup né su Dropbox. Un pacchetto BLE MIDI monco dà al più un valore vuoto.
- **App Windows**: `contextIsolation` e `sandbox` accesi, niente `nodeIntegration`; il preload non
  espone niente alla pagina (nessun `contextBridge`) e scrive i nomi dei dispositivi con
  `textContent`; l'indirizzo Bluetooth passa da un'espressione regolare prima di arrivare a
  PowerShell, lanciato senza shell; la finestra non naviga fuori da `spark://`, e fuori si apre
  solo `http(s)` e `mailto` nel browser di sistema; il protocollo nostro non risale le cartelle.
- **Guida del PC**: si legge dalla stessa origine, file nostro.
- **Pedale**: ponte chiuso alla partenza, `frameAccettabile` su ogni frame, nessuna scrittura di
  banchi da chi non è l'app; il parser dei SysEx del Pulze controlla lunghezze e destinazione.
- **Sito**: nessuno script, nessun modulo, nessun iframe (i video sono link); GitHub Pages porta
  da `http` a `https` (301).
- **Service worker** e **Dropbox**: come al controllo del 9 novembre.

### Voto

**Buono**, con due cose da fare davvero: aggiornare Electron (1) e chiudere il server dei video (2).
La CSP di `pc.html` (3) e i permessi dell'exe (5) sono rinforzi.

## «Genera con l'IA» col copia e incolla, sulla pagina PC — 10 novembre 2026

`src/pc/11-genera-ia.js`. Non parla con nessuno: la domanda va negli appunti (`navigator.clipboard`), e
da fuori entra solo il testo che l'utente incolla, scritto da una chat. Lo si tratta da dato non
fidato: `JSON.parse` dentro un `try`; i modelli passano solo se sono in `MODELLI` (e prima dell'invio
`controllaPreset`), i valori sono numeri finiti portati fra 0 e 1, il bpm fra 40 e 250, la famiglia
solo fra le quattro; le iniziali restano due lettere A–Z. Il nome e gli errori finiscono sulla pagina
con `textContent` o con `testoConNome`, mai crudi in `innerHTML`. Niente chiavi né `localStorage`.
Niente da correggere.

## Il tuner sul pedale — 20 ottobre 2026 (firmware 2.24)

`0x0364` si legge nel callback con `spacchetta` in un buffer da 8 byte (il limite e' passato), e
si accetta solo con almeno 6 byte, nota sotto 12 e `ca` davanti al float; il loop scarta scostamenti
negativi o NaN e taglia oltre 1. Il disegno usa la nota come indice di una tabella fissa da 12. Verso
l'ampli parte solo `0x0165` col booleano. Niente da correggere.

## Il tuner — 20 ottobre 2026

`src/app/16-accordatore.js` e `Spark.letturaAccordatore`. Verso l'ampli parte solo `0x0165` con un
booleano, costruito da noi. Da fuori entra `0x0364`: `letturaAccordatore` accetta una nota 0–11 e uno
scostamento finito, controlla la lunghezza prima di leggere il float (il `Reader` da solo non lo fa:
un payload monco dava zeri, c'è un test) e torna `null` per tutto il resto. Sulla pagina finiscono
solo le lettere di una tabella fissa e numeri: niente testo dell'ampli in `innerHTML`. L'ampli
resta muto solo mentre la scheda è aperta; se cade col tuner acceso, al ritorno lo si spegne.
Niente da correggere.

## «Genera con l'IA» tolta — 19 ottobre 2026

La funzione è uscita dall'app (guscio `v122`): niente più chiamate a OpenAI e Anthropic, e i due
indirizzi sono fuori dal `connect-src` della CSP, che torna a permettere solo Dropbox. Le chiavi
API che chi l'aveva sbloccata teneva in `localStorage` (`openai-chiave`, `anthropic-chiave`, con
le scelte `*-modello`, `ia-servizio`, `ia-sbloccata`) le cancella `15-partenza.js` a ogni avvio.
Il ricontrollo del 17 ottobre qui sotto resta come storia.

## La voce dei video con OpenAI — 19 ottobre 2026

`tools/video-demo/voce-openai.html` + `voce-openai.js`: uno strumento locale (non fa parte
dell'app pubblicata) dove l'utente incolla la sua chiave OpenAI per fare la voce italiana dei
video. Controllato:
- **La chiave** sta in un campo `password`; in `localStorage` solo se l'utente spunta «ricordala»,
  e quell'archivio è dell'origine `localhost:8125`, separato da quello dell'app. Parte solo verso
  `https://api.openai.com/v1/audio/speech`; il server locale non la vede mai. Non è nel repository.
- **Il server** ascolta solo su `127.0.0.1` (niente rete di casa), serve solo i file della propria
  cartella (`path.basename`, niente risalite di percorso), e accetta in scrittura solo
  `app|pedale` × `voce.wav|voce.json` nella cartella data all'avvio.
- Il testo mandato a OpenAI è il copione dei video, niente di personale. Il finale dei video dice
  «voce generata con IA», come chiedono le regole d'uso di OpenAI.
Niente da correggere.

## Ricontrollo del 17 ottobre 2026

Un mese e ~390 commit dopo l'audit. La novità che parla con l'esterno è **«Genera con l'IA»**
(`src/app/16-genera-ia.js`), che chiama OpenAI e Anthropic dal browser; in più si è aggiunta
la Content-Security-Policy, il rinforzo che mancava.

### «Genera con l'IA»

- **Le chiavi OpenAI e Anthropic stanno in chiaro in `localStorage`** (`openai-chiave`,
  `anthropic-chiave`), su quell'apparecchio. Non c'è un posto migliore senza un server: l'app
  non ne ha. Non finiscono nei backup né su Dropbox (`exportAll` legge l'IndexedDB, non il
  `localStorage`), non compaiono nel registro né nei messaggi d'errore. **Restano leggibili**
  da un'estensione del browser con accesso alle pagine e da uno script che riuscisse a entrare
  nella pagina; contro il secondo caso ora c'è la CSP (sotto), che non lo fa partire e non lo
  lascerebbe spedire la chiave altrove. **Consiglio all'utente: chiavi con un tetto di spesa
  basso** (OpenAI: limite mensile del progetto; Anthropic: limite di spesa dell'organizzazione
  o un workspace apposta), così una chiave rubata costa al più quel tetto.
- **La password delle funzioni nascoste è una porta socchiusa, non una serratura**, e il codice
  lo dichiara: nel repository c'è solo l'impronta SHA-256, ma il codice è pubblico e lo
  sblocco è una voce di `localStorage`. Tiene lontano chi usa l'app, non chi legge i sorgenti.
  Va bene così: dietro non c'è niente di segreto, le chiavi le mette ciascuno.
- **La risposta dell'IA è trattata come dato estraneo**: arriva a schema, con i modelli in un
  `enum` di `MODELLI`; i valori passano da `valoreSicuro`; il preset si costruisce sopra uno
  vero della libreria (il numero di parametri non lo decide l'IA) e prima dell'invio
  `controllaPreset` ricontrolla i nomi contro `MODELLI.flat()`, come per ogni preset. Nome,
  spiegazione e catena si mostrano con `textContent`; gli errori dei servizi passano da
  `statoDelPannello` e `logLine`, anche loro `textContent`. Niente `innerHTML` con testo
  dell'IA. Si salva solo con «Salva in libreria».
- **Anthropic dal browser** vuole l'intestazione `anthropic-dangerous-direct-browser-access`:
  è il nome che Anthropic dà all'avviso «la chiave sta nel browser». Qui è voluto, ed è il
  caso descritto sopra.

### La Content-Security-Policy

In `index.html`, come `<meta http-equiv>` (GitHub Pages non permette di mandare intestazioni):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self' https://api.dropboxapi.com
https://content.dropboxapi.com https://api.openai.com https://api.anthropic.com;
object-src 'none'; base-uri 'self'; form-action 'none'
```

- **Nessuno script in linea**: lo script dello sfondo in testa a `index.html` è passato in
  `src/sfondo.js` (nel guscio del service worker, `v119`); l'`onerror=` del logo, che
  ripiegava su un `logo.png` che nel repository non c'è, è stato tolto (`logo.svg` c'è). Niente `'unsafe-inline'` né
  `'unsafe-eval'` sugli script.
- **Stili in linea permessi** (`'unsafe-inline'` su `style-src`): il `<style>` unico, qualche
  `style=` nell'HTML e in `snake-pedali.js`. Da uno stile non si rubano chiavi; toglierlo
  vorrebbe dire spostare 90 KB di CSS per un guadagno minimo.
- **`img-src data:`** per le piste dei pulsantoni live, un SVG dentro il CSS.
- **`www.dropbox.com` non c'è**: la pagina di autorizzazione si apre con `window.open`, che la
  CSP non governa; il codice si scambia su `api.dropboxapi.com`.
- **Le guide no**: `guida*.html` sono testo fisso, non leggono dati né chiamano la rete, e le
  versioni inglesi non si toccano (regola dell'utente). Hanno ancora i loro `onerror=` sui
  loghi, innocui senza CSP.
- **Un indirizzo nuovo chiamato con `fetch` va aggiunto a `connect-src`**, altrimenti il browser
  lo blocca con un errore in console. Il commento sopra il `<meta>` lo ricorda.

**Provato** da `localhost` nel riquadro del browser: l'app parte (sfondo, logo, script),
guida e StompSnake si aprono, nessuna violazione in console; dal vero codice dell'app
Dropbox risponde «client_id non valido» con una chiave finta, Anthropic «non accetta la
chiave»; OpenAI con una chiave finta dà errore di rete **anche senza CSP** (risponde al 401
senza intestazioni CORS: è loro, non nostro); una `fetch` a `example.com` è bloccata con la
violazione `connect-src`. Da `file://` il DOM dell'app è identico con e senza CSP. Le cinque
suite verdi. **Il service worker** non si registra né nel riquadro né in Edge headless, **con
o senza CSP** (stesso errore su una pagina di controllo senza regola). **Sull'app pubblicata**
(`mazzrelaz.github.io/SparklingTones`, dopo il push) la CSP c'è, il service worker si registra
e si attiva con la cache `spark-v119`, e la console non ha errori.

### Voto

Per un'app personale senza server, **buono**: nessun segreto nostro nel repository, niente
dipendenze, testo esterno mai interpretato come HTML, una CSP stretta sugli script e sulla
rete. I punti deboli rimasti sono strutturali (chiavi dell'IA nel browser).

## Da correggere — nessuno: tutti corretti

### 2. Il pedale accetta chiunque via Bluetooth — medio, sul palco

**Corretto il 23 settembre 2026.** Il ponte parte **chiuso**: il pedale non si annuncia, e chi si collega lo stesso viene scollegato dal `loop()` senza che l'ampli venga mollato. Si apre tenendo premuti **i due tasti banco insieme** per 1,5 s, e resta aperto due minuti — che non scadono finche' l'app e' collegata, per non tagliare un banco a meta'. Il display mostra il conto alla rovescia, e il pannello «Pedale» dell'app lo spiega.

Il servizio del ponte non chiede accoppiamento. Chiunque sia a portata, con un'app BLE
generica, può collegarsi al pedale. E siccome **c'è un padrone alla volta**, il pedale
**molla l'ampli**: a metà concerto i footswitch smettono di funzionare. Chi si collega può
anche scrivere e cancellare banchi.

**Correzione**, da fare insieme al lavoro su `prova-ble`: accoppiamento con consenso — una
combinazione di tasti apre la finestra di accoppiamento, e il pedale accetta solo i
dispositivi accoppiati. In alternativa, il ponte resta spento e si accende solo in una
«modalità ponte» scelta coi tasti.

### 3. Il firmware manda all'ampli qualsiasi frame — medio, conseguenza del 2

**Corretto il 23 settembre 2026.** `frameAccettabile()` in `banchi.h`: un banco entra in memoria solo se **ogni** frame e' `f0 01 … f7` con comando `0x0101`, e se il primo chunk e' diretto al buffer software (banco `0x00`, posto `0x7f`). I byte si leggono in chiaro perche' stanno tutti sotto 0x80; si controlla anche che i bit di maschera della codifica 7/8 siano a zero.

`mandaPreset` spedisce i frame del banco così come sono arrivati, cambiando solo il seq. La
regola «il pedale non può toccare gli slot dell'ampli, per costruzione» vale quindi **solo se
i frame li ha costruiti la nostra app**. Un banco scritto da altri, o un difetto dell'app,
può sovrascrivere uno slot dell'ampli o mandare un comando che lo pianta.

**Correzione**: in `bancoInterpreta` accettare solo frame `f0 01 .. .. 01 01 … f7`, cioè
`0x0101`, e verificare nel primo chunk che la destinazione sia `0x7f`, dopo averlo
spacchettato dal 7 bit. Un banco che non passa non entra nemmeno in memoria, come già oggi
per quelli malformati.

### 4. Un backup importato da file può cancellare preset — basso-medio, lavoro perso

**Corretto il 17 settembre 2026.** `importBackup(backup, { lapidi: false })` ignora le cancellazioni del file, e «Importa un file» chiede conferma prima; tre test in `store-test`.

«Importa un file» con un nostro backup chiama `importBackup` **senza chiedere conferma**, e
applica le **lapidi** del file. I preset di fabbrica hanno lo stesso UUID per tutti: il
backup di un amico che ne ha cancellato uno **cancella anche il tuo**, se non l'hai toccato
dopo quella data. Va contro la prima regola della libreria.

**Correzione**: le lapidi valgono solo per il sync Dropbox, fra apparecchi dello stesso
utente, e non per un file importato (un'opzione di `importBackup`). Aggiungere una conferma,
come c'è già per i preset dell'app ufficiale.

### 5. Un preset con un modello inesistente passa il controllo — basso, ampli

**Corretto il 17 settembre 2026.** `controllaPreset(preset, { modelli })` dà errore sui nomi fuori elenco, e `mandaPreset` gli passa `SparkEffetti.MODELLI`; quattro test in `protocol-test`.

`Spark.controllaPreset` verifica tipi e intervalli, ma non che i modelli esistano. Un file
importato con un nome che l'ampli non conosce parte, e **può piantare l'ampli**: è già
successo con `TrebleBooster`, e si recupera solo staccando la corrente.

**Correzione**: errore se `effetto.name` non è in `SparkEffetti.MODELLI`. Il catalogo è
verificato tutto, quindi non blocca preset veri.

### 6. «Scollega Dropbox» non revoca il token — basso

**Corretto il 17 settembre 2026.** `scollega()` chiama `auth/token/revoke` e torna se la revoca è arrivata; il log lo dice. Quattro test in `dropbox-test`.

`scollega()` dimentica il refresh token in locale, ma lassù resta valido. Se l'apparecchio
fosse compromesso prima dello scollegamento, il token continuerebbe a funzionare finché non
lo si revoca da dropbox.com.

**Correzione**: chiamare `/2/auth/token/revoke` prima di dimenticarlo, senza bloccare lo
scollegamento se la chiamata fallisce.

## A posto

- **Nessun segreto nel repository né nella storia**: né token Dropbox, né chiavi. L'app key
  la mette l'utente e sta nell'IndexedDB.
- **Il refresh token di Dropbox** sta solo nell'IndexedDB locale: `exportAll` elenca i
  campi uno per uno e non lo include, quindi non finisce nei backup né su Dropbox; non
  compare nei log. PKCE senza server, app con permessi limitati alla sua cartella.
- **Iniezione di HTML**: ogni testo delle finestre che contiene un nome venuto da fuori passa
  da `testoConNome`; il resto usa `textContent`, e gli `innerHTML` rimasti sono svuotamenti o
  testi fissi. Niente `eval`, niente `new Function`. I link esterni hanno `noopener`.
- **Service worker**: intercetta solo le `GET` della stessa origine; Dropbox e il resto
  passano diretti.
- **Parser dei banchi nel firmware** (`banchi.h`): ogni lunghezza e ogni offset sono
  controllati; `PEZZO` fuori dal blocco viene rifiutato; un banco non interpretabile non
  viene salvato.
- **Nessuna dipendenza esterna**: font e codice in casa, niente CDN, niente rischio di
  catena di fornitura.

## 24 ottobre 2026 — gli attrezzi del pedale d'espressione

Controllo dopo le prove del pedale d'espressione (`docs/pedale-lavoro.md`, «Il pedale d'espressione»):

- **`tools/wah-ponte.ps1`** ascolta solo `http://localhost:8095/` e non ha autenticazione: **finché è
  acceso, una pagina web qualunque aperta nel browser può mandare righe al pedale** con una POST
  semplice a `/manda` (la risposta non la legge, ma il comando arriva) e, attraverso il pedale,
  parametri all'ampli. Rischio basso: il ponte si accende a mano solo durante le prove e si chiude
  con `/basta`. Se dovesse restare acceso a lungo: un segreto nell'URL della pagina, o il controllo
  dell'intestazione `Origin`.
- **`tools/wah.html`**: il nome del preset riletto dall'ampli entrava nell'HTML così com'era; adesso
  passa dalle entità. Il resto usa `textContent`.
- **`pedale/prova-controlx/`** si annuncia come un Control X e accetta chiunque si colleghi; chi si
  collega riceve le posizioni dei pedali e le risposte di un Control X; quello che scrive il firmware lo
  stampa e basta. È una prova, non va sul pedale vero così.
- **25 ottobre**: `tools/wah.html` si collega anche **direttamente all'ampli** col Bluetooth del PC e manda
  comandi interi (0x0104, 0x0115, 0x0128, 0x01a0, 0x019f): solo da pulsanti fissi della pagina, nessun campo
  libero.

## La versione per il PC — 9 novembre 2026

Parla con l'esterno per le stesse strade dell'app e coi suoi moduli: Bluetooth (ampli e pedale), Dropbox
(`dropbox-sync.js`, stesse chiavi in `settings`), `mailto` per le segnalazioni, la pagina del caffè in un'altra
scheda. Niente di nuovo verso fuori. Controllato il codice nuovo (`src/pc/`): i nomi che vengono dai dati
passano da `testoConNome` o da `textContent`; **il colore di una famiglia e l'app key di Dropbox stavano dentro
un attributo HTML** (un backup importato può portare un colore con le virgolette): ora si mettono da JS
(`style.setProperty`, `.value`). `test/ampli-finto.js` si carica solo con `#finto` e non parla con niente.

## Il sync automatico con Dropbox — 9 novembre 2026

Stesse strade di prima: `api.dropboxapi.com` e `content.dropboxapi.com` (già nella CSP), stesso token, la
cartella dell'app su Dropbox; in più un secondo file, `/spark-sicurezza.json`. Niente di nuovo verso fuori. La
differenza è che **quello che arriva lassù si applica da solo**, senza un gesto dell'utente: chi scrive quel
file (solo chi ha il token della sua app) può cambiare la libreria. Le difese:

- **una fusione che cancellerebbe più di 5 preset chiede prima** (Esc o tocco fuori = li tiene); sotto la
  soglia vale la regola di sempre, il preset toccato qui dopo la cancellazione resta;
- **il backup di sicurezza non lo tocca il sync**: lo scrive e lo rimette solo l'utente, e rimetterlo non
  cancella niente;
- i nomi che arrivano passano da `testoConNome` (nella domanda) o da `textContent` (riga di stato, log);
- un preset arrivato che l'ampli non ha resta fermo a `controllaPreset` prima di partire, come prima;
- un file rotto o non della libreria ferma il giro con un errore, senza toccare niente
  (`fondiSincro` controlla `format` prima di scrivere).
