// Il dito del video dimostrativo: un cerchio che si vede dove il copione
// tocca, e un'onda quando preme. Non riceve clic (pointer-events: none), e
// si muove con setInterval perché in headless requestAnimationFrame non gira.

(function () {
  'use strict';
  let dito = null, onda = null;

  function crea() {
    if (dito) return;
    const stile = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;' +
                  'border-radius:50%;transform:translate(-50%,-50%);';
    dito = document.createElement('div');
    dito.style.cssText = stile + 'width:46px;height:46px;background:rgba(255,255,255,.28);' +
      'border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.6);opacity:0;';
    onda = document.createElement('div');
    onda.style.cssText = stile + 'width:46px;height:46px;border:3px solid rgba(255,255,255,.9);opacity:0;';
    document.documentElement.append(onda, dito);
  }

  let timerOnda = null;
  window.__dito = {
    mostra(x, y) {
      crea();
      dito.style.left = x + 'px'; dito.style.top = y + 'px';
      dito.style.opacity = '1';
    },
    nascondi() { if (dito) dito.style.opacity = '0'; },
    premi(giu) {
      crea();
      dito.style.width = dito.style.height = giu ? '38px' : '46px';
      dito.style.background = giu ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.28)';
      if (!giu) return;
      onda.style.left = dito.style.left; onda.style.top = dito.style.top;
      clearInterval(timerOnda);
      let n = 0;
      timerOnda = setInterval(() => {
        n++;
        const d = 46 + n * 5;
        onda.style.width = onda.style.height = d + 'px';
        onda.style.opacity = String(Math.max(0, 1 - n / 14));
        if (n >= 14) clearInterval(timerOnda);
      }, 25);
    },
  };
})();
