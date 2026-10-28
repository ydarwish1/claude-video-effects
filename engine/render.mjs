// Render one effect over a prepared clip, frame by frame, in headless Chromium, with its sound hits.
//   node render.mjs <work dir> <scene.json> [--name <out name>] [--stills 0.5,1.2]
// scene.json: { "global": "FxGlassWidgets", "kits": ["pack/glass.js"], "start": 3.2, "dur": 2.3, "config": {...},
//               "lead": 0, "frames": 0, "keepAudio": true }
//   start/dur: the part of the prepared clip (seconds of clip.mp4) the effect plays over.
//   lead: seconds before the clip starts (the app frame's typing, FxAppShell's cardAt); frames: a fixed length instead.
//   keepAudio: true keeps the clip's own sound under the hits; false makes the hits the only sound.
// For each frame: load the images the effect needs, call renderAt(t), log every text box, take a JPEG of the
// 1080x1920 stage and pipe it to ffmpeg. Then the hits are mixed, each one's event point on its cue, to the ms.
// Writes <work>/renders/<name>.mp4 and <name>.log.json. --stills writes PNGs to <work>/stills/ and nothing else.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(ENGINE, 'package.json'));
const { chromium } = require('playwright');
const KIT = path.join(ENGINE, 'kit');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const WORK = path.resolve(args[0]), sc = JSON.parse(fs.readFileSync(args[1], 'utf8'));
const stills = opt('--stills'), name = opt('--name') || path.basename(args[1], '.json');
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return {}; } };
const sfxMeta = readJson(path.join(ENGINE, 'sfx', 'sfx.json'));
const first = Math.round((sc.start || 0) * 30), segFrames = Math.round((sc.dur || 2.3) * 30);
const leadF = Math.round((sc.lead || 0) * 30), nF = sc.frames || segFrames + leadF;

// frames of this part (24 before it for effects that look back, 8 after), once: the clip as JPEG, the speaker
// (clip + lossless matte) as PNG, named by frame number in the clip
const FR = path.join(WORK, 'frames');
const fa = Math.max(0, first - 24), fb = first + segFrames + 8, mark = path.join(FR, `done-${fa}-${fb}`);
if (!fs.existsSync(mark)) {
  fs.mkdirSync(path.join(FR, 'plate'), { recursive: true }); fs.mkdirSync(path.join(FR, 'person'), { recursive: true });
  const sel = `select=between(n\\,${fa}\\,${fb})`;
  const a = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(WORK, 'clip.mp4'), '-vf', sel, '-fps_mode', 'passthrough',
    '-q:v', '2', '-start_number', String(fa), path.join(FR, 'plate/%05d.jpg')]);
  const b = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(WORK, 'clip.mp4'), '-i', path.join(WORK, 'alpha.mkv'),
    '-filter_complex', `[0:v]${sel}[v];[1:v]${sel},format=gray[a];[v][a]alphamerge,format=rgba`, '-fps_mode', 'passthrough',
    '-start_number', String(fa), path.join(FR, 'person/%05d.png')]);
  if (a.status || b.status) { console.error(String(a.stderr) + String(b.stderr)); process.exit(1); }
  fs.writeFileSync(mark, '');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}#host{position:relative;width:1080px;height:1920px;overflow:hidden}</style>
<script src="/elements/fx-core.js"></script>${(sc.kits || []).map(k => `<script src="/elements/${k}"></script>`).join('')}</head><body><div id="host"></div></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/page.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  let file = null;
  if (u.startsWith('/elements/')) file = path.join(KIT, u.slice(10));
  else if (u.startsWith('/work/')) file = path.join(WORK, u.slice(6));
  if (!file || !(file.startsWith(KIT) || file.startsWith(WORK))) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }); res.end(buf);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(ORIGIN + '/page.html');
const cfg = Object.assign({}, sc.config, { media: ORIGIN + '/work/frames/', frame0: first, frames: segFrames, clean: '' });
const info = await page.evaluate(async ([g, cfg]) => {
  await document.fonts.ready;
  const [face, matte] = await Promise.all([fetch('/work/face.json').then(r => r.json()), fetch('/work/mtrack.json').then(r => r.json())]);
  cfg.track = { face, matte, voice: matte.voice };
  if (!window[g]) return { missing: g };
  window.__fx = window[g].create({ container: document.getElementById('host'), width: 1080, height: 1920, aspect: 'portrait', config: cfg });
  window.__frame = async t => {
    await window.FxReelKitLoad(window.__fx.need(t));
    window.__fx.renderAt(t);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const boxes = [];
    document.querySelectorAll('[data-fxtxt]').forEach(n => {
      let op = 1, e = n, shown = true;
      while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') shown = false; op *= parseFloat(cs.opacity); e = e.parentElement; }
      if (!shown || op < 0.02) return;
      // the letters' own extent (the text's line boxes), not the element's box
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rs = [...rg.getClientRects()].filter(q => q.width > 0 && q.height > 0);
      let r = n.getBoundingClientRect();
      if (rs.length) { const L = Math.min(...rs.map(q => q.left)), T = Math.min(...rs.map(q => q.top)); r = { left: L, top: T, width: Math.max(...rs.map(q => q.right)) - L, height: Math.max(...rs.map(q => q.bottom)) - T }; }
      boxes.push({ text: n.textContent.trim().slice(0, 40), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), op: +op.toFixed(3) });
    });
    return { boxes, faceHidden: window.__fx.faceHidden(t) };
  };
  return { cues: window.__fx.cues() };
}, [sc.global, cfg]);
if (info.missing) { console.error(`effect ${info.missing} not found: check "global" and "kits" in the scene`); process.exit(1); }

if (stills) {
  fs.mkdirSync(path.join(WORK, 'stills'), { recursive: true });
  const outs = [];
  for (const s of stills.split(',').map(Number)) {
    await page.evaluate(t => window.__frame(t), s);
    const f = path.join(WORK, 'stills', `${name}-${s.toFixed(2)}.png`);
    await page.screenshot({ path: f }); outs.push(f);
  }
  console.log(JSON.stringify({ stills: outs, cues: info.cues, errors }));
  await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
}

fs.mkdirSync(path.join(WORK, 'renders'), { recursive: true });
const base = path.join(WORK, 'renders', name);
const enc = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', base + '-video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = [], t0 = Date.now();
for (let f = 0; f < nF; f++) {
  const t = f / 30;
  const { boxes, faceHidden } = await page.evaluate(tt => window.__frame(tt), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
  frames.push({ f, plate: first + Math.max(0, f - leadF), boxes, faceHidden });
  if (f % 30 === 0) process.stdout.write(`\r  frame ${f}/${nF}`);
}
enc.stdin.end();
await new Promise(r => enc.on('close', r));
const renderSec = (Date.now() - t0) / 1000;
await browser.close(); server.close();

// sound: the clip's own sound (or silence), plus each hit with its event point on its cue
const dur = nF / 30, leadMs = Math.round(leadF / 30 * 1000);
const inputs = sc.keepAudio === false ? ['-f', 'lavfi', '-t', dur.toFixed(4), '-i', 'anullsrc=r=48000:cl=stereo']
  : ['-ss', (first / 30).toFixed(4), '-t', (segFrames / 30).toFixed(4), '-i', path.join(WORK, 'clip.mp4')];
const parts = [sc.keepAudio === false ? '[0:a]anull[v]' : '[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.04' + (leadMs ? `,adelay=${leadMs}|${leadMs}` : '') + ',apad[v]'];
const placed = [], usable = info.cues.filter(c => sfxMeta[c.sfx] && fs.existsSync(path.join(ENGINE, 'sfx', c.sfx + '.wav')));
usable.forEach((c, k) => {
  const m = sfxMeta[c.sfx], startMs = Math.round((c.at - m.event) * 1000);
  inputs.push('-i', path.join(ENGINE, 'sfx', c.sfx + '.wav'));
  const trim = startMs < 0 ? `atrim=start=${(-startMs / 1000).toFixed(3)},asetpts=PTS-STARTPTS,` : '';
  parts.push(`[${k + 1}:a]${trim}adelay=${Math.max(0, startMs)}|${Math.max(0, startMs)},volume=${(sc.sfxGain || 0.55).toFixed(2)}[s${k}]`);
  placed.push({ at: c.at, sfx: c.sfx, event: m.event, startMs, box: c.box || null });
});
parts.push(`[v]${usable.map((c, k) => `[s${k}]`).join('')}amix=inputs=${usable.length + 1}:normalize=0:duration=first,alimiter=limit=0.89:level=false:latency=true[a]`);
const mux = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...inputs, '-i', base + '-video.mp4', '-filter_complex', parts.join(';'),
  '-map', (usable.length + 1) + ':v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', dur.toFixed(4), '-movflags', '+faststart', base + '.mp4']);
if (mux.status) { console.error(String(mux.stderr)); process.exit(1); }
fs.unlinkSync(base + '-video.mp4');
const missing = info.cues.filter(c => !usable.includes(c)).map(c => c.sfx);
fs.writeFileSync(base + '.log.json', JSON.stringify({ name, scene: sc, first, segFrames, leadFrames: leadF, cues: placed, missingSounds: missing, frames, renderSec, errors }));
console.log('\n' + JSON.stringify({ out: base + '.mp4', frames: nF, renderSec: +renderSec.toFixed(1), hits: placed.length, missingSounds: missing, errors: errors.slice(0, 5) }));
