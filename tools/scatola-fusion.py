# -*- coding: utf-8 -*-
"""
Bozza della scatola del pedale, per Fusion 360.
===============================================

Genera in un documento nuovo: le quattro sponde di mogano, il top e il fondo
di rovere, le quattro nervature fra un footswitch e l'altro, e tutti i fori
del pannello e delle sponde.

E' una bozza per ragionarci sopra, non un disegno esecutivo. I pezzi sono
corpi separati, uno per tavoletta, cosi' si possono misurare e spostare.
La giunzione delle sponde e la battuta d'incasso NON sono modellate: le
decide chi costruisce. Qui i pannelli sono appoggiati alla quota giusta.

Le misure dei pezzi non ancora arrivati sono STIME, dichiarate qui sotto e
da prendere col calibro prima di tagliare: soprattutto il footswitch, che
e' l'unico numero capace di far rifare tutto (docs/pedale.md, «L'altezza»).

Come si usa
-----------
Fusion 360 -> Utilities -> Add-Ins -> Scripts and Add-Ins -> Scripts -> "+",
crea uno script Python, apri la cartella che ti mostra, sostituisci il file
.py con questo tenendo lo stesso nome, poi Run.

Tutte le misure qui sotto sono in millimetri: a Fusion, che lavora in
centimetri, ci pensa mm().
"""

import adsk.core
import adsk.fusion
import traceback

# ----------------------------------------------------------------- misure --

L = 360.0      # larghezza esterna (pannello utile 340 + 2 sponde)
P = 120.0      # profondita' esterna (pannello utile 100 + 2 sponde)
H = 35.0       # altezza esterna: la danno le sponde
SP = 10.0      # spessore delle sponde (mogano)
PAN = 5.0      # spessore di top e fondo (rovere)

# Footswitch: interassi 70 + 70 + 70 + 90, misurati col piede dall'utente il
# 29 agosto 2026: a 60 mm ne premeva due insieme. Il vuoto largo non e' spazio
# in piu', e' il riferimento tattile del quinto pedale, quello che cambia meta'.
FS_INTERASSI = [70.0, 70.0, 70.0, 90.0]
FS_FORO = 12.0        # STIMA: filetto del footswitch, da misurare
FS_Y = 30.0           # distanza del centro dal bordo davanti

LED_FORO = 5.0        # RGB 5 mm, uno sopra ognuno dei primi quattro
LED_Y = 50.0

DISPLAY_W = 55.0      # area attiva del 2,42" 128x64
DISPLAY_H = 27.5
DISPLAY_Y = 65.0      # bordo davanti della finestra

# Vetrino di protezione: policarbonato fume' da 2 mm, a filo del legno dentro
# una battuta ricavata sulla faccia di sopra. Policarbonato e non plexiglass:
# su questa luce il plexi si crepa a stella, il PC no. A filo e non incollato
# sotto, perche' sotto lascerebbe un pozzo profondo 5 mm che sul palco
# raccoglie di tutto. Va lasciato **1 mm d'aria** fra vetrino e vetro
# dell'OLED: il modulo si fissa al pannello, non si spinge contro il vetrino.
VETRINO_SP = 2.0
VETRINO_BORDO = 3.0   # di quanto la battuta deborda dalla finestra, per lato

# I due tasti a mano per i banchi stanno **ai fianchi del display**, non
# dietro: il display e' largo 55 su un pannello largo 340, quindi ai suoi
# lati ci sono oltre cento millimetri vuoti per parte. Metterli li' accorcia
# la scatola di 30 mm e da' un tasto banco per mano.
TASTO_FORO = 12.0
TASTO_Y = 79.0        # alla stessa quota del centro del display
TASTO_DX = 55.0       # distanza dall'asse della scatola

NERV_SP = 10.0        # nervature fra un footswitch e l'altro
NERV_FINO_A = 50.0    # da dietro la sponda davanti fino a questa quota

# Prese USB-C sulla sponda dietro. Foro tondo da 22 (HENGBIRD, filetto
# M21x1,5): su una sponda da 35 restano 6,5 mm di legno sopra e sotto.
# Il dado vuole un appoggio piano di ~26-28 mm all'interno: e' l'unica cosa
# da tenere d'occhio quando si decide la giunzione.
USB_FORO = 22.0
USB_X = [110.0, 250.0]
USB_Z = 17.5          # mezz'altezza della sponda

INTER_FORO = 12.0     # interruttore generale, sulla sponda sinistra
INTER_Y = 35.0
INTER_Z = 17.5

LED_CARICA_FORO = 6.0   # finestrella sui due LED del TP4056
LED_CARICA_Y = 60.0
LED_CARICA_Z = 17.5

# --------------------------------------------------------------- aiutanti --


def mm(v):
    return v / 10.0


def _profili(sk):
    coll = adsk.core.ObjectCollection.create()
    for p in sk.profiles:
        coll.add(p)
    return coll


def _corpi(bodies):
    coll = adsk.core.ObjectCollection.create()
    for b in bodies:
        coll.add(b)
    return coll


def scatola(comp, x0, y0, x1, y1, z0, h, nome=None):
    """Un parallelepipedo, corpo nuovo. Coordinate del mondo, in mm."""
    sk = comp.sketches.add(comp.xYConstructionPlane)
    sk.sketchCurves.sketchLines.addTwoPointRectangle(
        adsk.core.Point3D.create(mm(x0), mm(y0), 0),
        adsk.core.Point3D.create(mm(x1), mm(y1), 0))
    ext = comp.features.extrudeFeatures.createInput(
        sk.profiles.item(0),
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    ext.setDistanceExtent(False, adsk.core.ValueInput.createByReal(mm(h)))
    ext.startExtent = adsk.fusion.OffsetStartDefinition.create(
        adsk.core.ValueInput.createByReal(mm(z0)))
    corpo = comp.features.extrudeFeatures.add(ext).bodies.item(0)
    if nome:
        corpo.name = nome
    return corpo


def fori_dall_alto(comp, cerchi, rettangoli, z0, h, bersagli):
    """Fori passanti dall'alto, applicati ai soli corpi indicati."""
    sk = comp.sketches.add(comp.xYConstructionPlane)
    for (cx, cy, d) in cerchi:
        sk.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(mm(cx), mm(cy), 0), mm(d / 2.0))
    for (x0, y0, x1, y1) in rettangoli:
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            adsk.core.Point3D.create(mm(x0), mm(y0), 0),
            adsk.core.Point3D.create(mm(x1), mm(y1), 0))
    ext = comp.features.extrudeFeatures.createInput(
        _profili(sk), adsk.fusion.FeatureOperations.CutFeatureOperation)
    ext.setDistanceExtent(False, adsk.core.ValueInput.createByReal(mm(h)))
    ext.startExtent = adsk.fusion.OffsetStartDefinition.create(
        adsk.core.ValueInput.createByReal(mm(z0)))
    ext.participantBodies = bersagli
    comp.features.extrudeFeatures.add(ext)


def piano_parallelo(comp, base, quota, asse):
    """Piano di costruzione parallelo a `base`, alla quota data.

    Il segno dell'offset dipende da come Fusion orienta il piano di base,
    quindi lo si verifica sull'origine e, se e' finito dall'altra parte, si
    rifa' al contrario.
    """
    def crea(v):
        pi = comp.constructionPlanes.createInput()
        pi.setByOffset(base, adsk.core.ValueInput.createByReal(mm(v)))
        return comp.constructionPlanes.add(pi)

    pl = crea(quota)
    o = pl.geometry.origin
    vero = o.y if asse == 'y' else o.x
    if abs(vero - mm(quota)) > 1e-6:
        pl.deleteMe()
        pl = crea(-quota)
    return pl


def fori_su_sponda(comp, piano, cerchi, bersagli, spessore=20.0):
    """Fori orizzontali in una sponda.

    Il taglio e' simmetrico rispetto al piano: cosi' non dipende da come
    Fusion orienta la normale, e prende solo la sponda su cui sta il piano
    invece di attraversare la scatola e bucare anche quella di fronte.
    """
    sk = comp.sketches.add(piano)
    for (x, y, z, d) in cerchi:
        c = sk.modelToSketchSpace(
            adsk.core.Point3D.create(mm(x), mm(y), mm(z)))
        sk.sketchCurves.sketchCircles.addByCenterRadius(c, mm(d / 2.0))
    ext = comp.features.extrudeFeatures.createInput(
        _profili(sk), adsk.fusion.FeatureOperations.CutFeatureOperation)
    ext.setSymmetricExtent(
        adsk.core.ValueInput.createByReal(mm(spessore)), True)
    ext.participantBodies = bersagli
    comp.features.extrudeFeatures.add(ext)


# ------------------------------------------------------------------- main --


def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        comp = app.activeProduct.rootComponent

        # --- le quattro sponde di mogano ---------------------------------
        davanti = scatola(comp, 0.0, 0.0, L, SP, 0.0, H, 'sponda davanti')
        dietro = scatola(comp, 0.0, P - SP, L, P, 0.0, H, 'sponda dietro')
        sinistra = scatola(comp, 0.0, SP, SP, P - SP, 0.0, H, 'sponda sinistra')
        destra = scatola(comp, L - SP, SP, L, P - SP, 0.0, H, 'sponda destra')

        # --- top e fondo di rovere, alla quota giusta --------------------
        # Larghi quanto il vano piu' la battuta la decide chi costruisce:
        # qui sono a filo del vano interno.
        fondo = scatola(comp, SP, SP, L - SP, P - SP, 0.0, PAN,
                        'fondo rovere 5')
        top = scatola(comp, SP, SP, L - SP, P - SP, H - PAN, PAN,
                      'top rovere 5')

        # --- dove cadono i footswitch ------------------------------------
        campata = sum(FS_INTERASSI)
        x = (L - campata) / 2.0
        fs_x = [x]
        for d in FS_INTERASSI:
            x += d
            fs_x.append(x)

        # --- i fori del top ----------------------------------------------
        cerchi = [(cx, FS_Y, FS_FORO) for cx in fs_x]
        cerchi += [(cx, LED_Y, LED_FORO) for cx in fs_x[:4]]
        cerchi += [(L / 2.0 - TASTO_DX, TASTO_Y, TASTO_FORO),
                   (L / 2.0 + TASTO_DX, TASTO_Y, TASTO_FORO)]
        finestra = [(L / 2.0 - DISPLAY_W / 2.0, DISPLAY_Y,
                     L / 2.0 + DISPLAY_W / 2.0, DISPLAY_Y + DISPLAY_H)]
        fori_dall_alto(comp, cerchi, finestra, H - PAN, PAN, _corpi([top]))

        # --- la battuta del vetrino, sulla faccia di sopra ----------------
        b = VETRINO_BORDO
        battuta = [(L / 2.0 - DISPLAY_W / 2.0 - b, DISPLAY_Y - b,
                    L / 2.0 + DISPLAY_W / 2.0 + b, DISPLAY_Y + DISPLAY_H + b)]
        fori_dall_alto(comp, [], battuta, H - VETRINO_SP, VETRINO_SP,
                       _corpi([top]))

        # --- il vetrino, appoggiato nella sua battuta ---------------------
        scatola(comp, L / 2.0 - DISPLAY_W / 2.0 - b, DISPLAY_Y - b,
                L / 2.0 + DISPLAY_W / 2.0 + b, DISPLAY_Y + DISPLAY_H + b,
                H - VETRINO_SP, VETRINO_SP, 'vetrino policarbonato 2')

        # --- nervature, una fra ogni coppia di footswitch ----------------
        for i in range(len(fs_x) - 1):
            c = (fs_x[i] + fs_x[i + 1]) / 2.0
            scatola(comp, c - NERV_SP / 2.0, SP, c + NERV_SP / 2.0,
                    NERV_FINO_A, PAN, H - 2 * PAN, 'nervatura %d' % (i + 1))

        # --- le due prese USB-C sulla sponda dietro ----------------------
        piano_dietro = piano_parallelo(
            comp, comp.xZConstructionPlane, P - SP / 2.0, 'y')
        fori_su_sponda(comp, piano_dietro,
                       [(cx, P - SP / 2.0, USB_Z, USB_FORO) for cx in USB_X],
                       _corpi([dietro]))

        # --- interruttore e spia di carica sulla sponda sinistra ---------
        piano_sx = piano_parallelo(
            comp, comp.yZConstructionPlane, SP / 2.0, 'x')
        fori_su_sponda(comp, piano_sx, [
            (SP / 2.0, INTER_Y, INTER_Z, INTER_FORO),
            (SP / 2.0, LED_CARICA_Y, LED_CARICA_Z, LED_CARICA_FORO),
        ], _corpi([sinistra]))

        app.activeViewport.fit()
        ui.messageBox(
            'Bozza generata.\n\n'
            'Esterno {:.0f} x {:.0f} x {:.0f} mm, {:.0f} mm liberi dentro.\n'
            'Footswitch a {} mm di interasse, foro {:.1f} (STIMA).\n\n'
            'Prima di tagliare il legno vanno misurati col calibro: il '
            'filetto del footswitch e quanto sporge sotto il pannello, e '
            "l'ingombro dell'espansore.".format(
                L, P, H, H - 2 * PAN,
                ' + '.join('{:.0f}'.format(d) for d in FS_INTERASSI),
                FS_FORO))

    except:
        if ui:
            ui.messageBox('Non ha funzionato:\n{}'.format(
                traceback.format_exc()))
