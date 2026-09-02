# -*- coding: utf-8 -*-
"""Genera la scheda (PCB) della scheda portante del pedale, per KiCad 10.

Primo passo: **disposizione**, non sbroglio. Contorno, fori di fissaggio,
sagome dei componenti al loro posto e reti assegnate a ogni piazzola. Le
piste vengono dopo, quando la disposizione convince: spostare un connettore
dopo aver tirato le piste vuol dire rifarle.
"""
import os
import re
import uuid

FP = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
FUORI = os.environ["SCRATCH"]
PROG = "pedale-spark"

# ------------------------------------------------------------ la scheda --
# Il vano libero nella scatola e' 100 x 64 mm; qui si sta larghi apposta,
# perche' su una PCB lo spazio costa pochissimo e la comodita' di saldare
# molto. Origine in alto a sinistra, Y verso il basso (convenzione KiCad).
X0, Y0 = 100.0, 60.0
LARG, ALT = 95.0, 60.0

PH = "Connector_PinHeader_2.54mm"
MH = "MountingHole"


def ph(n):
    return (PH, "PinHeader_1x%02d_P2.54mm_Vertical" % n)


RES = ("Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal")
CAP = ("Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm")
FORO = (MH, "MountingHole_2.7mm_M2.5")

# (rif, footprint, valore, x, y, rotazione, {pad: rete})
PEZZI = [
    # Tutto senza rotazione: i pin corrono verso il basso, e cosi' la
    # posizione scritta e' quella del pin 1. Margine minimo dal bordo: 4 mm.
    ("J1", ph(7), "XIAO S3 fila A", 110, 70, 0, {
        1: "VSENSE", 2: "D1", 3: "D2", 4: "D3_INTA",
        5: "SDA", 6: "SCL", 7: "D6_TX"}),
    ("J2", ph(7), "XIAO S3 fila B", 125.24, 70, 0, {
        1: "+5V_NC", 2: "GND", 3: "+3V3", 4: "D10",
        5: "D9", 6: "D8", 7: "D7_RX"}),

    ("J3", ph(8), "MCP23017 controllo", 145, 68, 0, {
        1: "GND", 2: "GND", 3: "D3_INTA", 4: "+3V3",
        5: "GND", 6: "+3V3", 7: "SDA", 8: "SCL"}),
    ("J4", ph(10), "MCP23017 port A", 160.24, 66, 0, {
        1: "GND", 2: "PA0", 3: "PA1", 4: "PA2", 5: "PA3",
        6: "PA4", 7: "PA5", 8: "PA6", 9: "PA7", 10: "GND"}),
    ("J5", ph(4), "MCP PB0-PB3", 174, 68, 0, {
        1: "PB0", 2: "PB1", 3: "PB2", 4: "PB3"}),
    ("J6", ph(4), "MCP PB4-PB7", 182, 68, 0, {
        1: "PB4", 2: "PB5", 3: "PB6", 4: "PB7"}),
    ("J7", ph(4), "al display", 190, 68, 0, {
        1: "+3V3", 2: "GND", 3: "SCL", 4: "SDA"}),

    ("J10", ph(2), "dalla cella", 108, 95, 0, {1: "VBAT", 2: "GND"}),
    ("J11", ph(2), "a BAT+/BAT- XIAO", 108, 105, 0, {1: "VBAT", 2: "GND"}),
    ("R1", RES, "200k", 120, 95, 0, {1: "VBAT", 2: "VSENSE"}),
    ("R2", RES, "200k", 120, 105, 0, {1: "VSENSE", 2: "GND"}),
    ("C1", CAP, "470n", 137, 95, 0, {1: "VSENSE", 2: "GND"}),
    ("C2", CAP, "47n", 137, 105, 0, {1: "+3V3", 2: "GND"}),

    ("J8", ph(10), "ai 7 pulsanti", 152, 93, 0, {
        1: "GND", 2: "PA0", 3: "PA1", 4: "PA2", 5: "PA3",
        6: "PA4", 7: "PA5", 8: "PA6", 9: "PA7", 10: "GND"}),
    ("J9", ph(10), "agli 8 LED", 165, 93, 0, {
        1: "GND", 2: "PB0", 3: "PB1", 4: "PB2", 5: "PB3",
        6: "PB4", 7: "PB5", 8: "PB6", 9: "PB7", 10: "GND"}),

    ("H1", FORO, "M2.5", X0 + 4, Y0 + 4, 0, {}),
    ("H2", FORO, "M2.5", X0 + LARG - 4, Y0 + 4, 0, {}),
    ("H3", FORO, "M2.5", X0 + 4, Y0 + ALT - 4, 0, {}),
    ("H4", FORO, "M2.5", X0 + LARG - 4, Y0 + ALT - 4, 0, {}),
]

# ------------------------------------------------------------- aiutanti --


def blocco(testo, inizio):
    """Ritaglia il blocco s-expression che comincia a `inizio`."""
    liv = 0
    j = inizio
    in_str = False
    while j < len(testo):
        c = testo[j]
        if c == '"' and testo[j - 1] != "\\":
            in_str = not in_str
        elif not in_str:
            if c == "(":
                liv += 1
            elif c == ")":
                liv -= 1
                if liv == 0:
                    return testo[inizio:j + 1]
        j += 1
    raise SystemExit("blocco non chiuso")


def carica(lib, nome):
    p = os.path.join(FP, lib + ".pretty", nome + ".kicad_mod")
    with open(p, encoding="utf-8") as f:
        return f.read()


# reti: 0 e' sempre la rete vuota
reti = ["", ]
for _, _, _, _, _, _, m in PEZZI:
    for r in m.values():
        if r not in reti:
            reti.append(r)


def prepara(testo, lib, nome, rif, val, x, y, rot, mappa):
    """Adatta un .kicad_mod a stare dentro un .kicad_pcb."""
    t = testo
    t = t.replace('(footprint "%s"' % nome, '(footprint "%s:%s"' % (lib, nome), 1)
    # posizione e identificativo, subito dopo il generatore
    m = re.search(r'\(layer "F\.Cu"\)', t)
    inserto = '(layer "F.Cu")\n\t(uuid "%s")\n\t(at %g %g%s)' % (
        uuid.uuid4(), x, y, (" %g" % rot) if rot else "")
    t = t[:m.start()] + inserto + t[m.end():]
    # sigla e valore veri
    t = re.sub(r'\(property "Reference" "REF\*\*"', '(property "Reference" "%s"' % rif, t, 1)
    t = re.sub(r'\(property "Value" "[^"]*"', '(property "Value" "%s"' % val, t, 1)
    # reti sulle piazzole
    fuori = []
    i = 0
    while True:
        m = re.search(r'\(pad "([^"]+)"', t[i:])
        if not m:
            fuori.append(t[i:])
            break
        s = i + m.start()
        fuori.append(t[i:s])
        b = blocco(t, s)
        lung = len(b)
        num = m.group(1)
        try:
            chiave = int(num)
        except ValueError:
            chiave = num
        rete = mappa.get(chiave)
        if rete:
            b = b[:-1] + '\n\t\t(net %d "%s")\n\t)' % (reti.index(rete), rete)
        fuori.append(b)
        i = s + lung
    return "".join(fuori)


# ------------------------------------------------------------ scrittura --

r = []
a = r.append
a("(kicad_pcb")
a('\t(version 20250513)')
a('\t(generator "pcbnew")')
a('\t(generator_version "10.0")')
a('\t(general (thickness 1.6) (legacy_teardrops no))')
a('\t(paper "A4")')
a('\t(title_block (title "Pedale Spark 2 - scheda portante") (rev "bozza"))')
a('\t(layers')
for n, (nome, tipo) in enumerate([
        ("F.Cu", "signal"), ("B.Cu", "signal")]):
    a('\t\t(%d "%s" %s)' % (0 if nome == "F.Cu" else 2, nome, tipo))
for n, nome in [(9, "F.Adhes"), (11, "F.Paste"), (13, "F.SilkS"), (15, "F.Mask"),
                (8, "B.Adhes"), (10, "B.Paste"), (12, "B.SilkS"), (14, "B.Mask"),
                (16, "Dwgs.User"), (17, "Cmts.User"), (18, "Eco1.User"),
                (19, "Eco2.User"), (20, "Edge.Cuts"), (21, "Margin"),
                (22, "B.CrtYd"), (23, "F.CrtYd"), (24, "B.Fab"), (25, "F.Fab")]:
    a('\t\t(%d "%s" user)' % (n, nome))
a('\t)')
a('\t(setup (pad_to_mask_clearance 0))')
for i, nome in enumerate(reti):
    a('\t(net %d "%s")' % (i, nome))

for rif, (lib, nome), val, x, y, rot, mappa in PEZZI:
    a("\t" + prepara(carica(lib, nome), lib, nome, rif, val, x, y, rot, mappa))

# contorno della scheda, con gli angoli smussati di 3 mm
S = 3.0
punti = [
    (X0 + S, Y0), (X0 + LARG - S, Y0), (X0 + LARG, Y0 + S),
    (X0 + LARG, Y0 + ALT - S), (X0 + LARG - S, Y0 + ALT),
    (X0 + S, Y0 + ALT), (X0, Y0 + ALT - S), (X0, Y0 + S),
]
for i in range(len(punti)):
    x1, y1 = punti[i]
    x2, y2 = punti[(i + 1) % len(punti)]
    a('\t(gr_line (start %g %g) (end %g %g)'
      '(stroke (width 0.1) (type solid)) (layer "Edge.Cuts")'
      '(uuid "%s"))' % (x1, y1, x2, y2, uuid.uuid4()))

for testo, x, y in [
        ("PEDALE SPARK 2 - scheda portante", X0 + 10, Y0 + ALT - 2.5)]:
    a('\t(gr_text "%s" (at %g %g) (layer "F.SilkS") (uuid "%s")'
      '(effects (font (size 1.5 1.5) (thickness 0.25)) (justify left)))'
      % (testo, x, y, uuid.uuid4()))

# piano di massa sul retro: e' quello che rende una scheda una scheda
a('\t(zone (net %d) (net_name "GND") (layers "B.Cu") (uuid "%s")'
  '(hatch edge 0.5) (connect_pads (clearance 0.5))'
  '(min_thickness 0.25) (filled_areas_thickness no)'
  '(fill (thermal_gap 0.5) (thermal_bridge_width 0.75))'
  '(polygon (pts %s)))'
  % (reti.index("GND"), uuid.uuid4(),
     " ".join("(xy %g %g)" % p for p in punti)))

a(")")

os.makedirs(FUORI, exist_ok=True)
fuori = os.path.join(FUORI, PROG + ".kicad_pcb")
with open(fuori, "w", encoding="utf-8") as f:
    f.write("\n".join(r) + "\n")
print("scritto:", fuori)
print("scheda %g x %g mm, %d pezzi, %d reti" % (LARG, ALT, len(PEZZI), len(reti) - 1))
