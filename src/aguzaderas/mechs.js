import { K, P } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { beam, v3 } from '../geom/shapes.js';
import { shared } from '../render/material.js';
import { Mechanism } from '../mech/base.js';
import { LIGHT, SIGNAL } from './effects.js';

// The signal on the keep's turret. Frontier towers passed warnings from one
// to the next by smoke by day and fire by night; here a brazier of brushwood
// on top of the turret is lit, and the lookout watches for an answer.

class Signal extends Mechanism {
  constructor(app) {
    super(app, { id: 'signal', name: 'Signal turret', room: 'keepTerrace', hint: 'Click to light or put out the signal' });
    this.lit = false;
    this.litAt = -1e9;
    const [x, y, z] = SIGNAL;
    this.part('signal', (b) => {
      b.with({ kind: K.METAL, color: P.iron }, () => {
        lathe(b, v3(x, y - 0.35, z), 'y', [[0.06, 0], [0.06, 0.1], [0.38, 0.32], [0.42, 0.4]], 10);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          beam(b, v3(x + Math.cos(a) * 0.12, y - 0.3, z + Math.sin(a) * 0.12), v3(x + Math.cos(a) * 0.42, y + 0.15, z + Math.sin(a) * 0.42), 0.025, 0.025);
        }
      });
      for (let i = 0; i < 5; i++) lump(b, x - 0.2 + i * 0.1, y + 0.05, z + (i % 2 ? 0.1 : -0.1), 0.16, 0.06, 0.05, P.straw, K.STRAW); // brushwood
    });
  }
  get night() {
    return shared.uDay.value < 0.35;
  }
  click() {
    this.act('toggle');
  }
  controls() {
    return [{ id: 'toggle', label: this.lit ? 'Put it out' : this.night ? 'Light the beacon' : 'Make smoke', next: !this.lit }];
  }
  act(id) {
    if (id !== 'toggle') return;
    this.touched();
    this.lit = !this.lit;
    this.litAt = this.app.time;
    if (this.lit) this.toast(this.night ? 'The beacon is lit: a fire by night, to be seen from the next tower.' : 'Green brushwood on the fire: a column of smoke by day.');
    this.bump();
  }
  status() {
    if (!this.lit) return 'Unlit. The lookout keeps watch from the terrace.';
    return this.night ? 'Burning: a beacon in the dark.' : 'Smoking: a signal by day.';
  }
  update() {
    const fx = this.app.world.fx;
    const night = this.night;
    // a fire always, but by day the smoke is what is seen
    fx.setOn('signalFire', this.lit ? 1 : 0);
    fx.setOn('signalSmoke', this.lit ? (night ? 0.35 : 1) : 0);
    fx.setLight(LIGHT.signal, this.lit ? 1 : 0);
    // the lookout turns to watch while it burns
    const a = this.app.world.cast.actors.atalaya;
    if (a) {
      if (this.lit && !a.override) {
        a.override = (e, t) => {
          a.turnTo(Math.PI * 0.85, 1 / 30);
          e.pose('look', t);
          return true;
        };
      } else if (!this.lit && a.override) a.override = null;
    }
    if (night !== this._night && this.lit) this.bump();
    this._night = night;
  }
}

export function createMechanisms(app) {
  const m = new Signal(app);
  return { [m.id]: m };
}
