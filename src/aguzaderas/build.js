import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { plane } from '../geom/builder.js';
import { lab } from '../data/labels.js';
import { cren, wall, obox, beam, stairs, v3 } from '../geom/shapes.js';
import { lathe, ladder, woodpile, chest, sack, tub, lump, log } from '../geom/props.js';
import { tree, bush, tuft, boulder, rng } from '../geom/nature.js';
import { G } from './rooms.js';
import { groundY } from './terrain.js';
import {
  T, WALK, PARA, IN, OUT, MID, CUT_DOWN, CT, CORNERS, CUBO, KEEP, KEEP_IN, SPECULA, GATE,
  ALB, ALB_CX, BRIDGE, ANNEX, WELL, SPRING, TERRAIN,
} from './layout.js';

// The static geometry of the Castillo de las Aguzaderas, c. 1410. What the
// sources say, and what is estimated, is set out in layout.js and in the
// notes; this file only builds it.

const RUBBLE = 0xcbb286; // golden calcarenite rubble, as in photographs
const ASHLAR = 0xd8c49c;
const WALKWAY = 0xc9b48e;
const TURF = 0xa3ab6a;
const EARTH = 0xc4a97e;
const FOUND = -0.8; // walls go a little below the ground line

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildAguzaderas(b) {
  terrain(b);
  curtains(b);
  for (const [key, c] of Object.entries(CORNERS)) cornerTower(b, key, c);
  cubo(b, OUT.x0, -1);
  cubo(b, OUT.x1, 1);
  keep(b);
  gate(b);
  wallStair(b);
  albarrana(b);
  annex(b);
  court(b);
  spring(b);
  landscape(b);
}

// ---------------------------------------------------------------------------
// helpers

/** Square-topped merlons round the edge of a rectangle at height y. */
function crenRect(b, x0, z0, x1, z1, y, opts = {}) {
  const t = opts.t ?? PARA.t;
  const o = { base: opts.base ?? PARA.base, mh: opts.mh ?? PARA.mh, mw: opts.mw ?? PARA.mw, gw: opts.gw ?? PARA.gw };
  const skip = opts.skip ?? {};
  cren(b, 'x', x0, x1, z0, z0 + t, y, { ...o, skip: skip.n });
  if (!opts.noSouth) cren(b, 'x', x0, x1, z1 - t, z1, y, { ...o, skip: skip.s });
  cren(b, 'z', z0 + t, z1 - t, x0, x0 + t, y, { ...o, skip: skip.w });
  cren(b, 'z', z0 + t, z1 - t, x1 - t, x1, y, { ...o, skip: skip.e });
}

/** Dressed quoins up a vertical corner at (x, z); sx, sz: which way the faces look. */
function quoins(b, x, z, sx, sz, y0, y1) {
  b.with({ kind: K.STONE, color: ASHLAR, capColor: ASHLAR }, () => {
    let i = 0;
    for (let y = y0; y < y1 - 0.1; y += 0.42, i++) {
      const h = Math.min(0.4, y1 - y);
      const la = i % 2 ? 0.75 : 0.42; // long and short faces alternate
      const lb = i % 2 ? 0.42 : 0.75;
      b.box(x + sx * 0.03, y, z - sz * lb, x - sx * la, y + h, z + sz * 0.03);
    }
  });
}

/**
 * Masonry filling a vault from its underside h(x, z) up to a level top,
 * over the rectangle, as small triangular prisms (so the cut shows the
 * vault's real profile). skip(x, z) leaves a cell out (hatch, murder hole).
 */
function vaultFill(b, x0, x1, z0, z1, h, top, nx, nz, skip = () => false) {
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const xa = x0 + ((x1 - x0) * i) / nx;
      const xb = x0 + ((x1 - x0) * (i + 1)) / nx;
      const za = z0 + ((z1 - z0) * j) / nz;
      const zb = z0 + ((z1 - z0) * (j + 1)) / nz;
      if (skip((xa + xb) / 2, (za + zb) / 2)) continue;
      for (const tri of [[[xa, za], [xb, za], [xb, zb]], [[xa, za], [xb, zb], [xa, zb]]]) {
        b.loft(tri.map(([x, z]) => V(x, Math.min(h(x, z), top - 0.05), z)), tri.map(([x, z]) => V(x, top, z)), { topKind: K.PAVING, topColor: WALKWAY });
      }
    }
  }
}

/** Underside of a sail vault (a shallow dome on a square) over a rectangle. */
function sailVault(x0, x1, z0, z1, spring, crown) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const rise = crown - spring;
  const dc2 = ((x1 - x0) / 2) ** 2 + ((z1 - z0) / 2) ** 2;
  const R = (dc2 + rise * rise) / (2 * rise);
  const yc = crown - R;
  return (x, z) => yc + Math.sqrt(Math.max(0, R * R - (x - cx) ** 2 - (z - cz) ** 2));
}

/** Underside of a pointed barrel vault spanning u0..u1 across ('x' or 'z'). */
function pointedVault(across, u0, u1, spring, crown) {
  const mid = (u0 + u1) / 2;
  const w = (u1 - u0) / 2;
  return (x, z) => {
    const t = Math.min(1, Math.abs((across === 'x' ? x : z) - mid) / w);
    return spring + (crown - spring) * (Math.sqrt(Math.max(0, 4 - (t + 1) * (t + 1))) / Math.sqrt(3));
  };
}

/** Openings for arrow slits centred on a face, leaving out any that would hit a door. */
function slits(a0, a1, y0, y1, doors = []) {
  const m = (a0 + a1) / 2;
  const s = { a0: m - 0.08, a1: m + 0.08, y0, y1 };
  return doors.some((d) => d.a1 > s.a0 - 0.3 && d.a0 < s.a1 + 0.3) ? [] : [s];
}

// ---------------------------------------------------------------------------

function terrain(b) {
  const { x0, x1, z0, z1, base, rockTop } = TERRAIN;
  b.with({ kind: K.ROCK, color: 0xb9ab8e, group: G.terrain, label: lab('rock') }, () => b.box(x0, base, z0, x1, rockTop, z1));
  const step = 4;
  const r = rng(7);
  for (let x = x0; x < x1 - 1e-6; x += step) {
    for (let z = z0; z < z1 - 1e-6; z += step) {
      const xa = x;
      const xb = Math.min(x + step, x1);
      const za = z;
      const zb = Math.min(z + step, z1);
      if (za >= 0) continue; // wholly in the removed half
      const cx = (xa + xb) / 2;
      const cz = (za + zb) / 2;
      const inCourt = cx > IN.x0 - 1 && cx < IN.x1 + 1 && cz > IN.z0 - 1 && cz < IN.z1 + 2;
      const onTrack = cx < OUT.x0 + 1 && Math.abs(cz - trackZ(cx)) < 2.6;
      const atSpring = Math.hypot(cx - SPRING.x, cz - SPRING.z) < 5.5;
      const bare = inCourt || onTrack || atSpring;
      const tint = new THREE.Color(bare ? EARTH : TURF).multiplyScalar(0.94 + 0.1 * r());
      if (!bare && r() < 0.3) tint.lerp(new THREE.Color(0xb8b070), 0.35); // drier, yellowing patches
      const label = inCourt ? lab('court', 'court') : onTrack ? lab('track') : lab('turf');
      const group = inCourt ? G.court : G.terrain;
      b.with({ kind: K.GROUND, color: tint.getHex(), group, label }, () => {
        for (const tri of [[[xa, za], [xb, za], [xb, zb]], [[xa, za], [xb, zb], [xa, zb]]]) {
          b.loft(tri.map(([px, pz]) => V(px, rockTop, pz)), tri.map(([px, pz]) => V(px, groundY(px, pz), pz)));
        }
      });
    }
  }
}

// the track runs west from the gate, bending a little to the north
function trackZ(x) {
  return (GATE.z0 + GATE.z1) / 2 - Math.max(0, OUT.x0 - x) * 0.12;
}

function curtains(b) {
  const nwSpan = [CORNERS.nw.x - CT.size / 2, CORNERS.nw.x + CT.size / 2];
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.curtain, label: lab('curtain') }, () => {
    const top = { topKind: K.PAVING, topColor: WALKWAY };
    // north and east, west with the gate
    b.box(OUT.x0, FOUND, OUT.z0, OUT.x1, WALK, IN.z0, top);
    b.box(IN.x1, FOUND, IN.z0, OUT.x1, WALK, IN.z1, top);
    wall(b, 'z', IN.z0, IN.z1, OUT.x0, IN.x0, FOUND, WALK, [{ a0: GATE.z0, a1: GATE.z1, y0: 0, y1: GATE.h, arch: 'pointed', rise: 1.5 }], top);
    // what is left of the south curtain, either side of the keep
    b.with({ label: lab('curtainCut') }, () => {
      b.box(OUT.x0, FOUND, IN.z1, KEEP.x0, CUT_DOWN, OUT.z1);
      b.box(KEEP.x1, FOUND, IN.z1, OUT.x1, CUT_DOWN, OUT.z1);
    });
  });
  // parapets on the outer edge
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.curtain, label: lab('parapet') }, () => {
    const o = { base: PARA.base, mh: PARA.mh, mw: PARA.mw, gw: PARA.gw };
    const cuboSkip = [CUBO.z - CUBO.r, CUBO.z + CUBO.r];
    cren(b, 'x', OUT.x0, OUT.x1, OUT.z0, OUT.z0 + PARA.t, WALK, { ...o, skip: [nwSpan, [BRIDGE.x0, BRIDGE.x1]] });
    cren(b, 'z', OUT.z0 + PARA.t, OUT.z1, OUT.x0, OUT.x0 + PARA.t, WALK, {
      ...o,
      skip: [[CORNERS.nw.z - CT.size / 2, CORNERS.nw.z + CT.size / 2], [CORNERS.sw.z - CT.size / 2, CORNERS.sw.z + CT.size / 2], cuboSkip, [GATE.z0 - 0.7, GATE.z1 + 0.7]],
    });
    cren(b, 'z', OUT.z0 + PARA.t, OUT.z1, OUT.x1 - PARA.t, OUT.x1, WALK, {
      ...o,
      skip: [[CORNERS.se.z - CT.size / 2, CORNERS.se.z + CT.size / 2], cuboSkip],
    });
  });
  // dressed stone at the free north-east corner
  b.with({ group: G.curtain, label: lab('quoins') }, () => quoins(b, OUT.x1, OUT.z0, 1, -1, 0, WALK));
}

function cornerTower(b, key, c) {
  const s = CT.size / 2;
  const w = CT.wall;
  const x0 = c.x - s;
  const x1 = c.x + s;
  const z0 = c.z - s;
  const z1 = c.z + s;
  const group = { nw: G.towerNW, sw: G.towerSW, se: G.towerSE }[key];
  const room = key === 'sw' ? 'cornerTower' : null;
  const top = CT.terrace;
  const y0 = WALK;
  // doors from the wall-walk (0.9 wide)
  const door = (m) => ({ a0: m - 0.45, a1: m + 0.45, y0, y1: y0 + 2.0 });
  const doors = { n: [], s: [], w: [], e: [] };
  if (key === 'sw') doors.n.push(door(MID.x0));
  if (key === 'se') doors.n.push(door(MID.x1));
  if (key === 'nw') {
    doors.s.push(door(MID.x0));
    doors.e.push(door(MID.zN));
  }
  const sl = (a0, a1, d) => slits(a0, a1, y0 + 0.7, y0 + 2.0, d);
  const hx = x1 - w - 0.45; // the hatch
  const hz = z0 + w + 0.45;
  b.with({ kind: K.RUBBLE, color: RUBBLE, group, label: lab('cornerTower', room) }, () => {
    b.box(x0, FOUND, z0, x1, y0, z1, { topKind: K.PAVING, topColor: WALKWAY }); // solid up to the wall-walk
    const tp = { topKind: K.PAVING, topColor: WALKWAY };
    wall(b, 'x', x0, x1, z0, z0 + w, y0, top, [...doors.n, ...sl(x0, x1, doors.n)], tp);
    wall(b, 'x', x0, x1, z1 - w, z1, y0, top, [...doors.s, ...sl(x0, x1, doors.s)], tp);
    wall(b, 'z', z0 + w, z1 - w, x0, x0 + w, y0, top, [...doors.w, ...sl(z0, z1, doors.w)], tp);
    wall(b, 'z', z0 + w, z1 - w, x1 - w, x1, y0, top, [...doors.e, ...sl(z0, z1, doors.e)], tp);
    // the vault, with its hatch in the north-east corner of the chamber
    b.with({ label: lab('towerVault', room) }, () => {
      vaultFill(b, x0 + w, x1 - w, z0 + w, z1 - w, pointedVault('x', x0 + w, x1 - w, y0 + 2.0, y0 + 3.3), top, 10, 6, (x, z) => x > hx - 0.45 && z < hz + 0.45);
    });
  });
  b.with({ kind: K.RUBBLE, color: RUBBLE, group, label: lab('terrace', room) }, () => crenRect(b, x0, z0, x1, z1, top));
  b.with({ kind: K.TIMBER, color: P.timberDark, group, label: lab('ladder', room) }, () => {
    ladder(b, hx - 0.1, y0, hz + 0.9, hx - 0.1, top - 0.1, hz + 0.1, 0.42);
  });
  b.with({ group, label: lab('quoins', room) }, () => {
    for (const [qx, qz, sx, sz] of [[x0, z0, -1, -1], [x1, z0, 1, -1], [x0, z1, -1, 1], [x1, z1, 1, 1]]) quoins(b, qx, qz, sx, sz, 0, top);
  });
  // a pallet and a crossbow by the slit in the cut tower
  if (key === 'sw') {
    b.with({ group, label: lab('bedding', room) }, () => {
      b.with({ kind: K.STRAW, color: P.straw }, () => b.box(x0 + w + 0.1, y0, z0 + w + 0.2, x0 + w + 0.85, y0 + 0.16, z0 + w + 2.1));
      b.with({ kind: K.CLOTH, color: 0x8a6a4a }, () => b.box(x0 + w + 0.12, y0 + 0.16, z0 + w + 0.6, x0 + w + 0.83, y0 + 0.21, z0 + w + 1.8));
    });
  }
}

function cubo(b, faceX, dir) {
  const { r, depth, z } = CUBO;
  const cx = faceX + dir * (depth - r);
  // a D in plan: a half-round on the front, straight sides back into the wall
  const a0 = dir < 0 ? Math.PI / 2 : -Math.PI / 2;
  const n = 14;
  const poly = [[faceX - dir * 0.3, z - r * dir]];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (Math.PI * i) / n;
    poly.push([cx + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  poly.push([faceX - dir * 0.3, z + r * dir]);
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.cubos, label: lab('cubo') }, () => {
    b.prism(poly, FOUND, WALK, { topKind: K.PAVING, topColor: WALKWAY });
    // merlons round the front
    const segs = 10;
    b.ring(cx, z, r - PARA.t, r, WALK, WALK + PARA.base, segs, a0, a0 + Math.PI);
    for (let i = 0; i < segs; i += 2) {
      const A = a0 + (Math.PI * i) / segs;
      b.ring(cx, z, r - PARA.t, r, WALK + PARA.base, WALK + PARA.base + PARA.mh, 1, A, A + Math.PI / segs);
    }
    for (const sz of [-1, 1]) {
      const zz = z + sz * (r - PARA.t / 2);
      b.box(Math.min(faceX, cx), WALK, zz - PARA.t / 2, Math.max(faceX, cx), WALK + PARA.base + PARA.mh, zz + PARA.t / 2);
    }
  });
}

function keep(b) {
  const k = KEEP;
  const ki = KEEP_IN;
  const room = 'keep';
  const grp = G.keep;
  const tp = { topKind: K.PAVING, topColor: WALKWAY };
  // podium and plinth
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('keepPodium', room) }, () => {
    b.box(k.x0 - 0.5, FOUND, k.z0 - 0.5, k.x1 + 0.5, k.podium, k.z1 + 0.5, tp);
  });
  b.with({ kind: K.STONE, color: ASHLAR, group: grp, label: lab('quoins', room) }, () => {
    b.box(k.x0 - 0.06, k.podium, k.z0 - 0.06, k.x1 + 0.06, k.podium + 0.45, k.z1 + 0.06);
  });
  // steps up to the door
  b.with({ kind: K.STONE, color: ASHLAR, group: grp, label: lab('keepDoor', room) }, () => {
    stairs(b, 'z', k.z0 - 1.7, k.door.x0 - 0.15, k.door.x1 + 0.15, 0, k.podium, 4, 0.3, 1);
  });
  const H = k.terrace;
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('keep', room) }, () => {
    // north wall: the door, the window into the machicolation, slits
    wall(b, 'x', k.x0, ki.x1, k.z0, ki.z0, k.floor1, H, [
      { a0: k.door.x0, a1: k.door.x1, y0: k.floor1, y1: k.floor1 + 2.2 },
      { a0: k.door.x0, a1: k.door.x1, y0: k.floor2 + 0.9, y1: k.floor2 + 2.4 },
      { a0: 0.8, a1: 0.96, y0: k.floor1 + 1.0, y1: k.floor1 + 2.2 },
    ], tp);
    // west wall with slits on both storeys
    wall(b, 'z', ki.z0, k.z1, k.x0, ki.x0, k.floor1, H, [
      { a0: -1.6, a1: -1.44, y0: k.floor1 + 1.0, y1: k.floor1 + 2.2 },
      { a0: -1.6, a1: -1.44, y0: k.floor2 + 1.0, y1: k.floor2 + 2.3 },
    ], tp);
  });
  // the east wall carries two flights of stairs in its thickness: the first
  // up to the upper storey, the second on to the terrace
  const A = [ki.x1 + 0.3, ki.x1 + 1.2];
  const Bc = [ki.x1 + 1.6, ki.x1 + 2.5];
  const run = (2.4 - ki.z0) / 18;
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('keepStair', room) }, () => {
    b.box(ki.x1, k.floor1, k.z0, k.x1, H, ki.z0, tp); // solid north end
    b.box(ki.x1, k.floor1, ki.z1, k.x1, H, k.z1, tp); // solid south end
    // skins between and outside the flights
    wall(b, 'z', ki.z0, ki.z1, ki.x1, A[0], k.floor1, H, [
      { a0: ki.z0, a1: ki.z0 + 0.9, y0: k.floor1, y1: k.floor1 + 2.1 },
      { a0: 2.4, a1: ki.z1, y0: k.floor2, y1: k.floor2 + 2.1 },
    ], tp);
    wall(b, 'z', ki.z0, ki.z1, A[1], Bc[0], k.floor1, H, [{ a0: 2.4, a1: ki.z1, y0: k.floor2, y1: k.floor2 + 2.1 }], tp);
    b.box(Bc[1], k.floor1, ki.z0, k.x1, H, ki.z1, tp);
    // first flight, rising south
    b.with({ kind: K.STONE, color: ASHLAR }, () => stairs(b, 'z', ki.z0, A[0], A[1], k.floor1, k.floor2, 18, run, 1));
    b.box(A[0], k.floor1, 2.4, A[1], k.floor2, ki.z1);
    for (let i = 0; i < 18; i++) {
      const yTop = k.floor1 + ((k.floor2 - k.floor1) * (i + 1)) / 18 + 2.3;
      b.box(A[0], yTop, ki.z0 + i * run, A[1], H, ki.z0 + (i + 1) * run);
    }
    b.box(A[0], k.floor2 + 2.3, 2.4, A[1], H, ki.z1);
    // second flight, rising north, solid beneath
    b.box(Bc[0], k.floor1, ki.z0, Bc[1], k.floor2, ki.z1);
    b.with({ kind: K.STONE, color: ASHLAR }, () => stairs(b, 'z', 2.4, Bc[0], Bc[1], k.floor2, H, 18, run, -1));
    b.box(Bc[0], k.floor2 + 2.3, 2.4, Bc[1], H, ki.z1);
    for (let i = 0; i < 18; i++) {
      const yTop = k.floor2 + ((H - k.floor2) * (i + 1)) / 18 + 2.3;
      if (yTop >= H - 0.05) continue; // the top of the flight opens into the turret
      b.box(Bc[0], yTop, 2.4 - (i + 1) * run, Bc[1], H, 2.4 - i * run);
    }
  });
  // the two sail vaults; the lower one with the murder hole over the entrance
  b.with({ kind: K.RUBBLE, color: 0xd2bd94, group: grp, label: lab('keepVault', room) }, () => {
    const mh = (x, z) => x > k.door.x0 - 0.05 && x < k.door.x1 + 0.05 && z < ki.z0 + 0.7;
    vaultFill(b, ki.x0, ki.x1, ki.z0, ki.z1, sailVault(ki.x0, ki.x1, ki.z0, ki.z1, k.spring1, k.crown1), k.floor2, 11, 12, mh);
    vaultFill(b, ki.x0, ki.x1, ki.z0, ki.z1, sailVault(ki.x0, ki.x1, ki.z0, ki.z1, k.spring2, k.crown2), H, 11, 12);
  });
  // a stone kerb round the murder hole in the upper floor
  b.with({ kind: K.STONE, color: ASHLAR, group: grp, label: lab('murderHole', room) }, () => {
    const [x0, x1, z1] = [k.door.x0 - 0.15, k.door.x1 + 0.15, ki.z0 + 0.85];
    b.box(x0, k.floor2, ki.z0, x0 + 0.12, k.floor2 + 0.12, z1);
    b.box(x1 - 0.12, k.floor2, ki.z0, x1, k.floor2 + 0.12, z1);
    b.box(x0, k.floor2, z1 - 0.12, x1, k.floor2 + 0.12, z1);
  });
  // door: ashlar jambs, lintel on moulded corbels
  b.with({ kind: K.STONE, color: ASHLAR, group: grp, label: lab('keepDoor', room) }, () => {
    const zf = k.z0;
    b.box(k.door.x0 - 0.4, k.floor1, zf - 0.05, k.door.x0, k.floor1 + 2.2, zf + 0.3);
    b.box(k.door.x1, k.floor1, zf - 0.05, k.door.x1 + 0.4, k.floor1 + 2.2, zf + 0.3);
    b.box(k.door.x0 - 0.4, k.floor1 + 2.2, zf - 0.08, k.door.x1 + 0.4, k.floor1 + 2.62, zf + 0.3);
    // each corbel moulded as two rolls, one over the other
    for (const x of [k.door.x0 + 0.12, k.door.x1 - 0.12]) {
      b.hcyl('x', x, k.floor1 + 2.1, zf + 0.06, 0.075, 0.26, 10);
      b.hcyl('x', x, k.floor1 + 1.95, zf + 0.12, 0.065, 0.26, 10);
    }
  });
  b.with({ kind: K.TIMBER, color: 0x6a4e34, group: grp, label: lab('keepDoor', room) }, () => {
    obox(b, k.door.x0 + 0.1, k.floor1 + 1.06, ki.z0 - 0.35, 0.09, 2.1, 1.1, 0.25); // a leaf, standing open
  });
  // machicolation over the door, at the level of the upper storey
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('machicolation', room) }, () => {
    const mx0 = k.door.x0 - 0.7;
    const mx1 = k.door.x1 + 0.7;
    const zf = k.z0;
    const y0 = k.floor2 + 0.5;
    b.box(mx0, y0, zf - 0.95, mx1, y0 + 2.5, zf - 0.7);
    b.box(mx0, y0, zf - 0.95, mx0 + 0.25, y0 + 2.5, zf);
    b.box(mx1 - 0.25, y0, zf - 0.95, mx1, y0 + 2.5, zf);
    b.box(mx0, y0 + 2.5, zf - 0.95, mx1, y0 + 2.75, zf);
    b.with({ kind: K.STONE, color: ASHLAR }, () => {
      for (const x of [mx0 + 0.12, (mx0 + mx1) / 2, mx1 - 0.12]) {
        b.box(x - 0.12, y0 - 0.7, zf - 0.95, x + 0.12, y0, zf);
      }
    });
  });
  // terrace, parapet, bartizans and the signal turret
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('terrace', 'keepTerrace') }, () => {
    const sk = [[k.x0, k.x0 + 0.9], [k.x1 - 0.9, k.x1]];
    const skz = [[k.z0, k.z0 + 0.9], [k.z1 - 0.9, k.z1]];
    crenRect(b, k.x0, k.z0, k.x1, k.z1, H, { skip: { n: sk, s: sk, w: skz, e: skz } });
  });
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('garita', 'keepTerrace') }, () => {
    for (const [cx, cz] of [[k.x0, k.z0], [k.x1, k.z0], [k.x0, k.z1], [k.x1, k.z1]]) {
      const gx = cx + Math.sign(cx) * 0.25;
      const gz = cz + Math.sign(cz) * 0.25;
      b.frustum(gx, gz, 0.2, 0.78, H - 1.6, H - 0.2, 12);
      b.ring(gx, gz, 0.5, 0.78, H - 0.2, H + 1.9, 12);
      b.cylinder(gx, gz, 0.5, H - 0.2, H, 12);
      for (let i = 0; i < 12; i += 3) b.ring(gx, gz, 0.5, 0.78, H + 1.9, H + 2.5, 1, (i / 12) * Math.PI * 2, ((i + 1.5) / 12) * Math.PI * 2);
    }
  });
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: grp, label: lab('specula', 'keepTerrace') }, () => {
    const { x, z, r, h } = SPECULA;
    b.ring(x, z, r - 0.3, r, H, H + h, 16, 0, Math.PI * 2, { skip: (a) => Math.cos(a) < -0.85 }); // door to the west
    b.ring(x, z, r - 0.3, r, H + 2.0, H + h, 3, Math.PI * 0.82, Math.PI * 1.18);
    b.cylinder(x, z, r, H + h, H + h + 0.25, 16, { topKind: K.PAVING, topColor: WALKWAY });
    b.ring(x, z, r - 0.25, r, H + h + 0.25, H + h + 0.75, 16);
  });
  b.with({ group: grp, label: lab('quoins', room) }, () => {
    for (const [qx, qz, sx, sz] of [[k.x0, k.z0, -1, -1], [k.x1, k.z0, 1, -1], [k.x0, k.z1, -1, 1], [k.x1, k.z1, 1, 1]]) quoins(b, qx, qz, sx, sz, k.podium + 0.45, H - 1.6);
  });
  // in the chambers: stores below, the garrison's bedding and a chest above
  b.with({ group: grp, label: lab('keepChamber', room) }, () => {
    for (let i = 0; i < 4; i++) sack(b, ki.x0 + 0.45 + i * 0.55, k.floor1, ki.z0 + 1.4, 0.5, 0.7, i * 0.4);
    b.with({ kind: K.PLAIN, color: 0xb87a50 }, () => {
      for (const [x, z] of [[ki.x0 + 0.5, -1.3], [ki.x0 + 0.5, -0.5]]) lathe(b, v3(x, k.floor1, z), 'y', [[0.18, 0], [0.32, 0.35], [0.3, 0.7], [0.16, 0.86], [0.18, 0.92]], 12); // storage jars
    });
    b.with({ kind: K.STRAW, color: P.straw }, () => {
      b.box(ki.x0 + 0.1, k.floor2, ki.z0 + 1.2, ki.x0 + 0.9, k.floor2 + 0.16, ki.z0 + 3.1);
      b.box(ki.x0 + 1.1, k.floor2, ki.z0 + 1.6, ki.x0 + 1.9, k.floor2 + 0.16, ki.z0 + 3.5);
    });
    b.with({ kind: K.CLOTH, color: 0x7a6a8a }, () => b.box(ki.x0 + 0.12, k.floor2 + 0.16, ki.z0 + 1.6, ki.x0 + 0.88, k.floor2 + 0.22, ki.z0 + 2.9));
  });
  b.with({ group: grp, label: lab('chest', room) }, () => chest(b, ki.x1 - 1.4, ki.x1 - 0.2, ki.z0 + 0.2, ki.z0 + 0.8, k.floor2, 0.6));
  b.with({ group: grp, label: lab('brazier', room) }, () => {
    b.with({ kind: K.METAL, color: P.iron }, () => lathe(b, v3(-0.2, k.floor2, -1.0), 'y', [[0.05, 0], [0.05, 0.45], [0.32, 0.5], [0.34, 0.68]], 10));
    b.with({ kind: K.EMIT, color: P.ember }, () => lathe(b, v3(-0.2, k.floor2 + 0.6, -1.0), 'y', [[0.28, 0], [0.18, 0.1], [0.001, 0.12]], 10));
  });
}

function gate(b) {
  const zc = (GATE.z0 + GATE.z1) / 2;
  b.with({ group: G.gate, label: lab('gate', 'gate') }, () => {
    // ashlar jambs on the outer face
    b.with({ kind: K.STONE, color: ASHLAR }, () => {
      b.box(OUT.x0 - 0.05, 0, GATE.z0 - 0.45, OUT.x0 + 0.4, GATE.h - 1.5, GATE.z0);
      b.box(OUT.x0 - 0.05, 0, GATE.z1, OUT.x0 + 0.4, GATE.h - 1.5, GATE.z1 + 0.45);
    });
    // the leaves, opened back against the inner face
    b.with({ kind: K.TIMBER, color: 0x6a4e34 }, () => {
      b.box(IN.x0 + 0.05, 0.02, GATE.z0 - 1.3, IN.x0 + 0.16, GATE.h - 1.4, GATE.z0);
      b.box(IN.x0 + 0.05, 0.02, GATE.z1, IN.x0 + 0.16, GATE.h - 1.4, GATE.z1 + 1.3);
    });
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (const y of [0.6, 1.6, 2.5]) {
        b.box(IN.x0 + 0.16, y, GATE.z0 - 1.25, IN.x0 + 0.19, y + 0.07, GATE.z0 - 0.05);
        b.box(IN.x0 + 0.16, y, GATE.z1 + 0.05, IN.x0 + 0.19, y + 0.07, GATE.z1 + 1.25);
      }
    });
  });
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.gate, label: lab('machicolation', 'gate') }, () => {
    const x0 = OUT.x0 - 0.95;
    const za = GATE.z0 - 0.7;
    const zb = GATE.z1 + 0.7;
    const y0 = WALK - 0.9;
    b.box(x0, y0, za, x0 + 0.3, WALK + PARA.base, zb);
    b.box(x0, y0, za, OUT.x0, WALK + PARA.base, za + 0.3);
    b.box(x0, y0, zb - 0.3, OUT.x0, WALK + PARA.base, zb);
    cren(b, 'z', za, zb, x0, x0 + 0.3, WALK + PARA.base, { base: 0.01, mh: PARA.mh, mw: 0.7, gw: 0.45 });
    b.with({ kind: K.STONE, color: ASHLAR }, () => {
      for (const z of [za + 0.15, zc, zb - 0.15]) b.box(x0, y0 - 0.7, z - 0.13, OUT.x0, y0, z + 0.13);
    });
  });
}

function wallStair(b) {
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.wallStair, label: lab('wallStair', 'wallWalk') }, () => {
    stairs(b, 'x', -4.0, IN.z0, IN.z0 + 1.3, 0, WALK, 22, 0.48, -1, { topKind: K.PAVING, topColor: WALKWAY });
  });
}

function albarrana(b) {
  const a = ALB;
  const w = a.wall;
  const cut = plane(1, 0, 0, ALB_CX); // the tower is cut open on x = ALB_CX
  const room = 'albarrana';
  const tp = { topKind: K.PAVING, topColor: WALKWAY };
  const ix0 = a.x0 + w;
  const ix1 = a.x1 - w;
  const iz0 = a.z0 + w;
  const iz1 = a.z1 - w;
  b.with({ addPlanes: [cut], group: G.albarrana }, () => {
    b.with({ kind: K.RUBBLE, color: RUBBLE, label: lab('albarrana', room) }, () => {
      const sl = (y) => ({ a0: (iz0 + iz1) / 2 - 0.08, a1: (iz0 + iz1) / 2 + 0.08, y0: y, y1: y + 1.2 });
      wall(b, 'x', a.x0, a.x1, iz1, a.z1, FOUND, a.terrace, [{ a0: 13.4, a1: 14.9, y0: WALK, y1: WALK + 2.1 }], tp);
      wall(b, 'x', a.x0, a.x1, a.z0, iz0, FOUND, a.terrace, [{ a0: 13.0, a1: 13.16, y0: 2.0, y1: 3.2 }, { a0: 13.0, a1: 13.16, y0: WALK + 0.8, y1: WALK + 2.0 }], tp);
      wall(b, 'z', iz0, iz1, a.x0, ix0, FOUND, a.terrace, [{ a0: -40.5, a1: -39.4, y0: 0, y1: 2.2 }, sl(WALK + 0.8)], tp);
      wall(b, 'z', iz0, iz1, ix1, a.x1, FOUND, a.terrace, [sl(2.0), sl(WALK + 0.8)], tp);
      b.with({ label: lab('towerVault', room) }, () => {
        vaultFill(b, ix0, ix1, iz0, iz1, pointedVault('z', iz0, iz1, 3.9, 5.4), WALK, 6, 10);
        vaultFill(b, ix0, ix1, iz0, iz1, pointedVault('z', iz0, iz1, WALK + 2.6, WALK + 4.0), a.terrace, 6, 10, (x, z) => x < ix0 + 0.8 && z < iz0 + 0.8);
      });
    });
    b.with({ kind: K.RUBBLE, color: RUBBLE, label: lab('terrace', room) }, () => crenRect(b, a.x0, a.z0, a.x1, a.z1, a.terrace));
    b.with({ label: lab('quoins', room) }, () => {
      for (const [qx, qz, sx, sz] of [[a.x0, a.z0, -1, -1], [a.x1, a.z0, 1, -1], [a.x0, a.z1, -1, 1], [a.x1, a.z1, 1, 1]]) quoins(b, qx, qz, sx, sz, 0, a.terrace);
    });
    b.with({ kind: K.TIMBER, color: P.timberDark, label: lab('ladder', room) }, () => ladder(b, ix0 + 0.4, WALK, iz0 + 1.3, ix0 + 0.4, a.terrace - 0.1, iz0 + 0.4, 0.42));
    // the pointed arch joining the tower to the curtain; parapets along its top
    b.with({ kind: K.RUBBLE, color: RUBBLE, label: lab('bridge', room) }, () => {
      wall(b, 'z', BRIDGE.z0, BRIDGE.z1, BRIDGE.x0, BRIDGE.x1, FOUND, WALK, [{ a0: BRIDGE.z0, a1: BRIDGE.z1, y0: FOUND, y1: BRIDGE.apex, arch: 'pointed', rise: BRIDGE.rise }], tp);
      for (const [c0, c1] of [[BRIDGE.x0, BRIDGE.x0 + 0.45], [BRIDGE.x1 - 0.45, BRIDGE.x1]]) {
        cren(b, 'z', BRIDGE.z0, BRIDGE.z1, c0, c1, WALK, { base: PARA.base, mh: PARA.mh, mw: 0.7, gw: 0.45 });
      }
    });
    // the well, with a pulley frame over it
    b.with({ label: lab('well', room) }, () => {
      b.with({ kind: K.STONE, color: ASHLAR }, () => b.ring(WELL.x, WELL.z, WELL.r, WELL.r + 0.32, 0, 0.8, 16));
      b.with({ kind: K.WATER, color: 0x4a5a5c }, () => b.cylinder(WELL.x, WELL.z, WELL.r, 0.1, 0.14, 16));
      b.with({ kind: K.TIMBER, color: P.timber }, () => {
        for (const dz of [-0.95, 0.95]) b.box(WELL.x - 0.08, 0.8, WELL.z + dz - 0.08, WELL.x + 0.08, 2.6, WELL.z + dz + 0.08);
        b.box(WELL.x - 0.08, 2.6, WELL.z - 1.03, WELL.x + 0.08, 2.75, WELL.z + 1.03);
        b.hcyl('x', WELL.x, 2.45, WELL.z, 0.2, 0.08, 14);
      });
      b.with({ kind: K.PLAIN, color: 0x6e604c }, () => b.box(WELL.x - 0.012, 1.2, WELL.z + 0.19, WELL.x + 0.012, 2.45, WELL.z + 0.21));
      b.with({ kind: K.TIMBER, color: 0x8a6a44 }, () => tub(b, WELL.x, 0.86, WELL.z + 0.2, 0.17, 0.3));
    });
    b.with({ kind: K.GROUND, color: EARTH, label: lab('albarrana', room) }, () => b.box(ix0, -0.2, iz0, ix1, 0.02, iz1));
  });
}

function annex(b) {
  const a = ANNEX;
  const t = a.t;
  const r = a.r;
  b.with({ kind: K.RUBBLE, color: RUBBLE, group: G.annex, label: lab('annex', 'annex') }, () => {
    b.box(a.x0, FOUND, a.z0 + r, a.x0 + t, a.h, a.z1); // west
    b.box(a.x0 + r, FOUND, a.z0, a.x1 - r, a.h, a.z0 + t); // north
    b.box(a.x1 - t, FOUND, a.z0 + r, a.x1, a.h, ALB.z0); // east, up to the tower
    b.ring(a.x0 + r, a.z0 + r, r - t, r, FOUND, a.h, 6, Math.PI, Math.PI * 1.5);
    b.ring(a.x1 - r, a.z0 + r, r - t, r, FOUND, a.h, 6, Math.PI * 1.5, Math.PI * 2);
  });
}

function court(b) {
  // a cooking fire, firewood against the north curtain, a trough by the keep
  b.with({ group: G.court, label: lab('hearth', 'court') }, () => {
    const [hx, hz] = [-6.5, -24.5];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      lump(b, hx + Math.cos(a) * 0.62, 0.05, hz + Math.sin(a) * 0.62, 0.16, 0.12, 0.13, 0x9a8f7c, K.STONE);
    }
    b.with({ kind: K.EMIT, color: P.ember }, () => b.cylinder(hx, hz, 0.42, -0.02, 0.08, 10));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      beam(b, v3(hx - 0.7, 0, hz - 0.4), v3(hx, 1.25, hz), 0.04, 0.04);
      beam(b, v3(hx + 0.7, 0, hz - 0.4), v3(hx, 1.25, hz), 0.04, 0.04);
      beam(b, v3(hx, 0, hz + 0.75), v3(hx, 1.25, hz), 0.04, 0.04);
      lathe(b, v3(hx, 0.38, hz), 'y', [[0.15, 0], [0.26, 0.12], [0.25, 0.32], [0.2, 0.36]], 12);
    });
  });
  b.with({ group: G.court, label: lab('woodstack', 'court') }, () => {
    woodpile(b, 3.0, 8.5, IN.z0 + 0.1, IN.z0 + 1.1, 1.3);
    log(b, v3(-8.05, 0.2, -22.7), v3(-8.05, 0.2, -24.5), 0.2); // a log to sit on by the fire
  });
  b.with({ group: G.court, label: lab('tether', 'court') }, () => {
    b.with({ kind: K.METAL, color: P.iron }, () => lathe(b, v3(-4.4, 1.3, KEEP.z0 - 0.04), 'z', [[0.07, 0], [0.07, 0.04]], 10));
  });
  b.with({ group: G.court, label: lab('trough', 'court') }, () => {
    b.with({ kind: K.STONE, color: ASHLAR }, () => {
      b.box(-9.6, 0, -9.0, -7.0, 0.12, -8.2);
      b.box(-9.6, 0.12, -9.0, -7.0, 0.6, -8.88);
      b.box(-9.6, 0.12, -8.32, -7.0, 0.6, -8.2);
      b.box(-9.6, 0.12, -8.88, -9.48, 0.6, -8.32);
      b.box(-7.12, 0.12, -8.88, -7.0, 0.6, -8.32);
    });
    b.with({ kind: K.WATER, color: P.water }, () => b.box(-9.48, 0.12, -8.88, -7.12, 0.5, -8.32));
  });
}

function spring(b) {
  const { x, z } = SPRING;
  const gy = groundY(x, z);
  b.with({ group: G.spring, label: lab('spring', 'spring') }, () => {
    // a shallow pool where the water rises, ringed with stones and rushes
    b.with({ kind: K.WATER, color: P.water }, () => {
      const poly = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        poly.push([x + Math.cos(a) * 1.5, z + Math.sin(a) * 1.05]);
      }
      b.prism(poly, gy - 0.3, gy + 0.05);
    });
    for (let i = 0; i < 8; i++) boulder(b, x - 2.4 + (i % 4) * 0.4, gy, z - 1.2 + Math.floor(i / 4) * 2.5, 0.3 + (i % 3) * 0.08, 30 + i, 0xb3a68a);
    for (let i = 0; i < 10; i++) tuft(b, x + Math.cos(i * 1.7) * 2.4, gy, z + Math.sin(i * 1.7) * 1.8, 0.7, 60 + i, 0x5f7a3c);
  });
  b.with({ group: G.spring, label: lab('trough', 'spring') }, () => {
    const x0 = x + 2.6;
    const z0 = z - 1.6;
    b.with({ kind: K.STONE, color: ASHLAR }, () => {
      b.box(x0, gy - 0.1, z0, x0 + 0.8, gy + 0.12, z0 + 3.6);
      b.box(x0, gy + 0.12, z0, x0 + 0.12, gy + 0.62, z0 + 3.6);
      b.box(x0 + 0.68, gy + 0.12, z0, x0 + 0.8, gy + 0.62, z0 + 3.6);
      b.box(x0, gy + 0.12, z0, x0 + 0.8, gy + 0.62, z0 + 0.12);
      b.box(x0, gy + 0.12, z0 + 3.48, x0 + 0.8, gy + 0.62, z0 + 3.6);
    });
    b.with({ kind: K.WATER, color: P.water }, () => b.box(x0 + 0.12, gy + 0.12, z0 + 0.12, x0 + 0.68, gy + 0.52, z0 + 3.48));
  });
}

// keep clear of the walls, the track and the spring
function clear(x, z) {
  if (x > OUT.x0 - 7 && x < OUT.x1 + 7 && z > ANNEX.z0 - 7 && z < 4) return false;
  if (x < OUT.x0 && Math.abs(z - trackZ(x)) < 4) return false;
  if (Math.hypot(x - SPRING.x, z - SPRING.z) < 7) return false;
  return z < -1.5;
}

function landscape(b) {
  const r = rng(91);
  const place = (n, fn) => {
    let k = 0;
    for (let tries = 0; k < n && tries < n * 30; tries++) {
      const x = TERRAIN.x0 + 6 + r() * (TERRAIN.x1 - TERRAIN.x0 - 12);
      const z = TERRAIN.z0 + 6 + r() * (-TERRAIN.z0 - 8);
      if (!clear(x, z)) continue;
      fn(x, z, groundY(x, z), k++);
    }
  };
  // holm oaks and wild olives scattered over the pasture
  b.with({ group: G.land, label: lab('holmOak') }, () => place(16, (x, z, gy, i) => tree(b, x, gy, z, 5.5 + r() * 3, 200 + i, { leaf: 0x4e6234, bark: 0x5a4c3e, lean: 0.05, lumps: 12 })));
  b.with({ group: G.land, label: lab('wildOlive') }, () => place(10, (x, z, gy, i) => tree(b, x, gy, z, 3.5 + r() * 1.5, 300 + i, { leaf: 0x8a9670, bark: 0x6a6052, lean: 0.12, lumps: 8 })));
  b.with({ group: G.land, label: lab('lentisk') }, () => place(30, (x, z, gy, i) => bush(b, x, gy, z, 0.9 + r() * 0.7, 400 + i, 0x55683a)));
  b.with({ group: G.land, label: lab('palmetto') }, () => place(24, (x, z, gy, i) => {
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2 + i;
      b.with({ kind: K.LEAF, color: 0x6f8a4a }, () => beam(b, v3(x, gy, z), v3(x + Math.cos(a) * 0.7, gy + 0.75, z + Math.sin(a) * 0.7), 0.16, 0.02));
    }
  }));
  b.with({ group: G.land, label: lab('thistle') }, () => place(140, (x, z, gy, i) => tuft(b, x, gy, z, 0.35 + r() * 0.45, 500 + i, r() < 0.5 ? 0x8a9450 : 0xa8a060)));
  // a few tufts along the wall feet and in the courtyard corners
  b.with({ group: G.terrain, label: lab('thistle') }, () => {
    for (let i = 0; i < 40; i++) {
      const side = i % 4;
      const t = r();
      const x = side < 2 ? OUT.x0 - 0.5 - r() * 1.5 : OUT.x1 + 0.5 + r() * 1.5;
      const z = OUT.z0 + 2 + t * (Math.abs(OUT.z0) - 4);
      if (side % 2 && Math.abs(z - trackZ(x)) < 3) continue;
      tuft(b, x, groundY(x, z), z, 0.3 + r() * 0.3, 700 + i, 0x8a9450);
    }
  });
}
