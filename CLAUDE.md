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

**I documenti grossi non si leggono interi** (`pedale.md` 175 KB, `decisioni-ui.md` 115 KB, `diario.md`
100 KB, `HANDOFF` 45 KB): `grep -n '^#'` per l'indice, poi solo la sezione. **Si sposta, non si butta**:
ciò che si accorcia va parola per parola in `docs/diario.md` (l'ultima il 10 novembre 2026, da 25,6 a
23,8 KB). Si rimisura con `wc -c CLAUDE.md`: sopra i 25 KB si sfoltisce. **Le ricerche saltano** ciò che
sta in `.ignore` (inglese, diario, bozze, sonde vecchie): ci si arriva con Read o `rg --no-ignore`.

## Struttura

```
index.html                        HTML e l'unico <style>: Preset e Live nello stesso documento
pc.html / src/pc/01-…11-*.js       la versione per il PC (9 novembre 2026): editor, libreria, banchi, pedale, tuner
src/app/01-…17-*.js               lo script dell'app, in fila (16: il tuner, 17: l'editor classico)
guida.html / guida.en.html        guida all'uso (guida.css, guida.js); guida-pedale(.en).html
manifest.webmanifest / sw.js      PWA; guscio in cache, offline
src/spark-protocol.js             encoder/decoder puro — il cuore del progetto
src/spark-transport.js            BLE: coda di invio, attesa risposte, lettura preset
src/preset-store.js               libreria IndexedDB: import, backup, banchi, categorie
src/spark-effetti.js              nomi di effetti e manopole + MODELLI
src/spark-backup.js · dropbox-sync.js · pedale-ponte.js · pwa.js · snake-pedali.js
src/lingua.js / lingua-en.js      le lingue (lingua-en.js NON si legge: vedi «L'inglese»)
pedale/prova-ble/                 firmware del pedale (prova-ble.ino + 01-…11-*.ino, banchi.h)
pedale/prova-espansore|usb|display|midi/   sketch di prova (mappatura guidata)
pcb/basetta/                      basetta stampata v1 (20 ottobre 2026), sorgente tools/genera-basetta.py; pcb/*.kicad_* vecchio, fermo
tools/                            serve.ps1, server-rete.js, wah-ponte.ps1 + wah.html, togli-sfondo/, video-demo/
test/*.html                       protocol 147, transport 64, store 151, backup 41, dropbox 38
captures/ reference/ design/      log dell'ampli; sorgenti paulhamsh; proposte grafiche
```

**`tools/explorer.html` è CONGELATO**: le modifiche vanno in `src/`.

**Lo script dell'app sta in `src/app/`, un file per sezione**, caricati in fila da `index.html` come
script classici: const, let e funzioni si vedono fra un file e l'altro, ma **il codice che gira
al caricamento usa solo quello dei file prima**. Un file nuovo va anche nel guscio di `sw.js`.
**Non si leggono interi** (`grep -n` e poi `offset`/`limit`): `index.html` (170 KB, 2.500 righe),
`10-editor-disegno.js` (93 KB), `spark-immagini.js` (65 KB), `preset-store.js` (56 KB), `guida*.html`.

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

**Dopo ogni modifica a `src/`, le suite in `test/` restano verdi.** Protocol, transport e dropbox da
`file://` con Edge headless (`--headless=new --disable-gpu --no-first-run --user-data-dir=…
--virtual-time-budget=20000 --dump-dom <url>`, lanciato con `Start-Process … -RedirectStandardOutput`
perché lo stdout non torna), poi `id="summary"`. **Store e backup da `localhost:8099`**; store in
headless resta su «esecuzione…»: si apre nel riquadro del browser e si legge `#summary` (22 ottobre).
Un `file://` nel riquadro non carica gli script.

- **`requestAnimationFrame` non gira** né nel riquadro né in headless: ciò che si muove usa `setInterval`.
- **Il service worker serve i file vecchi**: query in coda all'url, profilo nuovo, o va tolto.
- **Nelle schede in secondo piano i timer sono strozzati.**
- **L'avvio dell'app chiude i pannelli** (`applicaVista()` → `chiudiPannelli()`).

**ESP32**: compilare, caricare e le trappole della XIAO in **`docs/pedale-lavoro.md`**. **Il firmware
lo compilo e lo carico io, senza chiedere.** Display: `#define INGLESE` in `prova-ble.ino`; ogni
scritta nuova passa da `TESTO(it, en)`.

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
- **Il bollo «JH»** sta in **quattro posti, e quattro restano**: schede, tendina dei modelli,
  blocco a fuoco dell'editor, log di `mandaPreset`; non nella vista live né sul pedale. Col
  pacchetto Hendrix «no» spariscono.

### Sezione Live

- **Preset già in uno slot: istantaneo con `0x0138`; altrimenti invio intero, ~1 s.**
- **Banchi da otto, quattro per lato** (`grid-auto-flow: column`). Il vestito dei pulsantoni (circuito,
  niente LED, tutto in CSS) l'ha scelto l'utente il 16 ottobre: si cambia solo passando da una bozza.
- **Tenendo premuto 2 s un pulsantone si apre l'editor** (`pressioneLunga`); i pulsantoni non sono
  `disabled`, il tocco lo ferma `attiva()`.
- **Il banco «Ampli» si ricava da `slots`**; i banchi dell'utente (`settings.banchi`) **non scrivono
  mai sull'ampli**.

### Editor della catena effetti

- **Le manopole agiscono sul suono che sta suonando**: con l'ampli «Regola» manda il preset e rilegge
  lo stato **dall'ampli**, e **se la rilettura fallisce l'editor non si apre**. Senza ampli lavora
  sulla copia in libreria (`inModifica.offline`), e la modalità non cambia più anche se l'ampli arriva.
- **Cambio di modello: prima si copia** (`campioneModello`), **poi si costruisce** dalla tabella.
- **Il tempo sta solo qui** (`preset.bpm`; con l'ampli parte `0x0176`).
- **Invio dei parametri autocadenzato** (`PAUSA_PARAMETRO`, 90 ms): probabile causa dell'ampli che si
  pianta, **correzione non verificata**; se ricapita: `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
- **Lavoro non salvato** (`inModifica.toccato`): «Fatto» e il logo chiedono a tre vie
  (`chiediPrimaDiUscire()`); **se il salvataggio fallisce non si chiude niente**.
- **Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`** (`statoDelPannello`).

### Segnala un problema e donazioni

Menu Altro: mailto a `mazzbackup@gmail.com` (solo email); «☕ Offrimi un caffè» con `window.open`
(lasciare la pagina farebbe cadere l'ampli).

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
(`README` dei due repo, protocollo), i `*.en.html`, `sparklingtones-sito/en/`. Grep li salta da solo
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

**Looper** (`0x0175` + un byte, archiviato, tutto in `docs/looper.md`): **non aggiungere sonde sui
byte**, l'unica strada rimasta è chiedere a Ignitron.

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
- **Il tasto banco cambia banco al rilascio**; tenuto 2 s apre il tuner (2.24, verificato).
- **Quattro modalità da un menu** (FS4 tenuto 2 s, e **all'accensione**, regola dell'utente): Spark /
  Pulze / Play Acoustic / MIDI. Play Acoustic, via l'adattatore di `..\MIdiAdapter`: **CC 20+n a 127 alla
  pressione e a 0 al rilascio**; CC e adattatore cambiano insieme. Dettaglio in `docs/pedale-lavoro.md`.
- **Scatola nera** sul pedale per l'ampli che s'inceppa (causa ignota): comando `M` col pedale al PC.
- **La mappa di pulsanti e LED non si scrive a mente** (mappatura guidata di `prova-espansore`, e
  si chiede la foto). **I nomi dei pezzi sono fissi** (basetta, XIAO, espansore, pista, pettine,
  linea, pannello, scatola, cavo, piastrina LED, footswitch, tasti banco, pulsanti; vietati
  coperchio, top, rotaia, striscia, modulo).

## StompSnake

Snake in «Fai una pausa», in `src/snake-pedali.js`: **non tocca niente dell'app**, record in
`localStorage`. Il resto in `docs/snake.md`.

## Convenzioni

- **I commit li faccio io** (suite verdi, messaggi in italiano su cosa e perché) e **quelli visibili li
  pusho senza chiedere**. **La grafica** (colori, sfondo, disposizione) passa prima da una bozza e si
  pubblica solo dopo il suo sì.
- All'utente: cosa è successo e cosa cambia per lui, passo passo; il racconto va in `docs/`.
- **In locale la libreria è vuota** (altra origine): preset finti con `store.importFromAmp([...])`.
- **Questa memoria la aggiorno io a fine sessione**, ipotesi escluse comprese; si segna cosa è
  verificato sull'hardware. **Controllo di sicurezza** dopo ogni novità che parla con l'esterno, esito
  in `docs/sicurezza.md` (ultimo audit intero 17 settembre 2026).
- Italiano in commenti e UI. Byte in hex minuscolo separato da spazi.

## Dropbox e sito

**Sync Dropbox automatico** (`src/sync-auto.js`, provato col Dropbox vero il 9 novembre): vince la modifica
più recente, gli slot non viaggiano, oltre 5 cancellazioni si chiede; il **backup di sicurezza**
(`/spark-sicurezza.json`) è manuale e il sync non lo tocca. Tutto in `docs/dropbox.md`, «Il sync automatico».
**`sparklingtones.com`** sta in `..\sparklingtones-sito`: **l'app non si sposta lì**, e **prima di
ogni push lì `git pull --rebase`** (GitHub riscrive `CNAME`). Il resto in `docs/sito.md`.

## Dove si riprende — 1° novembre 2026

**Si riparte da `docs/planning.md`** (13 novembre): le cose aperte in ordine di priorità, da spuntare lì.

- **Due editor**: Impostazioni → «Editor: Neon / Classico» (`editorClassico()`). **Ritoccando il classico il
  neon non si tocca mai** (regola dell'utente): regole sotto `#pannelloEditor.classico`, codice in
  `17-editor-classico.js`; **il classico non scorre mai** (`adattaClassico`). Immagini, guscio e il resto:
  `docs/diario.md`, estratto del 9 novembre (gli editor).
- **Trappola**: `hidden` su un `button` del menu o `.imp-voce` non basta, il loro `display` lo batte.
- **Basetta** `pcb/basetta/`: generata **solo** da `tools/genera-basetta.py`, mai a mano; **ordinata il 29
  ottobre**. A scheda arrivata: `docs/pedale-lavoro.md`, «La basetta stampata»; il punto intero nel diario (9 novembre).
- **App Windows** (`desktop/`, Electron): `npm.cmd start` per provare (`npm` da PowerShell è bloccato), `npm run dist`
  per l'installer. Il nome è **SparklingTones**, mai «Spark Controller». Inglese di guida e «?» del PC: aspetta il suo via.
  Il resto: `docs/diario.md`, estratto del 12 novembre (sera).
- **La versione per il PC** (`pc.html` + `src/pc/`, pubblicata v148): pagina a parte, l'app del telefono non
  si tocca, **niente scritte guida**; **con lo Spark vero è da provare**. Prove senza ampli: `pc.html#finto`
  (riempie la libreria: poi va svuotata). Dettaglio: `docs/decisioni-ui.md`, «La versione per il PC».
- **Pubblicazione**: `main` e `origin/main` vanno insieme. **v154 pubblicata** (13 novembre): Live del PC, tap
  tempo, guida del PC dentro l'app, «?», splash «Novità». Dopo, il guscio va oltre v154.
- **Guida del PC dentro l'app** (13 novembre, come Pulze Control; `src/pc/14-guida.js`): prende i capitoli di
  `guida-pc(.en).html`; i «?» vanno al titolo con `GUIDA_DI` (id degli h3). **La guida del telefono resta com'è** (scelta dell'utente). Pubblicata (v154).
- **Vista Live del PC** (11 novembre, `src/pc/12-live.js`): Preset/Stomp e pedaliera MIDI; **con lo Spark e un pedale
  veri è da provare**. Benvenuto dell'exe in `src/pc/13-benvenuto.js`. **La Pedaliera è pensata per pedali MIDI commerciali, non per
  il nostro** (regola dell'utente, 12 novembre). **Trappola: un `filter` animato rompe il disegno
  in Chromium.** Il resto: `docs/diario.md`, estratto del 12 novembre.
- **Tutto gratuito, con donazioni** (13 novembre). **`pc.html` del web ed exe sono la stessa app**, Live compreso;
  l'exe aggiunge connessione veloce, scelta Bluetooth e benvenuto. **Va sul Microsoft Store** (account **a nome della
  moglie**; `npm.cmd run store` → `pacchetto-store.ps1`, makeappx del Windows SDK). **1.0.0 inviata in certificazione il 13 novembre**. **Ogni pubblicazione ha la splash «Novità»**
  (`src/novita.js`: voce in cima con la versione di `sw.js`). **A Store aperto**: riscrivere «L'app per Windows» in `guida-pc.html`.
- **Live del PC provato il 12 novembre con lo Spark**, pedaliera in BLE e via cavo. **Connessione veloce, verificata**:
  `desktop/connessione-veloce.ps1` (uno per dispositivo, da `main.js`) chiede a Windows `ThroughputOptimized`:
  intervallo da 30 a 15 ms, un preset dei banchi da ~1300 a **~530–600 ms**. Solo nell'exe.
- **«Genera con l'IA» solo sul PC** (`src/pc/11-genera-ia.js`): copia e incolla, **niente API né chiavi**.
  **Fermo per sua scelta**: il tap tempo con l'ampli acceso.
- **Pedale d'espressione**: presa **H**, solo volume. **Mai il volume del finale (0x72) in punta**: un botto.
- **Batteria** (2.41): letture a mediana, +100 mV; dettaglio nel diario (12 novembre). **Basetta e pezzi TME arrivati**: montaggio rimandato.
- Voci lunghe: `docs/diario.md`, 9 e 10 novembre.
- **Collaudi aperti** (editor con l'ampli sul telefono, l'ampli che si pianta girando le manopole, «Importa un
  file» con un preset vero, il NEO): `docs/diario.md`, estratto del 15 ottobre (sera), e `docs/pedale-lavoro.md`.
- **La cronologia di git è stata riscritta il 17 settembre 2026** (tolta la license key): **mai più catture o
  strumenti con la chiave `0x0170` nel repository.** Copia oraria dei progetti in `Desktop\Cloud Backup`.
