import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { MAIN_CUT } from '../geom/builder.js';
import { beam, obox, v3, decalX, decalZ, stairs } from '../geom/shapes.js';
import {
  lathe, cask, tub, jug, bowl, cauldron, sack, trestleTable, bench, stool, shelves, shelvesZ,
  lump, loaf, ladder, log, woodpile, faggot, cord, chest, heap,
} from '../geom/props.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { S } from './spots.js';
import { NR, SERV, HALL, GH } from './layout.js';

// Full interior detail for the service rooms; simpler furnishing elsewhere.
export function furnish(b) {
  kitchen(b);
  larder(b);
  bakehouse(b);
  brewhouse(b);
  granary(b);
  buttery(b);
  pantry(b);
  undercroft(b);
  hall(b);
  chamber(b);
  gatehouseRooms(b);
  wellHouse(b);
}

const IN = (group, room, key) => ({ group, label: lab(key, room) });

// ---------------------------------------------------------------------------
function kitchen(b) {
  const k = S.kitchen;
  const g = G.kitchen;
  const f = k.floor;
  // roasting hearth: firedogs and logs
  b.with(IN(g, 'kitchen', 'fireplace'), () => {
    const [fx, , fz] = k.roastFire;
    b.with({ kind: K.METAL, color: P.iron }, () => {
      for (const dx of [-0.9, 0.9]) {
        b.box(fx + dx - 0.05, 0.12, fz - 0.35, fx + dx + 0.05, 0.42, fz + 0.3);
        b.box(fx + dx - 0.06, 0.42, fz + 0.24, fx + dx + 0.06, 0.62, fz + 0.32);
      }
    });
    for (let i = 0; i < 4; i++) log(b, v3(fx - 1.2 + i * 0.1, 0.3 + (i % 2) * 0.1, fz - 0.25 + i * 0.12), v3(fx + 1.1 - i * 0.12, 0.28 + (i % 2) * 0.1, fz - 0.15 + i * 0.1), 0.09, 0x5d4532);
    // embers bed
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => b.box(fx - 1.3, 0.12, fz - 0.45, fx + 1.3, 0.17, fz + 0.4));
  });
  // cob-irons carrying the spit (the spit itself is a mechanism)
  b.with({ ...IN(g, 'kitchen', 'spit'), kind: K.METAL, color: P.iron }, () => {
    for (const x of [k.spit.x0 - 0.18, k.spit.x1 + 0.18]) {
      b.box(x - 0.04, f, k.spit.z - 0.04, x + 0.04, 1.25, k.spit.z + 0.04);
      b.box(x - 0.18, f, k.spit.z - 0.2, x + 0.18, f + 0.05, k.spit.z + 0.2);
      for (const y of [0.55, 0.86, 1.1]) b.box(x - 0.08, y - 0.02, k.spit.z - 0.04, x + 0.08, y + 0.02, k.spit.z + 0.04);
    }
  });
  b.with({ ...IN(g, 'kitchen', 'drippingPan'), kind: K.METAL, color: 0x7a6650 }, () => {
    const [x, , z] = k.drip;
    b.box(x - 1.3, f, z - 0.28, x + 1.3, f + 0.08, z + 0.28);
    b.with({ kind: K.WATER, color: 0xb88a3a }, () => b.box(x - 1.22, f + 0.08, z - 0.2, x + 1.22, f + 0.09, z + 0.2));
  });
  // boiling hearth: fire, pot-bar and hook, great cauldron
  b.with(IN(g, 'kitchen', 'cauldron'), () => {
    const [fx, , fz] = k.boilFire;
    for (let i = 0; i < 3; i++) log(b, v3(fx - 0.8, 0.2 + i * 0.05, fz - 0.25 + i * 0.2), v3(fx + 0.8, 0.22, fz - 0.1 + i * 0.12), 0.08, 0x5d4532);
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => b.box(fx - 0.95, 0.12, fz - 0.4, fx + 0.95, 0.16, fz + 0.35));
    const [cx, cy, cz, cr] = k.cauldron;
    cauldron(b, cx, cy, cz, cr);
    b.with({ kind: K.WATER, color: 0x9d8a5a }, () => b.cylinder(cx, cz, cr * 0.9, cy + cr * 0.9, cy + cr * 0.98, 14));
    b.with({ kind: K.METAL, color: P.iron }, () => {
      b.box(0.85, k.potBarY - 0.05, cz - 0.05, 3.55, k.potBarY + 0.05, cz + 0.05);
      cord(b, v3(cx, k.potBarY, cz), v3(cx, cy + cr * 1.6, cz), 0.035);
      beam(b, v3(cx, cy + cr * 1.6, cz), v3(cx - cr, cy + cr * 1.0, cz), 0.025, 0.025);
      beam(b, v3(cx, cy + cr * 1.6, cz), v3(cx + cr, cy + cr * 1.0, cz), 0.025, 0.025);
    });
    // posnet (three-legged pan) at the hearth edge
    cauldron(b, 1.1, 0.25, -20.55, 0.2, 0x6b5a48);
  });
  // dresser board with the morning's work
  b.with(IN(g, 'kitchen', 'dresser'), () => {
    const d = k.dresser;
    trestleTable(b, d.x0, d.x1, d.z0, d.z1, 0.86);
    const y = 0.86;
    bowl(b, -2.6, y, -16.1, 0.16);
    bowl(b, -0.2, y, -16.2, 0.13, 0xa88a60);
    lump(b, -1.6, y + 0.1, -16.05, 0.28, 0.1, 0.16, 0xb5584a, K.PLAIN, 0.3); // joint of beef
    lump(b, 0.8, y + 0.06, -16.15, 0.1, 0.06, 0.1, 0xe8d8b0); // onions
    lump(b, 0.98, y + 0.06, -16.0, 0.09, 0.06, 0.09, 0xe0cfa0);
    lump(b, 1.2, y + 0.06, -16.25, 0.09, 0.06, 0.09, 0xd8c8a0);
    for (let i = 0; i < 5; i++) b.with({ kind: K.PLAIN, color: 0x7d9a55 }, () => obox(b, 0.3 + i * 0.06, y + 0.03, -15.85, 0.04, 0.05, 0.45, 0.2)); // leeks
    b.with({ kind: K.METAL, color: 0x9a9890 }, () => obox(b, -1.0, y + 0.01, -15.9, 0.3, 0.015, 0.04, 0.4)); // knife
    b.with({ kind: K.TIMBER, color: 0xc9b58c }, () => b.box(-2.2, y, -16.45, -1.2, y + 0.05, -15.75)); // board
    jug(b, 1.55, y, -16.35, 0.9, 0xa86b3a);
  });
  // chopping block, mortar, trough, wood
  b.with(IN(g, 'kitchen', 'choppingBlock'), () => {
    const [x, z] = k.block;
    b.with({ kind: K.TIMBER, color: 0x8f6c48 }, () => b.cylinder(x, z, 0.36, f, f + 0.72, 12, { topKind: K.CUT_TIMBER, topColor: 0xa47e56 }));
    b.with({ kind: K.METAL, color: 0x77746e }, () => obox(b, x + 0.05, f + 0.8, z, 0.06, 0.18, 0.3, 0.6)); // cleaver
  });
  b.with(IN(g, 'kitchen', 'mortar'), () => {
    const [x, z] = k.mortar;
    b.with({ kind: K.STONE, color: P.ashlar }, () => {
      b.cylinder(x, z, 0.16, f, f + 0.55, 10);
      lathe(b, v3(x, f + 0.55, z), 'y', [[0.2, 0], [0.26, 0.28]], 12);
    });
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(x, f + 0.75, z), v3(x + 0.12, f + 1.15, z + 0.08), 0.06, 0.06));
  });
  b.with(IN(g, 'kitchen', 'trough'), () => {
    const t = k.trough;
    b.with({ kind: K.STONE, color: P.ashlar }, () => {
      b.box(t.x0, f, t.z0, t.x1, f + 0.15, t.z1);
      b.box(t.x0, f + 0.15, t.z0, t.x0 + 0.12, f + 0.75, t.z1);
      b.box(t.x1 - 0.12, f + 0.15, t.z0, t.x1, f + 0.75, t.z1);
      b.box(t.x0, f + 0.15, t.z0, t.x1, f + 0.75, t.z0 + 0.12);
      b.box(t.x0, f + 0.15, t.z1 - 0.12, t.x1, f + 0.75, t.z1);
    });
    b.with({ kind: K.WATER, color: P.water }, () => b.box(t.x0 + 0.12, f + 0.15, t.z0 + 0.12, t.x1 - 0.12, f + 0.62, t.z1 - 0.12));
    tub(b, -5.9, f, -16.2, 0.28, 0.42, { liquid: P.water });
  });
  b.with(IN(g, 'kitchen', 'woodpile'), () => woodpile(b, 3.5, 4.4, -20.9, -17.6, 1.1));
  // utensils on pegs on the east partition
  b.with({ ...IN(g, 'kitchen', 'kitchen'), kind: K.METAL, color: 0x5d5a55 }, () => {
    const x = 4.55;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(x - 0.06, 2.05, -16.8, x, 2.15, -13.4));
    const items = [[-16.4, 0.5], [-15.8, 0.75], [-15.2, 0.6], [-14.6, 0.9], [-14.0, 0.55]];
    for (const [z, len] of items) {
      beam(b, v3(x - 0.05, 2.05, z), v3(x - 0.05, 2.05 - len, z), 0.025, 0.025);
      lathe(b, v3(x - 0.08, 2.05 - len - 0.04, z), 'x', [[0.08, 0], [0.09, 0.03]], 10); // ladle/skimmer bowls
    }
    // frying pan
    lathe(b, v3(x - 0.08, 1.2, -13.8), 'x', [[0.17, 0], [0.18, 0.04]], 12);
  });
  // shelves on the west partition with pots
  shelvesZ(b, -15.6, -13.2, -6.6, 1.0, 3, 0.5, 0.38, 1);
  b.with({ group: g, label: lab('kitchen', 'kitchen') }, () => {
    for (let i = 0; i < 4; i++) jug(b, -6.4, 1.04, -15.3 + i * 0.55, 0.8 + (i % 2) * 0.2, i % 2 ? 0x8a6a44 : 0x9a8460);
    for (let i = 0; i < 3; i++) bowl(b, -6.38, 1.54, -15.1 + i * 0.7, 0.16, 0x7f6a50);
    for (let i = 0; i < 3; i++) cauldron(b, -6.38, 2.12, -15.0 + i * 0.75, 0.13, 0x5a554e);
    // baskets of worts (pot-herbs) and eggs
    b.with({ kind: K.STRAW, color: 0xb69a62 }, () => lathe(b, v3(-4.3, f, -13.6), 'y', [[0.25, 0], [0.3, 0.32]], 12));
    lump(b, -4.3, f + 0.36, -13.6, 0.22, 0.09, 0.22, 0x8aa25a);
    b.with({ kind: K.STRAW, color: 0xb69a62 }, () => lathe(b, v3(-3.6, f, -13.3), 'y', [[0.18, 0], [0.22, 0.22]], 12));
    for (let i = 0; i < 5; i++) lump(b, -3.6 + Math.cos(i * 1.3) * 0.09, f + 0.24, -13.3 + Math.sin(i * 1.3) * 0.09, 0.05, 0.065, 0.05, 0xeee4cc);
    stool(b, S.kitchen.spitSeat[0], f, S.kitchen.spitSeat[1]);
    tub(b, 0.6, f, -19.6, 0.32, 0.45, { liquid: P.water });
  });
}

// ---------------------------------------------------------------------------
function larder(b) {
  const g = G.larder;
  const f = S.larder.floor;
  const r = NR.rooms.larder;
  const y = S.larder.beamY;
  const hook = (x, z, len) => {
    cord(b, v3(x, y, z), v3(x, y - len, z), 0.018, 0x6e5a40);
    b.with({ kind: K.METAL, color: P.iron }, () => beam(b, v3(x, y - len, z), v3(x, y - len - 0.08, z), 0.02, 0.02));
    return y - len - 0.08;
  };
  b.with({ ...IN(g, 'larder', 'flitch'), kind: K.TIMBER, color: P.timberDark }, () => {
    for (const z of [-19.6, -16.8]) b.box(r.x0, y, z - 0.1, r.x1, y + 0.2, z + 0.1);
  });

  // ---- hanging from the beams ----
  const flitch = (x, z, rot) => b.with(IN(g, 'larder', 'flitch'), () => {
    const top = hook(x, z, 0.35);
    const cy = top - 0.42;
    b.with({ kind: K.PLAIN, color: 0x9a5a40 }, () => obox(b, x, cy, z, 0.5, 0.8, 0.07, rot)); // rind
    // streaks of lean and fat on the cut face
    const s = Math.sin(rot);
    const c = Math.cos(rot);
    for (let i = 0; i < 5; i++) {
      const col = i % 2 ? 0xe2c6a4 : 0xb86a52;
      b.with({ kind: K.PLAIN, color: col }, () => obox(b, x + s * 0.04, cy - 0.32 + i * 0.16, z + c * 0.04, 0.46, 0.14, 0.012, rot));
    }
  });
  const ham = (x, z) => b.with(IN(g, 'larder', 'ham'), () => {
    const top = hook(x, z, 0.3);
    b.with({ kind: K.PLAIN, color: 0xa25a40 }, () =>
      lathe(b, v3(x, top - 0.66, z), 'y', [[0.04, 0], [0.15, 0.08], [0.2, 0.24], [0.18, 0.38], [0.1, 0.5], [0.045, 0.58], [0.035, 0.66]], 12));
    b.with({ kind: K.PLAIN, color: 0xe6d6c0 }, () => lathe(b, v3(x, top - 0.08, z), 'y', [[0.03, 0], [0.03, 0.08]], 6)); // knuckle
  });
  const puddings = (x, z) => b.with(IN(g, 'larder', 'puddings'), () => {
    const top = hook(x, z, 0.4);
    // a looped string of puddings: links down one side and up the other
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1)) * Math.PI;
      const px = x - Math.cos(a) * 0.17;
      const py = top - 0.05 - Math.sin(a) * 0.55;
      lump(b, px, py, z, 0.045, 0.085, 0.045, i % 2 ? 0x6a2e28 : 0x7a3a2e);
    }
  });
  const ducks = (x, z) => b.with(IN(g, 'larder', 'game'), () => {
    const top = hook(x, z, 0.3);
    for (const dx of [-0.1, 0.1]) {
      b.with({ kind: K.PLAIN, color: 0xd8d0c0 }, () => beam(b, v3(x, top, z), v3(x + dx, top - 0.12, z), 0.012, 0.012));
      lump(b, x + dx, top - 0.18, z, 0.04, 0.06, 0.045, 0x2f5a3c, K.FUR); // drake's green head
      lump(b, x + dx * 1.1, top - 0.24, z, 0.022, 0.05, 0.022, 0xe8e2d6, K.FUR); // white collar and neck
      lump(b, x + dx * 1.2, top - 0.42, z, 0.09, 0.17, 0.08, 0x8a7a68, K.FUR); // body
      lump(b, x + dx * 1.2, top - 0.42, z + 0.05, 0.07, 0.12, 0.04, 0x9a6a4a, K.FUR); // chestnut breast
      lump(b, x + dx * 1.2, top - 0.6, z, 0.045, 0.04, 0.03, 0x4a4a4a, K.FUR); // tail
    }
  });
  const hare = (x, z) => b.with(IN(g, 'larder', 'game'), () => {
    const top = hook(x, z, 0.25);
    // hung by the hind feet: legs up, body, head and ears down
    b.with({ kind: K.FUR, color: 0x8a7458 }, () => {
      beam(b, v3(x - 0.05, top, z), v3(x - 0.04, top - 0.28, z), 0.035, 0.03);
      beam(b, v3(x + 0.05, top, z), v3(x + 0.04, top - 0.28, z), 0.035, 0.03);
    });
    lump(b, x, top - 0.45, z, 0.09, 0.22, 0.08, 0x8f785a, K.FUR);
    lump(b, x, top - 0.45, z + 0.04, 0.06, 0.16, 0.05, 0xc8b89a, K.FUR); // pale belly
    lump(b, x, top - 0.72, z + 0.02, 0.05, 0.07, 0.06, 0x846c50, K.FUR);
    b.with({ kind: K.FUR, color: 0x7a6448 }, () => {
      obox(b, x - 0.025, top - 0.86, z - 0.01, 0.03, 0.16, 0.015, 0);
      obox(b, x + 0.025, top - 0.86, z - 0.01, 0.03, 0.16, 0.015, 0);
    });
  });
  const stockfishBundle = (x, z) => b.with(IN(g, 'larder', 'stockfish'), () => {
    const top = hook(x, z, 0.3);
    for (let i = 0; i < 5; i++) dryFish(b, x + (i - 2) * 0.07, top - 0.38, z + (i % 2) * 0.02, 'y', i * 0.12);
  });
  const carcass = (x, z) => b.with(IN(g, 'larder', 'carcass'), () => {
    const top = hook(x, z, 0.2);
    // hung from a gambrel (spreader) through the hind legs
    b.with({ kind: K.TIMBER, color: P.timber }, () => beam(b, v3(x - 0.22, top, z), v3(x + 0.22, top, z), 0.035, 0.035));
    b.with({ kind: K.PLAIN, color: 0xc98a72 }, () => {
      beam(b, v3(x - 0.18, top + 0.02, z), v3(x - 0.1, top - 0.4, z), 0.07, 0.06);
      beam(b, v3(x + 0.18, top + 0.02, z), v3(x + 0.1, top - 0.4, z), 0.07, 0.06);
      lathe(b, v3(x, top - 1.3, z), 'y', [[0.05, 0], [0.1, 0.12], [0.18, 0.35], [0.2, 0.6], [0.17, 0.85], [0.15, 0.95]], 12);
    });
    b.with({ kind: K.PLAIN, color: 0xeee0c8 }, () => {
      // fat over the loin and the line of the backbone
      lump(b, x, top - 0.6, z - 0.12, 0.16, 0.24, 0.07, 0xeee0c8);
      lump(b, x, top - 0.25, z, 0.17, 0.08, 0.13, 0xeee0c8);
    });
    // ribs on the opened belly
    b.with({ kind: K.PLAIN, color: 0xa85a4a }, () => {
      for (let i = 0; i < 5; i++) obox(b, x, top - 0.65 - i * 0.09, z + 0.17, 0.26 - i * 0.02, 0.025, 0.02, 0);
    });
  });
  // the back beam: bacon, hams and puddings
  flitch(-11.25, -19.6, 0.15);
  ham(-10.55, -19.6);
  puddings(-9.95, -19.6);
  flitch(-9.3, -19.6, -0.1);
  ham(-8.55, -19.6);
  puddings(-7.95, -19.6);
  // the front beam: game, fish and a sheep for cutting up
  ducks(-11.2, -16.8);
  hare(-10.55, -16.8);
  stockfishBundle(-9.85, -16.8);
  carcass(-8.3, -16.8);

  // ---- powdering tubs and salting trough ----
  b.with(IN(g, 'larder', 'powderingTub'), () => {
    // an open tub of brine with joints of salt beef
    tub(b, -11.1, f, -20.3, 0.36, 0.78, { color: 0x9b7a50 });
    b.with({ kind: K.WATER, color: 0xb5a690 }, () => b.cylinder(-11.1, -20.3, 0.33, f + 0.62, f + 0.66, 14));
    lump(b, -11.18, f + 0.68, -20.25, 0.13, 0.07, 0.1, 0xa04a3a);
    lump(b, -11.0, f + 0.67, -20.4, 0.1, 0.06, 0.12, 0xb05a44);
    lump(b, -11.02, f + 0.68, -20.15, 0.07, 0.05, 0.07, 0xeee0c8);
    // a lidded tub weighted with a stone
    tub(b, -10.0, f, -20.35, 0.36, 0.78, { color: 0x95744c });
    b.with({ kind: K.TIMBER, color: 0x8d6d48 }, () => b.cylinder(-10.0, -20.35, 0.34, f + 0.74, f + 0.79, 14));
    lump(b, -10.0, f + 0.86, -20.35, 0.14, 0.08, 0.12, 0x9a958a, K.STONE);
    // salting trough: pork joints in a bed of salt
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(-9.0, f, -20.7, -7.6, f + 0.18, -19.8);
      b.box(-9.0, f + 0.18, -20.7, -7.6, f + 0.6, -20.62);
      b.box(-9.0, f + 0.18, -19.88, -7.6, f + 0.6, -19.8);
      b.box(-9.0, f + 0.18, -20.62, -8.92, f + 0.6, -19.88);
      b.box(-7.68, f + 0.18, -20.62, -7.6, f + 0.6, -19.88);
      for (const x of [-8.85, -7.75]) b.box(x - 0.06, f, -20.75, x + 0.06, f + 0.3, -19.75);
    });
    b.with({ kind: K.STRAW, color: 0xf2eee4 }, () => b.box(-8.92, f + 0.18, -20.62, -7.68, f + 0.5, -19.88));
    lump(b, -8.6, f + 0.53, -20.25, 0.18, 0.07, 0.12, 0xb86a54, K.PLAIN, 0.3);
    lump(b, -8.15, f + 0.54, -20.3, 0.15, 0.08, 0.11, 0xc07058, K.PLAIN, -0.4);
    lump(b, -7.92, f + 0.52, -20.05, 0.1, 0.05, 0.09, 0xa85e4a, K.PLAIN, 0.8);
  });
  b.with(IN(g, 'larder', 'larderSalt'), () => {
    sack(b, -10.75, f, -18.75, 0.55, 0.8, 0.2, 0xe2dcc8);
    b.with({ kind: K.STRAW, color: 0xf4f0e6 }, () => heap(b, -10.15, f, -18.6, 0.6, 0.5, 0.22, 0xf4f0e6));
  });

  // ---- block and cleaver, by the carcass ----
  b.with(IN(g, 'larder', 'block'), () => {
    b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => lathe(b, v3(-8.5, f, -15.55), 'y', [[0.3, 0], [0.28, 0.72]], 12));
    b.with({ kind: K.TIMBER, color: 0xc6a47a }, () => b.cylinder(-8.5, -15.55, 0.27, f + 0.72, f + 0.735, 12));
    // the cleaver bitten into the block
    b.with({ kind: K.METAL, color: 0x8e8c86 }, () => obox(b, -8.5, f + 0.82, -15.55, 0.22, 0.16, 0.012, 0.6));
    b.with({ kind: K.TIMBER, color: 0x4a3626 }, () => beam(b, v3(-8.42, f + 0.88, -15.66), v3(-8.27, f + 1.02, -15.86), 0.03, 0.03));
    lump(b, -8.62, f + 0.76, -15.45, 0.1, 0.035, 0.07, 0xb05a44); // a cut chop
  });

  // ---- herring by the door: one barrel opened ----
  b.with(IN(g, 'larder', 'stockfish'), () => {
    cask(b, v3(-11.2, f + 0.33, -13.6), 'y', 0.3, 0.66, { color: 0x9a7a52 });
    cask(b, v3(-10.55, f + 0.33, -13.25), 'y', 0.3, 0.66, { color: 0x95744c });
    cask(b, v3(-10.85, f + 0.95, -13.42), 'x', 0.28, 0.6, { color: 0x9a7a52 });
    // packed herring, heads outward in rings
    const [hx, hz] = [-11.2, -13.6];
    b.with({ kind: K.WATER, color: 0xa9a48e }, () => b.cylinder(hx, hz, 0.24, f + 0.66, f + 0.67, 14));
    for (const [rr, n] of [[0.17, 10], [0.08, 5]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        lump(b, hx + Math.cos(a) * rr, f + 0.685, hz + Math.sin(a) * rr, 0.03, 0.018, 0.075, 0xb8c0c2, K.PLAIN, -a);
      }
    }
    // stockfish stacked crosswise like firewood
    for (let i = 0; i < 6; i++) {
      for (let k = 0; k < 4; k++) {
        const along = i % 2 === 0;
        const off = (k - 1.5) * 0.17;
        dryFish(b, -8.2 + (along ? 0 : off), f + 0.04 + i * 0.05, -14.2 + (along ? off : 0), along ? 'x' : 'z', k * 0.3 + i);
      }
    }
  });

  // ---- shelves: crocks of butter and grease, salt fish, bowls ----
  shelvesZ(b, -18.4, -15.0, r.x1, 1.0, 3, 0.55, 0.4, -1);
  b.with(IN(g, 'larder', 'crocks'), () => {
    const crock = (x, yb, z, s, col, lidCol) => {
      b.with({ kind: K.PLAIN, color: col }, () => lathe(b, v3(x, yb, z), 'y', [[0.08 * s, 0], [0.12 * s, 0.08 * s], [0.13 * s, 0.17 * s], [0.1 * s, 0.25 * s], [0.095 * s, 0.28 * s]], 12));
      if (lidCol) b.with({ kind: K.CLOTH, color: lidCol }, () => b.cylinder(x, z, 0.105 * s, yb + 0.28 * s, yb + 0.3 * s, 12));
    };
    crock(-7.65, 1.04, -18.05, 1.1, 0x9a7a4a, 0xe8e0cc);
    crock(-7.65, 1.04, -17.6, 1.0, 0x8f9a5a, 0xe8e0cc);
    crock(-7.62, 1.04, -17.15, 1.2, 0x9a7a4a, 0xd8ccb0);
    crock(-7.65, 1.04, -16.6, 0.9, 0xb08a5a, null);
    lump(b, -7.65, 1.04 + 0.26, -16.6, 0.08, 0.035, 0.08, 0xf0e2a8); // butter
    jug(b, -7.62, 1.04, -16.05, 1.0, 0x8a7a5a);
    jug(b, -7.62, 1.04, -15.5, 0.85, 0x8f9a5a);
    // middle shelf: salt fish laid flat and bowls of suet
    for (let i = 0; i < 4; i++) dryFish(b, -7.62, 1.6 + i * 0.03, -18.0 + i * 0.12, 'z', i);
    bowl(b, -7.62, 1.59, -17.0, 0.15, 0x9b7b55);
    lump(b, -7.62, 1.64, -17.0, 0.1, 0.04, 0.1, 0xf2ecdc);
    bowl(b, -7.62, 1.59, -16.4, 0.13, 0x8b6b45);
    lump(b, -7.62, 1.63, -16.4, 0.08, 0.035, 0.08, 0xeee4d0);
    for (let i = 0; i < 3; i++) sack(b, -7.68, 1.59, -15.9 + i * 0.32, 0.26, 0.32, 0, 0xd6cdb4);
    // top shelf: spare crocks upside down to dry
    for (let i = 0; i < 4; i++) {
      b.with({ kind: K.PLAIN, color: i % 2 ? 0x9a7a4a : 0xa88a5a }, () =>
        lathe(b, v3(-7.62, 2.14, -18.0 + i * 0.6), 'y', [[0.1, 0], [0.13, 0.08], [0.1, 0.22], [0.06, 0.24]], 10));
    }
  });
}

/** A dried, split cod: a flat body tapering to the tail. */
function dryFish(b, x, y, z, axis, seed = 0) {
  const len = 0.5 + (seed % 3) * 0.04;
  const rot = axis === 'x' ? Math.PI / 2 : 0;
  b.with({ kind: K.PLAIN, color: (seed | 0) % 2 ? 0xcfc09a : 0xc4b48a }, () => {
    if (axis === 'y') {
      b.loft(
        [v3(x - 0.07, y - len / 2, z - 0.012), v3(x + 0.07, y - len / 2, z - 0.012), v3(x + 0.07, y - len / 2, z + 0.012), v3(x - 0.07, y - len / 2, z + 0.012)],
        [v3(x - 0.02, y + len / 2, z - 0.008), v3(x + 0.02, y + len / 2, z - 0.008), v3(x + 0.02, y + len / 2, z + 0.008), v3(x - 0.02, y + len / 2, z + 0.008)],
      );
      obox(b, x, y + len / 2 + 0.04, z, 0.1, 0.08, 0.01, 0); // tail, tied to the hook
    } else {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const P2 = (lx, ly, lz) => v3(x + lx * c + lz * s, y + ly, z - lx * s + lz * c);
      b.loft(
        [P2(-0.07, 0, -len / 2), P2(0.07, 0, -len / 2), P2(0.02, 0, len / 2), P2(-0.02, 0, len / 2)],
        [P2(-0.07, 0.025, -len / 2), P2(0.07, 0.025, -len / 2), P2(0.02, 0.02, len / 2), P2(-0.02, 0.02, len / 2)],
      );
      obox(b, x + s * (len / 2 + 0.04), y + 0.012, z + c * (len / 2 + 0.04), 0.1, 0.02, 0.08, rot);
    }
  });
}

// ---------------------------------------------------------------------------
function domeShell(b, o, latSeg = 6, lonSeg = 16, skip) {
  const P3 = (r, lat, lon) => v3(o.x + r * Math.cos(lat) * Math.cos(lon), o.y + r * Math.sin(lat) * o.rise, o.z + r * Math.cos(lat) * Math.sin(lon));
  for (let i = 0; i < latSeg; i++) {
    const la0 = (i / latSeg) * (Math.PI / 2);
    const la1 = ((i + 1) / latSeg) * (Math.PI / 2);
    for (let j = 0; j < lonSeg; j++) {
      const lo0 = (j / lonSeg) * Math.PI * 2;
      const lo1 = ((j + 1) / lonSeg) * Math.PI * 2;
      if (skip && skip((la0 + la1) / 2, (lo0 + lo1) / 2)) continue;
      const inner = [P3(o.rIn, la0, lo0), P3(o.rIn, la0, lo1), P3(o.rIn, la1, lo1), P3(o.rIn, la1, lo0)];
      const outer = [P3(o.rOut, la0, lo0), P3(o.rOut, la0, lo1), P3(o.rOut, la1, lo1), P3(o.rOut, la1, lo0)];
      b.loft(inner, outer);
    }
  }
}

function bakehouse(b) {
  const g = G.bakehouse;
  const f = S.bakehouse.floor;
  const o = S.bakehouse.oven;
  const ovenPlanes = [MAIN_CUT, { n: new THREE.Vector3(0, 0, 1), d: o.cutZ }];
  b.with({ ...IN(g, 'bakehouse', 'oven'), kind: K.STONE, color: 0xb9a68c, planes: ovenPlanes }, () => {
    // solid base with the oven floor on top
    b.box(5.4, 0, -21, o.x + o.rOut + 0.05, o.y, -16.9, { topKind: K.PAVING, topColor: 0xa99a84 });
    // the dome, with its mouth to the east
    const mouth = (lat, lon) => {
      const l = lon > Math.PI ? lon - Math.PI * 2 : lon;
      return Math.abs(l) < 0.3 && lat < 0.55;
    };
    domeShell(b, o, 6, 18, mouth);
    // mouth jambs and lintel
    b.with({ kind: K.STONE, color: P.ashlar }, () => {
      const mx = o.x + o.rIn - 0.05;
      b.box(mx, o.y, -19.55, o.x + o.rOut + 0.1, o.y + 0.5, -19.38);
      b.box(mx, o.y, -18.62, o.x + o.rOut + 0.1, o.y + 0.5, -18.45);
      b.box(mx, o.y + 0.5, -19.55, o.x + o.rOut + 0.1, o.y + 0.68, -18.45);
    });
    // clay cladding over the dome, squared off against the wall
    b.with({ kind: K.PLASTER, color: 0xc7ad8a }, () => {
      b.box(5.4, o.y, -21, 6.0, o.y + 1.05, -16.9);
    });
  });
  // hood and flue over the mouth carrying smoke to the chimney
  b.with({ ...IN(g, 'bakehouse', 'oven'), kind: K.STONE, color: P.stone }, () => {
    const hx = o.x + o.rOut + 0.1;
    b.loft(
      [v3(hx - 0.5, 2.0, -20.0), v3(hx + 0.75, 2.0, -20.0), v3(hx + 0.75, 2.0, -18.1), v3(hx - 0.5, 2.0, -18.1)],
      [v3(hx - 0.2, 2.9, -20.8), v3(hx + 0.45, 2.9, -20.8), v3(hx + 0.45, 2.9, -19.9), v3(hx - 0.2, 2.9, -19.9)],
    );
    b.box(hx - 0.2, 2.9, -21, hx + 0.45, 5.4, -20.2);
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(hx - 0.5, 1.92, -20.0, hx + 0.75, 2.0, -18.1));
  });
  // kneading trough, moulding board, bolting hutch, meal
  b.with(IN(g, 'bakehouse', 'kneadingTrough'), () => {
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      for (const x of [9.75, 10.95]) {
        beam(b, v3(x, 0.62, -14.9), v3(x - 0.15, f, -15.2), 0.07, 0.07);
        beam(b, v3(x, 0.62, -14.9), v3(x + 0.15, f, -14.6), 0.07, 0.07);
      }
      b.loft([v3(9.55, 0.62, -15.15), v3(11.15, 0.62, -15.15), v3(11.15, 0.62, -14.65), v3(9.55, 0.62, -14.65)],
        [v3(9.4, 1.0, -15.3), v3(11.3, 1.0, -15.3), v3(11.3, 1.0, -14.5), v3(9.4, 1.0, -14.5)]);
    });
    lump(b, 10.35, 0.98, -14.9, 0.7, 0.08, 0.3, 0xead8b0); // dough
  });
  b.with(IN(g, 'bakehouse', 'bakehouse'), () => {
    trestleTable(b, 6.2, 8.8, -15.4, -14.5, 0.84);
    for (let i = 0; i < 8; i++) loaf(b, 6.5 + (i % 4) * 0.55, 0.84, -15.18 + Math.floor(i / 4) * 0.42, 0.13, 0xe2cfa2);
    b.with({ kind: K.PLAIN, color: 0xf0ead8 }, () => b.box(7.9, 0.84, -15.3, 8.6, 0.85, -14.6)); // flour
  });
  b.with(IN(g, 'bakehouse', 'bolting'), () => {
    chest(b, 10.1, 11.25, -20.85, -20.05, f, 0.85, P.oak);
    sack(b, 10.6, f, -19.3, 0.5, 0.78, 0.3, 0xddd2b6);
    sack(b, 10.95, f, -18.55, 0.5, 0.72, -0.2, 0xd8cdb0);
  });
  // faggots for firing the oven
  b.with(IN(g, 'bakehouse', 'woodpile'), () => {
    for (let i = 0; i < 7; i++) faggot(b, 6.2, f + Math.floor(i / 3) * 0.32, -16.2 + (i % 3) * 0.38 + (Math.floor(i / 3) % 2) * 0.18, 1.3, 0.16);
  });
  // cooling shelves with baked loaves
  shelvesZ(b, -17.8, -15.4, 11.4, 0.9, 3, 0.5, 0.4, -1);
  b.with(IN(g, 'bakehouse', 'breadShelf'), () => {
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) loaf(b, 11.2, 0.94 + s * 0.5, -17.5 + i * 0.6, 0.13, s === 2 ? 0x9a6a3a : 0xb98048);
  });
}

// ---------------------------------------------------------------------------
function brewhouse(b) {
  const g = G.brewhouse;
  const f = S.brewhouse.floor;
  const [lx, ly, lz, lr] = S.brewhouse.lead;
  b.with(IN(g, 'brewhouse', 'lead'), () => {
    b.with({ kind: K.STONE, color: 0xb7a88f }, () => {
      b.box(12.2, 0, -21, 14.6, ly, -19.05);
    });
    b.with({ kind: K.PLAIN, color: P.soot }, () => b.box(13.05, f, -19.08, 13.75, 0.6, -19.04)); // fire mouth
    b.with({ kind: K.METAL, color: 0x8a6a4a }, () => lathe(b, v3(lx, ly - 0.25, lz), 'y', [[lr * 0.85, 0], [lr, 0.45], [lr + 0.04, 0.5]], 18));
    b.with({ kind: K.WATER, color: 0x9a7040 }, () => b.cylinder(lx, lz, lr * 0.96, ly + 0.1, ly + 0.17, 18));
    // flue
    b.with({ kind: K.STONE, color: P.stone }, () => b.box(14.0, ly, -21, 14.6, 3.35, -20.3));
  });
  b.with(IN(g, 'brewhouse', 'mashTun'), () => {
    const [x, y, z, r] = S.brewhouse.mashTun;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(x - 0.8, f, z - 0.8, x + 0.8, y, z + 0.8));
    tub(b, x, y, z, r, 0.95, { liquid: 0xb08a50 });
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(x - 0.3, y + 0.7, z + 0.1), v3(x + 0.5, y + 1.9, z + 0.6), 0.06, 0.06)); // mash oar
    tub(b, x + 1.05, f, z + 1.0, 0.42, 0.42, { liquid: 0x8e6a3a }); // underback
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(x + 0.85, y + 0.25, z + 0.55), v3(x + 1.0, y - 0.05, z + 0.9), 0.06, 0.06)); // tap spout
  });
  b.with(IN(g, 'brewhouse', 'cooler'), () => {
    trestleTable(b, 12.6, 15.4, -15.2, -13.7, 0.62);
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(12.6, 0.62, -15.2, 15.4, 0.84, -15.1);
      b.box(12.6, 0.62, -13.8, 15.4, 0.84, -13.7);
      b.box(12.6, 0.62, -15.2, 12.7, 0.84, -13.7);
      b.box(15.3, 0.62, -15.2, 15.4, 0.84, -13.7);
    });
    b.with({ kind: K.WATER, color: 0xa47a42 }, () => b.box(12.7, 0.62, -15.1, 15.3, 0.76, -13.8));
  });
  b.with(IN(g, 'brewhouse', 'vat'), () => {
    tub(b, 16.7, f, -14.6, 0.62, 0.9, { liquid: 0xe6d6a8 });
    tub(b, 17.8, f, -13.6, 0.5, 0.8, { liquid: 0xe9dcb4 });
  });
  b.with(IN(g, 'brewhouse', 'cask'), () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(17.6, f, -18.3, 18.5, f + 0.25, -18.15);
      b.box(17.6, f, -16.5, 18.5, f + 0.25, -16.35);
    });
    for (const z of [-17.9, -17.25, -16.6]) cask(b, v3(18.05, f + 0.55, z + 0.1), 'x', 0.3, 0.7, { color: 0x9b7b52 });
  });
  // ladder to the malt floor, malt spread on it, sacks
  ladder(b, 12.9, f, -15.8, 12.9, 3.85, -16.5);
  b.with(IN(g, 'brewhouse', 'maltFloor'), () => {
    b.with({ kind: K.STRAW, color: 0xd2b36e }, () => b.box(12.5, 3.85, -20.9, 17.8, 3.93, -17.2));
    for (let i = 0; i < 3; i++) sack(b, 18.0, 3.85, -20.4 + i * 0.6, 0.45, 0.65, 0.1 * i, 0xcfb98a);
    b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(15.0, 3.95, -17.4), v3(15.9, 4.9, -18.1), 0.05, 0.05)); // malt shovel
    b.with({ kind: K.TIMBER, color: P.oak }, () => obox(b, 14.95, 3.96, -17.35, 0.28, 0.03, 0.22, 0.6));
  });
  b.with(IN(g, 'brewhouse', 'brewhouse'), () => {
    tub(b, 15.4, f, -12.9, 0.22, 0.3, { liquid: P.water });
    tub(b, 15.9, f, -13.0, 0.22, 0.3, { liquid: P.water });
  });
}

// ---------------------------------------------------------------------------
function granary(b) {
  const g = G.granary;
  const f = S.granary.floor;
  b.with(IN(g, 'granary', 'sacks'), () => {
    let n = 0;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const x = 19.85 + i * 0.6;
        const z = -20.6 + row * 0.62;
        sack(b, x, f, z, 0.5, 0.75, (n++ % 3) * 0.15 - 0.15, row === 2 ? 0xc9b58a : 0xd2c095);
      }
    }
    for (let i = 0; i < 4; i++) sack(b, 20.1 + i * 0.6, f + 0.72, -20.5, 0.48, 0.7, i * 0.2, 0xd8c69c);
    // loft: heaps of wheat and sacks
    heap(b, 21.0, 3.85, -18.2, 2.4, 2.0, 0.55, 0xd8b868);
    heap(b, 23.2, 3.85, -17.6, 1.8, 1.6, 0.42, 0xcfae60);
    for (let i = 0; i < 3; i++) sack(b, 19.9 + i * 0.55, 3.85, -15.7, 0.45, 0.68, 0.2 * i, 0xd2c095);
  });
  b.with(IN(g, 'granary', 'bin'), () => {
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      b.box(23.0, f, -16.8, 24.9, f + 1.0, -16.65);
      b.box(23.0, f, -14.9, 24.9, f + 1.0, -14.75);
      b.box(23.0, f, -16.8, 23.15, f + 1.0, -14.75);
    });
    heap(b, 24.0, f, -15.8, 1.6, 1.7, 0.75, 0xc9a65c);
    cask(b, v3(24.4, f + 0.38, -13.4), 'y', 0.33, 0.76, { color: 0x9b7b52 }); // salt
    cask(b, v3(23.7, f + 0.38, -13.1), 'y', 0.33, 0.76, { color: 0x987850 });
  });
  // balance on a post and a bushel measure by the door
  b.with({ ...IN(g, 'granary', 'granary'), kind: K.TIMBER, color: P.timberDark }, () => {
    b.box(22.0, f, -13.9, 22.15, 2.2, -13.75);
    b.box(21.5, 2.1, -13.9, 22.7, 2.18, -13.75);
    for (const x of [21.55, 22.65]) {
      cord(b, v3(x, 2.1, -13.82), v3(x, 1.3, -13.82), 0.015);
      b.with({ kind: K.METAL, color: 0x8a7a60 }, () => lathe(b, v3(x, 1.25, -13.82), 'y', [[0.1, 0], [0.18, 0.06]], 10));
    }
    tub(b, 23.0, f, -13.0, 0.3, 0.32, { liquid: 0xd2b060, liquidKind: K.STRAW });
  });
  ladder(b, 24.4, f, -14.6, 24.4, 3.85, -15.5);
}

// ---------------------------------------------------------------------------
function buttery(b) {
  const g = G.buttery;
  const f = S.buttery.floor;
  b.with(IN(g, 'buttery', 'stillage'), () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const x of [-24.75, -23.95]) b.box(x - 0.08, f, -20.8, x + 0.08, f + 0.42, -13.4);
      for (let z = -20.6; z < -13.4; z += 1.4) b.box(-24.9, f, z, -23.8, f + 0.3, z + 0.12);
    });
  });
  b.with(IN(g, 'buttery', 'cask'), () => {
    for (let i = 0; i < 6; i++) cask(b, v3(-24.35, f + 0.75, -20.2 + i * 0.95), 'x', 0.36, 0.82, { color: i % 2 ? 0x9b7b52 : 0xa3825a });
    for (let i = 0; i < 4; i++) cask(b, v3(-24.35, f + 1.42, -19.75 + i * 0.95), 'x', 0.3, 0.7, { color: 0x9a7a50 });
  });
  // front stillage for the cask in use (the tap is a mechanism)
  b.with({ ...IN(g, 'buttery', 'stillage'), kind: K.TIMBER, color: P.timberDark }, () => {
    const t = S.buttery.tapCask;
    for (const z of [t.z - 0.35, t.z + 0.35]) b.box(-24.9, f, z - 0.08, -23.7, t.y - t.r + 0.02, z + 0.08);
  });
  // wine pipe at the back
  b.with({ ...IN(g, 'buttery', 'tun') }, () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      b.box(-22.6, f, -20.9, -22.45, f + 0.35, -19.4);
      b.box(-20.95, f, -20.9, -20.8, f + 0.35, -19.4);
    });
    cask(b, v3(-21.7, f + 0.82, -20.15), 'x', 0.5, 1.2, { color: 0x8f6e48 });
  });
  shelvesZ(b, -17.6, -13.0, -19.6, 1.0, 3, 0.5, 0.38, -1);
  b.with(IN(g, 'buttery', 'jug'), () => {
    const cols = [0x8f9a5a, 0x9aa060, 0xa86b3a, 0x8f9a5a, 0xb07a40];
    for (let s = 0; s < 3; s++) for (let i = 0; i < 5; i++) {
      if (s === 2 && i % 2) continue;
      jug(b, -19.8, 1.04 + s * 0.5, -17.3 + i * 0.95, 0.85 + 0.25 * ((i + s) % 2), cols[(i + s) % 5]);
    }
    trestleTable(b, -22.6, -20.6, -13.6, -12.8, f + 0.8, { floor: f });
    jug(b, -22.2, f + 0.8, -13.2, 1.0, 0x8f9a5a);
    jug(b, -21.7, f + 0.8, -13.25, 1.15, 0xa86b3a);
    for (let i = 0; i < 3; i++) bowl(b, -21.2 + i * 0.25, f + 0.8, -13.1, 0.08, 0x9b7b55); // mazers
  });
}

// ---------------------------------------------------------------------------
function pantry(b) {
  const g = G.pantry;
  const f = S.pantry.floor;
  shelves(b, -18.5, -14.0, -21, f + 0.5, 4, 0.45, 0.42, 1);
  b.with(IN(g, 'pantry', 'breadShelf'), () => {
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 7; i++) {
        const big = s < 2;
        loaf(b, -18.2 + i * 0.6, f + 0.54 + s * 0.45, -20.75, big ? 0.15 : 0.11, s === 0 ? 0xa06a3a : s === 1 ? 0xb88048 : 0xd4a868);
      }
    }
  });
  b.with(IN(g, 'pantry', 'breadShelf'), () => {
    chest(b, -18.5, -17.1, -15.8, -13.6, f, 0.8, P.oak); // bread ark
  });
  b.with(IN(g, 'pantry', 'trenchers'), () => {
    trestleTable(b, -16.8, -14.2, -14.4, -13.4, f + 0.82, { floor: f });
    const y = f + 0.82;
    for (let st = 0; st < 3; st++) {
      for (let i = 0; i < 6; i++) b.with({ kind: K.PLAIN, color: 0xb8915a }, () => obox(b, -16.3 + st * 0.45, y + i * 0.035, -13.9, 0.32, 0.03, 0.22, (i % 2) * 0.1));
    }
    loaf(b, -14.9, y, -13.95, 0.16, 0xa8723e);
    b.with({ kind: K.METAL, color: 0x9a9890 }, () => obox(b, -15.3, y + 0.01, -13.7, 0.32, 0.015, 0.04, -0.3)); // trencher knife
  });
  b.with(IN(g, 'pantry', 'salt'), () => {
    cask(b, v3(-13.65, f + 0.36, -15.6), 'y', 0.3, 0.72, { color: 0x9b7b52 });
    b.with({ kind: K.PLAIN, color: 0xf2efe6 }, () => b.cylinder(-13.65, -15.6, 0.26, f + 0.72, f + 0.76, 12));
    b.with({ kind: K.METAL, color: 0xbab6a8 }, () => lathe(b, v3(-14.5, f + 0.82, -13.8), 'y', [[0.05, 0], [0.04, 0.08], [0.08, 0.14]], 10)); // salt cellar
  });
  b.with(IN(g, 'pantry', 'napery'), () => {
    chest(b, -14.2, -13.15, -19.6, -17.6, f, 0.85, P.timberDark);
    b.with({ kind: K.CLOTH, color: 0xf2ece0 }, () => {
      for (let i = 0; i < 3; i++) b.box(-14.05, f + 0.9 + i * 0.07, -19.4, -13.3, f + 0.96 + i * 0.07, -18.6);
    });
  });
  // cheeses on a shelf (where cheese was kept varied: conjecture)
  shelvesZ(b, -17.0, -16.0, -18.8, 1.4, 1, 0.5, 0.4, 1);
  b.with(IN(g, 'pantry', 'pantry'), () => {
    for (let i = 0; i < 2; i++) b.with({ kind: K.PLAIN, color: 0xe2c27a }, () => b.cylinder(-18.6, -16.75 + i * 0.5, 0.17, 1.44, 1.58, 12));
  });
}

// ---------------------------------------------------------------------------
function undercroft(b) {
  const g = G.undercroft;
  const f = S.undercroft.floor;
  b.with(IN(g, 'undercroft', 'stillage'), () => {
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (const x of [-24.6, -23.3]) b.box(x - 0.1, f, -8.8, x + 0.1, f + 0.35, -3.2);
      for (const z of [-8.75, -7.25]) b.box(-20.2, f, z, -15.3, f + 0.3, z + 0.15);
    });
  });
  b.with(IN(g, 'undercroft', 'tun'), () => {
    for (const z of [-7.8, -6.1, -4.4]) cask(b, v3(-23.95, f + 0.95, z), 'x', 0.66, 1.5, { color: 0x8f6e48, seg: 16 });
    for (const x of [-19.6, -18.5, -17.4, -16.3]) cask(b, v3(x, f + 0.78, -8.0), 'z', 0.46, 1.1, { color: 0x987650 });
  });
  b.with(IN(g, 'undercroft', 'cask'), () => {
    for (const [x, z] of [[-14.0, -7.8], [-14.0, -7.0], [-14.7, -7.4], [-14.0, -5.2]]) cask(b, v3(x, f + 0.33, z), 'y', 0.3, 0.66, { color: 0x9b7b52 });
    cask(b, v3(-14.3, f + 0.95, -7.4), 'x', 0.28, 0.6, { color: 0x9a7a50 });
    for (let i = 0; i < 3; i++) sack(b, -14.2, f, -3.6 + i * 0.6, 0.5, 0.72, i * 0.3, 0xcfbd92);
  });
  ladder(b, -15.9, f, -2.6, -16.55, HALL.floorY, -2.6);
}

// ---------------------------------------------------------------------------
function hall(b) {
  const g = G.hall;
  const f = HALL.floorY;
  b.with(IN(g, 'hall', 'trestle'), () => {
    trestleTable(b, -23.9, -22.9, -6.7, -0.3, f + 0.76, { floor: f });
    trestleTable(b, -15.3, -14.3, -6.7, -0.3, f + 0.76, { floor: f });
  });
  // benches, cloths and vessels laid for dinner
  b.with({ ...IN(g, 'hall', 'trestle') }, () => {
    for (const [x0, x1] of [[-24.6, -24.2], [-22.6, -22.2], [-15.9, -15.5], [-14.1, -13.7]]) {
      b.with({ kind: K.TIMBER, color: P.oak }, () => {
        b.box(x0, f + 0.4, -6.6, x1, f + 0.45, -0.4);
        for (const z of [-6.3, -3.5, -0.7]) b.box(x0 + 0.05, f, z, x1 - 0.05, f + 0.4, z + 0.08);
      });
    }
    // tablecloth and a few vessels laid for dinner
    b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => {
      b.box(-23.95, f + 0.76 - 0.02, -6.5, -22.85, f + 0.77, -0.5);
      b.box(-15.35, f + 0.76 - 0.02, -6.5, -14.25, f + 0.77, -0.5);
    });
    for (let i = 0; i < 4; i++) {
      b.with({ kind: K.PLAIN, color: 0xb8915a }, () => b.box(-23.7, f + 0.77, -6 + i * 1.5, -23.45, f + 0.79, -5.8 + i * 1.5));
      b.with({ kind: K.PLAIN, color: 0xb8915a }, () => b.box(-14.75, f + 0.77, -6 + i * 1.5, -14.5, f + 0.79, -5.8 + i * 1.5));
    }
    jug(b, -23.4, f + 0.77, -3.0, 0.9, 0x8f9a5a);
    jug(b, -14.8, f + 0.77, -2.4, 0.9, 0xa86b3a);
  });
  // fire in the hall hearth (logs; flames are effects)
  b.with(IN(g, 'hall', 'hallFire'), () => {
    const [x, , z] = S.hall.fire;
    for (let i = 0; i < 3; i++) log(b, v3(x - 0.2, f + 0.1 + i * 0.03, z - 0.7 + i * 0.1), v3(x + 0.25, f + 0.12, z + 0.6 - i * 0.2), 0.08, 0x5d4532);
    b.with({ kind: K.EMIT, color: 0xd9662e }, () => b.box(x - 0.35, f + 0.08, z - 0.8, x + 0.4, f + 0.12, z + 0.8));
  });
}

function chamber(b) {
  const g = G.chamber;
  const f = SERV.floor2 + 0.3;
  b.with(IN(g, 'chamber', 'chamber'), () => {
    b.with({ kind: K.TIMBER, color: P.oak }, () => {
      b.box(-24.8, f, -20.8, -22.6, f + 0.5, -18.6);
      b.box(-24.8, f + 0.5, -20.8, -24.6, f + 1.6, -18.6);
    });
    b.with({ kind: K.CLOTH, color: 0x8e3b2e }, () => b.box(-24.6, f + 0.5, -20.7, -22.65, f + 0.68, -18.7));
    b.with({ kind: K.CLOTH, color: 0xeee6d2 }, () => lump(b, -24.2, f + 0.75, -19.7, 0.3, 0.1, 0.6, 0xeee6d2));
    chest(b, -21.6, -20.2, -20.9, -20.2, f, 0.6, P.timberDark);
    bench(b, -17.0, -14.4, -20.9, -20.5, 0.45, f);
    b.with({ kind: K.CLOTH, color: 0x5d7a8c }, () => b.box(-19.5, f + 1.0, -20.98, -16.5, f + 3.0, -20.95)); // hanging
    b.with({ kind: K.CLOTH, color: 0xd8c48a }, () => {
      b.box(-19.5, f + 2.85, -20.95, -16.5, f + 3.0, -20.94);
      b.box(-19.5, f + 1.0, -20.95, -16.5, f + 1.15, -20.94);
    });
  });
}

function gatehouseRooms(b) {
  const g = G.gatehouse;
  b.with({ ...IN(g, 'gatehouse', 'ghChamber'), kind: K.TIMBER, color: P.oak }, () => {
    const f1 = GH.floor1;
    b.box(22.0, f1 + 0.7, -6.2, 24.6, f1 + 0.76, -5.2);
    for (const x of [22.3, 24.2]) b.box(x, f1, -5.9, x + 0.1, f1 + 0.7, -5.5);
    bench(b, 22.0, 24.6, -4.9, -4.5, 0.45, f1);
    // portcullis windlasses above the slots
    for (const gx of [21.4, 26.6]) {
      b.box(gx - 0.15, f1, -1.5, gx + 0.15, f1 + 1.1, -1.3);
      b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.hcyl('z', gx, f1 + 0.9, -0.8, 0.22, 1.5, 10));
    }
    const f2 = GH.floor2;
    b.box(27.0, f2, -7.6, 29.4, f2 + 0.55, -5.4);
    b.with({ kind: K.CLOTH, color: 0x4f6f86 }, () => b.box(27.05, f2 + 0.55, -7.55, 29.35, f2 + 0.7, -5.45));
    chest(b, 22.0, 23.4, -7.6, -7.0, f2, 0.6, P.timberDark);
  });
  void stairs;
  void decalX;
}

function wellHouse(b) {
  const w = S.well;
  const g = G.well;
  b.with({ ...IN(g, 'well', 'wellHouse'), kind: K.TIMBER, color: P.timber }, () => {
    for (const x of [w.x - 1.85, w.x + 1.85]) {
      b.box(x - 0.1, 0, -2.0, x + 0.1, 3.0, -1.8);
      b.box(x - 0.1, 0, 1.8, x + 0.1, 3.0, 2.0);
    }
    b.box(w.x - 2.0, 2.9, -2.05, w.x + 2.0, 3.1, -1.75);
    for (const x of [w.x - 1.85, w.x + 1.85]) b.box(x - 0.1, 2.9, -2.0, x + 0.1, 3.1, 2.0);
    beam(b, v3(w.x, 2.95, -1.9), v3(w.x, 4.15, 0.0), 0.14, 0.14);
    b.with({ kind: K.ROOF, color: P.roof, capKind: K.CUT_TIMBER }, () => {
      b.slab(v3(w.x - 2.3, 2.95, -2.35), v3(w.x + 2.3, 2.95, -2.35), v3(w.x + 2.3, 4.25, 0.05), v3(w.x - 2.3, 4.25, 0.05), 0.12);
    });
    // windlass uprights (the drum and crank are a mechanism)
    b.with({ ...IN(g, 'well', 'windlass') }, () => {
      for (const x of [w.x0 - 0.1, w.x1 + 0.1]) {
        b.box(x - 0.09, 0, w.axleZ - 0.09, x + 0.09, w.axleY + 0.2, w.axleZ + 0.09);
        beam(b, v3(x, 0.0, w.axleZ - 0.6), v3(x, 0.9, w.axleZ - 0.05), 0.08, 0.08);
      }
    });
  });
  // trough for filling buckets
  b.with({ ...IN(g, 'well', 'well'), kind: K.STONE, color: P.ashlar }, () => {
    const [x, z] = w.troughAt;
    b.box(x - 0.7, 0, z - 0.35, x + 0.7, 0.55, z + 0.35);
    b.with({ kind: K.WATER, color: P.water }, () => b.box(x - 0.6, 0.55, z - 0.25, x + 0.6, 0.56, z + 0.25));
  });
  void NR;
}
