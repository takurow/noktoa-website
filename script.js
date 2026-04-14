/* ================================================
   NOKTOA HP — Main Script
   1. YouTube IFrame API: 確実な自動再生・ループ制御
   2. Storytelling scroll: 安定したテキスト表示
   3. IntersectionObserver: フェードイン
   ================================================ */

/* ── 1. YouTube IFrame API ──────────────────────
   onYouTubeIframeAPIReady はグローバルに定義する必要がある
   ──────────────────────────────────────────────── */
let ytPlayer = null;

window.onYouTubeIframeAPIReady = function () {
    ytPlayer = new YT.Player('hero-video-container', {
        videoId: '-uuhnRqTqQA',
        playerVars: {
            autoplay: 1,
            mute: 1,
            loop: 1,
            playlist: '-uuhnRqTqQA',
            controls: 0,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
        },
        events: {
            onReady: function (e) {
                e.target.mute();
                e.target.playVideo();
            },
            onStateChange: function (e) {
                // 停止・一時停止・終了を検知して再生を続ける
                if (
                    e.data === YT.PlayerState.PAUSED ||
                    e.data === YT.PlayerState.ENDED ||
                    e.data === YT.PlayerState.UNSTARTED
                ) {
                    setTimeout(() => {
                        if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
                            ytPlayer.playVideo();
                        }
                    }, 200);
                }
            },
            onError: function () {
                // エラー時は静かにフォールバック（背景のまま）
            }
        }
    });
};

// YouTube API が読み込まれる前に DOM の準備ができている場合のフォールバック
// （API が先に読み込まれてしまった場合も onYouTubeIframeAPIReady が呼ばれる）


/* ── 2. DOM Ready ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

    /* ── Smooth Scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ── Fade-in IntersectionObserver ── */
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.01
    });

    document.querySelectorAll('.fade-in-up:not(.hero-content)').forEach(el => observer.observe(el));

    // ヒーローコンテンツは即時アクティブ
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('active');
    }, 150);

    /* ── Service card spotlight ── */
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });

    /* ── Vision reveal-line: IntersectionObserver（一方向のみ） ── */
    const revealLineObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
    });

    document.querySelectorAll('.reveal-line, .vision-intro').forEach(el => {
        revealLineObs.observe(el);
    });

    /* ── Storytelling Scroll Animation ──────────────────────────
       方針:
       ・storyContainer の scrollProgress (0→1) をスムーズに計算
       ・各テキストを等分したセグメントで表示
       ・フェードイン: 0→0.3 (opacity 0→1)
       ・表示キープ: 0.3→0.7 (opacity 1)
       ・フェードアウト: 0.7→1.0 (opacity 1→0) ※最後のみずっと表示
       ・translateY: 入ってくる方向: 30px→0、出ていく方向: 0→-30px
    ────────────────────────────────────────────────────────────── */
    const storyContainer = document.querySelector('.story-scroll-container');
    const storyTexts = document.querySelectorAll('.story-text');
    const header = document.querySelector('.header');
    const numTexts = storyTexts.length;

    // 前回の値キャッシュ（不要な DOM 書き込みを防ぐ）
    const prevOpacity = new Array(numTexts).fill(-1);
    const prevTranslate = new Array(numTexts).fill(9999);

    let isTicking = false;

    function onScroll() {
        if (isTicking) return;
        isTicking = true;

        requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            const wh = window.innerHeight;

            // ── ヘッダー ──
            if (header) {
                header.style.background = scrollY > 50
                    ? 'rgba(9, 9, 11, 0.85)'
                    : 'rgba(9, 9, 11, 0.6)';
                header.style.borderBottomColor = scrollY > 50
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.08)';
            }

            // ── ストーリーテキスト ──
            if (storyContainer && numTexts > 0) {
                const rect = storyContainer.getBoundingClientRect();
                const containerH = rect.height;

                // progress: storyContainer が画面に入り始めてから出るまでを 0→1
                // ヒーロー(100vh)分のオフセットを考慮して sticky 部分のみ使う
                const scrollableH = containerH - wh;
                if (scrollableH <= 0) {
                    isTicking = false;
                    return;
                }

                let progress = (-rect.top) / scrollableH;
                progress = Math.max(0, Math.min(1, progress));

                const seg = 1 / numTexts;

                storyTexts.forEach((text, i) => {
                    const segStart = i * seg;
                    const segEnd = segStart + seg;

                    let opacity = 0;
                    let ty = 30; // 初期は下から

                    if (progress < segStart) {
                        // まだ出番前
                        opacity = 0;
                        ty = 30;
                    } else if (progress >= segStart && progress <= segEnd) {
                        const lp = (progress - segStart) / seg; // 0→1 within segment

                        // フェードイン: 0→0.25
                        // キープ: 0.25→0.75
                        // フェードアウト: 0.75→1.0 (最後は除く)
                        const fadeInEnd = 0.25;
                        const fadeOutStart = 0.75;
                        const isLast = (i === numTexts - 1);

                        if (lp < fadeInEnd) {
                            const t = lp / fadeInEnd;
                            opacity = easeOut(t);
                            ty = 30 * (1 - easeOut(t));
                        } else if (!isLast && lp > fadeOutStart) {
                            const t = (lp - fadeOutStart) / (1 - fadeOutStart);
                            opacity = 1 - easeIn(t);
                            ty = -30 * easeIn(t);
                        } else {
                            opacity = 1;
                            ty = 0;
                        }
                    } else {
                        // セグメント後
                        if (i === numTexts - 1) {
                            // 最後のテキストはそのまま表示し続ける
                            opacity = 1;
                            ty = 0;
                        } else {
                            opacity = 0;
                            ty = -30;
                        }
                    }

                    // 変化があった場合のみ書き込む（パフォーマンス最適化）
                    const opRounded = Math.round(opacity * 1000) / 1000;
                    const tyRounded = Math.round(ty * 10) / 10;
                    if (prevOpacity[i] !== opRounded) {
                        text.style.opacity = opRounded;
                        prevOpacity[i] = opRounded;
                    }
                    if (prevTranslate[i] !== tyRounded) {
                        text.style.transform = `translateY(${tyRounded}px)`;
                        prevTranslate[i] = tyRounded;
                    }
                });
            }

            isTicking = false;
        });
    }

    // イージング関数
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 2);
    }
    function easeIn(t) {
        return t * t;
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // 初回計算（ページ読み込み時）
    setTimeout(onScroll, 100);
    setTimeout(onScroll, 500); // 念のため二回目

});
