import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { crenRing, decalRing, obox, beam, v3 } from '../geom/shapes.js';
import { lathe, chest, stool, bench, trestleTable, jug, bowl, loaf, log, cord, lump, tub, cask, sack } from '../geom/props.js';
import { rng } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { OUTER_Y, TOWERS, TOWER_R, TOWER_H, TOWER_IN, TOWER_CUT, TOWER_FLOORS, TOWER_CEIL, TURRET_A, IW, IC_H } from './layout.js';
import { pricket, testerBed, shield, kettleHat, crossbow, spear, lantern } from './interiors.js';

// The two northern corner towers, cut open along the inner face of the north
// curtain to show their floors. Round mural towers held chambers on every
// floor; at Conwy the king's and queen's lodgings were in the inner ward's
// towers and a prison in another. Here:
//
//   north-west, the king's tower: a prison at the bottom, the household
//   knights' chamber, the king's privy chamber with his chair of state, and
//   his bedchamber at the top;
//   north-east, the garrison tower: the armoury, a dormitory, the mess room,
//   and the constable's chamber.

const TAU = Math.PI * 2;
const RI = TOWER_IN;
const [F0, F1, F2, F3] = TOWER_FLOORS;
// keep only the part of a tower north of the cut
const CUT = { n: new THREE.Vector3(0, 0, 1), d: TOWER_CUT };

/** Points and placements relative to a tower's inner wall face. */
function frame(t) {
  return {
    // a point `d` in from the inner wall face at angle a, `w` along the wall
    at(a, d = 0, w = 0) {
      const r = RI - d;
      return [t.x + Math.cos(a) * r - Math.sin(a) * w, t.z + Math.sin(a) * r + Math.cos(a) * w];
    },
    // an oriented box against the wall: tangent width sx, height sy, depth sz
    box(b, a, d, w, y, sx, sy, sz) {
      const [x, z] = this.at(a, d, w);
      obox(b, x, y, z, sx, sy, sz, -a + Math.PI / 2);
    },
    // heading that faces into the room from the wall at angle a
    inward(a) {
      return Math.atan2(-Math.cos(a), -Math.sin(a));
    },
  };
}

export function towers(b) {
  for (const key of ['nw', 'ne']) shell(b, key);
  kingTower(b);
  garrisonTower(b);
}

// ---------------------------------------------------------------------------
// Walls, floors, roof and parapet of a cut tower
// ---------------------------------------------------------------------------
function shell(b, key) {
  const t = TOWERS[key];
  const f = frame(t);
  const room = key === 'nw' ? 'kingTower' : 'garrison';
  b.with({ kind: K.STONE, color: P.ashlar, group: G.towers, label: lab('tower', room), addPlanes: [CUT] }, () => {
    // the wall: rough stone inside the ground floor, plastered above
    b.ring(t.x, t.z, RI, TOWER_R, OUTER_Y, F1 - 0.5, 40, 0, TAU, { innerKind: K.STONE, innerColor: 0xa59c86 });
    b.ring(t.x, t.z, RI, TOWER_R, F1 - 0.5, TOWER_H, 40, 0, TAU, { innerKind: K.PLASTER, innerColor: 0xe6dcc4, topKind: K.PAVING, topColor: P.lead });
    // solid base below the ground floor, and its flags
    b.cylinder(t.x, t.z, RI, OUTER_Y, F0 - 0.1, 32);
    b.with({ kind: K.PAVING, color: 0xa89d88, label: lab('towerFloor', room) }, () => b.cylinder(t.x, t.z, RI, F0 - 0.1, F0, 32));
    // timber floors on joists
    b.with({ kind: K.TIMBER, color: P.timber, label: lab('towerFloor', room) }, () => {
      for (const y of [F1, F2, F3]) {
        b.cylinder(t.x, t.z, RI, y - 0.28, y, 32, { topKind: K.BOARDS, topColor: P.boards });
        b.with({ color: P.timberDark }, () => {
          for (let z = t.z - RI + 0.45; z < TOWER_CUT; z += 0.75) {
            const h = Math.sqrt(Math.max(0, RI * RI - (z - t.z) ** 2)) - 0.05;
            b.box(t.x - h, y - 0.5, z - 0.09, t.x + h, y - 0.28, z + 0.09);
          }
        });
      }
      // roof deck under the leads
      b.with({ color: P.timberDark }, () => b.cylinder(t.x, t.z, RI, TOWER_CEIL, TOWER_H, 32, { topKind: K.PAVING, topColor: P.lead }));
      b.with({ color: P.timberDark }, () => {
        for (let z = t.z - RI + 0.6; z < TOWER_CUT; z += 1.0) {
          const h = Math.sqrt(Math.max(0, RI * RI - (z - t.z) ** 2)) - 0.05;
          b.box(t.x - h, TOWER_CEIL - 0.25, z - 0.11, t.x + h, TOWER_CEIL, z + 0.11);
        }
      });
    });
    b.with({ label: lab('parapet') }, () => crenRing(b, t.x, t.z, TOWER_R - 0.9, TOWER_R, TOWER_H, { seg: 32 }));
    // stair turret on the roof
    const a = TURRET_A[key];
    const sx = t.x + Math.cos(a) * (TOWER_R - 1.6);
    const sz = t.z + Math.sin(a) * (TOWER_R - 1.6);
    b.with({ label: lab('turret') }, () => {
      b.cylinder(sx, sz, 1.7, TOWER_H, TOWER_H + 4, 16, { topKind: K.PAVING, topColor: P.lead });
      crenRing(b, sx, sz, 1.1, 1.7, TOWER_H + 4, { seg: 16, mh: 1.1 });
    });
    // arrow loops on the field faces
    b.with({ label: lab('arrowLoop') }, () => {
      const out = key === 'nw' ? [-Math.PI * 0.75, -Math.PI * 0.4, Math.PI] : [-Math.PI * 0.25, -Math.PI * 0.6, 0];
      for (const y of [2.2, 6.2]) for (const da of out) decalRing(b, t.x, t.z, TOWER_R, da, y, y + 1.6, 0.16);
    });
    // doors to the newel stair on each floor
    b.with({ label: lab('stairDoor', room) }, () => {
      const da = key === 'nw' ? -0.62 : Math.PI + 0.62;
      for (const y of TOWER_FLOORS) door(b, f, da, y);
    });
  });
}

function door(b, f, a, y) {
  b.with({ kind: K.PLAIN, color: P.void }, () => f.box(b, a, 0.01, 0, y + 1.05, 1.0, 2.15, 0.05));
  b.with({ kind: K.TIMBER, color: 0x5e4a34 }, () => f.box(b, a, 0.04, 0.1, y + 1.0, 0.8, 1.98, 0.05));
  b.with({ kind: K.METAL, color: P.iron }, () => {
    for (const dy of [0.4, 1.5]) f.box(b, a, 0.07, 0.05, y + dy, 0.75, 0.05, 0.02);
  });
}

/** A window embrasure seen from inside: splay, a glimpse of sky, a stone sill. */
function windowIn(b, f, a, y0, y1, w = 0.6, seat = null) {
  b.with({ kind: K.PLAIN, color: 0x6e665c }, () => f.box(b, a, 0.01, 0, (y0 + y1) / 2, w + 0.5, y1 - y0 + 0.3, 0.04));
  b.with({ kind: K.PLAIN, color: 0xb9c6c8 }, () => f.box(b, a, 0.03, 0, (y0 + y1) / 2, w, y1 - y0, 0.04));
  b.with({ kind: K.TIMBER, color: P.timberDark }, () => f.box(b, a, 0.05, 0, (y0 + y1) / 2, 0.06, y1 - y0, 0.03)); // mullion
  b.with({ kind: K.STONE, color: P.ashlar }, () => f.box(b, a, 0.12, 0, y0 - 0.03, w + 0.5, 0.06, 0.3));
  if (seat !== null) b.with({ kind: K.STONE, color: P.ashlar }, () => f.box(b, a, 0.22, 0, seat + 0.24, w + 0.7, 0.48, 0.6));
}

/** A hooded fireplace against the curved wall at angle a, floor y. Returns the fire's position. */
function fireplace(b, f, a, y, labelId) {
  b.with({ kind: K.STONE, color: P.ashlar, label: labelId }, () => {
    for (const s of [-1, 1]) f.box(b, a, 0.15, s * 1.05, y + 1.0, 0.3, 2.0, 0.75);
    // the sloping hood, as a loft from the mantel up to the flue
    const P4 = (d, w, yy) => {
      const [x, z] = f.at(a, d, w);
      return v3(x, yy, z);
    };
    b.loft([P4(-0.2, -1.3, y + 2.0), P4(-0.2, 1.3, y + 2.0), P4(0.75, 1.3, y + 2.0), P4(0.75, -1.3, y + 2.0)],
      [P4(-0.2, -0.6, y + 3.5), P4(-0.2, 0.6, y + 3.5), P4(0.2, 0.6, y + 3.5), P4(0.2, -0.6, y + 3.5)]);
    b.with({ kind: K.PAVING, color: 0x9d9488 }, () => f.box(b, a, 0.45, 0, y + 0.03, 2.4, 0.06, 1.0));
    b.with({ kind: K.PLAIN, color: P.soot }, () => f.box(b, a, 0.04, 0, y + 1.0, 1.8, 1.9, 0.04));
  });
  b.with({ label: labelId }, () => {
    for (let i = 0; i < 3; i++) {
      const [x0, z0] = f.at(a, 0.3 + i * 0.1, -0.55);
      const [x1, z1] = f.at(a, 0.35 + i * 0.08, 0.55);
      log(b, v3(x0, y + 0.08 + i * 0.04, z0), v3(x1, y + 0.1, z1), 0.07, 0x5d4532);
    }
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => f.box(b, a, 0.35, 0, y + 0.07, 1.3, 0.03, 0.4));
  });
  const [x, z] = f.at(a, 0.4, 0);
  return [x, y + 0.1, z];
}

/** A band of colour on the inner wall face between heights y0 and y1. */
function wallBand(b, t, y0, y1, kind, color) {
  b.with({ kind, color }, () => b.ring(t.x, t.z, RI - 0.02, RI, y0, y1, 40, 0, TAU));
}

/** Straw pallet with a blanket and a bolster, long axis at heading h. */
function pallet(b, x, z, y, h, blanket = 0x6a5a40) {
  b.with({ kind: K.STRAW, color: 0xc8b070 }, () => obox(b, x, y + 0.07, z, 0.8, 0.14, 1.9, h));
  b.with({ kind: K.CLOTH, color: blanket }, () => obox(b, x + Math.sin(h) * 0.25, y + 0.16, z + Math.cos(h) * 0.25, 0.82, 0.05, 1.3, h));
  b.with({ kind: K.CLOTH, color: 0xd8cfb8 }, () => obox(b, x - Math.sin(h) * 0.75, y + 0.18, z - Math.cos(h) * 0.75, 0.6, 0.12, 0.3, h));
}

/** A plain wooden bedstead with a mattress and coverlet: head at xh, foot at xf. */
function bedstead(b, xh, xf, z0, z1, y, cover) {
  const s = Math.sign(xf - xh);
  const lo = Math.min(xh, xf);
  const hi = Math.max(xh, xf);
  const X = (d) => xh + s * d; // distance from the head end
  const bx = (d0, d1, y0, y1, za, zb) => b.box(Math.min(X(d0), X(d1)), y0, za, Math.max(X(d0), X(d1)), y1, zb);
  b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
    b.box(lo, y, z0, hi, y + 0.32, z1);
    bx(-0.06, 0, y, y + 0.85, z0, z1); // headboard
  });
  b.with({ kind: K.CLOTH, color: 0xe2d8c0 }, () => b.box(lo + 0.02, y + 0.32, z0 + 0.04, hi - 0.02, y + 0.46, z1 - 0.04));
  b.with({ kind: K.CLOTH, color: cover }, () => bx(0.75, hi - lo, y + 0.46, y + 0.5, z0 + 0.02, z1 - 0.02));
  b.with({ kind: K.CLOTH, color: 0xf0e8d6 }, () => bx(0.05, 0.4, y + 0.46, y + 0.58, z0 + 0.15, z1 - 0.15));
}

/** Mail hauberk on a wooden stand, with a great helm on top. */
function armourStand(b, x, y, z, helm = true) {
  b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
    b.box(x - 0.05, y, z - 0.05, x + 0.05, y + 1.6, z + 0.05);
    b.box(x - 0.35, y + 1.45, z - 0.03, x + 0.35, y + 1.52, z + 0.03);
    b.box(x - 0.3, y, z - 0.25, x + 0.3, y + 0.05, z + 0.25);
  });
  b.with({ kind: K.METAL, color: 0x8a8c90 }, () => lathe(b, v3(x, y + 0.5, z), 'y', [[0.3, 0], [0.26, 0.4], [0.24, 0.8], [0.3, 0.95], [0.05, 1.02]], 10));
  if (helm) b.with({ kind: K.METAL, color: 0x77797e }, () => lathe(b, v3(x, y + 1.55, z), 'y', [[0.13, 0], [0.135, 0.22], [0.11, 0.3], [0.001, 0.34]], 12));
}

/** Longbows leaning on a wall, and a sheaf of arrows in a barrel. */
function bows(b, f, a, y, n = 5) {
  for (let i = 0; i < n; i++) {
    const w = (i - (n - 1) / 2) * 0.22;
    const [fx, fz] = f.at(a, 0.35, w);
    const [tx, tz] = f.at(a, 0.06, w + 0.05);
    b.with({ kind: K.TIMBER, color: 0xa07a48 }, () => beam(b, v3(fx, y, fz), v3(tx, y + 1.85, tz), 0.035, 0.03));
  }
}
function sheaf(b, x, y, z) {
  b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(x, y, z), 'y', [[0.2, 0], [0.22, 0.35], [0.2, 0.7]], 10));
  const r = rng(Math.floor(x * 31 + z * 7));
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU;
    const d = r() * 0.15;
    const x0 = x + Math.cos(a) * d;
    const z0 = z + Math.sin(a) * d;
    b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => beam(b, v3(x0, y + 0.3, z0), v3(x0 + (r() - 0.5) * 0.12, y + 1.0, z0 + (r() - 0.5) * 0.12), 0.012, 0.012));
    b.with({ kind: K.CLOTH, color: i % 3 ? 0xece4d0 : 0x9a3a2a }, () => obox(b, x0, y + 0.9, z0, 0.03, 0.1, 0.012, a));
  }
}

// ---------------------------------------------------------------------------
// The king's tower (north-west)
// ---------------------------------------------------------------------------
export const KING = {}; // positions shared with the cast and the lights

function kingTower(b) {
  const t = TOWERS.nw;
  const f = frame(t);
  const g = G.kingTower;
  const R = (key) => ({ group: g, label: lab(key, 'kingTower'), addPlanes: [CUT] });
  const cx = t.x;
  const cz = t.z;

  // ---- ground floor: the prison
  b.with(R('prison'), () => {
    b.with({ kind: K.STRAW, color: 0xbca668 }, () => {
      const r = rng(11);
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI * 0.85 + r() * Math.PI * 0.7;
        const d = 0.3 + r() * 1.4;
        const [x, z] = f.at(a, d, 0);
        obox(b, x, F0 + 0.02, z, 0.3 + r() * 0.4, 0.04, 0.05 + r() * 0.06, r() * Math.PI);
      }
    });
    // a stone block to sit on, and the wall-ring and chain of the fetters
    b.with({ kind: K.STONE, color: 0x9a927e }, () => b.box(cx - 1.55, F0, cz - 3.95, cx - 0.65, F0 + 0.45, cz - 3.4));
    b.with({ kind: K.METAL, color: P.iron, label: lab('fetters', 'kingTower') }, () => {
      lathe(b, v3(cx - 1.1, F0 + 0.9, cz - 4.15), 'z', [[0.06, 0], [0.06, 0.05]], 8);
      for (let i = 0; i < 6; i++) {
        const k0 = i / 6;
        const k1 = (i + 1) / 6;
        const p = (k) => v3(cx - 1.1 + k * 0.2, F0 + 0.9 - Math.sin(k * Math.PI) * 0.35 - k * 0.78, cz - 4.1 + k * 0.85);
        beam(b, p(k0), p(k1), 0.025, 0.025);
      }
    });
    // a bucket, a jug of water and a crust
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(cx + 1.2, F0, cz - 3.4), 'y', [[0.16, 0], [0.18, 0.32]], 10));
    jug(b, cx - 2.1, F0, cz - 2.9, 0.9, 0x8f9a5a);
    loaf(b, cx - 1.9, F0, cz - 3.3, 0.08, 0x9a7048);
    windowIn(b, f, Math.PI * 0.95, F0 + 2.6, F0 + 3.3, 0.18);
    const [lx, lz] = f.at(0.05, 0.4, 0);
    lantern(b, lx, F0 + 2.3, lz, F1 - 0.5);
    KING.prisonLamp = [lx, F0 + 2.3, lz];
  });

  // ---- first floor: the household knights' chamber
  b.with(R('knightsChamber'), () => {
    bedstead(b, cx - 2.35, cx - 0.35, cz - 3.45, cz - 2.35, F1, 0x5a6a7a);
    bedstead(b, cx + 2.35, cx + 0.35, cz - 3.45, cz - 2.35, F1, 0x7a4a3a);
    // a chest between the beds
    chest(b, cx - 0.25, cx + 0.25, cz - 3.5, cz - 2.7, F1, 0.5, P.timberDark);
    // shields hung on the wall between the beds
    shield(b, cx - 0.7, F1 + 1.9, cz - RI + 0.13, 0xd8b04a, 0x9a2a20);
    shield(b, cx + 0.7, F1 + 1.9, cz - RI + 0.13, 0x3f5a7a, 0xe8d8a0);
    armourStand(b, cx - 3.35, F1, cz - 0.9);
    // the squire's stool and a basket of sand for scouring mail
    stool(b, cx + 2.6, F1, cz + 0.9, 0.42);
    b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(cx + 2.1, F1, cz + 1.3), 'y', [[0.18, 0], [0.22, 0.3]], 10));
    b.with({ kind: K.GROUND, color: 0xd8c8a0 }, () => b.cylinder(cx + 2.1, cz + 1.3, 0.2, F1 + 0.25, F1 + 0.28, 10));
    windowIn(b, f, Math.PI, F1 + 1.3, F1 + 2.7, 0.55, F1);
    pricket(b, cx + 0.0, F1 + 0.55, cz - 3.2, 0.12);
    b.with({ kind: K.CLOTH, color: 0x8a6a3a }, () => b.box(cx - 1.4, F1, cz - 1.6, cx + 1.2, F1 + 0.012, cz + 0.6)); // a rug of skins
    // swords hung on pegs
    b.with({ kind: K.METAL, color: 0x9a9a9e }, () => {
      for (const w of [-0.6, 0.6]) f.box(b, -0.35, 0.06, w, F1 + 1.5, 0.05, 0.95, 0.03);
    });
    b.with({ kind: K.TIMBER, color: 0x3a2a1e }, () => {
      for (const w of [-0.6, 0.6]) f.box(b, -0.35, 0.07, w, F1 + 2.05, 0.18, 0.04, 0.05);
    });
  });

  // ---- second floor: the king's privy chamber
  b.with(R('privyChamber'), () => {
    // green walls powdered with gold stars, as in Henry III's chambers
    wallBand(b, t, F2 + 0.6, F3 - 0.55, K.PLASTER, 0x6a8460);
    wallBand(b, t, F2, F2 + 0.6, K.PLASTER, 0x8a4a3a);
    b.with({ kind: K.PLAIN, color: 0xe2c05a }, () => {
      const r = rng(5);
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI + r() * Math.PI;
        const y = F2 + 0.8 + r() * 2.8;
        const [x, z] = f.at(a, 0.025, 0);
        obox(b, x, y, z, 0.07, 0.07, 0.015, -a + Math.PI / 2 + Math.PI / 4);
      }
    });
    // the dais and chair of state under a cloth of estate
    b.with({ kind: K.TIMBER, color: P.timber }, () => b.box(cx - 1.5, F2, cz - RI + 0.1, cx + 1.5, F2 + 0.2, cz - 2.4, { topKind: K.BOARDS, topColor: 0xa47e56 }));
  });
  b.with({ ...R('throne') }, () => {
    const y = F2 + 0.2;
    const z = cz - 3.2;
    b.with({ kind: K.TIMBER, color: 0x7a3a26 }, () => {
      b.box(cx - 0.42, y, z - 0.3, cx + 0.42, y + 0.48, z + 0.3); // seat
      b.box(cx - 0.42, y + 0.48, z - 0.38, cx + 0.42, y + 1.55, z - 0.28); // back
      for (const s of [-1, 1]) b.box(cx + s * 0.42 - 0.06, y + 0.48, z - 0.3, cx + s * 0.42 + 0.06, y + 0.82, z + 0.3); // arms
    });
    b.with({ kind: K.PLAIN, color: 0xd8b04a }, () => {
      for (const s of [-1, 1]) lathe(b, v3(cx + s * 0.42, y + 1.55, z - 0.33), 'y', [[0.05, 0], [0.07, 0.08], [0.001, 0.2]], 8);
      for (const s of [-1, 1]) lathe(b, v3(cx + s * 0.42, y + 0.82, z + 0.24), 'y', [[0.05, 0], [0.001, 0.12]], 8);
    });
    b.with({ kind: K.CLOTH, color: 0x9a2a2a }, () => b.box(cx - 0.36, y + 0.48, z - 0.25, cx + 0.36, y + 0.55, z + 0.27)); // cushion
  });
  b.with(R('clothOfEstate'), () => {
    const y = F2 + 0.2;
    // the cloth hung behind the chair: red, with three gold lions
    b.with({ kind: K.CLOTH, color: 0xa02a24 }, () => b.box(cx - 0.9, y + 0.6, cz - RI + 0.12, cx + 0.9, y + 3.2, cz - RI + 0.16));
    b.with({ kind: K.CLOTH, color: 0xd8b04a }, () => {
      for (let i = 0; i < 3; i++) {
        const yy = y + 2.55 - i * 0.62;
        b.box(cx - 0.32, yy - 0.1, cz - RI + 0.16, cx + 0.32, yy + 0.1, cz - RI + 0.18);
        b.box(cx + 0.22, yy + 0.05, cz - RI + 0.16, cx + 0.36, yy + 0.22, cz - RI + 0.18);
      }
    });
    // and its canopy, held out on cords
    b.with({ kind: K.CLOTH, color: 0xa02a24 }, () => b.box(cx - 0.9, y + 3.2, cz - RI + 0.12, cx + 0.9, y + 3.26, cz - 2.6));
    b.with({ kind: K.CLOTH, color: 0xd8b04a }, () => b.box(cx - 0.9, y + 3.0, cz - 2.64, cx + 0.9, y + 3.26, cz - 2.6));
    for (const s of [-1, 1]) cord(b, v3(cx + s * 0.88, y + 3.26, cz - 2.62), v3(cx + s * 0.88, F3 - 0.5, cz - 3.2), 0.015);
  });
  b.with(R('carpet'), () => {
    // a carpet before the dais (Eleanor of Castile brought the fashion)
    b.with({ kind: K.CLOTH, color: 0x8a3a2a }, () => b.box(cx - 1.3, F2, cz - 2.4, cx + 1.3, F2 + 0.015, cz + 0.4));
    b.with({ kind: K.CLOTH, color: 0x3f5a7a }, () => b.box(cx - 1.1, F2 + 0.015, cz - 2.2, cx + 1.1, F2 + 0.02, cz + 0.2));
    b.with({ kind: K.CLOTH, color: 0xd8b860 }, () => b.box(cx - 0.5, F2 + 0.02, cz - 1.6, cx + 0.5, F2 + 0.025, cz - 0.4));
  });
  b.with(R('privyChamber'), () => {
    // a window seat for the lady and her needlework
    windowIn(b, f, Math.PI, F2 + 1.0, F2 + 2.6, 0.6, F2);
    windowIn(b, f, -0.3, F2 + 1.0, F2 + 2.6, 0.6, F2);
    b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(cx - 3.75, F2 + 0.48, cz + 0.62), 'y', [[0.1, 0], [0.13, 0.1]], 10));
    // a table with a cloth, and a candlestick
    trestleTable(b, cx + 1.7, cx + 2.5, cz - 2.2, cz - 0.6, F2 + 0.78, { floor: F2 });
    b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => b.box(cx + 1.66, F2 + 0.78, cz - 2.24, cx + 2.54, F2 + 0.8, cz - 0.56));
    pricket(b, cx + 2.1, F2 + 0.8, cz - 1.9, 0.1);
    jug(b, cx + 2.1, F2 + 0.8, cz - 1.0, 1.0, 0xc8c2b0);
    // a brazier of charcoal on a tripod
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        beam(b, v3(cx - 1.9 + Math.cos(a) * 0.3, F2, cz - 0.4 + Math.sin(a) * 0.3), v3(cx - 1.9 + Math.cos(a) * 0.16, F2 + 0.55, cz - 0.4 + Math.sin(a) * 0.16), 0.035, 0.035);
      }
      lathe(b, v3(cx - 1.9, F2 + 0.55, cz - 0.4), 'y', [[0.12, 0], [0.3, 0.16]], 12);
    });
    b.with({ kind: K.EMIT, color: 0xe2702e }, () => b.cylinder(cx - 1.9, cz - 0.4, 0.26, F2 + 0.68, F2 + 0.71, 12));
  });
  KING.brazier = [cx - 1.9, F2 + 0.9, cz - 0.4];
  KING.throne = [cx, cz - 3.2];

  // ---- top floor: the king's bedchamber
  b.with(R('royalBed'), () => {
    // walls lined out in red like ashlar, a frieze of shields
    wallBand(b, t, F3, TOWER_CEIL - 0.6, K.PAINTED, 0xefe6cf);
    const arms = [[0xa02a24, 0xd8b04a], [0xe6dcc4, 0xa83a2a], [0xd8b04a, 0x9a2a20], [0x3f5a7a, 0xe8d8a0]];
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI * 0.82 + i * 0.5;
      const [x, z] = f.at(a, 0.04, 0);
      b.with({ kind: K.PLAIN, color: arms[i][0] }, () => obox(b, x, TOWER_CEIL - 1.0, z, 0.5, 0.6, 0.04, -a + Math.PI / 2));
      b.with({ kind: K.PLAIN, color: arms[i][1] }, () => obox(b, x, TOWER_CEIL - 1.0, z, 0.1, 0.5, 0.05, -a + Math.PI / 2));
    }
    // the great bed, head to the wall, hung in red and gold
    const bx0 = cx - 1.2;
    const bx1 = cx + 1.2;
    const bz0 = cz - RI + 0.25;
    const bz1 = cz - 1.6;
    b.with({ kind: K.TIMBER, color: 0x4a3426 }, () => b.box(bx0, F3, bz0, bx1, F3 + 0.42, bz1));
    b.with({ kind: K.CLOTH, color: 0xe8dfc8 }, () => b.box(bx0 + 0.05, F3 + 0.42, bz0 + 0.05, bx1 - 0.05, F3 + 0.6, bz1 - 0.05));
    b.with({ kind: K.CLOTH, color: 0xa02a24 }, () => b.box(bx0, F3 + 0.6, bz0 + 0.7, bx1, F3 + 0.66, bz1 + 0.02));
    b.with({ kind: K.CLOTH, color: 0xd8b04a }, () => b.box(bx0, F3 + 0.66, bz0 + 1.1, bx1, F3 + 0.67, bz0 + 1.35));
    b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => {
      b.box(bx0 + 0.2, F3 + 0.6, bz0 + 0.15, cx - 0.1, F3 + 0.75, bz0 + 0.55);
      b.box(cx + 0.1, F3 + 0.6, bz0 + 0.15, bx1 - 0.2, F3 + 0.75, bz0 + 0.55);
    });
    b.with({ kind: K.CLOTH, color: 0xa02a24 }, () => {
      // tester, valance and curtains bunched at the foot posts
      b.box(bx0 - 0.1, F3 + 2.6, bz0, bx1 + 0.1, F3 + 2.68, bz1 + 0.1);
      b.box(bx0 - 0.1, F3 + 2.3, bz1 + 0.06, bx1 + 0.1, F3 + 2.62, bz1 + 0.1);
      for (const x of [bx0 + 0.05, bx1 - 0.05]) lathe(b, v3(x, F3, bz1 - 0.05), 'y', [[0.17, 0], [0.13, 1.4], [0.11, 2.6]], 8);
      b.box(bx0 - 0.08, F3 + 0.1, bz0, bx0 - 0.04, F3 + 2.6, bz0 + 1.2);
      b.box(bx1 + 0.04, F3 + 0.1, bz0, bx1 + 0.08, F3 + 2.6, bz0 + 1.2);
      b.box(bx0, F3 + 0.8, bz0 - 0.02, bx1, F3 + 2.6, bz0 + 0.02);
    });
    b.with({ kind: K.CLOTH, color: 0xd8b04a }, () => b.box(bx0 - 0.1, F3 + 2.42, bz1 + 0.1, bx1 + 0.1, F3 + 2.47, bz1 + 0.11));
    for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1]]) cord(b, v3(x, F3 + 2.68, z), v3(x, TOWER_CEIL - 0.25, z), 0.02);
    // chests and a coffer at the bed's foot and side
    chest(b, cx - 0.7, cx + 0.7, cz - 1.45, cz - 0.95, F3, 0.5, 0x5a3a26);
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (const x of [cx - 0.5, cx + 0.5]) b.box(x - 0.03, F3, cz - 1.47, x + 0.03, F3 + 0.56, cz - 0.93);
    });
    chest(b, cx + 2.3, cx + 3.0, cz - 1.6, cz - 1.0, F3, 0.6, P.timberDark);
    // the page's pallet across the foot of the bed
    pallet(b, cx - 0.6, cz - 0.15, F3, Math.PI / 2, 0x5a6a4a);
    // a standing candlestick, and a perch with the king's falcon
    b.with({ kind: K.METAL, color: P.iron }, () => lathe(b, v3(cx - 1.6, F3, cz - 2.9), 'y', [[0.2, 0], [0.03, 0.05], [0.025, 1.3], [0.08, 1.32]], 8));
    pricket(b, cx - 1.6, F3 + 1.32, cz - 2.9, 0.02);
    windowIn(b, f, -Math.PI * 0.72, F3 + 1.0, F3 + 3.0, 0.6, F3);
    windowIn(b, f, -Math.PI * 0.28, F3 + 1.0, F3 + 3.0, 0.6, F3);
  });
  b.with(R('garderobe'), () => door(b, f, -0.2, F3));
  KING.bedFire = fireplace(b, f, Math.PI, F3, lab('royalBed', 'kingTower'));
  KING.bedCandle = [cx - 1.6, F3 + 1.55, cz - 2.9];
  KING.knightCandle = [cx, F1 + 0.8, cz - 3.2];
  void IW;
}

// ---------------------------------------------------------------------------
// The garrison tower (north-east)
// ---------------------------------------------------------------------------
export const GARRISON = {};

function garrisonTower(b) {
  const t = TOWERS.ne;
  const f = frame(t);
  const g = G.garrison;
  const R = (key) => ({ group: g, label: lab(key, 'garrison'), addPlanes: [CUT] });
  const cx = t.x;
  const cz = t.z;

  // ---- ground floor: the armoury
  b.with(R('armoury'), () => {
    // a rack of spears along the back wall
    b.with({ kind: K.TIMBER, color: P.timberDark, label: lab('weaponRack', 'garrison') }, () => {
      b.box(cx - 1.8, F0 + 1.6, cz - RI + 0.35, cx + 1.8, F0 + 1.68, cz - RI + 0.5);
      b.box(cx - 1.8, F0 + 0.25, cz - RI + 0.35, cx + 1.8, F0 + 0.33, cz - RI + 0.5);
      for (const x of [cx - 1.75, cx + 1.7]) b.box(x, F0, cz - RI + 0.3, x + 0.06, F0 + 1.7, cz - RI + 0.5);
    });
    b.with({ label: lab('weaponRack', 'garrison') }, () => {
      for (let i = 0; i < 9; i++) spear(b, v3(cx - 1.6 + i * 0.4, F0, cz - RI + 0.75), v3(cx - 1.62 + i * 0.4, F0 + 2.6, cz - RI + 0.4));
    });
    // longbows and arrows on the west side, crossbows on pegs
    b.with({ label: lab('bowRack', 'garrison') }, () => {
      bows(b, f, Math.PI * 0.97, F0, 6);
      sheaf(b, cx - 3.0, F0, cz - 1.6);
      sheaf(b, cx - 3.1, F0, cz - 0.7);
      for (const dz of [-1.6, -2.4]) crossbow(b, cx - Math.sqrt(RI * RI - dz * dz) + 0.03, F0 + 1.6, cz + dz);
    });
    // mail on stands, helmets on a shelf, shields on the wall
    b.with({ label: lab('armourStand', 'garrison') }, () => {
      armourStand(b, cx + 2.4, F0, cz - 2.6, false);
      armourStand(b, cx + 3.2, F0, cz - 1.4, true);
      f.box(b, -Math.PI * 0.38, 0.17, 0, F0 + 2.2, 1.8, 0.05, 0.35);
      for (let i = 0; i < 3; i++) {
        const [x, z] = f.at(-Math.PI * 0.38, 0.18, -0.6 + i * 0.6);
        kettleHat(b, x, F0 + 2.25, z);
      }
      shield(b, cx - 0.9, F0 + 2.3, cz - RI + 0.13, 0xa83a2a, 0xe8d8a0);
      shield(b, cx, F0 + 2.3, cz - RI + 0.13, 0xe6dcc4, 0xa83a2a);
      shield(b, cx + 0.9, F0 + 2.3, cz - RI + 0.13, 0xe6dcc4, 0xa83a2a);
    });
    // chests and casks of crossbow bolts
    chest(b, cx + 1.4, cx + 2.2, cz - 0.4, cz + 0.2, F0, 0.5, P.timberDark);
    b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => {
      for (let i = 0; i < 7; i++) obox(b, cx + 1.55 + i * 0.09, F0 + 0.56, cz - 0.1, 0.02, 0.02, 0.4, 0.05 * i);
    });
    cask(b, v3(cx - 0.9, F0 + 0.4, cz - 0.1), 'y', 0.33, 0.8);
  });
  // the grindstone (its wheel turns: see life.js) and the fletcher's bench
  b.with(R('grindstone'), () => {
    const x = cx + 0.6;
    const z = cz - 1.5;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const s of [-1, 1]) {
        b.box(x - 0.6, F0, z + s * 0.28 - 0.05, x + 0.6, F0 + 0.1, z + s * 0.28 + 0.05);
        b.box(x - 0.05, F0, z + s * 0.28 - 0.05, x + 0.05, F0 + 0.75, z + s * 0.28 + 0.05);
      }
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => b.box(x - 0.35, F0 + 0.05, z - 0.22, x + 0.35, F0 + 0.32, z + 0.22)); // water trough
    b.with({ kind: K.WATER, color: P.water }, () => b.box(x - 0.3, F0 + 0.3, z - 0.18, x + 0.3, F0 + 0.31, z + 0.18));
  });
  GARRISON.grind = [cx + 0.6, F0 + 0.75, cz - 1.5];
  b.with(R('fletcher'), () => {
    bench(b, cx - 2.2, cx - 1.2, cz - 2.7, cz - 2.35, 0.45, F0);
    trestleTable(b, cx - 2.3, cx - 1.1, cz - 3.35, cz - 2.8, F0 + 0.72, { floor: F0 });
    b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => {
      for (let i = 0; i < 8; i++) obox(b, cx - 2.15 + i * 0.12, F0 + 0.74, cz - 3.08, 0.012, 0.012, 0.45, 0.02 * i);
    });
    b.with({ kind: K.CLOTH, color: 0xe8e0cc }, () => lump(b, cx - 1.3, F0 + 0.76, cz - 3.1, 0.08, 0.04, 0.06, 0xe8e0cc, K.FUR)); // goose feathers
    jug(b, cx - 1.25, F0 + 0.72, cz - 2.95, 0.6, 0x5a4a3a); // glue pot
  });
  b.with(R('armoury'), () => {
    windowIn(b, f, 0.1, F0 + 2.4, F0 + 3.2, 0.18);
    windowIn(b, f, Math.PI - 0.1, F0 + 2.4, F0 + 3.2, 0.18);
    lantern(b, cx + 0.3, F0 + 2.4, cz - 2.2, F1 - 0.5);
  });
  GARRISON.lamp = [cx + 0.3, F0 + 2.4, cz - 2.2];

  // ---- first floor: the dormitory
  b.with(R('barracks'), () => {
    GARRISON.pallets = [];
    const angs = [-Math.PI * 0.82, -Math.PI * 0.62, -Math.PI * 0.42, -Math.PI * 0.22];
    const covers = [0x6a5a40, 0x5a6a4a, 0x7a5a3a, 0x5a5a62];
    angs.forEach((a, i) => {
      const [x, z] = f.at(a, 1.3, 0);
      const h = Math.atan2(Math.cos(a), Math.sin(a)); // long axis pointing at the wall
      pallet(b, x, z, F1, h + Math.PI, covers[i]);
      const [sx, sz] = f.at(a, 1.15, 0);
      GARRISON.pallets.push({ x: sx, z: sz, h: f.inward(a), a });
    });
    // kit on pegs round the wall: hats, quivers, cloaks
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.92 + i * 0.4;
      b.with({ kind: K.TIMBER, color: 0x3a2a1e }, () => f.box(b, a, 0.08, 0, F1 + 1.9, 0.06, 0.06, 0.16));
      const [x, z] = f.at(a, 0.2, 0);
      if (i % 2) kettleHat(b, x, F1 + 1.7, z);
      else b.with({ kind: K.CLOTH, color: [0x6a5a40, 0x7a3a2a, 0x5a6a4a][i % 3] }, () => f.box(b, a, 0.12, 0, F1 + 1.3, 0.45, 1.1, 0.08));
    }
    chest(b, cx - 0.5, cx + 0.5, cz - 1.3, cz - 0.7, F1, 0.45, P.timberDark);
    jug(b, cx - 0.2, F1 + 0.5, cz - 1.0, 0.8, 0xa86b3a);
    windowIn(b, f, 0.05, F1 + 1.2, F1 + 2.4, 0.3);
    pricket(b, cx + 0.3, F1 + 0.5, cz - 1.0, 0.1);
  });
  GARRISON.dormCandle = [cx + 0.3, F1 + 0.85, cz - 1.0];

  // ---- second floor: the mess room
  b.with(R('messRoom'), () => {
    trestleTable(b, cx - 1.3, cx + 1.3, cz - 2.6, cz - 1.8, F2 + 0.76, { floor: F2 });
    bench(b, cx - 1.3, cx + 1.3, cz - 3.3, cz - 2.95, 0.45, F2);
    bench(b, cx - 1.3, cx + 1.3, cz - 1.45, cz - 1.1, 0.45, F2);
    const ty = F2 + 0.76;
    b.with({ kind: K.PLAIN, color: 0xeae2cc }, () => {
      obox(b, cx - 0.1, ty + 0.015, cz - 2.2, 0.03, 0.03, 0.03, 0.3);
      obox(b, cx + 0.06, ty + 0.015, cz - 2.1, 0.03, 0.03, 0.03, 0.9);
    });
    for (const x of [-0.9, 0.5, 1.0]) bowl(b, cx + x, ty, cz - 2.3, 0.07, 0x8a6a48);
    jug(b, cx - 0.5, ty, cz - 2.4, 0.9, 0xa86b3a);
    loaf(b, cx + 0.7, ty, cz - 1.95, 0.09);
    // spears and a crossbow leaning by the door, a cask of ale
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = f.at(Math.PI * 0.9 - i * 0.08, 0.5, 0);
      const [x1, z1] = f.at(Math.PI * 0.9 - i * 0.08, 0.06, 0);
      spear(b, v3(x0, F2, z0), v3(x1, F2 + 2.5, z1));
    }
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(cx + 2.2, F2, cz - 2.5, cx + 2.9, F2 + 0.45, cz - 1.5));
    cask(b, v3(cx + 2.55, F2 + 0.82, cz - 2.0), 'x', 0.36, 0.95);
    windowIn(b, f, -Math.PI * 0.5, F2 + 1.4, F2 + 2.8, 0.3);
    windowIn(b, f, 0.05, F2 + 1.2, F2 + 2.4, 0.3);
    // a brazier to warm their hands at
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        beam(b, v3(cx + 1.9 + Math.cos(a) * 0.28, F2, cz - 0.2 + Math.sin(a) * 0.28), v3(cx + 1.9 + Math.cos(a) * 0.15, F2 + 0.5, cz - 0.2 + Math.sin(a) * 0.15), 0.035, 0.035);
      }
      lathe(b, v3(cx + 1.9, F2 + 0.5, cz - 0.2), 'y', [[0.12, 0], [0.28, 0.15]], 12);
    });
    b.with({ kind: K.EMIT, color: 0xe2702e }, () => b.cylinder(cx + 1.9, cz - 0.2, 0.24, F2 + 0.62, F2 + 0.65, 12));
  });
  GARRISON.brazier = [cx + 1.9, F2 + 0.85, cz - 0.2];

  // ---- top floor: the constable's chamber
  b.with(R('constableChamber'), () => {
    wallBand(b, t, F3, TOWER_CEIL - 0.6, K.PAINTED, 0xefe6cf);
    testerBed(b, cx - 2.3, cx - 0.2, cz - 3.3, cz - 1.2, F3, 0x3f5a7a, TOWER_CEIL - 0.25);
    // a desk under the window and the iron-bound chest of the garrison's pay
    trestleTable(b, cx + 0.6, cx + 2.0, cz - 3.6, cz - 2.9, F3 + 0.8, { floor: F3 });
    b.with({ kind: K.CLOTH, color: 0xece2c8 }, () => obox(b, cx + 1.2, F3 + 0.805, cz - 3.25, 0.42, 0.01, 0.32, 0.15));
    b.with({ kind: K.PLAIN, color: 0x2a2018 }, () => lathe(b, v3(cx + 1.7, F3 + 0.8, cz - 3.4), 'y', [[0.03, 0], [0.025, 0.08]], 8));
    pricket(b, cx + 0.8, F3 + 0.8, cz - 3.4, 0.08);
  });
  b.with(R('payChest'), () => {
    chest(b, cx - 0.4, cx + 0.5, cz - 1.05, cz - 0.45, F3, 0.55, 0x5a3a26);
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (const x of [cx - 0.3, cx + 0.05, cx + 0.4]) b.box(x - 0.03, F3, cz - 1.07, x + 0.03, F3 + 0.61, cz - 0.43);
      b.box(cx - 0.05, F3 + 0.3, cz - 0.44, cx + 0.15, F3 + 0.45, cz - 0.41); // lock
    });
  });
  b.with(R('constableChamber'), () => {
    windowIn(b, f, -Math.PI * 0.42, F3 + 1.2, F3 + 3.0, 0.6, F3);
    b.with({ kind: K.CLOTH, color: 0x8a6a3a }, () => b.box(cx - 0.5, F3, cz - 2.6, cx + 1.4, F3 + 0.012, cz - 0.4));
  });
  GARRISON.fire = fireplace(b, f, 0, F3, lab('constableChamber', 'garrison'));
  GARRISON.deskCandle = [cx + 0.8, F3 + 1.0, cz - 3.4];
  void tub;
  void sack;
  void IC_H;
}
