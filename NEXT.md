# What is left

State on 2026-11-27. The whole journey of `STORY.md` is now playable: **fifteen chapters**, alone
and together, from the cold open in the Scrap Pit to the choice at the top of the Moth Tower, with
saves at every lantern. This file says what was built, what was checked, and what is still to do.
`DESIGN.md` is the plan this follows; its section numbers are used below.

## Run it

```
npm install
npm run build && PORT=2568 node server/index.js     # the game and the rooms on http://localhost:2568
```

(2567 is used by another project on this machine; anywhere else, `npm run play` serves on 2567.)

## What is built

**Phase 0: foundation**
- Chapters as files (`src/chapters/`), each built for 1 to 4, ending at an arch everyone walks
  through; the card between chapters (the last chapter's lines, the next one's name).
- Saves (`src/save.js`): three journeys, silent at every lantern and chapter; *Continue*, *Journeys &
  Chapters* (every chapter reached); together, the one who leads picks where to set out from (their
  journey, or any chapter reached); guests keep a copy.
- Bodies that stay (`src/gore.js`): a death per killer (folded in a trap, cut in two, lifted on the
  needle, drained grey and flat, stripped to nothing, drowned, flattened…), red dye and stuffing,
  splashes on the ground's edge, kept for the chapter. *Full* or *Stitched* in settings.
- The Blender pipeline (`art/blender/`, section 12): the Drinker, the rat, the Glutton's jaws, the
  Moth Mother, modelled by script and exported as parts the game animates itself.

**Phases 1 to 4: the new chapters**
- 5 **The Drowned Mill**: swimming and breath, diving under a wall, a floating crate pushed across a
  pool, eels that flash (a wet thread shocks everyone tied), the **Cistern** that locks and floods
  while every wheel is turned at once (some under water by then), the sluice rising behind you.
- 7 **The Fen of Drinkers**: giant mosquitoes that hunt light; mud smothers your glow; lure them
  into candle flames; latched on, hammer JUMP or a friend tears it off; the bog, stone to stone.
- 8 **The Granary of Gnawers**: a floor of rats wherever it is dark (one mesh, hundreds of rats),
  lamps to carry (and toss: you cannot jump holding one), the tide of rats up the silo.
- 9 **The Dye-Works**: fumes (hold your breath), rot-blooms that put the rot in you, rot that creeps
  down the thread into the others, clean water to wash it, vats of red, presses on a beat.
- 10 **The Larder**: the Glutton under the boards, creaking boards, sacks to hide in, meat knocked
  off the hooks as bait, the poisoned sack that kills it.
- 11 **The Marionette Theatre**: the Puppeteer's sweeping eye, grubs that swap your controls, a
  door only a puppet opens, cutting the strings (the theatre swings).
- 12 **The Upturned Loom** (`src/rooms.js`): a hall hung upside down (you walk its underside, the
  camera turns over), a drum turned by its lever (hold fast or fall its height), a gallery that
  turns on a beat and lets you out only the right way up.
- 15 **The Moth Tower**: ledge to ledge up the shaft, moths that eat cloth (burn them off at a
  flame), the Moth Mother rising beneath you; at the top the Weaver, the Spindle, the crack of
  daylight, and the choice: **Wind**, **Cut**, or with all twelve buttons **Unpick**. A split group
  snaps the thread and the most of them have their way.

**The mysteries**: the cold open (a doll taken before you can move); the Other Doll, always ahead,
in your colour; tally marks at every lantern, more the higher you go; the twelve lost buttons, each
with its line (counted on the end screen and in the *i* panel).

**Together** (section 10): **restitch** (a death is not the end at once: six seconds for a friend to
reach the body and hold USE; the downed can twitch to show where they are), pings and emotes (1–4),
**proximity voice** (WebRTC, off by default, distance, water and death change it).

**Reach**: captions for the sounds that matter, achievements (eleven), phone vibration, streamer
mode, clips (C: the last ~20 s as a .webm, on stronger machines), what took you on the end screen.

## What was checked

Headless Chrome on Windows, against the built game, with the code-player pressing real keys:
- **The whole journey alone, all fifteen chapters, in one run: 0 deaths**, 10 min 22 s of bot time,
  8 of the 12 buttons picked up on the way, end screen *The Whole Doll*.
- **Two players through every new chapter** (from the Mill to the end, in stretches): passes, after
  fixes found this way (stale positions from the chapter before, levers further apart than the
  thread, the Granary's lamp lost after a death). The last stretch, the Upturned Loom to the Wind
  ending: 0 deaths, *Unbroken*.
- **Slow machines** (`scripts/playtest/perf.mjs`, Chrome's CPU throttling, the bot playing each
  chapter's busiest stretch, 800×400): with the CPU 4× slower, every chapter holds 144 fps at the
  lowest quality; 12× slower, 21–44 fps (the Fen and the Dye-Works lowest).
- **Every screen shape** (`views.mjs`, nine: phones both ways, a small old phone, tablets, desktop,
  square, ultrawide): title, together panel, play and the settings panel all fit.
- Two and four players through the eight original chapters: pass (2: 2 deaths at the shears/bells;
  4: 9 deaths, mostly the shears).
- A single unbroken two-player run from chapter 1 has not finished yet: the two bots sometimes stall
  at the Mill's crate (one fails to get from the crate to the ledge) or in the Fen (both wait for a
  Drinker to notice them). Both are the test bots' coordination; every chapter has been passed by
  two players in stretches.
- Restitch between two browsers: one down, the other stitches, play goes on.
- Voice between two browsers (fake microphone): peers connect, volume follows distance.
- Each new creature and place was looked at in screenshots (see the session notes).

## Not checked, or not built

- **Nobody has played the new chapters by hand.** The difficulty is a guess: the bot gets through
  most of them first time, which probably means they are too easy for the bot and about right for a
  person, but that is only a guess. Section 16 asks for a hand-play of each with sound.
- **The new chapters with 3 and 4 players** have not been run by the bots (2 players have). The
  rules scale (more Drinkers, more moths, valves and levers per player, lamps for 3–4), but untried.
- Not built from section 11: the waterwheel and leeches (5), riding a fed Drinker (7), the grain
  chute (8), the scale and the collapsing floor (10), the Puppeteer lifting a doll on its strings
  (11), the hanging lake, rats down the walls and the upside-down crawler (12). (Moth-dust is built.)
- Section 12's remakes: the Collector and the Needle-Crawler now wear Blender bodies (their limbs
  stay procedural); the doll itself is still built in code.
- A small director is built (each journey's seed changes which traps are sunk and which worms are
  silent; everyone in a room builds from the host's). *Second Thread* is built simply (no Other Doll
  ahead of you any more). *One Thread* (no lanterns inside a chapter) is a kind of journey; **the Daily Thread** is one
  chapter a day with that day's seed and one life, and a board of times kept by the server
  (`/daily`, in memory and `server/daily.json`). Not built: death replays, cosmetics, Twitch votes,
  photo mode.
- Low-end devices (section 15): no real phone or old laptop yet (only Chrome's throttling).
- Voice behind strict networks needs a TURN server (only STUN now).
- Clips are video only (no sound).
