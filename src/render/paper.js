import * as THREE from 'three';

// Tileable paper texture generated at startup: warm mottled ground,
// fine grain and a few fibres. R: grain/tooth, G: mottling, B: fibres.
export function makePaperTexture(size = 512) {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(1290);
  // lattice for tileable value noise
  const lattice = (n) => {
    const a = new Float32Array(n * n);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    return a;
  };
  const octaves = [4, 8, 16, 32, 64, 128].map((n) => ({ n, l: lattice(n) }));
  const sample = (o, x, y) => {
    const fx = (x / size) * o.n;
    const fy = (y / size) * o.n;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = smooth(fx - ix);
    const ty = smooth(fy - iy);
    const g = (i, j) => o.l[((j + o.n) % o.n) * o.n + ((i + o.n) % o.n)];
    const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * tx;
    const b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * tx;
    return a + (b - a) * ty;
  };
  const fibres = new Float32Array(size * size);
  for (let f = 0; f < 900; f++) {
    let x = rnd() * size;
    let y = rnd() * size;
    let ang = rnd() * Math.PI * 2;
    const len = 8 + rnd() * 30;
    const w = 0.3 + rnd() * 0.5;
    for (let s = 0; s < len; s++) {
      ang += (rnd() - 0.5) * 0.3;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const ix = ((Math.floor(x) % size) + size) % size;
      const iy = ((Math.floor(y) % size) + size) % size;
      fibres[iy * size + ix] = Math.max(fibres[iy * size + ix], w);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mott = sample(octaves[0], x, y) * 0.5 + sample(octaves[1], x, y) * 0.3 + sample(octaves[2], x, y) * 0.2;
      const grain = sample(octaves[4], x, y) * 0.4 + sample(octaves[5], x, y) * 0.35 + rnd() * 0.25;
      const i = (y * size + x) * 4;
      data[i] = Math.floor(grain * 255);
      data[i + 1] = Math.floor(mott * 255);
      data[i + 2] = Math.floor(fibres[y * size + x] * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
