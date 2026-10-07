// prova-ble, 02-display.ino — Il display: schermata di avvio, batteria, modalita' MIDI, l'anello del looper, la schermata normale.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

/* La schermata di avvio, chiesta dall'utente il 24 settembre 2026: il logo
 * dell'app, sotto l'autore e la versione. Resta quattro secondi, ma **non
 * ferma niente**: intanto il pedale cerca lo Spark e legge i pulsanti, e il
 * loop semplicemente non ridisegna finche' non e' passata. */
static const uint32_t AVVIO_MS = 4000;
static uint32_t avvioFino = 0;

static void disegnaAvvio() {
  if (!schermoPresente) return;
  schermo.clearBuffer();
  schermo.setDrawColor(1);
  schermo.drawXBMP(0, 4, LOGO_LARGO, LOGO_ALTO, LOGO_BITS);
  schermo.setFont(u8g2_font_6x13_tf);
  const char* autore = "By Massimo Togni";
  schermo.drawStr((128 - schermo.getStrWidth(autore)) / 2, 44, autore);
  char versione[16];
  snprintf(versione, sizeof(versione), "v%s", VERSIONE);
  schermo.setFont(u8g2_font_6x10_tf);
  schermo.drawStr((128 - schermo.getStrWidth(versione)) / 2, 60, versione);
  schermo.sendBuffer();
  avvioFino = millis() + AVVIO_MS;
}

/** Quello che il pedale mostra, deciso dall'utente il 24 settembre 2026:
 *  - in alto il **nome del banco**, piccolo, e a destra un **quadratino pieno
 *    con la S** se lo Spark e' connesso, vuoto se no;
 *  - sotto, **i quattro preset della meta' mostrata**, uno per riga;
 *  - quello che suona **in negativo**, con la stessa regola dei LED: solo se
 *    sta nella meta' mostrata e nel banco caricato.
 *
 *  Al posto del nome del banco, per il tempo che serve, un avviso o il conto
 *  alla rovescia del ponte aperto: sono le cose che vanno viste subito. */
/** La modalita' MIDI sullo schermo: stessa forma di quella Spark, cosi' non si
 *  impara niente di nuovo. In alto la pagina e, a destra, il quadratino con la
 *  M, pieno quando il computer (USB) o l'iPad (Bluetooth) ha la pedaliera. Sotto i quattro
 *  comandi; in negativo il preset mandato per ultimo, o gli effetti accesi. */
/* --- La batteria -----------------------------------------------------------
 *
 * Chiesta dall'utente il 4 ottobre 2026. Partitore 1:2 su D0 (A0, GPIO1): due
 * 100 kΩ, dal + della batteria **dopo l'interruttore** a D0 e da D0 al −, cosi'
 * a pedale spento non consumano niente. Si legge ogni due secondi, sedici
 * campioni, media mobile lenta: la tensione di un litio sotto carico balla.
 *
 * Quattro tacche e niente percentuali (docs/pedale.md: la tensione di un litio
 * resta piatta sui 3,7 per gran parte della scarica, un «73%» sarebbe
 * inventato): >= 4,05 / 3,85 / 3,70 / 3,50 V. Sotto 3,50 l'icona lampeggia e
 * per un attimo lo dice. Fuori da 2,8-4,6 V il partitore non c'e' (o il piedino
 * e' per aria) e l'icona non compare. */
static const uint8_t PIN_BATTERIA = A0;
static uint16_t mvBatteria = 0;          // 0 = nessuna lettura sensata
static uint16_t mvGrezzo   = 0;          // l'ultima media, per il seriale
static uint32_t ultimaBatteria = 0;

static uint8_t tacche(uint16_t mv) {
  return mv >= 4050 ? 4 : mv >= 3850 ? 3 : mv >= 3700 ? 2 : mv >= 3500 ? 1 : 0;
}

static void avvisa(const char* testo);

static void leggiBatteria() {
  if (ultimaBatteria && millis() - ultimaBatteria < 2000) return;
  ultimaBatteria = millis();
  uint32_t somma = 0;
  for (uint8_t i = 0; i < 16; i++) somma += analogReadMilliVolts(PIN_BATTERIA);
  mvGrezzo = (uint16_t)(somma / 16 * 2);                 // partitore 1:2
  const uint16_t prima = mvBatteria;
  if (mvGrezzo < 2800 || mvGrezzo > 4600) mvBatteria = 0;
  else mvBatteria = prima ? (uint16_t)((prima * 7u + mvGrezzo) / 8u) : mvGrezzo;
  if ((prima == 0) != (mvBatteria == 0) || tacche(prima) != tacche(mvBatteria)) schermoSporco = true;
  if (prima >= 3500 && mvBatteria && mvBatteria < 3500) avvisa("batteria scarica");
}

/** L'icona, a sinistra del quadratino: 15x8 piu' il polo. */
static void disegnaBatteria() {
  if (!mvBatteria) return;
  const uint8_t t = tacche(mvBatteria);
  if (t == 0 && (millis() / 500) % 2) return;              // scarica: lampeggia
  const int x = 99;
  schermo.drawFrame(x, 1, 15, 8);
  schermo.drawBox(x + 15, 3, 2, 4);
  for (uint8_t k = 0; k < t; k++) schermo.drawBox(x + 2 + k * 3, 3, 2, 4);
}

static void disegnaMidi(const char* avviso) {
  char testa[20];
  if (avviso) snprintf(testa, sizeof(testa), "%s", avviso);
  else if (paginaMidi == 0) snprintf(testa, sizeof(testa), "MIDI preset %u-%u",
                                     gruppoMidi * 4 + 1, gruppoMidi * 4 + 4);
  else snprintf(testa, sizeof(testa), "MIDI stomp");
  schermo.setFont(u8g2_font_helvB08_tf);
  schermo.setClipWindow(0, 0, 96, 11);   // a destra stanno la batteria e il quadratino
  schermo.drawStr(0, 8, testa);
  schermo.setMaxClipWindow();
  disegnaBatteria();

  if (usbMontato || midiCentrale) {
    schermo.drawBox(118, 0, 10, 10);
    schermo.setDrawColor(0);
    schermo.setFont(u8g2_font_5x7_tf);
    schermo.drawStr(121, 8, "M");
    schermo.setDrawColor(1);
  } else {
    schermo.drawFrame(118, 0, 10, 10);
  }
  schermo.drawHLine(0, 12, 128);

  for (uint8_t i = 0; i < 4; i++) {
    const int y = 15 + i * 12;
    const bool acceso = paginaMidi == 0 ? programmaMidi == gruppoMidi * 4 + i
                                        : (stompAccesi & (1 << i)) != 0;
    if (acceso) { schermo.setDrawColor(1); schermo.drawBox(0, y, 128, 12); }
    schermo.setDrawColor(acceso ? 0 : 1);
    char etichetta[2] = { (char)('1' + i), 0 };
    schermo.setFont(u8g2_font_6x13B_tf);
    schermo.drawStr(1, y + 10, etichetta);
    char riga[22];
    if (paginaMidi == 0)
      snprintf(riga, sizeof(riga), "Preset %u", gruppoMidi * 4 + i + 1);
    else
      snprintf(riga, sizeof(riga), "Stomp %u  %s", i + 1, acceso ? "ON" : "off");
    schermo.setFont(u8g2_font_6x13_tf);
    schermo.drawStr(17, y + 10, riga);
  }
  schermo.setDrawColor(1);
  schermo.sendBuffer();
}

/** Quanto dura un giro, in ms: misurato alla registrazione, o dalle battute
 *  al bpm; 0 se non si sa (lunghezza libera e niente misura). */
static uint32_t giroMs() {
  if (durataLoop) return durataLoop;
  if (!loopLibero && loopBpm) return 240000UL / loopBpm * loopBattute;   // battute da quattro tempi
  return 0;
}

/** Dove sta il loop adesso, da 0 a 1, o -1: l'ultimo 0x0377 fatto avanzare
 *  col tempo passato (al massimo un quarto di giro, se l'ampli tace). */
static float posizioneAdesso() {
  /* Col giro misurato si conta col nostro orologio, che va liscio fra un
   * 0x0377 e l'altro (arrivano cinque al secondo); dall'ampli si prende il
   * momento in cui il loop ricomincia (inizioGiro, rimesso a ogni giro).
   * 0x0377 va da 0 a 1: a fine giro 0,983-0,986 (registro del 7 ottobre). */
  if (durataLoop && inizioGiro)
    return (float)((millis() - inizioGiro) % durataLoop) / durataLoop;
  const float p = posLoop;
  if (p < 0) return -1;
  const uint32_t giro = giroMs();
  float avanti = giro ? (float)(millis() - posLoopDa) / giro : 0;
  if (avanti > 0.25f) avanti = 0.25f;
  const float q = p + avanti;
  return q - floorf(q);
}

/** Il cerchio del looper, a destra delle righe (x 85-127, y 16-63). Pulisce
 *  il suo riquadro, cosi' si puo' ridisegnare da solo. */
/** Quanto e' pieno l'anello adesso (0..1), in quanti spicchi, puntinato o no,
 *  e il numero del conteggio (0 = niente). Serve al disegno e al loop, che
 *  ridisegna lo schermo solo quando cambia. */
static float riempimentoCerchio(uint8_t& fette, bool& puntini, uint8_t& numero) {
  fette = loopBattute;
  float riempi = 0;
  puntini = false;
  /* Come l'app (video dell'utente, 7 ottobre): uno spicchio per battuta, e in
   * ogni stato il cerchio **si riempie a blocchi dalla posizione nel loop**, un
   * tempo alla volta, ricominciando da vuoto a ogni giro: pieno mentre registra
   * o suona, puntinato mentre sovraincide (nell'app: rosso, azzurro,
   * arancione). Nel conteggio una battuta sola, quattro quarti, e al centro il
   * numero alla rovescia 4, 3, 2, 1. */
  const uint16_t tempi = (!loopLibero && loopBpm) ? loopBattute * 4 : 0;
  numero = 0;
  if (contaTempo) {
    fette = 4;
    riempi = contaTempo / 4.0f;
    numero = (uint8_t)(5 - contaTempo);
  } else if (loopRegistra) {
    if (tempi) riempi = (float)((millis() - registraDa) / (60000UL / loopBpm) + 1) / tempi;
  } else if (loopSovraincide || loopSuona) {
    const float p = posizioneAdesso();
    if (p >= 0) riempi = tempi ? (floorf(p * tempi) + 1) / tempi : p;
    puntini = loopSovraincide;
  }
  return riempi > 1 ? 1 : riempi;
}

static void disegnaCerchio() {
  const int cx = 106, cy = 39, r = 21;
  uint8_t fette, numero;
  bool puntini;
  const float riempi = riempimentoCerchio(fette, puntini, numero);

  /* L'anello, come l'app: spicchi staccati da un piccolo spazio, vuoti col
   * solo contorno, pieni fin dove e' arrivato il loop (a scacchi mentre
   * sovraincide). Punto per punto: raggio e angolo in senso orario da
   * mezzogiorno. «r» e' il bordo esterno, RI quello interno. */
  const float RI = 13.5f;
  for (int y = -r; y <= r; y++)
    for (int x = -r; x <= r; x++) {
      const float d = sqrtf((float)(x * x + y * y));
      if (d < RI - 0.5f || d > r + 0.5f) continue;
      float a = atan2f((float)x, (float)-y) / (2 * PI);
      if (a < 0) a += 1;
      const float s = a * fette - floorf(a * fette);                 // dentro lo spicchio, 0..1
      const float arco = (s < 0.5f ? s : 1 - s) * 2 * PI * d / fette; // pixel dal bordo dello spicchio
      if (fette > 1 && arco < 1.0f) continue;                          // lo spazio fra gli spicchi
      bool acceso;
      if (a <= riempi) acceso = !puntini || ((x + y) & 1) == 0;
      else acceso = d < RI + 0.5f || d > r - 0.5f;                   // vuoto: i due bordi
      if (acceso) schermo.drawPixel(cx + x, cy + y);
    }

  // Al centro, se non conta: l'icona dello stato, come il tasto dell'app.
  if (!numero) {
    if (loopRegistra) {
      schermo.drawDisc(cx, cy, 5);                                   // ● registra
    } else if (loopSovraincide) {
      schermo.drawCircle(cx, cy, 6);                                 // ◉ sovraincide
      schermo.drawDisc(cx, cy, 3);
    } else if (loopSuona) {
      schermo.drawTriangle(cx - 3, cy - 5, cx - 3, cy + 5, cx + 5, cy);   // ▶ suona
    } else if (loopPresente) {
      schermo.drawBox(cx - 4, cy - 4, 9, 9);                         // ■ fermo, loop pronto
    } else {
      schermo.drawCircle(cx, cy, 5);                                 // ○ vuoto
    }
  }
  // Il numero del conteggio al centro, in XOR: si legge sul pieno e sul vuoto.
  if (numero) {
    char t[2] = { (char)('0' + numero), 0 };
    schermo.setFont(u8g2_font_helvB14_tn);
    schermo.setDrawColor(2);
    schermo.drawStr(cx - schermo.getStrWidth(t) / 2, cy + 7, t);
    schermo.setDrawColor(1);
  }
}



/* Le schermate di prova del display, dal seriale ('W'): tutto acceso, meta'
 * sopra, meta' a sinistra, le bande, poi di nuovo normale. Per guardare le
 * bande che l'utente vede sull'anello pieno (7 ottobre 2026): su questi OLED
 * una riga si spegne un po' quanti piu' pixel ha accesi, quindi l'anello
 * prende le bande delle scritte che gli stanno accanto. «Bande»: a destra un
 * blocco pieno come l'anello, a sinistra quattro strisce da 16 righe con 0,
 * 84, 40 e 0 pixel accesi per riga.
 *
 * E tre regolazioni del pannello, per provarle a occhio ('K' luminosita',
 * 'P' precarica 0xD9, 'V' VCOMH 0xDB): ognuna gira fra pochi valori e dice
 * quale ha messo. Non si ricordano allo spegnimento. */
static uint8_t provaSchermo = 0;
static const uint8_t N_PROVE = 5;
static const uint8_t LUCI[] = { 255, 160, 96, 48, 16 };
static const uint8_t PRECARICHE[] = { 0x22, 0xf1, 0x11, 0x44, 0x82 };
static const uint8_t VCOMH[] = { 0x34, 0x20, 0x30, 0x3c, 0x40 };
static uint8_t luce = 0, precarica = 0, vcomh = 0;

static void disegnaSchermo() {
  if (!schermoPresente) return;
  if (provaSchermo) {
    schermo.clearBuffer();
    schermo.setDrawColor(1);
    if (provaSchermo == 1) schermo.drawBox(0, 0, 128, 64);
    if (provaSchermo == 2) schermo.drawBox(0, 0, 128, 32);
    if (provaSchermo == 3) schermo.drawBox(0, 0, 64, 64);
    if (provaSchermo == 4) {
      schermo.drawBox(86, 0, 42, 64);      // il blocco come l'anello
      schermo.drawBox(0, 16, 84, 16);      // 84 pixel per riga
      schermo.drawBox(0, 32, 40, 16);      // 40 pixel per riga
    }
    schermo.sendBuffer();
    return;
  }
  schermo.clearBuffer();
  if (modo == MODO_MIDI) {
    schermo.setFontMode(1);
    schermo.setDrawColor(1);
    const bool avviso = avvisoTesto[0] && (int32_t)(avvisoFino - millis()) > 0;
    disegnaMidi(avviso ? avvisoTesto : nullptr);
    return;
  }
  schermo.setFontMode(1);                      // trasparente: serve al testo in negativo
  schermo.setDrawColor(1);

  // La riga in alto: Helvetica grassetto da otto pixel, piu' piccola dei preset.
  char testa[20];
  if (avvisoTesto[0] && (int32_t)(avvisoFino - millis()) > 0) {
    snprintf(testa, sizeof(testa), "%s", avvisoTesto);
  } else if (inScelta() && !chScrittura) {
    snprintf(testa, sizeof(testa), "Quale ampli?");
  } else if (pontefino) {
    const uint32_t restano = (int32_t)(pontefino - millis()) > 0
                             ? (pontefino - millis()) / 1000 : 0;
    snprintf(testa, sizeof(testa), "ponte %lu:%02lu",
             (unsigned long)(restano / 60), (unsigned long)(restano % 60));
  } else if (looper) {
    // Il bpm, e «libero» quando la lunghezza non e' fissata in battute.
    if (!loopBpm)        snprintf(testa, sizeof(testa), "Looper");
    else if (loopLibero) snprintf(testa, sizeof(testa), "Looper  libero");
    else                 snprintf(testa, sizeof(testa), "Looper  %u bpm", (unsigned)loopBpm);
  } else {
    snprintf(testa, sizeof(testa), "%s", bancoAttivo.valido ? bancoAttivo.nome : "Amp Preset");
  }
  schermo.setFont(u8g2_font_helvB08_tf);
  schermo.setClipWindow(0, 0, 96, 11);   // a destra stanno la batteria e il quadratino
  schermo.drawStr(0, 8, testa);
  schermo.setMaxClipWindow();
  disegnaBatteria();

  // Connesso: quadratino pieno con la S (Spark 2) o la N (NEO) in negativo.
  // Non connesso: vuoto.
  if (chScrittura) {
    schermo.drawBox(118, 0, 10, 10);
    schermo.setDrawColor(0);
    schermo.setFont(u8g2_font_5x7_tf);
    schermo.drawStr(121, 8, ampliScelto == AMPLI_NEO ? "N" : "S");
    schermo.setDrawColor(1);
  } else {
    schermo.drawFrame(118, 0, 10, 10);
  }
  schermo.drawHLine(0, 12, 128);         // tre pixel d'aria sotto il nome del banco

  /* Senza lo Spark, al posto dei preset si dice cosa manca. Coi preset al loro
   * posto e l'ultimo ancora in negativo il pedale sembrava piantato (foto del
   * 24 settembre): i puntini che si muovono dicono che sta cercando. */
  if (!chScrittura && sganciato) {
    schermo.setFont(u8g2_font_6x13B_tf);
    const char* riga1 = "Spark all'app";
    schermo.drawStr((128 - schermo.getStrWidth(riga1)) / 2, 33, riga1);
    schermo.sendBuffer();
    return;
  }
  /* Senza lo Spark si sceglie quale cercare (4 ottobre 2026): due caselle,
   * tasto banco sinistro lo Spark 2, destro il NEO; quella scelta in negativo. */
  if (!chScrittura) {
    const char* nomi[2] = { "Spark 2", "NEO" };
    schermo.setFont(u8g2_font_6x13B_tf);
    for (uint8_t a = 0; a < 2; a++) {
      const int x = a ? 66 : 0;
      const bool scelto = ampliScelto == a;
      if (scelto) schermo.drawBox(x, 17, 62, 18); else schermo.drawFrame(x, 17, 62, 18);
      schermo.setDrawColor(scelto ? 0 : 1);
      schermo.drawStr(x + (62 - schermo.getStrWidth(nomi[a])) / 2, 30, nomi[a]);
      schermo.setDrawColor(1);
    }
    if (inScelta()) {
      schermo.setFont(u8g2_font_6x13_tf);
      const char* riga2 = "tasti banco: scegli";
      schermo.drawStr((128 - schermo.getStrWidth(riga2)) / 2, 52, riga2);
    } else {
      schermo.setFont(u8g2_font_6x13_tf);
      const char* riga2 = "lo sto cercando";
      const int largo = schermo.getStrWidth(riga2) + 18;   // i puntini hanno il loro posto fisso
      const int x = (128 - largo) / 2;
      schermo.drawStr(x, 52, riga2);
      const uint8_t quanti = (uint8_t)((millis() / 400) % 4);
      for (uint8_t k = 0; k < quanti; k++) schermo.drawBox(x + largo - 16 + k * 6, 50, 2, 2);
    }
    schermo.sendBuffer();
    return;
  }

  /* Il looper: le quattro righe dicono cosa fa ogni footswitch, e in negativo
   * quello che l'ampli sta facendo, con la stessa regola dei LED. */
  if (looper) {
    // La prima riga dice cosa fa FS1 adesso, come il tasto REC/DUB del pannello.
    // Le righe stanno nei primi 84 pixel, undici caratteri: a destra il cerchio.
    char conta[10];
    snprintf(conta, sizeof(conta), "Conta  %u", contaTempo);
    const char* rec = contaTempo ? conta : loopRegistra ? "Rec: chiudi" : loopSovraincide ? "Dub: chiudi"
                    : loopPresente ? "Sovraincidi" : "Registra";
    const char* voci[4] = { rec, loopRipetibile ? "Ripeti" : "Annulla", "Suona", "Ferma/Canc" };
    const bool accesi[4] = { contaTempo || loopRegistra || loopSovraincide, false,
                             loopSuona && !loopRegistra,
                             loopPresente && !loopSuona && !loopRegistra };
    disegnaCerchio();
    for (uint8_t i = 0; i < 4; i++) {
      const int y = 15 + i * 12;
      if (accesi[i]) { schermo.setDrawColor(1); schermo.drawBox(0, y, 84, 12); }
      schermo.setDrawColor(accesi[i] ? 0 : 1);
      char etichetta[2] = { (char)('1' + i), 0 };
      schermo.setFont(u8g2_font_6x13B_tf);
      schermo.drawStr(1, y + 10, etichetta);
      schermo.setFont(u8g2_font_6x13_tf);
      schermo.drawStr(17, y + 10, voci[i]);
    }
    schermo.setDrawColor(1);
    schermo.sendBuffer();
    return;
  }

  // I quattro preset: righe da 12 pixel, lettere alte nove (~3,9 mm sul
  // vetro), diciotto caratteri dopo l'etichetta. Grassetto solo l'etichetta:
  // i nomi in grassetto erano troppo pieni (foto del 24 settembre).
  const bool suonaQui = nomeSuona[0] && slotSuona == slotBanco && metaSuona == metaMostrata;
  for (uint8_t i = 0; i < 4; i++) {
    const uint8_t posto = (uint8_t)(metaMostrata * 4 + i);
    const int y = 15 + i * 12;
    const bool acceso = suonaQui && corrente == posto;
    if (acceso) { schermo.setDrawColor(1); schermo.drawBox(0, y, 128, 12); }
    schermo.setDrawColor(acceso ? 0 : 1);

    // Sul NEO i preset salvati si chiamano CH1-CH4, come nell'app ufficiale;
    // l'etichetta e' piu' larga e il nome si sposta di un carattere.
    const bool ch = !bancoAttivo.valido && ampliScelto == AMPLI_NEO;
    char etichetta[4];
    if (ch) snprintf(etichetta, sizeof(etichetta), "CH%u", i + 1);
    else    snprintf(etichetta, sizeof(etichetta), "%c%u", metaMostrata ? 'B' : 'A', i + 1);
    schermo.setFont(u8g2_font_6x13B_tf);
    schermo.drawStr(1, y + 10, etichetta);
    char nome[19];
    snprintf(nome, ch ? 18 : sizeof(nome), "%s",
             posto < quantiPosti() && postoPieno(posto) ? nomePosto(posto) : "-");
    schermo.setFont(u8g2_font_6x13_tf);
    schermo.drawStr(ch ? 23 : 17, y + 10, nome);
  }
  schermo.setDrawColor(1);

  schermo.sendBuffer();
}

