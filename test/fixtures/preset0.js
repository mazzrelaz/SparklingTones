/**
 * Cattura reale: risposta a 0x0201 per il preset 0 dello Spark 2, 16 chunk.
 * Estratta da captures/2026-08-10-sweep-lunghezza.txt (richiesta con seq 0x02).
 */
window.FIXTURE_PRESET0_SEQ = 0x02;

window.FIXTURE_PRESET0 = `
f0 01 02 22 03 01 20 10 00 19 00 00 59 24 00 35 39 39 38 61 62 64 00 31 2d 34 33 38 36 2d 00 34 35 39 61 2d 62 32 f7
f0 01 02 4e 03 01 00 10 01 19 37 34 2d 63 00 36 62 31 37 33 65 32 10 39 63 32 63 34 44 47 00 20 2d 20 53 68 69 6e f7
f0 01 02 65 03 01 00 10 02 19 65 20 4f 6e 00 20 20 63 6c 65 61 6e 31 23 30 2e 37 20 28 69 00 63 6f 6e 2e 70 6e 67 f7
f0 01 02 23 03 01 28 10 03 19 4a 42 70 00 06 00 17 2e 62 69 61 73 00 2e 6e 6f 69 73 65 67 58 61 74 65 43 12 00 11 f7
f0 01 02 74 03 01 08 10 04 19 4a 3d 70 00 2c 43 01 11 4a 3f 00 00 02 00 28 4c 41 32 41 43 58 6f 6d 70 43 13 00 11 f7
f0 01 02 0a 03 01 08 10 05 19 4a 00 00 00 2c 00 01 11 4a 3f 00 00 2c 00 02 11 4a 3e 37 18 02 22 28 50 72 6f 43 6f f7
f0 01 02 4b 03 01 40 10 06 19 52 61 74 43 0d 13 00 11 4a 3d 48 00 2d 6b 01 11 4a 3d 16 14 2c 59 02 11 4a 3f 00 00 f7
f0 01 02 79 03 01 10 10 07 19 00 24 54 77 6c 69 6e 43 15 00 11 4a 60 3f 4a 4d 6e 01 11 4a 60 3f 47 31 1a 02 11 4a f7
f0 01 02 0e 03 01 10 10 08 19 3f 00 00 00 36 03 11 4a 3e 17 20 73 46 04 11 4a 3f 14 7a 61 01 2c 43 68 6f 72 75 73 f7
f0 01 02 24 03 01 00 10 09 19 41 6e 61 6c 6c 6f 67 43 14 00 11 4a 66 3e 31 74 6f 01 11 4a 6c 3e 4c 4c 4d 02 11 4a f7
f0 01 02 5f 03 01 00 10 0a 19 3f 33 33 33 66 03 11 4a 3f 4c 4c 4d 01 2a 44 65 6c 61 79 52 30 65 32 30 31 43 15 00 f7
f0 01 02 00 03 01 18 10 0b 19 11 4a 3e 5d 5b 53 7e 01 11 4a 3e 0c 1b 0c 35 02 11 4a 3f 1d 18 65 5e 03 11 4a 3f 21 f7
f0 01 02 08 03 01 48 10 0c 19 2f 3a 04 11 25 4a 3f 00 00 00 2b 62 00 69 61 73 2e 72 65 76 58 65 72 62 43 17 00 11 f7
f0 01 02 02 03 01 28 10 0d 19 4a 3e 12 49 2c 25 01 11 4a 3e 51 13 2d 38 02 11 4a 3e 14 37 6d 63 03 11 4a 3e 46 51 f7
f0 01 02 2a 03 01 68 10 0e 19 03 04 11 4a 60 3f 15 07 50 05 11 4a 60 3f 26 66 67 06 11 4a 1c 3e 4c 4c 4d 4a 46 1c f7
f0 01 02 32 03 01 20 10 0f 08 18 00 4a 3f 08 00 00 00 60 f7
`.trim().split('\n').map(line => line.trim().split(/\s+/).map(h => parseInt(h, 16)));

/**
 * Cattura reale: payload dello stato live (0x0201 con [0x01, 0x00]), già
 * riassemblato. Differisce da un preset salvato per due cose: l'indirizzo
 * è bank 1, e **non ha i float di coda** — finisce subito col checksum.
 * Da captures/2026-08-11-stato-live.json.
 */
window.FIXTURE_LIVE_PAYLOAD = (
  '01 00 d9 24 34 31 32 61 39 33 61 35 2d 66 39 35 34 2d 34 30 39 61 2d 38 61 61 30 2d 33 39 ' +
  '34 66 63 38 36 30 63 65 61 33 ab 43 6c 65 61 6e 20 54 75 62 65 20 a3 30 2e 37 a0 a8 69 63 ' +
  '6f 6e 2e 70 6e 67 ca 42 f0 00 00 97 ae 62 69 61 73 2e 6e 6f 69 73 65 67 61 74 65 c3 93 00 ' +
  '91 ca 3e a3 f1 41 01 91 ca 3e ca 7e fa 02 91 ca 3f 80 00 00 a8 4c 41 32 41 43 6f 6d 70 c3 ' +
  '93 00 91 ca 00 00 00 00 01 91 ca 3f 4b b9 8c 02 91 ca 3e 9c 84 b6 ad 44 69 73 74 6f 72 74 ' +
  '69 6f 6e 54 53 39 c2 94 00 91 ca 3f 11 eb 85 01 91 ca 3f 00 00 00 02 91 ca 3f 1e b8 52 03 ' +
  '91 ca 00 00 00 00 ad 41 63 6f 75 73 74 69 63 41 6d 70 56 32 c3 95 00 91 ca 3f 3a 8c 15 01 ' +
  '91 ca 3f 31 0c b3 02 91 ca 3e 3b e7 6d 03 91 ca 3e d1 41 20 04 91 ca 3f 59 7a f1 a9 47 75 ' +
  '69 74 61 72 45 51 36 c3 97 00 91 ca 3f 14 25 16 01 91 ca 3f 00 00 00 02 91 ca 3f 00 00 00 ' +
  '03 91 ca 3f 00 00 00 04 91 ca 3f 00 00 00 05 91 ca 3f 00 00 00 06 91 ca 3f 00 00 00 aa 44 ' +
  '65 6c 61 79 52 65 32 30 31 c2 95 00 91 ca 3e 63 e7 16 01 91 ca 3e 4e 98 17 02 91 ca 3e 87 ' +
  '55 6c 03 91 ca 3e b9 55 1a 04 91 ca 3f 80 00 00 ab 62 69 61 73 2e 72 65 76 65 72 62 c3 98 ' +
  '00 91 ca 3e ec 3c 9f 01 91 ca 3f 77 24 74 02 91 ca 3e 36 45 a2 03 91 ca 3e 18 79 3e 04 91 ' +
  'ca 3f 2b 7e 91 05 91 ca 3d 89 d4 95 06 91 ca 3e 99 99 9a 07 91 ca 3f 80 00 00 4c'
).split(' ').map(h => parseInt(h, 16));

/** Cattura reale: manopola del reverb girata (0x0337). */
window.FIXTURE_KNOB_REVERB =
  'f0 01 6a 7a 03 37 02 0b 2b 62 69 61 73 2e 00 72 65 76 65 72 62 00 11 4a 3f 5c 1f 5c 00 f7'
    .split(' ').map(h => parseInt(h, 16));

/** Messaggi che hanno avuto effetto sull'ampli, usati come riferimento fisso. */
window.FIXTURE_WORKING = {
  fxOff:  'f0 01 05 03 01 15 02 0b 2b 62 69 61 73 2e 40 72 65 76 65 72 62 42 00 00 f7',
  preset: 'f0 01 01 01 01 38 00 00 01 f7',
};
