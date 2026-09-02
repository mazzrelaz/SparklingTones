# Le scelte dell'interfaccia, e perché

Spostato qui da `CLAUDE.md` il 14 agosto 2026: sono decisioni **già implementate e
stabili**. In `CLAUDE.md` restano le regole che, se le dimentico, mi fanno rompere
qualcosa. Qui c'è il ragionamento, che serve solo se una di queste scelte va rimessa in
discussione.

## Sezione Preset

### Il pannello dell'ampli, e le schede

Rifatta il 13 agosto 2026, scegliendo fra tre proposte messe a confronto in
`design/proposte-preset.html` (pagina a parte, non è l'app). Quello che non andava:
**gli otto slot erano disegnati come righe di libreria qualsiasi**, mentre sono un'altra
cosa — sono il pannello dell'ampli, sono otto e sempre otto, e hanno i colori dei LED che
si guardano mentre si suona. E la riga riassumeva la catena con gli identificativi
(`bias.noisegate · LA2AComp · …`), che a colpo d'occhio non dicono niente.

Adesso: gli slot sono **due banchi da quattro** affiancati come sull'ampli, ognuno con il
LED del suo banco, il nome e — al posto della catena intera — **l'ampli e il drive**, che
sono quello che si cerca. Il dettaglio di uno slot si apre **a tutta larghezza sotto la
griglia**: dentro una cella sfonderebbe la colonna.

> **Il 26 agosto 2026 l'utente ha tolto anche l'ampli e il drive**: nella casella restano
> la posizione e il nome. Sono otto caselle che si guardano tutte insieme, e otto righe di
> effetti facevano rumore senza dire niente a chi il preset lo conosce già; la catena resta
> nel dettaglio. Nella stessa passata il titolo è diventato **«Preset hardware»** (era
> «Sull'ampli — gli otto slot, istantanei») e la casella ha **altezza fissa**: le due
> colonne sono due griglie separate, quindi un nome su due righe alzava la sua casella e
> basta, e le otto non erano più in pari. Il nome si tronca a due righe e per intero sta
> nel titolo.

**La riga di libreria è solo il nome**, dal 14 agosto 2026 e su richiesta. Prima portava
anche la catena a pastiglie e le categorie, che insieme raddoppiavano l'altezza di ogni
riga: nella libreria però si **scorre per cercare un suono che si conosce già**, e per
riconoscerlo basta il nome. Restano solo le tre cose che si leggono senza leggere — la
**barra del colore della famiglia** a sinistra, il **nome** (un filo più grande) e il
**▶** a destra. Catena e categorie stanno nel dettaglio, dove si va quando quel preset lo
si vuole davvero guardare.

Le regole compatte sono **agganciate a `#listaLibreria`** e non a `.row`/`.head`, che
sono condivise col dettaglio e col resto: cambiarle globalmente rimpicciolirebbe cose che
devono restare grandi.

**L'altezza giusta è ~46 px, non la metà secca.** Al primo colpo era scesa a 36 e l'utente
l'ha rivista: troppo stretta, e il ▶ rimpicciolito a 26 non si prendeva col pollice.
Rialzata del 30% — imbottitura da 5 a 9, tondo di nuovo a 28. Lo spazio guadagnato
togliendo catena e categorie va speso lì, non incassato tutto.

**Le azioni del dettaglio sono una riga per azione**, non un `flex-wrap` unico. Prima
andavano a capo dove capitava e la tendina finiva staccata dal tasto a cui appartiene: si
leggeva «Attiva, Regola, tendina» e poi «Invia a preset HW» da solo, che non vuol dire
niente. Adesso: provare e regolare insieme, poi lo slot dell'ampli, poi il banco live, e
**Elimina da sola** perché è l'unica che non si torna indietro. In ogni riga **il tasto
sta prima della sua tendina**: si legge cosa si sta per fare e poi dove.

> **Rifatte il 26 agosto 2026**, chiesto dall'utente («la scheda è troppo incasinata»).
> Cinque righe erano troppe. Adesso sono tre, e ognuna ha una forma sua:
> **Attiva · Regola · Duplica · Elimina** su una riga sola a quattro colonne uguali —
> `Elimina` non è più isolata, ma resta ultima e la conferma è lì per quello — e sotto le
> due che vogliono un «dove», **con la stessa identica griglia** (`170px` + tendina), così
> i pulsanti sono larghi uguali e le tendine partono dalla stessa riga verticale. Le tre
> righe hanno anche la **stessa larghezza totale**: senza, su uno schermo largo i quattro
> pulsanti si stiravano mentre le righe sotto restavano corte, ed era il blocco a sembrare
> storto. «Seleziona A1» sta in una riga sua sopra: non è un'azione sul preset ma
> sull'ampli, e compare solo aprendo uno degli otto posti hardware.

`pastiglieCatena` **non si tocca**: serve ancora al dettaglio degli slot dell'ampli, dove
la catena continua ad avere senso.

**La libreria si ordina**, ed è una preferenza salvata (`ordineLibreria`): per nome, per
quando è stato aggiunto, per quando è stato modificato, o per famiglia di suono. A parità
si ricade **sempre sul nome**, altrimenti due preset che il criterio non distingue si
rimescolano sotto le dita a ogni ridisegno. Chi non ha famiglia va **in fondo**: è
l'assenza di una scelta, non una categoria che meriti il primo posto.

**Il tasto che porta all'altra vista non si può ingrandire**, provato e rimesso com'era
lo stesso giorno: più grosso non sta sulla riga con «Leggi dall'ampli», «Categorie» e
«Altro», e manda a capo l'intestazione. Se un giorno lo si vuole davvero più visibile,
prima bisogna liberare spazio su quella riga — non basta cambiare il padding.

> **Rovesciato il 26 agosto 2026**, e nel modo che quella nota indicava: lo spazio è stato
> liberato per davvero — «Connetti» è confluito nello stato e le tre voci sono finite in un
> menu — e solo allora il tasto è stato ingrandito. Vedi «La barra in alto» in fondo.

**Dal dettaglio si mette un preset in un banco live**, senza passare dalla vista Live.
Chiesto dall'utente: si sta già guardando il preset, e doverlo ricordare, cambiare vista e
ritrovarlo lì dentro è un giro inutile. Una tendina coi banchi — con accanto quanti posti
liberi ha ciascuno — e il tasto «Metti nel banco».

Va nel **primo posto libero**, non in uno scelto: quale dei quattro tasti sia è una cosa
che si decide col piede davanti al banco, e nella vista Live si sposta. Se il preset è già
in quel banco lo dice e non lo duplica; se il banco è pieno lo dice e non fa niente.
Se non esiste nessun banco il controllo non compare: si creano dalla vista Live.

Nel dettaglio la catena è **una riga sola di nomi separati da «-», senza valori**: lì si
guarda *che catena è*, e una colonna di numeri a due decimali non la legge nessuno.

I nomi dei pulsanti li ha decisi l'utente: **«Attiva»** manda il preset all'ampli senza
toccare nessuno slot (era «Prova adesso»), **«Invia a preset HW»** lo scrive in uno slot
(era «Scrivi»). Quello che seleziona uno slot già scritto si chiama «Seleziona A1»,
perché «Attiva A1» accanto ad «Attiva» erano due cose diverse con lo stesso nome.

**I preferiti non ci sono più**, tolti su richiesta: via la stella dalle schede e il
filtro dall'intestazione. Il campo `favorite` resta nei record e nello store —
cancellarlo butterebbe via scelte già fatte — ma non si vede e non filtra niente.

**Fondo nero e rosso al posto dell'arancione**, scelta dell'utente. I riquadri non sono
neri a loro volta (`--panel:#121316`): su nero pieno una scheda si vede solo se è un filo
più chiara, altrimenti reggono tutto i bordi e la pagina diventa un reticolo.

### Il marchio e le icone

Il logo è dell'utente: `icons/logo.svg`, un **logotipo orizzontale** («SparklingTones»,
rapporto circa 5,7:1). Si fissa **l'altezza** e la larghezza viene da sé: in un quadrato
si schiaccerebbe.

**I nomi delle pagine non ci sono più da nessuna parte**, su richiesta: né in intestazione
né in cima ai pannelli. Restano solo i titoli che dicono *su cosa* si sta lavorando — il
nome del preset nell'editor, la posizione della catena nella scelta del modello, il posto
del banco — che non sono nomi di pagina ma il contenuto stesso. Il logo ha
`margin-right:auto` e spinge i pulsanti dalla parte opposta, che è il lavoro che prima
faceva il titolo con `flex:1`.

L'app si chiama **SparklingTones** ovunque si veda: `<title>`, manifest (`name` e
`short_name`), titolo iOS. Prima era «Spark 2 Controller», che era il nome del progetto,
non del prodotto.

**Il marchio sta in ogni schermata**, anche nei pannelli a tutto schermo. Non è ripetuto
nel markup: `marchioNeiPannelli()` copia quello dell'intestazione in ogni
`.pannello > .barra-alta` all'avvio, così i pannelli che si aggiungeranno ce l'hanno
senza doverselo ricordare. Non aspetta il database — i pannelli sono già nel documento —
e se il file del logo manca non copia niente, perché l'originale si è già tolto da solo
invece di lasciare un'icona rotta in cima a ogni pannello.

**L'accento dell'app è il rosso del logo** (`#e30613`) e non un rosso scelto a parte: sulla
stessa barra il marchio e il pulsante «Connetti» si toccano, e due rossi diversi si vedono.

`icons/logo-mark.svg` è il **simbolo da solo** — l'onda e le scintille, senza la scritta —
ricavato dal file dell'utente prendendone i tracciati, non ridisegnato. Serve per le
icone, che sono quadrate: un logotipo lungo cinque volte la sua altezza, dentro un
quadrato, è illeggibile. Non sta nel guscio del service worker: non lo carica nessuno.

`tools/make-icons.ps1` **rasterizza quell'SVG con Edge headless** invece di ridisegnare a
mano con System.Drawing, così l'icona è lo stesso file del marchio. Due trappole trovate
lì, che valgono ogni volta che si fa uno screenshot headless:

- **headless non scende sotto una finestra di circa 500×500.** Chiedere uno screenshot da
  192 px non ridimensiona: ritaglia l'angolo in alto a sinistra, che essendo vuoto esce
  **tutto nero** e sembra un errore di disegno. Si rasterizza a 1024 e si riduce con
  System.Drawing.
- l'icona **maskable** viene ritagliata dentro un cerchio dal sistema, quindi ha un
  margine suo (16% invece di 6%).

### Famiglia di suono, e categorie

**Le categorie sono lo stile** (Pink Floyd, jazz, il pezzo) e un preset ne può avere quante
ne vuole; **la famiglia dice che tipo di suono è** — Clean, Drive, Acoustic, Bass — è una
sola, e serve a riconoscerlo dal colore senza leggere niente.

**Bass è arrivata il 28 agosto 2026**, chiesta dall'utente: era dimenticata dall'inizio, e
un suono di basso non è né clean né drive — è un altro strumento. Il suo colore di partenza
è il **viola** `#bf5af2`, che è l'unico distinguibile a colpo d'occhio dagli altri tre e
non è il verde, riservato a chi famiglia non ne ha.

Quattro e non di più, perché più colori di così non si distinguono con un'occhiata. Si
assegnano **a mano** dal dettaglio del preset: nessuno prova a indovinarle dal modello di
ampli. **Chi non ne ha resta senza colore**, ed è deliberato — un colore inventato qui si
legge senza pensarci, quindi è peggio di nessun colore.

I colori di partenza (`FAMIGLIE` in `preset-store.js`) si cambiano con
`setColoreFamiglia`, e finiscono in `exportAll` come i nomi dei parametri.
`importFromAmp` non tocca la famiglia — è nel record, non nella parte sonora — e un test
lo verifica.

Le categorie sono le stesse etichette del campo `tags`, con accanto un elenco governato
dall'utente in `settings.categorie`. L'elenco mostrato è **l'unione** fra quello salvato
e quelle davvero in uso: si può creare una categoria prima di avere qualcosa da metterci,
e una che arriva da un import compare lo stesso senza doverla registrare a parte.

`renameCategory` e `removeCategory` agiscono anche su tutti i preset che la portano;
`clearCategories` azzera tutto. I preset non si toccano mai: perdono l'etichetta, non
esistono di meno.

**Le categorie del backup dell'app ufficiale non entrano più in libreria.** `parseBackup`
continua a riportarle perché stanno nel file, ma `importFromBackup` le scarta: arrivavano
decine di nomi mai scelti da nessuno. Chi le rivuole passa `{categorieDalBackup: true}`.

## Sezione Live

**Banchi da otto, quattro a sinistra e quattro a destra**, come i due banchi di LED
dell'ampli. La griglia è `grid-auto-flow: column` con quattro righe: senza, il riempimento
sarebbe per riga e i posti 1–4 finirebbero a zigzag invece che tutti a sinistra.

**Ogni pulsantone ha un LED verde**, idea dell'utente: spento è un vetrino scuro incassato,
acceso è il preset che sta suonando. Ce n'è uno **anche sui posti vuoti** — su una
pedaliera i led ci sono sempre, ed è quello che fa sembrare la fila una fila di tasti
invece di otto riquadri. Si accende dalla classe `.attivo` che il pulsante ha già: nessuno
stato nuovo da tenere allineato.

**I preset di un banco si riordinano dal banco stesso.** In modifica ogni pulsante
occupato ha una **presa `⇅`** in basso a sinistra: un tocco lì prende il preset, un tocco
su un altro posto li **scambia**. Scambio e non inserimento — con otto posti fissi
«sposta in mezzo» vorrebbe dire far scalare tutti gli altri, e da una pedaliera nessuno se
lo aspetta. La presa sta in un angolo suo e non ruba il tocco al resto del pulsante.

**Sui pulsantoni non c'è più «● istantaneo» / «● da caricare»**, tolti su richiesta il
14 agosto 2026. La differenza di velocità resta vera, ma si sente suonando, e scritta su
ognuno degli otto pulsanti era solo rumore. Nel banco fisso la riga sotto il nome resta
vuota del tutto; nei banchi inventati porta lo slot dell'ampli, che è un fatto e non una
previsione.

`getBanks` sostituisce con `null` gli id di preset cancellati, come faceva `getSetlist`:
meglio un posto vuoto che un pulsante morto. La scaletta di prima viene convertita in un
banco «Scaletta» alla prima apertura (`_migraScalettaInBanco`), una volta sola.

## L'editor della catena effetti

Rifatto il 13 agosto 2026 su richiesta («così fanno schifo»), e le scelte sono queste:

**Il modello si cambia dalla tendina che è il nome stesso del blocco.** Prima c'era un
pulsante «cambia» accanto, che apriva un pannello a parte con la ricerca: nessuno
collegava quel pannello al nome che stava leggendo, e per cambiare un ampli si usciva da
dove si stava lavorando. Il pannello dei modelli è stato tolto — la tendina nativa si
sfoglia col pollice e sul telefono si apre a tutto schermo. L'ultima voce è «altro
modello, a mano…», perché l'elenco non è per forza completo.

**L'identificativo interno non si vede più** (`Twin`, `LA2AComp`): serve nei comandi, non
a chi sta regolando un suono, e stava sotto ogni nome a fare rumore. Resta nel
suggerimento di ogni voce della tendina.

**Il nome del preset è grande e su una riga sua**, non più accanto al marchio dove non si
leggeva. In un pannello che cambia il suono sotto le dita, sapere *quale* suono si sta
cambiando viene prima di tutto.

**Ogni parametro si prende due righe**: nome a sinistra e valore a destra, il cursore
sotto a tutta larghezza. Prima stavano tutti e tre in fila e al cursore restava una
fessura — su un telefono si prendeva col pollice a fatica. Il cursore è disegnato da capo
e **la guida si riempie fino al valore** (`--p` sull'elemento, gradiente nel CSS): senza,
un cursore a metà e uno a zero si distinguono solo cercando la pallina. Su schermo largo
i parametri vanno a due colonne, altrimenti cinque manopole in colonna fanno scorrere la
pagina a ogni blocco e la catena non si vede mai intera.

**La spiegazione lunga sui nomi in corsivo sta chiusa** dietro un «perché certi nomi sono
in corsivo»: serve una volta sola, e tutti i giorni è un muro di testo fra te e le
manopole.

I parametri che manopole non sono (vedi `protocollo-spark2.md`) **non spariscono**:
finiscono in un `<details>` chiuso in fondo al blocco, «1 parametro che non è una
manopola». Nasconderli sarebbe una bugia al rovescio. Quello che è l'interruttore del
blocco però **non è più un cursore**: si vede, dice «acceso» o «spento», e si cambia
dall'interruttore in cima al blocco — un cursore lì spegneva il blocco alle spalle
dell'interruttore, che continuava a dire «acceso», e la UI mentiva.

## Importazione dall'app ufficiale — il dettaglio

L'app Spark salva `preset_backup.zip` — su Dropbox fino al 2027, vedi
`docs/dropbox.md`, «Il backup dell'app ufficiale»:

```
preset_backup/Presets/<Categoria>/category.json
preset_backup/Presets/<Categoria>/<UUID>/preset.json
preset_backup/Presets/<Categoria>/<UUID>/icon.png
```

Le icone si ignorano: mezzo mega l'una e tutte uguali.

Il formato di `preset.json` mappa quasi uno a uno sul nostro: `meta` per i metadati,
`sigpath` per la catena, `dspId` per il nome dell'effetto, `active` per l'interruttore.
Tre differenze che contano, tutte trovate sul backup reale da 105 preset:

- **alcuni parametri sono booleani** invece che numeri (21 casi): vanno convertiti in
  0 e 1, altrimenti l'encoder produce NaN
- **nomi e descrizioni superano i 31 caratteri** (21 preset su 105): oltre quella
  lunghezza serve la long string `0xd9`, perché `0xa0+len` sconfinerebbe in un altro
  tipo. Se ne occupa `encAutoString`.
- **i campi di testo possono non essere testo**: una `version` scritta `0.7` invece di
  `"0.7"`, una `description` numerica, un `index` di parametro come stringa. Passavano
  dritti nel record e `encAutoString` su un numero produce byte senza senso, che l'ampli
  conferma chunk per chunk e poi ignora — silenzio, non errore. `convertiPreset` li forza
  con `testo()` e `indice()`. Trovato il 12 agosto 2026 cercando perché un preset
  importato non si scriveva in uno slot; **non ancora confermato che fosse quella la
  causa** sul preset dell'utente.

Lo zip si legge senza librerie: la struttura è poca cosa e per la decompressione basta
`DecompressionStream('deflate-raw')`. Attenzione agli offset della central directory —
nome a 28, extra a **30**, nota a **32**.

Provato sul backup reale l'11 agosto 2026: 105 preset importati, e uno di quelli importati
(`Fingerstyle Reverb`, mai passato per l'ampli) è stato caricato e **verificato
rileggendolo**. Gli effetti che compaiono solo nel backup — `UniVibe`, `Comp76`,
`Preamp73`, i `Vocal*` — sono quindi accettati dall'ampli.

## PWA — il dettaglio

`manifest.webmanifest` + `sw.js` + `src/pwa.js`. Verificato su localhost il 12 agosto 2026:
service worker attivo, guscio in cache, e **con il server spento `live.html` si apre lo
stesso, con tutti gli script**. È la prova che conta: a un concerto la rete non c'è.

**Strategia di cache: stale-while-revalidate.** Si risponde sempre dalla copia salvata e
si riscarica in sottofondo per la volta dopo. Cache-first puro rischia di restare
inchiodato a una versione vecchia se ci si dimentica di alzare `VERSIONE` in `sw.js`;
network-first fa aspettare la rete proprio quando non c'è.

**L'ancora va tolta dalla chiave di cache.** L'url di una `Request` la contiene, quindi
`index.html`, `index.html#live` e `index.html#libreria` finivano in tre voci distinte
della stessa pagina, aggiornate ognuna per conto suo e nessuna delle quali era quella
precaricata all'installazione. `rispondi()` normalizza la chiave a origine + percorso +
query.

**L'aggiornamento non si applica mai da solo.** Il nuovo worker resta in attesa e la
pagina mostra una striscia «C'è una versione nuova — Aggiorna»; solo premendo lì parte
`skipWaiting` e il ricaricamento. Un reload a sorpresa fra due pezzi sarebbe il peggio
che possa capitare.

Trappola già risolta: alla primissima visita `clients.claim()` fa scattare
`controllerchange` senza che ci sia niente da aggiornare. `pwa.js` guarda se la pagina
*era già controllata* al caricamento, altrimenti ricaricherebbe da sola ogni prima visita.

Da `file://` `pwa.js` non fa niente (i service worker vogliono un'origine sicura), quindi
lo sviluppo aprendo i file resta identico e nessuna cache si mette in mezzo.

`live.html` usa `viewport-fit=cover` e le `env(safe-area-inset-*)`: installata a schermo
intero, senza, header e log finirebbero sotto la tacca e sotto la barra dei gesti.

**Pubblicata il 12 agosto 2026** su `https://mazzrelaz.github.io/SparklingTones/`
(repo `mazzrelaz/SparklingTones`, GitHub Pages da `main` / root). Verificato sul sito
vero: manifest servito come `application/manifest+json`, service worker attivo con scope
`/SparklingTones/`, quindici voci in cache, `navigator.bluetooth` disponibile. I percorsi
relativi hanno retto il sottopercorso senza una modifica.

**Il 12 agosto 2026 la registrazione del service worker su `serve.ps1` ha smesso di
funzionare**: `An unknown error occurred when fetching the script`, mentre lo stesso
`sw.js` si scarica benissimo con una fetch normale (200, `text/javascript`, lunghezza
giusta) e su un'altra porta fa lo stesso. Prima nella stessa sessione aveva funzionato.
Non tocca l'app pubblicata — su https il worker si registra — quindi il banco di prova
locale resta buono per tutto il resto, ma **il service worker va verificato sul sito
vero**, non qui.

Due trappole nel provare, che sembrano bug dell'app e non lo sono. Navigare all'url su
cui la pagina già si trova, ancora compresa, è una navigazione *same-document*: non
ricarica niente e le modifiche al CSS non si vedono — serve `location.reload()`. E
`unregister()` più `caches.delete()` lasciano il worker vecchio a controllare la scheda
finché non la si chiude: per una prova pulita conviene aprire una scheda nuova.

## Informazioni, licenze, responsabilità

Il pannello «about» (`pannelloAbout`, si apre da «Altro») e i file `LICENSE` e `NOTICE`
sono la parte legale, chiesta dall'utente il 13 agosto 2026:

- **Autore: Massimo Togni. Licenza MIT**, cioè libero utilizzo — è la forma standard di
  «fai quello che vuoi, non garantisco niente», e contiene già l'esclusione di garanzia e
  di responsabilità in maiuscolo che vale come clausola.
- **Nessuna responsabilità**, detta anche in italiano e in concreto: sovrascrivere uno
  slot non si torna indietro, e un ampli può piantarsi e volere lo stacco della corrente.
  Sono due cose successe davvero in questo progetto, non formule.
- **Nessun rapporto con Positive Grid Inc.**: non prodotto, approvato, sponsorizzato né
  supportato, e non ne usa codice. I marchi sono citati per dire con cosa funziona — uso
  descrittivo, che è quello che rende lecito nominarli.
- **Provato solo su Spark 2**, un solo esemplare, e il protocollo è ricostruito
  osservando, non documentazione ufficiale.
- **Niente esce di lì**: nessun dato raccolto o inviato, la libreria sta nel browser.

Le licenze di terzi sono verificate, non supposte: **Soundshed è MIT** (nomi di effetti e
manopole, in `spark-effetti.js`) e **paulhamsh/Spark è Apache 2.0** (riferimento del
protocollo). Quest'ultima conta più di quanto sembri, perché in `reference/paulhamsh/` ci
sono **copie dei suoi sorgenti**: Apache 2.0 vuole l'attribuzione e una copia della
licenza accanto a chi la ridistribuisce, e adesso c'è
(`reference/paulhamsh/LICENSE-Apache-2.0.txt`, più `NOTICE` in radice).

## Su iPhone e iPad non si connette, e non è un difetto

**Nessun browser su iOS/iPadOS ha Web Bluetooth.** Non è Safari a essere indietro: su iOS
ogni browser è obbligato a usare il motore di Apple, quindi anche Chrome e Firefox lì non
ce l'hanno. `navigator.bluetooth` non esiste e il pulsante «Connetti» resta spento.
Segnalato dall'utente il 13 agosto 2026 su iPad.

L'app **lo dice per esteso** in cima alla vista preset invece di lasciare un pulsante
morto, e distingue il caso Apple dagli altri browser senza Bluetooth. Il testo dice anche
cosa funziona lo stesso, che è quasi tutto: sfogliare, cercare, organizzare, importare,
esportare.

`mela()` riconosce l'apparecchio **solo per scegliere le parole**: cosa fare lo decide la
presenza di `navigator.bluetooth`, che è il fatto vero. Attenzione al controllo: da
iPadOS 13 un iPad si dichiara `MacIntel`, quindi serve anche `maxTouchPoints > 1` per
distinguerlo da un Mac. Il controllo sta **prima** di `store.open()`: non dipende dal
database, e se il database tardasse l'avviso si deve vedere lo stesso.


## Il vestito dell'app — rifatto il 25 agosto 2026

Estratto da `CLAUDE.md` il 26 agosto 2026.


Chiesto dall'utente dopo l'editor nuovo: uniformare il resto e usare un carattere più
moderno. **Due caratteri, e stanno in casa** (`fonts/`, 70 KB in due, sottoinsieme latino,
nel guscio del service worker): **Space Grotesk** per etichette, numeri e pulsanti — la
parte «strumento», dove le cifre devono staccare da un metro e mezzo — e **Inter** per il
testo che si legge. Presi da una rete sarebbero l'unica cosa che manca proprio davanti
all'ampli col telefono senza campo. Attribuzione OFL in `NOTICE`.

Pulsanti, schede e campi hanno il vestito dei tasselli: fondo più scuro della pagina, un
bordo sottile, angolo tondo. **I pulsantoni della vista live** sono la stessa cosa in
grande, e da accesi hanno l'alone **verde**, come il loro LED e non come l'accento rosso
dell'app: su un pedale è la lampadina che colora tutto l'interruttore.

**Le trappole grafiche pagate qui**, che valgono oltre questo caso:

- **un alone che sborda va disegnato dentro qualcosa che lo lascia sbordare.** Il bagliore
  dei pomelli veniva tagliato di netto dal viewport dell'SVG e attorno a ogni manopola
  compariva un quadrato più chiaro. `overflow:visible`, **e** il disegno più stretto del
  riquadro, che serve dove il browser non lascia sconfinare;
- **`.pannello h2` è più specifico di una classe.** Il nome del preset non è mai stato
  grande come diceva il suo CSS, e alzare la classe non serviva a niente: la regola va per
  id. Costato tre giri con l'utente che continuava a vederlo piccolo;
- **il flex schiaccia prima di far scorrere.** Striscia e riquadro delle regolazioni vanno
  a `flex:0 0 auto` / `flex:1 0 auto`, o su uno schermo basso i pomelli diventano ellissi
  invece di far comparire la barra di scorrimento;
- **un conto sulle misure va fatto dopo un giro di disegno.** All'apertura il pannello è
  ancora nascosto e un elemento nascosto è largo zero: `requestAnimationFrame`, o la
  striscia resta ferma sul primo tassello.



## Editor della catena effetti — come si presenta (25 agosto 2026)

Estratto da `CLAUDE.md` il 26 agosto 2026. Le regole operative dell'editor
(offline, strozzamento degli invii, `.stato-pannello`) restano in `CLAUDE.md`.

**Come si presenta, dal 25 agosto 2026**: in cima i sette blocchi nell'ordine del segnale,
un tassello ciascuno col colore della categoria, il LED acceso/spento e le barrettine dei
valori — la forma del suono senza aprirlo; sotto, **un blocco solo alla volta** con le sue
manopole a pomello. Prima erano sette blocchi aperti: tre schermate, e non si sapeva mai a
che punto della catena si stessero mettendo le mani. La scelta è dell'utente, fatta
guardando le tre disposizioni di `design/proposte-editor.html`.

Le regole di quel disegno, tutte chieste o approvate dall'utente:

- **i valori si leggono da 0 a 10 con un decimale** («6.1» dice qualcosa a chi suona,
  «0.61» no). All'ampli continua ad andare 0..1: `mostraValore` non entra mai in un comando;
- **i pomelli si girano trascinando in verticale**, 300 px da zero a dieci — in cerchio col
  dito è un terno al lotto — e il valore compare in una bolla grande, perché sotto il dito
  il numerino non si vede;
- **si dispongono a piramide**, ultima riga in centro: 4 fanno 2 e 2, 3 fanno 2 e 1, 5 fanno
  3 e 2, 7 fanno 4 e 3. Vale anche per l'ampli, che tiene però l'ordine del frontale (Gain,
  Bass, Middle, Treble, Master) riconosciuto **dai nomi della tabella**, non dalla posizione
  nella catena;
- **il nome del modello è il titolo del blocco ed è la tendina che lo cambia**, in centro,
  con l'interruttore sotto a tutta larghezza. Era un titolo con una freccina accanto e
  l'utente non trovava il modo di cambiare effetto — due volte colpa mia, perché senza ampli
  era anche spento senza dire perché;
- nella tendina **niente intestazioni**: prima i modelli usciti da questo ampli, poi una riga
  separatrice senza parole, poi quelli dal catalogo. La distinzione è di sicurezza e resta;
- **il nome del preset è un'insegna al neon** del colore della sua famiglia (clean, drive,
  acoustic, bass), bianca se non ne ha — inventarle un colore farebbe leggere una famiglia
  che non c'è. Sta centrata fra il menu e la catena, e il riquadro delle regolazioni si allunga fino
  in fondo: lo spazio che avanza non resta mai vuoto;
- **la riga di stato compare solo se qualcosa non va**, ed è rossa. Le conferme («modifiche
  salvate», «catena riletta») restano nel log della vista preset: in quel pannello lo schermo
  serve alla catena. Il pannello è marcato `data-solo-risposte` e `logLine` ha un secondo
  argomento che dice se il messaggio è un problema;
- la guida sta dietro un **«?»** in cima e si richiude da sé riaprendo l'editor.
  **Dal 26 agosto 2026 il «?» non c'è più**: la guida è una voce del menu ⋯ e si
  chiama «Come funziona», perché in un elenco un punto interrogativo da solo non
  dice cosa apre. Il posto in cima è lo stesso, il gesto uno in più.



## La barra in alto — rifatta il 26 agosto 2026

Chiesto dall'utente: «le schede in alto sono disordinate, troviamo un modo per renderle
più gradevoli». Il disordine aveva una causa precisa, ed è quella che va ricordata: sulla
stessa riga stavano **cinque cose con cinque mestieri diversi** — il marchio, lo stato
della connessione, il tasto che connette, le azioni, il passaggio alla vista Live — tutte
con lo stesso peso visivo e con `flex-wrap` libero. Sul telefono l'ordine delle righe
**cambiava da solo** appena lo stato si accorciava da «non connesso» a «connesso»:
tre righe di intestazione, disposte diversamente a ogni connessione.

Scelta dall'utente fra tre disposizioni messe a confronto in `design/proposte-menu.html`
(schede segmentate / due zone separate / l'essenziale più un menu), guardandole a
larghezza da computer e da telefono. Ha preso la terza, con modifiche sue.

**Com'è adesso, e perché ogni pezzo è così:**

- **lo stato della connessione *è* il pulsante che connette.** Erano due cose che dicevano
  la stessa cosa una accanto all'altra («non connesso» e «Connetti»). Ora è uno solo:
  rosso pieno **CONNETTI** quando l'ampli non c'è, verde **CONNESSO** quando c'è, giallo
  con la scritta dell'attesa mentre si collega, grigio e spento dove il browser non ha il
  Bluetooth. Maiuscolo, perché si legge di sguardo come le scritte sul frontale;
- **da connesso il tasto è spento ma non deve *sembrare* spento.** `button:disabled` lo
  sbiadirebbe come un comando non disponibile, mentre lì vuol dire che la cosa è a posto:
  il verde va ripetuto sulla variante `:disabled`, o si perde;
- **il nome dell'amplificatore non sta più nel pulsante**, ci sta scritto «CONNESSO». Il
  nome è lungo e cambiava la larghezza della barra a ogni connessione. È nel titolo;
- **tre cose in barra, in quest'ordine: connessione, vista, menu** — l'ordine l'ha chiesto
  l'utente, col menu in fondo a destra dove arriva il pollice;
- **Live → più grande e con la cornice rossa sottile.** Rovescia la nota del 14 agosto
  2026, che l'aveva rimpicciolito perché non ci stava sulla riga: adesso ci sta, perché
  quella riga ha tre pulsanti in meno;
- **le altre azioni stanno dietro un ⋯.** Non sono pulsanti nuovi: sono gli stessi,
  spostati dentro la tendina, quindi tengono `id`, listener e acceso/spento. In vista
  preset sono «Leggi dall'ampli / Categorie / Altro», in live «Modifica / Pedale», e la
  differenza la fanno le classi `.solo-preset` / `.solo-live` di sempre;
- **lo stesso menu è nell'editor** (chiesto il 26 agosto): davanti restano «Salva» e
  «Fatto», dietro il menu «Rileggi dall'ampli» e «Come funziona».

**Le trappole pagate qui, che valgono per qualunque tendina:**

- **una tendina che si appoggia al bordo destro del suo tasto esce dallo schermo se il
  tasto finisce a sinistra**, e basta una barra che va a capo. Succedeva davvero nella
  barra dell'editor sul telefono: il ⋯ scendeva a capo a sinistra e la tendina si apriva
  a `x = -144`. Due rimedi, e servono tutti e due: la barra non va a capo
  (`flex-wrap:nowrap` più le etichette accorciate sotto i 600 px), e all'apertura la
  tendina **si misura e nel caso si ribalta** su `left:0`;
- **sul telefono la riga sta in piedi per pochi pixel.** A 375 avanzano 16 px, a 360 zero.
  Sotto, è il **marchio** che cede: `flex:0 1 auto` più `object-fit:contain`, così si
  rimpicciolisce invece di schiacciarsi — ed è giusto che ceda lui, perché è l'unica cosa
  della riga che non serve a fare niente. Verificato a 375, 360 e 320;
- **misurare invece di guardare.** Le posizioni degli elementi della barra lette con
  `getBoundingClientRect` da `localhost` hanno mostrato in un colpo solo cosa andava a
  capo e dove; a occhio, su uno screenshot, si vedeva solo che «era disordinato».

## Perché tutti i settantotto modelli si possono cambiare, anche senza ampli

Spostato da `CLAUDE.md` il 2 settembre 2026 per non pesarci a ogni sessione: è un argomento
chiuso, e in `CLAUDE.md` ne resta la conclusione.

La regola è sempre stata **«solo i modelli di cui sappiamo com'è fatto il blocco»**, e dal
26 agosto 2026 lo sappiamo per tutti, perché il catalogo è verificato contro l'app ufficiale
e la `TABELLA` dichiara le manopole di ognuno.

**Che il conto torni è misurato, non supposto**: nei **ventiquattro blocchi** dei preset
usciti dall'ampli in `captures/` — **ventidue modelli diversi** — i parametri sono sempre
tanti quanti i nomi. Le due eccezioni sono **noise gate e riverbero**, che ne hanno uno in
più (l'acceso/spento), e sono proprio i due blocchi con **un modello solo**: quelli non si
cambiano mai, quindi l'eccezione non tocca il cambio di modello.

## Le regole dell app, versione lunga — archiviata da CLAUDE.md il 2 settembre 2026

In memoria di lavoro restano le regole nude; qui il testo per intero, col perche.

### Sezione Preset

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, con l'etichetta
A1…B4 e i colori dei LED (rosso il banco A, verde il B). Tutti gli altri stanno sotto. Un
preset non compare mai in tutti e due i posti. **Niente striscia della famiglia sulle otto
caselle** (tolta il 26 agosto 2026): resta sulle righe di libreria e sul LED dei
pulsantoni live.

**Sovrascrivere uno slot non perde il preset che c'era**, e la domanda è venuta
(26 agosto 2026): `assignSlots` → `_sistemaSlot` gli toglie lo slot, quindi da lì in poi
cade in `altri` e **ricompare da solo nella lista sotto**, con tag, note e famiglia. Il
record non si cancella mai, cambia solo `slots`. L'utente ha deciso di lasciarla così:
niente duplicazione fra i due posti.

**Il bollo «JH» marca i preset che hanno un effetto Hendrix in catena**, sulle schede degli
slot e sulle righe di libreria (`bolloHendrix`, e `SparkEffetti.hendrixNellaCatena` che è
solo il prefisso `JH.`). Serve perché quei preset **non suonano come dicono** finché l'app
ufficiale non ha sbloccato il pacchetto — vedi la trappola in «Protocollo» — e va saputo
prima di sceglierne uno, non dopo averlo sentito muto.

**In tutto, gli Hendrix si dicono in quattro posti, e quattro devono restare**: le schede
della vista preset, la tendina dei modelli, il blocco a fuoco dell'editor (questi due in
«Editor della catena effetti») e **una riga nel log quando il preset parte per l'ampli**,
in `mandaPreset`, che è il momento in cui il suono esce sbagliato. Quest'ultima si dice
**prima dell'invio** e non nella verifica, così è una sola invece che in ognuno dei rami.
**È un avviso al buio**: all'ampli non si può chiedere se il pacchetto sia sbloccato,
quindi parla anche quando va tutto bene — ed è la ragione per cui i posti sono quattro e
non dieci. Restano scoperti **la vista live** (decisione dell'utente, non presa: i
pulsantoni li ha disegnati lui e il LED porta già la famiglia) e **il pedale**, che un
banco con dentro un Hendrix lo suonerebbe muto senza nessuna app che lo spieghi.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, dopo
`identify`). Durante la lettura i pulsantoni della vista live restano spenti: l'ampli sta
rispondendo a otto richieste in fila e premerne uno infilerebbe un comando dentro una
conversazione già aperta.

`store.hardware()` restituisce sempre otto posti, con `null` dove non sappiamo ancora cosa
ci sia. Nel disegnare «In libreria» il confronto va fatto **per id**, non per oggetto:
`hardware()` rilegge dal database e restituisce copie diverse dagli stessi record.

**`slots` è una lista, non un numero.** Lo stesso preset può stare in più slot, e capita
davvero. `normalizzaSlots` tiene una sola verità: costruisce `record.slots` ordinato e
**cancella il vecchio `slot`**. `_sistemaSlot(visti)` è il cuore, condiviso fra
`importFromAmp` e `assignSlots`: **si toccano solo gli slot osservati**, perché
`readLibrary` salta quelli che non rispondono e cancellare uno slot mai visto farebbe
sparire un preset per un timeout. Nella UI un preset in due slot compare due volte, e la
chiave di apertura del dettaglio è `id:slot` e non `id`.

**«Elimina tutti i preset» (pannello «Altro») risparmia gli otto dell'ampli**, e non per
prudenza: quelli l'ampli li suona, quindi la prima lettura li rimetterebbe dentro comunque
— ma spogliati di tag, note e famiglia, e *quello* sarebbe lavoro perso davvero.
`svuotaTranneAmpli` passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da
Dropbox» rimetterebbe dentro tutto. Due conferme, e la seconda dice che la cosa viaggia.

**Un preset nuovo si fa in tre modi, e nessuno parte dal nulla**: «Duplica» nel dettaglio
(`store.duplicate`, che cambia **UUID, slot e nome** — l'UUID perché altrimenti la lettura
dall'ampli scambierebbe la copia per l'originale), «Importa preset attuale» nel menu «⋯»,
che offre di salvare quello che l'ampli sta suonando — se quell'UUID c'è già aggiorna solo
la parte sonora, che è la regola di `importFromAmp` — e **«Importa un file»**, che dal
28 agosto 2026 prende anche **un preset singolo** dell'app ufficiale e non solo il backup
intero (vedi «Importare un preset solo» qui sotto). **Dal nulla non si fa, ed è
deliberato**: un preset inventato dovrebbe dichiarare sette blocchi con modelli che l'ampli
ha davvero, e un modello inesistente è quello che l'ha già piantato una volta (vedi
`TrebleBooster`). Se un giorno servisse, lo scheletro va preso da un preset **uscito
dall'ampli**, non dal catalogo.

**Importare un preset solo** (28 agosto 2026). «Importa un file» accetta tre cose e le
distingue **dal contenuto, non dall'estensione**: uno zip lo dicono i suoi primi due byte
(`PK`), il nostro backup lo dice il campo `presets`, e tutto il resto lo guarda
`SparkBackup.trovaPresetUfficiali`, che scende nel JSON in cerca di **un oggetto con
`sigpath`** invece di indovinare il nome dell'incarto — di un tono esportato o condiviso
dall'app ufficiale **non abbiamo un esemplare**, quindi la forma dell'involucro non la
sappiamo, ma la catena sì. Per questo l'`<input type=file>` **non ha `accept`**: con un
filtro, un'estensione che non conosciamo non si riuscirebbe nemmeno a scegliere.
Da lì in poi è la strada del backup — stesso `convertiPreset`, stessa `importFromBackup` —
quindi valgono le regole della libreria. Senza `meta.id` **l'UUID glielo diamo noi** e lo
si dice nel log: reimportando lo stesso file si fa un doppione invece di aggiornare.
**Il file non è l'unica via, e spesso non è la più comoda**: un tono che l'app ufficiale
sta già facendo suonare si prende con «Importa preset attuale», senza esportare niente.

### Editor della catena effetti

Com'è fatto e perché — la catena al neon, i pomelli, la piramide, la tendina dei modelli —
sta in `docs/decisioni-ui.md`. Qui restano le regole che fanno danni se le dimentico.

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che
governa tutto il resto. Per questo «Regola», **quando l'ampli c'è**, prima manda il preset
con `loadPreset` e solo dopo apre il pannello. Lo stato di partenza si rilegge
**dall'ampli** (`readLiveState`), non dalla libreria: se l'utente ha girato una manopola
vera o ha usato l'app ufficiale, la verità è lì. Se la rilettura fallisce l'editor non si
apre — meglio niente che manopole che partono da valori inventati. Niente viene salvato
finché non si preme **Salva in libreria**.

**Senza ampli l'editor si apre lo stesso, sulla copia in libreria** (chiesto dall'utente il
24 agosto 2026: è il caso del divano). Non tradisce la regola di sopra, perché i valori del
record sono un'istantanea vera di quel suono. `inModifica.offline` governa la differenza:

- **niente parte sulla radio**: `mandaParametro` non accoda nemmeno, o un arretrato
  partirebbe tutto insieme se l'ampli si connettesse a metà;
- **il modello si cambia, qualunque, anche senza ampli** (dal 26 agosto 2026, chiesto
  dall'utente in tre passi: prima la tendina era spenta, poi si aprivano i soli modelli
  visti, ora tutti). Non è un cedimento sulla sicurezza: la regola è sempre stata **«solo
  quelli di cui sappiamo com'è fatto il blocco»**, e adesso lo sappiamo per tutti e
  **settantotto** i modelli cambiabili, perché il catalogo è verificato contro l'app
  ufficiale e la `TABELLA` dichiara le manopole di ognuno.

  Che il numero sia quello vero **è misurato** sui ventiquattro blocchi dei preset in
  `captures/`; il dettaglio in `docs/decisioni-ui.md`.

  Nel cambio, **prima si copia e poi si costruisce**: se quel modello sta già in un preset
  della libreria, `campioneModello(nome)` ne prende numero di parametri *e* valori — è un
  blocco che l'ampli ha davvero prodotto. Solo se non c'è si costruisce dalla tabella, con i
  valori a metà corsa. Il blocco resta acceso o spento com'era, che è una scelta dell'utente
  e non una proprietà del modello;
- **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si connette
  dopo: rileggere la catena a metà lavoro sostituirebbe di soppiatto quello che si sta
  modificando con quello che l'ampli sta suonando, che è un altro suono.

Il titolo dice «— senza ampli» e la riga di stato lo ripete.

**Le sette posizioni sono etichettate per categoria** (`Spark.CATENA`): noise gate,
compressore, drive, ampli, modulazione, delay, riverbero.

**Il tempo sta qui, e solo qui** (28 agosto 2026, chiesto dall'utente e poi ristretto da
lui: «non nella vista live, non serve»). La ragione è che **il bpm è un campo del preset**
— `preset.bpm`, che `serializePreset` scrive dentro `0x0101` — quindi viaggia col preset e
torna quando lo si rimanda all'ampli: è una cosa che si sceglie mentre si costruisce il
suono, come una manopola, non mentre si suona. Si batte col **tap** (due tocchi bastano,
media delle ultime cinque battute, una pausa oltre 2,5 s ricomincia) o si aggiusta di un
bpm coi due tasti. Il riscontro del tap è **il lampeggio del tasto** e non un messaggio,
che in questo pannello non ne devono comparire.

Con l'ampli attaccato il cambio parte subito con `0x0176` (`spark.setBpm`), **e gli effetti
a tempo lo seguono da soli**: l'accoppiamento è dentro l'ampli. Senza ampli **non parte
niente sulla radio**, come per le manopole. All'apertura il valore si prende dalla lettura
dell'ampli quando c'è, dal record quando non c'è, e 120 per i record vecchi che il campo
non ce l'hanno. `salvaModifiche` lo scrive nel record.

**Il cursore va strozzato, e lo strozzamento dev'essere autocadenzato.** Un trascinamento
genera decine di eventi al secondo e ogni comando è una scrittura BLE.
**`writeWithoutResponse` non ha controllo di flusso**: la promessa si risolve quando il
sistema ha preso in carico la scrittura, non quando l'ampli l'ha ricevuta, quindi l'app può
correre più della radio. **È la causa più probabile dell'ampli che si pianta girando le
manopole**, segnalato dall'utente il 16 agosto 2026.

Quindi il prossimo invio parte **quando il precedente è finito**, più `PAUSA_PARAMETRO`
(90 ms), e non su un timer: così la coda non può crescere qualunque cosa faccia il dito. La
versione a timer da 60 ms poteva **sovrapporsi a sé stessa** — `svuotaCoda` azzerava
`timerInvio` prima di aspettare gli invii — e accumulava arretrato. Si tiene solo l'ultimo
valore per manopola, e l'ultimo parte sempre. **Non è verificato che risolva**: il blocco
non si riproduce a comando. Se ricapita, la manopola da girare è `PAUSA_PARAMETRO`, poi
`SEND_GAP_MS` in `spark-transport.js` (30 ms, più svelto di un intervallo di connessione).

**L'editor sa se c'è del lavoro non salvato, e non lo lascia buttare via per sbaglio.**
`inModifica.toccato` è il dato, e nasce in `segnaModificato()`: lo alzano `mandaParametro`
(dove passano **tutte e cinque** le manopole — pomello, cursore, tendina, i due
trascinamenti — subito **prima** del ritorno che scarta l'invio offline), l'interruttore
acceso/spento, e ogni ramo di `cambiaModello`. Da lì:

- **«Fatto» e il logo chiedono**, con `chiediPrimaDiUscire()`. **Tre vie, non due**: con un
  `confirm()` di sistema l'alternativa a «salva» è «butta via», e un dito che sbaglia
  bottone perde il lavoro proprio mentre glielo si chiedeva. La terza — «Torna all'editor»
  — è anche quella di Esc e del tocco fuori. Il logo passa un seguito, che parte **solo se
  si esce davvero**: chiude l'editor *e* torna ai preset.
- **Se il salvataggio fallisce non si chiude niente**, e per questo `salvaModifiche()`
  torna `true`/`false`: chiudere dopo un salvataggio fallito è il modo esatto di perdere
  il lavoro che si stava salvando.
- **Il segno che ha salvato lo dà il tasto**, non un messaggio — in questo pannello non ne
  deve comparire nessuno, ed è per quello che l'utente non aveva «la certezza di nulla».
  Pallino rosso e bordo acceso quando c'è del lavoro in sospeso, `✓ Salvato` verde per 2,6
  secondi dopo, poi normale. **Non si disabilita mai quando niente è toccato**: con l'ampli
  la catena viene da una lettura vera e può già essere diversa da quella in libreria —
  salvare in quel momento è proprio come si porta in libreria quello che l'ampli suona.

**Gli Hendrix si dicono in due momenti, e sui tasselli non si dicono affatto.** Quei
modelli si chiamano già «J.H. Fuzz Zone»: il nome li identifica da solo, e un bollo in più
su una casella da 106 px sarebbe rumore. Quello che manca è **cosa comporta**, e va nei due
momenti in cui conta: una `.elenco-nota` sotto l'intestazione «Jimi Hendrix Pack» della
tendina — **una sola, non su ogni voce** — e una `.nota-jh` sotto il nome del modello nel
blocco a fuoco, che resta lì finché quel modello è quello. La seconda **è uno stato, non un
messaggio**, che in questo pannello non ne devono comparire: sta al nome del blocco come
«offline» sta al nome del preset.

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, e `logLine`/
`logProgress` ci scrivono l'ultimo messaggio: un pannello a tutto schermo copre il log, e
senza quello un comando fallito è indistinguibile da un comando che non fa niente.
**`pulisciStatoPannelli()` nasconde ogni `.stato-pannello`**, e chi ci scrive deve
rimostrarlo (`riga.hidden = false`) — è quello che fa `statoDelPannello`. Senza, il log
viene scritto sempre e non si vede mai: due giri di diagnostica finiti in un elemento
invisibile.

### Finestre e tendine: nell'app non c'è più niente del sistema

**Mai più `confirm()`, `alert()`, `prompt()` o `<select>`** (26 agosto 2026, chiesto
dall'utente: «sulla prima pagina sono ancora i menu di sistema»). Aprono la roba del
sistema operativo — carattere suo, fondo chiaro in un'app tutta nera, e sul telefono il
menu di Android manda a capo le voci lunghe — e soprattutto **un `confirm()` ha due vie
sole**, che è il problema che aveva già fatto nascere la domanda dell'editor.

Al loro posto, tutte costruite sulla stessa scatola `.elenco-scelta`:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | il valore sta in `.valore` (non `.value`), `aggiorna(v)` lo cambia da fuori |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | il testo, o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | il `valore` dell'azione, `null` se si esce |

Tutte sono **asincrone**, quindi il gestore che le chiama va `async`. `testo` è **HTML** —
il grassetto va sulla parte che conta — e un nome che viene dai dati ci entra solo passando
da **`testoConNome()`**, che lo scappa. Esc e il tocco fuori tornano sempre `null`, che è la
via che non fa niente.

**Le scorciatoie «campo vuoto = elimina» sono sparite**, ed erano due: il nome del banco e
il nome di una manopola. Erano una regola scritta fra parentesi che nessuno legge, e chi
svuotava il campo per riscriverlo si trovava a rispondere di un'eliminazione mai chiesta.
Adesso sono bottoni che dicono quello che fanno.

**Nella tendina «⋯» nessuna voce si spegne**, e il motivo è misurato: **un pulsante
`disabled` non riceve il clic**, quindi non scatta nemmeno il gestore che chiude la
tendina — la tendina resta aperta, non compare niente da nessuna parte, e si vede
un'app rotta. È quello che è successo il 28 agosto 2026 con «Importa preset attuale»
(«non succede nulla»). Quindi «Leggi dall'ampli» e «Importa preset attuale» restano
sempre premibili e, senza ampli, **rispondono**: `senzaAmpli(cosa)` compone la riga di
log, una sola, che dice cosa manca e cosa fare. La stessa trappola vale per qualunque
voce si aggiunga lì dentro.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), non da Positive Grid, quindi restano
**proposte**: si vedono *in corsivo*, un nome scritto a mano vince sempre, e `manopola()`
**scarta l'intera riga** se dichiara più manopole di quante l'ampli ne manda per
quell'effetto.

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto.** Su un ampli
le manopole si leggono Gain, Bass, Middle, Treble, Master, ma negli indici stanno
`Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Trascrivendo dall'interfaccia si
sbagliava in silenzio. Due test fissano questo caso e quello di LA Comp.

Il campo `quante` dice **quante manopole ha davvero l'effetto**: può essere più dei nomi che
sappiamo e meno dei parametri che arrivano. I parametri in eccesso sono
**l'acceso/spento del blocco** (misurato, vedi `docs/protocollo-spark2.md`).

**I nomi dei parametri li dà l'utente**, girando e ascoltando: l'ampli manda solo indici e
non esiste nessuna tabella da cui dedurli. Sono salvati **per modello di effetto**
(`settings.nomiParametri`), non per preset. `exportAll` li porta con sé e `importBackup` li
**aggiunge** invece di sovrascrivere: reimportare un backup vecchio non deve cancellare i
battesimi fatti da allora.

**`MODELLI` adesso è verificato tutto, contro l'app ufficiale** (26 agosto 2026): l'utente
ha fotografato l'elenco intero sul suo Spark 2 e il confronto voce per voce ha tolto
**dodici** nomi che il catalogo di Soundshed aveva e l'ampli no. I conti tornano con i suoi
screenshot: **noise gate 1, comp/wah 6, drive 14, ampli 39, modulazione 13, delay 6,
riverbero 1 con 9 tipi**.

**Una voce nuova nell'elenco ufficiale non è per forza un modello nuovo** (2 settembre
2026). Positive Grid ha aggiunto un **«Auto Wah»**, libero per tutti, con la sola
Sensitivity, accanto al wah del pacchetto Hendrix che c'era già. Nell'app sono due voci; per
lo Spark sono **lo stesso `JH.Vox846` con sei parametri**, e la differenza sta nei valori.
Misurato con due catture apposta. Quindi **il conteggio di comp/wah resta 6** — sono
identificativi, non voci di menu — e in `MODELLI` non è stato aggiunto niente. Ne segue una
cosa vera per la UI: **scegliendo quel modello dalla tendina non si decide quale dei due si
prende**, perché `campioneModello` copia il primo blocco che trova in libreria. E il
prefisso `JH.` su quel codice **resta di proposito**: la variante Hendrix vuole ancora lo
sblocco, quindi l'avviso ogni tanto parla a vuoto ma non tace mai quando servirebbe.

I dodici: `JCM800`, `MatchlessDC30`, `DrZ`, `Hiwatt103`, `B15`, `Acoustic360`, `GK700RBII`,
`MetalZoneMT2`, `MuTron` — e tre che **esistono ma solo su Spark LIVE ed EDGE**, sul canale
del microfono: `Preamp73`, `Comp76`, più i «vocal» che non avevamo. Erano tutti
`TrebleBooster` in attesa (18 agosto 2026: sullo Spark 2 c'è solo `Booster`, e chiederne
uno inesistente lo mandava in palla). Restano nella `TABELLA` dei nomi, che è innocua e
serve ancora a dare un nome alle manopole di un preset importato da altrove.

**Il credito a Soundshed non si toglie, e la domanda è già stata fatta** (31 agosto 2026).
La verifica contro l'app ufficiale ha corretto **`MODELLI`**, cioè quali modelli esistono;
non ha toccato la **`TABELLA`**, che sono **90 voci di nomi di manopole con il loro ordine
di indice** e sono ancora loro. Quell'ordine dalle foto non poteva venire — sullo schermo si
legge Gain, Bass, Middle, Treble, Master e negli indici sta `Gain(0), Treble(1), Middle(2),
Bass(3), Master(4)` — quindi il NOTICE dice il vero e la MIT lo richiede. L'unica strada per
farlo cadere davvero è **sostituire la tabella battezzando le manopole a orecchio**, con la
funzione che l'app ha già: quando i nomi dell'utente coprono tutto, il credito cade da sé.

**Se si aggiunge un nome nuovo a `MODELLI`, va verificato allo stesso modo**, perché
all'ampli non si può chiedere quali modelli conosce: l'unica prova è che compaia
nell'elenco ufficiale o in un preset uscito dall'ampli. La tendina tiene in fondo un gruppo
«fuori dall'elenco Positive Grid» — oggi vuoto — che li raccoglierebbe.

**Gli effetti Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»**
(`SparkEffetti.GRUPPO_HENDRIX`, una stringa sola per tutti e quattro i blocchi che ne
hanno). Chiesto dall'utente il 26 agosto 2026, e non è solo ordine: sono l'unico contenuto
a pagamento e l'unico che può entrare in catena e restare muto, quindi sparsi in mezzo agli
altri sembravano effetti come tutti gli altri. Per gli ampli è una famiglia di
`GRUPPI_AMPLI` come le altre, ed è l'ultima; per gli altri blocchi, che famiglie non hanno,
l'elenco si costruisce in due passate.


### La decisione sull inglese — spostata da CLAUDE.md il 2 settembre 2026

- Italiano nei commenti e nella UI. **L'inglese ci sarà, ma non adesso** — deciso il 26
  agosto 2026 dopo aver misurato: sono **~270 stringhe** (169 nel JS, 87 nel corpo HTML,
  12 fra `title` e `placeholder`), e **93 sono messaggi di log**, cioè prosa che spiega il
  comportamento e che quindi si riscrive ogni volta che il comportamento cambia.
  Tradurre adesso vuol dire tradurre due volte e rendere doppia ogni modifica alla UI;
  aspettare non accumula debito, perché i messaggi sono già frasi intere con i valori
  dentro e non pezzi cuciti insieme. Il momento è **quando Preset, Live ed editor smettono
  di cambiare forma** — non «a progetto finito», che il pedale può andare avanti senza
  toccare una riga di testo dell'app. Allora: `src/lingua.js` con due dizionari e una
  `t()`, `data-t` sugli elementi statici, nessuna libreria e nessun build step. L'utente ha
  detto «non c'è fretta»: è per sé, non per pubblicarla ad altri.
