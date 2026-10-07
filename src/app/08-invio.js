// Sparkling Tones — 08-invio.js: L'invio di un preset all'ampli.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Invio di un preset all'ampli
   ==================================================================== */

/**
 * Salva il payload che non siamo riusciti a interpretare, in esadecimale.
 * Serve a capire cosa manda l'ampli quando il parser si blocca.
 */
function scaricaDiagnostica() {
  const guasto = spark.lastFailedPayload;
  if (!guasto) return;
  const contenuto = {
    cosa:      guasto.label,
    errore:    guasto.error,
    quando:    guasto.at,
    lunghezza: guasto.payload.length,
    hex:       guasto.payload.map(b => b.toString(16).padStart(2, '0')).join(' '),
  };
  const blob = new Blob([JSON.stringify(contenuto, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spark-payload-illeggibile-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Manda un preset all'ampli e verifica l'esito rileggendolo.
 * L'ack conferma solo la ricezione: l'unica prova che il preset sia stato
 * applicato è ritrovarlo sull'ampli.
 *
 * @param slot numero dello slot, oppure null per farlo suonare e basta
 */
async function mandaPreset(record, slot) {
  const soloProva = slot === null;
  const dove = soloProva ? tr('suono corrente') : nomeSlot(slot);

  // Prima di mandare: l'ampli conferma i chunk anche quando il payload è
  // malformato, e poi lo ignora. Meglio accorgersene qui, dove si può dire
  // cosa non va, che sull'ampli dove il sintomo è solo silenzio.
  // Con l'elenco dei modelli: un nome che l'ampli non ha lo pianta davvero.
  const controllo = Spark.controllaPreset(record, { modelli: SparkEffetti.MODELLI.flat() });
  if (controllo.errori.length) {
    logLine(tr('«{0}» non è mandabile così com\'è — {1}{2}. ' +
            'Non l\'ho inviato: l\'ampli avrebbe confermato i chunk e ignorato tutto. ' +
            'Se viene dal backup dell\'app ufficiale, reimportalo: la conversione è ' +
            'stata corretta.', record.name,
            controllo.errori.slice(0, 3).join('; '),
            controllo.errori.length > 3 ? tr` (e altri ${controllo.errori.length - 3})` : ''));
    return;
  }
  if (controllo.avvisi.length) logLine(tr`nota su «${record.name}»: ${controllo.avvisi.join('; ')}`);

  // **L'unico posto dove il sintomo arrivava senza spiegazione.** Il preset
  // parte, l'ampli conferma tutto, la rilettura dice che è quello giusto — e il
  // fuzz non c'è. Si dice **prima**, e non nella verifica: il punto è saperlo
  // mentre si porge l'orecchio, non dopo aver dato la colpa all'app. E si dice
  // qui una volta sola, invece che in ognuno dei rami di verifica qui sotto.
  //
  // Resta un avviso **al buio**: all'ampli non si può chiedere se il pacchetto
  // sia sbloccato, quindi questa riga parla anche quando va tutto bene. È il
  // motivo per cui di posti così ce n'è uno, e non cinque: una scritta che
  // grida al lupo ogni volta smette di essere letta.
  const hendrix = SparkEffetti.hendrixNellaCatena(record.effects);
  if (hendrix.length) {
    logLine(tr('«{0}» ha {1} del pacchetto Jimi Hendrix ({2}). ' +
            'Se non li senti, collega una volta l\'app ufficiale all\'ampli e riprova: ' +
            'lo sblocco resta finché non lo spegni.', record.name,
            hendrix.length === 1 ? tr('un effetto') : tr('effetti'), hendrix.map(n => SparkEffetti.nome(n)).join(', ')));
  }

  try {
    const avanzamento = (i, total) =>
      logProgress(tr`invio «${record.name}» → ${dove}: chunk ${i + 1} di ${total}…`);
    const esito = soloProva
      ? await spark.loadPreset(record, avanzamento)
      : await spark.storePreset(record, slot, avanzamento);
    if (!esito.ok) {
      logLine(tr('invio interrotto: {0}. ' +
              'L\'ampli potrebbe essere rimasto a metà: rileggi per controllare.', esito.error));
      return;
    }

    const inviato = tr`inviato al ${dove} (${esito.acks}/${esito.total} confermati)`;
    logLine(inviato + tr(', verifico…'));
    await new Promise(r => setTimeout(r, 400));

    if (!spark.connected) {
      logLine(tr`${inviato}, ma l'ampli si è disconnesso durante l'invio.`);
      return;
    }

    // Prima una domanda semplice, di quelle che sappiamo funzionare: distingue
    // «l'ampli è bloccato» da «l'ampli sta bene ma il preset non è arrivato».
    const vivo = await spark.request(Spark.commands.getCurrentPreset(),
      m => m.cmd === Spark.CMD_NOTIFY && m.sub === 0x10, 1500);
    if (!vivo) {
      logLine(tr('{0}, ma ora l\'ampli non risponde più nemmeno a una ' +
              'domanda semplice: l\'invio l\'ha bloccato.', inviato));
      return;
    }

    const letto = soloProva ? await spark.readLiveState() : await spark.readPreset(slot);

    if (!letto && spark.lastFailedPayload) {
      scaricaDiagnostica();
      logLine(tr('{0}, ma non so leggere quello che l\'ampli risponde: ' +
              'ho scaricato il payload grezzo nei Download.', inviato));
    } else if (!letto && soloProva) {
      logLine(tr('{0}, ma non riesco a rileggere il suono corrente per verificare. ' +
              'Ascolta: il suono è cambiato?', inviato));
    } else if (!letto) {
      logLine(tr('{0}. L\'ampli risponde alle domande semplici ma non rilegge ' +
              '{1}.', inviato, nomeSlot(slot)));
    } else if (letto.uuid === record.uuid) {
      logLine(tr`«${record.name}» è ora sul ${dove}. Verificato rileggendolo.` +
              (soloProva ? tr(' Il LED lampeggia perché l\'ampli sta suonando il preset ' +
                           'software, che non è nessuno degli otto slot.') : ''));
      if (!soloProva) {
        await store.assignSlots({ [record.id]: slot });
        await ricarica();
        disegnaPreset();
        disegnaLive();
      }
    } else {
      logLine(tr('{0}, ma {1} riporta ancora «{2}»: ' +
              'il preset non è stato applicato. L\'ampli ha confermato i chunk ' +
              'senza usarli.', inviato, dove, letto.name));
    }
  } catch (err) {
    logLine(tr('invio fallito: {0}', err.message));
  }
}

