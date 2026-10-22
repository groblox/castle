import { K, P } from '../geom/kinds.js';
import { v3 } from '../geom/shapes.js';
import { rng, blob, boulder, bush, gorse, tuft, fern, tree, mound } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { groundY } from './terrain.js';
import { DITCH, OC_OUT } from './layout.js';
import { FARM_CLEAR } from './farm.js';

// The ground outside the walls: rock breaking through thin turf on the crag,
// gorse, bracken and a few wind-cut thorn trees, the rock-cut ditch with its
// fallen stone and standing water, and the cart track up to the bridge.

const REGIONS = {
  crag: [-61.5, -40.6, -39.5, -0.6],
  north: [-61.5, 71.5, -61.5, -40.8],
  field: [DITCH.x1 + 0.8, 71.5, -39.5, -3.2],
  strip: [OC_OUT.x0 + 0.5, OC_OUT.x1 - 0.5, -39.6, OC_OUT.z0 - 0.4],
  eastStrip: [OC_OUT.x1 + 0.4, DITCH.x0 - 0.4, -39.5, -2.4],
  ditch: [DITCH.x0 + 0.3, DITCH.x1 - 0.3, -39.5, -0.4],
};

// keep the field's boulders and scrub out of the farm's yards and buildings
const clear = (x, z) => FARM_CLEAR.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

function scatter(r, region, n, fn) {
  const [x0, x1, z0, z1] = region;
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * r();
    const z = z0 + (z1 - z0) * r();
    if (region === REGIONS.field && clear(x, z)) continue;
    fn(x, z, i);
  }
}

// lowest ground under a footprint, so things on slopes do not float
function seat(x, z, s) {
  return Math.min(groundY(x - s, z - s), groundY(x + s, z - s), groundY(x - s, z + s), groundY(x + s, z + s), groundY(x, z));
}

export function landscape(b) {
  const r = rng(1290);
  const L = (key) => ({ group: G.terrain, label: lab(key) });

  // ---- rock outcrops and boulders ----------------------------------------
  b.with(L('outcrop'), () => {
    const crop = (x, z, s, seed) => {
      // a main boss with smaller stones heaped round it
      boulder(b, x, seat(x, z, s) - s * 0.35, z, s, seed, 0x99938a);
      const q = rng(seed);
      for (let i = 0; i < 3; i++) {
        const a = q() * Math.PI * 2;
        const d = s * (0.8 + 0.4 * q());
        const xx = x + Math.cos(a) * d;
        const zz = z + Math.sin(a) * d;
        const ss = s * (0.25 + 0.25 * q());
        boulder(b, xx, seat(xx, zz, ss) - ss * 0.2, zz, ss, seed * 3 + i, 0xa39d90);
      }
    };
    crop(-55, -9, 2.6, 1);
    crop(-48.5, -27, 2.0, 2);
    crop(-57.5, -34, 3.2, 3);
    crop(-46, -15.5, 1.4, 4);
    crop(-20, -51, 2.2, 5);
    crop(18, -57, 3.0, 6);
    crop(46, -47, 1.8, 7);
    crop(-48, -55, 2.6, 8);
    crop(63, -24, 1.6, 9);
    scatter(r, REGIONS.crag, 14, (x, z, i) => boulder(b, x, seat(x, z, 0.5) - 0.12, z, 0.35 + 0.5 * r(), 100 + i));
    scatter(r, REGIONS.north, 26, (x, z, i) => boulder(b, x, seat(x, z, 0.5) - 0.12, z, 0.3 + 0.6 * r(), 200 + i));
    scatter(r, REGIONS.field, 8, (x, z, i) => boulder(b, x, seat(x, z, 0.4) - 0.1, z, 0.3 + 0.4 * r(), 300 + i));
  });

  // ---- gorse, bracken, thorn trees -----------------------------------------
  b.with(L('gorse'), () => {
    const g = (x, z, s, seed) => gorse(b, x, seat(x, z, s * 0.5) - 0.1, z, s, seed);
    scatter(r, REGIONS.crag, 10, (x, z, i) => g(x, z, 0.8 + 0.8 * r(), 400 + i));
    scatter(r, REGIONS.north, 22, (x, z, i) => g(x, z, 0.8 + 1.0 * r(), 500 + i));
    scatter(r, REGIONS.field, 7, (x, z, i) => g(x, z, 0.7 + 0.7 * r(), 600 + i));
  });
  b.with(L('bracken'), () => {
    scatter(r, REGIONS.crag, 16, (x, z, i) => fern(b, x, seat(x, z, 0.3), z, 0.7 + 0.5 * r(), 700 + i));
    scatter(r, REGIONS.north, 24, (x, z, i) => fern(b, x, seat(x, z, 0.3), z, 0.7 + 0.6 * r(), 800 + i));
  });
  b.with(L('hawthorn'), () => {
    const t = (x, z, h, seed) => tree(b, x, seat(x, z, 0.3), z, h, seed, { lean: 0.35, leaf: 0x667a3c });
    t(-52.5, -20, 5.5, 1);
    t(-58, -3.5, 4.2, 2);
    t(-30, -56, 6.5, 3);
    t(-8, -59, 5.0, 4);
    t(34, -53, 6.0, 5);
    t(58, -44, 5.2, 6);
    t(66, -30, 4.6, 7);
    t(62, -12, 4.0, 8);
  });

  // ---- grass tufts and weeds -------------------------------------------------
  b.with(L('turf'), () => {
    const tf = (x, z, h, seed) => tuft(b, x, seat(x, z, 0.1), z, h, seed, r() > 0.5 ? 0x7d8a48 : 0x8e9152);
    scatter(r, REGIONS.crag, 40, (x, z, i) => tf(x, z, 0.35 + 0.3 * r(), 900 + i));
    scatter(r, REGIONS.north, 70, (x, z, i) => tf(x, z, 0.35 + 0.35 * r(), 1000 + i));
    scatter(r, REGIONS.field, 40, (x, z, i) => tf(x, z, 0.3 + 0.3 * r(), 1100 + i));
    scatter(r, REGIONS.strip, 50, (x, z, i) => tf(x, z, 0.3 + 0.3 * r(), 1200 + i));
    scatter(r, REGIONS.eastStrip, 16, (x, z, i) => tf(x, z, 0.3 + 0.3 * r(), 1300 + i));
    // nettles and docks along the foot of the outer curtain
    for (let x = OC_OUT.x0 + 1; x < OC_OUT.x1 - 1; x += 1.3 + 2.2 * r()) {
      bush(b, x, -1.5, OC_OUT.z0 - 0.3 - 0.4 * r(), 0.45 + 0.35 * r(), 1400 + Math.floor(x * 10), 0x5c6e34);
    }
    for (let z = -35; z < -3; z += 1.5 + 2.5 * r()) {
      bush(b, OC_OUT.x0 - 0.3 - 0.4 * r(), seat(OC_OUT.x0 - 0.5, z, 0.3), z, 0.4 + 0.3 * r(), 1500 + Math.floor(-z * 10), 0x5c6e34);
      if (z < -8.5) bush(b, OC_OUT.x1 + 0.3 + 0.4 * r(), -1.5, z, 0.4 + 0.3 * r(), 1600 + Math.floor(-z * 10), 0x5c6e34);
    }
  });

  // ---- the ditch: fallen stone, rubbish, standing water ---------------------
  b.with(L('ditch'), () => {
    scatter(r, REGIONS.ditch, 16, (x, z, i) => boulder(b, x, DITCH.y - 0.05, z, 0.25 + 0.45 * r(), 1700 + i, 0xa59e8e));
    scatter(r, REGIONS.ditch, 22, (x, z, i) => tuft(b, x, DITCH.y, z, 0.35 + 0.35 * r(), 1800 + i, 0x7a8646));
    scatter(r, REGIONS.ditch, 8, (x, z, i) => bush(b, x, DITCH.y, z, 0.5 + 0.3 * r(), 1900 + i, 0x5a6c34));
    // rain water lying in the bottom
    const cx = (DITCH.x0 + DITCH.x1) / 2;
    for (const [z0, z1, i] of [[-31, -24.5, 0], [-15, -11, 1], [-6, -3.8, 2]]) {
      const zc = (z0 + z1) / 2;
      const hz = (z1 - z0) / 2;
      // mud round the pool, then the water
      b.with({ kind: K.GROUND, color: 0x8c7a5e }, () => blob(b, cx - 0.2, DITCH.y, zc, 3.0, 0.015, hz + 0.7, 60 + i, { smooth: true, flat: 0, points: 18 }));
      b.with({ kind: K.WATER, color: 0x8aa3a4 }, () => blob(b, cx - 0.2, DITCH.y, zc, 2.4, 0.03, hz, 70 + i, { smooth: true, flat: 0, points: 18 }));
    }
  });

  // ---- cart track from the bridge out across the field ----------------------
  b.with({ ...L('track'), kind: K.GROUND, color: 0xab9474 }, () => {
    const x0 = DITCH.x1 + 1.5;
    const x1 = 72;
    const seg = 4;
    for (let i = 0; i < seg; i++) {
      const a = x0 + ((x1 - x0) * i) / seg;
      const c = x0 + ((x1 - x0) * (i + 1)) / seg;
      const ya = groundY(a, -1);
      const yc = groundY(c, -1);
      b.loft(
        [v3(a, ya - 0.05, -2.6), v3(c, yc - 0.05, -2.6), v3(c, yc - 0.05, 0), v3(a, ya - 0.05, 0)],
        [v3(a, ya + 0.025, -2.4), v3(c, yc + 0.025, -2.4), v3(c, yc + 0.025, 0), v3(a, ya + 0.025, 0)],
      );
      // a rut, worn by cart wheels
      b.with({ color: 0x8e7a5c }, () => b.loft(
        [v3(a, ya + 0.02, -1.0), v3(c, yc + 0.02, -1.0), v3(c, yc + 0.02, -0.6), v3(a, ya + 0.02, -0.6)],
        [v3(a, ya + 0.032, -1.0), v3(c, yc + 0.032, -1.0), v3(c, yc + 0.032, -0.6), v3(a, ya + 0.032, -0.6)],
      ));
    }
    // dung and a puddle on the track
    b.with({ kind: K.WATER, color: 0x93a6a2 }, () => {
      const y = groundY(61, -1.5);
      b.box(60, y + 0.03, -1.9, 62.2, y + 0.045, -0.3);
    });
    mound(b, 66.5, groundY(66.5, -1.6) + 0.02, -1.6, 0.35, 0.08, 0.3, 4, 0x6a5238, K.PLAIN);
  });

  // ---- a hurdle fold for sheep on the north slope -----------------------------
  b.with({ ...L('sheepfold'), kind: K.WATTLE, color: 0x8a7550 }, () => {
    const cx = 8;
    const cz = -50;
    const w = 7;
    const d = 5;
    const hurdle = (xa, za, xb, zb) => {
      const ya = groundY(xa, za);
      const yb = groundY(xb, zb);
      const nx = zb - za;
      const nz = -(xb - xa);
      const l = Math.hypot(nx, nz);
      const t = 0.05;
      const ox = (nx / l) * t;
      const oz = (nz / l) * t;
      b.loft(
        [v3(xa - ox, ya - 0.2, za - oz), v3(xb - ox, yb - 0.2, zb - oz), v3(xb + ox, yb - 0.2, zb + oz), v3(xa + ox, ya - 0.2, za + oz)],
        [v3(xa - ox, ya + 1.0, za - oz), v3(xb - ox, yb + 1.0, zb - oz), v3(xb + ox, yb + 1.0, zb + oz), v3(xa + ox, ya + 1.0, za + oz)],
      );
      b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
        for (const [x, z, y] of [[xa, za, ya], [xb, zb, yb]]) b.box(x - 0.06, y - 0.3, z - 0.06, x + 0.06, y + 1.15, z + 0.06);
      });
    };
    const pts = [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % 4];
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 1.8);
      for (let k = 0; k < n; k++) {
        // leave a gap for the gate on the south side
        if (i === 2 && k === 1) continue;
        hurdle(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, ax + ((bx - ax) * (k + 1)) / n - Math.sign(bx - ax) * 0.05, az + ((bz - az) * (k + 1)) / n - Math.sign(bz - az) * 0.05);
      }
    }
    // the gate hurdle leaning open
    const gx = cx + w / 2 - (w / 4) * 1.5;
    const gz = cz + d / 2 + 0.6;
    const gy = groundY(gx, gz);
    b.loft([v3(gx - 0.8, gy, gz), v3(gx + 0.8, gy, gz), v3(gx + 0.8, gy, gz + 0.1), v3(gx - 0.8, gy, gz + 0.1)],
      [v3(gx - 0.8, gy + 0.95, gz + 0.35), v3(gx + 0.8, gy + 0.95, gz + 0.35), v3(gx + 0.8, gy + 0.95, gz + 0.45), v3(gx - 0.8, gy + 0.95, gz + 0.45)]);
  });
}

export const FOLD = { x: 8, z: -50, w: 7, d: 5 };
