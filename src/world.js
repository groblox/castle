import * as THREE from 'three';
import { GeoBuilder } from './geom/builder.js';
import { buildShell } from './castle/shell.js';
import { furnish } from './castle/furnish.js';
import { landscape } from './castle/landscape.js';
import { wards } from './castle/wards.js';
import { interiors } from './castle/interiors.js';
import { towers } from './castle/towers.js';
import { stable } from './castle/stable.js';
import { farm } from './castle/farm.js';
import { makeMaterial } from './render/material.js';
import { Effects } from './render/fx.js';
import { setupEffects } from './castle/ambient.js';
import { buildCast } from './people/cast.js';

/** Build all static geometry into a single mesh (one draw call). */
export function buildWorld(scene) {
  const b = new GeoBuilder();
  buildShell(b);
  furnish(b);
  landscape(b);
  wards(b);
  interiors(b);
  towers(b);
  stable(b);
  farm(b);
  const geo = b.build();
  const mesh = new THREE.Mesh(geo, makeMaterial());
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  const fx = new Effects(scene);
  setupEffects(fx);
  const cast = buildCast(scene);
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
