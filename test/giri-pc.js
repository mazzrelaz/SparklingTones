/**
 * test/giri-pc.js — giri completi sulla pagina del PC con l'ampli finto (19 novembre 2026).
 *
 * Li fa girare `node tools/prove.js` (o `node tools/prove.js giri`). Ogni prova riapre
 * `pc.html#finto` da capo, clicca come farebbe una persona e guarda due cose: cosa compare sullo
 * schermo e cosa è arrivato all'ampli finto (`spark.comandi`: `['slot', n]`, `['param', effetto,
 * indice, valore]`, `['onoff', effetto, acceso]`, `['preset', nome]`…). Dice come si comporta la
 * pagina, non come risponde l'ampli vero: per quello serve lo Spark.
 *
 * Si guardano le cose, non le parole: Edge senza finestra parla inglese, e le scritte cambiano.
 * Profilo nuovo a ogni giro: la libreria vera non si tocca.
 */
'use strict';

const { uguale, arrivato, chiudiPrimaApertura } = require('./aiuti-giri.js');
const testo = (p, id) => p.valuta(`document.getElementById(${JSON.stringify(id)}).textContent.trim()`);

async function collega(p) {
  await p.aspetta(`typeof spark !== 'undefined' && spark.finto`, 5000, 'ampli finto caricato');
  await chiudiPrimaApertura(p);
  await p.valuta(`document.getElementById('collega').click()`);
  // Collegato, otto slot letti e il suono di adesso sul palco (`ora`), senza lavori in corso.
  await p.aspetta(`spark.connected && !occupato && ora &&
    document.querySelectorAll('#elenco-corpo .etichetta-ampli').length >= 8`, 8000, 'collegamento e lettura degli slot');
  await p.aspetta(`!document.querySelector('.velo')`, 3000, 'nessuna finestra aperta');
  await p.valuta(`spark.comandi.length = 0`);
}

/** Un preset nuovo in libreria, copia del primo slot con un altro nome (e, volendo, una modifica). */
async function mettiInLibreria(p, nome, modifica) {
  await p.valuta(`(async () => {
    const tutti = await store.all();
    const base = tutti.find(r => (r.slots || []).includes(0));
    const id = await store.duplicate(base.id, ${JSON.stringify(nome)});
    const r = await store.get(id);
    ${modifica || ''}
    await store.put(r);
    await ricarica();
    disegnaTutto();
  })()`);
  await p.aspetta(`[...document.querySelectorAll('#elenco-corpo .riga-preset .nome')]
    .some(e => e.textContent === ${JSON.stringify(nome)})`, 3000, 'preset nuovo nell\'elenco');
}
const clicRiga = (p, nome) => p.valuta(`[...document.querySelectorAll('#elenco-corpo .riga-preset')]
  .find(r => r.querySelector('.nome') && r.querySelector('.nome').textContent === ${JSON.stringify(nome)}).click()`);

module.exports = {
  nome: 'PC',
  pagina: 'pc.html#finto',
  prove: [
    {
      nome: 'si collega e mostra gli otto slot',
      fai: async p => {
        await collega(p);
        const etichette = await p.valuta(`[...document.querySelectorAll('#elenco-corpo .riga-preset .etichetta-ampli')]
          .map(e => e.textContent)`);
        uguale(etichette.slice(0, 8), ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'], 'gli slot in cima');
        uguale(await testo(p, 'preset-dove'), 'A1', 'lo slot che suona');
        uguale(await testo(p, 'preset-nome'), 'Silver Lining', 'il nome sul palco');
      },
    },
    {
      nome: 'un clic su uno slot lo fa suonare (0x0138)',
      fai: async p => {
        await collega(p);
        await p.valuta(`document.querySelectorAll('#elenco-corpo .riga-preset')[4].click()`);
        await arrivato(p, `c[0] === 'slot' && c[1] === 4`, 'cambio allo slot B1');
        await p.aspetta(`document.getElementById('preset-nome').textContent.trim() === 'Metal Riff'`, 4000, 'B1 sul palco');
        uguale(await testo(p, 'preset-dove'), 'B1', 'lo slot che suona');
      },
    },
    {
      nome: 'la freccia passa allo slot dopo',
      fai: async p => {
        await collega(p);
        await p.valuta(`document.getElementById('dopo').click()`);
        await arrivato(p, `c[0] === 'slot' && c[1] === 1`, 'cambio allo slot A2');
      },
    },
    {
      nome: 'una manopola manda il parametro all\'ampli (0x0104)',
      fai: async p => {
        await collega(p);
        const prima = await p.valuta(`spark.vivo.effects.find(e => e.name === 'Twin').params[0].value`);
        await p.valuta(`document.querySelector('#manopole .girevole').dispatchEvent(
          new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }))`);
        const c = await arrivato(p, `c[0] === 'param'`, 'un parametro all\'ampli');
        uguale([c[1], c[2]], ['Twin', 0], 'effetto e manopola');
        uguale(Math.round((c[3] - prima) * 100), 1, 'di quanto è salita');
      },
    },
    {
      nome: 'acceso/spento di un effetto (0x0115)',
      fai: async p => {
        await collega(p);
        // il secondo anello è il compressore, spento in Silver Lining
        await p.valuta(`document.querySelectorAll('#catena .anello .chip')[1].click()`);
        const c = await arrivato(p, `c[0] === 'onoff'`, 'acceso/spento all\'ampli');
        uguale([c[1], c[2]], ['LA2AComp', true], 'quale effetto e come');
      },
    },
    {
      nome: 'la Live: il pulsantone fa suonare il suo slot',
      fai: async p => {
        await collega(p);
        await p.valuta(`document.getElementById('apri-live').click()`);
        await p.aspetta(`document.querySelectorAll('.schermo.live .lv-posto').length === 8`, 4000, 'otto pulsantoni');
        await p.valuta(`document.querySelectorAll('.schermo.live .lv-posto')[2].click()`);
        await arrivato(p, `c[0] === 'slot' && c[1] === 2`, 'cambio allo slot A3');
        await p.aspetta(`document.querySelectorAll('.schermo.live .lv-posto')[2].classList.contains('sì')`, 3000,
          'il pulsantone premuto acceso');
      },
    },
    {
      nome: 'un preset della libreria parte intero (0x0101)',
      fai: async p => {
        await collega(p);
        await mettiInLibreria(p, 'Giro prova');
        await clicRiga(p, 'Giro prova');
        await arrivato(p, `c[0] === 'preset' && c[1] === 'Giro prova'`, 'il preset all\'ampli');
        await p.aspetta(`document.getElementById('preset-nome').textContent.trim() === 'Giro prova'`, 4000, 'sul palco');
      },
    },
    {
      nome: 'un modello inesistente non parte, e lo dice',
      fai: async p => {
        await collega(p);
        await mettiInLibreria(p, 'Giro guasto', `r.effects[2].name = 'TrebleBooster';`);
        await clicRiga(p, 'Giro guasto');
        await p.aspetta(`(document.querySelector('.velo .finestra') || {}).textContent || ''`, 4000, 'la finestra d\'avviso');
        const finestra = await p.valuta(`document.querySelector('.velo .finestra').textContent`);
        if (!/TrebleBooster/.test(finestra)) throw new Error('la finestra non nomina il modello: ' + finestra);
        uguale(await p.valuta(`spark.comandi.filter(c => c[0] === 'preset').length`), 0, 'preset mandati');
      },
    },
  ],
};
