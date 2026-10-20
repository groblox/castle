import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe, cask } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { S } from '../castle/spots.js';
import { HALL } from '../castle/layout.js';
import { Mechanism } from './base.js';

// Trapdoor in the hall floor and a hand windlass over it for raising casks
// from the undercroft. (The arrangement is conjectural; see the notes.)
const DRUM_R = 0.14;
const DRUM_Y = 3.05;

export class Hoist extends Mechanism {
  constructor(app) {
    super(app, { id: 'hoist', name: 'Cellar trapdoor and hoist', room: 'undercroft', hint: 'Click the trapdoor; drag the crank to wind' });
    const td = S.hall.trap;
    this.td = td;
    this.cx = (td.x0 + td.x1) / 2;
    this.cz = (td.z0 + td.z1) / 2;
    this.open = 0;
    this.openGoal = 0;
    this.drive = 0;
    this.bottomY = S.undercroft.floor + 0.33; // cask centre when standing on the floor
    this.topY = HALL.floorY + 1.15;
    this.caskY = this.bottomY;
    this.angle = 0;
    const f = HALL.floorY;

    // frame (static, but labelled as part of the hoist)
    this.part('hoist', (b) => {
      b.set({ kind: K.TIMBER, color: P.timber });
      for (const x of [td.x0 - 0.65, td.x1 + 0.65]) {
        b.box(x - 0.09, f, this.cz - 0.09, x + 0.09, DRUM_Y + 0.25, this.cz + 0.09);
        b.box(x - 0.15, f, this.cz - 0.7, x + 0.15, f + 0.12, this.cz + 0.7);
        beam(b, v3(x, f + 0.1, this.cz - 0.6), v3(x, f + 1.4, this.cz - 0.06), 0.07, 0.07);
        beam(b, v3(x, f + 0.1, this.cz + 0.6), v3(x, f + 1.4, this.cz + 0.06), 0.07, 0.07);
      }
      b.box(td.x0 - 0.7, DRUM_Y + 0.25, this.cz - 0.08, td.x1 + 0.7, DRUM_Y + 0.37, this.cz + 0.08);
    });
    this.drum = new THREE.Group();
    this.drum.position.set(0, DRUM_Y, this.cz);
    this.group.add(this.drum);
    this.part('hoist', (b) => {
      b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(td.x0 - 0.56, 0, 0), 'x', [[DRUM_R, 0], [DRUM_R, td.x1 - td.x0 + 1.12]], 10));
      b.with({ kind: K.STRAW, color: 0xc8b48a }, () => lathe(b, v3(this.cx - 0.25, 0, 0), 'x', [[DRUM_R + 0.04, 0], [DRUM_R + 0.04, 0.5]], 10));
    }, this.drum);
    const kx = td.x1 + 0.85;
    this.part('crank', (b) => {
      b.set({ kind: K.METAL, color: P.iron });
      lathe(b, v3(td.x1 + 0.5, 0, 0), 'x', [[0.03, 0], [0.03, 0.38]], 8);
      beam(b, v3(kx, 0, 0), v3(kx, 0.34, 0), 0.045, 0.03);
      b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(kx, 0.34, 0), 'x', [[0.03, 0], [0.03, 0.18]], 8));
    }, this.drum);

    // trapdoor leaves hinged on their outer edges
    const w = (td.x1 - td.x0) / 2;
    const leaf = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side < 0 ? td.x0 : td.x1, f, this.cz);
      this.group.add(pivot);
      this.part('trapdoor', (b) => {
        b.set({ kind: K.TIMBER, color: 0x9a7a52 });
        b.box(side < 0 ? 0 : -w, 0, -(td.z1 - td.z0) / 2, side < 0 ? w : 0, 0.07, (td.z1 - td.z0) / 2, { topKind: K.BOARDS, topColor: 0xa88660 });
        b.with({ kind: K.METAL, color: P.iron }, () => {
          for (const dz of [-0.5, 0.5]) obox(b, side < 0 ? 0.25 : -0.25, 0.075, dz, 0.45, 0.01, 0.05, 0);
          lathe(b, v3(side < 0 ? w - 0.15 : -w + 0.15, 0.07, 0), 'y', [[0.05, 0], [0.04, 0.03]], 8); // ring
        });
      }, pivot);
      return pivot;
    };
    this.leafL = leaf(-1);
    this.leafR = leaf(1);

    // rope, hooks and the cask
    this.rope = this.part('hoist', (b) => b.with({ kind: K.STRAW, color: 0xb8a070 }, () => obox(b, 0, -0.5, 0, 0.03, 1, 0.03, 0)));
    this.load = new THREE.Group();
    this.group.add(this.load);
    this.part('caskHoist', (b) => {
      cask(b, v3(0, 0, 0), 'x', 0.3, 0.7, { color: 0x9b7b52 });
      b.with({ kind: K.METAL, color: P.iron }, () => {
        beam(b, v3(-0.33, 0.12, 0), v3(0, 0.55, 0), 0.02, 0.02);
        beam(b, v3(0.33, 0.12, 0), v3(0, 0.55, 0), 0.02, 0.02);
        lathe(b, v3(0, 0.53, 0), 'y', [[0.04, 0], [0.04, 0.06]], 8);
      });
    }, this.load);
    this._place();
  }

  /** Raise (dh > 0) or lower the cask by dh metres of rope. */
  raise(dh) {
    if (dh > 0 && this.open < 0.98 && this.caskY + dh > HALL.floorY - 0.65) {
      if (!this._warned) {
        this._warned = true;
        this.toast('Open the trapdoor first: the cask cannot come up through a shut floor.');
        setTimeout(() => (this._warned = false), 3000);
      }
      return;
    }
    const before = this.caskY;
    this.caskY = THREE.MathUtils.clamp(this.caskY + dh, this.bottomY, this.topY);
    this.angle -= (this.caskY - before) / DRUM_R;
    const where = this.caskY >= this.topY - 0.02 ? 'top' : this.caskY <= this.bottomY + 0.02 ? 'bottom' : 'mid';
    if (where !== this._where) {
      this._where = where;
      if (where === 'top') this.toast('The cask clears the floor. Swung onto the boards, it could be rolled away to the buttery on its chimes.');
      this.bump();
    }
  }

  grab(e, L) {
    if (L.key === 'trapdoor') return null;
    return this.crankDrag(e, (d) => this.raise(-d * DRUM_R));
  }
  click(L) {
    if (L.key === 'trapdoor') this.act('trap');
  }
  controls() {
    const up = this.caskY >= this.topY - 0.02;
    const down = this.caskY <= this.bottomY + 0.02;
    return [
      { id: 'trap', label: this.openGoal ? 'Close the trapdoor' : 'Open the trapdoor', enabled: this.openGoal ? this.caskY < HALL.floorY - 0.7 : true, next: !this.openGoal && down },
      { id: 'up', label: 'Wind up (hold)', hold: true, enabled: !up && this.open > 0.98, next: this.open > 0.98 && down },
      { id: 'down', label: 'Lower (hold)', hold: true, enabled: !down },
    ];
  }
  act(id, down) {
    this.touched();
    if (id === 'trap') {
      this.openGoal = this.openGoal ? 0 : 1;
      if (this.openGoal) this.toast('The two leaves of the trapdoor are lifted back on their hinges, opening a hatch into the undercroft below.');
    } else if (id === 'up') this.drive = down ? 1 : 0;
    else if (id === 'down') this.drive = down ? -1 : 0;
    this.bump();
  }
  status() {
    const h = this.caskY;
    const where = h >= this.topY - 0.02 ? 'hanging above the hall floor' : h <= this.bottomY + 0.02 ? 'on the undercroft floor' : h > HALL.floorY ? 'coming up through the hatch' : 'rising through the undercroft';
    return `Trapdoor ${this.open > 0.98 ? 'open' : this.open < 0.02 ? 'shut' : 'moving'}; the cask is ${where}.`;
  }
  update(t, dt) {
    const prev = this.open;
    this.open += Math.sign(this.openGoal - this.open) * Math.min(Math.abs(this.openGoal - this.open), dt / 1.2);
    if ((prev < 0.98 && this.open >= 0.98) || (prev > 0.02 && this.open <= 0.02)) this.bump();
    if (this.drive) this.raise(this.drive * dt * 0.9);
    this._place();
  }
  _place() {
    const a = this.open * (Math.PI / 2) * 0.98;
    this.leafL.rotation.z = a;
    this.leafR.rotation.z = -a;
    this.drum.rotation.x = this.angle;
    const hookY = this.caskY + 0.58;
    const ropeLen = Math.max(0.01, DRUM_Y - hookY);
    this.rope.position.set(this.cx, DRUM_Y, this.cz + DRUM_R * 0.0);
    this.rope.scale.y = ropeLen;
    this.load.position.set(this.cx, this.caskY, this.cz);
  }
}
