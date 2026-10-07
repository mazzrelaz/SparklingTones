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
    "  x     molla l'ampli (cosi' l'app nel browser lo trova)\n"
    "  r     riprendi l'ampli\n"
    "  W     prova del display: tutto acceso, meta' sopra, meta' a sinistra, bande, normale\n"
    "  K P V luminosita', precarica, VCOMH del display (a giro)\n"));
}

