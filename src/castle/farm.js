import { K, P } from '../geom/kinds.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { lathe, tub, stool, log } from '../geom/props.js';
import { rng, blob, mound } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { groundY } from './terrain.js';
import { BUTTS } from './layout.js';

// The home farm in the field beyond the ditch: a byre and paddock for the
// cows, a pigsty, geese on a pond, goats on the rocks and a dovecote; and,
// nearer the track, the butts where the garrison's archers practise.
// None of it is drawn from a particular place: it is [[conj]] throughout.

export const FARM_AT = {
  byre: { x0: 61.0, x1: 69.0, z0: -39.2, z1: -35.6 },
  paddock: { x0: 60.4, x1: 71.0, z0: -35.4, z1: -27.4 },
  sty: { x0: 54.0, x1: 59.2, z0: -39.0, z1: -33.2 },
  pond: { x: 56.4, z: -26.4 },
  dovecote: { x: 68.4, z: -18.6, r: 1.5 },
  butt: { x: BUTTS.targetX, z: BUTTS.z },
};
// keep scattered boulders and gorse off these
export const FARM_CLEAR = [
  [60, 71.5, -39.5, -27],
  [53.6, 59.6, -39.5, -32.8],
  [53.8, 59.4, -29.2, -23.6],
  [66.4, 70.4, -20.6, -16.6],
  [56.5, 71.5, -11.5, -6.5],
];

const F = (key) => ({ group: G.farm, label: lab(key, 'farm') });
const gy = (x, z) => groundY(x, z);

/** A run of wattle hurdles between two points, following the ground. */
function hurdles(b, xa, za, xb, zb, gaps = []) {
  const len = Math.hypot(xb - xa, zb - za);
  const n = Math.max(1, Math.round(len / 1.8));
  for (let k = 0; k < n; k++) {
    if (gaps.includes(k)) continue;
    const t0 = k / n;
    const t1 = (k + 1) / n - 0.02;
    const x0 = xa + (xb - xa) * t0;
    const z0 = za + (zb - za) * t0;
    const x1 = xa + (xb - xa) * t1;
    const z1 = za + (zb - za) * t1;
    const y0 = gy(x0, z0);
    const y1 = gy(x1, z1);
    const nx = ((zb - za) / len) * 0.05;
    const nz = (-(xb - xa) / len) * 0.05;
    b.with({ kind: K.WATTLE, color: 0x8a7550 }, () => b.loft(
      [v3(x0 - nx, y0 - 0.2, z0 - nz), v3(x1 - nx, y1 - 0.2, z1 - nz), v3(x1 + nx, y1 - 0.2, z1 + nz), v3(x0 + nx, y0 - 0.2, z0 + nz)],
      [v3(x0 - nx, y0 + 1.0, z0 - nz), v3(x1 - nx, y1 + 1.0, z1 - nz), v3(x1 + nx, y1 + 1.0, z1 + nz), v3(x0 + nx, y0 + 1.0, z0 + nz)],
    ));
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(x0 - 0.06, y0 - 0.3, z0 - 0.06, x0 + 0.06, y0 + 1.15, z0 + 0.06));
  }
}

/** A dry-stone wall, level-topped in steps, between two points along x or z. */
function drystone(b, axis, a0, a1, c, h) {
  const n = Math.ceil(Math.abs(a1 - a0) / 1.2);
  for (let k = 0; k < n; k++) {
    const s0 = a0 + ((a1 - a0) * k) / n;
    const s1 = a0 + ((a1 - a0) * (k + 1)) / n;
    const [x, z] = axis === 'x' ? [(s0 + s1) / 2, c] : [c, (s0 + s1) / 2];
    const y = gy(x, z);
    b.with({ kind: K.STONE, color: 0xa8a08c }, () => {
      if (axis === 'x') b.box(Math.min(s0, s1), y - 0.3, c - 0.3, Math.max(s0, s1), y + h, c + 0.3);
      else b.box(c - 0.3, y - 0.3, Math.min(s0, s1), c + 0.3, y + h, Math.max(s0, s1));
    });
  }
}

export function farm(b) {
  byre(b);
  sty(b);
  pond(b);
  dovecote(b);
  butts(b);
}

// ---------------------------------------------------------------------------
function byre(b) {
  const { x0, x1, z0, z1 } = FARM_AT.byre;
  const fl = gy(x0, z0) + 0.06; // a level floor on a stone plinth
  FARM_AT.byre.floor = fl;
  const zm = (z0 + z1) / 2;
  b.with(F('byre'), () => {
    b.with({ kind: K.STONE, color: 0xa8a08c }, () => b.box(x0 - 0.2, gy(x1, z0) - 0.3, z0 - 0.2, x1 + 0.2, fl, z1 + 0.15));
    b.with({ kind: K.GROUND, color: 0x9a8462 }, () => b.box(x0, fl, z0, x1, fl + 0.02, z1));
    b.with({ kind: K.STRAW, color: 0xc8b070 }, () => b.box(x0 + 0.2, fl + 0.02, z0 + 0.2, x1 - 0.2, fl + 0.06, z0 + 2.2));
    // a back wall of wattle and daub, boarded ends, posts in front
    b.with({ kind: K.WATTLE, color: 0x9a8662 }, () => b.box(x0, fl, z0, x1, fl + 2.1, z0 + 0.12));
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      for (const x of [x0, x1 - 0.1]) b.loft([v3(x, fl, z0), v3(x + 0.1, fl, z0), v3(x + 0.1, fl, z1), v3(x, fl, z1)],
        [v3(x, fl + 2.1, z0), v3(x + 0.1, fl + 2.1, z0), v3(x + 0.1, fl + 2.1, z1), v3(x, fl + 2.1, z1)]);
    });
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (let x = x0; x <= x1 + 0.01; x += 2) b.box(x - 0.1, fl, z1 - 0.1, x + 0.1, fl + 2.3, z1 + 0.1);
      b.box(x0 - 0.1, fl + 2.15, z1 - 0.12, x1 + 0.1, fl + 2.35, z1 + 0.12);
      // gable posts and ridge
      for (const x of [x0 + 0.05, x1 - 0.05]) b.box(x - 0.08, fl + 2.1, zm - 0.08, x + 0.08, fl + 3.7, zm + 0.08);
      b.box(x0 - 0.3, fl + 3.55, zm - 0.1, x1 + 0.3, fl + 3.75, zm + 0.1);
    });
    // a manger along the back
    b.with({ kind: K.TIMBER, color: P.oak }, () => b.box(x0 + 0.3, fl + 0.5, z0 + 0.15, x1 - 0.3, fl + 0.8, z0 + 0.6));
    b.with({ kind: K.STRAW, color: 0xbfa968 }, () => b.box(x0 + 0.35, fl + 0.75, z0 + 0.2, x1 - 0.35, fl + 0.85, z0 + 0.55));
  });
  b.with({ ...F('byre'), kind: K.STRAW, color: 0xb59a5c, capKind: K.STRAW }, () => {
    // thatch: the back slope down low, the front kept high to show the cattle
    b.slab(v3(x0 - 0.5, fl + 3.8, zm), v3(x1 + 0.5, fl + 3.8, zm), v3(x1 + 0.5, fl + 1.8, z0 - 0.6), v3(x0 - 0.5, fl + 1.8, z0 - 0.6), 0.3);
    b.slab(v3(x0 - 0.5, fl + 3.8, zm), v3(x1 + 0.5, fl + 3.8, zm), v3(x1 + 0.5, fl + 2.55, z1 + 0.5), v3(x0 - 0.5, fl + 2.55, z1 + 0.5), 0.3);
  });
  // the paddock fence, with a gap for the gate
  const pd = FARM_AT.paddock;
  b.with(F('paddock'), () => {
    hurdles(b, pd.x0, pd.z1, pd.x1, pd.z1, [1]);
    hurdles(b, pd.x1, pd.z1, pd.x1, pd.z0);
    hurdles(b, pd.x0, pd.z0, pd.x0, pd.z1);
    // the gate hurdle swung open
    const gx = pd.x0 + 1.8;
    const gz = pd.z1 + 0.15;
    const g0 = gy(gx, gz);
    b.with({ kind: K.WATTLE, color: 0x8a7550 }, () => b.loft([v3(gx, g0, gz), v3(gx + 0.1, g0, gz), v3(gx + 0.1, g0, gz + 1.6), v3(gx, g0, gz + 1.6)],
      [v3(gx, g0 + 1.0, gz), v3(gx + 0.1, g0 + 1.0, gz), v3(gx + 0.1, g0 + 1.0, gz + 1.6), v3(gx, g0 + 1.0, gz + 1.6)]));
    // a water trough and a hay rick
    b.with({ kind: K.TIMBER, color: P.oak }, () => b.box(69.0, gy(69.6, -30) - 0.1, -31.2, 70.2, gy(69.6, -30) + 0.5, -30.6));
    b.with({ kind: K.WATER, color: P.water }, () => b.box(69.1, gy(69.6, -30) + 0.45, -31.1, 70.1, gy(69.6, -30) + 0.47, -30.7));
    mound(b, 62.4, gy(62.4, -33.4), -33.4, 1.8, 1.7, 1.6, 31, 0xc8b070, K.STRAW);
  });
  // a milking stool and pail by the first stall, and the muck heap
  b.with(F('byre'), () => {
    stool(b, x0 + 3.15, fl, z0 + 1.75, 0.3);
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(x0 + 2.85, fl, z0 + 2.0), 'y', [[0.12, 0], [0.15, 0.3]], 10));
    b.with({ kind: K.PLAIN, color: 0xf2eee2 }, () => b.cylinder(x0 + 2.85, z0 + 2.0, 0.13, fl + 0.24, fl + 0.26, 10));
    mound(b, x1 + 1.4, gy(x1 + 1.4, z0 + 1.0), z0 + 1.0, 2.0, 0.7, 1.6, 33, 0x6a5238, K.GROUND);
  });
}

// ---------------------------------------------------------------------------
function sty(b) {
  const { x0, x1, z0, z1 } = FARM_AT.sty;
  b.with(F('pigsty'), () => {
    drystone(b, 'x', x0, x1, z1, 0.95);
    drystone(b, 'z', z0, z1, x1, 0.95);
    drystone(b, 'z', z0, z1, x0, 0.95);
    drystone(b, 'x', x0, x1, z0, 1.4);
    // the sty hut at the back: stone walls and a thatched lean-to
    const hx = x0 + 3.0;
    const hz = z0 + 2.0;
    drystone(b, 'z', z0, hz, hx, 1.4);
    const y0 = gy(x0, z0);
    b.with({ kind: K.STRAW, color: 0xb59a5c, capKind: K.STRAW }, () => b.slab(v3(x0 - 0.4, y0 + 1.9, z0 - 0.4), v3(hx + 0.4, y0 + 1.9, z0 - 0.4), v3(hx + 0.4, y0 + 1.25, hz + 0.4), v3(x0 - 0.4, y0 + 1.25, hz + 0.4), 0.25));
    b.with({ kind: K.STRAW, color: 0xc8b070 }, () => b.box(x0 + 0.3, y0 - 0.05, z0 + 0.3, hx - 0.3, y0 + 0.1, hz - 0.2));
    // a wallow of trodden mud, and the trough
    b.with({ kind: K.GROUND, color: 0x6e5a40 }, () => blob(b, x0 + 3.6, gy(x0 + 3.6, z1 - 2.4), z1 - 2.4, 1.6, 0.03, 1.2, 81, { smooth: true, flat: 0, points: 16 }));
    b.with({ kind: K.WATER, color: 0x8a8070 }, () => blob(b, x0 + 3.8, gy(x0 + 3.8, z1 - 2.3) + 0.01, z1 - 2.3, 0.8, 0.03, 0.5, 82, { smooth: true, flat: 0, points: 14 }));
    const ty = gy(x0 + 1.6, z1 - 0.7);
    b.with({ kind: K.TIMBER, color: 0x7a5a3c }, () => {
      b.box(x0 + 0.8, ty - 0.1, z1 - 0.95, x0 + 2.6, ty + 0.3, z1 - 0.45);
    });
    b.with({ kind: K.PLAIN, color: 0x9a8a5a }, () => b.box(x0 + 0.9, ty + 0.2, z1 - 0.88, x0 + 2.5, ty + 0.25, z1 - 0.52)); // swill
  });
  FARM_AT.trough = [x0 + 1.7, z1 - 0.7];
}

// ---------------------------------------------------------------------------
function pond(b) {
  const { x, z } = FARM_AT.pond;
  const y = gy(x, z);
  FARM_AT.pond.y = y;
  b.with(F('goosePond'), () => {
    b.with({ kind: K.GROUND, color: 0x8c7a5e }, () => blob(b, x, y, z, 2.8, 0.015, 2.1, 91, { smooth: true, flat: 0, points: 18 }));
    b.with({ kind: K.WATER, color: 0x8aa3a4 }, () => blob(b, x, y, z, 2.2, 0.035, 1.55, 92, { smooth: true, flat: 0, points: 18 }));
    // reeds at one end
    const r = rng(93);
    b.with({ kind: K.LEAF, color: 0x7d8a48 }, () => {
      for (let i = 0; i < 26; i++) {
        const a = -0.6 + r() * 1.2;
        const px = x + Math.cos(a) * (2.0 + r() * 0.5);
        const pz = z + Math.sin(a) * (1.4 + r() * 0.4);
        beam(b, v3(px, y, pz), v3(px + (r() - 0.5) * 0.15, y + 0.6 + r() * 0.5, pz + (r() - 0.5) * 0.15), 0.025, 0.01);
      }
    });
    // a goose house of wattle
    b.with({ kind: K.WATTLE, color: 0x8a7550 }, () => b.box(54.0, gy(54.5, -29) - 0.1, -29.6, 55.4, gy(54.5, -29) + 0.8, -28.4));
    b.with({ kind: K.STRAW, color: 0xb59a5c }, () => b.slab(v3(53.8, gy(54.5, -29) + 1.0, -29.8), v3(55.6, gy(54.5, -29) + 1.0, -29.8), v3(55.6, gy(54.5, -29) + 0.7, -28.2), v3(53.8, gy(54.5, -29) + 0.7, -28.2), 0.1));
    b.with({ kind: K.PLAIN, color: P.void }, () => b.box(54.5, gy(54.5, -29), -28.42, 54.95, gy(54.5, -29) + 0.45, -28.38));
  });
}

// ---------------------------------------------------------------------------
function dovecote(b) {
  const { x, z, r } = FARM_AT.dovecote;
  const y = gy(x + r, z) - 0.2;
  const h = 4.2;
  b.with(F('dovecote'), () => {
    b.with({ kind: K.STONE, color: 0xc2b89c }, () => b.cylinder(x, z, r, y, y + h, 20));
    b.with({ kind: K.STONE, color: P.ashlar }, () => b.ring(x, z, r - 0.02, r + 0.12, y + h - 1.0, y + h - 0.85, 20)); // string course for the rats
    b.with({ kind: K.ROOF, color: 0x8f8678 }, () => lathe(b, v3(x, y + h, z), 'y', [[r + 0.25, 0], [r * 0.25, 1.6], [0.35, 1.7]], 20));
    // the little lantern on top where the doves go in and out
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        b.box(x + Math.cos(a) * 0.3 - 0.04, y + h + 1.7, z + Math.sin(a) * 0.3 - 0.04, x + Math.cos(a) * 0.3 + 0.04, y + h + 2.15, z + Math.sin(a) * 0.3 + 0.04);
      }
    });
    b.with({ kind: K.ROOF, color: 0x8f8678 }, () => lathe(b, v3(x, y + h + 2.15, z), 'y', [[0.5, 0], [0.001, 0.5]], 12));
    // flight holes and the low door
    b.with({ kind: K.PLAIN, color: P.void }, () => {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45;
        obox(b, x + Math.cos(a) * (r + 0.01), y + h - 0.6, z + Math.sin(a) * (r + 0.01), 0.14, 0.14, 0.05, -a + Math.PI / 2);
      }
    });
    b.with({ kind: K.TIMBER, color: 0x5e4a34 }, () => obox(b, x + Math.cos(Math.PI * 0.6) * (r + 0.02), y + 0.95, z + Math.sin(Math.PI * 0.6) * (r + 0.02), 0.7, 1.5, 0.06, -Math.PI * 0.6 + Math.PI / 2));
    // doves sitting on the roof
    const rr = rng(71);
    for (let i = 0; i < 7; i++) {
      const a = rr() * Math.PI * 2;
      const k = 0.2 + rr() * 0.5;
      const px = x + Math.cos(a) * (r + 0.25 - k * (r - 0.1));
      const pz = z + Math.sin(a) * (r + 0.25 - k * (r - 0.1));
      const py = y + h + k * 1.55 + 0.08;
      const col = i % 3 ? 0x9a9ea6 : 0xe8e6e0;
      b.with({ kind: K.FUR, color: col }, () => {
        b.with({}, () => obox(b, px, py, pz, 0.1, 0.1, 0.18, a + 1.2));
        obox(b, px + Math.cos(a + 1.2 + Math.PI / 2) * 0.08, py + 0.07, pz - Math.sin(a + 1.2 + Math.PI / 2) * 0.08, 0.07, 0.07, 0.07, a);
      });
    }
  });
  FARM_AT.dovecote.top = y + h + 1.9;
}

// ---------------------------------------------------------------------------
function butts(b) {
  const { x, z } = FARM_AT.butt;
  const y = gy(x, z);
  b.with({ group: G.farm, label: lab('butts', 'farm', 'butts') }, () => {
    // a bank of turf with a straw target set in its face
    b.with({ kind: K.GROUND, color: 0x9aa868, capKind: K.CUT_EARTH }, () => b.loft(
      [v3(x - 0.8, y - 0.2, z - 1.6), v3(x + 1.2, y - 0.2, z - 1.6), v3(x + 1.2, y - 0.2, z + 1.6), v3(x - 0.8, y - 0.2, z + 1.6)],
      [v3(x - 0.2, y + 1.9, z - 1.2), v3(x + 0.6, y + 1.9, z - 1.2), v3(x + 0.6, y + 1.9, z + 1.2), v3(x - 0.2, y + 1.9, z + 1.2)],
    ));
    const tx = x - 0.62;
    const ty = y + 1.1;
    BUTTS.face = [tx - 0.1, ty, z];
    const rings = [[0.62, 0xd8c890], [0.5, 0xf0ece0], [0.36, 0x2e2a28], [0.22, 0xf0ece0], [0.1, 0xa83a2a]];
    rings.forEach(([rr, col], i) => b.with({ kind: i ? K.PLAIN : K.SKEP, color: col }, () => lathe(b, v3(tx - i * 0.012, ty, z), v3(-1, 0.18, 0), [[rr, 0], [rr, 0.12]], 20)));
    // the shooting mark, a peg in the turf
    const sx = BUTTS.shootX;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(sx - 0.05, gy(sx, z) - 0.2, z - 2.0, sx + 0.05, gy(sx, z) + 0.6, z - 1.9));
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      // a stand for spare bows and a basket of arrows
      b.box(sx - 1.6, gy(sx - 1.4, z) - 0.1, z + 1.6, sx - 1.5, gy(sx - 1.4, z) + 1.4, z + 1.7);
      b.box(sx - 1.6, gy(sx - 1.4, z) + 1.3, z + 1.6, sx - 0.6, gy(sx - 1.4, z) + 1.38, z + 1.7);
    });
    b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(sx - 0.9, gy(sx - 0.9, z + 1.3), z + 1.3), 'y', [[0.18, 0], [0.22, 0.4]], 10));
    b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => {
      for (let i = 0; i < 8; i++) beam(b, v3(sx - 0.95 + (i % 3) * 0.05, gy(sx - 0.9, z + 1.3) + 0.3, z + 1.25 + (i % 2) * 0.08), v3(sx - 0.9 + (i % 4) * 0.04, gy(sx - 0.9, z + 1.3) + 0.95, z + 1.3 + (i % 3) * 0.04), 0.012, 0.012);
    });
  });
  void tub;
  void log;
}
