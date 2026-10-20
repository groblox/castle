import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe, cask } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { S } from '../castle/spots.js';
import { Mechanism } from './base.js';

// The cask in use in the buttery: a wooden spigot and faucet low in the head
// and a vent peg in the top. With the vent shut, ale glugs and stops as a
// partial vacuum forms in the cask.

const FILL_TIME = 7;

export class Tap extends Mechanism {
  constructor(app) {
    super(app, { id: 'tap', name: 'Barrel tap', room: 'buttery', hint: 'Click the tap, the vent peg or the jug' });
    const c = S.buttery.tapCask;
    this.c = c;
    this.f = S.buttery.floor;
    this.open = false;
    this.vent = false;
    this.fill = 0;
    this.spill = 0;
    this.openedAt = 0;
    this.flow = 0;
    const headX = c.x + c.len / 2;
    this.headX = headX;
    this.tapY = c.y - c.r * 0.55;
    this.tipX = headX + 0.2;

    this.part('cask', (b) => cask(b, v3(c.x, c.y, c.z), 'x', c.r, c.len, { color: 0xa3825a }));
    this.part('tap', (b) => {
      b.with({ kind: K.TIMBER, color: 0xc4a274 }, () => lathe(b, v3(headX - 0.02, this.tapY, c.z), 'x', [[0.035, 0], [0.026, 0.22]], 8));
      b.with({ kind: K.TIMBER, color: 0xc4a274 }, () => lathe(b, v3(this.tipX - 0.02, this.tapY - 0.06, c.z), 'y', [[0.02, 0], [0.02, 0.06]], 8));
    });
    this.key = new THREE.Group();
    this.key.position.set(headX + 0.11, this.tapY + 0.03, c.z);
    this.group.add(this.key);
    this.part('tap', (b) => b.with({ kind: K.TIMBER, color: 0x8a6a44 }, () => {
      lathe(b, v3(0, 0, 0), 'y', [[0.018, 0], [0.018, 0.07]], 6);
      obox(b, 0, 0.09, 0, 0.13, 0.04, 0.025, 0);
    }), this.key);
    this.peg = this.part('ventPeg', (b) => b.with({ kind: K.TIMBER, color: 0x8a6a44 }, () => {
      lathe(b, v3(0, 0, 0), 'y', [[0.03, 0], [0.022, 0.09]], 8);
      lathe(b, v3(0, 0.09, 0), 'y', [[0.035, 0], [0.035, 0.025]], 8);
    }));
    this.peg.position.set(c.x, c.y + c.r - 0.03, c.z);

    // jug on the floor under the tap, its ale level, the stream, a puddle
    const jx = this.tipX - 0.02;
    this.jug = new THREE.Group();
    this.jug.position.set(jx, this.f, c.z);
    this.group.add(this.jug);
    this.part('jug', (b) => b.with({ kind: K.PLAIN, color: 0x8f9a5a }, () => {
      lathe(b, v3(0, 0, 0), 'y', [[0.07, 0], [0.105, 0.09], [0.11, 0.16], [0.085, 0.24], [0.075, 0.27]], 12);
      beam(b, v3(-0.1, 0.22, 0), v3(-0.14, 0.12, 0), 0.025, 0.02);
    }), this.jug);
    this.ale = this.part('jug', (b) => b.with({ kind: K.WATER, color: 0xb88a3a }, () => lathe(b, v3(0, 0, 0), 'y', [[0.085, 0], [0.085, 0.015]], 12)), this.jug);
    this.stream = this.part('tap', (b) => b.with({ kind: K.WATER, color: 0xc4963e }, () => obox(b, 0, -0.5, 0, 0.025, 1, 0.025, 0)));
    this.puddle = this.part('jug', (b) => b.with({ kind: K.WATER, color: 0xb08a40 }, () => lathe(b, v3(0, 0, 0), 'y', [[0.3, 0], [0.3, 0.004]], 14)));
    this.puddle.position.set(jx + 0.05, this.f + 0.002, c.z + 0.1);
    this._place(0);
  }

  click(L) {
    if (L.key === 'tap') this.act('faucet');
    else if (L.key === 'ventPeg') this.act('vent');
    else if (L.key === 'jug') this.act('jug');
  }
  controls() {
    return [
      { id: 'faucet', label: this.open ? 'Shut the faucet' : 'Turn the faucet', next: (!this.open && this.fill < 0.95) || (this.open && this.fill >= 0.98) },
      { id: 'vent', label: this.vent ? 'Drive the vent peg home' : 'Loosen the vent peg', next: this.open && !this.vent && this.flow < 0.05 },
      { id: 'jug', label: 'Take the jug to the hall', enabled: this.fill > 0.3 && !this.open, next: this.fill >= 0.95 && !this.open },
    ];
  }
  act(id) {
    this.touched();
    if (id === 'faucet') {
      this.open = !this.open;
      this.openedAt = this.app.time;
      if (this.open && !this.vent) this.toast('The ale runs, then glugs and slows: no air can get into the cask to take the ale\'s place.');
      else if (this.open) this.toast('With the vent peg loosened, air enters at the top and the ale runs freely.');
    } else if (id === 'vent') {
      this.vent = !this.vent;
      this.toast(this.vent
        ? 'The vent peg is eased out of its hole. Air can now enter the cask as ale is drawn off. Butlers drove it home again to keep the ale fresh.'
        : 'Vent peg driven home: the cask is airtight again, which keeps the ale from going flat and sour.');
    } else if (id === 'jug') {
      this.toast('A jug of ale goes off to the hall. Ale was served by measure: gallons, pottles and quarts.');
      this.fill = 0;
    }
    this.bump();
  }
  status() {
    if (this.open && this.flow < 0.05) return 'The faucet is open but the ale has stopped: the vent is shut.';
    if (this.open && this.fill >= 1) return 'The jug is overflowing!';
    if (this.open) return `Ale running; jug ${Math.round(this.fill * 100)}% full.`;
    return this.fill > 0 ? `Jug ${Math.round(this.fill * 100)}% full.` : 'An empty jug waits under the tap.';
  }
  update(t, dt) {
    let flow = 0;
    if (this.open) {
      if (this.vent) flow = 1;
      else {
        const k = (t - this.openedAt) / 1.6;
        flow = Math.max(0, 1 - k) * (0.5 + 0.5 * Math.max(0, Math.sin(t * 22)));
      }
    }
    const wasFlowing = this.flow > 0.05;
    this.flow = flow;
    if (wasFlowing !== flow > 0.05) this.bump();
    if (flow > 0) {
      const before = this.fill;
      this.fill = Math.min(1, this.fill + (flow * dt) / FILL_TIME);
      if (before < 1 && this.fill >= 1) {
        this.toast('The jug is full and the ale is running over onto the floor. Shut the faucet!');
        this.bump();
      }
      if (this.fill >= 1) this.spill = Math.min(1, this.spill + dt * 0.25 * flow);
      if (Math.round(before * 20) !== Math.round(this.fill * 20)) this.bump();
    } else this.spill = Math.max(0, this.spill - dt * 0.02);
    this._place(t);
  }
  _place(t) {
    this.key.rotation.y = this.open ? Math.PI / 2 : 0;
    this.peg.position.y = this.c.y + this.c.r - 0.03 + (this.vent ? 0.06 : 0);
    this.peg.rotation.z = this.vent ? 0.3 : 0;
    this.ale.visible = this.fill > 0.01;
    this.ale.position.y = 0.02 + this.fill * 0.22;
    this.ale.scale.setScalar(this.fill > 0.75 ? 0.95 : 1.1);
    const flowing = this.flow > 0.02;
    this.stream.visible = flowing;
    if (flowing) {
      const top = this.tapY - 0.06;
      const bottom = this.f + 0.02 + Math.min(1, this.fill) * 0.22;
      this.stream.position.set(this.tipX - 0.02, top, this.c.z);
      this.stream.scale.set(0.6 + this.flow * 0.6 + 0.2 * Math.sin(t * 30), Math.max(0.01, top - bottom), 0.6 + this.flow * 0.6);
    }
    this.puddle.visible = this.spill > 0.01;
    this.puddle.scale.set(0.3 + this.spill, 1, 0.3 + this.spill);
  }
}
