# Il pedale — la scheda di lavoro

Da aprire **prima di mettere le mani sul pedale**: compilare e caricare il firmware, la mappa
di pulsanti e LED, la basetta, l'hardware che fa danni, la scatola, cosa manca. Spostato qui
da `CLAUDE.md` il 24 settembre 2026 parola per parola, per non pagarlo a ogni sessione:
lì restano le regole del firmware che non si toccano. Il ragionamento lungo, con la storia di
ogni scelta, sta in `docs/pedale.md` (173 KB: mai intero, si cerca con grep).

## Compilare e caricare

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

## Ferramenta, cablaggi, scatola

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

## Dove si riprende col pedale — 24 settembre 2026

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
