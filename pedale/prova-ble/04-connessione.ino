// prova-ble, 04-connessione.ino — Scansione e aggancio dell'ampli, intervallo di connessione.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/* ======================================================================
   Connessione
   ====================================================================== */

class Scansione : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice d) override {
    if (d.haveServiceUUID() && d.isAdvertisingService(UUID_SERVIZIO)) {
      /* Solo l'ampli scelto. Il nome nell'annuncio: «Spark 2 BLE», «Spark NEO
       * Control». Se manca si prende lo stesso, e decide il 0x0211 dopo
       * l'aggancio (leggiAmpli); quello scartato li' resta escluso un minuto. */
      const auto nomeAnnuncio = d.getName();   // la copia resta viva: c_str() punta dentro
      const char* nome = nomeAnnuncio.c_str();
      const bool neo = strstr(nome, "NEO") != nullptr;
      if (nome[0] && neo != (ampliScelto == AMPLI_NEO)) return;
      if (escluso[0] && (int32_t)(esclusoFino - millis()) > 0
          && strcmp(escluso, d.getAddress().toString().c_str()) == 0) return;
      Serial.printf("trovato: %s  [%s]  rssi %d\n",
                    d.getName().c_str(), d.getAddress().toString().c_str(), d.getRSSI());
      BLEDevice::getScan()->stop();
      if (trovato) delete trovato;
      trovato = new BLEAdvertisedDevice(d);
    }
  }
};

/* **La scansione non blocca piu' il ciclo.** Prima era `scan->start(8, false)`:
 * otto secondi dentro i quali il pedale non leggeva i pulsanti, ripetuti ogni
 * pochi secondi finche' l'ampli non c'era. Col risultato che **a ampli spento
 * il pedale sembrava morto** — nemmeno la combinazione dei due tasti banco
 * apriva il ponte, ed e' il difetto trovato il 24 settembre 2026 mentre si
 * provava il ponte. E' la stessa regola di sempre: nessuna attesa che non
 * guardi gli ingressi.
 *
 * Adesso la scansione parte e torna subito; quando l'ampli si fa vedere,
 * `Scansione` alza `trovato` e l'aggancio lo fa il loop. */
static bool scansioneInCorso = false;
static bool daLeggere = false;           // agganciato, nomi dei preset ancora da chiedere

static void fineScansione(BLEScanResults) {
  scansioneInCorso = false;
}

static void avviaScansione() {
  if (scansioneInCorso) return;
  Serial.println(F("scansione..."));
  BLEScan* scan = BLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new Scansione());
  scan->setActiveScan(true);
  scan->setInterval(100);
  scan->setWindow(99);
  if (trovato) { delete trovato; trovato = nullptr; }
  scansioneInCorso = true;
  if (!scan->start(8, fineScansione, false)) scansioneInCorso = false;
}

/** L'aggancio vero e proprio, con l'ampli gia' trovato. */
static bool agganciaAmpli() {
  BLEScan* scan = BLEDevice::getScan();
  scan->clearResults();
  if (!trovato) return false;

  // Un client solo, riusato. Crearne uno nuovo a ogni tentativo li accumula
  // e NimBLE ne ammette pochi: dopo qualche passaggio di consegne il pedale
  // smetterebbe di potersi collegare, e sarebbe un guasto che si manifesta
  // solo dopo mezz'ora d'uso.
  if (!client) client = BLEDevice::createClient();
  if (!client->connect(trovato)) { Serial.println(F("connessione fallita")); return false; }

  BLERemoteService* servizio = client->getService(UUID_SERVIZIO);
  if (!servizio) { Serial.println(F("servizio 0xFFC0 assente")); client->disconnect(); return false; }

  chScrittura = servizio->getCharacteristic(UUID_SCRITTURA);
  chNotifiche = servizio->getCharacteristic(UUID_NOTIFICHE);
  if (!chScrittura || !chNotifiche) { Serial.println(F("caratteristiche assenti")); client->disconnect(); return false; }

  chNotifiche->registerForNotify(alArrivo);
  // L'intervallo corto e' la differenza fra ~1400 ms e ~420 ms per un preset
  // intero, e va chiesto SECCO, min uguale a max, perche' l'ampli sceglie
  // dentro l'intervallo e prende sempre il massimo.
  //
  // **Chiederlo qui non basta.** Misurato il 15 agosto 2026: sulla prima
  // connessione fa in tempo, su una RICONNESSIONE arriva troppo presto e
  // viene perso — la connessione resta lenta e il pedale ci mette un secondo
  // e mezzo a preset. Ripetendolo a connessione matura torna a 26 ms di giro.
  // Quindi si chiede subito e poi si ripete dal loop, che e' l'unica forma
  // che ha funzionato in tutti e due i casi.
  client->updateConnParams(6, 6, 0, 400);
  momentoConnesso = millis();
  ripetizioniIntervallo = 0;
  Serial.printf("connesso, MTU %d, chiesto intervallo 7,5 ms\n", client->getMTU());
  schermoSporco = true;
  Serial.println(F("pronto. '?' per l'elenco dei comandi."));
  return true;
}

/** L'intervallo di connessione: e' questo che decide quanto costa un preset. */
static void chiediIntervallo(uint16_t minUnita, uint16_t maxUnita) {
  if (!client || !client->isConnected()) { Serial.println(F("non connesso")); return; }
  // unita' da 1,25 ms per gli intervalli, da 10 ms per il timeout
  bool ok = client->updateConnParams(minUnita, maxUnita, 0, 400);
  Serial.printf("chiesto intervallo %.2f - %.2f ms -> %s\n",
                minUnita * 1.25f, maxUnita * 1.25f,
                ok ? "richiesta inviata (l'ampli puo' rifiutare)" : "rifiutata subito");
}

