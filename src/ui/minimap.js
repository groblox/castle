import { site } from '../sites.js';

// An ink plan of the castle. The removed half is drawn faint and hatched;
// rooms with detail are washed and clickable; the camera is a small eye with
// its view cone. Each site's PLAN supplies the extent, rooms and walls.

export class Minimap {
  constructor(app, canvas) {
    this.app = app;
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.plan = site.plan;
    const { x0, x1, z0, z1 } = this.plan.bounds;
    Object.assign(this, { X0: x0, X1: x1, Z0: z0, Z1: z1 });
    this.s = Math.min(this.W / (x1 - x0), this.H / (z1 - z0));
    this.ox = (this.W - (x1 - x0) * this.s) / 2;
    this.oy = (this.H - (z1 - z0) * this.s) / 2;
    this.rooms = this.plan.rooms;
    this.hover = null;
    canvas.addEventListener('click', (e) => {
      const id = this.hit(e) ?? this.plan.areaAt(...this.world(e));
      if (id) app.focusRoom(id);
    });
    canvas.addEventListener('pointermove', (e) => {
      this.hover = this.hit(e);
      canvas.title = this.hover ? this.app.roomName(this.hover) : '';
    });
    canvas.addEventListener('pointerleave', () => (this.hover = null));
    this.frame = 0;
  }
  px(x) {
    return this.ox + (x - this.X0) * this.s;
  }
  pz(z) {
    return this.oy + (z - this.Z0) * this.s;
  }
  rect(a, b, c, d) {
    this.g.rect(this.px(a), this.pz(b), this.px(c) - this.px(a), this.pz(d) - this.pz(b));
  }
  world(e) {
    const b = this.c.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * this.W;
    const y = ((e.clientY - b.top) / b.height) * this.H;
    return [this.X0 + (x - this.ox) / this.s, this.Z0 + (y - this.oy) / this.s];
  }
  hit(e) {
    const [x, z] = this.world(e);
    for (const rm of this.rooms) {
      const [a, b, c, d] = rm.r;
      if (x >= a && x <= c && z >= b && z <= d) return rm.id;
    }
    return null;
  }

  draw() {
    // a few times a second is plenty
    if (this.frame++ % 6) return;
    const g = this.g;
    const { X0, X1, Z0, Z1 } = this;
    const cutZ = this.plan.cutZ;
    const ink = '#3a2c20';
    g.clearRect(0, 0, this.W, this.H);
    g.lineJoin = 'round';
    g.strokeStyle = ink;
    g.lineWidth = 1.4;
    this.plan.draw(g, this);
    // rooms
    for (const rm of this.rooms) {
      const active = this.app.focus && this.app.focus.id === rm.id;
      g.fillStyle = active ? 'rgba(162,65,47,0.45)' : rm.id === this.hover ? 'rgba(185,139,62,0.55)' : 'rgba(205,170,100,0.35)';
      g.beginPath();
      this.rect(...rm.r);
      g.fill();
      g.lineWidth = 0.8;
      g.stroke();
    }
    // the removed half: faint hatching
    g.save();
    g.beginPath();
    g.rect(this.px(X0), this.pz(cutZ), this.px(X1) - this.px(X0), this.pz(Z1) - this.pz(cutZ));
    g.clip();
    g.fillStyle = 'rgba(243,234,214,0.72)';
    g.fillRect(0, this.pz(cutZ), this.W, this.H);
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
    g.moveTo(this.px(X0 + 2), this.pz(cutZ));
    g.lineTo(this.px(X1 - 2), this.pz(cutZ));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#a2412f';
    g.font = 'italic 15px Georgia, serif';
    g.fillText('line of the cut', this.px(X0 + 3), this.pz(cutZ) + 15);
    // compass; plan.north turns it where the model is squared up to its axes
    g.save();
    g.translate(this.W - 16, 37);
    g.rotate((-(this.plan.north ?? 0) * Math.PI) / 180);
    g.fillStyle = ink;
    g.font = '15px Georgia, serif';
    g.fillText('N', -6, -15);
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(0, 9);
    g.strokeStyle = ink;
    g.stroke();
    g.restore();
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
