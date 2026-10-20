import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { S } from '../castle/spots.js';
import { WELL } from '../castle/layout.js';
import { Mechanism } from './base.js';

// Well windlass: drum and cranks, rope and bucket down the cut shaft.
const DRUM_R = 0.17;

export class Windlass extends Mechanism {
  constructor(app) {
    super(app, { id: 'windlass', name: 'Well windlass', room: 'well', hint: 'Drag the crank up or down to wind the bucket' });
    const w = S.well;
    this.axleY = w.axleY;
    this.axleZ = w.axleZ;
    this.ropeX = WELL.x;
    this.ropeZ = w.axleZ + DRUM_R; // rope leaves the front of the drum
    this.minOut = 0.55;
    this.waterY = WELL.water;
    this.maxOut = this.axleY - (this.waterY - 0.12);
    this.out = this.minOut; // rope paid out (m)
    this.full = false;
    this.drive = 0;
    this.falling = false;
    this.pourT = -1;
    this.angle = 0;

    // rotating drum with its cranks
    this.drum = new THREE.Group();
    this.drum.position.set(0, this.axleY, this.axleZ);
    this.group.add(this.drum);
    this.part('windlass', (b) => {
      b.set({ kind: K.TIMBER, color: P.oak });
      lathe(b, v3(w.x0 + 0.02, 0, 0), 'x', [[DRUM_R, 0], [DRUM_R, w.x1 - w.x0 - 0.04]], 12);
      b.with({ kind: K.STRAW, color: 0xc8b48a }, () => lathe(b, v3(WELL.x - 0.45, 0, 0), 'x', [[DRUM_R + 0.04, 0], [DRUM_R + 0.05, 0.9]], 12)); // wound rope
      b.with({ kind: K.METAL, color: P.iron }, () => lathe(b, v3(w.x0 - 0.25, 0, 0), 'x', [[0.035, 0], [0.035, w.x1 - w.x0 + 0.5]], 8)); // axle
    }, this.drum);
    // a crank at each end, set opposite each other so two men can wind
    for (const [x, s] of [[w.x0 - 0.25, -1], [w.x1 + 0.25, 1]]) {
      this.part('crank', (b) => {
        b.set({ kind: K.METAL, color: P.iron });
        const r = s > 0 ? 0.38 : -0.38;
        beam(b, v3(x, 0, 0), v3(x, r, 0), 0.05, 0.03);
        b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(s > 0 ? x : x - 0.22, r, 0), 'x', [[0.035, 0], [0.035, 0.22]], 8));
      }, this.drum);
    }
    // rope and bucket
    this.rope = this.part('windlass', (b) => b.with({ kind: K.STRAW, color: 0xb8a070 }, () => obox(b, 0, -0.5, 0, 0.025, 1, 0.025, 0)));
    this.bucket = new THREE.Group();
    this.group.add(this.bucket);
    this.part('bucket', (b) => {
      b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(0, -0.42, 0), 'y', [[0.15, 0], [0.18, 0.34]], 12));
      b.with({ kind: K.METAL, color: P.iron }, () => {
        for (const y of [-0.38, -0.14]) lathe(b, v3(0, y, 0), 'y', [[0.17, 0], [0.18, 0.03]], 12);
        beam(b, v3(-0.18, -0.1, 0), v3(0, 0.02, 0), 0.015, 0.015);
        beam(b, v3(0.18, -0.1, 0), v3(0, 0.02, 0), 0.015, 0.015);
      });
    }, this.bucket);
    this.water = this.part('bucket', (b) => b.with({ kind: K.WATER, color: P.water }, () => lathe(b, v3(0, -0.15, 0), 'y', [[0.17, 0], [0.17, 0.02]], 12)), this.bucket);
    // pouring stream
    this.stream = this.part('bucket', (b) => b.with({ kind: K.WATER, color: 0x9fbfc8 }, () => obox(b, 0, -0.5, 0, 0.06, 1, 0.06, 0)));
    this.stream.visible = false;
    this.splash = app.world.fx.add('wellSplash', [[WELL.x, this.waterY + 0.05, this.ropeZ]], 10, {
      kind: 'steam', life: 0.9, rise: 0.5, spread: 0.6, size0: 0.08, size1: 0.3, color: 0xdfeef2, alpha: 0.7, on: 0, order: 2,
    });
    this.splashT = -1;
    this._place();
  }

  get bucketY() {
    return this.axleY - this.out;
  }

  turn(dAngle) {
    // positive angle pays rope out
    const before = this.out;
    this.out = THREE.MathUtils.clamp(this.out + dAngle * DRUM_R, this.minOut, this.maxOut);
    this.angle += (this.out - before) / DRUM_R;
    if (before < this.maxOut - 0.01 && this.out >= this.maxOut - 0.01 && !this.full) {
      this.full = true;
      this.splashT = this.app.time;
      this.toast('Splash: the bucket tips on the water and fills. A full bucket of perhaps 20 litres weighs about 20 kg, so winding it up 25 metres takes dozens of turns.');
      this.bump();
    }
    // redraw the panel when the bucket arrives at or leaves either end
    const where = this.out <= this.minOut + 0.05 ? 'top' : this.out >= this.maxOut - 0.05 ? 'bottom' : 'shaft';
    if (where !== this._where) {
      this._where = where;
      this.bump();
    }
  }

  grab(e) {
    this.falling = false;
    return this.crankDrag(e, (d) => this.turn(d));
  }
  click(L) {
    if (L.key === 'bucket' && this.out <= this.minOut + 0.05 && this.full) this.act('pour');
  }

  controls() {
    const atTop = this.out <= this.minOut + 0.05;
    const atBottom = this.out >= this.maxOut - 0.05;
    return [
      { id: 'lower', label: 'Let the bucket down', enabled: !atBottom && !this.full && this.pourT < 0, next: atTop && !this.full },
      { id: 'up', label: 'Wind up (hold)', hold: true, enabled: !atTop, next: atBottom || (this.full && !atTop) },
      { id: 'down', label: 'Wind down (hold)', hold: true, enabled: !atBottom },
      { id: 'pour', label: 'Empty into the trough', enabled: atTop && this.full && this.pourT < 0, next: atTop && this.full },
    ];
  }
  act(id, down) {
    this.touched();
    if (id === 'up') this.drive = down ? -1 : 0;
    else if (id === 'down') this.drive = down ? 1 : 0;
    else if (id === 'lower') {
      this.falling = true;
      this.toast('Lowering: the bucket\'s weight unwinds the rope. The winder steadies the crank, or lets the handle spin and brakes the drum with a hand.');
    } else if (id === 'pour') {
      this.pourT = this.app.time;
      this.toast('The bucket is swung to the trough and tipped. From here water was carried in pails to the kitchen and brewhouse.');
    }
    this.bump();
  }
  status() {
    const depth = Math.max(0, -this.bucketY + 0.4);
    if (this.pourT >= 0) return 'Emptying the bucket into the trough…';
    if (this.out <= this.minOut + 0.05) return this.full ? 'Bucket up and full.' : 'Bucket hanging empty at the well head.';
    return `Bucket ${depth.toFixed(1)} m down the shaft${this.full ? ', full' : ''}.`;
  }

  update(t, dt) {
    if (this.falling) {
      this.turn(dt * 3.0 / DRUM_R);
      if (this.out >= this.maxOut - 0.01) this.falling = false;
    }
    if (this.drive) this.turn(this.drive * dt * 1.1 / DRUM_R * (this.full && this.drive < 0 ? 0.8 : 1));
    if (this.pourT >= 0) {
      const k = (t - this.pourT) / 2.6;
      if (k >= 1) {
        this.pourT = -1;
        this.full = false;
        this.bump();
      }
    }
    this.splash.material.uniforms.uOn.value = this.splashT > 0 && t - this.splashT < 1.2 ? 1 : 0;
    this._place(t);
  }

  _place(t = 0) {
    this.drum.rotation.x = this.angle;
    const by = this.bucketY;
    const top = this.axleY;
    let bx = this.ropeX;
    let bz = this.ropeZ;
    let tilt = 0;
    let yy = by;
    if (this.pourT >= 0) {
      // swing over to the trough and tip
      const k = Math.min(1, (t - this.pourT) / 0.8);
      const [tx, tz] = S.well.troughAt;
      bx = this.ropeX + (tx - 0.3 - this.ropeX) * k;
      bz = this.ropeZ + (tz - this.ropeZ) * k;
      yy = by + 0.0;
      tilt = Math.min(1, Math.max(0, (t - this.pourT - 0.6) / 0.6)) * 1.6 * (1 - Math.max(0, (t - this.pourT - 2.1) / 0.5));
    }
    this.bucket.position.set(bx, yy, bz);
    this.bucket.rotation.z = -tilt;
    this.water.visible = this.full;
    // rope mesh spans y in [-1, 0] locally: hang it from the drum
    const len = Math.max(0.01, top - yy);
    this.rope.position.set(bx, top, bz);
    this.rope.scale.y = len;
    const pouring = this.pourT >= 0 && t - this.pourT > 0.9 && t - this.pourT < 2.3;
    this.stream.visible = pouring;
    if (pouring) {
      this.stream.position.set(bx - 0.2, yy - 0.15, bz);
      this.stream.scale.y = 0.45;
    }
  }
}
