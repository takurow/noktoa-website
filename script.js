/* ================================================
   NOKTOA HP — Main Script
   ================================================ */

/* ── 1. YouTube IFrame API ── */
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
                if (
                    e.data === YT.PlayerState.PAUSED ||
                    e.data === YT.PlayerState.ENDED ||
                    e.data === YT.PlayerState.UNSTARTED
                ) {
                    setTimeout(() => {
                        if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
                            ytPlayer.playVideo();
                        }
                    }, 300);
                }
            }
        }
    });
};


/* ── 2. DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {

    /* ── Smooth Scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* ── Fade-in IntersectionObserver ── */
    const fadeObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    document.querySelectorAll('.fade-in-up:not(.hero-content)').forEach(el => fadeObs.observe(el));

    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('active');
    }, 150);

    /* ── Service Card Spotlight ── */
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });

    /* ── Vision reveal-line (IntersectionObserver, 一方向) ── */
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    document.querySelectorAll('.reveal-line, .vision-intro').forEach(el => revealObs.observe(el));

    /* ── Header ── */
    const header = document.querySelector('.header');

    /* ────────────────────────────────────────────────────────
       Storytelling Scroll Animation
       rAF ループで常時監視（iOS Safariのスクロールイベント
       遅延・欠落に対応するため scroll イベントに依存しない）
    ──────────────────────────────────────────────────────── */
    const storyContainer = document.querySelector('.story-scroll-container');
    const storyTexts = Array.from(document.querySelectorAll('.story-text'));
    const N = storyTexts.length;

    // キャッシュ（不要な書き込みを防ぐ）
    let lastScrollY = -1;

    function easeOut(t) { return 1 - (1 - t) * (1 - t); }
    function easeIn(t) { return t * t; }

    function updateStory() {
        const scrollY = window.scrollY || window.pageYOffset;

        // ── ヘッダー ──
        if (header) {
            header.style.background = scrollY > 50
                ? 'rgba(9, 9, 11, 0.88)'
                : 'rgba(9, 9, 11, 0.6)';
            header.style.borderBottomColor = scrollY > 50
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(255,255,255,0.08)';
        }

        // ── ストーリーテキスト ──
        if (!storyContainer || N === 0) return;

        const rect = storyContainer.getBoundingClientRect();
        const wh = window.innerHeight;
        const scrollableH = rect.height - wh;
        if (scrollableH <= 0) return;

        const progress = Math.max(0, Math.min(1, (-rect.top) / scrollableH));
        const seg = 1 / N;

        storyTexts.forEach((text, i) => {
            const segStart = i * seg;
            const segEnd = segStart + seg;
            const isLast = (i === N - 1);

            let opacity = 0;
            let ty = 30;

            if (progress < segStart) {
                // まだ来ていない
                opacity = 0;
                ty = 30;
            } else if (progress <= segEnd) {
                const lp = (progress - segStart) / seg; // 0→1

                if (lp < 0.3) {
                    // フェードイン
                    const t = lp / 0.3;
                    opacity = easeOut(t);
                    ty = 28 * (1 - easeOut(t));
                } else if (!isLast && lp > 0.72) {
                    // フェードアウト（最後のテキスト以外）
                    const t = (lp - 0.72) / 0.28;
                    opacity = 1 - easeIn(t);
                    ty = -28 * easeIn(t);
                } else {
                    opacity = 1;
                    ty = 0;
                }
            } else {
                // セグメントを過ぎた後
                if (isLast) {
                    opacity = 1;
                    ty = 0;
                } else {
                    opacity = 0;
                    ty = -28;
                }
            }

            text.style.opacity = opacity.toFixed(3);
            text.style.transform = `translateY(${ty.toFixed(1)}px)`;
        });
    }

    /* rAF ループ — スクロール位置が変化したときだけ計算 */
    function rafLoop() {
        const sy = window.scrollY || window.pageYOffset;
        if (sy !== lastScrollY) {
            lastScrollY = sy;
            updateStory();
        }
        requestAnimationFrame(rafLoop);
    }

    // ページロード完了後に開始（レイアウト確定を待つ）
    if (document.readyState === 'complete') {
        rafLoop();
    } else {
        window.addEventListener('load', rafLoop);
    }

    // スクロールイベントでも補完（即時反応のため）
    window.addEventListener('scroll', updateStory, { passive: true });
    window.addEventListener('touchmove', updateStory, { passive: true });
    window.addEventListener('touchend', updateStory, { passive: true });

    // 初回実行（初期位置での計算）
    setTimeout(updateStory, 200);
    setTimeout(updateStory, 600);
    setTimeout(updateStory, 1200);
});
