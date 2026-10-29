# Diario delle sessioni

Il racconto di **come** ci si è arrivati. `CLAUDE.md` tiene le regole e il lavoro da fare;
qui sta la cronaca, che serve solo se si riapre un capitolo o se ci si chiede perché una
cosa è come è. Sfoltito da `CLAUDE.md` il **29 agosto 2026**, quando la sezione «Dove si
riprende» pesava da sola 13 KB.

Le voci sono in ordine dal più recente al più vecchio.

## 5 ottobre 2026, pomeriggio — il doppiaggio del video del pedale, e il sito

- **Il video del pedale in inglese**, girato dall'utente. Il primo tentativo (audio originale
  al 12% sotto la voce, poi a zero tranne la chitarra) **non andava: lo stacco audio era
  «orrendo»**. Rifatto come vuole lui: **lui gira senza parlare sopra la chitarra, io gli do
  solo la voce** (WAV 48 kHz lungo quanto il video, più le frasi separate col tempo nel nome),
  e monta lui in Resolve.
- **Trascrizione con Whisper** (`onnx-community/whisper-large-v3-turbo`, q8, in locale,
  ~4 min per 6 min di audio). Le frasi si piazzano dagli inviluppi di volume, non dai tempi
  di Whisper, che sono approssimativi.
- **Errore mio, segnalato dall'utente («mancano molte parti»)**: Whisper aveva preso tutto
  (verificato ritrascrivendo a pezzi), **ero io ad aver riassunto e raggruppato**. La regola:
  traduzione fedele, un pezzo per ogni respiro dell'originale, e Michael deve parlare
  quanto lui (171 s contro 172).
- **La versione italiana sintetica è scartata dall'utente** (né Nicola né Sara). Per farla:
  kokoro-js parla solo inglese, ma le voci `if_sara`/`im_nicola` ci sono e la pronuncia
  la fa `@echogarden/espeak-ng-emscripten` (espeak completo, GPL, solo strumento locale):
  testo → IPA (`synthesize_ipa`, togliere `_` e i `(en)…(it)`) → `generate_from_ids`.
- Gli strumenti di questo pomeriggio stanno nello scratchpad, non nel repository.

## 5 ottobre 2026 — il video dimostrativo

**`node tools/video-demo/registra.js <cartella> [it|en]`** fa un MP4 verticale 1080×1920 di
~2 min: collegamento, lettura degli slot, libreria, ▶, scheda, editor (manopole, cambio di
modello, Salva), vista live, banchi, invio di un banco al pedale. Niente dipendenze: Edge senza finestra guidato da Node
con Chrome DevTools (il WebSocket di Node 24), fotogrammi dallo screencast, poi
`monta.html` li rimonta su un canvas con le didascalie e **MediaRecorder dà l'MP4**
(H.264: Edge lo ha). Il montaggio va in tempo reale, quindi il giro intero dura ~3 minuti.

- **L'ampli è finto** (`ampli-finto.js`): sostituisce `navigator.bluetooth` e risponde al
  protocollo vero coi preset di `captures/2026-08-10-libreria-8-preset.json`. La libreria
  in più e il banco «Concerto» li semina il copione. Nel finale c'è scritto «registrato con
  un ampli simulato».
- **Il dito** (`dito.js`) è un cerchio nella pagina; i tocchi sono eventi mouse veri.
- **Se il copione non trova un elemento** si ferma e lascia `errore.png` nella cartella.
- Trappole incontrate: i pad hanno il numero davanti al nome (si cerca con `includes`);
  «Salva» dell'editor è `#btnSalvaModifiche`; l'invito a installare la PWA va spento
  (`pwa-installa-no`); «non ancora letto» compare anche fuori dalle schede degli slot.
- **L'inglese, chiesto dall'utente lo stesso giorno**: `registra.js <cartella> en` apre
  l'app con `?lang=en` e usa le didascalie inglesi; i banchi finti si chiamano «Gig» e
  «Rehearsal». **I tasti il copione li cerca con `tr()` della pagina** (`tradotto()`), così
  lo stesso copione va nelle due lingue. Le scritte troppo larghe il montaggio le stringe.
  Il testo per la voce inglese è `testo-voce.en.md`, coi nomi veri dei tasti inglesi
  («Tweak», «Send»…). Video inglese senza voce: 2:09.
- **I due video con la voce, finiti**: italiano 2:19, inglese 2:39, sul Desktop dell'utente.
  Il suono basso dopo l'ultima frase italiana era **un rumore** (detto dall'utente): si zittisce
  con `"silenzi": [[da, a]]` in `voce.json`, secondi del file audio, e il montaggio ci mette
  un volume a zero. Nell'audio inglese un clic a 1,8 s, zittito allo stesso modo.
- **La registrazione va a orologio: col computer carico le scene rallentano** e la voce resta
  indietro (un giro con Audacity aperto e un'installazione in corso: 161 s invece di 139). Si
  vede subito dai tempi delle didascalie in `linea.json`; si rifà.
- **Nella vista live i tocchi sono due, non tre**: la voce inglese dura lì 6 s e la scena 9.
- **DaVinci Resolve non importava i video.** Due motivi, misurati sul file: MediaRecorder
  scrive un **MP4 frammentato** (44 moof, durata 0 nell'intestazione) e a **cadenza variabile**
  (27 fps di media, fotogrammi fermi fino a 0,8 s). Ricomporre il file non bastava:
  uniformare la cadenza avrebbe spostato le immagini fino a 1,7 s rispetto alla voce.
  **Rimedio: il montaggio non è più in tempo reale.** `monta.html` disegna ogni fotogramma
  al suo k/30 e lo codifica con WebCodecs (`VideoEncoder` H.264, `prefer-software`, niente
  B-frame; `AudioEncoder` AAC 48 kHz), e `scrivi-mp4.js` scrive un MP4 classico (moov in
  testa, un mdat, `co64`). 30 fps esatti, e non dipende più da quanto è carico il computer:
  ~1 minuto per 2:20 di video.
- **`--solo-montaggio`** rifà il montaggio dai fotogrammi già registrati. **Trappola
  pagata**: all'avvio il registratore svuotava `fotogrammi/` anche in quel modo, e i
  fotogrammi inglesi sono andati persi (rifatta la registrazione); adesso li svuota solo
  quando registra. Un fotogramma che manca ferma il montaggio con `errore.txt` invece di
  appenderlo per sempre.
- Il mio provino (un `<video>` che salta ai tempi e disegna) **dà bianco il primo
  fotogramma che preleva**, qualunque sia: non è il video.
- **La voce inglese è sintetica** (l'utente non voleva la sua): **Kokoro** (Apache 2.0, in
  locale, niente account), voce `am_michael` scelta fra cinque prove. `voce-sintetica.mjs`
  genera un pezzo per scena e scrive `voce.wav` + `voce.json` con `pezzi` (dove sta ogni
  pezzo e quanto dura). **Con i pezzi i tempi non si fissano prima**: ogni scena aspetta che
  il pezzo di prima sia finito (+0,7 s), e il montaggio mette ogni pezzo dove la sua scena è
  partita davvero (`momenti` in `linea.json`). Il primo tentativo, coi tempi fissati prima,
  sfasava di 4 s: la scena del pedale ci aveva messo 14 s invece di 8.
  **Kokoro non sta nel repository**: `npm install kokoro-js` in una cartella qualunque (gli
  script d'installazione bloccati da npm 11 non servono su Windows), e quella cartella si
  passa allo script. Il modello (fp32, 325 MB) lo scarica da Hugging Face alla prima volta;
  al primo caricamento l'antivirus lo tiene bloccato (errore 13): si riprova.
- **Il pedale, aggiunto lo stesso giorno su richiesta dell'utente** («anche se non si vede»):
  il copione crea il banco «Prove» nella vista live, mostra un cartello sul pedale e manda il
  banco con il pannello «Pedale». Il pedale finto sta in `ampli-finto.js` e risponde al
  ponte come `prova-ble` (elenco, «salvato», rilettura); parte con «Concerto» nello slot 1.
  Il video passa a 2:11, il finale dice «ampli e pedale simulati».
- **La voce**: `testo-voce.md`, un pezzo per didascalia coi tempi della registrazione.
  L'utente l'ha registrata lo stesso giorno (mp3, 150 s, voce da 5,7 s). **Si allinea dalle
  pause, non dalle parole** (non la ascolto): un Edge senza finestra decodifica l'audio e dà
  il volume ogni 100 ms, e i tratti di parlato si contano contro i 15 pezzi del testo. Da lì
  `voce.json` (taglio in testa e tempo di ogni pezzo nel video) e
  `registra.js … --voce voce.json`: ogni didascalia aspetta il suo pezzo, il cartello dura
  fino al pezzo dopo, e `monta.html` decodifica l'audio e lo mette nel MediaRecorder
  (`avc1 + mp4a`). Ricontrollato decodificando l'audio dell'MP4 finito: tutti i pezzi al
  decimo di secondo. Il video con la voce dura 2:21. Dopo il pezzo finale c'è un suono
  piano di 1,3 s (142 s dell'mp3): forse il finale detto a voce bassa, da chiedere.

## 28 agosto 2026

**Il looper è chiuso, e il bpm si scrive.** Due risultati in una sessione, il secondo più
utile del primo.

**Il bpm** (dettaglio in `docs/protocollo-spark2.md`, «Il tempo (bpm) si scrive»): `0x0176`
**senza** il byte `0x00` finale, payload costruito dall'ultimo `0x0376` ricevuto cambiando
il solo bpm. Col byte in coda il tempo non cambia e **il delay parte in ripetizione
infinita** — l'ampli legge i campi spostati. Serve al pedale per il conteggio e agli
effetti a tempo, che seguono da soli perché l'accoppiamento è dentro l'ampli.

**Ed è già nell'editor**, col tap tempo: vedi «Editor della catena effetti». **Quello che
manca è la prova sull'hardware**, ed è la prima cosa da fare quando l'ampli si riaccende:
aprire l'editor con l'ampli attaccato, battere il tap, e sentire se il tempo cambia *e* se
il delay ci va dentro. Il banco non lo può dare: le mie prove sono contro un ampli finto,
e la scrittura vera è stata provata solo dalla sonda, non dall'app. In `tools/looper-probe.html`
c'è la sezione «5 — Il tempo», che fa la stessa cosa a mano se serve confrontare.

**Nota di metodo, e per come è finita la sessione vale più del resto:** l'utente ha smesso
di seguire («non ho capito un cazzo, fai quel che devi») dopo una serie di risposte piene
di byte, tabelle di esclusione e ipotesi. Il contenuto era giusto, la forma no: era un
diario dell'indagine invece che un risultato. **Con lui si dice cosa è successo e cosa
cambia per lui, e il resto va in `docs/`.** Le istruzioni passo passo hanno funzionato,
i ragionamenti lunghi in mezzo no.

**Il looper.** L'utente ha chiesto di riprendere il discorso, e la ripresa
è durata una prova sola: la scoperta sugli Hendrix del 26 agosto — **lo sblocco resta
nell'ampli dopo che l'app ufficiale si è scollegata** — rendeva verificabile l'unica
ipotesi che il 14 agosto era stata archiviata come non verificabile. Verificata, e caduta:
con l'ampli sbloccato (controllato subito dopo, mandando un preset `JH.*` e sentendo il
fuzz) `02` riceve l'ack e non fa niente, uguale a prima. **La chiave abilita i suoni a
pagamento, non i comandi.**

Poi l'utente ha obiettato la cosa giusta — «se l'app ufficiale lo fa partire un modo deve
esserci» — e aveva ragione: il posto dove guardare non era un'altra sonda sui byte ma
**come avevamo misurato**. `leggi-btsnoop.ps1` buttava via handle e opcode ATT di ogni
scrittura, quindi non sappiamo se l'app avesse scritto su `0xFFC1` né con quale opcode.
Sonda e script sono aggiornati; il grezzo del btsnoop non c'è più, quindi il passo 2 vuole
una cattura nuova. Dettaglio in `docs/looper.md`, «Il buco nel metodo».

**Le famiglie di suono adesso sono quattro**: è arrivata **Bass**, in viola `#bf5af2`
(`FAMIGLIE` in `preset-store.js`). L'utente se n'era dimenticato all'inizio, e un suono di
basso non è né clean né drive. Non c'era niente di cablato sul numero tre: tutta la UI —
schede, LED live, insegna al neon, ordinamento, pannello dei colori — cicla su `famiglie`,
quindi è bastata la riga in più più i commenti che dicevano «tre». **Il verde resta di
nessuna famiglia**, che nella vista live è il LED di chi famiglia non ne ha.

**E «Importa un file» adesso prende anche un preset solo** dell'app ufficiale, non più il
solo backup intero: la regola sta in «Importare un preset solo» in `CLAUDE.md`. **Va provato
con un file vero**, che è la cosa che qui non ho: le mie prove sono contro un preset
ufficiale ricostruito a mano da `captures/2026-08-10-libreria-8-preset.json`, incartato in
`{data:{tone:…}}` per vedere se lo trova lo stesso. Se il file dell'utente non entra, il
posto da guardare è `trovaPresetUfficiali` — e la cosa da chiedergli sono **i primi byte
del file**, non l'estensione. Backup 41 test.

**«Leggi il suono corrente» adesso si chiama «Importa preset attuale» e sta nel menu «⋯»**,
non più nel pannello «Altro»: là dentro era una voce di manutenzione fra le esportazioni e
Dropbox, mentre è la strada più corta per portarsi in libreria un suono dell'app ufficiale,
e si usa con l'ampli acceso davanti. **Ed è così che è saltata fuori la trappola del
pulsante spento** (vedi «Finestre e tendine» in `CLAUDE.md`): l'utente l'ha premuto da disconnesso e non è
successo niente, perché un `disabled` si mangia il clic. Guscio `v72`.

Quello che segue è del 27.

**Il 27 agosto è andato tutto nel sito**, non nell'app: comprato il dominio, configurato il
DNS, scritta e pubblicata la pagina. Vedi «Il sito di presentazione» in `CLAUDE.md`. L'app non è stata toccata.

**Il 27 l'utente ha riaperto il bollo «JH» nell'editor, ed è fatto** (vedi «Editor della
catena effetti»). Il problema era dove metterlo, perché nell'editor **non ci vanno
messaggi**: la risposta è che sui tasselli non serve niente — quei modelli si chiamano già
«J.H. Fuzz Zone» e il nome li identifica da solo — e quello che mancava era **cosa
comporta**, detto nei due momenti in cui conta.

**E poi, sempre il 27, la goliardata**: StompSnake, venuta fuori in un pomeriggio un giro
alla volta, tutti chiesti da lui. Pubblicato, guscio `v69`, verificato sull'indirizzo vero.
Com'è andata e cosa resta aperto: `docs/snake.md`.

**Il 27 si è anche chiusa l'alimentazione del pedale**, senza toccare l'app: la XIAO carica a
100 mA e non a 380, quindi modulo TP4056 con la sua presa, interruttore generale fisico, due
codini USB-C da pannello, partitore da saldare, indicatore di batteria da scrivere. Tutto in
`docs/pedale.md`; i pezzi sono ordinati.

Quello che segue è del 26 e vale ancora.

### 26 agosto 2026, sera

**La giornata era finita sul vestito, non sul protocollo.** In fila: i due tasti che spostano
il preset e lo slot aperto accesi al neon; la vista live con l'alone azzurro e il LED che
dice la famiglia (acoustic da verde a **giallo**, e il verde è passato a chi famiglia non ne
ha); via la striscia della famiglia dalle otto caselle dell'ampli; e infine **tutte le
finestre e le tendine del sistema sostituite con le nostre** — la sezione «Finestre e
tendine» qui sopra è la regola, questa è solo la data.

Tutto verificato **solo sull'app che gira in locale, con preset finti**: `index.html` non ha
suite. Le suite toccate quel giorno erano store (136) e backup (33), verdi.

**Come si prova in locale**: `file://` e `localhost` non hanno la libreria dell'utente —
altra origine, altro IndexedDB — quindi o si popolano dei preset finti da console
(`store.importFromAmp([...])` con `{uuid, name, effects, slot}` inventati), **oppure si
pusha**, perché lui guarda l'app pubblicata. Detto da lui il 26 agosto 2026, dopo che avevo
committato e basta. Da allora **i commit visibili si pushano senza chiederlo**.

**Gli effetti Hendrix: capitolo chiuso il 26 agosto 2026, e la risposta è «non si può».**
L'utente ha provato tutti gli effetti uno per uno: **nessuno pianta lo Spark**, ma i `JH.*`
restavano muti. La causa è la license key `0x0170` dell'app ufficiale, legata al suo
account — tutto il ragionamento sta nella trappola in «Protocollo», che è dove va cercato,
non qui. **Non è un difetto nostro e non c'è niente da correggere.**

Le due ipotesi che avevo scritto sono cadute tutte e due, e vale la pena saperlo: gli
identificativi erano giusti (lo dicevano già i preset usciti dall'ampli in
`captures/2026-08-10-libreria-8-preset.json`), e `0x0106` **era** accettato — la rilettura
confermava il nome mentre il blocco non suonava.

La convivenza è fatta: **il bollo «JH»** sulle schede della vista preset, chiesto
dall'utente, e il 27 anche nell'editor.

Poi, indipendente da tutto questo: **i nomi delle manopole dei quattro fuzz e del vibe
sono presi dalle foto dei pedali veri**, non da una cattura (`src/spark-effetti.js`). Se le
manopole fanno la cosa sbagliata è l'ordine degli indici, e si corregge in due righe.



---

*Da qui in poi c'era l'elenco delle cose da fare e i capitoli «discusso e non aperto»: non
sono storia, quindi restano in `CLAUDE.md`, «Dove si riprende», che è l'unico posto dove
vivono.*

## Dove si riprendeva — versione lunga del 2 settembre 2026

Archiviata da `CLAUDE.md` per alleggerirlo: lì resta la versione corta.

## Dove si riprende — 29 agosto 2026

Guscio `v73` (sta in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi:
protocol 139, transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto
da nessuna suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto.

**Il racconto delle sessioni sta in `docs/diario.md`** — cosa è successo il 26, 27 e 28
agosto e perché. Qui resta solo quello che è ancora da fare.

**Il 29 agosto non ha toccato l'app**: è andato tutto sul pedale. La scheda passa dalla C6
alla **XIAO ESP32-S3**, che l'utente ha ordinato, perché è l'unica che può fare la modalità
MIDI; la **scatola sarà di legno**; l'antenna è il **foglietto di serie, dentro**. Dettagli
nella sezione «Il pedale ESP32» e in `docs/pedale.md`.

Da fare:

1. **Il tap tempo con l'ampli acceso.** `0x0176` è verificato dalla sonda ma **non
   dall'app**: aprire l'editor, battere il tap, e sentire se il tempo cambia *e* se il delay
   ci va dentro. `tools/looper-probe.html`, sezione «5 — Il tempo», fa lo stesso a mano.
2. **Provare editor e vestito con l'ampli acceso, e sul telefono.** Girare un pomello e
   sentire se il suono segue, cambiare un modello, salvare e riscrivere. Se qualcosa non
   torna il primo sospetto sono i comandi, non il disegno. Sul telefono contano le tendine
   nostre e i LED delle famiglie sui pulsantoni live: le mie prove sono su schermo largo.
3. **Provare che l'ampli non si pianta più girando le manopole.** L'invio dei parametri è
   autocadenzato ma **la correzione non è verificata**. Se ricapita: prima `PAUSA_PARAMETRO`,
   poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale: le mie prove sono contro un
   preset ricostruito a mano. Se non entra, il posto da guardare è `trovaPresetUfficiali`, e
   la cosa da chiedere sono **i primi byte del file**, non l'estensione.
5. **Il pedale fa il pedale** (2 settembre 2026, sulla millefori definitiva e sulla S3 vera):
   **si preme il footswitch e l'ampli cambia preset, e il display dice quale.** Senza telefono
   in mezzo. Verificato per intero: piste a **3,296 V**, bus con **`0x20` e `0x3c`**, ingressi
   e uscite dell'espansore, BLE con l'intervallo corto concesso, footswitch letto dall'MCP e
   display che segue. XIAO ed espansore **su zoccoli**, quindi sfilabili.
   **Quello che resta è tutto in avanti, niente da rifare**: gli altri sei pulsanti e gli otto
   LED (stesso lavoro ripetuto), le due metà del banco col quinto footswitch, il banco che non
   si ricorda al riavvio (punto 7), il trasferimento di un banco dall'app da riprovare
   sull'S3, e **l'autonomia, che è l'ultima misura mancante**.
6. **La scheda stampata, in `pcb/`** (2 settembre 2026). Schema e **disposizione** ci sono —
   contorno, fori, piazzole con la rete assegnata, serigrafia — nati da
   `tools/genera-schema-kicad.py` e `tools/genera-pcb-kicad.py`, che **da qui in poi non si
   rigenerano**: si modifica in KiCad, o si perde quello che l'utente aggiusta a mano. Si
   controlla **senza aprire KiCad**: `kicad-cli` (10.0.6, in `C:\Program Files\KiCad\10.0\bin`)
   esporta in SVG — da lì un'immagine con Edge headless — **e fa girare il DRC**. Due cose,
   in quest'ordine:
   - **stringere il contorno**: 95 × 60 in un vano di 100 × 64 lascia due millimetri e mezzo
     per lato, che su una scatola fatta a mano è troppo poco, e c'è spazio vuoto in avanzo;
   - **misurare col calibro gli interassi dei moduli, prima di tirare le piste.** Nel file i
     quattro connettori del KAmod (J3, J4, J5, J6) stanno a distanze **inventate**: se il
     modulo si innesta sulla scheda, le piazzole devono cadere dove cadono i suoi pettini, e
     le misure in `docs/pedale.md` sono ancora dichiarate come stime («~45 × 35»). La XIAO
     invece è giusta per costruzione: **15,24 mm** fra le due file. **Le piste si tirano
     dopo**, o spostare un connettore vuol dire rifarle.
7. **Il pedale non ricorda quale banco stava suonando**: al riavvio carica il primo che
   trova. Va fatto insieme ai tasti banco veri, che sono la stessa funzione vista da due lati.
8. **Il looper sul pedale, col conteggio fatto in casa.** Il protocollo è tutto lì e
   verificato; manca il firmware. Il conteggio col click **non si comanda** (vedi
   «Protocollo»), quindi lo produce il pedale: legge il bpm, conta quattro tempi lampeggiando
   un LED — o con un buzzer — e **40 ms prima dell'uno** manda `0x0175` con `04`, che registra
   all'istante. Quei 40 ms sono il tempo di volo misurato. Il tempo si può anche **scrivere**
   (`0x0176`), quindi il pedale può avere il suo tap tempo. In Signal Detection Mode (click
   spento) il conteggio non serve: parte al primo suono di chitarra.
9. **Togliere dal catalogo altri modelli che l'ampli non ha.** `TrebleBooster` l'ha trovato
   l'utente; l'elenco viene da Soundshed e non è verificato. La tendina mette per primi i
   modelli visti sull'ampli, quindi il prossimo si trova più in fretta.
10. **Mettere al sicuro il `preset_backup.zip` che sta su Dropbox adesso**, e importarlo:
   Positive Grid dismette quel backup nel 2027. È l'unica strada che prende tutta la
   libreria dell'app ufficiale in un colpo solo; dopo restano solo l'ampli e i preset
   singoli. Non è urgente in giornata, ma è l'unica cosa che scade.

**Discusso e non aperto: il pedale in modalità MIDI** (29 agosto 2026), per comandare
AmpliTube sul PC con lo stesso pedale. Hardware invariato, cambia solo cosa parte alla
pressione; si commuta col **primo e l'ultimo footswitch insieme**. Tre cose misurate quel
giorno, da non ripercorrere: **Windows non sa fare BLE-MIDI** (nemmeno col nuovo Windows MIDI
Services, dov'è in backlog) e vuole per forza un programma ponte di terzi — ma la scheda
funziona, Windows ci si collega e le legge dentro il servizio MIDI; **la C6 non può fare
USB-MIDI** e **l'S3 sì**, ed è per questo che si cambia scheda; lo strumento della prova è
**`pedale/prova-midi/`**. Due trappole d'ambiente valide sempre: **PowerShell 5.1 non può
sottoscrivere eventi WinRT** (le `…Async` invece si aspettano con `AsTask`) e
**`Pairing.CanPair` da `FindAllAsync` è `False` per tutti**, quindi non dice niente. Il resto
in `docs/pedale.md`, «Modalità MIDI».

**Discusso e non aperto: creare un preset con l'AI** («voglio il suono dell'assolo di Gilmour
in Mother»). L'utente ha chiesto solo di ragionarci. Il punto: il vocabolario dei modelli non
lo può scegliere l'AI — un nome che l'ampli non ha è il comando che lo pianta — quindi glielo
si dà ristretto a `modelliVisti()`, lo scheletro si prende da un preset uscito dall'ampli, e
il risultato si prova **solo sul buffer `0x7f`**, mai in uno slot. Serve una API key
dell'utente, e sarebbe la prima funzione dell'app che non funziona offline. L'AI non sente:
dà un punto di partenza, non un suono finito.

**Non aperto, e va bene così:** il trasferimento di un banco al pedale che costa ~6 s —
funziona, si può accorciare, ma è ottimizzazione.

## Estratti da CLAUDE.md, 17 settembre 2026 — versione lunga

Quello che segue stava in `CLAUDE.md` fino al 17 settembre 2026 ed è stato accorciato lì. È copiato parola per parola: vale come stato di quel giorno, non come verità di oggi.

# Spark 2 Controller

App personale per controllare e organizzare i preset di un Positive Grid Spark 2.
Web app / PWA, HTML+JS vanilla, zero dipendenze, Web Bluetooth. Più un pedale ESP32
in `pedale/`.

L'app è pubblicata e funziona; il pedale funziona su una devkit e aspetta i componenti
comprati. `README.md` racconta il progetto a chi arriva da fuori. **Dove si riprende** è
in fondo a questo file.

## Dove sta il resto di questa memoria

`CLAUDE.md` entra intero in contesto a **ogni** sessione, quindi qui resta solo quello che
serve sempre: le trappole che mi fanno rompere qualcosa, le regole che governano il
progetto, e il lavoro in corso. Il ragionamento dietro le scelte già fatte sta in `docs/`
e **va letto solo quando si rimette in discussione quella cosa lì**:

| file | quando aprirlo |
|---|---|
| `docs/pedale.md` | si lavora sul pedale: forma e misure, ferramenta, scatola, BLE, ponte, simulatore, modo MIDI |
| `docs/protocollo-spark2.md` | si tocca il protocollo, l'encoder, la scrittura dei preset |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake: disegno, wah, accordo, neon, manopole |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata, e perché una cosa è come è |
| `docs/sito.md` | si tocca `sparklingtones.com`: DNS, `www`, privacy, video |

Snellito cinque volte: il 14 agosto 2026 (era 27.700 token), il 26 agosto (~27.000), il 27
agosto (~17.700 in un giorno solo), il 29 agosto (da ~23.300), e il **2 settembre, da 73.137
byte a 42.154** — cioè da ~25.000 token a ~14.000, **11.000 risparmiati a ogni singola
sessione**. Quella volta hanno lasciato la memoria di lavoro: il racconto delle regole
dell'app e la decisione sull'inglese (`docs/decisioni-ui.md`), le trappole dell'ESP32 e la
sezione lunga del pedale (`docs/pedale.md`), gli Hendrix e il looper
(`docs/protocollo-spark2.md`), il sito (`docs/sito.md`), i punti di ripresa vecchi
(`docs/diario.md`). **Ogni volta non si butta via niente: si sposta in `docs/`.** La regola
che decide è sempre la stessa: qui resta ciò che mi impedisce di fare danni, il resto è un
rimando. **Si rigonfia in due settimane, quindi si rimisura spesso**, con
`wc -c CLAUDE.md`.

## Le regole che governano l'app

**La libreria non perde mai il lavoro dell'utente**: `importFromAmp` riconosce i preset per
UUID e riscrive solo la parte sonora, lasciando intatti tag, note, famiglia e ordine. È il
comportamento più importante di `preset-store.js` ed è coperto da test.

**Preset e Live stanno nello stesso file, e non si separano.** La connessione BLE vive nel
documento: finché erano due pagine, passare da libreria a live era una navigazione e
all'ampli toccava riconnettersi a mano. Nessuna API lo evita. Le due viste sono in
`index.html` e si scambiano cambiando una classe sul `body`, quindi `spark` resta lo stesso
oggetto. **Verificato sull'hardware.** Il passaggio è sull'hash (`#live` / `#preset`) e non
su una variabile: così il tasto indietro di Android torna ai preset invece di chiudere
l'app.

**Attenzione toccando il CSS: le due sezioni condividono un solo `<style>`.** Le regole dei
preset vanno sotto `body:not(.vista-live)` e quelle live sotto `body.vista-live`, comprese
le variabili di colore — la vista live è più scura — e la media query del telefono.

### Sezione Preset

Il perché di ognuna di queste è in `docs/decisioni-ui.md`.

**Gli otto preset caricati sull'ampli stanno per conto loro**, sopra, etichettati A1…B4 coi
colori dei LED (rosso banco A, verde B); tutti gli altri stanno sotto, e **un preset non
compare mai in tutti e due i posti**. Niente striscia della famiglia sulle otto caselle.
**Sovrascrivere uno slot non perde il preset che c'era**: `assignSlots` → `_sistemaSlot` gli
toglie lo slot e quello ricompare da solo nella lista sotto, con tag, note e famiglia. Il
record non si cancella mai, cambia solo `slots`.

**`slots` è una lista, non un numero** — lo stesso preset può stare in più slot, e capita.
`normalizzaSlots` tiene una sola verità e cancella il vecchio `slot`. `_sistemaSlot(visti)`
**tocca solo gli slot osservati**: `readLibrary` salta quelli che non rispondono, e cancellare
uno slot mai visto farebbe sparire un preset per un timeout. Nella UI la chiave del dettaglio
è `id:slot`, non `id`. `store.hardware()` dà sempre otto posti, `null` dove non sappiamo, e il
confronto va fatto **per id**, non per oggetto: rilegge dal database e torna copie diverse.

**Alla connessione la lettura degli otto slot parte da sola** (`leggiDallAmpli`, dopo
`identify`), e durante la lettura i pulsantoni live restano spenti: l'ampli sta rispondendo a
otto richieste in fila.

**«Elimina tutti i preset» risparmia gli otto dell'ampli** — la prima lettura li rimetterebbe
comunque, ma spogliati di tag e note, e *quello* sarebbe lavoro perso. `svuotaTranneAmpli`
passa da `remove`, quindi lascia le lapidi: senza, il primo «Prendi da Dropbox» rimetterebbe
dentro tutto.

**Un preset nuovo si fa in tre modi, e nessuno parte dal nulla**: «Duplica» (`store.duplicate`,
che cambia **UUID**, slot e nome), «Importa preset attuale», «Importa un file». **Dal nulla non
si fa, ed è deliberato**: un modello inesistente è quello che ha già piantato l'ampli una volta
(`TrebleBooster`). Se servisse, lo scheletro va preso da un preset **uscito dall'ampli**.

**«Importa un file» distingue le tre cose dal contenuto, non dall'estensione** — `PK` per lo
zip, il campo `presets` per il nostro backup, un oggetto con `sigpath` per un preset singolo
dell'app ufficiale (`SparkBackup.trovaPresetUfficiali`). Per questo l'`<input type=file>`
**non ha `accept`**. Senza `meta.id` **l'UUID glielo diamo noi**, e reimportando lo stesso file
si fa un doppione invece di aggiornare.

**Il bollo «JH» marca i preset con un effetto Hendrix in catena**, perché quei preset **non
suonano come dicono** finché l'app ufficiale non ha sbloccato il pacchetto (vedi «Protocollo»).
**Si dice in quattro posti, e quattro devono restare**: le schede della vista preset, la
tendina dei modelli, il blocco a fuoco dell'editor, e **una riga di log in `mandaPreset`**,
prima dell'invio. È **un avviso al buio** — all'ampli non si può chiedere se sia sbloccato —
ed è la ragione per cui i posti sono quattro e non dieci. Restano scoperti la vista live
(decisione dell'utente) e il pedale.

### Sezione Live

Si suona, non si cataloga. **Un preset che sta già in uno slot dell'ampli si attiva
istantaneamente con `0x0138`; uno che non c'è va trasmesso per intero e ci mette circa un
secondo.**

**Banchi da otto, quattro a sinistra e quattro a destra**, come i due banchi di LED
dell'ampli (`grid-auto-flow: column` con quattro righe: senza, i posti 1–4 finirebbero a
zigzag). Ogni pulsantone ha un LED verde, anche i posti vuoti.

- Il banco **«Ampli» non è salvato da nessuna parte**: si ricava dal campo `slots` dei
  record, così non può divergere da quello che c'è davvero sull'ampli.
- I banchi inventati dall'utente stanno in `settings.banchi`. **Non scrivono mai
  sull'ampli**: scelta esplicita dell'utente, i loro preset si caricano al momento (~1 s).
  Per questo non c'è nessun «Prepara» — se lo scrivesse, sovrascriverebbe il banco fisso.

### Editor della catena effetti

Com'è fatto e perché — la catena al neon, i pomelli, la piramide, la tendina — sta in
`docs/decisioni-ui.md`, insieme al racconto di ognuna di queste regole. Qui le regole nude.

**Le manopole agiscono sul suono che sta suonando**, non su una copia: è la scelta che governa
tutto il resto. Per questo «Regola», **quando l'ampli c'è**, prima manda il preset con
`loadPreset` e poi apre il pannello, e lo stato di partenza si rilegge **dall'ampli**
(`readLiveState`), non dalla libreria. **Se la rilettura fallisce l'editor non si apre.**
Niente è salvato finché non si preme «Salva in libreria».

**Senza ampli l'editor si apre lo stesso, sulla copia in libreria**, e `inModifica.offline`
governa tre differenze: **niente parte sulla radio** (`mandaParametro` non accoda nemmeno, o un
arretrato partirebbe tutto insieme a una connessione a metà); **il modello si cambia lo
stesso, qualunque**, perché il catalogo è verificato e sappiamo com'è fatto il blocco per tutti
e settantotto; **la modalità si decide all'apertura e non cambia più**, anche se l'ampli si
connette dopo — rileggere a metà lavoro sostituirebbe di soppiatto un suono con un altro.

Nel cambio di modello, **prima si copia e poi si costruisce**: `campioneModello(nome)` prende
numero di parametri *e* valori da un blocco che l'ampli ha davvero prodotto; solo se non c'è si
costruisce dalla tabella, a metà corsa. Il blocco resta acceso o spento com'era.

**Il tempo sta qui, e solo qui** — non nella vista live: **il bpm è un campo del preset**
(`preset.bpm`, dentro `0x0101`), quindi si sceglie mentre si costruisce il suono. Col tap, o di
un bpm coi tasti; con l'ampli parte subito `0x0176` **e gli effetti a tempo seguono da soli**;
senza ampli non parte niente. Il riscontro del tap è **il lampeggio del tasto**, non un
messaggio.

**L'invio dei parametri è autocadenzato, non a timer**: il prossimo parte quando il precedente
è finito, più `PAUSA_PARAMETRO` (90 ms), così la coda non cresce qualunque cosa faccia il dito.
`writeWithoutResponse` non ha controllo di flusso, e questa è **la causa più probabile
dell'ampli che si pianta girando le manopole** — ma **la correzione non è verificata**. Se
ricapita: prima `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.

**L'editor sa se c'è del lavoro non salvato**, e non lo lascia buttare via: `inModifica.toccato`
nasce in `segnaModificato()`, e «Fatto» e il logo chiedono con `chiediPrimaDiUscire()` —
**tre vie, non due**, perché con due un dito che sbaglia bottone perde il lavoro. **Se il
salvataggio fallisce non si chiude niente** (`salvaModifiche()` torna `true`/`false`). **Il
segno che ha salvato lo dà il tasto**, non un messaggio: in questo pannello non ne deve
comparire nessuno. Non si disabilita mai quando niente è toccato.

Per lo stesso motivo la nota sugli Hendrix **è uno stato e non un messaggio**: una
`.elenco-nota` sotto l'intestazione «Jimi Hendrix Pack» della tendina — una sola — e una
`.nota-jh` sotto il nome del modello nel blocco a fuoco. Sui tasselli non si dice niente: si
chiamano già «J.H. Fuzz Zone».

**Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**, dove scrivono `logLine` e
`logProgress`: un pannello a tutto schermo copre il log. **`pulisciStatoPannelli()` le nasconde
tutte**, e chi ci scrive deve rimostrarla (`riga.hidden = false`, che è quello che fa
`statoDelPannello`) — senza, il log si scrive sempre e non si vede mai.

### Finestre e tendine: nell'app non c'è più niente del sistema

**Mai più `confirm()`, `alert()`, `prompt()` o `<select>`**: aprono la roba del sistema
operativo in un'app tutta nera, e soprattutto **un `confirm()` ha due vie sole**. Al loro
posto, tutte costruite sulla stessa scatola `.elenco-scelta`:

| invece di | si usa | torna |
|---|---|---|
| `<select>` | `tendinaFinta(titolo, voci, valore, quando)` | il valore sta in `.valore` (non `.value`), `aggiorna(v)` lo cambia da fuori |
| `confirm()` | `await conferma(titolo, testo, {ok, pericolo})` | `true`/`false` |
| `alert()` | `await avvisa(titolo, testo)` | — |
| `prompt()` | `await chiediTesto(titolo, testo, valore, {ok, invito})` | il testo, o `null` |
| tre o più vie | `await finestra({titolo, testo, campo, azioni})` | il `valore` dell'azione, `null` se si esce |

Tutte **asincrone**, quindi il gestore va `async`. `testo` è **HTML**, e un nome che viene dai
dati ci entra solo passando da **`testoConNome()`**, che lo scappa. Esc e il tocco fuori tornano
sempre `null`, che è la via che non fa niente.

**Nella tendina «⋯» nessuna voce si spegne**, ed è misurato: **un pulsante `disabled` non
riceve il clic**, quindi non scatta nemmeno il gestore che chiude la tendina — e si vede
un'app rotta. Senza ampli le voci **rispondono** con `senzaAmpli(cosa)`, una riga di log che
dice cosa manca. Vale per qualunque voce si aggiunga lì dentro.

### I nomi degli effetti e delle manopole (`src/spark-effetti.js`)

Vengono dal catalogo di **Soundshed** (MIT), quindi restano **proposte**: si vedono *in
corsivo*, un nome scritto a mano vince sempre, e `manopola()` **scarta l'intera riga** se
dichiara più manopole di quante l'ampli ne manda. **Il credito a Soundshed non si toglie**, e
la domanda è già stata fatta e chiusa (31 agosto 2026, il perché in `docs/decisioni-ui.md`).

**L'ordine sullo schermo non è l'ordine degli indici, ed è il punto di tutto**: si legge Gain,
Bass, Middle, Treble, Master, ma negli indici sta `Gain(0), Treble(1), Middle(2), Bass(3),
Master(4)`. Trascrivendo dall'interfaccia si sbagliava in silenzio; due test fissano il caso.
Il campo `quante` dice **quante manopole ha davvero l'effetto**: i parametri in eccesso sono
**l'acceso/spento del blocco**, misurato.

**I nomi dei parametri li dà l'utente**, girando e ascoltando — l'ampli manda solo indici.
Stanno **per modello** (`settings.nomiParametri`), e `importBackup` li **aggiunge** invece di
sovrascrivere: un backup vecchio non deve cancellare i battesimi fatti da allora.

**`MODELLI` è verificato tutto contro l'app ufficiale** (26 agosto 2026, dalle foto
dell'utente): noise gate 1, comp/wah 6, drive 14, ampli 39, modulazione 13, delay 6, riverbero
1 con 9 tipi. Dodici nomi del catalogo Soundshed sono stati tolti perché l'ampli non li ha.
**Se si aggiunge un nome nuovo va verificato allo stesso modo**, perché all'ampli non si può
chiedere quali modelli conosce: l'unica prova è l'elenco ufficiale o un preset uscito
dall'ampli. E **una voce nuova nell'elenco ufficiale non è per forza un modello nuovo**:
l'«Auto Wah» del 2026 è lo stesso `JH.Vox846` con altri valori, quindi in `MODELLI` non è
entrato niente.

**Gli effetti Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»**
(`SparkEffetti.GRUPPO_HENDRIX`): sono l'unico contenuto a pagamento e l'unico che può entrare
in catena e restare muto.

## Convenzioni

- **I commit li gestisco io**, senza che l'utente li chieda: quando un pezzo di lavoro sta
  in piedi da solo e le suite in `test/` sono verdi. Messaggi in italiano, che dicano cosa
  cambia e perché. **E i commit visibili si pushano senza chiederlo**: lui guarda l'app
  pubblicata, non quella che gira qui.
- **All'utente si dice cosa è successo e cosa cambia per lui**, non il racconto dei passi e
  dei byte: quello va in `docs/`. Le istruzioni passo passo funzionano, i ragionamenti
  lunghi in mezzo no.
- **Per provare in locale servono preset finti**: `file://` e `localhost` non hanno la
  libreria dell'utente (altra origine, altro IndexedDB). Si popolano da console con
  `store.importFromAmp([...])` e `{uuid, name, effects, slot}` inventati.
- **`CLAUDE.md` è la mia memoria di lavoro, non documentazione per l'utente.** Lo aggiorno
  quando emerge qualcosa che costerebbe ore riscoprire, e sempre a fine sessione. Vanno
  registrate anche le **ipotesi escluse da misure dirette**: valgono quanto quelle
  confermate. **Ma pesa a ogni sessione**: quello che serve solo se si riapre un capitolo va
  in `docs/`, con un rimando qui. La regola per cosa resta: **tutto ciò che mi impedisce di
  fare danni o di ripercorrere una strada chiusa**. Il racconto di *come* ci si è arrivati
  va in `docs/`, sempre.
- Segnare sempre cosa è verificato sull'hardware e cosa no.
- Italiano nei commenti e nella UI. **L'inglese ci sarà, ma non adesso**: sono ~270 stringhe,
  93 delle quali messaggi di log, cioè prosa che si riscrive ogni volta che il comportamento
  cambia. Il momento è **quando Preset, Live ed editor smettono di cambiare forma**, e il piano
  (`src/lingua.js`, `data-t`, nessuna libreria) è in `docs/decisioni-ui.md`.
- I byte nei log e nella documentazione si scrivono in hex minuscolo separato da spazi.
Guscio `v73` (in `sw.js`; non fidarsi di questa riga se non torna). Suite verdi: protocol 139,
transport 60, store 136, backup 41, dropbox 34. **`index.html` non è coperto da nessuna
suite**: si verifica solo aprendo l'app, e le mie prove sono contro un ampli finto. Il racconto
delle sessioni sta in `docs/diario.md`.

Sull'app:

1. **Il tap tempo con l'ampli acceso**: `0x0176` è verificato dalla sonda, **non dall'app**.
   Aprire l'editor, battere, e sentire se il delay ci va dentro.
2. **Editor e vestito con l'ampli acceso, e sul telefono**: girare un pomello, cambiare un
   modello, salvare e riscrivere. Le mie prove sono su schermo largo e su un ampli finto.
3. **Che l'ampli non si pianti più girando le manopole**: la correzione **non è verificata**.
   Se ricapita, la manopola è `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
4. **«Importa un file» con un preset vero** dell'app ufficiale. Se non entra si guarda
   `trovaPresetUfficiali`, e la cosa da chiedere sono **i primi byte del file**, non
   l'estensione.
5. **Togliere dal catalogo altri modelli che l'ampli non ha**, come fu `TrebleBooster`.
6. **Mettere al sicuro il `preset_backup.zip` che sta su Dropbox**, e importarlo: Positive Grid
   lo dismette nel 2027, ed è **l'unica cosa che scade**.



### Estratto da CLAUDE.md, 14 ottobre 2026 — copiato parola per parola

Da «Dove si riprende», sfoltito per far posto all'interfaccia nuova:

9. **Spark NEO** (l'utente ce l'ha, 2 ottobre 2026; misure in `docs/protocollo-spark2.md`,
   «Spark NEO»). **Verificato in cuffia**: si collega col filtro di sempre, **4 slot**
   (CH1–CH4, nessun LED: si vedono solo dall'app ufficiale), lettura e `0x0101`→`0x7f` +
   `0x0138` come lo Spark 2. L'app sceglie dal nome (`Spark.profiloAmpli`): l'ultimo ampli
   collegato sta in `settings.ultimoAmpli`, e leggendo dal NEO gli slot 4–7 si svuotano
   (`importFromAmp(…, { slotVuoti })`): gli slot in libreria sono sempre dell'ultimo ampli.
   **Provata dall'utente sul NEO: funziona tutto** — lettura, CH1–CH4, live, «Regola»,
   manopole, e dal 4 ottobre (v80) anche «Seleziona CHx», che adesso scrive cosa risponde
   l'ampli (il primo «niente» non si è ripetuto; forse premuto durante la lettura).
   **Il NEO certi giorni manda lento**: 13 pezzi su 16 in 4 s, e la lettura si arrendeva
   sulla coda. Dalla v81 il tempo di `_readPresetVia` è il **silenzio** (riparte a ogni
   pezzo, tetto a 4×): **verificato sul NEO il 4 ottobre**, letti tutti e quattro. Ancora da provare:
   «Invia a preset HW» sul NEO, Hendrix, il pedale (cerca chiunque annunci `0xFFC0`: col
   NEO acceso e lo Spark 2 spento dovrebbe agganciarlo).


### Estratto da CLAUDE.md, 14 ottobre 2026 (sera) — copiato parola per parola

Da «Dove si riprende», sfoltito perché il file aveva passato i 30 KB:

**Pedale** (tutto in `docs/pedale-lavoro.md`, «Dove si riprende col pedale»): sulla XIAO c'è
`prova-ble` **1.5** (4 ottobre 2026): Spark 2 e NEO, Amp Preset letto dall'ampli, NEO a
pezzi grandi, **indicatore di batteria** (partitore su D0, verificato col tester).
**Consumo misurato: 0,15 A, ~17 ore.** **Caricatore nuovo montato il 9 ottobre 2026**:
Adafruit 6091 (bq25185, power path), cella su BATT, interruttore e morsetto su LOAD, spine
JST-PH; carica e il pedale suona mentre carica (verificato). Tolto il LED PWR, che si beveva
2,1 mA a pedale spento (misurato; dopo, 0). **Corrente di carica di serie incerta (500 mA o 1
A)**: da misurare a cella sotto 3,9 V (`docs/pedale-lavoro.md`). Restano: il display
(il quadratino in negativo va ancora guardato), **il looper (firmware 2.13, 7 ottobre 2026; il firmware è diviso in file: FS1 REC/DUB, FS2 annulla/ripeti, FS3 suona, FS4 ferma e tenuto cancella, FS5 tap, tasti banco le battute, conteggio e anello come l'app; 2.19–2.21, 14 ottobre, verificate: «libero» fino a 60 s come l'app, click per tutta la prima registrazione; `docs/looper.md` in fondo)**; **il LED del tempo** (RGB col solo rosso su D1, **collegato in prova, non ancora fissato**: l'utente decide il posto insieme al buzzer, che arriva l'8 ottobre, perché dentro c'è poco spazio; 2.13: lampi corti in un compito suo, verificato dall'utente; FS1 rosso fisso mentre registra); **il click** (2.16, su D3): un disco piezo da 35 mm con 330 Ω, «poco ma accettabile», posto trovato dall'utente (il KY-006 era magnetico) (`docs/looper.md` in fondo); **le bande sull'anello pieno** sono il pannello (confermato), regolazioni da provare con lui (`docs/looper.md`, «Le bande»). **La modalità
MIDI è ferma per scelta dell'utente: non proporre altre funzioni MIDI finché non riapre lui.**


### Estratto da CLAUDE.md, 14 ottobre 2026 (fine giornata) — copiato parola per parola

Da «Dove si riprende», sfoltito perché il file aveva passato i 30 KB; il racconto intero sta in
`docs/decisioni-ui.md` («L'interfaccia nuova», «Le bozze della sera», «I banchi da aggiornare
sul pedale»):

**Interfaccia nuova (14 ottobre 2026, dalle bozze scelte dall'utente)**: barra in basso
Preset · Live · Altro (il menu, che sale dal basso), bollino dell'ampli al posto di «CONNETTI»
(pannellino: Rileggi, Importa il suono, Scollega), slot in griglia da quattro, ricerca sotto
gli slot con filtri anche per famiglia, scheda del preset in un foglio dal basso
(`disegnaFoglio`, `#velo`) con le note chiuse. Perché e cosa è cambiato dalle bozze:
`docs/decisioni-ui.md`, «L'interfaccia nuova». **Da verificare sul telefono con l'ampli.**
**La sera (pubblicate dopo la bozza)**: sfondo grigio #101010 a scelta (barra #1c1c1c), barra su
tutte le pagine, **Pedale come quarta voce della barra** (non più nel menu), pagina Pedale rifatta,
menu Altro uguale ovunque, lista preset solo nome con banda, «HW PRESET»; `docs/decisioni-ui.md`,
«Le bozze della sera».
**`guida.en.html` è rimasta alle schermate vecchie** finché l'utente non dice di aggiornare
l'inglese.


### Estratto da CLAUDE.md, 15 ottobre 2026 (sera) — copiato parola per parola

Sfoltita per il consumo di token (da 30 a ~20 KB), chiesta dall'utente: le sezioni qui sotto
sono com'erano prima di accorciarle; i titoli sono scesi di un livello.

#### Questa memoria

Entra intera in contesto a **ogni** sessione: qui resta solo **ciò che mi impedisce di fare
danni o di ripercorrere una strada chiusa**, più il lavoro in corso. Il ragionamento sta in
`docs/`, da aprire solo quando si rimette in discussione quella cosa:

| file | quando aprirlo |
|---|---|
| `docs/pedale-lavoro.md` | **prima di toccare il pedale**: compilare e caricare, mappa, basetta, hardware, cosa manca |
| `docs/pedale.md` | si rimette in discussione il pedale: forma, ferramenta, scatola, BLE, ponte, MIDI |
| `docs/protocollo-spark2.md` | protocollo, encoder, scrittura dei preset, Hendrix |
| `docs/decisioni-ui.md` | si rimette in discussione una scelta grafica o di flusso; l'inglese |
| `docs/dropbox.md` | il sync si rompe o si cambia trasporto; la fine del backup ufficiale nel 2027 |
| `docs/looper.md` | si riapre il looper (capitolo archiviato) |
| `docs/snake.md` | si riapre StompSnake |
| `docs/HANDOFF-2026-08-10.md` | ricerca originale: comandi, tipi dati, catture |
| `docs/diario.md` | com'è andata una sessione passata; le versioni lunghe di questo file |
| `docs/sito.md` | si tocca `sparklingtones.com` |
| `docs/sicurezza.md` | audit del 17 settembre 2026, tutti e sei i punti corretti |

**I documenti grossi non si leggono interi** (`pedale.md` 173 KB ≈ 55.000 token,
`decisioni-ui.md` 60 KB, `HANDOFF` 45 KB): `grep -n '^#'` per l'indice, poi solo la sezione.

**Si sposta, non si butta**: ogni sfoltita copia parola per parola in `docs/` ciò che accorcia
(l'ultima il 24 settembre 2026, da 34 a 23 KB, per il consumo di token). **Si rigonfia in due
settimane**: si rimisura con `wc -c CLAUDE.md`, e sopra i 30 KB si sfoltisce.

#### Struttura

```
index.html                        HTML e <style> dell'app: sezione Preset e sezione Live, stesso documento
src/app/01-…15-*.js               lo script dell'app, in fila (fino al 7 ottobre 2026 stava in index.html)
live.html                         rimando a index.html#live
guida.html / guida.en.html        guida all'uso (grafica in guida.css e guida.js, comuni); l'app apre in un iframe quella della sua lingua (⋯ → Guida)
guida-pedale.html / .en.html     guida del pedale (pezzi, schemi, montaggio, uso; foto in foto/pedale/); ci si arriva dal capitolo Live di guida.html e guida.en.html
manifest.webmanifest / sw.js      PWA; guscio in cache, offline
src/spark-protocol.js             encoder/decoder puro, senza I/O — il cuore del progetto
src/spark-transport.js            BLE: coda di invio, attesa risposte, lettura preset
src/preset-store.js               libreria IndexedDB: import, backup, banchi, categorie
src/spark-effetti.js              nomi di effetti e manopole + MODELLI (catalogo Soundshed)
src/spark-backup.js               legge preset_backup.zip dell'app ufficiale
src/dropbox-sync.js               sync della libreria: OAuth PKCE, niente server
src/pedale-ponte.js               sponda app del ponte BLE verso il pedale
src/pwa.js / src/snake-pedali.js  service worker; StompSnake
src/lingua.js                     le lingue: tr() e la traduzione dell'HTML all'avvio
src/lingua-en.js                  l'inglese — NON si legge (vedi «L'inglese»)
pedale/prova-ble/                 firmware del pedale: prova-ble.ino (include e variabili) + 01-…11-*.ino in fila, banchi.h
pedale/prova-espansore/           pulsanti e LED: mappatura guidata e prova a mano
pedale/prova-usb|display|midi/    altri sketch di prova
pcb/                              scheda in KiCad, ACCANTONATA: non si tocca e non si propone
tools/                            simulatore, generatori, sonde, serve.ps1, script scatola
tools/video-demo/                 video dimostrativo: ampli e pedale finti, regia, MP4 a 30 fps, voce (Kokoro)
test/*.html                       protocol 147, transport 64, store 151, backup 41, dropbox 38
captures/ reference/ design/      log dell'ampli; sorgenti paulhamsh; proposte grafiche
```

**`tools/explorer.html` è CONGELATO** (copia propria del protocollo, single-file per il
telefono): le modifiche vanno in `src/`.

**Lo script dell'app sta in `src/app/`, un file per sezione** (diviso il 7 ottobre 2026; backup:
tag `prima-della-divisione`), caricati in fila da `index.html` come script classici: const,
let e funzioni si vedono fra un file e l'altro, ma **il codice che gira al caricamento usa solo
quello dei file prima**. Un file nuovo va anche nel guscio di `sw.js`. `index.html` (90 KB,
HTML e il solo `<style>`) e `10-editor-disegno.js` (~1.600 righe) non si leggono interi.

Niente build, tutto da `file://`: i moduli sono classic script (`window.Spark`, …), perché gli
ES module lì sono bloccati. **IndexedDB di `file://` e di https sono due origini diverse**: la
libreria non passa dall'una all'altra, si esporta in JSON.

##### Segnala un problema (9 ottobre 2026)

⋯ → «Segnala un problema»: **mailto a `mazzbackup@gmail.com`** (scelta dell'utente: solo email,
niente GitHub, niente server), col testo dell'utente più versione, browser, ampli e le ultime 25
righe di `registroLungo` (`04-log.js`), mostrate prima. Oltre 1800 caratteri il registro si accorcia.
**Donazioni** (10 ottobre 2026): ultima voce del menu ⋯, in oro, «☕ Offrimi un caffè» → `buymeacoffee.com/mazzgear` in una scheda nuova (`window.open`: lasciare la pagina farebbe cadere l'ampli). Anche sul sito.

##### Nomi di effetti e manopole (`src/spark-effetti.js`)

- Dal catalogo **Soundshed** (MIT): sono **proposte**, in corsivo; un nome scritto a mano vince;
  `manopola()` scarta la riga se dichiara più manopole di quelle mandate. **Il credito a
  Soundshed non si toglie** (domanda chiusa).
- **L'ordine sullo schermo non è quello degli indici**: si legge Gain, Bass, Middle, Treble,
  Master, ma gli indici sono `Gain(0), Treble(1), Middle(2), Bass(3), Master(4)`. Due test.
  `quante` = manopole vere; i parametri in più sono l'acceso/spento del blocco.
- **I nomi dei parametri li dà l'utente**, per modello (`settings.nomiParametri`);
  `importBackup` li **aggiunge**, non sovrascrive.
- **`MODELLI` è verificato contro l'app ufficiale** (26 agosto 2026). **Un nome nuovo si
  verifica allo stesso modo** (elenco ufficiale o preset uscito dall'ampli); una voce nuova
  dell'elenco non è per forza un modello nuovo (l'«Auto Wah» è `JH.Vox846`).
- **Il «BPM» di delay e Tremolator è un interruttore** (`interruttori` nella tabella, 7 ottobre
  2026): nei preset veri vale solo 0 o 1, come nell'app ufficiale; acceso manda 1, spento 0.
- Gli Hendrix stanno in fondo a ogni tendina, sotto «Jimi Hendrix Pack»
  (`SparkEffetti.GRUPPO_HENDRIX`).

#### Il pedale ESP32

Tutto il ragionamento in **`docs/pedale.md`**. Qui il minimo per non fare danni.

**Cos'è**: la vista live staccata dal telefono; prende i preset dall'app, poi va da solo con lo
Spark. Solo preset. Sta in questo repo perché app e firmware si cambiano nello stesso commit.
**Comandi**: quattro footswitch = i quattro suoni della metà corrente; il quinto **cambia metà
senza toccare il suono**; due tasti banco a mano. Quattro LED bicolore **tutti insieme**, rosso
A, verde B; se la metà mostrata non è quella che suona, LED spenti e l'OLED dice **♪** cosa
suona.

**Le regole che non si toccano:**

- **Mai scrivere sugli slot hardware.** I banchi dall'app: `0x0101` su `0x7f` + `0x0138` con
  `0x7f`, e il LED dell'ampli lampeggia, ed è giusto. **L'«Amp Preset» invece, dal 4 ottobre
  2026 (decisione dell'utente, cambia quella del 14 agosto), è letto dall'ampli a ogni
  collegamento** (`0x0211` per il nome, `0x0201` per slot, se ne tiene solo il nome) **e si
  suona selezionando lo slot** con `0x0138`: istantaneo, non scrive niente. Spark 2 o NEO li
  sceglie l'utente coi tasti banco quando l'ampli non c'è (sinistro Spark 2, destro NEO;
  `/ampli.txt`); `preset_frames.h` non è più incluso. **Verificato sul pedale col NEO il 4 ottobre (1.3)**:
  si collega, l'Amp Preset cambia subito. I banchi sul NEO: vedi l'eccezione qui sotto. **Banchi da fuori**: `frameAccettabile()` in `banchi.h` accetta solo
  frame `0x0101` verso `0x7f`, e **il ponte BLE parte chiuso** — si apre coi due tasti banco
  insieme per 1,5 s, due minuti alla volta (`docs/sicurezza.md`).
- **L'app preserializza**: il firmware patcha solo il seq (indice 2; il checksum non lo copre).
  **Eccezione dal 4 ottobre 2026 (1.4, scelta dell'utente, «strada A»): sul NEO il pedale
  ricompone il payload dai frame e lo ridivide a pezzi da 128** (`mandaPresetNeo`): il NEO
  costa ~40 ms a pezzo più ~1 ms a byte, e così un preset passa da 1,0–1,15 s a 0,5–0,77 s.
  **Mai sullo Spark 2: i 128 lo disconnettono.** I banchi restano uguali per i due ampli. **Verificato
  sul pedale il 4 ottobre (1.4): NEO e Spark 2, banchi e Amp Preset.**
- **Un padrone alla volta**: con l'ampli connesso al pedale il browser non lo trova. **Se un
  footswitch non fa niente, primo sospetto: l'app ancora collegata al pedale.**
- **Mai operazioni BLE dentro un callback BLE** (NimBLE si blocca): bandiera, e lavoro nel
  `loop()`.
- **Nessuna attesa bloccante che non guardi gli ingressi**; vince l'ultima pressione;
  **l'antirimbalzo aspetta che il segnale stia fermo**.
- **Web Bluetooth: una sola operazione GATT per volta**, il banco entra in coda come blocco.
- **Il formato del banco sta in `src/pedale-ponte.js` e `pedale/prova-ble/banchi.h`, che
  cambiano insieme.** `banchi.h` legge byte non nostri: offset e lunghezze vanno verificati.
  **Così l'impronta** (2.22): FNV-1a 32 bit sul blocco senza il byte dello slot, `bancoImpronta` in
  `banchi.h` e `impronta` in `pedale-ponte.js`; il pedale la manda con l'elenco (notifica `0x83`).

**Ferramenta, mappa di pulsanti e LED, basetta, hardware che fa danni, scatola**: in
**`docs/pedale-lavoro.md`**, da leggere prima di toccare il pedale. Anche senza aprirlo:
**la mappa di pulsanti e LED non si scrive a mente** (si prende dalla mappatura guidata di
`prova-espansore`, e si chiede la foto), e **i nomi dei pezzi sono fissi** (basetta, XIAO,
espansore, pista, pettine, linea, pannello, scatola, cavo, piastrina LED, footswitch, tasti
banco, pulsanti; vietati coperchio, top, rotaia, striscia, modulo).

#### StompSnake

Snake in «Fai una pausa». **Non tocca niente dell'app** (solo `SnakePedali.apri()`); record e
«muto» in `localStorage`, non in `settings`. Vive in `src/snake-pedali.js`, ciclo a
`setInterval`, banco di prova `tools/snake-banco.html`. Il resto in `docs/snake.md`.

#### Dropbox e sito

**Sync Dropbox**: funziona (verificato 24 agosto 2026), OAuth **PKCE senza redirect** e senza
server, backup **versione 2** con banchi e **lapidi che non vincono sempre** (un preset toccato
dopo resta). L'app key la registra l'utente, una volta per apparecchio. **Positive Grid chiude
il suo backup su Dropbox nel 2027**: non tocca il nostro sync, solo da dove si prende
`preset_backup.zip`. Tutto in `docs/dropbox.md`.

**`sparklingtones.com`** sta in `C:\Users\massi\Progetti Claude\sparklingtones-sito`
(`mazzrelaz/sparklingtones-sito`). **L'app non si sposta lì**: il dominio custom vale per
l'intero repo e porterebbe via PWA e libreria. **Prima di ogni push lì, `git pull --rebase`**
(GitHub riscrive `CNAME`). Il resto in `docs/sito.md`.

#### Dove si riprende — 15 ottobre 2026

**Provato dall'utente sul telefono, col pedale e l'ampli veri: «funziona tutto»** — interfaccia
nuova, sfondo grigio, barra a quattro voci, pagina del Pedale, **banchi da aggiornare** e il ponte
che si chiude (firmware 2.23). **«Fatto» e titolo tolti anche dalle altre pagine** (sì
dell'utente; guscio v108; restano editor, scelta del preset per il banco, Dropbox:
`docs/decisioni-ui.md`). **In corso: l'editor con le immagini** dei blocchi, manopole girate
sull'immagine — bozza sul ramo `bozza-editor-grafico` (non in `main`), **impaginazione approvata**
la sera del 15; **non si pubblica finché non ci sono tutte le immagini** (scelta dell'utente).
Le immagini arrivano **senza manopole**, col puntino bianco al centro: sfondo, manopole e misure
li faccio io (fatti: Silver 120, Blackface Duo, Tube Drive, Sustainer). Dal telefono la si guarda
in rete di casa. Tutto in `docs/decisioni-ui.md`, ultima sezione. I progetti stanno in
`C:\Users\massi\Progetti Claude` (spostati il 14 ottobre; copia ogni ora in
`Desktop\Cloud Backup\Progetti Claude`, che è sincronizzata con Google Drive).


**L'inglese è fatto** (24 settembre 2026): app e sito, con la scelta della lingua, pubblicati.
Da qui vale la regola di «L'inglese»: si lavora in italiano, e l'inglese resta indietro
finché l'utente non dice di aggiornarlo.

**Pedale**: sulla XIAO c'è `prova-ble` **2.23** (15 ottobre: il ponte si chiude quando l'app si stacca; 2.22 l'impronta dei banchi, tutte e due provate dall'utente il 15; prima 1.5 e il looper fino a 2.21, verificate); caricatore
Adafruit 6091 montato e verificato; restano display, looper, LED del tempo, click, bande
sull'anello. Tutto in `docs/pedale-lavoro.md` («Dove si riprende col pedale») e `docs/looper.md`;
la versione lunga di questo paragrafo in `docs/diario.md` (estratto del 14 ottobre, sera).
**La modalità MIDI è ferma per scelta dell'utente: non proporre altre funzioni MIDI finché non
riapre lui.**

**L'interfaccia di oggi** (14 ottobre 2026: barra in basso Preset · Live · Pedale · Altro su tutte
le pagine, bollino dell'ampli, scheda del preset dal basso, sfondo grigio a scelta, banchi da
aggiornare sul pedale): `docs/decisioni-ui.md`, le tre sezioni del 14 ottobre. **`guida.en.html`
è rimasta alle schermate vecchie** finché l'utente non dice di aggiornare l'inglese.

Sull'app (guscio `v108` in `sw.js`; **guida all'uso in `guida.html`, inglese in `guida.en.html`** (8 ottobre: disegni in CSS delle schermate, **da ritoccare quando una schermata cambia**; quella del pedale si fa a pedale finito); bollo «Spark LIVE» sui preset dell'altro ampli; **aperti il 7 ottobre**: la connessione che cade da sola — il registro adesso dice come, si aspetta lo screenshot, poi forse il ricollegamento automatico; l'unione Dropbox che tocca tutti i preset e può far tornare un cancellato (`docs/decisioni-ui.md`, «I doppioni»); **`src/app/` non ha suite**, le mie prove sono contro un
ampli finto):

3. **Tap tempo con l'ampli acceso**: `0x0176` è verificato dalla sonda, non dall'app.
   **In stand-by per scelta dell'utente** (2 ottobre 2026): non va né sul NEO né, dice lui,
   sullo Spark 2. Non riaprirlo finché non lo riapre lui.
4. **Editor con l'ampli acceso e sul telefono**.
5. **L'ampli che non si pianta girando le manopole**: correzione non verificata.
6. **«Importa un file» con un preset vero**: se non entra, si chiedono i primi byte del file.
7. **Togliere dal catalogo altri modelli che l'ampli non ha.**
8. **Mettere al sicuro il `preset_backup.zip` su Dropbox**: è l'unica cosa che scade (2027).
9. **Spark NEO**: provato dall'utente, funziona tutto (lettura, CH1–CH4, live, «Regola»,
   «Seleziona CHx»). Ancora da provare: «Metti in uno slot» sul NEO, Hendrix, il pedale col NEO.
   Il racconto per intero in `docs/diario.md` (estratto del 14 ottobre 2026) e
   `docs/protocollo-spark2.md`, «Spark NEO».

**La cronologia di git è stata riscritta il 17 settembre 2026** (tolta la license key):
i codici dei commit di prima non esistono più. **Resta all'utente** chiedere al supporto di
GitHub di togliere i commit vecchi dalla cache (`docs/sicurezza.md`, punto 1). **Mai più
catture o strumenti con la chiave `0x0170` nel repository.**

**Discussi e non aperti, da non rifare** (la modalità MIDI non è più qui: è lavoro in
programma, vedi sopra — resta valido il ragionamento in `docs/pedale.md`, e le due trappole:
Windows non sa fare BLE-MIDI, PowerShell 5.1 non sottoscrive eventi WinRT): preset creati con l'AI
(`docs/diario.md`); il banco che si trasferisce in ~6 s (solo ottimizzazione); la scheda in
`pcb/` (se si riapre: prima stringere il contorno, poi misurare gli interassi veri del KAmod).

#### Trappole dell'ambiente — due voci, com'erano

- **Per le suite su `localhost`** c'è `spark-locale` nel `.claude/launch.json` di `Progetti
  Claude` (la cartella sopra: il riquadro del browser lo cerca lì); il risultato si legge da
  `#summary` e dai `.fail`.
- **Le bozze** (la grafica si mostra prima di pubblicarla): `git worktree` nello scratchpad,
  servito con `serve.ps1 -Radice <cartella> -Porta 8097`; altra origine, quindi preset finti, e
  **il service worker va tolto a ogni ricarica** o serve i file vecchi. **Il riquadro del browser
  non apre la scelta dei dispositivi Bluetooth** (la annulla da solo): il pedale e l'ampli veri si
  provano solo dall'app pubblicata.

(Corretta il 15 ottobre: il riquadro del browser legge `spark/.claude/launch.json`, non quello della cartella sopra.)

## Estratto da CLAUDE.md, 16 ottobre 2026 (sera) — l'editor con le immagini prima della pubblicazione

Copiato parola per parola da «Dove si riprende» il giorno in cui la bozza è stata unita in `main`.

**In corso: l'editor con le immagini dei blocchi** — bozza sul ramo `bozza-editor-grafico`
(**pushato, non in `main`**), **impaginazione approvata**. **Non si pubblica finché non ci sono
tutte le immagini** (scelta dell'utente). Il worktree stava nello scratchpad di una sessione: se in
una sessione nuova non c'è, `git worktree add <scratchpad>/bozza-editor bozza-editor-grafico`, e
la voce `spark-bozza` di `.claude/launch.json` (non committata) va puntata lì. L'utente le genera con
**`tools/genera-immagini.html`** (16 ottobre: API OpenAI, `gpt-image-2.5-flare`, qualità bassa, ~0,6
centesimi l'una; originale + logo + la sua richiesta di Gemini; la chiave sta solo nel suo browser). Le immagini arrivano
**senza manopole**, col puntino bianco al centro e lo sfondo nero: sfondo (`tools/togli-sfondo/`;
se lo sfondo è blu scuro, `&pieno=62&alto=120&basso=60`; grigio scuro, `&pieno=45&alto=100&basso=45`), manopole e misure le faccio io.
**Fatte 89, tutte** (16 ottobre): Silver 120, Blackface Duo, Tube Drive, Sustainer, Noise Gate, LA Comp, Red Comp, Bass
Comp, Optical Comp, Legendary Wah, Auto Wah, Clone Drive, Over Drive, J.H. Axle Fuzz, J.H. Super Fuzz, J.H. Octave Fuzz, J.H. Fuzz Zone, Booster, Fuzz Face, Black Op, Bass Muff, Guitar Muff, Bassmaster, SAB Driver, AD Clean, Match DC, ODS 50, American Deluxe, J.H. Bass Master, J.H. 45/100, Two Stone SP50, Checkmate, AC Boost, Tweed Bass, Blues Boy, J.H. Sun 100S, J.H. D-Show Master, Plexiglas, JM45, Lux Verb, J.H. Super 100, J.H. Tone City 100, RB 101, British 30, American High Gain, SLO 100, YJM100, Treadplate, Insane, Insane 6508, SwitchAxe, Rocker V, BE 101, Pure Acoustic, Fishboy, Jumbo, Flat Acoustic, RB-800, Sunny 3000, W600, Hammer 500, Guitar EQ e Bass EQ (coi `cursori`, voce nuova), Chorus, Cloner Chorus, Flanger, J.H. Legendary Vibe, Classic Vibe, Phaser, Tremolator, Tremolo, Tremolo Square, UniVibe, Vibrato (la modulazione è completa), Echo Filt (il «Delay/Echo»), Digital Delay e Multi Head (le tacche del Mode solo disegno), Echo Tape, Reverse Delay (spia viola: `led.colore`), Vintage Delay (i delay sono completi); il Blackface Duo rifatto; e i nove riverberi, **un'immagine per tipo** (scelta dell'utente): voce
`'bias.reverb:Hall Natural'`, file `Reverb-HallNatural.webp`; Plate Rich, Hall Medium e Plate Long stanno
sulle immagini «Classic Plate», «Holy Grail» e «Reflection» (abbinamento dell'utente). **Rifatti dall'utente** (stessa sera, sostituiscono i vecchi): Red Comp,
Sustainer, Tube Drive, Optical Comp (levetta Pad ora disegnata giù), Booster, Rocker V, Jumbo, BE 101, Black Op, SAB Driver (levetta HP/LP ora disegnata giù). **Restano prima di
pubblicare**: la guida, il Silver 120 forse da rifare nello stile nuovo, le levette da verificare a
orecchio, e il sì dell'utente (è grafica). Gli ampli Hendrix arrivano senza nome scritto: si
chiede quale sia. Una voce si copia dalla precedente (stesso schema: 5 manopole, `led`, levetta). Centri e raggi:
`tools/togli-sfondo/misura.ps1 -Immagine <originale> [-Profili 'x,y,lung;…']` (puntini bianchi, spia
rossa, anelli delle scale), poi `esegui.ps1` e le misure spostate del taglio e per la scala. **Da verificare a orecchio**: quale posizione della
levetta sia Limit (LA Comp), -15 dB (Optical Comp), HP (SAB Driver) e Chorus (UniVibe); nel wah, 1/2 = 0,5 e il tempo lineare.
**Il wah** (16 ottobre): parametri misurati (`docs/protocollo-spark2.md`, ultima sezione), pannello
Auto, barra che si muove. **«Pacchetto Jimi Hendrix: sì/no»** in Impostazioni (`haHendrix()`): col
no spariscono effetti e preset Hendrix e il wah è l'Auto Wah gratuito. **Gli otto slot
dell'ampli e i banchi live** mostrano comunque i loro preset: va bene così (l'utente, 16 ottobre). Dal telefono si guarda in rete di casa (`node
tools/server-rete.js <bozza> 8096` → `http://192.168.0.223:8096`). Tutto in
`docs/decisioni-ui.md`, ultima sezione.

## Estratto da CLAUDE.md, 19 ottobre 2026 — il promemoria di sito e guida, prima della pubblicazione

**Prossimo lavoro, chiesto dall'utente il 17 ottobre 2026**: aggiornare **sito**
(`sparklingtones.com`) **e guida** (`guida.html`, `guida-pedale.html`) alla nuova interfaccia
(editor con le immagini, Impostazioni a riquadri, pulsantoni live, pressione lunga, sfondo).
**«Genera con l'IA» non si nomina** (19 ottobre: l'utente pensa di togliere la funzione). Bozza
sul ramo `bozza-guida-sito` (worktree nello scratchpad, anche in `sparklingtones-sito`); la vista
Live e l'editor sono **schermate vere** (`immagini/guida/`): il disegno a mano dei pulsantoni «non è
così che si vede». **In tutte e due le lingue**:
per questo lavoro l'utente ha autorizzato a toccare anche la parte inglese (`guida.en.html`,
`guida-pedale.en.html`, `sparklingtones-sito/en/`, `lingua-en.js` se serve). Grafica nuova del
sito o della guida: prima la bozza.

## Estratto da CLAUDE.md, 19 ottobre 2026 — «Genera con l'IA», tolta quel giorno

Guscio `v118` (17 ottobre): **«Genera con l'IA»** (`16-genera-ia.js`), **nascosta**: la voce del menu Altro compare solo dopo «Funzioni nascoste» in Impostazioni, con la password dell'utente (nel codice solo l'impronta SHA-256; la password **non si scrive mai** nel repository). Giudizio dell'utente: «non fa miracoli ma non è male». OpenAI (Luna/Sol/Astra, Sol predefinito; **misurato: Sol 1 centesimo, Astra 7-8**) o Anthropic (Haiku/Sonnet/Opus 5.5, Opus predefinito, `fallbacks: "default"`; **Anthropic mai provato con una chiave vera**), chiavi dell'utente in `localStorage`, spiegazione e disclaimer nel pannello. **Trappola**: `hidden` su un `button` del menu o `.imp-voce` non basta, il loro `display` lo batte (regola apposta), risposta a schema con `enum` dei MODELLI, preset costruito sopra uno vero della libreria come il Duplica, salvato solo con «Salva in libreria».

## Estratto da CLAUDE.md, 20 ottobre 2026 — i video del 19 ottobre

**Video demo inglese nuovo** (19 ottobre, 2:27,
voce sintetica Kokoro): «SparklingTones demo English 2026-10-19.mp4» sul Desktop; copione rifatto in
`tools/video-demo/registra.js` (doppio tocco entro 400 ms, pressione lunga), Kokoro nello scratchpad. **Video del pedale** (1:46, orizzontale; looper con battute libere e cambio di preset fra prima parte e sovraincisione): «SparklingTones pedal demo English
2026-10-19.mp4», pedale disegnato da `tools/video-demo/pedale-video.html` (forma dalle foto,
scritte del firmware), `pedale-video.js` lo registra; voce da `pedale-voce.en.json` (`--testo`). **In italiano** (19 ottobre): «SparklingTones demo Italiano»
(2:31) e «SparklingTones pedale demo Italiano» (1:57) sul Desktop; **voce di OpenAI** (`gpt-4o-mini-tts`, alloy,
chiave dell'utente) fatta con `tools/video-demo/voce-openai.html` + `voce-openai.js` (porta 8125; aperta da altri
indirizzi non salva); il finale dice «voce generata con IA» (regola di OpenAI). **Le voci locali italiane
(Kokoro Nicola/Sara, Windows Elsa, Piper Paola/Riccardo) bocciate tutte dall'utente**. **Su YouTube** (pubblicati il 19 ottobre, guscio
`v121`): app IT `YJGi3e1FOtg`, app EN `qkUkf3J58Ow` (shorts), pedale EN `KNga-DOCWO4`, pedale IT `xD-E_A-fAxE`; nel sito
e in cima alle quattro guide («Guarda il video», in un'altra scheda).

## Estratto da CLAUDE.md, 20 ottobre 2026 — guida e sito del 19 ottobre

**Pubblicati il 19 ottobre 2026: guida e sito della nuova interfaccia, in italiano e in inglese**
(guscio `v120`; sito `e533608`). La vista Live e l'editor nella guida e sul sito sono **schermate
vere** dell'app (`immagini/guida/`, `*-en.webp` per l'inglese; sul sito `media/app-live*.webp`): il
disegno a mano dei pulsantoni «non è così che si vede», dice l'utente. Per rifarle: preset finti, la
schermata dal riquadro, poi `ritaglia` con Edge headless (canvas → WebP) come `tools/togli-sfondo`.
`lingua-en.js` allineato (81 frasi nuove, 47 tolte). Il
video dell'app su YouTube (`media/app.jpg` nel sito) mostra ancora l'editor vecchio.

## Estratto da CLAUDE.md, 20 ottobre 2026 (sera) — guida, video e «Genera con l'IA»

Spostato parola per parola per stare sotto i 30 KB, quando è entrato iPhone e iPad con Bluefy.

**Guida e sito della nuova interfaccia pubblicati il 19 ottobre** (guscio `v120`): schermate vere
dell'app in `immagini/guida/` (come si rifanno: `docs/diario.md`, estratto del 20 ottobre). **Video**: quattro su YouTube (19 ottobre, guscio `v121`: app IT `YJGi3e1FOtg`, app EN `qkUkf3J58Ow`,
pedale EN `KNga-DOCWO4`, pedale IT `xD-E_A-fAxE`), nel sito e in cima alle guide; come si rifanno
(`tools/video-demo/`, voce OpenAI per l'italiano, voci locali bocciate) in `docs/diario.md`.

**«Genera con l'IA» tolta il 19 ottobre 2026** (guscio `v122`; «mi crea solo problemi», l'utente):
via `16-genera-ia.js`, la voce del menu, «Funzioni nascoste», il pannello e i suoi stili; OpenAI e
Anthropic fuori dalla CSP. Alla partenza `15-partenza.js` cancella le chiavi API e le scelte che
aveva lasciato in `localStorage`. In `lingua-en.js` resta «Funzioni nascoste», orfana e innocua.
**Non si rimette** se non lo chiede lui; il codice è nella cronologia (`f86fb12`).

## Estratto da CLAUDE.md, 22 ottobre 2026 — iPhone e iPad con Bluefy

**iPhone e iPad con Bluefy (20 ottobre 2026)**: si collega e, dice l'utente su iPad e poi su iPhone, «sembra
funzionare tutto». Servivano gli **UUID interi** dello Spark (quelli corti li prende solo Chrome).
Bluefy non usa il service worker: il nuovo arriva dopo i 10 minuti di cache di GitHub. App, guida,
README e sito consigliano Bluefy, in italiano e in inglese (aggiornato su richiesta dell'utente). Dettaglio: `docs/decisioni-ui.md`, «Su iPhone e iPad».

## Estratto di CLAUDE.md del 22 ottobre 2026 (notte): l'editor classico

**L'editor classico (22 ottobre 2026, pubblicato, guscio `v137`)**: Impostazioni → «Editor: Neon /
Classico» (`editorClassico()`, di serie neon). **Il neon è quello di prima e i ritocchi al classico non
lo toccano mai** (regola dell'utente): regole sotto `#pannelloEditor.classico`, codice in
`17-editor-classico.js` dietro `editorClassico()`. Un'immagine per modello (`SFONDI_CLASSICI`: taglio,
testa, largo, led; chi non ce l'ha prende l'ampli), generate dall'utente col prompt dei pedali vintage;
manopole con la corona dentata, levette dei pedali, spia finta sul LED. Lavoro lungo: **le immagini
arrivano a gruppi**, e non si chiede di pubblicare finché non è finito. Scelte e scartati:
`docs/decisioni-ui.md`, «L'editor classico».

## Estratto di CLAUDE.md del 22 ottobre 2026 (sera): «Dove si riprende» com'era

Spostato parola per parola quando l'utente ha chiesto di ottimizzare il consumo di token; in CLAUDE.md ne
resta un riassunto a punti.

**Pubblicato il 16 ottobre 2026 (sera): l'editor con le immagini dei blocchi** (ramo
`bozza-editor-grafico` unito in `main`, guscio `v109`). Ogni modello ha la sua immagine (89, in
`immagini/blocchi/`; tabella e misure in `src/spark-immagini.js`; i riverberi una per tipo, voce
`'bias.reverb:<tipo>'`); le manopole si girano sull'immagine, il modello si sceglie col doppio tocco
sul tassello; «Pacchetto Jimi Hendrix: sì/no» in Impostazioni (`haHendrix()`). **Da
verificare a orecchio**: quale posizione della levetta sia Limit (LA Comp), -15 dB (Optical Comp), HP
(SAB Driver) e Chorus (UniVibe); nel wah, 1/2 = 0,5 e il tempo lineare. Il Silver 120 forse da rifare
nello stile nuovo. **Un'immagine nuova o rifatta** arriva senza manopole, col puntino bianco al centro
e lo sfondo nero: `tools/togli-sfondo/misura.ps1` (centri, spia, anelli) ed `esegui.ps1` (sfondo, 900
px, WebP), misure spostate del taglio e per la scala, cerchi controllati sull'originale, voce in
`TABELLA`, prova nell'editor. Le genera l'utente con `tools/genera-immagini.html` (API OpenAI; una
copia generica sta sul suo Desktop, «Genera immagini.html»). Copia delle finite in `Progetti
Claude\Spark immagini finite` (fuori dal repository, non si aggiorna da sola). **Provato e
scartato**: un colore solo per la catena (restano i colori per famiglia, con l'alone più piccolo del
tassello scelto). Tempo e OFFLINE in blu; l'insegna col nome del preset sempre bianca (non segue più la famiglia). Il worktree della bozza non serve più. Dettaglio in
`docs/decisioni-ui.md`, ultime sezioni; la versione lunga di questo paragrafo in `docs/diario.md`.

**Provato dall'utente il 15 ottobre col pedale e l'ampli veri: «funziona tutto»** (interfaccia del
14, banchi da aggiornare, firmware **2.23** sulla XIAO). Guscio `v118` (17 ottobre): **«Genera con l'IA» c'è stata dal 17 al 19 ottobre ed è tolta** (vedi sotto). **Trappola che resta**: `hidden` su un `button` del menu o `.imp-voce` non basta, il loro `display` lo batte (regola apposta). **Impostazioni a riquadri** (classi `imp-*`, una voce per riga, scelte a due posizioni rosse, logo in cima), **la scheda del preset senza l'elenco degli effetti** sotto il nome (tolte `pastiglieCatena` e `.chips`); **lo sfondo dell'editor e della vista Live è un'immagine dell'utente** (`immagini/sfondo-editor.jpg`; sul PC alla sua altezza, al centro, sfumata ai lati: «cover» sgranava). **Niente «trascina in giù per ricaricare»** (`overscroll-behavior-y:none` su `html, body`): una strisciata per sbaglio ricaricava e faceva cadere l'ampli. **Nella vista Live non c'è più la riga di log** sotto i pulsantoni (`#logLive`, tolta su richiesta dell'utente): i messaggi stanno solo nel registro.

**Guida, sito e quattro video** pubblicati il 19 ottobre. **«Genera con l'IA» tolta il 19 ottobre**
(«mi crea solo problemi»): **non si rimette** se non lo chiede lui. Tutti e due in `docs/diario.md`,
estratti del 20 ottobre.

**iPhone e iPad con Bluefy (20 ottobre 2026)**: funziona; servivano gli UUID interi. In `docs/diario.md`.

**L'editor classico** (pubblicato il 22 ottobre 2026, guscio `v137`): Impostazioni → «Editor: Neon /
Classico». **Il neon non si tocca mai** (regola dell'utente): regole sotto `#pannelloEditor.classico`,
codice in `17-editor-classico.js`. Versione lunga in `docs/diario.md`, estratto del 22 ottobre (notte).
**Fermi al 22 ottobre (notte)**, sul ramo `bozza-editor-classico`, **non pubblicato**: **tutte le immagini
fatte** (80 modelli e i 9 tipi di riverbero). Si pubblica solo su suo comando. Stato e
regole in `docs/decisioni-ui.md`, «L'editor classico», ultima sezione.

**Basetta stampata (20 ottobre 2026, chiesta dall'utente: riapre `pcb/`)**: `pcb/basetta/`, generata
**solo** da `tools/genera-basetta.py` (Python di KiCad 10: pezzi, router A* suo, massa, scritte; si rigenera,
mai a mano), DRC pulito con `kicad-cli`, anteprime PNG accanto. Scheda **generica, per altri pedali**: 86 × 70, XIAO con l'USB a sinistra sul lato corto, logo verticale a destra con «by Massimo Togni 2026» (`logo-serigrafia.png`), morsetto sul lato destro,
tutto a foro passante, XIAO e **MCP23017 DIP-28** su zoccolo, resistenze dei LED sulla scheda, JST-XH con
**G sul piedino 1**, morsetto cella + presa «BAT XIAO», pettine LIBERI. Linee nuove: FS1..FS4 = GPA6..GPA3,
FS5 = GPA2, SX = GPA1, DX = GPA0, **GPA7 libera** (sui chip nuovi non è ingresso garantito); LED*n* rosso/verde =
GPB(2n-2)/GPB(2n-1). **Approvata e pronta il 20 ottobre**: zip in `pcb/basetta/jlcpcb/` (copia sul Desktop), da ordinare
su JLCPCB (non JLC3DP, che è la stampa 3D); `tools/verifica-basetta.py` confronta le piazzole coi collegamenti
attesi. **Non provata sull'hardware.** A scheda arrivata, firmware con le tabelle nuove (non
toccate ancora) e mappatura guidata.

**Ferme per scelta dell'utente, non riaprirle finché non lo fa lui**: la modalità MIDI del pedale
(niente altre funzioni MIDI); il tap tempo con l'ampli acceso.

**Il tuner, pubblicato il 20 ottobre 2026** (guscio `v131`): voce **«Tuner»** nella barra in basso (il
nome in tutte e due le lingue), scheda come il Pedale. `0x0165 c3`/`c2` (senza `0x00`); l'ampli tace e
manda `0x0364` ~13 volte al secondo: nota 0–11 da Do **senza ottava** (niente hertz), scostamento 0–1
con 0,5 intonata, -1 = silenzio; `0x0365` mai visto. **L'ampli muto solo a scheda aperta, ampli
collegato e pagina in vista** (`seguiAccordatore`). Grafica in sei giri di bozza, scelta dall'utente:
arco di 21 tacche al neon sul fondo della pagina, nota, cent fra i due, niente scritte
(`docs/decisioni-ui.md`, «Il tuner»). Provato sull'ampli dall'utente. Sonda: `tools/accordatore-sonda.html`. **Nelle quattro guide** dal 20 ottobre
(capitolo «Accordare»/«Il tuner», `immagini/guida/tuner.webp`, una per le due lingue; guscio `v132`; inglese
aggiornato su richiesta dell'utente) e **sul sito** (sito `1a84ced`).

**Collaudi ancora aperti** (editor
con l'ampli sul telefono, l'ampli che si pianta girando le manopole, «Importa un file» con un
preset vero, il NEO), **discussi e non aperti**, e il resto del pedale: `docs/diario.md`, estratto
del 15 ottobre (sera), e `docs/pedale-lavoro.md`.

**La cronologia di git è stata riscritta il 17 settembre 2026** (tolta la license key). **Mai più
catture o strumenti con la chiave `0x0170` nel repository.** I progetti stanno in
`C:\Users\massi\Progetti Claude` (copia ogni ora in `Desktop\Cloud Backup`, su Google Drive).

## Estratto di CLAUDE.md del 22 ottobre 2026 (sera): Live, editor, segnalazioni, bollo JH

### Sezione Live

- **Preset già in uno slot: istantaneo con `0x0138`; altrimenti invio intero, ~1 s.**
- **Banchi da otto, quattro a sinistra e quattro a destra** (`grid-auto-flow: column`, quattro
  righe). **Il vestito dei pulsantoni** (16 ottobre 2026, scelto dall'utente in tre giri di bozze):
  fondo nero con le piste di un circuito, **niente LED**; chi non suona ha il bordo sottile grigio
  scuro ed è più scuro; chi suona ha il bordo sfumato azzurro-viola-fucsia, un bagliore che pulsa e la
  corrente che scorre (`immagini/circuito-elettroni.svg`, nel guscio). Tutto in CSS: i pulsanti
  cambiano misura col telefono, un'immagine fissa non va. Niente riga di log sotto.
- **Tenendo premuto 2 secondi un pulsantone si apre l'editor** di quel preset (17 ottobre 2026,
  `pressioneLunga`, `PRESSIONE_EDITOR_MS`): la barretta in fondo si riempie, lasciando prima non
  succede niente, e la pressione lunga non fa suonare il preset al rilascio. Va anche senza ampli
  (editor sulla copia in libreria): **i pulsantoni non sono più `disabled`**, il tocco lo ferma
  `attiva()`. Con l'ampli aprire l'editor manda il preset, quindi suona. Niente nei posti vuoti
  né in «Modifica».
- **Il banco «Ampli» si ricava da `slots`**, non è salvato. I banchi dell'utente
  (`settings.banchi`) **non scrivono mai sull'ampli**: niente «Prepara».

### Editor della catena effetti

- **Le manopole agiscono sul suono che sta suonando.** Con l'ampli, «Regola» manda il preset
  (`loadPreset`) e rilegge lo stato **dall'ampli** (`readLiveState`); **se la rilettura
  fallisce l'editor non si apre**. Niente è salvato fino a «Salva in libreria».
- **Senza ampli si apre sulla copia in libreria** (`inModifica.offline`): niente parte né si
  accoda alla radio; il modello si cambia comunque; **la modalità non cambia più** anche se
  l'ampli arriva dopo.
- **Cambio di modello: prima si copia** (`campioneModello`, da un blocco uscito dall'ampli),
  **poi si costruisce** dalla tabella. Acceso/spento resta com'era.
- **Il tempo sta solo qui**: `preset.bpm`, tap o tasti; con l'ampli parte `0x0176`. Il
  riscontro del tap è il lampeggio del tasto.
- **Invio dei parametri autocadenzato**: il prossimo parte a precedente finito +
  `PAUSA_PARAMETRO` (90 ms). Probabile causa dell'ampli che si pianta, **correzione non
  verificata**; se ricapita: `PAUSA_PARAMETRO`, poi `SEND_GAP_MS`.
- **Lavoro non salvato**: `inModifica.toccato` (da `segnaModificato()`); «Fatto» e il logo
  chiedono con `chiediPrimaDiUscire()` a **tre vie**. **Se il salvataggio fallisce non si chiude
  niente.** Il segno di salvato lo dà il tasto, mai un messaggio; il tasto non si disabilita.
- La nota Hendrix **è uno stato**: una `.elenco-nota` nella tendina e una `.nota-jh` nel blocco
  a fuoco.
- **Ogni pannello che parla con l'ampli ha la sua `.stato-pannello`**;
  `pulisciStatoPannelli()` le nasconde e chi ci scrive la rimostra (`statoDelPannello`).

### Segnala un problema e donazioni

Menu Altro: **mailto a `mazzbackup@gmail.com`** (solo email, scelta dell'utente) con versione,
browser, ampli e le ultime righe del registro, mostrate prima. «☕ Offrimi un caffè» apre
`buymeacoffee.com/mazzgear` con `window.open`: lasciare la pagina farebbe cadere l'ampli.

- **Il bollo «JH»** (effetto Hendrix in catena) sta in **quattro posti, e quattro restano**:
  schede, tendina dei modelli, blocco a fuoco dell'editor, riga di log in `mandaPreset`. Non
  nella vista live (decisione dell'utente) né sul pedale. Nella bozza (16 ottobre): **col
  pacchetto Hendrix dichiarato «no» i bolli spariscono**, perché i preset Hendrix non si vedono.

## Estratto di CLAUDE.md del 22 ottobre 2026 (sera): convenzioni e due regole del pedale

## Convenzioni

- **I commit li faccio io**, quando un pezzo sta in piedi e le suite sono verdi; messaggi in
  italiano su cosa cambia e perché. **I commit visibili si pushano senza chiedere**: l'utente
  guarda l'app pubblicata. **Eccezione, la grafica** (colori, sfondo, disposizione; 14 ottobre
  2026): prima una bozza da guardare, si pubblica solo dopo il suo sì.
- **All'utente: cosa è successo e cosa cambia per lui**, istruzioni passo passo; il racconto va
  in `docs/`.
- **In locale la libreria è vuota** (altra origine): preset finti con
  `store.importFromAmp([...])`.
- **Questa memoria la aggiorno io**, sempre a fine sessione; si registrano anche le ipotesi
  escluse da misure. Si segna sempre cosa è verificato sull'hardware.
- **Controllo di sicurezza dopo ogni novità grossa** (17 ottobre 2026, scelta dell'utente al posto
  di un appuntamento fisso): una funzione che parla con l'esterno (chiavi, rete, Bluetooth, file
  importati, firmware del ponte) la ricontrollo io prima di chiudere la sessione, o propongo una
  sessione apposta se è lungo; l'esito va in `docs/sicurezza.md`, con la data. Ultimo audit intero
  17 settembre 2026.
- Italiano in commenti e UI; la UI ha anche l'inglese, secondario (vedi «L'inglese»). Byte
  in hex minuscolo separato da spazi.

- **Il tasto banco cambia banco al rilascio** (2.24): tenuto due secondi da solo apre il tuner, che
  si chiude con un tasto qualunque (`12-tuner.ino`, `docs/pedale-lavoro.md`). **Verificato sul pedale il 20 ottobre.**
- **L'ampli si e' inceppato** (20 ottobre, due volte, causa ignota): sul pedale c'e' una **scatola nera** che
  si salva da sola quando succede; si legge col pedale attaccato al PC, comando `M` (`docs/pedale-lavoro.md`).

## Estratto di CLAUDE.md del 22 ottobre 2026 (sera): le suite e le trappole del browser

**Dopo ogni modifica a `src/`, le suite in `test/` devono restare verdi.** Girano con Edge
headless (poi si cerca `id="summary"`):

```
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --no-first-run --user-data-dir="$env:TEMP\claude\edge-prof" --virtual-time-budget=20000 `
  --dump-dom 'file:///C:/Users/massi/Progetti%20Claude/spark/test/protocol-test.html'
```

- **`store-test` e `backup-test` no**: si passa da `localhost` (`tools/serve.ps1`), come per
  provare l'app. **Un `file://` nel browser del riquadro non carica gli script.**
- **Lo stdout di Edge headless non torna alla shell**: `Start-Process … -RedirectStandardOutput`,
  anche per `--screenshot`.
- **`requestAnimationFrame` non gira** né nel riquadro né in headless: ciò che si muove usa
  `setInterval`.
- **Il service worker serve a Edge i file vecchi**: query in coda all'url, o profilo nuovo.
- **Nelle schede in secondo piano i timer sono strozzati.**
- **L'avvio dell'app chiude i pannelli** (`applicaVista()` → `chiudiPannelli()`): una prova che
  ne apre uno troppo presto sembra un difetto.

**ESP32**: compilare, caricare (`prova-ble` vuole il giro a 1200 baud) e le trappole della
XIAO stanno in **`docs/pedale-lavoro.md`**. **Il firmware lo compilo e lo carico io, senza
chiedere.** **Lingua del display**: `#define INGLESE` in `prova-ble.ino` (0 italiano, 1 inglese;
2.17, 9 ottobre 2026); ogni scritta nuova del display passa da `TESTO(it, en)`.

## Il «fork» Tone Studio — 23 ottobre 2026, guardato e lasciato

`gp5-tone-studio.payam-danesh-7987.chatgpt.site` (si apre solo con un account ChatGPT; su GitHub nessun fork).
È la nostra app del 7–10 ottobre, in inglese, dentro una pagina che le parla con `postMessage`.
Aggiunge: Bluetooth più prudente (sonda prima dell'invio, stop se i primi due pezzi non hanno ack,
ma stacca tutto se uno slot non risponde: sul NEO cadrebbe sempre), tuner, preset che suona al tocco
della scheda; un looper con i nostri stessi comandi e un metronomo dal computer (il conteggio col click
resta non comandabile); un pedale AIRSTEP via MIDI; un Tone Builder che prepara una richiesta per
ChatGPT (copia e incolla a mano, senza chiave) da una «Spark Tone Guide v2.3» per ruolo e pickup, col
nostro catalogo copiato — vecchio ordine dei riverberi compreso. Segnala, non verificato, uno «schiocco»
che si ripete nel loop quando la registrazione parte da remoto. **L'utente: niente di interessante.**

## Estratto di CLAUDE.md del 24 ottobre 2026: tre voci di «Dove si riprende»

- **Da verificare a orecchio**: quale posizione della levetta sia Limit (LA Comp), -15 dB (Optical Comp), HP
  (SAB Driver) e Chorus (UniVibe); nel wah, 1/2 = 0,5 e il tempo lineare.
- **Tuner** (20 ottobre, `v131`): `0x0165 c3`/`c2` (senza `0x00`); l'ampli tace e manda `0x0364` (nota 0–11
  senza ottava, scostamento 0–1 con 0,5 intonata, -1 silenzio). Muto solo a scheda aperta, ampli collegato e
  pagina in vista (`seguiAccordatore`). `docs/decisioni-ui.md`, «Il tuner».
- **iPhone e iPad**: Bluefy, con gli UUID interi (`docs/decisioni-ui.md`, «Su iPhone e iPad»).

## Estratto di CLAUDE.md del 25 ottobre 2026: il riverbero e due incisi del pedale d'espressione

- **I tipi di riverbero** (`bias.reverb` parametro 6) sono in ordine per famiglie: Room A, Room B, Chamber,
  Hall Natural/Medium/Ambient, Plate Short/Rich/Long. Il 23 ottobre l'utente li ha verificati tutti e nove
  nell'app ufficiale: il vecchio ordine «dettato» era sbagliato (guscio `v139`). Nello stesso controllo,
  sette preset confrontati blocco per blocco: nomi dei modelli e acceso/spento tutti giusti.
- Dalla voce del pedale d'espressione, dopo «`pedale/prova-controlx/` comanda wah e volume»: "(25 ottobre: l'«onda»
  che restava era il chorus del preset), e l'app ufficiale lo prende per un Control X vero."

## Estratto di CLAUDE.md del 29 ottobre 2026: basetta, Play Acoustic e pedale d'espressione

Le tre voci di «Dove si riprende» come erano prima di accorciarle (il pedale d'espressione è poi stato cablato e
letto, 2.31: `docs/pedale-lavoro.md`).

- **Basetta** `pcb/basetta/` (20 ottobre): generata **solo** da `tools/genera-basetta.py`, mai a mano;
  approvata, da ordinare su JLCPCB, **non provata**. **Non ancora ordinata: l'utente aspetta di decidere il
  pedale d'espressione** (29 ottobre: J10 ha già G, 3V3, D2, D8; proposta una presa JST-XH apposta con 1 kΩ e
  100 nF sulla basetta; ci sta pensando). Linee nuove: FS1..FS4 = GPA6..GPA3, FS5 = GPA2, SX = GPA1,
  DX = GPA0, **GPA7 libera**; LED*n* rosso/verde = GPB(2n-2)/GPB(2n-1). A scheda arrivata: firmware con le
  tabelle nuove e mappatura guidata.
- **Pedale 2.29 caricato e verificato il 23 ottobre**: partenza in Spark, menu, CC 21–26 a 127/0 in Play
  Acoustic, giro fino all'adattatore. **Schermate di menu e Play Acoustic scelte dall'utente fra due bozze**
  (disegnate sul PC coi font veri: `..\MIdiAdapter\tools\oled\`, `node bozze.js <cartella>`), viste sul
  pedale e approvate. **27 ottobre: l'adattatore saldato funziona sul Play Acoustic vero, tutte le funzioni**
  (HIT, preset su/giù, Rec/Play/Overdub, Stop, cancella tenendo FS2, Undo). Guida italiana già aggiornata;
  l'inglese no, per la regola sull'inglese. **Trappola**: se un iPad ricorda il pedale da GarageBand, gli
  si ricollega da solo appena si annuncia e occupa il posto dell'adattatore (quadratino M pieno, C6 che
  non trova niente): Bluetooth dell'iPad spento.
- **Pedale d'espressione** (24 ottobre, prove): volume col Master liscio; il wah manuale **non è un parametro** di
  `JH.Vox846`. Lo fa l'ampli se il pedale **si finge uno Spark Control X** (servizio FFC8, l'ampli si collega lui,
  mappa 0x70 wah / 0x72 volume, posizione con 0x0C): `pedale/prova-controlx/` comanda wah e volume.
  Attrezzi: `tools/wah-ponte.ps1` + `tools/wah.html`. **Trappola**: chiusa l'app l'ampli suona lo slot,
  i 0x0104 cambiano 0x7f senza suonare finché non arriva `0x0138 7f`. Scala 0…32767, calibrazione nel pedale.
  **Deciso dall'utente** (25 ottobre): wah se nel preset c'è `JH.Vox846`, altrimenti volume, lo sceglie il pedale;
  senza jack infilato niente Control X (presa Neutrik/Rean NYS215 col contatto dell'anello su **D8**, 1 kΩ fra 3V3
  e anello; foto della presa prima dei fili). **CC 11 verso AmpliTube 5 verificato** dal cursore. **Prossimo: il
  doppio ruolo** (preset e Control X insieme), scritto e mai provato. Tutto in `docs/pedale-lavoro.md`.

## Estratto di CLAUDE.md del 29 ottobre 2026 (sera): il wah al posto del LA Comp

- **Il wah al posto del LA Comp** (22 ottobre, sera): non è un difetto. Il test del wah del 16 ottobre negli slot
  A1–A4 ha riscritto, per UUID, quattro preset (Nylon Reverb, Jazz tone, PF comfortably numb, prova); l'omonimo del
  NEO non li ha corretti. Rimedio dato all'utente: `Dropbox\ripristino-la-comp.json` da «Importa». **Da sentire
  se ha funzionato**, e se gli slot A1–A4 dello Spark 2 hanno ancora il wah (rileggendoli tornerebbe).
