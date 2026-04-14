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
       Storytelling: IntersectionObserver で確実に発火
       スクロール計算なし・全ブラウザ・モバイル対応
    ──────────────────────────────────────────────── */
    var header = document.querySelector('.header');

    /* ヘッダー背景 */
    function updateHeader() {
        if (!header) return;
        var scrollY = window.pageYOffset || window.scrollY;
        header.style.background = scrollY > 50 ? 'rgba(9,9,11,0.88)' : 'rgba(9,9,11,0.6)';
        header.style.borderBottomColor = scrollY > 50 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
    }
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    /* story-line を IntersectionObserver で表示 */
    var storyObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                storyObs.unobserve(entry.target); // 一度表示したら監視終了
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -15% 0px', // 画面下15%に入ったら発火
        threshold: 0.1
    });

    document.querySelectorAll('.story-line').forEach(function (el) {
        storyObs.observe(el);
    });
});
