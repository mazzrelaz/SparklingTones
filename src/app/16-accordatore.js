// Sparkling Tones — 16-accordatore.js: l'accordatore.
// Un pezzo dello script dell'app. I pezzi si caricano in fila, nell'ordine del
// numero, come script classici: const, let e funzioni di uno si vedono negli
// altri. Una funzione si puo' chiamare da ovunque quando l'app gira, ma il
// codice che parte al caricamento usa solo quello dei pezzi che vengono prima.
'use strict';

/* ====================================================================
   Accordatore (20 ottobre 2026)

   La nota la calcola l'ampli, non noi: acceso con `0x0165 c3`, tace e manda
   `0x0364` circa 13 volte al secondo (nota 0–11 da Do, scostamento 0–1 con
   0,5 intonata; misurato in due prove dell'utente, `docs/protocollo-spark2.md`).
   Qui si accende quando la scheda è aperta, l'ampli è collegato e la pagina si
   vede; in tutti gli altri casi si spegne, perché un ampli rimasto muto
   sembra rotto.
   ==================================================================== */

const LETTERE_NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const CENT_INTONATA = 2;        // entro ±2 cent è intonata (era 3: «più sensibilità», l'utente)
const LETTURE_PER_CAMBIARE = 2; // una nota nuova si mostra dopo due letture uguali
const SILENZI_PER_TACERE = 4;   // ~0,3 s di -1 e la corda è finita

let accordatoreAcceso = false;  // cosa abbiamo chiesto all'ampli, l'ultima volta
let accesoAllaCaduta = false;   // se l'ampli è caduto con l'accordatore acceso
const lettura = { nota: null, cent: 0, candidata: null, ripetute: 0, silenzi: 0 };

const accordatoreAperto = () => $('pannelloAccordatore').classList.contains('aperto');

/**
 * Accende o spegne l'accordatore dell'ampli secondo com'è la pagina. La
 * chiamano l'apertura e la chiusura dei pannelli (`segnaSchede`), il bollino
 * dell'ampli quando collega o cade, e la pagina quando va e torna dallo sfondo.
 */
function seguiAccordatore() {
  if (!spark.connected) {
    if (accordatoreAcceso) accesoAllaCaduta = true;
    accordatoreAcceso = false;
    disegnaAccordatore();
    return;
  }
  const vuole = accordatoreAperto() && document.visibilityState === 'visible';
  // L'ampli è caduto col muto addosso e adesso è tornato: lo si spegne una
  // volta, così non resta zitto senza motivo.
  if (accesoAllaCaduta && !vuole) {
    accesoAllaCaduta = false;
    spark.send(Spark.commands.tuner(false)).catch(() => {});
  }
  if (vuole !== accordatoreAcceso) {
    accordatoreAcceso = vuole;
    accesoAllaCaduta = false;
    Object.assign(lettura, { nota: null, cent: 0, candidata: null, ripetute: 0, silenzi: 0 });
    spark.send(Spark.commands.tuner(vuole)).catch(() => {});
    logLine(vuole ? tr('accordatore acceso: l\'ampli tace finché non esci')
                  : tr('accordatore spento'));
  }
  disegnaAccordatore();
}

/** Una lettura `0x0364`: si smussa, poi si disegna. */
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
    // Stessa nota: la lancetta segue quasi subito (era 0,45: troppo lenta per
    // l'utente); un filo di smussatura toglie solo il tremolio.
    lettura.cent += (cent - lettura.cent) * 0.75;
  } else {
    // All'attacco le prime letture saltano su una nota vicina: una nota nuova
    // si mostra solo quando arriva due volte di fila.
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
  const pannello = $('pannelloAccordatore');
  const collegato = spark.connected;
  const tace = lettura.nota === null || lettura.silenzi >= SILENZI_PER_TACERE;
  const cent = Math.max(-50, Math.min(50, lettura.cent));
  const intonata = !tace && Math.abs(cent) <= CENT_INTONATA;

  pannello.classList.toggle('senza-ampli', !collegato);
  pannello.classList.toggle('tace', collegato && tace);
  pannello.classList.toggle('intonata', intonata);
  $('btnCollegaAccordatore').hidden = collegato;

  if (lettura.nota === null) {
    $('notaAccordatore').textContent = '';
  } else {
    const lettera = LETTERE_NOTE[lettura.nota];
    $('notaAccordatore').innerHTML = lettera.length > 1
      ? `${lettera[0]}<span class="diesis">♯</span>` : lettera;
  }
  const c = Math.round(cent);
  const scritta = $('centAccordatore');
  scritta.innerHTML = tace ? '' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}<small>cent</small>`;
  scritta.classList.toggle('calante', !tace && !intonata && c < 0);
  scritta.classList.toggle('crescente', !tace && !intonata && c > 0);

  // La luce sta fra due tacche quando la corda sta fra due tacche: la
  // posizione è in frazioni di tacca, e ognuna si accende quanto le è vicina.
  // Così si vede muovere anche un cent, senza tacche più fitte.
  const qui = tace ? -99 : cent / 5 + 10;
  TACCHE_ACCORDATORE.forEach((tacca, i) => {
    const d = Math.abs(i - qui);
    tacca.style.opacity = Math.max(0.09, 1 - d * 0.8).toFixed(2);
    tacca.classList.toggle('accesa', d < 0.5);
  });
}

/**
 * Le 21 tacche dell'arco, una ogni 5 cent da -50 a +50, su ±60 gradi. Il
 * colore va col posto: ciano a sinistra (calante), viola al centro, fucsia a
 * destra (crescente) — la sfumatura dei pulsantoni della vista Live. Quella
 * del centro è bianca e più lunga: è dove si vuole arrivare.
 */
const TACCHE_ACCORDATORE = (() => {
  const svg = $('quadranteAccordatore');
  const tinta = (a, b, f) => a.map((x, k) => Math.round(x + (b[k] - x) * f));
  const CIANO = [43, 228, 255], VIOLA = [123, 92, 255], FUCSIA = [255, 43, 214];
  const tacche = [];
  for (let i = 0; i <= 20; i++) {
    const gradi = (i - 10) * 6;
    const r = gradi * Math.PI / 180;
    const centro = i === 10;
    const dentro = centro ? 100 : 108, fuori = centro ? 146 : 138;
    const x = d => (150 + d * Math.sin(r)).toFixed(1);
    const y = d => (160 - d * Math.cos(r)).toFixed(1);
    const rgb = centro ? [255, 255, 255]
      : i < 10 ? tinta(CIANO, VIOLA, i / 10) : tinta(VIOLA, FUCSIA, (i - 10) / 10);
    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linea.setAttribute('x1', x(dentro)); linea.setAttribute('y1', y(dentro));
    linea.setAttribute('x2', x(fuori));  linea.setAttribute('y2', y(fuori));
    linea.setAttribute('class', 'tacca');
    linea.style.color = linea.style.stroke = `rgb(${rgb.join(',')})`;
    svg.appendChild(linea);
    tacche.push(linea);
  }
  return tacche;
})();

$('tabAccordatore').addEventListener('click', () => {
  if (accordatoreAperto()) return;
  if (!chiudiPannelloAperto()) return;   // l'editor con lavoro non salvato chiede prima
  apriPannello('pannelloAccordatore');  // e segnaSchede accende l'accordatore
});
$('btnCollegaAccordatore').addEventListener('click', () => $('status').click());
document.addEventListener('visibilitychange', seguiAccordatore);

// I messaggi dell'ampli: il trasporto ne ha un solo ascoltatore, che finora
// nessuno usava; chi c'era prima continua a riceverli.
{
  const prima = spark.onMessage;
  spark.onMessage = msg => { prima(msg); riceviAccordatore(msg); };
}

disegnaAccordatore();
