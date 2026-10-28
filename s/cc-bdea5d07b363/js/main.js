/* CHILLCAT THE BASTET — Official Archive（v2）
   スクロール位置から各場面の進み具合(0〜1)を出し、慣性をつけてなめらかに描く（スクロールそのものは乗っ取らない）。
   プロローグは WebGL（js/gl.js）。動きは縦・寄り・明暗・字の太さだけ。「動きなし」では止めて最後の状態を静かに見せる。 */
(() => {
  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const calm = () => html.classList.contains("calm");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- 入口 ---------- */
  const gate = $("#gate");
  const proVideo = $("#pro-video");
  function leaveGate(asCalm) {
    // ENTER＝「動きを見る」を本人が選んだ。iPhoneの「視差効果を減らす」がオンでも、ここで動きを再生する（ShoSho HPと同じ）
    if (asCalm) html.classList.add("calm");
    else { html.classList.remove("calm"); html.classList.add("motion"); }
    gate.classList.add("is-leaving");
    setTimeout(() => { html.classList.remove("gate-on"); gate.setAttribute("hidden", ""); measure(); }, 1200);
    if (document.activeElement) document.activeElement.blur();
    setupAfterMode();
  }
  $("#enter").addEventListener("click", () => leaveGate(false));
  $("#enter-calm").addEventListener("click", () => leaveGate(true));
  requestAnimationFrame(() => $("#enter").focus({ preventScroll: true }));

  /* ---------- ダイアログ ---------- */
  function wireDialog(dlg) {
    dlg.addEventListener("click", ev => {
      if (ev.target === dlg) dlg.close();
      const c = ev.target.closest("[data-close]");
      if (!c) return;
      const href = c.getAttribute("href");
      dlg.close();
      if (href && href.startsWith("#")) {
        ev.preventDefault();
        const to = href === "#top" ? 0 : $(href).getBoundingClientRect().top + scrollY;
        scrollTo({ top: to, behavior: calm() ? "auto" : "smooth" });
        history.replaceState(null, "", href === "#top" ? location.pathname + location.search : href);
      }
    });
  }
  const menu = $("#menu"), news = $("#news"), detail = $("#detail");
  [menu, news, detail].forEach(wireDialog);
  $("#menu-open").addEventListener("click", () => menu.showModal());
  $("#news-open").addEventListener("click", () => news.showModal());

  /* ---------- 作品の詳細（ジャケットが詳細へ飛ぶ：View Transitions） ---------- */
  const DATA = JSON.parse($("#rel-data").textContent);
  const SPOTIFY = "https://open.spotify.com/artist/1ISGu4AMrhb7CzN9yb1Bsz";
  const featMark = t => esc(t).replace(/\((feat\.[^)]*)\)/, "<em>($1)</em>");
  function fillDetail(r) {
    const date = r.date.replace(/-/g, ".");
    $("#d-cover").innerHTML = r.art
      ? `<img src="${esc(r.art)}" alt="『${esc(r.title)}』のジャケット" referrerpolicy="no-referrer">`
      : `<span class="rel__ghost"><span class="label">NOT ON STREAMING</span><b>${esc(r.title)}</b></span>`;
    $("#d-no").textContent = `No.${String(r.no).padStart(2, "0")} ・ ${r.type} ・ ${date}`;
    $("#d-title").textContent = r.title;
    $("#d-artist").textContent = r.artist;
    const tracks = r.tracks && r.tracks.length ? r.tracks : (r.art ? [r.title] : []);
    $("#d-tracks").innerHTML = tracks.map(t => `<li><span>${featMark(t)}</span></li>`).join("");
    $("#d-note").textContent = r.note || (r.art ? "" : "現在は配信されていません");
    const links = [];
    if (r.url) links.push(`<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener"><span>APPLE MUSIC で聴く ↗</span></a>`);
    if (r.group !== "miiakiis") links.push(`<a class="btn" href="${SPOTIFY}" target="_blank" rel="noopener"><span>SPOTIFY ↗</span></a>`);
    else links.push(`<a class="btn" href="https://miiakiis.bitfan.id/contents/menu/90609" target="_blank" rel="noopener"><span>MIIAKIIS OFFICIAL ↗</span></a>`);
    $("#d-links").innerHTML = links.join("");
  }
  function openDetail(li) {
    const r = DATA[li.dataset.id];
    if (!r) return;
    const src = $(".rel__cover img", li);
    if (document.startViewTransition && src && !calm()) {
      src.style.viewTransitionName = "cover";
      const vt = document.startViewTransition(() => {
        src.style.viewTransitionName = "";
        fillDetail(r);
        detail.showModal();
        const d = $("#d-cover img");
        if (d) d.style.viewTransitionName = "cover";
      });
      vt.finished.finally(() => { const d = $("#d-cover img"); if (d) d.style.viewTransitionName = ""; });
    } else { fillDetail(r); detail.showModal(); }
  }
  document.addEventListener("click", ev => {
    const b = ev.target.closest(".rel__btn");
    if (b) openDetail(b.closest(".rel"));
  });

  /* ---------- 絞り込み ---------- */
  const filters = $$(".filter");
  filters.forEach(f => f.addEventListener("click", () => {
    const g = f.dataset.filter;
    const run = () => {
      filters.forEach(x => x.setAttribute("aria-pressed", String(x === f)));
      $$("#grid .rel").forEach(li => { li.hidden = !(g === "all" || li.dataset.group === g); });
    };
    if (document.startViewTransition && !calm()) document.startViewTransition(run); else run();
  }));

  /* ---------- 記録の札が「解読」されて現れる ---------- */
  const GLYPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.#";
  function decode(el) {
    if (el.dataset.done || calm()) return;
    el.dataset.done = "1";
    const fin = el.textContent, n = fin.length, t0 = performance.now(), dur = 900;
    (function step(now) {
      const k = clamp((now - t0) / dur);
      let out = "";
      for (let i = 0; i < n; i++) {
        const c = fin[i];
        out += (c === " " || c === "—" || i / n < k) ? c : GLYPH[(Math.random() * GLYPH.length) | 0];
      }
      el.textContent = out;
      if (k < 1) requestAnimationFrame(step); else el.textContent = fin;
    })(t0);
  }
  /* ---------- 数字が数え上がる ---------- */
  function countUp(el) {
    if (el.dataset.done || calm()) return;
    el.dataset.done = "1";
    const to = +el.dataset.count, t0 = performance.now(), dur = 1600;
    (function step(now) {
      const k = easeOut(clamp((now - t0) / dur));
      el.textContent = String(Math.round(to * k));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- 出現・登録ログ・年表 ---------- */
  const log = $("#log");
  function pushLog(li) {
    if (!log || !li.closest("#grid")) return;
    const r = DATA[li.dataset.id];
    if (!r) return;
    const row = document.createElement("li");
    row.innerHTML = `No.${String(r.no).padStart(2, "0")} 『${esc(r.title)}』を<b>記録</b>`;
    log.prepend(row);
    while (log.children.length > 7) log.lastElementChild.remove();
  }
  const reveal = el => {
    el.classList.add("is-in");
    if (el.classList.contains("rel")) pushLog(el);
    $$("[data-decode]", el).concat(el.matches("[data-decode]") ? [el] : []).forEach(decode);
    $$("[data-count]", el).forEach(countUp);
  };
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const img = en.target.classList.contains("rel") && $("img", en.target);
    if (img && !img.complete) {
      let done = false;
      const go = () => { if (!done) { done = true; reveal(en.target); } };
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
      setTimeout(go, 2500);
    } else reveal(en.target);
  }), { rootMargin: "0px 0px -8% 0px" });
  $$(".rv, .rel").forEach(el => io.observe(el));

  const tlRows = $$(".tl__row");
  const tlio = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) tlRows.forEach(r => r.classList.toggle("is-now", r === en.target));
  }), { rootMargin: "-46% 0px -46% 0px" });
  tlRows.forEach(r => tlio.observe(r));

  // 触る端末はホバーがないので、画面の中央に来たジャケットだけ色が戻る
  if (matchMedia("(hover: none)").matches) {
    const lio = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle("is-lit", en.isIntersecting)),
      { rootMargin: "-40% 0px -40% 0px" });
    $$(".rel").forEach(li => lio.observe(li));
  }

  /* ---------- 終章の動画（近づいたら読む） ---------- */
  const fv = $("#follow-video");
  if (fv) {
    new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) { fv.pause(); return; }
      if (!fv.src) fv.src = fv.dataset.src;
      if (!calm()) fv.play().catch(() => {});
    }), { rootMargin: "200px 0px" }).observe(fv);
  }

  /* ---------- 信条の文字を1字ずつに ---------- */
  $$("[data-split]").forEach(p => {
    const t = p.textContent;
    p.innerHTML = [...t].map(c => `<span class="ch">${esc(c)}</span>`).join("");
    p.setAttribute("aria-label", t);
  });

  /* ---------- 場面の寸法 ---------- */
  const pro = { sec: $(".prologue"), stage: $("#pro") };
  const cre = { sec: $(".creed"), stage: $("#creed") };
  let VW = innerWidth, VH = innerHeight;
  function measure() {
    VW = innerWidth; VH = innerHeight;
    [pro, cre].forEach(s => {
      const r = s.sec.getBoundingClientRect();
      s.top = r.top + scrollY; s.h = s.sec.offsetHeight; s.sh = s.stage.clientHeight || VH;
    });
    if (glc) glc.resize();
  }
  const prog = s => clamp((scrollY - s.top) / Math.max(1, s.h - s.sh));
  const inView = s => scrollY + VH > s.top - 50 && scrollY < s.top + s.h + 50;

  /* ---------- WebGL ---------- */
  let glc = null;
  function initGL() {
    if (glc || calm() || !window.createProloguGL) return;
    glc = window.createProloguGL($("#gl"), {
      logo: "assets/img/logo_icon.webp", poster: "assets/img/sea_185.webp", video: proVideo,
      eye: [.7658, .3585], eyeR: [.0226, .0105], maxDpr: VW < 720 ? 1.25 : 1.5,
    });
    if (!glc) html.classList.add("no-gl");
  }

  /* ---------- 描画（慣性つき） ---------- */
  const story = $("#pro-story"), vert = $("#pro-vert"), foot = $("#pro-foot"), cap = $("#pro-cap");
  const chars = $$(".creed__ja").map(p => $$(".ch", p));
  const creedEn = $("#creed-en"), sign = $("#creed-sign"), creedBg = $("#creed-bg");
  const progress = $(".progress");
  const cssProgress = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  let pS = 0, vS = 0, cS = 0, videoOn = false;

  function renderPrologue(p, v, t) {
    const s1 = seg(p, .02, .1);
    story.style.opacity = 1 - s1;
    story.style.transform = `translateY(${(-22 * s1).toFixed(1)}px)`;
    vert.style.opacity = foot.style.opacity = 1 - seg(p, .02, .08);
    const c = seg(p, .86, .92) * (1 - seg(p, .975, 1));
    cap.style.opacity = c;
    cap.style.setProperty("--capy", `${((1 - seg(p, .86, .92)) * 20).toFixed(1)}px`);
    const want = p > .4 && p < .999;
    if (want !== videoOn) { videoOn = want; want ? proVideo.play().catch(() => {}) : proVideo.pause(); }
    // 携帯は目が画面の中ほどに来るよう、ロゴを少し左下に置く（最初から固定。横には動かさない）
    if (glc) glc.render(p, v, t, videoOn, VW < 720 ? [-.10, -.06] : [0, -.01], VW < 720 ? .78 : .88);
  }
  function renderCreed(p) {
    chars.forEach((cs, i) => {
      const a = .06 + i * .2, b = a + .22, n = cs.length;
      cs.forEach((el, j) => {
        const st = a + (b - a) * .62 * (j / n);
        const v = easeOut(seg(p, st, st + (b - a) * .38));
        el.style.opacity = v;
        el.style.filter = v > .99 ? "none" : `blur(${((1 - v) * 12).toFixed(2)}px)`;
        el.style.transform = v > .99 ? "none" : `translateY(${(-(1 - v) * .5).toFixed(3)}em)`;
      });
    });
    creedEn.style.opacity = seg(p, .72, .8);
    sign.style.opacity = seg(p, .8, .88);
    creedBg.style.transform = `translateY(${((.5 - p) * 4).toFixed(2)}%) scale(${(1.04 + p * .06).toFixed(3)})`;
  }

  let running = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000 || .016);
    last = now;
    const t = now / 1000;
    if (inView(pro)) {
      const target = prog(pro);
      if (Math.abs(target - pS) > .35) pS = target;          // メニューでの大きな移動は追いかけない
      const prev = pS;
      pS += (target - pS) * (1 - Math.exp(-dt * 6.5));
      vS += ((pS - prev) / Math.max(dt, .001) - vS) * (1 - Math.exp(-dt * 9));
      renderPrologue(pS, vS, t);
    } else if (videoOn) { videoOn = false; proVideo.pause(); }
    if (inView(cre)) {
      const target = prog(cre);
      if (Math.abs(target - cS) > .35) cS = target;
      cS += (target - cS) * (1 - Math.exp(-dt * 7));
      renderCreed(cS);
    }
    if (!cssProgress) progress.style.transform = `scaleY(${clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - VH)).toFixed(4)})`;
    requestAnimationFrame(frame);
  }
  function start() { if (!running && !calm()) { running = true; last = 0; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  function renderCalm() {
    stop();
    proVideo.pause();
    $$(".rv, .rel").forEach(el => el.classList.add("is-in"));
    $$(".tl__row").forEach(r => r.classList.add("is-now"));
    if (!cssProgress) progress.style.transform = "scaleY(0)";
  }
  function setupAfterMode() {
    if (calm()) { renderCalm(); measure(); return; }
    initGL(); measure(); start();
  }

  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : (calm() || start()); });
  let rz;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(measure, 120); });
  addEventListener("load", measure);

  if (calm()) renderCalm();
  else { initGL(); measure(); renderPrologue(0, 0, 0); renderCreed(0); start(); }
})();
