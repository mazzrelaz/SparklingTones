/*
 * prova-ble — il primo passo del pedale, senza saldare niente
 * =============================================================
 *
 * Serve solo la schedina e il cavo USB. Nessun pulsante, nessun LED, nessun
 * display: si comanda tutto dal monitor seriale. Risponde alle tre domande che
 * decidono se il progetto esiste, e nessuna di quelle domande ha bisogno di un
 * pin collegato.
 *
 *   1. l'ESP32 vede lo Spark e ci si collega?
 *   2. gli cambia preset?  (0x0138, dieci byte)
 *   3. quanto ci mette un giro di andata e ritorno?  <- la misura che conta
 *
 * Sulla 3: un preset intero sono sedici chunk che aspettano l'ack uno per uno.
 * Se il secondo che ci mette il telefono e' l'intervallo di connessione e non
 * la banda, allora chiedendo 7,5 ms invece dei ~30 di sistema il pedale
 * diventa quattro volte piu' svelto. Il browser non puo' chiederlo, noi si.
 * Il comando 'v' fa la richiesta, 'm' misura. Si confrontano i due numeri.
 *
 * Libreria: nessuna da installare. Usa BLEDevice.h, che arriva col pacchetto
 * schede esp32. Dal core 3.x quella libreria e' NimBLE sotto il cofano (i tipi
 * sono ble_gap_conn_params, non i Bluedroid esp_ble_*), quindi il timore sulla
 * RAM del C3 non si pone: ci siamo gia'.
 *
 * Scheda: ESP32C3 Dev Module. Se il monitor seriale resta muto, accendi
 * "USB CDC On Boot" nel menu Strumenti: sul C3 la seriale passa dall'USB
 * nativo e senza quella spunta non esce niente.
 *
 * Comandi dal monitor seriale (invio a fine riga):
 *   0..7   cambia preset sullo slot (A1..A4 = 0..3, B1..B4 = 4..7)
 *   m      misura: dieci cambi preset di fila, riporta il giro medio
 *   v      chiede un intervallo di connessione da 7,5 ms
 *   s      chiede l'intervallo lento (30 ms), per il confronto
 *   r      ricollega
 *   ?      questo elenco
 */

#include <BLEDevice.h>
#include "preset_frames.h"
#include "banchi.h"

/* Il banco che il pedale sta suonando. Se ne ha uno ricevuto dall'app usa
 * quello; altrimenti ripiega su preset_frames.h, che resta utile per provare
 * senza dipendere dalla memoria. */
static BancoCaricato bancoAttivo = {};

static uint8_t     quantiPosti()            { return bancoAttivo.valido ? POSTI_PER_BANCO : BANCO_QUANTI; }
static bool        postoPieno(uint8_t n)    { return bancoAttivo.valido ? bancoAttivo.posti[n].presente : true; }
static const char* nomePosto(uint8_t n)     { return bancoAttivo.valido ? bancoAttivo.posti[n].nome : BANCO_NOMI[n]; }
static uint8_t     chunkDelPosto(uint8_t n) { return bancoAttivo.valido ? bancoAttivo.posti[n].quanti : BANCO_CHUNK[n]; }

/** Il prossimo posto **pieno**: coi banchi veri i posti vuoti ci sono, e
 *  fermarcisi sopra fa sembrare il pedale morto. */
static uint8_t prossimoPieno(uint8_t da) {
  const uint8_t quanti = quantiPosti();
  for (uint8_t k = 1; k <= quanti; k++) {
    const uint8_t c = (uint8_t)((da + k) % quanti);
    if (postoPieno(c)) return c;
  }
  return da;                               // banco tutto vuoto
}

static bool bancoHaQualcosa() {
  for (uint8_t i = 0; i < quantiPosti(); i++) if (postoPieno(i)) return true;
  return false;
}

static const uint8_t* frameDelPosto(uint8_t n, uint8_t c, uint8_t& lunghezza) {
  if (bancoAttivo.valido) {
    lunghezza = bancoAttivo.posti[n].lung[c];
    return bancoAttivo.dati + bancoAttivo.posti[n].inizio[c];
  }
  lunghezza = BANCO_LUNGH[n][c];
  return BANCO_FRAME[n][c];
}

/* --- GATT dello Spark: service 0xFFC0, write 0xFFC1, notify 0xFFC2 ------ */
static BLEUUID UUID_SERVIZIO((uint16_t)0xFFC0);
static BLEUUID UUID_SCRITTURA((uint16_t)0xFFC1);
static BLEUUID UUID_NOTIFICHE((uint16_t)0xFFC2);

static BLEAdvertisedDevice* trovato    = nullptr;
static BLEClient*           client     = nullptr;
static BLERemoteCharacteristic* chScrittura = nullptr;
static BLERemoteCharacteristic* chNotifiche = nullptr;

/* Un pedale non si arrende. Se si accende prima dell'ampli, o se la
 * connessione cade a meta' concerto, deve riprovare da solo: senza questo
 * il pedale resta muto finche' qualcuno non lo riavvia, che sul palco non
 * succede. Riprova ogni cinque secondi, in silenzio. */
static uint32_t ultimoTentativo = 0;

/* Ma quando l'app si collega il pedale deve mollare l'ampli, e restare
 * mollato finche' l'app c'e'. Anche 'x' dal seriale mette qui. */
static bool     sganciato      = false;
static uint32_t momentoSgancio = 0;   // quando l'app ha mollato: da li' si riprova fitto
static uint32_t momentoConnesso = 0;  // per ripetere la richiesta dell'intervallo
static uint8_t  ripetizioniIntervallo = 0;

static uint8_t  seq       = 0x01;   // resta fra 0x01 e 0x3e
static uint32_t rxTotali  = 0;      // quanti messaggi interi sono arrivati
static uint32_t ultimoRx  = 0;      // millis dell'ultimo messaggio: serve a misurare

/* ======================================================================
   Riassemblatore: le notifiche arrivano a pezzi, un messaggio sta fra
   f0 e f7. Un f0 ricomincia sempre da capo — f0 e f7 non possono comparire
   dentro un messaggio, perche' i byte dati sono impacchettati a 7 bit e
   stanno tutti sotto 0x80.
   ====================================================================== */

static uint8_t  buffer[512];
static size_t   dentro = 0;

/* --- il footswitch: per ora il tasto BOOT che c'e' gia' sulla scheda ------
 *
 * GPIO9 e' il tasto BOOT, quindi zero saldature. Ma e' anche un pin di
 * strapping: **tenuto premuto mentre la scheda si accende, il C3 parte in
 * modalita' programmazione e non esegue lo sketch**. Va benissimo per provare,
 * e nel pedale vero il footswitch non ci va mai sopra.
 *
 * ATTENZIONE portando questo sketch sulla XIAO ESP32-S3 (la scheda decisa il
 * 29 agosto 2026): li' il tasto BOOT e' **GPIO0**, non GPIO9. Sull'S3 il 9 e'
 * D10/MOSI, che resta flottante: il tasto sembrerebbe semplicemente non
 * funzionare, o peggio rimbalzare da solo. Cambiare la costante qui sotto e'
 * l'unica riga chip-dipendente di tutto il firmware.
 */
/* Il tasto BOOT della scheda, che cambia numero da un chip all'altro: sul C3
 * e' GPIO9, sull'S3 e sul C6 e' GPIO0. **Non e' un dettaglio estetico**: sull'S3
 * il 9 e' D10/MOSI, che senza niente attaccato resta flottante e produce
 * pressioni fantasma — cioe' cambi preset a caso. */
#if CONFIG_IDF_TARGET_ESP32C3
static const uint8_t PIN_TASTO = 9;
#else
static const uint8_t PIN_TASTO = 0;
#endif
static const uint32_t ANTIRIMBALZO = 25;   // ms

/* Antirimbalzo «aspetta che stia fermo», non «ignora i cambi ravvicinati».
 * La seconda forma - quella scritta il 14 agosto - fa ripartire il conto a
 * ogni rimbalzo, quindi un contatto sporco puo' tenere la porta chiusa a
 * tempo indeterminato e la pressione si perde. Qui si registra l'ultimo
 * fronte grezzo e si accetta il livello solo quando e' rimasto immobile per
 * ANTIRIMBALZO: i rimbalzi allungano l'attesa di qualche ms, non annullano
 * la pressione. */
static bool     livelloGrezzo = true;      // true = rilasciato (pull-up)
static bool     livelloFermo  = true;
static uint32_t ultimoFronte  = 0;
static uint8_t  corrente      = 0;         // quale preset del banco sta suonando

/* Strumentazione: senza questa non si distingue «il fronte non arriva» da
 * «arriva e lo scarto io», e sono due cause opposte. */
static bool     diagnostica = false;
static uint32_t frontiVisti = 0, pressioniViste = 0, pressioniPerse = 0;
static uint8_t  bersaglio   = 0;           // l'ultimo chiesto, anche se non ancora arrivato

/* Un trasferimento dura ~400 ms, e durante quei 400 ms il firmware sta in un
 * ciclo di attesa. Se il tasto lo si legge solo dal loop, **ogni pressione in
 * quella finestra si perde**, e da fuori sembra che il pedale abbia smesso di
 * rispondere: e' il difetto che si e' visto alla prima prova col dito.
 * Quindi il tasto si legge anche dentro l'attesa, e la pressione si accoda.
 * Vince l'ultima: premere tre volte in fretta carica il terzo preset, non
 * tutti e tre in fila. */
static bool    inTrasferimento = false;
static int8_t  inCoda          = -1;

static void leggiTasto();                  // usata dentro l'attesa degli ack

static bool silenzioso = false;   // durante un preset i 15 ack sono rumore

static void messaggioIntero(const uint8_t* m, size_t n) {
  rxTotali++;
  ultimoRx = millis();
  if (silenzioso) return;
  Serial.print(F("  RX "));
  if (n >= 6) {
    Serial.printf("0x%02x%02x  ", m[4], m[5]);
  }
  for (size_t i = 0; i < n; i++) Serial.printf("%02x ", m[i]);
  Serial.println();
}

static void mangia(const uint8_t* dati, size_t n) {
  for (size_t i = 0; i < n; i++) {
    uint8_t b = dati[i];
    if (b == 0xf0) dentro = 0;                  // ricomincia sempre
    if (dentro < sizeof(buffer)) buffer[dentro++] = b;
    if (b == 0xf7 && dentro > 1) {
      size_t quanti = dentro;
      dentro = 0;                               // svuota PRIMA di consegnare
      messaggioIntero(buffer, quanti);
    }
  }
}

static void alArrivo(BLERemoteCharacteristic*, uint8_t* dati, size_t n, bool) {
  mangia(dati, n);
}

/* ======================================================================
   Costruzione dei messaggi
   chunk: f0 01 <seq> <checksum> <cmd> <sub> <dati impacchettati> f7
   ====================================================================== */

/** Codifica 7/8: ogni 7 byte reali preceduti da un byte con i loro MSB, LSB-first. */
static size_t impacchetta(const uint8_t* dati, size_t n, uint8_t* fuori) {
  size_t out = 0;
  for (size_t base = 0; base < n; base += 7) {
    size_t quanti = (n - base < 7) ? (n - base) : 7;
    size_t posMsb = out++;
    uint8_t msb = 0;
    for (size_t k = 0; k < quanti; k++) {
      uint8_t b = dati[base + k];
      if (b & 0x80) msb |= (1 << k);            // LSB-first
      fuori[out++] = b & 0x7f;
    }
    fuori[posMsb] = msb;
  }
  return out;
}

/** Ritorna la lunghezza del frame scritto in `fuori`. */
static size_t costruisci(uint8_t cmd, uint8_t sub,
                         const uint8_t* dati, size_t n, uint8_t* fuori) {
  uint8_t packed[64];
  size_t np = impacchetta(dati, n, packed);

  uint8_t checksum = 0;
  for (size_t i = 0; i < np; i++) checksum ^= packed[i];

  size_t out = 0;
  fuori[out++] = 0xf0;
  fuori[out++] = 0x01;
  fuori[out++] = seq;
  fuori[out++] = checksum;
  fuori[out++] = cmd;
  fuori[out++] = sub;
  for (size_t i = 0; i < np; i++) fuori[out++] = packed[i];
  fuori[out++] = 0xf7;

  if (++seq > 0x3e) seq = 0x01;
  return out;
}

static bool manda(const uint8_t* frame, size_t n) {
  if (!chScrittura) { Serial.println(F("non connesso")); return false; }
  Serial.print(F("  TX "));
  for (size_t i = 0; i < n; i++) Serial.printf("%02x ", frame[i]);
  Serial.println();
  // writeWithoutResponse e' l'unica modalita' che 0xFFC1 supporta: questa
  // chiamata riesce sempre lato nostro, anche se l'ampli scarta tutto.
  // L'unica verifica vera e' la risposta in RX.
  chScrittura->writeValue((uint8_t*)frame, n, false);
  return true;
}

/** 0x0138: [banco 0, slot]. Niente byte 0x00 finale, a differenza di 0x0115. */
static bool cambiaPreset(uint8_t slot) {
  uint8_t dati[2] = { 0x00, slot };
  uint8_t frame[32];
  size_t n = costruisci(0x01, 0x38, dati, sizeof(dati), frame);
  return manda(frame, n);
}

/* ======================================================================
   Connessione
   ====================================================================== */

class Scansione : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice d) override {
    if (d.haveServiceUUID() && d.isAdvertisingService(UUID_SERVIZIO)) {
      Serial.printf("trovato: %s  [%s]  rssi %d\n",
                    d.getName().c_str(), d.getAddress().toString().c_str(), d.getRSSI());
      BLEDevice::getScan()->stop();
      if (trovato) delete trovato;
      trovato = new BLEAdvertisedDevice(d);
    }
  }
};

static bool collega() {
  Serial.println(F("scansione..."));
  BLEScan* scan = BLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new Scansione());
  scan->setActiveScan(true);
  scan->setInterval(100);
  scan->setWindow(99);
  trovato = nullptr;
  scan->start(8, false);
  scan->clearResults();

  if (!trovato) { Serial.println(F("nessuno Spark: riprovo fra cinque secondi.")); return false; }

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

/* ======================================================================
   Il preset intero: 0x0101 sul buffer 0x7f, poi 0x0138 con 0x7f.

   Questo e' il pedale vero. I frame arrivano gia' pronti dall'app
   (preset_frames.h), il firmware non serializza niente: **corregge un byte
   solo**, il sequence number all'indice 2, perche' il checksum e' uno XOR
   dei soli byte impacchettati e quindi non lo copre.

   Tutti i chunk vanno con LO STESSO seq: e' cosi' che l'ampli li raggruppa,
   e incrementarlo gli fa vedere N messaggi scollegati che conferma tutti
   senza assemblarne nessuno.
   ====================================================================== */

static void mandaPreset(uint8_t n) {
  if (!chScrittura) { Serial.println(F("non connesso")); return; }
  if (n >= quantiPosti()) return;
  if (!postoPieno(n)) { Serial.printf("[%u] posto vuoto\n", n + 1); return; }

  const uint8_t quanti = chunkDelPosto(n);
  const uint8_t mio    = seq;
  if (++seq > 0x3e) seq = 0x01;

  inTrasferimento = true;
  silenzioso = true;
  const uint32_t t0 = millis();
  uint32_t ack = 0, persi = 0;

  for (uint8_t i = 0; i < quanti; i++) {
    uint8_t frame[64];
    uint8_t len = 0;
    const uint8_t* origine = frameDelPosto(n, i, len);
    if (len == 0 || len > sizeof(frame)) { persi++; continue; }
    memcpy(frame, origine, len);
    frame[2] = mio;                      // il checksum non copre il seq

    const uint32_t prima = rxTotali;
    chScrittura->writeValue(frame, len, false);
    const uint32_t t = millis();
    while (rxTotali == prima && millis() - t < 500) { leggiTasto(); delay(1); }
    // Un ack mancante non e' motivo di fermarsi: anche il firmware dell'ampli
    // si sblocca da solo dopo mezzo secondo, e interrompersi lascerebbe il
    // preset scritto a meta'.
    if (rxTotali > prima) ack++; else persi++;
  }
  silenzioso = false;
  inTrasferimento = false;

  cambiaPreset(0x7f);                    // fa suonare il buffer software
  const uint32_t tTotale = millis() - t0;

  Serial.printf("[%u] %s — %lu ms, %u/%u ack%s\n",
                n + 1, nomePosto(n), tTotale, ack, quanti,
                persi ? "  (ATTENZIONE: qualche chunk non confermato)" : "");
  corrente = n;
}

/** Chiede un preset. Non lo manda qui: lo raccoglie il loop, cosi' una
 *  pressione durante un trasferimento si accoda invece di ricorrere. */
static void richiedi(uint8_t n) {
  if (inCoda >= 0) pressioniPerse++;       // ne stava gia' aspettando una: vince l'ultima
  bersaglio = n % quantiPosti();
  inCoda = bersaglio;
  if (diagnostica)
    Serial.printf("  = accettata -> %s%s\n", nomePosto(bersaglio),
                  inTrasferimento ? "  (in coda, trasferimento in corso)" : "");
}

/** Si agisce alla pressione, non al rilascio. */
static void leggiTasto() {
  const bool livello = (digitalRead(PIN_TASTO) == HIGH);   // true = rilasciato

  if (livello != livelloGrezzo) {          // fronte grezzo, rimbalzi compresi
    livelloGrezzo = livello;
    ultimoFronte  = millis();
    frontiVisti++;
    if (diagnostica)
      Serial.printf("  ~ fronte %s  t=%lu\n", livello ? "su" : "GIU", millis());
    return;
  }
  if (livello == livelloFermo) return;                     // gia' registrato
  if (millis() - ultimoFronte < ANTIRIMBALZO) return;      // non ancora fermo

  livelloFermo = livello;
  if (livelloFermo) return;                                // rilascio: niente
  pressioniViste++;
  if (!bancoHaQualcosa()) {
    Serial.println(F("il banco caricato non ha nemmeno un preset: non c'e' niente da suonare"));
    return;
  }
  richiedi(prossimoPieno(bersaglio));
}

/* ======================================================================
   La misura: dieci cambi preset di fila, quanto ci mette il giro
   ====================================================================== */

static void misura() {
  if (!chScrittura) { Serial.println(F("non connesso")); return; }
  Serial.println(F("dieci cambi preset, alternando A1 e A2..."));
  uint32_t somma = 0, risposte = 0, minimo = 0xffffffff, massimo = 0;

  for (int i = 0; i < 10; i++) {
    uint32_t primaRx = rxTotali;
    uint32_t t0 = millis();
    cambiaPreset(i % 2);
    // aspetta l'ack, al massimo mezzo secondo
    while (rxTotali == primaRx && millis() - t0 < 500) delay(1);
    if (rxTotali > primaRx) {
      uint32_t giro = ultimoRx - t0;
      somma += giro; risposte++;
      if (giro < minimo)  minimo  = giro;
      if (giro > massimo) massimo = giro;
    }
    delay(120);
  }

  if (!risposte) {
    // rxTotali a zero vuol dire ampli muto o connessione morta; piu' di zero
    // vuol dire che parla e siamo noi a scartare. I due casi portano in
    // direzioni opposte, e senza il numero si vedono uguali.
    Serial.printf("nessuna risposta. RX totali dall'avvio: %u\n", rxTotali);
    return;
  }
  Serial.printf("giro medio %.1f ms  (min %u, max %u)  su %u risposte\n",
                (float)somma / risposte, minimo, massimo, risposte);
  // Stima, non misura: i chunk di un preset sono 39 byte invece di 10, e
  // l'ampli potrebbe digerirli piu' lentamente di un cambio preset. Il numero
  // vero si avra' solo mandando un preset intero.
  Serial.printf("stima di un preset intero (16 giri): ~%.0f ms\n", (float)somma / risposte * 16);
}

/* ====================================================================== */

static void elenco() {
  Serial.println(F(
    "\n  0..7  cambia preset sullo slot (A1..A4 = 0..3, B1..B4 = 4..7)\n"
    "  p     il prossimo preset del banco (come premere BOOT)\n"
    "  A..H  vai direttamente al preset 1..8\n"
    "  e     elenca il banco\n"
    "  d     accendi/spegni la diagnostica del tasto\n"
    "  c     contatori del tasto\n"
    "  m     misura il giro di andata e ritorno\n"
    "  v     chiedi intervallo 7,5 ms\n"
    "  w     chiedi intervallo 15 ms\n"
    "  s     chiedi intervallo lento (30 ms)\n"
    "  x     molla l'ampli (cosi' l'app nel browser lo trova)\n"
    "  r     riprendi l'ampli\n"));
}

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

class Collegamenti : public BLEServerCallbacks {
  void onConnect(BLEServer*)    override { appCollegata = true;  appEntrata = true; }
  void onDisconnect(BLEServer*) override { appCollegata = false; appUscita  = true; }
};

/** Le conseguenze dei collegamenti, eseguite fuori dal task BLE. */
static void sbrigaPonte() {
  if (appEntrata) {
    appEntrata = false;
    Serial.println(F("ponte: l'app si e' collegata, mollo l'ampli"));
    sganciato = true;
    if (client && client->isConnected()) client->disconnect();
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
  }
  if (appUscita) {
    appUscita = false;
    Serial.println(F("ponte: l'app se n'e' andata, riprendo l'ampli"));
    sganciato       = false;
    ultimoTentativo = 0;
    momentoSgancio  = millis();
    BLEDevice::startAdvertising();   // senza, il pedale sparisce per sempre
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
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(UUID_PONTE);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println(F("ponte avviato: il pedale si annuncia come \"SparkPedale\""));
}

void setup() {
  Serial.begin(115200);
  /* Senza questa, se al PC nessuno legge la porta ogni stampa resta appesa
   * fino a un timeout e il firmware striscia — e nel pedale vero, sul palco,
   * il PC non c'e'. Vedi CLAUDE.md, «Trappole dell'ambiente». */
  Serial.setTxTimeoutMs(0);
  delay(600);
  Serial.println(F("\nprova-ble — pedale Spark 2"));
  Serial.printf("banco di %u preset nel firmware. Premi BOOT per il prossimo.\n\n", BANCO_QUANTI);
  pinMode(PIN_TASTO, INPUT_PULLUP);
  banchiAvvia();
  // Se in memoria c'e' gia' un banco, il pedale riparte con quello: e' la
  // prova che e' autonomo, cioe' che sopravvive allo spegnimento.
  for (uint8_t s = 0; s < BANCHI_MAX; s++) {
    if (bancoCarica(s, bancoAttivo)) {
      Serial.printf("banco \"%s\" dallo slot %u\n", bancoAttivo.nome, s);
      break;
    }
  }
  BLEDevice::init("SparkPedale");
  avviaPonte();          // prima il server: cosi' l'app lo trova sempre
  collega();
}

void loop() {
  sbrigaPonte();
  sbrigaComandoPonte();

  if (client && !client->isConnected() && chScrittura) {
    Serial.println(F("connessione persa"));
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
  }
  // Dopo che l'app se n'e' andata l'ampli ci mette qualche secondo a
  // rimettersi ad annunciarsi, quindi il primo tentativo va spesso a vuoto:
  // per mezzo minuto si riprova fitto, poi si rallenta per non stare a
  // scansionare in eterno.
  if (!chScrittura && !sganciato) {
    const uint32_t attesa = (millis() - momentoSgancio < 30000) ? 2000 : 5000;
    if (millis() - ultimoTentativo > attesa) {
      ultimoTentativo = millis();
      collega();
    }
  }

  // La richiesta dell'intervallo, ripetuta a connessione matura: e' quella che
  // fa la differenza fra un secondo e mezzo e quattro decimi (vedi collega()).
  if (chScrittura && client && ripetizioniIntervallo < 2) {
    const uint32_t quando = ripetizioniIntervallo == 0 ? 600 : 2500;
    if (millis() - momentoConnesso > quando) {
      ripetizioniIntervallo++;
      client->updateConnParams(6, 6, 0, 400);
    }
  }

  leggiTasto();
  // La richiesta resta in coda **finche' non c'e' l'ampli**, invece di essere
  // buttata via. Mentre il pedale si sta riagganciando una pressione andava
  // persa e da fuori sembrava che il pedale ignorasse il piede: cosi' invece
  // il suono arriva appena si puo', ed e' il comportamento che serve sul palco.
  if (inCoda >= 0 && !inTrasferimento && chScrittura) {
    const uint8_t n = (uint8_t)inCoda;
    inCoda = -1;
    mandaPreset(n);
  }

  while (Serial.available()) {
    char c = Serial.read();
    if (c >= '0' && c <= '7') cambiaPreset(c - '0');
    else if (c == 'p') { if (bancoHaQualcosa()) richiedi(prossimoPieno(bersaglio));
                         else Serial.println(F("banco vuoto")); }
    // Maiuscole, non minuscole: 'a'..'h' si sovrapponeva a 'c', 'd' ed 'e',
    // che sono comandi, e «elenca il banco» finiva per caricare un preset.
    else if (c >= 'A' && c <= 'H') richiedi(c - 'A');       // preset 1..8 diretto
    else if (c == 'd') { diagnostica = !diagnostica;
                         Serial.printf("diagnostica del tasto: %s\n", diagnostica ? "accesa" : "spenta"); }
    else if (c == 'c') Serial.printf("tasto: %lu fronti grezzi, %lu pressioni accettate, "
                                     "%lu richieste sovrascritte in coda\n",
                                     frontiVisti, pressioniViste, pressioniPerse);
    else if (c == 'e') {
      Serial.printf("banco: %s\n", bancoAttivo.valido ? bancoAttivo.nome : "(quello del firmware)");
      for (uint8_t i = 0; i < quantiPosti(); i++)
        Serial.printf("  %u  %s%s\n", i + 1,
                      postoPieno(i) ? nomePosto(i) : "-",
                      i == corrente ? "   <- adesso" : "");
    }
    else if (c == 'b') { char el[180]; const uint8_t q = banchiElenca(el, sizeof(el));
                         Serial.printf("banchi in memoria: %u\n%s", q, el); }
    // Scambia gli slot 1 e 2: serve a provare bancoScambia senza passare
    // dall'app, cioe' a separare un difetto del firmware da uno dell'app.
    else if (c == 'w') Serial.printf("scambio slot 1<->2: %s\n",
                                     bancoScambia(0, 1) ? "fatto" : "fallito");
    else if (c == 'm') misura();
    // L'ampli sceglie DENTRO l'intervallo chiesto, e prende il massimo:
    // misurato il 14 agosto 2026, chiedendo 6-12 ha dato ~15 ms. Quindi si
    // chiede secco, min uguale a max.
    else if (c == 'v') chiediIntervallo(6, 6);       // 7,5 ms
    else if (c == 'w') chiediIntervallo(12, 12);     // 15 ms
    else if (c == 's') chiediIntervallo(24, 40);     // 30 - 50 ms
    else if (c == 'r') {
      sganciato = false;
      // Se e' gia' collegato, scansionare non serve e anzi confonde: l'ampli
      // connesso non si annuncia, quindi si leggerebbe «nessuno Spark».
      if (chScrittura) Serial.println(F("gia' collegato all'ampli"));
      else { momentoSgancio = millis(); collega(); }
    }
    else if (c == 'x') {
      sganciato = true;
      if (client && client->isConnected()) client->disconnect();
      chScrittura = chNotifiche = nullptr;
      Serial.println(F("sganciato: l'ampli e' libero, l'app puo' trovarlo. 'r' per riprenderlo."));
    }
    else if (c == '?') elenco();
  }
  // 2 ms, non 10: una battuta secca su un tattile puo' durare pochi
  // millisecondi, e con un polling lento la si perde e basta.
  delay(2);
}
