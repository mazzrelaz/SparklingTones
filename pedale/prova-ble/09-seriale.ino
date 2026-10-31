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
   Il pedale d'espressione (2.33, 30 ottobre 2026). M-Audio EX-P sulla presa
   H: il cursore su D2 (da ~0 mV a tallone a ~3040 a punta, misurato il 29
   ottobre), il jack su D8 (la lamella della manica col pull-up: basso = presa
   vuota, alto = infilato). Senza jack non parte niente.

   Fa solo il volume: deciso dall'utente il 30 ottobre, dopo aver scartato il
   Control X finto e il wah (docs/pedale-lavoro.md). In modalita' MIDI e' il
   CC 11 (Expression) sul canale MIDI_CANALE, USB e Bluetooth, per AmpliTube:
   cinquanta letture al secondo, una media mobile, e un valore parte solo
   quando cambia, con mezzo passo di isteresi, cosi' da fermo non trema fra
   due numeri vicini.

   In modalita' Spark (2.34, 31 ottobre) e' il Master dell'ampli modellato:
   0x0104, indice 4, col nome del modello che suona, come provato il 30 ottobre
   con prova-controlx («non proprio liscio ma va bene»). Millesimi, soglia
   1,5%, al massimo dieci al secondo, e **solo quando il pedale si muove**: al
   cambio di preset, al jack infilato, all'aggancio e al cambio di modalita' si
   riarma (masterMandato = -1) e non parte niente finche' non lo si muove; il
   Master resta quello del preset. Il nome del modello si rilegge (0x0201
   `01 00`) al primo movimento dopo ogni cambio di preset: ~0,3 s di ritardo
   quella volta sola. Niente col tuner aperto ne' durante un invio di preset.
   ====================================================================== */

static const uint8_t  PIN_ESPRESSIONE = D2;
static const uint8_t  PIN_JACK        = D8;
static const uint32_t ESPR_OGNI       = 20;        // ms: cinquanta letture al secondo
static const uint8_t  ESPR_CC         = 11;        // Expression
static uint16_t esprTallone = 60, esprPunta = 2900; // mV: si allargano da soli
static float    esprMedia = -1;                     // mV filtrati; -1 = si riparte
static int16_t  esprCc = -1;                        // l'ultimo CC mandato
static bool     jackDentro = false;
static bool     esprStampa = false;                 // 'I': la prova dei fili
static uint32_t esprDa = 0, esprStampaDa = 0;
static uint32_t masterDa = 0, ampliRiprovaDa = 0;

/** 0x0104: [nome con lunghezza, indice, 0xca + float big endian, 0x00].
 *  Il volume in modalita' Spark: il Master e' l'indice 4. */
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

/** 'I' dal seriale: quattro righe al secondo coi mV, i capi visti, il jack e il CC. */
static void avviaEspressione() {
  esprStampa = !esprStampa;
  if (!esprStampa) Serial.println(F("espressione: fermata"));
}

/** La posizione 0..1, col 3% di zona morta ai due capi: il tallone da' 0 e la
 *  punta il massimo anche se il pedale non arriva proprio in fondo. */
static float posizioneEspressione(float mv) {
  if (mv < esprTallone) esprTallone = (uint16_t)mv;
  if (mv > esprPunta) esprPunta = (uint16_t)mv;
  float p = (mv - esprTallone) / (float)(esprPunta - esprTallone);
  p = (p - 0.03f) / 0.94f;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Dal loop: una lettura ogni ESPR_OGNI ms. */
static void passoEspressione() {
  static bool pronto = false;
  if (!pronto) { pinMode(PIN_JACK, INPUT_PULLUP); pronto = true; }
  if (millis() - esprDa < ESPR_OGNI) return;
  esprDa = millis();
  // Il jack: due letture uguali di fila (40 ms), poi si riparte da capo.
  static bool grezzoPrima = false;
  const bool grezzo = digitalRead(PIN_JACK);
  if (grezzo == grezzoPrima && grezzo != jackDentro) {
    jackDentro = grezzo;
    esprMedia = -1;
    esprCc = -1;
    masterMandato = -1;
    Serial.printf("pedale d'espressione: jack %s\n", jackDentro ? "infilato" : "tolto");
  }
  grezzoPrima = grezzo;
  uint32_t somma = 0;
  for (uint8_t i = 0; i < 16; i++) somma += analogReadMilliVolts(PIN_ESPRESSIONE);
  const float mv = somma / 16.0f;
  if (esprStampa && millis() - esprStampaDa >= 250) {
    esprStampaDa = millis();
    Serial.printf("espressione: D2 %4.0f mV  (tallone %u, punta %u)  jack %s  CC %d  Master %d (%s)\n", mv,
                  esprTallone, esprPunta, jackDentro ? "infilato" : "vuoto", esprCc,
                  masterMandato, ampliDaRileggere ? "ampli da rileggere" : ampliCheSuona);
  }
  if (!jackDentro) return;
  esprMedia = esprMedia < 0 ? mv : esprMedia * 0.7f + mv * 0.3f;
  const float p = posizioneEspressione(esprMedia);
  if (modo == MODO_MIDI) {
    const float x = p * 127;
    if (esprCc >= 0 && fabsf(x - esprCc) < 0.6f) return;        // mezzo passo di isteresi
    const int16_t cc = (int16_t)(x + 0.5f);
    if (cc == esprCc) return;
    esprCc = cc;
    mandaMidi((uint8_t)(0xb0 | (MIDI_CANALE - 1)), ESPR_CC, cc);
    return;
  }
  // Modalita' Spark: il Master. Ogni pausa (altra modalita', ampli staccato,
  // tuner) riarma: al ritorno si riparte da dove sta il pedale, senza mandare.
  if (modo != MODO_SPARK || !chScrittura || tuner) {
    masterMandato = -1;
    return;
  }
  const int16_t m = (int16_t)(p * 1000 + 0.5f);
  if (masterMandato < 0) { masterMandato = m; return; }     // il riferimento, niente da mandare
  if (abs(m - masterMandato) < 15) return;                  // fermo: 1,5%
  if (inTrasferimento || millis() - masterDa < 100) return; // dieci al secondo
  if (ampliDaRileggere) {
    if (millis() - ampliRiprovaDa < 2000) return;           // dopo una lettura andata male
    ampliRiprovaDa = millis();
    if (!leggiAmpliCheSuona()) return;
    if (masterMandato < 0) return;                          // un cambio di preset nel frattempo
  }
  masterDa = millis();
  masterMandato = m;
  mandaParametro(ampliCheSuona, 4, m / 1000.0f);
}

/* Le righe col '#' davanti, dal seriale: per ora solo «#cc <0..127>», il CC 11
 * a mano (la prova con AmpliTube del 25 ottobre). */
static char    rigaComando[24];
static int8_t  lungRiga = -1;                  // -1: nessuna riga in corso

/** Torna true se il carattere fa parte di una riga «#…» e va consumato qui. */
static bool rigaSeriale(char c) {
  if (lungRiga < 0) {
    if (c != '#') return false;
    lungRiga = 0;
    return true;
  }
  if (c != '\n' && c != '\r') {
    if (lungRiga < (int8_t)sizeof(rigaComando) - 1) rigaComando[lungRiga++] = c;
    return true;
  }
  rigaComando[lungRiga] = 0;
  lungRiga = -1;
  int cc;
  if (sscanf(rigaComando, "cc %d", &cc) == 1 && cc >= 0 && cc <= 127)
    mandaMidi((uint8_t)(0xb0 | (MIDI_CANALE - 1)), ESPR_CC, cc);
  else Serial.printf("riga non capita: \"%s\"\n", rigaComando);
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
    "  I     il pedale d'espressione: mV di D2, capi, jack e CC, 4 righe al secondo (I ferma)\n"
    "  Q     rileggi lo stato che suona e il modello d'ampli (quello del Master)\n"
    "  #cc n il CC 11 (Expression) a n (0..127), USB e Bluetooth\n"));
}

