// Sparkling Tones — pc/06-libreria.js: la libreria a destra, come l'elenco dei tone del Pulze editor.
//
// Tutto quello che nell'app sta nella vista Preset e nella scheda di un preset: in cima gli slot
// dell'ampli, sotto gli altri (mai in tutti e due i posti); ricerca, filtri per famiglia e
// categoria, ordine. Un clic porta il preset sul palco (uno slot si seleziona con `0x0138`, un
// altro va nel preset software); il ⋯ di ogni riga ha le azioni della scheda. Più le finestre di
// «Categorie», «Doppioni», «Elimina tutti i preset» e «Informazioni».
'use strict';

/* ================================================================ l'elenco */

function passaIlFiltro(record, slotAmpli = false) {
  if (!slotAmpli && !visibileSenzaHendrix(record)) return false;
  if (vista.famiglia && record.famiglia !== vista.famiglia) return false;
  if (vista.categoria && !(record.tags || []).some(t => t.toLowerCase() === vista.categoria.toLowerCase())) return false;
  const termini = vista.cerca.toLowerCase().split(/\s+/).filter(Boolean);
  if (!termini.length) return true;
  const pagliaio = [record.name, record.description, record.notes, (record.tags || []).join(' '),
    (record.effects || []).map(e => e.name).join(' ')].join(' ').toLowerCase();
  return termini.every(t => pagliaio.includes(t));
}
const filtroAttivo = () => !!(vista.cerca || vista.categoria || vista.famiglia);

const ORDINI = [
  { valore: 'nome', testo: tr('nome') },
  { valore: 'aggiunto', testo: tr('aggiunti di recente') },
  { valore: 'modificato', testo: tr('modificati di recente') },
  { valore: 'famiglia', testo: tr('famiglia di suono') },
];

function ordinaLibreria(lista) {
  const perNome = (a, b) => (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' });
  const copia = lista.slice();
  if (vista.ordine === 'aggiunto') return copia.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || perNome(a, b));
  if (vista.ordine === 'modificato') return copia.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || perNome(a, b));
  if (vista.ordine === 'famiglia') {
    // Chi non ha famiglia va in fondo: è l'assenza di una scelta.
    const rango = r => { const i = famiglie.findIndex(f => f.id === r.famiglia); return i === -1 ? famiglie.length : i; };
    return copia.sort((a, b) => rango(a) - rango(b) || perNome(a, b));
  }
  return copia.sort(perNome);
}

function disegnaFiltri() {
  // Famiglia e categoria: due tendine come le altre della pagina (`.scelta`), niente pastiglie.
  const barra = $('elenco-filtri');
  barra.textContent = '';
  const usate = famiglie.filter(f => tutti.some(r => r.famiglia === f.id));
  barra.hidden = !categorie.length && !usate.length;
  const pallino = colore => {
    const p = document.createElement('span');
    p.className = 'pallino-fam';
    p.style.setProperty('--famiglia', colore);
    return p;
  };
  const tendina = (testo, contenuto, voci) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta';
    const etichetta = document.createElement('span');
    etichetta.className = 'etichetta';
    etichetta.append(...contenuto);
    b.appendChild(etichetta);
    b.title = testo;
    b.addEventListener('click', () => apriTendina(b, voci));
    barra.appendChild(b);
  };
  if (usate.length) {
    const f = usate.find(x => x.id === vista.famiglia);
    tendina(tr('famiglia di suono'), f ? [pallino(f.colore), f.nome] : [tr('famiglia')], t => {
      voceTendina(t, tr('tutte le famiglie'), () => { vista.famiglia = ''; disegnaLibreria(); }, { scelta: !f });
      for (const x of usate) {
        const quanti = tutti.filter(r => r.famiglia === x.id).length;
        const v = voceTendina(t, `<span class="pallino-fam"></span>${testoConNome(x.nome)}<span class="quanti">${quanti}</span>`, () => {
          vista.famiglia = x.id;
          disegnaLibreria();
        }, { scelta: vista.famiglia === x.id });
        // Il colore può venire da un backup importato: si passa dallo stile, mai dentro l'HTML.
        v.querySelector('.pallino-fam').style.setProperty('--famiglia', x.colore);
      }
    });
  }
  if (categorie.length) {
    const c = categorie.find(x => x.nome === vista.categoria);
    tendina(tr('categoria'), [c ? c.nome : tr('categoria')], t => {
      voceTendina(t, tr('tutte le categorie'), () => { vista.categoria = ''; disegnaLibreria(); }, { scelta: !c });
      for (const { nome, quanti } of categorie) {
        voceTendina(t, `${testoConNome(nome)}<span class="quanti">${quanti}</span>`, () => {
          vista.categoria = nome;
          disegnaLibreria();
        }, { scelta: vista.categoria === nome });
      }
    });
  }
}

function rigaPreset(record, slot) {
  const riga = document.createElement('div');
  const suona = !!ora && (slot !== null ? ora.slot === slot
    : ora.slot === null && !!ora.record && !!record && ora.record.id === record.id);
  riga.className = 'riga-preset' + (suona ? ' suona' : '') + (record ? '' : ' vuoto');
  if (slot !== null) riga.appendChild(etichettaAmpli(slot));
  const fam = famigliaDi(record);
  if (fam) {
    const p = document.createElement('span');
    p.className = 'pallino-fam';
    p.style.setProperty('--famiglia', fam.colore);
    p.title = fam.nome;
    riga.appendChild(p);
  }
  const nome = document.createElement('span');
  nome.className = 'nome';
  nome.textContent = record ? (record.name || tr('(senza nome)')) : tr('non ancora letto');
  if (record) nome.title = [record.name, (record.tags || []).join(', '), record.notes].filter(Boolean).join('\n');
  riga.appendChild(nome);
  if (record && haHendrix() && SparkEffetti.presetConHendrix(record.effects)) riga.insertAdjacentHTML('beforeend', '<span class="jh">JH</span>');
  if (record && slot === null && residente(record)) {
    // Sta anche in uno slot (solo se non è già nella sezione degli slot: mai in tutti e due i posti).
    for (const s of slotsDi(record)) riga.appendChild(etichettaAmpli(s));
  }
  riga.addEventListener('click', () => {
    if (slot !== null) apriSlot(slot);
    else if (record) apriRecord(record);
  });
  if (record) {
    const altro = document.createElement('button');
    altro.type = 'button';
    altro.className = 'altro';
    altro.textContent = '⋯';
    altro.title = tr('altre azioni');
    altro.addEventListener('click', e => { e.stopPropagation(); menuPreset(record, slot, altro); });
    riga.appendChild(altro);
    riga.addEventListener('contextmenu', e => { e.preventDefault(); menuPreset(record, slot, altro); });
  }
  return riga;
}

function disegnaLibreria() {
  disegnaFiltri();
  const corpo = $('elenco-corpo');
  const scorri = corpo.scrollTop;
  corpo.textContent = '';
  const titolo = (testo, conta) => {
    const t = document.createElement('div');
    t.className = 'elenco-titolo';
    t.innerHTML = `<span>${testoConNome(testo)}</span><span class="conta">${conta || ''}</span>`;
    corpo.appendChild(t);
  };

  // Gli slot dell'ampli: sempre in cima, nel loro ordine.
  const maiLetto = suAmpli.every(r => !r);
  const slotVisti = [];
  for (let s = 0; s < profilo.slot; s++) {
    const r = suAmpli[s];
    if (r && !passaIlFiltro(r, true)) continue;
    if (!r && (filtroAttivo() || maiLetto)) continue;
    slotVisti.push(s);
  }
  if (slotVisti.length) {
    titolo(spark.state.name || tr('Sull\'ampli'), spark.connected ? '' : tr('ultima lettura'));
    for (const s of slotVisti) corpo.appendChild(rigaPreset(suAmpli[s], s));
  }

  const sullAmpli = new Set(suAmpli.filter(Boolean).map(r => r.id));
  const altri = tutti.filter(r => !sullAmpli.has(r.id) && visibileSenzaHendrix(r));
  const visibili = ordinaLibreria(altri.filter(r => passaIlFiltro(r)));
  titolo(tr('Libreria'), filtroAttivo() ? tr('{0} di {1}', visibili.length, altri.length) : String(altri.length));
  for (const r of visibili) corpo.appendChild(rigaPreset(r, null));
  if (!visibili.length) {
    corpo.insertAdjacentHTML('beforeend', `<div class="elenco-vuoto">${altri.length
      ? tr('Nessun preset corrisponde alla ricerca.')
      : tr('Nessun preset.')}</div>`);
  }
  $('elenco-cerca').placeholder = tr('cerca fra {0} preset', altri.length + slotVisti.length);
  $('elenco-ordine').title = tr('ordine: {0}', (ORDINI.find(o => o.valore === vista.ordine) || ORDINI[0]).testo);
  corpo.scrollTop = scorri;
}

$('elenco-cerca').addEventListener('input', () => { vista.cerca = $('elenco-cerca').value; disegnaLibreria(); });
$('elenco-ordine').addEventListener('click', e => apriTendina(e.currentTarget, t => {
  for (const o of ORDINI) {
    voceTendina(t, testoConNome(o.testo), async () => {
      vista.ordine = o.valore;
      disegnaLibreria();
      await store.setSetting('ordineLibreria', o.valore);
    }, { scelta: o.valore === vista.ordine });
  }
}, { destra: true }));

/* ================================================================ il ⋯ di un preset
   Le azioni della scheda dell'app: Seleziona lo slot, Metti in uno slot, Nel banco, Rinomina,
   Duplica, Famiglia, Categorie, Note, Esporta, Elimina. */

async function aggiornaTutto() {
  await ricarica();
  disegnaTutto();
}

function menuPreset(record, slot, vicino) {
  apriTendina(vicino, t => {
    t.insertAdjacentHTML('beforeend', `<div class="famiglia">${testoConNome(record.name)}</div>`);
    voceTendina(t, slot !== null ? tr('Seleziona {0} e apri', nomeSlot(slot)) : tr('Suona e apri'),
      () => slot !== null ? apriSlot(slot) : apriRecord(record));
    // Nessuna voce si spegne (regola dell'app): senza ampli risponde spiegando cosa serve.
    voceTendina(t, tr('Metti in uno slot…'), () => mettiInSlot(record));
    voceTendina(t, tr('Nel banco…'), () => mettiNelBanco(record, vicino));
    t.insertAdjacentHTML('beforeend', '<hr>');
    voceTendina(t, tr('Rinomina…'), () => rinomina(record));
    voceTendina(t, tr('Duplica'), async () => {
      const id = await store.duplicate(record.id);
      const copia = await store.get(id);
      await aggiornaTutto();
      stato(tr('«{0}» creato copiando «{1}»', copia.name, record.name), 'ok');
    });
    voceTendina(t, tr('Famiglia…'), () => scegliFamiglia(record, vicino));
    voceTendina(t, tr('Categorie…'), () => scegliCategorie(record));
    voceTendina(t, tr('Note…'), () => scriviNote(record));
    voceTendina(t, tr('Esporta'), () => esportaRecord(record));
    t.insertAdjacentHTML('beforeend', '<hr>');
    // Su un preset dell'ampli «Elimina» non ha senso: uno slot dello Spark non si svuota, si può
    // solo riscrivere (l'utente, 9 novembre 2026). Al suo posto «Cambia…».
    if (slot !== null) voceTendina(t, tr('Cambia…'), () => cambiaSlot(record, slot));
    else voceTendina(t, tr('Elimina dalla libreria'), () => eliminaRecord(record), { classe: 'pericolo' });
  });
}

/* «Cambia…» su un preset dell'ampli: si sceglie dalla libreria quello da mettere nello slot. Il
   preset che c'era è già in libreria (ci entra alla lettura degli slot): perde lo slot e scende
   fra gli altri, come quando si sovrascrive uno slot da «Metti in uno slot…». */
async function cambiaSlot(vecchio, slot) {
  if (!spark.connected) {
    await avvisa(tr('serve l\'ampli'), tr('Per cambiare il preset di uno slot serve l\'amplificatore: premi «Collega» in alto e riprova.'));
    return;
  }
  const corpo = document.createElement('div');
  corpo.className = 'scegli-preset';
  const cerca = document.createElement('input');
  cerca.type = 'search';
  cerca.placeholder = tr('cerca…');
  cerca.autocomplete = 'off';
  const lista = document.createElement('div');
  lista.className = 'scegli-lista';
  let scelto = null;
  const disegna = () => {
    lista.textContent = '';
    const termini = cerca.value.toLowerCase().split(/\s+/).filter(Boolean);
    const candidati = ordinaLibreria(tutti.filter(r => r.id !== vecchio.id && visibileSenzaHendrix(r) &&
      termini.every(x => (r.name || '').toLowerCase().includes(x))));
    for (const r of candidati) {
      const riga = document.createElement('div');
      riga.className = 'riga-preset';
      const fam = famigliaDi(r);
      if (fam) {
        const p = document.createElement('span');
        p.className = 'pallino-fam';
        p.style.setProperty('--famiglia', fam.colore);
        riga.appendChild(p);
      }
      const nome = document.createElement('span');
      nome.className = 'nome';
      nome.textContent = r.name || tr('(senza nome)');
      riga.appendChild(nome);
      for (const s of slotsDi(r)) riga.appendChild(etichettaAmpli(s));
      riga.addEventListener('click', () => { scelto = r; chiudiFinestra(true); });
      lista.appendChild(riga);
    }
    if (!candidati.length) lista.innerHTML = `<div class="elenco-vuoto">${tr('Nessun preset.')}</div>`;
  };
  cerca.addEventListener('input', disegna);
  corpo.append(cerca, lista);
  disegna();
  setTimeout(() => cerca.focus(), 0);
  const r = await finestra({ titolo: tr('al posto di «{0}» in {1}', vecchio.name, nomeSlot(slot)), corpo,
    azioni: [{ testo: tr('Annulla'), valore: null }] });
  if (r !== true || !scelto) return;
  if (!await conferma(tr('scrivere sull\'ampli'), tr('Scrivere <strong>{0}</strong> in {1} al posto di <strong>{2}</strong>? ' +
    '«{2}» resta in libreria e ricompare fra gli altri preset.', testoConNome(scelto.name), nomeSlot(slot), testoConNome(vecchio.name)),
    { ok: tr('Scrivi {0}', nomeSlot(slot)) })) return;
  if (!await chiediPrimaDiLasciare()) return;
  await scriviNelloSlot(scelto, slot);
}

async function mettiInSlot(record) {
  if (!spark.connected) {
    await avvisa(tr('serve l\'ampli'), tr('Per scrivere in uno slot serve l\'amplificatore: premi «Collega» in alto e riprova.'));
    return;
  }
  const corpo = document.createElement('div');
  corpo.className = 'scegli-slot';
  let dove = null;
  const r = await new Promise(risolvi => {
    for (let n = 0; n < profilo.slot; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = nomeSlot(n) + (suAmpli[n] ? ' · ' + suAmpli[n].name : '');
      b.addEventListener('click', () => { dove = n; corpo.querySelectorAll('button').forEach(x => x.classList.toggle('sì', x === b)); });
      corpo.appendChild(b);
    }
    finestra({
      titolo: tr('dove scriverlo sull\'ampli'),
      corpo,
      azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Scrivi'), valore: true, primario: true }],
    }).then(risolvi);
  });
  if (!r || dove === null) return;
  if (!await chiediPrimaDiLasciare()) return;
  await scriviNelloSlot(record, dove);
}

async function mettiNelBanco(record, vicino) {
  if (!banchi.length) {
    await avvisa(tr('nessun banco'), tr('Non hai ancora banchi: creane uno in «Banchi», nella barra in alto.'));
    return;
  }
  apriTendina(vicino, t => {
    for (const b of banchi) {
      const liberi = b.posti.filter(p => p === null).length;
      voceTendina(t, testoConNome(b.nome) + (liberi ? tr(' — {0} posti liberi', liberi) : tr(' — pieno')), async () => {
        const giaLi = b.posti.indexOf(record.id);
        if (giaLi !== -1) { stato(tr('«{0}» era già in «{1}», al posto {2}', record.name, b.nome, giaLi + 1)); return; }
        const libero = b.posti.indexOf(null);
        if (libero === -1) {
          await avvisa(tr('banco pieno'), tr('<strong>{0}</strong> ha tutti e otto i posti occupati: liberane uno in «Banchi».', testoConNome(b.nome)));
          return;
        }
        await store.setBankSlot(b.id, libero, record.id);
        await aggiornaTutto();
        stato(tr('«{0}» → «{1}», posto {2}', record.name, b.nome, libero + 1), 'ok');
      });
    }
  });
}

async function rinomina(record) {
  const r = await finestra({
    titolo: tr('rinomina'),
    campo: { valore: record.name || '' },
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Rinomina'), valore: true, primario: true }],
  });
  const nuovo = r && r.testo.replace(/\s+/g, ' ').trim();
  if (!nuovo || nuovo === record.name) return;
  const omonimo = await store._omonimo(nuovo, null);
  if (omonimo && omonimo.id !== record.id) {
    await avvisa(tr('nome già usato'), tr('In libreria c\'è già un preset che si chiama <strong>{0}</strong>.', testoConNome(omonimo.name)));
    return;
  }
  await store.setName(record.id, nuovo);
  if (ora && ora.record && ora.record.id === record.id) ora.nome = nuovo;
  await aggiornaTutto();
  stato(tr('rinominato in «{0}»', nuovo), 'ok');
}

function scegliFamiglia(record, vicino) {
  apriTendina(vicino, t => {
    voceTendina(t, tr('nessuna'), async () => { await store.setFamiglia(record.id, null); await aggiornaTutto(); }, { scelta: !record.famiglia });
    for (const f of famiglie) {
      const v = voceTendina(t, `<span class="pallino-fam"></span>${testoConNome(f.nome)}`, async () => {
        await store.setFamiglia(record.id, f.id);
        await aggiornaTutto();
      }, { scelta: record.famiglia === f.id });
      // Il colore può venire da un backup importato: si passa dallo stile, mai dentro l'HTML.
      v.querySelector('.pallino-fam').style.setProperty('--famiglia', f.colore);
    }
  });
}

async function scegliCategorie(record) {
  const corpo = document.createElement('div');
  corpo.className = 'scegli-slot';
  const disegna = async () => {
    const fresco = await store.get(record.id);
    const sue = new Set((fresco.tags || []).map(t => t.toLowerCase()));
    corpo.textContent = '';
    for (const { nome } of categorie) {
      const b = document.createElement('button');
      b.type = 'button';
      const dentro = sue.has(nome.toLowerCase());
      b.className = dentro ? 'sì' : '';
      b.textContent = (dentro ? '✓ ' : '') + nome;
      b.addEventListener('click', async () => {
        if (dentro) await store.removeTag(record.id, nome); else await store.addTag(record.id, nome);
        await ricarica();
        await disegna();
        disegnaLibreria();
      });
      corpo.appendChild(b);
    }
    const nuova = document.createElement('button');
    nuova.type = 'button';
    nuova.textContent = tr('＋ nuova…');
    nuova.addEventListener('click', async () => {
      const r = await finestra({ titolo: tr('nuova categoria'),
        campo: { invito: tr('blues, prove, casa…') },
        azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Crea e assegna'), valore: true, primario: true }] });
      const nome = r && r.testo.trim();
      if (nome) { await store.addCategory(nome); await store.addTag(record.id, nome); await ricarica(); disegnaLibreria(); }
      scegliCategorie(record);
    });
    corpo.appendChild(nuova);
  };
  await disegna();
  await finestra({ titolo: tr('categorie di «{0}»', record.name), corpo });
}

async function scriviNote(record) {
  const fresco = await store.get(record.id);
  const area = document.createElement('textarea');
  area.value = fresco.notes || '';
  area.placeholder = tr('come suona, quando usarlo, cosa cambiare…');
  const fatto = await finestra({ titolo: tr('note di «{0}»', record.name), corpo: area,
    azioni: [{ testo: tr('Annulla'), valore: null }, { testo: tr('Salva le note'), valore: true, primario: true }] });
  if (fatto !== true) return;
  await store.setNotes(record.id, area.value);
  await aggiornaTutto();
  stato(tr('note salvate'), 'ok');
}

function esportaRecord(record) {
  const preset = Object.assign({}, record);
  delete preset.id;
  delete preset.slots;
  delete preset.slot;
  const backup = { format: 'spark-controller-library', version: 2, exportedAt: new Date().toISOString(), presets: [preset] };
  scaricaFile(nomeFile(record.name) + '.json', JSON.stringify(backup, null, 2));
  stato(tr('«{0}» esportato nei Download.', record.name), 'ok');
}

async function eliminaRecord(record) {
  if (!await conferma(tr('eliminare dalla libreria'), tr('Eliminare <strong>{0}</strong> dalla libreria? ' +
    'L\'ampli non viene toccato: se è caricato in uno slot continua a suonare.', testoConNome(record.name)),
    { ok: tr('Elimina'), pericolo: true })) return;
  await store.remove(record.id);
  if (ora && ora.record && ora.record.id === record.id) ora.record = null;
  await aggiornaTutto();
  stato(tr('«{0}» eliminato dalla libreria', record.name), 'ok');
}

/* ================================================================ Categorie e famiglie */

async function apriCategorie() {
  const corpo = document.createElement('div');
  const disegna = () => {
    corpo.innerHTML = `<h3>${tr('Famiglia di suono')}</h3>
      <div data-f="famiglie"></div>
      <h3>${tr('Categorie')}</h3>
      <div class="riga-azioni"><input type="text" data-f="nuova" placeholder="${tr('nuova categoria')}" style="flex:1;margin:0">
        <button class="primario" data-f="aggiungi">${tr('Aggiungi')}</button></div>
      <div data-f="categorie"></div>
      <div class="riga-azioni" style="margin-top:12px"><button class="pericolo" data-f="azzera">${tr('Azzera tutte le categorie')}</button></div>`;
    const q = f => corpo.querySelector(`[data-f="${f}"]`);
    for (const f of famiglie) {
      const quanti = tutti.filter(r => r.famiglia === f.id).length;
      const riga = document.createElement('div');
      riga.className = 'riga-voce';
      const colore = document.createElement('input');
      colore.type = 'color';
      colore.value = f.colore;
      colore.addEventListener('change', async () => { await store.setColoreFamiglia(f.id, colore.value); await aggiornaTutto(); disegna(); });
      riga.append(colore, Object.assign(document.createElement('span'), { className: 'nome', textContent: f.nome }),
        Object.assign(document.createElement('span'), { className: 'badge', textContent: tr('{0} preset', quanti) }));
      if (f.suo) {
        const rimetti = document.createElement('button');
        rimetti.className = 'mini-tasto';
        rimetti.textContent = '↺';
        rimetti.title = tr('rimetti il colore di partenza');
        rimetti.addEventListener('click', async () => { await store.setColoreFamiglia(f.id, ''); await aggiornaTutto(); disegna(); });
        riga.appendChild(rimetti);
      }
      q('famiglie').appendChild(riga);
    }
    if (!categorie.length) q('categorie').innerHTML = `<p style="margin-top:8px">${tr('Nessuna categoria.')}</p>`;
    for (const { nome, quanti } of categorie) {
      const riga = document.createElement('div');
      riga.className = 'riga-voce';
      const campo = document.createElement('input');
      campo.type = 'text';
      campo.value = nome;
      campo.addEventListener('change', async () => {
        const nuovo = campo.value.trim();
        if (!nuovo || nuovo === nome) { campo.value = nome; return; }
        await store.renameCategory(nome, nuovo);
        await aggiornaTutto();
        disegna();
      });
      const via = document.createElement('button');
      via.className = 'mini-tasto via';
      via.textContent = '✕';
      via.title = tr('elimina la categoria');
      via.addEventListener('click', async () => {
        await store.removeCategory(nome);
        await aggiornaTutto();
        disegna();
        stato(tr('categoria «{0}» eliminata: {1} preset la perdono, e restano in libreria', nome, quanti), 'ok');
      });
      riga.append(campo, Object.assign(document.createElement('span'), { className: 'badge', textContent: tr('{0} preset', quanti) }), via);
      q('categorie').appendChild(riga);
    }
    const aggiungi = async () => {
      const nome = q('nuova').value.trim();
      if (!nome) return;
      await store.addCategory(nome);
      await aggiornaTutto();
      disegna();
    };
    q('aggiungi').onclick = aggiungi;
    q('nuova').onkeydown = e => { if (e.key === 'Enter') aggiungi(); };
    q('azzera').disabled = !categorie.length;
    q('azzera').onclick = async () => {
      chiudiFinestra(null);
      if (!await conferma(tr('togliere tutte le categorie'), tr('Togliere tutte e {0} le categorie? <strong>I preset restano ' +
        'tutti</strong>, perdono solo l\'etichetta.', categorie.length), { ok: tr('Togli le {0} categorie', categorie.length), pericolo: true })) return;
      const quante = await store.clearCategories();
      await aggiornaTutto();
      stato(tr('tolte {0} categorie: i preset sono tutti al loro posto', quante), 'ok');
    };
  };
  disegna();
  await finestra({ titolo: tr('Categorie e famiglie'), corpo, larga: true });
}

/* ================================================================ Doppioni
   I preset con le stesse impostazioni («Per suono») o lo stesso nome («Per nome»): niente si toglie
   da solo, si guarda e si sceglie (`12-azioni.js` dell'app, stesse regole). */

function chiaveSuono(record) {
  const effetti = record.effects || [];
  if (!effetti.length) return null;
  const v = x => typeof x === 'number' ? Math.round(x * 10000) / 10000 : x;
  return JSON.stringify([effetti.map(e => [e.name, !!e.enabled,
    (e.params || []).map(p => [p.index, v(p.value)]).sort((a, b) => a[0] - b[0])]), v(record.bpm)]);
}

async function apriDoppioni(modo = 'suono') {
  const perSuono = modo === 'suono';
  const perChiave = new Map();
  for (const r of tutti) {
    const k = perSuono ? chiaveSuono(r) : PresetStore.chiaveNome(r.name);
    if (!k) continue;
    if (!perChiave.has(k)) perChiave.set(k, []);
    perChiave.get(k).push(r);
  }
  const gruppi = [...perChiave.values()].filter(g => g.length > 1)
    .map(g => g.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)))
    .sort((a, b) => (a[0].name || '').localeCompare(b[0].name || '', 'it', { sensitivity: 'base' }));
  const quando = t => t ? new Date(t).toLocaleString(Lingua.attuale,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const corpo = document.createElement('div');
  const seg = document.createElement('div');
  seg.className = 'segmenti';
  seg.style.marginBottom = '12px';
  for (const [m, testo] of [['suono', tr('Per suono')], ['nome', tr('Per nome')]]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = testo;
    if (m === modo) b.classList.add('sì');
    b.addEventListener('click', () => { if (m !== modo) apriDoppioni(m); });
    seg.appendChild(b);
  }
  corpo.appendChild(seg);
  if (!gruppi.length) {
    corpo.insertAdjacentHTML('beforeend', `<p>${perSuono ? tr('Nessun doppione: non ci sono due preset con le stesse impostazioni.')
      : tr('Nessun doppione: ogni nome compare una volta sola.')}</p>`);
  }
  const suono = r => JSON.stringify([r.effects || [], r.bpm]);
  for (const gruppo of gruppi) {
    const box = document.createElement('div');
    box.className = 'gruppo-doppioni';
    box.innerHTML = `<h4>${perSuono ? tr('Stesso suono, {0} preset', gruppo.length)
      : tr('«{0}», {1} volte', testoConNome(gruppo[0].name.trim().replace(/\s+/g, ' ')), gruppo.length)}</h4>`;
    if (perSuono) {
      box.insertAdjacentHTML('beforeend', `<div class="catena-gruppo">${testoConNome((gruppo[0].effects || []).filter(e => e.enabled)
        .map(e => SparkEffetti.nome(e.name)).join(' · ') || tr('(tutti gli effetti spenti)'))}</div>`);
    }
    const lettere = new Map();
    for (const record of gruppo) {
      if (!lettere.has(suono(record))) lettere.set(suono(record), String.fromCharCode(65 + lettere.size));
      const riga = document.createElement('div');
      riga.className = 'riga-doppione';
      const pezzi = [tr('entrato il {0}', quando(record.createdAt))];
      if (residente(record)) pezzi.push(tr('sull\'ampli in {0}', etichetteSlot(record)));
      if ((record.tags || []).length) pezzi.push(tr('{0} tag', record.tags.length));
      if (record.notes) pezzi.push(tr('con note'));
      if (record.famiglia) pezzi.push(tr('con famiglia'));
      const neiBanchi = banchi.filter(b => (b.posti || []).includes(record.id)).map(b => b.nome);
      if (neiBanchi.length) pezzi.push(tr('nei banchi: {0}', neiBanchi.join(', ')));
      const testa = perSuono ? record.name.trim().replace(/\s+/g, ' ')
        : (record.effects || []).filter(e => e.enabled).map(e => SparkEffetti.nome(e.name)).join(' · ') || tr('(catena vuota)');
      riga.innerHTML = (perSuono ? '' : `<span class="lettera" title="${tr('stessa lettera, stesso suono')}">${lettere.get(suono(record))}</span>`) +
        `<div class="dati"><div>${testoConNome(testa)}</div><div>${testoConNome(pezzi.join(' · '))}</div></div>`;
      const togli = document.createElement('button');
      togli.className = 'pericolo';
      togli.textContent = tr('Elimina');
      togli.addEventListener('click', async () => {
        chiudiFinestra(null);
        const avvisoAmpli = residente(record) ? ' ' + tr('Sta sull\'ampli in {0}: l\'ampli non viene toccato.', etichetteSlot(record)) : '';
        const avvisoBanchi = neiBanchi.length ? ' ' + tr('<strong>Sta nei banchi {0}</strong>: quel posto resterà vuoto.', testoConNome(neiBanchi.join(', '))) : '';
        if (await conferma(tr('eliminare un doppione'), tr('Eliminare <strong>{0}</strong>, entrato il {1}? Gli altri restano.',
          testoConNome(record.name), quando(record.createdAt)) + avvisoAmpli + avvisoBanchi, { ok: tr('Elimina'), pericolo: true })) {
          await store.remove(record.id);
          if (ora && ora.record && ora.record.id === record.id) ora.record = null;
          await aggiornaTutto();
          stato(tr('doppione eliminato: «{0}» del {1}', record.name, quando(record.createdAt)), 'ok');
        }
        apriDoppioni(modo);
      });
      riga.appendChild(togli);
      box.appendChild(riga);
    }
    corpo.appendChild(box);
  }
  await finestra({ titolo: tr('Doppioni'), corpo, larga: true });
}

/* ================================================================ Elimina tutti i preset
   Due conferme; gli otto dell'ampli restano (`svuotaTranneAmpli`). */
async function svuotaLibreria() {
  const quanti = (await store.all()).filter(r => !(r.slots || []).length).length;
  if (!quanti) { await avvisa(tr('niente da togliere'), tr('In libreria ci sono solo i preset dell\'ampli.')); return; }
  if (!await conferma(tr('svuotare la libreria'), tr('Eliminare <strong>{0} preset</strong> dalla libreria? Restano solo quelli ' +
    'caricati sull\'ampli, e l\'ampli non viene toccato.', quanti), { ok: tr('Elimina {0} preset', quanti), pericolo: true })) return;
  if (!await conferma(tr('ultima conferma'), tr('<strong>{0} preset, e non si torna indietro.</strong> Con Dropbox collegato ' +
    'spariscono anche dagli altri apparecchi.', quanti), { ok: tr('Sì, elimina'), pericolo: true })) return;
  const tolti = await store.svuotaTranneAmpli();
  if (ora && ora.record && !(await store.get(ora.record.id))) ora.record = null;
  await aggiornaTutto();
  stato(tr('{0} preset eliminati dalla libreria; quelli dell\'ampli restano', tolti), 'ok');
}

/* ================================================================ Informazioni */
async function apriInformazioni() {
  const corpo = document.createElement('div');
  corpo.className = 'about';
  corpo.innerHTML = tr(`<p><strong>SparklingTones</strong> organizza i preset di un amplificatore Spark 2 e li manda
    all'amplificatore via Bluetooth. Gira per intero dentro il browser: non c'è un server, non c'è un account, e la
    libreria resta sull'apparecchio che stai usando.</p><p>Scritto da <strong>Massimo Togni</strong>.</p>
    <h3>Uso libero</h3><p>Questo software è di <strong>libero utilizzo</strong>: si può usare, copiare, modificare e
    ridistribuire, alle condizioni della licenza MIT, di cui trovi il testo nel file <code>LICENSE</code> insieme al codice.</p>
    <h3>Nessuna garanzia, nessuna responsabilità</h3><p>Il software è fornito <strong>«così com'è»</strong>, senza garanzie
    di alcun tipo, esplicite o implicite. <strong>L'autore non si assume alcuna responsabilità</strong> per danni diretti o
    indiretti derivanti dall'uso di questo software: fra questi la perdita o l'alterazione dei preset salvati nell'amplificatore
    o nella libreria, malfunzionamenti dell'apparecchio, e qualunque conseguenza di un comando mandato via Bluetooth.
    <strong>Lo usi a tuo rischio.</strong></p><p>Scrivere un preset in uno slot <strong>sovrascrive</strong> quello che c'era,
    e un amplificatore può smettere di rispondere e richiedere di essere spento e riacceso. Tieni un backup dei preset a cui tieni.</p>
    <h3>Nessun rapporto con Positive Grid</h3><p>Questo software è un progetto indipendente e <strong>non ha alcun rapporto con
    Positive Grid Inc.</strong>: non è prodotto, approvato, sponsorizzato, verificato né supportato da Positive Grid, e non ne usa
    codice. «Positive Grid» e «Spark» sono marchi dei rispettivi titolari, citati unicamente per indicare con quale apparecchio
    questo software funziona.</p>
    <h3>Su cosa è stato provato</h3><p>Provato <strong>solo su Spark 2</strong>, e su un solo esemplare. Il protocollo è stato
    ricostruito osservando l'apparecchio, non è documentazione ufficiale.</p>
    <h3>Cosa esce da qui</h3><p>Niente. Nessun dato viene raccolto né inviato: l'unica cosa che il programma comunica sono i
    comandi all'amplificatore e al pedale, via Bluetooth, e — solo se lo colleghi tu — il backup sul tuo Dropbox.</p>
    <h3>Grazie a, e licenze</h3><p><strong>Soundshed</strong> — <em>licenza MIT</em>. Da lì vengono i nomi in chiaro degli
    effetti e delle loro manopole: <code>sparkFxCatalog.ts</code>, Copyright (c) Soundshed contributors.
    <a href="https://github.com/soundshed/soundshed-app" target="_blank" rel="noopener noreferrer">github.com/soundshed/soundshed-app</a></p>
    <p><strong>paulhamsh/Spark</strong> — <em>licenza Apache 2.0</em>. Il riferimento funzionante da cui è stata capita la
    struttura dei messaggi. <a href="https://github.com/paulhamsh/Spark" target="_blank" rel="noopener noreferrer">github.com/paulhamsh/Spark</a></p>
    <p>I nomi dei modelli di riverbero e degli altri modelli sono quelli che si leggono nell'app ufficiale, trascritti a mano per
    poterli riconoscere: sono citazioni, non codice.</p>`);
  await finestra({ titolo: tr('Informazioni, licenze e responsabilità'), corpo, larga: true });
}
