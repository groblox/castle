import * as THREE from 'three';
import { K } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { obox, beam, v3 } from '../geom/shapes.js';
import { partGeo, figureMaterial, mesh, node } from './parts.js';

// Animals face +z locally, like the figures.

export class Cat {
  constructor(label, group) {
    const mat = figureMaterial(label, group);
    const fur = 0x8a7a66;
    const dark = 0x4e4438;
    this.root = new THREE.Group();
    const body = node(this.root, 0, 0.2, 0);
    this.body = body;
    body.add(mesh(partGeo((b) => {
      lump(b, 0, 0.0, 0, 0.09, 0.085, 0.2, fur, K.FUR);
      for (let i = 0; i < 4; i++) b.with({ kind: K.PLAIN, color: dark }, () => obox(b, 0, 0.07, -0.12 + i * 0.07, 0.12, 0.02, 0.025, 0));
    }), mat));
    const head = node(body, 0, 0.08, 0.2);
    this.head = head;
    head.add(mesh(partGeo((b) => {
      lump(b, 0, 0, 0, 0.065, 0.058, 0.065, fur, K.FUR);
      lump(b, 0, -0.015, 0.05, 0.03, 0.022, 0.03, 0xb8a68c, K.FUR);
      for (const s of [-1, 1]) {
        b.with({ kind: K.FUR, color: dark }, () => lathe(b, v3(s * 0.035, 0.04, -0.005), 'y', [[0.022, 0], [0.001, 0.05]], 4));
        b.with({ kind: K.PLAIN, color: 0x6a8a3a }, () => obox(b, s * 0.025, 0.012, 0.058, 0.016, 0.01, 0.01, 0));
      }
    }), mat));
    this.legs = [];
    for (const [x, z] of [[0.05, 0.12], [-0.05, 0.12], [0.05, -0.12], [-0.05, -0.12]]) {
      const l = node(body, x, -0.02, z);
      l.add(mesh(partGeo((b) => b.with({ kind: K.FUR, color: fur }, () => lathe(b, v3(0, -0.18, 0), 'y', [[0.018, 0], [0.025, 0.18]], 6))), mat));
      this.legs.push(l);
    }
    this.tail = [];
    let parent = node(body, 0, 0.04, -0.19);
    for (let i = 0; i < 3; i++) {
      const seg = node(parent, 0, 0, i === 0 ? 0 : -0.09);
      seg.add(mesh(partGeo((b) => b.with({ kind: K.FUR, color: i === 2 ? dark : fur }, () => lathe(b, v3(0, 0, -0.1), 'z', [[0.014, 0], [0.02, 0.1]], 6))), mat));
      this.tail.push(seg);
      parent = seg;
    }
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    const b = this.body;
    b.position.y = 0.2;
    b.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    for (const l of this.legs) l.rotation.set(0, 0, 0);
    const sway = Math.sin(t * 1.3);
    this.tail[0].rotation.set(0.6 + sway * 0.15, sway * 0.3, 0);
    this.tail[1].rotation.set(0.4, sway * 0.4, 0);
    this.tail[2].rotation.set(0.3, sway * 0.5, 0);
    if (name === 'walk' || name === 'trot') {
      const a = name === 'trot' ? 0.6 : 0.4;
      this.legs[0].rotation.x = Math.sin(ph) * a;
      this.legs[3].rotation.x = Math.sin(ph) * a;
      this.legs[1].rotation.x = -Math.sin(ph) * a;
      this.legs[2].rotation.x = -Math.sin(ph) * a;
      b.position.y = 0.2 + Math.abs(Math.cos(ph)) * 0.01;
    } else if (name === 'sit') {
      b.rotation.x = -0.55;
      b.position.y = 0.17;
      this.legs[2].rotation.x = 1.2;
      this.legs[3].rotation.x = 1.2;
      this.legs[0].rotation.x = 0.55;
      this.legs[1].rotation.x = 0.55;
      this.head.rotation.x = 0.5;
      this.head.rotation.y = Math.sin(t * 0.5) * 0.4;
      this.tail[0].rotation.set(1.4, 0.8, 0);
    } else if (name === 'crouch') { // stalking a rat
      b.position.y = 0.13;
      for (const l of this.legs) l.rotation.x = 0;
      this.legs[2].rotation.x = 0.6;
      this.legs[3].rotation.x = 0.6;
      this.tail[2].rotation.y = Math.sin(t * 6) * 0.8;
    } else if (name === 'groom') {
      b.rotation.x = -0.5;
      b.position.y = 0.17;
      this.legs[2].rotation.x = 1.2;
      this.legs[3].rotation.x = 1.2;
      this.legs[0].rotation.x = -0.9 + Math.sin(t * 5) * 0.3;
      this.head.rotation.x = 0.3 + Math.sin(t * 5) * 0.2;
      this.head.rotation.y = 0.5;
    } else if (name === 'lie') {
      b.position.y = 0.1;
      for (const l of this.legs) l.rotation.x = Math.PI / 2 - 0.2;
      this.head.rotation.x = 0.2;
      this.tail[0].rotation.set(0.1, 1.1, 0);
    }
  }
}

export class Rat {
  constructor(label, group) {
    const mat = figureMaterial(label, group);
    const fur = 0x4a4038;
    this.root = new THREE.Group();
    this.body = node(this.root, 0, 0.045, 0);
    this.body.add(mesh(partGeo((b) => {
      lump(b, 0, 0, 0, 0.04, 0.035, 0.085, fur, K.FUR);
      lump(b, 0, 0.005, 0.085, 0.025, 0.022, 0.04, fur, K.FUR);
      for (const s of [-1, 1]) lump(b, s * 0.018, 0.028, 0.075, 0.012, 0.014, 0.006, 0x8a6a62, K.SKIN);
      b.with({ kind: K.SKIN, color: 0x8a6a62 }, () => beam(b, v3(0, 0, -0.08), v3(0, -0.03, -0.22), 0.008, 0.008));
    }), mat));
  }
  pose(name, t, p = {}) {
    const ph = p.phase ?? 0;
    this.body.position.y = 0.045 + (name === 'run' ? Math.abs(Math.sin(ph)) * 0.015 : 0);
    this.body.rotation.x = name === 'rear' ? -0.9 : 0;
    this.body.rotation.y = name === 'sniff' ? Math.sin(t * 7) * 0.2 : 0;
  }
}

export class Horse {
  /** opts.coat / opts.dark: colours; opts.harness: false for a stabled horse without its collar */
  constructor(label, group, opts = {}) {
    const mat = figureMaterial(label, group);
    const coat = opts.coat ?? 0x7a5a40;
    const dark = opts.dark ?? 0x3e2e22;
    const harness = opts.harness ?? true;
    this.radius = 0.6;
    this.root = new THREE.Group();
    const body = node(this.root, 0, 1.18, 0);
    this.body = body;
    body.add(mesh(partGeo((b) => {
      lump(b, 0, 0, 0, 0.32, 0.36, 0.78, coat, K.FUR);
      if (harness) {
        // collar and harness
        b.with({ kind: K.CLOTH, color: 0x5a3a26 }, () => lathe(b, v3(0, 0.05, 0.62), 'z', [[0.3, 0], [0.3, 0.12]], 12));
        b.with({ kind: K.CLOTH, color: 0x4a3020 }, () => {
          obox(b, 0, 0.0, 0.05, 0.66, 0.08, 0.1, 0);
          obox(b, 0, 0.33, 0.1, 0.34, 0.04, 0.4, 0);
        });
      }
    }), mat));
    const neck = node(body, 0, 0.18, 0.62);
    this.neck = neck;
    neck.add(mesh(partGeo((b) => {
      b.set({ kind: K.FUR, color: coat });
      lathe(b, v3(0, 0, 0), v3(0, 0.75, 0.55), [[0.2, 0], [0.13, 0.75]], 10);
      b.with({ color: dark }, () => beam(b, v3(0, 0.25, -0.05), v3(0, 0.62, 0.32), 0.06, 0.12)); // mane
    }), mat));
    const head = node(neck, 0, 0.6, 0.45);
    this.head = head;
    head.add(mesh(partGeo((b) => {
      b.set({ kind: K.FUR, color: coat });
      lathe(b, v3(0, 0, 0), v3(0, -0.55, 0.45), [[0.12, 0], [0.08, 0.55]], 10);
      for (const s of [-1, 1]) b.with({ color: dark }, () => lathe(b, v3(s * 0.06, 0.06, -0.02), 'y', [[0.035, 0], [0.003, 0.14]], 5));
      b.with({ kind: K.PLAIN, color: 0x1e1814 }, () => {
        obox(b, 0.085, -0.1, 0.1, 0.02, 0.025, 0.03, 0);
        obox(b, -0.085, -0.1, 0.1, 0.02, 0.025, 0.03, 0);
      });
      b.with({ kind: K.CLOTH, color: 0x4a3020 }, () => beam(b, v3(-0.1, -0.2, 0.18), v3(0.1, -0.2, 0.18), 0.03, 0.03));
    }), mat));
    this.legs = [];
    for (const [x, z] of [[0.18, 0.5], [-0.18, 0.5], [0.18, -0.52], [-0.18, -0.52]]) {
      const up = node(body, x, -0.2, z);
      up.add(mesh(partGeo((b) => b.with({ kind: K.FUR, color: coat }, () => lathe(b, v3(0, -0.5, 0), 'y', [[0.06, 0], [0.1, 0.5]], 8))), mat));
      const lo = node(up, 0, -0.5, 0);
      lo.add(mesh(partGeo((b) => {
        b.with({ kind: K.FUR, color: coat }, () => lathe(b, v3(0, -0.42, 0), 'y', [[0.05, 0], [0.055, 0.42]], 8));
        b.with({ kind: K.PLAIN, color: 0x2e2620 }, () => lathe(b, v3(0, -0.48, 0.01), 'y', [[0.07, 0], [0.055, 0.08]], 8));
      }), mat));
      this.legs.push([up, lo]);
    }
    const tail = node(body, 0, 0.2, -0.76);
    this.tail = tail;
    tail.add(mesh(partGeo((b) => b.with({ kind: K.FUR, color: dark }, () => lathe(b, v3(0, 0, 0), v3(0, -0.8, -0.18), [[0.06, 0], [0.03, 0.82]], 6))), mat));
  }
  pose(name, t, p = {}) {
    const sd = p.seed ?? 0;
    for (const [up, lo] of this.legs) {
      up.rotation.x = 0;
      lo.rotation.x = 0;
    }
    this.head.rotation.set(0, 0, 0);
    this.tail.rotation.z = 0.25 * Math.sin(t * 1.9 + sd) * (Math.sin(t * 0.37 + sd) > 0.3 ? 1 : 0.2);
    if (name === 'walk') {
      // a walk: diagonal pairs of legs, knees folding as the hoof comes through
      const ph = p.phase ?? 0;
      const a = 0.3 * (p.stepAmt ?? 1);
      [ph, ph + Math.PI, ph + Math.PI, ph].forEach((q, i) => {
        const [up, lo] = this.legs[i];
        up.rotation.x = Math.sin(q) * a;
        lo.rotation.x = (i < 2 ? 1 : -1) * Math.max(0, Math.cos(q + 0.3)) * a * 1.8;
      });
      this.neck.rotation.x = 0.1 + Math.sin(ph * 2) * 0.05;
      this.body.position.y = 1.18 + Math.abs(Math.cos(ph)) * 0.02;
      return;
    }
    if (name === 'eat') {
      // head down in the manger or at the hay
      this.neck.rotation.x = 0.75 + Math.sin(t * 0.4 + sd) * 0.05;
      this.head.rotation.x = 0.35 + Math.sin(t * 3.1 + sd) * 0.05;
      this.body.position.y = 1.18;
      return;
    }
    this.neck.rotation.x = 0.08 * Math.sin(t * 0.5 + sd) + (Math.sin(t * 0.23 + sd) > 0.85 ? 0.35 : 0);
    this.head.rotation.x = 0.05 * Math.sin(t * 1.1 + sd);
    this.head.rotation.y = 0.1 * Math.sin(t * 0.31 + sd);
    // resting a hind leg now and then
    const rest = Math.sin(t * 0.13 + sd) > 0.4 ? 1 : 0;
    this.legs[3][1].rotation.x = 0.35 * rest;
    this.legs[3][0].rotation.x = -0.05 * rest;
    this.body.position.y = 1.18 - 0.02 * rest;
  }
}
