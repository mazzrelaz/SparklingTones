# Audit di sicurezza — 17 settembre 2026

Fatto su tutto il repository: app (`index.html`, `src/`), service worker, sync Dropbox,
firmware del pedale (`pedale/prova-ble/`), strumenti e catture. Il repository
`mazzrelaz/SparklingTones` è **pubblico**.

## Da correggere

### 1. La license key dell'app ufficiale è pubblicata — medio, legale

La chiave `0x0170` catturata dall'app ufficiale il 14 agosto sta in tre file pubblici:

- `tools/looper-probe.html`: la costante `LICENSE_KEY` e i pulsanti ②, ③ e ④ che la
  rigiocano;
- `captures/2026-08-14-app-ufficiale-looper.txt`: le righe `APP 0x0170`;
- `captures/2026-08-14-looper-rigioco-avvio.json`: la sequenza di avvio rigiocata.

Rigiocata, l'ampli la rifiuta (`0x0470` con `fe`), quindi non serve a sbloccare niente. Resta
però materiale della protezione di un prodotto a pagamento, pubblicato, e contraddice la
regola «cavare la chiave dall'app ufficiale non si fa». Il capitolo del looper è chiuso, e a
quei file la chiave non serve più.

**Correzione**: togliere la costante e i pulsanti dal probe, e le righe `0x0170` dalle
catture. **Resta nella storia di git**: toglierla anche da lì vuol dire riscrivere la storia
e fare un push forzato, e la decisione è dell'utente.

### 2. Il pedale accetta chiunque via Bluetooth — medio, sul palco

Il servizio del ponte non chiede accoppiamento. Chiunque sia a portata, con un'app BLE
generica, può collegarsi al pedale. E siccome **c'è un padrone alla volta**, il pedale
**molla l'ampli**: a metà concerto i footswitch smettono di funzionare. Chi si collega può
anche scrivere e cancellare banchi.

**Correzione**, da fare insieme al lavoro su `prova-ble`: accoppiamento con consenso — una
combinazione di tasti apre la finestra di accoppiamento, e il pedale accetta solo i
dispositivi accoppiati. In alternativa, il ponte resta spento e si accende solo in una
«modalità ponte» scelta coi tasti.

### 3. Il firmware manda all'ampli qualsiasi frame — medio, conseguenza del 2

`mandaPreset` spedisce i frame del banco così come sono arrivati, cambiando solo il seq. La
regola «il pedale non può toccare gli slot dell'ampli, per costruzione» vale quindi **solo se
i frame li ha costruiti la nostra app**. Un banco scritto da altri, o un difetto dell'app,
può sovrascrivere uno slot dell'ampli o mandare un comando che lo pianta.

**Correzione**: in `bancoInterpreta` accettare solo frame `f0 01 .. .. 01 01 … f7`, cioè
`0x0101`, e verificare nel primo chunk che la destinazione sia `0x7f`, dopo averlo
spacchettato dal 7 bit. Un banco che non passa non entra nemmeno in memoria, come già oggi
per quelli malformati.

### 4. Un backup importato da file può cancellare preset — basso-medio, lavoro perso

«Importa un file» con un nostro backup chiama `importBackup` **senza chiedere conferma**, e
applica le **lapidi** del file. I preset di fabbrica hanno lo stesso UUID per tutti: il
backup di un amico che ne ha cancellato uno **cancella anche il tuo**, se non l'hai toccato
dopo quella data. Va contro la prima regola della libreria.

**Correzione**: le lapidi valgono solo per il sync Dropbox, fra apparecchi dello stesso
utente, e non per un file importato (un'opzione di `importBackup`). Aggiungere una conferma,
come c'è già per i preset dell'app ufficiale.

### 5. Un preset con un modello inesistente passa il controllo — basso, ampli

`Spark.controllaPreset` verifica tipi e intervalli, ma non che i modelli esistano. Un file
importato con un nome che l'ampli non conosce parte, e **può piantare l'ampli**: è già
successo con `TrebleBooster`, e si recupera solo staccando la corrente.

**Correzione**: errore se `effetto.name` non è in `SparkEffetti.MODELLI`. Il catalogo è
verificato tutto, quindi non blocca preset veri.

### 6. «Scollega Dropbox» non revoca il token — basso

`scollega()` dimentica il refresh token in locale, ma lassù resta valido. Se l'apparecchio
fosse compromesso prima dello scollegamento, il token continuerebbe a funzionare finché non
lo si revoca da dropbox.com.

**Correzione**: chiamare `/2/auth/token/revoke` prima di dimenticarlo, senza bloccare lo
scollegamento se la chiamata fallisce.

## A posto

- **Nessun segreto nel repository né nella storia**: né token Dropbox, né chiavi. L'app key
  la mette l'utente e sta nell'IndexedDB.
- **Il refresh token di Dropbox** sta solo nell'IndexedDB locale: `exportAll` elenca i
  campi uno per uno e non lo include, quindi non finisce nei backup né su Dropbox; non
  compare nei log. PKCE senza server, app con permessi limitati alla sua cartella.
- **Iniezione di HTML**: ogni testo delle finestre che contiene un nome venuto da fuori passa
  da `testoConNome`; il resto usa `textContent`, e gli `innerHTML` rimasti sono svuotamenti o
  testi fissi. Niente `eval`, niente `new Function`. I link esterni hanno `noopener`.
- **Service worker**: intercetta solo le `GET` della stessa origine; Dropbox e il resto
  passano diretti.
- **Parser dei banchi nel firmware** (`banchi.h`): ogni lunghezza e ogni offset sono
  controllati; `PEZZO` fuori dal blocco viene rifiutato; un banco non interpretabile non
  viene salvato.
- **Nessuna dipendenza esterna**: font e codice in casa, niente CDN, niente rischio di
  catena di fornitura.
