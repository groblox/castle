import { IW, IC_OUT, OC_IN, OC_OUT, TOWERS, TOWER_R, GH, HALL, SERV, NR, WELL } from './layout.js';

// Aberwen on the minimap: the extent of the plan, the rooms you can click,
// and the walls drawn under them (see ui/minimap.js).

const r = NR.rooms;
export const PLAN = {
  bounds: { x0: -44, x1: 46, z0: -40, z1: 28 },
  cutZ: 0,
  rooms: [
    { id: 'hall', r: [HALL.x0, HALL.zCross1, HALL.x1, HALL.z1] },
    { id: 'buttery', r: [SERV.x0, SERV.z0, SERV.part0, SERV.z1] },
    { id: 'pantry', r: [SERV.part1, SERV.z0, SERV.x1, SERV.z1] },
    ...['larder', 'kitchen', 'bakehouse', 'brewhouse', 'granary'].map((id) => ({ id, r: [r[id].x0, NR.z0, r[id].x1, NR.z1] })),
    { id: 'gatehouse', r: [GH.x0, GH.z0, GH.x1, GH.z1] },
    { id: 'well', r: [WELL.x - 1.6, -1.6, WELL.x + 1.6, 1.6] },
    { id: 'kingTower', r: [TOWERS.nw.x - 4.2, TOWERS.nw.z - 4.2, TOWERS.nw.x + 4.2, TOWERS.nw.z + 2.6] },
    { id: 'garrison', r: [TOWERS.ne.x - 4.2, TOWERS.ne.z - 4.2, TOWERS.ne.x + 4.2, TOWERS.ne.z + 2.6] },
    { id: 'stable', r: [-18.4, OC_IN.z0, -5.4, -29.9] },
  ],
  // a click on open ground inside the walls
  areaAt(x, z) {
    return x > IW.x0 && x < IW.x1 && z > IW.z0 && z < IW.z1 ? 'ward' : null;
  },
  /** Walls, towers and gatehouse; m.rect(x0, z0, x1, z1) adds a rectangle path, m.px/m.pz map to pixels. */
  draw(g, m) {
    // outer and inner curtains (filled walls)
    g.fillStyle = 'rgba(160,140,115,0.55)';
    g.beginPath();
    m.rect(OC_OUT.x0, OC_OUT.z0, OC_OUT.x1, OC_OUT.z1);
    m.rect(OC_IN.x1, OC_IN.z0, OC_IN.x0, OC_IN.z1); // reverse winding for the hole
    g.fill('evenodd');
    g.stroke();
    g.beginPath();
    m.rect(IC_OUT.x0, IC_OUT.z0, IC_OUT.x1, IC_OUT.z1);
    m.rect(IW.x1, IW.z0, IW.x0, IW.z1);
    g.fill('evenodd');
    g.stroke();
    // towers and gatehouse
    g.fillStyle = 'rgba(150,130,108,0.75)';
    for (const t of Object.values(TOWERS)) {
      g.beginPath();
      g.arc(m.px(t.x), m.pz(t.z), TOWER_R * m.s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.beginPath();
    m.rect(GH.x0, GH.z0, GH.x1, GH.z1);
    g.fill();
    g.stroke();
  },
};
