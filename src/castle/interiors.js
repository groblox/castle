import { K, P } from '../geom/kinds.js';
import { beam, obox, v3, decalX } from '../geom/shapes.js';
import { lathe, cask, tub, jug, bowl, sack, trestleTable, bench, stool, chest, cord, lump, loaf, log, cauldron } from '../geom/props.js';
import { rng, blob } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { S } from './spots.js';
import { SERV, HALL, GH } from './layout.js';

// The lived-in layer of the interiors: painted walls and hangings, rushes
// on the floors, candles, the hall's plate, the chamber's bed curtains and
// hawk, the gatehouse guardroom's arms, and the clutter of the service rooms.

const IN = (group, room, key) => ({ group, label: lab(key, room) });
const LIMEWASH = 0xefe6cf;

export function interiors(b) {
  hall(b);
  chamber(b);
  gatehouse(b);
  undercroft(b);
  kitchen(b);
  bakehouse(b);
  brewhouse(b);
  granary(b);
  buttery(b);
  pantry(b);
}

/** Painted limewash on a wall face: axis of the face ('x' runs along x). */
function paint(b, axis, c, sign, a0, a1, y0, y1) {
  const t = 0.015 * sign;
  b.with({ kind: K.PAINTED, color: LIMEWASH }, () => {
    if (axis === 'x') b.box(a0, y0, c, a1, y1, c + t);
    else b.box(c, y0, a0, c + t, y1, a1);
  });
}

/** Strewn rushes: loose clumps of thin stems on a floor at height y, avoiding `skip(x, z)`. */
function rushes(b, x0, x1, z0, z1, y, n, seed, skip = () => false) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * r();
    const z = z0 + (z1 - z0) * r();
    if (skip(x, z)) continue;
    const a0 = r() * Math.PI;
    const m = 5 + Math.floor(r() * 5);
    for (let k = 0; k < m; k++) {
      const a = a0 + (r() - 0.5) * 0.9;
      const len = 0.25 + 0.35 * r();
      const dx = (r() - 0.5) * 0.35;
      const dz = (r() - 0.5) * 0.35;
      const col = r() > 0.5 ? 0xa9a067 : 0xbfae74;
      b.with({ kind: K.STRAW, color: col }, () => obox(b, x + dx, y + 0.006 + k * 0.002, z + dz, len, 0.012, 0.022, a));
    }
  }
}

/** Iron pricket candlestick with a tallow candle. */
function pricket(b, x, y, z, h = 0.25) {
  b.with({ kind: K.METAL, color: P.iron }, () => {
    lathe(b, v3(x, y, z), 'y', [[0.07, 0], [0.02, 0.03], [0.015, h], [0.05, h + 0.01]], 8);
  });
  b.with({ kind: K.PLAIN, color: 0xf0e6c8 }, () => b.cylinder(x, z, 0.022, y + h + 0.01, y + h + 0.18, 8));
  b.with({ kind: K.EMIT, color: 0xffc860 }, () => lump(b, x, y + h + 0.22, z, 0.012, 0.03, 0.012, 0xffc860, K.EMIT));
}

/** Bed curtains: a cloth tester hung over the bed, curtains bunched at the corners. */
function testerBed(b, x0, x1, z0, z1, y, color, ceilY) {
  b.with({ kind: K.CLOTH, color }, () => {
    b.box(x0, y + 2.2, z0, x1, y + 2.28, z1);
    // valance round the tester
    b.box(x0, y + 1.95, z1 - 0.03, x1, y + 2.22, z1);
    b.box(x1 - 0.03, y + 1.95, z0, x1, y + 2.22, z1);
    // curtains gathered at the foot posts and one half drawn along the side
    for (const z of [z0 + 0.15, z1 - 0.15]) lathe(b, v3(x1 - 0.15, y, z), 'y', [[0.16, 0], [0.12, 1.2], [0.1, 2.2]], 8);
    b.box(x0, y + 0.05, z1 - 0.04, x0 + (x1 - x0) * 0.4, y + 2.2, z1);
  });
  b.with({ kind: K.TIMBER, color: 0x3e3a36 }, () => {
    for (const [x, z] of [[x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], [x0 + 0.1, z1 - 0.1], [x1 - 0.1, z1 - 0.1]]) cord(b, v3(x, y + 2.28, z), v3(x, ceilY, z), 0.02);
  });
}

/** A heater shield hung flat on a wall that faces +z. */
function shield(b, x, y, z, field, charge) {
  const w = 0.32;
  const prof = [[-w, 0.35], [w, 0.35], [w, 0.0], [0, -0.42], [-w, 0.0]];
  const face = (zz) => prof.map(([px, py]) => v3(x + px, y + py, zz));
  b.with({ kind: K.PLAIN, color: field }, () => b.loft(face(z), face(z + 0.04)));
  if (charge) b.with({ kind: K.PLAIN, color: charge }, () => {
    b.box(x - 0.05, y - 0.32, z + 0.04, x + 0.05, y + 0.33, z + 0.05);
    b.box(x - w + 0.03, y + 0.08, z + 0.04, x + w - 0.03, y + 0.18, z + 0.05);
  });
}

/** Kettle hat (iron helmet with a wide brim). */
function kettleHat(b, x, y, z) {
  b.with({ kind: K.METAL, color: 0x6a6a6e }, () => lathe(b, v3(x, y, z), 'y', [[0.24, 0], [0.24, 0.015], [0.13, 0.04], [0.12, 0.13], [0.06, 0.2], [0.001, 0.21]], 12));
}

/** Crossbow hung on a peg on a wall facing +x. */
function crossbow(b, x, y, z) {
  b.with({ kind: K.TIMBER, color: P.oak }, () => b.box(x, y - 0.55, z - 0.04, x + 0.07, y + 0.25, z + 0.04));
  b.with({ kind: K.TIMBER, color: 0x6a5238 }, () => {
    beam(b, v3(x + 0.05, y + 0.12, z), v3(x + 0.08, y + 0.02, z - 0.36), 0.04, 0.04);
    beam(b, v3(x + 0.05, y + 0.12, z), v3(x + 0.08, y + 0.02, z + 0.36), 0.04, 0.04);
  });
  b.with({ kind: K.PLAIN, color: 0xd8cfb4 }, () => {
    beam(b, v3(x + 0.09, y + 0.02, z - 0.36), v3(x + 0.09, y - 0.12, z), 0.012, 0.012);
    beam(b, v3(x + 0.09, y + 0.02, z + 0.36), v3(x + 0.09, y - 0.12, z), 0.012, 0.012);
  });
  b.with({ kind: K.METAL, color: P.iron }, () => b.box(x, y + 0.25, z - 0.08, x + 0.06, y + 0.3, z + 0.08));
}

/** Spear leaning against a wall. */
function spear(b, foot, top) {
  b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, foot, top, 0.035, 0.035));
  const d = top.clone().sub(foot).normalize();
  b.with({ kind: K.METAL, color: 0x8a8a8e }, () => beam(b, top, top.clone().addScaledVector(d, 0.28), 0.06, 0.015));
}

// ---------------------------------------------------------------------------
function hall(b) {
  const g = G.hall;
  const f = HALL.floorY;
  const xw = HALL.x0; // west wall face, -25
  const xe = HALL.x1; // east wall inner face, -13
  b.with(IN(g, 'hall', 'paintedWall'), () => {
    // west wall, round the fireplace
    paint(b, 'z', xw, 1, -9, -6.3, f, 8.0);
    paint(b, 'z', xw, 1, -2.9, 0, f, 8.0);
    paint(b, 'z', xw, 1, -6.3, -2.9, 7.45, 8.0);
    // east wall, between the door and windows
    paint(b, 'z', xe, -1, -9, -8.8, f, 8.0);
    paint(b, 'z', xe, -1, -8.8, -7.6, 3.45, 8.0);
    paint(b, 'z', xe, -1, -7.6, -6.3, f, 8.0);
    paint(b, 'z', xe, -1, -4.9, -2.9, f, 8.0);
    paint(b, 'z', xe, -1, -1.5, 0, f, 8.0);
    for (const [a0, a1] of [[-6.3, -4.9], [-2.9, -1.5]]) {
      paint(b, 'z', xe, -1, a0, a1, f, 2.0);
      paint(b, 'z', xe, -1, a0, a1, 6.85, 8.0);
    }
  });
  // a striped dorser hung along the front of the screens gallery
  b.with({ ...IN(g, 'hall', 'hanging') }, () => {
    const cols = [0x94483a, 0xd6c79a, 0x52677e, 0xd6c79a];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const x0 = xw + 0.5 + ((xe - xw - 1.0) * i) / n;
      const x1 = xw + 0.5 + ((xe - xw - 1.0) * (i + 1)) / n;
      b.with({ kind: K.CLOTH, color: cols[i % 4] }, () => b.box(x0, 3.62, -7.33, x1, 4.4, -7.29));
    }
  });
  rushes(b, xw + 0.3, xe - 0.3, -7.2, -0.2, f, 40, 7, (x, z) => x > -18.4 && x < -16.4 && z > -3.6 && z < -1.6);
  // candles on the tables, salts
  b.with(IN(g, 'hall', 'trestle'), () => {
    for (const x of [-23.4, -14.8]) {
      pricket(b, x, f + 0.77, -3.7);
      pricket(b, x, f + 0.77, -0.9);
      b.with({ kind: K.METAL, color: 0xc8c2b0 }, () => lathe(b, v3(x, f + 0.77, -5.1), 'y', [[0.05, 0], [0.035, 0.06], [0.07, 0.12]], 10));
      for (let i = 0; i < 4; i++) loaf(b, x + 0.25, f + 0.77, -5.6 + i * 1.5, 0.07, 0xc89a5a);
      for (let i = 0; i < 3; i++) bowl(b, x - 0.25, f + 0.77, -4.8 + i * 1.6, 0.08, 0x8a6a48); // mazers
    }
  });
  // candle-beam hung from a tie beam
  b.with(IN(g, 'hall', 'candleBeam'), () => {
    const cx = -19.0;
    const cz = -6.2;
    const y = 5.0;
    cord(b, v3(cx, HALL.eaveY - 0.75, cz), v3(cx, y + 0.05, cz), 0.03);
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(cx - 0.8, y - 0.05, cz - 0.05, cx + 0.8, y + 0.05, cz + 0.05);
      b.box(cx - 0.05, y - 0.05, cz - 0.8, cx + 0.05, y + 0.05, cz + 0.8);
    });
    for (const [dx, dz] of [[-0.75, 0], [0.75, 0], [0, -0.75], [0, 0.75]]) pricket(b, cx + dx, y + 0.05, cz + dz, 0.05);
  });
  // cupboard of plate by the screens: a board of cups, ewers and dishes
  b.with(IN(g, 'hall', 'cupboard'), () => {
    const x0 = -20.6;
    const x1 = -18.4;
    const z0 = -7.25;
    const z1 = -6.75;
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(x0, f, z0, x0 + 0.08, f + 1.4, z1);
      b.box(x1 - 0.08, f, z0, x1, f + 1.4, z1);
      for (const y of [0.15, 0.75, 1.35]) b.box(x0, f + y, z0, x1, f + y + 0.05, z1);
    });
    b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => b.box(x0 - 0.02, f + 1.4, z0 - 0.02, x1 + 0.02, f + 1.42, z1 + 0.15));
    b.with({ kind: K.METAL, color: 0xcfcab8 }, () => {
      for (let i = 0; i < 4; i++) lathe(b, v3(x0 + 0.35 + i * 0.5, f + 1.42, -7.0), 'y', [[0.04, 0], [0.02, 0.05], [0.025, 0.1], [0.06, 0.18]], 10); // cups
      for (let i = 0; i < 3; i++) lathe(b, v3(x0 + 0.5 + i * 0.6, f + 0.8, -7.0), 'y', [[0.06, 0], [0.18, 0.04]], 12); // dishes
    });
    jug(b, x0 + 0.6, f + 0.2, -7.0, 1.1, 0xb8b2a0);
    jug(b, x1 - 0.5, f + 0.2, -7.0, 1.0, 0x8f9a5a);
  });
  // a chest against the east wall and a hound's water bowl
  chest(b, xe - 0.65, xe - 0.05, -1.5, -0.3, f, 0.6, P.timberDark);
  bowl(b, -22.8, f, -2.6, 0.14, 0x7a6a58);
}

// ---------------------------------------------------------------------------
function chamber(b) {
  const g = G.chamber;
  const f = SERV.floor2 + 0.3;
  b.with(IN(g, 'chamber', 'paintedWall'), () => {
    paint(b, 'x', SERV.z0, 1, SERV.x0, HALL.x1, f, SERV.eaveY - 0.2);
    paint(b, 'z', SERV.x0, 1, SERV.z0, SERV.z1, f, SERV.eaveY - 0.2);
    paint(b, 'z', HALL.x1, -1, SERV.z0, SERV.z1, f, SERV.eaveY - 0.2);
  });
  b.with(IN(g, 'chamber', 'chamber'), () => {
    testerBed(b, -24.8, -22.5, -20.95, -18.5, f, 0x7a3428, SERV.eaveY - 0.3);
    // a garderobe door in the corner, to a latrine in the wall thickness
    b.with({ kind: K.TIMBER, color: 0x5e4a34 }, () => b.box(-14.4, f, SERV.z0 + 0.015, -13.6, f + 1.95, SERV.z0 + 0.06));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (const y of [0.4, 1.5]) b.box(-14.4, f + y, SERV.z0 + 0.06, -13.75, f + y + 0.05, SERV.z0 + 0.075);
      b.box(-13.75, f + 0.95, SERV.z0 + 0.06, -13.68, f + 1.05, SERV.z0 + 0.1);
    });
    // chamber pot under the bed's foot
    b.with({ kind: K.PLAIN, color: 0x9aa060 }, () => lathe(b, v3(-22.25, f, -19.3), 'y', [[0.1, 0], [0.13, 0.12], [0.1, 0.18], [0.12, 0.2]], 10));
    // rush matting on the boards
    b.with({ kind: K.WATTLE, color: 0xc8b47a }, () => b.box(-21.8, f, -18.0, -15.8, f + 0.012, -12.2));
    // pole for clothes, with a cloak and a gown over it
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(SERV.x0 + 0.1, f + 1.75, -16.4, SERV.x0 + 0.18, f + 1.83, -13.2));
    b.with({ kind: K.CLOTH, color: 0x55683a }, () => b.box(SERV.x0 + 0.08, f + 0.55, -16.1, SERV.x0 + 0.22, f + 1.82, -15.0));
    b.with({ kind: K.CLOTH, color: 0x8a3a2a }, () => b.box(SERV.x0 + 0.08, f + 0.8, -14.6, SERV.x0 + 0.24, f + 1.82, -13.6));
    // standing candlestick
    b.with({ kind: K.METAL, color: P.iron }, () => {
      lathe(b, v3(-22.1, f, -17.9), 'y', [[0.2, 0], [0.03, 0.05], [0.025, 1.3], [0.08, 1.32]], 8);
    });
    pricket(b, -22.1, f + 1.32, -17.9, 0.02);
  });
  // the lord's hawk on its perch
  b.with(IN(g, 'chamber', 'hawk'), () => {
    const px = -15.8;
    const pz = -11.0;
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(px - 0.7, f, pz - 0.04, px - 0.62, f + 1.3, pz + 0.04);
      b.box(px + 0.62, f, pz - 0.04, px + 0.7, f + 1.3, pz + 0.04);
      b.box(px - 0.75, f + 1.3, pz - 0.04, px + 0.75, f + 1.37, pz + 0.04);
      b.box(px - 0.8, f, pz - 0.25, px - 0.52, f + 0.04, pz + 0.25);
      b.box(px + 0.52, f, pz - 0.25, px + 0.8, f + 0.04, pz + 0.25);
    });
    // a falcon: body, folded wings, tail, hooded head, jesses
    lump(b, px, f + 1.58, pz, 0.1, 0.17, 0.11, 0x6e5a46, K.FUR, 0);
    lump(b, px, f + 1.6, pz + 0.05, 0.08, 0.13, 0.06, 0xd8cdb0, K.FUR, 0);
    b.with({ kind: K.FUR, color: 0x5a4a3a }, () => beam(b, v3(px, f + 1.48, pz - 0.06), v3(px, f + 1.3, pz - 0.14), 0.09, 0.03));
    lump(b, px, f + 1.79, pz + 0.02, 0.06, 0.06, 0.065, 0x8a3a2a, K.CLOTH, 0);
    b.with({ kind: K.PLAIN, color: 0xd8b04a }, () => obox(b, px, f + 1.76, pz + 0.08, 0.02, 0.02, 0.03, 0));
    b.with({ kind: K.CLOTH, color: 0x5a3a26 }, () => beam(b, v3(px, f + 1.4, pz), v3(px + 0.1, f + 1.05, pz + 0.04), 0.015, 0.015));
  });
  // a chess board laid out on a little table, with two stools
  b.with(IN(g, 'chamber', 'chess'), () => {
    const cx = -18.8;
    const cz = -14.6;
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(cx - 0.4, f + 0.66, cz - 0.4, cx + 0.4, f + 0.7, cz + 0.4);
      b.box(cx - 0.05, f, cz - 0.05, cx + 0.05, f + 0.66, cz + 0.05);
      b.box(cx - 0.3, f, cz - 0.05, cx + 0.3, f + 0.05, cz + 0.05);
    });
    const sq = 0.07;
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
      b.with({ kind: K.PLAIN, color: (i + k) % 2 ? 0x3a2a1e : 0xe6dcc0 }, () => b.box(cx - 4 * sq + i * sq, f + 0.7, cz - 4 * sq + k * sq, cx - 3 * sq + i * sq, f + 0.71, cz - 3 * sq + k * sq));
    }
    const r = rng(64);
    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? 0 : 1;
      const x = cx - 4 * sq + (Math.floor(r() * 8) + 0.5) * sq;
      const z = cz + (side ? 2.5 : -3.5) * sq + Math.floor(r() * 2) * sq;
      b.with({ kind: K.PLAIN, color: side ? 0xe8e0c8 : 0x8a2a20 }, () => lathe(b, v3(x, f + 0.71, z), 'y', [[0.022, 0], [0.012, 0.03], [0.016, 0.05], [0.001, 0.07]], 6));
    }
    stool(b, cx - 0.75, f, cz, 0.45);
    stool(b, cx + 0.75, f, cz, 0.45);
  });
  // laver: basin on a stand, ewer and towel
  b.with(IN(g, 'chamber', 'laver'), () => {
    const x = -13.6;
    const z = -17.0;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        beam(b, v3(x + Math.cos(a) * 0.22, f, z + Math.sin(a) * 0.22), v3(x + Math.cos(a) * 0.14, f + 0.82, z + Math.sin(a) * 0.14), 0.035, 0.035);
      }
    });
    b.with({ kind: K.METAL, color: 0xb08a50 }, () => lathe(b, v3(x, f + 0.8, z), 'y', [[0.1, 0], [0.24, 0.08], [0.25, 0.1]], 14));
    b.with({ kind: K.WATER, color: P.water }, () => b.cylinder(x, z, 0.21, f + 0.86, f + 0.87, 14));
    jug(b, x + 0.05, f, z + 0.4, 1.0, 0xb08a50);
    b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => b.box(HALL.x1 - 0.05, f + 0.9, z - 0.25, HALL.x1 - 0.02, f + 1.5, z + 0.2));
  });
  rushes(b, SERV.x0 + 0.4, HALL.x1 - 0.4, SERV.z0 + 2.6, SERV.z1 - 0.4, f, 10, 21, (x, z) => x > -21.9 && x < -15.7 && z > -18.1 && z < -12.1);
}

// ---------------------------------------------------------------------------
function gatehouse(b) {
  const g = G.gatehouse;
  const wt = 1.2;
  const zN = GH.z0 + wt; // north wall face, -7.8
  const xW = GH.x0 + wt; // 20.2
  const xE = GH.x1 - wt; // 29.8
  // ---- first floor: the guardroom over the passage
  const f1 = GH.floor1;
  b.with(IN(g, 'gatehouse', 'guardroom'), () => {
    // spears in a rack against the north wall
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(20.5, f1 + 1.55, zN, 23.2, f1 + 1.63, zN + 0.12);
      b.box(20.5, f1 + 0.2, zN, 23.2, f1 + 0.28, zN + 0.12);
    });
    for (let i = 0; i < 6; i++) spear(b, v3(20.75 + i * 0.45, f1, zN + 0.3), v3(20.7 + i * 0.45, f1 + 2.5, zN + 0.08));
    // shields on the wall, helmets on a shelf, crossbows on pegs
    shield(b, 27.0, f1 + 1.5, zN, 0xa83a2a, 0xe8d8a0);
    shield(b, 27.9, f1 + 1.5, zN, 0xe6dcc4, 0xa83a2a);
    shield(b, 28.8, f1 + 1.5, zN, 0x3f5a7a, null);
    b.with({ kind: K.TIMBER, color: P.timber }, () => b.box(26.6, f1 + 2.3, zN, 29.6, f1 + 2.35, zN + 0.35));
    for (let i = 0; i < 3; i++) kettleHat(b, 27.0 + i * 0.95, f1 + 2.35, zN + 0.18);
    crossbow(b, xW + 0.06, f1 + 1.5, -4.8);
    crossbow(b, xW + 0.06, f1 + 1.5, -1.8);
    // a hauberk of mail on a stand by the east wall
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(29.2, f1, -4.5, 29.3, f1 + 1.6, -4.4);
      b.box(28.9, f1 + 1.45, -4.48, 29.6, f1 + 1.52, -4.42);
      b.box(28.95, f1, -4.7, 29.55, f1 + 0.05, -4.2);
    });
    b.with({ kind: K.METAL, color: 0x8a8c90 }, () => lathe(b, v3(29.25, f1 + 0.5, -4.45), 'y', [[0.3, 0], [0.26, 0.4], [0.24, 0.8], [0.3, 0.95], [0.05, 1.02]], 10));
    // dice, cups and a candle on the table
    const ty = f1 + 0.76;
    b.with({ kind: K.PLAIN, color: 0xeae2cc }, () => {
      obox(b, 23.0, ty + 0.015, -5.7, 0.03, 0.03, 0.03, 0.3);
      obox(b, 23.15, ty + 0.015, -5.6, 0.03, 0.03, 0.03, 0.9);
    });
    bowl(b, 22.5, ty, -5.5, 0.07, 0x8a6a48);
    bowl(b, 23.8, ty, -5.8, 0.07, 0x8a6a48);
    jug(b, 24.2, ty, -5.5, 0.9, 0xa86b3a);
    pricket(b, 22.4, ty, -5.95, 0.08);
    // a straw pallet in the corner with a blanket
    b.with({ kind: K.STRAW, color: 0xc8b070 }, () => b.box(28.0, f1, -3.3, 29.7, f1 + 0.18, -1.9));
    b.with({ kind: K.CLOTH, color: 0x6a5a40 }, () => b.box(28.3, f1 + 0.18, -3.25, 29.7, f1 + 0.24, -2.3));
    // a chest of crossbow bolts
    chest(b, 20.4, 21.1, -3.8, -3.1, f1, 0.5, P.timberDark);
    b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => {
      for (let i = 0; i < 6; i++) obox(b, 20.55 + i * 0.08, f1 + 0.56, -3.45, 0.02, 0.02, 0.4, 0.05 * i);
    });
    // fire in the hearth
    for (let i = 0; i < 3; i++) log(b, v3(24.4, f1 + 0.08 + i * 0.04, zN + 0.15 + i * 0.12), v3(25.6, f1 + 0.1, zN + 0.3 + i * 0.05), 0.07, 0x5d4532);
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => b.box(24.3, f1, zN + 0.05, 25.7, f1 + 0.05, zN + 0.55));
  });
  rushes(b, xW + 0.3, xE - 0.3, zN + 0.3, -0.3, f1, 14, 33, (x, z) => (x > 21.9 && x < 24.7 && z > -6.3 && z < -4.4) || z > -1.8);

  // ---- second floor: the constable's lodging
  const f2 = GH.floor2;
  b.with(IN(g, 'gatehouse', 'paintedWall'), () => {
    paint(b, 'x', zN, 1, xW, 23.55, f2, f2 + 5.0);
    paint(b, 'x', zN, 1, 26.45, xE, f2, f2 + 5.0);
    paint(b, 'z', xE, -1, zN, 0, f2, f2 + 1.55);
    paint(b, 'z', xE, -1, zN, -4.2, f2 + 1.55, f2 + 5.0);
    paint(b, 'z', xE, -1, -3.4, 0, f2 + 1.55, f2 + 5.0);
  });
  b.with(IN(g, 'gatehouse', 'ghChamber'), () => {
    testerBed(b, 27.0, 29.4, -7.75, -5.4, f2, 0x3f5a7a, GH.roofY - 0.5);
    // writing table: parchment, inkhorn, a book, a candle
    trestleTable(b, 21.0, 22.6, -4.2, -3.0, f2 + 0.78, { floor: f2 });
    const ty = f2 + 0.78;
    b.with({ kind: K.CLOTH, color: 0xece2c8 }, () => obox(b, 21.6, ty + 0.005, -3.6, 0.42, 0.01, 0.32, 0.2));
    b.with({ kind: K.PLAIN, color: 0x2a2018 }, () => lathe(b, v3(22.05, ty, -3.4), 'y', [[0.03, 0], [0.025, 0.08]], 8));
    b.with({ kind: K.CLOTH, color: 0x6a3a26 }, () => obox(b, 22.2, ty + 0.04, -3.85, 0.3, 0.08, 0.22, -0.3));
    b.with({ kind: K.PLAIN, color: 0xeee6d0 }, () => obox(b, 22.2, ty + 0.04, -3.85, 0.29, 0.06, 0.2, -0.3));
    pricket(b, 21.2, ty, -3.3, 0.08);
    bench(b, 21.0, 22.6, -2.7, -2.35, 0.45, f2);
    // a hanging on the east wall
    b.with({ kind: K.CLOTH, color: 0x6a3a2a }, () => b.box(xE - 0.04, f2 + 1.5, -3.3, xE - 0.02, f2 + 3.5, -0.6));
    b.with({ kind: K.CLOTH, color: 0xd8c48a }, () => {
      b.box(xE - 0.05, f2 + 1.6, -3.2, xE - 0.04, f2 + 3.4, -3.05);
      b.box(xE - 0.05, f2 + 1.6, -0.85, xE - 0.04, f2 + 3.4, -0.7);
    });
    // fire, and a settle before it
    for (let i = 0; i < 3; i++) log(b, v3(24.4, f2 + 0.08 + i * 0.04, zN + 0.15 + i * 0.12), v3(25.6, f2 + 0.1, zN + 0.3 + i * 0.05), 0.07, 0x5d4532);
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => b.box(24.3, f2, zN + 0.05, 25.7, f2 + 0.05, zN + 0.55));
    b.with({ kind: K.CLOTH, color: 0x8a6a3a }, () => b.box(23.0, f2, -5.6, 27.0, f2 + 0.012, -4.0)); // a rug of skins
    cauldron(b, 26.6, f2 + 0.15, -6.9, 0.12, 0x5a554e);
  });
}

// ---------------------------------------------------------------------------
function undercroft(b) {
  const g = G.undercroft;
  const f = S.undercroft.floor;
  b.with(IN(g, 'undercroft', 'tun'), () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const x of [-24.6, -23.3]) b.box(x - 0.1, f, -2.4, x + 0.1, f + 0.3, -0.3);
    });
    for (const z of [-1.9, -0.8]) cask(b, v3(-23.95, f + 0.72, z), 'x', 0.44, 1.1, { color: 0x947250 });
    jug(b, -22.9, f, -5.2, 1.1, 0x8f9a5a);
  });
  b.with(IN(g, 'undercroft', 'undercroft'), () => {
    // horn lantern hanging from the spine beam
    const lx = -21.1;
    const lz = -3.6;
    cord(b, v3(lx, -0.15, lz), v3(lx, -1.0, lz), 0.02);
    b.with({ kind: K.METAL, color: P.iron }, () => {
      b.box(lx - 0.11, -1.45, lz - 0.11, lx + 0.11, -1.42, lz + 0.11);
      b.box(lx - 0.11, -1.03, lz - 0.11, lx + 0.11, -1.0, lz + 0.11);
      lathe(b, v3(lx, -1.0, lz), 'y', [[0.1, 0], [0.001, 0.1]], 6);
    });
    b.with({ kind: K.EMIT, color: 0xf0cf8a }, () => b.box(lx - 0.09, -1.42, lz - 0.09, lx + 0.09, -1.03, lz + 0.09));
    // sacks, a crate, spilled straw
    for (let i = 0; i < 2; i++) sack(b, -22.5 + i * 0.55, f, -8.5, 0.5, 0.7, i * 0.4, 0xc9b58a);
    chest(b, -14.2, -13.2, -1.2, -0.3, f, 0.55, P.timber);
    rushes(b, -22.6, -15.2, -6.8, -0.6, f, 6, 9);
    b.with({ kind: K.WATER, color: 0x7e9396 }, () => blob(b, -22.0, f + 0.004, -2.6, 0.6, 0.01, 0.4, 3, { smooth: true, flat: 0 }));
  });
}

// ---------------------------------------------------------------------------
function kitchen(b) {
  const g = G.kitchen;
  const f = S.kitchen.floor;
  b.with(IN(g, 'kitchen', 'kitchen'), () => {
    // a pole hung from the rafters with onions, garlic and drying herbs
    const y = 3.1;
    const z = -18.6;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(-6.5, y - 0.04, z - 0.04, -4.4, y + 0.04, z + 0.04));
    for (const x of [-6.2, -4.7]) cord(b, v3(x, y, z), v3(x, 8.7, z - 0.6), 0.02);
    const r = rng(5);
    for (let i = 0; i < 7; i++) {
      const x = -6.3 + i * 0.3;
      if (i % 3 === 2) {
        // herbs: a bunch hung upside down
        cord(b, v3(x, y, z), v3(x, y - 0.15, z), 0.012);
        b.with({ kind: K.LEAF, color: i % 2 ? 0x7a8a4a : 0x8a9a5a }, () => lathe(b, v3(x, y - 0.55, z), 'y', [[0.08, 0], [0.1, 0.15], [0.03, 0.4]], 7));
      } else {
        // a string of onions or garlic
        cord(b, v3(x, y, z), v3(x, y - 0.75, z), 0.012);
        const col = i % 2 ? 0xd9b07a : 0xeee6d0;
        for (let k = 0; k < 6; k++) lump(b, x + (r() - 0.5) * 0.05, y - 0.15 - k * 0.11, z + (r() - 0.5) * 0.05, 0.05, 0.05, 0.05, col);
      }
    }
    // bellows hanging by the roasting hearth, a gridiron and pot-hooks
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      b.loft([v3(-5.95, 1.0, -20.97), v3(-5.65, 1.0, -20.97), v3(-5.55, 1.5, -20.97), v3(-6.05, 1.5, -20.97)],
        [v3(-5.95, 1.0, -20.93), v3(-5.65, 1.0, -20.93), v3(-5.55, 1.5, -20.93), v3(-6.05, 1.5, -20.93)]);
    });
    b.with({ kind: K.CLOTH, color: 0x5a3e2a }, () => obox(b, -5.8, 1.25, -20.88, 0.4, 0.4, 0.06, 0));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (let i = 0; i < 6; i++) beam(b, v3(-0.6 + i * 0.06, f, -20.6), v3(-0.6 + i * 0.06, f + 0.6, -20.95), 0.02, 0.02);
      b.box(-0.65, f + 0.02, -20.62, -0.25, f + 0.06, -20.56);
      b.box(-0.65, f + 0.56, -20.97, -0.25, f + 0.6, -20.91);
    });
    // pails and a broom by the west wall, a salt box
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      lathe(b, v3(-6.15, f, -13.1), 'y', [[0.12, 0], [0.145, 0.3]], 10);
      lathe(b, v3(-5.8, f, -12.85), 'y', [[0.12, 0], [0.145, 0.3]], 10);
      beam(b, v3(4.35, f, -13.0), v3(4.52, f + 1.4, -12.95), 0.03, 0.03);
      b.box(-6.6, 1.5, -19.6, -6.32, 1.9, -19.15);
    });
    b.with({ kind: K.STRAW, color: 0x9a8050 }, () => lathe(b, v3(4.33, f, -13.0), v3(0.12, 1, 0.04), [[0.11, 0], [0.04, 0.35]], 6));
    // ash raked out on the hearths, scraps on the floor
    b.with({ kind: K.PLAIN, color: 0x8e8880 }, () => {
      blob(b, -3.4, 0.12, -21.15, 1.3, 0.01, 0.25, 11, { smooth: true, flat: 0 });
      blob(b, 2.2, 0.12, -21.0, 0.9, 0.01, 0.25, 12, { smooth: true, flat: 0 });
    });
    b.with({ kind: K.LEAF, color: 0x8aa05a }, () => {
      for (let i = 0; i < 5; i++) obox(b, -1.0 + i * 0.5 + r() * 0.2, f + 0.005, -15.3 - r() * 0.4, 0.12, 0.01, 0.05, r() * 3);
    });
  });
}

function bakehouse(b) {
  const g = G.bakehouse;
  const f = S.bakehouse.floor;
  b.with(IN(g, 'bakehouse', 'bakehouse'), () => {
    // baskets of loaves ready to go to the pantry
    for (const [x, z] of [[6.0, -13.1], [6.75, -12.95]]) {
      b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(x, f, z), 'y', [[0.26, 0], [0.32, 0.3]], 12));
      for (let i = 0; i < 5; i++) loaf(b, x + Math.cos(i * 1.25) * 0.15, f + 0.24, z + Math.sin(i * 1.25) * 0.15, 0.1, 0xc08a4a);
    }
    tub(b, 9.6, f, -20.5, 0.26, 0.4, { liquid: P.water });
    // flour dust about the trough and table
    b.with({ kind: K.PLAIN, color: 0xe8e0cc }, () => {
      blob(b, 10.3, f, -14.0, 0.8, 0.008, 0.45, 13, { smooth: true, flat: 0 });
      blob(b, 7.5, f, -14.0, 1.0, 0.008, 0.4, 14, { smooth: true, flat: 0 });
    });
    // cloths for covering dough on pegs, a sieve
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(11.33, 1.8, -14.6, 11.4, 1.86, -12.8));
    b.with({ kind: K.CLOTH, color: 0xece6d6 }, () => {
      b.box(11.28, 1.0, -14.4, 11.33, 1.82, -13.8);
      b.box(11.28, 1.15, -13.5, 11.33, 1.82, -13.0);
    });
    b.with({ kind: K.WATTLE, color: 0xb09a6a }, () => lathe(b, v3(5.4, 1.4, -14.0), 'x', [[0.22, 0], [0.22, 0.07]], 14));
  });
}

function brewhouse(b) {
  const g = G.brewhouse;
  const f = S.brewhouse.floor;
  b.with(IN(g, 'brewhouse', 'quern'), () => {
    const x = 17.95;
    const z = -20.45;
    b.with({ kind: K.STONE, color: 0x9a948a }, () => {
      b.cylinder(x, z, 0.32, f, f + 0.4, 14);
      b.cylinder(x, z, 0.3, f + 0.42, f + 0.55, 14);
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(x + 0.22, f + 0.55, z), v3(x + 0.22, f + 0.85, z), 0.04, 0.04));
    b.with({ kind: K.PLAIN, color: 0xd8c08e }, () => blob(b, x, f, z, 0.45, 0.02, 0.45, 3, { smooth: true, flat: 0 }));
  });
  b.with(IN(g, 'brewhouse', 'brewhouse'), () => {
    sack(b, 12.65, f, -18.3, 0.48, 0.72, 0.2, 0xcfb98a);
    sack(b, 12.7, f, -17.65, 0.46, 0.7, -0.3, 0xc9b385);
    // spare staves and hoops leaning on the front wall
    b.with({ kind: K.TIMBER, color: 0xa88660 }, () => {
      for (let i = 0; i < 5; i++) beam(b, v3(17.2 + i * 0.12, f, -12.75), v3(17.25 + i * 0.12, f + 1.0, -12.55), 0.08, 0.02);
    });
    // wet floor round the coolers
    b.with({ kind: K.WATER, color: 0x9aa8a4 }, () => blob(b, 14.0, f + 0.004, -13.2, 1.1, 0.01, 0.45, 4, { smooth: true, flat: 0 }));
  });
}

function granary(b) {
  const g = G.granary;
  const f = S.granary.floor;
  b.with(IN(g, 'granary', 'granary'), () => {
    // spilt grain, a wooden shovel and broom
    b.with({ kind: K.STRAW, color: 0xd2b060 }, () => blob(b, 21.5, f, -18.6, 0.5, 0.06, 0.35, 5, { smooth: true, flat: 0 }));
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      beam(b, v3(19.55, f, -14.2), v3(19.5, f + 1.4, -14.1), 0.04, 0.04);
      obox(b, 19.55, f + 0.15, -14.2, 0.28, 0.3, 0.03, 0);
      beam(b, v3(19.55, f, -13.4), v3(19.5, f + 1.4, -13.3), 0.03, 0.03);
    });
    b.with({ kind: K.STRAW, color: 0x9a8050 }, () => lathe(b, v3(19.57, f, -13.4), v3(0.04, 1, 0.08), [[0.1, 0], [0.04, 0.32]], 6));
    // a riddle (sieve) on the wall
    b.with({ kind: K.WATTLE, color: 0xb09a6a }, () => lathe(b, v3(22.5, 1.6, -21.0), 'z', [[0.28, 0], [0.28, 0.08]], 14));
  });
}

function buttery(b) {
  const g = G.buttery;
  const f = S.buttery.floor;
  b.with(IN(g, 'buttery', 'buttery'), () => {
    // leather bottles and a funnel on a peg rail over the wine pipe
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(-22.8, f + 1.9, -20.98, -20.6, f + 1.98, -20.9));
    for (let i = 0; i < 3; i++) {
      const x = -22.4 + i * 0.6;
      b.with({ kind: K.CLOTH, color: 0x4e3424 }, () => lathe(b, v3(x, f + 1.25, -20.82), 'y', [[0.1, 0], [0.14, 0.15], [0.12, 0.38], [0.04, 0.48], [0.05, 0.6]], 10));
    }
    b.with({ kind: K.METAL, color: 0x8a8070 }, () => lathe(b, v3(-20.7, f + 1.62, -20.82), 'y', [[0.015, 0], [0.015, 0.1], [0.12, 0.25]], 10));
    // a tub of cups soaking, and a spare tap
    tub(b, -24.5, f, -11.0, 0.25, 0.32, { liquid: P.water });
    b.with({ kind: K.TIMBER, color: P.oak }, () => obox(b, -21.0, f + 0.82, -12.95, 0.06, 0.06, 0.25, 0.4));
  });
}

function pantry(b) {
  const g = G.pantry;
  const f = S.pantry.floor;
  b.with(IN(g, 'pantry', 'napery'), () => {
    // towels and napkins on a rail
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(-13.08, f + 1.7, -12.9, -13.0, f + 1.78, -10.9));
    b.with({ kind: K.CLOTH, color: 0xf2ece0 }, () => {
      b.box(-13.12, f + 0.9, -12.7, -13.06, f + 1.74, -12.0);
      b.box(-13.12, f + 1.1, -11.8, -13.06, f + 1.74, -11.2);
    });
  });
  b.with(IN(g, 'pantry', 'breadShelf'), () => {
    b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(-17.6, f, -12.3), 'y', [[0.25, 0], [0.3, 0.32]], 12));
    for (let i = 0; i < 5; i++) loaf(b, -17.6 + Math.cos(i * 1.25) * 0.14, f + 0.26, -12.3 + Math.sin(i * 1.25) * 0.14, 0.1, 0xb88048);
  });
}
