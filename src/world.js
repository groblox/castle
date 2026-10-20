import * as THREE from 'three';
import { GeoBuilder } from './geom/builder.js';
import { buildShell } from './castle/shell.js';
import { furnish } from './castle/furnish.js';
import { makeMaterial } from './render/material.js';
import { Effects } from './render/fx.js';
import { setupEffects } from './castle/ambient.js';

/** Build all static geometry into a single mesh (one draw call). */
export function buildWorld(scene) {
  const b = new GeoBuilder();
  buildShell(b);
  furnish(b);
  const geo = b.build();
  const mesh = new THREE.Mesh(geo, makeMaterial());
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  const fx = new Effects(scene);
  setupEffects(fx);
  return {
    mesh,
    fx,
    triangles: b.triangleCount,
    update(t) {
      fx.update(t);
    },
  };
}
