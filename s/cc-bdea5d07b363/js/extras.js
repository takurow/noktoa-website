/* CHILLCAT HP — 追加の仕掛け（暗がりを探す／夜の一曲／九つの目）。JSなしでも本文は読める。 */
(() => {
  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = () => html.classList.contains("calm");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 保存できなくても動く */ } }
  };

  /* ---------- 1. 暗がりを光で探す ---------- */
  $$(".spot").forEach(el => {
    let tx = .5, ty = .4, x = .5, y = .4, raf = 0, idle = 0;
    const set = () => { el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%"); };
    const tick = t => {
      raf = 0;
      if (calm() || !el.classList.contains("is-live")) return;
      if (performance.now() - idle > 2600) { // 触っていないあいだは、光がゆっくり漂う
        tx = .5 + Math.sin(t / 2600) * .28; ty = .42 + Math.cos(t / 3300) * .16;
      }
      x += (tx - x) * .08; y += (ty - y) * .08; set();
      raf = requestAnimationFrame(tick);
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = ev => {
      const r = el.getBoundingClientRect();
      tx = (ev.clientX - r.left) / r.width; ty = (ev.clientY - r.top) / r.height; idle = performance.now(); run();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", move);
    new IntersectionObserver(es => es.forEach(e => { el.classList.toggle("is-live", e.isIntersecting); if (e.isIntersecting) run(); }), { threshold: .15 }).observe(el);
    set();
  });

  /* ---------- 2. 一曲引く（レコードが滑り出てくる） ---------- */
  const draw = $("#draw");
  const DATA = $("#rel-data") ? JSON.parse($("#rel-data").textContent) : null;
  if (draw && DATA) {
    draw.hidden = false;
    const pool = Object.entries(DATA).filter(([, r]) => r.art);
    const cover = $("#draw-cover"), glow = $("#draw-glow"), t = $("#draw-t"), s = $("#draw-s"), l = $("#draw-l"), go = $("#draw-go");
    let last = "", busy = false, warmed = false;
    const warm = () => { if (warmed) return; warmed = true; pool.forEach(([, r]) => { const i = new Image(); i.referrerPolicy = "no-referrer"; i.src = r.art; }); };
    new IntersectionObserver(es => { if (es[0].isIntersecting) warm(); }, { rootMargin: "400px" }).observe(draw);
    const paint = r => {
      cover.style.backgroundImage = `url("${r.art.replace(/"/g, "%22")}")`;
      glow.style.backgroundImage = cover.style.backgroundImage;
    };
    go.addEventListener("click", () => {
      if (busy) return;
      busy = true; warm();
      draw.classList.remove("is-final"); draw.classList.add("is-drawing");
      l.innerHTML = ""; t.textContent = ""; s.textContent = "";
      let pick;
      do { pick = pool[Math.floor(Math.random() * pool.length)]; } while (pick[0] === last && pool.length > 1);
      last = pick[0];
      const steps = calm() ? 1 : 16;
      let i = 0;
      const step = () => {
        i++;
        if (i >= steps) {
          const r = pick[1];
          paint(r);
          t.textContent = r.title;
          s.textContent = `${r.artist}　${r.date.slice(0, 4)}年`;
          l.innerHTML = `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener"><span>聴く ↗</span></a>`;
          go.querySelector("span").textContent = "もう一曲引く";
          draw.classList.remove("is-drawing"); draw.classList.add("is-final"); busy = false;
          return;
        }
        paint(pool[Math.floor(Math.random() * pool.length)][1]);
        setTimeout(step, 50 + i * 16);
      };
      step();
    });
  }

  /* ---------- 3. 九つの目 ---------- */
  const SPOTS = [ // [章のid, 横%, 縦%]
    ["profile", 90, 8], ["names", 8, 70], ["roots", 90, 82], ["years", 90, 30], ["roads", 8, 88],
    ["archive", 90, 55], ["words", 8, 40], ["people", 90, 12], ["now", 8, 78]
  ];
  const KEY = "cc-eyes-v1";
  let found = new Set((store.get(KEY) || "").split(",").filter(Boolean));
  const secret = $("#secret");
  const hd = $(".hd");
  const badge = document.createElement("p");
  badge.className = "eyes label"; badge.setAttribute("aria-live", "polite");
  hd.insertBefore(badge, $("#menu-open"));
  const paint = () => { badge.hidden = found.size === 0; badge.textContent = `見つけた目　${found.size}`; };
  paint();
  SPOTS.forEach(([id, x, y], i) => {
    const sec = document.getElementById(id); if (!sec) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "eye"; b.dataset.eye = i;
    b.style.left = x + "%"; b.style.top = y + "%";
    b.setAttribute("aria-label", "暗がりの猫の目（隠し）");
    b.innerHTML = "<i></i>";
    if (found.has(String(i))) b.classList.add("is-found");
    b.addEventListener("click", () => {
      b.classList.add("is-found"); found.add(String(i)); store.set(KEY, [...found].join(",")); paint();
      if (found.size === 9 && secret) setTimeout(() => secret.showModal(), 500);
    });
    sec.appendChild(b);
  });
  if (secret) secret.addEventListener("click", ev => {
    if (ev.target === secret) secret.close();
    const c = ev.target.closest("[data-close]"); if (!c) return;
    const href = c.getAttribute("href"); secret.close();
    if (href && href.startsWith("#")) { ev.preventDefault(); const el = $(href); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: calm() ? "auto" : "smooth" }); }
  });
})();

/* 伏せ字：押すと（または近づくと）読める */
document.querySelectorAll(".redact").forEach(b => b.addEventListener("click", () => b.classList.toggle("is-open")));
