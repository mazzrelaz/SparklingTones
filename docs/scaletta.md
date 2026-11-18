# Scaletta e modo Concerto — studio (18 novembre 2026)

Nel planning (sezione 6): «brani in fila (preset, bpm, nota); la Live avanza di brano in brano, il pedale la
segue e mostra il prossimo». Il 18 novembre, pensando a come una pedaliera MIDI da 4 switch regge Preset, Stomp,
Scene e Looper, l'utente ha scelto la **strada C**: un modo **Concerto** che unisce scaletta e scene. Poi: «forse
prima dovremmo studiare come fare la scaletta». **Qui non c'è niente di deciso**: quello che c'è già, la proposta,
e le domande per l'utente.

## Il modo Concerto (strada C, scelta dell'utente)

Un brano della scaletta è un preset con le sue scene. Con 4 switch:

| switch | pressione breve | pressione lunga |
|---|---|---|
| 1 | Base | brano precedente |
| 2 | scena 1 | Stomp |
| 3 | scena 2 | Looper |
| 4 | scena 3 | brano successivo |

La mappa è **già pronta** per una pedaliera da 4: l'utente non deve imparare uno switch alla volta per ogni
modo (si può sempre cambiare). Lo schermo mostra il brano, le sue scene e **il brano dopo**. Preset e banchi
restano com'erano, per chi non usa la scaletta. Le altre due strade, scartate: A, un gesto per ogni funzione
(con 4 pressioni lunghe è già pieno); B, uno switch «Modo» che gira fra i modi (troppe pressioni, e sul palco
devi guardare lo schermo per sapere dove sei).

## Quello che c'è già

- **Una scaletta c'era già**, ad agosto 2026: una lista di id di preset (`settings.setlist`). Con i banchi da otto
  è diventata il banco «Scaletta» (`_migraScalettaInBanco`, in `preset-store.js`), una volta sola
  (`docs/decisioni-ui.md`, «Sezione Live»; il perché non è scritto: probabilmente erano tutte e due preset in fila).
- **I banchi** (`settings.banchi`): otto posti fissi, per id in libreria e per UUID nel sync, viaggiano con
  Dropbox (`CHIAVI_LIBRERIA`), e il pedale ESP32 li riceve. **Un banco non scrive mai sugli slot dell'ampli.**
- **Le scene** stanno nel preset (`preset.scene`) e viaggiano con lui: un brano non le deve copiare.
- **Il bpm del preset** (`preset.bpm`) parte con `0x0176`, costruito **dall'ultimo `0x0376` ricevuto** (trappola:
  un byte in più fa partire il delay in ripetizione infinita).
- **Cambiare preset costa ~1 s**, o subito con `0x0138` se il preset sta in uno slot. Fra un brano e l'altro va bene.

## Perché un banco non basta

- **Otto posti fissi**: una scaletta di 15 brani non ci sta, e spezzarla in due banchi è scomodo.
- **Lo stesso preset in due brani**: in un banco è lo stesso posto ripetuto, senza niente che li distingua.
- **Niente di proprio del brano**: né il nome del pezzo (diverso da quello del preset), né una nota.

## La proposta (da approvare)

Una scaletta è una **lista senza limite** di brani; ogni brano ha:

- il **preset** (per UUID, come i banchi, così regge il sync);
- il **nome del brano**, che si vede grande; se manca, quello del preset;
- una **nota** breve (tonalità, capotasto, «attacca il batterista»), che si vede sotto;
- **niente bpm suo**, all'inizio: il bpm è quello del preset. Un bpm per brano vorrebbe dire `0x0176` a ogni cambio
  di brano, con la sua trappola, e lo stesso preset a due tempi diversi. Si può aggiungere dopo, se serve.

Più scalette (una per serata), una attiva. Viaggiano con Dropbox come i banchi; un preset cancellato lascia il
brano senza suono (si vede, non si salta in silenzio).

## Le domande per l'utente

1. **Solo sul PC, come le scene, o anche sul telefono?** Il Concerto ha bisogno delle scene, che sono solo sul PC.
2. **Bpm per brano**: basta quello del preset, o serve il suo?
3. **Più scalette** o una sola?
4. **Il pedale ESP32**: resta fuori, come per le scene? (Il pedale è solo suo: niente per gli altri che lo presupponga.)
5. **Un brano senza scene**: gli switch 2–4 non fanno niente, o suonano i brani dopo?
6. **Dove si fa la scaletta**: una schermata sua (come i banchi), o dentro la Live?
7. **Il primo brano**: entrando nel Concerto suona subito, o aspetta lo switch 1?

## Il pedale MIDI e il pedale ESP32

Il modo Concerto è per i pedali MIDI commerciali (la Pedaliera del PC): la Pedaliera non è per il nostro pedale,
che ha solo lui. Nessun comando nuovo verso l'ampli: Concerto usa quelli che usano già banchi e scene.
