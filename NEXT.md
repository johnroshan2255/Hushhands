# What is left

**The full game is planned in `STORY.md` (the story, 15 chapters, about 2 hours) and `DESIGN.md` (saves,
1 to 4 players, creatures, Blender, every device, the order of work). Start there: phase 0.**

State on 2026-11-26 (second pass, on Windows). The game is playable start to end, alone and with 2, 3
or 4 players over the network, and a group survives someone leaving. This file lists what was
checked, what was not, and what still needs building.

## Run it

```
npm install
npm run play            # builds, then serves the game and the rooms on http://localhost:2567
```

On the same Wi-Fi, open `http://<this computer's IP>:2567` on a phone.
For development: `npm run dev` (port 5173) plus `PORT=2567 node server/index.js` for the rooms;
the page then needs `?server=ws://localhost:2567`.
If 2567 is taken (another project's server was on it here), use `PORT=2568 node server/index.js` after
`npm run build`, and point the tests at it with `TB_URL=http://localhost:2568`.

## What was checked (headless Chrome only, Windows, 144 Hz)

All against the production build served by `server/index.js`, each in one unbroken run:

- `npm test`'s three parts: the thread sim, alone start to end, two players start to end.
- Alone: 0 deaths, end screen "THE WHOLE DOLL".
- Two players through the real menu and lobby: 0 deaths, back to the lobby afterwards.
- **Three players** (new): 0 deaths, back to the lobby. The Loom builds 3 plates, 3 levers, 3 rings,
  glass carries 2.
- Four players: 1 death (at the Collector), back to the lobby.
- **A player leaving mid-journey** (new, `scripts/playtest/leave.mjs`): 3 → 2 at the chasm and
  2 → 1 in the worm tunnel both retie the thread from the last lantern (alone: with a spool) and go on
  to the end. **The host leaving**: the guests are sent to the menu with "Ada let go of the thread."
- Nine screen shapes: title, together panel, play and pause all fit.
- Sound, in the sense that matters for code: with audio on, all 32 sounds play without error and all
  13 recorded files load and decode. Nobody has *listened* to them.

## Third pass (same day): scarier, smoother, a story

Asked for: make it scary and fun, smooth Limbo-like movement and shapes, a story and goal first, an i
button, a trial for new players, light on the ground, a mind-control worm, hidden attacks, harder.

- **The worm in the head** (`possessMe`, `ridden` in `src/game.js`): a ceiling worm that catches you
  gets in instead of killing. Hammer JUMP to tear it out. Alone it jerks you about and takes you after
  5.5 s. With others it walks you at the nearest one and lunges; whoever it reaches dies. A friend next
  to you can press USE to rip it out. Red throb, red eye, the worm's tail thrashing out of the head.
- **Dread** (`dread()` in `src/game.js`, `#dread` in the page): darkness closes in near danger, a
  heartbeat that quickens, a low drone, the music sinking away, lanterns guttering, a shriek and a
  blackout when the crawler hears you, a roar from the Collector, whispers/knocks/creaks in the dark,
  red eyes in the fog that vanish when you come near, a red flash and a sting on every death.
- **Movement** (`src/chars.js`): the air pose follows the arc, landings bend the knees on a spring
  (no more squashing the whole body), leaning into starts and stops, small steps eased; the camera
  holds the height you stand at instead of bobbing with every jump.
- **Shapes** (`rounded()` in `src/scene.js`): every solid is a soft silhouette, rounded corners and
  wandering sides; dust is dark smoke, not pale blobs.
- **Light on the ground** (`buildShafts()`): pale shafts falling onto pools of light, one right where
  the crawler hunts; they light what walks through.
- **Story and goal** told line by line before the first journey; **i** (button or key) for the story,
  goal, controls and what hunts you; a six-step **trial** for the first journey alone (walk, jump,
  climb, creep, hold fast, spool), replayable from i.
- **The Collector explains itself** as you go: too close to the spool, now hold SHIFT, keep holding.
- **The Collector could be walked past** by creeping under it, and then the way out was shut with no word
  why. Now its hands lift anything loose, creeping or not; only one holding SHIFT is too heavy, and it
  steps over them (`loose()` in `src/monsters.js`). Hints in order: its hands are coming, keep holding
  till it is past, set the spool down, creep away, hold; and at the shut gate, why it is shut. A player
  doing nothing but what the hint says trips it with no deaths.
- **Harder / hidden:** three meadow traps lie sunk in the grass until you are on them; six quicker
  tunnel worms, two silent; the crawler roams faster and feels movement further.
- Checked: solo, 2, 3, 4 and a leave all reach the end; `worm.mjs` passes every worm case.
- Not done: no real phone, nobody has listened to the new sounds, the research on Limbo's animation
  found no technique to copy directly (Playdead's own talks are about Inside's physics rig).

## Fixed in the second pass

- **Creeping landings were heard.** In the air you move at walking pace even holding creep, so a creeping
  hop landed as footsteps for the frames it took to slow down, and the den's stump always woke the
  crawler. Footsteps now follow whether you creep (`src/phys.js`), as the soft-landing rule intended.
  This was what killed three players in the den every time.
- **The code-player counted frames.** At 144 Hz its jumps were 2.4× shorter and it gave up 2.4× sooner.
  It now thinks at 60 Hz of game time.
- **The code-player cut its own hops short** whenever a step ended mid-air (the cathedral's trip-wires),
  and then walked back onto the wire. It sees a hop through now. The cathedral went from ~6 deaths with
  four to none.
- **Middle of a chain of 3 or 4:** a hint of its own when hanging ("W with A or D climbs toward the one
  on that side").
- **Housekeeping:** `src/chars.js` is the doll only (burglar, resident, constable, props and animals
  gone); `src/audio.js` has only the sounds the game plays; 7 unused audio files deleted;
  `public/audio/CREDITS.txt` rewritten for what is left.

## Not checked yet

- **A real phone.** Nothing has been played by hand, on any device. Touch layout fits, but the stick
  and buttons have not been played through a section.
- **Listening.** All playtests run muted. Every synthesised sound has never been heard.
  The music is still the two tracks carried over from Hushhands.
- **Slow devices.** 120–144 fps here; no throttled or real low-end test.
- **Close looks in motion.** Not reviewed closely: the worms striking, traps snapping, the crawler's
  stab, bells and the Choir waking, glass breaking, the water, the death moments, and the doll's walk,
  creep, hang and brace animations. Stills of the chasm and gear room were looked at after the
  `chars.js` trim: the dolls look as before.
- **CrazyGames.** The SDK hooks are wired (loading, gameplay start/stop, invite, happytime, an ad
  after the ending) but untested in their QA tool. `npm run crazygames` was renamed, not run.
- **A guest leaving while the group is dead / respawning**, or two leaving at once. Only a calm leave
  was run.

## Known rough spots

- The jump from the second cog to the top lands on the very corner; forgiving, but tight.
- The thread is a straight length limit between two waists. It does not wrap round corners.
- The den is easy if you simply hold creep and wait. The Collector can mean ~20 s holding SHIFT while it paces.
- Upright phones with 3 or 4 players: the camera pulls far back and the dolls get small.
- Four players die about once a run at the Collector or the shears (a cut thread: "THE SEVERED CORD").
  Not looked into.
- When a partner leaves and you finish alone, the ending can be "THE WHOLE DOLL", the same as never
  having had anyone leave. Worth deciding whether a leave should count against it.

## From the design, not built

- The Hound-Pack, and eels that shock through the thread in the flooded room.
- The four-pillar counterweight puzzle.
- Walking a taut thread as a tightrope: the code is there for 3 or 4 players, never tested.
- The shears were built as a blade from above and one from below, not as scissors.
- Any telling of the story beyond section names and three ending titles
  (The Whole Doll / Unbroken, Mended, The Severed Cord).
- There is one level. No saving of progress between sessions beyond a best time.

## Housekeeping

- The GitHub repository is named Hushhands; the game in it is The Thread-Bearers.
  The old Hushhands code is only in the Mac's Trash (`~/.Trash/hushhands-2026-11-26`).
- The rooms server is not deployed anywhere. `railway.json` is carried over and untested.
  A CrazyGames build with multiplayer needs `VITE_SERVER_URL=wss://...`.
