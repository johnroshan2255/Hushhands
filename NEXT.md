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
mode, clips (C: the last ~20 s as a .webm, on stronger machines), **photo mode** (O: the moment held
still when alone, the screen bare, the camera free with the arrows and + / −, ENTER keeps a .png),
what took you on the end screen. **Graphics** in the settings panel (AUTO, LOW, MEDIUM, HIGH; AUTO is
LOW on phones and weak machines): sharpness changes at once, lights and smooth edges at the title.
**Full screen** from a button in the top right corner (title and play alike; pause and *i* sit beside
it): kept, and taken up again at the first tap after the game opens (an iPhone's browser has none for
a page: tapped there, the button says to add the game to the home screen).
On touch the trial's card and the hint go along the top (the card used to lie on the ground in front
of you, over the Meadow's traps); **Hints** in the settings switches them off (warnings stay).

## What was checked

Headless Chrome, against the built game, with the code-player pressing real keys (first on Windows at
144 Hz; all of it again on 2026-11-27 on a Mac at 60 Hz, which is where the stalls below showed):
- **The whole journey alone, all fifteen chapters, in one run: 0 deaths**, 10 min 30 s of bot time,
  8 of the 12 buttons picked up on the way, end screen *The Whole Doll*.
- **The whole journey together, unbroken from chapter 1, with two, with three and with four: each 0
  deaths**, end screen *Unbroken*, everyone back in the lobby after (11 min 27 s, 11 min 50 s,
  12 min 26 s). What stopped these before was the bots, not the game, and it only showed at 60 Hz:
  the swinger at the Chasm walked back off the far ledge (the thread, still short from the climb,
  tugs you for a frame as you stand up); at the Mill's crate one asked "am I on the crate?" in
  mid-air, for ever; one swam a flash ahead of the rest and was held in the eel's reach by the thread;
  at the moth-dust they came level with the ledge too late and hung just over it (now: drift across
  early and pull up at its lip); three in the Larder ran out of patience before the others had
  reached the last sack, and walked over the meat as the Glutton came up for it; the last of four
  reached a lantern after the others had gathered and gone; the fourth stood on a stair's lip.
- **Found by these runs, in the game, and fixed**: rot reaching a guest threw an error in their
  browser (the server stamps `from` on every relayed event, over the event's own `from`; it is `via`
  now, and the line "the rot came down the thread from…" shows); a body nobody stitched back was
  counted as two deaths, the second under "cold" on the end screen (one now); photo mode opened
  under the pause or *i* panel set the game running behind the panel when left, ESC and I opened
  panels over the bare screen, and together the arrows walked your doll as they moved the camera.
- **Photo mode** (`photo.mjs`), **the worm in the head** (`worm.mjs`, brought up to date with
  chapters and restitch), a guest letting go with three (the two left go on to the end, 0 deaths)
  and the host letting go (`leave.mjs`): pass.
- **Two players through every new chapter** (from the Mill to the end, in stretches): passes, after
  fixes found this way (stale positions from the chapter before, levers further apart than the
  thread, the Granary's lamp lost after a death). The last stretch, the Upturned Loom to the Wind
  ending: 0 deaths, *Unbroken*.
- **Three and four players through every new chapter** (in stretches): pass. The fixes this found:
  the Cistern now shuts only when all of you are inside (it used to shut on the first, leaving the
  rest outside), its wheels are ordered so neighbours on the thread can reach theirs, and the
  moth-dust ledge was lowered a metre so a chain of four can hold one another up to it.
- **Slow machines** (`scripts/playtest/perf.mjs`, Chrome's CPU throttling, the bot playing each
  chapter's busiest stretch, 800×400): with the CPU 4× slower, every chapter holds 144 fps at the
  lowest quality; 12× slower, 21–44 fps (the Fen and the Dye-Works lowest). (On the Mac: 60 of 60
  at 4× slower.)
- **Every screen shape** (`views.mjs`, nine: phones both ways, a small old phone, tablets, desktop,
  square, ultrawide): title, together panel, play and the settings panel all fit.
- Two and four players through the eight original chapters: pass (2: 2 deaths at the shears/bells;
  4: 9 deaths, mostly the shears).
- Restitch between two browsers: one down, the other stitches, play goes on.
- Voice between two browsers (fake microphone): peers connect, volume follows distance.
- Each new creature and place was looked at in screenshots (see the session notes).

## Not checked, or not built

- **Nobody has played the new chapters by hand.** The difficulty is a guess: the bot gets through
  most of them first time, which probably means they are too easy for the bot and about right for a
  person, but that is only a guess. Section 16 asks for a hand-play of each with sound.
- Not built from section 11: the waterwheel and leeches (5), riding a fed Drinker (7), the grain
  chute (8), the scale and the collapsing floor (10), the Puppeteer lifting a doll on its strings
  (11), the hanging lake and rats down the walls (12). (Moth-dust and the upside-down crawler are built.)
- Section 12's remakes are done: the doll, the Collector and the Needle-Crawler are Blender models
  now (the Collector's and the Crawler's long limbs stay procedural, moved by IK).
- A small director is built (each journey's seed changes which traps are sunk and which worms are
  silent; everyone in a room builds from the host's). *Second Thread* is built simply (no Other Doll
  ahead of you any more). *One Thread* (no lanterns inside a chapter) is a kind of journey; **the Daily Thread** is one
  chapter a day with that day's seed and one life, and a board of times kept by the server
  (`/daily`, in memory and `server/daily.json`). Not built: death replays, cosmetics, Twitch votes.
- Low-end devices (section 15): no real phone or old laptop yet (only Chrome's throttling).
- Voice behind strict networks needs a TURN server (only STUN now).
- Clips are video only (no sound).
