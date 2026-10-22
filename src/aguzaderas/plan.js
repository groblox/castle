import { IN, OUT, CT, CORNERS, CUBO, KEEP, GATE, ALB, BRIDGE, ANNEX, SPRING } from './layout.js';

// Las Aguzaderas on the minimap (see ui/minimap.js). The real plan is turned
// about 19 degrees clockwise from north; the arrow shows true north.

export const PLAN = {
  bounds: { x0: -40, x1: 30, z0: -50, z1: 8 },
  cutZ: 0,
  north: 19,
  rooms: [
    { id: 'keep', r: [KEEP.x0, KEEP.z0, KEEP.x1, KEEP.z1] },
    { id: 'cornerTower', r: [CORNERS.sw.x - CT.size / 2, CORNERS.sw.z - CT.size / 2, CORNERS.sw.x + CT.size / 2, CORNERS.sw.z + CT.size / 2] },
    { id: 'gate', r: [OUT.x0 - 1, GATE.z0 - 0.8, IN.x0, GATE.z1 + 0.8] },
    { id: 'albarrana', r: [ALB.x0, ALB.z0, ALB.x1, ALB.z1] },
    { id: 'annex', r: [ANNEX.x0, ANNEX.z0, ALB.x0, ANNEX.z1] },
    { id: 'wallWalk', r: [-14.6, IN.z0, -4.0, IN.z0 + 1.3] },
    { id: 'spring', r: [SPRING.x - 2, SPRING.z - 1.6, SPRING.x + 3.4, SPRING.z + 2] },
  ],
  areaAt(x, z) {
    return x > IN.x0 && x < IN.x1 && z > IN.z0 && z < IN.z1 ? 'court' : null;
  },
  draw(g, m) {
    g.fillStyle = 'rgba(160,140,115,0.55)';
    // curtains, as a ring
    g.beginPath();
    m.rect(OUT.x0, OUT.z0, OUT.x1, OUT.z1);
    m.rect(IN.x1, IN.z0, IN.x0, IN.z1);
    g.fill('evenodd');
    g.stroke();
    // towers, keep, the albarrana and its arch
    g.fillStyle = 'rgba(150,130,108,0.75)';
    for (const c of Object.values(CORNERS)) {
      g.beginPath();
      m.rect(c.x - CT.size / 2, c.z - CT.size / 2, c.x + CT.size / 2, c.z + CT.size / 2);
      g.fill();
      g.stroke();
    }
    for (const [fx, dir] of [[OUT.x0, -1], [OUT.x1, 1]]) {
      const cx = fx + dir * (CUBO.depth - CUBO.r);
      g.beginPath();
      g.arc(m.px(cx), m.pz(CUBO.z), CUBO.r * m.s, dir < 0 ? Math.PI / 2 : -Math.PI / 2, dir < 0 ? Math.PI * 1.5 : Math.PI / 2);
      g.lineTo(m.px(fx), m.pz(CUBO.z - CUBO.r * dir));
      g.lineTo(m.px(fx), m.pz(CUBO.z + CUBO.r * dir));
      g.closePath();
      g.fill();
      g.stroke();
    }
    for (const r of [[KEEP.x0, KEEP.z0, KEEP.x1, KEEP.z1], [ALB.x0, ALB.z0, ALB.x1, ALB.z1], [BRIDGE.x0, BRIDGE.z0, BRIDGE.x1, BRIDGE.z1]]) {
      g.beginPath();
      m.rect(...r);
      g.fill();
      g.stroke();
    }
    // the low enclosure round the albarrana
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(m.px(ANNEX.x0 + ANNEX.t / 2), m.pz(ANNEX.z1));
    g.lineTo(m.px(ANNEX.x0 + ANNEX.t / 2), m.pz(ANNEX.z0 + ANNEX.r));
    g.arcTo(m.px(ANNEX.x0 + ANNEX.t / 2), m.pz(ANNEX.z0 + ANNEX.t / 2), m.px(ANNEX.x0 + ANNEX.r), m.pz(ANNEX.z0 + ANNEX.t / 2), ANNEX.r * m.s);
    g.lineTo(m.px(ANNEX.x1 - ANNEX.r), m.pz(ANNEX.z0 + ANNEX.t / 2));
    g.arcTo(m.px(ANNEX.x1 - ANNEX.t / 2), m.pz(ANNEX.z0 + ANNEX.t / 2), m.px(ANNEX.x1 - ANNEX.t / 2), m.pz(ANNEX.z0 + ANNEX.r), ANNEX.r * m.s);
    g.lineTo(m.px(ANNEX.x1 - ANNEX.t / 2), m.pz(ALB.z0));
    g.stroke();
    g.lineWidth = 1.4;
    // the spring
    g.fillStyle = 'rgba(110,150,160,0.6)';
    g.beginPath();
    g.ellipse(m.px(SPRING.x), m.pz(SPRING.z), 1.9 * m.s, 1.3 * m.s, 0, 0, Math.PI * 2);
    g.fill();
  },
};
