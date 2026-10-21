import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { MAIN_CUT, planeY } from '../geom/builder.js';
import { wall, cren, crenRing, decalRing, decalX, decalZ, stairs, squareWithHole, beam, obox, v3 } from '../geom/shapes.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import {
  WARD_Y, OUTER_Y, BASE_Y, IW, IC_T, IC_H, IC_OUT, OC_IN, OC_OUT, OC_H, TOWER_R, TOWER_H, TOWERS,
  GH, HALL, SERV, NR, WELL, DITCH,
} from './layout.js';

// Corners of the northern fall of the ground, split into planar triangles.
export const NORTH_FALL = [
  [[-40, OUTER_Y, -40], [72, -4, -40], [72, -12, -62]],
  [[-40, OUTER_Y, -40], [72, -12, -62], [-40, -12, -62]],
  [[-62, -14, -40], [-40, OUTER_Y, -40], [-40, -12, -62]],
  [[-62, -14, -40], [-40, -12, -62], [-62, -18, -62]],
];

const ROCK = { kind: K.ROCK, color: P.rock, capKind: K.CUT_ROCK, capColor: P.cutRock };

export function buildShell(b) {
  terrain(b);
  wellShaft(b);
  outerCurtain(b);
  innerCurtain(b);
  cornerTowers(b);
  gatehouse(b);
  westRange(b);
  northRange(b);
}

// ---------------------------------------------------------------------------
// Terrain: a rock block in section, turf on top, rock-cut ditch on the east.
// ---------------------------------------------------------------------------
function terrain(b) {
  const zBack = -40;
  const turf = { topKind: K.GROUND, topColor: P.turf };
  const earth = { topKind: K.GROUND, topColor: P.earth };
  b.with({ ...ROCK, group: G.terrain, label: lab('rock') }, () => {
    // west crag falling away, ending in a cut face
    b.loft(
      [v3(-62, BASE_Y, zBack), v3(-40, BASE_Y, zBack), v3(-40, BASE_Y, 0), v3(-62, BASE_Y, 0)],
      [v3(-62, -14, zBack), v3(-40, OUTER_Y, zBack), v3(-40, OUTER_Y, 0), v3(-62, -14, 0)],
    );
    b.with({ label: lab('turf') }, () => {
      // turf skin on the slope
      b.loft(
        [v3(-62, -14, zBack), v3(-40, OUTER_Y, zBack), v3(-40, OUTER_Y, 0), v3(-62, -14, 0)],
        [v3(-62, -13.85, zBack), v3(-40, OUTER_Y + 0.15, zBack), v3(-40, OUTER_Y + 0.15, 0), v3(-62, -13.85, 0)],
        { kind: K.GROUND, color: P.turf, capKind: K.CUT_EARTH, capColor: P.cutEarth },
      );
    });

    // base rock under the castle, in x-strips so nothing overlaps on the cut.
    // Ground surfaces are thin labelled skins over the rock so that the
    // section shows one continuous rock face.
    const SK = 0.08;
    const strip = (x0, x1, top, z0 = zBack, z1 = 0) => b.box(x0, BASE_Y, z0, x1, top, z1);
    const skin = (x0, x1, top, key, room, color = P.turf, z0 = zBack, z1 = 0) =>
      b.with({ label: lab(key, room), kind: K.GROUND, color, capKind: K.CUT_EARTH }, () => b.box(x0, top - SK, z0, x1, top, z1));
    strip(-40, IC_OUT.x0, OUTER_Y - SK);
    skin(-40, IC_OUT.x0, OUTER_Y, 'outerWard', 'outerWard');
    // west range: lowered for the undercroft (z from the cross wall to the cut)
    strip(IC_OUT.x0, HALL.x1 + HALL.wallT, -4, HALL.zCross0, 0);
    strip(IC_OUT.x0, HALL.x1 + HALL.wallT, OUTER_Y, zBack, HALL.zCross0);
    strip(HALL.x1 + HALL.wallT, WELL.x - 2, OUTER_Y);
    // well column
    strip(WELL.x - 2, WELL.x + 2, WELL.bottom);
    b.box(WELL.x - 2, WELL.bottom, zBack, WELL.x + 2, OUTER_Y, -2);
    strip(WELL.x + 2, IC_OUT.x1, OUTER_Y);
    strip(IC_OUT.x1, OC_IN.x1, OUTER_Y - SK);
    skin(IC_OUT.x1, OC_IN.x1, OUTER_Y, 'outerWard', 'outerWard');
    // turf over the rock in the north outer ward and outside the north curtain
    // (just proud of the rock top so the two faces do not fight)
    b.with({ label: lab('outerWard', 'outerWard'), kind: K.GROUND, color: P.turf, capKind: K.CUT_EARTH }, () => b.box(IC_OUT.x0, OUTER_Y - 0.06, zBack, IC_OUT.x1, OUTER_Y + 0.02, IC_OUT.z0));
    strip(OC_IN.x1, DITCH.x0, OUTER_Y - SK);
    skin(OC_IN.x1, DITCH.x0, OUTER_Y, 'turf', null);
    strip(DITCH.x0, DITCH.x1, DITCH.y - SK);
    skin(DITCH.x0, DITCH.x1, DITCH.y, 'ditch', null);
    // east field, slightly lower, ending in a cut face
    b.loft(
      [v3(DITCH.x1, BASE_Y, zBack), v3(72, BASE_Y, zBack), v3(72, BASE_Y, 0), v3(DITCH.x1, BASE_Y, 0)],
      [v3(DITCH.x1, -2.2, zBack), v3(72, -4, zBack), v3(72, -4, 0), v3(DITCH.x1, -2.2, 0)],
      { topKind: K.GROUND, topColor: P.turf },
    );
    // northern fall of the ground, as triangular prisms so that each top is
    // a true plane (groundY in landscape.js follows the same triangles)
    for (const tri of NORTH_FALL) {
      b.loft(tri.map(([x, , z]) => v3(x, BASE_Y, z)), tri.map(([x, y, z]) => v3(x, y, z)), { topKind: K.GROUND, topColor: P.turf });
    }
  });

  // inner platform (rock, ward level 0) with a skin of trodden earth
  b.with({ ...ROCK, group: G.ward, label: lab('rock') }, () => {
    const SK = 0.08;
    const pl = (x0, z0, x1, z1) => {
      b.box(x0, OUTER_Y, z0, x1, WARD_Y - SK, z1);
      b.with({ label: lab('innerWard', 'ward'), kind: K.GROUND, color: P.earth, capKind: K.CUT_EARTH }, () => b.box(x0, WARD_Y - SK, z0, x1, WARD_Y, z1));
    };
    // west part behind the undercroft (under the services)
    pl(IW.x0, IW.z0, HALL.x1 + HALL.wallT, HALL.zCross0);
    // main ward, split around the well collar
    pl(HALL.x1 + HALL.wallT, IW.z0, WELL.x - 2, 0);
    pl(WELL.x - 2, IW.z0, WELL.x + 2, -2);
    pl(WELL.x + 2, IW.z0, IW.x1, 0);
    // under the gate passage, outside the curtain line
    b.box(IW.x1, OUTER_Y, -GH.passHalf, 28, WARD_Y, 0, { topKind: K.PAVING, topColor: P.paving });
  });
}

function wellShaft(b) {
  const { x, z, r, lining } = WELL;
  const ro = r + lining;
  b.with({ ...ROCK, group: G.well, label: lab('rock') }, () => {
    squareWithHole(b, x, z, 2, r, WELL.bottom, -6, 20);
  });
  b.with({ kind: K.STONE, color: P.ashlar, group: G.well, label: lab('wellShaft', 'well') }, () => {
    b.with({ ...ROCK, label: lab('rock') }, () => squareWithHole(b, x, z, 2, ro, -6, OUTER_Y, 20));
    b.with({ ...ROCK, label: lab('innerWard', 'ward'), group: G.ward }, () => squareWithHole(b, x, z, 2, ro, OUTER_Y, WARD_Y, 20));
    b.ring(x, z, r, ro, -6, 0.9, 20, 0, Math.PI * 2, { topKind: K.STONE });
  });
  // water, cut in section
  b.with({ kind: K.WATER, color: P.water, capKind: K.WATER, capColor: P.water, group: G.well, label: lab('well', 'well') }, () => {
    b.cylinder(x, z, r, WELL.bottom, WELL.water, 20);
  });
}

// ---------------------------------------------------------------------------
// Outer curtain with turrets, outer gate and bridge
// ---------------------------------------------------------------------------
function outerCurtain(b) {
  const top = OUTER_Y + OC_H;
  const o = { group: G.outer, kind: K.STONE, color: P.stone, label: lab('curtainOuter', 'outerWard') };
  b.with(o, () => {
    // north
    b.box(OC_OUT.x0, OUTER_Y, OC_OUT.z0, OC_OUT.x1, top, OC_IN.z0, { topKind: K.PAVING, topColor: P.paving });
    // west (cut)
    b.box(OC_OUT.x0, OUTER_Y, OC_IN.z0, OC_IN.x0, top, 0, { topKind: K.PAVING, topColor: P.paving });
    // east, with the outer gate on the cut line
    wall(b, 'z', OC_IN.z0, 0, OC_IN.x1, OC_OUT.x1, OUTER_Y, top, [{ a0: -1.8, a1: 1.8, y0: OUTER_Y, y1: OUTER_Y + 3.6, arch: 'pointed', rise: 1.4 }]);
    b.with({ label: lab('parapet', 'outerWard') }, () => {
      cren(b, 'x', OC_OUT.x0, OC_OUT.x1, OC_OUT.z0, OC_OUT.z0 + 0.7, top, { mh: 1.3 });
      cren(b, 'z', OC_IN.z0, 0, OC_OUT.x0, OC_OUT.x0 + 0.7, top, { mh: 1.3 });
      cren(b, 'z', OC_IN.z0, 0, OC_OUT.x1 - 0.7, OC_OUT.x1, top, { mh: 1.3 });
    });
    // arrow loops in the outer face would face away; put a few on the inner side as embrasures
    for (let x = -34; x <= 34; x += 6) decalX(b, x, OUTER_Y + 1.2, OUTER_Y + 3.0, 0.5, OC_IN.z0, 1, { label: lab('arrowLoop', 'outerWard'), color: P.soot });
  });
  b.with({ ...o, label: lab('outerTurret', 'outerWard') }, () => {
    const t = (x, z, r) => {
      b.cylinder(x, z, r, OUTER_Y, top + 1.2, 20, { topKind: K.PAVING, topColor: P.lead });
      crenRing(b, x, z, r - 0.6, r, top + 1.2, { seg: 20, mh: 1.2 });
      for (let k = 0; k < 4; k++) decalRing(b, x, z, r, Math.PI / 2 + (k - 1.5) * 0.5, OUTER_Y + 1.5, OUTER_Y + 3.4, 0.16);
    };
    t(OC_OUT.x0 + 1, OC_OUT.z0 + 1, 3.2);
    t(OC_OUT.x1 - 1, OC_OUT.z0 + 1, 3.2);
    t(-13, OC_OUT.z0 + 0.5, 2.5);
    t(13, OC_OUT.z0 + 0.5, 2.5);
    t(OC_OUT.x0 + 0.5, -15, 2.5);
    t(OC_OUT.x1 + 0.4, -4.6, 2.8); // gate turret (its twin is in the removed half)
  });
  // bridge across the ditch: stone pier, timber deck, cut on the line
  b.with({ group: G.outer, label: lab('bridge', 'outerWard') }, () => {
    b.with({ kind: K.STONE, color: P.stoneDark }, () => b.box(47, DITCH.y, -2.2, 49, -1.95, 0));
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      b.box(OC_OUT.x1, -1.95, -1.9, DITCH.x1 + 1.5, -1.6, 0, { topKind: K.BOARDS, topColor: P.boards });
      for (const x of [41, 44, 47, 50, 53]) b.box(x - 0.1, -1.6, -1.9, x + 0.1, -0.6, -1.7);
      b.box(OC_OUT.x1, -0.75, -1.9, DITCH.x1 + 1.5, -0.6, -1.7);
      for (const x of [45.5, 50.5]) beam(b, v3(x, DITCH.y, -1.8), v3(x < 48 ? 47 : 49, -2.0, -1.8), 0.25, 0.25);
    });
  });
}

// ---------------------------------------------------------------------------
// Inner curtain. Segments behind the north range rooms belong to those rooms
// so that they stay solid when the room is in focus.
// ---------------------------------------------------------------------------
function innerCurtain(b) {
  const base = { kind: K.STONE, color: P.stone, label: lab('curtainInner'), group: G.inner };
  const walkTop = { topKind: K.PAVING, topColor: P.paving };
  const nz0 = IC_OUT.z0;
  const nz1 = IW.z0;
  const r = NR.rooms;
  const segs = [
    [IW.x0 - 1, SERV.part0 + 0.4, G.buttery],
    [SERV.part0 + 0.4, SERV.x1 + 0.6, G.pantry],
    [SERV.x1 + 0.6, r.larder.x1 + 0.4, G.larder],
    [r.larder.x1 + 0.4, r.kitchen.x1 + 0.4, G.kitchen],
    [r.kitchen.x1 + 0.4, r.bakehouse.x1 + 0.4, G.bakehouse],
    [r.bakehouse.x1 + 0.4, r.brewhouse.x1 + 0.4, G.brewhouse],
    [r.brewhouse.x1 + 0.4, IW.x1 + 1, G.granary],
  ];
  const kitchenFires = [{ c: -3.4, w: 3.8 }, { c: 2.2, w: 2.8 }];
  b.with(base, () => {
    for (const [x0, x1, g] of segs) {
      b.with({ group: g }, () => {
        if (g === G.kitchen) {
          // fireplaces recessed 1.4 m into the wall
          const zr = nz1 - 1.4;
          b.box(x0, OUTER_Y, nz0, x1, IC_H, zr, walkTop);
          wall(b, 'x', x0, x1, zr, nz1, OUTER_Y, IC_H,
            kitchenFires.map((f) => ({ a0: f.c - f.w / 2, a1: f.c + f.w / 2, y0: WARD_Y, y1: 3.4, arch: 'segmental', rise: 0.6 })), walkTop);
          b.with({ label: lab('fireplace', 'kitchen') }, () => {
            for (const f of kitchenFires) {
              // sooty back and hearth
              decalX(b, f.c, WARD_Y, 3.3, f.w - 0.1, zr, 1, { color: P.soot, depth: 0.03 });
              b.with({ kind: K.PAVING, color: 0x9d9488 }, () => b.box(f.c - f.w / 2, WARD_Y, zr, f.c + f.w / 2, 0.12, nz1 + 0.6));
            }
          });
          // chimney stacks on the wall-walk
          b.with({ label: lab('chimney', 'kitchen') }, () => {
            for (const f of kitchenFires) {
              b.box(f.c - 0.9, IC_H, nz1 - 2.4, f.c + 0.9, IC_H + 4.2, nz1 - 0.6);
              b.box(f.c - 1.05, IC_H + 4.2, nz1 - 2.55, f.c + 1.05, IC_H + 4.5, nz1 - 0.45);
            }
          });
        } else if (g === G.bakehouse) {
          b.box(x0, OUTER_Y, nz0, x1, IC_H, nz1, walkTop);
          b.with({ label: lab('chimney', 'bakehouse') }, () => b.box(8.6, IC_H, nz1 - 2.0, 9.9, IC_H + 3.4, nz1 - 0.6));
        } else if (g === G.brewhouse) {
          b.box(x0, OUTER_Y, nz0, x1, IC_H, nz1, walkTop);
          b.with({ label: lab('chimney', 'brewhouse') }, () => b.box(14.6, IC_H, nz1 - 2.0, 15.9, IC_H + 3.4, nz1 - 0.6));
        } else {
          b.box(x0, OUTER_Y, nz0, x1, IC_H, nz1, walkTop);
        }
      });
    }
    b.with({ label: lab('parapet') }, () => cren(b, 'x', IW.x0 - 1, IW.x1 + 1, nz0, nz0 + 0.9, IC_H));

    // west curtain (cut). Deeper footing for the undercroft.
    b.with({ group: G.buttery }, () => b.box(IC_OUT.x0, OUTER_Y, IW.z0, IW.x0, IC_H, SERV.z1, walkTop));
    b.with({ group: G.hall }, () => {
      b.box(IC_OUT.x0, -4, SERV.z1, IW.x0, IC_H, 0, walkTop);
      hallFireplace(b);
      b.with({ label: lab('chimney', 'hall') }, () => b.box(IC_OUT.x0 + 1.4, IC_H, -5.4, IW.x0 - 0.2, IC_H + 3.6, -3.8));
    });
    b.with({ label: lab('parapet') }, () => cren(b, 'z', IW.z0, 0, IC_OUT.x0, IC_OUT.x0 + 0.9, IC_H));

    // east curtain north of the gatehouse
    b.with({ group: G.granary }, () => b.box(IW.x1, OUTER_Y, IW.z0, IC_OUT.x1, IC_H, GH.z0, walkTop));
    b.with({ label: lab('parapet') }, () => cren(b, 'z', IW.z0, GH.z0, IC_OUT.x1 - 0.9, IC_OUT.x1, IC_H));
  });
}

function hallFireplace(b) {
  const zc = -4.6;
  const x = IW.x0;
  b.with({ label: lab('hallFire', 'hall'), kind: K.STONE, color: P.ashlar }, () => {
    b.box(x, HALL.floorY, zc - 1.6, x + 0.5, HALL.floorY + 2.6, zc - 1.2); // jambs
    b.box(x, HALL.floorY, zc + 1.2, x + 0.5, HALL.floorY + 2.6, zc + 1.6);
    // hood: sloping front
    b.loft(
      [v3(x, 3.2, zc - 1.7), v3(x + 0.9, 3.2, zc - 1.7), v3(x + 0.9, 3.2, zc + 1.7), v3(x, 3.2, zc + 1.7)],
      [v3(x, 7.4, zc - 0.9), v3(x + 0.25, 7.4, zc - 0.9), v3(x + 0.25, 7.4, zc + 0.9), v3(x, 7.4, zc + 0.9)],
    );
    b.box(x, 2.6 + HALL.floorY - 0.1, zc - 1.7, x + 0.9, 3.2, zc + 1.7);
    decalZ(b, zc, HALL.floorY, 2.9, 2.3, x, 1, { color: P.soot, depth: 0.03 });
    b.with({ kind: K.PAVING, color: 0x9d9488 }, () => b.box(x, HALL.floorY, zc - 1.4, x + 1.2, HALL.floorY + 0.08, zc + 1.4));
  });
}

// ---------------------------------------------------------------------------
// Corner towers (the two southern ones lie in the removed half)
// ---------------------------------------------------------------------------
function cornerTowers(b) {
  b.with({ kind: K.STONE, color: P.ashlar, group: G.towers, label: lab('tower') }, () => {
    for (const key of ['nw', 'ne']) {
      const t = TOWERS[key];
      b.cylinder(t.x, t.z, TOWER_R, OUTER_Y, TOWER_H, 32, { topKind: K.PAVING, topColor: P.lead });
      b.with({ label: lab('parapet') }, () => crenRing(b, t.x, t.z, TOWER_R - 0.9, TOWER_R, TOWER_H, { seg: 32 }));
      // stair turret on the ward side
      const a = key === 'nw' ? Math.PI * 0.25 : Math.PI * 0.75;
      const sx = t.x + Math.cos(a) * (TOWER_R - 1.6);
      const sz = t.z + Math.sin(a) * (TOWER_R - 1.6);
      b.with({ label: lab('turret') }, () => {
        b.cylinder(sx, sz, 1.7, TOWER_H, TOWER_H + 4, 16, { topKind: K.PAVING, topColor: P.lead });
        crenRing(b, sx, sz, 1.1, 1.7, TOWER_H + 4, { seg: 16, mh: 1.1 });
      });
      // loops facing the ward
      b.with({ label: lab('arrowLoop') }, () => {
        for (const y of [3, 8.5, 14]) {
          for (const da of [-0.35, 0.35]) decalRing(b, t.x, t.z, TOWER_R, a + da, y, y + 1.8, 0.16);
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Gatehouse: cut along the gate passage
// ---------------------------------------------------------------------------
function gatehouse(b) {
  const { x0, x1, z0, passHalf: ph, towerR, towerZ, roofY, floor1, floor2 } = GH;
  const wt = 1.2;
  const pass = { label: lab('gatePassage', 'gatehouse') };
  const lead = { topKind: K.PAVING, topColor: P.lead };
  b.with({ kind: K.STONE, color: P.ashlar, group: G.gatehouse, label: lab('gatehouse', 'gatehouse') }, () => {
    // north wall of the block
    b.box(x0, OUTER_Y, z0, x1, roofY, z0 + wt, lead);
    // ward-side (west) wall: passage arch below, three great windows per floor above
    const win = (y0, y1) => [
      { a0: -7.0, a1: -5.6, y0, y1, arch: 'pointed', rise: 1.1 },
      { a0: -4.0, a1: -2.6, y0, y1, arch: 'pointed', rise: 1.1 },
      { a0: -0.9, a1: 0.9, y0, y1, arch: 'pointed', rise: 1.2 },
    ];
    wall(b, 'z', z0 + wt, 0, x0, x0 + wt, WARD_Y, roofY, [
      { a0: -ph, a1: ph, y0: WARD_Y, y1: 4.2, arch: 'pointed', rise: 1.6 },
      ...win(floor1 + 1.4, floor1 + 4.6),
      ...win(floor2 + 1.2, floor2 + 4.2),
    ], lead);
    // east wall over the passage
    wall(b, 'z', z0 + wt, 0, x1 - wt, x1, OUTER_Y, roofY, [
      { a0: -ph, a1: ph, y0: OUTER_Y, y1: 4.2, arch: 'pointed', rise: 1.6 },
      { a0: -4.2, a1: -3.4, y0: floor1 + 1.6, y1: floor1 + 3.8 },
      { a0: -4.2, a1: -3.4, y0: floor2 + 1.6, y1: floor2 + 3.8 },
    ], lead);
    // north side of the passage (guard chamber wall)
    b.with(pass, () => {
      b.box(x0 + wt, WARD_Y, -ph - 1.2, x1 - wt, floor1 - 0.8, -ph);
      // vault over the passage with murder holes
      const holes = [22.2, 25.0, 28.4];
      let cur = x0 + wt;
      for (const hx of holes) {
        b.box(cur, floor1 - 1.6, -ph - 0.01, hx - 0.3, floor1 - 0.2, 0);
        cur = hx + 0.3;
      }
      b.box(cur, floor1 - 1.6, -ph - 0.01, x1 - wt, floor1 - 0.2, 0);
      b.with({ label: lab('murderHoles', 'gatehouse') }, () => {
        for (const hx of holes) b.box(hx - 0.3, floor1 - 1.6, -ph - 0.01, hx + 0.3, floor1 - 0.2, -0.9);
      });
    });
    // passage floor: level, then ramping down to the outer ward
    b.with({ ...pass, kind: K.PAVING, color: P.paving }, () => {
      b.loft(
        [v3(28, OUTER_Y, -ph), v3(x1 + towerR, OUTER_Y, -ph), v3(x1 + towerR, OUTER_Y, 0), v3(28, OUTER_Y, 0)],
        [v3(28, WARD_Y, -ph), v3(x1 + towerR, OUTER_Y, -ph), v3(x1 + towerR, OUTER_Y, 0), v3(28, WARD_Y, 0)],
      );
    });
    // portcullis grooves (dark slots) in the passage wall
    b.with({ label: lab('portcullis', 'gatehouse') }, () => {
      for (const gx of [21.4, 26.6, 33.4]) decalX(b, gx, WARD_Y - 1, floor1 - 0.8, 0.22, -ph, 1, { color: P.soot });
    });

    // floors (timber over the passage vault)
    b.with({ kind: K.TIMBER, color: P.timber, label: lab('ghChamber', 'gatehouse') }, () => {
      b.box(x0 + wt, floor1 - 0.2, z0 + wt, x1 - wt, floor1, 0, { topKind: K.BOARDS, topColor: P.boards });
      b.box(x0 + wt, floor2 - 0.3, z0 + wt, x1 - wt, floor2, 0, { topKind: K.BOARDS, topColor: P.boards });
      // beams under floors
      for (let x = x0 + wt + 0.8; x < x1 - wt; x += 1.6) {
        b.box(x - 0.15, floor2 - 0.7, z0 + wt, x + 0.15, floor2 - 0.3, 0);
      }
    });
    // roof: lead flat on timbers, parapet
    b.with({ kind: K.TIMBER, color: P.lead, label: lab('gatehouse', 'gatehouse') }, () => {
      b.box(x0 + wt, roofY - 0.5, z0 + wt, x1 - wt, roofY, 0, { topKind: K.PAVING, topColor: P.lead });
    });
    b.with({ label: lab('parapet') }, () => {
      cren(b, 'x', x0, x1, z0, z0 + 0.8, roofY);
      cren(b, 'z', z0, 0, x0, x0 + 0.8, roofY);
      cren(b, 'z', z0, 0, x1 - 0.8, x1, roofY);
    });
    // fireplaces in the chambers (north wall)
    b.with({ label: lab('ghChamber', 'gatehouse') }, () => {
      for (const fy of [floor1, floor2]) {
        const fx = 25;
        b.box(fx - 1.4, fy, z0 + wt, fx - 1.0, fy + 2.2, z0 + wt + 0.5);
        b.box(fx + 1.0, fy, z0 + wt, fx + 1.4, fy + 2.2, z0 + wt + 0.5);
        b.loft(
          [v3(fx - 1.5, fy + 2.2, z0 + wt), v3(fx + 1.5, fy + 2.2, z0 + wt), v3(fx + 1.5, fy + 2.2, z0 + wt + 0.8), v3(fx - 1.5, fy + 2.2, z0 + wt + 0.8)],
          [v3(fx - 0.8, fy + 4.6, z0 + wt), v3(fx + 0.8, fy + 4.6, z0 + wt), v3(fx + 0.8, fy + 4.6, z0 + wt + 0.2), v3(fx - 0.8, fy + 4.6, z0 + wt + 0.2)],
        );
        decalX(b, fx, fy, fy + 2.1, 1.9, z0 + wt, 1, { color: P.soot, depth: 0.03 });
      }
    });

    // north D-tower on the field side
    b.with({ addPlanes: [{ n: new THREE.Vector3(-1, 0, 0), d: -(x1 - wt + 0.2) }] }, () => b.cylinder(x1, -towerZ, towerR, OUTER_Y, roofY, 28, lead));
    b.with({ label: lab('parapet') }, () => crenRing(b, x1, -towerZ, towerR - 0.8, towerR, roofY, { seg: 28, a0: -Math.PI / 2, a1: Math.PI / 2 }));
    b.with({ label: lab('arrowLoop') }, () => {
      for (const y of [1.5, 7.5, 13]) decalRing(b, x1, -towerZ, towerR, 0.25, y, y + 1.8, 0.16);
    });
    // front arch between the towers (portcullis chamber above), cut
    b.box(x1, floor1 - 1.6, -ph, x1 + 2.4, roofY, 0, lead);
    b.with({ label: lab('parapet') }, () => cren(b, 'x', x1, x1 + 2.4, -ph, -ph + 0.01 + 0.8, roofY));

    // stair turret at the north-west corner, rising above the roof
    b.with({ label: lab('turret', 'gatehouse'), group: G.ghTurret }, () => {
      b.cylinder(x0 - 0.4, -6.0, 1.8, WARD_Y, roofY + 3.4, 18, lead);
      crenRing(b, x0 - 0.4, -6.0, 1.2, 1.8, roofY + 3.4, { seg: 18, mh: 1.1 });
    });

    // portcullises, mostly raised (timber lattice, cut on the line)
    b.with({ kind: K.TIMBER, color: P.timberDark, label: lab('portcullis', 'gatehouse') }, () => {
      for (const gx of [21.4, 26.6, 33.4]) {
        const yb = 3.3;
        for (let z = -ph + 0.15; z < 0.2; z += 0.4) b.box(gx - 0.08, yb, z - 0.06, gx + 0.08, floor1 - 1.6, z + 0.06);
        for (let y = yb + 0.25; y < floor1 - 1.6; y += 0.45) b.box(gx - 0.07, y - 0.05, -ph, gx + 0.07, y + 0.05, 0);
      }
    });
    // gate leaves, open back against the passage wall
    b.with({ kind: K.TIMBER, color: P.oak, label: lab('gatePassage', 'gatehouse') }, () => {
      b.box(22.2, WARD_Y, -ph + 0.02, 24.6, 3.6, -ph + 0.2);
      b.box(30.0, OUTER_Y + 0.6, -ph + 0.02, 32.4, 3.4, -ph + 0.2);
    });
  });
}

// ---------------------------------------------------------------------------
// West range: great hall over the undercroft, services at its north end,
// with a chamber over the services.
// ---------------------------------------------------------------------------
function westRange(b) {
  const H = HALL;
  const ex0 = H.x1;
  const ex1 = H.x1 + H.wallT;
  const stone = { kind: K.STONE, color: P.stone };
  const plaster = { innerKind: K.PLASTER };

  b.with({ ...stone, group: G.hall, label: lab('hall', 'hall') }, () => {
    // east wall of the hall (cut): door at the screens end, two tall windows
    wall(b, 'z', H.zCross1, 0, ex0, ex1, -4, H.eaveY, [
      { a0: -8.8, a1: -7.6, y0: H.floorY, y1: 3.4, arch: 'pointed', rise: 0.8 },
      { a0: -6.3, a1: -4.9, y0: 2.8, y1: 6.8, arch: 'pointed', rise: 1.0 },
      { a0: -2.9, a1: -1.5, y0: 2.8, y1: 6.8, arch: 'pointed', rise: 1.0 },
    ]);
    b.with({ label: lab('hallWindow', 'hall'), kind: K.TIMBER, color: P.timberDark }, () => {
      for (const zc of [-5.6, -2.2]) {
        b.box(ex0 + 0.5, 2.8, zc - 0.05, ex0 + 0.6, 6.4, zc + 0.05); // mullion
        b.with({ kind: K.STONE, color: P.ashlar }, () => b.box(ex0 - 0.1, 2.0, zc - 0.7, ex0 + 0.4, 2.8, zc + 0.7)); // seat
      }
    });
    // steps up to the hall door
    b.with({ kind: K.STONE, color: P.ashlar }, () => stairs(b, 'x', ex1 + 1.2, -8.9, -7.5, WARD_Y, H.floorY, 3, 0.4, -1));

    // hall floor on joists over the undercroft, with the trapdoor opening
    const td = { x0: -18.2, x1: -16.6, z0: -3.4, z1: -1.8 };
    b.with({ kind: K.TIMBER, color: P.timber, label: lab('hall', 'hall') }, () => {
      const fy0 = H.floorY - 0.1;
      const fy1 = H.floorY;
      const fb = { topKind: K.BOARDS, topColor: P.boards };
      b.box(H.x0, fy0, H.zCross1, ex0, fy1, td.z0, fb);
      b.box(H.x0, fy0, td.z1, ex0, fy1, 0, fb);
      b.box(H.x0, fy0, td.z0, td.x0, fy1, td.z1, fb);
      b.box(td.x1, fy0, td.z0, ex0, fy1, td.z1, fb);
      // joists (running east-west) and the spine beam on posts
      b.with({ label: lab('undercroft', 'undercroft') }, () => {
        for (let z = H.zCross1 + 0.4; z < 0; z += 0.75) {
          if (z > td.z0 - 0.1 && z < td.z1 + 0.1) {
            b.box(H.x0, 0.2, z - 0.1, td.x0, fy0, z + 0.1);
            b.box(td.x1, 0.2, z - 0.1, ex0, fy0, z + 0.1);
          } else b.box(H.x0, 0.2, z - 0.1, ex0, fy0, z + 0.1);
        }
        b.box(-21.3, -0.15, H.zCross1, -20.9, 0.2, 0);
        for (const z of [-6.0, -1.4]) b.box(-21.3, H.underY, z - 0.2, -20.9, -0.15, z + 0.2);
        for (const z of [-6.0, -1.4]) {
          beam(b, v3(-21.1, -1.2, z - 0.15), v3(-21.1, -0.15, z - 1.1), 0.18, 0.18);
          beam(b, v3(-21.1, -1.2, z + 0.15), v3(-21.1, -0.15, z + 1.1), 0.18, 0.18);
        }
      });
      // trapdoor rim
      b.with({ label: lab('trapdoor', 'hall', 'hoist') }, () => {
        b.box(td.x0 - 0.12, fy1, td.z0 - 0.12, td.x1 + 0.12, fy1 + 0.04, td.z0);
        b.box(td.x0 - 0.12, fy1, td.z1, td.x1 + 0.12, fy1 + 0.04, td.z1 + 0.12);
      });
    });

    // screens: timber partition with a gallery over the passage
    b.with({ kind: K.TIMBER, color: P.oak, label: lab('screens', 'hall'), group: G.screens }, () => {
      const zs = -7.4;
      const doors = [[-22.6, -21.2], [-16.8, -15.4]];
      let cur = H.x0;
      for (const [d0, d1] of doors) {
        b.box(cur, H.floorY, zs - 0.12, d0, 3.4, zs + 0.12);
        cur = d1;
      }
      b.box(cur, H.floorY, zs - 0.12, ex0, 3.4, zs + 0.12);
      b.box(H.x0, 3.0, zs - 0.15, ex0, 3.4, zs + 0.15);
      // gallery floor and balustrade
      b.box(H.x0, 3.4, H.zCross1, ex0, 3.6, zs + 0.15, { topKind: K.BOARDS, topColor: P.boards });
      b.box(H.x0, 3.6, zs - 0.08, ex0, 4.5, zs + 0.08);
      for (let x = H.x0 + 0.6; x < ex0; x += 1.2) b.box(x - 0.08, 3.6, zs - 0.1, x + 0.08, 4.6, zs + 0.1);
    });

    // roof: principal-rafter trusses with collars, slates (cut on the line)
    b.with({ kind: K.ROOF, color: P.roof, capKind: K.CUT_TIMBER, label: lab('hallRoof', 'hall'), group: G.hallRoof }, () => {
      const xm = (H.x0 + ex1) / 2;
      const ov = 0.6;
      const eaveW = H.x0 - 0.2;
      const eaveE = ex1 + ov;
      const run = xm - eaveW;
      const slopeY = (x) => H.eaveY + ((H.ridgeY - H.eaveY) * (1 - Math.abs(x - xm) / (xm - H.x0)));
      b.slab(v3(xm, H.ridgeY, H.zCross0), v3(xm, H.ridgeY, 0), v3(eaveE, slopeY(eaveE), 0), v3(eaveE, slopeY(eaveE), H.zCross0), 0.3);
      b.slab(v3(eaveW, slopeY(eaveW), H.zCross0), v3(eaveW, slopeY(eaveW), 0), v3(xm, H.ridgeY, 0), v3(xm, H.ridgeY, H.zCross0), 0.3);
      void run;
      b.with({ kind: K.TIMBER, color: P.timberDark, capKind: K.CUT_TIMBER }, () => {
        for (const z of [-9.2, -6.2, -3.2]) {
          const y0 = H.eaveY - 0.4;
          b.box(H.x0, y0 - 0.35, z - 0.15, ex0, y0, z + 0.15); // tie beam
          beam(b, v3(H.x0 + 0.2, y0, z), v3(xm, H.ridgeY - 0.25, z), 0.25, 0.3);
          beam(b, v3(ex0 - 0.2, y0, z), v3(xm, H.ridgeY - 0.25, z), 0.25, 0.3);
          b.box(xm - 2.4, H.ridgeY - 2.0, z - 0.12, xm + 2.4, H.ridgeY - 1.7, z + 0.12); // collar
          beam(b, v3(xm, y0, z), v3(xm, H.ridgeY - 1.7, z), 0.22, 0.22); // king strut
        }
        // purlins and ridge
        b.box(xm - 0.12, H.ridgeY - 0.45, H.zCross0, xm + 0.12, H.ridgeY - 0.15, 0);
        for (const s of [-1, 1]) {
          const px = xm + s * 3.4;
          const py = slopeY(px) - 0.4;
          b.box(px - 0.12, py - 0.3, H.zCross0, px + 0.12, py, 0);
        }
      });
    });
  });

  // undercroft floor and cross wall foundation
  b.with({ kind: K.PAVING, color: P.paving, group: G.undercroft, label: lab('undercroft', 'undercroft'), capKind: K.CUT }, () => {
    b.box(H.x0, -4, H.zCross1, ex0, H.underY, 0);
  });

  // cross wall: full below the hall floor, cut down above it
  b.with({ ...stone, group: G.buttery, label: lab('crossWall', 'buttery') }, () => {
    b.box(H.x0, -4, H.zCross0, ex1, H.floorY, H.zCross1);
    b.box(ex0, H.floorY, H.zCross0, ex1, SERV.eaveY, H.zCross1); // corner pier
    b.with({ addPlanes: [planeY(H.floorY + 1.0)] }, () => {
      wall(b, 'x', H.x0, ex0, H.zCross0, H.zCross1, H.floorY, SERV.floor2, [
        { a0: -23.0, a1: -21.8, y0: H.floorY, y1: 3.2 },
        { a0: -16.6, a1: -15.4, y0: H.floorY, y1: 3.2 },
      ]);
    });
    b.with({ addPlanes: [planeY(SERV.floor2 + 1.3)], group: G.chamber, label: lab('crossWall', 'chamber') }, () => {
      b.box(H.x0, SERV.floor2, H.zCross0, ex0, SERV.eaveY, H.zCross1);
    });
  });

  // services block
  const S = SERV;
  b.with({ ...stone, group: G.pantry, label: lab('partition', 'pantry') }, () => {
    // east wall with gable
    const zr = (S.z0 + S.z1) / 2;
    b.loft(
      [v3(ex0, OUTER_Y, S.z0), v3(ex1, OUTER_Y, S.z0), v3(ex1, OUTER_Y, S.z1), v3(ex0, OUTER_Y, S.z1)],
      [v3(ex0, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z1), v3(ex0, S.eaveY, S.z1)],
    );
    b.solid([
      [v3(ex0, S.eaveY, S.z0), v3(ex0, S.eaveY, S.z1), v3(ex0, S.ridgeY, zr)],
      [v3(ex1, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z1), v3(ex1, S.ridgeY, zr)],
      [v3(ex0, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z1), v3(ex0, S.eaveY, S.z1)],
      [v3(ex0, S.eaveY, S.z0), v3(ex1, S.eaveY, S.z0), v3(ex1, S.ridgeY, zr), v3(ex0, S.ridgeY, zr)],
      [v3(ex0, S.eaveY, S.z1), v3(ex1, S.eaveY, S.z1), v3(ex1, S.ridgeY, zr), v3(ex0, S.ridgeY, zr)],
    ]);
  });
  b.with({ ...stone, group: G.buttery, label: lab('partition', 'buttery') }, () => {
    b.box(S.part0, 0, S.z0, S.part1, S.floor2, S.z1);
  });
  // floors
  b.with({ kind: K.PAVING, color: P.paving, group: G.buttery, label: lab('buttery', 'buttery') }, () => {
    b.box(S.x0, 0, S.z0, S.part0, H.floorY, S.z1);
  });
  b.with({ kind: K.PAVING, color: P.paving, group: G.pantry, label: lab('pantry', 'pantry') }, () => {
    b.box(S.part1, 0, S.z0, ex0, H.floorY, S.z1);
  });
  b.with({ kind: K.TIMBER, color: P.timber, group: G.chamber, label: lab('chamber', 'chamber') }, () => {
    b.box(S.x0, S.floor2, S.z0, ex0, S.floor2 + 0.3, S.z1, { topKind: K.BOARDS, topColor: P.boards });
    for (let x = S.x0 + 0.6; x < ex0; x += 1.0) b.box(x - 0.1, S.floor2 - 0.3, S.z0, x + 0.1, S.floor2, S.z1);
  });
  // roof: rear slope only
  roofRear(b, S.x0 - 0.2, ex1 + 0.4, S.z0, S.z1, S.eaveY, S.ridgeY, G.chamber, 'chamber');
}

/** Rear (north) roof slope with rafters and ridge; the courtyard slope is omitted. */
function roofRear(b, x0, x1, z0, zf, eave, ridge, group, room) {
  const zm = (z0 + zf) / 2;
  b.with({ kind: K.ROOF, color: P.roof, group, label: lab('rangeRoof', room), capKind: K.CUT_TIMBER }, () => {
    b.slab(v3(x0, eave, z0 - 0.3), v3(x1, eave, z0 - 0.3), v3(x1, ridge, zm), v3(x0, ridge, zm), 0.25);
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(x0, ridge - 0.35, zm - 0.12, x1, ridge - 0.05, zm + 0.12);
      for (let x = x0 + 0.5; x < x1 - 0.2; x += 1.1) {
        beam(b, v3(x, eave - 0.15, z0 - 0.1), v3(x, ridge - 0.25, zm), 0.14, 0.18);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// North range of service rooms against the north curtain
// ---------------------------------------------------------------------------
function northRange(b) {
  const R = NR.rooms;
  const groups = { larder: G.larder, kitchen: G.kitchen, bakehouse: G.bakehouse, brewhouse: G.brewhouse, granary: G.granary };
  const doors = {
    larder: [[-10.4, -9.2]],
    kitchen: [[-5.8, -4.4], [2.8, 4.0]],
    bakehouse: [[9.4, 10.6]],
    brewhouse: [[12.8, 14.0]],
    granary: [[19.8, 21.6]],
  };
  const stub = [planeY(NR.stubY)];
  const ids = Object.keys(R);
  ids.forEach((id, i) => {
    const r = R[id];
    const g = groups[id];
    const xl = i === 0 ? r.x0 : ids.length && R[ids[i - 1]].x1;
    void xl;
    b.with({ kind: K.STONE, color: P.stone, group: g, label: lab('frontWall', id), addPlanes: stub }, () => {
      const wx0 = r.x0 - (i === 0 ? 0 : NR.wallT / 2);
      const wx1 = r.x1 + (i === ids.length - 1 ? 0 : NR.wallT / 2);
      wall(b, 'x', wx0, wx1, NR.z1, NR.zf, OUTER_Y + 0.5, r.eave, doors[id].map(([a0, a1]) => ({ a0, a1, y0: WARD_Y, y1: 3.0 })));
    });
    // floor
    b.with({ kind: K.PAVING, color: P.paving, group: g, label: lab(id, id) }, () => {
      b.box(r.x0, WARD_Y, NR.z0, r.x1, 0.08, NR.z1);
    });
    roofRear(b, r.x0 - 0.4, r.x1 + 0.4, NR.z0, NR.zf, r.eave, r.ridge, g, id);
    // partition to the east (gable-topped)
    if (i < ids.length - 1) {
      const nx = R[ids[i + 1]];
      const px0 = r.x1;
      const px1 = nx.x0;
      const eave = Math.max(r.eave, nx.eave);
      const ridge = Math.max(r.ridge, nx.ridge);
      const zm = (NR.z0 + NR.zf) / 2;
      b.with({ kind: K.STONE, color: P.stone, group: g, label: lab('partition', id) }, () => {
        const prof = [[NR.z0, OUTER_Y + 0.5], [NR.z1, OUTER_Y + 0.5], [NR.z1, eave], [zm, ridge], [NR.z0, eave]];
        const side = (x) => prof.map(([z, y]) => v3(x, y, z));
        const A = side(px0);
        const B = side(px1);
        const faces = [A, B];
        for (let k = 0; k < prof.length; k++) {
          const k2 = (k + 1) % prof.length;
          faces.push([A[k], A[k2], B[k2], B[k]]);
        }
        b.solid(faces);
      });
    }
  });

  // kitchen louvre on the ridge
  const k = R.kitchen;
  const zm = (NR.z0 + NR.zf) / 2;
  b.with({ kind: K.TIMBER, color: P.timberDark, group: G.kitchen, label: lab('louvre', 'kitchen') }, () => {
    const lx = (k.x0 + k.x1) / 2 - 0.6;
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.0], [0.9, 0.0]]) b.box(lx + dx - 0.1, k.ridge - 0.2, zm + dz - 0.1, lx + dx + 0.1, k.ridge + 1.3, zm + dz + 0.1);
    for (let y = k.ridge + 0.1; y < k.ridge + 1.2; y += 0.28) b.box(lx - 1.0, y, zm - 1.0, lx + 1.0, y + 0.08, zm - 0.92);
    b.with({ kind: K.ROOF, color: P.roof }, () => {
      b.solid([
        [v3(lx - 1.2, k.ridge + 1.3, zm - 1.2), v3(lx + 1.2, k.ridge + 1.3, zm - 1.2), v3(lx + 1.2, k.ridge + 1.3, zm + 0.3), v3(lx - 1.2, k.ridge + 1.3, zm + 0.3)],
        [v3(lx - 1.2, k.ridge + 1.3, zm - 1.2), v3(lx + 1.2, k.ridge + 1.3, zm - 1.2), v3(lx, k.ridge + 2.3, zm - 0.45)],
        [v3(lx + 1.2, k.ridge + 1.3, zm - 1.2), v3(lx + 1.2, k.ridge + 1.3, zm + 0.3), v3(lx, k.ridge + 2.3, zm - 0.45)],
        [v3(lx + 1.2, k.ridge + 1.3, zm + 0.3), v3(lx - 1.2, k.ridge + 1.3, zm + 0.3), v3(lx, k.ridge + 2.3, zm - 0.45)],
        [v3(lx - 1.2, k.ridge + 1.3, zm + 0.3), v3(lx - 1.2, k.ridge + 1.3, zm - 1.2), v3(lx, k.ridge + 2.3, zm - 0.45)],
      ]);
    });
  });

  // lofts: malt floor over the rear of the brewhouse, grain loft in the granary
  const loft = (r, g, room, key, zEnd) => {
    b.with({ kind: K.TIMBER, color: P.timber, group: g, label: lab(key, room) }, () => {
      b.box(r.x0, 3.6, NR.z0, r.x1, 3.85, zEnd, { topKind: K.BOARDS, topColor: P.boards });
      for (let x = r.x0 + 0.5; x < r.x1; x += 1.0) b.box(x - 0.1, 3.35, NR.z0, x + 0.1, 3.6, zEnd);
      b.box(r.x0, 3.0, zEnd - 0.25, r.x1, 3.6, zEnd);
    });
  };
  loft(R.brewhouse, G.brewhouse, 'brewhouse', 'maltFloor', -16.4);
  loft(R.granary, G.granary, 'granary', 'granary', -15.2);
}

export { roofRear };
void obox;
void THREE;
