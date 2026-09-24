/**
 * L'inglese dell'app: la lingua secondaria.
 *
 * Ogni voce è «frase italiana: traduzione». L'app si scrive e si cambia in
 * italiano; questo file resta com'è finché non si decide di aggiornare
 * l'inglese, e fino ad allora le frasi nuove compaiono in italiano anche a chi
 * ha scelto l'inglese. Per aggiornarlo, `tools/lingua.html` dà le frasi
 * mancanti e quelle che non servono più. Il meccanismo è in `src/lingua.js`.
 *
 * I segnaposto {0}, {1}… sono i valori che l'app mette nella frase: si possono
 * spostare ma non togliere.
 */
window.LINGUA_EN = {
  "torna ai preset":
    "back to presets",
  "SparklingTones":
    "SparklingTones",
  "CONNETTI":
    "CONNECT",
  "Live →":
    "Live →",
  "le altre azioni":
    "more actions",
  "Leggi dall'ampli":
    "Read from the amp",
  "prende in libreria il suono che l'ampli sta facendo adesso; l'ampli non viene toccato":
    "adds the sound the amp is making right now to the library; the amp is not touched",
  "Importa preset attuale":
    "Import current preset",
  "Categorie":
    "Categories",
  "Altro":
    "More",
  "Modifica":
    "Edit",
  "Pedale":
    "Pedal",
  "Fai una pausa":
    "Take a break",
  "cerca un preset…":
    "search presets…",
  "Preset hardware":
    "Hardware presets",
  "In libreria <span class=\"nota\" id=\"quantiLibreria\"></span>":
    "In the library <span class=\"nota\" id=\"quantiLibreria\"></span>",
  "Fatto":
    "Done",
  "Famiglia di suono":
    "Sound family",
  "Che <em>tipo</em> di suono è: una sola per preset, e si riconosce dal colore senza leggere niente. Si assegna aprendo un preset. I colori sono tuoi — toccali per cambiarli.":
    "What <em>kind</em> of sound it is: one per preset, recognisable by its colour without reading anything. You set it by opening a preset. The colours are yours — tap them to change them.",
  "Lo <em>stile</em>, o il pezzo: Pink Floyd, jazz, quello che vuoi, e un preset ne può avere quante ne servono. Quelle dell'app ufficiale non entrano in libreria. Eliminarne una la toglie dai preset, che restano.":
    "The <em>style</em>, or the song: Pink Floyd, jazz, whatever you like, and a preset can have as many as it needs. Those from the official app don't come into the library. Deleting one removes it from the presets, which stay.",
  "nuova categoria":
    "new category",
  "Aggiungi":
    "Add",
  "Azzera tutte le categorie":
    "Clear all categories",
  "La libreria vive in questo browser: l'esportazione è l'unico modo di portarla su un altro apparecchio o di metterla al sicuro.":
    "The library lives in this browser: exporting it is the only way to move it to another device or keep it safe.",
  "Esporta la libreria":
    "Export the library",
  "Importa un file":
    "Import a file",
  "Si importano i backup di quest'app (.json), il <code>preset_backup.zip</code> dell'app ufficiale e <strong>un preset singolo</strong> esportato da lì. Se ce l'hai già, se ne aggiorna il suono: tag, note e famiglia restano. Un suono che l'ampli sta già facendo non ha bisogno di nessun file: si prende con <strong>«Importa preset attuale»</strong>, nel menu «⋯».":
    "You can import backups from this app (.json), the official app's <code>preset_backup.zip</code> and <strong>a single preset</strong> exported from there. If you already have it, its sound is updated: tags, notes and family stay. A sound the amp is already playing doesn't need any file: grab it with <strong>«Import current preset»</strong>, in the «⋯» menu.",
  "Dropbox":
    "Dropbox",
  "Due gesti espliciti, mai in automatico. Quello che arriva si <strong>fonde</strong>: aggiorna i preset che riconosce, aggiunge quelli che non ci sono, e quelli cancellati sull'altro apparecchio spariscono anche qui — a meno che tu non li abbia toccati dopo.":
    "Two explicit actions, never automatic. What comes in is <strong>merged</strong>: it updates the presets it recognises, adds the ones that aren't here, and the ones deleted on the other device disappear here too — unless you touched them afterwards.",
  "Manda su Dropbox":
    "Send to Dropbox",
  "Prendi da Dropbox":
    "Get from Dropbox",
  "Scollega Dropbox":
    "Disconnect Dropbox",
  "app key della tua app Dropbox":
    "app key of your Dropbox app",
  "Collega":
    "Connect",
  "Si è aperta la pagina di Dropbox: autorizza, e incolla qui il codice che ti mostra. Se non si è aperta da sé — sul telefono capita, il browser la blocca come una finestra a sorpresa — <a id=\"dropboxLink\" href=\"#\" target=\"_blank\" rel=\"noopener\">aprila da qui</a>.":
    "The Dropbox page has opened: authorise, then paste here the code it shows you. If it didn't open by itself — it happens on phones, the browser blocks it as a pop-up — <a id=\"dropboxLink\" href=\"#\" target=\"_blank\" rel=\"noopener\">open it from here</a>.",
  "codice da Dropbox":
    "code from Dropbox",
  "Serve un'app tua, una volta sola: su <code>dropbox.com/developers</code>, «Create app», <em>Scoped access</em> e <em>App folder</em>; nella scheda «Permissions» spunta <code>files.content.write</code> e <code>files.content.read</code>. L'app key sta nella scheda «Settings». L'app secret non serve: una pagina come questa non potrebbe tenerlo nascosto, ed è il motivo per cui si usa PKCE.":
    "You need an app of your own, just once: on <code>dropbox.com/developers</code>, «Create app», <em>Scoped access</em> and <em>App folder</em>; in the «Permissions» tab tick <code>files.content.write</code> and <code>files.content.read</code>. The app key is in the «Settings» tab. The app secret isn't needed: a page like this one couldn't keep it hidden, which is why PKCE is used.",
  "Fare piazza pulita":
    "Clean slate",
  "Toglie dalla libreria tutti i preset <strong>tranne gli otto caricati sull'ampli</strong>, che restano coi loro tag e le loro note. L'ampli non viene toccato. Se usi Dropbox, al prossimo «Manda su» spariranno anche di là.":
    "Removes from the library every preset <strong>except the eight loaded on the amp</strong>, which keep their tags and notes. The amp is not touched. If you use Dropbox, at the next «Send to» they will disappear from there too.",
  "Elimina tutti i preset":
    "Delete all presets",
  "Informazioni, licenze e responsabilità":
    "About, licences and liability",
  "<strong>SparklingTones</strong> organizza i preset di un amplificatore Spark 2 e li manda all'amplificatore via Bluetooth. Gira per intero dentro il browser: non c'è un server, non c'è un account, e la libreria resta sull'apparecchio che stai usando.":
    "<strong>SparklingTones</strong> organises the presets of a Spark 2 amplifier and sends them to the amp over Bluetooth. It runs entirely inside the browser: there is no server, no account, and the library stays on the device you are using.",
  "Scritto da <strong>Massimo Togni</strong>.":
    "Written by <strong>Massimo Togni</strong>.",
  "Uso libero":
    "Free to use",
  "Questo software è di <strong>libero utilizzo</strong>: si può usare, copiare, modificare e ridistribuire, alle condizioni della licenza MIT, di cui trovi il testo nel file <code>LICENSE</code> insieme al codice.":
    "This software is <strong>free to use</strong>: you may use, copy, modify and redistribute it under the terms of the MIT licence, whose text you'll find in the <code>LICENSE</code> file together with the code.",
  "Nessuna garanzia, nessuna responsabilità":
    "No warranty, no liability",
  "Il software è fornito <strong>«così com'è»</strong>, senza garanzie di alcun tipo, esplicite o implicite, comprese quelle di commerciabilità, idoneità a uno scopo particolare e non violazione di diritti altrui.":
    "The software is provided <strong>«as is»</strong>, without warranty of any kind, express or implied, including those of merchantability, fitness for a particular purpose and non-infringement.",
  "<strong>L'autore non si assume alcuna responsabilità</strong> per danni diretti o indiretti derivanti dall'uso di questo software: fra questi, a titolo di esempio e senza che l'elenco sia esaustivo, la perdita o l'alterazione dei preset salvati nell'amplificatore o nella libreria, malfunzionamenti dell'apparecchio, e qualunque conseguenza di un comando mandato via Bluetooth. <strong>Lo usi a tuo rischio.</strong>":
    "<strong>The author accepts no liability</strong> for direct or indirect damage arising from the use of this software: including, by way of example and without the list being exhaustive, the loss or alteration of presets saved in the amplifier or in the library, malfunctions of the device, and any consequence of a command sent over Bluetooth. <strong>You use it at your own risk.</strong>",
  "Due cose che conviene sapere prima di usarlo, non per formalità ma perché possono capitare davvero: scrivere un preset in uno slot <strong>sovrascrive</strong> quello che c'era, e non si torna indietro; e un amplificatore può smettere di rispondere e richiedere di essere spento e riacceso. Tieni un backup dei preset a cui tieni.":
    "Two things worth knowing before using it, not as a formality but because they can really happen: writing a preset to a slot <strong>overwrites</strong> what was there, with no way back; and an amplifier may stop responding and need to be switched off and on again. Keep a backup of the presets you care about.",
  "Nessun rapporto con Positive Grid":
    "No affiliation with Positive Grid",
  "Questo software è un progetto indipendente e <strong>non ha alcun rapporto con Positive Grid Inc.</strong>: non è prodotto, approvato, sponsorizzato, verificato né supportato da Positive Grid, e non ne usa codice.":
    "This software is an independent project and <strong>has no affiliation with Positive Grid Inc.</strong>: it is not made, approved, sponsored, verified or supported by Positive Grid, and uses none of its code.",
  "«Positive Grid» e «Spark» sono marchi dei rispettivi titolari, citati qui unicamente per indicare con quale apparecchio questo software funziona, secondo l'uso descrittivo consentito. Ogni altro marchio citato appartiene ai suoi titolari.":
    "«Positive Grid» and «Spark» are trademarks of their respective owners, mentioned here solely to indicate which device this software works with, as permitted descriptive use. Every other trademark mentioned belongs to its owners.",
  "Per l'assistenza sull'amplificatore rivolgiti a Positive Grid: di questo software loro non sanno niente e non ne rispondono.":
    "For support with the amplifier, contact Positive Grid: they know nothing about this software and are not responsible for it.",
  "Su cosa è stato provato":
    "What it has been tested on",
  "Provato <strong>solo su Spark 2</strong>, e su un solo esemplare. Su altri modelli della stessa famiglia non è mai stato acceso: potrebbe funzionare, potrebbe non fare niente, potrebbe comportarsi in modo imprevisto. Il protocollo è stato ricostruito osservando l'apparecchio, non è documentazione ufficiale, e su un firmware diverso dal mio può cambiare.":
    "Tested <strong>only on Spark 2</strong>, and on a single unit. It has never been run on other models of the same family: it might work, it might do nothing, it might behave unexpectedly. The protocol was reconstructed by observing the device, it is not official documentation, and it may change on a firmware different from mine.",
  "Cosa esce da qui":
    "What leaves this app",
  "Niente. Nessun dato viene raccolto né inviato: la libreria sta nel browser di questo apparecchio, e l'unica cosa che il programma comunica sono i comandi all'amplificatore, via Bluetooth, mentre lo stai usando.":
    "Nothing. No data is collected or sent: the library lives in the browser of this device, and the only thing the program communicates is the commands to the amplifier, over Bluetooth, while you are using it.",
  "Grazie a, e licenze":
    "Thanks, and licences",
  "<strong>Soundshed</strong> — <em>licenza MIT</em>. Da lì vengono i nomi in chiaro degli effetti e delle loro manopole, che l'amplificatore non manda: <code>sparkFxCatalog.ts</code>, Copyright (c) Soundshed contributors. <a href=\"https://github.com/soundshed/soundshed-app\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/soundshed/soundshed-app</a>":
    "<strong>Soundshed</strong> — <em>MIT licence</em>. It's where the readable names of the effects and their knobs come from, which the amplifier doesn't send: <code>sparkFxCatalog.ts</code>, Copyright (c) Soundshed contributors. <a href=\"https://github.com/soundshed/soundshed-app\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/soundshed/soundshed-app</a>",
  "<strong>paulhamsh/Spark</strong> — <em>licenza Apache 2.0</em>. Il riferimento funzionante da cui è stata capita la struttura dei messaggi. Copie dei suoi sorgenti stanno nel repository, in <code>reference/paulhamsh/</code>, con la licenza accanto. <a href=\"https://github.com/paulhamsh/Spark\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/paulhamsh/Spark</a>":
    "<strong>paulhamsh/Spark</strong> — <em>Apache 2.0 licence</em>. The working reference from which the structure of the messages was understood. Copies of its sources are in the repository, in <code>reference/paulhamsh/</code>, with the licence alongside. <a href=\"https://github.com/paulhamsh/Spark\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/paulhamsh/Spark</a>",
  "I nomi dei tipi di riverbero e dei modelli sono quelli che si leggono nell'app ufficiale, trascritti a mano per poterli riconoscere: sono citazioni, non codice.":
    "The names of the reverb types and of the models are the ones shown in the official app, copied by hand so they can be recognised: they are quotations, not code.",
  "Salva<span class=\"solo-largo\"> in libreria</span>":
    "Save<span class=\"solo-largo\"> to library</span>",
  "Rileggi dall'ampli":
    "Re-read from the amp",
  "Come funziona":
    "How it works",
  "Regola il suono":
    "Shape the sound",
  "offline":
    "offline",
  "tempo":
    "tempo",
  "un bpm in meno":
    "one bpm less",
  "bpm":
    "bpm",
  "un bpm in più":
    "one bpm more",
  "batti il tempo: due tocchi bastano":
    "tap the tempo: two taps are enough",
  "tap":
    "tap",
  "Si sente <strong>subito</strong>; in libreria non si salva niente finché non premi «Salva». Tocca un blocco della catena per aprirlo: dentro ci sono il modello, l'interruttore e le sue manopole.":
    "You hear it <strong>right away</strong>; nothing is saved to the library until you press «Save». Tap a block of the chain to open it: inside are the model, the switch and its knobs.",
  "L'ampli i nomi dei parametri non li manda: quelli <em>in corsivo</em> arrivano da una tabella e sono proposte da verificare a orecchio, quelli in chiaro li hai messi tu, i numeri sono ancora da battezzare. <strong>Tocca il nome di una manopola per cambiarlo</strong>: vale per quel modello, in ogni preset che lo usa.":
    "The amp doesn't send the names of the parameters: the ones <em>in italics</em> come from a table and are suggestions to check by ear, the plain ones are yours, and the numbers are still waiting for a name. <strong>Tap a knob's name to change it</strong>: it applies to that model, in every preset that uses it.",
  "Scegli un preset":
    "Choose a preset",
  "Annulla":
    "Cancel",
  "cerca…":
    "search…",
  "Svuota il posto":
    "Empty the slot",
  "Cerca il pedale":
    "Find the pedal",
  "non collegato":
    "not connected",
  "Copia il log":
    "Copy the log",
  "Stacca":
    "Disconnect",
  "<strong>Prima apri il ponte sul pedale</strong>: tieni premuti insieme i due tasti banco per un secondo e mezzo. Resta aperto due minuti, e il display lo dice. Finché è chiuso il pedale non si annuncia, e qui non compare: serve a non far collegare chiunque passi, che gli farebbe mollare l'ampli.":
    "<strong>First open the bridge on the pedal</strong>: hold both bank buttons together for a second and a half. It stays open for two minutes, and the display says so. While it's closed the pedal doesn't advertise itself and doesn't show up here: that way nobody passing by can connect to it and make it drop the amp.",
  "Mentre sei collegato al pedale, <em>il pedale ha mollato l'ampli</em> e non suona: è così per scelta, un padrone alla volta. Appena stacchi se lo riprende da solo. I banchi restano nel pedale anche a corrente staccata.":
    "While you're connected to the pedal, <em>the pedal has let go of the amp</em> and doesn't play: that's by design, one master at a time. As soon as you disconnect it takes the amp back by itself. Banks stay in the pedal even with the power off.",
  "Invia":
    "Send",
  "Cosa c'è nel pedale":
    "What's in the pedal",
  "Sposta e togli quanto vuoi: qui non succede niente finché non premi <em>Aggiorna il pedale</em>. Caricare un banco invece è immediato.":
    "Move and remove as much as you like: nothing happens until you press <em>Update the pedal</em>. Loading a bank, on the other hand, is immediate.",
  "Aggiorna il pedale":
    "Update the pedal",
  "CONNESSO":
    "CONNECTED",
  "connesso":
    "connected",
  "collega l'amplificatore via Bluetooth":
    "connect the amplifier over Bluetooth",
  "(senza nome)":
    "(untitled)",
  "rosso":
    "red",
  "verde":
    "green",
  "← Preset":
    "← Presets",
  "banco {0}":
    "bank {0}",
  "{0} di {1}":
    "{0} of {1}",
  "Nessun preset oltre a quelli sull'ampli. Connetti e premi «Leggi dall'ampli», oppure importa un backup da «Altro».":
    "No presets besides the ones on the amp. Connect and press «Read from the amp», or import a backup from «More».",
  "Nessun preset corrisponde alla ricerca.":
    "No preset matches the search.",
  "tutte":
    "all",
  "slot {0} — LED {1} numero {2}":
    "slot {0} — LED {1} number {2}",
  "non ancora letto":
    "not read yet",
  "{0} — pacchetto Jimi Hendrix. Suonano solo dopo che l'app ufficiale si è connessa all'ampli almeno una volta da quando è acceso: prima restano muti, senza dare nessun errore.":
    "{0} — Jimi Hendrix pack. They only sound after the official app has connected to the amp at least once since it was switched on: until then they stay silent, without any error.",
  "manda il preset all'ampli senza sovrascrivere nessuno slot":
    "sends the preset to the amp without overwriting any slot",
  "nome":
    "name",
  "rinominato in «{0}». Sull'ampli il nome resta quello vecchio finché non lo riscrivi in uno slot.":
    "renamed to «{0}». On the amp the name stays the old one until you write it to a slot again.",
  "famiglia di suono":
    "sound family",
  "senza famiglia: resta senza colore.":
    "no family: it stays without a colour.",
  "categorie":
    "categories",
  "＋ nuova…":
    "＋ new…",
  "Come si chiama? La userai per filtrare la libreria dalle pastiglie in alto.":
    "What's it called? You'll use it to filter the library with the pills at the top.",
  "Crea e assegna":
    "Create and assign",
  "blues, prove, casa…":
    "blues, rehearsal, home…",
  "note":
    "notes",
  "come suona, quando usarlo, cosa cambiare…":
    "how it sounds, when to use it, what to change…",
  "Lo stesso preset sta anche in {0}.":
    "The same preset is also in {0}.",
  "Seleziona {0}":
    "Select {0}",
  "seleziona lo slot sull'ampli, senza scrivere nulla":
    "selects the slot on the amp, without writing anything",
  "selezionato {0}":
    "selected {0}",
  "Attiva":
    "Play",
  "Regola":
    "Tweak",
  "manda il preset all'ampli e apri le manopole":
    "sends the preset to the amp and opens the knobs",
  "apri le manopole sulla copia in libreria: senza ampli non si sente, ma si salva":
    "opens the knobs on the library copy: without the amp you won't hear it, but it saves",
  "{0} — LED {1} {2}":
    "{0} — LED {1} {2}",
  "dove scriverlo sull'ampli":
    "where to write it on the amp",
  "Invia a preset HW":
    "Send to HW preset",
  "sovrascrive il preset presente in quello slot":
    "overwrites the preset in that slot",
  "Scrivere <strong>{0}</strong> in {1} sull'ampli?":
    "Write <strong>{0}</strong> to {1} on the amp?",
  "Sovrascrive «{0}», che è già lì — ma la sua copia in libreria resta al sicuro, e ricompare nella lista qui sotto.":
    "It overwrites «{0}», which is already there — but its library copy stays safe, and reappears in the list below.",
  "La copia in libreria resta comunque al sicuro.":
    "The library copy stays safe anyway.",
  "scrivere sull'ampli":
    "write to the amp",
  "Scrivi {0}":
    "Write {0}",
  " — {0} posti liberi":
    " — {0} free spots",
  " — pieno":
    " — full",
  "in quale banco live":
    "which live bank",
  "Metti nel banco":
    "Add to bank",
  "aggiunge il preset al banco live, senza toccare l'ampli":
    "adds the preset to the live bank, without touching the amp",
  "«{0}» era già in «{1}», al posto {2}":
    "«{0}» was already in «{1}», at spot {2}",
  "banco pieno":
    "bank full",
  "<strong>{0}</strong> ha tutti e otto i posti occupati. Liberane uno dalla vista Live, oppure scegli un altro banco.":
    "<strong>{0}</strong> has all eight spots taken. Free one from the Live view, or choose another bank.",
  "«{0}» → «{1}», posto {2}":
    "«{0}» → «{1}», spot {2}",
  "Duplica":
    "Copy",
  "ne fa una copia in libreria, da storcere a piacere":
    "makes a copy in the library, to bend as you please",
  "«{0}» creato copiando «{1}»":
    "«{0}» created by copying «{1}»",
  "Elimina":
    "Delete",
  "eliminare dalla libreria":
    "delete from the library",
  "Eliminare <strong>{0}</strong> dalla libreria? L'ampli non viene toccato: se è caricato in uno slot continua a suonare.":
    "Delete <strong>{0}</strong> from the library? The amp is not touched: if it's loaded in a slot it keeps playing.",
  "«{0}» eliminato dalla libreria":
    "«{0}» deleted from the library",
  "il posto vuoto":
    "the empty spot",
  "{0} ora è al posto {1}":
    "{0} is now at spot {1}",
  ", {0} al {1}":
    ", {0} at {1}",
  "tocca per scegliere":
    "tap to choose",
  "vuoto":
    "empty",
  "non letto":
    "not read",
  "tocca un altro posto per scambiare, o qui per lasciar perdere":
    "tap another spot to swap, or here to let it go",
  "sposta questo preset in un altro posto":
    "move this preset to another spot",
  "Ampli":
    "Amp",
  "gli otto preset caricati sull'ampli: sempre istantanei":
    "the eight presets loaded on the amp: always instant",
  "＋ banco":
    "＋ bank",
  "nuovo banco":
    "new bank",
  "Otto posti, quattro per piede. I banchi inventati non scrivono mai sull'ampli.":
    "Eight spots, four per foot. Your own banks never write to the amp.",
  "Banco {0}":
    "Bank {0}",
  "Crea il banco":
    "Create the bank",
  "banco live":
    "live bank",
  "Cambiagli nome, oppure eliminalo: <strong>i preset restano in libreria</strong>, sparisce solo l'ordine in cui li avevi messi.":
    "Rename it, or delete it: <strong>the presets stay in the library</strong>, only the order you had put them in goes away.",
  "Salva il nome":
    "Save the name",
  "Elimina il banco":
    "Delete the bank",
  "{0} — caricato nel preset software":
    "{0} — loaded into the software preset",
  "errore: {0}":
    "error: {0}",
  "{0} — posto {1}":
    "{0} — spot {1}",
  "Nessun preset.":
    "No presets.",
  "Il banco «Ampli» rispecchia gli otto slot dell'ampli: per cambiarlo scrivi un preset in uno slot dalla sezione Preset.":
    "The «Amp» bank mirrors the amp's eight slots: to change it, write a preset to a slot from the Presets section.",
  "suono corrente":
    "current sound",
  "«{0}» non è mandabile così com'è — {1}{2}. Non l'ho inviato: l'ampli avrebbe confermato i chunk e ignorato tutto. Se viene dal backup dell'app ufficiale, reimportalo: la conversione è stata corretta.":
    "«{0}» can't be sent as it is — {1}{2}. I didn't send it: the amp would have acknowledged the chunks and ignored everything. If it comes from the official app's backup, import it again: the conversion has been fixed.",
  " (e altri {0})":
    " (and {0} more)",
  "nota su «{0}»: {1}":
    "note on «{0}»: {1}",
  "«{0}» ha {1} del pacchetto Jimi Hendrix ({2}). Se non li senti, collega una volta l'app ufficiale all'ampli e riprova: lo sblocco resta finché non lo spegni.":
    "«{0}» has {1} from the Jimi Hendrix pack ({2}). If you can't hear them, connect the official app to the amp once and try again: the unlock lasts until you switch it off.",
  "un effetto":
    "an effect",
  "effetti":
    "effects",
  "invio «{0}» → {1}: chunk {2} di {3}…":
    "sending «{0}» → {1}: chunk {2} of {3}…",
  "invio interrotto: {0}. L'ampli potrebbe essere rimasto a metà: rileggi per controllare.":
    "sending interrupted: {0}. The amp may have been left halfway: re-read to check.",
  "inviato al {0} ({1}/{2} confermati)":
    "sent to {0} ({1}/{2} acknowledged)",
  ", verifico…":
    ", checking…",
  "{0}, ma l'ampli si è disconnesso durante l'invio.":
    "{0}, but the amp disconnected during the transfer.",
  "{0}, ma ora l'ampli non risponde più nemmeno a una domanda semplice: l'invio l'ha bloccato.":
    "{0}, but now the amp doesn't even answer a simple question: the transfer froze it.",
  "{0}, ma non so leggere quello che l'ampli risponde: ho scaricato il payload grezzo nei Download.":
    "{0}, but I can't read what the amp answers: I downloaded the raw payload to Downloads.",
  "{0}, ma non riesco a rileggere il suono corrente per verificare. Ascolta: il suono è cambiato?":
    "{0}, but I can't re-read the current sound to check. Listen: has the sound changed?",
  "{0}. L'ampli risponde alle domande semplici ma non rilegge {1}.":
    "{0}. The amp answers simple questions but doesn't re-read {1}.",
  "«{0}» è ora sul {1}. Verificato rileggendolo.":
    "«{0}» is now on {1}. Verified by reading it back.",
  " Il LED lampeggia perché l'ampli sta suonando il preset software, che non è nessuno degli otto slot.":
    " The LED blinks because the amp is playing the software preset, which is none of the eight slots.",
  "{0}, ma {1} riporta ancora «{2}»: il preset non è stato applicato. L'ampli ha confermato i chunk senza usarli.":
    "{0}, but {1} still reports «{2}»: the preset was not applied. The amp acknowledged the chunks without using them.",
  "invio fallito: {0}":
    "sending failed: {0}",
  "«{0}»: regolazioni senza ampli, sulla copia in libreria.":
    "«{0}»: adjusting without the amp, on the library copy.",
  "mando «{0}» all'ampli per regolarlo…":
    "sending «{0}» to the amp to tweak it…",
  "invio «{0}»: chunk {1} di {2}…":
    "sending «{0}»: chunk {1} of {2}…",
  "invio interrotto: {0}":
    "sending interrupted: {0}",
  "non riesco a rileggere il suono corrente: senza quello l'editor partirebbe da valori che potrebbero non essere quelli veri.":
    "I can't re-read the current sound: without it the editor would start from values that might not be the real ones.",
  "«{0}» è sull'ampli: gira pure.":
    "«{0}» is on the amp: go ahead and turn.",
  "posizione {0}":
    "position {0}",
  "il blocco prima":
    "the previous block",
  "il blocco dopo":
    "the next block",
  "Acustico":
    "Acoustic",
  "Basso":
    "Bass",
  "Suonano solo se l'app ufficiale si è collegata all'ampli almeno una volta da quando è acceso. Altrimenti li vedi in catena ma non li senti.":
    "They only sound if the official app has connected to the amp at least once since it was switched on. Otherwise you see them in the chain but can't hear them.",
  "Procedi":
    "Proceed",
  "Ho capito":
    "Got it",
  "Salva":
    "Save",
  "tocca per mettere un altro modello in questa posizione":
    "tap to put another model in this position",
  "{0} — serve l'ampli: la tua libreria non l'ha mai visto, quindi non sappiamo quante manopole abbia":
    "{0} — needs the amp: your library has never seen it, so we don't know how many knobs it has",
  "fuori dall'elenco Positive Grid":
    "not in the Positive Grid list",
  "senza ampli si può mettere solo un modello che la libreria ha già visto: di quello sappiamo quante manopole ha":
    "without the amp you can only use a model the library has already seen: for that one we know how many knobs it has",
  "non si sente finché l'app ufficiale non lo sblocca":
    "silent until the official app unlocks it",
  "acceso":
    "on",
  "spento":
    "off",
  "tocca per cambiare tipo":
    "tap to change type",
  "valore dell'ampli ({0})":
    "amp value ({0})",
  "«{0}», nome tuo — tocca per cambiarlo":
    "«{0}», your name — tap to change it",
  "«{0}» arriva dalla tabella: gira e senti se torna. Tocca per correggerlo.":
    "«{0}» comes from the table: turn it and hear whether it fits. Tap to correct it.",
  "tocca per dargli un nome: varrà per ogni preset che usa {0}":
    "tap to give it a name: it will apply to every preset that uses {0}",
  "Rimetti quello di partenza":
    "Restore the original",
  "manopola {0} di {1}":
    "knob {0} of {1}",
  "Il nome vale per <strong>ogni preset che usa {0}</strong>, non solo per questo. Gira e senti cosa fa, poi chiamala come la chiami tu.":
    "The name applies to <strong>every preset that uses {0}</strong>, not just this one. Turn it and hear what it does, then call it what you call it.",
  "tono, mix, tempo…":
    "tone, mix, time…",
  "1 parametro che non è una manopola: {0}":
    "1 parameter that isn't a knob: {0}",
  "1 parametro che non è una manopola":
    "1 parameter that isn't a knob",
  "{0} parametri che non sono manopole":
    "{0} parameters that aren't knobs",
  "{0} ha {1} manopole, ma su certi preset l'ampli manda qualche parametro in più. Restano qui, e si possono muovere.":
    "{0} has {1} knobs, but on some presets the amp sends a few extra parameters. They stay here, and can be moved.",
  "«{0}», misurato sull'ampli: sotto la metà il blocco è spento, sopra è acceso. È l'interruttore qui sopra, visto da un'altra parte.":
    "«{0}», measured on the amp: below half the block is off, above it's on. It's the switch up here, seen from another side.",
  "acceso — si cambia dall'interruttore in cima al blocco":
    "on — change it with the switch at the top of the block",
  "spento — si cambia dall'interruttore in cima al blocco":
    "off — change it with the switch at the top of the block",
  "l'editor non è più aperto: riapri «Regola».":
    "the editor is no longer open: reopen «Tweak».",
  "quel blocco non esiste nella catena.":
    "that block doesn't exist in the chain.",
  "{0} c'era già.":
    "{0} was already there.",
  "{0} → {1}, con le stesse manopole. Senza ampli non si sente: si salva in libreria e si prova alla prossima connessione.":
    "{0} → {1}, with the same knobs. Without the amp you can't hear it: it saves to the library and you try it at the next connection.",
  "{0} → {1}, con le manopole che aveva in «{2}». Senza ampli non si sente: si salva in libreria e si prova alla prossima connessione.":
    "{0} → {1}, with the knobs it had in «{2}». Without the amp you can't hear it: it saves to the library and you try it at the next connection.",
  "senza ampli non posso mettere {0}: non so quante manopole abbia. Connetti l'ampli e riapri «Regola».":
    "without the amp I can't use {0}: I don't know how many knobs it has. Connect the amp and reopen «Tweak».",
  "{0} → {1}, con le {2} manopole a metà corsa: la tua libreria non ha nessun preset con quel modello da cui copiarle. Senza ampli non si sente: si salva in libreria e si prova alla prossima connessione.":
    "{0} → {1}, with its {2} knobs at half travel: your library has no preset with that model to copy them from. Without the amp you can't hear it: it saves to the library and you try it at the next connection.",
  "ampli non connesso: il cambio non è partito.":
    "amp not connected: the change didn't go out.",
  "guardo cosa c'è adesso in quel blocco…":
    "checking what's in that block right now…",
  "non riesco a leggere la catena dall'ampli: senza sapere cosa c'è adesso, il cambio partirebbe alla cieca. Se si ripete, chiudi l'editor e riconnetti l'ampli.":
    "I can't read the chain from the amp: without knowing what's there now, the change would go out blind. If it happens again, close the editor and reconnect the amp.",
  "quel blocco non esiste nella catena letta.":
    "that block doesn't exist in the chain that was read.",
  "sostituisco {0} con {1}…":
    "replacing {0} with {1}…",
  "comando mandato, ma non riesco a rileggere la catena: riapri «Regola» per vedere com'è rimasta.":
    "command sent, but I can't re-read the chain: reopen «Tweak» to see how it ended up.",
  "{0} → {1}. Verificato rileggendo la catena dall'ampli.":
    "{0} → {1}. Verified by reading the chain back from the amp.",
  "il comando è partito ma quel blocco riporta ancora {0}: il modello potrebbe non esistere con questo nome.":
    "the command went out but that block still reports {0}: the model may not exist under this name.",
  "cambio modello fallito: {0}":
    "model change failed: {0}",
  "stai regolando la copia in libreria: non c'è nessun ampli da rileggere.":
    "you're adjusting the library copy: there's no amp to re-read.",
  "ampli non connesso: non c'è niente da rileggere.":
    "amp not connected: there's nothing to re-read.",
  "rileggo la catena dall'ampli…":
    "re-reading the chain from the amp…",
  "catena riletta: adesso sullo schermo c'è quello che ha l'ampli.":
    "chain re-read: the screen now shows what the amp has.",
  "non riesco a rileggere la catena: quello che vedi è l'ultima cosa vista.":
    "I can't re-read the chain: what you see is the last thing seen.",
  "✓ Salvato":
    "✓ Saved",
  " in libreria":
    " to library",
  "il preset non è più in libreria.":
    "the preset is no longer in the library.",
  "modifiche salvate su «{0}» in libreria. Sull'ampli il preset salvato non cambia finché non lo riscrivi in uno slot.":
    "changes saved to «{0}» in the library. On the amp the saved preset doesn't change until you write it to a slot again.",
  "modifiche non salvate":
    "unsaved changes",
  "Hai girato qualcosa e <strong>non l'hai ancora salvato in libreria</strong>.":
    "You turned something and <strong>haven't saved it to the library yet</strong>.",
  "Uscendo così vanno perse: senza ampli non sono andate da nessuna parte.":
    "If you leave like this they're lost: without the amp they didn't go anywhere.",
  "Uscendo così le perdi: l'ampli continua a suonarle finché non cambi preset, ma in libreria non ne resta niente.":
    "If you leave like this you lose them: the amp keeps playing them until you change preset, but nothing of them stays in the library.",
  "Salva ed esci":
    "Save and leave",
  "Esci senza salvare":
    "Leave without saving",
  "Torna all'editor":
    "Back to the editor",
  "colore di {0}":
    "colour of {0}",
  "1 preset":
    "1 preset",
  "{0} preset":
    "{0} presets",
  "rimetti il colore di partenza":
    "restore the original colour",
  "Nessuna categoria. Creane una qui sopra, o dal dettaglio di un preset.":
    "No categories. Create one above, or from a preset's details.",
  "elimina la categoria":
    "delete the category",
  "Eliminare la categoria <strong>{0}</strong>?":
    "Delete the category <strong>{0}</strong>?",
  "Non ce l'ha nessun preset.":
    "No preset has it.",
  "La perdono {0} preset, che restano tutti in libreria.":
    "{0} presets lose it, and they all stay in the library.",
  "eliminare la categoria":
    "delete the category",
  "togliere tutte le categorie":
    "remove all categories",
  "Togliere tutte e {0} le categorie? <strong>I preset restano tutti</strong>, perdono solo l'etichetta. Serve a ripartire da zero dopo un import.":
    "Remove all {0} categories? <strong>The presets all stay</strong>, they only lose the label. It's for starting from scratch after an import.",
  "Togli le {0} categorie":
    "Remove the {0} categories",
  "tolte {0} categorie: i preset sono tutti al loro posto":
    "removed {0} categories: the presets are all where they were",
  "Cambiare lingua?":
    "Change language?",
  "La pagina si ricarica e l'ampli si scollega.":
    "The page reloads and the amp disconnects.",
  "Cambia":
    "Change",
  "per {0} serve l'amplificatore: premi CONNETTI in alto e riprova.":
    "to {0} you need the amplifier: press CONNECT at the top and try again.",
  "leggere gli otto slot":
    "read the eight slots",
  "lettura slot {0} di {1}…":
    "reading slot {0} of {1}…",
  "letti {0} preset dall'ampli: {1} nuovi, {2} aggiornati":
    "read {0} presets from the amp: {1} new, {2} updated",
  "lettura interrotta: {0}":
    "reading interrupted: {0}",
  "prendere il suono di adesso":
    "grab the current sound",
  "leggo il suono che l'ampli sta facendo…":
    "reading the sound the amp is making…",
  "suono corrente: «{0}» — {1}":
    "current sound: «{0}» — {1}",
  "<strong>{0}</strong> è già in libreria. Aggiornarne il suono con quello che l'ampli sta suonando adesso? Tag, note e famiglia restano.":
    "<strong>{0}</strong> is already in the library. Update its sound with what the amp is playing right now? Tags, notes and family stay.",
  "Salvare <strong>{0}</strong> in libreria come preset nuovo?":
    "Save <strong>{0}</strong> to the library as a new preset?",
  "aggiornare il suono":
    "update the sound",
  "salvare in libreria":
    "save to the library",
  "Aggiorna il suono":
    "Update the sound",
  "Salva in libreria":
    "Save to library",
  "«{0}» aggiunto alla libreria":
    "«{0}» added to the library",
  "«{0}» aggiornato in libreria":
    "«{0}» updated in the library",
  "non so leggere il suono corrente: payload grezzo scaricato nei Download.":
    "I can't read the current sound: raw payload downloaded to Downloads.",
  "nessuna risposta alla lettura del suono corrente.":
    "no answer when reading the current sound.",
  "aggiunti di recente":
    "recently added",
  "modificati di recente":
    "recently modified",
  "come ordinare la libreria":
    "how to sort the library",
  "importazione fallita: {0}":
    "import failed: {0}",
  "{0} non è né uno zip né un JSON":
    "{0} is neither a zip nor a JSON",
  "importare un backup":
    "import a backup",
  "Mettere in libreria <strong>{0} preset</strong> da <strong>{1}</strong>? I preset che hai già prendono il suono <strong>e anche tag, note e ordine</strong> del file. Non viene cancellato niente.":
    "Put <strong>{0} presets</strong> from <strong>{1}</strong> into the library? The presets you already have take the sound <strong>and also the tags, notes and order</strong> from the file. Nothing is deleted.",
  "Importa il preset":
    "Import the preset",
  "Importa {0} preset":
    "Import {0} presets",
  "importati {0} preset da {1}":
    "imported {0} presets from {1}",
  "in {0} non c'è nessun preset che sappia leggere":
    "there's no preset I can read in {0}",
  "importare il preset":
    "import the preset",
  "importare i preset":
    "import the presets",
  "Mettere in libreria <strong>{0}</strong>?":
    "Put <strong>{0}</strong> into the library?",
  "Mettere in libreria <strong>{0} preset</strong> ({1})?":
    "Put <strong>{0} presets</strong> into the library ({1})?",
  " Se ce l'hai già, se ne aggiorna il suono: tag, note e famiglia restano.":
    " If you already have it, its sound is updated: tags, notes and family stay.",
  "Importa":
    "Import",
  "da {0}: {1} nuovi, {2} aggiornati — {3}":
    "from {0}: {1} new, {2} updated — {3}",
  "{0} preset non portavano un identificativo: gliene ho dato uno io, quindi reimportando lo stesso file se ne fa un doppione.":
    "{0} presets had no identifier: I gave them one, so importing the same file again will make a duplicate.",
  "{0} saltati: {1}":
    "{0} skipped: {1}",
  "leggo {0}…":
    "reading {0}…",
  "{0} preset dal backup dell'app: {1} nuovi, {2} aggiornati":
    "{0} presets from the app's backup: {1} new, {2} updated",
  "le categorie dell'app ufficiale non sono state importate: le tue le fai da «Categorie».":
    "the official app's categories were not imported: make your own from «Categories».",
  "{0} preset saltati: {1}":
    "{0} presets skipped: {1}",
  "controllo cosa c'è su Dropbox…":
    "checking what's on Dropbox…",
  "Lassù: {0}, {1} KB.":
    "Up there: {0}, {1} KB.",
  "Su Dropbox non c'è ancora niente: il primo invio lo crea.":
    "There's nothing on Dropbox yet: the first upload creates it.",
  "non riesco a leggere Dropbox: {0}":
    "I can't read Dropbox: {0}",
  "serve l'app key della tua app Dropbox":
    "the app key of your Dropbox app is needed",
  "autorizza su Dropbox, poi incolla qui il codice":
    "authorise on Dropbox, then paste the code here",
  "il browser ha bloccato la finestra: apri Dropbox col link qui sopra":
    "the browser blocked the window: open Dropbox with the link above",
  "non riesco a partire: {0}":
    "I can't get started: {0}",
  "incolla il codice che ti ha dato Dropbox":
    "paste the code Dropbox gave you",
  "l'autorizzazione è scaduta: ricomincia":
    "the authorisation has expired: start again",
  "Dropbox collegato":
    "Dropbox connected",
  "Dropbox non ha accettato il codice ({0}). Un codice vale una volta sola: riapri Dropbox col link qui sopra e incolla quello nuovo.":
    "Dropbox didn't accept the code ({0}). A code works only once: reopen Dropbox with the link above and paste the new one.",
  "mando la libreria su Dropbox…":
    "sending the library to Dropbox…",
  "{0} preset mandati su Dropbox":
    "{0} presets sent to Dropbox",
  "non sono riuscito a mandarla su: {0}":
    "I couldn't send it up: {0}",
  "prendere da Dropbox":
    "get from Dropbox",
  "Prendere la libreria da Dropbox e fonderla con questa? <strong>Quello che è stato cancellato sull'altro apparecchio sparisce anche qui</strong>, se qui non l'hai toccato dopo.":
    "Get the library from Dropbox and merge it with this one? <strong>Whatever was deleted on the other device disappears here too</strong>, unless you touched it here afterwards.",
  "Prendi e fondi":
    "Get and merge",
  "prendo la libreria da Dropbox…":
    "getting the library from Dropbox…",
  "{0} preset presi da Dropbox":
    "{0} presets taken from Dropbox",
  "non sono riuscito a prenderla: {0}":
    "I couldn't get it: {0}",
  "scollegare Dropbox":
    "disconnect Dropbox",
  "Scollegare Dropbox? La libreria qui e quella lassù restano dove sono: smettono solo di parlarsi.":
    "Disconnect Dropbox? The library here and the one up there stay where they are: they just stop talking to each other.",
  "Scollega":
    "Disconnect",
  "Dropbox scollegato, e l'autorizzazione è revocata anche lassù":
    "Dropbox disconnected, and the authorisation is revoked up there too",
  "Dropbox scollegato qui, ma lassù non ho potuto revocare l'autorizzazione: se vuoi, toglila da dropbox.com, nelle app collegate":
    "Dropbox disconnected here, but I couldn't revoke the authorisation up there: if you like, remove it from dropbox.com, under connected apps",
  "non c'è niente da togliere: in libreria ci sono solo gli otto dell'ampli":
    "there's nothing to remove: the library only holds the amp's eight",
  "svuotare la libreria":
    "empty the library",
  "Eliminare <strong>{0} preset</strong> dalla libreria? Restano solo quelli caricati sull'ampli, e l'ampli non viene toccato.":
    "Delete <strong>{0} presets</strong> from the library? Only the ones loaded on the amp remain, and the amp is not touched.",
  "Elimina {0} preset":
    "Delete {0} presets",
  "ultima conferma":
    "last confirmation",
  "<strong>{0} preset, e non si torna indietro.</strong> Se usi Dropbox, al prossimo «Manda su» spariranno anche dagli altri apparecchi.":
    "<strong>{0} presets, and there's no way back.</strong> If you use Dropbox, at the next «Send to» they'll disappear from the other devices too.",
  "Sì, elimina":
    "Yes, delete",
  "elimino…":
    "deleting…",
  "{0} preset eliminati dalla libreria; gli otto dell'ampli restano":
    "{0} presets deleted from the library; the amp's eight stay",
  "{0} — {1} preset":
    "{0} — {1} presets",
  "nessun banco in libreria":
    "no banks in the library",
  "quale banco mandare":
    "which bank to send",
  "Non hai ancora banchi: creane uno nella vista Live e riempilo.":
    "You don't have any banks yet: create one in the Live view and fill it.",
  "Questo banco è vuoto: mettici dentro dei preset prima di mandarlo.":
    "This bank is empty: put some presets in it before sending it.",
  "Suona":
    "Play",
  "prima aggiorna il pedale":
    "update the pedal first",
  "fai suonare questo banco":
    "play this bank",
  "Togli":
    "Remove",
  "Ci sono spostamenti non ancora applicati al pedale.":
    "There are moves not yet applied to the pedal.",
  "niente da applicare":
    "nothing to apply",
  "applico {0} modifiche…":
    "applying {0} changes…",
  "non collegato al pedale":
    "not connected to the pedal",
  "comando fallito: {0}":
    "command failed: {0}",
  "elenco: {0} slot occupati":
    "list: {0} slots in use",
  "questo browser non parla col Bluetooth":
    "this browser can't talk Bluetooth",
  "ricerca…":
    "searching…",
  "staccato — il pedale si riprende l'ampli da solo":
    "disconnected — the pedal takes the amp back by itself",
  "pedale":
    "pedal",
  "collegato — da adesso il pedale ha mollato l'ampli":
    "connected — from now on the pedal has let go of the amp",
  "connessione fallita: {0}":
    "connection failed: {0}",
  " — se nell'elenco non c'era nessun pedale, apri il ponte: due tasti banco insieme per un secondo e mezzo":
    " — if there was no pedal in the list, open the bridge: both bank buttons together for a second and a half",
  "\"{0}\" → slot {1}: {2} byte in {3} ms":
    "\"{0}\" → slot {1}: {2} bytes in {3} ms",
  "copiato":
    "copied",
  "selezionato, copia a mano":
    "selected, copy it by hand",
  "in quale slot del pedale":
    "which pedal slot",
  "prima apri il ponte sul pedale: tieni premuti insieme i due tasti banco per un secondo e mezzo. Resta aperto due minuti, e il display lo dice":
    "first open the bridge on the pedal: hold both bank buttons together for a second and a half. It stays open for two minutes, and the display says so",
  "questo browser non può parlare col Bluetooth":
    "this browser can't talk to Bluetooth",
  "Su iPhone e iPad <strong>nessun browser può usare il Bluetooth</strong>: su iOS anche Chrome e Firefox girano sul motore di Apple, che non lo prevede — quindi l'amplificatore da qui non si connette. La libreria però funziona tutta: sfogliare, cercare, organizzare, importare ed esportare. Per suonare serve un telefono o un computer con Chrome, Edge o Opera.":
    "On iPhone and iPad <strong>no browser can use Bluetooth</strong>: on iOS even Chrome and Firefox run on Apple's engine, which doesn't support it — so the amplifier can't connect from here. The library still works fully: browsing, searching, organising, importing and exporting. To play you need a phone or computer with Chrome, Edge or Opera.",
  "Questo browser non ha il Bluetooth per le pagine web, quindi l'amplificatore da qui non si connette. La libreria funziona tutta lo stesso. Con Chrome, Edge o Opera aggiornati, su Android o su computer, si connette.":
    "This browser doesn't offer Bluetooth to web pages, so the amplifier can't connect from here. The library still works fully. With an up-to-date Chrome, Edge or Opera, on Android or on a computer, it connects.",
  "Web Bluetooth non disponibile: la libreria resta consultabile, ma non si può leggere dall'ampli.":
    "Web Bluetooth not available: the library can still be browsed, but nothing can be read from the amp.",
  "su Dropbox non c'è ancora nessuna libreria: mandala su tu per primo":
    "there's no library on Dropbox yet: be the first to send one up",
  "l'autorizzazione a Dropbox non vale più: rifalla":
    "the Dropbox authorisation is no longer valid: do it again",
  "lo spazio su Dropbox è finito":
    "your Dropbox space is full",
  "Dropbox chiede di aspettare un momento e riprovare":
    "Dropbox asks to wait a moment and try again",
  "Dropbox non risponde bene: riprova fra poco":
    "Dropbox isn't responding properly: try again shortly",
  "Dropbox ha rifiutato ({0}): {1}":
    "Dropbox refused ({0}): {1}",
  "manca la chiave dell'app Dropbox":
    "the Dropbox app key is missing",
  "Dropbox non ha dato un refresh token: rifai l'autorizzazione":
    "Dropbox didn't provide a refresh token: authorise again",
  "Dropbox non è ancora collegato":
    "Dropbox is not connected yet",
  "atteso intero a {0}, trovato 0x{1}":
    "expected integer at {0}, found 0x{1}",
  "atteso float a {0}, trovato 0x{1}":
    "expected float at {0}, found 0x{1}",
  "atteso booleano a {0}, trovato 0x{1}":
    "expected boolean at {0}, found 0x{1}",
  "attesa stringa a {0}, trovato 0x{1}":
    "expected string at {0}, found 0x{1}",
  "lunghezza dichiarata {0} ma stringa di {1}":
    "declared length {0} but string of {1}",
  "atteso array a {0}, trovato 0x{1}":
    "expected array at {0}, found 0x{1}",
  "servono le impostazioni lette dall'ampli":
    "the settings read from the amp are needed",
  "bpm fuori da {0}–{1}: {2}":
    "bpm outside {0}–{1}: {2}",
  "marcatore inatteso 0x{0} nel parametro {1} di {2}":
    "unexpected marker 0x{0} in parameter {1} of {2}",
  "{0} byte non consumati in coda al preset":
    "{0} bytes left unread at the end of the preset",
  "Noise gate":
    "Noise gate",
  "Comp / Wah":
    "Comp / Wah",
  "Drive":
    "Drive",
  "Modulazione":
    "Modulation",
  "Delay":
    "Delay",
  "Riverbero":
    "Reverb",
  "non è un preset":
    "not a preset",
  "manca l'UUID":
    "the UUID is missing",
  "UUID di {0} caratteri invece di 36":
    "UUID of {0} characters instead of 36",
  "il campo {0} non è testo":
    "the field {0} is not text",
  "i BPM non sono un numero":
    "the BPM is not a number",
  "manca la catena effetti":
    "the effects chain is missing",
  "{0} effetti: oltre i 15 di un fixarray":
    "{0} effects: more than the 15 of a fixarray",
  "{0} effetti invece dei 7 soliti":
    "{0} effects instead of the usual 7",
  "effetto {0}":
    "effect {0}",
  "{0}: non è un effetto":
    "{0}: not an effect",
  "{0}: manca il nome":
    "{0}: the name is missing",
  "{0}: il modello «{1}» non è fra quelli che l'ampli conosce":
    "{0}: the model «{1}» is not one the amp knows",
  "{0}: mancano i parametri":
    "{0}: the parameters are missing",
  "{0}: {1} parametri, oltre i 15 di un fixarray":
    "{0}: {1} parameters, more than the 15 of a fixarray",
  "{0}, parametro {1}":
    "{0}, parameter {1}",
  "{0}: non è un parametro":
    "{0}: not a parameter",
  "{0}: il valore non è un numero ({1})":
    "{0}: the value is not a number ({1})",
  "{0}: valore {1} fuori da 0..1":
    "{0}: value {1} outside 0..1",
  "{0}: indice {1} non valido":
    "{0}: invalid index {1}",
  "la coda contiene un valore non numerico":
    "the tail contains a non-numeric value",
  "Acceso/spento":
    "On/off",
  "Web Bluetooth non disponibile in questo browser":
    "Web Bluetooth is not available in this browser",
  "Ricerca dispositivo…":
    "Searching for device…",
  "connessione persa":
    "connection lost",
  "Disconnesso":
    "Disconnected",
  "Connessione GATT…":
    "GATT connection…",
  "connesso a {0}":
    "connected to {0}",
  "non connesso":
    "not connected",
  "attenzione: messaggio da {0} byte, oltre i {1} verificati — l'ampli potrebbe disconnettersi":
    "warning: {0}-byte message, beyond the {1} verified — the amp might disconnect",
  "errore invio: {0}":
    "send error: {0}",
  "{0} attese annullate: {1}":
    "{0} waits cancelled: {1}",
  "l'ampli non ha mandato le impostazioni: tempo non scritto":
    "the amp didn't send its settings: tempo not written",
  "{0}: nessuna risposta completa ({1} chunk buoni, {2} messaggi arrivati in tutto)":
    "{0}: no complete answer ({1} good chunks, {2} messages received in all)",
  "{0}: errore di parsing — {1} (payload di {2} byte conservato)":
    "{0}: parsing error — {1} ({2}-byte payload kept)",
  "slot {0}: vuoto o non risponde":
    "slot {0}: empty or not responding",
  "invio \"{0}\" → bank {1} numero {2}: {3} byte in {4} chunk, ":
    "sending \"{0}\" → bank {1} number {2}: {3} bytes in {4} chunks, ",
  "seq crescente":
    "increasing seq",
  "seq 0x{0} per tutti":
    "seq 0x{0} for all",
  ", con coda":
    ", with tail",
  "errore GATT al chunk {0} di {1}: {2}":
    "GATT error at chunk {0} of {1}: {2}",
  "inviati tutti i chunk, ma solo {0} confermati su {1}":
    "all chunks sent, but only {0} acknowledged out of {1}",
  "passato al preset software":
    "switched to the software preset",
  "scritto nello slot {0}, con un cambio preset via e ritorno":
    "written to slot {0}, with a preset change away and back",
  "store non aperto: chiama open() prima":
    "store not open: call open() first",
  "banco {0} inesistente":
    "bank {0} does not exist",
  "posto {0} fuori dal banco: ce ne sono {1}":
    "spot {0} outside the bank: there are {1}",
  "preset {0} inesistente":
    "preset {0} does not exist",
  "Senza nome":
    "Untitled",
  "{0} (copia)":
    "{0} (copy)",
  "{0} (copia {1})":
    "{0} (copy {1})",
  "famiglia sconosciuta: {0}":
    "unknown family: {0}",
  "la categoria vuole un nome":
    "the category needs a name",
  "serve sia il vecchio nome sia il nuovo":
    "both the old and the new name are needed",
  "categoria «{0}» inesistente":
    "category «{0}» does not exist",
  "il file non è un backup della libreria":
    "the file is not a library backup",
  "il banco \"{0}\" non ha nemmeno un preset dentro":
    "the bank \"{0}\" doesn't have a single preset in it",
  "\"{0}\" non ha dati sonori":
    "\"{0}\" has no sound data",
  "non sembra un file zip":
    "this doesn't look like a zip file",
  "nessun preset trovato: è il backup dell'app Spark?":
    "no presets found: is this the Spark app's backup?",
  "manca meta.id":
    "meta.id is missing",
  "manca sigpath":
    "sigpath is missing",
  "chiudi":
    "close",
  "Installa l'app sul telefono, per averla a portata dall'ampli.":
    "Install the app on your phone, to have it at hand next to the amp.",
  "Installa":
    "Install",
  "C'è una versione nuova dell'app.":
    "There's a new version of the app.",
  "Aggiorna":
    "Update",
  "suono":
    "sound",
  "Pedali":
    "Pedals",
  "Fine":
    "The end",
  "Un'altra":
    "Again",
  "su":
    "up",
  "sinistra":
    "left",
  "giù":
    "down",
  "destra":
    "right",
  "Col dito sul campo, o coi tasti qui sopra. Frecce e WASD, spazio per la pausa.":
    "Swipe on the field, or use the buttons above. Arrows and WASD, space to pause.",
  "♪ suono":
    "♪ sound",
  "✕ muto":
    "✕ muted",
  "pronti? muovi":
    "ready? move",
  "Sei caduto giù dalla pedaliera.":
    "You fell off the pedalboard.",
  "Ti sei attorcigliato i cavi.":
    "You got tangled in your cables.",
  "+ WAH! ne vale {0}":
    "+ WAH! worth {0}",
  "Pedaliera piena. Non ci sta più niente.":
    "Pedalboard full. Nothing else fits.",
  "un wah! prendilo":
    "a wah! grab it",
  "Fine dei giochi":
    "Game over",
  "Record nuovo!":
    "New record!",
  "1 batteria da 9 volt, {0} pedalini in catena.":
    "1 nine-volt battery, {0} pedals in the chain.",
  "{0} batterie da 9 volt, {1} pedalini in catena.":
    "{0} nine-volt batteries, {1} pedals in the chain.",
  "PAUSA":
    "PAUSE",
  "il wah se n'è andato":
    "the wah is gone",
  "Tipo":
    "Type",
};
