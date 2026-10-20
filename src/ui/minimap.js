import { IW, IC_OUT, OC_IN, OC_OUT, TOWERS, TOWER_R, GH, HALL, SERV, NR, WELL } from '../castle/layout.js';

// An ink plan of the castle. The removed southern half is drawn faint and
// hatched; rooms with detail are washed and clickable; the camera is a
// small eye with its view cone.

const X0 = -44;
const X1 = 46;
const Z0 = -40;
const Z1 = 28;

export class Minimap {
  constructor(app, canvas) {
    this.app = app;
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.s = Math.min(this.W / (X1 - X0), this.H / (Z1 - Z0));
    this.ox = (this.W - (X1 - X0) * this.s) / 2;
    this.oy = (this.H - (Z1 - Z0) * this.s) / 2;
    const r = NR.rooms;
    this.rooms = [
      { id: 'hall', r: [HALL.x0, HALL.zCross1, HALL.x1, HALL.z1] },
      { id: 'buttery', r: [SERV.x0, SERV.z0, SERV.part0, SERV.z1] },
      { id: 'pantry', r: [SERV.part1, SERV.z0, SERV.x1, SERV.z1] },
      ...['larder', 'kitchen', 'bakehouse', 'brewhouse', 'granary'].map((id) => ({ id, r: [r[id].x0, NR.z0, r[id].x1, NR.z1] })),
      { id: 'gatehouse', r: [GH.x0, GH.z0, GH.x1, GH.z1] },
      { id: 'well', r: [WELL.x - 1.6, -1.6, WELL.x + 1.6, 1.6] },
    ];
    this.hover = null;
    canvas.addEventListener('click', (e) => {
      const id = this.hit(e);
      if (id) app.focusRoom(id);
      else if (this.inWard(e)) app.focusRoom('ward');
    });
    canvas.addEventListener('pointermove', (e) => {
      this.hover = this.hit(e);
      canvas.title = this.hover ? this.app.roomName(this.hover) : '';
    });
    canvas.addEventListener('pointerleave', () => (this.hover = null));
    this.frame = 0;
  }
  px(x) {
    return this.ox + (x - X0) * this.s;
  }
  pz(z) {
    return this.oy + (z - Z0) * this.s;
  }
  world(e) {
    const b = this.c.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * this.W;
    const y = ((e.clientY - b.top) / b.height) * this.H;
    return [X0 + (x - this.ox) / this.s, Z0 + (y - this.oy) / this.s];
  }
  hit(e) {
    const [x, z] = this.world(e);
    for (const rm of this.rooms) {
      const [a, b, c, d] = rm.r;
      if (x >= a && x <= c && z >= b && z <= d) return rm.id;
    }
    return null;
  }
  inWard(e) {
    const [x, z] = this.world(e);
    return x > IW.x0 && x < IW.x1 && z > IW.z0 && z < IW.z1;
  }

  draw() {
    // a few times a second is plenty
    if (this.frame++ % 6) return;
    const g = this.g;
    const ink = '#3a2c20';
    g.clearRect(0, 0, this.W, this.H);
    g.lineJoin = 'round';
    const rect = (a, b, c, d) => g.rect(this.px(a), this.pz(b), this.px(c) - this.px(a), this.pz(d) - this.pz(b));
    // outer and inner curtains (filled walls)
    g.fillStyle = 'rgba(160,140,115,0.55)';
    g.strokeStyle = ink;
    g.lineWidth = 1.4;
    g.beginPath();
    rect(OC_OUT.x0, OC_OUT.z0, OC_OUT.x1, OC_OUT.z1);
    rect(OC_IN.x1, OC_IN.z0, OC_IN.x0, OC_IN.z1); // reverse winding for the hole
    g.fill('evenodd');
    g.stroke();
    g.beginPath();
    rect(IC_OUT.x0, IC_OUT.z0, IC_OUT.x1, IC_OUT.z1);
    rect(IW.x1, IW.z0, IW.x0, IW.z1);
    g.fill('evenodd');
    g.stroke();
    // towers and gatehouse
    g.fillStyle = 'rgba(150,130,108,0.75)';
    for (const t of Object.values(TOWERS)) {
      g.beginPath();
      g.arc(this.px(t.x), this.pz(t.z), TOWER_R * this.s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.beginPath();
    rect(GH.x0, GH.z0, GH.x1, GH.z1);
    g.fill();
    g.stroke();
    // rooms
    for (const rm of this.rooms) {
      const active = this.app.focus && this.app.focus.id === rm.id;
      g.fillStyle = active ? 'rgba(162,65,47,0.45)' : rm.id === this.hover ? 'rgba(185,139,62,0.55)' : 'rgba(205,170,100,0.35)';
      g.beginPath();
      rect(...rm.r);
      g.fill();
      g.lineWidth = 0.8;
      g.stroke();
    }
    // the removed half: faint hatching
    g.save();
    g.beginPath();
    g.rect(this.px(X0), this.pz(0), this.px(X1) - this.px(X0), this.pz(Z1) - this.pz(0));
    g.clip();
    g.fillStyle = 'rgba(243,234,214,0.72)';
    g.fillRect(0, this.pz(0), this.W, this.H);
    g.strokeStyle = 'rgba(90,70,50,0.25)';
    g.lineWidth = 0.6;
    for (let k = -this.H; k < this.W; k += 6) {
      g.beginPath();
      g.moveTo(k, this.H);
      g.lineTo(k + this.H, 0);
      g.stroke();
    }
    g.restore();
    // the cut line
    g.strokeStyle = '#a2412f';
    g.lineWidth = 1.6;
    g.setLineDash([6, 4]);
    g.beginPath();
    g.moveTo(this.px(X0 + 2), this.pz(0));
    g.lineTo(this.px(X1 - 2), this.pz(0));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#a2412f';
    g.font = 'italic 15px Georgia, serif';
    g.fillText('line of the cut', this.px(X0 + 3), this.pz(0) + 15);
    // compass
    g.fillStyle = ink;
    g.font = '15px Georgia, serif';
    g.fillText('N', this.W - 22, 22);
    g.beginPath();
    g.moveTo(this.W - 16, 28);
    g.lineTo(this.W - 16, 46);
    g.strokeStyle = ink;
    g.stroke();
    // the camera
    const cam = this.app.camera.position;
    const tgt = this.app.controls.state.target;
    const cx = this.px(Math.max(X0, Math.min(X1, cam.x)));
    const cz = this.pz(Math.max(Z0, Math.min(Z1, cam.z)));
    const ang = Math.atan2(tgt.z - cam.z, tgt.x - cam.x);
    const half = 0.32;
    g.fillStyle = 'rgba(79,111,134,0.25)';
    g.beginPath();
    g.moveTo(cx, cz);
    g.arc(cx, cz, 40, ang - half, ang + half);
    g.closePath();
    g.fill();
    g.fillStyle = '#4f6f86';
    g.beginPath();
    g.arc(cx, cz, 5, 0, Math.PI * 2);
    g.fill();
  }
}
