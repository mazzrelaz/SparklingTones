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

### Le due misure

| | esterno, L × P × H |
|---|---|
| comoda, cinque pedali in fila a 50 mm | ~**260 × 145 × 50 mm** |
| minima vera, in fila a 45 mm | ~**235 × 140 × 50 mm** |

**Sotto i 45 mm da centro a centro non si scende**: con una scarpa vera se ne premono due
insieme, che è il guasto peggiore possibile sul palco. 50 mm è comodo.

Da dove vengono i numeri:

- **larghezza** = quattro spazi fra i cinque pedali × 45÷50 mm, più ~28 mm di bordo per lato;
- **profondità** ≈ 30 mm dal bordo al centro dei pedali + ~35 mm di pannello libero perché il
  piede non arrivi allo schermo + 44 mm di modulo display + ~25 mm per i due tasti a mano
  dietro + bordo;
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
- **il rinforzo sotto i footswitch ha per limite il filetto, non la robustezza.** Un
  footswitch da pedale ha ~10 mm di filetto utile: rovere 5 + rinforzo 5 è già al limite e il
  dado può non prendere. Quindi **si misura il filetto prima di incollare**, e se è corto il
  rinforzo va svasato dove passa il dado. Il rinforzo giusto è **una striscia unica lungo
  tutto il fronte**, non cinque tasselli: fa da piastra di montaggio per tutti e cinque e
  scarica la pedata sulle sponde invece che sul rovere;
- **la finestra del display è il punto debole del top**: un rettangolo da 55 × 27,5 mm in
  mezzo a 5 mm di rovere, con le pedate che arrivano dal bordo davanti. Va incorniciata con un
  telaietto incollato sotto, e vuole **almeno 15 mm di legno pieno** fra sé e qualunque altro
  foro.

Il rovere da 5 mm su una campata di 235 mm va appoggiato ogni **70-80 mm**: due traverse oltre
alla striscia del fronte. Il mogano da 10 sulle sponde è abbondante — lì la sollecitazione è
di taglio sugli angoli, quindi **tasselli d'angolo interni**, che servono comunque come punti
di avvitamento del fondo.
