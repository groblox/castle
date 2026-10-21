import * as THREE from 'three';
import { K, P } from '../geom/kinds.js';
import { makeMaterial } from '../render/material.js';
import { lathe } from '../geom/props.js';
import { v3 } from '../geom/shapes.js';
import { partGeo, mesh } from './parts.js';

// Banners on the towers, streaming in the same wind that carries the smoke
// (towards east-north-east). The cloth is a grid of small flat cells whose
// colours are sampled from a painted pattern, and it ripples every frame.

const WIND = new THREE.Vector3(2.6, 0, -0.8).normalize();
const SIDE = new THREE.Vector3(-WIND.z, 0, WIND.x);

// Gules, three lions passant guardant Or: the arms of England.
function paintRoyal(ctx, w, h) {
  ctx.fillStyle = '#b3352a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e2b84a';
  ctx.strokeStyle = '#e2b84a';
  for (let i = 0; i < 3; i++) {
    const cy = h * (0.18 + i * 0.32);
    const s = h * 0.1;
    const cx = w * 0.5;
    // body
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 2.3, s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // head, turned to face the viewer, with a mane
    ctx.beginPath();
    ctx.arc(cx - s * 2.5, cy - s * 0.7, s * 1.0, 0, Math.PI * 2);
    ctx.fill();
    // legs: one forepaw raised
    ctx.lineWidth = s * 0.55;
    ctx.lineCap = 'round';
    for (const [x0, x1, y1] of [[-1.8, -2.6, -0.2], [-1.2, -1.2, 1.8], [1.3, 1.1, 1.8], [1.9, 2.2, 1.7]]) {
      ctx.beginPath();
      ctx.moveTo(cx + x0 * s, cy + 0.3 * s);
      ctx.lineTo(cx + x1 * s, cy + y1 * s);
      ctx.stroke();
    }
    // tail curling up over the back
    ctx.lineWidth = s * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx + 2.2 * s, cy - 0.2 * s);
    ctx.quadraticCurveTo(cx + 3.6 * s, cy - 0.6 * s, cx + 2.6 * s, cy - 1.8 * s);
    ctx.stroke();
  }
}

// Argent, a cross gules: the cross of St George, worn by Edward I's foot
// soldiers in Wales.
function paintStGeorge(ctx, w, h) {
  ctx.fillStyle = '#efe8d6';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b3352a';
  ctx.fillRect(0, h * 0.4, w, h * 0.2);
  ctx.fillRect(w * 0.3, 0, w * 0.16, h);
}

function patternSampler(paint, w, h) {
  if (typeof document === 'undefined') return () => new THREE.Color(0xb3352a);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  paint(ctx, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  return (u, v) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
    const i = (y * w + x) * 4;
    return new THREE.Color(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
  };
}

export class Banner {
  /**
   * base: [x, y, z] foot of the pole; poleH: pole height; size: [length, depth];
   * kind: 'royal' | 'george'; pennon: tapering to a point.
   */
  constructor(label, group, base, poleH, size, kind = 'royal', opts = {}) {
    this.root = new THREE.Group();
    const mat = makeMaterial({ label, group });
    const pole = mesh(partGeo((b) => {
      b.with({ kind: K.TIMBER, color: P.timberDark }, () => lathe(b, v3(base[0], base[1], base[2]), 'y', [[0.07, 0], [0.045, poleH]], 8));
      b.with({ kind: K.METAL, color: 0xc9a24a }, () => lathe(b, v3(base[0], base[1] + poleH, base[2]), 'y', [[0.07, 0], [0.001, 0.25]], 8));
    }), mat);
    this.root.add(pole);

    const [L, D] = size;
    const nu = opts.nu ?? 40;
    const nv = opts.nv ?? 24;
    this.L = L;
    this.D = D;
    this.nu = nu;
    this.nv = nv;
    this.pennon = !!opts.pennon;
    this.top = base[1] + poleH - 0.12;
    this.foot = new THREE.Vector3(base[0], 0, base[2]);
    this.phase = opts.phase ?? 0;
    const sample = patternSampler(kind === 'royal' ? paintRoyal : paintStGeorge, 96, 64);

    // non-indexed grid: two triangles per cell, each cell one flat colour
    const cells = nu * nv;
    const pos = new Float32Array(cells * 6 * 3);
    const col = new Float32Array(cells * 6 * 3);
    const info = new Float32Array(cells * 6 * 3);
    let k = 0;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const c = sample((i + 0.5) / nu, (j + 0.5) / nv);
        for (let q = 0; q < 6; q++) {
          col[k * 3] = c.r;
          col[k * 3 + 1] = c.g;
          col[k * 3 + 2] = c.b;
          info[k * 3] = K.CLOTH;
          k++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cells * 18), 3));
    geo.setAttribute('acol', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('info', new THREE.BufferAttribute(info, 3));
    this.geo = geo;
    const clothMat = makeMaterial({ label, group, side: THREE.DoubleSide });
    this.cloth = new THREE.Mesh(geo, clothMat);
    this.cloth.frustumCulled = false;
    this.root.add(this.cloth);
    this._grid = new Float32Array((nu + 1) * (nv + 1) * 3);
    this._gn = new Float32Array((nu + 1) * (nv + 1) * 3);
    this.update(0);
  }

  update(t) {
    const { nu, nv, L, D, _grid: g } = this;
    const gust = 0.75 + 0.25 * Math.sin(t * 0.37 + this.phase) + 0.1 * Math.sin(t * 1.9 + this.phase);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        // a pennon tapers to a point
        const vv = this.pennon ? 0.5 + (v - 0.5) * (1 - u * 0.95) : v;
        const wave = Math.sin(u * 9.5 - t * 5.2 * gust + this.phase + v * 0.6) * (0.04 + 0.2 * u) * gust;
        const wave2 = Math.sin(u * 17 - t * 8 + v * 2) * 0.03 * u;
        const along = u * L * (0.97 + 0.03 * gust);
        const droop = (1 - gust) * u * u * 0.6;
        const n = (j * (nu + 1) + i) * 3;
        g[n] = this.foot.x + WIND.x * along + SIDE.x * (wave + wave2);
        g[n + 1] = this.top - vv * D - droop;
        g[n + 2] = this.foot.z + WIND.z * along + SIDE.z * (wave + wave2);
      }
    }
    // smooth normals from the grid, so the cloth folds softly without facet lines
    const gn = this._gn;
    const at = (i, j, c) => g[(Math.min(nv, Math.max(0, j)) * (nu + 1) + Math.min(nu, Math.max(0, i))) * 3 + c];
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const ux = at(i + 1, j, 0) - at(i - 1, j, 0);
        const uy = at(i + 1, j, 1) - at(i - 1, j, 1);
        const uz = at(i + 1, j, 2) - at(i - 1, j, 2);
        const vx = at(i, j + 1, 0) - at(i, j - 1, 0);
        const vy = at(i, j + 1, 1) - at(i, j - 1, 1);
        const vz = at(i, j + 1, 2) - at(i, j - 1, 2);
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        const n = (j * (nu + 1) + i) * 3;
        gn[n] = nx / l;
        gn[n + 1] = ny / l;
        gn[n + 2] = nz / l;
      }
    }
    const pos = this.geo.attributes.position.array;
    const nrm = this.geo.attributes.normal.array;
    let k = 0;
    const put = (i, j) => {
      const n = (j * (nu + 1) + i) * 3;
      nrm[k] = gn[n];
      pos[k++] = g[n];
      nrm[k] = gn[n + 1];
      pos[k++] = g[n + 1];
      nrm[k] = gn[n + 2];
      pos[k++] = g[n + 2];
    };
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        put(i, j);
        put(i, j + 1);
        put(i + 1, j);
        put(i + 1, j);
        put(i, j + 1);
        put(i + 1, j + 1);
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }
}
