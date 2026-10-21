import * as THREE from 'three';

/** Walking surface height at (x, z). */
export function floorAt(x, z) {
  if (x > -25 && x < -11.8 && z > -21 && z < 0) {
    if (x > -13 && z > -9) return 0.6; // hall east wall thickness (door)
    return 0.6;
  }
  if (x >= -11.8 && x < -10.6 && z > -9 && z < -7.4) return 0.6 * (1 - (x + 11.8) / 1.2);
  if (x > -11.8 && x < 25 && z > -21 && z < -11.5) return z < -12.5 ? 0.08 : 0.04;
  return 0;
}

const TAU = Math.PI * 2;
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/**
 * Runs a looping routine for a figure or animal.
 * steps: [{ go: [[x,z],...], pose, speed } | { pose, dur, face, params, on }]
 * `face` is a heading in radians or a point [x, z].
 * `on(actor)` runs once when the step starts (swap props etc.).
 */
export class Actor {
  constructor(entity, steps, opts = {}) {
    this.e = entity;
    this.steps = steps;
    this.speed = opts.speed ?? 1.05;
    this.stride = opts.stride ?? 1.3;
    this.floor = opts.floor ?? null;
    this.floorFn = opts.floorFn ?? floorAt;
    this.yOffset = opts.yOffset ?? 0;
    this.turnRate = opts.turnRate ?? 6;
    this.i = 0;
    this.t = 0;
    this.seg = 0;
    this.phase = 0;
    this.started = false;
    const start = opts.start ?? this._firstPoint();
    this.pos = new THREE.Vector2(start[0], start[1]);
    this.heading = opts.heading ?? 0;
    this.override = null; // (entity, t) => true while something else drives the pose
    this.place();
  }
  _firstPoint() {
    for (const s of this.steps) if (s.go) return s.go[0];
    return [0, 0];
  }
  place() {
    const r = this.e.root;
    const y = this.floor !== null ? this.floor : this.floorFn(this.pos.x, this.pos.y);
    r.position.set(this.pos.x, y + this.yOffset, this.pos.y);
    r.rotation.y = this.heading;
  }
  turnTo(target, dt) {
    this.heading += angDiff(this.heading, target) * Math.min(1, dt * this.turnRate);
  }
  /** Walk directly towards (tx, tz); returns true when there. */
  steer(tx, tz, dt, speed = this.speed) {
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.y;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const m = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * m;
    this.pos.y += (dz / d) * m;
    this.turnTo(Math.atan2(dx, dz), dt);
    this.phase += m * (TAU / this.stride);
    return false;
  }

  update(t, dt) {
    if (this.override && this.override(this.e, t, dt)) {
      this.place();
      return;
    }
    const st = this.steps[this.i];
    if (!this.started) {
      this.started = true;
      this.t = 0;
      this.seg = 0;
      if (st.on) st.on(this);
      if (st.go) {
        // start the walk from wherever we are
        this.path = [[this.pos.x, this.pos.y], ...st.go];
      }
    }
    if (st.go) {
      const sp = (st.speed ?? this.speed) * dt;
      let remaining = sp;
      while (remaining > 0 && this.seg < this.path.length - 1) {
        const [tx, tz] = this.path[this.seg + 1];
        const dx = tx - this.pos.x;
        const dz = tz - this.pos.y;
        const d = Math.hypot(dx, dz);
        if (d < 1e-4) {
          this.seg++;
          continue;
        }
        const m = Math.min(remaining, d);
        this.pos.x += (dx / d) * m;
        this.pos.y += (dz / d) * m;
        remaining -= m;
        this.turnTo(Math.atan2(dx, dz), dt);
        if (m >= d - 1e-6) this.seg++;
      }
      this.phase += (sp - remaining) * (TAU / this.stride);
      this.e.pose(st.pose ?? 'walk', t, { phase: this.phase, ...(st.params || {}) });
      if (this.seg >= this.path.length - 1) this._next();
    } else {
      this.t += dt;
      if (st.face !== undefined) {
        const f = Array.isArray(st.face) ? Math.atan2(st.face[0] - this.pos.x, st.face[1] - this.pos.y) : st.face;
        this.turnTo(f, dt);
      }
      this.e.pose(st.pose ?? 'idle', t, { phase: this.phase, ...(st.params || {}) });
      if (st.until ? st.until(this) : this.t >= (st.dur ?? 3)) this._next();
    }
    this.place();
  }
  _next() {
    this.i = (this.i + 1) % this.steps.length;
    this.started = false;
  }
}
