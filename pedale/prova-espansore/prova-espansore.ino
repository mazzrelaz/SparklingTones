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
 * All'accensione parte la SEQUENZA: gli otto mezzi LED uno alla volta, in
 * ordine da sinistra a destra e per ogni LED prima il rosso e poi il verde,
 * con scritto sullo schermo quale LED dovrebbe accendersi e su che linea sta.
 * Cosi' basta guardare la fila: se l'ordine salta, o il colore e' l'altro, il
 * filo scambiato e' quello che lo schermo sta nominando. Fra un giro e l'altro
 * si accendono i due banchi interi, tutti rossi e tutti verdi, che e' come il
 * pedale vero li usa. La sequenza gira finche' non si preme un pulsante.
 *
 * Poi si passa alla PROVA A MANO: i quattro LED stanno accesi nel colore del
 * banco, tenendo premuto uno dei primi quattro footswitch resta acceso solo
 * il suo, il quinto cambia colore (rosso <-> verde, cioe' banco A <-> B) e i
 * due tasti banco lo forzano (GPA5 rosso, GPA6 verde). Tenendo premuto il
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

/* --- Come sono cablati i LED (9 settembre 2026, dall'utente) ---------------
 * Quattro LED bicolore a catodo comune, due linee per LED. Le linee NON sono
 * in ordine, e non c'e' nessuna regola da indovinare: sono queste.
 *
 *      LED 1   rosso PB7   verde PB6
 *      LED 2   rosso PB5   verde PB4
 *      LED 3   rosso PB2   verde PB3
 *      LED 4   rosso PB0   verde PB1
 *
 * Le prime due coppie scendono, le ultime due risalgono: il terzo e il quarto
 * LED sono l'uno sulle linee dell'altro. Verificato sull'hardware guardando la
 * sequenza (9 settembre 2026), non dedotto.
 *
 * Tutto il resto del programma passa da qui: se un filo si sposta, si cambiano
 * solo queste due righe. Il LED n e' il footswitch n, da sinistra. */
static const uint8_t LINEA_ROSSO[4] = {7, 5, 2, 0};
static const uint8_t LINEA_VERDE[4] = {6, 4, 3, 1};

static uint8_t mascheraColore(const uint8_t linee[4]) {
  uint8_t m = 0;
  for (uint8_t n = 0; n < 4; n++) m |= (uint8_t)(1 << linee[n]);
  return m;
}

/* Quanto sta accesa ogni linea, in millisecondi. Non e' un dettaglio: questa
 * sequenza si guarda, e con meno di un paio di secondi non si fa in tempo a
 * leggere lo schermo e poi spostare gli occhi sul LED. Provato: 900 ms erano
 * troppo pochi. I due banchi interi stanno un secondo in piu'. */
static const uint16_t PASSO_MS = 3000;
static inline uint8_t bitRosso(uint8_t led) { return (uint8_t)(1 << LINEA_ROSSO[led]); }
static inline uint8_t bitVerde(uint8_t led) { return (uint8_t)(1 << LINEA_VERDE[led]); }

/** Che LED e che colore stanno su una linea. Serve al disegno, che parla di
 *  linee (PB4) e di LED (il secondo da sinistra) nella stessa schermata. */
static int8_t ledDiLinea(uint8_t b, bool &inVerde) {
  for (uint8_t n = 0; n < 4; n++) {
    if (LINEA_ROSSO[n] == b) { inVerde = false; return (int8_t)n; }
    if (LINEA_VERDE[n] == b) { inVerde = true;  return (int8_t)n; }
  }
  return -1;
}

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

/** Nella prova a mano i quattro LED stanno **accesi** nel colore del banco, e
 *  tenendo premuto un footswitch resta acceso solo il suo. Cosi' ogni tasto
 *  risponde con qualcosa che si vede: prima i tasti banco cambiavano il solo
 *  colore, e il colore si vedeva solo tenendo premuto un footswitch — cioe'
 *  da soli non accendevano niente e sembravano scollegati. E' anche il
 *  comportamento del pedale vero: i quattro LED dicono sempre il banco. */
static void aggiornaUscite(uint8_t ingressi) {
  int8_t solo = -1;
  for (uint8_t i = 0; i < 4; i++) {
    if (!(ingressi & (1 << i))) solo = (int8_t)i;   // pull-up: premuto = zero
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

/* ---------------------------- la sequenza ---------------------------- */

/* Che cosa e' acceso adesso: 0..7 la linea accesa, -1 il banco A, -2 il B. */
static int8_t passo = 0;

/** La schermata della sequenza, con in fondo la barra che si svuota: senza,
 *  il cambio arriva addosso e non si fa in tempo a guardare il LED prima che
 *  cambi. La barra dice **quanto manca**, ed e' l'unica ragione per cui il
 *  disegno si rinfresca durante l'attesa. */
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
 *  premuto, cosi' la sequenza si ferma sotto il dito invece di finire il suo
 *  giro. E' la stessa regola del firmware vero: nessuna attesa cieca. */
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
    /* In ordine di LED, non di linea: cosi' devono accendersi da sinistra a
     * destra, prima rosso e poi verde, e un filo scambiato si vede come un
     * salto nell'ordine invece che come un numero da controllare a mente. */
    for (uint8_t n = 0; n < 4 && !fermato; n++) {
      for (uint8_t c = 0; c < 2 && !fermato; c++) {
        const uint8_t linea = c ? LINEA_VERDE[n] : LINEA_ROSSO[n];
        accendi((uint8_t)(1 << linea));
        Serial.print(F("   LED "));
        Serial.print(n + 1);
        Serial.print(c ? F(" verde   sulla linea PB") : F(" rosso   sulla linea PB"));
        Serial.println(linea);
        passo = (int8_t)linea;
        disegnaPasso(0, PASSO_MS);
        fermato = attendi(PASSO_MS);
      }
    }
    if (!fermato) {
      accendi(mascheraColore(LINEA_ROSSO));
      Serial.println(F("   banco A: tutti e quattro rossi"));
      passo = -1;
      disegnaPasso(0, PASSO_MS + 1000);
      fermato = attendi(PASSO_MS + 1000);
    }
    if (!fermato) {
      accendi(mascheraColore(LINEA_VERDE));
      Serial.println(F("   banco B: tutti e quattro verdi"));
      passo = -2;
      disegnaPasso(0, PASSO_MS + 1000);
      fermato = attendi(PASSO_MS + 1000);
    }
  }

  /* Non si spegne tutto: si entra nella prova a mano gia' col banco acceso,
   * o dopo la sequenza lo schermo direbbe ROSSO con i LED spenti. */
  aggiornaUscite(0xff);
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
    // sotto ogni uscita, che cosa c'e' attaccato davvero: "1R", "3V"...
    bool inVerde = false;
    const int8_t led = ledDiLinea(i, inVerde);
    char c[3] = {(char)('1' + led), (char)(inVerde ? 'V' : 'R'), 0};
    schermo.drawStr(x + 1, 63, c);
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
