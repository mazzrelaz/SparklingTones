# Il pedale ESP32 — ragionamento completo

Estratto da `CLAUDE.md` il 26 agosto 2026 per non pesare a ogni sessione.
In `CLAUDE.md` resta il riassunto operativo; qui c'è il perche' di ogni scelta.
Da aprire quando si lavora sul pedale.

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

**Com'era il piano con la XIAO ESP32C3** — la scheda scelta prima che finisse, tenuta qui
perché il ragionamento sui pin di strapping vale ancora se un giorno si torna su un C3.
**La mappa buona è quella della C6**, più avanti. Sul C3 **GPIO 0 e 1 non sono portati sul
connettore** — la XIAO espone solo `2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21`. Tolti i tre di
strapping restavano **otto pin sicuri, esattamente il fabbisogno**:

| cosa | pin XIAO |
|---|---|
| MCP23017 in I²C (SDA, SCL) — sono i piedini D4/D5, quelli serigrafati | `6`, `7` |
| display SSD1322 in SPI (SCK, MOSI, CS, DC, RST) | `3, 4, 5, 20, 21` |
| dati WS2812 | `10` |
| non usati, perché strapping | `2`, `8`, `9` |

SPI su `3` e `4` invece che sui pin nativi `8`/`10` passa dalla matrice GPIO: perde un po'
di frequenza massima, e a un SSD1322 non cambia niente. **Margine zero**: altri footswitch
si aggiungono sull'espansore, che ne ha sedici e ne usa sette, ma un **pedale d'espressione
vorrebbe un pin analogico** (ADC1 = GPIO 0–4) e lì bisognerebbe spostare qualcosa.

Due cose pratiche di quella scheda: **l'antenna è esterna e va attaccata** al connettore
u.FL — non ne ha una a bordo, quindi nella scatola va previsto il posto — e ha il
**caricabatterie** integrato sui piedini BAT, che per un pedale a batteria è un regalo. Non
è la scheda su cui ho misurato il BLE: quella era una C3 mini generica. Il chip è lo
stesso, quindi il firmware e i tempi valgono; l'antenna diversa cambia la portata, non il
protocollo.

Gli interruttori vanno **sull'espansore**, non sui pin del C3: sono ingressi lenti, e
l'MCP23017 ha i pull-up interni e un piedino di interrupt. Sui pin diretti restano le cose
che hanno bisogno di velocità o di temporizzazione — il display e i LED.

**Il modulo scelto è il KAmod I2C-IOexp16** (MCP23017, ~28 zł): alimentazione **2–5 V**,
quindi va a 3,3 V; ponticello per l'indirizzo; **uscita di interrupt assegnabile alle linee
del port A**; 20 mA per linea, che con LED da ~5 mA sta larghissimo. I pettini sono
inclusi ma sciolti, da saldare.

Da quell'interrupt discende una scelta di cablaggio: **gli interruttori sul port A e i LED
sul port B**. È il port A che può far scattare l'interrupt, e l'interrupt serve al piede —
non ai LED, che li comandiamo noi.

Cosa controllare quando arriva: **se il modulo ha i pull-up sull'I²C**. La scheda non lo
dice, e la XIAO non ne ha: se il bus non parte, quello è il primo sospetto, e si risolve
con due resistenze da 4,7 kΩ.

**Gli interruttori: momentanei a due pin, non a ritenuta.** Chiesto dall'utente il 25
agosto 2026 mentre ordinava, e la distinzione è la cosa più facile da sbagliare comprando:
i pedali per chitarra montano di serie **3PDT a ritenuta**, che restano premuti — con
quelli la logica del pedale non funziona, perché il firmware legge un livello e non una
pressione. Servono **SPST normalmente aperti, momentanei** (in polacco *chwilowy* o
*monostabilny*, «NO»): due piedini, uno a massa e uno all'ingresso dell'espansore, che ha
i pull-up interni. Nessuna resistenza da aggiungere, e l'antirimbalzo è già in firmware —
nella forma giusta, quella che aspetta che il segnale stia fermo.

**Per provare bastano i pulsanti da arcade**, che l'utente ha già in casa (25 agosto 2026).
Dentro hanno un microswitch a tre piedini — **COM, NO, NC** — e si usano **COM e NO**,
esattamente come i footswitch veri: COM a massa, NO all'ingresso dell'espansore. Se la
serigrafia non si legge, il NO è la coppia che **si chiude premendo**, e lo dice un tester
in continuità. Elettricamente sono la stessa cosa, quindi **tutto il firmware si può
scrivere e verificare senza aspettare i footswitch**: la logica delle due metà, i tasti
banco, i LED, il display, il BLE. Quando arrivano i pedali veri è uno scambio meccanico,
non una riga di codice.

**LED: erano una striscia WS2812, dal 25 agosto 2026 sono discreti** sull'espansore — vedi
la sezione della batteria qui sotto: un WS2812 vuole 3,5 V minimi e una cella LiPo scende
fino a 3,0. La convenzione resta quella del pannello dell'ampli: rosso banco A, verde
banco B.

### A batteria, e la batteria sta nella scatola — deciso il 25 agosto 2026

Chiesto dall'utente mentre ordinava. Non era scritto da nessuna parte, e cambia tre cose.

**Il conto della corrente**, per ordine di grandezza, che è quello che serve per scegliere:

| cosa | assorbimento medio |
|---|---|
| ESP32-C3 con BLE connesso a intervallo corto | ~20–30 mA |
| ESP32-S3 o ESP32 classico, stesso lavoro | ~30–50 mA |
| OLED 256×64, quattro righe di testo su fondo nero | ~25–40 mA |
| TFT IPS retroilluminato | ~100–130 mA, **e la luce non si spegne mai** |
| WS2812, 4–8 LED bassi | ~8 mA, più ~1 mA a LED anche da spenti |
| MCP23017 | ~1 mA |

Ne segue tutto il resto. **L'OLED resta**, e un TFT a colori è fuori discussione: su un OLED
i pixel neri non consumano, e il nostro schermo è testo su fondo nero — il caso migliore
possibile. **La XIAO resta**, e non solo per i pin: ha il caricabatterie a bordo sui
piedini BAT, quindi una cella LiPo ci si attacca diretta e si ricarica dalla sua USB-C,
senza TP4056 né boost. E **il microcontrollore conta meno del display**: fra C3 e S3 ballano
10–20 mA, fra OLED e TFT un centinaio.

**I LED cambiano: discreti bicolori sull'espansore, non la striscia WS2812.** Un WS2812
vuole 3,5 V minimi e una cella LiPo va da 4,2 a 3,0: a batteria scarica smetterebbero di
funzionare, e tenerli su vorrebbe dire aggiungere un boost a 5 V — cioè un altro pezzo e
altra corrente. Quattro LED bicolore rosso/verde vogliono otto uscite, l'MCP23017 ne ha
sedici e ne usa sette per gli interruttori: **ci stanno senza aggiungere niente**, si
alimentano a 3,3 V, e la corrente la decide la resistenza in serie. Si perde il colore
libero per LED, che non serviva: la convenzione è rosso banco A / verde banco B.

**E i LED non si comprano: ci sono già, in quantità** (26 agosto 2026). Sono quelli del
**progetto Timer dell'utente**, `C:\Users\massi\Timer` — `Timer.ino` righe 54-59 li
documenta: **RGB 5 mm diffusi a catodo comune, quattro piedini**, con le resistenze **già
tarate sugli stessi 3,3 V**: **verde 100 Ω, rosso 220 Ω** (il blu 100, e qui non si usa).
Quelle due resistenze diverse sono anche la conferma pratica del perché il verde va
trattato a parte: è InGaN e cade a 3,0–3,2 V, quindi dei 3,3 V ne restano due decimi per la
resistenza, mentre il rosso a 2,0 V ne ha un volt e mezzo.

Tre conseguenze da non riscoprire:

- **catodo comune** vuol dire comune a massa e MCP che **eroga** corrente per accendere
  (source, non sink). Regge 25 mA per piedino e ne servono ~10 su quattro canali accesi
  per volta: si sta larghi. Con un anodo comune il cablaggio sarebbe l'opposto;
- **l'MCP23017 non ha il PWM**: acceso o spento, punto. Nel Timer la luminosità si regola
  dal telefono con `analogWrite` e una curva quadratica, e c'è il giallo miscelato: qui
  niente di tutto questo, e non serve — la convenzione è due colori pieni. Se un giorno
  servisse davvero, l'unica strada sarebbe portare i LED sui pin liberi della XIAO, che
  sono tre;
- **quattro dello stesso lotto**: su quattro LED in fila due sfumature di verde si vedono.

**La scheda è la XIAO ESP32-C6** (deciso il 25 agosto 2026: la C3 era finita, e la C6 si è
rivelata migliore, non un ripiego). Stesso chip di famiglia, stesso codice, stessa
dimensione, ~33 zł. Cambia **tutta la mappa dei pin**, quindi quella del C3 qui sotto vale
solo come storia.

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `22`, `23` | MCP23017 in I²C (SDA, SCL) — sono i default della scheda |
| D8 / D10 | `19`, `18` | display in SPI: SCK e MOSI, i default della scheda |
| D3, D6, D7 | `21`, `16`, `17` | display: CS, DC, RST |
| D0 (A0) | `0` | tensione di batteria — **il partitore va saldato**, 200 kΩ, 1:2 |
| D1, D2, D9 | `1`, `2`, `20` | liberi; D1 e D2 sono analogici |

Due cose la rendono migliore della C3 per questo lavoro:

- **nessuno degli undici piedini è un pin di strapping.** Sul C6 lo strapping sta su GPIO
  4, 5, 8, 9, 15, e nessuno di quelli è portato sul connettore: cade tutta la prudenza che
  serviva sul C3;
- **l'antenna è a bordo** ed è attiva di serie (quella esterna si abilita via GPIO14, che
  non usiamo). Sulla C3 andava attaccata l'antennina, e nella scatola andava trovato il
  posto.

**Corretto il 27 agosto 2026, e prima c'era scritto il contrario:** il partitore per
leggere la batteria su A0 **non è a bordo sulla C6**. Il wiki di Seeed dice di saldare una
**200 kΩ**, in configurazione 1:2. Sono due resistenze in più da mettere in conto, non due
in meno.

Restano **tre piedini liberi**, due dei quali analogici: un pedale d'espressione ha già il
suo posto senza spostare niente.

**Quello che non è verificato**: le misure BLE — intervallo di connessione, 400 ms per un
preset — sono state fatte su un **C3**. La libreria è la stessa (NimBLE sotto `BLEDevice.h`
col core esp32 3.x, che per il C6 è obbligatorio) e l'API `updateConnParams` non cambia,
quindi il firmware dovrebbe portarsi di peso; i tempi vanno rimisurati.

**Tre cose pratiche della batteria in scatola**, da non riscoprire col saldatore in mano:
la cella dev'essere **protetta** (il caricabatterie della XIAO gestisce la carica, non la
scarica profonda); l'**USB-C va portata sul pannello**, che serve sia a caricare sia a
riprogrammare; e ci vuole un **interruttore generale**, perché lasciare il pedale acceso in
custodia è il modo più facile di trovarlo scarico al concerto.

**Che cella comprare — deciso il 25 agosto 2026: un 18650 protetto in portacella.**
L'utente ha posto il vincolo così: «la scatola la vedrò all'ultimo, lo spazio non sarà un
problema, ma voglio qualcosa di sicuro». Con quella priorità la busta LiPo perde, e non
per poco.

**Perché la lattina batte la busta.** Una pouch è una busta morbida: si buca, si schiaccia,
e una vite che le preme contro per mesi la rovina — dentro una scatola che prende pedate è
l'unico pezzo che un incidente meccanico trasforma in un incendio. Un 18650 è acciaio, e
si toglie: quando il pedale resta fermo per mesi la cella esce, che è la cosa più sicura
di tutte.

E ci sono due vantaggi che con la busta non si hanno affatto: **si porta una cella carica
di riserva** — dimenticarsi di caricare non fa più saltare la serata — e **si carica fuori,
in un caricabatterie vero**, in un paio d'ore. In quel caso l'USB del pedale torna a
servire solo per il firmware.

#### La XIAO carica a 100 mA, e non è una via di ricarica — misurato sul wiki il 27 agosto 2026

Qui c'era scritto «~9 ore a 380 mA»: **era sbagliato**, quello è il C3 (~350 mA). La
**C6 carica a 100 mA**, che è il dato dichiarato da Seeed. Su una cella da 3300 mAh fanno
**35–40 ore vere** contando la fase finale a tensione costante: da vuoto a pieno, via USB
del pedale, **non si fa**. L'ha notato l'utente prima di me.

Non ribalta la scelta dell'18650 estraibile: la ribadisce. Cambia il ruolo della presa sul
pannello — **non è la via di ricarica, è la via del firmware**, più un rabbocco. I numeri
che servono per ragionarci:

| | |
|---|---|
| consumo del pedale | ~60 mA → **~40 h** di autonomia |
| una notte attaccato (8 h × 100 mA) | ~800 mAh → **~13 h di uso** |
| caricatore esterno a 1 A / 2 A | ~3,5 h / ~2 h |

Il rabbocco notturno quindi non è inutile: ridà più ore di quante ne serva un weekend. E a
0,03C la cella non soffre — è una carica gentile, solo lenta.

#### Due prese sul pannello, e un TP4056 per la carica — chiesto dall'utente il 27 agosto 2026

La risposta al 100 mA è **un caricabatterie dedicato con la sua presa**, accanto a quella
della XIAO: due zloty, ~3,5 h invece di 35, e le due prese fanno due mestieri separati —
quella del TP4056 carica, quella della XIAO programma. (Cambiare la resistenza PROG sulla
XIAO no: è un SMD minuscolo sull'unica scheda del progetto.)

**TP4056 o TC4056A è la stessa cosa**: il primo è l'originale di Top Power ASIC, il secondo
è la versione pin-compatibile di un altro produttore, stesse specifiche — e moltissimi
moduli venduti come «TP4056» hanno sopra un TC4056A. Non è quello il criterio. I tre veri:

- **connettore USB-C**, uguale a quello della XIAO: un cavo solo nella custodia;
- **versione liscia, senza la sezione di protezione** (DW01 + i due MOSFET): la XTAR è già
  protetta sulla cella. Due protezioni in serie con soglie diverse non fanno danni, ma sono
  un pezzo in più che può intervenire per conto suo. Se si trova solo quella protetta va
  bene lo stesso;
- **Rprog `R3` da 1,2 kΩ = 1 A**, che sulla 3300 è 0,3 C. I moduli arrivano quasi sempre
  già così.

**La trappola non è il chip, è il load sharing: il TP4056 non ce l'ha.** Col pedale acceso
mentre carica, la corrente che si beve lui confonde il rilevamento di fine carica e il
modulo può non terminare mai. Quindi **si carica a interruttore generale spento**, e
l'interruttore va **fra la cella e la XIAO**, con `B+`/`B-` del TP4056 attaccati alla cella
*prima* dell'interruttore. Massa in comune fra tutto.

Cosa comprare, verificato su Allegro il 25 agosto 2026:

- **cella: XTAR 18650-330PCM, 3300 mAh, «Protected»** (~4,89 su 700 valutazioni). La
  protezione dev'essere sulla cella: la XIAO gestisce la carica, non la scarica profonda.
  **Regola contro i falsi: un 18650 oltre i ~3600 mAh dichiarati non esiste** — le
  «9900 mAh» sono sabbia;
- **portacella 1× 18650 con i fili**, quelli da qualche zloty. Trappola nota: **le celle
  protette sono più lunghe (~69 mm invece di 65)** e in certi portacella stretti non
  entrano;
- **interruttore generale a levetta SPST con dado**, metallico, roba da qualche zloty: la
  corrente è ridicola (~100 mA), conta solo che sia robusto. **Va sul retro o sul fianco,
  non sul piano di calpestio**, o si spezza al primo pestone;
- **due resistenze da 200 kΩ** per il partitore di A0, che sulla C6 non è a bordo;
- **modulo di ricarica: «MODUŁ ŁADOWANIA Li-Ion 18650 USB-C TP4056», 3,70 zł da 100hz_pl**
  (offerta 15103942260, scelta il 27 agosto 2026). USB-C, 1 A, 26 × 17 mm, piazzole
  `B+`/`B-`, `OUT+`/`OUT-`, codice `CA-033-TC`. **È la versione con la protezione** (DW01,
  scarica sotto 2,5 V e sovracorrente a 3 A) e va bene lo stesso, perché **quella protezione
  non si usa**: il carico si prende dalla cella attraverso l'interruttore, non da `OUT`, e la
  protezione che conta è quella già a bordo della XTAR. Dalle `OUT` non si guadagnerebbe
  niente comunque, il load sharing manca in tutti e due i casi. Nota: **il modulo resta
  attaccato alla cella anche a pedale spento**, perché sta a monte dell'interruttore —
  decine di µA, qualche decina di mAh al mese su 3300, irrilevante;
- 3300 mAh su ~60 mA fanno **una quarantina d'ore vere**.

**Il montaggio è la parte che decide se è davvero sicuro**: la cella va **bloccata** — una
pedalata non deve farla saltare fuori dalle mollette — i terminali isolati, i fili lontani
dalla meccanica dei footswitch, e l'interruttore generale sul positivo.

#### L'interruttore è fisico, e il deep sleep non lo sostituisce — 27 agosto 2026

Era scritto tre volte qui dentro ma **non era mai finito nella lista della spesa**, e
l'utente se n'è accorto. La domanda che ha fatto è quella giusta: serve davvero, o basta
dormire? In teoria i conti tornerebbero — deep sleep del C6 con risveglio sull'interrupt
dell'MCP23017, e a ~100 µA la cella durerebbe anni. **Ma non può essere la sola difesa**,
per tre motivi:

- **in borsa un footswitch si preme da solo**, e il pedale si risveglia e resta acceso tutta
  la notte. Con l'interruttore aperto non può succedere per costruzione;
- **il consumo a riposo di questa scheda non è misurato**, e le XIAO hanno perdite note a
  valle del regolatore. Fra l'altro **il partitore di A0 che dobbiamo saldare è esso stesso
  una perdita permanente**: 400 kΩ su 4,2 V sono ~10 µA, sempre, anche a chip dormiente;
- staccato è la posizione più sicura per un litio in una scatola che prende pedalate.

Il deep sleep semmai si aggiunge **dopo**, come risparmio durante le pause, non come
spegnimento. **L'auto-spegnimento per inattività no**: sul palco è esattamente la sorpresa
che non si vuole, ed è la stessa regola per cui il quinto footswitch non cambia il suono.

**Conseguenza comoda del cablaggio** (positivo, fra la cella e la XIAO, col TP4056 attaccato
alla cella prima): **a interruttore aperto la USB della XIAO programma ma non carica**, perché
il suo caricabatterie sbuca proprio sulla piazzola `BAT` che l'interruttore ha staccato. I due
mestieri delle due prese restano separati anche per sbaglio.

**Elettricamente non cambia niente**: 3,7 V nominali, 4,2 V a fine carica, le stesse due
piazzole `BAT`. Se un giorno la scatola dovesse costringere alla busta piatta, si torna
indietro senza toccare altro.

**Il conto dei pin torna con un avanzo**: sulla XIAO ne restano liberi due — `4`, che è
analogico e aspetta un pedale d'espressione, e `9` che è il BOOT e va lasciato stare — e
sull'espansore restano nove ingressi su sedici, quindi altri footswitch non costano niente.

#### Come si era arrivati al 3,12" — 16 agosto 2026, rovesciato il 25 (vedi sotto)

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

`tools/pedale-sim.html` disegna i formati **alla stessa scala fisica**, che è l'unico modo
di confrontarli onestamente: a parità di dimensione sullo schermo il 128×128 sembra ottimo.
Dal 25 agosto 2026 la spunta «affianca i due candidati» mette il 3,12" e il 2,42" **uno
accanto all'altro**, stessa scala e stesso contenuto, e la scala si adatta alla finestra —
su un telefono 7 px per millimetro non ci starebbero, e rimpicciolire solo quello largo
falserebbe il confronto.

**E c'è la «scala reale», che è la risposta vera a «come si vede a terra»:** i display
disegnati **grandi quanto sono**, il telefono appoggiato per terra, e ci si alza. Un browser
però non sa quanto è grande il suo schermo in millimetri — i `mm` del CSS valgono 96 punti
per pollice e su un telefono sbagliano di un terzo abbondante — quindi lo **si tara con una
carta di credito**, che è 85,6 × 54 mm per norma ISO ed è il righello che tutti hanno in
tasca. Si tara una volta, resta in `localStorage`.

**La soglia che decide, e vale per qualunque display:** a un metro e mezzo l'occhio legge
comodamente caratteri alti **~2,2 mm**. Con l'elenco a quattro righe il 3,12" ne fa 2,2 —
esattamente sul filo — e il 2,42" ne fa 3,4, cioè una volta e mezza di margine. In piedi,
di sbieco e con le luci addosso, quel margine è la differenza.

#### Il display è il 2,42" 128×64 — deciso il 25 agosto 2026, guardandolo a grandezza naturale

La scelta di agosto (3,12" 256×64) si era riaperta per due fatti nuovi, e si è chiusa
dall'altra parte.

**Primo fatto: quei moduli 3,12" escono tutti in 8080 parallelo**, con l'interfaccia da
scegliere spostando ponticelli a saldare sul retro — così da tre venditori diversi, anche
quelli che scrivono «SPI» nel titolo, dove l'SPI è compatibilità e non configurazione. Un
venditore ha rifiutato di configurarlo e l'utente non se la sente di rifare quelle
saldature. Senza SPI quel display non si usa: l'8080 vuole dodici pin e sulla XIAO non ci
stanno.

**Secondo fatto: l'argomento con cui il 2,42" era stato scartato non valeva più.** Era
«128 pixel danno cinque caratteri per colonna», e valeva per la disposizione a **quattro
colonne** — abbandonata da un pezzo per l'**elenco a quattro righe**. Con le righe:

| | vetro acceso | modulo | caratteri per riga | altezza lettere |
|---|---|---|---|---|
| 3,12" 256×64 | 71,5 × 17,9 mm | 100,9 × 33,6 mm | ~42 | 2,2 mm |
| **2,42" 128×64** | **55,0 × 27,5 mm** | **71 × 43,5 mm** | ~21 | **3,4 mm** |

A un metro e mezzo l'occhio legge comodamente lettere alte ~2,2 mm: il 3,12" era
**esattamente sul filo**, il 2,42" ha una volta e mezza di margine. E ventun caratteri
bastano per un nome di preset. **Deciso guardando i due a grandezza naturale col telefono
per terra**, che è il modo in cui era stata presa anche la decisione di agosto — solo che
allora si confrontava un'altra disposizione.

**Il ponticello sparisce come problema, e non per fortuna:** i 2,42" si vendono in due
versioni, **7 pin = SPI** e 4 pin = I²C. Si prende il 7 pin. E anche se ne arrivasse uno in
I²C andrebbe bene lo stesso: lo si mette **sullo stesso bus dell'MCP23017** e un
riempimento completo di 1024 byte a 400 kHz costa ~25 ms, che per uno schermo che cambia
quando si preme un footswitch non è niente. Qualunque cosa arrivi, si usa.

**Fra le due versioni si prende la SPI a 7 pin, e la ragione non è la velocità.** In I²C il
display starebbe **sullo stesso bus dell'MCP23017**, cioè sulla stessa coppia di fili da
cui si leggono i footswitch. Un display che pianta il bus — tenendo SDA basso, che è il
modo classico in cui un OLED muore — si porterebbe dietro **anche gli interruttori**, e un
pedale che non risponde più al piede è il guasto peggiore che questo affare possa avere.
In SPI il display ha le sue linee e non può toccare la strada del piede. Costa tre fili in
più, e i pin erano già stati messi da parte.

Il modulo comprato è dichiarato **«SPI (4-wire)»** nelle specifiche, senza ponticelli:
GND, VCC, SCL (clock), SDA (MOSI), RES, DC, CS — logica 3,3 V, alimentazione 3,3–5 V,
modulo 71 × 43 mm, sui 65 zł.

**Cosa cambia nel resto del progetto: quasi niente.** Il display resta in SPI sugli stessi
cinque pin, il piano dei pin della XIAO non si tocca. Cambia l'ingombro — 71 × 43,5 mm di
modulo invece di 101 × 33,6, quindi più basso e più stretto, meglio in larghezza e peggio
in altezza dove stanno i footswitch — e il controller, che è un **SSD1309** invece di un
SSD1322 (U8g2 li ha tutti e due).

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

