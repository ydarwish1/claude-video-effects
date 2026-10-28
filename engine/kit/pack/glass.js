/* Glass lane of the fx reel (load fx-reel-kit.js first; same element contract).
   FxGlassWidgets (glass-widgets): frosted glass phone widgets float around his head (backdrop blur over the plate, a
   1 px light edge, a specular top, soft shadows on the wall), tucked behind him where they meet his head; they breathe
   and follow his head a little (parallax by depth). Signature: the render bar completes and the 30 fps ring closes with
   a check, a light sheen runs across the glass ("glass-tick"). An "Edited by Claude" pill sits in front, under his chin.
   FxNeonWord (neon-word): the room drops into a dark warm grade with him spotlit; a neon ULTRATHINK on the wall behind
   his head flickers on (on, off one frame, on: "neon-on"), its light spills on the wall and rims his edge in pink. */
(function () {
  var K = window.FxReelKitCore;
  if (!K) return;
  var W = K.W, H = K.H, FPS = K.FPS, clamp = K.clamp, eout = K.eout, lerp = K.lerp, spring = K.spring, el = K.el, esc = K.esc, txt = K.txt;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC.replace(/elements\/pack\/[^\/]*$/, '');
  var FONTS = ROOT + 'elements/fonts/', MARK = FONTS + 'claude-color.svg', TAU = Math.PI * 2;
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function sstep(p) { p = clamp(p); return p * p * (3 - 2 * p); }

  if (!window.__fxGlassFonts && window.FontFace) {
    window.__fxGlassFonts = 1;
    [['FxgInter', 'Inter.ttf', { weight: '100 900' }], ['FxgSerif', 'InstrumentSerif-Italic.ttf', {}]].forEach(function (f) {
      try { var ff = new FontFace(f[0], 'url(' + FONTS + f[1] + ')', f[2]); document.fonts.add(ff); ff.load().catch(function () {}); } catch (e) {}
    });
  }
  if (!document.getElementById('fxg-style')) {
    var s = document.createElement('style'); s.id = 'fxg-style';
    s.textContent =
      '.fxg-t{position:absolute;left:0;top:0;overflow:hidden;color:#fff;font-family:FxgInter,Inter,system-ui,sans-serif;transform-origin:50% 50%;' +
      'background:linear-gradient(165deg,rgba(255,255,255,.30) 0%,rgba(255,255,255,.12) 45%,rgba(255,255,255,.07) 100%);' +
      '-webkit-backdrop-filter:blur(30px) saturate(1.4) brightness(.82);backdrop-filter:blur(30px) saturate(1.4) brightness(.82);' +
      'box-shadow:0 36px 64px -20px rgba(52,34,6,.5),0 10px 24px -8px rgba(52,34,6,.28),inset 0 1.5px 0 rgba(255,255,255,.85),inset 0 0 0 1px rgba(255,255,255,.34),inset 0 -1px 0 rgba(255,255,255,.12)}' +
      '.fxg-sp{position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;background:radial-gradient(120% 70% at 16% -10%,rgba(255,255,255,.34),rgba(255,255,255,0) 60%),linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 36%)}' +
      '.fxg-sh{position:absolute;top:-40%;left:0;width:150px;height:180%;pointer-events:none;opacity:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.45) 50%,rgba(255,255,255,0))}' +
      '.fxg-x{position:absolute;white-space:nowrap;line-height:1;text-shadow:0 1px 2px rgba(40,24,0,.22),0 2px 16px rgba(40,24,0,.18);font-variant-numeric:tabular-nums}' +
      '.fxg-pill{position:absolute;left:0;top:0;height:92px;border-radius:46px;display:flex;align-items:center;gap:16px;padding:0 36px 0 22px;color:#fff;' +
      'font:500 44px/1 FxgInter,Inter,system-ui,sans-serif;white-space:nowrap;background:linear-gradient(180deg,rgba(46,38,32,.40),rgba(22,18,16,.52));' +
      '-webkit-backdrop-filter:blur(24px) saturate(1.5);backdrop-filter:blur(24px) saturate(1.5);' +
      'box-shadow:0 22px 44px -12px rgba(0,0,0,.5),inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 0 0 1px rgba(255,255,255,.24)}' +
      '.fxg-pill b{font-weight:700;color:#ffa17e}' +
      '.fxn{position:absolute;left:0;top:0;font-family:FxgSerif,"Instrument Serif",serif;font-weight:400;line-height:1;white-space:nowrap}' +
      '.fxn-off{color:rgba(58,26,34,.62);-webkit-text-stroke:2px rgba(255,214,224,.16);text-shadow:0 4px 6px rgba(0,0,0,.6)}' +
      '.fxn-on{color:#fff6f8;-webkit-text-stroke:3px #ff4f86;text-shadow:0 0 2px rgba(255,255,255,.95),0 0 9px rgba(255,80,130,1),0 0 22px rgba(255,46,108,.9),0 0 46px rgba(255,30,95,.7)}';
    document.head.appendChild(s);
  }

  /* ===== Glass Widgets ===== */
  window.FxGlassWidgets = K.factory(K.defs({
    at: 0.6, reels: '', avatar: 'reel1-6.jpg', crop: [266, 300, 330], covers: ['reel4-1.5.jpg', 'reel6-1.5.jpg', 'reel8-1.5.jpg'],
    big: '7', bigLines: ['edits', 'one clip'], name: 'Yusif Darwish', handle: '@yusifdarw', stat: '10', statLabel: 'posts',
    render: '1080p', ring: '30', ringLabel: 'fps', reelsLabel: 'Latest reels', pillHtml: 'Edited by <b>Claude</b>'
  }), function (st, cfg) {
    var tiles, pill, mark, fill, pct, title, dot, a1, a2, badge, chk, covers, C = 2 * Math.PI * 60, TW = 576;
    function base() { return cfg.reels || String(cfg.media || '').replace(/frames\/?$/, 'media/reels/'); }
    function imgs() { var b = base(); return cfg.covers.map(function (c) { return b + c; }).concat([b + cfg.avatar, MARK]); }
    function tile(x, y, w, h, r, d, ph, t0, tick) {
      var n = el('div', 'fxg-t'); n.style.width = w + 'px'; n.style.height = h + 'px'; n.style.borderRadius = r + 'px';
      n.appendChild(el('div', 'fxg-sp')); var sh = el('div', 'fxg-sh'); n.appendChild(sh);
      st.back.appendChild(n);
      var T = { n: n, sh: sh, x: x, y: y, w: w, h: h, d: d, ph: ph, t0: t0, tick: tick }; tiles.push(T); return T;
    }
    function tx(parent, html, css) { var e = txt(el('div', 'fxg-x', html)); e.style.cssText += ';' + css; parent.appendChild(e); return e; }
    function img(parent, src, css) { var e = document.createElement('img'); e.src = src; e.style.cssText = 'position:absolute;display:block;' + css; parent.appendChild(e); return e; }
    function build() {
      st.back.innerHTML = ''; st.front.innerHTML = ''; tiles = [];
      var b = base();
      // 1. the big number: 7 edits, one clip
      var A = tile(65, 301, 300, 282, 46, 0.10, 0.00, -0.04);
      tx(A.n, esc(cfg.big), 'left:22px;top:0;font-size:176px;font-weight:700;letter-spacing:-.05em');
      img(A.n, MARK, 'right:26px;top:26px;width:46px;height:46px');
      tx(A.n, esc(cfg.bigLines[0]), 'left:28px;top:168px;font-size:44px;font-weight:600');
      tx(A.n, esc(cfg.bigLines[1]), 'left:28px;top:220px;font-size:44px;font-weight:600;opacity:.82');
      // 2. profile
      var P = tile(387, 293, 628, 120, 38, 0.14, 0.31, -0.02);
      var av = el('div'); av.style.cssText = 'position:absolute;left:18px;top:16px;width:88px;height:88px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.75),0 6px 14px rgba(40,24,0,.3)';
      var k = 88 / cfg.crop[2];
      img(av, b + cfg.avatar, 'left:' + (44 - cfg.crop[0] * k).toFixed(1) + 'px;top:' + (44 - cfg.crop[1] * k).toFixed(1) + 'px;width:' + (540 * k).toFixed(1) + 'px;height:' + (960 * k).toFixed(1) + 'px');
      P.n.appendChild(av);
      tx(P.n, esc(cfg.name), 'left:126px;top:18px;font-size:44px;font-weight:700;letter-spacing:-.01em');
      tx(P.n, esc(cfg.handle), 'left:127px;top:70px;font-size:32px;font-weight:500;opacity:.85');
      tx(P.n, esc(cfg.stat), 'right:26px;top:18px;font-size:44px;font-weight:700');
      tx(P.n, esc(cfg.statLabel), 'right:26px;top:70px;font-size:30px;font-weight:500;opacity:.85');
      // 3. render bar
      var R = tile(387, 435, 628, 148, 38, 0.08, 0.57, 0.00, true);
      dot = el('div'); dot.style.cssText = 'position:absolute;left:26px;top:35px;width:24px;height:24px;border-radius:12px';
      R.n.appendChild(dot);
      title = tx(R.n, 'Rendering ' + esc(cfg.render), 'left:64px;top:28px;font-size:38px;font-weight:600');
      pct = tx(R.n, '62%', 'right:26px;top:29px;font-size:36px;font-weight:600;opacity:.9');
      var track = el('div'); track.style.cssText = 'position:absolute;left:26px;top:92px;width:' + TW + 'px;height:14px;border-radius:7px;background:rgba(255,255,255,.24);box-shadow:inset 0 1px 2px rgba(40,24,0,.25);overflow:hidden';
      fill = el('div'); fill.style.cssText = 'position:absolute;left:0;top:0;height:14px;border-radius:7px;background:#fff;overflow:hidden';
      track.appendChild(fill); R.n.appendChild(track);
      // 4. 30 fps ring
      var G = tile(780, 597, 235, 236, 44, 0.12, 0.83, 0.03, true);
      var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('width', 140); sv.setAttribute('height', 140); sv.setAttribute('viewBox', '0 0 140 140');
      sv.style.cssText = 'position:absolute;left:54px;top:22px;overflow:visible';
      sv.innerHTML = '<circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="13"/>' +
        '<circle cx="70" cy="70" r="60" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" transform="rotate(-90 70 70)"/>' +
        '<circle cx="70" cy="70" r="60" fill="none" stroke="#34d65c" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" transform="rotate(-90 70 70)" opacity="0"/>';
      a1 = sv.childNodes[1]; a2 = sv.childNodes[2];
      G.n.appendChild(sv);
      tx(G.n, esc(cfg.ring), 'left:54px;top:22px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;font-size:54px;font-weight:700;letter-spacing:-.03em');
      tx(G.n, esc(cfg.ringLabel), 'left:54px;top:178px;width:140px;text-align:center;font-size:32px;font-weight:600;opacity:.9');
      badge = el('div'); badge.style.cssText = 'position:absolute;left:148px;top:116px;width:54px;height:54px;border-radius:27px;background:#34d65c;box-shadow:0 0 0 3px rgba(255,255,255,.9),0 8px 18px rgba(20,90,40,.45)';
      badge.innerHTML = '<svg width="54" height="54" viewBox="0 0 54 54" style="position:absolute;left:0;top:0"><path d="M15 28 L23.5 36 L39 19" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="40"/></svg>';
      chk = badge.firstChild.firstChild; G.n.appendChild(badge);
      // 5. latest reels: three of his real covers, fanned
      var E = tile(65, 597, 300, 344, 44, 0.06, 0.45, 0.05);
      tx(E.n, esc(cfg.reelsLabel), 'left:26px;top:24px;font-size:32px;font-weight:600');
      covers = cfg.covers.map(function (c) {
        return img(E.n, b + c, 'left:0;top:0;width:116px;height:206px;object-fit:cover;border-radius:15px;transform-origin:50% 90%;box-shadow:0 0 0 1.5px rgba(255,255,255,.55),0 12px 22px rgba(30,18,0,.38)');
      });
      E.n.insertBefore(covers[1], null);   // the middle cover on top
      // 6. Edited by Claude, in front, under his chin
      pill = el('div', 'fxg-pill');
      mark = img(pill, MARK, 'position:relative;width:52px;height:52px');
      pill.appendChild(txt(el('span', '', cfg.pillHtml)));
      st.front.appendChild(pill);
    }
    build();
    // his face, averaged over 5 frames, so the parallax does not shiver
    function sface(i) {
      var x = 0, y = 0;
      for (var d = -2; d <= 2; d++) { var f = st.face(i + d); x += f.nx; y += f.ny; }
      return { nx: x / 5, ny: y / 5 };
    }
    return {
      rebuild: build,
      cues: function () { return [{ at: cfg.at, sfx: 'glass-tick' }]; },
      need: function (t) { return st.urls(t, [], imgs()); },
      draw: function (t) {
        var i = st.i(t), g = st.pc.g;
        // a light grade so white glass reads on the yellow wall: a touch darker, warmer, vignetted
        g.filter = 'brightness(.95) contrast(1.06) saturate(1.08)'; st.plate(i); g.filter = 'none';
        var vg = g.createRadialGradient(540, 860, 260, 540, 900, 1300);
        vg.addColorStop(0, 'rgba(36,22,4,0)'); vg.addColorStop(1, 'rgba(36,22,4,.42)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        st.drawPerson(i);
        var f = sface(i), r0 = sface(cfg.frame0), pdx = f.nx - r0.nx, pdy = f.ny - r0.ny;
        var at = cfg.at, done = t >= at, tk = t - at;
        tiles.forEach(function (T, k) {
          var tau = t - T.t0, sp = spring(tau, 2.4, 0.52);
          var bump = T.tick && done ? 0.035 * spring(tk, 3.4, 0.4) : 0;
          var sc = 1 - 0.08 * sp + 0.005 * Math.sin(TAU * (0.5 * t + T.ph)) + bump;
          var x = T.x + 3 * Math.sin(TAU * (0.27 * t + T.ph * 1.7)) + pdx * T.d;
          var y = T.y + 40 * sp + 6 * Math.sin(TAU * (0.4 * t + T.ph)) + pdy * T.d * 0.7;
          var ry = 2.4 * Math.sin(TAU * (0.21 * t + T.ph)) + pdx * 0.03, rx = 1.8 * Math.sin(TAU * (0.17 * t + T.ph + 0.25));
          T.n.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) perspective(1400px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
          T.n.style.opacity = clamp(tau / 0.07).toFixed(3);
          // the sheen: a band of light runs across every pane, left to right, from the tick
          var q = (tk - 0.035 * k) / 0.5;
          if (q > 0 && q < 1) { T.sh.style.opacity = Math.sin(Math.PI * q).toFixed(3); T.sh.style.transform = 'translateX(' + lerp(-200, T.w + 60, sstep(q)).toFixed(1) + 'px) rotate(16deg)'; }
          else T.sh.style.opacity = 0;
        });
        // render bar and ring run up together and both land on the tick frame
        var pe = Math.pow(clamp(t / at), 1.35), p = lerp(0.62, 1, pe), fl = done ? Math.exp(-tk / 0.18) : 0;
        fill.style.width = (p * TW).toFixed(1) + 'px';
        fill.style.boxShadow = '0 0 ' + (8 + 24 * fl).toFixed(1) + 'px rgba(255,255,255,' + (0.45 + 0.5 * fl).toFixed(2) + ')';
        pct.textContent = Math.round(p * 100) + '%';
        title.textContent = (done ? 'Rendered ' : 'Rendering ') + cfg.render;
        dot.style.background = done ? '#34d65c' : '#ff453a';
        dot.style.boxShadow = done ? '0 0 ' + (10 + 16 * fl).toFixed(1) + 'px rgba(52,214,92,.9)' : '0 0 10px rgba(255,69,58,.85)';
        var rp = lerp(0.55, 1, pe);
        a1.setAttribute('stroke-dashoffset', (C * (1 - rp)).toFixed(2)); a2.setAttribute('stroke-dashoffset', '0');
        a2.setAttribute('opacity', done ? clamp(0.5 + tk / 0.07).toFixed(3) : '0');
        var bs = done ? 1 - 0.45 * spring(tk, 3.0, 0.42) : 0;
        badge.style.transform = 'scale(' + bs.toFixed(4) + ')'; badge.style.opacity = done ? 1 : 0;
        chk.setAttribute('stroke-dashoffset', (40 * (1 - clamp(0.3 + tk / 0.14))).toFixed(2));
        // the fan of covers breathes a little
        covers.forEach(function (cv, j) {
          var side = j - 1, br = Math.sin(TAU * (0.35 * t + j * 0.2));
          var cx = 150 + side * 60, rot = side * (7 + 1.2 * br), lift = side === 0 ? -10 : 0;
          cv.style.transform = 'translate(' + (cx - 58).toFixed(1) + 'px,' + (92 + lift + Math.abs(side) * 12 + 2 * br).toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
        });
        // the pill rises in and the Claude mark turns while it works, then rests on the tick
        var pt = t + 0.02, ps = spring(pt, 2.4, 0.55), pw = pill.offsetWidth || 520;
        pill.style.transform = 'translate(' + (540 - pw / 2).toFixed(1) + 'px,' + (1146 + 20 * ps + 3 * Math.sin(TAU * 0.45 * t)).toFixed(1) + 'px) scale(' + (1 - 0.06 * ps).toFixed(4) + ')';
        pill.style.opacity = clamp(pt / 0.07).toFixed(3);
        mark.style.transform = 'rotate(' + (150 * eout(clamp(t / at)) + (done ? 12 * Math.sin(TAU * 0.3 * tk) * clamp(tk / 0.3) : 0)).toFixed(2) + 'deg)';
      }
    };
  });

  /* ===== Neon Word ===== */
  window.FxNeonWord = K.factory(K.defs({ at: 0.45, word: 'ULTRATHINK', width: 920, base: 588 }), function (st, cfg) {
    var wrap, off, on, grain = null, mc = null;
    function build() {
      st.back.innerHTML = '';
      wrap = el('div', 'ab');
      off = txt(el('div', 'fxn fxn-off', esc(cfg.word)));
      on = el('div', 'fxn fxn-on', esc(cfg.word));
      wrap.appendChild(off); wrap.appendChild(on); st.back.appendChild(wrap);
    }
    build();
    function f0() { return Math.ceil(cfg.at * FPS - 1e-6); }
    // the tube's light: dark before the switch, on, off for one frame, on with a small surge, then a living hum
    function level(fr, t) {
      var d = fr - f0();
      if (d < 0) return 0;
      if (d === 0) return 0.9;
      if (d === 1) return 0.04;
      if (d === 2) return 1.18;
      if (d === 3) return 1.07;
      var hum = 1 + 0.02 * Math.sin(TAU * 6.3 * t) + 0.012 * Math.sin(TAU * 11.7 * t + 1.3);
      if (d === 30 || d === 31) hum *= 0.84;
      return hum;
    }
    // the word's size and box: fitted to cfg.width, its baseline on cfg.base
    function metrics() {
      off.style.fontSize = '100px';
      var w100 = off.offsetWidth || 560, size = 100 * cfg.width / w100;
      if (!mc) mc = document.createElement('canvas').getContext('2d');
      mc.font = size.toFixed(2) + 'px FxgSerif';
      var m = mc.measureText(cfg.word), asc = m.fontBoundingBoxAscent || size * 0.9, des = m.fontBoundingBoxDescent || size * 0.25;
      var lead = (size - asc - des) / 2, left = 540 - (w100 * size / 100) / 2;
      return { size: size, left: left, top: cfg.base - lead - asc, cap: m.actualBoundingBoxAscent || size * 0.7 };
    }
    function grainTile() {
      if (grain) return grain;
      grain = document.createElement('canvas'); grain.width = grain.height = 256;
      var gg = grain.getContext('2d'), im = gg.createImageData(256, 256), d = im.data;
      for (var p = 0; p < 65536; p++) { var h = hash(p * 0.731 + 17), v = h > 0.5 ? 255 : 0; d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = v; d[p * 4 + 3] = Math.abs(h - 0.5) * 2 * 34; }
      gg.putImageData(im, 0, 0);
      return grain;
    }
    return {
      rebuild: build,
      cues: function () { return [{ at: f0() / FPS, sfx: 'neon-on' }]; },
      draw: function (t) {
        var i = st.i(t), f = st.face(i), g = st.pc.g, fr = Math.round(t * FPS), k = level(fr, t), M = metrics();
        var lx = 540, ly = cfg.base - M.cap * 0.5;
        // a slow push in, the only camera move
        st.cam.style.transformOrigin = '540px 880px';
        st.cam.style.transform = 'scale(' + (1 + 0.022 * sstep(t / 2.3)).toFixed(5) + ')';
        // the room, graded dark and warm, vignetted
        st.plate(i);
        g.save(); g.globalCompositeOperation = 'multiply';
        g.fillStyle = 'rgb(84,60,52)'; g.fillRect(0, 0, W, H);
        var vg = g.createRadialGradient(540, 900, 200, 540, 900, 1250);
        vg.addColorStop(0, 'rgb(255,255,255)'); vg.addColorStop(1, 'rgb(64,56,56)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        g.restore();
        g.save(); g.globalCompositeOperation = 'screen';
        var pool = g.createRadialGradient(540, 820, 60, 540, 820, 640);
        pool.addColorStop(0, 'rgba(255,150,90,.12)'); pool.addColorStop(1, 'rgba(255,150,90,0)');
        g.fillStyle = pool; g.fillRect(0, 0, W, H);
        g.restore();
        // the tube's light on the wall: a wide pink spill and the word's own bloom (behind him, so he hides it)
        if (k > 0) {
          g.save(); g.globalCompositeOperation = 'screen';
          g.translate(lx, ly); g.scale(1.35, 0.85);
          var sp = g.createRadialGradient(0, 0, 30, 0, 0, 640);
          sp.addColorStop(0, 'rgba(255,60,120,' + (0.5 * Math.min(1.2, k)).toFixed(3) + ')');
          sp.addColorStop(0.45, 'rgba(255,40,100,' + (0.2 * Math.min(1.2, k)).toFixed(3) + ')');
          sp.addColorStop(1, 'rgba(255,40,100,0)');
          g.fillStyle = sp; g.fillRect(-800, -800, 1600, 1600);
          g.restore();
          g.save(); g.globalCompositeOperation = 'lighter'; g.font = M.size.toFixed(2) + 'px FxgSerif'; g.textBaseline = 'alphabetic';
          g.filter = 'blur(64px)'; g.fillStyle = 'rgba(255,40,100,' + (0.75 * Math.min(1.2, k)).toFixed(3) + ')'; g.fillText(cfg.word, M.left, cfg.base);
          g.filter = 'blur(26px)'; g.fillStyle = 'rgba(255,70,130,' + (0.6 * Math.min(1.2, k)).toFixed(3) + ')'; g.fillText(cfg.word, M.left, cfg.base);
          g.restore();
        }
        // the tube itself: unlit glass always, the lit word over it
        [off, on].forEach(function (n) { n.style.fontSize = M.size.toFixed(2) + 'px'; });
        wrap.style.transform = 'translate(' + M.left.toFixed(1) + 'px,' + M.top.toFixed(1) + 'px)';
        on.style.opacity = clamp(k).toFixed(3);
        on.style.filter = k > 1 ? 'brightness(' + k.toFixed(3) + ')' : 'none';
        // him: a touch brighter than the room, falling off from his face into the dark
        var q = st.qc.g;
        q.filter = 'brightness(1.03) contrast(1.06) saturate(1.04)'; var im = st.drawPerson(i); q.filter = 'none';
        if (!im) return;
        q.save(); q.globalCompositeOperation = 'source-atop';
        var fo = q.createRadialGradient(f.nx, f.ny + 40, 200, f.nx, f.ny + 260, 1150);
        fo.addColorStop(0, 'rgba(12,7,5,0)'); fo.addColorStop(0.5, 'rgba(12,7,5,.34)'); fo.addColorStop(1, 'rgba(12,7,5,.72)');
        q.fillStyle = fo; q.fillRect(0, 0, W, H); q.restore();
        if (k > 0) {
          var kk = Math.min(1.2, k), o = st.off.g, o2 = st.off2.g;
          // a pink wash from above on his hair and shoulders
          o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.clearRect(0, 0, W, H);
          var wa = o.createRadialGradient(lx, ly, 60, lx, ly, 420);
          wa.addColorStop(0, 'rgba(255,70,130,.45)'); wa.addColorStop(1, 'rgba(255,70,130,0)');
          o.fillStyle = wa; o.fillRect(0, 0, W, H);
          o.globalCompositeOperation = 'destination-in'; o.drawImage(im, 0, 0, W, H); o.globalCompositeOperation = 'source-over';
          q.save(); q.globalCompositeOperation = 'screen'; q.globalAlpha = clamp(0.8 * kk); q.drawImage(st.off, 0, 0); q.restore();
          // the rim: his edges that face up and out (his shape minus where two copies pushed down-left and down-right overlap)
          o.clearRect(0, 0, W, H); o.drawImage(im, -5, 14, W, H);
          o.globalCompositeOperation = 'destination-in'; o.drawImage(im, 5, 14, W, H); o.globalCompositeOperation = 'source-over';
          o2.setTransform(1, 0, 0, 1, 0, 0); o2.globalCompositeOperation = 'source-over'; o2.filter = 'none'; o2.clearRect(0, 0, W, H);
          o2.drawImage(im, 0, 0, W, H);
          o2.globalCompositeOperation = 'destination-out'; o2.drawImage(st.off, 0, 0);
          o2.globalCompositeOperation = 'source-in';
          var rg = o2.createRadialGradient(lx, ly, 80, lx, ly, 1050);
          rg.addColorStop(0, 'rgba(255,175,205,1)'); rg.addColorStop(0.3, 'rgba(255,110,160,.75)'); rg.addColorStop(0.62, 'rgba(255,80,130,.12)'); rg.addColorStop(1, 'rgba(255,80,130,0)');
          o2.fillStyle = rg; o2.fillRect(0, 0, W, H); o2.globalCompositeOperation = 'source-over';
          q.save(); q.globalCompositeOperation = 'screen';
          q.filter = 'blur(2px)'; q.globalAlpha = clamp(0.95 * kk); q.drawImage(st.off2, 0, 0);
          q.filter = 'blur(10px)'; q.globalAlpha = clamp(0.45 * kk); q.drawImage(st.off2, 0, 0);
          q.restore();
        }
        // film grain, moving every frame (from the frame number: no randomness)
        var gr = grainTile(), fc = st.fc.g, ox = Math.floor(hash(fr + 3.1) * 256), oy = Math.floor(hash(fr + 9.7) * 256);
        fc.save(); fc.translate(-ox, -oy); fc.fillStyle = fc.createPattern(gr, 'repeat'); fc.globalAlpha = 0.35; fc.fillRect(ox, oy, W, H); fc.restore();
      }
    };
  });
})();
