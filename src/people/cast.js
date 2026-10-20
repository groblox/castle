import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { lathe, sack as sackGeo, chest } from '../geom/props.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { labPerson } from '../data/labels.js';
import { G } from '../castle/rooms.js';
import { Figure } from './figure.js';
import { Cat, Rat, Horse } from './animals.js';
import { Actor } from './actor.js';
import { carried } from './propsCarried.js';
import { partGeo, figureMaterial, mesh } from './parts.js';

// The household at work on a morning before dinner. Each servant loops
// through a short routine drawn from the duties of their office.

const N = Math.PI; // facing north (-z)
const E = Math.PI / 2; // facing east (+x)
const W = -Math.PI / 2; // facing west (-x)
const Sth = 0; // facing south (+z)

export function buildCast(scene) {
  const actors = {};
  const add = (name, entity, steps, opts) => {
    scene.add(entity.root);
    const a = new Actor(entity, steps, opts);
    a.name = name;
    actors[name] = a;
    return a;
  };
  const fig = (spec, key, room) => new Figure(spec, labPerson(key, room), G.people);
  const hold = (slot, prop) => (a) => a.e.hold(slot, prop ? carried(prop, a.e.mat) : null);
  const drop = (slot) => (a) => a.e.release(slot);

  // ---- kitchen ------------------------------------------------------------
  add('cook', fig({ tunic: 0x9a5a3a, apron: 0xece4d0, hose: 0x5a4a3a, hair: 0x5a4030, beard: true, coif: 0xf0ebe0 }, 'cook', 'kitchen'), [
    { go: [[-0.7, -14.9]], on: hold('handR', 'knife') },
    { pose: 'chop', face: N, dur: 7 },
    { go: [[2.4, -15.0], [2.4, -19.0], [2.2, -20.05]], on: hold('handR', 'ladle') },
    { pose: 'stir', face: N, dur: 8 },
    { pose: 'taste', face: N, dur: 2 },
    { go: [[1.4, -18.7], [-2.6, -18.7], [-3.4, -19.65]], on: drop('handR') },
    { pose: 'stoop', params: { amount: 0.5 }, face: N, dur: 3.5 },
    { go: [[-3.6, -17.2], [-3.6, -14.9], [-0.7, -14.9]] },
  ]);

  add('scullionWood', fig({ scale: 0.9, tunic: 0xb0a58e, hose: 0x6a5a48, hood: 0x7a6a50 }, 'scullion', 'kitchen'), [
    { go: [[3.0, -18.4]] },
    { pose: 'stoop', face: E, dur: 1.6 },
    { pose: 'carry', params: { moving: false }, face: E, dur: 0.4, on: hold('front', 'logs') },
    { go: [[0.5, -18.4], [-4.6, -18.4], [-5.6, -20.15]], pose: 'carry' },
    { pose: 'stoop', face: N, dur: 1.4 },
    { pose: 'idle', face: N, dur: 1.5, on: drop('front') },
    { go: [[-4.6, -18.4], [2.8, -18.4], [3.0, -18.4]] },
    { pose: 'look', face: W, dur: 5 },
  ]);

  add('scullionWash', fig({ scale: 0.95, tunic: 0x6f7f8a, hose: 0x5a5048, coif: 0xece6da, apron: 0xd8d0bc }, 'scullion', 'kitchen'), [
    { go: [[-5.15, -18.1]] },
    { pose: 'scrub', face: W, dur: 9 },
    { pose: 'carry', params: { moving: false }, face: W, dur: 0.5, on: hold('handR', 'pot') },
    { go: [[-5.0, -16.4], [-5.85, -15.2]] },
    { pose: 'reach', face: W, dur: 1.5 },
    { pose: 'idle', face: W, dur: 0.6, on: drop('handR') },
    { go: [[-5.0, -16.4], [-5.15, -18.1]] },
  ]);

  const spitBoy = add('spitBoy', fig({ scale: 0.78, tunic: 0xa08a5a, hose: 0x6a5a48, hair: 0x7a5a38 }, 'spitBoy', 'kitchen'), [
    { pose: 'sitCrank', params: { seat: 0.54 }, face: W, dur: 16 },
    { pose: 'wipe', face: W, dur: 2.2 },
  ], { start: [-0.95, -19.95], heading: W });
  // crank angle comes from the spit mechanism when it exists (milestone 5)
  spitBoy.crankAngle = (t) => t * 2.2;
  spitBoy.steps[0].params = { seat: 0.54 };
  spitBoy.steps[0].dynamic = true;

  // ---- bakehouse ------------------------------------------------------------
  add('baker', fig({ tunic: 0xd8d0bc, apron: 0xf2ede2, hose: 0x8a7a64, coif: 0xf2ede2 }, 'baker', 'bakehouse'), [
    { go: [[10.35, -13.9]] },
    { pose: 'knead', face: N, dur: 9 },
    { go: [[7.5, -13.9]] },
    { pose: 'knead', face: N, dur: 6 },
    { go: [[9.1, -14.0], [9.1, -16.5], [9.8, -19.6]] },
    { pose: 'stoop', face: [10.6, -20.4], dur: 2 },
    { go: [[9.65, -18.85]] },
    { pose: 'look', face: W, dur: 3 },
    { go: [[9.1, -16.5], [9.1, -14.0], [10.35, -13.9]] },
  ]);

  // ---- brewhouse (a woman brewing: conjectural for a castle household) ----
  add('brewer', fig({ gown: true, tunic: 0x5f7a5a, apron: 0xe8e0cc, veil: 0xeee6d4, scale: 0.96 }, 'brewer', 'brewhouse'), [
    { go: [[15.45, -18.05]], on: hold('handR', 'oar') },
    { pose: 'stir', params: { speed: 1.6 }, face: [16.4, -19.6], dur: 9 },
    { go: [[14.6, -18.1], [13.4, -18.45]], on: hold('handR', 'ladle') },
    { pose: 'stir', face: N, dur: 5 },
    { go: [[13.6, -16.6], [14.0, -13.2]], on: drop('handR') },
    { pose: 'stoop', params: { amount: 0.45 }, face: N, dur: 5 },
    { go: [[15.9, -13.4], [15.9, -15.4]] },
    { pose: 'reach', face: [16.7, -14.6], dur: 3 },
    { go: [[15.45, -18.05]] },
  ]);

  // ---- buttery and pantry: serving the hall --------------------------------
  const toHallB = [[-22.4, -11.4], [-22.4, -9.6], [-21.9, -7.4], [-21.6, -5.6], [-21.7, -3.2]];
  add('butler', fig({ tunic: 0x3f5a7a, hose: 0x7a3a2a, cap: 0x2e3a4a, purse: true, hair: 0x6a4a30, shoes: 0x2a1e16 }, 'butler', 'buttery'), [
    { go: [[-23.1, -12.6]] },
    { pose: 'tap', face: W, dur: 5, on: hold('handR', 'jug') },
    { go: toHallB },
    { pose: 'reach', face: W, dur: 2 },
    { pose: 'idle', face: W, dur: 1, on: drop('handR') },
    { go: toHallB.slice(0, -1).reverse().concat([[-23.1, -12.6]]) },
  ]);

  const toHallP = [[-16.0, -11.0], [-16.0, -9.6], [-16.1, -7.4], [-16.4, -5.6], [-16.3, -4.6]];
  add('pantler', fig({ tunic: 0x7a3a3a, hose: 0x4a4a52, cap: 0x5a2a2a, purse: true, hair: 0x3a2a20 }, 'pantler', 'pantry'), [
    { go: [[-15.5, -12.8]], on: hold('handR', 'knife') },
    { pose: 'chop', face: N, dur: 6 },
    { pose: 'carry', params: { moving: false }, face: N, dur: 0.5, on: (a) => { a.e.release('handR'); a.e.hold('front', carried('trenchers', a.e.mat)); } },
    { go: toHallP, pose: 'carry' },
    { pose: 'reach', face: E, dur: 2 },
    { pose: 'idle', face: E, dur: 0.8, on: drop('front') },
    { go: toHallP.slice(0, -1).reverse().concat([[-15.5, -12.8]]) },
  ]);

  // ---- water carrier ---------------------------------------------------------
  const wellToKitchen = [[-1.6, -6.0], [-4.4, -10.4], [-4.8, -12.0], [-4.6, -14.6], [-5.0, -16.3]];
  add('waterCarrier', fig({ tunic: 0x8a8070, hose: 0x5a5048, hood: 0x5a6a4a }, 'waterCarrier', 'well'), [
    { go: [[0.6, -2.05]], pose: 'pails', on: (a) => { a.e.hold('handL', carried('pail', a.e.mat)); a.e.hold('handR', carried('pail', a.e.mat)); } },
    { pose: 'stoop', face: Sth, dur: 2.5 },
    { pose: 'pails', params: { moving: false }, face: Sth, dur: 0.3, on: (a) => { a.e.hold('handL', carried('pailFull', a.e.mat)); a.e.hold('handR', carried('pailFull', a.e.mat)); } },
    { go: wellToKitchen, pose: 'pails', speed: 0.85 },
    { pose: 'pour', face: [-6.05, -17.0], dur: 2.5 },
    { pose: 'pails', params: { moving: false }, face: [-6.05, -17.0], dur: 0.3, on: (a) => { a.e.hold('handL', carried('pail', a.e.mat)); a.e.hold('handR', carried('pail', a.e.mat)); } },
    { go: wellToKitchen.slice(0, -1).reverse().concat([[0.6, -2.05]]), pose: 'pails' },
  ]);

  // ---- deliveries: carter, clerk, horse and cart -----------------------------
  const cart = buildCart();
  scene.add(cart.group);
  const desk = buildDesk();
  scene.add(desk);

  add('clerk', fig({ gown: true, tunic: 0x3a3530, gownColor: 0x3a3530, cap: 0x1e1a18, hair: 0x4a3a2a, purse: true }, 'clerk', 'granary'), [
    { pose: 'tally', face: [17.75, -9.6], dur: 5, on: (a) => { a.e.hold('handL', carried('tally', a.e.mat)); a.e.hold('handR', carried('knife', a.e.mat)); } },
    { pose: 'write', face: Sth, dur: 6, on: (a) => { a.e.release('handL'); a.e.hold('handR', carried('quill', a.e.mat)); } },
    { pose: 'look', face: [18, -10], dur: 3 },
  ], { start: [19.7, -9.4], heading: Sth });

  let unloaded = 0;
  add('carter', fig({ scale: 1.02, tunic: 0x6a5a40, hose: 0x4a4038, hood: 0x8a3a2a }, 'carter', 'granary'), [
    { go: [[17.75, -9.6]] },
    { pose: 'stoop', face: W, dur: 1.5 },
    {
      pose: 'shoulder', params: { moving: false }, face: W, dur: 0.4,
      on: (a) => {
        a.e.hold('shoulderSlot', carried('sack', a.e.mat));
        cart.sacks[unloaded % cart.sacks.length].visible = false;
        unloaded++;
        if (unloaded % cart.sacks.length === 0) setTimeout(() => cart.sacks.forEach((s) => (s.visible = true)), 4000);
      },
    },
    { go: [[19.0, -10.7], [20.7, -11.4], [20.7, -13.6]], pose: 'shoulder' },
    { pose: 'stoop', face: N, dur: 1.5 },
    { pose: 'idle', face: N, dur: 0.4, on: drop('shoulderSlot') },
    { go: [[20.7, -11.4], [19.0, -10.6], [17.75, -9.6]] },
    { pose: 'look', face: W, dur: 1.2 },
  ]);

  const horse = new Horse(labPerson('horse', 'granary'), G.people);
  add('horse', horse, [{ pose: 'stand', dur: 1e9 }], { start: [11.85, -9.2], heading: W, floor: 0 });

  // ---- the cat --------------------------------------------------------------
  const cat = new Cat(labPerson('cat', 'kitchen'), G.people);
  const fireToLarder = [[-3.4, -17.6], [-4.0, -13.6], [-4.9, -12.0], [-7.5, -11.0], [-9.8, -11.8], [-9.8, -13.8], [-10.3, -15.6]];
  add('cat', cat, [
    { go: [[-1.9, -18.9]], pose: 'walk' },
    { pose: 'lie', face: N, dur: 14 },
    { pose: 'groom', face: N, dur: 5 },
    { go: fireToLarder, pose: 'walk' },
    { pose: 'crouch', face: [-11.0, -20.4], dur: 6 },
    { pose: 'sit', face: [-11.0, -20.4], dur: 6 },
    { go: fireToLarder.slice(0, -1).reverse().concat([[-1.9, -18.9]]), pose: 'walk' },
  ], { speed: 0.55, stride: 0.35, turnRate: 4 });

  // ---- rats in the stores ----------------------------------------------------
  const rat = (name, room, floor, steps) => add(name, new Rat(labPerson('rat', room), G.people), steps, { speed: 1.5, stride: 0.16, floor, turnRate: 14 });
  const scurry = (pts, pauses = ['sniff', 'rear', 'sniff']) => {
    const steps = [];
    pts.forEach((p, i) => {
      steps.push({ go: [p], pose: 'run' });
      steps.push({ pose: pauses[i % pauses.length], dur: 0.6 + ((i * 7) % 5) * 0.35 });
    });
    return steps;
  };
  rat('ratLarder1', 'larder', 0.08, scurry([[-11.5, -20.85], [-9.3, -20.88], [-7.75, -20.6], [-7.7, -18.9], [-7.75, -20.6], [-9.3, -20.88]]));
  rat('ratLarder2', 'larder', 0.08, scurry([[-11.55, -14.6], [-11.55, -16.6], [-11.0, -17.8], [-11.55, -16.6]]));
  rat('ratUnder1', 'undercroft', -3.4, scurry([[-22.5, -3.0], [-22.4, -1.0], [-20.0, -0.7], [-15.2, -0.8], [-14.8, -2.4], [-15.2, -0.8], [-20.0, -0.7]]));
  rat('ratUnder2', 'undercroft', -3.4, scurry([[-22.9, -8.7], [-22.9, -3.7], [-20.4, -6.6], [-22.9, -3.7]]));
  rat('ratGranary', 'granary', 0.08, scurry([[19.75, -18.9], [22.6, -18.9], [22.9, -17.0], [22.6, -18.9]]));
  rat('ratLoft', 'granary', 3.85, scurry([[19.7, -15.5], [23.9, -15.5], [24.5, -19.0], [23.9, -15.5]]));

  return {
    actors,
    cart,
    update(t, dt) {
      for (const a of Object.values(actors)) {
        const st = a.steps[a.i];
        if (a === spitBoy && st.dynamic) st.params = { seat: 0.54, angle: spitBoy.crankAngle(t) };
        a.update(t, dt);
      }
    },
  };
}

function buildCart() {
  const group = new THREE.Group();
  const mat = figureMaterial(labPerson('cart', 'granary'), G.people);
  const cx = 15.7;
  const cz = -9.2;
  group.add(mesh(partGeo((b) => {
    b.set({ kind: K.TIMBER, color: P.timber });
    // bed, rails and shafts
    b.box(cx - 1.5, 0.78, cz - 0.7, cx + 1.5, 0.86, cz + 0.7, { topKind: K.BOARDS, topColor: P.boards });
    for (const s of [-1, 1]) {
      b.box(cx - 1.5, 0.86, cz + s * 0.7 - 0.04, cx + 1.5, 1.2, cz + s * 0.7 + 0.04);
      for (let x = cx - 1.4; x <= cx + 1.4; x += 0.7) b.box(x - 0.04, 0.86, cz + s * 0.7 - 0.05, x + 0.04, 1.3, cz + s * 0.7 + 0.05);
      beam(b, v3(cx - 1.4, 0.82, cz + s * 0.42), v3(cx - 3.6, 1.0, cz + s * 0.4), 0.09, 0.09); // shafts
      // wheel: rim segments, spokes and hub
      const wz = cz + s * 0.86;
      b.with({ color: P.timberDark }, () => {
        const R = 0.62;
        for (let i = 0; i < 12; i++) {
          const a0 = (i / 12) * Math.PI * 2;
          const a1 = ((i + 1) / 12) * Math.PI * 2;
          beam(b, v3(cx + Math.cos(a0) * R, 0.62 + Math.sin(a0) * R, wz), v3(cx + Math.cos(a1) * R, 0.62 + Math.sin(a1) * R, wz), 0.08, 0.09);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.2;
          beam(b, v3(cx, 0.62, wz), v3(cx + Math.cos(a) * 0.58, 0.62 + Math.sin(a) * 0.58, wz), 0.04, 0.04);
        }
        lathe(b, v3(cx, 0.62, wz - 0.12), 'z', [[0.1, 0], [0.12, 0.24]], 8);
      });
    }
    b.box(cx - 0.06, 0.55, cz - 0.86, cx + 0.06, 0.7, cz + 0.86); // axle
  }), mat));
  const sacks = [];
  const pos = [[-1.0, -0.33], [-1.0, 0.33], [-0.3, -0.33], [-0.3, 0.33], [0.4, -0.33], [0.4, 0.33], [1.1, -0.33], [1.1, 0.33]];
  for (let i = pos.length - 1; i >= 0; i--) {
    const [dx, dz] = pos[i];
    const m = mesh(partGeo((b) => sackGeo(b, 0, 0, 0, 0.5, 0.62, (i % 3) * 0.2, i % 2 ? 0xd2c095 : 0xc9b58a)), mat);
    m.position.set(cx + dx, 0.86, cz + dz);
    group.add(m);
    sacks.push(m);
  }
  return { group, sacks };
}

function buildDesk() {
  const mat = figureMaterial(labPerson('clerk', 'granary'), G.people);
  return mesh(partGeo((b) => {
    b.set({ kind: K.TIMBER, color: P.timberDark });
    const x = 19.7;
    const z = -8.72;
    b.box(x - 0.05, 0, z - 0.05, x + 0.05, 1.05, z + 0.05);
    b.box(x - 0.3, 0, z - 0.2, x + 0.3, 0.05, z + 0.2);
    b.loft([v3(x - 0.35, 1.0, z - 0.25), v3(x + 0.35, 1.0, z - 0.25), v3(x + 0.35, 1.12, z + 0.2), v3(x - 0.35, 1.12, z + 0.2)],
      [v3(x - 0.35, 1.04, z - 0.25), v3(x + 0.35, 1.04, z - 0.25), v3(x + 0.35, 1.16, z + 0.2), v3(x - 0.35, 1.16, z + 0.2)]);
    b.with({ kind: K.CLOTH, color: 0xece2c8 }, () => obox(b, x, 1.1, z - 0.02, 0.4, 0.01, 0.34, 0)); // parchment
    b.with({ kind: K.TIMBER, color: 0xcab48a }, () => {
      for (let i = 0; i < 5; i++) obox(b, x + 0.5, 0.67 + (i % 2) * 0.03, z + 0.07, 0.03, 0.03, 0.3, 0.3 + i * 0.1); // bundle of tallies
    });
    b.with({ kind: K.PLAIN, color: 0x2a2018 }, () => lathe(b, v3(x + 0.26, 1.1, z + 0.12), 'y', [[0.03, 0], [0.025, 0.08]], 8)); // inkhorn
    chest(b, x + 0.3, x + 0.7, z - 0.1, z + 0.25, 0, 0.6, P.timber);
  }), mat);
}
