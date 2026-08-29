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
