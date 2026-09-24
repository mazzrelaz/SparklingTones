# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2: web app /
PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32 in `pedale/`.
L'app è pubblicata e funziona; il pedale è cablato, suona e si sta finendo il firmware. `README.md`
racconta il progetto a chi arriva da fuori. **Dove si riprende** è in fondo.

## Questa memoria

Entra intera in contesto a **ogni** sessione: qui resta solo **ciò che mi impedisce di fare
danni o di ripercorrere una strada chiusa**, più il lavoro in corso. Il ragionamento sta in
`docs/`, da aprire solo quando si rimette in discussione quella cosa:

| file | quando aprirlo |
|---|---|
| `docs/pedale.md` | si lavora sul pedale: forma, ferramenta, scatola, BLE, ponte, simulatore, MIDI, cablaggio |
| `docs/protocollo-spark2.md` | protocollo, encoder, scrittura dei preset, Hendrix |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso; il piano per l'inglese |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto; la fine del backup ufficiale nel 2027 |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata; le versioni lunghe di questo file |
| `docs/sito.md` | si tocca `sparklingtones.com` |
| `docs/sicurezza.md` | audit del 17 settembre 2026, tutti e sei i punti corretti |

**Si sposta, non si butta**: ogni sfoltita copia parola per parola in `docs/` ciò che accorcia
(l'ultima il 17 settembre 2026, da 52 a 25 KB). **Si rigonfia in due settimane**: si rimisura
con `wc -c CLAUDE.md`, e sopra i 40 KB si sfoltisce.

## Struttura

```
index.html                        tutta l'app: sezione Preset e sezione Live, stesso documento
live.html                         rimando a index.html#live
manifest.webmanifest / sw.js      PWA; guscio in cache, offline
src/spark-protocol.js             encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js            BLE: coda di invio, attesa risposte, lettura preset
src/preset-store.js               libreria IndexedDB: import, backup, banchi, categorie
src/spark-effetti.js              nomi di effetti e manopole + MODELLI (catalogo Soundshed)
src/spark-backup.js               legge preset_backup.zip dell'app ufficiale
src/dropbox-sync.js               sync della libreria: OAuth PKCE, niente server
src/pedale-ponte.js               sponda app del ponte BLE verso il pedale
src/pwa.js / src/snake-pedali.js  service worker; StompSnake
src/lingua.js                     le lingue: tr() e la traduzione dell'HTML all'avvio
src/lingua-en.js                  l'inglese — NON si legge (vedi «L'inglese»)
pedale/prova-ble/                 firmware del pedale (banchi.h, preset_frames.h)
pedale/prova-espansore/           pulsanti e LED: mappatura guidata e prova a mano
pedale/prova-usb|display|midi/    altri sketch di prova
pcb/                              scheda in KiCad, ACCANTONATA: non si tocca e non si propone
tools/                            simulatore, generatori, sonde, serve.ps1, script scatola
test/*.html                       protocol 143, transport 60, store 139, backup 41, dropbox 38
captures/ reference/ design/      log dell'ampli; sorgenti paulhamsh; proposte grafiche
```

**`tools/explorer.html` è CONGELATO** (copia propria del protocollo, single-file per il
telefono): le modifiche vanno in `src/`.

**`index.html` è 265 KB, ~75.000 token: mai leggerlo intero.** `grep -n '^/\* ==='` dà
l'indice del JavaScript, poi `sed -n 'a,bp'` sulla sola sezione.

Niente build, tutto da `file://`: i moduli sono classic script (`window.Spark`, …), perché gli
ES module lì sono bloccati. **IndexedDB di `file://` e di https sono due origini diverse**: la
libreria non passa dall'una all'altra, si esporta in JSON.

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
- **Per le suite su `localhost`** c'è `spark-locale` in `.claude/launch.json` (il riquadro
  del browser); il risultato si legge da `#summary` e dai `.fail`.

**Dopo ogni modifica a `src/`, le suite in `test/` devono restare verdi.** Girano con Edge
headless (poi si cerca `id="summary"`):

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/spark/test/protocol-test.html'
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

**ESP32** (dettaglio in `docs/pedale.md`): sulla **XIAO S3 l'fqbn giusto è
`CDCOnBoot=default`**; **aprire la porta seriale resetta il chip**, e con RTS lo manda in
download mode, da cui si esce staccando il cavo; **`Serial.print` si blocca se nessuno legge**
→ `Serial.setTxTimeoutMs(0)`, e misurare tempi da collegati può nascondere il difetto;
**il flussante residuo fa scaldare i chip**: si pulisce prima di dare corrente, e quando un
componente scalda si guarda intorno a lui; **le librerie Arduino non vanno in `Documenti`**
(Defender).

**Il firmware lo compilo e lo carico io, senza chiedere.** `upload` non accetta `--libraries`:

```
CLI='C:\Users\massi\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
& $CLI compile -u -p COM13 --fqbn "esp32:esp32:XIAO_ESP32S3:CDCOnBoot=default" `
    --libraries C:\Users\massi\AppData\Local\claude-arduino-libs pedale\prova-espansore
```

La porta la dà `board list` (COM13 finora). Porta occupata = monitor seriale dell'IDE aperto.
**Caricare riavvia la XIAO**: quello che lo sketch tiene in RAM si perde.

**`prova-ble` dal 24 settembre 2026 si compila con `USBMode=default,CDCOnBoot=default`**
(USB-OTG TinyUSB, per la modalità MIDI; con l'altro fqbn non compila, apposta). La porta USB
diventa **«SparkPedale MIDI» + una seriale** (COM3), e `-u` da solo non basta più. Si carica
così, **verificato**: aprire la seriale del pedale a **1200 baud** e chiuderla
(`New-Object System.IO.Ports.SerialPort 'COM3',1200`, `Open()`; l'errore «dispositivo
inesistente» è normale, la porta sparisce perché la XIAO si riavvia) → ricompare **COM13**, il
caricatore → `upload -p COM13`. **Finché non si carica, il pedale è fermo** in download mode.

## Le regole dell'app

Il perché di ognuna è in `docs/decisioni-ui.md`.

- **La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce per UUID e
  riscrive solo la parte sonora; tag, note, famiglia e ordine restano. Coperto da test.
- **Preset e Live stanno nello stesso file e non si separano**: la connessione BLE vive nel
  documento. Si scambiano con una classe sul `body`, guidata dall'hash (`#live`/`#preset`),
  così l'indietro di Android torna ai preset. Verificato sull'hardware.
- **Un solo `<style>`**: regole preset sotto `body:not(.vista-live)`, live sotto
  `body.vista-live`, variabili di colore e media query comprese.

### Sezione Preset

- **Gli otto preset dell'ampli stanno sopra** (A1…B4, rosso banco A, verde B), gli altri sotto,
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
  nella vista live (decisione dell'utente) né sul pedale.

### Sezione Live

- **Preset già in uno slot: istantaneo con `0x0138`; altrimenti invio intero, ~1 s.**
- **Banchi da otto, quattro a sinistra e quattro a destra** (`grid-auto-flow: column`, quattro
  righe). Ogni pulsantone ha un LED verde, anche vuoto.
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
**Nella tendina «⋯» nessuna voce si spegne** (un `disabled` non riceve il clic e la tendina non
si chiude): senza ampli rispondono con `senzaAmpli(cosa)`.

### L'inglese — lingua secondaria (dal 24 settembre 2026)

**Regola dell'utente: app e sito si cambiano solo in italiano, e la parte inglese non si
legge né si tocca finché non è lui a dire di aggiornare anche l'inglese.** Quindi mai aprire
`src/lingua-en.js` né `sparklingtones-sito/en/`, e nelle ricerche escluderli
(`--glob '!src/lingua-en.js'`, `--glob '!en/**'`). Il perché del disegno è in
`docs/decisioni-ui.md`, «La decisione sull'inglese».

- **Ogni testo nuovo dell'app, scritto in italiano, passa da `tr`** (`src/lingua.js`):
  `tr('…')`, `` tr`…${x}…` ``, o `tr('… {0} …' + '…', x)` per le frasi lunghe. I moduli di
  `src/` hanno già il ripiego (senza `lingua.js` resta l'italiano: test e strumenti non
  cambiano). **Il testo scritto nell'HTML non vuole niente**: lo traduce
  `Lingua.traduciPagina()` all'avvio, anche un paragrafo con grassetti e link, intero.
- **La chiave è la frase italiana**: una frase nuova o cambiata, finché non ha traduzione,
  esce in italiano anche in inglese. È il patto, non un difetto.
- **Frasi intere, mai pezzi cuciti**: i valori nei segnaposto, così l'inglese li sposta. Un
  nome mostrato che nasce in una costante (`Spark.CATENA`, `GRUPPI_AMPLI`, `NOME_EXTRA`)
  passa da `tr` dove nasce o dove si mostra.
- **Quando l'utente dice di aggiornare l'inglese**: `tools/lingua.html` (Edge headless con
  `--allow-file-access-from-files`, poi `#riassunto` e `#mancanti`) dà le frasi mancanti,
  quelle non più usate e quelle con segnaposto o tag diversi; si completa `lingua-en.js`, e
  le pagine `en/` del sito si rifanno dalla versione italiana.
- La lingua sta in `localStorage` (`lingua`), altrimenti è quella del browser (non italiano
  → inglese); `?lang=en|it` la sceglie da fuori, e i link del sito la passano. Si cambia in
  cima al pannello «Altro» e **ricarica la pagina** (con l'ampli collegato chiede prima).
- Il sito ha `en/index.html` ed `en/privacy.html`, copie tradotte **senza script** (la
  privacy lo promette): la lingua si cambia con un link, hreflang le accoppia.
- Non tradotti: il firmware del pedale, `README.md`, `docs/`, il manifest, `live.html`.

### Nomi di effetti e manopole (`src/spark-effetti.js`)

- Dal catalogo **Soundshed** (MIT): sono **proposte**, in corsivo; un nome scritto a mano vince;
  `manopola()` scarta la riga se dichiara più manopole di quelle mandate. **Il credito a
  Soundshed non si toglie** (domanda chiusa).
- **L'ordine sullo schermo non è quello degli indici**: si legge Gain, Bass, Middle, Treble,
  Master, ma gli indici sono `Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Due test.
  `quante` = manopole vere; i parametri in più sono l'acceso/spento del blocco.
- **I nomi dei parametri li dà l'utente**, per modello (`settings.nomiParametri`);
  `importBackup` li **aggiunge**, non sovrascrive.
- **`MODELLI` è verificato contro l'app ufficiale** (26 agosto 2026). **Un nome nuovo si
  verifica allo stesso modo** (elenco ufficiale o preset uscito dall'ampli); una voce nuova
  dell'elenco non è per forza un modello nuovo (l'«Auto Wah» è `JH.Vox846`).
- Gli Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»
  (`SparkEffetti.GRUPPO_HENDRIX`).

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

Tutto il ragionamento in **`docs/pedale.md`**. Qui il minimo per non fare danni.

**Cos'è**: la vista live staccata dal telefono; prende i preset dall'app, poi va da solo con lo
Spark. Solo preset. Sta in questo repo perché app e firmware si cambiano nello stesso commit.
**Comandi**: quattro footswitch = i quattro suoni della metà corrente; il quinto **cambia metà
senza toccare il suono**; due tasti banco a mano. Quattro LED bicolore **tutti insieme**, rosso
A, verde B; se la metà mostrata non è quella che suona, LED spenti e l'OLED dice **♪** cosa
suona.

**Le regole che non si toccano:**

- **Mai gli slot hardware**: ogni cambio è `0x0101` su `0x7f` + `0x0138` con `0x7f`. Due soli
  comandi, nessun parser; il LED dell'ampli lampeggia sempre, ed è giusto. **E adesso è vero
  anche coi banchi che arrivano da fuori**: `frameAccettabile()` in `banchi.h` accetta solo
  frame `0x0101` verso `0x7f`, e **il ponte BLE parte chiuso** — si apre coi due tasti banco
  insieme per 1,5 s, due minuti alla volta (`docs/sicurezza.md`).
- **L'app preserializza**: il firmware patcha solo il seq (indice 2; il checksum non lo copre).
- **Un padrone alla volta**: con l'ampli connesso al pedale il browser non lo trova. **Se un
  footswitch non fa niente, primo sospetto: l'app ancora collegata al pedale.**
- **Mai operazioni BLE dentro un callback BLE** (NimBLE si blocca): bandiera, e lavoro nel
  `loop()`.
- **Nessuna attesa bloccante che non guardi gli ingressi**; vince l'ultima pressione;
  **l'antirimbalzo aspetta che il segnale stia fermo**.
- **Web Bluetooth: una sola operazione GATT per volta**, il banco entra in coda come blocco.
- **Il formato del banco sta in `src/pedale-ponte.js` e `pedale/prova-ble/banchi.h`, che
  cambiano insieme.** `banchi.h` legge byte non nostri: offset e lunghezze vanno verificati.

**Ferramenta**: **XIAO ESP32-S3** (l'unica con USB-OTG, per il MIDI), OLED **2,42" I²C**
(`0x3c`), espansore **KAmod I2C-IOexp16** (MCP23017, `0x20`), cella **XTAR 18650 protetta**, LED
RGB 5 mm **a catodo comune**. **L'MCP23017 non ha PWM**: la luminosità la fissano le
resistenze, **330 Ω rosso, 560 Ω verde**, scelte dall'utente col LED in mano (il verde più alto
è voluto). **Una resistenza per colore, otto, sulla piastrina LED**; una sola sul catodo non va.
Il filo pettine→piastrina non è limitato: lontano dal metallo dei footswitch. **Pulsanti sul
port A** (l'interrupt), **LED sul port B**.

**I nomi dei pezzi sono fissi** (chiesto dall'utente): **basetta**, **XIAO**, **espansore**,
**pista** (GND, 3V3), **pettine**/connettore, **linea** (`PA0`…`PB7`), **pannello**,
**scatola**, **cavo**, **piastrina LED**, **footswitch** (5), **tasti banco** (2), **pulsanti**
(7). Vietati: coperchio, top, rotaia, striscia, modulo; «bus» solo per l'I²C. Pagina delle
istruzioni: `https://claude.ai/code/artifact/b1b451ca-2804-41a6-810f-b2b4a92d7acd`
(si aggiorna passando quell'url).

**La mappa di pulsanti e LED non si scrive a mente e non si dà per buona**: è cambiata quattro
volte, perché l'utente rifà i cablaggi. Si prende da **`prova-espansore`**: **due pulsanti
qualsiasi tenuti insieme 1,5 s** avviano la mappatura guidata (pulsanti in ordine, poi ogni
linea `PB` con la risposta col footswitch del LED acceso, il quinto per «niente», e il colore
coi tasti banco); **la schermata finale resta ferma: si chiede la foto**. Dalla seriale no: la
mappa sta in RAM e aprire la porta riavvia. **«Niente» su una linea = filo staccato.** Le
tabelle vanno in `LINEA_PULSANTE`, `LINEA_ROSSO`, `LINEA_VERDE` di `prova-espansore`, e il
firmware vero le prende da lì. **Mappa del 18 settembre 2026** (basetta coi JST, tutto verificato):

| pulsante | FS1 | FS2 | FS3 | FS4 | FS5 | banco SX | banco DX |
|---|---|---|---|---|---|---|---|
| linea | `GPA4` | `GPA5` | `GPA6` | `GPA3` | `GPA7` | `GPA1` | `GPA0` |

**LED 1 = `PB5` rosso / `PB4` verde, LED 2 = `PB7`/`PB6`, LED 3 = `PB1`/`PB0`, LED 4 =
`PB3`/`PB2`.** `GPA2` libero.

**La basetta** (rifatta dall'utente il 17 settembre 2026): millefori, XIAO in alto a sinistra,
espansore in alto a destra con un condensatore, piste nude in alto e in basso. **Connettori
JST-XH** al posto dei Dupont, che si allentavano (massa del LED 2 staccata). XH e non PH: il
passo 2,50 entra nella millefori. Il kit (DxCRIMP) arriva a 5 poli: footswitch 5 (`G` +
FS1…FS4), 4 poli per `G` + FS5 + tasti banco, LED due da 5, display 4. **Ogni connettore ha la
sua `G`**; quelli uguali si segnano. **Morsetto verde per la cella**, rosso `+` e marrone `−`
verso le piazzole `BAT` sotto la XIAO: **polarità misurata** (~4 V dal caricabatterie della
XIAO anche senza cella).

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `5`, `6` | I²C: display ed espansore (SDA, SCL) |
| D0 (A0) | `1` | tensione di batteria — **il partitore va saldato** |
| D6 / D7 | `43`, `44` | UART del log, **da tenere libero** |
| D1, D2, D3, D8, D9, D10 | `2,3,4,7,8,9` | liberi (D2 è strapping: per ultimo) |

**Hardware che fa danni se lo dimentico:**

- **Il display vuole `D2` chiuso sul retro**, o non manda l'ACK (su un ricambio si rimisura).
- **Senza l'antenna u.FL il BLE non va** (−92 contro −63 dBm): «ogni tanto non si collega» →
  quel connettore.
- **La XIAO carica a 50 mA**: si ricarica col **TP4056**, a **interruttore spento** (niente load
  sharing). L'interruttore è fisico, sul positivo fra cella e XIAO. **Le due prese USB sul
  pannello vanno etichettate**, e quella di carica dice **«solo USB-A»**: il TP4056 comprato
  (HW-373) **non ha le 5,1 kΩ sui CC**, quindi da un caricatore USB-C con cavo C→C non carica
  e non accende nemmeno la spia (misurato il 23 settembre 2026). **Il modulo è montato
  diretto**, con la sua presa affacciata alla sponda — deciso il 23 settembre, dopo che le
  prese da pannello non ci stavano — quindi va **bloccato dietro il pannello**: gli strattoni
  del cavo arrivano alle sue saldature.
- **Indicatore di batteria da scrivere**: quattro tacche, **mai percentuali**, avviso sotto
  **3,50 V**.
- **Pull-up I²C dell'espansore non verificati**: se il bus non parte, due 4,7 kΩ.
- **Il laser dell'utente non taglia il plexi** (fonde): il plexi si riga e si spezza. **Nei suoi
  DXF i fori sono nominali, il kerf li allarga di ~3 decimi**: mai concludere dal DXF che un
  foro è stretto.

**Scatola**: 360 × 120 × 35 esterni, pannello utile 340 × 100, **interassi 70 + 70 + 70 + 90**
(i 90 sono un riferimento per il piede), mogano 10 e rovere 5, `tools/scatola-fusion.py`. Le
**prese USB-C accettano 8 mm** (la sponda da 10 va svasata dentro); **vetrino in plexi da 3
incollato sotto**, finestra **smussata a 45°**, **mai cianoacrilica**. La spaziatura dei
footswitch si misura col piede.

**Stato**: il pedale fa il pedale (2 settembre 2026: footswitch, ampli che cambia, display),
~424 ms per un preset intero sull'S3. **Non verificati**: l'autonomia, i pull-up I²C.

## StompSnake

Snake in «Fai una pausa». **Non tocca niente dell'app** (solo `SnakePedali.apri()`); record e
«muto» in `localStorage`, non in `settings`. Vive in `src/snake-pedali.js`, ciclo a
`setInterval`, banco di prova `tools/snake-banco.html`. Il resto in `docs/snake.md`.

## Convenzioni

- **I commit li faccio io**, quando un pezzo sta in piedi e le suite sono verdi; messaggi in
  italiano su cosa cambia e perché. **I commit visibili si pushano senza chiedere**: l'utente
  guarda l'app pubblicata.
- **All'utente: cosa è successo e cosa cambia per lui**, istruzioni passo passo; il racconto va
  in `docs/`.
- **In locale la libreria è vuota** (altra origine): preset finti con
  `store.importFromAmp([...])`.
- **Questa memoria la aggiorno io**, sempre a fine sessione; si registrano anche le ipotesi
  escluse da misure. Si segna sempre cosa è verificato sull'hardware.
- Italiano in commenti e UI; la UI ha anche l'inglese, secondario (vedi «L'inglese»). Byte
  in hex minuscolo separato da spazi.

## Dropbox e sito

**Sync Dropbox**: funziona (verificato 24 agosto 2026), OAuth **PKCE senza redirect** e senza
server, backup **versione 2** con banchi e **lapidi che non vincono sempre** (un preset toccato
dopo resta). L'app key la registra l'utente, una volta per apparecchio. **Positive Grid chiude
il suo backup su Dropbox nel 2027**: non tocca il nostro sync, solo da dove si prende
`preset_backup.zip`. Tutto in `docs/dropbox.md`.

**`sparklingtones.com`** sta in `C:\Users\massi\sparklingtones-sito`
(`mazzrelaz/sparklingtones-sito`). **L'app non si sposta lì**: il dominio custom vale per
l'intero repo e porterebbe via PWA e libreria. **Prima di ogni push lì, `git pull --rebase`**
(GitHub riscrive `CNAME`). Il resto in `docs/sito.md`.

## Dove si riprende — 24 settembre 2026

**L'inglese è fatto** (24 settembre 2026): app e sito, con la scelta della lingua, pubblicati.
Da qui vale la regola di «L'inglese»: si lavora in italiano, e l'inglese resta indietro
finché l'utente non dice di aggiornarlo.

**Sulla XIAO c'è `prova-ble`, il firmware vero. La ferramenta è finita, il pedale no.** Fa i quattro suoni
della metà mostrata, il quinto footswitch cambia metà senza toccare il suono, i tasti banco
girano fra il banco del firmware e quelli in memoria, i LED dicono cosa suona, il banco si
ricorda allo spegnimento, il ponte si apre coi due tasti banco e il trasferimento di un banco
dall'app funziona (4 KB in 1,5 s). **Tutto verificato sul pedale il 24 settembre.**

Due difetti di quel giorno, da non riscoprire: **su NimBLE i servizi GATT si registrano alla
prima accensione dell'annuncio**, e farlo con l'ampli già collegato non riesce (il browser
diceva «No Services matching UUID») — per questo l'annuncio si accende un attimo all'avvio e
si rispegne; e **la scansione dell'ampli era bloccante**, otto secondi in cui i pulsanti non
venivano letti, quindi a ampli spento il pedale sembrava morto: adesso è asincrona e
l'aggancio lo fa il `loop()`.

Sul pedale resta, e **non è poco** (detto dall'utente il 24 settembre, dopo che avevo
scritto «finito»):

1. **Il display del pedale, deciso dall'utente il 24 settembre** (niente striscia ♪): in
   alto il nome del banco (Helvetica grassetto 8) (il banco del firmware si chiama «Amp Preset») e a
   destra un quadratino pieno con la S in negativo se lo Spark è connesso, vuoto se no; sotto i quattro preset della metà mostrata, etichetta
   `A1` in 6x13 grassetto e nome in 6x13 normale (il grassetto era troppo pieno), quello che
   suona in negativo. **Senza Spark** i preset lasciano il posto a «Accendi lo Spark /
   lo sto cercando» coi puntini che si muovono (fermo, sembrava piantato), e il suono si
   azzera: riacceso, lo Spark suona il suo. All'accensione, 4 s di **schermata di avvio** (logo da `logo.h`, «By Massimo
   Togni», `VERSIONE`, da alzare a ogni cambio visibile), che non ferma niente. Avvisi e ponte aperto prendono per un attimo il posto del nome del
   banco. **Visto in foto e approvato nei caratteri il 24 settembre; il quadratino in negativo
   va ancora guardato.**
2. **La modalità MIDI c'è, verificata il 24 settembre** (Program Change e Control Change
   arrivano a Windows, letti con `midiIn`): FS1+FS4 per 1,5 s cambiano modalità (ricordata),
   in MIDI il quinto passa fra pagina **preset** (otto Program Change 0–7: tasto banco SX = 1–4
   LED rosso, DX = 5–8 LED verde) e **stomp** (CC 80–83 a 127/0, LED verdi), canale 1, mappa fissa.
   **Fermo per scelta dell'utente** (24 settembre): vuole capire usandolo cosa gli serve,
   prima di aggiungere altro. Non proporre la mappa dall'app né altre funzioni MIDI finché
   non è lui a riaprire il discorso.
   **Anche BLE-MIDI, per l'iPad (BIAS FX), dalla 1.2 — funziona, provato dall'utente il 24
   settembre.** BIAS FX non ha un menu per collegarlo: **si collega da GarageBand**
   (ingranaggio → Avanzate → Dispositivi Bluetooth MIDI) o da midimittr, e resta collegato
   per tutto l'iPad.
   Servizio MIDI standard sullo stesso server del ponte; `annuncia()` decide l'annuncio
   (ponte aperto → UUID del ponte, modalità MIDI → UUID MIDI, due da 128 bit non ci stanno
   insieme). A ponte chiuso in MIDI chi si collega è `midiCentrale` e non può scrivere
   banchi. Ogni comando parte da USB e BLE (`mandaMidi`). Senza cifratura, e iOS lo accetta.
   Su Windows il BLE-MIDI non arriva ai programmi (29 agosto): lì resta l'USB.
3. **L'autonomia**, l'ultima misura mai fatta, **rimandata dall'utente il 24 settembre**. Il
   piano deciso: **tester sui due contatti dell'interruttore lasciato spento** (è sul
   positivo fra cella e XIAO, quindi il tester fa da interruttore e misura), USB staccato;
   tre letture (collegato allo Spark e fermo, picco a un footswitch, modalità MIDI);
   3300 mAh diviso i mA. **Prima si chiedono le foto** del tester (rotella e prese: presa
   sbagliata = fusibile bruciato) e dell'interruttore coi suoi fili. Se il pedale si
   riavvia all'accensione, è la caduta di tensione del tester: portata più alta. Poi
   il partitore su `D0`. Altrimenti la via lunga: lasciarlo acceso e guardare
   l'orologio. **Il partitore su `D0` non è saldato**, quindi l'indicatore di batteria non si
   può ancora scrivere.
4. Il **looper col conteggio fatto in casa** (il pedale conta quattro tempi e 40 ms prima
   dell'uno manda `0x0175` `04`).

**Il codino da pannello della XIAO non porta i dati** (misurato il 23 settembre): per caricare
il firmware il cavo va infilato **dentro**, direttamente nella XIAO.

Sull'app (guscio `v76` in `sw.js`; **`index.html` non ha suite**, le mie prove sono contro un
ampli finto):

3. **Tap tempo con l'ampli acceso**: `0x0176` è verificato dalla sonda, non dall'app.
4. **Editor con l'ampli acceso e sul telefono**.
5. **L'ampli che non si pianta girando le manopole**: correzione non verificata.
6. **«Importa un file» con un preset vero**: se non entra, si chiedono i primi byte del file.
7. **Togliere dal catalogo altri modelli che l'ampli non ha.**
8. **Mettere al sicuro il `preset_backup.zip` su Dropbox**: è l'unica cosa che scade (2027).

**La cronologia di git è stata riscritta il 17 settembre 2026** (tolta la license key):
i codici dei commit di prima non esistono più. **Resta all'utente** chiedere al supporto di
GitHub di togliere i commit vecchi dalla cache (`docs/sicurezza.md`, punto 1). **Mai più
catture o strumenti con la chiave `0x0170` nel repository.**

**Discussi e non aperti, da non rifare** (la modalità MIDI non è più qui: è lavoro in
programma, vedi sopra — resta valido il ragionamento in `docs/pedale.md`, e le due trappole:
Windows non sa fare BLE-MIDI, PowerShell 5.1 non sottoscrive eventi WinRT): preset creati con l'AI
(`docs/diario.md`); il banco che si trasferisce in ~6 s (solo ottimizzazione); la scheda in
`pcb/` (se si riapre: prima stringere il contorno, poi misurare gli interassi veri del KAmod).
