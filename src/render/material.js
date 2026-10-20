import * as THREE from 'three';
import { GROUP_COUNT } from '../castle/rooms.js';

// One shader drives every surface in the scene. It writes three targets:
//  0: watercolour-lit colour
//  1: view-space normal (xyz) + fade amount (a)  -> ink edge detection
//  2: label id (rg), surface kind (b)            -> hover/click picking
// Geometry attributes: position, normal, acol (rgb), info (kind, label, group).

export const MAX_FIRES = 8;

export const shared = {
  uFade: { value: new Float32Array(GROUP_COUNT) },
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.45, 0.8, 0.42).normalize() },
  uFirePos: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4(0, -999, 0, 0)) },
  uFireCol: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector3(1, 0.6, 0.2)) },
  uPaper: { value: new THREE.Color(0xf3ead6) },
  uCamPos: { value: new THREE.Vector3() },
  // spatial focus: everything outside this box fades back towards the paper
  uFocusMin: { value: new THREE.Vector3(-1e4, -1e4, -1e4) },
  uFocusMax: { value: new THREE.Vector3(1e4, 1e4, 1e4) },
  uFocusAmt: { value: 0 },
};

const vertex = /* glsl */ `
in vec3 acol;
in vec3 info;
uniform float uFade[${GROUP_COUNT}];
uniform float uGroupOverride;
uniform float uLabelOverride;
uniform vec3 uTint;
uniform float uTintAmt;
uniform vec3 uFocusMin;
uniform vec3 uFocusMax;
uniform float uFocusAmt;

out vec3 vWorld;
out vec3 vNormal;
out vec3 vCol;
flat out vec3 vInfo;
out float vFade;

void main() {
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(m) * normal);
  vCol = mix(acol, uTint, uTintAmt);
#ifdef USE_INSTANCING_COLOR
  vCol *= instanceColor;
#endif
  float grp = uGroupOverride >= 0.0 ? uGroupOverride : info.z;
  float lb = uLabelOverride >= 0.0 ? uLabelOverride : info.y;
  vInfo = vec3(info.x, lb, grp);
  vec3 outside = max(uFocusMin - wp.xyz, wp.xyz - uFocusMax);
  float od = length(max(outside, 0.0));
  vFade = max(uFade[int(grp + 0.5)], uFocusAmt * smoothstep(0.0, 1.2, od));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragment = /* glsl */ `
precision highp float;
#define MAX_FIRES ${MAX_FIRES}
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oNormal;
layout(location = 2) out vec4 oLabel;

uniform vec3 uSunDir;
uniform float uTime;
uniform vec4 uFirePos[MAX_FIRES];
uniform vec3 uFireCol[MAX_FIRES];
uniform vec3 uPaper;
uniform vec3 uCamPos;
uniform float uEmissive;
uniform float uOpacity;

in vec3 vWorld;
in vec3 vNormal;
in vec3 vCol;
flat in vec3 vInfo;
in float vFade;

// ---- noise -----------------------------------------------------------------
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
                 mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
                 mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}

// Thin ink line where coordinate c crosses a multiple of 1.0, ~1px wide.
float gridLine(float c, float w) {
  float d = abs(fract(c + 0.5) - 0.5);
  float fw = max(fwidth(c), 1e-4);
  return 1.0 - smoothstep(w * fw, (w + 1.0) * fw, d);
}
// fade a pattern out when its cells get smaller than a few pixels
float lod(float c, float px) {
  return 1.0 - smoothstep(0.12, 0.35, fwidth(c) * px);
}

// 2D coordinates on a face: u along the face horizontally, v up (or z on floors).
vec2 faceUV(vec3 p, vec3 n) {
  vec3 an = abs(n);
  if (an.y > 0.75) return p.xz;
  vec2 t = normalize(vec2(-n.z, n.x));
  return vec2(dot(p.xz, t), p.y);
}

// Masonry: courses with staggered joints. Returns (line, stone-id hash).
vec2 masonry(vec2 uv, float courseH, float stoneL) {
  float row = floor(uv.y / courseH);
  float h = hash12(vec2(row, 7.1));
  float u = uv.x / stoneL + h * 3.7;
  float cell = floor(u + 0.35 * hash12(vec2(row, floor(u))));
  float lineH = gridLine(uv.y / courseH, 0.6);
  float lineV = gridLine(u + 0.35 * hash12(vec2(row, floor(u))), 0.6);
  float l = max(lineH, lineV) * lod(uv.y / courseH, 1.0);
  return vec2(l, hash12(vec2(row, cell)));
}

void main() {
  float kind = vInfo.x;
  int k = int(kind + 0.5);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 base = vCol;
  float ink = 0.0; // procedural ink lines (0..1)
  bool cut = (k == 2 || k == 13 || k == 14 || k == 17);
  bool unlit = (k == 8);

  vec2 uv = faceUV(vWorld, N);
  // pigment variation, a soft blotchy wash in world space
  float blot = fbm(vWorld * 0.35);
  float blot2 = fbm(vWorld * 1.7 + 11.0);

  if (k == 1) { // stone
    vec2 m = masonry(uv, 0.42, 0.9);
    ink = m.x * 0.32;
    base *= 0.93 + 0.12 * m.y;
  } else if (k == 2) { // cut stone: rubble core, coursed
    vec2 m = masonry(uv, 0.5, 0.75);
    ink = m.x * 0.55;
    base *= 0.92 + 0.14 * m.y;
  } else if (k == 3 || k == 13) { // timber / end grain
    float g = gridLine((uv.x + uv.y) * 6.0 + blot2 * 3.0, 0.3) * lod((uv.x + uv.y) * 6.0, 1.0);
    ink = g * 0.12;
    if (k == 13) { ink = 0.15 + gridLine(length(fract(uv * 4.0) - 0.5) * 6.0, 0.4) * 0.2; }
  } else if (k == 4) { // roof slates
    vec2 su = vec2(uv.x / 0.35, uv.y / 0.22);
    float row = floor(su.y);
    float l = max(gridLine(su.y, 0.6), gridLine(su.x + hash12(vec2(row, 3.0)) * 0.5 + row * 0.5, 0.5));
    ink = l * 0.35 * lod(su.y, 1.0);
    base *= 0.92 + 0.12 * hash12(vec2(row, floor(su.x + row * 0.5)));
  } else if (k == 14) { // rock in section: strata and hatching
    float strata = vWorld.y * 0.9 + sin(vWorld.x * 0.15) * 0.8 + blot * 1.5;
    ink = gridLine(strata, 0.5) * 0.45;
    float hatch = gridLine((vWorld.x + vWorld.y) * 2.2, 0.35) * lod((vWorld.x + vWorld.y) * 2.2, 1.0);
    ink = max(ink, hatch * 0.18);
    base *= 0.9 + 0.2 * blot;
  } else if (k == 17) { // earth in section
    ink = step(0.93, hash12(floor(vWorld.xy * 9.0))) * 0.4;
  } else if (k == 5) { // rock surface
    base *= 0.85 + 0.3 * blot;
  } else if (k == 6) { // ground
    float stip = step(0.86, hash12(floor(vWorld.xz * 6.0)));
    ink = stip * 0.22 * lod(vWorld.x * 6.0, 1.0);
    base *= 0.88 + 0.22 * blot;
  } else if (k == 9) { // floorboards
    float l = gridLine(uv.y / 0.26, 0.5);
    float row = floor(uv.y / 0.26);
    float e = gridLine(uv.x / 2.4 + hash12(vec2(row, 1.0)), 0.5);
    ink = max(l, e) * 0.3 * lod(uv.y / 0.26, 1.0);
    base *= 0.94 + 0.1 * hash12(vec2(row, 2.0));
  } else if (k == 12) { // flagstones
    vec2 m = masonry(uv, 0.7, 1.0);
    ink = m.x * 0.3;
    base *= 0.92 + 0.14 * m.y;
  } else if (k == 7) { // water
    base *= 0.9 + 0.15 * sin(vWorld.x * 3.0 + uTime * 1.5) * sin(vWorld.z * 2.0 - uTime);
  } else if (k == 18) { // straw
    ink = gridLine(uv.x * 9.0 + blot2 * 4.0, 0.3) * 0.25 * lod(uv.x * 9.0, 1.0);
  }

  // ---- watercolour light --------------------------------------------------
  vec3 col;
  if (unlit || cut) {
    float t = cut ? 0.98 : 1.0;
    col = base * t;
  } else {
    float ndl = dot(N, uSunDir);
    float lit = smoothstep(-0.15, 0.25, ndl) * 0.55 + smoothstep(0.35, 0.75, ndl) * 0.2;
    float sky = 0.5 + 0.5 * N.y;
    vec3 shadowTint = vec3(0.70, 0.71, 0.82);
    vec3 shade = mix(shadowTint, vec3(1.04, 1.0, 0.94), lit) + 0.04 * sky;
    col = base * shade;
  }

  // fire glow: warm wash near hearths
  vec3 glow = vec3(0.0);
  for (int i = 0; i < MAX_FIRES; i++) {
    vec4 fp = uFirePos[i];
    if (fp.w <= 0.0) continue;
    vec3 d = fp.xyz - vWorld;
    float dist = length(d);
    float fall = fp.w / (1.0 + dist * dist * 0.35);
    float facing = unlit ? 1.0 : clamp(dot(N, d / max(dist, 1e-3)) * 0.6 + 0.5, 0.0, 1.0);
    glow += uFireCol[i] * fall * facing;
  }
  col += col * glow * 0.9 + glow * 0.05;

  // blotchy pigment density
  col *= 0.94 + 0.1 * blot;

  // ink from patterns
  vec3 inkCol = vec3(0.17, 0.13, 0.10);
  col = mix(col, inkCol, clamp(ink, 0.0, 1.0) * 0.85);

  if (unlit) col = vCol * (0.9 + 0.2 * blot2) + uEmissive * 0.1;

  // fade back towards the paper when another room is in focus
  float f = vFade;
  vec3 faded = mix(uPaper, vec3(dot(col, vec3(0.3, 0.55, 0.15))), 0.22);
  col = mix(col, faded, f * 0.86);

  oColor = vec4(col, uOpacity);
  oNormal = vec4(normalize((viewMatrix * vec4(N, 0.0)).xyz) * 0.5 + 0.5, f);
  float lb = vInfo.y;
  oLabel = vec4(mod(lb, 256.0) / 255.0, floor(lb / 256.0) / 255.0, kind / 255.0, 1.0);
}
`;

export function makeMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      ...shared,
      uGroupOverride: { value: opts.group ?? -1 },
      uLabelOverride: { value: opts.label ?? -1 },
      uEmissive: { value: 0 },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Color(opts.tint ?? 0xffffff) },
      uTintAmt: { value: opts.tintAmt ?? 0 },
    },
    side: opts.side ?? THREE.FrontSide,
  });
}

/** Add the attributes our material needs to an arbitrary geometry. */
export function paintGeometry(geo, color, kind = 0, label = 0, group = 0) {
  const n = geo.attributes.position.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3);
  const info = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    info[i * 3] = kind;
    info[i * 3 + 1] = label;
    info[i * 3 + 2] = group;
  }
  geo.setAttribute('acol', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('info', new THREE.BufferAttribute(info, 3));
  return geo;
}
