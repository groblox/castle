import * as THREE from 'three';
import { shared } from './material.js';

// Ink-and-watercolour post pass.
//  * Ink: edges found from inverse depth (2nd derivative: creases and
//    silhouettes), view normals and label/kind boundaries; lines wobble with
//    a low-frequency paper field and break up with the paper grain. Cut faces
//    get a heavier outline so the section reads at a glance.
//  * Wash: colour sampled slightly off-register from the ink, darkened where
//    pigment pools at the edges of washes, granulating in the paper tooth.
//  * Paper: the whole frame, background included, is printed on the paper
//    texture, with a faint sky wash behind the castle.
export function makePostMaterial(target, paper, camera) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tColor: { value: target.textures[0] },
      tNormal: { value: target.textures[1] },
      tLabel: { value: target.textures[2] },
      tDepth: { value: target.depthTexture },
      tPaper: { value: paper },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPx: { value: 1 },
      uTime: { value: 0 },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uPaperCol: { value: new THREE.Color(0xf3ead6) },
      uInk: { value: new THREE.Color(0x2a2018) },
      uInkAmt: { value: 1 },
      uDay: shared.uDay,
    },
    vertexShader: /* glsl */ `
      out vec2 vUv;
      void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      layout(location = 0) out vec4 oColor;
      in vec2 vUv;
      uniform sampler2D tColor;
      uniform sampler2D tNormal;
      uniform sampler2D tLabel;
      uniform sampler2D tDepth;
      uniform sampler2D tPaper;
      uniform vec2 uRes;
      uniform float uPx;
      uniform float uNear;
      uniform float uFar;
      uniform vec3 uPaperCol;
      uniform vec3 uInk;
      uniform float uInkAmt;
      uniform float uDay;

      float invDepth(vec2 uv) {
        float d = texture(tDepth, uv).r;
        float z = uNear * uFar / (uFar - d * (uFar - uNear));
        return 1.0 / z;
      }
      vec4 lab(vec2 uv) { return texture(tLabel, uv); }
      vec3 nrm(vec2 uv) { return texture(tNormal, uv).xyz * 2.0 - 1.0; }
      bool isCut(float kind255) {
        float k = floor(kind255 * 255.0 + 0.5);
        return k == 2.0 || k == 13.0 || k == 14.0 || k == 17.0 || k == 7.0;
      }

      void main() {
        vec2 px = 1.0 / uRes;
        // paper lookups are fixed to the screen at a constant physical scale
        vec2 puv = gl_FragCoord.xy / (512.0 * uPx);
        vec4 pap = texture(tPaper, puv);
        vec4 papLo = texture(tPaper, puv * 0.23 + 0.37);
        float grain = pap.r;
        float mott = pap.g;
        float fibre = pap.b;

        // hand wobble for the ink, and an off-register shift for the wash
        vec2 wob = (vec2(papLo.g, texture(tPaper, puv * 0.19 + 0.71).g) - 0.5) * 2.4 * uPx * px;
        vec2 uvI = vUv + wob;
        vec2 uvC = vUv + wob * 1.6 + vec2(0.6, -0.4) * uPx * px;

        float th = max(1.0, 0.9 * uPx);
        vec2 dx = vec2(px.x * th, 0.0);
        vec2 dy = vec2(0.0, px.y * th);

        vec4 lC = lab(uvI);
        float has = lC.a;

        // ---- ink: depth second derivative --------------------------------
        float wC = invDepth(uvI);
        float wL = invDepth(uvI - dx), wR = invDepth(uvI + dx);
        float wD = invDepth(uvI - dy), wU = invDepth(uvI + dy);
        float wLD = invDepth(uvI - dx - dy), wRU = invDepth(uvI + dx + dy);
        float wLU = invDepth(uvI - dx + dy), wRD = invDepth(uvI + dx - dy);
        float wMax = max(max(max(wC, wL), max(wR, wD)), wU);
        float d2 = max(max(abs(wL + wR - 2.0 * wC), abs(wD + wU - 2.0 * wC)),
                       max(abs(wLD + wRU - 2.0 * wC), abs(wLU + wRD - 2.0 * wC)) * 0.7);
        float eDepth = smoothstep(0.012, 0.03, d2 / max(wMax, 1e-6));

        // ---- ink: normals --------------------------------------------------
        vec4 nC4 = texture(tNormal, uvI);
        vec3 nC = nC4.xyz * 2.0 - 1.0;
        float fade = nC4.a;
        float nd = 0.0;
        nd = max(nd, 1.0 - dot(nC, nrm(uvI - dx)));
        nd = max(nd, 1.0 - dot(nC, nrm(uvI + dx)));
        nd = max(nd, 1.0 - dot(nC, nrm(uvI - dy)));
        nd = max(nd, 1.0 - dot(nC, nrm(uvI + dy)));
        float eNormal = smoothstep(0.18, 0.4, nd) * has;

        // ---- ink: label and kind boundaries; heavy line round cut faces ----
        vec4 lL = lab(uvI - dx), lR = lab(uvI + dx), lD = lab(uvI - dy), lU = lab(uvI + dy);
        float eLabel = 0.0;
        float sameL = float(lL.rg == lC.rg) * float(lR.rg == lC.rg) * float(lD.rg == lC.rg) * float(lU.rg == lC.rg);
        eLabel = (1.0 - sameL) * 0.55 * has;
        bool cC = isCut(lC.b) && has > 0.5;
        float eCut = 0.0;
        if (cC) {
          vec2 dx2 = dx * 1.6, dy2 = dy * 1.6;
          float o = 0.0;
          o += float(!isCut(lab(uvI - dx2).b));
          o += float(!isCut(lab(uvI + dx2).b));
          o += float(!isCut(lab(uvI - dy2).b));
          o += float(!isCut(lab(uvI + dy2).b));
          eCut = clamp(o, 0.0, 1.0);
        }

        float ink = max(max(eDepth, eNormal), max(eLabel, eCut));
        // hairline cracks where polygons meet (T-junctions): a pixel much
        // farther than all four neighbours is filled in rather than inked
        float wN = min(min(wL, wR), min(wD, wU));
        bool crack = wC < wN * 0.97;
        if (crack) ink = 0.0;
        // dry-brush breakup and pressure variation
        float press = 0.72 + 0.4 * grain;
        press *= smoothstep(0.18, 0.42, texture(tPaper, puv * 0.5 + 0.13).g + 0.12);
        ink *= clamp(press, 0.0, 1.0);
        ink *= 1.0 - fade * 0.82;
        ink *= uInkAmt;

        // ---- wash ------------------------------------------------------------
        vec3 col = texture(tColor, uvC).rgb;
        float hasC = texture(tLabel, uvC).a;
        if (crack) {
          col = 0.25 * (texture(tColor, uvC + dx).rgb + texture(tColor, uvC - dx).rgb + texture(tColor, uvC + dy).rgb + texture(tColor, uvC - dy).rgb);
          hasC = 1.0;
        }
        // pigment pooling at the edges of washes (wider-radius edge)
        vec2 r3x = dx * 3.0, r3y = dy * 3.0;
        float w3 = abs(invDepth(uvC - r3x) + invDepth(uvC + r3x) - 2.0 * invDepth(uvC))
                 + abs(invDepth(uvC - r3y) + invDepth(uvC + r3y) - 2.0 * invDepth(uvC));
        float pool = smoothstep(0.02, 0.09, w3 / max(invDepth(uvC), 1e-6));
        vec3 cA = texture(tColor, uvC + r3x).rgb + texture(tColor, uvC - r3x).rgb
                + texture(tColor, uvC + r3y).rgb + texture(tColor, uvC - r3y).rgb;
        float cdiff = length(col - cA * 0.25);
        pool = max(pool, smoothstep(0.03, 0.12, cdiff));
        col *= 1.0 - pool * 0.13 * (1.0 - fade);

        // granulation: pigment settles into the paper tooth, most in dark washes
        float lum = dot(col, vec3(0.3, 0.55, 0.15));
        col *= 1.0 - (0.5 - grain) * 0.2 * (1.0 - lum * 0.6);
        // light, transparent washes let the paper through
        col = mix(uPaperCol, col, mix(0.96, 0.9, uDay) + 0.04 * mott);

        // background: paper with a faint, uneven sky wash high up
        vec3 bg = uPaperCol;
        float skyBand = smoothstep(0.35, 0.95, vUv.y + (papLo.g - 0.5) * 0.25);
        // grey cloud by default, a warm dusk low down as the light goes
        vec3 skyCol = mix(vec3(0.6, 0.6, 0.66), vec3(0.80, 0.85, 0.88), uDay);
        bg = mix(bg, skyCol, skyBand * mix(0.5, 0.28, uDay));
        bg = mix(bg, vec3(0.93, 0.72, 0.52), (1.0 - smoothstep(0.2, 0.6, vUv.y)) * (1.0 - smoothstep(0.0, 0.4, uDay)) * 0.25);
        // where there is no geometry the colour target holds paper plus any
        // smoke or steam drawn over it: carry that across onto the sky wash
        col = mix(bg * (col / uPaperCol), col, hasC);

        // ink over the wash
        col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.92);

        // paper over everything: mottling and fibres
        col *= 0.955 + 0.07 * mott;
        col *= 1.0 - fibre * 0.07;
        col *= 0.985 + 0.03 * grain;
        // gentle vignette
        vec2 vv = vUv - 0.5;
        col *= 1.0 - dot(vv, vv) * mix(0.55, 0.22, uDay);

        oColor = vec4(col, 1.0);
      }
    `,
  });
}
