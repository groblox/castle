import { KEEP, KEEP_IN, SPECULA } from './layout.js';

// Fires and smoke at Las Aguzaderas. Light slots in the shared material:
export const LIGHT = { hearth: 0, brazier: 1, lantern: 2, signal: 3 };
export const HEARTH = [-6.5, 0.1, -24.5];
export const SIGNAL = [SPECULA.x, KEEP.terrace + SPECULA.h + 0.35, SPECULA.z];

export function setupEffects(fx) {
  const [hx, hy, hz] = HEARTH;
  fx.flames('hearth', [[hx - 0.15, hy, hz], [hx + 0.15, hy, hz + 0.1], [hx, hy, hz - 0.15]], { count: 5, size: 0.36, rise: 0.45 });
  fx.smoke('hearthSmoke', [[hx, 1.2, hz]], { count: 10, rise: 7, alpha: 0.22 });
  fx.light(LIGHT.hearth, [hx, 0.9, hz], 1.1);
  fx.glow('hearthGlow', [[hx, 0.5, hz]], { size: 3.0, alpha: 0.3 });

  // the brazier in the upper chamber of the keep, and a lantern below
  const by = KEEP.floor2 + 0.7;
  fx.flames('brazier', [[-0.2, by, -1.0]], { count: 4, size: 0.2, rise: 0.22 });
  fx.light(LIGHT.brazier, [-0.2, by + 0.4, -1.0], 0.75);
  fx.glow('brazierGlow', [[-0.2, by + 0.1, -1.0]], { size: 1.8, alpha: 0.3 });
  const lp = [KEEP_IN.x0 + 0.4, KEEP.floor1 + 2.3, -2.6];
  fx.light(LIGHT.lantern, lp, 0.45, 0xffb868);
  fx.glow('lantern', [lp], { size: 1.3, alpha: 0.3, color: 0xffb060 });

  // the signal on the turret: off until it is lit (see mech/signal.js)
  fx.smoke('signalSmoke', [SIGNAL], { count: 26, rise: 18, alpha: 0.6, on: 0 });
  fx.flames('signalFire', [SIGNAL, [SIGNAL[0] + 0.25, SIGNAL[1], SIGNAL[2] + 0.1]], { count: 6, size: 0.55, rise: 0.8, on: 0 });
  fx.light(LIGHT.signal, [SIGNAL[0], SIGNAL[1] + 0.5, SIGNAL[2]], 1.6);
  fx.setLight(LIGHT.signal, 0);
}
