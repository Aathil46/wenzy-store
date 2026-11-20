
/* Rack Showcase — Shopify section script.
 * One instance per [data-sr-rail="4"] (this version only, so other copies of the section can't clash). Re-initialises and cleans up with the
 * theme editor (shopify:section:load / unload, block:select / deselect). */
(function () {
  'use strict';
  if (window.SceneRail_4) return;
  var SEL = '[data-sr-rail="4"]';

  var instances = new Map();

  /* ---------- shared: trim transparent space above the hanger ----------
     Measured from the already-loaded <img> (no second download), once per URL,
     when the browser is idle. Cross-origin images that can't be read are skipped. */
  var gapCache = {};
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 60); };
  function applyTopGap(im, frac) {
    if (frac > 0.004) im.style.transform = 'translateY(-' + (frac * 100).toFixed(2) + '%)';
  }
  function measureTopGap(im) {
    var src = im.currentSrc || im.src;
    if (!src || !im.naturalWidth) return;
    if (gapCache[src] !== undefined) { applyTopGap(im, gapCache[src]); return; }
    gapCache[src] = 0;
    idle(function () {
      var frac = 0;
      try {
        var w = Math.min(120, im.naturalWidth || 1, 512 * im.naturalWidth / im.naturalHeight);
        var h = Math.max(1, Math.round((im.naturalHeight || 1) * (w / (im.naturalWidth || 1))));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, w, h);
        var d = x.getImageData(0, 0, w, Math.ceil(h * 0.35)).data;   // only the top third matters
        var rows = Math.ceil(h * 0.35), row = 0, found = false;
        for (; row < rows && !found; row++) {
          for (var i = row * w * 4 + 3; i < (row + 1) * w * 4; i += 4) {
            if (d[i] > 12) { found = true; break; }
          }
        }
        if (found) frac = (row - 1) / h;
      } catch (e) { frac = 0; }           // tainted (cross-origin) → leave as is
      gapCache[src] = Math.max(0, frac);
      [].forEach.call(document.querySelectorAll('.sr-view img'), function (el) {
        if ((el.currentSrc || el.src) === src) applyTopGap(el, gapCache[src]);
      });
    });
  }

  /* hi-res prefetch (focus view) — each URL once */
  var hiDone = {};
  function prefetchHi(root) {
    [].forEach.call(root.querySelectorAll('img[data-hi]'), function (im) {
      var u = im.getAttribute('data-hi');
      if (!u || hiDone[u]) return;
      hiDone[u] = 1;
      var pre = new Image();
      pre.decoding = 'async';
      pre.src = u;
    });
  }

  function num(el, attr, fallback) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function stripEditorAttrs(root) {
    [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function (n) {
      [].slice.call(n.attributes).forEach(function (a) {
        if (a.name.indexOf('data-shopify') === 0) n.removeAttribute(a.name);
      });
    });
  }
  function inView(r) {
    return r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }

  /* ---------- one section instance ---------- */
  function create(sec, opts) {
    opts = opts || {};
    var rack = sec.querySelector('[data-sr-rack]');
    if (!rack) { sec.classList.remove('sr-pre'); return null; }
    var items = [].slice.call(rack.querySelectorAll('[data-sr-item]'));
    if (!items.length) { sec.classList.remove('sr-pre'); return null; }

    var HOVER_MS = num(sec, 'data-hover-speed', 650);
    var HOVER_GAP = num(sec, 'data-hover-gap', 18);
    var TURN_MS = num(sec, 'data-turn-speed', 700);
    var SWING = clamp(num(sec, 'data-swing', 60), 0, 100) / 100;
    var DROP = sec.getAttribute('data-drop') === 'true';
    var LIFT = sec.getAttribute('data-lift') === 'true';
    var AFTER = sec.getAttribute('data-after') || 'drawer';
    var TOTAL = items.length;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fineHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var mobMQ = window.matchMedia ? window.matchMedia('(max-width:749.98px)') : null;
    var wasMob = null;
    var BREEZE = sec.getAttribute('data-breeze') !== 'false';
    sec.classList.toggle('sr-snap', sec.getAttribute('data-mob-snap') === 'true');
    function mobOn() { return !!(mobMQ && mobMQ.matches); }
    var canAnimate = typeof Element !== 'undefined' && !!Element.prototype.animate;

    var dead = false;
    var listeners = [];
    var timers = [];
    function on(t, type, fn, o) {
      t.addEventListener(type, fn, o || false);
      listeners.push([t, type, fn, o || false]);
    }
    function later(fn, ms) {
      var id = setTimeout(function () {
        timers.splice(timers.indexOf(id), 1);
        if (!dead) fn();
      }, ms);
      timers.push(id);
      return id;
    }

    // loop state (declared early: initWidths references it)
    var slOn = false, slClones = [], slSetW = 0, slHold = 0, slNormTimer = null;
    // a garment is widening / narrowing: hold the loop correction until it has settled
    var quietUntil = 0;
    function quiet() { quietUntil = performance.now() + HOVER_MS + 140; }
    // touch two-tap state: tapSel = garment turned by a first tap, tapBack = garment to turn back after the modal closes
    var cloneStates = [], tapSel = null, tapBack = null, lastPtr = '', tapScrollT = null;
    var visible = true;

    items.forEach(function (it, i) { it.setAttribute('data-idx', '' + (i + 1)); });

    function rackPad() { return parseFloat(window.getComputedStyle(rack).paddingLeft) || 0; }
    function rackGap() {
      var cs = window.getComputedStyle(rack);
      return parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
    }

    /* bottom-left peek: the hovered piece's name + price */
    var peekEl = sec.querySelector('[data-sr-peek]');
    var pName = sec.querySelector('[data-sr-pname]');
    var pPrice = sec.querySelector('[data-sr-pprice]');
    var peekCur, peekTimer = null;
    function setPeek(it) {
      it = it || null;
      if (!peekEl || peekCur === it) return;
      var had = !!peekCur;
      peekCur = it;
      if (peekTimer) { clearTimeout(peekTimer); peekTimer = null; }
      var show = function () {
        peekTimer = null;
        if (dead) return;
        if (it) {
          if (pName) pName.textContent = it.getAttribute('data-name') || '';
          if (pPrice) pPrice.textContent = it.getAttribute('data-price') || '';
        }
        peekEl.classList.toggle('sr-peek-on', !!it);
        peekEl.classList.remove('sr-peek-swap');
      };
      if (had && it) { peekEl.classList.add('sr-peek-swap'); peekTimer = setTimeout(show, 120); }
      else if (!it) { peekTimer = setTimeout(show, 90); }      // brief grace so moving between hangers doesn't flash the hint
      else show();
    }

    /* views + widths */
    function viewsOf(root) {
      return [].slice.call(root.querySelectorAll('.sr-view')).map(function (el) {
        return { el: el, pos: parseFloat(el.getAttribute('data-sr-pos')) };
      }).sort(function (a, b) { return a.pos - b.pos; });
    }
    function blend(views, v) {
      for (var i = 0; i < views.length; i++) {
        var w = 0, p = views[i].pos;
        var prev = i > 0 ? views[i - 1].pos : null;
        var next = i < views.length - 1 ? views[i + 1].pos : null;
        if (v === p) w = 1;
        else if (v < p && prev !== null && v > prev) w = (v - prev) / (p - prev);
        else if (v > p && next !== null && v < next) w = (next - v) / (next - p);
        else if (v <= p && prev === null) w = 1;
        else if (v >= p && next === null) w = 1;
        views[i].el.style.opacity = Math.max(0, Math.min(1, w));
      }
    }

    var states = items.map(function (it) {
      var g = it.querySelector('.sr-garment');
      return { it: it, g: g, views: viewsOf(g), p: 0, t: 0, asp: null, hpx: 0, blockId: it.getAttribute('data-block-id'),
               face: it.getAttribute('data-face') === 'back' ? 'back' : 'front' };
    });
    states.forEach(function (s) { blend(s.views, 0); s.orig = s; s.it._srSt = s; });
    // originals + loop copies (copies turn on hover / tap too)
    function turnStates() { return cloneStates.length ? states.concat(cloneStates) : states; }

    function aspectOf(view) {
      var img = view.el.querySelector('img');
      if (!img) return null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
      var aw = +img.getAttribute('width'), ah = +img.getAttribute('height');   // known before load
      return aw > 0 && ah > 0 ? aw / ah : null;
    }
    // the view a garment turns to: front (pos 1) or, for back prints, back (pos -1)
    function facePos(s) { return s.face === 'back' ? -1 : 1; }
    function refreshAspects() {
      states.forEach(function (s) {
        var fp = facePos(s), pts = [];
        s.views.forEach(function (v) {
          if (v.pos === 0 || v.pos === fp || (v.pos > 0 && v.pos < 1)) {
            var a = aspectOf(v);
            if (a) pts.push({ pos: v.pos === fp ? 1 : v.pos, asp: a });   // the hover side always sits at 1
          }
        });
        pts.sort(function (a, b) { return a.pos - b.pos; });
        s.asp = pts.length ? pts : null;
        s.flip = s.views.filter(function (v) { return v.pos > 0 && v.pos < 1; }).length === 0;
      });
    }
    function aspectAt(s, e) {
      var pts = s.asp;
      if (!pts || !pts.length) return 0.33 + 0.65 * e;
      if (e <= pts[0].pos) return pts[0].asp;
      for (var i = 0; i < pts.length - 1; i++) {
        if (e <= pts[i + 1].pos) {
          var f = (e - pts[i].pos) / (pts[i + 1].pos - pts[i].pos || 1);
          return pts[i].asp + (pts[i + 1].asp - pts[i].asp) * f;
        }
      }
      return pts[pts.length - 1].asp;
    }
    // width of a garment at rest (side-on), independent of any running transition
    function restW(s) {
      if (s.hpx) return Math.round(s.hpx * aspectAt(s, 0));
      return parseFloat(s.it.style.width) || s.it.offsetWidth;
    }
    function measureHeights() {
      states.forEach(function (s) { s.hpx = s.g.getBoundingClientRect().height || 0; });
    }
    var fitCap = 0, fitVH = 0, fitW = 0;
    var FIT_HDR = sec.getAttribute('data-fit-header') !== 'false';
    var VH_D = clamp(num(sec, 'data-vh-d', 0), 0, 100), VH_M = clamp(num(sec, 'data-vh-m', 0), 0, 100);
    var ROD_PHOTO = sec.getAttribute('data-rod-photo') === 'true';
    var topEl = sec.querySelector('.sr-top'), footEl = sec.querySelector('.sr-foot');
    function fitVHv() { return mobOn() ? VH_M : VH_D; }
    function headerH() {
      var h = 0;
      [].forEach.call(document.querySelectorAll('.shopify-section-group-header-group'), function (el) {
        if (el.contains(sec)) return;
        h += el.getBoundingClientRect().height || 0;
      });
      if (!h) { var hd = document.querySelector('header'); if (hd && !hd.contains(sec)) h = hd.getBoundingClientRect().height || 0; }
      return Math.round(h);
    }
    /* section height in vh: the garments shrink until caption + rail + bottom row fit */
    function outerH(el) {
      if (!el) return 0;
      var cs = window.getComputedStyle(el);
      return el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
    }
    function fitHeight() {
      var vh = fitVHv();
      if (!vh) { sec.style.removeProperty('--sr-sh'); return; }
      var exact = mobOn();   // phones: the garment height setting is exact; the section grows if it needs to
      var vw = window.innerWidth;
      // phones: only re-read the height when the width changes, so the URL bar sliding away doesn't resize the rail
      if (!fitVH || !mobOn() || vw !== fitW) { fitVH = window.innerHeight; fitW = vw; }
      var avail = Math.max(320, (fitVH - (FIT_HDR ? headerH() : 0)) * vh / 100);
      sec.style.setProperty('--sr-sh', Math.round(avail) + 'px');
      var cs = window.getComputedStyle(sec);
      var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      for (var k = 0; k < 4 && !exact; k++) {
        var cur = parseFloat(window.getComputedStyle(rack).getPropertyValue('--sr-h')) || 260;
        var used = pad + outerH(topEl) + stageEl.offsetHeight + outerH(footEl) + 8;
        var nh = clamp(cur + (avail - used), 90, fitCap || cur);
        if (Math.abs(nh - cur) < 2) break;
        rack.style.setProperty('--sr-h', nh.toFixed(1) + 'px');
      }
    }
    function mobFit() {
      // phones: garments hang side-on at exactly the "Garment height (phones)" setting
      fitCap = parseFloat(window.getComputedStyle(sec).getPropertyValue('--sr-h-slide')) || 300;
      rack.style.setProperty('--sr-h', fitCap.toFixed(1) + 'px');
    }
    function mobSync() {
      var m = mobOn();
      sec.classList.toggle('sr-mob', m);
      if (wasMob === m) return;
      wasMob = m;
      if (curHover) { curHover.t = 0; curHover = null; setPeek(null); }
      if (tapSel) { tapSel.t = 0; tapSel = null; setPeek(null); }
      kick();
    }
    function autoFitHeight() {
      rack.style.removeProperty('--sr-h');
      if (mobOn()) { mobFit(); return; }
      fitCap = parseFloat(window.getComputedStyle(rack).getPropertyValue('--sr-h')) || 300;
      rack.style.setProperty('--sr-h', fitCap.toFixed(1) + 'px');
    }
    function applyWidth(s, e) {
      if (!s.hpx) return;
      s.it.style.width = Math.round(s.hpx * aspectAt(s, e)) + 'px';
    }
    /* ================= RAIL SHAPE =================
       Straight, tilted, curved or crossed. Each garment hangs straight down (gravity)
       from the point where the rail passes over it; the rail itself is drawn as an SVG
       tube that follows the same line. */
    var SHAPE = sec.getAttribute('data-shape') || 'straight';
    var TILT = clamp(num(sec, 'data-tilt', 6), 0, 20);
    var SAG = clamp(num(sec, 'data-sag', 70), 0, 240);
    var FINISH = sec.getAttribute('data-rail') || 'chrome';
    var stageEl = sec.querySelector('.sr-stage');
    var rodSvg = sec.querySelector('[data-sr-rodsvg]');
    var ROD_Y = 17;
    var railHTML = '';
    var FIN = {
      chrome: ['#f6f7f8', '#b3b8be', '#5f656c'],
      brass: ['#f6e3b0', '#c79a45', '#7b5a1d'],
      black: ['#6a6a6a', '#2a2a2a', '#0d0d0d'],
      white: ['#ffffff', '#e7e5e2', '#b9b5b0']
    }[FINISH] || ['#f6f7f8', '#b3b8be', '#5f656c'];

    function railShape() { return SHAPE; }
    function railFns(x0, x1) {
      var cx = (x0 + x1) / 2, hw = Math.max(1, (x1 - x0) / 2);
      var t = Math.tan(TILT * Math.PI / 180), sh = railShape();
      if (sh === 'tilted') return [function (x) { return (x - cx) * t; }];
      if (sh === 'curved') return [function (x) { var u = Math.max(-1, Math.min(1, (x - cx) / hw)); return SAG * (1 - u * u); }];
      if (sh === 'crossed') return [function (x) { return (x - cx) * t; }, function (x) { return -(x - cx) * t; }];
      return [function () { return 0; }];
    }
    // every garment on the rail, in on-screen order (originals + loop copies); cached, rebuilt when copies change
    var railList = null;
    function railItemsInOrder() {
      if (!slOn) return items;
      if (!railList) railList = [].filter.call(rack.children, function (n) { return n.classList && n.classList.contains('sr-item'); });
      return railList;
    }
    /* Cheap geometry: positions inside the rack (offsetLeft/offsetWidth) instead of a layout box per
       garment. offsetLeft ignores the swing / rail transforms, which is exactly what we want here. */
    function inRackView(el, margin) {
      var sl = rack.scrollLeft, m = margin || 0, l = el.offsetLeft;
      return l + el.offsetWidth > sl - m && l < sl + rack.clientWidth + m;
    }
    function visibleRailItems(margin) {
      return railItemsInOrder().filter(function (el) { return inRackView(el, margin); });
    }
    var straightDone = false;
    function layoutRail() {
      if (dead || !stageEl) return;
      var sh = railShape();
      // phones always draw the rail as a tube so it can run off both edges of the screen
      if (sh === 'straight' && ROD_PHOTO && !mobOn()) {
        if (sec.classList.contains('sr-shaped') || !straightDone) {
          railItemsInOrder().forEach(function (it) { it.style.top = ''; it.style.translate = ''; });
          rack.style.paddingBottom = '';
          sec.classList.remove('sr-shaped');
          if (rodSvg && railHTML) { rodSvg.innerHTML = ''; railHTML = ''; }
          straightDone = true;
        }
        return;
      }
      sec.classList.add('sr-shaped');
      var sr = stageEl.getBoundingClientRect();            // the only layout box read per frame
      // the rail always runs off both edges of the screen (no end caps, no wires),
      // so the rack scrolls under it edge to edge and the garments ride along it
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var x0 = -sr.left - 30, x1 = vw - sr.left + 30;
      var fns = railFns(x0, x1);
      // rail extent comes from the curve itself, not from where the garments happen to be,
      // so the rack never changes height (and nothing below it jumps) while it scrolls
      var rows = [], mn = Infinity, mx = -Infinity;
      fns.forEach(function (f) {
        var row = [];
        for (var k = 0; k <= 32; k++) {
          var x = x0 + (x1 - x0) * k / 32, y = f(x);
          row.push([x, y]);
          if (y < mn) mn = y;
          if (y > mx) mx = y;
        }
        rows.push(row);
      });
      if (sh === 'straight') {
        // a flat rail never moves the garments: clear them once instead of every frame
        if (!straightDone) { railItemsInOrder().forEach(function (it) { it.style.top = ''; it.style.translate = ''; }); straightDone = true; }
      } else {
        straightDone = false;
        var base = rack.offsetLeft - rack.scrollLeft;      // rack content origin inside the stage
        railItemsInOrder().forEach(function (it, i) {
          var c = base + it.offsetLeft + it.offsetWidth / 2;
          if (c < x0 - 240 || c > x1 + 240) return;         // off-screen: placed when it scrolls in
          var y = fns[fns.length > 1 ? i % 2 : 0](Math.max(x0, Math.min(x1, c))) - mn;
          var t = '0 ' + y.toFixed(1) + 'px';
          if (it.style.translate !== t) it.style.translate = t;
        });
      }
      var pb = Math.ceil(mx - mn) + 'px';
      if (rack.style.paddingBottom !== pb) rack.style.paddingBottom = pb;
      if (!rodSvg) return;

      var W = Math.round(sr.width), H = Math.round(sr.height);
      var key = W + 'x' + H + '|' + Math.round(x0) + '|' + Math.round(x1) + '|' + sh;
      if (key === railHTML) return;        // unchanged (e.g. while the rail scrolls): skip the redraw
      railHTML = key;
      var gid = 'srg-' + sec.id;
      var html = '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="' + FIN[0] + '"/><stop offset=".5" stop-color="' + FIN[1] + '"/><stop offset="1" stop-color="' + FIN[2] + '"/>' +
        '</linearGradient></defs>';
      rows.forEach(function (row) {
        // (+0.3px in the middle keeps a flat rail's bounding box from being zero-high, which would drop its gradient)
        var d = 'M' + row.map(function (pt, k) { return pt[0].toFixed(1) + ' ' + (ROD_Y + pt[1] - mn + (k === 16 ? 0.3 : 0)).toFixed(1); }).join(' L');
        html += '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="9" stroke-linecap="butt" transform="translate(0 4)"/>';
        html += '<path d="' + d + '" fill="none" stroke="url(#' + gid + ')" stroke-width="7" stroke-linecap="butt"/>';
      });
      rodSvg.setAttribute('width', W);
      rodSvg.setAttribute('height', H);
      rodSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      rodSvg.innerHTML = html;
    }
    // keep the rail in step while garments widen and narrow on hover
    var layRaf = 0, layUntil = 0;
    function layTick() {
      layoutRail();
      updateProg();
      if (performance.now() < layUntil && !dead) layRaf = requestAnimationFrame(layTick);
      else layRaf = 0;
    }
    function kickLayout(ms) {
      layUntil = Math.max(layUntil, performance.now() + (ms || HOVER_MS + 160));
      if (!layRaf) layRaf = requestAnimationFrame(layTick);
    }

    function initWidths() {
      if (dead) return;
      mobSync();
      refreshAspects();
      fitCap = 0;
      autoFitHeight();
      fitHeight();
      measureHeights();
      states.forEach(function (s) { applyWidth(s, s.t); });
      loopCheck();
      if (slOn) slSyncWidths();
      layoutRail();
      kickLayout(HOVER_MS + 220);   // widths ease in, keep the rail in step until they settle
      updateProg();
      if (!curHover && !tapSel) setPeek(null);
    }
    var widthsQueued = false;
    function queueWidths() {
      if (widthsQueued) return;
      widthsQueued = true;
      requestAnimationFrame(function () { widthsQueued = false; initWidths(); });
    }
    initWidths();
    on(window, 'load', queueWidths);
    var resizeW = window.innerWidth;
    on(window, 'resize', function () {
      var w = window.innerWidth;
      // iOS toolbar movement emits resize events while scrolling.
      if (mobOn() && w === resizeW) return;
      resizeW = w;
      queueWidths();
    });

    [].forEach.call(rack.querySelectorAll('.sr-view img[src]'), function (im) {
      if (im.complete && im.naturalWidth > 0) measureTopGap(im);
      else on(im, 'load', function () { queueWidths(); measureTopGap(im); }, { once: true });
    });

    /* ================= SWING PHYSICS =================
       Each hanger is a damped pendulum around its hook.
       a = angle (deg, + means the hem swings right), v = angular velocity (deg/s). */
    var swingOn = SWING > 0 && !reduceMotion;
    var K_SPRING = 26, K_DAMP = 2.3, MAX_A = 11;
    var swingRaf = 0, swingLast = 0;
    var swinging = new Set();                      // only hangers in motion are stepped each frame
    function impulse(el, v) {
      if (!swingOn || !el || dead || document.hidden || !visible) return;
      if (el.parentNode !== rack || !inRackView(el, 40)) return;   // off-screen: nobody would see it
      var s = el._srSw || (el._srSw = { a: 0, v: 0 });
      s.v += v * SWING;
      swinging.add(el);
      if (!swingRaf) { swingLast = 0; swingRaf = requestAnimationFrame(swingLoop); }
    }
    function swingLoop(ts) {
      if (dead) return;
      var dt = swingLast ? Math.min(0.05, (ts - swingLast) / 1000) : 1 / 60;
      swingLast = ts;
      swinging.forEach(function (el) {
        var s = el._srSw;
        if (!s || !el.isConnected) { swinging.delete(el); return; }
        if (Math.abs(s.a) < 0.03 && Math.abs(s.v) < 0.08) {
          s.a = 0; s.v = 0; el.style.setProperty('--sr-sw', '0deg');
          swinging.delete(el);
          return;
        }
        var h = dt / 2;
        for (var i = 0; i < 2; i++) {               // semi-implicit Euler, 2 sub-steps
          s.v += (-K_SPRING * s.a - K_DAMP * s.v) * h;
          s.a += s.v * h;
        }
        if (s.a > MAX_A) { s.a = MAX_A; s.v *= -0.35; }
        else if (s.a < -MAX_A) { s.a = -MAX_A; s.v *= -0.35; }
        // CSS rotate(+) is clockwise (hem swings left), so negate
        el.style.setProperty('--sr-sw', (-s.a).toFixed(2) + 'deg');
      });
      swingRaf = swinging.size ? requestAnimationFrame(swingLoop) : 0;
    }

    // page scroll: a light breeze through the rack
    var scY = window.pageYOffset || 0, scT = 0;
    on(window, 'scroll', function () {
      if (!swingOn || !visible) return;
      var now = performance.now();
      if (now - scT < 110) return;
      var y = window.pageYOffset || 0, dt = now - scT, dy = y - scY;
      scY = y; scT = now;
      if (dt > 400 || !dy) return;
      var sp = dy / dt;
      visibleRailItems(0).forEach(function (el, i) {
        impulse(el, clamp(sp * 9, -16, 16) * (i % 2 ? 1 : -0.8) * (0.8 + (i % 3) * 0.15));
      });
    }, { passive: true });

    /* ================= HOVER TURN ================= */
    var running = false, lastTs = 0, rafId = 0;
    function ss(x) { return x * x * (3 - 2 * x); }
    function loop(ts) {
      if (dead) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(64, ts - lastTs);
      lastTs = ts;
      var k = 1 - Math.exp(-dt / (HOVER_MS * 0.3));
      var busy = false;
      turnStates().forEach(function (s) {
        var d = s.t - s.p;
        if (Math.abs(d) > 0.02) { s.p += d * k; busy = true; }
        else if (s.p !== s.t) { s.p = s.t; busy = true; }
        else return;
        var e = ss(s.p);
        s.it.style.setProperty('--sr-p', e.toFixed(4));
        s.it.classList.toggle('sr-live', e > 0.02);
        if (s.flip) {
          var sideOp = Math.max(0, Math.min(1, (0.56 - e) / 0.12));
          var frontOp = Math.max(0, Math.min(1, (e - 0.44) / 0.12));
          var fp = facePos(s);
          s.views.forEach(function (v) {
            var o = v.pos === 0 ? sideOp : (v.pos === fp ? frontOp : 0);
            v.el.style.opacity = o;
            if (v.pos === 0) {
              var sAng = Math.min(1, e * 2) * -84;
              v.el.style.transform = e <= 0 ? 'none' : 'perspective(900px) rotateY(' + sAng.toFixed(2) + 'deg)';
            } else if (v.pos === fp) {
              v.el.style.transform = e >= 1 ? 'none' : 'scale(' + (0.92 + 0.08 * e).toFixed(4) + ')';
            }
          });
          s.g.style.transform = 'none';
        } else {
          blend(s.views, e);
          s.g.style.transform = 'perspective(900px) rotateY(' + ((1 - e) * -14).toFixed(2) + 'deg)';
        }
      });
      if (busy) rafId = requestAnimationFrame(loop);
      else { running = false; lastTs = 0; rafId = 0; }
    }
    function kick() {
      if (!running) { running = true; rafId = requestAnimationFrame(loop); }
    }

    var curHover = null;
    function setHover(s) {
      if (mobOn()) return;
      if (curHover === s) return;
      var prev = curHover;
      if (prev) { prev.t = 0; applyWidth(prev, 0); kickLayout(); }
      curHover = s;
      quiet();
      if (s) {
        later(function () { if (curHover === s) prefetchHi(s.it); }, 140);   // hover intent
        s.t = 1;
        applyWidth(s, 1);
        kickLayout();
        setPeek(s.it);
        // turning garment widens and nudges its neighbours aside
        impulse(s.it.previousElementSibling, -26);
        impulse(s.it.nextElementSibling, 26);
      } else {
        setPeek(null);
      }
      if (prev && prev !== s) {
        var pa = prev.it.previousElementSibling, pb = prev.it.nextElementSibling;
        if (pa && (!s || pa !== s.it)) impulse(pa, 12);
        if (pb && (!s || pb !== s.it)) impulse(pb, -12);
      }
      kick();
    }
    if (fineHover) {
      var mX = 0, mT = 0;
      on(rack, 'mousemove', function (ev) {
        if (drag && dragMoved) return;
        var now = performance.now();
        var rr = rack.getBoundingClientRect();
        // pointer position inside the rack's scrolled content
        var x = ev.clientX - rr.left - rack.clientLeft + rack.scrollLeft, y = ev.clientY;
        var inBand = y >= rr.top - 10 && y <= rr.bottom + 40;
        var vis = visibleRailItems(0);

        // brushing past a hanger sets it swinging in the cursor's direction
        if (mT && now - mT < 100 && swingOn && inBand) {
          var vx = (x - mX) / Math.max(1, now - mT);
          vis.forEach(function (el) {
            if (curHover && el === curHover.it) return;
            var c = el.offsetLeft + el.offsetWidth / 2;
            if ((mX - c) * (x - c) < 0) impulse(el, clamp(vx * 24, -50, 50));
          });
        }
        mX = x; mT = now;

        if (!inBand) { setHover(null); return; }
        if (curHover) {
          var cl = curHover.it.offsetLeft;
          if (x >= cl - 20 && x <= cl + curHover.it.offsetWidth + 20) return;
        }
        var best = null, bd = 1e9;
        vis.forEach(function (el) {
          var l = el.offsetLeft, w = el.offsetWidth;
          if (x < l - 2 || x > l + w + 2) return;
          var d = Math.abs(x - (l + w / 2));
          if (d < bd && el._srSt) { bd = d; best = el._srSt; }
        });
        setHover(best || null);
      });
      on(rack, 'mouseleave', function () { mT = 0; setHover(null); });
    }

    /* ================= TOUCH: TWO-TAP =================
       1st tap turns the garment to the front, 2nd tap on the same garment opens the modal.
       Mouse clicks and the keyboard open the modal straight away. */
    function touchTap() { return lastPtr ? lastPtr !== 'mouse' : !fineHover; }
    on(rack, 'pointerdown', function (ev) { lastPtr = ev.pointerType || ''; }, true);

    function setTapped(s) {
      if (tapSel === s) return;
      if (tapScrollT) { clearTimeout(tapScrollT); tapScrollT = null; }
      var prev = tapSel;
      if (prev) { prev.t = 0; applyWidth(prev, 0); kickLayout(); }
      tapSel = s;
      quiet();
      if (s) {
        s.t = 1;
        applyWidth(s, 1);
        kickLayout();
        prefetchHi(s.it);
        setPeek(s.it);
        impulse(s.it.previousElementSibling, -26);
        impulse(s.it.nextElementSibling, 26);
      } else {
        setPeek(null);
      }
      kick();
    }
    function releaseTapBack() {
      var b = tapBack;
      tapBack = null;
      if (!b || dead || tapSel === b) return;
      b.t = 0;
      applyWidth(b, 0);
      quiet();
      kickLayout();
      setPeek(null);
      kick();
    }
    function itemTap(e, s) {
      e.preventDefault();
      if (slOn) slPause(6000);
      if (touchTap() && tapSel !== s) {
        setTapped(s);                                         // first tap: turn it to face the shopper
        centreOn(s.it);                                       // and bring it to the middle as it opens out
        return;
      }
      if (tapSel && tapSel !== s) setTapped(null);
      if (tapSel === s) { tapBack = s; tapSel = null; }       // turns back side-on after the popup closes
      openFocus(s.orig || s, s.it);                           // second tap (or mouse click): lift it into the popup
    }
    /* Bring a tapped garment to the middle of the rail. It follows the garment while it widens
       (the target moves as the width eases in), so it glides into the centre in one motion.
       Works with the loop on or off; at the ends of a non-looping rail it goes as far as it can. */
    var ctrRaf = 0, ctrSnap = null;
    function centreStop() {
      if (ctrRaf) { cancelAnimationFrame(ctrRaf); ctrRaf = 0; }
      if (ctrSnap !== null) { rack.style.scrollSnapType = ctrSnap; ctrSnap = null; }
    }
    function centreOn(el) {
      centreStop();
      ctrSnap = rack.style.scrollSnapType;
      rack.style.scrollSnapType = 'none';                     // snapping would fight the glide
      var t0 = performance.now(), settle = HOVER_MS + 260, hardStop = settle + 700;
      var step = function () {
        ctrRaf = 0;
        if (dead) return;
        var max = rack.scrollWidth - rack.clientWidth;
        var target = clamp(el.offsetLeft + el.offsetWidth / 2 - rack.clientWidth / 2, 0, Math.max(0, max));
        var d = target - rack.scrollLeft, age = performance.now() - t0;
        if (reduceMotion || Math.abs(d) < 1.5) rack.scrollLeft = target;
        else rack.scrollLeft += d * 0.2;
        if ((age < settle || Math.abs(d) >= 1.5) && age < hardStop) ctrRaf = requestAnimationFrame(step);
        else centreStop();
      };
      ctrRaf = requestAnimationFrame(step);
    }
    // a finger on the rail takes over from the glide
    on(rack, 'touchstart', centreStop, { passive: true });
    on(rack, 'wheel', centreStop, { passive: true });

    // tapping anywhere outside a garment turns the tapped one back
    on(document, 'pointerdown', function (e) {
      if (!tapSel) return;
      var it = e.target && e.target.closest ? e.target.closest('.sr-item') : null;
      if (!it || !rack.contains(it)) setTapped(null);
    }, true);

    states.forEach(function (s) {
      on(s.it, 'click', function (e) { itemTap(e, s); });
      on(s.it, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFocus(s, s.it); }
      });
      on(s.it, 'focus', function () { if (!touchTap()) setHover(s); });
      on(s.it, 'blur', function () { if (curHover === s) setHover(null); });
    });

    /* ================= DROP-IN ENTRANCE ================= */
    var dropped = !DROP || reduceMotion || !canAnimate || !!opts.noDrop || !('IntersectionObserver' in window);
    if (dropped) sec.classList.remove('sr-pre');
    var dropWaiting = false;
    function railReady(maxMs, cb) {
      var vw = window.innerWidth, pending = 0, fired = false;
      function go() { if (!fired) { fired = true; cb(); } }
      items.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;
        var im = it.querySelector('.sr-view[data-sr-pos="0"] img');
        if (!im || (im.complete && im.naturalWidth)) return;
        pending++;
        var done = function () { if (--pending <= 0) go(); };
        im.addEventListener('load', done, { once: true });
        im.addEventListener('error', done, { once: true });
      });
      if (!pending) go(); else later(go, maxMs);
    }
    function dropIn() {
      if (dropped) return;
      dropped = true;
      var vw = window.innerWidth, n = 0;
      railItemsInOrder().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;          // off-screen copies: no show
        var delay = 120 + n * 85, dir = n % 2 ? -1 : 1;
        n++;
        el.animate([
          { transform: 'translateY(-90px) rotate(' + (dir * 7) + 'deg)', opacity: 0 },
          { transform: 'translateY(9px) rotate(' + (-dir * 2) + 'deg)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
        ], { duration: 640, delay: delay, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
        later(function () { impulse(el, dir * 34); }, delay + 560);   // lands on the rod and sways
      });
      sec.classList.remove('sr-pre');
    }

    /* ================= FOCUS VIEW ================= */
    var focus = sec.querySelector('[data-sr-focus]');
    if (focus) {
      // copy the section's CSS variables, then move to <body> so position:fixed
      // is never trapped by a transformed ancestor in the theme
      focus.setAttribute('style', sec.getAttribute('style') || '');
      // the popup has its own background / text colours
      focus.style.setProperty('--sr-txt', 'var(--sr-ftxt)');
      focus.style.setProperty('--sr-bg', 'var(--sr-fbg-solid)');
      document.body.appendChild(focus);
    }
    function q(sel) { return focus ? focus.querySelector(sel) : null; }
    var fbg = q('[data-sr-fbg]');
    var finner = q('[data-sr-finner]');
    var fstage = q('[data-sr-fstage]');
    var fname = q('[data-sr-fname]');
    var fsub = q('[data-sr-fsub]');
    var fprice = q('[data-sr-fprice]');
    var fidx = q('[data-sr-fidx]');
    var facBar = q('[data-sr-factionbar]');
    var facName = q('[data-sr-factionname]');
    var facBtn = q('[data-sr-factionbtn]');
    var facLbl = q('[data-sr-factionlabel]');
    var tabF = q('[data-sr-tab="front"]');
    var tabB = q('[data-sr-tab="back"]');
    var closeBtn = q('.sr-focus-close');
    var fGarment = null, fAng = 0, fAngT = 0, fAnim = null, fLast = 0, prevOverflow = '';
    var fCloseTimer = null, lastActive = null;
    var fSrc = null, fState = null, fFlight = null, closing = false;

    var flying = [];
    function T(key, fb) { return (focus && focus.getAttribute('data-t-' + key)) || fb; }
    var STR = {
      add: T('add', 'Add to cart'),
      soldout: T('soldout', 'Sold out'),
      added: T('added', 'Added to cart'),
      viewcart: T('viewcart', 'View cart'),
      unavailable: T('unavailable', 'Unavailable'),
      error: T('error', 'Could not add to cart. Please try again.'),
      view: T('view', 'View product page')
    };

    function isOpen() { return !!focus && focus.classList.contains('sr-focus-open'); }
    function fApply() {
      if (fGarment) fGarment.style.transform = 'rotateY(' + fAng.toFixed(2) + 'deg)';
    }
    function fblendLoop(ts) {
      if (dead) return;
      if (!fLast) fLast = ts;
      var dt = Math.min(80, ts - fLast);
      fLast = ts;
      var d = fAngT - fAng;
      var k = 1 - Math.exp(-dt / (TURN_MS * 0.22));
      if (Math.abs(d) < 0.4) fAng = fAngT; else fAng += d * k;
      fApply();
      if (fAng !== fAngT) fAnim = requestAnimationFrame(fblendLoop);
      else {
        if (fAng === -180) { fAng = fAngT = 180; fApply(); }
        fAnim = null; fLast = 0;
      }
    }
    function setTabs(front) {
      if (tabF) { tabF.classList.toggle('sr-tab-on', front); tabF.setAttribute('aria-pressed', front ? 'true' : 'false'); }
      if (tabB) { tabB.classList.toggle('sr-tab-on', !front); tabB.setAttribute('aria-pressed', front ? 'false' : 'true'); }
    }
    function fgo(target) {
      fAngT = target;
      setTabs(target === 0);
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    var fDrag = false, fDragX = 0, fDragA = 0;
    function fEndDrag() {
      if (!fDrag) return;
      fDrag = false;
      if (fstage) fstage.classList.remove('sr-dragging');
      var t = Math.abs(fAng) < 90 ? 0 : (fAng > 0 ? 180 : -180);
      fAngT = t;
      setTabs(t === 0);
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }
    if (fstage) {
      on(fstage, 'pointerdown', function (ev) {
        if (!fGarment || !isOpen() || closing) return;
        fDrag = true; fDragX = ev.clientX; fDragA = fAng;
        if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
        try { fstage.setPointerCapture(ev.pointerId); } catch (e) {}
        fstage.classList.add('sr-dragging');
        ev.preventDefault();
      });
      on(fstage, 'pointermove', function (ev) {
        if (!fDrag) return;
        var a = fDragA + (ev.clientX - fDragX) * 0.45;
        if (a < -220) a = -220;
        if (a > 220) a = 220;
        fAng = a; fAngT = a;
        fApply();
      });
      on(fstage, 'pointerup', fEndDrag);
      on(fstage, 'pointercancel', fEndDrag);
      on(fstage, 'lostpointercapture', fEndDrag);
    }

    function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

    /* lift off / hang back: animate the stage between the rail slot and the centre */
    function flight(fromRect, reverse, done) {
      var to = fstage.getBoundingClientRect();
      var gh = to.height * (0.98 / 1.02);
      var sc = fromRect.height / (gh || 1);
      var dx = (fromRect.left + fromRect.width / 2) - (to.left + to.width / 2);
      var dy = fromRect.top - to.top;
      var lift = Math.min(90, Math.abs(dy) * 0.25 + 34);
      var start = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
      var mid = 'translate(' + (dx * 0.4).toFixed(1) + 'px,' + (dy * 0.4 - lift).toFixed(1) + 'px) scale(' +
                ((sc + 1) / 2 * 1.03).toFixed(4) + ') rotate(' + (dx > 0 ? -2.5 : 2.5) + 'deg)';
      var end = 'translate(0px,0px) scale(1)';
      var frames = reverse
        ? [{ transform: end }, { transform: mid, offset: 0.5 }, { transform: start }]
        : [{ transform: start }, { transform: mid, offset: 0.5 }, { transform: end }];
      var a = fstage.animate(frames, {
        duration: reverse ? 560 : 680,
        easing: reverse ? 'cubic-bezier(.45,0,.55,1)' : 'cubic-bezier(.22,.85,.3,1)',
        fill: 'both'
      });
      if (done) a.onfinish = done;
      return a;
    }

    function resetFocusState() {
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
      if (fCloseTimer) { clearTimeout(fCloseTimer); fCloseTimer = null; }
      if (fSrc) { fSrc.style.visibility = ''; fSrc = null; }
      closing = false;
      if (fstage) fstage.classList.remove('sr-pop', 'sr-fade');
    }

    function openFocus(s, srcEl) {
      if (!focus || !fstage) return;
      resetFocusState();
      srcEl = srcEl || s.it;
      lastActive = document.activeElement;

      fstage.innerHTML = '';
      var clone = s.it.cloneNode(true);
      stripEditorAttrs(clone);
      clone.removeAttribute('tabindex');
      clone.removeAttribute('role');
      clone.removeAttribute('aria-label');
      clone.removeAttribute('data-sr-item');
      clone.classList.remove('sr-live');
      clone.style.setProperty('--sr-p', '1');
      clone.style.setProperty('--sr-sw', '0deg');
      clone.style.top = '';
      clone.style.translate = '';
      clone.style.width = '';
      clone.style.visibility = '';
      [].forEach.call(clone.querySelectorAll('.sr-view'), function (v) {
        v.style.transform = '';
        v.style.opacity = '';
      });
      [].forEach.call(clone.querySelectorAll('img'), function (im) {
        im.removeAttribute('loading');
        im.removeAttribute('fetchpriority');
        var hi = im.getAttribute('data-hi');
        if (hi && im.getAttribute('src') !== hi) im.setAttribute('src', hi);   // low-res stays visible until hi arrives
      });
      // the popup opens on the side the shopper just saw on the rail
      var showBack = s.face === 'back';
      var cg = clone.querySelector('.sr-garment');
      if (cg) cg.style.transform = showBack ? 'rotateY(180deg)' : 'rotateY(0deg)';
      fstage.appendChild(clone);
      fGarment = cg;
      fAng = fAngT = showBack ? 180 : 0;
      setTabs(!showBack);

      var name = s.it.getAttribute('data-name') || '';
      var sub = s.it.getAttribute('data-sub') || '';
      var price = s.it.getAttribute('data-price') || '';
      if (fname) fname.textContent = name;
      if (fsub) { fsub.textContent = sub; fsub.style.display = sub ? '' : 'none'; }
      if (fprice) { fprice.textContent = price; fprice.style.display = price ? '' : 'none'; }
      if (fidx) fidx.textContent = pad2(s.it.getAttribute('data-idx') || '1') + ' / ' + pad2(TOTAL);
      focus.setAttribute('aria-label', name || 'Product view');

      if (facName) facName.textContent = name;
      var bUrl = s.it.getAttribute('data-btn-url') || '';
      var bLbl = (s.it.getAttribute('data-btn-label') || '').trim() || (bUrl ? STR.view : '');
      var bTgt = s.it.getAttribute('data-btn-target') || '';
      if (facLbl) facLbl.textContent = bLbl;
      if (facBtn) {
        facBtn.setAttribute('href', bUrl || '#');
        facBtn.setAttribute('target', bTgt === '_blank' ? '_blank' : '_self');
        if (bTgt === '_blank') facBtn.setAttribute('rel', 'noopener');
        else facBtn.removeAttribute('rel');
      }
      if (facBar) facBar.classList.toggle('sr-no-btn', !bLbl);

      qaSetup(s);

      var srcG = srcEl.querySelector('.sr-garment');
      var fromRect = srcG ? srcG.getBoundingClientRect() : null;

      try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
      focus.classList.add('sr-focus-open');
      focus.setAttribute('aria-hidden', 'false');
      focus.scrollTop = 0;
      fState = s;

      if (LIFT && canAnimate && !reduceMotion && inView(fromRect)) {
        fSrc = srcEl;
        srcEl.style.visibility = 'hidden';           // the hanger is now empty
        fFlight = flight(fromRect, false);
      } else {
        void fstage.offsetWidth;
        fstage.classList.add('sr-pop');
      }

      requestAnimationFrame(function () { focus.classList.add('sr-focus-in'); });
      if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); } }
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    function landBack(src, s) {
      impulse(src, (Math.random() > 0.5 ? 1 : -1) * 40);
      // it lands facing you, then turns back to its side-on resting pose
      if (s && src === s.it && s !== curHover && s.flip && !mobOn()) { s.p = 1; s.t = 0; kick(); }
    }

    function closeFocus() {
      if (!isOpen() || closing) return;
      closing = true;
      if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
      fDrag = false;
      if (fstage) fstage.classList.remove('sr-dragging');
      focus.classList.remove('sr-focus-in');
      focus.setAttribute('aria-hidden', 'true');
      try { document.body.style.overflow = prevOverflow; } catch (e) {}

      var src = fSrc, s = fState;
      var srcG = src && src.isConnected ? src.querySelector('.sr-garment') : null;
      var r = srcG ? srcG.getBoundingClientRect() : null;

      function finish() {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
        focus.classList.remove('sr-focus-open');
        fstage.classList.remove('sr-pop', 'sr-fade');
        fstage.innerHTML = '';
        fGarment = null; fCloseTimer = null; closing = false;
      }

      if (src && inView(r) && canAnimate && !reduceMotion) {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
        fFlight = flight(r, true, function () {
          if (dead) return;
          src.style.visibility = '';
          fSrc = null;
          landBack(src, s);
          releaseTapBack();
          finish();
        });
      } else {
        if (src) src.style.visibility = '';
        fSrc = null;
        fstage.classList.add('sr-fade');
        releaseTapBack();
        fCloseTimer = setTimeout(finish, 320);
      }
      if (lastActive && lastActive.isConnected && lastActive.focus) {
        try { lastActive.focus({ preventScroll: true }); } catch (e) {}
      }
      if (slOn) slPause();
    }

    if (closeBtn) {
      on(closeBtn, 'click', function (e) { e.preventDefault(); e.stopPropagation(); closeFocus(); });
    }
    if (focus) {
      on(focus, 'click', function (e) {
        if (e.target === focus || e.target === fbg || e.target === finner) closeFocus();
      });
    }
    on(document, 'keydown', function (e) {
      if (!isOpen() || closing) return;
      if (e.key === 'Escape') { closeFocus(); return; }
      var tag = e.target && e.target.tagName;
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && tag !== 'INPUT') { fgo(fAngT === 0 ? 180 : 0); return; }
      if (e.key === 'Tab') {
        var f = [].filter.call(focus.querySelectorAll('button, a[href]'), function (el) {
          return el.offsetParent !== null && !el.disabled;
        });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (!focus.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    if (tabF) on(tabF, 'click', function () { fgo(0); });
    if (tabB) on(tabB, 'click', function () { fgo(180); });

    /* ---------- progress bar ----------
       Looping rail: the bar shows where you are inside ONE set of garments and wraps
       around at the end (no jump to an empty rail). Otherwise it is a normal scrollbar. */
    var progEl = sec.querySelector('[data-sr-prog]');
    function loopGeom() {
      var pad = rackPad();
      var view = Math.max(1, rack.clientWidth - pad * 2);
      return { pad: pad, view: view, frac: clamp(view / (slSetW || 1), 0.04, 1) };
    }
    function updateProg() {
      if (!progEl) return;
      if (slOn && slSetW > 0 && items[0]) {
        var g = loopGeom();
        var pos = ((rack.scrollLeft + g.pad - items[0].offsetLeft) / slSetW) % 1;
        if (pos < 0) pos += 1;
        var main = Math.min(g.frac, 1 - pos);
        progEl.style.setProperty('--sr-pl', (pos * 100).toFixed(2) + '%');
        progEl.style.setProperty('--sr-pw', (main * 100).toFixed(2) + '%');
        progEl.style.setProperty('--sr-pw2', (Math.max(0, g.frac - main) * 100).toFixed(2) + '%');
        progEl.classList.toggle('sr-prog-off', g.frac >= 0.995);
        return;
      }
      var sw = rack.scrollWidth, cw = rack.clientWidth;
      var frac = sw > 0 ? Math.min(1, cw / sw) : 1;
      var ratio = sw - cw > 0 ? rack.scrollLeft / (sw - cw) : 0;
      progEl.style.setProperty('--sr-pl', (ratio * (1 - frac) * 100).toFixed(2) + '%');
      progEl.style.setProperty('--sr-pw', (frac * 100).toFixed(2) + '%');
      progEl.style.setProperty('--sr-pw2', '0%');
      progEl.classList.toggle('sr-prog-off', frac >= 0.995);
    }
    function progTo(x, smooth) {
      var r = progEl.getBoundingClientRect();
      var f = clamp((x - r.left) / (r.width || 1), 0, 1);
      var left;
      if (slOn && slSetW > 0) {
        var g = loopGeom();
        // the thumb centres under the pointer, always inside the middle set
        left = items[0].offsetLeft - g.pad + (f - g.frac / 2) * slSetW;
      } else {
        left = f * (rack.scrollWidth - rack.clientWidth);
      }
      if (smooth && !reduceMotion) rack.scrollTo({ left: left, behavior: 'smooth' });
      else rack.scrollLeft = left;
    }
    updateProg();

    /* ---------- rail scroll: progress, swing, rail ride ---------- */
    var mxL = 0, mxT = 0;
    // a tapped garment that is scrolled out of view turns back side-on
    function mobPeek() {
      if (!tapSel) return;
      var rr = rack.getBoundingClientRect(), r = tapSel.it.getBoundingClientRect();
      if (r.right < rr.left + 10 || r.left > rr.right - 10) setTapped(null);
    }
    var mpRaf = 0;
    on(rack, 'scroll', function () {
      updateProg();
      if (railShape() !== 'straight') kickLayout(80);
      // Programmatic centering and width transitions are not user swipes.
      if (!slOn && tapSel && !mpRaf) mpRaf = requestAnimationFrame(function () { mpRaf = 0; if (!dead) mobPeek(); });
      if (!swingOn) return;
      var now = performance.now();
      if (now - mxT < 60) return;
      var x = rack.scrollLeft, dt = now - mxT, dx = x - mxL;
      mxL = x; mxT = now;
      if (dt > 300 || Math.abs(dx) > 600 || !dx) return;
      var sp = dx / dt;
      visibleRailItems(0).forEach(function (el, i) { impulse(el, clamp(-sp * 16, -30, 30) * (0.85 + (i % 3) * 0.1)); });
    }, { passive: true });

    /* ---------- desktop: grab the rail and slide it, it glides to a stop ---------- */
    var drag = null, glideRaf = 0, dragMoved = false;
    function stopGlide() { if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0; } }
    function glide(v) {
      stopGlide();
      if (reduceMotion) return;
      var last = 0;
      var step = function (ts) {
        if (dead) return;
        var dt = last ? Math.min(40, ts - last) : 16;
        last = ts;
        rack.scrollLeft -= v * dt;
        v *= Math.pow(0.94, dt / 16);
        var max = rack.scrollWidth - rack.clientWidth;
        if (Math.abs(v) < 0.02 || rack.scrollLeft <= 0 || rack.scrollLeft >= max) { glideRaf = 0; return; }
        glideRaf = requestAnimationFrame(step);
      };
      glideRaf = requestAnimationFrame(step);
    }
    on(rack, 'pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || mobOn()) return;
      if (rack.scrollWidth - rack.clientWidth < 2) return;
      stopGlide();
      drag = { x: e.clientX, sl: rack.scrollLeft, t: performance.now(), lx: e.clientX, v: 0, id: e.pointerId };
      dragMoved = false;
      e.preventDefault();   // no text / image selection while dragging
    });
    on(window, 'pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!dragMoved && Math.abs(dx) < 6) return;
      if (!dragMoved) {
        dragMoved = true;
        rack.classList.add('sr-dragging');
        setHover(null);
        try { rack.setPointerCapture(drag.id); } catch (er) {}
      }
      var now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.v = drag.v * 0.6 + ((e.clientX - drag.lx) / dt) * 0.4;
      drag.t = now; drag.lx = e.clientX;
      rack.scrollLeft = drag.sl - dx;
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      rack.classList.remove('sr-dragging');
      if (dragMoved) {
        if (performance.now() - d.t < 90) glide(d.v);
        later(function () { dragMoved = false; }, 0);
      }
    }
    on(window, 'pointerup', endDrag);
    on(window, 'pointercancel', endDrag);
    // a drag must not count as a click on a garment
    on(rack, 'click', function (e) { if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; } }, true);
    on(rack, 'dragstart', function (e) { e.preventDefault(); });
    on(rack, 'wheel', function () { stopGlide(); }, { passive: true });

    if (progEl) {
      var pDrag = false;
      on(progEl, 'pointerdown', function (e) {
        pDrag = true; stopGlide();
        try { progEl.setPointerCapture(e.pointerId); } catch (er) {}
        progTo(e.clientX, true);
        e.preventDefault();
      });
      on(progEl, 'pointermove', function (e) { if (pDrag && e.buttons) progTo(e.clientX, false); });
      on(progEl, 'pointerup', function () { pDrag = false; });
      on(progEl, 'pointercancel', function () { pDrag = false; });
    }

    if (mobMQ) {
      var onMob = function () { kickLayout(300); queueWidths(); };
      if (mobMQ.addEventListener) on(mobMQ, 'change', onMob); else if (mobMQ.addListener) mobMQ.addListener(onMob);
    }

    /* ---------- a gentle breeze now and then ---------- */
    function breeze() {
      if (dead) return;
      if (BREEZE && swingOn && visible && !document.hidden && !curHover) {
        var vis = visibleRailItems(0);
        if (vis.length) {
          var k = Math.floor(Math.random() * vis.length);
          var dir = Math.random() > 0.5 ? 1 : -1;
          impulse(vis[k], dir * (14 + Math.random() * 10));
          if (vis[k + 1]) later(function () { impulse(vis[k + 1], dir * 8); }, 160);
        }
      }
      later(breeze, 3800 + Math.random() * 3200);
    }
    later(breeze, 2600);

    /* ================= QUICK ADD ================= */
    var qa = q('[data-sr-qa]'), qaOpts = q('[data-sr-qa-opts]'), qaBtn = q('[data-sr-qa-btn]');
    var qaLbl = q('[data-sr-qa-lbl]'), qaMsg = q('[data-sr-qa-msg]');
    var qaData = null, qaSel = [], qaVariant = null, qaBusy = false, qaPriceDefault = '';

    function qaFind(sel) {
      if (!qaData) return null;
      for (var i = 0; i < qaData.variants.length; i++) {
        var v = qaData.variants[i], ok = true;
        for (var j = 0; j < sel.length; j++) { if (v.opts[j] !== sel[j]) { ok = false; break; } }
        if (ok) return v;
      }
      return null;
    }
    function qaSetup(s) {
      qaData = null;
      if (!qa) { if (focus) focus.classList.remove('sr-split'); return; }
      var el = s.it.querySelector('[data-sr-json]');
      if (el) { try { qaData = JSON.parse(el.textContent); } catch (e) { qaData = null; } }
      if (!qaData || !qaData.variants || !qaData.variants.length) {
        qa.hidden = true;
        focus.classList.remove('sr-split');
        return;
      }
      qa.hidden = false;
      focus.classList.add('sr-split');
      qaMsg.textContent = ''; qaMsg.classList.remove('sr-err');
      qaBtn.classList.remove('sr-done', 'sr-busy');
      qaBusy = false;
      qaPriceDefault = s.it.getAttribute('data-price') || '';
      var first = null;
      for (var i = 0; i < qaData.variants.length; i++) { if (qaData.variants[i].av) { first = qaData.variants[i]; break; } }
      qaSel = (first || qaData.variants[0]).opts.slice();
      qaRender();
      qaUpdate();
    }
    function qaRender() {
      qaOpts.innerHTML = '';
      var single = qaData.options.length === 1 && qaData.options[0].values.length <= 1;   // "Default Title"
      if (single) return;
      qaData.options.forEach(function (o, oi) {
        var row = document.createElement('div');
        row.className = 'sr-qa-opt';
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', o.name);
        var lab = document.createElement('div');
        lab.className = 'sr-qa-optname';
        lab.textContent = o.name;
        var pills = document.createElement('div');
        pills.className = 'sr-qa-pills';
        o.values.forEach(function (val) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sr-pill';
          b.textContent = val;
          b.setAttribute('data-oi', oi);
          b.setAttribute('data-val', val);
          b.addEventListener('click', function () {
            qaSel[oi] = val;
            qaMsg.textContent = ''; qaMsg.classList.remove('sr-err');
            qaBtn.classList.remove('sr-done');
            qaUpdate();
          });
          pills.appendChild(b);
        });
        row.appendChild(lab);
        row.appendChild(pills);
        qaOpts.appendChild(row);
      });
    }
    function qaUpdate() {
      qaVariant = qaFind(qaSel);
      [].forEach.call(qaOpts.querySelectorAll('.sr-pill'), function (b) {
        var oi = +b.getAttribute('data-oi'), val = b.getAttribute('data-val');
        b.setAttribute('aria-pressed', qaSel[oi] === val ? 'true' : 'false');
        var test = qaSel.slice(); test[oi] = val;
        var v = qaFind(test), na = !v || !v.av;
        b.classList.toggle('sr-na', na);
        b.setAttribute('aria-label', val + (na ? ' – ' + STR.soldout : ''));
      });
      if (qaBtn.classList.contains('sr-done')) return;
      var ok = !!(qaVariant && qaVariant.av);
      qaBtn.disabled = !ok || qaBusy;
      qaLbl.textContent = !qaVariant ? STR.unavailable : (qaVariant.av ? STR.add : STR.soldout);
      if (fprice) {
        var pr = qaVariant && qaVariant.price ? qaVariant.price : qaPriceDefault;
        fprice.textContent = pr;
        fprice.style.display = pr ? '' : 'none';
      }
    }
    function cartRoot() {
      return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    }

    /* ---------- cart: works with Horizon (storefront events), Dawn-style drawers and the rest ---------- */
    function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
    function cartSectionIds() {
      var ids = [];
      [].forEach.call(document.querySelectorAll('cart-items-component[data-section-id]'), function (el) { ids.push(el.getAttribute('data-section-id')); });
      return uniq(ids);
    }
    function dawnDrawer() {
      var d = document.querySelector('cart-drawer');
      return d && typeof d.renderContents === 'function' && typeof d.getSectionsToRender === 'function' ? d : null;
    }
    function openThemeCart() {
      var td = document.querySelector('theme-drawer#cart-drawer');
      if (td && (td.isOpen || td.hasAttribute('open'))) return Promise.resolve(true);
      if (window.Shopify && Shopify.actions && typeof Shopify.actions.openCart === 'function' && document.querySelector('theme-drawer, cart-drawer-component')) {
        return Promise.resolve(Shopify.actions.openCart()).then(function () { return true; }, function () { return false; });
      }
      if (td && typeof td.open === 'function') { td.open(); return Promise.resolve(true); }
      var tags = ['cart-drawer', 'cart-notification', 'side-cart', 'cart-sidebar', 'mini-cart'];
      for (var i = 0; i < tags.length; i++) {
        var el = document.querySelector(tags[i]);
        if (!el) continue;
        var fns = ['open', 'show', 'openDrawer'];
        for (var k = 0; k < fns.length; k++) if (typeof el[fns[k]] === 'function') { try { el[fns[k]](); return Promise.resolve(true); } catch (e) {} }
      }
      return Promise.resolve(false);
    }
    function announceStandard(cart, variantId, res) {
      if (!document.querySelector('cart-items-component')) return Promise.resolve(false);
      return import('@shopify/events').then(function (m) {
        var Ev = m && m.CartLinesUpdateEvent;
        if (!Ev) return false;
        var dfd = typeof Ev.createPromise === 'function' ? Ev.createPromise() : null;
        var resolveNow;
        var promise = dfd ? dfd.promise : new Promise(function (r) { resolveNow = r; });
        sec.dispatchEvent(new Ev({ action: 'add', context: 'product', lines: [{ merchandiseId: String(variantId), quantity: 1 }], promise: promise }));
        var payload = {
          cart: typeof Ev.createCartFromAjaxResponse === 'function' ? Ev.createCartFromAjaxResponse(cart) : cart,
          detail: { items: cart.items, source: 'scene-rail', sourceId: sec.id, itemCount: 1, sections: res && res.sections ? res.sections : undefined, didError: false }
        };
        if (dfd) dfd.resolve(payload); else resolveNow(payload);
        return true;
      }).catch(function () { return false; });
    }
    function legacyCartUI(cart, res, variantId) {
      var dawn = dawnDrawer();
      if (AFTER === 'drawer' && dawn && res && res.sections) {
        try {
          dawn.classList.remove('is-empty');
          var inner = dawn.querySelector('.drawer__inner'); if (inner) inner.classList.remove('is-empty');
          dawn.renderContents(Object.assign({ id: variantId }, res));
          return;
        } catch (e) {}
      }
      try {
        var html = res && res.sections && res.sections['cart-icon-bubble'];
        var bubble = document.getElementById('cart-icon-bubble');
        if (html && bubble) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var src = doc.querySelector('.shopify-section') || doc.body;
          bubble.innerHTML = src.innerHTML;
        }
      } catch (e) {}
      [].forEach.call(document.querySelectorAll('[data-cart-count], .cart-count-bubble span[aria-hidden="true"]'), function (el) { el.textContent = cart.item_count; });
      try {
        if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS && window.PUB_SUB_EVENTS.cartUpdate) {
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'scene-rail', cartData: cart });
        }
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('cart:update', { bubbles: true, detail: { resource: cart, sourceId: sec.id, data: { source: 'scene-rail', itemCount: cart.item_count, sections: (res && res.sections) || {} } } }));
      if (AFTER === 'drawer') openThemeCart();
    }

    function qaAdd() {
      if (!qaVariant || !qaVariant.av || qaBusy) return;
      qaBusy = true;
      qaBtn.disabled = true;
      qaBtn.classList.add('sr-busy');
      qaMsg.textContent = ''; qaMsg.classList.remove('sr-err');
      var root = cartRoot(), vid = qaVariant.id;
      var ids = cartSectionIds();
      var dawn = dawnDrawer();
      if (dawn) { try { ids = ids.concat(dawn.getSectionsToRender().map(function (x) { return x.section || x.id; })); } catch (e) {} }
      if (document.getElementById('cart-icon-bubble')) ids.push('cart-icon-bubble');
      ids = uniq(ids).slice(0, 5);   // the Section Rendering API renders at most 5 sections
      var body = { items: [{ id: vid, quantity: 1 }] };
      if (ids.length) { body.sections = ids.join(','); body.sections_url = window.location.pathname; }
      var addRes = null;
      fetch(root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body)
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok || j.status) throw new Error(j.description || j.message || STR.error);
            return j;
          });
        })
        .then(function (j) {
          addRes = j;
          return fetch(root + 'cart.js', { headers: { 'Accept': 'application/json' }, cache: 'no-store' }).then(function (r) { return r.json(); });
        })
        .then(function (cart) {
          if (dead) return;
          if (AFTER === 'cart') { window.location.href = root + 'cart'; return; }
          qaBtn.classList.add('sr-done');
          qaLbl.textContent = STR.added;
          qaMsg.innerHTML = '';
          var a = document.createElement('a');
          a.href = root + 'cart';
          a.textContent = STR.viewcart + ' →';
          qaMsg.appendChild(a);
          flyToCart();
          document.dispatchEvent(new CustomEvent('scene-rail:added', { detail: { variantId: vid, cart: cart } }));
          if (AFTER === 'drawer') later(closeFocus, 380);   // let the piece fly to the cart, then make room for the drawer
          announceStandard(cart, vid, addRes).then(function (handled) {
            if (dead) return;
            if (handled) { if (AFTER === 'drawer') setTimeout(openThemeCart, 420); }
            else legacyCartUI(cart, addRes, vid);
          });
          later(function () {
            if (!qaBtn.classList.contains('sr-done')) return;
            qaBtn.classList.remove('sr-done');
            qaUpdate();
          }, 2600);
        })
        .catch(function (err) {
          if (dead) return;
          qaMsg.textContent = (err && err.message) || STR.error;
          qaMsg.classList.add('sr-err');
        })
        .then(function () {
          if (dead) return;
          qaBusy = false;
          qaBtn.classList.remove('sr-busy');
          if (qaBtn.classList.contains('sr-done')) qaBtn.disabled = false;
          else qaUpdate();
        });
    }
    if (qaBtn) on(qaBtn, 'click', function (e) { e.preventDefault(); qaAdd(); });

    function flyToCart() {
      if (reduceMotion || !canAnimate || !fstage) return;
      var img = fstage.querySelector('.sr-view[data-sr-pos="1"] img');
      if (!img) return;
      var from = img.getBoundingClientRect();
      if (!from.width) return;
      var target = document.querySelector('#cart-icon-bubble, cart-icon, [data-cart-icon], a[aria-controls="cart-drawer"], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = document.createElement('img');
      f.src = img.currentSrc || img.src;
      f.alt = '';
      f.className = 'sr-fly';
      f.style.left = from.left + 'px';
      f.style.top = from.top + 'px';
      f.style.width = from.width + 'px';
      f.style.height = from.height + 'px';
      document.body.appendChild(f);
      flying.push(f);
      var dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
      var dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
      var a = f.animate([
        { transform: 'translate(0,0) scale(.9)', opacity: 0.95 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - 70) + 'px) scale(.32) rotate(-8deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-14deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        flying.splice(flying.indexOf(f), 1);
        if (target && target.animate) {
          target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }],
            { duration: 380, easing: 'ease-out' });
        }
      };
    }

    /* ================= ENDLESS RAIL (desktop + phones) =================
       Only when the garments are wider than the screen. Copies of the whole set hang on
       both sides; whenever the view drifts out of the middle set it jumps by exactly one
       set width — invisible, because the copies are identical — so you never reach an end. */
    function slAll() { return items.concat(slClones); }
    function slGoto(i, smooth) {
      var el = slAll()[i];
      if (!el) return;
      rack.scrollTo({
        left: el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2,
        behavior: smooth === false || reduceMotion ? 'auto' : 'smooth'
      });
    }
    function setW() {
      var gap = rackGap();
      return states.reduce(function (w, s) { return w + restW(s) + gap; }, 0);
    }
    var LOOP = sec.getAttribute('data-loop') === 'true';
    function needLoop() {
      if (!LOOP || items.length < 2) return false;
      var view = rack.clientWidth - rackPad() * 2;
      return setW() - rackGap() > view + 2;
    }
    function loopCheck() {
      var want = needLoop();
      if (want && !slOn) slSetup();
      else if (!want && slOn) slTeardown();
    }
    function slNorm() {
      if (!slOn || slSetW <= 0 || !slClones.length) return;
      // a garment is open, turned or still changing width: wait (the copies would not match)
      if (tapSel || tapBack || curHover || isOpen() || performance.now() < quietUntil) return;
      var start = items[0].offsetLeft;
      var relative = rack.scrollLeft + rack.clientWidth / 2 - start;
      // a small dead band prevents subpixel rounding from bouncing between sets
      if (relative >= -1 && relative < slSetW + 1) return;
      var shift = Math.floor(relative / slSetW) * slSetW;
      if (!shift) return;
      var snap = rack.style.scrollSnapType;
      rack.style.scrollSnapType = 'none';
      rack.scrollLeft -= shift;
      if (drag) drag.sl -= shift;          // keep a mouse drag in step
      mxL = rack.scrollLeft;
      rack.style.scrollSnapType = snap;
      updateProg();
    }
    function slSyncWidths() {
      cloneStates.forEach(function (cs) {
        var o = cs.orig;
        cs.asp = o.asp; cs.flip = o.flip; cs.hpx = o.hpx;
        applyWidth(cs, cs.t);
      });
      slSetW = setW();
    }
    function slPause(ms) { slHold = Date.now() + (ms || 4000); }

    function slSetup() {
      if (slOn || items.length < 2) return;
      slOn = true;
      rack.classList.add('sr-looping', 'sr-instant');
      var cycle = setW();
      // enough copies on each side to cover a fast swipe / glide before the loop corrects
      // Touch: a hard swipe can glide several thousand pixels before the loop may recentre,
      // so hang enough copies to cover it (capped to keep the page light).
      var reach = touchMode() ? Math.max(6000, rack.clientWidth * 12) : rack.clientWidth * 2;
      var sideSets = Math.max(2, Math.ceil(reach / Math.max(60, cycle)) + 1);
      sideSets = Math.min(sideSets, Math.max(2, Math.floor(160 / items.length)));
      var before = document.createDocumentFragment();
      for (var copy = 0; copy < sideSets * 2; copy++) {
        items.forEach(function (it, k) {
          var c = it.cloneNode(true);
          c.setAttribute('data-sr-clone', '1');
          c.removeAttribute('data-sr-item');
          c.setAttribute('tabindex', '-1');
          c.setAttribute('aria-hidden', 'true');
          c.style.visibility = '';
          c.style.top = '';
          c.style.translate = '';
          c.style.setProperty('--sr-p', '0');
          c.style.setProperty('--sr-sw', '0deg');
          c.classList.remove('sr-live');
          stripEditorAttrs(c);
          c.removeAttribute('id');
          [].forEach.call(c.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
          [].forEach.call(c.querySelectorAll('img'), function (im) {
            im.loading = 'lazy'; im.decoding = 'async'; im.removeAttribute('fetchpriority');
          });
          var o = states[k], cg = c.querySelector('.sr-garment');
          var cs = { it: c, g: cg, views: viewsOf(cg), p: 0, t: 0, asp: o.asp, flip: o.flip, hpx: o.hpx, blockId: o.blockId, face: o.face, orig: o };
          blend(cs.views, 0);
          cs.views.forEach(function (v) { v.el.style.transform = ''; });
          cg.style.transform = '';
          c._srSt = cs;
          c.addEventListener('click', function (e) { itemTap(e, cs); });
          if (copy < sideSets) before.appendChild(c); else rack.appendChild(c);
          slClones.push(c);
          cloneStates.push(cs);
        });
      }
      rack.insertBefore(before, items[0]);
      slSyncWidths();
      // start with the first real garment at the left edge, exactly where it sat before
      void rack.offsetWidth;
      rack.scrollLeft = sideSets * slSetW;
      mxL = rack.scrollLeft;
      railList = null; straightDone = false;
      requestAnimationFrame(function () { rack.classList.remove('sr-instant'); kickLayout(120); });
    }
    function slTeardown() {
      if (!slOn) return;
      slOn = false;
      rack.classList.remove('sr-looping');
      slClones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      slClones = []; slSetW = 0;
      if (tapSel && tapSel.orig !== tapSel) { tapSel = null; setPeek(null); }
      if (tapBack && tapBack.orig !== tapBack) tapBack = null;
      if (curHover && curHover.orig !== curHover) { curHover = null; setPeek(null); }
      cloneStates = [];
      railList = null; straightDone = false;
      rack.scrollLeft = 0;
    }

    // persistent loop listeners (registered once; no-ops while the loop is off)
    /* Touch screens: iOS Safari ignores (and then undoes) scroll jumps made while a swipe is
       still gliding, so the glide ran past the copies into empty rail. On touch the jump now
       waits until the rail has come to rest, or until a finger touches it again (which stops
       the glide); there are enough copies on each side to cover even a hard swipe. */
    var slScrollRaf = 0, slTouching = false, slIdleT = null;
    function touchMode() { return mobOn() || !fineHover || (lastPtr && lastPtr !== 'mouse'); }
    function slSettle() {
      if (slIdleT) clearTimeout(slIdleT);
      slIdleT = setTimeout(function () {
        slIdleT = null;
        if (dead || !slOn || slTouching) return;
        slNorm(); updateProg();
      }, 160);
    }
    on(rack, 'scroll', function () {
      if (!slOn) return;
      if (touchMode()) slSettle();
      if (slScrollRaf) return;
      slScrollRaf = requestAnimationFrame(function () {
        slScrollRaf = 0;
        if (dead || !slOn) return;
        if (!touchMode()) slNorm();
      });
    }, { passive: true });
    on(rack, 'touchstart', function () {
      slTouching = true;
      if (slIdleT) { clearTimeout(slIdleT); slIdleT = null; }
      if (slOn) { slPause(); slNorm(); }   // the finger has stopped any glide: safe to recentre now
    }, { passive: true });
    function slTouchEnd() { slTouching = false; if (slOn) slSettle(); }
    on(rack, 'touchend', slTouchEnd, { passive: true });
    on(rack, 'touchcancel', slTouchEnd, { passive: true });
    // once a hover / tap has settled, recentre quietly in the middle set
    on(rack, 'mouseleave', function () {
      if (!slOn) return;
      if (slNormTimer) clearTimeout(slNormTimer);
      slNormTimer = setTimeout(function () { if (!dead) slNorm(); }, HOVER_MS + 200);
    });
    // Only an intentional horizontal gesture releases the front-facing shirt.
    // Native scroll events also come from slGoto(), image sizing and loop resets.
    var tapGesture = null;
    on(rack, 'touchstart', function (e) {
      if (!slOn || e.touches.length !== 1) { tapGesture = null; return; }
      tapGesture = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    on(rack, 'touchmove', function (e) {
      if (!tapGesture || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - tapGesture.x;
      var dy = e.touches[0].clientY - tapGesture.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        tapGesture = null;
        if (tapSel) setTapped(null);
      }
    }, { passive: true });
    function endTapGesture() { tapGesture = null; }
    on(rack, 'touchend', endTapGesture, { passive: true });
    on(rack, 'touchcancel', endTapGesture, { passive: true });
    on(rack, 'wheel', function (e) {
      if (slOn && tapSel && Math.abs(e.deltaX) > Math.abs(e.deltaY)) setTapped(null);
    }, { passive: true });
    on(window, 'load', function () { if (slOn) { slSyncWidths(); updateProg(); } });

    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var en = entries[0];
        visible = en ? en.isIntersecting : true;
        if (en && en.isIntersecting && en.intersectionRatio >= 0.2 && !dropped && !dropWaiting) {
          dropWaiting = true;
          railReady(1500, dropIn);
        }
      }, { threshold: [0, 0.2] });
      io.observe(sec);
    }

    /* ---------- theme editor hooks ---------- */
    function select(blockId) {
      var s = states.filter(function (x) { return x.blockId === blockId; })[0];
      if (!s) return;
      if (slOn) { slPause(10000); slNorm(); }
      centreOn(s.it);
      if (!mobOn()) setHover(s);
    }
    function deselect() { if (!mobOn()) setHover(null); }

    function destroy() {
      dead = true;
      if (isOpen()) { try { document.body.style.overflow = prevOverflow; } catch (e) {} }
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners = [];
      if (rafId) cancelAnimationFrame(rafId);
      if (layRaf) cancelAnimationFrame(layRaf);
      if (swingRaf) cancelAnimationFrame(swingRaf);
      if (fAnim) cancelAnimationFrame(fAnim);
      if (mpRaf) cancelAnimationFrame(mpRaf);
      centreStop();
      if (slScrollRaf) cancelAnimationFrame(slScrollRaf);
      stopGlide();
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
      flying.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
      [peekTimer, fCloseTimer, slNormTimer, tapScrollT, slIdleT].concat(timers).forEach(function (t) { if (t) clearTimeout(t); });
      if (io) io.disconnect();
      if (focus && focus.parentNode) focus.parentNode.removeChild(focus);
    }

    return { select: select, deselect: deselect, destroy: destroy };
  }

  /* ---------- registry ---------- */
  function init(sec, opts) {
    if (!sec || instances.has(sec)) return;
    var inst = create(sec, opts);
    if (inst) instances.set(sec, inst);
  }
  function destroy(sec) {
    var inst = instances.get(sec);
    if (inst) { inst.destroy(); instances.delete(sec); }
  }
  function initAll(root, opts) {
    [].forEach.call((root || document).querySelectorAll(SEL), function (sec) { init(sec, opts); });
  }
  function instFor(target) {
    var sec = target && target.closest ? target.closest(SEL) : null;
    return sec ? instances.get(sec) : null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // in the theme editor, re-renders after a setting change skip the drop-in
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target, { noDrop: true }); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll(SEL), destroy);
  });
  document.addEventListener('shopify:block:select', function (e) {
    var inst = instFor(e.target);
    if (inst && e.detail) inst.select(e.detail.blockId);
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var inst = instFor(e.target);
    if (inst) inst.deselect();
  });

  window.SceneRail_4 = { init: init, destroy: destroy, initAll: initAll };
  if (!window.SceneRail) window.SceneRail = window.SceneRail_4;
})();

