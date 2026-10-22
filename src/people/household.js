import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { lab, labPerson } from '../data/labels.js';
import { G } from '../castle/rooms.js';
import { groundY } from '../castle/terrain.js';
import { TOWERS, TOWER_FLOORS, TOWER_IN, OUTER_Y, OC_OUT, BUTTS } from '../castle/layout.js';
import { KING, GARRISON } from '../castle/towers.js';
import { STABLE } from '../castle/stable.js';
import { FARM_AT } from '../castle/farm.js';
import { Horse } from './animals.js';
import { Beast, Goose, Bird } from './creatures.js';
import { carried } from './propsCarried.js';
import { partGeo, figureMaterial, mesh } from './parts.js';

// The rest of the people: the king and his household in the north-west
// tower, the garrison in the north-east tower, at the gate and at drill,
// children at play in the ward, grooms in the stable, and the home farm
// with its beasts and the archers at the butts.

const N = Math.PI;
const E = Math.PI / 2;
const W = -Math.PI / 2;
const S = 0;
const [F0, F1, F2, F3] = TOWER_FLOORS;
const OY = OUTER_Y;

function rngOf(seed) {
  // scramble the seed first: nearby seeds would otherwise start out nearly alike
  let s = Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0 || 1;
  s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Wandering steps within a box: walk somewhere, then do one of `idles`. */
function wander(seed, [x0, x1, z0, z1], n, idles, pose = 'walk') {
  const r = rngOf(seed);
  const steps = [];
  for (let i = 0; i < n; i++) {
    steps.push({ go: [[x0 + (x1 - x0) * r(), z0 + (z1 - z0) * r()]], pose });
    const [name, dmin, dmax] = idles[Math.floor(r() * idles.length)];
    steps.push({ pose: name, dur: dmin + (dmax - dmin) * r(), params: { seed: Math.floor(r() * 10) } });
  }
  return steps;
}

// men of the garrison, in quilted aketons, mail coifs and kettle hats
export const soldier = (over = {}) => ({ tunic: 0xc4b48a, quilt: 0xa69670, hose: 0x5a5048, mail: 0x8c8e90, kettle: 0x66666a, sword: true, shoes: 0x3a2a1e, ...over });
// off duty: no helmet or mail
const offDuty = (over = {}) => ({ tunic: 0xb8a882, quilt: 0x9a8a64, hose: 0x5a5048, shoes: 0x3a2a1e, ...over });

export function buildHousehold({ scene, add, fig }) {
  const hold = (a, slot, prop) => a.e.hold(slot, carried(prop, a.e.mat));
  const updaters = [];
  const alarm = []; // [actor, steps while the alarm is up]
  const nw = TOWERS.nw;
  const ne = TOWERS.ne;

  // ---- the king's tower ------------------------------------------------------
  // prison
  add('prisoner', fig({ tunic: 0x7a7060, hose: 0x5a5048, hair: 0x5a4a3a, beard: true, scale: 0.97 }, 'prisoner', 'kingTower'), [
    { pose: 'sit', dur: 14, params: { seat: 0.47 }, face: S },
    { pose: 'sitWork', dur: 4, params: { seat: 0.47, speed: 1.2 }, face: S },
  ], { floor: F0, start: [nw.x - 1.1, nw.z - 3.55], heading: S, yields: false });
  const gaoler = add('gaoler', fig({ tunic: 0x5a4a3a, hose: 0x3a3430, hood: 0x3a3430, beard: true, hair: 0x4a3a2a, scale: 1.04 }, 'gaoler', 'kingTower'), [
    { go: [[nw.x + 0.6, nw.z - 1.6]], speed: 0.6 },
    { pose: 'look', face: [nw.x - 1.1, nw.z - 3.55], dur: 6 },
    { go: [[nw.x - 2.2, nw.z - 1.0]], speed: 0.6 },
    { pose: 'idle', face: [nw.x - 1.1, nw.z - 3.55], dur: 5 },
    { go: [[nw.x + 2.0, nw.z + 1.4]], speed: 0.6 },
    { pose: 'look', face: S, dur: 7 },
  ], { floor: F0 });
  hold(gaoler, 'hip', 'keys');

  // knights' chamber
  add('knightAsleep', fig({ tunic: 0xe8e0cc, hose: 0x7a6a5a, hair: 0x6a4a30, beard: true }, 'knight', 'kingTower'), [
    { pose: 'sleep', dur: 1e9, params: { bed: 0.5 } },
  ], { floor: F1, start: [nw.x - 1.6, nw.z - 2.9], heading: E, yields: false });
  const knight = add('knight', fig({ tunic: 0x3f5a7a, gownColor: 0x3f5a7a, hose: 0x7a3a2a, hair: 0x3a2a20, sword: true, cape: 0x8a3a2a, scale: 1.04 }, 'knight', 'kingTower'), [
    { go: [[nw.x - 3.0, nw.z + 0.3]], speed: 0.7 },
    { pose: 'look', face: W, dur: 9 },
    { go: [[nw.x - 0.5, nw.z - 1.4]], speed: 0.7 },
    { pose: 'warm', face: N, dur: 3 },
    { go: [[nw.x + 1.6, nw.z + 0.4]], speed: 0.7 },
    { pose: 'idle', face: [nw.x + 2.6, nw.z + 0.9], dur: 6 },
  ], { floor: F1 });
  void knight;
  const squire = add('squire', fig({ tunic: 0x7a8a5a, hose: 0x5a5048, hair: 0x9a7a48, scale: 0.86 }, 'squire', 'kingTower'), [
    { pose: 'polish', dur: 12, params: { seat: 0.42 }, face: W },
    { pose: 'sitWork', dur: 3, params: { seat: 0.42, speed: 1.5 }, face: W },
  ], { floor: F1, start: [nw.x + 2.6, nw.z + 0.9], heading: W, yields: false });
  hold(squire, 'handL', 'helm');

  // the privy chamber: the king on his chair of state, a messenger on his knee
  const kingFig = add('king', fig({
    gown: true, tunic: 0x9a2a2a, gownColor: 0x9a2a2a, sleeve: 0x9a2a2a, cape: 0x2f4a7a, fur: 0xf2eee4, crown: true,
    hair: 0x8a8070, beard: true, shoes: 0x2a1e16, scale: 1.08,
  }, 'king', 'kingTower'), [
    { pose: 'sit', dur: 16, params: { seat: 0.5 }, face: S },
    { pose: 'taste', dur: 2.5, face: S },
    { pose: 'sit', dur: 10, params: { seat: 0.5 }, face: S },
  ], { floor: F2 + 0.2, start: [KING.throne[0], KING.throne[1] + 0.08], heading: S, yields: false });
  void kingFig;
  const toDoor = [[nw.x + 1.4, nw.z - 1.2], [nw.x + 3.2, nw.z - 2.7]];
  const messenger = add('messenger', fig({ tunic: 0x5a7a4a, hose: 0x8a6a3a, hood: 0x5a6a3a, scale: 0.98 }, 'messenger', 'kingTower'), [
    { go: [[nw.x + 1.4, nw.z - 1.2], [nw.x + 0.1, nw.z - 1.7]], speed: 0.7 },
    { pose: 'kneel', face: N, dur: 9 },
    { pose: 'bow', face: N, dur: 2 },
    { go: toDoor, speed: 0.8 },
    { pose: 'idle', face: [nw.x + 3.9, nw.z - 2.7], dur: 12 },
  ], { floor: F2, start: [nw.x + 3.2, nw.z - 2.7] });
  hold(messenger, 'handL', 'roll');
  const clerk = add('chancery', fig({ gown: true, tunic: 0x2a2a30, gownColor: 0x2a2a30, cap: 0x1a1818, hair: 0x5a4a3a, purse: true }, 'royalClerk', 'kingTower'), [
    { pose: 'read', face: [nw.x, nw.z - 2.0], dur: 10 },
    { pose: 'write', face: E, dur: 6 },
  ], { floor: F2, start: [nw.x - 1.5, nw.z - 2.3], heading: E });
  hold(clerk, 'handR', 'roll');
  const lady = add('lady', fig({ gown: true, tunic: 0x3f5a7a, gownColor: 0x3f5a7a, veil: 0xf2eee4, apron: null, scale: 0.95 }, 'lady', 'kingTower'), [
    { pose: 'sitWork', dur: 20, params: { seat: 0.48, speed: 2.2 }, face: E },
    { pose: 'sit', dur: 6, params: { seat: 0.48 }, face: E },
  ], { floor: F2, start: [nw.x - TOWER_IN + 0.45, nw.z + 0.0], heading: E, yields: false });
  void lady;
  const minstrel = add('minstrel', fig({ tunic: 0xd8a83a, hose: 0x9a2a2a, cap: 0x9a2a2a, hair: 0x7a5a38, sleeve: 0x9a2a2a }, 'minstrel', 'kingTower'), [
    { pose: 'play', face: [nw.x, nw.z - 3.0], dur: 18 },
    { go: [[nw.x + 1.0, nw.z + 1.0]], speed: 0.5 },
    { pose: 'bow', face: N, dur: 2 },
    { go: [[nw.x + 2.1, nw.z + 0.3]], speed: 0.5 },
  ], { floor: F2, start: [nw.x + 2.1, nw.z + 0.3] });
  hold(minstrel, 'handL', 'fiddle');
  hold(minstrel, 'handR', 'fiddleBow');

  // the bedchamber: a page asleep, the chamberlain making ready
  add('page', fig({ tunic: 0x9a2a2a, hose: 0xd8b04a, hair: 0xb08a50, scale: 0.72 }, 'page', 'kingTower'), [
    { pose: 'sleep', dur: 1e9, params: { bed: 0.12, side: true } },
  ], { floor: F3, start: [nw.x - 0.95, nw.z - 0.15], heading: E, yields: false });
  const chamberlain = add('chamberlain', fig({ gown: true, tunic: 0x5a3a5a, gownColor: 0x5a3a5a, hood: 0x3a2a3a, hair: 0x6a5a4a, purse: true }, 'chamberlain', 'kingTower'), [
    { go: [[nw.x + 1.9, nw.z - 0.4]], speed: 0.6 },
    { pose: 'stoop', params: { amount: 0.6 }, face: E, dur: 2.5, on: (a) => hold(a, 'front', 'clothes') },
    { go: [[nw.x + 1.7, nw.z - 2.2]], pose: 'carry', speed: 0.6 },
    { pose: 'reach', face: W, dur: 3, on: (a) => a.e.release('front') },
    { go: [[nw.x - 2.4, nw.z - 0.9]], speed: 0.6 },
    { pose: 'warm', face: W, dur: 6 },
    { go: [[nw.x + 0.4, nw.z + 1.2]], speed: 0.6 },
    { pose: 'look', face: N, dur: 5 },
  ], { floor: F3 });
  void chamberlain;

  // ---- the garrison tower ---------------------------------------------------
  // the armoury: the armourer at the grindstone, a boy turning it, the fletcher
  const [gx, gyy, gz] = GARRISON.grind;
  const wheelMat = figureMaterial(lab('grindstone', 'garrison'), G.people);
  const wheel = mesh(partGeo((b) => {
    b.with({ kind: K.STONE, color: 0xb8ae98 }, () => lathe(b, v3(0, 0, -0.08), 'z', [[0.36, 0], [0.38, 0.03], [0.38, 0.13], [0.36, 0.16]], 18));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      lathe(b, v3(0, 0, -0.32), 'z', [[0.03, 0], [0.03, 0.75]], 8);
      beam(b, v3(0, 0, 0.42), v3(0.25, 0, 0.42), 0.03, 0.03); // crank arm
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(0.25, 0, 0.42), 'z', [[0.03, 0], [0.03, 0.18]], 8));
  }), wheelMat);
  wheel.position.set(gx, gyy, gz);
  scene.add(wheel);
  let wheelA = 0;
  const grinder = add('grinder', fig({ tunic: 0x8a7a5a, hose: 0x5a4a3a, hair: 0x8a6a40, scale: 0.8 }, 'armourer', 'garrison'), [
    { pose: 'crank', dur: 1e9 },
  ], { floor: F0, start: [gx + 0.25, gz + 0.95], heading: N, yields: false });
  grinder.steps[0].params = {};
  updaters.push((t, dt) => {
    wheelA += dt * 3.2;
    wheel.rotation.z = -wheelA;
    grinder.steps[0].params.angle = wheelA + Math.PI;
  });
  const armourer = add('armourer', fig({ tunic: 0x5a4a3a, apron: 0x6a4a30, hose: 0x3a3430, hair: 0x3a2a1e, beard: true, scale: 1.05 }, 'armourer', 'garrison'), [
    { pose: 'reach', face: W, dur: 7 },
    { pose: 'look', face: W, dur: 2 },
    { pose: 'reach', face: W, dur: 6 },
    { go: [[ne.x + 2.0, ne.z - 2.6]], speed: 0.6 },
    { pose: 'stoop', params: { amount: 0.4 }, face: E, dur: 2.5 },
    { go: [[gx + 0.8, gz]], speed: 0.6 },
  ], { floor: F0, start: [gx + 0.8, gz], heading: W });
  hold(armourer, 'handR', 'sword');
  const fletcher = add('fletcher', fig({ tunic: 0x6a7a5a, hose: 0x5a5048, hood: 0x8a7a50, scale: 0.97 }, 'fletcher', 'garrison'), [
    { pose: 'sitWork', dur: 1e9, params: { seat: 0.47, speed: 2.6 }, face: N },
  ], { floor: F0, start: [ne.x - 1.7, ne.z - 2.52], heading: N, yields: false });
  void fletcher;
  // the dormitory: men off watch asleep on their pallets
  const sleepers = [];
  GARRISON.pallets.slice(0, 3).forEach((p, i) => {
    const sl = add(`sleeper${i}`, fig(offDuty({ hair: [0x5a4030, 0x3a2a20, 0x8a6a40][i], beard: i !== 1, tunic: [0xb8a882, 0xa89a78, 0xc4b48a][i] }), 'soldierOff', 'garrison'), [
      { pose: 'sleep', dur: 1e9, params: { bed: 0.14, side: i === 1 } },
    ], { floor: F1, start: [p.x, p.z], heading: p.h, yields: false });
    sleepers.push(sl);
    alarm.push([sl, [{ pose: 'stoop', params: { amount: 0.5 }, dur: 1.2, face: p.h + Math.PI }, { pose: 'look', dur: 1e9, face: p.h + Math.PI }]]);
  });
  const p3 = GARRISON.pallets[3];
  const polisher = add('polisher', fig(offDuty({ hair: 0x6a5a48, tunic: 0xa8a080 }), 'soldierOff', 'garrison'), [
    { pose: 'polish', dur: 1e9, params: { seat: 0.47 }, face: W },
  ], { floor: F1, start: [ne.x + 0.95, ne.z - 1.0], heading: W, yields: false });
  hold(polisher, 'handL', 'helm');
  void p3;
  // the mess: dice at the table, a man warming his hands
  const dicers = [[ne.x - 0.6, ne.z - 3.12, S], [ne.x + 0.6, ne.z - 3.12, S], [ne.x + 0.1, ne.z - 1.27, N]].map(([x, z, h], i) => {
    const d = add(`dicer${i}`, fig(offDuty({ hair: [0x4a3a2a, 0x8a6a40, 0x2a2018][i], beard: i === 2, tunic: [0xb0a07a, 0xc4b48a, 0x9a8a64][i] }), 'soldierOff', 'garrison'), [
      { pose: 'dice', dur: 1e9, params: { seat: 0.47 }, face: h },
    ], { floor: F2, start: [x, z], heading: h, yields: false });
    alarm.push([d, [{ pose: 'look', dur: 1e9, face: h }]]);
    return d;
  });
  void dicers;
  add('warmer', fig(soldier({ kettle: null }), 'watchman', 'garrison'), [
    { pose: 'warm', face: [GARRISON.brazier[0], GARRISON.brazier[2]], dur: 9 },
    { go: [[ne.x + 0.8, ne.z - 0.4]], speed: 0.5 },
    { pose: 'look', face: [ne.x, ne.z - 2.2], dur: 5 },
    { go: [[GARRISON.brazier[0] - 0.85, GARRISON.brazier[2] + 0.35]], speed: 0.5 },
  ], { floor: F2, start: [GARRISON.brazier[0] - 0.85, GARRISON.brazier[2] + 0.35] });
  // the constable at his desk, the sergeant reporting
  const constable = add('constable', fig({ gown: true, tunic: 0x3f5a3a, gownColor: 0x3f5a3a, hose: 0x5a3a2a, cap: 0x2a3a2a, hair: 0x8a8070, beard: true, purse: true, sword: true, scale: 1.04 }, 'constable', 'garrison'), [
    { pose: 'write', face: N, dur: 10, on: (a) => hold(a, 'handR', 'quill') },
    { pose: 'look', face: [ne.x, ne.z - 0.2], dur: 4 },
    { go: [[ne.x - 0.2, ne.z - 1.9]], speed: 0.5, on: (a) => a.e.release('handR') },
    { pose: 'reach', face: S, dur: 2.5 },
    { go: [[ne.x + 1.3, ne.z - 2.5]], speed: 0.5 },
  ], { floor: F3, start: [ne.x + 1.3, ne.z - 2.5], heading: N });
  void constable;
  const sergeant = add('sergeant', fig(soldier({ tunic: 0xa83a2a, quilt: 0x8a3020, cross: null }), 'sergeant', 'garrison'), [
    { pose: 'sentry', params: { moving: false }, face: [ne.x + 1.3, ne.z - 2.5], dur: 8 },
    { pose: 'salute', face: [ne.x + 1.3, ne.z - 2.5], dur: 1.6 },
    { go: [[ne.x + 0.8, ne.z + 1.3]], pose: 'sentry', speed: 0.6 },
    { pose: 'sentry', params: { moving: false }, face: W, dur: 5 },
    { go: [[ne.x + 1.6, ne.z - 1.2]], pose: 'sentry', speed: 0.6 },
  ], { floor: F3, start: [ne.x + 1.6, ne.z - 1.2] });
  hold(sergeant, 'spear', 'spear');

  // ---- the gate: two men of the watch ---------------------------------------
  const guard1 = add('gateGuard1', fig(soldier({ cross: 0xb0302a }), 'gateGuard', 'gatehouse'), [
    { pose: 'guard', face: W, dur: 14 },
    { go: [[18.2, -4.6]], pose: 'sentry', speed: 0.6 },
    { pose: 'sentry', params: { moving: false }, face: W, dur: 6 },
    { go: [[18.3, -2.5]], pose: 'sentry', speed: 0.6 },
  ], { start: [18.3, -2.5], heading: W });
  hold(guard1, 'spear', 'spear');
  const guard2 = add('gateGuard2', fig(soldier({ cross: 0xb0302a, tunic: 0xb8a882 }), 'gateGuard', 'gatehouse'), [
    { pose: 'guard', face: W, dur: 1e9 },
  ], { start: [22.6, -1.0], heading: W, yields: false });
  hold(guard2, 'spear', 'spear');
  alarm.push([guard1, [{ go: [[19.6, -1.2]], pose: 'run', speed: 2.6, stride: 2.4 }, { pose: 'sentry', params: { moving: false }, face: E, dur: 1e9 }]]);
  alarm.push([guard2, [{ pose: 'sentry', params: { moving: false }, face: E, dur: 1e9 }]]);

  // ---- a sergeant drilling new men with the spear, in the ward ---------------
  const recruits = [];
  for (let i = 0; i < 4; i++) {
    const x = 3.4 + i * 1.25;
    const r = add(`recruit${i}`, fig(soldier({ mail: null, kettle: i % 2 ? 0x66666a : null, hood: i % 2 ? null : [0x6a5a40, 0x5a6a4a][i / 2], hair: 0x5a4030, tunic: [0xc4b48a, 0xb8a882, 0xb0a07a, 0xc8b890][i], sword: false }), 'recruit', 'ward'), [
      { pose: 'drill', dur: 1e9, params: { offset: i * 0.08, speed: 0.55 } },
    ], { start: [x, -4.6], heading: S, yields: false });
    hold(r, 'front', 'pike');
    recruits.push(r);
    alarm.push([r, [{ go: [[13.2 + i * 0.4, -5.2 + i * 1.2], [16.6, -4.0 + i * 0.95]], pose: 'run', speed: 2.4 + i * 0.1, stride: 2.4 }, { pose: 'drill', dur: 1e9, face: E, params: { offset: i * 0.08, speed: 0.4 } }]]);
  }
  const drillSergeant = add('drillSergeant', fig(soldier({ tunic: 0xa83a2a, quilt: 0x8a3020 }), 'sergeant', 'ward'), [
    { go: [[2.8, -2.7]], pose: 'sentry', speed: 0.7 },
    { pose: 'sentry', params: { moving: false }, face: N, dur: 5 },
    { go: [[7.8, -2.7]], pose: 'sentry', speed: 0.7 },
    { pose: 'sentry', params: { moving: false }, face: N, dur: 5 },
  ], { start: [7.8, -2.7] });
  hold(drillSergeant, 'spear', 'spear');
  alarm.push([drillSergeant, [{ go: [[15.6, -6.0]], pose: 'run', speed: 2.6, stride: 2.4 }, { pose: 'sentry', params: { moving: false }, face: E, dur: 1e9 }]]);

  // ---- children chasing each other round the ward ----------------------------
  const loop = [[-9.0, -3.2], [-7.5, -5.3], [-5.0, -5.0], [-4.2, -3.0], [-5.8, -1.5], [-8.2, -1.8]];
  const chase = (start) => {
    const pts = loop.slice(start).concat(loop.slice(0, start));
    return [
      { go: pts.concat([pts[0]]), pose: 'run', speed: 2.0, stride: 1.6 },
      { go: pts.concat([pts[0]]), pose: 'run', speed: 2.0, stride: 1.6 },
      { pose: 'idle', dur: 2.5, face: S },
    ];
  };
  const kid1 = add('child1', fig({ tunic: 0x9a6a4a, hose: 0x6a5a48, hair: 0xb08a50, scale: 0.6 }, 'child', 'ward'), chase(0), { speed: 2.0, radius: 0.2 });
  const kid2 = add('child2', fig({ gown: true, tunic: 0x6a7a9a, veil: null, hair: 0x7a5a38, scale: 0.56 }, 'child', 'ward'), chase(3), { speed: 2.0, radius: 0.2 });
  for (const k of [kid1, kid2]) alarm.push([k, [{ go: [[-10.2, -7.6]], pose: 'run', speed: 2.2, stride: 1.6 }, { pose: 'idle', dur: 1e9, face: E }]]);

  // ---- the stable: grooms and horses ----------------------------------------
  const coats = [[0x6a4228, 0x2a1e16], [0xb8b4ac, 0x6a6660], [0x9a5a30, 0x6a3a1e], [0x2e2a28, 0x1a1816]];
  STABLE.stalls.slice(1).forEach((st, i) => {
    add(`stableHorse${i}`, new Horse(labPerson('horse', 'stable'), G.people, { coat: coats[i][0], dark: coats[i][1], harness: false }), [
      { pose: i % 2 ? 'eat' : 'stand', dur: 9 + i * 3, params: { seed: i * 2 } },
      { pose: i % 2 ? 'stand' : 'eat', dur: 7 + i * 2, params: { seed: i * 2 } },
    ], { start: [st.x, st.z + 0.15], heading: N, floor: OY, radius: 0.6, yields: false });
  });
  const st0 = STABLE.stalls[0];
  const groom = add('groom', fig({ tunic: 0x7a6a4a, hose: 0x5a4a3a, hood: 0x6a5a3a, scale: 0.98 }, 'groom', 'stable'), [
    { pose: 'fork', face: N, dur: 10 },
    { go: [[st0.x + 0.3, STABLE.zf + 0.6]], speed: 0.6 },
    { pose: 'fork', face: S, dur: 6 },
    { go: [[st0.x, st0.z + 0.3]], speed: 0.6 },
  ], { floor: OY, start: [st0.x, st0.z + 0.3], heading: N });
  hold(groom, 'handR', 'fork');
  const lad = add('stableLad', fig({ tunic: 0x9a8a6a, hose: 0x6a5a48, hair: 0x9a7a48, scale: 0.84 }, 'groom', 'stable'), [
    { go: [[STABLE.x1 + 0.55, STABLE.zb + 2.6]], speed: 0.8 },
    { pose: 'stoop', face: E, dur: 2, on: (a) => hold(a, 'front', 'hay') },
    { go: [[STABLE.x1 - 0.5, STABLE.zf + 1.1], [STABLE.stalls[2].x + 0.9, STABLE.zf + 1.1], [STABLE.stalls[2].x + 0.9, STABLE.zb + 1.2]], pose: 'carry', speed: 0.7 },
    { pose: 'reach', face: N, dur: 2.5, on: (a) => a.e.release('front') },
    { go: [[STABLE.stalls[2].x + 0.9, STABLE.zf + 1.1], [STABLE.stalls[3].x + 0.9, STABLE.zf + 1.1]], speed: 0.8 },
    { pose: 'wipe', face: N, dur: 5, on: (a) => hold(a, 'handR', 'brush') },
    { go: [[STABLE.x1 - 0.5, STABLE.zf + 1.1]], speed: 0.8, on: (a) => a.e.release('handR') },
  ], { floor: OY });
  void lad;

  // ---- the home farm ---------------------------------------------------------
  const farmLab = (key) => labPerson(key, 'farm');
  const byre = FARM_AT.byre;
  const pd = FARM_AT.paddock;
  // a cow in the byre being milked
  add('milkCow', new Beast(farmLab('cow'), G.people, 'cow', { color: 0x8a4a2a, seed: 1 }), [
    { pose: 'eat', dur: 12 }, { pose: 'stand', dur: 6 },
  ], { floor: byre.floor, start: [byre.x0 + 2.4, byre.z0 + 1.6], heading: N, radius: 0.55, yields: false });
  const milkmaid = add('milkmaid', fig({ gown: true, tunic: 0x8a7a5a, apron: 0xe8e0cc, veil: 0xeee6d4, scale: 0.93 }, 'milkmaid', 'farm'), [
    { pose: 'milk', dur: 1e9, params: { seat: 0.32 }, face: W },
  ], { floor: byre.floor, start: [byre.x0 + 3.15, byre.z0 + 1.75], heading: W, yields: false });
  void milkmaid;
  const cowCols = [[0x2e2a28, 0xe8e0d0, true], [0x9a6a3a, null, false], [0x6a4a30, null, false], [0xc8b090, null, false]];
  cowCols.forEach(([c, d, patches], i) => {
    add(`cow${i}`, new Beast(farmLab('cow'), G.people, 'cow', { color: c, dark: d ?? undefined, patches, scale: i === 3 ? 0.62 : 1, seed: i * 3 }),
      wander(700 + i * 11, [pd.x0 + 1.2, pd.x1 - 1.2, pd.z0 + 1.2, pd.z1 - 1.2], 5, [['graze', 8, 16], ['graze', 6, 12], ['stand', 3, 6], ['lie', 14, 24]]),
      { floorFn: groundY, speed: 0.35, stride: 1.4, turnRate: 1.5, radius: i === 3 ? 0.35 : 0.6 });
  });
  const cowherd = add('cowherd', fig({ tunic: 0x7a6a4a, hose: 0x5a5040, hood: 0x7a5a3a, beard: true, hair: 0x7a7060 }, 'cowherd', 'farm'), [
    { pose: 'lean', face: N, dur: 14 },
    { go: [[pd.x0 + 3.8, pd.z1 + 0.9]], speed: 0.5 },
    { pose: 'lean', face: N, dur: 10 },
    { go: [[pd.x0 + 1.0, pd.z1 + 0.9]], speed: 0.5 },
  ], { floorFn: groundY, start: [pd.x0 + 1.0, pd.z1 + 0.9] });
  hold(cowherd, 'handR', 'crook');
  // pigs in the sty: a sow lying with her litter, two hogs rooting
  const sty = FARM_AT.sty;
  const sowAt = [sty.x0 + 3.8, sty.z0 + 3.0];
  add('sow', new Beast(farmLab('pig'), G.people, 'pig', { color: 0x5a4a3e, seed: 2 }), [{ pose: 'lie', dur: 1e9 }],
    { floorFn: groundY, start: sowAt, heading: E, radius: 0.45, yields: false });
  for (let i = 0; i < 5; i++) {
    add(`piglet${i}`, new Beast(farmLab('pig'), G.people, 'pig', { color: i % 2 ? 0x6a5a4c : 0xc89a88, scale: 0.36, seed: i }), [
      { pose: 'suckle', dur: 6 + i * 1.3 },
      { go: [[sowAt[0] - 0.9 + i * 0.35, sowAt[1] + 0.95 + (i % 2) * 0.3]], speed: 0.7 },
      { pose: 'root', dur: 3 + i },
      { go: [[sowAt[0] - 0.55 + i * 0.27, sowAt[1] - 0.48]], speed: 0.7 },
    ], { floorFn: groundY, start: [sowAt[0] - 0.55 + i * 0.27, sowAt[1] - 0.48], heading: N, speed: 0.7, stride: 0.35, radius: 0.12, shy: 1 });
  }
  for (let i = 0; i < 2; i++) {
    add(`hog${i}`, new Beast(farmLab('pig'), G.people, 'pig', { color: i ? 0xc89a88 : 0x4a3e34, patches: !!i, dark: 0x4a3e34, seed: 5 + i }), [
      ...wander(800 + i * 7, [sty.x0 + 0.8, sty.x1 - 0.8, sty.z1 - 2.6, sty.z1 - 0.9], 3, [['root', 5, 9], ['stand', 2, 4]]),
      { go: [[FARM_AT.trough[0] - 0.4 + i * 0.8, FARM_AT.trough[1] - 0.75]] },
      { pose: 'eat', dur: 10, face: S },
    ], { floorFn: groundY, speed: 0.4, stride: 0.8, turnRate: 2, radius: 0.4 });
  }
  const swineherd = add('swineherd', fig({ gown: true, tunic: 0x6a5a4a, apron: 0xa89878, hood: 0x5a4a3a, scale: 0.96 }, 'swineherd', 'farm'), [
    { go: [[FARM_AT.trough[0], sty.z1 + 0.55]], pose: 'pails', speed: 0.6, on: (a) => hold(a, 'handR', 'pailFull') },
    { pose: 'pour', face: N, dur: 3.5 },
    { pose: 'look', face: N, dur: 5, on: (a) => hold(a, 'handR', 'pail') },
    { go: [[FARM_AT.pond.x + 1.6, FARM_AT.pond.z - 1.9]], pose: 'pails', speed: 0.6 },
    { pose: 'stoop', face: [FARM_AT.pond.x, FARM_AT.pond.z], dur: 2.5 },
  ], { floorFn: groundY, start: [FARM_AT.pond.x + 1.6, FARM_AT.pond.z - 1.9] });
  void swineherd;
  // goats about the rocks
  const goatCols = [0xe8e2d4, 0x6a5040, 0x2e2a28, 0xb89a70];
  goatCols.forEach((c, i) => {
    add(`goat${i}`, new Beast(farmLab('goat'), G.people, 'goat', { color: c, seed: i * 1.7, scale: i === 3 ? 0.7 : 1 }),
      wander(900 + i * 13, [60.2, 67.2, -26.4, -20.8], 6, [['graze', 4, 9], ['stand', 2, 5], ['graze', 3, 6], ['lie', 8, 14]]),
      { floorFn: groundY, speed: 0.5, stride: 0.9, turnRate: 3, radius: 0.32 });
  });
  const goatherd = add('goatherd', fig({ gown: true, tunic: 0x9a7a5a, veil: 0xe8e0cc, scale: 0.78 }, 'goatherd', 'farm'), [
    { pose: 'lean', face: [63, -24], dur: 12 },
    { go: [[65.8, -21.2]], speed: 0.5 },
    { pose: 'lean', face: [63, -24], dur: 9 },
    { go: [[60.8, -22.4]], speed: 0.5 },
  ], { floorFn: groundY, start: [60.8, -22.4] });
  hold(goatherd, 'handR', 'crook');
  // geese: some on the water, the rest about the bank with the goose-girl
  const pond = FARM_AT.pond;
  for (let i = 0; i < 2; i++) {
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 * (i ? -1 : 1) + i;
      pts.push([pond.x + Math.cos(a) * (1.0 + 0.3 * i), pond.z + Math.sin(a) * (0.7 + 0.2 * i)]);
    }
    add(`gooseSwim${i}`, new Goose(farmLab('goose'), G.people, { color: i ? 0x9a9488 : 0xece8dc }), [
      { go: pts.concat([pts[0]]), pose: 'swim', speed: 0.25 },
      { pose: 'swim', dur: 4 },
    ], { floor: pond.y + 0.04, start: pts[0], speed: 0.25, stride: 1, turnRate: 2, radius: 0.2 });
  }
  for (let i = 0; i < 5; i++) {
    const bank = i % 2 ? [57.6, 59.2, -29.2, -23.6] : [54.0, 55.6, -27.6, -23.4];
    add(`goose${i}`, new Goose(farmLab('goose'), G.people, { color: i === 2 ? 0x9a9488 : 0xece8dc, seed: i }),
      wander(1000 + i * 9, bank, 5, [['graze', 3, 7], ['stand', 2, 4], ['graze', 2, 5], ['hiss', 1, 2]]),
      { floorFn: groundY, speed: 0.35, stride: 0.3, turnRate: 4, radius: 0.18, shy: 1.4 });
  }
  const gooseGirl = add('gooseGirl', fig({ gown: true, tunic: 0x7a8a6a, veil: 0xe8e0cc, apron: 0xd8d0bc, scale: 0.8 }, 'gooseGirl', 'farm'), [
    { go: [[58.6, -22.6]], speed: 0.5 },
    { pose: 'look', face: [pond.x, pond.z], dur: 7 },
    { go: [[54.6, -22.4]], speed: 0.5 },
    { pose: 'scatter', params: { moving: false }, face: [pond.x, pond.z], dur: 6, on: (a) => { a.e.release('handR'); hold(a, 'front', 'basket'); } },
    { go: [[56.6, -22.0]], speed: 0.5, on: (a) => { a.e.release('front'); hold(a, 'handR', 'stick'); } },
  ], { floorFn: groundY, start: [56.6, -22.0] });
  hold(gooseGirl, 'handR', 'stick');
  // doves about the dovecote
  const dc = FARM_AT.dovecote;
  const doves = [];
  const dr = rngOf(55);
  for (let i = 0; i < 7; i++) {
    doves.push(new Bird(lab('dovecote', 'farm'), G.people, {
      centre: [dc.x + (dr() - 0.5) * 2, dc.z + (dr() - 0.5) * 2], radius: 2.5 + dr() * 4, height: dc.top + 1 + dr() * 4,
      speed: 0.6 + dr() * 0.4, dir: dr() > 0.5 ? 1 : -1, phase: dr() * 6.28, seed: 80 + i, color: i % 3 ? 0x9a9ea6 : 0xe8e6e0,
      head: i % 3 ? 0x7a7e88 : 0xe8e6e0, wing: i % 3 ? 0x8a8e98 : 0xdedcd6, span: 0.3, len: 0.13, flap: 16, beak: 0xd8a080,
    }));
  }
  for (const d of doves) scene.add(d.root);
  updaters.push((t) => {
    for (const d of doves) d.update(t);
  });

  // ---- archers at the butts -------------------------------------------------
  // over the bridge they walk on its deck, not the bottom of the ditch
  const bridgeFloor = (x, z) => (x > OC_OUT.x1 - 0.2 && x < 53.6 && z > -1.95 ? -1.6 : groundY(x, z));
  const archers = [];
  for (let i = 0; i < 3; i++) {
    const z = BUTTS.z - 1.3 + i * 1.3;
    const a = add(`archer${i}`, fig(soldier({ mail: null, kettle: null, hood: [0x5a6a3a, 0x6a5a40, 0x7a3a2a][i], tunic: [0xc4b48a, 0xb0a07a, 0xb8a882][i], sword: false, quilt: null }), 'archer', 'farm'), [
      { pose: 'shoot', dur: 1e9, params: { offset: i * 1.4 } },
    ], { floorFn: bridgeFloor, start: [BUTTS.shootX, z], heading: E, yields: false });
    hold(a, 'handL', 'bow');
    hold(a, 'hip', 'arrows');
    a.offset = i * 1.4;
    archers.push(a);
    alarm.push([a, [
      { go: [[BUTTS.shootX - 1.0, z], [54.5, -1.3 + i * 0.35], [41.5, -1.0 + i * 0.3], [37.2, -1.6 + i * 0.4], [35.6, -3.4 + i * 0.6]], pose: 'run', speed: 2.6, stride: 2.4, on: (aa) => { aa.e.release('handL'); hold(aa, 'back', 'bow'); } },
      { pose: 'look', dur: 1e9, face: E },
    ]]);
  }
  const master = add('masterBowman', fig(soldier({ mail: null, kettle: 0x66666a, tunic: 0xa83a2a, quilt: 0x8a3020, sword: true }), 'archer', 'farm'), [
    { go: [[BUTTS.shootX - 1.6, BUTTS.z - 1.8]], speed: 0.6 },
    { pose: 'look', face: E, dur: 7 },
    { go: [[BUTTS.shootX - 1.6, BUTTS.z + 1.0]], speed: 0.6 },
    { pose: 'lean', face: E, dur: 8 },
  ], { floorFn: bridgeFloor, start: [BUTTS.shootX - 1.6, BUTTS.z + 1.0] });
  hold(master, 'handR', 'crook');
  alarm.push([master, [
    { go: [[54.5, -1.6], [41.5, -1.3], [37.2, -1.0], [36.2, -1.6]], pose: 'run', speed: 2.5, stride: 2.4 },
    { pose: 'look', dur: 1e9, face: E },
  ]]);

  void THREE;
  void lathe;
  void beam;
  void obox;
  return {
    alarm,
    archers,
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
  };
}
