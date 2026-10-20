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
