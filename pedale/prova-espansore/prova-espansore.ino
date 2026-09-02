/*
 * prova-espansore — il secondo pezzo sul banco
 * ============================================
 *
 * Aggiunge l'MCP23017 al display, sullo stesso bus I2C. Risponde a tre
 * domande, e le mostra sullo schermo cosi' si prova col pedale in mano
 * senza guardare il monitor seriale:
 *
 *   1. i due dispositivi convivono sul bus?
 *   2. l'espansore legge un pulsante?
 *   3. l'espansore accende un LED?
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
 *   pulsante    fra GPA0 e GND      (arcade: COM a GND, NO su GPA0)
 *   LED         fra GPB0 e GND, con la sua resistenza
 *
 * Port A in ingresso coi pull-up interni, port B in uscita: e' la divisione
 * decisa per il pedale, perche' e' il port A che puo' far scattare
 * l'interrupt e l'interrupt serve al piede, non ai LED.
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

static uint8_t indirizzo = 0;      // 0 = non trovato
static uint8_t ingressiPrec = 0xff;
static uint32_t pressioni[8] = {0};
static uint32_t inizioPressione[8] = {0};

/* PB0 batte in continuo, un secondo acceso e uno spento, finche' la scheda
 * e' accesa. Serve a misurare l'uscita col tester **senza premere niente e
 * senza staccare il cavo**: si appoggiano i puntali e si guarda il numero
 * saltare fra 0 e 3,3 V. I pulsantini di reset sulla XIAO sono SMD da 2 mm,
 * e tenere due puntali fermi mentre si preme uno spillo non e' una prova,
 * e' un esercizio di equilibrio. Le altre tre uscite basse — PB1, PB2, PB3 —
 * seguono i primi tre ingressi. */
static bool battito = false;
static uint32_t ultimoBattito = 0;

static bool scrivi(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(indirizzo);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

/** L'unico posto che scrive OLATB: PB0 e' il battito, PB1..PB3 specchiano i
 *  primi tre ingressi. Tenerlo in una funzione sola evita che i due usi si
 *  sovrascrivano a vicenda. */
static void aggiornaUscite(uint8_t ingressi) {
  (void)ingressi;
  /* Finche' non ci sono i LED, il battito muove **tutte e otto** le uscite
   * insieme: cosi' qualunque delle otto mezzelune `PB` si tocchi col tester,
   * sui due lati corti del modulo, legge la stessa cosa e non serve
   * indovinare quale sia PB0. Quando i LED ci saranno, qui torna lo
   * specchio degli ingressi. */
  scrivi(OLATB, battito ? 0xff : 0x00);
}

static bool leggi(uint8_t reg, uint8_t &val) {
  Wire.beginTransmission(indirizzo);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)indirizzo, 1) != 1) return false;
  val = Wire.read();
  return true;
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

/** Otto caselle, una per ingresso: piena = premuto. Sotto, quante volte. */
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

  char testa[24];
  snprintf(testa, sizeof(testa), "MCP23017 a 0x%02X", indirizzo);
  schermo.drawStr(0, 10, testa);

  for (uint8_t i = 0; i < 8; i++) {
    const int x = i * 16;
    // il pull-up tiene alto a riposo: premuto = bit a zero
    const bool premuto = !(ingressi & (1 << i));
    if (premuto) schermo.drawBox(x, 16, 14, 14);
    else schermo.drawFrame(x, 16, 14, 14);
    char n[2] = {(char)('0' + i), 0};
    schermo.drawStr(x + 4, 42, n);
  }

  uint32_t totale = 0;
  for (uint8_t i = 0; i < 8; i++) totale += pressioni[i];
  char piede[24];
  snprintf(piede, sizeof(piede), "pressioni: %lu", (unsigned long)totale);
  schermo.drawStr(0, 60, piede);
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

    /* Prova del solo LED, senza il pulsante di mezzo: se PB0 non lampeggia
     * qui, il guasto e' nel LED o nei suoi due fili e non altrove. */
    Serial.println(F("-- lampeggio di PB0, cinque volte --"));
    schermo.clearBuffer();
    schermo.setFont(u8g2_font_6x12_tf);
    schermo.drawStr(0, 20, "guarda il LED:");
    schermo.drawStr(0, 34, "PB0 lampeggia");
    schermo.drawStr(0, 48, "cinque volte");
    schermo.sendBuffer();
    for (uint8_t k = 0; k < 5; k++) {
      scrivi(OLATB, 0x01);
      Serial.println(F("   PB0 acceso"));
      delay(700);
      scrivi(OLATB, 0x00);
      Serial.println(F("   PB0 spento"));
      delay(700);
    }
    Serial.println(F("premi un pulsante fra GPA0 e GND."));
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

  if (letto) {
    if (ingressi != ingressiPrec) {
      cambiato = true;
      // i LED per primi: sono due byte sul bus e devono seguire il dito
      t0 = micros();
      aggiornaUscite(ingressi);
      const uint32_t dtScrittura = micros() - t0;
      if (dtScrittura > maxScrittura) maxScrittura = dtScrittura;
      for (uint8_t i = 0; i < 8; i++) {
        const bool prima = !(ingressiPrec & (1 << i));
        const bool adesso = !(ingressi & (1 << i));
        if (adesso && !prima) {
          pressioni[i]++;
          inizioPressione[i] = millis();
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
    }
  }

  // il battito di PB0, che non dipende da nessuna pressione
  // dieci secondi per lato: un tester economico aggiorna piano, e deve avere
  // tutto il tempo di fermarsi sul valore invece di inseguirlo
  if (indirizzo != 0 && (millis() - ultimoBattito) > 10000) {
    ultimoBattito = millis();
    battito = !battito;
    aggiornaUscite(ingressiPrec);
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
