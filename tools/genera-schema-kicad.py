# -*- coding: utf-8 -*-
"""Genera lo schema elettrico della scheda portante del pedale, per KiCad 10.

Lo stile e' quello dei connettori: niente fili fra un pin e l'altro, ma
un'etichetta di rete su ogni pin. Su una scheda che e' quasi tutta zoccoli e
connettori si legge meglio, e soprattutto e' generabile senza sbagliare.
"""
import os
import re
import uuid

KICAD = r"C:\Program Files\KiCad\10.0\share\kicad\symbols"
FUORI = os.environ["SCRATCH"]

# ----------------------------------------------------------- le librerie --


def leggi(percorso):
    with open(percorso, encoding="utf-8") as f:
        return f.read()


def estrai_simbolo(testo, nome):
    """Ritaglia il blocco (symbol "nome" ...) contando le parentesi."""
    ago = '(symbol "%s"' % nome
    i = testo.find(ago)
    if i < 0:
        raise SystemExit("simbolo non trovato: " + nome)
    liv = 0
    j = i
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
                    return testo[i:j + 1]
        j += 1
    raise SystemExit("blocco non chiuso: " + nome)


def pin_del_simbolo(blocco):
    """{numero: (x, y)} — l'`at` di un pin e' il suo punto di connessione."""
    fuori = {}
    for m in re.finditer(
            r"\(pin\s+\w+\s+\w+\s*\(at\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\)"
            r".*?\(number\s+\"([^\"]+)\"", blocco, re.S):
        x, y, n = float(m.group(1)), float(m.group(2)), m.group(3)
        fuori[n] = (x, y)
    return fuori


LIB = {
    "Connector_Generic": leggi(os.path.join(KICAD, "Connector_Generic.kicad_sym")),
    "Device": leggi(os.path.join(KICAD, "Device.kicad_sym")),
}

# --------------------------------------------------------- i componenti --
# (riferimento, libreria, simbolo, valore, x, y, {pin: rete})

def conn(n):
    return "Conn_01x%02d" % n


PEZZI = [
    # Tutte le etichette vanno a SINISTRA: questi connettori hanno i pin solo
    # da quel lato, e mettendole a destra finirebbero sopra il simbolo.
    # Le colonne sono spaziate 70 mm, che e' quanto serve al testo per stare
    # comodo alla sinistra del suo connettore.

    # --- colonna 1: XIAO fila A, batteria, partitore ---------------------
    ("J1", "Connector_Generic", conn(7), "XIAO S3 - fila A", 60, 50, {
        "1": "VSENSE", "2": "D1", "3": "D2", "4": "D3_INTA",
        "5": "SDA", "6": "SCL", "7": "D6_TX"}),
    ("J10", "Connector_Generic", conn(2), "dalla cella", 60, 125, {
        "1": "VBAT", "2": "GND"}),
    ("J11", "Connector_Generic", conn(2), "fili a BAT+/BAT- della XIAO", 60, 150, {
        "1": "VBAT", "2": "GND"}),
    ("R1", "Device", "R", "200k", 60, 185, {"1": "VBAT", "2": "VSENSE"}),
    ("R2", "Device", "R", "200k", 60, 210, {"1": "VSENSE", "2": "GND"}),

    # --- colonna 2: XIAO fila B, condensatori ----------------------------
    ("J2", "Connector_Generic", conn(7), "XIAO S3 - fila B", 130, 50, {
        "1": "+5V_NC", "2": "GND", "3": "+3V3", "4": "D10",
        "5": "D9", "6": "D8", "7": "D7_RX"}),
    ("C1", "Device", "C", "470n - filtro lettura batteria", 130, 185, {
        "1": "VSENSE", "2": "GND"}),
    ("C2", "Device", "C", "47n - disaccoppiamento espansore", 130, 210, {
        "1": "+3V3", "2": "GND"}),

    # --- colonna 3: espansore --------------------------------------------
    ("J3", "Connector_Generic", conn(8), "MCP23017 - fila di controllo", 200, 50, {
        "1": "GND", "2": "GND", "3": "D3_INTA", "4": "+3V3",
        "5": "GND", "6": "+3V3", "7": "SDA", "8": "SCL"}),
    ("J4", "Connector_Generic", conn(10), "MCP23017 - port A", 200, 120, {
        "1": "GND", "2": "PA0", "3": "PA1", "4": "PA2", "5": "PA3",
        "6": "PA4", "7": "PA5", "8": "PA6", "9": "PA7", "10": "GND"}),

    # --- colonna 4: lati corti dell'espansore e display -------------------
    ("J5", "Connector_Generic", conn(4), "MCP23017 - PB0..PB3", 270, 50, {
        "1": "PB0", "2": "PB1", "3": "PB2", "4": "PB3"}),
    ("J6", "Connector_Generic", conn(4), "MCP23017 - PB4..PB7", 270, 90, {
        "1": "PB4", "2": "PB5", "3": "PB6", "4": "PB7"}),
    ("J7", "Connector_Generic", conn(4), "al display", 270, 130, {
        "1": "+3V3", "2": "GND", "3": "SCL", "4": "SDA"}),

    # --- colonna 5: verso il coperchio -----------------------------------
    ("J8", "Connector_Generic", conn(10), "ai 7 pulsanti", 340, 50, {
        "1": "GND", "2": "PA0", "3": "PA1", "4": "PA2", "5": "PA3",
        "6": "PA4", "7": "PA5", "8": "PA6", "9": "PA7", "10": "GND"}),
    ("J9", "Connector_Generic", conn(10), "agli 8 LED", 340, 130, {
        "1": "GND", "2": "PB0", "3": "PB1", "4": "PB2", "5": "PB3",
        "6": "PB4", "7": "PB5", "8": "PB6", "9": "PB7", "10": "GND"}),
]

# ------------------------------------------------------------ scrittura --

usati = []
for _, lib, sim, *_ in PEZZI:
    if (lib, sim) not in usati:
        usati.append((lib, sim))

blocchi = []
pin_di = {}
for lib, sim in usati:
    b = estrai_simbolo(LIB[lib], sim)
    pin_di[(lib, sim)] = pin_del_simbolo(b)
    b = b.replace('(symbol "%s"' % sim, '(symbol "%s:%s"' % (lib, sim), 1)
    blocchi.append(b)

PROG = "pedale-spark"
righe = []
a = righe.append
a("(kicad_sch")
a('\t(version 20250610)')
a('\t(generator "eeschema")')
a('\t(generator_version "10.0")')
a('\t(uuid "%s")' % uuid.uuid4())
a('\t(paper "A3")')
a('\t(title_block')
a('\t\t(title "Pedale Spark 2 - scheda portante")')
a('\t\t(rev "bozza")')
a('\t\t(comment 1 "Zoccoli per XIAO S3 e MCP23017, connettori verso il coperchio")')
a('\t)')
a('\t(lib_symbols')
for b in blocchi:
    a(b)
a('\t)')

for rif, lib, sim, val, x, y, reti in PEZZI:
    u = str(uuid.uuid4())
    a('\t(symbol')
    a('\t\t(lib_id "%s:%s")' % (lib, sim))
    a('\t\t(at %g %g 0)' % (x, y))
    a('\t\t(unit 1)')
    a('\t\t(exclude_from_sim no)(in_bom yes)(on_board yes)(dnp no)')
    a('\t\t(uuid "%s")' % u)
    alto = max(v[1] for v in pin_di[(lib, sim)].values())
    a('\t\t(property "Reference" "%s" (at %g %g 0)'
      '(effects (font (size 1.27 1.27) (bold yes)) (justify left)))' % (rif, x - 2.54, y - alto - 8))
    a('\t\t(property "Value" "%s" (at %g %g 0)'
      '(effects (font (size 1.27 1.27)) (justify left)))' % (val, x - 2.54, y - alto - 5.2))
    for n in sorted(pin_di[(lib, sim)], key=lambda s: int(s)):
        a('\t\t(pin "%s" (uuid "%s"))' % (n, uuid.uuid4()))
    a('\t\t(instances (project "%s" (path "/%s" (reference "%s") (unit 1))))'
      % (PROG, u, rif))
    a('\t)')

    px = pin_di[(lib, sim)]
    for n, rete in reti.items():
        if n not in px:
            raise SystemExit("%s: pin %s inesistente" % (rif, n))
        ax = x + px[n][0]
        ay = y - px[n][1]
        giust = "right"
        rot = 180
        a('\t(label "%s" (at %g %g %d)'
          '(effects (font (size 1.27 1.27)) (justify %s bottom))'
          '(uuid "%s"))' % (rete, ax, ay, rot, giust, uuid.uuid4()))

a(')')

os.makedirs(FUORI, exist_ok=True)
with open(os.path.join(FUORI, PROG + ".kicad_sch"), "w", encoding="utf-8") as f:
    f.write("\n".join(righe) + "\n")

with open(os.path.join(FUORI, PROG + ".kicad_pro"), "w", encoding="utf-8") as f:
    f.write('{\n  "board": {},\n  "meta": {"filename": "%s.kicad_pro", '
            '"version": 3},\n  "sheets": [],\n  "text_variables": {}\n}\n' % PROG)

print("scritto:", os.path.join(FUORI, PROG + ".kicad_sch"))
print("componenti:", len(PEZZI))
reti_tutte = sorted({r for *_, reti in PEZZI for r in reti.values()})
print("reti (%d): %s" % (len(reti_tutte), ", ".join(reti_tutte)))
