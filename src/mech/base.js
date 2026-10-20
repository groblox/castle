import * as THREE from 'three';
import { lab } from '../data/labels.js';
import { G } from '../castle/rooms.js';
import { partGeo, figureMaterial, mesh } from '../people/parts.js';

/**
 * Base for working mechanisms. Subclasses build their moving parts, keep
 * their state, and describe the panel controls:
 *   controls() -> [{ id, label, hold?, enabled?, next? }]
 *   act(id, down)  (down: true/false for hold buttons, undefined for clicks)
 *   status() -> short line describing the current state
 * `version` is bumped whenever the panel should redraw.
 */
export class Mechanism {
  constructor(app, opts) {
    this.app = app;
    this.id = opts.id;
    this.name = opts.name;
    this.room = opts.room;
    this.hint = opts.hint;
    this.version = 0;
    this.group = new THREE.Group();
    app.scene.add(this.group);
    this.lastUser = -1e9;
  }

  /** Make a mesh for a part, labelled so hovering names it and clicking operates it. */
  part(key, build, parent = this.group) {
    const id = lab(key, this.room, this.id);
    const m = mesh(partGeo(build), figureMaterial(id, G.people));
    parent.add(m);
    return m;
  }

  bump() {
    this.version++;
  }

  toast(msg, ms = 5200) {
    this.app.toast(msg, ms);
  }

  /** Mark user interaction (so automatic operators stand back). */
  touched() {
    this.lastUser = this.app.time;
  }
  get userActive() {
    return this.app.time - this.lastUser < 6;
  }

  /** Pointer drag on a crank: vertical (and some horizontal) drag turns it. */
  crankDrag(e, onTurn) {
    let lx = e.clientX;
    let ly = e.clientY;
    const self = this;
    return {
      moved: false,
      move(ev) {
        const dx = ev.clientX - lx;
        const dy = ev.clientY - ly;
        lx = ev.clientX;
        ly = ev.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 0) this.moved = true;
        self.touched();
        onTurn((dy + dx * 0.4) * 0.05);
      },
      end() {},
    };
  }

  controls() {
    return [];
  }
  act() {}
  status() {
    return '';
  }
  update() {}
}
