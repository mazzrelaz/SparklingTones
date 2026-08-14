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

/* --- GATT dello Spark: service 0xFFC0, write 0xFFC1, notify 0xFFC2 ------ */
static BLEUUID UUID_SERVIZIO((uint16_t)0xFFC0);
static BLEUUID UUID_SCRITTURA((uint16_t)0xFFC1);
static BLEUUID UUID_NOTIFICHE((uint16_t)0xFFC2);

static BLEAdvertisedDevice* trovato    = nullptr;
static BLEClient*           client     = nullptr;
static BLERemoteCharacteristic* chScrittura = nullptr;
static BLERemoteCharacteristic* chNotifiche = nullptr;

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

  if (!trovato) { Serial.println(F("nessuno Spark. Acceso? Gia' connesso a un telefono?")); return false; }

  client = BLEDevice::createClient();
  if (!client->connect(trovato)) { Serial.println(F("connessione fallita")); return false; }

  BLERemoteService* servizio = client->getService(UUID_SERVIZIO);
  if (!servizio) { Serial.println(F("servizio 0xFFC0 assente")); client->disconnect(); return false; }

  chScrittura = servizio->getCharacteristic(UUID_SCRITTURA);
  chNotifiche = servizio->getCharacteristic(UUID_NOTIFICHE);
  if (!chScrittura || !chNotifiche) { Serial.println(F("caratteristiche assenti")); client->disconnect(); return false; }

  chNotifiche->registerForNotify(alArrivo);
  Serial.printf("connesso, MTU %d\n", client->getMTU());
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

static void mandaPreset() {
  if (!chScrittura) { Serial.println(F("non connesso")); return; }

  const uint8_t mio = seq;
  if (++seq > 0x3e) seq = 0x01;

  Serial.printf("invio %u chunk con seq 0x%02x...\n", PRESET_QUANTI, mio);
  silenzioso = true;
  const uint32_t t0 = millis();
  uint32_t ack = 0, persi = 0;

  for (uint8_t i = 0; i < PRESET_QUANTI; i++) {
    uint8_t frame[64];
    memcpy(frame, PRESET_FRAME[i], PRESET_LUNGH[i]);
    frame[2] = mio;

    const uint32_t prima = rxTotali;
    chScrittura->writeValue(frame, PRESET_LUNGH[i], false);
    const uint32_t t = millis();
    while (rxTotali == prima && millis() - t < 500) delay(1);
    // Un ack mancante non e' motivo di fermarsi: anche il firmware dell'ampli
    // si sblocca da solo dopo mezzo secondo, e interrompersi lascerebbe il
    // preset scritto a meta'.
    if (rxTotali > prima) ack++; else persi++;
  }
  const uint32_t tTrasferimento = millis() - t0;
  silenzioso = false;

  cambiaPreset(0x7f);                    // fa suonare il buffer software
  const uint32_t tTotale = millis() - t0;

  Serial.printf("trasferimento %lu ms, con lo 0x0138 %lu ms — %u ack, %u persi\n",
                tTrasferimento, tTotale, ack, persi);
  Serial.println(F("l'ampli dovrebbe suonare \"DG - Shine On  clean\", col LED che lampeggia."));
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
    "  p     manda un preset intero sul buffer software e lo fa suonare\n"
    "  m     misura il giro di andata e ritorno\n"
    "  v     chiedi intervallo 7,5 ms\n"
    "  w     chiedi intervallo 15 ms\n"
    "  s     chiedi intervallo lento (30 ms)\n"
    "  r     ricollega\n"));
}

void setup() {
  Serial.begin(115200);
  delay(600);
  Serial.println(F("\nprova-ble — pedale Spark 2\n"));
  BLEDevice::init("pedale-prova");
  collega();
}

void loop() {
  if (client && !client->isConnected() && chScrittura) {
    Serial.println(F("connessione persa"));
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
  }

  while (Serial.available()) {
    char c = Serial.read();
    if (c >= '0' && c <= '7') cambiaPreset(c - '0');
    else if (c == 'p') mandaPreset();
    else if (c == 'm') misura();
    // L'ampli sceglie DENTRO l'intervallo chiesto, e prende il massimo:
    // misurato il 14 agosto 2026, chiedendo 6-12 ha dato ~15 ms. Quindi si
    // chiede secco, min uguale a max.
    else if (c == 'v') chiediIntervallo(6, 6);       // 7,5 ms
    else if (c == 'w') chiediIntervallo(12, 12);     // 15 ms
    else if (c == 's') chiediIntervallo(24, 40);     // 30 - 50 ms
    else if (c == 'r') collega();
    else if (c == '?') elenco();
  }
  delay(10);
}
