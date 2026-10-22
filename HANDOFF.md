# Handoff: Aberwen Castle cutaway

This is the state of the project and what you need to know to carry it on. Read it alongside `README.md`, which describes the experience; this file is about the code.

## Status

- **Branch:** `claude/compassionate-brahmagupta-u7beyj` (earlier work on `claude/compassionate-turing-u8pv6k`). All work is committed and pushed. **No pull request has been opened.**
- **Build:** `npm run check` passes. It builds, renders every room headless and reports **no console errors**.
- **Scene size:** about 174k static triangles in one mesh (drawn twice: a depth pre-pass, then the full shader), plus figures, animals, mechanisms, birds and banners, plus particle systems: about 340 draw calls in the overview (down from 1,470 before the performance pass). Under SwiftShader a frame can take over 30 s, so `check.mjs` allows 180 s per screenshot.
- **Performance on real GPUs is still unmeasured.** The only renderer in this environment was SwiftShader (software WebGL); there the performance pass roughly doubled the frame rate (0.8 → 1.5 fps in the overview) and cut CPU time per frame by more than half. Press **F** (or open with `?stats`) for a frame-rate readout on real hardware (see *Performance*).
- **Content:**
  - 18 rooms the camera can fly to, 7 working mechanisms, and 129 animated people and animals (birds not counted).
  - 36 sources and 73 statements marked as conjecture, all listed in `SOURCES.md`.

### History

| Commit | What it did |
|---|---|
| `39dc51e` … `c0f0a54` | Milestones 1–6: shell and cut, ink-and-wash look, service rooms, people, mechanisms, notes and sources |
| `4ebcbd4` | Rounder figures, a stocked larder, 360° orbit, the watch on the walls |
| `de6c684` | Weathering shader, landscape, ward and wall dressing, furnished interiors, more people and animals, banners, birds |
| `4ccadd6` | Darker default light, firelight, candles, lanterns, glow halos, Dusk ↔ Day slider |
| `f7d8100` | Sources for the newer notes; notes reworded where the evidence was weaker |
| `1431c5a` | README with screenshots in `docs/images/` |
| (this branch) | Crowd avoidance, new walk cycle and pose blending; parapets stop at turrets; the two northern towers cut open (king's lodging, garrison and armoury); stable; home farm and butts; ~70 more people and animals; alarm bell and portcullises; archery; click to greet and follow |
| (this branch, latest) | Las Aguzaderas opens first; the switch leads to Aberwen (`?castle=aberwen`) |
| (this branch, later) | Two castles: the app takes a site from `?castle=`; Aberwen's particulars gathered into `src/castle/site.js`; the Castillo de las Aguzaderas (c. 1410) built from research in `src/aguzaderas/` |
| (this branch, earlier) | Performance: figures merged to one mesh each, depth pre-pass for the static mesh, a uniform buffer for lights and fades, banners rippled on the GPU, shader trims, **F** for a frame-rate readout |

## Running and verifying

```sh
npm install
npm run dev                             # Vite dev server
npm run check                           # build + headless render + screenshots; exits 1 on any console error
npm run check -- --shots keep,gate      # room ids from src/aguzaderas/rooms.js (Las Aguzaderas opens first)
npm run check -- --query "?castle=aberwen" --shots kitchen,hall   # Aberwen; room ids from src/castle/rooms.js
npm run check -- --no-build --out DIR   # reuse dist/; screenshots go to DIR (default .shots/, gitignored)
npm run sources                         # regenerate SOURCES.md and SOURCES-AGUZADERAS.md; run it after editing notes or sources
```

### `scripts/check.mjs` details

- **Shots:**
  - `--shots` takes room ids, `overview`, or `js:<code>` (JavaScript run in the page before the screenshot).
  - If any shot contains commas, separate the shots with `@@` instead of commas.
  - `js:` shots are saved as `js<index>.png`.
- **`--eval "<expr>"`** runs once after load and prints its value. For example, `Object.keys(window.__castle.world.cast.actors).length`.
- **`--probe`** prints the hover label for a grid of screen points.
- **Debug hooks:** `window.__castle` is the `App` instance. Useful methods:
  - `overview({instant})` and `focusRoom(id, {instant})`;
  - `settle()` to finish the current flight and fade;
  - `simulate(seconds)` to advance the animation without rendering;
  - `controls.jumpTo({target, dist, az, el})` with angles in radians, and `pipeline.pickSync(x, y)`.

  `window.__labels` is the label table.
- **Free camera for a screenshot:** call `__castle.overview({instant:true})` first, then `controls.jumpTo`.
  - The camera sits at `target + dist·(cos el·sin az, sin el, cos el·cos az)`, so **az = 0 looks north from the south** and az = 90° puts the camera on the east.
  - `jumpTo` does not keep the camera out of walls, so a careless position renders the inside of a tower.

## Two castles (sites)

The app shows one castle per page load. `src/site.js` reads `?castle=` (Las Aguzaderas, the first in `SITES`, when none is given; `?castle=aberwen` for Aberwen) and lists the castles for the switch at the top of the room list (`ui/siteswitch.js`), which reloads the page. `src/sites.js` exports `site`, the descriptor of the castle on show. Everything castle-specific is reached through it:

- `G`, `ROOMS`, `ROOM_BY_ID`, `roomGroups` (the headings in the room list);
- `overview` (camera) and `day` (the default daylight);
- `buildStatic(b)`, `setupEffects(fx)`, `buildCast(scene)`, `createMechanisms(app)`;
- `plan` (the minimap: bounds, clickable rooms, walls, the cut line, a turned north arrow);
- `glossary`, `notes`, `sources`, and `greet` (who salutes, curtseys or waves).

Two more pieces are chosen by `SITE_ID` directly, because modules read them at load: the glossary used by `lab()` (`data/labels.js`) and the shader functions that know the plan (`SITE_GLSL` in `material.js`). Each site supplies `roofed`, `groundAt`, `sectionSide`, `topsoil` and `soot` in its `shader.js`.

Aberwen's descriptor is `src/castle/site.js`; its modules are unchanged otherwise. Las Aguzaderas lives in `src/aguzaderas/`: `layout.js` (every dimension, with where it comes from), `build.js` (all its geometry), `rooms.js`, `terrain.js`, `effects.js`, `cast.js`, `mechs.js` (the signal turret), `plan.js`, `shader.js`, `glossary.js`, `notes.js`, `sources.js`. The research behind it is `docs/research/aguzaderas.md`.

**Adding a castle:** copy the shape of `src/aguzaderas/`, add it to `SITES` in `site.js` and to `sites.js`, add its glossary to `data/labels.js` and its GLSL to `material.js`, and give `scripts/sources.mjs` a `generate()` call for it. Fade groups share `GROUP_COUNT` (32), and `G.people` should stay 18 because `mech/base.js` uses it for mechanism parts.

## Architecture

```
src/
  main.js, app.js      App: renderer, loop, hover/click picking, room focus and fades, daylight slider
  site.js, sites.js    which castle is on show (see Two castles)
  world.js             builds a site's static geometry into ONE mesh, then its effects and its cast
  geom/
    builder.js         GeoBuilder: convex solids clipped to cut planes, with real section caps
    shapes.js          wall (with openings), crenellations, stairs, beam, obox, decals
    props.js           lathe, cask, tub, sack, tables, benches, shelves, lump (unclipped sphere)
    nature.js          seeded rng, blob (convex hull), boulder, bush, gorse, tuft, fern, tree, mound
    kinds.js           surface kinds K.*, what each shows when cut (CAP_OF), palette P
  castle/              Aberwen
    site.js            its site descriptor; plan.js (minimap), shader.js (plan-aware shader functions)
    layout.js          all key dimensions (metres)
    rooms.js           fade groups G, ROOMS (fly-to targets, camera framing and limits)
    spots.js           shared anchor points (fires, spit, cauldron, doors...)
    shell.js           rock, curtains, gatehouse, ranges, roofs (OUTER_TURRETS: the outer curtain's turrets)
    towers.js          the two northern corner towers, cut open on z = TOWER_CUT, with all eight rooms; KING / GARRISON anchor points
    stable.js          lean-to stable in the north outer ward (STABLE)
    farm.js            byre, paddock, pigsty, goose pond, dovecote and butts beyond the ditch (FARM_AT, FARM_CLEAR)
    furnish.js         service rooms in detail (the original pass)
    interiors.js       hall, chamber, gatehouse, cellar, plus extras in the service rooms; lantern/cresset helpers
    wards.js           outer and inner ward dressing, weeds, spouts, shutters, wall-walk items
    landscape.js       outcrops, gorse, bracken, trees, ditch pools, track, sheepfold
    terrain.js         groundY(x, z): ground height matching the terrain solids
    ambient.js         fires, smoke, steam, light slots and glow halos
  render/
    material.js        THE surface shader (colour + normal/fade + label MRT), shared uniforms
    post.js            ink edges, wash, granulation, paper, sky, vignette
    fx.js              particle systems: smoke, steam, flame, spark, glow (additive)
    pipeline.js        MRT target, post pass, async/sync picking
    paper.js           procedural paper texture
  people/
    figure.js          articulated human figure, specs, named poses, pose blending, head turns (lookAt)
    actor.js           routine runner: walk paths with acceleration, braking, turning on the spot and rounded corners;
                       timed poses, facing, floor height; pause() for greetings; setSteps() for the alarm
    cast.js            household in the service rooms, the watch, cat, rats, cart; runs the crowd and collects alarm routines
    household.js       king's household, garrison, gate guards, drill, children, grooms, farm folk and beasts, archers
    crowd.js           keeping walkers apart: sidesteps (Actor.off), slowing (Actor.hold), glances at passers-by
    life.js            ward workers, hens, hounds, sheep, shepherd, pedlar, birds, banners
    animals.js         Cat, Rat, Horse
    creatures.js       Hen, Hound, Sheep, Bird, Beast (cow, ox, pig, goat), Goose
    banners.js         cloth banners, rippled in the vertex shader (BANNER in material.js)
    propsCarried.js    hand-held props attached to figure slots
    parts.js           helpers for small animated meshes; rig() merges a figure's parts into one mesh
  mech/                Mechanism base + windlass, spit, oven, hoist, tap, alarm (bell + portcullises), butts (archery); index.js registers them
  data/activities.js   the live "Now: …" line for a followed person, from the pose of their current step
  data/                glossary (hover terms), labels (ids), notes (panel text), sources
  ui/                  controls (orbit/pan/zoom/fly), panel, room list, minimap, castle switch, style.css
  aguzaderas/          Las Aguzaderas, the castle shown first (see Two castles)
```

### Core ideas

- **Real sections.** Every static solid goes through `GeoBuilder.solid()`, which clips it against `state.planes` (the main cut is `z ≤ 0`) and emits cap faces of the solid's cut kind.
  - Solids must be **convex**; build anything concave from several pieces.
  - Faces lying in the cut plane are welded at `build()` so no hairline cracks open between them.
  - `addGeometry` and `lump` are **not clipped**. Use them only for things that do not cross `z = 0`.
- **One static mesh.** Everything static is in a single BufferGeometry with per-vertex `acol` (colour) and `info` = (surface kind, label id, fade group).
- **Fade groups** (`G` in `rooms.js`) let a room fade the rest of the castle and hide occluders. `GROUP_COUNT` is 32, and ids 0–28 are in use. The west and east inner curtains have their own groups (`curtainW`, `curtainE`) so the tower views can hide them.
- **Labels** are 16-bit ids written to a picking target. `lab(key, room, mech)` registers a label and **throws if `key` is not in `GLOSSARY`**, so add the glossary entry first. A label with a room flies there on click; one with a mech operates it.
- **Surface kinds** choose the pattern in `material.js`: masonry, slates, boards, flags, cobbles, wattle, painted false-ashlar, log ends, foliage, straw, fur and so on. `post.js` `isCut()` lists the kinds that get the heavy section outline.
- **Lighting** comes from shared uniforms in `material.js` (the light and fade arrays live in a uniform buffer, `Tables`; see *Performance*):
  - `uDay` is 0 for dusk and 1 for bright day; the default is 0.25.
  - `uFirePos`/`uFireCol` hold **24 light slots**.
  - `uGlowAmt` scales the additive halos.

  `Effects.update()` flickers the lights and switches dusk-only systems (the gate cressets) on as `uDay` falls.
- **People and animals.** Each is an entity with `root` and `pose(name, t, params)`, run by an `Actor` through a looping list of steps:
  - `{ go: [[x, z], ...], pose }` walks a path;
  - `{ pose, dur, face, params, on }` holds a pose, with `on(actor)` run once at the start;
  - `opts.floor` fixes the walking height, or `opts.floorFn(x, z)` computes it (`groundY` outdoors).

## How to…

**Add a static object.**
1. Add a glossary key in `src/data/glossary.js`.
2. In the right file (`furnish`, `interiors`, `wards` or `landscape`), wrap the code in `b.with({ group: G.<room>, label: lab('<key>', '<roomId>') }, () => { ... })`.
3. Build it from `b.box`, `b.loft`, `b.cylinder`, `lathe`, `beam`, `blob` and the other helpers.
4. Set the material with `b.with({ kind: K.X, color })`.

**Add a surface kind.**
1. Add it to `K` in `kinds.js` and to `CAP_OF`. A cap kind equal to the kind itself keeps the solid's own colour when cut.
2. Add its pattern branch to the kind chain in `material.js`.
3. If it is a section kind, add it to `isCut()` in `post.js` and to the `cut` test and depth bias in `material.js`.

**Add a person or animal.**
1. In `cast.js` or `life.js`, call `add(name, fig(spec, '<glossaryKey>', '<roomId>'), steps, opts)`.
2. Give them a prop with `a.e.hold('handR' | 'front' | 'shoulderSlot' | 'spear' | 'back' | 'hip', carried('<prop>', a.e.mat))`.
3. Add the glossary key and an entry in `PERSON_NOTES` in `notes.js`.
4. New poses go in the `switch` in `figure.js`; new props in `propsCarried.js`.

**Add a light.**
1. Call `fx.light(slot, [x, y, z], strength, color, { dusk })` in `ambient.js`. Slots 0–21 are taken (see the table below).
2. Add `fx.glow(name, [[x, y, z]], { size, alpha })` for the halo.
3. Add flames with `fx.flames`.

**Add a room the camera can visit.**
1. Add an entry to `ROOMS` in `rooms.js`:
   - a `box` (its extent);
   - `view` (az, el and fit);
   - optional `camBox`, which keeps the camera inside, for example inside the hall;
   - optional `hide`, which fades occluding groups.
2. Add a fade group if it needs one.
3. Add a `ROOM_NOTES` entry.

**Add a mechanism.**
1. Subclass `Mechanism` (`src/mech/base.js`), giving it `controls`, `act`, `status`, `update` and optional `grab` for pointer drags.
2. Register it in `mech/index.js` and add a `MECH_NOTES` entry.

**Add a source or note.**
1. Add the entry to `SOURCES` in `sources.js`. Each needs `cite`, `short`, `claims` and optional `url`.
2. Cite it in note text with `{@id}`, and mark invented or weakly evidenced statements with `[[conj]]`.
3. Run `npm run sources`. It throws on an unknown source id; the panel shows `?` for one.

### Light slots in use

| Slots | Use |
|---|---|
| 0–4 | roasting fire, boiling fire, hall fire, brewhouse furnace, bread oven (switched by the oven mechanism) |
| 5–7 | smithy forge, guardroom fire, lodging fire |
| 8–14 | hall candle-beam, two hall tables, chamber candlestick, cellar lantern, guardroom and lodging candles |
| 15 | brazier on the north wall-walk |
| 16–17 | cressets at the inner and outer gates (dusk only) |
| 18–21 | lanterns in the larder, pantry, buttery and store-house |
| 22–23 | king's bedchamber fire, privy-chamber brazier |
| 24–26 | bedchamber candle, knights' chamber candle, prison lantern |
| 27–30 | armoury lantern, dormitory candle, mess brazier, constable's fire |
| 31 | stable lantern |

`MAX_FIRES` is now 32 and all slots are taken; raise it in `material.js` to add more.

### People: crowd, gait and interaction

- **Crowd.** `crowd.js` runs every frame over all actors with `solid` (rats are not). Each actor has a `radius`; `yields: false` keeps it planted (people seated or asleep, tethered horses); `shy` makes small creatures scatter from walkers. A walker sidesteps through `Actor.off` (a visual offset from its path, eased back to zero) and slows through `Actor.hold`. Offsets are small (≈0.5 m), so routes through doorways still need to be planned with some room.
- **Checking for collisions.** Simulate in the page and look for pairs closer than their radii: see the snippet used during development in the commit history, or write one with `__castle.simulate()` and `world.cast.actors` (`a.x`, `a.z`, `a.radius`).
- **Gait.** Pass `stepAmt` (0 standing … 1 normal) to walking poses; the actor computes it from its speed. A step may set `stride` (metres per full cycle), e.g. 2.4 for running.
- **Greeting and following.** `App.actorAt(label, x, y)` finds which of the actors sharing a label was clicked; `App.greet()` pauses it with a bow, curtsey, salute or wave (seated people only look up); `App.follow(actor)` keeps the camera on it.
- **Alarm.** Routines for the alarm are pairs `[actor, steps]` in `cast.alarm`; the alarm mechanism swaps them in with `setSteps()` and restores the saved routine on standing down.
- **Seeds.** `rngOf()` scrambles its seed: plain LCGs started from nearby seeds give nearly the same first numbers, which once sent every cow to the same spot.

## Performance

Press **F** in the app (or open it with `?stats`) for a readout: frames per second, the worst frame in the last half second, CPU time per frame in the main loop, draw calls and triangles of the scene pass, and the render size and scale. `npm run check` prints the scene pass's draw calls and triangles too.

What is in place:

- **Merged figures** (`rig()` in `parts.js`). Each person or animal is one mesh, not a dozen. Every vertex carries the index of its body part (`part`), and the vertex shader moves it by that part's matrix (`uParts`, `RIGID_PARTS` in `material.js`). The original part meshes stay in the tree as stand-ins, with their layers disabled so they draw nothing; their matrices drive the merged mesh, so poses, joints and `hold()` work as before, and hiding a stand-in hides its part. `rig()` runs in `cast.js` `add()` and for the doves and birds. Run it **before** holding props: props stay separate meshes. Merged meshes are frustum-culled with a bounding sphere padded for posing.
- **Depth pre-pass** for the static mesh (`makeDepthMaterial`, `renderOrder = -1` in `world.js`). The full surface shader then runs with depth writes off, so it shades only the nearest surface at each pixel. The vertex shader declares `invariant gl_Position` so both passes produce the same depths; anything that changes the static mesh's vertex positions must change them in both.
- **A uniform buffer for the tables.** `uFirePos`, `uFireCol` and `uFade` are in the `Tables` uniform block, uploaded in one call per frame by `uploadTables()` before the scene pass. As plain uniform arrays three.js re-uploaded them at every change of material, which in SwiftShader cost about 9 ms a frame. Every element is a `vec4` (so `uFireCol` has a spare `w` and `uFade` packs four groups to an element); set fades with `setFades()`. The buffer sits at uniform binding point 0, where every block starts out, so three.js's own `UniformsGroup` must not be used alongside it.
- **Banners in the vertex shader.** The cloth's positions hold (u, v); `bannerAt()` in `material.js` makes the ripple and the normals. The CPU only works out the gust.
- **Shader trims.** The finer pigment noise (`blot2`) is computed only for the surface kinds that use it, and the light loop skips lights too far away to add a visible amount.

Still to try, in rough order of likely gain:

- skip posing actors whose merged mesh was culled last frame (posing and the crowd are most of the remaining CPU time);
- cull lights per room on the CPU, so the light loop is shorter indoors;
- a cheaper post pass at high pixel ratios (it takes about 40 texture reads per pixel);
- instance the hens, sheep and birds (now one draw call each, so the gain is small).

## Gotchas

- **Layout is hard-coded into the shaders.** Several approximations in `material.js` use world-space boxes from `layout.js` and must be updated if the plan changes:
  - `roofed()`: which rooms get less daylight;
  - `groundAt()`: where damp sits at the wall feet;
  - the soot region over the kitchen, bakehouse and brewhouse, and the x-positions of its hearth plumes;
  - the topsoil band in the rock section, with its terrain heights per x-range;
  - the test that treats the terrain block's outer faces (x ≈ ±62/72, z ≈ −62) as section faces.
- **`groundY()` must match the terrain solids.** The northern slope in `shell.js` is built from the triangles in `NORTH_FALL` so the two agree; the other regions are formulas in `terrain.js`.
- **`obox` rotates about y only.** For tilted boxes use `beam` or `loft`.
- **Stale builds.** `--no-build` reuses `dist/`; rebuild after any source change.
- **Picking reads the label target.** Particles write alpha 0 to it, so smoke and glows never block hover.
- **Scene randomness is seeded.** `nature.js` `rng` and `life.js` `rngOf` make the scene identical on every load. The `Math.random()` in `fx.js` only scatters particles.
- **Glow particles are additive** (`kind: 'glow'`, custom blending), so they brighten the colour target, never darken it, and add no ink.

## Known issues and limitations

1. **Frame rate on real GPUs is still unknown.** See *Performance* for what has been done and what is left. The remaining likely costs are the per-fragment work in `material.js` (fbm noise, Voronoi rubble and cobbles, the light loop) and the full-screen post pass. `App._adapt` drops render resolution to 60% when frames are slow.
2. **Touch and mobile layout have not been tested.** Controls are mouse and keyboard; the side panels are fixed-width.
3. **Some sources are weaker than others.** The details are in `SOURCES.md`.
   - **Falconry:** the Oggins book was confirmed from a catalogue record only.
   - **Embrasure shutters:** no evidence was found at the Welsh castles, so they are marked conjecture.
   - **Red false-joints:** supported by a general statement about medieval interiors, not one about Edward's works specifically.
   - **Sawpits:** dug pits are later than 1290, so the sawyers work on trestles.
4. **Hover text on fast-moving things.** Picking is asynchronous and throttled, so a quick bird or walker can show a stale tooltip.
5. **Camera limits are boxes.** Inside a room the camera is kept in an axis-aligned `camBox`. Orbiting to the edge of the allowed angle can still put walls between you and the room in a few views.
6. **No automated tests beyond `npm run check`.** It only catches console errors; visual regressions need a look at the screenshots.

## Ideas not yet done

- Stairs between floors, so people can move up and down the towers (and the garrison can man the walls when the alarm rings).
- Leading horses in and out of the stable; feeding the pigs as an interaction.

- A day cycle driven by `uDay`, with the household's routines changing with it (supper by candlelight, gates shut at dusk).
- The southern half as an optional ghost, or a second cut through the chapel and the southern ranges.
- Sound: crackling fires, the spit, hens, wind on the wall-walk.
- A guided tour mode that flies room to room with the notes.
- Performance: the items under *Still to try* in *Performance*.

## Conventions

- **Code style:** plain ES modules with no TypeScript and no framework; two-space indent; comments short and explanatory.
- **Units and axes:**
  - Metres; +x east, +y up, −z north.
  - The cut plane is z = 0; the south half (z > 0) is removed.
  - The inner ward is at y = 0 and the outer ward at y = −1.5.
- **Historical honesty:**
  - Nothing post-1290 goes in: no hops, potatoes, turkeys or dug sawpits.
  - When in doubt, mark it `[[conj]]` rather than leave it out of the notes.
- **Commits:** clear messages, the attribution trailer the repo already uses, and no model names in commit text or code.
