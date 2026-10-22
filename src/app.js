import * as THREE from 'three';
import { Pipeline } from './render/pipeline.js';
import { shared, setFades } from './render/material.js';
import { CutawayControls, DEG } from './ui/controls.js';
import { GROUP_COUNT } from './castle/rooms.js';
import { LABELS } from './data/labels.js';
import { buildWorld } from './world.js';
import { Panel } from './ui/panel.js';
import { RoomList } from './ui/roomlist.js';
import { Minimap } from './ui/minimap.js';
import { SiteSwitch } from './ui/siteswitch.js';
import { site } from './sites.js';

THREE.ColorManagement.enabled = false;

const { ROOMS, ROOM_BY_ID } = site;
const SEATED = new Set(['sit', 'sitWork', 'sitCrank', 'polish', 'dice', 'milk', 'saw', 'kneel', 'shoot', 'drill', 'crank']);

const OVERVIEW = site.overview;

export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.25, 900);
    this.pipeline = new Pipeline(this.renderer, this.scene, this.camera);
    this.controls = new CutawayControls(this.camera, canvas);
    this.controls.jumpTo(OVERVIEW);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.focus = null;
    this.focusAmtGoal = 0;
    this.fade = new Float32Array(GROUP_COUNT);
    this.fadeGoal = new Float32Array(GROUP_COUNT);
    this.hover = { x: -1, y: -1, label: 0, pending: false, last: 0 };
    this.mechs = {}; // id -> mechanism (milestone 5)
    this.frameTimes = [];

    this.site = site;
    this.world = buildWorld(this.scene, site);
    this.mechs = site.createMechanisms(this);
    this.panel = new Panel(this);
    this.roomList = new RoomList(this, document.getElementById('roomlist'));
    this.minimap = new Minimap(this, document.getElementById('minimap'));
    new SiteSwitch(document.getElementById('siteswitch'));
    document.getElementById('site-title').innerHTML = `${site.title} <span>${site.date}</span>`;
    document.getElementById('site-subtitle').textContent = site.subtitle;
    document.title = `${site.title}, ${site.date}: a cutaway`;
    document.getElementById('about').addEventListener('click', () => this.panel.showAbout());
    const day = document.getElementById('daylight');
    const setDay = () => (shared.uDay.value = Number(day.value));
    day.addEventListener('input', setDay);
    setDay();
    this._bindUI();
    if (new URLSearchParams(location.search).has('stats')) this._toggleStats();

    window.addEventListener('resize', () => this.pipeline.resize());
    this.ready = false;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _bindUI() {
    const c = this.canvas;
    this.tooltip = document.getElementById('tooltip');
    this.backBtn = document.getElementById('back');
    this.backBtn.addEventListener('click', () => this.overview());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) this._toggleStats();
      if (e.key === 'Escape') {
        if (this.focus || this.following) this.overview();
        else this.panel.hide();
      }
    });
    c.addEventListener('pointermove', (e) => {
      this.hover.x = e.clientX;
      this.hover.y = e.clientY;
      this.hover.dirty = true;
      if (this.controls.dragging) c.classList.add('dragging');
      if (this.dragHandler) this.dragHandler.move(e);
    });
    c.addEventListener('pointerleave', () => {
      this.hover.x = -1;
      this._showTooltip(0);
    });
    c.addEventListener('pointerdown', (e) => {
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
      // mechanisms may grab the pointer (e.g. turning a crank)
      if (e.button === 0 && this.hover.label) {
        const L = LABELS[this.hover.label];
        if (L && L.mech && this.mechs[L.mech] && this.mechs[L.mech].grab) {
          const h = this.mechs[L.mech].grab(e, L);
          if (h) {
            this.dragHandler = h;
            this.controls.dragging = { captured: true, id: e.pointerId, moved: true };
          }
        }
      }
    });
    c.addEventListener('pointerup', (e) => {
      c.classList.remove('dragging');
      if (this.dragHandler) {
        this.dragHandler.end && this.dragHandler.end(e);
        const wasDrag = this.dragHandler.moved;
        this.dragHandler = null;
        this.controls.dragging = null;
        if (wasDrag) return;
      }
      const d = this.downAt;
      if (!d || d.button !== 0) return;
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) return;
      this._click(e.clientX, e.clientY);
    });
  }

  async _click(x, y) {
    const res = await this.pipeline.pick(x, y);
    const id = res ? res.label : this.hover.label;
    const L = LABELS[id];
    if (!L) return;
    if (L.mech && this.mechs[L.mech]) {
      const m = this.mechs[L.mech];
      if (this.focus && m.room && this.focus.id !== m.room) this.focusRoom(m.room, { keepPanel: true });
      else if (!this.focus && m.room) this.focusRoom(m.room, { keepPanel: true });
      m.click && m.click(L);
      this.panel.showMech(m);
      return;
    }
    if (L.person) {
      const a = this.actorAt(id, x, y);
      if (a) this.greet(a, L.person);
      this.panel.showPerson(L.person, a);
      return;
    }
    if (L.room && ROOM_BY_ID[L.room]) {
      if (!this.focus || this.focus.id !== L.room) this.focusRoom(L.room);
      else this.panel.showRoom(this.focus);
    }
  }

  /** The person or animal with this label nearest the screen point (several share a label). */
  actorAt(labelId, x, y) {
    if (!this._byLabel) {
      this._byLabel = new Map();
      for (const a of Object.values(this.world.cast.actors)) {
        let id = a.e.mat?.uniforms.uLabelOverride.value;
        if (id === undefined) a.e.root.traverse((o) => (id = id ?? o.material?.uniforms?.uLabelOverride?.value));
        if (!this._byLabel.has(id)) this._byLabel.set(id, []);
        this._byLabel.get(id).push(a);
      }
    }
    const list = this._byLabel.get(labelId) || [];
    const rect = this.canvas.getBoundingClientRect();
    let best = null;
    let bd = Infinity;
    const v = new THREE.Vector3();
    for (const a of list) {
      v.copy(a.e.root.position);
      v.y += 1.0;
      v.project(this.camera);
      if (v.z > 1) continue;
      const sx = rect.left + ((v.x + 1) / 2) * rect.width;
      const sy = rect.top + ((1 - v.y) / 2) * rect.height;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  /** A person clicked on stops and acknowledges you; those sitting or asleep just look up (or don't). */
  greet(a, key) {
    if (!a.e.j || a.override) return;
    const st = a.steps[a.i];
    const pose = st.go ? 'walk' : st.pose;
    const cam = this.camera.position;
    const t = this.time;
    if (pose === 'sleep') {
      this.toast('Asleep, and best left so.', 2500);
      return;
    }
    if (SEATED.has(pose) || (a.yields === false && !st.go)) {
      a.attend = { until: t + 3.5, x: cam.x, y: cam.y, z: cam.z };
      return;
    }
    const face = Math.atan2(cam.x - a.pos.x, cam.z - a.pos.y);
    const { soldiers, women, young } = site.greet;
    const how = soldiers.has(key) ? 'salute' : women.has(key) ? 'curtsey' : young.has(key) ? 'wave' : 'bow';
    a.attend = { until: t + 3.2, x: cam.x, y: cam.y, z: cam.z };
    a.pause(how, 3.0, face);
  }

  /** Keep the camera on a person as they go about their business (null to stop). */
  follow(a) {
    this.following = a;
    if (!a) {
      this.panel.sync && this.panel.sync();
      return;
    }
    this.focus = null;
    this.focusAmtGoal = 0;
    this.fadeGoal.fill(0);
    this.backBtn.hidden = false;
    this.roomList.setActive(null);
    this.controls.setLimits(null);
    const p = a.e.root.position;
    const s = this.controls.state;
    this.controls.flyTo({ target: new THREE.Vector3(p.x, p.y + 1.1, p.z), dist: 11, az: s.az, el: Math.max(14 * DEG, Math.min(40 * DEG, s.el)) }, 1.2);
  }

  roomView(room) {
    const min = new THREE.Vector3(...room.box[0]);
    const max = new THREE.Vector3(...room.box[1]);
    const c = min.clone().add(max).multiplyScalar(0.5);
    if (room.view.targetY !== undefined) c.y = room.view.targetY;
    const size = max.clone().sub(min);
    const panelFrac = Math.min(0.4, 420 / window.innerWidth);
    const vfov = this.camera.fov * DEG;
    const aspect = this.camera.aspect * (1 - panelFrac);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const fit = room.view.fit ?? 1;
    const az = room.view.az * DEG;
    const el = room.view.el * DEG;
    let d = Math.max(size.x / 2 / Math.tan(hfov / 2), size.y / 2 / Math.tan(vfov / 2)) * fit * 1.25 + size.z * 0.55;
    if (room.view.dist) d = room.view.dist;
    // shift the target so the room sits in the area left of the notes panel
    const halfW = Math.tan(vfov / 2) * this.camera.aspect * d;
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    c.addScaledVector(right, halfW * panelFrac);
    return { target: c, dist: d, az, el, min, max };
  }

  focusRoom(id, opts = {}) {
    const room = ROOM_BY_ID[id];
    if (!room) return;
    this.following = null;
    this.focus = room;
    const v = this.roomView(room);
    const box = new THREE.Box3(v.min.clone().addScalar(-4), v.max.clone().addScalar(4));
    box.expandByPoint(v.target);
    const camBox = room.camBox ? new THREE.Box3(new THREE.Vector3(...room.camBox[0]), new THREE.Vector3(...room.camBox[1])) : null;
    this.controls.setLimits({
      az: [v.az - 35 * DEG, v.az + 35 * DEG],
      el: [Math.max(1 * DEG, v.el - 16 * DEG), v.el + 30 * DEG],
      dist: [Math.max(2.5, v.dist * 0.3), v.dist * 1.8],
      box,
      camBox,
    });
    if (camBox) {
      // pull the framed view inside the camera box before flying there
      const c = new THREE.Vector3(
        v.target.x + v.dist * Math.cos(v.el) * Math.sin(v.az),
        v.target.y + v.dist * Math.sin(v.el),
        v.target.z + v.dist * Math.cos(v.el) * Math.cos(v.az),
      );
      const cc = camBox.clampPoint(c, new THREE.Vector3());
      if (cc.distanceTo(c) > 1e-3) {
        // move closer along the view ray rather than sideways where possible
        const dir = c.clone().sub(v.target).normalize();
        const t = Math.max(2.5, Math.min(v.dist, rayBoxExit(v.target, dir, camBox)));
        v.dist = t;
        const c2 = v.target.clone().addScaledVector(dir, t);
        v.target.add(camBox.clampPoint(c2, new THREE.Vector3()).sub(c2));
      }
    }
    if (opts.instant) this.controls.jumpTo(v);
    else this.controls.flyTo(v, 1.5);
    const m = room.view.margin ?? 1.6;
    shared.uFocusMin.value.copy(v.min).addScalar(-m);
    shared.uFocusMax.value.copy(v.max).addScalar(m);
    this.focusAmtGoal = 0.82;
    this.fadeGoal.fill(0);
    for (const g of room.hide || []) this.fadeGoal[g] = 1;
    this.backBtn.hidden = false;
    this.roomList.setActive(id);
    if (!opts.keepPanel) this.panel.showRoom(room);
  }

  overview(opts = {}) {
    this.focus = null;
    this.following = null;
    this.controls.setLimits(null);
    if (opts.instant) this.controls.jumpTo({ ...OVERVIEW, target: OVERVIEW.target.clone() });
    else this.controls.flyTo({ ...OVERVIEW, target: OVERVIEW.target.clone() }, 1.5);
    this.focusAmtGoal = 0;
    this.fadeGoal.fill(0);
    this.backBtn.hidden = true;
    this.roomList.setActive(null);
    this.panel.hide();
  }

  roomName(id) {
    return ROOM_BY_ID[id]?.name ?? id;
  }

  toast(msg, ms = 5000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (el.hidden = true), ms);
  }

  /** Advance the simulation without rendering (used by tests). */
  simulate(seconds, step = 1 / 30) {
    for (let s = 0; s < seconds; s += step) {
      this.time += step;
      shared.uTime.value = this.time;
      this.world.update(this.time, step);
      for (const m of Object.values(this.mechs)) m.update && m.update(this.time, step);
    }
  }

  /** Finish any camera flight and fade at once (used by tests). */
  settle() {
    if (this.controls.flight) {
      const to = this.controls.flight.to;
      this.controls.jumpTo(to);
    }
    this.fade.set(this.fadeGoal);
    shared.uFocusAmt.value = this.focusAmtGoal;
  }

  _showTooltip(id) {
    const tt = this.tooltip;
    const L = LABELS[id];
    if (!L || this.controls.dragging) {
      tt.hidden = true;
      this.canvas.classList.remove('pointing');
      return;
    }
    let act = '';
    if (L.mech && this.mechs[L.mech]) act = this.mechs[L.mech].hint || 'Click to operate';
    else if (L.person) act = 'Click to greet, for notes, or to follow';
    else if (L.room && (!this.focus || this.focus.id !== L.room)) act = `Click to visit: ${ROOM_BY_ID[L.room]?.name ?? ''}`;
    tt.innerHTML = `<b>${L.term}</b><i>${L.gloss}</i>${act ? `<span class="act">${act}</span>` : ''}`;
    tt.hidden = false;
    const pad = 16;
    const w = tt.offsetWidth;
    const h = tt.offsetHeight;
    let x = this.hover.x + pad;
    let y = this.hover.y + pad;
    if (x + w > window.innerWidth - 8) x = this.hover.x - w - pad;
    if (y + h > window.innerHeight - 8) y = this.hover.y - h - pad;
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
    this.canvas.classList.toggle('pointing', !!(L.room || L.mech || L.person));
  }

  _updateHover(now) {
    const h = this.hover;
    if (h.x < 0 || this.controls.dragging || this.controls.flying) {
      if (this.controls.dragging) this._showTooltip(0);
      return;
    }
    if (!h.dirty && now - h.last < 250) return;
    if (now - h.last < 60) return;
    h.last = now;
    h.dirty = false;
    const x = h.x;
    const y = h.y;
    this.pipeline.pick(x, y).then((res) => {
      if (!res) return;
      h.label = res.label;
      this._showTooltip(res.label);
    });
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    const t0 = performance.now();

    // keep a followed person in the middle of the view
    if (this.following && !this.controls.flying) {
      const p = this.following.e.root.position;
      this.controls.goal.target.lerp(new THREE.Vector3(p.x, p.y + 1.1, p.z), 1 - Math.exp(-dt * 4));
    }
    this.controls.update(dt);
    // fades
    const k = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < GROUP_COUNT; i++) this.fade[i] += (this.fadeGoal[i] - this.fade[i]) * k;
    setFades(this.fade);
    shared.uFocusAmt.value += (this.focusAmtGoal - shared.uFocusAmt.value) * k;
    shared.uTime.value = this.time;
    shared.uCamPos.value.copy(this.camera.position);

    this.world.update(this.time, dt);
    for (const m of Object.values(this.mechs)) m.update && m.update(this.time, dt);
    this.panel.update && this.panel.update(this.time);

    this.pipeline.render(this.time);
    this.minimap.draw();
    this._updateHover(t0);
    const cpu = performance.now() - t0;
    this._adapt(cpu, dt);
    if (this.stats) this._updateStats(cpu);

    if (!this.ready) {
      this.ready = true;
      document.getElementById('loading').classList.add('done');
    }
  }

  /** Show or hide the frame-rate readout. */
  _toggleStats() {
    const el = document.getElementById('stats');
    this.stats = this.stats ? null : { el, frames: 0, cpu: 0, worst: 0, t0: performance.now(), last: performance.now() };
    el.hidden = !this.stats;
  }

  // fps over the last half second; cpu is the time spent in this loop (the
  // GPU works on after it returns); worst is the longest gap between frames
  _updateStats(cpu) {
    const s = this.stats;
    const now = performance.now();
    s.frames++;
    s.cpu += cpu;
    s.worst = Math.max(s.worst, now - s.last);
    s.last = now;
    if (now - s.t0 < 500) return;
    const p = this.pipeline;
    const fps = (s.frames * 1000) / (now - s.t0);
    s.el.textContent = [
      `${fps.toFixed(fps < 10 ? 1 : 0)} fps  worst ${s.worst.toFixed(0)} ms`,
      `cpu ${(s.cpu / s.frames).toFixed(1)} ms/frame`,
      `${p.calls} draws  ${(p.tris / 1000).toFixed(0)}k tris`,
      `${p.size.W}\u00d7${p.size.H}  scale ${p.scale.toFixed(2)}`,
    ].join('\n');
    s.frames = 0;
    s.cpu = 0;
    s.worst = 0;
    s.t0 = now;
  }

  // drop resolution a little if frames are slow
  _adapt(cpuMs, dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    const p = this.pipeline;
    if (avg > 1 / 45 && p.scale > 0.6) {
      p.scale = Math.max(0.6, p.scale - 0.15);
      p.resize();
    } else if (avg < 1 / 58 && p.scale < 1) {
      p.scale = Math.min(1, p.scale + 0.1);
      p.resize();
    }
  }
}

// distance along a ray from p (inside or outside) to where it leaves box b
function rayBoxExit(p, d, b) {
  let tMax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    if (Math.abs(d[ax]) < 1e-9) continue;
    const t1 = (b.min[ax] - p[ax]) / d[ax];
    const t2 = (b.max[ax] - p[ax]) / d[ax];
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  return tMax;
}

export { ROOMS };
