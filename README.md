# Aberwen Castle, c. 1290: an interactive cutaway

An ink-and-watercolour cross-section of a fictional concentric castle in North Wales,
modelled on Edward I's castles at Harlech, Conwy and Beaumaris. The castle is sliced
in half along the gate passage, the well and the great hall. Full interior detail goes
to the service rooms (kitchen, bakehouse, brewhouse, buttery, pantry, larder, well,
undercroft and store-house), where the household works through its morning before dinner.

All geometry is built procedurally in code, and all art is original.

## Running

```sh
npm install
npm run dev      # development server
npm run build    # production build in dist/
npm run check    # build, render in headless Chromium, screenshot, fail on console errors
npm run sources  # regenerate SOURCES.md from src/data/sources.js and src/data/notes.js
```

`npm run check` accepts `--shots kitchen,well,...` (room ids) and `--out DIR`.

## Using it

- **Orbit**: drag. Over the whole castle you can circle all the way round; inside a room the orbit is
  limited so the open side of the room stays towards you.
- **Pan**: right-drag, shift-drag or WASD / arrow keys (Q/E for down/up).
- **Zoom**: scroll; it zooms towards the cursor.
- **Fly to a room**: click it in the view, the room list or the plan. The rest of the castle fades back.
  Press **Esc** or **Back** to return.
- **Hover** anything for its proper name and a one-line gloss. Click a room, mechanism or servant for
  notes with sources in the side panel.
- **Mechanisms**: drag a crank up or down to turn it, click parts, or use the panel buttons.
  - Well windlass: lower the bucket, wind it up full, empty it into the trough.
  - Roasting spit: stop the spit boy and watch one side char. Turn it yourself to brown it evenly.
  - Bread oven: fire, rake out, swab, set loaves with the peel, seal, bake, draw.
  - Cellar trapdoor and hoist: open the hatch and wind a cask up from the undercroft.
  - Buttery tap: open the faucet with the vent peg shut and the ale glugs and stops.

## How it is made

- `src/geom/builder.js`: a geometry builder that clips convex solids against the cut plane and
  generates real cap faces tagged as section fill. Coplanar T-junctions are welded to avoid cracks.
- `src/castle/`: layout, shell (curtains, towers, gatehouse, ranges, rock), furnishings, effects.
- `src/render/`: one surface shader writing colour, normals and picking labels to three targets.
  A post pass draws wobbling ink lines, pigment pooling, granulation and paper. Smoke, steam and
  flames are watercolour particles.
- `src/people/`: articulated procedural figures (smooth, pleated surfaces of revolution), animals,
  the routine engine, and the watch patrolling the wall-walks.
- `src/mech/`: the five working mechanisms.
- `src/data/`: glossary, notes and sources. `SOURCES.md` lists every reference and the claims it
  supports, and every statement marked as conjecture.

Three.js and Vite, plain JavaScript modules.
