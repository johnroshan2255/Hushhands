# What is left

State on 2026-11-26. The game is playable start to end, alone and with 2 or 4 players over the
network. This file lists what was checked, what was not, and what still needs building.

## Run it

```
npm install
npm run play            # builds, then serves the game and the rooms on http://localhost:2567
```

On the same Wi-Fi, open `http://<this computer's IP>:2567` on a phone.
For development: `npm run dev` (port 5173) plus `PORT=2567 node server/index.js` for the rooms;
the page then needs `?server=ws://localhost:2567`.

## What was checked (headless Chrome only)

- Alone: every section played by the code-player with real key events, and the end screen reached.
  This was done in pieces (start to den, den to cathedral, cathedral to end), not in one unbroken run
  after the last physics changes.
- Two players, through the real menu and lobby: tunnel to the end, back to the lobby afterwards.
  Scrap pit to the chasm passed in an earlier run.
- Four players, four browsers: scrap pit and meadow in one run, chasm to the end in another, back to
  the lobby afterwards. The level was built for four (4 plates, 4 levers, 4 rings, glass carries 2).
- Nine screen shapes (phones upright and sideways down to 320 px, tablets, desktop, square,
  ultrawide): title, together panel, play and pause all fit, on the built game.
- The production build, served by `server/index.js`.

## Not checked yet

- **A real phone.** Nothing has been played by hand, on any device. Touch layout fits, but the stick
  and buttons have not been played through a section.
- **Sound.** All tests ran muted. Every new sound is synthesised and has never been heard.
  The music is still the two tracks carried over from Hushhands.
- **Three players.** Only 2 and 4 were run.
- **A player leaving mid-journey.** The code rebuilds the Loom for those who remain (`regroup` in
  `src/game.js`); it has never been run. Same for the host leaving.
- **Slow devices.** 60 fps on this Mac at both quality levels; no throttled or real low-end test.
- **Close looks in motion.** Stills of most sections were reviewed. Not reviewed closely: the worms
  striking, traps snapping, the crawler's stab, bells and the Choir waking, glass breaking, the water,
  the death moments, and the doll's walk, creep, hang and brace animations.
- **CrazyGames.** The SDK hooks are wired (loading, gameplay start/stop, invite, happytime, an ad
  after the ending) but untested in their QA tool. `npm run crazygames` was renamed, not run.
- **One unbroken `npm test`.** Run it first next time; it needs the rooms server running.

## Known rough spots

- The jump from the second cog to the top lands on the very corner; forgiving, but tight.
- The thread is a straight length limit between two waists. It does not wrap round corners.
- In a chain of 3 or 4, climbing takes up thread only toward the side you push. The on-screen hint
  does not say so yet.
- The Collector is easy once understood. The den is easy if you simply hold creep and wait.
- Upright phones with 3 or 4 players: the camera pulls far back and the dolls get small.
- The bot's bell-ringing killed a group once per multiplayer run; a person may find the bells strict.
- `src/chars.js` and `src/audio.js` still carry Hushhands' burglar, resident and constable code and
  sounds; `public/audio` has files this game does not use.

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
- `public/audio/CREDITS.txt` should be re-read once unused files are removed.
