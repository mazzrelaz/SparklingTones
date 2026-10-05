// Scrive l'MP4 del video dimostrativo dai byte codificati da monta.html:
// H.264 a cadenza fissa e, se c'è la voce, AAC. Un MP4 classico — moov con
// le tabelle complete in testa, un mdat solo — perché DaVinci Resolve non
// importa l'MP4 frammentato che dava MediaRecorder.
//
// Ingresso, nella cartella di uscita: fatto.json (misure, fotogrammi chiave,
// configurazioni dei due codec), video.bin, audio.bin. Uscita: demo.mp4.

'use strict';
const fs = require('fs');
const path = require('path');

function scatola(tipo, ...parti) {
  const corpo = Buffer.concat(parti);
  const testa = Buffer.alloc(8);
  testa.writeUInt32BE(8 + corpo.length);
  testa.write(tipo, 4, 'latin1');
  return Buffer.concat([testa, corpo]);
}
function piena(tipo, versione, flag, ...parti) {
  const vf = Buffer.alloc(4);
  vf.writeUInt32BE(((versione & 0xff) << 24 | (flag & 0xffffff)) >>> 0);
  return scatola(tipo, vf, ...parti);
}
const u8 = v => Buffer.from(v);
const u16 = (...v) => { const x = Buffer.alloc(2 * v.length); v.forEach((n, k) => x.writeUInt16BE(n & 0xffff, 2 * k)); return x; };
const u32 = (...v) => { const x = Buffer.alloc(4 * v.length); v.forEach((n, k) => x.writeUInt32BE(n >>> 0, 4 * k)); return x; };
const zeri = n => Buffer.alloc(n);
const MATRICE = u32(0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000);

function tabelle(entry, campioni, durata, posti, chiavi) {
  const parti = [piena('stsd', 0, 0, u32(1), entry)];
  parti.push(piena('stts', 0, 0, u32(1, campioni.length, durata)));
  if (chiavi) {
    const sync = [];
    chiavi.forEach((k, i) => { if (k) sync.push(i + 1); });
    parti.push(piena('stss', 0, 0, u32(sync.length, ...sync)));
  }
  parti.push(piena('stsc', 0, 0, u32(1, 1, 1, 1)));              // un campione per pezzo
  parti.push(piena('stsz', 0, 0, u32(0, campioni.length, ...campioni)));
  const co = Buffer.alloc(4 + 8 * posti.length);
  co.writeUInt32BE(posti.length);
  posti.forEach((p, i) => co.writeBigUInt64BE(BigInt(p), 4 + 8 * i));
  parti.push(piena('co64', 0, 0, co));
  return scatola('stbl', ...parti);
}

function traccia({ id, tipo, scala, durataMedia, durataFilm, larghezza, altezza, stbl }) {
  const video = tipo === 'vide';
  const tkhd = piena('tkhd', 0, 3, u32(0, 0, id, 0, durataFilm), zeri(8),
                     u16(0, 0, video ? 0 : 0x0100, 0), MATRICE,
                     u32(video ? larghezza << 16 : 0, video ? altezza << 16 : 0));
  const mdhd = piena('mdhd', 0, 0, u32(0, 0, scala, durataMedia), u16(0x55c4, 0));
  const hdlr = piena('hdlr', 0, 0, u32(0), u8(Buffer.from(tipo, 'latin1')), zeri(12),
                     Buffer.from(video ? 'VideoHandler\0' : 'SoundHandler\0', 'latin1'));
  const testaMedia = video ? piena('vmhd', 0, 1, u16(0, 0, 0, 0)) : piena('smhd', 0, 0, u16(0, 0));
  const dinf = scatola('dinf', piena('dref', 0, 0, u32(1), piena('url ', 0, 1)));
  return scatola('trak', tkhd, scatola('mdia', mdhd, hdlr, scatola('minf', testaMedia, dinf, stbl)));
}

function descrittore(tag, corpo) {
  return Buffer.concat([u8([tag, corpo.length]), corpo]);    // corpi corti: lunghezza in un byte
}

function scriviMp4(cartella) {
  const info = JSON.parse(fs.readFileSync(path.join(cartella, 'fatto.json'), 'utf8'));
  const datiVideo = fs.readFileSync(path.join(cartella, 'video.bin'));
  const datiAudio = info.audio ? fs.readFileSync(path.join(cartella, 'audio.bin')) : Buffer.alloc(0);
  const { fps, larghezza, altezza } = info;

  // video: scala 30000, ogni fotogramma 1000 → 30 fps esatti
  const scalaV = fps * 1000, durV = 1000;
  const nV = info.video.misure.length;
  const avc1 = scatola('avc1', zeri(6), u16(1), zeri(16), u16(larghezza, altezza),
                       u32(0x00480000, 0x00480000, 0), u16(1), zeri(32), u16(0x0018, 0xffff),
                       scatola('avcC', Buffer.from(info.video.descrizione)));
  // audio: AAC, 1024 campioni a pacchetto
  let mp4a = null;
  if (info.audio) {
    const asc = Buffer.from(info.audio.descrizione);
    const dcd = descrittore(0x04, Buffer.concat([u8([0x40, 0x15, 0, 0, 0]), u32(192000, 192000),
                                                  descrittore(0x05, asc)]));
    const esd = descrittore(0x03, Buffer.concat([u16(0), u8([0]), dcd, descrittore(0x06, u8([0x02]))]));
    mp4a = scatola('mp4a', zeri(6), u16(1), zeri(8), u16(info.audio.ch, 16, 0, 0),
                   u32(info.audio.sr * 65536), piena('esds', 0, 0, esd));
  }

  const ftyp = scatola('ftyp', Buffer.from('isom', 'latin1'), u32(0x200),
                       Buffer.from('isomiso2avc1mp41', 'latin1'));
  const durataFilmMs = Math.round(nV * durV / scalaV * 1000);

  function moov(inizioDati) {
    let p = inizioDati;
    const postiV = info.video.misure.map(m => { const q = p; p += m; return q; });
    const postiA = info.audio ? info.audio.misure.map(m => { const q = p; p += m; return q; }) : [];
    const mvhd = piena('mvhd', 0, 0, u32(0, 0, 1000, durataFilmMs, 0x00010000), u16(0x0100), zeri(10),
                       MATRICE, zeri(24), u32(info.audio ? 3 : 2));
    const tracce = [traccia({ id: 1, tipo: 'vide', scala: scalaV, durataMedia: nV * durV, durataFilm: durataFilmMs,
                              larghezza, altezza,
                              stbl: tabelle(avc1, info.video.misure, durV, postiV, info.video.chiavi) })];
    if (info.audio) {
      const nA = info.audio.misure.length;
      tracce.push(traccia({ id: 2, tipo: 'soun', scala: info.audio.sr, durataMedia: nA * 1024,
                            durataFilm: Math.round(nA * 1024 / info.audio.sr * 1000),
                            stbl: tabelle(mp4a, info.audio.misure, 1024, postiA, null) }));
    }
    return scatola('moov', mvhd, ...tracce);
  }

  // il moov non cambia lunghezza al cambiare degli offset (co64 a 8 byte)
  const lungo = moov(0).length;
  const testaMdat = Buffer.alloc(16);
  testaMdat.writeUInt32BE(1);
  testaMdat.write('mdat', 4, 'latin1');
  testaMdat.writeBigUInt64BE(BigInt(16 + datiVideo.length + datiAudio.length), 8);
  const uscita = path.join(cartella, 'demo.mp4');
  const f = fs.openSync(uscita, 'w');
  for (const x of [ftyp, moov(ftyp.length + lungo + 16), testaMdat, datiVideo, datiAudio]) fs.writeSync(f, x);
  fs.closeSync(f);
  for (const x of ['video.bin', 'audio.bin']) fs.rmSync(path.join(cartella, x), { force: true });
  return { file: uscita, secondi: durataFilmMs / 1000, fotogrammi: nV, pacchettiAudio: info.audio ? info.audio.misure.length : 0 };
}

module.exports = scriviMp4;
if (require.main === module) console.log(JSON.stringify(scriviMp4(process.argv[2])));
