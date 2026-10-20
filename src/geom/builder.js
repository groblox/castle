import * as THREE from 'three';
import { K, CAP_OF, P } from './kinds.js';

// ---------------------------------------------------------------------------
// GeoBuilder: accumulates convex solids into one flat-shaded BufferGeometry.
//
// Every solid is clipped against the active cut planes. Where a plane slices
// a solid, a cap polygon is generated and tagged as a "cut" face, so the
// section fill comes from real geometry rather than a stencil trick.
// Plane convention: keep the half-space n·p <= d.
// ---------------------------------------------------------------------------

const EPS = 1e-4;
const _v = new THREE.Vector3();

export const MAIN_CUT = { n: new THREE.Vector3(0, 0, 1), d: 0 };

export function planeY(h) {
  return { n: new THREE.Vector3(0, 1, 0), d: h };
}
export function plane(nx, ny, nz, d) {
  const n = new THREE.Vector3(nx, ny, nz).normalize();
  return { n, d };
}

function colorArr(c) {
  const col = new THREE.Color(c);
  return [col.r, col.g, col.b];
}

function vert(p, n = null) {
  return { p, n };
}

function lerpVert(a, b, t) {
  const p = a.p.clone().lerp(b.p, t);
  let n = null;
  if (a.n && b.n) n = a.n.clone().lerp(b.n, t).normalize();
  return { p, n };
}

function newell(points) {
  const n = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  return n.normalize();
}

function clipFace(face, pl, onPts) {
  const vs = face.verts;
  const out = [];
  const dist = vs.map((v) => pl.n.dot(v.p) - pl.d);
  for (let i = 0; i < vs.length; i++) {
    const j = (i + 1) % vs.length;
    const dc = dist[i];
    const dn = dist[j];
    if (dc <= EPS) {
      out.push(vs[i]);
      if (Math.abs(dc) <= EPS) onPts.push(vs[i].p);
    }
    if ((dc < -EPS && dn > EPS) || (dc > EPS && dn < -EPS)) {
      const t = dc / (dc - dn);
      const v = lerpVert(vs[i], vs[j], t);
      out.push(v);
      onPts.push(v.p);
    }
  }
  if (out.length < 3) return null;
  return { ...face, verts: out };
}

function hull2D(pts) {
  // Andrew's monotone chain; pts: [{x,y,p}]
  pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function capFromPoints(points, pl) {
  // dedupe
  const uniq = [];
  for (const p of points) {
    if (!uniq.some((q) => q.distanceToSquared(p) < 1e-8)) uniq.push(p);
  }
  if (uniq.length < 3) return null;
  const n = pl.n;
  const u = new THREE.Vector3();
  if (Math.abs(n.y) < 0.9) u.set(0, 1, 0).cross(n).normalize();
  else u.set(1, 0, 0).cross(n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u); // u x v = n
  const pts2 = uniq.map((p) => ({ x: p.dot(u), y: p.dot(v), p }));
  const h = hull2D(pts2);
  if (h.length < 3) return null;
  return h.map((q) => vert(q.p.clone(), null));
}

export class GeoBuilder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
    this.info = []; // kind, label, group
    this.planeFaces = []; // faces lying in the main cut plane, emitted at build()
    this.state = {
      color: colorArr(P.stone),
      kind: K.STONE,
      label: 0,
      group: 0,
      capColor: null,
      capKind: null,
      planes: [MAIN_CUT],
      jitter: 0,
    };
    this.stack = [];
  }

  push(opts = {}) {
    this.stack.push({ ...this.state, color: this.state.color.slice(), planes: this.state.planes.slice() });
    this.set(opts);
    return this;
  }
  pop() {
    this.state = this.stack.pop();
    return this;
  }
  set(opts) {
    if (opts.color !== undefined) this.state.color = colorArr(opts.color);
    if (opts.kind !== undefined) this.state.kind = opts.kind;
    if (opts.label !== undefined) this.state.label = opts.label;
    if (opts.group !== undefined) this.state.group = opts.group;
    if (opts.capColor !== undefined) this.state.capColor = opts.capColor;
    if (opts.capKind !== undefined) this.state.capKind = opts.capKind;
    if (opts.planes !== undefined) this.state.planes = opts.planes;
    if (opts.addPlanes) this.state.planes = this.state.planes.concat(opts.addPlanes);
    return this;
  }
  /** Run fn with temporary state. */
  with(opts, fn) {
    this.push(opts);
    try {
      fn(this);
    } finally {
      this.pop();
    }
    return this;
  }

  // -- low level emit ------------------------------------------------------
  emitPoly(verts, kind, color) {
    const pts = verts.map((v) => v.p);
    const fn = newell(pts);
    if (!isFinite(fn.x) || fn.lengthSq() < 0.5) return;
    const { label, group } = this.state;
    for (let i = 1; i < verts.length - 1; i++) {
      for (const v of [verts[0], verts[i], verts[i + 1]]) {
        this.pos.push(v.p.x, v.p.y, v.p.z);
        const n = v.n || fn;
        this.nrm.push(n.x, n.y, n.z);
        this.col.push(color[0], color[1], color[2]);
        this.info.push(kind, label, group);
      }
    }
  }

  /**
   * Add a convex solid given as a list of faces (each an array of
   * Vector3 or {p,n} vertices). Faces are auto-oriented outward using the
   * solid's centroid, so winding does not matter.
   * Per-face overrides: {verts, kind, color}.
   */
  solid(faces, opts = {}) {
    const st = this.state;
    const kind = opts.kind ?? st.kind;
    const color = opts.color !== undefined ? colorArr(opts.color) : st.color;
    const planes = opts.planes ?? st.planes;
    let fs = faces.map((f) => {
      const arr = Array.isArray(f) ? f : f.verts;
      const verts = arr.map((v) => (v.isVector3 ? vert(v.clone()) : vert(v.p.clone(), v.n ? v.n.clone() : null)));
      return {
        verts,
        kind: f.kind ?? kind,
        color: f.color !== undefined ? colorArr(f.color) : color,
      };
    });

    // orientation
    const c = new THREE.Vector3();
    let cnt = 0;
    for (const f of fs) for (const v of f.verts) {
      c.add(v.p);
      cnt++;
    }
    c.divideScalar(cnt);
    for (const f of fs) {
      const n = newell(f.verts.map((v) => v.p));
      const fc = new THREE.Vector3();
      for (const v of f.verts) fc.add(v.p);
      fc.divideScalar(f.verts.length);
      if (n.dot(_v.subVectors(fc, c)) < 0) f.verts.reverse();
    }

    const capKind = opts.capKind ?? st.capKind ?? CAP_OF[kind] ?? K.CUT;
    const capColorHex = opts.capColor ?? st.capColor ?? defaultCapColor(capKind);
    const capColor = colorArr(capColorHex);

    for (const pl of planes) {
      let minD = Infinity;
      let maxD = -Infinity;
      for (const f of fs) for (const v of f.verts) {
        const d = pl.n.dot(v.p) - pl.d;
        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
      }
      if (minD >= -EPS) return; // entirely outside (or only touching)
      if (maxD <= EPS) {
        // entirely inside: faces lying on the plane become cut faces
        for (const f of fs) {
          if (f.verts.every((v) => Math.abs(pl.n.dot(v.p) - pl.d) <= EPS)) {
            f.kind = capKind;
            f.color = capColor;
            for (const v of f.verts) v.n = null;
          }
        }
        continue;
      }
      const onPts = [];
      const next = [];
      for (const f of fs) {
        const cf = clipFace(f, pl, onPts);
        if (cf) {
          // a face that collapsed onto the plane is degenerate; drop it
          if (cf.verts.every((v) => Math.abs(pl.n.dot(v.p) - pl.d) <= EPS)) continue;
          next.push(cf);
        }
      }
      const cap = capFromPoints(onPts, pl);
      if (cap) next.push({ verts: cap, kind: capKind, color: capColor });
      fs = next;
      if (fs.length < 3) return;
    }
    for (const f of fs) {
      if (f.verts.every((v) => !v.n)) {
        // flat face: defer so T-junctions with coplanar neighbours can be welded
        this.planeFaces.push({ verts: f.verts, kind: f.kind, color: f.color, label: this.state.label, group: this.state.group });
      } else this.emitPoly(f.verts, f.kind, f.color);
    }
  }

  /**
   * Insert onto every edge of the cut-plane faces any vertex of another face
   * that lies on that edge, so neighbouring faces share edges exactly and no
   * hairline cracks open between them when rasterised.
   */
  _weldPlaneFaces() {
    // group faces by supporting plane
    const groups = new Map();
    for (const f of this.planeFaces) {
      const n = newell(f.verts.map((v) => v.p));
      if (!isFinite(n.x) || n.lengthSq() < 0.5) continue;
      const d = n.dot(f.verts[0].p);
      const key = `${Math.round(n.x * 200)},${Math.round(n.y * 200)},${Math.round(n.z * 200)},${Math.round(d * 100)}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { n, faces: [] }));
      g.faces.push(f);
    }
    for (const g of groups.values()) {
      if (g.faces.length === 1) {
        const f = g.faces[0];
        this.state.label = f.label;
        this.state.group = f.group;
        this.emitPoly(f.verts, f.kind, f.color);
        continue;
      }
      this._weldGroup(g);
    }
    this.planeFaces = [];
  }

  _weldGroup(g) {
    // 2D frame on the plane
    const n = g.n;
    const u = new THREE.Vector3();
    if (Math.abs(n.y) < 0.9) u.set(0, 1, 0).cross(n).normalize();
    else u.set(1, 0, 0).cross(n).normalize();
    const w = new THREE.Vector3().crossVectors(n, u);
    const CELL = 2;
    const grid = new Map();
    const key = (i, j) => i * 100003 + j;
    for (const f of g.faces) {
      for (const v of f.verts) {
        v.u = v.p.dot(u);
        v.w = v.p.dot(w);
        const k = key(Math.floor(v.u / CELL), Math.floor(v.w / CELL));
        let arr = grid.get(k);
        if (!arr) grid.set(k, (arr = []));
        if (!arr.some((q) => Math.abs(q.u - v.u) < 1e-5 && Math.abs(q.w - v.w) < 1e-5)) arr.push(v);
      }
    }
    for (const f of g.faces) {
      const out = [];
      const nv = f.verts.length;
      for (let e = 0; e < nv; e++) {
        const a = f.verts[e];
        const b = f.verts[(e + 1) % nv];
        out.push(a);
        const du = b.u - a.u;
        const dw = b.w - a.w;
        const len2 = du * du + dw * dw;
        if (len2 < 1e-10) continue;
        const i0 = Math.floor(Math.min(a.u, b.u) / CELL), i1 = Math.floor(Math.max(a.u, b.u) / CELL);
        const j0 = Math.floor(Math.min(a.w, b.w) / CELL), j1 = Math.floor(Math.max(a.w, b.w) / CELL);
        if ((i1 - i0 + 1) * (j1 - j0 + 1) > 4000) continue;
        const ins = [];
        for (let i = i0; i <= i1; i++) {
          for (let j = j0; j <= j1; j++) {
            const arr = grid.get(key(i, j));
            if (!arr) continue;
            for (const q of arr) {
              const t = ((q.u - a.u) * du + (q.w - a.w) * dw) / len2;
              if (t <= 1e-6 || t >= 1 - 1e-6) continue;
              const cu = a.u + du * t - q.u;
              const cw = a.w + dw * t - q.w;
              if (cu * cu + cw * cw < 1e-9) ins.push({ t, q });
            }
          }
        }
        ins.sort((x, y) => x.t - y.t);
        for (const it of ins) out.push({ p: it.q.p.clone(), n: null });
      }
      this.state.label = f.label;
      this.state.group = f.group;
      if (out.length === nv) this.emitPoly(out, f.kind, f.color);
      else this.emitFan(out, f.kind, f.color);
    }
  }

  /** Triangulate a convex polygon that may carry collinear edge vertices. */
  emitFan(verts, kind, color) {
    // choose a start vertex that is a true corner to avoid degenerate fans
    const n = verts.length;
    let best = 0;
    let bestA = -1;
    const ab = new THREE.Vector3();
    const cb = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = verts[(i + n - 1) % n].p, b = verts[i].p, c = verts[(i + 1) % n].p;
      ab.subVectors(a, b);
      cb.subVectors(c, b);
      const cr = ab.clone().cross(cb).length() / (ab.length() * cb.length() + 1e-12);
      if (cr > bestA) {
        bestA = cr;
        best = i;
      }
    }
    const ordered = verts.slice(best).concat(verts.slice(0, best));
    this.emitPoly(ordered, kind, color);
  }

  // -- primitives -----------------------------------------------------------
  box(x0, y0, z0, x1, y1, z1, opts) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const a = V(x0, y0, z0), b = V(x1, y0, z0), cc = V(x1, y0, z1), d = V(x0, y0, z1);
    const e = V(x0, y1, z0), f = V(x1, y1, z0), g = V(x1, y1, z1), h = V(x0, y1, z1);
    const faces = [
      [a, b, cc, d],
      [e, f, g, h],
      [a, b, f, e],
      [d, cc, g, h],
      [a, d, h, e],
      [b, cc, g, f],
    ];
    if (opts && opts.topKind !== undefined) {
      faces[1] = { verts: faces[1], kind: opts.topKind, color: opts.topColor };
    }
    this.solid(faces, opts);
    return this;
  }

  /** Box by centre and size. */
  boxc(cx, cy, cz, sx, sy, sz, opts) {
    return this.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, opts);
  }

  /** Vertical extrusion of a convex polygon [[x,z],...] between y0 and y1. */
  prism(poly, y0, y1, opts = {}) {
    const bot = poly.map(([x, z]) => new THREE.Vector3(x, y0, z));
    const top = poly.map(([x, z]) => new THREE.Vector3(x, y1, z));
    return this.loft(bot, top, opts);
  }

  /**
   * Convex solid between two polygons with matching vertex counts.
   * opts.smooth: side normals are radial about opts.axis (Vector3 point on a vertical axis)
   */
  loft(bot, top, opts = {}) {
    const n = bot.length;
    const faces = [{ verts: bot.slice(), kind: opts.botKind }, { verts: top.slice(), kind: opts.topKind, color: opts.topColor }];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (opts.smooth) {
        const ax = opts.axis || new THREE.Vector3();
        const rad = (p) => new THREE.Vector3(p.x - ax.x, 0, p.z - ax.z).normalize();
        faces.push({
          verts: [vert(bot[i], rad(bot[i])), vert(bot[j], rad(bot[j])), vert(top[j], rad(top[j])), vert(top[i], rad(top[i]))],
          kind: opts.sideKind,
        });
      } else {
        faces.push({ verts: [bot[i], bot[j], top[j], top[i]], kind: opts.sideKind });
      }
    }
    for (const f of faces) if (f.kind === undefined) delete f.kind;
    for (const f of faces) if (f.color === undefined) delete f.color;
    this.solid(faces, opts);
    return this;
  }

  cylinder(cx, cz, r, y0, y1, seg = 24, opts = {}) {
    const poly = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      poly.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
    return this.prism(poly, y0, y1, { smooth: true, axis: new THREE.Vector3(cx, 0, cz), ...opts });
  }

  /** Cone frustum (vertical). r1 may be 0 for a cone. */
  frustum(cx, cz, r0, r1, y0, y1, seg = 24, opts = {}) {
    const bot = [];
    const top = [];
    const rr1 = Math.max(r1, 0.001);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      bot.push(new THREE.Vector3(cx + Math.cos(a) * r0, y0, cz + Math.sin(a) * r0));
      top.push(new THREE.Vector3(cx + Math.cos(a) * rr1, y1, cz + Math.sin(a) * rr1));
    }
    return this.loft(bot, top, { smooth: true, axis: new THREE.Vector3(cx, 0, cz), ...opts });
  }

  /**
   * Horizontal cylinder along an axis ('x' or 'z').
   */
  hcyl(axis, cx, cy, cz, r, len, seg = 16, opts = {}) {
    const bot = [];
    const top = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const u = Math.cos(a) * r;
      const v = Math.sin(a) * r;
      if (axis === 'x') {
        bot.push(new THREE.Vector3(cx - len / 2, cy + v, cz + u));
        top.push(new THREE.Vector3(cx + len / 2, cy + v, cz + u));
      } else {
        bot.push(new THREE.Vector3(cx + u, cy + v, cz - len / 2));
        top.push(new THREE.Vector3(cx + u, cy + v, cz + len / 2));
      }
    }
    const faces = [{ verts: bot }, { verts: top }];
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      const rn = (p) => (axis === 'x' ? new THREE.Vector3(0, p.y - cy, p.z - cz) : new THREE.Vector3(p.x - cx, p.y - cy, 0)).normalize();
      faces.push({ verts: [vert(bot[i], rn(bot[i])), vert(bot[j], rn(bot[j])), vert(top[j], rn(top[j])), vert(top[i], rn(top[i]))] });
    }
    this.solid(faces, opts);
    return this;
  }

  /**
   * Annular wall (round tower shell) built from convex segments.
   * a0..a1 in radians (0 = +x, towards +z).
   */
  ring(cx, cz, rIn, rOut, y0, y1, seg = 24, a0 = 0, a1 = Math.PI * 2, opts = {}) {
    for (let i = 0; i < seg; i++) {
      const A = a0 + ((a1 - a0) * i) / seg;
      const B = a0 + ((a1 - a0) * (i + 1)) / seg;
      if (opts.skip && opts.skip((A + B) / 2)) continue;
      const P = (r, a, y) => new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
      const nOut = (a) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const nIn = (a) => new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a));
      const faces = [
        [P(rIn, A, y0), P(rOut, A, y0), P(rOut, B, y0), P(rIn, B, y0)],
        { verts: [P(rIn, A, y1), P(rOut, A, y1), P(rOut, B, y1), P(rIn, B, y1)], kind: opts.topKind },
        [vert(P(rOut, A, y0), nOut(A)), vert(P(rOut, B, y0), nOut(B)), vert(P(rOut, B, y1), nOut(B)), vert(P(rOut, A, y1), nOut(A))],
        { verts: [vert(P(rIn, A, y0), nIn(A)), vert(P(rIn, B, y0), nIn(B)), vert(P(rIn, B, y1), nIn(B)), vert(P(rIn, A, y1), nIn(A))], kind: opts.innerKind, color: opts.innerColor },
        [P(rIn, A, y0), P(rOut, A, y0), P(rOut, A, y1), P(rIn, A, y1)],
        [P(rIn, B, y0), P(rOut, B, y0), P(rOut, B, y1), P(rIn, B, y1)],
      ];
      for (const f of faces) {
        if (f.kind === undefined) delete f.kind;
        if (f.color === undefined) delete f.color;
      }
      this.solid(faces, opts);
    }
    return this;
  }

  /** Gabled roof prism: ridge along 'x' or 'z'. */
  gable(axis, x0, x1, z0, z1, yEave, yRidge, opts = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    let faces;
    if (axis === 'x') {
      const zm = (z0 + z1) / 2;
      faces = [
        [V(x0, yEave, z0), V(x1, yEave, z0), V(x1, yEave, z1), V(x0, yEave, z1)],
        [V(x0, yEave, z0), V(x1, yEave, z0), V(x1, yRidge, zm), V(x0, yRidge, zm)],
        [V(x0, yEave, z1), V(x1, yEave, z1), V(x1, yRidge, zm), V(x0, yRidge, zm)],
        [V(x0, yEave, z0), V(x0, yEave, z1), V(x0, yRidge, zm)],
        [V(x1, yEave, z0), V(x1, yEave, z1), V(x1, yRidge, zm)],
      ];
    } else {
      const xm = (x0 + x1) / 2;
      faces = [
        [V(x0, yEave, z0), V(x1, yEave, z0), V(x1, yEave, z1), V(x0, yEave, z1)],
        [V(x0, yEave, z0), V(x0, yEave, z1), V(xm, yRidge, z1), V(xm, yRidge, z0)],
        [V(x1, yEave, z0), V(x1, yEave, z1), V(xm, yRidge, z1), V(xm, yRidge, z0)],
        [V(x0, yEave, z0), V(x1, yEave, z0), V(xm, yRidge, z0)],
        [V(x0, yEave, z1), V(x1, yEave, z1), V(xm, yRidge, z1)],
      ];
    }
    this.solid(faces, opts);
    return this;
  }

  /**
   * A thin sloping slab (roof covering) between two horizontal edges.
   * e0a,e0b: low edge; e1a,e1b: high edge (Vector3). thickness along +y.
   */
  slab(a, b, c, d, t = 0.25, opts = {}) {
    const up = new THREE.Vector3(0, t, 0);
    this.loft([a, b, c, d], [a.clone().add(up), b.clone().add(up), c.clone().add(up), d.clone().add(up)], opts);
    return this;
  }

  /** Non-clipped mesh from an existing BufferGeometry (e.g. a sphere). */
  addGeometry(geo, matrix = null, opts = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const color = opts.color !== undefined ? colorArr(opts.color) : this.state.color;
    const kind = opts.kind ?? this.state.kind;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(color[0], color[1], color[2]);
      this.info.push(kind, this.state.label, this.state.group);
    }
    g.dispose();
    return this;
  }

  get triangleCount() {
    return this.pos.length / 9;
  }

  build() {
    const saved = { label: this.state.label, group: this.state.group };
    this._weldPlaneFaces();
    Object.assign(this.state, saved);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('acol', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('info', new THREE.Float32BufferAttribute(this.info, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

function defaultCapColor(capKind) {
  switch (capKind) {
    case K.CUT_TIMBER:
      return P.cutTimber;
    case K.CUT_ROCK:
      return P.cutRock;
    case K.CUT_EARTH:
      return P.cutEarth;
    default:
      return P.cut;
  }
}
