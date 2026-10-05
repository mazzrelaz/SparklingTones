# Voice-over script for the demo video (English)

Read this over the English `demo.mp4` (2:09). It is split into the video's scenes; on the
left is the moment each one starts. Each piece fits its slot when read calmly, about two and
a half words a second; the dots are pauses.

The timings are those of the English recording of 5 October 2026: if the script changes,
read them again from `linea.json` (each caption has its own `t`).

---

**0:00 — title**
This is SparklingTones.

**0:03 — connecting**
An app to control your Spark from your phone. Tap «Connect»… and in a moment it reads the
eight presets stored in the amp, all by itself.

**0:12 — library**
Below is your library, with all your other sounds. Tap the red triangle, and the preset goes
to the amp and plays straight away.

**0:21 — preset card**
Every preset has its own card: name, sound family, categories and notes.

**0:27 — editor and knobs**
«Tweak» opens the editor: the whole effects chain, from noise gate to reverb. Turn a
knob… and the amp changes while you play.

**0:37 — swapping a model**
Want a different overdrive, or another amp? Pick it from a list, and next to it you see
which pedal or amp it's modelled on.

**0:47 — saving**
Nothing is saved until you decide. When you like it: «Save».

**0:54 — live view**
Then there's the live view: big buttons you can hit while you play. The sound changes
instantly.

**1:03 — banks**
And there are banks: eight sounds of your choice, in any order, taken from your whole
library.

**1:11 — a new bank**
Making one takes a moment. Tap «plus bank», give it a name, say «Rehearsal»… and fill the
spots one at a time: one tap on the spot, one tap on the preset. The banks you make never
write to the amp: its eight presets stay as they are.

**1:31 — the pedal** (black card)
And then there's the pedal. Four footswitches for four sounds; the fifth flips between half
A and half B. The display and the LEDs tell you what's playing.

**1:43 — sending a bank to the pedal**
You build your banks here, at your own pace, and send them to the pedal over Bluetooth:
just hold the pedal's two bank buttons together.

**1:51 — picking the spot**
Choose which bank, and which of the pedal's eight spots. Press «Send»… a couple of
seconds, and it's in.

**1:59 — wrapping up**
It stays there, even with the pedal switched off. On stage the pedal talks to the Spark on
its own: your phone can stay at home.

**2:05 — end card**
SparklingTones: free, works offline, with the Spark 2 and the Spark NEO.

---

## How to record it

1. A quiet room with no echo (an open wardrobe full of clothes works wonders).
2. Phone voice recorder about twenty centimetres from your mouth, slightly to the side, so
   the «p»s don't pop.
3. Play the video muted on the computer and start reading when the title appears. If a
   piece runs long, drop a sentence: the captions already say the rest.
4. If you slip, start again from the top: it's two minutes.
5. The audio is then put on the video: write `voce.json` (how much to cut at the start and
   when each piece begins, taken from the pauses in the recording) in the output folder and
   redo the video with `node tools/video-demo/registra.js <folder> en --voce voce.json`.
   The scenes wait for the voice, not the other way round.
