# The Thread-Bearers

One to four small sackcloth wanderers, tied waist to waist by a glowing amber thread, cross a dark
loom of traps, worms and blind giants to reach the Great Spindle. A side-view puzzle platformer in
black silhouette and bright fog. Alone, you drag a Spool-Lantern that stands in for a second body.

The Loom is built for the number who set out: with two, both are needed; with four, all four.

## Play

```
npm install
npm run play        # http://localhost:2567  (game and rooms on one port)
```

| | Keyboard | Touch |
|---|---|---|
| Walk, swing on the thread | A D / arrows | stick |
| Jump, let go of the thread | Space | JUMP |
| Climb the thread, creep | W S / arrows | stick up, down |
| Brace: hold the thread fast | Shift | HOLD |
| Levers, your spool | E | USE |

## How it is made

PlayCanvas (WebGL 2, hand-written shaders, every mesh built in code), Vite, and Colyseus for rooms.

- `src/level.js` the Loom as data, sized for 1 to 4
- `src/phys.js` walking, jumping, ledge grabs, and the thread as a length limit between neighbours
- `src/game.js` one journey: local play, dangers, the host's world rules, camera
- `src/scene.js`, `src/rope.js`, `src/monsters.js`, `src/chars.js` what you see
- `src/main.js`, `index.html`, `src/style.css` title, lobby, pause, ending, touch controls
- `server/index.js` rooms (up to four), and the built game's files

The room's creator is the host: their browser runs the monsters and decides what happened. Each
browser moves its own wanderer and feels the thread against where it believes the others are.

## Tests

Headless Chrome through playwright-core, with a code-player that presses real keys.

```
npm run dev                              # in one terminal
PORT=2567 node server/index.js           # in another
node scripts/playtest/sim-chasm.mjs      # the thread, no browser
node scripts/playtest/solo.mjs [lantern] # the journey alone
node scripts/playtest/party.mjs 4        # 2, 3 or 4 browsers through the lobby
node scripts/playtest/views.mjs          # every screen shape
```

See `NEXT.md` for what is done, what is unchecked and what is left.
