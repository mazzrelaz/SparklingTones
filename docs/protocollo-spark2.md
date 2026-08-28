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
