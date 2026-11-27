# The Thread-Bearers

One to four small sackcloth dolls, tied waist to waist by a glowing amber thread, climb up through
the Loom: fifteen chapters of traps, worms, rats, rot, drowning, upturned halls and things that eat
cloth, to the Great Spindle and a crack of daylight. A side-view horror puzzle platformer in black
silhouette and fog. Alone, you drag a Spool-Lantern that stands in for a second body.

Every chapter is built for the number who set out: with two, both are needed; with four, all four.
The story is in `STORY.md`; how it is built is in `DESIGN.md`; what is done and what is left is in
`NEXT.md`.

## Play

```
npm install
npm run play        # http://localhost:2567  (game and rooms on one port)
```

| | Keyboard | Touch |
|---|---|---|
| Walk, swing on the thread; swim | A D / arrows | stick |
| Jump, let go of the thread; swim up | Space | JUMP |
| Climb the thread; creep; dive | W S / arrows | stick up, down |
| Hold fast (brace) | Shift | HOLD |
| Levers, valves, lamps, meat, your spool; stitch a friend back | E | USE |
| Ping, wave, point, panic | 1 2 3 4 | |
| Save the last 20 seconds as a clip | C | |

Saves are silent, at every lantern, in three journeys (title: *Journeys & Chapters*). Settings has
the gore (Full or Stitched), captions, voice (proximity, off by default) and a streamer mode.

## How it is made

PlayCanvas (WebGL 2, hand-written shaders), Vite, Colyseus for rooms, Blender for the creatures.

- `src/chapters/` one file per chapter (`kit.js` the tools), each built for 1 to 4
- `src/phys.js` walking, jumping, ledge grabs, swimming, crates, and the thread as a length limit
- `src/rooms.js` rooms with their own frame: halls hung upside down, drums that turn over
- `src/game.js` one journey: local play, dangers, the host's world rules, restitch, camera
- `src/creatures/` the Drinkers, rats, the Glutton, the Puppeteer, moths and the Moth Mother, the Other Doll
- `src/monsters.js` the Needle-Crawler and the Collector, and the creature registry
- `src/gore.js` bodies that stay where they fell (verlet ragdolls), dye, stuffing, splashes
- `src/save.js` journeys and chapters; `src/voice.js` proximity voice (WebRTC)
- `src/scene.js`, `src/rope.js`, `src/chars.js`, `src/fx.js` what you see
- `src/main.js`, `index.html`, `src/style.css` title, journeys, lobby, pause, ending, touch controls
- `art/blender/*.py` the creatures, modelled by script; `public/models/*.json` what they export
- `server/index.js` rooms (up to four), and the built game's files

The room's creator is the host: their browser runs the monsters and decides what happened. Each
browser moves its own wanderer and feels the thread against where it believes the others are.

### Creatures from Blender

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P art/blender/drinker.py
```

Each script builds its creature from primitives, skin-modifier tubes and subdivision, decimates it
to a triangle budget, and writes `public/models/<name>.json` (named parts in the game's own vertex
layout: the game animates the parts itself) plus a `.blend` to look at.

## Tests

Headless Chrome through playwright-core, with a code-player that presses real keys.

```
npm run build && PORT=2568 node server/index.js        # the built game and rooms
TB_URL=http://localhost:2568 node scripts/playtest/solo.mjs               # all fifteen chapters, alone
TB_URL=http://localhost:2568 TB_SERVER=ws://localhost:2568 node scripts/playtest/party.mjs 2   # 2, 3 or 4 browsers
CH=4 ... party.mjs 2                                    # start from a chapter (index into the list)
node scripts/playtest/leave.mjs 3 2                     # a guest lets go; the rest go on
node scripts/playtest/views.mjs                         # every screen shape
node scripts/playtest/worm.mjs                          # the worm in the head, every way it can go
node scripts/playtest/photo.mjs                         # photo mode (O), alone and together
node scripts/playtest/graphics.mjs                      # the GRAPHICS setting, on a phone
node scripts/playtest/fullscreen.mjs                    # the FULL SCREEN setting
```

`TB_SHOW=1` plays in a Chrome window you can watch, with sound. The playtests play as a returning
player (story seen, trial done); `TB_FRESH=1` plays as a new one. The code-player thinks at 60 Hz of
game time, so it plays the same on any screen.
