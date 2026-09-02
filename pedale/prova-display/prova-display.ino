/*
 * prova-display — il primo pezzo sul banco
 * ========================================
 *
 * Quattro fili e basta: nessun pulsante, nessun BLE, nessuna batteria.
 * Risponde a due domande in una volta:
 *
 *   1. il bus I2C funziona, e chi c'e' attaccato?   <- serve anche dopo,
 *      identica, per l'MCP23017
 *   2. il display scrive?
 *
 * Se scrive, quel pezzo e' chiuso e da li' si aggiunge un componente alla
 * volta. Se non scrive, il guasto sta in quattro fili e in nient'altro: e'
 * il motivo per cui si comincia da qui.
 *
 * Scheda: **qualunque XIAO ESP32** — S3, C6 o C3. I piedini si chiamano D4 e
 * D5 su tutte, e il numero di GPIO che ci sta sotto lo mette la variante:
 * 5 e 6 sull'S3, 22 e 23 sul C6. Non c'e' niente da cambiare passando
 * dall'una all'altra, ed e' il motivo per cui il collegamento e' scritto
 * per NOME del piedino e non per numero.
 *
 * Display: OLED 2,42" 128x64, quattro pin (I2C).
 *
 *   display   XIAO
 *   ---------------
 *   GND       GND
 *   VDD       3V3     <- 3,3 V, NON 5
 *   SCL       D5
 *   SDA       D4
 *
 * Sullo stesso bus andra' poi l'espansore MCP23017: indirizzi diversi, non
 * si danno fastidio. E il display in I2C **libera cinque piedini** rispetto
 * alla versione SPI a 7 pin che era stata messa a preventivo.
 *
 * Se lo scanner trova il display ma lo schermo resta nero, il guasto non e'
 * nei fili: e' il CONTROLLORE, e si cambia la riga qui sotto. I moduli in
 * giro sono di tre tarature che si distinguono solo provando.
 */

#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>

// 0 = SSD1309 taratura 0   1 = SSD1309 taratura 2   2 = SSD1306
#define CONTROLLORE 0

/* I nomi D4/D5 li definisce la variante della scheda: cosi' lo stesso
 * sketch gira su S3, C6 e C3 senza toccare un numero. */
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

static uint32_t giro = 0;

/** Chi risponde sul bus. Un display OLED sta di solito a 0x3c o 0x3d,
 *  l'MCP23017 fra 0x20 e 0x27. Zero dispositivi = fili, alimentazione o
 *  pull-up: in quell'ordine. */
static void scansione() {
  Serial.println(F("-- scansione del bus I2C --"));
  uint8_t trovati = 0;
  for (uint8_t ind = 1; ind < 127; ind++) {
    Wire.beginTransmission(ind);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("   risponde 0x"));
      if (ind < 16) Serial.print('0');
      Serial.print(ind, HEX);
      if (ind == 0x3c || ind == 0x3d) Serial.print(F("   <- sembra il display"));
      if (ind >= 0x20 && ind <= 0x27) Serial.print(F("   <- sembra l'espansore"));
      Serial.println();
      trovati++;
    }
  }
  Serial.print(F("-- "));
  Serial.print(trovati);
  Serial.println(F(" dispositivi --"));
  if (trovati == 0) {
    Serial.println(F("   nessuno: controlla in quest'ordine i fili SDA/SCL,"));
    Serial.println(F("   poi VCC e GND, poi i pull-up sul bus."));
  }
}

/** La schermata del pedale come sara' davvero: quattro nomi e la riga di
 *  quello che sta suonando. Dice anche se i caratteri ci stanno. */
static void paginaFinta() {
  schermo.clearBuffer();
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(0, 10, "1 Clean Fender");
  schermo.drawStr(0, 22, "2 Crunch AC30");
  schermo.drawStr(0, 34, "3 Lead Marshall");
  schermo.drawStr(0, 46, "4 Ambient Delay");
  schermo.drawHLine(0, 50, 128);
  char riga[24];
  snprintf(riga, sizeof(riga), "> A1   giro %lu", (unsigned long)giro);
  schermo.drawStr(0, 62, riga);
  schermo.sendBuffer();
}

/** La cornice: dice se il pannello e' davvero 128x64 e se e' centrato. */
static void cornice() {
  schermo.clearBuffer();
  schermo.drawFrame(0, 0, 128, 64);
  schermo.drawLine(0, 0, 127, 63);
  schermo.drawLine(127, 0, 0, 63);
  schermo.setFont(u8g2_font_6x12_tf);
  schermo.drawStr(34, 36, "128 x 64");
  schermo.sendBuffer();
}

/** Tutti i pixel accesi: dice se ci sono zone morte, e si vede da lontano
 *  anche se i caratteri fossero illeggibili. */
static void tuttoAcceso() {
  schermo.clearBuffer();
  schermo.drawBox(0, 0, 128, 64);
  schermo.sendBuffer();
}

void setup() {
  Serial.begin(115200);
  /* Senza questa riga, se al PC nessuno sta leggendo la porta ogni
   * Serial.print resta appesa fino a un timeout e il firmware striscia.
   * Vedi CLAUDE.md, «Trappole dell'ambiente». */
  Serial.setTxTimeoutMs(0);
  delay(400);
  Serial.println();
  Serial.println(F("=== prova-display: bus I2C e display ==="));
  Serial.print(F("scheda: "));
  Serial.print(ARDUINO_BOARD);
  Serial.print(F("   SDA=GPIO"));
  Serial.print(PIN_SDA);
  Serial.print(F("  SCL=GPIO"));
  Serial.println(PIN_SCL);
  Serial.print(F("controllore scelto: "));
  Serial.println(CONTROLLORE);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);
  scansione();

  const bool acceso = schermo.begin();
  Serial.print(F("begin() del display: "));
  Serial.println(acceso ? F("ok") : F("FALLITO"));
  schermo.setContrast(255);
}

void loop() {
  paginaFinta();
  Serial.print(F("["));
  Serial.print(giro);
  Serial.println(F("] pagina finta"));
  delay(3000);

  cornice();
  Serial.println(F("     cornice"));
  delay(3000);

  tuttoAcceso();
  Serial.println(F("     tutto acceso"));
  delay(3000);

  giro++;
}
