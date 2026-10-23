// prova-ble, 08-tasti.ino — La modalita' (Spark/MIDI/Play Acoustic) e il suo menu, la scelta dell'ampli, la lettura dei tasti.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

static void annuncia();                    // sta col ponte, piu' giu'

/** La modalita' scelta dal menu. Lasciando Spark lo Spark si lascia libero (in
 *  MIDI e in Play Acoustic non serve, e cosi' l'app lo trova); tornando a Spark
 *  lo si ricerca. Fra MIDI e Play Acoustic chi e' collegato per il MIDI resta. */
static void cambiaModo(uint8_t nuovo) {
  if (nuovo == modo) return;
  const uint8_t prima = modo;
  if (prima == MODO_PLAY) playLasciaTutti();     // niente pulsanti appesi sull'adattatore
  modo = nuovo;
  looper = false;
  // Il tuner si chiude, e l'ampli torna a suonare prima che il pedale lo lasci.
  if (tunerAcceso && chScrittura) {
    const uint8_t c2 = 0xc2;
    uint8_t frame[16];
    manda(frame, costruisci(0x01, 0x65, &c2, 1, frame));
    tunerAcceso = false;
  }
  tuner = false;
  bancoInAttesa = -1;
  inCoda = -1;
  if (modo != MODO_SPARK) {
    if (prima == MODO_SPARK) {
      if (client && client->isConnected()) client->disconnect();
      chScrittura = chNotifiche = nullptr;
      dentro = 0;
      nomeSuona[0] = 0;
    }
    annuncia();                            // l'iPad, o l'adattatore, ora ci trova
    avvisa(modo == MODO_MIDI ? TESTO("modalita' MIDI", "MIDI mode")
                             : TESTO("Play Acoustic", "Play Acoustic"));
  } else {
    momentoSgancio = millis();
    ultimoTentativo = 0;
    if (midiCentrale && serverPonte) serverPonte->disconnect(connApp);
    annuncia();
    avvisa(TESTO("modalita' Spark", "Spark mode"));
  }
  Serial.printf("modalita' %s\n", nomeModo(modo));
  aggiornaLed();
  schermoSporco = true;
}

/** I tasti banco senza lo Spark: sinistro lo Spark 2, destro il NEO. Se si
 *  cambia, quello gia' trovato era l'altro: si butta e si ricerca subito. */
static void scegliAmpli(uint8_t a) {
  sceltaFino = 0;                        // scelto: niente piu' attesa
  schermoSporco = true;
  if (a == ampliScelto) return;
  ampliScelto = a;
  if (a == AMPLI_NEO) looper = false;    // il NEO il looper non ce l'ha
  ricordaAmpli();
  memset(nomiAmpli, 0, sizeof(nomiAmpli));
  if (metaMostrata && quantiPosti() <= 4) metaMostrata = 0;
  if (scansioneInCorso) { BLEDevice::getScan()->stop(); scansioneInCorso = false; }
  if (trovato) { delete trovato; trovato = nullptr; }
  ultimoTentativo = 0;
  Serial.printf("cerco %s\n", a == AMPLI_NEO ? "lo Spark NEO" : "lo Spark 2");
}

/** FS4 tenuto (lo guarda il loop): il menu parte dalla modalita' di adesso. */
static void apriMenu() {
  if (modo == MODO_PLAY) playLasciaTutti();
  menuAperto = true;
  menuScelta = modo;
  menuFino = millis() + MENU_MS;
  bancoInAttesa = -1;
  Serial.println(F("menu delle modalita'"));
  aggiornaLed();
  schermoSporco = true;
}

static void chiudiMenu() {
  menuAperto = false;
  menuFino = 0;
  aggiornaLed();
  schermoSporco = true;
}

/** Un tasto col menu aperto: i tasti banco scorrono (sinistro su, destro giu'),
 *  FS5 conferma, FS1-FS4 escono senza cambiare. Non fa nient'altro. */
static void menuPremuto(uint8_t k) {
  menuFino = millis() + MENU_MS;
  if (k == BANCO_SX)      menuScelta = (uint8_t)((menuScelta + 2) % 3);
  else if (k == BANCO_DX) menuScelta = (uint8_t)((menuScelta + 1) % 3);
  else if (k == FS5)      { chiudiMenu(); cambiaModo(menuScelta); return; }
  else                    { chiudiMenu(); return; }
  schermoSporco = true;
}

static void leggiTasto() {
  const uint8_t ingressi = leggiPortA();                   // bit alto = rilasciato

  if (ingressi != ingressiGrezzi) {        // fronte grezzo, rimbalzi compresi
    ingressiGrezzi = ingressi;
    ultimoFronte   = millis();
    frontiVisti++;
    if (diagnostica) Serial.printf("  ~ fronte  %02x  t=%lu\n", ingressi, millis());
    return;
  }
  if (ingressi == ingressiFermi) return;                   // gia' registrato
  if (millis() - ultimoFronte < ANTIRIMBALZO) return;      // non ancora fermo

  const uint8_t prima = ingressiFermi;
  ingressiFermi = ingressi;

  for (uint8_t k = 0; k < N_PULSANTI; k++) {
    const uint8_t bit = (uint8_t)(1 << LINEA_PULSANTE[k]);
    const bool giuPrima = !(prima & bit);
    const bool giuOra   = !(ingressi & bit);
    // Il rilascio conta solo per il tasto banco: cambia banco quando si lascia,
    // se non e' stato tenuto per il tuner o usato con l'altro per il ponte.
    if (giuPrima && !giuOra) {
      // In Play Acoustic il rilascio e' un comando anche lui (manda lo 0).
      if (modo == MODO_PLAY) playTasto(k, false);
      if ((int8_t)k == bancoInAttesa) {
        bancoInAttesa = -1;
        if (!bancoAnnullato && !tuner && !looper && modo == MODO_SPARK && chScrittura)
          cambiaBanco(k == BANCO_DX ? +1 : -1);
      }
      continue;
    }
    if (!giuOra || giuPrima) continue;                     // solo le pressioni
    pressioniViste++;

    // Col menu aperto i tasti servono solo al menu.
    if (menuAperto) { menuPremuto(k); continue; }

    // In Play Acoustic ogni tasto e' un pulsante del Switch-6, tasti banco
    // compresi (Preset Down/Up): niente ponte, niente tuner.
    if (modo == MODO_PLAY) { playTasto(k, true); continue; }

    // I due tasti banco insieme restano la combinazione del ponte anche qui.
    if (modo == MODO_MIDI) {
      if (k == BANCO_SX || k == BANCO_DX) {
        const uint8_t altro = (k == BANCO_SX) ? BANCO_DX : BANCO_SX;
        if (!(ingressi & (uint8_t)(1 << LINEA_PULSANTE[altro]))) continue;
      }
      midiPremuto(k);
      continue;
    }

    // Nel tuner un tasto qualunque esce, e non fa altro.
    if (tuner) { esciTuner(); continue; }

    // FS5 tenuto tre secondi entra nel looper (lo guarda il loop): la meta'
    // cambiata alla pressione allora si rimette com'era.
    if (k == FS5) {
      if (looper) looperTap();             // tenuto tre secondi, invece, esce
      else { metaPrimaDiFS5 = metaMostrata; cambiaMeta(); }
      continue;
    }
    // I due tasti banco insieme sono la combinazione che apre il ponte:
    // mentre l'altro e' premuto, questo non cambia banco, e nemmeno l'altro.
    if (k == BANCO_SX || k == BANCO_DX) {
      const uint8_t altro = (k == BANCO_SX) ? BANCO_DX : BANCO_SX;
      if (!(ingressi & (uint8_t)(1 << LINEA_PULSANTE[altro]))) { bancoAnnullato = true; continue; }
      if (!chScrittura && !sganciato) { scegliAmpli(k == BANCO_DX ? AMPLI_NEO : AMPLI_SPARK2); continue; }
      if (looper) { looperBattute(k == BANCO_DX ? +1 : -1); continue; }
      // Il banco cambia al rilascio (qui sopra); tenuto due secondi, il loop
      // apre invece il tuner (20 ottobre 2026).
      bancoInAttesa = (int8_t)k;
      bancoPremutoDa = millis();
      bancoAnnullato = false;
      continue;
    }
    if (looper) { looperPremuto(k); continue; }

    // I quattro sotto il piede: il posto dipende dalla meta' mostrata.
    const uint8_t posto = (uint8_t)(metaMostrata * 4 + k);
    if (posto >= quantiPosti() || !postoPieno(posto)) {
      Serial.printf("posto %c%u vuoto\n", metaMostrata ? 'B' : 'A', k + 1);
      continue;
    }
    richiedi(posto);
  }
}

