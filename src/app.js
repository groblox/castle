import * as THREE from 'three';
import { Pipeline } from './render/pipeline.js';
import { shared } from './render/material.js';
import { CutawayControls, DEG } from './ui/controls.js';
import { ROOMS, ROOM_BY_ID, GROUP_COUNT } from './castle/rooms.js';
import { LABELS } from './data/labels.js';
import { buildWorld } from './world.js';
import { Panel } from './ui/panel.js';
import { RoomList } from './ui/roomlist.js';

THREE.ColorManagement.enabled = false;

const OVERVIEW = { target: new THREE.Vector3(4, 1, -9), dist: 128, az: -10 * DEG, el: 21 * DEG };

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

    this.world = buildWorld(this.scene, this);
    this.panel = new Panel(this);
    this.roomList = new RoomList(this, document.getElementById('roomlist'));
    this._bindUI();

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
      if (e.key === 'Escape') {
        if (this.focus) this.overview();
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
      this.panel.showPerson(L.person);
      return;
    }
    if (L.room && ROOM_BY_ID[L.room]) {
      if (!this.focus || this.focus.id !== L.room) this.focusRoom(L.room);
      else this.panel.showRoom(this.focus);
    }
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
    let d = Math.max(size.x / 2 / Math.tan(hfov / 2), size.y / 2 / Math.tan(vfov / 2)) * fit * 1.45 + size.z * 0.8;
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
    this.focus = room;
    const v = this.roomView(room);
    const box = new THREE.Box3(v.min.clone().addScalar(-4), v.max.clone().addScalar(4));
    box.expandByPoint(v.target);
    this.controls.setLimits({
      az: [v.az - 35 * DEG, v.az + 35 * DEG],
      el: [Math.max(1 * DEG, v.el - 16 * DEG), v.el + 30 * DEG],
      dist: [Math.max(2.5, v.dist * 0.3), v.dist * 1.8],
      box,
    });
    if (opts.instant) this.controls.jumpTo(v);
    else this.controls.flyTo(v, 1.5);
    const m = room.view.margin ?? 1.6;
    shared.uFocusMin.value.copy(v.min).addScalar(-m);
    shared.uFocusMax.value.copy(v.max).addScalar(m);
    this.focusAmtGoal = 0.82;
    this.backBtn.hidden = false;
    this.roomList.setActive(id);
    if (!opts.keepPanel) this.panel.showRoom(room);
  }

  overview(opts = {}) {
    this.focus = null;
    this.controls.setLimits(null);
    if (opts.instant) this.controls.jumpTo({ ...OVERVIEW, target: OVERVIEW.target.clone() });
    else this.controls.flyTo({ ...OVERVIEW, target: OVERVIEW.target.clone() }, 1.5);
    this.focusAmtGoal = 0;
    this.backBtn.hidden = true;
    this.roomList.setActive(null);
    this.panel.hide();
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
    else if (L.person) act = 'Click for notes on this servant';
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

    this.controls.update(dt);
    // fades
    const k = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < GROUP_COUNT; i++) this.fade[i] += (this.fadeGoal[i] - this.fade[i]) * k;
    shared.uFade.value.set(this.fade);
    shared.uFocusAmt.value += (this.focusAmtGoal - shared.uFocusAmt.value) * k;
    shared.uTime.value = this.time;
    shared.uCamPos.value.copy(this.camera.position);

    this.world.update(this.time, dt);
    for (const m of Object.values(this.mechs)) m.update && m.update(this.time, dt);
    this.panel.update && this.panel.update(this.time);

    this.pipeline.render(this.time);
    this._updateHover(t0);
    this._adapt(performance.now() - t0, dt);

    if (!this.ready) {
      this.ready = true;
      document.getElementById('loading').classList.add('done');
    }
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

export { ROOMS };
