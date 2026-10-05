# Testo per la voce del video dimostrativo

Il testo va letto sopra `demo.mp4` (2:11), ed è diviso nei pezzi del video. A sinistra c'è
il momento in cui parte ogni pezzo. Ogni pezzo sta nel suo tempo letto con calma, a circa
due parole e mezza al secondo; i puntini sono le pause.

I tempi valgono per la registrazione del 5 ottobre 2026: se il copione cambia, si
rileggono da `linea.json` (le didascalie hanno il loro `t`).

---

**0:00 — titolo**
Questo è SparklingTones.

**0:03 — collegamento**
Un'app per comandare il tuo Spark dal telefono. Tocchi «Connetti»… e in un attimo legge da
sola gli otto preset salvati nell'ampli.

**0:12 — libreria**
Sotto c'è la tua libreria, con tutti gli altri suoni. Tocchi il triangolo rosso, e il
preset passa all'ampli e suona subito.

**0:21 — scheda del preset**
Ogni preset ha la sua scheda: nome, famiglia, categorie e note.

**0:26 — editor e manopole**
Con «Regola» apri l'editor: la catena effetti, dal noise gate al riverbero. Giri una
manopola… e l'ampli cambia mentre suoni.

**0:37 — cambio di modello**
Vuoi un altro overdrive, o un altro ampli? Lo scegli da un elenco, e accanto vedi a quale
pedale o ampli è ispirato.

**0:47 — salvare**
Niente si salva finché non lo decidi tu. Quando ti piace: «Salva».

**0:53 — vista live**
Poi c'è la vista live: pulsantoni grandi, da toccare anche mentre suoni. Il suono cambia
all'istante.

**1:03 — i banchi**
E ci sono i banchi: otto suoni scelti da te, nell'ordine che vuoi, presi da tutta la
libreria.

**1:11 — un banco nuovo**
Crearne uno è un attimo. Tocchi «più banco», gli dai un nome, per esempio «Prove»… e
riempi i posti uno alla volta: un tocco sul posto, un tocco sul preset. I banchi che crei
non scrivono mai sull'ampli: i suoi otto preset restano come sono.

**1:33 — il pedale** (cartello nero)
E poi c'è il pedale. Quattro footswitch per quattro suoni; il quinto passa dalla metà A
alla metà B. Il display e i LED ti dicono cosa sta suonando.

**1:45 — mandare un banco al pedale**
I banchi li prepari qui, con calma, e li mandi al pedale via Bluetooth: basta tenere
premuti insieme i suoi due tasti banco.

**1:53 — scegliere il posto**
Scegli quale banco, e in quale degli otto posti del pedale. Premi «Invia»… un paio di
secondi, ed è dentro.

**2:01 — chiusura**
Lì resta, anche a pedale spento. Sul palco il pedale parla da solo con lo Spark: il
telefono può restare a casa.

**2:06 — finale**
SparklingTones: gratis, funziona anche offline, con lo Spark 2 e con lo Spark NEO.

---

## Come registrarla

1. Una stanza silenziosa, senza eco (un armadio aperto pieno di vestiti va benissimo).
2. Il telefono col registratore vocale a una ventina di centimetri dalla bocca, un po' di
   lato, così le «p» non soffiano.
3. Fai partire il video senza audio sul computer, e comincia a leggere quando compare il
   titolo. Se un pezzo ti viene lungo, salta una frase: le didascalie dicono già il resto.
4. Se sbagli, ricomincia da capo: sono due minuti, si rifanno in fretta.
5. Il file audio si monta poi sul video: si scrive `voce.json` (quanto tagliare in testa e
   quando parte ogni pezzo, presi dalle pause della registrazione) nella cartella di uscita e
   si rifà il video con `node tools/video-demo/registra.js <cartella> it --voce voce.json`.
   Le scene aspettano la voce, non il contrario.
