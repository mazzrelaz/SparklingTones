# The Spark 2 protocol — the details and how we got there

*[Italiano](protocollo-spark2.md) · English*

> English translation of [`protocollo-spark2.md`](protocollo-spark2.md). The Italian
> original is the reference and may be newer. The other documents mentioned here
> (`HANDOFF-2026-08-10.md`, `looper.md`, `CLAUDE.md`) are in Italian only.

Moved here from `CLAUDE.md` on 14 August 2026. `CLAUDE.md` keeps the traps that must never
be forgotten; **this is where the why lives**, with the measurements that established
them. The details of commands, data types and original captures are in
`HANDOFF-2026-08-10.md`.

## Facts verified on the wire

GATT: service `0xFFC0`, write `0xFFC1` (writeWithoutResponse only), notify `0xFFC2`.
Notifications arrive fragmented: reassemble by looking for `F0` … `F7`.

Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <packed data> F7`

- checksum = 8-bit XOR of the packed data bytes only (bits8 included), excluding the
  header and `F7`
- 7/8-bit encoding: every 7 real bytes are preceded by a `bits8` byte holding the MSBs,
  **LSB-first**
- parameter values = float32 **big endian** with prefix `0xCA`, range 0.0–1.0

Encoder and decoder are validated: they reproduce the payload of a real capture from the
amp byte for byte, checksum included. If a write fails, **don't look for the bug there**.

`f0` and `f7` can't appear inside a message, because the data bytes are packed to 7 bits
and stay below `0x80`, `bits8` uses seven of them, and the checksum is an XOR of those.
That's what makes it safe to restart the reassembler at every `f0`.

## The trailing `0x00` byte — a Spark 2 difference

**Effect commands require a `0x00` byte at the end of the logical payload.** Without it,
the amp replies with a regular ack (`0x04nn`) but **doesn't apply the command**: silence
isn't refusal, it's a missing execution.

It isn't documented by any source: neither in Hamshere's protocol nor in paulhamsh/Spark,
both written for the Spark 40.

The amp always puts it in its own messages. Comparison on `bias.reverb`:

```
amp 0x0315:  0b ab "bias.reverb" c3 00
our 0x0115:  0b ab "bias.reverb" c2 00     <- identical except on/off
amp 0x0337:  0b ab "bias.reverb" 00 ca 3f 5c 1f dc 00
```

`0x0138` (preset change), `0x0175` (looper) and `0x0176` (looper settings) work
**without** the trailing byte: so it isn't a universal requirement. It's probably an
extra argument the Spark 2 expects on commands that refer to an effect.

**On `0x0176` the extra byte isn't harmless, and it's the proof that silence isn't the
only way to get it wrong** (28 August 2026). Settings sent **with** the trailing byte: the
bpm doesn't change *and* the delay goes into **infinite repeat** — the amp read the fields
shifted and derived an out-of-range delay time from them. You recover by pressing a
preset button on the panel, which reloads all the effect parameters. With the byte
removed, the same write works. Two things to remember from this:

- **a malformed payload can move something unrelated**, not just be ignored. This holds
  for every new command: try it with the amp on a preset you don't mind losing.
- **the «trailing `0x00` byte» checkbox of the probes must be checked before every test.**
  In the tempo bench of `tools/looper-probe.html` it's now bypassed: exactly Ignitron's
  payload is sent, so one variant at a time stays one variant at a time.

## The tempo (bpm) can be written, and the effects go with it

**`0x0176` writes the bpm**, verified on the amp on 28 August 2026. It's the looper
settings command — the one Ignitron uses in `updateLooperSettings` — and the fields are
`<bpm> <count> <bars> <freeIndicator> <click> <flag3> <duration>`, with the `0xcc`
prefix above 127 exactly as when reading.

**The payload is built from the last `0x0376` the amp sent, changing only the bpm.** Not
from a constant: the last field changes shape from one session to another — seen as
`cd ea 60` (uint16 60000) on 13 August and `3c` (60) on the 28th — so the only safe
version is to give it back its own.

Why it matters beyond the looper: when TAP is pressed the amp sends **three** messages
together — `0x0363` (bpm), `0x0376` (settings) and `0x0337` on parameter 4 of
`DelayRe201`. That is, **the tempo is already coupled to the effects inside the amp**,
and mapping bpm → knob position isn't our job.

## Ack

`0x04nn` with the same sub-command and sequence as the command received. **The ack
confirms receipt, not execution.**

`writeWithoutResponse` is the only mode supported by `0xFFC1`, so every write looks
successful on the browser side even when the amp discards it. **The absence of errors is
not a verification.** The only valid proof is the audible/visible effect on the amp or a
response on RX.

For the same reason there's `Spark.controllaPreset`: before sending a preset it checks
that it's serialisable — non-numeric values, text fields that aren't text, arrays beyond
the 15 of a fixarray, out-of-range indices. A malformed payload is acknowledged chunk by
chunk and then ignored, and the symptom is indistinguishable from a broken connection.

## Preset format (0x0301) — decoded and verified

It arrives over several chunks (16 for a typical preset). Each chunk, after the 7/8
unpacking, starts with a 3-byte sub-header: `[total chunks, index, useful bytes]`.
Concatenating the `useful bytes` of all the chunks in index order gives the payload:

```
bank (int), number (int), UUID (long string 36), name, version, description,
icon, BPM (float), array[7] of effects, two unknown floats, checksum
```

Each effect: `name (string), active (bool), array[n] of parameters`.
Each parameter: `index (int), constant 0x91, value (float 0..1)`.

The `0x91` between index and value is invariant and of unknown meaning.

**The two trailing floats are only there on saved presets** (on preset 0 they're 9990.0
and 0.5): the live state ends directly with the checksum. `parsePreset` reads as many
floats as it finds and keeps them in `preset.tail`, so re-serialisation stays faithful in
both cases. When writing they aren't sent (`serializePreset` with `{omitTail: true}`),
because `create_preset` doesn't write them and the amp doesn't use them for the live
state.

`serializePreset` is the exact inverse of `parsePreset`: a test checks that
re-serialising preset 0 reproduces the payload **byte for byte**. That's the guarantee
that the structure is interpreted correctly even where we don't know its semantics — if
someone breaks the parser, the round-trip breaks immediately.

## Writing a preset (0x0101)

Multi-chunk, with the same sub-header `[total, index, useful bytes]` the amp uses when
reading. Chunks are sent one at a time waiting for the ack — `0x0401` on the intermediate
ones, `0x0501` on the last — because the firmware blocks further sends until it has
acknowledged the previous one (`ok_to_send`, SparkIO.ino:1251). An ack that doesn't arrive
**is no reason to stop**: the firmware itself unblocks after half a second
(SparkIO.ino:139-142), and stopping would leave the preset half-written.

**Chunk size: 25 bytes of payload, not 128.** `SparkChunkOut` uses 128, but it's meant for
an ESP32 negotiating a large MTU: 128 bytes of payload become a 154-byte message in a
single BLE write, and at that point the Spark 2 **disconnects** instead of replying. 25 is
the size the amp chooses when it's the one sending a preset, and it produces 39-byte
messages, identical to its notifications. The largest verified working size for writing is
44 bytes.

The final checksum is the sum modulo 256 of the payload **excluding the first two bytes**
and itself. Verified on two captures: on preset 0 (`bank 0, number 0`) the two rules
coincide, but on the live state (`bank 1`) they don't — and the amp declares `0x4c`, which
is the sum without the first two bytes. Including them would give `0x4d`.

**All the chunks of a preset go with the same sequence number.** That's how the amp sends
its own presets, and it's by seq that incoming chunks are grouped: if its reassembler
works the same way, incrementing the seq on every chunk — as `ChunkOut::process` does for
the Spark 40 — makes it see N unrelated, incomplete messages, which it acknowledges all
without assembling any. `writePreset` accepts `{incrementSeq: true}` to go back to the
Spark 40 behaviour.

The sequence counter for app→amp messages stays between `0x01` and `0x3e`
(SparkIO.ino:1116-1119).

### The two routes, and why they differ

```
play a preset          -> 0x0101 to [0x00, 0x7f], then 0x0138 with 0x7f
save it to a slot n    -> 0x0101 to [0x00, n], then 0x0138 to another slot and 0x0138 to n
```

**This cost half a day.** Playing a preset goes through the software buffer `0x7f`;
saving it to a slot **doesn't go through it at all**: the slot is addressed directly in the
first two bytes of the payload, and then you change preset and come back. Both verified
on the amp, the second on 12 August 2026.

The there-and-back hop isn't decoration: without it, the slot keeps reporting the old
content. It's written this way in the reference too (`Spark.ino:113-124`), where
`create_preset` addresses `[0x00, preset_num]` (`SparkIO.ino:1025-1026`) and is followed by
`delay(100)` and **two** `change_hardware_preset`. `storePreset` does exactly this, with
300 ms between steps.

Writing to `[0x01, 0x00]` has no effect: it's a valid address for reading, not for
writing. When reading, `0x0201` with `[0x00, n]` reads slot n and with `[0x01, 0x00]` the
active sound (`Spark.slotTarget(n)` and `Spark.LIVE_TARGET`).

`loadPreset` doesn't overwrite any saved slot: it's the safe way to try a preset.

**While the amp plays the software preset the LED blinks** and indicates no slot: it's how
it signals that the active sound doesn't match a saved preset, the same thing it does when
a sound is edited from the official app. It isn't a malfunction. That's why `storePreset`
selects the slot after saving it: otherwise the preset is saved but the amp keeps playing
the buffer.

### `0x0127` doesn't work on the Spark 2

All four forms tried on the amp — `[0x00, n]`, `[0x7f, n]`, `[0x00, n, 0x00]`,
`[0x7f, n, 0x00]` — regular ack for each and the slot unchanged. It's the same way of
failing as the effect commands before the trailing `0x00` byte was discovered, but here no
trailing byte saves it. The 11 August note that gave `storePreset` as verified was wrong;
the command has been removed from the code.

How we got there, because the method matters more than the conclusion: first we isolated
that the **transfer** worked (the amp played the new preset from the buffer) and that only
the saving was missing; then one form at a time was tried, **verifying each with a
re-read of the slot**, because the ack says nothing.

## Hardware presets

**The Spark 2 has 8 slots, numbered 0–7**, all readable with `0x0201`. The 0–3 range in
the documentation applies to the Spark 40. The `6` the amp reported as the current preset
was simply slot 6, not an anomaly.

The panel, however, has **4 two-colour LEDs, not 8**: red for bank A (slots 0–3), green for
bank B (slots 4–7). Slot 5 lights up as the second green LED. `Spark.slotLabel(n)` does the
conversion and the UI shows `A1`…`B4`.

So the suspicion that the activated preset didn't match the number sent falls away: it
always matched, it was the reading of the panel that was different.

## Hypotheses ruled out by direct measurement

- **License key** — `0x0138` works without it ever having been sent. (Careful: this holds
  for `0x0138`, not for everything. See `looper.md`.)
- **Bit order in the 7/8 encoding** — the mask starts at `0x80`, goes to `1` and doubles
  (`SparkIO.ino:1069-1083`), LSB-first like ours; and our packer reproduces a real capture
  byte for byte.
- **Message length, MTU, fragmentation, block header** — a sweep on `0x0201` with growing
  legitimate padding (10 → 44 bytes): a reply at *every* length, both with a single write
  and with a 20-byte split, without a block header. The amp sends 39-byte notifications, so
  the negotiated MTU is large.
- **7/8-bit encoding when writing** — `0x0115` with `bits8 = 0x02` and `0x40` is accepted
  and acknowledged. The encoding works in both directions.
- **The software buffer has nothing to do with the model change** — a preset was sent to
  the `0x7f` buffer as «Tweak» does and variant A tried again: the model changes anyway.
  `0x0106` works in both states.

## Open

- `0x022a` (read preset checksum) never answers, with or without the `0x94` fixarray:
  it probably doesn't exist on the Spark 2.
- `0x031a`, undocumented, emitted while the knobs move: decodes as
  `array[1] 0 <current preset> true`.

## Changing a block's model (0x0106) — the ten variants

`tools/model-probe.html` tried ten variants on the real amp, each verified by re-reading
the chain:

| variant | form | result |
|---|---|---|
| **A** | prefixed + trailing `0x00` — the one the app already sends | **works** |
| B | no trailing byte, like the Spark 40 | no effect |
| C | two trailing `0x00` | works |
| D, E | short strings `0xa0+len` without the length byte | no effect |
| F, G | chain position at the start or at the end | no effect |
| H | the new name only | no effect |
| I | A, then `0x0115` switching it back on | works |
| J | names swapped | no effect |

So: **`0x0106` also wants the trailing `0x00` byte**; **the strings must be the prefixed
ones** `[len, 0xa0+len, …]`; and **the first name is the model that's there now**, the
second the new one — the reference's order (`Spark.ino:157`), not the reverse.

**The bug in the app was a different one, and the lesson holds in general.** The command
went out with **the wrong old name**. `0x0106` says «in place of this one put that one»:
if the first name isn't really in the chain, the amp ignores everything without a word.
The editor took it from what it had on screen, and the screen may have fallen behind — a
re-read that came back empty, the sound changed from the official app, a knob turned on the
amp. **It took just once, and from then on every change failed, always.** Now the old name
is re-read from the amp even before sending the command (`aggiornaCatenaDallAmpli`), and if
that read fails nothing is sent.

Verified in the app on the hardware on 13 August 2026: three changes in a row
(`MaestroBassmaster → JH.SupaFuzz → JH.Octavia → DistortionTS9`), each confirmed by
re-reading the chain, with a single read per change.

## When the amp «stops responding»

On 13 August 2026: two successful model changes, then every `0x0201` read came back as
*no complete answer, 0 chunks*, forever, until reconnecting.

`MessageAssembler.feed` had two ways of getting stuck, both with the same symptom:

- `this.buffer = []` came **after** `onMessage(...)`: if a listener threw an exception, the
  buffer stayed there holding an already-delivered message and every subsequent byte got
  appended to it.
- a lost BLE fragment left a truncated message that merged with the next one.

Now the buffer is emptied **before** delivering, and an `f0` always starts from scratch.
Two tests check it — a listener that blows up, and a stub followed by a whole message. The
reassembler is covered for real: a whole preset, sixteen messages in a row, split into
fragments of 1, 7, 20, 39 and 100 bytes. With a single short message — the only test there
was before — a wrong reassembler passes anyway.

**That wasn't the cause that evening.** The new number said so right away: on the next try,
`0 good chunks, 0 messages received in all` — **the amp had really frozen, and it took
unplugging it**. `_readPresetVia` always reports how many messages arrived during the wait
(`rxTotali`): 0 means a silent amp or a dead connection, more than 0 means it's talking and
we're the ones discarding. Without that number the two cases look the same and lead in
opposite directions — it cost an evening.

**What froze the amp we don't know**, but what we throw at it has been reduced. The model
change had got up to **two reads per change**: the chain is now re-read only if we no
longer trust the one we have (`inModifica.attendibile`), and the wait after `0x0106` went
from 500 ms to one second. Rebuilding a DSP block is the heaviest command we send it, and
the read that follows — sixteen messages — is the most demanding reply: firing them in
bursts was the only new thing in that session.

## Parameters that aren't knobs

**The number of parameters of an effect changes from preset to preset.** In the eight
captures of `captures/2026-08-10-libreria-8-preset.json` the noise gate has two parameters
on three presets and **three** on the other five; the reverb seven and eight, on the same
five. The extra parameter is always the last one and is worth **exactly 1**, in all ten
cases.

**We know what it is: the block's on/off.** Measured on the amp on 13 August 2026 on the
noise gate and on the reverb, identical both times:

- from 0.00 to 0.49 the gate doesn't work, from 0.50 to 1.00 it does — threshold at half;
- the value, however, **isn't rounded**: written 0.50, read back 0.50. It's a float stored
  as-is and read as a boolean, not a boolean;
- switching the block off with `0x0115`, **the amp writes 0 there by itself**: it's the
  same switch seen from another side;
- and **in the official app that parameter doesn't appear**, because there's already the
  switch there.

**How the measurement was reached is the reusable piece:** «at zero the gate doesn't
gate» doesn't distinguish a switch from a depth knob — at zero both are silent. The way to
tell them apart is to **write a value in between and see what the amp gives back**: if it
had rounded it, it would be a switch. That's where the «Re-read from the amp» button in the
editor came from, and it serves every measurement of this kind.

With this the old-versus-new firmware hypothesis falls: the extra parameter isn't a
leftover, it's **the state of the switch also written inside the parameter array**. Why
some presets have it and some don't remains open, but now it's a question about how those
presets were born, not about what that value is.

## The reverb type is the seventh parameter

It isn't a model: in the list of models there's only one reverb, `bias.reverb`. **The amp
has a single reverb effect for all types** (HANDOFF §3.10), so the type must be a
parameter. That it's the seventh is told by the values: in the eight presets read from the
amp it's 0, 0.1, 0.2 or 0.3, always an exact multiple of a tenth, and no other knob of any
other effect behaves like that. There are nine types, as many as Soundshed's
`bias.reverb.N`.

**Verified on the amp on 13 August 2026**: changing position in the list really changes the
reverb.

**The nine names were dictated by the user**, read from the official app: Room Studio A,
Chamber, Hall Natural, Plate Short, Hall Ambient, Plate Rich, Hall Medium, Plate Long, Room
Studio B. **The order, however, isn't confirmed.** That the app's list follows the parameter
values is plausible and nothing contradicts it, but nobody has verified it. If one day it
turned out to be shifted, it's enough to listen to two types far apart (a Plate and a Room),
and the fix is a rotation of the list, not a hunt.

Reverb parameter 0 is confirmed another way: turning the physical knob, the amp sends
`bias.reverb` parameter 0 (HANDOFF §3.6).

## Differences found compared with paulhamsh/Spark (working BLE)

Comparison with `reference/paulhamsh/SparkESP32_SparkIO.ino`:

- `BlockOut::process()` (line 1202) **always** prepends the 16-byte block header, over BLE
  too, with `out_block[6]` = total length of the block
- `sp_write()` does **a single** `writeValue(buf, len, false)` per whole block (up to 173
  bytes) — no manual 20-byte split
- `change_hardware_preset(curr_preset, preset_num)` (line 910): despite its name, the first
  parameter is **not** the current preset. Every real call passes a literal `0`
  (`Spark.ino:319, 333`). Passing the detected current preset breaks the command.
- `oc_seq` starts at `0x01` and is an independent counter, not synchronised with the amp's
  seq

## Extract from CLAUDE.md, 2 September 2026 — protocol, long version

## Protocol — what must never be forgotten

Details, derivations and measurements: `docs/protocollo-spark2.md`.

GATT: service `0xFFC0`, write `0xFFC1` (**writeWithoutResponse only**), notify `0xFFC2`.
Fragmented notifications: reassemble by looking for `F0` … `F7`.
Chunk: `F0 01 <seq> <checksum> <cmd> <sub> <packed data> F7`.

Status: **complete and verified on the amp**. `0x0201` read, `0x0138` preset change,
`0x0115` effect on/off, `0x0104` parameter change, `0x0101` sending a whole preset.

**The traps, all verified on the hardware:**

- **`0x0115`, `0x0104` and `0x0106` want a `0x00` byte at the end of the logical payload.**
  Without it, regular ack and command not applied. `0x0138`, `0x0175` and `0x0176` don't —
  and on `0x0176` the extra byte **isn't harmless**: the bpm doesn't change and **the delay
  goes into infinite repeat** (28 August 2026), because the amp reads the fields shifted.
  You recover by pressing a preset button on the panel. So **a malformed payload can move
  something unrelated**, not just be ignored.
- **The bpm is written with `0x0176`, and the tempo-based effects follow by themselves**
  (verified on 28 August 2026). The payload is built **from the last `0x0376` received**
  changing only the bpm, never from a constant: the last field changes shape between
  sessions (`3c` versus `cd ea 60`). The amp's TAP sends `0x0363`, `0x0376` and `0x0337` on
  parameter 4 of `DelayRe201` together: the tempo→effects coupling is inside the amp, not
  our job. Details in `docs/protocollo-spark2.md`.
- **The ack confirms receipt, not execution.** And `writeWithoutResponse` makes every write
  look successful on the browser side. **The absence of errors is not a verification**: only
  the effect on the amp or a response on RX count.
- **25-byte payload chunks, not 128.** With 128 the Spark 2 **disconnects**. The largest
  verified for writing is 44.
- **All the chunks of a preset go with the same sequence number.**
- **`0x0127` doesn't save on the Spark 2**, in all four forms tried. Removed.
- **Long BLE writes must be split**: the official app sends every message in 20-byte ATT
  writes and the amp reassembles by itself. `transport.sendSpezzato(command, 20)`. Above
  ~44 bytes a single write disappears **silently**, without even the ack.
- **Changing a parameter of an effect that's off produces no sound.** Check first that the
  effect is on.
- **`0x0106` wants the name of the model that's there *now***, re-read from the amp, not
  the one on screen. If it's wrong, the amp ignores everything without a word — and from
  then on every change fails forever.
- **The amp can really freeze**, and then you have to unplug it. `rxTotali` distinguishes
  the two cases: 0 messages = silent amp or dead connection; more than 0 = it's talking and
  we're discarding. Without that number the two cases look the same — it cost an evening.
- **The Hendrix effects (`JH.*`) don't play until the official app unlocks them**, and
  there's nothing we can do about it. Observed by the user on 26 August 2026: the `JH.*`
  sent from our app stay silent — «Hey Jimi Solo» plays without fuzz and with the wrong
  amp, even written to a slot — and **not even the amp's panel unlocks them** (he believed
  it for a moment and changed his mind). **Connecting the official app** is enough instead:
  from then on everything works, and **the unlock stays in the amp even after the official
  app has disconnected**. He did buy the pack.
  It's the Spark 2's only paid content, and what enables it is the **license key
  `0x0170`** the official app sends as soon as it connects. **It can't be forged**: unpacked
  from the two captures in `captures/2026-08-14-app-ufficiale-looper.txt` it's **exactly 64
  bytes, completely different between the two sessions**, i.e. a signature with a nonce in
  it — and when replayed the amp rejects it (`0x0470` with `fe` instead of `00 00`, see
  `docs/looper.md`). Extracting the key from the official app is circumventing protection of
  paid content and isn't done.
  In the official app the Hendrix sounds are visible **only after logging in**, but
  **logging in from our app would be useless, and that's measured**: in the capture the app
  sends the key **14 ms after** the amp's reply to `0x022f` — twice, at 0.060 s and at
  589.246 s — and a network round trip doesn't fit in 14 ms. And if it were a token taken
  from the server at login, the two connections would send the same one; instead they
  differ. **The app signs it locally, with a key it carries inside.** It follows that **the
  amp doesn't verify the purchase: it verifies a signature** — it has no account and
  doesn't talk to the internet. Login serves the official app to *show* the sounds, not the
  amp to enable them.
  **The thing to remember is that it isn't our bug**, so nobody goes back over it.
  And one lesson remains that holds beyond the Hendrix effects: **the re-read chain confirms
  the model's name, not that the block plays** — that's what had «verified» the change to
  `JH.SupaFuzz` on 13 August, while the fuzz was silent.

**The two routes for writing a preset are different**, and this cost half a day:

```
play a preset          -> 0x0101 to [0x00, 0x7f], then 0x0138 with 0x7f
save it to a slot n    -> 0x0101 to [0x00, n], then 0x0138 to another slot and 0x0138 to n
```

The there-and-back hop isn't decoration: without it, the slot reports the old content.
`loadPreset` doesn't overwrite any slot: it's the safe way to try a preset.
**While the amp plays the software preset the LED blinks** and indicates no slot — it isn't
a malfunction.

**The Spark 2 has 8 slots, 0–7** (the documentation's 0–3 applies to the Spark 40), but the
panel has **4 two-colour LEDs**: red bank A (0–3), green bank B (4–7).
`Spark.slotLabel(n)` does the conversion and the UI shows A1…B4.

**No authentication is required, and since 28 August 2026 that's measured, not assumed**:
the license key `0x0170` **enables the paid content, not the commands**. With the amp truly
unlocked — the official app connected first, without unplugging — the looper count-in stays
ignored exactly as when the key wasn't there. The Hendrix effects want it, the protocol
doesn't. See `docs/looper.md`.

**Looper**, in two lines: it's controlled with `0x0175` and one byte (`04` rec, `05` stop
rec, `08` play, `09` stop, `0b` dub, `0c` stop dub, `0a` delete); position (`0x0377`), bpm
(`0x0363`) and settings (`0x0376`) can be read. **The count-in bar with the click can't be
commanded, and it's no longer an open hypothesis**: `02` gets the ack and is thrown away,
and on 28 August 2026 the last remaining explanation about the bytes (the key) fell too.
**But it isn't closed**, and the reason is the one the user gave: if the app starts it,
there's a way. What's finished is the list of hypotheses about the *bytes*; **the channel
had never been looked at** — `leggi-btsnoop.ps1` concatenated all the writes, throwing away
**ATT handle and opcode**, so «bytes identical to the app's» was verified and «on the same
channel» wasn't. Half of it is already closed: **`0xFFC1` declares only
`writeWithoutResponse`**, and the **GATT map taken with nRF Connect** says it's **the only
writable thing on the whole device** (28 August 2026, all in `docs/looper.md`). The app had
no other route: same channel, same opcode, same bytes. And **the paradox is real**, measured
on 28 August 2026: REC pressed in the official app, hands away from the panel, **it counts
in** — so it wasn't a finger on the amp. **So the difference is in who sends, not in what
is sent.** **Bonding** is ruled out by construction: the probe run **on the same phone**
that makes the amp count in with the official app fails just the same. What's left is **the
authorised session**, and that's the conclusion: the unlock of the sounds stays in the amp,
but a flag «this client sent a valid key» is per connection, and in no test did we ever have
one. **So the way exists and it's the `0x0170` key, and it isn't a door we open** — it would
mean extracting a signing key from the official app. The table of everything that was
eliminated is in `docs/looper.md`, «Come si conclude». **Don't add probes on the bytes.**
The only thing left to do would be **to ask Ignitron**, which sends COUNTIN without any key:
if it works for them, the conclusion falls.

### Rules of method, which hold beyond the looper

- **A listening capture tells you what the amp says, not what it accepts.** The names of
  third-party enums describe the *state the amp entered*, not a button to press: that the
  panel notifies `02` doesn't mean `02` can be sent. The two directions must be measured
  separately.
- **Record first and interpret afterwards, never the other way round.** A probe that asks
  you to declare in advance what you're about to do produces logs that lie as soon as the amp
  does something else.
- **Fake data must not end up in a capture.** It's marked `demo`, doesn't count in the RX
  totals and the export discards it.
- Every test must be verified **by reading back from the amp**, one variant at a time.
- **Instrument before hypothesising.** The counters — raw edges versus accepted presses —
  closed in one session a problem that had been guessed at for two.


## Extracts from CLAUDE.md, 17 September 2026 — long version

What follows was in `CLAUDE.md` until 17 September 2026 and was shortened there. It's copied
word for word: it stands as the state of that day, not as today's truth.

**The Hendrix effects (`JH.*`) don't play until the official app unlocks them**, and there's
nothing we can do about it: they're enabled by the **license key `0x0170`**, which the
official app signs locally and which **can't be forged** (64 different bytes every session,
i.e. a signature with a nonce; and when replayed the amp rejects it). Connecting the official
app once is enough, and **the unlock stays in the amp** even after it has disconnected. **The
amp doesn't verify the purchase, it verifies a signature**: it has no account and doesn't talk
to the internet, so logging in from our app would be useless — and that's measured.
Extracting the key from the official app is circumventing protection of paid content and **isn't
done**. The thing to remember is that **it isn't our bug**. The whole reasoning is in
`docs/protocollo-spark2.md` and `docs/looper.md`.

**No authentication is required for the commands, and that's measured**: with the amp truly
unlocked, the looper count-in stays ignored exactly as when the key wasn't there. The Hendrix
effects want it, the protocol doesn't.

**Looper**: it's controlled with `0x0175` and one byte (`04` rec, `05` stop rec, `08` play,
`09` stop, `0b` dub, `0c` stop dub, `0a` delete); position (`0x0377`), bpm (`0x0363`) and
settings (`0x0376`) can be read. **The count-in bar with the click can't be commanded**: `02`
gets the ack and is thrown away. Everything that was eliminated — channel, opcode, bonding,
bytes — is in `docs/looper.md`, «Come si conclude»; the conclusion is that **the way exists
and it's the `0x0170` key, and it isn't a door we open**. **Don't add probes on the bytes.**
The only thing left would be **to ask Ignitron**, which sends COUNTIN without any key: if it
works for them, the conclusion falls.
