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
