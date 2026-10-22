import * as THREE from 'three';
import { K } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { obox, v3 } from '../geom/shapes.js';
import { partGeo, figureMaterial, mesh, node } from './parts.js';

// A procedural figure in medieval working dress: tunic (cote) to the knee or
// a long gown, hose, hood or coif, optional apron. Body parts are smooth
// surfaces of revolution (flattened front to back, with pleats in the skirts)
// so the ink pass draws their outlines rather than their facets. Joints are
// plain Object3D nodes animated by named poses. The figure faces +z locally.

const SKIN = [0xe6c3a0, 0xd9b08c, 0xecc9a6, 0xc99d7a];
const TAU = Math.PI * 2;
const _mat = new THREE.Matrix4();

/**
 * Smooth surface of revolution about y. profile: [[r, y], ...] bottom to top.
 * sx/sz squash the section into an ellipse; `folds` adds that many vertical
 * pleats of relative depth `foldAmp`, growing towards the bottom. With `arc`
 * only the front part, from -arc to +arc radians, is made (aprons, bibs).
 */
function rev(b, profile, o = {}) {
  const seg = o.seg ?? 16;
  const sx = o.sx ?? 1;
  const sz = o.sz ?? 1;
  const folds = o.folds ?? 0;
  const amp = o.foldAmp ?? 0;
  const arc = o.arc ?? 0;
  const y0 = profile[0][1];
  const y1 = profile[profile.length - 1][1];
  const pos = [];
  for (const [r, y] of profile) {
    const k = folds ? (y1 - y) / (y1 - y0 || 1) : 0;
    for (let i = 0; i <= seg; i++) {
      const a = arc ? -arc + (i / seg) * 2 * arc : (i / seg) * TAU;
      const rr = Math.max(r, 0.0005) * (1 + amp * k * Math.cos(a * folds));
      pos.push(Math.sin(a) * rr * sx, y, Math.cos(a) * rr * sz);
    }
  }
  const idx = [];
  const row = seg + 1;
  for (let j = 0; j < profile.length - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * row + i;
      const c = a + row;
      idx.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the seam column is duplicated; average its normals so it does not show
  const n = g.attributes.normal;
  for (let j = 0; j < profile.length && !arc; j++) {
    const a = j * row;
    const c = a + seg;
    const v = new THREE.Vector3(n.getX(a) + n.getX(c), n.getY(a) + n.getY(c), n.getZ(a) + n.getZ(c)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(c, v.x, v.y, v.z);
  }
  _mat.makeRotationY(o.rot ?? 0).setPosition(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  b.addGeometry(g, _mat, { color: o.color, kind: o.kind ?? K.CLOTH });
  g.dispose();
}

/** A rounded, tapering limb hanging from its joint at the origin to -len. */
function limb(b, len, r0, r1, color, kind = K.CLOTH, mid = null) {
  const p = [[0, -len - r1 * 0.95], [r1 * 0.6, -len - r1 * 0.8], [r1, -len - r1 * 0.2], [r1, -len]];
  if (mid) p.push(...mid);
  p.push([r0, -r0 * 0.3], [r0 * 0.85, r0 * 0.5], [r0 * 0.5, r0 * 0.85], [0, r0]);
  rev(b, p, { color, kind, seg: 12 });
}

export class Figure {
  constructor(spec, label, group) {
    this.spec = spec;
    const s = spec.scale ?? 1;
    this.s = s;
    const mat = figureMaterial(label, group);
    this.mat = mat;
    const skin = spec.skin ?? SKIN[0];
    const tunic = spec.tunic ?? 0x8a6a4a;
    const hose = spec.hose ?? 0x5a5048;
    const sleeve = spec.sleeve ?? tunic;
    const shoes = spec.shoes ?? 0x3a2a1e;

    const root = new THREE.Group();
    root.scale.setScalar(s);
    this.root = root;
    const hips = node(root, 0, 0.92, 0);
    const spine = node(hips, 0, 0, 0);
    const j = { hips, spine };
    this.j = j;
    this.hipY = 0.92;
    // a per-figure offset so that idle movements are not in step
    this.seed = spec.seed ?? ((Figure.count = (Figure.count ?? 0) + 1) * 2.399) % (Math.PI * 2);
    this.radius = 0.27 * s; // personal space for the crowd

    // torso: chest, shoulders and waist, flattened front to back
    spine.add(mesh(partGeo((b) => {
      rev(b, [[0.155, -0.05], [0.158, 0.06], [0.17, 0.18], [0.19, 0.31], [0.198, 0.4], [0.18, 0.47], [0.13, 0.515], [0.065, 0.545]], { color: tunic, sz: 0.72, seg: 18 });
      if (spec.quilt) {
        // the stitched channels of a quilted aketon
        for (const y of [0.04, 0.15, 0.26, 0.37]) {
          rev(b, [[0.158 + y * 0.12, y - 0.012], [0.164 + y * 0.12, y], [0.158 + y * 0.12, y + 0.012]], { color: spec.quilt, sz: 0.73, seg: 18 });
        }
      }
      if (spec.apron) rev(b, [[0.168, 0.16], [0.198, 0.31], [0.2, 0.4]], { color: spec.apron, sz: 0.74, arc: 0.75, seg: 8 }); // bib
      if (spec.cross) {
        // the red cross of St George on the breast and back
        b.with({ kind: K.CLOTH, color: spec.cross }, () => {
          for (const zs of [1, -1]) {
            obox(b, 0, 0.27, zs * 0.142, 0.06, 0.32, 0.012, 0);
            obox(b, 0, 0.3, zs * 0.142, 0.24, 0.06, 0.012, 0);
          }
        });
      }
      if (spec.fur) rev(b, [[0.2, 0.36], [0.17, 0.47], [0.11, 0.53], [0.075, 0.55]], { color: spec.fur, kind: K.FUR, sz: 0.8, seg: 20 }); // fur collar
      if (spec.cape) rev(b, [[0.27, 0.3], [0.25, 0.4], [0.17, 0.49], [0.08, 0.545]], { color: spec.cape, sz: 0.8, folds: 8, foldAmp: 0.06, seg: 24 });
    }), mat));

    // skirts of the tunic or gown, pleated, with the belt
    const long = spec.gown ? 0.84 : 0.46;
    hips.add(mesh(partGeo((b) => {
      const hem = spec.gown ? 0.31 : 0.29;
      rev(b, [[hem * 0.94, -long - 0.005], [hem, -long], [hem * 0.93, -long * 0.68], [0.215, -long * 0.32], [0.18, -0.08], [0.162, 0.02]], {
        color: spec.gownColor ?? tunic, sz: 0.8, folds: 9, foldAmp: 0.07, seg: 36,
      });
      rev(b, [[0.163, -0.03], [0.167, -0.02], [0.167, 0.03], [0.162, 0.04]], { color: spec.belt ?? 0x4a3a2a, sz: 0.74, seg: 18 });
      if (spec.apron) rev(b, [[0.29, -0.47], [0.275, -0.32], [0.225, -0.15], [0.18, 0.0]], { color: spec.apron, sz: 0.84, arc: 0.85, seg: 10, folds: 3, foldAmp: 0.05 });
      if (spec.purse) lump(b, 0.15, -0.1, 0.07, 0.04, 0.06, 0.025, 0x6b4a30);
      if (spec.sword) {
        // a short sword or long knife (baselard) at the left hip
        b.with({ kind: K.METAL, color: 0x8a8880 }, () => obox(b, 0.19, -0.05, 0.02, 0.03, 0.06, 0.03, 0));
        b.with({ kind: K.TIMBER, color: 0x4a3626 }, () => obox(b, 0.2, -0.33, -0.03, 0.035, 0.5, 0.05, 0));
      }
    }), mat));

    // head
    const neck = node(spine, 0, 0.53, 0);
    j.neck = neck;
    neck.add(mesh(partGeo((b) => {
      rev(b, [[0.05, -0.02], [0.048, 0.08]], { color: skin, kind: K.SKIN, seg: 10 });
      rev(b, [[0, 0.055], [0.055, 0.068], [0.083, 0.1], [0.099, 0.15], [0.104, 0.2], [0.096, 0.245], [0.072, 0.282], [0.036, 0.3], [0, 0.305]], { color: skin, kind: K.SKIN, sz: 1.08 });
      b.with({ kind: K.SKIN }, () => {
        lump(b, 0, 0.16, 0.112, 0.018, 0.035, 0.022, 0xd8a888, K.SKIN); // nose
        if (!spec.hood && !spec.veil && !spec.mail) {
          lump(b, 0.099, 0.175, 0.0, 0.012, 0.025, 0.017, skin, K.SKIN); // ears
          lump(b, -0.099, 0.175, 0.0, 0.012, 0.025, 0.017, skin, K.SKIN);
        }
      });
      lump(b, 0.037, 0.19, 0.098, 0.014, 0.011, 0.008, 0x2a2018);
      lump(b, -0.037, 0.19, 0.098, 0.014, 0.011, 0.008, 0x2a2018);
      if (spec.beard) lump(b, 0, 0.105, 0.05, 0.082, 0.065, 0.072, spec.hair ?? 0x5a4030, K.FUR);
      if (spec.hair && !spec.veil && !spec.mail) lump(b, 0, 0.215, -0.022, 0.11, 0.1, 0.112, spec.hair, K.FUR);
      if (spec.hood) {
        lump(b, 0, 0.2, -0.018, 0.124, 0.132, 0.124, spec.hood, K.CLOTH);
        rev(b, [[0.25, -0.12], [0.235, -0.07], [0.17, 0.01], [0.1, 0.08], [0.085, 0.1]], { color: spec.hood, sz: 0.85, folds: 7, foldAmp: 0.06, seg: 24 }); // gorget
        b.with({ kind: K.CLOTH, color: spec.hood }, () => obox(b, 0, 0.27, -0.15, 0.05, 0.05, 0.14, 0)); // liripipe
      }
      if (spec.coif) {
        lump(b, 0, 0.212, -0.01, 0.11, 0.1, 0.117, spec.coif, K.CLOTH);
        b.with({ kind: K.CLOTH, color: spec.coif }, () => {
          obox(b, 0.085, 0.13, 0.02, 0.02, 0.1, 0.04, 0);
          obox(b, -0.085, 0.13, 0.02, 0.02, 0.1, 0.04, 0);
        });
      }
      if (spec.veil) {
        lump(b, 0, 0.21, -0.02, 0.117, 0.112, 0.122, spec.veil, K.CLOTH);
        rev(b, [[0.15, -0.06], [0.14, 0.05], [0.12, 0.14], [0.11, 0.2]], { color: spec.veil, sz: 0.9, z: -0.035, folds: 5, foldAmp: 0.05 });
        rev(b, [[0.09, -0.02], [0.085, 0.06], [0.08, 0.12]], { color: spec.veil, seg: 14 }); // wimple
      }
      if (spec.mail) {
        // mail coif and its skirt over the shoulders
        lump(b, 0, 0.205, -0.015, 0.117, 0.122, 0.12, spec.mail, K.METAL);
        rev(b, [[0.22, -0.1], [0.2, -0.05], [0.13, 0.04], [0.095, 0.1]], { color: spec.mail, kind: K.METAL, sz: 0.85, seg: 20 });
      }
      if (spec.kettle) {
        // kettle hat (chapel de fer): iron dome and broad brim
        rev(b, [[0.112, 0.195], [0.2, 0.19], [0.205, 0.205], [0.125, 0.222], [0.124, 0.26], [0.105, 0.31], [0.062, 0.34], [0, 0.35]], { color: spec.kettle, kind: K.METAL, seg: 20 });
      }
      if (spec.cap) lump(b, 0, 0.245, -0.012, 0.112, 0.062, 0.114, spec.cap, K.CLOTH);
      if (spec.crown) {
        // a gold circlet with fleurons
        const g = spec.crown === true ? 0xd8b04a : spec.crown;
        rev(b, [[0.112, 0.235], [0.116, 0.245], [0.116, 0.285], [0.112, 0.29]], { color: g, kind: K.METAL, seg: 20, sz: 1.06 });
        b.with({ kind: K.METAL, color: g }, () => {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            obox(b, Math.sin(a) * 0.116, 0.305, Math.cos(a) * 0.123, 0.026, 0.04, 0.012, a);
          }
        });
      }
    }), mat));

    // arms
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 0.215 : -0.215;
      const sh = node(spine, sx, 0.46, 0);
      sh.add(mesh(partGeo((b) => limb(b, 0.29, 0.07, 0.056, sleeve, K.CLOTH, [[0.064, -0.15]])), mat));
      const el = node(sh, 0, -0.3, 0);
      el.add(mesh(partGeo((b) => {
        limb(b, 0.24, 0.055, 0.04, sleeve, K.CLOTH, [[0.05, -0.1]]);
        rev(b, [[0.034, -0.27], [0.03, -0.23]], { color: skin, kind: K.SKIN, seg: 10 }); // wrist
        lump(b, 0, -0.305, 0.008, 0.042, 0.058, 0.03, skin, K.SKIN); // hand
        lump(b, side === 'L' ? -0.03 : 0.03, -0.28, 0.025, 0.016, 0.03, 0.016, skin, K.SKIN); // thumb
      }), mat));
      const hand = node(el, 0, -0.31, 0.01);
      j[`sh${side}`] = sh;
      j[`el${side}`] = el;
      j[`hand${side}`] = hand;
    }

    // legs
    for (const side of ['L', 'R']) {
      const hx = side === 'L' ? 0.082 : -0.082;
      const hp = node(hips, hx, 0, 0);
      hp.add(mesh(partGeo((b) => limb(b, 0.44, 0.072, 0.058, hose, K.CLOTH, [[0.068, -0.3], [0.078, -0.15]])), mat));
      const kn = node(hp, 0, -0.44, 0);
      kn.add(mesh(partGeo((b) => {
        rev(b, [[0.038, -0.41], [0.04, -0.37], [0.05, -0.3], [0.062, -0.19], [0.061, -0.09], [0.056, 0], [0.04, 0.045], [0, 0.058]], { color: hose, seg: 12 });
        // shoe, slightly pointed at the toe
        lump(b, 0, -0.44, 0.05, 0.055, 0.045, 0.135, shoes, K.PLAIN);
        lump(b, 0, -0.415, -0.0, 0.048, 0.05, 0.06, shoes, K.PLAIN);
      }), mat));
      j[`hip${side}`] = hp;
      j[`kn${side}`] = kn;
    }
    // a slot on the right shoulder for carried sacks
    j.shoulderSlot = node(spine, -0.12, 0.6, -0.02);
    // and one before the chest for armfuls (logs, baskets)
    j.front = node(spine, 0, 0.26, 0.3);
    // an upright spear in the right hand, things slung on the back, at the hip
    j.spear = node(spine, -0.22, 0.07, 0.33);
    j.back = node(spine, 0, 0.3, -0.17);
    j.hip = node(hips, -0.2, -0.12, 0.02);
  }

  set label(id) {
    this.mat.uniforms.uLabelOverride.value = id;
  }

  /** Attach a prop mesh to a joint (by name). Returns the prop. */
  hold(slot, prop) {
    this.release(slot);
    if (!prop) return null;
    this.j[slot].add(prop);
    this.j[slot].userData.prop = prop;
    return prop;
  }
  release(slot) {
    const p = this.j[slot].userData.prop;
    if (p) this.j[slot].remove(p);
    this.j[slot].userData.prop = null;
  }

  reset() {
    const j = this.j;
    for (const k of JOINTS) j[k].rotation.set(0, 0, 0);
    j.hips.position.set(0, this.hipY, 0);
    j.front.position.set(0, 0.26, 0.3);
    j.front.rotation.set(0, 0, 0);
    j.shL.rotation.z = 0.06;
    j.shR.rotation.z = -0.06;
  }

  /** Look towards a world point {x, y, z} (or null) with the head, as far as the neck allows. */
  lookAt(p) {
    this.lookTarget = p;
  }

  /**
   * Set a named pose. t: seconds; p: optional parameters (phase, angle...).
   * p.stepAmt scales the stride (0 standing, 1 an ordinary walk). A change
   * of pose blends over a fraction of a second rather than snapping.
   */
  pose(name, t, p = {}) {
    const j = this.j;
    const key = name + (p.moving === false ? ':still' : '');
    if (key !== this._key) {
      if (this._key !== undefined) {
        // remember where every joint was, and ease out of it
        this._snap = JOINTS.map((k) => [j[k].rotation.x, j[k].rotation.y, j[k].rotation.z]);
        this._snapHips = j.hips.position.clone();
        this._snapFront = j.front.position.clone();
        this._blend0 = t;
        this._blendDur = p.blend ?? 0.32;
      }
      this._key = key;
    }
    const dt = this._lastT === undefined ? 0 : Math.min(0.1, Math.max(0, t - this._lastT));
    this._lastT = t;
    this.reset();
    this._pose(name, t, p);
    this._look(t, dt, name);
    if (this._snap) {
      const k = (t - this._blend0) / this._blendDur;
      if (k >= 1 || k < 0) this._snap = null;
      else {
        const w = k * k * (3 - 2 * k);
        JOINTS.forEach((n, i) => {
          const r = j[n].rotation;
          const s0 = this._snap[i];
          r.set(s0[0] + (r.x - s0[0]) * w, s0[1] + (r.y - s0[1]) * w, s0[2] + (r.z - s0[2]) * w);
        });
        j.hips.position.lerpVectors(this._snapHips, j.hips.position, w);
        j.front.position.lerpVectors(this._snapFront, j.front.position, w);
      }
    }
  }

  // turn the head (and a little the shoulders) towards lookTarget
  _look(t, dt, name) {
    const j = this.j;
    let goal = 0;
    const tg = this.lookTarget;
    if (tg && !NO_LOOK.has(name)) {
      const r = this.root;
      let a = Math.atan2(tg.x - r.position.x, tg.z - r.position.z) - r.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) < 1.9) goal = Math.max(-1.15, Math.min(1.15, a));
    }
    this.lookYaw = (this.lookYaw ?? 0) + (goal - (this.lookYaw ?? 0)) * Math.min(1, dt * 4);
    const y = this.lookYaw;
    if (Math.abs(y) > 1e-3) {
      j.neck.rotation.y = j.neck.rotation.y * (1 - Math.min(1, Math.abs(y) * 1.5)) + y * 0.75;
      j.spine.rotation.y += y * 0.25;
    }
  }

  _pose(name, t, p) {
    const j = this.j;
    const breath = Math.sin(t * 1.7 + this.seed) * 0.015;
    j.spine.rotation.x = breath;
    const step = p.stepAmt ?? 1;
    const ph = p.phase ?? 0;
    // Legs and pelvis through a stride. The thighs swing, the knee folds in
    // the swing so the foot clears the ground, the pelvis turns with the
    // forward leg and dips on the swing side, the body rises over the
    // standing leg, and the shoulders turn against the hips.
    const walkLegs = (phase, amp = 0.42) => {
      const a = amp * step;
      if (a < 1e-3) {
        stand();
        return 0;
      }
      const sn = Math.sin(phase);
      const cs = Math.cos(phase);
      const swingL = Math.pow(Math.max(0, Math.cos(phase + 0.35)), 1.6);
      const swingR = Math.pow(Math.max(0, Math.cos(phase + Math.PI + 0.35)), 1.6);
      j.hipL.rotation.x = -sn * a;
      j.hipR.rotation.x = sn * a;
      j.knL.rotation.x = a * (1.5 * swingL + 0.12);
      j.knR.rotation.x = a * (1.5 * swingR + 0.12);
      const k = a / 0.42;
      j.hips.rotation.y = -sn * a * 0.22;
      j.hips.rotation.z = -cs * 0.035 * k;
      j.hips.position.x = -cs * 0.018 * k;
      j.hips.position.y = this.hipY - (1 - Math.abs(cs)) * 0.032 * k - 0.006 * k;
      j.spine.rotation.y = sn * a * 0.36;
      j.spine.rotation.z = cs * 0.04 * k;
      j.spine.rotation.x += 0.045 * Math.min(1.2, k);
      // keep the eyes level and looking ahead
      j.neck.rotation.x = -0.03 * k;
      j.neck.rotation.y = -(j.hips.rotation.y + j.spine.rotation.y) * 0.8;
      return sn;
    };
    // standing at ease: weight shifting slowly from foot to foot
    const stand = (amt = 1) => {
      const w = Math.sin(t * 0.37 + this.seed * 2.1) * amt;
      j.hips.position.x = w * 0.02;
      j.hips.rotation.z = w * 0.03;
      j.spine.rotation.z = -w * 0.035;
      const bend = Math.max(0, -w) * 0.12;
      const bend2 = Math.max(0, w) * 0.12;
      j.knL.rotation.x = bend;
      j.hipL.rotation.x = -bend * 0.5;
      j.knR.rotation.x = bend2;
      j.hipR.rotation.x = -bend2 * 0.5;
      j.hips.position.y = this.hipY - 0.004;
    };
    const armsSwing = (sn, amt = 0.85) => {
      const a = (p.stepAmt ?? 1) * 0.42 * amt;
      j.shL.rotation.x = sn * a;
      j.shR.rotation.x = -sn * a;
      j.elL.rotation.x = -0.18 - Math.max(0, -j.shL.rotation.x) * 0.9;
      j.elR.rotation.x = -0.18 - Math.max(0, -j.shR.rotation.x) * 0.9;
      j.shL.rotation.z = 0.09;
      j.shR.rotation.z = -0.09;
    };
    const legsStill = p.moving === false;
    switch (name) {
      case 'walk': {
        const sn = walkLegs(ph);
        armsSwing(sn);
        break;
      }
      case 'run': {
        // longer, faster strides, a forward lean, arms bent and pumping
        const a = 0.7 * Math.min(1.3, step);
        const sn = Math.sin(ph);
        const cs = Math.cos(ph);
        j.hipL.rotation.x = -sn * a - 0.1;
        j.hipR.rotation.x = sn * a - 0.1;
        j.knL.rotation.x = a * (1.9 * Math.pow(Math.max(0, Math.cos(ph + 0.5)), 1.3) + 0.25);
        j.knR.rotation.x = a * (1.9 * Math.pow(Math.max(0, Math.cos(ph + Math.PI + 0.5)), 1.3) + 0.25);
        j.hips.position.y = this.hipY - 0.06 + Math.abs(cs) * 0.05;
        j.hips.rotation.y = -sn * 0.15;
        j.spine.rotation.y = sn * 0.3;
        j.spine.rotation.x = 0.22;
        j.neck.rotation.x = -0.15;
        j.shL.rotation.x = sn * 0.75;
        j.shR.rotation.x = -sn * 0.75;
        j.elL.rotation.x = j.elR.rotation.x = -1.35;
        j.shL.rotation.z = 0.12;
        j.shR.rotation.z = -0.12;
        break;
      }
      case 'carry': // something held before the body in both hands
        if (legsStill) stand(0.5);
        else walkLegs(ph, 0.36);
        j.shL.rotation.x = j.shR.rotation.x = -0.55;
        j.elL.rotation.x = j.elR.rotation.x = -0.95;
        j.shL.rotation.z = 0.25;
        j.shR.rotation.z = -0.25;
        j.spine.rotation.x -= 0.04;
        break;
      case 'pails': { // a pail in each hand, swinging a little
        const sn = legsStill ? (stand(0.4), 0) : walkLegs(ph, 0.32);
        j.shL.rotation.z = 0.22;
        j.shR.rotation.z = -0.22;
        j.shL.rotation.x = sn * 0.08;
        j.shR.rotation.x = -sn * 0.08;
        j.elL.rotation.x = j.elR.rotation.x = -0.05;
        j.spine.rotation.x = 0.04;
        break;
      }
      case 'shoulder': { // sack on the right shoulder
        const sn = legsStill ? (stand(0.4), 0) : walkLegs(ph, 0.34);
        j.shR.rotation.x = -2.5;
        j.shR.rotation.z = -0.35;
        j.elR.rotation.x = -1.4;
        j.shL.rotation.x = sn * 0.3;
        j.elL.rotation.x = -0.2;
        j.spine.rotation.z += 0.08;
        j.spine.rotation.x += 0.08;
        break;
      }
      case 'stir': {
        const a = t * (p.speed ?? 2.4);
        stand(0.4);
        j.spine.rotation.x = 0.18 + Math.sin(a) * 0.03;
        j.spine.rotation.y = Math.sin(a) * 0.08;
        j.shR.rotation.x = -0.95 + Math.sin(a) * 0.18;
        j.shR.rotation.z = -0.15 + Math.cos(a) * 0.12;
        j.elR.rotation.x = -0.55;
        j.shL.rotation.x = -0.85 + Math.sin(a) * 0.15;
        j.shL.rotation.z = 0.15 + Math.cos(a) * 0.1;
        j.elL.rotation.x = -0.65;
        break;
      }
      case 'knead': {
        const a = Math.sin(t * 3.2);
        j.spine.rotation.x = 0.4 + a * 0.08;
        j.shL.rotation.x = j.shR.rotation.x = -0.75 - a * 0.25;
        j.elL.rotation.x = j.elR.rotation.x = -0.35 + a * 0.2;
        j.shL.rotation.z = 0.2;
        j.shR.rotation.z = -0.2;
        j.knL.rotation.x = j.knR.rotation.x = 0.08 + a * 0.04;
        j.hips.position.y = this.hipY - 0.01 - a * 0.008;
        break;
      }
      case 'chop': {
        const a = Math.max(0, Math.sin(t * 4.5));
        stand(0.3);
        j.spine.rotation.x = 0.2 + a * 0.05;
        j.shR.rotation.x = -0.6 - a * 1.4;
        j.elR.rotation.x = -0.6 - a * 0.5;
        j.shL.rotation.x = -0.7;
        j.elL.rotation.x = -0.5;
        j.shL.rotation.z = 0.25;
        j.neck.rotation.x = 0.25;
        break;
      }
      case 'scrub': {
        const a = Math.sin(t * 5);
        j.spine.rotation.x = 0.55;
        j.spine.rotation.y = a * 0.06;
        j.hipL.rotation.x = j.hipR.rotation.x = -0.15;
        j.knL.rotation.x = j.knR.rotation.x = 0.25;
        j.hips.position.y = this.hipY - 0.04;
        j.shL.rotation.x = j.shR.rotation.x = -0.6;
        j.shL.rotation.z = 0.15 + a * 0.15;
        j.shR.rotation.z = -0.15 + a * 0.15;
        j.elL.rotation.x = j.elR.rotation.x = -0.4;
        break;
      }
      case 'crank': { // p.angle: crank angle; turning with the right hand
        const a = p.angle ?? t * 3;
        stand(0.2);
        j.spine.rotation.x = 0.15 + Math.sin(a) * 0.05;
        j.shR.rotation.x = -0.75 + Math.sin(a) * 0.35;
        j.elR.rotation.x = -0.55 - Math.cos(a) * 0.35;
        j.shR.rotation.z = -0.1;
        j.shL.rotation.x = -0.2;
        if (p.both) {
          j.shL.rotation.x = -0.75 + Math.sin(a + Math.PI) * 0.35;
          j.elL.rotation.x = -0.55 - Math.cos(a + Math.PI) * 0.35;
        }
        break;
      }
      case 'sit':
        j.hipL.rotation.x = j.hipR.rotation.x = -1.45;
        j.knL.rotation.x = j.knR.rotation.x = 1.45;
        j.hips.position.y = p.seat ?? 0.48;
        j.spine.rotation.x = 0.1 + breath;
        j.shL.rotation.x = j.shR.rotation.x = -0.35;
        j.elL.rotation.x = j.elR.rotation.x = -0.7;
        j.neck.rotation.y = Math.sin(t * 0.3 + this.seed) * 0.25;
        break;
      case 'sitCrank': {
        const a = p.angle ?? t * 3;
        j.hipL.rotation.x = j.hipR.rotation.x = -1.45;
        j.knL.rotation.x = j.knR.rotation.x = 1.4;
        j.hips.position.y = p.seat ?? 0.48;
        j.spine.rotation.x = 0.2;
        j.shR.rotation.x = -0.9 + Math.sin(a) * 0.35;
        j.elR.rotation.x = -0.4 - Math.cos(a) * 0.35;
        j.shL.rotation.x = -0.35;
        j.elL.rotation.x = -0.9;
        break;
      }
      case 'sitWork': { // seated, working at something in the lap or on a table
        const a = Math.sin(t * (p.speed ?? 3) + this.seed);
        j.hipL.rotation.x = j.hipR.rotation.x = -1.45;
        j.knL.rotation.x = j.knR.rotation.x = 1.45;
        j.hips.position.y = p.seat ?? 0.48;
        j.spine.rotation.x = 0.3;
        j.neck.rotation.x = 0.35;
        j.shL.rotation.x = -0.75;
        j.elL.rotation.x = -1.0;
        j.shR.rotation.x = -0.7 + a * 0.12;
        j.elR.rotation.x = -1.05 - a * 0.15;
        j.shL.rotation.z = 0.2;
        j.shR.rotation.z = -0.2 + a * 0.06;
        break;
      }
      case 'dice': { // seated at a table, throwing now and then
        const throwK = Math.max(0, Math.sin(t * 1.3 + this.seed * 3)) ** 6;
        j.hipL.rotation.x = j.hipR.rotation.x = -1.45;
        j.knL.rotation.x = j.knR.rotation.x = 1.45;
        j.hips.position.y = p.seat ?? 0.48;
        j.spine.rotation.x = 0.25 + throwK * 0.15;
        j.shL.rotation.x = -0.9;
        j.elL.rotation.x = -0.9;
        j.shR.rotation.x = -0.9 - throwK * 0.6;
        j.elR.rotation.x = -0.6 + throwK * 0.4;
        j.neck.rotation.x = 0.3;
        j.neck.rotation.y = Math.sin(t * 0.5 + this.seed) * 0.3;
        break;
      }
      case 'stoop': { // bend to pick up or put down
        const k = p.amount ?? 1;
        j.spine.rotation.x = 0.85 * k;
        j.hipL.rotation.x = j.hipR.rotation.x = -0.35 * k;
        j.knL.rotation.x = j.knR.rotation.x = 0.7 * k;
        j.hips.position.y = this.hipY - 0.16 * k;
        j.shL.rotation.x = j.shR.rotation.x = -0.6 * k;
        j.shL.rotation.z = 0.15;
        j.shR.rotation.z = -0.15;
        j.neck.rotation.x = 0.2 * k;
        break;
      }
      case 'kneel': // down on one knee
        j.hipR.rotation.x = -1.5;
        j.knR.rotation.x = 1.5;
        j.hipL.rotation.x = 0.05;
        j.knL.rotation.x = 1.55;
        j.hips.position.y = this.hipY - 0.42;
        j.spine.rotation.x = 0.2;
        j.shL.rotation.x = j.shR.rotation.x = -0.5;
        j.elL.rotation.x = j.elR.rotation.x = -0.6;
        j.neck.rotation.x = 0.2;
        break;
      case 'reach': // place something on a table
        stand(0.3);
        j.spine.rotation.x = 0.3;
        j.shL.rotation.x = j.shR.rotation.x = -1.0;
        j.elL.rotation.x = j.elR.rotation.x = -0.25;
        j.neck.rotation.x = 0.2;
        break;
      case 'pour':
        j.spine.rotation.x = 0.35;
        j.shL.rotation.x = j.shR.rotation.x = -1.1;
        j.elL.rotation.x = j.elR.rotation.x = -0.5;
        j.shL.rotation.z = 0.3;
        j.shR.rotation.z = -0.3;
        break;
      case 'taste':
        stand(0.4);
        j.shR.rotation.x = -1.1;
        j.elR.rotation.x = -1.9;
        j.shR.rotation.z = 0.1;
        j.neck.rotation.x = 0.1;
        break;
      case 'tap': // holding a jug under a tap
        j.spine.rotation.x = 0.25;
        j.shR.rotation.x = -0.75;
        j.elR.rotation.x = -0.75;
        j.shL.rotation.x = -0.9;
        j.elL.rotation.x = -0.4;
        j.knL.rotation.x = j.knR.rotation.x = 0.1;
        break;
      case 'write': {
        const a = Math.sin(t * 6) * 0.06;
        stand(0.2);
        j.spine.rotation.x = 0.22;
        j.neck.rotation.x = 0.25;
        j.shR.rotation.x = -0.7 + a;
        j.elR.rotation.x = -0.9;
        j.shL.rotation.x = -0.6;
        j.elL.rotation.x = -1.0;
        j.shL.rotation.z = 0.2;
        break;
      }
      case 'tally': { // notching a tally stick
        const a = Math.max(0, Math.sin(t * 5)) * 0.25;
        stand(0.4);
        j.neck.rotation.x = 0.3;
        j.shL.rotation.x = -0.7;
        j.elL.rotation.x = -1.1;
        j.shR.rotation.x = -0.75 - a;
        j.elR.rotation.x = -1.0 + a;
        break;
      }
      case 'sentry': { // walking or standing with an upright spear in the right hand
        const sn = legsStill ? (stand(0.6), 0) : walkLegs(ph, 0.38);
        j.shL.rotation.x = sn * 0.35;
        j.elL.rotation.x = -0.2 - Math.max(0, -sn) * 0.3;
        j.shR.rotation.x = -0.15;
        j.elR.rotation.x = -1.1;
        j.shR.rotation.z = -0.05;
        if (legsStill) j.neck.rotation.y = Math.sin(t * 0.5 + this.seed) * 0.55;
        break;
      }
      case 'guard': // standing to attention at a post, spear grounded
        j.shR.rotation.x = -0.15;
        j.elR.rotation.x = -1.1;
        j.shL.rotation.z = 0.04;
        j.elL.rotation.x = -0.1;
        j.neck.rotation.y = Math.sign(Math.sin(t * 0.21 + this.seed)) * 0.35 * (Math.sin(t * 0.21 + this.seed) ** 2);
        j.hips.position.y = this.hipY;
        break;
      case 'look':
        stand();
        j.neck.rotation.y = Math.sin(t * 0.6 + this.seed) * 0.5;
        break;
      case 'wipe':
        stand(0.5);
        j.shR.rotation.x = -2.2;
        j.elR.rotation.x = -1.6;
        j.shR.rotation.z = -0.2 + Math.sin(t * 6) * 0.1;
        break;
      case 'rake': { // drawing a long tool towards the body
        const a = Math.sin(t * 2.4);
        j.spine.rotation.x = 0.35 + a * 0.1;
        j.shL.rotation.x = -0.7 - a * 0.3;
        j.shR.rotation.x = -0.5 - a * 0.3;
        j.elL.rotation.x = -0.4;
        j.elR.rotation.x = -0.6;
        j.hipL.rotation.x = -0.3;
        j.knL.rotation.x = 0.15;
        j.knR.rotation.x = 0.2;
        j.hips.position.y = this.hipY - 0.02;
        break;
      }
      case 'fork': { // pitching hay or dung with a fork: dig, lift, turn and throw
        const c = (t * 0.8 + this.seed) % 1;
        const dig = c < 0.4 ? c / 0.4 : 1;
        const lift = c < 0.4 ? 0 : c < 0.75 ? (c - 0.4) / 0.35 : 1 - (c - 0.75) / 0.25;
        j.spine.rotation.x = 0.55 - lift * 0.45 + (1 - dig) * 0.1;
        j.spine.rotation.y = lift * 0.6;
        j.shL.rotation.x = -0.6 - lift * 0.5;
        j.shR.rotation.x = -0.3 - lift * 0.9;
        j.elL.rotation.x = -0.5;
        j.elR.rotation.x = -0.7;
        j.knL.rotation.x = j.knR.rotation.x = 0.25 - lift * 0.15;
        j.hipL.rotation.x = -0.25;
        j.hips.position.y = this.hipY - 0.05 + lift * 0.03;
        break;
      }
      case 'saw': { // working a two-man saw: p.top stands above, the other below
        const a = Math.sin(t * 2.2);
        if (p.top) {
          j.spine.rotation.x = 0.45 + a * 0.12;
          j.shL.rotation.x = j.shR.rotation.x = -0.55 + a * 0.35;
          j.elL.rotation.x = j.elR.rotation.x = -0.5 - a * 0.25;
          j.hipL.rotation.x = -0.25;
          j.knL.rotation.x = 0.3;
          j.knR.rotation.x = 0.1 + Math.max(0, a) * 0.1;
        } else {
          j.neck.rotation.x = -0.35;
          j.shL.rotation.x = j.shR.rotation.x = -2.3 + a * 0.35;
          j.elL.rotation.x = j.elR.rotation.x = -0.25 - a * 0.2;
          j.knL.rotation.x = j.knR.rotation.x = 0.1 + Math.max(0, -a) * 0.12;
          j.hips.position.y = this.hipY - Math.max(0, -a) * 0.03;
        }
        j.shL.rotation.z = 0.12;
        j.shR.rotation.z = -0.12;
        break;
      }
      case 'scatter': { // throwing grain from a basket on the left arm
        if (legsStill) stand(0.5);
        else walkLegs(ph, 0.3);
        const a = Math.max(0, Math.sin(t * 2.2));
        j.shL.rotation.x = -0.5;
        j.elL.rotation.x = -1.3;
        j.shL.rotation.z = 0.25;
        j.shR.rotation.x = -0.3 - a * 1.0;
        j.shR.rotation.z = -0.15 - a * 0.35;
        j.elR.rotation.x = -0.3;
        break;
      }
      case 'lean': // leaning on a staff
        stand(0.7);
        j.spine.rotation.x = 0.06;
        j.shR.rotation.x = -0.45;
        j.elR.rotation.x = -0.75;
        j.shL.rotation.x = -0.2;
        j.elL.rotation.x = -0.6;
        j.hipL.rotation.x = 0.12;
        j.neck.rotation.y = Math.sin(t * 0.35 + this.seed) * 0.4;
        break;
      case 'wave': { // a wave of the right hand
        stand(0.3);
        const a = Math.sin(t * 7);
        j.shR.rotation.x = -0.4;
        j.shR.rotation.z = -2.4 + a * 0.12;
        j.elR.rotation.z = a * 0.45;
        j.elR.rotation.x = -0.35;
        j.neck.rotation.x = -0.1;
        j.spine.rotation.z = 0.04;
        break;
      }
      case 'bow': { // a bow from the waist, hand on breast
        const k = Math.min(1, Math.max(0, Math.sin(Math.min(Math.PI, (p.t ?? t) * 2.2))));
        j.spine.rotation.x = 0.55 * k;
        j.neck.rotation.x = 0.25 * k;
        j.shR.rotation.x = -0.9;
        j.elR.rotation.x = -1.6;
        j.shR.rotation.z = 0.25;
        j.knL.rotation.x = j.knR.rotation.x = 0.08 * k;
        break;
      }
      case 'salute': // a soldier's greeting: fist to the breast and a nod, spear grounded
        j.shR.rotation.x = -0.15;
        j.elR.rotation.x = -1.1;
        j.shL.rotation.x = -0.75;
        j.shL.rotation.z = -0.3;
        j.elL.rotation.x = -1.75;
        j.neck.rotation.x = 0.22;
        j.spine.rotation.x = 0.06;
        break;
      case 'curtsey':
        j.hipL.rotation.x = -0.35;
        j.knL.rotation.x = 0.7;
        j.hipR.rotation.x = 0.3;
        j.knR.rotation.x = 0.45;
        j.hips.position.y = this.hipY - 0.13;
        j.spine.rotation.x = 0.2;
        j.neck.rotation.x = 0.3;
        j.shL.rotation.z = 0.35;
        j.shR.rotation.z = -0.35;
        break;
      case 'sleep': { // lying on the back (p.bed: height of the mattress), breathing slowly
        const b = Math.sin(t * 0.9 + this.seed) * 0.02;
        j.hips.rotation.x = -Math.PI / 2;
        j.hips.position.y = (p.bed ?? 0.2) + 0.13;
        j.hips.position.z = 0;
        j.spine.rotation.x = b;
        j.neck.rotation.x = -0.25;
        j.neck.rotation.y = p.side ? 0.6 : 0.15;
        j.shL.rotation.x = -0.35;
        j.elL.rotation.x = -1.3;
        j.shL.rotation.z = 0.2;
        j.shR.rotation.x = -0.15;
        j.shR.rotation.z = -0.1;
        j.hipL.rotation.x = 0.04;
        j.knL.rotation.x = p.side ? 0.6 : 0.08;
        j.hipR.rotation.x = p.side ? -0.5 : 0;
        j.knR.rotation.x = p.side ? 0.9 : 0.04;
        break;
      }
      case 'drill': { // a spear levelled in both hands, thrusting on the word of command
        const c = ((t + (p.offset ?? 0)) * (p.speed ?? 0.7)) % 1;
        const k = c < 0.25 ? c / 0.25 : c < 0.45 ? 1 : c < 0.8 ? 1 - (c - 0.45) / 0.35 : 0;
        const e = k * k * (3 - 2 * k);
        j.hipL.rotation.x = -0.35 - e * 0.15;
        j.knL.rotation.x = 0.2 + e * 0.15;
        j.hipR.rotation.x = 0.25;
        j.knR.rotation.x = 0.15;
        j.hips.position.y = this.hipY - 0.04 - e * 0.03;
        j.spine.rotation.x = 0.12 + e * 0.12;
        j.spine.rotation.y = -0.35 + e * 0.15;
        // the leading hand well forward on the shaft, the other back by the hip
        j.shL.rotation.x = -1.2 - e * 0.2;
        j.elL.rotation.x = -0.35 + e * 0.25;
        j.shR.rotation.x = -0.45 - e * 0.3;
        j.elR.rotation.x = -1.2 + e * 0.35;
        j.shR.rotation.z = -0.1;
        j.shL.rotation.z = -0.15;
        j.front.position.y = 0.14;
        j.front.position.z = 0.3 + e * 0.3;
        // keep the spear level and pointing to the front, whatever the body does
        j.front.rotation.x = -j.spine.rotation.x - 0.08;
        j.front.rotation.y = -j.spine.rotation.y - j.hips.rotation.y;
        break;
      }
      case 'shoot': { // an archer: nock, draw to the jaw, loose (p.draw 0..1 overrides the cycle)
        const c = ((t + (p.offset ?? 0)) * DRAW_RATE) % 1;
        const auto = c < 0.3 ? 0 : c < 0.7 ? (c - 0.3) / 0.4 : c < 0.8 ? 1 : 0;
        const d = p.draw ?? auto;
        // side-on to the mark: left shoulder towards it, head turned to look along the arrow
        j.hips.rotation.y = -0.45;
        j.spine.rotation.y = -0.7;
        j.neck.rotation.y = 1.1;
        j.hipL.rotation.x = -0.15;
        j.hipR.rotation.x = 0.12;
        // the bow arm held out straight at the mark
        j.shL.rotation.set(0, -0.45, Math.PI / 2);
        j.elL.rotation.x = 0;
        // the draw arm: the upper arm sweeps round level from the bow to behind
        // the shoulder while the forearm folds back to the jaw
        j.shR.rotation.set(0, -0.6 - d * 2.35, Math.PI / 2);
        j.elR.rotation.x = 0.3 + d * 2.5;
        j.spine.rotation.x = 0.03;
        break;
      }
      case 'play': { // playing a fiddle (vielle) on the left shoulder
        const a = Math.sin(t * 2.6);
        stand(0.6);
        j.shL.rotation.x = -1.1;
        j.shL.rotation.z = 0.5;
        j.elL.rotation.x = -1.7;
        j.shR.rotation.x = -0.9;
        j.shR.rotation.z = 0.15 + a * 0.35;
        j.elR.rotation.x = -1.0 + a * 0.3;
        j.neck.rotation.z = 0.25;
        j.neck.rotation.x = 0.1;
        j.spine.rotation.z += Math.sin(t * 1.3) * 0.04;
        break;
      }
      case 'sweep': { // sweeping with a broom
        const a = Math.sin(t * 3.2);
        stand(0.3);
        j.spine.rotation.x = 0.3;
        j.spine.rotation.y = a * 0.25;
        j.shL.rotation.x = -0.55;
        j.shR.rotation.x = -0.75;
        j.elL.rotation.x = -0.6;
        j.elR.rotation.x = -0.4;
        j.shL.rotation.z = 0.3 + a * 0.15;
        j.shR.rotation.z = -0.1 + a * 0.15;
        break;
      }
      case 'polish': { // rubbing at a piece of harness or mail on the lap
        const a = Math.sin(t * 6 + this.seed);
        j.hipL.rotation.x = j.hipR.rotation.x = -1.45;
        j.knL.rotation.x = j.knR.rotation.x = 1.45;
        j.hips.position.y = p.seat ?? 0.48;
        j.spine.rotation.x = 0.4;
        j.neck.rotation.x = 0.4;
        j.shL.rotation.x = -0.6;
        j.elL.rotation.x = -0.9;
        j.shR.rotation.x = -0.7 + a * 0.1;
        j.shR.rotation.z = -0.2 + a * 0.15;
        j.elR.rotation.x = -0.9;
        break;
      }
      case 'milk': { // on a low stool at a cow's flank, hands working
        const a = Math.sin(t * 6);
        j.hipL.rotation.x = j.hipR.rotation.x = -1.55;
        j.knL.rotation.x = j.knR.rotation.x = 2.0;
        j.hips.position.y = p.seat ?? 0.3;
        j.spine.rotation.x = 0.45;
        j.neck.rotation.x = 0.15;
        j.shL.rotation.x = -1.1 + a * 0.08;
        j.shR.rotation.x = -1.1 - a * 0.08;
        j.elL.rotation.x = j.elR.rotation.x = -0.4;
        j.shL.rotation.z = 0.15;
        j.shR.rotation.z = -0.15;
        break;
      }
      case 'read': // standing with a book or roll held before the face
        stand(0.6);
        j.shL.rotation.x = j.shR.rotation.x = -0.7;
        j.elL.rotation.x = j.elR.rotation.x = -1.2;
        j.shL.rotation.z = 0.25;
        j.shR.rotation.z = -0.25;
        j.neck.rotation.x = 0.3;
        break;
      case 'warm': // hands held out to a fire
        stand(0.5);
        j.spine.rotation.x = 0.12;
        j.shL.rotation.x = j.shR.rotation.x = -1.05 + Math.sin(t * 0.8) * 0.05;
        j.elL.rotation.x = j.elR.rotation.x = -0.35;
        j.shL.rotation.z = 0.2;
        j.shR.rotation.z = -0.2;
        break;
      case 'idle':
      default:
        stand();
        j.neck.rotation.y = Math.sin(t * 0.4 + this.seed) * 0.15;
        break;
    }
  }
}

// how often an archer looses, in shots per second
export const DRAW_RATE = 0.22;
// the joints a pose sets, in the order a blend snapshot keeps them
const JOINTS = ['hips', 'spine', 'neck', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'];
// poses where the head is busy and should not turn to look at passers-by
const NO_LOOK = new Set(['sleep', 'saw', 'shoot', 'scrub', 'knead', 'milk', 'bow', 'wave', 'salute', 'curtsey', 'read', 'write', 'tally', 'drill']);
