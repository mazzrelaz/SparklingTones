# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth.

## Struttura

```
index.html               libreria: ricerca, tag, note, preferiti, riordino, scrittura
live.html                vista live: pulsantoni per una scaletta, per suonare
src/spark-protocol.js    encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js   connessione BLE, coda di invio, attesa risposte, lettura preset
src/preset-store.js      libreria su IndexedDB, import dall'ampli, backup, scaletta
src/spark-backup.js      legge preset_backup.zip dell'app ufficiale, senza librerie
tools/reader.html        legge la libreria dall'ampli e la esporta in JSON
tools/write-probe.html   prova le varianti di 0x0101 e verifica da sé rileggendo
tools/explorer.html      tool diagnostico, congelato — single-file, apribile da Android
tools/explorer-v1.html   versione precedente, tenuta per riferimento
test/protocol-test.html  53 test del protocollo contro catture reali
test/transport-test.html 47 test del trasporto, con send finto e catture reali
test/store-test.html     52 test della libreria, su un database temporaneo
test/backup-test.html    26 test del lettore zip e della conversione dal formato ufficiale
test/fixtures/preset0.js catture condivise fra le suite: preset salvato e stato live
docs/                    handoff report con la ricerca iniziale sul protocollo
reference/paulhamsh/     sorgenti di riferimento (ESP32 + Python), BLE funzionante
captures/                log grezzi dall'ampli
```

Niente build step, niente server: tutto si apre da `file://`. Per questo i moduli sono
classic script che espongono `window.Spark` e `window.SparkTransport` invece di ES module,
che su `file://` sono bloccati dal CORS.

**Dopo ogni modifica a `src/`, apri le tre pagine in `test/` e verifica che il riepilogo
sia verde.** Girano contro catture reali dell'ampli, quindi intercettano una regressione
nella codifica senza avere l'hardware a portata. Due test confrontano i messaggi generati
con quelli che hanno davvero avuto effetto sull'ampli, byte per byte.

IndexedDB funziona da `file://` su Chrome desktop (verificato). Attenzione però: su
`file://` tutte le pagine condividono la stessa origine opaca, quindi non c'è isolamento
fra i database, e il browser può ripulirli più facilmente. Per installare l'app come PWA
su Android servirà comunque servirla via https — GitHub Pages basta.

`tools/explorer.html` contiene una copia propria del codice di protocollo, perché deve
restare single-file per essere copiato sul telefono. È **congelato**: le modifiche vanno
in `src/`, non lì.

La libreria non perde mai il lavoro dell'utente: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, preferiti e ordine.
È il comportamento più importante di `preset-store.js` ed è coperto da test.

## Importazione dall'app ufficiale

L'app Spark salva su Dropbox `preset_backup.zip`, che ha questa forma:

```
preset_backup/Presets/<Categoria>/category.json
preset_backup/Presets/<Categoria>/<UUID>/preset.json
preset_backup/Presets/<Categoria>/<UUID>/icon.png
```

**Le cartelle di categoria diventano tag**, quindi la catalogazione dell'app ufficiale
arriva già fatta. Le icone si ignorano: mezzo mega l'una e tutte uguali.

Il formato di `preset.json` mappa quasi uno a uno sul nostro: `meta` per i metadati,
`sigpath` per la catena, `dspId` per il nome dell'effetto, `active` per l'interruttore.
Due differenze che contano, entrambe trovate sul backup reale da 105 preset:

- **alcuni parametri sono booleani** invece che numeri (21 casi): vanno convertiti in
  0 e 1, altrimenti l'encoder produce NaN
- **nomi e descrizioni superano i 31 caratteri** (21 preset su 105): oltre quella
  lunghezza serve la long string `0xd9`, perché `0xa0+len` sconfinerebbe in un altro
  tipo. Se ne occupa `encAutoString`.

Lo zip si legge senza librerie: la struttura è poca cosa e per la decompressione basta
`DecompressionStream('deflate-raw')`, che i browser hanno già. Attenzione agli offset
della central directory — nome a 28, extra a **30**, nota a **32**.

`importFromBackup` aggiunge la categoria ai tag esistenti invece di sostituirli:
reimportare il backup non deve cancellare la catalogazione fatta qui.

Provato sul backup reale l'11 agosto 2026: 105 preset importati, e uno di quelli importati
(`Fingerstyle Reverb`, mai passato per l'ampli) è stato caricato e **verificato
rileggendolo**. Gli effetti che compaiono solo nel backup — `UniVibe`, `Comp76`,
`Preamp73`, i `Vocal*` — sono quindi accettati dall'ampli.

## Vista live

`live.html` serve a suonare, non a catalogare: scaletta di preset presi dalla libreria,
un pulsantone per ciascuno. Il compromesso che la governa: un preset che sta già in uno
slot dell'ampli si attiva **istantaneamente** con `0x0138`, uno che non c'è va trasmesso
per intero e ci mette circa un secondo. Il pulsante dice quale dei due casi è, e
**Prepara** scrive i primi 8 della scaletta negli slot così durante il concerto sono
tutti istantanei.

La scaletta sta in IndexedDB fra le preferenze (`settings`, aggiunto nella versione 2 del
database). `getSetlist` scarta gli id di preset cancellati, così non restano pulsanti
morti. Dopo **Prepara**, `assignSlots` aggiorna quale preset sta in quale slot e toglie
lo slot a chi è stato sovrascritto.

Ancora da fare, in ordine di utilità discussa con l'utente:

1. **PWA** — manifest, service worker, pubblicazione su https (GitHub Pages). Serve
   davvero: un sistema live vuole il telefono accanto all'ampli, non il PC. Oggi l'app
   gira da `file://`, dove la libreria vive in un'origine fragile.
2. **Editor della catena effetti** — manopole in tempo reale. Tutti i comandi che servono
   (`0x0104`, `0x0115`, `0x0106`) sono già verificati: è lavoro di interfaccia.
3. **`slot` come lista** invece che campo singolo, così un preset copiato in più slot li
   mostra tutti.

`loadPreset` e `storePreset` sono **entrambi verificati sull'hardware** (11 agosto 2026).

`tools/write-probe.html` resta utile se una scrittura smette di funzionare: prova varianti
di `0x0101` una alla volta e verifica ognuna rileggendo lo stato live, senza bisogno di
ascoltare.

## Stato

Il protocollo è **completo e verificato sull'ampli**: lettura dei preset, `0x0138` cambio
preset, `0x0115` effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset
intero (sia da far suonare subito sia da salvare in uno slot). `0x0115` e `0x0104`
richiedono il byte `0x00` finale descritto sotto; `0x0101` richiede il comando di coda
descritto più avanti.

Nessuna autenticazione è richiesta: la license key `0x0170` non è mai stata inviata.

Resta aperto che il numero di preset inviato con `0x0138` non corrisponde a quello che
si attiva.

**Trappola da ricordare quando un comando sembra non funzionare:** cambiare un parametro
di un effetto spento non produce nessun suono. Verifica prima che l'effetto sia attivo.

### Ipotesi escluse da misure dirette

- **License key** — `0x0138` funziona senza averla mai inviata.
- **Ordine dei bit nella codifica 7/8** — la maschera parte da `0x80`, va a `1` e raddoppia
  (`SparkIO.ino:1069-1083`), LSB-first come la nostra; e il nostro packer riproduce una
  cattura reale byte per byte.
- **Lunghezza del messaggio, MTU, frammentazione, block header** — sweep su `0x0201` con
  padding legittimo crescente (10 &rarr; 44 byte): risposta a *tutte* le lunghezze, sia con
  write singola sia con split a 20 byte, senza block header. L'ampli manda notifiche da
  39 byte, quindi l'MTU negoziato è ampio. Vedi `captures/`.

- **Codifica 7/8 bit in scrittura** — `0x0115` con `bits8 = 0x02` e `0x40` viene accettato
  e confermato con ack. La codifica funziona in entrambe le direzioni.

### Il byte 0x00 finale — differenza dello Spark 2

**I comandi sugli effetti richiedono un byte `0x00` in coda al payload logico.** Senza,
l'ampli risponde con un ack regolare (`0x04nn`) ma **non applica il comando**: il silenzio
non è rifiuto, è esecuzione mancata. Con il byte, il comando ha effetto.

Non è documentato da nessuna fonte: né nel protocollo di Hamshere né in paulhamsh/Spark,
entrambi scritti per lo Spark 40.

L'ampli lo mette sempre nei propri messaggi. Confronto su `bias.reverb`:

```
ampli 0x0315:  0b ab "bias.reverb" c3 00
nostro 0x0115: 0b ab "bias.reverb" c2 00     ← identico a meno di on/off
ampli 0x0337:  0b ab "bias.reverb" 00 ca 3f 5c 1f dc 00
```

`0x0138` (cambio preset) funziona **senza** il byte finale: non è quindi un requisito
universale del protocollo. Non è ancora chiaro cosa rappresenti — probabilmente un
argomento aggiuntivo che lo Spark 2 si aspetta sui comandi riferiti a un effetto.

### Ack

`0x04nn` con lo stesso sub-comando e sequence del comando ricevuto. Attenzione: **l'ack
conferma la ricezione, non l'esecuzione.** Vedi sopra.

### Formato preset (0x0301) — decodificato e verificato

Arriva su più chunk (16 per un preset tipico). Ogni chunk, dopo lo spacchettamento 7/8,
inizia con un sub-header di 3 byte: `[chunk totali, indice, byte utili]`. Concatenando i
`byte utili` di tutti i chunk in ordine di indice si ottiene il payload:

```
banco (int), numero (int), UUID (long string 36), nome, versione, descrizione,
icona, BPM (float), array[7] di effetti, due float ignoti, checksum
```

Ogni effetto: `nome (string), attivo (bool), array[n] di parametri`.
Ogni parametro: `indice (int), 0x91 costante, valore (float 0..1)`.

Il `0x91` fra indice e valore è invariante e di significato ignoto.

**I due float in coda ci sono solo sui preset salvati** (sul preset 0 valgono 9990.0 e
0.5): lo stato live finisce direttamente col checksum. `parsePreset` legge quanti float
trova e li conserva in `preset.tail`, così la ri-serializzazione resta fedele in entrambi
i casi. In scrittura non si mandano (`serializePreset` con `{omitTail: true}`), perché
`create_preset` non li scrive e l'ampli non li usa per lo stato live.

`serializePreset` è l'inverso esatto di `parsePreset`: un test verifica che ri-serializzare
il preset 0 riproduca il payload **byte per byte**. È questa la garanzia che la struttura
sia interpretata bene anche dove non ne conosciamo la semantica — se qualcuno cambia il
parser sbagliando, il round-trip si rompe subito.

### Scrittura di un preset (0x0101)

Multi-chunk, con lo stesso sub-header `[totali, indice, byte utili]` che l'ampli usa in
lettura. I chunk vanno mandati uno per volta aspettando l'ack — `0x0401` sugli intermedi,
`0x0501` sull'ultimo — perché il firmware blocca gli invii successivi finché non ha
confermato il precedente (`ok_to_send`, SparkIO.ino:1251). Un ack che non arriva **non è
motivo di fermarsi**: anche il firmware si sblocca da solo dopo mezzo secondo
(SparkIO.ino:139-142), e interrompersi lascerebbe il preset scritto a metà.

**Dimensione dei chunk: 25 byte di payload, non 128.** `SparkChunkOut` usa 128, ma è
pensato per un ESP32 che negozia un MTU ampio: 128 byte di payload diventano un messaggio
da 154 byte in una sola write BLE, e a quel punto lo Spark 2 **si disconnette** invece di
rispondere. 25 è la dimensione che l'ampli sceglie quando è lui a mandare un preset, e
produce messaggi da 39 byte, identici alle sue notifiche. Il massimo verificato
funzionante in scrittura è 44 byte.

Il checksum finale è la somma modulo 256 del payload **esclusi i primi due byte** e sé
stesso. Verificato su due catture: sul preset 0 (`bank 0, numero 0`) le due regole
coincidono, ma sullo stato live (`bank 1`) no — e l'ampli dichiara `0x4c`, che è la somma
senza i primi due byte. Includendoli verrebbe `0x4d`. La regola di `create_preset` è
quindi corretta anche sullo Spark 2.

**In scrittura si passa sempre dal preset software `0x7f`, e servono due comandi.**
`0x0101` verso `[0x00, 0x7f]` riempie un buffer; l'ampli conferma tutti i chunk ma
continua a suonare lo slot selezionato finché non gli si dice di passare a quel buffer.
Verificato sull'hardware l'11 agosto 2026.

```
far suonare un preset   → 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  → 0x0101 su [0x00, 0x7f], poi 0x0127 con [0x00, n]
```

`transport.loadPreset()` e `transport.storePreset()` fanno esattamente questo. Il secondo
comando **non è opzionale**: senza, il risultato è indistinguibile da un fallimento.

Scrivere `0x0101` direttamente su uno slot o su `[0x01, 0x00]` produce ack regolari e
nessun effetto: sono indirizzi validi in **lettura**, non in scrittura. In lettura infatti
`0x0201` con `[0x00, n]` legge lo slot n e con `[0x01, 0x00]` il suono attivo
(`Spark.slotTarget(n)` e `Spark.LIVE_TARGET`).

`loadPreset` non sovrascrive nessuno slot salvato: è il modo sicuro di provare un preset,
ed è l'azione principale offerta dalla UI.

**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot:
è il modo in cui segnala che il suono attivo non corrisponde a un preset salvato, lo
stesso che fa quando si modifica un suono dall'app ufficiale. Non è un malfunzionamento.
Per tornare a uno slot basta un `0x0138`. Per questo `storePreset` seleziona lo slot dopo
averlo salvato: altrimenti si salva il preset ma l'ampli continua a suonare il buffer.

**Tutti i chunk di un preset vanno con lo stesso sequence number.** È così che l'ampli
manda i propri preset, ed è per seq che si raggruppano i chunk in arrivo: se anche il suo
riassemblatore funziona così, incrementare il seq a ogni chunk — come fa
`ChunkOut::process` per lo Spark 40 — gli fa vedere N messaggi scollegati e incompleti,
che conferma tutti senza assemblarne nessuno. `writePreset` accetta
`{incrementSeq: true}` per tornare al comportamento dello Spark 40.

Il contatore di sequenza per i messaggi app→ampli resta comunque fra `0x01` e `0x3e`
(SparkIO.ino:1116-1119).

### Preset hardware

**Lo Spark 2 ha 8 slot, numerati 0–7**, tutti leggibili con `0x0201`. Il range 0–3 della
documentazione vale per lo Spark 40. Il `6` che l'ampli riportava come preset corrente era
semplicemente lo slot 6, non un'anomalia.

Il pannello però ha **4 LED bicolore, non 8**: rosso per il banco A (slot 0–3), verde per
il banco B (slot 4–7). Lo slot 5 si accende come secondo LED verde. `Spark.slotLabel(n)`
fa la conversione e la UI mostra `A1`…`B4`, così i numeri dell'app coincidono con quello
che si vede sull'ampli.

Cade quindi il sospetto che il preset attivato non corrispondesse al numero inviato:
corrispondeva sempre, era la lettura del pannello a essere diversa.

### Aperto

- `0x022a` (leggi checksum preset) non risponde mai, con o senza fixarray `0x94`:
  probabilmente non esiste sullo Spark 2.
- `0x031a`, non documentato, emesso durante il movimento delle manopole: decodifica come
  `array[1] 0 <preset corrente> true`.
- Nella libreria `slot` è un campo singolo, ma lo stesso preset può stare in più slot da
  quando si possono copiare: `importFromAmp` riconosce per UUID e l'ultimo slot letto
  sovrascrive il precedente. I dati dell'utente non si perdono, ma lo slot mostrato
  diventa inaffidabile. Andrebbe trasformato in una lista.

`writeWithoutResponse` è l'unica modalità supportata da 0xFFC1, quindi ogni scrittura
sembra riuscire lato browser anche quando l'ampli la scarta. **L'assenza di errori non
è una verifica.** L'unica prova valida è l'effetto udibile/visibile sull'ampli o una
risposta in RX.

## Protocollo — fatti verificati

GATT: service `0xFFC0`, write `0xFFC1` (writeWithoutResponse only), notify `0xFFC2`.
Le notifiche arrivano frammentate: riassemblare cercando `F0` … `F7`.

Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`

- checksum = XOR 8 bit dei soli byte dati impacchettati (bits8 inclusi), escluso header e `F7`
- codifica 7/8 bit: ogni 7 byte reali preceduti da un byte `bits8` con gli MSB, **LSB-first**
- valori parametro = float32 **big endian** con prefisso `0xCA`, range 0.0–1.0

Encoder e decoder in `tools/explorer.html` sono validati: riproducono il payload di una
cattura reale dell'ampli byte per byte, checksum compreso. Se una scrittura fallisce,
**non cercare il bug lì**.

Dettaglio completo di comandi, tipi dati, nomi effetti e catture: `docs/HANDOFF-2026-08-10.md`.

## Differenze rilevate rispetto a paulhamsh/Spark (BLE funzionante)

Confronto con `reference/paulhamsh/SparkESP32_SparkIO.ino`:

- `BlockOut::process()` (riga 1202) prepone **sempre** il block header di 16 byte, anche su
  BLE, con `out_block[6]` = lunghezza totale del blocco
- `sp_write()` fa **una sola** `writeValue(buf, len, false)` per blocco intero (fino a 173
  byte) — nessuno split manuale a 20 byte
- `change_hardware_preset(curr_preset, preset_num)` (riga 910): nonostante il nome, il primo
  parametro **non** è il preset corrente. Ogni chiamata reale passa `0` letterale
  (`Spark.ino:319, 333`). Passare il preset corrente rilevato rompe il comando.
- `oc_seq` parte da `0x01` ed è un contatore indipendente, non sincronizzato col seq dell'ampli

La batteria diagnostica in `explorer.html` copre queste varianti.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate, ed evitano di ripercorrere strade già chiuse.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI.
- `tools/explorer.html` resta **single-file** senza build step: va copiato tal quale sul
  telefono per i test.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.
