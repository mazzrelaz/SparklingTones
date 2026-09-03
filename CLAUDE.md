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
| `docs/sito.md` | si tocca `sparklingtones.com`: DNS, `www`, privacy, video |

Snellito cinque volte: il 14 agosto 2026 (era 27.700 token), il 26 agosto (~27.000), il 27
agosto (~17.700 in un giorno solo), il 29 agosto (da ~23.300), e il **2 settembre, da 73.137
byte a 42.154** — cioè da ~25.000 token a ~14.000, **11.000 risparmiati a ogni singola
sessione**. Quella volta hanno lasciato la memoria di lavoro: il racconto delle regole
dell'app e la decisione sull'inglese (`docs/decisioni-ui.md`), le trappole dell'ESP32 e la
sezione lunga del pedale (`docs/pedale.md`), gli Hendrix e il looper
(`docs/protocollo-spark2.md`), il sito (`docs/sito.md`), i punti di ripresa vecchi
(`docs/diario.md`). **Ogni volta non si butta via niente: si sposta in `docs/`.** La regola
che decide è sempre la stessa: qui resta ciò che mi impedisce di fare danni, il resto è un
rimando. **Si rigonfia in due settimane, quindi si rimisura spesso**, con
`wc -c CLAUDE.md`.

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
src/snake-pedali.js               la goliardata: StompSnake, in «Fai una pausa»
pedale/prova-ble/                 firmware del pedale; banchi.h e preset_frames.h sono il
                                  formato del banco e i frame preserializzati dall'app
pedale/prova-usb|display|espansore|midi/   sketch di prova, uno per pezzo
pcb/                              la scheda portante in KiCad: schema e disposizione
tools/                            simulatore del pedale, generatori, sonde dell'ampli, server
                                  locale (serve.ps1), script della scatola; `ls tools/` li
                                  elenca e il nome dice cosa fanno
test/*.html                       protocol 139, transport 60, store 136, backup 41, dropbox 34
captures/                         log grezzi dall'ampli
reference/paulhamsh/              sorgenti di riferimento (ESP32 + Python), BLE funzionante
design/                           le proposte grafiche a confronto, non è l'app
docs/                             vedi la tabella qui sopra
```

**`tools/explorer.html` è CONGELATO**: ha una copia propria del codice di protocollo perché
deve restare single-file per il telefono, e le modifiche vanno in `src/`.

**`index.html` è 186 KB: leggerlo intero costa ~55.000 token**, più di due volte questo file.
Non va mai letto tutto. `grep -n '^/\* ==='` dà l'indice del JavaScript e poi si legge la sola
sezione con `sed -n 'a,bp'`. Le sezioni, in ordine: `<style>` (senza marcatori), corpo HTML,
poi lo script — Stato in memoria, Le due viste, Log, Pannelli, Vista preset, Vista live, Invio
di un preset all'ampli, Editor della catena effetti, Il disegno dell'editor, Categorie, Azioni
comuni, Dropbox, Il pedale ESP32. I numeri di riga invecchiano a ogni modifica; i titoli no.

Niente build step, niente server: tutto si apre da `file://`. Per questo i moduli sono classic
script che espongono `window.Spark` e `window.SparkTransport` invece di ES module, che su
`file://` sono bloccati dal CORS. **IndexedDB funziona da `file://`** su Chrome desktop, ma lì
tutte le pagine condividono la stessa origine opaca: **passando da `file://` a https la
libreria non viene dietro**, e va esportata in JSON e reimportata.

## Trappole dell'ambiente

**Mai riscrivere un file di questo progetto con `Get-Content`/`Set-Content` di PowerShell
5.1.** Senza BOM, `Get-Content` decodifica l'UTF-8 come ANSI e `Set-Content -Encoding UTF8` lo
riscrive doppiamente codificato: ogni accento diventa `Ã ` in tutto il file, in silenzio.
Basta un `-replace` di una riga. Rimedio: `git checkout -- <file>` se è committato, e rifare
con gli strumenti di edit; se non è committato, rileggerlo come UTF-8, togliere il `﻿` iniziale
e riscrivere i byte convertendo in **CP1252**, che è l'inverso.

**Mai usare `|` come delimitatore di `s///` in perl su testo con tabelle markdown**: il primo
`|` del contenuto chiude il pattern e la sostituzione finisce **in cima al file**, che sembra
tutt'altro guasto. Su questi file si usa lo strumento di edit, non `perl -0pi`.

**Gli heredoc lunghi in bash si rompono**: per scrivere testo lungo si usa Write in un file
dello scratchpad e poi lo si concatena. Stessa famiglia: **i messaggi di commit vanno passati
per file** — `git -c i18n.commitEncoding=UTF-8 commit -F <file>` — perché `-m @'…'@` in
PowerShell 5.1 si spezza in silenzio. Così si possono anche usare gli accenti.

**Il push non parte dalla mia shell**, che è non interattiva: serve `GIT_TERMINAL_PROMPT=1`,
`GCM_INTERACTIVE=true` e `GCM_GUI_PROMPT=true`, che fanno aprire la finestra sul desktop.

**Dopo ogni modifica a `src/`, le pagine in `test/` devono restare verdi.** Girano contro
catture reali dell'ampli, quindi prendono una regressione della codifica senza hardware.
Girano anche senza browser, con Edge headless:

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/spark/test/protocol-test.html'
```

Poi si cerca `id="summary"`. **Su `store-test.html` e `backup-test.html` no**: col tempo
virtuale IndexedDB e le fetch dei fixture non fanno in tempo e la pagina resta a «esecuzione…».
Per quelle, e per provare l'app che gira, si passa da **`localhost`** (`tools/serve.ps1`).
**Aprire un `file://` nel browser del riquadro non serve a niente**: lo carica come `data:` e i
`<script src="../src/…">` non partono.

Cinque cose misurate su quell'ambiente, che fanno perdere ore se le dimentico:

- **lo stdout di Edge headless non torna alla shell** (`$out = & msedge …` dà stringa vuota):
  va redirezionato con `Start-Process … -RedirectStandardOutput`, sia per `--dump-dom` sia per
  `--screenshot`, ed è con `--screenshot` che si guarda una pagina che *gira*;
- **`requestAnimationFrame` non gira** né nel riquadro né in headless — un fotogramma solo, e
  per lo stesso motivo lì lo screenshot del riquadro fallisce. Niente che si muova da sé si può
  provare con rAF: il ciclo del gioco è un `setInterval`;
- **il service worker serve a Edge headless i file della corsa precedente**, e una modifica non
  si vede: si aggiunge una **query in coda** all'url, o si usa un profilo nuovo — che però da
  freddo non dà tempo a IndexedDB di rispondere;
- **in una scheda in secondo piano i timer sono strozzati**, e una suite da un secondo sembra
  piantata per minuti;
- **l'avvio dell'app chiude i pannelli** (`applicaVista()` → `chiudiPannelli()` quando il
  database risponde): una prova che apre un pannello troppo presto sembra un difetto del
  pannello.

**Le trappole dell'ESP32 — seriale, CDC, download mode, flussante, librerie Arduino — stanno in
`docs/pedale.md`.** In una riga l'una, per sapere che esistono: sulla **XIAO S3 i valori di
`CDCOnBoot` sono rovesciati** rispetto al C3/C6 (l'fqbn giusto è `CDCOnBoot=default`);
**aprire la porta seriale resetta il chip** e con RTS lo manda in download mode, da cui **si
esce solo staccando il cavo**; **`Serial.print` si blocca se nessuno legge la porta**, e si
risolve con `Serial.setTxTimeoutMs(0)` — ne segue che **misurare un tempo mentre si è collegati
alla seriale può nascondere il difetto che si manifesta da scollegati**; **il flussante residuo
fa scaldare i chip** e si pulisce dopo ogni sessione di saldatura, prima di ridare corrente —
e quando un componente scalda **si guarda intorno al componente** prima di condannarlo; **le
librerie Arduino non si installano in `Documenti`**, che Defender blocca con un errore che
sembra un'altra cosa.

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

Il perché di ognuna di queste è in `docs/decisioni-ui.md`.

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, etichettati A1…B4 coi
colori dei LED (rosso banco A, verde B); tutti gli altri stanno sotto, e **un preset non
compare mai in tutti e due i posti**. Niente striscia della famiglia sulle otto caselle.
**Sovrascrivere uno slot non perde il preset che c'era**: `assignSlots` → `_sistemaSlot` gli
toglie lo slot e quello ricompare da solo nella lista sotto, con tag, note e famiglia. Il
record non si cancella mai, cambia solo `slots`.

**`slots` è una lista, non un numero** — lo stesso preset può stare in più slot, e capita.
`normalizzaSlots` tiene una sola verità e cancella il vecchio `slot`. `_sistemaSlot(visti)`
**tocca solo gli slot osservati**: `readLibrary` salta quelli che non rispondono, e cancellare
uno slot mai visto farebbe sparire un preset per un timeout. Nella UI la chiave del dettaglio
è `id:slot`, non `id`. `store.hardware()` dà sempre otto posti, `null` dove non sappiamo, e il
confronto va fatto **per id**, non per oggetto: rilegge dal database e torna copie diverse.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, dopo
`identify`), e durante la lettura i pulsantoni live restano spenti: l'ampli sta rispondendo a
otto richieste in fila.

**«Elimina tutti i preset» risparmia gli otto dell'ampli** — la prima lettura li rimetterebbe
comunque, ma spogliati di tag e note, e *quello* sarebbe lavoro perso. `svuotaTranneAmpli`
passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da Dropbox» rimetterebbe
dentro tutto.

**Un preset nuovo si fa in tre modi, e nessuno parte dal nulla**: «Duplica» (`store.duplicate`,
che cambia **UUID**, slot e nome), «Importa preset attuale», «Importa un file». **Dal nulla non
si fa, ed è deliberato**: un modello inesistente è quello che ha già piantato l'ampli una volta
(`TrebleBooster`). Se servisse, lo scheletro va preso da un preset **uscito dall'ampli**.

**«Importa un file» distingue le tre cose dal contenuto, non dall'estensione** — `PK` per lo
zip, il campo `presets` per il nostro backup, un oggetto con `sigpath` per un preset singolo
dell'app ufficiale (`SparkBackup.trovaPresetUfficiali`). Per questo l'`<input type=file>`
**non ha `accept`**. Senza `meta.id` **l'UUID glielo diamo noi**, e reimportando lo stesso file
si fa un doppione invece di aggiornare.

**Il bollo «JH» marca i preset con un effetto Hendrix in catena**, perché quei preset **non
suonano come dicono** finché l'app ufficiale non ha sbloccato il pacchetto (vedi «Protocollo»).
**Si dice in quattro posti, e quattro devono restare**: le schede della vista preset, la
tendina dei modelli, il blocco a fuoco dell'editor, e **una riga di log in `mandaPreset`**,
prima dell'invio. È **un avviso al buio** — all'ampli non si può chiedere se sia sbloccato —
ed è la ragione per cui i posti sono quattro e non dieci. Restano scoperti la vista live
(decisione dell'utente) e il pedale.

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

Com'è fatto e perché — la catena al neon, i pomelli, la piramide, la tendina — sta in
`docs/decisioni-ui.md`, insieme al racconto di ognuna di queste regole. Qui le regole nude.

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che governa
tutto il resto. Per questo «Regola», **quando l'ampli c'è**, prima manda il preset con
`loadPreset` e poi apre il pannello, e lo stato di partenza si rilegge **dall'ampli**
(`readLiveState`), non dalla libreria. **Se la rilettura fallisce l'editor non si apre.**
Niente è salvato finché non si preme «Salva in libreria».

**Senza ampli l'editor si apre lo stesso, sulla copia in libreria**, e `inModifica.offline`
governa tre differenze: **niente parte sulla radio** (`mandaParametro` non accoda nemmeno, o un
arretrato partirebbe tutto insieme a una connessione a metà); **il modello si cambia lo
stesso, qualunque**, perché il catalogo è verificato e sappiamo com'è fatto il blocco per tutti
e settantotto; **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si
connette dopo — rileggere a metà lavoro sostituirebbe di soppiatto un suono con un altro.

Nel cambio di modello, **prima si copia e poi si costruisce**: `campioneModello(nome)` prende
numero di parametri *e* valori da un blocco che l'ampli ha davvero prodotto; solo se non c'è si
costruisce dalla tabella, a metà corsa. Il blocco resta acceso o spento com'era.

**Il tempo sta qui, e solo qui** — non nella vista live: **il bpm è un campo del preset**
(`preset.bpm`, dentro `0x0101`), quindi si sceglie mentre si costruisce il suono. Col tap, o di
un bpm coi tasti; con l'ampli parte subito `0x0176` **e gli effetti a tempo seguono da soli**;
senza ampli non parte niente. Il riscontro del tap è **il lampeggio del tasto**, non un
messaggio.

**L'invio dei parametri è autocadenzato, non a timer**: il prossimo parte quando il precedente
è finito, più `PAUSA_PARAMETRO` (90 ms), così la coda non cresce qualunque cosa faccia il dito.
`writeWithoutResponse` non ha controllo di flusso, e questa è **la causa più probabile
dell'ampli che si pianta girando le manopole** — ma **la correzione non è verificata**. Se
ricapita: prima `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.

**L'editor sa se c'è del lavoro non salvato**, e non lo lascia buttare via: `inModifica.toccato`
nasce in `segnaModificato()`, e «Fatto» e il logo chiedono con `chiediPrimaDiUscire()` —
**tre vie, non due**, perché con due un dito che sbaglia bottone perde il lavoro. **Se il
salvataggio fallisce non si chiude niente** (`salvaModifiche()` torna `true`/`false`). **Il
segno che ha salvato lo dà il tasto**, non un messaggio: in questo pannello non ne deve
comparire nessuno. Non si disabilita mai quando niente è toccato.

Per lo stesso motivo la nota sugli Hendrix **è uno stato e non un messaggio**: una
`.elenco-nota` sotto l'intestazione «Jimi Hendrix Pack» della tendina — una sola — e una
`.nota-jh` sotto il nome del modello nel blocco a fuoco. Sui tasselli non si dice niente: si
chiamano già «J.H. Fuzz Zone».

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, dove scrivono `logLine` e
`logProgress`: un pannello a tutto schermo copre il log. **`pulisciStatoPannelli()` le nasconde
tutte**, e chi ci scrive deve rimostrarla (`riga.hidden = false`, che è quello che fa
`statoDelPannello`) — senza, il log si scrive sempre e non si vede mai.

### Finestre e tendine: nell'app non c'è più niente del sistema

**Mai più `confirm()`, `alert()`, `prompt()` o `<select>`**: aprono la roba del sistema
operativo in un'app tutta nera, e soprattutto **un `confirm()` ha due vie sole**. Al loro
posto, tutte costruite sulla stessa scatola `.elenco-scelta`:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | il valore sta in `.valore` (non `.value`), `aggiorna(v)` lo cambia da fuori |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | il testo, o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | il `valore` dell'azione, `null` se si esce |

Tutte **asincrone**, quindi il gestore va `async`. `testo` è **HTML**, e un nome che viene dai
dati ci entra solo passando da **`testoConNome()`**, che lo scappa. Esc e il tocco fuori tornano
sempre `null`, che è la via che non fa niente.

**Nella tendina «⋯» nessuna voce si spegne**, ed è misurato: **un pulsante `disabled` non
riceve il clic**, quindi non scatta nemmeno il gestore che chiude la tendina — e si vede
un'app rotta. Senza ampli le voci **rispondono** con `senzaAmpli(cosa)`, una riga di log che
dice cosa manca. Vale per qualunque voce si aggiunga lì dentro.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), quindi restano **proposte**: si vedono *in
corsivo*, un nome scritto a mano vince sempre, e `manopola()` **scarta l'intera riga** se
dichiara più manopole di quante l'ampli ne manda. **Il credito a Soundshed non si toglie**, e
la domanda è già stata fatta e chiusa (31 agosto 2026, il perché in `docs/decisioni-ui.md`).

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto**: si legge Gain,
Bass, Middle, Treble, Master, ma negli indici sta `Gain(0), Treble(1), Middle(2), Bass(3),
Master(4)`. Trascrivendo dall'interfaccia si sbagliava in silenzio; due test fissano il caso.
Il campo `quante` dice **quante manopole ha davvero l'effetto**: i parametri in eccesso sono
**l'acceso/spento del blocco**, misurato.

**I nomi dei parametri li dà l'utente**, girando e ascoltando — l'ampli manda solo indici.
Stanno **per modello** (`settings.nomiParametri`), e `importBackup` li **aggiunge** invece di
sovrascrivere: un backup vecchio non deve cancellare i battesimi fatti da allora.

**`MODELLI` è verificato tutto contro l'app ufficiale** (26 agosto 2026, dalle foto
dell'utente): noise gate 1, comp/wah 6, drive 14, ampli 39, modulazione 13, delay 6, riverbero
1 con 9 tipi. Dodici nomi del catalogo Soundshed sono stati tolti perché l'ampli non li ha.
**Se si aggiunge un nome nuovo va verificato allo stesso modo**, perché all'ampli non si può
chiedere quali modelli conosce: l'unica prova è l'elenco ufficiale o un preset uscito
dall'ampli. E **una voce nuova nell'elenco ufficiale non è per forza un modello nuovo**:
l'«Auto Wah» del 2026 è lo stesso `JH.Vox846` con altri valori, quindi in `MODELLI` non è
entrato niente.

**Gli effetti Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»**
(`SparkEffetti.GRUPPO_HENDRIX`): sono l'unico contenuto a pagamento e l'unico che può entrare
in catena e restare muto.

## Protocollo — quello che non va dimenticato mai

Dettaglio, derivazioni e misure: `docs/protocollo-spark2.md`.

GATT: service `0xFFC0`, write `0xFFC1` (**writeWithoutResponse only**), notify `0xFFC2`.
Notifiche frammentate: riassemblare cercando `F0` … `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`.

Stato: **completo e verificato sull'ampli**. `0x0201` lettura, `0x0138` cambio preset, `0x0115`
effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset intero, `0x0176` bpm,
`0x0175` looper.

**Le trappole, tutte verificate sull'hardware:**

- **`0x0115`, `0x0104` e `0x0106` vogliono un byte `0x00` in coda al payload logico.** Senza,
  ack regolare e comando non applicato. `0x0138`, `0x0175` e `0x0176` no — e su `0x0176` il
  byte di troppo **non è innocuo**: il bpm non cambia e **il delay parte in ripetizione
  infinita**, perché l'ampli legge i campi spostati (si recupera premendo un tasto preset).
  Quindi **un payload malformato può muovere qualcosa che non c'entra**.
- **Il payload del bpm si costruisce dall'ultimo `0x0376` ricevuto**, cambiando il solo bpm, mai
  da una costante: l'ultimo campo cambia forma fra sessioni. Gli effetti a tempo seguono da
  soli: l'accoppiamento è dentro l'ampli.
- **L'ack conferma la ricezione, non l'esecuzione**, e `writeWithoutResponse` fa sembrare
  riuscita ogni scrittura lato browser. **L'assenza di errori non è una verifica**: vale solo
  l'effetto sull'ampli o una risposta in RX. E **la catena riletta conferma il nome del
  modello, non che quel blocco suoni**.
- **Chunk da 25 byte di payload, non 128** (con 128 lo Spark 2 si disconnette; il massimo
  verificato in scrittura è 44), e **tutti i chunk di un preset con lo stesso sequence number**.
- **Le write BLE lunghe vanno spezzate** in write ATT da 20 byte (`transport.sendSpezzato`):
  sopra i ~44 byte una write singola sparisce **in silenzio**, senza nemmeno l'ack.
- **`0x0127` non salva sullo Spark 2**, in tutte e quattro le forme provate. Tolto.
- **Cambiare un parametro di un effetto spento non produce nessun suono.**
- **`0x0106` vuole il nome del modello che c'è *adesso***, riletto dall'ampli. Se sbagliato
  l'ampli ignora tutto senza fiatare, e da lì in poi ogni cambio fallisce per sempre.
- **L'ampli si può piantare davvero**, e allora serve staccare la corrente. `rxTotali` distingue
  i due casi: 0 messaggi = ampli muto o connessione morta; più di 0 = parla e siamo noi a
  scartare. Senza quel numero i due casi si vedono uguali.

**Gli effetti Hendrix (`JH.*`) non suonano finché l'app ufficiale non li sblocca**, e non c'è
niente che possiamo farci: li abilita la **license key `0x0170`**, che l'app ufficiale firma in
locale ed è **non forgiabile** (64 byte diversi a ogni sessione, cioè una firma con un nonce; e
rigiocata l'ampli la rifiuta). Basta connettere l'app ufficiale una volta e **lo sblocco resta
nell'ampli** anche dopo che si è disconnessa. **L'ampli non verifica l'acquisto, verifica una
firma**: non ha account e non parla con internet, quindi fare il login dalla nostra app non
servirebbe a niente — ed è misurato. Cavare la chiave dall'app ufficiale è protezione di
contenuto a pagamento e **non si fa**. La cosa da ricordare è che **non è un difetto nostro**.
Il ragionamento intero in `docs/protocollo-spark2.md` e `docs/looper.md`.

**Nessuna autenticazione è richiesta per i comandi, ed è misurato**: con l'ampli sbloccato
davvero, il conteggio del looper resta ignorato identico a quando la chiave non c'era. Gli
Hendrix la vogliono, il protocollo no.

**Looper**: si comanda con `0x0175` e un byte (`04` rec, `05` stop rec, `08` play, `09` stop,
`0b` dub, `0c` stop dub, `0a` delete); si legge posizione (`0x0377`), bpm (`0x0363`) e
impostazioni (`0x0376`). **La battuta di conteggio col click non si comanda**: `02` riceve l'ack
e viene buttato via. Tutto ciò che è stato eliminato — canale, opcode, bonding, byte — sta in
`docs/looper.md`, «Come si conclude»; la conclusione è che **il modo c'è ed è la chiave
`0x0170`, e non è una porta che apriamo**. **Non aggiungere sonde sui byte.** L'unica cosa che
resterebbe è **chiedere a Ignitron**, che manda COUNTIN senza nessuna chiave: se a loro
funziona, la conclusione cade.

**Le due strade per scrivere un preset sono diverse**, e questo è costato mezza giornata:

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

Il giro via e ritorno non è decorazione: senza, lo slot riporta il contenuto vecchio.
`loadPreset` non sovrascrive nessuno slot: è il modo sicuro di provare un preset. **Mentre
l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot.

**Lo Spark 2 ha 8 slot, 0–7** (lo 0–3 della documentazione vale per lo Spark 40), ma il pannello
ha **4 LED bicolore**: rosso banco A (0–3), verde banco B (4–7). `Spark.slotLabel(n)` converte e
la UI mostra A1…B4.

### Regole di metodo, che valgono oltre il looper

- **Una cattura d'ascolto dice cosa l'ampli racconta, non cosa accetta.** I nomi degli enum di
  terzi descrivono lo *stato in cui l'ampli è entrato*, non un tasto da premere: le due
  direzioni vanno misurate separatamente.
- **Si registra prima e si interpreta dopo, mai il contrario.**
- **I dati finti non devono finire in una cattura**: sono marcati `demo`, non contano negli RX
  totali e l'esportazione li scarta.
- Ogni prova va verificata **rileggendo dall'ampli**, una variante alla volta.
- **Strumentare prima di ipotizzare.** I contatori hanno chiuso in una sessione un problema su
  cui si era tirato a indovinare per due.

## Il pedale ESP32

Il ragionamento completo — la forma e perché, la ferramenta pezzo per pezzo, le misure BLE, il
ponte, il simulatore, la scatola, l'alimentazione, la modalità MIDI — sta in **`docs/pedale.md`**,
che va aperto quando ci si lavora. Qui il minimo per non fare danni.

**Cos'è**: la vista live del web, staccata dal telefono. Prende i preset dall'app, poi è
autonomo con lo Spark. Nessuna regolazione, solo preset. Sta in questo repo perché l'interfaccia
app↔pedale è un contratto fra le due sponde, e un commit solo deve poter cambiare tutte e due.

**Comandi**: quattro footswitch = i quattro suoni della metà corrente; un quinto **cambia metà
senza toccare il suono che sta suonando** (sul palco la sorpresa è il difetto peggiore); due
tasti a mano per i banchi. Il banco è da otto, in due metà da quattro, coi quattro LED bicolore
che **cambiano tutti insieme** — rosso A, verde B. Quando la metà mostrata non è quella che
suona nessun LED è acceso, e per questo l'OLED tiene in fondo una riga **♪** con quello che sta
suonando davvero.

**Le regole che non si toccano:**

- **Il pedale non tocca mai gli slot hardware.** Ogni cambio preset è `0x0101` sul buffer `0x7f`
  + `0x0138` con `0x7f`. Ne segue che servono **solo due comandi** — niente `0x0104`, `0x0115`,
  `0x0106`, niente parser dei preset — e che il pedale **non può rovinare quello che c'è
  sull'ampli, per costruzione**. Conseguenza: il LED del pannello dell'ampli lampeggia in
  permanenza, e non è un difetto.
- **L'app preserializza, il firmware non serializza niente.** Riceve frame già pronti e **patcha
  un byte solo**, il seq all'indice 2 — il checksum è un XOR dei soli byte impacchettati e non
  lo copre. Verificato sull'hardware. L'encoder resta uno solo, in JS, coperto dai test.
- **Un padrone alla volta**: mentre l'ampli è connesso al pedale **smette di annunciarsi**, e via
  Web Bluetooth il browser non lo trova più. Quando l'app si collega al pedale, lui molla
  l'ampli; quando se ne va se lo riprende (~0,5 s). **Se il footswitch non fa niente, il primo
  sospetto è l'app ancora collegata** — è già costato tre giri di diagnosi.
- **Mai fare operazioni BLE dentro un callback BLE**: `disconnect()` in `onConnect` o
  `startAdvertising()` in `onDisconnect` bloccano NimBLE per decine di secondi. I callback
  alzano una bandiera, il lavoro lo fa il `loop()`.
- **Niente attese bloccanti che non guardino gli ingressi**: durante un trasferimento il tasto va
  letto lo stesso, la pressione si accoda e **vince l'ultima**. E **l'antirimbalzo aspetta che il
  segnale stia fermo**, non che sia passato del tempo dall'ultimo cambio accettato.
- **Web Bluetooth ammette una sola operazione GATT alla volta per dispositivo**: serve una coda,
  e il trasferimento di un banco ci entra come blocco solo.
- **Il formato del banco sta in due file che vanno cambiati insieme**: `src/pedale-ponte.js` lo
  costruisce, `pedale/prova-ble/banchi.h` lo legge. `banchi.h` è **l'unico punto del progetto
  dove entrano byte non nostri**: offset e lunghezze vanno verificati, o un blocco malformato
  scrive oltre il buffer.

**La ferramenta è comprata** (`docs/pedale.md` per la scelta di ognuno): **XIAO ESP32-S3** —
dal 29 agosto 2026 al posto della C6, perché **solo l'S3 ha l'USB-OTG vero** e quindi può fare
la modalità MIDI da sola — OLED **2,42" 128×64 I²C**, espansore **KAmod I2C-IOexp16**
(MCP23017), cella **XTAR 18650-330PCM protetta**. I LED sono quelli che l'utente ha in casa,
RGB 5 mm **a catodo comune**; **l'MCP23017 non ha PWM**, quindi acceso/spento e basta — **la
luminosità la fissa la resistenza, una volta per tutte**. **Valori scelti dall'utente col LED
in mano, 3 settembre 2026: 330 Ω sul rosso e 560 Ω sul verde** — 4,2 e 2,1 mA a 3,3 V, cioè
**17 mA con quattro LED accesi invece dei 48** del piano iniziale, che sull'autonomia è la
leva più grossa che abbiamo. I 100/220 di prima erano una stima e sono caduti su una misura:
sul progetto timer dell'utente, **anche lui a 3,3 V**, quei valori danno LED *troppo*
luminosi, tenuti al 25-60% di PWM. E il verde sta **più alto** del rosso, che sembra un errore
e non lo è: a parità di corrente l'occhio vede il verde ~3× più luminoso, e qui i due colori
dicono la stessa cosa (banco A o B), quindi devono pesare uguale. **Interruttori sul port A** (è quello che fa scattare l'interrupt), **LED
sul port B**.

**I nomi dei pezzi sono fissi, e cambiarli fa danni** (3 settembre 2026, chiesto dall'utente
dopo che in una sola risposta avevo chiamato la stessa cosa basetta, scheda e millefori, e il
pannello «coperchio»): **basetta** (la millefori 7 × 9), **XIAO**, **espansore** (il KAmod),
**pista** GND e 3V3 (le linee di stagno), **pettine** (il connettore di pin sulla basetta),
**linea** (`PA0`…`PB7`), **pannello** (la faccia superiore della scatola), **scatola**,
**cavo** (basetta → pannello), **footswitch** (i 5 a piede), **tasti banco** (i 2 a mano),
**pulsanti** (tutti e 7). Vietati: coperchio, top, rotaia, striscia, modulo. «Bus» solo per
l'I²C. La legenda sta anche in cima alla pagina delle istruzioni, che è
`https://claude.ai/code/artifact/b1b451ca-2804-41a6-810f-b2b4a92d7acd` (sorgente nello
scratchpad, ma **si aggiorna passando quell'url**, o se ne crea una seconda).

**Com'è fatta la basetta** (3 settembre 2026, dalla foto dell'utente — e sono cose che ho
già dovuto richiedere una volta): basetta **7 × 9 cm**, i due moduli su una metà sola e
**l'altra metà libera**, che è dove va tutto quello che manca. **Le due strisce di stagno sono
le rotaie di alimentazione, 3V3 e GND**, saldate per prime: è l'ordine di montaggio deciso il
30 agosto (`docs/pedale.md`), piste prima, misura dei 3,3 V poi, componenti per ultimi. **Il
port A è già portato fuori** su un pettine femmina a 10 vie — `G, PA0…PA7, G` — quindi per i
sette pulsanti **non c'è niente da saldare sulla basetta**: si infilano lì. I fili colorati che
escono sono **del display**. Resta da fare **solo il port B**: le resistenze e il connettore
dei LED.

**Le resistenze dei LED stanno sulla basetta, non sui piedini del LED** (3 settembre 2026), e
sono **una per colore, otto in tutto**, in serie con PB0…PB7. Una sola sul catodo comune non
va: con rosso e verde accesi insieme la corrente si dividerebbe, e i due valori sono diversi.
Il motivo per cui stanno sulla basetta non è l'ordine ma la sicurezza — **così il filo che
esce verso il pannello ha già la corrente limitata**, e se tocca massa mentre si chiude la
scatola non porta via il pin dell'espansore; in più la giunzione volante sui piedini di un LED
montato è quella che si spezza dopo qualche apertura, di solito dentro il termorestringente,
dove non si vede.

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `5`, `6` | I²C: **display e MCP23017 insieme** (SDA, SCL) |
| D0 (A0) | `1` | tensione di batteria — **il partitore va saldato** |
| D6 / D7 | `43`, `44` | UART: il log seriale, **da tenere libero** |
| D1, D2, D3, D8, D9, D10 | `2,3,4,7,8,9` | liberi (D2 è l'unico strapping: si usa per ultimo) |

Quattro cose dell'hardware che fanno danni se le dimentico:

- **il display è I²C a 4 pin** (non SPI a 7, come diceva il preventivo), indirizzo `0x3c`, e
  sul retro ha una trappola scritta in cinese: **`D2` va cortocircuitato o il display non manda
  l'ACK**, e senza ACK il controller I²C **interrompe la trasmissione**. Sull'esemplare
  dell'utente era già chiuso di fabbrica; su un ricambio va rimisurato;
- **l'antenna non è a bordo, e senza non funziona il BLE**: misurato, lo Spark passa da −92 dBm
  a −63 col foglietto u.FL. Se un giorno «ogni tanto non si collega», il primo sospetto è quel
  connettore;
- **la XIAO carica a 50 mA**, quindi **la sua USB non è una via di ricarica**: si carica con un
  **TP4056 dedicato**, a **interruttore generale spento** (non fa load sharing). L'interruttore è
  fisico, sul positivo fra cella e XIAO: **niente auto-spegnimento per inattività**. Le **due
  prese sul pannello vanno etichettate**, che sono identiche e il caricatore in quella sbagliata
  non carica senza dirlo;
- **l'indicatore di batteria è firmware da scrivere**: quattro tacche a soglie, **mai
  percentuali** — la tensione di un litio è piatta nel mezzo — e sotto **3,50 V** un avviso
  impossibile da non vedere.

**La scatola è chiusa e senza incognite: 360 × 120 × 35 mm esterni, pannello utile 340 × 100,
interassi 70 + 70 + 70 + 90**, mogano da 10 e rovere da 5, bozza in `tools/scatola-fusion.py`.
I tre numeri che fanno danni: le **prese USB-C accettano un pannello fino a 8 mm** (la sponda è
10, va svasata dall'interno); il vetrino è **pleksa fumé grafite da 3 mm** e lascia 2 mm di
rovere attorno alla finestra, quindi **il telaietto incollato sotto è obbligatorio**; i **90 mm
fra il quarto e il quinto footswitch sono un riferimento tattile**, non spazio in più. E la
lezione che vale oltre questo pedale: **la spaziatura dei footswitch si misura col proprio
piede** — la mia stima sbagliava del cinquanta per cento.

**Stato**: verificato sull'hardware definitivo (2 settembre 2026) — footswitch premuto, ampli
che cambia preset, display che lo dice, senza telefono in mezzo. BLE sull'S3 **26,5 ms a giro**
con l'intervallo a 7,5 ms, cioè **~424 ms** per un preset intero, contro 82 ms e ~1312 ms con
quello lento: **lo Spark l'intervallo corto lo concede davvero**, e i 1312 ms del telefono sono
il suo intervallo di connessione, non la banda. **Resta non verificato**: l'autonomia, e se il
modulo espansore abbia i pull-up sull'I²C — se il bus non parte, quello è il primo sospetto, e
si risolve con due resistenze da 4,7 kΩ.

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
- Italiano nei commenti e nella UI. **L'inglese ci sarà, ma non adesso**: sono ~270 stringhe,
  93 delle quali messaggi di log, cioè prosa che si riscrive ogni volta che il comportamento
  cambia. Il momento è **quando Preset, Live ed editor smettono di cambiare forma**, e il piano
  (`src/lingua.js`, `data-t`, nessuna libreria) è in `docs/decisioni-ui.md`.
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

**Positive Grid dismette il backup su Dropbox nel 2027** (annunciato a settembre 2026, i
preset vanno sul cloud loro). **Non tocca il nostro sync**, che è una app registrata
dall'utente sul suo Dropbox e non c'entra con l'app ufficiale; tocca solo **da dove si
prende `preset_backup.zip`**, che `spark-backup.js` legge comunque da un file locale —
quindi una copia salvata oggi vale per sempre, e il codice non cambia. Il trasporto vero
dei suoni resta **l'ampli**: «Leggi dall'ampli» e «Importa preset attuale» non dipendono
dal cloud di nessuno. Il ragionamento in `docs/dropbox.md`, «Il backup dell'app
ufficiale».

## Il sito di presentazione — fuori da questo repo

`sparklingtones.com` sta in `C:\Users\massi\sparklingtones-sito`, repo
`mazzrelaz/sparklingtones-sito`: un solo `index.html`, nessuna dipendenza. **L'app non si
sposta lì**, e la ragione è la trappola: un dominio custom su GitHub Pages vale per **l'intero
repo**, quindi porterebbe via anche la PWA installata sul telefono e l'IndexedDB della
libreria. **Prima di ogni push lì, `git pull --rebase`**: il file `CNAME` lo riscrive GitHub.
DNS, la trappola del `www`, la `privacy.html` (già analizzata: niente script, niente banner) e
i video ancora da girare stanno in **`docs/sito.md`**.

## Dove si riprende — 2 settembre 2026

Guscio `v73` (in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi: protocol 139,
transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto da nessuna
suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto. Il racconto
delle sessioni sta in `docs/diario.md`.

Sull'app:

1. **Il tap tempo con l'ampli acceso**: `0x0176` è verificato dalla sonda, **non dall'app**.
   Aprire l'editor, battere, e sentire se il delay ci va dentro.
2. **Editor e vestito con l'ampli acceso, e sul telefono**: girare un pomello, cambiare un
   modello, salvare e riscrivere. Le mie prove sono su schermo largo e su un ampli finto.
3. **Che l'ampli non si pianti più girando le manopole**: la correzione **non è verificata**.
   Se ricapita, la manopola è `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale. Se non entra si guarda
   `trovaPresetUfficiali`, e la cosa da chiedere sono **i primi byte del file**, non
   l'estensione.
5. **Togliere dal catalogo altri modelli che l'ampli non ha**, come fu `TrebleBooster`.
6. **Mettere al sicuro il `preset_backup.zip` che sta su Dropbox**, e importarlo: Positive Grid
   lo dismette nel 2027, ed è **l'unica cosa che scade**.

Sul pedale — il resto in `docs/pedale.md`:

7. **Il pedale fa il pedale** (2 settembre 2026, millefori definitiva e S3 vera): footswitch
   premuto, ampli che cambia preset, display che lo dice, senza telefono in mezzo. **Niente da
   rifare**; restano gli altri sei pulsanti e gli otto LED, le due metà col quinto footswitch,
   il banco che non si ricorda al riavvio (va fatto coi tasti banco veri), il trasferimento di
   un banco da riprovare sull'S3, e **l'autonomia, l'ultima misura mancante**.
8. **La scheda stampata in `pcb/` è accantonata**, deciso dall'utente il 3 settembre 2026: il
   pedale si finisce **sulla millefori**, che è quella che deve funzionare. Quanto c'è nel repo
   — schema e disposizione — resta lì e **non si tocca**: non è materiale di lavoro, e non va
   proposto. Quando si riaprirà, le due cose da fare in quest'ordine sono **stringere il
   contorno** (95 × 60 in un vano di 100 × 64 lascia 2,5 mm per lato) e **misurare col calibro
   gli interassi dei connettori del KAmod (J3, J4, J5, J6), che nel file sono inventati**,
   prima di tirare le piste. `kicad-cli` esporta in SVG e fa girare il DRC senza aprire KiCad;
   gli script `tools/genera-*-kicad.py` non si rigenerano più.
9. **Il looper sul pedale, col conteggio fatto in casa**: il protocollo c'è tutto, manca il
   firmware. Il conteggio col click **non si comanda**, quindi lo produce il pedale — legge il
   bpm, conta quattro tempi e **40 ms prima dell'uno** manda `0x0175` con `04`.

**Discussi e non aperti**, col ragionamento già scritto e da non rifare: il pedale in
**modalità MIDI** (`docs/pedale.md` — e lì stanno le due trappole d'ambiente: Windows non sa
fare BLE-MIDI, PowerShell 5.1 non sottoscrive eventi WinRT); **creare un preset con l'AI**
(`docs/diario.md`); e il trasferimento di un banco che costa ~6 s, che funziona ed è solo
ottimizzazione.
