import * as THREE from 'three';
import { shared } from './material.js';

// Particle effects drawn as soft watercolour blobs: smoke, steam, flames and
// sparks. Each particle's whole life is computed in the vertex shader from the
// time and a per-particle seed, so nothing is updated on the CPU.
// They write colour only (the normal and label targets get alpha 0 and are
// left untouched), so they carry no ink lines and do not block picking.

const KIND = { smoke: 0, flame: 1, spark: 2, steam: 3 };

const vertex = /* glsl */ `
in vec3 aEmit;
in vec4 aSeed;
uniform float uTime;
uniform float uLife;
uniform float uRise;
uniform float uSpread;
uniform float uSize0;
uniform float uSize1;
uniform vec2 uWind;
uniform float uWobble;
uniform vec3 uFocusMin;
uniform vec3 uFocusMax;
uniform float uFocusAmt;
out vec2 vUv;
out float vLife;
out float vSeed;
out float vFadeF;
void main() {
  float life = uLife * (0.75 + 0.5 * aSeed.y);
  float t = fract(uTime / life + aSeed.x);
  vec3 p = aEmit;
  float ang = aSeed.z * 6.2831853;
  vec2 dir = vec2(cos(ang), sin(ang));
  p.y += uRise * t * (0.8 + 0.4 * aSeed.w);
  p.xz += dir * uSpread * t * (0.4 + aSeed.w);
  p.xz += uWind * t * t;
  p.xz += vec2(sin(uTime * 1.3 + aSeed.x * 20.0), cos(uTime * 1.1 + aSeed.y * 17.0)) * uWobble * t;
  float size = mix(uSize0, uSize1, t) * (0.7 + 0.6 * aSeed.w);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * size;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy + 0.5;
  vLife = t;
  vSeed = aSeed.x;
  vec3 o = max(uFocusMin - p, p - uFocusMax);
  vFadeF = uFocusAmt * smoothstep(0.0, 1.2, length(max(o, 0.0)));
}
`;

const fragment = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oNormal;
layout(location = 2) out vec4 oLabel;
uniform int uKind;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uAlpha;
uniform float uOn;
in vec2 vUv;
in float vLife;
in float vSeed;
in float vFadeF;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float r;
  if (uKind == 1) {
    q.y += 0.25;
    q.x *= 1.0 + max(q.y, 0.0) * 1.4;
    r = length(q * vec2(1.0, 0.75));
  } else {
    r = length(q);
  }
  float edge = (vn(vUv * 4.0 + vSeed * 13.0) - 0.5) * 0.35;
  float a = 1.0 - smoothstep(0.62, 0.98, r + edge);
  float rim = smoothstep(0.5, 0.9, r + edge) * a;
  float lifeA = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));
  vec3 col = mix(uColor, uColor2, vLife);
  if (uKind == 1) {
    col = mix(col, vec3(0.55, 0.12, 0.04), rim * 0.75);
    lifeA = smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.6, 1.0, vLife));
  } else if (uKind == 2) {
    a = 1.0 - smoothstep(0.3, 0.6, r);
  } else {
    col *= 1.0 - rim * 0.18;
  }
  float alpha = a * lifeA * uAlpha * uOn * (1.0 - vFadeF * 0.7);
  if (alpha < 0.004) discard;
  oColor = vec4(col, alpha);
  oNormal = vec4(0.0);
  oLabel = vec4(0.0);
}
`;

function system(emitters, count, params) {
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const n = emitters.length * count;
  const emit = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  let k = 0;
  const jitter = params.jitter ?? [0, 0, 0];
  for (const e of emitters) {
    for (let i = 0; i < count; i++) {
      emit[k * 3] = e[0] + (Math.random() - 0.5) * jitter[0];
      emit[k * 3 + 1] = e[1] + (Math.random() - 0.5) * jitter[1];
      emit[k * 3 + 2] = e[2] + (Math.random() - 0.5) * jitter[2];
      seed[k * 4] = (i + Math.random() * 0.8) / count;
      seed[k * 4 + 1] = Math.random();
      seed[k * 4 + 2] = Math.random();
      seed[k * 4 + 3] = Math.random();
      k++;
    }
  }
  quad.setAttribute('aEmit', new THREE.InstancedBufferAttribute(emit, 3));
  quad.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  quad.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: shared.uTime,
      uFocusMin: shared.uFocusMin,
      uFocusMax: shared.uFocusMax,
      uFocusAmt: shared.uFocusAmt,
      uKind: { value: KIND[params.kind] },
      uLife: { value: params.life },
      uRise: { value: params.rise },
      uSpread: { value: params.spread },
      uSize0: { value: params.size0 },
      uSize1: { value: params.size1 },
      uWind: { value: new THREE.Vector2(...(params.wind ?? [0, 0])) },
      uWobble: { value: params.wobble ?? 0.2 },
      uColor: { value: new THREE.Color(params.color) },
      uColor2: { value: new THREE.Color(params.color2 ?? params.color) },
      uAlpha: { value: params.alpha },
      uOn: { value: params.on ?? 1 },
    },
  });
  const mesh = new THREE.Mesh(quad, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = params.order ?? 1;
  return mesh;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.byName = {};
    this.lights = []; // {index, base, pos, on}
  }

  add(name, emitters, count, params) {
    const m = system(emitters, count, params);
    this.scene.add(m);
    this.byName[name] = m;
    return m;
  }
  smoke(name, emitters, opts = {}) {
    return this.add(name, emitters, opts.count ?? 16, {
      kind: 'smoke', life: 8, rise: opts.rise ?? 11, spread: 2.2, size0: 1.0, size1: 4.6,
      wind: [2.6, -0.8], wobble: 0.6, color: 0x8d8780, color2: 0xb9b3a8, alpha: opts.alpha ?? 0.34, jitter: [0.4, 0.2, 0.4], order: 3, ...opts,
    });
  }
  steam(name, emitters, opts = {}) {
    return this.add(name, emitters, opts.count ?? 10, {
      kind: 'steam', life: 3.2, rise: opts.rise ?? 1.6, spread: 0.35, size0: 0.22, size1: 0.9,
      wind: [0.1, 0.05], wobble: 0.15, color: 0xf6f3ec, color2: 0xfbfaf6, alpha: opts.alpha ?? 0.4, jitter: [0.4, 0.05, 0.4], order: 2, ...opts,
    });
  }
  flames(name, emitters, opts = {}) {
    const m = this.add(name, emitters, opts.count ?? 5, {
      kind: 'flame', life: 0.75, rise: opts.rise ?? 0.55, spread: 0.08, size0: opts.size ?? 0.42, size1: (opts.size ?? 0.42) * 0.35,
      wobble: 0.05, color: 0xffe9a0, color2: 0xf06a24, alpha: 0.92, jitter: [0.12, 0.02, 0.1], order: 4, ...opts,
    });
    this.add(`${name}:sparks`, emitters.slice(0, Math.max(1, Math.ceil(emitters.length / 2))), 3, {
      kind: 'spark', life: 1.6, rise: 1.6, spread: 0.5, size0: 0.05, size1: 0.03, wobble: 0.2,
      color: 0xffd27a, color2: 0xff7a2a, alpha: 0.9, jitter: [0.4, 0.05, 0.2], order: 5, on: opts.on ?? 1,
    });
    return m;
  }
  /** Register a flickering fire light in the shared material uniform. */
  light(index, pos, base, color = 0xffa040) {
    shared.uFirePos.value[index].set(pos[0], pos[1], pos[2], base);
    shared.uFireCol.value[index].set(...new THREE.Color(color).toArray());
    this.lights.push({ index, base, pos, on: 1 });
  }
  setOn(name, on) {
    const m = this.byName[name];
    if (m) m.material.uniforms.uOn.value = on;
    const s = this.byName[`${name}:sparks`];
    if (s) s.material.uniforms.uOn.value = on;
  }
  setLight(index, on) {
    const L = this.lights.find((l) => l.index === index);
    if (L) L.on = on;
  }
  update(t) {
    for (const L of this.lights) {
      const f = 0.82 + 0.12 * Math.sin(t * 9.1 + L.index * 3.1) + 0.08 * Math.sin(t * 23.7 + L.index) + 0.06 * Math.sin(t * 4.3 + L.index * 7.0);
      shared.uFirePos.value[L.index].w = L.base * f * L.on;
    }
  }
}
