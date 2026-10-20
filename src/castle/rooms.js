import { HALL, SERV, NR, GH, WELL, IW, IC_OUT, OC_IN, OUTER_Y } from './layout.js';

// Fade groups. Every vertex carries one; focusing a room fades the others.
export const G = {
  terrain: 0,
  outer: 1,
  inner: 2,
  gatehouse: 3,
  ward: 4,
  well: 5,
  hall: 6,
  undercroft: 7,
  buttery: 8,
  pantry: 9,
  larder: 10,
  kitchen: 11,
  bakehouse: 12,
  brewhouse: 13,
  granary: 14,
  towers: 15,
  outerWard: 16,
  chamber: 17,
  people: 18,
};
export const GROUP_COUNT = 24;

const r = NR.rooms;

// Rooms and features the camera can fly to. box: [min, max];
// view: preferred azimuth/elevation (degrees) and framing factor.
export const ROOMS = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    group: G.kitchen,
    service: true,
    box: [[r.kitchen.x0, 0, NR.z0], [r.kitchen.x1, 7, NR.zf]],
    view: { az: 0, el: 22, fit: 1.0 },
  },
  {
    id: 'bakehouse',
    name: 'Bakehouse',
    group: G.bakehouse,
    service: true,
    box: [[r.bakehouse.x0, 0, NR.z0], [r.bakehouse.x1, 5.5, NR.zf]],
    view: { az: -8, el: 20, fit: 1.0 },
  },
  {
    id: 'brewhouse',
    name: 'Brewhouse',
    group: G.brewhouse,
    service: true,
    box: [[r.brewhouse.x0, 0, NR.z0], [r.brewhouse.x1, 8, NR.zf]],
    view: { az: -10, el: 18, fit: 1.0 },
  },
  {
    id: 'granary',
    name: 'Store-house & granary',
    group: G.granary,
    service: true,
    box: [[r.granary.x0 - 6, 0, NR.z0], [r.granary.x1, 7, -6]],
    view: { az: -18, el: 20, fit: 1.0 },
  },
  {
    id: 'larder',
    name: 'Larder',
    group: G.larder,
    service: true,
    box: [[r.larder.x0, 0, NR.z0], [r.larder.x1, 5, NR.zf]],
    view: { az: 6, el: 18, fit: 1.05 },
  },
  {
    id: 'pantry',
    name: 'Pantry',
    group: G.pantry,
    service: true,
    box: [[SERV.part1, HALL.floorY, SERV.z0], [SERV.x1, 4.6, SERV.z1]],
    view: { az: 4, el: 12, fit: 1.0 },
  },
  {
    id: 'buttery',
    name: 'Buttery',
    group: G.buttery,
    service: true,
    box: [[SERV.x0, HALL.floorY, SERV.z0], [SERV.part0, 4.6, SERV.z1]],
    view: { az: 10, el: 12, fit: 1.0 },
  },
  {
    id: 'undercroft',
    name: 'Undercroft (cellar)',
    group: G.undercroft,
    service: true,
    box: [[HALL.x0, HALL.underY, HALL.zCross1], [HALL.x1, HALL.floorY, 0]],
    view: { az: 4, el: 8, fit: 1.0 },
  },
  {
    id: 'well',
    name: 'Well',
    group: G.well,
    service: true,
    box: [[WELL.x - 3, WELL.bottom, -2], [WELL.x + 3, 4.5, 0]],
    view: { az: 0, el: 4, targetY: -11.5, dist: 64, margin: 2.5 },
  },
  {
    id: 'hall',
    name: 'Great hall',
    group: G.hall,
    box: [[HALL.x0, HALL.floorY, HALL.zCross1], [HALL.x1, HALL.ridgeY, 0]],
    view: { az: 4, el: 10, fit: 1.0 },
  },
  {
    id: 'chamber',
    name: 'Chamber over the services',
    group: G.chamber,
    box: [[SERV.x0, SERV.floor2, SERV.z0], [SERV.x1, SERV.eaveY, SERV.z1]],
    view: { az: 6, el: 12, fit: 1.0 },
  },
  {
    id: 'gatehouse',
    name: 'Gatehouse',
    group: G.gatehouse,
    box: [[GH.x0, 0, GH.z0], [GH.x1 + GH.towerR, GH.roofY + 2, 0]],
    view: { az: 0, el: 8, fit: 1.0 },
  },
  {
    id: 'ward',
    name: 'Inner ward',
    group: G.ward,
    box: [[IW.x0, 0, IW.z0], [IW.x1, 6, 0]],
    view: { az: 0, el: 34, fit: 0.9 },
  },
  {
    id: 'outerWard',
    name: 'Outer ward & curtain',
    group: G.outerWard,
    box: [[IC_OUT.x1, OUTER_Y, OC_IN.z0], [OC_IN.x1 + 3, 8, 0]],
    view: { az: -25, el: 24, fit: 1.0 },
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((rm) => [rm.id, rm]));
export const ROOM_BY_GROUP = Object.fromEntries(ROOMS.map((rm) => [rm.group, rm]));
