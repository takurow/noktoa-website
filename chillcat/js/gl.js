/* プロローグの WebGL2
   ロゴの黒猫へカメラが寄る → 黄色の筆文字が縦に垂れる（MVの題字の垂れ）→ 半分閉じた目が開き、虹彩が細かく見える
   → 縦の瞳孔が裂けて、その奥から夜の海（本人が選んだMVの背景）が現れる。
   横には動かさない（寄り・縦の垂れ・縦の色ずれのみ）。描けない環境では null を返し、静止版に任せる。 */
window.createProloguGL = function (canvas, opts) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return null;

  const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

  const FS = `#version 300 es
precision highp float;
uniform sampler2D uLogo;
uniform sampler2D uSea;
uniform vec2 uRes;
uniform float uTime, uP, uVel, uLogoAsp, uSeaAsp, uSeaOn, uLogoOn, uFit;
uniform vec2 uShift;
uniform vec2 uEye, uEyeR;
out vec4 o;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
// 画像の外周は完全に透明なので、端の外側は CLAMP で透明になる（分岐させると微分が乱れて枠の線が出る）
vec4 tex(vec2 L){ return texture(uLogo, L); }
float yel(vec4 c){ return smoothstep(.22, .5, (c.r + c.g) * .5 - c.b) * c.a; }

vec3 seaAt(vec2 uv, float t){
  float ra = uRes.x / uRes.y;
  vec2 s = uv;
  // 縦長の画面は、月と浮島（画像の左寄り）が入るように中心をずらす
  if (ra > uSeaAsp) s.y = (uv.y - .5) * uSeaAsp / ra + .5; else s.x = (uv.x - .5) * ra / uSeaAsp + mix(.5, .3, step(ra, .8));
  float hz = .444;                                           // 水平線（下から）
  if (s.y < hz) {
    float dep = (hz - s.y) / hz;
    s.y += sin(s.y * 150. * (1. + dep * 1.4) - t * 1.4) * .0011 * (1. - dep * .4);
  }
  return texture(uSea, s).rgb;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 q = (uv - .5) * vec2(asp, 1.);
  float t = uTime;

  // 1) 目へ寄る
  float pz = smoothstep(.08, .74, uP);
  float ez = pz * pz * (3. - 2. * pz);
  float z = exp(ez * log(34.));
  // 寄りの中心は「目のもとの位置」に固定（横に流れない。拡大だけ）
  float hBase = min(.80, uFit * asp / uLogoAsp);
  vec2 size1 = vec2(hBase * uLogoAsp, hBase) * (1. + .005 * sin(t * .7));
  vec2 size = size1 * z;
  vec2 eyeS = (uEye - .5) * size1 + uShift * vec2(asp, 1.);     // 置き場所は最初から固定（動かさない）
  vec2 c = eyeS - (uEye - .5) * size;
  vec2 L = (q - c) / size + .5;

  // 2) 黄色の筆文字が垂れる（スクロールの勢いでも伸びる）
  float vel = min(abs(uVel), 2.5);
  float drip = smoothstep(.03, .42, uP) * .11 + vel * .035;
  float colN = vnoise(vec2(L.x * 52., 1.7)) * .7 + vnoise(vec2(L.x * 170., 4.1)) * .3;
  float len = drip * pow(colN, 2.4);
  float sp = (.0016 + vel * .007) / z;                     // 縦の色ずれ（画面上の幅は寄っても一定）
  vec4 base = tex(L);
  vec4 cr = tex(L + vec2(0., sp)), cb = tex(L - vec2(0., sp));
  vec3 col = vec3(cr.r, base.g, cb.b);
  float a = base.a;
  float ym = 0.;
  for (int i = 1; i <= 8; i++) {
    float fi = float(i) / 8.;
    ym = max(ym, yel(tex(L + vec2(0., len * fi))) * (1. - fi * .7));
  }
  vec3 Y = vec3(.988, .937, .024);
  col = mix(col, Y, ym * (1. - yel(base)));
  a = max(a, ym);
  col *= uLogoOn;
  // 寄るほど目の外は沈み、目だけが残る
  vec2 eR0 = uEyeR * size; vec2 e0 = q - eyeS;
  float near = length(e0 / vec2(eR0.x * 2.2, eR0.x * 1.6));
  col *= mix(1., .28, smoothstep(2., 7., z) * smoothstep(.8, 1.6, near));

  // 3) 目：近づくほど瞼が開き、虹彩の筋が見えてくる
  vec2 eR = uEyeR * size;
  vec2 e = q - eyeS;
  float open = smoothstep(.34, .66, uP);
  float hy = mix(eR.y, eR.x * .94, open);
  float lens = 1. - pow(abs(e.x) / eR.x, 2.);
  float inEye = smoothstep(0., .03 * eR.x, hy * max(lens, 0.) - abs(e.y)) * step(abs(e.x), eR.x);
  float irisMix = smoothstep(1.8, 4.5, z) * inEye;
  float r = length(e) / eR.x;
  float ang = atan(e.y, e.x);
  float fib = vnoise(vec2(ang * 16., r * 5.)) * .55 + vnoise(vec2(ang * 64., r * 22.)) * .45;
  vec3 irisC = mix(vec3(.36, .33, .11), vec3(.94, .88, .40), fib) * (1.2 - r * .6);
  irisC += vec3(.25, .22, .05) * smoothstep(.55, 0., r);
  irisC *= smoothstep(1.02, .86, r) * .8 + .2;              // 縁は暗く
  float po = smoothstep(.56, .8, uP);
  float pw = mix(.065, 4.2, pow(po, 2.3));
  float ph = mix(.84, 4.8, pow(po, 1.5));
  float slit = abs(e.x) / (pw * eR.x) + pow(abs(e.y) / (ph * eR.x), 2.);
  float pupil = smoothstep(1.03, .97, slit);
  vec3 eyeCol = mix(irisC, vec3(.004), pupil);
  float rim = smoothstep(1.16, 1., slit) * (1. - pupil);
  eyeCol += Y * rim * .6 * po;
  col = mix(col, eyeCol, irisMix);
  a = max(a, irisMix);

  // 4) 猫の外は黒。瞳孔の内側と、開ききった後は夜の海
  vec3 bg = vec3(.016, .02, .024);
  vec3 outc = mix(bg, col, a);
  float full = smoothstep(.79, .86, uP);
  vec3 sea = uSeaOn > .5 ? seaAt(uv, t) : vec3(.03, .05, .08);
  outc = mix(outc, sea, max(pupil * irisMix, full));

  // 5) 仕上げ：周辺減光と粒子
  float vig = smoothstep(1.3, .32, length(q * 1.05));
  outc *= mix(.68, 1., vig);
  outc += (hash(uv * uRes + fract(t * 7.3) * 91.) - .5) * .05;
  o = vec4(outc, 1.);
}`;

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(pr)); return null; }
  gl.useProgram(pr);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "a");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["uLogo", "uSea", "uRes", "uTime", "uP", "uVel", "uLogoAsp", "uSeaAsp", "uSeaOn", "uLogoOn", "uEye", "uEyeR", "uShift", "uFit"]
    .forEach(n => { U[n] = gl.getUniformLocation(pr, n); });

  function makeTex(unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([4, 5, 6, 255]));
    return t;
  }
  const tLogo = makeTex(0), tSea = makeTex(1);
  gl.uniform1i(U.uLogo, 0); gl.uniform1i(U.uSea, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let logoOn = 0, logoAsp = 1724 / 2000, seaOn = 0, seaAsp = 16 / 9;
  function upload(unit, tex, src) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }
  const logo = new Image();
  logo.decoding = "async";
  logo.onload = () => {
    upload(0, tLogo, logo);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    logoAsp = logo.naturalWidth / logo.naturalHeight; logoOn = 1;
  };
  logo.src = opts.logo;
  const poster = new Image();
  poster.onload = () => { if (!seaOn) { upload(1, tSea, poster); seaAsp = poster.naturalWidth / poster.naturalHeight; seaOn = 1; } };
  poster.src = opts.poster;
  const video = opts.video;

  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(opts.maxDpr || 1.5, devicePixelRatio || 1);
    W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
  }
  resize();

  let lastVideoT = -1;
  function render(p, vel, time, useVideo, shift, fit) {
    if (useVideo && video && video.readyState >= 2 && video.currentTime !== lastVideoT) {
      lastVideoT = video.currentTime;
      upload(1, tSea, video);
      seaAsp = (video.videoWidth || 16) / (video.videoHeight || 9); seaOn = 1;
    }
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uP, p);
    gl.uniform1f(U.uVel, vel);
    gl.uniform1f(U.uLogoAsp, logoAsp);
    gl.uniform1f(U.uSeaAsp, seaAsp);
    gl.uniform1f(U.uSeaOn, seaOn);
    gl.uniform1f(U.uLogoOn, logoOn);
    gl.uniform2f(U.uShift, shift ? shift[0] : 0, shift ? shift[1] : 0);
    gl.uniform1f(U.uFit, fit || .88);
    gl.uniform2f(U.uEye, opts.eye[0], opts.eye[1]);
    gl.uniform2f(U.uEyeR, opts.eyeR[0], opts.eyeR[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { render, resize, ready: () => logoOn === 1 };
};
