import * as THREE from 'three';
import { K, P } from './kinds.js';
import { beam, obox, v3 } from './shapes.js';

// Reusable furniture and vessels, all built from convex pieces so they can
// be cut like everything else.

function frame(axis) {
  if (axis === 'x') return { a: v3(1, 0, 0), u: v3(0, 0, 1), v: v3(0, 1, 0) };
  if (axis === 'z') return { a: v3(0, 0, 1), u: v3(1, 0, 0), v: v3(0, 1, 0) };
  if (axis && axis.isVector3) {
    const a = axis.clone().normalize();
    const ref = Math.abs(a.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(a, ref).normalize();
    const v = new THREE.Vector3().crossVectors(u, a).normalize();
    return { a, u, v };
  }
  return { a: v3(0, 1, 0), u: v3(1, 0, 0), v: v3(0, 0, 1) };
}

/**
 * Solid of revolution. profile: [[r, h], ...] with h increasing along the axis.
 * Each band is a convex frustum.
 */
export function lathe(b, base, axis, profile, seg = 14, opts = {}) {
  const { a, u, v } = frame(axis);
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, h0] = profile[i];
    const [r1, h1] = profile[i + 1];
    const R0 = Math.max(r0, 0.002);
    const R1 = Math.max(r1, 0.002);
    const ring = (r, h) => {
      const pts = [];
      for (let k = 0; k < seg; k++) {
        const t = (k / seg) * Math.PI * 2;
        pts.push(base.clone().addScaledVector(a, h).addScaledVector(u, Math.cos(t) * r).addScaledVector(v, Math.sin(t) * r));
      }
      return pts;
    };
    const A = ring(R0, h0);
    const B = ring(R1, h1);
    const faces = [{ verts: A, kind: opts.endKind, color: opts.endColor }, { verts: B, kind: opts.endKind, color: opts.endColor }];
    for (let k = 0; k < seg; k++) {
      const k2 = (k + 1) % seg;
      const nrm = (t) => {
        const radial = u.clone().multiplyScalar(Math.cos(t)).addScaledVector(v, Math.sin(t));
        return radial.multiplyScalar(h1 - h0).addScaledVector(a, R0 - R1).normalize();
      };
      const t1 = (k / seg) * Math.PI * 2;
      const t2 = (k2 / seg) * Math.PI * 2;
      faces.push({ verts: [{ p: A[k], n: nrm(t1) }, { p: A[k2], n: nrm(t2) }, { p: B[k2], n: nrm(t2) }, { p: B[k], n: nrm(t1) }] });
    }
    for (const f of faces) {
      if (f.kind === undefined) delete f.kind;
      if (f.color === undefined) delete f.color;
    }
    b.solid(faces, opts);
  }
}

/** Cask lying or standing. axis 'x' | 'z' | 'y'; centre at c. */
export function cask(b, c, axis, r, len, opts = {}) {
  const { a } = frame(axis);
  const base = c.clone().addScaledVector(a, -len / 2);
  const wood = opts.color ?? P.oak;
  b.with({ kind: K.TIMBER, color: wood }, () => {
    lathe(b, base, axis, [[r * 0.84, 0], [r * 0.95, len * 0.22], [r, len * 0.5], [r * 0.95, len * 0.78], [r * 0.84, len]], opts.seg ?? 14, { endColor: opts.headColor ?? 0xa98a62 });
  });
  // hoops (ash or hazel withies on medieval casks; drawn dark)
  const prof = [[0.84, 0], [0.95, 0.22], [1, 0.5], [0.95, 0.78], [0.84, 1]];
  const rAt = (t) => {
    for (let i = 0; i < prof.length - 1; i++) {
      if (t <= prof[i + 1][1]) {
        const k = (t - prof[i][1]) / (prof[i + 1][1] - prof[i][1]);
        return r * (prof[i][0] + (prof[i + 1][0] - prof[i][0]) * k);
      }
    }
    return r * 0.84;
  };
  b.with({ kind: K.TIMBER, color: 0x6a5238 }, () => {
    for (const t of [0.07, 0.2, 0.8, 0.93]) {
      const rr = Math.max(rAt(t - 0.03), rAt(t + 0.03)) + 0.012;
      lathe(b, base.clone().addScaledVector(a, len * t - 0.025), axis, [[rr, 0], [rr, 0.05]], opts.seg ?? 14);
    }
  });
}

/** Open tub / vat with a liquid surface. */
export function tub(b, x, y, z, r, h, opts = {}) {
  b.with({ kind: K.TIMBER, color: opts.color ?? P.oak }, () => {
    lathe(b, v3(x, y, z), 'y', [[r * 0.9, 0], [r, h]], opts.seg ?? 16);
    // rim
    b.ring(x, z, r * 0.92, r + 0.03, y + h, y + h + 0.05, opts.seg ?? 16, 0, Math.PI * 2, {});
    // hoops
    b.with({ color: 0x6a5238 }, () => {
      for (const t of [0.15, 0.85]) b.ring(x, z, 0, r * (0.9 + 0.1 * t) + 0.015, y + h * t, y + h * t + 0.05, opts.seg ?? 16);
    });
  });
  if (opts.liquid !== false) {
    b.with({ kind: opts.liquidKind ?? K.WATER, color: opts.liquid ?? 0x9a7a45 }, () => {
      b.cylinder(x, z, r * 0.92, y + h - 0.12, y + h - 0.02, opts.seg ?? 16);
    });
  }
}

export function jug(b, x, y, z, s = 1, color = 0x8f9a5a) {
  b.with({ kind: K.PLAIN, color }, () => {
    lathe(b, v3(x, y, z), 'y', [[0.06 * s, 0], [0.09 * s, 0.08 * s], [0.095 * s, 0.14 * s], [0.07 * s, 0.22 * s], [0.05 * s, 0.27 * s], [0.06 * s, 0.31 * s]], 10);
    obox(b, x + 0.09 * s, y + 0.2 * s, z, 0.03 * s, 0.12 * s, 0.025 * s, 0);
  });
}

export function bowl(b, x, y, z, r = 0.14, color = 0x9b7b55) {
  b.with({ kind: K.TIMBER, color }, () => lathe(b, v3(x, y, z), 'y', [[r * 0.5, 0], [r, r * 0.45]], 12));
}

export function cauldron(b, x, y, z, r, color = 0x55504a) {
  b.with({ kind: K.METAL, color }, () => {
    lathe(b, v3(x, y, z), 'y', [[r * 0.35, 0], [r * 0.85, r * 0.25], [r, r * 0.6], [r * 0.92, r * 1.0], [r * 0.95, r * 1.05]], 16);
    // three legs
    for (let i = 0; i < 3; i++) {
      const t = (i / 3) * Math.PI * 2 + 0.4;
      beam(b, v3(x + Math.cos(t) * r * 0.55, y + r * 0.1, z + Math.sin(t) * r * 0.55), v3(x + Math.cos(t) * r * 0.62, y - r * 0.35, z + Math.sin(t) * r * 0.62), 0.04 * (r / 0.4), 0.04 * (r / 0.4));
    }
  });
}

export function sack(b, x, y, z, w = 0.5, h = 0.75, rot = 0, color = 0xcdb98c) {
  b.with({ kind: K.CLOTH, color }, () => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const pt = (lx, ly, lz) => v3(x + lx * c + lz * s, y + ly, z - lx * s + lz * c);
    const d = w * 0.7;
    const bot = [pt(-w / 2, 0, -d / 2), pt(w / 2, 0, -d / 2), pt(w / 2, 0, d / 2), pt(-w / 2, 0, d / 2)];
    const mid = [pt(-w * 0.55, h * 0.45, -d * 0.55), pt(w * 0.55, h * 0.45, -d * 0.55), pt(w * 0.55, h * 0.45, d * 0.55), pt(-w * 0.55, h * 0.45, d * 0.55)];
    const top = [pt(-w * 0.3, h * 0.88, -d * 0.25), pt(w * 0.3, h * 0.88, -d * 0.25), pt(w * 0.3, h * 0.88, d * 0.25), pt(-w * 0.3, h * 0.88, d * 0.25)];
    b.loft(bot, mid);
    b.loft(mid, top);
    // tied neck
    obox(b, x, y + h * 0.94, z, w * 0.18, h * 0.12, w * 0.18, rot);
  });
}

/** Trestle table along x or z. h: absolute height of the top; opts.floor: floor level. */
export function trestleTable(b, x0, x1, z0, z1, h = 0.84, opts = {}) {
  const alongX = x1 - x0 >= z1 - z0;
  const fl = opts.floor ?? 0.08;
  b.with({ kind: K.TIMBER, color: opts.color ?? P.oak }, () => {
    b.box(x0, h - 0.06, z0, x1, h, z1, { topKind: K.BOARDS, topColor: opts.topColor ?? 0xb69a72 });
    const legs = alongX ? [x0 + 0.35, x1 - 0.35] : [z0 + 0.35, z1 - 0.35];
    for (const L of legs) {
      if (alongX) {
        const zm = (z0 + z1) / 2;
        const half = (z1 - z0) / 2 - 0.05;
        beam(b, v3(L, h - 0.06, zm), v3(L, fl, zm - half), 0.07, 0.07);
        beam(b, v3(L, h - 0.06, zm), v3(L, fl, zm + half), 0.07, 0.07);
        b.box(L - 0.04, h - 0.16, z0 + 0.05, L + 0.04, h - 0.06, z1 - 0.05);
      } else {
        const xm = (x0 + x1) / 2;
        const half = (x1 - x0) / 2 - 0.05;
        beam(b, v3(xm, h - 0.06, L), v3(xm - half, fl, L), 0.07, 0.07);
        beam(b, v3(xm, h - 0.06, L), v3(xm + half, fl, L), 0.07, 0.07);
        b.box(x0 + 0.05, h - 0.16, L - 0.04, x1 - 0.05, h - 0.06, L + 0.04);
      }
    }
  });
}

export function bench(b, x0, x1, z0, z1, h = 0.45, y = 0.08) {
  b.with({ kind: K.TIMBER, color: P.oak }, () => {
    b.box(x0, y + h - 0.05, z0, x1, y + h, z1);
    const alongX = x1 - x0 >= z1 - z0;
    if (alongX) {
      for (const L of [x0 + 0.15, x1 - 0.2]) b.box(L, y, z0 + 0.02, L + 0.05, y + h - 0.05, z1 - 0.02);
    } else {
      for (const L of [z0 + 0.15, z1 - 0.2]) b.box(x0 + 0.02, y, L, x1 - 0.02, y + h - 0.05, L + 0.05);
    }
  });
}

export function stool(b, x, y, z, h = 0.42) {
  b.with({ kind: K.TIMBER, color: P.oak }, () => {
    b.cylinder(x, z, 0.17, y + h - 0.05, y + h, 10);
    for (let i = 0; i < 3; i++) {
      const t = (i / 3) * Math.PI * 2;
      beam(b, v3(x + Math.cos(t) * 0.09, y + h - 0.05, z + Math.sin(t) * 0.09), v3(x + Math.cos(t) * 0.17, y, z + Math.sin(t) * 0.17), 0.035, 0.035);
    }
  });
}

/** Wall shelf: boards on brackets against a wall facing +z (or other). */
export function shelves(b, x0, x1, z, y0, levels = 3, gap = 0.45, depth = 0.35, dir = 1) {
  b.with({ kind: K.TIMBER, color: P.timber }, () => {
    for (let i = 0; i < levels; i++) {
      const y = y0 + i * gap;
      b.box(x0, y, z, x1, y + 0.04, z + dir * depth);
    }
    for (const x of [x0 + 0.05, x1 - 0.1]) b.box(x, y0 - 0.1, z, x + 0.05, y0 + (levels - 1) * gap + 0.04, z + dir * depth);
  });
}

/** Shelves against a wall that runs along z (facing +x or -x). */
export function shelvesZ(b, z0, z1, x, y0, levels = 3, gap = 0.45, depth = 0.35, dir = 1) {
  b.with({ kind: K.TIMBER, color: P.timber }, () => {
    for (let i = 0; i < levels; i++) {
      const y = y0 + i * gap;
      b.box(x, y, z0, x + dir * depth, y + 0.04, z1);
    }
    for (const z of [z0 + 0.05, z1 - 0.1]) b.box(x, y0 - 0.1, z, x + dir * depth, y0 + (levels - 1) * gap + 0.04, z + 0.05);
  });
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _sphere = new THREE.SphereGeometry(1, 10, 7);

/** Rounded lump (loaf, cheese, onion...): a scaled sphere, not cut. */
export function lump(b, x, y, z, sx, sy, sz, color, kind = K.PLAIN, rot = 0) {
  _q.setFromAxisAngle(v3(0, 1, 0), rot);
  _m.compose(v3(x, y, z), _q, v3(sx, sy, sz));
  b.addGeometry(_sphere, _m, { color, kind });
}

export function loaf(b, x, y, z, r = 0.11, color = 0xc08a4a) {
  lump(b, x, y + r * 0.45, z, r, r * 0.55, r, color);
}

export function ladder(b, x0, y0, z0, x1, y1, z1, w = 0.45) {
  const p0 = v3(x0, y0, z0);
  const p1 = v3(x1, y1, z1);
  const dir = p1.clone().sub(p0);
  const side = new THREE.Vector3().crossVectors(dir, v3(0, 1, 0)).normalize().multiplyScalar(w / 2);
  if (side.lengthSq() < 1e-6) side.set(w / 2, 0, 0);
  b.with({ kind: K.TIMBER, color: P.timber }, () => {
    beam(b, p0.clone().add(side), p1.clone().add(side), 0.06, 0.06);
    beam(b, p0.clone().sub(side), p1.clone().sub(side), 0.06, 0.06);
    const n = Math.floor(dir.length() / 0.32);
    for (let i = 1; i < n; i++) {
      const p = p0.clone().addScaledVector(dir, i / n);
      beam(b, p.clone().add(side), p.clone().sub(side), 0.04, 0.04);
    }
  });
}

/** A log or billet. */
export function log(b, p0, p1, r = 0.08, color = 0x7b5b3a) {
  b.with({ kind: K.TIMBER, color }, () => lathe(b, p0, p1.clone().sub(p0), [[r, 0], [r, p0.distanceTo(p1)]], 7));
}

/** Stack of billets along x. */
export function woodpile(b, x0, x1, z0, z1, h, color = 0x7d5c3b) {
  const r = 0.07;
  let row = 0;
  for (let y = r; y < h; y += r * 1.75) {
    const off = (row % 2) * r;
    for (let z = z0 + r + off; z < z1 - r; z += r * 2.05) {
      log(b, v3(x0, y, z), v3(x1, y, z), r * (0.85 + 0.3 * ((z * 7.3 + y * 3.1) % 1)), color);
    }
    row++;
  }
}

/** Bundle of brushwood (faggot) lying along x. */
export function faggot(b, x, y, z, len = 1.2, r = 0.18) {
  b.with({ kind: K.STRAW, color: 0x8a7046 }, () => lathe(b, v3(x - len / 2, y + r, z), 'x', [[r * 0.8, 0], [r, len * 0.5], [r * 0.85, len]], 8));
  b.with({ kind: K.TIMBER, color: 0x5a4430 }, () => {
    for (const t of [0.3, 0.7]) lathe(b, v3(x - len / 2 + len * t, y + r, z), 'x', [[r + 0.01, 0], [r + 0.01, 0.04]], 8);
  });
}

/** Thin hanging cord/chain from p0 down to p1. */
export function cord(b, p0, p1, w = 0.02, color = 0x3e3a36) {
  b.with({ kind: K.METAL, color }, () => beam(b, p0, p1, w, w));
}

/** Bin or chest. */
export function chest(b, x0, x1, z0, z1, y, h, color = P.timberDark, lid = true) {
  b.with({ kind: K.TIMBER, color }, () => {
    b.box(x0, y, z0, x1, y + h, z1);
    if (lid) b.box(x0 - 0.03, y + h, z0 - 0.03, x1 + 0.03, y + h + 0.05, z1 + 0.03);
  });
}

/** Heap of loose grain (a low square pyramid). */
export function heap(b, x, y, z, w, d, h, color = 0xd5b56a) {
  b.with({ kind: K.STRAW, color }, () => {
    b.loft([v3(x - w / 2, y, z - d / 2), v3(x + w / 2, y, z - d / 2), v3(x + w / 2, y, z + d / 2), v3(x - w / 2, y, z + d / 2)],
      [v3(x - w * 0.12, y + h, z - d * 0.1), v3(x + w * 0.12, y + h, z - d * 0.1), v3(x + w * 0.12, y + h, z + d * 0.1), v3(x - w * 0.12, y + h, z + d * 0.1)]);
  });
}

export { obox, beam, v3 };
