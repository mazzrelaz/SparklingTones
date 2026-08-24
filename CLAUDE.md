# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32
in `pedale/`.

**In pausa dal 18 agosto 2026**, per mancanza di tempo dell'utente — non perché
qualcosa sia rotto. L'app è pubblicata e funziona; il pedale funziona su una devkit
e aspetta i componenti da comprare. `README.md` racconta il progetto a chi arriva da
fuori. **Dove si riprende** è in fondo a questo file.

## Dove sta il resto di questa memoria

`CLAUDE.md` entra intero in contesto a **ogni** sessione, quindi qui resta solo quello
che serve sempre: le trappole che mi fanno rompere qualcosa, le regole che governano il
progetto, e il lavoro in corso. Il ragionamento dietro le scelte già fatte sta in `docs/`
e **va letto solo quando si rimette in discussione quella cosa lì**:

| file | quando aprirlo |
|---|---|
| `docs/protocollo-spark2.md` | si tocca il protocollo, l'encoder, la scrittura dei preset |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |

Snellito il 14 agosto 2026: era 27.700 token, di cui 6.100 di indagine chiusa.

## Struttura

```
README.md                presentazione del progetto per chi arriva da GitHub
index.html               tutta l'app: sezione Preset e sezione Live, nello stesso documento
live.html                rimando a index.html#live, per le scorciatoie già installate
manifest.webmanifest     identità della PWA
sw.js                    service worker: guscio in cache, app utilizzabile offline
icons/logo.svg           logotipo orizzontale dell'utente; logo-mark.svg è il solo simbolo
LICENSE / NOTICE         MIT, Massimo Togni; software di terzi (Soundshed MIT, paulhamsh Apache 2.0)
src/spark-protocol.js    encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js   connessione BLE, coda di invio, attesa risposte, lettura preset
src/preset-store.js      libreria su IndexedDB, import dall'ampli, backup, banchi, categorie
src/spark-effetti.js     nomi di effetti e manopole + elenco modelli, dal catalogo Soundshed
src/spark-backup.js      legge preset_backup.zip dell'app ufficiale, senza librerie
src/pwa.js               registra il service worker, «installa» e «versione nuova»
pedale/                  firmware ESP32 (appena cominciato)
pedale/prova-ble/        firmware di prova: si collega, cambia preset, ne manda uno intero
pedale/prova-usb/        sketch che non fa niente, per isolare i guai di USB/alimentazione
tools/pedale-sim.html    la faccia del pedale in una pagina, con dentro la logica vera
tools/frames-pedale.html genera i frame preserializzati per il firmware (preset_frames.h)
tools/serve.ps1          server statico su localhost, per provare la PWA
tools/make-icons.ps1     rigenera le icone di icons/
tools/leggi-btsnoop.ps1  legge uno snoop log HCI di Android e ne tira fuori i nostri messaggi
tools/reader.html        legge la libreria dall'ampli e la esporta in JSON
tools/write-probe.html   prova le varianti di 0x0101 e verifica da sé rileggendo
tools/model-probe.html   idem per 0x0106
tools/looper-probe.html  ascolta l'ampli mentre si usa il looper e prova i comandi noti
tools/explorer.html      tool diagnostico, congelato — single-file, apribile da Android
test/protocol-test.html  125 test del protocollo contro catture reali
test/transport-test.html 48 test del trasporto, con send finto e catture reali
test/store-test.html     99 test della libreria, su un database temporaneo
test/backup-test.html    33 test del lettore zip e della conversione dal formato ufficiale
test/fixtures/preset0.js catture condivise fra le suite
design/proposte-preset.html  le tre proposte grafiche a confronto, non è l'app
docs/                    vedi tabella qui sopra
reference/paulhamsh/     sorgenti di riferimento (ESP32 + Python), BLE funzionante
captures/                log grezzi dall'ampli
```

Niente build step, niente server: tutto si apre da `file://`. Per questo i moduli sono
classic script che espongono `window.Spark` e `window.SparkTransport` invece di ES module,
che su `file://` sono bloccati dal CORS.

IndexedDB funziona da `file://` su Chrome desktop (verificato). Attenzione però: su
`file://` tutte le pagine condividono la stessa origine opaca, quindi non c'è isolamento
fra i database, e il browser può ripulirli più facilmente. **Passando da `file://` a https
la libreria non viene dietro**: è un'altra origine, quindi un altro IndexedDB. Va esportata
in JSON e reimportata.

`tools/explorer.html` contiene una copia propria del codice di protocollo, perché deve
restare single-file per essere copiato sul telefono. È **congelato**: le modifiche vanno
in `src/`, non lì.

## Trappole dell'ambiente

**Mai riscrivere un file di questo progetto con `Get-Content`/`Set-Content` di PowerShell
5.1.** Senza BOM, `Get-Content` decodifica l'UTF-8 come ANSI e `Set-Content -Encoding UTF8`
lo riscrive doppiamente codificato: ogni accento e ogni «—» diventano `Ã ` e `â€"`, in
tutto il file, in silenzio. **Ci sono ricascato il 14 agosto 2026 su `sw.js`**, con un
`-replace` di una riga sola per alzare la versione: basta quello. Rimediato con
`git checkout -- sw.js` e rifatto con l'editor — se il file è già committato quella è la
via più corta. Successo anche il 13 agosto su `index.html`, `live.html` e `pwa.js` facendo
un replace di colori, visto solo da uno screenshot («cerca un presetâ€¦»). Le modifiche
vanno fatte con gli strumenti di edit, o in .NET con l'encoding esplicito. Se ricapita: si
rilegge il file come UTF-8, si toglie l'eventuale `﻿` iniziale e si riscrivono i byte
convertendo la stringa in **CP1252** — è la trasformazione inversa.

**Dopo ogni modifica a `src/`, apri le pagine in `test/` e verifica che il riepilogo sia
verde.** Girano contro catture reali dell'ampli, quindi intercettano una regressione nella
codifica senza avere l'hardware a portata.

**Le suite girano anche senza aprire un browser**, con Edge headless:

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/spark/test/protocol-test.html'
```

Poi si cerca `id="summary"` nel DOM stampato. Funziona per protocol, transport e backup.
**Su `store-test.html` no**: con il tempo virtuale IndexedDB non avanza e la pagina resta
a «esecuzione…» — non è un test rotto, è l'ambiente. Quella va aperta in un browser vero.

**In una scheda in secondo piano i timer vengono strozzati**, e una suite che ci mette un
secondo sembra piantata a metà per minuti. Basta portare la scheda in primo piano.

**Lo stdout di Edge headless non torna alla shell** (14 agosto 2026): catturarlo con
`$out = & msedge …` dà **stringa vuota**, anche su una pagina che funziona, e sembra che
la pagina non abbia prodotto niente. Va redirezionato su file:
`Start-Process … -RedirectStandardOutput $file -NoNewWindow -Wait`, poi
`[IO.File]::ReadAllText($file)`. Vale sia per `--dump-dom` sia per `--screenshot`.

**L'ESP32 si programma e si legge dalla mia shell**, senza passare dall'IDE: l'Arduino IDE
porta con sé `arduino-cli` in
`%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`,
e la seriale si legge con `System.IO.Ports.SerialPort` da PowerShell. Tre trappole pagate
il 14 agosto 2026:

- **`CDCOnBoot=default` vuol dire *Disabled*, ed è il valore di fabbrica.** Con quella la
  `Serial` esce dai pin 20/21 e il monitor sull'USB resta muto: sembra che lo sketch non
  parta. Va compilato con `--fqbn esp32:esp32:esp32c3:CDCOnBoot=cdc`. Il segno che
  l'impostazione **non** è cambiata è `No changed sectors found` nel log di caricamento:
  se i flag fossero cambiati il binario sarebbe diverso.
- **Aprire la porta seriale resetta il chip**, perché sull'USB nativo del C3 DTR/RTS
  pilotano reset e boot. `DtrEnable=$false, RtsEnable=$false` per leggere senza toccare
  niente; con `RTS=$true` il chip riparte **in download mode** e non esegue lo sketch.
- **Da download mode non si esce via software.** Se il chip resta a `waiting for download`,
  nemmeno `esptool --after hard-reset` lo tira fuori: serve staccare e riattaccare il cavo
  a mano. Il messaggio che distingue i due casi è `boot:0x5 (DOWNLOAD)` contro
  `boot:0xd (SPI_FAST_FLASH_BOOT)`.

**Il riquadro di anteprima non serve a provare questo progetto.** Carica i `file://` come
`data:`, quindi i `<script src="../src/…">` non partono e si vede solo il guscio; e
`localhost` è bloccato da policy, quindi nemmeno `serve.ps1` lo raggiunge. Per vedere una
pagina che *gira* si usa Edge headless con `--screenshot` e la si legge come immagine.

**I messaggi di commit vanno passati per file, non per here-string.** `git commit -m @'…'@`
in PowerShell 5.1 si rompe in silenzio se il testo contiene virgolette doppie o certe
sequenze: la here-string non parte, il testo viene spezzato in parole e git risponde
`pathspec '…' did not match any file(s)`. E il sandbox rifiuta la riga se ci trova un
`e:` o simili, leggendolo come percorso di disco. Si scrive il messaggio con lo strumento
di Write nello scratchpad e poi
`git -c i18n.commitEncoding=UTF-8 commit -F <file>` — così **si possono anche usare gli
accenti**, che con la here-string andavano evitati.

Il push non parte dalla mia shell, che è non interattiva: Git Credential Manager non
riesce a chiedere le credenziali e git muore con *terminal prompts disabled*. Funziona
con `GIT_TERMINAL_PROMPT=1`, `GCM_INTERACTIVE=true` e `GCM_GUI_PROMPT=true`, che gli fanno
aprire la finestra grafica sul desktop dell'utente.

## Le regole che governano l'app

**La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, famiglia e ordine. È il
comportamento più importante di `preset-store.js` ed è coperto da test.

**Preset e Live stanno nello stesso file, e non si separano.** La connessione BLE vive nel
documento: finché erano due pagine, passare da libreria a live era una navigazione e
all'ampli toccava riconnettersi a mano. Nessuna API lo evita. Dal 12 agosto 2026 le due
viste sono in `index.html` e si scambiano cambiando una classe sul `body`, quindi `spark`
resta lo stesso oggetto. **Verificato sull'hardware**: con l'ampli connesso si passa avanti
e indietro e la connessione non cade; prima cadeva a ogni passaggio.

Il passaggio è sull'hash (`#live` / `#preset`) e non su una variabile: così il tasto
indietro di Android torna ai preset invece di chiudere l'app.

**Attenzione toccando il CSS: le due sezioni condividono un solo `<style>`.** Le regole dei
preset vanno sotto `body:not(.vista-live)` e quelle live sotto `body.vista-live`, comprese
le variabili di colore — la vista live è più scura — e la media query del telefono.

### Sezione Preset

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, con l'etichetta
A1…B4 e i colori dei LED (rosso il banco A, verde il B). Tutti gli altri stanno sotto. Un
preset non compare mai in tutti e due i posti.

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

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che
governa tutto il resto. Per questo «Regola» prima manda il preset all'ampli con
`loadPreset`, e solo dopo apre il pannello.

Lo stato di partenza si rilegge **dall'ampli** (`readLiveState`), non dalla libreria: se
l'utente ha girato una manopola vera o ha usato l'app ufficiale, la verità è lì. Se la
rilettura fallisce l'editor non si apre — meglio niente che manopole che partono da valori
inventati. Niente viene salvato finché non si preme **Salva in libreria**.

**Le sette posizioni sono etichettate per categoria** (`Spark.CATENA`): noise gate,
compressore, drive, ampli, modulazione, delay, riverbero.

**Il cursore va strozzato, e lo strozzamento dev'essere autocadenzato.** Un trascinamento
genera decine di eventi al secondo e ogni comando è una scrittura BLE.
**`writeWithoutResponse` non ha controllo di flusso**: la promessa si risolve quando il
sistema ha preso in carico la scrittura, non quando l'ampli l'ha ricevuta, quindi l'app
può correre più della radio. **È la causa più probabile dell'ampli che si pianta girando
le manopole**, segnalato dall'utente il 16 agosto 2026.

Quindi il prossimo invio parte **quando il precedente è finito**, più `PAUSA_PARAMETRO`
(90 ms), e non su un timer: così la coda non può crescere qualunque cosa faccia il dito.
La versione a timer da 60 ms poteva **sovrapporsi a sé stessa** — `svuotaCoda` azzerava
`timerInvio` prima di aspettare gli invii — e accumulava arretrato. Si tiene solo
l'ultimo valore per manopola, e l'ultimo parte sempre.

**Non è verificato che risolva**: il blocco non si riproduce a comando, quindi la prova è
usarlo. Se ricapita, la manopola da girare è `PAUSA_PARAMETRO`, e poi `SEND_GAP_MS` in
`spark-transport.js` (30 ms, che è più svelto di un intervallo di connessione).

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, e `logLine`/
`logProgress` ci scrivono l'ultimo messaggio: un pannello a tutto schermo copre il log, e
senza quello un comando fallito è indistinguibile da un comando che non fa niente.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), non da Positive Grid, quindi restano
**proposte**: si vedono *in corsivo*, un nome scritto a mano vince sempre, e `manopola()`
**scarta l'intera riga** se dichiara più manopole di quante l'ampli ne manda per
quell'effetto.

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto.** Su un ampli
le manopole si leggono Gain, Bass, Middle, Treble, Master, ma negli indici stanno
`Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Trascrivendo dall'interfaccia si
sbagliava in silenzio. Due test fissano questo caso e quello di LA Comp.

Il campo `quante` dice **quante manopole ha davvero l'effetto**: può essere più dei nomi
che sappiamo e meno dei parametri che arrivano. I parametri in eccesso sono
**l'acceso/spento del blocco** (misurato, vedi `docs/protocollo-spark2.md`).

**I nomi dei parametri li dà l'utente**, girando e ascoltando: l'ampli manda solo indici e
non esiste nessuna tabella da cui dedurli. Sono salvati **per modello di effetto**
(`settings.nomiParametri`), non per preset. `exportAll` li porta con sé e `importBackup` li
**aggiunge** invece di sovrascrivere: reimportare un backup vecchio non deve cancellare i
battesimi fatti da allora.

**L'elenco dei modelli (`MODELLI`) non è verificato, e un nome sbagliato fa danni.**
Viene dal catalogo di Soundshed: se l'ampli quel modello non ce l'ha, `0x0106` gli chiede
di **ricostruire un blocco DSP che non esiste** — che è il comando più pesante che gli
mandiamo. **`TrebleBooster` mandava in palla l'ampli** (segnalato il 18 agosto 2026: sullo
Spark 2 c'è solo `Booster`), ed è stato tolto. Resta nella `TABELLA` dei nomi, che è
innocua: serve solo a dare un nome alle manopole se un preset importato da altrove lo
contenesse.

**Non si può chiedere all'ampli quali modelli conosce.** L'unica prova che abbiamo è che
un modello **compaia in un preset uscito dall'ampli**: allora esiste di sicuro. Per questo
la tendina dell'editor divide in due gruppi, «sul tuo ampli» e «dal catalogo, da provare»
(`modelliVisti()` in `index.html`). Quando se ne trova un altro che non esiste, si toglie
da `MODELLI`.

## Protocollo — quello che non va dimenticato mai

Dettaglio, derivazioni e misure: `docs/protocollo-spark2.md`.

GATT: service `0xFFC0`, write `0xFFC1` (**writeWithoutResponse only**), notify `0xFFC2`.
Notifiche frammentate: riassemblare cercando `F0` … `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`.

Stato: **completo e verificato sull'ampli**. `0x0201` lettura, `0x0138` cambio preset,
`0x0115` effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset intero.

**Le trappole, tutte verificate sull'hardware:**

- **`0x0115`, `0x0104` e `0x0106` vogliono un byte `0x00` in coda al payload logico.**
  Senza, ack regolare e comando non applicato. `0x0138` e `0x0175` no.
- **L'ack conferma la ricezione, non l'esecuzione.** E `writeWithoutResponse` fa sembrare
  riuscita ogni scrittura lato browser. **L'assenza di errori non è una verifica**: vale
  solo l'effetto sull'ampli o una risposta in RX.
- **Chunk da 25 byte di payload, non 128.** Con 128 lo Spark 2 **si disconnette**. Il
  massimo verificato in scrittura è 44.
- **Tutti i chunk di un preset vanno con lo stesso sequence number.**
- **`0x0127` non salva sullo Spark 2**, in tutte e quattro le forme provate. Tolto dal
  codice.
- **Le write BLE lunghe vanno spezzate**: l'app ufficiale manda ogni messaggio in write ATT
  da 20 byte e l'ampli riassembla da sé. `transport.sendSpezzato(comando, 20)`. Sopra i
  ~44 byte una write singola sparisce **in silenzio**, senza nemmeno l'ack.
- **Cambiare un parametro di un effetto spento non produce nessun suono.** Trappola già
  pagata: verifica prima che l'effetto sia attivo.
- **`0x0106` vuole il nome del modello che c'è *adesso***, riletto dall'ampli, non quello
  che ha sullo schermo. Se sbagliato, l'ampli ignora tutto senza fiatare — e da lì in poi
  ogni cambio fallisce per sempre.
- **L'ampli si può piantare davvero**, e allora serve staccare la corrente. `rxTotali`
  distingue i due casi: 0 messaggi = ampli muto o connessione morta; più di 0 = parla e
  siamo noi a scartare. Senza quel numero i due casi si vedono uguali — è costato una
  serata.

**Le due strade per scrivere un preset sono diverse**, e questo è costato mezza giornata:

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

Il giro via e ritorno non è decorazione: senza, lo slot riporta il contenuto vecchio.
`loadPreset` non sovrascrive nessuno slot: è il modo sicuro di provare un preset.
**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot —
non è un malfunzionamento.

**Lo Spark 2 ha 8 slot, 0–7** (il 0–3 della documentazione vale per lo Spark 40), ma il
pannello ha **4 LED bicolore**: rosso banco A (0–3), verde banco B (4–7).
`Spark.slotLabel(n)` fa la conversione e la UI mostra A1…B4.

Nessuna autenticazione è richiesta: la license key `0x0170` non è mai stata inviata (ma
vale per i comandi che usiamo — vedi `docs/looper.md`).

### Looper — in due righe

Si comanda con `0x0175` e un byte: `04` rec, `05` stop rec, `08` play, `09` stop, `0b`
dub, `0c` stop dub, `0a` delete. Si legge la posizione nel loop (`0x0377`), il bpm
(`0x0363`) e le impostazioni (`0x0376`). **Manca solo la battuta di conteggio col click**:
`02` riceve l'ack e non fa niente, in ogni forma provata. Capitolo **archiviato**, tutto
in `docs/looper.md` — e lì c'è già tutto quello che è stato escluso, quindi non si
ricomincia dalle sonde.

### Regole di metodo, che valgono oltre il looper

- **Una cattura d'ascolto dice cosa l'ampli racconta, non cosa accetta.** I nomi degli
  enum di terzi descrivono lo *stato in cui l'ampli è entrato*, non un tasto da premere:
  che il pannello notifichi `02` non vuol dire che `02` si possa mandare. Le due direzioni
  vanno misurate separatamente.
- **Si registra prima e si interpreta dopo, mai il contrario.** Una sonda che chiede di
  dichiarare in anticipo cosa si sta per fare produce log che mentono appena l'ampli fa
  altro. Le sonde raggruppano da sole per pause e l'etichetta si sceglie dopo.
- **I dati finti non devono finire in una cattura.** Sono marcati `demo`, non contano negli
  RX totali e l'esportazione li scarta.
- Ogni prova va verificata **rileggendo dall'ampli**, una variante alla volta.

## Il pedale ESP32

Deciso il 14 agosto 2026: l'utente ha fermato lo sviluppo dell'app e vuole partire con
l'ESP32. **Sta in questo repo, in `pedale/`**, perché la conoscenza del protocollo è qui e
sarebbe l'unica cosa che due repo farebbero divergere; le catture in `captures/` e
`test/fixtures/` sono il suo banco di prova; e **l'interfaccia app↔pedale è un contratto
fra i due**, un commit solo deve poter cambiare tutte e due le sponde. Il build step del
firmware non tocca la web app, che resta senza.

### La forma, dettata dall'utente

Il pedale **si prende i preset dall'app** e poi è autonomo con lo Spark; dentro ha dei
**blocchi selezionabili col piede**, ogni blocco coi suoi preset che spara diretti
sull'ampli; **nessuna regolazione, solo preset**; e poi il looper. È la vista live del web,
staccata dal telefono — non un secondo editor.

**Hardware, deciso il 15 agosto 2026 — cinque footswitch, non otto.** L'utente ha ridotto:
otto footswitch fanno un pedale enorme e otto suoni sempre disponibili non gli servono.

- **quattro footswitch** = i quattro suoni della metà corrente;
- **un quinto footswitch, staccato dagli altri**, che **cambia metà senza toccare il
  suono**: i quattro tasti passano a voler dire B1–B4, ma continua a suonare quello di
  prima finché non ne scegli un altro.

  **Prima saltava al gemello** (A2 → B2), per avere l'A/B della coppia strofa/ritornello in
  una pedalata sola. L'utente l'ha provato **col piede nel simulatore il 16 agosto 2026 e
  ha voluto il contrario**: premere il tasto di metà non deve cambiare quello che stai
  suonando. Costa una pedalata in più per la coppia, ma nessun cambio di suono a sorpresa —
  e sul palco la sorpresa è il difetto peggiore. **È la decisione che il simulatore esiste
  per far prendere**: ragionandoci era stata scelta l'altra.

  Ne segue che **quando la metà mostrata non è quella che suona, nessuno dei quattro LED è
  acceso** — ed è giusto, nessuno di quei tasti è il suono che senti. Per questo l'OLED
  tiene in fondo una riga **♪** con quello che sta suonando davvero, che senza sarebbe
  l'unica informazione persa;
- **due tasti a mano** per i banchi, come già deciso.

**Il banco resta da otto**, diviso in due metà da quattro: combacia senza toccare niente
col modello dell'app, dove i banchi sono già disegnati quattro e quattro. La libreria non
cambia di una riga.

**Quattro tasti con LED rosso/verde è il pannello dello Spark**, che ha quattro LED
bicolore, rosso banco A e verde banco B. Il pedale ricostruisce col piede l'interfaccia che
l'ampli ha già.

**Il rischio di questa forma è uno solo: pestare il tasto giusto nella metà sbagliata.**
Per questo **cambiano colore tutti e quattro i LED insieme**, non uno solo: uno stato che
occupa metà del pedale non si confonde. Da giudicare suonando.

**Conseguenza sui pin: l'MCP23017 non serve più.** Cinque footswitch + due tasti = 7
ingressi, e ci stanno tutti sui pin sicuri del C3 (vedi sotto). Resta senza margine per un
*nono* ingresso — pedale d'espressione o tap tempo vorrebbero l'espansore — ma per questo
disegno la schedina basta.

**E il problema del nome tagliato sul display si è sciolto da solo**: con quattro nomi da
mostrare invece di otto, un elenco di quattro righe intere dà ~22 caratteri a testa e
quasi tutti i nomi veri ci stanno.

**Il pedale non tocca mai gli slot hardware** — deciso dall'utente il 14 agosto 2026,
coerente con la regola dei banchi inventati nella vista live. Quindi ogni cambio preset è
`0x0101` verso il buffer `0x7f` + `0x0138` con `0x7f`, ~1 s, e va bene così («non importa
se ci mette un secondo»). Ne segue che **restano solo due comandi**: niente `0x0104`,
`0x0115`, `0x0106`, niente parser dei preset, niente giro via-e-ritorno. E il pedale non
può rovinare quello che c'è sull'ampli, per costruzione.

Conseguenza da ricordare: suonando sempre dal buffer `0x7f`, **il LED del pannello
dell'ampli lampeggia in permanenza**. Non è un difetto.

### Quello che il firmware NON deve rifare

**L'app preserializza.** `serializePreset` produce già il payload esatto e `buildChunk` il
frame `f0 01 <seq> <checksum> … f7`: il pedale riceve **frame già pronti** e li scrive tali
e quali. **Il seq si può correggere sul posto** — sta all'indice 2 e il checksum è un XOR
dei soli byte impacchettati (`spark-protocol.js:220-222`), quindi **non lo copre**: il
pedale patcha un byte e non ricalcola niente. Il porting non è «l'encoder in C++»: è **una
coda BLE e un patch di un byte**. L'encoder resta uno solo, in JS, coperto da 87 test.

### Pin del C3 mini — verificato sui datasheet, non ancora sul rame

Il C3 espone **0–10, 20, 21** (11–17 sono la flash, 18/19 l'USB nativo che serve per
programmare e per il log). **Strapping: 2, 8, 9** — un footswitch su uno di quelli, tenuto
premuto all'accensione, impedisce l'avvio (il 9 è il BOOT). Pin sicuri per uno switch:
`0, 1, 3, 4, 5, 6, 7, 10, 20, 21` — dieci.

| cosa | pin |
|---|---|
| MCP23017 in I²C — ci vanno i 5 footswitch + i 2 tasti banco | `20`, `21` |
| display SSD1322 in SPI (SCK, MOSI, CS, DC, RST) | `0, 1, 3, 4, 5` |
| dati WS2812 | `6` |
| liberi | `7`, `10`, più `2`, `8`, `9` come sole uscite (strapping) |

Gli interruttori vanno **sull'espansore**, non sui pin del C3: sono ingressi lenti, e
l'MCP23017 ha i pull-up interni e un piedino di interrupt. Sui pin diretti restano le cose
che hanno bisogno di velocità o di temporizzazione — il display e i LED.

**LED: striscia WS2812, non discreti.** Un pin solo, e sono RGB, quindi fanno rosso metà A
/ verde metà B — la convenzione del pannello dell'ampli. Luminosità bassa (20–30 su 255):
a bianco pieno sono ~480 mA e il regolatore della schedina non li regge.

**Otto pin su dieci, e due di avanzo** — più sedici ingressi sull'espansore, di cui ne
usiamo sette. Il margine per un pedale d'espressione o un tap tempo adesso c'è.

#### Il formato del display — deciso il 16 agosto 2026: 256×64

**Il problema non è l'altezza, è la larghezza.** Su 128 pixel quattro colonne fanno 28 px
l'una, cioè **cinque caratteri**. E conta più della risoluzione **la dimensione fisica del
vetro**: il display sta per terra e lo si guarda da un metro e mezzo, di sbieco. Un
128×128 da 1,5" è **27 × 27 mm**, con lettere alte due millimetri.

| | vetro | per colonna |
|---|---|---|
| 1,5" 128×128 (SSD1327, I²C) | 27 × 27 mm | 5 caratteri |
| 2,42" 128×64 (SSD1309, I²C) | 54 × 27 mm | 5 caratteri |
| **3,12" 256×64 (SSD1322, SPI)** | **72 × 18 mm** | **13 caratteri** |

**Scelto il 256×64**, guardando i tre nel simulatore: il rapporto 4:1 è esattamente la
forma delle quattro colonne, e i nomi ci stanno. Costa 15–20 €.

Il 2,42" è la conferma del ragionamento: **vetro doppio e non guadagna un carattere**,
perché resta largo 128 pixel. Serviva più larghezza, non meno altezza.

**Il prezzo è sui pin: l'SSD1322 va in SPI e vuole cinque pin.** Torna quindi
l'**MCP23017**, tolto passando a cinque footswitch — vedi la tabella qui sopra. Non è un
ripensamento: con quel display serve, senza no.

`tools/pedale-sim.html` disegna tutti e tre i formati **alla stessa scala fisica** (7 px
per mm), che è l'unico modo di confrontarli onestamente: a parità di dimensione sullo
schermo il 128×128 sembra ottimo.

### Da misurare, in ordine

1. ~~L'intervallo di connessione BLE.~~ **Misurato il 14 agosto 2026 sull'hardware, vedi
   sotto: confermato, e il pedale è quasi due volte più svelto del telefono.**
2. **Se si può abortire un trasferimento a metà** per far vincere l'ultima pressione.
   Sul buffer `0x7f` un mezzo preset è innocuo, ma che l'ampli scarti il troncone quando
   arriva un seq nuovo **non è verificato**. Finché non lo è: la pressione durante un
   caricamento si mette in coda, non annulla.
3. Una **devkit da otto euro** che si collega e cambia preset, senza saldare niente.
4. **Lo schermo che si spegne** sul telefono ferma BLE e timer (Wake Lock API) — vale se
   si torna sul ponte via browser.

### Il C3 parla con lo Spark — verificato sull'hardware il 14 agosto 2026

**Un ESP32-C3 mini nudo, senza un solo pin collegato, si collega allo Spark 2 e gli cambia
preset.** `pedale/prova-ble/`, comandato dal monitor seriale. `trovato: Spark 2 BLE
[f0:9e:9e:10:5a:62]`, MTU 256, e ogni `0x0138` risponde `0x0438`.

**L'ipotesi dell'intervallo di connessione è confermata, con i numeri:**

| intervallo chiesto | giro di andata e ritorno | × 16 chunk = un preset |
|---|---|---|
| di sistema | 75,5 ms | ~1,2 s — è il secondo del telefono |
| 30–50 ms | 88,8 ms (79–129) | ~1420 ms |
| 15 ms secco | 37,5 ms (24–44) | ~600 ms |
| **7,5 ms secco** | **24,8 ms (21–29)** | **~400 ms** |

Quindi il secondo **non è banda, sono sedici round-trip**, e sull'ESP32 si accorcia:
`client->updateConnParams(min, max, 0, 400)` (unità da 1,25 ms, timeout da 10 ms).
Web Bluetooth non lo lascia toccare, ed è tutta la differenza. **Il pedale è tre volte più
svelto del telefono.**

Due cose imparate misurando, che valgono la prossima volta:

- **L'ampli sceglie dentro l'intervallo chiesto e prende il massimo**: `6-12` ha dato ~15
  ms, non 7,5. Si chiede **secco**, min uguale a max.
- **La dispersione è il termometro**: a 30 ms i giri vanno da 79 a 129, a 7,5 ms da 21 a
  29. Se la forbice resta larga la richiesta non è stata accolta, anche se la media scende.

**E il preset vero è stato mandato**, non più stimato — 15 chunk, `0x0101` sul buffer
`0x7f` più `0x0138`, **15 ack su 15, zero persi**, tre volte di fila:

| intervallo | preset intero, misurato |
|---|---|
| di sistema | **1246 ms** |
| 7,5 ms secco | **326 ms**, e 327 alla ripetizione |

**A regime è ancora meglio: 178–215 ms**, misurato su cinque preset di fila. Il primo dopo
la connessione è più lento (~370 ms) perché l'intervallo corto entra in vigore con un po'
di ritardo. Quindi **il pedale carica un preset in un quinto di secondo**, contro il
secondo abbondante del telefono.

**Il tempo dipende da quanto è lungo il preset**, non è fisso: ~25 ms per chunk, e i chunk
vanno da 15 a 18 nel banco di prova.

**Difetto trovato col dito, non ragionando: durante il trasferimento il firmware è in un
ciclo di attesa e non legge il tasto**, quindi ogni pressione in quei ~200–400 ms si perde
e da fuori sembra che il pedale abbia smesso di rispondere. Costava tre pressioni svelte
per vederlo. Il tasto va letto **anche dentro l'attesa degli ack**, e la pressione si
accoda: **vince l'ultima**, premere tre volte in fretta carica il terzo preset e non tutti
e tre in fila. Conferma la scelta già fatta nel simulatore («si accoda, non annulla»), ed
è la ragione per cui il pedale vero non deve avere attese bloccanti che non guardino gli
ingressi.

#### Il tasto che perdeva colpi — risolto il 15 agosto 2026, ed era colpa mia

**Il tastino non c'entrava niente.** Con la strumentazione accesa: **14 fronti grezzi per
7 pressioni**, cioè esattamente due a testa — discesa e risalita, **zero rimbalzi** — e
**7 pressioni accettate su 7**, sette cambi preset di fila fra 297 e 414 ms. Il BOOT è un
tattile da schedina ed è pulito.

Era l'**antirimbalzo, scritto nella forma sbagliata**: scartava i cambi troppo vicini
all'ultimo *accettato* invece di aspettare che il segnale stesse *fermo*. Con quella forma
un contatto sporco fa ripartire il conto a ogni rimbalzo e può tenere la porta chiusa a
tempo indeterminato. La forma giusta registra l'ultimo fronte grezzo e accetta il livello
quando è rimasto immobile per `ANTIRIMBALZO`: i rimbalzi allungano l'attesa di qualche
millisecondo invece di annullare la pressione.

Nella stessa passata sono cambiate altre due cose, e **quale delle tre abbia risolto non è
isolato**: il polling è sceso da 10 ms a 2 (una battuta secca su un tattile può durare
pochissimo) e i comandi diretti sono passati da `a`–`h` a `A`–`H`, perché si
sovrapponevano a `c`, `d` ed `e` e «elenca il banco» finiva per caricare un preset.

**Da provare ancora: la raffica col dito.** Le sette pressioni erano a ~5 secondi l'una
dall'altra, e il guasto si vedeva premendo in fretta. Dal seriale la raffica regge
(cinque richieste a 200 ms, tutte servite), dal dito non è ancora verificato.

**La lezione che vale oltre questo caso:** «strumentare prima di ipotizzare» ha chiuso in
una sessione un problema su cui si era tirato a indovinare per due. I contatori — fronti
grezzi contro pressioni accettate — separano da soli tre cause che dall'esterno si vedono
identiche.

**E l'architettura è verificata sull'hardware, non solo ragionata.** Il firmware ha mandato
frame **preserializzati dall'app** (`tools/frames-pedale.html` → `preset_frames.h`)
correggendo **un byte solo**, il seq all'indice 2, senza ricalcolare il checksum. Ha
funzionato al primo colpo. Quindi il porting non è «l'encoder in C++»: l'encoder resta uno
solo, in JS, coperto da 87 test.

**Il core esp32 3.x usa NimBLE sotto `BLEDevice.h`** (i tipi sono `ble_gap_conn_params`,
non i Bluedroid `esp_ble_*`): niente da installare, e il timore sulla RAM del C3 decade —
lo sketch BLE usa **19 KB di globali su 320**. Per questo `esp_gap_ble_api.h` non esiste e
il metodo giusto è `BLEClient::updateConnParams`. Altri due nomi cambiati nel 3.x:
`isAdvertisingService` (non `isAdvertisedServiceUUID`), e `onResult(BLEAdvertisedDevice)`
per valore.

### Il ponte app↔pedale — primo pezzo verificato il 15 agosto 2026

**Un padrone alla volta, per scelta dell'utente**: non serve che il pedale parli con l'app
e con l'ampli insieme. Ci si collega all'app, si chiude l'app, e il pedale torna all'ampli
da solo. Cade così il pezzo più rischioso del disegno — client e server contemporanei.

Il pedale **si annuncia sempre** come `SparkPedale`, anche mentre suona: è l'unico modo
perché l'app lo trovi senza staccargli la corrente. Quando l'app si collega **molla
l'ampli**, quando l'app se ne va **se lo riprende**. Servizio e caratteristiche nostre
(`7a9c0000-…`), protocollo nostro: primo byte il comando, il resto payload. **Non si riusa
il protocollo dello Spark**: i chunk da 25, il packing a 7 bit e il byte `0x00` finale sono
cicatrici dell'ampli, non nostre.

Sonde: `tools/ponte-prova.html` (sponda app) e `tools/pedale-seriale.html` (log del pedale
via Web Serial, che **non resetta la scheda** come fa `System.IO.Ports`).

**Le quattro trappole pagate, tutte misurate:**

- **Mai fare operazioni BLE dentro un callback BLE.** `client->disconnect()` dentro
  `onConnect` e `startAdvertising()` dentro `onDisconnect` bloccavano NimBLE per decine di
  secondi, e il sintomo era il pedale che non tornava più all'ampli. I callback alzano una
  bandiera, il lavoro lo fa il `loop()`.
- **La richiesta dell'intervallo di connessione va ripetuta a connessione matura.** Sulla
  *prima* connessione quella fatta subito dopo `connect()` fa in tempo; su una
  **riconnessione arriva troppo presto e si perde**, e la connessione resta lenta:
  **89–95 ms di giro invece di 26–29, cioè ~1400 ms a preset invece di ~420.** Si chiede
  subito e si ripete dal loop a 600 ms e a 2,5 s. È il difetto che ha fatto sembrare il
  ponte lento quando invece era solo mal parametrato.
- **Un `BLEClient` solo, riusato.** Crearne uno nuovo a ogni riconnessione li accumula e
  NimBLE ne ammette pochi: il pedale smetterebbe di collegarsi dopo mezz'ora d'uso.
- **La pressione del footswitch resta in coda finché l'ampli non c'è**, invece di essere
  buttata via: premendo durante un riaggancio sembrava che il pedale ignorasse il piede.
- **Web Bluetooth ammette una sola operazione GATT alla volta per dispositivo.** Farne
  partire un'altra mentre la prima è in corso la fa morire con `GATT operation already in
  progress`. **Ci si casca appena si risponde a una notifica con un comando** — ed è
  proprio quello che fa la rilettura dell'elenco dopo un salvataggio o uno scambio: il
  pedale eseguiva e la lista non si aggiornava mai. Serve una coda, come `sendChain` in
  `spark-transport.js`. Il trasferimento di un banco ci entra **come blocco solo**, o una
  notifica a metà si infila fra le sue trenta scritture.

**E l'ampli torna disponibile in mezzo secondo** dopo essere stato mollato — misurato.
Quando il riaggancio sembra lento la causa non è mai lui.

#### Il pedale è autonomo — verificato il 15 agosto 2026

Il formato del banco sta in **due file che vanno cambiati insieme**:
`src/pedale-ponte.js` lo costruisce, `pedale/prova-ble/banchi.h` lo legge. Dentro ci sono
**i frame già serializzati** più nome e UUID di ogni preset; il firmware non serializza
niente. Trasferimento: `INIZIA`, una trentina di `PEZZO`, `FINE` col checksum — **con
risposta**, al contrario di quello che si fa con l'ampli dove non c'è scelta. Il blocco si
accumula in heap e finisce in LittleFS **solo se il checksum torna e la struttura si lascia
interpretare**: un banco a metà sarebbe peggio di non averlo.

**Verificato sull'hardware:** banco «prova banco ped» mandato dall'app, scritto in
LittleFS, **ricaricato da solo dopo un riavvio**, e suonato — 291–346 ms per preset con
tutti gli ack. **I preset sopravvivono allo spegnimento**, che era tutto il punto.

`banchi.h` è **l'unico punto del progetto dove entrano byte non nostri**: l'offset di ogni
pezzo e la lunghezza di ogni stringa vanno verificati, o un blocco malformato scrive oltre
il buffer.

#### Il pannello «Pedale» nell'app — fatto il 16 agosto 2026

Nella vista Live, accanto a «Modifica». Si collega al pedale, mostra i suoi otto slot,
manda il banco scelto, e lascia riordinare ed eliminare.

**Il riordino si compone offline e si applica in una volta** (scelta dell'utente, ed è
migliore di quella di prima): le frecce e «Togli» lavorano su una copia locale, e
«Aggiorna il pedale» calcola la differenza — prima le eliminazioni, poi la permutazione
con al massimo sette scambi — simulando lo stato del pedale mentre emette i comandi, così
non serve rileggere dopo ognuno. In tempo reale ogni spostamento era un giro completo, e
riordinarne tre ne costava sei. **Caricare un banco resta immediato**, perché non è una
modifica da comporre ma un trasferimento.

**Due difetti pagati qui, e la lezione è la stessa dei callback BLE:**

- **`pulisciStatoPannelli()` nasconde ogni `.stato-pannello`**, e chi ci scrive deve
  rimostrarlo (`riga.hidden = false`) — è quello che fa `statoDelPannello`. Senza, il log
  viene scritto sempre e non si vede mai, e **due giri di diagnostica finiscono in un
  elemento invisibile**.
- **Il pedale accodava un comando solo**, e applicando un riordino ne arrivano sette di
  fila: il secondo rimbalzava. Ora la coda è circolare da dodici e il loop ne esegue
  **uno per giro**, perché svuotarla tutta rifarebbe l'errore di tenere occupato chi deve
  rispondere alla radio.

Il trasferimento di un banco costa ~6 s per 5,5 KB, con scritture una alla volta e con
risposta. Funziona; si può accorciare, ma è ottimizzazione.

**Ancora da fare: il pedale non ricorda quale banco stava suonando.** Al riavvio carica il
primo che trova. Con più banchi in memoria non basta più, e ha senso farlo insieme ai
tasti banco veri — sono la stessa funzione vista da due lati.

**Chiuso il 16 agosto 2026: il footswitch col banco ricevuto funziona.** Contatori alla
mano, **6 fronti grezzi per 3 pressioni** — due a testa, zero rimbalzi — e tutte e tre
hanno cambiato preset, 359–407 ms. Il difetto del giorno prima era una delle due cose
annotate, quasi certamente **l'app ancora collegata**: mentre lo è, il pedale ha mollato
l'ampli per costruzione e BOOT non può fare niente. **È lo scambio più facile da fare, ed
è già costato tre giri di diagnosi.**

Da tenere d'occhio, visto una volta sola: un primo invio dopo una pausa a **758 ms con
15/16 ack**, con l'`0x0401` mancante arrivato in ritardo. I successivi puliti. Se si
ripete è un sintomo da annotare, non da inseguire.

### Il simulatore — fatto il 14 agosto 2026, da provare col piede

`tools/pedale-sim.html`: la faccia del pedale in una pagina — otto footswitch in due file
da quattro, otto LED, e l'OLED 128×128 disegnato 1:1 su un canvas — con dentro la logica
vera e **il nostro trasporto**, quindi non è un mockup. Con l'ampli connesso manda
`loadPreset` davvero; senza, simula il ritardo (regolabile, così si prova anche cosa
sarebbero 250 ms) e misura quanto ci mette ogni cambio.

I banchi arrivano da `store.getBanks()`. Se non ce ne sono usa banchi finti e lo dice;
`?demo` li forza. **I tasti 1–8 della tastiera fanno da piede**: col mouse la pressione
lunga non si prova bene.

Le scelte già dentro, che sono quelle da giudicare suonando:

- **tutti scattano alla pressione**: nessun footswitch ha una funzione lunga da aspettare.
- **il quinto cambia solo la metà**, e il suono resta quello che era.
- **una pressione durante un caricamento si accoda, non annulla** — verificato poi sul
  firmware vero, dove il tasto va letto anche dentro l'attesa degli ack.
- cambiando banco si torna **sempre in metà A** e `attivo` va a `null`: atterrare in uno
  stato noto vale più che ricordarsi dov'eri, e l'ampli continua a suonare quel preset ma
  nessun tasto del banco nuovo lo rappresenta.
- l'OLED tiene una **striscia in fondo con quello che sta suonando** («♪ A1 Clean Twin»):
  è lo spazio che si libera mostrando quattro nomi invece di otto, e serve soprattutto
  quando la metà mostrata non è quella che suona.

Due disposizioni del display a confronto, ma la scelta è quasi fatta: **l'elenco di quattro
righe** dà ~22 caratteri a testa e i nomi veri ci stanno interi, mentre le **quattro
colonne** — che ricalcano i pedali in fila — tornano a sei caratteri per riga. Il nome
corto per il pedale, deciso dall'utente in libreria, per ora non serve più.

**La resa a 1 bit del simulatore è più brutta del vero** e non va usata per giudicare:
sogliare un font antialiasato a 7 px mangia i tratti, mentre un font a matrice 5×7 ha ogni
pixel messo apposta. Vale la resa in grigi, che fra l'altro è quella giusta per un
**SSD1327** (128×128 I²C, sedici livelli di grigio), che è il controller tipico di quel
formato.

### Ricognizione, non misura

- **Lo Spark 2 non ha nessun ingresso MIDI** (niente DIN, l'USB-C è solo scheda audio):
  qualunque pedaliera MIDI passa per forza da un ponte che traduce MIDI in BLE.
- **Un padrone alla volta: verificato il 15 agosto 2026, per caso.** Col C3 connesso allo
  Spark, il simulatore nel browser non trova niente: `requestDevice` filtrato sul servizio
  `0xFFC0` non vede nessun dispositivo. **Mentre è connesso, l'ampli smette di
  annunciarsi.** In senso stretto questo non dimostra che rifiuterebbe una seconda
  connessione, ma dimostra la cosa che conta: **via Web Bluetooth, che ha bisogno della
  scoperta, il secondo non entra.** Basta staccare l'alimentazione al pedale e il browser
  lo ritrova.
- **Conseguenza pesante sul ponte app↔pedale**, da tenere presente quando lo si fa: **app e
  pedale non possono parlare all'ampli insieme.** O si usa uno o si usa l'altro, oppure
  **il pedale fa da tramite** — client verso l'ampli e server verso l'app, che è esattamente
  quello che fa Ignitron, e adesso si capisce perché.
- **L'AIRSTEP Spk Edition comanda il looper dello Spark 2**, ed è di terzi: i comandi
  stanno nella stessa conversazione BLE, non c'è un canale privilegiato dell'app ufficiale.
  Si diceva che funzionasse **con l'app ufficiale connessa insieme**: alla luce di quanto
  sopra, se è vero è perché fa da tramite, non perché l'ampli accetti due padroni.
- **Ignitron** (`stangreg/Ignitron`) è già un pedale ESP32 per lo Spark 2: fa da client
  verso l'ampli **e da server verso l'app ufficiale**, ha i banchi dentro. Prima di
  scrivere firmware da zero conviene leggerlo, e valutare se il lavoro non sia configurarlo
  invece che riscriverlo. Ma è il pedale di qualcun altro: le nostre differenze verificate
  vanno confrontate con le sue, non date per allineate.
- `reference/paulhamsh/` ha anche un **client BLE verso una pedaliera** con `PEDAL_SERVICE`
  = `03b80e5a-…` (`SparkComms.h:49`), che è il **servizio BLE MIDI** — lo stesso che Chrome
  blocca in Web Bluetooth. Su ESP32 quel limite non esiste.
- Se un giorno si torna alla **M-VAVE Chocolate Plus**: non si collega con Web Bluetooth ma
  con **Web MIDI**, perché Chrome tiene il servizio GATT MIDI nella blocklist apposta.
  Il punto che decide tutto sarebbe **Web MIDI su Chrome per Android**, dieci minuti di
  prova. Ma con l'ESP32 la domanda non si pone: interruttori sui GPIO sono un
  `digitalRead` con antirimbalzo, niente accoppiamento, niente seconda batteria.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate. **Ma pesa a ogni sessione**: quello che serve solo se si riapre un capitolo
  va in `docs/`, con un rimando qui. La regola per cosa resta: **tutto ciò che mi impedisce
  di fare danni o di ripercorrere una strada chiusa**.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.

### Il prossimo passo: sincronizzare la libreria con Dropbox

Chiesto dall'utente il 18 agosto 2026, e **è da qui che si riprende**. Il problema vero
che risolve: `file://` e `https://` sono due origini con due IndexedDB diversi, e la
libreria non passa dall'una all'altra — né dal computer al telefono.

**Metà del lavoro c'è già.** `exportAll()` produce l'istantanea completa e
`importBackup()` **fonde per UUID** invece di sovrascrivere: aggiorna quello che
riconosce, aggiunge quello che non c'è, lascia stare il resto. È coperto da test. Un
sync è poco più di «carica questo JSON» / «scarica e reimporta».

**Fattibile senza server:** le API Dropbox supportano CORS e OAuth **PKCE**, quindi
basta la pagina statica su GitHub Pages. Serve registrare un'app e tenere il token.

**Due buchi trovati leggendo il codice, e vanno chiusi prima del trasporto:**

- **`exportAll()` non esporta `settings.banchi`.** Porta preset, categorie, nomi dei
  parametri e colori delle famiglie. Quindi oggi un sync lascerebbe indietro proprio i
  banchi live, che sono la cosa che serve identica su telefono e computer. Poco lavoro,
  ma cambia il formato: va alzata `version`.
- **Le cancellazioni non si propagano.** La fusione per UUID non distingue «cancellato»
  da «non ancora arrivato», quindi un preset cancellato sul telefono **torna** al primo
  sync dal computer. Non perde lavoro — coerente con la regola — ma è il genere di cosa
  che fa impazzire. Serve almeno una lista di UUID cancellati, con la data.

**Come farlo, deciso ragionando e da confermare:** **due pulsanti espliciti**, «Manda su
Dropbox» e «Prendi da Dropbox», con la data del file remoto accanto. Non sincronizzazione
automatica: un sync silenzioso che sbaglia una fusione è esattamente il difetto che
questo progetto ha deciso di non avere.

**Alternativa molto più economica, se basta il computer:** la **File System Access API**
su un file dentro la cartella Dropbox locale — si sceglie una volta, il browser ricorda
il permesso, e Dropbox sincronizza da sé. Zero OAuth, poche righe. **Su Android non
esiste**, quindi risolve solo metà del problema se il telefono è il dispositivo che va
all'ampli.

## Dove si riprende — 18 agosto 2026

**La prossima sessione parte dal sync Dropbox** (sezione qui sopra). Il resto è in
pausa, non abbandonato, in ordine di quanto conta:

1. **Provare che l'ampli non si pianta più girando le manopole.** L'invio dei parametri
   è stato reso autocadenzato ma **la correzione non è verificata**: il blocco non si
   riproduce a comando. Se ricapita, le manopole da girare sono `PAUSA_PARAMETRO` e poi
   `SEND_GAP_MS` — vedi la sezione dell'editor.
2. **Comprare i componenti del pedale**: OLED 3,12" 256×64 SSD1322 (SPI), MCP23017,
   cinque footswitch, due pulsantini, striscia WS2812, una scatola. Tutto il resto è già
   deciso e scritto qui.
3. **Il pedale non ricorda quale banco stava suonando**: al riavvio carica il primo che
   trova. Va fatto insieme ai tasti banco veri, che sono la stessa funzione vista da due
   lati.
4. **Togliere dal catalogo altri modelli che l'ampli non ha.** `TrebleBooster` è stato
   trovato dall'utente; l'elenco viene da Soundshed e non è verificato. La tendina adesso
   distingue i modelli visti sull'ampli da quelli supposti, quindi il prossimo si trova
   più in fretta.

**Non aperti, e vanno bene così:** il conteggio col click del looper (archiviato, vedi
`docs/looper.md`), e il trasferimento di un banco al pedale che costa ~6 s — funziona,
si può accorciare, ma è ottimizzazione.
