# Protocollo Spark 2 — il dettaglio e come ci siamo arrivati

Spostato qui da `CLAUDE.md` il 14 agosto 2026. In `CLAUDE.md` restano le trappole che
non vanno dimenticate mai; **qui c'è il perché**, con le misure che le hanno stabilite.
Il dettaglio di comandi, tipi dati e catture originali sta in `HANDOFF-2026-08-10.md`.

## Fatti verificati sul filo

GATT: service `0xFFC0`, write `0xFFC1` (writeWithoutResponse only), notify `0xFFC2`.
Le notifiche arrivano frammentate: riassemblare cercando `F0` … `F7`.

Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`

- checksum = XOR 8 bit dei soli byte dati impacchettati (bits8 inclusi), escluso header
  e `F7`
- codifica 7/8 bit: ogni 7 byte reali preceduti da un byte `bits8` con gli MSB,
  **LSB-first**
- valori parametro = float32 **big endian** con prefisso `0xCA`, range 0.0–1.0

Encoder e decoder sono validati: riproducono il payload di una cattura reale dell'ampli
byte per byte, checksum compreso. Se una scrittura fallisce, **non cercare il bug lì**.

`f0` e `f7` non possono comparire dentro un messaggio, perché i byte dati sono
impacchettati a 7 bit e stanno sotto `0x80`, `bits8` ne usa sette e il checksum è uno
XOR di quelli. È ciò che rende sicuro far ricominciare il riassemblatore da ogni `f0`.

## Il byte `0x00` finale — differenza dello Spark 2

**I comandi sugli effetti richiedono un byte `0x00` in coda al payload logico.** Senza,
l'ampli risponde con un ack regolare (`0x04nn`) ma **non applica il comando**: il
silenzio non è rifiuto, è esecuzione mancata.

Non è documentato da nessuna fonte: né nel protocollo di Hamshere né in paulhamsh/Spark,
entrambi scritti per lo Spark 40.

L'ampli lo mette sempre nei propri messaggi. Confronto su `bias.reverb`:

```
ampli 0x0315:  0b ab "bias.reverb" c3 00
nostro 0x0115: 0b ab "bias.reverb" c2 00     <- identico a meno di on/off
ampli 0x0337:  0b ab "bias.reverb" 00 ca 3f 5c 1f dc 00
```

`0x0138` (cambio preset), `0x0175` (looper) e `0x0176` (impostazioni del looper)
funzionano **senza** il byte finale: non è quindi un requisito universale. Probabilmente è
un argomento aggiuntivo che lo Spark 2 si aspetta sui comandi riferiti a un effetto.

**Su `0x0176` il byte di troppo non è innocuo, ed è la prova che il silenzio non è l'unico
modo di sbagliare** (28 agosto 2026). Mandate le impostazioni **con** il byte in coda: il
bpm non cambia *e* il delay parte in **ripetizione infinita** — l'ampli ha letto i campi
spostati e ne ha ricavato un tempo di delay fuori scala. Si recupera premendo un tasto
preset sul pannello, che ricarica tutti i parametri degli effetti. Tolto il byte, la stessa
scrittura funziona. Da qui due cose da ricordare:

- **un payload malformato può muovere qualcosa che non c'entra**, non solo essere ignorato.
  Vale per ogni comando nuovo: si prova con l'ampli su un preset che non dispiace perdere.
- **la spunta «byte `0x00` finale» delle sonde va guardata prima di ogni prova.** Nel banco
  del tempo di `tools/looper-probe.html` adesso è scavalcata: si manda esattamente il
  payload di Ignitron, così una variante alla volta resta una variante alla volta.

## Il tempo (bpm) si scrive, e con lui vanno gli effetti

**`0x0176` scrive il bpm**, verificato sull'ampli il 28 agosto 2026. È il comando delle
impostazioni del looper — quello che usa Ignitron in `updateLooperSettings` — e i campi
sono `<bpm> <count> <battute> <freeIndicator> <click> <flag3> <durata>`, col prefisso
`0xcc` sopra i 127 esattamente come in lettura.

**Il payload si costruisce dall'ultimo `0x0376` che l'ampli ha mandato, cambiando il solo
bpm.** Non da una costante: l'ultimo campo cambia forma da una sessione all'altra — visto
`cd ea 60` (uint16 60000) il 13 agosto e `3c` (60) il 28 — quindi l'unica versione sicura è
ridargli le sue.

Perché conta oltre il looper: premendo TAP l'ampli manda **tre** messaggi insieme —
`0x0363` (bpm), `0x0376` (impostazioni) e `0x0337` sul parametro 4 di `DelayRe201`. Cioè
**il tempo è già accoppiato agli effetti dentro l'ampli**, e non tocca a noi mappare
bpm → posizione della manopola.

## Ack

`0x04nn` con lo stesso sub-comando e sequence del comando ricevuto. **L'ack conferma la
ricezione, non l'esecuzione.**

`writeWithoutResponse` è l'unica modalità supportata da `0xFFC1`, quindi ogni scrittura
sembra riuscire lato browser anche quando l'ampli la scarta. **L'assenza di errori non è
una verifica.** L'unica prova valida è l'effetto udibile/visibile sull'ampli o una
risposta in RX.

Per la stessa ragione esiste `Spark.controllaPreset`: prima di mandare un preset
controlla che sia serializzabile — valori non numerici, campi di testo che testo non
sono, array oltre i 15 di un fixarray, indici fuori scala. Un payload malformato viene
confermato chunk per chunk e poi ignorato, e il sintomo è indistinguibile da una
connessione rotta.

## Formato preset (0x0301) — decodificato e verificato

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

`serializePreset` è l'inverso esatto di `parsePreset`: un test verifica che
ri-serializzare il preset 0 riproduca il payload **byte per byte**. È questa la garanzia
che la struttura sia interpretata bene anche dove non ne conosciamo la semantica — se
qualcuno cambia il parser sbagliando, il round-trip si rompe subito.

## Scrittura di un preset (0x0101)

Multi-chunk, con lo stesso sub-header `[totali, indice, byte utili]` che l'ampli usa in
lettura. I chunk vanno mandati uno per volta aspettando l'ack — `0x0401` sugli
intermedi, `0x0501` sull'ultimo — perché il firmware blocca gli invii successivi finché
non ha confermato il precedente (`ok_to_send`, SparkIO.ino:1251). Un ack che non arriva
**non è motivo di fermarsi**: anche il firmware si sblocca da solo dopo mezzo secondo
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
senza i primi due byte. Includendoli verrebbe `0x4d`.

**Tutti i chunk di un preset vanno con lo stesso sequence number.** È così che l'ampli
manda i propri preset, ed è per seq che si raggruppano i chunk in arrivo: se anche il suo
riassemblatore funziona così, incrementare il seq a ogni chunk — come fa
`ChunkOut::process` per lo Spark 40 — gli fa vedere N messaggi scollegati e incompleti,
che conferma tutti senza assemblarne nessuno. `writePreset` accetta
`{incrementSeq: true}` per tornare al comportamento dello Spark 40.

Il contatore di sequenza per i messaggi app→ampli resta fra `0x01` e `0x3e`
(SparkIO.ino:1116-1119).

### Le due strade, e perché sono diverse

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

**Questo è costato mezza giornata.** Far suonare un preset passa dal buffer software
`0x7f`; salvarlo in uno slot **non ci passa affatto**: si indirizza lo slot direttamente
nei primi due byte del payload, e poi si cambia preset e si torna indietro. Entrambe
verificate sull'ampli, la seconda il 12 agosto 2026.

Il giro via e ritorno non è decorazione: senza, lo slot continua a riportare il contenuto
vecchio. Sta scritto così anche nel riferimento (`Spark.ino:113-124`), dove
`create_preset` indirizza `[0x00, preset_num]` (`SparkIO.ino:1025-1026`) ed è seguito da
`delay(100)` e **due** `change_hardware_preset`. `storePreset` fa esattamente questo, con
300 ms fra un passo e l'altro.

Scrivere su `[0x01, 0x00]` resta senza effetto: è un indirizzo valido in lettura, non in
scrittura. In lettura `0x0201` con `[0x00, n]` legge lo slot n e con `[0x01, 0x00]` il
suono attivo (`Spark.slotTarget(n)` e `Spark.LIVE_TARGET`).

`loadPreset` non sovrascrive nessuno slot salvato: è il modo sicuro di provare un preset.

**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot:
è il modo in cui segnala che il suono attivo non corrisponde a un preset salvato, lo
stesso che fa quando si modifica un suono dall'app ufficiale. Non è un malfunzionamento.
Per questo `storePreset` seleziona lo slot dopo averlo salvato: altrimenti si salva il
preset ma l'ampli continua a suonare il buffer.

### `0x0127` non funziona sullo Spark 2

Provate sull'ampli tutte e quattro le forme — `[0x00, n]`, `[0x7f, n]`, `[0x00, n, 0x00]`,
`[0x7f, n, 0x00]` — ack regolare per ognuna e slot invariato. È lo stesso modo di fallire
dei comandi sugli effetti prima di scoprire il byte `0x00` finale, ma qui nessun byte
finale lo salva. L'annotazione dell'11 agosto che dava `storePreset` per verificato era
sbagliata; il comando è stato tolto dal codice.

Come ci siamo arrivati, perché il metodo conta più della conclusione: prima si è isolato
che il **trasferimento** funzionava (l'ampli suonava il preset nuovo dal buffer) e che
mancava solo il salvataggio; poi si è provata una forma alla volta **verificando ognuna
con una rilettura dello slot**, perché l'ack non dice niente.

## Preset hardware

**Lo Spark 2 ha 8 slot, numerati 0–7**, tutti leggibili con `0x0201`. Il range 0–3 della
documentazione vale per lo Spark 40. Il `6` che l'ampli riportava come preset corrente
era semplicemente lo slot 6, non un'anomalia.

Il pannello però ha **4 LED bicolore, non 8**: rosso per il banco A (slot 0–3), verde per
il banco B (slot 4–7). Lo slot 5 si accende come secondo LED verde. `Spark.slotLabel(n)`
fa la conversione e la UI mostra `A1`…`B4`.

Cade quindi il sospetto che il preset attivato non corrispondesse al numero inviato:
corrispondeva sempre, era la lettura del pannello a essere diversa.

## Ipotesi escluse da misure dirette

- **License key** — `0x0138` funziona senza averla mai inviata. (Attenzione: vale per
  `0x0138`, non per tutto. Vedi `looper.md`.)
- **Ordine dei bit nella codifica 7/8** — la maschera parte da `0x80`, va a `1` e
  raddoppia (`SparkIO.ino:1069-1083`), LSB-first come la nostra; e il nostro packer
  riproduce una cattura reale byte per byte.
- **Lunghezza del messaggio, MTU, frammentazione, block header** — sweep su `0x0201` con
  padding legittimo crescente (10 → 44 byte): risposta a *tutte* le lunghezze, sia con
  write singola sia con split a 20 byte, senza block header. L'ampli manda notifiche da
  39 byte, quindi l'MTU negoziato è ampio.
- **Codifica 7/8 bit in scrittura** — `0x0115` con `bits8 = 0x02` e `0x40` viene accettato
  e confermato con ack. La codifica funziona in entrambe le direzioni.
- **Il buffer software non c'entra col cambio modello** — mandato un preset nel buffer
  `0x7f` come fa «Regola» e riprovata la variante A: il modello cambia lo stesso.
  `0x0106` funziona in tutti e due gli stati.

## Aperto

- `0x022a` (leggi checksum preset) non risponde mai, con o senza fixarray `0x94`:
  probabilmente non esiste sullo Spark 2.
- `0x031a`, non documentato, emesso durante il movimento delle manopole: decodifica come
  `array[1] 0 <preset corrente> true`.

## Cambiare il modello di un blocco (0x0106) — le dieci varianti

`tools/model-probe.html` ha provato dieci varianti sull'ampli vero, ognuna verificata
rileggendo la catena:

| variante | forma | esito |
|---|---|---|
| **A** | prefissate + `0x00` finale — quella che l'app manda già | **funziona** |
| B | senza byte finale, come lo Spark 40 | nessun effetto |
| C | due `0x00` in coda | funziona |
| D, E | stringhe corte `0xa0+len` senza il byte di lunghezza | nessun effetto |
| F, G | posizione della catena in testa o in coda | nessun effetto |
| H | solo il nome nuovo | nessun effetto |
| I | A, poi `0x0115` che riaccende | funziona |
| J | nomi invertiti | nessun effetto |

Quindi: **anche `0x0106` vuole il byte `0x00` finale**; **le stringhe devono essere quelle
prefissate** `[len, 0xa0+len, …]`; e **il primo nome è il modello che c'è adesso**, il
secondo quello nuovo — l'ordine del riferimento (`Spark.ino:157`), non l'inverso.

**Il difetto nell'app era un altro, e la lezione vale in generale.** Il comando partiva
con **il nome vecchio sbagliato**. `0x0106` dice «al posto di questo mettimi quello»: se
il primo nome non è davvero nella catena, l'ampli ignora tutto senza fiatare. L'editor lo
prendeva da quello che aveva sullo schermo, e lo schermo può essere rimasto indietro —
una rilettura andata a vuoto, il suono cambiato dall'app ufficiale, una manopola girata
sull'ampli. **Bastava una volta sola e da lì in poi ogni cambio falliva, sempre.**
Adesso il nome vecchio si rilegge dall'ampli anche prima di mandare il comando
(`aggiornaCatenaDallAmpli`), e se quella lettura non riesce non si manda niente.

Verificato nell'app sull'hardware il 13 agosto 2026: tre cambi di fila
(`MaestroBassmaster → JH.SupaFuzz → JH.Octavia → DistortionTS9`), ognuno confermato
rileggendo la catena, con una sola lettura per cambio.

## Quando l'ampli «smette di rispondere»

Il 13 agosto 2026: due cambi di modello riusciti, poi ogni lettura `0x0201` tornava
*nessuna risposta completa, 0 chunk*, per sempre, fino a riconnettere.

`MessageAssembler.feed` aveva due modi di impiantarsi, tutti e due con lo stesso sintomo:

- `this.buffer = []` stava **dopo** `onMessage(...)`: se un ascoltatore sollevava
  un'eccezione, il buffer restava lì con dentro un messaggio già consegnato e ogni byte
  successivo ci si accodava.
- un frammento BLE perso lasciava un messaggio mozzo che si fondeva col successivo.

Adesso il buffer si svuota **prima** di consegnare, e un `f0` ricomincia sempre da capo.
Due test lo verificano — un ascoltatore che esplode, e un troncone seguito da un messaggio
intero. Il riassemblatore è coperto sul serio: un preset intero, sedici messaggi di fila,
spezzato a frammenti da 1, 7, 20, 39 e 100 byte. Con un solo messaggio corto — l'unica
prova che c'era prima — un riassemblatore sbagliato passa lo stesso.

**Non era quella la causa di quella sera.** Il numero nuovo l'ha detto subito: alla prova
dopo, `0 chunk buoni, 0 messaggi arrivati in tutto` — **l'ampli si era bloccato davvero,
ed è servito staccare la corrente**. `_readPresetVia` riporta sempre quanti messaggi sono
arrivati durante l'attesa (`rxTotali`): 0 vuol dire ampli muto o connessione morta, più
di 0 vuol dire che parla e siamo noi a scartare. Senza quel numero i due casi si vedono
uguali e portano in direzioni opposte — è costato una serata.

**Cosa abbia bloccato l'ampli non lo sappiamo**, ma si è ridotto quello che gli si butta
addosso. Il cambio di modello era arrivato a **due letture per cambio**: la catena si
rilegge ora solo se non ci si fida più di quella che si ha (`inModifica.attendibile`), e
l'attesa dopo `0x0106` è passata da 500 ms a un secondo. Ricostruire un blocco DSP è il
comando più pesante che gli mandiamo, e la lettura che segue — sedici messaggi — è la
risposta più impegnativa: farle a raffica è stata l'unica cosa nuova di quella sessione.

## Parametri che manopole non sono

**Il numero di parametri di un effetto cambia da preset a preset.** Nelle otto catture di
`captures/2026-08-10-libreria-8-preset.json` il noise gate ha due parametri su tre preset
e **tre** sugli altri cinque; il riverbero sette e otto, negli stessi cinque. Il parametro
in più è sempre l'ultimo e vale **esattamente 1**, in tutti e dieci i casi.

**Sappiamo cos'è: l'acceso/spento del blocco.** Misurato sull'ampli il 13 agosto 2026 sul
noise gate e sul riverbero, identico tutte e due le volte:

- da 0.00 a 0.49 il gate non lavora, da 0.50 a 1.00 sì — soglia a metà;
- il valore però **non viene arrotondato**: scritto 0.50, riletto 0.50. È un float
  memorizzato tale e quale e letto come booleano, non un booleano;
- spegnendo il blocco con `0x0115` **l'ampli ci scrive 0 da solo**: è lo stesso
  interruttore visto da un'altra parte;
- e **nell'app ufficiale quel parametro non compare**, perché lì c'è già l'interruttore.

**Come si è arrivati alla misura è il pezzo riutilizzabile:** «a zero il gate non gatta»
non distingue un interruttore da una manopola di profondità — a zero tacciono tutti e due.
Il modo di distinguerli è **scrivere un valore di mezzo e guardare cosa ci ridà l'ampli**:
se l'avesse arrotondato sarebbe un interruttore. Da lì è nato il pulsante «Rileggi
dall'ampli» nell'editor, che serve a ogni misura di questo tipo.

Cade con questo l'ipotesi del firmware vecchio contro nuovo: il parametro in più non è un
residuo, è **lo stato dell'interruttore scritto anche dentro l'array dei parametri**. Il
perché di preset che ce l'hanno e preset che no resta aperto, ma adesso è una domanda su
come sono nati quei preset, non su cosa sia quel valore.

## Il tipo di riverbero è il settimo parametro

Non è un modello: nell'elenco dei modelli il riverbero è uno solo, `bias.reverb`.
**L'ampli ha un solo effetto riverbero per tutti i tipi** (HANDOFF §3.10), quindi il tipo
per forza è un parametro. Che sia il settimo lo dicono i valori: negli otto preset letti
dall'ampli vale 0, 0.1, 0.2 o 0.3, sempre un multiplo esatto di un decimo, e nessun'altra
manopola di nessun altro effetto si comporta così. I tipi sono nove, quanti sono i
`bias.reverb.N` di Soundshed.

**Verificato sull'ampli il 13 agosto 2026**: cambiando posizione nell'elenco il riverbero
cambia davvero.

**I nove nomi li ha dettati l'utente**, letti dall'app ufficiale: Room Studio A, Chamber,
Hall Natural, Plate Short, Hall Ambient, Plate Rich, Hall Medium, Plate Long, Room
Studio B. **L'ordine però non è confermato.** Che l'elenco dell'app segua i valori del
parametro è verosimile e niente lo contraddice, ma nessuno l'ha verificato. Se un giorno
si scoprisse sfasato, basta ascoltare due tipi lontani fra loro (un Plate e un Room) e la
correzione è una rotazione dell'elenco, non una caccia.

Il parametro 0 del riverbero è confermato da un'altra strada: girando la manopola fisica
l'ampli manda `bias.reverb` parametro 0 (HANDOFF §3.6).

## Differenze rilevate rispetto a paulhamsh/Spark (BLE funzionante)

Confronto con `reference/paulhamsh/SparkESP32_SparkIO.ino`:

- `BlockOut::process()` (riga 1202) prepone **sempre** il block header di 16 byte, anche
  su BLE, con `out_block[6]` = lunghezza totale del blocco
- `sp_write()` fa **una sola** `writeValue(buf, len, false)` per blocco intero (fino a
  173 byte) — nessuno split manuale a 20 byte
- `change_hardware_preset(curr_preset, preset_num)` (riga 910): nonostante il nome, il
  primo parametro **non** è il preset corrente. Ogni chiamata reale passa `0` letterale
  (`Spark.ino:319, 333`). Passare il preset corrente rilevato rompe il comando.
- `oc_seq` parte da `0x01` ed è un contatore indipendente, non sincronizzato col seq
  dell'ampli

## Estratto da CLAUDE.md, 2 settembre 2026 — protocollo, versione lunga

## Protocollo — quello che non va dimenticato mai

Dettaglio, derivazioni e misure: `docs/protocollo-spark2.md`.

GATT: service `0xFFC0`, write `0xFFC1` (**writeWithoutResponse only**), notify `0xFFC2`.
Notifiche frammentate: riassemblare cercando `F0` … `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`.

Stato: **completo e verificato sull'ampli**. `0x0201` lettura, `0x0138` cambio preset,
`0x0115` effetto on/off, `0x0104` cambio parametro, `0x0101` invio di un preset intero.

**Le trappole, tutte verificate sull'hardware:**

- **`0x0115`, `0x0104` e `0x0106` vogliono un byte `0x00` in coda al payload logico.**
  Senza, ack regolare e comando non applicato. `0x0138`, `0x0175` e `0x0176` no — e su
  `0x0176` il byte di troppo **non è innocuo**: il bpm non cambia e **il delay parte in
  ripetizione infinita** (28 agosto 2026), perché l'ampli legge i campi spostati. Si
  recupera premendo un tasto preset sul pannello. Quindi **un payload malformato può
  muovere qualcosa che non c'entra**, non solo essere ignorato.
- **Il bpm si scrive con `0x0176`, e gli effetti a tempo seguono da soli** (verificato il
  28 agosto 2026). Il payload si costruisce **dall'ultimo `0x0376` ricevuto** cambiando il
  solo bpm, mai da una costante: l'ultimo campo cambia forma fra sessioni (`3c` contro
  `cd ea 60`). Il TAP dell'ampli manda insieme `0x0363`, `0x0376` e `0x0337` sul parametro
  4 di `DelayRe201`: l'accoppiamento tempo→effetti è dentro l'ampli, non tocca a noi.
  Dettaglio in `docs/protocollo-spark2.md`.
- **L'ack conferma la ricezione, non l'esecuzione.** E `writeWithoutResponse` fa sembrare
  riuscita ogni scrittura lato browser. **L'assenza di errori non è una verifica**: vale
  solo l'effetto sull'ampli o una risposta in RX.
- **Chunk da 25 byte di payload, non 128.** Con 128 lo Spark 2 **si disconnette**. Il
  massimo verificato in scrittura è 44.
- **Tutti i chunk di un preset vanno con lo stesso sequence number.**
- **`0x0127` non salva sullo Spark 2**, in tutte e quattro le forme provate. Tolto.
- **Le write BLE lunghe vanno spezzate**: l'app ufficiale manda ogni messaggio in write ATT
  da 20 byte e l'ampli riassembla da sé. `transport.sendSpezzato(comando, 20)`. Sopra i ~44
  byte una write singola sparisce **in silenzio**, senza nemmeno l'ack.
- **Cambiare un parametro di un effetto spento non produce nessun suono.** Verifica prima
  che l'effetto sia attivo.
- **`0x0106` vuole il nome del modello che c'è *adesso***, riletto dall'ampli, non quello
  che ha sullo schermo. Se sbagliato, l'ampli ignora tutto senza fiatare — e da lì in poi
  ogni cambio fallisce per sempre.
- **L'ampli si può piantare davvero**, e allora serve staccare la corrente. `rxTotali`
  distingue i due casi: 0 messaggi = ampli muto o connessione morta; più di 0 = parla e
  siamo noi a scartare. Senza quel numero i due casi si vedono uguali — è costato una
  serata.
- **Gli effetti Hendrix (`JH.*`) non suonano finché l'app ufficiale non li sblocca**, e
  non c'è niente che possiamo farci. Osservato dall'utente il 26 agosto 2026: i `JH.*`
  mandati dalla nostra app restano muti — «Hey Jimi Solo» suona senza fuzz e con l'ampli
  sbagliato, anche scritto in uno slot — e **nemmeno il pannello dell'ampli li sblocca**
  (ci ha creduto per un momento e si è ricreduto). Basta invece **connettere l'app
  ufficiale**: da lì in poi funziona tutto, e **lo sblocco resta nell'ampli anche dopo
  che l'app ufficiale si è disconnessa**. Il pacchetto lui ce l'ha comprato.
  È l'unico contenuto a pagamento dello Spark 2, e chi lo abilita è la **license key
  `0x0170`** che l'app ufficiale manda appena connessa. **Non è forgiabile**: spacchettata
  dalle due catture in `captures/2026-08-14-app-ufficiale-looper.txt` sono **64 byte tondi,
  completamente diversi fra le due sessioni**, cioè una firma con dentro un nonce — e
  rigiocata l'ampli la rifiuta (`0x0470` con `fe` invece di `00 00`, vedi `docs/looper.md`).
  Cavare la chiave dall'app ufficiale è protezione di contenuto a pagamento e non si fa.
  Sull'app ufficiale i suoni Hendrix si vedono **solo dopo il login**, ma **fare il login
  dalla nostra app non servirebbe a niente, ed è misurato**: nella cattura l'app manda la
  chiave **14 ms dopo** la risposta dell'ampli a `0x022f` — due volte, a 0,060s e a
  589,246s — e in 14 ms non ci sta un giro in rete. E se fosse un gettone preso dal server
  al login le due connessioni manderebbero lo stesso; invece sono diversi. **L'app la firma
  in locale, con una chiave che si porta dentro.** Ne segue che **l'ampli non verifica
  l'acquisto: verifica una firma** — non ha account e non parla con internet. Il login
  serve all'app ufficiale per *mostrare* i suoni, non all'ampli per abilitarli.
  **La cosa da ricordare è che non è un difetto nostro**, così non ci si torna sopra.
  E ne resta una lezione che vale oltre gli Hendrix: **la catena riletta conferma il nome
  del modello, non che quel blocco suoni** — è quello che aveva «verificato» il cambio a
  `JH.SupaFuzz` il 13 agosto, mentre il fuzz era muto.

**Le due strade per scrivere un preset sono diverse**, e questo è costato mezza giornata:

```
far suonare un preset   -> 0x0101 su [0x00, 0x7f], poi 0x0138 con 0x7f
salvarlo in uno slot n  -> 0x0101 su [0x00, n], poi 0x0138 su un altro slot e 0x0138 su n
```

Il giro via e ritorno non è decorazione: senza, lo slot riporta il contenuto vecchio.
`loadPreset` non sovrascrive nessuno slot: è il modo sicuro di provare un preset.
**Mentre l'ampli suona il preset software il LED lampeggia** e non indica nessuno slot — non
è un malfunzionamento.

**Lo Spark 2 ha 8 slot, 0–7** (il 0–3 della documentazione vale per lo Spark 40), ma il
pannello ha **4 LED bicolore**: rosso banco A (0–3), verde banco B (4–7).
`Spark.slotLabel(n)` fa la conversione e la UI mostra A1…B4.

**Nessuna autenticazione è richiesta, e dal 28 agosto 2026 è misurato e non supposto**: la
license key `0x0170` **abilita il contenuto a pagamento, non i comandi**. Con l'ampli
sbloccato davvero — l'app ufficiale connessa prima, senza staccare la corrente — il
conteggio del looper resta ignorato identico a quando la chiave non c'era. Gli Hendrix la
vogliono, il protocollo no. Vedi `docs/looper.md`.

**Looper**, in due righe: si comanda con `0x0175` e un byte (`04` rec, `05` stop rec, `08`
play, `09` stop, `0b` dub, `0c` stop dub, `0a` delete); si legge posizione (`0x0377`), bpm
(`0x0363`) e impostazioni (`0x0376`). **La battuta di conteggio col click non si comanda, e
non è più un'ipotesi aperta**: `02` riceve l'ack e viene buttato via, e il 28 agosto 2026 è
caduta anche l'ultima spiegazione rimasta sui byte (la chiave). **Ma non è chiuso**, e la
ragione è quella che ha detto l'utente: se l'app lo fa partire, un modo c'è. Quello che è
finito è l'elenco delle ipotesi sui *byte*; **il canale non era mai stato guardato** —
`leggi-btsnoop.ps1` concatenava tutte le write buttando via **handle e opcode ATT**, quindi
«byte identici a quelli dell'app» era verificato e «sullo stesso canale» no. Metà è già
chiuso: **`0xFFC1` dichiara solo `writeWithoutResponse`**, e la **mappa GATT presa con nRF
Connect** dice che è **l'unica cosa scrivibile dell'intero dispositivo** (28 agosto 2026,
tutta in `docs/looper.md`). L'app non aveva un'altra strada: stesso canale, stesso opcode,
stessi byte. E **il paradosso è reale**, misurato il 28 agosto 2026: REC premuto nell'app
ufficiale, mani lontane dal pannello, **conta** — quindi non era un dito sull'ampli.
**Allora la differenza è in chi manda, non in cosa manda.** Il **bonding** è escluso per
costruzione: la sonda fatta girare **sullo stesso telefono** che con l'app ufficiale fa
contare l'ampli fallisce lo stesso. Resta **la sessione autorizzata**, ed è la conclusione:
lo sblocco dei suoni resta nell'ampli, ma un flag «questo client ha mandato una chiave
valida» è per connessione, e in nessuna prova ne abbiamo mai avuta una. **Quindi il modo
c'è ed è la chiave `0x0170`, e non è una porta che apriamo** — sarebbe estrarre una chiave
di firma dall'app ufficiale. La tabella di tutto ciò che è stato eliminato sta in
`docs/looper.md`, «Come si conclude». **Non aggiungere sonde sui byte.** L'unica cosa che
resterebbe da fare è **chiedere a Ignitron**, che manda COUNTIN senza nessuna chiave: se a
loro funziona, la conclusione cade.

### Regole di metodo, che valgono oltre il looper

- **Una cattura d'ascolto dice cosa l'ampli racconta, non cosa accetta.** I nomi degli enum
  di terzi descrivono lo *stato in cui l'ampli è entrato*, non un tasto da premere: che il
  pannello notifichi `02` non vuol dire che `02` si possa mandare. Le due direzioni vanno
  misurate separatamente.
- **Si registra prima e si interpreta dopo, mai il contrario.** Una sonda che chiede di
  dichiarare in anticipo cosa si sta per fare produce log che mentono appena l'ampli fa
  altro.
- **I dati finti non devono finire in una cattura.** Sono marcati `demo`, non contano negli
  RX totali e l'esportazione li scarta.
- Ogni prova va verificata **rileggendo dall'ampli**, una variante alla volta.
- **Strumentare prima di ipotizzare.** I contatori — fronti grezzi contro pressioni
  accettate — hanno chiuso in una sessione un problema su cui si era tirato a indovinare per
  due.

