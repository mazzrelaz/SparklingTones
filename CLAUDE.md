# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32
in `pedale/`.

L'app è pubblicata e funziona; il pedale funziona su una devkit e aspetta i componenti
comprati. `README.md` racconta il progetto a chi arriva da fuori. **Dove si riprende** è
in fondo a questo file.

## Dove sta il resto di questa memoria

`CLAUDE.md` entra intero in contesto a **ogni** sessione, quindi qui resta solo quello che
serve sempre: le trappole che mi fanno rompere qualcosa, le regole che governano il
progetto, e il lavoro in corso. Il ragionamento dietro le scelte già fatte sta in `docs/`
e **va letto solo quando si rimette in discussione quella cosa lì**:

| file | quando aprirlo |
|---|---|
| `docs/pedale.md` | si lavora sul pedale: forma e misure, ferramenta, scatola, BLE, ponte, simulatore, modo MIDI |
| `docs/protocollo-spark2.md` | si tocca il protocollo, l'encoder, la scrittura dei preset |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake: disegno, wah, accordo, neon, manopole |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata, e perché una cosa è come è |

Snellito quattro volte: il 14 agosto 2026 (era 27.700 token), il 26 agosto (~27.000, metà
erano il pedale), il 27 agosto (~17.700 in un giorno solo: StompSnake pesava quanto il
protocollo dell'ampli), e il **29 agosto**, da ~23.300, spostando il racconto delle sessioni
in `docs/diario.md`. **Ogni volta non si butta via niente: si sposta in `docs/`.** La regola
che decide è sempre la stessa: qui resta ciò che mi impedisce di fare danni, il resto è un
rimando.

## Struttura

```
README.md / LICENSE / NOTICE      presentazione; MIT Massimo Togni; terzi (Soundshed MIT,
                                  paulhamsh Apache 2.0, font OFL)
index.html                        tutta l'app: sezione Preset e sezione Live, stesso documento
live.html                         rimando a index.html#live, per le scorciatoie installate
manifest.webmanifest / sw.js      identità PWA; guscio in cache, app utilizzabile offline
icons/ fonts/                     logo dell'utente; Inter e Space Grotesk, in casa
src/spark-protocol.js             encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js            BLE: coda di invio, attesa risposte, lettura preset
src/preset-store.js               libreria IndexedDB: import, backup, banchi, categorie
src/spark-effetti.js              nomi di effetti e manopole + MODELLI, dal catalogo Soundshed
src/spark-backup.js               legge preset_backup.zip dell'app ufficiale, senza librerie
src/dropbox-sync.js               sync della libreria: OAuth PKCE, niente server
src/pedale-ponte.js               sponda app del ponte BLE verso il pedale
src/pwa.js                        service worker, «installa», «versione nuova»
src/snake-pedali.js               la goliardata: StompSnake, a 8 bit, in «Fai una pausa»
pedale/prova-ble/                 firmware: si collega, cambia preset, riceve un banco
  banchi.h  preset_frames.h       formato del banco; frame preserializzati dall'app
pedale/prova-usb/                 sketch vuoto, per isolare i guai di USB/alimentazione
tools/pedale-sim.html             la faccia del pedale in una pagina, con la logica vera
tools/frames-pedale.html          genera preset_frames.h per il firmware
tools/ponte-prova.html            sonda del ponte, sponda app
tools/pedale-seriale.html         log del pedale via Web Serial (non resetta la scheda)
tools/serve.ps1                   server statico su localhost, per provare la PWA
tools/snake-banco.html            fa girare il gioco da solo e dice cosa è successo
tools/make-icons.ps1              rigenera icons/
tools/leggi-btsnoop.ps1           legge uno snoop log HCI di Android
tools/reader.html                 legge la libreria dall'ampli, esporta in JSON
tools/write-probe.html            varianti di 0x0101, con rilettura di verifica
tools/model-probe.html            idem per 0x0106
tools/looper-probe.html           ascolta l'ampli mentre si usa il looper
tools/explorer.html               diagnostico single-file per Android, CONGELATO
tools/explorer-v1.html            la sua versione vecchia, non aperta da nessuno: si può togliere
tools/banco-di-prova.js           otto preset veri per frames-pedale.html (da captures/)
test/*.html                       protocol 139, transport 60, store 136, backup 41, dropbox 34
test/fixtures/preset0.js          catture condivise fra le suite
design/proposte-*.html            le proposte grafiche a confronto, non è l'app
captures/                         log grezzi dall'ampli
reference/paulhamsh/              sorgenti di riferimento (ESP32 + Python), BLE funzionante
docs/                             vedi tabella qui sopra
```

**`index.html` è 186 KB: leggerlo intero costa ~55.000 token, più di due volte questo
file.** Non va mai letto tutto. È già navigabile: `grep -n '^/\* ==='` dà l'indice del
JavaScript e poi si legge la sola sezione con `sed -n 'a,bp'`. Le sezioni, in ordine:
`<style>` (15–691, senza marcatori), corpo HTML (fino a ~1000), poi lo script — Stato in
memoria, Le due viste, Log, Pannelli, Vista preset, Vista live, Invio di un preset
all'ampli, Editor della catena effetti, Il disegno dell'editor, Categorie, Azioni comuni,
Dropbox, Il pedale ESP32. I numeri di riga invecchiano a ogni modifica; i titoli no.

Niente build step, niente server: tutto si apre da `file://`. Per questo i moduli sono
classic script che espongono `window.Spark` e `window.SparkTransport` invece di ES module,
che su `file://` sono bloccati dal CORS.

IndexedDB funziona da `file://` su Chrome desktop (verificato). Ma su `file://` tutte le
pagine condividono la stessa origine opaca, quindi niente isolamento fra i database e il
browser li ripulisce più facilmente. **Passando da `file://` a https la libreria non viene
dietro**: altra origine, altro IndexedDB. Va esportata in JSON e reimportata.

`tools/explorer.html` ha una copia propria del codice di protocollo, perché deve restare
single-file per il telefono. È **congelato**: le modifiche vanno in `src/`.

## Trappole dell'ambiente

**Mai riscrivere un file di questo progetto con `Get-Content`/`Set-Content` di PowerShell
5.1.** Senza BOM, `Get-Content` decodifica l'UTF-8 come ANSI e `Set-Content -Encoding UTF8`
lo riscrive doppiamente codificato: ogni accento e ogni «—» diventano `Ã ` e `â€"`, in
tutto il file, in silenzio. Basta un `-replace` di una riga sola — ci sono ricascato il 13
agosto 2026 su `index.html`/`live.html`/`pwa.js` e il 14 su `sw.js`. Rimedio: `git checkout
-- <file>` se è committato, e rifare con gli strumenti di edit (o in .NET con l'encoding
esplicito). Se il file non è committato: rileggerlo come UTF-8, togliere l'eventuale `﻿`
iniziale e riscrivere i byte convertendo la stringa in **CP1252**, che è l'inverso.

**Dopo ogni modifica a `src/`, apri le pagine in `test/` e verifica che il riepilogo sia
verde.** Girano contro catture reali dell'ampli, quindi intercettano una regressione nella
codifica senza avere l'hardware a portata.

**Le suite girano anche senza browser**, con Edge headless:

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/spark/test/protocol-test.html'
```

Poi si cerca `id="summary"`. Funziona per protocol e transport. **Su `store-test.html` e
`backup-test.html` no**: col tempo virtuale il browser manda avanti i timer ma non aspetta
il lavoro asincrono vero — IndexedDB e le fetch dei fixture non fanno in tempo — e la
pagina resta a «esecuzione…». Non è un test rotto, è l'ambiente.

**Per quelle, e per provare l'app che gira, si passa da `localhost`**: `tools/serve.ps1` in
background, poi una scheda del browser del riquadro su
`http://localhost:8099/test/store-test.html`, e il riepilogo si legge con una riga di
JavaScript. Lì IndexedDB e la rete si comportano da veri. **Aprire un `file://` nel riquadro
invece non serve a niente**: lo carica come `data:`, i `<script src="../src/…">` non partono
e si vede solo il guscio. In quel browser il service worker non si registra: **non è
verificato** se sia un limite suo o un difetto nostro.

**In una scheda in secondo piano i timer vengono strozzati**, e una suite da un secondo
sembra piantata per minuti. Basta portarla in primo piano.

**Nel browser del riquadro `requestAnimationFrame` non gira**, e in Edge headless nemmeno:
misurato il 27 agosto 2026 con una sonda che contava i fotogrammi — **uno solo**, in tutti
e due. La pagina non compone, quindi rAF non scatta mai (e per lo stesso motivo lì lo
screenshot del riquadro fallisce: «not compositing frames»). Conseguenza pratica: **niente
che si muova da sé si può provare con rAF**, e infatti il ciclo del gioco è un
`setInterval`. Le catture di una pagina che *gira* si fanno con `--screenshot` e
`--virtual-time-budget`.

**Il service worker serve a Edge headless i file della corsa precedente.** Il profilo resta
sul disco, l'app ci registra `sw.js`, e da lì in poi ogni `--screenshot` guarda una copia
vecchia: si perde mezz'ora a chiedersi perché una modifica non si vede. Tre rimedi, in
ordine di comodità: una **query in coda** all'url (la chiave di cache comprende la query),
un profilo nuovo, oppure disiscrivere il service worker dalla pagina. Attenzione che il
profilo nuovo ne porta un'altra: **da freddo IndexedDB non fa in tempo a rispondere** col
tempo virtuale, quindi l'app resta a metà avvio.

**L'avvio dell'app chiude i pannelli.** `applicaVista()` chiama `chiudiPannelli()` quando il
database ha risposto: una prova automatica che apre un pannello troppo presto se lo vede
chiudere in faccia, e sembra un difetto del pannello.

**Lo stdout di Edge headless non torna alla shell**: `$out = & msedge …` dà **stringa
vuota** anche su una pagina che funziona. Va redirezionato su file con
`Start-Process … -RedirectStandardOutput $file -NoNewWindow -Wait`, poi
`[IO.File]::ReadAllText($file)`. Vale per `--dump-dom` e per `--screenshot` — ed è con
`--screenshot` che si guarda una pagina che *gira*, leggendola poi come immagine.

**L'ESP32 si programma e si legge dalla mia shell**, senza l'IDE: `arduino-cli` sta in
`%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`,
e la seriale si legge con `System.IO.Ports.SerialPort` da PowerShell. Tre trappole pagate
il 14 agosto 2026 (su un C3; da riverificare sul C6):

- **`CDCOnBoot=default` vuol dire *Disabled*, ed è il valore di fabbrica.** Con quella la
  `Serial` esce dai pin 20/21 e il monitor sull'USB resta muto: sembra che lo sketch non
  parta. Va compilato con `CDCOnBoot=cdc` nell'fqbn. Il segno che l'impostazione **non** è
  cambiata è `No changed sectors found` nel log di caricamento.
- **Aprire la porta seriale resetta il chip**: sull'USB nativo DTR/RTS pilotano reset e
  boot. `DtrEnable=$false, RtsEnable=$false` per leggere senza toccare niente; con
  `RTS=$true` il chip riparte **in download mode** e non esegue lo sketch.
- **Da download mode non si esce via software**, nemmeno con `esptool --after hard-reset`:
  serve staccare e riattaccare il cavo. Distingue i due casi `boot:0x5 (DOWNLOAD)` contro
  `boot:0xd (SPI_FAST_FLASH_BOOT)`.

**I messaggi di commit vanno passati per file, non per here-string.** `git commit -m @'…'@`
in PowerShell 5.1 si rompe in silenzio con virgolette doppie o certe sequenze: il testo
viene spezzato in parole e git risponde `pathspec '…' did not match any file(s)`. E il
sandbox rifiuta la riga se ci trova un `e:` o simili, leggendolo come percorso. Si scrive
il messaggio con Write nello scratchpad e poi
`git -c i18n.commitEncoding=UTF-8 commit -F <file>` — così **si possono anche usare gli
accenti**.

Il push non parte dalla mia shell, che è non interattiva: Git Credential Manager non
riesce a chiedere le credenziali e git muore con *terminal prompts disabled*. Funziona con
`GIT_TERMINAL_PROMPT=1`, `GCM_INTERACTIVE=true` e `GCM_GUI_PROMPT=true`, che gli fanno
aprire la finestra grafica sul desktop dell'utente.

## Le regole che governano l'app

**La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, famiglia e ordine. È il
comportamento più importante di `preset-store.js` ed è coperto da test.

**Preset e Live stanno nello stesso file, e non si separano.** La connessione BLE vive nel
documento: finché erano due pagine, passare da libreria a live era una navigazione e
all'ampli toccava riconnettersi a mano. Nessuna API lo evita. Le due viste sono in
`index.html` e si scambiano cambiando una classe sul `body`, quindi `spark` resta lo stesso
oggetto. **Verificato sull'hardware.** Il passaggio è sull'hash (`#live` / `#preset`) e non
su una variabile: così il tasto indietro di Android torna ai preset invece di chiudere
l'app.

**Attenzione toccando il CSS: le due sezioni condividono un solo `<style>`.** Le regole dei
preset vanno sotto `body:not(.vista-live)` e quelle live sotto `body.vista-live`, comprese
le variabili di colore — la vista live è più scura — e la media query del telefono.

### Sezione Preset

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, con l'etichetta
A1…B4 e i colori dei LED (rosso il banco A, verde il B). Tutti gli altri stanno sotto. Un
preset non compare mai in tutti e due i posti. **Niente striscia della famiglia sulle otto
caselle** (tolta il 26 agosto 2026): resta sulle righe di libreria e sul LED dei
pulsantoni live.

**Sovrascrivere uno slot non perde il preset che c'era**, e la domanda è venuta
(26 agosto 2026): `assignSlots` → `_sistemaSlot` gli toglie lo slot, quindi da lì in poi
cade in `altri` e **ricompare da solo nella lista sotto**, con tag, note e famiglia. Il
record non si cancella mai, cambia solo `slots`. L'utente ha deciso di lasciarla così:
niente duplicazione fra i due posti.

**Il bollo «JH» marca i preset che hanno un effetto Hendrix in catena**, sulle schede degli
slot e sulle righe di libreria (`bolloHendrix`, e `SparkEffetti.hendrixNellaCatena` che è
solo il prefisso `JH.`). Serve perché quei preset **non suonano come dicono** finché l'app
ufficiale non ha sbloccato il pacchetto — vedi la trappola in «Protocollo» — e va saputo
prima di sceglierne uno, non dopo averlo sentito muto.

**In tutto, gli Hendrix si dicono in quattro posti, e quattro devono restare**: le schede
della vista preset, la tendina dei modelli, il blocco a fuoco dell'editor (questi due in
«Editor della catena effetti») e **una riga nel log quando il preset parte per l'ampli**,
in `mandaPreset`, che è il momento in cui il suono esce sbagliato. Quest'ultima si dice
**prima dell'invio** e non nella verifica, così è una sola invece che in ognuno dei rami.
**È un avviso al buio**: all'ampli non si può chiedere se il pacchetto sia sbloccato,
quindi parla anche quando va tutto bene — ed è la ragione per cui i posti sono quattro e
non dieci. Restano scoperti **la vista live** (decisione dell'utente, non presa: i
pulsantoni li ha disegnati lui e il LED porta già la famiglia) e **il pedale**, che un
banco con dentro un Hendrix lo suonerebbe muto senza nessuna app che lo spieghi.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, dopo
`identify`). Durante la lettura i pulsantoni della vista live restano spenti: l'ampli sta
rispondendo a otto richieste in fila e premerne uno infilerebbe un comando dentro una
conversazione già aperta.

`store.hardware()` restituisce sempre otto posti, con `null` dove non sappiamo ancora cosa
ci sia. Nel disegnare «In libreria» il confronto va fatto **per id**, non per oggetto:
`hardware()` rilegge dal database e restituisce copie diverse dagli stessi record.

**`slots` è una lista, non un numero.** Lo stesso preset può stare in più slot, e capita
davvero. `normalizzaSlots` tiene una sola verità: costruisce `record.slots` ordinato e
**cancella il vecchio `slot`**. `_sistemaSlot(visti)` è il cuore, condiviso fra
`importFromAmp` e `assignSlots`: **si toccano solo gli slot osservati**, perché
`readLibrary` salta quelli che non rispondono e cancellare uno slot mai visto farebbe
sparire un preset per un timeout. Nella UI un preset in due slot compare due volte, e la
chiave di apertura del dettaglio è `id:slot` e non `id`.

**«Elimina tutti i preset» (pannello «Altro») risparmia gli otto dell'ampli**, e non per
prudenza: quelli l'ampli li suona, quindi la prima lettura li rimetterebbe dentro comunque
— ma spogliati di tag, note e famiglia, e *quello* sarebbe lavoro perso davvero.
`svuotaTranneAmpli` passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da
Dropbox» rimetterebbe dentro tutto. Due conferme, e la seconda dice che la cosa viaggia.

**Un preset nuovo si fa in tre modi, e nessuno parte dal nulla**: «Duplica» nel dettaglio
(`store.duplicate`, che cambia **UUID, slot e nome** — l'UUID perché altrimenti la lettura
dall'ampli scambierebbe la copia per l'originale), «Importa preset attuale» nel menu «⋯»,
che offre di salvare quello che l'ampli sta suonando — se quell'UUID c'è già aggiorna solo
la parte sonora, che è la regola di `importFromAmp` — e **«Importa un file»**, che dal
28 agosto 2026 prende anche **un preset singolo** dell'app ufficiale e non solo il backup
intero (vedi «Importare un preset solo» qui sotto). **Dal nulla non si fa, ed è
deliberato**: un preset inventato dovrebbe dichiarare sette blocchi con modelli che l'ampli
ha davvero, e un modello inesistente è quello che l'ha già piantato una volta (vedi
`TrebleBooster`). Se un giorno servisse, lo scheletro va preso da un preset **uscito
dall'ampli**, non dal catalogo.

**Importare un preset solo** (28 agosto 2026). «Importa un file» accetta tre cose e le
distingue **dal contenuto, non dall'estensione**: uno zip lo dicono i suoi primi due byte
(`PK`), il nostro backup lo dice il campo `presets`, e tutto il resto lo guarda
`SparkBackup.trovaPresetUfficiali`, che scende nel JSON in cerca di **un oggetto con
`sigpath`** invece di indovinare il nome dell'incarto — di un tono esportato o condiviso
dall'app ufficiale **non abbiamo un esemplare**, quindi la forma dell'involucro non la
sappiamo, ma la catena sì. Per questo l'`<input type=file>` **non ha `accept`**: con un
filtro, un'estensione che non conosciamo non si riuscirebbe nemmeno a scegliere.
Da lì in poi è la strada del backup — stesso `convertiPreset`, stessa `importFromBackup` —
quindi valgono le regole della libreria. Senza `meta.id` **l'UUID glielo diamo noi** e lo
si dice nel log: reimportando lo stesso file si fa un doppione invece di aggiornare.
**Il file non è l'unica via, e spesso non è la più comoda**: un tono che l'app ufficiale
sta già facendo suonare si prende con «Importa preset attuale», senza esportare niente.

### Sezione Live

Si suona, non si cataloga. **Un preset che sta già in uno slot dell'ampli si attiva
istantaneamente con `0x0138`; uno che non c'è va trasmesso per intero e ci mette circa un
secondo.**

**Banchi da otto, quattro a sinistra e quattro a destra**, come i due banchi di LED
dell'ampli (`grid-auto-flow: column` con quattro righe: senza, i posti 1–4 finirebbero a
zigzag). Ogni pulsantone ha un LED verde, anche i posti vuoti.

- Il banco **«Ampli» non è salvato da nessuna parte**: si ricava dal campo `slots` dei
  record, così non può divergere da quello che c'è davvero sull'ampli.
- I banchi inventati dall'utente stanno in `settings.banchi`. **Non scrivono mai
  sull'ampli**: scelta esplicita dell'utente, i loro preset si caricano al momento (~1 s).
  Per questo non c'è nessun «Prepara» — se lo scrivesse, sovrascriverebbe il banco fisso.

### Editor della catena effetti

Com'è fatto e perché — la catena al neon, i pomelli, la piramide, la tendina dei modelli —
sta in `docs/decisioni-ui.md`. Qui restano le regole che fanno danni se le dimentico.

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che
governa tutto il resto. Per questo «Regola», **quando l'ampli c'è**, prima manda il preset
con `loadPreset` e solo dopo apre il pannello. Lo stato di partenza si rilegge
**dall'ampli** (`readLiveState`), non dalla libreria: se l'utente ha girato una manopola
vera o ha usato l'app ufficiale, la verità è lì. Se la rilettura fallisce l'editor non si
apre — meglio niente che manopole che partono da valori inventati. Niente viene salvato
finché non si preme **Salva in libreria**.

**Senza ampli l'editor si apre lo stesso, sulla copia in libreria** (chiesto dall'utente il
24 agosto 2026: è il caso del divano). Non tradisce la regola di sopra, perché i valori del
record sono un'istantanea vera di quel suono. `inModifica.offline` governa la differenza:

- **niente parte sulla radio**: `mandaParametro` non accoda nemmeno, o un arretrato
  partirebbe tutto insieme se l'ampli si connettesse a metà;
- **il modello si cambia, qualunque, anche senza ampli** (dal 26 agosto 2026, chiesto
  dall'utente in tre passi: prima la tendina era spenta, poi si aprivano i soli modelli
  visti, ora tutti). Non è un cedimento sulla sicurezza: la regola è sempre stata **«solo
  quelli di cui sappiamo com'è fatto il blocco»**, e adesso lo sappiamo per tutti e
  **settantotto** i modelli cambiabili, perché il catalogo è verificato contro l'app
  ufficiale e la `TABELLA` dichiara le manopole di ognuno.

  Che quel numero sia quello vero **è misurato**: nei ventiquattro blocchi dei preset usciti
  dall'ampli in `captures/` — ventidue modelli diversi — i parametri sono sempre tanti
  quanti i nomi. Le due eccezioni, noise gate e riverbero, ne hanno uno in più
  (l'acceso/spento) e sono proprio i due blocchi con **un modello solo**, che non si cambiano
  mai.

  Nel cambio, **prima si copia e poi si costruisce**: se quel modello sta già in un preset
  della libreria, `campioneModello(nome)` ne prende numero di parametri *e* valori — è un
  blocco che l'ampli ha davvero prodotto. Solo se non c'è si costruisce dalla tabella, con i
  valori a metà corsa. Il blocco resta acceso o spento com'era, che è una scelta dell'utente
  e non una proprietà del modello;
- **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si connette
  dopo: rileggere la catena a metà lavoro sostituirebbe di soppiatto quello che si sta
  modificando con quello che l'ampli sta suonando, che è un altro suono.

Il titolo dice «— senza ampli» e la riga di stato lo ripete.

**Le sette posizioni sono etichettate per categoria** (`Spark.CATENA`): noise gate,
compressore, drive, ampli, modulazione, delay, riverbero.

**Il tempo sta qui, e solo qui** (28 agosto 2026, chiesto dall'utente e poi ristretto da
lui: «non nella vista live, non serve»). La ragione è che **il bpm è un campo del preset**
— `preset.bpm`, che `serializePreset` scrive dentro `0x0101` — quindi viaggia col preset e
torna quando lo si rimanda all'ampli: è una cosa che si sceglie mentre si costruisce il
suono, come una manopola, non mentre si suona. Si batte col **tap** (due tocchi bastano,
media delle ultime cinque battute, una pausa oltre 2,5 s ricomincia) o si aggiusta di un
bpm coi due tasti. Il riscontro del tap è **il lampeggio del tasto** e non un messaggio,
che in questo pannello non ne devono comparire.

Con l'ampli attaccato il cambio parte subito con `0x0176` (`spark.setBpm`), **e gli effetti
a tempo lo seguono da soli**: l'accoppiamento è dentro l'ampli. Senza ampli **non parte
niente sulla radio**, come per le manopole. All'apertura il valore si prende dalla lettura
dell'ampli quando c'è, dal record quando non c'è, e 120 per i record vecchi che il campo
non ce l'hanno. `salvaModifiche` lo scrive nel record.

**Il cursore va strozzato, e lo strozzamento dev'essere autocadenzato.** Un trascinamento
genera decine di eventi al secondo e ogni comando è una scrittura BLE.
**`writeWithoutResponse` non ha controllo di flusso**: la promessa si risolve quando il
sistema ha preso in carico la scrittura, non quando l'ampli l'ha ricevuta, quindi l'app può
correre più della radio. **È la causa più probabile dell'ampli che si pianta girando le
manopole**, segnalato dall'utente il 16 agosto 2026.

Quindi il prossimo invio parte **quando il precedente è finito**, più `PAUSA_PARAMETRO`
(90 ms), e non su un timer: così la coda non può crescere qualunque cosa faccia il dito. La
versione a timer da 60 ms poteva **sovrapporsi a sé stessa** — `svuotaCoda` azzerava
`timerInvio` prima di aspettare gli invii — e accumulava arretrato. Si tiene solo l'ultimo
valore per manopola, e l'ultimo parte sempre. **Non è verificato che risolva**: il blocco
non si riproduce a comando. Se ricapita, la manopola da girare è `PAUSA_PARAMETRO`, poi
`SEND_GAP_MS` in `spark-transport.js` (30 ms, più svelto di un intervallo di connessione).

**L'editor sa se c'è del lavoro non salvato, e non lo lascia buttare via per sbaglio.**
`inModifica.toccato` è il dato, e nasce in `segnaModificato()`: lo alzano `mandaParametro`
(dove passano **tutte e cinque** le manopole — pomello, cursore, tendina, i due
trascinamenti — subito **prima** del ritorno che scarta l'invio offline), l'interruttore
acceso/spento, e ogni ramo di `cambiaModello`. Da lì:

- **«Fatto» e il logo chiedono**, con `chiediPrimaDiUscire()`. **Tre vie, non due**: con un
  `confirm()` di sistema l'alternativa a «salva» è «butta via», e un dito che sbaglia
  bottone perde il lavoro proprio mentre glielo si chiedeva. La terza — «Torna all'editor»
  — è anche quella di Esc e del tocco fuori. Il logo passa un seguito, che parte **solo se
  si esce davvero**: chiude l'editor *e* torna ai preset.
- **Se il salvataggio fallisce non si chiude niente**, e per questo `salvaModifiche()`
  torna `true`/`false`: chiudere dopo un salvataggio fallito è il modo esatto di perdere
  il lavoro che si stava salvando.
- **Il segno che ha salvato lo dà il tasto**, non un messaggio — in questo pannello non ne
  deve comparire nessuno, ed è per quello che l'utente non aveva «la certezza di nulla».
  Pallino rosso e bordo acceso quando c'è del lavoro in sospeso, `✓ Salvato` verde per 2,6
  secondi dopo, poi normale. **Non si disabilita mai quando niente è toccato**: con l'ampli
  la catena viene da una lettura vera e può già essere diversa da quella in libreria —
  salvare in quel momento è proprio come si porta in libreria quello che l'ampli suona.

**Gli Hendrix si dicono in due momenti, e sui tasselli non si dicono affatto.** Quei
modelli si chiamano già «J.H. Fuzz Zone»: il nome li identifica da solo, e un bollo in più
su una casella da 106 px sarebbe rumore. Quello che manca è **cosa comporta**, e va nei due
momenti in cui conta: una `.elenco-nota` sotto l'intestazione «Jimi Hendrix Pack» della
tendina — **una sola, non su ogni voce** — e una `.nota-jh` sotto il nome del modello nel
blocco a fuoco, che resta lì finché quel modello è quello. La seconda **è uno stato, non un
messaggio**, che in questo pannello non ne devono comparire: sta al nome del blocco come
«offline» sta al nome del preset.

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, e `logLine`/
`logProgress` ci scrivono l'ultimo messaggio: un pannello a tutto schermo copre il log, e
senza quello un comando fallito è indistinguibile da un comando che non fa niente.
**`pulisciStatoPannelli()` nasconde ogni `.stato-pannello`**, e chi ci scrive deve
rimostrarlo (`riga.hidden = false`) — è quello che fa `statoDelPannello`. Senza, il log
viene scritto sempre e non si vede mai: due giri di diagnostica finiti in un elemento
invisibile.

### Finestre e tendine: nell'app non c'è più niente del sistema

**Mai più `confirm()`, `alert()`, `prompt()` o `<select>`** (26 agosto 2026, chiesto
dall'utente: «sulla prima pagina sono ancora i menu di sistema»). Aprono la roba del
sistema operativo — carattere suo, fondo chiaro in un'app tutta nera, e sul telefono il
menu di Android manda a capo le voci lunghe — e soprattutto **un `confirm()` ha due vie
sole**, che è il problema che aveva già fatto nascere la domanda dell'editor.

Al loro posto, tutte costruite sulla stessa scatola `.elenco-scelta`:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | il valore sta in `.valore` (non `.value`), `aggiorna(v)` lo cambia da fuori |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | il testo, o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | il `valore` dell'azione, `null` se si esce |

Tutte sono **asincrone**, quindi il gestore che le chiama va `async`. `testo` è **HTML** —
il grassetto va sulla parte che conta — e un nome che viene dai dati ci entra solo passando
da **`testoConNome()`**, che lo scappa. Esc e il tocco fuori tornano sempre `null`, che è la
via che non fa niente.

**Le scorciatoie «campo vuoto = elimina» sono sparite**, ed erano due: il nome del banco e
il nome di una manopola. Erano una regola scritta fra parentesi che nessuno legge, e chi
svuotava il campo per riscriverlo si trovava a rispondere di un'eliminazione mai chiesta.
Adesso sono bottoni che dicono quello che fanno.

**Nella tendina «⋯» nessuna voce si spegne**, e il motivo è misurato: **un pulsante
`disabled` non riceve il clic**, quindi non scatta nemmeno il gestore che chiude la
tendina — la tendina resta aperta, non compare niente da nessuna parte, e si vede
un'app rotta. È quello che è successo il 28 agosto 2026 con «Importa preset attuale»
(«non succede nulla»). Quindi «Leggi dall'ampli» e «Importa preset attuale» restano
sempre premibili e, senza ampli, **rispondono**: `senzaAmpli(cosa)` compone la riga di
log, una sola, che dice cosa manca e cosa fare. La stessa trappola vale per qualunque
voce si aggiunga lì dentro.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), non da Positive Grid, quindi restano
**proposte**: si vedono *in corsivo*, un nome scritto a mano vince sempre, e `manopola()`
**scarta l'intera riga** se dichiara più manopole di quante l'ampli ne manda per
quell'effetto.

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto.** Su un ampli
le manopole si leggono Gain, Bass, Middle, Treble, Master, ma negli indici stanno
`Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Trascrivendo dall'interfaccia si
sbagliava in silenzio. Due test fissano questo caso e quello di LA Comp.

Il campo `quante` dice **quante manopole ha davvero l'effetto**: può essere più dei nomi che
sappiamo e meno dei parametri che arrivano. I parametri in eccesso sono
**l'acceso/spento del blocco** (misurato, vedi `docs/protocollo-spark2.md`).

**I nomi dei parametri li dà l'utente**, girando e ascoltando: l'ampli manda solo indici e
non esiste nessuna tabella da cui dedurli. Sono salvati **per modello di effetto**
(`settings.nomiParametri`), non per preset. `exportAll` li porta con sé e `importBackup` li
**aggiunge** invece di sovrascrivere: reimportare un backup vecchio non deve cancellare i
battesimi fatti da allora.

**`MODELLI` adesso è verificato tutto, contro l'app ufficiale** (26 agosto 2026): l'utente
ha fotografato l'elenco intero sul suo Spark 2 e il confronto voce per voce ha tolto
**dodici** nomi che il catalogo di Soundshed aveva e l'ampli no. I conti tornano con i suoi
screenshot: **noise gate 1, comp/wah 6, drive 14, ampli 39, modulazione 13, delay 6,
riverbero 1 con 9 tipi**.

I dodici: `JCM800`, `MatchlessDC30`, `DrZ`, `Hiwatt103`, `B15`, `Acoustic360`, `GK700RBII`,
`MetalZoneMT2`, `MuTron` — e tre che **esistono ma solo su Spark LIVE ed EDGE**, sul canale
del microfono: `Preamp73`, `Comp76`, più i «vocal» che non avevamo. Erano tutti
`TrebleBooster` in attesa (18 agosto 2026: sullo Spark 2 c'è solo `Booster`, e chiederne
uno inesistente lo mandava in palla). Restano nella `TABELLA` dei nomi, che è innocua e
serve ancora a dare un nome alle manopole di un preset importato da altrove.

**Se si aggiunge un nome nuovo a `MODELLI`, va verificato allo stesso modo**, perché
all'ampli non si può chiedere quali modelli conosce: l'unica prova è che compaia
nell'elenco ufficiale o in un preset uscito dall'ampli. La tendina tiene in fondo un gruppo
«fuori dall'elenco Positive Grid» — oggi vuoto — che li raccoglierebbe.

**Gli effetti Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»**
(`SparkEffetti.GRUPPO_HENDRIX`, una stringa sola per tutti e quattro i blocchi che ne
hanno). Chiesto dall'utente il 26 agosto 2026, e non è solo ordine: sono l'unico contenuto
a pagamento e l'unico che può entrare in catena e restare muto, quindi sparsi in mezzo agli
altri sembravano effetti come tutti gli altri. Per gli ampli è una famiglia di
`GRUPPI_AMPLI` come le altre, ed è l'ultima; per gli altri blocchi, che famiglie non hanno,
l'elenco si costruisce in due passate.

## Protocollo — quello che non va dimenticato mai

Dettaglio, derivazioni e misure: `docs/protocollo-spark2.md`.

GATT: service `0xFFC0`, write `0xFFC1` (**writeWithoutResponse only**), notify `0xFFC2`.
Notifiche frammentate: riassemblare cercando `F0` … `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`.

Stato: **completo e verificato sull'ampli**. `0x0201` lettura, `0x0138` cambio preset,
`0x0115` effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset intero.

**Le trappole, tutte verificate sull'hardware:**

- **`0x0115`, `0x0104` e `0x0106` vogliono un byte `0x00` in coda al payload logico.**
  Senza, ack regolare e comando non applicato. `0x0138`, `0x0175` e `0x0176` no — e su
  `0x0176` il byte di troppo **non è innocuo**: il bpm non cambia e **il delay parte in
  ripetizione infinita** (28 agosto 2026), perché l'ampli legge i campi spostati. Si
  recupera premendo un tasto preset sul pannello. Quindi **un payload malformato può
  muovere qualcosa che non c'entra**, non solo essere ignorato.
- **Il bpm si scrive con `0x0176`, e gli effetti a tempo seguono da soli** (verificato il
  28 agosto 2026). Il payload si costruisce **dall'ultimo `0x0376` ricevuto** cambiando il
  solo bpm, mai da una costante: l'ultimo campo cambia forma fra sessioni (`3c` contro
  `cd ea 60`). Il TAP dell'ampli manda insieme `0x0363`, `0x0376` e `0x0337` sul parametro
  4 di `DelayRe201`: l'accoppiamento tempo→effetti è dentro l'ampli, non tocca a noi.
  Dettaglio in `docs/protocollo-spark2.md`.
- **L'ack conferma la ricezione, non l'esecuzione.** E `writeWithoutResponse` fa sembrare
  riuscita ogni scrittura lato browser. **L'assenza di errori non è una verifica**: vale
  solo l'effetto sull'ampli o una risposta in RX.
- **Chunk da 25 byte di payload, non 128.** Con 128 lo Spark 2 **si disconnette**. Il
  massimo verificato in scrittura è 44.
- **Tutti i chunk di un preset vanno con lo stesso sequence number.**
- **`0x0127` non salva sullo Spark 2**, in tutte e quattro le forme provate. Tolto.
- **Le write BLE lunghe vanno spezzate**: l'app ufficiale manda ogni messaggio in write ATT
  da 20 byte e l'ampli riassembla da sé. `transport.sendSpezzato(comando, 20)`. Sopra i ~44
  byte una write singola sparisce **in silenzio**, senza nemmeno l'ack.
- **Cambiare un parametro di un effetto spento non produce nessun suono.** Verifica prima
  che l'effetto sia attivo.
- **`0x0106` vuole il nome del modello che c'è *adesso***, riletto dall'ampli, non quello
  che ha sullo schermo. Se sbagliato, l'ampli ignora tutto senza fiatare — e da lì in poi
  ogni cambio fallisce per sempre.
- **L'ampli si può piantare davvero**, e allora serve staccare la corrente. `rxTotali`
  distingue i due casi: 0 messaggi = ampli muto o connessione morta; più di 0 = parla e
  siamo noi a scartare. Senza quel numero i due casi si vedono uguali — è costato una
  serata.
- **Gli effetti Hendrix (`JH.*`) non suonano finché l'app ufficiale non li sblocca**, e
  non c'è niente che possiamo farci. Osservato dall'utente il 26 agosto 2026: i `JH.*`
  mandati dalla nostra app restano muti — «Hey Jimi Solo» suona senza fuzz e con l'ampli
  sbagliato, anche scritto in uno slot — e **nemmeno il pannello dell'ampli li sblocca**
  (ci ha creduto per un momento e si è ricreduto). Basta invece **connettere l'app
  ufficiale**: da lì in poi funziona tutto, e **lo sblocco resta nell'ampli anche dopo
  che l'app ufficiale si è disconnessa**. Il pacchetto lui ce l'ha comprato.
  È l'unico contenuto a pagamento dello Spark 2, e chi lo abilita è la **license key
  `0x0170`** che l'app ufficiale manda appena connessa. **Non è forgiabile**: spacchettata
  dalle due catture in `captures/2026-08-14-app-ufficiale-looper.txt` sono **64 byte tondi,
  completamente diversi fra le due sessioni**, cioè una firma con dentro un nonce — e
  rigiocata l'ampli la rifiuta (`0x0470` con `fe` invece di `00 00`, vedi `docs/looper.md`).
  Cavare la chiave dall'app ufficiale è protezione di contenuto a pagamento e non si fa.
  Sull'app ufficiale i suoni Hendrix si vedono **solo dopo il login**, ma **fare il login
  dalla nostra app non servirebbe a niente, ed è misurato**: nella cattura l'app manda la
  chiave **14 ms dopo** la risposta dell'ampli a `0x022f` — due volte, a 0,060s e a
  589,246s — e in 14 ms non ci sta un giro in rete. E se fosse un gettone preso dal server
  al login le due connessioni manderebbero lo stesso; invece sono diversi. **L'app la firma
  in locale, con una chiave che si porta dentro.** Ne segue che **l'ampli non verifica
  l'acquisto: verifica una firma** — non ha account e non parla con internet. Il login
  serve all'app ufficiale per *mostrare* i suoni, non all'ampli per abilitarli.
  **La cosa da ricordare è che non è un difetto nostro**, così non ci si torna sopra.
  E ne resta una lezione che vale oltre gli Hendrix: **la catena riletta conferma il nome
  del modello, non che quel blocco suoni** — è quello che aveva «verificato» il cambio a
  `JH.SupaFuzz` il 13 agosto, mentre il fuzz era muto.

**Le due strade per scrivere un preset sono diverse**, e questo è costato mezza giornata:

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

Il giro via e ritorno non è decorazione: senza, lo slot riporta il contenuto vecchio.
`loadPreset` non sovrascrive nessuno slot: è il modo sicuro di provare un preset.
**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot — non
è un malfunzionamento.

**Lo Spark 2 ha 8 slot, 0–7** (il 0–3 della documentazione vale per lo Spark 40), ma il
pannello ha **4 LED bicolore**: rosso banco A (0–3), verde banco B (4–7).
`Spark.slotLabel(n)` fa la conversione e la UI mostra A1…B4.

**Nessuna autenticazione è richiesta, e dal 28 agosto 2026 è misurato e non supposto**: la
license key `0x0170` **abilita il contenuto a pagamento, non i comandi**. Con l'ampli
sbloccato davvero — l'app ufficiale connessa prima, senza staccare la corrente — il
conteggio del looper resta ignorato identico a quando la chiave non c'era. Gli Hendrix la
vogliono, il protocollo no. Vedi `docs/looper.md`.

**Looper**, in due righe: si comanda con `0x0175` e un byte (`04` rec, `05` stop rec, `08`
play, `09` stop, `0b` dub, `0c` stop dub, `0a` delete); si legge posizione (`0x0377`), bpm
(`0x0363`) e impostazioni (`0x0376`). **La battuta di conteggio col click non si comanda, e
non è più un'ipotesi aperta**: `02` riceve l'ack e viene buttato via, e il 28 agosto 2026 è
caduta anche l'ultima spiegazione rimasta sui byte (la chiave). **Ma non è chiuso**, e la
ragione è quella che ha detto l'utente: se l'app lo fa partire, un modo c'è. Quello che è
finito è l'elenco delle ipotesi sui *byte*; **il canale non era mai stato guardato** —
`leggi-btsnoop.ps1` concatenava tutte le write buttando via **handle e opcode ATT**, quindi
«byte identici a quelli dell'app» era verificato e «sullo stesso canale» no. Metà è già
chiuso: **`0xFFC1` dichiara solo `writeWithoutResponse`**, e la **mappa GATT presa con nRF
Connect** dice che è **l'unica cosa scrivibile dell'intero dispositivo** (28 agosto 2026,
tutta in `docs/looper.md`). L'app non aveva un'altra strada: stesso canale, stesso opcode,
stessi byte. E **il paradosso è reale**, misurato il 28 agosto 2026: REC premuto nell'app
ufficiale, mani lontane dal pannello, **conta** — quindi non era un dito sull'ampli.
**Allora la differenza è in chi manda, non in cosa manda.** Il **bonding** è escluso per
costruzione: la sonda fatta girare **sullo stesso telefono** che con l'app ufficiale fa
contare l'ampli fallisce lo stesso. Resta **la sessione autorizzata**, ed è la conclusione:
lo sblocco dei suoni resta nell'ampli, ma un flag «questo client ha mandato una chiave
valida» è per connessione, e in nessuna prova ne abbiamo mai avuta una. **Quindi il modo
c'è ed è la chiave `0x0170`, e non è una porta che apriamo** — sarebbe estrarre una chiave
di firma dall'app ufficiale. La tabella di tutto ciò che è stato eliminato sta in
`docs/looper.md`, «Come si conclude». **Non aggiungere sonde sui byte.** L'unica cosa che
resterebbe da fare è **chiedere a Ignitron**, che manda COUNTIN senza nessuna chiave: se a
loro funziona, la conclusione cade.

### Regole di metodo, che valgono oltre il looper

- **Una cattura d'ascolto dice cosa l'ampli racconta, non cosa accetta.** I nomi degli enum
  di terzi descrivono lo *stato in cui l'ampli è entrato*, non un tasto da premere: che il
  pannello notifichi `02` non vuol dire che `02` si possa mandare. Le due direzioni vanno
  misurate separatamente.
- **Si registra prima e si interpreta dopo, mai il contrario.** Una sonda che chiede di
  dichiarare in anticipo cosa si sta per fare produce log che mentono appena l'ampli fa
  altro.
- **I dati finti non devono finire in una cattura.** Sono marcati `demo`, non contano negli
  RX totali e l'esportazione li scarta.
- Ogni prova va verificata **rileggendo dall'ampli**, una variante alla volta.
- **Strumentare prima di ipotizzare.** I contatori — fronti grezzi contro pressioni
  accettate — hanno chiuso in una sessione un problema su cui si era tirato a indovinare per
  due.

## Il pedale ESP32

Il ragionamento completo — la forma e perché, tutta la ferramenta pezzo per pezzo, le
misure BLE, il ponte, il simulatore, la ricognizione — sta in **`docs/pedale.md`**, che va
aperto quando ci si lavora. Qui il minimo per non fare danni.

**Cos'è**: la vista live del web, staccata dal telefono. Prende i preset dall'app, poi è
autonomo con lo Spark. Nessuna regolazione, solo preset. Sta in questo repo perché
l'interfaccia app↔pedale è un contratto fra le due sponde e un commit solo deve poter
cambiare tutte e due.

**Comandi**: quattro footswitch = i quattro suoni della metà corrente; un quinto **cambia
metà senza toccare il suono che sta suonando** (provato col piede nel simulatore e voluto
così dall'utente: sul palco la sorpresa è il difetto peggiore); due tasti a mano per i
banchi. Il banco resta da otto, diviso in due metà da quattro, come i banchi dell'app e
come i quattro LED bicolore dell'ampli — rosso A, verde B, e **cambiano tutti e quattro
insieme**. Quando la metà mostrata non è quella che suona nessun LED è acceso, ed è giusto:
per questo l'OLED tiene in fondo una riga **♪** con quello che sta suonando davvero.

**Le regole che non si toccano:**

- **Il pedale non tocca mai gli slot hardware.** Ogni cambio preset è `0x0101` sul buffer
  `0x7f` + `0x0138` con `0x7f`, ~200–400 ms. Ne segue che servono **solo due comandi**:
  niente `0x0104`, `0x0115`, `0x0106`, niente parser dei preset. E il pedale non può
  rovinare quello che c'è sull'ampli, per costruzione. Conseguenza: **il LED del pannello
  dell'ampli lampeggia in permanenza**, non è un difetto.
- **L'app preserializza, il firmware non serializza niente.** Riceve frame già pronti e
  **patcha un byte solo**, il seq all'indice 2 — il checksum è un XOR dei soli byte
  impacchettati e non lo copre. Verificato sull'hardware. L'encoder resta uno solo, in JS,
  coperto dai test. `tools/frames-pedale.html` → `preset_frames.h`.
- **Un padrone alla volta**: mentre l'ampli è connesso al pedale **smette di annunciarsi**,
  quindi via Web Bluetooth il browser non lo trova più. Il pedale si annuncia sempre come
  `SparkPedale`; quando l'app si collega **molla l'ampli**, quando l'app se ne va se lo
  riprende (~0,5 s). **Se il footswitch non fa niente, il primo sospetto è l'app ancora
  collegata** — è lo scambio più facile da fare, ed è già costato tre giri di diagnosi.
- **Mai fare operazioni BLE dentro un callback BLE**: `disconnect()` in `onConnect` o
  `startAdvertising()` in `onDisconnect` bloccano NimBLE per decine di secondi. I callback
  alzano una bandiera, il lavoro lo fa il `loop()`.
- **Niente attese bloccanti che non guardino gli ingressi.** Durante un trasferimento il
  tasto va letto lo stesso: la pressione si accoda e **vince l'ultima**.
- **L'antirimbalzo aspetta che il segnale stia fermo**, non che sia passato del tempo
  dall'ultimo cambio accettato. Con la forma sbagliata un contatto sporco può tenere la
  porta chiusa a tempo indeterminato.
- **Web Bluetooth ammette una sola operazione GATT alla volta per dispositivo.** Ci si casca
  appena si risponde a una notifica con un comando. Serve una coda; il trasferimento di un
  banco ci entra **come blocco solo**.
- **Il formato del banco sta in due file che vanno cambiati insieme**: `src/pedale-ponte.js`
  lo costruisce, `pedale/prova-ble/banchi.h` lo legge. `banchi.h` è **l'unico punto del
  progetto dove entrano byte non nostri**: offset e lunghezze vanno verificati, o un blocco
  malformato scrive oltre il buffer.

**Stato**: verificato sull'hardware (C3) — connessione, cambio preset in ~200–400 ms
(contro ~1,2 s del telefono, perché `updateConnParams` a 7,5 ms secchi accorcia i sedici
round-trip), trasferimento di un banco dall'app, salvataggio in LittleFS e ricarica dopo un
riavvio, footswitch. Il pannello «Pedale» nell'app compone il riordino offline e lo applica
in una volta.

**Ferramenta comprata** (25 agosto 2026, scelte e perché in `docs/pedale.md`): **XIAO
ESP32-S3** (era la C6 fino al 29 agosto 2026, vedi sotto), OLED **2,42" 128×64 SSD1309 in SPI a 7 pin**, espansore **KAmod I2C-IOexp16**
(MCP23017), cella **XTAR 18650-330PCM protetta** in portacella. **I LED non si comprano**:
sono i RGB 5 mm **a catodo comune** che l'utente ha già in casa a mucchi, quelli del suo
progetto `Timer` — resistenze già tarate a 3,3 V, **verde 100 Ω e rosso 220 Ω**, e il blu
non si usa perché quattro LED per due colori sono già le otto uscite libere
dell'espansore. Attenzione: **l'MCP23017 non ha PWM**, quindi acceso/spento e basta. Mancano footswitch e pulsantini dalla Cina, ma **per il firmware
bastano i pulsanti da arcade che l'utente ha in casa** (COM e NO del microswitch: sono la
stessa cosa elettrica).

**Il 29 agosto 2026 la scheda è passata dalla C6 alla XIAO ESP32-S3**, comprata dall'utente:
**solo l'S3 ha l'USB-OTG vero**, quindi è l'unica che può fare la modalità MIDI da sola, senza
programmi ponte (vedi «Discusso e non aperto: il pedale in modalità MIDI»). Tutta la
ferramenta comprata resta buona; cambia la mappa dei pin, e **quella della C6 nel resto di
questo file e in `docs/pedale.md` è storia**.

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `5`, `6` | MCP23017 in I²C (SDA, SCL) |
| D8 / D10 | `7`, `9` | display SPI: SCK, MOSI |
| D3, D1, D9 | `4`, `2`, `8` | display: CS, DC, RST |
| D0 (A0) | `1` | tensione di batteria — **il partitore va saldato** |
| D6 / D7 | `43`, `44` | UART: il log seriale, **da tenere libero** |
| D2 | `3` | libero — è l'unico strapping portato fuori, si usa per ultimo |

Le tre differenze che fanno danni se le dimentico: **l'antenna non è a bordo** (solo u.FL, e
senza antennina **non funziona il BLE** — non è l'antenna del Wi-Fi, che qui non serve: la
radio a 2,4 GHz è una sola e la condividono). **Non si compra niente**: si usa il **foglietto**
di serie, dentro la scatola, perché l'antenna l'utente non la vuole vedere — e **la scatola
sarà di legno**, che ai 2,4 GHz è trasparente, quindi la gabbia di Faraday dell'alluminio non
è un problema nostro. L'unica accortezza è **lontano dal metallo interno** (cella 18650,
cornice del display). Una stilo su bulkhead ce l'ha in casa e resta la riserva. **La prova si
fa a scatola chiusa e a tre-quattro metri**, che a mezzo metro funziona qualunque cosa; **carica a 50 mA** invece di 100, il che non cambia niente perché si carica col
TP4056; e **il log seriale sull'USB potrebbe non convivere con la porta MIDI** — se non
convive, il log passa dalla UART e per ricaricare il firmware si tiene premuto BOOT e si
tocca RESET. Da rimisurare: i tempi BLE e **l'autonomia**, perché l'S3 consuma più della C6.

**La scatola: ~295 × 145 × 50 mm**, scelta dall'utente — interassi **55 + 55 + 55 + 70**. **La
misura la decide il piede, non i componenti**: l'elettronica occupa un quinto del pianale. Il
minimo assoluto sarebbe 45 mm d'interasse (sotto, con una scarpa vera se ne premono due
insieme), e **i 70 mm fra il quarto e il quinto sono un riferimento tattile**: quel pedale
cambia metà senza toccare il suono, e il vuoto lo fa trovare senza guardare. Materiali scelti il 29 agosto 2026: **sponde in mogano da 10 mm,
top e fondo in rovere da 5 mm**, con rinforzi interni. Due trappole che vengono da lì: **le
prese USB-C accettano un pannello fino a 8 mm**, quindi nella sponda da 10 va svasato
dall'interno; e **i rinforzi vanno fra un footswitch e l'altro** — così al foro restano 5 mm e
il filetto non è un vincolo — **arrivando alle sponde**, con la fibra del rovere lungo la fila
dei pedali. Il resto in `docs/pedale.md`, «Quanto sarà grande».

**L'alimentazione è decisa e comprata** (27 agosto 2026). Le cinque cose che fanno danni se le
dimentico; tutto il resto — cablaggio, saldature, indicatore di batteria, scelta dei pezzi —
sta in `docs/pedale.md`:

- **la XIAO carica pianissimo** — 100 mA la C6, **50 mA l'S3** che l'ha sostituita, e non i
  380 del C3: decine di ore su una 3300, quindi **la sua USB non è una via di ricarica**. Si
  carica con un **modulo TC4056 dedicato** e la sua presa; la cella si può anche estrarre e
  caricare fuori;
- **il TP4056 non fa load sharing**: per fidarsi del verde `FULL` si carica a **interruttore
  generale spento**. Usarlo mentre carica funziona lo stesso, non è un divieto;
- **interruttore generale fisico**, sul positivo **fra la cella e la XIAO**, col modulo
  attaccato alla cella *prima*. Il deep sleep non lo sostituisce: in borsa un footswitch si
  preme da solo. **Niente auto-spegnimento per inattività**, che sul palco è la sorpresa che
  non si vuole;
- **due prese sul pannello, da etichettare**: una carica, l'altra fa firmware, log seriale
  **e, con l'S3, il MIDI verso il computer**. Sono identiche, e il caricatore nella sbagliata
  non carica senza dirlo;
- **il partitore di A0 va saldato** (non è a bordo né sulla C6 né sull'S3), e **l'indicatore di batteria è
  firmware da scrivere**: quattro tacche a soglie, **mai percentuali** — la tensione di un
  litio è piatta nel mezzo — e sotto **3,50 V** un avviso impossibile da non vedere, che la
  protezione della cella taglia a 2,5 V e il pedale muore a metà canzone.

Interruttori sul **port A** dell'espansore (è quello che può far scattare l'interrupt), LED
sul port B. **Non verificato sull'S3**: i tempi BLE (misurati su C3, libreria identica),
l'autonomia, e se il modulo espansore abbia i pull-up sull'I²C — se il bus non parte, quello
è il primo sospetto, e si risolve con due resistenze da 4,7 kΩ.

## La goliardata: StompSnake

Un Snake a 8 bit in «Fai una pausa» (menu «⋯»), chiesto dall'utente il 27 agosto 2026.
**Non tocca niente**: non parla con l'ampli, non legge la libreria, non ha stato in comune con
l'app — l'unico contatto è `SnakePedali.apri()`, e record e «muto» stanno in `localStorage`,
non in `settings`, perché non devono finire in un backup né su Dropbox. **Vive in
`src/snake-pedali.js` e non in `index.html`**, che costa già ~55.000 token a lettura. Il ciclo
è un `setInterval` e non `requestAnimationFrame`, che nei miei due browser non gira (vedi
«Trappole dell'ambiente»). `tools/snake-banco.html` lo fa girare da solo e dice cosa è
successo. **Tutto il resto — il disegno, il wah, l'accordo, il neon, il logo, le manopole —
sta in `docs/snake.md`.**

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché. **E i commit visibili si pushano senza chiederlo**: lui guarda l'app
  pubblicata, non quella che gira qui.
- **All'utente si dice cosa è successo e cosa cambia per lui**, non il racconto dei passi e
  dei byte: quello va in `docs/`. Le istruzioni passo passo funzionano, i ragionamenti
  lunghi in mezzo no.
- **Per provare in locale servono preset finti**: `file://` e `localhost` non hanno la
  libreria dell'utente (altra origine, altro IndexedDB). Si popolano da console con
  `store.importFromAmp([...])` e `{uuid, name, effects, slot}` inventati.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate. **Ma pesa a ogni sessione**: quello che serve solo se si riapre un capitolo va
  in `docs/`, con un rimando qui. La regola per cosa resta: **tutto ciò che mi impedisce di
  fare danni o di ripercorrere una strada chiusa**. Il racconto di *come* ci si è arrivati
  va in `docs/`, sempre.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI. **L'inglese ci sarà, ma non adesso** — deciso il 26
  agosto 2026 dopo aver misurato: sono **~270 stringhe** (169 nel JS, 87 nel corpo HTML,
  12 fra `title` e `placeholder`), e **93 sono messaggi di log**, cioè prosa che spiega il
  comportamento e che quindi si riscrive ogni volta che il comportamento cambia.
  Tradurre adesso vuol dire tradurre due volte e rendere doppia ogni modifica alla UI;
  aspettare non accumula debito, perché i messaggi sono già frasi intere con i valori
  dentro e non pezzi cuciti insieme. Il momento è **quando Preset, Live ed editor smettono
  di cambiare forma** — non «a progetto finito», che il pedale può andare avanti senza
  toccare una riga di testo dell'app. Allora: `src/lingua.js` con due dizionari e una
  `t()`, `data-t` sugli elementi statici, nessuna libreria e nessun build step. L'utente ha
  detto «non c'è fretta»: è per sé, non per pubblicarla ad altri.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.

## Il sync con Dropbox — in tre righe

Funziona e l'ha verificato l'utente il 24 agosto 2026. Serve perché `file://` e `https://`
sono due origini con due IndexedDB diversi. **Niente server**: OAuth **PKCE senza redirect**,
col codice da incollare a mano — accettato da Dropbox, verificato. Backup alla **versione 2**:
porta anche i banchi (per UUID, che si ritraducono all'arrivo) e le **lapidi** delle
cancellazioni, che però **non vincono sempre** — un preset toccato dopo la data resta dov'è,
perché fra perdere lavoro e tenersi un preset di troppo la regola della libreria è chiara.
Il primo passo è dell'utente e va fatto una volta per apparecchio: registrare l'app su
dropbox.com/developers e incollare l'app key nel pannello «Altro». Tutto il resto — le
trappole del rientro, il verifier che si riusa, i 34 test contro un fetch finto — è in
`docs/dropbox.md`.

## Il sito di presentazione — fuori da questo repo

Dal **27 agosto 2026** c'è una vetrina su **`sparklingtones.com`**, e **non sta qui**:
`C:\Users\massi\sparklingtones-sito`, repo `mazzrelaz/sparklingtones-sito`. Un solo
`index.html`, font e logo copiati dall'app, nessuna dipendenza.

**L'app non si è spostata**, e la ragione è la trappola da ricordare: **un dominio custom
su GitHub Pages vale per l'intero repo**. Messo su `SparklingTones` avrebbe portato via
anche l'app, e con lei la PWA installata sul telefono e l'IndexedDB della libreria — altra
origine, altro database. Quindi repo separato, e il sito ci manda con dei link.

DNS su register.it: quattro record `A` agli IP di GitHub (`185.199.108-111.153`) più il
`CNAME` del `www`; il dominio lo dichiara il file `CNAME` dentro il repo del sito. Attivo e
verificato, https compreso.

**I video non ci sono ancora**: i blocchi `<video>` sono in `index.html` **commentati**, e
`media/LEGGIMI.md` dice quali servono e come registrarli. Se l'utente dice «il video», è
quello. **Capitolo in stand by** per sua richiesta, il 27 agosto 2026.

Non fatto perché è la facciata pubblica e la decide lui: il `README.md` dell'app punta
ancora solo a `github.io`, senza il link al sito. La domanda gli è stata fatta e non ha
risposto.

## Dove si riprende — 29 agosto 2026

Guscio `v73` (sta in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi:
protocol 139, transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto
da nessuna suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto.

**Il racconto delle sessioni sta in `docs/diario.md`** — cosa è successo il 26, 27 e 28
agosto e perché. Qui resta solo quello che è ancora da fare.

**Il 29 agosto non ha toccato l'app**: è andato tutto sul pedale. La scheda passa dalla C6
alla **XIAO ESP32-S3**, che l'utente ha ordinato, perché è l'unica che può fare la modalità
MIDI; la **scatola sarà di legno**; l'antenna è il **foglietto di serie, dentro**. Dettagli
nella sezione «Il pedale ESP32» e in `docs/pedale.md`.

Da fare:

1. **Il tap tempo con l'ampli acceso.** `0x0176` è verificato dalla sonda ma **non
   dall'app**: aprire l'editor, battere il tap, e sentire se il tempo cambia *e* se il delay
   ci va dentro. `tools/looper-probe.html`, sezione «5 — Il tempo», fa lo stesso a mano.
2. **Provare editor e vestito con l'ampli acceso, e sul telefono.** Girare un pomello e
   sentire se il suono segue, cambiare un modello, salvare e riscrivere. Se qualcosa non
   torna il primo sospetto sono i comandi, non il disegno. Sul telefono contano le tendine
   nostre e i LED delle famiglie sui pulsantoni live: le mie prove sono su schermo largo.
3. **Provare che l'ampli non si pianta più girando le manopole.** L'invio dei parametri è
   autocadenzato ma **la correzione non è verificata**. Se ricapita: prima `PAUSA_PARAMETRO`,
   poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale: le mie prove sono contro un
   preset ricostruito a mano. Se non entra, il posto da guardare è `trovaPresetUfficiali`, e
   la cosa da chiedere sono **i primi byte del file**, non l'estensione.
5. **Il pedale, quando arrivano i pezzi**, in quest'ordine: display con quattro cavetti, e
   vedere se scrive; poi l'espansore con **un pulsante solo**, per sapere se l'I²C legge; poi
   il firmware, che è tutto software. Il porting da C3 a S3 dovrebbe essere di peso, ma
   **tempi BLE e autonomia vanno rimisurati**. Il primo lavoro fisico che farà l'utente è
   **il foro per i LED del TP4056**, e vuole il modulo in mano prima di disegnarlo.
6. **Il pedale non ricorda quale banco stava suonando**: al riavvio carica il primo che
   trova. Va fatto insieme ai tasti banco veri, che sono la stessa funzione vista da due lati.
7. **Il looper sul pedale, col conteggio fatto in casa.** Il protocollo è tutto lì e
   verificato; manca il firmware. Il conteggio col click **non si comanda** (vedi
   «Protocollo»), quindi lo produce il pedale: legge il bpm, conta quattro tempi lampeggiando
   un LED — o con un buzzer — e **40 ms prima dell'uno** manda `0x0175` con `04`, che registra
   all'istante. Quei 40 ms sono il tempo di volo misurato. Il tempo si può anche **scrivere**
   (`0x0176`), quindi il pedale può avere il suo tap tempo. In Signal Detection Mode (click
   spento) il conteggio non serve: parte al primo suono di chitarra.
8. **Togliere dal catalogo altri modelli che l'ampli non ha.** `TrebleBooster` l'ha trovato
   l'utente; l'elenco viene da Soundshed e non è verificato. La tendina mette per primi i
   modelli visti sull'ampli, quindi il prossimo si trova più in fretta.

**Discusso e non aperto: il pedale in modalità MIDI** (29 agosto 2026), per comandare
AmpliTube sul PC con lo stesso pedale. Hardware invariato, cambia solo cosa parte alla
pressione; si commuta col **primo e l'ultimo footswitch insieme**. Tre cose misurate quel
giorno, da non ripercorrere: **Windows non sa fare BLE-MIDI** (nemmeno col nuovo Windows MIDI
Services, dov'è in backlog) e vuole per forza un programma ponte di terzi — ma la scheda
funziona, Windows ci si collega e le legge dentro il servizio MIDI; **la C6 non può fare
USB-MIDI** e **l'S3 sì**, ed è per questo che si cambia scheda; lo strumento della prova è
**`pedale/prova-midi/`**. Due trappole d'ambiente valide sempre: **PowerShell 5.1 non può
sottoscrivere eventi WinRT** (le `…Async` invece si aspettano con `AsTask`) e
**`Pairing.CanPair` da `FindAllAsync` è `False` per tutti**, quindi non dice niente. Il resto
in `docs/pedale.md`, «Modalità MIDI».

**Discusso e non aperto: creare un preset con l'AI** («voglio il suono dell'assolo di Gilmour
in Mother»). L'utente ha chiesto solo di ragionarci. Il punto: il vocabolario dei modelli non
lo può scegliere l'AI — un nome che l'ampli non ha è il comando che lo pianta — quindi glielo
si dà ristretto a `modelliVisti()`, lo scheletro si prende da un preset uscito dall'ampli, e
il risultato si prova **solo sul buffer `0x7f`**, mai in uno slot. Serve una API key
dell'utente, e sarebbe la prima funzione dell'app che non funziona offline. L'AI non sente:
dà un punto di partenza, non un suono finito.

**Non aperto, e va bene così:** il trasferimento di un banco al pedale che costa ~6 s —
funziona, si può accorciare, ma è ottimizzazione.
