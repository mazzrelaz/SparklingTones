/*
 * prova-midi — la scheda si finge una pedaliera BLE-MIDI
 * ======================================================
 *
 * Non c'entra niente con lo Spark: serve a rispondere a UNA domanda, che e'
 * quella che decide se la "modalita' MIDI" del pedale si puo' fare o no:
 *
 *     Windows vede un dispositivo BLE-MIDI, e AmpliTube lo sente?
 *
 * Perche' la domanda esiste: Windows non ha mai esposto il BLE-MIDI ai
 * programmi come una normale porta MIDI. Su macOS e iOS e' nativo, qui no.
 * O funziona col nuovo stack MIDI di Windows, o serve un ponte in mezzo, o
 * si ripiega sul MIDI seriale via cavo. Questo sketch lo misura in venti
 * minuti senza comprare niente.
 *
 * Niente pin collegati, niente librerie da installare: BLEDevice.h arriva
 * col pacchetto schede esp32, come in prova-ble.
 *
 * Il dispositivo si annuncia come "SparkPedale MIDI" ed espone il servizio
 * BLE-MIDI standard (03B80E5A-...), lo stesso che usano le pedaliere vere e
 * lo stesso che Chrome tiene in blocklist per Web Bluetooth.
 *
 * Comandi dal monitor seriale (invio a fine riga):
 *   0..7   Program Change 0..7 sul canale 1   <- i preset di AmpliTube
 *   c      Control Change 80, alterna 127 e 0 <- gli stomp on/off
 *   n      una nota (Do centrale): la cosa piu' facile da vedere in un monitor
 *   a      manda una nota ogni due secondi, da solo. Ripremere per fermare.
 *   ?      questo elenco
 *
 * Nota sull'annuncio: il pacchetto di advertising sono 31 byte, e il solo
 * UUID a 128 bit ne mangia 18. Col nome dentro non ci si sta, quindi
 * setScanResponse(true) sposta il nome nella risposta alla scansione.
 * Senza, l'annuncio non parte e la scheda resta invisibile.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLESecurity.h>

#define SERVIZIO_MIDI   "03B80E5A-EDE8-4B33-A751-6CE34EC4C700"
#define CARATTERISTICA  "7772E5DB-3868-4112-A1A9-F2669D106BF3"

static BLECharacteristic* carat = nullptr;
static volatile bool connesso   = false;
static volatile bool cadutaLinea = false;   // la bandiera: il lavoro lo fa loop()

static bool     automatico = false;
static uint32_t prossimaNota = 0;
static bool     ccAcceso = false;

/* I callback BLE non fanno operazioni BLE: alzano una bandiera e basta.
 * startAdvertising() dentro onDisconnect blocca lo stack per decine di
 * secondi — e' la trappola pagata sul pedale vero. */
class Sessione : public BLEServerCallbacks {
  void onConnect(BLEServer*) override    { connesso = true;  Serial.println(F("[BLE] qualcuno si e' collegato")); }
  void onDisconnect(BLEServer*) override { connesso = false; cadutaLinea = true; Serial.println(F("[BLE] scollegato")); }
};

/** Un messaggio MIDI incartato come vuole il BLE-MIDI: due byte di
 *  marcatura temporale a 13 bit, poi il messaggio vero. Il primo byte porta
 *  i 6 bit alti del tempo, il secondo i 7 bassi, tutti e due con il bit 7
 *  alto. Senza quei due byte il messaggio viene buttato via in silenzio. */
static void mandaMidi(uint8_t stato, uint8_t dato1, int dato2) {
  if (!connesso || carat == nullptr) { Serial.println(F("  (nessuno collegato: non mando niente)")); return; }

  const uint16_t t = (uint16_t)(millis() & 0x1FFF);
  uint8_t p[5];
  uint8_t n = 0;
  p[n++] = (uint8_t)(0x80 | ((t >> 7) & 0x3F));
  p[n++] = (uint8_t)(0x80 | (t & 0x7F));
  p[n++] = stato;
  p[n++] = dato1;
  if (dato2 >= 0) p[n++] = (uint8_t)dato2;

  carat->setValue(p, n);
  carat->notify();
}

static void nota() {
  Serial.println(F("-> nota Do centrale (60), canale 1"));
  mandaMidi(0x90, 60, 100);     // note on
  delay(120);
  mandaMidi(0x80, 60, 0);       // note off
}

static void elenco() {
  Serial.println(F("\n  0..7  Program Change 0..7   c  Control Change 80 (alterna)"));
  Serial.println(F("  n     una nota              a  nota ogni 2 s, da solo"));
  Serial.println(F("  ?     questo elenco\n"));
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println(F("\n=== prova-midi: la scheda si finge una pedaliera BLE-MIDI ==="));

  BLEDevice::init("SparkPedale MIDI");
  /* Senza questo Windows dice "non accoppiabile" e il dispositivo non compare
   * nella finestra Aggiungi dispositivo: li dentro ci finiscono solo quelli che
   * si possono accoppiare. Bonding senza codice e senza schermo (Just Works). */
  BLESecurity::setAuthenticationMode(true, false, true);   // bonding, niente MITM, secure connections
  BLESecurity::setCapability(ESP_IO_CAP_NONE);
  BLESecurity::setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);
  BLESecurity::setRespEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new Sessione());

  BLEService* servizio = server->createService(SERVIZIO_MIDI);
  carat = servizio->createCharacteristic(
      CARATTERISTICA,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_WRITE_NR |
      BLECharacteristic::PROPERTY_NOTIFY);
  servizio->start();

  BLEAdvertising* annuncio = BLEDevice::getAdvertising();
  annuncio->addServiceUUID(SERVIZIO_MIDI);
  annuncio->setScanResponse(true);          // il nome va li', vedi l'intestazione
  BLEDevice::startAdvertising();

  Serial.println(F("Mi annuncio come 'SparkPedale MIDI'. Cercalo dal Bluetooth di Windows."));
  elenco();
}

void loop() {
  if (cadutaLinea) {
    cadutaLinea = false;
    delay(200);
    BLEDevice::startAdvertising();
    Serial.println(F("[BLE] mi riannuncio"));
  }

  if (automatico && millis() >= prossimaNota) {
    prossimaNota = millis() + 2000;
    nota();
  }

  while (Serial.available()) {
    const int c = Serial.read();
    if (c >= '0' && c <= '7') {
      Serial.print(F("-> Program Change ")); Serial.println(c - '0');
      mandaMidi(0xC0, (uint8_t)(c - '0'), -1);
    } else if (c == 'c') {
      ccAcceso = !ccAcceso;
      Serial.print(F("-> Control Change 80 = ")); Serial.println(ccAcceso ? 127 : 0);
      mandaMidi(0xB0, 80, ccAcceso ? 127 : 0);
    } else if (c == 'n') {
      nota();
    } else if (c == 'a') {
      automatico = !automatico;
      prossimaNota = millis();
      Serial.println(automatico ? F("[auto] una nota ogni 2 s") : F("[auto] fermo"));
    } else if (c == '?') {
      elenco();
    }
  }
}
