/* CHILLCAT HP — 蓄音機（three.js／WebGL）。extras.js から動的に読み込む。発光・ブルーム・粒子は使わない。 */
export function createGram(THREE, { canvas, host, audio: A, calm, compose, hash }) {
  const TAU = Math.PI * 2;
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ez = x => sm(0, 1, x);
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const small = () => canvas.clientWidth < 560;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, .5, 60);

  /* ---- 環境：暗い部屋に、やわらかい面光源を少しだけ置いて映り込みを作る ---- */
  {
    const es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.BoxGeometry(44, 26, 44), new THREE.MeshBasicMaterial({ color: 0x030405, side: THREE.BackSide })));
    const panel = (w, h, pos, col, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 1.5, 0); es.add(m); };
    panel(9, 7, [-10, 9, 8], 0xfff0dc, 6);      // キーライトの面
    panel(3, 12, [13, 6, -6], 0xc4d2ff, 3.4); // 縁を拾う細い面
    panel(16, 5, [0, 12.5, -3], 0xffffff, .5);
    panel(26, 26, [0, -8, 0], 0x4a3420, .5);    // 床からの弱い照り返し
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .035).texture; pm.dispose();
  }

  /* ---- 質感（すべてその場で描く。画像ファイルは使わない） ---- */
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mkTex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; return t; };
  const cnv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const woodMaps = (() => {
    const Wd = 1024, Hd = 512, r = rng(31), A1 = Array.from({ length: 64 }, () => r()), B1 = Array.from({ length: 64 }, () => r());
    const n1 = (a, t) => { const i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f); return a[i & 63] * (1 - s) + a[(i + 1) & 63] * s; };
    const hgt = new Float32Array(Wd * Hd), pore = new Float32Array(Wd * Hd);
    const col = cnv(Wd, Hd), cx = col.getContext("2d"), cd = cx.createImageData(Wd, Hd);
    for (let k = 0; k < 5200; k++) { const x0 = Math.floor(r() * Wd), y0 = Math.floor(r() * Hd), len = 5 + Math.floor(r() * 26), d = .35 + r() * .65; for (let i = 0; i < len; i++) pore[y0 * Wd + ((x0 + i) % Wd)] = Math.max(pore[y0 * Wd + ((x0 + i) % Wd)], d * Math.sin(Math.PI * (i + .5) / len)); }
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const X = x / Wd * 4.4, Y = y / Hd * 2.2, wv = n1(A1, X * .9 + 7) * .1 + n1(B1, X * 3.1) * .025, i = y * Wd + x;
      const broad = n1(A1, (Y + wv * 1.4) * 5 + 3), fine = n1(B1, (Y + wv) * 44 + 9), hair = n1(A1, (Y + wv) * 150 + X * 1.5);
      let v = .5 + .5 * (broad - .5) + .34 * (fine - .5) + .16 * (hair - .5) + .05 * (r() - .5); v -= pore[i] * .28; v = Math.max(0, Math.min(1, v));
      hgt[i] = .5 + .3 * (fine - .5) + .18 * (hair - .5) - pore[i] * .9;
      const a = [26, 11, 6], b = [76, 36, 17], c2 = [112, 62, 31], t = v < .5 ? v * 2 : (v - .5) * 2, p = v < .5 ? a : b, q = v < .5 ? b : c2;
      cd.data[i * 4] = p[0] + (q[0] - p[0]) * t; cd.data[i * 4 + 1] = p[1] + (q[1] - p[1]) * t; cd.data[i * 4 + 2] = p[2] + (q[2] - p[2]) * t; cd.data[i * 4 + 3] = 255;
    }
    cx.putImageData(cd, 0, 0);
    const nrm = cnv(Wd, Hd), nx = nrm.getContext("2d"), nd = nx.createImageData(Wd, Hd), rgh = cnv(Wd, Hd), rx = rgh.getContext("2d"), rd = rx.createImageData(Wd, Hd);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const i = y * Wd + x, l = hgt[y * Wd + ((x + Wd - 1) % Wd)], rr = hgt[y * Wd + ((x + 1) % Wd)], up = hgt[((y + Hd - 1) % Hd) * Wd + x], dn = hgt[((y + 1) % Hd) * Wd + x];
      let dx = (l - rr) * 2.2, dy = (dn - up) * 2.2; const inv = 1 / Math.hypot(dx, dy, 1);
      nd.data[i * 4] = (dx * inv * .5 + .5) * 255; nd.data[i * 4 + 1] = (dy * inv * .5 + .5) * 255; nd.data[i * 4 + 2] = (inv * .5 + .5) * 255; nd.data[i * 4 + 3] = 255;
      const ro = Math.min(1, .34 + pore[i] * .5 + (.5 - hgt[i]) * .25) * 255; rd.data[i * 4] = rd.data[i * 4 + 1] = rd.data[i * 4 + 2] = ro; rd.data[i * 4 + 3] = 255;
    }
    nx.putImageData(nd, 0, 0); rx.putImageData(rd, 0, 0);
    return [col, nrm, rgh];
  })();
  const woodMat = (ox, oy) => {
    const set = (c, srgb) => { const t = mkTex(c, srgb); t.repeat.set(1 / 4.4, 1 / 2.2); t.offset.set(.5 + ox, oy); return t; };
    return new THREE.MeshPhysicalMaterial({ map: set(woodMaps[0], true), normalMap: set(woodMaps[1], false), roughnessMap: set(woodMaps[2], false), normalScale: new THREE.Vector2(.3, .3), roughness: 1, metalness: 0, clearcoat: .4, clearcoatRoughness: .36, envMapIntensity: .9 });
  };
  const vinylMaps = (() => {
    const S = 1024, r = rng(5), bump = cnv(S, S), bx = bump.getContext("2d"), rgh = cnv(S, S), rx = rgh.getContext("2d"), c = S / 2, R = S / 2;
    bx.fillStyle = "#808080"; bx.fillRect(0, 0, S, S); rx.fillStyle = "rgb(0,70,0)"; rx.fillRect(0, 0, S, S);
    const gaps = [.58, .76, .9];
    for (let rad = .395 * R; rad < .985 * R; rad += 1.15) {
      const f = rad / R, gap = gaps.some(q => Math.abs(f - q) < .009), v = gap ? 150 : 96 + Math.floor(r() * 80);
      bx.strokeStyle = `rgb(${v},${v},${v})`; bx.lineWidth = 1.3; bx.beginPath(); bx.arc(c, c, rad, 0, TAU); bx.stroke();
      const g = gap ? 46 : 96 + Math.floor(r() * 34); rx.strokeStyle = `rgb(0,${g},0)`; rx.lineWidth = 1.5; rx.beginPath(); rx.arc(c, c, rad, 0, TAU); rx.stroke();
    }
    const an = cnv(256, 256), ax = an.getContext("2d"), ad = ax.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = x - 127.5, dy = -(y - 127.5), l = Math.hypot(dx, dy) || 1, f = l / 128, i = (y * 256 + x) * 4; ad.data[i] = (dx / l * .5 + .5) * 255; ad.data[i + 1] = (dy / l * .5 + .5) * 255; ad.data[i + 2] = f > .39 ? 255 : 40; ad.data[i + 3] = 255; }
    ax.putImageData(ad, 0, 0);
    return [bump, rgh, an];
  })();
  const labelTex = (() => {
    const S = 512, c = cnv(S, S), x = c.getContext("2d"), m = S / 2;
    x.fillStyle = "#fcef06"; x.fillRect(0, 0, S, S);
    x.strokeStyle = "#17150a"; x.lineCap = "butt";
    x.lineWidth = 5; x.beginPath(); x.arc(m, m, m * .9, 0, TAU); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(m, m, m * .84, 0, TAU); x.stroke();
    x.lineWidth = 24; x.beginPath(); x.arc(m, m, m * .62, .3, 2.1); x.stroke();
    x.lineWidth = 12; x.beginPath(); x.arc(m, m, m * .45, .5, 1.7); x.stroke(); x.beginPath(); x.arc(m, m, m * .62, 3.5, 4.5); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(m, m, m * .45, 3.3, 5.2); x.stroke();
    x.fillStyle = "#17150a"; x.beginPath(); x.arc(m, m, m * .1, 0, TAU); x.fill();
    return mkTex(c, true);
  })();

  const M = {
    brass: new THREE.MeshPhysicalMaterial({ color: 0xc9a43c, metalness: 1, roughness: .27, envMapIntensity: 1 }),
    brassIn: new THREE.MeshStandardMaterial({ color: 0xb8922f, metalness: 1, roughness: .46, vertexColors: true, envMapIntensity: .5 }),
    steel: new THREE.MeshPhysicalMaterial({ color: 0xc6cace, metalness: 1, roughness: .2, envMapIntensity: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0, roughness: .32 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x13241b, metalness: 0, roughness: 1 }),
    vinyl: new THREE.MeshPhysicalMaterial({ color: 0x09090b, metalness: 0, roughness: 1, roughnessMap: mkTex(vinylMaps[1], false), bumpMap: mkTex(vinylMaps[0], false), bumpScale: .5, anisotropy: .85, anisotropyMap: mkTex(vinylMaps[2], false), envMapIntensity: 1.1 }),
    label: new THREE.MeshStandardMaterial({ map: labelTex, color: 0xc8c8c8, metalness: 0, roughness: .8, toneMapped: false }),
    mica: new THREE.MeshPhysicalMaterial({ color: 0xb9a070, metalness: .3, roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }),
    knob: new THREE.MeshPhysicalMaterial({ color: 0x24110a, metalness: 0, roughness: .4, clearcoat: .7, clearcoatRoughness: .2 })
  };
  const add = (geo, mat, parent = scene, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };

  /* ---- 置き面（縁は暗がりに溶ける） ---- */
  {
    const S = 256, c = cnv(S, S), x = c.getContext("2d"), gr = x.createRadialGradient(S / 2, S / 2, S * .2, S / 2, S / 2, S * .5);
    gr.addColorStop(0, "#fff"); gr.addColorStop(.3, "#6a6a6a"); gr.addColorStop(.62, "#000"); gr.addColorStop(1, "#000"); x.fillStyle = gr; x.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
    const f = add(new THREE.PlaneGeometry(15, 15), new THREE.MeshStandardMaterial({ color: 0x1b1e21, metalness: 0, roughness: .5, alphaMap: t, transparent: true, depthWrite: false, envMapIntensity: .6 }), scene, false, true);
    f.rotation.x = -Math.PI / 2; f.position.y = -1.5;
  }

  /* ---- 筐体（角を面取りした木箱：台輪・胴・天板） ---- */
  const slab = (w, d, h, y0, rad, bev, mat) => {
    const s = new THREE.Shape(), hw = w / 2 - bev, hd = d / 2 - bev;
    s.moveTo(-hw + rad, -hd); s.lineTo(hw - rad, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + rad); s.lineTo(hw, hd - rad); s.quadraticCurveTo(hw, hd, hw - rad, hd); s.lineTo(-hw + rad, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - rad); s.lineTo(-hw, -hd + rad); s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0 + bev, 0);
    return add(g, mat);
  };
  slab(4.34, 4.34, .32, -1.5, .1, .05, woodMat(0, .62));
  slab(4.0, 4.0, 1.1, -1.2, .07, .03, woodMat(.02, .1));
  slab(4.22, 4.22, .14, -.14, .1, .045, woodMat(-.03, .35));
  { const e = add(new THREE.CylinderGeometry(.2, .22, .05, 40), M.brass); e.rotation.z = -Math.PI / 2; e.position.set(2.02, -.62, .5); }

  /* ---- ターンテーブルとレコード ---- */
  const C = [-.25, 0, .15], PV = [1.5, .56, -1.5], LA = 2.12, RN_REST = 2.07, RN_OUT = 1.42, OM = 8.17, STEP = OM / 7;
  const spin = new THREE.Group(); spin.position.set(C[0], 0, C[2]); scene.add(spin);
  add(new THREE.CylinderGeometry(1.58, 1.58, .1, 96), M.steel, spin).position.y = .06;
  { const f = add(new THREE.CircleGeometry(1.56, 96), M.felt, spin, false, true); f.rotation.x = -Math.PI / 2; f.position.y = .1115; }
  const disc = new THREE.Group(); disc.position.x = .012; spin.add(disc);
  add(new THREE.CylinderGeometry(1.5, 1.5, .03, 128), M.dark, disc).position.y = .1285;
  { const t = add(new THREE.CircleGeometry(1.5, 160), M.vinyl, disc, false, true); t.rotation.x = -Math.PI / 2; t.position.y = .1445;
    const l = add(new THREE.CircleGeometry(.53, 72), M.label, disc, false, true); l.rotation.x = -Math.PI / 2; l.position.y = .1462; }
  add(new THREE.CylinderGeometry(.045, .045, .16, 20), M.steel, spin).position.y = .2;
  add(new THREE.SphereGeometry(.045, 16, 8, 0, TAU, 0, Math.PI / 2), M.steel, spin).position.y = .28;

  /* ---- 支柱・アーム・サウンドボックス・針 ---- */
  add(new THREE.CylinderGeometry(.3, .33, .07, 48), M.steel).position.set(PV[0], .035, PV[2]);
  add(new THREE.CylinderGeometry(.13, .15, .5, 32), M.steel).position.set(PV[0], .3, PV[2]);
  add(new THREE.CylinderGeometry(.18, .18, .22, 40), M.steel).position.set(PV[0], .58, PV[2]);
  add(new THREE.CylinderGeometry(.16, .19, .16, 40), M.brass).position.set(PV[0], .76, PV[2]);
  const yaw = new THREE.Group(); yaw.position.set(PV[0], PV[1], PV[2]); scene.add(yaw);
  const tilt = new THREE.Group(); yaw.add(tilt);
  {
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(.1, 0, 0), new THREE.Vector3(.55, .07, 0), new THREE.Vector3(1.3, .05, 0), new THREE.Vector3(LA - .33, -.07, 0), new THREE.Vector3(LA - .29, -.1, 0)]);
    add(new THREE.TubeGeometry(path, 48, .068, 20, false), M.steel, tilt);
    add(new THREE.SphereGeometry(.085, 20, 12), M.steel, tilt).position.set(LA - .3, -.1, 0);
    const box = new THREE.Group(); box.position.set(LA, -.11, 0); tilt.add(box);
    const body = add(new THREE.CylinderGeometry(.3, .3, .13, 56), M.steel, box); body.rotation.x = Math.PI / 2;
    [1, -1].forEach(s => {
      const d = add(new THREE.CircleGeometry(.245, 48), M.mica, box, false, true); d.position.z = .0665 * s; if (s < 0) d.rotation.y = Math.PI;
      add(new THREE.TorusGeometry(.275, .028, 12, 56), M.steel, box).position.z = .065 * s;
      add(new THREE.SphereGeometry(.03, 12, 8), M.steel, box).position.z = .07 * s;
    });
    add(new THREE.CylinderGeometry(.03, .022, .1, 12), M.steel, box).position.y = -.3;
    const n = add(new THREE.ConeGeometry(.014, .1, 10), M.steel, box); n.rotation.x = Math.PI; n.position.y = -.25 - .1;
  }
  const needleAt = r => { // 支点からアーム長、中心から r の点（手前側）
    const dx = C[0] - PV[0], dz = C[2] - PV[2], D = Math.hypot(dx, dz), al = Math.acos(Math.max(-1, Math.min(1, (LA * LA + D * D - r * r) / (2 * LA * D)))), b0 = Math.atan2(dz, dx);
    const a1 = b0 + al, a2 = b0 - al; return Math.sin(a1) > Math.sin(a2) ? a1 : a2;
  };
  { const a = needleAt(RN_REST), p = add(new THREE.CylinderGeometry(.05, .06, .2, 16), M.steel); p.position.set(PV[0] + (LA - .02) * Math.cos(a), .1, PV[2] + (LA - .02) * Math.sin(a));
    const c = add(new THREE.CylinderGeometry(.09, .05, .04, 16), M.steel); c.position.set(p.position.x, .21, p.position.z); }

  /* ---- ラッパ（曲がった芯に沿う薄い殻。外・内・巻き縁） ---- */
  {
    const B = [[1.5, .8, -1.5], [1.5, 2.9, -1.85], [.75, 3.65, -.95], [-.55, 3.3, 1.0]];
    const bz = t => { const s = 1 - t; return [0, 1, 2].map(k => s * s * s * B[0][k] + 3 * s * s * t * B[1][k] + 3 * s * t * t * B[2][k] + t * t * t * B[3][k]); };
    const dbz = t => { const s = 1 - t; return [0, 1, 2].map(k => 3 * s * s * (B[1][k] - B[0][k]) + 6 * s * t * (B[2][k] - B[1][k]) + 3 * t * t * (B[3][k] - B[2][k])); };
    const rad = t => .11 + 1.5 * (Math.exp(3.4 * t) - 1) / (Math.exp(3.4) - 1);
    const V = THREE.Vector3, NS = 120, NA = 128, th = .016;
    const shell = (off, inner) => {
      const pos = [], col = [], idx = [];
      let e1 = null;
      for (let i = 0; i <= NS; i++) {
        const t = i / NS, c = new V(...bz(t)), T = new V(...dbz(t)).normalize();
        e1 = (e1 ? e1.clone().sub(T.clone().multiplyScalar(e1.dot(T))) : new V(1, 0, 0).sub(T.clone().multiplyScalar(T.x))).normalize(); // ねじれない基準
        const e2 = new V().crossVectors(T, e1), r0 = rad(t) - off;
        for (let j = 0; j < NA; j++) {
          const an = j * TAU / NA, r = r0 * (1 - .013 * sm(.25, 1, t) * Math.pow(Math.abs(Math.cos(an * 4)), 5));
          const p = c.clone().addScaledVector(e1, Math.cos(an) * r).addScaledVector(e2, Math.sin(an) * r);
          pos.push(p.x, p.y, p.z); const k = inner ? .04 + .96 * Math.pow(sm(.3, 1, t), 1.7) : 1; col.push(k, k, k);
        }
      }
      for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, b = i * NA + (j + 1) % NA, c = a + NA, d = b + NA; inner ? idx.push(a, c, b, b, c, d) : idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    add(shell(0, false), M.brass, scene, true, true);
    add(shell(th, true), M.brassIn, scene, false, false);
    const c = new V(...bz(1)), T = new V(...dbz(1)).normalize(), rim = add(new THREE.TorusGeometry(rad(1) - th / 2, .034, 14, 160), M.brass);
    rim.position.copy(c); rim.quaternion.setFromUnitVectors(new V(0, 0, 1), T);
  }

  /* ---- クランク ---- */
  { const s = add(new THREE.CylinderGeometry(.055, .055, .5, 16), M.steel); s.rotation.z = Math.PI / 2; s.position.set(2.25, -.62, .5); }
  const crankG = new THREE.Group(); crankG.position.set(2.5, -.62, .5); scene.add(crankG);
  {
    add(new THREE.SphereGeometry(.085, 16, 12), M.steel, crankG);
    add(new THREE.CylinderGeometry(.045, .045, .56, 14), M.steel, crankG).position.y = .28;
    add(new THREE.SphereGeometry(.07, 16, 12), M.steel, crankG).position.y = .56;
    const k = add(new THREE.CapsuleGeometry(.095, .34, 6, 20), M.knob, crankG); k.rotation.z = Math.PI / 2; k.position.set(.3, .56, 0);
  }

  /* ---- 照明：キーライト1灯＋弱いリムライト ---- */
  const key = new THREE.DirectionalLight(0xfff0dc, 3.1); key.position.set(-5.5, 9, 6.5); key.target.position.set(0, .6, 0);
  key.castShadow = true; key.shadow.mapSize.set(small() ? 1024 : 2048, small() ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 7, bottom: -5, near: 2, far: 30 }); key.shadow.bias = -.0004; key.shadow.normalBias = .025;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xc4d0ff, 2.4); rim.position.set(7, 5.5, -6); scene.add(rim);

  /* ---- 状態 ---- */
  let W = 0, H = 0, vis = false, raf = 0, last = 0, T = 0;
  let th = 0, om = 0, crank = .5, mode = "idle", tM = 0, rn = RN_REST, lift = 1, rn0 = RN_REST, lift0 = 1, crank0 = 0, rnL = 0, drooped = false;
  let mel = null, melI = 0, melA = 0;
  let camK = 0, px = 0, py = 0, pxT = 0, pyT = 0;

  const place = () => {
    spin.rotation.y = -th;
    const wob = lift < .05 ? .012 * Math.sin(th) : 0;
    yaw.rotation.y = -needleAt(rn + wob);
    tilt.rotation.z = .145 * lift + (lift < .05 ? .0025 * Math.sin(th * 2) : 0);
    crankG.rotation.x = -crank;
    const asp = W / Math.max(1, H), fit = Math.max(1, 1.04 / asp), k = (1 - .055 * camK) * fit;
    const sway = camK * .1 * Math.sin(T * .42), ya = px * .05 + sway * .03, pt = py * .025;
    const bx = 3.3, by = 2.7, bz = 13.4, ca = Math.cos(ya), sa = Math.sin(ya);
    cam.position.set((bx * ca + bz * sa) * k + .15, 1.5 + (by + pt * 10) * k, (bz * ca - bx * sa) * k);
    cam.lookAt(.15, 1.5 - .08 * camK, 0);
  };
  const render = () => { if (!W) return; place(); renderer.render(scene, cam); };
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    W = w; H = h; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };

  const finish = () => { mode = "end"; tM = 0; rnL = 0; mel = null; drooped = false; };
  const step = dt => {
    T += dt; tM += dt; let omT = 0, ta = .7, camT = 0;
    if (mode === "start") {
      const pc = crank; crank = crank0 + TAU * 1.75 * ez(tM / .85);
      if (Math.floor(crank / (TAU / 6)) > Math.floor(pc / (TAU / 6))) A.tick();
      omT = tM > .2 ? OM : 0; ta = .4; camT = 1;
      lift = tM < .46 ? Math.min(1, lift0 + tM / .1) : 1 - ez((tM - .46) / .16);
      rn = rn0 + (RN_OUT - rn0) * ez((tM - .08) / .38);
      if (tM >= .64) { mode = "play"; tM = 0; lift = 0; melA = STEP * .4; A.crackle(true); }
    } else if (mode === "play") {
      omT = OM; ta = .4; camT = 1;
      rn = Math.max(.72, rn - .07 / OM * om * dt);                    // 針は回った分だけ内へ進む
      if (mel) { melA += om * dt; while (melA >= STEP && melI < mel.length) { melA -= STEP; mel[melI++].forEach(i => A.voice(i, .9, om / OM)); } } // 旋律は盤の回転で進む
      if (tM > 6) finish();
    } else if (mode === "end") {
      omT = tM > .75 ? 0 : OM; ta = .75; camT = tM < 1.2 ? 1 : 0;
      if (tM > .75 && !drooped) { drooped = true; A.droop(1.5); }      // 盤が遅くなると音程も下がる
      if (tM < 1.45) rn = Math.max(.72, rn - .07 / OM * om * dt);
      else { if (!rnL) { rnL = rn; A.crackle(false); } lift = ez((tM - 1.45) / .22); rn = rnL + (RN_REST - rnL) * ez((tM - 1.65) / .95); }
      if (tM > 2.7 && om < .1) { om = 0; lift = 1; rn = RN_REST; mode = "idle"; }
    }
    A.guard();
    om += (omT - om) * (1 - Math.exp(-dt / ta)); th += om * dt;
    camK += (camT - camK) * (1 - Math.exp(-dt / 1.1)); if (mode === "idle" && camK < .004) camK = 0;
    px += (pxT - px) * (1 - Math.exp(-dt / .25)); py += (pyT - py) * (1 - Math.exp(-dt / .25));
  };
  const moving = () => mode !== "idle" || camK > 0 || Math.abs(pxT - px) > .003 || Math.abs(pyT - py) > .003;
  const frame = t => {
    raf = 0; if (!vis || calm()) return;
    const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    step(dt); render();
    if (moving()) raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && vis && !calm() && moving()) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  size(); render();
  if (window.ResizeObserver) new ResizeObserver(() => { size(); render(); }).observe(canvas); else window.addEventListener("resize", () => { size(); render(); });
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { if (!W) size(); render(); run(); } else A.crackle(false); }, { rootMargin: "80px" }).observe(canvas);
  if (window.matchMedia && matchMedia("(hover: hover)").matches) {
    host.addEventListener("pointermove", ev => { if (calm()) return; const r = canvas.getBoundingClientRect(); pxT = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - .5) * 2)); pyT = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - .5) * 2)); run(); });
    host.addEventListener("pointerleave", () => { pxT = 0; pyT = 0; run(); });
  }
  canvas.addEventListener("webglcontextrestored", () => { size(); render(); });

  return {
    play(key) {
      if (calm()) { render(); return; }             // 動きなし：静止画のまま
      mel = compose(hash(key)); melI = 0; melA = 0;
      rn0 = rn; lift0 = lift; crank0 = crank; mode = "start"; tM = 0;
      if (lift0 < .5) A.crackle(false); run();
    },
    chime() {
      if (calm() || mode === "idle" || mode === "end") return;
      if (mode === "start") { lift = 0; A.crackle(true); }
      [2, 5, 7, 10, 12].forEach((i, n) => setTimeout(() => A.voice(i, 1, 1), n * 110));
      finish(); run();
    }
  };
}
