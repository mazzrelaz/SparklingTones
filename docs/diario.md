# Diario delle sessioni

Il racconto di **come** ci si è arrivati. `CLAUDE.md` tiene le regole e il lavoro da fare;
qui sta la cronaca, che serve solo se si riapre un capitolo o se ci si chiede perché una
cosa è come è. Sfoltito da `CLAUDE.md` il **29 agosto 2026**, quando la sezione «Dove si
riprende» pesava da sola 13 KB.

Le voci sono in ordine dal più recente al più vecchio.

## 28 agosto 2026

**Il looper è chiuso, e il bpm si scrive.** Due risultati in una sessione, il secondo più
utile del primo.

**Il bpm** (dettaglio in `docs/protocollo-spark2.md`, «Il tempo (bpm) si scrive»): `0x0176`
**senza** il byte `0x00` finale, payload costruito dall'ultimo `0x0376` ricevuto cambiando
il solo bpm. Col byte in coda il tempo non cambia e **il delay parte in ripetizione
infinita** — l'ampli legge i campi spostati. Serve al pedale per il conteggio e agli
effetti a tempo, che seguono da soli perché l'accoppiamento è dentro l'ampli.

**Ed è già nell'editor**, col tap tempo: vedi «Editor della catena effetti». **Quello che
manca è la prova sull'hardware**, ed è la prima cosa da fare quando l'ampli si riaccende:
aprire l'editor con l'ampli attaccato, battere il tap, e sentire se il tempo cambia *e* se
il delay ci va dentro. Il banco non lo può dare: le mie prove sono contro un ampli finto,
e la scrittura vera è stata provata solo dalla sonda, non dall'app. In `tools/looper-probe.html`
c'è la sezione «5 — Il tempo», che fa la stessa cosa a mano se serve confrontare.

**Nota di metodo, e per come è finita la sessione vale più del resto:** l'utente ha smesso
di seguire («non ho capito un cazzo, fai quel che devi») dopo una serie di risposte piene
di byte, tabelle di esclusione e ipotesi. Il contenuto era giusto, la forma no: era un
diario dell'indagine invece che un risultato. **Con lui si dice cosa è successo e cosa
cambia per lui, e il resto va in `docs/`.** Le istruzioni passo passo hanno funzionato,
i ragionamenti lunghi in mezzo no.

**Il looper.** L'utente ha chiesto di riprendere il discorso, e la ripresa
è durata una prova sola: la scoperta sugli Hendrix del 26 agosto — **lo sblocco resta
nell'ampli dopo che l'app ufficiale si è scollegata** — rendeva verificabile l'unica
ipotesi che il 14 agosto era stata archiviata come non verificabile. Verificata, e caduta:
con l'ampli sbloccato (controllato subito dopo, mandando un preset `JH.*` e sentendo il
fuzz) `02` riceve l'ack e non fa niente, uguale a prima. **La chiave abilita i suoni a
pagamento, non i comandi.**

Poi l'utente ha obiettato la cosa giusta — «se l'app ufficiale lo fa partire un modo deve
esserci» — e aveva ragione: il posto dove guardare non era un'altra sonda sui byte ma
**come avevamo misurato**. `leggi-btsnoop.ps1` buttava via handle e opcode ATT di ogni
scrittura, quindi non sappiamo se l'app avesse scritto su `0xFFC1` né con quale opcode.
Sonda e script sono aggiornati; il grezzo del btsnoop non c'è più, quindi il passo 2 vuole
una cattura nuova. Dettaglio in `docs/looper.md`, «Il buco nel metodo».

**Le famiglie di suono adesso sono quattro**: è arrivata **Bass**, in viola `#bf5af2`
(`FAMIGLIE` in `preset-store.js`). L'utente se n'era dimenticato all'inizio, e un suono di
basso non è né clean né drive. Non c'era niente di cablato sul numero tre: tutta la UI —
schede, LED live, insegna al neon, ordinamento, pannello dei colori — cicla su `famiglie`,
quindi è bastata la riga in più più i commenti che dicevano «tre». **Il verde resta di
nessuna famiglia**, che nella vista live è il LED di chi famiglia non ne ha.

**E «Importa un file» adesso prende anche un preset solo** dell'app ufficiale, non più il
solo backup intero: la regola sta in «Importare un preset solo» in `CLAUDE.md`. **Va provato
con un file vero**, che è la cosa che qui non ho: le mie prove sono contro un preset
ufficiale ricostruito a mano da `captures/2026-08-10-libreria-8-preset.json`, incartato in
`{data:{tone:…}}` per vedere se lo trova lo stesso. Se il file dell'utente non entra, il
posto da guardare è `trovaPresetUfficiali` — e la cosa da chiedergli sono **i primi byte
del file**, non l'estensione. Backup 41 test.

**«Leggi il suono corrente» adesso si chiama «Importa preset attuale» e sta nel menu «⋯»**,
non più nel pannello «Altro»: là dentro era una voce di manutenzione fra le esportazioni e
Dropbox, mentre è la strada più corta per portarsi in libreria un suono dell'app ufficiale,
e si usa con l'ampli acceso davanti. **Ed è così che è saltata fuori la trappola del
pulsante spento** (vedi «Finestre e tendine» in `CLAUDE.md`): l'utente l'ha premuto da disconnesso e non è
successo niente, perché un `disabled` si mangia il clic. Guscio `v72`.

Quello che segue è del 27.

**Il 27 agosto è andato tutto nel sito**, non nell'app: comprato il dominio, configurato il
DNS, scritta e pubblicata la pagina. Vedi «Il sito di presentazione» in `CLAUDE.md`. L'app non è stata toccata.

**Il 27 l'utente ha riaperto il bollo «JH» nell'editor, ed è fatto** (vedi «Editor della
catena effetti»). Il problema era dove metterlo, perché nell'editor **non ci vanno
messaggi**: la risposta è che sui tasselli non serve niente — quei modelli si chiamano già
«J.H. Fuzz Zone» e il nome li identifica da solo — e quello che mancava era **cosa
comporta**, detto nei due momenti in cui conta.

**E poi, sempre il 27, la goliardata**: StompSnake, venuta fuori in un pomeriggio un giro
alla volta, tutti chiesti da lui. Pubblicato, guscio `v69`, verificato sull'indirizzo vero.
Com'è andata e cosa resta aperto: `docs/snake.md`.

**Il 27 si è anche chiusa l'alimentazione del pedale**, senza toccare l'app: la XIAO carica a
100 mA e non a 380, quindi modulo TP4056 con la sua presa, interruttore generale fisico, due
codini USB-C da pannello, partitore da saldare, indicatore di batteria da scrivere. Tutto in
`docs/pedale.md`; i pezzi sono ordinati.

Quello che segue è del 26 e vale ancora.

### 26 agosto 2026, sera

**La giornata era finita sul vestito, non sul protocollo.** In fila: i due tasti che spostano
il preset e lo slot aperto accesi al neon; la vista live con l'alone azzurro e il LED che
dice la famiglia (acoustic da verde a **giallo**, e il verde è passato a chi famiglia non ne
ha); via la striscia della famiglia dalle otto caselle dell'ampli; e infine **tutte le
finestre e le tendine del sistema sostituite con le nostre** — la sezione «Finestre e
tendine» qui sopra è la regola, questa è solo la data.

Tutto verificato **solo sull'app che gira in locale, con preset finti**: `index.html` non ha
suite. Le suite toccate quel giorno erano store (136) e backup (33), verdi.

**Come si prova in locale**: `file://` e `localhost` non hanno la libreria dell'utente —
altra origine, altro IndexedDB — quindi o si popolano dei preset finti da console
(`store.importFromAmp([...])` con `{uuid, name, effects, slot}` inventati), **oppure si
pusha**, perché lui guarda l'app pubblicata. Detto da lui il 26 agosto 2026, dopo che avevo
committato e basta. Da allora **i commit visibili si pushano senza chiederlo**.

**Gli effetti Hendrix: capitolo chiuso il 26 agosto 2026, e la risposta è «non si può».**
L'utente ha provato tutti gli effetti uno per uno: **nessuno pianta lo Spark**, ma i `JH.*`
restavano muti. La causa è la license key `0x0170` dell'app ufficiale, legata al suo
account — tutto il ragionamento sta nella trappola in «Protocollo», che è dove va cercato,
non qui. **Non è un difetto nostro e non c'è niente da correggere.**

Le due ipotesi che avevo scritto sono cadute tutte e due, e vale la pena saperlo: gli
identificativi erano giusti (lo dicevano già i preset usciti dall'ampli in
`captures/2026-08-10-libreria-8-preset.json`), e `0x0106` **era** accettato — la rilettura
confermava il nome mentre il blocco non suonava.

La convivenza è fatta: **il bollo «JH»** sulle schede della vista preset, chiesto
dall'utente, e il 27 anche nell'editor.

Poi, indipendente da tutto questo: **i nomi delle manopole dei quattro fuzz e del vibe
sono presi dalle foto dei pedali veri**, non da una cattura (`src/spark-effetti.js`). Se le
manopole fanno la cosa sbagliata è l'ordine degli indici, e si corregge in due righe.



---

*Da qui in poi c'era l'elenco delle cose da fare e i capitoli «discusso e non aperto»: non
sono storia, quindi restano in `CLAUDE.md`, «Dove si riprende», che è l'unico posto dove
vivono.*

## Dove si riprendeva — versione lunga del 2 settembre 2026

Archiviata da `CLAUDE.md` per alleggerirlo: lì resta la versione corta.

## Dove si riprende — 29 agosto 2026

Guscio `v73` (sta in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi:
protocol 139, transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto
da nessuna suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto.

**Il racconto delle sessioni sta in `docs/diario.md`** — cosa è successo il 26, 27 e 28
agosto e perché. Qui resta solo quello che è ancora da fare.

**Il 29 agosto non ha toccato l'app**: è andato tutto sul pedale. La scheda passa dalla C6
alla **XIAO ESP32-S3**, che l'utente ha ordinato, perché è l'unica che può fare la modalità
MIDI; la **scatola sarà di legno**; l'antenna è il **foglietto di serie, dentro**. Dettagli
nella sezione «Il pedale ESP32» e in `docs/pedale.md`.

Da fare:

1. **Il tap tempo con l'ampli acceso.** `0x0176` è verificato dalla sonda ma **non
   dall'app**: aprire l'editor, battere il tap, e sentire se il tempo cambia *e* se il delay
   ci va dentro. `tools/looper-probe.html`, sezione «5 — Il tempo», fa lo stesso a mano.
2. **Provare editor e vestito con l'ampli acceso, e sul telefono.** Girare un pomello e
   sentire se il suono segue, cambiare un modello, salvare e riscrivere. Se qualcosa non
   torna il primo sospetto sono i comandi, non il disegno. Sul telefono contano le tendine
   nostre e i LED delle famiglie sui pulsantoni live: le mie prove sono su schermo largo.
3. **Provare che l'ampli non si pianta più girando le manopole.** L'invio dei parametri è
   autocadenzato ma **la correzione non è verificata**. Se ricapita: prima `PAUSA_PARAMETRO`,
   poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale: le mie prove sono contro un
   preset ricostruito a mano. Se non entra, il posto da guardare è `trovaPresetUfficiali`, e
   la cosa da chiedere sono **i primi byte del file**, non l'estensione.
5. **Il pedale fa il pedale** (2 settembre 2026, sulla millefori definitiva e sulla S3 vera):
   **si preme il footswitch e l'ampli cambia preset, e il display dice quale.** Senza telefono
   in mezzo. Verificato per intero: piste a **3,296 V**, bus con **`0x20` e `0x3c`**, ingressi
   e uscite dell'espansore, BLE con l'intervallo corto concesso, footswitch letto dall'MCP e
   display che segue. XIAO ed espansore **su zoccoli**, quindi sfilabili.
   **Quello che resta è tutto in avanti, niente da rifare**: gli altri sei pulsanti e gli otto
   LED (stesso lavoro ripetuto), le due metà del banco col quinto footswitch, il banco che non
   si ricorda al riavvio (punto 7), il trasferimento di un banco dall'app da riprovare
   sull'S3, e **l'autonomia, che è l'ultima misura mancante**.
6. **La scheda stampata, in `pcb/`** (2 settembre 2026). Schema e **disposizione** ci sono —
   contorno, fori, piazzole con la rete assegnata, serigrafia — nati da
   `tools/genera-schema-kicad.py` e `tools/genera-pcb-kicad.py`, che **da qui in poi non si
   rigenerano**: si modifica in KiCad, o si perde quello che l'utente aggiusta a mano. Si
   controlla **senza aprire KiCad**: `kicad-cli` (10.0.6, in `C:\Program Files\KiCad\10.0\bin`)
   esporta in SVG — da lì un'immagine con Edge headless — **e fa girare il DRC**. Due cose,
   in quest'ordine:
   - **stringere il contorno**: 95 × 60 in un vano di 100 × 64 lascia due millimetri e mezzo
     per lato, che su una scatola fatta a mano è troppo poco, e c'è spazio vuoto in avanzo;
   - **misurare col calibro gli interassi dei moduli, prima di tirare le piste.** Nel file i
     quattro connettori del KAmod (J3, J4, J5, J6) stanno a distanze **inventate**: se il
     modulo si innesta sulla scheda, le piazzole devono cadere dove cadono i suoi pettini, e
     le misure in `docs/pedale.md` sono ancora dichiarate come stime («~45 × 35»). La XIAO
     invece è giusta per costruzione: **15,24 mm** fra le due file. **Le piste si tirano
     dopo**, o spostare un connettore vuol dire rifarle.
7. **Il pedale non ricorda quale banco stava suonando**: al riavvio carica il primo che
   trova. Va fatto insieme ai tasti banco veri, che sono la stessa funzione vista da due lati.
8. **Il looper sul pedale, col conteggio fatto in casa.** Il protocollo è tutto lì e
   verificato; manca il firmware. Il conteggio col click **non si comanda** (vedi
   «Protocollo»), quindi lo produce il pedale: legge il bpm, conta quattro tempi lampeggiando
   un LED — o con un buzzer — e **40 ms prima dell'uno** manda `0x0175` con `04`, che registra
   all'istante. Quei 40 ms sono il tempo di volo misurato. Il tempo si può anche **scrivere**
   (`0x0176`), quindi il pedale può avere il suo tap tempo. In Signal Detection Mode (click
   spento) il conteggio non serve: parte al primo suono di chitarra.
9. **Togliere dal catalogo altri modelli che l'ampli non ha.** `TrebleBooster` l'ha trovato
   l'utente; l'elenco viene da Soundshed e non è verificato. La tendina mette per primi i
   modelli visti sull'ampli, quindi il prossimo si trova più in fretta.
10. **Mettere al sicuro il `preset_backup.zip` che sta su Dropbox adesso**, e importarlo:
   Positive Grid dismette quel backup nel 2027. È l'unica strada che prende tutta la
   libreria dell'app ufficiale in un colpo solo; dopo restano solo l'ampli e i preset
   singoli. Non è urgente in giornata, ma è l'unica cosa che scade.

**Discusso e non aperto: il pedale in modalità MIDI** (29 agosto 2026), per comandare
AmpliTube sul PC con lo stesso pedale. Hardware invariato, cambia solo cosa parte alla
pressione; si commuta col **primo e l'ultimo footswitch insieme**. Tre cose misurate quel
giorno, da non ripercorrere: **Windows non sa fare BLE-MIDI** (nemmeno col nuovo Windows MIDI
Services, dov'è in backlog) e vuole per forza un programma ponte di terzi — ma la scheda
funziona, Windows ci si collega e le legge dentro il servizio MIDI; **la C6 non può fare
USB-MIDI** e **l'S3 sì**, ed è per questo che si cambia scheda; lo strumento della prova è
**`pedale/prova-midi/`**. Due trappole d'ambiente valide sempre: **PowerShell 5.1 non può
sottoscrivere eventi WinRT** (le `…Async` invece si aspettano con `AsTask`) e
**`Pairing.CanPair` da `FindAllAsync` è `False` per tutti**, quindi non dice niente. Il resto
in `docs/pedale.md`, «Modalità MIDI».

**Discusso e non aperto: creare un preset con l'AI** («voglio il suono dell'assolo di Gilmour
in Mother»). L'utente ha chiesto solo di ragionarci. Il punto: il vocabolario dei modelli non
lo può scegliere l'AI — un nome che l'ampli non ha è il comando che lo pianta — quindi glielo
si dà ristretto a `modelliVisti()`, lo scheletro si prende da un preset uscito dall'ampli, e
il risultato si prova **solo sul buffer `0x7f`**, mai in uno slot. Serve una API key
dell'utente, e sarebbe la prima funzione dell'app che non funziona offline. L'AI non sente:
dà un punto di partenza, non un suono finito.

**Non aperto, e va bene così:** il trasferimento di un banco al pedale che costa ~6 s —
funziona, si può accorciare, ma è ottimizzazione.
