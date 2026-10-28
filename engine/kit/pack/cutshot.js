/* Cutshot lane: three cut-based effects for the FX reel, on FxReelKitCore (load fx-reel-kit.js first).
   Globals: FxMatchCut ("match-cut", s5), FxShutterStrike ("shutter-strike", s6), FxProfileWall ("profile-wall", s7).
   Same contract as the core kit: draw(t) is a pure function of scene seconds; the only memos are page / print
   renders keyed by their index, which do not depend on the order frames are drawn in. */
(function () {
  var K = window.FxReelKitCore, W = K.W, H = K.H, FPS = K.FPS;
  var clamp = K.clamp, eout = K.eout, back = K.back, lerp = K.lerp, spring = K.spring, el = K.el, esc = K.esc, txt = K.txt, got = K.got, cv = K.cv;
  var FONT = '/elements/fonts/', RAD = Math.PI / 180;

  // fonts as FontFaces, loading from script time, so document.fonts.ready waits for them before the first frame
  if (!window.__csFonts) {
    window.__csFonts = [
      ['csPlayfair', 'PlayfairDisplay.ttf', { weight: '400 900' }],
      ['csPlayfair', 'PlayfairDisplay-Italic.ttf', { weight: '400 900', style: 'italic' }],
      ['csInter', 'Inter.ttf', { weight: '100 900' }],
      ['csMono', 'SpaceMono-Bold.ttf', { weight: '700' }],
      ['csInstrument', 'InstrumentSerif-Italic.ttf', { style: 'italic' }],
      ['csMontserrat', 'Montserrat.ttf', { weight: '100 900' }]
    ].map(function (f) { var ff = new FontFace(f[0], 'url(' + FONT + f[1] + ')', f[2]); document.fonts.add(ff); ff.load().catch(function () {}); return ff; });
  }
  if (!document.getElementById('cs-style')) {
    var sty = document.createElement('style'); sty.id = 'cs-style';
    sty.textContent =
      // the red word box (match cut)
      '.cs-box{position:absolute;left:0;top:0;transform-origin:50% 50%;background:linear-gradient(180deg,#e04e32 0%,#c6371f 52%,#a92914 100%);' +
      'box-shadow:inset 0 2px 0 rgba(255,236,220,.28),inset 0 -3px 0 rgba(70,8,0,.24),0 0 0 1.5px rgba(110,18,6,.5),0 16px 32px rgba(70,10,2,.36),0 0 60px rgba(238,86,48,.42)}' +
      '.cs-box div{position:absolute;left:0;width:100%;text-align:center;white-space:nowrap;color:#fdf5ea;text-shadow:0 2px 0 rgba(90,14,4,.28)}' +
      // the profile page (profile wall)
      '.cs-ig{position:absolute;left:0;top:0;width:960px;height:1644px;border-radius:46px;overflow:hidden;background:#0c0c0d;transform-origin:50% 16%;' +
      'box-shadow:0 0 0 1.5px rgba(255,255,255,.09),0 50px 120px rgba(60,36,0,.42),0 14px 34px rgba(0,0,0,.34);font-family:csInter,sans-serif;color:#f5f5f5}' +
      '.cs-ig .t,.cs-chip .t{position:absolute;white-space:nowrap}' +
      '.cs-ig .ring{position:absolute;left:34px;top:34px;width:130px;height:130px;border-radius:50%;background:linear-gradient(45deg,#feda75,#fa7e1e 30%,#d62976 60%,#962fbf 82%,#4f5bd5)}' +
      '.cs-ig .ring i{position:absolute;left:5px;top:5px;width:120px;height:120px;border-radius:50%;background:#0c0c0d}' +
      '.cs-av{position:absolute;overflow:hidden;border-radius:50%;background:#222}.cs-av img{position:absolute;max-width:none}' +
      '.cs-ig .tabs{position:absolute;left:0;top:304px;width:960px;height:62px;border-top:1.5px solid rgba(255,255,255,.13)}' +
      '.cs-ig .tabs div{position:absolute;top:8px}.cs-ig .tabs svg{display:block}.cs-ig .tabs .ul{top:auto;position:absolute;left:0;bottom:0;width:320px;height:3px;background:#f5f5f5}' +
      '.cs-ig .slot{position:absolute;width:318px;height:424px;overflow:hidden;background:linear-gradient(100deg,#18181a 35%,#2a2a2d 50%,#18181a 65%);background-size:300% 100%}' +
      '.cs-ig .card{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;transform-origin:50% 50%}' +
      '.cs-ig .card img{width:100%;height:100%;object-fit:cover;display:block}.cs-ig .ri{position:absolute;right:14px;top:14px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))}' +
      // the channel chip under his chin
      '.cs-chip{position:absolute;left:0;top:0;width:724px;height:112px;border-radius:32px;transform-origin:50% 50%;background:rgba(16,16,18,.74);' +
      '-webkit-backdrop-filter:blur(24px) saturate(1.5);backdrop-filter:blur(24px) saturate(1.5);' +
      'box-shadow:inset 0 1.5px 0 rgba(255,255,255,.17),0 0 0 1.5px rgba(255,255,255,.09),0 22px 50px rgba(0,0,0,.36);font-family:csInter,sans-serif;color:#f5f5f5}' +
      '.cs-chip .btn{position:absolute;top:22px;height:68px;border-radius:34px;overflow:hidden;font:600 32px/68px csInter,sans-serif;text-align:center}' +
      '.cs-chip .rip{position:absolute;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.42)}';
    document.head.appendChild(sty);
  }

  /* ---------- small helpers ---------- */
  function hash(n) { var x = Math.sin(n * 91.3458 + 47.123) * 43758.5453; return x - Math.floor(x); }
  function fr(t) { return Math.round(t * FPS); }
  function onFrame(t) { return Math.ceil(t * FPS - 1e-6) / FPS; }   // the first frame at or after t
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function reset(c) {
    var g = c.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; g.clearRect(0, 0, c.width, c.height); return g;
  }
  var SCR = null;
  function scratch(k) { if (!SCR) SCR = [cv(), cv(), cv()]; return SCR[k]; }
  var NOISE = null;   // a fixed 256 px grain tile (an LCG, so it is the same on every run)
  function noise() {
    if (NOISE) return NOISE;
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), im = g.createImageData(256, 256), d = im.data, s = 12345;
    for (var p = 0; p < d.length; p += 4) { s = (Math.imul(s, 1103515245) + 12345) | 0; var v = (s >>> 16) & 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
    g.putImageData(im, 0, 0); return (NOISE = c);
  }
  function grain(g, f, a) {
    var n = noise(), ox = Math.floor(hash(f + 0.5) * 256), oy = Math.floor(hash(f + 9.5) * 256);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; g.translate(-ox, -oy);
    g.fillStyle = g.createPattern(n, 'repeat'); g.fillRect(ox, oy, W, H); g.restore();
  }
  // vertical alpha band: 1 within |y - c| < inner, 0 beyond outer
  function bandGrad(g, c, inner, outer) {
    var gr = g.createLinearGradient(0, 0, 0, H), s = function (y) { return clamp(y / H); };
    gr.addColorStop(s(c - outer), 'rgba(0,0,0,0)'); gr.addColorStop(s(c - inner), 'rgba(0,0,0,1)');
    gr.addColorStop(s(c + inner), 'rgba(0,0,0,1)'); gr.addColorStop(s(c + outer), 'rgba(0,0,0,0)');
    return gr;
  }
  function badge(px) {
    var pts = [], n = 16;
    for (var q = 0; q < n * 2; q++) { var a = Math.PI * q / n - Math.PI / 2, r = q % 2 ? 16.4 : 19; pts.push((20 + r * Math.cos(a)).toFixed(2) + ' ' + (20 + r * Math.sin(a)).toFixed(2)); }
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 40 40" style="display:inline-block;vertical-align:middle"><path d="M' + pts.join(' L') +
      'Z" fill="#0095f6" stroke="#0095f6" stroke-width="2.4" stroke-linejoin="round"/><path d="M12.6 20.6l4.9 4.9 9.9-10.4" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ===== 1. Match Cut: full-screen pages of his own words, cut every 3 frames (fonts, sizes, paper, line breaks and
     tilt change), with "Ultrathink" in a red box locked at one spot; each page keeps the word's line in focus and the
     rest falls off into a shallow depth of field. Then the stack falls away behind him and the box slides up to sit
     above his head, tucked behind his hair. ===== */
  var TALK = "Anthropic's Ultrathink puts Claude in overdrive, but only in the terminal until now. Basically, Ultrathink allows Claude to think deeper " +
    'about the next task or message that is sent to it within the terminal. Until recently, with the release of Claude Code mods, this was never ' +
    'available within the desktop until now. So instead, I made a free mod that allows you to leverage Ultrathink within the desktop app. Now ' +
    "let's think of some of the use cases for Ultrathink. Let's say you're on an effort level such as medium with Opus 5.5. And let's also say " +
    "that you're building out a feature. Now let's say that Opus 5.5 is repeatedly getting it incorrect. So what you can do is press Ultrathink " +
    'and it will allow a deeper reasoning request. And it will allow Claude to think deeper about how to actually implement the feature or fix the ' +
    "specific bug that you want. If you want the mod, comment Ultra and I'll send it over to you.";
  var PAGE = {
    A: { f: 'csPlayfair', w: 600, it: 0, s: 102, lh: 1.3, paper: '#efe8dc', ink: '#2a2520' },
    B: { f: 'csMono', w: 700, it: 0, s: 72, lh: 1.45, paper: '#f2f0eb', ink: '#2c2c2c' },
    C: { f: 'csInter', w: 600, it: 0, s: 104, lh: 1.2, paper: '#efeff2', ink: '#1b1b1e' },
    D: { f: 'csPlayfair', w: 500, it: 1, s: 110, lh: 1.24, paper: '#e9dcc5', ink: '#3a2d22' },
    E: { f: 'csPlayfair', w: 700, it: 0, s: 96, lh: 1.32, paper: '#16140f', ink: '#ebe3d5', dark: 1 },
    F: { f: 'csInstrument', w: 400, it: 1, s: 136, lh: 1.08, paper: '#f4ede1', ink: '#2a231d' },
    G: { f: 'csMontserrat', w: 700, it: 0, s: 88, lh: 1.32, paper: '#e6e2d9', ink: '#22201e' },
    H: { f: 'csPlayfair', w: 800, it: 0, s: 122, lh: 1.16, paper: '#f6f0e4', ink: '#1d1813' }
  };
  function pfont(s, px) { return (s.it ? 'italic ' : '') + s.w + ' ' + px.toFixed(1) + 'px ' + s.f; }

  window.FxMatchCut = K.factory(K.defs({ text: TALK, word: 'Ultrathink', every: 3, pages: 'A B C E D G F H B C A E D A',
    occ: [1, 3, 0, 2, 4, 1, 3, 2, 0, 4, 1, 2, 3, 2], out: 1.35, tip: 0.26, stagger: 0.06, lockY: 900, boxW: 700, endScale: 0.78, tuck: 26 }), function (st, cfg) {
    var box, ghosts, memo, order, toks;
    function mkBox(mark) { var b = el('div', 'cs-box'), d = el('div', null, esc(cfg.word)); if (mark) txt(d); b.appendChild(d); b.t = d; return b; }
    function build() {
      st.front.innerHTML = ''; st.back.innerHTML = '';
      ghosts = [mkBox(false), mkBox(false)]; box = mkBox(true);
      memo = {}; order = []; toks = null;
    }
    build();
    function names() { return cfg.pages.split(' '); }
    function last() { return names().length - 1; }
    function outT() { return onFrame(cfg.out); }
    function words() { return toks || (toks = String(cfg.text).split(/\s+/).filter(Boolean)); }
    function occIdx(o) {
      var w = words(), re = new RegExp('^' + cfg.word + '\\W*$', 'i'), hits = [];
      w.forEach(function (x, q) { if (re.test(x)) hits.push(q); });
      return hits.length ? hits[o % hits.length] : 0;
    }
    // page k's look, from its index alone
    function look(k) {
      var s = PAGE[names()[k]] || PAGE.A;
      return { s: s, tilt: (hash(k + 3.3) - 0.5) * 4.4, sc: 1 + (hash(k + 8.1) - 0.5) * 0.07, col: -36 - hash(k + 1.9) * 120,
        body: s.s * (0.93 + hash(k + 5.5) * 0.14), occ: cfg.occ[k % cfg.occ.length] };
    }
    // the page's text layer with its depth of field baked in, plus the box metrics; the last 4 are kept
    function page(k) {
      if (memo[k]) return memo[k];
      var p = look(k), s = p.s, w = words(), n = w.length, j = occIdx(p.occ), Y = cfg.lockY;
      var T = scratch(0), g = reset(T), ready = document.fonts.check(pfont(s, 100));
      g.fillStyle = s.ink; g.textBaseline = 'alphabetic';
      g.font = pfont(s, 100);
      var B = clamp(cfg.boxW / g.measureText(cfg.word).width * 100, 96, 210);
      g.font = pfont(s, B);
      var m = g.measureText(cfg.word), tw = m.width, inkA = m.actualBoundingBoxAscent, A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
      var padX = 0.3 * B, bw = Math.round(tw + 2 * padX), bh = Math.round(inkA + 0.62 * B), base = Y + inkA / 2;
      var wd = function (q) { return w[((q % n) + n) % n]; };
      // the word's own line, at the box's size: two words before it, three after, running off both edges
      var punct = w[j].slice(cfg.word.length), gap = 0.27 * B;
      g.textAlign = 'right'; g.fillText(wd(j - 2) + ' ' + wd(j - 1), 540 - bw / 2 - gap, base);
      g.textAlign = 'left'; g.fillText((punct ? punct + ' ' : '') + wd(j + 1) + ' ' + wd(j + 2) + ' ' + wd(j + 3), 540 + bw / 2 + (punct ? 0.05 * B : gap), base);
      // the body: the words before fill lines upward from the box, the words after fill lines downward
      var S = p.body, LH = S * s.lh, colX = p.col, colW = W - colX + 150, y, idx, line;
      g.font = pfont(s, S);
      y = Y - bh / 2 - 0.8 * S; idx = j - 3; line = [];
      while (y > -LH) {
        var a = wd(idx);
        if (line.length && g.measureText([a].concat(line).join(' ')).width > colW) { g.fillText(line.join(' '), colX, y); y -= LH; line = []; continue; }
        line.unshift(a); idx--;
      }
      y = Y + bh / 2 + 1.62 * S; idx = j + 4; line = [];
      while (y < H + LH) {
        var b = wd(idx);
        if (line.length && g.measureText(line.concat([b]).join(' ')).width > colW) { g.fillText(line.join(' '), colX, y); y += LH; line = []; continue; }
        line.push(b); idx++;
      }
      // depth of field: four focus zones blended by soft bands around the box line
      var out = null;
      if (order.length >= 4) { var old = order.shift(); out = memo[old].c; delete memo[old]; }
      out = out || cv();
      var o = reset(out), Sb = scratch(1), zones = [[0, 70, 150], [2.6, 150, 280], [5.5, 280, 470], [11, 0, 0]];
      // the farthest zone is everything; each nearer zone is cut out of what is under it and laid in its band
      o.filter = 'blur(' + zones[3][0] + 'px)'; o.drawImage(T, 0, 0); o.filter = 'none';
      o.globalCompositeOperation = 'destination-out'; o.fillStyle = bandGrad(o, Y, zones[2][1], zones[2][2]); o.fillRect(0, 0, W, H);
      o.globalCompositeOperation = 'source-over';
      for (var z = 2; z >= 0; z--) {
        var q = reset(Sb);
        q.filter = zones[z][0] ? 'blur(' + zones[z][0] + 'px)' : 'none'; q.drawImage(T, 0, 0); q.filter = 'none';
        q.globalCompositeOperation = 'destination-in'; q.fillStyle = bandGrad(q, Y, zones[z][1], zones[z][2]); q.fillRect(0, 0, W, H);
        if (z > 0) { q.globalCompositeOperation = 'destination-out'; q.fillStyle = bandGrad(q, Y, zones[z - 1][1], zones[z - 1][2]); q.fillRect(0, 0, W, H); }
        o.drawImage(Sb, 0, 0);
      }
      var rec = { c: out, p: p, B: B, bw: bw, bh: bh, A: A, D: D, inkA: inkA };
      if (ready) { memo[k] = rec; order.push(k); }   // a page measured before its font arrived is not kept
      return rec;
    }
    function paper(g, s) {
      g.fillStyle = s.paper; g.fillRect(0, 0, W, H);
      var rg = g.createRadialGradient(540, cfg.lockY, 60, 540, cfg.lockY, 1300);
      rg.addColorStop(0, s.dark ? 'rgba(255,236,210,.08)' : 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = s.dark ? 'screen' : 'multiply'; g.globalAlpha = s.dark ? 0.035 : 0.06;
      g.fillStyle = g.createPattern(noise(), 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    }
    function vignette(g, dark) {
      var vg = g.createRadialGradient(540, cfg.lockY, 420, 540, cfg.lockY, 1250);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(0,0,0,.55)' : 'rgba(40,28,14,.3)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    // box geometry: centre x y, rotation, scale; font from the page record
    function setBox(b, rec, x, y, r, s, o) {
      var ps = rec.p.s;
      b.style.width = rec.bw + 'px'; b.style.height = rec.bh + 'px'; b.style.borderRadius = Math.round(0.13 * rec.B) + 'px';
      b.t.style.font = (ps.it ? 'italic ' : '') + ps.w + ' ' + rec.B.toFixed(1) + 'px ' + ps.f;
      b.t.style.lineHeight = (rec.A + rec.D).toFixed(1) + 'px'; b.t.style.top = (rec.bh / 2 + rec.inkA / 2 - rec.A).toFixed(1) + 'px';
      b.style.transform = 'translate(' + (x - rec.bw / 2).toFixed(1) + 'px,' + (y - rec.bh / 2).toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
      b.style.opacity = o == null ? 1 : o; b.style.display = 'block';
    }
    function stack(parent) {
      var want = [ghosts[0], ghosts[1], box];
      if (box.parentNode !== parent || parent.lastChild !== box) want.forEach(function (n) { parent.appendChild(n); });
    }
    // where the box rests: over his head (7-frame mean of the nose x and the roll), its bottom tucked behind his hair
    function target(i) {
      var nx = 0, roll = 0;
      for (var d = -3; d <= 3; d++) { var f = st.face(i + d); nx += f.nx; roll += f.roll; }
      nx /= 7; roll /= 7;
      var rec = page(last()), bw = rec.bw * cfg.endScale, bh = rec.bh * cfg.endScale, top = st.top(i, nx - 100, nx + 100);
      return { x: clamp(nx, 70 + bw / 2, 1010 - bw / 2), y: Math.max(278 + bh / 2, top - bh / 2 + cfg.tuck), r: clamp(roll * 0.6, -4, 4) };
    }
    function slide(i, tau) {
      var L = last(), p = look(L), tg = target(i), e = 1 - spring(tau, 2.5, 0.62), s0 = 1.045 * p.sc;
      var breathe = clamp((tau - 0.35) / 0.3);
      return { x: lerp(540, tg.x, e), y: lerp(cfg.lockY, tg.y, e), r: lerp(p.tilt, tg.r, e) + 0.7 * Math.sin(tau * 3.1) * breathe,
        s: lerp(s0, cfg.endScale, e) * (1 + 0.012 * Math.sin(tau * 5.0) * breathe) };
    }
    // one page of the falling stack: it tips back away from the camera, hinged on the frame's bottom edge, drawn in
    // perspective strips, darkening as it turns from the light; a 3-sample shutter (equal-weight average) blurs it
    function fall(q, tq) {
      var dur = cfg.tip; if (tq >= dur) return;
      var rec = page(q), p = rec.p, s0 = 1.045 * p.sc, Y = cfg.lockY, sheet = scratch(2), g = reset(sheet);
      paper(g, p.s);
      g.save(); g.translate(540, Y); g.rotate(p.tilt * RAD); g.scale(s0, s0); g.translate(-540, -Y); g.drawImage(rec.c, 0, 0); g.restore();
      vignette(g, p.s.dark);
      if (tq <= 0) { st.pc.g.drawImage(sheet, 0, 0); return; }
      var acc = scratch(1), a = reset(acc), F = 2600, n = 60, sh = H / n;
      for (var m = 0; m < 3; m++) {
        var u = Math.max(0, tq - m / 180), th = Math.PI / 2 * Math.pow(clamp(u / dur), 2), ct = Math.cos(th), sn = Math.sin(th);
        a.globalAlpha = 1 / (m + 1); a.filter = 'brightness(' + (1 - 0.42 * sn).toFixed(3) + ')';
        var yAt = function (h) { return H - h * ct * F / (F + h * sn); };
        for (var r = 0; r < n; r++) {
          var h0 = H - r * sh, h1 = h0 - sh, y0 = yAt(h0), y1 = yAt(h1), k = F / (F + (h0 - sh / 2) * sn);
          if (y1 - y0 < 0.05) continue;
          a.drawImage(sheet, 0, r * sh, W, sh, 540 - 540 * k, y0, W * k, y1 - y0 + 0.6);
        }
      }
      a.filter = 'none'; a.globalAlpha = 1;
      st.pc.g.drawImage(acc, 0, 0);
    }
    return {
      rebuild: build,
      cues: function () {
        var r = [], every = cfg.every, of = fr(outT());
        for (var f = every; f < of && f / every <= last(); f += every) r.push({ at: f / FPS, sfx: 'page-cut' });
        r.push({ at: outT(), sfx: 'page-cut' });
        return r;
      },
      faceHidden: function (t) { return t < outT(); },
      draw: function (t) {
        var i = st.i(t), f = fr(t), Y = cfg.lockY, T0 = outT(), L = last();
        if (t < T0) {
          var k = Math.min(L, Math.floor(f / cfg.every)), rec = page(k), p = rec.p, g = st.pc.g;
          var sc = (1 + 0.045 * t / T0) * p.sc * (1 + 0.006 * (f % cfg.every));
          paper(g, p.s);
          g.save(); g.translate(540, Y); g.rotate(p.tilt * RAD); g.scale(sc, sc); g.translate(-540, -Y); g.drawImage(rec.c, 0, 0); g.restore();
          vignette(g, p.s.dark); grain(g, f, p.s.dark ? 0.08 : 0.06);
          stack(st.front);
          ghosts.forEach(function (n) { n.style.display = 'none'; });
          setBox(box, rec, 540, Y, p.tilt, sc);
          return;
        }
        var tau = t - T0;
        st.plate(i);
        for (var q = Math.max(0, L - 2); q <= L; q++) fall(q, tau - cfg.stagger * (L - q));
        // his soft shadow on the wall (and on the box), then him
        st.shape(st.bc.g, i, 'rgb(46,30,6)', { alpha: 0.26, filter: 'blur(22px)', dx: 16, dy: 22 });
        st.drawPerson(i);
        stack(st.back);
        // the slide's clock starts on the last page frame, so on the reveal frame the box is already on its way up
        var ts = tau + 1 / FPS, recL = page(L), now = slide(i, ts);
        setBox(box, recL, now.x, now.y, now.r, now.s);
        // the fast part of the slide leaves two soft ghosts behind (motion blur)
        [1, 2].forEach(function (d, gi) {
          var pr = slide(i, Math.max(0, ts - d / 120)), sp = Math.hypot(now.x - pr.x, now.y - pr.y) * 120 / d, a = clamp(sp / 2400) * (gi ? 0.22 : 0.38);
          if (a < 0.02) { ghosts[gi].style.display = 'none'; return; }
          setBox(ghosts[gi], recL, pr.x, pr.y, pr.r, pr.s, a); ghosts[gi].style.filter = 'blur(4px)';
        });
      }
    };
  });

  /* ===== 2. Shutter Strike: split screen, a light table on top (top 45%), his clip below (a crop around his face).
     Prints of him, grabbed from his own clip on the strike frames, are struck onto the table: a white shutter flash
     over the whole frame for 2 frames, the print drops from above the table onto it with a small bounce, a hashed
     tilt, paper shadows that tighten as it lands, stacking up. ===== */
  window.FxShutterStrike = K.factory(K.defs({ strikes: [0.35, 0.7, 1.05], split: 0.45, pre: true, preBack: 20, zoom: 1.2, dur: 2.3, sweep: 1.25,
    spots: [[318, 470], [744, 408], [478, 352], [636, 528]] }), function (st, cfg) {
    var prints = {}, crop = null, PW = 346, PH = 434, BD = 15;
    function list() {
      var r = [];
      if (cfg.pre) r.push({ at: -1, j: Math.max(0, cfg.frame0 - cfg.preBack), k: 0 });
      cfg.strikes.forEach(function (a, q) { var at = onFrame(a); r.push({ at: at, j: st.i(at), k: q + 1 }); });
      return r;
    }
    // the print of clip frame j: white border, a 4:5 crop from just above his hair, a gloss sheen
    function print(j) {
      if (prints[j]) return prints[j];
      var im = got(st.src('plate', j)); if (!im) return null;
      var f = st.face(j), c = document.createElement('canvas'); c.width = PW; c.height = PH;
      var g = c.getContext('2d'), iw = PW - 2 * BD, ih = PH - 2 * BD, cw = 600, ch = cw * ih / iw;
      var sx = clamp(f.nx - cw / 2, 0, W - cw), sy = clamp(f.ty - 210, 0, H - ch), kx = im.naturalWidth / W;
      g.fillStyle = '#fbfaf6'; rrect(g, 0, 0, PW, PH, 10); g.fill();
      g.save(); rrect(g, BD, BD, iw, ih, 4); g.clip();
      g.filter = 'contrast(1.07) saturate(1.08)'; g.drawImage(im, sx * kx, sy * kx, cw * kx, ch * kx, BD, BD, iw, ih); g.filter = 'none';
      var sh = g.createLinearGradient(BD, BD, BD + iw * 0.8, BD + ih); sh.addColorStop(0, 'rgba(255,255,255,.2)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.06)');
      g.fillStyle = sh; g.fillRect(BD, BD, iw, ih);
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1.5; rrect(g, BD, BD, iw, ih, 4); g.stroke();
      return (prints[j] = c);
    }
    function cropBox() {
      if (crop) return crop;
      var n = cfg.frames || 68, sx = 0, sy = 0, c = 0;
      for (var f = 0; f < n; f += 2) { var fc = st.face(cfg.frame0 + f); sx += fc.nx; sy += (fc.ly + fc.ry) / 2; c++; }
      return (crop = { x: sx / c, y: sy / c });
    }
    return {
      rebuild: function () { prints = {}; crop = null; },
      cues: function () { return cfg.strikes.map(function (a) { return { at: onFrame(a), sfx: 'shutter' }; }); },
      need: function (t) { return st.urls(t, [], list().map(function (p) { return st.src('plate', p.j); })); },
      draw: function (t) {
        var i = st.i(t), g = st.pc.g, top = Math.round(H * cfg.split), ph = H - top, u = t / cfg.dur;
        // his clip, below
        var z = cfg.zoom * (1 + 0.025 * u), sw = W / z, sh = ph / z, cb = cropBox(), im = got(st.src('plate', i));
        if (im) {
          var kx = im.naturalWidth / W, sx = clamp(cb.x - sw / 2, 0, W - sw), sy = clamp(cb.y - 0.4 * sh, 0, H - sh);
          g.drawImage(im, sx * kx, sy * kx, sw * kx, sh * kx, 0, top, W, ph);
        }
        // the light table: a lit grey sheet with a faint grid, easing in a touch over the segment
        g.save(); g.beginPath(); g.rect(0, 0, W, top); g.clip();
        var lg = g.createLinearGradient(0, 0, 0, top); lg.addColorStop(0, '#e7e7ea'); lg.addColorStop(1, '#dcdce0');
        g.fillStyle = lg; g.fillRect(0, 0, W, top);
        var rg = g.createRadialGradient(540, top * 0.46, 40, 540, top * 0.46, 780);
        rg.addColorStop(0, 'rgba(255,255,255,.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, top);
        var dz = 1 + 0.055 * u, dr = 0.6 * u * RAD, cx = 540, cy = top / 2;
        g.translate(cx, cy); g.rotate(dr); g.scale(dz, dz); g.translate(-cx, -cy);
        for (var gx = -128, c = 0; gx <= W + 128; gx += 64, c++) { g.fillStyle = c % 4 ? 'rgba(40,40,64,.065)' : 'rgba(40,40,64,.11)'; g.fillRect(gx, -100, 1.5, top + 200); }
        for (var gy = -128, d = 0; gy <= top + 128; gy += 64, d++) { g.fillStyle = d % 4 ? 'rgba(40,40,64,.065)' : 'rgba(40,40,64,.11)'; g.fillRect(-100, gy, W + 200, 1.5); }
        g.restore();
        // the split: a crisp lip on the table edge and a thin shadow on the clip
        var sg = g.createLinearGradient(0, top, 0, top + 24); sg.addColorStop(0, 'rgba(0,0,0,.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg; g.fillRect(0, top, W, 24);
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, top - 2, W, 2);
        // the prints, oldest first, on the drifting table
        g.save(); g.translate(cx, cy); g.rotate(dr); g.scale(dz, dz); g.translate(-cx, -cy);
        list().forEach(function (p) {
          var tau = t - p.at; if (tau < 0) return;
          var pc = print(p.j); if (!pc) return;
          var land = 0.15, h = p.at < 0 ? 0 : 1 - Math.pow(clamp(tau / land), 2), tb = tau - land;
          var bounce = p.at < 0 || tb < 0 ? 0 : 0.024 * Math.exp(-tb / 0.06) * Math.abs(Math.sin(tb * 30));
          var rest = (p.k % 2 ? 1 : -1) * (3 + hash(p.k * 2.7 + 0.4) * 7), spin = (hash(p.k * 5.1 + 2.2) * 2 - 1) * 16;
          var sp = cfg.spots[p.k % cfg.spots.length], x = sp[0] + (hash(p.k * 3.3 + 1) * 2 - 1) * 90 * h, y = sp[1] - (50 + hash(p.k * 4.4) * 60) * h;
          var s = 1 + 0.42 * h + bounce, bright = p.at < 0 ? 1 : 1 + 0.9 * Math.exp(-tau / 0.07);
          g.save(); g.translate(x, y); g.rotate((rest + spin * h) * RAD); g.scale(s, s);
          g.fillStyle = '#fbfaf6'; rrect(g, -PW / 2, -PH / 2, PW, PH, 10);
          // ambient shadow: wide and light while it is in the air, close and darker once it is down
          g.shadowColor = 'rgba(28,28,44,' + (0.3 - 0.12 * h).toFixed(3) + ')'; g.shadowBlur = 20 + 56 * h; g.shadowOffsetX = 6 + 34 * h; g.shadowOffsetY = 12 + 60 * h; g.fill();
          if (h < 0.6) { g.shadowColor = 'rgba(20,20,34,' + (0.4 * (1 - h)).toFixed(3) + ')'; g.shadowBlur = 5; g.shadowOffsetX = 1; g.shadowOffsetY = 2; g.fill(); }
          g.shadowColor = 'rgba(0,0,0,0)';
          if (bright > 1.01) g.filter = 'brightness(' + bright.toFixed(3) + ')';
          g.drawImage(pc, -PW / 2, -PH / 2); g.filter = 'none';
          // once the stack is down, a slow gloss highlight travels across each print in turn
          var sw = (t - cfg.sweep - p.k * 0.08) / 0.85;
          if (sw > 0 && sw < 1) {
            g.save(); rrect(g, -PW / 2 + BD, -PH / 2 + BD, PW - 2 * BD, PH - 2 * BD, 4); g.clip();
            var gx0 = lerp(-PW, PW, sw), gl = g.createLinearGradient(gx0 - 130, -PH / 2, gx0 + 130, PH / 2);
            gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.24)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gl; g.fillRect(-PW / 2, -PH / 2, PW, PH); g.restore();
          }
          g.restore();
        });
        g.restore();
        // the shutter: the whole frame flashes white on the strike frame and the next
        var fl = 0;
        list().forEach(function (p) { if (p.at < 0) return; var d = fr(t) - fr(p.at); if (d === 0) fl = Math.max(fl, 0.9); else if (d === 1) fl = Math.max(fl, 0.45); });
        if (fl) { st.fc.g.fillStyle = 'rgba(255,255,255,' + fl + ')'; st.fc.g.fillRect(0, 0, W, H); }
      }
    };
  });

  /* ===== 3. Profile Wall: his Instagram-style profile page stands on the wall behind his head (his head and body
     hide it), the grid of his real reel covers pops in tile by tile, the page drifts against his head; in front, under
     his chin, a glass channel chip whose Follow button is tapped and turns into Following. ===== */
  var COVERS = ['reel6-1.5', 'reel1-1.5', 'reel4-1.5', 'reel3-1.5', 'reel7-1.5', 'reel5-1.5', 'reel8-1.5', 'reel2-1.5', 'reel9-6'];
  var ICON = {
    grid: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    reels: '<rect x="3" y="3" width="18" height="18" rx="4.5"/><path d="M3 8.5h18M8.4 3l3 5.5M14.4 3l3 5.5"/><path d="M10.2 11.7v5l4.2-2.5z" stroke-linejoin="round"/>',
    tag: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="12" cy="10.2" r="3.1"/><path d="M6.6 20.6c1-3.1 3-4.7 5.4-4.7s4.4 1.6 5.4 4.7"/>'
  };
  function icon(name, px, col, fill) { return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="none" stroke="' + col + '" stroke-width="1.9">' + (fill ? ICON[name].replace('z"', 'z" fill="' + col + '"') : ICON[name]) + '</svg>'; }

  window.FxProfileWall = K.factory(K.defs({ reels: '', covers: COVERS, avatar: ['reel1-6', 270, 410, 300], name: 'Yusif Darwish', handle: 'yusifdarw',
    posts: '10', bio: ['Agents explained in simple terms', 'AI Fluency, tool tests &amp; tutorials', 'Made easy for any audience'],
    pop: [0.25, 0.8], tap: 1.3, dur: 2.15, at: [60, 240] }), function (st, cfg) {
    var panel, tiles, chip, btn, btnT, rip, wF = 160, wFg = 220;
    function base() { return cfg.reels || cfg.media.replace(/frames\/?$/, '') + 'media/reels/'; }
    function url(name) { return base() + name + '.jpg'; }
    function avatar(px) {
      var a = cfg.avatar, k = px / a[3], d = el('div', 'cs-av'), im = el('img');
      d.style.cssText += ';width:' + px + 'px;height:' + px + 'px';
      im.src = url(a[0]); im.style.cssText = 'width:' + (540 * k).toFixed(1) + 'px;left:' + (-(a[1] - a[3] / 2) * k).toFixed(1) + 'px;top:' + (-(a[2] - a[3] / 2) * k).toFixed(1) + 'px';
      d.appendChild(im); return d;
    }
    function t(cls, css, html, parent) { var n = txt(el('div', 't' + (cls ? ' ' + cls : ''), html)); n.style.cssText += ';' + css; parent.appendChild(n); return n; }
    function build() {
      st.back.innerHTML = ''; st.front.innerHTML = '';
      panel = el('div', 'cs-ig');
      var ring = el('div', 'ring'); ring.appendChild(el('i')); var av = avatar(112); av.style.left = '9px'; av.style.top = '9px'; ring.appendChild(av); panel.appendChild(ring);
      t('', 'left:192px;top:40px;font:700 46px/54px csInter,sans-serif;letter-spacing:-.01em', esc(cfg.handle) + ' ' + badge(36), panel);
      t('', 'left:192px;top:94px;font:600 34px/40px csInter,sans-serif', esc(cfg.name), panel);
      t('', 'left:192px;top:134px;font:400 32px/38px csInter,sans-serif;color:#a8a8a8', '<b style="color:#f5f5f5;font-weight:700">' + esc(cfg.posts) + '</b> posts', panel);
      cfg.bio.forEach(function (l, q) { t('', 'left:36px;top:' + (180 + 34 * q) + 'px;font:400 30px/34px csInter,sans-serif;color:#ececec', l, panel); });
      var tabs = el('div', 'tabs');
      tabs.innerHTML = '<div style="left:138px">' + icon('grid', 44, '#f5f5f5') + '</div><div style="left:458px">' + icon('reels', 44, '#8e8e8e', 1) +
        '</div><div style="left:778px">' + icon('tag', 44, '#8e8e8e') + '</div><div class="ul"></div>';
      panel.appendChild(tabs);
      tiles = cfg.covers.slice(0, 9).map(function (name, k) {
        var slot = el('div', 'slot'), card = el('div', 'card'), im = el('img'), ri = el('div', 'ri', icon('reels', 34, '#ffffff'));
        slot.style.left = (k % 3) * 321 + 'px'; slot.style.top = 366 + Math.floor(k / 3) * 427 + 'px';
        im.src = url(name); card.appendChild(im); card.appendChild(ri); slot.appendChild(card); panel.appendChild(slot);
        return { slot: slot, card: card };
      });
      st.back.appendChild(panel);
      chip = el('div', 'cs-chip');
      var cav = avatar(80); cav.style.left = '16px'; cav.style.top = '16px'; chip.appendChild(cav);
      t('', 'left:112px;top:14px;font:700 36px/42px csInter,sans-serif;letter-spacing:-.01em', esc(cfg.name) + ' ' + badge(30), chip);
      t('', 'left:112px;top:58px;font:500 30px/36px csInter,sans-serif;color:#a8a8a8', '@' + esc(cfg.handle), chip);
      btn = el('div', 'btn'); rip = el('div', 'rip'); btnT = txt(el('div', null, 'Follow')); btnT.style.position = 'relative';
      btn.appendChild(rip); btn.appendChild(btnT); chip.appendChild(btn);
      st.front.appendChild(chip);
    }
    build();
    function popAt(k) { var a = cfg.pop[0], b = cfg.pop[1]; return k === 0 ? onFrame(a) : k === 8 ? onFrame(b) : onFrame(a + (b - a) * k / 8); }
    function chipTop() {
      var n = cfg.frames || 65, m = 0;
      for (var f = 0; f < n; f++) m = Math.max(m, st.face(cfg.frame0 + f).cy);
      return Math.min(1248 - 112 - 6, Math.round(m + 22));
    }
    var CT = null;
    return {
      rebuild: function () { build(); CT = null; },
      cues: function () { /* one pop, on the first tile: the later tiles land 2 frames apart and one sound cannot sit on all of them */ return [{ at: popAt(0), sfx: 'tile-pop' }, { at: onFrame(cfg.tap), sfx: 'tap' }]; },
      need: function (t) { return st.urls(t, [], cfg.covers.slice(0, 9).map(url).concat([url(cfg.avatar[0])])); },
      draw: function (t) {
        var i = st.i(t), u = clamp(t / cfg.dur), nx = 0, nx0 = st.face(cfg.frame0).nx;
        for (var d = -3; d <= 3; d++) nx += st.face(i + d).nx; nx /= 7;
        st.plate(i);
        // the page drifts one way while his head moves the other: parallax against him
        var dx = lerp(-14, 14, u) - 0.22 * (nx - nx0), dy = lerp(4, -4, u);
        panel.style.transform = 'translate(' + (cfg.at[0] + dx).toFixed(1) + 'px,' + (cfg.at[1] + dy).toFixed(1) + 'px) perspective(2200px) rotateY(' + lerp(-1.6, 1.6, u).toFixed(3) + 'deg) scale(' + (1 + 0.014 * u).toFixed(4) + ')';
        tiles.forEach(function (T, k) {
          var tau = t - popAt(k);
          T.slot.style.backgroundPosition = (100 - ((t * 1.3 + k * 0.11) % 1) * 100).toFixed(1) + '% 0';
          if (tau < 0) { T.card.style.opacity = 0; return; }
          var p = clamp(tau / 0.24), s = lerp(0.5, 1, back(p, 1.7));
          T.card.style.opacity = clamp(tau / 0.05); T.card.style.transform = 'scale(' + s.toFixed(4) + ')';
          T.card.style.filter = 'brightness(' + (1 + 0.45 * Math.exp(-tau / 0.08)).toFixed(3) + ')';
        });
        st.shape(st.bc.g, i, 'rgb(20,12,0)', { alpha: 0.34, filter: 'blur(26px)', dx: 22, dy: 28 });
        st.drawPerson(i);
        // the chip: already there, settles from a touch smaller (about its centre, so its text never leaves the safe
        // area), floats; the Follow button is tapped
        if (CT === null) CT = chipTop();
        var cy = CT + 2.5 * Math.sin(t * 4.2) * clamp(t / 0.4), cs = lerp(0.93, 1, back(clamp(t / 0.26), 1.4));
        chip.style.transform = 'translate(' + (540 - 362) + 'px,' + cy.toFixed(1) + 'px) scale(' + cs.toFixed(4) + ')'; chip.style.opacity = clamp(0.8 + t / 0.15);
        var mg = st.off.g; mg.font = '600 32px csInter';
        wF = Math.round(mg.measureText('Follow').width + 72); wFg = Math.round(mg.measureText('Following').width + 72);
        var tap = onFrame(cfg.tap), on = t >= tap, tau = t - tap;
        var press = !on ? 1 - 0.08 * clamp((t - (tap - 0.067)) / 0.067) : 1 - 0.08 * spring(tau, 3.4, 0.42);
        var bw = on ? lerp(wF, wFg, eout(tau / 0.2)) : wF;
        btn.style.width = bw.toFixed(1) + 'px'; btn.style.left = (724 - 22 - bw).toFixed(1) + 'px'; btn.style.transform = 'scale(' + press.toFixed(4) + ')';
        btn.style.background = on ? '#363639' : '#ffffff'; btn.style.color = on ? '#f5f5f5' : '#0c0c0d';
        if (btnT.textContent !== (on ? 'Following' : 'Follow')) btnT.textContent = on ? 'Following' : 'Follow';
        var rs = on ? eout(tau / 0.4) : 0, ro = on ? 0.9 * (1 - clamp(tau / 0.42)) : 0;
        rip.style.left = (bw / 2 - 80).toFixed(1) + 'px'; rip.style.top = (34 - 80) + 'px';
        rip.style.transform = 'scale(' + (0.25 + 1.4 * rs).toFixed(3) + ')'; rip.style.opacity = ro.toFixed(3);
      }
    };
  });
})();
