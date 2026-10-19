# Audit di sicurezza — 17 settembre 2026

Fatto su tutto il repository: app (`index.html`, `src/`), service worker, sync Dropbox,
firmware del pedale (`pedale/prova-ble/`), strumenti e catture. Il repository
`mazzrelaz/SparklingTones` è **pubblico**.

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

### I commit vecchi con la license key — ancora aperti

Il 17 ottobre 2026 `github.com/mazzrelaz/SparklingTones/commit/6ef64ed` **si apre ancora**, e
`raw/6ef64ed/tools/looper-probe.html` scarica il probe di prima della riscrittura con la
costante `LICENSE_KEY` dentro. Dal nostro lato non si può fare altro: **solo l'utente può
chiedere al supporto di GitHub** di togliere i commit non più raggiungibili («remove cached
views» e garbage collection del repository, indicando `6ef64ed` e che la storia è stata
riscritta il 17 settembre 2026 per togliere dati sensibili).

### Voto

Per un'app personale senza server, **buono**: nessun segreto nostro nel repository, niente
dipendenze, testo esterno mai interpretato come HTML, una CSP stretta sugli script e sulla
rete. I punti deboli rimasti sono strutturali (chiavi dell'IA nel browser) o fuori dalle
nostre mani (la cache di GitHub).

## Da correggere — nessuno: tutti e sei corretti

### 1. La license key dell'app ufficiale è pubblicata — medio, legale

**Corretto il 17 settembre 2026.** Tolta dal probe e dalle tre catture, e dalla cronologia di git riscritta.

Come si è fatto: `git filter-branch --index-filter` su tutti i 311 commit di `main`,
sostituendo i blob delle 7 versioni del probe che contenevano la chiave e delle tre catture
con le loro versioni pulite; verificato che nessun commit contenga più i byte, che l'albero
finale sia identico a prima, e poi push forzato (`6ef64ed` → `87de95e`). **Tutti i codici dei
commit sono cambiati**: quelli citati in `docs/` prima del 17 settembre non esistono più.

**Resta una cosa che solo GitHub può fare**: i commit vecchi non sono più raggiungibili da
nessun ramo, ma **si aprono ancora conoscendone il codice** (`/commit/6ef64ed…` risponde
200). Per toglierli serve una richiesta al supporto di GitHub («remove cached views» /
garbage collection del repository). La copia completa di prima della riscrittura sta in un
`.bundle` nello scratchpad della sessione, e contiene ancora la chiave. **Ancora aperti il 17
ottobre 2026**: vedi il ricontrollo, sopra.

La chiave `0x0170` catturata dall'app ufficiale il 14 agosto sta in tre file pubblici:

- `tools/looper-probe.html`: la costante `LICENSE_KEY` e i pulsanti ②, ③ e ④ che la
  rigiocano;
- `captures/2026-08-14-app-ufficiale-looper.txt`: le righe `APP 0x0170`;
- `captures/2026-08-14-looper-rigioco-avvio.json`: la sequenza di avvio rigiocata.

Rigiocata, l'ampli la rifiuta (`0x0470` con `fe`), quindi non serve a sbloccare niente. Resta
però materiale della protezione di un prodotto a pagamento, pubblicato, e contraddice la
regola «cavare la chiave dall'app ufficiale non si fa». Il capitolo del looper è chiuso, e a
quei file la chiave non serve più.

**Correzione**: togliere la costante e i pulsanti dal probe, e le righe `0x0170` dalle
catture. **Resta nella storia di git**: toglierla anche da lì vuol dire riscrivere la storia
e fare un push forzato, e la decisione è dell'utente.

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
