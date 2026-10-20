import * as THREE from 'three';
import { K } from '../geom/kinds.js';
import { lathe, lump } from '../geom/props.js';
import { obox, v3 } from '../geom/shapes.js';
import { partGeo, figureMaterial, mesh, node } from './parts.js';

// A procedural "peg doll" figure in medieval working dress: tunic (cote) to
// the knee or a long gown, hose, hood or coif, optional apron. Joints are
// plain Object3D nodes animated by named poses. The figure faces +z locally.

const SKIN = [0xe6c3a0, 0xd9b08c, 0xecc9a6, 0xc99d7a];

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

    const root = new THREE.Group();
    root.scale.setScalar(s);
    this.root = root;
    const hips = node(root, 0, 0.92, 0);
    const spine = node(hips, 0, 0, 0);
    const j = { hips, spine };
    this.j = j;
    this.hipY = 0.92;

    // torso and skirts
    spine.add(mesh(partGeo((b) => {
      b.set({ kind: K.CLOTH, color: tunic });
      lathe(b, v3(0, -0.02, 0), 'y', [[0.15, 0], [0.165, 0.2], [0.185, 0.42], [0.13, 0.52], [0.06, 0.56]], 12);
      if (spec.apron) {
        b.with({ color: spec.apron }, () => obox(b, 0, 0.32, 0.16, 0.26, 0.3, 0.02, 0));
      }
      if (spec.cape) {
        b.with({ color: spec.cape }, () => lathe(b, v3(0, 0.34, 0), 'y', [[0.25, 0], [0.2, 0.12], [0.1, 0.22]], 12));
      }
    }), mat));
    const long = spec.gown ? 0.84 : 0.46;
    hips.add(mesh(partGeo((b) => {
      b.set({ kind: K.CLOTH, color: spec.gownColor ?? tunic });
      lathe(b, v3(0, -long, 0), 'y', [[spec.gown ? 0.3 : 0.27, 0], [0.17, long]], 12);
      b.with({ color: spec.belt ?? 0x4a3a2a }, () => lathe(b, v3(0, -0.02, 0), 'y', [[0.17, 0], [0.17, 0.05]], 12));
      if (spec.apron) b.with({ color: spec.apron }, () => obox(b, 0, -0.25, 0.235, 0.36, 0.46, 0.02, 0));
      if (spec.purse) b.with({ color: 0x6b4a30 }, () => obox(b, 0.17, -0.1, 0.06, 0.07, 0.1, 0.04, 0));
    }), mat));

    // head
    const neck = node(spine, 0, 0.53, 0);
    j.neck = neck;
    neck.add(mesh(partGeo((b) => {
      b.set({ kind: K.SKIN, color: skin });
      lathe(b, v3(0, 0, 0), 'y', [[0.045, 0], [0.045, 0.08]], 8);
      lump(b, 0, 0.17, 0.005, 0.098, 0.118, 0.105, skin, K.SKIN);
      b.with({ color: 0xc89878 }, () => obox(b, 0, 0.15, 0.1, 0.03, 0.045, 0.03, 0)); // nose
      b.with({ kind: K.PLAIN, color: 0x2a2018 }, () => {
        obox(b, -0.035, 0.185, 0.095, 0.018, 0.012, 0.01, 0);
        obox(b, 0.035, 0.185, 0.095, 0.018, 0.012, 0.01, 0);
      });
      if (spec.beard) lump(b, 0, 0.1, 0.05, 0.08, 0.06, 0.07, spec.hair ?? 0x5a4030, K.FUR);
      if (spec.hair && !spec.veil) lump(b, 0, 0.21, -0.02, 0.1, 0.09, 0.1, spec.hair, K.FUR);
      if (spec.hood) {
        b.with({ kind: K.CLOTH, color: spec.hood }, () => {
          lump(b, 0, 0.2, -0.015, 0.118, 0.13, 0.12, spec.hood, K.CLOTH);
          lathe(b, v3(0, -0.05, -0.01), 'y', [[0.21, 0], [0.12, 0.12], [0.08, 0.15]], 12); // gorget/cape
          obox(b, 0, 0.28, -0.14, 0.05, 0.05, 0.14, 0); // liripipe stub
        });
      }
      if (spec.coif) lump(b, 0, 0.215, -0.01, 0.105, 0.09, 0.11, spec.coif, K.CLOTH);
      if (spec.veil) {
        b.with({ kind: K.CLOTH, color: spec.veil }, () => {
          lump(b, 0, 0.21, -0.02, 0.115, 0.11, 0.12, spec.veil, K.CLOTH);
          obox(b, 0, 0.1, -0.08, 0.2, 0.22, 0.04, 0);
          lathe(b, v3(0, 0.0, 0.0), 'y', [[0.085, 0], [0.075, 0.12]], 10); // wimple
        });
      }
      if (spec.cap) lump(b, 0, 0.24, -0.01, 0.11, 0.06, 0.11, spec.cap, K.CLOTH);
    }), mat));

    // arms
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 0.205 : -0.205;
      const sh = node(spine, sx, 0.47, 0);
      sh.add(mesh(partGeo((b) => {
        b.set({ kind: K.CLOTH, color: sleeve });
        lathe(b, v3(0, -0.3, 0), 'y', [[0.05, 0], [0.062, 0.3]], 8);
        lump(b, 0, 0, 0, 0.065, 0.06, 0.065, sleeve, K.CLOTH);
      }), mat));
      const el = node(sh, 0, -0.3, 0);
      el.add(mesh(partGeo((b) => {
        b.set({ kind: K.CLOTH, color: sleeve });
        lathe(b, v3(0, -0.26, 0), 'y', [[0.038, 0], [0.05, 0.26]], 8);
        lump(b, 0, -0.3, 0.005, 0.042, 0.055, 0.035, skin, K.SKIN);
      }), mat));
      const hand = node(el, 0, -0.31, 0.01);
      j[`sh${side}`] = sh;
      j[`el${side}`] = el;
      j[`hand${side}`] = hand;
    }

    // legs
    for (const side of ['L', 'R']) {
      const hx = side === 'L' ? 0.085 : -0.085;
      const hp = node(hips, hx, 0, 0);
      hp.add(mesh(partGeo((b) => {
        b.set({ kind: K.CLOTH, color: hose });
        lathe(b, v3(0, -0.44, 0), 'y', [[0.058, 0], [0.08, 0.44]], 8);
      }), mat));
      const kn = node(hp, 0, -0.44, 0);
      kn.add(mesh(partGeo((b) => {
        b.set({ kind: K.CLOTH, color: hose });
        lathe(b, v3(0, -0.42, 0), 'y', [[0.042, 0], [0.058, 0.42]], 8);
        b.with({ kind: K.PLAIN, color: spec.shoes ?? 0x3a2a1e }, () => obox(b, 0, -0.45, 0.045, 0.09, 0.07, 0.24, 0));
      }), mat));
      j[`hip${side}`] = hp;
      j[`kn${side}`] = kn;
    }
    // a slot on the right shoulder for carried sacks
    j.shoulderSlot = node(spine, -0.12, 0.6, -0.02);
    // and one before the chest for armfuls (logs, baskets)
    j.front = node(spine, 0, 0.26, 0.3);
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
