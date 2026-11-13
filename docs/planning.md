# Planning — 13 novembre 2026

Le cose aperte, in ordine di priorità (deciso con l'utente il 13 novembre). Si spunta qui man mano.
**Pubblicare lo decide solo l'utente**: non si chiede né si propone.

## 1. Chiudere la v154 (pronta, nei commit di `main`)

Dentro: splash «Novità», i «?» su telefono e PC, web ed exe uguali col Live (beta), guide aggiornate in
italiano e inglese (guida inglese del computer nuova), 0 traduzioni mancanti.

- [ ] **Provare il Live del PC nel browser** (Chrome/Edge) con lo Spark e la pedaliera veri: finora provato
  solo dentro l'exe (12 novembre).
- [ ] Pubblicazione: **quando lo dice l'utente**. L'exe apre la guida dal sito: la guida inglese del computer
  si vede solo dopo.

## 2. Microsoft Store

- [x] Windows SDK installato; `npm.cmd run store` usa il suo makeappx (`desktop/pacchetto-store.ps1`).
- [x] `npm.cmd run store`: `desktop/dist/SparklingTones-1.0.0.appx` (13 novembre, guida del PC compresa).
- [ ] L'utente lo manda allo Store (account Individual a nome della moglie, nome prenotato).
- [ ] A Store aperto: riscrivere «L'app per Windows» in `guida-pc.html` e `guida-pc.en.html` (oggi parla
  del Setup.exe e di «Esegui comunque»).

## 3. Collaudi con l'ampli

- [ ] Editor sul telefono con l'ampli collegato.
- [ ] L'ampli che si pianta girando le manopole (correzione `PAUSA_PARAMETRO` non verificata).
- [ ] «Importa un file» con un preset vero (anche lo zip dell'app ufficiale: non verificato).
- [ ] Spark NEO.
- [ ] Versione PC con lo Spark vero, fuori dal Live.

## 4. Pedale ESP32

- [ ] Montare la basetta stampata (pezzi TME e basetta arrivati).
- [ ] Rimisurare la corrente di carica della batteria a ~3,5 V.
- [ ] Pedale d'espressione: riprovare iPad/GarageBand e l'adattatore.

## 5. Piccole cose

- [ ] Schermata vera del Live nella guida del PC (dopo il collaudo con l'ampli).
- [ ] Togliere le 23 traduzioni inglesi non più usate (`tools/lingua.html`).
- [ ] Registro dei MIDI ricevuti per la Pedaliera: era per il beta test, chiuso. Probabilmente da lasciar perdere.

**Fermo per scelta dell'utente**: il Tap tempo con l'ampli acceso.
