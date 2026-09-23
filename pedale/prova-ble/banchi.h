/*
 * banchi.h — il formato del banco e la sua memoria
 * =================================================
 *
 * Il contratto fra app e pedale. L'app manda un blocco che descrive un banco
 * intero; il pedale lo verifica, lo scrive in LittleFS e lo suona. **Dentro
 * ci sono i frame gia' serializzati**: il firmware non serializza niente e non
 * conosce il formato dei preset dello Spark — corregge il sequence number
 * all'indice 2 e scrive.
 *
 * Formato del blocco (little endian dove serve):
 *
 *   "SPB1"                        4 byte, riconoscimento e versione
 *   slot                          1     0..7, dove va messo
 *   len + nome del banco          1 + n
 *   quanti posti                  1     sempre 8
 *   per ogni posto:
 *     presente                    1     0 = vuoto, e finisce li'
 *     len + uuid                  1 + n
 *     len + nome del preset       1 + n
 *     quanti chunk                1
 *     per ogni chunk: len + byte  1 + n
 *
 * Il blocco non porta un checksum suo: ce l'ha il trasferimento (vedi il
 * comando FINE nel .ino). Qui si verifica solo che la struttura torni, cioe'
 * che si arrivi in fondo senza sforare — che e' l'errore vero da temere
 * quando si legge roba che arriva da fuori.
 */
#pragma once

#include <LittleFS.h>

static const uint8_t BANCHI_MAX      = 8;
static const uint8_t POSTI_PER_BANCO = 8;
static const uint8_t CHUNK_MAX       = 24;   // il piu' lungo misurato e' 18
static const size_t  BLOCCO_MAX      = 16384;

struct PostoBanco {
  bool     presente;
  char     nome[40];
  uint8_t  quanti;                 // quanti chunk
  uint16_t inizio[CHUNK_MAX];      // offset dentro `dati`
  uint8_t  lung[CHUNK_MAX];
};

struct BancoCaricato {
  bool       valido;
  char       nome[40];
  PostoBanco posti[POSTI_PER_BANCO];
  uint8_t*   dati;                 // il blocco intero, in heap
  size_t     quanti;
};

/* ---------------------------------------------------------------- */

static void bancoLibera(BancoCaricato& b) {
  if (b.dati) free(b.dati);
  b.dati = nullptr;
  b.valido = false;
  b.quanti = 0;
}

/** Un frame del banco e' accettabile solo se e' **un preset verso il buffer
 *  software**, e niente altro.
 *
 *  Il firmware spedisce all'ampli i frame come arrivano, cambiando solo il
 *  seq: senza questo controllo «il pedale non tocca mai gli slot dell'ampli»
 *  varrebbe soltanto finche' i frame li fa la nostra app. Un banco scritto da
 *  qualcun altro potrebbe sovrascrivere un preset salvato sull'ampli, o
 *  mandare un comando che lo pianta.
 *
 *  Si controlla quello che si vede senza spacchettare niente: l'involucro
 *  (`f0 01 … f7`), il comando (`0x0101` e nient'altro) e, nel primo chunk,
 *  la destinazione — banco `0x00`, posto `0x7f`, cioe' il buffer software.
 *  Quei byte stanno in chiaro nel frame perche' sono tutti sotto 0x80, e i
 *  bit di maschera che li riguardano devono essere a zero. */
static bool frameAccettabile(const uint8_t* f, uint8_t n, bool primo) {
  if (n < 8) return false;
  if (f[0] != 0xf0 || f[1] != 0x01 || f[n - 1] != 0xf7) return false;
  if (f[4] != 0x01 || f[5] != 0x01) return false;        // solo 0x0101
  if (!primo) return true;
  if (n < 12) return false;
  if ((f[6] & 0x1f) != 0) return false;                  // maschera 7/8: byte espliciti
  if (f[8] != 0x00) return false;                        // e' davvero il chunk 0
  return f[10] == 0x00 && f[11] == 0x7f;                 // banco 0, buffer software
}

/** Legge una stringa con lunghezza davanti. Torna false se sfora. */
static bool leggiTesto(const uint8_t* d, size_t n, size_t& i, char* fuori, size_t max) {
  if (i >= n) return false;
  const uint8_t len = d[i++];
  if (i + len > n) return false;
  const size_t quanti = (len < max - 1) ? len : max - 1;
  memcpy(fuori, d + i, quanti);
  fuori[quanti] = 0;
  i += len;
  return true;
}

/**
 * Interpreta un blocco gia' in memoria. `b.dati` deve essere il buffer, che
 * resta di proprieta' di `b`: gli offset ci puntano dentro.
 */
static bool bancoInterpreta(BancoCaricato& b) {
  const uint8_t* d = b.dati;
  const size_t   n = b.quanti;
  size_t i = 0;

  if (n < 8 || memcmp(d, "SPB1", 4) != 0) return false;
  i = 4;
  i++;                                   // lo slot: lo decide chi salva
  if (!leggiTesto(d, n, i, b.nome, sizeof(b.nome))) return false;

  if (i >= n) return false;
  const uint8_t quantiPosti = d[i++];
  if (quantiPosti != POSTI_PER_BANCO) return false;

  for (uint8_t p = 0; p < POSTI_PER_BANCO; p++) {
    PostoBanco& posto = b.posti[p];
    posto.presente = false;
    posto.quanti   = 0;
    posto.nome[0]  = 0;

    if (i >= n) return false;
    if (!d[i++]) continue;               // posto vuoto

    char uuid[40];
    if (!leggiTesto(d, n, i, uuid, sizeof(uuid)))            return false;
    if (!leggiTesto(d, n, i, posto.nome, sizeof(posto.nome))) return false;

    if (i >= n) return false;
    const uint8_t quantiChunk = d[i++];
    if (quantiChunk == 0 || quantiChunk > CHUNK_MAX) return false;

    for (uint8_t c = 0; c < quantiChunk; c++) {
      if (i >= n) return false;
      const uint8_t len = d[i++];
      if (len == 0 || i + len > n) return false;
      posto.inizio[c] = (uint16_t)i;
      posto.lung[c]   = len;
      i += len;
    }
    // Prima di dire che il posto e' buono: i suoi frame devono essere nostri.
    for (uint8_t c = 0; c < quantiChunk; c++) {
      if (!frameAccettabile(d + posto.inizio[c], posto.lung[c], c == 0)) return false;
    }
    posto.quanti   = quantiChunk;
    posto.presente = true;
  }
  b.valido = true;
  return true;
}

/* ---------------------------------------------------------------- */

static void nomeFile(uint8_t slot, char* fuori, size_t max) {
  snprintf(fuori, max, "/b%u.spb", slot);
}

static bool banchiAvvia() {
  // true = formatta se non c'e' niente: alla prima accensione la partizione
  // e' vergine, e senza questo LittleFS.begin() fallisce e basta.
  if (!LittleFS.begin(true)) { Serial.println(F("LittleFS: avvio fallito")); return false; }
  Serial.printf("LittleFS: %u byte usati su %u\n", LittleFS.usedBytes(), LittleFS.totalBytes());
  return true;
}

static bool bancoSalva(uint8_t slot, const uint8_t* blob, size_t n) {
  if (slot >= BANCHI_MAX) return false;
  char via[16];
  nomeFile(slot, via, sizeof(via));
  File f = LittleFS.open(via, "w");
  if (!f) { Serial.printf("non riesco ad aprire %s in scrittura\n", via); return false; }
  const size_t scritti = f.write(blob, n);
  f.close();
  if (scritti != n) { Serial.printf("scritti %u byte su %u\n", scritti, n); return false; }
  return true;
}

static bool bancoCarica(uint8_t slot, BancoCaricato& b) {
  bancoLibera(b);
  if (slot >= BANCHI_MAX) return false;
  char via[16];
  nomeFile(slot, via, sizeof(via));
  if (!LittleFS.exists(via)) return false;

  File f = LittleFS.open(via, "r");
  if (!f) return false;
  const size_t n = f.size();
  if (n == 0 || n > BLOCCO_MAX) { f.close(); return false; }

  b.dati = (uint8_t*)malloc(n);
  if (!b.dati) { f.close(); return false; }
  const size_t letti = f.read(b.dati, n);
  f.close();
  b.quanti = letti;
  if (letti != n || !bancoInterpreta(b)) { bancoLibera(b); return false; }
  return true;
}

static bool bancoCancella(uint8_t slot) {
  if (slot >= BANCHI_MAX) return false;
  char via[16];
  nomeFile(slot, via, sizeof(via));
  if (!LittleFS.exists(via)) return false;
  return LittleFS.remove(via);
}

/**
 * Scambia due slot. **Scambio e non inserimento**: con otto posti fissi «sposta
 * in mezzo» vorrebbe dire far scalare tutti gli altri, ed e' la stessa scelta
 * gia' fatta nell'app per i preset dentro un banco.
 */
static bool bancoScambia(uint8_t a, uint8_t b) {
  if (a >= BANCHI_MAX || b >= BANCHI_MAX || a == b) return false;
  char viaA[16], viaB[16], viaTmp[16];
  nomeFile(a, viaA, sizeof(viaA));
  nomeFile(b, viaB, sizeof(viaB));
  snprintf(viaTmp, sizeof(viaTmp), "/scambio.tmp");

  const bool cA = LittleFS.exists(viaA), cB = LittleFS.exists(viaB);
  if (!cA && !cB) return false;
  if (LittleFS.exists(viaTmp)) LittleFS.remove(viaTmp);

  if (cA && !LittleFS.rename(viaA, viaTmp)) return false;
  if (cB && !LittleFS.rename(viaB, viaA)) { if (cA) LittleFS.rename(viaTmp, viaA); return false; }
  if (cA && !LittleFS.rename(viaTmp, viaB)) return false;
  return true;
}

/** Quanti banchi ci sono, e riempie `nomi` con «slot:nome» separati da \n. */
static uint8_t banchiElenca(char* fuori, size_t max) {
  size_t usato = 0;
  uint8_t quanti = 0;
  fuori[0] = 0;
  for (uint8_t s = 0; s < BANCHI_MAX; s++) {
    BancoCaricato b = {};
    if (!bancoCarica(s, b)) continue;
    quanti++;
    uint8_t pieni = 0;
    for (uint8_t p = 0; p < POSTI_PER_BANCO; p++) if (b.posti[p].presente) pieni++;
    const int scritti = snprintf(fuori + usato, max - usato, "%u:%s:%u\n", s, b.nome, pieni);
    if (scritti > 0) usato += (size_t)scritti;
    bancoLibera(b);
    if (usato >= max - 1) break;
  }
  return quanti;
}
