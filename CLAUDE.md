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
| `docs/pedale-lavoro.md` | **prima di toccare il pedale**: compilare e caricare, mappa, basetta, hardware, cosa manca |
| `docs/pedale.md` | si rimette in discussione il pedale: forma, ferramenta, scatola, BLE, ponte, MIDI |
| `docs/protocollo-spark2.md` | protocollo, encoder, scrittura dei preset, Hendrix |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso; l'inglese |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto; la fine del backup ufficiale nel 2027 |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata; le versioni lunghe di questo file |
| `docs/sito.md` | si tocca `sparklingtones.com` |
| `docs/sicurezza.md` | audit del 17 settembre 2026, tutti e sei i punti corretti |

**I documenti grossi non si leggono interi** (`pedale.md` 173 KB ≈ 55.000 token,
`decisioni-ui.md` 60 KB, `HANDOFF` 45 KB): `grep -n '^#'` per l'indice, poi solo la sezione.

**Si sposta, non si butta**: ogni sfoltita copia parola per parola in `docs/` ciò che accorcia
(l'ultima il 24 settembre 2026, da 34 a 23 KB, per il consumo di token). **Si rigonfia in due
settimane**: si rimisura con `wc -c CLAUDE.md`, e sopra i 30 KB si sfoltisce.


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

**ESP32**: compilare, caricare (`prova-ble` vuole il giro a 1200 baud) e le trappole della
XIAO stanno in **`docs/pedale-lavoro.md`**. **Il firmware lo compilo e lo carico io, senza
chiedere.**

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

**Ferramenta, mappa di pulsanti e LED, basetta, hardware che fa danni, scatola**: in
**`docs/pedale-lavoro.md`**, da leggere prima di toccare il pedale. Anche senza aprirlo:
**la mappa di pulsanti e LED non si scrive a mente** (si prende dalla mappatura guidata di
`prova-espansore`, e si chiede la foto), e **i nomi dei pezzi sono fissi** (basetta, XIAO,
espansore, pista, pettine, linea, pannello, scatola, cavo, piastrina LED, footswitch, tasti
banco, pulsanti; vietati coperchio, top, rotaia, striscia, modulo).

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

**Pedale** (tutto in `docs/pedale-lavoro.md`, «Dove si riprende col pedale»): sulla XIAO c'è
`prova-ble`, il firmware vero, verificato il 24 settembre. Restano, e **non è poco** (parole
dell'utente): il display (il quadratino in negativo va ancora guardato), l'autonomia
(rimandata da lui, il piano è scritto), il looper col conteggio fatto in casa. **La modalità
MIDI è ferma per scelta dell'utente: non proporre altre funzioni MIDI finché non riapre lui.**

Sull'app (guscio `v77` in `sw.js`; **`index.html` non ha suite**, le mie prove sono contro un
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
