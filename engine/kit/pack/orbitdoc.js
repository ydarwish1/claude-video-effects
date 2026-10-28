/* Orbitdoc lane (fx reel 2026-10-28): two rebuilds of Vibha's effects in the fx-reel-kit contract.
   Load after fx-reel-kit.js. Globals: FxOrbit (scene "orbit"), FxDocumentary (scene "documentary").
   FxOrbit: seven of his real reel covers circle his head on a tilted 3D ring centred on his face. The front half of
   the ring is drawn in front of him (st.fc), the back half behind him (st.bc, so his body hides it); perspective makes
   back cards smaller, darker and a little soft. At `at` the ring kicks into a fast spin with motion blur, then eases
   back to a slow turn. Front cards are routed under his chin, so no card ever sits on his face.
   FxDocumentary: a black-and-white documentary poster: his cut-out in hard black and white over a black set with a
   magenta spotlight behind his head, a kicker, a three-line Anton headline, a pink lower third and a Follow button a
   cursor taps on `tap` (it flips to Following). Film grain, vignette, slow push-in. */
(function () {
  var K = window.FxReelKitCore, W = K.W, H = K.H, FPS = K.FPS;
  var clamp = K.clamp, lerp = K.lerp, eout = K.eout, el = K.el, esc = K.esc, txt = K.txt, got = K.got;

  // fonts as FontFace objects at load time, so document.fonts.ready (and canvas text) wait for them
  if (window.FontFace && !window.__odFonts) {
    window.__odFonts = true;
    [['OdAnton', 'Anton-Regular.ttf', '400'], ['OdMont', 'Montserrat.ttf', '100 900'], ['OdInter', 'Inter.ttf', '100 900']].forEach(function (f) {
      try { var ff = new FontFace(f[0], 'url(/elements/fonts/' + f[1] + ')', { weight: f[2] }); document.fonts.add(ff); ff.load().catch(function () {}); } catch (e) {}
    });
  }
  var PINK = '#ff3f7a', RED = '#ff3262', IG = '#0095f6';
  if (!document.getElementById('od-style')) {
    var sty = document.createElement('style'); sty.id = 'od-style';
    sty.textContent =
      '.fxk .od-h{font:400 100px/1 OdAnton,Anton,Impact,sans-serif;color:#f3efe7;white-space:nowrap;letter-spacing:.004em;text-shadow:0 10px 34px rgba(0,0,0,.6)}' +
      '.fxk .od-h i{font-style:normal;color:' + RED + '}' +
      '.fxk .od-k{font:600 30px/1 OdMont,Montserrat,sans-serif;letter-spacing:.22em;color:rgba(255,255,255,.92);white-space:nowrap}' +
      '.fxk .od-k i{font-style:normal;color:' + PINK + '}.fxk .od-k b{font-weight:600;color:rgba(255,255,255,.45)}' +
      '.fxk .od-bar{height:70px;background:linear-gradient(90deg,#ff4a82,#f0306b);box-shadow:0 16px 36px rgba(0,0,0,.5)}' +
      '.fxk .od-name{font:800 46px/1 OdMont,Montserrat,sans-serif;letter-spacing:.06em;color:#fff;white-space:nowrap}' +
      '.fxk .od-hd{font:500 32px/1 OdInter,Inter,sans-serif;letter-spacing:.01em;color:rgba(255,255,255,.88);white-space:nowrap}' +
      '.fxk .od-btn{width:310px;height:104px;border-radius:26px;background:' + IG + ';box-shadow:0 18px 44px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.28)}' +
      '.fxk .od-btn .od-l{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:700 46px/1 OdInter,Inter,sans-serif;color:#fff;white-space:nowrap;letter-spacing:-.005em}' +
      '.fxk .od-rip{width:40px;height:40px;border-radius:50%;border:4px solid rgba(255,255,255,.9);margin:-24px 0 0 -24px}';
    document.head.appendChild(sty);
  }

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function smooth(p) { p = clamp(p); return p * p * (3 - 2 * p); }
  // the face averaged over 5 frames, so what rides on it does not shiver
  function sface(st, i) {
    var o = {}, k, n = 0;
    for (var d = -2; d <= 2; d++) { var f = st.face(i + d); for (k in f) o[k] = (o[k] || 0) + f[k]; n++; }
    for (k in o) o[k] /= n;
    return o;
  }
  function reelBase(cfg) {
    if (cfg.reelBase) return cfg.reelBase;
    return cfg.media ? cfg.media.replace(/frames\/?$/, '') + 'media/reels/' : '/ut/media/reels/';
  }

  /* ===== Orbit ===== */
  window.FxOrbit = K.factory(K.defs({
    reels: ['reel4-1.5.jpg', 'reel5-1.5.jpg', 'reel3-6.jpg', 'reel6-1.5.jpg', 'reel9-6.jpg', 'reel8-1.5.jpg', 'reel2-1.5.jpg'],
    reelBase: '', at: 0.5, spin: 1.0, decay: 0.3, rise: 0.012, w0: 0.75, phase: 0.35,
    rx: 440, below: 280, above: 95, side: 25, persp: 0.2, tilt: -6, cardW: 248, shutter: 0.5
  }), function (st, cfg) {
    var spr = {}, tc = K.cv();
    function urls() { var b = reelBase(cfg); return cfg.reels.map(function (r) { return b + r; }); }
    function q() { return 1 / cfg.rise + 1 / cfg.decay; }
    function amp() { return cfg.spin * 2 * Math.PI / (cfg.decay - 1 / q()); }
    // the burst starts one frame before the cue, so the cue frame is the first one that shows the jump
    function burst(tau) { if (tau <= 0) return 0; return amp() * (cfg.decay * (1 - Math.exp(-tau / cfg.decay)) - (1 - Math.exp(-tau * q())) / q()); }
    function vel(tau) { return tau <= 0 ? 0 : amp() * (1 - Math.exp(-tau / cfg.rise)) * Math.exp(-tau / cfg.decay); }
    function t0() { return cfg.at - 1 / FPS; }
    function phi(t) { return cfg.phase + cfg.w0 * t + burst(t - t0()); }
    function ring(f, t) {
      var F = f.cy + cfg.below, B = f.ty - cfg.above, S = f.ny + cfg.side, v = vel(t - t0()) / amp();
      var R = { cx: f.nx, S: S, ry: (F - B) / 2, b: (F + B) / 2 - S, rx: cfg.rx * (1 + 0.05 * v), rot: (cfg.tilt + 0.6 * f.roll) * Math.PI / 180, f: f };
      // route the front arc under his chin, smoothly in the ring angle: scan the front half for card boxes that would
      // reach his face (s1 = the first depth where one does), take the deepest push any of them needs (E), and lower
      // the ring by E * a smoothstep that is full from s1 on. A push read off each card's own overlap made it jerk.
      var chin = Math.max(f.y1, f.cy) + 40, fx0 = f.x0 - 14, fx1 = f.x1 + 14, s1 = 2, E = 0;
      for (var q2 = 0; q2 <= 200; q2++) {
        var sv = q2 / 200, ca = Math.sqrt(Math.max(0, 1 - sv * sv));
        for (var sg = -1; sg <= 1; sg += 2) {
          var bb = base(sv, sg * ca, R), ov = Math.min(bb.x + bb.w / 2, fx1) - Math.max(bb.x - bb.w / 2, fx0);
          if (ov > 0) { s1 = Math.min(s1, sv); E = Math.max(E, chin - (bb.y - bb.h / 2)); }
        }
      }
      R.E = Math.max(0, E); R.s1 = Math.max(0.1, Math.min(1, s1 - 0.005)); R.s0 = Math.max(0.03, R.s1 - 0.35);
      return R;
    }
    function base(s, c, R) {
      var P = 1 / (1 - cfg.persp * s), Pf = 1 / (1 - cfg.persp), sc = P / Pf;
      var dx = R.rx * c * P, dy = R.ry * s + R.b * s * s, w = cfg.cardW * sc;
      return { x: R.cx + dx * Math.cos(R.rot) - dy * Math.sin(R.rot), y: R.S + dx * Math.sin(R.rot) + dy * Math.cos(R.rot), w: w, h: w * 16 / 9, sc: sc };
    }
    function pos(k, ts, R) {
      var n = cfg.reels.length, th = phi(ts) + k * 2 * Math.PI / n, s = Math.sin(th), c = Math.cos(th), b = base(s, c, R);
      var y = b.y + (s > 0 && R.E > 0 ? R.E * smooth((s - R.s0) / (R.s1 - R.s0)) : 0);
      return { x: b.x, y: y, s: s, sc: b.sc, rot: (R.rot * 0.7 + (4 * c + (hash(k) - 0.5) * 5) * Math.PI / 180) };
    }
    function sprite(k) {
      if (spr[k]) return spr[k];
      var im = got(urls()[k]); if (!im) return null;
      var w = cfg.cardW, h = Math.round(w * 16 / 9), pad = 60, r = Math.round(w * 0.085);
      var c = document.createElement('canvas'); c.width = w + 2 * pad; c.height = h + 2 * pad;
      var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.save(); g.shadowColor = 'rgba(0,0,0,.34)'; g.shadowBlur = 44; g.shadowOffsetY = 22; g.fillStyle = '#000'; rr(g, pad, pad, w, h, r); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 9; g.shadowOffsetY = 4; g.fillStyle = '#000'; rr(g, pad, pad, w, h, r); g.fill(); g.restore();
      g.save(); rr(g, pad, pad, w, h, r); g.clip();
      var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s;
      g.drawImage(im, pad + (w - iw) / 2, pad + (h - ih) / 2, iw, ih);
      var gl = g.createLinearGradient(0, pad, 0, pad + h * 0.45); gl.addColorStop(0, 'rgba(255,255,255,.14)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fillRect(pad, pad, w, h * 0.45);
      g.restore();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.92)'; rr(g, pad + 1.5, pad + 1.5, w - 3, h - 3, r - 1.5); g.stroke();
      return (spr[k] = c);
    }
    function look(s) {
      var d = (s + 1) / 2, bl = Math.max(0, -s) * 2.6;
      return 'brightness(' + lerp(0.62, 1, d).toFixed(3) + ') saturate(' + lerp(0.8, 1.05, d).toFixed(3) + ')' + (bl > 0.3 ? ' blur(' + bl.toFixed(2) + 'px)' : '');
    }
    function stamp(g, sp, p) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(p.sc, p.sc); g.drawImage(sp, -sp.width / 2, -sp.height / 2); g.restore();
    }
    function card(g, sp, S) {
      var p = S[0];
      if (S.length === 1) { g.save(); g.filter = look(p.s); stamp(g, sp, p); g.restore(); return; }
      // motion blur: the shutter's samples summed (each at 1/n, additive) on a scratch canvas, then laid down once
      var rad = 0.5 * Math.sqrt(sp.width * sp.width + sp.height * sp.height), x0 = W, y0 = H, x1 = 0, y1 = 0;
      S.forEach(function (o) { var r = rad * o.sc; x0 = Math.min(x0, o.x - r); y0 = Math.min(y0, o.y - r); x1 = Math.max(x1, o.x + r); y1 = Math.max(y1, o.y + r); });
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      if (x1 <= x0 || y1 <= y0) return;
      var o = tc.g; o.setTransform(1, 0, 0, 1, 0, 0); o.filter = 'none'; o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(x0, y0, x1 - x0, y1 - y0);
      o.globalCompositeOperation = 'lighter'; o.globalAlpha = 1 / S.length;
      S.forEach(function (q2) { stamp(o, sp, q2); });
      o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
      g.save(); g.filter = look(p.s); g.drawImage(tc, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); g.restore();
    }
    return {
      cues: function () { return [{ at: cfg.at, sfx: 'orbit-whoosh' }]; },
      need: function (t) { return st.urls(t, [], urls()); },
      draw: function (t) {
        var i = st.i(t), R = ring(sface(st, i), t);
        st.plate(i); st.drawPerson(i);
        // samples over a half-frame shutter, as many as the card that travels furthest in it needs for a smooth smear
        // (3.5 px apart), measured from the cards' real start and end positions
        var dt = cfg.shutter / FPS, far = 0, list = [];
        for (var m = 0; m < cfg.reels.length; m++) { var pa = pos(m, t, R), pb = pos(m, t - dt, R); far = Math.max(far, Math.hypot(pa.x - pb.x, pa.y - pb.y) + 120 * Math.abs(pa.sc - pb.sc)); }
        var ns = far < 1.5 ? 1 : clamp(Math.ceil(far / 3.5) + 1, 2, 56);
        for (var k = 0; k < cfg.reels.length; k++) {
          var S = [];
          for (var j = 0; j < ns; j++) S.push(pos(k, t - (ns > 1 ? cfg.shutter / FPS * j / (ns - 1) : 0), R));
          list.push({ k: k, s: S[0].s, S: S });
        }
        list.sort(function (a, b) { return a.s - b.s; });
        list.forEach(function (it) { var sp = sprite(it.k); if (sp) card(it.s < 0 ? st.bc.g : st.fc.g, sp, it.S); });
      }
    };
  });

  /* ===== Documentary ===== */
  window.FxDocumentary = K.factory(K.defs({
    tap: 0.9, push: 0.05, spotR: 335, spotDx: -30, spotDy: -55,
    kicker: 'CLAUDE CODE<b> · </b>ONE CLIP<b> · </b><i>SEVEN EDITS</i>',
    lines: ['ONE <i>CLIP.</i>', 'SEVEN EDITS.', 'ONE PROMPT.'], lineTop: 318, lineGap: 98,
    name: 'YUSIF DARWISH', handle: '@yusifdarw', ghost: '07', btn: [700, 1136]
  }), function (st, cfg) {
    var P = {}, grainTile = null, frame = K.cv();
    function build() {
      st.back.innerHTML = ''; st.front.innerHTML = '';
      P.lines = cfg.lines.map(function (h) { var d = txt(el('div', 'ab od-h', h)); st.front.appendChild(d); return d; });
      P.kick = txt(el('div', 'ab od-k', cfg.kicker)); st.front.appendChild(P.kick);
      P.bar = el('div', 'ab od-bar'); st.front.appendChild(P.bar);
      P.name = txt(el('div', 'ab od-name', esc(cfg.name))); st.front.appendChild(P.name);
      P.hd = txt(el('div', 'ab od-hd', esc(cfg.handle))); st.front.appendChild(P.hd);
      P.btn = el('div', 'ab od-btn'); P.lab = txt(el('div', 'od-l', 'Follow')); P.btn.appendChild(P.lab); st.front.appendChild(P.btn);
      P.rip = el('div', 'ab od-rip'); st.front.appendChild(P.rip);
      P.cur = el('div', 'ab');
      P.cur.innerHTML = '<svg width="64" height="92" viewBox="-3 -3 46 66" style="display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))"><path d="M0 0 L0 50 L12 39 L20 58 L28 54.5 L20 36 L36 36 Z" fill="#fff" stroke="#0b0b0b" stroke-width="3" stroke-linejoin="round"/></svg>';
      P.cur.style.transformOrigin = '0 0'; st.front.appendChild(P.cur);
    }
    build();
    function grain() {
      if (grainTile) return grainTile;
      var c = document.createElement('canvas'), n = 256; c.width = c.height = n;
      var g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data;
      for (var p = 0; p < n * n; p++) {
        var v = hash(p * 1.37 + 0.5) + hash(p * 2.91 + 7.1) - 1, a = Math.abs(v) * 0.09 * 255;
        d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = v > 0 ? 255 : 0; d[p * 4 + 3] = a;
      }
      g.putImageData(im, 0, 0);
      return (grainTile = c);
    }
    // a staggered settle: every part is there at t = 0 (35 %), full by t = 0.06 + 0.015 k (all by 0.15), and slides its
    // last few px home by about t = 0.6
    function settle(t, k) { return { o: clamp(0.35 + 0.65 * t / (0.06 + 0.015 * k)), e: eout((t - 0.02 * k) / 0.55) }; }
    function put(node, x, y, o, s) { node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' + (s != null ? ' scale(' + s.toFixed(4) + ')' : ''); node.style.opacity = o; }
    return {
      rebuild: build,
      cues: function () { return [{ at: cfg.tap, sfx: 'tap' }]; },
      need: function (t) { var i = st.i(t); return [st.src('person', i)]; },
      draw: function (t) {
        var i = st.i(t), f = sface(st, i), tau = t - cfg.tap, hit = tau >= 0 ? Math.exp(-tau / 0.22) : 0;
        var z = 1 + cfg.push * (t / 2.3), ax = 560, ay = 900, g = st.pc.g;
        // the set: near-black, a magenta wash, a faint grid, a huge outlined word, the spotlight disc behind his head
        g.fillStyle = '#070609'; g.fillRect(0, 0, W, H);
        g.save(); g.translate(ax, ay); g.scale(z, z); g.translate(-ax, -ay);
        var sx = f.nx + cfg.spotDx, sy = f.ny + cfg.spotDy, R = cfg.spotR;
        var wash = g.createRadialGradient(sx, sy, 0, sx, sy, 1100);
        wash.addColorStop(0, 'rgba(160,24,92,.55)'); wash.addColorStop(0.45, 'rgba(84,14,58,.32)'); wash.addColorStop(1, 'rgba(20,6,18,0)');
        g.fillStyle = wash; g.fillRect(-200, -200, W + 400, H + 400);
        var wash2 = g.createRadialGradient(940, 260, 0, 940, 260, 760);
        wash2.addColorStop(0, 'rgba(110,22,80,.38)'); wash2.addColorStop(1, 'rgba(110,22,80,0)');
        g.fillStyle = wash2; g.fillRect(-200, -200, W + 400, H + 400);
        g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1.5; g.beginPath();
        for (var gx = -60; gx <= W + 60; gx += 72) { g.moveTo(gx, -100); g.lineTo(gx, H + 100); }
        for (var gy = -60; gy <= H + 60; gy += 72) { g.moveTo(-100, gy); g.lineTo(W + 100, gy); }
        g.stroke();
        g.font = '400 520px OdAnton, Anton, Impact, sans-serif'; g.textBaseline = 'alphabetic';
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,' + (0.11 + 0.02 * Math.sin(t * 2)).toFixed(3) + ')';
        g.strokeText(cfg.ghost, 40 - 10 * t, 770);
        // the spotlight: a hot pink disc with a soft edge, and a thin ring offset from it; the tap pulses both
        var pulse = 1 + 0.22 * hit, sr = R * (1 + 0.04 * hit);
        var disc = g.createRadialGradient(sx - R * 0.25, sy - R * 0.3, R * 0.05, sx, sy, sr);
        disc.addColorStop(0, 'rgba(255,92,150,' + (0.98).toFixed(3) + ')');
        disc.addColorStop(0.62, 'rgba(236,52,120,' + (0.92 * Math.min(1, 0.85 * pulse)).toFixed(3) + ')');
        disc.addColorStop(0.9, 'rgba(176,28,92,' + (0.75).toFixed(3) + ')');
        disc.addColorStop(1, 'rgba(120,16,64,0)');
        g.save(); g.shadowColor = 'rgba(255,60,130,' + (0.55 * pulse).toFixed(3) + ')'; g.shadowBlur = 120;
        g.fillStyle = disc; g.beginPath(); g.arc(sx, sy, sr, 0, 6.2832); g.fill(); g.restore();
        if (hit > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,120,180,' + (0.28 * hit).toFixed(3) + ')'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.2832); g.fill(); g.restore(); }
        var rr0 = R * 1.1 + 6 * Math.sin(t * 1.3);
        g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,140,185,.5)'; g.beginPath(); g.arc(sx + 26, sy - 14, rr0, 0, 6.2832); g.stroke();
        if (hit > 0) { g.lineWidth = 3; g.strokeStyle = 'rgba(255,170,205,' + (0.8 * hit).toFixed(3) + ')'; g.beginPath(); g.arc(sx + 26, sy - 14, rr0 + 120 * (1 - hit), 0, 6.2832); g.stroke(); }
        g.restore();
        // him: hard black and white, pushed in with the set, a faint pink rim where the spotlight is behind him
        var pe = st.person(i), q = st.qc.g;
        if (pe) {
          q.save(); q.translate(ax, ay); q.scale(z, z); q.translate(-ax, -ay);
          q.filter = 'grayscale(1) contrast(1.5) brightness(1.06)'; q.drawImage(pe, 0, 0, W, H); q.filter = 'none';
          var o = st.off.g; o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.clearRect(0, 0, W, H);
          o.drawImage(pe, 0, 0, W, H); o.globalCompositeOperation = 'destination-out'; o.drawImage(pe, 10, 12, W, H);
          o.globalCompositeOperation = 'source-in'; o.fillStyle = 'rgba(255,120,175,.85)'; o.fillRect(0, 0, W, H);
          // the rim is the spotlight's: strong at his head, gone by his shoulders
          var fall = o.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 1.7); fall.addColorStop(0, 'rgba(0,0,0,1)'); fall.addColorStop(1, 'rgba(0,0,0,0)');
          o.globalCompositeOperation = 'destination-in'; o.fillStyle = fall; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over';
          q.globalCompositeOperation = 'screen'; q.filter = 'blur(2.5px)'; q.drawImage(st.off, 0, 0); q.filter = 'none'; q.globalCompositeOperation = 'source-over';
          q.restore();
        }
        // grade: vignette and grain over set and him (text stays crisp above)
        var fc = st.fc.g, vg = fc.createRadialGradient(540, 860, 380, 540, 960, 1250);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)');
        fc.fillStyle = vg; fc.fillRect(0, 0, W, H);
        var fr = Math.round(t * FPS), pat = fc.createPattern(grain(), 'repeat');
        fc.save(); fc.translate(Math.floor(hash(fr) * 256), Math.floor(hash(fr + 99) * 256)); fc.fillStyle = pat; fc.fillRect(-256, -256, W + 512, H + 512); fc.restore();
        // type: kicker, headline (behind him), lower third, handle, the button and its cursor
        var s0 = settle(t, 0);
        put(P.kick, 72 + lerp(20, 0, s0.e), 278, s0.o);
        var mw = 0; P.lines.forEach(function (n) { mw = Math.max(mw, n.offsetWidth || 560); });
        P.lines.forEach(function (n, k) {
          var s = settle(t, 1 + k), drift = -4 * t;
          put(n, 1008 - mw + lerp(-36, 0, s.e), cfg.lineTop + k * cfg.lineGap + drift, s.o);
        });
        var sb = settle(t, 4), bw = (P.name.offsetWidth || 440) + 72 + 48;
        P.bar.style.width = bw + 'px';
        put(P.bar, lerp(-bw * 0.3, 0, eout(t / 0.4)) - 8, 1132, Math.min(1, sb.o * 1.5));
        // every text box stays inside the safe area while it settles (x >= 65, y <= 1248): name and handle rise into place
        var sn = settle(t, 5); put(P.name, 72, 1132 + 12 + lerp(14, 0, sn.e), sn.o);
        var sh = settle(t, 6); put(P.hd, 72, 1132 + 70 + 10 - lerp(10, 0, sh.e), sh.o);
        // button: Follow in Instagram blue; on the tap it presses in and flips to Following
        var on = tau >= 0, bx = cfg.btn[0], by = cfg.btn[1], press = on ? 1 - 0.07 * Math.exp(-tau / 0.06) * Math.cos(tau * 30) : 1, sbt = settle(t, 3);
        P.btn.style.background = on ? '#efefef' : IG;
        P.lab.style.color = on ? '#0d0d0d' : '#fff';
        if (P.lab.textContent !== (on ? 'Following' : 'Follow')) P.lab.textContent = on ? 'Following' : 'Follow';
        put(P.btn, bx, by + lerp(30, 0, sbt.e), sbt.o, press);
        // cursor: glides in from the lower right, hovers, taps (dips), then drifts off a little
        var tipX = bx + 252, tipY = by + 74, ce = eout((t - 0.3) / 0.5), cx = lerp(1110, tipX, ce) - 50 * Math.sin(ce * Math.PI), cy = lerp(820, tipY, ce);
        if (tau > 0.18) { var dd = eout((tau - 0.18) / 0.9); cx += 34 * dd; cy += 60 * dd; }
        var cs = tau >= -0.05 && tau < 0.12 ? 1 - 0.14 * Math.sin(clamp((tau + 0.05) / 0.17) * Math.PI) : 1;
        put(P.cur, cx, cy, t < 0.3 ? 0 : clamp((t - 0.3) / 0.08), cs);
        var rp = on ? clamp(tau / 0.35) : 0;
        put(P.rip, tipX, tipY, on ? (1 - rp) * 0.9 : 0, 0.6 + 3.2 * eout(rp));
      }
    };
  });
})();
