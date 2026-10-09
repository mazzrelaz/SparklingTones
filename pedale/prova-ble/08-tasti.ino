// prova-ble, 08-tasti.ino — La modalita' (Spark/MIDI), la scelta dell'ampli, la lettura dei tasti.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

static void annuncia();                    // sta col ponte, piu' giu'

/** FS1 e FS4 tenuti insieme: si passa all'altra modalita'. Entrando in MIDI lo
 *  Spark si lascia libero (in MIDI non serve, e cosi' l'app lo trova); tornando
 *  a Spark lo si ricerca. */
static void cambiaModo() {
  modo = modo == MODO_MIDI ? MODO_SPARK : MODO_MIDI;
  looper = false;
  ricordaModo();
  inCoda = -1;
  if (modo == MODO_MIDI) {
    if (client && client->isConnected()) client->disconnect();
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
    nomeSuona[0] = 0;
    annuncia();                            // l'iPad ora ci trova
    avvisa(TESTO("modalita' MIDI", "MIDI mode"));
  } else {
    momentoSgancio = millis();
    ultimoTentativo = 0;
    if (midiCentrale && serverPonte) serverPonte->disconnect(connApp);
    annuncia();
    avvisa(TESTO("modalita' Spark", "Spark mode"));
  }
  Serial.printf("modalita' %s\n", modo == MODO_MIDI ? "MIDI" : "Spark");
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
    if (!giuOra || giuPrima) continue;                     // solo le pressioni
    pressioniViste++;

    // I due tasti banco insieme restano la combinazione del ponte anche qui.
    if (modo == MODO_MIDI) {
      if (k == BANCO_SX || k == BANCO_DX) {
        const uint8_t altro = (k == BANCO_SX) ? BANCO_DX : BANCO_SX;
        if (!(ingressi & (uint8_t)(1 << LINEA_PULSANTE[altro]))) continue;
      }
      midiPremuto(k);
      continue;
    }

    // FS5 tenuto tre secondi entra nel looper (lo guarda il loop): la meta'
    // cambiata alla pressione allora si rimette com'era.
    if (k == FS5) {
      if (looper) looperTap();             // tenuto tre secondi, invece, esce
      else { metaPrimaDiFS5 = metaMostrata; cambiaMeta(); }
      continue;
    }
    // I due tasti banco insieme sono la combinazione che apre il ponte:
    // mentre l'altro e' premuto, questo non cambia banco.
    if (k == BANCO_SX || k == BANCO_DX) {
      const uint8_t altro = (k == BANCO_SX) ? BANCO_DX : BANCO_SX;
      if (!(ingressi & (uint8_t)(1 << LINEA_PULSANTE[altro]))) continue;
      if (!chScrittura && !sganciato) { scegliAmpli(k == BANCO_DX ? AMPLI_NEO : AMPLI_SPARK2); continue; }
      if (looper) { looperBattute(k == BANCO_DX ? +1 : -1); continue; }
      cambiaBanco(k == BANCO_DX ? +1 : -1);
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

