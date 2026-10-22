import { IN, OUT, WALK, KEEP, CT, CORNERS, GATE, ALB, ALB_CX, ANNEX, SPRING } from './layout.js';

// Fade groups for the Aguzaderas scene (GROUP_COUNT is shared with Aberwen).
export const G = {
  terrain: 0,
  curtain: 1,
  keep: 2,
  towerSW: 3,
  towerSE: 4,
  towerNW: 5,
  cubos: 6,
  gate: 7,
  albarrana: 8,
  annex: 9,
  court: 10,
  wallStair: 11,
  spring: 12,
  land: 13,
  people: 18,
};

const sw = CORNERS.sw;

// Places the camera can fly to. box: [min, max]; view: azimuth/elevation
// in degrees (az 0 looks north from the south; az 90 puts the camera east).
export const ROOMS = [
  {
    id: 'keep',
    name: 'Keep (torre del homenaje)',
    group: G.keep,
    box: [[KEEP.x0, 0, KEEP.z0], [KEEP.x1, KEEP.terrace + 1, 0]],
    view: { az: 4, el: 10, fit: 1.0 },
  },
  {
    id: 'keepTerrace',
    name: 'Keep terrace & signal turret',
    group: G.keep,
    box: [[KEEP.x0, KEEP.terrace - 1, KEEP.z0], [KEEP.x1, KEEP.terrace + 4, 0]],
    view: { az: -18, el: 32, fit: 1.0 },
  },
  {
    id: 'cornerTower',
    name: 'Corner tower (south-west)',
    group: G.towerSW,
    box: [[sw.x - CT.size / 2, WALK - 1, sw.z - CT.size / 2], [sw.x + CT.size / 2, CT.terrace + 2.2, 0]],
    view: { az: 6, el: 8, fit: 0.9 },
  },
  {
    id: 'gate',
    name: 'Gate',
    group: G.gate,
    box: [[OUT.x0 - 3, 0, GATE.z0 - 2.5], [IN.x0 + 1, WALK + 2.5, GATE.z1 + 2.5]],
    view: { az: -72, el: 14, fit: 1.1 },
  },
  {
    id: 'albarrana',
    name: 'Albarrana tower & well',
    group: G.albarrana,
    box: [[ALB.x0, 0, ALB.z0], [ALB_CX, ALB.terrace + 2, ALB.z1]],
    view: { az: 96, el: 10, fit: 0.95 },
  },
  {
    id: 'annex',
    name: 'Walled enclosure',
    group: G.annex,
    box: [[ANNEX.x0, 0, ANNEX.z0], [ANNEX.x1, ANNEX.h, ANNEX.z1]],
    view: { az: 150, el: 48, fit: 1.5 },
  },
  {
    id: 'court',
    name: 'Courtyard (patio de armas)',
    group: G.court,
    box: [[IN.x0, 0, IN.z0], [IN.x1, 4, IN.z1]],
    view: { az: 0, el: 34, fit: 0.9 },
  },
  {
    id: 'wallWalk',
    name: 'Wall-walk & stair',
    group: G.wallStair,
    box: [[IN.x0 - 2, 0, OUT.z0], [2, WALK + 2.4, IN.z0 + 2]],
    view: { az: 32, el: 22, fit: 1.0 }, // from the south-east, past the keep
  },
  {
    id: 'spring',
    name: 'Spring & trough',
    group: G.spring,
    box: [[SPRING.x - 6, -1, SPRING.z - 6], [SPRING.x + 6, 2.5, SPRING.z + 6]],
    view: { az: -40, el: 26, fit: 1.0 },
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((rm) => [rm.id, rm]));
