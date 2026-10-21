import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { beam, obox, v3, decalX, decalZ } from '../geom/shapes.js';
import { lathe, cask, tub, sack, bench, stool, ladder, log, faggot, chest, cauldron, bowl } from '../geom/props.js';
import { rng, blob, boulder, bush, tuft, mound } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { OUTER_Y, OC_IN, OC_OUT, OC_H, IC_OUT, IC_H, IW, NR } from './layout.js';

// Everyday clutter of the wards and walls: the outer ward's garden, hives,
// woodstacks, sawing, masons at work and a smithy; the inner ward's cobbles,
// fuel and casks; weeds at the wall feet, spouts and embrasure shutters.

const OY = OUTER_Y;

export function wards(b) {
  outerWest(b);
  outerNorth(b);
  outerEast(b);
  innerWard(b);
  walls(b);
}

const OW = (key) => ({ group: G.outerWard, label: lab(key, 'outerWard') });
const IWd = (key) => ({ group: G.ward, label: lab(key, 'ward') });

/** A stack of billets: a solid block whose log ends show on the faces across `axis`. */
export function stack(b, x0, x1, y0, y1, z0, z1, axis = 'z', color = 0x7d5c3b) {
  const V = v3;
  const a = V(x0, y0, z0), bb = V(x1, y0, z0), c = V(x1, y0, z1), d = V(x0, y0, z1);
  const e = V(x0, y1, z0), f = V(x1, y1, z0), g = V(x1, y1, z1), h = V(x0, y1, z1);
  const endsZ = axis === 'z';
  b.with({ kind: K.TIMBER, color }, () => {
    b.solid([
      [a, bb, c, d],
      { verts: [e, f, g, h], kind: K.TIMBER },
      { verts: [a, bb, f, e], kind: endsZ ? K.LOGEND : K.TIMBER, color: endsZ ? 0xb08a5c : color },
      { verts: [d, c, g, h], kind: endsZ ? K.LOGEND : K.TIMBER, color: endsZ ? 0xb08a5c : color },
      { verts: [a, d, h, e], kind: endsZ ? K.TIMBER : K.LOGEND, color: endsZ ? color : 0xb08a5c },
      { verts: [bb, c, g, f], kind: endsZ ? K.TIMBER : K.LOGEND, color: endsZ ? color : 0xb08a5c },
    ]);
  });
  // a few loose billets on top
  const r = rng(Math.floor(x0 * 13 + z0 * 7));
  for (let i = 0; i < 4; i++) {
    const t = r();
    const x = x0 + (x1 - x0) * (0.15 + 0.7 * t);
    const z = z0 + (z1 - z0) * (0.2 + 0.6 * r());
    const len = 0.9;
    if (endsZ) log(b, v3(x, y1 + 0.07, z - len / 2), v3(x + 0.1, y1 + 0.07, z + len / 2), 0.07, color);
    else log(b, v3(x - len / 2, y1 + 0.07, z), v3(x + len / 2, y1 + 0.07, z + 0.1), 0.07, color);
  }
}

/** Straw bee skep on a stand. */
function skep(b, x, y, z) {
  b.with({ kind: K.SKEP, color: 0xc4a35a }, () => {
    lathe(b, v3(x, y, z), 'y', [[0.22, 0], [0.235, 0.1], [0.22, 0.22], [0.17, 0.33], [0.08, 0.41], [0.001, 0.44]], 14);
  });
  b.with({ kind: K.PLAIN, color: P.void }, () => obox(b, x + 0.215, y + 0.04, z, 0.04, 0.05, 0.08, 0));
}

/** Low thatched gable roof between two corner points, ridge along x. */
function thatchRoof(b, x0, x1, z0, z1, eave, ridge, color = 0xb59a5c) {
  const zm = (z0 + z1) / 2;
  b.with({ kind: K.STRAW, color }, () => {
    b.slab(v3(x0, eave, z0), v3(x1, eave, z0), v3(x1, ridge, zm), v3(x0, ridge, zm), 0.14);
    b.slab(v3(x0, eave, z1), v3(x1, eave, z1), v3(x1, ridge, zm), v3(x0, ridge, zm), 0.14);
  });
}

// ---------------------------------------------------------------------------
// West outer ward: garden, hives, linen bleaching on the grass, hen-house
// ---------------------------------------------------------------------------
function outerWest(b) {
  const x0 = OC_IN.x0; // -37.6
  // raised beds edged with wattle
  b.with(OW('garden'), () => {
    const beds = [[-36.5, -34.6, -15.6, -9.4], [-33.9, -31.9, -15.6, -9.4], [-31.2, -29.6, -15.6, -11.0]];
    beds.forEach(([bx0, bx1, bz0, bz1], i) => {
      b.with({ kind: K.WATTLE, color: 0x8a7550 }, () => {
        b.box(bx0, OY, bz0, bx1, OY + 0.32, bz0 + 0.06);
        b.box(bx0, OY, bz1 - 0.06, bx1, OY + 0.32, bz1);
        b.box(bx0, OY, bz0, bx0 + 0.06, OY + 0.32, bz1);
        b.box(bx1 - 0.06, OY, bz0, bx1, OY + 0.32, bz1);
      });
      b.with({ kind: K.GROUND, color: 0x7d6448 }, () => b.box(bx0 + 0.06, OY, bz0 + 0.06, bx1 - 0.06, OY + 0.28, bz1 - 0.06));
      const top = OY + 0.28;
      const r = rng(50 + i);
      if (i === 0) {
        // leeks in rows
        b.with({ kind: K.LEAF, color: 0x6d8a6a }, () => {
          for (let x = bx0 + 0.35; x < bx1 - 0.2; x += 0.42) {
            for (let z = bz0 + 0.3; z < bz1 - 0.2; z += 0.3) {
              const a = r() * Math.PI;
              beam(b, v3(x, top, z), v3(x + Math.cos(a) * 0.12, top + 0.38, z + Math.sin(a) * 0.12), 0.05, 0.015);
              beam(b, v3(x, top, z), v3(x - Math.cos(a) * 0.1, top + 0.3, z - Math.sin(a) * 0.1), 0.05, 0.015);
            }
          }
        });
      } else if (i === 1) {
        // coleworts (cabbage kale)
        for (let x = bx0 + 0.4; x < bx1 - 0.3; x += 0.55) {
          for (let z = bz0 + 0.4; z < bz1 - 0.3; z += 0.55) {
            b.with({ kind: K.LEAF, color: r() > 0.5 ? 0x5f7f5a : 0x6e8a5e }, () => blob(b, x, top, z, 0.2, 0.22, 0.2, Math.floor(x * 31 + z * 17), { smooth: true, points: 12, flat: 0 }));
          }
        }
      } else {
        // pot-herbs: parsley, sage, hyssop in clumps
        for (let z = bz0 + 0.4; z < bz1 - 0.3; z += 0.6) {
          bush(b, (bx0 + bx1) / 2 - 0.35, top, z, 0.28, Math.floor(-z * 13), 0x7b8f50);
          bush(b, (bx0 + bx1) / 2 + 0.35, top, z + 0.2, 0.24, Math.floor(-z * 17), 0x8a9a6a);
        }
      }
    });
    // paths between the beds are bare earth
    b.with({ kind: K.GROUND, color: 0xa08868 }, () => b.box(x0 + 0.1, OY, -16.2, -29.2, OY + 0.015, -8.8));
    // a spade stuck in the end of a bed, and a basket
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(-30.45, OY + 0.2, -10.4), v3(-30.5, OY + 1.25, -10.3), 0.04, 0.04));
    b.with({ kind: K.METAL, color: P.iron }, () => obox(b, -30.45, OY + 0.14, -10.4, 0.18, 0.28, 0.03, 0));
    b.with({ kind: K.WATTLE, color: 0x9a8058 }, () => lathe(b, v3(-29.9, OY, -9.6), 'y', [[0.16, 0], [0.22, 0.28]], 10));
  });

  // bee skeps on a bench under a little thatched hood against the curtain
  b.with(OW('skeps'), () => {
    const z0 = -6.4;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(x0 + 0.1, OY + 0.5, z0, x0 + 0.75, OY + 0.56, z0 + 3.0);
      for (const z of [z0 + 0.2, z0 + 2.7]) b.box(x0 + 0.2, OY, z, x0 + 0.65, OY + 0.5, z + 0.12);
      for (const z of [z0 - 0.05, z0 + 3.0]) b.box(x0 + 0.05, OY, z, x0 + 0.15, OY + 1.6, z + 0.08);
      for (const z of [z0 - 0.05, z0 + 3.0]) b.box(x0 + 0.9, OY, z, x0 + 1.0, OY + 1.35, z + 0.08);
    });
    b.with({ kind: K.STRAW, color: 0xb59a5c }, () => b.slab(v3(x0 + 1.2, OY + 1.3, z0 - 0.2), v3(x0 + 1.2, OY + 1.3, z0 + 3.25), v3(x0, OY + 1.75, z0 + 3.25), v3(x0, OY + 1.75, z0 - 0.2), 0.12));
    for (let i = 0; i < 4; i++) skep(b, x0 + 0.42, OY + 0.56, z0 + 0.4 + i * 0.73);
  });

  // linen laid out on the grass to bleach in the sun
  b.with(OW('bleaching'), () => {
    const cloths = [[-33.6, -3.9, 2.4, 1.3, 0.12], [-30.8, -5.6, 2.0, 1.1, -0.18], [-32.4, -1.6, 1.8, 1.0, 0.3]];
    for (const [x, z, w, d, rot] of cloths) {
      b.with({ kind: K.CLOTH, color: 0xf4efe2 }, () => obox(b, x, OY + 0.01, z, w, 0.02, d, rot));
      b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
        for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          const lx = (sx * w) / 2;
          const lz = (sz * d) / 2;
          b.box(x + lx * c + lz * s - 0.025, OY, z - lx * s + lz * c - 0.025, x + lx * c + lz * s + 0.025, OY + 0.08, z - lx * s + lz * c + 0.025);
        }
      });
    }
    // a washing basket and a beetle (bat) for beating linen
    b.with({ kind: K.WATTLE, color: 0x9a8058 }, () => lathe(b, v3(-30.2, OY, -2.6), 'y', [[0.25, 0], [0.32, 0.32]], 12));
    b.with({ kind: K.CLOTH, color: 0xe8e2d2 }, () => blob(b, -30.2, OY + 0.3, -2.6, 0.25, 0.1, 0.25, 3, { smooth: true }));
  });

  // a hen-house of wattle and thatch
  b.with(OW('henhouse'), () => {
    const hx = -30.4;
    const hz = -16.9;
    b.with({ kind: K.WATTLE, color: 0x8a7550 }, () => b.box(hx - 0.9, OY, hz - 0.6, hx + 0.9, OY + 0.95, hz + 0.6));
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(hx + sx * 0.92 - 0.05, OY, hz + sz * 0.62 - 0.05, hx + sx * 0.92 + 0.05, OY + 1.0, hz + sz * 0.62 + 0.05);
    });
    thatchRoof(b, hx - 1.1, hx + 1.1, hz - 0.85, hz + 0.85, OY + 0.95, OY + 1.65);
    b.with({ kind: K.PLAIN, color: P.void }, () => b.box(hx + 0.2, OY + 0.1, hz + 0.6, hx + 0.55, OY + 0.5, hz + 0.63));
    b.with({ kind: K.TIMBER, color: P.timber }, () => beam(b, v3(hx + 0.37, OY + 0.1, hz + 0.65), v3(hx + 0.37, OY, hz + 1.4), 0.3, 0.03));
    b.with({ kind: K.STRAW, color: 0xd2bd7c }, () => b.box(hx - 1.2, OY, hz + 0.65, hx + 1.0, OY + 0.02, hz + 1.6));
  });
}

// ---------------------------------------------------------------------------
// North outer ward: woodstacks, sawing, masons, scaffold, midden
// ---------------------------------------------------------------------------
function outerNorth(b) {
  const zw = IC_OUT.z0; // north face of the inner curtain, -24.6
  // great stacks of fuel for the kitchens
  b.with(OW('woodstack'), () => {
    stack(b, -16.5, -11.5, OY, OY + 1.9, zw - 1.1, zw - 0.05, 'z');
    stack(b, -11.3, -6.5, OY, OY + 1.6, zw - 1.1, zw - 0.05, 'z');
    stack(b, -6.3, -2.0, OY, OY + 1.8, zw - 1.1, zw - 0.05, 'z', 0x86664a);
    // faggots of brushwood for the ovens
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3 - (i % 2); k++) faggot(b, -0.6 + k * 1.3 + (i % 2) * 0.6, OY + i * 0.34, zw - 0.5, 1.2, 0.18);
    // a chopping block with an axe in it, and split wood round it
    b.with({ kind: K.TIMBER, color: 0x7a5a3c }, () => b.cylinder(-9, zw - 2.6, 0.32, OY, OY + 0.55, 10, { topKind: K.CUT_TIMBER }));
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(-9.05, OY + 0.55, zw - 2.6), v3(-9.45, OY + 1.1, zw - 2.75), 0.04, 0.04));
    b.with({ kind: K.METAL, color: P.iron }, () => obox(b, -9.0, OY + 0.6, zw - 2.6, 0.08, 0.14, 0.2, 0.3));
    const r = rng(77);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.6 + r() * 0.8;
      const x = -9 + Math.cos(a) * d;
      const z = zw - 2.6 + Math.sin(a) * d;
      log(b, v3(x, OY + 0.05, z), v3(x + Math.cos(a + 1.2) * 0.5, OY + 0.05, z + Math.sin(a + 1.2) * 0.5), 0.05, 0x9a7650);
    }
  });

  // sawing timber on a trestle (a sawpit's raised cousin)
  b.with(OW('sawpit'), () => {
    const sx = 3.5;
    const sz = -29.6;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const dx of [-1.6, 1.6]) {
        beam(b, v3(sx + dx, OY, sz - 0.7), v3(sx + dx, OY + 1.7, sz), 0.12, 0.12);
        beam(b, v3(sx + dx, OY, sz + 0.7), v3(sx + dx, OY + 1.7, sz), 0.12, 0.12);
        b.box(sx + dx - 0.12, OY + 1.62, sz - 0.25, sx + dx + 0.12, OY + 1.78, sz + 0.25);
      }
    });
    // squared baulk being sawn into planks, half done
    b.with({ kind: K.TIMBER, color: 0xa88660 }, () => {
      b.box(sx - 3.2, OY + 1.78, sz - 0.25, sx + 3.2, OY + 2.22, sz + 0.25);
    });
    b.with({ kind: K.PLAIN, color: P.void }, () => b.box(sx - 3.21, OY + 1.8, sz - 0.01, sx + 0.4, OY + 2.2, sz + 0.01)); // the kerf
    // sawn planks stacked with sticks between
    b.with({ kind: K.TIMBER, color: 0xb0905f }, () => {
      for (let i = 0; i < 5; i++) {
        b.box(sx - 2.5, OY + 0.12 + i * 0.1, sz + 1.3, sx + 2.6, OY + 0.17 + i * 0.1, sz + 1.75);
        for (const x of [-2.2, 0, 2.2]) b.box(sx + x - 0.03, OY + 0.07 + i * 0.1, sz + 1.3, sx + x + 0.03, OY + 0.12 + i * 0.1, sz + 1.75);
      }
    });
    // sawdust
    mound(b, sx - 0.4, OY, sz, 1.4, 0.1, 0.9, 12, 0xd8c08e, K.STRAW);
  });

  // masons' lodge: a lean-to against the curtain, with a banker and stone
  b.with(OW('lodge'), () => {
    const lx0 = 7.6;
    const lx1 = 13.4;
    const zf = zw - 3.4;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const x of [lx0, (lx0 + lx1) / 2, lx1]) b.box(x - 0.09, OY, zf - 0.09, x + 0.09, OY + 2.3, zf + 0.09);
      b.box(lx0 - 0.1, OY + 2.2, zf - 0.12, lx1 + 0.1, OY + 2.4, zf + 0.12);
      for (const x of [lx0, (lx0 + lx1) / 2, lx1]) beam(b, v3(x, OY + 2.35, zf - 0.3), v3(x, OY + 3.3, zw), 0.12, 0.14);
    });
    b.with({ kind: K.STRAW, color: 0xb2985a, capKind: K.STRAW }, () => b.slab(v3(lx0 - 0.4, OY + 2.25, zf - 0.6), v3(lx1 + 0.4, OY + 2.25, zf - 0.6), v3(lx1 + 0.4, OY + 3.45, zw), v3(lx0 - 0.4, OY + 3.45, zw), 0.16));
    // banker: a stone bench to work on
    b.with({ kind: K.STONE, color: P.ashlar }, () => {
      b.box(9.3, OY, zw - 2.2, 9.7, OY + 0.75, zw - 1.4);
      b.box(11.0, OY, zw - 2.2, 11.4, OY + 0.75, zw - 1.4);
      b.box(9.2, OY + 0.75, zw - 2.3, 11.5, OY + 0.95, zw - 1.3);
      // a block being dressed on the banker
      b.box(9.9, OY + 0.95, zw - 2.1, 10.6, OY + 1.35, zw - 1.5);
    });
    b.with({ kind: K.METAL, color: P.iron }, () => {
      beam(b, v3(10.9, OY + 0.97, zw - 1.9), v3(11.3, OY + 0.97, zw - 1.7), 0.03, 0.03);
      obox(b, 11.2, OY + 1.0, zw - 1.5, 0.12, 0.08, 0.08, 0.5);
    });
    // set-square and template hanging on the wall
    b.with({ kind: K.TIMBER, color: 0xc0a070 }, () => {
      b.box(8.4, OY + 1.2, zw - 0.06, 8.45, OY + 1.8, zw - 0.02);
      b.box(8.4, OY + 1.2, zw - 0.06, 8.9, OY + 1.25, zw - 0.02);
      b.box(12.2, OY + 1.0, zw - 0.05, 12.8, OY + 1.7, zw - 0.02);
    });
    // stacks of dressed blocks and rough stone
    b.with({ kind: K.STONE, color: 0xc9bfa2 }, () => {
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) b.box(14.0 + k * 0.75 + i * 0.35, OY + i * 0.42, zw - 4.0, 14.7 + k * 0.75 + i * 0.35, OY + 0.4 + i * 0.42, zw - 3.0);
    });
    for (let i = 0; i < 6; i++) boulder(b, 7.2 + (i % 3) * 0.7, OY - 0.05, zw - 5.0 - Math.floor(i / 3) * 0.6, 0.35, 900 + i, 0xb4ab94);
    // chippings round the banker
    mound(b, 10.3, OY, zw - 2.9, 2.6, 0.08, 1.4, 31, 0xd6cdb4, K.GROUND);
  });

  // scaffold up the face of the curtain, for pointing and repairs
  b.with(OW('scaffold'), () => {
    const x0 = 15.2;
    const x1 = 20.8;
    const zs = zw - 1.5;
    const lifts = [OY + 1.6, OY + 3.4, OY + 5.2];
    b.with({ kind: K.TIMBER, color: 0x9a8262 }, () => {
      // standards: poles set in the ground
      for (let x = x0; x <= x1 + 0.01; x += 1.4) beam(b, v3(x, OY - 0.2, zs), v3(x + 0.02, OY + 6.6, zs), 0.11, 0.11);
      for (const y of lifts) {
        // ledgers along, putlogs into the wall
        b.box(x0 - 0.2, y - 0.12, zs - 0.06, x1 + 0.2, y, zs + 0.06);
        for (let x = x0 + 0.7; x < x1; x += 1.4) b.box(x - 0.06, y, zs - 0.15, x + 0.06, y + 0.12, zw + 0.25);
      }
      // diagonal brace
      beam(b, v3(x0, OY, zs - 0.1), v3(x1, OY + 5.2, zs - 0.1), 0.08, 0.08);
    });
    // hurdles laid as working platforms
    b.with({ kind: K.WATTLE, color: 0x8f7a54 }, () => {
      for (const y of lifts.slice(1)) b.box(x0, y + 0.12, zs - 0.1, x1, y + 0.2, zw - 0.05);
    });
    ladder(b, x1 + 0.5, OY, zs - 0.9, x1 + 0.5, lifts[1] + 0.9, zs - 0.15);
    // a bucket of mortar and a hod on the top lift
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(17.2, lifts[2] + 0.2, zw - 0.8), 'y', [[0.15, 0], [0.18, 0.3]], 10));
    b.with({ kind: K.PLAIN, color: 0xd8d2c0 }, () => b.cylinder(17.2, zw - 0.8, 0.16, lifts[2] + 0.42, lifts[2] + 0.46, 10));
    // fresh mortar patches on the wall
    b.with({ kind: K.PLAIN, color: 0xe2dccb }, () => {
      for (const [x, y] of [[16.4, 4.4], [18.6, 3.0], [19.4, 5.6]]) b.box(x - 0.5, y - 0.3, zw - 0.02, x + 0.5, y + 0.3, zw);
    });
  });

  // mortar: lime and sand heaps and a mixing bed
  b.with(OW('mortarHeap'), () => {
    mound(b, 23.2, OY, zw - 6.0, 2.2, 0.55, 1.8, 41, 0xe3dccb, K.GROUND); // slaked lime
    mound(b, 21.0, OY, zw - 6.4, 2.0, 0.6, 1.8, 42, 0xbcaa88, K.GROUND); // sand
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(19.5, OY, zw - 4.6, 22.7, OY + 0.22, zw - 4.5);
      b.box(19.5, OY, zw - 3.3, 22.7, OY + 0.22, zw - 3.2);
    });
    b.with({ kind: K.GROUND, color: 0xbdb6a2 }, () => b.box(19.5, OY, zw - 4.5, 22.7, OY + 0.15, zw - 3.3));
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(20.4, OY + 0.2, zw - 3.9), v3(19.0, OY + 1.3, zw - 4.0), 0.04, 0.04));
  });

  // the midden, where the kitchen rubbish and stable dung go
  b.with(OW('midden'), () => {
    mound(b, -21.0, OY, -31.2, 3.4, 0.9, 2.4, 51, 0x6e5a40, K.GROUND);
    mound(b, -20.2, OY + 0.4, -31.0, 1.6, 0.45, 1.2, 52, 0x8a7448, K.STRAW);
    b.with({ kind: K.PLAIN, color: 0xe8e2d0 }, () => {
      for (const [x, z] of [[-21.8, -30.4], [-20.6, -30.5], [-22.3, -31.6]]) blob(b, x, OY + 0.55, z, 0.08, 0.04, 0.06, Math.floor(-x * 9), { smooth: true }); // shells and bones
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(-19.6, OY + 0.4, -30.0), v3(-18.8, OY + 1.7, -29.6), 0.04, 0.04));
  });
}

// ---------------------------------------------------------------------------
// East outer ward: the smithy, a tethered horse's post and trough, the porter
// ---------------------------------------------------------------------------
function outerEast(b) {
  const xw = IC_OUT.x1; // 28.6
  b.with(OW('smithy'), () => {
    const z0 = -17.0;
    const z1 = -10.6;
    const xf = xw + 3.6;
    // lean-to frame and roof of boards
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const z of [z0, (z0 + z1) / 2, z1]) b.box(xf - 0.09, OY, z - 0.09, xf + 0.09, OY + 2.4, z + 0.09);
      b.box(xf - 0.12, OY + 2.3, z0 - 0.1, xf + 0.12, OY + 2.5, z1 + 0.1);
      for (const z of [z0, z1]) beam(b, v3(xf + 0.3, OY + 2.45, z), v3(xw, OY + 3.4, z), 0.12, 0.14);
    });
    b.with({ kind: K.ROOF, color: 0x8a7a66, capKind: K.CUT_TIMBER }, () => b.slab(v3(xf + 0.6, OY + 2.35, z0 - 0.4), v3(xf + 0.6, OY + 2.35, z1 + 0.4), v3(xw, OY + 3.5, z1 + 0.4), v3(xw, OY + 3.5, z0 - 0.4), 0.14));
    // wattle wall on the north end against the wind
    b.with({ kind: K.WATTLE, color: 0x7d6a4a }, () => b.box(xw, OY, z0 - 0.05, xf, OY + 2.2, z0 + 0.05));
    // the forge hearth, waist-high, with a hood
    const hx = xw + 0.9;
    const hz = -14.6;
    b.with({ kind: K.STONE, color: 0xb0a48c }, () => {
      b.box(xw, OY, hz - 0.8, hx + 0.6, OY + 0.85, hz + 0.8);
      b.loft([v3(xw, OY + 1.8, hz - 0.85), v3(hx + 0.6, OY + 1.8, hz - 0.85), v3(hx + 0.6, OY + 1.8, hz + 0.85), v3(xw, OY + 1.8, hz + 0.85)],
        [v3(xw, OY + 3.0, hz - 0.35), v3(xw + 0.6, OY + 3.0, hz - 0.35), v3(xw + 0.6, OY + 3.0, hz + 0.35), v3(xw, OY + 3.0, hz + 0.35)]);
    });
    b.with({ kind: K.PLAIN, color: P.soot }, () => b.box(xw, OY + 0.85, hz - 0.6, xw + 0.04, OY + 1.8, hz + 0.6));
    b.with({ kind: K.EMIT, color: 0xe2702e }, () => blob(b, hx, OY + 0.85, hz, 0.35, 0.1, 0.32, 7, { smooth: true, flat: 0 }));
    b.with({ kind: K.PLAIN, color: 0x3a3430 }, () => blob(b, hx + 0.1, OY + 0.85, hz + 0.4, 0.3, 0.08, 0.2, 8, { smooth: true, flat: 0 })); // coal
    // bellows: two boards and a leather bag
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      b.loft([v3(xw + 0.1, OY + 1.0, hz - 1.9), v3(xw + 0.9, OY + 1.0, hz - 1.6), v3(xw + 0.9, OY + 1.0, hz - 1.0), v3(xw + 0.1, OY + 1.0, hz - 0.95)],
        [v3(xw + 0.1, OY + 1.04, hz - 1.9), v3(xw + 0.9, OY + 1.04, hz - 1.6), v3(xw + 0.9, OY + 1.04, hz - 1.0), v3(xw + 0.1, OY + 1.04, hz - 0.95)]);
      b.box(xw + 0.3, OY, hz - 1.6, xw + 0.4, OY + 1.0, hz - 1.5);
    });
    b.with({ kind: K.CLOTH, color: 0x6a4a32 }, () => b.loft([v3(xw + 0.1, OY + 1.04, hz - 1.9), v3(xw + 0.9, OY + 1.04, hz - 1.6), v3(xw + 0.9, OY + 1.04, hz - 1.0), v3(xw + 0.1, OY + 1.04, hz - 0.95)],
      [v3(xw + 0.15, OY + 1.3, hz - 1.8), v3(xw + 0.8, OY + 1.3, hz - 1.55), v3(xw + 0.8, OY + 1.3, hz - 1.05), v3(xw + 0.15, OY + 1.3, hz - 1.0)]));
    // anvil on its stump
    const ax = xw + 2.4;
    const az = -14.0;
    b.with({ kind: K.TIMBER, color: 0x6e5238 }, () => b.cylinder(ax, az, 0.3, OY, OY + 0.55, 10));
    b.with({ kind: K.METAL, color: 0x4a4a4e }, () => {
      b.box(ax - 0.12, OY + 0.55, az - 0.18, ax + 0.12, OY + 0.75, az + 0.18);
      b.box(ax - 0.16, OY + 0.75, az - 0.3, ax + 0.16, OY + 0.86, az + 0.25);
      b.loft([v3(ax - 0.1, OY + 0.75, az + 0.25), v3(ax + 0.1, OY + 0.75, az + 0.25), v3(ax + 0.1, OY + 0.86, az + 0.25), v3(ax - 0.1, OY + 0.86, az + 0.25)],
        [v3(ax - 0.01, OY + 0.83, az + 0.5), v3(ax + 0.01, OY + 0.83, az + 0.5), v3(ax + 0.01, OY + 0.86, az + 0.5), v3(ax - 0.01, OY + 0.86, az + 0.5)]); // beak
    });
    // quench tub, tool rack, horseshoes, a stack of iron bars
    tub(b, xw + 1.9, OY, -12.2, 0.32, 0.55, { liquid: 0x5e6a6a });
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(xw, OY + 1.4, -13.2, xw + 0.08, OY + 1.48, -11.2));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (let i = 0; i < 5; i++) beam(b, v3(xw + 0.1, OY + 1.42, -13.0 + i * 0.4), v3(xw + 0.12, OY + 0.75, -13.05 + i * 0.4), 0.025, 0.025); // tongs and hammers
      for (let i = 0; i < 6; i++) {
        const y = OY + 1.7;
        const z = -15.9 + i * 0.22;
        b.ring(xw + 0.08, z, 0.05, 0.08, y - 0.01, y + 0.01, 6, 0, Math.PI * 1.6, {});
        void y;
      }
      for (let i = 0; i < 6; i++) b.box(xf - 0.6, OY + 0.05 + (i % 2) * 0.04, -16.4 + i * 0.07, xf + 0.6, OY + 0.09 + (i % 2) * 0.04, -16.35 + i * 0.07);
    });
    // cinders trodden into the floor
    b.with({ kind: K.GROUND, color: 0x6e665c }, () => b.box(xw + 0.05, OY, z0 + 0.1, xf - 0.1, OY + 0.012, z1 - 0.1));
  });

  // hitching post and trough
  b.with(OW('horseTrough'), () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(35.9, OY, -17.8, 36.1, OY + 1.2, -17.6);
      b.box(35.9, OY, -12.6, 36.1, OY + 1.2, -12.4);
      b.box(35.85, OY + 1.0, -17.8, 36.15, OY + 1.1, -12.4);
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => b.box(34.6, OY, -10.4, 36.8, OY + 0.55, -9.7));
    b.with({ kind: K.WATER, color: P.water }, () => b.box(34.7, OY + 0.5, -10.3, 36.7, OY + 0.52, -9.8));
    // hay dropped for the horse, and dung
    b.with({ kind: K.STRAW, color: 0xc7b070 }, () => blob(b, 35.2, OY, -15.2, 0.6, 0.18, 0.45, 61, { smooth: true, flat: 0 }));
    mound(b, 34.0, OY, -13.4, 0.35, 0.08, 0.3, 62, 0x5e4a32, K.PLAIN);
  });

  // the porter's bench by the outer gate
  b.with(OW('porterBench'), () => {
    bench(b, 37.0, 37.4, -6.4, -4.2, 0.45, OY);
    b.with({ kind: K.TIMBER, color: P.oak }, () => b.cylinder(36.6, -3.6, 0.2, OY, OY + 0.5, 10)); // a stump for a stool
  });
}

// ---------------------------------------------------------------------------
// Inner ward
// ---------------------------------------------------------------------------
function innerWard(b) {
  const Y = 0;
  // cobbled paths: hall door to gate, spurs to the doors, the well apron
  b.with({ ...IWd('cobbles'), kind: K.COBBLE, color: 0xa39a88, capKind: K.CUT }, () => {
    const c = (x0, z0, x1, z1) => b.box(x0, Y, z0, x1, Y + 0.035, z1);
    c(-10.6, -6.6, 16.6, -5.0);
    c(-10.6, -8.9, -8.6, -6.6);
    c(16.6, -6.6, 18.95, -0.02);
    c(16.6, -9.6, 18.95, -6.6);
    c(-5.6, -11.45, -4.0, -6.6);
    c(2.6, -11.45, 4.2, -6.6);
    c(9.2, -11.45, 10.8, -6.6);
    c(12.6, -11.45, 14.2, -9.95);
    c(-4.6, -3.2, 0.6, -0.02);
    c(-2.8, -5.0, -1.2, -3.2);
  });

  // fuel stacked against the north range, outside the kitchen and bakehouse
  b.with(IWd('woodpile'), () => {
    stack(b, -3.6, 2.0, Y, Y + 0.9, NR.zf + 0.05, NR.zf + 0.75, 'z');
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) faggot(b, 6.0 + k * 1.25 + i * 0.6, Y + i * 0.33, NR.zf + 0.45, 1.2, 0.17);
  });

  // empty casks waiting to go back to the brewhouse, a handcart
  b.with(IWd('cask'), () => {
    for (const [x, z] of [[15.0, -10.9], [15.65, -10.95], [16.3, -10.85]]) cask(b, v3(x, Y + 0.36, z), 'y', 0.3, 0.72, { color: 0x987650 });
    // handcart (barrow with two handles and a wheel)
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      b.box(6.4, Y + 0.45, -8.1, 7.6, Y + 0.5, -7.4);
      b.box(6.4, Y + 0.5, -8.1, 7.6, Y + 0.75, -8.05);
      b.box(6.4, Y + 0.5, -7.45, 7.6, Y + 0.75, -7.4);
      for (const z of [-8.0, -7.5]) beam(b, v3(5.6, Y + 0.65, z), v3(7.7, Y + 0.45, z), 0.05, 0.05);
      for (const z of [-8.0, -7.5]) beam(b, v3(6.6, Y + 0.45, z), v3(6.5, Y, z), 0.05, 0.05);
      b.hcyl('z', 7.95, Y + 0.28, -7.75, 0.28, 0.06, 12);
    });
    sack(b, 7.0, Y + 0.5, -7.75, 0.45, 0.5, 0.3, 0xcdb98c);
  });

  // a mounting block of three steps by the gate
  b.with(IWd('mountingBlock'), () => {
    b.with({ kind: K.STONE, color: P.ashlar }, () => {
      for (let i = 0; i < 3; i++) b.box(15.4 + i * 0.32, Y, -3.6, 16.4, Y + 0.24 * (i + 1), -2.8);
    });
  });

  // bench by the hall wall, buckets, a broom, spilt straw
  b.with(IWd('innerWard'), () => {
    bench(b, -11.75, -11.35, -4.4, -1.6, 0.45, Y);
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      lathe(b, v3(-0.6, Y, -3.6), 'y', [[0.12, 0], [0.145, 0.3]], 10);
      lathe(b, v3(-0.2, Y, -3.75), 'y', [[0.12, 0], [0.145, 0.3]], 10);
    });
    b.with({ kind: K.WATER, color: P.water }, () => b.cylinder(-0.6, -3.6, 0.13, Y + 0.24, Y + 0.26, 10));
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(-8.4, Y + 0.02, NR.zf + 0.25), v3(-8.3, Y + 1.35, NR.zf + 0.05), 0.03, 0.03));
    b.with({ kind: K.STRAW, color: 0x9a8050 }, () => lathe(b, v3(-8.42, Y, NR.zf + 0.32), v3(0.05, 1, -0.12), [[0.12, 0], [0.04, 0.35]], 6));
    b.with({ kind: K.STRAW, color: 0xd2bd7c }, () => {
      for (const [x, z, w, d, r] of [[14.2, -8.0, 1.6, 0.7, 0.3], [16.8, -10.2, 1.2, 0.5, -0.4], [12.6, -7.6, 0.8, 0.5, 0.9]]) obox(b, x, Y + 0.01, z, w, 0.02, d, r);
    });
    // a puddle by the well trough
    b.with({ kind: K.WATER, color: 0x8ea7aa }, () => blob(b, 1.7, Y + 0.004, -2.5, 0.7, 0.012, 0.4, 5, { smooth: true, flat: 0, points: 14 }));
  });

  // weeds where feet do not go: along the curtain and building feet
  b.with(IWd('weeds'), () => {
    const r = rng(404);
    for (let x = -10.4; x < 24; x += 0.9 + r() * 1.8) {
      if (x > -5.8 && x < 4.4) continue;
      tuft(b, x, Y, NR.zf + 0.15 + r() * 0.2, 0.18 + r() * 0.2, Math.floor(x * 10 + 500));
    }
  });
}

// ---------------------------------------------------------------------------
// Walls: weeds at the foot, spouts, shutters, a few things on the wall-walks
// ---------------------------------------------------------------------------
function walls(b) {
  const r = rng(808);
  b.with(OW('weeds'), () => {
    // foot of the outer curtain inside, and the inner curtain outside
    for (let x = OC_IN.x0 + 0.5; x < OC_IN.x1 - 0.5; x += 0.8 + r() * 2.2) {
      tuft(b, x, OY, OC_IN.z0 + 0.15, 0.2 + r() * 0.25, Math.floor(x * 10 + 2000));
      if (Math.abs(x) < 21) tuft(b, x + 0.4, OY, IC_OUT.z0 - 0.15, 0.2 + r() * 0.2, Math.floor(x * 10 + 2500));
    }
    for (let z = OC_IN.z0 + 0.5; z < -0.5; z += 0.8 + r() * 2.2) {
      if (z < -7.5 || z > -2) tuft(b, OC_IN.x0 + 0.15, OY, z, 0.2 + r() * 0.25, Math.floor(-z * 10 + 3000));
      if (z < -18 || z > -9.5) tuft(b, OC_IN.x1 - 0.15, OY, z, 0.2 + r() * 0.25, Math.floor(-z * 10 + 3500));
      if (z > -17.6) tuft(b, IC_OUT.x0 - 0.15, OY, z, 0.2 + r() * 0.2, Math.floor(-z * 10 + 4000));
    }
    // grass and a little fern in the joints of the wall-walks and parapets
    for (let x = -24; x < 24; x += 2.5 + r() * 4) tuft(b, x, IC_H, IC_OUT.z0 + 0.95, 0.15 + r() * 0.12, Math.floor(x * 10 + 4500), 0x8a9450);
    for (let x = -36; x < 36; x += 3 + r() * 5) tuft(b, x, OY + OC_H, OC_OUT.z0 + 0.75, 0.15 + r() * 0.12, Math.floor(x * 10 + 4800), 0x8a9450);
  });

  // stone spouts throwing rainwater clear of the wall faces, with stains below
  b.with({ group: G.outer, label: lab('spout', 'outerWard') }, () => {
    const top = OY + OC_H;
    for (let x = -32; x <= 32; x += 8) {
      if (Math.abs(x) === 16 || x === 0) {
        b.with({ kind: K.STONE, color: P.ashlar }, () => b.box(x - 0.15, top - 0.05, OC_OUT.z0 - 0.55, x + 0.15, top + 0.12, OC_OUT.z0));
      }
    }
  });
  b.with({ group: G.inner, label: lab('spout') }, () => {
    for (const x of [-18, -7, 6.5, 20]) {
      b.with({ kind: K.STONE, color: P.ashlar }, () => b.box(x - 0.15, IC_H - 0.05, IC_OUT.z0 - 0.6, x + 0.15, IC_H + 0.14, IC_OUT.z0));
    }
  });

  // hinged timber shutters in the embrasures of the north inner parapet
  b.with({ group: G.inner, label: lab('shutter') }, () => {
    const a0 = IW.x0 - 1;
    const a1 = IW.x1 + 1;
    const n = Math.round((a1 - a0 + 0.8) / 2.3);
    const w = (a1 - a0 + 0.8) / n - 0.8;
    const zf = IC_OUT.z0;
    const y0 = IC_H + 0.9;
    const y1 = y0 + 1.5;
    for (let i = 0; i < n - 1; i++) {
      if (i % 3 !== 1) continue;
      const gx0 = a0 + i * (w + 0.8) + w + 0.04;
      const gx1 = gx0 + 0.72;
      // propped half open, swinging out from the top
      const out = i % 2 ? 0.55 : 0.35;
      b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
        b.loft([v3(gx0, y1, zf), v3(gx1, y1, zf), v3(gx1, y1, zf - 0.06), v3(gx0, y1, zf - 0.06)],
          [v3(gx0, y1 - 1.2 * Math.cos(out), zf - 1.2 * Math.sin(out)), v3(gx1, y1 - 1.2 * Math.cos(out), zf - 1.2 * Math.sin(out)), v3(gx1, y1 - 1.2 * Math.cos(out) + 0.01, zf - 1.2 * Math.sin(out) - 0.06), v3(gx0, y1 - 1.2 * Math.cos(out) + 0.01, zf - 1.2 * Math.sin(out) - 0.06)]);
      });
      b.with({ kind: K.METAL, color: P.iron }, () => b.box(gx0 - 0.05, y1 - 0.06, zf - 0.04, gx1 + 0.05, y1, zf + 0.02));
    }
  });

  // on the wall-walk: a chest of crossbow bolts, a bucket, a brazier for the night watch
  b.with({ group: G.inner, label: lab('wallWalk') }, () => {
    const z = IW.z0 - 0.6;
    chest(b, -13.0, -12.2, z, z + 0.5, IC_H, 0.45, P.timberDark);
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(-11.6, IC_H, z + 0.3), 'y', [[0.13, 0], [0.16, 0.3]], 10));
    cauldron(b, 6.6, IC_H + 0.5, z + 0.3, 0.26, 0x3e3a36);
    b.with({ kind: K.PLAIN, color: 0x2e2a26 }, () => b.cylinder(6.6, z + 0.3, 0.2, IC_H + 0.6, IC_H + 0.72, 10));
  });
  void bowl;
  void stool;
  void decalZ;
  void THREE;
}
