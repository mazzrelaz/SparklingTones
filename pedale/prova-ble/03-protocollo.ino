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
// 24 pezzi da 32: un preset ne fa ~16 da 25, e il nome dell'ampli modellato
// (2.34) sta a meta' catena, non nei primi cento byte.
static const uint8_t PEZZI_TENUTI = 24;
static uint8_t pezzi[PEZZI_TENUTI][32];
static uint8_t lungPezzo[PEZZI_TENUTI];

/* Il Master col pedale d'espressione (2.34, vedi 09-seriale.ino): dopo ogni
 * cambio di preset il modello d'ampli che suona va riletto, e il pedale non
 * manda niente finche' non si muove. */
static volatile bool    ampliDaRileggere = true;
static volatile int16_t masterMandato = -1;     // millesimi; -1 = si riarma

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
  if (indice < PEZZI_TENUTI) {
    if (utili > sizeof(pezzi[0])) utili = sizeof(pezzi[0]);
    memcpy(pezzi[indice], dati + 3, utili);
    lungPezzo[indice] = utili;
  }
  if (indice + 1 >= tutti) rispostaFinita = true;
}

/** Una riga nella scatola nera (vedi prova-ble.ino), col tempo in decimi di
 *  secondo. Si chiama anche dal callback delle notifiche: la riga si scrive
 *  tutta dentro la sezione critica, cosi' due scritture non si mescolano. */
static void annota(const char* formato, ...) {
  char riga[60];
  const uint32_t ds = millis() / 100;
  int k = snprintf(riga, sizeof(riga), "%5lu.%lu ", (unsigned long)(ds / 10), (unsigned long)(ds % 10));
  va_list a;
  va_start(a, formato);
  vsnprintf(riga + k, sizeof(riga) - k, formato, a);
  va_end(a);
  taskENTER_CRITICAL(&scatolaMux);
  memcpy(scatola[scatolaPos % SCATOLA_RIGHE], riga, sizeof(riga));
  scatolaPos++;
  taskEXIT_CRITICAL(&scatolaMux);
}

/** La scatola nera, dalla riga piu' vecchia, sul seriale o in un file. */
static void scriviScatola(Print& fuori) {
  const uint32_t fine = scatolaPos;
  const uint32_t inizio = fine > SCATOLA_RIGHE ? fine - SCATOLA_RIGHE : 0;
  fuori.printf("scatola nera: %lu righe in tutto, le ultime %lu (adesso %lu.%lu s)\n",
               (unsigned long)fine, (unsigned long)(fine - inizio),
               (unsigned long)(millis() / 1000), (unsigned long)(millis() / 100 % 10));
  for (uint32_t i = inizio; i < fine; i++) {
    char riga[60];
    taskENTER_CRITICAL(&scatolaMux);
    memcpy(riga, scatola[i % SCATOLA_RIGHE], sizeof(riga));
    taskEXIT_CRITICAL(&scatolaMux);
    riga[sizeof(riga) - 1] = 0;
    fuori.println(riga);
  }
}

/** 'N' dal seriale: quella che c'e' adesso in RAM. */
static void stampaScatola() { scriviScatola(Serial); }

/* La scatola salvata (2.27, chiesta dall'utente il 20 ottobre 2026: «lascia
 * qualcosa dentro in modo che venga memorizzato quando capita»). Quando l'ampli
 * da' il primo segno di essersi inceppato, la scatola nera finisce in memoria e
 * resta anche a pedale spento; la volta prima passa in un secondo file. Si
 * rilegge con 'M' dal seriale. Una volta per episodio: si riarma quando l'ampli
 * torna a confermare un cambio di preset, o al prossimo aggancio. */
static const char* VIA_SCATOLA  = "/scatola1.txt";
static const char* VIA_SCATOLA2 = "/scatola2.txt";
static bool scatolaSalvata = false;

static void salvaScatola(const char* perche) {
  if (scatolaSalvata) return;
  scatolaSalvata = true;
  annota("salvo la scatola: %s", perche);
  if (LittleFS.exists(VIA_SCATOLA)) {
    LittleFS.remove(VIA_SCATOLA2);
    LittleFS.rename(VIA_SCATOLA, VIA_SCATOLA2);
  }
  File f = LittleFS.open(VIA_SCATOLA, "w");
  if (!f) { Serial.println(F("scatola nera: non riesco a salvarla")); return; }
  f.printf("perche': %s\nfirmware %s, acceso da %lu s, ampli %s\n", perche, VERSIONE,
           (unsigned long)(millis() / 1000), ampliScelto == AMPLI_NEO ? "NEO" : "Spark 2");
  scriviScatola(f);
  f.close();
  Serial.printf("scatola nera salvata: %s\n", perche);
  avvisa(TESTO("ampli inceppato: salvato", "amp stuck: saved"));
}

/** 'M' dal seriale: le due scatole salvate, la piu' recente prima. */
static void stampaScatoleSalvate() {
  for (const char* via : { VIA_SCATOLA, VIA_SCATOLA2 }) {
    File f = LittleFS.open(via, "r");
    if (!f) { Serial.printf("%s: nessuna\n", via); continue; }
    Serial.printf("===== %s =====\n", via);
    while (f.available()) Serial.write(f.read());
    f.close();
  }
}

static void messaggioIntero(const uint8_t* m, size_t n) {
  rxTotali++;
  ultimoRx = millis();
  // La scatola nera: tutto tranne le letture del tuner e la posizione del loop.
  if (n >= 6) {
    if (m[4] == 0x04 && m[5] == 0x38) ack0138++;
    if ((m[4] == 0x04 || m[4] == 0x05) && m[5] == 0x01) ackPreset++;
    // I pezzi dei preset letti all'aggancio (0x0301, 16 per slot) riempivano la
    // scatola da soli: restano fuori, come le letture del tuner e il loop.
    else if (!(m[4] == 0x03 && (m[5] == 0x64 || m[5] == 0x77 || m[5] == 0x01))) {
      char dati[25] = "";
      for (size_t i = 6, k = 0; i + 1 < n && k + 3 < sizeof(dati); i++, k += 3)
        snprintf(dati + k, sizeof(dati) - k, "%02x ", m[i]);
      annota("RX %02x%02x %s", m[4], m[5], dati);
    }
  }
  ascoltaRisposta(m, n);
  // 0x0338: l'ampli ha cambiato preset da se' (i suoi pulsanti): il Master del
  // pedale d'espressione va riarmato e il modello d'ampli riletto.
  if (n >= 6 && m[4] == 0x03 && m[5] == 0x38) { ampliDaRileggere = true; masterMandato = -1; }
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
      loopClick = d[i + 1] == 0xc3;
      if (loopVuoto()) {
        loopBpm = (uint16_t)v[0];
        loopLibero = d[i] == 0xc3;
        if (v[2] >= 1 && v[2] <= 16) loopBattute = (uint8_t)v[2];
        ampliBpm = 0;
      } else {
        // un loop c'e' (cambio di preset, o rientro nel looper): resta col suo
        // tempo, e quello del preset aspetta che il loop si cancelli
        ampliBpm = (uint16_t)v[0];
        ampliLibero = d[i] == 0xc3;
        ampliBattute = (v[2] >= 1 && v[2] <= 16) ? (uint8_t)v[2] : 0;
      }
      memcpy(impostazioni, d, nd);
      lungImpostazioni = (uint8_t)nd;
      impostazioniNuove = true;
    }
  }
  // Il tuner (0x0364): nota 0-11 e scostamento float 0xca, ~13 al secondo.
  // Qui si copiano e basta: le smussa e le disegna il loop (12-tuner.ino).
  if (n >= 8 && m[4] == 0x03 && m[5] == 0x64) {
    uint8_t d[8];
    // Per la diagnosi (2.25): l'ultimo messaggio com'e' arrivato, lo stampa il loop.
    tunerGrezzi = (uint8_t)(n < sizeof(tunerUltimo) ? n : sizeof(tunerUltimo));
    memcpy(tunerUltimo, m, tunerGrezzi);
    tunerArrivati++;
    if (spacchetta(m + 6, n - 7, d, sizeof(d)) >= 6 && d[0] < 12 && d[1] == 0xca) {
      const uint32_t b = (uint32_t)d[2] << 24 | (uint32_t)d[3] << 16 | (uint32_t)d[4] << 8 | d[5];
      float f;
      memcpy(&f, &b, 4);
      tunerNotaGrezza = d[0];
      tunerScostGrezzo = f;
      tunerLetture++;
    }
    return;                                // tredici al secondo: niente seriale
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
  if (!chScrittura) { Serial.println(F("non connesso")); annota("TX senza ampli"); return false; }
  {
    char dati[25] = "";
    for (size_t i = 6, k = 0; i + 1 < n && k + 3 < sizeof(dati); i++, k += 3)
      snprintf(dati + k, sizeof(dati) - k, "%02x ", frame[i]);
    annota("TX %02x%02x %s", n > 5 ? frame[4] : 0, n > 5 ? frame[5] : 0, dati);
  }
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
  atteso0138 = ack0138 + 1;              // il loop guarda che arrivi (scatola nera)
  ampliDaRileggere = true;               // il Master del pedale d'espressione (2.34)
  masterMandato = -1;
  atteso0138Da = millis() | 1;
  return manda(frame, n);
}

