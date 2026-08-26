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
| `docs/pedale.md` | si lavora sul pedale: forma, ferramenta, misure BLE, ponte, simulatore |
| `docs/protocollo-spark2.md` | si tocca il protocollo, l'encoder, la scrittura dei preset |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |

Snellito due volte: il 14 agosto 2026 (era 27.700 token) e il **26 agosto 2026**, quando
era ricresciuto a ~27.000 — metà erano il pedale. Tolti ~17.000 token per sessione senza
buttare via niente: tutto è in `docs/`.

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
pedale/prova-ble/                 firmware: si collega, cambia preset, riceve un banco
  banchi.h  preset_frames.h       formato del banco; frame preserializzati dall'app
pedale/prova-usb/                 sketch vuoto, per isolare i guai di USB/alimentazione
tools/pedale-sim.html             la faccia del pedale in una pagina, con la logica vera
tools/frames-pedale.html          genera preset_frames.h per il firmware
tools/ponte-prova.html            sonda del ponte, sponda app
tools/pedale-seriale.html         log del pedale via Web Serial (non resetta la scheda)
tools/serve.ps1                   server statico su localhost, per provare la PWA
tools/make-icons.ps1              rigenera icons/
tools/leggi-btsnoop.ps1           legge uno snoop log HCI di Android
tools/reader.html                 legge la libreria dall'ampli, esporta in JSON
tools/write-probe.html            varianti di 0x0101, con rilettura di verifica
tools/model-probe.html            idem per 0x0106
tools/looper-probe.html           ascolta l'ampli mentre si usa il looper
tools/explorer.html               diagnostico single-file per Android, CONGELATO
tools/explorer-v1.html            la sua versione vecchia, non aperta da nessuno: si può togliere
tools/banco-di-prova.js           otto preset veri per frames-pedale.html (da captures/)
test/*.html                       protocol 125, transport 48, store 136, backup 33, dropbox 34
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

**«Elimina tutti i preset» (pannello «Altro») risparmia gli otto dell'ampli**, e non per
prudenza: quelli l'ampli li suona, quindi la prima lettura li rimetterebbe dentro comunque
— ma spogliati di tag, note e famiglia, e *quello* sarebbe lavoro perso davvero.
`svuotaTranneAmpli` passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da
Dropbox» rimetterebbe dentro tutto. Due conferme, e la seconda dice che la cosa viaggia.

**Un preset nuovo si fa in due modi, e nessuno parte dal nulla**: «Duplica» nel dettaglio
(`store.duplicate`, che cambia **UUID, slot e nome** — l'UUID perché altrimenti la lettura
dall'ampli scambierebbe la copia per l'originale), e «Leggi il suono corrente» in «Altro»,
che offre di salvare quello che l'ampli sta suonando — se quell'UUID c'è già aggiorna solo
la parte sonora, che è la regola di `importFromAmp`. **Dal nulla non si fa, ed è
deliberato**: un preset inventato dovrebbe dichiarare sette blocchi con modelli che l'ampli
ha davvero, e un modello inesistente è quello che l'ha già piantato una volta (vedi
`TrebleBooster`). Se un giorno servisse, lo scheletro va preso da un preset **uscito
dall'ampli**, non dal catalogo.

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
- **il modello non si cambia**, e la tendina è spenta: cambiarlo vuol dire far ricostruire
  un blocco DSP e poi **rileggere quanti parametri ha quello nuovo**. Deciderlo alla cieca
  vorrebbe dire dare al modello nuovo i parametri del vecchio — cioè costruire a tavolino
  il preset che pianta l'ampli;
- **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si connette
  dopo: rileggere la catena a metà lavoro sostituirebbe di soppiatto quello che si sta
  modificando con quello che l'ampli sta suonando, che è un altro suono.

Il titolo dice «— senza ampli» e la riga di stato lo ripete.

**Le sette posizioni sono etichettate per categoria** (`Spark.CATENA`): noise gate,
compressore, drive, ampli, modulazione, delay, riverbero.

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

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, e `logLine`/
`logProgress` ci scrivono l'ultimo messaggio: un pannello a tutto schermo copre il log, e
senza quello un comando fallito è indistinguibile da un comando che non fa niente.
**`pulisciStatoPannelli()` nasconde ogni `.stato-pannello`**, e chi ci scrive deve
rimostrarlo (`riga.hidden = false`) — è quello che fa `statoDelPannello`. Senza, il log
viene scritto sempre e non si vede mai: due giri di diagnostica finiti in un elemento
invisibile.

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

**L'elenco dei modelli (`MODELLI`) non è verificato, e un nome sbagliato fa danni.** Viene
dal catalogo di Soundshed: se l'ampli quel modello non ce l'ha, `0x0106` gli chiede di
**ricostruire un blocco DSP che non esiste** — il comando più pesante che gli mandiamo.
**`TrebleBooster` mandava in palla l'ampli** (18 agosto 2026: sullo Spark 2 c'è solo
`Booster`), ed è stato tolto. Resta nella `TABELLA` dei nomi, che è innocua.

**Non si può chiedere all'ampli quali modelli conosce.** L'unica prova è che un modello
**compaia in un preset uscito dall'ampli**: allora esiste di sicuro. Per questo la tendina
dell'editor divide in due gruppi, «sul tuo ampli» e «dal catalogo, da provare»
(`modelliVisti()` in `index.html`). Quando se ne trova un altro che non esiste, si toglie da
`MODELLI`.

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

Nessuna autenticazione è richiesta: la license key `0x0170` non è mai stata inviata (ma
vale per i comandi che usiamo — vedi `docs/looper.md`).

**Looper**, in due righe: si comanda con `0x0175` e un byte (`04` rec, `05` stop rec, `08`
play, `09` stop, `0b` dub, `0c` stop dub, `0a` delete); si legge posizione (`0x0377`), bpm
(`0x0363`) e impostazioni (`0x0376`). Manca solo la battuta di conteggio col click. Capitolo
**archiviato**: tutto in `docs/looper.md`, comprese le strade già escluse.

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
ESP32-C6**, OLED **2,42" 128×64 SSD1309 in SPI a 7 pin**, espansore **KAmod I2C-IOexp16**
(MCP23017), cella **XTAR 18650-330PCM protetta** in portacella, quattro LED bicolore sulle
uscite dell'espansore. Mancano footswitch e pulsantini dalla Cina, ma **per il firmware
bastano i pulsanti da arcade che l'utente ha in casa** (COM e NO del microswitch: sono la
stessa cosa elettrica).

Pin della C6 — **nessuno degli undici piedini è di strapping**, quindi cade la prudenza che
serviva sul C3:

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `22`, `23` | MCP23017 in I²C (SDA, SCL) |
| D8 / D10 | `19`, `18` | display SPI: SCK, MOSI |
| D3, D6, D7 | `21`, `16`, `17` | display: CS, DC, RST |
| D0 (A0) | `0` | tensione di batteria — **partitore già a bordo**, 1:2 |
| D1, D2, D9 | `1`, `2`, `20` | liberi; D1 e D2 sono analogici |

Interruttori sul **port A** dell'espansore (è quello che può far scattare l'interrupt), LED
sul port B. **Non verificato sul C6**: i tempi BLE (misurati su C3, libreria identica) e se
il modulo espansore abbia i pull-up sull'I²C — se il bus non parte, quello è il primo
sospetto, e si risolve con due resistenze da 4,7 kΩ.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate. **Ma pesa a ogni sessione**: quello che serve solo se si riapre un capitolo va
  in `docs/`, con un rimando qui. La regola per cosa resta: **tutto ciò che mi impedisce di
  fare danni o di ripercorrere una strada chiusa**. Il racconto di *come* ci si è arrivati
  va in `docs/`, sempre.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI.
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

## Dove si riprende — 26 agosto 2026

Guscio `v39`. Le suite sono verdi (protocol 125, transport 48, store 136, backup 33,
dropbox 34), ma **`index.html` non è coperto da nessuna suite**: l'editor nuovo e il vestito
del 25 agosto si verificano solo aprendo l'app, e le mie prove sono contro un ampli finto.

1. **Provare l'editor nuovo con l'ampli acceso.** È la cosa che il banco non può dare:
   girare un pomello e sentire se il suono segue, cambiare un modello e vedere se la catena
   si rilegge, salvare e riscrivere il preset per sentire se ha salvato la cosa giusta. Se
   qualcosa non torna, il primo sospetto sono i comandi — non il disegno, che è solo un modo
   diverso di mostrare gli stessi.
2. **Provare che l'ampli non si pianta più girando le manopole.** L'invio dei parametri è
   stato reso autocadenzato ma **la correzione non è verificata**. Se ricapita: prima
   `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
3. **Il pedale: i pezzi sono comprati, si aspetta che arrivino.** Quando arriva la roba, in
   quest'ordine: display sulla C6 con quattro cavetti, e vedere se scrive; poi l'espansore
   con **un pulsante solo**, per sapere se il bus I²C legge; poi il firmware, che è tutto
   software. Il porting da C3 a C6 dovrebbe essere di peso, ma **i tempi BLE vanno
   rimisurati**.
4. **Il pedale non ricorda quale banco stava suonando**: al riavvio carica il primo che
   trova. Va fatto insieme ai tasti banco veri, che sono la stessa funzione vista da due
   lati.
5. **Togliere dal catalogo altri modelli che l'ampli non ha.** `TrebleBooster` è stato
   trovato dall'utente; l'elenco viene da Soundshed e non è verificato. La tendina mette per
   primi i modelli visti sull'ampli, quindi il prossimo si trova più in fretta.

**Discusso e non aperto: creare un preset con l'AI** («voglio il suono dell'assolo di
Gilmour in Mother»). L'utente ha chiesto solo di ragionarci. Il punto: il vocabolario dei
modelli non lo può scegliere l'AI — un nome che l'ampli non ha è il comando che lo pianta —
quindi glielo si dà ristretto a `modelliVisti()`, lo scheletro si prende da un preset uscito
dall'ampli, e il risultato si prova **solo sul buffer `0x7f`**, mai in uno slot. Serve una
API key dell'utente, e sarebbe la prima funzione dell'app che non funziona offline. L'AI non
sente: dà un punto di partenza, non un suono finito.

**Non aperti, e vanno bene così:** il conteggio col click del looper (archiviato), e il
trasferimento di un banco al pedale che costa ~6 s — funziona, si può accorciare, ma è
ottimizzazione.
