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

// distance inside which a walker cuts across to the next waypoint
const CORNER = 0.3;

/**
 * Runs a looping routine for a figure or animal.
 * steps: [{ go: [[x,z],...], pose, speed } | { pose, dur, face, params, on }]
 * `face` is a heading in radians or a point [x, z].
 * `on(actor)` runs once when the step starts (swap props etc.).
 *
 * Walkers speed up and slow down rather than starting and stopping dead,
 * turn on the spot before setting off in a new direction, round the corners
 * of their paths, and give way to one another (see crowd.js): `off` is a
 * small sideways offset to pass someone, `hold` slows them behind someone.
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
    this.accel = opts.accel ?? Math.max(1.6, this.speed * 2.2);
    // crowd: personal radius, whether it moves aside for others, how timid it is
    this.radius = opts.radius ?? entity.radius ?? 0.25;
    this.solid = opts.solid ?? true;
    this.yields = opts.yields ?? true;
    this.shy = opts.shy ?? 0;
    this.gait = opts.gait ?? !!entity.j; // figures scale their stride with speed
    this.i = 0;
    this.t = 0;
    this.seg = 0;
    this.phase = 0;
    this.started = false;
    const start = opts.start ?? this._firstPoint();
    this.pos = new THREE.Vector2(start[0], start[1]);
    this.heading = opts.heading ?? 0;
    this.override = null; // (entity, t, dt) => true while something else drives the pose
    this.interrupt = null; // { until, pose, face, params } a pause in the routine (greeting)
    this.curSpeed = 0;
    this.walking = false;
    this.dir = new THREE.Vector2(Math.sin(this.heading), Math.cos(this.heading));
    this.off = new THREE.Vector2();
    this.hold = 1;
    this.activity = '';
    this.place();
  }
  _firstPoint() {
    for (const s of this.steps) if (s.go) return s.go[0];
    return [0, 0];
  }
  /** Where the body is drawn: the path position plus any sidestep. */
  get x() {
    return this.pos.x + this.off.x;
  }
  get z() {
    return this.pos.y + this.off.y;
  }
  place() {
    const r = this.e.root;
    const x = this.x;
    const z = this.z;
    const y = this.floor !== null ? this.floor : this.floorFn(x, z);
    r.position.set(x, y + this.yOffset, z);
    r.rotation.y = this.heading;
  }
  turnTo(target, dt) {
    const d = angDiff(this.heading, target);
    const turn = d * Math.min(1, dt * this.turnRate);
    this.heading += turn;
    return turn;
  }
  /** Walk directly towards (tx, tz); returns true when there. */
  steer(tx, tz, dt, speed = this.speed) {
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.y;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) {
      this.walking = false;
      return true;
    }
    const m = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * m;
    this.pos.y += (dz / d) * m;
    this.dir.set(dx / d, dz / d);
    this.walking = true;
    this.turnTo(Math.atan2(dx, dz), dt);
    this.phase += m * (TAU / this.stride);
    return false;
  }

  /** Stop what you are doing for a moment: face something and do a pose. */
  pause(pose, seconds, face, params) {
    const now = this._now ?? 0;
    this.interrupt = { t0: now, until: now + seconds, pose, face, params };
  }

  _faceAngle(face) {
    return Array.isArray(face) ? Math.atan2(face[0] - this.pos.x, face[1] - this.pos.y) : face;
  }

  // length of the rest of the current path
  _remaining() {
    let d = 0;
    let px = this.pos.x;
    let pz = this.pos.y;
    for (let k = this.seg + 1; k < this.path.length; k++) {
      const [x, z] = this.path[k];
      d += Math.hypot(x - px, z - pz);
      px = x;
      pz = z;
    }
    return d;
  }

  update(t, dt) {
    this._now = t;
    if (this.interrupt) {
      const it = this.interrupt;
      if (t < it.until) {
        this.walking = false;
        this.curSpeed = 0;
        if (it.face !== undefined) this.turnTo(this._faceAngle(it.face), dt);
        this.e.pose(it.pose, t, { phase: this.phase, stepAmt: 0, moving: false, t: t - it.t0, ...(it.params || {}) });
        this.place();
        return;
      }
      this.interrupt = null;
    }
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
    this.activity = st.doing ?? this.activity;
    if (st.go) {
      const vmax = st.speed ?? this.speed;
      const next = this.steps[(this.i + 1) % this.steps.length];
      // slow to a stop at the end of the path, unless walking straight on
      const rem = this._remaining();
      const brake = next.go ? Infinity : Math.sqrt(2 * this.accel * Math.max(0, rem - 0.03)) + 0.08;
      // turn on the spot first when the way ahead is behind or beside us
      let tx = this.pos.x;
      let tz = this.pos.y;
      if (this.seg < this.path.length - 1) [tx, tz] = this.path[this.seg + 1];
      const want = Math.atan2(tx - this.pos.x, tz - this.pos.y);
      const err = Math.abs(angDiff(this.heading, want));
      const turnK = Math.min(1, Math.max(0, (Math.cos(err) + 0.2) / 0.85));
      const goal = Math.min(vmax * this.hold, brake) * turnK;
      const dv = goal - this.curSpeed;
      this.curSpeed += Math.max(-this.accel * 2.5 * dt, Math.min(this.accel * dt, dv));
      if (this.curSpeed < 0) this.curSpeed = 0;
      let remaining = this.curSpeed * dt;
      let moved = 0;
      while (this.seg < this.path.length - 1) {
        const [px, pz] = this.path[this.seg + 1];
        const dx = px - this.pos.x;
        const dz = pz - this.pos.y;
        const d = Math.hypot(dx, dz);
        // round the corners: aim for the next waypoint once close to this one
        if (d < 1e-4 || (d < CORNER && this.seg < this.path.length - 2)) {
          this.seg++;
          continue;
        }
        if (remaining <= 0) break;
        const m = Math.min(remaining, d);
        this.pos.x += (dx / d) * m;
        this.pos.y += (dz / d) * m;
        this.dir.set(dx / d, dz / d);
        remaining -= m;
        moved += m;
        if (m >= d - 1e-6) this.seg++;
      }
      const turned = this.turnTo(want, dt);
      // a figure takes shorter steps when walking slowly
      const k = this.gait ? Math.min(1.25, Math.max(0.55, Math.sqrt(this.curSpeed / 1.05))) : 1;
      this.phase += moved * (TAU / ((st.stride ?? this.stride) * k)) + Math.abs(turned) * 1.6;
      const stepAmt = Math.min(1.25, this.curSpeed / Math.max(0.3, vmax) * (this.gait ? Math.max(0.6, Math.min(1.15, vmax / 1.05)) : 1) + Math.min(0.5, Math.abs(turned) / Math.max(dt, 1e-3) * 0.12));
      this.walking = this.curSpeed > 0.02 || Math.abs(turned) > 1e-3;
      this.e.pose(st.pose ?? 'walk', t, { phase: this.phase, stepAmt, speed: this.curSpeed, ...(st.params || {}) });
      if (this.seg >= this.path.length - 1) {
        if (!next.go) this.curSpeed = 0;
        this._next();
      }
    } else {
      this.walking = false;
      this.curSpeed = 0;
      this.t += dt;
      let turned = 0;
      if (st.face !== undefined) turned = this.turnTo(this._faceAngle(st.face), dt);
      // shuffle the feet while turning to face the work
      this.phase += Math.abs(turned) * 1.6;
      const shuffle = Math.min(0.5, Math.abs(turned) / Math.max(dt, 1e-3) * 0.12);
      this.e.pose(st.pose ?? 'idle', t, { phase: this.phase, stepAmt: shuffle, ...(st.params || {}) });
      if (st.until ? st.until(this) : this.t >= (st.dur ?? 3)) this._next();
    }
    this.place();
  }
  _next() {
    this.i = (this.i + 1) % this.steps.length;
    this.started = false;
  }
  /** Replace the routine (e.g. when the alarm is raised), starting it now. */
  setSteps(steps) {
    this.steps = steps;
    this.i = 0;
    this.started = false;
  }
}
