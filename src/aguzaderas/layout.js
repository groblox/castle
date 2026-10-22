// Castillo de las Aguzaderas: dimensions in metres.
// +x east, +y up, -z north, as for Aberwen. The real enclosure is turned
// about 19 degrees clockwise from north; the model is squared up to the axes
// and the minimap's north arrow shows the true bearing.
//
// The cut is the plane z = 0, along the middle of the south curtain: it
// slices the keep and the two southern corner towers through their middles,
// and the half of the south curtain left standing is cut down so the
// courtyard can be seen.
//
// Plan sizes are measured from OpenStreetMap and the PNOA orthophoto (see
// docs/research/aguzaderas.md): no measured plan has been published online.
// No heights or wall thicknesses are published at all; the figures marked
// "estimate" are read from photographs and are conjecture.

export const GROUND = 0; // courtyard and the ground round the walls

// curtain walls
export const T = 1.8; // thickness (estimate: wall-walk and parapet 1.5-2 m on the imagery)
export const WALK = 6.5; // wall-walk level (estimate from photographs)
export const PARA = { t: 0.55, base: 1.0, mh: 1.0, mw: 0.8, gw: 0.5 }; // parapet and square-topped merlons
export const IN = { x0: -16, x1: 16, z0: -32.9, z1: -0.9 }; // courtyard, c. 32 x 32 m
export const OUT = { x0: IN.x0 - T, x1: IN.x1 + T, z0: IN.z0 - T, z1: IN.z1 + T };
export const MID = { x0: IN.x0 - T / 2, x1: IN.x1 + T / 2, zN: IN.z0 - T / 2, zS: 0 }; // wall centre lines
export const CUT_DOWN = 1.1; // height the south curtain is cut down to

// square corner towers, c. 5 m, at three corners (the fourth has the
// albarrana tower instead): solid up to the wall-walk, then one chamber under
// a pointed barrel vault, then a crenellated terrace
export const CT = { size: 5.2, wall: 1.0, terrace: WALK + 4.0 };
export const CORNERS = {
  nw: { x: OUT.x0, z: OUT.z0 },
  sw: { x: OUT.x0, z: OUT.z1 },
  se: { x: OUT.x1, z: OUT.z1 },
};

// semicircular towers (cubos) half-way along the east and west curtains,
// c. 4 m across and 3-4 m deep
export const CUBO = { r: 2.0, depth: 3.4, z: (IN.z0 + IN.z1) / 2 };

// the keep (torre del homenaje): c. 11 m square, half in and half out of the
// middle of the south curtain, on a rubble podium about 1 m high. Two storeys
// under sail vaults and a terrace. Wall thicknesses and the stair in the east
// wall follow the Torre Lopera, the closest published analogue.
export const KEEP = {
  x0: -5.5, x1: 5.5, z0: -5.5, z1: 5.5,
  wall: 2.3,
  stairWall: 3.2, // east wall, carrying the stairs
  podium: 1.0,
  floor1: 1.0, // ground-floor chamber (top of the podium)
  spring1: 3.4, crown1: 5.2,
  floor2: 6.2,
  spring2: 8.4, crown2: 10.2,
  terrace: 11.2,
  door: { x0: -1.8, x1: -0.6 }, // in the north face, towards the courtyard (position: conjecture)
};
export const KEEP_IN = { x0: KEEP.x0 + KEEP.wall, x1: KEEP.x1 - KEEP.stairWall, z0: KEEP.z0 + KEEP.wall, z1: KEEP.z1 - KEEP.wall };
// the signal turret (specula) on the terrace, c. 3 m tall
export const SPECULA = { x: 3.7, z: -3.5, r: 1.05, h: 3.0 };

// the gate: a pointed arch in the west curtain with a machicolation over it
// (one source; another puts the entrance in the north wall)
export const GATE = { z0: -26.6, z1: -24.0, h: 4.2 };

// the former albarrana tower at the north-east, standing out from the
// corner and joined to the curtain by a pointed arch; it enclosed a well.
// Later (early 15th century?) a low walled enclosure was built round it,
// with rounded corners and no merlons, c. 13 x 10 m.
export const ALB = { x0: 11.4, x1: 16.9, z0: -42.6, z1: -37.2, wall: 1.1, terrace: WALK + 5.0 };
export const ALB_CX = (ALB.x0 + ALB.x1) / 2; // the tower is cut open along this line (x = ALB_CX)
export const BRIDGE = { x0: 12.6, x1: 15.7, z0: ALB.z1, z1: OUT.z0, rise: 1.5, apex: 3.9 };
export const ANNEX = { x0: 3.9, x1: ALB.x1, z0: -44.8, z1: OUT.z0, t: 1.1, h: 4.4, r: 1.6 };
export const WELL = { x: ALB_CX - 0.4, z: (ALB.z0 + ALB.z1) / 2, r: 0.55, depth: 9 };

// a spring and stone trough down the slope west of the castle, where the
// herds were watered (position: conjecture)
export const SPRING = { x: -31, z: -21 };

// the ground: a shallow valley draining west; higher to the north, east and
// south-east (from a terrain model, see the research notes)
export const TERRAIN = { x0: -96, x1: 96, z0: -118, z1: 6, base: -9, rockTop: -2.6 };
