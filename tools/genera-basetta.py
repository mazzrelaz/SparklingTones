# -*- coding: utf-8 -*-
"""Genera la basetta stampata del pedale (KiCad 10), pronta per JLCPCB.

Si lancia col Python di KiCad (quello di sistema non c'e'):

    & 'C:\\Program Files\\KiCad\\10.0\\bin\\python.exe' tools\\genera-basetta.py

Scrive `pcb/basetta/basetta-pedale.kicad_pcb`. **Questo script e' la sorgente**:
la scheda si cambia qui e si rigenera, non a mano in KiCad (si perderebbe).

Cosa fa, in ordine: contorno e fori, pezzi al loro posto con le reti sulle
piazzole, piste tirate da un router a griglia scritto qui sotto (A* su due
strati, curve a 45 gradi), piano di massa sui due lati con le vie di cucitura,
scritte in serigrafia. Il controllo (DRC) e i Gerber li fa `kicad-cli`, dopo.

Scelte (20 ottobre 2026, con l'utente): una scheda da riusare per altri pedali,
tutta a foro passante e senza montaggio da JLC; XIAO ESP32-S3 su zoccolo;
MCP23017 in DIP-28 su zoccolo al posto del KAmod; le resistenze dei LED qui e
non sulla piastrina LED; prese JST-XH con **G sempre sul piedino 1**.
**GPA7 resta libera**: sui chip nuovi GPA7 e GPB7 non sono garantite come
ingressi (nota del datasheet), e i pulsanti sono ingressi.
"""
import heapq
import math
import os
import sys
from array import array

import pcbnew

FP = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
MOD3D = "${KICAD10_3DMODEL_DIR}"
QUI = os.path.dirname(os.path.abspath(__file__))
FUORI = os.path.normpath(os.path.join(QUI, "..", "pcb", "basetta"))
NOME = "basetta-pedale"

# ------------------------------------------------------------- la scheda --
# Coordinate della scheda in mm, origine in alto a sinistra, Y in giu'.
# Sul foglio di KiCad la scheda sta spostata di (OX, OY).
OX, OY = 100.0, 100.0
W, H = 100.0, 72.0
FORI = [(4, 4), (W - 4, 4), (4, H - 4), (W - 4, H - 4)]   # M3
RAGGIO_VITE = 3.6        # niente rame dove appoggia la testa della vite

# Regole: dentro le minime di JLCPCB (0,127 di isolamento, via 0,3/0,6)
# con margine largo, perche' la scheda la salda a mano un neofita.
CLR = 0.25               # isolamento fra reti diverse
PISTA = 0.4              # segnali
PISTA_FORTE = 0.6        # alimentazioni e massa
VIA_D, VIA_FORO = 0.8, 0.4
BORDO = 0.6              # rame lontano dal bordo

mm = pcbnew.FromMM


def V(x, y):
    return pcbnew.VECTOR2I(mm(OX + x), mm(OY + y))


def da_iu(p):
    return (pcbnew.ToMM(p.x) - OX, pcbnew.ToMM(p.y) - OY)


# ----------------------------------------------------------------- pezzi --
RES = ("Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal")


def xh(n):
    return ("Connector_JST", "JST_XH_B%dB-XH-A_1x%02d_P2.50mm_Vertical" % (n, n))


# Il chip: piedino 1 in basso a sinistra (rotazione 90), riga 1-14 verso
# destra (GPB0..GPB7, VDD, VSS, NC, SCL, SDA, NC), sopra la riga 28..15
# letta da sinistra (GPA7..GPA0, INTA, INTB, RESET, A2, A1, A0).
MCP_X, MCP_Y = 12.0, 31.0
MCP_RETI = {9: "+3V3", 10: "GND", 12: "SCL", 13: "SDA",
            15: "GND", 16: "GND", 17: "GND", 18: "RESET"}
for i in range(8):
    MCP_RETI[1 + i] = "PB%d" % i
for i in range(7):                       # GPA7 (piedino 28) libera
    MCP_RETI[21 + i] = "PA%d" % i

# Pulsanti: le linee seguono l'ordine dei piedini, cosi' le piste vanno dritte.
# FS1 = GPA6 ... BDX = GPA0. Il firmware ha la sua tabella (LINEA_PULSANTE).
J_FS = ["GND", "PA6", "PA5", "PA4", "PA3"]          # G FS1 FS2 FS3 FS4
J_TASTI = ["GND", "PA2", "PA1", "PA0"]              # G FS5 SX DX
# LED: GPB0 = LED1 rosso, GPB1 = LED1 verde, ... GPB7 = LED4 verde.
J_LED12 = ["GND", "LR1", "LV1", "LR2", "LV2"]
J_LED34 = ["GND", "LR3", "LV3", "LR4", "LV4"]
LED_USCITE = ["LR1", "LV1", "LR2", "LV2", "LR3", "LV3", "LR4", "LV4"]

# La XIAO, vista dall'alto con l'USB in su: a sinistra D0..D6, a destra
# 5V, GND, 3V3, D10, D9, D8, D7. Numeri dei piedini come Seeed: 1..7 a
# sinistra dall'alto, 8 = D7 in basso a destra, 14 = 5V in alto a destra.
XIAO_C = (72.0, 14.5)
XIAO_SX = [("1", "VSENSE", "D0"), ("2", "LED_T", "D1"), ("3", "D2", "D2"),
           ("4", "CLIC", "D3"), ("5", "SDA", "SDA"), ("6", "SCL", "SCL"),
           ("7", "TX", "TX")]
XIAO_DX = [("14", None, "5V"), ("13", "GND", "G"), ("12", "+3V3", "3V3"),
           ("11", "D10", "D10"), ("10", "D9", "D9"), ("9", "D8", "D8"),
           ("8", "RX", "RX")]

BASSO = 64.0             # la riga delle prese in basso

PEZZI = []  # (rif, impronta, valore, x, y, rot, {piazzola: rete})


def pezzo(rif, imp, val, x, y, rot, reti):
    PEZZI.append((rif, imp, val, x, y, rot, reti))


def connettore(rif, reti, x, y):
    pezzo(rif, xh(len(reti)), "", x, y, 0,
          {str(i + 1): r for i, r in enumerate(reti)})


pezzo("U2", ("Package_DIP", "DIP-28_W7.62mm_Socket"), "MCP23017",
      MCP_X, MCP_Y, 90, {str(k): v for k, v in MCP_RETI.items()})
connettore("J1", J_FS, 11.0, 9.0)
connettore("J2", J_TASTI, 28.0, 9.0)
connettore("J3", J_LED12, 11.0, BASSO)
connettore("J4", J_LED34, 27.5, BASSO)
connettore("J5", ["GND", "+3V3", "SCL", "SDA"], 44.0, BASSO)
connettore("J6", ["GND", "LED_T_R"], 58.0, BASSO)
connettore("J7", ["GND", "CLIC_R"], 67.0, BASSO)
connettore("J8", ["GND", "VBAT"], 70.75, 30.0)
# il morsetto: i fili entrano dal lato del bordo
pezzo("J9", ("TerminalBlock_Phoenix",
             "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal"),
      "", 79.0, BASSO + 0.5, 0, {"1": "GND", "2": "VBAT"})
pezzo("J10", ("Connector_PinHeader_2.54mm", "PinHeader_1x08_P2.54mm_Vertical"),
      "", 91.0, 10.0, 0,
      {str(i + 1): r for i, r in enumerate(
          ["GND", "+3V3", "D2", "D8", "D9", "D10", "TX", "RX"])})

# Le otto resistenze dei LED, in piedi sul foglio (piazzola 1 in alto).
for i, rete in enumerate(LED_USCITE):
    pezzo("R%d" % (8 + i), RES, "330" if i % 2 == 0 else "560",
          10.5 + i * 3.81, 38.0, 270, {"1": "PB%d" % i, "2": rete})
pezzo("R1", RES, "4k7", 71.0, 40.0, 0, {"1": "+3V3", "2": "SDA"})
pezzo("R2", RES, "4k7", 71.0, 43.5, 0, {"1": "+3V3", "2": "SCL"})
pezzo("R3", RES, "10k", 40.0, 16.5, 0, {"1": "+3V3", "2": "RESET"})
pezzo("R4", RES, "100k", 54.0, 40.0, 0, {"1": "VBAT", "2": "VSENSE"})
pezzo("R5", RES, "100k", 54.0, 43.5, 0, {"1": "VSENSE", "2": "GND"})
pezzo("R6", RES, "330", 54.0, 50.0, 0, {"1": "LED_T", "2": "LED_T_R"})
pezzo("R7", RES, "330", 71.0, 50.0, 0, {"1": "CLIC", "2": "CLIC_R"})
pezzo("C1", ("Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P2.50mm"), "100n",
      49.5, 27.0, 0, {"1": "+3V3", "2": "GND"})
pezzo("C2", ("Capacitor_THT", "CP_Radial_D5.0mm_P2.00mm"), "10u",
      46.0, 50.0, 0, {"1": "+3V3", "2": "GND"})

# Scritte accanto alle prese: nome, nomi dei piedini sotto o sopra (in
# piedi se lunghi), e dove va il nome ("destra": accanto alla presa).
ETICHETTE = {
    "J1": ("FOOTSWITCH", ["G", "FS1", "FS2", "FS3", "FS4"], "sotto"),
    "J2": ("FS5 E BANCO", ["G", "FS5", "SX", "DX"], "sotto"),
    "J3": ("LED 1-2", ["G", "R1", "V1", "R2", "V2"], "sopra"),
    "J4": ("LED 3-4", ["G", "R3", "V3", "R4", "V4"], "sopra"),
    "J5": ("DISPLAY", ["G", "3V3", "SCL", "SDA"], "sopra"),
    "J6": ("TEMPO", ["G", "+"], "sopra"),
    "J7": ("PIEZO", ["G", "+"], "sopra"),
    "J8": ("BAT XIAO", ["-", "+"], "destra"),
}

FORTI = {"GND", "+3V3", "VBAT"}


# ------------------------------------------------------------ costruzione --
def nuova_scheda():
    b = pcbnew.BOARD()
    b.SetCopperLayerCount(2)
    ds = b.GetDesignSettings()
    ds.m_CopperEdgeClearance = mm(0.3)
    return b


def contorno(b):
    s = pcbnew.PCB_SHAPE(b)
    s.SetShape(pcbnew.SHAPE_T_RECTANGLE)
    s.SetStart(V(0, 0))
    s.SetEnd(V(W, H))
    s.SetCornerRadius(mm(3))
    s.SetLayer(pcbnew.Edge_Cuts)
    s.SetWidth(mm(0.1))
    b.Add(s)
    for i, (x, y) in enumerate(FORI):
        f = pcbnew.FootprintLoad(FP + r"\MountingHole.pretty",
                                 "MountingHole_3.2mm_M3")
        f.SetReference("H%d" % (i + 1))
        f.Reference().SetVisible(False)
        f.Value().SetVisible(False)
        f.SetPosition(V(x, y))
        b.Add(f)


def rete(b, reti, nome):
    if nome not in reti:
        n = pcbnew.NETINFO_ITEM(b, nome)
        b.Add(n)
        reti[nome] = n
    return reti[nome]


def testo(b, s, x, y, h=1.0, ang=0, lato=pcbnew.F_SilkS, giust=0, spessore=None):
    t = pcbnew.PCB_TEXT(b)
    t.SetText(s)
    t.SetLayer(lato)
    t.SetTextSize(pcbnew.VECTOR2I(mm(h), mm(h)))
    t.SetTextThickness(mm(spessore if spessore else max(0.15, h * 0.15)))
    t.SetPosition(V(x, y))
    if ang:
        t.SetTextAngleDegrees(ang)
    if giust < 0:
        t.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_LEFT)
    elif giust > 0:
        t.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_RIGHT)
    if lato == pcbnew.B_SilkS:
        t.SetMirrored(True)
    b.Add(t)
    return t


def linea(b, x0, y0, x1, y1, lato=pcbnew.F_SilkS, w=0.15):
    s = pcbnew.PCB_SHAPE(b)
    s.SetShape(pcbnew.SHAPE_T_SEGMENT)
    s.SetStart(V(x0, y0))
    s.SetEnd(V(x1, y1))
    s.SetLayer(lato)
    s.SetWidth(mm(w))
    b.Add(s)


def xiao(b, reti):
    """L'impronta della XIAO: due file da 7 a 15,24 mm, per due zoccoli
    femmina da 2,54. Con i modelli 3D dei due zoccoli, per l'anteprima."""
    f = pcbnew.FOOTPRINT(b)
    f.SetReference("U1")
    f.SetValue("XIAO ESP32-S3")
    f.Reference().SetVisible(False)
    f.Value().SetVisible(False)
    b.Add(f)
    f.SetPosition(V(*XIAO_C))   # prima delle piazzole: dopo le sposterebbe
    cx, cy = XIAO_C
    for col, lista in ((-7.62, XIAO_SX), (7.62, XIAO_DX)):
        for i, (num, r, _) in enumerate(lista):
            p = pcbnew.PAD(f)
            p.SetAttribute(pcbnew.PAD_ATTRIB_PTH)
            p.SetShape(pcbnew.PAD_SHAPE_RECT if num == "1"
                       else pcbnew.PAD_SHAPE_CIRCLE)
            p.SetSize(pcbnew.VECTOR2I(mm(1.7), mm(1.7)))
            p.SetDrillSize(pcbnew.VECTOR2I(mm(1.0), mm(1.0)))
            p.SetLayerSet(pcbnew.PAD.PTHMask())
            p.SetNumber(num)
            p.SetPosition(V(cx + col, cy - 7.62 + i * 2.54))
            if r:
                p.SetNet(rete(b, reti, r))
            f.Add(p)
    for dx in (-7.62, 7.62):
        m = pcbnew.FP_3DMODEL()
        m.m_Filename = (MOD3D + "/Connector_PinSocket_2.54mm.3dshapes/"
                        "PinSocket_1x07_P2.54mm_Vertical.step")
        m.m_Offset = pcbnew.VECTOR3D(dx, 7.62, 0)   # in mm, Y in su
        f.Add3DModel(m)
    # la sagoma della XIAO, con la freccia dell'USB
    x0, x1, y0, y1 = cx - 8.9, cx + 8.9, cy - 10.5, cy + 10.5
    for a in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        linea(b, *a)
    linea(b, cx - 4.5, y0, cx - 4.5, y0 - 1.3)
    linea(b, cx + 4.5, y0, cx + 4.5, y0 - 1.3)
    linea(b, cx - 4.5, y0 - 1.3, cx + 4.5, y0 - 1.3)
    testo(b, "USB", cx, y0 + 1.6, 1.0)
    testo(b, "XIAO", cx, cy + 2.6, 1.3)
    testo(b, "ESP32-S3", cx, cy + 4.6, 0.8)
    for col, lista, g in ((-7.62, XIAO_SX, -1), (7.62, XIAO_DX, 1)):
        for i, (_, _, et) in enumerate(lista):
            testo(b, et, cx + col - g * 1.4, cy - 7.62 + i * 2.54, 0.8, giust=g)
    return f


def piazza(b, reti):
    fps = {}
    for rif, (lib, nome), val, x, y, rot, mappa in PEZZI:
        f = pcbnew.FootprintLoad(FP + "\\" + lib + ".pretty", nome)
        if f is None:
            sys.exit("impronta mancante: %s:%s" % (lib, nome))
        f.SetReference(rif)
        f.SetValue(val or rif)
        b.Add(f)
        f.SetOrientationDegrees(rot)
        f.SetPosition(V(x, y))
        for p in f.Pads():
            r = mappa.get(p.GetNumber())
            if r:
                p.SetNet(rete(b, reti, r))
        f.Reference().SetVisible(False)
        # il valore sulla serigrafia, in mezzo al corpo: si legge mentre si salda
        if rif[0] in "RC":
            p1, p2 = [da_iu(p.GetPosition()) for p in f.Pads()][:2]
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            vt = f.Value()
            vt.SetLayer(pcbnew.F_SilkS)
            vt.SetVisible(True)
            vt.SetTextSize(pcbnew.VECTOR2I(mm(1.0), mm(1.0)))
            vt.SetTextThickness(mm(0.15))
            if rif[0] == "C":
                vt.SetPosition(V(mx, my - 3.9))
                vt.SetTextAngleDegrees(0)
            else:
                vt.SetPosition(V(mx, my))
                vt.SetTextAngleDegrees(90 if abs(p1[0] - p2[0]) < 0.1 else 0)
        else:
            f.Value().SetVisible(False)
        fps[rif] = f
    return fps


def etichette(b, fps):
    for rif, (nome, piedini, dove) in ETICHETTE.items():
        f = fps[rif]
        pads = sorted(f.Pads(), key=lambda p: int(p.GetNumber()))
        xs = [da_iu(p.GetPosition())[0] for p in pads]
        y = da_iu(pads[0].GetPosition())[1]
        s = -1 if dove == "sopra" else 1
        lunghi = max(len(et) for et in piedini) > 1
        for x, et in zip(xs, piedini):
            if lunghi:
                testo(b, et, x, y + s * 5.2, 0.9, ang=90, spessore=0.15)
            else:
                testo(b, et, x, y + s * 4.6, 1.2)
        if dove == "destra":
            testo(b, nome, xs[-1] + 3.6, y, 1.1, giust=-1)
        elif lunghi:
            testo(b, nome, (xs[0] + xs[-1]) / 2, y + 8.3 if s > 0 else y - 8.6, 1.1)
        else:
            testo(b, nome, (xs[0] + xs[-1]) / 2, y + 6.8 if s > 0 else y - 6.8, 1.1)
    # morsetto della cella
    x1, y1 = da_iu(fps["J9"].Pads()[0].GetPosition())
    testo(b, "CELLA", x1 + 2.54, y1 - 9.4, 1.1)
    testo(b, "-", x1, y1 - 7.0, 1.6)
    testo(b, "+", x1 + 5.08, y1 - 7.0, 1.6)
    # pettine dei piedini liberi
    pads = sorted(fps["J10"].Pads(), key=lambda p: int(p.GetNumber()))
    for p, et in zip(pads, ["G", "3V3", "D2", "D8", "D9", "D10", "TX", "RX"]):
        x, y = da_iu(p.GetPosition())
        testo(b, et, x + 1.6, y, 0.8, giust=-1)
    x, y = da_iu(pads[-1].GetPosition())
    testo(b, "LIBERI", x - 0.4, y + 2.6, 0.9)
    # il chip
    testo(b, "MCP23017", MCP_X + 16.5, MCP_Y + 2.8, 1.0)
    # titolo, sul retro
    testo(b, "SPARKLINGTONES", 26, 53.5, 2.0, lato=pcbnew.B_SilkS)
    testo(b, "basetta del pedale v1 - ottobre 2026", 26, 56.8, 1.2,
          lato=pcbnew.B_SilkS)
    testo(b, "sparklingtones.com", 26, 59.2, 1.2, lato=pcbnew.B_SilkS)


# ---------------------------------------------------------------- router --
G = 0.25                                   # passo della griglia
NX, NY = int(round(W / G)), int(round(H / G))
GONFIA = CLR + PISTA_FORTE / 2 + 0.05      # attorno al rame d'altri


def centro(i, j):
    return ((i + 0.5) * G, (j + 0.5) * G)


class Griglia:
    """own[l][c]: 0 libero, -1 vietato, n > 0 solo per la rete n."""

    def __init__(self):
        self.own = [array("i", [0]) * (NX * NY) for _ in range(2)]
        self.dentro = set()                  # (l, c) dentro una piazzola

    def _celle(self, x0, y0, x1, y1):
        i0, i1 = max(0, int(x0 / G)), min(NX - 1, int(x1 / G) + 1)
        j0, j1 = max(0, int(y0 / G)), min(NY - 1, int(y1 / G) + 1)
        for j in range(j0, j1 + 1):
            for i in range(i0, i1 + 1):
                yield i, j

    def segna(self, strati, forma, gonfia, net, forza=False):
        tipo = forma[0]
        if tipo == "cerchio":
            _, cx, cy, r = forma
            bb = (cx - r, cy - r, cx + r, cy + r)
        elif tipo == "rett":
            _, ax, ay, bx, by = forma
            bb = (ax, ay, bx, by)
        else:                                 # segmento con mezza larghezza
            _, ax, ay, bx, by, hw = forma
            bb = (min(ax, bx) - hw, min(ay, by) - hw, max(ax, bx) + hw, max(ay, by) + hw)
        out = []
        for i, j in self._celle(bb[0] - gonfia, bb[1] - gonfia, bb[2] + gonfia, bb[3] + gonfia):
            px, py = centro(i, j)
            if tipo == "cerchio":
                d = math.hypot(px - cx, py - cy) - r
            elif tipo == "rett":
                dx = max(ax - px, 0, px - bx)
                dy = max(ay - py, 0, py - by)
                d = math.hypot(dx, dy)
                if dx == 0 and dy == 0:
                    d = -min(px - ax, bx - px, py - ay, by - py)
            else:
                vx, vy = bx - ax, by - ay
                ll = vx * vx + vy * vy
                t = 0 if ll == 0 else max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / ll))
                d = math.hypot(px - ax - t * vx, py - ay - t * vy) - hw
            if d > gonfia:
                continue
            c = j * NX + i
            out.append(c)
            for l in strati:
                o = self.own[l]
                if forza or net == -1:
                    o[c] = net
                elif o[c] == 0:
                    o[c] = net
                elif o[c] != net:
                    o[c] = -1
        return out

    def passa(self, l, c, net):
        o = self.own[l][c]
        return o == 0 or o == net


DIRS = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
COSTO_STRATO = (1.0, 1.3)       # sotto costa di piu: li e' la massa
COSTO_VIA = 16.0
GIRO45, GIRO90 = 2.0, 8.0


def forma_pad(p):
    x, y = da_iu(p.GetPosition())
    bb = p.GetBoundingBox()
    x0, y0 = da_iu(pcbnew.VECTOR2I(bb.GetLeft(), bb.GetTop()))
    x1, y1 = da_iu(pcbnew.VECTOR2I(bb.GetRight(), bb.GetBottom()))
    if p.GetShape() == pcbnew.PAD_SHAPE_CIRCLE:
        return ("cerchio", x, y, (x1 - x0) / 2)
    return ("rett", x0, y0, x1, y1)


def astar(gr, net, sorgenti, destinazioni, meta):
    tx, ty = meta
    tix, tjy = tx / G, ty / G
    own = gr.own

    def h(c):
        dx = abs(c % NX + 0.5 - tix)
        dy = abs(c // NX + 0.5 - tjy)
        return 1.25 * (max(dx, dy) + 0.4142 * min(dx, dy))

    aperti = []
    gsc = {}
    da = {}
    for l, c in sorgenti:
        s = (l, c, 8)
        gsc[s] = 0.0
        heapq.heappush(aperti, (h(c), 0.0, s))
    giri = 0
    while aperti:
        f, g, s = heapq.heappop(aperti)
        if g > gsc.get(s, 1e18):
            continue
        l, c, d = s
        if (l, c) in destinazioni:
            cammino = [(l, c)]
            while s in da:
                s = da[s]
                if (s[0], s[1]) != cammino[-1]:
                    cammino.append((s[0], s[1]))
            return cammino[::-1]
        giri += 1
        if giri > 300000:
            return None
        i, j = c % NX, c // NX
        ol = own[l]
        for nd, (dx, dy) in enumerate(DIRS):
            giro = 0.0
            if d != 8:
                k = (nd - d) % 8
                if k in (3, 4, 5):
                    continue
                giro = 0 if k == 0 else (GIRO45 if k in (1, 7) else GIRO90)
            ni, nj = i + dx, j + dy
            if ni < 0 or nj < 0 or ni >= NX or nj >= NY:
                continue
            nc = nj * NX + ni
            o = ol[nc]
            if o != 0 and o != net:
                continue
            if dx and dy:
                o1, o2 = ol[j * NX + ni], ol[nj * NX + i]
                if (o1 != 0 and o1 != net) or (o2 != 0 and o2 != net):
                    continue
                passo = 1.4142
            else:
                passo = 1.0
            ng = g + passo * COSTO_STRATO[l] + giro
            ns = (l, nc, nd)
            if ng < gsc.get(ns, 1e18):
                gsc[ns] = ng
                da[ns] = s
                heapq.heappush(aperti, (ng + h(nc), ng, ns))
        # una via, se c'e' posto su tutti e due gli strati
        if (l, c) not in gr.dentro and 0 < i < NX - 1 and 0 < j < NY - 1:
            ok = True
            for cc in (c, c - 1, c + 1, c - NX, c + NX):
                for ll in (0, 1):
                    o = own[ll][cc]
                    if o != 0 and o != net:
                        ok = False
            if ok:
                ns = (1 - l, c, 8)
                ng = g + COSTO_VIA
                if ng < gsc.get(ns, 1e18):
                    gsc[ns] = ng
                    da[ns] = s
                    heapq.heappush(aperti, (ng + h(c), ng, ns))
    return None


def semplifica(cammino):
    """Celle -> punti d'angolo e vie: [(strato, x, y), ...]."""
    pts = [(l, c % NX, c // NX) for l, c in cammino]
    out = [pts[0]]
    for k in range(1, len(pts) - 1):
        a, b_, c = out[-1], pts[k], pts[k + 1]
        if a[0] != b_[0] or b_[0] != c[0]:
            out.append(b_)
            continue
        d1 = (b_[1] - a[1], b_[2] - a[2])
        d2 = (c[1] - b_[1], c[2] - b_[2])
        n1 = max(abs(d1[0]), abs(d1[1])) or 1
        if (d1[0] / n1, d1[1] / n1) != (d2[0], d2[1]):
            out.append(b_)
    if len(pts) > 1:
        out.append(pts[-1])
    return [(l, (i + 0.5) * G, (j + 0.5) * G) for l, i, j in out]


def collegamenti(pads):
    """Albero minimo fra le piazzole della rete (Prim), dalla piu' vicina."""
    pos = [da_iu(p.GetPosition()) for p in pads]
    dentro = {0}
    archi = []
    while len(dentro) < len(pads):
        best = None
        for a in dentro:
            for k in range(len(pads)):
                if k in dentro:
                    continue
                d = math.dist(pos[a], pos[k])
                if best is None or d < best[0]:
                    best = (d, a, k)
        dentro.add(best[2])
        archi.append((best[0], best[1], best[2]))
    return archi


def instrada(b, reti, ordine_prima=()):
    """Una passata intera: torna (piste, vie, falliti)."""
    gr = Griglia()
    # bordo e viti
    for i in range(NX):
        for j in range(NY):
            px, py = centro(i, j)
            lim = BORDO + PISTA_FORTE / 2 + 0.05
            vic = min(px, py, W - px, H - py)
            # angoli arrotondati (raggio 3)
            for cx, cy in ((3, 3), (W - 3, 3), (3, H - 3), (W - 3, H - 3)):
                if (px < 3 or px > W - 3) and (py < 3 or py > H - 3):
                    vic = min(vic, 3 - math.hypot(px - cx, py - cy)) if \
                        abs(px - cx) <= 3 and abs(py - cy) <= 3 else vic
            if vic < lim:
                for l in (0, 1):
                    gr.own[l][j * NX + i] = -1
    for x, y in FORI:
        gr.segna((0, 1), ("cerchio", x, y, RAGGIO_VITE), GONFIA, -1)
    # piazzole
    pad_celle = {}
    tutte = []
    for f in b.GetFootprints():
        for p in f.Pads():
            if p.GetAttribute() == pcbnew.PAD_ATTRIB_NPTH:
                continue
            tutte.append(p)
    for p in tutte:
        n = p.GetNetCode()
        gr.segna((0, 1), forma_pad(p), GONFIA, n if n > 0 else -1)
    for p in tutte:
        n = p.GetNetCode()
        if n <= 0:
            continue
        fo = forma_pad(p)
        if fo[0] == "cerchio":
            fo = ("cerchio", fo[1], fo[2], max(0.05, fo[3] - 0.3))
        else:
            fo = ("rett", fo[1] + 0.3, fo[2] + 0.3, fo[3] - 0.3, fo[4] - 0.3)
        celle = gr.segna((0, 1), fo, 0.0, n, forza=True)
        pad_celle[id(p)] = celle
        for c in celle:
            gr.dentro.add((0, c))
            gr.dentro.add((1, c))

    per_rete = {}
    for p in tutte:
        if p.GetNetCode() > 0:
            per_rete.setdefault(p.GetNetname(), []).append(p)
    lavori = []
    for nome, pads in per_rete.items():
        if len(pads) < 2:
            continue
        for d, a, k in collegamenti(pads):
            lavori.append((nome, pads[a], pads[k], d))
    # prima i corti; la massa per ultima (c'e' il piano a salvarla)
    def chiave(lv):
        nome, _, _, d = lv
        return (ordine_prima.index(nome) if nome in ordine_prima else 99, nome == "GND", d)
    lavori.sort(key=chiave)

    piste, vie, falliti = [], [], []
    for nome, pa, pb, d in lavori:
        net = reti[nome].GetNetCode()
        sorg = [(l, c) for c in pad_celle[id(pa)] for l in (0, 1)]
        dest = set((l, c) for c in pad_celle[id(pb)] for l in (0, 1))
        meta = da_iu(pb.GetPosition())
        cam = astar(gr, net, sorg, dest, meta)
        if cam is None:
            falliti.append(nome)
            print("  non passa:", nome, pa.GetParentFootprint().GetReference(), pb.GetParentFootprint().GetReference(), flush=True)
            continue
        w = PISTA_FORTE if nome in FORTI else PISTA
        pts = semplifica(cam)
        ax, ay = da_iu(pa.GetPosition())
        bx, by = da_iu(pb.GetPosition())
        pts = [(pts[0][0], ax, ay)] + pts + [(pts[-1][0], bx, by)]
        for k in range(len(pts) - 1):
            (l0, x0, y0), (l1, x1, y1) = pts[k], pts[k + 1]
            if l0 != l1:
                vie.append((nome, x0, y0))
                gr.segna((0, 1), ("cerchio", x0, y0, VIA_D / 2), GONFIA, net)
                continue
            if (x0, y0) == (x1, y1):
                continue
            piste.append((nome, l0, x0, y0, x1, y1, w))
            gr.segna((l0,), ("seg", x0, y0, x1, y1, w / 2), GONFIA, net)
    return piste, vie, falliti, gr


def cucitura(gr, gnd):
    """Vie di massa a griglia, dove c'e' posto su tutti e due i lati."""
    vie = []
    passo = 5.0
    y = 6.0
    while y < H - 5:
        x = 6.0
        while x < W - 5:
            i, j = int(x / G), int(y / G)
            c = j * NX + i
            ok = (0, c) not in gr.dentro
            for cc in (c, c - 1, c + 1, c - NX, c + NX, c - 2, c + 2, c - 2 * NX, c + 2 * NX):
                for l in (0, 1):
                    o = gr.own[l][cc]
                    if o != 0 and o != gnd:
                        ok = False
            if ok:
                px, py = centro(i, j)
                vie.append(("GND", px, py))
                gr.segna((0, 1), ("cerchio", px, py, VIA_D / 2), GONFIA, gnd)
            x += passo
        y += passo
    return vie


def metti_rame(b, reti, piste, vie):
    for nome, l, x0, y0, x1, y1, w in piste:
        t = pcbnew.PCB_TRACK(b)
        t.SetStart(V(x0, y0))
        t.SetEnd(V(x1, y1))
        t.SetWidth(mm(w))
        t.SetLayer(pcbnew.F_Cu if l == 0 else pcbnew.B_Cu)
        t.SetNet(reti[nome])
        b.Add(t)
    for nome, x, y in vie:
        v = pcbnew.PCB_VIA(b)
        v.SetPosition(V(x, y))
        v.SetViaType(pcbnew.VIATYPE_THROUGH)
        v.SetWidth(mm(VIA_D))
        v.SetDrill(mm(VIA_FORO))
        v.SetNet(reti[nome])
        b.Add(v)


def piani_di_massa(b, reti):
    for strato in (pcbnew.F_Cu, pcbnew.B_Cu):
        z = pcbnew.ZONE(b)
        ls = pcbnew.LSET()
        ls.AddLayer(strato)
        z.SetLayerSet(ls)
        z.SetNet(reti["GND"])
        z.SetLocalClearance(mm(0.35))
        z.SetMinThickness(mm(0.3))
        z.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
        z.SetThermalReliefGap(mm(0.5))
        z.SetThermalReliefSpokeWidth(mm(0.5))
        z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
        o = z.Outline()
        o.NewOutline()
        for x, y in ((0.5, 0.5), (W - 0.5, 0.5), (W - 0.5, H - 0.5), (0.5, H - 0.5)):
            p = V(x, y)
            o.Append(p.x, p.y)
        b.Add(z)
    b.BuildConnectivity()
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
    for z in b.Zones():
        print("  massa su", z.GetLayerName(), "riempita %.0f mm2" % (z.GetFilledArea() / 1e12))


def main():
    os.makedirs(FUORI, exist_ok=True)
    prima = ()
    migliore = None
    for giro in range(6):
        b = nuova_scheda()
        reti = {}
        rete(b, reti, "GND")
        contorno(b)
        xiao(b, reti)
        fps = piazza(b, reti)
        piste, vie, falliti, gr = instrada(b, reti, prima)
        segnali = [f for f in falliti if f != "GND"]
        print("giro %d: %d piste, %d vie, falliti: %s" % (giro, len(piste), len(vie), falliti or "nessuno"))
        if migliore is None or len(segnali) < migliore[0]:
            migliore = (len(segnali), b, reti, fps, piste, vie, gr, falliti)
        if not segnali:
            break
        # gli ultimi falliti davanti a tutti
        prima = tuple(dict.fromkeys(list(segnali) + list(prima)))
    _, b, reti, fps, piste, vie, gr, falliti = migliore
    vie = vie + cucitura(gr, reti["GND"].GetNetCode())
    metti_rame(b, reti, piste, vie)
    etichette(b, fps)
    piani_di_massa(b, reti)
    out = os.path.join(FUORI, NOME + ".kicad_pcb")
    pcbnew.SaveBoard(out, b)
    print("scritto", out, "- non tirati:", falliti or "nessuno")


if __name__ == "__main__":
    main()
