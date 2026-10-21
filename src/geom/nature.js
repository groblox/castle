import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { K } from './kinds.js';
import { beam, v3 } from './shapes.js';
import { lathe } from './props.js';

// Irregular natural forms (boulders, bushes, tufts, trees, heaps), all built
// as convex solids so the cut slices them like the masonry.

/** Small seeded random generator, so the scene is the same on every load. */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Convex lump through jittered points on an ellipsoid centred at (x, y, z)
 * with semi-axes sx, sy, sz. opts.smooth gives it ellipsoid normals (soft,
 * for foliage and heaps); otherwise it is faceted like broken rock.
 * opts.flat cuts the underside flat at that fraction of sy below the centre.
 */
export function blob(b, x, y, z, sx, sy, sz, seed = 1, opts = {}) {
  const r = rng(seed);
  const n = opts.points ?? 16;
  const flat = opts.flat ?? 0.3;
  const jit = opts.jitter ?? 0.25;
  const pts = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const yy = 1 - (2 * (i + 0.5)) / n;
    const rad = Math.sqrt(1 - yy * yy);
    const a = i * ga + r() * 0.6;
    const k = 1 - jit + jit * r();
    let py = yy * sy * k;
    if (py < -flat * sy) py = -flat * sy;
    pts.push(v3(x + Math.cos(a) * rad * sx * k, y + py, z + Math.sin(a) * rad * sz * k));
  }
  const geo = new ConvexGeometry(pts);
  const p = geo.attributes.position;
  const faces = [];
  const c = v3(x, y, z);
  const nrm = (q) => v3((q.x - c.x) / (sx * sx), (q.y - c.y) / (sy * sy), (q.z - c.z) / (sz * sz)).normalize();
  for (let i = 0; i < p.count; i += 3) {
    const tri = [0, 1, 2].map((k) => v3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
    faces.push(opts.smooth ? tri.map((q) => ({ p: q, n: q.y <= y - flat * sy + 1e-3 ? v3(0, -1, 0) : nrm(q) })) : tri);
  }
  geo.dispose();
  b.solid(faces, opts);
}

/** A boulder sitting on ground level gy. */
export function boulder(b, x, gy, z, s, seed, color = 0x9d978a) {
  b.with({ kind: K.ROCK, color }, () => blob(b, x, gy + s * 0.25, z, s * (0.9 + (seed % 3) * 0.15), s * 0.7, s, seed, { points: 14, jitter: 0.3, flat: 0.45 }));
}

/** Bush: a cluster of soft foliage lumps. */
export function bush(b, x, gy, z, s, seed, color = 0x5f7038, kind = K.LEAF) {
  const r = rng(seed + 11);
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = s * 0.45 * r();
    const sz = s * (0.45 + 0.35 * r());
    const tint = new THREE.Color(color).multiplyScalar(0.85 + 0.3 * r());
    b.with({ kind, color: tint.getHex() }, () =>
      blob(b, x + Math.cos(a) * d, gy + sz * 0.55, z + Math.sin(a) * d, sz, sz * 0.8, sz, seed * 7 + i, { smooth: true, points: 14, flat: 0.6 }));
  }
}

/** Gorse: a dark bush with yellow flowers dabbed on. */
export function gorse(b, x, gy, z, s, seed) {
  bush(b, x, gy, z, s, seed, 0x4f5e30);
  const r = rng(seed + 5);
  b.with({ kind: K.PLAIN, color: 0xe2b93a }, () => {
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      const h = 0.3 + 0.5 * r();
      blob(b, x + Math.cos(a) * s * 0.55, gy + s * h, z + Math.sin(a) * s * 0.55, s * 0.12, s * 0.08, s * 0.12, seed + i, { points: 8, smooth: true });
    }
  });
}

/** Tussock of coarse grass: a few soft upright clumps. */
export function tuft(b, x, gy, z, h, seed, color = 0x7d8a48) {
  const r = rng(seed + 3);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = h * 0.25 * r();
    const w = h * (0.22 + 0.12 * r());
    const tint = new THREE.Color(color).multiplyScalar(0.88 + 0.25 * r());
    b.with({ kind: K.LEAF, color: tint.getHex() }, () =>
      blob(b, x + Math.cos(a) * d, gy, z + Math.sin(a) * d, w, h * (0.6 + 0.4 * r()), w, seed * 5 + i, { smooth: true, points: 10, flat: 0.0 }));
  }
}

/** Bracken, gone russet in the autumn: a low spreading clump of fronds. */
export function fern(b, x, gy, z, s, seed) {
  const r = rng(seed + 9);
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = s * 0.35 * r();
    const w = s * (0.35 + 0.25 * r());
    const col = new THREE.Color(r() > 0.3 ? 0xa86a36 : 0x8a7a3a).multiplyScalar(0.85 + 0.3 * r());
    b.with({ kind: K.LEAF, color: col.getHex() }, () =>
      blob(b, x + Math.cos(a) * d, gy, z + Math.sin(a) * d, w, s * (0.3 + 0.2 * r()), w * 0.8, seed * 11 + i, { smooth: true, points: 12, flat: 0 }));
  }
}

/**
 * A wind-shaped tree: a leaning, crooked trunk and a crown of foliage lumps
 * swept to leeward (east-north-east, away from the sea to the west).
 */
export function tree(b, x, gy, z, h, seed, opts = {}) {
  const r = rng(seed + 21);
  const lean = opts.lean ?? 0.18;
  const wind = v3(0.9, 0, -0.35).normalize();
  const bark = opts.bark ?? 0x6a5a48;
  const leaf = opts.leaf ?? 0x637a3a;
  let p = v3(x, gy - 0.2, z);
  const tr = h * 0.065;
  const segs = 4;
  b.with({ kind: K.TIMBER, color: bark }, () => {
    for (let i = 0; i < segs; i++) {
      const t = (i + 1) / segs;
      const q = v3(x, gy + h * 0.55 * t, z).addScaledVector(wind, h * lean * t * t).add(v3((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3));
      const r0 = tr * (1.25 - (t - 1 / segs) * 0.6);
      const r1 = tr * (1.25 - t * 0.6);
      lathe(b, p, q.clone().sub(p), [[r0, 0], [r1, p.distanceTo(q) + r1 * 0.5]], 7);
      p = q;
    }
    // a couple of boughs
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2;
      const e = p.clone().add(v3(Math.cos(a) * h * 0.22, h * (0.08 + 0.1 * r()), Math.sin(a) * h * 0.22)).addScaledVector(wind, h * 0.1);
      lathe(b, p, e.clone().sub(p), [[tr * 0.45, 0], [tr * 0.2, p.distanceTo(e)]], 6);
    }
  });
  const top = p.clone().addScaledVector(wind, h * 0.08);
  const n = opts.lumps ?? 10;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = h * 0.28 * r();
    const s = h * (0.2 + 0.1 * r());
    const c = top.clone().add(v3(Math.cos(a) * d, h * (0.02 + 0.14 * r()), Math.sin(a) * d)).addScaledVector(wind, h * 0.12 * r());
    const turn = r();
    const tint = new THREE.Color(leaf).lerp(new THREE.Color(0xb08a3a), turn > 0.6 ? 0.55 : turn * 0.3).multiplyScalar(0.82 + 0.3 * r());
    b.with({ kind: K.LEAF, color: tint.getHex() }, () => blob(b, c.x, c.y, c.z, s * 1.2, s * 0.85, s, seed * 13 + i, { smooth: true, points: 16, flat: 0.5 }));
  }
}

/** Low heap (midden, dung, spoil, sand) with a soft top. */
export function mound(b, x, gy, z, w, h, d, seed, color, kind = K.GROUND) {
  b.with({ kind, color }, () => blob(b, x, gy, z, w / 2, h, d / 2, seed, { smooth: true, points: 18, flat: 0.0, jitter: 0.18 }));
}
