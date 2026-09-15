/*
 * prova-espansore — il secondo pezzo sul banco
 * ============================================
 *
 * Aggiunge l'MCP23017 al display, sullo stesso bus I2C, e serve a sapere
 * **quale pulsante e quale LED stanno su quale linea**, col pedale in mano e
 * senza guardare il monitor seriale.
 *
 * Nessuna libreria per l'MCP23017: sono quattro registri, e scriverli a
 * mano vale meno di una dipendenza in piu'.
 *
 * Collegamenti (il display resta dov'era, il bus e' lo stesso):
 *
 *   espansore   XIAO
 *   ----------------
 *   VDD         3V3
 *   VSS/GND     GND
 *   SDA         D4
 *   SCL         D5
 *   A0 A1 A2    GND        <- indirizzo 0x20
 *   RESET       3V3        <- attivo basso: per aria il chip resta in reset
 *
 *   pulsanti    fra GPA0..GPA7 e GND   (COM a GND, NO sulla linea)
 *   LED         fra PB0..PB7 e GND, ognuno con la sua resistenza
 *
 * Port A in ingresso coi pull-up interni, port B in uscita: e' la divisione
 * decisa per il pedale, perche' e' il port A che puo' far scattare
 * l'interrupt e l'interrupt serve al piede, non ai LED.
 *
 * Come si prova
 * -------------
 * 1. MAPPATURA, all'accensione. Lo schermo chiede di premere i sette
 *    pulsanti uno alla volta, nell'ordine (footswitch 1..5 da sinistra, poi
 *    tasto banco sinistro e destro), e si segna su che linea arriva ognuno.
 *    Poi accende le otto linee dei LED una alla volta e chiede cosa si vede:
 *    si risponde col footswitch del LED che si e' acceso (il quinto se non si
 *    accende niente) e poi col colore (tasto banco sinistro rosso, destro
 *    verde). Alla fine mostra le due tabelle, e le scrive sulla seriale.
 *    **Una linea a cui si risponde "niente" e' un LED guasto o un filo
 *    staccato**: e' la diagnosi, non un errore della procedura.
 * 2. PROVA A MANO, subito dopo e **con la mappa appena trovata**: i quattro
 *    LED accesi nel colore del banco, il footswitch premuto lascia acceso
 *    solo il suo, il quinto cambia colore, i tasti banco lo forzano. Se qui
 *    tutto torna, la mappa e' giusta.
 * 3. Tenendo premuto il quinto footswitch per piu' di un secondo parte la
 *    SEQUENZA dei LED, in ordine da sinistra a destra.
 *
 * Se un pulsante non risponde, dopo 30 secondi la mappatura va avanti da
 * sola e lo segna come assente.
 */

#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>

#define CONTROLLORE 0    // come in prova-display

static const uint8_t PIN_SDA = D4;
static const uint8_t PIN_SCL = D5;

#if CONTROLLORE == 0
U8G2_SSD1309_128X64_NONAME0_F_HW_I2C schermo(
    U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);
#elif CONTROLLORE == 1
U8G2_SSD1309_128X64_NONAME2_F_HW_I2C schermo(
    U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);
#else
U8G2_SSD1306_128X64_NONAME_F_HW_I2C schermo(
    U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);
#endif

/* --- MCP23017, i soli registri che servono (IOCON.BANK = 0, il default) --- */
static const uint8_t IODIRA = 0x00;
static const uint8_t IODIRB = 0x01;
static const uint8_t GPPUA = 0x0C;
static const uint8_t GPIOA = 0x12;
static const uint8_t OLATB = 0x15;

static const uint8_t ASSENTE = 255;   // una linea che non si e' trovata

/* --- La mappa dei pulsanti e dei LED ---------------------------------------
 * **Non si scrive a mano: la trova la mappatura all'accensione.** I valori
 * qui sotto sono solo il punto di partenza, e sono quelli dell'ultima volta
 * che l'hardware e' stato verificato. Il cablaggio e' gia' stato rifatto due
 * volte, e ogni volta la tabella ricostruita a mente era sbagliata.
 *
 * Pulsanti, nell'ordine: footswitch 1..5 da sinistra, tasto banco sinistro,
 * tasto banco destro. Il valore e' la linea GPA.
 * LED: per ogni LED da sinistra, la linea PB del rosso e quella del verde.
 *
 * Trovati con la mappatura il 15 settembre 2026, dopo il cablaggio rifatto.
 * Unica eccezione: il verde del LED 2 non si e' acceso, perche' quel ramo e'
 * interrotto. PB6 e' l'unica linea rimasta libera e ci stava fino al 13
 * settembre, quindi e' scritto 6 — ma **non e' verificato** finche' il ramo
 * non e' riparato e la mappatura non lo trova. GPA2 resta libero. */
static const uint8_t N_PULSANTI = 7;
static const uint8_t FS5 = 4, BANCO_SX = 5, BANCO_DX = 6;
static uint8_t LINEA_PULSANTE[N_PULSANTI] = {4, 5, 6, 3, 7, 0, 1};
static uint8_t LINEA_ROSSO[4] = {5, 7, 2, 0};
static uint8_t LINEA_VERDE[4] = {4, 6, 3, 1};

static const char *const NOME_PULSANTE[N_PULSANTI] = {
  "FOOTSWITCH 1", "FOOTSWITCH 2", "FOOTSWITCH 3", "FOOTSWITCH 4",
  "FOOTSWITCH 5", "BANCO SX", "BANCO DX"};

/* Quanto sta accesa ogni linea nella sequenza, in millisecondi. Con meno di
 * un paio di secondi non si fa in tempo a leggere lo schermo e poi guardare
 * il LED: 900 ms erano troppo pochi. I due banchi interi, un secondo in piu'. */
static const uint16_t PASSO_MS = 3000;
/* Quanto aspetta la mappatura prima di dare per assente un pulsante. */
static const uint16_t ATTESA_MAPPA_MS = 30000;

static uint8_t mascheraColore(const uint8_t linee[4]) {
  uint8_t m = 0;
  for (uint8_t n = 0; n < 4; n++) {
    if (linee[n] != ASSENTE) m |= (uint8_t)(1 << linee[n]);
  }
  return m;
}

static inline uint8_t bitRosso(uint8_t led) {
  return LINEA_ROSSO[led] == ASSENTE ? 0 : (uint8_t)(1 << LINEA_ROSSO[led]);
}
static inline uint8_t bitVerde(uint8_t led) {
  return LINEA_VERDE[led] == ASSENTE ? 0 : (uint8_t)(1 << LINEA_VERDE[led]);
}

/** Che LED e che colore stanno su una linea; -1 se nessuno. */
static int8_t ledDiLinea(uint8_t b, bool &inVerde) {
  for (uint8_t n = 0; n < 4; n++) {
    if (LINEA_ROSSO[n] == b) { inVerde = false; return (int8_t)n; }
    if (LINEA_VERDE[n] == b) { inVerde = true;  return (int8_t)n; }
  }
  return -1;
}

/** Il pulsante k e' premuto, secondo la mappa? Pull-up: premuto = bit a zero. */
static bool premuto(uint8_t ingressi, uint8_t k) {
  const uint8_t l = LINEA_PULSANTE[k];
  return l != ASSENTE && !(ingressi & (1 << l));
}

static uint8_t indirizzo = 0;      // 0 = non trovato
static uint8_t ingressiPrec = 0xff;
static uint8_t uscite = 0;         // l'ultima cosa scritta su OLATB
static bool verde = false;         // il colore della prova a mano: banco A/B
static uint32_t pressioni[N_PULSANTI] = {0};
static uint32_t inizioPressione[N_PULSANTI] = {0};

static bool scrivi(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(indirizzo);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

static bool leggi(uint8_t reg, uint8_t &val) {
  Wire.beginTransmission(indirizzo);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)indirizzo, 1) != 1) return false;
  val = Wire.read();
  return true;
}

/** L'unico posto che scrive le uscite: cosi' la mappatura, la sequenza e la
 *  prova a mano non si sovrascrivono a vicenda. */
static void accendi(uint8_t maschera) {
  uscite = maschera;
  scrivi(OLATB, maschera);
}

/** Nella prova a mano i quattro LED stanno **accesi** nel colore del banco, e
 *  tenendo premuto un footswitch resta acceso solo il suo. Cosi' ogni tasto
 *  risponde con qualcosa che si vede — prima i tasti banco cambiavano il solo
 *  colore e sembravano scollegati. E' anche il comportamento del pedale vero. */
static void aggiornaUscite(uint8_t ingressi) {
  int8_t solo = -1;
  for (uint8_t k = 0; k < 4; k++) {
    if (premuto(ingressi, k)) solo = (int8_t)k;
  }
  if (solo >= 0) accendi(verde ? bitVerde((uint8_t)solo) : bitRosso((uint8_t)solo));
  else accendi(mascheraColore(verde ? LINEA_VERDE : LINEA_ROSSO));
}

/** Chi risponde sul bus, e intanto trova l'espansore. */
static void scansione() {
  Serial.println(F("-- scansione del bus I2C --"));
  for (uint8_t ind = 1; ind < 127; ind++) {
    Wire.beginTransmission(ind);
    if (Wire.endTransmission() != 0) continue;
    Serial.print(F("   risponde 0x"));
    if (ind < 16) Serial.print('0');
    Serial.print(ind, HEX);
    if (ind == 0x3c || ind == 0x3d) Serial.print(F("   <- il display"));
    if (ind >= 0x20 && ind <= 0x27) {
      Serial.print(F("   <- l'espansore"));
      indirizzo = ind;
    }
    Serial.println();
  }
  if (indirizzo == 0) {
    Serial.println(F("   espansore NON trovato. In quest'ordine: i due fili"));
    Serial.println(F("   del bus, poi VDD e GND, poi RESET (deve stare alto),"));
    Serial.println(F("   poi i ponticelli d'indirizzo."));
  }
}

/* ----------------------- attese che guardano i tasti ----------------------- */

/* Che cosa sta dicendo lo schermo mentre si aspetta: le attese lo ridisegnano
 * per far scendere la barra, quindi devono sapere cosa c'e' scritto. */
static const char *domandaSopra = "";
static const char *domandaGrande = "";
static const char *domandaSotto1 = "";
static const char *domandaSotto2 = "";

/** Quattro righe e, in mezzo, la barra che si svuota: senza, non si sa
 *  quanto manca e il cambio arriva addosso. */
static void disegnaDomanda(uint32_t trascorsi, uint32_t totale) {
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 10, domandaSopra);
  schermo.setFont(u8g2_font_10x20_tf);
  schermo.drawStr(0, 32, domandaGrande);
  if (totale > 0 && trascorsi < totale) {
    const int larghezza = (int)(128L * (long)(totale - trascorsi) / (long)totale);
    schermo.drawBox(0, 36, larghezza, 2);
  }
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 50, domandaSotto1);
  schermo.drawStr(0, 63, domandaSotto2);
  schermo.sendBuffer();
}

static void attendiRilascio() {
  uint8_t v;
  uint32_t fermoDa = millis();
  // antirimbalzo: tutto rilasciato **e fermo** per 40 ms, non solo passato
  while (millis() - fermoDa < 40) {
    if (!leggi(GPIOA, v) || v != 0xff) fermoDa = millis();
    delay(3);
  }
}

/** Aspetta che una linea GPA vada a massa, ignorando quelle in `escluse`, e
 *  torna il suo numero; -1 se scade il tempo. Una pressione conta solo se
 *  resta giu' per 25 ms, e si torna solo a tasto rilasciato: cosi' la domanda
 *  dopo non si prende il rimbalzo di quella prima. */
static int8_t attendiLinea(uint32_t ms, uint8_t escluse) {
  const uint32_t inizio = millis();
  uint32_t ultimoDisegno = 0;
  disegnaDomanda(0, ms);
  for (;;) {
    const uint32_t trascorsi = millis() - inizio;
    if (trascorsi >= ms) return -1;
    uint8_t v;
    if (leggi(GPIOA, v)) {
      const uint8_t giu = (uint8_t)(~v & ~escluse);
      if (giu) {
        delay(25);
        uint8_t w;
        if (leggi(GPIOA, w) && (uint8_t)(~w & ~escluse & giu)) {
          const uint8_t conferma = (uint8_t)(~w & ~escluse & giu);
          int8_t linea = 0;
          while (!(conferma & (1 << linea))) linea++;
          attendiRilascio();
          return linea;
        }
      }
    }
    if (trascorsi - ultimoDisegno >= 250) {
      ultimoDisegno = trascorsi;
      disegnaDomanda(trascorsi, ms);
    }
    delay(3);
  }
}

/** Come attendiLinea, ma risponde con il pulsante (0..6) secondo la mappa,
 *  accettando solo quelli nella maschera `ammessi`. */
static int8_t attendiPulsante(uint32_t ms, uint8_t ammessi) {
  uint8_t escluse = 0xff;
  for (uint8_t k = 0; k < N_PULSANTI; k++) {
    if ((ammessi & (1 << k)) && LINEA_PULSANTE[k] != ASSENTE) {
      escluse &= (uint8_t) ~(1 << LINEA_PULSANTE[k]);
    }
  }
  const int8_t linea = attendiLinea(ms, escluse);
  if (linea < 0) return -1;
  for (uint8_t k = 0; k < N_PULSANTI; k++) {
    if (LINEA_PULSANTE[k] == (uint8_t)linea) return (int8_t)k;
  }
  return -1;
}

static void stampaLinea(uint8_t l) {
  if (l == ASSENTE) Serial.print(F("--"));
  else Serial.print(l);
}

/* ------------------------------- la mappatura ------------------------------ */

/** La schermata finale: le due tabelle intere, in piccolo. Si fotografa. */
static void disegnaRiepilogo() {
  char riga[32];
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_5x8_tf);

  auto cella = [](char *s, uint8_t l) {
    if (l == ASSENTE) { s[0] = '-'; s[1] = 0; }
    else { s[0] = (char)('0' + l); s[1] = 0; }
  };

  schermo.drawStr(0, 7, "PULSANTI -> GPA");
  char f[5][2];
  for (uint8_t k = 0; k < 5; k++) cella(f[k], LINEA_PULSANTE[k]);
  snprintf(riga, sizeof(riga), "FS 1:%s 2:%s 3:%s 4:%s 5:%s",
           f[0], f[1], f[2], f[3], f[4]);
  schermo.drawStr(0, 16, riga);
  char sx[2], dx[2];
  cella(sx, LINEA_PULSANTE[BANCO_SX]);
  cella(dx, LINEA_PULSANTE[BANCO_DX]);
  snprintf(riga, sizeof(riga), "banco sx:%s  dx:%s", sx, dx);
  schermo.drawStr(0, 25, riga);

  schermo.drawStr(0, 35, "LED -> PB   rosso verde");
  for (uint8_t n = 0; n < 4; n++) {
    char r[2], v[2];
    cella(r, LINEA_ROSSO[n]);
    cella(v, LINEA_VERDE[n]);
    snprintf(riga, sizeof(riga), "LED %u        %s     %s", (unsigned)n + 1, r, v);
    schermo.drawStr(0, 42 + n * 7, riga);
  }
  schermo.sendBuffer();
}

static void stampaRiepilogo() {
  Serial.println(F("== mappa trovata =="));
  Serial.print(F("LINEA_PULSANTE = {"));
  for (uint8_t k = 0; k < N_PULSANTI; k++) {
    if (k) Serial.print(F(", "));
    stampaLinea(LINEA_PULSANTE[k]);
  }
  Serial.println(F("}   // FS1..FS5, banco sx, banco dx"));
  Serial.print(F("LINEA_ROSSO = {"));
  for (uint8_t n = 0; n < 4; n++) { if (n) Serial.print(F(", ")); stampaLinea(LINEA_ROSSO[n]); }
  Serial.println(F("}"));
  Serial.print(F("LINEA_VERDE = {"));
  for (uint8_t n = 0; n < 4; n++) { if (n) Serial.print(F(", ")); stampaLinea(LINEA_VERDE[n]); }
  Serial.println(F("}"));
}

static void mappatura() {
  if (indirizzo == 0) return;
  accendi(0x00);
  attendiRilascio();
  Serial.println(F("-- mappatura dei pulsanti --"));

  /* Prima i pulsanti: servono a rispondere alle domande sui LED. Una linea
   * gia' presa non vale una seconda volta, cosi' ripremere per sbaglio il
   * tasto di prima non sposta niente. */
  uint8_t prese = 0;
  for (uint8_t k = 0; k < N_PULSANTI; k++) {
    domandaSopra = "MAPPATURA  pulsanti";
    domandaGrande = NOME_PULSANTE[k];
    domandaSotto1 = "premilo una volta";
    domandaSotto2 = (k < 5) ? "(footswitch da sinistra)" : "(ai lati del display)";
    const int8_t l = attendiLinea(ATTESA_MAPPA_MS, prese);
    LINEA_PULSANTE[k] = (l < 0) ? ASSENTE : (uint8_t)l;
    if (l >= 0) prese |= (uint8_t)(1 << l);
    Serial.print(F("   "));
    Serial.print(NOME_PULSANTE[k]);
    Serial.print(F(" -> GPA"));
    stampaLinea(LINEA_PULSANTE[k]);
    Serial.println();
  }

  /* Poi i LED: una linea alla volta, e si chiede cosa si vede. Le risposte
   * si danno coi pulsanti appena mappati: il footswitch del LED acceso (il
   * quinto per "niente"), poi il colore coi tasti banco. Se un tasto banco
   * manca, al suo posto fanno il footswitch 1 (rosso) e 2 (verde). */
  Serial.println(F("-- mappatura dei LED --"));
  const bool conBanchi =
      LINEA_PULSANTE[BANCO_SX] != ASSENTE && LINEA_PULSANTE[BANCO_DX] != ASSENTE;
  const uint8_t tastoRosso = conBanchi ? BANCO_SX : 0;
  const uint8_t tastoVerde = conBanchi ? BANCO_DX : 1;

  for (uint8_t n = 0; n < 4; n++) { LINEA_ROSSO[n] = ASSENTE; LINEA_VERDE[n] = ASSENTE; }
  static char grande[16];

  for (uint8_t b = 0; b < 8; b++) {
    accendi((uint8_t)(1 << b));
    snprintf(grande, sizeof(grande), "PB%u acceso", (unsigned)b);
    domandaSopra = "MAPPATURA  LED";
    domandaGrande = grande;
    domandaSotto1 = "premi il footswitch";
    domandaSotto2 = "del LED  (5 = niente)";
    const int8_t led = attendiPulsante(ATTESA_MAPPA_MS, 0x1f);   // FS1..FS5

    Serial.print(F("   PB"));
    Serial.print(b);
    if (led < 0 || led == FS5) {
      Serial.println(F(" -> NIENTE acceso"));
      continue;
    }

    domandaSotto1 = conBanchi ? "rosso: banco SX" : "rosso: footswitch 1";
    domandaSotto2 = conBanchi ? "verde: banco DX" : "verde: footswitch 2";
    snprintf(grande, sizeof(grande), "LED %d: colore?", led + 1);
    const int8_t col = attendiPulsante(ATTESA_MAPPA_MS,
                                       (uint8_t)((1 << tastoRosso) | (1 << tastoVerde)));
    const bool inVerde = (col == (int8_t)tastoVerde);
    if (inVerde) LINEA_VERDE[led] = b;
    else LINEA_ROSSO[led] = b;
    Serial.print(F(" -> LED "));
    Serial.print(led + 1);
    Serial.println(inVerde ? F(" verde") : F(" rosso"));
  }

  accendi(0x00);
  stampaRiepilogo();
  disegnaRiepilogo();

  /* Il riepilogo resta finche' non si preme qualcosa: e' la schermata da
   * fotografare, e non deve sparire mentre si prende il telefono. */
  uint8_t v;
  do { delay(20); } while (!leggi(GPIOA, v) || v == 0xff);
  attendiRilascio();

  aggiornaUscite(0xff);
  ingressiPrec = 0xff;
  Serial.println(F("-- prova a mano, con la mappa appena trovata --"));
}

/* ---------------------------- la sequenza ---------------------------- */

/* Che cosa e' acceso adesso: 0..7 la linea accesa, -1 il banco A, -2 il B. */
static int8_t passo = 0;

static void disegnaPasso(uint16_t trascorsi, uint16_t totale) {
  char riga[24];
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 10, "sequenza LED");
  schermo.setFont(u8g2_font_10x20_tf);
  if (passo >= 0) {
    bool inVerde = false;
    const int8_t led = ledDiLinea((uint8_t)passo, inVerde);
    snprintf(riga, sizeof(riga), "LED %d %s", (int)led + 1, inVerde ? "VERDE" : "ROSSO");
    schermo.drawStr(0, 34, riga);
    schermo.setFont(u8g2_font_6x12_tf);
    snprintf(riga, sizeof(riga), "sulla linea PB%d", (int)passo);
    schermo.drawStr(0, 48, riga);
  } else {
    schermo.drawStr(0, 34, passo == -1 ? "BANCO A" : "BANCO B");
    schermo.setFont(u8g2_font_6x12_tf);
    schermo.drawStr(0, 48, passo == -1 ? "tutti e 4 rossi" : "tutti e 4 verdi");
  }
  if (totale > 0 && trascorsi < totale) {
    const int larghezza = (int)(128L * (totale - trascorsi) / totale);
    schermo.drawBox(0, 50, larghezza, 3);
  }
  schermo.drawStr(0, 63, "premi per fermare");
  schermo.sendBuffer();
}

/** Aspetta, ma **guardando gli ingressi**: torna true appena un pulsante e'
 *  premuto, cosi' la sequenza si ferma sotto il dito. */
static bool attendi(uint16_t ms) {
  const uint32_t inizio = millis();
  uint32_t ultimaBarra = 0;
  for (;;) {
    const uint32_t trascorsi = millis() - inizio;
    if (trascorsi >= ms) return false;
    uint8_t v;
    if (leggi(GPIOA, v) && v != 0xff) return true;
    if (trascorsi - ultimaBarra >= 150) {
      ultimaBarra = trascorsi;
      disegnaPasso((uint16_t)trascorsi, ms);
    }
    delay(2);
  }
}

/** I LED in ordine da sinistra a destra, prima rosso e poi verde, poi i due
 *  banchi interi. Gira finche' non si preme qualcosa. */
static void sequenza() {
  if (indirizzo == 0) return;
  Serial.println(F("-- sequenza dei LED --"));
  attendiRilascio();

  bool fermato = false;
  while (!fermato) {
    for (uint8_t n = 0; n < 4 && !fermato; n++) {
      for (uint8_t c = 0; c < 2 && !fermato; c++) {
        const uint8_t linea = c ? LINEA_VERDE[n] : LINEA_ROSSO[n];
        if (linea == ASSENTE) continue;
        accendi((uint8_t)(1 << linea));
        passo = (int8_t)linea;
        disegnaPasso(0, PASSO_MS);
        fermato = attendi(PASSO_MS);
      }
    }
    if (!fermato) {
      accendi(mascheraColore(LINEA_ROSSO));
      passo = -1;
      disegnaPasso(0, PASSO_MS + 1000);
      fermato = attendi(PASSO_MS + 1000);
    }
    if (!fermato) {
      accendi(mascheraColore(LINEA_VERDE));
      passo = -2;
      disegnaPasso(0, PASSO_MS + 1000);
      fermato = attendi(PASSO_MS + 1000);
    }
  }

  attendiRilascio();
  aggiornaUscite(0xff);
  ingressiPrec = 0xff;
}

/* -------------------------- la prova a mano -------------------------- */

/** Sopra le otto linee GPA grezze, sotto le otto uscite con cosa c'e' sopra. */
static void disegna(uint8_t ingressi) {
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);

  if (indirizzo == 0) {
    schermo.drawStr(0, 12, "espansore assente");
    schermo.drawStr(0, 26, "controlla i fili,");
    schermo.drawStr(0, 38, "VDD/GND, RESET alto");
    schermo.sendBuffer();
    return;
  }

  uint32_t totale = 0;
  for (uint8_t k = 0; k < N_PULSANTI; k++) totale += pressioni[k];
  char testa[26];
  snprintf(testa, sizeof(testa), "0x%02X %s   %lu",
           indirizzo, verde ? "VERDE" : "ROSSO", (unsigned long)totale);
  schermo.drawStr(0, 9, testa);

  for (uint8_t i = 0; i < 8; i++) {
    const int x = i * 16;
    const bool giu = !(ingressi & (1 << i));
    if (giu) schermo.drawBox(x, 13, 14, 12);
    else schermo.drawFrame(x, 13, 14, 12);
    char n[2] = {(char)('0' + i), 0};
    schermo.drawStr(x + 4, 36, n);

    const bool acceso = (uscite & (1 << i)) != 0;
    if (acceso) schermo.drawBox(x, 40, 14, 12);
    else schermo.drawFrame(x, 40, 14, 12);
    bool inVerde = false;
    const int8_t led = ledDiLinea(i, inVerde);
    char c[3] = {'-', '-', 0};
    if (led >= 0) { c[0] = (char)('1' + led); c[1] = inVerde ? 'V' : 'R'; }
    schermo.drawStr(x + 1, 63, c);
  }
  schermo.sendBuffer();
}

void setup() {
  Serial.begin(115200);
  /* LA TRAPPOLA CHE E' COSTATA UNA SERATA: sulla XIAO la seriale passa
   * dentro la USB, e **se al PC nessuno sta leggendo la porta, ogni
   * Serial.print resta appesa fino allo scadere di un timeout**. Con zero non
   * aspetta piu' nessuno. Nel pedale vero sul palco il PC non c'e'. */
  Serial.setTxTimeoutMs(0);
  delay(400);
  Serial.println();
  Serial.println(F("=== prova-espansore: mappatura di pulsanti e LED ==="));
  Serial.print(F("scheda: "));
  Serial.println(ARDUINO_BOARD);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);
  scansione();

  schermo.begin();
  schermo.setContrast(255);
  Wire.setClock(400000);   // dopo begin(): u8g2 si rimette la sua velocita'

  if (indirizzo != 0) {
    const bool a = scrivi(IODIRA, 0xff);   // port A tutto in ingresso
    const bool b = scrivi(GPPUA, 0xff);    // coi pull-up interni
    const bool c = scrivi(IODIRB, 0x00);   // port B tutto in uscita
    const bool d = scrivi(OLATB, 0x00);    // LED spenti
    Serial.print(F("configurazione: "));
    Serial.println((a && b && c && d) ? F("ok") : F("FALLITA"));
    mappatura();
  }
}

/* Gli ingressi si leggono spesso, il display si ridisegna di rado: un
 * fotogramma sono 1024 byte sullo stesso bus dei pulsanti. I LED partono
 * **prima** del disegno. */
static uint32_t maxLettura = 0, maxScrittura = 0, maxDisegno = 0;
static uint32_t ultimoRapporto = 0;

void loop() {
  static uint32_t ultimoDisegno = 0;
  uint8_t ingressi = 0xff;
  bool cambiato = false;
  uint32_t t0;

  t0 = micros();
  const bool letto = (indirizzo != 0) && leggi(GPIOA, ingressi);
  const uint32_t dtLettura = micros() - t0;
  if (dtLettura > maxLettura) maxLettura = dtLettura;

  if (letto && ingressi != ingressiPrec) {
    cambiato = true;
    for (uint8_t k = 0; k < N_PULSANTI; k++) {
      const bool prima = premuto(ingressiPrec, k);
      const bool adesso = premuto(ingressi, k);
      if (adesso && !prima) {
        pressioni[k]++;
        inizioPressione[k] = millis();
        // il quinto footswitch cambia meta', i due tasti banco la forzano
        if (k == FS5) verde = !verde;
        else if (k == BANCO_SX) verde = false;
        else if (k == BANCO_DX) verde = true;
        Serial.print(NOME_PULSANTE[k]);
        Serial.print(F(" premuto ("));
        Serial.print(pressioni[k]);
        Serial.println(F(" volte)"));
      }
    }
    ingressiPrec = ingressi;
    t0 = micros();
    aggiornaUscite(ingressi);
    const uint32_t dtScrittura = micros() - t0;
    if (dtScrittura > maxScrittura) maxScrittura = dtScrittura;
  }

  // quinto footswitch tenuto premuto: parte la sequenza
  if (indirizzo != 0 && premuto(ingressiPrec, FS5) &&
      (millis() - inizioPressione[FS5]) > 1200) {
    sequenza();
    return;
  }

  if (cambiato || (millis() - ultimoDisegno) > 500) {
    t0 = micros();
    disegna(ingressiPrec);
    const uint32_t dtDisegno = micros() - t0;
    if (dtDisegno > maxDisegno) maxDisegno = dtDisegno;
    ultimoDisegno = millis();
  }

  if (millis() - ultimoRapporto > 2000) {
    ultimoRapporto = millis();
    Serial.print(F("[tempi max, us]  lettura "));
    Serial.print(maxLettura);
    Serial.print(F("   scrittura LED "));
    Serial.print(maxScrittura);
    Serial.print(F("   disegno "));
    Serial.println(maxDisegno);
    maxLettura = maxScrittura = maxDisegno = 0;
  }

  delay(2);
}
