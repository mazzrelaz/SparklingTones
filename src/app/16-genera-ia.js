// Sparkling Tones — 16-genera-ia.js: un preset da una descrizione, con l'IA.
// Un pezzo dello script dell'app, caricato in fila dopo gli altri come
// script classico (vedi 01-avvio.js).
'use strict';

/* ====================================================================
   Genera con l'IA (BOZZA del 17 ottobre 2026)

   L'utente scrive che suono vuole; OpenAI risponde con un JSON a forma
   fissa — un modello per ognuno dei sette blocchi, acceso o spento, e le
   manopole — e il preset lo costruiamo noi, **partendo da uno vero della
   libreria**, come il Duplica: un preset nuovo non parte mai dal nulla.

   L'IA sceglie solo fra i modelli di `SparkEffetti.MODELLI` (sono un `enum`
   nello schema, e prima dell'invio `controllaPreset` li ricontrolla): un
   nome che l'ampli non ha lo pianta. Il numero di parametri di ogni blocco
   non lo decide l'IA: si copia da un blocco uscito dall'ampli
   (`campioneModello`), o si prende dalla tabella, come nell'editor.

   La chiave è dell'utente e resta in questo browser (`localStorage`):
   l'app non ha un server. Si paga a OpenAI per ogni «Genera».
   ==================================================================== */

const MODELLO_IA = 'gpt-6.1-sol';
const CHIAVE_IA = 'openai-chiave';
const TEMPO_MAX_IA_MS = 120000;

// I sette blocchi, nell'ordine di `Spark.CATENA`: sono le chiavi del JSON.
const POSTI_IA = ['gate', 'comp', 'drive', 'ampli', 'modulazione', 'delay', 'riverbero'];

let generato = null;          // { record, spiegazione } dell'ultima risposta

function leggiChiaveIA() {
  try { return localStorage.getItem(CHIAVE_IA) || ''; } catch (e) { return ''; }
}
function scriviChiaveIA(valore) {
  try {
    if (valore) localStorage.setItem(CHIAVE_IA, valore);
    else localStorage.removeItem(CHIAVE_IA);
  } catch (e) { /* resta per questa volta */ }
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

/** La domanda a OpenAI. Torna l'oggetto della risposta, o lancia un errore da mostrare. */
async function chiediAllIA(descrizione, chiave) {
  const ferma = new AbortController();
  const timer = setTimeout(() => ferma.abort(), TEMPO_MAX_IA_MS);
  let risposta;
  try {
    risposta = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: ferma.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chiave },
      body: JSON.stringify({
        model: MODELLO_IA,
        instructions: istruzioniIA(),
        input: descrizione,
        text: { format: { type: 'json_schema', name: 'preset_spark', strict: true,
                          schema: schemaIA() } },
      }),
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? tr('OpenAI non ha risposto in due minuti.')
      : tr('non riesco a raggiungere OpenAI: controlla la connessione.'));
  } finally {
    clearTimeout(timer);
  }

  const dati = await risposta.json().catch(() => null);
  if (!risposta.ok) {
    const perche = dati && dati.error && dati.error.message;
    if (risposta.status === 401) throw new Error(tr('OpenAI non accetta la chiave: controllala.'));
    if (risposta.status === 429) {
      throw new Error(tr('OpenAI dice che i crediti sono finiti o che le richieste sono ' +
                         'troppe: {0}', perche || risposta.status));
    }
    throw new Error(tr('OpenAI ha risposto con un errore: {0}', perche || risposta.status));
  }

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
  try { return JSON.parse(testo); } catch (e) {
    throw new Error(tr('la risposta di OpenAI non è un preset leggibile.'));
  }
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
  $('spiegazioneIA').textContent = spiegazione || '';
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
  const chiave = $('chiaveIA').value.trim();
  if (!descrizione) { statoDelPannello(tr('scrivi prima che suono vuoi.')); return; }
  if (!chiave) { statoDelPannello(tr('serve la chiave di OpenAI: la trovi qui sotto.')); return; }
  const scheletro = scheletroPerIA();
  if (!scheletro) {
    statoDelPannello(tr('serve almeno un preset in libreria da cui partire: collega ' +
                        'l\'ampli una volta, i suoi otto si leggono da soli.'));
    return;
  }
  scriviChiaveIA(chiave);

  const tasto = $('btnGeneraIA');
  tasto.disabled = true;
  logProgress(tr('chiedo a OpenAI…'));
  try {
    const risposta = await chiediAllIA(descrizione, chiave);
    const { record, avvisi } = presetDaIA(risposta, scheletro, descrizione);
    generato = { record, spiegazione: String(risposta.spiegazione || '') };
    disegnaGenerato();
    logLine(tr('«{0}» pronto, partendo da «{1}».', record.name, scheletro.name) +
            (avvisi.length ? ' ' + avvisi.join('; ') : ''));
  } catch (e) {
    logLine(e.message, true);
  } finally {
    tasto.disabled = false;
  }
}

$('btnMenuGeneraIA').addEventListener('click', () => {
  apriPannello('pannelloGeneraIA');
  $('chiaveIA').value = leggiChiaveIA();
  disegnaGenerato();
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
  scriviChiaveIA('');
  $('chiaveIA').value = '';
  statoDelPannello(tr('chiave tolta da questo apparecchio.'));
});
