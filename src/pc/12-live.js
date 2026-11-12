// Sparkling Tones — pc/12-live.js: la vista Live del PC e la pedaliera MIDI (11 novembre 2026).
//
// Otto posti per banco, due metà da quattro (A rosso, B verde), come il telefono e il pedale.
// Due modalità: **Preset** (un posto suona il suo preset, come un pulsantone: `suonaDalBanco`, cioè
// `0x0138` se sta in uno slot, altrimenti l'invio intero; i banchi dell'utente non scrivono mai
// sull'ampli) e **Stomp** (cinque blocchi, Compressor Drive Mod Delay Reverb, accesi e spenti con
// `0x0115` via `cambiaAcceso`; gate, amp e cab non c'entrano). Le assegnazioni dello Stomp sono le
// stesse per tutti i preset: la catena dello Spark ha l'ordine fisso.
//
// La **pedaliera** la costruisce l'utente: «Impara» uno switch alla volta da un pedale MIDI (USB con
// Web MIDI; Bluetooth collegandoci noi al servizio BLE MIDI standard, accanto allo Spark: Web MIDI di
// Windows i pedali BLE non li vede). Ogni switch ha tre assegnazioni: posto in Preset, blocco in
// Stomp, gesto sulla pressione lunga. **La pressione lunga la misuriamo noi**: serve un pedale che
// mandi un CC a 127 premendo e a 0 rilasciando (un Program Change è solo una pressione breve).
'use strict';

const BLE_MIDI_SERVIZIO = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const BLE_MIDI_DATI = '7772e5db-3868-4112-a1a9-f2669d106bf3';

/** I cinque blocchi dello Stomp, con la loro posizione nella catena (`POSTI`). */
const STOMP = [
  { id: 'COMP', pos: 1, nome: 'Compressor' },
  { id: 'DRIVE', pos: 2, nome: 'Drive' },
  { id: 'MOD', pos: 4, nome: 'Mod' },
  { id: 'DELAY', pos: 5, nome: 'Delay' },
  { id: 'REVERB', pos: 6, nome: 'Reverb' },
];
const GESTI = [
  { id: null, nome: () => tr('Nessuno') },
  { id: 'stomp', nome: () => tr('Entra/esci dallo Stomp') },
  { id: 'meta', nome: () => tr('Passa da banco A a banco B') },
  { id: 'banco+', nome: () => tr('Banco successivo') },
  { id: 'banco-', nome: () => tr('Banco precedente') },
];
const DURATE = [1000, 1500, 2000, 3000];

let schermoLive = null;
const live = {
  vista: 'live',        // 'live' | 'pedaliera'
  banco: 0,             // 0 = Ampli, poi i banchi dell'utente
  meta: 0,
  stomp: false,
  impara: false,
  firma: '',
};
/** Quello che si salva: gli switch imparati e la durata della pressione lunga. */
let pedaliera = { switch: [], durata: 2000 }, pedalieraLetta = false;
const midi = { usb: null, ble: null, bleNome: '', premuti: new Map() };

async function caricaPedaliera() {
  if (pedalieraLetta) return;
  pedalieraLetta = true;
  const p = await store.getSetting('pedaliera', null);
  if (p && Array.isArray(p.switch)) pedaliera = { switch: p.switch, durata: DURATE.includes(p.durata) ? p.durata : 2000 };
  live.banco = await store.getSetting('liveBanco', 0);
}
const salvaPedaliera = () => store.setSetting('pedaliera', pedaliera);

/* ---------------------------------------------------------------- i banchi */

/** I banchi della vista: «Ampli» (gli slot) e quelli dell'utente. Un posto è {record, slot}. */
function banchiLive() {
  const ampli = { nome: tr('Ampli'), posti: Array.from({ length: profilo.slot }, (_, n) => ({ record: suAmpli[n] || null, slot: n })) };
  return [ampli, ...banchi.map(b => ({ nome: b.nome, posti: b.posti.map(id => ({ record: id === null ? null : perId(id), slot: null })) }))];
}
function bancoLive() {
  const tutti = banchiLive();
  if (live.banco >= tutti.length) live.banco = 0;
  return tutti[live.banco];
}
function cambiaBanco(passo) {
  const n = banchiLive().length;
  live.banco = (live.banco + passo + n) % n;
  live.meta = 0;
  store.setSetting('liveBanco', live.banco);
  disegnaLive();
}

/** Il posto che suona ora, nel banco mostrato (o -1). */
function postoAttivo(banco) {
  // Il pulsantone premuto si accende subito: aspettare la rilettura dall'ampli lo faceva
  // accendere molto dopo il suono (12 novembre 2026).
  if (live.scelto && live.scelto.banco === live.banco) return live.scelto.i;
  if (!ora) return -1;
  return banco.posti.findIndex(p => p.record ? suonaOra(p.record) : p.slot !== null && ora.slot === p.slot);
}

function suonaPosto(i) {
  const p = bancoLive().posti[i];
  if (!p) return;
  live.meta = Math.floor(i / 4);
  const scelto = live.scelto = { banco: live.banco, i };
  const fatto = p.slot !== null ? apriSlot(p.slot) : p.record ? suonaDalBanco(p.record) : null;
  disegnaLive();
  // A lavoro finito decide di nuovo quello che suona davvero (un invio fallito non resta acceso).
  Promise.resolve(fatto).finally(() => {
    if (live.scelto === scelto) { live.scelto = null; live.firma = ''; if (schermoLive) disegnaLive(); }
  });
}

function cambiaStomp(id) {
  const b = STOMP.find(s => s.id === id);
  if (!b) return;
  if (!ora || !ora.effetti || !ora.effetti[b.pos]) { stato(tr('prima fai suonare un preset.'), 'errore'); return; }
  if (!ora.offline && ora.attendibile === false) return;   // la rilettura non è ancora arrivata
  // Nel Live accendere e spegnere è suonare, non lavoro da salvare: niente domanda cambiando
  // preset (regola dell'utente, 12 novembre 2026). Il lavoro fatto prima nell'editor resta segnato.
  const prima = ora.toccato;
  cambiaAcceso(b.pos);
  ora.toccato = prima;
  disegnaTesta();
  disegnaLive();
}

/* ---------------------------------------------------------------- la schermata */

async function apriLive() {
  await caricaPedaliera();
  chiudiSchermi();
  schermoLive = document.createElement('div');
  schermoLive.className = 'schermo live';
  schermoLive.innerHTML = `
    <div class="sch-cima">
      <span class="lv-logo"><img class="logo" src="icons/logo.svg" alt="SparklingTones"><img class="logo alone" src="icons/logo.svg" alt=""></span>
      <h2 class="lv-titolo">${tr('Live')}</h2>
      <span data-f="casa-schede"></span>
      <div class="lv-schede">
        <button data-f="v-live">${tr('Live')}</button><button data-f="v-ped">${tr('Pedaliera')}</button>
      </div>
      <span class="spazio"></span>
      <span class="lv-midi" data-f="midi"></span>
      <button data-f="chiudi" title="${tr('Chiudi')}">✕</button>
    </div>
    <div class="lv-corpo" data-f="corpo"></div>`;
  document.body.appendChild(schermoLive);
  const q = f => schermoLive.querySelector(`[data-f="${f}"]`);
  q('chiudi').addEventListener('click', chiudiSchermi);
  q('v-live').addEventListener('click', () => { live.vista = 'live'; live.impara = false; disegnaLive(); });
  q('v-ped').addEventListener('click', () => { live.vista = 'pedaliera'; disegnaLive(); });
  live.firma = '';
  disegnaLive();
}

function chiudiLive() {
  if (schermoLive) { schermoLive.remove(); schermoLive = null; }
  live.impara = false;
}

/** Ridisegna solo se qualcosa è cambiato: il suono, gli accesi, i banchi, lo slot (controllato di continuo). */
function firmaLive() {
  const accesi = ora && ora.effetti ? ora.effetti.map(e => (e && e.enabled ? 1 : 0)).join('') : '';
  const nomi = ora && ora.effetti ? ora.effetti.map(e => e && e.name).join(',') : '';
  return [live.vista, live.banco, live.meta, live.stomp, live.impara, ora && ora.nome, ora && ora.slot, accesi, nomi,
    banchi.length, suAmpli.map(r => r && r.id).join(','), spark.connected, !!midi.usb, midi.bleNome, pedaliera.switch.length].join('|');
}
setInterval(() => { if (schermoLive && firmaLive() !== live.firma) disegnaLive(); }, 300);

function disegnaLive() {
  if (!schermoLive) return;
  live.firma = firmaLive();
  const q = f => schermoLive.querySelector(`[data-f="${f}"]`);
  q('v-live').classList.toggle('sì', live.vista === 'live');
  q('v-ped').classList.toggle('sì', live.vista === 'pedaliera');
  const fonti = [midi.usb ? tr('MIDI USB') : '', midi.bleNome].filter(Boolean);
  q('midi').innerHTML = fonti.length ? `<span class="lampada accesa"></span>${testoConNome(fonti.join(' · '))}` : '';
  const corpo = q('corpo');
  const schede = schermoLive.querySelector('.lv-schede');
  q('casa-schede').after(schede);                     // prima di svuotare il corpo, le schede tornano in cima
  corpo.textContent = '';
  if (live.vista === 'live') disegnaPalcoLive(corpo); else disegnaPedaliera(corpo);
  const testa = corpo.querySelector('.lv-testa');
  if (testa) testa.querySelector('.lv-banco').after(schede);   // nel Live: banco, poi le schede
  schermoLive.querySelector('.lv-titolo').style.visibility = live.vista === 'live' ? '' : 'hidden';   // «Live» solo nel Live
  const pedali = corpo.querySelector('.lv-pedali');
  if (pedali) pedali.prepend(schede);                           // nella Pedaliera: sulla riga dei pedali
}

/** Le etichette degli switch che comandano una cosa. */
function etichetteSwitch(prova) {
  const nomi = pedaliera.switch.filter(prova).map(s => s.nome);
  return nomi.length ? `<span class="lv-tag">${testoConNome(nomi.join(' '))}</span>` : '';
}
function postoDiSwitch(s) {
  if (!s.preset || s.preset.startsWith('g:')) return -1;
  const n = +s.preset.slice(1) - 1;
  return s.preset[0] === 'm' ? live.meta * 4 + n : n;
}

function disegnaPalcoLive(corpo) {
  const banco = bancoLive();
  const attivo = postoAttivo(banco);
  const testa = document.createElement('div');
  testa.className = 'lv-testa';
  testa.innerHTML = `
    <div class="lv-banco"><button data-a="prima" title="${tr('Banco precedente')}">◀</button><b>${testoConNome(banco.nome)}</b><button data-a="dopo" title="${tr('Banco successivo')}">▶</button></div>
    <div class="lv-modo"><button data-a="preset" class="${live.stomp ? '' : 'sì'}">${tr('Preset')}</button><button data-a="stomp" class="${live.stomp ? 'sì' : ''}">${tr('Stomp')}</button></div>
    <div class="lv-suona"><small>${live.stomp ? tr('Stomp su') : tr('Suona')}</small><span>${ora ? testoConNome(ora.nome) : '—'}</span>${misuraInvio && ora && misuraInvio.nome === ora.nome
      ? `<small>${misuraInvio.chunk} chunk · ${misuraInvio.ms} ms</small>` : ''}</div>`;
  testa.querySelector('[data-a="prima"]').addEventListener('click', () => cambiaBanco(-1));
  testa.querySelector('[data-a="dopo"]').addEventListener('click', () => cambiaBanco(1));
  testa.querySelector('[data-a="preset"]').addEventListener('click', () => { live.stomp = false; disegnaLive(); });
  testa.querySelector('[data-a="stomp"]').addEventListener('click', () => { live.stomp = true; disegnaLive(); });
  corpo.appendChild(testa);

  const griglia = document.createElement('div');
  griglia.className = 'lv-griglia' + (live.stomp ? ' stomp' : '');
  if (!live.stomp) {
    banco.posti.forEach((p, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `lv-posto ${i < 4 ? 'meta-a' : 'meta-b'}${i === attivo ? ' sì' : ''}${Math.floor(i / 4) !== live.meta ? ' fuori' : ''}${p.record || p.slot !== null ? '' : ' vuoto'}`;
      const nome = p.record ? p.record.name : p.slot !== null ? tr('(da leggere)') : tr('vuoto');
      el.innerHTML = `${etichetteSwitch(s => postoDiSwitch(s) === i)}<span class="lv-num">${i < 4 ? 'A' : 'B'}${i % 4 + 1}</span>
        <span class="lv-led"></span><span class="lv-nome">${testoConNome(nome)}</span><span class="lv-sw"></span>`;
      el.addEventListener('click', () => suonaPosto(i));
      griglia.appendChild(el);
    });
  } else {
    for (const b of STOMP) {
      const e = ora && ora.effetti ? ora.effetti[b.pos] : null;
      const img = e ? immagineBlocco(e) : null;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `lv-posto blocco${e && e.enabled ? ' sì' : ''}${e ? '' : ' vuoto'}`;
      el.innerHTML = `${etichetteSwitch(s => s.stomp === b.id)}<span class="lv-num">${tr(b.nome)}</span>
        ${img ? `<img class="lv-foto" src="${img}" alt="">` : '<span class="lv-foto"></span>'}
        <span class="lv-led"></span><span class="lv-nome">${e ? testoConNome(nomeBlocco(e)) : '—'}</span>
        <span class="lv-stato">${e ? (e.enabled ? tr('acceso') : tr('spento')) : ''}</span><span class="lv-sw"></span>`;
      el.addEventListener('click', () => cambiaStomp(b.id));
      griglia.appendChild(el);
    }
  }
  corpo.appendChild(griglia);
}

/* ---------------------------------------------------------------- la pedaliera */

// Un tocco può anche fare un gesto ('g:meta', …): il nostro pedale manda solo alla pressione,
// e senza questo non arrivava mai alla seconda metà del banco.
const nomePreset = v => !v ? tr('Nessuno') : v.startsWith('g:') ? nomeGesto(v.slice(2)) : v[0] === 'p' ? (+v[1] <= 4 ? tr('Banco A · {0}', v[1]) : tr('Banco B · {0}', +v[1] - 4))
  : tr('Banco A o B · {0}', v.slice(1));
const nomeStomp = v => { if (v && v.startsWith('g:')) return nomeGesto(v.slice(2)); const b = STOMP.find(s => s.id === v); return b ? tr(b.nome) : tr('Nessuno'); };
const nomeGesto = v => (GESTI.find(g => g.id === v) || GESTI[0]).nome();
function descriviMessaggio(chiave) {
  const [tipo, canale, numero] = chiave.split(':');
  return (tipo === 'cc' ? 'CC ' : 'PC ') + numero + ' · ' + tr('canale {0}', +canale + 1);
}

function scelta(valore, vuoto, nome, voci, quando) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lv-scegli' + (valore ? '' : ' vuoto');
  b.textContent = nome(valore);
  b.addEventListener('click', () => apriTendina(b, t => {
    for (const v of voci) voceTendina(t, testoConNome(nome(v)), () => quando(v), { scelta: v === valore });
  }));
  return b;
}

function disegnaPedaliera(corpo) {
  const box = document.createElement('div');
  box.className = 'lv-ped';
  box.innerHTML = `
    <div class="lv-pedali"><div class="lv-blocco">
      <button data-a="ble" class="${midi.ble ? 'sì' : ''}">${midi.ble ? tr('Stacca {0}', testoConNome(midi.bleNome)) : tr('Collega un pedale Bluetooth')}</button>
      <button data-a="usb" class="${midi.usb ? 'sì' : ''}">${midi.usb ? tr('MIDI USB attivo') : tr('Usa i pedali USB')}</button>
    </div></div>
    <h3>${tr('Switch')}</h3>`;
  box.querySelector('[data-a="ble"]').addEventListener('click', () => (midi.ble ? staccaBle() : collegaBle()));
  box.querySelector('[data-a="usb"]').addEventListener('click', attivaUsb);

  const tab = document.createElement('table');
  tab.className = 'lv-tabella';
  tab.innerHTML = `<thead><tr><th>${tr('Switch')}</th><th>${tr('Messaggio')}</th><th>${tr('Preset · tocco')}</th><th>${tr('Stomp · tocco')}</th><th>${tr('Tenuto premuto')}</th><th></th></tr></thead>`;
  const tb = document.createElement('tbody');
  const gestiTocco = GESTI.filter(g => g.id).map(g => 'g:' + g.id);
  const voci = { preset: [null, ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => 'p' + n), ...[1, 2, 3, 4].map(n => 'm' + n), ...gestiTocco],
    stomp: [null, ...STOMP.map(s => s.id), ...gestiTocco], lungo: GESTI.map(g => g.id) };
  pedaliera.switch.forEach((s, k) => {
    const tr_ = document.createElement('tr');
    tr_.innerHTML = `<td><button class="lv-nome-sw" title="${tr('Rinomina')}">${testoConNome(s.nome)}</button></td><td class="lv-msg">${descriviMessaggio(s.chiave)}</td><td></td><td></td><td></td><td></td>`;
    const celle = tr_.querySelectorAll('td');
    const cambia = (campo, v) => { s[campo] = v; salvaPedaliera(); live.firma = ''; disegnaLive(); };
    celle[2].appendChild(scelta(s.preset, tr('Nessuno'), nomePreset, voci.preset, v => cambia('preset', v)));
    celle[3].appendChild(scelta(s.stomp, tr('Nessuno'), nomeStomp, voci.stomp, v => cambia('stomp', v)));
    celle[4].appendChild(scelta(s.lungo, tr('Nessuno'), nomeGesto, voci.lungo, v => cambia('lungo', v)));
    const togli = document.createElement('button');
    togli.textContent = tr('Togli');
    togli.addEventListener('click', () => { pedaliera.switch.splice(k, 1); salvaPedaliera(); disegnaLive(); });
    celle[5].appendChild(togli);
    celle[0].firstChild.addEventListener('click', async () => {
      const n = await chiediTesto(tr('nome dello switch'), '', s.nome);
      if (n && n.trim()) cambia('nome', n.trim().slice(0, 6));
    });
    tb.appendChild(tr_);
  });
  if (!pedaliera.switch.length) tb.innerHTML = `<tr><td colspan="6" class="lv-msg">${tr('Nessuno switch.')}</td></tr>`;
  tab.appendChild(tb);
  box.appendChild(tab);

  const piede = document.createElement('div');
  piede.className = 'lv-piede';
  const impara = document.createElement('button');
  impara.className = 'lv-impara' + (live.impara ? ' attesa' : '');
  impara.textContent = live.impara ? tr('Premi uno switch del pedale…') : tr('＋ Impara uno switch');
  impara.addEventListener('click', () => {
    if (!midi.usb && !midi.ble) { avvisa(tr('nessun pedale'), tr('Collega prima un pedale Bluetooth o attiva i pedali USB.')); return; }
    live.impara = !live.impara; disegnaLive();
  });
  const bloccoImpara = document.createElement('div');
  bloccoImpara.className = 'lv-blocco';
  bloccoImpara.appendChild(impara);
  piede.appendChild(bloccoImpara);
  piede.insertAdjacentHTML('beforeend', `<span class="lv-durata-et">${tr('Pressione lunga')}</span>`);
  const bloccoDurata = document.createElement('div');
  bloccoDurata.className = 'lv-blocco';
  piede.appendChild(bloccoDurata);
  bloccoDurata.appendChild(scelta(pedaliera.durata, '', v => tr('dopo {0} s', String(v / 1000).replace('.', ',')), DURATE,
    v => { pedaliera.durata = v; salvaPedaliera(); disegnaLive(); }));
  box.appendChild(piede);
  corpo.appendChild(box);
}

function chiediTesto(titolo, testo, valore) {
  return finestra({ titolo, testo, campo: { valore },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('OK'), valore: true, primario: true }] })
    .then(r => (r ? r.testo : null));
}

/* ---------------------------------------------------------------- il MIDI in arrivo */

/** Un messaggio arrivato, da USB o Bluetooth: status e dati. */
function arrivoMidi(stato_, d1, d2) {
  const tipo = stato_ & 0xf0, canale = stato_ & 0x0f;
  if (tipo !== 0xb0 && tipo !== 0xc0) return;
  const chiave = (tipo === 0xb0 ? 'cc' : 'pc') + ':' + canale + ':' + d1;
  const premuto = tipo === 0xc0 || d2 >= 64;

  if (live.impara && premuto) {
    live.impara = false;
    if (!pedaliera.switch.some(s => s.chiave === chiave)) {
      const n = pedaliera.switch.length;
      pedaliera.switch.push({ nome: String.fromCharCode(65 + (n % 26)), chiave, preset: n < 4 ? 'm' + (n + 1) : n === 4 ? 'g:meta' : null, stomp: null, lungo: null });
      salvaPedaliera();
    } else stato(tr('questo switch c\'è già.'));
    disegnaLive();
    return;
  }
  const s = pedaliera.switch.find(x => x.chiave === chiave);
  if (!s || !schermoLive) return;
  if (tipo === 0xc0) { tocco(s); return; }            // un Program Change non ha rilascio

  if (premuto) {
    if (midi.premuti.has(chiave)) return;
    if (!s.lungo) { midi.premuti.set(chiave, { fatto: true }); tocco(s); return; }   // niente da aspettare
    const p = { fatto: false };
    p.timer = setTimeout(() => { p.fatto = true; gesto(s.lungo); }, pedaliera.durata);
    midi.premuti.set(chiave, p);
  } else {
    const p = midi.premuti.get(chiave);
    midi.premuti.delete(chiave);
    if (p && !p.fatto) { clearTimeout(p.timer); tocco(s); }
  }
}

function tocco(s) {
  if (live.vista !== 'live') return;
  const azione = live.stomp ? s.stomp : s.preset;
  if (azione && azione.startsWith('g:')) { gesto(azione.slice(2)); return; }
  if (live.stomp) { if (s.stomp) cambiaStomp(s.stomp); }
  else { const i = postoDiSwitch(s); if (i >= 0) suonaPosto(i); }
}

function gesto(g) {
  if (g === 'stomp') live.stomp = !live.stomp;
  else if (g === 'meta') { if (!live.stomp) live.meta ^= 1; }
  else if (g === 'banco+') cambiaBanco(1);
  else if (g === 'banco-') cambiaBanco(-1);
  disegnaLive();
}

async function attivaUsb() {
  if (midi.usb) return;
  if (!navigator.requestMIDIAccess) { avvisa(tr('MIDI USB'), tr('Questo browser non ha il MIDI.')); return; }
  try {
    midi.usb = await navigator.requestMIDIAccess();
    const aggancia = () => midi.usb.inputs.forEach(i => { i.onmidimessage = e => { const d = e.data; arrivoMidi(d[0], d[1], d[2]); }; });
    aggancia();
    midi.usb.onstatechange = aggancia;
    stato(tr('pedali USB in ascolto.'), 'ok');
  } catch (err) {
    midi.usb = null;
    stato(tr('MIDI USB non disponibile: {0}', err.message), 'errore');
  }
  disegnaLive();
}

/**
 * Un pacchetto BLE MIDI: un byte di testa, poi per ogni messaggio un byte di tempo (bit alto
 * acceso) e lo status; un messaggio senza status riusa l'ultimo (running status).
 */
function leggiBleMidi(p) {
  let i = 1, status = 0;
  while (i < p.length) {
    if (p[i] & 0x80) {
      i++;                                          // il tempo
      if (i < p.length && p[i] & 0x80) status = p[i++];
    }
    if (!status || i >= p.length) break;
    const lunghi = (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
    const d1 = p[i], d2 = lunghi === 2 ? p[i + 1] : 0;
    i += lunghi;
    if (status < 0xf0) arrivoMidi(status, d1, d2);
  }
}

async function collegaBle() {
  if (!navigator.bluetooth) { avvisa(tr('Bluetooth'), tr('Questo browser non ha il Bluetooth.')); return; }
  try {
    const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: [BLE_MIDI_SERVIZIO] }] });
    const gatt = await dev.gatt.connect();
    const ch = await (await gatt.getPrimaryService(BLE_MIDI_SERVIZIO)).getCharacteristic(BLE_MIDI_DATI);
    ch.addEventListener('characteristicvaluechanged', e => leggiBleMidi(new Uint8Array(e.target.value.buffer)));
    await ch.startNotifications();
    dev.addEventListener('gattserverdisconnected', () => {
      if (midi.ble !== dev) return;
      midi.ble = null; midi.bleNome = '';
      stato(tr('il pedale Bluetooth si è staccato.'), 'errore');
      disegnaLive();
    });
    midi.ble = dev; midi.bleNome = dev.name || tr('pedale');
    stato(tr('«{0}» collegato.', midi.bleNome), 'ok');
  } catch (err) {
    if (err && err.name !== 'NotFoundError') stato(tr('pedale non collegato: {0}', err.message), 'errore');
  }
  disegnaLive();
}

function staccaBle() {
  const dev = midi.ble;
  midi.ble = null; midi.bleNome = '';
  if (dev && dev.gatt.connected) dev.gatt.disconnect();
  disegnaLive();
}

addEventListener('keydown', e => {
  if (e.key === 'Escape' && schermoLive && !tendinaAperta && !finestraAperta) chiudiSchermi();
});

$('apri-live').addEventListener('click', apriLive);
