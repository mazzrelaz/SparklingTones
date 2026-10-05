// Ampli finto per il video dimostrativo: sostituisce navigator.bluetooth con
// uno Spark 2 che vive nella pagina e risponde ai comandi del protocollo vero
// (lettura degli slot, stato live, invio di un preset, cambio preset,
// parametri), e con un pedale finto che riceve i banchi dal ponte.
// Serve solo a registrare l'app senza l'ampli davanti: niente di
// quello che passa di qui è una misura, e niente finisce nelle catture.
//
// I preset degli slot arrivano da window.__PRESET_AMPLI, messo dal
// registratore prima che la pagina parta.

(function () {
  'use strict';

  const SERVICE = 0xffc0;
  const dorme = ms => new Promise(r => setTimeout(r, ms));

  function ampliFinto() {
    const S = window.Spark;
    const slot = (window.__PRESET_AMPLI || []).map(p => JSON.parse(JSON.stringify(p)));
    let live = slot[0] ? JSON.parse(JSON.stringify(slot[0])) : null;
    let corrente = 0;
    const impostazioniLooper = [120, 0x00, 0x04, 0x00, 0x00, 0x00, 0x3c];
    const ricevuti = {};                         // seq → chunk di un 0x0101 in arrivo

    const ascoltatori = [];
    const notifica = async bytes => {
      // Come l'ampli vero: notifiche da 20 byte, poco distanziate.
      for (let i = 0; i < bytes.length; i += 20) {
        const pezzo = new Uint8Array(bytes.slice(i, i + 20));
        const ev = { target: { value: new DataView(pezzo.buffer) } };
        ascoltatori.forEach(f => f(ev));
        await dorme(2);
      }
    };
    const manda = (cmd, sub, data, seq) => notifica(S.buildChunk(cmd, sub, data, seq));
    const ack = (sub, seq) => manda(0x04, sub, [], seq);

    async function mandaPreset(p, seq, bank, number) {
      const payload = S.serializePreset(p, { bank, number });
      for (const c of S.splitPresetIntoChunks(payload)) {
        await manda(0x03, 0x01, c, seq);
        await dorme(12);
      }
    }

    async function gestisci(m) {
      const k = m.cmd * 256 + m.sub;
      const d = m.data;
      await dorme(25);
      switch (k) {
        case 0x0211: return manda(0x03, 0x11, S.encPrefixedString('Spark 2'), m.seq);
        case 0x0223: return manda(0x03, 0x23, S.encPrefixedString('S2DEMO0001'), m.seq);
        case 0x022f: return manda(0x03, 0x2f, [0xce, 0x01, 0x0a, 0x00, 0x2c], m.seq);
        case 0x0210: return manda(0x03, 0x10, [0x00, corrente], m.seq);
        case 0x0276: return manda(0x03, 0x76, impostazioniLooper, m.seq);
        case 0x0201: {
          if (d[0] === 0x01) return live && mandaPreset(live, m.seq, 0x01, 0x00);
          const p = slot[d[1]];
          return p && mandaPreset(p, m.seq, 0x00, d[1]);
        }
        case 0x0101: {
          const [totale, indice] = d;
          (ricevuti[m.seq] = ricevuti[m.seq] || [])[indice] = m;
          if (indice < totale - 1) return ack(0x01, m.seq);
          const msgs = ricevuti[m.seq].filter(Boolean);
          delete ricevuti[m.seq];
          await manda(0x05, 0x01, [], m.seq);
          try {
            const p = S.parsePreset(S.assemblePresetPayload(msgs).payload);
            if (p.bank === 0 && p.number < 8) slot[p.number] = p;
            else live = p;
          } catch (e) { console.warn('ampli finto: preset illeggibile', e); }
          return;
        }
        case 0x0138: {
          const n = d[d.length - 1];
          if (n !== 0x7f && slot[n]) live = JSON.parse(JSON.stringify(slot[n]));
          corrente = n;
          await ack(0x38, m.seq);
          return manda(0x03, 0x38, [0x00, n], 0x60);
        }
        case 0x0106: {
          try {
            const r = new S.Reader(d);
            const vecchio = r.prefixedString(), nuovo = r.prefixedString();
            const e = live && live.effects.find(x => x.name === vecchio);
            if (e) e.name = nuovo;
          } catch (e) { /* lo stato resta com'era */ }
          return ack(0x06, m.seq);
        }
        case 0x0176:
          impostazioniLooper.splice(0, impostazioniLooper.length, ...d);
          return ack(0x76, m.seq);
        default:
          return ack(m.sub, m.seq);
      }
    }

    const assembler = new S.MessageAssembler(m => { gestisci(m); });
    let connesso = false;
    const fineConnessione = [];

    const notifyChar = {
      startNotifications: async () => notifyChar,
      addEventListener: (tipo, f) => { if (tipo === 'characteristicvaluechanged') ascoltatori.push(f); },
    };
    const writeChar = {
      writeValueWithoutResponse: async bytes => {
        await dorme(4);
        assembler.feed(new Uint8Array(bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes));
      },
    };
    const service = {
      getCharacteristic: async uuid => (String(uuid).toLowerCase().includes('ffc1') || uuid === 0xffc1) ? writeChar : notifyChar,
    };
    const gatt = {
      get connected() { return connesso; },
      connect: async () => { await dorme(500); connesso = true; return gatt; },
      disconnect: () => { connesso = false; fineConnessione.forEach(f => f()); },
      getPrimaryService: async () => service,
    };
    return {
      name: 'Spark 2',
      id: 'demo-spark-2',
      gatt,
      addEventListener: (tipo, f) => { if (tipo === 'gattserverdisconnected') fineConnessione.push(f); },
    };
  }

  /* Il pedale finto: risponde al ponte di src/pedale-ponte.js come
     pedale/prova-ble, con l'elenco dei banchi e il «salvato» dopo un invio.
     Parte con un banco già dentro, così l'elenco non è vuoto. */
  function pedaleFinto() {
    const banchi = [{ slot: 0, nome: 'Concerto', pieni: 7 }];
    const ascoltatori = [];
    let ric = null;                                  // il banco in arrivo

    const rispondi = (codice, testo) => {
      const b = new TextEncoder().encode(testo);
      const v = new Uint8Array(1 + b.length);
      v[0] = codice; v.set(b, 1);
      setTimeout(() => ascoltatori.forEach(f => f({ target: { value: new DataView(v.buffer) } })), 40);
    };
    const elenco = () => rispondi(0x82, banchi.slice().sort((a, b) => a.slot - b.slot)
      .map(x => `${x.slot}:${x.nome}:${x.pieni}\n`).join(''));

    // nome e preset pieni dal blocco "SPB1": vedi PedalePonte.blocco
    function leggiBlocco(b) {
      let i = 5;
      const testo = () => { const n = b[i++]; const s = new TextDecoder().decode(b.subarray(i, i + n)); i += n; return s; };
      const nome = testo();
      const posti = b[i++];
      let pieni = 0;
      for (let p = 0; p < posti; p++) {
        if (!b[i++]) continue;
        pieni++;
        testo(); testo();
        const frame = b[i++];
        for (let f = 0; f < frame; f++) i += 1 + b[i];
      }
      return { nome, pieni };
    }

    const comando = {
      writeValueWithResponse: async dati => {
        const b = new Uint8Array(dati);
        await dorme(b[0] === 0x11 ? 70 : 20);
        switch (b[0]) {
          case 0x01: return rispondi(0x81, 'SparkPedale demo');
          case 0x02: return elenco();
          case 0x10:
            ric = { slot: b[1], dati: [] };
            return;
          case 0x11:
            if (ric) ric.dati.push(...b.subarray(3));
            return;
          case 0x12: {
            if (!ric) return;
            const { nome, pieni } = leggiBlocco(new Uint8Array(ric.dati));
            const vecchio = banchi.findIndex(x => x.slot === ric.slot);
            if (vecchio >= 0) banchi.splice(vecchio, 1);
            banchi.push({ slot: ric.slot, nome, pieni });
            rispondi(0x81, `banco "${nome}" salvato nello slot ${ric.slot + 1}`);
            ric = null;
            return;
          }
          case 0x20: {
            const k = banchi.findIndex(x => x.slot === b[1]);
            if (k >= 0) banchi.splice(k, 1);
            return rispondi(0x81, 'tolto');
          }
          case 0x21: return rispondi(0x81, `suona il banco ${b[1] + 1}`);
          case 0x22:
            banchi.forEach(x => { x.slot = x.slot === b[1] ? b[2] : x.slot === b[2] ? b[1] : x.slot; });
            return rispondi(0x81, 'scambiati');
        }
      },
    };
    const stato = {
      startNotifications: async () => stato,
      addEventListener: (tipo, f) => { if (tipo === 'characteristicvaluechanged') ascoltatori.push(f); },
    };
    const servizio = {
      getCharacteristic: async uuid => (String(uuid).startsWith('7a9c0001') ? comando : stato),
    };
    let connesso = false;
    const fine = [];
    const gatt = {
      get connected() { return connesso; },
      connect: async () => { await dorme(600); connesso = true; return gatt; },
      disconnect: () => { connesso = false; fine.forEach(f => f()); },
      getPrimaryService: async () => servizio,
    };
    return { name: 'SparkPedale', id: 'demo-pedale', gatt,
             addEventListener: (tipo, f) => { if (tipo === 'gattserverdisconnected') fine.push(f); } };
  }

  let apparecchio = null, pedale = null;
  const bt = {
    getAvailability: async () => true,
    requestDevice: async opzioni => {
      await dorme(700);
      if (JSON.stringify(opzioni || {}).includes('7a9c0000')) return (pedale = pedale || pedaleFinto());
      return (apparecchio = apparecchio || ampliFinto());
    },
    addEventListener() {}, removeEventListener() {},
  };
  try {
    Object.defineProperty(Navigator.prototype, 'bluetooth', { get: () => bt, configurable: true });
  } catch (e) {
    Object.defineProperty(navigator, 'bluetooth', { value: bt, configurable: true });
  }
  window.__SERVICE_FINTO = SERVICE;
})();
