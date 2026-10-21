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
    for (const k of ['spine', 'neck', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR']) j[k].rotation.set(0, 0, 0);
    j.hips.position.y = this.hipY;
    j.hips.rotation.set(0, 0, 0);
    j.shL.rotation.z = 0.06;
    j.shR.rotation.z = -0.06;
  }

  /**
   * Set a named pose. t: seconds; p: optional parameters (phase, angle...).
   */
  pose(name, t, p = {}) {
    this.reset();
    const j = this.j;
    const breath = Math.sin(t * 1.7) * 0.015;
    j.spine.rotation.x = breath;
    const walkLegs = (ph, amp = 0.42) => {
      j.hipL.rotation.x = -Math.sin(ph) * amp;
      j.hipR.rotation.x = Math.sin(ph) * amp;
      j.knL.rotation.x = Math.max(0, Math.sin(ph - 1.2)) * amp * 1.5;
      j.knR.rotation.x = Math.max(0, Math.sin(ph + Math.PI - 1.2)) * amp * 1.5;
      j.hips.position.y = this.hipY - 0.03 + Math.abs(Math.cos(ph)) * 0.03;
    };
    const ph = p.phase ?? 0;
    switch (name) {
      case 'walk':
        walkLegs(ph);
        j.shL.rotation.x = Math.sin(ph) * 0.35;
        j.shR.rotation.x = -Math.sin(ph) * 0.35;
        j.elL.rotation.x = -0.25;
        j.elR.rotation.x = -0.25;
        break;
      case 'carry': // something held before the body in both hands
        walkLegs(ph, p.moving === false ? 0 : 0.38);
        j.shL.rotation.x = j.shR.rotation.x = -0.55;
        j.elL.rotation.x = j.elR.rotation.x = -0.95;
        j.shL.rotation.z = 0.25;
        j.shR.rotation.z = -0.25;
        break;
      case 'pails': // a pail in each hand
        walkLegs(ph, p.moving === false ? 0 : 0.34);
        j.shL.rotation.z = 0.22;
        j.shR.rotation.z = -0.22;
        j.spine.rotation.x = 0.04;
        break;
      case 'shoulder': // sack on the right shoulder
        walkLegs(ph, p.moving === false ? 0 : 0.36);
        j.shR.rotation.x = -2.5;
        j.shR.rotation.z = -0.35;
        j.elR.rotation.x = -1.4;
        j.shL.rotation.x = Math.sin(ph) * 0.3;
        j.spine.rotation.z = 0.08;
        j.spine.rotation.x = 0.1;
        break;
      case 'stir': {
        const a = t * (p.speed ?? 2.4);
        j.spine.rotation.x = 0.18;
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
        break;
      }
      case 'chop': {
        const a = Math.max(0, Math.sin(t * 4.5));
        j.spine.rotation.x = 0.2;
        j.shR.rotation.x = -0.6 - a * 1.4;
        j.elR.rotation.x = -0.6 - a * 0.5;
        j.shL.rotation.x = -0.7;
        j.elL.rotation.x = -0.5;
        j.shL.rotation.z = 0.25;
        break;
      }
      case 'scrub': {
        const a = Math.sin(t * 5);
        j.spine.rotation.x = 0.55;
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
        j.spine.rotation.x = 0.15;
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
      case 'stoop': { // bend to pick up or put down
        const k = p.amount ?? 1;
        j.spine.rotation.x = 0.85 * k;
        j.hipL.rotation.x = j.hipR.rotation.x = -0.35 * k;
        j.knL.rotation.x = j.knR.rotation.x = 0.7 * k;
        j.hips.position.y = this.hipY - 0.16 * k;
        j.shL.rotation.x = j.shR.rotation.x = -0.6 * k;
        j.shL.rotation.z = 0.15;
        j.shR.rotation.z = -0.15;
        break;
      }
      case 'reach': // place something on a table
        j.spine.rotation.x = 0.3;
        j.shL.rotation.x = j.shR.rotation.x = -1.0;
        j.elL.rotation.x = j.elR.rotation.x = -0.25;
        break;
      case 'pour':
        j.spine.rotation.x = 0.35;
        j.shL.rotation.x = j.shR.rotation.x = -1.1;
        j.elL.rotation.x = j.elR.rotation.x = -0.5;
        j.shL.rotation.z = 0.3;
        j.shR.rotation.z = -0.3;
        break;
      case 'taste':
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
        break;
      case 'write': {
        const a = Math.sin(t * 6) * 0.06;
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
        j.neck.rotation.x = 0.3;
        j.shL.rotation.x = -0.7;
        j.elL.rotation.x = -1.1;
        j.shR.rotation.x = -0.75 - a;
        j.elR.rotation.x = -1.0 + a;
        break;
      }
      case 'sentry': // walking or standing with an upright spear in the right hand
        walkLegs(ph, p.moving === false ? 0 : 0.38);
        j.shL.rotation.x = p.moving === false ? 0 : Math.sin(ph) * 0.35;
        j.elL.rotation.x = -0.2;
        j.shR.rotation.x = -0.15;
        j.elR.rotation.x = -1.1;
        j.shR.rotation.z = -0.05;
        if (p.moving === false) j.neck.rotation.y = Math.sin(t * 0.5) * 0.55;
        break;
      case 'look':
        j.neck.rotation.y = Math.sin(t * 0.6) * 0.5;
        break;
      case 'wipe':
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
        j.knR.rotation.x = 0.2;
        break;
      }
      default:
        j.neck.rotation.y = Math.sin(t * 0.4) * 0.15;
        break;
    }
  }
}
