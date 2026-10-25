/*
 * prova-controlx — il pedale che si finge uno Spark Control X (24 ottobre 2026)
 *
 * Perche': il wah manuale dello Spark 2 non e' un parametro del preset (provati
 * tutti gli indici di JH.Vox846, in tutte le modalita', con lo stato giusto
 * che suonava). Col Control X lo fa l'ampli stesso: **lo Spark 2 si collega
 * lui al Control X** (servizio FFC8, il Control X fa da periferica) e riceve
 * la posizione dei pedali d'espressione col messaggio 0x0C. Cosa ne fa lo
 * decide la mappa del profilo che il Control X gli racconta: 0x70 «Expression
 * Wah LFO», 0x72 «Expression Volume».
 *
 * Tutto da paulhamsh/Spark-Control-X (README e SparkControl.cpp, emulatore
 * su ESP32 con NimBLE-Arduino): annuncio, servizi, risposte. Qui con la
 * libreria BLE del core (NimBLE sotto), la stessa di prova-ble.
 *
 * E' una prova a parte: niente ampli in FFC0, niente footswitch ne' display.
 * Finita, sul pedale si ricarica prova-ble.
 *
 * Come si prova: preset con l'Auto Wah nello slot COMP/WAH, tasto di
 * accoppiamento dello Spark 2 tenuto premuto, l'ampli si collega; poi dal
 * seriale (tools/wah.html col ponte) «#x <exp1> <exp2>», 0..65535 ciascuno.
 *
 * Dal seriale, una riga per comando, col '#' davanti come in prova-ble:
 *   #x a b    manda 0x0C: pedale 1 = a, pedale 2 = b (0..65535)
 *   #ins n    manda 0x0D: pedali inseriti (0 nessuno, 1, 2, 3 tutti e due)
 *   #mappa a b   il profilo dice: pedale 1 fa a, pedale 2 fa b (hex, 70 72 75)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <host/ble_hs.h>

static const char* FIRMWARE = "F4.1.19";        // quello del Control X di paulhamsh

static BLECharacteristic* chVersoAmpli = nullptr; // FFCA: notify, dal pedale all'ampli
static volatile bool ampliDentro = false, ampliEntrato = false, ampliUscito = false;
static char     indirizzoCasuale[18] = "?";
static uint32_t domande = 0;                    // messaggi arrivati dall'ampli

/* La mappa del profilo 1 (SparkControl.cpp): sei pulsanti, poi i due pedali
 * d'espressione. Di serie 0x72 e 0x75 (volume, volume della musica): qui il
 * primo fa il wah. */
static uint8_t mappa[8] = { 0x00, 0x01, 0x0C, 0x02, 0x03, 0x08, 0x70, 0x72 };

/* I messaggi dell'ampli arrivano nel task BLE: si copiano in una coda e li
 * sbriga il loop (mai operazioni BLE dentro un callback BLE). */
static const uint8_t CODA = 16, LUNG = 50;
static uint8_t  coda[CODA][LUNG];
static uint8_t  codaN[CODA];
static volatile uint8_t testa = 0, fondo = 0;

static void stampaHex(const char* cosa, const uint8_t* d, size_t n) {
  Serial.print(cosa);
  for (size_t i = 0; i < n; i++) Serial.printf("%02x ", d[i]);
  Serial.println();
}

class DallAmpli : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    const uint8_t* d = c->getData();
    size_t n = c->getLength();
    const uint8_t prossimo = (uint8_t)((fondo + 1) % CODA);
    if (!n || prossimo == testa) return;                 // coda piena: si perde
    if (n > LUNG) n = LUNG;
    memcpy(coda[fondo], d, n);
    codaN[fondo] = (uint8_t)n;
    fondo = prossimo;
  }
};

class Collegamenti : public BLEServerCallbacks {
  void onConnect(BLEServer*) override    { ampliDentro = true;  ampliEntrato = true; }
  void onDisconnect(BLEServer*) override { ampliDentro = false; ampliUscito = true; }
};

static void manda(const uint8_t* d, size_t n) {
  // Le posizioni dei pedali (0x0C) arrivano venti volte al secondo: sul
  // seriale una ogni secondo basta (25 ottobre: il programma si e' bloccato
  // dopo qualche minuto di cursore, causa da capire; meno stampa, meno dubbi).
  static uint32_t ultima0c = 0;
  if (d[0] != 0x0c || millis() - ultima0c > 1000) {
    stampaHex("  al-ampli ", d, n);
    if (d[0] == 0x0c) ultima0c = millis();
  }
  if (!chVersoAmpli || !ampliDentro) { Serial.println(F("  (nessun ampli collegato)")); return; }
  chVersoAmpli->setValue((uint8_t*)d, n);
  chVersoAmpli->notify();
}

/** Le risposte del Control X alle domande dell'ampli (process_message). */
static void rispondi(const uint8_t* m, size_t n) {
  domande++;
  stampaHex("dall-ampli ", m, n);
  uint8_t r[LUNG] = { 0 };
  r[0] = m[0];
  switch (m[0]) {
    case 0x0b:                                           // versione del firmware
      memcpy(r + 5, FIRMWARE, strlen(FIRMWARE));
      manda(r, 6 + strlen(FIRMWARE));
      break;
    case 0x0d: r[4] = 0x03; manda(r, 5); break;          // pedali inseriti: tutti e due
    case 0x08: r[4] = 0x01; manda(r, 5); break;          // profilo corrente: 1
    case 0x0f: r[4] = 0x60; manda(r, 5); break;          // batteria 96%
    case 0x10: case 0x11: r[4] = 0x00; manda(r, 5); break;   // ignoti, si risponde 0
    case 0x14:                                           // mappa del profilo
      r[4] = n > 4 ? m[4] : 1;
      memcpy(r + 5, mappa, 8);
      manda(r, 13);
      break;
    case 0x12: {                                         // nome del profilo
      r[4] = n > 4 ? m[4] : 1;
      const char* nome = "Profile #1";
      memcpy(r + 5, nome, strlen(nome) + 1);
      manda(r, 25);
      break;
    }
    default: break;                                      // luci (0x01), 0x03, 0x04, 0x07, 0x15: niente
  }
}

/* ---- il seriale ---- */

static char riga[40];
static int8_t lungRiga = -1;

static void mandaEspressione(uint16_t a, uint16_t b) {
  // 0c 00 00 00 01 <a basso> <a alto> 02 <b basso> <b alto> (send_slider_info)
  const uint8_t d[10] = { 0x0c, 0, 0, 0, 0x01, (uint8_t)(a & 0xff), (uint8_t)(a >> 8),
                          0x02, (uint8_t)(b & 0xff), (uint8_t)(b >> 8) };
  manda(d, sizeof(d));
}

static void eseguiRiga() {
  unsigned a, b;
  if (sscanf(riga, "x %u %u", &a, &b) == 2 && a <= 65535 && b <= 65535) mandaEspressione(a, b);
  else if (sscanf(riga, "ins %u", &a) == 1 && a <= 3) { const uint8_t d[5] = { 0x0d, 0, 0, 0, (uint8_t)a }; manda(d, 5); }
  else if (sscanf(riga, "mappa %x %x", &a, &b) == 2) { mappa[6] = a; mappa[7] = b;
                                                       Serial.printf("mappa: pedale 1 = %02x, pedale 2 = %02x\n", a, b); }
  else Serial.printf("riga non capita: \"%s\"\n", riga);
}

static void leggiSeriale() {
  while (Serial.available()) {
    const char c = Serial.read();
    if (lungRiga < 0) {
      if (c == '#') lungRiga = 0;
      else if (c == 'r') Serial.println(F("prova-controlx: sono il Control X finto"));
      // Lo stato: i messaggi dell'avvio si perdono prima che il ponte apra la porta.
      else if (c == 'i') Serial.printf("annuncio %s, indirizzo %s (casuale %s), ampli %s, %u domande ricevute\n",
                                       BLEDevice::getAdvertising()->isAdvertising() ? "acceso" : "SPENTO",
                                       BLEDevice::getAddress().toString().c_str(), indirizzoCasuale,
                                       ampliDentro ? "collegato" : "non collegato", domande);
      continue;
    }
    if (c == '\n' || c == '\r') { riga[lungRiga] = 0; lungRiga = -1; eseguiRiga(); continue; }
    if (lungRiga < (int8_t)sizeof(riga) - 1) riga[lungRiga++] = c;
  }
}

/* ---- l'annuncio, byte per byte quello di paulhamsh ---- */

static void avviaControlX() {
  BLEDevice::init("SparkX");

  // Indirizzo casuale statico: per paulhamsh «critico» per farsi trovare.
  // Prima l'indirizzo, poi il tipo: setOwnAddrType controlla che ci sia gia'.
  ble_addr_t a;
  if (ble_hs_id_gen_rnd(0, &a) == 0) BLEDevice::setOwnAddr(a.val);   // 0: statico, non risolvibile
  if (!BLEDevice::setOwnAddrType(BLE_OWN_ADDR_RANDOM)) Serial.println(F("indirizzo casuale non impostato"));
  snprintf(indirizzoCasuale, sizeof(indirizzoCasuale), "%02x:%02x:%02x:%02x:%02x:%02x",
           a.val[5], a.val[4], a.val[3], a.val[2], a.val[1], a.val[0]);
  Serial.printf("indirizzo casuale: %s\n", indirizzoCasuale);

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new Collegamenti());

  BLEService* info = server->createService("180a");
  auto testo = [&](const char* uuid, const char* t) {
    BLECharacteristic* c = info->createCharacteristic(uuid, BLECharacteristic::PROPERTY_READ);
    c->setValue((uint8_t*)t, strlen(t));
  };
  testo("2a29", "AirTurn");
  testo("2a24", "SparkX");
  testo("2a27", "H8.0.0");
  testo("2a26", "F4.1.23");
  testo("2a25", "DE7BB0214A180767");
  const uint8_t pnp[7] = { 0x01, 0x22, 0x01, 0x12, 0x00, 0x01, 0x00 };
  info->createCharacteristic("2a50", BLECharacteristic::PROPERTY_READ)->setValue((uint8_t*)pnp, 7);
  info->start();

  BLEService* batteria = server->createService("180f");
  uint8_t livello = 80;
  batteria->createCharacteristic("2a19", BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY)
          ->setValue(&livello, 1);
  batteria->start();

  BLEService* x = server->createService("ffc8");
  x->createCharacteristic("ffc9", BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR)
   ->setCallbacks(new DallAmpli());
  chVersoAmpli = x->createCharacteristic("ffca", BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  x->start();

  // Annuncio: flag, dati del costruttore 0x0122 «00 12», il servizio MIDI da
  // 128 bit; risposta alla scansione: il nome e l'aspetto 0x03c1.
  char annuncio[] = { 0x02, 0x01, 0x06,
                      0x05, (char)0xff, 0x22, 0x01, 0x00, 0x12,
                      0x11, 0x07, 0x00, (char)0xc7, (char)0xc4, 0x4e, (char)0xe3, 0x6c, 0x51, (char)0xa7,
                      0x33, 0x4b, (char)0xe8, (char)0xed, 0x5a, 0x0e, (char)0xb8, 0x03 };
  char risposta[] = { 0x14, 0x09, 'S', 'p', 'a', 'r', 'k', 'X', ' ', 'v', '4', '.', '1', '.', '2', '3',
                      ' ', 'b', 'a', 'e', '3',
                      0x03, 0x19, (char)0xc1, 0x03 };
  BLEAdvertisementData dati, scansione;
  dati.addData(annuncio, sizeof(annuncio));
  scansione.addData(risposta, sizeof(risposta));
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->setAdvertisementData(dati);
  adv->setScanResponseData(scansione);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println(F("Control X finto: mi annuncio. Tieni premuto il tasto di accoppiamento dello Spark 2."));
}

void setup() {
  Serial.begin(115200);
  Serial.setTxTimeoutMs(0);
  delay(600);
  Serial.println(F("\nprova-controlx — il pedale che si finge uno Spark Control X"));
  avviaControlX();
}

void loop() {
  while (testa != fondo) {
    rispondi(coda[testa], codaN[testa]);
    testa = (uint8_t)((testa + 1) % CODA);
  }
  // Il Control X vero avvisa quando si infila il jack (0x0D): il nostro lo
  // diceva solo se chiesto, e l'onda dell'Auto Wah restava (25 ottobre).
  // Si prova a dirlo da soli, un attimo dopo l'aggancio.
  static uint32_t avvisoJack = 0;
  if (ampliEntrato) { ampliEntrato = false; avvisoJack = millis() + 3000;
                      Serial.println(F("l'ampli si e' collegato")); }
  if (avvisoJack && (int32_t)(millis() - avvisoJack) > 0) {
    avvisoJack = 0;
    if (ampliDentro) { const uint8_t d[5] = { 0x0d, 0, 0, 0, 0x03 }; manda(d, 5); }
  }
  if (ampliUscito)  { ampliUscito = false;  Serial.println(F("l'ampli se n'e' andato: mi riannuncio"));
                      BLEDevice::startAdvertising(); }
  leggiSeriale();
  delay(2);
}
