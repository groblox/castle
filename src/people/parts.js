import * as THREE from 'three';
import { GeoBuilder } from '../geom/builder.js';
import { makeMaterial } from '../render/material.js';

// Helpers for building small animated parts: each part is its own mesh,
// built with the same GeoBuilder (no cutting) and drawn with a per-figure
// material so the whole figure shares one hover label.

export function partGeo(fn) {
  const b = new GeoBuilder();
  b.state.planes = [];
  fn(b);
  const g = b.build();
  g.computeBoundingSphere();
  return g;
}

export function figureMaterial(label, group) {
  return makeMaterial({ label, group });
}

export function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

export function node(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

// Parts a rig can carry: the size of the uParts uniform array.
export const MAX_PARTS = 16;
const _inv = new THREE.Matrix4();
const _v = new THREE.Vector3();

/**
 * Merge the body parts of a figure or animal (the meshes under `root` that
 * share a material) into one mesh, so each is one draw call instead of a
 * dozen. Every vertex remembers its part, and the vertex shader moves it with
 * that part's joint (uParts), so posing works exactly as before: the original
 * part meshes stay in the tree as invisible stand-ins whose matrices drive the
 * merged mesh. Hiding a stand-in hides its part. Run it before props are held.
 */
export function rig(root) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  const byMat = new Map();
  root.traverse((o) => {
    // only surface-shader meshes with plain (non-indexed) builder geometry
    if (!o.isMesh || !o.material.uniforms?.uLabelOverride || o.material.defines?.RIGID_PARTS) return;
    if (o.parent.userData.prop === o || !o.geometry.attributes.info || o.geometry.index) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  for (const [mat, all] of byMat) {
    for (let s = 0; s < all.length; s += MAX_PARTS) {
      const parts = all.slice(s, s + MAX_PARTS);
      if (parts.length > 1) mergeParts(root, mat, parts);
    }
  }
}

function mergeParts(root, mat, parts) {
  let n = 0;
  for (const p of parts) n += p.geometry.attributes.position.count;
  const names = ['position', 'normal', 'acol', 'info'];
  const out = names.map(() => new Float32Array(n * 3));
  const part = new Float32Array(n);
  const box = new THREE.Box3();
  let k = 0;
  parts.forEach((p, i) => {
    const g = p.geometry;
    const c = g.attributes.position.count;
    names.forEach((name, j) => out[j].set(g.attributes[name].array, k * 3));
    part.fill(i, k, k + c);
    // the rest pose, for a bounding volume
    const rel = new THREE.Matrix4().multiplyMatrices(_inv, p.matrixWorld);
    const pa = g.attributes.position;
    for (let q = 0; q < c; q++) box.expandByPoint(_v.fromBufferAttribute(pa, q).applyMatrix4(rel));
    k += c;
  });
  const geo = new THREE.BufferGeometry();
  names.forEach((name, j) => geo.setAttribute(name, new THREE.BufferAttribute(out[j], 3)));
  geo.setAttribute('part', new THREE.BufferAttribute(part, 1));
  // limbs swing well beyond the rest pose: be generous
  geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  geo.boundingSphere.radius = geo.boundingSphere.radius * 1.4 + 0.3;

  const mats = Array.from({ length: MAX_PARTS }, () => new THREE.Matrix4());
  const rm = new THREE.ShaderMaterial({
    glslVersion: mat.glslVersion,
    vertexShader: mat.vertexShader,
    fragmentShader: mat.fragmentShader,
    // the same uniform objects, so label, tint and fade changes carry over
    uniforms: { ...mat.uniforms, uParts: { value: mats } },
    defines: { ...mat.defines, RIGID_PARTS: MAX_PARTS },
    side: mat.side,
  });
  const merged = new THREE.Mesh(geo, rm);
  merged.onBeforeRender = () => {
    _inv.copy(root.matrixWorld).invert();
    parts.forEach((p, i) => {
      if (p.visible && p.parent) mats[i].multiplyMatrices(_inv, p.matrixWorld);
      else mats[i].makeScale(0, 0, 0);
    });
  };
  root.add(merged);
  // the stand-ins keep their place in the tree (and their children) but draw nothing
  for (const p of parts) p.layers.disableAll();
}
