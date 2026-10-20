import * as THREE from 'three';
import { GeoBuilder } from './geom/builder.js';
import { buildShell } from './castle/shell.js';
import { makeMaterial } from './render/material.js';

/** Build all static geometry into a single mesh (one draw call). */
export function buildWorld(scene) {
  const b = new GeoBuilder();
  buildShell(b);
  const geo = b.build();
  const mesh = new THREE.Mesh(geo, makeMaterial());
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return {
    mesh,
    triangles: b.triangleCount,
    update() {},
  };
}
