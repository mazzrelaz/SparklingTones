// prova-ble, 05-preset.ino — I preset: lettura dei nomi dall'ampli, invio sullo Spark 2 e sul NEO, il banco ricordato.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/* ======================================================================
   Il preset intero: 0x0101 sul buffer 0x7f, poi 0x0138 con 0x7f.

   Vale per i banchi mandati dall'app (l'Amp Preset seleziona lo slot e
   basta). I frame arrivano gia' pronti, il firmware non serializza niente: **corregge un byte
   solo**, il sequence number all'indice 2, perche' il checksum e' uno XOR
   dei soli byte impacchettati e quindi non lo copre.

   Tutti i chunk vanno con LO STESSO seq: e' cosi' che l'ampli li raggruppa,
   e incrementarlo gli fa vedere N messaggi scollegati che conferma tutti
   senza assemblarne nessuno.
   ====================================================================== */

/** Manda una domanda e aspetta la risposta intera, leggendo i tasti nel
 *  frattempo. `silenzio` e' il tempo senza pezzi dopo cui ci si arrende: ogni
 *  pezzo che arriva fa ripartire l'attesa (sul NEO certi giorni arrivano lenti,
 *  4 ottobre 2026). Ritorna true se la risposta e' finita. */
static bool chiediEAspetta(uint8_t cmd, uint8_t sub, const uint8_t* dati, size_t n,
                           uint8_t subRisposta, uint32_t silenzio) {
  uint8_t frame[32];
  attesaSeq = 0;
  memset(lungPezzo, 0, sizeof(lungPezzo));
  nomeLetto[0] = 0;
  rispostaFinita = false;
  const uint8_t mio = seq;
  const size_t len = costruisci(cmd, sub, dati, n, frame);
  attesaSub = subRisposta;
  attesaSeq = mio;
  ultimoPezzo = millis();
  manda(frame, len);
  while (!rispostaFinita && chScrittura && millis() - ultimoPezzo < silenzio) { leggiTasto(); delay(1); }
  attesaSeq = 0;
  return rispostaFinita;
}

/** Il nome di un preset, dall'inizio del payload: banco, numero, UUID, nome.
 *  Interi diretti sotto 0x80 o con prefisso 0xcc/0xcd/0xce; stringhe 0xa0+n o
 *  0xd9 n. Se qualcosa non torna, il nome resta vuoto e il display dice «...». */
static void nomeDalPreset(char* fuori, size_t max) {
  uint8_t p[6 * 32];
  size_t np = 0;
  for (uint8_t i = 0; i < 6 && lungPezzo[i]; i++) {
    memcpy(p + np, pezzi[i], lungPezzo[i]);
    np += lungPezzo[i];
  }
  fuori[0] = 0;
  size_t i = 0;
  for (uint8_t intero = 0; intero < 2; intero++) {
    if (i >= np) return;
    const uint8_t b = p[i++];
    if (b == 0xcc) i += 1; else if (b == 0xcd) i += 2; else if (b == 0xce) i += 4;
    else if (b > 0x7f) return;
  }
  for (uint8_t stringa = 0; stringa < 2; stringa++) {
    if (i >= np) return;
    const uint8_t b = p[i++];
    size_t l;
    if (b >= 0xa0 && b <= 0xbf) l = b - 0xa0;
    else if (b == 0xd9 && i < np) l = p[i++];
    else return;
    if (i + l > np) return;
    if (stringa == 1) {
      // il nome: niente spazi in coda, che il display non mostra comunque
      while (l && p[i + l - 1] == ' ') l--;
      const size_t c = l < max - 1 ? l : max - 1;
      memcpy(fuori, p + i, c);
      fuori[c] = 0;
    }
    i += l;
  }
}


/** Appena collegati: e' l'ampli scelto? E come si chiamano i suoi preset?
 *  Il nome si chiede con 0x0211; se e' l'altro ampli lo si molla e lo si salta
 *  per un minuto. Poi un 0x0201 per slot: dei preset si tiene solo il nome. */
static void avvisa(const char* testo);

static void leggiAmpli() {
  memset(nomiAmpli, 0, sizeof(nomiAmpli));   // quelli di prima erano di un altro collegamento
  silenzioso = true;                     // sedici pezzi per preset: rumore sul seriale
  if (chiediEAspetta(0x02, 0x11, nullptr, 0, 0x11, 1500)) {
    const bool neo = strstr(nomeLetto, "NEO") != nullptr;
    Serial.printf("l'ampli dice di chiamarsi \"%s\"\n", nomeLetto);
    if (neo != (ampliScelto == AMPLI_NEO)) {
      Serial.println(F("non e' l'ampli scelto: lo mollo"));
      snprintf(escluso, sizeof(escluso), "%s", client->getPeerAddress().toString().c_str());
      esclusoFino = millis() + 60000;
      avvisa(neo ? TESTO("e' il NEO", "it's the NEO") : TESTO("e' lo Spark 2", "it's the Spark 2"));
      client->disconnect();
      silenzioso = false;
      return;
    }
  }
  for (uint8_t s = 0; s < slotDellAmpli() && chScrittura; s++) {
    const uint8_t dati[2] = { 0x00, s };
    const uint32_t t0 = millis();
    const bool finito = chiediEAspetta(0x02, 0x01, dati, 2, 0x01, 1500);
    nomeDalPreset(nomiAmpli[s], sizeof(nomiAmpli[s]));
    Serial.printf("slot %u: \"%s\" — %lu ms%s\n", s, nomiAmpli[s], millis() - t0,
                  finito ? "" : "  (risposta incompleta)");
    schermoSporco = true;
    if (!bancoAttivo.valido) disegnaSchermo();    // i nomi compaiono uno alla volta
  }
  silenzioso = false;
}

static void mandaPresetNeo(uint8_t n);

static void mandaPreset(uint8_t n) {
  if (!chScrittura) { Serial.println(F("non connesso")); return; }
  if (n >= quantiPosti()) return;
  if (!postoPieno(n)) { Serial.printf("[%u] posto vuoto\n", n + 1); return; }

  // Sul NEO i banchi vanno a pezzi grandi: meta' del tempo (vedi mandaPresetNeo).
  if (bancoAttivo.valido && ampliScelto == AMPLI_NEO) { mandaPresetNeo(n); return; }

  /* L'Amp Preset: si seleziona lo slot, e basta. Istantaneo, e sull'ampli non
   * si scrive niente. */
  if (!bancoAttivo.valido) {
    cambiaPreset(n);
    Serial.printf("[%u] %s — slot selezionato\n", n + 1, nomePosto(n));
    corrente = n;
    metaSuona = (uint8_t)(n / 4);
    slotSuona = slotBanco;
    snprintf(nomeSuona, sizeof(nomeSuona), "%s", nomePosto(n));
    aggiornaLed();
    schermoSporco = true;
    return;
  }

  const uint8_t quanti = chunkDelPosto(n);
  const uint8_t mio    = seq;
  if (++seq > 0x3e) seq = 0x01;

  inTrasferimento = true;
  silenzioso = true;
  const uint32_t t0 = millis();
  uint32_t ack = 0, persi = 0;

  for (uint8_t i = 0; i < quanti; i++) {
    uint8_t frame[64];
    uint8_t len = 0;
    const uint8_t* origine = frameDelPosto(n, i, len);
    if (len == 0 || len > sizeof(frame)) { persi++; continue; }
    memcpy(frame, origine, len);
    frame[2] = mio;                      // il checksum non copre il seq

    const uint32_t prima = rxTotali;
    chScrittura->writeValue(frame, len, false);
    const uint32_t t = millis();
    while (rxTotali == prima && millis() - t < 500) { leggiTasto(); delay(1); }
    // Un ack mancante non e' motivo di fermarsi: anche il firmware dell'ampli
    // si sblocca da solo dopo mezzo secondo, e interrompersi lascerebbe il
    // preset scritto a meta'.
    if (rxTotali > prima) ack++; else persi++;
  }
  silenzioso = false;
  inTrasferimento = false;

  cambiaPreset(0x7f);                    // fa suonare il buffer software
  const uint32_t tTotale = millis() - t0;

  Serial.printf("[%u] %s — %lu ms, %u/%u ack%s\n",
                n + 1, nomePosto(n), tTotale, ack, quanti,
                persi ? "  (ATTENZIONE: qualche chunk non confermato)" : "");
  corrente = n;
  // Da qui dipendono i LED: il suono che si sente, da che meta' e da che banco
  // viene. Il nome si **copia**, perche' cambiando banco quello di prima non
  // esiste piu' e la riga ♪ resterebbe senza niente da dire.
  metaSuona = (uint8_t)(n / 4);
  slotSuona = slotBanco;
  snprintf(nomeSuona, sizeof(nomeSuona), "%s", nomePosto(n));
  aggiornaLed();
  schermoSporco = true;
}

/* --- Sul NEO: lo stesso preset a pezzi da 128 ------------------------------
 *
 * Misurato il 4 ottobre 2026 col NEO: ogni pezzo costa ~40 ms piu' ~1 ms per
 * byte, qualunque sia l'intervallo di connessione (il giro e' ~100 ms anche a
 * 7,5 ms; lo Spark 2 ne fa 26). Coi pezzi da 25 dell'app un preset sono 15-17
 * pezzi e 1,0-1,15 s; a pezzi da 128, come fa Ignitron col NEO, 3-4 pezzi e
 * 0,5-0,77 s premendo i footswitch, tutti confermati. Mandarli di fila senza
 * aspettare l'ack invece peggiorava (1,3-1,4 s).
 *
 * **Sullo Spark 2 i pezzi da 128 lo disconnettono**: questa strada e' solo
 * per il NEO. I banchi restano quelli dell'app, uguali per tutti e due gli
 * ampli: qui il firmware ricompone il payload dai frame e lo ridivide, senza
 * toccare il preset (deciso dall'utente, strada A, il 4 ottobre 2026). */
static void mandaPresetNeo(uint8_t n) {
  if (!chScrittura) { Serial.println(F("non connesso")); return; }
  if (ampliScelto != AMPLI_NEO || !bancoAttivo.valido || n >= quantiPosti() || !postoPieno(n)) return;

  static uint8_t payload[1024];
  size_t np = 0;
  for (uint8_t i = 0; i < chunkDelPosto(n); i++) {
    uint8_t len = 0;
    const uint8_t* f = frameDelPosto(n, i, len);
    uint8_t dati[64];
    const size_t nd = spacchetta(f + 6, len - 7, dati, sizeof(dati));
    if (nd < 3) { Serial.println(F("frame illeggibile")); return; }
    uint8_t utili = dati[2];
    if (utili > nd - 3) utili = (uint8_t)(nd - 3);
    if (np + utili > sizeof(payload)) { Serial.println(F("preset troppo grande")); return; }
    memcpy(payload + np, dati + 3, utili);
    np += utili;
  }

  const uint8_t GRANDE = 128;
  const uint8_t quanti = (uint8_t)((np + GRANDE - 1) / GRANDE);
  const uint8_t mio = seq;
  if (++seq > 0x3e) seq = 0x01;
  inTrasferimento = true;
  silenzioso = true;
  const uint32_t t0 = millis();
  uint32_t ack = 0;
  for (uint8_t c = 0; c < quanti; c++) {
    const size_t da = (size_t)c * GRANDE;
    const uint8_t pezzo = (uint8_t)((np - da) < GRANDE ? (np - da) : GRANDE);
    uint8_t dati[3 + 128];
    dati[0] = quanti; dati[1] = c; dati[2] = pezzo;
    memcpy(dati + 3, payload + da, pezzo);
    uint8_t packed[160];
    const size_t nk = impacchetta(dati, 3 + pezzo, packed);
    uint8_t frame[200];
    size_t out = 0;
    uint8_t checksum = 0;
    for (size_t k = 0; k < nk; k++) checksum ^= packed[k];
    frame[out++] = 0xf0; frame[out++] = 0x01; frame[out++] = mio; frame[out++] = checksum;
    frame[out++] = 0x01; frame[out++] = 0x01;
    memcpy(frame + out, packed, nk); out += nk;
    frame[out++] = 0xf7;

    const uint32_t prima = rxTotali;
    for (size_t k = 0; k < out; k += 20)          // write da 20: l'MTU non conta
      chScrittura->writeValue(frame + k, (out - k) < 20 ? (out - k) : 20, false);
    const uint32_t t = millis();
    while (rxTotali == prima && millis() - t < 500) { leggiTasto(); delay(1); }
    if (rxTotali > prima) ack++;
  }
  silenzioso = false;
  inTrasferimento = false;
  cambiaPreset(0x7f);
  Serial.printf("[%u] %s — %lu ms, %lu/%u ack (NEO, pezzi da 128)\n",
                n + 1, nomePosto(n), millis() - t0, ack, quanti);
  corrente = n;
  metaSuona = (uint8_t)(n / 4);
  slotSuona = slotBanco;
  snprintf(nomeSuona, sizeof(nomeSuona), "%s", nomePosto(n));
  aggiornaLed();
  schermoSporco = true;
}

/* --- Il banco si ricorda allo spegnimento --------------------------------
 *
 * Senza, il pedale ripartiva sempre dal primo slot che trovava: chi aveva
 * scelto il banco del secondo set se lo ritrovava cambiato alla riaccensione,
 * e sul palco e' la stessa sorpresa che il quinto footswitch evita.
 *
 * Basta un byte in LittleFS, che c'e' gia' per i banchi. Se il file manca, o
 * dice uno slot vuoto, si ricade sul primo che c'e': un pedale che non parte
 * perche' manca un file sarebbe molto peggio. */
static const char* VIA_ULTIMO = "/ultimo.txt";

static const uint8_t FIRMWARE = 0xff;     // il banco del firmware, che non ha slot

static void ricordaBanco(int8_t slot) {
  File f = LittleFS.open(VIA_ULTIMO, "w");
  if (!f) { Serial.println(F("non riesco a ricordare il banco")); return; }
  f.write(slot < 0 ? FIRMWARE : (uint8_t)slot);
  f.close();
}

/** Lo slot ricordato, -1 per il banco del firmware, -100 se non c'e' niente. */
static int16_t bancoRicordato() {
  if (!LittleFS.exists(VIA_ULTIMO)) return -100;
  File f = LittleFS.open(VIA_ULTIMO, "r");
  if (!f) return -100;
  const int v = f.read();
  f.close();
  if (v == FIRMWARE) return -1;
  return (v >= 0 && v < BANCHI_MAX) ? (int16_t)v : -100;
}

static void avvisa(const char* testo) {
  snprintf(avvisoTesto, sizeof(avvisoTesto), "%s", testo);
  avvisoFino = millis() + 2000;
  schermoSporco = true;
}

