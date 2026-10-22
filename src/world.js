import * as THREE from 'three';
import { GeoBuilder } from './geom/builder.js';
import { makeMaterial, makeDepthMaterial } from './render/material.js';
import { Effects } from './render/fx.js';

/**
 * Build a castle (a site from sites.js): all its static geometry into a
 * single mesh (one draw call, after a depth pre-pass), then its fires and
 * smoke, and its people.
 */
export function buildWorld(scene, site) {
  const b = new GeoBuilder();
  site.buildStatic(b);
  const geo = b.build();
  // drawn twice: depth first, then the full shader where the depth matches
  const depth = new THREE.Mesh(geo, makeDepthMaterial());
  depth.frustumCulled = false;
  depth.matrixAutoUpdate = false;
  depth.renderOrder = -1;
  scene.add(depth);
  const mat = makeMaterial();
  mat.depthWrite = false;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  const fx = new Effects(scene);
  site.setupEffects(fx);
  const cast = site.buildCast(scene);
  return {
    mesh,
    fx,
    cast,
    triangles: b.triangleCount,
    update(t, dt) {
      fx.update(t);
      cast.update(t, dt);
    },
  };
}
