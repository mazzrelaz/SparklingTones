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
  "risposta {0}":
    "response {0}",
  "Non riesco a caricare la guida ({0}).":
    "I can't load the guide ({0}).",
  "Indice della guida":
    "Guide contents",
  "torna ai preset":
    "back to presets",
  "SparklingTones":
    "SparklingTones",
  "prende in libreria il suono che l'ampli sta facendo adesso; l'ampli non viene toccato":
    "adds the sound the amp is making right now to the library; the amp is not touched",
  "Categorie":
    "Categories",
  "Altro":
    "More",
  "Modifica":
    "Edit",
  "Pedale":
    "Pedal",
  "Guida":
    "Guide",
  "Guida all'uso":
    "User guide",
  "Fai una pausa":
    "Take a break",
  "cerca un preset…":
    "search presets…",
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
  "Scegli un preset":
    "Choose a preset",
  "Annulla":
    "Cancel",
  "cerca…":
    "search…",
  "Svuota il posto":
    "Empty the slot",
  "non collegato":
    "not connected",
  "Stacca":
    "Disconnect",
  "Mentre sei collegato al pedale, <em>il pedale ha mollato l'ampli</em> e non suona: è così per scelta, un padrone alla volta. Appena stacchi se lo riprende da solo. I banchi restano nel pedale anche a corrente staccata.":
    "While you're connected to the pedal, <em>the pedal has let go of the amp</em> and doesn't play: that's by design, one master at a time. As soon as you disconnect it takes the amp back by itself. Banks stay in the pedal even with the power off.",
  "Aggiorna il pedale":
    "Update the pedal",
  "collega l'amplificatore via Bluetooth":
    "connect the amplifier over Bluetooth",
  "(senza nome)":
    "(untitled)",
  "rosso":
    "red",
  "verde":
    "green",
  "{0} di {1}":
    "{0} of {1}",
  "Nessun preset corrisponde alla ricerca.":
    "No preset matches the search.",
  "slot {0} — LED {1} numero {2}":
    "slot {0} — LED {1} number {2}",
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
  "＋ nuova…":
    "＋ new…",
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
  "{0} — serve l'ampli: la tua libreria non l'ha mai visto, quindi non sappiamo quante manopole abbia":
    "{0} — needs the amp: your library has never seen it, so we don't know how many knobs it has",
  "fuori dall'elenco Positive Grid":
    "not in the Positive Grid list",
  "non si sente finché l'app ufficiale non lo sblocca":
    "silent until the official app unlocks it",
  "acceso":
    "on",
  "spento":
    "off",
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
  "questo browser non può parlare col Bluetooth":
    "this browser can't talk to Bluetooth",
  "Su iPhone e iPad <strong>Safari e Chrome non possono usare il Bluetooth</strong>, quindi l'amplificatore da qui non si connette. Si connette invece da <strong>Bluefy</strong>, un browser gratuito dell'App Store: aprila lì, a questo stesso indirizzo. Qui la libreria funziona lo stesso: sfogliare, cercare, organizzare, importare ed esportare.":
    "On iPhone and iPad <strong>Safari and Chrome can't use Bluetooth</strong>, so the amplifier can't connect from here. It does connect from <strong>Bluefy</strong>, a free browser on the App Store: open the app there, at this same address. Here the library still works: browsing, searching, organising, importing and exporting.",
  "il browser non ha detto perché":
    "the browser didn't say why",
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
  // 7 ottobre 2026: Doppioni, nomi gia' in libreria, connessione persa, Seleziona CHx
  "Doppioni":
    "Duplicates",
  "I preset che in libreria hanno <strong>lo stesso nome</strong>, uno sotto l'altro: quando sono entrati, se stanno sull'ampli, e se suonano uguale. Scegli tu quali togliere.":
    "Presets in the library with <strong>the same name</strong>, one below the other: when they came in, whether they are on the amp, and whether they sound the same. You choose which to remove.",
  "Cerca i doppioni":
    "Find duplicates",
  "Stesso nome, uno per riga. <strong>Stessa lettera, stesso suono</strong>: due preset con la lettera A suonano identici, uno con la B è un'altra versione. Tag, note e banchi sono di ciascuno: guarda prima di togliere.":
    "Same name, one per row. <strong>Same letter, same sound</strong>: two presets marked A sound identical, one marked B is another version. Tags, notes and banks belong to each one: look before you remove.",
  "collegati da {0} s":
    "connected for {0} s",
  "l'ampli ha parlato l'ultima volta {0} s fa":
    "the amp last spoke {0} s ago",
  "ultimo invio {0} s fa":
    "last send {0} s ago",
  "pagina in secondo piano o schermo spento":
    "page in the background or screen off",
  "connessione chiusa dall'app":
    "connection closed by the app",
  "connessione persa alle {0}: {1}":
    "connection lost at {0}: {1}",
  "nessun dato":
    "no data",
  "{0}: ne aspettavo {1}, mancano i pezzi {2} (dopo {3} ms)":
    "{0}: expected {1}, pieces {2} missing (after {3} ms)",
  "mando {0} all'ampli…":
    "sending {0} to the amp…",
  "chiedo all'ampli cosa ha davanti…":
    "asking the amp what it has loaded…",
  "{0}: errore — {1}":
    "{0}: error — {1}",
  "chiesto {0}: l'ampli {1}, e dice di avere davanti {2}":
    "asked for {0}: the amp {1}, and says it has {2} loaded",
  "ha confermato":
    "confirmed",
  "non ha confermato":
    "did not confirm",
  "il preset mandato dall'app":
    "the preset sent from the app",
  "«{0}» c'è già in libreria: non lo copio. Sull'ampli il suono è diverso, in libreria resta il tuo.":
    "«{0}» is already in the library: not copying it. On the amp the sound is different; the library keeps yours.",
  "«{0}» c'è già in libreria: non lo copio.":
    "«{0}» is already in the library: not copying it.",
  "Nessun doppione: ogni nome compare una volta sola.":
    "No duplicates: every name appears only once.",
  "«{0}», {1} volte":
    "«{0}», {1} times",
  "stessa lettera, stesso suono":
    "same letter, same sound",
  "(catena vuota)":
    "(empty chain)",
  "entrato il {0}":
    "added on {0}",
  "sull'ampli in {0}":
    "on the amp in {0}",
  "{0} tag":
    "{0} tags",
  "con note":
    "with notes",
  "con famiglia":
    "with family",
  "nei banchi: {0}":
    "in banks: {0}",
  " Sta sull'ampli in {0}: l'ampli non viene toccato, e alla prossima lettura quello slot andrà a uno degli altri con lo stesso nome.":
    " It is on the amp in {0}: the amp is not touched, and at the next read that slot will go to one of the others with the same name.",
  "<strong>Sta nei banchi {0}</strong>: quel posto resterà vuoto, e lo riempi tu con uno degli altri.":
    "<strong>It is in banks {0}</strong>: that spot will be left empty, and you fill it with one of the others.",
  "eliminare un doppione":
    "delete a duplicate",
  "Eliminare <strong>{0}</strong>, entrato il {1}? Gli altri con lo stesso nome restano.":
    "Delete <strong>{0}</strong>, added on {1}? The others with the same name stay.",
  "doppione eliminato: «{0}» del {1}":
    "duplicate deleted: «{0}» from {1}",
  "Preset per lo Spark LIVE: {0} esistono solo sul suo canale del microfono. Sullo Spark 2 e sul NEO non si può mandare.":
    "A preset for the Spark LIVE: {0} only exist on its microphone channel. It can't be sent to the Spark 2 or the NEO.",
  "Segnala un problema":
    "Report a problem",
  "Scrivi cosa stavi facendo, cosa è successo e cosa ti aspettavi. Il messaggio parte dalla <strong>tua</strong> posta: l'app non manda niente da sola.":
    "Write what you were doing, what happened and what you expected. The message goes out from <strong>your</strong> email: the app sends nothing by itself.",
  "Cosa è successo…":
    "What happened…",
  "Copia il testo":
    "Copy the text",
  "Manda per email":
    "Send by email",
  "Cosa si aggiunge al messaggio":
    "What gets added to the message",
  "Serve a capire dove cercare: versione dell'app, browser, ampli e le ultime righe del registro. Niente della tua libreria.":
    "It helps to know where to look: app version, browser, amp and the last lines of the log. Nothing from your library.",
  "mai collegato":
    "never connected",
  "collegato":
    "connected",
  "Ultime righe del registro:":
    "Last lines of the log:",
  "Manca la descrizione":
    "The description is missing",
  "Scrivi in due righe cosa è successo.":
    "Write in a couple of lines what happened.",
  "(Il messaggio è lungo: l'ho copiato, incollalo qui.)":
    "(The message is long: it's been copied, paste it here.)",
  "(Il messaggio è troppo lungo per la posta: torna nell'app, premi «Copia il testo» e incollalo qui.)":
    "(The message is too long for email: go back to the app, press «Copy the text» and paste it here.)",
  "Il messaggio è lungo: è negli appunti. Si apre la tua posta, incollalo e premi invia.":
    "The message is long: it is on the clipboard. Your email opens: paste it and press send.",
  "Si apre la tua posta col messaggio già scritto: controlla e premi invia. Se non si apre niente, usa «Copia il testo» e mandalo a {0}.":
    "Your email opens with the message already written: check it and press send. If nothing opens, use «Copy the text» and send it to {0}.",
  "A: {0}":
    "To: {0}",
  "Oggetto: {0}":
    "Subject: {0}",
  "non riesco a copiare":
    "can't copy",
  // 19 ottobre 2026: l'interfaccia del 14-17 ottobre (barra in basso, scheda, Impostazioni, pedale, editor)
  "Rileggi gli slot":
    "Reread the slots",
  "Importa il suono che sta suonando":
    "Import the sound that's playing",
  "HW PRESET":
    "HW PRESETS",
  "cerca un preset":
    "search presets",
  "modifica il banco":
    "edit the bank",
  "Libreria":
    "Library",
  "Impostazioni e backup":
    "Settings and backup",
  "Aiuto":
    "Help",
  "Offrimi un caffè":
    "Buy me a coffee",
  "Preset":
    "Presets",
  "Live":
    "Live",
  "Sfondo":
    "Background",
  "Grigio":
    "Grey",
  "Nero":
    "Black",
  "Pacchetto Jimi Hendrix":
    "Jimi Hendrix pack",
  "Ce l'hai sbloccato sull'ampli? Se no, gli effetti Hendrix e i preset che li usano non si vedono, e il wah è l'Auto Wah gratuito.":
    "Have you unlocked it on the amp? If not, the Hendrix effects and the presets that use them are hidden, and the wah is the free Auto Wah.",
  "Sì":
    "Yes",
  "No":
    "No",
  "Backup":
    "Backup",
  "Si importano i backup di quest'app (.json), il <code>preset_backup.zip</code> dell'app ufficiale e <strong>un preset singolo</strong> esportato da lì. Se ce l'hai già, se ne aggiorna il suono: tag, note e famiglia restano. Un suono che l'ampli sta già facendo non ha bisogno di nessun file: si prende con <strong>«Importa il suono che sta suonando»</strong>, toccando il bollino dell'ampli in alto.":
    "You can import backups from this app (.json), the official app's <code>preset_backup.zip</code> and <strong>a single preset</strong> exported from there. If you already have it, only its sound is updated: tags, notes and family stay. A sound the amp is already making needs no file: take it with <strong>«Import the sound that's playing»</strong>, by tapping the amp badge at the top.",
  "Per suono":
    "By sound",
  "Per nome":
    "By name",
  "Preset con <strong>le stesse impostazioni</strong>, qualunque nome abbiano: stessi effetti nello stesso ordine, accesi e spenti uguali, stesse manopole e stesso tempo. Tag, note e banchi sono di ciascuno: guarda prima di togliere.":
    "Presets with <strong>the same settings</strong>, whatever their name: the same effects in the same order, switched on and off the same way, the same knobs and the same tempo. Tags, notes and banks belong to each one: look before you remove.",
  "Si sente <strong>subito</strong>; in libreria non si salva niente finché non premi «Salva». Un tocco su un blocco della catena lo apre qui sotto; <strong>due tocchi</strong> cambiano il modello.":
    "You hear it <strong>straight away</strong>; nothing is saved to the library until you press «Save». One tap on a block of the chain opens it below; <strong>two taps</strong> change the model.",
  "Le manopole si girano sul disegno <strong>trascinando in su o in giù</strong>, non in cerchio. L'interruttore del disegno, la levetta ON/OFF o il footswitch, accende e spegne il blocco.":
    "Turn the knobs on the drawing by <strong>dragging up or down</strong>, not in a circle. The switch on the drawing, the ON/OFF toggle or the footswitch, turns the block on and off.",
  "Pedale SparklingTones":
    "SparklingTones pedal",
  "Cerca":
    "Search",
  "Prima apri il ponte sul pedale: tieni premuti insieme i due tasti banco per un secondo e mezzo.":
    "First open the bridge on the pedal: hold both bank buttons together for a second and a half.",
  "Il ponte resta aperto due minuti, e il display lo dice. Finché è chiuso il pedale non si annuncia, e qui non compare: serve a non far collegare chiunque passi, che gli farebbe mollare l'ampli.":
    "The bridge stays open for two minutes, and the display says so. While it's closed the pedal doesn't advertise itself and doesn't show up here: that stops anyone passing by from connecting and making it let go of the amp.",
  "Manda un banco":
    "Send a bank",
  "Manda al pedale":
    "Send to the pedal",
  "Nel pedale":
    "In the pedal",
  "Aggiorna tutti":
    "Update all",
  "▶ fa suonare subito quel banco. Spostare e togliere, dal ⋯ di ogni banco, cambiano il pedale solo quando premi «Aggiorna il pedale».":
    "▶ plays that bank straight away. Moving and removing, from each bank's ⋯, only change the pedal when you press «Update the pedal».",
  "Copia il log del pedale":
    "Copy the pedal log",
  "tocca per rileggere gli slot, importare il suono o scollegarti":
    "tap to reread the slots, import the sound or disconnect",
  "ordine: {0}":
    "order: {0}",
  "cerca fra {0} preset":
    "search {0} presets",
  "Nessun preset oltre a quelli sull'ampli. Collega l'ampli e i suoi si leggono da soli, oppure importa un backup da «Altro» → «Impostazioni e backup».":
    "No presets besides the ones on the amp. Connect the amp and its presets are read automatically, or import a backup from «More» → «Settings and backup».",
  "tutti":
    "all",
  "Collega l'ampli per vedere i suoi preset":
    "Connect the amp to see its presets",
  "suona":
    "play",
  "rinomina":
    "rename",
  "Il nuovo nome del preset.":
    "The preset's new name.",
  "Rinomina":
    "Rename",
  "Metti in uno slot":
    "Put in a slot",
  "Nel banco live":
    "Add to live bank",
  "Famiglia":
    "Family",
  "nessuna":
    "none",
  "Come si chiama? La userai per filtrare la libreria dalle pastiglie sopra l'elenco.":
    "What's it called? You'll use it to filter the library with the chips above the list.",
  "Note":
    "Notes",
  "Auto Wah":
    "Auto Wah",
  "spegni":
    "switch off",
  "accendi":
    "switch on",
  "Auto Wah Mode":
    "Auto Wah Mode",
  "Auto Detect":
    "Auto Detect",
  "Salvato":
    "Saved",
  "per {0} serve l'amplificatore: tocca «Collega» in alto e riprova.":
    "{0} needs the amp: tap «Connect» at the top and try again.",
  "Nessun doppione: non ci sono due preset con le stesse impostazioni.":
    "No duplicates: there are no two presets with the same settings.",
  "Stesso suono, {0} preset":
    "Same sound, {0} presets",
  "(tutti gli effetti spenti)":
    "(all effects off)",
  " Sta sull'ampli in {0}: l'ampli non viene toccato, e alla prossima lettura tornerà in libreria.":
    " It's on the amp in {0}: the amp is not touched, and it will come back to the library the next time the slots are read.",
  "Eliminare <strong>{0}</strong>, entrato il {1}? Gli altri con lo stesso suono restano.":
    "Delete <strong>{0}</strong>, added on {1}? The others with the same sound stay.",
  "da aggiornare sul pedale: {0}":
    "to update on the pedal: {0}",
  "«{0}» è cambiato nell'app: collegati al pedale e aggiornalo.":
    "«{0}» has changed in the app: connect to the pedal and update it.",
  "{0} banchi sono cambiati nell'app ({1}): collegati al pedale e aggiornali.":
    "{0} banks have changed in the app ({1}): connect to the pedal and update them.",
  "collegato: {0}":
    "connected: {0}",
  "cambiato nell'app":
    "changed in the app",
  "rimanda «{0}» al pedale, così com'è adesso nell'app":
    "send «{0}» to the pedal again, as it is in the app now",
  "altre azioni":
    "more actions",
  "Sposta su":
    "Move up",
  "Sposta giù":
    "Move down",
  "Togli dal pedale":
    "Remove from the pedal",
  "banco {0} del pedale — {1}":
    "pedal bank {0} — {1}",
  "{0} banchi sono cambiati nell'app":
    "{0} banks have changed in the app",
  "Tuner":
    "Tuner",
  "accordatore acceso: l'ampli tace finché non esci":
    "tuner on: the amp stays silent until you leave",
  "accordatore spento":
    "tuner off",
  "Collega l'ampli":
    "Connect the amp",
  "Editor":
    "Editor",
  "Neon, coi disegni dei pedali, o classico: l'ampli sullo sfondo e le manopole grandi.":
    "Neon, with drawings of the pedals, or classic: the amp in the background and big knobs.",
  "Neon":
    "Neon",
  "Classico":
    "Classic",
  "Fai un backup di sicurezza":
    "Make a safety backup",
  "Ripristina il backup di sicurezza":
    "Restore the safety backup",
  "Toglie dalla libreria tutti i preset <strong>tranne gli otto caricati sull'ampli</strong>, che restano coi loro tag e le loro note. L'ampli non viene toccato. Con Dropbox collegato spariscono anche di là.":
    "Removes every preset from the library <strong>except the eight loaded on the amp</strong>, which keep their tags and notes. The amp is not touched. With Dropbox connected they disappear from there too.",
  "il file su Dropbox non è una libreria":
    "the file on Dropbox is not a library",
  "al posto di «{0}» in {1}":
    "in place of «{0}» in {1}",
  "cambiare il preset di uno slot":
    "change a slot's preset",
  "Scrivere <strong>{0}</strong> in {1} al posto di <strong>{2}</strong>? «{2}» resta in libreria e ricompare nella lista qui sotto.":
    "Write <strong>{0}</strong> to {1} in place of <strong>{2}</strong>? «{2}» stays in the library and reappears in the list below.",
  "mette un altro preset in questo slot; questo resta in libreria":
    "puts another preset in this slot; this one stays in the library",
  "cancellare anche qui":
    "delete here too",
  "Sull'altro apparecchio sono stati cancellati <strong>{0} preset</strong>, fra cui {1}. Cancellarli anche qui? Se rispondi di no restano, e tornano anche di là.":
    "<strong>{0} presets</strong> were deleted on the other device, including {1}. Delete them here too? If you say no they stay, and come back over there as well.",
  "Cancella {0} preset":
    "Delete {0} presets",
  "{0} nuovi":
    "{0} new",
  "{0} cambiati":
    "{0} changed",
  "{0} cancellati":
    "{0} deleted",
  "dall'altro apparecchio: {0}":
    "from the other device: {0}",
  "allineo la libreria con Dropbox…":
    "syncing the library with Dropbox…",
  "Libreria allineata con Dropbox alle {0}.":
    "Library synced with Dropbox at {0}.",
  "Senza rete: le modifiche partono quando torna.":
    "No network: changes will go out when it's back.",
  "Il sync con Dropbox si è fermato: {0}":
    "Dropbox sync has stopped: {0}",
  "Backup di sicurezza del {0}.":
    "Safety backup of {0}.",
  "Nessun backup di sicurezza.":
    "No safety backup.",
  "backup di sicurezza":
    "safety backup",
  "Sostituire il backup di sicurezza del {0} con la libreria di adesso, <strong>{1} preset</strong>?":
    "Replace the safety backup of {0} with the current library, <strong>{1} presets</strong>?",
  "Mettere da parte su Dropbox la libreria di adesso, <strong>{0} preset</strong>?":
    "Put the current library aside on Dropbox, <strong>{0} presets</strong>?",
  "Fai il backup":
    "Back up",
  "faccio il backup di sicurezza…":
    "making the safety backup…",
  "backup di sicurezza fatto: {0} preset":
    "safety backup done: {0} presets",
  "non sono riuscito a fare il backup: {0}":
    "couldn't make the backup: {0}",
  "nessun backup di sicurezza":
    "no safety backup",
  "Su Dropbox non c'è ancora un backup di sicurezza.":
    "There is no safety backup on Dropbox yet.",
  "ripristinare il backup di sicurezza":
    "restore the safety backup",
  "Rimettere in libreria i <strong>{0} preset</strong> del backup di sicurezza del {1}? Quelli che hai già tornano come erano allora. Non viene cancellato niente.":
    "Put the <strong>{0} presets</strong> of the safety backup of {1} back into the library? The ones you already have go back to how they were then. Nothing is deleted.",
  "Ripristina":
    "Restore",
  "rimetto il backup di sicurezza…":
    "restoring the safety backup…",
  "{0} preset rimessi dal backup di sicurezza":
    "{0} presets restored from the safety backup",
  "non sono riuscito a rimetterlo: {0}":
    "couldn't restore it: {0}",
  "<strong>{0} preset, e non si torna indietro.</strong> Con Dropbox collegato spariscono anche dagli altri apparecchi.":
    "<strong>{0} presets, and there's no going back.</strong> With Dropbox connected they disappear from your other devices too.",
  "Genera con l'IA":
    "Generate with AI",
  "Rileggi dall'ampli il suono che sta facendo":
    "Read back from the amp the sound it's making",
  "Il tempo del preset: gli effetti a tempo lo seguono":
    "The preset's tempo: tempo-synced effects follow it",
  "BPM":
    "BPM",
  "Menu":
    "Menu",
  "Salva…":
    "Save…",
  "Ripeti":
    "Redo",
  "Confronta con il preset salvato":
    "Compare with the saved preset",
  "A/B":
    "A/B",
  "Esporta il preset":
    "Export the preset",
  "Esporta":
    "Export",
  "Slot prima":
    "Previous slot",
  "Slot dopo":
    "Next slot",
  "modificato · non salvato":
    "modified · not saved",
  "I banchi, come le Songlist":
    "Banks, like Songlists",
  "Banchi":
    "Banks",
  "Il pedale SparklingTones":
    "The SparklingTones pedal",
  "L'accordatore dell'ampli":
    "The amp's tuner",
  "Acceso / spento":
    "On / off",
  "Cerca modello…":
    "Search model…",
  "Catena":
    "Chain",
  "<b></b>IN":
    "<b></b>IN",
  "<b></b>OUT":
    "<b></b>OUT",
  "Chiudi":
    "Close",
  "Parametro {0}":
    "Parameter {0}",
  "Questo browser non ha il Bluetooth per le pagine web. Apri questa pagina con <b>Chrome</b> o <b>Edge</b> aggiornati.":
    "This browser has no Bluetooth for web pages. Open this page with an up-to-date <b>Chrome</b> or <b>Edge</b>.",
  "Sto leggendo l'ampli…":
    "Reading the amp…",
  "senza ampli":
    "no amp",
  "software":
    "software",
  "copia in libreria: non si sente niente":
    "library copy: you won't hear anything",
  "lo slot dell'ampli da cui viene":
    "the amp slot it comes from",
  "il preset software dell'ampli":
    "the amp's software preset",
  "ascolti il preset salvato":
    "you're hearing the saved preset",
  "ispirato a {0}":
    "inspired by {0}",
  "acceso / spento":
    "on / off",
  "sul palco":
    "on stage",
  "senza ampli non posso mettere {0}: non so quante manopole abbia.":
    "without the amp I can't put in {0}: I don't know how many knobs it has.",
  "{0} → {1}, con le manopole che aveva in «{2}». Senza ampli non si sente.":
    "{0} → {1}, with the knobs it had in «{2}». Without the amp you won't hear it.",
  "{0} → {1}. Senza ampli non si sente.":
    "{0} → {1}. Without the amp you won't hear it.",
  "ampli non collegato: il cambio non è partito.":
    "amp not connected: the change wasn't sent.",
  "non riesco a leggere la catena dall'ampli: il cambio non è partito.":
    "I can't read the chain from the amp: the change wasn't sent.",
  "comando mandato, ma non riesco a rileggere la catena.":
    "command sent, but I can't read the chain back.",
  "il comando è partito ma quel blocco riporta ancora {0}.":
    "the command was sent but that block still shows {0}.",
  "Collegato":
    "Connected",
  "collego…":
    "connecting…",
  "scollega l'ampli":
    "disconnect the amp",
  "l'ampli si è scollegato: le modifiche restano qui, salvale in libreria.":
    "the amp has disconnected: your changes stay here, save them to the library.",
  "Hai delle modifiche non salvate: restano sullo schermo, ma l'ampli non le riceverà più. Scollegare?":
    "You have unsaved changes: they stay on screen, but the amp won't receive them any more. Disconnect?",
  "Scollegare l'ampli?":
    "Disconnect the amp?",
  "scollegare":
    "disconnect",
  "niente Bluetooth":
    "no Bluetooth",
  "Questo browser non ha il Bluetooth per le pagine web: apri la pagina con Chrome o Edge aggiornati.":
    "This browser has no Bluetooth for web pages: open the page with an up-to-date Chrome or Edge.",
  "letti {0} slot dall'ampli":
    "read {0} slots from the amp",
  ", {0} nuovi in libreria":
    ", {0} new in the library",
  " ({0} con un nome che c'era già: non copiati)":
    " ({0} with a name already there: not copied)",
  "non riesco a rileggere il suono corrente: riprova con ⟳.":
    "I can't read back the current sound: try again with ⟳.",
  "di {0} non so niente: collega l'ampli per leggerlo.":
    "I know nothing about {0}: connect the amp to read it.",
  "«{0}» — {1}":
    "«{0}» — {1}",
  "non si può mandare":
    "can't be sent",
  "«{0}» non è mandabile così com'è: {1}.":
    "«{0}» can't be sent as it is: {1}.",
  "non riesco a rileggere il suono corrente.":
    "I can't read back the current sound.",
  "Hai girato qualcosa in <strong>{0}</strong> e non l'hai ancora salvato.":
    "You've changed something in <strong>{0}</strong> and haven't saved it yet.",
  "Andando avanti così le modifiche vanno perse.":
    "If you go on, the changes are lost.",
  "Andando avanti così le perdi: in libreria e negli slot non ne resta niente.":
    "If you go on, you lose them: nothing of them is left in the library or in the slots.",
  "Torna al preset":
    "Back to the preset",
  "slot prima":
    "previous slot",
  "ultimo slot":
    "last slot",
  "slot dopo":
    "next slot",
  "primo slot":
    "first slot",
  "rileggere dall'ampli":
    "read back from the amp",
  "Rileggendo, sullo schermo torna quello che l'ampli sta suonando adesso. Le modifiche non salvate restano sull'ampli finché non cambi preset, ma qui spariscono.":
    "Reading back puts on screen what the amp is playing right now. Unsaved changes stay on the amp until you change preset, but they disappear from here.",
  "Rileggi":
    "Read back",
  "No, solo in libreria":
    "No, library only",
  "Salva come nuovo":
    "Save as new",
  "salvare il preset":
    "save the preset",
  "nome del preset":
    "preset name",
  "manca il nome":
    "name missing",
  "Scrivi un nome per il preset.":
    "Type a name for the preset.",
  "nome già usato":
    "name already used",
  "In libreria c'è già un preset che si chiama <strong>{0}</strong>: scegli un altro nome.":
    "There's already a preset called <strong>{0}</strong> in the library: choose another name.",
  "salvataggio fallito: {0}":
    "saving failed: {0}",
  "«{0}» salvato in libreria.":
    "«{0}» saved to the library.",
  "«{0}» non si può scrivere sull'ampli: {1}":
    "«{0}» can't be written to the amp: {1}",
  "scrivo «{0}» in {1}: chunk {2} di {3}…":
    "writing «{0}» to {1}: chunk {2} of {3}…",
  "scrittura interrotta: {0}. Rileggi per controllare.":
    "writing interrupted: {0}. Read back to check.",
  "«{0}» è in {1}. Verificato rileggendo lo slot.":
    "«{0}» is in {1}. Verified by reading the slot back.",
  "in libreria è salvato, ma {0} riporta ancora «{1}»: lo slot non è cambiato.":
    "it's saved in the library, but {0} still shows «{1}»: the slot hasn't changed.",
  "«{0}» esportato nei Download.":
    "«{0}» exported to Downloads.",
  "importare il backup dell'app ufficiale":
    "import the official app's backup",
  "Mettere in libreria <strong>{0} preset</strong> da <strong>{1}</strong>? Quelli che hai già prendono il suono nuovo; tag, note e famiglia restano.":
    "Add <strong>{0} presets</strong> from <strong>{1}</strong> to the library? The ones you already have take the new sound; tags, notes and family stay.",
  "{0} preset dal backup: {1} nuovi, {2} aggiornati{3}. Li trovi nell'app.":
    "{0} presets from the backup: {1} new, {2} updated{3}. You'll find them in the app.",
  ", {0} saltati":
    ", {0} skipped",
  "importare":
    "import",
  "Mettere in libreria <strong>{0}</strong> e aprirlo qui? Se ce l'hai già, ne prende suono, tag e note.":
    "Add <strong>{0}</strong> to the library and open it here? If you already have it, it takes its sound, tags and notes.",
  "Importa e apri":
    "Import and open",
  "nessun preset leggibile":
    "no readable preset",
  "Mettere in libreria <strong>{0}</strong> e aprirlo qui? Se ce l'hai già, se ne aggiorna il suono.":
    "Add <strong>{0}</strong> to the library and open it here? If you already have it, its sound is updated.",
  "Mettere in libreria <strong>{0} preset</strong>? Quelli che hai già prendono il suono nuovo.":
    "Add <strong>{0} presets</strong> to the library? The ones you already have take the new sound.",
  "da {0}: {1} nuovi, {2} aggiornati":
    "from {0}: {1} new, {2} updated",
  "{0} preset scaricati nei Download.":
    "{0} presets downloaded to Downloads.",
  "Dropbox scollegato.":
    "Dropbox disconnected.",
  "Dropbox scollegato qui; lassù toglilo da dropbox.com, nelle app collegate.":
    "Dropbox disconnected here; on Dropbox's side, remove it at dropbox.com, under connected apps.",
  "Dropbox collegato.":
    "Dropbox connected.",
  "Dropbox non ha accettato il codice ({0}). Un codice vale una volta sola: riapri la pagina e incolla quello nuovo.":
    "Dropbox didn't accept the code ({0}). A code works only once: reopen the page and paste the new one.",
  "Backup e Dropbox":
    "Backup and Dropbox",
  "Impostazioni":
    "Settings",
  "serve l'ampli":
    "the amp is needed",
  "Premi «Collega» in alto e riprova.":
    "Press «Connect» at the top and try again.",
  "Cosa è successo:":
    "What happened:",
  "ultime righe del registro":
    "last lines of the log",
  "Rileggi gli slot dell'ampli":
    "Read the amp's slots again",
  "Prendi in libreria il suono dell'ampli":
    "Add the amp's sound to the library",
  "Categorie e famiglie…":
    "Categories and families…",
  "Doppioni…":
    "Duplicates…",
  "Backup e Dropbox…":
    "Backup and Dropbox…",
  "Elimina tutti i preset…":
    "Delete all presets…",
  "Impostazioni…":
    "Settings…",
  "Apri l'app per il telefono":
    "Open the phone app",
  "famiglia":
    "family",
  "tutte le famiglie":
    "all families",
  "categoria":
    "category",
  "tutte le categorie":
    "all categories",
  "non ancora letto":
    "not read yet",
  "Sull'ampli":
    "On the amp",
  "ultima lettura":
    "last read",
  "Seleziona {0} e apri":
    "Select {0} and open",
  "Suona e apri":
    "Play and open",
  "Metti in uno slot…":
    "Put in a slot…",
  "Nel banco…":
    "To a bank…",
  "Rinomina…":
    "Rename…",
  "Famiglia…":
    "Family…",
  "Categorie…":
    "Categories…",
  "Note…":
    "Notes…",
  "Cambia…":
    "Change…",
  "Elimina dalla libreria":
    "Delete from the library",
  "Per cambiare il preset di uno slot serve l'amplificatore: premi «Collega» in alto e riprova.":
    "To change a slot's preset you need the amplifier: press «Connect» at the top and try again.",
  "Scrivere <strong>{0}</strong> in {1} al posto di <strong>{2}</strong>? «{2}» resta in libreria e ricompare fra gli altri preset.":
    "Write <strong>{0}</strong> to {1} in place of <strong>{2}</strong>? «{2}» stays in the library and reappears among the other presets.",
  "Per scrivere in uno slot serve l'amplificatore: premi «Collega» in alto e riprova.":
    "To write to a slot you need the amplifier: press «Connect» at the top and try again.",
  "Scrivi":
    "Write",
  "nessun banco":
    "no banks",
  "Non hai ancora banchi: creane uno in «Banchi», nella barra in alto.":
    "You have no banks yet: create one in «Banks», in the top bar.",
  "<strong>{0}</strong> ha tutti e otto i posti occupati: liberane uno in «Banchi».":
    "<strong>{0}</strong> has all eight places taken: free one in «Banks».",
  "In libreria c'è già un preset che si chiama <strong>{0}</strong>.":
    "There's already a preset called <strong>{0}</strong> in the library.",
  "rinominato in «{0}»":
    "renamed to «{0}»",
  "categorie di «{0}»":
    "categories of «{0}»",
  "note di «{0}»":
    "notes of «{0}»",
  "Salva le note":
    "Save the notes",
  "note salvate":
    "notes saved",
  "categoria «{0}» eliminata: {1} preset la perdono, e restano in libreria":
    "category «{0}» deleted: {1} presets lose it, and stay in the library",
  "Togliere tutte e {0} le categorie? <strong>I preset restano tutti</strong>, perdono solo l'etichetta.":
    "Remove all {0} categories? <strong>All the presets stay</strong>, they only lose the label.",
  "Categorie e famiglie":
    "Categories and families",
  "Sta sull'ampli in {0}: l'ampli non viene toccato.":
    "It's on the amp in {0}: the amp is not touched.",
  "<strong>Sta nei banchi {0}</strong>: quel posto resterà vuoto.":
    "<strong>It's in the banks {0}</strong>: that place will be left empty.",
  "Eliminare <strong>{0}</strong>, entrato il {1}? Gli altri restano.":
    "Delete <strong>{0}</strong>, added on {1}? The others stay.",
  "niente da togliere":
    "nothing to remove",
  "In libreria ci sono solo i preset dell'ampli.":
    "The library holds only the amp's presets.",
  "{0} preset eliminati dalla libreria; quelli dell'ampli restano":
    "{0} presets deleted from the library; the amp's ones stay",
  "<p><strong>SparklingTones</strong> organizza i preset di un amplificatore Spark 2 e li manda\n    all'amplificatore via Bluetooth. Gira per intero dentro il browser: non c'è un server, non c'è un account, e la\n    libreria resta sull'apparecchio che stai usando.</p><p>Scritto da <strong>Massimo Togni</strong>.</p>\n    <h3>Uso libero</h3><p>Questo software è di <strong>libero utilizzo</strong>: si può usare, copiare, modificare e\n    ridistribuire, alle condizioni della licenza MIT, di cui trovi il testo nel file <code>LICENSE</code> insieme al codice.</p>\n    <h3>Nessuna garanzia, nessuna responsabilità</h3><p>Il software è fornito <strong>«così com'è»</strong>, senza garanzie\n    di alcun tipo, esplicite o implicite. <strong>L'autore non si assume alcuna responsabilità</strong> per danni diretti o\n    indiretti derivanti dall'uso di questo software: fra questi la perdita o l'alterazione dei preset salvati nell'amplificatore\n    o nella libreria, malfunzionamenti dell'apparecchio, e qualunque conseguenza di un comando mandato via Bluetooth.\n    <strong>Lo usi a tuo rischio.</strong></p><p>Scrivere un preset in uno slot <strong>sovrascrive</strong> quello che c'era,\n    e un amplificatore può smettere di rispondere e richiedere di essere spento e riacceso. Tieni un backup dei preset a cui tieni.</p>\n    <h3>Nessun rapporto con Positive Grid</h3><p>Questo software è un progetto indipendente e <strong>non ha alcun rapporto con\n    Positive Grid Inc.</strong>: non è prodotto, approvato, sponsorizzato, verificato né supportato da Positive Grid, e non ne usa\n    codice. «Positive Grid» e «Spark» sono marchi dei rispettivi titolari, citati unicamente per indicare con quale apparecchio\n    questo software funziona.</p>\n    <h3>Su cosa è stato provato</h3><p>Provato <strong>solo su Spark 2</strong>, e su un solo esemplare. Il protocollo è stato\n    ricostruito osservando l'apparecchio, non è documentazione ufficiale.</p>\n    <h3>Cosa esce da qui</h3><p>Niente. Nessun dato viene raccolto né inviato: l'unica cosa che il programma comunica sono i\n    comandi all'amplificatore e al pedale, via Bluetooth, e — solo se lo colleghi tu — il backup sul tuo Dropbox.</p>\n    <h3>Grazie a, e licenze</h3><p><strong>Soundshed</strong> — <em>licenza MIT</em>. Da lì vengono i nomi in chiaro degli\n    effetti e delle loro manopole: <code>sparkFxCatalog.ts</code>, Copyright (c) Soundshed contributors.\n    <a href=\"https://github.com/soundshed/soundshed-app\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/soundshed/soundshed-app</a></p>\n    <p><strong>paulhamsh/Spark</strong> — <em>licenza Apache 2.0</em>. Il riferimento funzionante da cui è stata capita la\n    struttura dei messaggi. <a href=\"https://github.com/paulhamsh/Spark\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/paulhamsh/Spark</a></p>\n    <p>I nomi dei modelli di riverbero e degli altri modelli sono quelli che si leggono nell'app ufficiale, trascritti a mano per\n    poterli riconoscere: sono citazioni, non codice.</p>":
    "<p><strong>SparklingTones</strong> organises the presets of a Spark 2 amplifier and sends them\n    to the amp over Bluetooth. It runs entirely inside the browser: there is no server, no account, and the\n    library stays on the device you are using.</p><p>Written by <strong>Massimo Togni</strong>.</p>\n    <h3>Free to use</h3><p>This software is <strong>free to use</strong>: you may use, copy, modify and\n    redistribute it under the terms of the MIT licence, whose text you'll find in the <code>LICENSE</code> file together with the code.</p>\n    <h3>No warranty, no liability</h3><p>The software is provided <strong>«as is»</strong>, without warranty\n    of any kind, express or implied. <strong>The author accepts no liability</strong> for direct or\n    indirect damage arising from the use of this software: including the loss or alteration of presets saved on the amplifier\n    or in the library, malfunctions of the device, and any consequence of a command sent over Bluetooth.\n    <strong>You use it at your own risk.</strong></p><p>Writing a preset to a slot <strong>overwrites</strong> what was there,\n    and an amplifier may stop responding and need to be switched off and on again. Keep a backup of the presets you care about.</p>\n    <h3>No affiliation with Positive Grid</h3><p>This software is an independent project and <strong>has no affiliation with\n    Positive Grid Inc.</strong>: it is not made, approved, sponsored, verified or supported by Positive Grid, and uses none of its\n    code. «Positive Grid» and «Spark» are trademarks of their respective owners, mentioned only to indicate which device\n    this software works with.</p>\n    <h3>What it has been tested on</h3><p>Tested <strong>only on Spark 2</strong>, and on a single unit. The protocol was\n    reconstructed by observing the device; it is not official documentation.</p>\n    <h3>What leaves this app</h3><p>Nothing. No data is collected or sent: the only things the program communicates are the\n    commands to the amplifier and to the pedal, over Bluetooth, and — only if you connect it — the backup to your Dropbox.</p>\n    <h3>Thanks, and licences</h3><p><strong>Soundshed</strong> — <em>MIT licence</em>. The plain names of the\n    effects and their knobs come from there: <code>sparkFxCatalog.ts</code>, Copyright (c) Soundshed contributors.\n    <a href=\"https://github.com/soundshed/soundshed-app\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/soundshed/soundshed-app</a></p>\n    <p><strong>paulhamsh/Spark</strong> — <em>Apache 2.0 licence</em>. The working reference from which the\n    structure of the messages was understood. <a href=\"https://github.com/paulhamsh/Spark\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/paulhamsh/Spark</a></p>\n    <p>The names of the reverb models and of the other models are the ones shown in the official app, transcribed by hand so\n    they can be recognised: they are quotations, not code.</p>",
  "＋ nuovo banco":
    "＋ new bank",
  "rinomina o elimina il banco":
    "rename or delete the bank",
  "gli slot dell'ampli: sempre istantanei. Si cambiano scrivendo un preset in uno slot.":
    "the amp's slots: always instant. You change them by writing a preset to a slot.",
  "togli dal banco (il preset resta in libreria)":
    "remove from the bank (the preset stays in the library)",
  "Manda al pedale…":
    "Send to the pedal…",
  "banco":
    "bank",
  "eliminare il banco":
    "delete the bank",
  "Eliminare il banco <strong>{0}</strong>? I preset restano in libreria.":
    "Delete the bank <strong>{0}</strong>? The presets stay in the library.",
  "<strong>{0}</strong> ha tutti e otto i posti occupati: lascialo su un posto per sostituirlo.":
    "<strong>{0}</strong> has all eight places taken: drop it on a place to replace it.",
  "nessun banco: creane uno in «Banchi»":
    "no banks: create one in «Banks»",
  "slot {0}":
    "slot {0}",
  "ampli non collegato":
    "amp not connected",
  "ampli finto: niente parla col Bluetooth":
    "fake amp: nothing talks to Bluetooth",
  "questo browser non ha il Bluetooth per le pagine web: usa Chrome o Edge":
    "this browser has no Bluetooth for web pages: use Chrome or Edge",
  "nella risposta non c'è un preset: incollala intera.":
    "there's no preset in the reply: paste all of it.",
  "la risposta non è un preset leggibile: incollala intera, dal primo «{» all'ultimo «}».":
    "the reply isn't a readable preset: paste all of it, from the first «{» to the last «}».",
  "Preset IA":
    "AI preset",
  "{0}: modello non valido, resta quello di partenza":
    "{0}: invalid model, the starting one stays",
  "serve un preset da cui partire":
    "a preset to start from is needed",
  "In libreria non c'è ancora un preset letto dall'ampli: premi «Collega», i suoi slot si leggono da soli.":
    "There's no preset read from the amp in the library yet: press «Connect», its slots are read automatically.",
  "manca la descrizione":
    "description missing",
  "copiata":
    "copied",
  "copiala da qui sotto":
    "copy it from below",
  "Metti sul palco":
    "Put on stage",
  "la risposta non va":
    "the reply doesn't work",
  "«{0}» dall'IA, partendo da «{1}»":
    "«{0}» from AI, starting from «{1}»",
  "Nessun modello":
    "No model",
  "Anche nello slot dell'ampli":
    "Also in the amp's slot",
  "Sul PC":
    "On the PC",
  "Scarica il backup":
    "Download the backup",
  "Ripristina da un file…":
    "Restore from a file…",
  "Collegato.":
    "Connected.",
  "Collega Dropbox":
    "Connect Dropbox",
  "Apri Dropbox":
    "Open Dropbox",
  "codice":
    "code",
  "Nessuna categoria.":
    "No categories.",
  "Nuovo banco":
    "New bank",
  "Registro":
    "Log",
  "che suono vuoi":
    "the sound you want",
  "Copia la domanda":
    "Copy the request",
  "La risposta":
    "The reply",
  "incolla qui la risposta":
    "paste the reply here",
  "Impostazioni e backup…":
    "Settings and backup…",
  "connessione caduta appena aperta, riprovo ({0})":
    "connection dropped right after opening, retrying ({0})",
  "<p>Sono gli otto preset salvati dentro l'ampli: A1–A4 in rosso, B1–B4 in verde, come i LED dello Spark. Si leggono da soli quando colleghi l'ampli.</p><p>Sotto c'è la tua libreria: tutti gli altri preset, che stanno nell'app e non occupano posti nell'ampli. Se un preset va in uno slot sale qui sopra; se lo slot viene sovrascritto torna giù, non si perde.</p>":
    "<p>These are the eight presets stored inside the amp: A1–A4 in red, B1–B4 in green, like the Spark's LEDs. They are read automatically when you connect the amp.</p><p>Below is your library: all your other presets, which live in the app and take up no space in the amp. When a preset goes into a slot it moves up here; if the slot is overwritten it goes back down, nothing is lost.</p>",
  "<p>Otto pulsantoni per suonare: un tocco e parte il preset. Se il preset è già in uno slot dell'ampli cambia all'istante, altrimenti ci mette circa un secondo.</p><p>Il banco <strong>Ampli</strong> mostra gli otto slot. I banchi tuoi li prepari con <strong>Modifica</strong>: sono scalette di preset e non scrivono mai negli slot dell'ampli.</p><p>Tieni premuto un pulsantone per due secondi e si apre l'editor di quel preset.</p>":
    "<p>Eight big buttons for playing: one tap and the preset starts. If the preset is already in an amp slot it changes instantly, otherwise it takes about a second.</p><p>The <strong>Amp</strong> bank shows the eight slots. You build your own banks with <strong>Edit</strong>: they are setlists of presets and never write to the amp's slots.</p><p>Hold a button down for two seconds to open that preset in the editor.</p>",
  "<p><strong>Esporta la libreria</strong> salva tutti i tuoi preset, con banchi, categorie e note, in un file sul telefono. Tienilo da parte: se cambi telefono o browser, lo riapri con <strong>Importa un file</strong>.</p>":
    "<p><strong>Export the library</strong> saves all your presets, with banks, categories and notes, to a file on your phone. Keep it somewhere safe: if you change phone or browser, open it again with <strong>Import a file</strong>.</p>",
  "<p>Collegando Dropbox la libreria resta uguale su tutti i tuoi apparecchi: telefono, tablet, computer. Una modifica fatta su uno arriva sugli altri; se lo stesso preset cambia in due posti, vince la modifica più recente.</p><p>Il <strong>backup di sicurezza</strong> è un'altra cosa: una copia ferma che fai tu quando vuoi, e che la sincronizzazione non tocca. Se qualcosa va storto, la ripristini.</p>":
    "<p>With Dropbox connected your library stays the same on all your devices: phone, tablet, computer. A change made on one reaches the others; if the same preset changes in two places, the most recent change wins.</p><p>The <strong>safety backup</strong> is something else: a fixed copy you make whenever you want, which syncing never touches. If something goes wrong, you restore it.</p>",
  "<p>Scegli uno dei tuoi banchi e il posto del pedale dove metterlo, poi <strong>Manda al pedale</strong>. Il banco resta nel pedale anche a corrente staccata.</p><p>Dopo, il pedale suona da solo con lo Spark, senza telefono.</p>":
    "<p>Choose one of your banks and the place on the pedal to put it in, then <strong>Send to the pedal</strong>. The bank stays in the pedal even with the power off.</p><p>From then on the pedal plays with the Spark on its own, no phone needed.</p>",
  "Live (beta)":
    "Live (beta)",
  "Una vista per suonare dal vivo: banchi di preset o pedali stomp, da comandare col mouse o con una pedaliera MIDI, via cavo o Bluetooth. È in prova: se qualcosa non va, scrivimi.":
    "A view for playing live: banks of presets or stomp pedals, controlled with the mouse or with a MIDI foot controller, by cable or Bluetooth. It's still being tested: if something doesn't work, write to me.",
  "Tap tempo":
    "Tap tempo",
  "Accanto ai BPM c'è il pulsante Tap: batti il tempo e il delay lo segue.":
    "Next to the BPM there is the Tap button: tap the tempo and the delay follows it.",
  "Guida e spiegazioni":
    "Guide and explanations",
  "Una guida per il computer con le schermate vere, e un «?» accanto alle funzioni più complesse.":
    "A guide for the computer with real screenshots, and a «?» next to the more complex features.",
  "Connessione più tenace":
    "A sturdier connection",
  "Se il collegamento con l'ampli cade appena aperto, l'app riprova da sola.":
    "If the connection to the amp drops right after opening, the app tries again on its own.",
  "Sempre gratis":
    "Always free",
  "L'app resta gratuita. Se ti è utile, un caffè dal menu Altro aiuta a farla crescere.":
    "The app stays free. If you find it useful, a coffee from the More menu helps it grow.",
  "L'app resta gratuita. Se ti è utile, un caffè dal menu in alto a destra aiuta a farla crescere.":
    "The app stays free. If you find it useful, a coffee from the menu at the top right helps it grow.",
  "Video brevi su YouTube":
    "Short videos on YouTube",
  "Sette video brevi, uno per sezione dell'app: collegarsi, la libreria, la scheda del preset, l'editor, il Live, l'accordatore e il backup. Li trovi dalla guida, sul canale SparklingTones.":
    "Seven short videos, one for each part of the app: connecting, the library, the preset card, the editor, Live, the tuner and backup. You'll find them from the guide, on the SparklingTones channel.",
  "Piccole correzioni":
    "Small fixes",
  "Questa finestra delle novità ora mostra bene data e icone anche in inglese.":
    "This What's new window now shows dates and icons correctly in English too.",
  "Sul Microsoft Store":
    "On the Microsoft Store",
  "L'app per Windows ora è sul Microsoft Store: gratis, si installa con un clic e si aggiorna da sola. Il link è nella guida del PC e su sparklingtones.com.":
    "The Windows app is now on the Microsoft Store: free, installs in one click and updates itself. The link is in the PC guide and on sparklingtones.com.",
  "Un video per capitolo":
    "A video for each chapter",
  "Nella guida, sotto il titolo di molti capitoli, c'è il video breve che mostra come si fa.":
    "In the guide, under the title of many chapters, there's a short video that shows how it's done.",
  "Guida e video":
    "Guide and videos",
  "La guida, in italiano e in inglese, ora porta dritta ai video brevi su YouTube.":
    "The guide, in Italian and English, now takes you straight to the short videos on YouTube.",
  "Novità":
    "New",
  "Cosa c'è di nuovo":
    "What's new",
  "Preset e Stomp":
    "Presets and Stomp",
  "<p>In <strong>Preset</strong> ogni pulsantone suona un preset del banco. Se il preset è già in uno slot dell'ampli cambia all'istante, altrimenti ci mette un momento. Il Live non scrive mai negli slot.</p><p>In <strong>Stomp</strong> i pulsantoni accendono e spengono i blocchi del preset che suona (Compressor, Drive, Mod, Delay, Reverb), come i pedali sul pavimento.</p>":
    "<p>In <strong>Presets</strong> each big button plays a preset from the bank. If the preset is already in an amp slot it changes instantly, otherwise it takes a moment. Live never writes to the slots.</p><p>In <strong>Stomp</strong> the buttons switch the blocks of the playing preset on and off (Compressor, Drive, Mod, Delay, Reverb), like pedals on the floor.</p>",
  "La pedaliera MIDI":
    "The MIDI foot controller",
  "<p>Con <strong>Impara</strong> premi uno switch del tuo pedale MIDI e l'app lo riconosce. Poi scegli cosa fa in Preset, cosa fa in Stomp e cosa fa la pressione lunga.</p><p>La <strong>pressione lunga</strong> funziona con i pedali che mandano un messaggio quando premi e uno quando rilasci (un CC a 127 e poi a 0). Con un Program Change c'è solo la pressione breve. Qui scegli quanto deve durare.</p>":
    "<p>With <strong>Learn</strong> you press a switch on your MIDI pedal and the app recognises it. Then choose what it does in Presets, what it does in Stomp and what a long press does.</p><p>The <strong>long press</strong> works with pedals that send one message when pressed and one when released (a CC at 127 and then at 0). With a Program Change there is only the short press. Here you choose how long it must last.</p>",
  "Tap":
    "Tap",
  "<p>Clicca <strong>Tap</strong> a tempo, almeno due volte: l'app calcola i BPM dalla media dei colpi e il delay li segue. Dopo due secondi di pausa ricomincia da capo.</p>":
    "<p>Click <strong>Tap</strong> in time, at least twice: the app works out the BPM from the average of your taps and the delay follows. After a two-second pause it starts over.</p>",
  "<p>Descrivi il suono che vuoi, per esempio «crunch anni '70 con un po' di delay».</p><p>«Copia la domanda» mette negli appunti una richiesta completa per l'IA, con l'elenco degli effetti che il tuo ampli ha davvero. Incollala nella chat che usi già (ChatGPT, Claude, Gemini…), poi copia la sua risposta e incollala qui sotto.</p><p>Il preset nuovo va sull'ampli <strong>senza essere salvato</strong>: lo provi, lo ritocchi, e resta in libreria solo se premi «Salva…». L'app non manda niente a nessuno: la chat la apri tu.</p>":
    "<p>Describe the sound you want, for example «70s crunch with a little delay».</p><p>«Copy the request» puts a complete request for the AI on the clipboard, with the list of effects your amp really has. Paste it into the chat you already use (ChatGPT, Claude, Gemini…), then copy its reply and paste it below.</p><p>The new preset goes to the amp <strong>without being saved</strong>: you try it, tweak it, and it stays in the library only if you press «Save…». The app sends nothing to anyone: you open the chat yourself.</p>",
  "<p>Con Dropbox collegato la libreria si tiene allineata da sola fra i tuoi dispositivi: telefono, browser del computer, app per Windows.</p><p>Se lo stesso preset è cambiato in due posti vince la modifica più recente. Gli slot dell'ampli non viaggiano: ogni dispositivo li legge dall'ampli. Se in un colpo solo sparirebbero più di 5 preset, l'app prima chiede.</p><p>Per collegarlo serve una «app key» di Dropbox, che si crea una volta sola: la guida spiega i passi. Poi «Collega Dropbox», autorizzi nel browser e incolli qui il codice che Dropbox ti mostra.</p>":
    "<p>With Dropbox connected the library keeps itself in step across your devices: phone, computer browser, Windows app.</p><p>If the same preset changed in two places, the most recent change wins. The amp's slots don't travel: each device reads them from the amp. If more than 5 presets would disappear in one go, the app asks first.</p><p>To connect it you need a Dropbox «app key», created once: the guide explains the steps. Then «Connect Dropbox», authorise in the browser and paste here the code Dropbox shows you.</p>",
  "Backup di sicurezza":
    "Safety backup",
  "<p>È una copia della libreria messa da parte su Dropbox, in un file suo. Il sync automatico non la tocca mai.</p><p>Fanne una prima di un grosso riordino: se qualcosa va storto, «Ripristina il backup di sicurezza» riporta la libreria com'era. Ce n'è una sola: farne una nuova sostituisce la vecchia.</p>":
    "<p>It's a copy of the library set aside on Dropbox, in its own file. Automatic sync never touches it.</p><p>Make one before a big tidy-up: if something goes wrong, «Restore the safety backup» puts the library back as it was. There is only one: making a new one replaces the old one.</p>",
  "<p>Positive Grid vende a parte un pacchetto di effetti Hendrix. Si sblocca con l'app ufficiale Spark e lo sblocco resta nell'ampli: questa app non lo può sbloccare.</p><p>Scegli «Sì» se ce l'hai: gli effetti Hendrix compaiono nelle liste, segnati «JH». Scegli «No» se non ce l'hai: spariscono, e i preset che li usano non si vedono, perché sull'ampli non suonerebbero.</p>":
    "<p>Positive Grid sells a pack of Hendrix effects separately. It is unlocked with the official Spark app and the unlock stays in the amp: this app cannot unlock it.</p><p>Choose «Yes» if you have it: the Hendrix effects appear in the lists, marked «JH». Choose «No» if you don't: they disappear, and the presets that use them are hidden, because they wouldn't play on the amp.</p>",
  "<p>Un banco è un gruppo di otto preset, come una scaletta per un concerto o una prova. Trascini i preset dalla libreria nei suoi posti.</p><p>Un clic su un posto fa suonare quel preset. I banchi stanno solo in libreria: <strong>non scrivono mai negli slot dell'ampli</strong>. Il banco «Ampli» è un'altra cosa: mostra gli otto preset salvati negli slot, e qui non si modifica.</p><p>I banchi sono anche quello che suona il pedale SparklingTones.</p>":
    "<p>A bank is a group of eight presets, like a setlist for a gig or a rehearsal. Drag presets from the library into its places.</p><p>A click on a place plays that preset. Banks live only in the library: <strong>they never write to the amp's slots</strong>. The «Amp» bank is something else: it shows the eight presets stored in the slots, and can't be edited here.</p><p>Banks are also what the SparklingTones pedal plays.</p>",
  "<p>Il pedale è una pedaliera da costruire, collegata allo Spark in Bluetooth: suona i tuoi banchi senza telefono né computer. Se non ce l'hai, spegni questa sezione in Impostazioni.</p><p><strong>Collegarlo.</strong> Sul pedale tieni premuti insieme i due tasti banco per un secondo e mezzo: resta aperto per due minuti. Poi qui premi «Cerca» e sceglilo dalla lista. Mentre è collegato al computer il pedale lascia l'ampli; quando lo stacchi torna da solo allo Spark.</p><p><strong>Mandare un banco.</strong> Scegli il banco e il posto del pedale, poi «Manda al pedale». Se un banco cambia nell'app, qui lo vedi segnato da aggiornare.</p><p><strong>Riordinare.</strong> In «Nel pedale» sposti o togli i banchi; le modifiche vanno sul pedale tutte insieme con «Aggiorna il pedale».</p><p>Se un footswitch non fa niente, controlla prima che il pedale non sia ancora collegato qui.</p>":
    "<p>The pedal is a build-it-yourself footswitch board, connected to the Spark over Bluetooth: it plays your banks without a phone or computer. If you don't have one, switch this section off in Settings.</p><p><strong>Connecting it.</strong> On the pedal hold both bank buttons together for a second and a half: it stays open for two minutes. Then press «Search» here and pick it from the list. While connected to the computer the pedal lets go of the amp; when you disconnect it goes back to the Spark on its own.</p><p><strong>Sending a bank.</strong> Choose the bank and the place on the pedal, then «Send to the pedal». If a bank changes in the app, you'll see it marked here as needing an update.</p><p><strong>Rearranging.</strong> In «In the pedal» you move or remove banks; the changes go to the pedal all together with «Update the pedal».</p><p>If a footswitch does nothing, first check that the pedal isn't still connected here.</p>",
  "<p>Mentre ritocchi un preset, A/B ti fa ascoltare com'era salvato. Premilo di nuovo e torni alle tue modifiche.</p><p>Così senti se la modifica migliora davvero il suono, prima di salvarla. Mentre ascolti la versione salvata i comandi sono fermi.</p>":
    "<p>While you tweak a preset, A/B lets you hear it as it was saved. Press it again to go back to your changes.</p><p>That way you hear whether the change really improves the sound before saving it. While you listen to the saved version the controls are locked.</p>",
  "Hai il pedale? Se no, la sezione Pedale non si vede.":
    "Do you have the pedal? If not, the Pedal section is hidden.",
  "Nessuno":
    "None",
  "Entra/esci dallo Stomp":
    "Enter/leave Stomp",
  "Passa da banco A a banco B":
    "Switch between bank A and bank B",
  "Banco successivo":
    "Next bank",
  "Banco precedente":
    "Previous bank",
  "prima fai suonare un preset.":
    "play a preset first.",
  "Pedaliera":
    "Foot controller",
  "MIDI USB":
    "USB MIDI",
  "Stomp":
    "Stomp",
  "Stomp su":
    "Stomp on",
  "(da leggere)":
    "(to be read)",
  "Banco A · {0}":
    "Bank A · {0}",
  "Banco B · {0}":
    "Bank B · {0}",
  "Banco A o B · {0}":
    "Bank A or B · {0}",
  "canale {0}":
    "channel {0}",
  "Stacca {0}":
    "Disconnect {0}",
  "Collega un pedale Bluetooth":
    "Connect a Bluetooth pedal",
  "MIDI USB attivo":
    "USB MIDI on",
  "Usa i pedali USB":
    "Use USB pedals",
  "Switch":
    "Switch",
  "Messaggio":
    "Message",
  "Preset · tocco":
    "Presets · tap",
  "Stomp · tocco":
    "Stomp · tap",
  "Tenuto premuto":
    "Held down",
  "Togli":
    "Remove",
  "nome dello switch":
    "switch name",
  "Nessuno switch.":
    "No switches.",
  "Premi uno switch del pedale…":
    "Press a switch on the pedal…",
  "＋ Impara uno switch":
    "＋ Learn a switch",
  "nessun pedale":
    "no pedal",
  "Collega prima un pedale Bluetooth o attiva i pedali USB.":
    "Connect a Bluetooth pedal first, or turn on USB pedals.",
  "Pressione lunga":
    "Long press",
  "dopo {0} s":
    "after {0} s",
  "OK":
    "OK",
  "questo switch c'è già.":
    "this switch is already there.",
  "Questo browser non ha il MIDI.":
    "This browser has no MIDI.",
  "pedali USB in ascolto.":
    "listening to USB pedals.",
  "MIDI USB non disponibile: {0}":
    "USB MIDI not available: {0}",
  "Bluetooth":
    "Bluetooth",
  "Questo browser non ha il Bluetooth.":
    "This browser has no Bluetooth.",
  "il pedale Bluetooth si è staccato.":
    "the Bluetooth pedal disconnected.",
  "«{0}» collegato.":
    "«{0}» connected.",
  "pedale non collegato: {0}":
    "pedal not connected: {0}",
  "Benvenuto in SparklingTones":
    "Welcome to SparklingTones",
  "Grazie per averlo installato! SparklingTones è e resterà gratuito. Dietro però ci sono centinaia di ore di lavoro: notti passate a decifrare il protocollo dello Spark, a provare e riprovare sull'ampli vero.":
    "Thanks for installing it! SparklingTones is and will stay free. Behind it, though, are hundreds of hours of work: nights spent decoding the Spark's protocol, trying again and again on the real amp.",
  "Se l'app ti piace, un caffè è il modo più bello per dirmelo e per farla crescere.":
    "If you like the app, a coffee is the nicest way to tell me and to help it grow.",
  "— Massimo, chitarrista. Con metà del tempo passato sugli effetti, oggi suonerebbe meglio di Hendrix.":
    "— Massimo, guitarist. With half the time he spent on effects, he'd play better than Hendrix by now.",
  "Cominciamo":
    "Let's start",
  "Ti sta tornando utile?":
    "Is it coming in handy?",
  "SparklingTones è e resterà gratuito. Dietro però ci sono centinaia di ore di lavoro: notti passate a decifrare il protocollo dello Spark, a provare e riprovare sull'ampli vero.":
    "SparklingTones is and will stay free. Behind it, though, are hundreds of hours of work: nights spent decoding the Spark's protocol, trying again and again on the real amp.",
  "Magari più avanti":
    "Maybe later",
  "Spiegazione":
    "Explanation",
  "Batti il tempo":
    "Tap the tempo",
  "La vista Live, con la pedaliera":
    "The Live view, with the foot controller",
};
