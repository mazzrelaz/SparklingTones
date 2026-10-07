// prova-ble, 07-looper.ino — Il looper: gli stati, i footswitch, il tap, le battute, l'ingresso e l'uscita.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/** Uno stato del looper: raccontato dall'ampli, o segnato da noi appena il
 *  comando parte (`mandato`). Serve il secondo perche' **l'ampli non racconta
 *  tutto**: misurato il 5 ottobre 2026, a 0x0b e a 0x09 mandati da noi risponde
 *  solo l'ack, eppure la sovraincisione parte e il loop si ferma. Senza
 *  segnarli, il pedale crede di suonare mentre sovraincide, e «ferma» lascia la
 *  chitarra muta. Ignitron fa lo stesso. */
static void looperEvento(uint8_t v, bool mandato = false) {
  switch (v) {
    case LOOP_CONTA: case LOOP_REC:
      // da qui contano il cerchio e il lampeggio; la conferma dell'ampli
      // arriva ~35 ms dopo il comando e lo rimette a punto
      registraDa = millis(); durataLoop = 0; posLoop = -1;
      loopRegistra = true; loopSovraincide = false; loopSuona = false; loopRipetibile = false; break;
    case LOOP_ANNULLA:
      loopRipetibile = true; break;
    case LOOP_RIPETI:
      loopRipetibile = false; break;
    case LOOP_FINE_REC: case LOOP_REC_FATTA:
      if (loopRegistra) {
        durataLoop = millis() - registraDa;  // il giro, misurato
        inizioGiro = millis();               // e riparte subito a suonare:
        loopSuona = true;                    // l'08 che segue non rimette il giro
      }
      loopRegistra = false; loopPresente = true; break;
    case LOOP_SUONA:
      if (!loopSuona && !loopRegistra) inizioGiro = millis();   // da fermo riparte dall'inizio
      loopRegistra = false; loopSuona = true; loopPresente = true; break;
    case LOOP_FERMA:
      // detto dall'ampli (anche come risposta a 0x0275, appena collegati), fermo
      // vuol dire che un loop c'e': senza, i tasti banco cambiavano le battute
      // sotto un loop registrato e l'ampli si impallava (7 ottobre)
      if (!mandato) loopPresente = true;
      posLoop = -1;
      loopRegistra = loopSovraincide = loopSuona = false; break;
    case LOOP_DUB:
      loopSovraincide = true; loopPresente = true; loopRipetibile = false; break;
    case LOOP_FINE_DUB:
      loopSovraincide = false; break;
    case LOOP_CANCELLA: case LOOP_VUOTO:
      if (looper && loopPresente) avvisa("loop cancellato");
      posLoop = -1;
      durataLoop = 0;
      loopRegistra = loopSovraincide = loopSuona = loopPresente = loopRipetibile = false; break;
    default:
      Serial.printf("looper: stato 0x%02x sconosciuto\n", v);
      return;
  }
  Serial.printf("looper: 0x%02x %s\n", v, mandato ? "(mandato)" : "(dall'ampli)");
  if (looper) { aggiornaLed(); schermoSporco = true; }
}

/** Un footswitch nel looper. Il comando non parte da qui: lo manda il loop,
 *  cosi' non si infila mai in mezzo a un preset che sta passando. Dopo 0x05
 *  l'ampli manda da solo 0x07 e 0x08; la sovraincisione e' 0x0b da solo,
 *  come l'app ufficiale (Ignitron ci mette dietro 0x08, che riavvolge il loop). */
static void looperPremuto(uint8_t k) {
  if (!chScrittura) return;                // lo schermo dice gia' che lo Spark non c'e'
  if (contaTempo) {                        // qualunque tasto durante il conteggio lo annulla
    contaTempo = 0;
    avvisa("conteggio annullato");
    aggiornaLed();
    return;
  }
  switch (k) {
    case 0:                                // REC/DUB, come il tasto del pannello
      if (loopRegistra)         looperAccoda(LOOP_FINE_REC);
      else if (loopSovraincide) looperAccoda(LOOP_FINE_DUB);
      // solo 0x0b, come l'app: un 0x08 dietro fa ripartire il loop da capo
      // (segnalato dall'utente il 7 ottobre); da fermo l'ampli riparte da se'.
      else if (loopPresente)    looperAccoda(LOOP_DUB);
      else if (loopClick && loopBpm) {     // il conteggio: lo porta avanti il loop
        contaDa = millis();
        contaTempo = 1;
        aggiornaLed();
        schermoSporco = true;
      }
      else                      looperAccoda(LOOP_REC);
      break;
    case 1:                                // annulla / ripeti
      if (!loopPresente) { avvisa("niente da annullare"); return; }
      // Durante una sovraincisione 0x0d l'ampli lo ignora (registro del 5
      // ottobre); a sovraincisione chiusa annulla e ripete (7 ottobre). Quindi
      // prima si chiude, poi si annulla.
      if (loopSovraincide) looperAccoda(LOOP_FINE_DUB, LOOP_ANNULLA);
      else                 looperAccoda(loopRipetibile ? LOOP_RIPETI : LOOP_ANNULLA);
      break;
    case 2:
      looperAccoda(LOOP_SUONA);
      break;
    default:                               // ferma: prima si chiude quello che registra
      if (loopRegistra)         looperAccoda(LOOP_FINE_REC, LOOP_FERMA);
      else if (loopSovraincide) looperAccoda(LOOP_FINE_DUB, LOOP_FERMA);
      else                      looperAccoda(LOOP_FERMA);
      break;
  }
}

/** Il loop e' vuoto davvero: niente registrato, niente in corso, e l'ampli
 *  non sta mandando la posizione (0x0377 arriva solo con un loop che suona).
 *  Battute e tempo si cambiano solo cosi', come nell'app: con un loop
 *  registrato l'ampli si impalla (segnalato dall'utente il 7 ottobre). */
static bool loopVuoto() {
  return !loopPresente && !loopRegistra && !loopSovraincide && !contaTempo && posLoop < 0;
}

/** FS5 nel looper: il tap tempo. Solo a loop vuoto: un loop gia' registrato
 *  ha il suo tempo, e cambiarglielo sotto non sappiamo cosa faccia. Il bpm
 *  nuovo si vede subito in alto; all'ampli lo manda il loop (0x0176). */
static void looperTap() {
  if (!chScrittura) return;
  if (!loopVuoto()) { avvisa("tempo: a loop vuoto"); return; }
  if (!lungImpostazioni) { avvisa("tempo non ancora letto"); return; }
  const uint32_t ora = millis();
  const uint32_t passo = ora - tapUltimo;
  tapUltimo = ora;
  if (passo > 2000) { tapQuanti = 0; return; }   // il primo colpo di una serie
  tapIntervalli[tapQuanti % 3] = passo;
  tapQuanti++;
  const uint8_t q = tapQuanti < 3 ? tapQuanti : 3;
  uint32_t somma = 0;
  for (uint8_t i = 0; i < q; i++) somma += tapIntervalli[i];
  uint32_t bpm = (60000UL * q + somma / 2) / somma;
  if (bpm < 40) bpm = 40;
  if (bpm > 250) bpm = 250;
  loopBpm = (uint16_t)bpm;
  tempoDa = ora;                           // il LED del tempo si rimette sul colpo
  impostazioniDaMandare = true;
  schermoSporco = true;
}

/** I tasti banco nel looper: meno o piu' battute, fino a «libero». Solo a
 *  loop vuoto, come nell'app: con un loop registrato non si cambiano. */
static void looperBattute(int8_t passo) {
  if (!chScrittura) return;
  if (!loopVuoto()) { avvisa("battute: a loop vuoto"); return; }
  if (!lungImpostazioni) { avvisa("impostazioni non lette"); return; }
  int8_t i = N_BATTUTE;                    // «libero»
  if (!loopLibero) {
    i = 0;
    while (i < N_BATTUTE - 1 && BATTUTE[i] < loopBattute) i++;
  }
  i += passo;
  if (i < 0) i = 0;
  if (i > N_BATTUTE) i = N_BATTUTE;
  loopLibero = i == N_BATTUTE;
  if (!loopLibero) loopBattute = BATTUTE[i];
  char t[20];
  if (loopLibero) snprintf(t, sizeof(t), "lunghezza libera");
  else snprintf(t, sizeof(t), "%u battut%c", loopBattute, loopBattute == 1 ? 'a' : 'e');
  avvisa(t);
  impostazioniDaMandare = true;
}

/** FS5 tenuto tre secondi: dentro o fuori dal looper. */
static void cambiaLooper() {
  if (!looper && ampliScelto == AMPLI_NEO) { avvisa("il NEO non ha looper"); return; }
  looper = !looper;
  inCoda = -1;
  looperQuanti = looperFatti = 0;
  if (looper) { looperChiedi = true; tempoDa = millis(); }       // com'e' messo adesso: lo dice l'ampli
  avvisa(looper ? "modalita' looper" : "modalita' preset");
  Serial.printf("looper %s\n", looper ? "acceso" : "spento");
  aggiornaLed();
  schermoSporco = true;
}

