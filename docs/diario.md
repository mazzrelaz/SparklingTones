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

## Estratti da CLAUDE.md, 17 settembre 2026 — versione lunga

Quello che segue stava in `CLAUDE.md` fino al 17 settembre 2026 ed è stato accorciato lì. È copiato parola per parola: vale come stato di quel giorno, non come verità di oggi.

# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32
in `pedale/`.

L'app è pubblicata e funziona; il pedale funziona su una devkit e aspetta i componenti
comprati. `README.md` racconta il progetto a chi arriva da fuori. **Dove si riprende** è
in fondo a questo file.

## Dove sta il resto di questa memoria

`CLAUDE.md` entra intero in contesto a **ogni** sessione, quindi qui resta solo quello che
serve sempre: le trappole che mi fanno rompere qualcosa, le regole che governano il
progetto, e il lavoro in corso. Il ragionamento dietro le scelte già fatte sta in `docs/`
e **va letto solo quando si rimette in discussione quella cosa lì**:

| file | quando aprirlo |
|---|---|
| `docs/pedale.md` | si lavora sul pedale: forma e misure, ferramenta, scatola, BLE, ponte, simulatore, modo MIDI |
| `docs/protocollo-spark2.md` | si tocca il protocollo, l'encoder, la scrittura dei preset |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake: disegno, wah, accordo, neon, manopole |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata, e perché una cosa è come è |
| `docs/sito.md` | si tocca `sparklingtones.com`: DNS, `www`, privacy, video |

Snellito cinque volte: il 14 agosto 2026 (era 27.700 token), il 26 agosto (~27.000), il 27
agosto (~17.700 in un giorno solo), il 29 agosto (da ~23.300), e il **2 settembre, da 73.137
byte a 42.154** — cioè da ~25.000 token a ~14.000, **11.000 risparmiati a ogni singola
sessione**. Quella volta hanno lasciato la memoria di lavoro: il racconto delle regole
dell'app e la decisione sull'inglese (`docs/decisioni-ui.md`), le trappole dell'ESP32 e la
sezione lunga del pedale (`docs/pedale.md`), gli Hendrix e il looper
(`docs/protocollo-spark2.md`), il sito (`docs/sito.md`), i punti di ripresa vecchi
(`docs/diario.md`). **Ogni volta non si butta via niente: si sposta in `docs/`.** La regola
che decide è sempre la stessa: qui resta ciò che mi impedisce di fare danni, il resto è un
rimando. **Si rigonfia in due settimane, quindi si rimisura spesso**, con
`wc -c CLAUDE.md`.

## Le regole che governano l'app

**La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, famiglia e ordine. È il
comportamento più importante di `preset-store.js` ed è coperto da test.

**Preset e Live stanno nello stesso file, e non si separano.** La connessione BLE vive nel
documento: finché erano due pagine, passare da libreria a live era una navigazione e
all'ampli toccava riconnettersi a mano. Nessuna API lo evita. Le due viste sono in
`index.html` e si scambiano cambiando una classe sul `body`, quindi `spark` resta lo stesso
oggetto. **Verificato sull'hardware.** Il passaggio è sull'hash (`#live` / `#preset`) e non
su una variabile: così il tasto indietro di Android torna ai preset invece di chiudere
l'app.

**Attenzione toccando il CSS: le due sezioni condividono un solo `<style>`.** Le regole dei
preset vanno sotto `body:not(.vista-live)` e quelle live sotto `body.vista-live`, comprese
le variabili di colore — la vista live è più scura — e la media query del telefono.

### Sezione Preset

Il perché di ognuna di queste è in `docs/decisioni-ui.md`.

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, etichettati A1…B4 coi
colori dei LED (rosso banco A, verde B); tutti gli altri stanno sotto, e **un preset non
compare mai in tutti e due i posti**. Niente striscia della famiglia sulle otto caselle.
**Sovrascrivere uno slot non perde il preset che c'era**: `assignSlots` → `_sistemaSlot` gli
toglie lo slot e quello ricompare da solo nella lista sotto, con tag, note e famiglia. Il
record non si cancella mai, cambia solo `slots`.

**`slots` è una lista, non un numero** — lo stesso preset può stare in più slot, e capita.
`normalizzaSlots` tiene una sola verità e cancella il vecchio `slot`. `_sistemaSlot(visti)`
**tocca solo gli slot osservati**: `readLibrary` salta quelli che non rispondono, e cancellare
uno slot mai visto farebbe sparire un preset per un timeout. Nella UI la chiave del dettaglio
è `id:slot`, non `id`. `store.hardware()` dà sempre otto posti, `null` dove non sappiamo, e il
confronto va fatto **per id**, non per oggetto: rilegge dal database e torna copie diverse.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, dopo
`identify`), e durante la lettura i pulsantoni live restano spenti: l'ampli sta rispondendo a
otto richieste in fila.

**«Elimina tutti i preset» risparmia gli otto dell'ampli** — la prima lettura li rimetterebbe
comunque, ma spogliati di tag e note, e *quello* sarebbe lavoro perso. `svuotaTranneAmpli`
passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da Dropbox» rimetterebbe
dentro tutto.

**Un preset nuovo si fa in tre modi, e nessuno parte dal nulla**: «Duplica» (`store.duplicate`,
che cambia **UUID**, slot e nome), «Importa preset attuale», «Importa un file». **Dal nulla non
si fa, ed è deliberato**: un modello inesistente è quello che ha già piantato l'ampli una volta
(`TrebleBooster`). Se servisse, lo scheletro va preso da un preset **uscito dall'ampli**.

**«Importa un file» distingue le tre cose dal contenuto, non dall'estensione** — `PK` per lo
zip, il campo `presets` per il nostro backup, un oggetto con `sigpath` per un preset singolo
dell'app ufficiale (`SparkBackup.trovaPresetUfficiali`). Per questo l'`<input type=file>`
**non ha `accept`**. Senza `meta.id` **l'UUID glielo diamo noi**, e reimportando lo stesso file
si fa un doppione invece di aggiornare.

**Il bollo «JH» marca i preset con un effetto Hendrix in catena**, perché quei preset **non
suonano come dicono** finché l'app ufficiale non ha sbloccato il pacchetto (vedi «Protocollo»).
**Si dice in quattro posti, e quattro devono restare**: le schede della vista preset, la
tendina dei modelli, il blocco a fuoco dell'editor, e **una riga di log in `mandaPreset`**,
prima dell'invio. È **un avviso al buio** — all'ampli non si può chiedere se sia sbloccato —
ed è la ragione per cui i posti sono quattro e non dieci. Restano scoperti la vista live
(decisione dell'utente) e il pedale.

### Sezione Live

Si suona, non si cataloga. **Un preset che sta già in uno slot dell'ampli si attiva
istantaneamente con `0x0138`; uno che non c'è va trasmesso per intero e ci mette circa un
secondo.**

**Banchi da otto, quattro a sinistra e quattro a destra**, come i due banchi di LED
dell'ampli (`grid-auto-flow: column` con quattro righe: senza, i posti 1–4 finirebbero a
zigzag). Ogni pulsantone ha un LED verde, anche i posti vuoti.

- Il banco **«Ampli» non è salvato da nessuna parte**: si ricava dal campo `slots` dei
  record, così non può divergere da quello che c'è davvero sull'ampli.
- I banchi inventati dall'utente stanno in `settings.banchi`. **Non scrivono mai
  sull'ampli**: scelta esplicita dell'utente, i loro preset si caricano al momento (~1 s).
  Per questo non c'è nessun «Prepara» — se lo scrivesse, sovrascriverebbe il banco fisso.

### Editor della catena effetti

Com'è fatto e perché — la catena al neon, i pomelli, la piramide, la tendina — sta in
`docs/decisioni-ui.md`, insieme al racconto di ognuna di queste regole. Qui le regole nude.

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che governa
tutto il resto. Per questo «Regola», **quando l'ampli c'è**, prima manda il preset con
`loadPreset` e poi apre il pannello, e lo stato di partenza si rilegge **dall'ampli**
(`readLiveState`), non dalla libreria. **Se la rilettura fallisce l'editor non si apre.**
Niente è salvato finché non si preme «Salva in libreria».

**Senza ampli l'editor si apre lo stesso, sulla copia in libreria**, e `inModifica.offline`
governa tre differenze: **niente parte sulla radio** (`mandaParametro` non accoda nemmeno, o un
arretrato partirebbe tutto insieme a una connessione a metà); **il modello si cambia lo
stesso, qualunque**, perché il catalogo è verificato e sappiamo com'è fatto il blocco per tutti
e settantotto; **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si
connette dopo — rileggere a metà lavoro sostituirebbe di soppiatto un suono con un altro.

Nel cambio di modello, **prima si copia e poi si costruisce**: `campioneModello(nome)` prende
numero di parametri *e* valori da un blocco che l'ampli ha davvero prodotto; solo se non c'è si
costruisce dalla tabella, a metà corsa. Il blocco resta acceso o spento com'era.

**Il tempo sta qui, e solo qui** — non nella vista live: **il bpm è un campo del preset**
(`preset.bpm`, dentro `0x0101`), quindi si sceglie mentre si costruisce il suono. Col tap, o di
un bpm coi tasti; con l'ampli parte subito `0x0176` **e gli effetti a tempo seguono da soli**;
senza ampli non parte niente. Il riscontro del tap è **il lampeggio del tasto**, non un
messaggio.

**L'invio dei parametri è autocadenzato, non a timer**: il prossimo parte quando il precedente
è finito, più `PAUSA_PARAMETRO` (90 ms), così la coda non cresce qualunque cosa faccia il dito.
`writeWithoutResponse` non ha controllo di flusso, e questa è **la causa più probabile
dell'ampli che si pianta girando le manopole** — ma **la correzione non è verificata**. Se
ricapita: prima `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.

**L'editor sa se c'è del lavoro non salvato**, e non lo lascia buttare via: `inModifica.toccato`
nasce in `segnaModificato()`, e «Fatto» e il logo chiedono con `chiediPrimaDiUscire()` —
**tre vie, non due**, perché con due un dito che sbaglia bottone perde il lavoro. **Se il
salvataggio fallisce non si chiude niente** (`salvaModifiche()` torna `true`/`false`). **Il
segno che ha salvato lo dà il tasto**, non un messaggio: in questo pannello non ne deve
comparire nessuno. Non si disabilita mai quando niente è toccato.

Per lo stesso motivo la nota sugli Hendrix **è uno stato e non un messaggio**: una
`.elenco-nota` sotto l'intestazione «Jimi Hendrix Pack» della tendina — una sola — e una
`.nota-jh` sotto il nome del modello nel blocco a fuoco. Sui tasselli non si dice niente: si
chiamano già «J.H. Fuzz Zone».

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, dove scrivono `logLine` e
`logProgress`: un pannello a tutto schermo copre il log. **`pulisciStatoPannelli()` le nasconde
tutte**, e chi ci scrive deve rimostrarla (`riga.hidden = false`, che è quello che fa
`statoDelPannello`) — senza, il log si scrive sempre e non si vede mai.

### Finestre e tendine: nell'app non c'è più niente del sistema

**Mai più `confirm()`, `alert()`, `prompt()` o `<select>`**: aprono la roba del sistema
operativo in un'app tutta nera, e soprattutto **un `confirm()` ha due vie sole**. Al loro
posto, tutte costruite sulla stessa scatola `.elenco-scelta`:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | il valore sta in `.valore` (non `.value`), `aggiorna(v)` lo cambia da fuori |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | il testo, o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | il `valore` dell'azione, `null` se si esce |

Tutte **asincrone**, quindi il gestore va `async`. `testo` è **HTML**, e un nome che viene dai
dati ci entra solo passando da **`testoConNome()`**, che lo scappa. Esc e il tocco fuori tornano
sempre `null`, che è la via che non fa niente.

**Nella tendina «⋯» nessuna voce si spegne**, ed è misurato: **un pulsante `disabled` non
riceve il clic**, quindi non scatta nemmeno il gestore che chiude la tendina — e si vede
un'app rotta. Senza ampli le voci **rispondono** con `senzaAmpli(cosa)`, una riga di log che
dice cosa manca. Vale per qualunque voce si aggiunga lì dentro.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), quindi restano **proposte**: si vedono *in
corsivo*, un nome scritto a mano vince sempre, e `manopola()` **scarta l'intera riga** se
dichiara più manopole di quante l'ampli ne manda. **Il credito a Soundshed non si toglie**, e
la domanda è già stata fatta e chiusa (31 agosto 2026, il perché in `docs/decisioni-ui.md`).

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto**: si legge Gain,
Bass, Middle, Treble, Master, ma negli indici sta `Gain(0), Treble(1), Middle(2), Bass(3),
Master(4)`. Trascrivendo dall'interfaccia si sbagliava in silenzio; due test fissano il caso.
Il campo `quante` dice **quante manopole ha davvero l'effetto**: i parametri in eccesso sono
**l'acceso/spento del blocco**, misurato.

**I nomi dei parametri li dà l'utente**, girando e ascoltando — l'ampli manda solo indici.
Stanno **per modello** (`settings.nomiParametri`), e `importBackup` li **aggiunge** invece di
sovrascrivere: un backup vecchio non deve cancellare i battesimi fatti da allora.

**`MODELLI` è verificato tutto contro l'app ufficiale** (26 agosto 2026, dalle foto
dell'utente): noise gate 1, comp/wah 6, drive 14, ampli 39, modulazione 13, delay 6, riverbero
1 con 9 tipi. Dodici nomi del catalogo Soundshed sono stati tolti perché l'ampli non li ha.
**Se si aggiunge un nome nuovo va verificato allo stesso modo**, perché all'ampli non si può
chiedere quali modelli conosce: l'unica prova è l'elenco ufficiale o un preset uscito
dall'ampli. E **una voce nuova nell'elenco ufficiale non è per forza un modello nuovo**:
l'«Auto Wah» del 2026 è lo stesso `JH.Vox846` con altri valori, quindi in `MODELLI` non è
entrato niente.

**Gli effetti Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»**
(`SparkEffetti.GRUPPO_HENDRIX`): sono l'unico contenuto a pagamento e l'unico che può entrare
in catena e restare muto.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché. **E i commit visibili si pushano senza chiederlo**: lui guarda l'app
  pubblicata, non quella che gira qui.
- **All'utente si dice cosa è successo e cosa cambia per lui**, non il racconto dei passi e
  dei byte: quello va in `docs/`. Le istruzioni passo passo funzionano, i ragionamenti
  lunghi in mezzo no.
- **Per provare in locale servono preset finti**: `file://` e `localhost` non hanno la
  libreria dell'utente (altra origine, altro IndexedDB). Si popolano da console con
  `store.importFromAmp([...])` e `{uuid, name, effects, slot}` inventati.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate. **Ma pesa a ogni sessione**: quello che serve solo se si riapre un capitolo va
  in `docs/`, con un rimando qui. La regola per cosa resta: **tutto ciò che mi impedisce di
  fare danni o di ripercorrere una strada chiusa**. Il racconto di *come* ci si è arrivati
  va in `docs/`, sempre.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI. **L'inglese ci sarà, ma non adesso**: sono ~270 stringhe,
  93 delle quali messaggi di log, cioè prosa che si riscrive ogni volta che il comportamento
  cambia. Il momento è **quando Preset, Live ed editor smettono di cambiare forma**, e il piano
  (`src/lingua.js`, `data-t`, nessuna libreria) è in `docs/decisioni-ui.md`.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.
Guscio `v73` (in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi: protocol 139,
transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto da nessuna
suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto. Il racconto
delle sessioni sta in `docs/diario.md`.

Sull'app:

1. **Il tap tempo con l'ampli acceso**: `0x0176` è verificato dalla sonda, **non dall'app**.
   Aprire l'editor, battere, e sentire se il delay ci va dentro.
2. **Editor e vestito con l'ampli acceso, e sul telefono**: girare un pomello, cambiare un
   modello, salvare e riscrivere. Le mie prove sono su schermo largo e su un ampli finto.
3. **Che l'ampli non si pianti più girando le manopole**: la correzione **non è verificata**.
   Se ricapita, la manopola è `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale. Se non entra si guarda
   `trovaPresetUfficiali`, e la cosa da chiedere sono **i primi byte del file**, non
   l'estensione.
5. **Togliere dal catalogo altri modelli che l'ampli non ha**, come fu `TrebleBooster`.
6. **Mettere al sicuro il `preset_backup.zip` che sta su Dropbox**, e importarlo: Positive Grid
   lo dismette nel 2027, ed è **l'unica cosa che scade**.

