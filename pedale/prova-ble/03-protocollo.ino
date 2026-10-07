// prova-ble, 03-protocollo.ino — I messaggi dello Spark: le risposte e le notifiche in arrivo, il riassemblatore, la costruzione dei messaggi.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

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

/* --- Le risposte che il pedale legge: il nome dell'ampli e i preset --------
 *
 * Arrivano nel callback delle notifiche, cioe' nel task dello stack BLE: qui
 * si copiano byte e si alzano bandiere, il resto lo fa il loop (la regola di
 * sempre). Si tiene **solo l'inizio** di un preset, i pezzi da 0 a 5: il nome
 * sta nei primi cento byte, dopo banco, numero e UUID. */
static volatile uint8_t attesaSeq = 0;           // 0 = non si aspetta niente
static volatile uint8_t attesaSub = 0;           // 0x11 il nome, 0x01 un preset
static volatile bool    rispostaFinita = false;
static volatile uint32_t ultimoPezzo = 0;
static char    nomeLetto[24] = "";
static uint8_t pezzi[6][32];
static uint8_t lungPezzo[6];

/** L'inverso di impacchetta: ogni gruppo di 8 byte e' un byte coi bit alti,
 *  LSB-first, seguito da fino a 7 byte dati. */
static size_t spacchetta(const uint8_t* dentroP, size_t n, uint8_t* fuori, size_t max) {
  size_t out = 0;
  for (size_t i = 0; i < n; i += 8) {
    const uint8_t alti = dentroP[i];
    for (size_t k = 1; k < 8 && i + k < n && out < max; k++)
      fuori[out++] = dentroP[i + k] | ((alti & (1 << (k - 1))) ? 0x80 : 0);
  }
  return out;
}

static void ascoltaRisposta(const uint8_t* m, size_t n) {
  if (!attesaSeq || n < 8 || m[4] != 0x03 || m[5] != attesaSub || m[2] != attesaSeq) return;
  uint8_t dati[128];
  const size_t nd = spacchetta(m + 6, n - 7, dati, sizeof(dati));
  ultimoPezzo = millis();
  if (attesaSub == 0x11) {
    // [lunghezza, 0xa0+lunghezza, caratteri]: «Spark NEO», «Spark 2»
    const uint8_t l = nd >= 2 ? dati[0] : 0;
    size_t k = 0;
    for (; k < l && k + 2 < nd && k < sizeof(nomeLetto) - 1; k++) nomeLetto[k] = (char)dati[k + 2];
    nomeLetto[k] = 0;
    rispostaFinita = true;
    return;
  }
  // un pezzo di preset: [quanti in tutto, indice, byte utili, byte...]
  if (nd < 3) return;
  const uint8_t tutti = dati[0], indice = dati[1];
  uint8_t utili = dati[2];
  if (utili > nd - 3) utili = (uint8_t)(nd - 3);
  if (indice < 6) {
    if (utili > sizeof(pezzi[0])) utili = sizeof(pezzi[0]);
    memcpy(pezzi[indice], dati + 3, utili);
    lungPezzo[indice] = utili;
  }
  if (indice + 1 >= tutti) rispostaFinita = true;
}

static void messaggioIntero(const uint8_t* m, size_t n) {
  rxTotali++;
  ultimoRx = millis();
  ascoltaRisposta(m, n);
  // Lo stato del looper (0x0375, un byte): in coda per il loop.
  if (n >= 8 && m[4] == 0x03 && m[5] == 0x75) {
    uint8_t v[4];
    if (spacchetta(m + 6, n - 7, v, sizeof(v)) >= 1) {
      eventiLooper[eventiScritti & 7] = v[0];
      eventiScritti++;
    }
  }
  // Le impostazioni del looper (0x0376): bpm e click, per il conteggio.
  if (n >= 8 && m[4] == 0x03 && m[5] == 0x76) {
    uint8_t d[24];
    const size_t nd = spacchetta(m + 6, n - 7, d, sizeof(d));
    size_t i = 0;
    uint32_t v[3];                         // bpm, count, battute
    bool ok = true;
    for (uint8_t k = 0; k < 3 && ok; k++) {
      if (i >= nd) { ok = false; break; }
      const uint8_t b = d[i++];
      if (b < 0x80) v[k] = b;
      else if (b == 0xcc && i + 1 <= nd) { v[k] = d[i]; i += 1; }
      else if (b == 0xcd && i + 2 <= nd) { v[k] = (uint32_t)(d[i] << 8 | d[i + 1]); i += 2; }
      else ok = false;
    }
    // poi due booleani: freeIndicator e click (c2 falso, c3 vero)
    if (ok && i + 2 <= nd && (d[i] & 0xfe) == 0xc2 && (d[i + 1] & 0xfe) == 0xc2
        && v[0] >= 30 && v[0] <= 300) {
      loopBpm = (uint16_t)v[0];
      loopLibero = d[i] == 0xc3;
      loopClick = d[i + 1] == 0xc3;
      if (v[2] >= 1 && v[2] <= 16) loopBattute = (uint8_t)v[2];
      memcpy(impostazioni, d, nd);
      lungImpostazioni = (uint8_t)nd;
      impostazioniNuove = true;
    }
  }
  // La posizione nel loop (0x0377): un float 0xca.
  if (n >= 8 && m[4] == 0x03 && m[5] == 0x77) {
    uint8_t d[8];
    if (spacchetta(m + 6, n - 7, d, sizeof(d)) >= 5 && d[0] == 0xca) {
      const uint32_t b = (uint32_t)d[1] << 24 | (uint32_t)d[2] << 16 | (uint32_t)d[3] << 8 | d[4];
      float f;
      memcpy(&f, &b, 4);
      static float prima = 0;
      if (f < prima - 0.2f) {              // il loop e' ricominciato
        massimoGiro = prima; giroFinito = true;
        inizioGiro = millis() - (durataLoop ? (uint32_t)(f * durataLoop) : 0);
      }
      prima = f;
      posLoop = f;
      posLoopDa = millis();
    }
    return;                                // cinque al secondo: niente seriale
  }
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

