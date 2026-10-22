// Keeping people (and beasts) from walking through one another.
//
// Every frame each walker looks at the others nearby on the same level.
// Someone in the way ahead pushes it aside: it takes a small sidestep (its
// `off`set from the path, which eases back to nothing once past), keeping to
// the right of anyone coming the other way, and slows (`hold`) when there is
// no room to pass. People at work give a little ground to someone squeezing
// past but mostly stay put. Hens and other timid creatures (`shy`) scatter
// from anyone walking up to them.
//
// It also gives idle figures something to look at: a passer-by.

const LEVEL = 1.2; // further apart than this in height: different floors
const REACH = 1.5; // how far beyond touching a walker starts to react

export function crowd(list, t, dt) {
  const n = list.length;
  for (const a of list) {
    a._fx = 0;
    a._fz = 0;
    a._block = 1;
    a._look = null;
    a._lookD = 2.6;
    a._ex = a.x;
    a._ez = a.z;
    a._ey = a.e.root.position.y;
  }
  for (let i = 0; i < n; i++) {
    const A = list[i];
    for (let k = i + 1; k < n; k++) {
      const B = list[k];
      const dx = A._ex - B._ex;
      const dz = A._ez - B._ez;
      if (Math.abs(dx) > 3.2 || Math.abs(dz) > 3.2) continue;
      if (Math.abs(A._ey - B._ey) > LEVEL) continue;
      const d = Math.max(1e-3, Math.hypot(dx, dz));
      push(A, B, dx / d, dz / d, d);
      push(B, A, -dx / d, -dz / d, d);
      interest(A, B, d);
      interest(B, A, d);
    }
  }
  const k = 1 - Math.exp(-dt * 5);
  for (const a of list) {
    if (a.yields) {
      const busy = a.walking || a.shy;
      const max = busy ? (a.shy ? 0.9 : 0.45 + a.radius * 0.4) : 0.12;
      let gx = a._fx * 0.5;
      let gz = a._fz * 0.5;
      const m = Math.hypot(gx, gz);
      if (m > max) {
        gx *= max / m;
        gz *= max / m;
      }
      a.off.x += (gx - a.off.x) * k;
      a.off.y += (gz - a.off.y) * k;
    }
    // held up too long: someone has to squeeze by
    if (a._block < 0.3) a._stuck = (a._stuck ?? 0) + dt;
    else a._stuck = Math.max(0, (a._stuck ?? 0) - dt * 2);
    const block = a._stuck > 2.5 ? Math.max(a._block, 0.35) : a._block;
    a.hold += (block - a.hold) * (1 - Math.exp(-dt * 7));
    if (a.e.lookAt) a.e.lookAt(a.attend && t < a.attend.until ? a.attend : a._look);
  }
}

// the effect of B on A; (nx, nz) points from B to A
function push(A, B, nx, nz, d) {
  if (!A.yields) return;
  const minD = A.radius + B.radius;
  if (d > minD + REACH) return;
  const near = Math.exp(-(d - minD) / 0.35);
  if (A.shy) {
    // timid creatures keep their distance from anything bigger on the move
    if (B.walking && B.radius > A.radius * 1.5) {
      const w = Math.exp(-(d - minD) / 0.6) * A.shy;
      A._fx += nx * w;
      A._fz += nz * w;
    }
    return;
  }
  if (!A.walking) {
    // at work: lean away only from someone actually brushing past
    if (d < minD + 0.1) {
      const w = near * (B.walking ? 0.35 : 0.6);
      A._fx += nx * w;
      A._fz += nz * w;
    }
    return;
  }
  const fx = A.dir.x;
  const fz = A.dir.y;
  // how far B is ahead of A, and to which side
  const relX = -nx * d;
  const relZ = -nz * d;
  const along = relX * fx + relZ * fz;
  const rx = -fz; // A's right hand, for a figure facing (fx, fz)
  const rz = fx;
  const lat = relX * rx + relZ * rz;
  if (along < -minD * 0.6) return; // behind us: their business
  const ahead = Math.max(0, along / d);
  const w = near * (0.35 + 0.9 * ahead);
  A._fx += nx * w * 0.6;
  A._fz += nz * w * 0.6;
  if (ahead > 0.15 && Math.abs(lat) < minD + 0.25) {
    // pick a side: keep right of anyone coming the other way, otherwise
    // go round whichever side of them is clearer
    const oncoming = B.walking && B.dir.x * fx + B.dir.y * fz < -0.3;
    let side = oncoming ? 1 : lat > 0.04 ? -1 : lat < -0.04 ? 1 : 1;
    if (oncoming && lat > minD * 0.5) side = -1; // they are already to our right
    const s = w * 1.1 * side;
    A._fx += rx * s;
    A._fz += rz * s;
    // and slow down behind them if there is no room yet
    if (along > 0 && Math.abs(lat) < minD * 0.85) {
      let b = Math.min(1, Math.max(0, (along - minD * 0.9) / 0.7));
      if (B.walking && B.dir.x * fx + B.dir.y * fz > 0.5) b = Math.max(b, Math.min(1, B.curSpeed / Math.max(0.2, A.curSpeed)));
      A._block = Math.min(A._block, b);
    }
  }
}

// an idle figure glances at someone walking past; a walker at someone close by
function interest(A, B, d) {
  if (!A.e.lookAt || d > A._lookD) return;
  if (!B.walking && !(A.walking && d < 1.4 && B.e.j)) return;
  if (A.walking && !B.e.j) return;
  A._lookD = d;
  A._look = { x: B._ex, y: B._ey + 1.5, z: B._ez };
}
