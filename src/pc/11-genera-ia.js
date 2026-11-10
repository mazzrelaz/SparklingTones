// Sparkling Tones — pc/11-genera-ia.js: un preset da una descrizione, con l'IA della chat.
'use strict';

/* ====================================================================
   Genera con l'IA (10 novembre 2026, solo nella pagina PC)

   Niente API e niente chiavi (scelta dell'utente): la pagina prepara la
   domanda intera — la descrizione, il catalogo dei modelli che l'ampli ha
   davvero con le loro manopole, la forma della risposta — e la copia negli
   appunti; l'utente la incolla nella chat che usa già (ChatGPT, Claude…) e
   incolla qui la risposta. La prima versione (17–19 ottobre, tolta) parlava
   con le API di OpenAI e Anthropic: è nella cronologia, `f86fb12`.

   Il preset lo costruiamo noi, **partendo da uno vero della libreria**, come
   il Duplica: un preset nuovo non parte mai dal nulla. L'IA sceglie solo fra
   i modelli di `SparkEffetti.MODELLI`; un nome fuori elenco non passa (un
   modello che l'ampli non ha lo pianta), e prima dell'invio `apriRecord`
   ripassa da `controllaPreset`. Il numero dei parametri di un blocco non lo
   decide l'IA: si copia da un blocco uscito dall'ampli (`campioneModello`).

   Il preset va sul palco **non salvato** («modificato»): lo si sente, lo si
   gira, e resta solo se lo si salva con «Salva…».

   Visibile a tutti, col suo tasto nella barra in alto (10 novembre: l'utente ha tolto la password che
   la nascondeva nella prima prova di questa versione).
   ==================================================================== */

// I sette blocchi, nell'ordine di `Spark.CATENA`: sono le chiavi del JSON.
const POSTI_IA = ['gate', 'comp', 'drive', 'amp', 'mod', 'delay', 'reverb'];

// Quello che l'utente ha scritto resta fra un'apertura e l'altra della finestra.
const bozzaIA = { descrizione: '', risposta: '' };

/* ---------------------------------------------------------------- la domanda */

/**
 * I modelli che l'IA può scegliere in una posizione: quelli di `MODELLI`, senza gli Hendrix
 * se il pacchetto non c'è, e solo quelli di cui sappiamo quante manopole hanno (o che stanno
 * già in un preset della libreria).
 */
function modelliPerIA(posizione) {
  return SparkEffetti.MODELLI[posizione].filter(id =>
    (haHendrix() || !SparkEffetti.eHendrix(id)) &&
    (SparkEffetti.quanteManopole(id) > 0 || campioneModello(id)));
}

/** Il catalogo: per ogni modello, il nome e le manopole per indice. */
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
          return `${i} ${nome} [choice: ${nomi.map((n, k) => `${SparkEffetti.valorePosizione(k)}=${n}`).join(', ')}]`;
        }
        if (quante) {
          return `${i} ${nome} [choice: ${Array.from({ length: quante }, (_, k) => SparkEffetti.valorePosizione(k)).join(', ')}]`;
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

/** La domanda intera da incollare nella chat. */
function domandaIA(descrizione) {
  const lingua = Lingua.attuale === 'en' ? 'English' : 'Italian';
  const blocco = '{ "model": "<id from the catalog>", "on": true, "knobs": [0.5, 0.5] }';
  return [
    'You design guitar tones for a Positive Grid Spark 2 amplifier.',
    'The signal chain has exactly seven blocks, in this order: gate, comp, drive, amp, mod,',
    'delay, reverb. For each block choose one model from the catalog below (copy its id',
    'exactly), whether it is on, and its knob values.',
    '',
    'Knob values go from 0 to 1 (0.5 is the middle); "knobs" lists them in index order:',
    'knobs[0] is knob 0, knobs[1] is knob 1, and so on. Give exactly as many values as the',
    'model has knobs. For a [choice] knob use one of the listed values; for a [switch] use',
    '0 or 1. In the reverb block, the [choice] knob picks one of the nine reverb models.',
    'Blocks that are off still need a model and sensible values.',
    '',
    'Aim for a tone that really works with a guitar plugged in: reasonable master volume',
    '(not above 0.7), effects mixed with taste.',
    '',
    '"initials" are two capital letters for the artist or band the tone comes from: first',
    'name and surname for a person (Brian May = BM, Steve Vai = SV, Carlos Santana = CS),',
    'the first two words for a band (Pink Floyd = PF), and for a one-word band its first',
    'letter plus a strong consonant (Metallica = MT). If the request names no artist, use',
    'the one whose sound you based the tone on. "title" is the song, or a short name for',
    'the tone if there is no song (max 18 characters, without the initials).',
    '"family" is exactly one of: "clean", "drive", "acoustic", "bass" — the kind of tone',
    '(drive for anything from crunch to high gain, acoustic for acoustic-guitar tones, bass',
    'for bass guitar).',
    `"why" is one or two sentences in ${lingua} saying what you chose and why; "bpm" is the`,
    'tempo for the delay (60-200).',
    '',
    'Answer with the JSON object only, in one code block, exactly in this shape:',
    '{',
    '  "initials": "BM", "title": "...", "family": "drive", "why": "...", "bpm": 120,',
    ...POSTI_IA.map((k, i) => `  "${k}": ${blocco}${i < POSTI_IA.length - 1 ? ',' : ''}`),
    '}',
    '',
    '# Catalog',
    catalogoPerIA(),
    '',
    '# The tone I want',
    descrizione,
  ].join('\n');
}

/** Gli appunti; dove non si può (pagina non sicura), il testo si seleziona in un campo. */
async function copiaNegliAppunti(testo, campoDiRiserva) {
  try {
    await navigator.clipboard.writeText(testo);
    campoDiRiserva.hidden = true;
    return true;
  } catch (e) {
    campoDiRiserva.hidden = false;
    campoDiRiserva.value = testo;
    campoDiRiserva.focus();
    campoDiRiserva.select();
    return false;
  }
}

/* ---------------------------------------------------------------- la risposta */

/** Il JSON della risposta, anche dentro un blocco di codice o con del testo intorno. */
function leggiRispostaIA(testo) {
  const t = String(testo || '');
  const inizio = t.indexOf('{');
  const fine = t.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) throw new Error(tr('nella risposta non c\'è un preset: incollala intera.'));
  try {
    return JSON.parse(t.slice(inizio, fine + 1));
  } catch (e) {
    throw new Error(tr('la risposta non è un preset leggibile: incollala intera, dal primo «{» all\'ultimo «}».'));
  }
}

/** Lo scheletro: un preset della libreria uscito dall'ampli, meglio se sta in uno slot. */
function scheletroPerIA() {
  const buoni = tutti.filter(r => Array.isArray(r.effects) && r.effects.length === 7 &&
    !Spark.controllaPreset(r, { modelli: SparkEffetti.MODELLI.flat() }).errori.length);
  return buoni.find(r => (r.slots || []).length) || buoni[0] || null;
}

/** Un valore dell'IA portato dentro quello che la manopola accetta. */
function valoreSicuroIA(id, indice, valore) {
  const v = Math.min(1, Math.max(0, valore));
  if (SparkEffetti.interruttore(id, indice)) return v >= 0.5 ? 1 : 0;
  const quante = SparkEffetti.posizioni(id, indice);
  if (quante) {
    // Il valore più vicino fra quelli delle posizioni (0, 0.1, 0.2…).
    let migliore = 0;
    for (let k = 1; k < quante; k++) {
      if (Math.abs(SparkEffetti.valorePosizione(k) - v) < Math.abs(SparkEffetti.valorePosizione(migliore) - v)) migliore = k;
    }
    return SparkEffetti.valorePosizione(migliore);
  }
  return Math.round(v * 1000) / 1000;
}

/**
 * Il nome nel formato dell'utente (10 novembre 2026): «XX - Titolo», XX le iniziali
 * dell'artista o della band («BM - Bijou», «PF - Comfortably Numb», «MT - …»). Le iniziali e
 * il titolo l'IA li dà a parte, e il nome lo compone la pagina: così il formato non dipende
 * da quanto la chat è stata attenta.
 */
function nomeDaIA(risposta) {
  const iniziali = String(risposta.initials || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  let titolo = String(risposta.title || risposta.name || '').replace(/\s+/g, ' ').trim();
  // Se la chat ha messo le iniziali anche nel titolo («BM - Bijou»), non si ripetono.
  if (iniziali.length === 2) titolo = titolo.replace(new RegExp('^' + iniziali + '\\s*[-–—]\\s*', 'i'), '');
  if (titolo) titolo = titolo[0].toUpperCase() + titolo.slice(1);
  else titolo = tr('Preset IA');
  return iniziali.length === 2 ? `${iniziali} - ${titolo}` : titolo;
}

/** Un nome che in libreria non c'è ancora: «Blues» → «Blues 2», «Blues 3»… */
function nomeLiberoIA(nome) {
  const presi = new Set(tutti.map(r => PresetStore.chiaveNome(r.name)));
  let proposto = nome.slice(0, 24);
  for (let n = 2; presi.has(PresetStore.chiaveNome(proposto)); n++) proposto = `${nome.slice(0, 21)} ${n}`;
  return proposto;
}

/** Il preset costruito dalla risposta, sopra lo scheletro. Non si salva: lo fa «Salva…». */
function presetDaIA(risposta, scheletro) {
  const avvisi = [];
  const effetti = scheletro.effects.map((originale, posizione) => {
    const base = { name: originale.name, enabled: originale.enabled,
                   params: (originale.params || []).map(p => ({ index: p.index, value: p.value })) };
    const scelta = risposta[POSTI_IA[posizione]];
    if (!scelta || !modelliPerIA(posizione).includes(scelta.model)) {
      avvisi.push(tr('{0}: modello non valido, resta quello di partenza', Spark.CATENA[posizione]));
      return base;
    }

    // Prima si copia, poi si costruisce: come il cambio di modello nell'editor.
    let blocco = base;
    if (scelta.model !== originale.name) {
      const campione = campioneModello(scelta.model);
      const quante = SparkEffetti.quanteManopole(scelta.model);
      blocco = campione
        ? { name: scelta.model, enabled: true, params: campione.params }
        : { name: scelta.model, enabled: true, params: Array.from({ length: quante }, (_, i) => ({ index: i, value: 0.5 })) };
    }
    blocco.enabled = !!scelta.on;

    const voce = SparkEffetti.TABELLA[blocco.name] || {};
    const manopole = (voce.manopole || []).length;
    (Array.isArray(scelta.knobs) ? scelta.knobs : []).slice(0, manopole).forEach((valore, i) => {
      const param = blocco.params.find(p => p.index === i);
      if (param && typeof valore === 'number' && Number.isFinite(valore)) {
        param.value = valoreSicuroIA(blocco.name, i, valore);
      }
    });
    // Il parametro in più di noise gate e riverbero è il loro acceso/spento.
    if (voce.quante !== undefined) {
      const interruttore = blocco.params.find(p => p.index === voce.quante);
      if (interruttore) interruttore.value = blocco.enabled ? 1 : 0;
    }
    return blocco;
  });

  const bpm = Number(risposta.bpm);
  const preset = {
    uuid: nuovoUuid(),
    name: nomeLiberoIA(nomeDaIA(risposta)),
    version: scheletro.version || '0.7',
    description: scheletro.description || '',
    icon: scheletro.icon || 'icon.png',
    bpm: Number.isFinite(bpm) ? Math.min(250, Math.max(40, Math.round(bpm))) : bpmDi(scheletro),
    effects: effetti,
  };
  // La famiglia (clean, drive, acoustic, bass): solo una che in libreria c'è davvero.
  const fam = String(risposta.family || '').trim().toLowerCase();
  const famiglia = famiglie.some(f => f.id === fam) ? fam : null;
  return { preset, famiglia, avvisi };
}

/**
 * Il preset generato sul palco, non salvato: con l'ampli va nel preset software e si rilegge
 * (come `apriRecord`), senza si regola sulla copia in memoria.
 */
async function mettiGeneratoSulPalco(preset, famiglia) {
  if (!spark.connected) {
    mettiSulPalco({ record: null, slot: null, letto: preset, offline: true });
  } else {
    const controllo = Spark.controllaPreset(preset, { modelli: SparkEffetti.MODELLI.flat() });
    if (controllo.errori.length) {
      await avvisa(tr('non si può mandare'), tr('«{0}» non è mandabile così com\'è: {1}.',
        testoConNome(preset.name), testoConNome(controllo.errori.slice(0, 3).join('; '))));
      return false;
    }
    let riuscito = false;
    await occupa(async () => {
      await codaVuota();
      const esito = await spark.loadPreset(preset, (i, tot) => stato(tr('invio «{0}»: chunk {1} di {2}…', preset.name, i + 1, tot)));
      if (!esito.ok) { stato(tr('invio interrotto: {0}', esito.error), 'errore'); return; }
      await attendi(400);
      const letto = await spark.readLiveState();
      if (!letto) { stato(tr('non riesco a rileggere il suono corrente.'), 'errore'); return; }
      mettiSulPalco({ record: null, slot: null, letto, offline: false });
      riuscito = true;
    });
    if (!riuscito) return false;
  }
  // Non è in libreria: «modificato» finché non lo si salva, e lasciandolo si chiede.
  ora.nome = preset.name;
  ora.meta = { uuid: preset.uuid, version: preset.version, description: preset.description, icon: preset.icon };
  ora.toccato = true;
  // La famiglia la mette «Salva…» quando il preset entra in libreria (`salva`, 05-file.js).
  ora.famigliaNuovo = famiglia || null;
  disegnaTutto();
  return true;
}

/* ---------------------------------------------------------------- la finestra */

async function apriGeneraIA() {
  const scheletro = scheletroPerIA();
  if (!scheletro) {
    await avvisa(tr('serve un preset da cui partire'), tr('In libreria non c\'è ancora un preset letto dall\'ampli: premi «Collega», i suoi slot si leggono da soli.'));
    return;
  }

  for (;;) {
    const corpo = document.createElement('div');
    corpo.innerHTML = `
      <textarea data-f="descrizione" style="min-height:90px" placeholder="${tr('che suono vuoi')}"></textarea>
      <div class="riga-azioni" style="margin:10px 0 4px"><button data-f="copia">${tr('Copia la domanda')}</button>
        <span class="stato-db" data-f="copiata"></span></div>
      <textarea data-f="domanda" hidden readonly style="min-height:90px"></textarea>
      <h3>${tr('La risposta')}</h3>
      <textarea data-f="risposta" style="min-height:130px" placeholder="${tr('incolla qui la risposta')}"></textarea>`;
    const q = f => corpo.querySelector(`[data-f="${f}"]`);
    q('descrizione').value = bozzaIA.descrizione;
    q('risposta').value = bozzaIA.risposta;
    q('copia').addEventListener('click', async () => {
      const descrizione = q('descrizione').value.trim();
      if (!descrizione) { q('copiata').textContent = tr('manca la descrizione'); q('descrizione').focus(); return; }
      const fatto = await copiaNegliAppunti(domandaIA(descrizione), q('domanda'));
      q('copiata').textContent = fatto ? tr('copiata') : tr('copiala da qui sotto');
    });

    const scelta = await finestra({
      titolo: tr('Genera con l\'IA'),
      corpo,
      larga: true,
      azioni: [{ testo: tr('Chiudi'), valore: null }, { testo: tr('Metti sul palco'), valore: 'costruisci', primario: true }],
    });
    bozzaIA.descrizione = q('descrizione').value;
    bozzaIA.risposta = q('risposta').value;
    if (scelta !== 'costruisci') return;

    let fatto;
    try {
      fatto = presetDaIA(leggiRispostaIA(bozzaIA.risposta), scheletro);
    } catch (err) {
      await avvisa(tr('la risposta non va'), testoConNome(err.message));
      continue;
    }
    if (!await chiediPrimaDiLasciare()) return;
    if (!await mettiGeneratoSulPalco(fatto.preset, fatto.famiglia)) return;

    const risposta = leggiRispostaIA(bozzaIA.risposta);
    const motivo = String(risposta.why || '').trim();
    const fam = fatto.famiglia && famiglie.find(f => f.id === fatto.famiglia);
    stato(tr('«{0}» dall\'IA, partendo da «{1}»', fatto.preset.name, scheletro.name) +
      (fam ? ' — ' + fam.nome : '') +
      (fatto.avvisi.length ? ' — ' + fatto.avvisi.join('; ') : '') + (motivo ? ' — ' + motivo : ''),
      fatto.avvisi.length ? 'errore' : 'ok');
    bozzaIA.risposta = '';
    return;
  }
}

// Il tasto sta nella barra in alto, accanto a ⟳ (10 novembre: l'utente l'ha voluto fuori dal menu).
$('genera-ia').addEventListener('click', apriGeneraIA);
