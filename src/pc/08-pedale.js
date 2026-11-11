// Sparkling Tones — pc/08-pedale.js: il pedale ESP32, in una schermata.
//
// La stessa logica di `src/app/14-pedale.js`: il ponte si apre sul pedale (due tasti banco per 1,5 s),
// **un padrone alla volta** (mentre la pagina è collegata il pedale ha mollato l'ampli), un banco
// si manda in uno slot del pedale con `PedalePonte.invia` (frame già serializzati), l'elenco torna
// con le impronte per dire quali banchi sono cambiati nell'app, e gli spostamenti si applicano
// tutti insieme con «Aggiorna il pedale». Web Bluetooth: una operazione GATT per volta (coda).
'use strict';

const pedale = {
  device: null, comando: null, stato: null, righe: [],
  slots: [],
  partenza: new Array(PedalePonte.POSTI).fill(null),
  locale: new Array(PedalePonte.POSTI).fill(null),
  impronte: new Map(),
  banco: null,        // l'id del banco da mandare
  slotScelto: 0,      // in quale slot del pedale
};
let pedaleInviati = {};
let schermoPedale = null;

async function caricaInviatiPedale() { pedaleInviati = (await store.getSetting('pedaleInviati', {})) || {}; }
async function salvaInviatiPedale() { await store.setSetting('pedaleInviati', pedaleInviati); }

const postiDiBanco = banco => banco.posti.map(id => (id === null ? null : perId(id)));

function confrontaBancoPedale(nome, improntaPedale) {
  if (improntaPedale == null) return null;
  const banco = banchi.find(b => PedalePonte.nomeNelPedale(b.nome) === nome);
  if (!banco) return null;
  let mia;
  try { mia = PedalePonte.improntaDiBanco({ nome: banco.nome, posti: postiDiBanco(banco) }); } catch (err) { return null; }
  return { banco, cambiato: mia !== improntaPedale };
}

function banchiPedaleDaAggiornare() {
  return Object.entries(pedaleInviati)
    .map(([slot, r]) => ({ slot: Number(slot), nome: r.nome, esito: confrontaBancoPedale(r.nome, r.impronta) }))
    .filter(x => x.esito && x.esito.cambiato);
}

/** Il pallino sul tasto «Pedale»: un banco mandato al pedale è cambiato nell'app. */
function aggiornaPallinoPedale() {
  const da = banchiPedaleDaAggiornare();
  $('pallino-pedale').hidden = !da.length;
  $('apri-pedale').title = da.length ? tr('da aggiornare sul pedale: {0}', da.map(x => x.nome).join(', ')) : tr('Il pedale SparklingTones');
}

function logPedale(msg) {
  pedale.righe.push(msg);
  while (pedale.righe.length > 8) pedale.righe.shift();
  registro.push('pedale: ' + msg);
  const el = schermoPedale && schermoPedale.querySelector('[data-f="registro"]');
  if (el) el.textContent = pedale.righe.join('\n');
}

/* ---------------------------------------------------------------- la schermata */

function apriPedale(bancoId) {
  chiudiSchermi();
  if (bancoId !== undefined) pedale.banco = bancoId;
  if (!banchi.some(b => b.id === pedale.banco)) pedale.banco = banchi.length ? banchi[0].id : null;
  schermoPedale = document.createElement('div');
  schermoPedale.className = 'schermo';
  schermoPedale.innerHTML = `
    <div class="sch-cima">
      <h2>${tr('Pedale')}${aiuto('pedale')}</h2>
      <span class="spazio"></span>
      <button data-f="chiudi" title="${tr('Chiudi')}">✕</button>
    </div>
    <div class="pd-corpo">
      <div>
        <div class="pd-carta">
          <h3>${tr('Pedale SparklingTones')}</h3>
          <div class="pd-stato"><span class="lampada" data-f="lampada"></span><span data-f="stato"></span><span class="spazio"></span>
            <button class="primario" data-f="cerca">${tr('Cerca')}</button><button data-f="stacca" hidden>${tr('Stacca')}</button></div>
          <p data-f="da-aggiornare" hidden></p>
        </div>
        <div class="pd-carta" style="margin-top:16px">
          <h3>${tr('Manda un banco')}</h3>
          <div class="riga-azioni"><button class="scelta" data-f="banco" style="flex:1"></button><button class="scelta" data-f="slot"></button></div>
          <div class="riga-azioni" style="margin-top:10px"><button class="primario" data-f="manda">${tr('Manda al pedale')}</button></div>
          <p data-f="nota-banco" style="margin-top:10px"></p>
          <div class="barra-invio"><i data-f="avanzamento"></i></div>
        </div>
        <div class="pd-carta" style="margin-top:16px">
          <h3>${tr('Registro')}</h3>
          <div class="pd-registro" data-f="registro"></div>
          <button data-f="copia">${tr('Copia il log del pedale')}</button>
        </div>
      </div>
      <div class="pd-carta">
        <h3>${tr('Nel pedale')}</h3>
        <div class="riga-azioni" data-f="tutti" hidden style="margin-bottom:10px"><span data-f="testo-tutti" style="flex:1;color:var(--ambra)"></span>
          <button class="primario" data-f="aggiorna-tutti">${tr('Aggiorna tutti')}</button></div>
        <div data-f="slots"></div>
        <div class="riga-azioni" data-f="modifiche" hidden style="margin-top:10px"><span style="flex:1;color:var(--ambra)">${tr('Ci sono spostamenti non ancora applicati al pedale.')}</span>
          <button data-f="annulla">${tr('Annulla')}</button><button class="primario" data-f="applica">${tr('Aggiorna il pedale')}</button></div>
      </div>
    </div>`;
  document.body.appendChild(schermoPedale);
  const q = f => schermoPedale.querySelector(`[data-f="${f}"]`);
  q('chiudi').addEventListener('click', chiudiSchermi);
  q('cerca').addEventListener('click', collegaPedale);
  q('stacca').addEventListener('click', () => { if (pedale.device && pedale.device.gatt.connected) pedale.device.gatt.disconnect(); });
  q('manda').addEventListener('click', async () => {
    const banco = banchi.find(b => b.id === pedale.banco);
    if (!banco) return;
    q('manda').disabled = true;
    await mandaBanco(banco, pedale.slotScelto);
    disegnaPedale();
  });
  q('banco').addEventListener('click', () => apriTendina(q('banco'), t => {
    if (!banchi.length) voceTendina(t, tr('nessun banco: creane uno in «Banchi»'), () => {});
    for (const b of banchi) {
      voceTendina(t, testoConNome(tr('{0} — {1} preset', b.nome, postiDiBanco(b).filter(Boolean).length)),
        () => { pedale.banco = b.id; disegnaPedale(); }, { scelta: b.id === pedale.banco });
    }
  }));
  q('slot').addEventListener('click', () => apriTendina(q('slot'), t => {
    for (let s = 0; s < PedalePonte.POSTI; s++) {
      const dentro = pedale.locale[s];
      voceTendina(t, testoConNome(tr('slot {0}', s + 1) + (dentro ? ' · ' + dentro.nome : '')),
        () => { pedale.slotScelto = s; disegnaPedale(); }, { scelta: s === pedale.slotScelto });
    }
  }));
  q('aggiorna-tutti').addEventListener('click', aggiornaTuttiPedale);
  q('applica').addEventListener('click', applicaAlPedale);
  q('annulla').addEventListener('click', ripartiDaPedale);
  q('copia').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pedale.righe.join('\n')); q('copia').textContent = tr('copiato'); }
    catch (err) { q('copia').textContent = tr('non riesco a copiare'); }
    setTimeout(() => { if (schermoPedale) q('copia').textContent = tr('Copia il log del pedale'); }, 2000);
  });
  disegnaPedale();
}

function chiudiPedale() {
  if (schermoPedale) { schermoPedale.remove(); schermoPedale = null; }
}

function daApplicare() {
  for (let s = 0; s < PedalePonte.POSTI; s++) {
    const a = pedale.locale[s], b = pedale.partenza[s];
    if ((a ? a.slot : -1) !== (b ? b.slot : -1)) return true;
  }
  return false;
}

function disegnaPedale() {
  aggiornaPallinoPedale();
  if (!schermoPedale) return;
  const q = f => schermoPedale.querySelector(`[data-f="${f}"]`);
  const su = !!pedale.comando;
  q('lampada').classList.toggle('on', su);
  q('stato').textContent = su ? tr('collegato: {0}', pedale.device.name || tr('pedale')) : (pedale.cercando ? tr('ricerca…') : tr('non collegato'));
  q('cerca').hidden = su;
  q('stacca').hidden = !su;
  q('registro').textContent = pedale.righe.join('\n');

  const da = banchiPedaleDaAggiornare();
  q('da-aggiornare').hidden = !(da.length && !su);
  q('da-aggiornare').textContent = da.length === 1
    ? tr('«{0}» è cambiato nell\'app: collegati al pedale e aggiornalo.', da[0].nome)
    : tr('{0} banchi sono cambiati nell\'app ({1}): collegati al pedale e aggiornali.', da.length, da.map(x => x.nome).join(', '));

  const banco = banchi.find(b => b.id === pedale.banco) || null;
  const quanti = banco ? postiDiBanco(banco).filter(Boolean).length : 0;
  q('banco').textContent = banco ? tr('{0} — {1} preset', banco.nome, quanti) : tr('nessun banco');
  q('slot').textContent = tr('slot {0}', pedale.slotScelto + 1);
  q('nota-banco').textContent = '';
  q('manda').disabled = !(su && banco && quanti);

  const cont = q('slots');
  cont.textContent = '';
  let cambiati = 0;
  for (let s = 0; s < PedalePonte.POSTI; s++) {
    const v = pedale.locale[s];
    const riga = document.createElement('div');
    riga.className = 'pd-riga' + (v ? '' : ' vuoto');
    riga.innerHTML = `<span class="n">${s + 1}</span>`;
    const naming = document.createElement('div');
    naming.className = 'nome';
    naming.innerHTML = `<div>${testoConNome(v ? v.nome : (su ? tr('vuoto') : '—'))}</div>`;
    riga.appendChild(naming);
    if (v) {
      const esito = confrontaBancoPedale(v.nome, v.impronta);
      const vecchio = !!(esito && esito.cambiato);
      if (vecchio) cambiati++;
      naming.insertAdjacentHTML('beforeend', `<div class="sotto${vecchio ? ' cambiato' : ''}">${vecchio ? tr('cambiato nell\'app') : tr('{0} preset', v.pieni)}</div>`);
      if (vecchio) {
        const agg = document.createElement('button');
        agg.textContent = tr('Aggiorna');
        agg.disabled = !su || daApplicare();
        agg.addEventListener('click', () => mandaBanco(esito.banco, v.slot));
        riga.appendChild(agg);
      }
      const suona = document.createElement('button');
      suona.textContent = '▶';
      suona.disabled = !su || daApplicare();
      suona.title = daApplicare() ? tr('prima aggiorna il pedale') : tr('fai suonare questo banco');
      suona.addEventListener('click', () => comandoPedale(PedalePonte.CMD.USA, s));
      const altro = document.createElement('button');
      altro.textContent = '⋯';
      altro.title = tr('altre azioni');
      altro.addEventListener('click', () => apriTendina(altro, t => {
        const scambia = verso => () => {
          const dove = s + verso, x = pedale.locale[s];
          pedale.locale[s] = pedale.locale[dove];
          pedale.locale[dove] = x;
          disegnaPedale();
        };
        if (s > 0) voceTendina(t, tr('Sposta su'), scambia(-1));
        if (s < PedalePonte.POSTI - 1) voceTendina(t, tr('Sposta giù'), scambia(+1));
        voceTendina(t, tr('Togli dal pedale'), () => { pedale.locale[s] = null; disegnaPedale(); }, { classe: 'pericolo' });
      }, { destra: true }));
      riga.append(suona, altro);
    }
    cont.appendChild(riga);
  }
  q('tutti').hidden = cambiati < 2;
  q('testo-tutti').textContent = tr('{0} banchi sono cambiati nell\'app', cambiati);
  q('aggiorna-tutti').disabled = !su || daApplicare();
  const cambiato = daApplicare();
  q('modifiche').hidden = !cambiato;
  q('applica').disabled = !cambiato || !su;
}

function ripartiDaPedale() {
  const perSlot = new Map(pedale.slots.map(v => [v.slot, v]));
  pedale.partenza = Array.from({ length: PedalePonte.POSTI }, (_, s) => perSlot.get(s) || null);
  pedale.locale = pedale.partenza.slice();
  disegnaPedale();
}

/** Prima le eliminazioni, poi la permutazione con scambi, simulando lo stato del pedale. */
async function applicaAlPedale() {
  const st = pedale.partenza.map(v => (v ? v.slot : null));
  const voluto = pedale.locale.map(v => (v ? v.slot : null));
  const comandi = [];
  for (let s = 0; s < PedalePonte.POSTI; s++) {
    if (st[s] !== null && !voluto.includes(st[s])) { comandi.push([PedalePonte.CMD.CANCELLA, s]); st[s] = null; }
  }
  for (let i = 0; i < PedalePonte.POSTI; i++) {
    if (voluto[i] === null || st[i] === voluto[i]) continue;
    const j = st.indexOf(voluto[i]);
    if (j < 0) continue;
    comandi.push([PedalePonte.CMD.SCAMBIA, i, j]);
    const x = st[i]; st[i] = st[j]; st[j] = x;
  }
  if (!comandi.length) { logPedale(tr('niente da applicare')); return; }
  logPedale(tr('applico {0} modifiche…', comandi.length));
  for (const c of comandi) await comandoPedale(...c);
  await comandoPedale(PedalePonte.CMD.ELENCA);
}

let codaPedale = Promise.resolve();
function inCodaPedale(lavoro) {
  codaPedale = codaPedale.then(lavoro, lavoro);
  return codaPedale;
}

function comandoPedale(...byte) {
  if (!pedale.comando) { logPedale(tr('non collegato al pedale')); return Promise.resolve(); }
  return inCodaPedale(async () => {
    try {
      await pedale.comando.writeValueWithResponse(new Uint8Array(byte));
      logPedale('→ ' + byte.map(b => b.toString(16).padStart(2, '0')).join(' '));
    } catch (err) {
      logPedale(tr('comando fallito: {0}', err.message));
    }
  });
}

function rispostaPedale(e) {
  const dv = e.target.value;
  const v = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const testo = new TextDecoder().decode(v.subarray(1));
  if (v[0] === 0x83) {
    const { slot, impronta } = PedalePonte.leggiImpronta(testo);
    pedale.impronte.set(slot, impronta);
    return;
  }
  if (v[0] === 0x82) {
    pedale.slots = PedalePonte.leggiElenco(testo).map(s =>
      Object.assign(s, { impronta: pedale.impronte.has(s.slot) ? pedale.impronte.get(s.slot) : null }));
    if (pedale.impronte.size) {
      pedaleInviati = {};
      for (const s of pedale.slots) if (s.impronta != null) pedaleInviati[s.slot] = { nome: s.nome, impronta: s.impronta };
      salvaInviatiPedale();
    }
    pedale.impronte = new Map();
    logPedale(tr('elenco: {0} slot occupati', pedale.slots.length));
    ripartiDaPedale();
    return;
  }
  logPedale('← ' + testo);
  if (v[0] === 0x81 && /salvato/.test(testo)) comandoPedale(PedalePonte.CMD.ELENCA);
}

async function collegaPedale() {
  if (!navigator.bluetooth) { logPedale(tr('questo browser non parla col Bluetooth')); return; }
  try {
    pedale.cercando = true;
    disegnaPedale();
    pedale.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PedalePonte.SERVIZIO] }], optionalServices: [PedalePonte.SERVIZIO] });
    pedale.device.addEventListener('gattserverdisconnected', () => {
      pedale.comando = pedale.stato = null;
      pedale.slots = [];
      ripartiDaPedale();
      logPedale(tr('staccato — il pedale si riprende l\'ampli da solo'));
    });
    const server = await pedale.device.gatt.connect();
    const servizio = await server.getPrimaryService(PedalePonte.SERVIZIO);
    pedale.comando = await servizio.getCharacteristic(PedalePonte.COMANDO);
    pedale.stato = await servizio.getCharacteristic(PedalePonte.STATO);
    await pedale.stato.startNotifications();
    pedale.stato.addEventListener('characteristicvaluechanged', rispostaPedale);
    logPedale(tr('collegato — da adesso il pedale ha mollato l\'ampli'));
    await comandoPedale(PedalePonte.CMD.ELENCA);
  } catch (err) {
    const scelto = /cancel|chosen|user/i.test(err.message);
    logPedale(tr('connessione fallita: {0}', err.message) +
      (scelto ? tr(' — se nell\'elenco non c\'era nessun pedale, apri il ponte: due tasti banco insieme per un secondo e mezzo') : ''));
  }
  pedale.cercando = false;
  disegnaPedale();
}

async function mandaBanco(banco, slot) {
  const posti = postiDiBanco(banco);
  await inCodaPedale(async () => {
    try {
      const t0 = performance.now();
      const barra = schermoPedale && schermoPedale.querySelector('[data-f="avanzamento"]');
      const byte = await PedalePonte.invia(pedale.comando, { nome: banco.nome, posti }, slot,
        (fatti, totale) => { if (barra) barra.style.width = Math.round(fatti / totale * 100) + '%'; });
      logPedale(tr('"{0}" → slot {1}: {2} byte in {3} ms', banco.nome, slot + 1, byte, Math.round(performance.now() - t0)));
      pedaleInviati[slot] = { nome: PedalePonte.nomeNelPedale(banco.nome), impronta: PedalePonte.improntaDiBanco({ nome: banco.nome, posti }) };
      await salvaInviatiPedale();
      if (barra) barra.style.width = '0';
    } catch (err) {
      logPedale(tr('invio fallito: {0}', err.message));
    }
  });
  disegnaPedale();
}

async function aggiornaTuttiPedale() {
  const da = pedale.partenza.map(v => v && { v, esito: confrontaBancoPedale(v.nome, v.impronta) })
    .filter(x => x && x.esito && x.esito.cambiato);
  for (const { v, esito } of da) await mandaBanco(esito.banco, v.slot);
}

$('apri-pedale').addEventListener('click', () => apriPedale());
// `hidden` non basta sui bottoni della barra: il loro display lo batte.
function mostraSezionePedale() { $('apri-pedale').style.display = haPedale() ? '' : 'none'; }
mostraSezionePedale();
