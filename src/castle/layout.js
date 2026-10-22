// Dimensions in metres. Origin: centre of the inner ward at ward level.
// +x east, +y up, -z north. The cut is the plane z = 0; the southern half
// (z > 0) is removed and the viewer looks north into the section.
//
// Proportions follow Harlech (inner curtain c. 3.6 m / 12 ft thick, round
// corner towers, a great twin-towered gatehouse on the east side) and the
// concentric plan of Beaumaris; all figures are rounded, and the plan as a
// whole is an invention.

export const WARD_Y = 0; // inner ward level
export const OUTER_Y = -1.5; // outer ward level
export const BASE_Y = -32; // bottom of the section block

// inner ward clear interior
export const IW = { x0: -25, x1: 25, z0: -21, z1: 21 };
export const IC_T = 3.6; // inner curtain thickness
export const IC_H = 12; // wall-walk level
export const IC_OUT = { x0: IW.x0 - IC_T, x1: IW.x1 + IC_T, z0: IW.z0 - IC_T, z1: IW.z1 + IC_T };

export const OW_W = 9; // outer ward width
export const OC_T = 2.4; // outer curtain thickness
export const OC_H = 6.5; // above outer ward
export const OC_IN = { x0: IC_OUT.x0 - OW_W, x1: IC_OUT.x1 + OW_W, z0: IC_OUT.z0 - OW_W, z1: IC_OUT.z1 + OW_W };
export const OC_OUT = { x0: OC_IN.x0 - OC_T, x1: OC_IN.x1 + OC_T, z0: OC_IN.z0 - OC_T, z1: OC_IN.z1 + OC_T };

export const TOWER_R = 5.8;
export const TOWER_H = 18.5;
export const TOWERS = {
  nw: { x: -27.6, z: -23.6 },
  ne: { x: 27.6, z: -23.6 },
  sw: { x: -27.6, z: 23.6 },
  se: { x: 27.6, z: 23.6 },
};

// The two northern corner towers are cut open along the inner face of the
// north curtain (z = IW.z0) to show their floors: the king's lodging in the
// north-west tower, the garrison in the north-east one.
export const TOWER_IN = 4.2; // inner radius
export const TOWER_CUT = IW.z0;
export const TOWER_FLOORS = [0, 4.4, 8.6, 12.8]; // tops of the floors
export const TOWER_CEIL = 18.0; // underside of the roof
// stair turrets on the roofs (angle round the tower, radians), both on the kept side
export const TURRET_A = { nw: -Math.PI * 0.62, ne: -Math.PI * 0.38 };

// the farm outside the east gate, beyond the ditch
export const FARM = { x0: 53.5, x1: 71.5, z0: -39.5, z1: -14 };
// the archery butts in the field by the track
export const BUTTS = { shootX: 57.5, targetX: 69.5, z: -9.0 };

// gatehouse (east side, passage on the cut line)
export const GH = {
  x0: 19,
  x1: 31,
  z0: -9,
  z1: 9,
  passHalf: 1.6,
  towerR: 3.8,
  towerZ: 5.4,
  roofY: 17,
  floor1: 5.8,
  floor2: 11.6,
};

// west range: hall over undercroft, services at its north (lower) end
export const HALL = {
  x0: -25, // curtain face
  x1: -13, // inner face of east wall
  wallT: 1.2,
  zCross0: -10.2, // cross (screens) wall, north face
  zCross1: -9, // cross wall, south face
  z1: 18,
  floorY: 0.6,
  underY: -3.4, // undercroft floor
  eaveY: 8.5,
  ridgeY: 14,
};
export const SERV = {
  x0: -25,
  x1: -13,
  z0: -21,
  z1: -10.2,
  part0: -19.6,
  part1: -18.8,
  floor2: 4.6, // chamber floor
  eaveY: 9,
  ridgeY: 13.2,
};

// north range
export const NR = {
  z0: -21,
  z1: -12.5, // inner face of front wall
  zf: -11.5, // outer face of front wall
  stubY: 1.0, // front walls cut down to this height
  wallT: 0.8,
  rooms: {
    larder: { x0: -11.8, x1: -7.4, eave: 5.2, ridge: 9.0 },
    kitchen: { x0: -6.6, x1: 4.6, eave: 7.0, ridge: 12.0 },
    bakehouse: { x0: 5.4, x1: 11.4, eave: 5.6, ridge: 9.6 },
    brewhouse: { x0: 12.2, x1: 18.6, eave: 7.4, ridge: 11.2 },
    granary: { x0: 19.4, x1: 25, eave: 7.4, ridge: 11.2 },
  },
};

export const WELL = { x: -2, z: 0, r: 0.95, lining: 0.45, bottom: -27, water: -24 };

export const DITCH = { x0: 44, x1: 52, y: -7 };
