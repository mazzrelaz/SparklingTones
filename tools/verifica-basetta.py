# -*- coding: utf-8 -*-
"""Controlla la basetta contro i collegamenti attesi, scritti a parte da
genera-basetta.py. Col Python di KiCad:
    python.exe tools\verifica-basetta.py pcb\basetta\basetta-pedale.kicad_pcb
"""
import pcbnew, sys
b = pcbnew.LoadBoard(sys.argv[1])
# Atteso, scritto a parte: XIAO (U1, numeri Seeed: 1..7 = D0..D6, 8 = D7, 9 = D8,
# 10 = D9, 11 = D10, 12 = 3V3, 13 = GND, 14 = 5V); MCP23017 DIP-28 dal datasheet
# (1-8 GPB0-7, 9 VDD, 10 VSS, 12 SCL, 13 SDA, 15-17 A0-A2, 18 RESET, 21-28 GPA0-7).
A = {
 "GND": "U1.13 U2.10 U2.15 U2.16 U2.17 J1.1 J2.1 J3.1 J4.1 J5.1 J6.1 J7.1 J8.1 J9.1 J10.1 R5.2 C1.2 C2.2",
 "+3V3": "U1.12 U2.9 R1.1 R2.1 R3.1 J5.2 J10.2 C1.1 C2.1",
 "VBAT": "J8.2 J9.2 R4.1",
 "VSENSE": "U1.1 R4.2 R5.1",
 "SDA": "U1.5 U2.13 R1.2 J5.4",
 "SCL": "U1.6 U2.12 R2.2 J5.3",
 "RESET": "U2.18 R3.2",
 "LED_T": "U1.2 R6.1", "LED_T_R": "R6.2 J6.2",
 "CLIC": "U1.4 R7.1", "CLIC_R": "R7.2 J7.2",
 "D2": "U1.3 J10.3", "D8": "U1.9 J10.4", "D9": "U1.10 J10.5", "D10": "U1.11 J10.6",
 "TX": "U1.7 J10.7", "RX": "U1.8 J10.8",
 "FS1": "J1.2 U2.27", "FS2": "J1.3 U2.26", "FS3": "J1.4 U2.25", "FS4": "J1.5 U2.24",
 "FS5": "J2.2 U2.23", "SX": "J2.3 U2.22", "DX": "J2.4 U2.21",
}
for i in range(8):
    A["GPB%d" % i] = "U2.%d R%d.1" % (i + 1, 8 + i)
for i, j in enumerate("J3.2 J3.3 J3.4 J3.5 J4.2 J4.3 J4.4 J4.5".split()):
    A["LED%d" % i] = "R%d.2 %s" % (8 + i, j)
LIBERI = set("U1.14 U2.11 U2.14 U2.19 U2.20 U2.28".split())
VALORI = {"R1": "4k7", "R2": "4k7", "R3": "10k", "R4": "100k", "R5": "100k", "R6": "330", "R7": "330",
          "C1": "100n", "C2": "10u"}
for i in range(8):
    VALORI["R%d" % (8 + i)] = "330" if i % 2 == 0 else "560"   # pari = rosso
rete_di = {}
for f in b.GetFootprints():
    for p in f.Pads():
        if p.GetNumber():
            rete_di["%s.%s" % (f.GetReference(), p.GetNumber())] = p.GetNetname()
errori = 0
visti = set()
for nome, s in A.items():
    pads = s.split()
    reti = {rete_di.get(p, "??") for p in pads}
    if len(reti) != 1 or "" in reti or "??" in reti:
        print("SBAGLIATO", nome, [(p, rete_di.get(p)) for p in pads]); errori += 1; continue
    r = reti.pop()
    altri = sorted(k for k, v in rete_di.items() if v == r and k not in pads)
    if altri:
        print("IN PIU' su", nome, altri); errori += 1
    visti |= set(pads)
for p in LIBERI:
    if rete_di.get(p):
        print("DOVREBBE ESSERE LIBERO", p, rete_di[p]); errori += 1
resto = sorted(k for k in rete_di if k not in visti and k not in LIBERI)
if resto:
    print("PIAZZOLE NON PREVISTE", resto); errori += 1
for f in b.GetFootprints():
    r = f.GetReference()
    if r in VALORI and f.GetValue() != VALORI[r]:
        print("VALORE", r, f.GetValue(), "atteso", VALORI[r]); errori += 1
print("piazzole controllate:", len(rete_di), "- errori:", errori)
