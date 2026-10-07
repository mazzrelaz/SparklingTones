// Sparkling Tones — 07-vista-live.js: La vista live.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Vista live
   ==================================================================== */

function bancoCorrente() {
  if (live.banco === BANCO_AMPLI) return null;
  return banchi.find(b => b.id === live.banco) || null;
}

/** Gli otto record del banco mostrato: dall'ampli o dal banco salvato. */
function postiDelBanco() {
  const banco = bancoCorrente();
  if (!banco) return suAmpli.slice();      // otto sullo Spark 2, quattro sul NEO
  return banco.posti.map(id => (id === null ? null : perId(id)));
}

/**
 * Scambia due posti di un banco. Non tocca l'ampli: i banchi inventati non ci
 * scrivono mai, quindi riordinarli è solo una scrittura nelle preferenze.
 */
async function scambiaNelBanco(banco, da, a) {
  const idDa = banco.posti[da];
  const idA  = banco.posti[a];
  await store.setBankSlot(banco.id, da, idA);
  await store.setBankSlot(banco.id, a,  idDa);
  live.sposta = null;
  await ricarica();
  disegnaLive();
  const nome = r => (r ? `«${r.name}»` : tr('il posto vuoto'));
  logLine(tr`${nome(perId(idDa))} ora è al posto ${a + 1}` +
          (idA === null ? '' : tr`, ${nome(perId(idA))} al ${da + 1}`));
}

function disegnaLive() {
  disegnaBanchi();

  const griglia = $('pads');
  griglia.innerHTML = '';
  const banco = bancoCorrente();
  const posti = postiDelBanco();
  griglia.classList.toggle('quattro', posti.length === 4);

  posti.forEach((record, posto) => {
    const pad = document.createElement('button');
    const vuoto = !record;

    pad.className = 'pad'
      + (vuoto ? ' libero' : '')
      + (record && record.id === live.attivo ? ' attivo' : '')
      + (live.occupato ? ' occupato' : '')
      + (live.modifica && banco ? ' inModifica' : '')
      + (live.sposta === posto ? ' inMano' : '');

    const ledpad = document.createElement('span');
    ledpad.className = 'ledpad';
    if (!vuoto) ledpad.style.setProperty('--led', coloreLed(record));

    const numero = document.createElement('span');
    numero.className = 'n';
    numero.textContent = banco ? posto + 1 : postoAmpli(posto).label;

    const nome = document.createElement('span');
    nome.textContent = vuoto
      ? (banco ? (live.modifica ? tr('tocca per scegliere') : tr('vuoto')) : tr('non letto'))
      : record.name;

    // Niente «● istantaneo» / «● da caricare»: tolti su richiesta il 14 agosto
    // 2026. La differenza di velocità resta vera — chi non è in uno slot va
    // trasmesso e ci mette circa un secondo — ma si sente suonando, e scritta su
    // ognuno degli otto pulsanti era solo rumore. Nel banco fisso lo slot sta
    // già nell'angolo, quindi lì la riga resta vuota del tutto.
    const sub = document.createElement('span');
    sub.className = 'sub';
    if (!vuoto && banco) sub.textContent = etichetteSlot(record);

    const barra = document.createElement('span');
    barra.className = 'barra';

    pad.append(ledpad, numero, nome, sub, barra);

    if (live.modifica && banco) {
      pad.disabled = false;
      pad.addEventListener('click', () => {
        if (live.sposta === null)   return scegliPer(banco, posto);
        if (live.sposta === posto) { live.sposta = null; disegnaLive(); return; }
        scambiaNelBanco(banco, live.sposta, posto);
      });

      // La presa per spostare: un tocco qui prende il preset, un tocco su un
      // altro posto li scambia. Sta su un angolo suo e non ruba il tocco al
      // resto del pulsante, che continua a servire per scegliere cosa metterci.
      // Scambio e non inserimento: con otto posti fissi «sposta in mezzo» vorrebbe
      // dire far scalare tutti gli altri, e nessuno se lo aspetta da una pedaliera.
      if (!vuoto) {
        const presa = document.createElement('span');
        presa.className = 'presa' + (live.sposta === posto ? ' viva' : '');
        presa.textContent = '⇅';
        presa.title = live.sposta === posto
          ? tr('tocca un altro posto per scambiare, o qui per lasciar perdere')
          : tr('sposta questo preset in un altro posto');
        presa.addEventListener('click', event => {
          event.stopPropagation();
          live.sposta = live.sposta === posto ? null : posto;
          disegnaLive();
        });
        pad.appendChild(presa);
      }
    } else {
      pad.disabled = vuoto || !spark.connected || live.occupato;
      if (!vuoto) pad.addEventListener('click', () => attiva(record, barra));
    }
    griglia.appendChild(pad);
  });

  $('btnModifica').textContent = live.modifica ? tr('Fatto') : tr('Modifica');
  $('btnModifica').className = 'solo-live' + (live.modifica ? ' primary' : '');
}

function disegnaBanchi() {
  const barra = $('banchi');
  barra.innerHTML = '';

  const ampli = document.createElement('span');
  ampli.className = 'banco' + (live.banco === BANCO_AMPLI ? ' attivo' : '');
  ampli.textContent = tr('Ampli');
  ampli.title = tr('gli otto preset caricati sull\'ampli: sempre istantanei');
  ampli.addEventListener('click', () => {
    live.banco = BANCO_AMPLI;
    live.modifica = false;
    disegnaLive();
  });
  barra.appendChild(ampli);

  for (const banco of banchi) {
    const b = document.createElement('span');
    b.className = 'banco' + (live.banco === banco.id ? ' attivo' : '');
    b.textContent = banco.nome;
    b.addEventListener('click', () => {
      if (live.banco === banco.id && live.modifica) { rinominaOElimina(banco); return; }
      live.banco = banco.id;
      disegnaLive();
    });
    barra.appendChild(b);
  }

  const piu = document.createElement('span');
  piu.className = 'banco aggiungi';
  piu.textContent = tr('＋ banco');
  piu.addEventListener('click', async () => {
    const nome = await chiediTesto(tr('nuovo banco'),
      tr('Otto posti, quattro per piede. I banchi inventati non scrivono mai sull\'ampli.'),
      tr`Banco ${banchi.length + 1}`, { ok: tr('Crea il banco') });
    if (nome === null) return;
    const banco = await store.addBank(nome);
    await ricarica();
    live.banco = banco.id;
    live.modifica = true;
    disegnaLive();
  });
  barra.appendChild(piu);
}

/**
 * Il nome del banco, o via il banco.
 *
 * Erano due finestre di sistema in fila — un `prompt` in cui **svuotare il
 * campo** voleva dire «eliminalo», e poi un `confirm` — e quella scorciatoia
 * non la indovinava nessuno: chi cancellava il nome per riscriverlo si trovava
 * a rispondere di un'eliminazione che non aveva chiesto. Adesso sono due
 * bottoni che dicono quello che fanno, più la via d'uscita.
 */
const ELIMINA_BANCO = {};   // un valore che non è nessun nome possibile

async function rinominaOElimina(banco) {
  const scelto = await finestra({
    titolo: tr('banco live'),
    testo: tr('Cambiagli nome, oppure eliminalo: <strong>i preset restano in ' +
           'libreria</strong>, sparisce solo l\'ordine in cui li avevi messi.'),
    campo: { valore: banco.nome },
    azioni: [
      { testo: tr('Salva il nome'), classe: 'primary', vuoleTesto: true },
      { testo: tr('Elimina il banco'), classe: 'pericolo', valore: ELIMINA_BANCO },
      { testo: tr('Annulla'), valore: null },
    ],
  });
  if (scelto === null) return;
  if (scelto === ELIMINA_BANCO) {
    await store.removeBank(banco.id);
    live.banco = BANCO_AMPLI;
  } else {
    await store.renameBank(banco.id, scelto);
  }
  await ricarica();
  disegnaLive();
}

async function attiva(record, barra) {
  if (live.occupato || !spark.connected) return;
  live.occupato = true;
  live.attivo = record.id;
  disegnaLive();

  try {
    if (residente(record)) {
      // Se sta in più slot va bene il primo: il suono è lo stesso.
      const slot = slotsDi(record)[0];
      await spark.send(Spark.commands.changePreset(slot));
      logLine(`${record.name} — ${postoAmpli(slot).label}`);
    } else {
      await spark.loadPreset(record, (i, total) => {
        barra.style.width = Math.round(((i + 1) / total) * 100) + '%';
      });
      logLine(tr`${record.name} — caricato nel preset software`);
    }
  } catch (err) {
    logLine(tr('errore: {0}', err.message));
    live.attivo = null;
  }
  live.occupato = false;
  disegnaLive();
}

/* ---- scelta del preset per un posto del banco ---------------------- */

let sceltaInCorso = null;   // {bancoId, posto}

function scegliPer(banco, posto) {
  sceltaInCorso = { bancoId: banco.id, posto };
  $('titoloScegli').textContent = tr`${banco.nome} — posto ${posto + 1}`;
  $('cercaScegli').value = '';
  disegnaElencoScelta();
  apriPannello('pannelloScegli');
}

function disegnaElencoScelta() {
  const elenco = $('elencoScegli');
  elenco.innerHTML = '';
  const termine = $('cercaScegli').value.trim().toLowerCase();
  const candidati = tutti.filter(r => !termine || (r.name || '').toLowerCase().includes(termine));

  if (candidati.length === 0) {
    elenco.innerHTML = '<div class="vuoto-sezione">' + tr('Nessun preset.') + '</div>';
    return;
  }

  for (const record of candidati) {
    const voce = document.createElement('div');
    voce.className = 'voce';
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = record.name;
    voce.appendChild(nome);
    if (residente(record)) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = etichetteSlot(record);
      voce.appendChild(badge);
    }
    voce.addEventListener('click', async () => {
      if (!sceltaInCorso) return;
      await store.setBankSlot(sceltaInCorso.bancoId, sceltaInCorso.posto, record.id);
      sceltaInCorso = null;
      chiudiPannelli();
      await ricarica();
      disegnaLive();
    });
    elenco.appendChild(voce);
  }
}

$('cercaScegli').addEventListener('input', disegnaElencoScelta);

$('btnSvuotaPosto').addEventListener('click', async () => {
  if (!sceltaInCorso) return;
  await store.setBankSlot(sceltaInCorso.bancoId, sceltaInCorso.posto, null);
  sceltaInCorso = null;
  chiudiPannelli();
  await ricarica();
  disegnaLive();
});

$('btnModifica').addEventListener('click', () => {
  if (live.banco === BANCO_AMPLI) {
    logLine(tr('Il banco «Ampli» rispecchia gli otto slot dell\'ampli: per cambiarlo ' +
            'scrivi un preset in uno slot dalla sezione Preset.'));
    return;
  }
  live.modifica = !live.modifica;
  live.sposta = null;              // uscendo dalla modifica non resta niente in mano
  disegnaLive();
});

