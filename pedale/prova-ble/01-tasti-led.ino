// prova-ble, 01-tasti-led.ino — L'espansore: pulsanti sul port A con l'antirimbalzo, e i LED sul port B.
// Un pezzo del firmware: Arduino compila i .ino di questa cartella in fila,
// prova-ble.ino per primo e poi gli altri nell'ordine del nome (vedi la testa
// di prova-ble.ino). Le variabili stanno dove stavano: qui si usa quello che
// e' dichiarato nei file prima.

static bool mcpScrivi(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(mcp);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

static bool mcpLeggi(uint8_t reg, uint8_t &val) {
  Wire.beginTransmission(mcp);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)mcp, 1) != 1) return false;
  val = Wire.read();
  return true;
}

static void avviaEspansore() {
  Wire.begin(D4, D5);
  Wire.setClock(400000);
  for (uint8_t a = 0x20; a <= 0x27; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) { mcp = a; break; }
  }
  if (mcp == 0) {
    Serial.println(F("espansore non trovato: uso il tasto BOOT della scheda"));
    return;
  }
  mcpScrivi(MCP_IODIRA, 0xff);           // port A tutto in ingresso: i pulsanti
  mcpScrivi(MCP_GPPUA, 0xff);            // coi pull-up interni
  mcpScrivi(MCP_IODIRB, 0x00);           // port B tutto in uscita: i LED
  mcpScrivi(MCP_OLATB, 0x00);            // spenti finche' non suona qualcosa
  Serial.printf("espansore a 0x%02X: 7 pulsanti sul port A, 8 LED sul port B\n", mcp);
}

/** Il port A intero, un bit per linea, alto = rilasciato. Si legge al massimo
 *  una volta al millisecondo: sette footswitch non hanno bisogno di piu', e il
 *  bus resta libero per il display. Senza espansore si ripiega sul tasto BOOT,
 *  che fa da footswitch 1, cosi' lo sketch gira anche su una devkit nuda. */
static uint8_t leggiPortA() {
  if (mcp == 0) {
    const bool giu = digitalRead(PIN_TASTO) == LOW;
    return giu ? (uint8_t)~(1 << LINEA_PULSANTE[0]) : 0xff;
  }
  static uint32_t ultimaLettura = 0;
  static uint8_t memoria = 0xff;
  const uint32_t ora = millis();
  if (ora != ultimaLettura) {
    ultimaLettura = ora;
    uint8_t v;
    if (mcpLeggi(MCP_GPIOA, v)) memoria = v;
  }
  return memoria;
}

static const uint32_t ANTIRIMBALZO = 25;   // ms

/* Antirimbalzo «aspetta che stia fermo», non «ignora i cambi ravvicinati».
 * La seconda forma - quella scritta il 14 agosto - fa ripartire il conto a
 * ogni rimbalzo, quindi un contatto sporco puo' tenere la porta chiusa a
 * tempo indeterminato e la pressione si perde. Qui si registra l'ultimo
 * fronte grezzo e si accetta il livello solo quando e' rimasto immobile per
 * ANTIRIMBALZO: i rimbalzi allungano l'attesa di qualche ms, non annullano
 * la pressione. */
static uint8_t  ingressiGrezzi = 0xff;     // l'ultimo livello letto, rimbalzi compresi
static uint8_t  ingressiFermi  = 0xff;     // quello accettato
static uint32_t ultimoFronte   = 0;
static uint8_t  corrente       = 0;        // quale preset del banco sta suonando

/** I LED: **solo quello del suono che sta suonando**, nel colore della meta'
 *  mostrata — rosso la A, verde la B, come i LED del pannello dell'ampli. Se
 *  la meta' mostrata non e' quella che suona, o se il banco e' cambiato dopo,
 *  sono tutti spenti: nessuno di quei quattro tasti e' il suono che senti. */
static void aggiornaLed() {
  if (mcp == 0) return;
  uint8_t maschera = 0;
  /* In MIDI: nella pagina preset il rosso (verde per 5-8, come le due meta'
   * in modalita' Spark) sul footswitch dell'ultimo preset
   * mandato, se e' nel gruppo mostrato; nella pagina stomp il verde su ogni
   * effetto acceso. Colori diversi, cosi' la pagina si riconosce dai piedi. */
  if (modo == MODO_MIDI) {
    for (uint8_t led = 0; led < 4; led++) {
      if (paginaMidi == 0 && programmaMidi == gruppoMidi * 4 + led)
        maschera |= (uint8_t)(1 << (gruppoMidi ? LINEA_VERDE[led] : LINEA_ROSSO[led]));
      if (paginaMidi == 1 && (stompAccesi & (1 << led)))
        maschera |= (uint8_t)(1 << LINEA_VERDE[led]);
    }
    mcpScrivi(MCP_OLATB, maschera);
    return;
  }
  /* Nel looper: rosso su FS1 mentre registra o sovraincide, verde su FS3 mentre
   * il loop suona, verde su FS4 da fermo col loop pronto. */
  if (looper) {
    if (contaTempo) {                      // il conteggio: un LED rosso per tempo
      mcpScrivi(MCP_OLATB, (uint8_t)(1 << LINEA_ROSSO[contaTempo - 1]));
      return;
    }
    // Rosso fisso su FS1 mentre registra o sovraincide: il tempo lo batte il
    // LED suo su D1, e il lampeggio qui l'utente l'ha tolto (7 ottobre).
    if (loopRegistra || loopSovraincide) maschera |= (uint8_t)(1 << LINEA_ROSSO[0]);
    if (loopSuona && !loopRegistra)      maschera |= (uint8_t)(1 << LINEA_VERDE[2]);
    if (loopPresente && !loopSuona && !loopRegistra)    maschera |= (uint8_t)(1 << LINEA_VERDE[3]);
    mcpScrivi(MCP_OLATB, maschera);
    return;
  }
  if (nomeSuona[0] && slotSuona == slotBanco && metaSuona == metaMostrata) {
    const uint8_t led = corrente % 4;
    maschera = (uint8_t)(1 << (metaMostrata ? LINEA_VERDE[led] : LINEA_ROSSO[led]));
  }
  mcpScrivi(MCP_OLATB, maschera);
}

