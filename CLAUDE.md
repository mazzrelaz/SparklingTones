# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth.

## Struttura

```
index.html               tutta l'app: sezione Preset e sezione Live, nello stesso documento
live.html                rimando a index.html#live, per le scorciatoie già installate
manifest.webmanifest     identità della PWA: nome, icone, scorciatoia alla vista live
sw.js                    service worker: guscio in cache, app utilizzabile offline
icons/                   icone PNG generate con lo script PowerShell in tools/
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
tools/model-probe.html   idem per 0x0106, il cambio modello che non ha effetto
tools/explorer.html      tool diagnostico, congelato — single-file, apribile da Android
tools/explorer-v1.html   versione precedente, tenuta per riferimento
test/protocol-test.html  87 test del protocollo contro catture reali
test/transport-test.html 48 test del trasporto, con send finto e catture reali
test/store-test.html     99 test della libreria, su un database temporaneo
test/backup-test.html    33 test del lettore zip e della conversione dal formato ufficiale
test/fixtures/preset0.js catture condivise fra le suite: preset salvato e stato live
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

Cosa siano resta aperto. L'ipotesi più semplice — preset nati sul firmware nuovo contro
preset vecchi importati — spiegherebbe perché cambino da preset a preset e non da effetto
a effetto.

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

**I nomi dei nove tipi non li sappiamo**, e infatti si leggono «Tipo 1»…«Tipo 9». Vanno
riconosciuti a orecchio, una posizione alla volta.

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

**Sull'hardware non funziona** (riferito dall'utente il 12 agosto 2026, su ampli e drive):
si sceglie il modello e non succede niente. Il messaggio è quello del riferimento —
due stringhe prefissate (`SparkIO.ino:900`, docs §3.10) — più il byte `0x00` finale che
sullo Spark 2 serve a `0x0115` e `0x0104`, ma quel byte lì **non è mai stato verificato**:
è stato messo per analogia. È la stessa forma di fallimento di `0x0127` e dei comandi
sugli effetti prima che si scoprisse il byte finale, e si affronta allo stesso modo —
`tools/model-probe.html` prova dieci varianti del messaggio una alla volta e **verifica
ognuna rileggendo la catena**, senza bisogno di ascoltare. Da rifare appena l'ampli è a
portata; finché non lo si sa, non spostare il codice a indovinare.

**Il cursore va strozzato.** Un trascinamento genera decine di eventi al secondo e ogni
comando è una scrittura BLE: mandarli tutti intasa la coda e il suono arriva in ritardo
sul gesto. Si manda al massimo ogni 60 ms tenendo solo l'ultimo valore per manopola, e
l'ultimo parte sempre — altrimenti si resterebbe fermi un pelo prima di dove si è
lasciato. Verificato: 41 eventi diventano un comando solo, col valore finale giusto.

Il blocco spento si vede spento e lo dice: **girare la manopola di un effetto spento non
produce nessun suono**, ed è una trappola già pagata una volta.

Ancora da fare: niente di concordato. Il prossimo passo lo decide l'utente.

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
