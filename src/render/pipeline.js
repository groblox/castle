import * as THREE from 'three';
import { makePostMaterial } from './post.js';
import { makePaperTexture } from './paper.js';

// Scene -> MRT (colour, normal+fade, label) -> post pass (ink & wash) -> screen.
export class Pipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.scale = 1;

    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      count: 3,
      type: THREE.UnsignedByteType,
      depthTexture: depth,
      depthBuffer: true,
    });
    const [c, n, l] = this.target.textures;
    c.minFilter = c.magFilter = THREE.LinearFilter;
    n.minFilter = n.magFilter = THREE.NearestFilter;
    l.minFilter = l.magFilter = THREE.NearestFilter;
    c.generateMipmaps = n.generateMipmaps = l.generateMipmaps = false;

    this.paper = makePaperTexture(512);
    this.post = makePostMaterial(this.target, this.paper, camera);
    this.quad = new THREE.Mesh(new THREE.BufferGeometry(), this.post);
    this.quad.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.pickBuf = new Uint8Array(4);
    this.pickBusy = false;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = this.pixelRatio * this.scale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    const W = Math.max(1, Math.floor(w * pr));
    const H = Math.max(1, Math.floor(h * pr));
    this.target.setSize(W, H);
    this.post.uniforms.uRes.value.set(W, H);
    this.post.uniforms.uPx.value = pr;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.size = { w, h, W, H, pr };
  }

  render(time) {
    const r = this.renderer;
    this.post.uniforms.uTime.value = time;
    this.post.uniforms.uNear.value = this.camera.near;
    this.post.uniforms.uFar.value = this.camera.far;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  /** Asynchronously read the label id under a CSS-pixel position. */
  pick(x, y) {
    if (this.pickBusy) return Promise.resolve(null);
    const { W, H, pr } = this.size;
    const px = Math.min(W - 1, Math.max(0, Math.floor(x * pr)));
    const py = Math.min(H - 1, Math.max(0, Math.floor(H - y * pr - 1)));
    this.pickBusy = true;
    return this.renderer
      .readRenderTargetPixelsAsync(this.target, px, py, 1, 1, this.pickBuf, undefined, 2)
      .then((buf) => {
        this.pickBusy = false;
        const b = buf || this.pickBuf;
        if (b[3] === 0) return { label: 0, kind: -1 };
        return { label: b[0] + b[1] * 256, kind: b[2] };
      })
      .catch(() => {
        this.pickBusy = false;
        return null;
      });
  }

  /** Synchronous variant (used by tests). */
  pickSync(x, y) {
    const { W, H, pr } = this.size;
    const px = Math.min(W - 1, Math.max(0, Math.floor(x * pr)));
    const py = Math.min(H - 1, Math.max(0, Math.floor(H - y * pr - 1)));
    this.renderer.readRenderTargetPixels(this.target, px, py, 1, 1, this.pickBuf, undefined, 2);
    const b = this.pickBuf;
    if (b[3] === 0) return { label: 0, kind: -1 };
    return { label: b[0] + b[1] * 256, kind: b[2] };
  }
}
