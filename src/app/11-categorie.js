// Sparkling Tones — 11-categorie.js: Le categorie.
// Un pezzo dello script dell'app, che fino al 7 ottobre 2026 stava dentro
// index.html. I pezzi si caricano in fila, nell'ordine del numero, come
// script classici: const, let e funzioni di uno si vedono negli altri. Una
// funzione si puo' chiamare da ovunque quando l'app gira, ma il codice che
// parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Categorie
   ==================================================================== */

$('btnCategorie').addEventListener('click', () => {
  disegnaElencoFamiglie();
  disegnaElencoCategorie();
  apriPannello('pannelloCategorie');
});

/**
 * Le famiglie con quanti preset le portano e il colore, che qui si
 * cambia. Il colore è una scelta dell'utente come i nomi dei parametri: si
 * salva nelle preferenze e va nel backup.
 */
function disegnaElencoFamiglie() {
  const elenco = $('elencoFamiglie');
  elenco.innerHTML = '';

  for (const famiglia of famiglie) {
    const quanti = tutti.filter(r => r.famiglia === famiglia.id).length;

    const voce = document.createElement('div');
    voce.className = 'voce famiglia-voce';

    const colore = document.createElement('input');
    colore.type = 'color';
    colore.value = famiglia.colore;
    colore.title = tr`colore di ${famiglia.nome}`;
    colore.addEventListener('change', async () => {
      await store.setColoreFamiglia(famiglia.id, colore.value);
      await ricarica();
      disegnaElencoFamiglie();
      disegnaPreset();
    });

    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = famiglia.nome;

    const conta = document.createElement('span');
    conta.className = 'badge';
    conta.textContent = quanti === 1 ? tr('1 preset') : tr`${quanti} preset`;

    voce.append(colore, nome, conta);

    // Il colore di partenza si può rimettere, ma solo se è stato cambiato:
    // un pulsante che non fa niente è peggio di un pulsante che non c'è.
    if (famiglia.suo) {
      const rimetti = document.createElement('button');
      rimetti.className = 'icon';
      rimetti.textContent = '↺';
      rimetti.title = tr('rimetti il colore di partenza');
      rimetti.addEventListener('click', async () => {
        await store.setColoreFamiglia(famiglia.id, '');
        await ricarica();
        disegnaElencoFamiglie();
        disegnaPreset();
      });
      voce.appendChild(rimetti);
    }
    elenco.appendChild(voce);
  }
}

function disegnaElencoCategorie() {
  const elenco = $('elencoCategorie');
  elenco.innerHTML = '';
  if (categorie.length === 0) {
    elenco.innerHTML = '<div class="vuoto-sezione">' + tr('Nessuna categoria. ' +
                       'Creane una qui sopra, o dal dettaglio di un preset.') + '</div>';
    return;
  }

  for (const { nome, quanti } of categorie) {
    const voce = document.createElement('div');
    voce.className = 'voce';

    const campo = document.createElement('input');
    campo.type = 'text';
    campo.value = nome;
    campo.addEventListener('change', async () => {
      const nuovo = campo.value.trim();
      if (!nuovo || nuovo === nome) { campo.value = nome; return; }
      await store.renameCategory(nome, nuovo);
      await ricarica();
      disegnaElencoCategorie();
      disegnaPreset();
    });

    const conta = document.createElement('span');
    conta.className = 'badge';
    conta.textContent = quanti === 1 ? tr('1 preset') : tr`${quanti} preset`;

    const via = document.createElement('button');
    via.className = 'icon';
    via.textContent = '✕';
    via.title = tr('elimina la categoria');
    via.addEventListener('click', async () => {
      const avviso = tr`Eliminare la categoria <strong>${testoConNome(nome)}</strong>?` + ' ' +
        (quanti === 0
          ? tr('Non ce l\'ha nessun preset.')
          : tr`La perdono ${quanti} preset, che restano tutti in libreria.`);
      if (!await conferma(tr('eliminare la categoria'), avviso,
                          { ok: tr('Elimina'), pericolo: true })) return;
      await store.removeCategory(nome);
      await ricarica();
      disegnaElencoCategorie();
      disegnaPreset();
    });

    voce.append(campo, conta, via);
    elenco.appendChild(voce);
  }
}

$('btnAggiungiCategoria').addEventListener('click', async () => {
  const nome = $('nuovaCategoria').value.trim();
  if (!nome) return;
  await store.addCategory(nome);
  $('nuovaCategoria').value = '';
  await ricarica();
  disegnaElencoCategorie();
  disegnaPreset();
});

$('nuovaCategoria').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('btnAggiungiCategoria').click();
});

$('btnAzzeraCategorie').addEventListener('click', async () => {
  if (categorie.length === 0) return;
  if (!await conferma(tr('togliere tutte le categorie'),
    tr('Togliere tutte e {0} le categorie? <strong>I preset restano ' +
    'tutti</strong>, perdono solo l\'etichetta. Serve a ripartire da zero dopo un import.', categorie.length),
    { ok: tr`Togli le ${categorie.length} categorie`, pericolo: true })) return;
  const quante = await store.clearCategories();
  logLine(tr`tolte ${quante} categorie: i preset sono tutti al loro posto`);
  await ricarica();
  disegnaElencoCategorie();
  disegnaPreset();
});

