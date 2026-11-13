// Sparkling Tones — pc/14-guida.js: la guida dentro l'app, come in Pulze Control (bozza 13 novembre 2026).
// Il testo resta in guida-pc.html (che si legge anche da sola): la prima volta che si apre, se ne
// prendono le <section class="cap"> e si mettono nella finestra, con l'indice a sinistra fatto dagli <h2>.
// «Guida» nel menu la apre dall'inizio; ogni «?» (data-aiuto) alla sua sezione, per GUIDA_DI.
'use strict';

/** Il «?» → la sezione (o il titolo h3) di guida-pc.html dove si spiega: anche gli id degli h3 prendono «g-». */
const GUIDA_DI = {
  live: 'live', pedaliera: 'live-pedaliera', tap: 'suono-tempo', ab: 'suono-ab', ia: 'ia',
  dropbox: 'sicuro-dropbox', sicurezza: 'sicuro-sicurezza', hendrix: 'imp-hendrix', banchi: 'banchi', pedale: 'pedale',
};

let guidaPronta = null;
function caricaGuida() {
  if (!guidaPronta) {
    guidaPronta = (async () => {
      const r = await fetch(Lingua.attuale === 'en' ? 'guida-pc.en.html' : 'guida-pc.html', { cache: 'no-cache' });
      if (!r.ok) throw new Error(tr('risposta {0}', r.status));
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');   // file nostro, accanto alla pagina
      const testo = document.getElementById('guida-testo');
      const indice = document.getElementById('guida-indice');
      testo.textContent = ''; indice.textContent = '';
      for (const s of doc.querySelectorAll('main section.cap[id]')) {
        const testa = s.querySelector('.cap-testa');
        const h2 = testa.querySelector('h2');
        testa.replaceWith(h2);
        s.id = 'g-' + s.id;
        for (const h of s.querySelectorAll('[id]')) h.id = 'g-' + h.id;
        s.removeAttribute('style');
        // «schermo» nell'app è una schermata a tutta pagina: qui le figure prendono un nome loro.
        for (const f of s.querySelectorAll('figure.schermo')) f.className = 'foto-guida';
        testo.appendChild(document.adoptNode(s));
        const a = document.createElement('a');
        a.href = '#' + s.id;
        a.dataset.sezione = s.id;
        a.textContent = h2.textContent.replace(/\s*beta$/, '');
        indice.appendChild(a);
      }
      // I link «#…» del testo portano alle altre sezioni, dentro la finestra.
      for (const a of testo.querySelectorAll('a[href^="#"]')) a.setAttribute('href', '#g-' + a.getAttribute('href').slice(1));
      document.getElementById('velo-guida').addEventListener('click', e => {
        const a = e.target.closest('a[href^="#g-"]');
        if (!a) return;
        e.preventDefault();
        vaiInGuida(a.getAttribute('href').slice(1));
      });
      testo.addEventListener('scroll', segnaIndice, { passive: true });
    })().catch(e => { guidaPronta = null; throw e; });
  }
  return guidaPronta;
}

function chiudiGuida() {
  document.getElementById('velo-guida').hidden = true;
  removeEventListener('keydown', escGuida, true);
}
function escGuida(e) { if (e.key === 'Escape') { e.stopPropagation(); chiudiGuida(); } }

async function apriGuida(sezione) {
  document.querySelector('.velo-aiuto')?.remove();
  const velo = document.getElementById('velo-guida');
  velo.hidden = false;
  addEventListener('keydown', escGuida, true);
  try { await caricaGuida(); } catch (e) {
    document.getElementById('guida-testo').textContent = tr('Non riesco a caricare la guida ({0}).', e.message);
    return;
  }
  vaiInGuida(sezione || 'g-inizio', 'instant');
}

/** Porta la guida a una sezione e fa lampeggiare il titolo un attimo. */
function vaiInGuida(id, modo) {
  const testo = document.getElementById('guida-testo');
  const dest = testo.querySelector('#' + CSS.escape(id));
  if (!dest) return;
  testo.scrollTo({ top: id === 'g-inizio' ? 0 : dest.offsetTop - 10, behavior: modo || 'smooth' });
  const titolo = dest.matches('section') ? dest.querySelector('h2') : dest;
  titolo.classList.remove('lampeggia'); void titolo.offsetWidth; titolo.classList.add('lampeggia');
  segnaIndice();
}

/** Nell'indice, in blu la sezione che si sta leggendo. */
function segnaIndice() {
  const testo = document.getElementById('guida-testo');
  let qui = null;
  for (const s of testo.querySelectorAll('section[id]')) if (s.offsetTop <= testo.scrollTop + 60) qui = s.id;
  for (const a of document.getElementById('guida-indice').children) a.classList.toggle('qui', a.dataset.sezione === qui);
}

document.getElementById('guida-chiudi').addEventListener('click', chiudiGuida);
document.getElementById('velo-guida').addEventListener('click', e => { if (e.target.id === 'velo-guida') chiudiGuida(); });

// I «?» portano alla guida: questo ascoltatore parte prima di quello di 01-base.js (che apre la carta).
addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.aiuto');
  if (!b || !GUIDA_DI[b.dataset.aiuto]) return;
  e.preventDefault(); e.stopImmediatePropagation();
  apriGuida('g-' + GUIDA_DI[b.dataset.aiuto]);
}, true);
