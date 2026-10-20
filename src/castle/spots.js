// Named anchor points shared by furnishings, effects, people and mechanisms.
// Coordinates in metres (see layout.js).

export const S = {
  kitchen: {
    floor: 0.08,
    roastFire: [-3.4, 0.12, -21.8],
    spit: { x0: -5.0, x1: -1.8, y: 0.86, z: -20.55, crankX: -1.42 },
    drip: [-3.4, 0.12, -20.5],
    boilFire: [2.2, 0.12, -21.65],
    cauldron: [2.2, 0.42, -21.1, 0.46],
    potBarY: 2.7,
    dresser: { x0: -3.2, x1: 1.8, z0: -16.6, z1: -15.6 },
    block: [3.4, -15.2],
    mortar: [-5.3, -14.4],
    trough: { x0: -6.5, x1: -5.6, z0: -19.9, z1: -16.7 },
    doorW: [-5.1, -12.0],
    doorE: [3.4, -12.0],
    spitSeat: [-0.95, -19.95],
  },
  larder: { floor: 0.08, beamY: 3.15, door: [-9.8, -12.0] },
  bakehouse: {
    floor: 0.08,
    oven: { x: 7.3, y: 0.95, z: -19.0, rIn: 1.3, rOut: 1.75, rise: 0.6, cutZ: -18.72 },
    mouthX: 8.5,
    bakerAt: [9.75, -18.85],
    door: [10.0, -12.0],
  },
  brewhouse: {
    floor: 0.08,
    lead: [13.4, 1.05, -19.95, 0.78],
    furnaceFire: [13.4, 0.22, -19.0],
    mashTun: [16.4, 0.5, -19.6, 0.95],
    door: [13.4, -12.0],
  },
  granary: { floor: 0.08, door: [20.7, -12.0], cartAt: [15.6, -8.6] },
  buttery: {
    floor: 0.6,
    tapCask: { x: -24.25, y: 1.18, z: -14.25, r: 0.36, len: 0.8 },
    door: [-22.4, -9.6],
  },
  pantry: { floor: 0.6, door: [-16.0, -9.6] },
  undercroft: { floor: -3.4, hoistCask: [-17.4, -3.4, -2.6] },
  hall: {
    floor: 0.6,
    fire: [-24.55, 0.66, -4.6],
    trap: { x0: -18.2, x1: -16.6, z0: -3.4, z1: -1.8 },
    door: [-11.2, -8.2],
  },
  well: { x: -2, z: 0, axleY: 1.62, axleZ: -0.5, x0: -3.45, x1: -0.55, troughAt: [0.6, -1.3] },
  chimneys: {
    kitchenA: [-3.4, 16.6, -22.5],
    kitchenB: [2.2, 16.6, -22.5],
    louvre: [-1.6, 13.6, -16.7],
    bakehouse: [9.25, 15.6, -21.7],
    brewhouse: [15.25, 15.6, -21.7],
    hall: [-26.6, 15.8, -4.6],
  },
};
