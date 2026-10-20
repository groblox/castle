import { HALL, SERV, NR, GH, WELL, IW, IC_OUT, OC_IN, OUTER_Y } from './layout.js';

// Camera boxes keep the eye out of walls when flying into a room.
const IN_HALL = [[HALL.x0 + 0.6, HALL.floorY + 0.5, HALL.zCross1 + 0.6], [HALL.x1 - 0.6, 12, 60]];
const IN_WARD = [[NR.rooms.larder.x0 + 0.4, 0.6, NR.zf + 0.5], [GH.x0 - 0.6, 60, 80]];

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
  screens: 19,
  ghTurret: 20,
  hallRoof: 21,
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
    camBox: IN_WARD,
  },
  {
    id: 'bakehouse',
    name: 'Bakehouse',
    group: G.bakehouse,
    service: true,
    box: [[r.bakehouse.x0, 0, NR.z0], [r.bakehouse.x1, 5.5, NR.zf]],
    view: { az: -8, el: 20, fit: 1.0 },
    camBox: IN_WARD,
  },
  {
    id: 'brewhouse',
    name: 'Brewhouse',
    group: G.brewhouse,
    service: true,
    box: [[r.brewhouse.x0, 0, NR.z0], [r.brewhouse.x1, 6.5, NR.zf]],
    view: { az: -12, el: 18, fit: 1.0 },
    hide: [G.ghTurret],
    camBox: IN_WARD,
  },
  {
    id: 'granary',
    name: 'Store-house & granary',
    group: G.granary,
    service: true,
    box: [[r.granary.x0 - 4, 0, NR.z0], [r.granary.x1, 6, -8]],
    view: { az: -16, el: 22, fit: 1.0 },
    hide: [G.ghTurret, G.gatehouse],
    camBox: IN_WARD,
  },
  {
    id: 'larder',
    name: 'Larder',
    group: G.larder,
    service: true,
    box: [[r.larder.x0, 0, NR.z0], [r.larder.x1, 4.2, NR.zf]],
    view: { az: 6, el: 18, fit: 1.05 },
    camBox: IN_WARD,
  },
  {
    id: 'pantry',
    name: 'Pantry',
    group: G.pantry,
    service: true,
    box: [[SERV.part1, HALL.floorY, SERV.z0], [SERV.x1, 4.6, SERV.z1]],
    view: { az: -10, el: 7, fit: 1.0 },
    hide: [G.screens],
    camBox: IN_HALL,
  },
  {
    id: 'buttery',
    name: 'Buttery',
    group: G.buttery,
    service: true,
    box: [[SERV.x0, HALL.floorY, SERV.z0], [SERV.part0, 4.6, SERV.z1]],
    view: { az: 4, el: 12, fit: 1.0 },
    hide: [G.screens],
    camBox: IN_HALL,
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
    view: { az: 0, el: 10, fit: 1.0 },
    hide: [G.screens, G.hallRoof],
    camBox: [[HALL.x0 + 0.6, SERV.floor2 + 0.8, HALL.zCross1 + 0.6], [HALL.x1 - 0.6, 12, 60]],
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
    box: [[OC_IN.x0 - 3, OUTER_Y - 2, -14], [IC_OUT.x0 + 3, 14, 0]],
    view: { az: 18, el: 16, fit: 1.0 },
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((rm) => [rm.id, rm]));
export const ROOM_BY_GROUP = Object.fromEntries(ROOMS.map((rm) => [rm.group, rm]));
