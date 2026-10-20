import * as THREE from 'three';

// Milestone 1: plain composite of the colour target over a paper-coloured
// background. (The ink-and-wash treatment comes in milestone 2.)
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
      uniform sampler2D tLabel;
      uniform vec3 uPaperCol;
      void main() {
        vec4 c = texture(tColor, vUv);
        float has = texture(tLabel, vUv).a;
        vec3 col = mix(uPaperCol, c.rgb, has);
        oColor = vec4(col, 1.0);
      }
    `,
  });
}
