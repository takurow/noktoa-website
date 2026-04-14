/* ================================================
   NOKTOA HP — Main Script
   ================================================ */

/* ── 1. YouTube 動画の常時再生 ──────────────────────
   postMessage で 4秒ごとに再生命令を送る
   (IFrame API不要・モバイル含む全ブラウザ対応)
──────────────────────────────────────────────────── */
function keepVideoPlaying() {
    const iframe = document.getElementById('hero-video');
    if (!iframe) return;

    function sendPlay() {
        try {
            iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                '*'
            );
        } catch (e) { /* cross-origin block は無視 */ }
    }

    // ページ読み込み後すぐ＋定期的に再生命令
    setTimeout(sendPlay, 1000);
    setTimeout(sendPlay, 2500);
    setInterval(sendPlay, 4000);
}

/* ── 2. DOM Ready ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

    keepVideoPlaying();

    /* ── Smooth Scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* ── Fade-in (IntersectionObserver) ── */
    var fadeObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    document.querySelectorAll('.fade-in-up:not(.hero-content)').forEach(function (el) {
        fadeObs.observe(el);
    });

    setTimeout(function () {
        var hero = document.querySelector('.hero-content');
        if (hero) hero.classList.add('active');
    }, 150);

    /* ── Service Card Spotlight ── */
    document.querySelectorAll('.service-card').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
        });
    });

    /* ── Vision reveal-line ── */
    var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    document.querySelectorAll('.reveal-line, .vision-intro').forEach(function (el) {
        revealObs.observe(el);
    });

    /* ────────────────────────────────────────────────
       Storytelling Scroll Animation
       rAF ループで常時監視 (モバイル Chrome / iOS Safari 対応)
    ──────────────────────────────────────────────── */
    var header = document.querySelector('.header');
    var storyContainer = document.querySelector('.story-scroll-container');
    var storyTexts = Array.from(document.querySelectorAll('.story-text'));
    var N = storyTexts.length;

    function easeOut(t) { return 1 - (1 - t) * (1 - t); }
    function easeIn(t) { return t * t; }

    function updateAll() {
        var scrollY = window.pageYOffset !== undefined ? window.pageYOffset : window.scrollY;

        /* ヘッダー */
        if (header) {
            header.style.background = scrollY > 50
                ? 'rgba(9,9,11,0.88)' : 'rgba(9,9,11,0.6)';
            header.style.borderBottomColor = scrollY > 50
                ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
        }

        /* ストーリーテキスト */
        if (!storyContainer || N === 0) return;

        var rect = storyContainer.getBoundingClientRect();
        var wh = window.innerHeight;
        var scrollableH = rect.height - wh;
        if (scrollableH <= 0) return;

        var progress = Math.max(0, Math.min(1, (-rect.top) / scrollableH));
        var seg = 1 / N;

        for (var i = 0; i < N; i++) {
            var text = storyTexts[i];
            var segStart = i * seg;
            var segEnd = segStart + seg;
            var isLast = (i === N - 1);
            var opacity = 0;
            var ty = 30;

            if (progress < segStart) {
                opacity = 0; ty = 30;
            } else if (progress <= segEnd) {
                var lp = (progress - segStart) / seg;
                if (lp < 0.3) {
                    var t = lp / 0.3;
                    opacity = easeOut(t);
                    ty = 28 * (1 - easeOut(t));
                } else if (!isLast && lp > 0.72) {
                    var t2 = (lp - 0.72) / 0.28;
                    opacity = 1 - easeIn(t2);
                    ty = -28 * easeIn(t2);
                } else {
                    opacity = 1; ty = 0;
                }
            } else {
                if (isLast) { opacity = 1; ty = 0; }
                else { opacity = 0; ty = -28; }
            }

            text.style.opacity = opacity.toFixed(3);
            text.style.transform = 'translateY(' + ty.toFixed(1) + 'px)';
        }
    }

    /* rAF ループ — スクロールに関係なく毎フレーム監視 */
    var lastY = -1;
    function rafLoop() {
        var y = window.pageYOffset !== undefined ? window.pageYOffset : window.scrollY;
        if (y !== lastY) {
            lastY = y;
            updateAll();
        }
        requestAnimationFrame(rafLoop);
    }

    /* スクロールイベントでも補完（即時反応） */
    window.addEventListener('scroll', updateAll, { passive: true });
    window.addEventListener('touchmove', updateAll, { passive: true });
    window.addEventListener('touchend', updateAll, { passive: true });

    /* 起動 — DOMContentLoaded 内なのですぐ開始 */
    rafLoop();
    updateAll();

    /* load後にも再計算（画像読み込みによるレイアウト変動対応） */
    window.addEventListener('load', function () {
        updateAll();
        setTimeout(updateAll, 300);
    });
});
