import * as THREE from 'three';
import { K, P } from './kinds.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Oriented box: centre, size, rotation about Y (radians). */
export function obox(b, cx, cy, cz, sx, sy, sz, rotY = 0, opts) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const pts = [];
  for (const dy of [-1, 1]) for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const lx = (dx * sx) / 2;
    const lz = (dz * sz) / 2;
    pts.push(V(cx + lx * c + lz * s, cy + (dy * sy) / 2, cz - lx * s + lz * c));
  }
  const [a, bb, cc, d, e, f, g, h] = pts;
  b.solid([[a, bb, cc, d], [e, f, g, h], [a, bb, f, e], [bb, cc, g, f], [cc, d, h, g], [d, a, e, h]], opts);
}

/** Box given by 8 arbitrary corners (bottom 4 then top 4, same order). */
export function hexa(b, bot, top, opts) {
  b.loft(bot, top, opts || {});
}

function archY(t, kind) {
  // t: 0 at centre, 1 at springing. returns 0..1 of rise
  if (kind === 'round') return Math.sqrt(Math.max(0, 1 - t * t));
  if (kind === 'segmental') return Math.max(0, (Math.sqrt(Math.max(0, 4 - t * t)) - Math.sqrt(3)) / (2 - Math.sqrt(3)));
  // two-centred (equilateral) pointed
  return Math.sqrt(Math.max(0, 4 - (t + 1) * (t + 1))) / Math.sqrt(3);
}

/**
 * Wall running along `axis` ('x' or 'z') from a0 to a1, thickness c0..c1,
 * height y0..y1, with openings [{a0,a1,y0,y1,arch,rise}].
 */
export function wall(b, axis, a0, a1, c0, c1, y0, y1, openings = [], opts) {
  const box = (A0, A1, Y0, Y1) => {
    if (A1 - A0 < 1e-4 || Y1 - Y0 < 1e-4) return;
    if (axis === 'x') b.box(A0, Y0, c0, A1, Y1, c1, opts);
    else b.box(c0, Y0, A0, c1, Y1, A1, opts);
  };
  const ops = openings.filter((o) => o.a1 > a0 && o.a0 < a1).sort((p, q) => p.a0 - q.a0);
  let cur = a0;
  for (const o of ops) {
    box(cur, o.a0, y0, y1);
    const oy0 = Math.max(o.y0, y0);
    const oy1 = Math.min(o.y1, y1);
    box(o.a0, o.a1, y0, oy0);
    box(o.a0, o.a1, oy1, y1);
    if (o.arch) {
      const rise = o.rise ?? (o.a1 - o.a0) * 0.6;
      const spring = oy1 - rise;
      const N = 8;
      const w = (o.a1 - o.a0) / 2;
      const mid = (o.a0 + o.a1) / 2;
      for (let k = 0; k < N; k++) {
        const ua = o.a0 + ((o.a1 - o.a0) * k) / N;
        const ub = o.a0 + ((o.a1 - o.a0) * (k + 1)) / N;
        const ya = spring + rise * archY(Math.abs(ua - mid) / w, o.arch);
        const yb = spring + rise * archY(Math.abs(ub - mid) / w, o.arch);
        if (oy1 - Math.min(ya, yb) < 0.01) continue;
        let bot, top;
        if (axis === 'x') {
          bot = [V(ua, ya, c0), V(ub, yb, c0), V(ub, yb, c1), V(ua, ya, c1)];
          top = [V(ua, oy1, c0), V(ub, oy1, c0), V(ub, oy1, c1), V(ua, oy1, c1)];
        } else {
          bot = [V(c0, ya, ua), V(c0, yb, ub), V(c1, yb, ub), V(c1, ya, ua)];
          top = [V(c0, oy1, ua), V(c0, oy1, ub), V(c1, oy1, ub), V(c1, oy1, ua)];
        }
        b.loft(bot, top, opts || {});
      }
    }
    cur = o.a1;
  }
  box(cur, a1, y0, y1);
}

/**
 * Crenellated parapet along an axis. Parapet occupies c0..c1.
 */
export function cren(b, axis, a0, a1, c0, c1, y, opts = {}) {
  const base = opts.base ?? 0.9;
  const mh = opts.mh ?? 1.5;
  const mw = opts.mw ?? 1.5;
  const gw = opts.gw ?? 0.8;
  const box = (A0, A1, Y0, Y1) => {
    if (axis === 'x') b.box(A0, Y0, c0, A1, Y1, c1, opts.solidOpts);
    else b.box(c0, Y0, A0, c1, Y1, A1, opts.solidOpts);
  };
  box(a0, a1, y, y + base);
  const len = a1 - a0;
  const n = Math.max(1, Math.round((len + gw) / (mw + gw)));
  const w = (len + gw) / n - gw;
  for (let i = 0; i < n; i++) {
    const s = a0 + i * (w + gw);
    box(s, s + w, y + base, y + base + mh);
  }
}

/** Round crenellated parapet. */
export function crenRing(b, cx, cz, rIn, rOut, y, opts = {}) {
  const base = opts.base ?? 0.9;
  const mh = opts.mh ?? 1.5;
  const seg = opts.seg ?? 28;
  const a0 = opts.a0 ?? 0;
  const a1 = opts.a1 ?? Math.PI * 2;
  b.ring(cx, cz, rIn, rOut, y, y + base, seg, a0, a1, opts.solidOpts || {});
  const segs = seg;
  for (let i = 0; i < segs; i += 2) {
    const A = a0 + ((a1 - a0) * i) / segs;
    const B = a0 + ((a1 - a0) * (i + 1)) / segs;
    b.ring(cx, cz, rIn, rOut, y + base, y + base + mh, 1, A, B, opts.solidOpts || {});
  }
}

/** Thin dark decal (arrow loop, slit, sooting) on a face. */
export function decalX(b, x, y0, y1, w, zFace, sign, opts = {}) {
  b.with({ kind: K.PLAIN, color: opts.color ?? P.void, label: opts.label ?? b.state.label }, () => {
    b.box(x - w / 2, y0, zFace, x + w / 2, y1, zFace + sign * (opts.depth ?? 0.04));
  });
}
export function decalZ(b, z, y0, y1, w, xFace, sign, opts = {}) {
  b.with({ kind: K.PLAIN, color: opts.color ?? P.void, label: opts.label ?? b.state.label }, () => {
    b.box(xFace, y0, z - w / 2, xFace + sign * (opts.depth ?? 0.04), y1, z + w / 2);
  });
}
/** Decal on a cylinder at angle a. */
export function decalRing(b, cx, cz, r, a, y0, y1, w, opts = {}) {
  b.with({ kind: K.PLAIN, color: opts.color ?? P.void, label: opts.label ?? b.state.label }, () => {
    const d = opts.depth ?? 0.06;
    obox(b, cx + Math.cos(a) * (r + d / 2 - 0.02), (y0 + y1) / 2, cz + Math.sin(a) * (r + d / 2 - 0.02), w, y1 - y0, d, -a + Math.PI / 2);
  });
}

/** Straight flight of steps rising along +a (axis 'x' or 'z'), dir = +1 / -1. */
export function stairs(b, axis, aStart, c0, c1, y0, y1, n, run, dir = 1, opts) {
  const rise = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const s = aStart + dir * i * run;
    const e = s + dir * run;
    const top = y0 + rise * (i + 1);
    if (axis === 'x') b.box(Math.min(s, e), y0, c0, Math.max(s, e), top, c1, opts);
    else b.box(c0, y0, Math.min(s, e), c1, top, Math.max(s, e), opts);
  }
}

// --- 2D convex polygon utilities (x,z) -------------------------------------
export function clip2D(poly, nx, nz, d) {
  // keep nx*x + nz*z <= d
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const c = poly[(i + 1) % poly.length];
    const da = nx * a[0] + nz * a[1] - d;
    const dc = nx * c[0] + nz * c[1] - d;
    if (da <= 0) out.push(a);
    if ((da < 0 && dc > 0) || (da > 0 && dc < 0)) {
      const t = da / (da - dc);
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * Square block with a round shaft through it, built as convex pieces.
 * Fills the square [cx±half, cz±half] minus a circle of radius r.
 */
export function squareWithHole(b, cx, cz, half, r, y0, y1, seg = 20, opts) {
  const sq = [[cx - half, cz - half], [cx + half, cz - half], [cx + half, cz + half], [cx - half, cz + half]];
  for (let i = 0; i < seg; i++) {
    const A = (i / seg) * Math.PI * 2;
    const B = ((i + 1) / seg) * Math.PI * 2;
    // wedge: keep points on the left of ray A and right of ray B
    let p = sq;
    // half-plane: cross(dirA, p - c) >= 0  ->  -(sinA)(x-cx) + cosA (z-cz) >= 0
    p = clip2D(p, Math.sin(A), -Math.cos(A), Math.sin(A) * cx - Math.cos(A) * cz);
    p = clip2D(p, -Math.sin(B), Math.cos(B), -Math.sin(B) * cx + Math.cos(B) * cz);
    // outside the chord between A and B
    const ax = cx + Math.cos(A) * r, az = cz + Math.sin(A) * r;
    const bx = cx + Math.cos(B) * r, bz = cz + Math.sin(B) * r;
    let nx = bz - az, nz = -(bx - ax); // normal of chord
    // orient so that the centre is on the positive (removed) side
    const dc = nx * (cx - ax) + nz * (cz - az);
    if (dc < 0) {
      nx = -nx;
      nz = -nz;
    }
    p = clip2D(p, nx, nz, nx * ax + nz * az);
    if (p.length >= 3) b.prism(p, y0, y1, opts);
  }
}

/**
 * Square-section beam between two points. w: width (horizontal), h: depth.
 * Works for any direction; useful for rafters, braces, posts, spits.
 */
export function beam(b, p0, p1, w, h = w, opts) {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  if (len < 1e-5) return;
  dir.divideScalar(len);
  const ref = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, ref).normalize();
  const up = new THREE.Vector3().crossVectors(side, dir).normalize();
  const corners = (p) => [
    p.clone().addScaledVector(side, -w / 2).addScaledVector(up, -h / 2),
    p.clone().addScaledVector(side, w / 2).addScaledVector(up, -h / 2),
    p.clone().addScaledVector(side, w / 2).addScaledVector(up, h / 2),
    p.clone().addScaledVector(side, -w / 2).addScaledVector(up, h / 2),
  ];
  b.loft(corners(p0), corners(p1), opts || {});
}

/** Shorthand vector. */
export const v3 = V;
