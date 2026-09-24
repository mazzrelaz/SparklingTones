/**
 * Le lingue dell'app: l'italiano, in cui l'app è scritta, e l'inglese.
 *
 * La chiave di ogni traduzione è **la frase italiana stessa**. L'app resta
 * scritta in italiano da cima a fondo, e l'inglese sta tutto in un file a
 * parte (`src/lingua-en.js`) che si aggiorna solo quando si decide di farlo:
 * una frase italiana nuova o cambiata, finché non ha la sua traduzione,
 * compare in italiano anche in inglese. Mai un buco, mai una chiave a vista.
 *
 * Due strade per arrivare al dizionario:
 *
 * - **il testo scritto nell'HTML** si traduce da solo all'avvio
 *   (`traduciPagina`): ogni testo, e i `title`, `placeholder`, `aria-label`
 *   e `alt`. Un elemento che mescola testo e pochi tag in linea
 *   (`<strong>`, `<em>`, `<code>`, `<a>`…) si traduce per intero, col suo
 *   HTML, perché una frase spezzata nei suoi pezzi non si traduce;
 * - **il testo scritto dal JavaScript** passa da `tr`:
 *
 *       tr('Fatto')
 *       tr`«${nome}» eliminato dalla libreria`      → chiave «{0}» eliminato…
 *       tr('Il banco {0} è pieno. ' +
 *          'Liberane uno.', nome)                   → la frase intera è la chiave
 *
 *   Nella traduzione i segnaposto `{0}`, `{1}`… possono cambiare di ordine.
 *
 * `tools/lingua.html` elenca le frasi che non hanno ancora la traduzione e
 * quelle tradotte che non si usano più.
 *
 * La lingua si sceglie nel pannello «Altro» e si ricorda in `localStorage`:
 * serve prima che parta qualunque altra cosa, e `settings` è asincrono.
 * Senza una scelta vale la lingua del browser: italiano se è italiano,
 * altrimenti inglese. `?lang=en` nell'indirizzo la sceglie da fuori (il
 * sito inglese porta lì).
 */
(function () {
  'use strict';

  const LINGUE = ['it', 'en'];
  const CHIAVE = 'lingua';

  function scelta() {
    try {
      const daFuori = new URLSearchParams(location.search).get('lang');
      if (LINGUE.includes(daFuori)) {
        localStorage.setItem(CHIAVE, daFuori);
        const url = new URL(location.href);
        url.searchParams.delete('lang');
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        return daFuori;
      }
    } catch (_) { /* senza storage vale il browser */ }
    try {
      const salvata = localStorage.getItem(CHIAVE);
      if (LINGUE.includes(salvata)) return salvata;
    } catch (_) { /* idem */ }
    return /^it\b/i.test(navigator.language || 'it') ? 'it' : 'en';
  }

  const attuale = scelta();
  document.documentElement.lang = attuale;

  /** Le frasi chieste e non trovate: si guardano dalla console. */
  const mancanti = new Set();

  function dizionario() {
    return attuale === 'en' ? (window.LINGUA_EN || null) : null;
  }

  /** La chiave di un template: le parti fisse, coi valori al posto di {0}, {1}… */
  function chiaveDi(parti) {
    return parti.reduce((a, p, i) => a + '{' + (i - 1) + '}' + p);
  }

  function tr(testo, ...valori) {
    const chiave = Array.isArray(testo) ? chiaveDi(testo) : String(testo);
    const diz = dizionario();
    let fuori = chiave;
    if (diz) {
      if (Object.prototype.hasOwnProperty.call(diz, chiave)) fuori = diz[chiave];
      else mancanti.add(chiave);
    }
    if (!valori.length) return fuori;
    return fuori.replace(/\{(\d+)\}/g, (m, i) => (i < valori.length ? String(valori[i]) : m));
  }

  /* ---------------------------------------------------------------------- */
  /* Il testo scritto nell'HTML                                             */
  /* ---------------------------------------------------------------------- */

  const IN_LINEA = new Set(['A', 'B', 'BR', 'CODE', 'EM', 'I', 'KBD', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP']);
  const ATTRIBUTI = ['title', 'placeholder', 'aria-label', 'alt'];
  // `<code>` da solo è un nome di file o un comando: non si traduce. Dentro una
  // frase viaggia con lei. Per il resto vale l'attributo standard `translate="no"`.
  const SALTA = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'SVG', 'svg', 'CANVAS', 'CODE']);

  function norma(s) { return s.replace(/\s+/g, ' ').trim(); }
  function haParole(s) { return /[A-Za-zÀ-ÿ]/.test(s); }

  /**
   * Gira l'albero e chiama `fai` su ogni pezzo traducibile: il cuore sia della
   * traduzione sia della raccolta delle chiavi, che così non possono andare
   * in disaccordo.
   */
  function visita(el, fai) {
    for (const a of ATTRIBUTI) {
      if (el.hasAttribute && el.hasAttribute(a)) {
        const k = norma(el.getAttribute(a));
        if (haParole(k)) fai({ tipo: 'attributo', el, attributo: a, chiave: k });
      }
    }
    if (SALTA.has(el.tagName) || el.getAttribute('translate') === 'no') return;
    const figli = Array.from(el.childNodes);
    const conTag = figli.some(n => n.nodeType === 1);
    const soloInLinea = conTag && figli.every(n => n.nodeType !== 1 || IN_LINEA.has(n.tagName));
    const conTesto = figli.some(n => n.nodeType === 3 && haParole(n.data));
    if (soloInLinea && conTesto) {
      const k = norma(el.innerHTML);
      if (fai({ tipo: 'html', el, chiave: k }) !== false) return;
    }
    for (const n of figli) {
      if (n.nodeType === 3) {
        const k = norma(n.data);
        if (haParole(k)) fai({ tipo: 'testo', nodo: n, chiave: k });
      } else if (n.nodeType === 1) {
        visita(n, fai);
      }
    }
  }

  function traduci(radice) {
    const diz = dizionario();
    if (!diz) return;
    visita(radice, pezzo => {
      const ha = Object.prototype.hasOwnProperty.call(diz, pezzo.chiave);
      if (pezzo.tipo === 'html') {
        // Un elemento misto non tradotto per intero si prova pezzo per pezzo.
        if (!ha) return false;
        pezzo.el.innerHTML = diz[pezzo.chiave];
        return;
      }
      if (!ha) { mancanti.add(pezzo.chiave); return; }
      if (pezzo.tipo === 'attributo') {
        pezzo.el.setAttribute(pezzo.attributo, diz[pezzo.chiave]);
      } else {
        const d = pezzo.nodo.data;
        pezzo.nodo.data = d.match(/^\s*/)[0] + diz[pezzo.chiave] + d.match(/\s*$/)[0];
      }
    });
  }

  /** Le chiavi di un albero, nell'ordine in cui compaiono: per `tools/lingua.html`. */
  function raccogli(radice) {
    const chiavi = [];
    visita(radice, pezzo => { chiavi.push(pezzo.chiave); });
    return chiavi;
  }

  function imposta(lingua) {
    if (!LINGUE.includes(lingua) || lingua === attuale) return;
    try { localStorage.setItem(CHIAVE, lingua); } catch (_) { /* resta per questa volta */ }
    location.reload();
  }

  window.tr = tr;
  window.Lingua = {
    attuale, LINGUE, tr, imposta, mancanti, raccogli, norma,
    traduciPagina: () => traduci(document.body),
    traduci,
  };
})();
