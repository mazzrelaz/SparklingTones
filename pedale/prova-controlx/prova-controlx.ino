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
 *   #ampli    il doppio ruolo (25 ottobre): si collega anche lui all'ampli su
 *             FFC0, come prova-ble, per suonare i preset
 *   #slot n   0x0138 sullo slot n (0..7), col collegamento di #ampli
 *   #modo w   il pedale d'espressione vero sul wah (EXP1); #modo v sul volume (EXP2)
 *   #pedale   la lettura del pedale vero: mV, posizione, jack, modo
 *   #curva c  il volume segue la posizione elevata a c (di serie 1)
 *   #scala n  il volume a punta (di serie 32767)
 *
 * Il doppio ruolo: per i preset il pedale e' il centrale e si collega
 * all'ampli; per il Control X e' l'ampli a collegarsi al pedale. Due
 * collegamenti fra gli stessi due apparecchi: si tengono distinti con due
 * indirizzi, **quello vero per i preset, il casuale per il Control X**. La
 * libreria del core ha un interruttore solo (m_ownAddrType), letto quando la
 * connessione o l'annuncio partono: si mette a pubblico prima di scansione e
 * connessione e si rimette a casuale subito dopo, prima di ogni annuncio.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <host/ble_hs.h>

static const char* FIRMWARE = "F4.1.19";        // quello del Control X di paulhamsh

static BLECharacteristic* chVersoAmpli = nullptr; // FFCA: notify, dal pedale all'ampli
static volatile bool ampliDentro = false, ampliEntrato = false, ampliUscito = false;
static char     indirizzoCasuale[18] = "?";
static uint32_t domande = 0;                    // messaggi arrivati dall'ampli
static bool     jackDentro = false;              // il pedale d'espressione vero (D8)

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
    case 0x0d: r[4] = jackDentro ? 0x03 : 0x00; manda(r, 5); break;   // pedali inseriti: dal jack
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

/* ---- il doppio ruolo: l'ampli su FFC0, come prova-ble ---- */

static BLEUUID UUID_SPARK((uint16_t)0xFFC0), UUID_SCRIVI((uint16_t)0xFFC1), UUID_ASCOLTA((uint16_t)0xFFC2);
static BLEClient*               client = nullptr;
static BLERemoteCharacteristic* chPreset = nullptr;     // FFC1 dell'ampli
static BLEAdvertisedDevice*     trovato = nullptr;
static volatile bool            cercaAmpli = false, scansioneFinita = false;
static uint8_t                  seq = 1;
static volatile uint32_t        notificheFFC0 = 0;

class TrovaAmpli : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice d) override {
    if (trovato || !d.haveServiceUUID() || !d.isAdvertisingService(UUID_SPARK)) return;
    Serial.printf("trovato: %s [%s] rssi %d\n", d.getName().c_str(), d.getAddress().toString().c_str(), d.getRSSI());
    trovato = new BLEAdvertisedDevice(d);
    BLEDevice::getScan()->stop();
  }
};
static void fineScansione(BLEScanResults) { scansioneFinita = true; }

static void dallAmpliFFC0(BLERemoteCharacteristic*, uint8_t* d, size_t n, bool) {
  notificheFFC0++;
  // Solo gli ack corti: i pezzi dei preset sarebbero rumore.
  if (n <= 10) stampaHex("  ffc0<- ", d, n);
}

static void indirizzoPubblico(bool si) {
  if (!BLEDevice::setOwnAddrType(si ? BLE_OWN_ADDR_PUBLIC : BLE_OWN_ADDR_RANDOM))
    Serial.println(F("cambio di indirizzo rifiutato"));
}

static void avviaRicercaAmpli() {
  if (client && client->isConnected()) { Serial.println(F("ampli FFC0 gia' collegato")); return; }
  if (trovato) { delete trovato; trovato = nullptr; }
  indirizzoPubblico(true);                       // scansione e connessione: l'indirizzo vero
  BLEScan* scan = BLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new TrovaAmpli());
  scan->setActiveScan(true);
  scansioneFinita = false;
  if (!scan->start(6, fineScansione, false)) { Serial.println(F("scansione non partita")); indirizzoPubblico(false); return; }
  cercaAmpli = true;
  Serial.println(F("cerco l'ampli per i preset (indirizzo vero)..."));
}

/** Dal loop: a ricerca finita si aggancia, poi si torna all'indirizzo casuale. */
static void sbrigaRicercaAmpli() {
  if (!cercaAmpli || (!trovato && !scansioneFinita)) return;
  if (trovato && !scansioneFinita) { BLEDevice::getScan()->stop(); }
  cercaAmpli = false;
  BLEDevice::getScan()->clearResults();
  bool ok = false;
  if (!trovato) Serial.println(F("ampli non trovato (FFC0)"));
  else {
    if (!client) client = BLEDevice::createClient();
    if (!client->connect(trovato)) Serial.println(F("connessione FFC0 fallita"));
    else {
      BLERemoteService* s = client->getService(UUID_SPARK);
      chPreset = s ? s->getCharacteristic(UUID_SCRIVI) : nullptr;
      BLERemoteCharacteristic* n = s ? s->getCharacteristic(UUID_ASCOLTA) : nullptr;
      if (!chPreset || !n) { Serial.println(F("FFC0 senza caratteristiche")); client->disconnect(); chPreset = nullptr; }
      else { n->registerForNotify(dallAmpliFFC0); ok = true; }
    }
  }
  indirizzoPubblico(false);                      // da qui in poi l'annuncio e' del Control X
  Serial.printf("FFC0: %s; Control X: %s\n", ok ? "COLLEGATO" : "no",
                ampliDentro ? "collegato" : "non collegato");
  if (!ampliDentro && !BLEDevice::getAdvertising()->isAdvertising()) BLEDevice::startAdvertising();
}

static size_t impacchetta(const uint8_t* dati, size_t n, uint8_t* fuori) {
  size_t out = 0;
  for (size_t base = 0; base < n; base += 7) {
    const size_t quanti = (n - base < 7) ? (n - base) : 7;
    const size_t posMsb = out++;
    uint8_t msb = 0;
    for (size_t k = 0; k < quanti; k++) {
      if (dati[base + k] & 0x80) msb |= (1 << k);
      fuori[out++] = dati[base + k] & 0x7f;
    }
    fuori[posMsb] = msb;
  }
  return out;
}

/** 0x0138 [banco 0, slot], come cambiaPreset di prova-ble (niente 0x00 in coda). */
static void cambiaSlot(uint8_t slot) {
  if (!chPreset || !client || !client->isConnected()) { Serial.println(F("FFC0 non collegato: prima #ampli")); return; }
  const uint8_t dati[2] = { 0x00, slot };
  uint8_t packed[8];
  const size_t np = impacchetta(dati, 2, packed);
  uint8_t f[16], n = 0, cs = 0;
  for (size_t i = 0; i < np; i++) cs ^= packed[i];
  f[n++] = 0xf0; f[n++] = 0x01; f[n++] = seq; f[n++] = cs; f[n++] = 0x01; f[n++] = 0x38;
  for (size_t i = 0; i < np; i++) f[n++] = packed[i];
  f[n++] = 0xf7;
  if (++seq > 0x3e) seq = 1;
  stampaHex("  ffc0-> ", f, n);
  chPreset->writeValue(f, n, false);
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

/* ---- il pedale d'espressione vero (29 ottobre 2026) ----
 * M-Audio EX-P sulla presa H: il cursore su D2, da 0 mV a tallone a ~3040 a
 * punta (misurato il 29 ottobre con prova-ble 2.31); il jack su D8, la
 * lamella della manica col pull-up: basso = presa vuota, alto = infilato.
 * Venti letture al secondo, come i 0x0C del Control X vero; si manda solo
 * se la posizione si e' mossa. Due modi, dal seriale: «#modo w» il wah su
 * EXP1 (0..32767: oltre si richiude, misurato il 25 ottobre) col volume
 * pieno su EXP2; «#modo v» il volume su EXP2 (0..32767, oltre resta pieno) col
 * wah chiuso. La scelta per preset verra' dopo, in prova-ble. */
static const uint8_t  PIN_ESPRESSIONE = D2;
static const uint8_t  PIN_JACK        = D8;
static const uint32_t ESPR_OGNI       = 50;
static const uint16_t ESPR_FERMO      = 300;     // passi della scala: sotto, non si manda
static uint16_t esprTallone = 40, esprPunta = 3000;   // mV, si allargano da soli se serve
static char     modo = 'w';
/* Il volume (29 ottobre): dritto su 0..65535 «fa quasi tutto vicino al
 * tallone» (l'utente). Misurato a gradini: basso a 8192, medio a 16384, pieno
 * a 32767, e oltre non cambia: la scala e' 0..32767 come il wah. Dritto, senza
 * curva, «meglio» e l'utente lo tiene cosi'. Curva e fondo scala restano
 * regolabili dal seriale. */
static float    curvaVolume = 1.0f;
static uint16_t scalaVolume = 32767;
static int32_t  ultimaMandata = -1;

/** La lettura di D2 riportata su 0..1. */
static float posizionePedale(uint16_t* mv) {
  uint32_t somma = 0;
  for (uint8_t i = 0; i < 16; i++) somma += analogReadMilliVolts(PIN_ESPRESSIONE);
  *mv = (uint16_t)(somma / 16);
  if (*mv < esprTallone) esprTallone = *mv;
  if (*mv > esprPunta) esprPunta = *mv;
  return (*mv - esprTallone) / (float)(esprPunta - esprTallone);
}

static void mandaPedale(float p, bool sempre) {
  const uint16_t wah = (uint16_t)(p * 32767 + 0.5f), volume = (uint16_t)(powf(p, curvaVolume) * scalaVolume + 0.5f);
  const int32_t v = modo == 'w' ? wah : volume;
  const int32_t soglia = modo == 'w' ? ESPR_FERMO : 2 * ESPR_FERMO;
  if (!sempre && ultimaMandata >= 0 && abs(v - ultimaMandata) < soglia) return;
  ultimaMandata = v;
  if (modo == 'w') mandaEspressione(wah, 65535);
  else mandaEspressione(0, volume);
}

static void passoPedale() {
  static uint32_t da = 0;
  if (millis() - da < ESPR_OGNI) return;
  da = millis();
  // Il jack: deve restare uguale per due letture di fila (100 ms).
  static bool grezzoPrima = false;
  const bool grezzo = digitalRead(PIN_JACK);
  if (grezzo == grezzoPrima && grezzo != jackDentro) {
    jackDentro = grezzo;
    Serial.printf("jack %s\n", jackDentro ? "infilato" : "tolto");
    if (ampliDentro) {
      if (!jackDentro) mandaEspressione(0, 65535);        // tolto il pedale: wah chiuso, volume pieno
      const uint8_t d[5] = { 0x0d, 0, 0, 0, (uint8_t)(jackDentro ? 0x03 : 0x00) };
      manda(d, 5);
    }
    ultimaMandata = -1;
  }
  grezzoPrima = grezzo;
  if (!jackDentro || !ampliDentro) return;
  uint16_t mv;
  mandaPedale(posizionePedale(&mv), false);
}

static void eseguiRiga() {
  unsigned a, b;
  if (sscanf(riga, "x %u %u", &a, &b) == 2 && a <= 65535 && b <= 65535) mandaEspressione(a, b);
  else if (sscanf(riga, "ins %u", &a) == 1 && a <= 3) { const uint8_t d[5] = { 0x0d, 0, 0, 0, (uint8_t)a }; manda(d, 5); }
  else if (sscanf(riga, "mappa %x %x", &a, &b) == 2) { mappa[6] = a; mappa[7] = b;
                                                       Serial.printf("mappa: pedale 1 = %02x, pedale 2 = %02x\n", a, b); }
  else if (!strcmp(riga, "modo w") || !strcmp(riga, "modo v")) {
    modo = riga[5];
    Serial.printf("pedale d'espressione: %s\n", modo == 'w' ? "wah (EXP1), volume pieno" : "volume (EXP2), wah chiuso");
    if (jackDentro && ampliDentro) { uint16_t mv; mandaPedale(posizionePedale(&mv), true); }
  }
  else if (sscanf(riga, "curva %f", &curvaVolume) == 1 || sscanf(riga, "scala %u", &a) == 1) {
    if (sscanf(riga, "scala %u", &a) == 1 && a >= 1000 && a <= 65535) scalaVolume = (uint16_t)a;
    if (curvaVolume < 0.2f || curvaVolume > 6.0f) curvaVolume = 1.0f;
    Serial.printf("volume: curva %.2f, fondo scala %u\n", curvaVolume, scalaVolume);
    if (jackDentro && ampliDentro) { uint16_t mv; mandaPedale(posizionePedale(&mv), true); }
  }
  else if (!strcmp(riga, "pedale")) {
    uint16_t mv;
    const float p = posizionePedale(&mv);
    Serial.printf("pedale: %u mV, %.0f%% (tallone %u, punta %u), jack %s, modo %c\n", mv, p * 100,
                  esprTallone, esprPunta, jackDentro ? "infilato" : "vuoto", modo);
  }
  else if (!strcmp(riga, "ampli")) avviaRicercaAmpli();
  else if (sscanf(riga, "slot %u", &a) == 1 && a <= 7) cambiaSlot((uint8_t)a);
  else Serial.printf("riga non capita: \"%s\"\n", riga);
}

static void leggiSeriale() {
  while (Serial.available()) {
    const char c = Serial.read();
    if (lungRiga < 0) {
      if (c == '#') lungRiga = 0;
      else if (c == 'r') Serial.println(F("prova-controlx: sono il Control X finto"));
      // Lo stato: i messaggi dell'avvio si perdono prima che il ponte apra la porta.
      else if (c == 'i') Serial.printf("annuncio %s, indirizzo %s (casuale %s), Control X %s, %u domande; "
                                       "FFC0 %s, %u notifiche\n",
                                       BLEDevice::getAdvertising()->isAdvertising() ? "acceso" : "SPENTO",
                                       BLEDevice::getAddress().toString().c_str(), indirizzoCasuale,
                                       ampliDentro ? "collegato" : "non collegato", domande,
                                       (client && client->isConnected()) ? "collegato" : "non collegato",
                                       notificheFFC0);
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
  pinMode(PIN_JACK, INPUT_PULLUP);
  jackDentro = digitalRead(PIN_JACK);
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
    if (ampliDentro) { const uint8_t d[5] = { 0x0d, 0, 0, 0, (uint8_t)(jackDentro ? 0x03 : 0x00) }; manda(d, 5);
                       ultimaMandata = -1; }
  }
  if (ampliUscito)  { ampliUscito = false;  Serial.println(F("l'ampli se n'e' andato: mi riannuncio"));
                      BLEDevice::startAdvertising(); }
  sbrigaRicercaAmpli();
  passoPedale();
  static bool ffc0Prima = false;                 // il collegamento FFC0 che cade, detto una volta
  const bool ffc0 = client && client->isConnected();
  if (ffc0 != ffc0Prima) { ffc0Prima = ffc0; if (!ffc0) { chPreset = nullptr; Serial.println(F("FFC0: l'ampli si e' staccato")); } }
  leggiSeriale();
  delay(2);
}
