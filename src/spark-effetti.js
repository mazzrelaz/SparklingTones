/**
 * spark-effetti.js — come si chiamano davvero effetti e manopole.
 *
 * L'ampli manda l'identificativo interno di un effetto (`bias.noisegate`) e i
 * suoi parametri come semplici indici. Né il protocollo né i sorgenti di
 * riferimento dicono come si chiamano quelle manopole.
 *
 * Questa tabella viene dal catalogo di **Soundshed**, applicazione open source
 * per gli ampli Spark, licenza MIT:
 *
 *   https://github.com/soundshed/soundshed-app
 *   src/spork/src/devices/spark/sparkFxCatalog.ts
 *   Copyright (c) Soundshed contributors — MIT License
 *
 * Perché conta averla presa da lì e non trascritta dall'app ufficiale:
 * **l'ordine sullo schermo non è l'ordine degli indici.** Su un ampli le
 * manopole si leggono Gain, Bass, Middle, Treble, Master, ma negli indici
 * stanno Gain(0), Treble(1), Middle(2), Bass(3), Master(4) — bassi e alti
 * invertiti. Lo stesso sul compressore LA Comp, dove l'interruttore
 * Limit/Compress è il parametro 0 e non l'ultimo. Copiando l'ordine dello
 * schermo si sbagliava, e in silenzio.
 *
 * Restano comunque **proposte**, per due motivi: il catalogo è nato per lo
 * Spark 40 (lo Spark 2 lì è supportato in via sperimentale) e i nomi degli
 * ampli sono quelli scelti da Soundshed, non quelli di Positive Grid. Per
 * questo la UI li mostra in corsivo e un nome scritto a mano vince sempre.
 *
 * Rigenerare da capo cancellerebbe le correzioni verificate sull'ampli: le
 * modifiche vanno fatte qui, a mano.
 */
window.SparkEffetti = (function () {
  'use strict';

  /**
   * chiave   = identificativo che manda l'ampli
   * nome     = come chiamarlo per chi legge
   * manopole = nomi dei parametri, **in ordine di indice**
   * quante   = quante manopole ha davvero l'effetto, quando lo sappiamo.
   *            Può essere **più** dei nomi (una manopola vera senza nome), e
   *            può essere **meno** dei parametri che l'ampli manda: quelli in
   *            più non sono manopole e la UI li mette da parte. Assente vuol
   *            dire che non lo sappiamo, e allora nessun parametro si tocca.
   */
  const TABELLA = {
    /* ---- Noise gate ----
       L'ampli manda **due o tre** parametri per il noise gate, a seconda del
       preset: nelle otto catture di `captures/2026-08-10-libreria-8-preset.json`
       cinque preset su otto ne hanno un terzo, e in tutti e cinque vale
       esattamente 1. Le manopole restano due — Threshold e Decay — quindi il
       terzo non è una manopola e non merita un cursore in mezzo agli altri. */
    'bias.noisegate': { nome: 'Noise Gate', manopole: ['Threshold', 'Decay'], quante: 2 },

    /* ---- Comp / Wah ---- */
    'LA2AComp': { nome: 'LA Comp', manopole: ['Limit/Compress', 'Gain', 'Peak Reduction'] },
    'BlueComp': { nome: 'Sustain Comp', manopole: ['Level', 'Tone', 'Attack', 'Sustain'] },
    'Compressor': { nome: 'Red Comp', manopole: ['Output', 'Sensitivity'] },
    'BassComp': { nome: 'Bass Comp', manopole: ['Comp', 'Gain'] },
    'BBEOpticalComp': { nome: 'Optical Comp', manopole: ['Volume', 'Comp', 'Pad'] },
    'JH.Vox846': { nome: 'Vox 846 Wah', manopole: ['P1', 'Mode', 'P3', 'P4', 'P5'] },

    /* ---- Drive ---- */
    'Booster': { nome: 'Booster', manopole: ['Gain'] },
    'DistortionTS9': { nome: 'Tube Drive', manopole: ['Overdrive', 'Tone', 'Level'] },
    'Overdrive': { nome: 'Over Drive', manopole: ['Level', 'Tone', 'Drive'] },
    'Fuzz': { nome: 'Fuzz Face', manopole: ['Volume', 'Fuzz'] },
    'ProCoRat': { nome: 'Black Op', manopole: ['Distortion', 'Filter', 'Volume'] },
    'BassBigMuff': { nome: 'Bass Muff', manopole: ['Volume', 'Tone', 'Sustain'] },
    'GuitarMuff': { nome: 'Guitar Muff', manopole: ['Volume', 'Tone', 'Sustain'] },
    'MaestroBassmaster': { nome: 'Bassmaster',
      manopole: ['Brass Vol', 'Sensitivity', 'Bass Vol'] },
    'SABdriver': { nome: 'SAB Driver', manopole: ['Volume', 'Tone', 'Drive', 'HP/LP'] },
    'MetalZoneMT2': { nome: 'Metal Zone MT2',
      manopole: ['Level', 'EQ Low', 'EQ Middle', 'EQ High', 'EQ Mid Band', 'Distortion'] },
    'TrebleBooster': { nome: 'Treble Booster', manopole: ['P3', 'P2', 'P1'] },
    'KlonCentaurSilver': { nome: 'Clone Drive', manopole: ['Output', 'Treble', 'Gain'] },

    /* ---- Ampli ---- */
    'RolandJC120': { nome: 'Silver 120',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Twin': { nome: 'Blackface Duo',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'ADClean': { nome: 'AD Clean', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    '94MatchDCV2': { nome: 'Match DC',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Bassman': { nome: 'Tweed Bass',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'AC Boost': { nome: 'AC Boost',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Checkmate': { nome: 'Checkmate',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'TwoStoneSP50': { nome: 'Two Stone SP50',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Deluxe65': { nome: 'American Deluxe',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Plexi': { nome: 'Plexiglas', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'OverDrivenJM45': { nome: 'JM45',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'OverDrivenLuxVerb': { nome: 'Lux Verb',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Bogner': { nome: 'RB 101', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'OrangeAD30': { nome: 'British 30',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'AmericanHighGain': { nome: 'American High Gain',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'SLO100': { nome: 'Slo 100', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'YJM100': { nome: 'YJM100', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Rectifier': { nome: 'Treadplate',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'EVH': { nome: 'Insane', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'SwitchAxeLead': { nome: 'SwitchAxe',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Invader': { nome: 'Rocker V', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'BE101': { nome: 'BE 101', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Acoustic': { nome: 'Pure Acoustic',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'AcousticAmpV2': { nome: 'Fishboy',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'FatAcousticV2': { nome: 'Jumbo',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'FlatAcoustic': { nome: 'Flat Acoustic',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'GK800': { nome: 'RB-800', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Sunny3000': { nome: 'Sunny 3000',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'W600': { nome: 'W600', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Hammer500': { nome: 'Hammer 500',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'JCM800': { nome: 'JCM 800', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'MatchlessDC30': { nome: 'Matchless DC30',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'DrZ': { nome: 'Dr. Z', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Hiwatt103': { nome: 'Hiwatt DR103',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'B15': { nome: 'B-15', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'Acoustic360': { nome: 'Acoustic 360',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'GK700RBII': { nome: 'GK 700 RB II',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    '6505Plus': { nome: 'Insane 6508',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'ODS50CN': { nome: 'ODS 50', manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'BluesJrTweed': { nome: 'Blues Boy',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'JH.JTM45': { nome: 'Marshall JTM45/100',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },
    'JH.SuperLead100': { nome: 'Marshall Super Lead 100',
      manopole: ['Gain', 'Treble', 'Middle', 'Bass', 'Master'] },

    /* ---- Modulazione ---- */
    'Tremolo': { nome: 'Tremolo', manopole: ['Speed', 'Depth', 'Level'] },
    'ChorusAnalog': { nome: 'Digital Chorus',
      manopole: ['E.Level', 'Rate', 'Depth', 'Tone'] },
    'Flanger': { nome: 'Flanger', manopole: ['Rate', 'Mix', 'Depth'] },
    'Phaser': { nome: 'Phaser', manopole: ['Speed', 'Intensity'] },
    'Vibrato01': { nome: 'Vibrato', manopole: ['Speed', 'Depth'] },
    'UniVibe': { nome: 'Vibe', manopole: ['Speed', 'Chorus / Vibrato', 'Intensity'] },
    'Cloner': { nome: 'Cloner Chorus', manopole: ['Rate', 'Depth (High / Low)'] },
    'MiniVibe': { nome: 'Mini Vibe', manopole: ['Speed', 'Intensity'] },
    'Tremolator': { nome: 'Tremolator', manopole: ['Depth', 'Speed', 'BPM'] },
    'TremoloSquare': { nome: 'Tremolo Square', manopole: ['Speed', 'Depth', 'Level'] },
    'MuTron': { nome: 'MuTron III',
      manopole: ['Mode', 'Peak', 'Depth', 'Range', 'Position'] },
    'GuitarEQ6': { nome: 'Guitar EQ',
      manopole: ['Level', '100', '200', '400', '800', '1.6K', '3.2K'] },
    'JH.VoodooVibeJr': { nome: 'Voodoo Vibe Junior',
      manopole: ['Speed', 'Sweep', 'Intensity', 'Chorus/Vibrato'] },

    /* ---- Delay ---- */
    'DelayMono': { nome: 'Digital Delay',
      manopole: ['E.Level', 'F.Back', 'D.Time', 'Mode', 'BPM'] },
    'DelayEchoFilt': { nome: 'Delay/Echo',
      manopole: ['Delay', 'Feedback', 'Level', 'Tone', 'BPM'] },
    'VintageDelay': { nome: 'Vintage Delay',
      manopole: ['Repeat Rate', 'Intensity', 'Echo', 'BPM'] },
    'DelayReverse': { nome: 'Reverse Delay',
      manopole: ['Mix', 'Decay', 'Filter', 'Time', 'BPM'] },
    'DelayMultiHead': { nome: 'Multi Head',
      manopole: ['Repeat Rate', 'Intensity', 'Echo Vol', 'Mode Selector', 'BPM'] },
    'DelayRe201': { nome: 'Echo Tape',
      manopole: ['Sustain', 'Volume', 'Tone', 'Short -> Long', 'BPM'] },

    /* ---- Riverbero ----
       Soundshed spezza il riverbero in nove voci `bias.reverb.N`, una per tipo
       di riverbero, tutte con le stesse sei manopole. Il nostro ampli manda un
       solo effetto `bias.reverb` con **sette** parametri: i sei nomi sono
       quelli, il settimo è quasi certamente il tipo — ma «quasi certamente»
       non basta per scriverci sopra un'etichetta, e resta un numero.

       Il parametro 0 è confermato da un'altra parte: girando la manopola fisica
       del riverbero l'ampli manda `bias.reverb` parametro 0 (docs §3.6).

       L'ottavo, quando c'è, è un'altra cosa ancora: compare negli stessi cinque
       preset che hanno il terzo parametro del noise gate e vale sempre
       esattamente 1. Come quello, non è una manopola — da qui `quante: 7`. */
    'bias.reverb': { nome: 'Riverbero', quante: 7,
      manopole: ['Level', 'Damping', 'Low Cut', 'High Cut', 'Dwell', 'Time'] },
  };

  /**
   * I modelli che si possono mettere in ogni posizione della catena, nello
   * stesso ordine di `Spark.CATENA`.
   *
   * Base il catalogo di Soundshed, più i modelli che compaiono nei preset
   * dell'utente e nella documentazione del protocollo ma che lì non ci sono —
   * segnati qui sotto. Di quelli non sappiamo i nomi delle manopole, e
   * infatti restano numerate.
   *
   * Non è detto sia esaustivo: lo Spark 2 potrebbe conoscerne altri, per
   * questo la UI lascia sempre scrivere un nome a mano.
   */
  const MODELLI = [
    ['bias.noisegate'],
    ['LA2AComp', 'BlueComp', 'Compressor', 'BassComp', 'BBEOpticalComp', 'JH.Vox846',
     'Comp76'],
    [
      'Booster', 'DistortionTS9', 'Overdrive', 'Fuzz', 'ProCoRat', 'BassBigMuff',
      'GuitarMuff', 'MaestroBassmaster', 'SABdriver', 'MetalZoneMT2', 'TrebleBooster',
      'KlonCentaurSilver',
      'JH.AxisFuzz', 'JH.SupaFuzz', 'JH.Octavia', 'JH.FuzzTone',
    ],
    [
      'RolandJC120', 'Twin', 'ADClean', '94MatchDCV2', 'Bassman', 'AC Boost', 'Checkmate',
      'TwoStoneSP50', 'Deluxe65', 'Plexi', 'OverDrivenJM45', 'OverDrivenLuxVerb', 'Bogner',
      'OrangeAD30', 'AmericanHighGain', 'SLO100', 'YJM100', 'Rectifier', 'EVH',
      'SwitchAxeLead', 'Invader', 'BE101', 'Acoustic', 'AcousticAmpV2', 'FatAcousticV2',
      'FlatAcoustic', 'GK800', 'Sunny3000', 'W600', 'Hammer500', 'JCM800', 'MatchlessDC30',
      'DrZ', 'Hiwatt103', 'B15', 'Acoustic360', 'GK700RBII', '6505Plus', 'ODS50CN',
      'BluesJrTweed', 'JH.JTM45', 'JH.SuperLead100',
      'JH.DualShowman', 'JH.Sunn100', 'JH.Bassman50Silver', 'JH.SoundCity100', 'Preamp73',
    ],
    [
      'Tremolo', 'ChorusAnalog', 'Flanger', 'Phaser', 'Vibrato01', 'UniVibe', 'Cloner',
      'MiniVibe', 'Tremolator', 'TremoloSquare', 'MuTron', 'GuitarEQ6', 'JH.VoodooVibeJr',
      'BassEQ6',
    ],
    [
      'DelayMono', 'DelayEchoFilt', 'VintageDelay', 'DelayReverse', 'DelayMultiHead',
      'DelayRe201',
    ],
    ['bias.reverb'],
  ];

  /** Il nome leggibile di un effetto, o il suo identificativo se non lo sappiamo. */
  function nome(id) {
    const voce = TABELLA[id];
    return (voce && voce.nome) || id;
  }

  /**
   * Il nome proposto per un parametro, o null se la tabella non lo copre.
   *
   * `quantiVeri` è quante manopole l'ampli manda davvero per quell'effetto.
   * Se la tabella ne dichiara di più la riga è sbagliata — un modello diverso
   * su questo ampli, o un ordine cambiato — e allora **non si usa affatto**:
   * meglio numeri onesti che nomi su manopole altrui.
   */
  function manopola(id, indice, quantiVeri) {
    const voce = TABELLA[id];
    if (!voce || !voce.manopole) return null;
    if (quantiVeri !== undefined && voce.manopole.length > quantiVeri) return null;
    return voce.manopole[indice] || null;
  }

  /**
   * Questo parametro è uno di quelli che l'ampli manda ma che manopola non è?
   *
   * Serve a non mettere un cursore senza nome in mezzo a quelli veri: il noise
   * gate ha due manopole e su certi preset l'ampli manda tre parametri. Il
   * terzo esiste, va conservato e si può ancora muovere, ma sta da parte.
   *
   * Solo dove `quante` è dichiarato: senza, non sappiamo niente e non si tocca.
   */
  function extra(id, indice) {
    const voce = TABELLA[id];
    return !!voce && voce.quante !== undefined && indice >= voce.quante;
  }

  /** La riga della tabella è compatibile con quello che manda l'ampli? */
  function affidabile(id, quantiVeri) {
    const voce = TABELLA[id];
    if (!voce || !voce.manopole) return true;      // niente da sbagliare
    return voce.manopole.length <= quantiVeri;
  }

  /** Quanti effetti conosciamo per nome: serve a sapere quanta strada manca. */
  function quantiConosciuti() {
    return Object.keys(TABELLA).length;
  }

  return { TABELLA, MODELLI, nome, manopola, extra, affidabile, quantiConosciuti };
})();
