/* NOKTOA HP — v3.js（トップ試作v3の追加分。fx.js のあとに読む。依存なし）
   ①スクロールで映像を送る ②積み重なる4章 ③上映室 ⑤数字の数え上げ ＋ 東京の時刻 */
(function () {
    'use strict';
    var root = document.documentElement;
    var reduce = function () { return root.classList.contains('reduce-motion'); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

    /* ---- 東京の時刻 ---- */
    var clock = document.getElementById('tokyo-time');
    if (clock && window.Intl) {
        var fmt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
        var tickClock = function () { clock.textContent = fmt.format(new Date()) + ' JST'; };
        tickClock(); setInterval(tickClock, 20000);
    }

    /* ---- ① スクロールで映像を送る ---- */
    var scrub = document.querySelector('.scrub');
    var scrubDraw = null;
    if (scrub) {
        var N = 120, FPS = 10, T0 = 4.6;
        var frame = scrub.querySelector('.scrub-frame'), cv = frame.querySelector('canvas'), ctx = null;
        var gl = null, uV = null, vel = 0, velT = 0, lastY = window.scrollY, lastT = performance.now(), spin = false, cur = null;
        try { gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
        if (gl) {
            var sh = function (type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
            var pr = gl.createProgram();
            gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 u;void main(){u=p*.5+.5;u.y=1.-u.y;gl_Position=vec4(p,0.,1.);}'));
            gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform sampler2D t;uniform float v;varying vec2 u;void main(){float a=abs(v);vec2 c=u;c.y=.5+(c.y-.5)*(1.-a*.07);c.x=.5+(c.x-.5)*(1.+a*.02*cos((u.y-.5)*3.1416));float o=v*.02;vec3 k=vec3(texture2D(t,vec2(c.x,c.y+o)).r,texture2D(t,c).g,texture2D(t,vec2(c.x,c.y-o)).b);gl_FragColor=vec4(k*(1.+a*.12),1.);}'));
            gl.linkProgram(pr);
            if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; }
            else {
                gl.useProgram(pr);
                gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
                var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
                gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                uV = gl.getUniformLocation(pr, 'v');
            }
        }
        if (!gl) ctx = cv.getContext('2d');
        var paint = function (im, upload) {
            if (gl) {
                if (upload) { gl.viewport(0, 0, cv.width, cv.height); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); }
                gl.uniform1f(uV, vel); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            } else if (upload) ctx.drawImage(im, 0, 0);
        };
        // 勢いが残っている間だけ描き続け、止まれば色ずれも静かに戻る
        var settle = function () {
            vel += (velT - vel) * .16; velT *= .86;
            if (cur) paint(cur, false);
            if (Math.abs(vel) > .004 || Math.abs(velT) > .004) requestAnimationFrame(settle); else { vel = 0; spin = false; if (cur) paint(cur, false); }
        };
        var tc = scrub.querySelector('.scrub-tc'), lines = scrub.querySelectorAll('.scrub-line');
        var imgs = new Array(N), loaded = 0, started = false, last = -1;
        var pad = function (n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; };
        var load = function () {
            if (started) return; started = true;
            // 近いコマから順に。まず8コマおきに全体をつかみ、残りを埋める
            var order = [], i;
            for (i = 0; i < N; i += 8) order.push(i);
            for (i = 0; i < N; i++) if (i % 8) order.push(i);
            var k = 0, run = function () {
                if (k >= order.length) return;
                var idx = order[k++], im = new Image();
                im.decoding = 'async';
                im.onload = function () { imgs[idx] = im; loaded++; if (loaded === 1 || idx === last) { last = -1; if (scrubDraw) scrubDraw(); } run(); };
                im.onerror = run;
                im.src = 'assets/scrub/f' + pad(idx + 1, 3) + '.webp';
            };
            for (var c = 0; c < 4; c++) run();
        };
        scrubDraw = function () {
            if (reduce()) return;
            var r = scrub.getBoundingClientRect(), vh = window.innerHeight;
            var p = clamp(-r.top / (r.height - vh), 0, 1);
            var now = performance.now(), y = window.scrollY, dt = Math.max(8, now - lastT);
            if (gl && r.top < vh && r.bottom > 0) { velT = clamp((y - lastY) / dt / 3.2, -1, 1); if (!spin) { spin = true; requestAnimationFrame(settle); } }
            lastY = y; lastT = now;
            if (r.top < vh * 2 && r.bottom > -vh) load();
            scrub.style.setProperty('--p', p.toFixed(4));
            scrub.classList.toggle('moved', p > .04);
            var want = Math.round(p * (N - 1)), idx = want;
            // まだ届いていないコマは、いちばん近い読み込み済みのコマで代用する
            if (!imgs[idx]) { for (var d = 1; d < N; d++) { if (imgs[want - d]) { idx = want - d; break; } if (imgs[want + d]) { idx = want + d; break; } } }
            if (imgs[idx] && idx !== last) {
                last = idx;
                if (cv.width !== imgs[idx].naturalWidth) { cv.width = imgs[idx].naturalWidth; cv.height = imgs[idx].naturalHeight; }
                cur = imgs[idx]; paint(cur, true);
                frame.classList.add('live');
            }
            var t = T0 + want / FPS, s = Math.floor(t), f = Math.round((t - s) * 24);
            if (f > 23) { f = 0; s += 1; }
            tc.textContent = '00:00:' + pad(s, 2) + ':' + pad(f, 2);
            var seg = p < .34 ? 0 : p < .68 ? 1 : 2;
            for (var i = 0; i < lines.length; i++) { lines[i].classList.toggle('on', i === seg); lines[i].classList.toggle('past', i < seg); }
        };
    }

    /* ---- ② 積み重なる4章 ---- */
    var chapters = Array.prototype.slice.call(document.querySelectorAll('.stack .chapter'));
    var measure = function () { chapters.forEach(function (c) { c.style.setProperty('--h', c.offsetHeight + 'px'); }); };
    var stackDraw = function () {
        if (reduce() || !chapters.length) return;
        var vh = window.innerHeight;
        for (var i = 0; i < chapters.length; i++) {
            var next = chapters[i + 1], cover = 0;
            if (next) cover = clamp(1 - next.getBoundingClientRect().top / vh, 0, 1);
            chapters[i].style.setProperty('--cover', cover.toFixed(3));
            chapters[i].style.setProperty('--enter', clamp(1 - chapters[i].getBoundingClientRect().top / vh, 0, 1.6).toFixed(3));
        }
    };

    /* ---- 進め方: 縦のタイムラインを再生ヘッドが下りていく ---- */
    var tl = document.querySelector('.steps.tl'), tlSteps = tl ? tl.querySelectorAll('.step') : [];
    var tlDraw = function () {
        if (!tl || reduce()) return;
        var r = tl.getBoundingClientRect(), mid = window.innerHeight * .56, p = clamp((mid - r.top) / r.height, 0, 1);
        tl.style.setProperty('--tp', p.toFixed(4));
        var y = r.top + r.height * p;
        for (var i = 0; i < tlSteps.length; i++) { var b = tlSteps[i].getBoundingClientRect(); tlSteps[i].classList.toggle('is-now', y >= b.top - 1 && (y < b.bottom || i === tlSteps.length - 1)); }
    };

    var tick = false;
    var onScroll = function () { if (tick) return; tick = true; requestAnimationFrame(function () { tick = false; if (scrubDraw) scrubDraw(); stackDraw(); tlDraw(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('load', function () { measure(); onScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); onScroll(); });
    measure(); onScroll();

    /* ---- ③ 上映室 ---- */
    var theater = document.getElementById('theater');
    if (theater && theater.showModal) {
        var tv = theater.querySelector('video'), cap = theater.querySelector('.theater-cap'), from = null;
        var vt = function (fn) { if (document.startViewTransition && !reduce()) return document.startViewTransition(fn); fn(); return null; };
        var open = function (btn) {
            from = btn; var img = btn.querySelector('img');
            img.style.viewTransitionName = 'reel';
            tv.poster = btn.getAttribute('data-poster'); tv.src = btn.getAttribute('data-src'); cap.textContent = btn.getAttribute('data-cap') || '';
            vt(function () { img.style.viewTransitionName = ''; tv.style.viewTransitionName = 'reel'; root.classList.add('theater-on'); theater.showModal(); });
            var pl = tv.play(); if (pl && pl.catch) pl.catch(function () { });
        };
        var close = function () {
            if (!theater.open) return;
            var img = from && from.querySelector('img');
            var t = vt(function () { tv.style.viewTransitionName = ''; if (img) img.style.viewTransitionName = 'reel'; theater.close(); root.classList.remove('theater-on'); });
            var done = function () { if (img) img.style.viewTransitionName = ''; tv.pause(); tv.removeAttribute('src'); tv.load(); if (from) from.focus(); };
            if (t && t.finished) t.finished.then(done, done); else done();
        };
        document.querySelectorAll('.reel-btn').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
        theater.querySelector('.theater-close').addEventListener('click', close);
        theater.addEventListener('click', function (e) { if (e.target === theater) close(); });
        theater.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    }

    /* ---- ⑤ 数字の数え上げ ---- */
    var nums = document.querySelectorAll('.nl-stat b, .fig-n b');
    if (nums.length && 'IntersectionObserver' in window) {
        var nf = new Intl.NumberFormat('en-US');
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return; io.unobserve(e.target);
                var el = e.target, txt = el.textContent, m = txt.match(/^([\d,]+)(.*)$/);
                if (!m || reduce()) return;
                var to = parseInt(m[1].replace(/,/g, ''), 10), tail = m[2], t0 = performance.now(), dur = el.closest('.fig-n') ? 2200 : 1600;
                var step = function (now) {
                    var k = clamp((now - t0) / dur, 0, 1), ez = 1 - Math.pow(1 - k, 4);
                    el.textContent = nf.format(Math.round(to * ez)) + tail;
                    if (k < 1) requestAnimationFrame(step); else el.textContent = txt;
                };
                requestAnimationFrame(step);
            });
        }, { threshold: .6 });
        nums.forEach(function (n) { io.observe(n); });
    }
})();
