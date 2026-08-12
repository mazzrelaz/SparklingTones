/**
 * spark-effetti.js — come si chiamano davvero effetti e manopole.
 *
 * L'ampli manda l'identificativo interno di un effetto (`bias.noisegate`) e i
 * suoi parametri come semplici indici. Né il protocollo né i sorgenti di
 * riferimento dicono come si chiamano quelle manopole: questa tabella è
 * l'unica fonte, e **arriva dall'utente**, che le ha lette sull'app ufficiale
 * e le verifica a orecchio sull'ampli.
 *
 * Per questo i nomi che stanno qui sono *proposte*: la UI li mostra in modo
 * diverso da quelli battezzati a mano, e un nome scritto dall'utente vince
 * sempre. Il rischio noto è che l'ordine delle manopole sullo schermo
 * dell'app non sia quello degli indici nel protocollo — succede, e si scopre
 * girando: si corregge quella riga e basta, senza che crolli nient'altro.
 *
 * La tabella cresce un pezzo alla volta, per categoria. Quelli che mancano
 * restano numerati, che è la verità.
 */
window.SparkEffetti = (function () {
  'use strict';

  /**
   * chiave  = identificativo che manda l'ampli
   * nome    = come lo chiama l'app ufficiale, per chi legge
   * manopole = nomi dei parametri, **in ordine di indice**
   */
  const TABELLA = {
    /* ---- Noise gate ---- */
    'bias.noisegate': { nome: 'Noise Gate', manopole: ['Threshold', 'Decay'] },

    /* ---- Comp / Wah ---- */
    // Il terzo non è una manopola ma un interruttore fra due modi: resta un
    // float 0..1 come tutti gli altri, quindi il cursore lo muove lo stesso.
    'LA2AComp': { nome: 'LA Comp',
                  manopole: ['Gain', 'Peak Reduction', 'Limit / Compress'] },
  };

  /** Il nome leggibile di un effetto, o il suo identificativo se non lo sappiamo. */
  function nome(id) {
    const voce = TABELLA[id];
    return (voce && voce.nome) || id;
  }

  /** Il nome proposto per un parametro, o null se la tabella non lo copre. */
  function manopola(id, indice) {
    const voce = TABELLA[id];
    if (!voce || !voce.manopole) return null;
    return voce.manopole[indice] || null;
  }

  /** Quanti effetti conosciamo per nome: serve a sapere quanta strada manca. */
  function quantiConosciuti() {
    return Object.keys(TABELLA).length;
  }

  return { TABELLA, nome, manopola, quantiConosciuti };
})();
