/*
 * prova-usb — non fa niente, e serve proprio a quello
 * ====================================================
 *
 * Se la scheda si connette e si sconnette dal PC di continuo, le cause sono
 * due e portano in direzioni opposte: o il firmware va in panico e la scheda
 * si riavvia in ciclo (sul C3 la porta USB la genera il chip stesso, quindi
 * ogni riavvio fa sparire e ricomparire la porta), oppure e' il cavo o
 * l'alimentazione.
 *
 * Questo sketch non accende la radio, non alloca niente e non puo' andare in
 * panico. Quindi:
 *
 *   resta collegato e stampa       -> scheda, cavo e USB stanno bene,
 *                                     il problema e' nel firmware BLE
 *   continua a staccarsi lo stesso -> e' hardware: cavo, porta, alimentazione
 *
 * Il numero che stampa e' il tempo dall'accensione. Se il contatore riparte
 * da zero da solo, la scheda si sta riavviando davvero, e allora la causa e'
 * elettrica: quel numero e' la prova, mentre il rumore di Windows no.
 *
 * Scheda: ESP32C3 Dev Module, con "USB CDC On Boot: Enabled".
 */

void setup() {
  Serial.begin(115200);
  // Con l'USB nativo la porta esiste solo quando il PC la apre: senza questa
  // attesa le prime righe si perdono e sembra che lo sketch non parta.
  unsigned long inizio = millis();
  while (!Serial && millis() - inizio < 4000) delay(10);

  Serial.println();
  Serial.println(F("prova-usb: se questa riga compare una volta sola, si parte bene."));
  Serial.println(F("se ricompare da sola ogni pochi secondi, la scheda si riavvia."));
  Serial.println();
}

void loop() {
  Serial.printf("acceso da %lu s\n", millis() / 1000);
  delay(1000);
}
