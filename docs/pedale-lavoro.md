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
**Un `upload` vale solo con uscita 0 e la riga «Wrote … at 0x00010000»** (25 ottobre 2026: con uscita
255 lo spazio del programma è rimasto vuoto e il pedale non si accendeva più; vedi «Il pedale
d'espressione»). Se resta in COM13, a volte basta un secondo `upload`.

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
(7). Vietati: coperchio, top, rotaia, striscia, modulo; «bus» solo per l'I²C. **La guida pubblica del pedale è `guida-pedale.html`** (9 ottobre 2026): pezzi, schemi, montaggio, firmware, uso; **se cambiano cablaggio, comandi o pezzi, si cambia anche lì**. Pagina delle
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

**I connettori della millefori, 29 ottobre 2026** (confermati dall'utente; foto
`foto/pedale/millefori-connettori.png`, XIAO in alto a sinistra, espansore in alto a destra):
A (4) LED 1 e 2, accanto a PB4–PB7 · B (4) LED 3 e 4, accanto a PB0–PB3 · C (5) pulsanti, banco SX e DX
e FS4 · D (5) pulsanti, FS1 FS2 FS3 FS5 · E (4) display · F (2) LED del tempo, D1 · G (2) piezo, D3 ·
**H (4) pedale d'espressione, nuovo: G, 3V3, D2, D8 dal piedino verso il morsetto** (stesso ordine di
J10 della basetta stampata; **saldata dall'utente il 29 ottobre: piedino 1 a sinistra = G, poi 3V3, D2,
D8**) · M morsetto della cella, spostato per far posto a H.

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
- **Il modulo di ricarica montato caricava a 90 mA** (misurato il 4 ottobre 2026, tester in serie
  sul − della cella): dopo 10 ore cella a 4,03 V e LED sempre rosso, chip freddo. Cella e
  portacella a posto (4,06 sulla cella, 4,07 sul portacella in carica). **R3 di un ricambio:
  1,19 kΩ = 1 A**, quindi è quel pezzo. Si sostituisce con un ricambio; i fili sulle stesse
  piazzole (B+/B−/OUT+/OUT−), dalla foto. Dopo: rimisurare la corrente, ~0,9–1 A.
  **Aggiornamento, stesso giorno**: anche R3 del modulo montato è 1,19 kΩ, e con un altro
  caricatore resta 0,09 A: causa non trovata (non R3, non caricatore, non portacella; saldature
  «perfette» per l'utente). **L'utente ordina un Adafruit 6091, bq25185** (Kamami, su Allegro,
  38,90 zł): USB-C, 1 A di serie secondo la pagina (ma vedi sotto), **power path** (si suona mentre carica,
  fine carica affidabile), LED carica/errore/alimentazione, uscita LOAD fino a 4,5 V, 32 × 26 mm.
  **Arrivato il 7 ottobre 2026; il piano deciso dalle foto** (dei due lati, del vecchio montato,
  dell'interruttore e del morsetto): oggi i quattro fili stanno sul vecchio, due rossi su B+
  (portacella e interruttore) e due neri su B− (portacella e morsetto) — da confermare quando
  li stacca, segnando «INT» e «MORS». Sul nuovo: **BATT ⊕/⊖ = portacella, LOAD ⊕ = «INT»,
  LOAD ⊖ = «MORS»**, DCIN vuoto, ponticelli sul retro intatti (1 A, 4,2 V). Interruttore,
  morsetto, BAT della XIAO e partitore **non si toccano**: il partitore ora misura LOAD, cioè
  la cella a USB staccato e **~4,5 V con l'USB attaccato** (icona piena: normale; in futuro il
  firmware potrebbe leggerci «in carica»). **L'utente usa le prese JST-PH** invece dei buchi:
  ordinato il kit QWORK PH 2,0 (Amazon, 19,29 zł, con cavetti già crimpati); la sua pinza è la
  **DxCRIMP D2032** (0,03–0,5 mm², va bene per i PH). Sulle prese **+ a sinistra, − a destra**
  con l'USB in alto, dalla serigrafia e non dai colori dei cavetti. **Prima di tutto la prova
  d'ingombro**: il nuovo è 32 mm sul lato USB contro ~17, e fra il listello a sinistra e il
  footswitch a destra potrebbe non starci. Prove dopo: LOAD a interruttore spento 3,6–4,2 V
  senza il meno; acceso senza USB parte; USB-C anche C→C → LED CHRG e il pedale suona; corrente
  in serie sul nero della cella ~0,9–1 A a cella non piena.
  **Montato il 9 ottobre 2026**, su un supporto di compensato tagliato dall'utente (cornice a U,
  aria sotto la scheda, lato aperto verso le JST, quattro viti); spine JST-PH sulle prese, come
  da piano. **Verificato**: LOAD a interruttore spento 4,17 V; il pedale si accende; con l'USB
  si accendono PWR e CHRG. **Il LED PWR sta su LOAD e resta acceso anche a pedale spento**:
  misurati **2,1 mA** dalla cella (tester sui 200 mA, foglietto di carta fra il − della cella e
  la molla, rosso sulla molla) = ~50 giorni da carica piena a vuoto. **Tolto il LED** a leva
  col cacciavite: rimisurato **0** sui 200 mA. **La corrente di carica di serie è incerta**: la
  pagina del prodotto dice 1 A, la guida di Adafruit (marzo 2026) 500 mA, e il retro della
  scheda ha le piazzole «1 Amp» e «250mA», che danno ragione alla guida. Più un **timer di 6
  ore** non modificabile. Si misura **a cella sotto 3,9 V** (a 4,17 è in tensione costante e
  legge poco): tester sui 10 A al posto del nero della cella. Se è 500 mA e l'utente vuole 1 A:
  tagliare il ponticello IS sul davanti, chiudere «1 Amp» sul retro. **Per ora lasciato così,
  scelta dell'utente.**
- **Indicatore di batteria: fatto il 4 ottobre 2026 (firmware 1.5).** Partitore saldato
  dall'utente: due 100 kΩ in due cavetti, dal + del morsetto verde (vite in basso, i rossi) e
  dal − (vite in alto, nero e marrone) a **D0**, il primo piedino in basso a sinistra con la
  presa USB verso sinistra. Sta dopo l'interruttore: a pedale spento non consuma. Verificato:
  D0 1,87 V con la cella a ~3,74; col cavo attaccato il pedale legge 4,052 V e il tester
  4,04 (taratura non serve). Icona a sinistra del quadratino, quattro tacche (>= 4,05 / 3,85
  / 3,70 / 3,50), sotto 3,50 lampeggia e avvisa; 'u' dal seriale. **Col cavo USB attaccato
  la XIAO carica a 50 mA e la tensione sale**: le tacche giuste si vedono a cavo staccato.
- **Il ronzio del display** (la bobina **L2**, «4R7», del convertitore sul retro: `docs/pedale.md`,
  «Il ronzio è il display»): **una goccia di colla a caldo sulla bobina, il 9 ottobre 2026 —
  «molto meglio»** per l'utente. Se torna: staccare il display dal legno con uno spessore
  morbido; poi la frequenza interna del display (`0xD5`) dal seriale.
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

## La basetta stampata — 20 ottobre 2026

Chiesta dall'utente: una scheda **generica, da riusare per altri pedali**, al posto della millefori.
**`tools/genera-basetta.py` è la sorgente** (Python di KiCad 10: piazza, tira le piste con un A* suo,
massa sui due lati, serigrafia, logo da `pcb/basetta/logo-serigrafia.png`); si rigenera, non si tocca
in KiCad. `tools/verifica-basetta.py` confronta le 115 piazzole con i collegamenti attesi (XIAO e
datasheet MCP23017): 0 errori. DRC con `kicad-cli`: pulito. Anteprime PNG in `pcb/basetta/`.

- **86 × 70**, quattro fori M3, tutto a foro passante. XIAO su due file femmina 1×7 con l'USB a
  sinistra sul lato corto; **MCP23017-E/SP su zoccolo DIP-28 stretto** (7,62); resistenze dei LED
  sulla scheda (sulla piastrina LED vanno sostituite con un filo); pull-up I²C 4k7, RESET 10k,
  100n + 10µ; partitore 100k/100k su D0, 330 su D1 (TEMPO) e D3 (PIEZO); morsetto CELLA sul lato
  destro, presa BAT XIAO per i fili delle piazzole BAT; pettine LIBERI (D2, D8, D9, D10, TX, RX).
- **29 ottobre: presa ESPRESSIONE (J11)**, JST-XH 4 poli in alto a destra accanto a «FS5 E BANCO»:
  G, 3V3, D2, D8, lo stesso ordine della presa H della millefori, così il cavo del pedale d'espressione
  entra uguale. **Niente 1 kΩ né 100 nF sulla basetta**: stanno sulla presa del pedale (scelta
  dell'utente). La 10k del RESET scesa di 3 mm per non sembrare della presa. Verifica 119 piazzole, 0
  errori; DRC pulito; Gerber, zip e copia sul Desktop rifatti.
- **29 ottobre, sera: via la presa BAT XIAO**, al suo posto **due piazzole BAT + e − fra le file della XIAO**
  (verso il lato opposto all'USB, sempre `J8`: GND e VBAT, quindi morsetto e partitore come prima): due fili
  corti dalle piazzole BAT sotto la XIAO, e la XIAO li copre (chiesto dall'utente: oggi i fili vanno al morsetto).
  **«pedal» sotto il logo**, allineato alla fine di «Tones»: logo 30 mm invece di 32, un po' più a sinistra.
  **Da comprare (TME, scelto dall'utente il chip e non il KAmod)**: MCP23017-E/SP, zoccolo **ICVT-28P-W**
  (stretto, 7,62; ICVT-28P senza -W è largo), file femmina **ZL262-7SG** (1×7, 8,5 mm, niente da tagliare).
- **Ordinata il 29 ottobre 2026** dall'utente, dall'app **JLCONE** (il coupon «JLCONE PCB $5» vale solo da lì;
  la dogana vuole almeno 1 $ di merce, quindi scala meno): 10 pezzi, FR-4 TG135, 2 strati, 1,6 mm, **verde**,
  **HASL con piombo**, 1 oz, Tented, Remove Mark, Flying Probe, niente assemblaggio. **14,15 € (15,80 $, ~62 zł)**
  con spedizione economica, IVA e dogana pagate all'ordine. Spedizione prevista dalla fabbrica il 31 ottobre.
- **Ordinati da TME lo stesso giorno**: 2 × MCP23017-E/SP, 10 × ICVT-28P-W, 10 × ZL262-7SG. Il resto c'è
  già: resistenze (assortimento), condensatori (kit YIXISI: **104** per «100n», **106** ceramico per «10u» —
  niente verso, gambe da stringere appena, il «+» stampato si ignora), prese JST-XH da basetta nel kit
  DxCRIMP (XH-2A/4A/5A: ne avanzano). **Mancano solo i pezzi della basetta, non i cavi.**
- **Prese JST-XH con G sul piedino 1**: i cavi di adesso vanno controllati, il contatto si sposta.
- **Linee nuove, il firmware non è ancora cambiato**: FS1..FS4 = GPA6..GPA3, FS5 = GPA2, SX = GPA1,
  DX = GPA0, GPA7 libera (sui chip nuovi non è ingresso garantito); LED*n* rosso/verde =
  GPB(2n-2)/GPB(2n-1). A scheda arrivata: tabelle in `prova-ble`, poi mappatura guidata.
- **Ordine su JLCPCB** (zip `pcb/basetta/jlcpcb/`, copia sul Desktop), scelte riviste con l'utente:
  10 pezzi, blu, FR4 TG135, 1,6 mm, LeadFree HASL, 1 oz, Tented, Remove Mark, niente assemblaggio
  (la promo è solo SMT). **Non provata sull'hardware.**

## Il tuner sul pedale — 20 ottobre 2026 (firmware 2.24, verificato)

Chiesto dall'utente dopo quello dell'app. **Un tasto banco, l'uno o l'altro, tenuto da solo due
secondi** entra nel tuner; **un tasto qualunque** esce (e non fa altro). Per questo **il tasto banco
cambia banco al rilascio**, non piu' alla pressione: tenuto, o premuto insieme all'altro (ponte), al
rilascio non cambia niente. Senza Spark e nel looper i tasti banco fanno quello di prima (scelta
dell'ampli, battute) e il tuner non si apre. Solo modalita' Spark.

Comandi come nell'app: `0x0165 c3`/`c2` senza `0x00`, letture `0x0364` copiate nel callback e
smussate nel loop (`12-tuner.ino`: nota nuova dopo due letture uguali, 0,75 di smussatura, intonata
entro ±2 cent, silenzio dopo 4 letture a -1). L'ampli muto solo a tuner aperto; se cade col tuner
acceso, al ritorno lo si spegne; passando in MIDI si spegne prima di lasciare l'ampli.

**Display** (128×64): «Tuner» nella riga in alto, sotto un arco di 21 tacche (una ogni 5 cent, ±60°),
quella dove sta la corda lunga e spessa (due se sta in mezzo), quella del centro piu' lunga; la nota
in `logisoso24` (il diesis piccolo accanto), **in negativo quando e' intonata**; i cent in basso a
destra. Si ridisegna solo se cambia, al massimo 10 volte al secondo. **LED**: tutti verdi a corda
intonata; rosso su FS1 (calante oltre 15 cent), FS2 (calante), FS3 (crescente), FS4 (crescente oltre
15). **Provato dall'utente col pedale e lo Spark 2 il 20 ottobre: «funziona tutto».**

**Lo stesso giorno, l'ampli piantato** (l'utente): tuner che funziona, preset, looper dentro e fuori
due volte, poi il tuner «si apre, ferma il suono ma non fa nulla» e l'ampli e' bloccato, da
riavviare. Al riavvio del pedale la lettura dei nomi degli slot 6 e 7 dava «risposta incompleta»:
**l'ampli era gia' piantato prima**, e un tuner senza letture ne e' la conseguenza, non la causa
(il silenzio lo da' il `c3`, arrivato). **2.25**: una riga al secondo sul seriale a tuner aperto
(quanti `0x0364` arrivano e quanti se ne leggono, l'ultimo grezzo). Ripetuta la sequenza col cavo
attaccato, 6 minuti: **non si e' piantato**. Sette aperture del tuner fra giri di looper (registra,
sovraincidi, ferma, cancella), letture regolari (15-16 al secondo, ~1 s per partire), ack a ogni
`0x0165`; nella stessa prova una raffica di tap tempo (una `0x0176` a ogni colpo di FS5, battute
fino a 58 in «libero»), anche quella senza danni. Causa non trovata; sospetti, non verificati: le
raffiche di `0x0176` del tap, o il blocco gia' noto dell'ampli. Registro nello scratchpad della
sessione. **Il seriale del pedale muore se si stacca il cavo**: va riaperto lo script, dopo aver
staccato e riattaccato.

**Dopo, lo stesso pomeriggio**: l'ampli si e' inceppato di nuovo, e il registro ha mostrato come
**si inceppa per gradi**: i preset dei banchi passano da ~330 a ~600 ms e il `0x0138` non riceve piu'
il suo `04 38` (sul display il nome cambia, sull'ampli no; i `slot selezionato` con `0x0138` da soli
funzionavano ancora), poi l'ampli smette di mandare qualunque cosa e il tuner resta muto. Il conto
«15/15 ack» del pedale contava **qualunque** messaggio, non gli ack dei pezzi: ingannevole.
**Prove dal PC** col 2.26 (comandi `T` tuner, `L` looper, `Y` tap): 15 aperture e chiusure del
tuner, e 30 tap di fila nel looper, **non inceppano niente**. Non riprodotto con l'uso normale (un'ora,
col cavo attaccato). Causa ancora ignota.

**La scatola nera (2.26-2.27), lasciata dentro su richiesta dell'utente**: le ultime 400 cose
successe (TX, RX tranne `0x0364`/`0x0377`/`0x0301`, preset con gli **ack veri** dei pezzi, tuner,
looper, connessione) in RAM; `N` le stampa. **Quando l'ampli da' il primo segno di essersi inceppato
la scatola si salva in LittleFS** (`/scatola1.txt`, la volta prima in `/scatola2.txt`), resta anche a
pedale spento, e il display dice *ampli inceppato: salvato*. I segni: un `0x0138` senza `04 38` entro un
secondo, o il tuner acceso senza nessuna lettura per 5 s. Una volta per episodio (si riarma a un
cambio confermato o a un nuovo aggancio). **Si rilegge con `M`** dal seriale (`S` la salva a mano,
per prova: `/scatola1.txt` contiene ora una prova del 20 ottobre). Quando ricapita: l'utente riavvia
l'ampli, attacca il pedale al PC, e si legge `M`.

## Il menu delle modalità e il Play Acoustic — 23 ottobre 2026 (firmware 2.28, da provare)

Chiesto dall'utente, lavorato nella sessione del progetto **`..\MIdiAdapter`** (la sua `CLAUDE.md` ha tutto
il ragionamento e le misure). L'utente ha un **TC-Helicon Play Acoustic** e vuole comandarne looper, HIT e
preset col pedale, via Bluetooth. Il Play Acoustic via USB è una porta MIDI ma **non esegue** Program
Change né CC in ingresso (provato); la strada è la sua presa **PEDAL**, dove si finge un **Switch-6**
(scala di sette 10 kΩ fra anello e manica, la punta su uno dei sei gradini = un pulsante; verificato a mano
su breadboard). L'adattatore è una XIAO C6 che si collega al pedale come centrale BLE-MIDI (al posto
dell'iPad) e chiude con sei PC817 la punta sul gradino giusto.

**Cosa cambia nel pedale (2.28)**:
- **FS4 tenuto 2 s apre un menu** Spark / MIDI / Play Acoustic: tasti banco su (sinistro) e giù (destro),
  **FS5 conferma**, FS1–FS4 escono senza cambiare, dieci secondi senza tocchi lo chiudono. Sostituisce
  FS1+FS4 («troppe combinazioni», l'utente). FS4 fa prima il suo lavoro in Spark e MIDI (come prima con
  FS1+FS4, un comando in meno). Nel looper FS4 tenuto resta «cancella» e il menu non si apre.
- **All'accensione sempre Spark** (regola dell'utente): `ricordaModo`/`modoRicordato` e `/modo.txt` tolti.
- **Play Acoustic**: ogni tasto manda **CC 20+n a 127 alla pressione e 0 al rilascio** (canale 1, USB e
  BLE), n = pulsante del Switch-6. Tasti scelti dall'utente: FS1 = 1 Loop Rec/Play, FS2 = 2 Loop
  Stop/Clear (tenuto cancella: per questo il rilascio), FS3 = 6 Loop Undo, **FS4 vuoto**, FS5 = 3 HIT,
  banco sinistro = 4 Preset Down, destro = 5 Preset Up (`PLAY_PULSANTE`). Si annuncia come in MIDI e
  accetta la centrale (`midiCentrale`); niente ponte coi due tasti banco (sono Preset Down/Up). Uscendo, o
  aprendo il menu, nessun pulsante resta premuto (`playLasciaTutti`). LED: rosso sul footswitch premuto.
  Display: «Play Acoustic», il quadratino M pieno con l'adattatore collegato, i sette tasti su due colonne
  (in negativo quello premuto), in fondo «4 tenuto 2 s: menu».
- Compilato e **caricato il 23 ottobre** (1200 baud su COM3, upload su COM13). **Verificato sul pedale lo
  stesso giorno**: avvio con «v2.28» e in Spark; FS4 tenuto apre il menu, i tasti banco scorrono, FS5 entra
  in Play Acoustic e il display è quello descritto. Letti dall'USB col `midiIn` (script
  `..\MIdiAdapter\tools\midi.ps1 -Secondi 90 -Filtro SparkPedale`): FS1 `b0 15 7f`/`b0 15 00`, FS2 CC 22,
  FS3 CC 26, FS4 niente, FS5 CC 23, banco sinistro CC 24, destro CC 25, ognuno 127 alla pressione e 0 al
  rilascio. **Giro pedale → adattatore verificato** lo stesso giorno: la C6 si collega (rssi -44) e ogni
  tasto chiude e riapre il pulsante giusto; FS2 tenuto ~2,9 s resta chiuso fino al rilascio. Manca la prova
  sul Play Acoustic vero, coi PC817 montati (in arrivo).
- **2.29, le schermate rifatte** (stesso giorno: quelle della 2.28 «fanno cagare», l'utente: si leggono male,
  disposizione e aspetto). **Prima le bozze sul PC**: `..\MIdiAdapter\tools\oled\oled.js` disegna 128×64 coi
  font veri di U8g2 (decodificati da `u8g2_fonts.c`, stesse funzioni di U8g2) e salva PNG; controllato
  rifacendo la schermata del looper, uguale alla foto. Due proposte per schermata (`bozze.js`); scelte le
  «B», viste sul pedale e approvate:
  - **Play Acoustic**: sotto cinque colonne a icone nell'ordine dei footswitch (● REC, ■ STOP, ↺ UNDO,
    ≡ MENU, HIT), in alto a destra «PRESET» con i riquadri − e + vicino ai tasti banco; il premuto in
    negativo. Le scritte di prima (su due colonne) sono andate.
  - **Menu**: una modalità alla volta, grande (helvB14, helvB10 per «Play Acoustic»), fra due triangoli
    che sono i tasti banco (sinistro indietro, destro avanti), tre puntini sotto, «attiva» in basso a
    sinistra se è quella di adesso, «FS5 = OK» in basso a destra. Titolo «Modalità» con la à vera
    (`"Modalit\xe0"`: i font `_tf` hanno il Latin-1).
  - Scartate: la «A» di Play Acoustic (lista 1–4 come il looper, PRESET e HIT a destra) e la «A» del menu
    (lista grande col riquadro). PNG in `..\MIdiAdapter\bozze\`.

## Il pedale d'espressione — 24 ottobre 2026 (prove, niente di definitivo)

L'utente vorrebbe attaccare al pedale un pedale d'espressione: **volume e wah in Spark, un CC in MIDI**
(AmpliTube: whammy, volume). Non ce l'ha: prima di comprarlo ha voluto capire se ha senso. **Il posto
c'è senza toccare la basetta**: il pettine J10 ha G, 3V3 e D2 (analogico, libero). Jack stereo 6,35:
manica → G, anello → 3V3, punta → D2, 100 nF fra D2 e massa; punta e anello invertiti su alcuni pedali,
si rimedia con la taratura nel firmware.

**Cosa è stato provato, in ordine:**
1. **Volume col Master dell'ampli** (0x0104, manopola dell'editor dell'app): sale e scende liscio, l'ampli
   non si pianta (l'utente). È la stessa strada che userebbe il pedale.
2. **Il wah come parametro del preset: strada chiusa.** `JH.Vox846` ha sei parametri (docs/protocollo, 16
   ottobre); provati dal pedale tutti gli indici 0–5, in tutte e sei le modalità, a mano col cursore: niente
   posizione manuale. **Attenzione, le prime prove non valevano**: vedi la trappola qui sotto. Rifatte
   dopo, con lo stato giusto che suonava: l'indice 2 (tempo, BPM spento) cambia la velocità dell'onda,
   l'indice 5 e gli altri non danno un wah manuale (l'utente, «ho provato tutti gli indici»).
3. **La strada vera: lo Spark Control X** (pagina di Positive Grid trovata dall'utente; protocollo da
   `paulhamsh/Spark-Control-X`, README e `SparkControl.cpp`). **Con lo Spark 2 il Control X non passa
   dall'app: è l'ampli che si collega a lui** (tasto di accoppiamento dell'ampli tenuto premuto), servizio
   **FFC8**, FFC9 scritto dall'ampli, FFCA notify verso l'ampli. Messaggi `id 00 00 00 …`. L'ampli chiede
   firmware (0x0B), pedali inseriti (0x0D), profilo (0x08), batteria (0x0F), mappa del profilo (0x14: sei
   pulsanti + i due pedali d'espressione), nome (0x12), più 0x10, 0x11, 0x15, 0x04 ignoti. **La mappa
   decide cosa fa ogni pedale: 0x70 «Expression Wah LFO», 0x72 «Expression Volume», 0x75 volume della
   musica.** La posizione: `0c 00 00 00 01 <lo> <hi> 02 <lo> <hi>`, 0–65535 ciascuno. Annuncio copiato byte
   per byte: costruttore 0x0122 `00 12`, UUID del servizio MIDI, nome «SparkX v4.1.23 bae3», indirizzo
   casuale statico.
4. **`pedale/prova-controlx/`** (sketch a parte, niente FFC0, niente display né footswitch) fa **solo** il
   Control X finto. **L'ampli si è collegato, e i due cursori della pagina hanno comandato wah e volume**
   (l'utente, 24 ottobre, sera): «il wah in un modo anomalo, ma è un passo avanti». **Da capire alla
   prossima: cosa ha di anomalo il wah** (direzione? escursione? scatti? 0–65535 forse va ristretto alla
   taratura, messaggio 0x0E). Il primo aggancio non c'era stato: nel registro nessuna domanda dell'ampli,
   poi sì (forse il tasto tenuto meglio). Una volta il pedale si è riavviato da solo durante la prova,
   causa ignota.

**Trappola, verificata: chiusa l'app, l'ampli suona lo slot, non 0x7f.** Dopo «Regola» dall'app e l'app
chiusa (col pedale che si ricollega), i 0x0104 del pedale cambiavano lo stato in 0x7f — riletto con
0x0201 `[01 00]` — ma il suono restava quello dello slot. Con `0x0138 7f` («Fai suonare questo preset»
nella pagina) i parametri tornano a suonare. Non è chiaro quale dei due momenti (l'app che si stacca o il
pedale che si collega e legge gli slot) faccia tornare allo slot.

**Gli attrezzi della prova** (restano, servono alla prossima):
- **`tools/wah-ponte.ps1`**: tiene la seriale del pedale (DTR e RTS alti, chiusura giusta, si riaggancia
  se il pedale riparte) e serve **`tools/wah.html`** su `http://localhost:8095/`; si chiude con `/basta`.
  Web Serial in Chrome non si era collegato: la pagina adesso passa solo dal ponte. Il ponte ascolta solo
  `localhost`; una pagina web qualunque aperta nello stesso momento potrebbe però mandargli comandi
  (POST semplice): si tiene acceso solo durante le prove.
- **Firmware 2.30** (prova-ble): dal seriale `J` (rampa sul wah), `Z` (sei modalità), `X` (CC 11 a
  triangolo), `Q` (rilegge lo stato che suona, pezzi grezzi), righe `#i v` (parametro di JH.Vox846),
  `#on`, `#suona` (0x0138 7f), `#cc v` (CC 11, provato con AmpliTube il 25 ottobre, vedi sotto). La pagina li manda e
  decodifica la rilettura.
- **`prova-controlx`**: `#x a b` (0x0C), `#ins n` (0x0D), `#mappa a b`, `i` (annuncio, indirizzo, ampli).
- **Sul pedale a fine sessione c'è di nuovo prova-ble 2.30** (verificato: risponde e cerca l'ampli).

### 25 ottobre: **il wah col Control X finto funziona** — l'«onda» era il chorus del preset

Il wah «anomalo» del 24: il pedale 1 apriva e chiudeva il tono ma sotto restava un'onda; col Control X
vero, in un video (GotoAndPlay, «Unlock the J.H. Legendary Wah (Control X Setup)»), l'onda non c'è.
**Era il chorus**: nel preset «prova» `ChorusAnalog` acceso con tutte e quattro le manopole a 1.
Spento il chorus (0x0115 dalla pagina), **il pedale 1 muove solo il wah** (l'utente, 25 ottobre). Prima
di arrivarci, escluse una per una (tutte provate, nessuna toglie un'onda che non era del wah): Auto Wah
e Legendary Wah, Auto Detect con sensibilità 0, Wah LFO assegnato dall'app ufficiale, «jack inserito»
(0x0D) mandato dal finto, 0x0128 sì, 0x019f. **Lezione: prima di cercare nel protocollo, guardare il
resto della catena che suona.**

**L'app ufficiale prende il finto per un Control X vero.** Collegato all'ampli, l'app chiede (attraverso
l'ampli, che gira tutto al pedale su FFC9) nomi e mappe degli otto profili, propone «Transfer Control X
Profiles», e il menu dei pedali (icona a sinistra di ToneCloud) lo gestisce. Il Transfer arriva come
`0x13` (nome del profilo: «Preset Mode 1», «Stompbox Mode 1», «Music/Preset 1»…) e `0x03 00 00 00
<profilo> <tasto 1–8> 80 <09 tasti, 01 pedali, 02 alcuni> 05 01 <funzione>`; di serie i pedali sono
`72` e `75`. «Control Wah LFO» su EXP1 arriva come `… 07 80 01 05 01 70`. Nell'Auto Wah l'app scrive
«Parameter Controlled by Spark Control» e spegne le regolazioni.

**Btsnoop dell'app ufficiale** (bugreport del telefono, 25 ottobre; grezzo **fuori dal repository**: c'è la
chiave 0x0170, l'ampli ha risposto `0x0470 00 00`). Comandi nuovi app → ampli su FFC0:
- `0x019a`: scrive nell'ampli un profilo del Control X (nome «Profile #1», poi `08 00 00 01 0c 02 03 08 70
  72` — i sei tasti e i due pedali, quello che il finto aveva detto); otto volte, ack `0x049a`.
- `0x019f [01 nn]`: **la calibrazione del pedale d'espressione**. Mandato dalla pagina, l'ampli lo gira al
  pedale come `0e 00 00 00 <passo> 01` (nn 00→passo 01, 01→00, 02→02, 03→03); ack `0x049f`. Il finto la ignora.
- `0x0128 [JH.Vox846, bool, 00]`: l'app manda sì e 6 ms dopo no, appena collegata; **l'ampli non lo
  conferma mai** (né all'app né a noi), e da solo non cambia niente di udibile. Significato ignoto.
- `0x01a0 [bool]` dopo la domanda `0x029c` (risposta no): l'app manda no, ack `0x04a0`. Ignoto.
- Ampli → app: `0x03a1 [n, bool]` pedale d'espressione n inserito (arriva dopo il nostro 0x0D 03),
  `0x039e [00 01]`, `0x0328` di continuo nei primi secondi (un float minuscolo: livello d'ingresso?).
- Cambiando fra Auto Wah e Legendary Wah l'app manda `0x0106` JH.Vox846 → JH.Vox846, `0x0115`, il preset
  intero e `0x0138 7f`, con il wah in Auto Detect (1, 1, 0,5, 0,25, 0,5) e **cinque** parametri, non sei.

**Gli attrezzi, aggiornati**: `tools/wah.html` ha anche «Ampli diretto»: col Bluetooth del PC (Chrome,
`localhost:8095`) si collega all'ampli su FFC0, manda 0x0128, 0x01a0, 0x019f, chorus spento/acceso, e
quando è collegato i pulsanti e il cursore del wah vanno all'ampli invece che al pedale. Le notifiche si
riassemblano con `Spark.MessageAssembler` (arrivano con l'intestazione di blocco davanti). **L'app
ufficiale va chiusa**: l'ampli regge un solo FFC0. `prova-controlx`: dopo l'aggancio manda da solo
«jack inserito» (0x0D 03), stampa una 0x0C al secondo; **una volta si è bloccato** dopo minuti di cursore
(USB viva, programma fermo; causa ignota). **L'indirizzo casuale cambia a ogni accensione**: si riaggancia
col tasto dell'ampli. Caricando, due volte la XIAO è rimasta in COM13: **un secondo `upload` la fa
ripartire**.

**La scala della posizione (25 ottobre, a orecchio con la leva automatica della pagina): 0…32767.** Con
0…65535 il wah si apriva fino a metà corsa e poi si richiudeva; «con segno» (−32768…32767) partiva aperto,
chiudeva a metà e riapriva. È la stessa curva: **tutto chiuso a 0 (e a 65535), tutto aperto a
32767–32768**. Quindi il firmware manda 0…32767, e 0 è già il fondo chiuso. Anche i valori di un Control X
vero nel README di paulhamsh stanno sotto 0x8000. Il volume (pedale 2) era pieno a 65535.

**La calibrazione la fa il pedale, l'ampli la comanda soltanto.** Dall'app ufficiale (menu dei pedali →
EXP1 → Calibrate) arrivano al pedale `0e 00 00 00 01 01` (tallone), `0e 00 00 00 02 01` (punta), `0e 00 00
00 03 01` (fatto: «calibrazione effettuata»); l'ultimo byte è il pedale. Il pedale deve ricordarsi la
lettura grezza al passo 1 e al passo 2 e da lì in poi riportarla su 0…32767. **Prima, l'app diceva
«Please Connect EXP Pedal»**: vuole l'avviso «jack inserito» (0x0D) mandato dal pedale **mentre lei è
collegata** — con `#ins 0` e `#ins 3` è partita. Il pedale vero lo manderà a ogni inserimento e
disinserimento del jack (e lo ripeterà all'aggancio).

**Funziona anche con l'Auto Wah normale**, quello senza pacchetto Hendrix (l'utente, 25 ottobre).

**Il doppio ruolo è scritto ma non provato** (25 ottobre, sera): `prova-controlx` con `#ampli` si collega
anche lui all'ampli su FFC0, come prova-ble, e `#slot n` manda `0x0138`; nella pagina «Collega i preset» e
A1…B4. Due indirizzi: **quello vero per i preset, il casuale per il Control X**. Nella libreria del core
connessione, scansione e annuncio leggono tutti lo stesso `BLEDevice::m_ownAddrType` (privato), ma solo
quando partono: `setOwnAddrType(PUBLIC)` prima di scansione e connessione, `setOwnAddrType(RANDOM)` subito
dopo e prima di ogni annuncio. Il server riceve solo i collegamenti nati dal suo annuncio (callback
dell'annuncio), quindi il client non si confonde col Control X. Compila; **sull'ampli non è mai partito**.
Da provare in tutti e due gli ordini (prima il Control X, poi `#ampli`, e viceversa).

**A fine sessione il pedale è rimasto spento: il firmware non c'era.** Gli `upload` di quel momento erano
usciti con **codice 255**, e io guardavo solo la prima riga «Hash of data verified» (quella del
bootloader). Il registro di avvio su COM13 diceva `image at 0x10000 has invalid magic byte` e `No bootable
app partitions`: la XIAO si riavviava in tondo, display spento, e restava su COM13 anche dopo spenta e
riaccesa. Un `upload` rifatto per intero (uscita 0, «Wrote 812736 bytes … at 0x00010000») l'ha rimessa a
posto. **Regola: dopo ogni caricamento si guarda il codice d'uscita e la riga «Wrote … at 0x00010000»; se
la XIAO resta su COM13, si legge il suo registro di avvio prima di dare la colpa alla corrente.**

**Cosa resta, se l'utente vuole andare avanti:** la prova del doppio ruolo, qui sopra. Il
dubbio grosso: **due collegamenti con l'ampli in ruoli opposti** (il pedale centrale su FFC0 per i preset,
periferica su FFC8 per l'espressione) — l'indirizzo casuale del Control X potrebbe bastare a farli
sembrare due dispositivi. Poi l'hardware (jack su J10/D2, taratura).

**Il MIDI verso AmpliTube funziona (25 ottobre, sera).** Pedale sull'USB della XIAO, firmware 2.30, ponte
e cursore di `tools/wah.html`: sette `#cc` (0, 32, 64, 96, 127, 64, 0) arrivati tutti a Windows come
`b0 0b …`, letti con `..\MIdiAdapter\tools\midi.ps1 -Filtro SparkPedale` ad AmpliTube chiuso (una porta
MIDI la apre un programma alla volta). Poi in AmpliTube 5, «SparkPedale MIDI» fra gli ingressi e MIDI
Learn: **il pedale di AmpliTube segue il cursore** (l'utente). Manca solo la lettura vera da D2.

**Decise dall'utente (25 ottobre, sera), da scrivere dopo la prova del doppio ruolo:**
- **Wah o volume si sceglie da solo, preset per preset**: se nella catena c'è `JH.Vox846` (l'unico wah,
  Legendary o Auto) il pedale d'espressione va su EXP1 (0x70, wah), altrimenti su EXP2 (0x72, volume).
  Lo cerca il pedale, non l'app: negli slot dell'ampli mentre li legge (i pezzi arrivano già spacchettati;
  `pezzi` ne tiene sei, il nome va cercato al volo su tutti), nei banchi spacchettando i frame `0x0101`
  (senza toccare il formato del banco). Passando al wah, il volume torna pieno: col pedale giù si
  resterebbe muti. Da sentire: col wah presente ma spento, se EXP1 lo accende o resta muto.
- **Senza pedale d'espressione infilato, niente Control X**: niente annuncio FFC8. Serve sapere se il
  jack c'è (con D2 da sola, tallone e jack vuoto danno tutti e due 0). **Scelta dell'utente: presa
  stereo col contatto di commutazione e un filo in più verso D8** (GPIO 7: libero sulla millefori e sul
  pettine J10 della basetta stampata; non GPA7, che sulla millefori è FS5 e sui chip nuovi non è
  ingresso garantito). Idea, da confermare con la foto della presa comprata: il contatto che tocca
  l'anello a jack vuoto va su D8 col pull-down interno — vuoto = alto (3V3 dall'anello), infilato =
  basso. Scartata la prova coi pull interni alternati su D2. Altro aperto: se l'ampli si
  riaggancia da solo quando l'annuncio riparte; con l'indirizzo casuale nuovo a ogni accensione no di
  sicuro, quindi va tenuto fisso (salvato in flash).

**29 ottobre: arrivati il pedale (M-Audio EX-P, selettore M-AUDIO/OTHER sotto), la presa e i
condensatori.** Presa a 6 piedini, misurata col multimetro dall'utente; numeri sulla foto vista dai
piedini, dado a destra: sopra 1-2-3, sotto 4-5-6, da sinistra. **6 = manica.** A presa vuota si toccano
1-4, 2-5, 3-6; con lo spinotto nessuna delle tre. Con lo spinotto, dal 6: **4 = 63 kΩ fisso** (capo del
potenziometro), **5 = 64 kΩ che cambia col pedale** (cursore); 1 e 2 niente (lamelle). Quindi la
presenza del jack si legge meglio dal **3, la lamella della manica**: D8 col **pull-up** interno,
vuoto = basso (3 tocca la massa), infilato = alto. Cablaggio dato: 6 → G, 5 → D2 col 100 nF fra 5 e 6,
4 → 1 kΩ → 3V3, 3 → D8, 1 e 2 liberi. **Il selettore del pedale non si sposta**: cambia quale fra 4 e 5
è il cursore. **La rotella laterale regola la corsa**: al massimo 5-6 va da 1 a 64 kΩ, al minimo da 53 a
64; si tiene al massimo (con l'1 kΩ, su D2 circa 0,05–3,25 V). **Saldato e provato il 29 ottobre col
firmware 2.31** (comando seriale `I`, non `E`: le maiuscole A–H scelgono un preset): **tallone 0 mV, punta
~3040 mV**, liscio nei due versi; **jack: tolto → «vuoto», rimesso → «infilato»**, entro 250 ms. A jack
vuoto D2 resta appesa e scende piano (il condensatore si scarica): va ignorata, la presenza la dice D8.

### 29 ottobre: **il pedale d'espressione vero comanda wah e volume** (col Control X finto)

`prova-controlx` legge D2 e D8 (venti volte al secondo, manda 0x0C solo se la posizione si è mossa di
300 passi) e dice all'ampli il jack con 0x0D (03 infilato, 00 tolto; tolto → prima wah chiuso e volume
pieno). `#modo w` / `#modo v`, `#pedale`, `#curva c`, `#scala n`. **Il wah si muove col piede** (l'utente).
Tre cose imparate, tutte provate:
- **All'aggancio il jack dev'essere già dentro.** Agganciato con lo spinotto non entrato del tutto, il
  finto ha risposto 0x0D 00 e poi le 0x0C non muovevano niente (anche dopo uno 0x0D 03 mandato dopo).
  Nel firmware vero non si pone: senza jack niente annuncio.
- **`JH.Vox846` vuole lo sblocco dell'app ufficiale** in quella sessione dell'ampli: senza, il wah non
  suona e il pedale sembra rotto. Con l'app collegata, insieme al finto, funziona.
- **Il volume va su 0..32767, come il wah.** Misurato a gradini (uno alla volta, l'utente dice cosa
  sente): 8192 basso, 16384 medio, 24576 uguale, **32767 pieno**, 40960…65535 uguale. Con 0..65535
  «faceva quasi tutto vicino al tallone»; con la posizione al quadrato su 0..32767 «muto fino a fine
  corsa e poi di colpo». **Dritto su 0..32767: «meglio», l'utente lo tiene così.**
- **Dopo un caricamento l'ampli si è riagganciato da solo**, con l'indirizzo casuale nuovo: il tasto
  di accoppiamento non è servito (da riconfermare, una volta sola).
- Per gli sketch col CDC del chip (`CDCOnBoot=default` senza TinyUSB) la seriale si apre con **DTR e
  RTS bassi** (scratchpad `ascolta-c13.ps1`, porta COM13), non con `ascolta-pedale.ps1`.

**Sul pedale a fine prova c'è di nuovo prova-ble 2.31** (COM3). Prossimo: il firmware vero in prova-ble
(doppio ruolo, wah o volume secondo il preset, niente annuncio senza jack).

### 30 ottobre: **il doppio ruolo funziona, su un collegamento solo**

Jack del pannello montato dall'utente (D8 lo vede). Prove con `prova-controlx`, ampli vero:
- **Due collegamenti fra pedale e ampli non si fanno**: l'ampli si collega al Control X dallo stesso
  indirizzo che annuncia (`f0:9e:9e:10:5a:62`, pubblico), e la libreria rifiuta all'istante un secondo
  collegamento verso un apparecchio già collegato (`ble_gap_conn_find_by_addr`; anche NimBLE ha lo stesso
  controllo). L'idea dei due indirizzi del pedale non serviva: conta quello dell'ampli. `#ampli` resta e fallisce.
- **Il collegamento unico funziona** (`#stesso`): sul collegamento che l'ampli apre col Control X il pedale fa
  lui da client GATT (chi apre il collegamento e chi fa le domande sono cose separate): FFC0 c'è (handle
  40, FFC1 42, FFC2 44, CCCD 45), l'iscrizione alle notifiche passa, e **`0x0138` cambia preset** (l'utente: A2,
  poi A1, B1, A2 due volte, col volume del Control X che segue anche durante i cambi). L'ampli, dopo ogni
  cambio, manda al Control X le luci del pulsante giusto (`01 … <tasto> 01 ff …`; B1 con un altro colore).
  Le notifiche FFC2 con l'ascoltatore GAP non si sono viste (non indagato: per cambiare preset non servono).
- **Il volume del Control X è il volume del finale, quello della manopola**, che dall'app non si comanda
  (l'utente, certo: manopola quasi a zero, un 0x0C col volume pieno e torna «a canna»). Il pedale **scavalca**
  la manopola, vince l'ultimo che parla.
- In modo wah il messaggio portava il volume pieno: a ogni passo il volume tornava a canna. **Il messaggio con
  un pedale solo** (`0c 00 00 00 01 <basso> <alto>`) **non muove niente**. **Con «pedali infilati: solo il 1»**
  (0x0D 01) l'ampli **ignora il volume** anche dentro il messaggio intero: volume a 0 nel messaggio, suono
  invariato, il wah si muove (l'utente). Lo sketch ora dice 01 in modo wah, 02 in modo volume (02 non provato).
- **Ordine**: all'aggancio il pedale ha mandato una posizione prima che l'ampli chiedesse lo 0x0D. Nel
  firmware vero: nessuna 0x0C prima della domanda 0x0D dell'ampli (o del nostro 0x0D).
- **Lo sblocco**: ampli spento e riacceso, app ufficiale chiusa → il wah (A4, Auto Wah) non suona; con l'app
  collegata nemmeno, **finché l'utente non ha caricato il wah Hendrix dall'app** (che rimanda il preset
  intero). Quindi lo sblocco non resta allo spegnimento, e vale per i preset caricati dopo. Anche l'Auto Wah.
- **Il wah suona poco**: «più un'apertura degli alti che un wah», e col pedale vero «varia poco» anche se le
  posizioni coprono 323…32444. Gradini fissi (un messaggio ciascuno) quasi muti; salti grandi sì, e più grandi
  più cambia. **La scala è giusta**: con `#swah 65535` l'app ufficiale segna il wah tutto aperto a ~29000.
- **Il ritardo era nostro: l'ampli avvicina il wah di un pezzo per messaggio.** Il pedale mandava la
  posizione solo quando si muoveva (20 letture al secondo, soglia 300): fermandosi, il wah restava indietro.
  `#flusso` (la posizione ripetuta a ogni lettura, anche da fermo): «meglio». 50 al secondo: «meglio». 100:
  «meglio», ma poi «perde qualche colpo»; **tornato a 50: accettabile, deciso dall'utente.** L'intervallo
  del collegamento lo sceglie l'ampli, 15 ms; chiesto 7,5–15 (`#veloce`, rc 0) lo tiene a 15. **Nel firmware
  vero: posizione di continuo, ogni 20 ms.** L'utente: può anche darsi che il wah dello Spark sia così.
- Dopo ogni caricamento l'ampli si è riagganciato da solo; dopo averlo spento e riacceso no (tasto di
  accoppiamento: l'indirizzo casuale del finto era lo stesso, quindi non è quello).

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
3. **L'autonomia: misurata il 4 ottobre 2026, 0,15 A** (tester su 10A sui contatti
   dell'interruttore spento, USB staccato, pedale col NEO e fermo): **~17 ore** su 2600 mAh
   utili. Piu' dei 70–100 stimati; le leve, se l'utente vuole piu' ore: luminosita' del
   display (`setContrast(255)`) o spegnerlo da fermo, intervallo BLE da 7,5 ms.
   **Rimisurato il 30 ottobre 2026 con lo Spark 2** (stesso metodo, firmware 2.32, tester ANENG 681
   automatico, presa unica «mA A»): **130 mA agganciato e fermo**, 165 col footswitch tenuto, 170 a
   Spark spento mentre lo cerca; cella a 4,044 V. Il pedale legge ~40 mV meno del tester sulla
   cella (4,006 contro 4,044, col cavo dati attaccato): cadute fra cella, caricatore, interruttore
   e fili sotto carico. **La 2.32 registra la scarica** (una riga al minuto in `/batteria1.csv`,
   `U` dal seriale): carica piena, scarica fino allo spegnimento, poi le soglie delle tacche
   rimesse sui numeri del pedale, un quarto del tempo ciascuna. **La corrente di carica** del
   bq25185 si misura dopo la scarica, a cella bassa. Sotto, il piano
   di prima, ormai storia. 3. **L'autonomia**, l'ultima misura mai fatta, **rimandata dall'utente il 24 settembre**. Il
   piano deciso: **tester sui due contatti dell'interruttore lasciato spento** (è sul
   positivo fra cella e XIAO, quindi il tester fa da interruttore e misura), USB staccato;
   tre letture (collegato allo Spark e fermo, picco a un footswitch, modalità MIDI);
   3300 mAh diviso i mA. **Prima si chiedono le foto** del tester (rotella e prese: presa
   sbagliata = fusibile bruciato) e dell'interruttore coi suoi fili. Se il pedale si
   riavvia all'accensione, è la caduta di tensione del tester: portata più alta. Poi
   il partitore su `D0`. Altrimenti la via lunga: lasciarlo acceso e guardare
   l'orologio. (Il partitore su `D0` è saldato dal 4 ottobre: vedi l'indicatore, sopra.)
4. Il **looper**: la modalità c'è dalla 1.6, rifatta nella 1.7 (5 ottobre 2026, `docs/looper.md` in fondo), **da provare sul pedale**. Manca il **conteggio fatto in casa** (il pedale conta quattro tempi e 40 ms prima
   dell'uno manda `0x0175` `04`).

**La seriale del pedale si legge con `tools/ascolta-pedale.ps1`** (DTR e RTS alti, chiusura col file `basta`, mai uccidendo il processo: altrimenti download mode, e si ricarica su COM13). Il perché in `docs/looper.md`, «La 1.8».

**Il codino da pannello della XIAO non porta i dati** (misurato il 23 settembre): per caricare
il firmware il cavo va infilato **dentro**, direttamente nella XIAO. **Sostituito poi con una
semplice prolunga USB-C da 20 cm** (detto dall'utente il 9 ottobre 2026), che risolve: firmware
e MIDI via USB passano da fuori.

**Il firmware è diviso in file dal 7 ottobre 2026** (backup prima: tag git
`prima-della-divisione` e `C:\Users\massi\spark-backup-2026-10-07.zip`). `prova-ble.ino` tiene
gli `#include` e le variabili di tutto il pedale; poi `01-tasti-led.ino` … `11-avvio.ino`, che
Arduino mette in fila nell'ordine del nome e compila come un file solo. **Verificato**: stesso
binario al byte, a parte le 64 di impronte (SHA dell'ELF nel descrittore e hash finale). Le
regole: una funzione si chiama da ogni file, **una variabile solo dai file che vengono dopo**
quello che la dichiara; un file nuovo si numera dove deve stare. L'elenco è nella testa di
`prova-ble.ino`. Compilare e caricare non cambiano: si dà la cartella.

**Le scritte del display in due lingue: la 2.17, 9 ottobre 2026** (chiesta dall'utente per chi costruisce il pedale). `#define INGLESE` in cima a `prova-ble.ino`, 0 di serie; ogni scritta del display passa da `TESTO("…", "…")`, che sceglie il compilatore. Il seriale e i messaggi del ponte restano in italiano; `prova-espansore` anche. **Compilata nelle due lingue; caricata in italiano lo stesso giorno** (giro a 1200 baud da COM3, caricamento su COM13, il pedale torna su COM3), e l'inglese non è mai stato visto sul display: le scritte lunghe in alto si tagliano a 96 pixel, come già quelle italiane.
