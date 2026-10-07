// prova-ble, 10-ponte.ino — Il ponte BLE verso l'app: server GATT, banchi da fuori, annuncio.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/* ======================================================================
   Il ponte verso l'app: qui il pedale fa da SERVER, mentre verso l'ampli
   resta client. E' la cosa da verificare prima di costruirci sopra: che le
   due parti convivano sullo stesso radio.

   Protocollo nostro, non quello dello Spark: qui l'MTU e' ampio e non ci
   sono le stranezze dell'ampli, quindi niente impacchettamento a 7 bit e
   niente chunk da 25. Primo byte = comando, il resto e' payload.
   ====================================================================== */

#define UUID_PONTE     "7a9c0000-4b2e-4f6a-9d3c-1e5f8b2a6c40"
#define UUID_COMANDO   "7a9c0001-4b2e-4f6a-9d3c-1e5f8b2a6c40"
#define UUID_STATO     "7a9c0002-4b2e-4f6a-9d3c-1e5f8b2a6c40"

static const uint8_t CMD_CIAO     = 0x01;
static const uint8_t CMD_ELENCA   = 0x02;
static const uint8_t CMD_INIZIA   = 0x10;   // slot, lunghezza LE32
static const uint8_t CMD_PEZZO    = 0x11;   // offset LE16, byte
static const uint8_t CMD_FINE     = 0x12;   // checksum XOR
static const uint8_t CMD_CANCELLA = 0x20;   // slot
static const uint8_t CMD_USA      = 0x21;   // slot: carica e suona quel banco
static const uint8_t CMD_SCAMBIA  = 0x22;   // slot a, slot b
static const uint8_t RSP_INFO     = 0x81;
static const uint8_t RSP_ELENCO   = 0x82;
static const uint8_t RSP_ERRORE   = 0x8f;

/* Il blocco in arrivo si accumula in heap e si scrive in LittleFS solo alla
 * fine, quando il checksum torna: cosi' un trasferimento interrotto non
 * lascia in memoria un banco a meta', che sarebbe peggio di non averlo. */
static uint8_t* ricDati   = nullptr;
static size_t   ricAttesi = 0, ricAvuti = 0;
static uint8_t  ricSlot   = 0;

static void ricAnnulla() {
  if (ricDati) free(ricDati);
  ricDati = nullptr;
  ricAttesi = ricAvuti = 0;
}

static BLECharacteristic* chStato = nullptr;
static bool appCollegata = false;

static void rispondi(uint8_t tipo, const char* testo) {
  if (!chStato) return;
  uint8_t buf[200];
  buf[0] = tipo;
  size_t n = strlen(testo);
  if (n > sizeof(buf) - 1) n = sizeof(buf) - 1;
  memcpy(buf + 1, testo, n);
  chStato->setValue(buf, n + 1);
  chStato->notify();
}

/* I comandi che toccano LittleFS — elencare, salvare, cancellare, scambiare,
 * caricare — leggono e scrivono migliaia di byte su flash. **Farlo dentro il
 * callback BLE blocca il task dello stack**, e con sei banchi in memoria basta
 * a far cadere la connessione: il sintomo e' «GATT operation failed for unknown
 * reason» seguito da una disconnessione. E' lo stesso errore gia' pagato con
 * disconnect() dentro onConnect.
 *
 * Il callback quindi prende nota e basta; il lavoro lo fa il loop. Restano nel
 * callback solo INIZIA e PEZZO, che sono due memcpy e arrivano fitti. */
/* Una coda, non un posto solo: l'app manda i comandi in raffica — applicando
 * un riordino ne partono fino a sette di fila — e con un posto solo il secondo
 * veniva rifiutato con «sto ancora finendo il comando prima». I comandi
 * pesanti sono corti, quindi la coda costa un centinaio di byte. */
static const uint8_t CODA_MAX = 12;
static uint8_t codaDati[CODA_MAX][8];
static uint8_t codaLung[CODA_MAX];
static volatile uint8_t codaTesta = 0, codaFondo = 0;

static void eseguiComandoPesante(const uint8_t* d, size_t n);

class Ponte : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    if (!appCollegata) return;             // un iPad collegato per il MIDI non scrive banchi
    const uint8_t* d = c->getData();
    const size_t   n = c->getLength();
    if (!n) return;

    if (d[0] != CMD_INIZIA && d[0] != CMD_PEZZO) {
      const uint8_t prossimo = (uint8_t)((codaFondo + 1) % CODA_MAX);
      if (prossimo == codaTesta) { rispondi(RSP_ERRORE, "coda dei comandi piena"); return; }
      const uint8_t quanti = (n < sizeof(codaDati[0])) ? (uint8_t)n : (uint8_t)sizeof(codaDati[0]);
      memcpy(codaDati[codaFondo], d, quanti);
      codaLung[codaFondo] = quanti;
      codaFondo = prossimo;
      return;
    }
    eseguiComandoPesante(d, n);            // qui ci arrivano solo INIZIA e PEZZO
  }
};

/** Tutto il resto, eseguito dal loop e non dal task BLE. */
static void eseguiComandoPesante(const uint8_t* d, size_t n) {
    switch (d[0]) {
      case CMD_CIAO: {
        char msg[160];
        char elenco[180];
        const uint8_t quantiBanchi = banchiElenca(elenco, sizeof(elenco));
        snprintf(msg, sizeof(msg), "pedale prova-ble; ampli %s; banchi in memoria %u; suono \"%s\"",
                 chScrittura ? "connesso" : "non connesso", quantiBanchi,
                 bancoAttivo.valido ? bancoAttivo.nome : "(banco del firmware)");
        Serial.printf("ponte: CIAO -> %s\n", msg);
        rispondi(RSP_INFO, msg);
        break;
      }
      case CMD_ELENCA: {
        char elenco[180];
        const uint8_t quanti = banchiElenca(elenco, sizeof(elenco));
        Serial.printf("ponte: ELENCA -> %u banchi\n", quanti);
        rispondi(RSP_ELENCO, elenco);
        break;
      }

      case CMD_INIZIA: {
        if (n < 6) { rispondi(RSP_ERRORE, "INIZIA malformato"); break; }
        ricAnnulla();
        ricSlot   = d[1];
        ricAttesi = (size_t)d[2] | ((size_t)d[3] << 8) | ((size_t)d[4] << 16) | ((size_t)d[5] << 24);
        if (ricSlot >= BANCHI_MAX)   { rispondi(RSP_ERRORE, "slot fuori range"); break; }
        if (!ricAttesi || ricAttesi > BLOCCO_MAX) { rispondi(RSP_ERRORE, "lunghezza assurda"); break; }
        ricDati = (uint8_t*)malloc(ricAttesi);
        if (!ricDati) { ricAnnulla(); rispondi(RSP_ERRORE, "memoria insufficiente"); break; }
        Serial.printf("ponte: INIZIA slot %u, %u byte in arrivo\n", ricSlot, ricAttesi);
        rispondi(RSP_INFO, "pronto");
        break;
      }

      case CMD_PEZZO: {
        if (!ricDati || n < 4) { rispondi(RSP_ERRORE, "PEZZO fuori sequenza"); break; }
        const size_t offset = (size_t)d[1] | ((size_t)d[2] << 8);
        const size_t quanti = n - 3;
        // L'offset arriva da fuori: senza questo controllo un pezzo malformato
        // scriverebbe oltre il buffer, ed e' il solo modo in cui questo codice
        // puo' fare danni veri.
        if (offset + quanti > ricAttesi) { ricAnnulla(); rispondi(RSP_ERRORE, "pezzo fuori dal blocco"); break; }
        memcpy(ricDati + offset, d + 3, quanti);
        ricAvuti += quanti;
        break;                             // nessuna risposta: sarebbe solo lentezza
      }

      case CMD_FINE: {
        if (!ricDati) { rispondi(RSP_ERRORE, "FINE senza INIZIA"); break; }
        if (ricAvuti != ricAttesi) {
          char msg[64];
          snprintf(msg, sizeof(msg), "arrivati %u byte su %u", ricAvuti, ricAttesi);
          ricAnnulla(); rispondi(RSP_ERRORE, msg); break;
        }
        uint8_t somma = 0;
        for (size_t k = 0; k < ricAttesi; k++) somma ^= ricDati[k];
        if (n >= 2 && somma != d[1]) { ricAnnulla(); rispondi(RSP_ERRORE, "checksum sbagliato"); break; }

        // Si verifica che sia interpretabile PRIMA di scriverlo: un banco che
        // non si riesce a leggere non deve nemmeno entrare in memoria.
        BancoCaricato prova = {};
        prova.dati = ricDati; prova.quanti = ricAttesi;
        const bool buono = bancoInterpreta(prova);
        prova.dati = nullptr;              // il buffer resta di ricDati
        if (!buono) { ricAnnulla(); rispondi(RSP_ERRORE, "blocco non interpretabile"); break; }

        const bool salvato = bancoSalva(ricSlot, ricDati, ricAttesi);
        // Un banco appena mandato e' quello che si vuole usare: se il pedale
        // non ne aveva nessuno, diventa il suo, e si riaccendera' con quello.
        if (salvato && slotBanco < 0) {
          if (bancoCarica(ricSlot, bancoAttivo)) {
            slotBanco = (int8_t)ricSlot;
            ricordaBanco((int8_t)ricSlot);
            metaMostrata = 0;
            bersaglio = 0;
            aggiornaLed();
            schermoSporco = true;
          }
        }
        char msg[80];
        snprintf(msg, sizeof(msg), salvato ? "banco \"%s\" salvato nello slot %u"
                                           : "scrittura fallita per \"%s\" (slot %u)",
                 prova.nome, ricSlot);
        Serial.printf("ponte: %s\n", msg);
        ricAnnulla();
        rispondi(salvato ? RSP_INFO : RSP_ERRORE, msg);
        break;
      }

      case CMD_SCAMBIA: {
        if (n < 3) { rispondi(RSP_ERRORE, "SCAMBIA malformato"); break; }
        const bool fatto = bancoScambia(d[1], d[2]);
        char msg[56];
        snprintf(msg, sizeof(msg), fatto ? "slot %u e %u scambiati" : "scambio %u-%u fallito",
                 d[1] + 1, d[2] + 1);
        Serial.printf("ponte: %s\n", msg);
        rispondi(fatto ? RSP_INFO : RSP_ERRORE, msg);
        break;
      }

      case CMD_CANCELLA: {
        if (n < 2) { rispondi(RSP_ERRORE, "CANCELLA malformato"); break; }
        const bool fatto = bancoCancella(d[1]);
        char msg[48];
        snprintf(msg, sizeof(msg), fatto ? "slot %u cancellato" : "slot %u era gia' vuoto", d[1]);
        Serial.printf("ponte: %s\n", msg);
        rispondi(fatto ? RSP_INFO : RSP_ERRORE, msg);
        break;
      }

      case CMD_USA: {
        if (n < 2) { rispondi(RSP_ERRORE, "USA malformato"); break; }
        BancoCaricato nuovo = {};
        if (!bancoCarica(d[1], nuovo)) { rispondi(RSP_ERRORE, "slot vuoto o illeggibile"); break; }
        // Un banco senza nemmeno un preset non si puo' suonare: accettarlo
        // vorrebbe dire lasciare il pedale muto senza spiegare perche'.
        bool qualcosa = false;
        for (uint8_t k = 0; k < POSTI_PER_BANCO; k++) if (nuovo.posti[k].presente) qualcosa = true;
        if (!qualcosa) { bancoLibera(nuovo); rispondi(RSP_ERRORE, "quel banco non ha preset dentro"); break; }
        bancoLibera(bancoAttivo);
        bancoAttivo = nuovo;
        bersaglio = corrente = 0;
        char msg[64];
        snprintf(msg, sizeof(msg), "adesso suono \"%s\"", bancoAttivo.nome);
        Serial.printf("ponte: %s\n", msg);
        rispondi(RSP_INFO, msg);
        break;
      }
      default: {
        char msg[48];
        snprintf(msg, sizeof(msg), "comando 0x%02x sconosciuto", d[0]);
        Serial.printf("ponte: %s\n", msg);
        rispondi(RSP_ERRORE, msg);
      }
    }
}

/**
 * Chiamata dal loop: esegue **un** comando per giro, non tutta la coda.
 * Svuotarla in un colpo rifarebbe l'errore da cui veniamo, cioe' tenere
 * occupato troppo a lungo chi deve anche rispondere alla radio.
 */
static void sbrigaComandoPonte() {
  if (codaTesta == codaFondo) return;
  uint8_t copia[8];
  const uint8_t n = codaLung[codaTesta];
  memcpy(copia, codaDati[codaTesta], n);
  codaTesta = (uint8_t)((codaTesta + 1) % CODA_MAX);
  eseguiComandoPesante(copia, n);
}

/* Un padrone alla volta, per scelta dell'utente: non serve che il pedale
 * parli con l'app e con l'ampli insieme. Ci si collega all'app, si chiude
 * l'app, e il pedale torna all'ampli da solo. Quindi:
 *
 *   l'app si collega  -> il pedale molla l'ampli
 *   l'app se ne va    -> il pedale se lo riprende
 *
 * Annunciarsi invece lo fa **sempre**, anche mentre suona: costa niente ed
 * e' l'unico modo perche' l'app lo trovi senza staccare la corrente. */
/* I callback girano nel task dello stack BLE. **Non si fanno operazioni BLE
 * li' dentro** — niente disconnect, niente startAdvertising: e' il modo di
 * piantare NimBLE o di lasciarlo in uno stato incoerente, e il sintomo e'
 * proprio quello visto, il pedale che non torna piu' all'ampli. Qui si alza
 * solo una bandiera; il lavoro lo fa il loop. */
static volatile bool appEntrata = false, appUscita = false;

/* --- Il ponte si apre solo quando lo dici tu ------------------------------
 *
 * Finche' il pedale si annunciava sempre, **chiunque a portata poteva
 * collegarsi** con una app BLE qualunque. E siccome c'e' un padrone alla
 * volta, quel collegamento fa mollare l'ampli: in mezzo a un concerto i
 * footswitch smettono di funzionare, e da fuori sembra un guasto.
 *
 * Quindi il ponte sta chiuso — niente annuncio, e chi arriva lo stesso viene
 * scollegato — e si apre **tenendo premuti i due tasti banco insieme**, per
 * due minuti. Il tempo di far partire un trasferimento dall'app; finche'
 * l'app resta collegata la finestra non scade, cosi' non si taglia un banco a
 * meta'. */
class Collegamenti : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    connApp = s->getConnId();
    // A ponte chiuso non si molla l'ampli: si alza solo la bandiera, e il
    // loop lo scollega. Mai operazioni BLE dentro un callback BLE.
    if (pontefino == 0) {
      // A ponte chiuso, in modalita' MIDI chi arriva e' l'iPad per il MIDI:
      // non tocca l'ampli (in MIDI non c'e') e non puo' scrivere banchi.
      if (modo == MODO_MIDI) { midiCentrale = true; return; }
      cacciaApp = true;
      return;
    }
    appCollegata = true;
    appEntrata   = true;
  }
  void onDisconnect(BLEServer*) override {
    if (midiCentrale) { midiCentrale = false; midiUscito = true; return; }
    appCollegata = false;
    appUscita = true;
  }
};

/** Cosa annunciare, deciso in un posto solo. Due UUID da 128 bit non stanno
 *  insieme nei 31 byte dell'annuncio, e comunque servono in momenti diversi:
 *  col ponte aperto quello del ponte (l'app lo cerca per servizio), in
 *  modalita' MIDI quello del MIDI (l'iPad lo cerca cosi'), altrimenti niente. */
static void annuncia() {
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  BLEDevice::stopAdvertising();
  adv->removeServiceUUID(BLEUUID(UUID_PONTE));
  adv->removeServiceUUID(BLEUUID(UUID_MIDI));
  if (appCollegata || midiCentrale) return;          // c'e' gia' qualcuno
  if (pontefino)             { adv->addServiceUUID(UUID_PONTE); BLEDevice::startAdvertising(); }
  else if (modo == MODO_MIDI) { adv->addServiceUUID(UUID_MIDI);  BLEDevice::startAdvertising(); }
}

static void apriPonte() {
  pontefino = millis() + PONTE_APERTO_MS;
  annuncia();
  Serial.println(F("ponte aperto per due minuti: l'app puo' collegarsi"));
  schermoSporco = true;
}

static void chiudiPonte(const char* perche) {
  if (!pontefino && !appCollegata) return;
  pontefino = 0;
  annuncia();
  if (appCollegata && serverPonte) serverPonte->disconnect(connApp);
  Serial.printf("ponte chiuso (%s)\n", perche);
  schermoSporco = true;
}

/** Le conseguenze dei collegamenti, eseguite fuori dal task BLE. */
static void sbrigaPonte() {
  if (cacciaApp) {
    cacciaApp = false;
    if (serverPonte) serverPonte->disconnect(connApp);
    Serial.println(F("ponte chiuso: collegamento rifiutato (due tasti banco per aprirlo)"));
  }
  // Mentre l'app e' collegata la finestra non scade: un banco non si taglia a
  // meta'. Scade dopo, appena se n'e' andata.
  if (ponteAperto() && appCollegata) pontefino = millis() + PONTE_APERTO_MS;
  if (ponteAperto() && !appCollegata && (int32_t)(millis() - pontefino) > 0) {
    chiudiPonte("tempo scaduto");
  }
  if (appEntrata) {
    appEntrata = false;
    Serial.println(F("ponte: l'app si e' collegata, mollo l'ampli"));
    sganciato = true;
    if (client && client->isConnected()) client->disconnect();
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
    schermoSporco = true;                  // il quadratino dello Spark si svuota
  }
  if (appUscita) {
    appUscita = false;
    Serial.println(F("ponte: l'app se n'e' andata, riprendo l'ampli"));
    sganciato       = false;
    ultimoTentativo = 0;
    momentoSgancio  = millis();
    annuncia();                      // senza, il pedale sparisce per sempre
  }
  if (midiUscito) {
    midiUscito = false;
    Serial.println(F("MIDI Bluetooth: scollegato, mi riannuncio"));
    annuncia();
    schermoSporco = true;
  }
  static bool eraCentrale = false;
  if (midiCentrale != eraCentrale) {
    eraCentrale = midiCentrale;
    if (midiCentrale) Serial.println(F("MIDI Bluetooth: collegato"));
    schermoSporco = true;
  }
}

static void avviaPonte() {
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new Collegamenti());

  BLEService* servizio = server->createService(UUID_PONTE);
  BLECharacteristic* chComando = servizio->createCharacteristic(
    UUID_COMANDO, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  chComando->setCallbacks(new Ponte());

  chStato = servizio->createCharacteristic(
    UUID_STATO, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  servizio->start();

  BLEService* servMidi = server->createService(UUID_MIDI);
  chMidi = servMidi->createCharacteristic(UUID_MIDI_DATI,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE_NR |
    BLECharacteristic::PROPERTY_NOTIFY);
  servMidi->start();
  serverPonte = server;
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(UUID_PONTE);
  adv->setScanResponse(true);
  /* **L'annuncio si accende un attimo e si spegne subito.** Sembra inutile e
   * invece e' la riga che fa funzionare tutto: su NimBLE i servizi GATT si
   * registrano davvero alla prima accensione dell'annuncio, e **se quel
   * momento arriva quando il pedale e' gia' collegato all'ampli la
   * registrazione non riesce**. Il sintomo era esattamente quello visto il 24
   * settembre 2026: l'app trovava il pedale, si collegava, e poi il browser
   * diceva «No Services matching UUID». Facendolo qui, prima di collegarsi
   * all'ampli, i servizi ci sono per sempre, e da li' in avanti accendere e
   * spegnere l'annuncio e' innocuo. */
  BLEDevice::startAdvertising();
  delay(50);
  BLEDevice::stopAdvertising();
  Serial.println(F("ponte pronto ma chiuso: due tasti banco insieme per aprirlo"));

}

