import { Actor } from '../people/actor.js';
import { Figure } from '../people/figure.js';
import { Horse } from '../people/animals.js';
import { Hound, Beast } from '../people/creatures.js';
import { crowd } from '../people/crowd.js';
import { rig } from '../people/parts.js';
import { carried } from '../people/propsCarried.js';
import { labPerson } from '../data/labels.js';
import { G } from './rooms.js';
import { groundY } from './terrain.js';
import { WALK, KEEP, GATE, IN, SPRING, MID, PARA, OUT } from './layout.js';

// The people of Las Aguzaderas on an ordinary morning. Nothing is recorded
// of the garrison: not the alcaide's name, nor its numbers, nor its routine.
// The figures follow what is known of small frontier garrisons generally and
// of how the spring was used (see the notes); every one is conjecture.

const N = Math.PI; // facing north (-z)
const E = Math.PI / 2;
const W = -Math.PI / 2;

// a small seeded random walk, for the cattle
function rngOf(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function wander(seed, [x0, x1, z0, z1], n, idles) {
  const r = rngOf(seed);
  const steps = [];
  for (let i = 0; i < n; i++) {
    steps.push({ go: [[x0 + (x1 - x0) * r(), z0 + (z1 - z0) * r()]] });
    const [pose, dmin, dmax] = idles[Math.floor(r() * idles.length)];
    steps.push({ pose, dur: dmin + (dmax - dmin) * r() });
  }
  return steps;
}

export function buildCast(scene) {
  const actors = {};
  const add = (name, entity, steps, opts = {}) => {
    rig(entity.root);
    scene.add(entity.root);
    const a = new Actor(entity, steps, { floorFn: groundY, ...opts });
    a.name = name;
    actors[name] = a;
    return a;
  };
  const fig = (spec, key, room) => new Figure(spec, labPerson(key, room), G.people);
  const arm = (a, slots) => {
    for (const [slot, prop] of slots) a.e.hold(slot, carried(prop, a.e.mat));
  };
  const hold = (slot, prop) => (a) => a.e.hold(slot, prop ? carried(prop, a.e.mat) : null);
  // padded jacks, iron caps: the plain kit of a frontier garrison
  const soldier = (over) => ({ tunic: 0xb8a47e, quilt: 0x9a8862, hose: 0x5a4c40, kettle: 0x6a6a6e, shoes: 0x3a2a1e, ...over });
  const doorZ = KEEP.z0 - 2.1;
  const gateIn = [IN.x0 + 1.6, (GATE.z0 + GATE.z1) / 2];

  // the alcaide goes the round of the courtyard: the keep door, the gate, the fire
  add('alcaide', fig({ tunic: 0x6e3a2c, hose: 0x3c3434, hood: 0x4a3a2c, beard: true, hair: 0x3a2a20, sword: true, purse: true }, 'alcaide', 'court'), [
    { go: [[-1.2, doorZ]] },
    { pose: 'look', face: N, dur: 6 },
    { go: [[-9.0, -15.0], [gateIn[0] + 0.9, gateIn[1] + 1.2]] },
    { pose: 'idle', face: W, dur: 7 },
    { go: [[-6.4, -21.9]] },
    { pose: 'warm', face: [-6.5, -24.5], dur: 8 },
    { go: [[-3.0, -14.0], [-1.2, doorZ]] },
  ], { start: [-1.2, doorZ], speed: 0.9 });

  // a spearman keeps the gate
  const lancero = add('lancero', fig(soldier({ tunic: 0xa8946c }), 'lancero', 'gate'), [
    { pose: 'guard', face: W, dur: 1e9 },
  ], { start: gateIn, heading: W, yields: false });
  arm(lancero, [['spear', 'spear'], ['back', 'adarga']]);

  // a crossbowman walks the north wall-walk
  const walkZ = (MID.zN + OUT.z0 + PARA.t) / 2 + 0.25;
  const wb = add('ballesteroWall', fig(soldier({ kettle: null, hood: 0x6a5a40 }), 'ballestero', 'wallWalk'), [
    { go: [[9.5, walkZ]], pose: 'sentry' },
    { pose: 'look', face: N, dur: 7 },
    { go: [[-12.5, walkZ]], pose: 'sentry' },
    { pose: 'look', face: N, dur: 5 },
  ], { floor: WALK, start: [-12.5, walkZ], speed: 0.7 });
  arm(wb, [['back', 'crossbow'], ['hip', 'quiver']]);

  // the lookout on the keep terrace, by the signal turret
  const at = add('atalaya', fig(soldier({ tunic: 0x9a8a64, quilt: null, kettle: null, hood: 0x7a6040 }), 'atalaya', 'keepTerrace'), [
    { pose: 'look', face: N, dur: 9 },
    { go: [[-3.4, -4.1]] },
    { pose: 'look', face: W, dur: 7 },
    { go: [[1.4, -4.2]] },
  ], { floor: KEEP.terrace, start: [1.4, -4.2], speed: 0.6 });
  arm(at, [['spear', 'spear']]);

  // another sits by the fire seeing to his crossbow
  const bf = add('ballesteroFire', fig(soldier({ kettle: null, cap: 0x5a4a3a, tunic: 0xb0a07a }), 'ballestero', 'court'), [
    { pose: 'sitWork', params: { seat: 0.4 }, face: E, dur: 1e9 },
  ], { start: [-7.75, -23.6], heading: E, yields: false });
  arm(bf, [['hip', 'quiver']]);

  // a lad brings firewood from the stack to the fire
  add('mozo', fig({ scale: 0.84, tunic: 0xa0906a, hose: 0x6a5a48, hair: 0x5a3a24 }, 'mozo', 'court'), [
    { go: [[5.8, IN.z0 + 1.6]], on: hold('front', null) },
    { pose: 'stoop', face: N, dur: 1.8 },
    { pose: 'carry', params: { moving: false }, face: N, dur: 0.4, on: hold('front', 'logs') },
    { go: [[0.0, -26.0], [-5.6, -25.4]], pose: 'carry' },
    { pose: 'stoop', face: W, dur: 1.5 },
    { pose: 'idle', face: W, dur: 2.5, on: hold('front', null) },
    { go: [[-1.0, -27.5], [5.8, IN.z0 + 1.6]] },
  ], { start: [5.8, IN.z0 + 1.6], speed: 0.95 });

  // the alcaide's horse, tied by the keep
  add('horse', new Horse(labPerson('horse', 'court'), G.people, { coat: 0x5a3e2c, dark: 0x2e221a, harness: false }), [
    { pose: 'stand', dur: 9 }, { pose: 'eat', dur: 7 },
  ], { start: [-5.6, -8.2], heading: W, radius: 0.6, yields: false });

  // a herdsman waters cattle at the spring below the walls
  const sp = SPRING;
  add('vaquero', fig({ tunic: 0x86704c, hose: 0x5a4c3c, hood: 0x6a5434, beard: true, hair: 0x6a5a48 }, 'vaquero', 'spring'), [
    { pose: 'lean', face: W, dur: 16 },
    { go: [[sp.x + 1.4, sp.z - 3.4]], speed: 0.5 },
    { pose: 'look', face: N, dur: 6 },
    { go: [[sp.x + 1.8, sp.z + 2.9]], speed: 0.5 },
  ], { start: [sp.x + 1.8, sp.z + 2.9], heading: W, speed: 0.5 });
  actors.vaquero.e.hold('handR', carried('crook', actors.vaquero.e.mat));
  add('dog', new Hound(labPerson('hound', 'spring'), G.people, { color: 0x6a5440, dark: 0x3a2e24 }), [
    { pose: 'sit', dur: 14 }, { go: [[sp.x + 3.0, sp.z + 4.4]] }, { pose: 'sniff', dur: 5 }, { go: [[sp.x + 2.4, sp.z + 3.6]] }, { pose: 'lie', dur: 18 },
  ], { start: [sp.x + 2.4, sp.z + 3.6], speed: 0.9, radius: 0.3 });
  const coats = [[0x5a3a26, null], [0x8a5a34, null], [0x3a302a, null], [0x9a7048, 0x4a3424], [0x6a4a30, null]];
  coats.forEach(([c, d], i) => {
    add(`cow${i}`, new Beast(labPerson('cow', 'spring'), G.people, 'cow', { color: c, dark: d ?? undefined, patches: !!d, scale: i === 4 ? 0.65 : 0.9 }), [
      ...(i < 2 ? [{ go: [[sp.x + 3.9, sp.z - 0.8 + i * 1.5]] }, { pose: 'eat', dur: 10, face: W }] : []),
      ...wander(40 + i * 7, [sp.x - 9, sp.x + 4, sp.z - 9, sp.z + 6], 4, [['graze', 8, 16], ['stand', 3, 6], ['graze', 6, 12], ['lie', 12, 20]]),
    ], { speed: 0.35, stride: 1.4, turnRate: 1.5, radius: i === 4 ? 0.4 : 0.55, start: [sp.x - 4 + i * 2.2, sp.z + 4 - i] });
  });

  const solid = Object.values(actors).filter((a) => a.solid);
  return {
    actors,
    alarm: [],
    update(t, dt) {
      crowd(solid, t, dt);
      for (const a of Object.values(actors)) a.update(t, dt);
    },
  };
}
