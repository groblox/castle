import { TERRAIN } from './layout.js';

// Height of the ground at (x, z). The castle sits in a shallow valley (a
// vaguada) that drains west: the ground rises gently to the north, east and
// south-east and falls away a little to the west, where the spring is.
// Matches the terrain prisms in build.js; used to sit trees, beasts and
// walkers on the ground.

// zero below 0, then easing into a straight rise of `k` per metre
function ramp(t, k, ease = 10) {
  if (t <= 0) return 0;
  return k * (t < ease ? (t * t) / (2 * ease) : t - ease / 2);
}

export function groundY(x, z) {
  let y = 0;
  y += ramp(-48 - z, 0.05); // north
  y += ramp(x - 32, 0.045); // east
  y -= Math.min(1.4, ramp(-26 - x, 0.035)); // falling west
  return Math.max(y, TERRAIN.rockTop + 0.4);
}
