/* NOKTOA HP — FX engine v2 (2026-10)
   ・ロゴが3D空間に組み上がり、スクロールでカメラがリングをくぐり、粒子の海を抜け、最後にファインダーが文字を囲む
   ・残像（トレイル）: 2枚のテクスチャでフィードバック描画 → ざらつきを光の線にする
   ・除外ゾーン: [data-clear] の領域（文字・カード・動画）には粒子を描かない
   ・白背景では mix-blend-mode:difference で自動反転（CSS側）。依存なし */
(function () {
    'use strict';
    var root = document.documentElement;
    var reduce = root.classList.contains('reduce-motion');          // 早期スクリプト(head)が決定: OS設定を尊重。ユーザーが「動きを再生」を選んだ場合は解除
    var osReduce = root.classList.contains('os-reduce'), optedIn = osReduce && !reduce;
    var mobile = window.matchMedia('(max-width: 720px)').matches;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

    /* ---- 診断（?debug=1）: 携帯で動かないとき原因を画面に出す ---- */
    var DEBUG = /[?&]debug=1/.test(location.search), dbg = {}, dbgEl = null, dbgFrames = 0, dbgT = performance.now();
    function note(k, v) { dbg[k] = v; }
    if (DEBUG) {
        dbgEl = document.createElement('pre');
        dbgEl.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;max-width:94vw;margin:0;padding:8px 10px;background:rgba(0,0,0,.82);color:#7CFC9A;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;border:1px solid #2a2a2a;border-radius:8px;pointer-events:none';
        document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(dbgEl); });
        if (document.body) document.body.appendChild(dbgEl);
        window.addEventListener('error', function (e) { note('JS_ERROR', (e.message || '') + ' @' + (e.lineno || '?')); });
        setInterval(function () {
            var now = performance.now(); note('fps', Math.round(dbgFrames / ((now - dbgT) / 1000))); dbgFrames = 0; dbgT = now;
            note('scrollY', Math.round(window.pageYOffset)); note('viewport', window.innerWidth + 'x' + window.innerHeight + ' dpr' + (window.devicePixelRatio || 1));
            dbgEl.textContent = Object.keys(dbg).map(function (k) { return k + ': ' + dbg[k]; }).join('\n');
        }, 500);
    }
    function tickDbg() { dbgFrames++; }

    var hero = document.querySelector('.phero');
    var finale = document.querySelector('.finale');
    var header = document.querySelector('.site-header');

    /* =====================================================
       DOM挙動（WebGLの有無に関係なく動く）
       ===================================================== */
    /* 見出しを行ごとに分割（改行<br>で区切り、マスクの下から上がる） */
    document.querySelectorAll('[data-lines]').forEach(function (el) {
        var label = el.textContent.replace(/\s+/g, ''); el.setAttribute('aria-label', label);
        var nodes = Array.prototype.slice.call(el.childNodes), idx = 0; el.textContent = '';
        function mk() {
            var ln = document.createElement('span'); ln.className = 'ln'; ln.setAttribute('aria-hidden', 'true');
            var li = document.createElement('span'); li.className = 'li'; li.style.setProperty('--i', idx++); ln.appendChild(li); el.appendChild(ln); return li;
        }
        var cur = mk();
        nodes.forEach(function (n) {
            if (n.nodeName === 'BR') { cur = mk(); return; }
            cur.appendChild(document.createTextNode(n.textContent));
        });
    });

    /* スクロールで現れる */
    var rv = document.querySelectorAll('.rv, [data-lines]');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
        rv.forEach(function (el) { io.observe(el); });
    } else { rv.forEach(function (el) { el.classList.add('in'); }); }

    /* ストーリー: 文字をスクロール量に合わせて点灯 */
    var story = document.querySelector('.story'), chars = [];
    if (story && !reduce) {
        story.querySelectorAll('.story-line').forEach(function (line) {
            var nodes = Array.prototype.slice.call(line.childNodes); line.textContent = '';
            nodes.forEach(function (n) {
                if (n.nodeType === 3) {
                    n.textContent.replace(/\s+/g, '').split('').forEach(function (c) {
                        var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; line.appendChild(s); chars.push(s);
                    });
                } else if (n.nodeName === 'BR') { line.appendChild(n); }
                else if (n.classList && n.classList.contains('accent')) {
                    n.textContent.split('').forEach(function (c) {
                        var s = document.createElement('span'); s.className = 'ch accent'; s.textContent = c; line.appendChild(s); chars.push(s);
                    });
                }
            });
        });
    } else if (story) { story.classList.add('static'); }


    /* Brand Film: スクロールで角丸 → 全画面へ。動画は近づいてから読み込む */
    var film = document.querySelector('.film'), filmFrame = film && film.querySelector('.film-frame'), filmIf = film && film.querySelector('.film-video');
    function filmUpdate() {
        if (!film || reduce) return;
        var vw0 = window.innerWidth, vh0 = window.innerHeight, r = film.getBoundingClientRect(), total = film.offsetHeight - vh0;
        var p = clamp(-r.top / total, 0, 1), e = smooth(0.05, 0.62, p);
        var w0 = Math.min(vw0 * .78, 1280), h0 = w0 * .5625;
        var w = w0 + (vw0 - w0) * e, h = h0 + (vh0 - h0) * e;
        filmFrame.style.setProperty('--fw', w.toFixed(1) + 'px'); filmFrame.style.setProperty('--fh', h.toFixed(1) + 'px');
        filmFrame.style.setProperty('--fr', (28 * (1 - e)).toFixed(1) + 'px');
        film.style.setProperty('--cap', smooth(0.55, 0.8, p).toFixed(3));
    }
    if (film && filmIf && !reduce) {
        var filmLoaded = false;
        function filmLoad() {
            if (filmLoaded) return; filmLoaded = true;
            filmIf.src = filmIf.getAttribute('data-src').replace('ORIGIN', encodeURIComponent(location.origin));
            filmIf.addEventListener('load', function () { setTimeout(function () { filmIf.classList.add('ready'); }, 900); });
            function cmd(fn, args) { try { filmIf.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); } catch (e) { } }
            function keep() { cmd('playVideo'); cmd('unloadModule', ['captions']); cmd('unloadModule', ['cc']); }
            setTimeout(keep, 1500); setTimeout(keep, 3500); setInterval(keep, 5000);
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) { if (es[0].isIntersecting) filmLoad(); }, { rootMargin: '120% 0px' }).observe(film);
        } else { filmLoad(); }
    }

    function domUpdate() {
        var y = window.pageYOffset;
        if (header) header.classList.toggle('is-scrolled', y > 24);
        filmUpdate();
        if (story && chars.length) {
            var r = story.getBoundingClientRect(), total = story.offsetHeight - window.innerHeight;
            var p = clamp(-r.top / total, 0, 1), lit = Math.round(Math.min(1, p * 1.15) * chars.length);
            for (var i = 0; i < chars.length; i++) {
                var on = i < lit; if (on !== chars[i].classList.contains('on')) chars[i].classList.toggle('on', on);
            }
        }
    }
    var tick = false;
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; domUpdate(); }); } }, { passive: true });
    window.addEventListener('resize', domUpdate);
    domUpdate();


    /* 動きの切替: OSの「視差効果を減らす」を尊重しつつ、見る側が選べるようにする */
    function setMotion(on) { try { if (on) localStorage.setItem('fxMotion', '1'); else localStorage.removeItem('fxMotion'); } catch (e) { } location.reload(); }
    if (osReduce) {
        if (reduce && hero) {
            var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'motion-toggle';
            btn.innerHTML = '<span aria-hidden="true">▶</span> 動きを再生する'; btn.setAttribute('aria-label', 'アニメーションを再生する');
            btn.addEventListener('click', function () { setMotion(true); });
            var stick = hero.querySelector('.phero-stick'); if (stick) stick.appendChild(btn);
        } else if (optedIn) {
            var fc = document.querySelector('.fcopy');
            if (fc) { var off = document.createElement('button'); off.type = 'button'; off.className = 'motion-off'; off.textContent = '動きを止める'; off.addEventListener('click', function () { setMotion(false); }); fc.appendChild(document.createTextNode('　')); fc.appendChild(off); }
        }
    }

    /* =====================================================
       WebGL
       ===================================================== */
    var canvas = document.getElementById('fx');
    if (!canvas || !hero) return;
    function setStatic() { hero.classList.add('static'); if (finale) finale.classList.add('static'); root.classList.add('fx-static'); }
    note('reduceMotion', reduce); note('osReduce', osReduce); note('optedIn', optedIn); note('mobile', mobile); note('ua', navigator.userAgent.slice(0, 90));
    var gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    note('webgl', gl ? 'OK' : 'NULL (取得失敗)');
    if (/[?&]noblend=1/.test(location.search)) { canvas.style.mixBlendMode = 'normal'; note('blend', 'normal(診断)'); }
    if (!gl) { setStatic(); root.classList.add('fx-off'); return; }
    if (reduce) setStatic();

    var N = mobile ? 36000 : 90000;
    var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    var FOV = 45 * Math.PI / 180, TANH = Math.tan(FOV / 2);
    var LOGO_W = 4.6, LW = 2000, LH = 1575, RING_X = 1000, RING_Y = 548;
    var FIELD_L = 64, CRUISE = 2.4, MAXZ = 8;

    /* ---------- シェーダ ---------- */
    var VS = [
        'precision highp float;',
        'attribute vec4 aHome; attribute vec4 aRand;',
        'uniform mat4 uVP; uniform vec3 uCam;',
        'uniform float uDpr, uTime, uAssemble, uFinal, uSize, uAlpha, uGold, uFlash, uShift, uEndZ, uL, uLift, uMaxPt, uGain;',
        'uniform vec2 uMH, uME; uniform vec3 uPH, uPE;',
        'uniform vec4 uFrame; uniform vec3 uEmb, uWm;',
        'varying float vA; varying float vG;',
        'float sst(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0., 1.); return t*t*(3.-2.*t); }',
        'float smr(float x){ x = clamp(x, 0., 1.); return x*x*x*(x*(x*6.-15.)+10.); }',
        'vec2 repel(vec2 p, vec2 m, float R, float S){ vec2 d = p-m; float l = length(d)+1e-4; return d/l*exp(-l*l/(R*R))*S; }',
        'vec3 shock(vec3 p, vec3 u){',
        '  if(u.z < 0.) return vec3(0.);',
        '  vec2 d = p.xy-u.xy; float l = length(d)+1e-4; float r = u.z*4.2;',
        '  float b = exp(-pow((l-r)/0.55, 2.)) * exp(-u.z*1.5);',
        '  return vec3(d/l*b*0.95, b*0.7);',
        '}',
        /* フィナーレの構図: 括弧は文字を囲む枠に／リング+三日月は上へ／文字は下へ */
        'vec2 composeXY(vec3 h, float part){',
        '  if(part < .5){',
        '    float left = h.x < 0. ? 1. : 0.;',
        '    float dx = left > .5 ? (uFrame.x-uFrame.z)+2.3 : (uFrame.x+uFrame.z)-2.3;',
        '    float t = .17, ya = 1.26, yb = -1.264, nt = uFrame.y+uFrame.w, nb = uFrame.y-uFrame.w, y;',
        '    if(h.y > ya-t) y = h.y + (nt-ya);',
        '    else if(h.y < yb+t) y = h.y + (nb-yb);',
        '    else y = mix(nb+t, nt-t, (h.y-(yb+t))/((ya-t)-(yb+t)));',
        '    return vec2(h.x+dx, y);',
        '  }',
        '  if(part < 2.5) return h.xy*uEmb.z + uEmb.xy;',
        '  return (h.xy - vec2(0., -2.02))*uWm.z + uWm.xy;',
        '}',
        'void main(){',
        '  vec3 h = aHome.xyz; float part = aHome.w; vec4 R = aRand; float t = uTime;',
        '  float dust = step(0.80, R.w);',
        '  vec3 wob = vec3(sin(t*.7+R.x*40.), cos(t*.6+R.y*40.), sin(t*.8+R.z*40.))*0.005;',
        '  vec3 dir = normalize(R.xyz*2.-1.+vec3(1e-3));',
        '  float rr = 5. + R.w*11.;',
        '  float dl = length(h.xy)*0.15 + R.x*0.2;',
        '  float e = smr(uAssemble*1.6 - dl);',
        '  float ang = (1.-e)*2.6; float ca = cos(ang), sa = sin(ang);',
        '  vec3 st = dir*rr; st.xy = vec2(st.x*ca - st.y*sa, st.x*sa + st.y*ca);',
        '  vec3 logoP = mix(st, h+wob, e);',
        '  logoP.xy += repel(logoP.xy, uMH, 0.62, 0.55)*e;',
        '  logoP += shock(logoP, uPH)*e;',
        '  float zRel = mod(R.z*uL - uCam.z, uL) - uL*0.86;',
        '  float px = (R.x*2.-1.)*12.5 + sin(t*.11+R.y*30.)*.9 + sin(zRel*.11+R.x*6.28)*1.4;',
        '  float py = (R.y*2.-1.)*7.5 + cos(t*.09+R.x*30.)*.9 + cos(zRel*.13+R.y*6.28)*1.1;',
        '  vec3 fieldP = vec3(px + uCam.x, py + uCam.y, uCam.z + zRel);',
        '  vec2 cxy = mix(h.xy, composeXY(h, part), uLift);',
        '  vec3 eh = vec3(cxy, uEndZ + h.z*(1.-uLift*.85)) + wob;',
        '  float fd = length(h.xy)*0.17 + R.y*0.26;',
        '  float fe = smr(uFinal*1.65 - fd);',
        '  vec3 endP = eh;',
        '  endP.xy += repel(eh.xy, uME, 0.62, 0.55)*fe;',
        '  endP += shock(eh, uPE)*fe;',
        '  float fa = (1.-fe)*fe*3.2*(R.z-.5);',
        '  vec3 mid = mix(fieldP, endP, fe); mid.x += fa; mid.y -= fa*.6;',
        '  float lw = (1.-dust)*sst(-0.9, 0.9, uCam.z);',
        '  vec3 P = mix(mid, logoP, lw);',
        '  float isEmb = step(.5,part)*step(part,2.5), isWm = step(2.5,part), isBr = 1.-step(.5,part);',
        '  float sc = isEmb*uEmb.z + isWm*uWm.z;',
        '  float keep = 1. - uLift*(isEmb+isWm);                      // リング・三日月・文字は粒子がほどけて消え、括弧だけが残る',
        '  if(R.y > keep){ gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vA = 0.; vG = 0.; return; }',
        '  vec4 clip = uVP*vec4(P, 1.);',
        '  gl_Position = clip; gl_Position.y += uShift*clip.w;',
        '  float w = max(clip.w, 0.05);',
        '  float sz = (1.25 + R.w*1.2 + step(.5,part)*step(part,1.5)*0.7) * mix(1., .75, dust);',
        '  float pt = clamp(sz*uSize/w, mix(1.9, 1.3, dust)*uDpr, uMaxPt);',
        '  gl_PointSize = pt;',
        '  float tw = .86 + .14*sin(t*(.6+R.x*1.8) + R.y*60.);',
        '  float br = (.7 + .3*R.z) * tw;',
        '  float near = sst(.4, 1.8, w); float far = 1. - sst(uL*.5, uL*.86, w);',
        '  float boke = clamp(5.5/(pt/uSize*7.8+0.001), .1, 1.);',
        '  vA = br*near*far*uAlpha*boke*uGain*(1.+uFlash*1.4)*mix(1., .6, dust)*mix(3.6, 1., lw)*mix(1., 1.05, uLift*isBr)*mix(1., .62, step(.5,part)*step(part,1.5));',
        '  float gl = step(.5,part)*step(part,1.5);',
        '  float g = max(gl*max(lw*e, fe), step(0.95, R.x)*.9);',
        '  vG = clamp(g*uGold, 0., 1.);',
        '}'
    ].join('\n');
    var FS = [
        'precision mediump float; varying float vA; varying float vG;',
        'void main(){',
        '  vec2 c = gl_PointCoord-.5; float d = length(c)*2.; if(d > 1.) discard;',
        '  float core = 1. - smoothstep(0., .6, d); float halo = pow(1.-d, 2.4);',
        '  float a = (core*.9 + halo*.5)*vA;',
        '  vec3 col = mix(vec3(1.), vec3(.79,.66,.42), vG);',
        '  gl_FragColor = vec4(col*a, a);',
        '}'
    ].join('\n');
    /* 全画面パス: フェード（残像）と合成（除外ゾーンのマスク） */
    var QV = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos, 0., 1.); }';
    var QF = [
        'precision highp float; varying vec2 vUv; uniform sampler2D uTex;',
        'uniform float uK, uSub, uFea, uRad; uniform int uN; uniform vec4 uClr[8]; uniform float uClrS[8]; uniform vec2 uRes;',
        'void main(){',
        '  vec4 c = texture2D(uTex, vUv);',
        '  c = max(c*uK - vec4(uSub), 0.);',
        '  float m = 1.;',
        '  vec2 p = vUv*uRes;',
        '  for(int i = 0; i < 8; i++){',
        '    if(i >= uN) break;',
        '    vec4 z = uClr[i]; vec2 q = abs(p - z.xy) - (z.zw - vec2(uRad));',
        '    float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRad;',
        '    m = min(m, mix(1., smoothstep(0., uFea, d), uClrS[i]));',
        '  }',
        '  gl_FragColor = c*m;',
        '}'
    ].join('\n');

    function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
    }
    function program(vs, fs, attrs) {
        var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        attrs.forEach(function (a, i) { gl.bindAttribLocation(p, i, a); });
        gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
    }
    var PP, QP;
    try { PP = program(VS, FS, ['aHome', 'aRand']); QP = program(QV, QF, ['aPos']); }
    catch (err) { note('SHADER_ERROR', String(err && err.message || err).slice(0, 220)); if (window.console) console.warn('[fx]', err); setStatic(); root.classList.add('fx-off'); return; }

    function locs(p, names) { var o = {}; names.forEach(function (n) { o[n] = gl.getUniformLocation(p, n); }); return o; }
    var PU = locs(PP, ['uVP', 'uCam', 'uDpr', 'uTime', 'uAssemble', 'uFinal', 'uSize', 'uAlpha', 'uGold', 'uFlash', 'uShift', 'uEndZ', 'uL', 'uLift', 'uMaxPt', 'uGain', 'uMH', 'uME', 'uPH', 'uPE', 'uFrame', 'uEmb', 'uWm']);
    var QU = locs(QP, ['uTex', 'uK', 'uSub', 'uFea', 'uRad', 'uN', 'uClr', 'uClrS', 'uRes']);

    var quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var partBuf = gl.createBuffer(), W = 1, H = 1, tex = [gl.createTexture(), gl.createTexture()], fbo = [gl.createFramebuffer(), gl.createFramebuffer()], cur = 0;
    function allocTargets() {
        for (var i = 0; i < 2; i++) {
            gl.bindTexture(gl.TEXTURE_2D, tex[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[i]); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[i], 0);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---------- 行列 ---------- */
    function mul(a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
    function persp(f, asp, n, fa) { var t = 1 / Math.tan(f / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (fa + n) / (n - fa); m[11] = -1; m[14] = 2 * fa * n / (n - fa); return m; }
    function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
    function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
    function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
    function trans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }

    /* ---------- ロゴのサンプリング（4パーツ） ---------- */
    var ready = false, drawN = N;
    function build(img) {
        var SW = 1000, SH = Math.round(SW * img.naturalHeight / img.naturalWidth);
        var oc = document.createElement('canvas'); oc.width = SW; oc.height = SH;
        var octx = oc.getContext('2d'); octx.drawImage(img, 0, 0, SW, SH);
        var d = octx.getImageData(0, 0, SW, SH).data, cand = [];
        for (var i = 0; i < SW * SH; i++) if (d[i * 4 + 3] > 110) cand.push(i);
        if (!cand.length) return false;
        /* 層化サンプリング: セルごとに1点（ランダム配置より粒のムラが少ない） */
        var gsz = Math.sqrt(cand.length / N), pts = [];
        for (var gy = 0; gy < SH; gy += gsz) for (var gx = 0; gx < SW; gx += gsz) {
            var jx = gx + Math.random() * gsz, jy = gy + Math.random() * gsz;
            if (jx >= SW || jy >= SH) continue;
            if (d[((jy | 0) * SW + (jx | 0)) * 4 + 3] > 110) pts.push(jx, jy);
        }
        N = pts.length / 2; drawN = N;
        var rcy = RING_Y / LW - (LH / LW) / 2, buf = new Float32Array(N * 8);
        for (var n = 0; n < N; n++) {
            var sx = pts[n * 2], sy = pts[n * 2 + 1];
            var X = sx / SW * LW, Y = sy / SH * LH, part;
            if (Y > 1290) part = 3; else if (Math.hypot(X - RING_X, Y - RING_Y) < 275) part = 1; else if ((X < 380 || X > 1620) && Y < 1110) part = 0; else part = 2;
            var o = n * 8;
            buf[o] = (sx / SW - .5) * LOGO_W; buf[o + 1] = -((sy / SH - .5) * (SH / SW) - rcy) * LOGO_W; buf[o + 2] = (Math.random() - .5) * 0.07; buf[o + 3] = part;
            buf[o + 4] = Math.random(); buf[o + 5] = Math.random(); buf[o + 6] = Math.random(); buf[o + 7] = Math.random();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
        return true;
    }

    /* ---------- レイアウト ---------- */
    var vw = 1, vh = 1, aspect = 1, D = 8, heroH = 1, YH = 1, Yf = 0, Lf = 1, Lc = 1, endZ = 0, secs = [], zoneEls = [];
    var frameU = [0, 0, 1, 1], embU = [0, 1.5, .3], wmU = [0, -1.5, .4];
    function camZ(y, useEff) {
        var ye = useEff ? y : yEffOf(y);
        var travel = (D + 4) * smooth(0, 1, clamp(y / (0.85 * YH), 0, 1)), cs = 0.85 * YH;
        if (ye > cs) travel += CRUISE * (ye - cs) / vh;
        return D - travel;
    }
    function yEffOf(y) {
        if (!finale || y <= Yf) return y;
        if (y < Yf + Lc) { var u = (y - Yf) / Lc; return Yf + Lc * (u - u * u / 2); }
        return Yf + Lc / 2;
    }
    function px2w(px, py) { return [(px - vw / 2) / (vw / 2) * TANH * aspect * D, -(py - vh / 2) / (vh / 2) * TANH * D]; }
    function measureFinale() {
        /* フィナーレの構図を文章の実寸から計算（括弧が文字を囲む）。ピン留め中は stick 基準なのでスクロールに依存しない */
        if (!finale) return;
        var copy = finale.querySelector('.finale-copy'), stick = finale.querySelector('.finale-stick');
        if (!copy || !stick) return;
        var cr = copy.getBoundingClientRect(), sr = stick.getBoundingClientRect();
        var top = cr.top - sr.top, bot = cr.bottom - sr.top, left = cr.left - sr.left, right = cr.right - sr.left;
        var padX = Math.min(64, vw * .05), padY = Math.min(54, vh * .065);
        var fl = left - padX, fr = right + padX, ft = top - padY, fb = bot + padY;
        var a = px2w(fl, ft), b = px2w(fr, fb);
        frameU = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(a[1] - b[1]) / 2];
        var avail = ft - 52 - 24, rpx = clamp(avail / 2 - 8, 16, 64);
        var ec = px2w(vw / 2, ft - 14 - rpx), rw = rpx / (vh / 2) * TANH * D;
        embU = [ec[0], ec[1], rw / 1.115];
        var wpx = Math.min(vw * .34, 210), wc = px2w(vw / 2, fb + 30), ww = wpx / (vw / 2) * TANH * aspect * D;
        wmU = [wc[0], wc[1], ww / LOGO_W];
    }
    function measure() {
        vw = window.innerWidth; vh = window.innerHeight; aspect = vw / vh;
        var dw = LOGO_W / (0.64 * 2 * TANH * aspect), dh = (LOGO_W * 0.79) / (0.54 * 2 * TANH);
        D = Math.max(dw, dh, 6);
        heroH = hero.offsetHeight; YH = Math.max(1, heroH - vh);
        if (finale) {
            Yf = finale.getBoundingClientRect().top + window.pageYOffset; Lf = Math.max(1, finale.offsetHeight - vh); Lc = Lf * 0.5;
            endZ = camZ(Yf + Lc / 2, true) - D;
            measureFinale();
        }
        secs = Array.prototype.map.call(document.querySelectorAll('[data-fx]'), function (el) {
            var p = el.getAttribute('data-fx').split(','); return { el: el, alpha: parseFloat(p[0]), gold: parseFloat(p[1]) };
        });
        zoneEls = Array.prototype.slice.call(document.querySelectorAll('[data-clear]'));
    }
    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
        var w = Math.round(window.innerWidth * DPR), h = Math.round(window.innerHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; W = w; H = h; allocTargets(); }
        measure();
        if (reduce && ready) renderStatic();
    }

    /* ---------- 入力 ---------- */
    var mx = 0, my = 0, smx = 0, smy = 0, mouseOn = false, pulseT = -1e9, pulseXY = [0, 0];
    window.addEventListener('pointermove', function (e) { mx = e.clientX / vw * 2 - 1; my = -(e.clientY / vh * 2 - 1); mouseOn = true; }, { passive: true });
    window.addEventListener('pointerdown', function (e) { mx = e.clientX / vw * 2 - 1; my = -(e.clientY / vh * 2 - 1); mouseOn = true; pulseT = performance.now(); pulseXY = [mx, my]; }, { passive: true });
    document.addEventListener('pointerleave', function () { mouseOn = false; });
    window.addEventListener('resize', resize);
    window.addEventListener('load', function () { measure(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); });

    /* ---------- 描画 ---------- */
    var Zbuf = new Float32Array(MAXZ * 4), Sbuf = new Float32Array(MAXZ), rng = document.createRange();
    var U = { cam: [0, 0, 8], vp: null, time: 0, assemble: 1, final: 0, alpha: 1, gold: 1, flash: 0, shift: 0, lift: 0, mH: [9, 9], mE: [9, 9], pH: [0, 0, -1], pE: [0, 0, -1], copy: 0, fcopy: 0, fade: .16 };

    function gatherZones() {
        var n = 0, rect, i;
        for (i = 0; i < zoneEls.length && n < MAXZ; i++) {
            var el = zoneEls[i], gate = el.getAttribute('data-gate'), str = 1;
            if (gate === 'hero') str = U.copy; else if (gate === 'finale') str = U.fcopy;
            if (str < .02) continue;
            if (el.getAttribute('data-clear') === 'text') { rng.selectNodeContents(el); rect = rng.getBoundingClientRect(); } else rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.bottom < -80 || rect.top > vh + 80) continue;
            var pad = parseFloat(el.getAttribute('data-pad') || '26');
            Zbuf[n * 4] = (rect.left + rect.right) / 2 * DPR; Zbuf[n * 4 + 1] = (vh - (rect.top + rect.bottom) / 2) * DPR;
            Zbuf[n * 4 + 2] = (rect.width / 2 + pad) * DPR; Zbuf[n * 4 + 3] = (rect.height / 2 + pad) * DPR; Sbuf[n] = str; n++;
        }
        return n;
    }
    function drawQuad(prog, locsU) { gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.disableVertexAttribArray(1); gl.drawArrays(gl.TRIANGLES, 0, 3); }

    function render() {
        var nz = gatherZones();
        gl.viewport(0, 0, W, H);
        /* 1) 前フレームを薄めて持ち越す（残像） */
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur]); gl.disable(gl.BLEND);
        gl.useProgram(QP); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[1 - cur]); gl.uniform1i(QU.uTex, 0);
        gl.uniform1f(QU.uK, 1 - U.fade); gl.uniform1f(QU.uSub, 1.4 / 255); gl.uniform1i(QU.uN, 0); gl.uniform2f(QU.uRes, W, H);
        gl.uniform1f(QU.uFea, 1); gl.uniform1f(QU.uRad, 0); drawQuad();
        /* 2) 粒子を加算 */
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(PP);
        gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
        gl.uniformMatrix4fv(PU.uVP, false, U.vp); gl.uniform3f(PU.uCam, U.cam[0], U.cam[1], U.cam[2]);
        gl.uniform1f(PU.uDpr, DPR); gl.uniform1f(PU.uTime, U.time); gl.uniform1f(PU.uAssemble, U.assemble); gl.uniform1f(PU.uFinal, U.final);
        gl.uniform1f(PU.uSize, DPR * (vh / 900) * D); gl.uniform1f(PU.uAlpha, U.alpha); gl.uniform1f(PU.uGold, U.gold); gl.uniform1f(PU.uFlash, U.flash);
        gl.uniform1f(PU.uShift, U.shift); gl.uniform1f(PU.uEndZ, endZ); gl.uniform1f(PU.uL, FIELD_L); gl.uniform1f(PU.uLift, U.lift);
        gl.uniform1f(PU.uMaxPt, 26 * DPR); gl.uniform1f(PU.uGain, mobile ? .15 : .12);
        gl.uniform2fv(PU.uMH, U.mH); gl.uniform2fv(PU.uME, U.mE); gl.uniform3fv(PU.uPH, U.pH); gl.uniform3fv(PU.uPE, U.pE);
        gl.uniform4fv(PU.uFrame, frameU); gl.uniform3fv(PU.uEmb, embU); gl.uniform3fv(PU.uWm, wmU);
        gl.drawArrays(gl.POINTS, 0, drawN);
        /* 3) 画面へ合成（除外ゾーンをマスク） */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.BLEND);
        gl.useProgram(QP); gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(QU.uTex, 0);
        gl.uniform1f(QU.uK, 1); gl.uniform1f(QU.uSub, 0); gl.uniform1i(QU.uN, nz); gl.uniform2f(QU.uRes, W, H);
        gl.uniform1f(QU.uFea, 190 * DPR); gl.uniform1f(QU.uRad, 60 * DPR);
        gl.uniform4fv(QU.uClr, Zbuf); gl.uniform1fv(QU.uClrS, Sbuf); drawQuad();
        cur = 1 - cur;
    }

    var t0 = 0, last = 0, running = false, visible = true, sy = 0, alphaNow = 1, goldNow = 1, flashT = -1e9, finalDone = false, introFlash = false, frames = 0, slow = 0;
    function update(now, dt) {
        var t = (now - t0) / 1000, yReal = window.pageYOffset;
        sy += (yReal - sy) * (1 - Math.exp(-dt * 7)); if (Math.abs(yReal - sy) < .3) sy = yReal;
        if (reduce) sy = 0;
        var heroP = clamp(sy / YH, 0, 1), cz = reduce ? D : camZ(sy), ye = reduce ? 0 : yEffOf(sy);
        smx += (mx - smx) * (1 - Math.exp(-dt * 3)); smy += (my - smy) * (1 - Math.exp(-dt * 3));
        var fin = finale ? clamp((sy - Yf) / Lf, 0, 1) : 0, rollK = 1 - smooth(0, .5, fin);
        var roll = Math.sin(sy * .00042) * .2 * rollK * smooth(.55, 1, heroP);
        var camx = Math.sin(ye * .0009) * .5 * smooth(.7, 1, heroP) * rollK, camy = Math.cos(ye * .0007) * .36 * smooth(.7, 1, heroP) * rollK;
        var pf = 1 - smooth(.3, .5, fin);                          // フィナーレでは視差を切り、DOMの文字とずらさない
        var V = mul(rotZ(roll), mul(rotX(smy * .025 * pf), mul(rotY(-smx * .035 * pf), trans(-camx, -camy, -cz))));
        U.vp = mul(persp(FOV, aspect, .1, 140), V); U.cam = [camx, camy, cz]; U.time = t;
        U.assemble = reduce ? 1 : clamp(t / 3.4, 0, 1);
        if (!reduce && !introFlash && t > 3.2) { introFlash = true; if (heroP < .12) flashT = now; }
        U.final = finale ? smooth(.03, .5, fin) : 0;
        if (U.final > .985 && !finalDone) { finalDone = true; flashT = now; } if (U.final < .6) finalDone = false;
        var liftT = (finale && fin > .6) ? 1 : 0;                   // しきい値で組み替え（止まる位置は2状態のみ）
        U.lift += (liftT - U.lift) * (1 - Math.exp(-dt * 2.6)); if (Math.abs(liftT - U.lift) < .003) U.lift = liftT;
        if (finale && fin > .02) measureFinale();
        U.fcopy = reduce ? 1 : smooth(.72, 1, U.lift);
        U.flash = Math.exp(-(now - flashT) / 1000 * 5.5);
        /* フィナーレが上へ抜けるとき、粒子も一緒に画面外へ（フッターに重ならない） */
        var out = finale ? Math.max(0, vh - finale.getBoundingClientRect().bottom) : 0;
        U.shift = (mobile ? .07 : .1) * (1 - smooth(.15, .7, heroP)) + 2 * out / vh;
        U.copy = reduce ? 1 : smooth(.6, .86, heroP); U.fcopy = reduce ? 1 : smooth(.72, 1, U.lift);
        var ta = 1, tg = 1, mid = vh * .5;
        for (var i = 0; i < secs.length; i++) { var r = secs[i].el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { ta = secs[i].alpha; tg = secs[i].gold; break; } }
        alphaNow += (ta - alphaNow) * (1 - Math.exp(-dt * 3.2)); goldNow += (tg - goldNow) * (1 - Math.exp(-dt * 3.2));
        U.alpha = alphaNow; U.gold = goldNow;
        var nx = mouseOn ? mx : 9, ny = mouseOn ? my - U.shift : 9, dH = cz, dE = cz - endZ;
        U.mH = [nx * TANH * aspect * dH + camx, ny * TANH * dH + camy]; U.mE = [nx * TANH * aspect * dE + camx, ny * TANH * dE + camy];
        var age = (now - pulseT) / 1000, pAge = age < 1.8 ? age : -1, pny = pulseXY[1] - U.shift;
        U.pH = [pulseXY[0] * TANH * aspect * dH + camx, pny * TANH * dH + camy, pAge]; U.pE = [pulseXY[0] * TANH * aspect * dE + camx, pny * TANH * dE + camy, pAge];
        U.fade = 1 - Math.pow(1 - .16, dt * 60);
        /* DOM連動 */
        hero.style.setProperty('--copy', U.copy.toFixed(3)); hero.style.setProperty('--ui', (1 - smooth(0, .07, heroP)).toFixed(3));
        hero.classList.toggle('copy-on', U.copy > .5);
        if (finale) { finale.style.setProperty('--fcopy', U.fcopy.toFixed(3)); finale.classList.toggle('copy-on', U.fcopy > .5); }
    }
    var rafId = 0;
    function frame(now) {
        if (!running) return; rafId = requestAnimationFrame(frame);
        var dt = clamp((now - last) / 1000 || .016, .001, .1); last = now;
        tickDbg(); note('drawN', drawN); note('heroP', (U.copy).toFixed(2) + '(copy) assemble ' + U.assemble.toFixed(2)); update(now, dt); render();
        if (now - t0 > 4000) {                                   // 低性能端末は粒子数を段階的に削減
            frames++; if (dt > .034) slow++;
            if (frames >= 90) { if (slow > 40 && drawN > N * .35) drawN = Math.floor(drawN * .72); frames = 0; slow = 0; }
        }
    }
    function renderStatic() { update(performance.now(), .016); U.fade = .3; for (var k = 0; k < 16; k++) render(); }
    function start() { if (running || reduce || !ready) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
    function stop() { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });

    /* WebGLコンテキスト喪失（iOS等）: 静止表示（ロゴ画像＋通常配置）へ切り替える */
    canvas.addEventListener('webglcontextlost', function (e) { note('CONTEXT', 'LOST'); e.preventDefault(); stop(); setStatic(); root.classList.add('fx-off'); }, false);

    var img = new Image();
    img.onload = function () {
        note('logo', 'loaded ' + img.naturalWidth + 'x' + img.naturalHeight);
        if (!build(img)) { note('BUILD', 'failed'); setStatic(); root.classList.add('fx-off'); return; }
        note('particles', N); resize(); ready = true; note('ready', true); root.classList.add('fx-ready'); t0 = performance.now();
        if (window.pageYOffset > 300) t0 -= 6000;
        if (reduce) renderStatic(); else start();
    };
    img.onerror = function () { note('LOGO_ERROR', 'image load failed'); setStatic(); root.classList.add('fx-off'); };
    img.src = 'assets/logo_wh.png';
    resize();

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, {}).observe(document.body);
    }
})();
