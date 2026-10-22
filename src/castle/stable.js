import { K, P } from '../geom/kinds.js';
import { beam, obox, v3 } from '../geom/shapes.js';
import { lathe, tub, chest, ladder } from '../geom/props.js';
import { rng, mound } from '../geom/nature.js';
import { lab } from '../data/labels.js';
import { G } from './rooms.js';
import { OUTER_Y, OC_IN } from './layout.js';
import { lantern } from './interiors.js';

// A lean-to stable against the north outer curtain for the garrison's and
// the household's horses: five stalls with mangers and hay racks, straw
// bedding, saddles on a rail and a haystack at the end.

const OY = OUTER_Y;
export const STABLE = { x0: -18.4, x1: -5.4, zb: OC_IN.z0, zf: -29.9, stalls: [] };

export function stable(b) {
  const { x0, x1, zb, zf } = STABLE;
  const n = 5;
  const w = (x1 - x0) / n;
  const S = (key) => ({ group: G.stable, label: lab(key, 'stable') });
  const eave = OY + 2.55;
  const top = OY + 4.1;

  b.with(S('stable'), () => {
    // posts along the front and a wall plate
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => {
      for (let i = 0; i <= n; i++) b.box(x0 + i * w - 0.1, OY, zf - 0.1, x0 + i * w + 0.1, eave, zf + 0.1);
      b.box(x0 - 0.15, eave - 0.2, zf - 0.13, x1 + 0.15, eave, zf + 0.13);
      // rafters from the curtain to the plate
      for (let x = x0; x <= x1 + 0.01; x += w / 2) beam(b, v3(x, top - 0.1, zb), v3(x, eave - 0.05, zf + 0.35), 0.12, 0.14);
    });
    // boarded end walls
    b.with({ kind: K.TIMBER, color: P.timber }, () => {
      for (const x of [x0, x1]) {
        b.loft([v3(x - 0.05, OY, zb), v3(x + 0.05, OY, zb), v3(x + 0.05, OY, zf), v3(x - 0.05, OY, zf)],
          [v3(x - 0.05, top, zb), v3(x + 0.05, top, zb), v3(x + 0.05, eave, zf), v3(x - 0.05, eave, zf)]);
      }
    });
    // stall partitions, low at the front
    b.with({ kind: K.TIMBER, color: 0x8a6a48 }, () => {
      for (let i = 1; i < n; i++) {
        const x = x0 + i * w;
        b.loft([v3(x - 0.04, OY, zb), v3(x + 0.04, OY, zb), v3(x + 0.04, OY, zf + 1.0), v3(x - 0.04, OY, zf + 1.0)],
          [v3(x - 0.04, OY + 1.6, zb), v3(x + 0.04, OY + 1.6, zb), v3(x + 0.04, OY + 1.2, zf + 1.0), v3(x - 0.04, OY + 1.2, zf + 1.0)]);
        b.box(x - 0.07, OY, zf + 0.85, x + 0.07, OY + 1.55, zf + 1.05); // heel post
      }
    });
    // straw bedding, and the cobbled standing in front
    b.with({ kind: K.STRAW, color: 0xd2bd7c }, () => b.box(x0 + 0.06, OY, zb + 0.05, x1 - 0.06, OY + 0.05, zf + 0.6));
    b.with({ kind: K.COBBLE, color: 0x9a907e }, () => b.box(x0 - 0.3, OY, zf + 0.6, x1 + 0.3, OY + 0.03, zf + 1.6));
  });
  b.with(S('manger'), () => {
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * w;
      // manger trough against the wall, and a slatted hay rack above it
      b.with({ kind: K.TIMBER, color: P.oak }, () => {
        b.box(cx - w / 2 + 0.15, OY + 0.75, zb + 0.02, cx + w / 2 - 0.15, OY + 1.05, zb + 0.55);
        for (const x of [cx - w / 2 + 0.2, cx + w / 2 - 0.25]) b.box(x, OY, zb + 0.4, x + 0.06, OY + 0.75, zb + 0.5);
        b.box(cx - w / 2 + 0.2, OY + 1.95, zb + 0.6, cx + w / 2 - 0.2, OY + 2.0, zb + 0.66);
        for (let x = cx - w / 2 + 0.3; x < cx + w / 2 - 0.25; x += 0.14) beam(b, v3(x, OY + 1.25, zb + 0.05), v3(x, OY + 1.97, zb + 0.62), 0.025, 0.025);
      });
      b.with({ kind: K.STRAW, color: 0xc8b878 }, () => b.loft(
        [v3(cx - w / 2 + 0.3, OY + 1.3, zb + 0.05), v3(cx + w / 2 - 0.3, OY + 1.3, zb + 0.05), v3(cx + w / 2 - 0.3, OY + 1.3, zb + 0.15), v3(cx - w / 2 + 0.3, OY + 1.3, zb + 0.15)],
        [v3(cx - w / 2 + 0.3, OY + 1.9, zb + 0.05), v3(cx + w / 2 - 0.3, OY + 1.9, zb + 0.05), v3(cx + w / 2 - 0.3, OY + 1.9, zb + 0.5), v3(cx - w / 2 + 0.3, OY + 1.9, zb + 0.5)],
      ));
      STABLE.stalls.push({ x: cx, z: zb + 2.0 });
    }
  });
  // saddles on a rail along the west end wall of the first stall, kept for tack
  b.with(S('saddles'), () => {
    const rx = x0 + 0.2;
    b.with({ kind: K.TIMBER, color: P.timberDark }, () => b.box(rx - 0.05, OY + 1.0, zb + 1.0, rx + 0.05, OY + 1.08, zb + 2.6));
    for (const z of [zb + 1.4, zb + 2.2]) {
      b.with({ kind: K.CLOTH, color: 0x6a4228 }, () => {
        b.loft([v3(rx - 0.05, OY + 1.08, z - 0.22), v3(rx + 0.55, OY + 1.08, z - 0.22), v3(rx + 0.55, OY + 1.08, z + 0.22), v3(rx - 0.05, OY + 1.08, z + 0.22)],
          [v3(rx, OY + 1.2, z - 0.2), v3(rx + 0.5, OY + 1.2, z - 0.2), v3(rx + 0.5, OY + 1.2, z + 0.2), v3(rx, OY + 1.2, z + 0.2)]);
        b.box(rx, OY + 1.2, z - 0.08, rx + 0.1, OY + 1.42, z + 0.08); // cantle
        b.box(rx + 0.42, OY + 1.2, z - 0.08, rx + 0.52, OY + 1.35, z + 0.08); // pommel
      });
      b.with({ kind: K.CLOTH, color: 0x8a3a2a }, () => b.box(rx + 0.04, OY + 0.72, z - 0.26, rx + 0.08, OY + 1.08, z + 0.26)); // saddle cloth
    }
    b.with({ kind: K.TIMBER, color: P.oak }, () => lathe(b, v3(x0 + 0.6, OY, zf - 0.5), 'y', [[0.15, 0], [0.18, 0.32]], 10));
  });
  // a haystack at the east end, and a ladder up it
  b.with(S('haystack'), () => {
    mound(b, x1 + 1.6, OY, zb + 1.3, 2.4, 2.3, 2.2, 7, 0xc8b070, K.STRAW);
    b.with({ kind: K.STRAW, color: 0xbfa968 }, () => {
      const r = rng(9);
      for (let i = 0; i < 12; i++) obox(b, x1 + 0.6 + r() * 2.2, OY + 0.02, zb + 2.6 + r() * 0.8, 0.4, 0.03, 0.08, r() * 3);
    });
    ladder(b, x1 + 0.7, OY, zb + 2.4, x1 + 1.0, OY + 2.0, zb + 1.8, 0.45);
  });
  b.with(S('stable'), () => {
    tub(b, x0 + 1.1, OY, zf + 1.3, 0.3, 0.42, { liquid: P.water });
    lantern(b, (x0 + x1) / 2, OY + 1.95, zf - 0.6, eave - 0.1);
  });
  STABLE.lamp = [(x0 + x1) / 2, OY + 1.95, zf - 0.6];
  // the lean-to roof of shingles: hidden when the stable is in view
  b.with({ group: G.stableRoof, label: lab('stable', 'stable'), kind: K.ROOF, color: 0x8a7a66, capKind: K.CUT_TIMBER }, () => {
    b.slab(v3(x0 - 0.3, top, zb), v3(x1 + 0.3, top, zb), v3(x1 + 0.3, eave - 0.2, zf + 0.6), v3(x0 - 0.3, eave - 0.2, zf + 0.6), 0.14);
  });
  void chest;
}
