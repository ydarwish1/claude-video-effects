/* FxAppShell: the frame of the reel, after the three reference reels. A Claude phone app (Code tab, dark) types a
   slash command with an autocomplete line and the clip attached, sends it, shows "Editing with <name>..." and a card
   where an orange dot matrix dissolves into the finished effect, then the card zooms to full screen and the effect
   plays. The effect is any fx element (config.inner = { global, config }); it runs on the same clock from cardAt.
   Built on FxReelKitCore (fx-reel-kit.js). */
(function () {
  var K = window.FxReelKitCore, W = K.W, H = K.H, FPS = K.FPS;
  var clamp = K.clamp, eout = K.eout, expo = K.expo, lerp = K.lerp, el = K.el, esc = K.esc, txt = K.txt;
  var APP = { bg: '#262624', panel: '#30302e', key: '#4a4a47', keyDark: '#383835', text: '#f2f0ea', muted: '#9b998f', orange: '#d97757', pill: '#3d2a22' };
  if (!document.getElementById('fxs-style')) {
    var s = document.createElement('style'); s.id = 'fxs-style';
    s.textContent =
      "@font-face{font-family:'InterFx';src:url('/elements/fonts/Inter.ttf') format('truetype');font-weight:100 900}" +
      '.fxs{position:absolute;left:0;top:0;width:1080px;height:1920px;font-family:InterFx,Arial,sans-serif;color:' + APP.text + '}' +
      '.fxs .a{position:absolute}' +
      '.fxs .seg{left:330px;top:92px;width:420px;height:84px;border-radius:42px;background:#1d1d1b;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:600;font-size:34px;color:' + APP.muted + '}' +
      '.fxs .seg span{padding:10px 30px;border-radius:32px}.fxs .seg .on{background:#3c3c39;color:' + APP.text + '}' +
      '.fxs .ic{width:84px;height:84px;border-radius:42px;background:#1d1d1b;display:flex;align-items:center;justify-content:center}' +
      '.fxs .card{border-radius:30px;background:' + APP.panel + '}' +
      '.fxs .kb{left:0;width:1080px;background:#1c1c1a}' +
      '.fxs .k{position:absolute;height:104px;border-radius:14px;background:' + APP.key + ';color:#fff;font-size:44px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 0 #111}' +
      '.fxs .k.d{background:' + APP.keyDark + ';font-size:34px}' +
      '.fxs .pop{position:absolute;width:118px;height:190px;border-radius:22px;background:#5c5c58;color:#fff;font-size:66px;display:flex;align-items:flex-start;justify-content:center;padding-top:22px;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.45)}' +
      '.fxs .cmd{color:' + APP.orange + '}.fxs .caret{display:inline-block;width:4px;height:52px;background:' + APP.orange + ';vertical-align:-10px;margin-left:3px}';
    document.head.appendChild(s);
  }
  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function keyRect(ch) {
    for (var r = 0; r < 3; r++) {
      var i = ROWS[r].indexOf(ch); if (i < 0) continue;
      var n = ROWS[r].length, kw = 92, gap = 14, rowW = n * kw + (n - 1) * gap, x0 = (W - rowW) / 2;
      return { x: x0 + i * (kw + gap), y: 1460 + r * 124, w: kw };
    }
    if (ch === '/') return { x: 838, y: 1832, w: 170 };
    if (ch === '-') return { x: 838, y: 1832, w: 170 };
    if (ch === ' ') return { x: 330, y: 1832, w: 490 };
    return null;
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  window.FxAppShell = K.factory(K.defs({
    inner: null, command: '/glass-widgets', desc: 'frosted glass widgets around your head', name: '',
    // three keys typed, then the autocomplete line is tapped and fills the command (the way people really type it)
    // every time sits on a frame (n/30): the effect inside starts at cardAt, so an off-grid cardAt shifts its events
    typeStart: 2 / 30, typeChars: 3, charDt: 3 / 30, pickAt: 12 / 30, sendAt: 17 / 30, cardAt: 20 / 30, dotsOut: [22 / 30, 30 / 30],
    zoomAt: 30 / 30, zoomEnd: 40 / 30, card: [64, 604, 520, 924]
  }), function (st, cfg) {
    var root, top, compose, typed, auto, kb, pop, sent, editing, star, thumb, thumb2, host, dots, inner = null;
    function build() {
      st.back.innerHTML = ''; st.front.innerHTML = '';
      root = el('div', 'fxs'); st.back.appendChild(root);
      top = el('div', 'a'); top.innerHTML =
        '<div class="a ic" style="left:56px;top:92px"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#d6d4cc" stroke-width="2.2" stroke-linecap="round"><path d="M5 8h14M5 16h10"/></svg></div>' +
        '<div class="a seg"><span>Chat</span><span class="on">Code</span></div>' +
        '<div class="a ic" style="left:940px;top:92px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d6d4cc" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></div>';
      root.appendChild(top);
      // the compose view: autocomplete line, the input card with the clip attached, the action row, the keyboard
      compose = el('div', 'a'); compose.style.cssText += ';left:0;top:0;width:1080px;height:1920px';
      auto = el('div', 'a card'); auto.style.cssText += ';left:40px;top:880px;width:1000px;height:124px;padding:22px 34px;box-sizing:border-box';
      auto.innerHTML = '<div style="font-size:40px;font-weight:700">' + esc(cfg.name || cfg.command.replace(/^\//, '')) + '</div><div style="font-size:30px;color:' + APP.muted + ';margin-top:4px">' + esc(cfg.desc) + '</div>';
      txt(auto.firstChild);
      var input = el('div', 'a card'); input.style.cssText += ';left:40px;top:1024px;width:1000px;height:286px';
      thumb = el('img', 'a'); thumb.style.cssText += ';left:30px;top:26px;width:84px;height:112px;object-fit:cover;border-radius:14px';
      var x = el('div', 'a'); x.style.cssText += ';left:96px;top:16px;width:34px;height:34px;border-radius:17px;background:#e9e7e0;color:#222;font-size:24px;display:flex;align-items:center;justify-content:center;font-weight:700'; x.textContent = '×';
      typed = txt(el('div', 'a')); typed.style.cssText += ';left:30px;top:158px;font-size:48px;font-weight:500;white-space:nowrap';
      var row = el('div', 'a'); row.style.cssText += ';left:30px;top:226px;width:940px;height:50px';
      row.innerHTML = '<span class="a" style="left:0;top:0;font-size:46px;color:' + APP.muted + '">+</span><span class="a" style="left:66px;top:6px;font-size:34px;color:' + APP.muted + '">≡</span>' +
        '<span class="a" style="left:800px;top:4px;font-size:34px;color:' + APP.muted + '">●</span>';
      var send = el('div', 'a'); send.style.cssText += ';left:874px;top:206px;width:72px;height:72px;border-radius:36px;background:' + APP.orange + ';display:flex;align-items:center;justify-content:center';
      send.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      [thumb, x, typed, row, send].forEach(function (n) { input.appendChild(n); });
      kb = el('div', 'a kb'); kb.style.cssText += ';top:1410px;height:510px';
      var keys = '';
      ROWS.forEach(function (r, ri) { for (var i = 0; i < r.length; i++) { var k = keyRect(r[i]); keys += '<div class="k" style="left:' + k.x + 'px;top:' + (k.y - 1410) + 'px;width:' + k.w + 'px">' + r[i] + '</div>'; } });
      keys += '<div class="k d" style="left:40px;top:298px;width:118px">⇧</div><div class="k d" style="left:922px;top:298px;width:118px">⌫</div>' +
        '<div class="k d" style="left:40px;top:422px;width:270px">123</div><div class="k" style="left:330px;top:422px;width:490px;font-size:34px">space</div><div class="k d" style="left:838px;top:422px;width:202px">/</div>';
      kb.innerHTML = keys;
      pop = el('div', 'pop'); pop.style.display = 'none';
      [auto, input, kb, pop].forEach(function (n) { compose.appendChild(n); });
      root.appendChild(compose);
      // the sent view: the clip, the command pill, the "Editing with" line
      sent = el('div', 'a'); sent.style.cssText += ';left:0;top:0;width:1080px;height:1920px';
      thumb2 = el('img', 'a'); thumb2.style.cssText += ';left:880px;top:236px;width:150px;height:200px;object-fit:cover;border-radius:18px';
      var pill = txt(el('div', 'a cmd')); pill.style.cssText += ';right:72px;top:452px;padding:14px 26px;border-radius:24px;background:' + APP.pill + ';font-size:40px;font-weight:500;white-space:nowrap';
      pill.textContent = cfg.command;
      editing = el('div', 'a'); editing.style.cssText += ';left:64px;top:540px;font-size:34px;color:' + APP.muted + ';white-space:nowrap;display:flex;align-items:center;gap:14px';
      star = el('img'); star.src = '/elements/fonts/claude-color.svg'; star.style.cssText = 'width:40px;height:40px';
      var et = txt(el('span')); et.textContent = 'Editing with ' + (cfg.name || cfg.command.replace(/^\//, '')) + '…';
      editing.appendChild(star); editing.appendChild(et);
      [thumb2, pill, editing].forEach(function (n) { sent.appendChild(n); });
      root.appendChild(sent);
      // the result card: the effect's own stage, scaled into the card, then zoomed to full screen
      host = el('div', 'a'); host.style.cssText += ';left:0;top:0;width:1080px;height:1920px;overflow:hidden;transform-origin:0 0';
      st.front.appendChild(host);
      dots = K.cv(); dots.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px';
      host.appendChild(dots);
      if (cfg.inner && window[cfg.inner.global]) {
        var ic = {}, k;
        for (k in cfg.inner.config || {}) ic[k] = cfg.inner.config[k];
        ['media', 'frame0', 'frames', 'track', 'clean'].forEach(function (key) { if (ic[key] == null) ic[key] = cfg[key]; });
        var ihost = el('div', 'a'); ihost.style.cssText += ';left:0;top:0;width:1080px;height:1920px';
        host.insertBefore(ihost, dots);
        inner = window[cfg.inner.global].create({ container: ihost, width: W, height: H, aspect: 'portrait', config: ic });
      }
    }
    build();
    function typedAt(t) {
      // + 1e-6: a frame time divided by a frame step can land just under a whole number in floating point
      if (t < cfg.typeStart - 1e-6) return 0;
      if (t >= cfg.pickAt - 1e-6) return cfg.command.length;
      return Math.min(cfg.typeChars, Math.floor((t - cfg.typeStart) / cfg.charDt + 1e-6) + 1);
    }
    function charTime(k) { return cfg.typeStart + cfg.charDt * k; }
    return {
      rebuild: build,
      // each cue names the box its picture event happens in, so the sync check reads that box, not the whole frame
      cues: function () {
        var c = [];
        for (var k = 0; k < cfg.typeChars; k++) {
          var kr = keyRect(cfg.command[k]) || { x: 0, y: 1410, w: 1080 };
          c.push({ at: Math.round(charTime(k) * FPS) / FPS, sfx: 'key-tap-' + (1 + k % 3), box: [kr.x + kr.w / 2 - 59, kr.y - 96, 118, 190] });
        }
        c.push({ at: Math.round(cfg.pickAt * FPS) / FPS, sfx: 'tap', box: [40, 880, 1000, 124] });
        c.push({ at: Math.round(cfg.sendAt * FPS) / FPS, sfx: 'send', box: [0, 860, 1080, 1060] });
        // the card's top part only: its lower part overlaps where the compose view slides away at the same moment
        c.push({ at: Math.round(cfg.cardAt * FPS) / FPS, sfx: 'loader', box: [cfg.card[0], cfg.card[1], cfg.card[2], 250] });
        c.push({ at: Math.round((cfg.zoomAt + cfg.zoomEnd) / 2 * FPS) / FPS, sfx: 'zoom-whoosh' });
        if (inner) inner.cues().forEach(function (q) { c.push({ at: q.at + cfg.cardAt, sfx: q.sfx, box: q.box }); });
        return c;
      },
      need: function (t) {
        var u = [st.src('plate', cfg.frame0)];
        if (inner && t >= cfg.cardAt - 0.05) u = u.concat(inner.need(Math.max(0, t - cfg.cardAt)));
        return u;
      },
      faceHidden: function (t) { return t < cfg.zoomEnd || (inner ? inner.faceHidden(t - cfg.cardAt) : false); },
      draw: function (t) {
        var g = st.pc.g; g.fillStyle = APP.bg; g.fillRect(0, 0, W, H);
        var fsrc = st.src('plate', cfg.frame0); if (thumb.src.indexOf(fsrc) < 0) { thumb.src = fsrc; thumb2.src = fsrc; }
        // phase A: typing; the keyboard and the input card leave when it is sent
        var n = typedAt(t), out = eout((t - cfg.sendAt) / 0.22);
        typed.innerHTML = '<span class="cmd">' + esc(cfg.command.slice(0, n)) + '</span><span class="caret" style="opacity:' + (Math.floor(t * 4) % 2 ? 0.2 : 1) + '"></span>';
        auto.style.opacity = n >= 2 && t < cfg.sendAt ? 1 : 0;
        auto.style.background = t >= cfg.pickAt && t < cfg.pickAt + 0.1 ? '#46453f' : APP.panel;
        compose.style.transform = 'translateY(' + (t < cfg.sendAt ? 0 : lerp(0, 1100, out)).toFixed(1) + 'px)';
        compose.style.opacity = t < cfg.sendAt ? 1 : 1 - out;
        var ch = n > 0 && t < cfg.pickAt ? cfg.command[n - 1] : null, kr = ch && keyRect(ch), since = t - charTime(n - 1);
        if (kr && since < 0.09) { pop.style.display = 'flex'; pop.textContent = ch; pop.style.left = (kr.x + kr.w / 2 - 59) + 'px'; pop.style.top = (kr.y - 96) + 'px'; }
        else pop.style.display = 'none';
        // phase B: sent
        var sb = clamp((t - cfg.sendAt) / 0.18);
        sent.style.opacity = t < cfg.sendAt ? 0 : 1;
        sent.style.transform = 'translateY(' + lerp(40, 0, eout(sb)).toFixed(1) + 'px)';
        star.style.transform = 'rotate(' + (t * 220).toFixed(1) + 'deg)';
        editing.style.opacity = t < cfg.cardAt - 0.04 ? 0 : clamp((t - cfg.cardAt + 0.04) / 0.08);
        // the card: hidden until cardAt, in the chat until zoomAt, then grows to the full frame
        var c = cfg.card;
        if (t < cfg.cardAt) { host.style.opacity = 0; if (inner) inner.renderAt(0); return; }
        var z = expo((t - cfg.zoomAt) / (cfg.zoomEnd - cfg.zoomAt));
        var sc = lerp(c[2] / W, 1, z), x = lerp(c[0], 0, z), y = lerp(c[1], 0, z), pin = eout((t - cfg.cardAt) / 0.16);
        host.style.opacity = 1;
        host.style.transform = 'translate(' + x.toFixed(2) + 'px,' + (y + (1 - pin) * 40).toFixed(2) + 'px) scale(' + (sc * lerp(0.96, 1, pin)).toFixed(5) + ')';
        host.style.borderRadius = (lerp(30, 0, z) / sc).toFixed(1) + 'px';
        var vel = t > cfg.zoomAt && t < cfg.zoomEnd ? Math.sin(Math.PI * (t - cfg.zoomAt) / (cfg.zoomEnd - cfg.zoomAt)) : 0;
        host.style.filter = vel > 0.05 ? 'blur(' + (vel * 3).toFixed(1) + 'px)' : 'none';
        root.style.transform = 'scale(' + lerp(1, 1.06, z).toFixed(4) + ')'; root.style.transformOrigin = '540px 900px';
        root.style.opacity = 1 - z;
        if (inner) inner.renderAt(t - cfg.cardAt);
        // the dot matrix: orange dots on dark, dissolving in a hashed order into the effect
        var dg = dots.g; dg.setTransform(1, 0, 0, 1, 0, 0); dg.clearRect(0, 0, W, H);
        var d0 = cfg.dotsOut[0], d1 = cfg.dotsOut[1];
        if (t < d1) {
          var p = clamp((t - d0) / (d1 - d0)), cover = 1 - p;
          dg.fillStyle = 'rgba(30,24,20,' + (0.92 * cover).toFixed(3) + ')'; dg.fillRect(0, 0, W, H);
          var step = 40, idx = 0;
          for (var yy = step / 2; yy < H; yy += step) for (var xx = step / 2; xx < W; xx += step) {
            var hsh = hash(idx++), shown = hsh > p * 1.15 - 0.1;
            if (!shown) continue;
            var tw = 0.5 + 0.5 * Math.sin(t * 18 + hsh * 40);
            dg.fillStyle = 'rgba(217,119,87,' + (0.35 + 0.55 * tw * cover + 0.1).toFixed(3) + ')';
            dg.beginPath(); dg.arc(xx, yy, 7 + 4 * hsh, 0, 6.2832); dg.fill();
          }
        }
      }
    };
  });
})();
