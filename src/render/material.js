import * as THREE from 'three';
import { GROUP_COUNT } from '../castle/rooms.js';
import { SITE_ID } from '../site.js';
import { ABERWEN_GLSL } from '../castle/shader.js';
import { AGUZADERAS_GLSL } from '../aguzaderas/shader.js';

// the parts of the shader that know the plan of the castle on show
const SITE_GLSL = SITE_ID === 'aguzaderas' ? AGUZADERAS_GLSL : ABERWEN_GLSL;

// One shader drives every surface in the scene. It writes three targets:
//  0: watercolour-lit colour
//  1: view-space normal (xyz) + fade amount (a)  -> ink edge detection
//  2: label id (rg), surface kind (b)            -> hover/click picking
// Geometry attributes: position, normal, acol (rgb), info (kind, label, group).

export const MAX_FIRES = 32;

export const shared = {
  // fade per group, four groups to a vec4 (set them with setFades)
  uFade: { value: Array.from({ length: GROUP_COUNT / 4 }, () => new THREE.Vector4()) },
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.45, 0.8, 0.42).normalize() },
  uFirePos: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4(0, -999, 0, 0)) },
  uFireCol: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4(1, 0.6, 0.2, 1)) },
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

// The light and fade tables live in a uniform buffer shared by every surface
// (block Tables, at binding point 0, where every block starts out). As plain
// uniform arrays three.js uploaded them all over again at every change of
// material, and there is one material per figure; this way they go up once a
// frame, in one call, before the scene pass begins (uploadTables, called by
// the pipeline). three.js's own uniform groups write element by element and
// would claim binding point 0 for themselves. Every element is a vec4, so the
// std140 layout is simply the tables one after another.
const TABLES = ['uFirePos', 'uFireCol', 'uFade'];
const tableData = new Float32Array((MAX_FIRES * 2 + GROUP_COUNT / 4) * 4);
let tableBuf = null;

export function uploadTables(gl) {
  let o = 0;
  for (const k of TABLES) {
    for (const v of shared[k].value) {
      v.toArray(tableData, o);
      o += 4;
    }
  }
  if (!tableBuf) {
    tableBuf = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, tableBuf);
    gl.bufferData(gl.UNIFORM_BUFFER, tableData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, tableBuf);
  }
  gl.bindBuffer(gl.UNIFORM_BUFFER, tableBuf);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, tableData);
  gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

const TABLES_GLSL = /* glsl */ `
layout(std140) uniform Tables {
  vec4 uFirePos[${MAX_FIRES}];
  vec4 uFireCol[${MAX_FIRES}];
  vec4 uFade[${GROUP_COUNT / 4}];
};
`;

/** Set the fade of every group from an array of GROUP_COUNT numbers. */
export function setFades(f) {
  for (let i = 0; i < GROUP_COUNT; i++) shared.uFade.value[i >> 2].setComponent(i & 3, f[i]);
}

// the per-material uniforms: the shared ones less the tables
function surfaceUniforms(own) {
  const u = { ...shared, ...own };
  for (const k of TABLES) delete u[k];
  return u;
}

const vertex = /* glsl */ `
// the depth pre-pass must land on exactly the same depths as the full pass
invariant gl_Position;
in vec3 acol;
in vec3 info;
${TABLES_GLSL}
uniform float uGroupOverride;
uniform float uLabelOverride;
uniform vec3 uTint;
uniform float uTintAmt;
uniform vec3 uFocusMin;
uniform vec3 uFocusMax;
uniform float uFocusAmt;
#ifdef RIGID_PARTS
// a merged figure: each vertex follows the joint of its body part
in float part;
uniform mat4 uParts[RIGID_PARTS];
#endif
#ifdef BANNER
// cloth streaming in the wind, rippled here rather than rebuilt on the CPU:
// position.xy holds the point's place (u along, v down) on the cloth
uniform float uTime;
uniform vec3 uBannerTop;  // x, y, z where the cloth meets the pole
uniform vec4 uBannerSize; // length, depth, phase, 1 for a tapering pennon
uniform vec2 uBannerWind; // wind direction (x, z)
uniform vec2 uBannerStep; // one grid cell in u and v
uniform float uGust;
vec3 bannerAt(vec2 q) {
  float u = q.x;
  float v = q.y;
  float vv = uBannerSize.w > 0.5 ? 0.5 + (v - 0.5) * (1.0 - u * 0.95) : v;
  float wave = sin(u * 9.5 - uTime * 5.2 * uGust + uBannerSize.z + v * 0.6) * (0.04 + 0.2 * u) * uGust;
  wave += sin(u * 17.0 - uTime * 8.0 + v * 2.0) * 0.03 * u;
  float along = u * uBannerSize.x * (0.97 + 0.03 * uGust);
  float droop = (1.0 - uGust) * u * u * 0.6;
  vec2 xz = uBannerTop.xz + uBannerWind * along + vec2(-uBannerWind.y, uBannerWind.x) * wave;
  return vec3(xz.x, uBannerTop.y - vv * uBannerSize.y - droop, xz.y);
}
#endif

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
#ifdef RIGID_PARTS
  m = m * uParts[int(part + 0.5)];
#endif
  vec3 pos = position;
  vec3 nrm = normal;
#ifdef BANNER
  pos = bannerAt(position.xy);
  vec2 su = vec2(uBannerStep.x, 0.0);
  vec2 sv = vec2(0.0, uBannerStep.y);
  nrm = normalize(cross(bannerAt(position.xy + su) - bannerAt(position.xy - su), bannerAt(position.xy + sv) - bannerAt(position.xy - sv)));
#endif
  vec4 wp = m * vec4(pos, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(m) * nrm);
  vCol = mix(acol, uTint, uTintAmt);
#ifdef USE_INSTANCING_COLOR
  vCol *= instanceColor;
#endif
  float grp = uGroupOverride >= 0.0 ? uGroupOverride : info.z;
  float lb = uLabelOverride >= 0.0 ? uLabelOverride : info.y;
  vInfo = vec3(info.x, lb, grp);
  vec3 outside = max(uFocusMin - wp.xyz, wp.xyz - uFocusMax);
  float od = length(max(outside, 0.0));
  int g = int(grp + 0.5);
  float gf = uFade[g >> 2][g & 3];
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
${TABLES_GLSL}
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

${SITE_GLSL}
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
  if (k == 5 && sectionSide(vWorld, N)) k = 14;
  bool cut = (k == 2 || k == 13 || k == 14 || k == 17);
  bool unlit = (k == 8);

  vec2 uv = faceUV(vWorld, N);
  // pigment variation, a soft blotchy wash in world space
  float blot = fbm(vWorld * 0.35);
  // a finer one, only for the kinds that use it (fbm is not cheap)
  float blot2 = (k == 3 || k == 13 || k == 6 || k == 9 || k == 18 || k == 19 || unlit) ? fbm(vWorld * 1.7 + 11.0) : 0.0;

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
    topsoil(vWorld, N, base, ink);
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
  } else if (k == 26) { // rubble masonry: irregular stones bedded in pale lime mortar
    vec2 q = vec2(uv.x / 0.36, uv.y / 0.25);
    vec2 rb = rubble(q);
    float fw = max(fwidth(q.x), 1e-4);
    float joint = (1.0 - smoothstep(0.5 * fw, 1.4 * fw + 0.07, rb.x)) * lod(q.x, 1.2);
    base *= 0.86 + 0.24 * rb.y;
    base = mix(base, base * vec3(1.08, 1.06, 1.0), joint * 0.6);
    ink = joint * 0.2;
    // the lifts in which the wall was raised, a little under a metre each
    ink = max(ink, gridLine(uv.y / 0.85 + 0.3, 0.35) * 0.1 * lod(uv.y / 0.85, 1.0));
    if (abs(N.y) < 0.5) {
      float h = vWorld.y - groundAt(vWorld);
      float damp = (1.0 - smoothstep(0.0, 1.0 + blot, h)) * step(-0.3, h);
      base = mix(base, base * vec3(0.78, 0.8, 0.7), damp * 0.45);
      float st = vnoise(vec3(uv.x * 3.4, vWorld.y * 0.22, 5.0));
      base *= 1.0 - smoothstep(0.62, 0.85, st) * 0.08;
    }
  } else if (k == 18) { // straw
    ink = gridLine(uv.x * 9.0 + blot2 * 4.0, 0.3) * 0.25 * lod(uv.x * 9.0, 1.0);
  } else if (k == 19) { // fur: short strokes
    ink = gridLine(uv.x * 14.0 + blot2 * 6.0, 0.25) * 0.18 * lod(uv.x * 14.0, 1.0);
  }

  soot(k, vWorld, N, base);

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
    // too far to add even one step of colour
    float dd = dot(d, d);
    if (dd * 0.35 > fp.w * 800.0) continue;
    float dist = sqrt(dd);
    float fall = fp.w / (1.0 + dd * 0.35);
    float facing = unlit ? 1.0 : clamp(dot(N, d / max(dist, 1e-3)) * 0.6 + 0.5, 0.0, 1.0);
    glow += uFireCol[i].rgb * fall * facing;
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
    uniforms: surfaceUniforms({
      uGroupOverride: { value: opts.group ?? -1 },
      uLabelOverride: { value: opts.label ?? -1 },
      uEmissive: { value: 0 },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Color(opts.tint ?? 0xffffff) },
      uTintAmt: { value: opts.tintAmt ?? 0 },
    }),
    side: opts.side ?? THREE.FrontSide,
  });
}

/**
 * Depth only, for a pre-pass over the static mesh. The full surface shader
 * is costly, and the castle stacks many walls, floors and roofs behind one
 * another; with the depths already laid down, only the nearest surface at
 * each pixel runs it. Faded-out groups are discarded here as they are there.
 */
export function makeDepthMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      in float vHide;
      void main() {
        if (vHide > 0.97) discard;
      }
    `,
    uniforms: surfaceUniforms({
      uGroupOverride: { value: -1 },
      uLabelOverride: { value: -1 },
      uTint: { value: new THREE.Color(0xffffff) },
      uTintAmt: { value: 0 },
    }),
    colorWrite: false,
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
