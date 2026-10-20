import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Orbit controls for a cutaway: the camera orbits a target within limits that
 * keep the cut face (the plane z = 0, facing +z) towards the viewer.
 *   left-drag: orbit   right-drag / shift-drag: pan   wheel: zoom
 *   WASD / arrows: pan   Q/E: down/up
 */
export class CutawayControls {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.state = { target: new THREE.Vector3(4, 0, -10), dist: 150, az: 0, el: 22 * DEG };
    this.goal = { target: this.state.target.clone(), dist: this.state.dist, az: this.state.az, el: this.state.el };
    this.overviewLimits = {
      az: [-55 * DEG, 55 * DEG],
      el: [2 * DEG, 68 * DEG],
      dist: [8, 240],
      box: new THREE.Box3(new THREE.Vector3(-60, -30, -34), new THREE.Vector3(65, 30, 4)),
      minCamZ: 2,
    };
    this.limits = this.overviewLimits;
    this.flight = null;
    this.keys = new Set();
    this.dragging = null;
    this.enabled = true;
    this.onUserMove = null;
    this._bind();
  }

  _bind() {
    const el = this.dom;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      const pan = e.button === 2 || e.button === 1 || e.shiftKey;
      this.dragging = { mode: pan ? 'pan' : 'orbit', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.dragging;
      if (!d || d.captured) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
      if (!d.moved) return;
      this.flight = null;
      if (d.mode === 'orbit') {
        this.goal.az -= dx * 0.0045;
        this.goal.el += dy * 0.0045;
      } else {
        this.panScreen(dx, dy);
      }
      this.onUserMove && this.onUserMove();
    });
    const end = (e) => {
      if (this.dragging && this.dragging.id === e.pointerId) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (_) {
          /* ignore */
        }
        this.dragging = null;
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.flight = null;
        const f = Math.exp(clamp(e.deltaY, -200, 200) * 0.0012);
        this.zoomAt(e.clientX, e.clientY, f);
        this.onUserMove && this.onUserMove();
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Was the last pointer interaction a click (no drag)? */
  wasDrag() {
    return this.dragging && this.dragging.moved;
  }

  panScreen(dx, dy) {
    const h = this.dom.clientHeight || window.innerHeight;
    const scale = (2 * this.goal.dist * Math.tan((this.camera.fov * DEG) / 2)) / h;
    const right = new THREE.Vector3(Math.cos(this.goal.az), 0, -Math.sin(this.goal.az));
    const up = new THREE.Vector3(
      -Math.sin(this.goal.el) * Math.sin(this.goal.az),
      Math.cos(this.goal.el),
      -Math.sin(this.goal.el) * Math.cos(this.goal.az),
    );
    this.goal.target.addScaledVector(right, -dx * scale);
    this.goal.target.addScaledVector(up, dy * scale);
  }

  zoomAt(cx, cy, f) {
    const old = this.goal.dist;
    const L = this.limits;
    const nd = clamp(old * f, L.dist[0], L.dist[1]);
    const real = nd / old;
    // move the target towards the point under the cursor (on the target's depth plane)
    const rect = this.dom.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = -((cy - rect.top) / rect.height) * 2 + 1;
    const halfH = Math.tan((this.camera.fov * DEG) / 2) * old;
    const halfW = halfH * this.camera.aspect;
    const right = new THREE.Vector3(Math.cos(this.goal.az), 0, -Math.sin(this.goal.az));
    const up = new THREE.Vector3(
      -Math.sin(this.goal.el) * Math.sin(this.goal.az),
      Math.cos(this.goal.el),
      -Math.sin(this.goal.el) * Math.cos(this.goal.az),
    );
    const off = new THREE.Vector3().addScaledVector(right, nx * halfW).addScaledVector(up, ny * halfH);
    this.goal.target.addScaledVector(off, 1 - real);
    this.goal.dist = nd;
  }

  setLimits(lim) {
    this.limits = lim || this.overviewLimits;
  }

  /** Fly to a view: {target, dist, az, el} (angles in radians). */
  flyTo(view, duration = 1.4) {
    const from = { target: this.state.target.clone(), dist: this.state.dist, az: this.state.az, el: this.state.el };
    this.flight = { from, to: { ...view, target: view.target.clone() }, t: 0, duration };
  }

  jumpTo(view) {
    this.flight = null;
    Object.assign(this.goal, { ...view, target: view.target.clone() });
    Object.assign(this.state, { ...view, target: view.target.clone() });
    this._apply();
  }

  get flying() {
    return !!this.flight;
  }

  _clampGoal() {
    const L = this.limits;
    const g = this.goal;
    g.az = clamp(g.az, L.az[0], L.az[1]);
    g.el = clamp(g.el, L.el[0], L.el[1]);
    g.dist = clamp(g.dist, L.dist[0], L.dist[1]);
    L.box.clampPoint(g.target, g.target);
    if (L.minCamZ !== undefined) {
      const cz = g.target.z + g.dist * Math.cos(g.el) * Math.cos(g.az);
      if (cz < L.minCamZ) g.target.z += L.minCamZ - cz;
    }
    if (L.camBox) {
      // keep the camera itself inside a box (e.g. inside the hall when looking
      // into the services), moving the target with it
      const c = new THREE.Vector3(
        g.target.x + g.dist * Math.cos(g.el) * Math.sin(g.az),
        g.target.y + g.dist * Math.sin(g.el),
        g.target.z + g.dist * Math.cos(g.el) * Math.cos(g.az),
      );
      const cc = L.camBox.clampPoint(c, new THREE.Vector3());
      g.target.add(cc.sub(c));
    }
    if (L.minCamY !== undefined) {
      const cy = g.target.y + g.dist * Math.sin(g.el);
      if (cy < L.minCamY) g.target.y += L.minCamY - cy;
    }
  }

  update(dt) {
    // keyboard pan in the horizontal plane
    if (this.enabled && this.keys.size) {
      const sp = this.goal.dist * 0.7 * dt;
      const fwd = new THREE.Vector3(-Math.sin(this.goal.az), 0, -Math.cos(this.goal.az));
      const right = new THREE.Vector3(Math.cos(this.goal.az), 0, -Math.sin(this.goal.az));
      const k = this.keys;
      const mv = new THREE.Vector3();
      if (k.has('w') || k.has('arrowup')) mv.add(fwd);
      if (k.has('s') || k.has('arrowdown')) mv.sub(fwd);
      if (k.has('d') || k.has('arrowright')) mv.add(right);
      if (k.has('a') || k.has('arrowleft')) mv.sub(right);
      if (k.has('e')) mv.y += 1;
      if (k.has('q')) mv.y -= 1;
      if (mv.lengthSq() > 0) {
        this.flight = null;
        this.goal.target.addScaledVector(mv.normalize(), sp);
        this.onUserMove && this.onUserMove();
      }
    }

    if (this.flight) {
      const F = this.flight;
      F.t += dt / F.duration;
      const t = ease(Math.min(1, F.t));
      const s = this.state;
      s.target.lerpVectors(F.from.target, F.to.target, t);
      s.az = F.from.az + (F.to.az - F.from.az) * t;
      s.el = F.from.el + (F.to.el - F.from.el) * t;
      // zoom out a little mid-flight for a sense of travel
      const logD = Math.log(F.from.dist) + (Math.log(F.to.dist) - Math.log(F.from.dist)) * t;
      const hop = Math.sin(Math.PI * t) * 0.18 * Math.min(1, F.from.target.distanceTo(F.to.target) / 30);
      s.dist = Math.exp(logD) * (1 + hop);
      this.goal.target.copy(s.target);
      this.goal.az = s.az;
      this.goal.el = s.el;
      this.goal.dist = s.dist;
      if (F.t >= 1) {
        this.goal.dist = F.to.dist;
        this.flight = null;
      }
    } else {
      this._clampGoal();
      const k = 1 - Math.exp(-dt * 10);
      const s = this.state;
      s.target.lerp(this.goal.target, k);
      s.az += (this.goal.az - s.az) * k;
      s.el += (this.goal.el - s.el) * k;
      s.dist += (this.goal.dist - s.dist) * k;
    }
    this._apply();
  }

  _apply() {
    const s = this.state;
    const c = this.camera;
    c.position.set(
      s.target.x + s.dist * Math.cos(s.el) * Math.sin(s.az),
      s.target.y + s.dist * Math.sin(s.el),
      s.target.z + s.dist * Math.cos(s.el) * Math.cos(s.az),
    );
    c.lookAt(s.target);
  }
}

export { DEG };
