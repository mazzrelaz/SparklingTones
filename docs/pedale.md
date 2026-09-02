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

> **Aggiornamento del 29 agosto 2026: la scheda è la XIAO ESP32-S3.** L'utente ha deciso di
> comprarla dopo che la prova BLE-MIDI ha chiuso la strada del Bluetooth su Windows (vedi
> «Modalità MIDI», in fondo): **solo l'S3 ha l'USB-OTG vero**, quindi solo lui può presentarsi
> al computer come pedaliera MIDI senza driver né programmi ponte. Quello che segue sulla C6
> resta come storia — la scelta era giusta con le informazioni di allora — ma **la mappa dei
> pin buona è quella nuova, qui sotto**.
>
> | piedino | GPIO | a cosa serve |
> |---|---|---|
> | D4 / D5 | `5`, `6` | MCP23017 in I²C (SDA, SCL) — default della scheda |
> | D8 / D10 | `7`, `9` | display in SPI: SCK e MOSI, default della scheda |
> | D3, D1, D9 | `4`, `2`, `8` | display: CS, DC, RST |
> | D0 (A0) | `1` | tensione di batteria — **il partitore va saldato**, come sulla C6 |
> | D6 / D7 | `43`, `44` | UART: **il log seriale**, che qui va tenuto libero apposta |
> | D2 | `3` | libero — ultimo da usare, vedi sotto |
>
> **Perché CS/DC/RST non stanno più su D6/D7 come sulla C6**: lì c'è la UART, e in modalità
> USB-MIDI la porta USB potrebbe non portare più il log seriale. Tenere i due piedini liberi
> costa niente e salva la diagnostica. **D9 è MISO e resta libero** perché il display si
> scrive e non si legge.
>
> **Le tre differenze vere rispetto alla C6**, tutte da tenere a mente:
>
> - **l'antenna non è a bordo.** La S3 ha solo il connettore u.FL e va montata l'antennina
>   esterna. **Non è «l'antenna del Wi-Fi»**, che qui non serve a niente: è l'antenna della
>   radio a 2,4 GHz, che Wi-Fi e Bluetooth condividono — **senza, non funziona il BLE verso lo
>   Spark**, cioè l'unica cosa che al pedale serve. Sulla C6 era integrata e attiva di serie.
>   **Risolta il 29 agosto 2026, e senza comprare niente**: vedi «L'antenna» qui sotto;
> - **carica a 50 mA, non a 100** (la versione Plus fa 100). Non cambia niente, perché la
>   ricarica passa dal TP4056 e non dalla XIAO — semmai **rafforza** quella decisione;
> - **lo strapping quasi non c'è, ma non è zero**: sui piedini portati fuori l'unico è
>   **D2 = GPIO3** (selezione della sorgente JTAG). GPIO0, 45 e 46 non sono sul connettore.
>   Quindi D2 si usa per ultimo, ed è il posto sbagliato per qualcosa che sia pilotato
>   all'accensione.
>
> **Cosa non cambia**: display SSD1309 in SPI, espansore MCP23017 in I²C, LED sul port B,
> cella 18650 protetta, TP4056, interruttore generale, due prese sul pannello, partitore di
> A0 da saldare, indicatore di batteria da scrivere. Tutta la ferramenta comprata resta buona.
> **Cosa va rimisurato**: i tempi BLE (erano su C3, e vanno rifatti comunque) e **l'autonomia**,
> perché l'S3 è un doppio core a 240 MHz e consuma più della C6 — le ~40 ore stimate su una
> 3300 saranno meno, quanto non si sa.
>
> **Da verificare quando arriva**: se in modalità USB-OTG si possano avere **insieme** la
> porta MIDI e il log seriale sull'USB (TinyUSB il dispositivo composito lo sa fare). Se sì,
> non si perde niente; se no, il log passa dalla UART su D6/D7 e per ricaricare il firmware
> si tiene premuto BOOT e si tocca RESET.

#### L'antenna: si prova il foglietto, la stilo è la riserva — 29 agosto 2026

**L'utente le ha tutte e due** — il foglietto di serie della S3 e, già in casa, un codino
u.FL con **bulkhead SMA e stilo avvitabile** — e ha deciso l'ordine: **prima il foglietto,
perché l'antenna non la vuole vedere**. La stilo resta la seconda possibilità, non la scelta.
**Non si compra niente in nessuno dei due casi.**

**Quello che decideva era la scatola, e la scatola sarà di legno** (detto dall'utente il
29 agosto 2026, ed è la prima volta che il materiale è deciso). **Il legno è trasparente ai
2,4 GHz**, quindi la preoccupazione che rendeva interessante la stilo — l'alluminio, che è
una gabbia di Faraday e darebbe il guasto peggiore che c'è, «funziona a mezzo metro e cade a
due», cioè passa la prova sul banco e si scopre sul palco — **qui non si pone**. Il foglietto
dentro va bene.

**L'unica accortezza è interna: lontano dal metallo che c'è dentro.** La cella 18650 è un
barattolo d'acciaio e il display ha la sua cornice metallica: il foglietto va incollato su una
parete di legno, con qualche centimetro da quei due, e non sopra la piastra dell'espansore.

**La prova, comunque, si fa a scatola chiusa e a tre o quattro metri** — la distanza vera fra
il pedale e l'ampli. A mezzo metro funziona qualunque cosa, e non dimostra niente.

Se contro ogni previsione non bastasse, ci sono due gradini prima della stilo: spostare il
foglietto su un'altra parete, e incollarlo **fuori, sotto il fondo** — invisibile da sopra.

Della stilo, se un giorno si arriva lì, le quattro cose da non riscoprire col trapano in mano
(il bulkhead attraversa il pannello con un dado, come l'interruttore o un jack da chitarra,
quindi l'antenna sta fuori):

- **un foro tondo in più**, sui 6,5 mm — da misurare sul filetto del dado prima di forare. È
  lo stesso lavoro degli altri fori e la punta a gradini ci arriva (al contrario dei 22 mm dei
  codini USB-C, che vogliono la sega a tazza);
- **stilo e bulkhead restano una coppia.** SMA e RP-SMA si somigliano e non si accoppiano:
  quei due sono nati insieme. Un'altra stilo presa dal cassetto va controllata prima;
- **non sulla faccia che prende le pedate.** Retro o spigolo alto; la stilo è snodata e si
  ripiega per la borsa;
- **l'u.FL sulla scheda regge pochi innesti**: si attacca una volta sola e il codino si blocca
  con una fascetta vicino alla XIAO, o un tiro sul cavo strappa il connettore dalla scheda.

Il pezzo di coassiale è irrilevante come perdita, a quella lunghezza.

**La scheda era la XIAO ESP32-C6** (deciso il 25 agosto 2026: la C3 era finita, e la C6 si è
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
- **interruttore generale a levetta SPST con dado**, metallico: la corrente è ridicola
  (~100 mA), conta solo che sia robusto. **Va sul retro o sul fianco, non sul piano di
  calpestio**, o si spezza al primo pestone. **L'utente ce l'ha già** (27 agosto 2026);
- **due resistenze per il partitore di A0**, che sulla C6 non è a bordo. **Non devono essere
  200 kΩ**: serve che siano **uguali** (il rapporto 1:2 è quello che conta) e fra 100 k e
  220 k — più alte scaricano meno la cella, più basse le legge meglio l'ADC. **L'utente ne ha
  già in casa** (27 agosto 2026), dal progetto `Timer`. Due avvertenze:
  **misurare prima di saldare**, perché il wiki dice «*una* resistenza da 200 k» al singolare e
  potrebbe essercene già una a bordo — tester fra `A0` e `BAT+` e fra `A0` e massa; e
  **mettere un 100 nF fra `A0` e massa**, perché con due 200 k l'ADC vede una sorgente da
  100 kΩ, troppo alta per il suo campionatore, e la lettura sballa di quel tanto che su questa
  curva piatta vale una tacca intera;
- **modulo di ricarica: [Aideepen TC4056 USB-C, sei pezzi per 11,87 zł su Amazon.pl](https://www.amazon.pl/dp/B0BZSB3SBN)**
  (ASIN `B0BZSB3SBN`, scelto il 27 agosto 2026, 4,5 su 292 valutazioni). USB-C, 1 A, 25 × 16,5
  mm, LED rosso `CHARGE` e verde `FULL`. **Sei pezzi costano meno di uno solo comprato su
  Allegro** (3,70 + 10,49 di consegna), e su un modulo che si salda, che sta attaccato a un
  litio e che prima o poi se ne brucia uno, i ricambi non sono spreco. Scartata l'offerta
  Allegro 15103942260, equivalente ma più cara. **È la versione con la protezione** (4,28 V in
  sovraccarica, 3 A in sovracorrente) e va bene lo stesso, perché **quella protezione non si
  usa**: il carico si prende dalla cella attraverso l'interruttore, non da `OUT`, e la
  protezione che conta è quella già a bordo della XTAR. Dalle `OUT` non si guadagnerebbe niente
  comunque, il load sharing manca in tutti e due i casi — e per lo stesso motivo si ignora
  l'avvertenza del venditore sul primo collegamento che «attiva il circuito di protezione».
  Nota: **il modulo resta attaccato alla cella anche a pedale spento**, perché sta a monte
  dell'interruttore — decine di µA, qualche decina di mAh al mese su 3300, irrilevante;
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

#### Come si collega l'interruttore

```
            portacella 18650
            ┌──────────────┐
            │   [ cella ]  │
            └──┬────────┬──┘
        rosso (+)      (−) nero
               │        │
       ┌───────┴──┐     ├──────────────────┐
       │          │     │                  │
       │        ┌─┴─────┴─┐                │
       │        │ B+   B− │  TP4056        │
       │        │  [USB-C]│  (OUT+ / OUT−  │
       │        └─────────┘   non si usano)│
       │                                   │
   ┌───┴───┐                               │
   │  ○ ←──┼── linguetta centrale          │
   │  ○ ───┼── una laterale ──┐            │
   │  ○    │  (l'altra libera)│            │
   └───────┘  interruttore    │            │
                              │            │
                          ┌───┴────────────┴───┐
                          │ BAT+          BAT− │  XIAO ESP32-C6
                          └────────────────────┘
```

Quattro saldature: positivo della cella alla **linguetta centrale**; laterale a **`BAT+`**;
negativo della cella a **`BAT−`**; e positivo e negativo della cella anche a **`B+`/`B−`** del
TP4056, allo stesso punto dei fili del portacella, **prima** dell'interruttore.

Quello che fa la differenza col saldatore in mano:

- **le piazzole `BAT` della C6 stanno sotto la scheda e sono facili da invertire**: il wiki
  di Seeed dice che **il negativo è dal lato della serigrafia `D8`, il positivo dal lato di
  `D5`**. Si guarda la serigrafia, non «quello a destra»;
- **se l'interruttore ha tre linguette è uno SPDT**: centrale più una esterna, la terza resta
  libera. Con due sole è uno SPST e non ha polarità. **Prima di montarlo si prova col tester
  da che parte è acceso**, che al contrario si scopre a scatola chiusa;
- **si commuta il positivo, mai il negativo**: il negativo è la massa comune col TP4056 e con
  tutto il resto;
- **fra la cella e l'interruttore il filo è permanentemente in tensione e non protetto da
  nulla**: corto, **guaina termorestringente su ogni linguetta**, nessun rame scoperto. Due
  linguette nude che si toccano sono un corto secco su un litio, ed è l'unico modo serio di
  farsi male con questo progetto;
- **mai saldare sulla cella** (è il motivo del portacella), e **cella fuori mentre si salda**;
- filo **24–26 AWG**: la sezione non conta a 100 mA, ma quello sottilissimo si spezza alla
  base della saldatura dopo un po' di pedalate;
- **i due fili `BAT` si saldano alla XIAO prima di montarla** nella scatola: dopo quelle
  piazzole sono irraggiungibili.

#### Come si capisce che la ricarica è finita

**Lo dicono i due LED del modulo**: rosso `CHARGE` acceso mentre carica, **verde `FULL`
quando ha finito**. Il TP4056 termina a C/10 (~100 mA) ed è lì che il verde si accende. Da
cui **una conseguenza sul montaggio**: il modulo va posizionato in modo che **quei due LED si
vedano**, o la ricarica è muta. Due forellini da 3 mm allineati ai LED.

**Il punto da non fraintendere** (l'utente l'ha chiesto il 27 agosto 2026: «a pedale spento non
c'è modo di sapere quando è carica?»): **quello è proprio il caso che funziona sempre.** Il
modulo non è alimentato dal pedale ma **dal cavo USB**, quindi a interruttore aperto, XIAO
spenta e display nero i suoi due LED sono accesi lo stesso. A pedale spento non si può
**scriverlo sul display**, che ha bisogno del firmware; ma la domanda «è carica?» ha risposta,
ed è quel verde.

**Come si vedono da fuori, in concreto** (l'utente ha dovuto chiederlo due volte, quindi qui
sta scritto passo per passo). Tre modi, dal più facile al più bello:

1. **Un foro solo, non due allineati.** I due LED SMD sono a pochi millimetri l'uno dall'altro:
   invece di due forellini da 3 mm da centrare al decimo, **un foro unico da 6–8 mm** o
   un'asola, col modulo incollato dietro e i due LED dentro l'apertura. Si distingue benissimo
   il rosso dal verde. Per finirlo, un pezzetto di plexi o una goccia di colla a caldo
   trasparente dietro il foro. **Tolleranza generosa, zero elettronica in più: è la via da cui
   partire.**
2. **Due spezzoni di filamento trasparente** da stampante 3D (1,75 mm) o di lenza spessa, uno
   sopra ciascun LED e infilato in un forellino del pannello: fanno da fibra ottica. Tolleranza
   altissima, il modulo va dove si vuole, si fissa con la colla a caldo.
3. **Due LED veri sul pannello**, sotto. Il più bello, ma **i punti dove saldare vanno trovati
   col tester**, perché su questi moduli la disposizione varia. Con sei moduli in mano il primo
   si sacrifica per capire dov'è cosa.

**Versione migliore dei due forellini, se allineare due LED SMD è scomodo:** `CHRG` e `STDBY`
del TP4056 sono a **collettore aperto** — sono i piedini che pilotano quei LED. Ci si attaccano
**due LED da 3 o 5 mm veri**, montati sul pannello dove si vuole, anodo al `+` d'ingresso con
la sua resistenza e catodo al piedino (sinkano pochi mA, uno basta). Restano alimentati
dall'USB, quindi **funzionano a pedale spento** come gli originali, ma sono grossi e il modulo
si butta in un angolo senza allineare niente. E siccome sono gli stessi due segnali che
servirebbero al display, tanto vale portarli **anche** ai due GPIO liberi: quattro fili, e si
hanno tutte e due le cose. Con sei moduli in mano, il primo su cui si prova la saldatura fine
sui pad dei LED non è un problema.

**Col codino BTFO quel vincolo si scioglie**, ed è un vantaggio che non era previsto: il
maschio USB-C entra nella presa del modulo e ci resta per sempre, mentre è la flangia sul
pannello a prendere le pedalate. Quindi **il modulo non deve più stare dietro il connettore** e
si mette dove fa comodo per i due forellini — trenta centimetri di cavo danno libertà totale.
Unica accortezza: **fissarlo** (colla a caldo o un distanziale), o il peso e la piega del cavo
gli tirano il connettore.

**Ma non è un divieto, ed è bene dirlo perché scritto male sembrava tale** (chiesto
dall'utente il 27 agosto 2026: «quindi mentre è in carica non posso usare il pedale?»).
**Si può usare mentre carica.** Funziona e non è pericoloso: entra 1 A, il pedale se ne beve
60 mA, alla cella ne arrivano ~940 — il 94% della velocità. Quello che si perde è **il verde
`FULL`**, perché quei 60 mA possono tenere il modulo sopra la soglia di C/10 e la carica non
termina mai, o termina e riparte a cicli. Non è un guasto, è un'indicazione di cui non ci si
può fidare. La regola giusta è quindi:

> **Usalo pure mentre carica se serve.** Ma per il caso «lo attacco la sera e lo voglio
> trovare pieno», si spegne l'interruttore: è l'unico modo di fidarsi del verde.

**E c'è una seconda conseguenza, sull'indicatore dell'OLED**: mentre carica la tensione su
`A0` sta a 4,2 V anche a cella mezza vuota, quindi la tacca direbbe «pieno» mentendo, e il
firmware da solo non può accorgersene. Se un giorno si vuole risolvere: **il TP4056 ha due
uscite `CHRG` e `STDBY`**, a collettore aperto verso massa, che sono quelle che pilotano i due
LED. Portate a due dei tre GPIO liberi della XIAO (con pull-up interno, attive basse), il
firmware **sa** se sta caricando e se ha finito, e sul display si scrive «in carica» e «carica
completa» invece di una tacca che mente. Saldatura fine sui pad dei LED, ma sono due fili.

Il tempo è comunque prevedibile: **1 A su 3300 mAh fanno ~3,5 h**, quindi attaccato e
ripreso dopo quattro ore è finito, LED o non LED.

**La tensione su A0 non serve a questo**: durante la carica il modulo tiene la cella a 4,2 V
anche quando piena non è, quindi il valore letto non distingue «in carica» da «carica». E
comunque a pedale spento il firmware non gira. Il partitore serve all'altra domanda — **quanto
ne resta mentre si suona** — che è l'indicatore da mettere sull'OLED.

Se un giorno si caricasse dalla presa della XIAO (i 100 mA, per un rabbocco), l'indicatore è
il suo LED rosso a bordo: **lampeggia mentre carica e si spegne a fine carica**.

#### La presa della XIAO non alimenta più niente: firmware e log, e basta

Conseguenza di tutto quanto sopra, messa a fuoco dall'utente il 27 agosto 2026. Quella presa
serve a **caricare il firmware** e a **leggere il log seriale** (`tools/pedale-seriale.html`,
che apre la porta senza resettare la scheda). Dell'alimentazione non si occupa: a interruttore
aperto non arriva nemmeno alla cella.

**La trappola che nasce da qui sono le due USB-C identiche affiancate.** Attaccare il
caricabatterie in quella sbagliata non rompe niente — a interruttore chiuso la XIAO si mette a
caricare per conto suo a 100 mA — ma il verde `FULL` non si accende mai e dopo quattro ore la
cella è come prima. Si risolve **scrivendoci sopra** («CARICA» / «FIRMWARE») o separandole
fisicamente, retro contro fianco, o una incassata.

**Deciso il 27 agosto 2026: escono tutte e due, due codini.** Avevo proposto di lasciare quella
del firmware dentro la scatola, ma valeva finché costava un foro: dal momento che il pezzo si
compra comunque, con venti zloty ci carichi il firmware **e** leggi il log seriale
(`tools/pedale-seriale.html`) **a scatola chiusa, col pedale per terra e il piede sopra** — che
per misurare i tempi BLE in condizioni vere vale molto più del prezzo. Il codino porta i dati
(pinout pieno) e per l'USB nativo del C6, full-speed a 12 Mbps, 30 cm non sono niente.

In cambio: **60 cm di cavo arrotolato dentro** invece di 30 — due matassine fascettate, lontane
dalla meccanica dei footswitch — **due fori rettangolari** da fare a lima, e **le due prese
identiche da etichettare in fase di montaggio**, non «poi mi ricordo».

#### Le prese da pannello, e la trappola del CC — 27 agosto 2026

Le USB-C sono saldate sulle schede e non si portano fuori così com'è: notato dall'utente. Le
due prese però non hanno lo stesso problema.

**Per la carica non serve un passante**, perché il modulo ha **due piazzole `+` e `−` accanto
alla presa** apposta per alimentarlo da fuori (lo dice la sua descrizione). Bastano due fili a
un connettore da pannello — che è anche **meccanicamente giusto**: la forza di inserimento del
cavo deve scaricarsi sul pannello, non su una schedina da 26 × 17 mm tenuta da quattro
saldature.

**Per il firmware un passante servirebbe davvero**: la USB della XIAO porta i dati e i piedini
`D+`/`D−` non sono sui pettini, quindi con due fili non si rifà. Ed è la ragione in più per
**lasciarla dentro**.

**La trappola è il CC: una presa USB-C nuda non prende corrente da un cavo C-a-C.** Servono
**due resistenze da 5,1 kΩ verso massa su CC1 e CC2**, o il caricatore non vede nessun
consumatore e non manda i 5 V. Le prese «2-pin» da 3 zł non dicono se ce le hanno, e con due
soli pin **non si possono aggiungere**. I breakout 4-pin di solito le hanno a bordo — è il
motivo per cui il CC non è portato fuori — ma nemmeno loro lo dichiarano.

**Per questo si prende un passante, non una presa da due fili**: la presa vera resta quella del
modulo, il CC è affar suo e la questione non si pone.

**Scelto dall'utente il 27 agosto 2026: [BTFO adapter panelowy USB-C maschio-femmina, 19,99 zł
su Amazon.pl](https://www.amazon.pl/dp/B0H7S5WSC5)** (ASIN `B0H7S5WSC5`), consegna gratis, due
viti incluse. **È un codino e non un raccordo** — femmina con flangia, 30 cm di cavo, maschio
che entra diretto nel TP4056 — quindi non serve nessun cavetto C-C in più. Ed **è dichiarato
USB 3.1 a 20 Gbps, cioè pinout completo**: il CC c'è di sicuro. Per la stessa ragione **lo
stesso pezzo andrebbe bene anche per la presa del firmware**, se un giorno si porta fuori,
perché porta i dati.

Due cose da mettere in conto, nessuna bloccante:

- **30 cm di cavo dentro la scatola sono tanti**: va arrotolato e fascettato, **lontano dalla
  meccanica dei footswitch**. E dietro il pannello servono **3–4 cm liberi** fra il connettore
  maschio e il raggio di curvatura — spazio da verificare sul disegno prima di comprare la
  scatola;
- **la flangia vuole un foro rettangolare più due fori per le viti**, non un foro tondo di
  trapano: lima o Dremel.

**Trovata l'alternativa che toglie il rettangolo — 27 agosto 2026:
[HENGBIRD, 25,99 zł](https://www.amazon.pl/dp/B0G37T13JJ)** (ASIN `B0G37T13JJ`). Stessa
topologia (femmina + 30 cm + maschio) e stesso pinout pieno (USB 3.0 5 Gbps con PD, quindi il
CC c'è), ma **si monta con filetto M21×1,5 e dado: foro tondo da 22 mm**, pannello fino a 8 mm.
Cioè **come un jack da chitarra o come l'interruttore**, invece che a lima. Su una scatola da
pedale è la differenza fra un lavoro fatto apposta e un rattoppo, e costa 6 zł in più a pezzo.

**Aggiornamento del 29 agosto 2026: la scatola sarà di legno**, e questo scioglie da solo la
prima delle due verifiche qui sotto — **nel legno un foro da 22 mm è una punta Forstner**, che
è l'attrezzo normale per quel lavoro, non un ripiego. La seconda, lo spazio sul pannello,
resta.

Due verifiche prima di ordinarlo: **come si fa un foro da 22 mm** — nel metallo serve una
punta a gradini che ci arrivi (**la 4–20 comune non basta**) o una sega a tazza; e **lo spazio sul pannello**,
perché due fori da 22 affiancati vogliono una cinquantina di millimetri più i bordi, e sulla
stessa faccia va anche l'interruttore.

**Idea da valutare al montaggio: uno HENGBIRD per la carica e il BTFO per il firmware.** Quello
della carica si usa sempre e sta in vista, l'altro di rado e può stare dietro — e siccome sono
fisicamente diversi, **la confusione fra le due prese sparisce per forma invece che per
etichetta**, che è sempre meglio perché le etichette si staccano.

Scartate: la presa 2-pin da ~3 zł (CC ignoto e non aggiungibile, e una recensione avverte che i
fili sono da bassa corrente) e il breakout 4-pin da 3,48 zł (le 5,1 kΩ di solito ci sono ma non
è dichiarato, e la forza del cavo finirebbe sulla schedina invece che sul pannello).

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

**Ancora da fare: l'indicatore di batteria sull'OLED.** Chiesto dall'utente il 27 agosto 2026,
firmware non scritto. La domanda era «come si capirà che è carica», e sono **due domande in
stati opposti del pedale**:

- **carica finita** → i due LED del modulo, e non c'è alternativa: mentre carica il pedale è
  **spento** (regola del load sharing), quindi firmware e display non possono dire niente. Due
  forellini da 3 mm;
- **quanta ne resta mentre si suona** → il display, ed è il vero motivo del partitore su `A0`.

**Niente percentuali, perché la tensione di un litio mente**: 4,2 V da pieno, poi piatta sui
3,7 per la maggior parte della scarica, poi crolla. Un «73%» sarebbe inventato proprio nel
mezzo. Quello che funziona è grossolano e vero — quattro tacche a soglie (>4,05 / 3,85 / 3,70 /
3,50) e sotto i **3,50 V un avviso, non un'icona**.

**Il momento che conta è l'ultimo**: la protezione della XTAR taglia sui 2,5 V e il pedale
muore a metà canzone. Stesso spirito della regola del quinto footswitch — sul palco la sorpresa
è il difetto peggiore — quindi l'avviso dev'essere impossibile da non vedere.

Tre trappole di misura, che con quaranta ore di autonomia si scoprirebbero fra sei mesi:
**mediana di più letture** (l'ADC è rumoroso e i picchi BLE fanno ballare il valore);
**`analogReadMilliVolts()` e non `analogRead()`**, che usa la calibrazione di fabbrica
nell'eFuse e su questa curva vale una tacca intera; e **filtro lento, senza far risalire
l'indicatore**, che una tacca che balla è peggio di nessuna tacca.

**Un LED di stato in più no**: le otto uscite dell'espansore sono già tutte dei quattro LED
bicolore, e i tre GPIO liberi sulla XIAO non risolverebbero niente — a pedale spento non è
acceso nemmeno quello, e a pedale acceso il display lo dice meglio.

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


## Il looper sul pedale, e il conteggio fatto in casa

Deciso il 28 agosto 2026, dopo aver chiuso l'indagine sul conteggio (`docs/looper.md`).
Il protocollo del looper è tutto verificato e non manca niente: registra, chiudi, suona,
sovraincidi, annulla, cancella, e la posizione nel loop arriva cinque volte al secondo.
**Manca solo il conteggio col click, che non si comanda** — è la conclusione dell'indagine,
e non è un difetto nostro.

**Quindi il conteggio lo fa il pedale.** Non è un ripiego: il conteggio non è un suono, è
*sapere quando parte la registrazione*. Premuto il footswitch, il pedale:

1. legge il bpm dall'ampli (`0x0363`, oppure il campo dentro `0x0376`);
2. conta quattro tempi a quel bpm lampeggiando un LED, o con un buzzer se ce ne sarà uno;
3. **40 ms prima dell'uno** manda `0x0175` con `04`, che fa partire la registrazione
   all'istante.

I 40 ms non sono inventati: è il tempo entro cui l'ampli risponde a `04` con il suo
`0x0375`, misurato nelle catture. Con l'hardware in mano si rimisura e si aggiusta.

Per chi suona il risultato è lo stesso — quattro segnali a tempo, e alla quinta pulsazione
stai registrando. Cambia che il segnale arriva dai piedi invece che dalla cassa, e che lo
**vedi**. Con l'ampli a volume su un palco è probabilmente più leggibile di un click.

**In Signal Detection Mode il conteggio non serve**: la registrazione parte da sé al primo
suono di chitarra. È il modo col click spento, e si cambia tenendo premuto PLAY/STOP
sull'ampli — o scrivendo il flag con `0x0176`.

**E il tempo si può anche scrivere**, il che apre una funzione in più: il pedale può avere
il suo **tap tempo**. `0x0176` **senza** il byte `0x00` finale, con il payload costruito
dall'ultimo `0x0376` ricevuto cambiando il solo bpm — i dettagli e la trappola (col byte in
coda il delay parte in ripetizione infinita) stanno in `docs/protocollo-spark2.md`. E
siccome dentro l'ampli il tempo è già accoppiato agli effetti, **il delay segue da solo**:
non tocca a noi mappare bpm su posizione della manopola.


## Modalità MIDI: lo stesso pedale per AmpliTube — discusso, non aperto

Chiesto dall'utente il **29 agosto 2026**: usare lo stesso pedale anche come pedaliera MIDI
per un programma sul PC (AmpliTube), con due modalità distinte — modo Spark e modo MIDI.
Qui c'è il ragionamento fatto quel giorno, perché quando arriveranno i pezzi non si riparta
da capo. **Niente di questo è misurato**: è ricognizione, e il punto che decide tutto è una
prova da dieci minuti che si può fare *prima* di scrivere una riga di firmware.

**L'hardware è già quello giusto e non si tocca**: cinque footswitch, due tasti a mano,
OLED, LED, batteria. Fra le due modalità cambia solo *cosa parte quando si preme*.

### Come arriva il MIDI al PC — tre vie, e la prima è preclusa

- **USB-MIDI nativo: no sulla XIAO C6.** L'ESP32-C6 ha il solo **USB Serial/JTAG**, che è a
  funzione fissa (una porta seriale), non il controller USB-OTG dell'S2/S3. Non può
  presentarsi al PC come dispositivo MIDI class-compliant: non è una libreria che manca, è
  il silicio. **Da riverificare con la scheda in mano**, ma è la cosa che chiude in partenza
  la strada più comoda. Se un giorno servisse davvero USB-MIDI, la via è un altro chip
  (S3) o un adattatore esterno, non una modifica al firmware.
- **BLE-MIDI: la via naturale, con un'incognita su Windows.** Sull'ESP32 il servizio BLE
  MIDI si fa senza attriti, e un esemplare ce l'abbiamo già sotto gli occhi:
  `reference/paulhamsh/SparkComms.h:49` usa `PEDAL_SERVICE = 03b80e5a-…`, che è proprio
  quello. Zero cavi, coerente col resto del pedale. **L'incognita è il PC**: Windows non ha
  mai esposto il BLE MIDI ai programmi come una normale porta MIDI, e serviva un aiuto
  esterno (loopMIDI più un ponte tipo MIDIberry). Microsoft ha rifatto lo stack MIDI di
  Windows e il BLE dovrebbe esserci dentro, ma **sul PC dell'utente va provato**.
- **MIDI seriale sul cavo che c'è già: certo di funzionare.** La seconda presa USB-C del
  pannello — quella del firmware e dei log, vedi «L'alimentazione» — porta i byte MIDI sulla
  CDC, e sul PC un programmino li mette su una porta MIDI virtuale. Costa un cavo e un
  programma acceso, ma non può fallire.
- **DIN-5 vero**: in uscita sono un connettore e due resistenze, quindi è quasi gratis
  aggiungerlo se un giorno ci fosse un apparecchio con l'ingresso. Al PC però non serve:
  vorrebbe un'interfaccia MIDI in mezzo.

**La prova che decide, e si fa prima di tutto**: un'app BLE-MIDI qualsiasi sul telefono e
vedere se AmpliTube sul PC la sente come sorgente MIDI. Se sì → BLE-MIDI. Se no → seriale.
Dieci minuti, nessun firmware, nessun pezzo da comprare.

### Cosa serve saper mandare

**Niente di specifico per AmpliTube.** Ha il MIDI learn: qualunque comando si mappa su
qualunque cosa (preset, stomp on/off, wah). Quindi al pedale basta saper mandare **Program
Change e Control Change** con canale, numero e valore scelti dall'utente. La stessa
modalità vale per qualunque altro programma, che è il motivo per cui conviene farla così e
non «per AmpliTube».

### Cosa cambia nel firmware

Poco, se l'indirezione la si mette adesso: oggi «premuto il tasto n» significa «manda il
frame del preset n allo Spark». Diventa «premuto il tasto n» → **chiedi alla modalità
corrente cosa fare**. Antirimbalzo, OLED, LED, lettura batteria non si toccano, e valgono
identiche le regole di sempre (mai operazioni BLE dentro un callback BLE, niente attese
bloccanti che non guardino gli ingressi).

**In modo MIDI l'ampli non serve**, quindi il vincolo «un padrone alla volta» non si pone
nemmeno: il pedale smette di fare da client verso lo Spark e fa solo da peripheral verso il
PC. Le due cose insieme — comandare Spark e AmpliTube con la stessa pressione — vorrebbero
NimBLE central e peripheral contemporaneamente: si può, ma è un'altra cosa e adesso non
serve.

### Le due decisioni da prendere quando ci si arriva

- **Come si cambia modalità: il primo e l'ultimo footswitch premuti insieme**, deciso
  dall'utente il 29 agosto 2026. Non con un footswitch da solo — sul palco la sorpresa è il
  difetto peggiore, ed è la stessa ragione per cui il quinto footswitch cambia metà senza
  toccare il suono — e quei due sono i più lontani fra loro, quindi un piede non li prende
  per sbaglio. La modalità **si deve ricordare al riavvio** — che è lo stesso lavoro del banco, che oggi non si ricorda
  (punto 5 di «Dove si riprende»): tanto vale farli insieme. L'OLED dice sempre in che
  modalità sta.
- **Chi scrive la mappa dei comandi.** Il pannello «Pedale» dell'app, che già compone i
  banchi offline e li manda sul ponte: otto righe con canale, tipo, numero, valore e il
  nome da mostrare sull'OLED. Vale la trappola del banco: **il formato sta in due file che
  vanno cambiati insieme** (`src/pedale-ponte.js` che lo costruisce, l'header del firmware
  che lo legge), e nel firmware è l'unico punto dove entrano byte non nostri.

**Costo in ferramenta: zero. Rischio sul modo Spark: zero**, non lo tocca. L'unico rischio
vero è il BLE-MIDI su Windows, e si misura prima.

### La prova, e come rifarla (29 agosto 2026)

Lo strumento c'è ed è verificato che compili e giri: **`pedale/prova-midi/`**, uno sketch che
fa fingere alla devkit C3 una pedaliera BLE-MIDI vera — servizio `03B80E5A-…`,
caratteristica `7772E5DB-…`, si annuncia come **SparkPedale MIDI** e manda Program Change,
Control Change o una nota ogni due secondi, comandato dal monitor seriale. Nessuna libreria
da installare: `BLEDevice.h` del core esp32, come `prova-ble`. Il nome sta nella **risposta
alla scansione** e non nell'annuncio, perché il solo UUID a 128 bit si mangia 18 dei 31 byte
disponibili — col nome dentro l'annuncio non parte e la scheda resta invisibile.

Caricato e fatto girare sulla C3 il 29 agosto 2026 (`esp32:esp32:esp32c3:CDCOnBoot=cdc`).
**La prova su Windows non è stata portata a termine**: la scheda è stata poi cancellata su
richiesta dell'utente, quindi **non sappiamo ancora se Windows veda il dispositivo né se
AmpliTube lo senta** — che è la domanda che decide tutto. Per rifarla: ricaricare lo sketch,
accoppiare da Bluetooth di Windows, e guardare in **MIDI-OX** se compare fra i MIDI Inputs.

Sul PC dell'utente c'è già tutto il necessario, verificato il 29 agosto 2026: Bluetooth
Intel con LE, **MIDI-OX** (monitor), **Bome Virtual MIDI** (porte virtuali, utile se serve
un ponte) e AmpliTube 5. Il servizio `midisrv` c'è, ma è quello storico: **non risulta
installato il nuovo stack Windows MIDI Services**, ed è proprio lui che deciderebbe se il
BLE-MIDI si vede senza intermediari.

### Come è finita la prova: Windows non sa fare BLE-MIDI (29 agosto 2026)

**Risultato, e chiude la questione BLE su PC**: la scheda funziona, Windows la vede, ci si
collega e le legge dentro il servizio BLE-MIDI — ed è proprio questo che rende la risposta
sicura. **Non è Windows che non arriva al dispositivo: è Windows che non lo trasforma in una
porta MIDI.** Il supporto BLE-MIDI nativo non c'è, nemmeno nel nuovo stack Windows MIDI
Services: è dichiarato *in backlog*, non implementato. Chi usa pedaliere BLE su Windows passa
per forza da un programma di terzi che fa da ponte (il driver KORG BLE-MIDI, «Perfect
Bluetooth MIDI For Windows», MIDIberry).

Le misure, per non rifarle:

- il dispositivo si annuncia correttamente (flag di scopribilità compresi: il default della
  libreria è già `GEN_DISC | BREDR_NOT_SPT`) e Windows lo elenca fra i BLE non accoppiati;
- `BluetoothLEDevice.FromBluetoothAddressAsync` + `GetGattServicesAsync` tornano `Success` e
  mostrano `03b80e5a-…`, cioè **il servizio MIDI è raggiungibile dal PC**;
- l'accoppiamento fallisce (`DevicePairingResult.Status = Failed`) con e senza livello di
  protezione, anche dopo aver abilitato bonding e Secure Connections sullo sketch. **Non è
  stato approfondito, perché non cambia la conclusione**: anche accoppiato, Windows non
  creerebbe la porta MIDI;
- sul PC dell'utente **non esiste nessuna porta MIDI in ingresso**, né WinRT né WinMM
  (verificato via `MidiInPort.GetDeviceSelector()` e `midiInGetNumDevs`). Quindi AmpliTube
  oggi non ha nessuna sorgente MIDI da cui partire.

**Una lettura da non ripetere**: `DeviceInformation.Pairing.CanPair` preso da `FindAllAsync`
vale `False` per **tutti** i dispositivi, TV comprese — non dice niente sul nostro. Diventa
`True` solo su un `DeviceInformation` ricavato da un dispositivo già connesso. Ci ho creduto
per un giro.

**Nota d'ambiente**: PowerShell 5.1 **non può sottoscrivere eventi WinRT**
(`Register-ObjectEvent` fallisce), quindi niente `BluetoothLEAdvertisementWatcher` né
`DeviceWatcher` da script. Le chiamate `…Async` invece si aspettano con
`System.Runtime.WindowsRuntime` e `AsTask`, ed è così che sono state fatte tutte le misure
qui sopra. Un aiutante in C# non si compila: manca il targeting pack, e il `csc` del .NET
Framework non digerisce gli eventi WinRT dei `winmd` di sistema.

### Allora la strada è un altro chip: XIAO ESP32-S3

**L'ESP32-S3 ha l'USB-OTG vero**, quindi con la modalità «USB OTG (TinyUSB)» del core Arduino
si presenta al computer come **dispositivo USB-MIDI class compliant**: nessun driver, nessun
programma ponte, nessun accoppiamento — si attacca il cavo e AmpliTube lo trova. Sulla XIAO
ESP32-S3 è verificato da altri e la scheda ha lo stesso formato della C6.

**Quindi, se la modalità MIDI conta davvero, il cervello del pedale è la S3 e non la C6** — e
il momento per deciderlo è adesso, che non c'è ancora niente di saldato. La S3 fa anche il
BLE verso lo Spark, quindi non si perde niente del progetto originale; si perde il Wi-Fi 6 e
il Bluetooth 5.3 della C6, che qui non servono a nulla.

Cosa andrebbe rifatto passando alla S3, da mettere in conto:
- **la mappa dei piedini**: numeri GPIO diversi, e sulla S3 alcuni sono di strapping — cade
  la comodità della C6, dove nessuno degli undici lo era;
- **i tempi BLE**, che vanno rimisurati comunque (erano su C3);
- **il modo di riprogrammarla**: in USB OTG la scheda non compare più come porta seriale, e
  per ricaricare il firmware si tiene premuto BOOT e si tocca RESET. Il log seriale passa
  dai piedini UART o si rinuncia.

**Non deciso**: se comprare la S3. Sono pochi euro e non butta via la C6, che resta buona per
il modo Spark puro.


## Quanto sarà grande, e la scatola di legno — 29 agosto 2026

Stima chiesta dall'utente. **La misura non la decidono i componenti: la decide il piede.**
L'elettronica ci sta larga in qualunque scatola capace di reggere cinque footswitch.

### La misura, decisa col piede e non a tavolino

**Definitiva, 29 agosto 2026: pannello utile 340 × 100, esterno 360 × 120 × 35 mm**,
interassi **70 + 70 + 70 + 90**.

**Il numero l'ha deciso una prova col piede, e ha battuto la mia stima di parecchio.** Avevo
scritto «45 mm il minimo, 50 comodo» ragionando su una scarpa media: **l'utente ha provato e a
60 mm ne premeva ancora due insieme**, perché ha il piede grande. Da lì i 70. È la lezione che
conta più del numero: **la spaziatura dei footswitch si misura col proprio piede, non si
stima**, e la stima sbagliava del cinquanta per cento.

**I 90 mm fra il quarto e il quinto non sono spazio in più: sono un riferimento tattile.** Il
quinto pedale fa una cosa diversa dagli altri quattro — cambia metà senza toccare il suono — e
con un vuoto più largo il piede lo trova senza guardare.

Ne viene una scatola lunga: per riferimento un Boss ES-5 mette cinque pedali in 300 × 130 mm,
quindi 360 × 120 è più largo e meno profondo. **Da tenere presente per la borsa e per una
eventuale pedaliera**, dove 360 mm non entrano dappertutto.

Per confronto, le stime che erano state fatte prima della prova e che restano solo come
storia: ~295 × 125 × 35 con interassi 55+55+55+70, e ~235 × 140 con interassi da 45.

Da dove vengono i numeri:

- **larghezza** = quattro spazi fra i cinque pedali × 45÷50 mm, più ~28 mm di bordo per lato;
- **profondità** ≈ 28 mm dal bordo al centro dei pedali + ~35 mm di pannello libero perché il
  piede non arrivi allo schermo + 44 mm di modulo display + bordo. **Era 145 e adesso è 125**,
  perché i **due tasti a mano vanno ai fianchi del display, non dietro**: il display è largo
  55 su una scatola larga 295, e ai suoi lati ci sono un centinaio di millimetri vuoti per
  parte. Trenta millimetri in meno, e in più si ha un tasto banco per mano;
- **altezza**: la detta il footswitch, che sotto il pannello sporge ~30 mm. Servono ~40 mm
  liberi dentro, e con top e fondo da 5 mm fanno 50 esterni.

**L'elettronica non è un vincolo**, ed è il punto: sommati, i pezzi occupano poco più di
**70 cm²** di pianale (display 71 × 43, portacella 78 × 21, espansore ~45 × 35, TP4056
26 × 17, XIAO 21 × 17) contro i ~300 cm² del pianale interno della scatola minima. Quattro
volte lo spazio che serve: i pezzi si dispongono come è comodo saldarli, non come costringe
lo spazio.

**Assunzioni da verificare col calibro quando arrivano i pezzi**: espansore KAmod ~45 × 35 mm
e footswitch ø12 mm di filetto con ~30 mm di corpo. Sono le misure tipiche, non le schede.

### I materiali, scelti dall'utente il 29 agosto 2026

**Sponde in mogano da 10 mm, top e fondo in rovere da 5 mm**, con rinforzi interni contro le
flessioni. Le misure qui sopra assumevano già pareti da 10 mm, quindi restano; il top e il
fondo sottili fanno guadagnare in altezza.

Tre cose che discendono da questi spessori, e vanno decise prima di tagliare:

- **le prese USB-C non entrano in 10 mm.** Il filetto M21×1,5 accetta un pannello **fino a
  8 mm** e la sponda è 10: serve una **svasatura dall'interno** (Forstner 24-25 mm per ~3 mm,
  poi il passante da 22). Vale anche per l'interruttore generale se ha il filetto corto — da
  misurare;
- **i rinforzi vanno fra un footswitch e l'altro, non sotto** (deciso dall'utente il 29 agosto
  2026, ed è meglio della striscia continua che avevo proposto). Al foro restano 5 mm, quindi
  **il filetto del footswitch non è più un vincolo** — con la striscia continua rovere 5 +
  rinforzo 5 sarebbe stato al limite dei ~10 mm utili e il dado poteva non prendere. E le
  nervature cadono **ogni ~50 mm** invece che ogni 70-80, quindi il top è più rigido. Tre
  cose perché lavorino davvero:
  - **devono arrivare alle sponde.** Se corrono avanti-indietro e vanno a battuta sulla sponda
    davanti e su quella dietro, la pedata finisce nel mogano da 10; incollate solo sotto al
    rovere irrigidiscono e basta;
  - **fibra del rovere lungo la fila dei pedali**, cioè nel senso della larghezza. Cinque fori
    da 12 mm in linea sono una linea debole, e le nervature che la attraversano sono
    esattamente ciò che ferma una spaccatura. Con la fibra nell'altro senso una crepa che parte
    da un foro corre dritta al bordo davanti;
  - **spazio al corpo del footswitch**, largo ~15 mm sotto il pannello e coi terminali che
    sporgono di lato: a 50 mm d'interasse restano ~17 mm per parte, a 45 va controllato col
    pezzo in mano **prima** di incollare, che dopo le nervature non si spostano;
- **la finestra del display è il punto debole del top**: un rettangolo da 55 × 27,5 mm in
  mezzo a 5 mm di rovere, con le pedate che arrivano dal bordo davanti. Va incorniciata con un
  telaietto incollato sotto, e vuole **almeno 15 mm di legno pieno** fra sé e qualunque altro
  foro.

Il rovere da 5 mm su una campata di 235 mm va appoggiato ogni **70-80 mm**: due traverse oltre
alla striscia del fronte. Il mogano da 10 sulle sponde è abbondante — lì la sollecitazione è
di taglio sugli angoli, quindi **tasselli d'angolo interni**, che servono comunque come punti
di avvitamento del fondo.

### L'altezza: 35 mm si può, ma dipende da una misura che non abbiamo

L'utente punta a **35 mm esterni** (29 agosto 2026). **Le sponde di mogano sono alte 35 e il
top e il fondo si incassano** in battuta, quindi fra la faccia sotto del top e la faccia sopra
del fondo restano **25 mm liberi**, ed è quello il numero contro cui va confrontato tutto.

Della costruzione a incasso c'è una conseguenza da decidere adesso: **si possono far sporgere
le sponde di 2-3 mm sopra il top**, e diventano un bordo che protegge pannello e footswitch
quando il pedale va in borsa a faccia in giù. Si paga millimetro per millimetro sull'altezza
interna, e a 25 mm non ce n'è molto da regalare.

**Gli ingombri in altezza che conosciamo ci stanno**: portacella con dentro il 18650 ~21 mm,
modulo display col connettore sotto i 15, espansore coi pettini saldati ~13, TP4056 e XIAO
pochi millimetri. Ma **il portacella a 21 mm su 25 vuol dire che sopra di lui non passa più
niente**: va messo dove non ci sono né footswitch né schede, e questo vincola il pianale.

**Due cose invece si rompono, e vanno decise prima di tagliare:**

- **il codino USB-C a foro tondo ci sta, e resta quello.** Avevo scritto che non ci stava,
  contando 25 mm di sponda utile perché davo per scontata una battuta scavata per tutta la
  lunghezza: **la sponda è alta 35 e il foro è 22, quindi restano 13 mm, 6,5 per lato** — la
  giunzione la decide chi costruisce, e l'ha decisa l'utente. Resta un solo dettaglio da
  tenere d'occhio nel disegnarla: **il dado M21×1,5 vuole un appoggio piano di ~26-28 mm
  all'interno**. Regge quindi anche l'idea delle due prese **fisicamente diverse** — uno
  HENGBIRD tondo per la carica e un BTFO rettangolare per il firmware — che le fa distinguere
  per forma invece che per etichetta;
- **il footswitch è il vero collo di bottiglia, e la sua misura non ce l'abbiamo.** Il numero
  da prendere col calibro appena arriva è **quanto sporge sotto il pannello, fili compresi**:
  **≤ 20 mm** e i 35 si fanno con margine; **~25 mm** e ci si sta al pelo, coi fili da piegare
  subito di lato; **28-30 mm**, che è il caso comune dei footswitch da pedale, e **non ci si
  sta**: servirebbero ~42-45 mm esterni.

**Quindi: disegnare a 35 mm sì, tagliare il legno no, finché il footswitch non è in mano.** È
l'unico pezzo che può obbligare a rifare tutto.

**E se fosse troppo alto ma i 35 mm stessero a cuore**, la via non è alzare la scatola: è
**scavare una sede nel fondo sotto la sola fila dei pedali**. Nel legno è un lavoro normale, e
lascia la scatola bassa dappertutto tranne dove serve.

### Fori di areazione: non servono, tranne per una cosa — 29 agosto 2026

Chiesto dall'utente. **Da acceso il pedale non scalda**: ~60 mA a 3,7 V sono **un quarto di
watt** in tutta la scatola, e nessun foro cambia una temperatura che non sale.

**L'unica cosa che scalda è il TP4056 mentre carica**, e non di poco: con la cella scarica
dissipa fino a **2 W** in un chip minuscolo, dieci volte tutto il resto del pedale. Ma non è
un problema, per tre ragioni: **il TP4056 si autoregola** e quando scalda abbassa la corrente
da solo, quindi il caso peggiore è una carica più lenta, non un guasto; **si carica a
interruttore spento**, quindi non ci si somma il consumo del pedale; e **una scatola di legno
avvitata non è ermetica**, le connessioni e il fondo lasciano passare aria a sufficienza per
due watt.

**E i fori hanno un costo che qui pesa più del beneficio**: il pedale sta per terra, dove
finiscono polvere, birra e la pioggia del carico e scarico. Un foro sul top è un imbuto
puntato sull'elettronica.

**Se si vogliono lo stesso** — fa caricare un filo più in fretta — la regola è **mai sul top e
mai sul fondo**: qualche foro da 3 mm in basso sulla **sponda dietro**, vicino al TP4056. Lì
il liquido non arriva per gravità e la convezione lavora comunque.

Quello che serve davvero, e non è ventilazione, è **il fondo smontabile con le viti**, già
previsto: per un litio in una scatola conta più di dieci fori.

**Un dissipatore sul TP4056 non serve** (chiesto dall'utente il 29 agosto 2026): il chip è un
SOP-8 con la **piazzola termica sotto**, saldata al rame della scheda, quindi il calore esce
dal fondo e non dal dorso di plastica. Un'alettina incollata sopra lavora sulla faccia
sbagliata.

**Se si vuole togliere il problema alla radice costa una resistenza**: la corrente di carica
la decide `R3` sul modulo (di serie `122`, cioè 1,2 kΩ = 1 A). La dissipazione è
(5 V − tensione della cella) × corrente, quindi **al peggio ~1,8 W a inizio carica**, che cala
salendo la tensione della cella.

| R3 | corrente | picco dissipato | carica di una 3300 |
|---|---|---|---|
| 1,2 kΩ (di serie) | 1 A | ~1,8 W | ~4 h |
| **2 kΩ** | ~600 mA | ~1,1 W | **~6-7 h** |
| 2,4 kΩ | ~500 mA | ~0,9 W | ~8 h |

**La 2 kΩ è la scelta sensata**: sette ore sono una carica notturna, che è come il pedale verrà
usato, e restano **quattordici volte i 50 mA della XIAO**, che è la ragione per cui il TP4056
esiste in questo progetto. La cella ci guadagna pure.

E comunque, anche a 1 A, **il TP4056 si autoregola** abbassando la corrente quando scalda: non
esiste il caso in cui si rovina, esiste il caso in cui ci mette di più. **Quello che conta più
di qualunque alettina è dove lo si monta**: su distanziali con aria attorno, non incollato
contro il legno, che è un isolante.

**Come si fissa il TP4056, che fori di montaggio probabilmente non ne ha** (chiesto
dall'utente il 29 agosto 2026). Sui moduli di quel formato — il suo è 25 × 16,5 mm —
**di solito i fori non ci sono**; ne ha sei, quindi la verifica è di due secondi.

Due vincoli però cadono da soli, e insieme tolgono metà del problema:

- **il modulo non regge nessuna forza.** Il cavo di carica non ci si infila: dalla presa del
  pannello arrivano **due fili alle piazzole `+` e `−`**, che è la soluzione già decisa proprio
  perché la spinta d'inserimento si scarichi sul pannello. Il fissaggio deve tenere il peso del
  pezzo, nient'altro;
- **se si mettono i due LED veri sul pannello** invece di guardare quelli a bordo — l'altra
  strada già scritta qui sopra — il modulo si può mettere **dove si vuole**, senza allinearlo a
  nessuna finestrella.

Restano tre vie, in ordine di quanto convincono:

1. **due guide scanalate di legno**, una fresatina da ~1,8 mm per parte e il modulo entra di
   costa: niente fori nel rame, niente viti, **aria su tutte e due le facce**, e **in verticale
   la convezione lavora meglio** che in piano. Per chi lavora il legno è la via più corta;
2. **una basetta millefori come portapezzo**: il modulo saldato sopra, la basetta sui
   distanziali. Dà anche un posto ordinato dove far arrivare i fili;
3. **forarlo da sé**, 2 mm negli angoli. Si può, ma si va nel piano di massa e forse in una
   pista: è la via che rischia di più per il guadagno minore.

**Verificato sulla foto del pezzo il 29 agosto 2026: sono `HW-373 V1.2.1`, e fori di montaggio
non ne hanno.** Quindi vale la via delle guide scanalate. Due cose viste nella stessa foto:

- **arrivano ancora in pannello**, uniti dalle linguette. Staccandoli restano i **dentini sui
  bordi**, che per il montaggio a scanalatura vanno **limati a filo** — e va fatto *prima* di
  fresare il legno, così si misura lo spessore vero. Si staccano piegando poco e tagliando: è
  una scheda con un chip sopra, e le microfratture nel rame vicino al bordo non si vedono;
- **la resistenza della corrente di carica si cerca per la marcatura `122`, non per la sigla**:
  su queste schede la numerazione cambia da revisione a revisione (sul pannello si leggono R1,
  R2, R3, R4, R8). Al suo posto una **`202`** e si è a ~600 mA.

### Proteggere il display — 29 agosto 2026

Il rischio non è la pedata: il display sta dietro i footswitch. È **la borsa** — un cavo, una
chiave, uno spigolo che ci finisce sopra in transito — più polvere e liquidi, che sul palco
arrivano dall'alto.

**Vetrino: policarbonato da 2 mm, fumé scuro.** Tre ragioni:

- **policarbonato e non plexiglass**: su una luce di 55 × 27,5 il plexi si crepa a stella a un
  colpo secco, il PC a quello spessore non si rompe;
- **fumé e non trasparente**: su un OLED il nero dello schermo spento sparisce nel grigio del
  filtro e le scritte sembrano galleggiare. È quello che fanno gli apparecchi seri e costa
  uguale;
- **2 mm e non 1**: sotto flette e arriva a toccare il vetro dell'OLED.

**Montaggio: battuta sulla faccia di sopra, vetrino a filo del legno.** Finestra passante più
una tasca di 2 mm profonda e ~3 mm più larga per lato. Si pulisce con uno straccio, non fa
pozzetto, e se si riga si sostituisce. **L'alternativa — incollato sotto il pannello — protegge
meglio i bordi ma lascia un pozzo profondo 5 mm** che sul palco raccoglie di tutto; con 2 mm
di PC quella protezione in più non serve.

Due dettagli che decidono la riuscita:

- **un millimetro d'aria fra vetrino e vetro dell'OLED.** Il modulo si fissa al pannello con
  distanziali o un telaietto, **non si spinge contro il vetrino**: il vetro dell'OLED è
  sottile e non deve fare da appoggio a niente;
- **smusso a 45° sul bordo di sopra della finestra.** Questo display si legge **in piedi, col
  pedale per terra**, quindi di sbieco: 5 mm di legno più 2 di vetrino mangiano un pezzo del
  bordo vicino, e lo smusso lo restituisce.

E una **guarnizione di gommapiuma adesiva** attorno alla finestra, fra pannello e modulo:
tiene fuori la polvere e fa da cuscino al modulo, che altrimenti appoggia rigido sul legno.

**Nello script la battuta e il vetrino ci sono** (`VETRINO_SP`, `VETRINO_BORDO`); lo smusso no,
che è un raccordo da fare a mano sul modello o con la fresa sul pezzo.

### Il display è I²C a 4 pin, non SPI a 7 — 30 agosto 2026

Sul banco è saltato fuori che il modulo arrivato ha **quattro pin: GND, VDD, SCL, SDA**. Il
preventivo diceva «SSD1309 in SPI a 7 pin» e non era così. Il pezzo è
**`2.42OLED-IIC VER:1.1`**, e la cosa è **in meglio**:

- **libera cinque piedini** (SCK, MOSI, CS, DC, RST) rispetto alla versione SPI;
- **sta sullo stesso bus dell'MCP23017**, indirizzi diversi, senza darsi fastidio;
- l'indirizzo lo scelgono due ponticelli sul retro, `0X78` e `0X7A`: il modulo arriva chiuso
  su **`0X78`**, cioè **`0x3c`** per lo scanner. Si lascia com'è.

**La trappola, che sul retro è scritta in cinese**: *如需ACK应答，请短接D2* — «se serve la
risposta ACK, cortocircuita D2». `D1` e `D2` non sono piazzole vuote, sono **due diodi**:
«cortocircuitare» vuol dire scavalcarne uno con lo stagno, non toglierlo. E **non è
opzionale come sembra**: il controller I²C dell'ESP32, se dopo l'indirizzo non riceve l'ACK,
**interrompe la trasmissione** — senza quel ponte il display rischia di non scrivere affatto,
non solo di non farsi trovare dallo scanner.

**Sull'esemplare dell'utente D2 era già cortocircuitato di fabbrica** (misurato in modo diodo:
1 mV nei due versi), quindi non c'è stato niente da saldare. Ma su un pezzo di ricambio va
ricontrollato, perché il costruttore lo scrive apposta.

Lo strumento è **`pedale/prova-display/`**: fa la scansione del bus *e* accende il display, e
la scansione è la stessa che servirà per l'MCP23017. Se lo schermo resta nero ma la seriale
conta, si cambia `CONTROLLORE` in cima allo sketch: i moduli in giro sono di tre tarature che
si distinguono solo provando.

## Il banco, prima serata — 30 agosto 2026

Il pedale è passato dal disegno ai fili. Cosa è chiuso, cosa è aperto.

### Chiuso: display, bus, espansore, lettura dei pulsanti

`pedale/prova-display/` e `pedale/prova-espansore/` girano sulla **XIAO ESP32-C6** (l'S3 non
è arrivata: il venditore ha spedito un'altra C6, e non blocca niente — solo la modalità MIDI
vuole l'S3). Verificato sull'hardware:

- il **display scrive**: tre schermate a rotazione, pagina finta del pedale, cornice 128×64 e
  tutti i pixel accesi;
- **display ed espansore convivono sul bus**: la scansione trova `0x3c` e `0x20`;
- l'**MCP23017 legge un pulsante** coi pull-up interni, e le otto caselle sullo schermo
  seguono gli otto ingressi;
- l'**MCP23017 accende un LED** su `PB0` (lampeggio di prova all'avvio, cinque volte).

**Gli sketch non dipendono dalla scheda**: i piedini si chiamano `D4` e `D5`, e il numero di
GPIO lo mette la variante — 5 e 6 sull'S3, 22 e 23 sul C6. Passando all'S3 non si tocca niente.

### La trappola che è costata la serata: `Serial.print` si blocca

**Sulla XIAO la seriale passa dentro la USB, e se al PC nessuno sta leggendo la porta ogni
`Serial.print` resta appesa fino a un timeout.** Con due stampe per ciclo, un lampeggio da
1,4 s diventava **cinque secondi**, e i pulsanti rispondevano con ritardo. L'utente l'ha detto
due volte e io l'ho scartato come impressione: era un dato.

Il rimedio è una riga, **`Serial.setTxTimeoutMs(0)`**, e nel firmware vero non è un dettaglio:
**sul palco il PC non c'è**, quindi senza quella riga il pedale striscerebbe proprio quando
serve.

**E la prova che era così ce l'avevo in mano senza vederla**: la mia misura dei tempi tornava
perfetta — quindici rapporti da due secondi in trenta secondi veri — proprio perché la facevo
**con la porta aperta**, cioè con qualcuno che leggeva. La lezione di metodo: **misurare un
tempo mentre si è collegati può nascondere il difetto che si manifesta da scollegati.**

### Il ritmo del giro, misurato

| operazione | tempo |
|---|---|
| leggere gli otto ingressi (`GPIOA`) | **166 µs** |
| scrivere i LED (`OLATB`) | trascurabile |
| **ridisegnare tutto il display** | **35 ms** |

Da cui la regola, che vale per il firmware vero: **gli ingressi si leggono spesso, il display
si ridisegna solo quando qualcosa cambia**. Un fotogramma sono 1024 byte sullo stesso bus da
cui si leggono i pulsanti: ridisegnando a ogni giro, il tasto si legge solo fra un disegno e
l'altro. E **i LED si scrivono prima del disegno**, perché devono seguire il dito.

### Aperto: l'espansore scalda, e il perché non è confermato

Fine serata: **l'MCP23017 a 60 °C**, il LED che ha smesso di accendersi, e un ronzio dalla
XIAO **che sparisce staccando l'espansore**. La XIAO da sola sta a 40 °C, che è normale.
Nessun odore, e il modulo dell'espansore **non ha un corto**: 15 kΩ fra `V+` e `GND` scollegato.

**L'ipotesi da verificare per prima**, che spiegherebbe tutto insieme: **`V+` non arriva
davvero** — foro sbagliato, saldatura fredda, contatto che balla — e il chip si alimenta di
straforo **attraverso le protezioni interne dei piedini `SD` e `SC`**. Un chip alimentato così
**risponde sul bus** (per questo lo scanner lo trovava), **non pilota le uscite** (il LED che
smette) e **scalda**.

Le quattro misure da fare quando si riprende, in quest'ordine:

1. continuità fra `V+` dell'espansore e `3V3` della XIAO — **deve suonare**;
2. continuità fra `GND` dell'espansore e `GND` della XIAO — deve suonare;
3. `V+` contro `GND` dell'espansore: **non** deve suonare (è la misura da 15 kΩ, già fatta);
4. con la USB attaccata, **volt continui fra `GND` e `V+` dell'espansore: devono essere ~3,3 V**.
   Molto meno, o un valore che balla, conferma l'alimentazione parassita.

Il LED resta scollegato finché quelle quattro non tornano.

**Come si riprende (deciso dall'utente il 30 agosto 2026): si aspetta l'S3 e si rifà tutto su
millefori.** Il cablaggio volante su breadboard è diventato ingestibile, e per giunta **è il
principale indiziato del guasto rimasto aperto**: un filo che balla su `V+` è esattamente
l'ipotesi in piedi, e su millefori sparisce per costruzione.

L'ordine di montaggio che evita di ripetere la serata: **prima le piste di 3V3 e GND, poi si
dà corrente e si misurano i 3,3 V nei punti dove arriveranno espansore e display, e solo dopo
si saldano i componenti.** Se il problema era l'alimentazione, così non si ripresenta; e se si
ripresenta, allora non era quello e le quattro misure qui sopra tornano utili.

### Chiuso: l'espansore che scaldava era il flussante — 2 settembre 2026

Il capitolo aperto della prima serata (MCP23017 a 60 °C) si è chiuso al secondo montaggio,
e **la causa non era nessuna delle ipotesi in piedi**: non il cablaggio volante, non `V+`
che non arrivava, non il chip bruciato.

Rifatto tutto su millefori, con i quattro fili verificati uno per uno in continuità, il chip
è arrivato a **80 °C**. **L'ha trovata l'utente: era il flussante residuo.** Pulito con
alcol isopropilico, l'espansore è sceso a **23 °C**, cioè temperatura ambiente.

**Il meccanismo, che spiega tutto il quadro**: il flussante residuo non è isolante e fa un
percorso da qualche kΩ fra saldature vicine — su una fila a 2,54 mm ce n'è d'avanzo. Basta
che porti un ingresso fuori dai suoi limiti e un CMOS entra in **latch-up**: dentro il chip
si innesca un percorso parassita che tira corrente a vuoto e scalda, **e si spegne da solo
togliendo l'alimentazione**. Da cui il quadro esatto che avevamo: scalda tantissimo, non
lascia danni permanenti, sparisce quando la causa se ne va.

**La regola che ne resta, e vale per tutto il montaggio: il flussante si pulisce sempre e
subito**, alcol isopropilico e spazzolino. Non è ordine, è elettricità: su un chip che
assorbe microampere anche una perdita minima si vede.

**E una lezione di metodo, pagata due volte.** Avevo concluso «il chip è andato» da un
ragionamento sui watt — 80 °C senza carico ⇒ centinaia di milliampere ⇒ cinque ordini di
grandezza fuori. Il conto era giusto e la conclusione sbagliata, perché **la corrente non
passava dove pensavo**. Quando un componente scalda, prima di condannarlo va guardato
**intorno** al componente: il chip era l'ultimo anello, non la causa.

Nota a margine, sempre di quella sera: **l'ohmmetro su un chip non alimentato non dice
niente di utile.** La tensione di prova del tester è troppo bassa per far condurre le
protezioni interne, quindi «15 kΩ» e «infinito» sono la stessa risposta. Ci mi ero
appoggiato per decidere se il chip fosse vivo, e non poteva rispondere.

**Verificato sulla basetta definitiva e sulla S3 vera, il 2 settembre 2026**: scheda
`XIAO_ESP32S3`, scansione del bus che trova **`0x20` e `0x3c`**, configurazione
dell'espansore riuscita. I tempi sono gli stessi misurati sul C6 — lettura degli otto
ingressi **181 µs**, fotogramma intero del display **32,7 ms** — quindi la regola del giro
(ingressi spesso, display solo quando cambia) vale identica sull'S3.

**L'fqbn per l'S3 è `esp32:esp32:XIAO_ESP32S3:CDCOnBoot=default`**, e non è un dettaglio:
su quella scheda `CDCOnBoot` ha i valori rovesciati rispetto al C3 e al C6, quindi copiare
l'fqbn vecchio spegne la seriale su USB. Vedi `CLAUDE.md`, «Trappole dell'ambiente».

**L'ordine del connettore del display sulla basetta è `VDD · GND · SCL · SDA`**, da sinistra
a destra — montato così dall'utente il 2 settembre 2026, diverso da come l'avevo proposto io
(che avevo messo GND per primo). È quello che conta quando si infila lo spinotto, quindi vale
il montato e non il disegnato: aggiornato anche nella pagina della basetta.

### Il ronzio è il display, e la leva del consumo non è il contrasto — 2 settembre 2026

**Il rumore che si sentiva dalla prima serata è il modulo del display**, localizzato
dall'utente. Un pannello OLED non funziona a 3,3 V: il modulo si fabbrica da sé la tensione
alta che gli serve con un **convertitore a commutazione** — l'induttore `L2` che si vede sul
retro — e quel componente vibra alla frequenza a cui commuta. I ceramici lì attorno fanno la
loro parte, che sono piezoelettrici.

**La conferma definitiva è che il suono cambia col contenuto dello schermo**: con tutti i
pixel accesi il ronzio diventa un sibilo, perché il convertitore deve fornire più corrente e
lavora diverso. Non è un guasto, non fa danni, e nella scatola di legno chiusa si sentirà
molto meno.

**Il contrasto non è una leva.** Provati `255`, `160`, `96`, `48` e `16`: su questo modulo
**non si vede differenza**. Quindi non serve né a ridurre il ronzio né a risparmiare
batteria, e nel firmware resta a 255.

**La leva vera è quanti pixel sono accesi**, ed è la ragione per cui il sibilo cambia: su un
OLED non c'è retroilluminazione, ogni pixel si accende per conto suo e **un pixel nero è un
pixel spento che non consuma niente**. Da cui una regola di disegno per le schermate del
pedale, che vale per la batteria *e* per il rumore:

**schermate scure con scritte chiare, mai grandi zone piene.** Niente barre invertite, niente
riquadri riempiti, niente banda bianca col titolo dentro. La pagina a quattro righe di testo
su nero è già fatta giusta; la schermata «tutto acceso» esiste solo come prova.

### Il blocco I²C è chiuso — 2 settembre 2026

Tutto verificato sulla basetta definitiva e sulla XIAO ESP32-S3:

| cosa | esito |
|---|---|
| piste di alimentazione | **3,296 V** all'estremità lontana dalla XIAO |
| bus condiviso | **`0x20` e `0x3c`** trovati insieme dalla scansione |
| display | scrive |
| espansore, ingressi | il pulsante su `PA0` segue il dito, coi pull-up interni |
| espansore, uscite | **3,278 V**, senza cadute — e **un LED vero si accende** |

Della fila da 10 pin dell'espansore se ne usano **nove**: `PA0`…`PA6` per i sette pulsanti —
cinque footswitch più i due tasti banco — e le due `G` come masse, una per estremità, così i
ritorni di massa non attraversano tutti da una parte sola. Resta libero `PA7`, che è la
riserva per un ottavo comando (tap tempo, interruttore d'espressione).

**Le uscite `PB0`…`PB7` stanno sui due lati corti del modulo** e per usarle servono altri due
pettini da 4 con i rispettivi zoccoli: lavoro per il montaggio vero, non per le prove. Fino
ad allora `prova-espansore` fa battere **tutte e otto insieme**, dieci secondi alte e dieci
basse, così si misurano col tester senza premere niente e senza indovinare quale sia `PB0`.

**Due trappole della misura**, pagate entrambe:

- il puntale va appoggiato **sulla mezzaluna dorata del modulo**, non in un foro della
  basetta lì accanto: quel foro non è collegato a niente e legge **mezzo volt**, che sembra
  un'uscita rotta e non lo è;
- **un puntale che scivola su due pad adiacenti** mette in corto un'uscita alta contro una
  bassa. È probabilmente ciò che ha fatto scaldare il chip la terza volta, insieme al
  flussante delle saldature nuove.

### Il BLE sulla S3: misurato, e l'antenna non è opzionale — 2 settembre 2026

Il firmware `pedale/prova-ble/` portato sulla XIAO ESP32-S3 si collega allo Spark 2 e cambia
preset. Il porting è stato di due righe: **`Serial.setTxTimeoutMs(0)`** e il numero del tasto
BOOT, che sul C3 è GPIO9 e sull'S3 è GPIO0 — e non è estetica, perché **sull'S3 il 9 è
D10/MOSI**, che lasciato flottante produce pressioni fantasma, cioè cambi preset a caso.

**L'antenna, misurata.** Alla prima accensione la scansione trovava lo Spark a **−92 dBm**,
che è al limite del funzionamento. Il foglietto u.FL non era montato — la S3 non ha antenna a
bordo. Attaccandolo: **−63 dBm**, cioè **29 dB**, quasi ottocento volte la potenza ricevuta.
Da cui la regola: se un giorno il pedale «ogni tanto non si collega», **il primo sospetto è
quel connettore**, non il firmware.

**I tempi, rimisurati sull'hardware nuovo** (dieci cambi preset di fila, alternando due
slot):

| intervallo di connessione | giro medio | min–max | preset intero, 16 giri |
|---|---|---|---|
| lento, 30 ms | 82,0 ms | 80–100 | ~1312 ms |
| **veloce, 7,5 ms** | **26,5 ms** | 15–37 | **~424 ms** |

**Quindi `updateConnParams` funziona anche sull'S3**: lo Spark l'intervallo corto lo concede,
non lo ignora, e il guadagno è **tre volte**.

**E il numero del lento chiude una domanda vecchia.** I ~1300 ms sono esattamente quanto ci
mette il telefono con l'app: finora «il telefono è lento per l'intervallo di connessione, non
per la banda» era un'inferenza dalla teoria. Adesso è una misura diretta — **rallentando il
pedale allo stesso intervallo, ci mette lo stesso tempo.**

### Il pedale fa il pedale — 2 settembre 2026

`prova-ble` adesso è il firmware di un pedale vero, non più una sonda: **si preme il
footswitch e l'ampli cambia preset, e il display dice quale**. Tutto sull'hardware
definitivo, senza telefono in mezzo.

**Il footswitch viene dall'MCP23017**, non più dal tasto BOOT della scheda. Il cambio è stato
chirurgico: **la logica dell'antirimbalzo non è stata toccata di una riga**, è cambiata solo
la sorgente del livello (`livelloTasto()`). Funziona perché il verso è lo stesso nei due casi
— alto = rilasciato — dato che sia il pin BOOT sia il port A hanno il pull-up e il pulsante
tira a massa. **Se l'espansore non c'è sul bus, si ripiega sul tasto BOOT**, così lo sketch
gira ancora su una devkit nuda.

Dall'espansore si legge **al massimo una volta al millisecondo**: un footswitch non ha bisogno
di più, e il bus resta libero per il display.

**Il display mostra tre cose**: lo stato della radio, il nome del preset che sta suonando, e a
che punto del banco si è. Due regole, e vengono dalle misure:

- **si ridisegna solo quando qualcosa è cambiato**, mai a ogni giro. Un fotogramma costa
  **32 ms** contro i **0,18 ms** di una lettura del port A: ridisegnando sempre, il tasto
  verrebbe letto solo negli intervalli fra un disegno e l'altro;
- **mai durante un trasferimento**. Quei 32 ms non toccano il BLE, ma sono 32 ms in cui il
  loop non guarda il tasto — e la regola del pedale è che una pressione non si perde mai.

Il disegno è **scritte chiare su nero, senza zone piene**, che su un OLED è anche il modo di
consumare meno.

**L'altezza è confermata e la scatola si può tagliare — 2 settembre 2026.** Era rimasta
l'ultima incognita: quanto sporgesse il footswitch sotto il pannello, che sopra i ~25 mm
avrebbe obbligato a una scatola da 42-45 invece che da 35. **Misurato dall'utente: 20 mm**,
dentro i 25 liberi, con 5 mm per i fili — che bastano **a patto di piegarli subito di lato**,
perché un filo lasciato scendere dritto tocca il fondo.

E c'è un margine di regolazione che toglie ogni ansia: **il collo del footswitch è lungo**,
quindi quanto scende dentro lo decide quanto lo si lascia sporgere fuori. Due cose da tenere
a mente scegliendo: più esterno vuol dire **pulsante più alto sopra il pannello** — per un
footswitch non è un difetto, si trova meglio col piede — e **al dado deve restare filetto su
cui prendere**.

Quindi: **360 × 120 × 35 mm esterni, pannello utile 340 × 100, interassi 70 + 70 + 70 + 90.**
Niente resta da decidere.

**Il vetrino, deciso davvero — 2 settembre 2026.** La scelta di prima (policarbonato 2 mm)
è caduta su un vincolo pratico: **l'utente il policarbonato non lo può tagliare**, e a mano
non vuole farlo perché sta costruendo tutto con precisione da macchina. Da lì la catena:

- **il laser a diodo non taglia il plexi trasparente** (che a quella lunghezza d'onda è
  trasparente anche per il laser) né il policarbonato, che brucia e ingiallisce. **Il fumé
  scuro invece lo assorbe e si taglia bene** — cioè la scelta estetica coincide con l'unica
  lavorabile;
- ma il taglio non lo fa lui: **lo fa il venditore su misura**, che toglie il problema alla
  radice. In polacco il materiale è **`pleksa przydymiona grafit`** — grafite e non `brąz`,
  che virerebbe le scritte sull'ambra — e **`lana`/`GS`** (colata) e non `ekstrudowana`/`XT`;
- **spessore 3 mm e non 2**, perché in quella tinta il 2 non si trova.

**Quindi: `pleksa lana przydymiona grafit`, 3 mm, tagliata su misura 61 × 34 mm, due pezzi.**
Il 61 × 34 è la finestra (55 × 27,5) più i 3 mm di battuta per lato; la battuta nel legno si
fa 0,2 mm più larga perché entri senza forzare.

**La conseguenza dei 3 mm**: la battuta è profonda 3 su un top da 5, quindi **restano 2 mm di
legno attorno alla finestra**. Il telaietto incollato sotto — che era già previsto — da
consigliato diventa **necessario**, ed è lui a restituire la rigidezza. L'alternativa di
incollare il vetrino sotto il pannello invece che nella battuta è stata scartata: verrebbe
più semplice, ma il display finirebbe in fondo a un pozzo di 8 mm, **e questo schermo si legge
in piedi, cioè di sbieco**.

**Il fumé vince per una ragione che non è estetica — 2 settembre 2026.** Provato il grigio
scuro tenendo davanti al display un paio di occhiali da sole: **si legge male**. La prova è
però più severa del vero — gli occhiali stanno al 10-18% di luce passante, una pleksa
`przydymiona` al 30-50 — e la scelta l'ha decisa un vincolo pratico:

- **i servizi di taglio hanno un minimo di 10 × 10 cm**, quindi non si ordina un 61 × 34: si
  compra una lastra e ci si ricava il pezzo;
- **il trasparente l'utente non lo può tagliare** (il laser a diodo lo attraversa senza
  inciderlo), **il fumé sì**.

Quindi si compra **una lastra da 10 × 10 di `pleksa przydymiona grafit` da 3 mm** e i vetrini
si tagliano col laser — e da una lastra ne escono diversi, ricambi compresi. Se poi montato
risultasse troppo scuro da leggere in piedi, si torna al trasparente e si accetta il taglio
fatto fare.

## Estratti da CLAUDE.md, 2 settembre 2026 — versione lunga

Spostati qui per alleggerire la memoria di lavoro, dove ne resta la forma corta.

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

**Nel browser del riquadro `requestAnimationFrame` non gira**, e in Edge headless nemmeno:
misurato il 27 agosto 2026 con una sonda che contava i fotogrammi — **uno solo**, in tutti
e due. La pagina non compone, quindi rAF non scatta mai (e per lo stesso motivo lì lo
screenshot del riquadro fallisce: «not compositing frames»). Conseguenza pratica: **niente
che si muova da sé si può provare con rAF**, e infatti il ciclo del gioco è un
`setInterval`. Le catture di una pagina che *gira* si fanno con `--screenshot` e
`--virtual-time-budget`.

**Il service worker serve a Edge headless i file della corsa precedente.** Il profilo resta
sul disco, l'app ci registra `sw.js`, e da lì in poi ogni `--screenshot` guarda una copia
vecchia: si perde mezz'ora a chiedersi perché una modifica non si vede. Tre rimedi, in
ordine di comodità: una **query in coda** all'url (la chiave di cache comprende la query),
un profilo nuovo, oppure disiscrivere il service worker dalla pagina. Attenzione che il
profilo nuovo ne porta un'altra: **da freddo IndexedDB non fa in tempo a rispondere** col
tempo virtuale, quindi l'app resta a metà avvio.

**L'avvio dell'app chiude i pannelli.** `applicaVista()` chiama `chiudiPannelli()` quando il
database ha risposto: una prova automatica che apre un pannello troppo presto se lo vede
chiudere in faccia, e sembra un difetto del pannello.

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
- **Ma sulla XIAO ESP32-S3 i due valori sono ROVESCIATI** (2 settembre 2026): in
  `boards.txt` `CDCOnBoot.default=Enabled` e `CDCOnBoot.cdc=Disabled`. Quindi sull'S3
  l'fqbn giusto è **`XIAO_ESP32S3:CDCOnBoot=default`**, e copiare l'fqbn del C3/C6 spegne
  la seriale invece di accenderla. È saltato fuori solo perché `Serial.setTxTimeoutMs()`
  non compila su `HardwareSerial`: senza quella riga avremmo avuto il monitor muto e dato
  la colpa a tutt'altro. **Sulla S3 `Serial` è `HWCDC` solo con CDC acceso**, altrimenti è
  la UART.
- **Aprire la porta seriale resetta il chip**: sull'USB nativo DTR/RTS pilotano reset e
  boot. `DtrEnable=$false, RtsEnable=$false` per leggere senza toccare niente; con
  `RTS=$true` il chip riparte **in download mode** e non esegue lo sketch.
- **Da download mode non si esce via software**, nemmeno con `esptool --after hard-reset`:
  serve staccare e riattaccare il cavo. Distingue i due casi `boot:0x5 (DOWNLOAD)` contro
  `boot:0xd (SPI_FAST_FLASH_BOOT)`.

**Sulla XIAO `Serial.print` si blocca se nessuno legge la porta.** La seriale passa dentro la
USB e ogni stampa resta appesa fino a un timeout: un lampeggio da 1,4 s è diventato **cinque
secondi** e i pulsanti rispondevano in ritardo (30 agosto 2026). Si risolve con
**`Serial.setTxTimeoutMs(0)`** subito dopo `Serial.begin`, e **nel firmware del pedale non è
un dettaglio: sul palco il PC non c'è.** Ne segue una regola di metodo più larga:
**misurare un tempo mentre si è collegati alla seriale può nascondere il difetto che si
manifesta da scollegati** — la mia misura tornava perfetta proprio perché la porta era aperta.

**Il flussante residuo fa scaldare i chip, e lo abbiamo pagato tre volte** (2 settembre 2026).
**Si pulisce dopo OGNI sessione di saldatura, prima di ridare corrente** — non una volta e
via: la terza volta è tornato a scaldare per le saldature *nuove* dello zoccolo da 10 pin,
fatte dopo la pulizia precedente. Stessa categoria: **un puntale che scivola su due pad di
uscita adiacenti** mette in corto un'uscita alta contro una bassa, e scalda in un attimo —
si tocca un pad alla volta.
Non è isolante: fa un percorso da qualche kΩ fra saldature vicine, e su una fila a 2,54 mm
basta a portare un ingresso CMOS fuori dai suoi limiti e mandare il chip in **latch-up** —
tira corrente a vuoto, scalda, e **si spegne da solo togliendo l'alimentazione**, quindi non
lascia prove. L'MCP23017 è arrivato a 80 °C; **pulito con alcol isopropilico è sceso a 23**.
**Si pulisce sempre e subito.** E la lezione di metodo: **quando un componente scalda, prima
di condannarlo si guarda *intorno* al componente** — il conto sui watt era giusto e la
conclusione («il chip è andato») sbagliata, perché la corrente non passava dove pensavo.
Nota: **l'ohmmetro su un chip non alimentato non dice niente di utile**, la tensione di prova
è troppo bassa perché conducano le protezioni interne.

**Le librerie Arduino non si installano in `Documenti`**: Defender ci blocca la scrittura
(l'IDE è autorizzato, il mio `arduino-cli` no) e l'errore che dà è `mkdir … The system cannot
find the file specified`, che sembra un'altra cosa. Si estraggono a mano in
`%LOCALAPPDATA%\claude-arduino-libs` e si compila con `--libraries` che punta lì.

**Mai usare `|` come delimitatore di `s///` in perl su testo che contiene tabelle
markdown.** Il primo `|` del contenuto chiude il pattern e la sostituzione va a finire dove
capita — di solito **in cima al file**, che sembra tutt'altro guasto. Successo due volte il
2 settembre 2026, su uno sketch e su `docs/pedale.md`. Per modifiche mirate su questi file si
usa lo strumento di edit, non `perl -0pi`.

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
ESP32-S3** (era la C6 fino al 29 agosto 2026, vedi sotto), OLED **2,42" 128×64 SSD1309 in SPI a 7 pin**, espansore **KAmod I2C-IOexp16**
(MCP23017), cella **XTAR 18650-330PCM protetta** in portacella. **I LED non si comprano**:
sono i RGB 5 mm **a catodo comune** che l'utente ha già in casa a mucchi, quelli del suo
progetto `Timer` — resistenze già tarate a 3,3 V, **verde 100 Ω e rosso 220 Ω**, e il blu
non si usa perché quattro LED per due colori sono già le otto uscite libere
dell'espansore. Attenzione: **l'MCP23017 non ha PWM**, quindi acceso/spento e basta. Mancano footswitch e pulsantini dalla Cina, ma **per il firmware
bastano i pulsanti da arcade che l'utente ha in casa** (COM e NO del microswitch: sono la
stessa cosa elettrica).

**Il 29 agosto 2026 la scheda è passata dalla C6 alla XIAO ESP32-S3**, comprata dall'utente:
**solo l'S3 ha l'USB-OTG vero**, quindi è l'unica che può fare la modalità MIDI da sola, senza
programmi ponte (vedi «Discusso e non aperto: il pedale in modalità MIDI»). Tutta la
ferramenta comprata resta buona; cambia la mappa dei pin, e **quella della C6 nel resto di
questo file e in `docs/pedale.md` è storia**.

| piedino | GPIO | a cosa serve |
|---|---|---|
| D4 / D5 | `5`, `6` | I²C: **display e MCP23017 insieme** (SDA, SCL) |
| D0 (A0) | `1` | tensione di batteria — **il partitore va saldato** |
| D6 / D7 | `43`, `44` | UART: il log seriale, **da tenere libero** |
| D1, D2, D3, D8, D9, D10 | `2,3,4,7,8,9` | liberi (D2 è l'unico strapping: si usa per ultimo) |

**Il display è I²C a 4 pin, non SPI a 7** — scoperto sul banco il 30 agosto 2026, il
preventivo diceva un'altra cosa. Libera cinque piedini e sta sullo stesso bus dell'espansore.
La trappola è scritta in cinese sul retro: **`D2` va cortocircuitato o il display non manda
l'ACK**, e senza ACK il controller I²C dell'ESP32 **interrompe la trasmissione** — cioè il
display non scrive per niente. Sull'esemplare dell'utente era già chiuso di fabbrica; su un
ricambio va rimisurato. Indirizzo `0x3c`. Dettagli in `docs/pedale.md`.

**L'antenna non è a bordo, e senza non funziona il BLE** — non è l'antenna del Wi-Fi: la
radio a 2,4 GHz è una sola e la condividono. **Misurato**: senza, lo Spark si vede a
**−92 dBm**; col foglietto u.FL a **−63**. Se un giorno «ogni tanto non si collega», il primo
sospetto è quel connettore. Si usa il foglietto di serie dentro la scatola (di **legno**, che
ai 2,4 GHz è trasparente), **lontano dal metallo interno**. Altre due: **carica a 50 mA**
invece di 100, ininfluente perché si carica col TP4056; e **il log seriale sull'USB potrebbe
non convivere con la porta MIDI**, e allora passa dalla UART.

**La scatola, chiusa e senza più incognite: esterno 360 × 120 × 35 mm, pannello utile
340 × 100, interassi 70 + 70 + 70 + 90.** Sponde in **mogano da 10**, top e fondo in **rovere
da 5** incassati, rinforzi **fra un footswitch e l'altro** che arrivano alle sponde, fibra del
rovere lungo la fila dei pedali. Dentro restano **25 mm** e il footswitch ne occupa **20**.
Tre numeri che fanno danni se li dimentico: **le prese USB-C accettano un pannello fino a
8 mm**, quindi nella sponda da 10 va svasato dall'interno; **il vetrino del display è pleksa
fumé grafite da 3 mm** e la sua battuta lascia solo 2 mm di rovere, quindi **il telaietto
incollato sotto la finestra è obbligatorio**; e **i 90 mm fra il quarto e il quinto footswitch
sono un riferimento tattile**, non spazio in più. La bozza la genera
**`tools/scatola-fusion.py`**, installata in Fusion come **ScatolaPedale**. Tutto il perché in
`docs/pedale.md`.

**La lezione che vale oltre questo pedale: la spaziatura dei footswitch si misura col proprio
piede.** La mia stima («45 il minimo, 50 comodo») sbagliava del cinquanta per cento — a 60 mm
l'utente ne premeva ancora due insieme.

**L'alimentazione è decisa e comprata** (27 agosto 2026). Le cinque cose che fanno danni se le
dimentico; tutto il resto — cablaggio, saldature, indicatore di batteria, scelta dei pezzi —
sta in `docs/pedale.md`:

- **la XIAO carica pianissimo** — 100 mA la C6, **50 mA l'S3** che l'ha sostituita, e non i
  380 del C3: decine di ore su una 3300, quindi **la sua USB non è una via di ricarica**. Si
  carica con un **modulo TC4056 dedicato** e la sua presa; la cella si può anche estrarre e
  caricare fuori;
- **il TP4056 non fa load sharing**: per fidarsi del verde `FULL` si carica a **interruttore
  generale spento**. Usarlo mentre carica funziona lo stesso, non è un divieto;
- **interruttore generale fisico**, sul positivo **fra la cella e la XIAO**, col modulo
  attaccato alla cella *prima*. Il deep sleep non lo sostituisce: in borsa un footswitch si
  preme da solo. **Niente auto-spegnimento per inattività**, che sul palco è la sorpresa che
  non si vuole;
- **due prese sul pannello, da etichettare**: una carica, l'altra fa firmware, log seriale
  **e, con l'S3, il MIDI verso il computer**. Sono identiche, e il caricatore nella sbagliata
  non carica senza dirlo;
- **il partitore di A0 va saldato** (non è a bordo né sulla C6 né sull'S3), e **l'indicatore di batteria è
  firmware da scrivere**: quattro tacche a soglie, **mai percentuali** — la tensione di un
  litio è piatta nel mezzo — e sotto **3,50 V** un avviso impossibile da non vedere, che la
  protezione della cella taglia a 2,5 V e il pedale muore a metà canzone.

Interruttori sul **port A** dell'espansore (è quello che può far scattare l'interrupt), LED
sul port B.

**Tempi BLE rimisurati sull'S3** (2 settembre 2026): **26,5 ms** a giro con l'intervallo a
7,5 ms — cioè **~424 ms** per un preset intero — contro **82 ms** e **~1312 ms** con quello
lento. Quindi **lo Spark l'intervallo corto lo concede davvero**. E i 1312 ms del lento **sono
il tempo del telefono**: era un'inferenza, ora è misurato — il telefono è lento per
l'intervallo di connessione, non per la banda.

**Resta non verificato sull'S3**: l'autonomia, e se il modulo espansore abbia i pull-up
sull'I²C — se il bus non parte, quello è il primo sospetto, e si risolve con due resistenze
da 4,7 kΩ.

