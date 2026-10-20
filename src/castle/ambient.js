import { S } from './spots.js';

// Fires, smoke and steam. Light slots in the shared material:
// 0 roasting fire, 1 boiling fire, 2 hall fire, 3 brewhouse furnace, 4 bread oven.
export const LIGHT = { roast: 0, boil: 1, hall: 2, brew: 3, oven: 4 };

export function setupEffects(fx) {
  const k = S.kitchen;
  const [rx, , rz] = k.roastFire;
  const roast = [];
  for (let i = 0; i < 7; i++) roast.push([rx - 1.1 + i * 0.37, 0.3, rz + 0.05 + (i % 2) * 0.12]);
  fx.flames('roastFire', roast, { count: 5, size: 0.5, rise: 0.7 });
  fx.light(LIGHT.roast, [rx, 0.8, rz + 0.8], 1.6);

  const [bx, , bz] = k.boilFire;
  const boil = [];
  for (let i = 0; i < 5; i++) boil.push([bx - 0.7 + i * 0.35, 0.28, bz + (i % 2) * 0.1]);
  fx.flames('boilFire', boil, { count: 5, size: 0.42, rise: 0.5 });
  fx.light(LIGHT.boil, [bx, 0.7, bz + 0.8], 1.3);
  const [cx, cy, cz, cr] = k.cauldron;
  fx.steam('cauldron', [[cx, cy + cr, cz]], { count: 12 });

  const [hx, hy, hz] = S.hall.fire;
  fx.flames('hallFire', [[hx, hy + 0.1, hz - 0.3], [hx + 0.05, hy + 0.1, hz + 0.1], [hx, hy + 0.1, hz + 0.45]], { count: 5, size: 0.38, rise: 0.45 });
  fx.light(LIGHT.hall, [hx + 0.6, hy + 0.6, hz], 1.2);

  const [fx0, fy0, fz0] = S.brewhouse.furnaceFire;
  fx.flames('brewFire', [[fx0 - 0.15, fy0 + 0.05, fz0 - 0.05], [fx0 + 0.15, fy0 + 0.05, fz0 - 0.05]], { count: 4, size: 0.3, rise: 0.3 });
  fx.light(LIGHT.brew, [fx0, 0.5, fz0 + 0.6], 0.9);
  const [lx, ly, lz] = S.brewhouse.lead;
  fx.steam('lead', [[lx, ly + 0.2, lz]], { count: 14, rise: 1.9 });
  const [mx, my, mz] = S.brewhouse.mashTun;
  fx.steam('mash', [[mx, my + 0.95, mz]], { count: 8, rise: 1.2, alpha: 0.25 });
  fx.steam('coolers', [[13.4, 0.8, -14.45], [14.6, 0.8, -14.45]], { count: 5, rise: 0.9, alpha: 0.18, size1: 0.6 });

  const c = S.chimneys;
  fx.smoke('chimneys', [c.kitchenA, c.kitchenB, c.bakehouse, c.brewhouse, c.hall], { count: 16 });
  fx.smoke('louvre', [c.louvre], { count: 14, alpha: 0.28, size0: 0.8 });
  // a thin haze of smoke under the kitchen roof, drifting to the louvre
  fx.add('kitchenHaze', [[rx, 2.4, rz + 0.9], [bx, 2.4, bz + 0.9]], 8, {
    kind: 'smoke', life: 6, rise: 5.5, spread: 1.6, size0: 0.6, size1: 2.4, wind: [0.4, 1.2], wobble: 0.3,
    color: 0x8f8a84, color2: 0xa9a49c, alpha: 0.14, order: 3,
  });
}
