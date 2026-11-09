// Sparkling Tones — pc/10-partenza.js: l'avvio della pagina per il PC.
'use strict';

/** `pc.html#finto`: uno Spark finto al posto del Bluetooth (`test/ampli-finto.js`), per le prove. */
function caricaAmpliFinto() {
  return new Promise((risolvi, rifiuta) => {
    const s = document.createElement('script');
    s.src = 'test/ampli-finto.js';
    s.onload = risolvi;
    s.onerror = () => rifiuta(new Error('test/ampli-finto.js non trovato'));
    document.head.appendChild(s);
  });
}

(async function parti() {
  if (location.hash === '#finto') {
    try {
      await caricaAmpliFinto();
      spark = new AmpliFinto(gestoriAmpli);
      document.title += ' — ampli finto';
    } catch (err) { console.error(err); }
  }
  await store.open();
  await ricarica();
  await caricaInviatiPedale();
  await preparaDropbox();
  disegnaTutto();
  if (spark.finto) stato(tr('ampli finto: niente parla col Bluetooth'));
  else if (!navigator.bluetooth) stato(tr('questo browser non ha il Bluetooth per le pagine web: usa Chrome o Edge'), 'errore');
})();
