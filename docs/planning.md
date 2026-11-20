# Planning — 13 novembre 2026

Le cose aperte, in ordine di priorità (deciso con l'utente il 13 novembre). Si spunta qui man mano.
**Pubblicare lo decide solo l'utente**: non si chiede né si propone.

## 1. Chiudere la v154 (pronta, nei commit di `main`)

Dentro: splash «Novità», i «?» su telefono e PC, web ed exe uguali col Live (beta), guide aggiornate in
italiano e inglese (guida inglese del computer nuova), 0 traduzioni mancanti.

- [x] **Provare il Live del PC nel browser** — 19 novembre, Edge con Spark e nostro pedale via BT (ramo `scene`). (Chrome/Edge) con lo Spark e la pedaliera veri: finora provato
  solo dentro l'exe (12 novembre).
- [ ] Pubblicazione: **quando lo dice l'utente**. L'exe apre la guida dal sito: la guida inglese del computer
  si vede solo dopo.

## 1b. Home page del sito, da rifare (14 novembre, l'utente: «troppo indietro»)

- [x] (14 novembre, pubblicata) `sparklingtones-sito/index.html` e `en/`: video vecchi (al posto dello Short di ottobre i sette nuovi, e
  i cinque del PC quando sono su YouTube), **manca l'editor Classico** e **manca la versione desktop** (PC ed exe).
  Grafica: prima la bozza. Tutte e due le lingue.

## 2. Microsoft Store

- [x] Windows SDK installato; `npm.cmd run store` usa il suo makeappx (`desktop/pacchetto-store.ps1`).
- [x] `npm.cmd run store`: `desktop/dist/SparklingTones-1.0.0.appx` (13 novembre, guida del PC compresa).
- [x] Inviato allo Store il 13 novembre 2026 (In certification; si pubblica da solo se passa). Scheda IT+EN, età 3+, testi in `design/store/`.
- [x] Pubblicata il 14 novembre 2026 (PEGI 3): https://apps.microsoft.com/detail/9PLB9RG9VLNX. Guide e sito col link (v158).
- [x] (15 novembre, 1.0.1, nero pieno scelto dall utente) **Al prossimo aggiornamento dello Store: rifare l icona** (l'utente: «orrenda con quegli angoli neri»).
  Sulla pagina dello Store l'icona ha gli angoli neri: va fatta senza angoli (sfondo pieno fino al bordo o
  trasparente), in `desktop/build/appx/` e nelle immagini della scheda. Prima una bozza da fargli vedere.
- [x] (19 novembre) **Allineare la versione**: pacchetto `desktop/dist/SparklingTones-1.7.0.appx` (= v170).
  Scheda rivista contro le Store Policies 7.20 in `design/store/scheda-store.md` (parole chiave senza «Spark 2» e
  «Positive Grid», ampli richiesto in apertura). **Inviata alla certificazione il 19 novembre, pubblicata il 20 novembre** (Submission 4, schede
  it+en aggiornate da me in Partner Center, avvertenza in fondo conservata; il pacchetto lo carica l'utente: 221 MB).

## 3. Collaudi con l'ampli

- [x] Editor dell'interfaccia telefono con l'ampli collegato (20 novembre, da localhost sul PC, prima di pubblicare cad2743): slot letti, Live, manopole, cambio modello, salvataggio.
- [x] L'ampli che si pianta girando le manopole: un minuto di manopole veloci senza piantarsi (20 novembre, `PAUSA_PARAMETRO` 90 ms). Da ritenere se ricapita.
- [x] «Importa un file» con un preset vero: JSON esportato dall'app ufficiale («Uku-bass»), importato e suonato sullo Spark (20 novembre, v172). Anche lo zip della libreria intera dell'app ufficiale (su localhost, libreria di prova): 88 preset, suonano.
- [ ] Spark NEO.
- [x] Versione PC con lo Spark vero, fuori dal Live (20 novembre): slot, editor, cambio modello, salvataggio in uno slot riletto.
- [ ] **Spark 40 «non si collega»** (15 novembre, segnalato da un utente). Correzione pronta nel ramo
  **`spark-40`** (`30cf20c`: block header in invio solo per lo Spark 40, tolto in ricezione), **ripubblicata in
  v167** (16 novembre) per la prova con lo Spark 40 di un amico: **esito da segnare qui.** Perché e cosa
  verificare: `docs/protocollo-spark2.md`, «Spark 40», nel ramo. Per riprenderla: `git cherry-pick 30cf20c`.
  Al tester: telefono o PC e browser, nome esatto nell'elenco Bluetooth, messaggio d'errore, registro (Altro).

## 4. Pedale ESP32

- [ ] Montare la basetta stampata (pezzi TME e basetta arrivati).
- [ ] Rimisurare la corrente di carica della batteria a ~3,5 V.
- [ ] Pedale d'espressione: riprovare iPad/GarageBand e l'adattatore.
- [x] **Modalità MIDI: anche il rilascio** — **fatto il 19 novembre**: CC 102–109 e poi il Program Change (per l'iPad), provati il 19 novembre col PC e con l'iPad. (14 novembre, deciso con l'utente): oltre al Program Change, CC a 127
  premendo e a 0 rilasciando, come Play Acoustic; così sul PC funziona la pressione lunga (FS4 tenuto cancella il
  loop). Poi reimparare gli switch nel Foot controller. Prima guardare chi altro ascolta quel MIDI (iPad).

## 5. Piccole cose

- [ ] Schermata vera del Live nella guida del PC (dopo il collaudo con l'ampli).
- [x] (19 novembre) Tolte le traduzioni inglesi non più usate: erano diventate 34 (vecchio Dropbox a mano,
  bollo «software», looper «come il nostro pedale»…), controllate una per una nel codice; aggiunte le due
  mancanti (Spark 40). `tools/lingua.html`: 1058 su 1058, nessuna in più.
- [ ] Registro dei MIDI ricevuti per la Pedaliera: era per il beta test, chiuso. Probabilmente da lasciar perdere.
- [x] **Codice in comune fra telefono e PC** (19 novembre, scelta lasciata a me: «non rompere quello che
  funziona»). Delle 46 funzioni con lo stesso nome solo 6 sono identiche e 6 quasi; le altre sono versioni
  diverse (il PC fa di più). Fatto solo il **cancello unico** dei modelli in `writePreset`. **Un modulo
  comune per le operazioni sull'ampli non si fa**: toccherebbe Live ed editor del telefono, che vanno.
  Si riapre solo se una correzione dimenticata su un lato ricapita.
- [x] **Prove in un comando solo** (19 novembre): `node tools/prove.js`, cinque suite e 13 giri (PC 8,
  telefono 5) con l'ampli finto. Da allargare quando serve: banchi del pedale, scene, sync, looper.

## 6. Funzioni nuove (18 novembre, scelte dall'utente fra otto proposte)

Ognuna in italiano e inglese e nelle guide, nello stesso lavoro.

- [x] (19 novembre, v170, **solo PC**) **Scaletta (setlist)**: brani in fila (preset, bpm, nota); la Live avanza di brano in brano, il pedale la
  segue e mostra il prossimo. Nessun comando nuovo.
- [x] (19 novembre, v170, **solo PC**; `docs/scene.md`) **Scene dentro un preset** (ritmica / solo / pulito): solo le manopole e gli on/off che cambiano, con
  `0x0104`/`0x0115`, invece del preset intero. **L'utente: «va studiata bene» — prima lo studio, poi si decide.**
  Da capire: quanti parametri si possono mandare in fila senza piantare l'ampli (`PAUSA_PARAMETRO`), quando
  conviene il preset intero, cosa succede se la scena cambia un modello (`0x0106`), come si salvano nel record
  e nel sync, come le vede il pedale. **Tutto nel ramo `scene`** (18 novembre, regola dell'utente: non deve
  toccare le versioni pubblicate): studio e misure in `docs/scene.md`, sonda, bozza solo per il PC. Copia di
  lavoro: `git worktree list`.
- [ ] **Cronologia di un preset**: ogni salvataggio tiene la versione di prima, «torna a com'era». Da decidere
  quante versioni e se viaggiano con Dropbox.
- [ ] **Condividere con link o QR**: il preset compresso nel `#` dell'indirizzo, nessun server; chi apre lo
  importa. QR senza dipendenze. Controllo di sicurezza: il preset in arrivo passa da `controllaPreset`.

**Fermo per scelta dell'utente**: il Tap tempo con l'ampli acceso.
