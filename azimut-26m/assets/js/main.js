/* Azimut Grande 26Metri — page behaviour
   Dependencies (deferred, loaded before this file): GSAP 3.12.5, ScrollTrigger, Lenis 1.1.13, config.js, i18n.js
   Everything degrades: if a library is missing or reduced motion is on, the page is fully static and usable. */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var EV = CFG.EVENTS || {};
  var html = document.documentElement;
  /* V7: the head script in index.html decides before paint (html.reduce-motion / html.motion-on / html.gate-on).
     Fallback to the media query only if that script is missing. */
  var reduced = html.classList.contains("js")
    ? html.classList.contains("reduce-motion")
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var osReduce = html.classList.contains("os-reduce");
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var motion = !reduced && hasGsap;
  var lenis = null;
  var MOTION_STORE = "azimut26m.motion";
  function rememberMotion(v) { try { if (v == null) window.localStorage.removeItem(MOTION_STORE); else window.localStorage.setItem(MOTION_STORE, v); } catch (e) { /* private mode: not remembered, still works */ } }
  /* The opening screen: present only while html.gate-on (set by the head script when JS runs and motion is not already off). */
  var gateEl = html.classList.contains("gate-on") ? document.getElementById("gate") : null;
  var gateOpen = !!gateEl;
  var onGateOpen = [];   /* callbacks that start the entrance once the visitor taps */
  /* every string this file writes goes through the dictionary (i18n.js); English fallback if it is missing */
  function t(key, fallback, vars) {
    if (window.I18N && window.I18N.t) return window.I18N.t(key, fallback, vars);
    var s = fallback;
    if (vars) for (var v in vars) if (Object.prototype.hasOwnProperty.call(vars, v)) s = s.split("{" + v + "}").join(vars[v]);
    return s;
  }
  function dealerPhone() { return CFG.PHONE_DISPLAY || t("dealer.fallback", "the dealer"); }

  if (!motion) { html.classList.add("no-motion"); html.classList.remove("has-flow"); } else { html.classList.remove("no-motion"); html.classList.add("has-flow"); }

  /* ---------- analytics (only when IDs exist) ---------- */
  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.src = src; s.async = true; if (cb) s.onload = cb;
    document.head.appendChild(s);
  }
  if (CFG.GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.GA4_ID, { anonymize_ip: true });
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.GA4_ID));
  }
  if (CFG.META_PIXEL_ID) {
    /* standard Meta Pixel bootstrap, without inline attributes */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
  function track(name, params) {
    try {
      if (window.gtag && CFG.GA4_ID) window.gtag("event", name, params || {});
      if (window.fbq && CFG.META_PIXEL_ID) {
        if (name === EV.FORM_SUBMIT) window.fbq("track", "Lead", params || {});
        else window.fbq("trackCustom", name, params || {});
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  /* ---------- smooth scroll ---------- */
  if (motion && hasLenis) {
    lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    window.gsap.ticker.lagSmoothing(0);
    if (gateOpen) lenis.stop();   /* V7: no scrolling behind the opening screen (lenis-stopped + html.gate-on) */
  }
  if (hasGsap) {
    /* V7 (phones): the address bar showing/hiding fires resize on iOS/Android; without this every ScrollTrigger
       refreshed mid-scroll (pinned deck jumps, once-only reveals re-measured). Only real width changes refresh now. */
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  function scrollToHash(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute("href");
    if (hash.length < 2) return;
    if (a.dataset.cta) track(EV.CTA_CLICK, { location: a.dataset.cta });
    e.preventDefault();
    scrollToHash(hash);
    if (history.replaceState) history.replaceState(null, "", hash);
  });

  /* ---------- header + sticky CTA ---------- */
  var header = document.getElementById("siteHeader");
  var sticky = document.getElementById("stickyCta");
  var stickyBtn = sticky.querySelector("a");
  var hero = document.getElementById("hero");
  var enquire = document.getElementById("enquire");
  var lastY = 0, ticking = false;

  /* One continuous background: the body colour is interpolated between each section's tone
     (data-tone 0/1/2 → --bg-0/1/2) as the viewport centre travels from one section's middle to the next. */
  var toneEls = Array.prototype.slice.call(document.querySelectorAll("[data-tone]"));
  var toneHex = [];
  (function () {
    var cs = getComputedStyle(html);
    for (var i = 0; i < 3; i++) toneHex.push(cs.getPropertyValue("--bg-" + i).trim() || "#071c26");
  })();
  var toneLast = "";
  function paintTone() {
    if (!motion || !toneEls.length) return;
    var yc = window.innerHeight / 2, stops = [];
    for (var i = 0; i < toneEls.length; i++) {
      var r = toneEls[i].getBoundingClientRect();
      if (r.height < 2) continue;
      stops.push({ y: r.top + r.height / 2, c: toneHex[+toneEls[i].dataset.tone || 0] });
    }
    var col = stops[0].c;
    for (var j = 0; j < stops.length - 1; j++) {
      var a = stops[j], b = stops[j + 1];
      if (yc >= a.y && yc < b.y) {
        var t = (yc - a.y) / Math.max(1, b.y - a.y);
        t = t * t * (3 - 2 * t); // smoothstep: no visible kink at the section middles
        col = window.gsap.utils.interpolate(a.c, b.c, t);
        break;
      }
      if (yc >= b.y) col = b.c;
    }
    if (col !== toneLast) { toneLast = col; document.body.style.backgroundColor = col; }
  }

  var heroH = 0, enqAbs = 0, vh = window.innerHeight;
  function measure() {
    vh = window.innerHeight;
    heroH = hero.offsetHeight;
    enqAbs = enquire.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
  }
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    paintTone();
    header.classList.toggle("is-solid", y > 40);
    if (y > 240 && y > lastY + 4) header.classList.add("is-hidden");
    else if (y < lastY - 4 || y <= 240) header.classList.remove("is-hidden");
    var hid = header.classList.contains("is-hidden");
    if (!gateOpen) { if (hid && !header.contains(document.activeElement)) header.setAttribute("inert", ""); else header.removeAttribute("inert"); }
    lastY = y;

    var pastHero = y > heroH * 0.85;
    var atForm = (enqAbs - y) < vh * 0.6;
    var show = pastHero && !atForm;
    sticky.classList.toggle("is-visible", show);
    sticky.setAttribute("aria-hidden", show ? "false" : "true");
    stickyBtn.tabIndex = show ? 0 : -1;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- counters ---------- */
  var nums = document.querySelectorAll(".num[data-count]");
  function fmt(v, dec, group) {
    var s = v.toFixed(dec);
    if (group) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return s;
  }
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || "0", 10), group = el.dataset.group === "true";
    if (!motion) { el.textContent = fmt(end, dec, group); return; }
    var o = { v: 0 };
    window.gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", onUpdate: function () { el.textContent = fmt(o.v, dec, group); } });
  }
  if (motion) {
    nums.forEach(function (el) {
      window.ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: function () { countUp(el); } });
    });
  } else { nums.forEach(countUp); }

  /* ---------- generic reveals ---------- */
  var reveals = document.querySelectorAll(".reveal-lines, .r");
  if ("IntersectionObserver" in window && motion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add("is-in"); }); }

  /* ---------- GSAP-driven motion ---------- */
  if (motion) {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    var EASE = "expo.out";

    // Hero → Intro: the sea rises over the picture. One wave band, same geometry as every seam.
    var water = document.querySelector(".hero__water");
    if (water) {
      gsap.fromTo(water, { yPercent: 100 }, { yPercent: 34, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(water.querySelector(".wave__g"), { x: -1440, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    }

    // Section seams: three layers drift by 1/3, 2/3 and one full period (1440 user units) while the band crosses the viewport.
    // Nothing runs while a band is off screen (ScrollTrigger only updates inside start..end).
    document.querySelectorAll(".wave").forEach(function (w) {
      w.querySelectorAll(".wave__g").forEach(function (g) {
        var k = parseFloat(g.dataset.k || "1");
        gsap.fromTo(g, { x: 0 }, { x: -1440 * k, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });

    // Hero: slow settle of the zoom, text rises quietly
    var heroTl = gsap.timeline({ defaults: { ease: EASE }, paused: gateOpen });   /* V7: starts on the tap, not on load */
    heroTl.to(".hero__img", { scale: 1, duration: 7, ease: "power1.out" }, 0)
      .to(".hero__dealer", { opacity: 1, duration: 1.6 }, 0.4)
      .to(".hero__eyebrow", { opacity: 1, duration: 1.6 }, 0.5)
      .to(".hero__title", { opacity: 1, y: 0, duration: 1.8 }, 0.7)
      .to(".hero__sub", { opacity: 1, y: 0, duration: 1.6 }, 1.0)
      .to(".hero__actions", { opacity: 1, y: 0, duration: 1.6 }, 1.2);
    // Hero recedes as you scroll: text lifts away, the picture sinks a little (vertical only), shrinks to 0.96 and dims.
    // .hero__media is oversized by 2.5 % on every side (CSS) so the shrink never shows an edge. No horizontal movement anywhere.
    gsap.to(".hero__content", { y: -60, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__media", { yPercent: 12, scale: 0.96, transformOrigin: "50% 50%", ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__dim", { opacity: 0.55, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    // Time-based breathing (CSS keyframes on .hero__drift) runs only while the hero is on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { hero.classList.toggle("is-live", en.isIntersecting && !gateOpen); });
      }, { threshold: 0.02 }).observe(hero);
    } else if (!gateOpen) hero.classList.add("is-live");
    if (gateOpen) onGateOpen.push(function () { heroTl.play(0); hero.classList.add("is-live"); });

    // Clip reveals (images)
    document.querySelectorAll(".clip-reveal").forEach(function (fig) {
      var target = fig.querySelector(".parallax") || fig.querySelector("img");
      gsap.fromTo(target, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: EASE, scrollTrigger: { trigger: fig, start: "top 82%", once: true } });
    });

    // Parallax inside the big design image
    document.querySelectorAll(".parallax").forEach(function (box) {
      var img = box.querySelector("img");
      gsap.fromTo(img, { yPercent: -9 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // V6: headings, ledes, lists and gallery tiles no longer fade up. Motion is kept for the hero, photographs (clip reveal),
    // the gauge, the deck plan, the range ring and the waves.

    // Walk the deck: pinned horizontal scroll on desktop only
    ST.matchMedia({
      "(min-width: 1024px)": function () {
        var track = document.getElementById("deckTrack");
        var pin = track.parentElement;
        function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
        var tween = gsap.to(track, {
          x: function () { return -dist(); },
          ease: "none",
          scrollTrigger: {
            trigger: pin, start: "top top", end: function () { return "+=" + dist(); },
            pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        return function () { tween.kill(); gsap.set(track, { clearProps: "x" }); };
      }
    });

    // Range ring: grows once from Yokohama, then the places settle in
    var rangeMap = document.getElementById("rangeMap");
    if (rangeMap) {
      gsap.set(".range__ring, .range__ring-fill", { scale: 0, transformOrigin: "500px 500px" });
      var rangeTl = gsap.timeline({ paused: true, defaults: { ease: EASE } });
      rangeTl.to(".range__ring", { scale: 1, duration: 2.4 }, 0)
        .to(".range__ring-fill", { scale: 1, duration: 2.4 }, 0)
        .to(".range__places .range__home", { opacity: 1, duration: 1 }, 0.2)
        .set(".range__places", { opacity: 1 }, 0)
        .fromTo(".range__place", { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.12 }, 1.0)
        .to(".range__label", { opacity: 1, duration: 1.2 }, 2.0);
      gsap.set(".range__place", { opacity: 0 });
      ST.create({ trigger: rangeMap, start: "top 72%", once: true, onEnter: function () { rangeTl.play(); } });
    }

    window.addEventListener("load", function () { ST.refresh(); paintTone(); });
    ST.addEventListener("refresh", paintTone);
  }

  /* ---------- speed gauge (0 -> 20 eco -> 24 cruise -> 28 max) ---------- */
  var gauge = document.getElementById("gauge");
  if (gauge) {
    var needle = document.getElementById("gaugeNeedle"), arcOn = document.getElementById("gaugeArc");
    var knEl = document.getElementById("gaugeKn"), lphEl = document.getElementById("gaugeLph");
    var stops = [{ v: 20, lph: "395 L/h" }, { v: 24, lph: "497 L/h" }, { v: 28, lph: "657 L/h" }];
    var MAX = 30;
    function markOn(v) {
      stops.forEach(function (s) {
        var on = v >= s.v - 0.01;
        gauge.querySelectorAll('[data-v="' + s.v + '"]').forEach(function (el) { el.classList.toggle("is-on", on); });
      });
    }
    function setGauge(v) {
      needle.style.transform = "rotate(" + (-90 + v / MAX * 180) + "deg)";
      arcOn.style.strokeDashoffset = String(1 - v / MAX);
      knEl.textContent = Math.round(v);
      var cur = null;
      stops.forEach(function (s) { if (v >= s.v - 0.01) cur = s; });
      lphEl.textContent = cur ? cur.lph : " ";
      markOn(v);
    }
    if (motion) {
      var g = { v: 0 };
      var gtl = window.gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onUpdate: function () { setGauge(g.v); } });
      gtl.to(g, { v: 20, duration: 1.8 })
        .to(g, { v: 24, duration: 1.2 }, "+=0.9")
        .to(g, { v: 28, duration: 1.2 }, "+=0.9");
      window.ScrollTrigger.create({ trigger: gauge, start: "top 70%", once: true, onEnter: function () { gtl.play(); } });
      setGauge(0);
    } else {
      setGauge(28);
    }
  }

  /* ---------- deck plan: tabs, scan-in, hotspots ---------- */
  var plans = document.getElementById("plans");
  if (plans) {
    var tabs = Array.prototype.slice.call(plans.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(plans.querySelectorAll('[role="tabpanel"]'));
    var planImg = document.getElementById("planImg"), planCap = document.getElementById("planCap"), planSrc = document.getElementById("planSrc");
    var pinned = null; // the hotspot chosen by click/keyboard; hover previews, then returns to it

    function scanIn(panel) {
      var img = panel.querySelector(".plans__img");
      if (!img) return;
      if (!motion) { img.classList.add("is-drawn"); return; }
      img.classList.remove("is-drawn");
      window.gsap.fromTo(img, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease: "power2.inOut", overwrite: true, onComplete: function () { img.classList.add("is-drawn"); } });
      window.gsap.fromTo(panel.querySelectorAll(".hs"), { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.08, delay: 1.2, ease: "expo.out", overwrite: true });
    }
    function showPhoto(btn) {
      if (!btn) return;
      var src = btn.dataset.img;
      if (planImg.getAttribute("src") !== src) { planImg.src = src; }
      planImg.alt = btn.dataset.cap || "";
      planCap.textContent = btn.dataset.cap || "";
      planSrc.textContent = t("plans.src.boat", "Photographed on this boat"); /* V5: every hotspot photo is of this boat */
    }
    function setActive(btn) {
      plans.querySelectorAll(".hs.is-active").forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
      if (btn) { btn.classList.add("is-active"); btn.setAttribute("aria-pressed", "true"); }
      pinned = btn;
      showPhoto(btn);
    }
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
      var panel = document.getElementById(tab.getAttribute("aria-controls"));
      scanIn(panel);
      var first = panel.querySelector(".hs");
      setActive(first);
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { selectTab(t, false); });
      t.addEventListener("keydown", function (e) {
        var j = i;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        else return;
        e.preventDefault(); selectTab(tabs[j], true);
      });
    });
    plans.querySelectorAll(".hs").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { setActive(b); });
      b.addEventListener("mouseenter", function () { showPhoto(b); });
      b.addEventListener("mouseleave", function () { showPhoto(pinned); });
      b.addEventListener("focus", function () { showPhoto(b); });
      b.addEventListener("blur", function () { showPhoto(pinned); });
    });
    // initial deck: Main. Scan when it enters the viewport (once); other decks scan when chosen.
    var mainPanel = document.getElementById("plan-main");
    setActive(mainPanel.querySelector(".hs"));
    document.addEventListener("i18n:change", function () { showPhoto(pinned); });
    if (motion) {
      window.gsap.set(mainPanel.querySelectorAll(".hs"), { opacity: 0 });
      window.ScrollTrigger.create({ trigger: plans, start: "top 65%", once: true, onEnter: function () { scanIn(mainPanel); } });
    } else {
      panels.forEach(function (p) { p.querySelector(".plans__img").classList.add("is-drawn"); });
    }
  }

  /* ---------- hover magnifier (fine pointers only; static when reduced motion) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("img[data-magnify]").forEach(function (img) {
      var box = img.parentElement;
      box.classList.add("magnify");
      var lens = document.createElement("div");
      lens.className = "lens"; lens.setAttribute("aria-hidden", "true");
      box.appendChild(lens);
      var ZOOM = 2.4, SIZE = 200;
      function move(e) {
        var r = img.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.classList.remove("is-on"); return; }
        var ox = img.offsetLeft, oy = img.offsetTop;
        lens.style.left = (ox + x) + "px"; lens.style.top = (oy + y) + "px";
        lens.style.backgroundImage = "url(" + img.currentSrc + ")";
        var nw = img.naturalWidth || r.width, nh = img.naturalHeight || r.height;
        var sc = Math.max(r.width / nw, r.height / nh), dw = nw * sc, dh = nh * sc;
        var offx = (r.width - dw) / 2, offy = (r.height - dh) / 2;
        lens.style.backgroundSize = (dw * ZOOM) + "px " + (dh * ZOOM) + "px";
        lens.style.backgroundPosition = (-((x - offx) * ZOOM) + SIZE / 2) + "px " + (-((y - offy) * ZOOM) + SIZE / 2) + "px";
        lens.classList.add("is-on");
      }
      img.addEventListener("mousemove", move);
      img.addEventListener("mouseleave", function () { lens.classList.remove("is-on"); });
    });
  }

  /* ---------- lightbox ---------- */
  var tiles = Array.prototype.slice.call(document.querySelectorAll("#galleryGrid .g"));
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg"), lbCap = document.getElementById("lbCap"), lbCount = document.getElementById("lbCount");
  var idx = 0, lastFocus = null, touchX = null;

  function show(i) {
    idx = (i + tiles.length) % tiles.length;
    var tile = tiles[idx];
    lbImg.src = tile.dataset.full;
    lbImg.alt = tile.querySelector("img").alt;
    lbCap.textContent = tile.dataset.cap || "";
    lbCount.textContent = (idx + 1) + " / " + tiles.length;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();
    document.getElementById("lbClose").focus();
    track(EV.GALLERY_OPEN, { index: idx });
  }
  function closeLb() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
    setTimeout(function () { lb.hidden = true; lbImg.src = ""; }, reduced ? 0 : 400);
    if (lastFocus) lastFocus.focus();
  }
  tiles.forEach(function (tile, i) { tile.addEventListener("click", function () { openLb(i); }); });
  document.addEventListener("i18n:change", function () { if (!lb.hidden) show(idx); });
  document.getElementById("lbClose").addEventListener("click", closeLb);
  document.getElementById("lbPrev").addEventListener("click", function () { show(idx - 1); });
  document.getElementById("lbNext").addEventListener("click", function () { show(idx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox__fig")) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "Tab") {
      // keep focus inside the dialog
      var f = Array.prototype.filter.call(lb.querySelectorAll("button"), function (b) { return b.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  lb.addEventListener("touchstart", function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) show(dx < 0 ? idx + 1 : idx - 1);
  }, { passive: true });

  /* ---------- contact fallbacks from config ---------- */
  var alt = document.getElementById("altContact");
  var altBits = [];
  /* V7: the enquiry address is a plain mailto link in the Enquire list and the footer (all languages) */
  if (CFG.CONTACT_EMAIL) {
    var mailHref = "mailto:" + CFG.CONTACT_EMAIL;
    var cm = document.getElementById("contactEmail");
    if (cm) { cm.innerHTML = '<a href="' + mailHref + '">' + CFG.CONTACT_EMAIL + "</a>"; document.querySelectorAll(".contact__mail").forEach(function (el) { el.hidden = false; }); }
    var fm = document.getElementById("footerMail"), fml = document.getElementById("footerMailLink");
    if (fm && fml) { fml.href = mailHref; fml.textContent = CFG.CONTACT_EMAIL; fm.hidden = false; }
  }
  if (CFG.WHATSAPP) altBits.push('<a href="https://wa.me/' + encodeURIComponent(CFG.WHATSAPP) + '" rel="noopener" target="_blank">WhatsApp</a>');
  function renderAlt() { if (altBits.length) { alt.innerHTML = t("alt.write", "Or write directly:") + " " + altBits.join(" · "); alt.hidden = false; } }
  renderAlt();
  document.addEventListener("i18n:change", function () { renderAlt(); measure(); if (window.ScrollTrigger && motion) window.ScrollTrigger.refresh(); });
  if (CFG.PHONE_TEL) {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { a.href = "tel:" + CFG.PHONE_TEL; if (CFG.PHONE_DISPLAY) a.textContent = CFG.PHONE_DISPLAY; });
  }

  /* ---------- enquiry form ---------- */
  var form = document.getElementById("enquiryForm");
  var status = document.getElementById("formStatus");
  var started = false;
  form.addEventListener("focusin", function () { if (!started) { started = true; track(EV.FORM_START); } });

  function setErr(id, msg) {
    var input = document.getElementById("f-" + id), p = document.getElementById("e-" + id);
    if (!input) return;
    input.closest(".field").classList.toggle("is-invalid", !!msg);
    if (p) p.textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validate() {
    var ok = true;
    var name = form.name.value.trim(), email = form.email.value.trim(), country = form.country.value.trim(), phone = form.phone.value.trim();
    if (name.length < 2) { setErr("name", t("form.err.name", "Please enter your name.")); ok = false; } else setErr("name", "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr("email", t("form.err.email", "Please enter a valid email address.")); ok = false; } else setErr("email", "");
    if (country.length < 2) { setErr("country", t("form.err.country", "Please tell us your country or region.")); ok = false; } else setErr("country", "");
    if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone)) { setErr("phone", t("form.err.phone", "Please check the phone number.")); ok = false; } else setErr("phone", "");
    return ok;
  }
  ["name", "email", "country", "phone"].forEach(function (id) {
    var el = document.getElementById("f-" + id);
    el.addEventListener("blur", function () { if (started) validate(); });
  });

  function setStatus(msg, cls) { status.textContent = msg; status.className = "form__status" + (cls ? " " + cls : ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form._gotcha && form._gotcha.value) { setStatus(t("form.thanks", "Thank you."), "is-ok"); return; } // honeypot: silently drop (Formspree drops _gotcha too)
    if (!validate()) {
      setStatus(t("form.err.fields", "Please check the highlighted fields."), "is-err");
      var firstBad = form.querySelector(".is-invalid input, .is-invalid textarea");
      if (firstBad) firstBad.focus({ preventScroll: false });
      track(EV.FORM_ERROR, { reason: "validation" });
      return;
    }

    var lang = form.lang ? form.lang.value : "en";
    var pageUrl = "";
    try { pageUrl = window.location.href.split("#")[0]; } catch (e) { /* ignore */ }
    /* V7 payload (Formspree, JSON). _subject is plain ASCII plus the language code; _replyto lets the inbox reply to the visitor;
       _gotcha is the honeypot (empty for real people). */
    var data = {
      name: form.name.value.trim(), email: form.email.value.trim(), country: form.country.value.trim(),
      phone: form.phone.value.trim(), message: form.message.value.trim(),
      listing: form.listing.value, lang: lang, page: pageUrl,
      _subject: (form._subject.value || "[Azimut LP] Enquiry") + " (" + lang + ")",
      _replyto: form.email.value.trim(),
      _gotcha: form._gotcha ? form._gotcha.value : ""
    };
    var btn = document.getElementById("submitBtn");
    function mailtoHref() {
      var body = t("mail.name", "Name") + ": " + data.name + "\n" + t("mail.email", "Email") + ": " + data.email + "\n" + t("mail.country", "Country") + ": " + data.country +
        (data.phone ? "\n" + t("mail.phone", "Phone") + ": " + data.phone : "") + "\n\n" + data.message + "\n\n— " + data.listing;
      return "mailto:" + CFG.CONTACT_EMAIL + "?subject=" + encodeURIComponent(t("mail.subject", "Azimut Grande 26Metri enquiry")) + "&body=" + encodeURIComponent(body);
    }

    if (CFG.FORM_ENDPOINT) {
      btn.disabled = true; setStatus(t("form.sending", "Sending…"));
      fetch(CFG.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json().catch(function () { return {}; }); })
        .then(function () {
          form.classList.add("is-sent");
          setStatus(t("form.ok", "Thank you. We will reply as soon as we can."), "is-ok");
          track(EV.FORM_SUBMIT, { method: "endpoint" });
        })
        .catch(function () {
          /* offline, blocked, or the endpoint refused: never lose the enquiry — offer the prepared email and the phone */
          btn.disabled = false;
          if (CFG.CONTACT_EMAIL) {
            var phoneHtml = CFG.PHONE_TEL ? '<a href="tel:' + CFG.PHONE_TEL + '">' + dealerPhone() + "</a>" : dealerPhone();
            var mailHtml = '<a href="' + mailtoHref().replace(/"/g, "&quot;") + '">' + CFG.CONTACT_EMAIL + "</a>";
            status.innerHTML = t("form.failMail", "We could not send your enquiry. Please email {email} or call {phone}.", { email: mailHtml, phone: phoneHtml });
            status.className = "form__status is-err";
          } else {
            setStatus(t("form.fail", "Something went wrong. Please try again or call {phone}.", { phone: dealerPhone() }), "is-err");
          }
          track(EV.FORM_ERROR, { reason: "endpoint" });
        });
      return;
    }

    if (CFG.CONTACT_EMAIL) {
      window.location.href = mailtoHref();
      setStatus(t("form.mailto", "Your email app should open with the enquiry prepared. If it does not, call {phone}.", { phone: dealerPhone() }), "is-ok");
      track(EV.FORM_SUBMIT, { method: "mailto" });
      return;
    }

    // No endpoint and no email configured yet: never pretend to send.
    setStatus(t("form.notConfigured", "Online enquiries are not connected yet. Please call {phone} (9:00–18:00 JST).", { phone: dealerPhone() }), "is-err");
    track(EV.FORM_ERROR, { reason: "not_configured" });
  });

  /* ---------- V7: opening screen (tap to enter) ---------- */
  function langQuery() {
    var l = (window.I18N && window.I18N.lang) || "en";
    return "?lang=" + (l === "zh-Hant" ? "zh" : l);
  }
  function reloadWith(query) { try { window.location.replace(window.location.pathname + query); } catch (e) { window.location.search = query; } }
  function closeGate(withMotion) {
    if (!gateEl) return;
    var g = gateEl; gateEl = null; gateOpen = false;
    html.classList.remove("gate-on");
    g.classList.add("is-out");
    g.setAttribute("aria-hidden", "true");
    document.querySelectorAll("[data-gate-inert]").forEach(function (el) { el.removeAttribute("inert"); el.removeAttribute("data-gate-inert"); });
    window.scrollTo(0, 0);
    if (lenis) lenis.start();
    var main = document.getElementById("top");
    if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
    if (withMotion) {
      onGateOpen.forEach(function (fn) { try { fn(); } catch (e) { /* one failing entrance must not stop the others */ } });
      if (motion) { window.ScrollTrigger.refresh(); paintTone(); onScroll(); }
    }
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, reduced ? 0 : 1300);
  }
  if (gateEl) {
    window.__gateReady = true;   /* head script removes the gate after 6 s if this never runs (script failed to load) */
    /* everything behind the dialog is inert until it closes */
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== gateEl && !el.hasAttribute("inert")) { el.setAttribute("inert", ""); el.setAttribute("data-gate-inert", ""); }
    });
    var enterBtn = document.getElementById("gateEnter"), quietBtn = document.getElementById("gateQuiet");
    /* OS reduced motion and no saved choice: Enter opens the static page; the small link offers motion (remembered, then reload) */
    var offerMotion = osReduce && !html.classList.contains("motion-on");
    function labelGate() {
      if (!quietBtn) return;
      quietBtn.setAttribute("data-i18n", offerMotion ? "gate.motion" : "gate.quiet");
      quietBtn.textContent = offerMotion ? t("gate.motion", "Play with motion") : t("gate.quiet", "View without motion");
    }
    labelGate();
    document.addEventListener("i18n:change", labelGate);
    enterBtn.addEventListener("click", function () { closeGate(motion); });
    quietBtn.addEventListener("click", function () {
      if (offerMotion) { rememberMotion("1"); reloadWith(langQuery()); return; }
      rememberMotion("0");
      reloadWith(langQuery() + "&reduce=1");
    });
    document.addEventListener("keydown", function (e) {
      if (!gateEl) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target && e.target.closest && e.target.closest("button, a, input, textarea, select")) return; /* a focused button handles its own key */
      e.preventDefault(); closeGate(motion);
    });
    try { enterBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  /* footer toggle: the way back from "View without motion" (and a way to switch it off later) */
  var mt = document.getElementById("motionToggle");
  if (mt) {
    var isOff = reduced;
    function labelToggle() {
      mt.setAttribute("data-i18n", isOff ? "motion.on" : "motion.off");
      mt.textContent = isOff ? t("motion.on", "View with motion") : t("motion.off", "View without motion");
    }
    labelToggle();
    document.addEventListener("i18n:change", labelToggle);
    mt.hidden = !hasGsap;
    mt.addEventListener("click", function () {
      if (isOff) { rememberMotion("1"); reloadWith(langQuery()); }
      else { rememberMotion("0"); reloadWith(langQuery() + "&reduce=1"); }
    });
  }
})();
