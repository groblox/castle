import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { lab, labPerson } from '../data/labels.js';
import { G } from '../castle/rooms.js';
import { groundY } from '../castle/terrain.js';
import { OUTER_Y, GH, TOWER_H, TOWERS, TOWER_R, OC_OUT, OC_H, IC_OUT } from '../castle/layout.js';
import { Horse } from './animals.js';
import { Hen, Hound, Sheep, Bird } from './creatures.js';
import { Banner } from './banners.js';
import { carried } from './propsCarried.js';
import { partGeo, figureMaterial, mesh } from './parts.js';

// Life about the castle beyond the service rooms: people at work in the
// wards, hens, hounds, a flock on the hill, birds over the towers and
// banners on the turrets.

const N = Math.PI;
const E = Math.PI / 2;
const W = -Math.PI / 2;
const OY = OUTER_Y;

function rngOf(seed) {
  let s = seed >>> 0 || 1;
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

export function buildLife({ scene, add, fig }) {
  const hold = (a, slot, prop) => a.e.hold(slot, carried(prop, a.e.mat));
  const updaters = [];

  // ---- the smithy -----------------------------------------------------------
  const smith = add('smith', fig({ tunic: 0x6a5a48, apron: 0x5a4030, hose: 0x4a4038, hair: 0x3a2a1e, beard: true, scale: 1.04 }, 'smith', 'outerWard'), [
    { pose: 'chop', face: W, dur: 7 },
    { go: [[30.7, -14.6]] },
    { pose: 'reach', face: W, dur: 3 },
    { go: [[31.65, -14.0]] },
    { pose: 'chop', face: W, dur: 6 },
    { pose: 'idle', face: W, dur: 1.5 },
  ], { floor: OY, start: [31.65, -14.0], heading: W });
  hold(smith, 'handR', 'hammer');

  // ---- masons: one at the banker, one pointing from the scaffold -----------
  const zw = IC_OUT.z0;
  const mason = add('mason', fig({ tunic: 0xb8ab8a, apron: 0xd8cfb8, hose: 0x6a5a48, cap: 0xd8cfb8, hair: 0x6a4a30 }, 'mason', 'outerWard'), [
    { pose: 'chop', face: N, dur: 8 },
    { pose: 'look', face: N, dur: 2.5 },
    { pose: 'chop', face: N, dur: 6 },
    { go: [[13.2, zw - 3.6]] },
    { pose: 'stoop', face: E, dur: 2 },
    { go: [[10.25, zw - 2.85]] },
  ], { floor: OY, start: [10.25, zw - 2.85], heading: N });
  hold(mason, 'handR', 'mallet');
  const pointer = add('pointer', fig({ tunic: 0x9a8a6a, hose: 0x5a5048, hood: 0x7a6a4a, scale: 0.97 }, 'mason', 'outerWard'), [
    { pose: 'wipe', face: N, dur: 6 },
    { go: [[16.6, zw - 0.75]] },
    { pose: 'wipe', face: N, dur: 7 },
    { pose: 'stoop', face: N, dur: 1.5 },
    { go: [[18.6, zw - 0.75]] },
  ], { floor: OY + 5.4, start: [18.6, zw - 0.75], heading: N, speed: 0.6 });
  void pointer;

  // ---- two sawyers ripping a baulk, and their saw -------------------------
  const sx = 3.9;
  const sz = -29.6;
  add('sawyerTop', fig({ tunic: 0x8a7a5a, hose: 0x5a4a3a, hair: 0x5a4030, beard: true }, 'sawyer', 'outerWard'), [
    { pose: 'saw', params: { top: true }, face: W, dur: 1e9 },
  ], { floor: OY + 2.22, start: [sx + 0.55, sz], heading: W });
  add('sawyerPit', fig({ tunic: 0x7a6a50, hose: 0x4a4038, hood: 0x6a5a40, scale: 0.94 }, 'sawyer', 'outerWard'), [
    { pose: 'saw', params: { top: false }, face: E, dur: 1e9 },
  ], { floor: OY, start: [sx - 0.5, sz], heading: E });
  const sawMat = figureMaterial(labPerson('sawyer', 'outerWard'), G.people);
  const saw = mesh(partGeo((b) => {
    b.with({ kind: K.METAL, color: 0x8a8a8e }, () => obox(b, 0, 0, 0, 0.012, 1.2, 0.16, 0));
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      obox(b, 0, 0.62, 0, 0.05, 0.05, 0.5, 0); // tiller handle at the top
      obox(b, 0, -0.62, 0, 0.05, 0.05, 0.36, 0); // box handle below
    });
  }), sawMat);
  saw.position.set(sx, 0.95, sz);
  scene.add(saw);
  updaters.push((t) => {
    saw.position.y = 0.95 - Math.sin(t * 2.2) * 0.25;
  });

  // ---- garden, linen, hens in the west outer ward ---------------------------
  const gardener = add('gardener', fig({ tunic: 0x7a8a5a, hose: 0x5a5040, hood: 0x8a7a50, scale: 0.98 }, 'gardener', 'outerWard'), [
    { pose: 'rake', face: W, dur: 9 },
    { go: [[-34.25, -10.4]] },
    { pose: 'rake', face: W, dur: 8 },
    { pose: 'rake', face: E, dur: 7 },
    { go: [[-34.25, -14.2]] },
    { pose: 'idle', face: N, dur: 2.5 },
  ], { floor: OY, start: [-34.25, -14.2], heading: W, speed: 0.6 });
  hold(gardener, 'handR', 'hoe');
  add('laundress', fig({ gown: true, tunic: 0x8a6a6a, apron: 0xe8e0cc, veil: 0xeee6d4, scale: 0.95 }, 'laundress', 'outerWard'), [
    { pose: 'stoop', face: W, dur: 4 },
    { go: [[-30.6, -6.6]] },
    { pose: 'stoop', face: N, dur: 3.5 },
    { go: [[-30.75, -3.0]] },
    { pose: 'stoop', face: E, dur: 3, on: (a) => hold(a, 'front', 'linen') },
    { go: [[-31.9, -2.6]], pose: 'carry' },
    { pose: 'stoop', face: W, dur: 3, on: (a) => a.e.release('front') },
    { go: [[-32.0, -4.9]] },
  ], { floor: OY, start: [-32.0, -4.9], speed: 0.7 });

  const henLabel = labPerson('hen', 'outerWard');
  const henCols = [0x9a6a3a, 0x7a6a5a, 0xe8e2d4, 0xb07a40, 0x6a5a4a];
  let hi = 0;
  const hen = (name, room, region, floor, opts = {}) => {
    const h = new Hen(room === 'ward' ? labPerson('hen', 'ward') : henLabel, G.people, { color: opts.color ?? henCols[hi % henCols.length], cock: opts.cock });
    const a = add(name, h, wander(100 + hi * 17, region, 6, [['peck', 2, 5], ['scratch', 1, 2.5], ['stand', 1, 3], ['peck', 1.5, 3]]), { floor, speed: 0.45, stride: 0.12, turnRate: 9 });
    hi++;
    return a;
  };
  hen('henW1', 'outerWard', [-35.5, -31.9, -17.2, -16.0], OY);
  hen('henW2', 'outerWard', [-35.5, -31.9, -17.2, -16.0], OY);
  hen('henW3', 'outerWard', [-36.4, -30.4, -8.7, -7.2], OY);

  // ---- inner ward: hens, the henwife, a hound --------------------------------
  const yard = [-7.0, 3.8, -10.4, -7.0];
  hen('cock', 'ward', yard, 0, { cock: true, color: 0x8a3a1e });
  for (let i = 0; i < 4; i++) hen(`hen${i}`, 'ward', yard, 0);
  const henwife = add('henwife', fig({ gown: true, tunic: 0x6a7a8a, apron: 0xe0d8c4, veil: 0xece4d2, scale: 0.94 }, 'henwife', 'ward'), [
    { go: [[-4.5, -8.2]], pose: 'scatter' },
    { pose: 'scatter', params: { moving: false }, face: N, dur: 5 },
    { go: [[1.8, -8.6]], pose: 'scatter' },
    { pose: 'scatter', params: { moving: false }, face: W, dur: 5 },
    { go: [[-1.0, -6.9]], pose: 'scatter' },
    { pose: 'idle', face: N, dur: 3 },
  ], { start: [-1.0, -6.9], speed: 0.45 });
  hold(henwife, 'front', 'basket');
  const houndLabel = labPerson('hound', 'hall');
  add('houndYard', new Hound(labPerson('hound', 'ward'), G.people, { color: 0xc8b08a, dark: 0x6a5440, patches: true }), [
    { go: [[-9.6, -6.6]], pose: 'walk' },
    { pose: 'lie', face: E, dur: 18 },
    { go: [[-6.0, -4.0], [2.0, -3.4]], pose: 'walk' },
    { pose: 'sniff', dur: 3 },
    { go: [[7.0, -6.0]], pose: 'walk' },
    { pose: 'sniff', dur: 2.5 },
    { pose: 'sit', face: W, dur: 6 },
    { go: [[-2.0, -6.0]], pose: 'walk' },
  ], { speed: 0.8, stride: 0.75, turnRate: 4 });
  // hounds asleep in the hall
  add('houndHall1', new Hound(houndLabel, G.people, { color: 0x8a7e70 }), [{ pose: 'lie', dur: 1e9, params: { seed: 1 } }], { floor: 0.6, start: [-20.3, -5.5], heading: W + 0.4 });
  add('houndHall2', new Hound(houndLabel, G.people, { color: 0xe2d8c4, dark: 0x8a6a48, patches: true }), [{ pose: 'lie', dur: 1e9, params: { seed: 4 } }], { floor: 0.6, start: [-19.8, -0.9], heading: N + 0.8 });

  // ---- the porter at the outer gate ------------------------------------------
  add('porter', fig({ tunic: 0x5a6a4a, hose: 0x4a4038, hood: 0x6a3a2a, beard: true, hair: 0x8a8070, scale: 1.0 }, 'porter', 'outerWard'), [
    { pose: 'sit', face: W, dur: 16, params: { seat: 0.48 } },
    { go: [[36.6, -2.2]] },
    { pose: 'look', face: E, dur: 5 },
    { go: [[37.2, -5.3]] },
  ], { floor: OY, start: [37.2, -5.3], heading: W, speed: 0.6 });

  // ---- a horse tied at the rail by the smithy ---------------------------------
  add('hackney', new Horse(labPerson('horse', 'outerWard'), G.people), [{ pose: 'stand', dur: 1e9 }], { start: [35.0, -15.2], heading: N, floor: OY });

  // ---- a pedlar on the road up to the gate ------------------------------------
  const bridgeFloor = (x, z) => (x > OC_OUT.x1 - 0.2 && x < 53.6 && z > -1.95 ? -1.6 : groundY(x, z));
  const pedlar = add('pedlar', fig({ tunic: 0x8a5a3a, hose: 0x5a5040, hood: 0x4a5a6a, beard: true, scale: 1.0 }, 'pedlar', null), [
    { go: [[56, -1.15], [45.5, -1.15]], pose: 'shoulder' },
    { pose: 'look', face: W, dur: 4 },
    { go: [[56, -1.15], [70.5, -1.2]], pose: 'shoulder' },
    { pose: 'idle', face: W, dur: 3 },
  ], { start: [70.5, -1.2], floorFn: bridgeFloor, speed: 0.95 });
  hold(pedlar, 'shoulderSlot', 'sack');

  // ---- sheep on the hill, and the shepherd's boy ------------------------------
  const sheepLabel = labPerson('sheep', null);
  for (let i = 0; i < 11; i++) {
    const flock = i % 2 ? [-14, 2.5, -60, -43] : [13, 30, -60, -43];
    const brown = i % 4 === 3;
    add(`sheep${i}`, new Sheep(sheepLabel, G.people, { wool: brown ? 0x8a7a66 : i % 3 ? 0xe0d9c6 : 0xd2cab4, face: brown ? 0x5a4a3c : 0xe8e0d0 }),
      wander(300 + i * 13, flock, 5, [['graze', 6, 14], ['graze', 4, 9], ['stand', 2, 5], ['lie', 10, 20]]),
      { floorFn: groundY, speed: 0.3, stride: 0.5, turnRate: 2 });
  }
  const shepherd = add('shepherd', fig({ tunic: 0x8a7a50, hose: 0x5a5040, hood: 0x5a6a3a, scale: 0.82 }, 'shepherd', null), [
    { go: [[2, -47]] },
    { pose: 'lean', face: N, dur: 12 },
    { go: [[3, -54.5], [13.5, -54.5]] },
    { pose: 'lean', face: E, dur: 10 },
    { go: [[13.5, -45.5]] },
    { pose: 'lean', face: N, dur: 9 },
    { go: [[3, -45.5]] },
  ], { floorFn: groundY, speed: 0.55 });
  hold(shepherd, 'handR', 'crook');

  // ---- birds -----------------------------------------------------------------
  const jackdaw = lab('jackdaw');
  const gull = lab('gull');
  const birds = [];
  const r = rngOf(77);
  for (const [cx, cz, n] of [[TOWERS.ne.x, TOWERS.ne.z, 5], [TOWERS.nw.x, TOWERS.nw.z, 4], [GH.x1, -5, 3]]) {
    for (let i = 0; i < n; i++) {
      birds.push(new Bird(jackdaw, G.people, {
        centre: [cx + (r() - 0.5) * 4, cz + (r() - 0.5) * 4], radius: 6 + r() * 7, height: TOWER_H + 3 + r() * 6,
        speed: 0.35 + r() * 0.3, dir: r() > 0.3 ? 1 : -1, phase: r() * 6.28, seed: i + cx, color: 0x2a2a30, head: 0x55555e,
      }));
    }
  }
  for (let i = 0; i < 4; i++) {
    birds.push(new Bird(gull, G.people, {
      centre: [5 + (r() - 0.5) * 30, -20 + (r() - 0.5) * 20], radius: 28 + r() * 18, height: 34 + r() * 10,
      speed: 0.09 + r() * 0.06, dir: i % 2 ? 1 : -1, phase: r() * 6.28, seed: 40 + i, color: 0xf2f0ea, wing: 0xb8bcc0, head: 0xf6f4ee,
      beak: 0xd8b04a, span: 0.75, len: 0.24, flap: 6,
    }));
  }
  for (const bd of birds) scene.add(bd.root);
  updaters.push((t) => {
    for (const bd of birds) bd.update(t);
  });

  // ---- banners ---------------------------------------------------------------
  const banner = lab('banner');
  const pennon = lab('pennon');
  const turret = (key) => {
    const t = TOWERS[key];
    const a = key === 'nw' ? Math.PI * 0.25 : Math.PI * 0.75;
    return [t.x + Math.cos(a) * (TOWER_R - 1.6), TOWER_H + 4, t.z + Math.sin(a) * (TOWER_R - 1.6)];
  };
  const flags = [
    new Banner(banner, G.ghTurret, [GH.x0 - 0.4, GH.roofY + 3.4, -6.0], 5.4, [2.6, 1.7], 'royal', { phase: 0 }),
    new Banner(banner, G.towers, turret('nw'), 5.0, [2.4, 1.6], 'royal', { phase: 1.7 }),
    new Banner(pennon, G.towers, turret('ne'), 5.0, [2.4, 1.5], 'george', { phase: 3.1 }),
    new Banner(pennon, G.outer, [OC_OUT.x1 + 0.4, OY + OC_H + 1.2, -4.6], 3.4, [1.8, 0.7], 'george', { phase: 4.4, pennon: true, nu: 24, nv: 8 }),
  ];
  for (const f of flags) scene.add(f.root);
  updaters.push((t) => {
    for (const f of flags) f.update(t);
  });

  void THREE;
  void beam;
  void v3;
  return {
    update(t) {
      for (const u of updaters) u(t);
    },
  };
}
