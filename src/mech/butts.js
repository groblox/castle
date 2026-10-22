import * as THREE from 'three';
import { K } from '../geom/kinds.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { BUTTS } from '../castle/layout.js';
import { groundY } from '../castle/terrain.js';
import { DRAW_RATE } from '../people/figure.js';
import { Mechanism } from './base.js';

// Archery at the butts. The archers shoot on their own; you can call a
// volley, or draw a bow yourself: hold to draw, let go to loose. Too weak
// a draw drops short, too strong flies over the butt.

const RINGS = [[0.1, 'the gold'], [0.22, 'the inner white'], [0.36, 'the black'], [0.5, 'the white'], [0.62, 'the straw']];
const MAX_STUCK = 30;
const _v = new THREE.Vector3();

export class Butts extends Mechanism {
  constructor(app) {
    super(app, { id: 'butts', name: 'The butts', room: 'farm', hint: 'Click to shoot at the butts' });
    this.flying = [];
    this.stuck = [];
    this.pool = [];
    this.score = { gold: 0, hits: 0, misses: 0, mine: 0, mineGold: 0 };
    this.drawing = false;
    this.power = 0;
    this.prevC = new Map();
    this.last = '';
  }

  _arrow() {
    let m = this.pool.pop();
    if (!m) {
      // shaft along +z, point at the origin pointing +z
      m = this.part('butts', (b) => {
        b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => beam(b, v3(0, 0, -0.75), v3(0, 0, -0.04), 0.014, 0.014));
        b.with({ kind: K.METAL, color: 0x5a5a5e }, () => beam(b, v3(0, 0, -0.06), v3(0, 0, 0.04), 0.03, 0.012));
        b.with({ kind: K.CLOTH, color: 0xece4d0 }, () => {
          obox(b, 0, 0.02, -0.66, 0.006, 0.04, 0.14, 0);
          obox(b, 0.02, -0.01, -0.66, 0.04, 0.006, 0.14, 0);
        });
        b.with({ kind: K.CLOTH, color: 0x9a3a2a }, () => obox(b, -0.02, -0.01, -0.66, 0.04, 0.006, 0.14, 0));
      });
    }
    m.visible = true;
    return m;
  }

  /** Loose an arrow from p0 at an aim point, power 1 = a true draw. */
  loose(p0, aim, power = 1, mine = false) {
    const m = this._arrow();
    const p1 = new THREE.Vector3(...aim);
    // under-drawn arrows fall short and low, over-drawn ones carry high
    const dist = p1.distanceTo(p0);
    const end = p0.clone().lerp(p1, Math.min(1.25, 0.55 + 0.45 * power));
    end.y += (power - 1) * 2.2;
    const T = dist / 19;
    this.flying.push({ m, p0: p0.clone(), p1: end, t: 0, T, arc: 0.5 + 0.25 * dist / 12, mine, aim: p1 });
    if (mine) this.score.mine++;
  }

  click() {
    this.act('volley');
  }

  controls() {
    return [
      { id: 'draw', label: this.drawing ? `Drawing… ${Math.round(this.power * 100)}%` : 'Draw a bow yourself (hold, let go to loose)', hold: true, next: true },
      { id: 'volley', label: 'Call a volley' },
      { id: 'fetch', label: 'Fetch the arrows', enabled: this.stuck.length > 0 },
    ];
  }

  act(id, down) {
    this.touched();
    const archers = this.app.world.cast.archers;
    if (id === 'volley') {
      // set every archer's cycle so they all nock, draw and loose together
      const t = this.app.time;
      for (const a of archers) {
        a.offset = (0.32 / DRAW_RATE) - t;
        const st = a.steps[a.i];
        if (st.params && st.pose === 'shoot') st.params.offset = a.offset;
      }
      this.toast('"Nock! … Draw! … Loose!" The master bowman calls the volley.', 4000);
    } else if (id === 'fetch') {
      for (const s of this.stuck) {
        s.m.visible = false;
        this.pool.push(s.m);
      }
      this.stuck.length = 0;
      this.toast('The arrows are pulled from the butt and the turf, and carried back to the mark.');
    } else if (id === 'draw') {
      if (down) {
        this.drawing = true;
        this.power = 0;
      } else if (this.drawing) {
        this.drawing = false;
        const z = BUTTS.z + 2.6;
        const p0 = new THREE.Vector3(BUTTS.shootX + 0.3, groundY(BUTTS.shootX, z) + 1.5, z);
        const [fx, fy, fz] = BUTTS.face;
        // a little wobble in the aim, more the longer the bow is held
        const wob = Math.max(0, this.power - 0.9) * 1.2 + 0.12;
        const aim = [fx, fy + (Math.random() - 0.5) * wob, fz + (Math.random() - 0.5) * wob];
        this.loose(p0, aim, this.power * 1.12, true);
        this.last = this.power < 0.75 ? 'Under-drawn: it will fall short.' : this.power > 0.98 ? 'Over-drawn and held too long: it will fly high.' : 'A good full draw.';
      }
    }
    this.bump();
  }

  status() {
    const s = this.score;
    const yours = s.mine ? ` Your arrows: ${s.mine}, ${s.mineGold} in the gold.` : '';
    return `${s.hits} hits on the target (${s.gold} in the gold), ${s.misses} in the turf.${yours} ${this.last}`;
  }

  update(t, dt) {
    if (this.drawing) {
      this.power = Math.min(1.15, this.power + dt * 0.55);
      if (Math.floor(this.power * 20) !== this._pw) {
        this._pw = Math.floor(this.power * 20);
        this.bump();
      }
    }
    // each archer looses as his cycle passes the moment of release
    for (const a of this.app.world.cast.archers) {
      const st = a.steps[a.i];
      if (st.pose !== 'shoot') {
        this.prevC.delete(a);
        continue;
      }
      const c = ((t + (a.offset ?? 0)) * DRAW_RATE) % 1;
      const prev = this.prevC.get(a);
      this.prevC.set(a, c);
      if (prev === undefined || !(prev < 0.8 && c >= 0.8)) continue;
      a.e.root.updateMatrixWorld(true);
      a.e.j.handL.getWorldPosition(_v);
      const [fx, fy, fz] = BUTTS.face;
      const skill = 0.38;
      const aim = [fx, fy + (Math.random() - 0.45) * skill, fz + (Math.random() - 0.5) * skill * 1.1];
      this.loose(_v.clone(), aim, 0.98 + Math.random() * 0.05);
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.T);
      const p = f.p0.clone().lerp(f.p1, k);
      p.y += Math.sin(Math.PI * k) * f.arc;
      // point along the flight
      const k2 = Math.min(1, k + 0.02);
      const q = f.p0.clone().lerp(f.p1, k2);
      q.y += Math.sin(Math.PI * k2) * f.arc;
      f.m.position.copy(p);
      if (q.distanceToSquared(p) > 1e-8) f.m.lookAt(q.add(q.clone().sub(p).multiplyScalar(10)));
      if (k >= 1) {
        this.flying.splice(i, 1);
        this._land(f);
      }
    }
  }

  _land(f) {
    const [fx, fy, fz] = BUTTS.face;
    const p = f.m.position;
    const r = Math.hypot(p.y - fy, p.z - fz);
    const onFace = Math.abs(p.x - fx) < 0.6 && r < 0.62;
    if (onFace) {
      this.score.hits++;
      const ring = RINGS.find(([rr]) => r < rr);
      if (r < 0.1) {
        this.score.gold++;
        if (f.mine) this.score.mineGold++;
      }
      if (f.mine) this.toast(`Your arrow strikes ${ring[1]}${r < 0.1 ? '. A fine shot!' : '.'}`, 3500);
      p.x = fx + 0.06; // sunk into the straw
    } else {
      this.score.misses++;
      // it buries itself in the bank of the butt, or flies over it, or falls short in the grass
      const bankTop = fy + 0.8;
      let where;
      if (p.x < fx - 1.0) {
        p.y = groundY(p.x, p.z) + 0.04;
        where = 'Short: your arrow falls in the grass before the butt.';
      } else if (p.y < bankTop && Math.abs(p.z - fz) < 1.4) {
        p.x = Math.max(fx + 0.15, Math.min(p.x, fx + 0.5));
        where = 'Wide of the mark: your arrow buries itself in the turf of the butt.';
      } else {
        p.x = fx + 2.5 + Math.random() * 2;
        p.y = groundY(p.x, p.z) + 0.04;
        where = 'Over the butt: that one will take some finding in the grass behind.';
      }
      if (f.mine) this.toast(where, 3500);
    }
    this.stuck.push(f);
    if (this.stuck.length > MAX_STUCK) {
      const old = this.stuck.shift();
      old.m.visible = false;
      this.pool.push(old.m);
    }
    this.bump();
  }
}
