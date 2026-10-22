// Build-and-render smoke test.
//   node scripts/check.mjs [--no-build] [--out DIR] [--shots overview,kitchen,...] [--eval "js"]
// Builds with Vite, serves the build, opens it in headless Chromium (software
// WebGL), waits for the first frames, saves screenshots and fails on any
// console error or page error.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);
const out = resolve(opt('--out', '.shots'));
const shotsArg = opt('--shots', 'overview');
const shots = shotsArg.split(shotsArg.includes('@@') ? '@@' : ',').filter(Boolean);
const extra = opt('--eval', '');
const width = Number(opt('--w', 1440));
const height = Number(opt('--h', 900));
mkdirSync(out, { recursive: true });

if (!has('--no-build')) execSync('npx vite build', { stdio: 'inherit' });

const port = 4173 + Math.floor(Math.random() * 500);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('http')) {
      clearTimeout(to);
      res();
    }
  });
});

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
const warnings = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  else if (m.type() === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let code = 0;
try {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__castle && window.__castle.ready, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  if (extra) console.log("eval:", JSON.stringify(await page.evaluate(extra)));
  // draw calls and triangles of the scene pass alone (not the post pass)
  const info = await page.evaluate(() => {
    const a = window.__castle;
    const r = a.renderer;
    r.info.autoReset = false;
    r.info.reset();
    r.render(a.scene, a.camera);
    const out = { triangles: a.world.triangles, calls: r.info.render.calls, tris: r.info.render.triangles };
    r.info.autoReset = true;
    return out;
  });
  console.log('scene:', JSON.stringify(info));
  for (const [i, s] of shots.entries()) {
    if (s === 'overview') {
      await page.evaluate(() => window.__castle.overview({ instant: true }));
    } else if (s.startsWith('js:')) {
      await page.evaluate(s.slice(3));
    } else {
      await page.evaluate((id) => window.__castle.focusRoom(id, { instant: true }), s);
    }
    await page.evaluate(() => window.__castle.settle());
    await page.waitForTimeout(900);
    const name = s.startsWith('js:') ? `js${i}` : s.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
    const file = `${out}/${name}.png`;
    await page.screenshot({ path: file, timeout: 180000 });
    console.log('shot:', file);
  }
  if (has('--probe')) {
    await page.evaluate(() => window.__castle.overview({ instant: true }));
    await page.evaluate(() => window.__castle.settle());
    await page.waitForTimeout(600);
    const probe = await page.evaluate(([w, h]) => {
      const a = window.__castle;
      const out = [];
      for (let y = 0.25; y < 0.8; y += 0.1) {
        for (let x = 0.2; x < 0.95; x += 0.1) {
          const p = a.pipeline.pickSync(x * w, y * h);
          const L = window.__labels[p.label];
          out.push(`${x.toFixed(1)},${y.toFixed(2)}: ${L ? L.term + (L.room ? ' [' + L.room + ']' : '') : '-'}`);
        }
      }
      return out;
    }, [width, height]);
    console.log('probe:\n  ' + probe.join('\n  '));
  }
  // frame timing (software rendering, so only indicative)
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else res((n * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(f);
      }),
  );
  console.log(`fps (swiftshader): ${fps.toFixed(1)}`);
} catch (e) {
  console.error('check failed:', e.message);
  code = 1;
}
if (warnings.length) console.log('console warnings:\n  ' + [...new Set(warnings)].slice(0, 20).join('\n  '));
if (errors.length) {
  console.error('console errors:\n  ' + [...new Set(errors)].join('\n  '));
  code = 1;
} else console.log('no console errors');
await browser.close();
process.kill(-server.pid);
process.exit(code);
