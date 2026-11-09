/**
 * ampli-finto.js — uno Spark 2 finto per provare `pc.html` senza l'ampli (`pc.html#finto`).
 *
 * Ha la stessa interfaccia di `SparkTransport` che la pagina usa (connect, identify, readLibrary,
 * readPreset, readLiveState, send, setBpm, loadPreset, storePreset, request) e tiene in memoria otto
 * slot e il suono corrente. Capisce i comandi che la pagina manda — cambio di slot (`0x0138`),
 * acceso/spento (`0x0115`), manopola (`0x0104`), cambio di modello (`0x0106`), accordatore
 * (`0x0165`) — perché `Spark.commands` viene avvolto qui per lasciare un segno leggibile su ogni
 * comando. **Solo per le prove**: dice come si comporta la pagina, non come si comporta l'ampli.
 * I preset sono marcati `demo` nella descrizione.
 */
'use strict';
window.AmpliFinto = (function () {
  const E = SparkEffetti;
  const C = Spark.commands;
  // Il segno sui comandi: la pagina li costruisce con Spark.commands, il finto li legge da `_finto`.
  for (const [nome, chiave] of [['changePreset', 'slot'], ['effectOnOff', 'onoff'], ['changeParam', 'param'],
                                ['changeEffectModel', 'modello'], ['tuner', 'tuner']]) {
    const orig = C[nome];
    C[nome] = (...a) => Object.assign(orig(...a), { _finto: [chiave, ...a] });
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const copia = x => JSON.parse(JSON.stringify(x));
  const uuid = n => `0000000${n}-DE00-4000-8000-00000000000${n}`.slice(-36);

  function blocco(id, acceso, base) {
    const quante = E.quanteManopole(id) || 5;
    const extra = E.nomeExtra(id) ? 1 : 0;
    const params = Array.from({ length: quante + extra }, (_, i) => ({ index: i, value: i >= quante ? (acceso ? 1 : 0) : (base + i * 0.07) % 1 }));
    if (id === 'bias.reverb') params[6].value = 0.3;
    return { name: id, enabled: acceso, params };
  }
  function preset(n, nome, catena, bpm) {
    return { name: nome, uuid: uuid(n), version: '0.7', description: 'demo', icon: 'icon.png', bpm,
             effects: catena.map(([id, on], i) => blocco(id, on, 0.3 + n * 0.05 + i * 0.03)) };
  }
  const SLOT = [
    preset(1, 'Silver Lining', [['bias.noisegate', true], ['LA2AComp', false], ['KlonCentaurSilver', true], ['Twin', true], ['ChorusAnalog', true], ['DelayMono', true], ['bias.reverb', true]], 120),
    preset(2, 'Crunch Box', [['bias.noisegate', true], ['BlueComp', false], ['DistortionTS9', true], ['Plexi', true], ['Phaser', false], ['DelayEchoFilt', true], ['bias.reverb', true]], 110),
    preset(3, 'Blues Lead', [['bias.noisegate', false], ['Compressor', true], ['Overdrive', true], ['Deluxe65', true], ['UniVibe', false], ['VintageDelay', true], ['bias.reverb', true]], 96),
    preset(4, 'Clean Chorus', [['bias.noisegate', false], ['LA2AComp', true], ['Booster', false], ['RolandJC120', true], ['ChorusAnalog', true], ['DelayMono', false], ['bias.reverb', true]], 100),
    preset(5, 'Metal Riff', [['bias.noisegate', true], ['BBEOpticalComp', false], ['ProCoRat', true], ['Rectifier', true], ['Flanger', false], ['DelayMono', false], ['bias.reverb', false]], 140),
    preset(6, 'Acoustic Sim', [['bias.noisegate', false], ['LA2AComp', true], ['Booster', false], ['FlatAcoustic', true], ['GuitarEQ6', true], ['DelayMono', false], ['bias.reverb', true]], 90),
    preset(7, 'Ambient Pad', [['bias.noisegate', false], ['Compressor', false], ['Booster', false], ['Twin', true], ['Tremolator', true], ['DelayReverse', true], ['bias.reverb', true]], 72),
    preset(8, 'Fuzz Face', [['bias.noisegate', true], ['LA2AComp', false], ['Fuzz', true], ['Bassman', true], ['Vibrato01', false], ['DelayRe201', true], ['bias.reverb', true]], 105),
  ];

  function AmpliFinto(gestori) {
    this.finto = true;
    this.onStatus = gestori.onStatus || (() => {});
    this.onMessage = gestori.onMessage || (() => {});
    this.onLog = gestori.onLog || (() => {});
    this._su = false;
    this.rxTotali = 0;
    this.state = { name: null, currentPreset: null, bpm: null };
    this.slot = SLOT.map(copia);
    this.vivo = copia(this.slot[0]);
    this.attuale = 0;
    this.comandi = [];      // tutto quello che la pagina ha mandato, per guardarlo dalla console
    this._accordatore = null;
  }

  AmpliFinto.prototype = {
    get connected() { return this._su; },
    async connect() {
      this.onStatus('connecting', 'collego…');
      await sleep(300);
      this._su = true;
      this.onStatus('connected');
    },
    async disconnect() {
      this._su = false;
      clearInterval(this._accordatore);
      this.onStatus('disconnected');
    },
    async identify() {
      await sleep(80);
      this.state.name = 'Spark 2';
      this.state.currentPreset = this.attuale;
    },
    async readLibrary(max, onProgress) {
      const fuori = [];
      for (let i = 0; i < max; i++) {
        if (onProgress) onProgress(i, max);
        await sleep(60);
        fuori.push(Object.assign(copia(this.slot[i]), { slot: i }));
      }
      return fuori;
    },
    async readPreset(n) { await sleep(120); return Object.assign(copia(this.slot[n]), { slot: n }); },
    async readLiveState() { await sleep(150); return this._su ? copia(this.vivo) : null; },
    async request(cmd) {
      await sleep(40);
      return { cmd: Spark.CMD_NOTIFY, sub: 0x10, data: [this.attuale] };
    },
    async sendAndAwaitAck(cmd) { await this.send(cmd); return true; },
    async setBpm(n) { this.comandi.push(['bpm', n]); this.vivo.bpm = n; this.state.bpm = n; },
    async send(cmd) {
      if (!this._su) throw new Error('non collegato');
      await sleep(15);
      const f = cmd._finto;
      if (!f) return;
      this.comandi.push(f);
      const [tipo, a, b, c] = f;
      const effetto = nome => this.vivo.effects.find(e => e.name === nome);
      if (tipo === 'slot') { this.attuale = a; this.vivo = copia(this.slot[a]); this.state.currentPreset = a; }
      else if (tipo === 'onoff') { const e = effetto(a); if (e) e.enabled = b; }
      else if (tipo === 'param') { const e = effetto(a); const p = e && e.params.find(x => x.index === b); if (p) p.value = c; }
      else if (tipo === 'modello') {
        const i = this.vivo.effects.findIndex(e => e.name === a);
        if (i >= 0) this.vivo.effects[i] = blocco(b, this.vivo.effects[i].enabled, 0.5);
      } else if (tipo === 'tuner') {
        clearInterval(this._accordatore);
        if (a) {
          // Una corda che oscilla attorno al La, poi tace e riparte: per vedere le tacche muoversi.
          let t = 0;
          this._accordatore = setInterval(() => {
            t++;
            const tace = t % 60 > 48;
            const s = tace ? -1 : 0.5 + 0.18 * Math.sin(t / 7) * Math.exp(-(t % 60) / 30);
            const dv = new DataView(new ArrayBuffer(4));
            dv.setFloat32(0, s);
            this.onMessage({ cmd: Spark.CMD_NOTIFY, sub: 0x64, data: [9, 0xca, ...new Uint8Array(dv.buffer)] });
          }, 77);
        }
      }
    },
    async loadPreset(p, onProgress) {
      for (let i = 0; i < 4; i++) { if (onProgress) onProgress(i, 4); await sleep(60); }
      this.vivo = copia(p);
      this.attuale = Spark.SOFTWARE_PRESET;
      this.state.currentPreset = Spark.SOFTWARE_PRESET;
      return { ok: true, acks: 4, total: 4 };
    },
    async storePreset(p, slot, onProgress) {
      for (let i = 0; i < 4; i++) { if (onProgress) onProgress(i, 4); await sleep(60); }
      const pulito = copia(p);
      delete pulito.id; delete pulito.slots; delete pulito.tags; delete pulito.notes;
      this.slot[slot] = pulito;
      this.vivo = copia(pulito);
      this.attuale = slot;
      this.state.currentPreset = slot;
      return { ok: true, acks: 4, total: 4 };
    },
  };
  return AmpliFinto;
})();
