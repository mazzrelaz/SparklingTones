// prova-ble, 13-pulze.ino — La modalita' Pulze: il Pulze Mini agganciato via BLE MIDI, Songlist, tone, stomp, schermo.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.
//
// La quarta modalita' (2.37, 5 novembre 2026): il pedale comanda un Hotone Pulze
// Mini. Tutto il sapere sul Mini, con le prove fatte, sta in
// `..\Pulze Control\ricerca-pulze-mini.md`; qui le cose che servono al firmware.
//
//  - **Il pedale fa da centrale BLE MIDI**, come col Spark fa da client: il Mini
//    («Pulze Mini BLE») e' una periferica col servizio MIDI standard, senza
//    bonding. Un collegamento alla volta: telefono e Pulze Editor staccati.
//  - Si parla col **SysEx della Pulze Editor** dentro il BLE MIDI:
//    `f0 21 25 41 50 <num> 00 <gruppo> <comando> <lung lo> <lung hi> <dati a nibble> f7`.
//    I dati veri (D qui sotto) cominciano con 00, tipo e gruppo a 16 bit, la
//    lunghezza del corpo, 00 00, poi il corpo. Sopra gli 81 byte un messaggio si
//    spezza in piu' SysEx con lo scostamento davanti. Rifatto qui uguale byte per
//    byte ai messaggi dell'app (controllato con la cattura del 4 novembre).
//  - **Songlist e tone**: un solo messaggio, il 06/02 (byte 9 = la Songlist,
//    posizione nell'ordine dell'app, ff = lista intera; byte 10 = il posto nella
//    Songlist, o il numero del tone con ff). Il Mini risponde col tone intero, che
//    ha il nome, i blocchi accesi e la catena. Verificato dal PC il 5 novembre.
//  - All'aggancio si chiedono le Songlist (00/03) e i nomi dei tone (03/00), poi
//    si torna alla Songlist e al tone di prima (in /pulze.txt).
//  - Blocchi accesi e spenti col CC 45+blocco (127/0), l'accordatore del Mini col
//    CC 55, Inst Volume col CC 8 (0-100): tutti verificati il 4 novembre.
//
// I tasti (decisi dall'utente il 5 novembre): tasti banco = Songlist precedente
// e successiva, in tondo, alla fine della pressione; FS1-FS4 = quattro tone della
// Songlist; FS5 = il gruppo da quattro dopo, senza toccare il suono; FS5 tenuto un
// secondo = la pagina stomp (FS1-FS4 = PRE, EQ, Fx1, Fx2; FS5 torna ai tone);
// tasto banco tenuto due secondi = l'accordatore del Mini, un tasto qualunque lo
// chiude. Il pedale d'espressione muove Inst Volume, e solo quando lo si muove.

static const uint8_t  PZ_CC_INST_VOLUME = 8;
static const uint8_t  PZ_CC_BLOCCO      = 45;     // 45 + blocco (0 NR, 1 PRE, 2 AMP, 3 CAB, 4 EQ, 5 Fx1, 6 Fx2)
static const uint8_t  PZ_CC_TUNER       = 55;
static const uint8_t  PZ_LISTA_INTERA   = 0xff;
/* Una scrittura ogni 70 ms, come l'app quando si gira una manopola (e cosi' sono
 * passati i 39 blocchi del pedale simulato, il 4 novembre). Fra i due pezzi del
 * 06/02 l'app lascia 105 ms e il PC ne lasciava 300: se un cambio di tone non va,
 * si guarda prima qui. */
static const uint32_t PZ_PAUSA_MS       = 70;
static const uint32_t PZ_FS5_TENUTO_MS  = 1000;
static const uint32_t PZ_ATTESA_MS      = 4000;   // per la risposta a una richiesta: poi si richiede
static const uint8_t  PZ_STOMP[4]       = { 1, 4, 5, 6 };   // PRE, EQ, Fx1, Fx2
static const char* const PZ_NOMI_STOMP[4] = { "PRE", "EQ", "Fx1", "Fx2" };

/* Il 06/02 della Pulze Editor, i dati veri come li ha mandati l'app nella cattura
 * del 4 novembre (94,2 s): il pedale cambia solo i byte 9 e 10, come si e' fatto
 * dal PC (`tools/manda-songlist.js`). Il resto e' il tone di prima dell'app, e il
 * Mini non lo usa: risponde col tone scelto, intero. */
static const uint8_t PZ_MODELLO_0602[133] = {
  0x00, 0x06, 0x00, 0x02, 0x00, 0x7c, 0x00, 0x00, 0x00, 0xff, 0x20, 0x02, 0x00, 0x00, 0x00, 0xf0,
  0x41, 0x00, 0x00, 0x48, 0x42, 0x00, 0x00, 0x48, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x32, 0x61, 0x00, 0x4d, 0x63, 0x7a,
  0x20, 0x42, 0x6c, 0x75, 0x65, 0x73, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x6f, 0x02, 0x00, 0x01, 0x03, 0x04, 0x05, 0x06, 0x00, 0x00, 0x00, 0x03, 0x04, 0x00, 0x00,
  0x07, 0x1b, 0x00, 0x00, 0x00, 0x47, 0x00, 0x00, 0x0a, 0x35, 0x00, 0x00, 0x01, 0x21, 0x00, 0x00,
  0x0b, 0x12, 0x00, 0x00, 0x0c,
};

/* --- Il collegamento ---------------------------------------------------------- */
static BLERemoteCharacteristic* chPulze = nullptr;   // la caratteristica MIDI del Mini
static uint16_t pzMtu = 23;
/* 0 = scollegato, 1 = Songlist chieste, 2 = nomi dei tone chiesti, 3 = pronto. */
static uint8_t  pzFase = 0;
static uint32_t pzFaseDa = 0;
static uint8_t  pzTentativi = 0;
static uint32_t pzCercaDa = 0;
static uint8_t  pzNum = 0;                           // il contatore dei messaggi, come l'app

/* --- Quello che il Mini racconta ----------------------------------------------
 * Le Songlist: 40 byte d'ordine (gli id nell'ordine dell'app, ff = vuoto), poi 40
 * Songlist da 70 byte, nome (20) e numeri dei tone (50, ff = vuoto). I nomi: 200
 * byte d'ordine della lista intera, 200 byte ignoti, 200 nomi da 20 byte (il posto
 * N e' il tone N). Tenuti come arrivano, i dati veri con la testa di 9 byte. */
static uint8_t pzSl[2860];
static uint8_t pzNomi[4420];
static uint8_t pzMsg[200];                           // un tone intero, un blocco
static bool    pzSlValide = false, pzNomiValidi = false;
static uint8_t* pzDest = nullptr;                    // il messaggio che si sta ricomponendo
static size_t   pzDestMax = 0, pzAttesi = 0, pzAvuti = 0;
static uint8_t  pzBustaGruppo = 0, pzBustaLo = 0, pzBustaHi = 0;

/* --- Cosa si mostra e cosa suona ---------------------------------------------- */
static uint8_t pzLista = PZ_LISTA_INTERA;            // la Songlist mostrata
static uint8_t pzGruppo = 0, pzGruppoPrima = 0;      // il gruppo da quattro mostrato
static int16_t pzSuonaLista = -1, pzSuonaPos = -1;   // dal tone intero (posto nella lista)
static char    pzNomeSuona[17] = "";
static uint8_t pzAccesi = 0;                         // un bit per blocco, dal byte 97 del tone
static bool    pzStomp = false;
static bool    pzTuner = false, pzTunerAlRitorno = false;
static bool    pzFs5Tenibile = false;                // FS5 premuto ai tone: tenuto apre lo stomp
static uint32_t pzFs5Da = 0;
/* FS4 tenuto apre il menu, ma premendo ha gia' cambiato tone (o Fx2 nello stomp):
 * aprendo il menu si rimette com'era (deciso dall'utente il 5 novembre, come FS5
 * col gruppo). Qui cosa c'era prima della pressione; 0 = niente da disfare. */
static uint8_t pzFs4Disfa = 0;                       // 1 = il tone, 2 = Fx2
static int16_t pzFs4Lista = -1, pzFs4Pos = -1;
static uint8_t pzFs4Gruppo = 0;
static uint8_t pzVolutaLista = 0, pzVolutaPos = 0;   // quella ricordata in /pulze.txt
static bool    pzDaSalvare = false;
static const char* VIA_PULZE = "/pulze.txt";

/* --- Il pedale d'espressione ---------------------------------------------------- */
static int16_t pzEsprRif = -1;                       // millesimi al riarmo; -1 = da riarmare
static bool    pzEsprMosso = false;
static int16_t pzVolMandato = -1;                    // l'ultimo Inst Volume mandato

/* --- Le code ---------------------------------------------------------------------
 * In arrivo: il callback delle notifiche ricompone i SysEx dal BLE MIDI e li mette
 * qui interi, senza f0 e f7; il resto lo fa il loop (mai lavoro BLE nei callback).
 * Un SysEx del Mini e' al massimo 382 byte (un pezzo delle Songlist). */
static const uint8_t  PZ_CODA = 8;
static const uint16_t PZ_GREZZO = 420;
static uint8_t  pzRx[PZ_CODA][PZ_GREZZO];
static uint16_t pzRxLung[PZ_CODA];
static volatile uint8_t  pzRxScritti = 0, pzRxLetti = 0;
static volatile uint32_t pzRxPersi = 0;
static uint8_t  pzIn[PZ_GREZZO];                     // solo il callback
static uint16_t pzInLung = 0;
static bool     pzInDentro = false;
/* In uscita: pacchetti BLE MIDI pronti, uno ogni PZ_PAUSA_MS. */
static const uint8_t PZ_TX = 24;
static uint8_t  pzTx[PZ_TX][200];
static uint8_t  pzTxLung[PZ_TX];
static uint8_t  pzTxTesta = 0, pzTxFondo = 0;
static uint32_t pzTxDa = 0;

/* ======================================================================
   In arrivo
   ====================================================================== */

/** Il callback delle notifiche: il primo byte e' l'intestazione BLE MIDI, i byte
 *  col bit alto sono i timestamp (e f0 / f7). Un SysEx lungo arriva in piu'
 *  notifiche, quelle dopo la prima con la sola intestazione davanti. */
static void alArrivoPulze(BLERemoteCharacteristic*, uint8_t* d, size_t n, bool) {
  for (size_t i = 1; i < n; i++) {
    const uint8_t b = d[i];
    if (b == 0xf0) { pzInDentro = true; pzInLung = 0; continue; }
    if (b == 0xf7) {
      if (pzInDentro) {
        const uint8_t s = pzRxScritti;
        if ((uint8_t)(s - pzRxLetti) < PZ_CODA) {
          memcpy(pzRx[s % PZ_CODA], pzIn, pzInLung);
          pzRxLung[s % PZ_CODA] = pzInLung;
          pzRxScritti = (uint8_t)(s + 1);
        } else {
          pzRxPersi++;
        }
      }
      pzInDentro = false;
      continue;
    }
    if (b & 0x80) continue;
    if (pzInDentro && pzInLung < PZ_GREZZO) pzIn[pzInLung++] = b;
  }
}

/* ======================================================================
   In uscita
   ====================================================================== */

static void pzAccoda(const uint8_t* p, size_t n) {
  if (n > sizeof(pzTx[0])) return;
  const uint8_t prossimo = (uint8_t)((pzTxFondo + 1) % PZ_TX);
  if (prossimo == pzTxTesta) { Serial.println(F("Pulze: coda d'invio piena, butto")); return; }
  memcpy(pzTx[pzTxFondo], p, n);
  pzTxLung[pzTxFondo] = (uint8_t)n;
  pzTxFondo = prossimo;
}

static bool pzCodaVuota() { return pzTxTesta == pzTxFondo; }

/** Un SysEx (senza f0 e f7) nei pacchetti BLE MIDI: uno solo se sta nell'MTU (il
 *  06/02 da 179 byte e' passato cosi' dal PC), altrimenti in pacchetti di
 *  continuazione, che hanno davanti la sola intestazione. */
static void pzMandaSysex(const uint8_t* sx, size_t n) {
  size_t max = pzMtu > 3 ? pzMtu - 3 : 20;
  if (max > sizeof(pzTx[0])) max = sizeof(pzTx[0]);
  uint8_t p[sizeof(pzTx[0])];
  size_t k = 0;
  p[k++] = 0x80; p[k++] = 0x80; p[k++] = 0xf0;
  for (size_t i = 0; i < n; i++) {
    if (k >= max) { pzAccoda(p, k); k = 0; p[k++] = 0x80; }
    p[k++] = sx[i];
  }
  if (k + 2 > max) { pzAccoda(p, k); k = 0; p[k++] = 0x80; }
  p[k++] = 0x80; p[k++] = 0xf7;
  pzAccoda(p, k);
}

static void pzMandaCC(uint8_t cc, uint8_t v) {
  const uint8_t p[5] = { 0x80, 0x80, 0xb0, cc, v };   // canale 1, timestamp 0 come dal PC
  pzAccoda(p, sizeof(p));
}

/** Un messaggio della Pulze Editor: D sono i dati veri, lo 00 di testa compreso,
 *  ogni byte in due nibble. Sopra gli 81 byte piu' SysEx, quelli dopo il primo
 *  con lo scostamento (7 + 7 bit) al posto dello 00. */
static void pzMandaDati(uint8_t gruppo, uint8_t comando, const uint8_t* D, size_t nD) {
  const size_t lung = nD - 1;
  pzNum = (uint8_t)((pzNum + 1) & 0x7f);
  for (size_t da = 0; da < lung; da += 81) {
    uint8_t sx[12 + 2 * 81];
    size_t k = 0;
    sx[k++] = 0x21; sx[k++] = 0x25; sx[k++] = 0x41; sx[k++] = 0x50;
    sx[k++] = pzNum; sx[k++] = 0x00; sx[k++] = gruppo; sx[k++] = comando;
    sx[k++] = (uint8_t)(lung & 0x7f); sx[k++] = (uint8_t)(lung >> 7);
    if (da == 0) { sx[k++] = D[0] >> 4; sx[k++] = D[0] & 0x0f; }
    else         { sx[k++] = (uint8_t)(da & 0x7f); sx[k++] = (uint8_t)(da >> 7); }
    const size_t fine = (da + 81 < lung) ? da + 81 : lung;
    for (size_t i = da + 1; i <= fine; i++) { sx[k++] = D[i] >> 4; sx[k++] = D[i] & 0x0f; }
    pzMandaSysex(sx, k);
  }
}

/** I dati veri: la testa di nove byte e il corpo. Torna la lunghezza. */
static size_t pzTesta(uint8_t* D, uint16_t tipo, uint16_t gruppo, const uint8_t* corpo, uint16_t n) {
  D[0] = 0x00;
  D[1] = (uint8_t)tipo;   D[2] = (uint8_t)(tipo >> 8);
  D[3] = (uint8_t)gruppo; D[4] = (uint8_t)(gruppo >> 8);
  D[5] = (uint8_t)n;      D[6] = (uint8_t)(n >> 8);
  D[7] = 0x00;            D[8] = 0x00;
  if (n) memcpy(D + 9, corpo, n);
  return 9 + (size_t)n;
}

/** Una richiesta (comando 11): il Mini conferma col 14 e poi manda i dati. */
static void pzChiedi(uint16_t tipo, uint16_t gruppo, const uint8_t* corpo, uint16_t n) {
  uint8_t D[16];
  pzMandaDati((uint8_t)gruppo, 0x11, D, pzTesta(D, tipo, gruppo, corpo, n));
}

/** La conferma dei dati del Mini, come la manda l'app: la lunghezza due volte. */
static void pzConferma(uint8_t gruppo, uint8_t lo, uint8_t hi) {
  const uint8_t sx[12] = { 0x21, 0x25, 0x41, 0x50, 0x00, 0x00, gruppo, 0x14, lo, hi, lo, hi };
  pzMandaSysex(sx, sizeof(sx));
}

/* ======================================================================
   Le Songlist e i tone
   ====================================================================== */

static uint8_t pzQuanteListe() {
  if (!pzSlValide) return 0;
  uint8_t q = 0;
  for (uint8_t i = 0; i < 40; i++) if (pzSl[9 + i] < 40) q++;
  return q;
}

/** Il record di una Songlist (posizione nell'ordine dell'app), o nullptr. */
static const uint8_t* pzRecordLista(uint8_t lista) {
  if (!pzSlValide || lista == PZ_LISTA_INTERA) return nullptr;
  uint8_t q = 0;
  for (uint8_t i = 0; i < 40; i++) {
    const uint8_t id = pzSl[9 + i];
    if (id >= 40) continue;
    if (q++ == lista) return pzSl + 9 + 40 + 70 * id;
  }
  return nullptr;
}

/** I tone di una lista: i numeri dei tone, in ordine, ff saltati. */
static const uint8_t* pzToneDella(uint8_t lista, uint8_t& quanti) {
  quanti = 0;
  if (lista == PZ_LISTA_INTERA) {
    if (!pzNomiValidi) return nullptr;
    quanti = 200;
    return pzNomi + 9;
  }
  const uint8_t* r = pzRecordLista(lista);
  if (!r) return nullptr;
  quanti = 50;
  return r + 20;
}

static uint8_t pzQuantiTone(uint8_t lista) {
  uint8_t quanti;
  const uint8_t* t = pzToneDella(lista, quanti);
  uint8_t q = 0;
  for (uint8_t i = 0; t && i < quanti; i++) if (t[i] < 200) q++;
  return q;
}

/** Il numero del tone al posto `pos` della lista, -1 se non c'e'. */
static int16_t pzToneDi(uint8_t lista, uint16_t pos) {
  uint8_t quanti;
  const uint8_t* t = pzToneDella(lista, quanti);
  uint16_t q = 0;
  for (uint8_t i = 0; t && i < quanti; i++) {
    if (t[i] >= 200) continue;
    if (q++ == pos) return t[i];
  }
  return -1;
}

/** Il posto di un tone nella lista intera, -1 se non c'e'. */
static int16_t pzPostoInListaIntera(uint8_t tone) {
  uint8_t quanti;
  const uint8_t* t = pzToneDella(PZ_LISTA_INTERA, quanti);
  uint16_t q = 0;
  for (uint8_t i = 0; t && i < quanti; i++) {
    if (t[i] >= 200) continue;
    if (t[i] == tone) return q;
    q++;
  }
  return -1;
}

/** Un nome da un campo fisso: si ferma allo 0, toglie gli spazi in fondo. */
static void pzCopiaNome(char* fuori, size_t max, const uint8_t* da, size_t lung) {
  size_t k = 0;
  for (; k < lung && k + 1 < max && da[k]; k++) fuori[k] = (da[k] >= 32 && da[k] < 127) ? (char)da[k] : '?';
  while (k > 0 && fuori[k - 1] == ' ') k--;
  fuori[k] = 0;
}

static void pzNomeLista(uint8_t lista, char* fuori, size_t max) {
  if (lista == PZ_LISTA_INTERA) { snprintf(fuori, max, "All Tones"); return; }
  const uint8_t* r = pzRecordLista(lista);
  if (r) pzCopiaNome(fuori, max, r, 20);
  else   snprintf(fuori, max, "Songlist %u", lista + 1);
}

static void pzNomeTone(int16_t tone, char* fuori, size_t max) {
  if (tone < 0) { snprintf(fuori, max, "-"); return; }
  if (pzNomiValidi) pzCopiaNome(fuori, max, pzNomi + 9 + 400 + 20 * tone, 20);
  else              fuori[0] = 0;
  if (!fuori[0]) snprintf(fuori, max, "tone %d", tone);
}

/** Il 06/02: la lista e il posto. Con la lista intera il byte 10 e' il numero del tone. */
static void pzSalta(uint8_t lista, uint8_t pos) {
  int16_t b10 = pos;
  if (lista == PZ_LISTA_INTERA) b10 = pzToneDi(lista, pos);
  if (b10 < 0) return;
  uint8_t D[sizeof(PZ_MODELLO_0602)];
  memcpy(D, PZ_MODELLO_0602, sizeof(D));
  D[9] = lista;
  D[10] = (uint8_t)b10;
  pzMandaDati(2, 0x12, D, sizeof(D));
  pzLista = lista;
  pzSuonaLista = lista;                    // si mostra subito: il tone del Mini conferma
  pzSuonaPos = pos;
  pulzeRiarma();
  Serial.printf("Pulze: chiedo la lista %u, posto %u\n", lista, pos);
}

/* ======================================================================
   I messaggi del Mini
   ====================================================================== */

static void pzPronto();

static void pzChiediFase() {
  pzFaseDa = millis();
  if (pzFase == 1) pzChiedi(0, 3, nullptr, 0);         // le Songlist (00/03)
  if (pzFase == 2) pzChiedi(3, 0, nullptr, 0);         // i nomi dei tone (03/00)
}

static void pzAvanza() {
  pzFase++;
  pzTentativi = 0;
  if (pzFase < 3) pzChiediFase(); else pzPronto();
  schermoSporco = true;
}

/** Il tone intero (06/02): lista e posto, nome, blocchi accesi, catena. */
static void pzTone(const uint8_t* D) {
  const uint8_t lista = D[9];
  const int16_t pos = lista == PZ_LISTA_INTERA ? pzPostoInListaIntera(D[10]) : D[10];
  const bool nuovo = lista != pzSuonaLista || pos != pzSuonaPos;
  pzSuonaLista = lista;
  pzSuonaPos = pos;
  pzCopiaNome(pzNomeSuona, sizeof(pzNomeSuona), D + 77, 16);
  pzAccesi = D[97];
  pulzeRiarma();
  if (pzFase >= 3) {
    // Il ricordo, se e' cambiato (lo guarda sbrigaPulze). Un salto chiesto da noi
    // e' gia' mostrato (pzSalta), quindi «nuovo» vuol dire cambiato dal Mini, o
    // dall'app: lo si segue.
    pzDaSalvare = true;
    if (nuovo) {
      pzLista = lista;
      if (pos >= 0) pzGruppo = (uint8_t)(pos / 4);
    }
  }
  Serial.printf("Pulze: suona \"%s\" (lista %u, posto %d), blocchi %02x\n",
                pzNomeSuona, lista, pos, pzAccesi);
  aggiornaLed();
  schermoSporco = true;
}

/** Un blocco intero (02/00): arriva dopo un CC di on/off e quando lo si chiede. */
static void pzBlocco(const uint8_t* D) {
  const uint8_t b = D[9];
  if (b >= 7) return;
  if (D[10]) pzAccesi |= (uint8_t)(1 << b); else pzAccesi &= (uint8_t)~(1 << b);
  // La conferma del Mini: dopo un CC di on/off (o una lettura) dice com'e' il blocco.
  static const char* const NOMI[7] = { "NR", "PRE", "AMP", "CAB", "EQ", "Fx1", "Fx2" };
  Serial.printf("Pulze: il Mini dice %s %s (modello %u)\n", NOMI[b], D[10] ? "acceso" : "spento", D[17]);
  aggiornaLed();
  schermoSporco = true;
}

static void pzMessaggio(const uint8_t* D, size_t nD) {
  const uint16_t tipo = D[1] | D[2] << 8, gruppo = D[3] | D[4] << 8;
  if (tipo == 0 && gruppo == 3) {
    pzSlValide = nD >= 9 + 40 + 40 * 70;
    Serial.printf("Pulze: Songlist lette (%u)\n", pzQuanteListe());
    if (pzFase == 1) pzAvanza();
  } else if (tipo == 3 && gruppo == 0) {
    pzNomiValidi = nD >= 9 + 400 + 200 * 20;
    Serial.printf("Pulze: nomi dei tone letti (%u nella lista intera)\n", pzQuantiTone(PZ_LISTA_INTERA));
    if (pzFase == 2) pzAvanza();
  } else if (tipo == 6 && gruppo == 2 && nD >= 133) {
    pzTone(D);
  } else if (tipo == 2 && gruppo == 0 && nD >= 81) {
    pzBlocco(D);
  }
}

/** Un SysEx del Mini. Solo i dati (comando 12) interessano: si ricompongono i pezzi,
 *  e a messaggio intero si conferma e si guarda cos'e'. */
static void pzPezzo(const uint8_t* r, uint16_t n) {
  if (n < 12 || r[0] != 0x21 || r[1] != 0x25 || r[2] != 0x41 || r[3] != 0x50) return;
  if (r[7] != 0x12) return;                // 14 = conferme, 11 = domande: niente da fare
  const size_t lung = (size_t)r[8] | ((size_t)r[9] << 7);
  size_t da;
  const uint8_t* coppie;
  if (r[10] == 0 && r[11] == 0) {          // il primo pezzo: comincia con lo 00 di testa
    if (n < 10 + 18) return;
    uint8_t testa[9];
    for (uint8_t k = 0; k < 9; k++) testa[k] = (uint8_t)(r[10 + 2 * k] << 4 | r[11 + 2 * k]);
    const uint16_t tipo = testa[1] | testa[2] << 8, gruppo = testa[3] | testa[4] << 8;
    if (tipo == 0 && gruppo == 3)      { pzDest = pzSl;   pzDestMax = sizeof(pzSl);   pzSlValide = false; }
    else if (tipo == 3 && gruppo == 0) { pzDest = pzNomi; pzDestMax = sizeof(pzNomi); pzNomiValidi = false; }
    else                               { pzDest = pzMsg;  pzDestMax = sizeof(pzMsg); }
    if (lung + 1 > pzDestMax) {
      Serial.printf("Pulze: messaggio %u/%u da %u byte, troppo lungo: ignorato\n", tipo, gruppo, lung);
      pzDest = nullptr;
      return;
    }
    pzAttesi = lung + 1;
    pzAvuti = 0;
    pzBustaGruppo = r[6]; pzBustaLo = r[8]; pzBustaHi = r[9];
    da = 0;
    coppie = r + 10;
  } else {
    if (!pzDest || r[6] != pzBustaGruppo || r[8] != pzBustaLo || r[9] != pzBustaHi) return;
    da = ((size_t)r[10] | ((size_t)r[11] << 7)) + 1;
    coppie = r + 12;
  }
  const size_t quante = (n - (size_t)(coppie - r)) / 2;
  for (size_t i = 0; i < quante && da + i < pzAttesi; i++) {
    pzDest[da + i] = (uint8_t)(coppie[2 * i] << 4 | coppie[2 * i + 1]);
    pzAvuti++;
  }
  if (pzAvuti < pzAttesi) return;
  uint8_t* D = pzDest;
  pzDest = nullptr;
  pzConferma(pzBustaGruppo, pzBustaLo, pzBustaHi);
  pzMessaggio(D, pzAttesi);
}

/* ======================================================================
   Aggancio, ricordo, ingresso e uscita
   ====================================================================== */

static void pzRicorda(uint8_t lista, uint8_t pos) {
  File f = LittleFS.open(VIA_PULZE, "w");
  if (!f) { Serial.println(F("Pulze: non riesco a ricordare il tone")); return; }
  f.write(lista);
  f.write(pos);
  f.close();
}

static void pzRicordato() {
  pzVolutaLista = 0;
  pzVolutaPos = 0;
  File f = LittleFS.open(VIA_PULZE, "r");
  if (!f) return;
  const int l = f.read(), p = f.read();
  f.close();
  if (l >= 0 && p >= 0) { pzVolutaLista = (uint8_t)l; pzVolutaPos = (uint8_t)p; }
}

/** Songlist e nomi letti (o rinunciato): si torna dov'eravamo. */
static void pzPronto() {
  const uint8_t liste = pzQuanteListe();
  uint8_t l = pzVolutaLista, p = pzVolutaPos;
  if (l != PZ_LISTA_INTERA && l >= liste) { l = liste ? 0 : PZ_LISTA_INTERA; p = 0; }
  if (p >= pzQuantiTone(l)) p = 0;
  pzLista = l;
  pzGruppo = (uint8_t)(p / 4);
  Serial.printf("Pulze: pronto, %u Songlist; torno alla lista %u, posto %u\n", liste, l, p);
  if (pzQuantiTone(l)) pzSalta(l, p);
  else avvisa(TESTO("Songlist vuota", "empty Songlist"));
  aggiornaLed();
}

static bool agganciaPulze() {
  BLEDevice::getScan()->clearResults();
  if (!client) client = BLEDevice::createClient();       // lo stesso client dello Spark
  if (!client->connect(trovato)) { Serial.println(F("Pulze: connessione fallita")); return false; }
  BLERemoteService* s = client->getService(BLEUUID(UUID_MIDI));
  BLERemoteCharacteristic* c = s ? s->getCharacteristic(BLEUUID(UUID_MIDI_DATI)) : nullptr;
  if (!c) {
    Serial.printf("Pulze: niente MIDI (servizio %s, collegato %d)\n", s ? "trovato" : "assente",
                  client->isConnected());
    auto* tutti = client->getServices();
    if (tutti) for (auto& v : *tutti) Serial.printf("  servizio %s\n", v.first.c_str());
    client->disconnect();
    return false;
  }
  pzInDentro = false;
  pzRxLetti = pzRxScritti;
  pzTxTesta = pzTxFondo;
  pzDest = nullptr;
  c->registerForNotify(alArrivoPulze);
  chPulze = c;
  pzMtu = client->getMTU();
  Serial.printf("Pulze: collegato, MTU %u\n", pzMtu);
  annota("collegato al Pulze");
  pzSuonaLista = pzSuonaPos = -1;
  pzNomeSuona[0] = 0;
  pzFase = 1;
  pzTentativi = 0;
  pzChiediFase();
  if (pzTunerAlRitorno) { pzTunerAlRitorno = false; pzMandaCC(PZ_CC_TUNER, 0); }
  aggiornaLed();
  schermoSporco = true;
  return true;
}

/** Dal menu: si entra in Pulze. Lo Spark e' gia' stato lasciato da cambiaModo. */
static void pulzeEntra() {
  pzRicordato();
  chPulze = nullptr;
  pzFase = 0;
  pzStomp = pzTuner = pzFs5Tenibile = false;
  pzSuonaLista = pzSuonaPos = -1;
  pzSlValide = pzNomiValidi = false;
  pzTxTesta = pzTxFondo;
  if (scansioneInCorso) { BLEDevice::getScan()->stop(); scansioneInCorso = false; }
  if (trovato) { delete trovato; trovato = nullptr; }
  pzCercaDa = millis() - 2500;             // si cerca fra mezzo secondo
  pulzeRiarma();
}

/** Si lascia Pulze: l'accordatore del Mini si chiude e il Mini torna libero. */
static void pulzeLascia() {
  if (pzTuner && chPulze) {
    uint8_t p[5] = { 0x80, 0x80, 0xb0, PZ_CC_TUNER, 0 };
    chPulze->writeValue(p, sizeof(p), false);
  }
  pzTuner = pzStomp = false;
  if (chPulze && client && client->isConnected()) client->disconnect();
  chPulze = nullptr;
  pzFase = 0;
  pzTxTesta = pzTxFondo;
  if (scansioneInCorso) { BLEDevice::getScan()->stop(); scansioneInCorso = false; }
  if (trovato) { delete trovato; trovato = nullptr; }
}

/** Dal loop, in modalita' Pulze. */
static void sbrigaPulze() {
  // Caduto: si ricomincia a cercare, e l'accordatore si chiude al ritorno.
  if (chPulze && (!client || !client->isConnected())) {
    Serial.println(F("Pulze: collegamento perso"));
    annota("Pulze perso");
    if (pzTuner) pzTunerAlRitorno = true;
    pzTuner = pzStomp = false;
    chPulze = nullptr;
    pzFase = 0;
    pzDest = nullptr;
    pzTxTesta = pzTxFondo;
    pzCercaDa = millis();
    aggiornaLed();
    schermoSporco = true;
  }
  if (!chPulze) {
    if (trovato && !scansioneInCorso) {
      agganciaPulze();
      delete trovato;
      trovato = nullptr;
      pzCercaDa = millis();
    } else if (!trovato && !scansioneInCorso && millis() - pzCercaDa > 3000) {
      pzCercaDa = millis();
      avviaScansione();
    }
    static uint32_t passo = 0;                 // i puntini di «lo sto cercando»
    if (millis() - passo > 400) { passo = millis(); schermoSporco = true; }
    return;
  }

  while (pzRxLetti != pzRxScritti) {
    const uint8_t i = pzRxLetti % PZ_CODA;
    pzPezzo(pzRx[i], pzRxLung[i]);
    pzRxLetti = (uint8_t)(pzRxLetti + 1);
  }

  // Una richiesta senza risposta si rifa' due volte; poi si va avanti lo stesso.
  if (pzFase && pzFase < 3 && millis() - pzFaseDa > PZ_ATTESA_MS) {
    if (++pzTentativi < 3) { Serial.println(F("Pulze: nessuna risposta, richiedo")); pzChiediFase(); }
    else { Serial.println(F("Pulze: nessuna risposta, vado avanti")); pzAvanza(); }
  }

  if (!pzCodaVuota() && millis() - pzTxDa >= PZ_PAUSA_MS) {
    pzTxDa = millis();
    chPulze->writeValue(pzTx[pzTxTesta], pzTxLung[pzTxTesta], false);
    pzTxTesta = (uint8_t)((pzTxTesta + 1) % PZ_TX);
  }

  // FS5 tenuto un secondo: la pagina stomp, e il gruppo torna quello di prima.
  const uint8_t cinque = (uint8_t)(1 << LINEA_PULSANTE[FS5]);
  if (ingressiFermi & cinque) {
    pzFs5Tenibile = false;
  } else if (pzFs5Tenibile && millis() - pzFs5Da > PZ_FS5_TENUTO_MS) {
    pzFs5Tenibile = false;
    pzGruppo = pzGruppoPrima;
    pzStomp = true;
    Serial.println(F("Pulze: pagina stomp"));
    aggiornaLed();
    schermoSporco = true;
  }

  if (pzDaSalvare) {
    pzDaSalvare = false;
    if (pzSuonaLista >= 0 && pzSuonaPos >= 0
        && (pzSuonaLista != pzVolutaLista || pzSuonaPos != pzVolutaPos)) {
      pzVolutaLista = (uint8_t)pzSuonaLista;
      pzVolutaPos = (uint8_t)pzSuonaPos;
      pzRicorda(pzVolutaLista, pzVolutaPos);
    }
  }
}

/* ======================================================================
   I tasti
   ====================================================================== */

/** L'accordatore del Mini (CC 55): il Mini non manda ne' nota ne' scarto
 *  (provato il 5 novembre), quindi il pedale dice solo che e' aperto. */
static void pulzeAccordatore(bool aperto) {
  if (aperto && !chPulze) { avvisa(TESTO("il Pulze non c'e'", "no Pulze")); return; }
  pzTuner = aperto;
  if (chPulze) pzMandaCC(PZ_CC_TUNER, aperto ? 127 : 0);
  Serial.printf("Pulze: accordatore %s\n", aperto ? "aperto" : "chiuso");
  pulzeRiarma();
  aggiornaLed();
  schermoSporco = true;
}

/** Il menu si apre (FS4 tenuto): quello che FS4 ha fatto alla pressione si
 *  disfa. Il tone di prima torna a suonare e a essere quello ricordato; nello
 *  stomp Fx2 torna com'era. Se prima non suonava niente di nostro, resta cosi'. */
static void pulzeMenu() {
  const uint8_t disfa = pzFs4Disfa;
  pzFs4Disfa = 0;
  if (!chPulze || pzFase < 3) return;
  if (disfa == 1 && pzFs4Lista >= 0 && pzFs4Pos >= 0) {
    Serial.println(F("Pulze: menu, torno al tone di prima di FS4"));
    pzSalta((uint8_t)pzFs4Lista, (uint8_t)pzFs4Pos);
    pzGruppo = pzFs4Gruppo;
  } else if (disfa == 2) {
    const uint8_t b = PZ_STOMP[3];
    const bool acceso = !(pzAccesi & (1 << b));
    if (acceso) pzAccesi |= (uint8_t)(1 << b); else pzAccesi &= (uint8_t)~(1 << b);
    pzMandaCC((uint8_t)(PZ_CC_BLOCCO + b), acceso ? 127 : 0);
    Serial.println(F("Pulze: menu, Fx2 torna com'era"));
  }
}

/** Un tasto banco lasciato (senza essere tenuto): la Songlist dopo o prima, in
 *  tondo e solo fra le Songlist, partendo dal suo primo tone come nell'app. */
static void pulzeBanco(int8_t passo) {
  if (!chPulze || pzFase < 3) return;
  const uint8_t liste = pzQuanteListe();
  if (!liste) { avvisa(TESTO("nessuna Songlist", "no Songlist")); return; }
  uint8_t l;
  if (pzLista == PZ_LISTA_INTERA || pzLista >= liste) l = passo > 0 ? 0 : (uint8_t)(liste - 1);
  else l = (uint8_t)((pzLista + liste + passo) % liste);
  pzStomp = false;
  pzLista = l;
  pzGruppo = 0;
  if (pzQuantiTone(l)) pzSalta(l, 0);
  else avvisa(TESTO("Songlist vuota", "empty Songlist"));
  aggiornaLed();
  schermoSporco = true;
}

/** Una pressione in modalita' Pulze (il rilascio dei tasti banco sta in leggiTasto). */
static void pulzePremuto(uint8_t k, uint8_t ingressi) {
  pzFs4Disfa = 0;                          // un'altra pressione: FS4 non e' piu' da disfare
  // Con l'accordatore aperto un tasto qualunque lo chiude, e non fa altro.
  if (pzTuner) { pulzeAccordatore(false); pzFs5Tenibile = false; return; }
  if (k == BANCO_SX || k == BANCO_DX) {
    // Come nello Spark: cambia al rilascio, tenuto due secondi apre l'accordatore
    // (lo guarda il loop); con l'altro tasto banco giu' non fa niente.
    const uint8_t altro = (k == BANCO_SX) ? BANCO_DX : BANCO_SX;
    if (!(ingressi & (uint8_t)(1 << LINEA_PULSANTE[altro]))) { bancoAnnullato = true; return; }
    bancoInAttesa = (int8_t)k;
    bancoPremutoDa = millis();
    bancoAnnullato = false;
    return;
  }
  if (!chPulze || pzFase < 3) {
    avvisa(chPulze ? TESTO("leggo le Songlist", "reading Songlists") : TESTO("il Pulze non c'e'", "no Pulze"));
    return;
  }
  if (k == FS5) {
    if (pzStomp) {                         // dallo stomp si torna ai tone, al gruppo di prima
      pzStomp = false;
      pzFs5Tenibile = false;
    } else {                               // il gruppo dopo, subito; tenuto, si rimette
      const uint8_t gruppi = (uint8_t)((pzQuantiTone(pzLista) + 3) / 4);
      pzGruppoPrima = pzGruppo;
      if (gruppi > 1) pzGruppo = (uint8_t)((pzGruppo + 1) % gruppi);
      pzFs5Tenibile = true;
      pzFs5Da = millis();
    }
    aggiornaLed();
    schermoSporco = true;
    return;
  }
  if (pzStomp) {                           // PRE, EQ, Fx1, Fx2: il Mini conferma col blocco
    const uint8_t b = PZ_STOMP[k];
    const bool acceso = !(pzAccesi & (1 << b));
    if (k == 3) pzFs4Disfa = 2;
    if (acceso) pzAccesi |= (uint8_t)(1 << b); else pzAccesi &= (uint8_t)~(1 << b);
    pzMandaCC((uint8_t)(PZ_CC_BLOCCO + b), acceso ? 127 : 0);
    Serial.printf("Pulze: %s %s\n", PZ_NOMI_STOMP[k], acceso ? "acceso" : "spento");
    aggiornaLed();
    schermoSporco = true;
    return;
  }
  const uint16_t posto = (uint16_t)(pzGruppo * 4 + k);
  if (posto >= pzQuantiTone(pzLista)) { Serial.printf("Pulze: posto %u vuoto\n", posto + 1); return; }
  if (k == 3 && (pzSuonaLista != pzLista || pzSuonaPos != (int16_t)posto)) {
    pzFs4Disfa = 1;
    pzFs4Lista = pzSuonaLista;
    pzFs4Pos = pzSuonaPos;
    pzFs4Gruppo = pzGruppo;
  }
  pzSalta(pzLista, (uint8_t)posto);
  aggiornaLed();
  schermoSporco = true;
}

/* ======================================================================
   Il pedale d'espressione: **Inst Volume**, CC 8, da 0 (tallone) a 100 (punta),
   come il Simple Mode del Pulze Control. E' un'impostazione generale del Mini:
   resta dove la si lascia, anche cambiando tone. Si riarma a ogni tone,
   all'accordatore e al jack, e non parte niente finche' il pedale non si muove
   (come il Master dello Spark).

   Il Pitch col pedale (deciso il 4 novembre, scritto nella 2.37) l'utente l'ha
   tolto il 5 novembre: «fa talmente schifo quel pitch che non lo usero' mai».
   Come si muove una manopola col blocco intero: `..\Pulze Control\ricerca-pulze-mini.md`.
   ====================================================================== */

static void pulzeRiarma() {
  pzEsprRif = -1;
  pzEsprMosso = false;
  pzVolMandato = -1;
}

static void pulzeEspressione(float p) {
  if (!chPulze || pzFase < 3 || pzTuner) { pulzeRiarma(); return; }
  const int16_t m = (int16_t)lroundf(p * 1000);
  if (pzEsprRif < 0) { pzEsprRif = m; return; }
  if (!pzEsprMosso) {
    if (abs(m - pzEsprRif) < 15) return;   // fermo: 1,5%
    pzEsprMosso = true;
  }
  if (!pzCodaVuota()) return;              // uno alla volta, ogni PZ_PAUSA_MS
  const float x = p * 100;
  if (pzVolMandato >= 0 && fabsf(x - pzVolMandato) < 0.6f) return;   // mezzo passo di isteresi
  const int16_t v = (int16_t)lroundf(x);
  if (v == pzVolMandato) return;
  pzVolMandato = v;
  pzMandaCC(PZ_CC_INST_VOLUME, (uint8_t)v);
}

/* ======================================================================
   LED e schermo
   ====================================================================== */

/** Ai tone il LED del tone che suona, se e' nel gruppo mostrato: rosso nei gruppi
 *  dispari (1-4, 9-12…), verde nei pari, come le due meta' dello Spark. Nello
 *  stomp il verde su ogni blocco acceso, come la pagina stomp MIDI. */
static uint8_t ledPulze() {
  if (!chPulze || pzFase < 3 || pzTuner) return 0;
  uint8_t m = 0;
  if (pzStomp) {
    for (uint8_t k = 0; k < 4; k++)
      if (pzAccesi & (1 << PZ_STOMP[k])) m |= (uint8_t)(1 << LINEA_VERDE[k]);
    return m;
  }
  if (pzSuonaLista == pzLista && pzSuonaPos >= 0 && pzSuonaPos / 4 == pzGruppo) {
    const uint8_t k = (uint8_t)(pzSuonaPos % 4);
    m = (uint8_t)(1 << (pzGruppo % 2 ? LINEA_VERDE[k] : LINEA_ROSSO[k]));
  }
  return m;
}

/** Come la modalita' Spark (deciso dall'utente il 5 novembre): in alto il nome
 *  della Songlist e il quadratino con la P, pieno col Mini collegato; sotto i
 *  quattro tone del gruppo, quello che suona in negativo. Nello stomp in alto il
 *  tone e sotto i quattro blocchi, gli accesi in negativo. */
static void disegnaPulze(const char* avviso) {
  const bool pronto = chPulze && pzFase >= 3;
  char testa[24];
  if (avviso)          snprintf(testa, sizeof(testa), "%s", avviso);
  else if (pzTuner)    snprintf(testa, sizeof(testa), "Tuner");
  else if (!pronto)    snprintf(testa, sizeof(testa), "Pulze Mini");
  else if (pzStomp)    snprintf(testa, sizeof(testa), "%s", pzNomeSuona[0] ? pzNomeSuona : "Stomp");
  else                 pzNomeLista(pzLista, testa, sizeof(testa));
  disegnaTesta(testa, chPulze != nullptr, "P");

  if (!chPulze) {
    schermo.setFont(u8g2_font_6x13_tf);
    const char* riga = TESTO("lo sto cercando", "searching");
    const int largo = schermo.getStrWidth(riga) + 18;
    const int x = (128 - largo) / 2;
    schermo.drawStr(x, 42, riga);
    const uint8_t quanti = (uint8_t)((millis() / 400) % 4);
    for (uint8_t k = 0; k < quanti; k++) schermo.drawBox(x + largo - 16 + k * 6, 40, 2, 2);
  } else if (!pronto) {
    schermo.setFont(u8g2_font_6x13_tf);
    centrato(64, 42, TESTO("leggo le Songlist", "reading Songlists"));
  } else if (pzTuner) {
    schermo.setFont(u8g2_font_6x13B_tf);
    centrato(64, 34, TESTO("Accordatore sul Mini", "Tuner on the Mini"));
    schermo.setFont(u8g2_font_6x13_tf);
    centrato(64, 54, TESTO("un tasto lo chiude", "any key closes it"));
  } else {
    for (uint8_t i = 0; i < 4; i++) {
      const int y = 15 + i * 12;
      char etichetta[4], riga[22];
      bool acceso;
      if (pzStomp) {
        acceso = pzAccesi & (1 << PZ_STOMP[i]);
        snprintf(etichetta, sizeof(etichetta), "%u", i + 1);
        snprintf(riga, sizeof(riga), "%-4s %s", PZ_NOMI_STOMP[i], acceso ? "ON" : "off");
      } else {
        const uint16_t posto = (uint16_t)(pzGruppo * 4 + i);
        acceso = pzSuonaLista == pzLista && pzSuonaPos == posto;
        snprintf(etichetta, sizeof(etichetta), "%u", posto + 1);
        char nome[21];
        if (posto < pzQuantiTone(pzLista)) pzNomeTone(pzToneDi(pzLista, posto), nome, sizeof(nome));
        else snprintf(nome, sizeof(nome), "-");
        snprintf(riga, 19, "%s", nome);    // diciotto caratteri dopo l'etichetta
      }
      if (acceso) { schermo.setDrawColor(1); schermo.drawBox(0, y, 128, 12); }
      schermo.setDrawColor(acceso ? 0 : 1);
      schermo.setFont(u8g2_font_6x13B_tf);
      schermo.drawStr(1, y + 10, etichetta);
      schermo.setFont(u8g2_font_6x13_tf);
      schermo.drawStr(17, y + 10, riga);
      schermo.setDrawColor(1);
    }
  }
  schermo.sendBuffer();
}

/** 'Z' dal seriale: com'e' messa la modalita' Pulze. */
static void pulzeStato() {
  Serial.printf("Pulze: %s, fase %u, MTU %u, SysEx persi %lu, in coda d'invio %u\n",
                chPulze ? "collegato" : "scollegato", pzFase, pzMtu, (unsigned long)pzRxPersi,
                (unsigned)((pzTxFondo + PZ_TX - pzTxTesta) % PZ_TX));
  char nome[24];
  pzNomeLista(pzLista, nome, sizeof(nome));
  Serial.printf("  mostrata: \"%s\" (%u), gruppo %u%s; suona: lista %d, posto %d, \"%s\"\n",
                nome, pzLista, pzGruppo, pzStomp ? ", pagina stomp" : "", pzSuonaLista, pzSuonaPos, pzNomeSuona);
  Serial.printf("  blocchi accesi %02x; Inst Volume mandato %d; ricordato %u/%u\n",
                pzAccesi, pzVolMandato, pzVolutaLista, pzVolutaPos);
  const uint8_t liste = pzQuanteListe();
  for (uint8_t l = 0; l < liste; l++) {
    pzNomeLista(l, nome, sizeof(nome));
    Serial.printf("  %2u  %-20s %u tone\n", l, nome, pzQuantiTone(l));
  }
}
