import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe } from '../geom/props.js';
import { beam, v3 } from '../geom/shapes.js';
import { S } from '../castle/spots.js';
import { lab } from '../data/labels.js';
import { G } from '../castle/rooms.js';
import { figureMaterial } from '../people/parts.js';
import { Mechanism } from './base.js';

// Roasting spit. Each joint keeps a ring of "doneness" values around the spit
// axis; whichever side faces the fire takes the heat, so an unturned spit
// burns on one side and stays raw on the other.

const BINS = 32;
const RAMP = [
  [0.0, [0.8, 0.45, 0.42]],
  [0.45, [0.84, 0.62, 0.42]],
  [1.0, [0.68, 0.43, 0.22]],
  [1.45, [0.45, 0.27, 0.14]],
  [2.0, [0.2, 0.14, 0.1]],
];
const RAMP_FOWL = [
  [0.0, [0.93, 0.82, 0.72]],
  [0.45, [0.9, 0.72, 0.48]],
  [1.0, [0.74, 0.5, 0.25]],
  [1.45, [0.48, 0.3, 0.15]],
  [2.0, [0.2, 0.14, 0.1]],
];
function ramp(r, d) {
  for (let i = 0; i < r.length - 1; i++) {
    if (d <= r[i + 1][0]) {
      const k = (d - r[i][0]) / (r[i + 1][0] - r[i][0]);
      return r[i][1].map((c, j) => c + (r[i + 1][1][j] - c) * k);
    }
  }
  return r[r.length - 1][1];
}

export class Spit extends Mechanism {
  constructor(app) {
    super(app, { id: 'spit', name: 'Roasting spit', room: 'kitchen', hint: 'Drag the crank to turn the spit' });
    const sp = S.kitchen.spit;
    this.sp = sp;
    this.angle = 0;
    this.boyTurning = true;
    this.drive = 0;
    this.rot = new THREE.Group();
    this.rot.position.set(0, sp.y, sp.z);
    this.group.add(this.rot);
    this.part('spit', (b) => {
      b.with({ kind: K.METAL, color: P.iron }, () => lathe(b, v3(sp.x0 - 0.3, 0, 0), 'x', [[0.022, 0], [0.022, sp.crankX - sp.x0 + 0.3]], 8));
    }, this.rot);
    this.part('crank', (b) => {
      b.set({ kind: K.METAL, color: P.iron });
      beam(b, v3(sp.crankX, 0, 0), v3(sp.crankX, 0.28, 0), 0.04, 0.025);
      b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(sp.crankX, 0.28, 0), 'x', [[0.03, 0], [0.03, 0.16]], 8));
    }, this.rot);
    // the joints
    const fireDir = new THREE.Vector2(0.45 - sp.y, S.kitchen.roastFire[2] - sp.z); // (dy, dz) towards the fire
    this.fireAng = Math.atan2(fireDir.y, fireDir.x);
    this.joints = [
      this._joint(-3.5, 0.42, 0.17, 0.155, RAMP, 1),
      this._joint(-4.45, 0.17, 0.12, 0.11, RAMP_FOWL, 2),
      this._joint(-2.55, 0.17, 0.12, 0.11, RAMP_FOWL, 3),
    ];
    this.drips = app.world.fx.add('drips', [[-3.5, sp.y - 0.12, sp.z], [-4.45, sp.y - 0.08, sp.z], [-2.55, sp.y - 0.08, sp.z]], 4, {
      kind: 'spark', life: 0.8, rise: -0.62, spread: 0.05, size0: 0.04, size1: 0.03, color: 0xe8c060, color2: 0xd09a3a, alpha: 0.9, jitter: [0.4, 0, 0.05], on: 0, order: 5,
    });
    this._recolor();
  }

  _joint(x, hx, ry, rz, rampTbl, seed) {
    const geo = new THREE.SphereGeometry(1, 24, 14).toNonIndexed();
    const pos = geo.attributes.position;
    const ang = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      let px = pos.getX(i);
      let py = pos.getY(i);
      let pz = pos.getZ(i);
      // lumpy, slightly tapered shape along the spit
      const lumpy = 1 + 0.08 * Math.sin(px * 7 + seed) * Math.cos(py * 5 + seed * 2) + 0.05 * Math.sin(pz * 9);
      const taper = 1 - 0.18 * px;
      py *= ry * lumpy * taper;
      pz *= rz * lumpy * taper;
      px *= hx;
      pos.setXYZ(i, px + x, py, pz);
      ang[i] = Math.atan2(pz, py);
    }
    geo.computeVertexNormals();
    const n = pos.count;
    geo.setAttribute('acol', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const info = new Float32Array(n * 3);
    const label = lab('roast', 'kitchen', 'spit');
    for (let i = 0; i < n; i++) {
      info[i * 3] = K.PLAIN;
      info[i * 3 + 1] = label;
      info[i * 3 + 2] = G.people;
    }
    geo.setAttribute('info', new THREE.BufferAttribute(info, 3));
    const m = new THREE.Mesh(geo, figureMaterial(label, G.people));
    m.frustumCulled = false;
    this.rot.add(m);
    return { mesh: m, ang, d: new Float32Array(BINS), ramp: rampTbl };
  }

  _recolor() {
    for (const j of this.joints) {
      const col = j.mesh.geometry.attributes.acol;
      for (let i = 0; i < j.ang.length; i++) {
        const f = ((j.ang[i] / (Math.PI * 2)) % 1 + 1) % 1 * BINS;
        const b0 = Math.floor(f) % BINS;
        const b1 = (b0 + 1) % BINS;
        const k = f - Math.floor(f);
        const d = j.d[b0] * (1 - k) + j.d[b1] * k;
        const c = j.ramp === RAMP ? ramp(RAMP, d) : ramp(RAMP_FOWL, d);
        col.setXYZ(i, c[0], c[1], c[2]);
      }
      col.needsUpdate = true;
    }
  }

  /** Average doneness and the spread between the most and least done sides. */
  get doneness() {
    const d = this.joints[0].d;
    let s = 0;
    let lo = 9;
    let hi = 0;
    for (const v of d) {
      s += v;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return { avg: s / d.length, lo, hi };
  }

  grab(e) {
    this.boyTurning = false;
    this.bump();
    return this.crankDrag(e, (a) => {
      this.angle += a;
    });
  }
  click() {}

  controls() {
    return [
      { id: 'turn', label: 'Turn the spit (hold)', hold: true },
      { id: 'boy', label: this.boyTurning ? 'Stop the spit boy' : 'Let the spit boy turn it', next: !this.boyTurning && !this.userActive },
      { id: 'fresh', label: 'Put on fresh meat' },
    ];
  }
  act(id, down) {
    if (id === 'turn') {
      this.drive = down ? 1 : 0;
      if (down) {
        this.boyTurning = false;
        this.touched();
      }
    } else if (id === 'boy') {
      this.boyTurning = !this.boyTurning;
      if (!this.boyTurning) this.toast('Stopped. Now only one side faces the fire: watch it brown, then char, while the far side stays raw.');
      else this.toast('The spit boy takes up the crank again. Steady turning bastes the joint in its own fat and cooks it evenly.');
    } else if (id === 'fresh') {
      for (const j of this.joints) j.d.fill(0);
      this._recolor();
    }
    this.bump();
  }
  status() {
    const { avg, lo, hi } = this.doneness;
    const word = avg < 0.25 ? 'raw' : avg < 0.7 ? 'colouring' : avg < 1.1 ? 'nicely browned' : avg < 1.5 ? 'well done' : 'burnt';
    const turner = this.userActive ? 'You are turning the spit.' : this.boyTurning ? 'The spit boy is turning it.' : 'Nobody is turning it.';
    const uneven = hi - lo > 0.6 ? ' One side is far more done than the other.' : '';
    return `${turner} The haunch is ${word}.${uneven}`;
  }

  update(t, dt) {
    let omega = 0;
    if (this.drive) omega = 2.4;
    else if (this.boyTurning && !this.userActive) omega = 2.2;
    this.angle += omega * dt;
    this.rot.rotation.x = this.angle;
    // heat each bin by how squarely it faces the fire
    const rate = dt / 12;
    for (const j of this.joints) {
      for (let b = 0; b < BINS; b++) {
        const a = (b / BINS) * Math.PI * 2 + this.angle;
        const h = Math.max(0, Math.cos(a - this.fireAng));
        j.d[b] = Math.min(2.2, j.d[b] + h * h * rate * (j.ramp === RAMP ? 1 : 1.25));
      }
    }
    this._accum = (this._accum || 0) + dt;
    if (this._accum > 0.12) {
      this._accum = 0;
      this._recolor();
      const s = this.status();
      if (s !== this._lastStatus) {
        this._lastStatus = s;
        this.bump();
      }
    }
    this.drips.material.uniforms.uOn.value = this.doneness.avg > 0.15 ? 1 : 0;
  }
}
