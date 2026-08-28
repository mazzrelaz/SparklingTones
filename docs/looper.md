# Il looper dello Spark 2 — indagine archiviata il 14 agosto 2026, richiusa il 28

Spostato qui da `CLAUDE.md` il 14 agosto 2026: è un capitolo chiuso, e teneva
seimila token di memoria di lavoro occupati a ogni sessione. In `CLAUDE.md` restano
solo le conclusioni operative. **Qui c'è il viaggio**, e serve solo a chi riapre il
capitolo — per non ripercorrere sette strade già chiuse.

## Stato: il looper si comanda, manca solo il conteggio col click

Funzionano `04` rec, `05` stop rec, `08` play, `09` stop, `0b` dub, `0c` stop dub,
`0a` delete, e si legge la posizione nel loop (`0x0377`), il bpm (`0x0363`) e le
impostazioni (`0x0376`).

**Sul conteggio siamo arrivati al fondo, e adesso anche oltre la chiave.**
Escluso per misura, tutto: il valore del byte (sedici provati), il byte `0x00` finale,
le impostazioni scritte prima, la coppia `02`+`04` in due distanze, le interrogazioni
prima, l'intera sequenza di avvio dell'app rigiocata con e senza chiave, e
l'intestazione di blocco. Ogni messaggio rigiocato riceve dall'ampli la **stessa
identica risposta** che riceve l'app: la riproduzione è fedele, il comando è byte per
byte lo stesso, e non funziona.

**E il 28 agosto 2026 è caduta anche l'ultima**, che era la license key: misurata, non
più supposta. Il come sta in fondo, in «L'ultima ipotesi è caduta». Il riassunto: con
l'ampli **sbloccato davvero** — non con la chiave rigiocata — `02` riceve l'ack e non
fa niente esattamente come prima. **La chiave abilita il contenuto a pagamento, non i
comandi.**

**Quindi non si riprende da nessuna parte**: le ipotesi sono finite. Non vuol dire che
il fenomeno sia spiegato — l'app ufficiale manda quei byte e l'ampli conta — vuol dire
che **tutto ciò che sapevamo distinguere fra noi e lei è stato reso uguale e misurato**.
Riaprire ha senso solo con un fatto nuovo che oggi non abbiamo: un altro snoop log, un
firmware diverso, un'altra sorgente. Gli attrezzi restano pronti —
`tools/looper-probe.html` con ventinove pulsanti e `tools/leggi-btsnoop.ps1` per
leggere altri snoop log.

**Non è una perdita grave, ed è importante non ricordarselo peggio di com'è.** Dal
pedale funziona tutto il resto: registrare, chiudere, suonare, sovraincidere,
annullare, cancellare, e sapere a che punto sta il loop. Manca la **battuta di
conteggio col click**, che il pedale può farsi da sé — il bpm glielo dicono `0x0363` e
`0x0376`, e un pedale con un led o un buzzer conta da solo. Il suono del click
dell'ampli no, quello resta suo.

## I comandi, da Ignitron

**I comandi del looper sono noti da codice sorgente, non da misura nostra.** Trovato
il 13 agosto 2026: **Ignitron** (`stangreg/Ignitron`) è un pedale ESP32 open source che
comanda il looper interno dello Spark 2. Da `SparkMessage.cpp` e
`Config_Definitions.h`:

| comando | forma | cosa fa |
|---|---|---|
| `0x0175` | un byte di payload | **il comando del looper** (valori qui sotto) |
| `0x0176` | bpm, count, bars, tre flag, durata a 16 bit | cambia le impostazioni |
| `0x0275` | vuoto | stato della registrazione |
| `0x0276` | vuoto | configurazione |
| `0x0278` | vuoto | stato del looper |

Il byte di `0x0175`: `02` countin, `04` rec, `05` stop rec, `06` retry, `07` rec
complete, `08` play, `09` stop, `0a` delete, `0b` dub, `0c` stop dub, `0d` undo,
`0e` redo. Sotto `0x80` la codifica msgpack di un intero positivo è il byte stesso,
quindi non c'è ambiguità su come scriverlo.

**`0x0175` non vuole il byte `0x00` finale.** Sta con `0x0138`, non con
`0x0115`/`0x0104`/`0x0106`. Verificato: il payload mandato è stato un byte solo e ha
funzionato.

## I due modi del looper

**Il looper ha due modi, e in uno REC/DUB non ferma la registrazione.** Segnalato
dall'utente alla prima prova, il 13 agosto 2026, e non è un difetto:

- **Auto Mode** (click acceso): la lunghezza è fissata in battute, la registrazione
  parte dopo una battuta di conteggio e **si chiude da sola** al numero di battute
  impostato. Ripremere REC/DUB non la ferma.
- **Signal Detection Mode** (click spento): lunghezza libera, parte da sé quando sente
  la chitarra, e **lì sì che REC/DUB chiude la registrazione**.

Si passa dall'uno all'altro **tenendo premuto PLAY/STOP**. Sono i flag `click` e
`freeIndicator` di `LooperSetting`, quelli che `0x0176` scrive.

**Lo Spark 2 ha i tasti del looper sul pannello**, quindi l'ascolto non ha bisogno
dell'app ufficiale né dello snoop log: REC/DUB, PLAY/STOP, UNDO/REDO (tenuto =
cancella tutto), TAP per il tempo.

## Prima sessione d'ascolto — 13 agosto 2026, verificata sull'ampli

`captures/2026-08-13-looper-auto-mode.json`, 120 messaggi in venti raffiche, ampli in
**Auto Mode**. **Solo ricezione: nessun comando inviato**, quindi tutto quello che
segue vale per la direzione ampli→noi.

**I valori di Ignitron sono confermati sul nostro hardware.** `0x0375` porta un byte
solo e sono esattamente quelli: visti `02` countin, `04` rec, `07` rec complete, `08`
play, `09` stop, `0a` delete, `0b` dub, `0c` stop dub. Non sono comparsi `05`, `06`,
`0d` e `0e` — in Auto Mode non si ferma la registrazione a mano, e undo/redo non sono
stati toccati.

**`0x0375` con `00` non è nell'elenco di Ignitron.** Arriva sempre da solo, circa 1,2 s
dopo un `0a`, tre volte su tre. È il looper che dichiara di essere **vuoto**.

**`0x0377` è la posizione nel loop**, e non lo dice nessuna fonte: un float `0xca` che
parte da 0.0 e sale **linearmente di 0,0250 ogni ~190 ms**, cioè cinque volte al
secondo. Sedici valori di fila senza una deviazione. Su un pedale con un display è la
barra di avanzamento del loop, gratis.

**`0x0376` sono le impostazioni, e si leggono campo per campo.**
`cc 85 04 04 c2 c3 c2 3c`: `cc 85` bpm 133 (il prefisso `0xcc` che Ignitron mette sopra
i 128 — confermato), `04` count «straight», `04` quattro battute, `c2` freeIndicator
falso, `c3` click acceso, `c2` il terzo flag falso, `3c` sessanta (i 60 s di durata
massima). **Da qui si legge in quale modo è l'ampli**: `freeIndicator` falso e `click`
acceso vuol dire Auto Mode.

**`0x0363` è il bpm da solo**, float `0xca`: `43 05 00 00` = 133.0, poi 153.0.

**Il prefisso `0xcc` sul bpm è confermato dai due lati**: a 133 il campo è `cc 85`, a
120 è `78` nudo. Sotto 128 il fixint basta, sopra serve il prefisso — esattamente la
regola che Ignitron applica in scrittura.

**Il TAP fa tre cose insieme**, quattro volte per quattro pressioni: `0x0363` il bpm,
`0x0376` le impostazioni aggiornate, e `0x0337` — che già conoscevamo — sul parametro 4
di `DelayRe201`. Cioè **il tap tempo guida anche il delay**, non solo il looper.

Il ciclo completo in Auto Mode, misurato: premi REC/DUB → `02` `02`; dopo ~1,9 s
**da solo** `04`; al limite delle battute **da solo** `07` + `08` e parte il flusso di
`0x0377`; premi PLAY/STOP → `09`. La sovraincisione è `0b` `08` … `0c` `09`.

**Trappola del raggruppamento**: durante la riproduzione `0x0377` arriva ogni 190 ms,
che è meno degli 800 ms di pausa, quindi **la raffica non si chiude mai** e la
pressione umana finisce dentro lo stesso gruppo dell'evento automatico. Se servisse
separarle, `0x0377` va escluso dal conteggio della pausa.

### Due scoperte laterali dalla stessa cattura

- **`0x0275` risponde con `0x0375` e un byte**, stesso seq della richiesta. Quindi
  `0x0375` fa due mestieri: notifica spontanea di stato *e* risposta alla domanda. Chi
  ascolta deve distinguerli dal seq, altrimenti scambia una risposta per un evento.
- **`0x0278` non è una configurazione ma uno stato**: risponde `cc 85 04 04 00 c2 c2`,
  cioè bpm, count e battute come `0x0376`, ma poi tre campi diversi — dove la
  configurazione ha `c2 c3 c2` più la durata, lo stato ha `00 c2 c2`. Il `00` è un
  numero dove l'altro ha un booleano, quindi **i campi non sono gli stessi** e leggere
  `0x0378` con lo schema di `0x0376` darebbe «click spento» quando è acceso.
  Plausibile che siano battuta corrente, sta registrando, sta suonando — **da
  confermare**.

## L'invio funziona — 13 agosto 2026, verificato sull'ampli

`captures/2026-08-13-looper-invio.json`. Tre comandi mandati, tre ack `0x0475`, tre
effetti reali: `0x0175` con `04` fa partire la registrazione, con `05` la chiude e
manda in riproduzione (`07` `08`, poi 155 messaggi di posizione, poi `09`).

## La caccia al click, e perché è chiusa

**Tutto quello che è stato provato e ha fallito**, così non si ripercorre:

| prova | esito |
|---|---|
| `02` da solo | ack, nessun effetto |
| `02` col byte `0x00` finale | ack, nessun effetto |
| `0x0176` scritto da noi, poi `04` | registra regolare, **senza click** |
| `0x0176` scritto da noi, poi `02` | ack, nessun effetto |
| `02`+`04` attaccati, 56 ms (come Ignitron) | registra regolare, senza click |
| `02`+`04` a 1,8 s (come il pannello) | registra regolare, senza click |
| `01`, `03`, `0f`, `10` (buchi dell'enum e oltre) | nessun effetto |
| `0x0278`+`0x0275`+`0x0276` prima, poi `02` | ack, nessun effetto |
| sequenza di avvio dell'app rigiocata, con e senza license key | ack, nessun effetto |
| intestazione di blocco da 16 byte + ATT da 20 | `04` funziona, `02` no |

`captures/2026-08-13-looper-click-tentativi.json`,
`captures/2026-08-13-looper-coppia-02-04.json`,
`captures/2026-08-14-looper-contesto.json`,
`captures/2026-08-14-looper-rigioco-avvio.json`.

**Il fatto che regge tutto: `02` non è un comando.** In nessuna delle prove ha mai
prodotto un `0x0375` di ritorno, mentre `04` lo produce sempre entro 40 ms. Riceve
l'ack e viene buttato via. Quindi il conteggio non si comanda: è una fase interna che
l'ampli attraversa quando **il suo tasto** viene premuto, e `02` è il modo in cui lo
*racconta*, non il modo in cui lo si chiede.

**Il click non è un'impostazione spenta**, escluso per misura: `0x0276` interrogato
nella stessa sessione risponde `cc 85 04 04 c2 c3 c2 cd ea 60`, cioè `click` = `c3` =
vero, e dal pannello il click si sente. (Nota: l'ultimo campo qui è `cd ea 60`, uint16
60000; nella prima cattura era `3c`, quindi quel campo cambia forma.)

**L'app ufficiale avvia il looper col conteggio** — verificato dall'utente il 13 agosto
2026. Quindi **un comando esiste**. È l'unica domanda che valeva la pena fare prima di
aprire un'altra sonda, e la risposta ha riaperto il capitolo invece di chiuderlo.

## Lo snoop log ha risposto — 14 agosto 2026

`captures/2026-08-14-app-ufficiale-looper.txt`, ricavato col rapporto di bug del
telefono e letto da `tools/leggi-btsnoop.ps1`. **Il comando del conteggio è `0x0175`
con `02`, cioè esattamente quello che mandiamo noi.**

```
11,749s  APP    0x0175   f0 01 18 02 01 75 00 02 f7      <- l'app manda 02
11,789s  ampli  0x0475   f0 01 18 00 04 75 f7            <- ack
12,726s  ampli  0x0375   f0 01 40 02 03 75 00 02 f7      <- conteggio partito, col click
14,684s  ampli  0x0375   f0 01 41 04 03 75 00 04 f7      <- registrazione, da sola
```

Il nostro frame era `f0 01 01 02 01 75 00 02 f7`: **identico a meno del sequence
number**. Quindi non è il comando a essere sbagliato — **è il contesto**, e il log dice
quale. Tre differenze, in ordine di sospetto:

1. **L'app manda la license key `0x0170`** appena connessa, e l'ampli risponde `0x0470`
   con `00 00`. Noi non l'abbiamo mai mandata. Il payload della chiave **cambia da
   sessione a sessione**, quindi rigiocarlo tale e quale non basta.
2. **Subito prima del comando l'app interroga il looper**: `0x0278`, `0x0275`, `0x0276`,
   tutti e tre entro 200 ms e 2,3 s prima del `02`.
3. Tutta la sequenza di avvio: `0x022f`, `0x0223`, `0x0211`, `0x022b`, tre letture di
   preset, `0x0210`, `0x0296`, `0x0271` due volte, `0x0201` sullo stato live, `0x0265`.

**Il contesto è escluso** (`captures/2026-08-14-looper-rigioco-avvio.json`). Rigiocata
tutta la sequenza di avvio — ventiquattro messaggi, nell'ordine e con le distanze vere
— due volte, con e senza license key. **Ogni messaggio ha ricevuto la risposta giusta**,
quindi la riproduzione è fedele; e tutte e due le volte `0x0175` con `02` ha ricevuto
l'ack e non ha fatto niente.

**La license key rigiocata viene ricevuta e rifiutata**: `0x0470` con payload `fe`, cioè
−2, mentre all'app risponde `00 00`. Non è replicabile — è legata alla sessione.

**Anche l'intestazione di blocco è esclusa, e la prova è pulita.** L'app avvolge ogni
scrittura in 16 byte (`01 fe 00 00 53 fe <len> 00 …`, che `wrapBlock` produce identici)
e spezza in ATT da 20. Mandati così tutti e due i comandi: **`04` funziona** — ack e
`0x0375 04` di ritorno — e **`02` no**. L'involucro non rompe niente e non discrimina.

## Ipotesi cadute, tenute per non ripercorrerle

**«`02` e `04` vanno mandati tutti e due».** `sparkLooperRec()` di Ignitron manda due
comandi, non uno: `SPK_LOOPER_CMD_COUNTIN` *se il click è acceso*, e subito dopo
`SPK_LOOPER_CMD_REC`. Provata in due distanze, fallita in tutte e due.

**«La prova sulla license key era valida».** Non lo era, ed era un difetto nostro:
l'abbiamo mandata in **una write sola da 109 byte**, e l'ampli **non ha risposto nemmeno
l'ack** — non era un rifiuto, il messaggio non è mai arrivato. Da lì è nata la scoperta
di `sendSpezzato` (vedi `CLAUDE.md`, che è il pezzo di questo capitolo che vale oltre il
looper).

## L'ultima ipotesi è caduta — 28 agosto 2026

**Il fatto nuovo non è venuto dal looper**: è venuto dagli Hendrix, il 26 agosto. Lì si è
scoperto che lo sblocco della license key **resta nell'ampli anche dopo che l'app
ufficiale si è disconnessa** — è stato dell'ampli, non della sessione BLE. Il 14 agosto
non lo sapevamo, e per questo la chiave sembrava non verificabile: si pensava di doverla
derivare. Non serve derivarla. **Basta arrivare dopo.**

La prova, senza mai staccare la corrente all'ampli: app ufficiale connessa fino in fondo
→ app ufficiale chiusa, radio libera → `tools/looper-probe.html` connesso → COUNTIN.

```
005.464  connesso a Spark 2 BLE
028.787  TX 0x0175 COUNTIN — payload 02
028.899  RX 0x0475 seq=0x01              <- l'ack, e basta
```

**Nessun `0x0375` di ritorno, nessun click, nessuna registrazione.** Identico al
14 agosto. Con `04` quel `0x0375` torna sempre entro 40 ms.

**Il controllo è la parte che rende la misura valida**, ed è quello che il 13 agosto era
mancato senza che ce ne accorgessimo: subito dopo, con la nostra app, un preset `JH.*` —
**il fuzz c'era**. Cioè l'ampli era sbloccato *mentre* `02` veniva buttato via. Senza
quella verifica uno stacco di corrente in mezzo avrebbe chiuso il capitolo per sbaglio.

Cosa ne segue, e vale più del looper:

- **la license key `0x0170` abilita il contenuto a pagamento, non i comandi.** Gli
  effetti Hendrix la vogliono, `0x0175` no. Quindi non è «l'autenticazione del
  protocollo»: la riga di `CLAUDE.md` che dice che nessun comando nostro la richiede
  adesso è **misurata**, non supposta.
- **`02` non è un comando, e adesso non resta niente a spiegarlo altrimenti.** La misura
  che regge tutto era già questa — `02` non produce mai un `0x0375`, `04` lo produce
  sempre entro 40 ms — ma aveva la chiave come alibi. Non ce l'ha più.
- **Quello che resta è che non lo sappiamo.** L'app ufficiale manda quegli stessi byte e
  l'ampli conta; noi li mandiamo identici e non conta. Chiuso **per esaurimento delle
  ipotesi**, non per spiegazione: scriverlo diverso sarebbe raccontarsela.
