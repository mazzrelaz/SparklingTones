// Sparkling Tones — pc/09-accordatore.js: l'accordatore, in una schermata.
//
// Come `src/app/16-accordatore.js`: la nota la calcola l'ampli. Acceso con `0x0165` quando la
// schermata è aperta, l'ampli è collegato e la pagina si vede; l'ampli tace e manda `0x0364` circa
// 13 volte al secondo (nota 0–11 da Do, scostamento 0–1 con 0,5 intonata). In tutti gli altri casi
// si spegne: un ampli rimasto muto sembra rotto. Niente hertz: l'ampli non manda l'ottava.
'use strict';

const LETTERE_NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const CENT_INTONATA = 2;
const LETTURE_PER_CAMBIARE = 2;
const SILENZI_PER_TACERE = 4;

let schermoTuner = null;
let accordatoreAcceso = false, accesoAllaCaduta = false;
const lettura = { nota: null, cent: 0, candidata: null, ripetute: 0, silenzi: 0 };
let taccheTuner = [];

function apriAccordatore() {
  chiudiSchermi();
  schermoTuner = document.createElement('div');
  schermoTuner.className = 'schermo';
  schermoTuner.innerHTML = `
    <div class="sch-cima"><h2>${tr('Tuner')}</h2><span class="spazio"></span><button data-f="chiudi" title="${tr('Chiudi')}">✕</button></div>
    <div class="tn-corpo"><div class="tn-piastra" data-f="piastra">
      <svg viewBox="0 0 300 168" data-f="quadrante" aria-hidden="true">
        <text x="24" y="122" class="segno">♭</text><text x="268" y="122" class="segno">♯</text></svg>
      <div class="tn-cent" data-f="cent"></div>
      <div class="tn-nota" data-f="nota"></div>
      <div class="tn-avviso" data-f="avviso"></div>
    </div></div>`;
  document.body.appendChild(schermoTuner);
  schermoTuner.querySelector('[data-f="chiudi"]').addEventListener('click', chiudiSchermi);

  // Le 21 tacche, una ogni 5 cent da -50 a +50 su ±60 gradi: ciano a sinistra (calante), viola al
  // centro, fucsia a destra (crescente); quella del centro bianca e più lunga.
  const svg = schermoTuner.querySelector('[data-f="quadrante"]');
  const tinta = (a, b, f) => a.map((x, k) => Math.round(x + (b[k] - x) * f));
  const CIANO = [43, 228, 255], VIOLA = [123, 92, 255], FUCSIA = [255, 43, 214];
  taccheTuner = [];
  for (let i = 0; i <= 20; i++) {
    const r = (i - 10) * 6 * Math.PI / 180;
    const centro = i === 10;
    const dentro = centro ? 100 : 108, fuori = centro ? 146 : 138;
    const x = d => (150 + d * Math.sin(r)).toFixed(1), y = d => (160 - d * Math.cos(r)).toFixed(1);
    const rgb = centro ? [255, 255, 255] : i < 10 ? tinta(CIANO, VIOLA, i / 10) : tinta(VIOLA, FUCSIA, (i - 10) / 10);
    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linea.setAttribute('x1', x(dentro)); linea.setAttribute('y1', y(dentro));
    linea.setAttribute('x2', x(fuori)); linea.setAttribute('y2', y(fuori));
    linea.setAttribute('class', 'tacca');
    linea.style.color = linea.style.stroke = `rgb(${rgb.join(',')})`;
    svg.appendChild(linea);
    taccheTuner.push(linea);
  }
  seguiAccordatore();
}

function chiudiAccordatore() {
  if (!schermoTuner) return;
  schermoTuner.remove();
  schermoTuner = null;
  seguiAccordatore();
}

/** Accende o spegne l'accordatore dell'ampli secondo com'è la pagina. */
function seguiAccordatore() {
  if (!spark.connected) {
    if (accordatoreAcceso) accesoAllaCaduta = true;
    accordatoreAcceso = false;
    disegnaAccordatore();
    return;
  }
  const vuole = !!schermoTuner && document.visibilityState === 'visible';
  if (accesoAllaCaduta && !vuole) {
    accesoAllaCaduta = false;
    spark.send(Spark.commands.tuner(false)).catch(() => {});
  }
  if (vuole !== accordatoreAcceso) {
    accordatoreAcceso = vuole;
    accesoAllaCaduta = false;
    Object.assign(lettura, { nota: null, cent: 0, candidata: null, ripetute: 0, silenzi: 0 });
    spark.send(Spark.commands.tuner(vuole)).catch(() => {});
    stato(vuole ? tr('accordatore acceso: l\'ampli tace finché non esci') : tr('accordatore spento'));
  }
  disegnaAccordatore();
}

function riceviAccordatore(msg) {
  if (!accordatoreAcceso || msg.cmd !== Spark.CMD_NOTIFY || msg.sub !== 0x64) return;
  const l = Spark.letturaAccordatore(msg.data);
  if (!l) return;
  if (l.scostamento === null) {
    lettura.silenzi++;
    lettura.candidata = null;
    lettura.ripetute = 0;
    if (lettura.silenzi === SILENZI_PER_TACERE) disegnaAccordatore();
    return;
  }
  lettura.silenzi = 0;
  const cent = (l.scostamento - 0.5) * 100;
  if (l.nota === lettura.nota) {
    lettura.cent += (cent - lettura.cent) * 0.75;
  } else {
    if (lettura.candidata === l.nota) lettura.ripetute++;
    else { lettura.candidata = l.nota; lettura.ripetute = 1; }
    if (lettura.ripetute < LETTURE_PER_CAMBIARE && lettura.nota !== null) return;
    lettura.nota = l.nota;
    lettura.cent = cent;
    lettura.candidata = null;
    lettura.ripetute = 0;
  }
  disegnaAccordatore();
}

function disegnaAccordatore() {
  if (!schermoTuner) return;
  const q = f => schermoTuner.querySelector(`[data-f="${f}"]`);
  const collegato = spark.connected;
  const tace = lettura.nota === null || lettura.silenzi >= SILENZI_PER_TACERE;
  const cent = Math.max(-50, Math.min(50, lettura.cent));
  const intonata = !tace && Math.abs(cent) <= CENT_INTONATA;
  q('piastra').classList.toggle('tace', tace);
  q('piastra').classList.toggle('intonata', intonata);
  q('avviso').textContent = collegato ? '' : tr('ampli non collegato');
  if (lettura.nota === null) q('nota').textContent = '';
  else {
    const lettera = LETTERE_NOTE[lettura.nota];
    q('nota').innerHTML = lettera.length > 1 ? `${lettera[0]}<span class="diesis">♯</span>` : lettera;
  }
  const c = Math.round(cent);
  const scritta = q('cent');
  scritta.innerHTML = tace ? '' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}<small>cent</small>`;
  scritta.classList.toggle('calante', !tace && !intonata && c < 0);
  scritta.classList.toggle('crescente', !tace && !intonata && c > 0);
  const qui = tace ? -99 : cent / 5 + 10;
  taccheTuner.forEach((tacca, i) => {
    const d = Math.abs(i - qui);
    tacca.style.opacity = Math.max(0.09, 1 - d * 0.8).toFixed(2);
    tacca.classList.toggle('accesa', d < 0.5);
  });
}

document.addEventListener('visibilitychange', seguiAccordatore);
$('apri-tuner').addEventListener('click', apriAccordatore);
