# Voice-over script for the demo video (English)

Read this over the English `demo.mp4` (2:27, recorded on 19 October 2026 with the interface of
14–17 October: bottom bar, preset card, drawn editor, circuit buttons, long press). It is split
into the video's scenes; on the left is the moment each one starts. The same text, written for
the synthetic voice, is in `voce-sintetica.mjs`.

The timings are those of that recording: if the script changes, read them again from
`linea.json` (`voce.momenti`).

---

**0:00 — title**
This is SparklingTones.

**0:03 — connecting**
An app to control your Spark from your phone. Tap «Connect»… and in a moment it reads the
eight presets stored in the amp, all by itself.

**0:14 — library**
Below is your library, with all your other sounds. Tap the play button, and the preset goes
to the amp and plays straight away.

**0:23 — preset card**
Every preset has its own card: play it, tweak it, copy it, or write it into a slot.

**0:30 — editor and knobs**
«Tweak» opens the editor. Every pedal and every amp is drawn, and you turn the knobs right
on the drawing… while the amp changes as you play.

**0:41 — swapping a model**
Want a different overdrive? Tap the block twice, and pick another one from the list.

**0:51 — saving**
Nothing is saved until you decide. When you like it: «Save».

**0:56 — live view**
Then there's the live view: big buttons you can hit while you play. The one that's playing
lights up.

**1:04 — banks**
And there are banks: eight sounds of your choice, in any order, taken from your whole
library.

**1:12 — long press**
Hold a button for two seconds, and you're straight into its knobs.

**1:20 — a new bank**
Making one takes a moment. Tap «plus bank», give it a name, say «Rehearsal»… and fill the
spots one at a time: one tap on the spot, one tap on the preset. The banks you make never
write to the amp: its eight presets stay as they are.

**1:39 — the pedal** (black card)
And then there's the pedal. Four footswitches for four sounds; the fifth flips between half
A and half B. The display and the LEDs tell you what's playing.

**1:50 — sending a bank to the pedal**
You build your banks here, at your own pace, and send them to the pedal over Bluetooth:
just hold the pedal's two bank buttons together.

**2:00 — picking the spot**
Choose which bank, and which of the pedal's eight spots. Press «Send to the pedal»… a couple
of seconds, and it's in.

**2:10 — wrapping up**
It stays there, even with the pedal switched off. On stage the pedal talks to the Spark on
its own: your phone can stay at home.

**2:20 — end card**
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
