# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2: web app /
PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32 in `pedale/`.
L'app è pubblicata e funziona; il pedale è cablato, suona e si sta finendo il firmware. `README.md`
racconta il progetto a chi arriva da fuori. **Dove si riprende** è in fondo.

## Questa memoria

Entra intera in contesto a **ogni** sessione: qui solo **ciò che impedisce di fare danni o di
ripercorrere una strada chiusa**, più il lavoro in corso. Il ragionamento sta in `docs/`:

| file | quando aprirlo |
|---|---|
| `docs/pedale-lavoro.md` | **prima di toccare il pedale**: compilare, caricare, mappa, basetta, cosa manca |
| `docs/pedale.md` | si rimette in discussione il pedale (forma, BLE, ponte, MIDI) |
| `docs/protocollo-spark2.md` | protocollo, encoder, scrittura dei preset, Hendrix, NEO |
| `docs/decisioni-ui.md` | una scelta grafica o di flusso; l'inglese; **l'editor con le immagini** (ultima sezione) |
| `docs/dropbox.md` | il sync; la fine del backup ufficiale nel 2027 |
| `docs/looper.md` · `docs/snake.md` | il looper (archiviato) · StompSnake |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | sessioni passate; **le versioni lunghe di questo file** |
| `docs/sito.md` · `docs/sicurezza.md` | `sparklingtones.com` · audit del 17 settembre 2026 |

**I documenti grossi non si leggono interi** (`pedale.md` 173 KB, `decisioni-ui.md` ~90 KB,
`HANDOFF` 45 KB): `grep -n '^#'` per l'indice, poi solo la sezione. **Si sposta, non si butta**:
ciò che si accorcia va parola per parola in `docs/diario.md` (l'ultima il 15 ottobre 2026, da 30 a
~20 KB). Si rimisura con `wc -c CLAUDE.md`: sopra i 30 KB si sfoltisce.

## Struttura

```
index.html                        HTML e l'unico <style>: Preset e Live nello stesso documento
src/app/01-…16-*.js               lo script dell'app, in fila (16: Genera con l'IA)
guida.html / guida.en.html        guida all'uso (guida.css, guida.js); guida-pedale(.en).html
manifest.webmanifest / sw.js      PWA; guscio in cache, offline
src/spark-protocol.js             encoder/decoder puro — il cuore del progetto
src/spark-transport.js            BLE: coda di invio, attesa risposte, lettura preset
src/preset-store.js               libreria IndexedDB: import, backup, banchi, categorie
src/spark-effetti.js              nomi di effetti e manopole + MODELLI
src/spark-backup.js · dropbox-sync.js · pedale-ponte.js · pwa.js · snake-pedali.js
src/lingua.js / lingua-en.js      le lingue (lingua-en.js NON si legge: vedi «L'inglese»)
pedale/prova-ble/                 firmware del pedale (prova-ble.ino + 01-…11-*.ino, banchi.h)
pedale/prova-espansore|usb|display|midi/   sketch di prova (mappatura guidata di pulsanti e LED)
pcb/                              scheda in KiCad, ACCANTONATA: non si tocca e non si propone
tools/                            serve.ps1, server-rete.js, togli-sfondo/, segna-manopole.html, video-demo/
test/*.html                       protocol 147, transport 64, store 151, backup 41, dropbox 38
captures/ reference/ design/      log dell'ampli; sorgenti paulhamsh; proposte grafiche
```

**`tools/explorer.html` è CONGELATO**: le modifiche vanno in `src/`.

**Lo script dell'app sta in `src/app/`, un file per sezione**, caricati in fila da `index.html` come
script classici: const, let e funzioni si vedono fra un file e l'altro, ma **il codice che gira
al caricamento usa solo quello dei file prima**. Un file nuovo va anche nel guscio di `sw.js`.
`index.html` (90 KB) e `10-editor-disegno.js` (~1.700 righe) non si leggono interi.

Niente build, tutto da `file://`: i moduli sono classic script (`window.Spark`, …). **IndexedDB di
`file://`, di https e di ogni indirizzo locale sono origini diverse**: la libreria non passa
dall'una all'altra, si esporta in JSON.

## Trappole dell'ambiente

- **Mai riscrivere un file con `Get-Content`/`Set-Content` di PowerShell 5.1**: ogni accento
  diventa `Ã ` in tutto il file, in silenzio. Rimedio: `git checkout -- <file>`, o rileggere
  come UTF-8 e riscrivere in CP1252.
- **Mai `|` come delimitatore di `s///` in perl su testo con tabelle markdown**: la
  sostituzione finisce in cima al file.
- **Heredoc lunghi in bash si rompono**: testo lungo con Write. **Commit per file**:
  `git -c i18n.commitEncoding=UTF-8 commit -F <file>`. La variabile `$TMPDIR` è vuota: si usa
  il percorso intero dello scratchpad.
- **Il push dalla mia shell** vuole `GIT_TERMINAL_PROMPT=1 GCM_INTERACTIVE=true
  GCM_GUI_PROMPT=true`, che aprono la finestra sul desktop.
- **Python non c'è** (l'alias apre lo Store); **Node sì** (v24): per le modifiche
  ripetitive si scrive uno script nello scratchpad, che deve **conservare le CRLF** dei file.
- **`sed -i` di Git Bash converte le CRLF in LF**: con `core.autocrlf=true` il diff resta
  pulito, ma lo si controlla.
- **Il riquadro del browser** legge i server da `spark/.claude/launch.json` (non dalla cartella
  sopra): `spark-locale` (8099) per le suite e l'app; per una bozza si aggiunge lì, **senza
  committarla**, una voce con `serve.ps1 -Radice <cartella> -Porta 8097`. Il risultato delle suite
  si legge da `#summary` e dai `.fail`.
- **Le bozze** (la grafica si mostra prima di pubblicarla): `git worktree` nello scratchpad; altra
  origine, quindi preset finti, e **il service worker va tolto a ogni ricarica**. Dal telefono:
  `tools/server-rete.js` (vedi «Dove si riprende»). **Il riquadro del browser non apre la scelta
  dei dispositivi Bluetooth**: ampli e pedale veri si provano solo dall'app pubblicata.

**Dopo ogni modifica a `src/`, le suite in `test/` devono restare verdi.** Girano con Edge
headless (poi si cerca `id="summary"`):

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/Progetti%20Claude/spark/test/protocol-test.html'
```

- **`store-test` e `backup-test` no**: si passa da `localhost` (`tools/serve.ps1`), come per
  provare l'app. **Un `file://` nel browser del riquadro non carica gli script.**
- **Lo stdout di Edge headless non torna alla shell**: `Start-Process … -RedirectStandardOutput`,
  anche per `--screenshot`.
- **`requestAnimationFrame` non gira** né nel riquadro né in headless: ciò che si muove usa
  `setInterval`.
- **Il service worker serve a Edge i file vecchi**: query in coda all'url, o profilo nuovo.
- **Nelle schede in secondo piano i timer sono strozzati.**
- **L'avvio dell'app chiude i pannelli** (`applicaVista()` → `chiudiPannelli()`): una prova che
  ne apre uno troppo presto sembra un difetto.

**ESP32**: compilare, caricare (`prova-ble` vuole il giro a 1200 baud) e le trappole della
XIAO stanno in **`docs/pedale-lavoro.md`**. **Il firmware lo compilo e lo carico io, senza
chiedere.** **Lingua del display**: `#define INGLESE` in `prova-ble.ino` (0 italiano, 1 inglese;
2.17, 9 ottobre 2026); ogni scritta nuova del display passa da `TESTO(it, en)`.

## Le regole dell'app

Il perché di ognuna è in `docs/decisioni-ui.md`.

- **La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce per UUID e
  riscrive solo la parte sonora; tag, note, famiglia e ordine restano. Coperto da test.
- **Un nome che c'è già non entra due volte** (7 ottobre 2026, chiesto dall'utente): un preset
  letto con un UUID nuovo ma lo stesso nome di uno in libreria non si copia; lo slot va a quello
  che c'è, il suo suono non si tocca (`_omonimo`, test). Spazi ai bordi, spazi ripetuti e maiuscole non contano (`chiaveNome`:
  sullo schermo due spazi sembrano uno). I doppioni vecchi: «Doppioni» in Altro.
- **Preset e Live stanno nello stesso file e non si separano**: la connessione BLE vive nel
  documento. Si scambiano con una classe sul `body`, guidata dall'hash (`#live`/`#preset`),
  così l'indietro di Android torna ai preset. Verificato sull'hardware.
- **Un solo `<style>`**: regole preset sotto `body:not(.vista-live)`, live sotto
  `body.vista-live`, variabili di colore e media query comprese.

### Sezione Preset

- **Gli otto preset dell'ampli stanno sopra** (A1…B4, rosso banco A, verde B; sul NEO quattro, CH1–CH4), gli altri sotto,
  **mai in tutti e due i posti**. **Sovrascrivere uno slot non perde il preset**:
  `_sistemaSlot` gli toglie lo slot e ricompare sotto; il record non si cancella mai.
- **`slots` è una lista**; `normalizzaSlots` cancella il vecchio `slot`. **`_sistemaSlot(visti)`
  tocca solo gli slot osservati** (un timeout non deve far sparire un preset). Chiave del
  dettaglio: `id:slot`. `store.hardware()` dà otto posti, `null` se ignoti; si confronta **per
  id**.
- **Alla connessione la lettura degli otto slot parte da sola**; intanto i pulsantoni live
  restano spenti.
- **«Elimina tutti i preset» risparmia gli otto dell'ampli** e passa da `remove`, che lascia
  le lapidi.
- **Un preset nuovo non parte mai dal nulla** (Duplica — che cambia UUID —, Importa attuale,
  Importa file): un modello inesistente ha già piantato l'ampli (`TrebleBooster`).
- **Un backup importato da file non applica le lapidi** (`importBackup(…, { lapidi: false })`)
  e chiede conferma: le lapidi valgono solo per il sync Dropbox.
- **«Importa un file» riconosce dal contenuto** (`PK`, campo `presets`, oggetto con `sigpath`):
  l'`<input>` non ha `accept`. Senza `meta.id` l'UUID lo diamo noi.
- **Il bollo «JH»** (effetto Hendrix in catena) sta in **quattro posti, e quattro restano**:
  schede, tendina dei modelli, blocco a fuoco dell'editor, riga di log in `mandaPreset`. Non
  nella vista live (decisione dell'utente) né sul pedale. Nella bozza (16 ottobre): **col
  pacchetto Hendrix dichiarato «no» i bolli spariscono**, perché i preset Hendrix non si vedono.

### Sezione Live

- **Preset già in uno slot: istantaneo con `0x0138`; altrimenti invio intero, ~1 s.**
- **Banchi da otto, quattro a sinistra e quattro a destra** (`grid-auto-flow: column`, quattro
  righe). **Il vestito dei pulsantoni** (16 ottobre 2026, scelto dall'utente in tre giri di bozze):
  fondo nero con le piste di un circuito, **niente LED**; chi non suona ha il bordo sottile grigio
  scuro ed è più scuro; chi suona ha il bordo sfumato azzurro-viola-fucsia, un bagliore che pulsa e la
  corrente che scorre (`immagini/circuito-elettroni.svg`, nel guscio). Tutto in CSS: i pulsanti
  cambiano misura col telefono, un'immagine fissa non va. Niente riga di log sotto.
- **Tenendo premuto 2 secondi un pulsantone si apre l'editor** di quel preset (17 ottobre 2026,
  `pressioneLunga`, `PRESSIONE_EDITOR_MS`): la barretta in fondo si riempie, lasciando prima non
  succede niente, e la pressione lunga non fa suonare il preset al rilascio. Va anche senza ampli
  (editor sulla copia in libreria): **i pulsantoni non sono più `disabled`**, il tocco lo ferma
  `attiva()`. Con l'ampli aprire l'editor manda il preset, quindi suona. Niente nei posti vuoti
  né in «Modifica».
- **Il banco «Ampli» si ricava da `slots`**, non è salvato. I banchi dell'utente
  (`settings.banchi`) **non scrivono mai sull'ampli**: niente «Prepara».

### Editor della catena effetti

- **Le manopole agiscono sul suono che sta suonando.** Con l'ampli, «Regola» manda il preset
  (`loadPreset`) e rilegge lo stato **dall'ampli** (`readLiveState`); **se la rilettura
  fallisce l'editor non si apre**. Niente è salvato fino a «Salva in libreria».
- **Senza ampli si apre sulla copia in libreria** (`inModifica.offline`): niente parte né si
  accoda alla radio; il modello si cambia comunque; **la modalità non cambia più** anche se
  l'ampli arriva dopo.
- **Cambio di modello: prima si copia** (`campioneModello`, da un blocco uscito dall'ampli),
  **poi si costruisce** dalla tabella. Acceso/spento resta com'era.
- **Il tempo sta solo qui**: `preset.bpm`, tap o tasti; con l'ampli parte `0x0176`. Il
  riscontro del tap è il lampeggio del tasto.
- **Invio dei parametri autocadenzato**: il prossimo parte a precedente finito +
  `PAUSA_PARAMETRO` (90 ms). Probabile causa dell'ampli che si pianta, **correzione non
  verificata**; se ricapita: `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
- **Lavoro non salvato**: `inModifica.toccato` (da `segnaModificato()`); «Fatto» e il logo
  chiedono con `chiediPrimaDiUscire()` a **tre vie**. **Se il salvataggio fallisce non si chiude
  niente.** Il segno di salvato lo dà il tasto, mai un messaggio; il tasto non si disabilita.
- La nota Hendrix **è uno stato**: una `.elenco-nota` nella tendina e una `.nota-jh` nel blocco
  a fuoco.
- **Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**;
  `pulisciStatoPannelli()` le nasconde e chi ci scrive la rimostra (`statoDelPannello`).

### Segnala un problema e donazioni

Menu Altro: **mailto a `mazzbackup@gmail.com`** (solo email, scelta dell'utente) con versione,
browser, ampli e le ultime righe del registro, mostrate prima. «☕ Offrimi un caffè» apre
`buymeacoffee.com/mazzgear` con `window.open`: lasciare la pagina farebbe cadere l'ampli.

### Niente finestre né tendine del sistema

**Mai `confirm()`, `alert()`, `prompt()` o `<select>`.** Al loro posto, tutte asincrone:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | `.valore` (non `.value`), `aggiorna(v)` |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | testo o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | `valore` o `null` |

`testo` è HTML: un nome dai dati passa da **`testoConNome()`**. Esc e tocco fuori → `null`.
**Nel menu «Altro» e nel pannellino del bollino nessuna voce si spegne** (un `disabled` non
riceve il clic e il menu non si chiude): senza ampli rispondono con `senzaAmpli(cosa)`.

### L'inglese — lingua secondaria (dal 24 settembre 2026)

**Regola dell'utente: app e sito si cambiano solo in italiano, e la parte inglese non si legge
né si tocca finché non è lui a dire di aggiornarla**: `src/lingua-en.js`, i `*.en.md`
(`README` dei due repo, protocollo), `sparklingtones-sito/en/`. Grep li salta da solo
(`.ignore`, verificato; Glob ne mostra solo i nomi); con Read o `rg --no-ignore` ci si arriva
lo stesso, quando serve.

- **Ogni testo nuovo dell'app passa da `tr`** (`src/lingua.js`): `tr('…')`, `` tr`…${x}…` ``,
  o `tr('… {0} …' + '…', x)`. **Frasi intere**, i valori nei segnaposto. L'HTML scritto non
  vuole niente: lo traduce `Lingua.traduciPagina()`. Una frase senza traduzione esce in
  italiano anche in inglese: è il patto, non un difetto.
- Come si aggiorna l'inglese (`tools/lingua.html`), come si sceglie la lingua, il sito e cosa
  non è tradotto: `docs/decisioni-ui.md`, «La decisione sull'inglese».

### Nomi di effetti e manopole (`src/spark-effetti.js`)

- Dal catalogo **Soundshed** (MIT): sono proposte, un nome scritto a mano vince. **Il credito a
  Soundshed non si toglie.** I nomi dei parametri li dà l'utente, per modello.
- **L'ordine sullo schermo non è quello degli indici**: Gain, Bass, Middle, Treble, Master, ma gli
  indici sono `Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Due test.
- **`MODELLI` è verificato contro l'app ufficiale** (26 agosto 2026): un nome nuovo si verifica
  allo stesso modo. **Il «BPM» di delay e Tremolator è un interruttore** (0 o 1). Gli Hendrix
  stanno in fondo a ogni tendina.

## Protocollo — quello che non va dimenticato mai

Dettaglio in `docs/protocollo-spark2.md`. GATT: service `0xFFC0`, write `0xFFC1`
(**writeWithoutResponse only**), notify `0xFFC2`; notifiche da riassemblare fra `F0` e `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`. **Completo e verificato**:
`0x0201` lettura, `0x0138` cambio preset, `0x0115` on/off, `0x0104` parametro, `0x0101` preset
intero, `0x0176` bpm, `0x0175` looper.

**Trappole, tutte verificate sull'hardware:**

- **`0x0115`, `0x0104`, `0x0106` vogliono un `0x00` in coda**, altrimenti ack e niente.
  `0x0138`, `0x0175`, `0x0176` no — e su `0x0176` il byte in più **fa partire il delay in
  ripetizione infinita**: un payload malformato muove cose che non c'entrano.
- **Il bpm si costruisce dall'ultimo `0x0376` ricevuto**, mai da una costante.
- **L'ack conferma la ricezione, non l'esecuzione**; l'assenza di errori non è una verifica.
  La catena riletta conferma il nome del modello, non che suoni.
- **Chunk da 25 byte di payload** (128 disconnette), **tutti con lo stesso seq**; **write BLE
  spezzate a 20 byte** (`sendSpezzato`): sopra ~44 una write sparisce in silenzio.
- **`0x0127` non salva sullo Spark 2.** Un parametro di un effetto spento non suona.
- **`0x0106` vuole il nome del modello di adesso**, riletto: se sbagliato, ogni cambio
  successivo fallisce per sempre.
- **Un modello che l'ampli non ha lo pianta**: `mandaPreset` chiama `controllaPreset` con
  `{ modelli: SparkEffetti.MODELLI.flat() }`, e un nome fuori elenco non parte.
- **L'ampli si può piantare** (si stacca la corrente). `rxTotali` = 0 → ampli muto o
  connessione morta; > 0 → siamo noi a scartare.

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

Senza il giro via e ritorno lo slot riporta il contenuto vecchio. `loadPreset` non tocca
nessuno slot. Mentre suona il preset software il LED dell'ampli lampeggia. **8 slot, 0–7**, con
4 LED bicolore: rosso A (0–3), verde B (4–7); `Spark.slotLabel(n)`.

**Gli Hendrix (`JH.*`) suonano solo dopo lo sblocco dell'app ufficiale** (license key
`0x0170`, firmata e **non forgiabile**; lo sblocco resta nell'ampli). Il login dalla nostra app
non serve (misurato). **Cavare la chiave dall'app ufficiale non si fa.** Non è un difetto
nostro. I comandi non richiedono autenticazione (misurato).

**Looper**: `0x0175` + un byte (`04` rec, `05` stop rec, `08` play, `09` stop, `0b` dub, `0c`
stop dub, `0a` delete); si leggono `0x0377`, `0x0363`, `0x0376`. **Il conteggio col click non
si comanda** (`02` ignorato). **Non aggiungere sonde sui byte**: l'unica strada rimasta è
chiedere a Ignitron. Tutto in `docs/looper.md`.

**Metodo**: una cattura d'ascolto dice cosa l'ampli racconta, non cosa accetta; si registra
prima e si interpreta dopo; i dati finti sono marcati `demo` e non finiscono nelle catture;
si verifica rileggendo dall'ampli, una variante alla volta; **strumentare prima di ipotizzare**.

## Il pedale ESP32

Ragionamento in **`docs/pedale.md`**, lavoro in **`docs/pedale-lavoro.md`**. È la vista live
staccata dal telefono: prende i banchi dall'app, poi va da solo con lo Spark. Quattro footswitch =
i quattro suoni della metà corrente, il quinto cambia metà senza toccare il suono, due tasti banco.

**Le regole che non si toccano:**

- **Mai scrivere sugli slot hardware.** I banchi suonano con `0x0101` su `0x7f` + `0x0138` con
  `0x7f` (il LED dell'ampli lampeggia, ed è giusto). L'**«Amp Preset»** si legge dall'ampli a ogni
  collegamento e si suona **selezionando lo slot** con `0x0138` (4 ottobre 2026, verificato).
- **Banchi da fuori**: `frameAccettabile()` in `banchi.h` accetta solo frame `0x0101` verso
  `0x7f`, e **il ponte BLE parte chiuso** (due tasti banco per 1,5 s, due minuti; si chiude quando
  l'app si stacca, 2.23).
- **L'app preserializza**: il firmware patcha solo il seq. **Eccezione: sul NEO il pedale ridivide
  il payload a pezzi da 128** (`mandaPresetNeo`). **Mai sullo Spark 2: i 128 lo disconnettono.**
- **Un padrone alla volta**: con l'ampli connesso al pedale il browser non lo trova. **Se un
  footswitch non fa niente, primo sospetto: l'app ancora collegata al pedale.**
- **Mai operazioni BLE dentro un callback BLE** (NimBLE si blocca): bandiera, e lavoro nel `loop()`.
- **Nessuna attesa bloccante che non guardi gli ingressi**; vince l'ultima pressione;
  l'antirimbalzo aspetta che il segnale stia fermo. **Web Bluetooth: una operazione GATT per volta.**
- **Il formato del banco sta in `src/pedale-ponte.js` e `banchi.h`, che cambiano insieme**, impronta
  compresa (FNV-1a 32 bit, `bancoImpronta` / `impronta`). `banchi.h` legge byte non nostri:
  offset e lunghezze vanno verificati.
- **La mappa di pulsanti e LED non si scrive a mente** (mappatura guidata di `prova-espansore`, e
  si chiede la foto). **I nomi dei pezzi sono fissi** (basetta, XIAO, espansore, pista, pettine,
  linea, pannello, scatola, cavo, piastrina LED, footswitch, tasti banco, pulsanti; vietati
  coperchio, top, rotaia, striscia, modulo).

## StompSnake

Snake in «Fai una pausa», in `src/snake-pedali.js`: **non tocca niente dell'app**, record in
`localStorage`. Il resto in `docs/snake.md`.

## Convenzioni

- **I commit li faccio io**, quando un pezzo sta in piedi e le suite sono verdi; messaggi in
  italiano su cosa cambia e perché. **I commit visibili si pushano senza chiedere**: l'utente
  guarda l'app pubblicata. **Eccezione, la grafica** (colori, sfondo, disposizione; 14 ottobre
  2026): prima una bozza da guardare, si pubblica solo dopo il suo sì.
- **All'utente: cosa è successo e cosa cambia per lui**, istruzioni passo passo; il racconto va
  in `docs/`.
- **In locale la libreria è vuota** (altra origine): preset finti con
  `store.importFromAmp([...])`.
- **Questa memoria la aggiorno io**, sempre a fine sessione; si registrano anche le ipotesi
  escluse da misure. Si segna sempre cosa è verificato sull'hardware.
- Italiano in commenti e UI; la UI ha anche l'inglese, secondario (vedi «L'inglese»). Byte
  in hex minuscolo separato da spazi.

## Dropbox e sito

**Sync Dropbox** funziona (OAuth PKCE senza server, backup versione 2, lapidi): `docs/dropbox.md`.
**`sparklingtones.com`** sta in `..\sparklingtones-sito`: **l'app non si sposta lì**, e **prima di
ogni push lì `git pull --rebase`** (GitHub riscrive `CNAME`). Il resto in `docs/sito.md`.

## Dove si riprende — 17 ottobre 2026

**Pubblicato il 16 ottobre 2026 (sera): l'editor con le immagini dei blocchi** (ramo
`bozza-editor-grafico` unito in `main`, guscio `v109`). Ogni modello ha la sua immagine (89, in
`immagini/blocchi/`; tabella e misure in `src/spark-immagini.js`; i riverberi una per tipo, voce
`'bias.reverb:<tipo>'`); le manopole si girano sull'immagine, il modello si sceglie col doppio tocco
sul tassello; «Pacchetto Jimi Hendrix: sì/no» in Impostazioni (`haHendrix()`). **L'utente lo prova
per un po': la guida non si tocca finché non lo dice lui** (è rimasta all'editor vecchio). **Da
verificare a orecchio**: quale posizione della levetta sia Limit (LA Comp), -15 dB (Optical Comp), HP
(SAB Driver) e Chorus (UniVibe); nel wah, 1/2 = 0,5 e il tempo lineare. Il Silver 120 forse da rifare
nello stile nuovo. **Un'immagine nuova o rifatta** arriva senza manopole, col puntino bianco al centro
e lo sfondo nero: `tools/togli-sfondo/misura.ps1` (centri, spia, anelli) ed `esegui.ps1` (sfondo, 900
px, WebP), misure spostate del taglio e per la scala, cerchi controllati sull'originale, voce in
`TABELLA`, prova nell'editor. Le genera l'utente con `tools/genera-immagini.html` (API OpenAI; una
copia generica sta sul suo Desktop, «Genera immagini.html»). Copia delle finite in `Progetti
Claude\Spark immagini finite` (fuori dal repository, non si aggiorna da sola). **Provato e
scartato**: un colore solo per la catena (restano i colori per famiglia, con l'alone più piccolo del
tassello scelto). Tempo e OFFLINE in blu; l'insegna col nome del preset sempre bianca (non segue più la famiglia). Il worktree della bozza non serve più. Dettaglio in
`docs/decisioni-ui.md`, ultime sezioni; la versione lunga di questo paragrafo in `docs/diario.md`.

**Provato dall'utente il 15 ottobre col pedale e l'ampli veri: «funziona tutto»** (interfaccia del
14, banchi da aggiornare, firmware **2.23** sulla XIAO). Guscio `v118` (17 ottobre): **«Genera con l'IA»** (`16-genera-ia.js`), **nascosta**: la voce del menu Altro compare solo dopo «Funzioni nascoste» in Impostazioni, con la password dell'utente (nel codice solo l'impronta SHA-256; la password **non si scrive mai** nel repository). Giudizio dell'utente: «non fa miracoli ma non è male». OpenAI (Luna/Sol/Astra, Sol predefinito; **misurato: Sol 1 centesimo, Astra 7-8**) o Anthropic (Haiku/Sonnet/Opus 5.5, Opus predefinito, `fallbacks: "default"`; **Anthropic mai provato con una chiave vera**), chiavi dell'utente in `localStorage`, spiegazione e disclaimer nel pannello. **Trappola**: `hidden` su un `button` del menu o `.imp-voce` non basta, il loro `display` lo batte (regola apposta), risposta a schema con `enum` dei MODELLI, preset costruito sopra uno vero della libreria come il Duplica, salvato solo con «Salva in libreria». **Impostazioni a riquadri** (classi `imp-*`, una voce per riga, scelte a due posizioni rosse, logo in cima), **la scheda del preset senza l'elenco degli effetti** sotto il nome (tolte `pastiglieCatena` e `.chips`); **lo sfondo dell'editor e della vista Live è un'immagine dell'utente** (`immagini/sfondo-editor.jpg`; sul PC alla sua altezza, al centro, sfumata ai lati: «cover» sgranava). **Niente «trascina in giù per ricaricare»** (`overscroll-behavior-y:none` su `html, body`): una strisciata per sbaglio ricaricava e faceva cadere l'ampli. **Nella vista Live non c'è più la riga di log** sotto i pulsantoni (`#logLive`, tolta su richiesta dell'utente): i messaggi stanno solo nel registro. **`guida.en.html`** è
rimasta alle schermate vecchie.

**Ferme per scelta dell'utente, non riaprirle finché non lo fa lui**: la modalità MIDI del pedale
(niente altre funzioni MIDI); il tap tempo con l'ampli acceso. **Collaudi ancora aperti** (editor
con l'ampli sul telefono, l'ampli che si pianta girando le manopole, «Importa un file» con un
preset vero, il NEO), **discussi e non aperti**, e il resto del pedale: `docs/diario.md`, estratto
del 15 ottobre (sera), e `docs/pedale-lavoro.md`.

**La cronologia di git è stata riscritta il 17 settembre 2026** (tolta la license key). **Mai più
catture o strumenti con la chiave `0x0170` nel repository.** I progetti stanno in
`C:\Users\massi\Progetti Claude` (copia ogni ora in `Desktop\Cloud Backup`, su Google Drive).
