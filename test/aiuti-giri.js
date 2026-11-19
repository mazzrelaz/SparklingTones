/**
 * test/aiuti-giri.js — gli attrezzi comuni ai giri (`test/giri-*.js`), che li usano da Node.
 * Non è un giro: `tools/prove.js` carica solo i file che cominciano con `giri-`.
 */
'use strict';

/** Confronto da test: se diversi, un errore che dice cosa si aspettava. */
function uguale(avuto, atteso, cosa) {
  const a = JSON.stringify(avuto), e = JSON.stringify(atteso);
  if (a !== e) throw new Error(`${cosa}: atteso ${e}, avuto ${a}`);
}

/** Il primo comando arrivato all'ampli finto che soddisfa la condizione (JS sulla variabile `c`). */
function arrivato(p, condizione, cosa) {
  return p.aspetta(`spark.comandi.find(c => ${condizione}) || null`, 4000, cosa);
}

/**
 * Alla prima apertura, 300 ms dopo la partenza, l'avvertenza (si chiude solo accettando) e sotto, a
 * volte, le Novità: coprono tutto, e un dito vero non passerebbe. Si chiudono come farebbe una
 * persona, finché sopra non resta niente. Dalla seconda apertura dello stesso profilo non ci sono.
 */
async function chiudiPrimaApertura(p) {
  await p.aspetta(`document.querySelector('.velo-novita') || localStorage.getItem(AVVERTENZA_CHIAVE)`,
    5000, 'l\'avvertenza della prima apertura');
  await p.aspetta(`(v => {
    if (!v) return true;
    const b = v.querySelector('.novita-ok');
    if (b && !v.dataset.chiuso) { v.dataset.chiuso = '1'; b.click(); }
    return false;
  })(document.querySelector('.velo-novita'))`, 5000, 'le finestre della prima apertura chiuse');
}

module.exports = { uguale, arrivato, chiudiPrimaApertura };
