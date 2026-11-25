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


  /* ---------- 2a. 蓄音機（WebGL 版が本線。音はここで作り、3D版・canvas版の両方から使う） ---------- */
  const gramTune = (() => {
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const hash = k => { let h = 2166136261; for (const c of String(k)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const compose = seed => { // 1本の旋律＋ときどき重なる音。同じ作品はいつも同じ曲
      const r = rng(seed), out = []; let i = 6;
      for (let k = 0; k < 48; k++) {
        const rest = k % 8 === 7 || (k % 4 === 3 && r() < .5);
        const st = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)];
        i = Math.max(0, Math.min(14, i + st));
        out.push(rest ? [] : (k % 8 === 0 && i > 2) ? [i, i - 3] : [i]);
      }
      return out;
    };
    return { rng, hash, compose };
  })();
  const dynImport = (() => { try { return new Function("u", "return import(u)"); } catch (e) { return null; } })();
  const assetURL = f => new URL(f, document.baseURI).href;
  const gramAudio = soundOn => { // 効果音は js/sfx.js（WebAudio の合成だけ）。クリックするまで鳴らさない。「Sound off」では何も鳴らない
    let ac = null, kit = null, mod = null;
    const fx = (name, ...a) => { if (!kit || !soundOn() || calm()) return; try { kit[name](...a); } catch (e) { /* 音の失敗で演出を止めない */ } };
    return {
      fx,
      load() { if (dynImport && !mod) dynImport(assetURL("js/sfx.js?v=18")).then(m => { mod = m; if (ac && !kit) kit = mod.makeSfx(ac); }).catch(() => {}); },
      init() { // クリックの中で呼ぶ
        if (!soundOn() || calm()) return;
        try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (mod && !kit) kit = mod.makeSfx(ac); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; }
      },
      mute() { if (kit) try { kit.silence(); } catch (e) { /* 何もしない */ } },
      // canvas 版が呼ぶ旧い口（旋律とクラックルは廃止。爪の音だけ残す）
      voice() {}, droop() {}, crackle() {}, guard() {}, tick() { fx("ratchet"); }
    };
  };
  const musicBox = (host, soundOn) => {
    let cv = document.createElement("canvas");
    cv.className = "draw__box"; cv.setAttribute("aria-hidden", "true");
    $(".draw__stage", host).after(cv);
    const A = gramAudio(soundOn);
    let impl = null, pending = null, needleCb = null;
    const glOK = () => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } };
    const flat = () => { // canvas 2D 版へ（WebGL で一度触った canvas は使い回せないので作り直す）
      host.classList.remove("has-gl");
      const n = document.createElement("canvas"); n.className = cv.className; n.setAttribute("aria-hidden", "true"); cv.replaceWith(n); cv = n;
      impl = canvasBox(host, soundOn, cv, A);
    };
    const on = { // 3D の動きの節目で音を出す
      tick: () => A.fx("ratchet"), land: () => A.fx("land"), stop: () => A.fx("stop"), lift: () => A.fx("lift"), hidden: () => A.mute(),
      needle: () => { A.fx("needle"); if (needleCb) { const c = needleCb; needleCb = null; c(true); } }
    };
    const load = () => pending || (pending = (dynImport
      ? Promise.all([dynImport(assetURL("js/vendor/three.module.min.js")), dynImport(assetURL("js/gram3d.js?v=18"))]).then(([T, G]) => { impl = G.createGram(T, { canvas: cv, host, calm, on }); })
      : Promise.reject()).catch(() => flat()));
    const gl = glOK();
    if (gl) host.classList.add("has-gl"); else impl = canvasBox(host, soundOn, cv, A);
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); A.load(); if (gl) load(); } }, { rootMargin: "900px" }).observe(host);
    return {
      audio: A,
      press(key) { A.init(); if (impl && impl.press) impl.press(); else if (impl) impl.play(key); },
      pose() { // 盤を受け取る位置（画面座標）。3D 版だけ
        const p = impl && impl.pose ? impl.pose() : null; if (!p) return null;
        const r = cv.getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y, rx: p.rx, ry: p.ry };
      },
      land() { if (impl && impl.land) impl.land(); },
      needle(cb) { // 針が触れたら cb(true)。3D でないときは間を置いて cb(false)
        if (impl && impl.needle) { needleCb = cb; impl.needle(); setTimeout(() => { if (needleCb === cb) { needleCb = null; cb(false); } }, 1500); }
        else setTimeout(() => cb(false), 380);
      },
      rest(sec) { if (impl && impl.rest) impl.rest(sec); else { if (impl) impl.chime(); setTimeout(() => A.fx("stop"), 1600); } },
      still() { if (impl && impl.still) impl.still(); }
    };
  };

  /* ---------- 2a'. 蓄音機の canvas 2D 版（WebGL が使えない環境の控え。発光なし・光は左上手前の一灯だけ） ---------- */
  const canvasBox = (host, soundOn, cv, A) => {
    const g = cv.getContext("2d");
    const TAU = Math.PI * 2;
    /* 視点：正面やや上（俯角32度）の平行投影。X=右、Y=上、Z=手前。単位は筐体の幅の4分の1 */
    const E = 32 * Math.PI / 180, SE = Math.sin(E), CE = Math.cos(E);
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
    const LV = [-.496, .745, .447], VV = [0, SE, CE], HV = norm(add(LV, VV));   // 光・視線・反射のいちばん強い向き
    const AMB = .1, DIF = .8, SHX = -LV[0] / LV[1], SHZ = -LV[2] / LV[1];
    const BR = [222, 192, 58], NI = [176, 182, 188], WOOD = [156, 86, 44], CAST = [40, 46, 48], YEL = [252, 239, 6];
    const YT = -1.5;                                  // 置き台の上面
    const C = [-.25, 0, .15], PV = [1.5, .56, -1.5];  // レコードの中心、アームの支点
    const LA = 2.12, RN_REST = 2.06, RN_OUT = 1.42, OM = 8.17;   // アーム長、針の位置（休み／外周）、毎秒1.3回転
    const B0 = [1.5, .7, -1.5], B1 = [1.5, 2.6, -1.75], B2 = [.75, 3.75, -1.25], B3 = [-1.3, 3.2, .6]; // ラッパの芯
    const SC = [0, 3, 5, 7, 10];
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const hash = k => { let h = 2166136261; for (const c of String(k)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lit = (alb, ndl, sp = 0, k = 1) => { const I = (AMB + DIF * Math.max(0, ndl)) * k; return `rgb(${Math.min(255, alb[0] * I + 255 * sp) | 0},${Math.min(255, alb[1] * I + 240 * sp) | 0},${Math.min(255, alb[2] * I + 170 * sp) | 0})`; };
    const shade = (alb, n, spk = 0, pw = 24, k = 1) => lit(alb, dot(n, LV), spk * Math.pow(Math.max(0, dot(n, HV)), pw), k);
    const freq = i => 440 * Math.pow(2, (Math.floor(i / 5) * 12 + SC[i % 5]) / 12);

    let W = 0, H = 0, dpr = 1, u = 40, ox = 0, oy = 0;
    let S1 = null, S2 = null, SS = null, grain = null;
    let th = 0, om = 0, crank = .6, mode = "idle", tM = 0, rn = RN_REST, lift = 1, rn0 = RN_REST, lift0 = 1, crank0 = 0, rnL = 0;
    let mel = null, melI = 0, melT = 0, raf = 0, last = 0, vis = false;
    const P = p => [ox + p[0] * u, oy - p[1] * CE * u + p[2] * SE * u];

    const compose = seed => { // 1本の旋律＋ときどき重なる音。同じ作品はいつも同じ曲
      const r = rng(seed), out = []; let i = 6;
      for (let k = 0; k < 48; k++) {
        const rest = k % 8 === 7 || (k % 4 === 3 && r() < .5);
        const st = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)];
        i = Math.max(0, Math.min(14, i + st));
        out.push(rest ? [] : (k % 8 === 0 && i > 2) ? [i, i - 3] : [i]);
      }
      return out;
    };

    /* ---- 道具 ---- */
    const mk = () => { const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
    const noise = (w, h, fn) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"), d = x.createImageData(w, h), r = rng(11);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const v = fn(xx, yy, r), i = (yy * w + xx) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v > 0 ? 255 : 0; d.data[i + 3] = Math.min(255, Math.abs(v) * 255); }
      x.putImageData(d, 0, 0);
      const p = g.createPattern(c, "repeat");
      try { p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); } catch (e) { /* 粗くなるだけ */ }
      return p;
    };
    const hull = pts => {
      const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
      for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    };
    const poly = (x, pts) => { x.beginPath(); pts.forEach((q, n) => n ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); };
    const ring3 = (c, n, r, k = 24) => { const a = norm(cross(n, Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), b = cross(n, a); return Array.from({ length: k }, (_, i) => { const t = i * TAU / k; return add(c, add(mul(a, r * Math.cos(t)), mul(b, r * Math.sin(t)))); }); };
    const ell = (x, c, r) => { const q = P(c); x.beginPath(); x.ellipse(q[0], q[1], r * u, r * u * SE, 0, 0, TAU); };
    const tube = (x, A, B, r, alb, spk = .3, k = 1, capAlb) => { // 丸棒：陰影は棒の向きに直交する帯で付ける
      const d = norm(sub(B, A)), ra = ring3(A, d, r).map(P), rb = ring3(B, d, r).map(P);
      let e1 = cross(VV, d); const l = Math.hypot(e1[0], e1[1], e1[2]);
      if (l > .05) {
        e1 = mul(e1, 1 / l); let e2 = cross(d, e1); if (dot(e2, VV) < 0) e2 = mul(e2, -1);
        const mid = mul(add(A, B), .5), m = P(mid), q = P(add(mid, mul(e1, r)));
        const gr = x.createLinearGradient(2 * m[0] - q[0], 2 * m[1] - q[1], q[0], q[1]);
        for (let j = 0; j <= 12; j++) { const s = -1 + j / 6, c = Math.sqrt(Math.max(0, 1 - s * s)); gr.addColorStop(j / 12, shade(alb, add(mul(e1, s), mul(e2, c)), spk, 24, k * (.7 + .3 * c))); }
        poly(x, hull(ra.concat(rb))); x.fillStyle = gr; x.fill();
      }
      const fr = dot(d, VV) > 0 ? [d, rb] : [mul(d, -1), ra];
      poly(x, fr[1]); x.fillStyle = shade(capAlb || alb, fr[0], spk * .4, 24, k); x.fill();
    };
    const wood = (x, X0, Y0, w, h, I, seed, ys = 1) => { // 木目：横に流れる筋を画素ごとに計算
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr)), c = document.createElement("canvas"); c.width = pw; c.height = ph;
      const cx = c.getContext("2d"), d = cx.createImageData(pw, ph), r = rng(seed), A = Array.from({ length: 64 }, () => r()), B = Array.from({ length: 64 }, () => r());
      const n1 = (a, t) => { const i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f); return a[i & 63] * (1 - s) + a[(i + 1) & 63] * s; };
      for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
        const X = xx / dpr / u, Y = yy / dpr / u / ys, wv = n1(A, X * .9 + 7) * .1 + n1(B, X * 3.1) * .025;
        const v = (.68 + .2 * (n1(A, (Y + wv * 1.4) * 6 + 3) - .5) + .2 * (n1(B, (Y + wv) * 40 + 9) - .5) + .1 * (n1(A, (Y + wv) * 110 + X * 2) - .5) + .07 * (r() - .5)) * I, i = (yy * pw + xx) * 4;
        d.data[i] = Math.min(255, WOOD[0] * v); d.data[i + 1] = Math.min(255, WOOD[1] * v); d.data[i + 2] = Math.min(255, WOOD[2] * v); d.data[i + 3] = 255;
      }
      cx.putImageData(d, 0, 0); x.drawImage(c, X0, Y0, w, h);
    };
    const bz = t => { const s = 1 - t; return [0, 1, 2].map(k => s * s * s * B0[k] + 3 * s * s * t * B1[k] + 3 * s * t * t * B2[k] + t * t * t * B3[k]); };
    const dbz = t => { const s = 1 - t; return [0, 1, 2].map(k => 3 * s * s * (B1[k] - B0[k]) + 6 * s * t * (B2[k] - B1[k]) + 3 * t * t * (B3[k] - B2[k])); };
    const hornR = t => .1 + 1.5 * (Math.exp(3.3 * t) - 1) / (Math.exp(3.3) - 1);
    const shadowLayer = (into, py, pieces, clip, alpha) => { // 影：一度まっ黒で描いてから、まとめて薄く重ねる
      const [c, x] = mk(); x.fillStyle = "#000";
      pieces.forEach(ps => { poly(x, hull(ps.map(p => P([p[0] + SHX * (p[1] - py), py, p[2] + SHZ * (p[1] - py)])))); x.fill(); });
      into.save(); if (clip) clip(into); into.setTransform(1, 0, 0, 1, 0, 0); into.globalAlpha = alpha / 2;
      into.drawImage(c, 0, 0); into.drawImage(c, Math.round(.03 * u * dpr), Math.round(.012 * u * dpr)); into.restore();
    };
    const boxPts = (x0, x1, y0, y1, z0, z1) => [[x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0], [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]];

    /* ---- 下ごしらえ（動かない部分はオフスクリーンに焼く） ---- */
    const bake = () => {
      grain = noise(128, 128, (x, y, r) => -r() * .07);
      const hi = Math.max(.6, 1 / dpr);
      let x, a, b;
      // ラッパの面（輪切り×周方向の小さな四角）
      const NS = 110, NA = 96, rings = [], nrms = [];
      for (let i = 0; i <= NS; i++) {
        const t = i / NS, c = bz(t), dv = dbz(t), T = norm(dv), e1 = norm(cross(T, [.2, .1, 1])), e2 = cross(T, e1), r = hornR(t), sl = (hornR(Math.min(1, t + .01)) - hornR(Math.max(0, t - .01))) / (.02 * Math.hypot(dv[0], dv[1], dv[2])) * (t > .99 || t < .01 ? 2 : 1);
        rings.push(Array.from({ length: NA }, (_, j) => { const an = j * TAU / NA; return add(c, mul(add(mul(e1, Math.cos(an)), mul(e2, Math.sin(an))), r)); }));
        nrms.push(Array.from({ length: NA }, (_, j) => { const an = j * TAU / NA; return norm(sub(add(mul(e1, Math.cos(an)), mul(e2, Math.sin(an))), mul(T, sl))); }));
      }
      const hornPieces = []; for (let i = 0; i < NS; i += 3) hornPieces.push(rings[i].concat(rings[Math.min(NS, i + 3)]));

      /* S1：置き台、筐体、ターンテーブル、レコードの盤面 */
      [S1, x] = mk();
      a = P([-3.6, YT, -2.6]); b = P([3.4, YT, 2.7]);
      const tk = .12 * CE * u, rr = .12 * u;
      const slab = dy => { x.beginPath(); x.moveTo(a[0] + rr, a[1] + dy); x.lineTo(b[0] - rr, a[1] + dy); x.quadraticCurveTo(b[0], a[1] + dy, b[0], a[1] + dy + rr * SE); x.lineTo(b[0], b[1] + dy - rr * SE); x.quadraticCurveTo(b[0], b[1] + dy, b[0] - rr, b[1] + dy); x.lineTo(a[0] + rr, b[1] + dy); x.quadraticCurveTo(a[0], b[1] + dy, a[0], b[1] + dy - rr * SE); x.lineTo(a[0], a[1] + dy + rr * SE); x.quadraticCurveTo(a[0], a[1] + dy, a[0] + rr, a[1] + dy); x.closePath(); };
      x.save(); x.translate(.05 * u, .03 * u); slab(tk); x.fillStyle = "rgba(0,0,0,.8)"; x.fill(); x.restore();
      x.fillStyle = lit(CAST, LV[2], 0, .8); for (let d = tk; d > 0; d -= .5) { slab(d); x.fill(); }
      slab(0); x.fillStyle = lit(CAST, LV[1]); x.fill(); x.fillStyle = grain; x.fill();
      shadowLayer(x, YT, [boxPts(-2.1, 2.1, YT, 0, -2.1, 2.1)].concat(hornPieces), c => { slab(0); c.clip(); }, .62);
      x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = hi; x.beginPath(); x.moveTo(a[0] + rr, b[1] - hi / 2); x.lineTo(b[0] - rr, b[1] - hi / 2); x.stroke();
      // 筐体（台輪・胴・天板）
      const face = (x0, x1, y0, y1, z, seed) => { const p = P([x0, y1, z]), q = P([x1, y0, z]); wood(x, p[0], p[1], q[0] - p[0], q[1] - p[1], AMB + DIF * LV[2], seed); return [p, q]; };
      const top = (x0, x1, y, z0, z1, seed) => { const p = P([x0, y, z0]), q = P([x1, y, z1]); wood(x, p[0], p[1], q[0] - p[0], q[1] - p[1], AMB + DIF * LV[1], seed, SE); return [p, q]; };
      let f;
      top(-2.1, 2.1, -1.24, 1.9, 2.1, 21);
      f = face(-2.1, 2.1, YT, -1.24, 2.1, 22); x.fillStyle = "rgba(255,226,190,.14)"; x.fillRect(f[0][0], f[0][1], f[1][0] - f[0][0], hi);
      { const gr = x.createLinearGradient(0, f[1][1] - .1 * u, 0, f[1][1]); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)"); x.fillStyle = gr; x.fillRect(f[0][0], f[1][1] - .1 * u, f[1][0] - f[0][0], .1 * u); }
      f = face(-2, 2, -1.24, -.1, 2, 23);
      { const gr = x.createLinearGradient(0, f[0][1], 0, f[0][1] + .2 * u); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(f[0][0], f[0][1], f[1][0] - f[0][0], .2 * u); // 天板の張り出しの影
        const g2 = x.createLinearGradient(f[0][0], 0, f[1][0], 0); g2.addColorStop(0, "rgba(255,230,200,.05)"); g2.addColorStop(.4, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,.3)"); x.fillStyle = g2; x.fillRect(f[0][0], f[0][1], f[1][0] - f[0][0], f[1][1] - f[0][1]);
        x.fillStyle = "rgba(0,0,0,.4)"; x.fillRect(f[0][0], f[1][1] - hi, f[1][0] - f[0][0], hi); }
      f = face(-2.08, 2.08, -.1, 0, 2.08, 24);
      const tp = top(-2.08, 2.08, 0, -2.08, 2.08, 25);
      x.fillStyle = "rgba(255,226,190,.2)"; x.fillRect(f[0][0], f[0][1] - hi / 2, f[1][0] - f[0][0], hi);
      // ターンテーブルとレコード
      ell(x, [C[0] + SHX * .14, 0, C[2] + SHZ * .14], 1.57); x.fillStyle = "rgba(0,0,0,.5)"; x.fill();
      for (let d = .02; d <= .1; d += .01) { ell(x, [C[0], d, C[2]], 1.57); x.fillStyle = lit(NI, .45, 0, .6); x.fill(); }
      ell(x, [C[0], .11, C[2]], 1.57); x.fillStyle = "rgb(24,38,30)"; x.fill();
      for (let d = .12; d <= .145; d += .008) { ell(x, [C[0], d, C[2]], 1.5); x.fillStyle = "rgb(8,8,9)"; x.fill(); }
      ell(x, [C[0], .15, C[2]], 1.5); x.fillStyle = "rgb(17,18,20)"; x.fill();
      x.lineWidth = Math.max(.5, .008 * u);
      { const r = rng(4); for (let R = .6; R < 1.46; R += Math.max(.022, 1.6 / u)) { ell(x, [C[0], .15, C[2]], R); x.strokeStyle = `rgba(190,200,215,${(.035 + r() * .05).toFixed(3)})`; x.stroke(); } }
      [.86, 1.12, 1.3].forEach(R => { ell(x, [C[0], .15, C[2]], R); x.strokeStyle = "rgba(0,0,0,.7)"; x.lineWidth = .028 * u; x.stroke(); });
      ell(x, [C[0], .15, C[2]], 1.485); x.strokeStyle = "rgba(190,200,215,.16)"; x.lineWidth = Math.max(.6, .012 * u); x.stroke();
      // 支柱（アームとラッパを支える）
      ell(x, [PV[0] + SHX * .1, 0, PV[2] + SHZ * .1], .34); x.fillStyle = "rgba(0,0,0,.4)"; x.fill();
      tube(x, [PV[0], 0, PV[2]], [PV[0], .06, PV[2]], .3, NI, .25); tube(x, [PV[0], .06, PV[2]], [PV[0], .5, PV[2]], .13, NI, .4);
      // 針の休み台
      { const n = needleAt(RN_REST); tube(x, [n[0], 0, n[2]], [n[0], .2, n[2]], .06, NI, .3); }

      /* SS：天板とレコードに落ちるラッパの影 */
      [SS, x] = mk();
      shadowLayer(x, .15, hornPieces.concat([ring3([PV[0], .3, PV[2]], [0, 1, 0], .13).concat(ring3([PV[0], .7, PV[2]], [0, 1, 0], .13))]), c => { c.beginPath(); c.rect(tp[0][0], tp[0][1], tp[1][0] - tp[0][0], tp[1][1] - tp[0][1]); c.clip(); }, .58);

      /* S2：ラッパ */
      [S2, x] = mk();
      tube(x, [PV[0], .62, PV[2]], [PV[0], .78, PV[2]], .17, BR, .3);
      const items = [];
      for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) {
        const j2 = (j + 1) % NA, q = [rings[i][j], rings[i + 1][j], rings[i + 1][j2], rings[i][j2]], t = (i + .5) / NS;
        let n = norm(add(add(nrms[i][j], nrms[i + 1][j]), add(nrms[i + 1][j2], nrms[i][j2])));
        const ctr = mul(add(add(q[0], q[1]), add(q[2], q[3])), .25), seam = j % (NA / 8) === 0 ? .9 : 1, sky = .16 * (n[1] * .5 + .5);
        let col;
        if (dot(n, VV) >= 0) col = lit(BR, dot(n, LV) + sky, .34 * Math.pow(Math.max(0, dot(n, HV)), 22), seam * (.82 + .18 * sm(0, .5, dot(n, VV))));
        else { n = mul(n, -1); col = lit(BR, dot(n, LV) * (.35 + .65 * sm(.6, 1, t)), 0, seam * (.1 + .78 * Math.pow(sm(.35, 1, t), 1.6))); }
        items.push([dot(ctr, VV), q.map(P), col, 0]);
      }
      for (let j = 0; j < NA; j++) { // 口の縁（巻き縁）
        const j2 = (j + 1) % NA, p = rings[NS][j], q = rings[NS][j2], n = norm(add(nrms[NS][j], mul(norm(dbz(1)), .9)));
        items.push([dot(mul(add(p, q), .5), VV) + .02, [P(p), P(q)], shade(BR, n, .5, 14, .95), 1]);
      }
      items.sort((p, q) => p[0] - q[0]);
      x.lineJoin = "round"; x.lineCap = "round";
      for (const [, pts, col, rim] of items) {
        if (rim) { x.strokeStyle = col; x.lineWidth = .075 * u; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); x.lineTo(pts[1][0], pts[1][1]); x.stroke(); }
        else { poly(x, pts); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = .7; x.fill(); x.stroke(); }
      }
    };

    const layout = () => {
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, W < 560 ? 3 : 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const wu = 7.5, hu = 7.0;
      u = Math.min((W - 8) / wu, (H - 8) / hu);
      ox = (W - wu * u) / 2 + 3.75 * u; oy = (H - hu * u) / 2 + 4.05 * u;
      bake();
    };

    /* ---- 動く部分 ---- */
    function needleAt(r) { // 支点からアーム長、中心から r の点（手前側）
      const dx = C[0] - PV[0], dz = C[2] - PV[2], D = Math.hypot(dx, dz), al = Math.acos(Math.max(-1, Math.min(1, (LA * LA + D * D - r * r) / (2 * LA * D)))), b0 = Math.atan2(dz, dx);
      const c1 = [PV[0] + LA * Math.cos(b0 + al), 0, PV[2] + LA * Math.sin(b0 + al)], c2 = [PV[0] + LA * Math.cos(b0 - al), 0, PV[2] + LA * Math.sin(b0 - al)];
      return c1[2] > c2[2] ? c1 : c2;
    }
    const drawLabel = () => {
      const c = [C[0] + .012 * Math.cos(th), .152, C[2] + .012 * Math.sin(th)], q = P(c), R = .52 * u;
      g.beginPath(); g.ellipse(q[0], q[1], R, R * SE, 0, 0, TAU); g.fillStyle = lit(YEL, LV[1], 0, 1.22); g.fill();
      g.strokeStyle = "rgba(20,18,0,.75)"; g.lineCap = "butt";
      g.lineWidth = Math.max(.6, .012 * u); g.beginPath(); g.ellipse(q[0], q[1], R * .9, R * .9 * SE, 0, 0, TAU); g.stroke();
      g.lineWidth = Math.max(1, .05 * u); g.beginPath(); g.ellipse(q[0], q[1], R * .62, R * .62 * SE, 0, th + .3, th + 2.1); g.stroke();
      g.lineWidth = Math.max(.8, .03 * u); g.beginPath(); g.ellipse(q[0], q[1], R * .46, R * .46 * SE, 0, th + .5, th + 1.6); g.stroke();
      g.beginPath(); g.ellipse(q[0], q[1], R * .62, R * .62 * SE, 0, th + 3.6, th + 4.5); g.stroke();
      tube(g, [C[0], .15, C[2]], [C[0], .27, C[2]], .045, NI, .5);
    };
    const drawArm = () => {
      const up = .3 * lift, n = needleAt(rn + (lift < .05 ? .012 * Math.sin(th) : 0)); n[1] = .15 + up + (lift < .05 ? .006 * Math.sin(th * 2) : 0);
      const piv = [PV[0], PV[1] + up * .15, PV[2]], sc = add(n, [0, .3, 0]);
      let d = norm([sc[0] - piv[0], 0, sc[2] - piv[2]]), ax = [-d[2], 0, d[0]]; if (ax[2] < 0) ax = mul(ax, -1);
      // 影（天板とレコードの上）
      const f = P([-2.08, 0, -2.08]), t = P([2.08, 0, 2.08]), sh = p => P([p[0] + SHX * (p[1] - .15), .15, p[2] + SHZ * (p[1] - .15)]);
      g.save(); g.beginPath(); g.rect(f[0], f[1], t[0] - f[0], t[1] - f[1]); g.clip();
      g.strokeStyle = "rgba(0,0,0,.36)"; g.lineWidth = .13 * u; g.lineCap = "round"; let p = sh(piv), q = sh(sc); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      poly(g, hull(ring3(sub(sc, mul(ax, .07)), ax, .3).concat(ring3(add(sc, mul(ax, .07)), ax, .3)).map(sh))); g.fillStyle = "rgba(0,0,0,.36)"; g.fill();
      g.restore(); g.lineCap = "butt";
      // 支点の筒、アーム、サウンドボックス、針
      tube(g, [PV[0], .44, PV[2]], [PV[0], .66 + up * .15, PV[2]], .17, NI, .4);
      const back = sub(sc, mul(d, .2));
      tube(g, piv, back, .075, NI, .45);
      p = P(add(n, [0, .02, 0])); q = P(add(sc, [0, -.24, 0])); g.strokeStyle = lit(NI, .6, .1); g.lineWidth = Math.max(1, .028 * u); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      tube(g, sub(sc, mul(ax, .075)), add(sc, mul(ax, .075)), .3, NI, .35, 1, [196, 190, 170]);
      const cc = add(sc, mul(ax, .076));
      g.strokeStyle = "rgba(20,24,28,.55)"; g.lineWidth = Math.max(.6, .016 * u); poly(g, ring3(cc, ax, .235).map(P)); g.stroke();
      poly(g, ring3(cc, ax, .05).map(P)); g.fillStyle = lit(NI, .5, 0, .6); g.fill();
    };
    const drawCrank = () => {
      const S = [2.0, -.72, .4], A = [2.46, -.72, .4], Bp = [2.46, -.72 + .52 * Math.sin(crank), .4 + .52 * Math.cos(crank)];
      tube(g, [2.0, -.72, .4], [2.05, -.72, .4], .16, BR, .3);
      tube(g, S, A, .06, NI, .45);
      tube(g, [2.4, A[1], A[2]], [2.52, A[1], A[2]], .1, NI, .4);
      tube(g, A, Bp, .05, NI, .45);
      tube(g, [2.42, Bp[1], Bp[2]], [2.94, Bp[1], Bp[2]], .1, [70, 40, 24], .12);
      tube(g, [2.94, Bp[1], Bp[2]], [2.97, Bp[1], Bp[2]], .075, NI, .4);
    };
    const render = () => {
      if (!S1) return;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(S1, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); drawLabel();
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(SS, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); drawArm(); drawCrank();
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(S2, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* ---- 動き ---- */
    const ez = x => sm(0, 1, x);
    const finish = () => { mode = "end"; tM = 0; rnL = 0; mel = null; };
    const step = dt => {
      tM += dt; let omT = 0, ta = .7;
      if (mode === "start") {
        const pc = crank; crank = crank0 + TAU * 1.75 * ez(tM / .85);
        if (Math.floor(crank / (TAU / 6)) > Math.floor(pc / (TAU / 6))) A.tick();
        omT = tM > .2 ? OM : 0; ta = .4;
        lift = tM < .46 ? Math.min(1, lift0 + tM / .1) : 1 - ez((tM - .46) / .16);
        rn = rn0 + (RN_OUT - rn0) * ez((tM - .08) / .38);
        if (tM >= .85) { mode = "play"; tM = 0; lift = 0; melT = .1; A.crackle(true); }
        else if (tM >= .62 && lift < .02) A.crackle(true);
      } else if (mode === "play") {
        omT = OM; ta = .4; rn = Math.max(.72, rn - .07 * dt);
        if (mel) { melT += dt; while (melT >= 1 / 7 && melI < mel.length) { melT -= 1 / 7; mel[melI++].forEach(i => A.voice(i, .9)); } }
        if (tM > 6) finish();
      } else if (mode === "end") {
        omT = tM > .75 ? 0 : OM; ta = .75;
        if (tM < 1.45) rn = Math.max(.72, rn - .07 * dt);
        else { if (!rnL) { rnL = rn; A.crackle(false); } lift = ez((tM - 1.45) / .22); rn = rnL + (RN_REST - rnL) * ez((tM - 1.65) / .95); }
        if (tM > 2.7 && om < .1) { om = 0; lift = 1; rn = RN_REST; mode = "idle"; }
      }
      A.guard();
      om += (omT - om) * (1 - Math.exp(-dt / ta)); th += om * dt;
    };
    const frame = t => {
      raf = 0; if (!vis || calm()) return;
      const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
      step(dt); render();
      if (mode !== "idle") raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf && vis && !calm() && mode !== "idle") { last = performance.now(); raf = requestAnimationFrame(frame); } };
    layout(); render();
    let rz = 0;
    window.addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layout(); render(); }); });
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { if (!S1) layout(); render(); run(); } else A.crackle(false); }, { rootMargin: "80px" }).observe(cv);
    return {
      play(key) {
        if (!S1) layout(); if (!S1) return;
        if (calm()) { render(); return; }          // 動きなし：静止画のまま
        mel = compose(hash(key)); melI = 0; melT = 0;
        rn0 = rn; lift0 = lift; crank0 = crank; mode = "start"; tM = 0;
        if (lift0 < .5) A.crackle(false); run();
      },
      chime() {
        if (calm() || !S1 || mode === "idle" || mode === "end") return;
        if (mode === "start") { lift = 0; A.crackle(true); }
        [2, 5, 7, 10, 12].forEach((i, n) => setTimeout(() => A.voice(i, 1), n * 110));
        finish(); run();
      }
    };
  };

  /* ---------- 2. 一曲引く（レコードが滑り出てくる） ---------- */
  const draw = $("#draw");
  const DATA = $("#rel-data") ? JSON.parse($("#rel-data").textContent) : null;
  if (draw && DATA) {
    draw.hidden = false;
    const pool = Object.entries(DATA).filter(([, r]) => r.art);
    const cover = $("#draw-cover"), glow = $("#draw-glow"), t = $("#draw-t"), s = $("#draw-s"), l = $("#draw-l"), go = $("#draw-go");
    let last = "", busy = false, warmed = false;
    const sndKey = "cc-snd-v1";
    let sndOn = store.get(sndKey) !== "0";
    const snd = document.createElement("button");
    snd.type = "button"; snd.className = "draw__snd";
    const sndPaint = () => { snd.setAttribute("aria-pressed", sndOn); snd.textContent = sndOn ? "Sound on" : "Sound off"; };
    sndPaint();
    snd.addEventListener("click", () => { sndOn = !sndOn; store.set(sndKey, sndOn ? "1" : "0"); sndPaint(); if (!sndOn) box.audio.mute(); });
    go.after(snd);
    const box = musicBox(draw, () => sndOn);
    const warm = () => { if (warmed) return; warmed = true; pool.forEach(([, r]) => { const i = new Image(); i.referrerPolicy = "no-referrer"; i.src = r.art; }); };
    let inView = false;
    new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView) warm(); }, { rootMargin: "400px" }).observe(draw);
    // まだ何も選ばれていない間：ジャケットが、暗がりのなかで入れ替わり続ける
    const idleOn = () => !draw.classList.contains("is-drawing") && !draw.classList.contains("is-final");
    const peek = () => {
      if (calm() || document.hidden || !inView || !idleOn() || !warmed) return;
      paint(pool[Math.floor(Math.random() * pool.length)][1]);
      cover.classList.remove("is-peek"); void cover.offsetWidth; cover.classList.add("is-peek");
    };
    setInterval(peek, 2200);
    let shown = null;
    const paint = r => {
      shown = r;
      cover.style.backgroundImage = `url("${r.art.replace(/"/g, "%22")}")`;
      glow.style.backgroundImage = cover.style.backgroundImage;
    };
    /* ---- 選ぶ演出：めくる（溜め）→ 決まる → 盤を運ぶ → 針が降りる → 結果（解放） ---- */
    const discEl = $("#draw-disc"), DIM = "grayscale(.85) brightness(.6)";
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const anim = (el, kf, opt) => (el.animate ? el.animate(kf, opt).finished.catch(() => {}) : Promise.resolve());
    const card = r => { const c = document.createElement("span"); c.className = "draw__card"; c.style.backgroundImage = `url("${r.art.replace(/"/g, "%22")}")`; return c; };
    let top = null;
    const flip = (r, gap) => { // 棚の盤をめくる：手前の一枚が前へ倒れ、次の一枚が奥から出てくる
      const next = card(r), prev = top, d = Math.max(180, Math.min(440, gap * 1.5));
      if (prev) prev.before(next); else discEl.appendChild(next);
      top = next;
      anim(next, [{ transform: "scale(.93) translateY(-2.5%)", filter: "grayscale(1) brightness(.32)" }, { transform: "scale(1) translateY(0)", filter: DIM }], { duration: d, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
      if (prev) anim(prev, [{ transform: "perspective(800px) translateY(0) rotateX(0deg)", opacity: 1 }, { transform: "perspective(800px) translateY(5%) rotateX(-78deg)", opacity: 0 }], { duration: d * .9, easing: "cubic-bezier(.5,0,.8,.45)", fill: "both" }).then(() => prev.remove());
    };
    const fly = pose => { // ジャケットの裏から盤が出て、弧を描いて台の上まで運ばれる
      const h = draw.getBoundingClientRect(), c = cover.getBoundingClientRect(), S = c.width * .94, el = document.createElement("span");
      el.className = "draw__fly"; el.style.width = el.style.height = S + "px";
      el.style.left = (c.left - h.left + (c.width - S) / 2) + "px"; el.style.top = (c.top - h.top + (c.height - S) / 2) + "px";
      draw.appendChild(el);
      const dx = pose.x - (c.left + c.width / 2), dy = pose.y - (c.top + c.height / 2), sx = 2 * pose.rx / S, sy = 2 * pose.ry / S, wide = Math.abs(dx) > Math.abs(dy), side = wide ? Math.sign(dx) : 1;
      const tf = (x, y, a, b, deg) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${a.toFixed(3)}, ${b.toFixed(3)}) rotate(${deg}deg)`;
      return anim(el, [
        { transform: tf(0, 0, 1, 1, 0), offset: 0 },
        { transform: tf(c.width * .4 * side, 0, 1, 1, 50), offset: .24, easing: "cubic-bezier(.5,0,.3,1)" },
        { transform: tf(wide ? dx * .56 : dx * .5 + c.width * .3, wide ? dy * .5 - Math.abs(dx) * .14 - 20 : dy * .5, (1 + sx) / 2, (1 + sy) / 2 + .05, 230), offset: .64 },
        { transform: tf(dx, dy, sx, sy, 400), offset: 1 }
      ], { duration: 700, easing: "cubic-bezier(.4,.05,.3,1)", fill: "both" }).then(() => el.remove());
    };
    const show = r => { // 結果を出す
      t.textContent = r.title;
      s.textContent = `${r.artist}　${r.date.slice(0, 4)}年`;
      l.innerHTML = `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener"><span>Listen<svg class="ar" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M7 13 13 7M8 7h5v5"/></svg></span></a>`;
      go.querySelector("span").textContent = "Another record";
      draw.classList.remove("is-drawing"); draw.classList.add("is-final"); busy = false;
    };
    go.addEventListener("click", async () => {
      if (busy) return;
      busy = true; warm();
      let pick;
      do { pick = pool[Math.floor(Math.random() * pool.length)]; } while (pick[0] === last && pool.length > 1);
      last = pick[0];
      const key = pick[0], r = pick[1], A = box.audio;
      draw.classList.remove("is-final", "is-breath");
      l.innerHTML = ""; t.textContent = ""; s.textContent = "";
      if (calm()) { paint(r); show(r); box.still(); return; }   // 動きなし：結果だけ
      draw.classList.add("is-drawing");
      box.press(key); A.fx("press"); setTimeout(() => A.fx("wind"), 90);
      if (shown) { top = card(shown); top.style.filter = DIM; discEl.appendChild(top); }
      const n = 11; let gap = 56, prev = shown;
      for (let i = 0; i < n; i++) { // だんだん遅くなる（どれになるか分からない時間）
        let c = r;
        if (i < n - 1) { let g = 0; do { c = pool[Math.floor(Math.random() * pool.length)][1]; } while ((c === prev || c === r) && ++g < 8); }
        prev = c; flip(c, gap); glow.style.backgroundImage = `url("${c.art.replace(/"/g, "%22")}")`; A.fx("flick", i, n);
        await wait(gap); gap *= 1.2;
      }
      await wait(250);                                           // 溜め：音も動きも、いったん止まる
      paint(r); A.fx("select", key);                             // この一枚
      const picked = top; top = null;
      if (picked) anim(picked, [{ filter: DIM, transform: "scale(1)" }, { filter: "grayscale(0) brightness(1.05)", transform: "scale(1.035)", offset: .42 }, { filter: "grayscale(0) brightness(1)", transform: "scale(1)" }], { duration: 640, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }).then(() => picked.remove());
      await wait(170);
      const pose = box.pose();
      if (pose) { A.fx("whoosh", .64); await fly(pose); box.land(); await wait(120); }
      await new Promise(res => box.needle(real => { if (!real) A.fx("needle"); res(); }));
      draw.classList.add("is-breath");                           // 針が触れた瞬間、画面がわずかに息をする
      await wait(130);
      show(r); A.fx("result", key);                              // 解放
      box.rest(3.4);
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
    b.setAttribute("aria-label", "隠し要素");
    b.innerHTML = '<svg viewBox="0 0 30 16" aria-hidden="true"><path class="e-o" d="M1.5 8Q15-3.5 28.5 8Q15 19.5 1.5 8Z"/><ellipse class="e-p" cx="15" cy="8" rx="1.7" ry="5.4"/></svg>';
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

/* 2026-11-25 華やかに：見出しと新曲の題名を一文字ずつ立ち上げる（横には動かさない）。
   文字を span に分けるだけで、出す合図は既存の .rv.is-in を使う */
(() => {
  const targets = document.querySelectorAll(".ch-head__ja, .release__title");
  targets.forEach(h => {
    if (h.dataset.split) return;
    h.dataset.split = "1";
    const text = h.textContent;
    h.setAttribute("aria-label", text);
    h.textContent = "";
    [...text].forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "fx-ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = c === " " ? " " : c;
      h.appendChild(s);
    });
  });
})();
