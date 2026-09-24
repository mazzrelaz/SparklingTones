# SparklingTones

*[Italiano](README.md) · English*

A personal app to control and organise the presets of a **Positive Grid Spark 2** over
Bluetooth, from the browser. Plus an ESP32 pedal that does the same with your foot.

**→ [mazzrelaz.github.io/SparklingTones](https://mazzrelaz.github.io/SparklingTones/?lang=en)**

> **Personal project, on pause.** It was born to solve a problem of mine and it works
> on my amp. The Spark 2 protocol isn't documented anywhere: here it was reconstructed
> by observing, measuring and verifying on the hardware. If that's what you're looking
> for, the part you need is in [`docs/`](docs/) — see the end of this page.

The app is in Italian and English (the language is chosen in the «More» panel). The
technical documentation is in Italian, except for the protocol, which is also
[in English](docs/protocollo-spark2.en.md).

---

## What it does

**Organises the library.** The Spark 2 holds eight presets at a time; the app holds as
many as you like, with name, categories, notes and sound family, in a database in the
browser. It reads presets from the amp, imports the official app's `preset_backup.zip`,
exports and re-imports as JSON.

**Plays.** A *Live* view with banks of eight big buttons, designed to be used while
playing rather than for cataloguing. A preset already loaded on the amp switches on
instantly; one that isn't there is sent whole in about a second.

**Tweaks.** An effects-chain editor that works **on the sound that's playing**: the knobs
move and the amp answers. It always reads the real state from the amp before opening,
because the truth is there and not in the library.

**Works without a network.** It's a PWA: once installed, it opens and works offline too —
at a gig there's no network.

## What you need

A browser with **Web Bluetooth**: Chrome or Edge on a computer and on Android.
**It doesn't work on iPhone and iPad**, and it isn't Safari's choice: on iOS every browser
has to use Apple's engine, which doesn't have Web Bluetooth.

Nothing else. No account, no server: the library lives in your browser and never
leaves it.

## Running it

There's nothing to build and nothing to install.

```
git clone https://github.com/mazzrelaz/SparklingTones.git
```

Then open `index.html` with a double click. It works from `file://` — that's why the
modules are classic scripts and not ES modules.

Watch out for one thing: `file://` and `https://` are **two different origins**, hence two
different databases. The library doesn't move from one to the other by itself: you export
it to JSON and import it again.

## The pedal

In [`pedale/`](pedale/) there's the firmware for an **ESP32-C3**: it takes the banks from
the app over Bluetooth, keeps them in memory and then runs on its own — it connects to the
amp by itself and changes presets with your foot, no phone needed.

Verified on the hardware, on a bare board with no soldering:

| | measured |
|---|---|
| a whole preset, system connection interval | 1246 ms |
| the same, requesting 7.5 ms | **326 ms** |
| once settled | **178–215 ms** |

The second the phone takes isn't bandwidth: it's sixteen BLE round-trips. Web Bluetooth
doesn't let you touch the connection interval, NimBLE on the ESP32 does, and that makes
all the difference.

**The firmware doesn't serialise anything.** The app produces the frames ready-made and
the pedal fixes a single byte — the sequence number, which the checksum doesn't cover.
There's only one encoder, in JavaScript, covered by the tests.

The pedal is halfway there: it works on a devkit, the real hardware (five footswitches,
two buttons, LEDs, display) hasn't been built yet. `tools/pedale-sim.html` simulates its
face in a page, with the real logic inside.

## The protocol — the part useful to someone else

This is probably why you're here. It's all in
**[`docs/protocollo-spark2.en.md`](docs/protocollo-spark2.en.md)** (Italian original:
[`docs/protocollo-spark2.md`](docs/protocollo-spark2.md)), and the most expensive traps
are summarised in [`CLAUDE.md`](CLAUDE.md) (Italian).

GATT: service `0xFFC0`, write `0xFFC1` (*write without response* only), notify `0xFFC2`.
Messages `F0 01 <seq> <checksum> <cmd> <sub> <packed data> F7`, with the data encoded
7/8 bit and floats in big endian.

What cost the most to find out:

- **Effect commands want a trailing `0x00` byte.** Without it, the amp replies with a
  regular ack and **doesn't apply the command**. It isn't documented by any source, and
  it's a Spark 2 difference.
- **25-byte chunks, not 128.** With 128 the Spark 2 disconnects.
- **All the chunks of a preset go with the same sequence number**, otherwise the amp
  acknowledges them all and assembles none.
- **`0x0127` doesn't save on the Spark 2**, in any of the forms tried.
- **Playing a preset and saving it to a slot are two different routes**, and the second
  needs a there-and-back hop that looks like decoration and isn't.
- **The ack confirms receipt, not execution.** And `writeWithoutResponse` makes every
  write look successful: the absence of errors is not a verification.

The looper can be controlled (`0x0175`), except for the count-in bar with the click: that
investigation is closed, and everything that was ruled out is in
[`docs/looper.md`](docs/looper.md) (Italian), so nobody walks down seven dead ends again.

The raw captures from the amp are in [`captures/`](captures/).

## Tests

Open the pages in `test/`. They run against real captures from the amp, so they catch a
regression in the encoding without having the hardware at hand.

| | |
|---|---|
| `protocol-test.html` | 125 tests — encoder and decoder, byte-for-byte round-trip |
| `transport-test.html` | 48 tests — send queue and reassembly |
| `store-test.html` | 99 tests — library, banks, categories |
| `backup-test.html` | 33 tests — reading the official app's zip |

## Warnings

**Writing to an amp slot can't be undone.** Whatever was there before is lost.

**The amp can freeze**, and then you have to unplug it. It happens with heavy commands —
rebuilding a DSP block, or turning the knobs faster than the radio can carry.

**The list of effect models isn't verified**: it comes from a third-party catalogue, and
asking the amp for a model it doesn't have is one of the ways to freeze it. The app tells
apart the ones it has seen come out of your amp from the ones merely assumed.

**Tested on a single Spark 2.** With another unit, or another firmware, I don't know what
happens.

## Licence and credits

MIT, Massimo Togni. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

- The effect and knob names come from the
  **[Soundshed](https://github.com/soundshed/soundshed-app)** catalogue (MIT).
- The reference for the BLE protocol is
  **[paulhamsh/Spark](https://github.com/paulhamsh/Spark)** (Apache 2.0), whose sources
  are in [`reference/`](reference/).
- **[Ignitron](https://github.com/stangreg/Ignitron)** by stangreg is an ESP32 pedal for
  the Spark, and that's where the looper commands come from.

**No affiliation with Positive Grid Inc.** It's not an official product, it's not
approved or supported, and it uses none of their code. «Spark» and «Positive Grid» are
mentioned only to say what it works with.
