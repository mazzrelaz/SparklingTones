// Sparkling Tones — 16-genera-ia.js: un preset da una descrizione, con l'IA.
// Un pezzo dello script dell'app, caricato in fila dopo gli altri come
// script classico (vedi 01-avvio.js).
'use strict';

/* ====================================================================
   Genera con l'IA (17 ottobre 2026)

   L'utente scrive che suono vuole; l'IA risponde con un JSON a forma
   fissa — un modello per ognuno dei sette blocchi, acceso o spento, e le
   manopole — e il preset lo costruiamo noi, **partendo da uno vero della
   libreria**, come il Duplica: un preset nuovo non parte mai dal nulla.

   L'IA sceglie solo fra i modelli di `SparkEffetti.MODELLI` (sono un `enum`
   nello schema, e prima dell'invio `controllaPreset` li ricontrolla): un
   nome che l'ampli non ha lo pianta. Il numero di parametri di ogni blocco
   non lo decide l'IA: si copia da un blocco uscito dall'ampli
   (`campioneModello`), o si prende dalla tabella, come nell'editor.

   Due servizi, a scelta dell'utente: OpenAI o Anthropic. Le chiavi sono
   sue e restano in questo browser (`localStorage`), una per servizio:
   l'app non ha un server. Si chiamano con `fetch`, senza le loro librerie,
   perché l'app non ha dipendenze né build.
   ==================================================================== */

// I modelli che si possono scegliere, tre per servizio (nomi verificati sulla
// loro documentazione il 17 ottobre 2026). Il costo è misurato su Sol — un
// preset, 4.407 token, 1 centesimo scalato dai crediti — e per gli altri è la
// stessa richiesta coi loro prezzi per token: Luna e Haiku un ventesimo,
// Sonnet uguale, Opus il doppio. Astra provato dall'utente: 7-8 centesimi, più
// dei cinque dei prezzi, perché ragiona più a lungo; per Opus si dice 2-3.
const SERVIZI_IA = {
  openai: {
    nome: 'OpenAI',
    chiave: 'openai-chiave', chiaveModello: 'openai-modello',
    predefinito: 'gpt-6.1-sol',
    modelli: ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra'],
  },
  anthropic: {
    nome: 'Anthropic',
    chiave: 'anthropic-chiave', chiaveModello: 'anthropic-modello',
    predefinito: 'claude-opus-5-5',
    modelli: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'],
  },
};
const CHIAVE_SERVIZIO_IA = 'ia-servizio';
const TEMPO_MAX_IA_MS = 120000;

// I sette blocchi, nell'ordine di `Spark.CATENA`: sono le chiavi del JSON.
const POSTI_IA = ['gate', 'comp', 'drive', 'ampli', 'modulazione', 'delay', 'riverbero'];

let generato = null;          // { record, spiegazione } dell'ultima risposta

function leggiIA(chiave) {
  try { return localStorage.getItem(chiave) || ''; } catch (e) { return ''; }
}
function scriviIA(chiave, valore) {
  try {
    if (valore) localStorage.setItem(chiave, valore);
    else localStorage.removeItem(chiave);
  } catch (e) { /* resta per questa volta */ }
}

/** Il servizio scelto: 'openai' finché l'utente non sceglie altro. */
function servizioIA() {
  const scelto = leggiIA(CHIAVE_SERVIZIO_IA);
  return SERVIZI_IA[scelto] ? scelto : 'openai';
}
function modelloIA(servizio = servizioIA()) {
  const voce = SERVIZI_IA[servizio];
  const scelto = leggiIA(voce.chiaveModello);
  return voce.modelli.includes(scelto) ? scelto : voce.predefinito;
}
function chiaveIA(servizio = servizioIA()) {
  return leggiIA(SERVIZI_IA[servizio].chiave);
}

/** Il nome breve di un modello, come sta scritto nel suo tasto. */
function nomeModelloIA(modello) {
  const tasto = document.querySelector(`[data-modello="${modello}"] .imp-etichetta`);
  return tasto ? tasto.textContent.replace(/ ·.*$/, '') : modello;
}

/**
 * Le impostazioni dell'IA come stanno adesso: il servizio acceso, i modelli
 * di quel servizio, la sua chiave nel campo, e la riga riassuntiva in alto.
 */
function segnaImpostazioniIA() {
  const servizio = servizioIA();
  for (const tasto of document.querySelectorAll('#sceltaServizioIA [data-servizio]')) {
    tasto.classList.toggle('primary', tasto.dataset.servizio === servizio);
  }
  for (const gruppo of document.querySelectorAll('[data-modelli-di]')) {
    gruppo.hidden = gruppo.dataset.modelliDi !== servizio;
  }
  for (const tasto of document.querySelectorAll('[data-modello]')) {
    tasto.classList.toggle('scelto', tasto.dataset.modello === modelloIA(tasto.closest('[data-modelli-di]').dataset.modelliDi));
  }
  for (const nota of document.querySelectorAll('[data-chiave-di]')) {
    nota.hidden = nota.dataset.chiaveDi !== servizio;
  }
  $('chiaveIA').value = chiaveIA();
  $('riassuntoIA').textContent = `${SERVIZI_IA[servizio].nome} · ${nomeModelloIA(modelloIA())}`;
  $('statoChiaveIA').textContent = chiaveIA() ? tr('chiave salvata') : tr('manca la chiave');
  $('statoChiaveIA').classList.toggle('manca', !chiaveIA());
}

/** Apre o chiude una delle due parti che stanno sotto: le impostazioni o la spiegazione. */
function apriParteIA(id, aperta) {
  const parte = $(id);
  parte.hidden = aperta === undefined ? !parte.hidden : !aperta;
  document.querySelector(`[aria-controls="${id}"]`).classList.toggle('aperto', !parte.hidden);
}

/**
 * I modelli che l'IA può scegliere in una posizione: quelli di `MODELLI`,
 * senza gli Hendrix se il pacchetto non c'è, e solo quelli di cui sappiamo
 * quante manopole hanno (o che stanno già in un preset della libreria).
 */
function modelliPerIA(posizione) {
  return SparkEffetti.MODELLI[posizione].filter(id =>
    (haHendrix() || !SparkEffetti.eHendrix(id)) &&
    (SparkEffetti.quanteManopole(id) > 0 || campioneModello(id)));
}

/** Il catalogo che si manda all'IA: per ogni modello, il nome e le manopole per indice. */
function catalogoPerIA() {
  const righe = [];
  POSTI_IA.forEach((chiave, posizione) => {
    righe.push('', `## ${chiave}`);
    for (const id of modelliPerIA(posizione)) {
      const voce = SparkEffetti.TABELLA[id] || {};
      const manopole = (voce.manopole || []).map((nome, i) => {
        const nomi = SparkEffetti.nomiPosizioni(id, i);
        const quante = SparkEffetti.posizioni(id, i);
        if (nomi) {
          return `${i} ${nome} [choice: ${nomi.map((n, k) =>
            `${SparkEffetti.valorePosizione(k)}=${n}`).join(', ')}]`;
        }
        if (quante) {
          return `${i} ${nome} [choice: ${Array.from({ length: quante },
            (_, k) => SparkEffetti.valorePosizione(k)).join(', ')}]`;
        }
        if (SparkEffetti.interruttore(id, i)) return `${i} ${nome} [switch: 0 or 1]`;
        return `${i} ${nome}`;
      });
      const reale = SparkEffetti.ampliReale(id);
      righe.push(`- ${id}: ${SparkEffetti.nome(id)}${reale ? ' (' + reale + ')' : ''}` +
                 ` — knobs: ${manopole.join(', ') || '(none known)'}`);
    }
  });
  return righe.join('\n');
}

function istruzioniIA() {
  const lingua = Lingua.attuale === 'en' ? 'English' : 'Italian';
  return [
    'You design guitar tones for a Positive Grid Spark 2 amplifier.',
    'The signal chain has exactly seven blocks, in this order: gate, comp, drive,',
    'ampli, modulazione, delay, riverbero. For each block choose one model from the',
    'catalog below (use its id exactly), whether it is on, and its knob values.',
    '',
    'Knob values go from 0 to 1 (0.5 is the middle), and the "manopole" array lists',
    'them in index order: manopole[0] is knob 0, manopole[1] is knob 1, and so on.',
    'Give exactly as many values as the model has knobs. For a [choice] knob use one',
    'of the listed values; for a [switch] use 0 or 1. Blocks that are off still need',
    'a model and sensible values.',
    '',
    'Aim for a tone that really works with a guitar plugged in: reasonable master',
    'volume (not above 0.7), effects mixed with taste. "nome" is a short preset name',
    `(max 20 characters); "spiegazione" is one or two sentences in ${lingua} saying`,
    'what you chose and why. "bpm" is the tempo for the delay (60-200).',
    '',
    '# Catalog',
    catalogoPerIA(),
  ].join('\n');
}

/** Lo schema della risposta: le chiavi fisse e, per ogni blocco, l'elenco dei modelli ammessi. */
function schemaIA() {
  const blocco = posizione => ({
    type: 'object', additionalProperties: false,
    required: ['modello', 'acceso', 'manopole'],
    properties: {
      modello:  { type: 'string', enum: modelliPerIA(posizione) },
      acceso:   { type: 'boolean' },
      manopole: { type: 'array', items: { type: 'number' } },
    },
  });
  const properties = { nome: { type: 'string' }, spiegazione: { type: 'string' },
                       bpm: { type: 'number' } };
  POSTI_IA.forEach((chiave, posizione) => { properties[chiave] = blocco(posizione); });
  return { type: 'object', additionalProperties: false,
           required: Object.keys(properties), properties };
}

/**
 * Una `fetch` con un tempo massimo: oltre, si smette di aspettare e si dice
 * perché, invece di lasciare il tasto spento per sempre.
 */
async function fetchIA(url, opzioni, servizio) {
  const ferma = new AbortController();
  const timer = setTimeout(() => ferma.abort(), TEMPO_MAX_IA_MS);
  try {
    const risposta = await fetch(url, Object.assign({ signal: ferma.signal }, opzioni));
    return { risposta, dati: await risposta.json().catch(() => null) };
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? tr('{0} non ha risposto in due minuti.', servizio)
      : tr('non riesco a raggiungere {0}: controlla la connessione.', servizio));
  } finally {
    clearTimeout(timer);
  }
}

/** Il testo della risposta, letto come JSON, o un errore da mostrare. */
function leggiJsonIA(testo, servizio) {
  try { return JSON.parse(testo); } catch (e) {
    throw new Error(tr('la risposta di {0} non è un preset leggibile.', servizio));
  }
}

/** L'errore HTTP detto in parole: chiave sbagliata, crediti finiti, il resto. */
function erroreIA(risposta, dati, servizio) {
  const perche = (dati && dati.error && dati.error.message) || risposta.status;
  if (risposta.status === 401) return new Error(tr('{0} non accetta la chiave: controllala.', servizio));
  if (risposta.status === 429) {
    return new Error(tr('{0} dice che le richieste sono troppe o che i crediti sono ' +
                        'finiti: {1}', servizio, perche));
  }
  if (/credit|balance|quota/i.test(String(perche))) {
    return new Error(tr('{0} dice che i crediti sono finiti: {1}', servizio, perche));
  }
  return new Error(tr('{0} ha risposto con un errore: {1}', servizio, perche));
}

/** La domanda a OpenAI (Responses API, risposta con lo schema). */
async function chiediAOpenAI(descrizione, chiave, modello) {
  const { risposta, dati } = await fetchIA('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chiave },
    body: JSON.stringify({
      model: modello,
      instructions: istruzioniIA(),
      input: descrizione,
      text: { format: { type: 'json_schema', name: 'preset_spark', strict: true,
                        schema: schemaIA() } },
    }),
  }, 'OpenAI');
  if (!risposta.ok) throw erroreIA(risposta, dati, 'OpenAI');

  // Il testo della risposta sta nei blocchi `output_text` dei messaggi in uscita.
  let testo = dati && dati.output_text;
  if (!testo && dati && Array.isArray(dati.output)) {
    for (const uscita of dati.output) {
      for (const pezzo of (uscita.content || [])) {
        if (pezzo.type === 'output_text' && pezzo.text) testo = pezzo.text;
        if (pezzo.type === 'refusal') throw new Error(tr('OpenAI non ha voluto rispondere.'));
      }
    }
  }
  return leggiJsonIA(testo, 'OpenAI');
}

/**
 * La domanda ad Anthropic (Messages API, risposta con lo schema in
 * `output_config.format`). Dal browser serve l'intestazione apposta: senza,
 * Anthropic rifiuta le chiamate che non vengono da un server.
 *
 * Su Opus e Sonnet è acceso il ripiego (`fallbacks: "default"`): se il
 * modello rifiuta la richiesta — per un suono di chitarra è difficile, ma
 * succede — la rifà un altro modello nella stessa chiamata. Haiku non ce l'ha.
 */
async function chiediAdAnthropic(descrizione, chiave, modello) {
  const conRipiego = modello !== 'claude-haiku-5-5';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': chiave,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (conRipiego) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  const corpo = {
    model: modello,
    max_tokens: 16000,
    system: istruzioniIA(),
    messages: [{ role: 'user', content: descrizione }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: schemaIA() } },
  };
  if (conRipiego) corpo.fallbacks = 'default';

  const { risposta, dati } = await fetchIA('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers, body: JSON.stringify(corpo),
  }, 'Anthropic');
  if (!risposta.ok) throw erroreIA(risposta, dati, 'Anthropic');

  // Prima il motivo dello stop, poi il contenuto: un rifiuto arriva con 200.
  if (dati.stop_reason === 'refusal') throw new Error(tr('Anthropic non ha voluto rispondere.'));
  if (dati.stop_reason === 'max_tokens') {
    throw new Error(tr('la risposta di Anthropic si è interrotta a metà: riprova.'));
  }
  const testo = (dati.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return leggiJsonIA(testo, 'Anthropic');
}

/** La domanda al servizio scelto. Torna l'oggetto della risposta, o lancia un errore da mostrare. */
function chiediAllIA(descrizione) {
  const servizio = servizioIA();
  const chiedi = servizio === 'anthropic' ? chiediAdAnthropic : chiediAOpenAI;
  return chiedi(descrizione, chiaveIA(servizio), modelloIA(servizio));
}

/** Lo scheletro: un preset della libreria uscito dall'ampli, meglio se sta in uno slot. */
function scheletroPerIA() {
  const buoni = tutti.filter(r => Array.isArray(r.effects) && r.effects.length === 7 &&
    !Spark.controllaPreset(r, { modelli: SparkEffetti.MODELLI.flat() }).errori.length);
  return buoni.find(r => (r.slots || []).length) || buoni[0] || null;
}

/** Un valore dell'IA portato dentro quello che la manopola accetta. */
function valoreSicuro(id, indice, valore) {
  let v = Math.min(1, Math.max(0, valore));
  if (SparkEffetti.interruttore(id, indice)) return v >= 0.5 ? 1 : 0;
  const quante = SparkEffetti.posizioni(id, indice);
  if (quante) {
    return SparkEffetti.valorePosizione(Math.min(quante - 1, Math.max(0, Math.round(v * 10))));
  }
  return Math.round(v * 1000) / 1000;
}

/** Il preset costruito dalla risposta, sopra lo scheletro. Non si salva: lo fa «Salva». */
function presetDaIA(risposta, scheletro, descrizione) {
  const avvisi = [];
  const effetti = scheletro.effects.map((originale, posizione) => {
    const base = { name: originale.name, enabled: originale.enabled,
                   params: (originale.params || []).map(p => ({ index: p.index, value: p.value })) };
    const scelta = risposta[POSTI_IA[posizione]];
    if (!scelta || !modelliPerIA(posizione).includes(scelta.modello)) {
      avvisi.push(tr('{0}: modello non valido, resta quello di partenza', Spark.CATENA[posizione]));
      return base;
    }

    // Prima si copia, poi si costruisce: come il cambio di modello nell'editor.
    let blocco = base;
    if (scelta.modello !== originale.name) {
      const campione = campioneModello(scelta.modello);
      const quante = SparkEffetti.quanteManopole(scelta.modello);
      if (campione) blocco = { name: scelta.modello, enabled: true, params: campione.params };
      else blocco = { name: scelta.modello, enabled: true,
                      params: Array.from({ length: quante }, (_, i) => ({ index: i, value: 0.5 })) };
    }
    blocco.enabled = !!scelta.acceso;

    const voce = SparkEffetti.TABELLA[blocco.name] || {};
    const manopole = (voce.manopole || []).length;
    (scelta.manopole || []).slice(0, manopole).forEach((valore, i) => {
      const param = blocco.params.find(p => p.index === i);
      if (param && typeof valore === 'number' && Number.isFinite(valore)) {
        param.value = valoreSicuro(blocco.name, i, valore);
      }
    });
    // Il parametro in più di noise gate e riverbero è il loro acceso/spento.
    if (voce.quante !== undefined) {
      const interruttore = blocco.params.find(p => p.index === voce.quante);
      if (interruttore) interruttore.value = blocco.enabled ? 1 : 0;
    }
    return blocco;
  });

  const record = Object.assign({}, scheletro);
  for (const campo of ['id', 'order', 'createdAt', 'updatedAt', 'slot', 'famiglia']) delete record[campo];
  const bpm = Number(risposta.bpm);
  Object.assign(record, {
    uuid: nuovoUuidIA(),
    name: nomeLiberoIA(String(risposta.nome || '').trim() || tr('Preset IA')),
    effects: effetti,
    bpm: Number.isFinite(bpm) ? Math.min(250, Math.max(40, Math.round(bpm))) : scheletro.bpm,
    slots: [], tags: [], favorite: false,
    notes: tr('Generato con l\'IA da: «{0}»', descrizione),
  });
  return { record, avvisi };
}

function nuovoUuidIA() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(n => n.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
         '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}

/** Un nome che in libreria non c'è ancora: «Blues» → «Blues 2», «Blues 3»… */
function nomeLiberoIA(nome) {
  const presi = new Set(tutti.map(r => PresetStore.chiaveNome(r.name)));
  let proposto = nome.slice(0, 24);
  for (let n = 2; presi.has(PresetStore.chiaveNome(proposto)); n++) proposto = `${nome.slice(0, 21)} ${n}`;
  return proposto;
}

/** La catena del preset generato, una riga per blocco, coi nomi leggibili. */
function disegnaGenerato() {
  const box = $('risultatoIA');
  if (!generato) { box.hidden = true; return; }
  const { record, spiegazione } = generato;
  $('nomeIA').textContent = record.name;
  $('motivoIA').textContent = spiegazione || '';
  const catena = $('catenaIA');
  catena.innerHTML = '';
  record.effects.forEach((effetto, posizione) => {
    const riga = document.createElement('div');
    riga.className = 'imp-voce riga-ia' + (effetto.enabled ? '' : ' spento');
    const dove = document.createElement('span');
    dove.className = 'imp-nota';
    dove.textContent = Spark.CATENA[posizione];
    const cosa = document.createElement('span');
    cosa.className = 'imp-etichetta';
    const reale = SparkEffetti.ampliReale(effetto.name);
    cosa.textContent = SparkEffetti.nome(effetto.name) + (reale ? ` · ${reale}` : '') +
                       (effetto.enabled ? '' : tr(' (spento)'));
    riga.append(dove, cosa);
    catena.appendChild(riga);
  });
  box.hidden = false;
}

async function generaConIA() {
  const descrizione = $('descrizioneIA').value.trim();
  if (!descrizione) { statoDelPannello(tr('scrivi prima che suono vuoi.')); return; }
  if (!chiaveIA()) {
    apriParteIA('impostazioniIA', true);
    statoDelPannello(tr('serve la chiave di {0}: mettila in «Servizio e chiave», qui sotto.',
                        SERVIZI_IA[servizioIA()].nome));
    return;
  }
  const scheletro = scheletroPerIA();
  if (!scheletro) {
    statoDelPannello(tr('serve almeno un preset in libreria da cui partire: collega ' +
                        'l\'ampli una volta, i suoi otto si leggono da soli.'));
    return;
  }

  const tasto = $('btnGeneraIA');
  tasto.disabled = true;
  tasto.classList.add('in-corso');
  const chi = `${SERVIZI_IA[servizioIA()].nome} · ${nomeModelloIA(modelloIA())}`;
  logProgress(tr('chiedo a {0}…', chi));
  try {
    const risposta = await chiediAllIA(descrizione);
    const { record, avvisi } = presetDaIA(risposta, scheletro, descrizione);
    generato = { record, spiegazione: String(risposta.spiegazione || '') };
    disegnaGenerato();
    $('risultatoIA').scrollIntoView({ behavior: 'smooth', block: 'start' });
    logLine(tr('«{0}» pronto ({1}), partendo da «{2}».', record.name, chi, scheletro.name) +
            (avvisi.length ? ' ' + avvisi.join('; ') : ''));
  } catch (e) {
    logLine(e.message, true);
  } finally {
    tasto.disabled = false;
    tasto.classList.remove('in-corso');
  }
}

$('btnMenuGeneraIA').addEventListener('click', () => {
  apriPannello('pannelloGeneraIA');
  segnaImpostazioniIA();
  // Senza chiave le impostazioni si aprono da sole: è la prima cosa da fare.
  apriParteIA('impostazioniIA', !chiaveIA());
  apriParteIA('comeFunzionaIA', false);
  disegnaGenerato();
});
$('btnApriImpostazioniIA').addEventListener('click', () => apriParteIA('impostazioniIA'));
$('btnApriSpiegazioneIA').addEventListener('click', () => apriParteIA('comeFunzionaIA'));
for (const tasto of document.querySelectorAll('#sceltaServizioIA [data-servizio]')) {
  tasto.addEventListener('click', () => {
    scriviIA(CHIAVE_SERVIZIO_IA, tasto.dataset.servizio);
    segnaImpostazioniIA();
  });
}
for (const tasto of document.querySelectorAll('[data-modello]')) {
  tasto.addEventListener('click', () => {
    const servizio = tasto.closest('[data-modelli-di]').dataset.modelliDi;
    scriviIA(SERVIZI_IA[servizio].chiaveModello, tasto.dataset.modello);
    segnaImpostazioniIA();
  });
}
// La chiave si salva appena la si incolla: niente tasto «Salva» da dimenticare.
$('chiaveIA').addEventListener('input', () => {
  scriviIA(SERVIZI_IA[servizioIA()].chiave, $('chiaveIA').value.trim());
  segnaImpostazioniIA();
});
$('btnGeneraIA').addEventListener('click', generaConIA);
$('btnSuonaIA').addEventListener('click', () => {
  if (!generato) return;
  if (!spark.connected) return logLine(senzaAmpli(tr('sentire il preset')));
  mandaPreset(generato.record, null);
});
$('btnSalvaIA').addEventListener('click', async () => {
  if (!generato) return;
  const id = await store.add(Object.assign({}, generato.record));
  logLine(tr('«{0}» salvato in libreria.', generato.record.name));
  generato = null;
  await ricarica();
  chiudiPannelli();
  if (location.hash === '#live') location.hash = '#preset';
  vista.aperto = id + ':null';
  disegnaPreset();
});
$('btnDimenticaIA').addEventListener('click', () => {
  scriviIA(SERVIZI_IA[servizioIA()].chiave, '');
  segnaImpostazioniIA();
  statoDelPannello(tr('chiave di {0} tolta da questo apparecchio.', SERVIZI_IA[servizioIA()].nome));
});
