// prova-ble, 06-banchi-midi.ino — Meta', banchi, la richiesta di un preset, la modalita' MIDI.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/** Il quinto footswitch: cambia la meta' mostrata **senza toccare il suono**.
 *  Provato col piede nel simulatore il 16 agosto 2026: premere questo tasto
 *  non deve cambiare quello che stai suonando, perche' sul palco la sorpresa
 *  e' il difetto peggiore. Costa una pedalata in piu' per la coppia
 *  strofa/ritornello, e va bene cosi'. */
static void cambiaMeta() {
  if (quantiPosti() <= 4) {              // l'Amp Preset del NEO: quattro, una meta' sola
    metaMostrata = 0;
    avvisa("4 preset, una meta'");
    return;
  }
  metaMostrata = metaMostrata ? 0 : 1;
  Serial.printf("meta' %c mostrata; suona ancora %s\n",
                metaMostrata ? 'B' : 'A', nomeSuona[0] ? nomeSuona : "(niente)");
  aggiornaLed();
  schermoSporco = true;
}

/** L'elenco dei banchi a disposizione: **quello del firmware c'e' sempre**
 *  (slot -1), e dietro vengono gli slot occupati in memoria. Il banco del
 *  firmware non e' un ripiego da nascondere: e' quello che il pedale suona
 *  appena uscito dalla scatola, e va raggiungibile coi tasti come gli altri. */
static uint8_t elencoBanchi(int8_t* fuori) {
  uint8_t quanti = 0;
  fuori[quanti++] = -1;
  for (uint8_t s = 0; s < BANCHI_MAX; s++) {
    char percorso[16];
    nomeFile(s, percorso, sizeof(percorso));
    if (LittleFS.exists(percorso)) fuori[quanti++] = (int8_t)s;
  }
  return quanti;
}

/** I due tasti a mano: il banco precedente e il successivo. **Anche questi non
 *  toccano il suono**, per la stessa ragione del cambio meta': cambia solo
 *  quello che i quattro tasti vogliono dire. Finche' non se ne preme uno, i
 *  LED restano spenti, perche' il suono che si sente viene da un altro banco. */
static void cambiaBanco(int8_t passo) {
  int8_t elenco[BANCHI_MAX + 1];
  const uint8_t quanti = elencoBanchi(elenco);
  if (quanti < 2) {
    Serial.println(F("c'e' solo il banco dell'ampli"));
    avvisa("un solo banco");
    return;
  }

  uint8_t dove = 0;
  while (dove < quanti && elenco[dove] != slotBanco) dove++;
  if (dove >= quanti) dove = 0;
  const int8_t s = elenco[(dove + quanti + (passo > 0 ? 1 : quanti - 1)) % quanti];

  if (s < 0) {
    bancoLibera(bancoAttivo);            // torna quello del firmware
  } else {
    BancoCaricato nuovo = {};
    if (!bancoCarica((uint8_t)s, nuovo)) {
      Serial.printf("il banco nello slot %d non si legge\n", s);
      avvisa("banco illeggibile");
      return;
    }
    bancoLibera(bancoAttivo);
    bancoAttivo = nuovo;
  }
  slotBanco = s;
  ricordaBanco(s);
  metaMostrata = 0;                      // un banco nuovo si presenta dalla meta' A
  avvisa(bancoAttivo.valido ? bancoAttivo.nome : "Amp Preset");
  bersaglio = 0;
  Serial.printf("banco \"%s\" (slot %d); suona ancora %s\n",
                bancoAttivo.nome, s, nomeSuona[0] ? nomeSuona : "(niente)");
  aggiornaLed();
  schermoSporco = true;
}

/** Chiede un preset. Non lo manda qui: lo raccoglie il loop, cosi' una
 *  pressione durante un trasferimento si accoda invece di ricorrere. */
static void richiedi(uint8_t n) {
  if (inCoda >= 0) pressioniPerse++;       // ne stava gia' aspettando una: vince l'ultima
  bersaglio = n % quantiPosti();
  inCoda = bersaglio;
  if (diagnostica)
    Serial.printf("  = accettata -> %s%s\n", nomePosto(bersaglio),
                  inTrasferimento ? "  (in coda, trasferimento in corso)" : "");
}

/** Si agisce alla pressione, non al rilascio. L'antirimbalzo guarda il port A
 *  **intero**: un rimbalzo su una linea qualunque allunga l'attesa di qualche
 *  millisecondo per tutte, che e' irrilevante sotto un piede e tiene il codice
 *  in un posto solo. */
/** Un messaggio MIDI verso tutti e due: USB e, se c'e' qualcuno, Bluetooth.
 *  Il BLE-MIDI vuole davanti due byte di tempo (13 bit, col bit alto acceso
 *  su tutti e due): senza, il messaggio viene scartato in silenzio. */
static void mandaMidi(uint8_t stato, uint8_t dato1, int dato2) {
  if ((stato & 0xf0) == 0xc0) midi.programChange(dato1, (uint8_t)((stato & 0x0f) + 1));
  else                        midi.controlChange(dato1, (uint8_t)dato2, (uint8_t)((stato & 0x0f) + 1));
  if (!midiCentrale || !chMidi) return;
  const uint16_t t = (uint16_t)(millis() & 0x1fff);
  uint8_t p[5];
  uint8_t n = 0;
  p[n++] = (uint8_t)(0x80 | ((t >> 7) & 0x3f));
  p[n++] = (uint8_t)(0x80 | (t & 0x7f));
  p[n++] = stato;
  p[n++] = dato1;
  if (dato2 >= 0) p[n++] = (uint8_t)dato2;
  chMidi->setValue(p, n);
  chMidi->notify();
}

/** Un footswitch in modalita' MIDI. */
static void midiPremuto(uint8_t k) {
  if (k == FS5) {
    paginaMidi = paginaMidi ? 0 : 1;
    Serial.printf("MIDI: pagina %s\n", paginaMidi ? "stomp" : "preset");
  } else if (k == BANCO_SX || k == BANCO_DX) {
    if (paginaMidi == 1) { avvisa("i gruppi sono dei preset"); return; }
    // Otto preset, chiesto dall'utente il 24 settembre: il tasto banco sinistro
    // mostra 1-4, il destro 5-8. Diretti, non a giro: si sa sempre dove si va.
    gruppoMidi = k == BANCO_DX ? 1 : 0;
    Serial.printf("MIDI: preset %u-%u\n", gruppoMidi * 4 + 1, gruppoMidi * 4 + 4);
  } else if (paginaMidi == 0) {
    programmaMidi = (int16_t)(gruppoMidi * 4 + k);
    mandaMidi((uint8_t)(0xc0 | (MIDI_CANALE - 1)), (uint8_t)programmaMidi, -1);
    Serial.printf("MIDI: program change %d\n", programmaMidi);
  } else {
    stompAccesi ^= (uint8_t)(1 << k);
    const bool su = stompAccesi & (1 << k);
    mandaMidi((uint8_t)(0xb0 | (MIDI_CANALE - 1)), (uint8_t)(MIDI_CC_STOMP + k), su ? 127 : 0);
    Serial.printf("MIDI: CC %u = %u\n", MIDI_CC_STOMP + k, su ? 127 : 0);
  }
  aggiornaLed();
  schermoSporco = true;
}

