/**
 * test/giri-telefono.js — giri completi sull'app del telefono con l'ampli finto (19 novembre 2026).
 *
 * L'app del telefono non sa caricare l'ampli finto (`pc.html#finto` sì) e non la si tocca per
 * questo: ci pensa `tools/prove.js`, che prima degli script della pagina mette `iniezione()`.
 * Quando `spark-transport.js` si carica, il suo `SparkTransport` viene tenuto da parte e al suo
 * posto la pagina trova un costruttore che dà l'ampli finto di `test/ampli-finto.js` (stessa
 * interfaccia). Tutto il resto dell'app è quello vero. Vale solo dentro i giri.
 *
 * Come `giri-pc.js`: si guardano le cose, non le parole, e cosa arriva all'ampli (`spark.comandi`).
 */
'use strict';

const fs = require('fs');
const path = require('path');

function iniezione(radice) {
  const finto = fs.readFileSync(path.join(radice, 'test', 'ampli-finto.js'), 'utf8');
  return `(() => {
    function caricaFinto() {
${finto}
    }
    let vero;
    Object.defineProperty(window, 'SparkTransport', {
      configurable: true,
      get() { return vero; },
      set(v) {
        // spark-transport.js ha appena finito: Spark e SparkEffetti ci sono già.
        caricaFinto();
        const Finto = window.AmpliFinto;
        vero = function (gestori) { return new Finto(gestori); };
        vero.vero = v;
      },
    });
    if (!navigator.bluetooth) Object.defineProperty(navigator, 'bluetooth', { value: {} });
  })();`;
}

const { uguale, arrivato, chiudiPrimaApertura } = require('./aiuti-giri.js');

async function collega(p) {
  await p.aspetta(`typeof spark !== 'undefined' && spark.finto`, 5000, 'ampli finto al posto del Bluetooth');
  await chiudiPrimaApertura(p);
  await p.valuta(`document.getElementById('status').click()`);
  // Gli slot li legge da sola, e intanto i pulsantoni non rispondono (`live.occupato`).
  await p.aspetta(`spark.connected && spark.letture > 0 && !live.occupato &&
    document.querySelectorAll('.slotcard').length === 8`, 8000, 'collegamento e lettura degli slot');
  await p.valuta(`spark.comandi.length = 0`);
}

/** Va nella Live e mostra il banco col nome dato (o quello dell'ampli). */
async function apriLive(p, banco) {
  await p.valuta(`document.getElementById('tabLive').click()`);
  await p.aspetta(`document.body.classList.contains('vista-live') &&
    document.querySelectorAll('.pad').length === 8`, 3000, 'la Live con otto pulsantoni');
  if (banco) {
    await p.valuta(`[...document.querySelectorAll('#banchi .banco')].find(b => b.textContent === ${JSON.stringify(banco)}).click()`);
    await p.aspetta(`live.banco !== 'ampli'`, 2000, 'il banco ' + banco);
  }
}

/** Un banco col nome del preset, e nel primo posto una copia del primo slot (modificabile). */
async function bancoConCopia(p, nome, modifica) {
  await p.valuta(`(async () => {
    const tutti = await store.all();
    const base = tutti.find(r => (r.slots || []).includes(0));
    const id = await store.duplicate(base.id, ${JSON.stringify(nome)});
    const r = await store.get(id);
    ${modifica || ''}
    await store.put(r);
    const banco = await store.addBank(${JSON.stringify(nome)});
    await store.setBankSlot(banco.id, 0, id);
    await ricarica();
    disegnaLive();
  })()`);
}

module.exports = {
  nome: 'Telefono',
  pagina: 'index.html',
  iniezione,
  prove: [
    {
      nome: 'si collega e mostra gli otto slot',
      fai: async p => {
        await collega(p);
        const etichette = await p.valuta(`[...document.querySelectorAll('.slotcard')]
          .map(c => c.textContent.trim().slice(0, 2))`);
        uguale(etichette, ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'], 'gli slot in cima');
      },
    },
    {
      nome: 'la Live: il pulsantone di uno slot è istantaneo (0x0138)',
      fai: async p => {
        await collega(p);
        await apriLive(p);
        await p.valuta(`document.querySelectorAll('.pad')[2].click()`);
        await arrivato(p, `c[0] === 'slot' && c[1] === 2`, 'cambio allo slot A3');
        uguale(await p.valuta(`spark.comandi.filter(c => c[0] === 'preset').length`), 0, 'preset interi mandati');
      },
    },
    {
      nome: 'la Live: un preset fuori dall\'ampli parte intero (0x0101)',
      fai: async p => {
        await collega(p);
        await bancoConCopia(p, 'Giro prova');
        await apriLive(p, 'Giro prova');
        await p.valuta(`document.querySelectorAll('.pad')[0].click()`);
        await arrivato(p, `c[0] === 'preset' && c[1] === 'Giro prova'`, 'il preset all\'ampli');
      },
    },
    {
      // Il guasto dell'audit del 19 novembre: la Live del telefono mandava senza controllare.
      nome: 'la Live: un modello inesistente non parte, e lo dice',
      fai: async p => {
        await collega(p);
        await bancoConCopia(p, 'Giro guasto', `r.effects[2].name = 'TrebleBooster';`);
        await apriLive(p, 'Giro guasto');
        await p.valuta(`document.querySelectorAll('.pad')[0].click()`);
        await p.aspetta(`(document.querySelector('.velo-elenco') || {}).textContent || ''`, 4000, 'la finestra d\'avviso');
        const finestra = await p.valuta(`document.querySelector('.velo-elenco').textContent`);
        if (!/TrebleBooster/.test(finestra)) throw new Error('la finestra non nomina il modello: ' + finestra);
        uguale(await p.valuta(`spark.comandi.filter(c => c[0] === 'preset').length`), 0, 'preset mandati');
      },
    },
    {
      nome: 'l\'editor: «Regola» e una manopola arrivano all\'ampli (0x0104)',
      fai: async p => {
        await collega(p);
        await p.valuta(`document.querySelectorAll('.slotcard')[0].click()`);
        // «Regola» si riconosce dall'icona, non dalla scritta (le lingue cambiano): l'SVG come il
        // browser lo riscrive, non come sta nel sorgente.
        await p.valuta(`window.iconaRegola = () => { const d = document.createElement('div'); d.innerHTML = ICONE_SCHEDA.regola; return d.innerHTML; }`);
        await p.aspetta(`[...document.querySelectorAll('button')].find(b => b.offsetParent &&
          b.innerHTML.startsWith(iconaRegola())) || null`, 3000, 'il tasto Regola');
        await p.valuta(`[...document.querySelectorAll('button')].find(b => b.offsetParent &&
          b.innerHTML.startsWith(iconaRegola())).click()`);
        await p.aspetta(`inModifica && !inModifica.offline &&
          [...document.querySelectorAll('#pannelloEditor .manopola-img')].some(m => m.offsetParent)`, 5000,
          'l\'editor aperto con l\'ampli');
        await arrivato(p, `c[0] === 'preset' && c[1] === 'Silver Lining'`, '«Regola» manda il preset');
        await p.valuta(`spark.comandi.length = 0`);
        await p.trascina(`[...document.querySelectorAll('#pannelloEditor .manopola-img')].find(m => m.offsetParent)`, 0, -40);
        const c = await arrivato(p, `c[0] === 'param'`, 'un parametro all\'ampli');
        const sullAmpli = await p.valuta(`(e => e && e.params.find(x => x.index === ${c[2]}).value)
          (spark.vivo.effects.find(e => e.name === ${JSON.stringify(c[1])}))`);
        uguale(sullAmpli, c[3], 'il valore arrivato all\'ampli finto');
      },
    },
  ],
};
