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
ne vuole; **la famiglia dice che tipo di suono è** — Clean, Drive, Acoustic — è una sola, e
serve a riconoscerlo dal colore senza leggere niente.

Tre e non di più, perché più di tre colori non si distinguono con un'occhiata. Si
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

L'app Spark salva su Dropbox `preset_backup.zip`:

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
