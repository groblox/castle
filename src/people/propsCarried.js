import { K, P } from '../geom/kinds.js';
import { lathe, lump, sack as sackGeo, log as logGeo } from '../geom/props.js';
import { obox, beam, v3 } from '../geom/shapes.js';
import { partGeo, mesh } from './parts.js';

// Small things carried in the hand. Each returns a mesh positioned so that its
// grip is at the origin (hand joint).

const cache = new Map();
function geo(name, fn) {
  if (!cache.has(name)) cache.set(name, partGeo(fn));
  return cache.get(name);
}

export function carried(name, mat) {
  switch (name) {
    case 'pail':
    case 'pailFull':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(0, -0.36, 0), 'y', [[0.12, 0], [0.145, 0.3]], 10));
        b.with({ kind: K.METAL, color: P.iron }, () => {
          beam(b, v3(-0.14, -0.08, 0), v3(0, 0.02, 0), 0.015, 0.015);
          beam(b, v3(0.14, -0.08, 0), v3(0, 0.02, 0), 0.015, 0.015);
        });
        if (name === 'pailFull') b.with({ kind: K.WATER, color: P.water }, () => lathe(b, v3(0, -0.12, 0), 'y', [[0.135, 0], [0.135, 0.02]], 10));
      }), mat);
    case 'jug':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.PLAIN, color: 0x8f9a5a }, () => lathe(b, v3(0, -0.18, 0.04), 'y', [[0.06, 0], [0.09, 0.08], [0.095, 0.14], [0.07, 0.22], [0.05, 0.27], [0.06, 0.31]], 10));
      }), mat);
    case 'ladle':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.1, 0), v3(0, -0.9, 0.25), 0.03, 0.03));
        b.with({ kind: K.METAL, color: 0x77746e }, () => lathe(b, v3(0, -0.95, 0.27), 'y', [[0.03, 0], [0.07, 0.06]], 8));
      }), mat);
    case 'oar':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => {
          beam(b, v3(0, 0.3, -0.1), v3(0, -1.2, 0.35), 0.045, 0.045);
          obox(b, 0, -1.25, 0.37, 0.16, 0.3, 0.03, 0);
        });
      }), mat);
    case 'sack':
      return mesh(geo(name, (b) => sackGeo(b, 0, -0.05, 0, 0.42, 0.6, 1.57, 0xd2c095)), mat);
    case 'logs':
      return mesh(geo(name, (b) => {
        for (let i = 0; i < 3; i++) logGeo(b, v3(-0.35, 0.02 + (i % 2) * 0.1, -0.05 + i * 0.06), v3(0.35, 0.02 + (i % 2) * 0.1, -0.02 + i * 0.05), 0.065, 0x7d5c3b);
      }), mat);
    case 'pot':
      return mesh(geo(name, (b) => b.with({ kind: K.METAL, color: 0x5a554e }, () => lathe(b, v3(0, -0.2, 0.05), 'y', [[0.08, 0], [0.16, 0.08], [0.15, 0.2]], 12))), mat);
    case 'bread':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.STRAW, color: 0xb69a62 }, () => lathe(b, v3(0, -0.08, 0.05), 'y', [[0.18, 0], [0.24, 0.12]], 12));
        for (let i = 0; i < 4; i++) lump(b, -0.1 + (i % 2) * 0.18, 0.08, -0.02 + Math.floor(i / 2) * 0.13, 0.09, 0.05, 0.09, 0xb98048);
      }), mat);
    case 'trenchers':
      return mesh(geo(name, (b) => {
        for (let i = 0; i < 6; i++) b.with({ kind: K.PLAIN, color: 0xb8915a }, () => obox(b, 0, -0.03 + i * 0.03, 0.05, 0.3, 0.025, 0.2, (i % 2) * 0.1));
        b.with({ kind: K.METAL, color: 0xbab6a8 }, () => lathe(b, v3(0.08, 0.15, 0.05), 'y', [[0.04, 0], [0.03, 0.06], [0.06, 0.1]], 8));
      }), mat);
    case 'tally':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0xcab48a }, () => obox(b, 0, 0.0, 0.08, 0.025, 0.025, 0.28, 0));
        b.with({ kind: K.PLAIN, color: 0x3a2a1e }, () => {
          for (let i = 0; i < 5; i++) obox(b, 0.013, 0.0, 0.0 + i * 0.03, 0.004, 0.026, 0.006, 0);
        });
      }), mat);
    case 'knife':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x5a3a26 }, () => obox(b, 0, 0, 0.03, 0.025, 0.025, 0.1, 0));
        b.with({ kind: K.METAL, color: 0xb0aea6 }, () => obox(b, 0, 0, 0.16, 0.012, 0.04, 0.18, 0));
      }), mat);
    case 'quill':
      return mesh(geo(name, (b) => b.with({ kind: K.PLAIN, color: 0xf2eee4 }, () => beam(b, v3(0, -0.02, 0.0), v3(0, 0.16, 0.06), 0.012, 0.03))), mat);
    case 'roll':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.CLOTH, color: 0xece2c8 }, () => obox(b, 0, 0.02, 0.12, 0.26, 0.01, 0.32, 0));
        b.with({ kind: K.CLOTH, color: 0xe2d6b8 }, () => lathe(b, v3(-0.14, 0.04, -0.04), 'x', [[0.03, 0], [0.03, 0.28]], 8));
      }), mat);
    case 'fowl':
      return mesh(geo(name, (b) => {
        lump(b, 0, -0.22, 0, 0.1, 0.13, 0.08, 0xd8c8b0);
        b.with({ kind: K.SKIN, color: 0xd09060 }, () => beam(b, v3(0, -0.1, 0), v3(0, 0.02, 0), 0.025, 0.025));
      }), mat);
    case 'spear':
      // held upright: ash shaft from the ground to above the head, iron head
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0xa88a5e }, () => lathe(b, v3(0, -0.98, 0), 'y', [[0.018, 0], [0.016, 2.25]], 6));
        b.with({ kind: K.METAL, color: 0x8e8c86 }, () => {
          lathe(b, v3(0, 1.22, 0), 'y', [[0.022, 0], [0.022, 0.08]], 6);
          lathe(b, v3(0, 1.3, 0), 'y', [[0.035, 0], [0.03, 0.1], [0, 0.26]], 4);
        });
      }), mat);
    case 'crossbow':
      // slung across the back: tiller, bow (prod), string and spanning stirrup
      return mesh(geo(name, (b) => {
        const tilt = v3(0.55, 1, 0).normalize();
        const at = (d) => v3(tilt.x * d, tilt.y * d, 0);
        b.with({ kind: K.TIMBER, color: 0x7a5a3a }, () => beam(b, at(-0.38), at(0.38), 0.045, 0.05));
        const side = v3(tilt.y, -tilt.x, 0);
        const prod = (s) => at(0.34).addScaledVector(side, s * 0.36).add(v3(0, 0, -0.06 * Math.abs(s)));
        b.with({ kind: K.TIMBER, color: 0x5a4a36 }, () => {
          beam(b, at(0.34), prod(1), 0.035, 0.03);
          beam(b, at(0.34), prod(-1), 0.035, 0.03);
        });
        b.with({ kind: K.PLAIN, color: 0xe8e0cc }, () => {
          beam(b, prod(1), at(0.12), 0.008, 0.008);
          beam(b, prod(-1), at(0.12), 0.008, 0.008);
        });
        b.with({ kind: K.METAL, color: P.iron }, () => {
          beam(b, at(0.36).addScaledVector(side, 0.07), at(0.47).addScaledVector(side, 0.07), 0.015, 0.015);
          beam(b, at(0.36).addScaledVector(side, -0.07), at(0.47).addScaledVector(side, -0.07), 0.015, 0.015);
          beam(b, at(0.47).addScaledVector(side, 0.07), at(0.47).addScaledVector(side, -0.07), 0.015, 0.015);
        });
      }), mat);
    case 'quiver':
      // bolts in a leather quiver at the right hip
      return mesh(geo(name, (b) => {
        b.with({ kind: K.PLAIN, color: 0x6b4a30 }, () => obox(b, 0, 0, 0, 0.09, 0.26, 0.06, 0));
        b.with({ kind: K.PLAIN, color: 0xd8d0bc }, () => {
          for (let i = 0; i < 4; i++) obox(b, -0.03 + i * 0.02, 0.16, 0, 0.012, 0.07, 0.02, 0);
        });
      }), mat);
    case 'broom':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.4, 0), v3(0, -0.9, 0.15), 0.03, 0.03));
        b.with({ kind: K.STRAW, color: 0x9a8050 }, () => lathe(b, v3(0, -1.25, 0.2), 'y', [[0.1, 0], [0.03, 0.35]], 6));
      }), mat);
    case 'hammer':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.02, 0), v3(0, -0.04, 0.32), 0.03, 0.03));
        b.with({ kind: K.METAL, color: P.iron }, () => obox(b, 0, -0.04, 0.32, 0.06, 0.16, 0.06, 0));
      }), mat);
    case 'mallet':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.02, 0), v3(0, -0.04, 0.26), 0.035, 0.035));
        b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => lathe(b, v3(0, -0.04, 0.3), 'y', [[0.07, -0.07], [0.08, 0.07]], 8));
      }), mat);
    case 'hoe':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.45, -0.1), v3(0, -1.0, 0.35), 0.035, 0.035));
        b.with({ kind: K.METAL, color: P.iron }, () => obox(b, 0, -1.05, 0.45, 0.2, 0.03, 0.14, 0));
      }), mat);
    case 'crook':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => {
          beam(b, v3(0, -0.95, 0.05), v3(0, 0.6, 0), 0.035, 0.035);
          beam(b, v3(0, 0.6, 0), v3(0, 0.72, 0.08), 0.03, 0.03);
          beam(b, v3(0, 0.72, 0.08), v3(0, 0.62, 0.15), 0.03, 0.03);
        });
      }), mat);
    case 'basket':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.WATTLE, color: 0xa88a5a }, () => lathe(b, v3(0, -0.05, 0.12), 'y', [[0.13, 0], [0.18, 0.18]], 10));
        b.with({ kind: K.STRAW, color: 0xd8b860 }, () => lathe(b, v3(0, 0.1, 0.12), 'y', [[0.16, 0], [0.001, 0.04]], 10));
      }), mat);
    case 'pack':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.CLOTH, color: 0x7a6a4a }, () => lump(b, 0, 0.05, -0.12, 0.2, 0.26, 0.14, 0x7a6a4a, K.CLOTH));
        b.with({ kind: K.CLOTH, color: 0x5a3e2a }, () => obox(b, 0, 0.12, -0.05, 0.42, 0.04, 0.04, 0));
      }), mat);
    case 'linen':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.CLOTH, color: 0xf2ede0 }, () => obox(b, 0, -0.1, 0.18, 0.5, 0.06, 0.3, 0));
      }), mat);
    case 'bow':
      // a longbow held in the left hand, the stave upright when the arm is
      // raised (along the hand's x), the string towards the archer (+y)
      return mesh(geo(name, (b) => {
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const u = -1 + i / 4;
          pts.push(v3(u * 0.85, 0.15 * u * u, 0.02));
        }
        b.with({ kind: K.TIMBER, color: 0xa07a48 }, () => {
          for (let i = 0; i < 8; i++) beam(b, pts[i], pts[i + 1], 0.035 - Math.abs(i - 3.5) * 0.003, 0.03);
        });
        b.with({ kind: K.PLAIN, color: 0xe8e0cc }, () => beam(b, pts[0], pts[8], 0.008, 0.008));
      }), mat);
    case 'arrows':
      // a sheaf of arrows in a bag at the belt
      return mesh(geo(name, (b) => {
        b.with({ kind: K.CLOTH, color: 0x7a6a4a }, () => obox(b, 0, 0, 0, 0.1, 0.3, 0.08, 0));
        b.with({ kind: K.TIMBER, color: 0xc8b48a }, () => {
          for (let i = 0; i < 5; i++) obox(b, -0.03 + i * 0.015, 0.25, 0, 0.012, 0.3, 0.012, 0);
        });
        b.with({ kind: K.CLOTH, color: 0xece4d0 }, () => obox(b, 0, 0.38, 0, 0.09, 0.08, 0.02, 0));
      }), mat);
    case 'pike':
      // a spear levelled before the body, held at the front slot
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0xa88a5e }, () => lathe(b, v3(0.04, -0.05, -1.3), 'z', [[0.02, 0], [0.018, 2.75]], 6));
        b.with({ kind: K.METAL, color: 0x8e8c86 }, () => lathe(b, v3(0.04, -0.05, 1.45), 'z', [[0.035, 0], [0.03, 0.1], [0, 0.3]], 4));
      }), mat);
    case 'keys':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.METAL, color: P.iron }, () => {
          lathe(b, v3(0, -0.05, 0.02), 'z', [[0.06, 0], [0.06, 0.015]], 10);
          for (let i = 0; i < 3; i++) beam(b, v3(-0.03 + i * 0.03, -0.08, 0.02), v3(-0.04 + i * 0.04, -0.24, 0.03), 0.012, 0.012);
        });
      }), mat);
    case 'fiddle':
      // a vielle on the left shoulder, with its bow in the right hand drawn separately
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x9a5a2a }, () => {
          lump(b, 0, -0.06, 0.18, 0.1, 0.035, 0.2, 0x9a5a2a, K.TIMBER);
          beam(b, v3(0, -0.06, 0.36), v3(0, -0.06, 0.55), 0.04, 0.025);
        });
        b.with({ kind: K.PLAIN, color: 0x2a2018 }, () => obox(b, 0, -0.03, 0.22, 0.06, 0.01, 0.2, 0));
      }), mat);
    case 'fiddleBow':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x5a3a26 }, () => beam(b, v3(0, -0.02, 0), v3(0.02, -0.08, 0.55), 0.015, 0.015));
      }), mat);
    case 'fork':
      // a hay fork, tines down
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: P.oak }, () => beam(b, v3(0, 0.45, -0.1), v3(0, -1.0, 0.35), 0.032, 0.032));
        b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => {
          for (const dx of [-0.07, 0.07]) beam(b, v3(0, -1.0, 0.35), v3(dx, -1.35, 0.5), 0.02, 0.02);
        });
      }), mat);
    case 'hay':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.STRAW, color: 0xd2bd7c }, () => lump(b, 0, 0.0, 0.08, 0.32, 0.2, 0.22, 0xd2bd7c, K.STRAW));
      }), mat);
    case 'sword':
      // a blade held point-up, hilt in the hand
      return mesh(geo(name, (b) => {
        b.with({ kind: K.METAL, color: 0xa8aaae }, () => obox(b, 0, -0.02, 0.45, 0.05, 0.012, 0.8, 0));
        b.with({ kind: K.METAL, color: P.iron }, () => obox(b, 0, -0.02, 0.04, 0.22, 0.03, 0.03, 0));
        b.with({ kind: K.TIMBER, color: 0x3a2a1e }, () => obox(b, 0, -0.02, -0.06, 0.035, 0.035, 0.14, 0));
      }), mat);
    case 'helm':
      // a great helm in the lap, being scoured
      return mesh(geo(name, (b) => {
        b.with({ kind: K.METAL, color: 0x8a8c90 }, () => lathe(b, v3(0, -0.05, 0.12), 'y', [[0.12, 0], [0.125, 0.2], [0.1, 0.27], [0.001, 0.3]], 12));
        b.with({ kind: K.PLAIN, color: 0x2a2620 }, () => obox(b, 0, 0.12, 0.24, 0.16, 0.02, 0.02, 0));
      }), mat);
    case 'stick':
      // a switch for driving geese
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => beam(b, v3(0, 0.05, 0), v3(0, -0.6, 0.9), 0.02, 0.012));
      }), mat);
    case 'clothes':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.CLOTH, color: 0x9a2a2a }, () => obox(b, 0, -0.06, 0.18, 0.45, 0.08, 0.3, 0));
        b.with({ kind: K.CLOTH, color: 0xf3eee2 }, () => obox(b, 0, 0.0, 0.18, 0.42, 0.05, 0.28, 0));
      }), mat);
    case 'brush':
      return mesh(geo(name, (b) => {
        b.with({ kind: K.TIMBER, color: 0x7a5a3a }, () => obox(b, 0, -0.04, 0.04, 0.08, 0.04, 0.16, 0));
        b.with({ kind: K.STRAW, color: 0x5a4a3a }, () => obox(b, 0, -0.08, 0.04, 0.07, 0.04, 0.15, 0));
      }), mat);
    default:
      return null;
  }
}
