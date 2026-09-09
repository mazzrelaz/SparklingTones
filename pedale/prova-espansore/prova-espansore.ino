/*
 * prova-espansore — il secondo pezzo sul banco
 * ============================================
 *
 * Aggiunge l'MCP23017 al display, sullo stesso bus I2C. Risponde a tre
 * domande, e le mostra sullo schermo cosi' si prova col pedale in mano
 * senza guardare il monitor seriale:
 *
 *   1. i due dispositivi convivono sul bus?
 *   2. l'espansore legge i pulsanti?
 *   3. l'espansore accende gli otto LED, tutti, quello giusto e del colore
 *      giusto?
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
 *   pulsanti    fra GPA0..GPA6 e GND   (arcade: COM a GND, NO sulla linea)
 *   LED         fra PB0..PB7 e GND, ognuno con la sua resistenza
 *
 * Port A in ingresso coi pull-up interni, port B in uscita: e' la divisione
 * decisa per il pedale, perche' e' il port A che puo' far scattare
 * l'interrupt e l'interrupt serve al piede, non ai LED.
 *
 * Come si prova
 * -------------
 * All'accensione parte la SEQUENZA: le otto linee una alla volta, PB0 -> PB7,
 * col numero e il colore scritti sullo schermo. Basta guardare: se si accende
 * il LED sbagliato, o il colore sbagliato, si vede subito e si sa **quale**
 * linea e' scambiata. Fra un giro e l'altro si accendono i due banchi interi,
 * tutti rossi e tutti verdi, che e' come il pedale vero li usa.
 * La sequenza gira finche' non si preme un pulsante.
 *
 * Poi si passa alla PROVA A MANO: i primi quattro footswitch accendono il
 * loro LED, il quinto cambia colore (rosso <-> verde, cioe' banco A <-> B),
 * i due tasti banco lo forzano (GPA5 rosso, GPA6 verde). Tenendo premuto il
 * quinto footswitch per piu' di un secondo riparte la sequenza.
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

/* --- Come sono cablati i LED (9 settembre 2026) ---------------------------
 * Quattro LED bicolore a catodo comune, due linee per LED: il ROSSO sulle
 * linee PARI (PB0 PB2 PB4 PB6), il VERDE sulle DISPARI (PB1 PB3 PB5 PB7).
 * Quindi il LED n (0..3, cioe' il footswitch n) ha il rosso su PB(2n) e il
 * verde su PB(2n+1): le due meta' di uno stesso LED stanno affiancate.
 * Se un giorno il cablaggio cambia, si cambiano solo queste quattro righe. */
static const uint8_t MASCHERA_ROSSO = 0x55;   // PB0 PB2 PB4 PB6
static const uint8_t MASCHERA_VERDE = 0xaa;   // PB1 PB3 PB5 PB7
static inline uint8_t bitRosso(uint8_t led) { return (uint8_t)(1 << (led * 2)); }
static inline uint8_t bitVerde(uint8_t led) { return (uint8_t)(1 << (led * 2 + 1)); }

static uint8_t indirizzo = 0;      // 0 = non trovato
static uint8_t ingressiPrec = 0xff;
static uint8_t uscite = 0;         // l'ultima cosa scritta su OLATB
static bool verde = false;         // il colore della prova a mano: banco A/B
static uint32_t pressioni[8] = {0};
static uint32_t inizioPressione[8] = {0};

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

/** L'unico posto che scrive le uscite: cosi' i due usi — la sequenza e la
 *  prova a mano — non si sovrascrivono a vicenda. */
static void accendi(uint8_t maschera) {
  uscite = maschera;
  scrivi(OLATB, maschera);
}

/** Nella prova a mano ogni footswitch accende il suo LED, nel colore corrente. */
static void aggiornaUscite(uint8_t ingressi) {
  uint8_t m = 0;
  for (uint8_t i = 0; i < 4; i++) {
    const bool premuto = !(ingressi & (1 << i));   // pull-up: premuto = zero
    if (premuto) m |= verde ? bitVerde(i) : bitRosso(i);
  }
  accendi(m);
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

/* ---------------------------- la sequenza ---------------------------- */

static void disegnaLinea(uint8_t b) {
  char riga[24];
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 10, "sequenza LED");
  schermo.setFont(u8g2_font_10x20_tf);
  snprintf(riga, sizeof(riga), "PB%u  %s", (unsigned)b, (b & 1) ? "VERDE" : "ROSSO");
  schermo.drawStr(0, 34, riga);
  schermo.setFont(u8g2_font_6x12_tf);
  snprintf(riga, sizeof(riga), "e' il LED %u", (unsigned)(b / 2) + 1);
  schermo.drawStr(0, 48, riga);
  schermo.drawStr(0, 62, "premi per fermare");
  schermo.sendBuffer();
}

static void disegnaBanco(bool inVerde) {
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 10, "sequenza LED");
  schermo.setFont(u8g2_font_10x20_tf);
  schermo.drawStr(0, 34, inVerde ? "BANCO B" : "BANCO A");
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 48, inVerde ? "tutti e 4 verdi" : "tutti e 4 rossi");
  schermo.drawStr(0, 62, "premi per fermare");
  schermo.sendBuffer();
}

/** Aspetta, ma **guardando gli ingressi**: torna true appena un pulsante e'
 *  premuto, cosi' la sequenza si ferma sotto il dito invece di finire il suo
 *  giro. E' la stessa regola del firmware vero: nessuna attesa cieca. */
static bool attendi(uint16_t ms) {
  const uint32_t inizio = millis();
  while (millis() - inizio < ms) {
    uint8_t v;
    if (leggi(GPIOA, v) && v != 0xff) return true;
    delay(2);
  }
  return false;
}

static void attendiRilascio() {
  uint8_t v;
  while (leggi(GPIOA, v) && v != 0xff) delay(5);
  delay(30);   // antirimbalzo: il segnale deve stare fermo, non solo passare
}

/** Le otto linee una alla volta, poi i due banchi interi. Gira finche' non si
 *  preme qualcosa. Un LED che non si accende, che si accende insieme a un
 *  altro o del colore sbagliato si vede qui, con scritto **quale linea e'**. */
static void sequenza() {
  if (indirizzo == 0) return;
  Serial.println(F("-- sequenza: le otto linee, una alla volta --"));
  attendiRilascio();

  bool fermato = false;
  while (!fermato) {
    for (uint8_t b = 0; b < 8 && !fermato; b++) {
      accendi((uint8_t)(1 << b));
      Serial.print(F("   PB"));
      Serial.print(b);
      Serial.print((b & 1) ? F("  verde   LED ") : F("  rosso   LED "));
      Serial.println((b / 2) + 1);
      disegnaLinea(b);
      fermato = attendi(900);
    }
    if (!fermato) {
      accendi(MASCHERA_ROSSO);
      Serial.println(F("   banco A: tutti e quattro rossi"));
      disegnaBanco(false);
      fermato = attendi(1400);
    }
    if (!fermato) {
      accendi(MASCHERA_VERDE);
      Serial.println(F("   banco B: tutti e quattro verdi"));
      disegnaBanco(true);
      fermato = attendi(1400);
    }
  }

  accendi(0x00);
  ingressiPrec = 0xff;
  Serial.println(F("-- prova a mano: footswitch = LED, il quinto cambia colore --"));
  Serial.println(F("   (tieni premuto il quinto per un secondo e la sequenza riparte)"));
}

/* -------------------------- la prova a mano -------------------------- */

/** Sopra gli otto ingressi, sotto le otto uscite: piena = attiva. */
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
  for (uint8_t i = 0; i < 8; i++) totale += pressioni[i];
  char testa[26];
  snprintf(testa, sizeof(testa), "0x%02X %s   %lu",
           indirizzo, verde ? "VERDE" : "ROSSO", (unsigned long)totale);
  schermo.drawStr(0, 9, testa);

  for (uint8_t i = 0; i < 8; i++) {
    const int x = i * 16;
    // il pull-up tiene alto a riposo: premuto = bit a zero
    const bool premuto = !(ingressi & (1 << i));
    if (premuto) schermo.drawBox(x, 13, 14, 12);
    else schermo.drawFrame(x, 13, 14, 12);
    char n[2] = {(char)('0' + i), 0};
    schermo.drawStr(x + 4, 36, n);

    const bool acceso = (uscite & (1 << i)) != 0;
    if (acceso) schermo.drawBox(x, 40, 14, 12);
    else schermo.drawFrame(x, 40, 14, 12);
    char c[2] = {(char)((i & 1) ? 'V' : 'R'), 0};
    schermo.drawStr(x + 4, 63, c);
  }
  schermo.sendBuffer();
}

void setup() {
  Serial.begin(115200);
  /* LA TRAPPOLA CHE E' COSTATA UNA SERATA: sulla XIAO la seriale passa
   * dentro la USB, e **se al PC nessuno sta leggendo la porta, ogni
   * Serial.print resta appesa fino allo scadere di un timeout**. Con due
   * stampe per ciclo un lampeggio da 1,4 s diventava di cinque secondi, e i
   * pulsanti rispondevano in ritardo. Con zero non aspetta piu' nessuno: se
   * non c'e' un ascoltatore, la riga si butta via e il firmware tira dritto.
   * Nel pedale vero questo non e' un dettaglio: sul palco il PC non c'e'. */
  Serial.setTxTimeoutMs(0);
  delay(400);
  Serial.println();
  Serial.println(F("=== prova-espansore: pulsanti e LED ==="));
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
    sequenza();
  }
}

/* Il giro e' costruito attorno a una regola che vale anche per il firmware
 * vero: **gli ingressi si leggono spesso, il display si ridisegna di rado**.
 * Un fotogramma intero sono 1024 byte sullo stesso bus da cui si leggono i
 * pulsanti: ridisegnando a ogni giro il tasto si legge solo fra un disegno e
 * l'altro, e la pressione arriva in ritardo. Quindi il display si tocca solo
 * quando qualcosa e' cambiato, e i LED partono **prima** del disegno. */
/* Quanto ci mette ogni operazione sul bus, in microsecondi. Serve a sapere
 * *dove* se ne vanno i secondi invece di tirare a indovinare. */
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
    for (uint8_t i = 0; i < 8; i++) {
      const bool prima = !(ingressiPrec & (1 << i));
      const bool adesso = !(ingressi & (1 << i));
      if (adesso && !prima) {
        pressioni[i]++;
        inizioPressione[i] = millis();
        // il quinto footswitch cambia meta', i due tasti banco la forzano
        if (i == 4) verde = !verde;
        else if (i == 5) verde = false;
        else if (i == 6) verde = true;
        Serial.print(F("GPA"));
        Serial.print(i);
        Serial.print(F(" PREMUTO    ("));
        Serial.print(pressioni[i]);
        Serial.println(F(" volte)"));
      } else if (!adesso && prima) {
        Serial.print(F("GPA"));
        Serial.print(i);
        Serial.print(F(" rilasciato dopo "));
        Serial.print(millis() - inizioPressione[i]);
        Serial.println(F(" ms"));
      }
    }
    ingressiPrec = ingressi;
    // i LED per primi: sono due byte sul bus e devono seguire il dito
    t0 = micros();
    aggiornaUscite(ingressi);
    const uint32_t dtScrittura = micros() - t0;
    if (dtScrittura > maxScrittura) maxScrittura = dtScrittura;
  }

  // quinto footswitch tenuto premuto: la sequenza riparte
  if (indirizzo != 0 && !(ingressiPrec & (1 << 4)) &&
      (millis() - inizioPressione[4]) > 1200) {
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
