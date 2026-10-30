// prova-ble, 09-seriale.ino — Dal seriale: la misura del giro e l'elenco dei comandi.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

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

/* ======================================================================
   Il pedale d'espressione finto (2.30, 24 ottobre 2026): prima di comprarne
   uno, l'utente vuole sapere se avrebbe senso. Al passo dell'editor (90 ms,
   PAUSA_PARAMETRO): 'J' sul wah dello Spark (0x0104 su JH.Vox846), a 0 per
   due secondi e poi su fino a 1 in dieci; 'X' sul MIDI (CC 11, per
   AmpliTube), 0 -> 127 -> 0 in quattro secondi, tre volte. Gira nel loop, a passi: i pulsanti restano vivi. Il wah dello
   Spark 2 non ha una posizione fra i parametri misurati (indici 0-4); il 5,
   «sempre 0», e' il candidato. 'j' cambia l'indice da provare.
   ====================================================================== */

static const char*    WAH_NOME      = "JH.Vox846";
static const uint32_t SPAZZATA_PASSO = 90;
static const uint8_t  SPAZZATA_MEZZA = 22;      // passi da 0 a 1: ~2 s
static const uint8_t  SPAZZATA_GIRI  = 3;
static const uint8_t  RAMPA_ATTESA   = 22;      // passi a 0 prima di salire: ~2 s
static const uint8_t  RAMPA_PASSI    = 111;     // da 0 a 1: ~10 s
static const uint16_t GIRO_MODO      = RAMPA_ATTESA + RAMPA_PASSI + 22;   // ~14 s per modalita'

static char     spazzata = 0;                   // 'J', 'X' o 0
static uint16_t spazzataPasso = 0;
static uint32_t spazzataDa = 0;
static uint8_t  indiceWah = 5;

/** 0x0104: [nome con lunghezza, indice, 0xca + float big endian, 0x00]. */
static bool mandaParametro(const char* nome, uint8_t indice, float valore) {
  uint8_t dati[48];
  size_t n = 0;
  const size_t l = strlen(nome);
  dati[n++] = (uint8_t)l;
  dati[n++] = (uint8_t)(0xa0 + l);
  memcpy(dati + n, nome, l); n += l;
  dati[n++] = indice;
  uint32_t bit;
  memcpy(&bit, &valore, 4);
  dati[n++] = 0xca;
  for (int s = 24; s >= 0; s -= 8) dati[n++] = (uint8_t)(bit >> s);
  dati[n++] = 0x00;                             // senza, ack e niente
  uint8_t frame[64];
  return manda(frame, costruisci(0x01, 0x04, dati, n, frame));
}

/** 0x0115: [nome con lunghezza, 0xc3 acceso, 0x00]. */
static bool accendiEffetto(const char* nome) {
  uint8_t dati[40];
  size_t n = 0;
  const size_t l = strlen(nome);
  dati[n++] = (uint8_t)l;
  dati[n++] = (uint8_t)(0xa0 + l);
  memcpy(dati + n, nome, l); n += l;
  dati[n++] = 0xc3;
  dati[n++] = 0x00;
  uint8_t frame[64];
  return manda(frame, costruisci(0x01, 0x15, dati, n, frame));
}

static void avviaSpazzata(char quale) {
  if (spazzata == quale) { spazzata = 0; Serial.println(F("spazzata fermata")); return; }
  if (quale == 'J') {
    if (!chScrittura) { Serial.println(F("non connesso")); return; }
    accendiEffetto(WAH_NOME);                   // il parametro di un effetto spento non suona
    Serial.printf("wah: indice %u di %s a 0 per 2 s, poi a 1 in 10 s\n", indiceWah, WAH_NOME);
  } else if (quale == 'Z') {
    if (!chScrittura) { Serial.println(F("non connesso")); return; }
    Serial.printf("wah: BPM spento, sei modalita', rampa sull'indice %u in ognuna\n", indiceWah);
  } else {
    Serial.println(F("MIDI: spazzo il CC 11 sul canale 1, tre volte"));
  }
  spazzata = quale;
  spazzataPasso = 0;
  spazzataDa = millis();
}

/** Un passo della spazzata, se e' ora. Dal loop. */
static void passoSpazzata() {
  if (!spazzata || millis() - spazzataDa < SPAZZATA_PASSO) return;
  spazzataDa = millis();
  if (spazzata == 'Z') {
    // Le sei modalita' col BPM spento (chiesto dall'utente dopo la rampa sulla
    // quarta, che non ha cambiato niente): per ognuna, la modalita' e
    // l'indice 5 a 0, due secondi, la rampa in dieci, due secondi fermi.
    const uint16_t p = spazzataPasso;
    if (p == 0) accendiEffetto(WAH_NOME);
    else if (p == 1) mandaParametro(WAH_NOME, 1, 0.0f);          // BPM spento
    else {
      const uint8_t  modo = (uint8_t)((p - 2) / GIRO_MODO);
      const uint16_t q    = (uint16_t)((p - 2) % GIRO_MODO);
      if (q == 0) { mandaParametro(WAH_NOME, 0, modo * 0.2f);
                    Serial.printf("modalita' %u (valore %.1f)\n", modo + 1, modo * 0.2f); }
      else if (q == 1) mandaParametro(WAH_NOME, indiceWah, 0.0f);
      else if (q > RAMPA_ATTESA && q <= RAMPA_ATTESA + RAMPA_PASSI)
        mandaParametro(WAH_NOME, indiceWah, (q - RAMPA_ATTESA) / (float)RAMPA_PASSI);
    }
    if (++spazzataPasso >= 2 + 6 * GIRO_MODO) { spazzata = 0; Serial.println(F("sei modalita' finite")); }
    return;
  }
  if (spazzata == 'J') {
    // Sul wah una rampa sola, chiesta dall'utente per sentire bene: chiuso
    // per due secondi, poi da 0 a 1 dritto in dieci, e resta aperto.
    const uint8_t p = spazzataPasso;
    if (p == 0) mandaParametro(WAH_NOME, indiceWah, 0.0f);
    else if (p > RAMPA_ATTESA) mandaParametro(WAH_NOME, indiceWah, (p - RAMPA_ATTESA) / (float)RAMPA_PASSI);
    if (++spazzataPasso > RAMPA_ATTESA + RAMPA_PASSI) { spazzata = 0; Serial.println(F("rampa finita")); }
    return;
  }
  const uint8_t p = spazzataPasso % (2 * SPAZZATA_MEZZA);
  const float v = (p <= SPAZZATA_MEZZA ? p : 2 * SPAZZATA_MEZZA - p) / (float)SPAZZATA_MEZZA;
  mandaMidi(0xb0, 11, (int)(v * 127 + 0.5f));
  if (++spazzataPasso > SPAZZATA_GIRI * 2 * SPAZZATA_MEZZA) {
    spazzata = 0;
    Serial.println(F("spazzata finita"));
  }
}

/* Il pedale d'espressione vero (2.31, 29 ottobre 2026): M-Audio EX-P sulla
 * presa H. Il cursore arriva su D2 (64 kOhm, 1 kOhm verso 3V3, 100 nF verso
 * massa); D8 sta sulla lamella della manica, che a presa vuota tocca la
 * massa: col pull-up, basso = vuota, alto = jack infilato. Per ora solo la
 * prova dei fili: 'I' scrive quattro volte al secondo i mV, il minimo e il
 * massimo visti, e il jack. */
static const uint8_t  PIN_ESPRESSIONE = D2;
static const uint8_t  PIN_JACK        = D8;
static const uint32_t ESPR_OGNI       = 250;
static bool     esprStampa = false;
static uint32_t esprDa = 0;
static uint16_t esprMin = 0xffff, esprMax = 0;

static void avviaEspressione() {
  pinMode(PIN_JACK, INPUT_PULLUP);
  esprStampa = !esprStampa;
  esprMin = 0xffff;
  esprMax = 0;
  if (!esprStampa) Serial.println(F("espressione: fermata"));
}

/** Una riga della prova, se e' ora. Dal loop. */
static void passoEspressione() {
  if (!esprStampa || millis() - esprDa < ESPR_OGNI) return;
  esprDa = millis();
  uint32_t somma = 0;
  for (uint8_t i = 0; i < 16; i++) somma += analogReadMilliVolts(PIN_ESPRESSIONE);
  const uint16_t mv = (uint16_t)(somma / 16);
  if (mv < esprMin) esprMin = mv;
  if (mv > esprMax) esprMax = mv;
  Serial.printf("espressione: D2 %4u mV  (min %4u, max %4u)  jack %s\n", mv, esprMin, esprMax,
                digitalRead(PIN_JACK) ? "infilato" : "vuoto");
}

/* Il wah dal PC (tools/wah.html, 24 ottobre 2026): l'utente vuole muovere lui
 * modalita' e posizione, coi secondi non si capiva. Una riga per comando:
 * «#<indice> <valore>» manda 0x0104 su JH.Vox846, «#on» lo accende. */
static char    rigaWah[24];
static int8_t  lungRigaWah = -1;               // -1: nessuna riga in corso

/** Torna true se il carattere fa parte di una riga «#…» e va consumato qui. */
static bool rigaSeriale(char c) {
  if (lungRigaWah < 0) {
    if (c != '#') return false;
    lungRigaWah = 0;
    return true;
  }
  if (c != '\n' && c != '\r') {
    if (lungRigaWah < (int8_t)sizeof(rigaWah) - 1) rigaWah[lungRigaWah++] = c;
    return true;
  }
  rigaWah[lungRigaWah] = 0;
  lungRigaWah = -1;
  int indice;
  float valore;
  int cc;
  // «#cc <0..127>»: il CC 11 sul canale 1, USB e Bluetooth (AmpliTube, la prova 3).
  if (sscanf(rigaWah, "cc %d", &cc) == 1 && cc >= 0 && cc <= 127) mandaMidi(0xb0, 11, cc);
  else if (!strcmp(rigaWah, "on")) accendiEffetto(WAH_NOME);
  // Chiusa l'app, l'ampli sembra tornare allo slot: i 0x0104 cambiavano lo
  // stato in 0x7f (riletto) ma non il suono. Si torna a suonare 0x7f.
  else if (!strcmp(rigaWah, "suona")) { cambiaPreset(0x7f); Serial.println(F("wah: suona lo stato modificato (0x7f)")); }
  else if (sscanf(rigaWah, "%d %f", &indice, &valore) == 2 && indice >= 0 && indice <= 9 &&
           valore >= 0.0f && valore <= 1.0f) {
    mandaParametro(WAH_NOME, (uint8_t)indice, valore);
    Serial.printf("wah: indice %d = %.3f\n", indice, valore);
  } else Serial.printf("riga non capita: \"%s\"\n", rigaWah);
  return true;
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
    "  u     tensione della batteria\n"
    "  U     il registro della batteria: una riga al minuto da ogni accensione\n"
    "  x     molla l'ampli (cosi' l'app nel browser lo trova)\n"
    "  r     riprendi l'ampli\n"
    "  W     prova del display: tutto acceso, meta' sopra, meta' a sinistra, bande, normale\n"
    "  K P V luminosita', precarica, VCOMH del display (a giro)\n"
    "  N     la scatola nera: le ultime 400 cose successe\n"
    "  M     le due scatole salvate quando l'ampli si e' inceppato\n"
    "  S     salva adesso la scatola (prova)\n"
    "  T     apri/chiudi il tuner;  L  dentro/fuori dal looper;  Y  un colpo di tap\n"
    "  J     espressione finta sul wah (accende JH.Vox846, spazza un indice); j cambia indice\n"
    "  X     espressione finta sul MIDI (CC 11, canale 1)\n"
    "  I     il pedale d'espressione vero: D2 e jack, 4 righe al secondo (I ferma)\n"
    "  Z     wah: BPM spento, le sei modalita' con una rampa ciascuna\n"
    "  Q     rileggi lo stato che suona (pezzi grezzi)\n"
    "  #i v  wah: l'indice i a v (0..1), una riga; #on lo accende (tools/wah.html)\n"));
}

