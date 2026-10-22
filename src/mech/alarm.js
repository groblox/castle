import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { GH } from '../castle/layout.js';
import { Mechanism } from './base.js';

// The alarm bell on the gatehouse roof and the three portcullises. Ringing
// the bell turns out the garrison: the men at drill run to the gate, the
// archers come in from the butts, the watch stands to on the walls and the
// portcullises come down. Standing down sends everyone back to work.

const GROOVES = [21.4, 26.6, 33.4];
const LATTICE_H = 4.6;
const RAISED = 3.3; // bottom of a raised portcullis
// floor of the gate passage: level, then ramping down to the outer ward
const passFloor = (x) => (x <= 28 ? 0 : (-1.5 * (x - 28)) / (GH.x1 + GH.towerR - 28));

let audio = null;
/** A struck bell: a few inharmonic partials dying away. */
function strike(gain = 0.5) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    const out = audio.createGain();
    out.gain.value = gain;
    out.connect(audio.destination);
    for (const [f, a, d] of [[420, 0.5, 2.6], [840 * 1.19, 0.3, 1.7], [420 * 2.0, 0.22, 2.0], [420 * 2.7, 0.15, 1.1], [420 * 0.5, 0.25, 3.2]]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + d);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  } catch (_) {
    /* no sound available: the bell still swings */
  }
}

export class Alarm extends Mechanism {
  constructor(app) {
    super(app, { id: 'alarm', name: 'Alarm bell & portcullises', room: 'gatehouse', hint: 'Click to ring the alarm, or to work the portcullises' });
    this.ringing = false;
    this.raised = true;
    this.drop = 0; // 0 raised .. 1 down
    this.goal = 0;
    this.saved = new Map();
    this.ringT = -1;
    this.swing = 0;
    const ph = GH.passHalf;

    // the portcullises: oak lattices shod with iron spikes
    this.gates = GROOVES.map((gx) => {
      const g = new THREE.Group();
      this.group.add(g);
      this.part('portcullis', (b) => {
        b.set({ kind: K.TIMBER, color: P.timberDark });
        for (let z = -ph + 0.15; z < -0.05; z += 0.4) b.box(-0.08, 0.15, z - 0.06, 0.08, LATTICE_H, z + 0.06);
        for (let y = 0.4; y < LATTICE_H; y += 0.45) b.box(-0.07, y - 0.05, -ph, 0.07, y + 0.05, -0.02);
        b.with({ kind: K.METAL, color: P.iron }, () => {
          for (let z = -ph + 0.15; z < -0.05; z += 0.4) lathe(b, v3(0, 0.15, z), v3(0, -1, 0), [[0.05, 0], [0.001, 0.18]], 4);
        });
      }, g);
      g.position.set(gx, RAISED, 0);
      return { g, gx, floor: passFloor(gx) };
    });

    // the windlass that works the inner two, in the guardroom
    const wy = GH.floor1 + 2.6; // above the tops of the raised lattices
    const wz = -0.85;
    this.drum = new THREE.Group();
    this.drum.position.set(24.0, wy, wz);
    this.group.add(this.drum);
    this.part('portcullisWinch', (b) => {
      b.set({ kind: K.TIMBER, color: P.oak });
      lathe(b, v3(-2.85, 0, 0), 'x', [[0.16, 0], [0.16, 5.7]], 12);
      b.with({ kind: K.STRAW, color: 0xc8b48a }, () => {
        lathe(b, v3(-2.85, 0, 0), 'x', [[0.2, 0], [0.2, 0.5]], 12);
        lathe(b, v3(2.35, 0, 0), 'x', [[0.2, 0], [0.2, 0.5]], 12);
      });
      b.with({ kind: K.METAL, color: P.iron }, () => {
        for (const s of [-1, 1]) {
          beam(b, v3(s * 3.15, 0, 0), v3(s * 3.15, 0.4, 0), 0.05, 0.03);
          beam(b, v3(s * 3.15, 0.4, 0), v3(s * 3.3, 0.4, 0), 0.035, 0.035);
        }
        lathe(b, v3(-3.2, 0, 0), 'x', [[0.035, 0], [0.035, 6.4]], 8);
      });
    }, this.drum);
    this.part('portcullisWinch', (b) => {
      b.set({ kind: K.TIMBER, color: P.timberDark });
      for (const x of [21.0, 27.0]) {
        beam(b, v3(x, GH.floor1, wz - 0.5), v3(x, wy, wz), 0.12, 0.12);
        beam(b, v3(x, GH.floor1, wz + 0.5), v3(x, wy, wz), 0.12, 0.12);
      }
    });
    // ropes from the drum down to each lattice
    this.ropes = [0, 1].map(() => this.part('portcullisWinch', (b) => b.with({ kind: K.STRAW, color: 0xb8a070 }, () => obox(b, 0, -0.5, 0, 0.03, 1, 0.03, 0))));

    // the bell in its frame on the roof by the stair turret
    const bx = GH.x0 + 3.2;
    const bz = -6.2;
    const by = GH.roofY;
    this.part('alarmBell', (b) => {
      b.set({ kind: K.TIMBER, color: P.timberDark });
      for (const x of [bx - 0.75, bx + 0.75]) {
        beam(b, v3(x, by, bz - 0.5), v3(x, by + 2.0, bz), 0.12, 0.12);
        beam(b, v3(x, by, bz + 0.5), v3(x, by + 2.0, bz), 0.12, 0.12);
      }
      b.box(bx - 0.9, by + 1.95, bz - 0.09, bx + 0.9, by + 2.15, bz + 0.09);
      b.with({ kind: K.ROOF, color: P.lead }, () => {
        b.loft([v3(bx - 1.0, by + 2.15, bz - 0.4), v3(bx + 1.0, by + 2.15, bz - 0.4), v3(bx + 1.0, by + 2.15, bz + 0.4), v3(bx - 1.0, by + 2.15, bz + 0.4)],
          [v3(bx - 1.0, by + 2.5, bz - 0.02), v3(bx + 1.0, by + 2.5, bz - 0.02), v3(bx + 1.0, by + 2.5, bz + 0.02), v3(bx - 1.0, by + 2.5, bz + 0.02)]);
      });
    });
    this.bell = new THREE.Group();
    this.bell.position.set(bx, by + 1.95, bz);
    this.group.add(this.bell);
    this.part('alarmBell', (b) => {
      b.with({ kind: K.METAL, color: 0x9a7a3a }, () => lathe(b, v3(0, -0.75, 0), 'y', [[0.36, 0], [0.34, 0.06], [0.24, 0.3], [0.21, 0.6], [0.12, 0.72], [0.001, 0.75]], 16));
      b.with({ kind: K.METAL, color: P.iron }, () => {
        beam(b, v3(0, 0, 0), v3(0, -0.62, 0), 0.03, 0.03);
        lathe(b, v3(0, -0.72, 0), 'y', [[0.001, 0], [0.06, 0.06], [0.001, 0.12]], 8); // clapper
        beam(b, v3(0, 0.0, 0), v3(0, 0.0, 1.1), 0.05, 0.05); // the rope's lever
      });
      b.with({ kind: K.STRAW, color: 0xb8a070 }, () => obox(b, 0, -1.0, 1.1, 0.03, 2.0, 0.03, 0));
    }, this.bell);
    this._place();
  }

  click(L) {
    if (L.key === 'alarmBell') this.act(this.ringing ? 'stand' : 'ring');
    else this.act(this.goal > 0.5 ? 'raise' : 'lower');
  }

  controls() {
    return [
      { id: 'ring', label: 'Ring the alarm', enabled: !this.ringing, next: !this.ringing },
      { id: 'stand', label: 'Stand down', enabled: this.ringing, next: this.ringing },
      { id: 'lower', label: 'Drop the portcullises', enabled: this.goal < 0.5 },
      { id: 'raise', label: 'Wind them up again', enabled: this.goal > 0.5 },
    ];
  }

  act(id) {
    this.touched();
    const cast = this.app.world.cast;
    if (id === 'ring' && !this.ringing) {
      this.ringing = true;
      this.ringT = this.app.time;
      for (const [a, steps] of cast.alarm) {
        if (!a) continue;
        this.saved.set(a, { steps: a.steps, i: a.i });
        a.setSteps(steps);
      }
      this.dropAt = this.app.time + 7;
      this.toast('The alarm! The bell rings out, the men at drill run to the gate, the archers come in from the butts and the watch stands to. The portcullises will drop behind them.', 7000);
    } else if (id === 'stand' && this.ringing) {
      this.ringing = false;
      for (const [a, s] of this.saved) {
        a.setSteps(s.steps);
        a.i = s.i;
      }
      this.saved.clear();
      this.dropAt = null;
      this.goal = 0;
      this.toast('Stand down. The portcullises are wound up and everyone goes back to work.');
    } else if (id === 'lower') {
      this.goal = 1;
      this.toast('The portcullises drop in their grooves under their own weight: oak lattices shod with iron, falling in seconds.');
    } else if (id === 'raise') {
      this.goal = 0;
      this.toast('Winding them up again is slow work at the windlass in the guardroom above the passage.');
    }
    this.bump();
  }

  status() {
    const p = this.drop > 0.98 ? 'down' : this.drop < 0.02 ? 'up' : this.goal > 0.5 ? 'dropping' : 'being wound up';
    return `${this.ringing ? 'Alarm! The garrison is turned out.' : 'All quiet.'} Portcullises ${p}.`;
  }

  update(t, dt) {
    if (this.dropAt && t >= this.dropAt) {
      this.dropAt = null;
      this.goal = 1;
      this.bump();
    }
    // a portcullis falls fast and is wound up slowly
    const before = this.drop;
    if (this.goal > this.drop) this.drop = Math.min(1, this.drop + dt * 0.9);
    else if (this.goal < this.drop) this.drop = Math.max(0, this.drop - dt * 0.12);
    if (before < 1 && this.drop >= 1) {
      strike(0.12);
      this.bump();
    }
    if (before > 0 && this.drop <= 0) this.bump();
    // the bell swings while the alarm is up, and strikes each time it swings out
    const ring = this.ringing && t - this.ringT < 20;
    const amp = ring ? Math.min(1, (t - this.ringT) * 1.5) : 0;
    this.swing += ((ring ? 0.9 : 0) - this.swing) * Math.min(1, dt * 1.5);
    const a = Math.sin((t - this.ringT) * 4.2) * this.swing;
    if (ring && Math.abs(a) > 0.75 * this.swing && Math.abs(this._lastA ?? 0) <= 0.75 * this.swing && amp > 0.3) strike(0.35);
    this._lastA = a;
    this.bell.rotation.x = a;
    this._place();
  }

  _place() {
    const k = this.drop * this.drop * (3 - 2 * this.drop);
    for (const G of this.gates) G.g.position.y = RAISED + (G.floor - RAISED) * k;
    this.drum.rotation.x = -this.drop * 18;
    const top = this.drum.position.y;
    this.ropes.forEach((r, i) => {
      const G = this.gates[i];
      const y0 = G.g.position.y + LATTICE_H;
      r.position.set(G.gx, top, -0.85);
      r.scale.y = Math.max(0.05, top - y0);
    });
  }
}
