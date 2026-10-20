import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { S } from '../castle/spots.js';
import { LIGHT } from '../castle/ambient.js';
import { Mechanism } from './base.js';

// Bread oven. The sequence follows the usual practice for a wood-fired
// "faggot" oven: burn the fire inside the dome, rake out the embers, swab
// the floor with a wet mop (malkin), set the loaves with the peel, stop the
// mouth and seal it, let the stored heat bake the bread, then draw it.

const FLOOR = S.bakehouse.oven.y + 0.02;
const MOUTH_X = S.bakehouse.oven.x + S.bakehouse.oven.rOut + 0.05;
const TOOL_Z = -19.05;
const SLOTS = [
  [6.55, -19.25], [7.15, -19.25], [7.75, -19.25], [8.3, -19.2],
  [6.6, -19.85], [7.2, -19.9], [7.8, -19.85], [6.9, -20.4],
];

const NOTES = {
  firing: 'The oven is heated by burning faggots of brushwood inside the dome itself. The baker judged the heat by the colour of the walls, which whiten as the soot burns off.',
  raking: 'The embers and ash are drawn out through the mouth with a long iron rake (a scuffle).',
  swab: 'The hot floor is swabbed with a wet mop on a pole (a malkin) to clear the last ash. The hiss of steam was itself a test of the heat.',
  load: 'Each loaf is set on the hot floor with the long wooden peel: slide it in, jerk it out from under the dough.',
  seal: 'The mouth is closed with a stop of iron or wood and sealed round the edge with clay or dough, holding the heat in.',
  baking: 'The bread bakes in the heat stored in the masonry, with no fire at all. Large loaves needed about an hour.',
  draw: 'The seal is broken and the loaves drawn out with the peel, to cool on boards and shelves before going to the pantry.',
};

export class Oven extends Mechanism {
  constructor(app) {
    super(app, { id: 'oven', name: 'Bread oven', room: 'bakehouse', hint: 'Click to work the oven' });
    this.state = 'firing';
    this.heat = 0.35;
    this.anim = null; // {kind, t0, dur, ...}
    this.loaded = 0;
    this.bake = 0;
    const fx = app.world.fx;
    this.fire = fx.flames('ovenFire', [[6.8, FLOOR + 0.02, -19.35], [7.35, FLOOR + 0.02, -19.55], [7.9, FLOOR + 0.02, -19.3], [7.2, FLOOR + 0.02, -19.9]], { count: 5, size: 0.42, rise: 0.4 });
    fx.light(LIGHT.oven, [7.6, 1.5, -18.6], 1.4);
    this.sparks = fx.add('ovenEmbers', [[MOUTH_X - 0.1, FLOOR + 0.1, TOOL_Z]], 10, {
      kind: 'spark', life: 1.0, rise: -0.7, spread: 0.6, size0: 0.06, size1: 0.03, color: 0xffb050, color2: 0xd0401a, alpha: 0.95, on: 0, order: 5,
    });
    this.steam = fx.steam('ovenSteam', [[MOUTH_X + 0.05, FLOOR + 0.35, TOOL_Z]], { count: 8, rise: 1.0, alpha: 0.35, on: 0 });

    // embers bed (half visible in the section)
    this.embers = this.part('oven', (b) => b.with({ kind: K.EMIT, color: 0xe0602a }, () => lathe(b, v3(7.25, FLOOR - 0.01, -19.4), 'y', [[1.0, 0], [0.9, 0.06]], 18)));
    // loaves
    this.loaves = SLOTS.map(([x, z]) => {
      const m = this.part('loaves', (b) => lump(b, 0, 0.07, 0, 0.17, 0.09, 0.17, 0xffffff));
      m.position.set(x, FLOOR, z);
      m.visible = false;
      m.material.uniforms.uTint.value.set(0xe6d3a8);
      m.material.uniforms.uTintAmt.value = 1;
      return m;
    });
    // tools: peel, rake, malkin. Each is drawn with its working tip at the origin
    // and the pole running along +x.
    this.peel = this.part('peel', (b) => {
      b.with({ kind: K.TIMBER, color: 0xc4a274 }, () => {
        obox(b, 0, 0.012, 0, 0.36, 0.025, 0.34, 0);
        beam(b, v3(0.18, 0.02, 0), v3(2.5, 0.06, 0), 0.04, 0.04);
      });
    });
    this.rake = this.part('rake', (b) => {
      b.with({ kind: K.METAL, color: P.iron }, () => {
        obox(b, 0, 0.08, 0, 0.04, 0.16, 0.42, 0);
        beam(b, v3(0.02, 0.1, 0), v3(2.6, 0.18, 0), 0.03, 0.03);
      });
    });
    this.malkin = this.part('rake', (b) => {
      b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0.1, 0.1, 0), v3(2.5, 0.2, 0), 0.04, 0.04));
      b.with({ kind: K.CLOTH, color: 0x8a8070 }, () => lump(b, 0.05, 0.08, 0, 0.14, 0.08, 0.16, 0x8a8070, K.CLOTH));
    });
    this.door = this.part('ovenDoor', (b) => {
      b.with({ kind: K.METAL, color: 0x4a4744 }, () => {
        obox(b, 0, 0.27, 0, 0.04, 0.54, 0.74, 0);
        beam(b, v3(0.03, 0.3, -0.12), v3(0.13, 0.3, -0.12), 0.03, 0.03);
        beam(b, v3(0.03, 0.3, 0.12), v3(0.13, 0.3, 0.12), 0.03, 0.03);
        beam(b, v3(0.13, 0.3, -0.13), v3(0.13, 0.3, 0.13), 0.03, 0.03);
      });
    });
    this.seal = this.part('ovenDoor', (b) => {
      b.with({ kind: K.PLASTER, color: 0xb08a62 }, () => {
        obox(b, 0, 0.56, 0, 0.07, 0.06, 0.82, 0);
        obox(b, 0, -0.01, 0, 0.07, 0.05, 0.82, 0);
        obox(b, 0, 0.27, -0.39, 0.07, 0.6, 0.06, 0);
        obox(b, 0, 0.27, 0.39, 0.07, 0.6, 0.06, 0);
      });
    });
    this.rest();
    this._setFire(true);
  }

  rest() {
    // tools stand against the wall by the oven when not in use
    const lean = (m, x, z, rot) => {
      m.position.set(x, 0.1, z);
      m.rotation.set(0, 0, 0);
      m.rotation.z = rot;
    };
    lean(this.peel, 10.15, -20.75, 1.25);
    lean(this.rake, 10.4, -20.6, 1.22);
    lean(this.malkin, 10.65, -20.75, 1.2);
    if (this.state !== 'baking' && this.state !== 'baked') {
      this.door.position.set(9.6, 0.08, -18.2);
      this.door.rotation.set(0, 0.3, -0.25);
    }
  }

  _setFire(on) {
    const fx = this.app.world.fx;
    fx.setOn('ovenFire', on ? 1 : 0);
    fx.setLight(LIGHT.oven, on ? 1 : 0);
  }

  _tool(m, tipX, lift = 0, z = TOOL_Z) {
    m.rotation.set(0, 0, 0);
    m.position.set(tipX, FLOOR + lift, z);
  }

  controls() {
    const s = this.state;
    const busy = !!this.anim;
    return [
      { id: 'rake', label: 'Rake out the embers', enabled: !busy && s === 'firing' && this.heat >= 1, next: s === 'firing' && this.heat >= 1 },
      { id: 'load', label: `Set a loaf with the peel (${this.loaded}/${SLOTS.length})`, enabled: !busy && s === 'ready' && this.loaded < SLOTS.length, next: s === 'ready' },
      { id: 'loadAll', label: 'Set them all', enabled: !busy && s === 'ready' && this.loaded < SLOTS.length },
      { id: 'seal', label: 'Stop and seal the mouth', enabled: !busy && s === 'ready' && this.loaded > 0, next: s === 'ready' && this.loaded === SLOTS.length },
      { id: 'draw', label: 'Break the seal and draw the bread', enabled: !busy && s === 'baked', next: s === 'baked' },
      { id: 'refire', label: 'Fire the oven again', enabled: !busy && s === 'empty', next: s === 'empty' },
    ];
  }

  status() {
    const s = this.state;
    if (this.anim) return { rake: 'Raking out the embers…', swab: 'Swabbing the oven floor…', load: 'Setting a loaf…', seal: 'Sealing the mouth…', draw: 'Drawing the bread…', refire: 'Laying in fresh faggots…' }[this.anim.kind] ?? '';
    if (s === 'firing') return this.heat < 1 ? `Firing: the oven is heating (${Math.round(this.heat * 100)}%).` : 'Hot enough: the dome has whitened. Rake out the embers.';
    if (s === 'ready') return this.loaded ? `${this.loaded} loaves set on the hot floor.` : 'Raked and swabbed: ready for the bread.';
    if (s === 'baking') return `Baking in the stored heat (${Math.round(this.bake * 100)}%).`;
    if (s === 'baked') return 'Baked. Break the seal and draw the bread.';
    if (s === 'empty') return 'The bread is out to cool; the oven is cooling.';
    return '';
  }

  click(L) {
    if (L.key === 'rake' && this.state === 'firing') this.act('rake');
    else if (L.key === 'peel' && this.state === 'ready') this.act('load');
    else if (L.key === 'peel' && this.state === 'baked') this.act('draw');
    else if (L.key === 'ovenDoor' && this.state === 'ready' && this.loaded) this.act('seal');
    else if (L.key === 'ovenDoor' && this.state === 'baked') this.act('draw');
  }

  act(id) {
    if (this.anim) return;
    const t = this.app.time;
    const note = (k) => this.toast(NOTES[k], 7000);
    if (id === 'rake' && this.state === 'firing' && this.heat >= 1) {
      this.anim = { kind: 'rake', t0: t, dur: 4.2 };
      this._setFire(false);
      note('raking');
    } else if (id === 'load' && this.state === 'ready' && this.loaded < SLOTS.length) {
      this.anim = { kind: 'load', t0: t, dur: 1.8, slot: this.loaded };
      if (this.loaded === 0) note('load');
    } else if (id === 'loadAll' && this.state === 'ready') {
      this.loadAll = true;
      this.act('load');
      return;
    } else if (id === 'seal' && this.state === 'ready' && this.loaded) {
      this.anim = { kind: 'seal', t0: t, dur: 1.6 };
      note('seal');
    } else if (id === 'draw' && this.state === 'baked') {
      this.anim = { kind: 'draw', t0: t, dur: 1.2 + this.loaded * 0.9 };
      note('draw');
    } else if (id === 'refire' && this.state === 'empty') {
      this.anim = { kind: 'refire', t0: t, dur: 1.6 };
      note('firing');
    }
    this.touched();
    this.bump();
  }

  update(t, dt) {
    if (this.state === 'firing' && !this.anim && this.heat < 1) {
      this.heat = Math.min(1, this.heat + dt / 14);
      if (this.heat >= 1) this.bump();
    }
    if (this.state === 'baking') {
      this.bake = Math.min(1, this.bake + dt / 16);
      for (const m of this.loaves) {
        if (!m.visible) continue;
        m.material.uniforms.uTint.value.setRGB(0.9 - 0.25 * this.bake, 0.83 - 0.4 * this.bake, 0.66 - 0.45 * this.bake);
      }
      this.app.world.fx.setOn('ovenSteam', 0.5);
      if (this.bake >= 1) {
        this.state = 'baked';
        this.app.world.fx.setOn('ovenSteam', 0);
        this.bump();
      } else if (Math.floor(this.bake * 100) !== this._lastPct) {
        this._lastPct = Math.floor(this.bake * 100);
        this.bump();
      }
    } else if (this.state === 'firing' && Math.floor(this.heat * 100) !== this._lastPct) {
      this._lastPct = Math.floor(this.heat * 100);
      this.bump();
    }
    this._animate(t);
    this._baker(t, dt);
  }

  _animate(t) {
    const a = this.anim;
    this.embers.visible = this.state === 'firing' || (a && a.kind === 'rake');
    this.app.world.fx.setOn('ovenEmbers', a && a.kind === 'rake' ? 1 : 0);
    if (!a) {
      this.rest();
      this._placeDoor();
      return;
    }
    const k = Math.min(1, (t - a.t0) / a.dur);
    const inOut = (u) => (u < 0.5 ? u * 2 : 2 - u * 2); // 0 -> 1 -> 0
    if (a.kind === 'rake') {
      const strokes = 3;
      const u = (k * strokes) % 1;
      const depth = [6.4, 7.0, 7.7][Math.min(strokes - 1, Math.floor(k * strokes))];
      this._tool(this.rake, MOUTH_X - (MOUTH_X - depth) * inOut(u), 0.0, TOOL_Z - 0.25 * Math.sin(k * 9));
      this.embers.scale.setScalar(Math.max(0.05, 1 - k));
      if (k >= 1) {
        this.embers.scale.setScalar(1);
        this.anim = { kind: 'swab', t0: t, dur: 2.4 };
        this.toast(NOTES.swab, 6500);
        this.app.world.fx.setOn('ovenSteam', 1);
      }
    } else if (a.kind === 'swab') {
      this._tool(this.malkin, MOUTH_X - (MOUTH_X - 6.6) * inOut((k * 2) % 1), 0.0, TOOL_Z - 0.35 * Math.sin(k * 12));
      if (k >= 1) {
        this.app.world.fx.setOn('ovenSteam', 0);
        this.state = 'ready';
        this.anim = null;
        this.bump();
      }
    } else if (a.kind === 'load') {
      const [sx, sz] = SLOTS[a.slot];
      const tipIn = sx;
      const x = MOUTH_X + 1.4 - (MOUTH_X + 1.4 - tipIn) * inOut(k);
      this._tool(this.peel, x, 0.02, sz);
      const L = this.loaves[a.slot];
      if (k < 0.5) {
        L.visible = true;
        L.position.set(x, FLOOR + 0.05, sz);
        L.material.uniforms.uTint.value.set(0xe6d3a8);
      } else L.position.set(sx, FLOOR, sz);
      if (k >= 1) {
        this.loaded++;
        this.anim = null;
        if (this.loadAll && this.loaded < SLOTS.length) this.act('load');
        else this.loadAll = false;
        this.bump();
      }
    } else if (a.kind === 'seal') {
      this.door.rotation.set(0, 0, 0);
      const x = MOUTH_X + 0.9 - 0.9 * Math.min(1, k * 1.4);
      this.door.position.set(x, FLOOR - 0.02, TOOL_Z + 0.05);
      this.seal.visible = k > 0.75;
      this.seal.position.set(MOUTH_X + 0.02, FLOOR - 0.02, TOOL_Z + 0.05);
      if (k >= 1) {
        this.state = 'baking';
        this.bake = 0;
        this.anim = null;
        this.toast(NOTES.baking, 6500);
        this.bump();
      }
    } else if (a.kind === 'draw') {
      // door off first, then each loaf out on the peel
      const first = 1.2 / a.dur;
      if (k < first) {
        this.seal.visible = false;
        this.door.position.set(MOUTH_X + 0.9 * (k / first), FLOOR - 0.02, TOOL_Z + 0.05);
      } else {
        const per = (1 - first) / this.loaded;
        const i = Math.min(this.loaded - 1, Math.floor((k - first) / per));
        const u = ((k - first) - i * per) / per;
        const [sx, sz] = SLOTS[i];
        const x = MOUTH_X + 1.4 - (MOUTH_X + 1.4 - sx) * inOut(u);
        this._tool(this.peel, x, 0.02, sz);
        for (let j = 0; j < i; j++) this.loaves[j].visible = false;
        if (u > 0.5) this.loaves[i].position.set(x, FLOOR + 0.05, sz);
        if (u > 0.95) this.loaves[i].visible = false;
      }
      if (k >= 1) {
        for (const L of this.loaves) L.visible = false;
        this.loaded = 0;
        this.state = 'empty';
        this.anim = null;
        this.toast('Out they come: brown, crusty loaves for the pantry. One baking fed the household for a day or two.', 5000);
        this.bump();
      }
    } else if (a.kind === 'refire') {
      if (k >= 1) {
        this.state = 'firing';
        this.heat = 0;
        this._setFire(true);
        this.anim = null;
        this.bump();
      }
    }
  }

  _placeDoor() {
    const sealed = this.state === 'baking' || this.state === 'baked';
    this.seal.visible = sealed;
    if (sealed) {
      this.door.rotation.set(0, 0, 0);
      this.door.position.set(MOUTH_X, FLOOR - 0.02, TOOL_Z + 0.05);
      this.seal.position.set(MOUTH_X + 0.02, FLOOR - 0.02, TOOL_Z + 0.05);
    }
  }

  // the baker steps up to the mouth whenever a tool is in use
  _baker(t, dt) {
    const baker = this.app.world.cast.actors.baker;
    if (!baker) return;
    if (this.anim && !this._baking) {
      this._baking = true;
      baker.override = (e, tt, ddt) => {
        const a = this.anim;
        if (!a) return false;
        const tool = a.kind === 'rake' ? this.rake : a.kind === 'swab' ? this.malkin : a.kind === 'seal' ? this.door : this.peel;
        const endX = Math.min(11.0, Math.max(9.75, tool.position.x + (a.kind === 'seal' ? 0.5 : 2.1)));
        const there = baker.steer(endX, TOOL_Z + 0.25, ddt, 1.6);
        if (!there) e.pose('walk', tt, { phase: baker.phase });
        else {
          baker.turnTo(-Math.PI / 2, ddt);
          e.pose(a.kind === 'seal' ? 'reach' : 'rake', tt);
        }
        return true;
      };
    } else if (!this.anim && this._baking) {
      this._baking = false;
      baker.override = null;
    }
    void dt;
  }
}
