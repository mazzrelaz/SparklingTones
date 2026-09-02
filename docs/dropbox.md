# Il sync con Dropbox

Estratto da `CLAUDE.md` il 26 agosto 2026. Capitolo chiuso e verificato:
da aprire solo se il sync si rompe o si cambia trasporto.


Chiesto dall'utente il 18 agosto. Il problema che risolve: `file://` e `https://` sono due
origini con due IndexedDB diversi, e la libreria non passa dall'una all'altra — né dal
computer al telefono.

**Prima sono stati chiusi i due buchi, che erano il pezzo difficile.** Il trasporto no:

- **`exportAll()` adesso porta anche i banchi.** Restavano fuori per una ragione vera:
  puntano agli id dei preset, che sono locali e reimportando cambiano. Quindi viaggiano
  **per UUID** e all'arrivo si ritraducono, e **ogni banco ha un suo UUID** — dato una
  volta sola a quelli che c'erano già — o due dispositivi se ne farebbero un doppione a
  testa. Il banco che arriva vince su quello locale, ma non tocca la libreria: compone
  solo i suoi otto posti, e un preset che qui non c'è lascia il posto vuoto.
- **Le cancellazioni si propagano**, con una lapide per UUID e la data
  (`settings.cancellati`). Ma **non vincono sempre**: il preset viene tolto solo se qui
  non è stato toccato dopo quella data — se nel frattempo è stato modificato, o riletto
  dall'ampli, resta dov'è. Fra perdere lavoro e tenersi un preset di troppo la regola
  della libreria è chiara. Se il preset torna, la lapide sparisce. Le due liste si fondono
  tenendo la **data più vecchia**, che è quella che dice davvero quando è stato
  cancellato, e così la cancellazione viaggia anche verso un terzo dispositivo che non
  l'ha ancora vista.

Formato del backup alla **versione 2**. Dieci test nuovi su due database che si scambiano
istantanee, come sarebbero il computer e il telefono.

**Il trasporto è `src/dropbox-sync.js`**, e le tre scelte che contano:

- **Niente server.** CORS aperti e OAuth **PKCE**, fatto apposta per chi non può tenere un
  segreto: basta la pagina statica, da GitHub Pages come da `file://`.
- **Niente redirect.** `response_type=code` **senza `redirect_uri`**: Dropbox mostra un
  codice e l'utente lo incolla. Costa un copia-incolla una volta sola, e in cambio
  funziona identico da `file://`, da https e dal telefono, senza registrare nessun
  indirizzo di ritorno e senza intercettare un ritorno dentro una pagina sola.
- **Il verifier PKCE sta in `settings`, non in una variabile.** Fra l'apertura della
  pagina di Dropbox e il ritorno qui, sul telefono, la scheda può essere buttata via dal
  sistema — e senza verifier il codice non vale niente.

**Il ritorno dall'autorizzazione è il punto fragile, non lo scambio** (segnalato dall'utente
il 24 agosto 2026: «inserisco il codice e non funziona»). Lo scambio va: provato dal
browser, `api.dropboxapi.com/oauth2/token` risponde `400 {"error": "invalid_client…"}` a
una pagina web, quindi **i CORS ci sono**. Quello che si rompeva era il rientro:

- **il verifier si riusa, non si rigenera.** È stata la causa vera, ed è costata tre giri:
  ogni pressione di «Collega» faceva un verifier nuovo, quindi una sfida nuova, e il codice
  appena copiato dalla pagina di prima diventava di nessuno. Dropbox lo rifiuta dicendo
  **«code doesn't exist or has expired»**, che manda a cercare la scadenza mentre il
  problema è l'appartenenza. Un verifier non scade e non si consuma: vale per quante
  pagine di autorizzazione si vuole, e si butta solo quando l'autorizzazione riesce.
  Ripremere «Collega» dev'essere innocuo, perché è la prima cosa che fa chi è bloccato;
- salvare il verifier non basta, va **rimesso in piedi anche il campo dove incollare il
  codice**. Ripartiva nascosto, e chi torna con un codice in mano e non trova dove metterlo
  ripreme «Collega» — vedi sopra. Il link si ricostruisce dal verifier salvato;
- **`window.open` sul telefono viene bloccato** come finestra a sorpresa, e il pulsante
  sembra rotto. Ci vuole un link da toccare, e dirlo quando la finestra non si apre;
- **un codice si spende una volta sola**, e ogni apparecchio fa la sua autorizzazione: si
  riusa l'app key, mai il codice.

Il token di accesso dura quattro ore e il client se lo rifà da sé un minuto prima che
scada; quello da conservare è il **refresh token** (`token_access_type=offline`), che non
scade. Nella UI: pannello «Altro», due pulsanti espliciti con accanto la data del file
lassù, e «Prendi» chiede conferma perché è il gesto che può anche togliere.

**Il sync con Dropbox funziona, verificato dall'utente il 24 agosto 2026** — prima il
collegamento, poi il resto. Quindi due cose stabilite una volta per tutte: **PKCE senza
redirect, col codice da incollare, Dropbox lo accetta** — non era quello il problema — e i
CORS sull'endpoint dei token ci sono. Quello che l'utente abbia esercitato nel dettaglio
(il giro computer→telefono, la propagazione di una cancellazione) non è annotato: ha detto
che funziona, non quali passi ha fatto.

Il primo passo è dell'utente e va fatto una volta per apparecchio: registrare l'app
(dropbox.com/developers → Create app → Scoped access → App folder, permessi
`files.content.write` e `files.content.read`) e incollare l'app key nel pannello. Non sta
nel codice, e l'app secret non serve. **I 34 test girano contro un fetch finto: dicono che
parliamo il protocollo giusto, non che Dropbox risponda come crediamo.**

**L'alternativa da poche righe, se un giorno Dropbox desse noia:** la File System Access
API su un file dentro la cartella Dropbox locale — zero OAuth, ma **su Android non
esiste**, quindi risolverebbe solo la metà che serve meno, visto che il telefono è
l'apparecchio che va all'ampli.


## Il backup dell'app ufficiale — Dropbox dismesso nel 2027

Positive Grid ha annunciato (settembre 2026) che i preset dell'app ufficiale vanno sul
**cloud loro** e che il backup su Dropbox verrà **dismesso nel 2027**. La cosa da non
confondere, perché in questo progetto Dropbox compare in due posti che non c'entrano
niente fra loro:

- **`src/dropbox-sync.js` non è toccato.** È il *nostro* sync, con una app registrata
  dall'utente sul suo account Dropbox e la nostra `App folder`. Non passa dall'app
  ufficiale né da Positive Grid: continua a funzionare come prima.
- **`src/spark-backup.js` è toccato solo su *dove si prende il file*.** Legge
  `preset_backup.zip` da un `<input type=file>`, in locale, senza rete: **una copia
  salvata oggi si importerà per sempre**, e il codice non va cambiato.

Quello che si perde davvero è **la strada comoda per portare via tutta la libreria
dell'app ufficiale in un colpo solo**. Restano aperte, e non dipendono dal cloud di
nessuno:

- **«Leggi dall'ampli»**, che prende gli otto slot dalla radio;
- **«Importa preset attuale»**, che prende il suono che l'ampli sta suonando — quindi
  *qualunque* tono che l'app ufficiale riesca a far suonare, uno per volta. **È il punto
  che rende l'annuncio poco pericoloso: il trasporto è l'ampli, non il cloud.**
- **«Importa un file»** con un preset singolo, se l'app ufficiale continua a esportarli.

**L'azione da fare finché c'è tempo: mettere da parte una copia del
`preset_backup.zip` che sta su Dropbox adesso**, e importarla. Da lì in poi la libreria è
nostra — IndexedDB più il nostro export JSON — e Positive Grid non ci entra più.
