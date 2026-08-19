# SparklingTones

App personale per controllare e organizzare i preset di un **Positive Grid Spark 2**
via Bluetooth, dal browser. Più un pedale ESP32 che fa lo stesso col piede.

**→ [mazzrelaz.github.io/SparklingTones](https://mazzrelaz.github.io/SparklingTones/)**

> **Progetto personale, in pausa.** È nato per risolvere un problema mio e funziona
> sul mio ampli. Il protocollo dello Spark 2 non è documentato da nessuna parte: qui
> è stato ricostruito osservando, misurando e verificando sull'hardware. Se stai
> cercando quello, la parte che ti serve è in [`docs/`](docs/) — vedi in fondo.

---

## Cosa fa

**Organizza la libreria.** Lo Spark 2 tiene otto preset alla volta; l'app tiene tutti
quelli che vuoi, con nome, categorie, note e famiglia di suono, in un database nel
browser. Legge i preset dall'ampli, importa il `preset_backup.zip` dell'app ufficiale,
esporta e reimporta in JSON.

**Suona.** Una vista *Live* con banchi da otto pulsantoni grandi, pensata per essere
usata mentre si suona invece che per catalogare. Un preset già caricato sull'ampli si
attiva all'istante; uno che non c'è viene trasmesso per intero in circa un secondo.

**Regola.** Un editor della catena effetti che agisce **sul suono che sta suonando**:
le manopole si muovono e l'ampli risponde. Legge sempre lo stato vero dall'ampli prima
di aprirsi, perché la verità è lì e non nella libreria.

**Funziona senza rete.** È una PWA: installata, si apre e funziona anche offline —
a un concerto la rete non c'è.

## Cosa serve

Un browser con **Web Bluetooth**: Chrome o Edge su computer e Android.
**Su iPhone e iPad non funziona**, e non è una scelta di Safari: su iOS ogni browser
è obbligato a usare il motore di Apple, che Web Bluetooth non ce l'ha.

Niente altro. Niente account, niente server: la libreria sta nel tuo browser e non
esce di lì.

## Farlo girare

Non c'è niente da compilare e niente da installare.

```
git clone https://github.com/mazzrelaz/SparklingTones.git
```

Poi apri `index.html` con un doppio clic. Funziona da `file://` — per questo i moduli
sono classic script e non ES module.

Attenzione a una cosa: `file://` e `https://` sono **due origini diverse**, quindi due
database diversi. La libreria non passa dall'una all'altra da sola: si esporta in JSON
e si reimporta.

## Il pedale

In [`pedale/`](pedale/) c'è il firmware per un **ESP32-C3**: prende i banchi dall'app
via Bluetooth, se li tiene in memoria e poi è autonomo — si collega da solo all'ampli
e cambia preset col piede, senza telefono.

Verificato sull'hardware, su una schedina nuda senza saldature:

| | misurato |
|---|---|
| un preset intero, intervallo di connessione di sistema | 1246 ms |
| lo stesso, chiedendo 7,5 ms | **326 ms** |
| a regime | **178–215 ms** |

Il secondo che ci mette il telefono non è banda: sono sedici round-trip BLE. Web
Bluetooth non lascia toccare l'intervallo di connessione, NimBLE sull'ESP32 sì, ed è
tutta la differenza.

**Il firmware non serializza niente.** L'app produce i frame già pronti e il pedale
corregge un byte solo — il sequence number, che il checksum non copre. L'encoder resta
uno solo, in JavaScript, coperto dai test.

Il pedale è a metà: funziona su una devkit, l'hardware vero (cinque footswitch, due
tasti, LED, display) non è ancora stato costruito. `tools/pedale-sim.html` ne simula la
faccia in una pagina, con dentro la logica vera.

## Il protocollo — la parte utile a qualcun altro

Questa è probabilmente la ragione per cui sei qui. Tutto in
**[`docs/protocollo-spark2.md`](docs/protocollo-spark2.md)**, e le trappole più costose
sono riassunte in [`CLAUDE.md`](CLAUDE.md).

GATT: service `0xFFC0`, write `0xFFC1` (solo *write without response*), notify `0xFFC2`.
Messaggi `F0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> F7`, con i dati
codificati 7/8 bit e i float in big endian.

Quello che è costato di più scoprire:

- **I comandi sugli effetti vogliono un byte `0x00` in coda.** Senza, l'ampli risponde
  con un ack regolare e **non applica il comando**. Non è documentato da nessuna fonte,
  ed è una differenza dello Spark 2.
- **Chunk da 25 byte, non 128.** Con 128 lo Spark 2 si disconnette.
- **Tutti i chunk di un preset vanno con lo stesso sequence number**, altrimenti l'ampli
  li conferma tutti senza assemblarne nessuno.
- **`0x0127` non salva sullo Spark 2**, in nessuna delle forme provate.
- **Far suonare un preset e salvarlo in uno slot sono due strade diverse**, e la seconda
  vuole un giro via-e-ritorno che sembra decorazione e non lo è.
- **L'ack conferma la ricezione, non l'esecuzione.** E `writeWithoutResponse` fa sembrare
  riuscita ogni scrittura: l'assenza di errori non è una verifica.

Il looper si comanda (`0x0175`), tranne la battuta di conteggio col click: quella è
un'indagine chiusa, e tutto ciò che è stato escluso sta in
[`docs/looper.md`](docs/looper.md), così nessuno ripercorre sette strade già chiuse.

Le catture grezze dall'ampli sono in [`captures/`](captures/).

## Test

Aprire le pagine in `test/`. Girano contro catture reali dell'ampli, quindi
intercettano una regressione nella codifica senza avere l'hardware a portata.

| | |
|---|---|
| `protocol-test.html` | 125 test — encoder e decoder, round-trip byte per byte |
| `transport-test.html` | 48 test — coda di invio e riassemblaggio |
| `store-test.html` | 99 test — libreria, banchi, categorie |
| `backup-test.html` | 33 test — lettura dello zip dell'app ufficiale |

## Avvertenze

**Scrivere in uno slot dell'ampli non si torna indietro.** Quello che c'era prima è
perso.

**L'ampli si può piantare**, e allora serve staccare la corrente. Succede coi comandi
pesanti — ricostruire un blocco DSP, o girare le manopole più in fretta di quanto la
radio riesca a portare.

**L'elenco dei modelli di effetto non è verificato**: viene da un catalogo di terzi, e
chiedere all'ampli un modello che non ha è uno dei modi per piantarlo. L'app distingue
quelli che ha visto uscire dal tuo ampli da quelli solo supposti.

**Provato su un solo Spark 2.** Con un altro esemplare, o un altro firmware, non so
cosa succede.

## Licenza e riconoscimenti

MIT, Massimo Togni. Vedi [`LICENSE`](LICENSE) e [`NOTICE`](NOTICE).

- I nomi di effetti e manopole vengono dal catalogo di
  **[Soundshed](https://github.com/soundshed/soundshed-app)** (MIT).
- Il riferimento per il protocollo BLE è
  **[paulhamsh/Spark](https://github.com/paulhamsh/Spark)** (Apache 2.0), i cui sorgenti
  stanno in [`reference/`](reference/).
- **[Ignitron](https://github.com/stangreg/Ignitron)** di stangreg è un pedale ESP32 per
  lo Spark, ed è da lì che vengono i comandi del looper.

**Nessun rapporto con Positive Grid Inc.** Non è un prodotto ufficiale, non è approvato
né supportato, e non usa loro codice. «Spark» e «Positive Grid» sono citati solo per
dire con cosa funziona.

---

## In English

A personal web app (PWA, vanilla JS, no dependencies) to control and organise presets on
a **Positive Grid Spark 2** amplifier over **Web Bluetooth**, plus ESP32-C3 firmware for
a footswitch controller. Everything is in Italian — but the part likely to interest you
probably is not the UI.

**The Spark 2 BLE protocol is documented in
[`docs/protocollo-spark2.md`](docs/protocollo-spark2.md)**, reverse-engineered by
observation and verified on real hardware. Highlights, if you are building something
similar:

- Service `0xFFC0`, write `0xFFC1` (write-without-response only), notify `0xFFC2`.
- Effect commands (`0x0115`, `0x0104`, `0x0106`) need a **trailing `0x00` byte** on the
  Spark 2 — without it you get a normal ack and nothing happens. This is not in any
  other source.
- Preset chunks must carry **25 bytes** of payload, not 128: with 128 the Spark 2 drops
  the connection.
- **All chunks of one preset must share the same sequence number**, or the amp acks them
  all and assembles none.
- `0x0127` (save preset) does not work on the Spark 2, in any of the four forms tried.
- Playing a preset and storing it into a slot are **two different sequences**.
- The BLE **connection interval** is what makes preset loading slow (~1.2 s): it is
  sixteen round-trips, not bandwidth. An ESP32 requesting a 7.5 ms interval does the same
  transfer in ~330 ms. Web Bluetooth does not let you change it.

Raw captures are in [`captures/`](captures/); the archived looper investigation —
including everything that was ruled out — in [`docs/looper.md`](docs/looper.md).

MIT licensed, by Massimo Togni. Not affiliated with Positive Grid Inc.
