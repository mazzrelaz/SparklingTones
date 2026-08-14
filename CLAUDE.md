# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth.

## Struttura

```
index.html               tutta l'app: sezione Preset e sezione Live, nello stesso documento
live.html                rimando a index.html#live, per le scorciatoie già installate
manifest.webmanifest     identità della PWA: nome, icone, scorciatoia alla vista live
sw.js                    service worker: guscio in cache, app utilizzabile offline
icons/logo.svg           il marchio dell'utente, logotipo orizzontale: sta in ogni schermata
icons/logo-mark.svg      il solo simbolo, quadrato: da lì nascono le icone dell'app
icons/*.png              icone della PWA, rigenerate da tools/make-icons.ps1
LICENSE                  MIT, Massimo Togni — libero utilizzo, nessuna garanzia
NOTICE                   software di terzi: Soundshed (MIT), paulhamsh (Apache 2.0)
src/spark-protocol.js    encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js   connessione BLE, coda di invio, attesa risposte, lettura preset
src/preset-store.js      libreria su IndexedDB, import dall'ampli, backup, banchi, categorie
src/spark-effetti.js     nomi di effetti e manopole + elenco modelli, dal catalogo Soundshed
src/spark-backup.js      legge preset_backup.zip dell'app ufficiale, senza librerie
src/pwa.js               registra il service worker, «installa» e «versione nuova»
tools/serve.ps1          server statico su localhost, per provare la PWA senza pubblicarla
tools/make-icons.ps1     rigenera le icone di icons/ con System.Drawing
tools/reader.html        legge la libreria dall'ampli e la esporta in JSON
tools/write-probe.html   prova le varianti di 0x0101 e verifica da sé rileggendo
tools/model-probe.html   idem per 0x0106: dieci varianti del cambio modello
tools/looper-probe.html  ascolta l'ampli mentre si usa il looper e prova i comandi noti
tools/explorer.html      tool diagnostico, congelato — single-file, apribile da Android
tools/explorer-v1.html   versione precedente, tenuta per riferimento
test/protocol-test.html  87 test del protocollo contro catture reali
test/transport-test.html 48 test del trasporto, con send finto e catture reali
test/store-test.html     99 test della libreria, su un database temporaneo
test/backup-test.html    33 test del lettore zip e della conversione dal formato ufficiale
test/fixtures/preset0.js catture condivise fra le suite: preset salvato e stato live
design/proposte-preset.html  le tre proposte grafiche messe a confronto, non è l'app
docs/                    handoff report con la ricerca iniziale sul protocollo
reference/paulhamsh/     sorgenti di riferimento (ESP32 + Python), BLE funzionante
captures/                log grezzi dall'ampli
```

Niente build step, niente server: tutto si apre da `file://`. Per questo i moduli sono
classic script che espongono `window.Spark` e `window.SparkTransport` invece di ES module,
che su `file://` sono bloccati dal CORS.

Trappola nel far girare le suite da un browser pilotato: **in una scheda in secondo piano
i timer vengono strozzati**, e una suite che ci mette un secondo sembra piantata a metà
per minuti. Non è un test che si blocca: basta portare la scheda in primo piano.

**Le suite girano anche senza aprire un browser**, con Edge headless — utile perché il
riquadro di anteprima trasforma i `file://` in istantanee statiche (gli script non
partono) e `localhost` è bloccato:

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/spark/test/protocol-test.html'
```

Poi si cerca `id="summary"` nel DOM stampato. Funziona per protocol, transport e backup.
**Su `store-test.html` no**: con il tempo virtuale IndexedDB non avanza e la pagina resta
a «esecuzione…» — non è un test rotto, è l'ambiente. Quella va aperta in un browser vero.

**Dopo ogni modifica a `src/`, apri le tre pagine in `test/` e verifica che il riepilogo
sia verde.** Girano contro catture reali dell'ampli, quindi intercettano una regressione
nella codifica senza avere l'hardware a portata. Due test confrontano i messaggi generati
con quelli che hanno davvero avuto effetto sull'ampli, byte per byte.

**Mai riscrivere un file di questo progetto con `Get-Content`/`Set-Content` di PowerShell
5.1.** Senza BOM, `Get-Content` decodifica l'UTF-8 come ANSI e `Set-Content -Encoding UTF8`
lo riscrive doppiamente codificato: ogni accento e ogni «—» diventano `Ã ` e `â€"`, in
tutto il file, in silenzio. Successo il 13 agosto 2026 su `index.html`, `live.html` e
`pwa.js` facendo un semplice replace di colori — visto solo da uno screenshot
(«cerca un presetâ€¦»). Le modifiche vanno fatte con gli strumenti di edit, o in .NET con
l'encoding esplicito. Se ricapita si torna indietro senza perdere il lavoro: si rilegge
il file come UTF-8, si toglie l'eventuale `﻿` iniziale e si riscrivono i byte
convertendo la stringa in **CP1252** — è esattamente la trasformazione inversa.

IndexedDB funziona da `file://` su Chrome desktop (verificato). Attenzione però: su
`file://` tutte le pagine condividono la stessa origine opaca, quindi non c'è isolamento
fra i database, e il browser può ripulirli più facilmente.

`tools/explorer.html` contiene una copia propria del codice di protocollo, perché deve
restare single-file per essere copiato sul telefono. È **congelato**: le modifiche vanno
in `src/`, non lì.

La libreria non perde mai il lavoro dell'utente: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, preferiti e ordine.
È il comportamento più importante di `preset-store.js` ed è coperto da test.

## PWA

`manifest.webmanifest` + `sw.js` + `src/pwa.js`. Verificato su localhost il 12 agosto 2026:
service worker attivo, guscio in cache, e **con il server spento `live.html` si apre lo
stesso, con tutti gli script**. È la prova che conta: a un concerto la rete non c'è.

Percorsi **tutti relativi** (`./`), così l'app funziona sia in root sia in un
sottopercorso tipo `utente.github.io/spark/`, senza toccare niente.

**Strategia di cache: stale-while-revalidate.** Si risponde sempre dalla copia salvata e
si riscarica in sottofondo per la volta dopo. Cache-first puro rischia di restare
inchiodato a una versione vecchia se ci si dimentica di alzare `VERSIONE` in `sw.js`;
network-first fa aspettare la rete proprio quando non c'è. `VERSIONE` va comunque alzata
a ogni rilascio: è quello che ripulisce le cache vecchie e fa comparire l'avviso.

**L'ancora va tolta dalla chiave di cache.** L'url di una `Request` la contiene, quindi
`index.html`, `index.html#live` e `index.html#libreria` finivano in tre voci distinte
della stessa pagina, aggiornate ognuna per conto suo e nessuna delle quali era quella
precaricata all'installazione. `rispondi()` normalizza la chiave a origine + percorso +
query. Trovato subito dopo aver messo le due viste sull'hash, guardando cosa c'era
davvero dentro `caches`.

**L'aggiornamento non si applica mai da solo.** Il nuovo worker resta in attesa e la
pagina mostra una striscia «C'è una versione nuova — Aggiorna»; solo premendo lì parte
`skipWaiting` e il ricaricamento. Un reload a sorpresa fra due pezzi sarebbe il peggio
che possa capitare. Provato tutto il giro su localhost: striscia, click, cache vecchia
rimossa.

Trappola già inciampata e risolta: alla primissima visita `clients.claim()` fa scattare
`controllerchange` senza che ci sia niente da aggiornare. `pwa.js` guarda se la pagina
*era già controllata* al caricamento, altrimenti ricaricherebbe da sola ogni prima visita.

Da `file://` `pwa.js` non fa niente (i service worker vogliono un'origine sicura), quindi
lo sviluppo aprendo i file resta identico a prima e nessuna cache si mette in mezzo.

**Passando da `file://` a https la libreria non viene dietro**: è un'altra origine, quindi
un altro IndexedDB. Va esportata in JSON da `file://` e reimportata sul sito. Vale la pena
ricordarlo prima di pubblicare, non dopo.

`live.html` usa `viewport-fit=cover` e le `env(safe-area-inset-*)`: installata a schermo
intero, senza, header e log finirebbero sotto la tacca e sotto la barra dei gesti.

Per provare: `powershell -ExecutionPolicy Bypass -File tools\serve.ps1`, poi
`http://localhost:8099/` — localhost conta come origine sicura, quindi service worker e
Web Bluetooth funzionano entrambi.

Due trappole nel provare, che sembrano bug dell'app e non lo sono. Navigare all'url su
cui la pagina già si trova, ancora compresa, è una navigazione *same-document*: non
ricarica niente e le modifiche al CSS non si vedono. Serve `location.reload()`. E
`unregister()` più `caches.delete()` lasciano il worker vecchio a controllare la scheda
finché non la si chiude: per una prova pulita conviene aprire una scheda nuova.

**Il 12 agosto 2026 la registrazione del service worker su `serve.ps1` ha smesso di
funzionare**: `An unknown error occurred when fetching the script`, mentre lo stesso
`sw.js` si scarica benissimo con una fetch normale (200, `text/javascript`, lunghezza
giusta) e su un'altra porta fa lo stesso. Prima nella stessa sessione aveva funzionato.
Non tocca l'app pubblicata — su https il worker si registra — quindi il banco di prova
locale resta buono per tutto il resto, ma **il service worker va verificato sul sito
vero**, non qui. Da riprendere se serve provare la cache offline senza pubblicare.

**Pubblicata il 12 agosto 2026** su `https://mazzrelaz.github.io/SparklingTones/`
(repo `mazzrelaz/SparklingTones`, GitHub Pages da `main` / root). Verificato sul sito
vero: manifest servito come `application/manifest+json`, service worker attivo con scope
`/SparklingTones/`, quindici voci in cache, `navigator.bluetooth` disponibile. I percorsi
relativi hanno retto il sottopercorso senza una modifica.

Il push non parte dalla mia shell, che è non interattiva: Git Credential Manager non
riesce a chiedere le credenziali e git muore con *terminal prompts disabled*. Funziona
lanciandolo con `GIT_TERMINAL_PROMPT=1`, `GCM_INTERACTIVE=true` e `GCM_GUI_PROMPT=true`,
che gli fanno aprire la finestra grafica sul desktop dell'utente.

## Importazione dall'app ufficiale

L'app Spark salva su Dropbox `preset_backup.zip`, che ha questa forma:

```
preset_backup/Presets/<Categoria>/category.json
preset_backup/Presets/<Categoria>/<UUID>/preset.json
preset_backup/Presets/<Categoria>/<UUID>/icon.png
```

**Le cartelle di categoria diventano tag**, quindi la catalogazione dell'app ufficiale
arriva già fatta. Le icone si ignorano: mezzo mega l'una e tutte uguali.

Il formato di `preset.json` mappa quasi uno a uno sul nostro: `meta` per i metadati,
`sigpath` per la catena, `dspId` per il nome dell'effetto, `active` per l'interruttore.
Due differenze che contano, entrambe trovate sul backup reale da 105 preset:

- **alcuni parametri sono booleani** invece che numeri (21 casi): vanno convertiti in
  0 e 1, altrimenti l'encoder produce NaN
- **nomi e descrizioni superano i 31 caratteri** (21 preset su 105): oltre quella
  lunghezza serve la long string `0xd9`, perché `0xa0+len` sconfinerebbe in un altro
  tipo. Se ne occupa `encAutoString`.
- **i campi di testo possono non essere testo**: una `version` scritta `0.7` invece di
  `"0.7"`, una `description` numerica, un `index` di parametro come stringa. Passavano
  dritti nel record e `encAutoString` su un numero produce byte senza senso, che l'ampli
  conferma chunk per chunk e poi ignora — silenzio, non errore. `convertiPreset` ora li
  forza con `testo()` e `indice()`. Trovato il 12 agosto 2026 cercando perché un preset
  importato non si scriveva in uno slot; **non ancora confermato che fosse quella la
  causa** sul preset dell'utente.

Lo zip si legge senza librerie: la struttura è poca cosa e per la decompressione basta
`DecompressionStream('deflate-raw')`, che i browser hanno già. Attenzione agli offset
della central directory — nome a 28, extra a **30**, nota a **32**.

`importFromBackup` aggiunge la categoria ai tag esistenti invece di sostituirli:
reimportare il backup non deve cancellare la catalogazione fatta qui.

Provato sul backup reale l'11 agosto 2026: 105 preset importati, e uno di quelli importati
(`Fingerstyle Reverb`, mai passato per l'ampli) è stato caricato e **verificato
rileggendolo**. Gli effetti che compaiono solo nel backup — `UniVibe`, `Comp76`,
`Preamp73`, i `Vocal*` — sono quindi accettati dall'ampli.

## Sezione Preset

Due elenchi separati, ed è la richiesta che governa tutto il resto: **gli otto preset
caricati sull'ampli stanno per conto loro**, sopra, con l'etichetta A1…B4 e i colori dei
LED (rosso il banco A, verde il B). Tutti gli altri stanno sotto. Un preset non compare
mai in tutti e due i posti.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, chiamata
dopo `identify`): la prima cosa che serve sapere è cosa c'è davvero sull'ampli, e
chiederlo a mano è un passaggio che si dimentica. Non costa niente perché `importFromAmp`
non tocca il lavoro dell'utente. Durante la lettura i pulsantoni della vista live restano
spenti: l'ampli sta rispondendo a otto richieste in fila e premerne uno infilerebbe un
comando dentro una conversazione già aperta.

`store.hardware()` restituisce sempre otto posti, con `null` dove non sappiamo ancora
cosa ci sia: la libreria conosce uno slot solo dopo averlo letto o scritto, e gli otto
riquadri tratteggiati lo dicono senza mentire. Nel disegnare la sezione «In libreria» il
confronto va fatto **per id**, non per oggetto: `hardware()` rilegge dal database e
restituisce copie diverse dagli stessi record che stanno in `tutti`.

### `slots` è una lista, non un numero

Lo stesso preset può stare in **più slot dell'ampli**, e capita davvero: sul Spark
dell'utente due slot contenevano lo stesso suono. Con un campo `slot` singolo l'ultimo
letto vinceva e l'altro slot compariva come «non ancora letto» — è così che il difetto è
venuto fuori, il 12 agosto 2026, guardando A3 vuoto quando non lo era.

`normalizzaSlots` tiene una sola verità: costruisce `record.slots` ordinato e **cancella
il vecchio `slot`**, così due campi non possono divergere. Converte da sola i record
vecchi, e `_migraSlotInLista` passa una volta su tutta la libreria alla prima apertura
(flag `slotComeLista` fra le preferenze).

`_sistemaSlot(visti)` è il cuore, condiviso fra `importFromAmp` e `assignSlots`. Riceve
una mappa *slot osservato → uuid* e per ogni record calcola
`(slot vecchi meno quelli osservati) ∪ (osservati che sono suoi)`.

**Si toccano solo gli slot osservati**, ed è la parte che conta: `readLibrary` salta gli
slot che non rispondono, e cancellare uno slot mai visto farebbe sparire un preset dalla
libreria per un timeout. Un test lo verifica passando una lettura parziale.

Nella UI un preset in due slot compare **due volte** nella sezione «Sull'ampli», una per
slot, e il dettaglio avvisa dov'è l'altra copia. La chiave di apertura del dettaglio è
`id:slot` e non `id`, altrimenti toccarne una aprirebbe tutte e due.

### Il pannello dell'ampli, e le schede

Rifatta il 13 agosto 2026, scegliendo fra tre proposte messe a confronto in
`design/proposte-preset.html` (pagina a parte, non è l'app). Quello che non andava:
**gli otto slot erano disegnati come righe di libreria qualsiasi**, mentre sono un'altra
cosa — sono il pannello dell'ampli, sono otto e sempre otto, e hanno i colori dei LED che
si guardano mentre si suona. E la riga riassumeva la catena con gli identificativi
(`bias.noisegate · LA2AComp · …`), che a colpo d'occhio non dicono niente.

Adesso: gli slot sono **due banchi da quattro** affiancati come sull'ampli, ognuno con il
LED del suo banco, il nome e — al posto della catena intera — **l'ampli e il drive**, che
sono quello che si cerca. Il dettaglio di uno slot si apre **a tutta larghezza sotto la
griglia**: dentro una cella sfonderebbe la colonna.

I preset in libreria sono schede con la catena a **pastiglie coi nomi leggibili**, dove i
blocchi spenti si vedono spenti invece di sparire (fa parte di com'è fatto quel suono), e
il riverbero porta il **tipo** invece della parola «Riverbero», che è sempre la stessa e
non distingue niente. Il tasto ▶ per provare un preset è sulla scheda: era l'azione più
frequente e stava sepolta nel dettaglio.

Nel dettaglio la catena è **una riga sola di nomi separati da «-», senza valori**: lì si
guarda *che catena è*, e una colonna di numeri a due decimali non la legge nessuno — le
manopole si regolano da «Regola», che è il posto dove servono.

I nomi dei pulsanti li ha decisi l'utente: **«Attiva»** manda il preset all'ampli senza
toccare nessuno slot (era «Prova adesso»), **«Invia a preset HW»** lo scrive in uno slot
(era «Scrivi»). Quello che seleziona uno slot già scritto si chiama adesso «Seleziona
A1», perché «Attiva A1» accanto ad «Attiva» erano due cose diverse con lo stesso nome.

**I preferiti non ci sono più**, tolti su richiesta: via la stella dalle schede e il
filtro dall'intestazione. Il campo `favorite` resta nei record e nello store — cancellarlo
butterebbe via scelte già fatte — ma non si vede e non filtra niente.

**Fondo nero e rosso al posto dell'arancione**, scelta dell'utente. I riquadri non sono
neri a loro volta (`--panel:#121316`): su nero pieno una scheda si vede solo se è un filo
più chiara, altrimenti reggono tutto i bordi e la pagina diventa un reticolo. Cambiati
anche `theme-color`, il manifest, il rimando di `live.html` e la striscia di `pwa.js`.

### Il marchio e le icone

Il logo è dell'utente: `icons/logo.svg`, un **logotipo orizzontale** («SparklingTones»,
rapporto circa 5,7:1). Si fissa **l'altezza** e la larghezza viene da sé: in un quadrato
si schiaccerebbe.

**Il nome della vista non c'è più**, tolto su richiesta: niente «Preset» o «Live» accanto
al marchio. Non manca a nessuno — quale vista si ha davanti lo dicono il contenuto e il
pulsante che porta all'altra. Il logo ha `margin-right:auto` e spinge i pulsanti dalla
parte opposta, che è il lavoro che prima faceva il titolo con `flex:1`.

**I nomi delle pagine non ci sono più da nessuna parte**, su richiesta: né in intestazione
né in cima ai pannelli. Restano solo i titoli che dicono *su cosa* si sta lavorando — il
nome del preset nell'editor, la posizione della catena nella scelta del modello, il posto
del banco — che non sono nomi di pagina ma il contenuto stesso.

L'app si chiama **SparklingTones** ovunque si veda: `<title>`, manifest (`name` e
`short_name`), titolo iOS. Prima era «Spark 2 Controller», che era il nome del progetto,
non del prodotto.

**Il marchio sta in ogni schermata**, anche nei pannelli a tutto schermo. Non è ripetuto
nel markup: `marchioNeiPannelli()` copia quello dell'intestazione in ogni
`.pannello > .barra-alta` all'avvio, così i pannelli che si aggiungeranno ce l'hanno
senza doverselo ricordare. Non aspetta il database — i pannelli sono già nel documento —
e se il file del logo manca non copia niente, perché l'originale si è già tolto da solo
invece di lasciare un'icona rotta in cima a ogni pannello.

**L'accento dell'app è il rosso del logo** (`#e30613`) e non un rosso scelto a parte: sulla
stessa barra il marchio e il pulsante «Connetti» si toccano, e due rossi diversi si vedono.

`icons/logo-mark.svg` è il **simbolo da solo** — l'onda e le scintille, senza la scritta —
ricavato dal file dell'utente prendendone i tracciati, non ridisegnato. Serve per le
icone, che sono quadrate: un logotipo lungo cinque volte la sua altezza, dentro un
quadrato, è illeggibile. Non sta nel guscio del service worker: non lo carica nessuno,
serve solo a generare le icone.

`tools/make-icons.ps1` adesso **rasterizza quell'SVG con Edge headless** invece di
ridisegnare a mano con System.Drawing, così l'icona è lo stesso file del marchio.
Due trappole trovate lì, che valgono ogni volta che si fa uno screenshot headless:

- **headless non scende sotto una finestra di circa 500×500.** Chiedere uno screenshot da
  192 px non ridimensiona: ritaglia l'angolo in alto a sinistra, che essendo vuoto esce
  **tutto nero** e sembra un errore di disegno. Si rasterizza a 1024 e si riduce con
  System.Drawing.
- l'icona **maskable** viene ritagliata dentro un cerchio dal sistema, quindi ha un
  margine suo (16% invece di 6%).

### Famiglia di suono: un asse a parte dalle categorie

Chiesta dall'utente, ed è la distinzione da non perdere: **le categorie sono lo stile**
(Pink Floyd, jazz, il pezzo) e un preset ne può avere quante ne vuole; **la famiglia dice
che tipo di suono è** — Clean, Drive, Acoustic — è una sola, e serve a riconoscerlo dal
colore senza leggere niente.

Tre e non di più, perché più di tre colori non si distinguono con un'occhiata. Si
assegnano **a mano** dal dettaglio del preset: nessuno prova a indovinarle dal modello di
ampli. **Chi non ne ha resta senza colore**, ed è deliberato — un colore inventato qui si
legge senza pensarci, quindi è peggio di nessun colore.

I colori di partenza (`FAMIGLIE` in `preset-store.js`) si cambiano con
`setColoreFamiglia`, e finiscono in `exportAll` come i nomi dei parametri: sono scelte
dell'utente, e `importBackup` le aggiunge senza sovrascrivere quelle più recenti.
`importFromAmp` non tocca la famiglia — è nel record, non nella parte sonora — e un test
lo verifica.

### Categorie

Le categorie sono le stesse etichette del campo `tags`, con accanto un elenco governato
dall'utente in `settings.categorie`. L'elenco mostrato è **l'unione** fra quello salvato
e quelle davvero in uso: si può creare una categoria prima di avere qualcosa da metterci,
e una che arriva da un import compare lo stesso senza doverla registrare a parte.

`renameCategory` e `removeCategory` agiscono anche su tutti i preset che la portano;
`clearCategories` azzera tutto e serve a ripartire da zero. I preset non si toccano mai:
perdono l'etichetta, non esistono di meno.

**Le categorie del backup dell'app ufficiale non entrano più in libreria.** `parseBackup`
continua a riportarle perché stanno nel file, ma `importFromBackup` le scarta: arrivavano
decine di nomi mai scelti da nessuno. Chi le rivuole passa `{categorieDalBackup: true}`.

## Sezione Live

Si suona, non si cataloga. Il compromesso che la governa: un preset che sta già in uno
slot dell'ampli si attiva **istantaneamente** con `0x0138`, uno che non c'è va trasmesso
per intero e ci mette circa un secondo. Il pulsante dice sempre quale dei due casi è.

**Banchi da otto, quattro a sinistra e quattro a destra**, come i due banchi di LED
dell'ampli. La griglia è `grid-auto-flow: column` con quattro righe: senza, il riempimento
sarebbe per riga e i posti 1–4 finirebbero a zigzag invece che tutti a sinistra.

- Il banco **«Ampli» non è salvato da nessuna parte**: si ricava dal campo `slot` dei
  record. Così non può divergere da quello che c'è davvero sull'ampli, e non esiste il
  problema di tenerlo sincronizzato. Si cambia scrivendo un preset in uno slot dalla
  sezione Preset, non da qui.
- I banchi inventati dall'utente stanno in `settings.banchi`. **Non scrivono mai
  sull'ampli**: scelta esplicita dell'utente, i loro preset si caricano al momento
  (~1s). Per questo non c'è più nessun «Prepara» — se lo scrivesse, sovrascriverebbe
  proprio il banco fisso.

`getBanks` sostituisce con `null` gli id di preset cancellati, come faceva `getSetlist`:
meglio un posto vuoto che un pulsante morto. La scaletta di prima viene convertita in un
banco «Scaletta» alla prima apertura (`_migraScalettaInBanco`), una volta sola.

### Perché Preset e Live stanno nello stesso file

**La connessione BLE vive nel documento.** Finché erano due pagine, passare da libreria a
live era una navigazione: il browser buttava via tutto e all'ampli toccava riconnettersi
a mano ogni volta. Nessuna API lo evita — `navigator.bluetooth.getDevices()` al più
risparmia la finestra di scelta, ma la riconnessione resta. L'unico rimedio vero è non
navigare: dal 12 agosto 2026 le due viste sono in `index.html` e si scambiano cambiando
una classe sul `body`, quindi `spark` resta lo stesso oggetto.

**Verificato sull'hardware il 12 agosto 2026**, dal telefono sul sito pubblicato: con
l'ampli connesso si passa fra libreria e live avanti e indietro e la connessione non
cade. Prima di questa modifica cadeva a ogni passaggio, quindi la prova distingue.

Il passaggio è sull'hash (`#live` / `#preset`) e non su una variabile: così il tasto
indietro di Android torna ai preset invece di chiudere l'app, e la scorciatoia «Live»
del manifest può puntare dritta a `index.html#live`. `live.html` è rimasto come rimando,
perché la scorciatoia vecchia può essere già installata sul telefono.

Attenzione toccando il CSS: le due sezioni condividono un solo `<style>`. Le regole dei
preset vanno sotto `body:not(.vista-live)` e quelle live sotto `body.vista-live`,
comprese le variabili di colore — la vista live è più scura — e la media query del
telefono, dove nei preset il titolo si prende una riga sua e nella live sparisce del
tutto, perché ogni riga di header è spazio tolto ai pulsantoni.

## Editor della catena effetti

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che
governa tutto il resto, presa con l'utente. Per questo «Regola» prima manda il preset
all'ampli con `loadPreset`, e solo dopo apre il pannello.

Lo stato di partenza si rilegge **dall'ampli** (`readLiveState`), non dalla libreria: se
l'utente ha girato una manopola vera o ha modificato il suono dall'app ufficiale, la
verità è lì. Se la rilettura fallisce l'editor non si apre — meglio niente che manopole
che partono da valori inventati.

Niente viene salvato finché non si preme **Salva in libreria**: allora la catena
modificata finisce nel record. L'ampli invece cambia subito, ma solo nel suono corrente:
lo slot salvato resta com'era finché non lo si riscrive.

**Le sette posizioni sono etichettate per categoria** (`Spark.CATENA`): noise gate,
compressore, drive, ampli, modulazione, delay, riverbero. L'ordine è documentato e
confermato da ogni preset letto dal dispositivo — un test lo verifica sulla cattura reale.

### Com'è fatto l'editor

Rifatto il 13 agosto 2026 su richiesta («così fanno schifo»), e le scelte sono queste:

**Il modello si cambia dalla tendina che è il nome stesso del blocco.** Prima c'era un
pulsante «cambia» accanto, che apriva un pannello a parte con la ricerca: nessuno
collegava quel pannello al nome che stava leggendo, e per cambiare un ampli si usciva da
dove si stava lavorando. Il pannello dei modelli è stato tolto — la tendina nativa si
sfoglia col pollice e sul telefono si apre a tutto schermo, quindi fa lo stesso lavoro.
L'ultima voce è «altro modello, a mano…», perché l'elenco non è per forza completo.

**L'identificativo interno non si vede più** (`Twin`, `LA2AComp`): serve nei comandi, non
a chi sta regolando un suono, e stava sotto ogni nome a fare rumore. Resta nel
suggerimento di ogni voce della tendina.

**Il nome del preset è grande e su una riga sua**, non più accanto al marchio dove non si
leggeva. In un pannello che cambia il suono sotto le dita, sapere *quale* suono si sta
cambiando viene prima di tutto.

**Ogni parametro si prende due righe**: nome a sinistra e valore a destra, il cursore
sotto a tutta larghezza. Prima stavano tutti e tre in fila e al cursore restava una
fessura — su un telefono si prendeva col pollice a fatica. Il cursore è disegnato da capo
e **la guida si riempie fino al valore** (`--p` sull'elemento, gradiente nel CSS): senza,
un cursore a metà e uno a zero si distinguono solo cercando la pallina. Su schermo largo
i parametri vanno a due colonne, altrimenti cinque manopole in colonna fanno scorrere la
pagina a ogni blocco e la catena non si vede mai intera.

**La spiegazione lunga sui nomi in corsivo sta chiusa** dietro un «perché certi nomi sono
in corsivo»: serve una volta sola, e tutti i giorni è un muro di testo fra te e le
manopole.

### La tabella dei nomi: `src/spark-effetti.js`

Nessuna fonte del progetto diceva come si chiamano gli effetti in chiaro né le loro
manopole. La tabella viene dal catalogo di **Soundshed**, app open source per gli Spark,
licenza MIT (`src/spork/src/devices/spark/sparkFxCatalog.ts`) — l'idea è dell'utente, e
ha risparmiato giorni di dettatura.

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto.** Su un
ampli le manopole si leggono Gain, Bass, Middle, Treble, Master, ma negli indici stanno
`Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`: bassi e alti invertiti. Su LA Comp
l'interruttore Limit/Compress è il parametro 0, non l'ultimo come appare. Trascrivendo
dall'interfaccia — che è come avevamo cominciato — si sbagliava in silenzio. Due test
fissano proprio questi due casi.

Restano **proposte**: il catalogo è nato per lo Spark 40 e i nomi degli ampli sono quelli
di Soundshed, non di Positive Grid. Per questo si vedono *in corsivo*, un nome scritto a
mano vince sempre, e `manopola()` **scarta l'intera riga** se dichiara più manopole di
quante l'ampli ne manda per quell'effetto — meglio numeri onesti che nomi su manopole
altrui. Un test fa lo stesso controllo sulla cattura reale.

Il riverbero è l'unico adattamento: Soundshed lo spezza in nove voci `bias.reverb.N`, una
per tipo, tutte con le stesse sei manopole. Il nostro ampli manda un solo `bias.reverb`
con **sette** parametri, quindi si tengono i sei nomi e il settimo — quasi certamente il
tipo — resta un numero. Il parametro 0 è confermato da un'altra strada: girando la
manopola fisica del riverbero l'ampli manda `bias.reverb` parametro 0 (docs §3.6).

### Parametri che manopole non sono

**Il numero di parametri di un effetto cambia da preset a preset.** Nelle otto catture di
`captures/2026-08-10-libreria-8-preset.json` il noise gate ha due parametri su tre preset
e **tre** sugli altri cinque; il riverbero sette e otto, negli stessi cinque. Il parametro
in più è sempre l'ultimo e vale **esattamente 1**, in tutti e dieci i casi. Succede anche
altrove (`DistortionTS9` con quattro, `SABdriver` con quattro) ma lì c'è un esempio solo a
testa, troppo poco per dirne qualcosa.

Il noise gate di manopole ne ha due, e l'utente l'ha notato subito: un cursore chiamato
«3» in mezzo a quelli veri. Da qui il campo `quante` nella tabella: **quante manopole ha
davvero l'effetto**. Può essere più dei nomi che sappiamo (riverbero: sette manopole, sei
nomi) e meno dei parametri che arrivano. `SparkEffetti.extra(id, indice)` risponde sul
singolo parametro, e senza `quante` risponde sempre no — non sapere non è un motivo per
mettere via qualcosa.

Nell'editor quei parametri **non spariscono**: finiscono in un `<details>` chiuso in fondo
al blocco, «1 parametro che non è una manopola», e lì si muovono come tutti gli altri.
Nasconderli sarebbe la stessa bugia di prima al rovescio, e se un domani si scopre che uno
conta davvero è ancora lì.

**Sappiamo cos'è: l'acceso/spento del blocco.** Misurato sull'ampli il 13 agosto 2026 sul
noise gate e sul riverbero, identico tutte e due le volte — ed è l'utente ad averlo
intuito dal comportamento:

- da 0.00 a 0.49 il gate non lavora, da 0.50 a 1.00 sì — soglia a metà;
- il valore però **non viene arrotondato**: scritto 0.50, riletto 0.50. È un float
  memorizzato tale e quale e letto come booleano, non un booleano;
- spegnendo il blocco con `0x0115` **l'ampli ci scrive 0 da solo**: è lo stesso
  interruttore visto da un'altra parte;
- e **nell'app ufficiale quel parametro non compare**, perché lì c'è già l'interruttore.

Come si è arrivati alla misura, che è il pezzo riutilizzabile: «a zero il gate non gatta»
non distingue un interruttore da una manopola di profondità — a zero tacciono tutti e due.
Il modo di distinguerli è **scrivere un valore di mezzo e guardare cosa ci ridà l'ampli**:
se l'avesse arrotondato sarebbe un interruttore. Da lì è nato il pulsante «Rileggi
dall'ampli» nell'editor, che serve a ogni misura di questo tipo.

Nell'editor quel parametro quindi **non è più un cursore**: si vede, dice «acceso» o
«spento», e si cambia dall'interruttore in cima al blocco. Un cursore lì spegneva il
blocco alle spalle dell'interruttore, che continuava a dire «acceso» — la UI mentiva. Per
lo stesso motivo, premendo l'interruttore il parametro viene aggiornato anche in locale.

Non è una particolarità di un effetto, quindi `nomeExtra` non lo tiene per riga: vale per
**ogni riga che dichiara `quante`**, perché è lì che si sa quali parametri avanzano. Dove
`quante` non c'è non si sa nemmeno quali siano di troppo, e restano numeri.

Cade con questo l'ipotesi del firmware vecchio contro nuovo: il parametro in più non è un
residuo, è **lo stato dell'interruttore scritto anche dentro l'array dei parametri**. Il
perché di preset che ce l'hanno e preset che no resta aperto, ma adesso è una domanda su
come sono nati quei preset, non su cosa sia quel valore.

### Il tipo di riverbero è il settimo parametro

Non è un modello: nell'elenco dei modelli il riverbero è uno solo, `bias.reverb`, e chi
cerca sala, molla o piastra lì non li trova. Non è un difetto dell'elenco — **l'ampli ha
un solo effetto riverbero per tutti i tipi** (docs §3.10), quindi il tipo per forza è un
parametro. Che sia il settimo lo dicono i valori: negli otto preset letti dall'ampli vale
0, 0.1, 0.2 o 0.3, sempre un multiplo esatto di un decimo, e nessun'altra manopola di
nessun altro effetto si comporta così. I tipi sono nove, quanti sono i `bias.reverb.N`
di Soundshed.

Prima era lasciato senza nome perché «quasi certamente» non basta per scriverci
un'etichetta sopra. Adesso si chiama *Tipo* lo stesso, per due motivi: è in corsivo come
tutte le proposte della tabella, quindi lo dichiara già; e lasciarlo numerato rendeva i
tipi di riverbero irraggiungibili, che è il difetto vero. Il campo `scelte` della tabella
gli fa fare un elenco a tendina invece di un cursore — con un cursore continuo azzeccare
la posizione giusta sarebbe un terno al lotto.

**Verificato sull'ampli il 13 agosto 2026**: cambiando posizione nell'elenco il riverbero
cambia davvero. Non era più un'ipotesi da un pezzo, ma adesso è una misura.

**I nove nomi li ha dettati l'utente il 13 agosto 2026**, letti dall'app ufficiale: Room
Studio A, Chamber, Hall Natural, Plate Short, Hall Ambient, Plate Rich, Hall Medium,
Plate Long, Room Studio B.

**L'ordine però non è confermato.** Che l'elenco dell'app segua i valori del parametro è
verosimile e niente lo contraddice, ma nessuno l'ha verificato. Nell'elenco si legge il
solo nome — scelta dell'utente, e il numero accanto era rumore per chi suona — mentre la
posizione resta nel suggerimento di ogni voce. Se un giorno si scoprisse sfasato, basta
ascoltare due tipi lontani fra loro (un Plate e un Room) e la correzione è una rotazione
dell'elenco, non una caccia.

`MODELLI` sta nello stesso file e viene dallo stesso catalogo, più i modelli che
compaiono nei preset dell'utente ma che lì non ci sono (`JH.FuzzTone`, `Comp76`,
`Preamp73`, gli altri `JH.*`): di quelli non sappiamo i nomi delle manopole e restano
numerate.

### I nomi dei parametri li dà l'utente

L'ampli manda i parametri come indici e basta, e **non esiste una tabella da cui dedurne
i nomi**: cercata nella documentazione del protocollo, nei sorgenti di riferimento e nelle
catture, non c'è. Inventarli sarebbe peggio che lasciare un numero, perché un'etichetta
sbagliata sopra una manopola che cambia il suono la si crede.

Quindi li battezza l'utente, girando e ascoltando: si tocca il numero e si scrive il nome.
Sono salvati **per modello di effetto** (`settings.nomiParametri`), non per preset, quindi
si dà una volta e vale in ogni preset che usa quel modello.

`exportAll` porta con sé nomi e categorie, e `importBackup` li **aggiunge** invece di
sovrascrivere: reimportare un backup vecchio non deve cancellare i battesimi fatti da
allora. È lavoro dell'utente che non si ricava da nessun'altra parte — perderlo esportando
sarebbe il modo più stupido di buttarlo via. Non ci vanno invece i banchi, che puntano
agli id dei preset, e gli id cambiano reimportando.

### Cambiare il modello di un blocco

`0x0106` scambia il modello (`changeEffectModel`), e `Spark.MODELLI` elenca i candidati
per ogni posizione della catena, presi da `docs/HANDOFF-2026-08-10.md` §3.10 più quelli
emersi dal backup ufficiale. L'elenco **non è per forza completo** — l'ampli ne conosce
altri che nessuna fonte elenca — quindi c'è sempre «Scrivilo a mano».

Dopo il cambio **i parametri sono altri**: cambiano di numero e di significato, e i valori
di prima non vogliono dire più niente. Perciò si rilegge la catena dall'ampli invece di
indovinare, e si controlla che il modello nuovo sia davvero lì — ack o no.

**Nell'app non funziona, ma il messaggio è giusto.** L'utente ha segnalato il 12 agosto
2026 che scegliendo un modello (ampli, drive) non succede niente. `tools/model-probe.html`
ha provato dieci varianti sull'ampli vero, ognuna verificata rileggendo la catena, e il
risultato è netto:

| variante | forma | esito |
|---|---|---|
| **A** | prefissate + `0x00` finale — **quella che l'app manda già** | **funziona** |
| B | senza byte finale, come lo Spark 40 | nessun effetto |
| C | due `0x00` in coda | funziona |
| D, E | stringhe corte `0xa0+len` senza il byte di lunghezza | nessun effetto |
| F, G | posizione della catena in testa o in coda | nessun effetto |
| H | solo il nome nuovo | nessun effetto |
| I | A, poi `0x0115` che riaccende | funziona |
| J | nomi invertiti | nessun effetto |

Quindi, tutto verificato sull'hardware: **anche `0x0106` vuole il byte `0x00` finale** (B
fallisce, A no) e un secondo `0x00` non dà fastidio; **le stringhe devono essere quelle
prefissate** `[len, 0xa0+len, …]`, non le corte; e **il primo nome è il modello che c'è
adesso**, il secondo quello nuovo — l'ordine del riferimento (`Spark.ino:157`), non
l'inverso.

**Il buffer software non c'entra**, ipotesi esclusa da misura diretta il 13 agosto 2026:
mandato un preset nel buffer `0x7f` come fa «Regola» e riprovata la variante A, il
modello cambia lo stesso. `0x0106` funziona in tutti e due gli stati.

Il difetto era quindi nell'app, e il comando partiva con **il nome vecchio sbagliato**.
`0x0106` dice «al posto di questo mettimi quello»: se il primo nome non è davvero nella
catena, l'ampli ignora tutto senza fiatare. L'editor lo prendeva da quello che aveva sullo
schermo, e lo schermo può essere rimasto indietro per più di un motivo — una rilettura
andata a vuoto (che lasciava la catena vecchia e non lo diceva a nessuno), il suono
cambiato dall'app ufficiale, una manopola girata sull'ampli. **Bastava una volta sola e da
lì in poi ogni cambio falliva, sempre**, perché lo schermo non si aggiornava mai più.

Adesso il nome vecchio si **rilegge dall'ampli anche prima di mandare il comando**
(`aggiornaCatenaDallAmpli`), e se quella lettura non riesce non si manda niente: meglio
non fare che fare alla cieca. È la stessa regola che l'editor già seguiva
all'apertura — la verità è sull'ampli — applicata anche qui.

**Il cambio modello è verificato nell'app sull'hardware il 13 agosto 2026**: tre cambi di
fila (`MaestroBassmaster → JH.SupaFuzz → JH.Octavia → DistortionTS9`), ognuno confermato
rileggendo la catena, con una sola lettura per cambio. Fra i nomi che hanno funzionato ce
ne sono di quelli che compaiono solo nel backup ufficiale.

### Quando l'ampli «smette di rispondere»

Provata la correzione, il 13 agosto 2026: due cambi di modello riusciti, poi ogni lettura
`0x0201` è tornata *nessuna risposta completa, 0 chunk*, per sempre, fino a riconnettere.

`MessageAssembler.feed` aveva due modi di impiantarsi, tutti e due con lo stesso
sintomo — **da quel momento non arriva più niente** — ed è il tipo di guasto che sembra
un ampli muto:

- `this.buffer = []` stava **dopo** `onMessage(...)`: se un ascoltatore sollevava
  un'eccezione, il buffer restava lì con dentro un messaggio già consegnato e ogni byte
  successivo ci si accodava.
- un frammento BLE perso lasciava un messaggio mozzo che si fondeva col successivo.

Adesso il buffer si svuota **prima** di consegnare, e un `f0` ricomincia sempre da capo:
`f0` e `f7` non possono comparire dentro un messaggio, perché i byte dati sono
impacchettati a 7 bit e stanno sotto `0x80`, `bits8` ne usa sette e il checksum è uno XOR
di quelli. Due test lo verificano — un ascoltatore che esplode, e un troncone seguito da
un messaggio intero.

**Non era quella la causa di quella sera.** Il numero nuovo l'ha detto subito: alla prova
dopo, `0 chunk buoni, 0 messaggi arrivati in tutto` — e infatti **l'ampli si era bloccato
davvero, ed è servito staccare la corrente**. `_readPresetVia` adesso riporta sempre
quanti messaggi sono arrivati durante l'attesa (`rxTotali`): 0 vuol dire ampli muto o
connessione morta, più di 0 vuol dire che parla e siamo noi a scartare. Senza quel numero
i due casi si vedono uguali e portano in direzioni opposte — è costato una serata.

Il riassemblatore resta corretto e adesso è coperto sul serio: un preset intero, sedici
messaggi di fila, spezzato a frammenti da 1, 7, 20, 39 e 100 byte. Con un solo messaggio
corto — l'unica prova che c'era prima — un riassemblatore sbagliato passa lo stesso.

**Cosa abbia bloccato l'ampli non lo sappiamo**, ma si è ridotto quello che gli si butta
addosso. Il cambio di modello era arrivato a **due letture per cambio**: la catena si
rilegge ora solo se non ci si fida più di quella che si ha (`inModifica.attendibile`,
messo a falso da ogni lettura fallita), e l'attesa dopo `0x0106` è passata da 500 ms a un
secondo. Ricostruire un blocco DSP è il comando più pesante che gli mandiamo, e la
lettura che segue — sedici messaggi — è la risposta più impegnativa: farle a raffica è
stata l'unica cosa nuova di quella sessione.

L'altra metà del difetto era che **non si vedeva**: un pannello a tutto schermo copre il
log, quindi ogni messaggio di quel percorso finiva dietro al pannello e un comando
fallito era indistinguibile da un comando che non fa niente. Ogni pannello che parla con
l'ampli ha adesso la sua `.stato-pannello`, e `logLine`/`logProgress` ci scrivono
l'ultimo messaggio. Vale per tutti i pannelli, non solo per questo.

**Il cursore va strozzato.** Un trascinamento genera decine di eventi al secondo e ogni
comando è una scrittura BLE: mandarli tutti intasa la coda e il suono arriva in ritardo
sul gesto. Si manda al massimo ogni 60 ms tenendo solo l'ultimo valore per manopola, e
l'ultimo parte sempre — altrimenti si resterebbe fermi un pelo prima di dove si è
lasciato. Verificato: 41 eventi diventano un comando solo, col valore finale giusto.

Il blocco spento si vede spento e lo dice: **girare la manopola di un effetto spento non
produce nessun suono**, ed è una trappola già pagata una volta.

## Su iPhone e iPad non si connette, e non è un difetto

**Nessun browser su iOS/iPadOS ha Web Bluetooth.** Non è Safari a essere indietro: su iOS
ogni browser è obbligato a usare il motore di Apple, quindi anche Chrome e Firefox lì non
ce l'hanno. `navigator.bluetooth` non esiste e il pulsante «Connetti» resta spento.
Segnalato dall'utente il 13 agosto 2026 su iPad.

L'app adesso **lo dice per esteso** in cima alla vista preset invece di lasciare un
pulsante morto — un pulsante spento senza spiegazione sembra un'app rotta — e distingue
il caso Apple dagli altri browser senza Bluetooth. Il testo dice anche cosa funziona lo
stesso, che è quasi tutto: sfogliare, cercare, organizzare, importare, esportare.

`mela()` riconosce l'apparecchio **solo per scegliere le parole**: cosa fare lo decide la
presenza di `navigator.bluetooth`, che è il fatto vero. Attenzione al controllo: da
iPadOS 13 un iPad si dichiara `MacIntel`, quindi serve anche `maxTouchPoints > 1` per
distinguerlo da un Mac.

Il controllo sta **prima** di `store.open()`: non dipende dal database, e se il database
tardasse l'avviso si deve vedere lo stesso.

## Informazioni, licenze, responsabilità

Il pannello «about» (`pannelloAbout`, si apre da «Altro») e i file `LICENSE` e `NOTICE`
sono la parte legale, chiesta dall'utente il 13 agosto 2026. Quello che c'è dentro, e
perché, così non si riscrive a caso se un domani va rivisto:

- **Autore: Massimo Togni. Licenza MIT**, cioè libero utilizzo — è la forma standard di
  «fai quello che vuoi, non garantisco niente», e contiene già l'esclusione di garanzia e
  di responsabilità in maiuscolo che vale come clausola.
- **Nessuna responsabilità**, detta anche in italiano e in concreto: sovrascrivere uno
  slot non si torna indietro, e un ampli può piantarsi e volere lo stacco della corrente.
  Sono due cose successe davvero in questo progetto, non formule.
- **Nessun rapporto con Positive Grid Inc.**: non prodotto, approvato, sponsorizzato né
  supportato, e non ne usa codice. I marchi sono citati per dire con cosa funziona — uso
  descrittivo, che è quello che rende lecito nominarli.
- **Provato solo su Spark 2**, un solo esemplare, e il protocollo è ricostruito
  osservando, non documentazione ufficiale.
- **Niente esce di lì**: nessun dato raccolto o inviato, la libreria sta nel browser.

Le licenze di terzi sono verificate, non supposte: **Soundshed è MIT**
(nomi di effetti e manopole, in `spark-effetti.js`) e **paulhamsh/Spark è Apache 2.0**
(riferimento del protocollo). Quest'ultima conta più di quanto sembri, perché in
`reference/paulhamsh/` ci sono **copie dei suoi sorgenti**: Apache 2.0 vuole
l'attribuzione e una copia della licenza accanto a chi la ridistribuisce, e adesso c'è
(`reference/paulhamsh/LICENSE-Apache-2.0.txt`, più `NOTICE` in radice che dice cosa e
senza modifiche).

## Strade future chieste dall'utente (13 agosto 2026)

Tre direzioni, nessuna ancora cominciata. Quello che segue è **ricognizione, non
misura**: dove c'è scritto «da verificare» vuol dire che nessuno l'ha ancora provato,
e vale la regola di sempre — prima si misura, poi si scrive il codice.

### Pedaliera M-VAVE (M-Wave) Chocolate

**Il modello che interessa all'utente è la Chocolate Plus**, non la Chocolate liscia, e la
differenza conta: la Plus è **BLE MIDI *e* USB MIDI** (quattro tasti, sedici banchi,
funzione host USB). Quindi la strada non è una sola — su PC è una porta USB MIDI, dove
Web MIDI funziona di sicuro; da telefono è BLE MIDI, oppure USB in OTG. Se il BLE su
Android non enumera, l'OTG è un ripiego che il pedale liscio non offriva.

**Il pedale non si collega con Web Bluetooth ma con Web MIDI**, ed è la cosa che
costerebbe mezza giornata a scoprire da soli. È una pedaliera **BLE MIDI**, e Chrome
tiene il servizio GATT MIDI (`03b80e5a-…`) nella **blocklist di Web Bluetooth** apposta,
perché quel traffico passa da `navigator.requestMIDIAccess()`. Cercare il pedale con
`navigator.bluetooth.requestDevice` non lo troverà mai. **Da verificare** con una
paginetta che elenca gli ingressi MIDI, prima di scriverci sopra qualsiasi cosa.

**L'ampli resta collegato**: sono due stack diversi (GATT nostro, MIDI del sistema) e due
connessioni BLE distinte, che telefono e PC reggono senza problemi. Non c'è niente da
spartire fra i due.

Il pedale si accoppia **prima col sistema operativo** (impostazioni Bluetooth), poi
compare come porta MIDI. Web MIDI chiede il permesso una volta sola.

**Il punto che decide tutto: Web MIDI su Chrome per Android.** Se da telefono non
enumera un dispositivo BLE MIDI, la pedaliera funziona solo dal PC — e a un concerto il
PC non c'è. Va provato per primo, prima di qualsiasi altra cosa: dieci minuti di lavoro
che dicono se la strada esiste. Se non esiste, le vie di scampo sono l'USB in OTG (la
Plus ce l'ha) o un modo **HID/tastiera**, che sarebbero `keydown` senza nessuna API.
Le fonti secondarie danno Chrome per Android come supportato sia via USB sia via BLE,
ma è esattamente il genere di affermazione che si verifica in dieci minuti invece di
crederci.

### Comandare i banchi col pedale

Che cosa mandi ogni tasto **non si indovina, si impara**: una schermata «premi il tasto e
ti dico cosa arriva» (program change o control change, e su che canale), e la
corrispondenza si salva nelle preferenze. È la stessa regola dei nomi dei parametri.

Il vincolo vero non è il MIDI, è il tempo: **solo i preset già in uno degli otto slot si
attivano all'istante** (`0x0138`), gli altri vanno trasmessi e ci mettono circa un
secondo. Col piede, in mezzo a un pezzo, è la differenza fra usabile e no. Quindi la
mappatura naturale è quattro tasti = i quattro posti del banco corrente (A o B), col
cambio banco sul tasto che il pedale già dedica a quello; e nella UI di mappatura si
deve vedere quali sono istantanei e quali no, come già si vede nella vista live.

Da provare presto anche: **lo schermo che si spegne**. Se il telefono blocca la pagina,
BLE e timer si fermano. Serve la Wake Lock API, e la prova va fatta col pedale in mano.

### Looper dello Spark 2

**Nessuna fonte che abbiamo lo documenta**: il riferimento di paulhamsh è per lo Spark
40, che il looper non ce l'ha, e il nostro handoff non lo nomina. Però l'app ufficiale lo
comanda dalla stessa connessione BLE, quindi i comandi esistono.

Due strade, la prima costa niente:

1. **Guardare cosa dice l'ampli**: si comanda il looper dal pannello dell'ampli con la
   nostra app connessa e si registra tutto quello che arriva. È così che sono saltati
   fuori `0x031a` e il `0x0337` della manopola del riverbero. Se il looper manda
   notifiche, i codici si leggono lì e si prova a rimandarglieli.
2. Se l'ampli tace, **catturare l'app ufficiale**: opzioni sviluppatore di Android,
   «Bluetooth HCI snoop log», si fa un giro di loop, si tira giù il file e si legge con
   Wireshark. Dà i comandi esatti. Attenzione: mentre l'app ufficiale è connessa la
   nostra non può esserlo, quindi sono due sessioni separate.

**I comandi del looper sono già noti — non da misura nostra, ma da codice sorgente.**
Trovato il 13 agosto 2026 mentre si cercava come comandare il looper dal pannello:
**Ignitron** (`stangreg/Ignitron`) è un pedale ESP32 open source che comanda il looper
interno dello Spark 2, ed è **esattamente il progetto che l'utente vuole costruire**.
Da `SparkMessage.cpp` e `Config_Definitions.h`:

| comando | forma | cosa fa |
|---|---|---|
| `0x0175` | un byte di payload | **il comando del looper** (valori qui sotto) |
| `0x0176` | bpm, count, bars, tre flag, durata a 16 bit | cambia le impostazioni |
| `0x0275` | vuoto | stato della registrazione |
| `0x0276` | vuoto | configurazione |
| `0x0278` | vuoto | stato del looper |

Il byte di `0x0175`: `02` countin, `04` rec, `05` stop rec, `06` retry, `07` rec
complete, `08` play, `09` stop, `0a` delete, `0b` dub, `0c` stop dub, `0d` undo,
`0e` redo. Sotto `0x80` la codifica msgpack di un intero positivo è il byte stesso,
quindi non c'è ambiguità su come scriverlo.

**Restano candidati finché non li proviamo**: sono di terzi, e non sappiamo se `0x0175`
voglia il **byte `0x00` finale** che sullo Spark 2 servono `0x0115`, `0x0104` e `0x0106`
(ma non `0x0138`). Ignitron non lo mette. `tools/looper-probe.html` prova tutti e dodici
i comandi con e senza, e in più registra cosa manda l'ampli quando il looper si comanda
dai suoi tasti — che è la sessione d'ascolto, diventata verifica.

#### Prima sessione d'ascolto — 13 agosto 2026, verificata sull'ampli

`captures/2026-08-13-looper-auto-mode.json`, 120 messaggi in venti raffiche, ampli in
**Auto Mode**. **Solo ricezione: nessun comando inviato**, quindi tutto quello che segue
vale per la direzione ampli→noi. La direzione opposta resta da provare.

**I valori di Ignitron sono confermati sul nostro hardware.** `0x0375` porta un byte solo
e sono esattamente quelli: visti `02` countin, `04` rec, `07` rec complete, `08` play,
`09` stop, `0a` delete, `0b` dub, `0c` stop dub. Non sono comparsi `05`, `06`, `0d` e
`0e` — in Auto Mode non si ferma la registrazione a mano, e undo/redo non sono stati
toccati.

**`0x0375` con `00` non è nell'elenco di Ignitron.** Arriva sempre da solo, circa 1,2 s
dopo un `0a`, tre volte su tre. È il looper che dichiara di essere **vuoto**.

**`0x0377` è la posizione nel loop**, e non lo dice nessuna fonte: un float `0xca` che
parte da 0.0 e sale **linearmente di 0,0250 ogni ~190 ms**, cioè cinque volte al secondo.
Sedici valori di fila senza una deviazione. Su un pedale con un display è la barra di
avanzamento del loop, gratis.

**`0x0376` sono le impostazioni, e si leggono campo per campo.** `cc 85 04 04 c2 c3 c2 3c`:
`cc 85` bpm 133 (il prefisso `0xcc` che Ignitron mette sopra i 128 — confermato),
`04` count «straight», `04` quattro battute, `c2` freeIndicator falso, `c3` click acceso,
`c2` il terzo flag falso, `3c` sessanta (i 60 s di durata massima). **Da qui si legge in
quale modo è l'ampli**: `freeIndicator` falso e `click` acceso vuol dire Auto Mode, che è
esattamente il modo in cui l'utente si è trovato quando REC/DUB non fermava la
registrazione. Il sintomo e i byte dicono la stessa cosa.

**`0x0363` è il bpm da solo**, float `0xca`: `43 05 00 00` = 133.0, poi 153.0.

**Il TAP fa tre cose insieme**, quattro volte per quattro pressioni: `0x0363` il bpm,
`0x0376` le impostazioni aggiornate, e `0x0337` — che già conoscevamo — sul parametro 4
di `DelayRe201`. Cioè **il tap tempo guida anche il delay**, non solo il looper.

Il ciclo completo in Auto Mode, misurato: premi REC/DUB → `02` `02`; dopo ~1,9 s
**da solo** `04`; al limite delle battute **da solo** `07` + `08` e parte il flusso di
`0x0377`; premi PLAY/STOP → `09`. La sovraincisione è `0b` `08` … `0c` `09`.

**Trappola del raggruppamento**: durante la riproduzione `0x0377` arriva ogni 190 ms, che
è meno degli 800 ms di pausa, quindi **la raffica non si chiude mai** e la pressione
umana finisce dentro lo stesso gruppo dell'evento automatico. Le raffiche 6, 11, 12 e 17
contengono tutte e due le cose. Se servisse separarle, `0x0377` va escluso dal conteggio
della pausa.

#### L'invio funziona — 13 agosto 2026, verificato sull'ampli

`captures/2026-08-13-looper-invio.json`. Tre comandi mandati, tre ack `0x0475`, tre
effetti reali: `0x0175` con `04` fa partire la registrazione, con `05` la chiude e manda
in riproduzione (`07` `08`, poi 155 messaggi di posizione, poi `09`).

**`0x0175` non vuole il byte `0x00` finale.** Il payload mandato è stato un byte solo e
ha funzionato: sta con `0x0138`, non con `0x0115`/`0x0104`/`0x0106`. La spunta della
sonda non è servita.

**Il click non parte, e `0x02` non è la soluzione — provato e smentito.** Con `04` la
registrazione parte ma **il click non suona**, e senza click non ci si suona sopra.
L'ipotesi era di mandare `0x02` (COUNTIN), visto che **il tasto REC/DUB del pannello
manda `02`** e `04` arriva da solo ~1,9 s dopo, a conteggio finito.

**Misurato il 13 agosto 2026, terza cattura: `0x0175` con `02` riceve l'ack `0x0475` e
non fa assolutamente niente.** Nessun `0x0375` di ritorno, nessun evento, per diciassette
secondi — finché l'utente non ha premuto il tasto fisico, che invece ha prodotto la
sequenza intera. **Ack senza esecuzione**: è la stessa firma di `0x0115`, `0x0104` e
`0x0106` prima che si scoprisse il byte `0x00` finale, e quella prova non è stata fatta
(il payload mandato era il solo `02`).

**Provate e fallite, tutte** (`captures/2026-08-13-looper-click-tentativi.json`):
`02` col byte `0x00` finale; `0x0176` scritto da noi e poi `04`; `0x0176` e poi `02`.
Nel secondo caso la registrazione parte regolare — quattro battute, chiusura e
riproduzione da sé — ma senza click. Nel terzo, ack e nulla.

**Anche la coppia `02`+`04` è fallita** (`captures/2026-08-13-looper-coppia-02-04.json`),
in tutte e due le distanze: attaccati come Ignitron (56 ms) e con 1,8 s in mezzo come il
pannello. Registra regolare tutte e due le volte, nessun click. E il dato che conta:
**in nessuna prova `02` ha mai prodotto un `0x0375` di ritorno** — solo `04` lo produce.
`02` è confermato e buttato via, punto, in ogni contesto provato.

**Anche `01`, `03`, `0f` e `10` non fanno niente** — i buchi dell'enum di Ignitron e i due
valori subito oltre la sua fine. Provati il 13 agosto 2026, nessun effetto.

#### Conclusione sul click: non è raggiungibile, e la caccia è chiusa

**Tutto quello che è stato provato e ha fallito**, così non si ripercorre:
`02` da solo; `02` col byte `0x00` finale; `0x0176` scritto da noi e poi `04`; `0x0176`
e poi `02`; `02`+`04` attaccati (56 ms); `02`+`04` a 1,8 s di distanza; i valori fuori
elenco `01`, `03`, `0f`, `10`. Sette forme, nessun click.

**Il fatto che regge tutto: `02` non è un comando.** In nessuna delle prove ha mai
prodotto un `0x0375` di ritorno, mentre `04` lo produce sempre entro 40 ms. Riceve l'ack
e viene buttato via. Quindi il conteggio non si comanda: è una fase interna che l'ampli
attraversa quando **il suo tasto** viene premuto, e `02` è il modo in cui lo *racconta*,
non il modo in cui lo si chiede.

**Non è una perdita grave, ed è importante non ricordarselo peggio di com'è.** Dal pedale
funziona tutto il resto: registrare, chiudere, suonare, sovraincidere, annullare,
cancellare, e sapere a che punto sta il loop (`0x0377`). Manca la **battuta di conteggio
col click**, che il pedale può farsi da sé — il bpm glielo dicono `0x0363` e `0x0376`, e
un pedale con un led o un buzzer conta da solo. Il suono del click dell'ampli no, quello
resta suo.

**L'app ufficiale avvia il looper col conteggio** — verificato dall'utente il 13 agosto
2026. Quindi **un comando esiste**, e non è nessuno di quelli che abbiamo provato: né
`0x0175` con uno qualsiasi dei sedici valori toccati, né `0x0176`. È l'unica domanda che
valeva la pena fare prima di aprire un'altra sonda, e la risposta riapre il capitolo
invece di chiuderlo.

#### Lo snoop log ha risposto — 14 agosto 2026

`captures/2026-08-14-app-ufficiale-looper.txt`, ricavato col rapporto di bug del telefono
e letto da `tools/leggi-btsnoop.ps1`. **Il comando del conteggio è `0x0175` con `02`, cioè
esattamente quello che mandiamo noi.**

```
11,749s  APP    0x0175   f0 01 18 02 01 75 00 02 f7      <- l'app manda 02
11,789s  ampli  0x0475   f0 01 18 00 04 75 f7            <- ack
12,726s  ampli  0x0375   f0 01 40 02 03 75 00 02 f7      <- conteggio partito, col click
14,684s  ampli  0x0375   f0 01 41 04 03 75 00 04 f7      <- registrazione, da sola
```

Il nostro frame era `f0 01 01 02 01 75 00 02 f7`: **identico a meno del sequence number**.
Quindi non è il comando a essere sbagliato — **è il contesto**, e il log dice quale.

**Tre differenze, in ordine di sospetto:**

1. **L'app manda la license key `0x0170`** appena connessa, e l'ampli risponde `0x0470`
   con `00 00`. Noi non l'abbiamo **mai** mandata. In `Ipotesi escluse` sta scritto
   «`0x0138` funziona senza averla mai inviata», ed è vero — ma vale per `0x0138`, non
   per tutto. **Il conteggio potrebbe essere l'unico comando dietro l'autenticazione.**
   Attenzione: il payload della chiave **cambia da sessione a sessione** (le due sessioni
   nel log hanno byte diversi), quindi rigiocarlo tale e quale forse non basta.
2. **Subito prima del comando l'app interroga il looper**: `0x0278`, poi `0x0275`, poi
   `0x0276`, tutti e tre entro 200 ms e 2,3 s prima del `02`. Noi quelle interrogazioni
   le abbiamo fatte, ma **dopo** il comando, mai prima.
3. Tutta la sequenza di avvio: `0x022f`, `0x0223`, `0x0211`, `0x022b`, tre letture di
   preset, `0x0210`, `0x0296`, `0x0271` due volte, `0x0201` sullo stato live, `0x0265`.

**Il contesto è escluso** (`captures/2026-08-14-looper-rigioco-avvio.json`). Rigiocata
tutta la sequenza di avvio dell'app — ventiquattro messaggi, nell'ordine e con le
distanze vere — due volte, con e senza license key. **Ogni messaggio ha ricevuto la
risposta giusta**, quindi la riproduzione è fedele; e tutte e due le volte `0x0175` con
`02` ha ricevuto l'ack e non ha fatto niente. Non è lo stato della sessione.

**La license key rigiocata viene ricevuta e rifiutata**: `0x0470` con payload `fe`, cioè
**−2**, mentre all'app risponde `00 00`. Non è replicabile — è legata alla sessione. Ma
almeno adesso arriva: prima, mandata in una write sola, non riceveva nemmeno l'ack.

**Anche l'intestazione di blocco è esclusa, e la prova è pulita.** L'app avvolge ogni
scrittura in 16 byte (`01 fe 00 00 53 fe <len> 00 …`, che `wrapBlock` produce identici) e
spezza in ATT da 20. Mandati così tutti e due i comandi: **`04` funziona** — ack e
`0x0375 04` di ritorno — e **`02` no**. L'involucro quindi non rompe niente e non
discrimina: `02` è inerte in ogni forma provata.

#### Archiviato il 14 agosto 2026, per decisione dell'utente

**Stato: il looper si comanda, manca solo il conteggio col click.** Funzionano `04` rec,
`05` stop rec, `08` play, `09` stop, `0b` dub, `0c` stop dub, `0a` delete, e si legge la
posizione nel loop (`0x0377`), il bpm (`0x0363`) e le impostazioni (`0x0376`).

**Sul conteggio siamo arrivati al fondo di quello che si può fare senza la chiave.**
Escluso per misura, tutto: il valore del byte (sedici provati), il byte `0x00` finale, le
impostazioni scritte prima, la coppia `02`+`04` in due distanze, le interrogazioni prima,
l'intera sequenza di avvio dell'app rigiocata con e senza chiave, e l'intestazione di
blocco. Ogni messaggio rigiocato riceve dall'ampli la **stessa identica risposta** che
riceve l'app: la riproduzione è fedele, il comando è byte per byte lo stesso, e non
funziona.

**Resta una sola differenza, e non è replicabile: la license key accettata.** L'app manda
`0x0170` e riceve `0x0470` con `00 00`; noi rigiocando la sua riceviamo `fe`, cioè −2.
La chiave è legata alla sessione. **È quindi l'unica spiegazione rimasta in piedi**, e
sarebbe strana — nessun altro comando è protetto — ma è l'unica cosa che non abbiamo
potuto rendere uguale. Per verificarla servirebbe capire come la chiave è derivata, che è
un lavoro di un altro ordine di grandezza.

**Se si riprende, si riprende da lì**, non dalle sonde: tutto il resto è già escluso e
sta scritto qui sopra. Gli attrezzi restano pronti — `tools/looper-probe.html` con
ventinove pulsanti e `tools/leggi-btsnoop.ps1` per leggere altri snoop log.

**Le interrogazioni prima non bastano** (`captures/2026-08-14-looper-contesto.json`):
mandati `0x0278`, `0x0275`, `0x0276` — tutti e tre con risposta regolare — e 2,3 s dopo
`0x0175` con `02`: ack e nessun effetto. L'ipotesi 2 è caduta.

**La prova sulla license key invece non è valida, ed è un difetto nostro.** L'abbiamo
mandata in **una write sola da 109 byte**, e l'ampli **non ha risposto nemmeno l'ack
`0x0470`** — mentre all'app risponde entro 150 ms. Non è un rifiuto della chiave: è il
messaggio che non è mai arrivato.

**Da qui la scoperta che vale oltre il looper: le write BLE lunghe vanno spezzate.**
L'app ufficiale manda ogni messaggio in **write ATT da 20 byte**, e l'ampli riassembla da
sé cercando `f0` … `f7` — esattamente come facciamo noi in ricezione. Non è la stessa cosa
dei chunk di `0x0101`: lì si spezza il *messaggio*, qui il messaggio resta uno e si spezza
solo la scrittura. `transport.sendSpezzato(comando, 20)` fa questo, ed è il modo di
mandare qualsiasi cosa più lunga dei ~44 byte verificati senza che sparisca in silenzio.
Spiega anche perché a suo tempo i messaggi lunghi sembravano ignorati.

**Da qui in avanti indovinare non serve più.** Sedici valori provati su `0x0175` dicono
che il comando sta altrove: un altro sub-comando, o `0x0175` con un payload che non è un
byte solo. Lo spazio è troppo grande per cercarlo a tentoni, e martellare l'ampli con
comandi inventati è proprio la cosa che una volta l'ha già piantato (serviva staccare la
corrente). **La strada è lo snoop log HCI**, la numero 2 mai usata: opzioni sviluppatore
di Android, «Bluetooth HCI snoop log», un giro di looper con l'app ufficiale, si tira giù
il file e si legge con Wireshark. Dà il comando esatto, byte per byte, senza ipotesi.

Attenzione a una cosa quando si farà: **l'app ufficiale e la nostra non possono essere
connesse insieme** (a meno che non valga anche per noi quello che l'AIRSTEP fa — non
verificato), quindi sono due sessioni separate. E lo snoop log registra *quello che il
telefono manda*, che è esattamente ciò che ci manca: le notifiche in arrivo le sappiamo
già leggere da soli.

**Il prefisso `0xcc` sul bpm è confermato dai due lati**: a 133 il campo è `cc 85`, a 120
è `78` nudo. Sotto 128 il fixint basta, sopra serve il prefisso — esattamente la regola
che Ignitron applica in scrittura.

*(Ipotesi caduta, tenuta per non ripercorrerla: «`02` e `04` vanno mandati tutti e due».)*
`sparkLooperRec()` di Ignitron manda **due** comandi, non uno: `SPK_LOOPER_CMD_COUNTIN`
*se il click è acceso*, e subito dopo `SPK_LOOPER_CMD_REC`. Da soli non funziona né
l'uno né l'altro, ed è esattamente la coppia che non avevamo provato — cercando ogni
comando singolarmente non poteva saltare fuori. Nella sonda ci sono due pulsanti: uno
li manda attaccati come Ignitron, l'altro con 1,8 s in mezzo, che a 133 bpm è la battuta
che il pannello lascia fra `02` e `04`.

**Due scoperte laterali dalla stessa cattura**, che valgono a prescindere dal click:

- **`0x0275` risponde con `0x0375` e un byte**, stesso seq della richiesta. Quindi
  `0x0375` fa due mestieri: notifica spontanea di stato *e* risposta alla domanda. Chi
  ascolta deve distinguerli dal seq, altrimenti scambia una risposta per un evento.
- **`0x0278` non è una configurazione ma uno stato**: risponde `cc 85 04 04 00 c2 c2`,
  cioè bpm, count e battute come `0x0376`, ma poi tre campi diversi — dove la
  configurazione ha `c2 c3 c2` più la durata, lo stato ha `00 c2 c2`. Il `00` è un
  numero dove l'altro ha un booleano, quindi **i campi non sono gli stessi** e leggere
  `0x0378` con lo schema di `0x0376` darebbe «click spento» quando è acceso. Plausibile
  che siano battuta corrente, sta registrando, sta suonando — **da confermare**.

**Il click non è un'impostazione spenta**, escluso per misura: `0x0276` interrogato in
quella stessa sessione risponde `cc 85 04 04 c2 c3 c2 cd ea 60`, cioè `click` = `c3` =
vero, e dal pannello il click si sente. La differenza sta nel comando, non nella
configurazione. (Nota: l'ultimo campo qui è `cd ea 60`, uint16 60000 — i 60 s di durata
massima di Ignitron; nella prima cattura era `3c`, quindi quel campo cambia forma.)

**Regola generale, non un dettaglio del looper:** i nomi dell'enum vengono da Ignitron e
descrivono lo *stato in cui l'ampli è entrato*, non un tasto da premere. Che il pannello
notifichi `02` non vuol dire che `02` si possa mandare. **Una cattura d'ascolto dice cosa
l'ampli racconta, non cosa accetta**: le due cose vanno misurate separatamente, ed è
costato un giro scoprirlo.

**I messaggi dell'esempio non devono finire in una cattura.** Alla prima esportazione ci
sono finite tre raffiche del pulsante «Mostrami un esempio», riconoscibili solo perché
avevano `raw` vuoto. Un dato inventato dentro una prova è peggio di nessun dato: fra sei
mesi nessuno si ricorda di quel click. Adesso i finti sono marcati `demo`, non contano
negli RX totali, si vedono tratteggiati con scritto FINTA, e **l'esportazione li scarta**.

**Lo Spark 2 ha i tasti del looper sul pannello**, quindi l'ascolto non ha bisogno
dell'app ufficiale né dello snoop log: REC/DUB, PLAY/STOP, UNDO/REDO (tenuto = cancella
tutto), TAP per il tempo. Cade il problema delle due sessioni separate.

**Il looper ha due modi, e in uno REC/DUB non ferma la registrazione.** Segnalato
dall'utente alla prima prova, il 13 agosto 2026, e non è un difetto:

- **Auto Mode** (click acceso): la lunghezza è fissata in battute, la registrazione parte
  dopo una battuta di conteggio e **si chiude da sola** al numero di battute impostato.
  Ripremere REC/DUB non la ferma — è il comportamento che l'utente ha visto.
- **Signal Detection Mode** (click spento): lunghezza libera, parte da sé quando sente la
  chitarra, e **lì sì che REC/DUB chiude la registrazione**.

Si passa dall'uno all'altro **tenendo premuto PLAY/STOP**. Vanno catturati tutti e due:
sono quasi certamente i flag `click` e `freeIndicator` di `LooperSetting`, quelli che
`0x0176` scrive, quindi le due sessioni dicono anche come sono fatte le impostazioni.

**Lezione sull'attrezzo, non sul looper.** La sonda chiedeva di dichiarare *prima* quale
tasto si stava per premere. Sbagliato per lo stesso motivo di sempre: **si chiedeva di
indovinare cosa avrebbe fatto l'ampli**, e appena l'ampli ha fatto altro il log è rimasto
a mentire — un marcatore «REC/DUB» sopra i messaggi di uno stop. Adesso i messaggi che
arrivano attaccati (meno di 800 ms l'uno dall'altro) si raggruppano da soli in una
raffica, e l'etichetta si sceglie **dopo**, da una tendina, con la chitarra appoggiata.
Vale per ogni sonda futura: si registra prima e si interpreta dopo, mai il contrario.
`?demo` in coda all'url riempie la pagina di messaggi finti, per provarla senza ampli.

Ignitron vale anche oltre il looper: fa da **client verso l'ampli e da server verso l'app
ufficiale**, ha i banchi di preset dentro, e gira su ESP32. Prima di scrivere firmware da
zero conviene leggerlo — e valutare se il lavoro non sia configurarlo invece che
riscriverlo. Attenzione però: è il pedale di qualcun altro, con le sue scelte; le nostre
differenze verificate (chunk da 25 byte, byte `0x00` finale, stesso seq, `0x0127` che non
salva) vanno confrontate con le sue, non date per allineate.

**Che si possa fare è dimostrato da terzi**, ed è la scoperta che cambia il preventivo
(13 agosto 2026, ricognizione sul web, non misura nostra):

- **Lo Spark 2 non ha nessun ingresso MIDI.** Niente DIN — quello ce l'hanno Spark EDGE
  e Spark LIVE, non lui — e l'USB-C è solo scheda audio. Quindi **una pedaliera MIDI non
  potrà mai parlare all'ampli direttamente**: qualunque strada passa per un ponte che
  traduce MIDI in BLE. Non è un limite della nostra app, è del prodotto.
- **L'AIRSTEP Spk Edition (XSONIC) comanda il looper dello Spark 2** ed è un dispositivo
  di terzi. Vuol dire che i comandi del looper stanno nella stessa conversazione BLE e
  sono riproducibili da un client qualsiasi: non c'è un canale privilegiato dell'app
  ufficiale.
- **E funziona con l'app ufficiale connessa nello stesso momento.** Se è vero anche per
  noi, cade l'idea che «l'ampli accetta un padrone solo» — che viene dal riferimento
  Spark 40 — e il ponte ESP32 non avrebbe più bisogno di fare da server per non far
  perdere il telefono. **Da verificare sul nostro ampli**, è una prova da cinque minuti:
  app ufficiale connessa, e si prova a connettersi anche con la nostra.
- Positive Grid vende la sua **Spark Control X** a sei tasti, dove il looper si apre con
  una pressione lunga sul tasto 1. Utile come mappatura di riferimento: dice quante
  funzioni del looper vanno comandate davvero.

**Il vincolo che nessuno di questi risolve è il tempo.** Cambiare preset con 100 ms di
ritardo non lo nota nessuno; far partire e chiudere un loop sì, perché il punto di
giunzione cade dove si è premuto. La catena piede → BLE MIDI → sistema → browser → GATT
→ ampli ha due tratte radio, ognuna col suo intervallo di connessione. **Va misurata
prima di disegnare qualsiasi interfaccia**, ed è la misura che decide fra ponte via
browser e pedale ESP32 — non le righe di codice.

### Pedale ESP32 autonomo

Chiesto il 13 agosto 2026: un pedale costruito con un ESP32, con i preset dentro, che
comanda lo Spark da solo. **È fattibile, e la parte difficile è già in `reference/`** —
che finora era servito solo come documentazione del protocollo. Guardandolo per questo,
fa tre cose che valgono tutte:

- **client BLE verso l'ampli** (`connect_spark`): manda `change_hardware_preset`,
  `change_effect`, `change_effect_parameter`, `create_preset`. È il pedale autonomo.
- **server BLE che si annuncia col servizio dell'ampli** (`pAdvertising->start()`, con
  `app_msg_out` accanto a `spark_msg_out`): l'app ufficiale si collega *al pedale*, che
  fa da ponte. Serve perché l'ampli accetta un padrone solo — così non si perde il
  telefono per avere il pedale.
- **client BLE verso una pedaliera**, con `PEDAL_SERVICE` =
  `03b80e5a-ede8-4b33-a751-6ce34ec4c700` (`SparkComms.h:49`), che è **il servizio BLE
  MIDI**: lo stesso che Chrome blocca in Web Bluetooth. Su ESP32 quel limite non esiste,
  quindi la Chocolate si attacca lì senza passare da Web MIDI.

Quello che un porting dovrebbe portarsi dietro sono le differenze dello Spark 2 che
abbiamo trovato noi, tutte già scritte qui sopra e coperte da test: il byte `0x00` finale
su `0x0115`, `0x0104` e `0x0106`; **chunk da 25 byte e non da 128** (con 128 lo Spark 2
si disconnette, e il riferimento usa 128); `0x0127` che non salva, quindi slot indirizzato
diretto più cambio preset via e ritorno; stesso seq per tutti i chunk di un preset; otto
slot e non quattro. Le catture in `test/fixtures/` e `captures/` fanno da banco di prova
per un encoder in C++ come lo fanno per quello in JS.

Restano uguali le due cose fisiche: `0x0138` è istantaneo solo per gli otto slot, un
preset intero è circa un secondo — un pedale autonomo ha lo stesso vincolo del telefono,
e conviene che si legga gli otto slot all'accensione (`0x0201`) per sapere cosa può fare
di scatto. Lo spazio non è un problema: un preset è qualche centinaio di byte.

Primo passo se si prende questa strada, prima di saldare qualsiasi cosa: caricare lo
sketch del riferimento con quelle differenze e vedere se si collega e cambia preset.

#### La forma che l'utente vuole (13 agosto 2026)

Dettata così: il pedale **si prende i preset dall'app** e poi è autonomo con lo Spark;
dentro ha dei **blocchi selezionabili col piede**, ogni blocco coi suoi preset che spara
diretti sull'ampli; **nessuna regolazione, solo preset**; e poi il looper. È la vista
live del web, staccata dal telefono — non un secondo editor.

**Quel «solo preset» semplifica enormemente il firmware**, e conviene sfruttarlo fino in
fondo invece di portare l'encoder in C++:

- l'app **preserializza**. `serializePreset` produce già il payload esatto, e
  `buildChunk` il frame `f0 01 <seq> <checksum> …  f7`. Il pedale riceve **frame già
  pronti** e li scrive tali e quali.
- **il seq si può correggere sul posto**: sta all'indice 2 e il checksum è un XOR dei
  soli byte impacchettati (`spark-protocol.js:220-222`), quindi **non lo copre**. Il
  pedale patcha un byte e non ricalcola niente.
- senza regolazione non servono `0x0104`, `0x0115`, `0x0106`, né il parser dei preset.
  Restano `0x0101` (frame precotti), `0x0138` (tre byte) e i comandi del looper.

Il porting quindi non è «l'encoder in C++»: è **una coda BLE e un patch di un byte**.
L'encoder resta uno solo, in JS, quello già coperto da 87 test.

**Come passano i preset dall'app al pedale**: il pedale fa da server GATT con un servizio
nostro (non `0xFFC0`), e la web app ci si collega con una seconda `requestDevice` — Web
Bluetooth regge più dispositivi insieme, quindi ampli e pedale convivono. Trentadue
preset sono una ventina di kB, cioè qualche secondo. La SD o l'USB restano il ripiego che
non può fallire.

**Il trucco che rende i blocchi istantanei**: scegliendo un blocco il pedale ne
**riscrive i preset negli slot dell'ampli** in sottofondo (qualche secondo, fra un pezzo
e l'altro), e da lì i quattro tasti fanno `0x0138`, che è immediato. È l'unico modo di
avere blocchi illimitati *e* cambio istantaneo. **Va però chiesto all'utente**: nella
vista live i banchi inventati non scrivono mai sull'ampli, ed è una sua scelta esplicita
— su un pedale dedicato il compromesso è diverso, ma non è una decisione da prendere al
posto suo.

**M-VAVE o interruttori sull'ESP32 non sono la stessa scelta a due livelli diversi.** La
Chocolate è un *ingresso*; l'ESP32 è il controller intero. Se si costruisce l'ESP32, gli
interruttori sui GPIO sono un `digitalRead` con antirimbalzo — niente accoppiamento,
niente parsing MIDI, niente seconda radio, **niente seconda batteria da ricordarsi di
caricare**. La Chocolate ha senso solo se si vuole la scatola di metallo già fatta, e
allora diventa l'ingresso BLE MIDI dell'ESP32 (`PEDAL_SERVICE`, già nel riferimento).

E c'è una cosa che solo l'ESP32 può fare: **l'ampli gli parla**. Le notifiche arrivano
anche a lui, quindi un display può dire quale preset è attivo e come sta il looper. Col
ponte via telefono quel ritorno passa comunque dallo schermo che non guardi mentre suoni.

#### Ripartire da qui — 14 agosto 2026

**Il prossimo passo è deciso: lo snoop log HCI**, per trovare il comando del conteggio.
L'utente ci aveva già provato e non trovava il file: **non è un errore suo, su Android
moderno quel file sta in `/data/misc/bluetooth/logs/` e nessun gestore file lo apre senza
root.** Si tira fuori col **rapporto di bug**, che Android genera da sé e che se lo porta
dentro (`FS/data/misc/bluetooth/logs/btsnoop_hci.log`).

Due punti dove si sbaglia facile, da ricordargli: il log va messo su **«Attivato»** e non
«Filtrato», che butta via proprio i dati; e dopo averlo attivato **il Bluetooth va spento
e riacceso**, altrimenti non registra niente ed è il motivo per cui di solito il file
risulta vuoto. La sessione da catturare deve essere **corta**: connetti, un giro di
looper col conteggio, chiudi.

Il file lo leggo io con uno script — il formato btsnoop è banale e i nostri messaggi si
riconoscono a vista (`f0 01 … f7` verso la caratteristica `0xFFC1`). **Niente Wireshark**,
che era il consiglio scritto qui sopra quando la strada era solo teorica.

**Ancora da fare, deciso: niente altro.** L'ordine
economico è chiaro: la **sessione d'ascolto sul looper** non costa niente e serve a tutte
e due le strade; poi una **devkit ESP32 da otto euro** senza saldare niente, per vedere
se si collega e cambia preset. Se quello funziona il progetto esiste, e non si è comprato
un pedale per scoprirlo.

`loadPreset` e `storePreset` sono **entrambi verificati sull'hardware**: il primo l'11
agosto 2026 e riconfermato il 12, il secondo il 12 agosto nella forma nuova (scrittura
diretta nello slot più cambio preset via e ritorno).

`tools/write-probe.html` resta utile se una scrittura smette di funzionare: prova varianti
di `0x0101` una alla volta e verifica ognuna rileggendo lo stato live, senza bisogno di
ascoltare.

## Stato

Il protocollo è **completo e verificato sull'ampli**: lettura dei preset, `0x0138` cambio
preset, `0x0115` effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset
intero — sia nel buffer software da far suonare subito, sia direttamente in uno slot per
salvarlo. `0x0115` e `0x0104` richiedono il byte `0x00` finale descritto sotto; la
scrittura in uno slot richiede il cambio preset via e ritorno descritto più avanti.

`0x0127` è invece escluso: riceve l'ack e non salva, in tutte e quattro le forme provate.

Nessuna autenticazione è richiesta: la license key `0x0170` non è mai stata inviata.

Resta aperto che il numero di preset inviato con `0x0138` non corrisponde a quello che
si attiva.

**Trappola da ricordare quando un comando sembra non funzionare:** cambiare un parametro
di un effetto spento non produce nessun suono. Verifica prima che l'effetto sia attivo.

### Ipotesi escluse da misure dirette

- **License key** — `0x0138` funziona senza averla mai inviata.
- **Ordine dei bit nella codifica 7/8** — la maschera parte da `0x80`, va a `1` e raddoppia
  (`SparkIO.ino:1069-1083`), LSB-first come la nostra; e il nostro packer riproduce una
  cattura reale byte per byte.
- **Lunghezza del messaggio, MTU, frammentazione, block header** — sweep su `0x0201` con
  padding legittimo crescente (10 &rarr; 44 byte): risposta a *tutte* le lunghezze, sia con
  write singola sia con split a 20 byte, senza block header. L'ampli manda notifiche da
  39 byte, quindi l'MTU negoziato è ampio. Vedi `captures/`.

- **Codifica 7/8 bit in scrittura** — `0x0115` con `bits8 = 0x02` e `0x40` viene accettato
  e confermato con ack. La codifica funziona in entrambe le direzioni.

### Il byte 0x00 finale — differenza dello Spark 2

**I comandi sugli effetti richiedono un byte `0x00` in coda al payload logico.** Senza,
l'ampli risponde con un ack regolare (`0x04nn`) ma **non applica il comando**: il silenzio
non è rifiuto, è esecuzione mancata. Con il byte, il comando ha effetto.

Non è documentato da nessuna fonte: né nel protocollo di Hamshere né in paulhamsh/Spark,
entrambi scritti per lo Spark 40.

L'ampli lo mette sempre nei propri messaggi. Confronto su `bias.reverb`:

```
ampli 0x0315:  0b ab "bias.reverb" c3 00
nostro 0x0115: 0b ab "bias.reverb" c2 00     ← identico a meno di on/off
ampli 0x0337:  0b ab "bias.reverb" 00 ca 3f 5c 1f dc 00
```

`0x0138` (cambio preset) funziona **senza** il byte finale: non è quindi un requisito
universale del protocollo. Non è ancora chiaro cosa rappresenti — probabilmente un
argomento aggiuntivo che lo Spark 2 si aspetta sui comandi riferiti a un effetto.

### Ack

`0x04nn` con lo stesso sub-comando e sequence del comando ricevuto. Attenzione: **l'ack
conferma la ricezione, non l'esecuzione.** Vedi sopra.

### Formato preset (0x0301) — decodificato e verificato

Arriva su più chunk (16 per un preset tipico). Ogni chunk, dopo lo spacchettamento 7/8,
inizia con un sub-header di 3 byte: `[chunk totali, indice, byte utili]`. Concatenando i
`byte utili` di tutti i chunk in ordine di indice si ottiene il payload:

```
banco (int), numero (int), UUID (long string 36), nome, versione, descrizione,
icona, BPM (float), array[7] di effetti, due float ignoti, checksum
```

Ogni effetto: `nome (string), attivo (bool), array[n] di parametri`.
Ogni parametro: `indice (int), 0x91 costante, valore (float 0..1)`.

Il `0x91` fra indice e valore è invariante e di significato ignoto.

**I due float in coda ci sono solo sui preset salvati** (sul preset 0 valgono 9990.0 e
0.5): lo stato live finisce direttamente col checksum. `parsePreset` legge quanti float
trova e li conserva in `preset.tail`, così la ri-serializzazione resta fedele in entrambi
i casi. In scrittura non si mandano (`serializePreset` con `{omitTail: true}`), perché
`create_preset` non li scrive e l'ampli non li usa per lo stato live.

`serializePreset` è l'inverso esatto di `parsePreset`: un test verifica che ri-serializzare
il preset 0 riproduca il payload **byte per byte**. È questa la garanzia che la struttura
sia interpretata bene anche dove non ne conosciamo la semantica — se qualcuno cambia il
parser sbagliando, il round-trip si rompe subito.

### Scrittura di un preset (0x0101)

Multi-chunk, con lo stesso sub-header `[totali, indice, byte utili]` che l'ampli usa in
lettura. I chunk vanno mandati uno per volta aspettando l'ack — `0x0401` sugli intermedi,
`0x0501` sull'ultimo — perché il firmware blocca gli invii successivi finché non ha
confermato il precedente (`ok_to_send`, SparkIO.ino:1251). Un ack che non arriva **non è
motivo di fermarsi**: anche il firmware si sblocca da solo dopo mezzo secondo
(SparkIO.ino:139-142), e interrompersi lascerebbe il preset scritto a metà.

**Dimensione dei chunk: 25 byte di payload, non 128.** `SparkChunkOut` usa 128, ma è
pensato per un ESP32 che negozia un MTU ampio: 128 byte di payload diventano un messaggio
da 154 byte in una sola write BLE, e a quel punto lo Spark 2 **si disconnette** invece di
rispondere. 25 è la dimensione che l'ampli sceglie quando è lui a mandare un preset, e
produce messaggi da 39 byte, identici alle sue notifiche. Il massimo verificato
funzionante in scrittura è 44 byte.

Il checksum finale è la somma modulo 256 del payload **esclusi i primi due byte** e sé
stesso. Verificato su due catture: sul preset 0 (`bank 0, numero 0`) le due regole
coincidono, ma sullo stato live (`bank 1`) no — e l'ampli dichiara `0x4c`, che è la somma
senza i primi due byte. Includendoli verrebbe `0x4d`. La regola di `create_preset` è
quindi corretta anche sullo Spark 2.

**In scrittura si passa sempre dal preset software `0x7f`, e servono due comandi.**
`0x0101` verso `[0x00, 0x7f]` riempie un buffer; l'ampli conferma tutti i chunk ma
continua a suonare lo slot selezionato finché non gli si dice di passare a quel buffer.
Verificato sull'hardware l'11 agosto 2026.

```
far suonare un preset   → 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  → 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

**Le due strade sono diverse, e questo è costato mezza giornata.** Far suonare un preset
passa dal buffer software `0x7f`; salvarlo in uno slot **non ci passa affatto**: si
indirizza lo slot direttamente nei primi due byte del payload, e poi si cambia preset e
si torna indietro. Entrambe verificate sull'ampli, la seconda il 12 agosto 2026.

Il giro via e ritorno non è decorazione: senza, lo slot continua a riportare il contenuto
vecchio. Sta scritto così anche nel riferimento (`Spark.ino:113-124`), dove
`create_preset` indirizza `[0x00, preset_num]` (`SparkIO.ino:1025-1026`) ed è seguito da
`delay(100)` e **due** `change_hardware_preset`. `storePreset` fa esattamente questo, con
300 ms fra un passo e l'altro.

**`0x0127` non funziona sullo Spark 2 ed è stato tolto dal codice.** Provate sull'ampli
tutte e quattro le forme — `[0x00, n]`, `[0x7f, n]`, `[0x00, n, 0x00]`, `[0x7f, n, 0x00]`
— ack regolare per ognuna e slot invariato. È lo stesso modo di fallire dei comandi sugli
effetti prima di scoprire il byte `0x00` finale, ma qui nessun byte finale lo salva.
L'annotazione dell'11 agosto che dava `storePreset` per verificato era sbagliata.

Come ci siamo arrivati, perché il metodo conta più della conclusione: prima si è isolato
che il **trasferimento** funzionava (l'ampli suonava il preset nuovo dal buffer) e che
mancava solo il salvataggio; poi si è provata una forma alla volta **verificando ognuna
con una rilettura dello slot**, perché l'ack non dice niente. Le sonde che l'hanno
trovato sono state tolte a risposta ottenuta.

`transport.loadPreset()` e `transport.storePreset()` fanno esattamente questo. Il secondo
comando **non è opzionale**: senza, il risultato è indistinguibile da un fallimento.

Scrivere `0x0101` direttamente su uno slot sembrava produrre ack regolari e nessun
effetto: **quella prova era incompleta**, mancava il cambio preset via e ritorno. È
invece la strada giusta, vedi sopra. Scrivere su `[0x01, 0x00]` resta senza effetto: è un
indirizzo valido in lettura, non in scrittura. In lettura `0x0201` con `[0x00, n]` legge
lo slot n e con `[0x01, 0x00]` il suono attivo (`Spark.slotTarget(n)` e
`Spark.LIVE_TARGET`).

`loadPreset` non sovrascrive nessuno slot salvato: è il modo sicuro di provare un preset,
ed è l'azione principale offerta dalla UI.

**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot:
è il modo in cui segnala che il suono attivo non corrisponde a un preset salvato, lo
stesso che fa quando si modifica un suono dall'app ufficiale. Non è un malfunzionamento.
Per tornare a uno slot basta un `0x0138`. Per questo `storePreset` seleziona lo slot dopo
averlo salvato: altrimenti si salva il preset ma l'ampli continua a suonare il buffer.

**Tutti i chunk di un preset vanno con lo stesso sequence number.** È così che l'ampli
manda i propri preset, ed è per seq che si raggruppano i chunk in arrivo: se anche il suo
riassemblatore funziona così, incrementare il seq a ogni chunk — come fa
`ChunkOut::process` per lo Spark 40 — gli fa vedere N messaggi scollegati e incompleti,
che conferma tutti senza assemblarne nessuno. `writePreset` accetta
`{incrementSeq: true}` per tornare al comportamento dello Spark 40.

Il contatore di sequenza per i messaggi app→ampli resta comunque fra `0x01` e `0x3e`
(SparkIO.ino:1116-1119).

### Preset hardware

**Lo Spark 2 ha 8 slot, numerati 0–7**, tutti leggibili con `0x0201`. Il range 0–3 della
documentazione vale per lo Spark 40. Il `6` che l'ampli riportava come preset corrente era
semplicemente lo slot 6, non un'anomalia.

Il pannello però ha **4 LED bicolore, non 8**: rosso per il banco A (slot 0–3), verde per
il banco B (slot 4–7). Lo slot 5 si accende come secondo LED verde. `Spark.slotLabel(n)`
fa la conversione e la UI mostra `A1`…`B4`, così i numeri dell'app coincidono con quello
che si vede sull'ampli.

Cade quindi il sospetto che il preset attivato non corrispondesse al numero inviato:
corrispondeva sempre, era la lettura del pannello a essere diversa.

### Aperto

- `0x022a` (leggi checksum preset) non risponde mai, con o senza fixarray `0x94`:
  probabilmente non esiste sullo Spark 2.
- `0x031a`, non documentato, emesso durante il movimento delle manopole: decodifica come
  `array[1] 0 <preset corrente> true`.

`writeWithoutResponse` è l'unica modalità supportata da 0xFFC1, quindi ogni scrittura
sembra riuscire lato browser anche quando l'ampli la scarta. **L'assenza di errori non
è una verifica.** L'unica prova valida è l'effetto udibile/visibile sull'ampli o una
risposta in RX.

Per la stessa ragione esiste `Spark.controllaPreset`: prima di mandare un preset controlla
che sia serializzabile — valori non numerici, campi di testo che testo non sono, array
oltre i 15 di un fixarray, indici fuori scala. Un payload malformato viene confermato
chunk per chunk e poi ignorato, e il sintomo è indistinguibile da una connessione rotta.
Meglio accorgersene dove si può ancora dire *cosa* non va.

## Protocollo — fatti verificati

GATT: service `0xFFC0`, write `0xFFC1` (writeWithoutResponse only), notify `0xFFC2`.
Le notifiche arrivano frammentate: riassemblare cercando `F0` … `F7`.

Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`

- checksum = XOR 8 bit dei soli byte dati impacchettati (bits8 inclusi), escluso header e `F7`
- codifica 7/8 bit: ogni 7 byte reali preceduti da un byte `bits8` con gli MSB, **LSB-first**
- valori parametro = float32 **big endian** con prefisso `0xCA`, range 0.0–1.0

Encoder e decoder in `tools/explorer.html` sono validati: riproducono il payload di una
cattura reale dell'ampli byte per byte, checksum compreso. Se una scrittura fallisce,
**non cercare il bug lì**.

Dettaglio completo di comandi, tipi dati, nomi effetti e catture: `docs/HANDOFF-2026-08-10.md`.

## Differenze rilevate rispetto a paulhamsh/Spark (BLE funzionante)

Confronto con `reference/paulhamsh/SparkESP32_SparkIO.ino`:

- `BlockOut::process()` (riga 1202) prepone **sempre** il block header di 16 byte, anche su
  BLE, con `out_block[6]` = lunghezza totale del blocco
- `sp_write()` fa **una sola** `writeValue(buf, len, false)` per blocco intero (fino a 173
  byte) — nessuno split manuale a 20 byte
- `change_hardware_preset(curr_preset, preset_num)` (riga 910): nonostante il nome, il primo
  parametro **non** è il preset corrente. Ogni chiamata reale passa `0` letterale
  (`Spark.ino:319, 333`). Passare il preset corrente rilevato rompe il comando.
- `oc_seq` parte da `0x01` ed è un contatore indipendente, non sincronizzato col seq dell'ampli

La batteria diagnostica in `explorer.html` copre queste varianti.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate, ed evitano di ripercorrere strade già chiuse.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI.
- `tools/explorer.html` resta **single-file** senza build step: va copiato tal quale sul
  telefono per i test.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.
