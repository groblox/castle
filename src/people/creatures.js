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
