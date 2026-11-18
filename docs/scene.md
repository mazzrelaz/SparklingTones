# Scene dentro un preset — studio (18 novembre 2026)

Idea scelta dall'utente il 18 novembre: due o tre varianti dello stesso suono (ritmica, solo, pulito)
che si cambiano in fretta. Le sue parole: «va studiata bene». **Qui non c'è ancora niente di deciso
né di misurato**: quello che sappiamo, le strade possibili e le misure da fare con l'ampli acceso.

**18 novembre, scelta dell'utente: strada B** (solo manopole e acceso/spento), dopo aver visto come fanno
Helix (Snapshot), Fractal e Quad Cortex (Scene): modelli fissi, cambio senza buchi, code che passano.
Prima si misura con `tools/scene-sonda.html` (da Chrome o Edge, anche da `http://localhost:8099`: il
riquadro del browser non apre la scelta Bluetooth). La sonda muove solo manopole con un nome, mai interruttori,
posizioni, «Mode», «Master», gate, comp e riverbero; ogni raffica si verifica rileggendo il suono attivo.

## Prima misura — 18 novembre 2026, Spark 2

Cattura `captures/2026-11-18-scene-sonda.json`, preset «On the turning away» (drive, chorus, delay accesi),
14 manopole usabili. Una sessione sola, un preset solo.

| prova | risultato |
|---|---|
| preset intero | 1331 ms (17 pezzi), **nessun buco** all'ascolto; code di delay e riverbero **non chieste** |
| una manopola (Drive dell'Overdrive 0,47 → 0,97) | ~32 ms di invio, arrivata 6 volte su 6, **cambio pulito** |
| delay spento con `0x0115` | ~32 ms; ascolto «pulito» segnato subito dopo, probabilmente su questo |
| raffiche 5/10/20 a 120, 80 e 30 ms | **tutte arrivate**, anche 20 a 30 ms (649 ms); l'ampli non si è piantato |
| miste (manopole + 2 acceso/spento) a 120, 80, 30 ms | **tutte arrivate**; 12 comandi a 30 ms = 389 ms |

Quindi: una scena da 5–10 cambi costa **150–350 ms** contro **1,3 s** del preset intero, ed è pulita.
Il preset intero non lascia buchi, quindi il vantaggio di B è la **velocità**, più le code (da sentire).
**Non dimostrato**: che 30 ms regga sempre (una sessione), e il caso dell'ampli che si pianta girando le
manopole nell'editor, che resta aperto. Il ritmo conta: 10 cambi a 80 ms sono 840 ms, quasi quanto il
preset intero; a 30 ms sono 320 ms. **Deciso dall'utente il 18 novembre: 80 ms, più prudente.** Ne
segue un tetto: oltre ~12 cambi (≈ 1 s) la scena costa quanto il preset intero, e allora si manda quello.

## Cosa sappiamo già (verificato)

- **Preset intero** (`0x0101` su `0x7f` + `0x0138`): ~1 s. Sul pedale l'utente lo ha accettato («non
  importa», `docs/pedale.md`). **Non sappiamo se nel cambio c'è un buco nel suono**, né se le code di
  delay e riverbero si troncano: non l'abbiamo mai ascoltato apposta.
- **Manopola** (`0x0104`, con `0x00` in coda): un solo pezzo, la usa già l'editor. **On/off**
  (`0x0115`, con `0x00` in coda): idem. Tutte e due verificate.
- **Una raffica di manopole può piantare l'ampli**: l'editor le manda una alla volta con 90 ms di pausa
  (`PAUSA_PARAMETRO`), ma **che basti non è verificato**.
- **Cambiare modello** (`0x0106`) vuole il nome del modello di adesso, riletto: se è sbagliato, ogni
  cambio dopo fallisce. È il comando più delicato che abbiamo.
- **L'ampli racconta quando giri una sua manopola** (`0x0337`): lo stato vero può cambiare sotto i piedi.
- **Il pedale non costruisce comandi**: l'app glieli dà già pronti, e `frameAccettabile()` in `banchi.h`
  accetta solo `0x0101` verso `0x7f`.

## Le tre strade

| | come | velocità | rischio | lavoro |
|---|---|---|---|---|
| **A** | ogni scena è un preset intero, raggruppato sotto il suo «padre» | ~1 s, come oggi | nessuno nuovo | piccolo |
| **B** | si mandano solo le manopole e gli on/off che cambiano | da misurare: 5 manopole a 90 ms ≈ 0,5 s | raffica di `0x0104` | medio |
| **C** | B quando i cambi sono pochi, A quando sono tanti | il meglio delle due | come B | medio-grande |

**A** è solo organizzazione: comodo da vedere, ma non più veloce. **B** ha senso solo se la misura dice
che è davvero più veloce **e** che non lascia buchi nel suono; altrimenti la sua unica ragione cade.

## Regole che propongo, se si va su B o C

1. **Le scene non cambiano modello.** Solo manopole e on/off. Un modello diverso è un preset diverso:
   così `0x0106` resta fuori, col suo rischio.
2. **Valori assoluti, non differenze.** Ogni scena dice il valore di **tutte** le manopole che cambiano
   fra le scene di quel preset (un insieme fisso), e si mandano sempre tutte. Così il risultato non dipende
   da cosa suonava prima, né da una manopola girata sull'ampli.
3. **Prima di una scena, il preset deve essere quello giusto.** Se l'ampli suona altro (o non si sa), si
   manda prima il preset intero.
4. **Un tetto**: oltre un certo numero di comandi (da misurare) si manda il preset intero con i valori
   della scena già dentro.
5. **Il bpm non entra nelle scene** (`0x0176` è la trappola del delay infinito).

## Dove si salvano

Dentro il record del preset (`preset.scene`), con nome e valori per `effetto#indice`, più gli on/off.
Viaggiano con Dropbox insieme al preset. Da coprire con test:

- `importFromAmp` riscrive la parte sonora: **le scene restano** (sono lavoro dell'utente), e i valori
  di un effetto che non c'è più si ignorano.
- «Duplica» copia anche le scene.

## Il pedale

- Con A: niente di nuovo, le scene sono preset del banco.
- Con B: il formato del banco cambia (`pedale-ponte.js` e `banchi.h` insieme, impronta compresa), e
  `frameAccettabile()` va allargato a `0x0104` e `0x0115` — **controllo di sicurezza** da rifare. E va
  deciso quale footswitch cambia scena.

## Misure da fare con l'ampli (una alla volta, rileggendo dall'ampli)

1. **Preset intero, ascoltando**: si sente un buco? Le code di delay e riverbero restano?
2. **Una manopola e un on/off, ascoltando**: il cambio è pulito o fa un colpo?
3. **Raffica di 5, 10, 20 manopole** a 90, 50 e 30 ms: quanto ci mette, e rileggendo il suono attivo
   (`0x0201` su `[0x01, 0x00]`) sono arrivate tutte? A quale ritmo l'ampli si pianta?
4. **Raffica mista** di manopole e on/off.
5. Le stesse prove sul NEO, se B passa sullo Spark 2.

Strumento: una pagina di sonda in `tools/` (`scene-sonda.html`, da scrivere), che registra tutto in una
cattura in `captures/` prima di interpretare.

## La domanda per l'utente

Dipende tutto dalla misura 1: **se il preset intero non lascia buchi e 1 s va bene, A basta**. Se invece
il buco si sente, o 1 s è troppo nel mezzo di un brano, vale la pena di B.
