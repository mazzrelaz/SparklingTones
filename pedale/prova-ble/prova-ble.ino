/*
 * prova-ble — il primo passo del pedale, senza saldare niente
 * =============================================================
 *
 * Serve solo la schedina e il cavo USB. Nessun pulsante, nessun LED, nessun
 * display: si comanda tutto dal monitor seriale. Risponde alle tre domande che
 * decidono se il progetto esiste, e nessuna di quelle domande ha bisogno di un
 * pin collegato.
 *
 *   1. l'ESP32 vede lo Spark e ci si collega?
 *   2. gli cambia preset?  (0x0138, dieci byte)
 *   3. quanto ci mette un giro di andata e ritorno?  <- la misura che conta
 *
 * Sulla 3: un preset intero sono sedici chunk che aspettano l'ack uno per uno.
 * Se il secondo che ci mette il telefono e' l'intervallo di connessione e non
 * la banda, allora chiedendo 7,5 ms invece dei ~30 di sistema il pedale
 * diventa quattro volte piu' svelto. Il browser non puo' chiederlo, noi si.
 * Il comando 'v' fa la richiesta, 'm' misura. Si confrontano i due numeri.
 *
 * Libreria: nessuna da installare. Usa BLEDevice.h, che arriva col pacchetto
 * schede esp32. Dal core 3.x quella libreria e' NimBLE sotto il cofano (i tipi
 * sono ble_gap_conn_params, non i Bluedroid esp_ble_*), quindi il timore sulla
 * RAM del C3 non si pone: ci siamo gia'.
 *
 * Scheda: ESP32C3 Dev Module. Se il monitor seriale resta muto, accendi
 * "USB CDC On Boot" nel menu Strumenti: sul C3 la seriale passa dall'USB
 * nativo e senza quella spunta non esce niente.
 *
 * Comandi dal monitor seriale (invio a fine riga):
 *   0..7   cambia preset sullo slot (A1..A4 = 0..3, B1..B4 = 4..7)
 *   m      misura: dieci cambi preset di fila, riporta il giro medio
 *   v      chiede un intervallo di connessione da 7,5 ms
 *   s      chiede l'intervallo lento (30 ms), per il confronto
 *   r      ricollega
 *   ?      questo elenco
 */

/*
 * IL FIRMWARE STA IN PIU' FILE (diviso il 7 ottobre 2026, senza cambiare una riga
 * di codice): Arduino li mette in fila, questo per primo e gli altri nell'ordine
 * del nome, e li compila come un file solo. Qui restano gli #include e le
 * variabili di tutto il pedale; poi, nell'ordine:
 *
 *   01-tasti-led.ino    L'espansore: pulsanti sul port A con l'antirimbalzo, e i LED sul port B.
 *   02-display.ino      Il display: schermata di avvio, batteria, modalita' MIDI, l'anello del looper, la schermata normale.
 *   03-protocollo.ino   I messaggi dello Spark: le risposte e le notifiche in arrivo, il riassemblatore, la costruzione dei messaggi.
 *   04-connessione.ino  Scansione e aggancio dell'ampli, intervallo di connessione.
 *   05-preset.ino       I preset: lettura dei nomi dall'ampli, invio sullo Spark 2 e sul NEO, il banco ricordato.
 *   06-banchi-midi.ino  Meta', banchi, la richiesta di un preset, la modalita' MIDI.
 *   07-looper.ino       Il looper: gli stati, i footswitch, il tap, le battute, l'ingresso e l'uscita.
 *   08-tasti.ino        La modalita' (Spark/MIDI), la scelta dell'ampli, la lettura dei tasti.
 *   09-seriale.ino      Dal seriale: la misura del giro e l'elenco dei comandi.
 *   10-ponte.ino        Il ponte BLE verso l'app: server GATT, banchi da fuori, annuncio.
 *   11-avvio.ino        Il LED del tempo (un compito suo), setup() e loop().
 *
 * Una funzione si puo' chiamare da qualunque file (Arduino ne scrive i
 * prototipi), ma una variabile si usa solo nei file che vengono dopo quello
 * che la dichiara. Un file nuovo si numera dove deve stare.
 */

#include <Wire.h>
#include <U8g2lib.h>
#include <BLEDevice.h>
#include "banchi.h"
#include "logo.h"
#include "USB.h"
#include "USBMIDI.h"

/* La modalita' MIDI vuole l'USB-OTG (TinyUSB): con l'altra impostazione la
 * porta USB e' quella seriale del chip e il PC non vede nessuna pedaliera.
 * Meglio non compilare che caricare un pedale muto. */
#if ARDUINO_USB_MODE
#error "compilare con USBMode=default (USB-OTG TinyUSB): vedi CLAUDE.md"
#endif

/* La versione del firmware, sulla schermata di avvio: si alza a ogni
 * caricamento che cambia qualcosa di visibile sul pedale. */
static const char* VERSIONE = "2.15";   // 1.3: Spark 2 e NEO; 1.4: NEO a pezzi grandi; 1.5: batteria; 1.6: looper; 1.7: looper come il pannello; 1.8: lo stato lo segna anche il pedale; 1.9: annulla durante la sovraincisione; 2.0: conteggio; 2.1: tap, cerchio, lampo; 2.2: cerchio come l'app; 2.3: battute dai tasti banco, a blocchi; 2.4: il cerchio si riempie in ogni stato; 2.5: anello e giro col nostro orologio; 2.6: la sovraincisione non riavvolge; 2.7: battute e tempo solo a loop vuoto davvero; 2.8: niente aggiornamento parziale; 2.9: precarica del display; 2.10: tolta, il display era piu' scuro; 2.11: LED del tempo su D1; 2.12: il LED in un compito suo; 2.13: FS1 fisso mentre registra; 2.14: click del conteggio su D3; 2.15: piezo da 35 mm a 2,8 kHz

/* Quale ampli cerca il pedale, scelto dall'utente coi tasti banco (4 ottobre
 * 2026): sinistro lo Spark 2, destro lo Spark NEO. Si ricorda allo spegnimento.
 * Lo Spark 2 ha 8 preset salvati, il NEO 4, che l'app ufficiale chiama CH1-CH4. */
static const uint8_t AMPLI_SPARK2 = 0, AMPLI_NEO = 1;
static volatile uint8_t ampliScelto = AMPLI_SPARK2;
static uint8_t slotDellAmpli() { return ampliScelto == AMPLI_NEO ? 4 : 8; }

/* L'«Amp Preset»: i preset salvati nell'ampli, **letti dall'ampli** a ogni
 * collegamento (deciso dall'utente il 4 ottobre 2026: prima era una copia
 * fissa scritta nel firmware, che col NEO mostrava i preset dello Spark 2).
 * Si suonano **selezionando lo slot** con 0x0138: istantaneo, e non scrive
 * niente sull'ampli. Gli altri banchi restano sul buffer 0x7f come sempre. */
static char nomiAmpli[8][32] = {};

/* Il banco che il pedale sta suonando: uno ricevuto dall'app, oppure, se non
 * e' valido, quello dell'ampli. */
static BancoCaricato bancoAttivo = {};

static uint8_t     quantiPosti()            { return bancoAttivo.valido ? POSTI_PER_BANCO : slotDellAmpli(); }
static bool        postoPieno(uint8_t n)    { return bancoAttivo.valido ? bancoAttivo.posti[n].presente : n < slotDellAmpli(); }
static const char* nomePosto(uint8_t n)     { return bancoAttivo.valido ? bancoAttivo.posti[n].nome
                                                     : (nomiAmpli[n][0] ? nomiAmpli[n] : "..."); }
static uint8_t     chunkDelPosto(uint8_t n) { return bancoAttivo.valido ? bancoAttivo.posti[n].quanti : 0; }

/** Il prossimo posto **pieno**: coi banchi veri i posti vuoti ci sono, e
 *  fermarcisi sopra fa sembrare il pedale morto. */
static uint8_t prossimoPieno(uint8_t da) {
  const uint8_t quanti = quantiPosti();
  for (uint8_t k = 1; k <= quanti; k++) {
    const uint8_t c = (uint8_t)((da + k) % quanti);
    if (postoPieno(c)) return c;
  }
  return da;                               // banco tutto vuoto
}

static bool bancoHaQualcosa() {
  for (uint8_t i = 0; i < quantiPosti(); i++) if (postoPieno(i)) return true;
  return false;
}

static const uint8_t* frameDelPosto(uint8_t n, uint8_t c, uint8_t& lunghezza) {
  if (bancoAttivo.valido) {
    lunghezza = bancoAttivo.posti[n].lung[c];
    return bancoAttivo.dati + bancoAttivo.posti[n].inizio[c];
  }
  lunghezza = 0;                           // il banco dell'ampli non ha frame
  return nullptr;
}

/* --- GATT dello Spark: service 0xFFC0, write 0xFFC1, notify 0xFFC2 ------ */
static BLEUUID UUID_SERVIZIO((uint16_t)0xFFC0);
static BLEUUID UUID_SCRITTURA((uint16_t)0xFFC1);
static BLEUUID UUID_NOTIFICHE((uint16_t)0xFFC2);

static BLEAdvertisedDevice* trovato    = nullptr;
static BLEClient*           client     = nullptr;
static BLERemoteCharacteristic* chScrittura = nullptr;
static BLERemoteCharacteristic* chNotifiche = nullptr;
static char     escluso[20] = "";       // un ampli dell'altro tipo, da non riprendere
static uint32_t esclusoFino = 0;

/* Un pedale non si arrende. Se si accende prima dell'ampli, o se la
 * connessione cade a meta' concerto, deve riprovare da solo: senza questo
 * il pedale resta muto finche' qualcuno non lo riavvia, che sul palco non
 * succede. Riprova ogni cinque secondi, in silenzio. */
static uint32_t ultimoTentativo = 0;

/* Ma quando l'app si collega il pedale deve mollare l'ampli, e restare
 * mollato finche' l'app c'e'. Anche 'x' dal seriale mette qui. */
static bool     sganciato      = false;
static uint32_t momentoSgancio = 0;   // quando l'app ha mollato: da li' si riprova fitto
static uint32_t momentoConnesso = 0;  // per ripetere la richiesta dell'intervallo
static uint8_t  ripetizioniIntervallo = 0;

static uint8_t  seq       = 0x01;   // resta fra 0x01 e 0x3e
static uint32_t rxTotali  = 0;      // quanti messaggi interi sono arrivati
static uint32_t ultimoRx  = 0;      // millis dell'ultimo messaggio: serve a misurare

/* ======================================================================
   Riassemblatore: le notifiche arrivano a pezzi, un messaggio sta fra
   f0 e f7. Un f0 ricomincia sempre da capo — f0 e f7 non possono comparire
   dentro un messaggio, perche' i byte dati sono impacchettati a 7 bit e
   stanno tutti sotto 0x80.
   ====================================================================== */

static uint8_t  buffer[512];
static size_t   dentro = 0;

/* --- il footswitch di ripiego: il tasto BOOT della scheda -----------------
 *
 * Serve solo quando non c'e' l'espansore, cioe' su una devkit nuda. Il suo
 * numero cambia da un chip all'altro — GPIO9 sul C3, GPIO0 sull'S3 e sul C6 —
 * e **non e' un dettaglio estetico**: sull'S3 il 9 e' D10/MOSI, che senza
 * niente attaccato resta flottante e produce pressioni fantasma, cioe' cambi
 * preset a caso. Sul C3 e' anche un pin di strapping: tenuto premuto
 * all'accensione la scheda parte in modalita' programmazione.
 */
#if CONFIG_IDF_TARGET_ESP32C3
static const uint8_t PIN_TASTO = 9;
#else
static const uint8_t PIN_TASTO = 0;
#endif

/* --- il footswitch vero, letto dall'MCP23017 --------------------------
 *
 * Se sul bus I2C c'e' l'espansore, il tasto e' quello **vero** collegato a
 * GPA0; se non c'e', si ripiega sul tasto BOOT della scheda, cosi' lo
 * sketch gira anche su una devkit nuda.
 *
 * La logica dell'antirimbalzo non cambia di una riga: cambia solo da dove
 * arriva il livello. E il livello ha lo stesso verso in tutti e due i casi
 * — **alto = rilasciato** — perche' sia il pin BOOT sia il port A hanno il
 * pull-up e il pulsante tira a massa.
 */
/* --- il display -------------------------------------------------------
 *
 * Sta sullo stesso bus dell'espansore, a 0x3c. Due regole che vengono da
 * quello che si e' misurato sul banco:
 *
 *  - **un fotogramma intero costa 32 ms** contro i 0,18 ms di una lettura
 *    del port A. Quindi il display si ridisegna **solo quando qualcosa e'
 *    cambiato**, mai a ogni giro, o il tasto verrebbe letto solo negli
 *    intervalli fra un disegno e l'altro;
 *  - **mai durante un trasferimento**: quei 32 ms sul bus I2C non toccano il
 *    BLE, ma sono 32 ms in cui il loop non guarda il tasto, e la regola del
 *    pedale e' che una pressione non si perde mai.
 *
 * E il disegno e' **scuro con scritte chiare, senza zone piene**: su un OLED
 * un pixel nero e' spento e non consuma. Vedi docs/pedale.md.
 */
U8G2_SSD1309_128X64_NONAME0_F_HW_I2C schermo(U8G2_R0, U8X8_PIN_NONE, D5, D4);
static bool schermoPresente = false;
static bool schermoSporco   = true;    // c'e' qualcosa da ridisegnare

static const uint8_t MCP_IODIRA = 0x00;
static const uint8_t MCP_IODIRB = 0x01;
static const uint8_t MCP_GPPUA = 0x0c;
static const uint8_t MCP_GPIOA = 0x12;
static const uint8_t MCP_OLATB = 0x15;
static uint8_t mcp = 0;                  // 0 = nessun espansore sul bus

/* --- La mappa di pulsanti e LED ------------------------------------------
 *
 * **Copiata da `prova-espansore` e non ricostruita a mente**: e' cambiata
 * quattro volte, perche' il cablaggio e' stato rifatto altrettante. Questa e'
 * quella trovata con la mappatura guidata il 18 settembre 2026, sulla basetta
 * coi connettori JST. Se un cavo si sposta, si rifa' la mappatura (due
 * pulsanti insieme per un secondo e mezzo) e si riportano qui i tre elenchi.
 *
 * Pulsanti: footswitch 1..5 da sinistra, poi tasto banco sinistro e destro.
 * LED: per ognuno dei quattro, la linea del rosso e quella del verde. */
static const uint8_t N_PULSANTI = 7;
static const uint8_t FS5 = 4, BANCO_SX = 5, BANCO_DX = 6;
static const uint8_t LINEA_PULSANTE[N_PULSANTI] = {4, 5, 6, 3, 7, 1, 0};
static const uint8_t LINEA_ROSSO[4] = {5, 7, 1, 3};
static const uint8_t LINEA_VERDE[4] = {4, 6, 0, 2};

/* --- Le due meta' e il banco ---------------------------------------------
 *
 * Il banco e' da otto, in due meta' da quattro: i quattro footswitch sono la
 * meta' **mostrata**, il quinto cambia meta' **senza toccare il suono**. Da
 * qui segue tutto il comportamento dei LED: se la meta' mostrata non e' quella
 * che sta suonando, nessuno di quei quattro tasti e' il suono che senti, e
 * quindi **nessun LED e' acceso**. Quello che suona davvero lo dice l'OLED.
 *
 * `slotSuona` serve al caso meno ovvio: cambiato banco, il suono continua ma
 * non appartiene piu' a quello che i tasti mostrano, quindi i LED si spengono
 * come per la meta' sbagliata. */
static const uint32_t PONTE_APERTO_MS = 120000;
static uint32_t pontefino = 0;                 // millis fino a cui il ponte e' aperto
static BLEServer* serverPonte = nullptr;
static volatile uint16_t connApp = 0;
static bool cacciaApp = false;                 // e' entrato qualcuno a ponte chiuso

static bool ponteAperto() { return pontefino != 0; }

/* Un messaggio che campeggia per due secondi al posto del nome del banco.
 * Serve ai casi in cui **un tasto non fa niente e deve dire perche'**: coi
 * tasti banco e un solo banco in memoria la spiegazione finiva sulla
 * seriale, che sul palco non c'e', e da fuori il tasto sembrava rotto. */
static char    avvisoTesto[26] = "";
static uint32_t avvisoFino = 0;

/* --- Le due modalita' --------------------------------------------------------
 *
 * **Spark**: quello di sempre. **MIDI**: il pedale si presenta al computer come
 * pedaliera USB-MIDI (nessun driver) e lascia stare lo Spark. Decise
 * dall'utente il 29 agosto e il 24 settembre 2026:
 *  - si passa dall'una all'altra tenendo **FS1 e FS4 insieme** per un secondo e
 *    mezzo: i due piu' lontani, che un piede non prende per sbaglio;
 *  - in MIDI ci sono due pagine, e **il quinto footswitch passa dall'una
 *    all'altra**: *preset* (otto Program Change: 1-4 col tasto banco sinistro,
 *    5-8 col destro) e *stomp* (quattro Control Change acceso/spento);
 *  - la modalita' **si ricorda allo spegnimento**, come il banco.
 *
 * La mappa e' fissa nel firmware (canale 1, preset = Program Change, stomp =
 * CC 80-83 a 127/0): i programmi sul PC hanno il MIDI learn, quindi basta che
 * i comandi siano diversi fra loro. Farla scrivere dall'app e' il passo dopo. */
static const uint8_t MODO_SPARK = 0, MODO_MIDI = 1;
static uint8_t modo = MODO_SPARK;
static USBMIDI midi("SparkPedale MIDI");
static const uint8_t MIDI_CANALE = 1;
static const uint8_t MIDI_CC_STOMP = 80;       // 80..83: liberi nello standard
static uint8_t paginaMidi  = 0;                // 0 = preset, 1 = stomp
static uint8_t gruppoMidi  = 0;                // i quattro preset mostrati: gruppo*4 .. +3
static int16_t programmaMidi = -1;             // l'ultimo Program Change mandato
static uint8_t stompAccesi = 0;                // un bit per footswitch
static bool    usbMontato  = false;

/* --- Il looper dello Spark 2 -------------------------------------------------
 *
 * Chiesto dall'utente il 5 ottobre 2026, dentro la modalita' Spark: **FS5 tenuto
 * tre secondi** entra ed esce. Rifatto lo stesso giorno dopo la prima prova, sul
 * modello del pannello e dell'app ufficiale: **FS1 e' REC/DUB** (registra; se
 * registra chiude e suona; col loop pronto sovraincide; se sovraincide chiude),
 * FS2 annulla/ripeti, FS3 suona, FS4 ferma, **FS4 tenuto due secondi cancella
 * il loop**. Il NEO il looper non ce l'ha. Non si ricorda allo spegnimento.
 *
 * **Fermare non e' solo 0x09.** Durante una sovraincisione l'app ufficiale manda
 * prima 0x0c e poi 0x09 (cattura del 14 agosto); col solo 0x09 l'ampli resta a
 * sovraincidere col loop fermo e **la chitarra dal vivo sparisce** (prova
 * dell'utente, 5 ottobre). Quindi FS4 chiude prima quello che sta registrando.
 *
 * Il comando e' 0x0175 con un byte, **senza 0x00 in coda** (docs/looper.md).
 * Lo stato lo racconta l'ampli con 0x0375, anche quando si preme un tasto sul
 * suo pannello, e alla domanda 0x0275; ma non tutto (0x0b e 0x09 mandati da
 * noi no), quindi ogni comando che parte lo segniamo anche noi (looperEvento). Il conteggio col click
 * non si comanda (docs/looper.md): 0x04 registra subito. 0x0d/0x0e (annulla,
 * ripeti) vengono da Ignitron: verificati il 7 ottobre, a sovraincisione chiusa. */
static bool looper = false;
static const uint8_t LOOP_CONTA = 0x02, LOOP_REC = 0x04, LOOP_FINE_REC = 0x05,
                     LOOP_REC_FATTA = 0x07, LOOP_SUONA = 0x08, LOOP_FERMA = 0x09,
                     LOOP_CANCELLA = 0x0a, LOOP_DUB = 0x0b, LOOP_FINE_DUB = 0x0c,
                     LOOP_ANNULLA = 0x0d, LOOP_RIPETI = 0x0e, LOOP_VUOTO = 0x00;
static bool loopRegistra = false, loopSovraincide = false, loopSuona = false, loopPresente = false;
static bool loopRipetibile = false;            // dopo un «annulla»: il prossimo e' «ripeti»
/* I comandi da mandare, anche due di fila (0x0c poi 0x09): li manda il loop,
 * uno ogni LOOP_PAUSA_MS, cosi' l'ampli finisce il primo prima del secondo. */
static uint8_t  looperSequenza[3];
static uint8_t  looperQuanti = 0, looperFatti = 0;
static uint32_t looperProssimo = 0;
static const uint32_t LOOP_PAUSA_MS = 300;   // dopo 0x05 l'ampli manda 0x07 0x08 entro ~150 ms
static void looperAccoda(uint8_t a, uint8_t b = 0xff) {
  looperQuanti = looperFatti = 0;              // vince l'ultima pressione
  looperSequenza[looperQuanti++] = a;
  if (b != 0xff) looperSequenza[looperQuanti++] = b;
}
static bool    looperChiedi = false;           // chiedere lo stato (0x0275) appena si puo'
static uint8_t metaPrimaDiFS5 = 0;             // FS5 cambia meta' alla pressione: tenuto, si rimette
/* Gli 0x0375 arrivano nel callback delle notifiche, a volte due attaccati
 * (0x0b e 0x08 nella sovraincisione): una coda piccola, e li sbriga il loop. */
static volatile uint8_t eventiLooper[8];
static volatile uint8_t eventiScritti = 0, eventiLetti = 0;

/* --- Il conteggio fatto in casa (7 ottobre 2026) ------------------------------
 *
 * Il click dell'ampli da noi non parte (0x02 ignorato, docs/looper.md), quindi
 * conta il pedale, come fa Ignitron: FS1 a loop vuoto **col click acceso**
 * accende i quattro LED uno per tempo al bpm dell'ampli, e un attimo prima
 * dell'«uno» manda 0x04. Bpm e click vengono dalle impostazioni del looper,
 * 0x0376: risposta a 0x0276, e arrivano da sole quando si batte il TAP.
 * Formato misurato il 13 agosto: `cc 85 04 04 c2 c3 c2 3c` = bpm 133, count,
 * battute, freeIndicator falso, click vero, un flag, la durata. Col click
 * spento (lunghezza libera) si registra subito, come prima. */
static volatile uint16_t loopBpm   = 0;          // 0 = impostazioni non ancora lette
static volatile bool     loopClick = false;
static volatile bool     impostazioniNuove = false;
static uint8_t  contaTempo = 0;                  // 0 = non conta; 1..4 il tempo di adesso
static uint32_t contaDa    = 0;
static const uint32_t LOOP_ANTICIPO_MS = 40;     // 0x04 -> registrazione: ~35 ms (registro del 5 ottobre)
static volatile uint8_t loopBattute = 4;         // quante battute registra l'ampli col click
/* L'ultimo 0x0376 com'e' arrivato: il tap tempo lo rimanda cambiando il solo
 * bpm, mai da una costante (l'ultimo campo cambia forma, docs/protocollo). */
static uint8_t          impostazioni[24];
static volatile uint8_t lungImpostazioni = 0;

/* Il tap tempo su FS5 (chiesto il 7 ottobre 2026): a loop vuoto, la media
 * degli ultimi tre intervalli; oltre due secondi di pausa si ricomincia. */
/* Il LED del tempo (7 ottobre 2026): un RGB a catodo comune col solo rosso,
 * resistenza da 330 ohm, su D1. Lo accende il loop. */
static const uint8_t  PIN_LED_TEMPO  = D1;
static const uint32_t LAMPO_TEMPO_MS = 70;      // un lampo corto a ogni tempo, tutti uguali
static uint32_t tempoDa = 0;                    // a loop vuoto i tempi si contano da qui

/* Il click del conteggio (9 ottobre 2026): un **disco piezo da 35 mm** su D3,
 * con 330 ohm in serie. Il KY-006 di prima era magnetico (15,1 ohm), e coi
 * ~10 mA del piedino si sentiva appena. Onda quadra dal LEDC, **alla risonanza
 * del disco** (2,8 kHz per un 35 mm: li' e' piu' forte), quindi l'«uno» si
 * distingue dalla durata e non dal tono. Suona **solo nei quattro tempi del
 * conteggio**, a loop vuoto, mai sopra l'ampli. */
static const uint8_t  PIN_CLIC      = D3;
static const uint32_t CLIC_HZ       = 2800;
static const uint32_t CLIC_UNO_MS   = 90;
static const uint32_t CLIC_ALTRI_MS = 45;

static uint32_t tapUltimo = 0;
static uint32_t tapIntervalli[3];
static uint8_t  tapQuanti = 0;
/* Bpm, battute e «libero» cambiati dal pedale: li manda il loop con 0x0176. */
static bool impostazioniDaMandare = false;

/* Le battute del loop, scelte coi tasti banco a loop vuoto (chieste il 7
 * ottobre 2026): le stesse dell'app ufficiale, e in fondo «libero». */
static const uint8_t BATTUTE[] = { 1, 2, 4, 8, 12, 16 };
static const uint8_t N_BATTUTE = sizeof(BATTUTE);

/* Il cerchio sul display, come il Simple Looper dell'app ufficiale (video
 * dell'utente, 7 ottobre 2026): un anello con **uno spicchio per battuta**
 * (1, 2, 4, 8, 12, 16, dal 0x0376) che **si riempie a blocchi, un tempo alla
 * volta**, dalla posizione nel loop, in ogni stato; al centro l'icona dello
 * stato, o il numero alla rovescia del conteggio (disegnaCerchio). La posizione mentre suona la
 * da' l'ampli con 0x0377 (float, cinque al secondo, da 0 a 1: verificato il 7
 * ottobre, si stampa il massimo di ogni giro), e fra un valore e l'altro
 * la facciamo avanzare noi con la durata del giro misurata. Lo schermo si
 * ridisegna a ogni blocco nuovo (vedi il loop). */
static volatile bool     loopLibero = false;     // freeIndicator: lunghezza libera, «libero» nell'app
static volatile float    posLoop    = -1;        // da 0x0377; -1 = non arrivata
static volatile uint32_t posLoopDa  = 0;
static volatile float    massimoGiro = 0;        // dove arrivava prima di ricominciare
static volatile uint32_t inizioGiro = 0;         // millis dell'inizio del giro che sta suonando
static volatile bool     giroFinito = false;
static uint32_t          registraDa = 0;
static uint32_t          durataLoop = 0;         // misurata: dal 0x04 al 0x05/0x07

/* Lo stesso MIDI anche via Bluetooth, per l'iPad (BIAS FX), chiesto il 24
 * settembre 2026. Su Windows il BLE-MIDI non arriva ai programmi (prova del 29
 * agosto), quindi l'USB resta la via del PC e il Bluetooth si aggiunge, non
 * sostituisce: ogni comando parte da tutte e due. Servizio e caratteristica
 * sono quelli dello standard BLE-MIDI, che iOS riconosce da solo. */
#define UUID_MIDI      "03b80e5a-ede8-4b33-a751-6ce34ec4c700"
#define UUID_MIDI_DATI "7772e5db-3868-4112-a1a9-f2669d106bf3"
static BLECharacteristic* chMidi = nullptr;
static volatile bool midiCentrale = false;     // un iPad (o altro) collegato per il MIDI
static volatile bool midiUscito   = false;     // bandiera per il loop: riannunciarsi

static const char* VIA_MODO = "/modo.txt";

static void ricordaModo() {
  File f = LittleFS.open(VIA_MODO, "w");
  if (!f) { Serial.println(F("non riesco a ricordare la modalita'")); return; }
  f.write(modo);
  f.close();
}

static uint8_t modoRicordato() {
  if (!LittleFS.exists(VIA_MODO)) return MODO_SPARK;
  File f = LittleFS.open(VIA_MODO, "r");
  if (!f) return MODO_SPARK;
  const int v = f.read();
  f.close();
  return v == MODO_MIDI ? MODO_MIDI : MODO_SPARK;
}

static const char* VIA_AMPLI = "/ampli.txt";

static void ricordaAmpli() {
  File f = LittleFS.open(VIA_AMPLI, "w");
  if (!f) { Serial.println(F("non riesco a ricordare l'ampli")); return; }
  f.write(ampliScelto);
  f.close();
}

static uint8_t ampliRicordato() {
  if (!LittleFS.exists(VIA_AMPLI)) return AMPLI_SPARK2;
  File f = LittleFS.open(VIA_AMPLI, "r");
  if (!f) return AMPLI_SPARK2;
  const int v = f.read();
  f.close();
  return v == AMPLI_NEO ? AMPLI_NEO : AMPLI_SPARK2;
}

/* All'accensione, finita la schermata di avvio, il display chiede per tre
 * secondi quale ampli: in quel tempo il pedale cerca ma non si aggancia, cosi'
 * c'e' modo di cambiare idea. Un tasto banco sceglie e chiude subito la scelta;
 * senza tocchi parte con l'ultimo. Anche dopo, finche' l'ampli non c'e', i
 * tasti banco scelgono quale cercare. */
static const uint32_t SCELTA_MS = 3000;
static uint32_t sceltaFino = 0;
static bool inScelta() { return sceltaFino && (int32_t)(sceltaFino - millis()) > 0; }

static uint8_t metaMostrata = 0;         // 0 = A (posti 1-4), 1 = B (5-8)
static uint8_t metaSuona    = 0;
static char    nomeSuona[40] = "";       // vuoto = non e' ancora partito niente
static int8_t  slotBanco    = -1;        // slot di memoria caricato, -1 = quello del firmware
static int8_t  slotSuona    = -2;        // da quale banco viene il suono che si sente

