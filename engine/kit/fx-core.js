/* fx-core: the stage every effect in this kit draws on, and the factory that makes an effect from it.
   Sets window.FxReelKitCore (W, H, FPS, Stage, factory, defs, got, load, motion helpers).
   create({ container, width, height, aspect, config }) -> { renderAt(t), setConfig(p), resize(w, h), dispose(),
   cues(), need(t) }. renderAt is a pure function of scene-local seconds. cues() lists the sound hits
   ([{ at, sfx }], scene seconds, sfx = a file in sfx/). need(t) lists the images frame t draws, so a renderer can load
   them before it calls renderAt (renderAt draws only images that are already decoded).
   Media contract (config): media = folder URL holding plate/NNNNN.jpg (the clip) and person/NNNNN.png (the speaker on
   transparency), frame0 = the clip frame at scene time 0, track = { face, matte, voice } from face_track.py and
   matte_track.py, clean = an empty-room plate (clean_plate.py). Stage is 1080x1920; it scales into any box. */
(function () {
  var W = 1080, H = 1920, FPS = 30;
  var C = { paper: '#f2efe8', card: '#faf8f2', ink: '#1c1a16', black: '#131311', cream: '#e8e2d2', muted: '#6f6a5c', orange: '#ff6b1a' };
  if (!document.getElementById('fxk-style')) {
    var st = document.createElement('style'); st.id = 'fxk-style';
    st.textContent =
      '.fxk{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden;transform-origin:0 0;background:#000}' +
      '.fxk canvas,.fxk .ly{position:absolute;left:0;top:0;width:1080px;height:1920px}' +
      '.fxk .ly{pointer-events:none}.fxk .ab{position:absolute;left:0;top:0;transform-origin:50% 50%}' +
      '.fxk .bass{font-family:Outfit;font-weight:900;text-transform:uppercase;line-height:.86;letter-spacing:-.03em;white-space:nowrap}' +
      '.fxk .tag{display:inline-flex;align-items:center;gap:14px;height:100px;padding:0 36px;border-radius:50px;background:' + C.card +
      ';box-shadow:0 0 0 5px ' + C.ink + ',0 12px 34px rgba(0,0,0,.25);font:900 50px/100px Outfit;color:' + C.ink + ';text-transform:uppercase;white-space:nowrap}' +
      '.fxk .slab{padding:4px 26px 8px;border-radius:14px;background:' + C.ink + ';color:#fff;box-shadow:0 0 0 6px ' + C.orange + ',0 18px 40px rgba(0,0,0,.35);font-family:Outfit;font-weight:900;text-transform:uppercase;line-height:1;white-space:nowrap}' +
      '.fxk .tag b{font-family:Doto,Outfit,monospace;font-weight:900;color:' + C.orange + '}';
    document.head.appendChild(st);
  }

  /* ---------- motion (the ROBO kit's house curves, plus overshoot and a damped spring) ---------- */
  function clamp(v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v; }
  function expo(p) { p = clamp(p); return p === 0 ? 0 : p === 1 ? 1 : p < .5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2; }
  function eout(p) { p = clamp(p); return p === 1 ? 1 : 1 - Math.pow(2, -10 * p); }
  function back(p, s) { p = clamp(p); s = s == null ? 1.6 : s; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); }
  function lerp(a, b, e) { return a + (b - a) * e; }
  function spring(tau, f, z) { if (tau <= 0) return 1; var w = 2 * Math.PI * f; return Math.exp(-z * w * tau) * Math.cos(w * Math.sqrt(1 - z * z) * tau); }
  function steps(tau, fps) { return Math.floor(tau * fps) / fps; }   // animate "on twos": the cut-paper title look
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function txt(node) { node.setAttribute('data-fxtxt', '1'); return node; }
  function place(node, x, y, s, r, o) {
    node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (r || 0).toFixed(2) + 'deg) scale(' + (s == null ? 1 : s).toFixed(4) + ')';
    node.style.opacity = o == null ? 1 : o;
  }

  /* ---------- image cache: decoded images only, oldest dropped past 64 ---------- */
  var CACHE = {}, ORDER = [], LIVE = [];
  function load(url) {
    var c = CACHE[url];
    if (c) return c.p;
    c = CACHE[url] = { ok: false, img: new Image() };
    c.p = new Promise(function (res) {
      c.img.onload = function () { (c.img.decode ? c.img.decode() : Promise.resolve()).then(function () { c.ok = true; res(); }, function () { c.ok = true; res(); }); };
      c.img.onerror = function () { c.err = true; res(); };
    });
    c.img.src = url;
    ORDER.push(url);
    while (ORDER.length > 64) { var old = ORDER.shift(); if (CACHE[old]) { CACHE[old].img.src = ''; delete CACHE[old]; } }
    return c.p;
  }
  function got(url) {
    var c = CACHE[url];
    if (c && c.ok && !c.err) return c.img;
    if (!c) load(url).then(function () { LIVE.forEach(function (f) { f(); }); });
    return null;
  }
  window.FxReelKitLoad = function (urls) { return Promise.all(urls.map(load)); };

  /* ---------- the stage: plate, back layer, back canvas, person, front canvas, front layer, ui ---------- */
  function cv() { var c = document.createElement('canvas'); c.width = W; c.height = H; c.g = c.getContext('2d'); return c; }
  function Stage(container, cfg, w, h) {
    var s = this; s.cfg = cfg;
    s.root = el('div', 'fxk'); s.cam = el('div', 'ly');
    s.pc = cv(); s.back = el('div', 'ly'); s.bc = cv(); s.qc = cv(); s.fc = cv(); s.front = el('div', 'ly'); s.ui = el('div', 'ly');
    [s.pc, s.back, s.bc, s.qc, s.fc, s.front].forEach(function (n) { s.cam.appendChild(n); });
    s.root.appendChild(s.cam); s.root.appendChild(s.ui);
    s.off = cv(); s.off2 = cv();
    container.appendChild(s.root);
    s.resize(w, h);
  }
  Stage.prototype.resize = function (w, h) {
    var k = Math.min(w / W, h / H);
    this.root.style.transform = 'translate(' + ((w - W * k) / 2).toFixed(1) + 'px,' + ((h - H * k) / 2).toFixed(1) + 'px) scale(' + k.toFixed(5) + ')';
  };
  Stage.prototype.n = function () { var f = this.cfg.track && this.cfg.track.face; return f ? f.rows.length : 1e9; };
  Stage.prototype.i = function (t) { return Math.max(0, Math.min(this.n() - 1, this.cfg.frame0 + Math.round(t * FPS))); };
  Stage.prototype.src = function (kind, i) { return this.cfg.media + kind + '/' + ('0000' + i).slice(-5) + (kind === 'plate' ? '.jpg' : '.png'); };
  Stage.prototype.urls = function (t, extraFrames, extra) {
    var s = this, i = s.i(t), out = [s.src('plate', i), s.src('person', i)];
    (extraFrames || []).forEach(function (j) { out.push(s.src('person', Math.max(0, Math.min(s.n() - 1, j)))); });
    return out.concat(extra || []);
  };
  Stage.prototype.face = function (i) {
    var F = this.cfg.track.face, r = F.rows[Math.max(0, Math.min(F.rows.length - 1, i))], o = {};
    for (var j = 0; j < F.cols.length; j++) o[F.cols[j]] = r[j];
    'x0 x1 nx tx cx mx lx rx'.split(' ').forEach(function (k) { o[k] *= W; });
    'y0 y1 ny ty cy my ly ry'.split(' ').forEach(function (k) { o[k] *= H; });
    o.w = o.x1 - o.x0; o.h = o.y1 - o.y0;
    return o;
  };
  // the body's top edge under a span of x, in px, averaged over 5 frames so a word resting on it does not shiver
  Stage.prototype.top = function (i, x0, x1) {
    var T = this.cfg.track.matte.top, n = T.length, a = Math.max(0, Math.floor(x0 / 20)), b = Math.min(53, Math.floor(x1 / 20)), sum = 0, k = 0;
    for (var d = -2; d <= 2; d++) {
      var row = T[Math.max(0, Math.min(n - 1, i + d))], m = 1;
      for (var c = a; c <= b; c++) m = Math.min(m, row[c]);
      sum += m; k++;
    }
    return sum / k * H;
  };
  // share of a box the body covers (0-1), from the 40 px matte grid
  Stage.prototype.cover = function (i, x0, y0, x1, y1) {
    var M = this.cfg.track.matte, g = M._dec || (M._dec = {}), n = M.gridB64.length;
    i = Math.max(0, Math.min(n - 1, i));
    var a = g[i];
    if (!a) { var b = atob(M.gridB64[i]); a = g[i] = new Uint8Array(b.length); for (var q = 0; q < b.length; q++) a[q] = b.charCodeAt(q); }
    var cx0 = Math.max(0, Math.floor(x0 / 40)), cx1 = Math.min(26, Math.floor((x1 - 1) / 40)), cy0 = Math.max(0, Math.floor(y0 / 40)), cy1 = Math.min(47, Math.floor((y1 - 1) / 40));
    var sum = 0, cnt = 0;
    for (var y = cy0; y <= cy1; y++) for (var x = cx0; x <= cx1; x++) { sum += a[y * 27 + x]; cnt++; }
    return cnt ? sum / cnt / 255 : 0;
  };
  Stage.prototype.voice = function (i) {
    var V = this.cfg.track.voice, k = Math.round(i / FPS * V.rate);
    return V.rms[Math.max(0, Math.min(V.rms.length - 1, k))] || 0;
  };
  Stage.prototype.voiceAt = function (sec) {
    var V = this.cfg.track.voice, k = sec * V.rate, a = Math.floor(k), f = k - a, r = V.rms, n = r.length;
    var v0 = r[Math.max(0, Math.min(n - 1, a))] || 0, v1 = r[Math.max(0, Math.min(n - 1, a + 1))] || 0;
    return v0 + (v1 - v0) * f;
  };
  Stage.prototype.begin = function () {
    [this.pc, this.bc, this.qc, this.fc].forEach(function (c) { c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalAlpha = 1; c.g.globalCompositeOperation = 'source-over'; c.g.filter = 'none'; c.g.clearRect(0, 0, W, H); });
    this.cam.style.transform = 'none';
  };
  Stage.prototype.plate = function (i) { var im = got(this.src('plate', i)); if (im) this.pc.g.drawImage(im, 0, 0, W, H); return !!im; };
  Stage.prototype.person = function (i) { return got(this.src('person', i)); };
  Stage.prototype.drawPerson = function (i, g) { var im = this.person(i); if (im) (g || this.qc.g).drawImage(im, 0, 0, W, H); return im; };
  // the empty room: the clean plate alone. Laying the live wall over it left a dark seam where the speaker's shadow
  // and edge halo meet the plate, so the room is the plate for the short time it is on screen.
  Stage.prototype.room = function (i, g) {
    var cl = got(this.cfg.clean);
    if (cl) (g || this.pc.g).drawImage(cl, 0, 0, W, H);
  };
  // the speaker of frame i as a flat colour shape, drawn into g (with optional alpha, filter and transform)
  Stage.prototype.shape = function (g, i, fill, o) {
    var im = this.person(i); if (!im) return;
    o = o || {};
    var f = this.off2.g;
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.filter = 'none'; f.clearRect(0, 0, W, H);
    f.drawImage(im, 0, 0, W, H);
    f.globalCompositeOperation = 'source-in'; f.fillStyle = fill; f.fillRect(0, 0, W, H); f.globalCompositeOperation = 'source-over';
    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (o.filter) g.filter = o.filter;
    if (o.op) g.globalCompositeOperation = o.op;
    if (o.m) g.setTransform(o.m[0], o.m[1], o.m[2], o.m[3], o.m[4], o.m[5]);
    g.drawImage(this.off2, o.dx || 0, o.dy || 0);
    g.restore();
  };

  function factory(defaults, build) {
    return {
      defaults: defaults,
      create: function (o) {
        var cfg = {}, k;
        for (k in defaults) cfg[k] = defaults[k];
        for (k in (o.config || {})) cfg[k] = o.config[k];
        var st = new Stage(o.container, cfg, o.width, o.height), fx = build(st, cfg), last = 0, alive = true;
        var redraw = function () { if (alive && cfg.track) { st.begin(); fx.draw(last); } };
        LIVE.push(redraw);
        return {
          renderAt: function (t) { last = t; if (!cfg.track) return; st.begin(); fx.draw(t); },
          setConfig: function (p) { for (var key in p) cfg[key] = p[key]; if (fx.rebuild) fx.rebuild(); redraw(); },
          resize: function (w, h) { st.resize(w, h); redraw(); },
          dispose: function () { alive = false; LIVE.splice(LIVE.indexOf(redraw), 1); st.root.remove(); },
          cues: function () { return fx.cues(); },
          need: function (t) { return fx.need ? fx.need(t) : st.urls(t); },
          // true while the effect shows no real face (a silhouette, an empty room): a face-cover check skips that frame
          faceHidden: function (t) { return fx.faceHidden ? fx.faceHidden(t) : false; }
        };
      }
    };
  }
  var BASE_DEF = { media: '', frame0: 0, track: null, clean: '' };
  function defs(o) { var r = {}, k; for (k in BASE_DEF) r[k] = BASE_DEF[k]; for (k in o) r[k] = o[k]; return r; }
  // shared with the other fx kits (fx-pack-kit.js): the stage, the factory and the motion helpers
  window.FxReelKitCore = { W: W, H: H, FPS: FPS, C: C, Stage: Stage, factory: factory, defs: defs, got: got, load: load,
    clamp: clamp, expo: expo, eout: eout, back: back, lerp: lerp, spring: spring, steps: steps, el: el, esc: esc, txt: txt, place: place, cv: cv };

})();
