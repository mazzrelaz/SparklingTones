// prova-ble, 12-tuner.ino — Il tuner: entrare, uscire, accendere l'ampli, le letture, il disegno.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.
//
// Come quello dell'app (src/app/16-accordatore.js), e con le stesse regole: la
// nota la calcola l'ampli; l'accordatore dell'ampli e' acceso solo mentre il
// tuner e' aperto, perche' un ampli rimasto muto sembra rotto; una nota nuova
// si mostra dopo due letture uguali (all'attacco le prime saltano); la lancetta
// e' appena smussata; intonata entro ±2 cent.

static void tunerAzzera() {
  tunerNota = -1;
  tunerCent = 0;
  tunerCandidata = -1;
  tunerRipetute = 0;
  tunerSilenzi = 0;
}

/** Un tasto banco tenuto due secondi. Il comando all'ampli lo manda il loop. */
static void entraTuner() {
  if (modo != MODO_SPARK || looper) return;
  if (!chScrittura) { avvisa(TESTO("lo Spark non c'e'", "no Spark")); return; }
  tuner = true;
  tunerAzzera();
  Serial.println(F("tuner: dentro"));
  annota("tuner dentro");
  aggiornaLed();
  schermoSporco = true;
}

/** Un tasto qualunque: si esce, e il loop rimette l'ampli a suonare. */
static void esciTuner() {
  tuner = false;
  Serial.println(F("tuner: fuori"));
  annota("tuner fuori (letture %lu)", (unsigned long)tunerLetture);
  aggiornaLed();
  schermoSporco = true;
}

/** 0x0165 col booleano, **senza** 0x00 in coda (misurato il 20 ottobre). */
static void mandaTuner(bool acceso) {
  const uint8_t b = acceso ? 0xc3 : 0xc2;
  uint8_t frame[16];
  manda(frame, costruisci(0x01, 0x65, &b, 1, frame));
}

/** Dal loop: accende e spegne l'accordatore dell'ampli secondo il tuner, e
 *  smussa le letture che il callback ha copiato. */
static void sbrigaTuner() {
  if (!chScrittura) {
    // Caduto: del tuner non resta niente, ma se l'ampli e' rimasto muto al
    // ritorno lo si rimette a suonare.
    if (tunerAcceso) tunerSpegniAlRitorno = true;
    tunerAcceso = false;
    if (tuner) esciTuner();
    return;
  }
  if (inTrasferimento || daLeggere) return;
  if (tunerSpegniAlRitorno && !tuner) { tunerSpegniAlRitorno = false; mandaTuner(false); }
  if (tuner != tunerAcceso) {
    tunerAcceso = tuner;
    tunerSpegniAlRitorno = false;
    mandaTuner(tuner);
    tunerAzzera();
  }
  if (!tuner) return;

  /* La diagnosi: una riga al secondo sul seriale finche' il tuner e' aperto. */
  {
    static uint32_t ultimaRiga = 0, arrivatiPrima = 0, lettePrima = 0;
    if (millis() - ultimaRiga >= 1000) {
      ultimaRiga = millis();
      const uint32_t a = tunerArrivati, l = tunerLetture;
      Serial.printf("tuner: %lu messaggi 0x0364 in un secondo, %lu letti; nota mostrata %d, cent %.1f, silenzi %u, rx totali %lu\n",
                    (unsigned long)(a - arrivatiPrima), (unsigned long)(l - lettePrima),
                    tunerNota, tunerCent, tunerSilenzi, (unsigned long)rxTotali);
      if (a != arrivatiPrima) {
        Serial.print(F("  ultimo grezzo: "));
        for (uint8_t i = 0; i < tunerGrezzi; i++) Serial.printf("%02x ", tunerUltimo[i]);
        Serial.printf(" | nota %u scost %.4f\n", tunerNotaGrezza, tunerScostGrezzo);
      }
      arrivatiPrima = a;
      lettePrima = l;
    }
  }

  static uint32_t viste = 0;
  const uint32_t arrivate = tunerLetture;
  if (arrivate == viste) return;
  const uint32_t nuove = arrivate - viste;
  viste = arrivate;
  const int8_t nota = (int8_t)tunerNotaGrezza;
  const float  s = tunerScostGrezzo;
  if (!(s >= 0)) {                         // -1 (o un numero storto): silenzio
    tunerSilenzi = (uint8_t)(tunerSilenzi + nuove > 255 ? 255 : tunerSilenzi + nuove);
    tunerCandidata = -1;
    tunerRipetute = 0;
  } else {
    tunerSilenzi = 0;
    const float cent = ((s > 1 ? 1 : s) - 0.5f) * 100;
    if (nota == tunerNota) {
      tunerCent += (cent - tunerCent) * 0.75f;
    } else {
      if (tunerCandidata == nota) tunerRipetute++;
      else { tunerCandidata = nota; tunerRipetute = 1; }
      if (tunerRipetute >= 2 || tunerNota < 0) {
        tunerNota = nota;
        tunerCent = cent;
        tunerCandidata = -1;
        tunerRipetute = 0;
      }
    }
  }
  /* Un disegno costa 32 ms in cui i tasti non si leggono: si ridisegna solo se
   * cambia quello che si vede, e al massimo dieci volte al secondo. Le letture
   * arrivano anche nel silenzio, quindi l'ultima modifica non resta indietro. */
  const bool tace = tunerNota < 0 || tunerSilenzi >= 4;
  const int32_t chiave = tace ? -1 : tunerNota * 1000 + (int32_t)lroundf(tunerCent);
  static int32_t  chiavePrima = -2;
  static uint32_t disegnato = 0;
  if (chiave != chiavePrima && millis() - disegnato >= 100) {
    chiavePrima = chiave;
    disegnato = millis();
    aggiornaLed();
    schermoSporco = true;
  }
}

/** Sotto la riga in alto: l'arco di 21 tacche come nell'app, una ogni 5 cent
 *  da -50 a +50 su ±60 gradi, la nota grande e i cent in basso a destra. La
 *  tacca dove sta la corda e' lunga e spessa (due, se la corda sta in mezzo);
 *  quella del centro e' piu' lunga delle altre. Intonata, la nota in negativo. */
static void disegnaTuner() {
  const bool tace = tunerNota < 0 || tunerSilenzi >= 4;
  float cent = tunerCent;
  if (cent < -50) cent = -50;
  if (cent > 50) cent = 50;
  const bool intonata = !tace && fabsf(cent) <= TUNER_INTONATA;
  const int cx = 64, cy = 74;
  const float pos = cent / 5 + 10;

  for (int i = 0; i <= 20; i++) {
    const float a = (i - 10) * 6 * PI / 180;
    const float sa = sinf(a), ca = cosf(a);
    const bool accesa = !tace && fabsf(i - pos) < 0.65f;
    if (accesa) {
      for (int o = -1; o <= 1; o++)        // tre linee affiancate: una tacca spessa
        schermo.drawLine(cx + lroundf(sa * 38 + ca * o), cy - lroundf(ca * 38 - sa * o),
                         cx + lroundf(sa * 55 + ca * o), cy - lroundf(ca * 55 - sa * o));
    } else if (i == 10) {
      schermo.drawLine(cx, cy - 45, cx, cy - 55);
    } else {
      schermo.drawLine(cx + lroundf(sa * 46), cy - lroundf(ca * 46),
                       cx + lroundf(sa * 50), cy - lroundf(ca * 50));
    }
  }
  if (tace) return;

  static const char* LETTERE[12] = { "C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B" };
  const bool diesis = tunerNota == 1 || tunerNota == 3 || tunerNota == 6
                   || tunerNota == 8 || tunerNota == 10;
  schermo.setFont(u8g2_font_logisoso24_tr);
  const int w = schermo.getStrWidth(LETTERE[tunerNota]);
  const int x = cx - (w + (diesis ? 7 : 0)) / 2;
  const int base = 62;
  if (intonata) {
    schermo.drawRBox(x - 5, base - 27, w + (diesis ? 7 : 0) + 10, 29, 3);
    schermo.setDrawColor(0);
  }
  schermo.drawStr(x, base, LETTERE[tunerNota]);
  if (diesis) {
    schermo.setFont(u8g2_font_6x13B_tf);
    schermo.drawStr(x + w + 1, base - 13, "#");
  }
  schermo.setDrawColor(1);

  char t[8];
  const int c = (int)lroundf(cent);
  snprintf(t, sizeof(t), c > 0 ? "+%d" : "%d", c);
  schermo.setFont(u8g2_font_6x13_tf);
  schermo.drawStr(127 - schermo.getStrWidth(t), 62, t);
}
