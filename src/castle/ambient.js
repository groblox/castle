import { S } from './spots.js';

// Fires, smoke and steam. Light slots in the shared material:
// 0 roasting fire, 1 boiling fire, 2 hall fire, 3 brewhouse furnace, 4 bread oven.
export const LIGHT = { roast: 0, boil: 1, hall: 2, brew: 3, oven: 4, forge: 5, guard: 6, lodging: 7 };
const CANDLE = 0xffb868;

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

  // the smithy forge, and fires in the two gatehouse chambers
  const [gx, gy, gz] = S.forge;
  fx.flames('forge', [[gx - 0.1, gy, gz - 0.1], [gx + 0.1, gy, gz + 0.12]], { count: 4, size: 0.28, rise: 0.35 });
  fx.light(LIGHT.forge, [gx + 0.8, gy + 0.6, gz], 1.0);
  fx.smoke('forgeSmoke', [[gx - 0.6, gy + 2.3, gz]], { count: 10, alpha: 0.25, size0: 0.4 });
  for (const [name, slot, y] of [['guardFire', LIGHT.guard, S.ghFires[0]], ['lodgingFire', LIGHT.lodging, S.ghFires[1]]]) {
    fx.flames(name, [[24.7, y + 0.1, -7.5], [25.0, y + 0.1, -7.45], [25.3, y + 0.1, -7.55]], { count: 4, size: 0.34, rise: 0.4 });
    fx.light(slot, [25.0, y + 0.7, -6.8], 1.0);
  }

  // halos round the hearths and the forge
  fx.glow('roastGlow', [[rx, 0.9, rz + 0.5]], { size: 5.0, alpha: 0.32 });
  fx.glow('boilGlow', [[bx, 0.8, bz + 0.5]], { size: 4.0, alpha: 0.28 });
  fx.glow('hallGlow', [[hx + 0.5, hy + 0.6, hz]], { size: 3.6, alpha: 0.3 });
  fx.glow('brewGlow', [[fx0, 0.4, fz0 + 0.3]], { size: 2.2, alpha: 0.28 });
  fx.glow('forgeGlow', [[gx, gy + 0.3, gz]], { size: 2.6, alpha: 0.32 });
  for (const y of S.ghFires) fx.glow(`ghGlow${y}`, [[25.0, y + 0.6, -7.2]], { size: 3.2, alpha: 0.3 });

  // candles, lanterns and the brazier: [slot, position, strength, halo size]
  const small = [
    [8, [-19.0, 5.3, -6.2], 0.55, 2.4],
    [9, [-23.4, 1.85, -2.3], 0.35, 1.2],
    [10, [-14.8, 1.85, -2.3], 0.35, 1.2],
    [11, [-22.1, 6.5, -17.9], 0.5, 1.2],
    [12, [-21.1, -1.2, -3.6], 0.6, 1.6],
    [13, [22.4, 6.9, -5.95], 0.25, 0.9],
    [14, [21.2, 12.7, -3.3], 0.25, 0.9],
    [18, [-8.2, 2.3, -16.8], 0.45, 1.5],
    [19, [-15.6, 3.0, -16.5], 0.45, 1.5],
    [20, [-21.5, 3.0, -16.0], 0.45, 1.5],
    [21, [21.5, 2.3, -15.3], 0.45, 1.5],
  ];
  for (const [slot, p, base, size] of small) {
    fx.light(slot, p, base, CANDLE);
    fx.glow(`candle${slot}`, [p], { size, alpha: 0.3, color: 0xffb060 });
  }
  // hall candle-beam and table candles: small flames
  const tips = [[-18.25, 5.32, -6.2], [-19.75, 5.32, -6.2], [-19.0, 5.32, -5.45], [-19.0, 5.32, -6.95]];
  for (const x of [-23.4, -14.8]) for (const z of [-3.7, -0.9]) tips.push([x, 1.84, z]);
  tips.push([-22.1, 6.46, -17.9], [22.4, 6.86, -5.95], [21.2, 12.68, -3.3]);
  fx.flames('candles', tips, { count: 2, size: 0.07, rise: 0.06 });

  // a brazier on the wall-walk for the watch
  fx.flames('brazier', [[6.6, 12.78, -21.3], [6.5, 12.78, -21.2]], { count: 4, size: 0.3, rise: 0.35 });
  fx.light(15, [6.6, 13.0, -21.3], 0.7);
  fx.glow('brazierGlow', [[6.6, 13.0, -21.3]], { size: 2.4, alpha: 0.3 });

  // cressets at the inner gate arch and outside the outer gate, lit towards dusk
  for (const [slot, p] of [[16, [20.5, 2.65, -1.35]], [17, [40.35, 1.75, -2.6]]]) {
    fx.flames(`cresset${slot}`, [p], { count: 5, size: 0.35, rise: 0.45 });
    fx.light(slot, p, 0.8, 0xffa040, { dusk: true });
    fx.glow(`cressetGlow${slot}`, [p], { size: 3.0, alpha: 0.35, dusk: true });
  }
  fx.duskFlames(['cresset16', 'cresset17']);

  // firelight showing at the hall and gatehouse windows
  for (const z of [-5.6, -2.2]) fx.glow(`hallWin${z}`, [[-12.4, 4.6, z]], { size: 3.0, alpha: 0.14, color: 0xffa860 });
  for (const y of [8.8, 14.4]) for (const z of [-6.3, -3.3]) fx.glow(`ghWin${y}${z}`, [[19.6, y, z]], { size: 2.6, alpha: 0.12, color: 0xffa860 });

  const c = S.chimneys;
  fx.smoke('chimneys', [c.kitchenA, c.kitchenB, c.bakehouse, c.brewhouse, c.hall], { count: 16 });
  fx.smoke('louvre', [c.louvre], { count: 14, alpha: 0.28, size0: 0.8 });
  // a thin haze of smoke under the kitchen roof, drifting to the louvre
  fx.add('kitchenHaze', [[rx, 2.4, rz + 0.9], [bx, 2.4, bz + 0.9]], 8, {
    kind: 'smoke', life: 6, rise: 5.5, spread: 1.6, size0: 0.6, size1: 2.4, wind: [0.4, 1.2], wobble: 0.3,
    color: 0x8f8a84, color2: 0xa9a49c, alpha: 0.14, order: 3,
  });
}
