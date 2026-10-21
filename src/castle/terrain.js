import { NORTH_FALL } from './shell.js';
import { OUTER_Y, WARD_Y, DITCH, IW, IC_T } from './layout.js';

// Height of the ground surface at (x, z), matching the terrain solids in
// shell.js. Used to sit boulders, bushes, sheep and walkers on the ground.

function triHeight(tri, x, z) {
  const [[x1, y1, z1], [x2, y2, z2], [x3, y3, z3]] = tri;
  const d = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3);
  const a = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / d;
  const b = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / d;
  const c = 1 - a - b;
  if (a < -1e-6 || b < -1e-6 || c < -1e-6) return null;
  return a * y1 + b * y2 + c * y3;
}

export function groundY(x, z) {
  if (z < -40) {
    for (const tri of NORTH_FALL) {
      const h = triHeight(tri, x, z);
      if (h !== null) return h;
    }
    return -12;
  }
  if (x < -40) return -14 + ((x + 62) / 22) * (OUTER_Y + 14);
  if (x >= DITCH.x0 && x <= DITCH.x1) return DITCH.y;
  if (x > DITCH.x1) return -2.2 + ((x - DITCH.x1) / (72 - DITCH.x1)) * -1.8;
  if (x > IW.x0 - IC_T && x < IW.x1 + IC_T && z > IW.z0 - IC_T) return WARD_Y;
  return OUTER_Y;
}
