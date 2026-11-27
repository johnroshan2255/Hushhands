# The Thread-Bearers: design for the full game

The story is in `STORY.md`. This file says how to build it: saves, how the world adapts to 1 to 4
players, every creature and hazard, gravity, death and gore, the mysteries, the features that bring
players in and keep them, proper shapes from Blender, every device, and the order of work.

Today the game is one level of about 3 minutes for someone who knows it (early forms of chapters
1 to 4, 6, 13 and 14). The target is **15 chapters, about 2 hours** for someone who knows every
answer, and much longer for a first time.

---

## 1. Pillars

1. **The thread is life.** Every chapter asks something new of the thread: hold it, swing on it,
   keep it taut, dry, dark; hold through a turn; cut it. A mechanic that never touches the thread
   probably does not belong.
2. **Learn by dying, never cheated.** Every death can be understood in one look and avoided on the
   next try. Each danger shows itself before it can kill: a sound, a shadow, a twitch. You are back
   in 2 seconds, at most 60 seconds of play behind.
3. **Dread, then terror.** Long quiet stretches, then something terrible. At most one jump scare a
   chapter. Deaths are brutal and specific.
4. **Together is harder, and better.** More players never just means more enemies. It means more
   roles, more weight, more noise, more ways to drag each other down, and more to laugh about after.
5. **One look reads it.** Black silhouettes on fog; the only colours are the amber thread and red
   dye. Every creature must read from its outline alone, so the shape must be right (section 12).

## 2. Length and pacing

- A chapter is **6 to 10 beats** (a beat is one puzzle, chase or set piece), each 40 to 90 seconds
  for someone who knows the answer. 15 chapters × ~8 minutes ≈ 2 hours.
- A first time: 3 to 10 tries a beat. That is the "days" of play, so the retry must be instant.
- Rhythm inside a chapter: **calm → threat seen from afar → puzzle → chase or set piece → calm.**
- Each chapter brings **one new thing** (a creature or a verb) and combines it with one old thing.
  The last beat of each act combines everything in that act.
- **The first minute hooks.** Chapter 1 opens on a kill (the cold open in `STORY.md`) before the
  player can move. On web portals most players decide in the first minute.

## 3. Save points

Like Limbo: many checkpoints, and they are silent. Unlike Limbo: chapters are also save slots.

**Lanterns (checkpoints).** 4 to 8 a chapter, one before every beat that can kill. Death puts the
group back at the last lantern after 2 seconds. Already built: `cps` in `src/level.js`.

**Saves.** The run is saved at every lantern:

```
tb.save.<slot> = {
  v: 1, chapter: 7, lantern: 2,          // where to wake
  buttons: [2, 5], drawings: [3, 7],     // lost buttons, wall drawings found
  seen: ['card1', ..., 'card7'],         // story cards shown
  deaths: 41, cuts: 2, time: 3820,       // for the ending titles and the stats screen
  players: 2, thread: 1,                 // 1 = first thread, 2 = Second Thread (new game+)
  updated: 1764160000000
}
```

- **Three slots** on the title screen: *Continue*, *New journey*, *Chapters* (only those reached).
- Saved in `localStorage`; the same object goes to the CrazyGames SDK data module when there.
- **Multiplayer:** the host's save is the group's. *Continue together* makes a room from the host's
  slot; the chapter is **rebuilt for however many came** (section 4), so a group of 3 can go on as
  2 or 4. Guests keep a copy (keyed by room code) so any of them can host next time. Buttons found
  together count for everyone who was there.

## 4. Adapting to the number of players

The level is already built from `n` (`buildLevel(n)` in `src/level.js`). The full game keeps that
rule everywhere.

**Rules for every puzzle:**

1. **Every player has a job.** A puzzle for `n` has `n` roles. Nobody stands and watches.
2. **Solo replaces the missing body with the Spool-Lantern** (set down, hung, called back), and
   later with things in the world (a crate, a fed Drinker, a puppet, a weightless crate).
3. **Weight and length grow with `n`.** Doors need everyone's weight; gaps are sized so the whole
   chain can just span them; glass carries `n - 1`.
4. **Danger grows by role, not by count.** More players means more to keep track of (more slack on
   the floor for rats, more bodies to brace through a turn), not just more monsters. Where creature
   numbers grow, it is by at most half a creature per extra player, rounded.
5. **Noise and light add up.** Four dolls creeping are louder than one; four lit threads draw more
   Drinkers; four on the boards shake them more for the Glutton.
6. **Someone leaves:** the rest go on from the last lantern with the chapter rebuilt for their number
   (built for the current level, `leave.mjs`). **Someone joins** a saved group: same, at the next
   lantern.

**Per chapter:**

| Chapter | 1 (spool) | 2 | 3 | 4 |
|---|---|---|---|---|
| 1 Scrap Pit | spool on one plate | a plate each | 3 plates | 4 plates |
| 2 Meadow | the spool can trip a trap for you | one holds the other back from a sunk trap | traps in pairs | the chain hops in step |
| 3 Chasm, Burrowers | spool on a hook | one holds, one swings | the middle one climbs | two pairs, two swings |
| 5 Drowned Mill | breath only; the spool floats as a buoy | one on the wheel, one swims | the wheel needs 2 | 2 on the wheel, 2 swim; a longer wet thread, more shocks |
| 5 The Cistern | one valve, the spool on the float | two valves at once | three | four, in a set order |
| 7 Fen | the lantern can be snuffed (dark, but no light) | one lures, one passes | +1 Drinker | +2; a ridden Drinker carries 2 |
| 8 Granary | the spool's light is the only light | two lights | a lit chain in the dark | the chain stays taut over the whole floor |
| 9 Dye-Works | the rot reaches the spool and dims it | rot crosses to one other | rot spreads both ways from the middle | cutting one loose is a real choice |
| 10 Larder | spool as bait | one shakes the boards on purpose | 3 weights on the scale | 2-and-2 split to balance the shake |
| 11 Theatre | the grub swaps your controls; the spool can't be grubbed | the puppet door needs one grubbed | two grubs at once | a 4-string puppet: all four on strings |
| 12 Upturned Loom | the spool falls with the turn, you hold fast; it lands where you need it | one holds, one rides the turn | a kite of 3 (one weightless, two anchors) | two anchors on the floor, two on the ceiling |
| 14 Collector | spool as one end | the line between two | three braced | four braced |
| 15 Tower | the Moth Mother is slower | | +1 moth | +2 moths |

The bot and tests run every chapter at 1, 2, 3 and 4 (section 15).

## 5. New verbs

Already built: walk, creep, jump, climb a ledge, brace (hold fast), swing and climb the thread,
levers, the spool. Every new verb uses the same four buttons (stick, JUMP, HOLD, USE).

| Verb | Chapter | How |
|---|---|---|
| **Swim, hold your breath** | 5 | in deep water JUMP swims up; a breath ring shrinks; empty = drowned |
| **Push and pull** | 5 | walk into crates to push; hold USE to pull |
| **Turn a valve** | 5 | USE on a wheel, held; several at once in the Cistern |
| **Smother your glow** | 7 | hold creep in mud: the thread goes dark for 10 s; Drinkers lose you |
| **Ride** | 7 | jump on a fed Drinker; lean to steer |
| **Carry light** | 8 | USE picks up a candle or lamp; rats stay out of its circle |
| **Wash** | 9 | stand in clean water to clear rot |
| **Hide** | 10 | stand still in a sack or shadow and press down |
| **Bait** | 10 | knock meat off a hook |
| **Hold through the turn** | 12 | HOLD as the drum turns: you stay put and land on your feet |
| **Kite** | 12 | hold a weightless friend on the thread and swing them up to a high door |
| **Cut** | 9, 13, 15 | the shears as a tool: cut a friend loose (retied at the next lantern) |
| **Restitch** | all | reach a dead friend's body and hold USE (section 9) |
| **Ping and emote** | all | section 10 |
| **Pull the choice** | 15 | everyone pulls toward Wind or Cut |

## 6. Creatures

Each has: **how it senses**, **its tell**, **how it kills**, **how you beat it**, **how numbers
change it**, **its shape**, **its sound**.

### Built

- **Head-Worms** (Ch. 2, 3). Hang from ceilings; the tell is dust, except silent ones. Get into a
  head: alone it jerks you and takes you after 5.5 s; with friends it walks you at the nearest one.
  Hammer JUMP, or a friend rips it out with USE.
- **The Needle-Crawler** (Ch. 4; an upside-down one in Ch. 12). Hears steps and landings, feels
  movement close by, stabs where it heard. Creep, keep still.
- **The Collector** (Ch. 14). Hears steps; its hands lift anything loose; holding fast makes you too
  heavy. Trip it with a braced line across its path.
- **The Choir** (Ch. 13). Sleeps under the bells; wakes to a ring.

### New

**Drinkers** (giant mosquitoes), Ch. 7, 15
- *Senses:* warmth and light; the thread's glow draws them; a snuffed or muddy thread hides you.
- *Tell:* the hum, rising as they come; a long thin shadow crossing the light shafts.
- *Kills:* lands and drinks: the abdomen fills red, the doll goes grey and flat (6 s). A friend
  pulls it off (USE), or you hammer JUMP.
- *Beat:* hide your glow; lure them into flames (they burst, ink and red); a fed one can be ridden.
- *Numbers:* +1 for each lit thread past two.
- *Shape:* long jointed legs, a needle proboscis, a swelling abdomen; wings as a blur. ~2k tris.

**Gnawers** (the rat swarm), Ch. 8, 12
- *Senses:* everything in the dark. Moves as one liquid flood of 100 to 300 bodies (instanced).
- *Tell:* squealing, then the floor starts to move.
- *Kills:* a doll in the dark under the swarm for 1 s is stripped to its thread.
- *Beat:* light. Every lamp makes a circle they will not cross; lamps can be carried, dropped, knocked
  over. Slack thread on a dark floor is gnawed (fraying shows; snapped = cut).
- *Shape:* one ~150-triangle rat with a 4-bone wiggle; eyes catch the light.

**Eels and Leeches**, Ch. 5
- *Eels:* unseen in black water until they flash; a flash on a wet thread shocks everyone on it
  (stunned, sinking). Tell: a faint glow under the water, a crackle. Keep the thread dry, or cross
  between flashes.
- *Leeches:* cling to anyone in still water; slow you and drain breath. Jump out to shake them off.

**Rot-blooms** (poison fungus), Ch. 9
- Burst into spores when brushed or landed near. A rotting doll is darker, slower, jumps low, and
  falls apart at the seams in 20 s. The rot crawls along the thread at 1 m/s to whoever is tied.
- Wash in clean water; jump the blooms; or cut the rotting doll loose.
- The only near-white things in the game; they glow faintly.

**The Glutton**, Ch. 10
- Senses floor vibration: steps, landings, falling things; bigger groups shake more.
- Tell: the boards bulge and creak; teeth between the planks. Kills: one bite from below.
- Hide in sacks; bait it with meat from the hooks; cross while it chews (5 s).

**The Puppeteer and its grubs**, Ch. 11
- Sees from the rafters (a turning eye, a visible light cone). Drops **grubs** on dolls in the cone.
- A grubbed doll's controls are **swapped** (left↔right, jump↔creep) and the Puppeteer tugs it on
  strings. Unlike Limbo's slugs, which force a direction, here *you* still steer, wrongly.
- Burn grubs off in a candle; or *use* a grubbed doll: puppet doors open for it, its strings lift it.

**Moths and the Moth Mother**, Ch. 12 (the dust), 15
- *Moths* eat cloth: holes open in a doll (slower, shorter jumps) and in 8 s there is nothing left.
  Brush them off in flame, or outrun them.
- Their dust makes a doll weightless for a few seconds (Ch. 12).
- *The Moth Mother* fills the tower shaft below you, rising; her wings snuff candles. The largest
  model in the game; dusty wings with eye-spots.

**The Other Doll** (not a threat), every chapter
- A scripted runner seen ahead: crossing a light shaft, going through a door first, scratching a
  wall. It cannot be caught: it is always one room ahead and vanishes when you get close. With
  friends, one per player, each in a player's patch colour. Its route shows the way, sometimes; once
  a chapter it shows a *wrong* way, and dies there, for you to find.

**The Hound-Pack** (reserve): blind dogs hunting by smell along the thread, for a chapter that needs
a chase.

## 7. Hazards

Built: jaw traps (and sunk ones), shears, bells and trip-wires, rising water, drops, breaking glass.

New:
- **Deep water, currents, breath** (Ch. 5).
- **The Cistern** (Ch. 5): a sealed room filling with water. The door locks behind you; the water is
  always visible and speeds up as it rises (more frightening than a timer). Drowning is slow and
  shown: the doll soaks heavy and sinks reaching up.
- **Fumes** (Ch. 9): hold your breath through them.
- **Poison dye** (Ch. 9): a vat kills; splashes rot.
- **Presses and looms** (Ch. 6, 15): crushing machines on a beat.
- **Collapsing floors** (Ch. 10, 15): boards that give under more than `k` dolls.
- **Fire** (Ch. 7, 8, 11): light to hide in, flame that burns grubs, moths, Drinkers, and you.
- **Darkness** (Ch. 8): out of the light, the rats.
- **The drum turn, the hanging lake, weightlessness** (Ch. 12, 15): section 8.

## 8. Gravity: the Upturned Loom

Act IV is built on gravity. It must be *ours*: built on the
thread and on holding fast, not a flip button (VVVVVV) or a switch in the air.

**Three gravity mechanics:**
1. **Upside-down halls.** Some rooms are hung from the roof: gravity points up. You walk on the
   ceiling; the camera turns over with you (eased over 0.6 s), so the controls never feel reversed.
2. **The drum turn.** On a deep groan (2 s warning, the walls creaking, dust falling *upward*) the
   whole room rotates 180°. Loose things (crates, water, rats, bodies, the spool) fall to the new
   floor. Dolls holding fast stay attached and land on their feet as the room comes round; dolls
   not holding fall the room's full height. Turns are on a beat (like the shears) so they can be
   planned; some are triggered by a lever.
3. **Weightless.** Moth-dust makes a doll weightless for 4 s: it drifts toward the "up" of the room,
   held only by the thread. The others are anchors; with HOLD they can stop it; by moving they can
   swing it like a kite.

**Why it is scary and fun:** the hanging lake over your head; rats raining down a turned wall; your
own earlier bodies falling past you when the room turns; the long fall if you let go.

**Puzzles it makes:** move water by turning the room (fill a channel before the turn, empty it
after); stand where the new floor will be; ride a falling crate to a high ledge; kite a weightless
friend to a door, then turn the room so that door is on the floor; a Needle-Crawler that hangs from
what becomes the floor is helpless for one turn.

**In code:** each zone gets `g: +1 | -1`; `src/phys.js` multiplies gravity, jump and ledge tests by
it; a turn animates a zone's transform and swaps `g` at the halfway point; held-fast dolls are carried
with the room. Weightless is a per-body timer. The host decides turns (it already owns world rules).

## 9. Death, blood and gore

Brutal, in our own way: **dolls bleed red dye and spill stuffing; creatures bleed
black ink.** Silhouette keeps it stylised and readable; red is the only colour besides the thread,
so blood stands out against the black and grey.

- **A death for every killer** (the list is in `STORY.md`, "How death looks"): cut in two, impaled
  and lifted, drained flat, stripped to the thread, swallowed, crushed, eaten through, rotted apart,
  drowned. Each is short (under 1.5 s), shown, then the thread goes cold.
- **Ragdolls.** On death the doll becomes a soft ragdoll (a chain of 6 to 8 points with the thread
  still attached), so bodies flop, hang from the thread, get dragged, fall when a room turns. This is
  also where the funny clips come from (section 10).
- **Dismemberment:** limbs are separate pieces at death; a cut or bitten-off limb falls on its own.
- **Red dye:** a particle burst and decals (splashes on the ground and walls that stay for the
  chapter). Creatures: black ink, the same way.
- **Bodies stay** where they died for the rest of the chapter (capped at 40, oldest fade out first),
  so a group sees where it keeps failing.
- **Killing creatures:** most creatures can be killed by the world, not by fighting: Drinkers in
  flames, rats burned in their nest, the Collector tripped onto its own spikes, the Puppeteer cut
  down, the Glutton fed something poisoned from the Dye-Works. Each gets its own ink-and-gore death.
- **Killing each other:** the Head-Worm and the Puppeteer can make one doll kill another; the shears
  let you cut a friend loose; the ending can drag the losing side along. Never an attack button.
- **Gore setting:** *Full* (red, dismemberment, decals) and *Stitched* (grey stuffing, no red, no
  severed limbs, cut away sooner). Default *Full* on our own site and Steam.
- **Ratings:** PEGI 12 allows "violence of a slightly more graphic nature towards fantasy
  characters"; realistic violence and graphic gore point to PEGI 16. Our victims are sackcloth
  dolls and monsters, which helps, but *Full* is probably PEGI 16. CrazyGames rejects games over
  PEGI 12, so **the CrazyGames build defaults to Stitched**, and we confirm with them before launch.

## 10. What brings players in and keeps them

From the research (section "Research"). In order of what it does for us:

**Must have (with phase 1 or 2)**
- **Restitch: a reason for the dead to keep playing.** When one doll dies, the thread goes cold over
  6 seconds instead of at once. A living friend who reaches the body and holds USE stitches it back
  (red on their hands, a stitch sound). If nobody can, everyone goes back to the lantern. The dead
  player is not out: they can **twitch** (ping) to warn or point. Saves at the last second make the
  best moments in co-op horror.
- **Ping and emotes.** A ping (look here / danger / go) and 4 emotes (wave, point, hug, panic) on a
  wheel from USE held long, or keys 1 to 4. Not everyone will talk, and phones can't easily.
- **Proximity voice chat** (optional, off by default, needs a mic permission). WebRTC peer to peer;
  the rooms server only passes the handshake. Volume falls with distance along the thread; muffled
  under water; the dead can only whisper (heard by whoever is next to their body). This is the
  feature most credited for Lethal Company and R.E.P.O. becoming things people watch and share.
- **Ragdoll comedy alongside the horror.** Floppy dolls dragged on the thread, flung by a turn,
  dangling from a Drinker. The shouting and laughing is what gets clipped.
- **Invite links** (built: room codes, CrazyGames invite). Make a link the first thing after creating
  a room.

**Should have (phase 3 or 4)**
- **A director for variety, not difficulty.** Like Left 4 Dead's pacing director but small: per run,
  it picks which shafts hold watchers, where the Other Doll appears, false alarms, extra ambient
  scares, one random silent worm. Same puzzles; never the same walk through them.
- **Clip the last 20 seconds.** A button that saves the last 20 s of play as a video
  (`MediaRecorder` on the canvas, kept in a rolling buffer) to share. And a **death replay**: the
  last 3 s before a death, slowed, on the "you died" screen (optional).
- **Stats and the end screen:** deaths by cause, who restitched whom, time. Shareable as an image.
- **Achievements** (local, and CrazyGames' if available): "Hold fast through ten turns", "Restitched
  in the last second", "Never cut", every button, each ending.
- **Captions for sounds** ("a hum, rising", "boards creak") for deaf players and muted streamers.
- **Haptics on phones** (vibration) for the heartbeat, stomps, turns and deaths.
- **Streamer mode:** hides room codes and names.

**Later (after the 15 chapters)**
- **Second Thread** (new game+): `STORY.md`, mystery 7. Changes in the cages, drawings, Other Dolls.
- **One Thread** (hardcore): no lanterns inside chapters; die and the chapter starts again.
- **The Daily Thread:** one chapter a day with a seed and a twist (no light, double rats, always
  turning), one try, a leaderboard of times.
- **Speedrun timer** and chapter leaderboards.
- **Cosmetics earned, not bought:** patch colours, button eyes, thread colours, from buttons,
  achievements and endings.
- **Twitch viewer votes:** viewers vote for the next scare (release the rats, put out the candles).
- **Photo mode.**

## 11. New chapters, beat by beat

(Built chapters keep their beats; Ch. 2 and 3 each get 2 to 3 more.)

**5. The Drowned Mill**
1. A flooded stair: learn to swim and the breath limit.
2. A crate: push it to stand on; it floats.
3. First eel: watch the flashes; keep the thread dry over a beam.
4. The waterwheel: weight on the paddles drains a channel.
5. **The Cistern:** the door locks, water pours in; open valves in the right order (`n` valves) to
   drain it before the roof.
6. The sluice: the water rises behind you; climb while it chases.
7. Button: dive under the wheel to the drowned doll (eels on the way).

**7. The Fen of Drinkers**
1. From afar: a Drinker drains a bird in a light shaft.
2. Mud: smother the glow, pass under a Drinker hanging in the reeds.
3. The candle trap: lead a Drinker into a flame with your glow.
4. Two at once: one doll lit as bait, one dark.
5. The fed Drinker: ride it over deep water.
6. The swarm: everyone dark, crossing in turns.
7. Button: on the nest, in the middle of the swarm.

**8. The Granary of Gnawers**
1. The first lamp: rats flood the floor; the circle holds.
2. Carry the lamp across with the swarm around you.
3. Two lights: leapfrog lamps (solo: the spool's light, set down and called back).
4. The slack thread: keep the chain taut across a wide floor.
5. The grain chute: a falling-grain flood that carries rats.
6. The dark silo: one candle, a long climb, the swarm rising below.
7. Button: in the nest, reached by knocking a lamp over to burn it.

**9. The Dye-Works**
1. The fumes: hold your breath, cross.
2. The first bloom; someone else's doll rotting apart.
3. Rot on the thread: reach clean water before it reaches the others.
4. The vats of red: walkways over them, on presses.
5. The choice: a doll rots past saving unless cut loose.
6. Button: at the bottom of a drained vat, between the blooms.

**10. The Larder**
1. The boards: something moves under them when you land.
2. Sacks: hide while the mouth passes.
3. The hooks (dolls on some of them): knock meat down as bait, then cross.
4. The scale: the right number of weights; it shakes the floor.
5. The collapse: the floor gives; climb the shelves.
6. The poisoned bait: feed it a sack from the Dye-Works; it dies, in ink.
7. Button: in its pit, after.

**11. The Marionette Theatre**
1. The eye in the rafters and its light cone.
2. The first grub: controls swapped; get to the candle.
3. The puppet door: let a grub on one doll (solo: yourself) and walk it through.
4. Strings: the Puppeteer lifts a grubbed doll; ride it up to the catwalk.
5. The show: the stage turns; everyone grubbed in turn, at speed.
6. Cut the strings: the Puppeteer falls, and the theatre swings over (the first turn).
7. Button: on the catwalk above its seat.

**12. The Upturned Loom**
1. Waking on the ceiling: the camera turns over; walk the underside of a bridge.
2. The first turn, slow and on a lever: learn to hold fast.
3. The hanging lake: turn the room to drop it into a channel and float a crate.
4. Rats on the walls: they pour down when the room turns; be in the light when it lands.
5. Moth-dust: the first weightless friend; kite them to a high door (solo: a weightless crate on
   the spool's thread).
6. The upside-down Needle-Crawler: creep along the ceiling under it; turn the room to make it fall.
7. The turning gallery: turns on a beat, every 6 s, while you cross; a lantern after.
8. Button: on the far side of the hanging lake, reached between two turns.

**15. The Moth Tower and the Great Spindle**
1. The foot of the tower: the first moths, at a candle.
2. The climb: brace, swing, ride, light, all learned before.
3. The tower turns as it is climbed (gravity again, as a chase).
4. The Moth Mother wakes: the chase up the shaft (four set pieces, a lantern between each).
5. The Weaver: half-eaten, stitching. A quiet minute.
6. The Spindle and the crack of daylight: the choice.

## 12. Proper shapes: Blender

Today every mesh is built in code (`src/meshes.js`, `MeshBuilder`), which is why things look blocky.
Creatures are to be modelled in Blender **by script**, so they can be rebuilt and adjusted without
hand-work, and loaded as glTF.

**Pipeline**
- `art/blender/<creature>.py`: a bpy script builds the creature from curves, metaballs or the skin
  modifier (good for organic limbs), subdivides, rigs it, keys its actions (idle, move, attack, die),
  makes two LODs, applies modifiers, exports `public/models/<creature>.glb`.
- `npm run models` runs `blender -b -P art/blender/<each>.py`. Blender 5.2 is installed here
  (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`; the path goes in an env var).
- The game loads `.glb` with PlayCanvas's glTF loader, skinned animation through the anim component,
  and replaces materials with our ink silhouette material (plus red for the Drinker's abdomen and
  blood), so only the shape matters.
- Rules: export from the rest pose, apply modifiers, linear sampling, one GLB per creature, meshopt
  compression.

**Silhouette rules** (black on fog, so the outline is everything)
- Each creature has **one shape no other has** (the Drinker's needle, the Glutton's teeth, the
  Puppeteer's strings, the Moth Mother's wing eyes).
- **Exaggerate** the part that kills (Tarsier: start from how it behaves, blow up that feature).
- Thin parts at least 2 px on a phone at the default camera; nothing that only reads in colour.
- One light point at most (eyes, the red abdomen, wing eyes).
- Under 3k triangles per creature, 1k for ones seen many at once, a 150-triangle rat.

**Order:** the Drinker (to prove the pipeline), then the doll itself (rounder, stitched seams, a
proper rig, ragdoll points, separable limbs), the Collector, the Needle-Crawler, then each new
creature with its chapter. The scenery's `rounded()` silhouettes (`src/scene.js`) stay in code.

## 13. Sound

- Each creature's signature *is* its tell: the Drinkers' whine, rats' squeal, eels' crackle, the
  Glutton's creak, the Puppeteer's clack, the moths' powdery flutter, the drum's groan.
- Deaths have their own sounds: wet cloth tearing, stuffing, a thread snapping cold.
- Each act has its own drone under the dread system (`dread()` in `src/game.js`).
- Recorded sounds (CC0) for creatures and deaths; the synth (`src/audio.js`) for the dread layer.

## 14. Code changes

- **Chapters:** `src/level.js` becomes `src/chapters/<n>.js`, each with `build(n)` returning today's
  level shape (solids, cps, hints, monsters…) plus zones with gravity. Only the current chapter (and
  the start of the next) is built.
- **Creatures:** each kind is a mind (host only, like `thinkMonster` in `src/monsters.js`) and a view
  (all browsers). Host-authoritative as today: clients send intents, the host sends events and
  snapshots.
- **Swarms** (rats, moths) are not sent body by body: the host sends a seed and control points (the
  flood's front, the light circles); every browser runs the same flock.
- **New body state:** breath, rot, glow, grubbed, swimming, weightless, gravity sign, restitch timer,
  ragdoll. Packed into the snapshot flags (`F` in `src/game.js`) and a few bytes more.
- **Gore:** `src/gore.js`: ragdolls (verlet chains), limb pieces, dye and ink bursts, decals, the
  body cap; obeys the gore setting.
- **Voice:** `src/voice.js`: WebRTC peer connections signalled through the Colyseus room; distance
  gain from the game.
- **Director:** `src/director.js`, seeded from the room, so all browsers agree.
- **Saves:** `src/save.js`; the host sends the save with `regroup`.
- **Loading:** a progress bar per chapter for its GLBs; models cached.

## 15. Every device, every way up

The game must run on phones, tablets, laptops and PCs, in landscape and portrait, including cheap
phones and old laptops. This is a rule for every chapter and every creature, not a last pass.

**Screens and rotation**
- Landscape and portrait both work, and turning the device mid-play just re-fits (no reload, no lost
  state). Nine screen shapes are checked by `views.mjs` today; it gets portrait and landscape phone,
  tablet, laptop and ultrawide for every chapter.
- The camera frames the whole group in both orientations. In portrait with 3 or 4 players it pulls
  back too far today; fix: frame the group's width with a minimum doll size, and let the thread's far
  end go off screen with an edge marker.
- The upside-down rooms turn the camera, not the screen; touch controls stay where the thumbs are.
- Touch controls (stick, JUMP, HOLD, USE) sit in the thumb zones of both orientations, never over the
  hint line, and grow on tablets. No new button is ever needed (section 5).
- Hints fit a portrait phone (two lines at most); safe areas (notches) respected.

**Low-end phones and laptops**
- Target: **30 fps on a low-end phone** (4 cores, 3 GB, WebGL2) and on an old integrated-graphics
  laptop; 60 fps on anything mid-range. WebGL2 required, as today.
- Quality tiers exist (`q` 0 to 2, picked from cores and memory in `src/main.js`). Each tier sets:

| | Low (q0) | Mid (q1) | High (q2) |
|---|---|---|---|
| Render scale | 0.6 to 0.75, dynamic | 0.85 | 1.0 (device pixel ratio capped at 2) |
| Fog, light shafts | flat fog, shafts as cards | soft fog | full |
| Rats / moths drawn | 80 / 20 | 180 / 40 | 300 / 70 |
| Creature models | LOD1 | LOD0 | LOD0 |
| Particles (dust, spores, dye) | 25 % | 60 % | 100 % |
| Bodies kept / decals | 10 / 30 | 25 / 80 | 40 / 200 |
| Post effects | none | vignette only | full dread layer |

- **Dynamic resolution:** if frames stay over 33 ms for two seconds, the render scale drops a step,
  and climbs back when there is room; one whole tier down if 30 fps can't be held at the lowest scale.
- **Budgets per frame (q0):** under 150 draw calls and 150k triangles. Swarms are one instanced draw.
- **Downloads:** first play under 8 MB; each chapter under 3 MB more, loaded in the background during
  the chapter before.
- **Memory:** only the current and next chapter kept.
- **Battery and heat:** 60 fps cap; 30 fps on q0 phones on battery saver; no rendering when the tab is
  hidden. Voice chat is the costliest feature on phones: off by default, audio only.
- **Keyboard, touchpad, gamepad:** keyboard as today; gamepads map to the same four actions.

**Checked how:** every chapter's test also runs with the CPU slowed 4× at a small phone size (Chrome
DevTools throttling through playwright) and must stay above 30 fps on q0. A real low-end Android
phone and an old laptop are played by hand before each act is called done.

## 16. Testing

Each chapter gets a bot route in `scripts/playtest/bot.js` and runs at 1, 2, 3 and 4 players,
headless or watched (`TB_SHOW=1`). A chapter is done when:
- the bot finishes it at every player count with at most 1 death,
- a "hints only" player (doing only what the line at the bottom says, as for the Collector) finishes
  it alone,
- a leave and a join mid-chapter go on correctly, and a save continues at a different player count,
- it holds 30 fps on q0 with the CPU slowed 4×, in portrait and landscape,
- someone has played it by hand, with sound, and it scared them.

## 17. Order of work

Each phase ends playable, tested and committed.

| Phase | What | State (2026-11-27) |
|---|---|---|
| **0. Foundation** | chapters as files; saves (slots, Continue, Chapters, every lantern, multiplayer continue); story cards; model loading; the Blender pipeline with the Drinker; bodies that stay (`gore.js`), the gore setting | done |
| **1. Act I and II** | the cold open and the Other Doll; extend Ch. 2; Ch. 5 Drowned Mill with the Cistern; Ch. 7 Fen; restitch, ping and emotes | done (not built: the waterwheel, riding a Drinker) |
| **2. Act III** | Ch. 8 Granary, Ch. 9 Dye-Works, Ch. 10 Larder; proximity voice | done (not built: the grain chute, the scale, the collapsing floor) |
| **3. Act IV** | Ch. 11 Theatre; Ch. 12 Upturned Loom (gravity, turns, weightless) | done (not built: the hanging lake, rats down the walls, lifting on strings) |
| **4. Act V and the ending** | Ch. 15 tower and the Moth Mother; the Weaver; three endings; buttons; the mysteries' answers | done |
| **5. Shapes** | the Collector, the Crawler and the doll remade in Blender; every new creature made there | done |
| **6. Reach** | director, clips, achievements, captions, haptics, streamer mode, stats screen | done (not built: death replays) |
| **7. Polish** | sound for everything, difficulty from hand-play, real low-end phones and laptops, CrazyGames | open: needs people and devices |
| **Later** | Second Thread, One Thread, the Daily Thread, leaderboards, cosmetics, Twitch votes, photo mode | built: Second Thread (simple), One Thread, the Daily Thread with a board, photo mode |

## 18. Open questions

- **Gore on CrazyGames:** they reject games over PEGI 12; *Stitched* is the plan there. To be
  confirmed with them.
- **Voice chat** needs a mic prompt and, behind strict networks, a TURN relay server (a cost). Start
  peer to peer only, and see.
- **Difficulty:** an easier setting (more lanterns, longer warnings) or none, as Limbo.
- **Cutting a friend loose** costs them nothing lasting (retied at the next lantern) but costs the
  group its "Unbroken" title. Worth trying with real people.
- **Phones and size:** 15 chapters with GLBs: keep each chapter under ~3 MB.

---

## Research

- Creatures: one exaggerated feature that comes from behaviour; readable when fully seen.
  [Tarsier on Little Nightmares' monsters](https://www.gamesradar.com/uk/ahead-of-little-nightmares-2-tarsier-studios-reveals-the-stories-and-secrets-behind-its-most-monstrous-creations),
  [Little Nightmares level and puzzle design](https://web.cs.dal.ca/~marzlin/tabea/blog/level-puzzle-design-little-nightmares/index.html),
  [bit-tech](https://bit-tech.net/reviews/gaming/little-nightmares-review/2/),
  [The Maw: systemic horror](https://www.giantbomb.com/profile/gamer_152/blog/the-maw-systemic-horror-in-little-nightmares/259391/).
- Trial and error, checkpoints: [The Fine Line of Trial and Error](https://entertainium.co/2012/11/10/the-fine-line-of-trial-and-error/),
  [Yacht Club Games](https://www.yachtclubgames.com/blog/check-point-design),
  [Limbo: Balancing Fun and Frustration (GDC)](https://gdcvault.com/play/1013665/Limbo-Balancing-Fun-and-Frustration).
- Pacing and tension: [GameDev.net](https://gamedev.net/blogs/entry/2274395-how-to-use-pacing-and-build-tension-in-a-horror-game);
  director-style pacing for replays: [AI systems of Left 4 Dead (Valve)](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf),
  [Structure or AI director?](https://gamedeveloper.com/design/structure-or-ai-director-),
  [The discomfort zone](https://www.gamedeveloper.com/design/the-discomfort-zone-the-hidden-potential-of-valve-s-ai-director).
- Gravity: [VVVVVV's one mechanic explored in depth](https://www.gamedeveloper.com/pc/analysis-the-flip-side---i-vvvvvv-i-s-fiendish-heart),
  [VVVVVV](https://en.wikipedia.org/wiki/VVVVVV), [gravity-flip level design](https://gaby-hon.itch.io/gravity-level-design).
- Water and drowning: a visible, speeding water level beats a timer; murky vision; breath limits;
  realism that can't be read (waterlogged clothes) was cut. [Still Wakes the Deep's water](https://www.unrealengine.com/en-US/blog/making-waves-developing-realistic-water-mechanics-for-still-wakes-the-deep-in-ue5),
  [Drowned Dungeon](https://jy0un9.itch.io/drowned-dungeon), [itch.io feedback](https://itch.io/post/16464393).
- Mystery and secret endings: Inside's hidden orbs and open ending keep players hunting and theorising.
  [Kotaku](https://kotaku.com/the-wild-theories-behind-insides-secret-ending-1783552341),
  [TheGamer orb guide](https://www.thegamer.com/inside-hidden-orb-locations-guide/),
  [Screen Rant](https://screenrant.com/inside-game-ending-meaning-explained/).
- What spreads co-op horror: proximity voice, shouting, short loops, cheap to try, clips.
  [PC Gamer on Lethal Company](https://pcgamer.com/lethal-company-is-a-viral-hit-in-no-small-part-thanks-to-all-the-intense-shouting),
  [Prima Games](https://primagames.com/gaming/what-led-to-lethal-company-exploding-in-popularity-how-developers-can-learn-from-its-success),
  [Comicbook](https://comicbook.com/gaming/feature/multiplayer-co-op-games-have-gotten-out-of-hand-for-one-key-reason/),
  [Destructoid on R.E.P.O.](https://destructoid.com/move-over-lethal-company-r-e-p-o-is-the-new-king-of-multiplayer-horror),
  [AppMagic on friendslop](https://appmagic.rocks/blog/friendslop-steam-games-2025),
  [Content Warning's launch](https://www.gamasutra.com/business/content-warning-opens-to-near-205k-players-nets-6-2m-owners-at-launch).
- Dead players, pings, emotes, streamers: [Hyper Scape's Echoes and Twitch votes](https://news.ubisoft.com/en-ca/article/6EeAtEKTriQLU1oFE3o3hm/welcome-to-hyper-scape-developer-talks-weapons-hacks-and-twitch-integration),
  [ping and emote wheels (Embark)](https://id.embark.games/support/faq/58-in-game-communication),
  [a spectating devlog](https://willygames505.itch.io/deadlands-duel-time-rift-rumble/devlog/704910/spectating-system).
- Ratings: [PEGI labels](https://www.pegi.info/what-do-the-labels-mean),
  [Nintendo on PEGI](https://www.nintendo.co.uk/Support/Nintendo-Switch/Software-Rating-Information-1501599.html),
  [CrazyGames FAQ (PEGI-12 limit)](https://docs.crazygames.com/faq/).
- Co-op for 1 to 4: [Making a better single-player and co-op experience](https://www.gamedeveloper.com/game-platforms/making-a-better-single-player-and-co-op-experience),
  [puzzles that adjust to player count](https://www.videogamer.com/news/lara-croft-and-the-temple-of-osiris-puzzles-will-dynamically-adjust-to-the-player-count),
  [a game for 1 to 4 players](https://pandaqi.itch.io/package-party/devlog/105422/15-a-game-for-1-4-players-or-is-it),
  [the four atoms of co-op games](https://gamedeveloper.com/design/the-four-atoms-of-cooperative-video-games).
- Rats and swarms: [A Plague Tale's rat swarm](https://blog.playstation.com/archive/2019/05/09/how-a-plague-tale-innocences-horrifying-rat-swarm-was-created),
  [PC Gamer](https://www.pcgamer.com/every-rat-in-a-plague-tale-innocence-will-behave-like-a-filthy-little-individual-creature),
  [Wireframe](https://wireframe.raspberrypi.com/articles/reviling-rodents),
  [Grounded's spiders](https://www.gamesradar.com/grounded-is-a-masterclass-in-horror-gameplay-and-wont-admit-it).
- Parasites: [itch.io feedback](https://itch.io/post/3769675), [Parasite - Mind Control](https://lunaruna.itch.io/parasite),
  [Dread Central](https://www.dreadcentral.com/editorials/485738/parasite-eve-preys-upon-a-fear-of-our-own-bodies/).
- Blender to PlayCanvas: [Blender glTF exporter](https://docs.blender.org/manual/en/4.4/addons/import_export/scene_gltf2.html),
  [a scripted export workflow](https://docs.vulkan.org/tutorial/latest/Advanced_glTF/Tooling_Production_Pipeline/02_blender_workflow.html),
  [PlayCanvas glTF import](https://blog.playcanvas.com/gltf-import-arrives-in-the-playcanvas-editor/).

Limbo, Inside, Little Nightmares, A Plague Tale, VVVVVV and Lethal Company are references for how
fear, puzzles, gravity and co-op work. None of their creatures, levels or art are copied: no giant
spider, no direction-forcing slugs, and gravity here comes from turning rooms and holding fast, not a
flip button.
