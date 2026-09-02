# Il sito di presentazione — sparklingtones.com

Spostato qui da `CLAUDE.md` il 2 settembre 2026: in memoria di lavoro resta un rimando.

## Il sito di presentazione — fuori da questo repo

Dal **27 agosto 2026** c'è una vetrina su **`sparklingtones.com`**, e **non sta qui**:
`C:\Users\massi\sparklingtones-sito`, repo `mazzrelaz/sparklingtones-sito`. Un solo
`index.html`, font e logo copiati dall'app, nessuna dipendenza.

**L'app non si è spostata**, e la ragione è la trappola da ricordare: **un dominio custom
su GitHub Pages vale per l'intero repo**. Messo su `SparklingTones` avrebbe portato via
anche l'app, e con lei la PWA installata sul telefono e l'IndexedDB della libreria — altra
origine, altro database. Quindi repo separato, e il sito ci manda con dei link.

DNS su register.it: quattro record `A` agli IP di GitHub (`185.199.108-111.153`) più il
`CNAME` del `www`; il dominio lo dichiara il file `CNAME` dentro il repo del sito. Attivo e
verificato, https compreso.

**I video non ci sono ancora**: i blocchi `<video>` sono in `index.html` **commentati**, e
`media/LEGGIMI.md` dice quali servono e come registrarli. Se l'utente dice «il video», è
quello. **Capitolo in stand by** per sua richiesta, il 27 agosto 2026.

Non fatto perché è la facciata pubblica e la decide lui: il `README.md` dell'app punta
ancora solo a `github.io`, senza il link al sito. La domanda gli è stata fatta e non ha
risposto.

**La trappola del `www`, pagata il 31 agosto 2026**: il record va in `CNAME` verso
**`mazzrelaz.github.io`**, non verso la radice del dominio. Puntandolo alla radice il sito
si raggiunge lo stesso — gli `A` sono quelli — ma **GitHub non emette il certificato per il
`www`**, e siccome Chrome prova `https` per primo chi digita il www vede «la connessione non
è privata». Si ripara cambiando il record e poi **togliendo e rimettendo il dominio** in
Settings → Pages, che è quello che fa ripartire l'emissione. Da lì in poi GitHub scrive lui
il file `CNAME` nel repo, quindi **la copia locale resta indietro: `git pull --rebase` prima
di ogni push**.

**C'è una `privacy.html`** (31 agosto 2026), nata da una mail commerciale di register («il
tuo sito non è in regola col Garante»), che parte a tappeto a chi registra un dominio.
Controllato e misurato: la pagina non ha **script, cookie, storage, analytics, moduli né
una sola richiesta a domini di terzi** — i caratteri sono serviti da lì, ed è il motivo per
cui erano stati copiati in casa. Quindi **nessun banner**: dove non c'è niente da
consentire, un banner è peggio che non averlo. Resta vero solo che GitHub tiene i log
tecnici con gli IP, e la pagina lo dice. **Se ritorna il discorso, la risposta è già
scritta**: non serve rifare l'analisi.

Il repo del sito ha la sua identità git (`massimo.togni@gmail.com`); **il primo commit porta
per sbaglio `mazzbackup@gmail.com`** e GitHub potrebbe non attribuirlo. Correggerlo vorrebbe
dire riscrivere la radice e forzare il push sopra i commit di GitHub: l'utente ha deciso di
lasciar stare.

