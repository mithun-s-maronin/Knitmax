/* ===========================================================================
   KNITMAX EXPORTS — interaction layer
   Content fill · line reveals · cinematic panel recede · parallax · tilt
   =========================================================================== */
(function () {
  'use strict';

  var C = window.KNITMAX_CONTENT || {};
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LIGHT = { cream: 1, cream2: 1, coral: 1, coral2: 1 };

  /* ---------------------------------------------------------------- 1. content */
  function applyContent() {
    var tokens = Object.keys(C).filter(function (k) {
      return /^TODO_/.test(k) && typeof C[k] === 'string' && C[k].length;
    }).sort(function (a, b) { return b.length - a.length; });   // longest first

    if (tokens.length) {
      var re = new RegExp('(' + tokens.join('|') + ')', 'g');
      var swap = function (m) { return C[m]; };

      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var hits = [], n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue.indexOf('TODO_') !== -1) hits.push(n);
      }
      hits.forEach(function (t) { t.nodeValue = t.nodeValue.replace(re, swap); });

      document.querySelectorAll('[href],[aria-label]').forEach(function (el) {
        ['href', 'aria-label'].forEach(function (a) {
          var v = el.getAttribute(a);
          if (!v || v.indexOf('TODO_') === -1) return;
          v = v.replace(re, swap);
          /* tel: URIs must not carry the display spacing */
          if (a === 'href' && v.indexOf('tel:') === 0) v = 'tel:' + v.slice(4).replace(/[^\d+]/g, '');
          el.setAttribute(a, v);
        });
      });
    }

    /* quality metrics — only fill slots the owner has verified */
    var metrics = C.METRICS || [];
    metrics.forEach(function (m, i) {
      if (!m) return;
      var el = document.querySelector('.stat[data-stat="' + i + '"]');
      if (!el) return;
      if (m.value != null) el.querySelector('.stat__v b').textContent = m.value;
      el.querySelector('.stat__v span').textContent = m.suffix || '';
      if (m.label) el.querySelector('.stat__l').textContent = m.label;
    });

    var allReal = metrics.length === 4 && metrics.every(Boolean);
    var note = document.querySelector('.quality__note');
    if (note && allReal) {
      note.textContent = C.TODO_CERTIFICATIONS ? 'Certifications: ' + C.TODO_CERTIFICATIONS : '';
    }

    var y = document.querySelector('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------- 2. reveal */
  function prepareReveals() {
    document.querySelectorAll('.h-display, .hero__title').forEach(function (h) {
      var lines = h.querySelectorAll(':scope > .rl');
      for (var i = 0; i < lines.length; i++) lines[i].style.setProperty('--i', i);
    });
    document.querySelectorAll('.process__track .step').forEach(function (s, i) {
      s.style.setProperty('--i', i);
    });
    document.querySelectorAll('.gallery .g').forEach(function (g, i) {
      g.querySelector('.mask').style.transitionDelay = (i * 0.09).toFixed(2) + 's';
    });
  }

  function observe() {
    var targets = document.querySelectorAll('[data-panel]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------------------------------------------------------------- 3. scroll */
  var panels = [].slice.call(document.querySelectorAll('[data-panel]'));
  var parallaxEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var nav = document.getElementById('nav');
  var progressLine = document.querySelector('[data-progress-line]');
  var processPanel = document.getElementById('process');
  var ticking = false;

  function stackOn() {
    return matchMedia('(min-width:861px) and (min-height:720px)').matches;
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function frame() {
    var vh = innerHeight, i, r;

    /* --- panels recede as the next sheet is laid over them --- */
    if (stackOn() && !reduce) {
      for (i = 0; i < panels.length; i++) {
        var next = panels[i + 1], p = 0;
        if (next) p = clamp(1 - next.getBoundingClientRect().top / vh);
        panels[i].style.setProperty('--recede', p.toFixed(3));
      }
    } else {
      for (i = 0; i < panels.length; i++) panels[i].style.setProperty('--recede', '0');
    }

    /* --- very light parallax --- */
    if (!reduce) {
      for (i = 0; i < parallaxEls.length; i++) {
        var el = parallaxEls[i];
        r = el.getBoundingClientRect();
        var amt = parseFloat(el.getAttribute('data-parallax')) || 20;
        var d = (r.top + r.height / 2 - vh / 2) / vh;
        d = d < -1 ? -1 : d > 1 ? 1 : d;
        el.style.setProperty('--py', (-d * amt).toFixed(1) + 'px');
      }
    }

    /* --- process progress line --- */
    if (progressLine && processPanel) {
      r = processPanel.getBoundingClientRect();
      progressLine.style.setProperty('--p', clamp((vh - r.top) / (vh * 0.92)).toFixed(3));
    }

    /* --- nav adapts to whichever panel is painted under it --- */
    if (nav) {
      var mode = 'dark';
      for (i = 0; i < panels.length; i++) {
        r = panels[i].getBoundingClientRect();
        if (r.top <= 44 && r.bottom > 44) {
          mode = panels[i].getAttribute('data-nav') ||
                 (LIGHT[panels[i].getAttribute('data-theme')] ? 'light' : 'dark');
        }
      }
      if (nav.getAttribute('data-on') !== mode) nav.setAttribute('data-on', mode);
    }

    ticking = false;
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  /* ---------------------------------------------------------------- 4. hero tilt */
  function heroTilt() {
    var host = document.querySelector('.hero__frame');
    var visual = document.querySelector('.hero__visual');
    if (!host || !visual || reduce) return;
    if (!matchMedia('(hover:hover) and (pointer:fine) and (min-width:861px)').matches) return;

    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;    // -0.5 … 0.5
      var ny = (e.clientY - r.top) / r.height - 0.5;
      visual.style.setProperty('--tx', (nx * 16).toFixed(2) + 'px');   // max 8px
      visual.style.setProperty('--ty', (ny * 12).toFixed(2) + 'px');   // max 6px
      visual.style.setProperty('--rot', (nx * 1.1).toFixed(3) + 'deg'); // max 0.55deg
    });
    host.addEventListener('pointerleave', function () {
      visual.style.setProperty('--tx', '0px');
      visual.style.setProperty('--ty', '0px');
      visual.style.setProperty('--rot', '0deg');
    });
  }

  /* ---------------------------------------------------------------- 5. menu */
  function mobileMenu() {
    var burger = document.querySelector('.nav__burger');
    var menu = document.getElementById('mobileMenu');
    if (!burger || !menu) return;

    function set(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function () { set(menu.hidden); });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') set(false);
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) set(false);
    });
  }

  /* ---------------------------------------------------------------- 6. form */
  function enquiryForm() {
    var form = document.querySelector('.form');
    if (!form) return;
    var note = form.querySelector('.form__note');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (!C.FORM_ENDPOINT) {
        note.textContent = 'Form endpoint not configured — set FORM_ENDPOINT in js/content.js.';
        return;
      }
      note.textContent = 'Sending…';
      fetch(C.FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      }).then(function (res) {
        if (res.ok) { form.reset(); note.textContent = 'Thank you — we will be in touch shortly.'; }
        else { note.textContent = 'Something went wrong. Please email us directly.'; }
      }).catch(function () {
        note.textContent = 'Network error. Please email us directly.';
      });
    });
  }

  /* ---------------------------------------------------------------- init */
  applyContent();
  prepareReveals();
  observe();
  heroTilt();
  mobileMenu();
  enquiryForm();
  frame();

  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
})();
