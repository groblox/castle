import * as THREE from 'three';
import { GROUP_COUNT } from '../castle/rooms.js';

// One shader drives every surface in the scene. It writes three targets:
//  0: watercolour-lit colour
//  1: view-space normal (xyz) + fade amount (a)  -> ink edge detection
//  2: label id (rg), surface kind (b)            -> hover/click picking
// Geometry attributes: position, normal, acol (rgb), info (kind, label, group).

export const MAX_FIRES = 32;

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
  // 1 = bright day, 0 = dusk. The default is a grey late-autumn morning.
  uDay: { value: 0.25 },
  uGlowAmt: { value: 0.8 },
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
out float vHide;

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
  float gf = uFade[int(grp + 0.5)];
  vHide = gf;
  vFade = max(gf, uFocusAmt * smoothstep(0.0, 1.2, od));
  vec4 mv = viewMatrix * wp;
  // cut faces win depth ties with the interior faces of touching solids
  float kd = info.x;
  if (kd == 2.0 || kd == 13.0 || kd == 14.0 || kd == 17.0) mv.xyz *= 1.0 - 0.02 / max(length(mv.xyz), 0.1);
  gl_Position = projectionMatrix * mv;
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
uniform float uDay;

in vec3 vWorld;
in vec3 vNormal;
in vec3 vCol;
flat in vec3 vInfo;
in float vFade;
in float vHide;

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

// Irregular rubble: returns (edge distance F2-F1, cell id)
vec2 rubble(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float F1 = 8.0, F2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash12(n + g), hash12(n + g + 17.3)) * 0.78 + 0.11;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < F1) { F2 = F1; F1 = d; id = hash12(n + g + 3.1); }
    else if (d < F2) { F2 = d; }
  }
  return vec2(sqrt(F2) - sqrt(F1), id);
}

// Roofed rooms get little daylight: 1 outdoors, smaller inside.
float roofed(vec3 p) {
  float m = 0.0;
  // north range of service rooms
  if (p.x > -11.85 && p.x < 25.05 && p.z > -21.05 && p.z < -12.45 && p.y < 7.5) m = 1.0;
  // services, chamber, hall and undercroft
  if (p.x > -25.05 && p.x < -12.95 && p.z > -21.05 && p.y < 8.6 && p.y > -4.1) m = 1.0;
  // gatehouse chambers and gate passage
  if (p.x > 20.15 && p.x < 29.85 && p.z > -7.85 && p.y > 5.5 && p.y < 16.6) m = 1.0;
  if (p.x > 19.5 && p.x < 35.0 && p.z > -1.65 && p.y < 4.3) m = 0.8;
  // the rooms in the two cut corner towers
  if (p.z < -20.95 && p.y > -1.6 && p.y < 18.05 && (length(p.xz - vec2(-27.6, -23.6)) < 4.25 || length(p.xz - vec2(27.6, -23.6)) < 4.25)) m = 1.0;
  if (p.z < -20.95 && p.y < 4.0 && p.y > -1.6 && length(p.xz - vec2(-27.6, -23.6)) < 4.25) m = 1.3; // the prison
  // the stable in the north outer ward
  if (p.x > -18.6 && p.x < -5.4 && p.z < -29.9 && p.z > -33.6 && p.y < 2.6) m = 0.8;
  // the undercroft is darker still
  if (p.x > -25.05 && p.x < -12.95 && p.z > -9.1 && p.y < 0.55 && p.y > -4.1) m = 1.4;
  return m;
}

// Rough ground level under a point: the inner ward is at 0, the outer ward
// and the field round about at -1.5. Used to put damp and grime at wall feet.
float groundAt(vec3 p) {
  return (abs(p.x) < 25.2 && p.z > -21.2) ? 0.0 : -1.5;
}
// Lichen: small round rosettes scattered on a face.
float lichen(vec2 uv, float scale, float density) {
  vec2 q = uv * scale;
  vec2 c = floor(q);
  vec2 o = vec2(hash12(c + 3.7), hash12(c + 9.1)) * 0.6 + 0.2;
  float r = 0.12 + 0.28 * hash12(c + 1.3);
  float d = length(fract(q) - o);
  float on = step(1.0 - density, hash12(c + 5.5));
  return on * (1.0 - smoothstep(r * 0.6, r, d)) * lod(q.x, 1.0);
}

void main() {
  if (vHide > 0.97) discard;
  float kind = vInfo.x;
  int k = int(kind + 0.5);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 base = vCol;
  float ink = 0.0; // procedural ink lines (0..1)
  // the outer sides of the terrain block are section faces too
  if (k == 5 && abs(N.y) < 0.3 && (vWorld.x > 71.9 || vWorld.x < -61.9 || vWorld.z < -61.9)) k = 14;
  bool cut = (k == 2 || k == 13 || k == 14 || k == 17);
  bool unlit = (k == 8);

  vec2 uv = faceUV(vWorld, N);
  // pigment variation, a soft blotchy wash in world space
  float blot = fbm(vWorld * 0.35);
  float blot2 = fbm(vWorld * 1.7 + 11.0);

  if (k == 1) { // stone: coursed rubble with dressed quoins
    vec2 m = masonry(uv, 0.42, 0.9);
    ink = m.x * 0.26;
    base *= 0.93 + 0.12 * m.y;
    // putlog holes in diagonal runs on tall walls
    vec2 pg = vec2(uv.x / 3.1 + floor(uv.y / 1.3) * 0.37, uv.y / 1.3);
    vec2 pf = fract(pg);
    float hole = step(abs(pf.x - 0.5), 0.035) * step(abs(pf.y - 0.5), 0.07) * step(2.5, vWorld.y) * step(0.6, hash12(floor(pg)));
    ink = max(ink, hole * 0.75 * lod(uv.y, 3.0));
    // stones from different beds: some warmer, some greyer
    float bed = hash12(vec2(m.y * 91.0, 4.0));
    base *= mix(vec3(1.0), bed > 0.5 ? vec3(1.06, 0.99, 0.9) : vec3(0.94, 0.97, 1.02), abs(bed - 0.5) * 1.2);
    if (abs(N.y) < 0.5) {
      // rain streaks running down from ledges and wall tops
      float st = vnoise(vec3(uv.x * 3.4, vWorld.y * 0.22, 3.0));
      float streak = smoothstep(0.62, 0.85, st) * (0.5 + 0.5 * vnoise(vec3(uv.x * 11.0, vWorld.y * 0.8, 1.0)));
      base *= 1.0 - streak * 0.09;
      // damp and grime rising from the ground, with a green tinge
      float h = vWorld.y - groundAt(vWorld);
      float damp = (1.0 - smoothstep(0.0, 1.4 + blot * 1.2, h)) * step(-0.3, h);
      base = mix(base, base * vec3(0.72, 0.78, 0.66), damp * 0.55);
      // grey-green and ochre lichen
      float li = lichen(uv, 2.6, 0.1) * smoothstep(0.4, 0.65, blot);
      base = mix(base, hash12(floor(uv * 2.6)) > 0.4 ? vec3(0.76, 0.78, 0.68) : vec3(0.8, 0.72, 0.54), li * 0.38);
    } else if (N.y > 0.5) {
      // moss and lichen on wall tops and ledges
      float moss = smoothstep(0.5, 0.7, fbm(vWorld * 1.3 + 4.0));
      base = mix(base, vec3(0.55, 0.6, 0.36), moss * 0.45);
      base = mix(base, vec3(0.8, 0.72, 0.52), lichen(uv, 3.0, 0.14) * 0.4);
    }
  } else if (k == 2) { // cut stone: rubble core in section, with light hatching
    vec2 q = vec2(uv.x / 0.5, uv.y / 0.34);
    vec2 rb = rubble(q);
    float fw = max(fwidth(q.x), 1e-4);
    float joint = (1.0 - smoothstep(0.6 * fw, 1.6 * fw + 0.04, rb.x)) * lod(q.x, 1.2);
    float hatch = gridLine((uv.x - uv.y) * 3.0, 0.4) * lod((uv.x - uv.y) * 3.0, 1.0);
    ink = max(joint * 0.5, hatch * 0.16);
    base *= 0.88 + 0.2 * rb.y;
  } else if (k == 3 || k == 13) { // timber / end grain
    float g = gridLine((uv.x + uv.y) * 6.0 + blot2 * 3.0, 0.3) * lod((uv.x + uv.y) * 6.0, 1.0);
    ink = g * 0.12;
    // old timber: uneven colour, darker checks and weathered grey where it faces the sky
    base *= 0.9 + 0.18 * vnoise(vec3(uv * vec2(0.8, 6.0), 2.0));
    if (N.y > 0.6) base = mix(base, vec3(dot(base, vec3(0.33))) * vec3(0.98, 0.98, 1.0), 0.25);
    if (k == 13) {
      float ring = gridLine(length(fract(uv * 2.5) - 0.5) * 7.0, 0.4) * lod(uv.x * 2.5, 2.0);
      ink = max(0.12, ring * 0.35);
    }
  } else if (k == 4) { // roof slates
    vec2 su = vec2(uv.x / 0.35, uv.y / 0.22);
    float row = floor(su.y);
    float l = max(gridLine(su.y, 0.6), gridLine(su.x + hash12(vec2(row, 3.0)) * 0.5 + row * 0.5, 0.5));
    ink = l * 0.3 * lod(su.y, 1.0);
    float slate = hash12(vec2(row, floor(su.x + row * 0.5)));
    base *= 0.88 + 0.18 * slate;
    // the odd replaced slate, paler and bluer
    base = mix(base, base * vec3(1.08, 1.1, 1.16), step(0.95, slate));
    // moss in patches, mostly towards the eaves; lichen rosettes
    float moss = smoothstep(0.52, 0.72, fbm(vWorld * 0.9 + 2.0)) * (0.5 + 0.5 * smoothstep(0.4, 0.0, fract(vWorld.y * 0.12)));
    base = mix(base, vec3(0.5, 0.56, 0.34), moss * 0.6);
    base = mix(base, vec3(0.82, 0.78, 0.62), lichen(uv, 4.0, 0.07) * 0.35);
    // streaks running down the slope
    base *= 1.0 - smoothstep(0.6, 0.85, vnoise(vec3(uv.x * 3.0, uv.y * 0.3, 7.0))) * 0.12;
  } else if (k == 14) { // rock in section: bedding planes and sparse hatching
    float strata = vWorld.y * 0.34 + sin(vWorld.x * 0.11 + 1.3) * 0.6 + blot * 1.0;
    ink = gridLine(strata, 0.4) * 0.28 * lod(strata, 1.0);
    float hatch = gridLine((vWorld.x + vWorld.y) * 1.4, 0.3) * lod((vWorld.x + vWorld.y) * 1.4, 1.0);
    ink = max(ink, hatch * 0.1);
    // vertical joints, each confined to its bed
    float band = floor(strata);
    float jx = vWorld.x * (0.18 + 0.12 * hash12(vec2(band, 2.0))) + hash12(vec2(band, 5.0)) * 7.0;
    float joint = gridLine(jx + 0.25 * fbm(vWorld * 0.9), 0.4) * step(0.8, hash12(vec2(band, floor(jx + 0.5))));
    ink = max(ink, joint * 0.16 * lod(jx, 1.0));
    // quartz veins and iron staining
    float vein = gridLine((vWorld.x * 0.7 - vWorld.y * 1.1) * 0.25 + fbm(vWorld * 0.4) * 1.5, 0.6);
    base = mix(base, vec3(0.86, 0.84, 0.78), vein * 0.5 * lod(vWorld.x * 0.2, 1.0));
    base = mix(base, base * vec3(1.05, 0.94, 0.84), smoothstep(0.6, 0.8, fbm(vWorld * 0.12 + 9.0)) * 0.5);
    base *= 0.9 + 0.2 * blot;
    // a ragged band of stony topsoil under the turf, where the cut crosses open ground
    if (abs(N.z) > 0.9 && abs(vWorld.x) > 28.6) {
      float x = vWorld.x;
      float top = x < -40.0 ? -14.0 + (x + 62.0) / 22.0 * 12.5 : (x > 44.0 && x < 52.0) ? -7.0 : x > 52.0 ? -2.2 - (x - 52.0) / 20.0 * 1.8 : -1.5;
      float depth = top - vWorld.y + (fbm(vWorld * 1.5) - 0.5) * 0.35;
      float soil = 1.0 - smoothstep(0.45, 0.6, depth);
      vec2 sc = floor(vWorld.xy * 7.0);
      float stone = step(0.88, hash12(sc)) * (1.0 - smoothstep(0.2, 0.4, length(fract(vWorld.xy * 7.0) - 0.5)));
      base = mix(base, mix(vec3(0.55, 0.45, 0.34), vec3(0.72, 0.68, 0.6), stone), soil * step(-0.05, depth));
      ink = mix(ink, max(stone * 0.3, gridLine(depth * 2.0 - 1.0, 0.4) * 0.15), soil);
    }
  } else if (k == 17) { // earth in section
    ink = step(0.93, hash12(floor(vWorld.xy * 9.0))) * 0.4 * lod(vWorld.x * 9.0, 1.0);
  } else if (k == 5) { // rock surface: weathered beds and fissures on steep faces
    base *= 0.85 + 0.3 * blot;
    if (abs(N.y) < 0.6) {
      float strata = vWorld.y * 0.9 + sin(uv.x * 0.4) * 0.5 + blot * 1.5;
      ink = gridLine(strata, 0.4) * 0.2 * lod(strata, 1.0);
      float fis = gridLine(uv.x * 0.6 + fbm(vWorld * 0.8) * 1.2, 0.4) * step(0.5, hash12(vec2(floor(uv.x * 0.6 + 0.5), floor(strata))));
      ink = max(ink, fis * 0.22 * lod(uv.x * 0.6, 1.0));
      base = mix(base, vec3(0.6, 0.64, 0.46), smoothstep(0.62, 0.8, fbm(vWorld * 0.7)) * 0.45);
    }
  } else if (k == 6) { // ground: stippled turf or trodden earth
    vec2 sc = floor(vWorld.xz * 6.0);
    float stip = step(0.86, hash12(sc)) * (1.0 - smoothstep(0.12, 0.22, length(fract(vWorld.xz * 6.0) - 0.5 + (vec2(hash12(sc + 3.0), hash12(sc + 5.0)) - 0.5) * 0.4)));
    ink = stip * 0.25 * lod(vWorld.x * 6.0, 1.0);
    base *= 0.86 + 0.24 * blot;
    bool grass = base.g > base.r * 0.95;
    if (grass) {
      // tussocks, darker rushy patches and a scatter of flowers
      float tuss = smoothstep(0.5, 0.75, fbm(vWorld * 0.8 + 3.0));
      base = mix(base, base * vec3(0.78, 0.86, 0.7), tuss * 0.7);
      float tufts = gridLine(vWorld.x * 7.0 + blot2 * 3.0, 0.3) * step(0.6, blot2) * lod(vWorld.x * 7.0, 1.0);
      ink = max(ink, tufts * 0.18);
      vec2 fc = floor(vWorld.xz * 3.0);
      float fl = step(0.965, hash12(fc + 2.0)) * (1.0 - smoothstep(0.08, 0.16, length(fract(vWorld.xz * 3.0) - 0.5))) * lod(vWorld.x * 3.0, 1.2);
      base = mix(base, hash12(fc) > 0.5 ? vec3(0.96, 0.94, 0.86) : vec3(0.93, 0.8, 0.32), fl * 0.8);
    } else {
      // trodden earth: damp hollows, pebbles and wheel ruts
      float wetP = smoothstep(0.58, 0.72, fbm(vWorld * 0.45 + 6.0));
      base = mix(base, base * vec3(0.72, 0.72, 0.74), wetP * 0.6);
      vec2 pc = floor(vWorld.xz * 8.0);
      float peb = step(0.9, hash12(pc + 4.0)) * (1.0 - smoothstep(0.15, 0.3, length(fract(vWorld.xz * 8.0) - 0.5)));
      base = mix(base, vec3(0.62, 0.58, 0.52), peb * 0.5 * lod(vWorld.x * 8.0, 1.0));
      ink = max(ink, peb * 0.2 * lod(vWorld.x * 8.0, 1.0));
    }
  } else if (k == 9) { // floorboards
    float l = gridLine(uv.y / 0.26, 0.5);
    float row = floor(uv.y / 0.26);
    float e = gridLine(uv.x / 2.4 + hash12(vec2(row, 1.0)), 0.5);
    ink = max(l, e) * 0.28 * lod(uv.y / 0.26, 1.0);
    base *= 0.92 + 0.14 * hash12(vec2(row, 2.0));
    // grain, knots and a worn, paler track down the middle of the room
    ink = max(ink, gridLine(uv.y / 0.26 * 4.0 + blot2 * 2.0, 0.2) * 0.07 * lod(uv.y * 16.0, 1.0));
    vec2 kc = vec2(floor(uv.x / 0.7), row);
    vec2 kp = vec2(fract(uv.x / 0.7) - hash12(kc) * 0.6 - 0.2, fract(uv.y / 0.26) - 0.5) * vec2(0.7 / 0.26, 1.0);
    float knot = step(0.82, hash12(kc + 8.0)) * (1.0 - smoothstep(0.08, 0.16, length(kp)));
    ink = max(ink, knot * 0.45 * lod(uv.y / 0.26, 2.0));
    base *= 1.0 + 0.06 * smoothstep(0.55, 0.8, fbm(vWorld * 0.5));
  } else if (k == 12) { // flagstones
    vec2 m = masonry(uv, 0.7, 1.0);
    ink = m.x * 0.26;
    base *= 0.9 + 0.18 * m.y;
    // hollows worn into the flags, cracks, and dirt in the joints
    base *= 1.0 + 0.07 * smoothstep(0.5, 0.75, fbm(vWorld * 0.7 + 1.0));
    float crack = gridLine(uv.x * 1.3 + fbm(vWorld * 2.5) * 2.2, 0.3) * step(0.82, hash12(vec2(m.y * 37.0, 1.0)));
    ink = max(ink, crack * 0.3 * lod(uv.x * 1.3, 1.0));
    base = mix(base, base * vec3(0.8, 0.82, 0.72), m.x * 0.5);
  } else if (k == 7) { // water
    base *= 0.9 + 0.15 * sin(vWorld.x * 3.0 + uTime * 1.5) * sin(vWorld.z * 2.0 - uTime);
  } else if (k == 10) { // limewash: smoke-browned towards the top, scuffed near the floor
    base *= 1.0 - 0.1 * smoothstep(0.45, 0.8, fbm(vWorld * 0.6));
    base = mix(base, base * vec3(0.86, 0.8, 0.7), smoothstep(2.5, 6.0, vWorld.y - groundAt(vWorld)) * 0.4);
  } else if (k == 20) { // foliage: dabs of light and dark green, a few ink ticks
    float d = vnoise(vWorld * 4.0);
    base *= 0.78 + 0.4 * d;
    float tick = step(0.82, hash13(floor(vWorld * 6.0))) * lod(vWorld.x * 6.0, 1.0);
    ink = tick * 0.3;
  } else if (k == 21) { // limewash lined out in red as false ashlar
    vec2 pu = uv + vec2(0.0, 0.02);
    float prow = floor(pu.y / 0.5);
    float pl = max(gridLine(pu.y / 0.5, 0.15), gridLine(pu.x / 1.1 + hash12(vec2(prow, 7.1)) * 3.7, 0.15)) * lod(pu.y / 0.5, 1.0);
    base = mix(base, vec3(0.7, 0.32, 0.24), pl * 0.6);
    base *= 1.0 - 0.08 * smoothstep(0.45, 0.8, fbm(vWorld * 0.6));
  } else if (k == 22) { // wattle: hazel rods woven round stakes
    float rows = uv.y / 0.06;
    float stake = floor(uv.x / 0.3);
    float over = mod(floor(rows) + stake, 2.0);
    ink = gridLine(rows, 0.5) * 0.35 * lod(rows, 1.0);
    ink = max(ink, gridLine(uv.x / 0.3, 0.8) * 0.4 * lod(uv.x / 0.3, 1.0));
    base *= 0.86 + 0.18 * over;
  } else if (k == 23) { // skep: coiled straw rope
    float coil = vWorld.y / 0.07;
    ink = gridLine(coil, 0.6) * 0.4 * lod(coil, 1.0);
    ink = max(ink, gridLine(uv.x * 8.0 + floor(coil) * 0.5, 0.3) * 0.18 * lod(uv.x * 8.0, 1.0));
  } else if (k == 24) { // log ends: packed circles of end grain with dark gaps
    vec2 q = uv / 0.15;
    q.x += 0.5 * mod(floor(q.y), 2.0);
    vec2 c = floor(q);
    float rr = 0.38 + 0.1 * hash12(c);
    float d = length(fract(q) - 0.5 + (vec2(hash12(c + 1.0), hash12(c + 2.0)) - 0.5) * 0.12);
    float inside = 1.0 - smoothstep(rr - 0.06, rr, d);
    base = mix(base * 0.35, base * vec3(1.25, 1.12, 0.92), inside);
    ink = max(gridLine(d * 6.0, 0.3) * 0.25 * inside, (1.0 - inside) * 0.15) * lod(q.x, 1.0);
  } else if (k == 25) { // cobbles: rounded stones set in earth
    vec2 rb = rubble(uv / 0.16);
    float fw = max(fwidth(uv.x / 0.16), 1e-4);
    float edge = 1.0 - smoothstep(0.6 * fw, 2.2 * fw + 0.12, rb.x);
    base *= 0.84 + 0.26 * rb.y;
    base = mix(base, base * vec3(0.7, 0.68, 0.62), edge * 0.7);
    ink = edge * 0.35 * lod(uv.x / 0.16, 1.0);
  } else if (k == 18) { // straw
    ink = gridLine(uv.x * 9.0 + blot2 * 4.0, 0.3) * 0.25 * lod(uv.x * 9.0, 1.0);
  } else if (k == 19) { // fur: short strokes
    ink = gridLine(uv.x * 14.0 + blot2 * 6.0, 0.25) * 0.18 * lod(uv.x * 14.0, 1.0);
  }

  // smoke-blackened walls and timbers in the rooms with open fires
  // (kitchen, bakehouse, brewhouse): darker towards the roof
  if ((k == 1 || k == 3 || k == 4 || k == 10) && N.y < 0.3 && vWorld.x > -6.65 && vWorld.x < 18.65 && vWorld.z < -12.45 && vWorld.z > -21.05 && vWorld.y < 11.9) {
    // plumes of soot rising from each hearth mouth
    float px = min(min(abs(vWorld.x + 3.4), abs(vWorld.x - 2.2)), min(abs(vWorld.x - 9.2), abs(vWorld.x - 13.4)));
    float plume = exp(-px * px / (0.8 + 0.25 * max(vWorld.y - 2.5, 0.0))) * smoothstep(2.0, 3.6, vWorld.y) * step(vWorld.z, -20.0);
    float sm = smoothstep(0.8, 6.5, vWorld.y) * (0.75 + 0.5 * fbm(vWorld * 0.5 + 2.0)) + plume * 0.8;
    base = mix(base, base * vec3(0.4, 0.36, 0.33), clamp(sm, 0.0, 1.0) * 0.75);
  }

  // ---- watercolour light --------------------------------------------------
  vec3 col;
  if (unlit || cut) {
    col = cut ? base * mix(0.74, 1.0, uDay) : base;
  } else {
    // two washes: a light one everywhere, a cool shadow wash with ragged edges
    float ndl = dot(N, uSunDir) + (blot - 0.5) * 0.25;
    float lit = smoothstep(-0.05, 0.2, ndl) * 0.62 + smoothstep(0.45, 0.7, ndl) * 0.18;
    float sky = 0.5 + 0.5 * N.y;
    // grey, low light by default; warm low sun towards dusk; full sun by day
    vec3 shadowTint = mix(vec3(0.38, 0.42, 0.58), vec3(0.66, 0.68, 0.80), uDay);
    vec3 sunCol = mix(vec3(0.98, 0.8, 0.62), vec3(1.05, 1.01, 0.95), uDay);
    vec3 shade = mix(shadowTint, sunCol, lit * mix(0.55, 1.0, uDay)) + 0.05 * sky;
    float daylight = mix(0.32, 1.0, uDay);
    float inside = roofed(vWorld);
    daylight *= 1.0 - inside * mix(0.62, 0.22, uDay);
    col = base * shade * daylight;
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
  // firelight carries the rooms when daylight is low
  col += base * glow * mix(1.5, 0.8, uDay) + glow * 0.05;

  // blotchy pigment density
  col *= 0.94 + 0.1 * blot;

  // ink from patterns
  vec3 inkCol = vec3(0.17, 0.13, 0.10);
  col = mix(col, inkCol, clamp(ink, 0.0, 1.0) * 0.85);

  if (unlit) col = vCol * (0.9 + 0.2 * blot2) + uEmissive * 0.1;

  // aerial perspective: distant things go paler
  float camD = length(vWorld - uCamPos);
  col = mix(col, uPaper, smoothstep(90.0, 320.0, camD) * 0.35);

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
