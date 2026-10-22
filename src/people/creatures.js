import * as THREE from 'three';
import { K } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { obox, beam, v3 } from '../geom/shapes.js';
import { partGeo, figureMaterial, mesh, node } from './parts.js';

// Small livestock and birds: hens, hounds, sheep, jackdaws and gulls.
// Like the figures, they face +z locally.

const geoCache = new Map();
function cached(key, fn) {
  if (!geoCache.has(key)) geoCache.set(key, partGeo(fn));
  return geoCache.get(key);
}

// ---------------------------------------------------------------------------
export class Hen {
  /** opts.color: plumage; opts.cock: a cockerel with a bigger comb and dark tail. */
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const col = opts.color ?? 0x9a6a3a;
    const cock = !!opts.cock;
    const s = cock ? 1.2 : 1;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0.2 * s, 0);
    this.body.add(mesh(cached(`henBody${col}${cock}`, (b) => {
      lump(b, 0, 0, 0, 0.1 * s, 0.1 * s, 0.14 * s, col, K.FUR);
      lump(b, 0, 0.02 * s, 0.07 * s, 0.07 * s, 0.08 * s, 0.07 * s, col, K.FUR); // breast
      // tail: a fan of feathers sticking up behind
      b.with({ kind: K.FUR, color: cock ? 0x24302a : new THREE.Color(col).multiplyScalar(0.75).getHex() }, () => {
        for (const a of [-0.25, 0, 0.25]) {
          const top = v3(Math.sin(a) * 0.05 * s, 0.17 * s, -0.2 * s);
          beam(b, v3(0, 0.02 * s, -0.1 * s), top, 0.035 * s, 0.015 * s);
          if (cock) beam(b, top, v3(Math.sin(a) * 0.07 * s, 0.08 * s, -0.3 * s), 0.03 * s, 0.012 * s);
        }
      });
      // wings folded at the sides
      for (const sd of [-1, 1]) lump(b, sd * 0.085 * s, 0.01 * s, -0.01 * s, 0.03 * s, 0.07 * s, 0.11 * s, new THREE.Color(col).multiplyScalar(0.85).getHex(), K.FUR);
    }), mat));
    this.head = node(this.body, 0, 0.1 * s, 0.11 * s);
    this.head.add(mesh(cached(`henHead${col}${cock}`, (b) => {
      lump(b, 0, 0.03 * s, 0.02 * s, 0.04 * s, 0.05 * s, 0.045 * s, col, K.FUR);
      b.with({ kind: K.PLAIN, color: 0xc83a2a }, () => {
        obox(b, 0, 0.09 * s, 0.02 * s, 0.015 * s, (cock ? 0.07 : 0.035) * s, (cock ? 0.08 : 0.05) * s, 0); // comb
        obox(b, 0, -0.005 * s, 0.06 * s, 0.012 * s, 0.035 * s, 0.02 * s, 0); // wattle
      });
      b.with({ kind: K.PLAIN, color: 0xd8b04a }, () => lathe(b, v3(0, 0.03 * s, 0.06 * s), 'z', [[0.012 * s, 0], [0.001, 0.035 * s]], 5)); // beak
      b.with({ kind: K.PLAIN, color: 0x1a1612 }, () => {
        for (const sd of [-1, 1]) obox(b, sd * 0.035 * s, 0.045 * s, 0.035 * s, 0.008, 0.01, 0.01, 0);
      });
    }), mat));
    this.legs = [];
    for (const sd of [-1, 1]) {
      const l = node(this.body, sd * 0.04 * s, -0.06 * s, 0.01 * s);
      l.add(mesh(cached(`henLeg${s}`, (b) => b.with({ kind: K.PLAIN, color: 0xd8b04a }, () => {
        beam(b, v3(0, 0, 0), v3(0, -0.14 * s, 0), 0.015 * s, 0.015 * s);
        beam(b, v3(0, -0.14 * s, -0.01), v3(0, -0.14 * s, 0.05 * s), 0.02 * s, 0.008);
      })), mat));
      this.legs.push(l);
    }
    this.s = s;
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    const s = this.s;
    this.body.position.y = 0.2 * s;
    this.body.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    this.head.position.z = 0.11 * s;
    this.legs[0].rotation.x = this.legs[1].rotation.x = 0;
    const seed = p.seed ?? 0;
    if (name === 'walk') {
      this.legs[0].rotation.x = Math.sin(ph) * 0.6;
      this.legs[1].rotation.x = -Math.sin(ph) * 0.6;
      this.head.position.z = (0.11 + 0.03 * Math.sin(ph * 2)) * s; // head bob
      this.body.rotation.z = Math.sin(ph) * 0.06;
    } else if (name === 'peck') {
      const k = Math.max(0, Math.sin(t * 5 + seed)) ** 3;
      this.body.rotation.x = 0.35 * k + 0.15;
      this.head.rotation.x = 1.0 * k + 0.2;
    } else if (name === 'scratch') {
      const k = Math.sin(t * 9 + seed);
      this.legs[seed % 2 ? 0 : 1].rotation.x = -Math.max(0, k) * 0.9;
      this.body.rotation.x = 0.15;
      this.head.rotation.x = 0.3;
    } else {
      // standing: sharp turns of the head
      this.head.rotation.y = Math.sign(Math.sin(t * 0.9 + seed)) * 0.5;
      this.head.rotation.x = -0.1;
    }
  }
}

// ---------------------------------------------------------------------------
export class Hound {
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const coat = opts.color ?? 0xb8956a;
    const dark = opts.dark ?? 0x6a5440;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0.5, 0);
    this.body.add(mesh(partGeo((b) => {
      lump(b, 0, 0, 0, 0.12, 0.13, 0.36, coat, K.FUR);
      lump(b, 0, 0.0, 0.22, 0.13, 0.16, 0.16, coat, K.FUR); // deep chest
      lump(b, 0, 0.02, -0.25, 0.11, 0.1, 0.12, coat, K.FUR); // haunch
      if (opts.patches) lump(b, 0.05, 0.06, -0.05, 0.1, 0.09, 0.14, dark, K.FUR);
      b.with({ kind: K.CLOTH, color: 0x7a3a26 }, () => lathe(b, v3(0, 0.08, 0.36), v3(0, 0.6, 1), [[0.08, 0], [0.08, 0.04]], 10)); // collar
    }), mat));
    this.neck = node(this.body, 0, 0.1, 0.36);
    this.neck.add(mesh(partGeo((b) => {
      b.with({ kind: K.FUR, color: coat }, () => lathe(b, v3(0, 0, 0), v3(0, 0.6, 0.5), [[0.08, 0], [0.06, 0.22]], 8));
    }), mat));
    this.head = node(this.neck, 0, 0.14, 0.12);
    this.head.add(mesh(partGeo((b) => {
      lump(b, 0, 0.02, 0.02, 0.07, 0.07, 0.09, coat, K.FUR);
      b.with({ kind: K.FUR, color: coat }, () => lathe(b, v3(0, 0.0, 0.07), 'z', [[0.05, 0], [0.032, 0.17]], 8)); // muzzle
      b.with({ kind: K.PLAIN, color: 0x1e1814 }, () => {
        obox(b, 0, 0.01, 0.25, 0.03, 0.025, 0.02, 0);
        for (const sd of [-1, 1]) obox(b, sd * 0.04, 0.05, 0.07, 0.012, 0.012, 0.01, 0);
      });
      b.with({ kind: K.FUR, color: dark }, () => {
        for (const sd of [-1, 1]) beam(b, v3(sd * 0.05, 0.07, -0.02), v3(sd * 0.09, -0.04, 0.0), 0.05, 0.015); // drop ears
      });
    }), mat));
    this.legs = [];
    for (const [x, z] of [[0.07, 0.24], [-0.07, 0.24], [0.07, -0.26], [-0.07, -0.26]]) {
      const l = node(this.body, x, -0.06, z);
      l.add(mesh(cached(`houndLeg${coat}`, (b) => b.with({ kind: K.FUR, color: coat }, () => {
        lathe(b, v3(0, -0.44, 0), 'y', [[0.025, 0], [0.04, 0.44]], 6);
        lump(b, 0, -0.44, 0.02, 0.03, 0.02, 0.04, coat, K.FUR);
      })), mat));
      this.legs.push(l);
    }
    this.tail = node(this.body, 0, 0.06, -0.36);
    this.tail.add(mesh(partGeo((b) => b.with({ kind: K.FUR, color: coat }, () => lathe(b, v3(0, 0, 0), v3(0, -0.5, -0.6), [[0.025, 0], [0.008, 0.4]], 6))), mat));
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    const seed = p.seed ?? 0;
    const b = this.body;
    b.position.y = 0.5;
    b.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    for (const l of this.legs) l.rotation.set(0, 0, 0);
    this.tail.rotation.set(0, Math.sin(t * 2 + seed) * 0.2, 0);
    if (name === 'walk' || name === 'trot') {
      const a = name === 'trot' ? 0.55 : 0.4;
      this.legs[0].rotation.x = this.legs[3].rotation.x = Math.sin(ph) * a;
      this.legs[1].rotation.x = this.legs[2].rotation.x = -Math.sin(ph) * a;
      b.position.y = 0.5 + Math.abs(Math.cos(ph)) * 0.015;
      this.tail.rotation.y = Math.sin(t * 6) * 0.35;
    } else if (name === 'sniff') {
      this.neck.rotation.x = 0.9;
      this.head.rotation.x = 0.3 + Math.sin(t * 8) * 0.08;
      this.head.rotation.y = Math.sin(t * 1.3 + seed) * 0.3;
      this.tail.rotation.y = Math.sin(t * 7) * 0.4;
    } else if (name === 'sit') {
      b.rotation.x = -0.5;
      b.position.y = 0.38;
      this.legs[2].rotation.x = this.legs[3].rotation.x = 1.3;
      this.legs[0].rotation.x = this.legs[1].rotation.x = 0.5;
      this.neck.rotation.x = -0.3;
      this.head.rotation.y = Math.sin(t * 0.4 + seed) * 0.4;
    } else if (name === 'lie') {
      // lying stretched out by the fire, breathing, the head up now and then
      b.position.y = 0.15 + Math.sin(t * 1.4 + seed) * 0.006;
      for (const l of this.legs.slice(0, 2)) l.rotation.x = -1.35;
      for (const l of this.legs.slice(2)) l.rotation.x = 1.3;
      const up = Math.sin(t * 0.21 + seed) > 0.6 ? 1 : 0;
      this.neck.rotation.x = up ? -0.1 : 0.85;
      this.head.rotation.x = up ? 0.1 : 0.4;
      this.head.rotation.y = up ? Math.sin(t * 0.7) * 0.4 : 0.1;
      this.tail.rotation.set(-0.6, 0.6, 0);
    }
  }
}

// ---------------------------------------------------------------------------
export class Sheep {
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const wool = opts.wool ?? 0xe0d9c6;
    const face = opts.face ?? 0xe8e0d0;
    const legCol = 0x4a4036;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0.52, 0);
    this.body.add(mesh(cached(`sheepBody${wool}`, (b) => {
      lump(b, 0, 0, 0, 0.24, 0.24, 0.4, wool, K.FUR);
      lump(b, 0, 0.06, 0.1, 0.22, 0.2, 0.24, wool, K.FUR);
      lump(b, 0, 0.04, -0.22, 0.2, 0.19, 0.18, wool, K.FUR);
    }), mat));
    this.neck = node(this.body, 0, 0.08, 0.34);
    this.neck.add(mesh(cached(`sheepNeck${wool}${face}`, (b) => {
      lump(b, 0, 0.02, 0.06, 0.11, 0.12, 0.12, wool, K.FUR);
      b.with({ kind: K.SKIN, color: face }, () => lathe(b, v3(0, 0.05, 0.12), v3(0, -0.4, 1), [[0.07, 0], [0.05, 0.2]], 8));
      b.with({ kind: K.SKIN, color: face }, () => {
        for (const sd of [-1, 1]) beam(b, v3(sd * 0.05, 0.1, 0.16), v3(sd * 0.13, 0.08, 0.13), 0.05, 0.015);
      });
      b.with({ kind: K.PLAIN, color: 0x1a1612 }, () => {
        for (const sd of [-1, 1]) obox(b, sd * 0.05, 0.07, 0.22, 0.012, 0.012, 0.01, 0);
      });
    }), mat));
    this.legs = [];
    for (const [x, z] of [[0.12, 0.24], [-0.12, 0.24], [0.12, -0.24], [-0.12, -0.24]]) {
      const l = node(this.body, x, -0.15, z);
      l.add(mesh(cached('sheepLeg', (b) => b.with({ kind: K.SKIN, color: legCol }, () => lathe(b, v3(0, -0.38, 0), 'y', [[0.025, 0], [0.032, 0.38]], 6))), mat));
      this.legs.push(l);
    }
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    const seed = p.seed ?? 0;
    this.body.position.y = 0.52;
    this.body.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    for (const l of this.legs) l.rotation.set(0, 0, 0);
    if (name === 'walk') {
      this.legs[0].rotation.x = this.legs[3].rotation.x = Math.sin(ph) * 0.35;
      this.legs[1].rotation.x = this.legs[2].rotation.x = -Math.sin(ph) * 0.35;
      this.neck.rotation.x = 0.2;
    } else if (name === 'graze') {
      this.neck.rotation.x = 1.05 + Math.sin(t * 3 + seed) * 0.05;
      this.neck.rotation.y = Math.sin(t * 0.3 + seed) * 0.25;
    } else if (name === 'lie') {
      this.body.position.y = 0.3;
      for (const l of this.legs) l.rotation.x = -1.4;
      this.neck.rotation.x = -0.1;
      this.neck.rotation.y = Math.sin(t * 0.25 + seed) * 0.4;
    } else {
      this.neck.rotation.x = -0.15;
      this.neck.rotation.y = Math.sin(t * 0.5 + seed) * 0.5;
    }
  }
}

// ---------------------------------------------------------------------------
// Birds wheel round in loose circles, flapping and gliding by turns.
export class Bird {
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const col = opts.color ?? 0x2e2e34;
    const wingCol = opts.wing ?? col;
    const span = opts.span ?? 0.35;
    const len = opts.len ?? 0.17;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0, 0);
    this.body.add(mesh(cached(`birdBody${col}${len}`, (b) => {
      lump(b, 0, 0, 0, len * 0.32, len * 0.3, len, col, K.FUR);
      lump(b, 0, len * 0.12, len * 0.9, len * 0.28, len * 0.28, len * 0.3, opts.head ?? col, K.FUR);
      b.with({ kind: K.PLAIN, color: opts.beak ?? 0x222222 }, () => lathe(b, v3(0, len * 0.1, len * 1.15), 'z', [[len * 0.07, 0], [0.002, len * 0.3]], 5));
      b.with({ kind: K.FUR, color: col }, () => beam(b, v3(0, 0, -len * 0.8), v3(0, 0, -len * 1.6), len * 0.5, len * 0.05));
    }), mat));
    this.wings = [];
    for (const sd of [-1, 1]) {
      const w = node(this.body, sd * len * 0.2, len * 0.1, len * 0.1);
      w.add(mesh(cached(`birdWing${sd}${wingCol}${span}`, (b) => b.with({ kind: K.FUR, color: wingCol }, () => {
        beam(b, v3(0, 0, 0.02), v3(sd * span * 0.55, 0.0, 0.0), len * 0.75, 0.012);
        beam(b, v3(sd * span * 0.5, 0, -0.01), v3(sd * span, 0.0, -len * 0.5), len * 0.45, 0.01);
      })), mat));
      this.wings.push(w);
    }
    // flight: a loose circle with a drifting radius and height
    this.c = opts.centre;
    this.r = opts.radius ?? 10;
    this.h = opts.height ?? 22;
    this.w = (opts.speed ?? 0.45) * (opts.dir ?? 1);
    this.ph = opts.phase ?? 0;
    this.seed = opts.seed ?? 0;
    this.flapRate = opts.flap ?? 13;
  }
  update(t) {
    const a = this.ph + t * this.w;
    const r = this.r * (1 + 0.18 * Math.sin(t * 0.21 + this.seed));
    const x = this.c[0] + Math.cos(a) * r;
    const z = this.c[1] + Math.sin(a) * r;
    const y = this.h + 1.5 * Math.sin(t * 0.37 + this.seed * 2) + 0.5 * Math.sin(t * 1.3 + this.seed);
    this.root.position.set(x, y, z);
    // heading along the circle, banked into the turn
    const dir = Math.sign(this.w);
    this.root.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), 0);
    this.body.rotation.z = -0.35 * dir;
    const flapping = Math.sin(t * 0.6 + this.seed * 3) > -0.2;
    const f = flapping ? Math.sin(t * this.flapRate + this.seed * 5) * 0.6 : 0.08;
    this.wings[0].rotation.z = f;
    this.wings[1].rotation.z = -f;
  }
}

// ---------------------------------------------------------------------------
// Larger livestock: cattle, pigs and goats share one four-legged body,
// shaped by a handful of proportions. The legs are hinged at the hip and
// knee so a walk has a little bend in it.
const BEASTS = {
  cow: { len: 0.78, w: 0.32, h: 0.37, y: 0.98, leg: 0.74, neck: 0.42, neckUp: 0.35, head: 0.24, muzzle: 0.18, horns: 0.16, ears: 0.12, tail: 0.75, udder: true, radius: 0.55 },
  ox: { len: 0.85, w: 0.36, h: 0.4, y: 1.05, leg: 0.78, neck: 0.45, neckUp: 0.3, head: 0.26, muzzle: 0.18, horns: 0.32, ears: 0.12, tail: 0.8, radius: 0.6 },
  pig: { len: 0.55, w: 0.27, h: 0.28, y: 0.52, leg: 0.36, neck: 0.12, neckUp: -0.1, head: 0.2, muzzle: 0.16, snout: true, ears: 0.1, floppy: true, tail: 0.12, curly: true, radius: 0.4 },
  goat: { len: 0.42, w: 0.17, h: 0.21, y: 0.66, leg: 0.52, neck: 0.3, neckUp: 0.8, head: 0.14, muzzle: 0.12, horns: 0.22, swept: true, ears: 0.09, beard: true, tail: 0.1, up: true, radius: 0.32 },
};

export class Beast {
  /** kind: 'cow' | 'ox' | 'pig' | 'goat'; opts: color, dark (patches), scale, patches */
  constructor(label, group, kind, opts = {}) {
    const k = BEASTS[kind];
    this.k = k;
    this.kind = kind;
    const mat = figureMaterial(label, group);
    const col = opts.color ?? 0x8a5a3a;
    const dark = opts.dark ?? new THREE.Color(col).multiplyScalar(0.55).getHex();
    const pale = opts.pale ?? 0xe8ddc8;
    const s = opts.scale ?? 1;
    this.s = s;
    this.radius = k.radius * s;
    this.root = new THREE.Group();
    this.root.scale.setScalar(s);
    // stand the body on its legs: hip joints sit 0.45 of the way down the barrel
    this.y0 = k.h * 0.45 + k.leg - 0.02;
    this.body = node(this.root, 0, this.y0, 0);
    const key = `${kind}${col}${dark}${opts.patches ? 1 : 0}`;
    this.body.add(mesh(cached(`beastBody${key}`, (b) => {
      lump(b, 0, 0, 0, k.w, k.h, k.len, col, K.FUR);
      lump(b, 0, 0.04, k.len * 0.55, k.w * 1.02, k.h * 1.02, k.len * 0.42, col, K.FUR); // shoulders
      lump(b, 0, 0.03, -k.len * 0.6, k.w * 0.98, k.h * 0.95, k.len * 0.38, col, K.FUR); // haunch
      if (opts.patches) {
        lump(b, k.w * 0.45, k.h * 0.3, -k.len * 0.2, k.w * 0.6, k.h * 0.7, k.len * 0.35, dark, K.FUR);
        lump(b, -k.w * 0.4, k.h * 0.1, k.len * 0.4, k.w * 0.65, k.h * 0.8, k.len * 0.3, dark, K.FUR);
      }
      if (k.udder) lump(b, 0, -k.h * 0.95, -k.len * 0.5, k.w * 0.4, k.h * 0.28, k.len * 0.16, 0xe0a8a0, K.SKIN);
      if (k.snout) b.with({ kind: K.FUR, color: dark }, () => obox(b, 0, k.h * 0.92, 0, 0.05, 0.05, k.len * 1.3, 0)); // bristly ridge
    }), mat));
    this.neck = node(this.body, 0, k.h * 0.35, k.len * 0.85);
    this.neck.add(mesh(cached(`beastNeck${key}`, (b) => {
      if (k.neck > 0.15) b.with({ kind: K.FUR, color: col }, () => lathe(b, v3(0, 0, 0), v3(0, k.neckUp, 1), [[k.w * 0.75, 0], [k.w * 0.5, k.neck]], 10));
    }), mat));
    const dir = new THREE.Vector3(0, k.neckUp, 1).normalize();
    this.head = node(this.neck, 0, dir.y * k.neck, dir.z * k.neck);
    this.head.add(mesh(cached(`beastHead${key}`, (b) => {
      const hc = opts.face ?? col;
      lump(b, 0, 0, 0.02, k.head * 0.7, k.head * 0.75, k.head * 0.8, hc, K.FUR);
      // the muzzle, pointing forward and down
      b.with({ kind: K.FUR, color: hc }, () => lathe(b, v3(0, -0.02, k.head * 0.4), v3(0, -0.55, 1), [[k.head * 0.55, 0], [k.head * 0.42, k.muzzle]], 10));
      const tip = v3(0, -0.02, k.head * 0.4).addScaledVector(v3(0, -0.55, 1).normalize(), k.muzzle);
      if (k.snout) b.with({ kind: K.SKIN, color: 0xd89a8a }, () => lathe(b, tip, v3(0, -0.4, 1), [[k.head * 0.36, 0], [k.head * 0.36, 0.04]], 10));
      else b.with({ kind: K.SKIN, color: kind === 'goat' ? 0x5a4a3c : 0x3a302a }, () => lump(b, 0, tip.y, tip.z, k.head * 0.36, k.head * 0.25, k.head * 0.15, 0x3a302a, K.SKIN));
      b.with({ kind: K.PLAIN, color: 0x1a1612 }, () => {
        for (const sd of [-1, 1]) obox(b, sd * k.head * 0.55, k.head * 0.2, k.head * 0.25, 0.02, 0.02, 0.015, 0);
      });
      if (k.ears) b.with({ kind: K.FUR, color: hc }, () => {
        for (const sd of [-1, 1]) {
          if (k.floppy) beam(b, v3(sd * k.head * 0.4, k.head * 0.5, k.head * 0.1), v3(sd * k.head * 0.75, k.head * 0.15, k.head * 0.55), 0.09, 0.02);
          else beam(b, v3(sd * k.head * 0.55, k.head * 0.35, 0), v3(sd * (k.head * 0.55 + k.ears), k.head * 0.3, -0.02), 0.07, 0.02);
        }
      });
      if (k.horns) b.with({ kind: K.PLAIN, color: 0xd8ccb0 }, () => {
        for (const sd of [-1, 1]) {
          const base = v3(sd * k.head * 0.45, k.head * 0.6, -0.02);
          const mid = k.swept ? v3(sd * k.head * 0.55, k.head * 0.6 + k.horns * 0.7, -k.horns * 0.5) : v3(sd * (k.head * 0.45 + k.horns * 0.7), k.head * 0.7, 0.02);
          const end = k.swept ? v3(sd * k.head * 0.65, k.head * 0.6 + k.horns * 0.8, -k.horns) : v3(sd * (k.head * 0.45 + k.horns), k.head * 0.6 + k.horns * 0.5, 0.06);
          beam(b, base, mid, 0.045, 0.045);
          beam(b, mid, end, 0.035, 0.02);
        }
      });
      if (k.beard) b.with({ kind: K.FUR, color: pale }, () => beam(b, v3(0, -k.head * 0.5, k.head * 0.55), v3(0, -k.head * 1.05, k.head * 0.5), 0.05, 0.02));
    }), mat));
    // legs: thigh and shank, hinged at the knee (hocks bend the other way behind)
    this.legs = [];
    const lx = k.w * 0.6;
    const lz = k.len * 0.68;
    const half = k.leg / 2;
    for (const [x, z, rear] of [[lx, lz, 0], [-lx, lz, 0], [lx, -lz, 1], [-lx, -lz, 1]]) {
      const up = node(this.body, x, -k.h * 0.45, z);
      const legCol = k.snout ? col : col;
      up.add(mesh(cached(`beastThigh${kind}${legCol}${rear}`, (b) => b.with({ kind: K.FUR, color: legCol }, () => lathe(b, v3(0, -half - 0.02, 0), 'y', [[k.w * 0.18, 0], [k.w * (rear ? 0.4 : 0.3), half + 0.1]], 8))), mat));
      const lo = node(up, 0, -half + 0.02, 0);
      lo.add(mesh(cached(`beastShank${kind}${legCol}`, (b) => {
        b.with({ kind: K.FUR, color: legCol }, () => lathe(b, v3(0, -half + 0.04, 0), 'y', [[k.w * 0.13, 0], [k.w * 0.17, half - 0.04]], 8));
        b.with({ kind: K.PLAIN, color: 0x2e2620 }, () => lathe(b, v3(0, -half - 0.04 + 0.04, 0.01), 'y', [[k.w * 0.17, 0], [k.w * 0.14, 0.06]], 8)); // hoof
      }), mat));
      this.legs.push([up, lo, rear]);
    }
    this.tail = node(this.body, 0, k.h * 0.5, -k.len * 0.98);
    this.tail.add(mesh(cached(`beastTail${kind}${col}`, (b) => {
      b.with({ kind: K.FUR, color: col }, () => {
        if (k.curly) {
          beam(b, v3(0, 0, 0), v3(0.04, 0.05, -0.06), 0.03, 0.025);
          beam(b, v3(0.04, 0.05, -0.06), v3(-0.02, 0.08, -0.08), 0.025, 0.02);
        } else if (k.up) beam(b, v3(0, 0, 0), v3(0, 0.09, -0.06), 0.05, 0.03);
        else {
          lathe(b, v3(0, 0, 0), v3(0, -1, -0.12), [[0.025, 0], [0.015, k.tail]], 6);
          lump(b, 0, -k.tail * 0.97, -0.1, 0.05, 0.09, 0.05, dark, K.FUR);
        }
      });
    }), mat));
    this.seed = opts.seed ?? Math.random() * 6;
  }
  pose(name, t, p = {}) {
    const k = this.k;
    const ph = p.phase ?? 0;
    const seed = p.seed ?? this.seed;
    const b = this.body;
    b.position.y = this.y0;
    b.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    for (const [up, lo] of this.legs) {
      up.rotation.set(0, 0, 0);
      lo.rotation.set(0, 0, 0);
    }
    // the tail swishes at flies now and then
    const swish = Math.sin(t * 0.7 + seed) > 0.4 ? Math.sin(t * 5 + seed) : Math.sin(t * 1.1 + seed) * 0.2;
    this.tail.rotation.set(0.05, 0, swish * 0.35);
    if (name === 'walk' || name === 'trot') {
      const a = (name === 'trot' ? 0.5 : 0.32) * (p.stepAmt ?? 1);
      // diagonal pairs move together; the knee folds as the foot comes forward
      const legs = this.legs;
      const phs = [ph, ph + Math.PI, ph + Math.PI, ph];
      legs.forEach(([up, lo, rear], i) => {
        const s = Math.sin(phs[i]);
        up.rotation.x = s * a;
        const lift = Math.max(0, Math.cos(phs[i] + 0.3)) * a * 1.6;
        lo.rotation.x = rear ? -lift : lift;
        if (rear) up.rotation.x -= lift * 0.3;
      });
      b.position.y = this.y0 + Math.abs(Math.cos(ph)) * 0.015 * (p.stepAmt ?? 1);
      b.rotation.z = Math.sin(ph) * 0.02;
      this.neck.rotation.x = 0.1 + Math.sin(ph * 2) * 0.04;
    } else if (name === 'graze' || name === 'root') {
      // head down to the grass (or a pig's snout in the mud), chewing
      const down = this.kind === 'pig' ? 0.45 : k.neckUp > 0.5 ? 1.5 : 1.15;
      this.neck.rotation.x = down + Math.sin(t * 2.6 + seed) * 0.04;
      this.head.rotation.x = 0.3 + (name === 'root' ? Math.max(0, Math.sin(t * 6 + seed)) * 0.25 : 0);
      this.neck.rotation.y = Math.sin(t * 0.3 + seed) * 0.25;
      for (const [up, , rear] of this.legs) if (!rear) up.rotation.x = -0.12;
      if (this.kind === 'pig') b.rotation.x = 0.06;
    } else if (name === 'eat') {
      // at a trough or manger: head down, steady
      this.neck.rotation.x = this.kind === 'pig' ? 0.35 : 0.9;
      this.head.rotation.x = 0.25 + Math.sin(t * 3.4 + seed) * 0.06;
    } else if (name === 'lie') {
      // lying down, legs folded under, chewing the cud
      b.position.y = this.y0 * 0.42;
      for (const [up, lo, rear] of this.legs) {
        up.rotation.x = rear ? 1.4 : -1.35;
        lo.rotation.x = rear ? -2.3 : 2.4;
      }
      this.neck.rotation.x = -0.15;
      this.neck.rotation.y = Math.sin(t * 0.2 + seed) * 0.35;
      this.head.rotation.x = Math.sin(t * 2.2 + seed) * 0.03;
      if (this.kind === 'pig') {
        b.rotation.z = 1.2; // flat out on its side
        b.position.y = k.w * 0.85;
        this.neck.rotation.set(0, 0, 0);
      }
    } else if (name === 'suckle') {
      // a piglet at the sow's teats
      this.neck.rotation.x = -0.3;
      this.head.rotation.x = Math.sin(t * 8 + seed) * 0.08;
      b.position.y = this.y0 * 0.75;
      for (const [up, lo, rear] of this.legs) {
        up.rotation.x = rear ? 0.6 : -0.3;
        lo.rotation.x = rear ? -1.0 : 0.6;
      }
    } else {
      // standing: looking about
      this.neck.rotation.x = -0.05;
      this.neck.rotation.y = Math.sin(t * 0.4 + seed) * 0.5;
      this.head.rotation.x = Math.sin(t * 0.9 + seed) * 0.05;
    }
  }
}

// ---------------------------------------------------------------------------
export class Goose {
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const col = opts.color ?? 0xece8dc;
    const wing = opts.wing ?? new THREE.Color(col).multiplyScalar(0.85).getHex();
    this.radius = 0.2;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0.3, 0);
    this.body.add(mesh(cached(`gooseBody${col}`, (b) => {
      lump(b, 0, 0, 0, 0.15, 0.14, 0.27, col, K.FUR);
      lump(b, 0, -0.02, 0.1, 0.14, 0.13, 0.15, col, K.FUR);
      for (const sd of [-1, 1]) lump(b, sd * 0.11, 0.04, -0.04, 0.05, 0.08, 0.2, wing, K.FUR);
      b.with({ kind: K.FUR, color: wing }, () => beam(b, v3(0, 0.03, -0.22), v3(0, 0.08, -0.33), 0.12, 0.03));
    }), mat));
    this.neck = node(this.body, 0, 0.06, 0.22);
    this.neck.add(mesh(cached(`gooseNeck${col}`, (b) => {
      b.with({ kind: K.FUR, color: col }, () => lathe(b, v3(0, 0, 0), v3(0, 1, 0.25), [[0.055, 0], [0.04, 0.32]], 8));
      lump(b, 0, 0.33, 0.1, 0.05, 0.05, 0.07, col, K.FUR);
      b.with({ kind: K.PLAIN, color: 0xe08a2a }, () => lathe(b, v3(0, 0.32, 0.15), 'z', [[0.026, 0], [0.012, 0.09]], 6));
      b.with({ kind: K.PLAIN, color: 0x1a1612 }, () => {
        for (const sd of [-1, 1]) obox(b, sd * 0.042, 0.345, 0.12, 0.01, 0.012, 0.012, 0);
      });
    }), mat));
    this.legs = [];
    for (const sd of [-1, 1]) {
      const l = node(this.body, sd * 0.06, -0.08, 0.02);
      l.add(mesh(cached('gooseLeg', (b) => b.with({ kind: K.PLAIN, color: 0xe08a2a }, () => {
        beam(b, v3(0, 0, 0), v3(0, -0.22, 0), 0.025, 0.025);
        obox(b, 0, -0.22, 0.04, 0.08, 0.012, 0.1, 0);
      })), mat));
      this.legs.push(l);
    }
    this.seed = opts.seed ?? Math.random() * 6;
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    const seed = p.seed ?? this.seed;
    this.body.position.y = 0.3;
    this.body.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    this.legs[0].rotation.x = this.legs[1].rotation.x = 0;
    if (name === 'walk') {
      this.legs[0].rotation.x = Math.sin(ph) * 0.5;
      this.legs[1].rotation.x = -Math.sin(ph) * 0.5;
      this.body.rotation.z = Math.sin(ph) * 0.12; // the waddle
      this.neck.rotation.x = 0.15 + Math.sin(ph * 2) * 0.05;
    } else if (name === 'graze' || name === 'peck') {
      this.neck.rotation.x = 1.5 + Math.max(0, Math.sin(t * 4 + seed)) * 0.25;
      this.body.rotation.x = 0.2;
    } else if (name === 'hiss') {
      this.neck.rotation.x = 0.9;
      this.body.rotation.x = 0.1;
      this.neck.rotation.y = Math.sin(t * 9) * 0.1;
    } else if (name === 'swim') {
      this.body.position.y = 0.06;
      this.legs[0].rotation.x = -1.2;
      this.legs[1].rotation.x = -1.2;
      this.neck.rotation.x = Math.sin(t * 0.5 + seed) * 0.2;
      this.body.rotation.z = Math.sin(t * 1.2 + seed) * 0.04;
    } else {
      this.neck.rotation.x = -0.1;
      this.neck.rotation.y = Math.sin(t * 0.7 + seed) * 0.6;
    }
  }
}
