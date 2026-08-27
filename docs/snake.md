# StompSnake — la goliardata

Chiesto dall'utente il **27 agosto 2026**: «un passatempo fra una canzone e l'altra». Sta in
`src/snake-pedali.js` e si apre da «Fai una pausa» nel menu «⋯». Questo file raccoglie tutto
quello che serve **solo se si riapre il capitolo**; in `CLAUDE.md` restano tre righe.

Un Snake a 8 bit dove il serpente è una catena di pedalini attaccati col cavo e mangia
**batterie da 9 volt**.

**Si chiama StompSnake, ma il file resta `snake-pedali.js`**: il nome gliel'ha dato
l'utente il 27 agosto, a gioco fatto, e rinominare il file vorrebbe dire toccare anche
`index.html` e il `GUSCIO` di `sw.js` per niente.

**Si entra dal menu «⋯» della schermata principale, alla voce «Fai una pausa»** (spostata
lì il 27 agosto 2026, su richiesta): a un passatempo non ci si arriva passando da un
pannello di manutenzione. Dentro «Altro» non c'è più niente del gioco.

**Sopra il campo c'è il logo**, `icons/stompsnake.jpg`, disegnato dall'utente e qui
ritagliato dei margini vuoti. Tre cose da ricordare:

- **è un JPEG su fondo nero, non un PNG trasparente**, e non è una svista: il pannello è
  nero pieno in tutte e due le viste, quindi si vede uguale, e il PNG con l'alfa pesava
  **384 KB contro 76**;
- **non sta nel `GUSCIO` di `sw.js`**, apposta: il guscio è quello che serve a far partire
  l'app da spenta. Il logo se lo prende da sé la prima volta che si apre il gioco, e da
  allora c'è anche offline. (E così non c'è il rischio di metterci un file che non esiste
  ancora: `cache.addAll` fallisce in blocco su un 404.)
- se il file non rispondesse resta la scritta «STOMPSNAKE», che tiene lo stesso spazio. Ma
  attenzione: **l'attributo `hidden` da solo non nasconde l'immagine**, perché il nostro
  `display:block` lo scavalca — senza la regola `img[hidden] { display:none }` il
  segnaposto rotto si vede accanto alla scritta.

**Ogni cinque pedalini parte un accordo distorto** (chiesto il 27 agosto 2026), e non è un
campione: sono tre corde — tonica, quinta, ottava — di onde a dente di sega, **due voci per
corda leggermente scordate** perché una sola suona finta, dentro un `WaveShaper`. Due cose
che fanno la differenza fra una chitarra e un rumore: le corde partono **sfalsate di 18 ms**
(è la pennata), e le sei voci entrano nel distorsore **abbassate a 0,3** — a piena ampiezza
la somma arriva a sei volte il fondoscala e la curva schiaccia tutto in un'onda quadra. La
soglia avanza con un `while` e non con un resto, perché il wah vale tre pedalini e il conto
può **scavalcare** il cinque; e se l'accordo è appena partito, il wah che compare nello
stesso passo entra zitto. **Il banco lo verifica contando le onde**, con un `AudioContext`
finto: quadre = bip, dente di sega = accordo.

**Il campo e i tasti hanno un bordo al neon che fa l'onda** (chiesto il 27 agosto 2026).
Il trucco sono due sfondi sovrapposti — il nero ritagliato sul riquadro interno, l'arcobaleno
su tutto compreso il bordo, largo il doppio — e uno scorrimento di `200%`, che torna al
punto di partenza senza scatti. **Il bordo dev'essere `transparent`**, o coprirebbe
l'arcobaleno. Ogni tasto parte con un ritardo suo, così l'onda gira intorno alla
pulsantiera invece di lampeggiare tutta insieme; l'alone è lo stesso arcobaleno sfocato in
un `::before` dietro. `prefers-reduced-motion` ferma l'onda e lascia il bordo.

- **Non tocca niente**: non parla con l'ampli, non legge la libreria, non ha stato in comune
  con l'app. L'unico contatto è `SnakePedali.apri()`. Record e «muto» stanno in
  `localStorage` — non in `settings`, perché non devono finire in un backup né su Dropbox.
- **Vive in un file suo e non in `index.html`**: quello costa già ~55.000 token a lettura, e
  uno scherzo non deve pesarci sopra. Si costruisce il pannello da sé, ma riusa le classi
  dell'app (`.pannello`, `.primary`, `.piccolo`, `.spiega`) e le variabili di colore. Il
  pannello ha `z-index:20` e si apre **sopra** «Altro» senza passare da `apriPannello`, che
  chiuderebbe tutto: così «Fatto» riporta dov'era.
- **Il ciclo è un `setInterval`, non `requestAnimationFrame`, ed è una scelta**: qui non si
  interpola niente — tutto si muove di una casella alla volta — e rAF non gira in nessuno
  dei due browser che ho (vedi «Trappole dell'ambiente»), quindi con rAF non potrei provare
  il gioco affatto. Se i pannelli vengono chiusi da fuori, il ciclo se ne accorge e si
  ferma.
- **Qualunque comando fa partire la partita**, anche quello che non gira niente. Legandola
  alla sola sterzata utile, il primo tasto che viene in mente — «su», la direzione in cui il
  serpente già guarda — non faceva succedere nulla.
- Il disegno è su una tela da 208×224 **pixel veri**, ingrandita con
  `image-rendering:pixelated`. Un pedalino sta in tredici pixel: manopole **agli angoli** e
  pulsantone largo in basso, perché con le manopole in mezzo veniva fuori una faccina. Il
  cavo fra due scatolette è **grigio**: nero, sul pavimento quasi nero, non si vedeva. La
  cornice è una **cassa da trasporto disegnata dentro la tela** — squadrette e viti agli
  angoli — e per questo la tela **non ha bordo CSS**: sarebbero due cornici.
- **Il wah è il premio** (chiesto dall'utente il 27 agosto 2026): compare ogni dieci
  batterie, vale tre pedalini e **se ne va da solo** dopo nove secondi, lampeggiando negli
  ultimi tre. Scappa **a tempo e non a passi**, o stando fermi non ci sarebbe fretta. La
  catena si allunga con un contatore (`cresci`) e non aggiungendo tre pezzi in un colpo: i
  tre pedalini spuntano un passo alla volta, invece che dal nulla tutti insieme.

`tools/snake-banco.html` lo fa girare da solo e dice se muove, mangia, si ferma in pausa e
finisce contro il muro. Gira anche in headless, e con **`?zoom`** in coda all'indirizzo
ingrandisce la tela quattro volte, che è l'unico modo di guardare i pixel di un pedalino.
**Il wah il banco non lo prova**: per vederlo si mette `WAH_OGNI` a 1 e si rimette a 10.


## Com'è venuta fuori — 27 agosto 2026

Un pomeriggio, un giro alla volta, tutti chiesti dall'utente: il gioco; poi **«un po' troppo
veloce»** (adesso si parte a 330 ms e si scende di dieci a batteria); il **wah come premio** e
la **cassa attorno al campo**; poi l'ha provato sul telefono e **i comandi funzionano** — detto
da lui, ed è l'unica cosa che il banco non poteva dire. Da lì il **nome** e il **logo**, che ha
disegnato lui; lo spostamento dell'accesso nel **menu «⋯» alla voce «Fai una pausa»**; il
**neon a onda** su campo e tasti; e infine **l'accordo distorto ogni cinque pedalini**.
Pubblicato, guscio `v69`, verificato sull'indirizzo vero.

## Se si riapre

Tutte le manopole stanno in cima a `src/snake-pedali.js`: i quattro `WAH_*`, i tre della
cadenza, `ACCORDO_OGNI` e la tabella `ACCORDI`.

**Due cose non le ho viste io e le sa solo l'utente**: come suona davvero l'accordo — volume,
cattiveria della distorsione, filtro — e **il wah in una partita vera**, perché per arrivarci
servono dieci batterie giocate a mano.
