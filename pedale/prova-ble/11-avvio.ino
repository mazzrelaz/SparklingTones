// prova-ble, 11-avvio.ino — Il LED del tempo (un compito suo), setup() e loop().
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/* Il LED del tempo, su D1: **solo nel looper, al bpm scelto** (deciso
 * dall'utente il 7 ottobre). Un lampo corto a ogni tempo, tutti uguali
 * (l'utente non vuole l'«uno» piu' lungo). I tempi si contano dall'inizio di quello che sta
 * succedendo: il conteggio, la registrazione, il giro che suona; a loop vuoto
 * o fermo, dall'ultimo cambio di tempo.
 *
 * **Un compito suo, non il loop**: ogni ridisegno del display tiene il loop
 * fermo 30-40 ms, proprio all'inizio di ogni tempo (l'anello cambia blocco),
 * e il LED «s'incantava su un beat» (l'utente, 7 ottobre). Qui gira ogni
 * millisecondo con priorita' piu' alta del loop, e legge solo variabili. */
static void compitoLedTempo(void*) {
  bool prima = false;
  uint32_t clicPrima = 0;
  int32_t  tempoRec = -1;                 // il tempo della registrazione gia' cliccato
  uint32_t clicRecDa = 0, toneRec = 0;
  for (;;) {
    /* Il click del conteggio: qui e non nel loop per lo stesso motivo del LED.
     * Il tempo (e quindi l'«uno») si ricava da contaDa, non da contaTempo, che
     * il loop aggiorna in ritardo quando ridisegna. */
    uint32_t clic = 0;
    if (contaTempo && loopBpm) {
      const uint32_t tempo = 60000UL / loopBpm;
      const uint32_t passato = millis() - contaDa;
      if (passato % tempo < CLIC_MS) clic = passato < tempo ? CLIC_UNO_HZ : CLIC_ALTRI_HZ;
    } else if (loopRegistra && loopClick && loopBpm) {
      /* E continua per tutta la prima registrazione, a ogni lunghezza, «libero»
       * compreso (chiesto dall'utente il 14 ottobre 2026), col tono alto
       * sull'«uno» di ogni battuta; non durante la sovraincisione.
       * **Un click per tempo, contato dal numero del tempo** e non dal resto:
       * la conferma dell'ampli (~35 ms dopo il nostro 0x04) rimette registraDa,
       * e col resto l'«uno» suonava due volte, «titic» (l'utente, 2.20). */
      const uint32_t tempo = 60000UL / loopBpm;
      const int32_t  passato = (int32_t)(millis() - registraDa);
      const int32_t  n = passato > 0 ? passato / (int32_t)tempo : 0;
      if (n != tempoRec) {
        tempoRec = n;
        clicRecDa = millis();
        toneRec = n % 4 == 0 ? CLIC_UNO_HZ : CLIC_ALTRI_HZ;
      }
      if (millis() - clicRecDa < CLIC_MS) clic = toneRec;
    }
    if (!loopRegistra) tempoRec = -1;
    if (clic != clicPrima) { clicPrima = clic; ledcWriteTone(PIN_CLIC, clic); }

    bool acceso = false;
    if (looper && loopBpm) {
      const uint32_t tempo = 60000UL / loopBpm;
      uint32_t da = tempoDa;
      if (contaTempo)                                          da = contaDa;
      else if (loopRegistra)                                   da = registraDa;
      else if ((loopSuona || loopSovraincide) && inizioGiro)   da = inizioGiro;
      const uint32_t passato = millis() - da;
      acceso = passato % tempo < LAMPO_TEMPO_MS;
    }
    if (acceso != prima) { prima = acceso; digitalWrite(PIN_LED_TEMPO, acceso ? HIGH : LOW); }
    vTaskDelay(1);
  }
}

void setup() {
  Serial.begin(115200);
  /* Senza questa, se al PC nessuno legge la porta ogni stampa resta appesa
   * fino a un timeout e il firmware striscia — e nel pedale vero, sul palco,
   * il PC non c'e'. Vedi CLAUDE.md, «Trappole dell'ambiente». */
  Serial.setTxTimeoutMs(0);
  delay(600);
  Serial.println(F("\nprova-ble — pedale Spark 2 / Spark NEO"));
  pinMode(PIN_TASTO, INPUT_PULLUP);
  pinMode(PIN_LED_TEMPO, OUTPUT);          // il LED del tempo, spento finche' non c'e' il looper
  digitalWrite(PIN_LED_TEMPO, LOW);
  ledcAttach(PIN_CLIC, CLIC_UNO_HZ, 8);    // il click del conteggio, muto finche' non conta
  ledcWriteTone(PIN_CLIC, 0);
  xTaskCreatePinnedToCore(compitoLedTempo, "ledTempo", 2048, nullptr, 2, nullptr, 1);
  avviaEspansore();
  schermoPresente = schermo.begin();
  if (schermoPresente) {
    schermo.setContrast(255);
    Wire.setClock(400000);   // u8g2 dopo begin() si rimette la sua velocita'
    Serial.println(F("display a 0x3c: pronto"));
    disegnaAvvio();
  } else {
    Serial.println(F("display assente: si va avanti senza"));
  }
  banchiAvvia();
  // Se in memoria c'e' gia' un banco, il pedale riparte con quello: e' la
  // prova che e' autonomo, cioe' che sopravvive allo spegnimento.
  const int16_t ricordato = bancoRicordato();
  bool scelto = false;
  if (ricordato == -1) {
    scelto = true;                       // era il banco dell'ampli, e resta quello
    Serial.println(F("riparto dall'Amp Preset, quello di prima dello spegnimento"));
  } else if (ricordato >= 0 && bancoCarica((uint8_t)ricordato, bancoAttivo)) {
    slotBanco = (int8_t)ricordato;
    scelto = true;
    Serial.printf("banco \"%s\" dallo slot %d, quello di prima dello spegnimento\n",
                  bancoAttivo.nome, ricordato);
  }
  for (uint8_t s = 0; !scelto && slotBanco < 0 && s < BANCHI_MAX; s++) {
    if (bancoCarica(s, bancoAttivo)) {
      slotBanco = (int8_t)s;
      Serial.printf("banco \"%s\" dallo slot %u\n", bancoAttivo.nome, s);
      break;
    }
  }
  modo = MODO_SPARK;                     // sempre: regola dell'utente, 23 ottobre 2026
  ampliScelto = ampliRicordato();
  sceltaFino = millis() + AVVIO_MS + SCELTA_MS;   // dopo il logo, tre secondi per cambiare ampli
  Serial.printf("ampli: %s\n", ampliScelto == AMPLI_NEO ? "Spark NEO" : "Spark 2");
  Serial.printf("modalita' %s\n", nomeModo(modo));
  aggiornaLed();   // spenti: finche' non si preme un tasto non suona niente di nostro
  BLEDevice::init("SparkPedale");
  avviaPonte();          // prima il server: cosi' l'app lo trova sempre
  annuncia();            // in modalita' MIDI l'iPad deve trovarci subito
  avviaScansione();
}

void loop() {
  /* Il display per ultimo e solo se serve: costa 32 ms, contro i 0,18 di una
   * lettura del tasto. Mai durante un trasferimento. */
  // L'avviso dura due secondi, poi il display torna a dire quello di prima.
  if (avvisoTesto[0] && (int32_t)(avvisoFino - millis()) <= 0) {
    avvisoTesto[0] = 0;
    schermoSporco = true;
  }
  // Col ponte aperto il display rinfresca il conto alla rovescia una volta al
  // secondo; per il resto si ridisegna solo quando qualcosa cambia.
  if (pontefino && !inTrasferimento) {
    static uint32_t ultimoSecondo = 0;
    if (millis() - ultimoSecondo > 1000) { ultimoSecondo = millis(); schermoSporco = true; }
  }
  // Senza lo Spark i puntini di «lo sto cercando» si muovono.
  if (modo == MODO_SPARK && !chScrittura && !sganciato && !inTrasferimento) {
    static uint32_t ultimoPasso = 0;
    if (millis() - ultimoPasso > 400) { ultimoPasso = millis(); schermoSporco = true; }
  }
  if (!inTrasferimento) { leggiBatteria(); registraBatteria(); }
  if (mvBatteria && tacche(mvBatteria) == 0) {
    static uint32_t ultimoLampo = 0;
    if (millis() - ultimoLampo > 500) { ultimoLampo = millis(); schermoSporco = true; }
  }
  if (schermoPresente && schermoSporco && !inTrasferimento
      && (int32_t)(millis() - avvioFino) >= 0) {
    schermoSporco = false;
    disegnaSchermo();
  }

  sbrigaPonte();
  sbrigaComandoPonte();

  if (client && !client->isConnected() && chScrittura) {
    Serial.println(F("connessione persa"));
    annota("connessione persa (rx totali %lu)", (unsigned long)rxTotali);
    // Quello che suonava non c'e' piu': riacceso, lo Spark suona il suo.
    nomeSuona[0] = 0;
    // Del looper non sappiamo piu' niente: lo richiede al prossimo aggancio.
    loopRegistra = loopSovraincide = loopSuona = loopPresente = false;
    looperQuanti = looperFatti = 0;
    looperChiedi = true;
    aggiornaLed();
    schermoSporco = true;
    chScrittura = chNotifiche = nullptr;
    dentro = 0;
  }
  // Dopo che l'app se n'e' andata l'ampli ci mette qualche secondo a
  // rimettersi ad annunciarsi, quindi il primo tentativo va spesso a vuoto:
  // per mezzo minuto si riprova fitto, poi si rallenta per non stare a
  // scansionare in eterno.
  if (modo == MODO_SPARK && !chScrittura && !sganciato && !scansioneInCorso && !trovato) {
    const uint32_t attesa = (millis() - momentoSgancio < 30000) ? 2000 : 5000;
    if (millis() - ultimoTentativo > attesa) {
      ultimoTentativo = millis();
      avviaScansione();
    }
  }
  // L'ampli si e' fatto vedere: ci si attacca **qui**, fuori dal callback
  // della scansione, che e' la regola di sempre per le operazioni BLE.
  if (trovato && !scansioneInCorso && !chScrittura && !sganciato && !inScelta()) {
    if (modo == MODO_SPARK && agganciaAmpli()) daLeggere = true;
    else { delete trovato; trovato = nullptr; }   // in MIDI lo Spark resta libero
  }

  // La richiesta dell'intervallo, ripetuta a connessione matura: e' quella che
  // fa la differenza fra un secondo e mezzo e quattro decimi (vedi agganciaAmpli()).
  if (chScrittura && client && ripetizioniIntervallo < 2) {
    const uint32_t quando = ripetizioniIntervallo == 0 ? 600 : 2500;
    if (millis() - momentoConnesso > quando) {
      ripetizioniIntervallo++;
      client->updateConnParams(6, 6, 0, 400);
    }
  }

  leggiTasto();
  /* I due tasti banco tenuti insieme per un secondo e mezzo aprono il ponte.
   * Si guarda il livello gia' filtrato, non i fronti: una combinazione si
   * tiene premuta, non si preme. */
  {
    static uint32_t insiemeDa = 0;
    const uint8_t sx = (uint8_t)(1 << LINEA_PULSANTE[BANCO_SX]);
    const uint8_t dx = (uint8_t)(1 << LINEA_PULSANTE[BANCO_DX]);
    // In Play Acoustic i tasti banco sono Preset Down e Up, e col menu aperto
    // scorrono: li' la combinazione non apre il ponte.
    const bool tuttiEDue = !(ingressiFermi & sx) && !(ingressiFermi & dx)
                           && modo != MODO_PLAY && !menuAperto;
    if (tuttiEDue) {
      if (insiemeDa == 0) insiemeDa = millis() | 1;
      else if (millis() - insiemeDa > 1500 && !ponteAperto()) { insiemeDa = 0; apriPonte(); }
    } else {
      insiemeDa = 0;
    }
  }
  /* Un tasto banco tenuto da solo per due secondi apre il tuner: al rilascio
   * non cambiera' banco (bancoAnnullato). */
  if (bancoInAttesa >= 0 && !bancoAnnullato && millis() - bancoPremutoDa > TUNER_TENUTO_MS) {
    bancoAnnullato = true;
    entraTuner();
  }
  /* FS4 tenuto due secondi apre il menu delle modalita' (23 ottobre 2026; prima
   * era FS1+FS4). Nel looper dello Spark FS4 tenuto cancella il loop (qui
   * sotto), e il menu non si apre. Tenendolo ancora non si riapre: va lasciato. */
  {
    static uint32_t tenutoDa = 0;
    static bool     fatto    = false;
    const uint8_t quattro = (uint8_t)(1 << LINEA_PULSANTE[3]);
    if (ingressiFermi & quattro) {
      tenutoDa = 0;
      fatto = false;
    } else if (!looper && !menuAperto) {
      if (tenutoDa == 0) tenutoDa = millis() | 1;
      else if (!fatto && millis() - tenutoDa > MENU_TENUTO_MS) { fatto = true; apriMenu(); }
    }
  }
  // Il menu senza tocchi si chiude da solo, e non cambia niente.
  if (menuAperto && (int32_t)(millis() - menuFino) >= 0) {
    Serial.println(F("menu chiuso senza cambiare"));
    chiudiMenu();
  }
  /* FS5 tenuto da solo per tre secondi: dentro o fuori dal looper. */
  {
    static uint32_t tenutoDa = 0;
    static bool     fatto    = false;
    const uint8_t cinque = (uint8_t)(1 << LINEA_PULSANTE[FS5]);
    if (modo == MODO_SPARK && !(ingressiFermi & cinque)) {
      if (tenutoDa == 0) tenutoDa = millis() | 1;
      else if (!fatto && millis() - tenutoDa > 3000) {
        fatto = true;
        if (!looper) metaMostrata = metaPrimaDiFS5;
        cambiaLooper();
      }
    } else {
      tenutoDa = 0;
      fatto = false;
    }
  }
  /* Nel looper, FS4 tenuto da solo per due secondi cancella il loop (alla
   * pressione ha gia' fermato). L'avviso lo da' la risposta dell'ampli. */
  {
    static uint32_t tenutoDa = 0;
    static bool     fatto    = false;
    const uint8_t uno     = (uint8_t)(1 << LINEA_PULSANTE[0]);
    const uint8_t quattro = (uint8_t)(1 << LINEA_PULSANTE[3]);
    if (looper && !(ingressiFermi & quattro) && (ingressiFermi & uno)) {
      if (tenutoDa == 0) tenutoDa = millis() | 1;
      else if (!fatto && millis() - tenutoDa > 2000) {
        fatto = true;
        if (chScrittura) looperAccoda(LOOP_CANCELLA);
      }
    } else {
      tenutoDa = 0;
      fatto = false;
    }
  }
  while (eventiLetti != eventiScritti) {
    looperEvento(eventiLooper[eventiLetti & 7]);
    eventiLetti++;
  }
  if (impostazioniNuove) {
    impostazioniNuove = false;
    tempoDa = millis();                    // il LED del tempo riparte dall'«uno»
    Serial.printf("looper: %u bpm, click %s\n", loopBpm, loopClick ? "acceso" : "spento");
    if (looper) schermoSporco = true;
  }
  /* Il conteggio: quattro tempi da 60000/bpm ms dalla pressione, poi 0x04 con
   * LOOP_ANTICIPO_MS di anticipo. Il display si ridisegna solo al cambio di
   * tempo, lontano dall'invio. */
  if (giroFinito) {
    giroFinito = false;
    Serial.printf("looper: giro finito, posizione massima %.3f, giro misurato %lu ms\n",
                  massimoGiro, (unsigned long)durataLoop);
  }
  /* L'anello avanza a blocchi, un tempo alla volta: lo schermo intero si
   * ridisegna quando cambia il blocco (all'inizio di ogni tempo, lontano dal
   * 0x04 del conteggio, che parte alla fine del quarto). L'aggiornamento del
   * solo riquadro (updateDisplayArea, 2.2-2.7) ogni tanto scriveva nel punto
   * sbagliato del display: video dell'utente, 7 ottobre. */
  if (looper && chScrittura) {
    static int32_t chiavePrima = -1;
    uint8_t fette, numero;
    bool puntini;
    const float riempi = riempimentoCerchio(fette, puntini, numero);
    const int32_t chiave = (int32_t)lroundf(riempi * 4096) + numero * 8192 + (puntini ? 65536 : 0);
    if (chiave != chiavePrima) { chiavePrima = chiave; schermoSporco = true; }
  }
  if (contaTempo) {
    const uint32_t tempo = 60000UL / loopBpm;
    const uint32_t passato = millis() - contaDa;
    if (!looper || !chScrittura) {
      contaTempo = 0;
    } else if (passato + LOOP_ANTICIPO_MS >= 4 * tempo) {
      contaTempo = 0;
      looperAccoda(LOOP_REC);
      looperProssimo = millis();           // parte in questo giro, senza pausa
    } else {
      const uint8_t t = (uint8_t)(passato / tempo + 1);
      if (t != contaTempo && t <= 4) { contaTempo = t; aggiornaLed(); schermoSporco = true; }
    }
  }
  if ((bool)USB != usbMontato) { usbMontato = (bool)USB; if (modo != MODO_SPARK) schermoSporco = true; }

  // La richiesta resta in coda **finche' non c'e' l'ampli**, invece di essere
  // buttata via. Mentre il pedale si sta riagganciando una pressione andava
  // persa e da fuori sembrava che il pedale ignorasse il piede: cosi' invece
  // il suono arriva appena si puo', ed e' il comportamento che serve sul palco.
  // Appena agganciato: e' quello giusto, e come si chiamano i suoi preset.
  if (daLeggere && chScrittura && !inTrasferimento) {
    daLeggere = false;
    leggiAmpli();
  }

  sbrigaTuner();
  /* Il segno che l'ampli si sta inceppando (20 ottobre 2026): un cambio di
   * preset che in un secondo non riceve il suo 04 38. Prima di piantarsi del
   * tutto l'ampli conferma ancora i pezzi del preset ma non il cambio. */
  if (atteso0138Da) {
    if (ack0138 >= atteso0138) { atteso0138Da = 0; scatolaSalvata = false; }   // sano: si riarma
    else if (millis() - atteso0138Da > 1000) {
      atteso0138Da = 0;
      annota("!! cambio preset senza conferma (rx totali %lu)", (unsigned long)rxTotali);
      Serial.println(F("!! cambio preset senza conferma dall'ampli"));
      salvaScatola("cambio preset senza conferma");
    }
  }

  // Il looper: prima com'e' messo (0x0275, la risposta e' un 0x0375), poi il
  // comando del footswitch. Un frame da nove byte, 0x0175 senza 0x00 in coda.
  if (looper && chScrittura && !inTrasferimento && !daLeggere) {
    uint8_t frame[16];
    if (looperChiedi) {
      looperChiedi = false;
      manda(frame, costruisci(0x02, 0x75, nullptr, 0, frame));   // lo stato
      manda(frame, costruisci(0x02, 0x76, nullptr, 0, frame));   // bpm e click
    }
    /* Tap e battute: l'ultimo 0x0376 con bpm, battute e «libero» rimessi,
     * il resto tale e quale; **senza** 0x00 in coda (col byte in piu' il delay
     * parte all'infinito, 28 agosto). Se la forma non e' quella attesa non si
     * manda niente: un payload storto muove cose che non c'entrano. */
    if (impostazioniDaMandare && lungImpostazioni) {
      impostazioniDaMandare = false;
      const uint8_t i = impostazioni[0] == 0xcc ? 2 : 1;          // dopo il bpm
      if (i + 3 <= lungImpostazioni && impostazioni[i] < 0x80 && impostazioni[i + 1] < 0x80
          && (impostazioni[i + 2] & 0xfe) == 0xc2) {
        uint8_t p[26];
        size_t np = 0;
        if (loopBpm > 127) p[np++] = 0xcc;
        p[np++] = (uint8_t)loopBpm;
        p[np++] = impostazioni[i];                                   // count, com'era
        /* In «libero» le battute non restano quelle di prima: come l'app ufficiale
         * se ne mandano tante quante stanno in 60 s, bpm / 4 per difetto (letto dal
         * 0x0376 lasciato dall'app, 14 ottobre 2026: 20 a 80 bpm, 35 a 141). Con 16
         * l'ampli chiudeva la registrazione libera a 16 battute: 48 s a 80 bpm. */
        const uint8_t battute = loopLibero ? (uint8_t)max(1, loopBpm / 4) : loopBattute;
        p[np++] = battute;
        p[np++] = loopLibero ? 0xc3 : 0xc2;
        for (uint8_t k = i + 3; k < lungImpostazioni && np < sizeof(p); k++) p[np++] = impostazioni[k];
        Serial.printf("impostazioni: %u bpm, %u battute%s\n", loopBpm, battute,
                      loopLibero ? ", libero" : "");
        memcpy(impostazioni, p, np);       // l'ampli non le rimanda: le teniamo noi
        lungImpostazioni = (uint8_t)np;
        uint8_t lungo[40];
        manda(lungo, costruisci(0x01, 0x76, p, np, lungo));
      } else {
        Serial.println(F("impostazioni del looper in una forma che non conosco: non mando"));
      }
    }
    if (looperFatti < looperQuanti && (int32_t)(millis() - looperProssimo) >= 0) {
      const uint8_t c = looperSequenza[looperFatti++];
      looperProssimo = millis() + LOOP_PAUSA_MS;
      manda(frame, costruisci(0x01, 0x75, &c, 1, frame));
      looperEvento(c, true);               // l'ampli non sempre lo racconta
    }
  }

  if (inCoda >= 0 && !inTrasferimento && chScrittura) {
    const uint8_t n = (uint8_t)inCoda;
    inCoda = -1;
    mandaPreset(n);
  }

  while (Serial.available()) {
    char c = Serial.read();
    if (rigaSeriale(c)) continue;                    // «#indice valore»: il wah dal PC (2.30)
    if (c >= '0' && c <= '7') cambiaPreset(c - '0');
    else if (c == 'p') { if (bancoHaQualcosa()) richiedi(prossimoPieno(bersaglio));
                         else Serial.println(F("banco vuoto")); }
    // Maiuscole, non minuscole: 'a'..'h' si sovrapponeva a 'c', 'd' ed 'e',
    // che sono comandi, e «elenca il banco» finiva per caricare un preset.
    else if (c >= 'A' && c <= 'H') richiedi(c - 'A');       // preset 1..8 diretto
    else if (c == 'd') { diagnostica = !diagnostica;
                         Serial.printf("diagnostica del tasto: %s\n", diagnostica ? "accesa" : "spenta"); }
    else if (c == 'c') Serial.printf("tasto: %lu fronti grezzi, %lu pressioni accettate, "
                                     "%lu richieste sovrascritte in coda\n",
                                     frontiVisti, pressioniViste, pressioniPerse);
    else if (c == 'e') {
      Serial.printf("banco: %s\n", bancoAttivo.valido ? bancoAttivo.nome : "(quello del firmware)");
      for (uint8_t i = 0; i < quantiPosti(); i++)
        Serial.printf("  %u  %s%s\n", i + 1,
                      postoPieno(i) ? nomePosto(i) : "-",
                      i == corrente ? "   <- adesso" : "");
    }
    else if (c == 'b') { char el[180]; const uint8_t q = banchiElenca(el, sizeof(el));
                         Serial.printf("banchi in memoria: %u\n%s", q, el); }
    // Scambia gli slot 1 e 2: serve a provare bancoScambia senza passare
    // dall'app, cioe' a separare un difetto del firmware da uno dell'app.
    else if (c == 'w') Serial.printf("scambio slot 1<->2: %s\n",
                                     bancoScambia(0, 1) ? "fatto" : "fallito");
    else if (c == 'm') misura();
    // L'ampli sceglie DENTRO l'intervallo chiesto, e prende il massimo:
    // misurato il 14 agosto 2026, chiedendo 6-12 ha dato ~15 ms. Quindi si
    // chiede secco, min uguale a max.
    else if (c == 'v') chiediIntervallo(6, 6);       // 7,5 ms
    else if (c == 'w') chiediIntervallo(12, 12);     // 15 ms
    else if (c == 's') chiediIntervallo(24, 40);     // 30 - 50 ms
    else if (c == 'r') {
      sganciato = false;
      // Se e' gia' collegato, scansionare non serve e anzi confonde: l'ampli
      // connesso non si annuncia, quindi si leggerebbe «nessuno Spark».
      if (chScrittura) Serial.println(F("gia' collegato all'ampli"));
      else { momentoSgancio = millis(); ultimoTentativo = 0; avviaScansione(); }
    }
    else if (c == 'x') {
      sganciato = true;
      if (client && client->isConnected()) client->disconnect();
      chScrittura = chNotifiche = nullptr;
      Serial.println(F("sganciato: l'ampli e' libero, l'app puo' trovarlo. 'r' per riprenderlo."));
    }
    else if (c == 'u') Serial.printf("batteria: %u mV letti, %u mV mediati, %u tacche%s\n",
                                     mvGrezzo, mvBatteria, tacche(mvBatteria),
                                     mvBatteria ? "" : "  (partitore assente?)");
    else if (c == 'U') stampaRegistroBatteria();     // una riga al minuto (2.32)
    else if (c == 'K') { luce = (uint8_t)((luce + 1) % sizeof(LUCI)); schermo.setContrast(LUCI[luce]);
                         Serial.printf("display: luminosita' %u\n", LUCI[luce]); }
    else if (c == 'P') { precarica = (uint8_t)((precarica + 1) % sizeof(PRECARICHE));
                         schermo.sendF("ca", 0xd9, PRECARICHE[precarica]);
                         Serial.printf("display: precarica 0x%02x\n", PRECARICHE[precarica]); }
    else if (c == 'V') { vcomh = (uint8_t)((vcomh + 1) % sizeof(VCOMH));
                         schermo.sendF("ca", 0xdb, VCOMH[vcomh]);
                         Serial.printf("display: VCOMH 0x%02x\n", VCOMH[vcomh]); }
    else if (c == 'W') { provaSchermo = (uint8_t)((provaSchermo + 1) % N_PROVE); schermoSporco = true;
                         Serial.printf("prova del display: %u\n", provaSchermo); }
    // La scatola nera, e il tuner aperto e chiuso dal PC per le prove (2.26).
    else if (c == 'N') stampaScatola();
    else if (c == 'M') stampaScatoleSalvate();      // quelle salvate quando l'ampli s'inceppa
    else if (c == 'S') { scatolaSalvata = false; salvaScatola("prova dal seriale"); }
    else if (c == 'T') { if (tuner) esciTuner(); else entraTuner(); }
    else if (c == 'L') cambiaLooper();               // il looper dal PC, per le prove
    else if (c == 'Y') { if (looper) looperTap(); }  // un colpo di tap tempo
    else if (c == 'J' || c == 'X' || c == 'Z') avviaSpazzata(c); // il pedale d'espressione finto (2.30)
    else if (c == 'I') avviaEspressione();                  // quello vero, la prova dei fili (2.31)
    else if (c == 'j') { indiceWah = (uint8_t)((indiceWah + 1) % 6);
                         Serial.printf("wah: la prossima spazzata va sull'indice %u\n", indiceWah); }
    // Lo stato che suona, coi pezzi grezzi sul seriale: per vedere dal PC cosa
    // c'e' davvero nella catena (2.30, la prova del wah).
    else if (c == 'Q') { const uint8_t dati[2] = { 0x01, 0x00 };
                         Serial.printf("stato che suona: %s\n",
                                       chiediEAspetta(0x02, 0x01, dati, 2, 0x01, 1500) ? "letto" : "incompleto"); }
    else if (c == '?') elenco();
  }
  passoSpazzata();
  passoEspressione();
  // 2 ms, non 10: una battuta secca su un tattile puo' durare pochi
  // millisecondi, e con un polling lento la si perde e basta.
  delay(2);
}
