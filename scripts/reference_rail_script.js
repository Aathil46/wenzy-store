
  const chatDrawer = document.querySelector('#chat-drawer');
  const shopifyChat = document.querySelector('shopify-chat');

  document.addEventListener('theme-drawer:open', (event) => {
    if (/** @type {Element} */ (event.target).id !== 'chat-drawer') return;
    shopifyChat?.setAttribute('mode', 'managed');
  });

  document.addEventListener('theme-drawer:close', (event) => {
    if (/** @type {Element} */ (event.target).id !== 'chat-drawer') return;
    // If mode is still managed, this is a theme-initiated close (backdrop /
    // Escape) — close the chat so the FAB appears. If mode is already
    // standalone, the close was triggered by an undock (enter-standalone sets
    // mode before closing the drawer) — leave the chat open as a floating panel.
    if (shopifyChat?.getAttribute('mode') === 'managed') {
      shopifyChat?.removeAttribute('open');
    }
    shopifyChat?.setAttribute('mode', 'standalone');
  });

  document.addEventListener('shopify-chat:enter-managed', () => {
    // Captured at event-fire time — the dock-transition animation hint below
    // depends on state as it was when the event was dispatched.
    const isStandaloneAndOpen = shopifyChat?.hasAttribute('open') && shopifyChat?.getAttribute('mode') === 'standalone';

    // The activator-click path (FAB click on desktop with stored
    // preferredMode=managed) dispatches enter-managed *before* calling show(),
    // so the chat's `open` attribute at event time understates the imminent
    // outcome. Defer to a microtask: by then show() (if any) has run, and we
    // can distinguish the viewport-driven mobile→desktop transition that left
    // a minimized FAB (chat stays closed → don't open an empty drawer) from
    // an activator click (chat just opened → open the drawer).
    queueMicrotask(() => {
      if (!shopifyChat?.hasAttribute('open') && !chatDrawer?.hasAttribute('open')) {
        return;
      }
      chatDrawer?.open?.(isStandaloneAndOpen ? { enter: 'inline-start' } : undefined);
    });
  });

  document.addEventListener('shopify-chat:enter-standalone', () => {
    shopifyChat?.setAttribute('mode', 'standalone');
    chatDrawer?.close?.();
  });

  document.addEventListener('shopify-chat:close', () => {
    if (shopifyChat?.getAttribute('mode') === 'managed') {
      chatDrawer?.close?.();
    }
  });

  document.addEventListener('megaMenu:hover', () => {
    if (shopifyChat?.hasAttribute('open') && shopifyChat?.getAttribute('mode') === 'standalone') {
      shopifyChat?.removeAttribute('open');
    }
  });

  // After the chat upgrades it self-restores its preferred mode from
  // sessionStorage. Reconcile any mismatch with the theme-drawer's state
  // — the drawer is the source of truth for which mode the chat should
  // be in (open → managed, closed → standalone).
  customElements.whenDefined('shopify-chat').then(() => {
    const mode = chatDrawer?.hasAttribute('open') ? 'managed' : 'standalone';
    if (shopifyChat?.getAttribute('mode') !== mode) {
      // When switching managed → standalone (e.g. narrow viewport skipped
      // drawer restore), also close the chat so it renders as the FAB
      // rather than an open standalone panel.
      if (mode === 'standalone' && shopifyChat?.hasAttribute('open')) {
        shopifyChat?.removeAttribute('open');
      }
      shopifyChat?.setAttribute('mode', mode);
    }
  });


/* --- NEXT SCRIPT --- */


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


/* --- NEXT SCRIPT --- */


/* Rack Showcase — Shopify section script (Phase 1).
 * One instance per [data-rk-section]. Re-initialises and cleans up with the
 * theme editor (shopify:section:load / unload, block:select / deselect). */
(function () {
  'use strict';
  if (window.RackShowcase) return;

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
        var w = Math.min(120, im.naturalWidth || 1);
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
      [].forEach.call(document.querySelectorAll('.rk-view img'), function (el) {
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
    var rack = sec.querySelector('[data-rk-rack]');
    if (!rack) { sec.classList.remove('rk-pre'); return null; }
    var items = [].slice.call(rack.querySelectorAll('[data-rk-item]'));
    if (!items.length) { sec.classList.remove('rk-pre'); return null; }

    var HOVER_MS = num(sec, 'data-hover-speed', 650);
    var HOVER_GAP = num(sec, 'data-hover-gap', 18);
    var TURN_MS = num(sec, 'data-turn-speed', 700);
    var SL_MS = num(sec, 'data-slide-interval', 3000);
    var SWING = clamp(num(sec, 'data-swing', 60), 0, 100) / 100;
    var DROP = sec.getAttribute('data-drop') === 'true';
    var LIFT = sec.getAttribute('data-lift') === 'true';
    var AFTER = sec.getAttribute('data-after') || 'drawer';
    var TOTAL = items.length;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fineHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var slMQ = window.matchMedia ? window.matchMedia('(max-width:599.98px)') : null;
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

    // slider state (declared early: initWidths references it)
    var slOn = false, slTimer = null, slClones = [], slSetW = 0, slDots = [], slHold = 0, slNormTimer = null;
    // touch two-tap state: tapSel = garment turned by a first tap, tapBack = garment to turn back after the modal closes
    var cloneStates = [], tapSel = null, tapBack = null, lastPtr = '', tapScrollT = null;
    var visible = true;

    items.forEach(function (it, i) { it.setAttribute('data-idx', '' + (i + 1)); });

    /* caption swap */
    var capEl = sec.querySelector('[data-rk-caption]');
    var capDefault = capEl ? capEl.innerHTML : '';
    var capCur = '', capTimer = null;
    function setCaption(txt) {
      var key = txt === null ? '' : txt;
      if (!capEl || capCur === key) return;
      capCur = key;
      capEl.classList.add('rk-cap-swap');
      if (capTimer) clearTimeout(capTimer);
      capTimer = setTimeout(function () {
        if (txt === null) capEl.innerHTML = capDefault;
        else capEl.textContent = txt;
        capEl.classList.remove('rk-cap-swap');
      }, 160);
    }

    /* views + widths */
    function viewsOf(root) {
      return [].slice.call(root.querySelectorAll('.rk-view')).map(function (el) {
        return { el: el, pos: parseFloat(el.getAttribute('data-rk-pos')) };
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
      var g = it.querySelector('.rk-garment');
      return { it: it, g: g, views: viewsOf(g), p: 0, t: 0, asp: null, hpx: 0, blockId: it.getAttribute('data-block-id') };
    });
    states.forEach(function (s) { blend(s.views, 0); s.orig = s; });
    // originals + slider clones (clones turn on tap too)
    function turnStates() { return cloneStates.length ? states.concat(cloneStates) : states; }

    function aspectOf(view) {
      var img = view.el.querySelector('img');
      if (!img) return null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
      var aw = +img.getAttribute('width'), ah = +img.getAttribute('height');   // known before load
      return aw > 0 && ah > 0 ? aw / ah : null;
    }
    function refreshAspects() {
      states.forEach(function (s) {
        var pts = [];
        s.views.forEach(function (v) {
          if (v.pos >= 0) {
            var a = aspectOf(v);
            if (a) pts.push({ pos: v.pos, asp: a });
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
    function measureHeights() {
      states.forEach(function (s) { s.hpx = s.g.getBoundingClientRect().height || 0; });
    }
    function autoFitHeight() {
      rack.style.removeProperty('--rk-h');
      if (slMQ && slMQ.matches) return;
      var cs = window.getComputedStyle(rack);
      var base = parseFloat(cs.getPropertyValue('--rk-h')) || 260;
      var gap = parseFloat(cs.columnGap) || 0;
      var W = rack.clientWidth;
      var sumSide = 0, maxDelta = 0;
      states.forEach(function (s) {
        var a0 = aspectAt(s, 0), a1 = aspectAt(s, 1);
        sumSide += a0;
        if (a1 - a0 > maxDelta) maxDelta = a1 - a0;
      });
      if (sumSide > 0 && W > 0) {
        var hFit = (W - gap * (states.length - 1) - 8 - HOVER_GAP * 2) / (sumSide + maxDelta);
        var h = Math.min(base, Math.max(80, hFit));
        rack.style.setProperty('--rk-h', h.toFixed(1) + 'px');
      }
    }
    function applyWidth(s, e) {
      if (!s.hpx) return;
      s.it.style.width = Math.round(s.hpx * aspectAt(s, e)) + 'px';
    }
    function initWidths() {
      if (dead) return;
      refreshAspects();
      autoFitHeight();
      measureHeights();
      states.forEach(function (s) { applyWidth(s, s.t); });
      if (slOn) slSyncWidths();
    }
    var widthsQueued = false;
    function queueWidths() {
      if (widthsQueued) return;
      widthsQueued = true;
      requestAnimationFrame(function () { widthsQueued = false; initWidths(); });
    }
    initWidths();
    on(window, 'load', queueWidths);
    on(window, 'resize', queueWidths);

    [].forEach.call(rack.querySelectorAll('.rk-view img[src]'), function (im) {
      if (im.complete && im.naturalWidth > 0) measureTopGap(im);
      else on(im, 'load', function () { queueWidths(); measureTopGap(im); }, { once: true });
    });

    /* ================= SWING PHYSICS =================
       Each hanger is a damped pendulum around its hook.
       a = angle (deg, + means the hem swings right), v = angular velocity (deg/s). */
    var swingOn = SWING > 0 && !reduceMotion;
    var K_SPRING = 26, K_DAMP = 2.3, MAX_A = 11;
    var swingRaf = 0, swingLast = 0;
    function swingEls() { return items.concat(slClones); }
    function impulse(el, v) {
      if (!swingOn || !el || dead) return;
      var s = el._rkSw || (el._rkSw = { a: 0, v: 0 });
      s.v += v * SWING;
      if (!swingRaf) { swingLast = 0; swingRaf = requestAnimationFrame(swingLoop); }
    }
    function swingLoop(ts) {
      if (dead) return;
      var dt = swingLast ? Math.min(0.05, (ts - swingLast) / 1000) : 1 / 60;
      swingLast = ts;
      var live = false;
      swingEls().forEach(function (el) {
        var s = el._rkSw;
        if (!s) return;
        if (Math.abs(s.a) < 0.03 && Math.abs(s.v) < 0.08) {
          if (s.a !== 0 || s.v !== 0) { s.a = 0; s.v = 0; el.style.setProperty('--rk-sw', '0deg'); }
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
        el.style.setProperty('--rk-sw', (-s.a).toFixed(2) + 'deg');
        live = true;
      });
      swingRaf = live ? requestAnimationFrame(swingLoop) : 0;
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
      swingEls().forEach(function (el, i) {
        impulse(el, clamp(sp * 9, -16, 16) * (i % 2 ? 1 : -0.8) * (0.8 + (i % 3) * 0.15));
      });
    }, { passive: true });

    // horizontal rack scroll (mobile slider): garments lag behind the swipe
    var rxL = 0, rxT = 0;
    on(rack, 'scroll', function () {
      if (!swingOn || !slOn) return;
      var now = performance.now();
      if (now - rxT < 70) return;
      var x = rack.scrollLeft, dt = now - rxT, dx = x - rxL;
      rxL = x; rxT = now;
      if (dt > 300 || Math.abs(dx) > 500 || !dx) return;
      var sp = dx / dt;
      swingEls().forEach(function (el) { impulse(el, clamp(-sp * 14, -28, 28)); });
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
        s.it.style.setProperty('--rk-p', e.toFixed(4));
        s.it.classList.toggle('rk-live', e > 0.02);
        if (s.flip) {
          var sideOp = Math.max(0, Math.min(1, (0.56 - e) / 0.12));
          var frontOp = Math.max(0, Math.min(1, (e - 0.44) / 0.12));
          s.views.forEach(function (v) {
            var o = v.pos === 0 ? sideOp : (v.pos === 1 ? frontOp : 0);
            v.el.style.opacity = o;
            if (v.pos === 0) {
              var sAng = Math.min(1, e * 2) * -84;
              v.el.style.transform = e <= 0 ? 'none' : 'perspective(900px) rotateY(' + sAng.toFixed(2) + 'deg)';
            } else if (v.pos === 1) {
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
      if (curHover === s) return;
      var prev = curHover;
      if (curHover) { curHover.t = 0; applyWidth(curHover, 0); }
      curHover = s;
      if (curHover) {
        var hov = curHover;
        later(function () { if (curHover === hov) prefetchHi(hov.it); }, 140);   // hover intent
        curHover.t = 1;
        applyWidth(curHover, 1);
        setCaption(curHover.it.getAttribute('data-name') || null);
        // turning garment widens and nudges its neighbours aside
        var i = states.indexOf(curHover);
        if (states[i - 1]) impulse(states[i - 1].it, -26);
        if (states[i + 1]) impulse(states[i + 1].it, 26);
      } else {
        setCaption(null);
      }
      if (prev && prev !== curHover) {
        var j = states.indexOf(prev);
        if (states[j - 1] && states[j - 1] !== curHover) impulse(states[j - 1].it, 12);
        if (states[j + 1] && states[j + 1] !== curHover) impulse(states[j + 1].it, -12);
      }
      kick();
    }
    if (fineHover) {
      var mX = 0, mT = 0;
      on(rack, 'mousemove', function (ev) {
        var x = ev.clientX, y = ev.clientY, now = performance.now();

        // brushing past a hanger sets it swinging in the cursor's direction
        if (mT && now - mT < 100 && swingOn) {
          var vx = (x - mX) / Math.max(1, now - mT);
          states.forEach(function (st) {
            if (st === curHover) return;
            var r = st.it.getBoundingClientRect();
            if (y < r.top || y > r.bottom) return;
            var c = (r.left + r.right) / 2;
            if ((mX - c) * (x - c) < 0) impulse(st.it, clamp(vx * 24, -50, 50));
          });
        }
        mX = x; mT = now;

        if (curHover) {
          var cr = curHover.it.getBoundingClientRect();
          if (x >= cr.left - 20 && x <= cr.right + 20 && y >= cr.top - 10 && y <= cr.bottom + 40) return;
        }
        var best = null, bd = 1e9;
        states.forEach(function (s) {
          var r = s.it.getBoundingClientRect();
          if (y < r.top - 10 || y > r.bottom + 40) return;
          if (x < r.left - 2 || x > r.right + 2) return;
          var d = Math.abs(x - (r.left + r.right) / 2);
          if (d < bd) { bd = d; best = s; }
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
      var prev = tapSel;
      if (prev) { prev.t = 0; applyWidth(prev, 0); }
      tapSel = s;
      if (s) {
        s.t = 1;
        applyWidth(s, 1);
        prefetchHi(s.it);
        setCaption(s.it.getAttribute('data-name') || null);
        impulse(s.it.previousElementSibling, -26);
        impulse(s.it.nextElementSibling, 26);
      } else {
        setCaption(null);
      }
      kick();
    }
    function releaseTapBack() {
      var b = tapBack;
      tapBack = null;
      if (!b || dead || tapSel === b) return;
      b.t = 0;
      applyWidth(b, 0);
      setCaption(null);
      kick();
    }
    function itemTap(e, s) {
      e.preventDefault();
      if (slOn) slPause(6000);
      if (touchTap() && tapSel !== s) {
        setTapped(s);                                         // first tap: show the front
        if (slOn) {
          var i = slAll().indexOf(s.it);
          slGoto(i);                                          // centre it…
          later(function () { if (tapSel === s) slGoto(i); }, HOVER_MS + 40);   // …again once widened
        }
        return;
      }
      if (tapSel && tapSel !== s) setTapped(null);
      if (tapSel === s) { tapBack = s; tapSel = null; }       // turns back side-on after the modal closes
      openFocus(s.orig, s.it);                                // second tap (or mouse click): open the modal
    }
    // tapping anywhere outside a garment turns the tapped one back
    on(document, 'pointerdown', function (e) {
      if (!tapSel) return;
      var it = e.target && e.target.closest ? e.target.closest('.rk-item') : null;
      if (!it || !rack.contains(it)) setTapped(null);
    }, true);

    states.forEach(function (s) {
      on(s.it, 'click', function (e) { itemTap(e, s); });
      on(s.it, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFocus(s, s.it); }
      });
      on(s.it, 'focus', function () { if (!slOn && !touchTap()) setHover(s); });
      on(s.it, 'blur', function () { if (!slOn && curHover === s) setHover(null); });
    });

    /* ================= DROP-IN ENTRANCE ================= */
    var dropped = !DROP || reduceMotion || !canAnimate || !!opts.noDrop || !('IntersectionObserver' in window);
    if (dropped) sec.classList.remove('rk-pre');
    var dropWaiting = false;
    function railReady(maxMs, cb) {
      var vw = window.innerWidth, pending = 0, fired = false;
      function go() { if (!fired) { fired = true; cb(); } }
      items.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;
        var im = it.querySelector('.rk-view[data-rk-pos="0"] img');
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
      swingEls().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;          // off-screen slider clones: no show
        var delay = 120 + n * 85, dir = n % 2 ? -1 : 1;
        n++;
        el.animate([
          { transform: 'translateY(-90px) rotate(' + (dir * 7) + 'deg)', opacity: 0 },
          { transform: 'translateY(9px) rotate(' + (-dir * 2) + 'deg)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
        ], { duration: 640, delay: delay, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
        later(function () { impulse(el, dir * 34); }, delay + 560);   // lands on the rod and sways
      });
      sec.classList.remove('rk-pre');
    }

    /* ================= FOCUS VIEW ================= */
    var focus = sec.querySelector('[data-rk-focus]');
    if (focus) {
      // copy the section's CSS variables, then move to <body> so position:fixed
      // is never trapped by a transformed ancestor in the theme
      focus.setAttribute('style', sec.getAttribute('style') || '');
      document.body.appendChild(focus);
    }
    function q(sel) { return focus ? focus.querySelector(sel) : null; }
    var fbg = q('[data-rk-fbg]');
    var finner = q('[data-rk-finner]');
    var fstage = q('[data-rk-fstage]');
    var fname = q('[data-rk-fname]');
    var fsub = q('[data-rk-fsub]');
    var fprice = q('[data-rk-fprice]');
    var fidx = q('[data-rk-fidx]');
    var facBar = q('[data-rk-factionbar]');
    var facName = q('[data-rk-factionname]');
    var facBtn = q('[data-rk-factionbtn]');
    var facLbl = q('[data-rk-factionlabel]');
    var tabF = q('[data-rk-tab="front"]');
    var tabB = q('[data-rk-tab="back"]');
    var closeBtn = q('.rk-focus-close');
    var fGarment = null, fAng = 0, fAngT = 0, fAnim = null, fLast = 0, prevOverflow = '';
    var fCloseTimer = null, lastActive = null;
    var fSrc = null, fState = null, fFlight = null, closing = false;

    function T(key, fb) { return (focus && focus.getAttribute('data-t-' + key)) || fb; }
    var STR = {
      add: T('add', 'Add to cart'),
      soldout: T('soldout', 'Sold out'),
      added: T('added', 'Added to cart'),
      viewcart: T('viewcart', 'View cart'),
      unavailable: T('unavailable', 'Unavailable'),
      error: T('error', 'Could not add to cart. Please try again.')
    };

    function isOpen() { return !!focus && focus.classList.contains('rk-focus-open'); }
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
      if (tabF) { tabF.classList.toggle('rk-tab-on', front); tabF.setAttribute('aria-pressed', front ? 'true' : 'false'); }
      if (tabB) { tabB.classList.toggle('rk-tab-on', !front); tabB.setAttribute('aria-pressed', front ? 'false' : 'true'); }
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
      if (fstage) fstage.classList.remove('rk-dragging');
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
        fstage.classList.add('rk-dragging');
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
      if (fstage) fstage.classList.remove('rk-pop', 'rk-fade');
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
      clone.removeAttribute('data-rk-item');
      clone.classList.remove('rk-live');
      clone.style.setProperty('--rk-p', '1');
      clone.style.setProperty('--rk-sw', '0deg');
      [].forEach.call(clone.querySelectorAll('.rk-view'), function (v) {
        v.style.transform = '';
        v.style.opacity = '';
      });
      [].forEach.call(clone.querySelectorAll('img'), function (im) {
        im.removeAttribute('loading');
        im.removeAttribute('fetchpriority');
        var hi = im.getAttribute('data-hi');
        if (hi && im.getAttribute('src') !== hi) im.setAttribute('src', hi);   // low-res stays visible until hi arrives
      });
      var cg = clone.querySelector('.rk-garment');
      if (cg) cg.style.transform = 'rotateY(0deg)';
      fstage.appendChild(clone);
      fGarment = cg;
      fAng = 0; fAngT = 0;
      setTabs(true);

      var name = s.it.getAttribute('data-name') || '';
      var sub = s.it.getAttribute('data-sub') || '';
      var price = s.it.getAttribute('data-price') || '';
      if (fname) fname.textContent = name;
      if (fsub) { fsub.textContent = sub; fsub.style.display = sub ? '' : 'none'; }
      if (fprice) { fprice.textContent = price; fprice.style.display = price ? '' : 'none'; }
      if (fidx) fidx.textContent = pad2(s.it.getAttribute('data-idx') || '1') + ' / ' + pad2(TOTAL);
      focus.setAttribute('aria-label', name || 'Product view');

      if (facName) facName.textContent = name;
      var bLbl = (s.it.getAttribute('data-btn-label') || '').trim();
      var bUrl = s.it.getAttribute('data-btn-url') || '';
      var bTgt = s.it.getAttribute('data-btn-target') || '';
      if (facLbl) facLbl.textContent = bLbl;
      if (facBtn) {
        facBtn.setAttribute('href', bUrl || '#');
        facBtn.setAttribute('target', bTgt === '_blank' ? '_blank' : '_self');
        if (bTgt === '_blank') facBtn.setAttribute('rel', 'noopener');
        else facBtn.removeAttribute('rel');
      }
      if (facBar) facBar.classList.toggle('rk-no-btn', !bLbl);

      qaSetup(s);

      var srcG = srcEl.querySelector('.rk-garment');
      var fromRect = srcG ? srcG.getBoundingClientRect() : null;

      try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
      focus.classList.add('rk-focus-open');
      focus.setAttribute('aria-hidden', 'false');
      focus.scrollTop = 0;
      fState = s;

      if (LIFT && canAnimate && !reduceMotion && inView(fromRect)) {
        fSrc = srcEl;
        srcEl.style.visibility = 'hidden';           // the hanger is now empty
        fFlight = flight(fromRect, false);
      } else {
        void fstage.offsetWidth;
        fstage.classList.add('rk-pop');
      }

      requestAnimationFrame(function () { focus.classList.add('rk-focus-in'); });
      if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); } }
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    function landBack(src, s) {
      impulse(src, (Math.random() > 0.5 ? 1 : -1) * 40);
      // it lands facing you, then turns back to its side-on resting pose
      if (s && src === s.it && s !== curHover && s.flip) { s.p = 1; s.t = 0; kick(); }
    }

    function closeFocus() {
      if (!isOpen() || closing) return;
      closing = true;
      if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
      fDrag = false;
      if (fstage) fstage.classList.remove('rk-dragging');
      focus.classList.remove('rk-focus-in');
      focus.setAttribute('aria-hidden', 'true');
      try { document.body.style.overflow = prevOverflow; } catch (e) {}

      var src = fSrc, s = fState;
      var srcG = src && src.isConnected ? src.querySelector('.rk-garment') : null;
      var r = srcG ? srcG.getBoundingClientRect() : null;

      function finish() {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
        focus.classList.remove('rk-focus-open');
        fstage.classList.remove('rk-pop', 'rk-fade');
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
        fstage.classList.add('rk-fade');
        releaseTapBack();
        fCloseTimer = setTimeout(finish, 320);
      }
      if (lastActive && lastActive.isConnected && lastActive.focus) {
        try { lastActive.focus({ preventScroll: true }); } catch (e) {}
      }
      slPause();
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

    /* ================= QUICK ADD ================= */
    var qa = q('[data-rk-qa]'), qaOpts = q('[data-rk-qa-opts]'), qaBtn = q('[data-rk-qa-btn]');
    var qaLbl = q('[data-rk-qa-lbl]'), qaMsg = q('[data-rk-qa-msg]');
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
      if (!qa) { if (focus) focus.classList.remove('rk-split'); return; }
      var el = s.it.querySelector('[data-rk-json]');
      if (el) { try { qaData = JSON.parse(el.textContent); } catch (e) { qaData = null; } }
      if (!qaData || !qaData.variants || !qaData.variants.length) {
        qa.hidden = true;
        focus.classList.remove('rk-split');
        return;
      }
      qa.hidden = false;
      focus.classList.add('rk-split');
      qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
      qaBtn.classList.remove('rk-done', 'rk-busy');
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
        row.className = 'rk-qa-opt';
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', o.name);
        var lab = document.createElement('div');
        lab.className = 'rk-qa-optname';
        lab.textContent = o.name;
        var pills = document.createElement('div');
        pills.className = 'rk-qa-pills';
        o.values.forEach(function (val) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'rk-pill';
          b.textContent = val;
          b.setAttribute('data-oi', oi);
          b.setAttribute('data-val', val);
          b.addEventListener('click', function () {
            qaSel[oi] = val;
            qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
            qaBtn.classList.remove('rk-done');
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
      [].forEach.call(qaOpts.querySelectorAll('.rk-pill'), function (b) {
        var oi = +b.getAttribute('data-oi'), val = b.getAttribute('data-val');
        b.setAttribute('aria-pressed', qaSel[oi] === val ? 'true' : 'false');
        var test = qaSel.slice(); test[oi] = val;
        var v = qaFind(test), na = !v || !v.av;
        b.classList.toggle('rk-na', na);
        b.setAttribute('aria-label', val + (na ? ' – ' + STR.soldout : ''));
      });
      if (qaBtn.classList.contains('rk-done')) return;
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
          detail: { items: cart.items, source: 'rack-showcase', sourceId: sec.id, itemCount: 1, sections: res && res.sections ? res.sections : undefined, didError: false }
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
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'rack-showcase', cartData: cart });
        }
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('cart:update', { bubbles: true, detail: { resource: cart, sourceId: sec.id, data: { source: 'rack-showcase', itemCount: cart.item_count, sections: (res && res.sections) || {} } } }));
      if (AFTER === 'drawer') openThemeCart();
    }

    function qaAdd() {
      if (!qaVariant || !qaVariant.av || qaBusy) return;
      qaBusy = true;
      qaBtn.disabled = true;
      qaBtn.classList.add('rk-busy');
      qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
      var root = cartRoot(), vid = qaVariant.id;
      var ids = cartSectionIds();
      var dawn = dawnDrawer();
      if (dawn) { try { ids = ids.concat(dawn.getSectionsToRender().map(function (x) { return x.section || x.id; })); } catch (e) {} }
      if (document.getElementById('cart-icon-bubble')) ids.push('cart-icon-bubble');
      ids = uniq(ids);
      var body = { items: [{ id: vid, quantity: 1 }] };
      if (ids.length) { body.sections = ids.join(','); body.sections_url = window.location.pathname; }
      var addRes = null;
      fetch(root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
          return fetch(root + 'cart.js', { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); });
        })
        .then(function (cart) {
          if (dead) return;
          if (AFTER === 'cart') { window.location.href = root + 'cart'; return; }
          qaBtn.classList.add('rk-done');
          qaLbl.textContent = STR.added;
          qaMsg.innerHTML = '';
          var a = document.createElement('a');
          a.href = root + 'cart';
          a.textContent = STR.viewcart + ' →';
          qaMsg.appendChild(a);
          flyToCart();
          document.dispatchEvent(new CustomEvent('rack-showcase:added', { detail: { variantId: vid, cart: cart } }));
          document.dispatchEvent(new CustomEvent('rack:cart-updated', { detail: cart }));
          if (AFTER === 'drawer') later(closeFocus, 380);   // let the piece fly to the cart, then make room for the drawer
          announceStandard(cart, vid, addRes).then(function (handled) {
            if (dead) return;
            if (handled) { if (AFTER === 'drawer') later(openThemeCart, 420); }
            else legacyCartUI(cart, addRes, vid);
          });
          later(function () {
            if (!qaBtn.classList.contains('rk-done')) return;
            qaBtn.classList.remove('rk-done');
            qaUpdate();
          }, 2600);
        })
        .catch(function (err) {
          if (dead) return;
          qaMsg.textContent = (err && err.message) || STR.error;
          qaMsg.classList.add('rk-err');
        })
        .then(function () {
          if (dead) return;
          qaBusy = false;
          qaBtn.classList.remove('rk-busy');
          if (qaBtn.classList.contains('rk-done')) qaBtn.disabled = false;
          else qaUpdate();
        });
    }
    if (qaBtn) on(qaBtn, 'click', function (e) { e.preventDefault(); qaAdd(); });

    function flyToCart() {
      if (reduceMotion || !canAnimate || !fstage) return;
      var img = fstage.querySelector('.rk-view[data-rk-pos="1"] img');
      if (!img) return;
      var from = img.getBoundingClientRect();
      if (!from.width) return;
      var target = document.querySelector('#cart-icon-bubble, [data-cart-icon], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = document.createElement('img');
      f.src = img.currentSrc || img.src;
      f.alt = '';
      f.className = 'rk-fly';
      f.style.left = from.left + 'px';
      f.style.top = from.top + 'px';
      f.style.width = from.width + 'px';
      f.style.height = from.height + 'px';
      document.body.appendChild(f);
      var dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
      var dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
      var a = f.animate([
        { transform: 'translate(0,0) scale(.9)', opacity: 0.95 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - 70) + 'px) scale(.32) rotate(-8deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-14deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (target && target.animate) {
          target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }],
            { duration: 380, easing: 'ease-out' });
        }
      };
    }

    /* ================= MOBILE SLIDER (< 600px) ================= */
    var dotsWrap = sec.querySelector('[data-rk-dots]');

    function slAll() { return items.concat(slClones); }
    function slNearest() {
      var center = rack.scrollLeft + rack.clientWidth / 2, best = 0, bd = 1e9;
      slAll().forEach(function (el, i) {
        var c = el.offsetLeft + el.offsetWidth / 2;
        var d = Math.abs(c - center);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function slGoto(i, smooth) {
      var el = slAll()[i];
      if (!el) return;
      rack.scrollTo({
        left: el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2,
        behavior: smooth === false || reduceMotion ? 'auto' : 'smooth'
      });
    }
    function slNorm() {
      if (slSetW <= 0 || !slClones.length) return;
      if (rack.scrollLeft >= slSetW) rack.scrollLeft = rack.scrollLeft - slSetW;
      else if (slNearest() >= items.length) rack.scrollLeft = Math.max(0, rack.scrollLeft - slSetW);
    }
    function slDotsUpdate() {
      if (!slDots.length) return;
      var i = slNearest() % items.length;
      slDots.forEach(function (d, k) {
        d.classList.toggle('rk-dot-on', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    }
    function slSyncWidths() {
      slClones.forEach(function (c, k) {
        var cs = cloneStates[k], o = cs && cs.orig;
        if (cs && o && o.hpx) {
          cs.asp = o.asp; cs.flip = o.flip; cs.hpx = o.hpx;
          applyWidth(cs, cs.t);
        } else {
          var it = items[k % items.length];
          if (it) c.style.width = it.style.width || getComputedStyle(it).width;
        }
      });
      if (slClones.length && !tapSel) slSetW = slClones[0].offsetLeft - items[0].offsetLeft;
    }
    function slTick() {
      if (!slOn || !visible || document.hidden) return;
      if (slHold > Date.now()) return;
      if (isOpen()) return;
      if (tapSel) { setTapped(null); return; }   // turn back first, advance on the next tick
      var idx = slNearest();
      if (slSetW > 0 && idx >= items.length) {
        idx -= items.length;
        var el = items[idx];
        rack.scrollLeft = Math.max(0, el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2);
      }
      slGoto(idx + 1);
    }
    function slPause(ms) { slHold = Date.now() + (ms || 4000); }

    function slSetup() {
      if (slOn || items.length < 2) return;
      slOn = true;
      items.forEach(function (it, k) {
        var c = it.cloneNode(true);
        c.setAttribute('data-rk-clone', '1');
        c.removeAttribute('data-rk-item');
        c.setAttribute('tabindex', '-1');
        c.setAttribute('aria-hidden', 'true');
        c.style.visibility = '';
        c.style.setProperty('--rk-p', '0');
        c.classList.remove('rk-live');
        stripEditorAttrs(c);
        var o = states[k], cg = c.querySelector('.rk-garment');
        var cs = { it: c, g: cg, views: viewsOf(cg), p: 0, t: 0, asp: o.asp, flip: o.flip, hpx: o.hpx, blockId: o.blockId, orig: o };
        c.addEventListener('click', function (e) { itemTap(e, cs); });
        rack.appendChild(c);
        slClones.push(c);
        cloneStates.push(cs);
      });
      slSyncWidths();
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        slDots = items.map(function (it, k) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'rk-dot' + (k === 0 ? ' rk-dot-on' : '');
          b.setAttribute('aria-label', 'Go to ' + (it.getAttribute('data-name') || 'product ' + (k + 1)));
          b.addEventListener('click', function () { slPause(); slNorm(); slGoto(k); });
          dotsWrap.appendChild(b);
          return b;
        });
      }
      slGoto(0, false);
      slDotsUpdate();
      if (!reduceMotion) slTimer = setInterval(slTick, SL_MS);
    }
    function slTeardown() {
      if (!slOn) return;
      slOn = false;
      if (slTimer) { clearInterval(slTimer); slTimer = null; }
      slClones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      slClones = []; slSetW = 0;
      if (tapSel && tapSel.orig !== tapSel) tapSel = null;
      if (tapBack && tapBack.orig !== tapBack) tapBack = null;
      cloneStates = [];
      if (dotsWrap) dotsWrap.innerHTML = '';
      slDots = [];
      rack.scrollLeft = 0;
      initWidths();
    }
    function slCheck() {
      if (dead) return;
      if (tapSel) setTapped(null);
      if (slMQ && slMQ.matches) {
        if (curHover) setHover(null);
        if (!slOn) { initWidths(); slSetup(); } else slSyncWidths();
      } else {
        slTeardown();
      }
    }

    // persistent slider listeners (registered once; no-ops while slider is off)
    if (dotsWrap) {
      var dOn = false;
      var dScrub = function (x) {
        var r = dotsWrap.getBoundingClientRect();
        var f = Math.max(0, Math.min(0.999, (x - r.left) / r.width));
        slGoto(Math.floor(f * items.length));
      };
      var dEnd = function () {
        if (!dOn) return;
        dOn = false;
        dotsWrap.classList.remove('rk-dots-drag');
        slPause();
      };
      on(dotsWrap, 'pointerdown', function (ev) {
        if (!slOn) return;
        dOn = true; slPause(6000); slNorm();
        dotsWrap.classList.add('rk-dots-drag');
        try { dotsWrap.setPointerCapture(ev.pointerId); } catch (e) {}
        dScrub(ev.clientX);
        ev.preventDefault();
      });
      on(dotsWrap, 'pointermove', function (ev) { if (dOn) dScrub(ev.clientX); });
      on(dotsWrap, 'pointerup', dEnd);
      on(dotsWrap, 'pointercancel', dEnd);
    }
    on(rack, 'scroll', function () { if (slOn) slDotsUpdate(); }, { passive: true });
    on(rack, 'touchstart', function () { if (slOn) slPause(); }, { passive: true });
    on(rack, 'touchend', function () {
      if (!slOn) return;
      slPause();
      if (slNormTimer) clearTimeout(slNormTimer);
      slNormTimer = setTimeout(function () { if (!tapSel) slNorm(); }, 450);
    }, { passive: true });
    // swiping the tapped garment away turns it back
    on(rack, 'scroll', function () {
      if (!slOn || !tapSel) return;
      if (tapScrollT) clearTimeout(tapScrollT);
      tapScrollT = setTimeout(function () {
        tapScrollT = null;
        if (dead || !slOn || !tapSel) return;
        if (slAll()[slNearest()] !== tapSel.it) setTapped(null);
      }, 180);
    }, { passive: true });
    on(window, 'load', function () { if (slOn) { slSyncWidths(); slDotsUpdate(); } });

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

    slCheck();
    if (slMQ) {
      if (slMQ.addEventListener) on(slMQ, 'change', slCheck);
      else if (slMQ.addListener) slMQ.addListener(slCheck);
    }

    /* ---------- theme editor hooks ---------- */
    function select(blockId) {
      var s = states.filter(function (x) { return x.blockId === blockId; })[0];
      if (!s) return;
      if (slOn) { slPause(10000); slNorm(); slGoto(states.indexOf(s)); }
      else setHover(s);
    }
    function deselect() { if (!slOn) setHover(null); }

    function destroy() {
      dead = true;
      if (isOpen()) { try { document.body.style.overflow = prevOverflow; } catch (e) {} }
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners = [];
      if (slMQ && !slMQ.addEventListener && slMQ.removeListener) slMQ.removeListener(slCheck);
      if (rafId) cancelAnimationFrame(rafId);
      if (fAnim) cancelAnimationFrame(fAnim);
      if (swingRaf) cancelAnimationFrame(swingRaf);
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
      if (slTimer) clearInterval(slTimer);
      [capTimer, fCloseTimer, slNormTimer, tapScrollT].concat(timers).forEach(function (t) { if (t) clearTimeout(t); });
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
    [].forEach.call((root || document).querySelectorAll('[data-rk-section]'), function (sec) { init(sec, opts); });
  }
  function instFor(target) {
    var sec = target && target.closest ? target.closest('[data-rk-section]') : null;
    return sec ? instances.get(sec) : null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // in the theme editor, re-renders after a setting change skip the drop-in
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target, { noDrop: true }); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rk-section]'), destroy);
  });
  document.addEventListener('shopify:block:select', function (e) {
    var inst = instFor(e.target);
    if (inst && e.detail) inst.select(e.detail.blockId);
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var inst = instFor(e.target);
    if (inst) inst.deselect();
  });

  window.RackShowcase = { init: init, destroy: destroy, initAll: initAll };
})();


/* --- NEXT SCRIPT --- */


/* Rack Showcase — Shopify section script (Phase 1).
 * One instance per [data-rk-section]. Re-initialises and cleans up with the
 * theme editor (shopify:section:load / unload, block:select / deselect). */
(function () {
  'use strict';
  if (window.RackShowcase) return;

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
        var w = Math.min(120, im.naturalWidth || 1);
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
      [].forEach.call(document.querySelectorAll('.rk-view img'), function (el) {
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
    var rack = sec.querySelector('[data-rk-rack]');
    if (!rack) { sec.classList.remove('rk-pre'); return null; }
    var items = [].slice.call(rack.querySelectorAll('[data-rk-item]'));
    if (!items.length) { sec.classList.remove('rk-pre'); return null; }

    var HOVER_MS = num(sec, 'data-hover-speed', 650);
    var HOVER_GAP = num(sec, 'data-hover-gap', 18);
    var TURN_MS = num(sec, 'data-turn-speed', 700);
    var SL_MS = num(sec, 'data-slide-interval', 3000);
    var SWING = clamp(num(sec, 'data-swing', 60), 0, 100) / 100;
    var DROP = sec.getAttribute('data-drop') === 'true';
    var LIFT = sec.getAttribute('data-lift') === 'true';
    var AFTER = sec.getAttribute('data-after') || 'drawer';
    var TOTAL = items.length;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fineHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var slMQ = window.matchMedia ? window.matchMedia('(max-width:599.98px)') : null;
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

    // slider state (declared early: initWidths references it)
    var slOn = false, slTimer = null, slClones = [], slSetW = 0, slDots = [], slHold = 0, slNormTimer = null;
    // touch two-tap state: tapSel = garment turned by a first tap, tapBack = garment to turn back after the modal closes
    var cloneStates = [], tapSel = null, tapBack = null, lastPtr = '', tapScrollT = null;
    var visible = true;

    items.forEach(function (it, i) { it.setAttribute('data-idx', '' + (i + 1)); });

    /* caption swap */
    var capEl = sec.querySelector('[data-rk-caption]');
    var capDefault = capEl ? capEl.innerHTML : '';
    var capCur = '', capTimer = null;
    function setCaption(txt) {
      var key = txt === null ? '' : txt;
      if (!capEl || capCur === key) return;
      capCur = key;
      capEl.classList.add('rk-cap-swap');
      if (capTimer) clearTimeout(capTimer);
      capTimer = setTimeout(function () {
        if (txt === null) capEl.innerHTML = capDefault;
        else capEl.textContent = txt;
        capEl.classList.remove('rk-cap-swap');
      }, 160);
    }

    /* views + widths */
    function viewsOf(root) {
      return [].slice.call(root.querySelectorAll('.rk-view')).map(function (el) {
        return { el: el, pos: parseFloat(el.getAttribute('data-rk-pos')) };
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
      var g = it.querySelector('.rk-garment');
      return { it: it, g: g, views: viewsOf(g), p: 0, t: 0, asp: null, hpx: 0, blockId: it.getAttribute('data-block-id') };
    });
    states.forEach(function (s) { blend(s.views, 0); s.orig = s; });
    // originals + slider clones (clones turn on tap too)
    function turnStates() { return cloneStates.length ? states.concat(cloneStates) : states; }

    function aspectOf(view) {
      var img = view.el.querySelector('img');
      if (!img) return null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
      var aw = +img.getAttribute('width'), ah = +img.getAttribute('height');   // known before load
      return aw > 0 && ah > 0 ? aw / ah : null;
    }
    function refreshAspects() {
      states.forEach(function (s) {
        var pts = [];
        s.views.forEach(function (v) {
          if (v.pos >= 0) {
            var a = aspectOf(v);
            if (a) pts.push({ pos: v.pos, asp: a });
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
    function measureHeights() {
      states.forEach(function (s) { s.hpx = s.g.getBoundingClientRect().height || 0; });
    }
    function autoFitHeight() {
      rack.style.removeProperty('--rk-h');
      if (slMQ && slMQ.matches) return;
      var cs = window.getComputedStyle(rack);
      var base = parseFloat(cs.getPropertyValue('--rk-h')) || 260;
      var gap = parseFloat(cs.columnGap) || 0;
      var W = rack.clientWidth;
      var sumSide = 0, maxDelta = 0;
      states.forEach(function (s) {
        var a0 = aspectAt(s, 0), a1 = aspectAt(s, 1);
        sumSide += a0;
        if (a1 - a0 > maxDelta) maxDelta = a1 - a0;
      });
      if (sumSide > 0 && W > 0) {
        var hFit = (W - gap * (states.length - 1) - 8 - HOVER_GAP * 2) / (sumSide + maxDelta);
        var h = Math.min(base, Math.max(80, hFit));
        rack.style.setProperty('--rk-h', h.toFixed(1) + 'px');
      }
    }
    function applyWidth(s, e) {
      if (!s.hpx) return;
      s.it.style.width = Math.round(s.hpx * aspectAt(s, e)) + 'px';
    }
    function initWidths() {
      if (dead) return;
      refreshAspects();
      autoFitHeight();
      measureHeights();
      states.forEach(function (s) { applyWidth(s, s.t); });
      if (slOn) slSyncWidths();
    }
    var widthsQueued = false;
    function queueWidths() {
      if (widthsQueued) return;
      widthsQueued = true;
      requestAnimationFrame(function () { widthsQueued = false; initWidths(); });
    }
    initWidths();
    on(window, 'load', queueWidths);
    on(window, 'resize', queueWidths);

    [].forEach.call(rack.querySelectorAll('.rk-view img[src]'), function (im) {
      if (im.complete && im.naturalWidth > 0) measureTopGap(im);
      else on(im, 'load', function () { queueWidths(); measureTopGap(im); }, { once: true });
    });

    /* ================= SWING PHYSICS =================
       Each hanger is a damped pendulum around its hook.
       a = angle (deg, + means the hem swings right), v = angular velocity (deg/s). */
    var swingOn = SWING > 0 && !reduceMotion;
    var K_SPRING = 26, K_DAMP = 2.3, MAX_A = 11;
    var swingRaf = 0, swingLast = 0;
    function swingEls() { return items.concat(slClones); }
    function impulse(el, v) {
      if (!swingOn || !el || dead) return;
      var s = el._rkSw || (el._rkSw = { a: 0, v: 0 });
      s.v += v * SWING;
      if (!swingRaf) { swingLast = 0; swingRaf = requestAnimationFrame(swingLoop); }
    }
    function swingLoop(ts) {
      if (dead) return;
      var dt = swingLast ? Math.min(0.05, (ts - swingLast) / 1000) : 1 / 60;
      swingLast = ts;
      var live = false;
      swingEls().forEach(function (el) {
        var s = el._rkSw;
        if (!s) return;
        if (Math.abs(s.a) < 0.03 && Math.abs(s.v) < 0.08) {
          if (s.a !== 0 || s.v !== 0) { s.a = 0; s.v = 0; el.style.setProperty('--rk-sw', '0deg'); }
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
        el.style.setProperty('--rk-sw', (-s.a).toFixed(2) + 'deg');
        live = true;
      });
      swingRaf = live ? requestAnimationFrame(swingLoop) : 0;
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
      swingEls().forEach(function (el, i) {
        impulse(el, clamp(sp * 9, -16, 16) * (i % 2 ? 1 : -0.8) * (0.8 + (i % 3) * 0.15));
      });
    }, { passive: true });

    // horizontal rack scroll (mobile slider): garments lag behind the swipe
    var rxL = 0, rxT = 0;
    on(rack, 'scroll', function () {
      if (!swingOn || !slOn) return;
      var now = performance.now();
      if (now - rxT < 70) return;
      var x = rack.scrollLeft, dt = now - rxT, dx = x - rxL;
      rxL = x; rxT = now;
      if (dt > 300 || Math.abs(dx) > 500 || !dx) return;
      var sp = dx / dt;
      swingEls().forEach(function (el) { impulse(el, clamp(-sp * 14, -28, 28)); });
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
        s.it.style.setProperty('--rk-p', e.toFixed(4));
        s.it.classList.toggle('rk-live', e > 0.02);
        if (s.flip) {
          var sideOp = Math.max(0, Math.min(1, (0.56 - e) / 0.12));
          var frontOp = Math.max(0, Math.min(1, (e - 0.44) / 0.12));
          s.views.forEach(function (v) {
            var o = v.pos === 0 ? sideOp : (v.pos === 1 ? frontOp : 0);
            v.el.style.opacity = o;
            if (v.pos === 0) {
              var sAng = Math.min(1, e * 2) * -84;
              v.el.style.transform = e <= 0 ? 'none' : 'perspective(900px) rotateY(' + sAng.toFixed(2) + 'deg)';
            } else if (v.pos === 1) {
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
      if (curHover === s) return;
      var prev = curHover;
      if (curHover) { curHover.t = 0; applyWidth(curHover, 0); }
      curHover = s;
      if (curHover) {
        var hov = curHover;
        later(function () { if (curHover === hov) prefetchHi(hov.it); }, 140);   // hover intent
        curHover.t = 1;
        applyWidth(curHover, 1);
        setCaption(curHover.it.getAttribute('data-name') || null);
        // turning garment widens and nudges its neighbours aside
        var i = states.indexOf(curHover);
        if (states[i - 1]) impulse(states[i - 1].it, -26);
        if (states[i + 1]) impulse(states[i + 1].it, 26);
      } else {
        setCaption(null);
      }
      if (prev && prev !== curHover) {
        var j = states.indexOf(prev);
        if (states[j - 1] && states[j - 1] !== curHover) impulse(states[j - 1].it, 12);
        if (states[j + 1] && states[j + 1] !== curHover) impulse(states[j + 1].it, -12);
      }
      kick();
    }
    if (fineHover) {
      var mX = 0, mT = 0;
      on(rack, 'mousemove', function (ev) {
        var x = ev.clientX, y = ev.clientY, now = performance.now();

        // brushing past a hanger sets it swinging in the cursor's direction
        if (mT && now - mT < 100 && swingOn) {
          var vx = (x - mX) / Math.max(1, now - mT);
          states.forEach(function (st) {
            if (st === curHover) return;
            var r = st.it.getBoundingClientRect();
            if (y < r.top || y > r.bottom) return;
            var c = (r.left + r.right) / 2;
            if ((mX - c) * (x - c) < 0) impulse(st.it, clamp(vx * 24, -50, 50));
          });
        }
        mX = x; mT = now;

        if (curHover) {
          var cr = curHover.it.getBoundingClientRect();
          if (x >= cr.left - 20 && x <= cr.right + 20 && y >= cr.top - 10 && y <= cr.bottom + 40) return;
        }
        var best = null, bd = 1e9;
        states.forEach(function (s) {
          var r = s.it.getBoundingClientRect();
          if (y < r.top - 10 || y > r.bottom + 40) return;
          if (x < r.left - 2 || x > r.right + 2) return;
          var d = Math.abs(x - (r.left + r.right) / 2);
          if (d < bd) { bd = d; best = s; }
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
      var prev = tapSel;
      if (prev) { prev.t = 0; applyWidth(prev, 0); }
      tapSel = s;
      if (s) {
        s.t = 1;
        applyWidth(s, 1);
        prefetchHi(s.it);
        setCaption(s.it.getAttribute('data-name') || null);
        impulse(s.it.previousElementSibling, -26);
        impulse(s.it.nextElementSibling, 26);
      } else {
        setCaption(null);
      }
      kick();
    }
    function releaseTapBack() {
      var b = tapBack;
      tapBack = null;
      if (!b || dead || tapSel === b) return;
      b.t = 0;
      applyWidth(b, 0);
      setCaption(null);
      kick();
    }
    function itemTap(e, s) {
      e.preventDefault();
      if (slOn) slPause(6000);
      if (touchTap() && tapSel !== s) {
        setTapped(s);                                         // first tap: show the front
        if (slOn) {
          var i = slAll().indexOf(s.it);
          slGoto(i);                                          // centre it…
          later(function () { if (tapSel === s) slGoto(i); }, HOVER_MS + 40);   // …again once widened
        }
        return;
      }
      if (tapSel && tapSel !== s) setTapped(null);
      if (tapSel === s) { tapBack = s; tapSel = null; }       // turns back side-on after the modal closes
      openFocus(s.orig, s.it);                                // second tap (or mouse click): open the modal
    }
    // tapping anywhere outside a garment turns the tapped one back
    on(document, 'pointerdown', function (e) {
      if (!tapSel) return;
      var it = e.target && e.target.closest ? e.target.closest('.rk-item') : null;
      if (!it || !rack.contains(it)) setTapped(null);
    }, true);

    states.forEach(function (s) {
      on(s.it, 'click', function (e) { itemTap(e, s); });
      on(s.it, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFocus(s, s.it); }
      });
      on(s.it, 'focus', function () { if (!slOn && !touchTap()) setHover(s); });
      on(s.it, 'blur', function () { if (!slOn && curHover === s) setHover(null); });
    });

    /* ================= DROP-IN ENTRANCE ================= */
    var dropped = !DROP || reduceMotion || !canAnimate || !!opts.noDrop || !('IntersectionObserver' in window);
    if (dropped) sec.classList.remove('rk-pre');
    var dropWaiting = false;
    function railReady(maxMs, cb) {
      var vw = window.innerWidth, pending = 0, fired = false;
      function go() { if (!fired) { fired = true; cb(); } }
      items.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;
        var im = it.querySelector('.rk-view[data-rk-pos="0"] img');
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
      swingEls().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;          // off-screen slider clones: no show
        var delay = 120 + n * 85, dir = n % 2 ? -1 : 1;
        n++;
        el.animate([
          { transform: 'translateY(-90px) rotate(' + (dir * 7) + 'deg)', opacity: 0 },
          { transform: 'translateY(9px) rotate(' + (-dir * 2) + 'deg)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
        ], { duration: 640, delay: delay, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
        later(function () { impulse(el, dir * 34); }, delay + 560);   // lands on the rod and sways
      });
      sec.classList.remove('rk-pre');
    }

    /* ================= FOCUS VIEW ================= */
    var focus = sec.querySelector('[data-rk-focus]');
    if (focus) {
      // copy the section's CSS variables, then move to <body> so position:fixed
      // is never trapped by a transformed ancestor in the theme
      focus.setAttribute('style', sec.getAttribute('style') || '');
      document.body.appendChild(focus);
    }
    function q(sel) { return focus ? focus.querySelector(sel) : null; }
    var fbg = q('[data-rk-fbg]');
    var finner = q('[data-rk-finner]');
    var fstage = q('[data-rk-fstage]');
    var fname = q('[data-rk-fname]');
    var fsub = q('[data-rk-fsub]');
    var fprice = q('[data-rk-fprice]');
    var fidx = q('[data-rk-fidx]');
    var facBar = q('[data-rk-factionbar]');
    var facName = q('[data-rk-factionname]');
    var facBtn = q('[data-rk-factionbtn]');
    var facLbl = q('[data-rk-factionlabel]');
    var tabF = q('[data-rk-tab="front"]');
    var tabB = q('[data-rk-tab="back"]');
    var closeBtn = q('.rk-focus-close');
    var fGarment = null, fAng = 0, fAngT = 0, fAnim = null, fLast = 0, prevOverflow = '';
    var fCloseTimer = null, lastActive = null;
    var fSrc = null, fState = null, fFlight = null, closing = false;

    function T(key, fb) { return (focus && focus.getAttribute('data-t-' + key)) || fb; }
    var STR = {
      add: T('add', 'Add to cart'),
      soldout: T('soldout', 'Sold out'),
      added: T('added', 'Added to cart'),
      viewcart: T('viewcart', 'View cart'),
      unavailable: T('unavailable', 'Unavailable'),
      error: T('error', 'Could not add to cart. Please try again.')
    };

    function isOpen() { return !!focus && focus.classList.contains('rk-focus-open'); }
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
      if (tabF) { tabF.classList.toggle('rk-tab-on', front); tabF.setAttribute('aria-pressed', front ? 'true' : 'false'); }
      if (tabB) { tabB.classList.toggle('rk-tab-on', !front); tabB.setAttribute('aria-pressed', front ? 'false' : 'true'); }
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
      if (fstage) fstage.classList.remove('rk-dragging');
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
        fstage.classList.add('rk-dragging');
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
      if (fstage) fstage.classList.remove('rk-pop', 'rk-fade');
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
      clone.removeAttribute('data-rk-item');
      clone.classList.remove('rk-live');
      clone.style.setProperty('--rk-p', '1');
      clone.style.setProperty('--rk-sw', '0deg');
      [].forEach.call(clone.querySelectorAll('.rk-view'), function (v) {
        v.style.transform = '';
        v.style.opacity = '';
      });
      [].forEach.call(clone.querySelectorAll('img'), function (im) {
        im.removeAttribute('loading');
        im.removeAttribute('fetchpriority');
        var hi = im.getAttribute('data-hi');
        if (hi && im.getAttribute('src') !== hi) im.setAttribute('src', hi);   // low-res stays visible until hi arrives
      });
      var cg = clone.querySelector('.rk-garment');
      if (cg) cg.style.transform = 'rotateY(0deg)';
      fstage.appendChild(clone);
      fGarment = cg;
      fAng = 0; fAngT = 0;
      setTabs(true);

      var name = s.it.getAttribute('data-name') || '';
      var sub = s.it.getAttribute('data-sub') || '';
      var price = s.it.getAttribute('data-price') || '';
      if (fname) fname.textContent = name;
      if (fsub) { fsub.textContent = sub; fsub.style.display = sub ? '' : 'none'; }
      if (fprice) { fprice.textContent = price; fprice.style.display = price ? '' : 'none'; }
      if (fidx) fidx.textContent = pad2(s.it.getAttribute('data-idx') || '1') + ' / ' + pad2(TOTAL);
      focus.setAttribute('aria-label', name || 'Product view');

      if (facName) facName.textContent = name;
      var bLbl = (s.it.getAttribute('data-btn-label') || '').trim();
      var bUrl = s.it.getAttribute('data-btn-url') || '';
      var bTgt = s.it.getAttribute('data-btn-target') || '';
      if (facLbl) facLbl.textContent = bLbl;
      if (facBtn) {
        facBtn.setAttribute('href', bUrl || '#');
        facBtn.setAttribute('target', bTgt === '_blank' ? '_blank' : '_self');
        if (bTgt === '_blank') facBtn.setAttribute('rel', 'noopener');
        else facBtn.removeAttribute('rel');
      }
      if (facBar) facBar.classList.toggle('rk-no-btn', !bLbl);

      qaSetup(s);

      var srcG = srcEl.querySelector('.rk-garment');
      var fromRect = srcG ? srcG.getBoundingClientRect() : null;

      try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
      focus.classList.add('rk-focus-open');
      focus.setAttribute('aria-hidden', 'false');
      focus.scrollTop = 0;
      fState = s;

      if (LIFT && canAnimate && !reduceMotion && inView(fromRect)) {
        fSrc = srcEl;
        srcEl.style.visibility = 'hidden';           // the hanger is now empty
        fFlight = flight(fromRect, false);
      } else {
        void fstage.offsetWidth;
        fstage.classList.add('rk-pop');
      }

      requestAnimationFrame(function () { focus.classList.add('rk-focus-in'); });
      if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); } }
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    function landBack(src, s) {
      impulse(src, (Math.random() > 0.5 ? 1 : -1) * 40);
      // it lands facing you, then turns back to its side-on resting pose
      if (s && src === s.it && s !== curHover && s.flip) { s.p = 1; s.t = 0; kick(); }
    }

    function closeFocus() {
      if (!isOpen() || closing) return;
      closing = true;
      if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
      fDrag = false;
      if (fstage) fstage.classList.remove('rk-dragging');
      focus.classList.remove('rk-focus-in');
      focus.setAttribute('aria-hidden', 'true');
      try { document.body.style.overflow = prevOverflow; } catch (e) {}

      var src = fSrc, s = fState;
      var srcG = src && src.isConnected ? src.querySelector('.rk-garment') : null;
      var r = srcG ? srcG.getBoundingClientRect() : null;

      function finish() {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
        focus.classList.remove('rk-focus-open');
        fstage.classList.remove('rk-pop', 'rk-fade');
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
        fstage.classList.add('rk-fade');
        releaseTapBack();
        fCloseTimer = setTimeout(finish, 320);
      }
      if (lastActive && lastActive.isConnected && lastActive.focus) {
        try { lastActive.focus({ preventScroll: true }); } catch (e) {}
      }
      slPause();
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

    /* ================= QUICK ADD ================= */
    var qa = q('[data-rk-qa]'), qaOpts = q('[data-rk-qa-opts]'), qaBtn = q('[data-rk-qa-btn]');
    var qaLbl = q('[data-rk-qa-lbl]'), qaMsg = q('[data-rk-qa-msg]');
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
      if (!qa) { if (focus) focus.classList.remove('rk-split'); return; }
      var el = s.it.querySelector('[data-rk-json]');
      if (el) { try { qaData = JSON.parse(el.textContent); } catch (e) { qaData = null; } }
      if (!qaData || !qaData.variants || !qaData.variants.length) {
        qa.hidden = true;
        focus.classList.remove('rk-split');
        return;
      }
      qa.hidden = false;
      focus.classList.add('rk-split');
      qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
      qaBtn.classList.remove('rk-done', 'rk-busy');
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
        row.className = 'rk-qa-opt';
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', o.name);
        var lab = document.createElement('div');
        lab.className = 'rk-qa-optname';
        lab.textContent = o.name;
        var pills = document.createElement('div');
        pills.className = 'rk-qa-pills';
        o.values.forEach(function (val) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'rk-pill';
          b.textContent = val;
          b.setAttribute('data-oi', oi);
          b.setAttribute('data-val', val);
          b.addEventListener('click', function () {
            qaSel[oi] = val;
            qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
            qaBtn.classList.remove('rk-done');
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
      [].forEach.call(qaOpts.querySelectorAll('.rk-pill'), function (b) {
        var oi = +b.getAttribute('data-oi'), val = b.getAttribute('data-val');
        b.setAttribute('aria-pressed', qaSel[oi] === val ? 'true' : 'false');
        var test = qaSel.slice(); test[oi] = val;
        var v = qaFind(test), na = !v || !v.av;
        b.classList.toggle('rk-na', na);
        b.setAttribute('aria-label', val + (na ? ' – ' + STR.soldout : ''));
      });
      if (qaBtn.classList.contains('rk-done')) return;
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
          detail: { items: cart.items, source: 'rack-showcase', sourceId: sec.id, itemCount: 1, sections: res && res.sections ? res.sections : undefined, didError: false }
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
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'rack-showcase', cartData: cart });
        }
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('cart:update', { bubbles: true, detail: { resource: cart, sourceId: sec.id, data: { source: 'rack-showcase', itemCount: cart.item_count, sections: (res && res.sections) || {} } } }));
      if (AFTER === 'drawer') openThemeCart();
    }

    function qaAdd() {
      if (!qaVariant || !qaVariant.av || qaBusy) return;
      qaBusy = true;
      qaBtn.disabled = true;
      qaBtn.classList.add('rk-busy');
      qaMsg.textContent = ''; qaMsg.classList.remove('rk-err');
      var root = cartRoot(), vid = qaVariant.id;
      var ids = cartSectionIds();
      var dawn = dawnDrawer();
      if (dawn) { try { ids = ids.concat(dawn.getSectionsToRender().map(function (x) { return x.section || x.id; })); } catch (e) {} }
      if (document.getElementById('cart-icon-bubble')) ids.push('cart-icon-bubble');
      ids = uniq(ids);
      var body = { items: [{ id: vid, quantity: 1 }] };
      if (ids.length) { body.sections = ids.join(','); body.sections_url = window.location.pathname; }
      var addRes = null;
      fetch(root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
          return fetch(root + 'cart.js', { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); });
        })
        .then(function (cart) {
          if (dead) return;
          if (AFTER === 'cart') { window.location.href = root + 'cart'; return; }
          qaBtn.classList.add('rk-done');
          qaLbl.textContent = STR.added;
          qaMsg.innerHTML = '';
          var a = document.createElement('a');
          a.href = root + 'cart';
          a.textContent = STR.viewcart + ' →';
          qaMsg.appendChild(a);
          flyToCart();
          document.dispatchEvent(new CustomEvent('rack-showcase:added', { detail: { variantId: vid, cart: cart } }));
          document.dispatchEvent(new CustomEvent('rack:cart-updated', { detail: cart }));
          if (AFTER === 'drawer') later(closeFocus, 380);   // let the piece fly to the cart, then make room for the drawer
          announceStandard(cart, vid, addRes).then(function (handled) {
            if (dead) return;
            if (handled) { if (AFTER === 'drawer') later(openThemeCart, 420); }
            else legacyCartUI(cart, addRes, vid);
          });
          later(function () {
            if (!qaBtn.classList.contains('rk-done')) return;
            qaBtn.classList.remove('rk-done');
            qaUpdate();
          }, 2600);
        })
        .catch(function (err) {
          if (dead) return;
          qaMsg.textContent = (err && err.message) || STR.error;
          qaMsg.classList.add('rk-err');
        })
        .then(function () {
          if (dead) return;
          qaBusy = false;
          qaBtn.classList.remove('rk-busy');
          if (qaBtn.classList.contains('rk-done')) qaBtn.disabled = false;
          else qaUpdate();
        });
    }
    if (qaBtn) on(qaBtn, 'click', function (e) { e.preventDefault(); qaAdd(); });

    function flyToCart() {
      if (reduceMotion || !canAnimate || !fstage) return;
      var img = fstage.querySelector('.rk-view[data-rk-pos="1"] img');
      if (!img) return;
      var from = img.getBoundingClientRect();
      if (!from.width) return;
      var target = document.querySelector('#cart-icon-bubble, [data-cart-icon], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = document.createElement('img');
      f.src = img.currentSrc || img.src;
      f.alt = '';
      f.className = 'rk-fly';
      f.style.left = from.left + 'px';
      f.style.top = from.top + 'px';
      f.style.width = from.width + 'px';
      f.style.height = from.height + 'px';
      document.body.appendChild(f);
      var dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
      var dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
      var a = f.animate([
        { transform: 'translate(0,0) scale(.9)', opacity: 0.95 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - 70) + 'px) scale(.32) rotate(-8deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-14deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (target && target.animate) {
          target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }],
            { duration: 380, easing: 'ease-out' });
        }
      };
    }

    /* ================= MOBILE SLIDER (< 600px) ================= */
    var dotsWrap = sec.querySelector('[data-rk-dots]');

    function slAll() { return items.concat(slClones); }
    function slNearest() {
      var center = rack.scrollLeft + rack.clientWidth / 2, best = 0, bd = 1e9;
      slAll().forEach(function (el, i) {
        var c = el.offsetLeft + el.offsetWidth / 2;
        var d = Math.abs(c - center);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function slGoto(i, smooth) {
      var el = slAll()[i];
      if (!el) return;
      rack.scrollTo({
        left: el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2,
        behavior: smooth === false || reduceMotion ? 'auto' : 'smooth'
      });
    }
    function slNorm() {
      if (slSetW <= 0 || !slClones.length) return;
      if (rack.scrollLeft >= slSetW) rack.scrollLeft = rack.scrollLeft - slSetW;
      else if (slNearest() >= items.length) rack.scrollLeft = Math.max(0, rack.scrollLeft - slSetW);
    }
    function slDotsUpdate() {
      if (!slDots.length) return;
      var i = slNearest() % items.length;
      slDots.forEach(function (d, k) {
        d.classList.toggle('rk-dot-on', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    }
    function slSyncWidths() {
      slClones.forEach(function (c, k) {
        var cs = cloneStates[k], o = cs && cs.orig;
        if (cs && o && o.hpx) {
          cs.asp = o.asp; cs.flip = o.flip; cs.hpx = o.hpx;
          applyWidth(cs, cs.t);
        } else {
          var it = items[k % items.length];
          if (it) c.style.width = it.style.width || getComputedStyle(it).width;
        }
      });
      if (slClones.length && !tapSel) slSetW = slClones[0].offsetLeft - items[0].offsetLeft;
    }
    function slTick() {
      if (!slOn || !visible || document.hidden) return;
      if (slHold > Date.now()) return;
      if (isOpen()) return;
      if (tapSel) { setTapped(null); return; }   // turn back first, advance on the next tick
      var idx = slNearest();
      if (slSetW > 0 && idx >= items.length) {
        idx -= items.length;
        var el = items[idx];
        rack.scrollLeft = Math.max(0, el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2);
      }
      slGoto(idx + 1);
    }
    function slPause(ms) { slHold = Date.now() + (ms || 4000); }

    function slSetup() {
      if (slOn || items.length < 2) return;
      slOn = true;
      items.forEach(function (it, k) {
        var c = it.cloneNode(true);
        c.setAttribute('data-rk-clone', '1');
        c.removeAttribute('data-rk-item');
        c.setAttribute('tabindex', '-1');
        c.setAttribute('aria-hidden', 'true');
        c.style.visibility = '';
        c.style.setProperty('--rk-p', '0');
        c.classList.remove('rk-live');
        stripEditorAttrs(c);
        var o = states[k], cg = c.querySelector('.rk-garment');
        var cs = { it: c, g: cg, views: viewsOf(cg), p: 0, t: 0, asp: o.asp, flip: o.flip, hpx: o.hpx, blockId: o.blockId, orig: o };
        c.addEventListener('click', function (e) { itemTap(e, cs); });
        rack.appendChild(c);
        slClones.push(c);
        cloneStates.push(cs);
      });
      slSyncWidths();
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        slDots = items.map(function (it, k) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'rk-dot' + (k === 0 ? ' rk-dot-on' : '');
          b.setAttribute('aria-label', 'Go to ' + (it.getAttribute('data-name') || 'product ' + (k + 1)));
          b.addEventListener('click', function () { slPause(); slNorm(); slGoto(k); });
          dotsWrap.appendChild(b);
          return b;
        });
      }
      slGoto(0, false);
      slDotsUpdate();
      if (!reduceMotion) slTimer = setInterval(slTick, SL_MS);
    }
    function slTeardown() {
      if (!slOn) return;
      slOn = false;
      if (slTimer) { clearInterval(slTimer); slTimer = null; }
      slClones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      slClones = []; slSetW = 0;
      if (tapSel && tapSel.orig !== tapSel) tapSel = null;
      if (tapBack && tapBack.orig !== tapBack) tapBack = null;
      cloneStates = [];
      if (dotsWrap) dotsWrap.innerHTML = '';
      slDots = [];
      rack.scrollLeft = 0;
      initWidths();
    }
    function slCheck() {
      if (dead) return;
      if (tapSel) setTapped(null);
      if (slMQ && slMQ.matches) {
        if (curHover) setHover(null);
        if (!slOn) { initWidths(); slSetup(); } else slSyncWidths();
      } else {
        slTeardown();
      }
    }

    // persistent slider listeners (registered once; no-ops while slider is off)
    if (dotsWrap) {
      var dOn = false;
      var dScrub = function (x) {
        var r = dotsWrap.getBoundingClientRect();
        var f = Math.max(0, Math.min(0.999, (x - r.left) / r.width));
        slGoto(Math.floor(f * items.length));
      };
      var dEnd = function () {
        if (!dOn) return;
        dOn = false;
        dotsWrap.classList.remove('rk-dots-drag');
        slPause();
      };
      on(dotsWrap, 'pointerdown', function (ev) {
        if (!slOn) return;
        dOn = true; slPause(6000); slNorm();
        dotsWrap.classList.add('rk-dots-drag');
        try { dotsWrap.setPointerCapture(ev.pointerId); } catch (e) {}
        dScrub(ev.clientX);
        ev.preventDefault();
      });
      on(dotsWrap, 'pointermove', function (ev) { if (dOn) dScrub(ev.clientX); });
      on(dotsWrap, 'pointerup', dEnd);
      on(dotsWrap, 'pointercancel', dEnd);
    }
    on(rack, 'scroll', function () { if (slOn) slDotsUpdate(); }, { passive: true });
    on(rack, 'touchstart', function () { if (slOn) slPause(); }, { passive: true });
    on(rack, 'touchend', function () {
      if (!slOn) return;
      slPause();
      if (slNormTimer) clearTimeout(slNormTimer);
      slNormTimer = setTimeout(function () { if (!tapSel) slNorm(); }, 450);
    }, { passive: true });
    // swiping the tapped garment away turns it back
    on(rack, 'scroll', function () {
      if (!slOn || !tapSel) return;
      if (tapScrollT) clearTimeout(tapScrollT);
      tapScrollT = setTimeout(function () {
        tapScrollT = null;
        if (dead || !slOn || !tapSel) return;
        if (slAll()[slNearest()] !== tapSel.it) setTapped(null);
      }, 180);
    }, { passive: true });
    on(window, 'load', function () { if (slOn) { slSyncWidths(); slDotsUpdate(); } });

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

    slCheck();
    if (slMQ) {
      if (slMQ.addEventListener) on(slMQ, 'change', slCheck);
      else if (slMQ.addListener) slMQ.addListener(slCheck);
    }

    /* ---------- theme editor hooks ---------- */
    function select(blockId) {
      var s = states.filter(function (x) { return x.blockId === blockId; })[0];
      if (!s) return;
      if (slOn) { slPause(10000); slNorm(); slGoto(states.indexOf(s)); }
      else setHover(s);
    }
    function deselect() { if (!slOn) setHover(null); }

    function destroy() {
      dead = true;
      if (isOpen()) { try { document.body.style.overflow = prevOverflow; } catch (e) {} }
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners = [];
      if (slMQ && !slMQ.addEventListener && slMQ.removeListener) slMQ.removeListener(slCheck);
      if (rafId) cancelAnimationFrame(rafId);
      if (fAnim) cancelAnimationFrame(fAnim);
      if (swingRaf) cancelAnimationFrame(swingRaf);
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
      if (slTimer) clearInterval(slTimer);
      [capTimer, fCloseTimer, slNormTimer, tapScrollT].concat(timers).forEach(function (t) { if (t) clearTimeout(t); });
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
    [].forEach.call((root || document).querySelectorAll('[data-rk-section]'), function (sec) { init(sec, opts); });
  }
  function instFor(target) {
    var sec = target && target.closest ? target.closest('[data-rk-section]') : null;
    return sec ? instances.get(sec) : null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // in the theme editor, re-renders after a setting change skip the drop-in
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target, { noDrop: true }); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-rk-section]'), destroy);
  });
  document.addEventListener('shopify:block:select', function (e) {
    var inst = instFor(e.target);
    if (inst && e.detail) inst.select(e.detail.blockId);
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var inst = instFor(e.target);
    if (inst) inst.deselect();
  });

  window.RackShowcase = { init: init, destroy: destroy, initAll: initAll };
})();


/* --- NEXT SCRIPT --- */


  (() => {
    if (customElements.get('runway-section')) return;

    // walk physics: [spring stiffness, follow delay per place in line (s)] — critically damped, never overshoots
    const FEEL = { soft: [60, 0.05], balanced: [95, 0.04], snappy: [160, 0.03] };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const root = () => (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
    const TAU = Math.PI * 2;

    /*  Three ways to present the looks
        ring    (desktop) — the queue stands on a slowly turning 3D ring, always facing camera;
                            sides softly blurred, the back more. The active look morphs in place.
        cinema  (desktop) — an edge-to-edge line, smallest left → tallest right. The line steps
                            right, the departing body ghosts back to the far end, the active
                            look morphs in place.
        scroll  (mobile)  — the section pins while the page scrolls; scrolling walks the line
                            one look per stop and scrubs the morph of the active look.          */

    class RunwaySection extends HTMLElement {
      connectedCallback() {
        if (this._ready) return;
        this._ready = true;
        this.querySelectorAll('[data-rw-clone]').forEach((x) => x.remove());   // re-attached in the editor
        this.stage = this.querySelector('[data-rw-stage]');
        this.actorLayer = this.querySelector('[data-rw-actors]');
        this.heroes = Array.from(this.querySelectorAll('[data-rw-hero]'));
        this.base = Array.from(this.querySelectorAll('[data-rw-model]'));
        this.n = this.heroes.length;
        if (!this.n || !this.stage) return;

        this.panels = Array.from(this.querySelectorAll('[data-rw-panel]'));
        this.ticks = Array.from(this.querySelectorAll('[data-rw-tick]'));
        this.piecesEl = this.querySelector('[data-rw-pieces]');
        this.liveEl = this.querySelector('[data-rw-live]');
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.design = !!(window.Shopify && Shopify.designMode);
        if (this.design) this.classList.add('rw--design');   // theme editor: piece dots stay visible for positioning

        // luxury layer: staged intro (skipped in the editor and for reduced motion)
        this.classList.add('rw--js');
        if (this.reduce || this.design) this.classList.add('is-revealed');
        this.lb = this.querySelector('[data-rw-lb]');
        this.lbStage = this.querySelector('[data-rw-lb-stage]');

        const f = FEEL[this.dataset.feel] || FEEL.balanced;
        this.K = f[0];
        this.C = 2 * Math.sqrt(f[0]);   // critical damping: arrives smoothly, no bounce
        this.lag = f[1];
        this.blurOn = this.dataset.blur === 'true';
        this.motionBlur = this.dataset.mblur === 'true';
        this.speed = parseInt(this.dataset.speed || '5000', 10);

        // bodies for the queue: originals + clones so the ring / line never runs out
        this.N = this.n * Math.ceil(8 / this.n);
        const els = [];
        for (let a = 0; a < this.N; a++) {
          let el = this.base[a % this.n];
          if (a >= this.n) {
            el = el.cloneNode(true);
            el.setAttribute('data-rw-clone', '');
            el.querySelectorAll('img').forEach((x) => x.setAttribute('loading', 'lazy'));
            this.actorLayer.appendChild(el);
          }
          els.push(el);
        }
        this.index = 0;
        this.target = 0;      // where the line is heading (continuous for drag / scroll)
        this.cur = 0;         // where the ring / scroll line is now
        this.vel = 0;
        const start = this.reduce || this.design ? 0 : 1.15;   // first view: the line walks in
        this.sim = els.map((el, a) => ({
          el, a, look: a % this.n, hit: el.querySelector('[data-rw-go]'),
          x: a + start, v: 0, g: a + start, prev: a, trip: false, from: 0, blur: -1, w: 0
        }));
        this.cur = -start;

        this.step = this.step.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.measure();
        this.bind();
        this.setIndex(0, { silent: true });
        this.initPickers();
        this.heroes.forEach((h, i) => this.findFeet(h, i));

        this.io = new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
          if (this.visible) this.kick();
        }, { threshold: 0 });
        this.io.observe(this);

        // the intro plays once, when a good part of the section is on screen
        if (!this.classList.contains('is-revealed')) {
          this.revealIO = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            this.revealIO.disconnect();
            requestAnimationFrame(() => requestAnimationFrame(() => this.classList.add('is-revealed')));
          }, { threshold: 0, rootMargin: '0px 0px -22% 0px' });
          this.revealIO.observe(this);
        }

        if (this.dataset.autoplay === 'true' && !this.reduce && !this.design && this.mode !== 'scroll') this.play(true);
      }

      disconnectedCallback() {
        cancelAnimationFrame(this.raf);
        this.raf = null;
        clearTimeout(this.autoTimer);
        clearTimeout(this.snapT);
        this.ro && this.ro.disconnect();
        this.io && this.io.disconnect();
        this.revealIO && this.revealIO.disconnect();
        if (this._cursor) { cancelAnimationFrame(this._cursor.raf); this._cursor.raf = null; }
        clearTimeout(this._zoomT);
        if (this._host) { this._host.querySelectorAll('[data-rw-picker]').forEach((pk) => { pk.hidden = true; this.dock(pk); }); this._host.remove(); this._host = null; }
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this._onResize);
        document.removeEventListener('shopify:block:select', this._onBlockSelect);
        document.removeEventListener('visibilitychange', this._onVis);
        this._ready = false;
      }

      /* Cut-outs often carry transparent space under the feet: measure it once so every
         model stands exactly on the floor and the contact shadow sits at the soles. */
      findFeet(hero, look) {
        const url = hero.dataset.probe;
        if (!url) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const w = 48, h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            const d = ctx.getImageData(0, 0, w, h).data;
            let last = -1;
            for (let y = h - 1; y >= 0 && last < 0; y--) {
              for (let x = 0; x < w; x++) { if (d[(y * w + x) * 4 + 3] > 40) { last = y; break; } }
            }
            if (last < 0) return;
            const foot = clamp((h - 1 - last) / h, 0, 0.4).toFixed(4);
            hero.style.setProperty('--rw-foot', foot);
            this.sim.forEach((s) => { if (s.look === look) s.el.style.setProperty('--rw-foot', foot); });
          } catch (_) { /* cross-origin image: keep it as uploaded */ }
        };
        img.src = url;
      }

      /* ---------------- layout ---------------- */
      measure() {
        const mobile = window.matchMedia('(max-width: 749px)').matches;
        const wasScroll = this.mode === 'scroll';
        const style = mobile ? (this.dataset.mstyle || 'line') : this.dataset.style;
        this.mode = style === 'line' || style === 'cinema' ? 'cinema' : (style === 'classic' ? 'classic' : 'ring');
        this.mobile = mobile;
        if (!mobile && this._host) { this._host.querySelectorAll('[data-rw-picker]').forEach((pk) => this.dock(pk)); this.syncPicking(); }   // desktop shows pickers inline
        this.classList.toggle('rw--scroll', this.mode === 'scroll');
        this.classList.toggle('rw--ring', this.mode === 'ring');
        this.classList.toggle('rw--cinema', this.mode === 'cinema');
        this.classList.toggle('rw--classic', this.mode === 'classic');
        this.morph = this.mode === 'cinema' || this.mode === 'scroll';   // only the line-up morphs
        this.classList.toggle('rw--morph', this.morph);

        if (this.mode === 'scroll') {
          // the section is as tall as the walk; its inner frame pins to the viewport
          const vh = window.innerHeight;
          this.stick = this.stickyTop();
          this.stepPx = Math.max(160, (vh * parseInt(this.dataset.step || '60', 10)) / 100);
          this.style.setProperty('--rw-stick', this.stick + 'px');
          // the pinned frame is exactly one screen tall
          this.frameH = vh - this.stick;
          this.style.setProperty('--rw-frame-h', Math.round(this.frameH) + 'px');
          this.style.height = Math.round(this.frameH + (this.n - 1) * this.stepPx) + 'px';
          if (!wasScroll) { this.cur = this.progress(); this.target = this.cur; }
        } else {
          this.style.height = '';
          if (wasScroll) { this.target = this.cur = Math.round(this.cur); }
          // header + announcement bar + this section fit inside one screen together
          // phones: the URL bar resizes the viewport while scrolling — keep the frame steady
          const vw = window.innerWidth, ih = window.innerHeight;
          if (!(mobile && this._vh && vw === this._vw && Math.abs(ih - this._vh) < 160)) { this._vw = vw; this._vh = ih; }
          const heightMode = (mobile ? this.dataset.mheightMode : this.dataset.heightMode) || 'original';
          const heightValue = Number(mobile ? this.dataset.mheightVh : this.dataset.heightVh) || 100;
          if (heightMode === 'custom') {
            // Only the runway receives the additional room; product sizes are independent.
            this.frameH = this._vh * clamp(heightValue, 50, 120) / 100;
          } else if (heightMode === 'fullscreen') {
            this.frameH = this._vh;
          } else {
            // Preserve the existing layout and header-fit behavior by default.
            this.frameH = Math.max(380, this._vh - (this.dataset.fit === 'true' ? this.headerHeight() : 0));
          }
          this.style.setProperty('--rw-frame-h', Math.round(this.frameH) + 'px');
        }

        const r = this.stage.getBoundingClientRect();
        this.W = r.width;
        this.H = r.height;
        this.fs = this.mode === 'ring' ? 1.08 : 1;   // ring: the active model stands a little taller
        // The models fill the stage left by the chosen frame height and product panel.
        const room = this.mode === 'ring' ? (this.H - 34 - 18) / this.fs
          : this.mode === 'classic' ? this.H - (this.mobile ? 24 : 36) - 18
          : this.H - (this.mobile ? 20 : 30) - 18;
        this.modelH = Math.max(200, Math.round(room));
        this.stage.style.setProperty('--rw-model-h', this.modelH + 'px');

        this.style.setProperty('--rw-fs', this.fs);
        if (this.mode === 'classic') {
          this.Cl = this.mobile
            ? { ax: 0.3, ay: 22, sx: 0.32, sy: 22, sr: 0.76, ex: 0.55, d: 4 }
            : { ax: 0.4, ay: 36, sx: 0.125, sy: 58, sr: 0.76, ex: 0.38, d: 5 };
          this.unit = Math.max(90, this.W * this.Cl.sx * 1.6);
          this.hx = this.W * this.Cl.ax; this.hy = this.Cl.ay;
        } else if (this.mode === 'ring') {
          this.cx = this.W * 0.5;
          this.R = this.W * (this.mobile ? 0.72 : 0.62);
          this.P = this.W * (this.mobile ? 1.9 : 1.65);
          this.floor = this.H - 34;                 // front feet (px from top)
          this.horizon = this.H * 0.36;             // perspective origin
          this.unit = Math.max(this.mobile ? 90 : 120, this.W * 0.3);
          this.hx = this.cx; this.hy = 34;
        } else {
          this.L = this.mobile
            ? { ax: 0.74, g1: 0.36, r: 0.95, s0: 0.34, sr: 0.55, ay: 20, rise: 2 }
            : { ax: 0.75, g1: 0.2, r: 0.86, s0: 0.3, sr: 0.6, ay: 30, rise: 3 };
          this.unit = Math.max(80, this.W * this.L.g1);
          this.hx = this.W * this.L.ax; this.hy = this.L.ay;
        }
        this.stage.style.setProperty('--rw-hx', this.hx.toFixed(1) + 'px');
        this.stage.style.setProperty('--rw-hy', this.hy + 'px');
        this.style.setProperty('--rw-ax', ((this.hx / (this.W || 1)) * 100).toFixed(2) + '%');
        this.sim.forEach((s) => { s.w = s.el.offsetWidth || s.w; s.blur = -1; });
        this.heroes.forEach((h) => { if (this.mode !== 'scroll') { const m = h.firstElementChild; m.style.opacity = ''; m.style.filter = ''; m.style.transform = ''; } });
        this.renderAll();
        if (this.zoomed) this.layoutZoom();
      }

      // a shopper is working with the products: the look must not change under them
      engage() {
        this.engaged = true;
        if (this.playing) this.play(false);
      }

      /* ---------------- look popup ---------------- */
      // the front model opens on her own, larger, with the piece dots; the product panel stays as it is
      zoom(open) {
        if (!this.lb || !this.lbStage || open === !!this.zoomed) return;
        const hero = this.front || this.heroes[this.index];
        const src = hero && hero.querySelector('.rw__figure');
        if (!src) return;
        clearTimeout(this._zoomT);
        if (open) {
          this.engage();
          this.clearHot();
          const wrap = document.createElement('div');
          wrap.className = 'rw__lb-model';
          const shadow = hero.querySelector('.rw__morph > .rw__shadow');
          if (shadow) wrap.appendChild(shadow.cloneNode(true));
          const fig = src.cloneNode(true);
          fig.querySelectorAll('[data-rw-zoom]').forEach((x) => x.remove());
          fig.querySelectorAll('[data-rw-pin]').forEach((p) => { p.tabIndex = 0; p.classList.remove('is-hot'); });
          fig.querySelectorAll('img').forEach((im) => im.setAttribute('loading', 'eager'));
          wrap.appendChild(fig);
          wrap.style.setProperty('--rw-foot', getComputedStyle(hero).getPropertyValue('--rw-foot').trim() || '0');
          this.lbStage.replaceChildren(wrap);
          this.lbModel = wrap;
          const no = this.index + 1;
          const kicker = this.lb.querySelector('[data-rw-lb-kicker]');
          const name = this.lb.querySelector('[data-rw-lb-name]');
          if (kicker) kicker.textContent = `${this.lb.dataset.word || ''} ${no < 10 ? '0' : ''}${no}`.trim();
          if (name) name.textContent = hero.dataset.name || '';
          this.zoomed = true;
          this.layoutZoom();
          this.classList.add('rw--zoom');
          this.lb.setAttribute('aria-hidden', 'false');
          this.flip(wrap, src, true);
          const close = this.lb.querySelector('[data-rw-zoom-close]');
          close && close.focus({ preventScroll: true });
        } else {
          this.zoomed = false;
          this.clearHot();
          const hadFocus = this.lb.contains(document.activeElement);
          if (this.lbModel) this.flip(this.lbModel, src, false);
          this.classList.remove('rw--zoom');
          this.lb.setAttribute('aria-hidden', 'true');
          this._zoomT = setTimeout(() => { if (!this.zoomed) { this.lbStage.replaceChildren(); this.lbModel = null; } }, 950);
          if (hadFocus) this.stage.focus({ preventScroll: true });
        }
      }

      // the popup model is as tall as the popup allows
      layoutZoom() {
        const wrap = this.lbModel;
        if (!wrap) return;
        const fig = wrap.querySelector('.rw__figure');
        const ar = parseFloat(fig.style.getPropertyValue('--rw-ar')) || 0.353;
        const r = this.lbStage.getBoundingClientRect();
        const h = Math.max(160, Math.min(r.height, r.width / ar));
        wrap.style.setProperty('--rw-model-h', Math.round(h) + 'px');
        fig.querySelectorAll('img').forEach((im) => { im.sizes = Math.round(h * ar) + 'px'; });
      }

      // FLIP: the popup model grows out of (and shrinks back into) the model on the runway
      flip(wrap, src, opening) {
        if (this.reduce) return;
        const fig = wrap.querySelector('.rw__figure');
        const a = src.getBoundingClientRect();
        const b = fig.getBoundingClientRect();
        if (!a.height || !b.height) return;
        const at = `translate3d(${(a.left - b.left).toFixed(1)}px,${(a.bottom - b.bottom).toFixed(1)}px,0) scale(${(a.height / b.height).toFixed(4)})`;
        wrap.style.transformOrigin = '0 100%';
        if (opening) {
          wrap.style.transition = 'none';
          wrap.style.transform = at;
          void wrap.offsetWidth;
          wrap.style.transition = '';
          wrap.style.transform = '';
        } else {
          wrap.style.transform = at;
        }
      }

      /* ---------------- variant pickers: inline on desktop, a bottom sheet on phones ----------------
         On phones the open picker is moved into a host at the end of <body>: a theme wrapper with a
         transform (or iOS scrolling) would otherwise trap a fixed sheet inside the section. */
      pickerOf(card) { return card && (card._pk || card.querySelector('[data-rw-picker]')); }

      sheetHost() {
        if (this._host && this._host.isConnected) return this._host;
        const host = document.createElement('div');
        host.className = 'rw-sheet-host';
        const scrim = document.createElement('button');
        scrim.type = 'button';
        scrim.className = 'rw__pick-scrim';
        scrim.tabIndex = -1;
        scrim.setAttribute('aria-hidden', 'true');
        scrim.setAttribute('data-rw-pick-close', '');
        host.appendChild(scrim);
        host.addEventListener('click', (e) => this.onClick(e));
        host.addEventListener('change', (e) => {
          if (e.target.matches('[data-rw-option]')) { this.onOptionChange(e.target.closest('[data-rw-picker]')); this.engage(); }
        });
        host.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closePickers(); });
        document.body.appendChild(host);
        this._host = host;
        return host;
      }

      // the sheet sits outside the section, so it takes the section's colours and type with it
      themeHost(host) {
        const cs = getComputedStyle(this);
        ['--rw-panel', '--rw-text', '--rw-muted', '--rw-line', '--rw-accent', '--rw-on-accent', '--rw-btn-bg', '--rw-btn-fg', '--rw-btn-radius',
          '--rw-pill-radius', '--rw-bar-r', '--rw-thumb-radius', '--rw-pt-size', '--rw-price', '--rw-opt', '--rw-ease', '--rw-ease-sheet', '--rw-ease-spring']
          .forEach((v) => host.style.setProperty(v, cs.getPropertyValue(v)));
        host.style.fontFamily = cs.fontFamily;
        host.style.color = cs.color;
      }

      // move a picker back into its product card
      dock(pk) {
        if (pk && pk._card && pk.parentElement !== pk._card) pk._card.appendChild(pk);
      }

      openPicker(card, open) {
        const pk = this.pickerOf(card);
        if (!pk) return;
        if (open && this.mobile) {
          this.closePickers(card);   // one sheet at a time
          const host = this.sheetHost();
          this.themeHost(host);
          host.appendChild(pk);
        }
        pk.hidden = !open;
        if (!open) this.dock(pk);
        card.classList.toggle('is-picking', open);
        const btn = card.querySelector('[data-rw-add]');
        btn && btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        this.syncPicking();
      }
      closePickers(except) {
        this.querySelectorAll('[data-rw-card].is-picking').forEach((c) => { if (c !== except) this.openPicker(c, false); });
        this.syncPicking();
      }
      syncPicking() {
        const host = this._host;
        const on = !!(this.mobile && host && host.querySelector('[data-rw-picker]:not([hidden])'));
        this.classList.toggle('rw--picking', on);
        host && host.classList.toggle('is-open', on);
      }

      setStill(on) {
        if (this.still === on) return;
        this.still = on;
        this.classList.toggle('rw--still', on);
        if (!this.morph) this.renderAll();
      }

      headerHeight() {
        // the theme's header group (announcement bar + header) sits above the section on load
        let h = 0;
        document.querySelectorAll('.shopify-section-group-header-group, #shopify-section-header, #shopify-section-announcement-bar').forEach((el) => {
          if (el.contains(this)) return;
          const cs = getComputedStyle(el);
          if (cs.display !== 'none' && cs.position !== 'absolute') h += el.getBoundingClientRect().height;
        });
        return Math.round(h);
      }

      stickyTop() {
        let top = parseInt(this.dataset.offset || '0', 10);
        const hdr = document.querySelector('header-component, .header-wrapper, #header-group, .shopify-section-group-header-group');
        if (hdr) {
          const cs = getComputedStyle(hdr.closest('.shopify-section') || hdr);
          if (cs.position === 'sticky' || cs.position === 'fixed') top += Math.round(hdr.getBoundingClientRect().height);
        }
        return top;
      }

      progress() {
        const r = this.getBoundingClientRect();
        return clamp((this.stick - r.top) / this.stepPx, 0, this.n - 1);
      }

      wrapN(v) { const N = this.N; return ((v % N) + N) % N; }

      /* ---------------- placement ---------------- */
      put(s, x, bottom, sc, o, blur, z) {
        const half = (s.w || 200) * sc * 0.5;
        if (x + half < -4 || x - half > this.W + 4) o = 0;
        const st = s.el.style;
        st.transform = `translate3d(${x.toFixed(2)}px,${(-bottom).toFixed(2)}px,0) translateX(-50%) scale(${sc.toFixed(4)})`;
        st.opacity = o.toFixed(3);
        st.zIndex = String(z);
        st.visibility = o < 0.01 ? 'hidden' : 'visible';
        st.pointerEvents = o < 0.5 ? 'none' : '';
        const bb = Math.round(blur * 10) / 10;
        if (bb !== s.blur) { st.filter = bb > 0.05 ? `blur(${bb}px)` : ''; s.blur = bb; }
      }

      placeRing(s) {
        const step = TAU / this.N;
        let phi = ((s.a - this.cur) * step) % TAU;
        if (phi > Math.PI) phi -= TAU;
        if (phi < -Math.PI) phi += TAU;
        const z = this.R * (1 - Math.cos(phi));
        const sl = Math.abs(phi) / step;
        const p = (this.P / (this.P + z)) * (1 + (this.fs - 1) * clamp(1 - sl, 0, 1));
        const x = this.cx + this.R * Math.sin(phi) * (this.P / (this.P + z));
        const feet = this.horizon + (this.floor - this.horizon) * (this.P / (this.P + z));
        let blur = 0;
        if (this.blurOn) blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);   // soft beside the front, stronger behind
        // the front place belongs to the morphing hero; the back of the ring fades away
        let o = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
        if (this.still && sl < 0.02) o = 0;   // at rest the identical hero (with pins) takes this place
        this.put(s, x, this.H - feet, p, o, blur, Math.round(p * 1000));
      }

      placeClassic(s) {
        const C = this.Cl, N = this.N;
        let k = s.x, e = -1;
        if (s.trip) {
          // the departing model walks out past the camera and rejoins the back (or the reverse)
          const goal = s.prev, fwd = goal > s.from;
          const u = clamp(Math.abs(s.x - s.from) / (Math.abs(goal - s.from) || 1), 0, 1);
          if (fwd) { if (u < 0.5) e = u * 2 * 1.4; else k = goal + (1 - u) * 2; }
          else { if (u < 0.5) k = s.from + u * 2; else e = (1 - u) * 2 * 1.4; }
        } else if (k < 0) e = Math.min(-k, 1.4);
        let x, b, sc, o, blur = 0, z;
        if (e >= 0) {
          x = this.W * (C.ax - C.ex * e); b = C.ay - 22 * e; sc = 1 + 0.14 * e;
          o = Math.max(0, 1 - e * 1.05); if (this.blurOn) blur = 4 * Math.min(e, 1); z = 1100;
        } else {
          x = this.W * (C.ax + C.sx * k); b = C.ay + C.sy * k; sc = Math.pow(C.sr, k);
          o = k <= C.d - 1 ? 1 - 0.13 * k : Math.max(0, (1 - 0.13 * (C.d - 1)) * (C.d - k));
          if (this.blurOn) blur = Math.min(k * 0.9, 3.2);
          if (this.still && Math.abs(k) < 0.02) o = 0;   // the matching hero carries the pins at rest
          z = 1000 - Math.round(k * 10);
        }
        this.put(s, x, b, sc, o, blur, z);
      }

      posLine(k) {
        const L = this.L;
        return {
          x: this.W * (L.ax - (L.g1 * (1 - Math.pow(L.r, k))) / (1 - L.r)),
          b: L.ay + L.rise * k,
          s: L.s0 + (1 - L.s0) * Math.pow(L.sr, k)
        };
      }

      placeLine(s) {
        const k = clamp(s.x, -1.5, this.N);
        let o, blur = 0, z;
        let p;
        if (k >= 0) {
          p = this.posLine(k);
          o = clamp((k - 0.12) / 0.55, 0, 1);              // hands over to the morphing hero at the front
          if (this.blurOn) blur = Math.min(k * 0.55, 2.2);
          z = 1000 - Math.round(k * 10);
        } else {
          p = this.posLine(0);
          p.x += this.W * 0.3 * -k;
          o = 0; z = 1;
        }
        if (s.trip) {
          // returning to the far end: a ghost passing behind the others
          const dist = Math.abs(s.g - s.x), done = Math.abs(s.x - s.from);
          const ghost = clamp(Math.min(dist, done) / 0.55, 0, 1);
          o = o * (1 - 0.78 * ghost);
          blur += 3 * ghost;
          z = 5;
        }
        if (this.motionBlur && !this.mobile) blur += Math.min(Math.abs(s.v) * 0.45, 2);
        this.put(s, p.x, p.b, p.s, o, blur, z);
      }

      placeHeroes() {
        if (this.mode !== 'scroll') return;
        // scrubbed morph: each look's weight follows the scroll position
        this.heroes.forEach((h, i) => {
          const w = clamp(1 - Math.abs(this.cur - i), 0, 1);
          const m = h.firstElementChild;
          m.style.opacity = w.toFixed(3);
          m.style.filter = w > 0.995 ? 'none' : `blur(${((1 - w) * 14).toFixed(2)}px) brightness(${(1 + (1 - w) * 0.25).toFixed(3)})`;
          m.style.transform = `scale(${(0.97 + 0.03 * w).toFixed(4)})`;
          m.style.visibility = w < 0.01 ? 'hidden' : 'visible';
        });
      }

      renderAll() {
        if (this.mode === 'ring') this.sim.forEach((s) => this.placeRing(s));
        else if (this.mode === 'scroll') {
          this.sim.forEach((s) => {
            if (s.a >= this.n) { this.put(s, -9999, 0, 1, 0, 0, 0); return; }
            s.x = s.a - this.cur; s.v = this.vel; s.trip = false;
            this.placeLine(s);
          });
          this.placeHeroes();
        } else if (this.mode === 'classic') this.sim.forEach((s) => this.placeClassic(s));
        else this.sim.forEach((s) => this.placeLine(s));
      }

      kick() {
        if (this.raf || !this.visible) return;
        this.last = 0;
        this.raf = requestAnimationFrame(this.step);
      }

      step(t) {
        const dt = this.last ? Math.min(0.034, (t - this.last) / 1000) : 1 / 60;
        this.last = t;
        let busy = false;
        const K = this.K, C = this.C, sub = 3, h = dt / sub;

        if (this.mode === 'ring' || this.mode === 'scroll') {
          // one spring drives the whole ring / scroll line
          if (this.reduce) { this.cur = this.target; this.vel = 0; }
          else {
            const k2 = this.mode === 'scroll' ? K * 2.2 : K, c2 = 2 * Math.sqrt(k2);
            for (let j = 0; j < sub; j++) {
              const acc = -k2 * (this.cur - this.target) - c2 * this.vel;
              this.vel += acc * h;
              this.cur += this.vel * h;
            }
          }
          if (Math.abs(this.cur - this.target) > 0.0005 || Math.abs(this.vel) > 0.0005) busy = true;
          else { this.cur = this.target; this.vel = 0; }
          this.renderAll();
        } else {
          const N = this.N;
          for (const s of this.sim) {
            const goal = this.wrapN(s.a - this.target);
            if (Math.abs(goal - s.prev) > N / 2) { s.trip = true; s.from = s.x; }
            s.prev = goal;
            if (this.reduce) { s.x = s.g = goal; s.v = 0; s.trip = false; this.mode === 'classic' ? this.placeClassic(s) : this.placeLine(s); continue; }
            const tau = this.dragging ? 0.016 : s.trip ? 0.1 : 0.03 + this.lag * Math.min(goal, 4);
            s.g += (goal - s.g) * (1 - Math.exp(-dt / tau));
            for (let j = 0; j < sub; j++) {
              const acc = -K * (s.x - s.g) - C * s.v;
              s.v += acc * h;
              s.x += s.v * h;
            }
            if (s.trip && Math.abs(s.x - goal) < 0.02) s.trip = false;
            if (Math.abs(s.x - goal) > 0.0006 || Math.abs(s.v) > 0.0006 || Math.abs(s.g - goal) > 0.0006) busy = true;
            else { s.x = s.g = goal; s.v = 0; s.trip = false; }
            this.mode === 'classic' ? this.placeClassic(s) : this.placeLine(s);
          }
        }
        const moving = busy || this.dragging;
        if (moving) this.setStill(false);
        if (moving && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.step);
        else { this.raf = null; if (!moving) this.setStill(true); }
      }

      /* ---------------- scroll mode ---------------- */
      onScroll() {
        if (this.mode !== 'scroll') return;
        const p = this.progress();
        this.target = p;
        const i = clamp(Math.round(p), 0, this.n - 1);
        if (i !== this.index) this.setIndex(i);
        this.kick();
        clearTimeout(this.snapT);
        if (this.dataset.snap === 'true') {
          this.snapT = setTimeout(() => {
            const r = this.getBoundingClientRect();
            if (r.top > this.stick + 2 || r.bottom < window.innerHeight - 2) return;  // only while pinned
            const q = this.progress();
            const d = (Math.round(q) - q) * this.stepPx;
            if (Math.abs(d) > 3) window.scrollBy({ top: d, behavior: 'smooth' });
          }, 160);
        }
      }

      scrollToLook(i) {
        const r = this.getBoundingClientRect();
        const top = window.scrollY + r.top - this.stick + clamp(i, 0, this.n - 1) * this.stepPx;
        window.scrollTo({ top: Math.round(top), behavior: this.reduce ? 'auto' : 'smooth' });
      }

      /* ---------------- state ---------------- */
      mod(i) { const n = this.n; return ((i % n) + n) % n; }
      moveTo(T) {
        if (this.mode === 'scroll') return this.scrollToLook(this.mod(Math.round(T)));
        this.target = T;
        this.setStill(false);
        this.setIndex(this.mod(Math.round(T)));
      }
      go(i) {
        if (this.mode === 'scroll') return this.scrollToLook(i);
        let d = this.mod(i - this.index);   // shortest way round the loop
        if (d > this.n / 2) d -= this.n;
        this.moveTo(Math.round(this.target) + d);
      }
      next() {
        if (this.mode === 'scroll') return this.scrollToLook(this.index + 1);
        this.moveTo(Math.round(this.target) + 1);
      }
      prev() {
        if (this.mode === 'scroll') return this.scrollToLook(this.index - 1);
        this.moveTo(Math.round(this.target) - 1);
      }

      rankOf(s) {
        if (this.mode === 'ring') {
          let k = this.wrapN(s.a - Math.round(this.target));
          if (k > this.N / 2) k -= this.N;
          return k;
        }
        return this.wrapN(s.a - Math.round(this.target));
      }

      // restart a one-shot CSS animation keyed on a class
      replay(el, cls) {
        if (!el) return;
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
      }

      setIndex(i, opts = {}) {
        const changed = i !== this.index || opts.silent;
        const was = this.index;
        this.index = i;
        this.kick();
        // queue bodies near the front stay reachable from the keyboard
        this.sim.forEach((s) => {
          const k = this.rankOf(s);
          const near = k !== 0 && Math.abs(k) <= (this.mode === 'ring' ? 2 : 3) && this.mode !== 'scroll';
          if (s.hit) { s.hit.tabIndex = near ? 0 : -1; s.hit.setAttribute('aria-hidden', near ? 'false' : 'true'); }
          if (near) s.el.removeAttribute('aria-hidden'); else s.el.setAttribute('aria-hidden', 'true');
        });
        if (!changed) return;
        if (this.zoomed && !opts.silent) this.zoom(false);
        if (this.mobile && !opts.silent) this.closePickers();
        this.style.setProperty('--rw-progress', ((i + 1) / this.n).toFixed(3));

        // morph: the old look dissolves, the new one resolves in the same place
        this.heroes.forEach((h, j) => {
          h.classList.toggle('is-on', j === i);
          h.classList.toggle('was', j === was && j !== i && !opts.silent);
          h.setAttribute('aria-hidden', j === i ? 'false' : 'true');
          const z = h.querySelector('[data-rw-zoom]');
          if (z) z.tabIndex = j === i ? 0 : -1;
          if (!this.lb) h.querySelectorAll('[data-rw-pin]').forEach((p) => { p.tabIndex = j === i ? 0 : -1; });
        });
        this.front = this.heroes[i];
        if (!opts.silent && !this.reduce) this.replay(this.stage, 'is-sweep');

        if (this.liveEl && !opts.silent) this.liveEl.textContent = this.heroes[i].dataset.label || '';
        this.ticks.forEach((t, j) => {
          t.setAttribute('aria-current', j === i ? 'true' : 'false');
          t.classList.toggle('is-past', j < i);
        });
        this.panels.forEach((p, j) => {
          const on = j === i;
          p.hidden = !on;
          p.classList.remove('is-in');
          if (on && !opts.silent) { void p.offsetWidth; p.classList.add('is-in'); }
        });
        const active = this.panels[i];
        if (this.piecesEl && active) {
          const tpl = active.querySelector('[data-rw-pieces-text]');
          this.piecesEl.textContent = tpl ? tpl.innerHTML.trim() : '';
          if (!opts.silent) this.replay(this.piecesEl, 'is-swap');
        }
        this.clearHot();
        this.restartAutoBar();
      }

      /* ---------------- pin <-> product ---------------- */
      hot(n, scroll) {
        this.clearHot();
        const m = this.zoomed ? this.lb : this.front;
        const panel = this.panels[this.index];
        if (!panel) return;
        const pin = m && m.querySelector(`[data-rw-pin="${n}"]`);
        const card = panel.querySelector(`[data-rw-card="${n}"]`);
        pin && pin.classList.add('is-hot');
        if (card) {
          card.classList.add('is-hot');
          if (scroll) this.reveal(card);
        }
      }
      reveal(card) {
        const list = card.parentElement;
        const behavior = this.reduce ? 'auto' : 'smooth';
        if (list.scrollWidth > list.clientWidth + 2) {
          const lr = list.getBoundingClientRect(), cr = card.getBoundingClientRect();
          list.scrollTo({ left: list.scrollLeft + (cr.left - lr.left) - 20, behavior });
        } else if (list.scrollHeight > list.clientHeight + 2 && getComputedStyle(list).overflowY !== 'visible') {
          list.scrollTo({ top: card.offsetTop - list.offsetTop - 12, behavior });
        } else if (this.mode !== 'scroll') {
          const r = card.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight - 140) window.scrollBy({ top: r.top - window.innerHeight * 0.3, behavior });
        }
      }
      clearHot() { this.querySelectorAll('.is-hot').forEach((el) => el.classList.remove('is-hot')); }

      /* ---------------- autoplay ---------------- */
      play(on) {
        if (this.mode === 'scroll') on = false;
        this.playing = on;
        this.classList.toggle('is-playing', on);
        const btn = this.querySelector('[data-rw-auto]');
        if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        this.restartAutoBar();
      }
      schedule() {
        clearTimeout(this.autoTimer);
        if (!this.playing) return;
        this.autoTimer = setTimeout(() => {
          if (this.playing && this.visible && !this.dragging && !document.hidden && !this.panelHover && !this.zoomed && !this.engaged) this.next();
          else this.restartAutoBar();
        }, this.speed);
      }
      restartAutoBar() {
        const t = this.ticks[this.index];
        this.ticks.forEach((x) => x.classList.remove('is-run'));
        if (this.playing && t) { void t.offsetWidth; t.classList.add('is-run'); }
        this.schedule();
      }

      /* ---------------- custom cursor (desktop) ---------------- */
      initCursor() {
        const c = this.querySelector('[data-rw-cursor]');
        if (!c) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) { c.remove(); return; }
        this.classList.add('rw--cursor');
        const st = this._cursor = { x: 0, y: 0, tx: 0, ty: 0, raf: null };
        const loop = () => {
          const k = this.reduce ? 1 : 0.18;   // inertia: the ring trails the pointer a little
          st.x += (st.tx - st.x) * k;
          st.y += (st.ty - st.y) * k;
          c.style.transform = `translate3d(${st.x.toFixed(1)}px,${st.y.toFixed(1)}px,0)`;
          st.raf = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) > 0.2 ? requestAnimationFrame(loop) : null;
        };
        this.stage.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          const r = this.stage.getBoundingClientRect();
          st.tx = e.clientX - r.left;
          st.ty = e.clientY - r.top;
          if (!c.classList.contains('is-on')) { st.x = st.tx; st.y = st.ty; c.classList.add('is-on'); }
          const view = !this.dragging && !!e.target.closest('.rw__zoom');
          c.classList.toggle('is-view', view);
          c.classList.toggle('is-link', !this.dragging && !view && !!e.target.closest('.rw__pin, .rw__hit'));
          if (!st.raf) st.raf = requestAnimationFrame(loop);
        });
        this.stage.addEventListener('pointerleave', () => c.classList.remove('is-on', 'is-link', 'is-view'));
      }

      /* ---------------- input ---------------- */
      bind() {
        // theme editor: selecting a look block shows that look
        this._onBlockSelect = this._onBlockSelect || ((e) => {
          const h = e.target.closest && e.target.closest('[data-rw-hero]');
          if (!h || !this.contains(h)) return;
          const i = this.heroes.indexOf(h);
          if (i < 0) return;
          this.play(false);
          this.go(i);
        });
        let rt;
        this._onResize = () => { clearTimeout(rt); rt = setTimeout(() => { this.measure(); this.onScroll(); }, 120); };
        window.addEventListener('resize', this._onResize);
        this.ro = new ResizeObserver(() => { this.measure(); });
        this.ro.observe(this.stage);
        window.addEventListener('scroll', this.onScroll, { passive: true });

        this._onVis = () => { if (!document.hidden) this.kick(); };
        document.addEventListener('visibilitychange', this._onVis);
        document.addEventListener('shopify:block:select', this._onBlockSelect);
        if (this._bound) return;   // element listeners survive a detach / re-attach
        this._bound = true;

        this.addEventListener('click', (e) => this.onClick(e));
        this.addEventListener('change', (e) => {
          if (e.target.matches('[data-rw-option]')) this.onOptionChange(e.target.closest('[data-rw-picker]'));
        });
        // Esc closes the size sheet first, then the look popup
        this.addEventListener('keydown', (e) => {
          if (e.key !== 'Escape') return;
          if (this.classList.contains('rw--picking')) {
            const c = this.querySelector('[data-rw-card].is-picking');
            this.closePickers();
            const b = c && c.querySelector('[data-rw-add]');
            b && b.focus({ preventScroll: true });
          } else if (this.zoomed) this.zoom(false);
        });

        this.addEventListener('pointerover', (e) => {
          if (e.pointerType !== 'mouse') return;
          const card = e.target.closest('[data-rw-card]');
          if (card && this.contains(card)) this.hot(card.dataset.rwCard, false);
        });
        this.addEventListener('pointerout', (e) => {
          const card = e.target.closest('[data-rw-card]');
          if (card && !card.contains(e.relatedTarget)) this.clearHot();
        });

        this.stage.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
        });

        // product interaction pauses autoplay (desktop hover pauses it temporarily)
        const panelBox = this.querySelector('.rw__panel');
        if (panelBox) {
          panelBox.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.panelHover = true; });
          panelBox.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { this.panelHover = false; this.restartAutoBar(); } });
          panelBox.addEventListener('click', (e) => { if (e.target.closest('button, a, input, select, label')) this.engage(); });
          panelBox.addEventListener('change', () => this.engage());
        }

        // horizontal trackpad swipe
        let acc = 0, lock = 0;
        this.stage.addEventListener('wheel', (e) => {
          if (this.mode === 'scroll' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
          e.preventDefault();
          const now = performance.now();
          if (now < lock) return;
          acc += e.deltaX;
          if (Math.abs(acc) > 45) { ((acc < 0) === (this.mode === 'cinema')) ? this.next() : this.prev(); acc = 0; lock = now + 520; }
        }, { passive: false });

        // drag / swipe with momentum
        this.stage.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          this.drag = { x: e.clientX, y: e.clientY, t: this.target, id: e.pointerId, samples: [{ x: e.clientX, time: e.timeStamp }] };
        });
        this.stage.addEventListener('pointermove', (e) => {
          const d = this.drag;
          if (!d || e.pointerId !== d.id) return;
          if (e.pointerType === 'mouse' && !(e.buttons & 1)) { end(e); return; }
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!this.dragging) {
            if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
              this.dragging = true;
              this.classList.add('is-dragging');
              try { this.stage.setPointerCapture(e.pointerId); } catch (_) {}
            } else if (Math.abs(dy) > 10) { this.drag = null; return; }
            else return;
          }
          d.samples.push({ x: e.clientX, time: e.timeStamp });
          if (d.samples.length > 6) d.samples.shift();
          d.dx = dx;
          if (this.mode === 'scroll') return;
          // ring: drag left turns the ring to the next look; cinema: drag right walks the line right
          this.target = this.mode === 'cinema' ? d.t + dx / this.unit : d.t - dx / this.unit;
          this.kick();
        });
        const end = (e) => {
          const d = this.drag;
          if (!d || (e.pointerId !== undefined && e.pointerId !== d.id)) return;
          this.drag = null;
          if (!this.dragging) return;
          this.dragging = false;
          this.classList.remove('is-dragging');
          this.suppress = true;
          setTimeout(() => { this.suppress = false; }, 60);
          const a = d.samples[0], z = d.samples[d.samples.length - 1];
          const vx = z.time > a.time ? (z.x - a.x) / (z.time - a.time) : 0;
          if (this.mode === 'scroll') {
            if (Math.abs(d.dx || 0) > 40) (d.dx < 0 ? this.next() : this.prev());
            return;
          }
          const sign = this.mode === 'cinema' ? 1 : -1;
          const from = Math.round(d.t);
          if (this.mobile) {
            // phones: one swipe = one look
            if (Math.abs(d.dx || 0) > 30 || Math.abs(vx) > 0.3) this.moveTo(from + sign * ((d.dx || vx) > 0 ? 1 : -1));
            else this.moveTo(from);
            return;
          }
          let i = Math.round(this.target + (sign * vx * 160) / this.unit);
          if (i === from && Math.abs(vx) > 0.3) i += sign * (vx > 0 ? 1 : -1);
          i = clamp(i, from - 2, from + 2);
          this.moveTo(i);
        };
        this.stage.addEventListener('pointerup', end);
        this.stage.addEventListener('pointercancel', end);
        this.stage.addEventListener('click', (e) => { if (this.suppress) { e.preventDefault(); e.stopPropagation(); } }, true);

        this.initCursor();
      }

      onClick(e) {
        const t = e.target;
        let el;
        if ((el = t.closest('[data-rw-pick-close]'))) return this.closePickers();
        if ((el = t.closest('[data-rw-zoom-close]'))) return this.zoom(false);
        if (this.lb && (t === this.lb || t === this.lbStage)) return this.zoom(false);   // tap beside the model
        if ((el = t.closest('[data-rw-zoom]'))) return this.zoom(true);
        if ((el = t.closest('[data-rw-next]'))) return this.next();
        if ((el = t.closest('[data-rw-prev]'))) return this.prev();
        if ((el = t.closest('[data-rw-tick]'))) return this.go(parseInt(el.dataset.rwTick, 10));
        if ((el = t.closest('[data-rw-auto]'))) { if (!this.playing) this.engaged = false; return this.play(!this.playing); }
        if ((el = t.closest('[data-rw-pin]'))) { this.engage(); return this.hot(el.dataset.rwPin, true); }
        if ((el = t.closest('[data-rw-go]'))) {
          // tapping a model in the queue brings her to the front
          const s = this.sim.find((x) => x.el.contains(el));
          const k = s ? this.rankOf(s) : 0;
          if (k && Math.abs(k) < this.N / 2) this.moveTo(Math.round(this.target) + k);
          else if (!k) this.zoom(true);   // the front model opens in the popup
          return;
        }
        if ((el = t.closest('[data-rw-confirm]'))) { const pk = el.closest('[data-rw-picker]'); return this.onConfirm((pk && pk._card) || el.closest('[data-rw-card]')); }
        if ((el = t.closest('[data-rw-add]'))) return this.onAdd(el.closest('[data-rw-card]'));
        if ((el = t.closest('[data-rw-all]'))) return this.addFullLook(el.closest('[data-rw-panel]'), el);
      }

      /* ---------------- variant pickers ---------------- */
      initPickers() {
        this.querySelectorAll('[data-rw-picker]').forEach((pk) => {
          try { pk._variants = JSON.parse(pk.querySelector('[data-rw-variants]').textContent); } catch (_) { pk._variants = []; }
          pk._card = pk.closest('[data-rw-card]');
          if (pk._card) pk._card._pk = pk;
          this.onOptionChange(pk, true);
        });
      }
      selected(pk) {
        const groups = {};
        pk.querySelectorAll('[data-rw-option]').forEach((inp) => {
          const g = inp.dataset.rwOption;
          if (inp.tagName === 'SELECT') groups[g] = inp.value;
          else if (inp.checked) groups[g] = inp.value;
        });
        return Object.keys(groups).sort().map((k) => groups[k]);
      }
      onOptionChange(pk, initial) {
        if (!pk) return;
        const card = pk._card || pk.closest('[data-rw-card]');
        const sel = this.selected(pk);
        const vs = pk._variants || [];
        const match = vs.find((v) => v.o.every((o, i) => o === sel[i]));
        // availability of each value given the other current selections (theme-style strike-through)
        pk.querySelectorAll('input[data-rw-option]').forEach((inp) => {
          const g = parseInt(inp.dataset.rwOption, 10);
          const ok = vs.some((v) => v.a && v.o[g] === inp.value && v.o.every((o, i) => i === g || o === sel[i]));
          inp.closest('.rw__pill').classList.toggle('is-unavailable', !ok);
        });
        pk.querySelectorAll('select[data-rw-option]').forEach((sl) => {
          const g = parseInt(sl.dataset.rwOption, 10);
          Array.from(sl.options).forEach((op) => {
            const ok = vs.some((v) => v.a && v.o[g] === op.value && v.o.every((o, i) => i === g || o === sel[i]));
            op.textContent = op.value + (ok ? '' : ' — ' + (this.dataset.msgSoldout || 'Sold out'));
          });
        });
        pk.querySelectorAll('[data-rw-swatch-name]').forEach((el) => {
          const fs = el.closest('fieldset');
          const c = fs && fs.querySelector('input:checked');
          if (c) el.textContent = c.value;
        });
        const btn = pk.querySelector('[data-rw-confirm]');
        const label = pk.querySelector('[data-rw-confirm-label]');
        const ok = !!(match && match.a);
        if (btn) btn.disabled = !ok;
        if (label) label.textContent = ok ? label.dataset.add : (this.dataset.msgSoldout || 'Sold out');
        card.dataset.selected = ok ? match.id : '';
        if (!initial) card.dataset.touched = '1';
      }

      /* ---------------- cart ---------------- */
      msg(panel, text) { const m = panel && panel.querySelector('[data-rw-msg]'); if (m) m.textContent = text || ''; }

      // a light haptic tick on phones that support it
      buzz() {
        if (!this.mobile || this.reduce || typeof navigator.vibrate !== 'function') return;
        try { navigator.vibrate(12); } catch (_) {}
      }

      async cartAdd(items) {
        /* Horizon (current): the cart icon bubble and the cart drawer listen for the Shopify
           standard event "shopify:cart:lines-update" and wait on its promise for the new cart.
           The module comes from the theme's import map, so it only exists on themes that use it. */
        let SE = null;
        try { SE = await import('@shopify/events'); } catch (_) { SE = null; }
        const Ev = SE && SE.CartLinesUpdateEvent;
        let deferred = null;
        if (Ev && typeof Ev.createPromise === 'function') {
          try {
            deferred = Ev.createPromise();
            deferred.promise.catch(() => {});
            this.dispatchEvent(new Ev({
              action: 'add',
              lines: items.map((i) => ({ merchandiseId: i.id, quantity: i.quantity })),
              promise: deferred.promise
            }));
          } catch (_) { deferred = null; }
        }
        // ask Shopify to render the cart drawer / cart page sections in the same request
        const sectionIds = Array.from(document.querySelectorAll('cart-items-component[data-section-id], [data-cart-section-id]'))
          .map((el) => el.dataset.sectionId || el.dataset.cartSectionId).filter(Boolean);
        const body = { items };
        if (sectionIds.length) { body.sections = Array.from(new Set(sectionIds)).join(','); body.sections_url = window.location.pathname; }

        let res, data;
        try {
          res = await fetch(root() + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(body)
          });
          data = await res.json().catch(() => ({}));
        } catch (err) {
          if (deferred) deferred.reject(err);
          throw new Error(this.dataset.msgError);
        }
        const getCart = async () => { try { return await (await fetch(root() + 'cart.js', { headers: { Accept: 'application/json' } })).json(); } catch (_) { return null; } };
        const toStd = (c) => { try { return c && typeof Ev.createCartFromAjaxResponse === 'function' ? Ev.createCartFromAjaxResponse(c) : null; } catch (_) { return null; } };
        const sourceId = this.id || this.closest('.shopify-section')?.id || 'runway-section';
        if (!res.ok || data.status) {
          if (deferred) {
            // listeners read cart.totalQuantity — hand them the unchanged cart, never null
            const std = toStd(await getCart());
            std ? deferred.resolve({ cart: std, detail: { source: 'runway-section', sourceId, didError: true } })
                : deferred.reject(new Error(this.dataset.msgError));
          }
          throw new Error(data.description || data.message || this.dataset.msgError);
        }
        const cart = await getCart();
        if (deferred) {
          const std = toStd(cart);
          if (!std) deferred.reject(new Error(this.dataset.msgError));
          else deferred.resolve({
            cart: std,
            detail: {
              items: data.items || [], source: 'runway-section', sourceId,
              itemCount: cart ? cart.item_count : undefined,
              productId: data.items && data.items[0] ? data.items[0].product_id : undefined,
              sections: data.sections, didError: false
            }
          });
        }
        this.announce(cart, data, !!deferred, sourceId);
        return data;
      }

      announce(cart, added, standard, sourceId) {
        const count = cart ? cart.item_count : undefined;
        const productId = added && added.items && added.items[0] ? added.items[0].product_id : undefined;
        // older Horizon builds: cart icon + drawer listen for `cart:update`
        if (!standard) {
          document.dispatchEvent(new CustomEvent('cart:update', {
            bubbles: true,
            detail: { resource: cart, sourceId, data: { source: 'runway-section', itemCount: count, productId, sections: added && added.sections, didError: false } }
          }));
        }
        // Dawn-family themes
        if (typeof window.publish === 'function') { try { window.publish('cart-update', { source: 'runway-section', cartData: cart }); } catch (_) {} }
        // any plain count bubbles
        if (count !== undefined) document.querySelectorAll('[data-cart-count], .cart-count-bubble [aria-hidden="true"]').forEach((el) => { el.textContent = count; });
        const after = this.dataset.afterAdd;
        if (after === 'cart') { window.location.href = root() + 'cart'; return; }
        if (after === 'drawer') {
          clearTimeout(this._drawerT);
          this._drawerT = setTimeout(() => {
            const drawer = document.querySelector('cart-drawer-component');
            if (drawer && typeof drawer.open === 'function') drawer.open();
          }, 120);
        }
      }

      onAdd(card) {
        if (!card || card.classList.contains('is-added') || card.classList.contains('is-loading')) return;
        const id = card.dataset.variantId;
        if (id) return this.addCard(card, id);
        const pk = this.pickerOf(card);
        if (!pk) return;
        const open = pk.hidden;
        this.openPicker(card, open);
        if (open) {
          const first = pk.querySelector('input:checked, select');
          first && first.focus({ preventScroll: true });
          if (!this.mobile) this.reveal(card);
        }
      }

      onConfirm(card) {
        if (!card || !card.dataset.selected) return;
        card.dataset.touched = '1';
        this.addCard(card, card.dataset.selected);
      }

      async addCard(card, id) {
        const panel = card.closest('[data-rw-panel]');
        card.classList.add('is-loading');
        this.msg(panel, '');
        try {
          await this.cartAdd([{ id: Number(id), quantity: 1 }]);
          this.markAdded(card);
          this.buzz();
          this.checkComplete(panel);
        } catch (err) {
          card.classList.remove('is-loading');
          this.msg(panel, err.message);
        }
      }

      markAdded(card) {
        card.classList.remove('is-loading', 'is-picking');
        card.classList.add('is-added');
        const pk = this.pickerOf(card);
        if (pk) { pk.hidden = true; this.dock(pk); }
        const btn = card.querySelector('[data-rw-add]');
        if (btn) { btn.setAttribute('aria-label', btn.dataset.addedLabel || btn.getAttribute('aria-label')); btn.removeAttribute('aria-expanded'); }
        this.syncPicking();
      }

      async addFullLook(panel, btn) {
        if (!panel) return;
        const cta = btn || panel.querySelector('[data-rw-all]');
        if (panel.classList.contains('is-complete') || (cta && cta.classList.contains('is-loading'))) return;
        const cards = Array.from(panel.querySelectorAll('[data-rw-card]:not([data-placeholder])'))
          .filter((c) => !c.classList.contains('is-added') && !c.classList.contains('is-soldout'));
        const items = [], ready = [], pending = [];
        cards.forEach((c) => {
          // never guess a size: multi-option pieces need the shopper's own choice
          const id = c.dataset.variantId || (c.dataset.touched ? c.dataset.selected : '');
          if (id) { items.push({ id: Number(id), quantity: 1 }); ready.push(c); } else pending.push(c);
        });
        this.msg(panel, '');
        if (items.length) {
          cta && cta.classList.add('is-loading');
          ready.forEach((c) => c.classList.add('is-loading'));
          try { await this.cartAdd(items); ready.forEach((c) => this.markAdded(c)); this.buzz(); }
          catch (err) { ready.forEach((c) => c.classList.remove('is-loading')); this.msg(panel, err.message); }
          cta && cta.classList.remove('is-loading');
        }
        if (pending.length) {
          // phones show one size sheet at a time; the message lists every piece still to choose
          (this.mobile ? pending.slice(0, 1) : pending).forEach((c) => this.openPicker(c, true));
          this.msg(panel, (this.dataset.msgChoose || 'Choose your options for: [items]').replace('[items]', pending.map((c) => c.dataset.title).join(', ')));
          this.reveal(pending[0]);
        }
        this.checkComplete(panel);
      }

      checkComplete(panel) {
        if (!panel) return;
        const cards = Array.from(panel.querySelectorAll('[data-rw-card]:not([data-placeholder])')).filter((c) => !c.classList.contains('is-soldout'));
        if (cards.length < 2 || !cards.every((c) => c.classList.contains('is-added'))) return;
        panel.classList.add('is-complete');
        this.msg(panel, '');
        const code = this.dataset.bundleCode;
        if (code && !this._codeApplied) {
          this._codeApplied = true;
          fetch(root() + 'discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(root() + 'cart.js'), { credentials: 'same-origin' }).catch(() => {});
        }
      }
    }

    customElements.define('runway-section', RunwaySection);
  })();


/* --- NEXT SCRIPT --- */


(function () {
  'use strict';
  if (window.ShoeOrbit) return;
  var instances = new Map();

  function num(el, a, fb) { var v = parseFloat(el.getAttribute(a)); return isNaN(v) ? fb : v; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

  function create(sec, opts) {
    opts = opts || {};
    var stage = sec.querySelector('[data-so-stage]');
    var shoes = [].slice.call(sec.querySelectorAll('[data-so-shoe]'));
    var n = shoes.length;
    if (!stage || !n) return null;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mq = window.matchMedia ? window.matchMedia('(max-width: 749.98px)') : null;
    function mob() { return !!(mq && mq.matches); }
    var MIRROR = sec.getAttribute('data-mirror') === 'true';
    var LOOP = sec.getAttribute('data-loop') !== 'false' && n > 2;
    var TILT = clamp(num(sec, 'data-tilt', 55), 0, 100) / 100;
    var FLOAT = sec.getAttribute('data-float') !== 'false' && !reduce;
    var AFTER = sec.getAttribute('data-after') || 'stay';
    var HDR = sec.getAttribute('data-hdr') !== 'false';
    var DEMO = sec.getAttribute('data-demo') === 'true';
    var AUTO = sec.getAttribute('data-autoplay') === 'true' && !reduce;
    var AUTO_MS = clamp(num(sec, 'data-auto-s', 4), 2, 20) * 1000;
    var SIGN = MIRROR ? 1 : -1;     // dragging toward where shoes go advances
    function T(k, fb) { return sec.getAttribute('data-t-' + k) || fb; }
    var STR = { added: T('added', 'added to your bag'), view: T('view', 'View bag'), add: T('add', 'Add to bag'), soldout: T('soldout', 'Sold out'), error: T('error', 'Could not add to bag. Please try again.'),
      select: T('select', 'Select a size'), addbtn: T('addbtn', 'Add to bag'), addedbtn: T('addedbtn', 'Added to bag'), unavailable: T('unavailable', 'Unavailable') };
    var SIZE_NAMES = (sec.getAttribute('data-size-names') || 'Size').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);

    var dead = false, listeners = [], timers = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o || false); listeners.push([t, ty, fn, o || false]); }
    function later(fn, ms) { var id = setTimeout(function () { var k = timers.indexOf(id); if (k > -1) timers.splice(k, 1); if (!dead) fn(); }, ms); timers.push(id); return id; }

    var ring = sec.querySelector('[data-so-ring]'), ring2 = sec.querySelector('[data-so-ring2]');
    var wheel = sec.querySelector('[data-so-wheel]'), ridgeBox = sec.querySelector('[data-so-ridges]');
    var info = sec.querySelector('.so-info');
    var elIdx = sec.querySelector('[data-so-idx]'), elTag = sec.querySelector('[data-so-tag]'), elName = sec.querySelector('[data-so-name]');
    var elPrice = sec.querySelector('[data-so-price]'), elCmp = sec.querySelector('[data-so-cmp]'), elSub = sec.querySelector('[data-so-sub]');
    var elView = sec.querySelector('[data-so-view]'), elSizes = sec.querySelector('[data-so-sizes]'), elStatus = sec.querySelector('[data-so-status]');
    var elLast = sec.querySelector('[data-so-last]');
    if (elLast) elLast.textContent = pad2(n);
    if (wheel) wheel.setAttribute('aria-valuemax', n);

    var data = shoes.map(function (el) {
      var j = null, s = el.querySelector('[data-so-json]');
      if (s) { try { j = JSON.parse(s.textContent); } catch (e) { j = null; } }
      return j || { options: [], variants: [] };
    });

    /* ---------- section height (vh, minus the header if asked) ---------- */
    var vhH = 0, vhW = 0;
    function headerH() {
      var h = 0;
      [].forEach.call(document.querySelectorAll('.shopify-section-group-header-group'), function (el) {
        if (!el.contains(sec)) h += el.getBoundingClientRect().height || 0;
      });
      if (!h) { var hd = document.querySelector('header'); if (hd && !hd.contains(sec)) h = hd.getBoundingClientRect().height || 0; }
      return h;
    }
    function sizeSection() {
      var vh = mob() ? num(sec, 'data-vh-m', 90) : num(sec, 'data-vh-d', 100);
      var w = window.innerWidth;
      if (!vhH || !mob() || w !== vhW) { vhH = window.innerHeight; vhW = w; }   // phones: ignore the URL bar
      sec.style.setProperty('--so-sh', Math.round((vhH - (HDR ? headerH() : 0)) * vh / 100) + 'px');
    }

    /* ---------- geometry ---------- */
    var W = 0, H = 0, G = null;
    function measure() {
      sizeSection();
      W = sec.clientWidth; H = sec.clientHeight;
      var m = mob();
      G = m
        ? { cx: W * num(sec, 'data-cxm', 113) / 100, cy: H * num(sec, 'data-cym', 83) / 100, R: W * num(sec, 'data-rm', 95) / 100,
            hero: num(sec, 'data-herom', 128), step: num(sec, 'data-stepm', 24), fade: num(sec, 'data-fadem', 1.5) }
        : { cx: W * num(sec, 'data-cx', 80) / 100, cy: H * num(sec, 'data-cy', 117) / 100, R: H * num(sec, 'data-r', 97) / 100,
            hero: num(sec, 'data-hero', 121), step: num(sec, 'data-step', 21), fade: num(sec, 'data-fade', 2.5) };
      var cx = MIRROR ? W - G.cx : G.cx;
      var rings = sec.querySelector('[data-so-rings]');
      if (rings && wheel) rings.style.setProperty('--so-fy', Math.round(wheel.getBoundingClientRect().top - sec.getBoundingClientRect().top) + 'px');
      if (ring) { ring.style.width = ring.style.height = (G.R * 2) + 'px'; ring.style.transform = 'translate(' + (cx - G.R) + 'px,' + (G.cy - G.R) + 'px)'; }
      if (ring2) {
        var r2 = G.R - (shoes[0].offsetWidth || 300) * 0.32;
        ring2.style.width = ring2.style.height = (r2 * 2) + 'px';
        ring2.style.transform = 'translate(' + (cx - r2) + 'px,' + (G.cy - r2) + 'px)';
      }
      dirty = true; kick();
    }

    /* ---------- state ---------- */
    var START = clamp(Math.round(num(sec, 'data-start', 2)) - 1, 0, n - 1);
    var v = START, target = START, vel = 0, dragging = false, dirty = true, active = -1;
    var SMOOTH = clamp(num(sec, 'data-smooth', 45), 10, 150) / 100;   // seconds to settle (critically damped)
    var dragV = START, lastTs = 0, wheelMode = false;
    var DROP = sec.getAttribute('data-drop') !== 'false' && !reduce && !opts.noDrop && 'IntersectionObserver' in window;
    if (DROP) v = START + (LOOP ? 2.4 : Math.min(2.4, n - 1 - START));   // spins in when it scrolls into view
    function wrapD(d) {
      if (!LOOP) return d;
      d = ((d % n) + n) % n;
      return d > n / 2 ? d - n : d;
    }
    function idxOf(x) { var i = Math.round(x); return LOOP ? ((i % n) + n) % n : clamp(i, 0, n - 1); }

    /* ---------- the wheel's ridges ---------- */
    var RN = 44, ridges = [];
    if (ridgeBox) {
      for (var k = 0; k < RN; k++) { var r = document.createElement('i'); ridgeBox.appendChild(r); ridges.push(r); }
    }
    function drawRidges() {
      if (!ridges.length) return;
      var bw = ridgeBox.clientWidth || 1;
      var off = -SIGN * v * 0.9;
      for (var k = 0; k < RN; k++) {
        var phi = ((k / RN) * Math.PI * 2 + off) % (Math.PI * 2);
        if (phi < 0) phi += Math.PI * 2;
        if (phi > Math.PI) phi -= Math.PI * 2;
        var el = ridges[k];
        if (Math.abs(phi) >= Math.PI / 2) { el.style.opacity = '0'; continue; }
        var c = Math.cos(phi), w = Math.max(1, 5 * c);
        var x = bw * (0.5 + 0.5 * Math.sin(phi)) - w / 2;
        el.style.transform = 'translateX(' + x.toFixed(1) + 'px) scaleX(' + (w / 4).toFixed(3) + ')';
        el.style.opacity = (0.25 + 0.75 * c).toFixed(3);
      }
    }

    /* ---------- render ---------- */
    var tNow = 0;
    function render() {
      if (!G) return;
      var cx = G.cx;
      for (var i = 0; i < n; i++) {
        var el = shoes[i];
        var d = wrapD(i - v), ad = Math.abs(d);
        var ang = G.hero - d * G.step;
        var rad = ang * Math.PI / 180;
        var x = cx + G.R * Math.cos(rad), y = G.cy - G.R * Math.sin(rad);
        var rot = -(ang - G.hero) * TILT;
        if (MIRROR) { x = W - x; rot = -rot; }
        var sc = Math.max(0.3, 1 - 0.36 * ad);
        var op = ad > G.fade + 1.1 ? 0 : clamp(1 - (ad - G.fade) * 0.9, 0, 1);
        var bob = FLOAT && ad < 0.5 ? Math.sin(tNow / 700) * 5 * (1 - ad * 2) : 0;
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (y + bob).toFixed(1) + 'px,0) translate(-50%,-62%) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = 100 - Math.round(ad * 10);
        el.style.pointerEvents = op < 0.15 ? 'none' : '';
      }
      drawRidges();
      var a = idxOf(v);
      if (a !== active) setActive(a);
    }

    var raf = 0, visible = true;
    // critically damped spring (no overshoot, no jitter, frame-rate independent)
    function damp(goal, st, dt) {
      var omega = 2 / st, x = omega * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      var ch = v - goal, tmp = (vel + omega * ch) * dt;
      vel = (vel - omega * tmp) * e;
      v = goal + (ch + tmp) * e;
    }
    function tick(ts) {
      raf = 0;
      if (dead) return;
      var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60;
      lastTs = ts; tNow = ts;
      var goal = dragging ? dragV : target;
      damp(goal, dragging ? (wheelMode ? 0.16 : 0.08) : SMOOTH, dt);
      var still = !dragging && Math.abs(goal - v) < 0.0004 && Math.abs(vel) < 0.0004;
      if (still) { v = goal; vel = 0; }
      render();
      if (!still || dragging || (FLOAT && visible && !document.hidden)) raf = requestAnimationFrame(tick);
      else lastTs = 0;
    }
    function kick() { if (!raf && !dead) raf = requestAnimationFrame(tick); }

    function goTo(t, instant) {
      if (!LOOP) t = clamp(t, 0, n - 1);
      target = t;
      if (instant) { v = t; vel = 0; }
      kick();
    }
    function step(dir) { goTo(Math.round(target) + dir); pauseAuto(); }
    // shortest way round to shoe i
    function goToIndex(i) {
      if (!LOOP) { goTo(i); return; }
      var d = wrapD(i - target);
      goTo(Math.round(target + d));
    }

    /* ---------- active shoe: info + sizes ---------- */
    function setText(el, t) { if (el) el.textContent = t || ''; }
    function setActive(i) {
      active = i;
      var el = shoes[i];
      shoes.forEach(function (s, k) { s.setAttribute('tabindex', k === i ? '0' : '-1'); s.classList.toggle('so-active', k === i); });
      if (wheel) { wheel.setAttribute('aria-valuenow', i + 1); wheel.setAttribute('aria-valuetext', (el.getAttribute('data-name') || '') + ', ' + (i + 1) + ' / ' + n); }
      var fill = function () {
        setText(elIdx, pad2(i + 1) + ' / ' + pad2(n));
        setText(elTag, el.getAttribute('data-tag'));
        setText(elName, el.getAttribute('data-name'));
        setText(elPrice, el.getAttribute('data-price'));
        setText(elCmp, el.getAttribute('data-cmp'));
        setText(elSub, el.getAttribute('data-sub'));
        if (elView) {
          var u = el.getAttribute('data-url');
          elView.hidden = !u;
          elView.setAttribute('href', u || '#');
        }
        buildSizes(i);
        if (info) info.classList.remove('so-swap');
      };
      if (info && info.getAttribute('data-filled') && !reduce) {
        info.classList.add('so-swap');
        if (info._t) clearTimeout(info._t);
        info._t = later(fill, 140);
      } else { if (info) info.setAttribute('data-filled', '1'); fill(); }
    }

    function sizeIndex(d) {
      if (!d.options || !d.options.length) return -1;
      for (var k = 0; k < d.options.length; k++) {
        var nm = ('' + d.options[k]).toLowerCase();
        if (SIZE_NAMES.indexOf(nm) > -1) return k;
      }
      for (k = 0; k < d.options.length; k++) if (('' + d.options[k]).toLowerCase().indexOf('size') > -1) return k;
      return d.options.length === 1 ? 0 : -1;
    }
    var chosen = {};
    function buildSizes(i) {
      if (!elSizes) return;
      elSizes.innerHTML = '';
      if (elStatus && !elStatus._keep) { elStatus.textContent = ''; elStatus.classList.remove('so-err'); }
      var d = data[i], vs = d.variants || [];
      if (!vs.length) return;
      var si = sizeIndex(d);
      var base = null;
      for (var k = 0; k < vs.length; k++) if (vs[k].av) { base = vs[k]; break; }
      base = base || vs[0];
      var single = si < 0 || (vs.length === 1);
      if (single) {
        var b = mkBtn(STR.add, base, i, true);
        b.classList.add('so-wide');
        if (!base.av) { b.disabled = true; b.textContent = STR.soldout; }
        elSizes.appendChild(b);
        return;
      }
      var seen = [];
      vs.forEach(function (x) { var val = x.opts[si]; if (seen.indexOf(val) < 0) seen.push(val); });
      seen.forEach(function (val) {
        // same colour / other options as the default variant, this size
        var match = null;
        for (var k = 0; k < vs.length; k++) {
          var x = vs[k];
          if (x.opts[si] !== val) continue;
          var same = true;
          for (var o = 0; o < x.opts.length; o++) if (o !== si && x.opts[o] !== base.opts[o]) { same = false; break; }
          if (same) { match = x; break; }
        }
        if (!match) for (k = 0; k < vs.length; k++) if (vs[k].opts[si] === val && vs[k].av) { match = vs[k]; break; }
        var btn = mkBtn(val, match, i, false);
        if (!match || !match.av) { btn.disabled = true; btn.setAttribute('aria-label', val + ' – ' + STR.soldout); }
        if (chosen[i] === val) btn.classList.add('so-on');
        elSizes.appendChild(btn);
      });
    }
    function mkBtn(label, variant, i, single) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'so-size';
      b.textContent = label;
      b.addEventListener('click', function () {
        if (!variant || b.disabled || b.classList.contains('so-busy')) return;
        add(variant, i, single ? '' : label, b);
      });
      return b;
    }

    /* ---------- cart (Horizon storefront events, Dawn drawers, the rest) ---------- */
    function cartRoot() { return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'; }
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
          detail: { items: cart.items, source: 'shoe-orbit', sourceId: sec.id, itemCount: 1, sections: res && res.sections ? res.sections : undefined, didError: false }
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
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'shoe-orbit', cartData: cart });
        }
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('cart:update', { bubbles: true, detail: { resource: cart, sourceId: sec.id, data: { source: 'shoe-orbit', itemCount: cart.item_count, sections: (res && res.sections) || {} } } }));
      if (AFTER === 'drawer') openThemeCart();
    }

    var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="currentColor"/><path d="M4.5 8.2 L7 10.5 L11.5 5.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function showAdded(i, label) {
      if (!elStatus) return;
      var nm = shoes[i].getAttribute('data-name') || '';
      elStatus.classList.remove('so-err');
      elStatus.innerHTML = '';
      var ic = document.createElement('span'); ic.style.color = 'var(--so-acc)'; ic.innerHTML = CHECK; ic.style.display = 'inline-flex';
      var t = document.createElement('span'); t.textContent = nm + (label ? ', ' + label : '') + ' ' + STR.added;
      var a = document.createElement('a'); a.href = cartRoot() + 'cart'; a.textContent = STR.view;
      elStatus.appendChild(ic); elStatus.appendChild(t); elStatus.appendChild(a);
      elStatus._keep = true;
      later(function () { elStatus._keep = false; }, 4000);
    }
    var flying = [];
    function flyToCart(img) {
      if (reduce || !Element.prototype.animate || !img) return;
      var from = img.getBoundingClientRect();
      if (!from.width) return;
      var target = document.querySelector('#cart-icon-bubble, cart-icon, [data-cart-icon], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = img.cloneNode(true);
      f.removeAttribute('srcset'); f.removeAttribute('sizes');
      if (img.currentSrc) f.setAttribute('src', img.currentSrc);
      f.removeAttribute('class'); f.classList.add('so-fly');
      f.style.left = from.left + 'px'; f.style.top = from.top + 'px';
      f.style.width = from.width + 'px'; f.style.height = from.height + 'px';
      document.body.appendChild(f);
      flying.push(f);
      var dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
      var dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
      var a = f.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - 90) + 'px) scale(.4) rotate(-14deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.05) rotate(-24deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        flying.splice(flying.indexOf(f), 1);
        if (target && target.animate) target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      };
    }

    // one add-to-cart for the orbit sizes and the product view
    function cartAdd(variant, i) {
      if (data[i].demo || !variant.id) return Promise.resolve({ demo: true });   // theme editor demo
      var root = cartRoot(), vid = variant.id;
      var ids = cartSectionIds();
      var dawn = dawnDrawer();
      if (dawn) { try { ids = ids.concat(dawn.getSectionsToRender().map(function (x) { return x.section || x.id; })); } catch (e) {} }
      if (document.getElementById('cart-icon-bubble')) ids.push('cart-icon-bubble');
      ids = uniq(ids);
      var body = { items: [{ id: vid, quantity: 1 }] };
      if (ids.length) { body.sections = ids.join(','); body.sections_url = window.location.pathname; }
      var addRes = null;
      return fetch(root + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.status) throw new Error(j.description || j.message || STR.error); return j; }); })
        .then(function (j) { addRes = j; return fetch(root + 'cart.js', { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }); })
        .then(function (cart) {
          if (AFTER === 'cart') { window.location.href = root + 'cart'; return { redirect: true }; }
          document.dispatchEvent(new CustomEvent('shoe-orbit:added', { detail: { variantId: vid, cart: cart } }));
          announceStandard(cart, vid, addRes).then(function (handled) {
            if (dead) return;
            if (handled) { if (AFTER === 'drawer') setTimeout(openThemeCart, 80); }
            else legacyCartUI(cart, addRes, vid);
          });
          return { cart: cart };
        });
    }
    var busy = false;
    function add(variant, i, label, btn) {
      if (busy) return;
      chosen[i] = label;
      [].forEach.call(elSizes.querySelectorAll('.so-size'), function (b) { b.classList.toggle('so-on', b === btn && !!label); });
      busy = true;
      btn.classList.add('so-busy');
      if (elStatus) { elStatus.textContent = ''; elStatus.classList.remove('so-err'); }
      cartAdd(variant, i).then(function (r) {
        if (dead || (r && r.redirect)) return;
        flyToCart(shoes[i].querySelector('.so-img'));
        showAdded(i, label);
      }).catch(function (err) {
        if (dead || !elStatus) return;
        elStatus.textContent = (err && err.message) || STR.error;
        elStatus.classList.add('so-err');
      }).then(function () { busy = false; btn.classList.remove('so-busy'); });
    }

    /* ================= FULL-PAGE PRODUCT VIEW =================
       Opens from a shoe (the shoe flies into place). The arrows move to the next shoe:
       the image blurs and drifts into the next one, the title morphs letter by letter,
       the background tint melts across. */
    var modal = sec.querySelector('[data-so-modal]');
    if (modal) {
      modal.setAttribute('style', sec.getAttribute('style') || '');
      if (sec.classList.contains('so-blend')) modal.classList.add('so-blend-m');
      document.body.appendChild(modal);
    }
    function mq_(sel) { return modal ? modal.querySelector(sel) : null; }
    var mStage = mq_('[data-so-mstage]'), mThumbs = mq_('[data-so-mthumbs]'), mCount = mq_('[data-so-mcount]');
    var mMeta = mq_('[data-so-mmeta]'), mName = mq_('[data-so-mname]'), mPrice = mq_('[data-so-mprice]'), mCmp = mq_('[data-so-mcmp]');
    var mSub = mq_('[data-so-msub]'), mDesc = mq_('[data-so-mdesc]'), mOpts = mq_('[data-so-mopts]');
    var mAdd = mq_('[data-so-madd]'), mAddLbl = mq_('[data-so-maddlbl]'), mStatus = mq_('[data-so-mstatus]'), mLink = mq_('[data-so-mlink]');
    var mClose = mq_('[data-so-mclose]'), mPrev = mq_('[data-so-mprev]'), mNext = mq_('[data-so-mnext]');
    var MORPH = clamp(num(sec, 'data-morph', 850), 200, 2000);
    var mi = -1, mOpen = false, mSel = [], mImg = 0, lastFocus = null, mBusy = false, mHide = null;

    function srcW(url, w) { return url ? url.replace(/([?&])width=\d+/, '$1width=' + w) : url; }
    function imagesOf(i) {
      if (shoes[i]._imgs) return shoes[i]._imgs;
      var d = data[i], out = [], oi = shoes[i].querySelector('.so-img');
      if (d.images && d.images.length) d.images.forEach(function (u) { if (u) out.push({ url: u }); });
      else if (oi && oi.tagName.toLowerCase() === 'svg') out.push({ svg: oi });
      else if (oi) out.push({ url: oi.currentSrc || oi.src });
      shoes[i]._imgs = out;
      return out;
    }
    function slideFor(i, k, quick) {
      var it = imagesOf(i)[k];
      var wrap = document.createElement('div');
      wrap.className = 'so-m-slide';
      if (!it) return wrap;
      if (it.svg) { var c = it.svg.cloneNode(true); c.removeAttribute('class'); wrap.appendChild(c); }
      else {
        var im = new Image();
        im.alt = shoes[i].getAttribute('data-name') || '';
        im.decoding = 'async';
        var oi = shoes[i].querySelector('img.so-img');
        // the first image is the orbit photo: start from the copy already loaded, then sharpen
        if (quick && k === 0 && oi && (oi.currentSrc || oi.src)) {
          im.src = oi.currentSrc || oi.src;
          var hi = new Image(); hi.onload = function () { im.src = it.url; }; hi.src = it.url;
        } else im.src = it.url;
        wrap.appendChild(im);
      }
      return wrap;
    }
    function showImage(k, dir, instant) {
      var list = imagesOf(mi);
      if (!list.length || !mStage) return;
      k = (k + list.length) % list.length;
      mImg = k;
      var el = slideFor(mi, k, instant);
      var old = [].slice.call(mStage.children);
      mStage.appendChild(el);
      if (!instant && !reduce) {
        el.style.setProperty('--dir', dir || 1);
        el.classList.add('so-m-enter');
        old.forEach(function (o) {
          o.style.setProperty('--dir', dir || 1);
          o.classList.remove('so-m-enter');
          o.classList.add('so-m-leave');
          setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, MORPH);
        });
      } else old.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); });
      if (mThumbs) [].forEach.call(mThumbs.children, function (t, j) { t.setAttribute('aria-current', j === k ? 'true' : 'false'); });
    }
    function buildThumbs() {
      if (!mThumbs) return;
      mThumbs.innerHTML = '';
      var list = imagesOf(mi);
      if (list.length < 2) return;
      list.forEach(function (it, j) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'so-m-thumb';
        b.setAttribute('aria-label', 'Image ' + (j + 1));
        if (it.svg) { var c = it.svg.cloneNode(true); c.removeAttribute('class'); b.appendChild(c); }
        else { var im = new Image(); im.alt = ''; im.src = srcW(it.url, 160); b.appendChild(im); }
        b.style.animation = 'soPillIn .5s cubic-bezier(.2,.8,.3,1) ' + (j * 40) + 'ms both';
        b.addEventListener('click', function () { if (j !== mImg) showImage(j, j > mImg ? 1 : -1); });
        mThumbs.appendChild(b);
      });
    }

    /* letters morph: the old word blurs away while the new one blurs in, letter by letter */
    function charsOf(txt, cls, delay) {
      var out = document.createElement('span'), k = 0;
      out.className = cls;
      out.setAttribute('aria-hidden', 'true');
      txt.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { out.appendChild(document.createTextNode(' ')); return; }
        var ws = document.createElement('span');
        ws.className = 'so-mw';
        Array.from(w).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'so-mc';
          c.textContent = ch;
          c.style.animationDelay = (delay + k * 16) + 'ms';
          k++;
          ws.appendChild(c);
        });
        out.appendChild(ws);
      });
      return out;
    }
    function morphText(el, txt, instant) {
      if (!el) return;
      txt = txt || '';
      var cur = el.getAttribute('data-t');
      if (cur === txt) return;
      el.setAttribute('data-t', txt);
      el.setAttribute('aria-label', txt);
      el._mt = {};
      if (instant || reduce || !cur || !txt) { el.classList.remove('so-mt'); el.textContent = txt; return; }
      var tok = el._mt;
      el.classList.add('so-mt');
      el.innerHTML = '';
      el.appendChild(charsOf(cur, 'so-mt-out', 0));
      el.appendChild(charsOf(txt, 'so-mt-in', MORPH * 0.22));
      later(function () { if (el._mt !== tok) return; el.classList.remove('so-mt'); el.textContent = txt; }, MORPH * 1.3 + txt.length * 16);
    }
    function fadeText(el, txt, instant) {
      if (!el) return;
      txt = txt || '';
      if (instant || reduce) { el.textContent = txt; return; }
      if (el.textContent === txt) return;
      el.classList.add('so-fadeout');
      later(function () { el.textContent = txt; el.classList.remove('so-fadeout'); }, 260);
    }

    /* options: colours (with a swatch when the value is a colour name), sizes, anything else */
    function optValues(d, k) {
      if (d.ov && d.ov[k]) return d.ov[k];
      var out = [];
      (d.variants || []).forEach(function (x) { if (out.indexOf(x.opts[k]) < 0) out.push(x.opts[k]); });
      return out;
    }
    function fits(x, sel) { for (var q = 0; q < x.opts.length; q++) if (sel[q] != null && x.opts[q] !== sel[q]) return false; return true; }
    function availWith(sel) { return (data[mi].variants || []).some(function (x) { return x.av && fits(x, sel); }); }
    function existsWith(sel) { return (data[mi].variants || []).some(function (x) { return fits(x, sel); }); }
    function curVariant() {
      if (mSel.some(function (x) { return x == null; })) return null;
      var vs = data[mi].variants || [];
      for (var k = 0; k < vs.length; k++) if (fits(vs[k], mSel)) return vs[k];
      return null;
    }
    function cssColor(val) {
      var c = ('' + val).toLowerCase().replace(/\s+/g, '');
      try { return window.CSS && CSS.supports && CSS.supports('color', c) ? c : ''; } catch (e) { return ''; }
    }
    function buildOpts() {
      if (!mOpts) return;
      mOpts.innerHTML = '';
      var d = data[mi], names = d.options || [], si = sizeIndex(d);
      if (!(d.variants || []).length || (d.variants.length === 1)) return;
      names.forEach(function (nm, k) {
        var vals = optValues(d, k);
        if (vals.length < 2 && k !== si) return;
        var box = document.createElement('div');
        var head = document.createElement('div');
        head.className = 'so-m-optname';
        var hs = document.createElement('span'); hs.textContent = nm;
        var hb = document.createElement('b'); hb.setAttribute('data-k', k);
        head.appendChild(hs); head.appendChild(hb);
        var pills = document.createElement('div');
        pills.className = k === si ? 'so-m-sizes' : 'so-m-pills';
        pills.setAttribute('role', 'group');
        pills.setAttribute('aria-label', nm);
        var isColor = /colou?r|shade/i.test(nm);
        vals.forEach(function (val, j) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'so-m-pill';
          b.setAttribute('data-k', k);
          b.setAttribute('data-val', val);
          b.style.animationDelay = (j * 25) + 'ms';
          if (isColor) {
            var c = cssColor(val);
            if (c) { var sw = document.createElement('span'); sw.className = 'so-sw'; sw.style.background = c; b.appendChild(sw); }
          }
          var t = document.createElement('span'); t.textContent = val; b.appendChild(t);
          b.addEventListener('click', function () {
            if (b.disabled) return;
            mSel[k] = val;
            mAdd.classList.remove('so-done');
            if (mStatus) { mStatus.textContent = ''; mStatus.classList.remove('so-err'); }
            if (k !== si) followVariantImage();
            refreshOpts();
            updateBuy();
          });
          pills.appendChild(b);
        });
        box.appendChild(head);
        box.appendChild(pills);
        mOpts.appendChild(box);
      });
      refreshOpts();
    }
    function refreshOpts() {
      if (!mOpts) return;
      var si = sizeIndex(data[mi]);
      [].forEach.call(mOpts.querySelectorAll('.so-m-pill'), function (b) {
        var k = +b.getAttribute('data-k'), val = b.getAttribute('data-val');
        b.setAttribute('aria-pressed', mSel[k] === val ? 'true' : 'false');
        var test = mSel.slice(); test[k] = val;
        var ok = availWith(test);
        b.classList.toggle('so-na', !ok);
        b.disabled = k === si ? !ok : !existsWith(test);
      });
      [].forEach.call(mOpts.querySelectorAll('.so-m-optname b'), function (h) {
        var k = +h.getAttribute('data-k');
        h.textContent = k === si ? (mSel[k] || '') : (mSel[k] || '');
      });
    }
    function followVariantImage() {
      var vs = data[mi].variants || [], u = '';
      for (var k = 0; k < vs.length; k++) if (vs[k].img && fits(vs[k], mSel.map(function (x, q) { return q === sizeIndex(data[mi]) ? null : x; }))) { u = vs[k].img; break; }
      if (!u) return;
      var list = imagesOf(mi), key = u.split('?')[0], at = -1;
      for (var j = 0; j < list.length; j++) if (list[j].url && list[j].url.split('?')[0] === key) { at = j; break; }
      if (at < 0) { list.push({ url: u }); buildThumbs(); at = list.length - 1; }
      if (at !== mImg) showImage(at, at > mImg ? 1 : -1);
    }
    function updateBuy(instant) {
      if (!mAdd) return;
      var d = data[mi], si = sizeIndex(d), x = curVariant();
      var needSize = si > -1 && (d.variants || []).length > 1 && mSel[si] == null;
      var price = x && x.price ? x.price : shoes[mi].getAttribute('data-price');
      var cmp = x ? (x.cmp || '') : shoes[mi].getAttribute('data-cmp');
      morphText(mPrice, price, instant);
      if (mCmp) mCmp.textContent = cmp || '';
      if (mAdd.classList.contains('so-done')) return;
      mAdd.disabled = needSize || !x || !x.av;
      mAddLbl.textContent = needSize ? STR.select : (!x ? STR.unavailable : (!x.av ? STR.soldout : STR.addbtn));
    }

    function fillModal(i, dir, instant) {
      mi = i;
      var el = shoes[i], d = data[i];
      var tint = el.getAttribute('data-tint');
      if (tint) modal.style.setProperty('--so-tint', tint); else modal.style.removeProperty('--so-tint');
      if (mCount) mCount.textContent = pad2(i + 1) + ' / ' + pad2(n);
      morphText(mName, el.getAttribute('data-name'), instant);
      fadeText(mMeta, el.getAttribute('data-tag'), instant);
      fadeText(mSub, el.getAttribute('data-sub'), instant);
      fadeText(mDesc, d.desc || '', instant);
      var u = el.getAttribute('data-url');
      if (mLink) { mLink.hidden = !u; mLink.setAttribute('href', u || '#'); }
      var vs = d.variants || [], base = null;
      for (var k = 0; k < vs.length; k++) if (vs[k].av) { base = vs[k]; break; }
      base = base || vs[0];
      mSel = base ? base.opts.slice() : [];
      var si = sizeIndex(d);
      if (si > -1 && vs.length > 1) mSel[si] = null;     // the shopper picks the size
      if (mAdd) mAdd.classList.remove('so-done', 'so-busy');
      if (mStatus) { mStatus.textContent = ''; mStatus.classList.remove('so-err'); }
      buildThumbs();
      showImage(0, dir, instant);
      buildOpts();
      updateBuy(instant);
      [].slice.call(imagesOf(i)).slice(0, 3).forEach(function (it) { if (it.url) { var p = new Image(); p.src = it.url; } });
    }
    function stepModal(dir) {
      if (!mOpen) return;
      var i = LOOP ? (mi + dir + n) % n : clamp(mi + dir, 0, n - 1);
      if (i === mi) return;
      goToIndex(i);                 // the orbit turns behind the view
      fillModal(i, dir, false);
    }

    function rotOf(el) { var m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || ''); return m ? parseFloat(m[1]) : 0; }
    function openModal(i) {
      if (!modal || mOpen) return;
      if (mHide) { clearTimeout(mHide); mHide = null; }
      pauseAuto();
      lastFocus = document.activeElement;
      var src = shoes[i], si = src.querySelector('.so-img');
      var from = si ? si.getBoundingClientRect() : null, rot = rotOf(src);
      goToIndex(i);
      modal.classList.add('so-open');
      modal.setAttribute('aria-hidden', 'false');
      modal.scrollTop = 0;
      document.documentElement.classList.add('so-lock');
      [mName, mPrice].forEach(function (x) { if (x) x.removeAttribute('data-t'); });
      fillModal(i, 1, true);
      mOpen = true;
      requestAnimationFrame(function () { modal.classList.add('so-in'); });
      var slide = mStage && mStage.lastElementChild, tgt = slide && slide.firstElementChild;
      if (from && from.width && tgt && !reduce && Element.prototype.animate) {
        var to = tgt.getBoundingClientRect();
        if (to.width && to.height) {
          src.classList.add('so-lifted');
          tgt.animate([
            { transformOrigin: '0 0', transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ') rotate(' + rot + 'deg)' },
            { transformOrigin: '0 0', transform: 'none' }
          ], { duration: 780, easing: 'cubic-bezier(.2,.85,.2,1)' });
          later(function () { src.classList.remove('so-lifted'); }, 800);
        } else if (slide) slide.classList.add('so-m-enter');
      } else if (slide && !reduce) slide.classList.add('so-m-enter');
      if (mClose) { try { mClose.focus({ preventScroll: true }); } catch (e) { mClose.focus(); } }
    }
    function closeModal() {
      if (!mOpen) return;
      mOpen = false;
      modal.classList.remove('so-in');
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('so-lock');
      var src = shoes[mi], si = src && src.querySelector('.so-img');
      var slide = mStage && mStage.lastElementChild, img = slide && slide.firstElementChild;
      var done = function () { modal.classList.remove('so-open'); if (mStage) mStage.innerHTML = ''; if (src) src.classList.remove('so-lifted'); mHide = null; };
      // fly back once the orbit has turned to this shoe
      var to = si ? si.getBoundingClientRect() : null, from = img ? img.getBoundingClientRect() : null;
      var land = G ? { x: (MIRROR ? W - (G.cx + G.R * Math.cos(G.hero * Math.PI / 180)) : G.cx + G.R * Math.cos(G.hero * Math.PI / 180)), y: G.cy - G.R * Math.sin(G.hero * Math.PI / 180) } : null;
      if (from && from.width && to && to.width && land && !reduce && Element.prototype.animate) {
        var sr = sec.getBoundingClientRect();
        var w = src.offsetWidth, h = src.offsetHeight;      // where the front shoe sits, at full size
        var tx = sr.left + land.x - w / 2, ty = sr.top + land.y - h * 0.62;
        src.classList.add('so-lifted');
        img.animate([
          { transformOrigin: '0 0', transform: 'none' },
          { transformOrigin: '0 0', transform: 'translate(' + (tx - from.left) + 'px,' + (ty - from.top) + 'px) scale(' + (w / from.width) + ',' + (h / from.height) + ')' }
        ], { duration: 620, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
        mHide = setTimeout(done, 630);
      } else mHide = setTimeout(done, 420);
      if (lastFocus && lastFocus.focus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (mClose) on(mClose, 'click', closeModal);
    if (mPrev) on(mPrev, 'click', function () { stepModal(-1); });
    if (mNext) on(mNext, 'click', function () { stepModal(1); });
    on(document, 'keydown', function (e) {
      if (!mOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      var tg = e.target && e.target.tagName;
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tg !== 'INPUT' && tg !== 'TEXTAREA') { e.preventDefault(); stepModal(e.key === 'ArrowRight' ? 1 : -1); return; }
      if (e.key === 'Tab') {
        var f = [].filter.call(modal.querySelectorAll('button, a[href]'), function (x) { return !x.disabled && !x.hidden && x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // swipe the big image: next / previous photo
    if (mStage) {
      var sw0 = null;
      on(mStage, 'pointerdown', function (e) { sw0 = { x: e.clientX, y: e.clientY }; });
      on(mStage, 'pointerup', function (e) {
        if (!sw0) return;
        var dx = e.clientX - sw0.x, dy = e.clientY - sw0.y; sw0 = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && imagesOf(mi).length > 1) showImage(mImg + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      });
    }
    if (mAdd) on(mAdd, 'click', function () {
      var x = curVariant();
      if (!x || !x.av || mBusy) return;
      mBusy = true;
      mAdd.classList.add('so-busy');
      if (mStatus) { mStatus.textContent = ''; mStatus.classList.remove('so-err'); }
      var si = sizeIndex(data[mi]), i = mi;
      cartAdd(x, i).then(function (r) {
        if (dead || (r && r.redirect)) return;
        var slide = mStage && mStage.lastElementChild;
        flyToCart(slide && slide.firstElementChild);
        mAdd.classList.add('so-done');
        mAddLbl.textContent = STR.addedbtn;
        if (mStatus) {
          mStatus.innerHTML = '';
          var a = document.createElement('a'); a.href = cartRoot() + 'cart'; a.textContent = STR.view + ' →';
          mStatus.appendChild(a);
        }
        if (AFTER === 'drawer') later(closeModal, 250);
        later(function () { if (mi === i) { mAdd.classList.remove('so-done'); updateBuy(); } }, 2600);
      }).catch(function (err) {
        if (mStatus) { mStatus.textContent = (err && err.message) || STR.error; mStatus.classList.add('so-err'); }
      }).then(function () { mBusy = false; mAdd.classList.remove('so-busy'); });
    });

    /* ---------- drag: the wheel (fine control) and the stage (swipe the shoes) ---------- */
    var drag = null, moved = false;
    function startDrag(e, src, pps) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragV = v;
      drag = { src: src, x: e.clientX, y: e.clientY, v0: v, pps: pps, lx: e.clientX, lt: performance.now(), vv: 0, id: e.pointerId, live: src === wheel };
      moved = false;
      if (src === wheel) {
        e.preventDefault();
        try { wheel.setPointerCapture(e.pointerId); } catch (er) {}
        dragging = true; pauseAuto(); kick();
      }
    }
    function moveDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.live) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) {
          if (Math.abs(dy) > 10) drag = null;                 // vertical: let the page scroll
          return;
        }
        drag.live = true; dragging = true; drag.v0 = dragV = v; drag.x = e.clientX; pauseAuto();
        stage.classList.add('so-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch (er) {}
      }
      moved = true;
      var now = performance.now(), dt = Math.max(1, now - drag.lt);
      drag.vv = drag.vv * 0.6 + (SIGN * (e.clientX - drag.lx) / drag.pps / dt) * 0.4;   // shoes per ms
      drag.lx = e.clientX; drag.lt = now;
      var nv = drag.v0 + SIGN * dx / drag.pps;
      if (!LOOP) nv = nv < 0 ? nv * 0.35 : (nv > n - 1 ? n - 1 + (nv - n + 1) * 0.35 : nv);   // rubber band
      dragV = nv;
      kick();
    }
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      stage.classList.remove('so-dragging');
      if (!d.live) return;
      dragging = false;
      var fresh = performance.now() - d.lt < 80;
      var proj = dragV + (fresh ? clamp(d.vv * 110, -2.5, 2.5) : 0);        // a flick carries on
      goTo(Math.round(proj));
      if (moved) later(function () { moved = false; }, 0);
    }
    if (wheel) on(wheel, 'pointerdown', function (e) { startDrag(e, wheel, mob() ? 46 : 64); });
    on(stage, 'pointerdown', function (e) { startDrag(e, stage, mob() ? 130 : 220); });
    on(window, 'pointermove', moveDrag);
    on(window, 'pointerup', endDrag);
    on(window, 'pointercancel', endDrag);
    on(stage, 'dragstart', function (e) { e.preventDefault(); });

    // clicks: any shoe opens the full-page view
    shoes.forEach(function (el, i) {
      on(el, 'click', function (e) {
        if (moved) { e.preventDefault(); return; }
        openModal(i);
      });
    });
    if (elView) on(elView, 'click', function (e) { if (!modal) return; e.preventDefault(); openModal(active); });

    // mouse wheel / trackpad: always on the wheel itself; on the stage only sideways swipes
    var wAcc = 0, wTimer = null;
    function wheelMove(delta) {
      pauseAuto();
      if (!wheelMode) { wheelMode = true; dragV = dragging ? dragV : v; }
      dragging = true;
      dragV += delta / 240;
      if (!LOOP) dragV = clamp(dragV, -0.3, n - 0.7);
      kick();
      if (wTimer) clearTimeout(wTimer);
      wTimer = later(function () { dragging = false; wheelMode = false; goTo(Math.round(dragV)); }, 160);
    }
    if (wheel) on(wheel, 'wheel', function (e) {
      e.preventDefault();
      var dlt = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) dlt *= 32;
      wheelMove(dlt);
    }, { passive: false });
    on(stage, 'wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 2) return;
      e.preventDefault();
      wheelMove(-SIGN * e.deltaX);
    }, { passive: false });

    if (wheel) on(wheel, 'keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); step(1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (k === 'Home') { e.preventDefault(); goToIndex(0); }
      else if (k === 'End') { e.preventDefault(); goToIndex(n - 1); }
    });

    /* ---------- autoplay (optional) ---------- */
    var autoHold = 0, autoTimer = null;
    function pauseAuto() { autoHold = Date.now() + 7000; }
    if (AUTO) {
      autoTimer = setInterval(function () {
        if (dead || !visible || document.hidden || dragging || autoHold > Date.now()) return;
        if (sec.matches(':hover') || sec.contains(document.activeElement)) return;
        if (!LOOP && Math.round(target) >= n - 1) goTo(0); else goTo(Math.round(target) + 1);
      }, AUTO_MS);
    }

    /* ---------- visibility, resize, start ---------- */
    var io = null, spun = !DROP;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (en) {
        visible = !!(en[0] && en[0].isIntersecting);
        if (visible) {
          if (!spun && en[0].intersectionRatio > 0.25) { spun = true; goTo(START); }
          kick();
        }
      }, { threshold: [0, 0.25] });
      io.observe(sec);
    }
    if (!spun && !io) { spun = true; v = START; }
    var rq = 0;
    on(window, 'resize', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; measure(); }); });
    if (mq) { var mqf = function () { measure(); }; if (mq.addEventListener) on(mq, 'change', mqf); else if (mq.addListener) mq.addListener(mqf); }
    [].forEach.call(sec.querySelectorAll('.so-img'), function (im) {
      if (im.tagName === 'IMG' && !im.complete) on(im, 'load', function () { measure(); }, { once: true });
    });
    on(document, 'visibilitychange', kick);

    measure();
    render();
    sec.classList.add('so-ready');
    kick();

    function select(blockId) {
      for (var i = 0; i < n; i++) if (shoes[i].getAttribute('data-block-id') === blockId) { pauseAuto(); goToIndex(i); return; }
    }
    function destroy() {
      dead = true;
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      if (mq && !mq.addEventListener && mq.removeListener) mq.removeListener(mqf);
      timers.forEach(clearTimeout);
      if (autoTimer) clearInterval(autoTimer);
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      flying.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
      if (mHide) clearTimeout(mHide);
      if (mOpen) document.documentElement.classList.remove('so-lock');
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }
    return { select: select, destroy: destroy };
  }

  function init(sec, o) { if (!sec || instances.has(sec)) return; var i = create(sec, o); if (i) instances.set(sec, i); }
  function destroy(sec) { var i = instances.get(sec); if (i) { i.destroy(); instances.delete(sec); } }
  function initAll(root, o) { [].forEach.call((root || document).querySelectorAll('[data-so]'), function (s) { init(s, o); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); }); else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target, { noDrop: true }); });
  document.addEventListener('shopify:section:unload', function (e) { [].forEach.call(e.target.querySelectorAll('[data-so]'), destroy); });
  document.addEventListener('shopify:block:select', function (e) {
    var s = e.target && e.target.closest ? e.target.closest('[data-so]') : null;
    var i = s && instances.get(s);
    if (i && e.detail) i.select(e.detail.blockId);
  });
  window.ShoeOrbit = { init: init, destroy: destroy, initAll: initAll };
})();
