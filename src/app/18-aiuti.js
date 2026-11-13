// Sparkling Tones — 18-aiuti.js: i tondini «?» accanto alle cose complesse (13 novembre 2026).
// Chiesti dall'utente, come quelli del PC (pc/01-base.js). Un «?» si mette nell'HTML con
// <button type="button" class="aiuto" data-aiuto="chiave">?</button>; il tocco apre la spiegazione
// in una finestra nostra (`avvisa`). Il testo sta qui, in AIUTI_APP, e passa da `tr`.
'use strict';

const AIUTI_APP = {
  ampli: () => [tr('HW PRESET'),
    tr('<p>Sono gli otto preset salvati dentro l\'ampli: A1–A4 in rosso, B1–B4 in verde, come i LED dello Spark. Si leggono da soli quando colleghi l\'ampli.</p>' +
       '<p>Sotto c\'è la tua libreria: tutti gli altri preset, che stanno nell\'app e non occupano posti nell\'ampli. Se un preset va in uno slot sale qui sopra; se lo slot viene sovrascritto torna giù, non si perde.</p>')],
  live: () => [tr('Live'),
    tr('<p>Otto pulsantoni per suonare: un tocco e parte il preset. Se il preset è già in uno slot dell\'ampli cambia all\'istante, altrimenti ci mette circa un secondo.</p>' +
       '<p>Il banco <strong>Ampli</strong> mostra gli otto slot. I banchi tuoi li prepari con <strong>Modifica</strong>: sono scalette di preset e non scrivono mai negli slot dell\'ampli.</p>' +
       '<p>Tieni premuto un pulsantone per due secondi e si apre l\'editor di quel preset.</p>')],
  backup: () => [tr('Backup'),
    tr('<p><strong>Esporta la libreria</strong> salva tutti i tuoi preset, con banchi, categorie e note, in un file sul telefono. Tienilo da parte: se cambi telefono o browser, lo riapri con <strong>Importa un file</strong>.</p>')],
  dropbox: () => [tr('Dropbox'),
    tr('<p>Collegando Dropbox la libreria resta uguale su tutti i tuoi apparecchi: telefono, tablet, computer. Una modifica fatta su uno arriva sugli altri; se lo stesso preset cambia in due posti, vince la modifica più recente.</p>' +
       '<p>Il <strong>backup di sicurezza</strong> è un\'altra cosa: una copia ferma che fai tu quando vuoi, e che la sincronizzazione non tocca. Se qualcosa va storto, la ripristini.</p>')],
  pedale: () => [tr('Manda un banco'),
    tr('<p>Scegli uno dei tuoi banchi e il posto del pedale dove metterlo, poi <strong>Manda al pedale</strong>. Il banco resta nel pedale anche a corrente staccata.</p>' +
       '<p>Dopo, il pedale suona da solo con lo Spark, senza telefono.</p>')],
};

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.aiuto');
  if (!b || !AIUTI_APP[b.dataset.aiuto]) return;
  e.preventDefault(); e.stopPropagation();
  const [titolo, testo] = AIUTI_APP[b.dataset.aiuto]();
  avvisa(titolo, testo);
}, true);
