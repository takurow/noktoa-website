/* CHILLCAT HP — 「Pick a record」の効果音。WebAudio の合成だけで作る（音源ファイルなし）。
   方針：少なく・短く・小さく。旋律に頼らず、低域の質感と整形したノイズで聴かせる。 */
export function makeSfx(ctx) {
  const sr = ctx.sampleRate;
  const rng = (seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(7);
  const hash = k => { let h = 2166136261; for (const c of String(k)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* 出口：全体を小さめにまとめ、最後に軽く抑える */
  const out = ctx.createGain(); out.gain.value = .42;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .22;
  out.connect(comp).connect(ctx.destination);

  /* 残響：短い自作インパルス（減衰するノイズ。後ろほど高域を落とす） */
  const conv = ctx.createConvolver(), wet = ctx.createGain();
  {
    const n = Math.floor(sr * 1.3), ir = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr; lp += ((rng() * 2 - 1) - lp) * (.6 - .42 * Math.min(1, t / .9)); d[i] = lp * Math.exp(-t / .3) * (1 - Math.exp(-t / .003)); } }
    conv.normalize = true; conv.buffer = ir; wet.gain.value = .55; conv.connect(wet).connect(out);
  }

  /* ノイズの素（白・ピンク）と、まばらな微小クラックル */
  const white = ctx.createBuffer(1, sr * 2, sr), pink = ctx.createBuffer(1, sr * 2, sr), dust = ctx.createBuffer(1, sr * 3, sr);
  {
    const w = white.getChannelData(0), p = pink.getChannelData(0), d = dust.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < w.length; i++) { const x = rng() * 2 - 1; w[i] = x; b0 = .99765 * b0 + x * .099046; b1 = .963 * b1 + x * .2965164; b2 = .57 * b2 + x * 1.0526913; p[i] = (b0 + b1 + b2 + x * .1848) * .2; }
    for (let k = 0; k < 26; k++) { const at = Math.floor(rng() * (d.length - 200)), amp = .2 + rng() * .8, len = 8 + Math.floor(rng() * 40); for (let i = 0; i < len; i++) d[at + i] += (rng() * 2 - 1) * amp * Math.pow(1 - i / len, 3); }
    const fade = Math.floor(sr * .01);   // ループの継ぎ目でプチッと鳴らないよう、端を丸める
    [w, p].forEach(a => { for (let i = 0; i < fade; i++) { const k = i / fade; a[i] *= k; a[a.length - 1 - i] *= k; } });
  }

  let seq = 0;
  const now = () => ctx.currentTime + .006;
  const shape = (p, t, a, peak, d) => { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(Math.max(1e-5, peak * .002), t + a + d); p.linearRampToValueAtTime(0, t + a + d + .014); };
  const route = (node, o) => {
    let x = node;
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; x.connect(p); x = p; }
    x.connect(out);
    if (o.rev) { const g = ctx.createGain(); g.gain.value = o.rev; x.connect(g).connect(conv); }
  };
  const tone = (t, o) => { // 正弦波などの短い音。f→f1 へ音程を滑らせられる
    const s = ctx.createOscillator(), g = ctx.createGain(), a = o.a || .004;
    s.type = o.type || "sine"; s.frequency.setValueAtTime(o.f, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + (o.ft || o.d));
    if (o.det) s.detune.value = o.det;
    shape(g.gain, t, a, o.peak, o.d); s.connect(g); route(g, o); s.start(t); s.stop(t + a + o.d + .03);
  };
  const hiss = (t, o) => { // 帯域を絞ったノイズ。フィルターの位置を動かせる
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), a = o.a || .001;
    s.buffer = o.pink ? pink : white; s.loop = true;
    f.type = o.type || "bandpass"; f.Q.value = o.q || .8; f.frequency.setValueAtTime(o.f, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.ft || o.d)); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + o.d);
    shape(g.gain, t, a, o.peak, o.d); s.connect(f).connect(g); route(g, o);
    s.start(t, (seq++ * .173) % 1.6); s.stop(t + a + o.d + .03);
  };
  const root = key => [146.83, 164.81, 174.61, 196, 220][hash(key) % 5];   // 作品ごとに決まる、低い基音

  let bed = null;
  const bedOff = (sec = .6) => { if (!bed) return; const [srcs, g] = bed, t = ctx.currentTime; bed = null; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + sec); srcs.forEach(s => s.stop(t + sec + .05)); };

  return {
    out, rate: sr,
    /* 押した瞬間：低い「トッ」と、指先の小さな接触音 */
    press(t = now()) { tone(t, { f: 152, f1: 60, ft: .07, peak: .3, d: .12, rev: .12 }); tone(t, { f: 420, f1: 240, ft: .03, peak: .09, d: .04 }); hiss(t, { f: 2300, q: 1.3, peak: .5, d: .02, rev: .1 }); },
    /* 回り出す：聞こえるか聞こえないかの低いうねりが立ち上がる */
    wind(t = now()) { tone(t, { f: 40, f1: 53, ft: .9, a: .42, peak: .085, d: 1.0 }); hiss(t, { pink: true, type: "bandpass", f: 240, f1: 900, ft: 1.0, q: .7, a: .5, peak: .16, d: .8 }); },
    /* クランクの爪 */
    ratchet(t = now()) { hiss(t, { type: "bandpass", f: 3400, q: 1.1, a: .0008, peak: .75, d: .014 }); tone(t, { type: "triangle", f: 1120, a: .001, peak: .04, d: .018 }); },
    /* 盤をめくる：紙が空気を切る短い音。遅くなるほど余韻が増える */
    flick(i, n, t = now()) { const k = n > 1 ? i / (n - 1) : 1; hiss(t, { f: 1500 + 900 * k, q: 1.2, peak: .8 + .5 * k, d: .03, pan: (i % 2 ? .3 : -.3) * (1 - k), rev: .1 + .3 * k }); tone(t, { f: 205 - 35 * k, f1: 120, ft: .03, a: .002, peak: .035, d: .034 }); },
    /* この一枚に決まる：低い二音を、柔らかく一度だけ */
    select(key, t = now()) { const f = root(key); tone(t, { f, a: .006, peak: .13, d: 1.0, rev: .5 }); tone(t, { f: f * 1.5, a: .008, peak: .07, d: .8, rev: .5 }); tone(t, { f: f * 3, a: .006, peak: .028, d: .35, rev: .5 }); hiss(t, { f: f * 8, q: 2.5, peak: .12, d: .09, rev: .4 }); },
    /* 盤が運ばれる：空気の動き */
    whoosh(dur = .62, t = now()) { hiss(t, { pink: true, f: 420, f1: 1800, ft: dur * .55, f2: 760, q: .9, a: dur * .5, peak: .19, d: dur * .5, rev: .2 }); },
    /* 盤が台に乗る */
    land(t = now()) { tone(t, { f: 92, f1: 57, ft: .06, peak: .24, d: .1, rev: .1 }); tone(t, { f: 310, f1: 190, ft: .03, a: .002, peak: .06, d: .04 }); hiss(t, { type: "bandpass", f: 1100, q: .8, peak: .4, d: .028, rev: .12 }); },
    /* 針が降りる：接触の点と、胸に来る低い一打。そのあと、ごく薄い盤面の音が続く */
    needle(t = now()) {
      hiss(t, { type: "bandpass", f: 3600, q: .9, a: .0006, peak: .8, d: .012, rev: .12 });
      tone(t, { f: 64, f1: 43, ft: .12, a: .003, peak: .36, d: .22, rev: .18 }); tone(t, { f: 260, f1: 130, ft: .04, a: .002, peak: .07, d: .06 });
      bedOff(.05);
      const g = ctx.createGain(), s1 = ctx.createBufferSource(), s2 = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), h2 = ctx.createBiquadFilter(), g2 = ctx.createGain();
      s1.buffer = pink; s1.loop = true; hp.type = "highpass"; hp.frequency.value = 520; lp.type = "lowpass"; lp.frequency.value = 3600;
      s2.buffer = dust; s2.loop = true; h2.type = "highpass"; h2.frequency.value = 1700; g2.gain.value = .9;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.055, t + .3);
      s1.connect(hp).connect(lp).connect(g); s2.connect(h2).connect(g2).connect(g); g.connect(out);
      s1.start(t + .02); s2.start(t + .02); bed = [[s1, s2], g];
    },
    /* 結果が出る：基音と倍音を、ゆっくり立ち上げて長く引く（旋律にはしない） */
    result(key, t = now()) {
      const f = root(key);
      tone(t, { f, a: .09, peak: .1, d: 1.9, rev: .6 }); tone(t, { f: f * 2, det: 6, a: .1, peak: .055, d: 1.6, rev: .6, pan: -.4 }); tone(t, { f: f * 2, det: -6, a: .1, peak: .055, d: 1.6, rev: .6, pan: .4 });
      tone(t, { f: f * 4, a: .12, peak: .016, d: 1.1, rev: .6 }); tone(t, { f: f / 2, a: .03, peak: .07, d: .5 }); hiss(t, { pink: true, f: f * 8, q: 1.5, a: .12, peak: .05, d: .7, rev: .5 });
    },
    /* 止まる：盤面の音が消え、低い音がゆっくり沈む */
    stop(t = now()) { bedOff(.7); tone(t, { f: 70, f1: 36, ft: .7, a: .05, peak: .07, d: .8 }); hiss(t, { pink: true, type: "bandpass", f: 900, f1: 160, ft: .7, q: .7, a: .05, peak: .14, d: .7 }); },
    lift() { bedOff(.18); },
    silence() { bedOff(.08); }
  };
}
