/* FxEndGrid: the end card, after the three reference reels. The Claude app's home ("Evening, Yusif"), the keyword
   typed and sent, the orange dot matrix, then every edit of the reel playing at once in a grid, under
   Comment "KEYWORD" and an orange pill. Each tile plays frames of one finished edit (config.tiles: [{ frames: url
   pattern with NNNNN, n, label }]). Built on FxReelKitCore (fx-reel-kit.js). */
(function () {
  var K = window.FxReelKitCore, W = K.W, H = K.H, FPS = K.FPS;
  var clamp = K.clamp, eout = K.eout, expo = K.expo, back = K.back, lerp = K.lerp, el = K.el, esc = K.esc, txt = K.txt;
  var APP = { bg: '#262624', panel: '#30302e', text: '#f2f0ea', muted: '#9b998f', orange: '#d97757' };
  if (!document.getElementById('fxe-style')) {
    var s = document.createElement('style'); s.id = 'fxe-style';
    s.textContent =
      "@font-face{font-family:'InterFx';src:url('/elements/fonts/Inter.ttf') format('truetype');font-weight:100 900}" +
      "@font-face{font-family:'SerifFx';src:url('/elements/fonts/PlayfairDisplay.ttf') format('truetype')}" +
      "@font-face{font-family:'MonoFx';src:url('/elements/fonts/SpaceMono-Bold.ttf') format('truetype')}" +
      '.fxe{position:absolute;left:0;top:0;width:1080px;height:1920px;font-family:InterFx,Arial,sans-serif;color:' + APP.text + '}' +
      '.fxe .a{position:absolute}';
    document.head.appendChild(s);
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function pad(i) { return ('0000' + i).slice(-5); }

  // mode "hook": the reel's first second. No home screen: the grid is there on frame 1 (tiles land 1 frame apart), a
  // headline (hookText) instead of the CTA, then tile zoomTile grows to the full frame from zoomAt to zoomEnd.
  window.FxEndGrid = K.factory(K.defs({
    name: 'Yusif', keyword: 'EFFECTS', pillText: 'for all 7 edits', tiles: [], cols: 4,
    // every time on the frame grid (n/30), so each sound lands on the frame its picture changes
    typeStart: 8 / 30, charDt: 2 / 30, sendAt: 27 / 30, dotsAt: 30 / 30, gridAt: 38 / 30, popDt: 2 / 30, headAt: 51 / 30,
    tile: [228, 405], gap: 18, gridTop: 560,
    mode: 'end', hookText: '1 clip. 7 edits.', hookSub: 'one prompt each', zoomTile: 0, zoomAt: 0.7, zoomEnd: 0.97
  }), function (st, cfg) {
    if (cfg.mode === 'hook') { cfg.gridAt = -0.3; cfg.headAt = 0; cfg.keyword = null; }
    var root, home, greet, input, typed, head, pill, labels = [];
    function build() {
      st.back.innerHTML = ''; st.front.innerHTML = ''; labels = [];
      root = el('div', 'fxe'); st.front.appendChild(root);
      home = el('div', 'a'); home.style.cssText += ';left:0;top:0;width:1080px;height:1920px';
      greet = el('div', 'a'); greet.style.cssText += ';left:0;top:700px;width:1080px;text-align:center';
      greet.innerHTML = '<img src="/elements/fonts/claude-color.svg" style="width:96px;height:96px"><div style="font:400 84px/1.2 SerifFx,Georgia,serif;margin-top:22px">Evening, ' + esc(cfg.name) + '</div>';
      txt(greet.lastChild);
      input = el('div', 'a'); input.style.cssText += ';left:40px;top:1020px;width:1000px;height:150px;border-radius:30px;background:' + APP.panel;
      typed = txt(el('div', 'a')); typed.style.cssText += ';left:34px;top:46px;font-size:50px;font-weight:500;white-space:nowrap';
      input.appendChild(typed);
      home.appendChild(greet); home.appendChild(input); root.appendChild(home);
      head = txt(el('div', 'a')); head.style.cssText += ';left:0;top:300px;width:1080px;text-align:center;font:800 88px/1 InterFx,Arial,sans-serif;letter-spacing:-.02em';
      head.innerHTML = cfg.mode === 'hook' ? esc(cfg.hookText) : 'Comment “' + esc(cfg.keyword) + '”';
      pill = txt(el('div', 'a')); pill.style.cssText += ';left:0;top:428px;width:1080px;text-align:center';
      pill.innerHTML = '<span style="display:inline-block;padding:14px 34px;border-radius:16px;background:' + APP.orange + ';color:#fff;font:700 48px/1 InterFx,Arial,sans-serif">' + esc(cfg.mode === 'hook' ? cfg.hookSub : cfg.pillText) + '</span>';
      if (cfg.mode === 'hook') home.style.display = 'none';
      root.appendChild(head); root.appendChild(pill);
      cfg.tiles.forEach(function (tl, k) {
        // the label sits inside the tile at its top, so the second row's labels stay inside Instagram's safe area
        var lb = txt(el('div', 'a')); lb.style.cssText += ';font:700 24px/1 MonoFx,monospace;color:#fff;white-space:nowrap;padding:7px 9px;border-radius:10px;background:rgba(20,18,16,.72)';
        lb.textContent = tl.label; root.appendChild(lb); labels.push(lb);
      });
    }
    build();
    function rect(k) {
      var c = k % cfg.cols, r = Math.floor(k / cfg.cols), tw = cfg.tile[0], th = cfg.tile[1];
      var gw = cfg.cols * tw + (cfg.cols - 1) * cfg.gap, x0 = (W - gw) / 2;
      return [x0 + c * (tw + cfg.gap), cfg.gridTop + r * (th + cfg.gap), tw, th];
    }
    function tileFrame(k, t) { var tl = cfg.tiles[k]; return tl.frames.replace('NNNNN', pad(Math.floor(Math.max(0, t - cfg.gridAt) * FPS) % tl.n)); }
    function popAt(k) { return cfg.gridAt + cfg.popDt * k; }
    return {
      rebuild: build,
      cues: function () {
        if (cfg.mode === 'hook') return [];   // house rule: no sound effect in the hook
        // each cue names the box its picture event happens in, so the sync check reads that box
        var c = [], word = cfg.keyword.toLowerCase(), fr = function (x) { return Math.round(x * FPS) / FPS; };
        for (var k = 0; k < word.length; k++) c.push({ at: fr(cfg.typeStart + cfg.charDt * k), sfx: 'key-tap-' + (1 + k % 3), box: [40, 1020, 1000, 150] });
        c.push({ at: fr(cfg.sendAt), sfx: 'send', box: [0, 600, 1080, 700] });
        c.push({ at: fr(cfg.dotsAt), sfx: 'loader', box: [0, 1340, 1080, 500] });
        // the tile's middle half only: a neighbour's overshoot reaches into the edges of its box
        for (var q = 0; q < cfg.tiles.length; q += 2) { var rq = rect(q); c.push({ at: fr(popAt(q)), sfx: 'grid-pop', box: [rq[0] + rq[2] / 4, rq[1] + rq[3] / 4, rq[2] / 2, rq[3] / 2] }); }
        c.push({ at: fr(cfg.headAt), sfx: 'cta-hit', box: [0, 280, 1080, 140] });
        return c;
      },
      need: function (t) { return t >= cfg.gridAt ? cfg.tiles.map(function (tl, k) { return tileFrame(k, t); }) : []; },
      faceHidden: function () { return true; },
      draw: function (t) {
        var g = st.pc.g; g.fillStyle = APP.bg; g.fillRect(0, 0, W, H);
        var hook = cfg.mode === 'hook', zp = hook ? expo((t - cfg.zoomAt) / (cfg.zoomEnd - cfg.zoomAt)) : 0;
        // + 1e-6: 4/30 divided by 2/30 is 1.9999... in floating point, which would show each letter a frame late
        var word = hook ? '' : cfg.keyword.toLowerCase(), n = t < cfg.typeStart - 1e-6 ? 0 : Math.min(word.length, Math.floor((t - cfg.typeStart) / cfg.charDt + 1e-6) + 1);
        // the caret holds still while typing (a blink there would read as a keystroke), blinks before and after
        var typing = t >= cfg.typeStart - 0.1 && t < cfg.typeStart + cfg.charDt * word.length + 0.1;
        typed.innerHTML = esc(word.slice(0, n)) + '<span style="display:inline-block;width:4px;height:54px;background:' + APP.orange + ';vertical-align:-10px;margin-left:3px;opacity:' + (typing || Math.floor(t * 4) % 2 === 0 ? 1 : 0.2) + '"></span>';
        var out = eout((t - cfg.sendAt) / 0.2);
        home.style.opacity = t < cfg.sendAt ? 1 : 1 - out;
        home.style.transform = 'translateY(' + (t < cfg.sendAt ? 0 : -60 * out).toFixed(1) + 'px)';
        // the dot matrix between the send and the grid
        var dg = st.bc.g;
        if (!hook && t >= cfg.dotsAt && t < cfg.gridAt + 0.25) {
          var p = clamp((t - cfg.dotsAt) / (cfg.gridAt + 0.25 - cfg.dotsAt)), idx = 0;
          for (var y = 20; y < H; y += 40) for (var x = 20; x < W; x += 40) {
            var h = hash(idx++); if (h < p * 1.2 - 0.2) continue;
            dg.fillStyle = 'rgba(217,119,87,' + (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 16 + h * 40)) * (1 - p)).toFixed(3) + ')';
            dg.beginPath(); dg.arc(x, y, 6 + 4 * h, 0, 6.2832); dg.fill();
          }
        }
        // the grid: every edit at once, each tile popping in with a small overshoot and a soft shadow
        var fg = st.qc.g;
        cfg.tiles.forEach(function (tl, k) {
          // a tile shows on its own pop frame (at 70 % size, a third opaque), so its pop sound lands on a visible change
          var r = rect(k), pk = (t - popAt(k)) / 0.32, lb = labels[k];
          if (pk < -1e-6) { lb.style.opacity = 0; return; }
          var e = back(pk, 1.4), sc = lerp(0.7, 1, e), cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, drift = Math.sin(t * 1.3 + k) * 3;
          var im = K.got(tileFrame(k, t)), alpha = clamp(0.34 + pk * 3);
          if (hook && zp > 0) {
            // the hook's exit: the picked tile grows to the whole frame, the others fall back and fade
            if (k === cfg.zoomTile) { sc = lerp(1, W / r[2], zp); cx = lerp(cx, W / 2, zp); cy = lerp(cy, H / 2, zp); drift *= 1 - zp; }
            else { sc *= lerp(1, 0.85, zp); alpha *= 1 - zp; }
          }
          fg.save(); fg.globalAlpha = alpha; fg.translate(cx, cy + drift); fg.scale(sc, sc);
          fg.shadowColor = 'rgba(0,0,0,.55)'; fg.shadowBlur = 30; fg.shadowOffsetY = 12;
          var rad = k === cfg.zoomTile ? 22 * (1 - zp) : 22;
          fg.beginPath(); if (fg.roundRect) fg.roundRect(-r[2] / 2, -r[3] / 2, r[2], r[3], rad); else fg.rect(-r[2] / 2, -r[3] / 2, r[2], r[3]);
          fg.fillStyle = '#111'; fg.fill(); fg.shadowColor = 'transparent'; fg.clip();
          if (im) fg.drawImage(im, -r[2] / 2, -r[3] / 2, r[2], r[3]);
          fg.restore();
          lb.style.opacity = zp > 0 ? 0 : clamp(pk * 3); lb.style.left = (r[0] + 8) + 'px'; lb.style.top = (r[1] + 8 + drift) + 'px';
          lb.style.transform = 'scale(' + lerp(0.7, 1, e).toFixed(3) + ')'; lb.style.transformOrigin = '0 0';
        });
        var hp = (t - cfg.headAt) / 0.3;
        // the hook's headline is set and moving on frame 1 (a slow push), never a still title card
        var push = hook ? lerp(1.0, 1.05, t / 1.0) : 1;
        head.style.opacity = hp < 0 ? 0 : clamp(1 - 2 * zp); head.style.transform = 'scale(' + ((hp < 0 ? 1 : lerp(1.06, 1, eout(hp))) * push).toFixed(4) + ')';
        var pp = hook ? (t + 0.2) / 0.3 : (t - cfg.headAt - 0.12) / 0.3;
        pill.style.opacity = pp <= 0 ? 0 : clamp(1 - 2 * zp); pill.style.transform = 'translateY(' + (pp <= 0 ? 0 : lerp(30, 0, eout(pp))).toFixed(1) + 'px)';
      }
    };
  });
})();
