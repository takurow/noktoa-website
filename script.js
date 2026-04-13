document.addEventListener('DOMContentLoaded', () => {

    /* Smooth Scroll */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    /* Intersection Observer for Fade-In Animations */
    // Modified to trigger earlier and more reliably even when scrolling very slowly
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -5% 0px', // Trigger when 5% from bottom of screen
        threshold: 0.01 // Trigger as soon as 1% is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Unobserve to prevent firing again
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-up:not(.hero-content)'); // Excluding hero so it animates once initially without scroll wait
    fadeElements.forEach(el => observer.observe(el));

    // Initially trigger for elements already in view (Fallback)
    setTimeout(() => {
        fadeElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.classList.add('active');
            }
        });
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('active');
    }, 100);

    /* Enhanced 3D Spotlight effect for Service Cards */
    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Set CSS variables for spotlight effect
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    /* 
       --- HIGH PERFORMANCE BATCHED SCROLL LOOP ---
       Combine all scroll operations into a single loop to eliminate layout thrashing.
       Phase 1: Read all DOM metrics
       Phase 2: Write all DOM styles/classes
    */
    const header = document.querySelector('.header');
    const storyContainer = document.querySelector('.story-scroll-container');
    const storyTexts = document.querySelectorAll('.story-text');
    const revealLines = document.querySelectorAll('.reveal-line');

    let isTicking = false;

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                // --- PHASE 1: READS ---
                const currentScrollY = window.scrollY;
                const windowHeight = window.innerHeight;

                let storyRectTop = 0, storyRectHeight = 0;
                if (storyContainer) {
                    const rect = storyContainer.getBoundingClientRect();
                    storyRectTop = rect.top;
                    storyRectHeight = rect.height;
                }

                const revealLineRects = [];
                if (revealLines.length > 0) {
                    revealLines.forEach(line => {
                        revealLineRects.push(line.getBoundingClientRect().top);
                    });
                }

                // --- PHASE 2: WRITES ---

                // 1. Header Blur Effect
                if (header) {
                    if (currentScrollY > 50) {
                        header.style.background = 'rgba(9, 9, 11, 0.8)';
                        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                    } else {
                        header.style.background = 'rgba(9, 9, 11, 0.6)';
                        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
                    }
                }

                // 2. Storytelling Scroll Animation
                if (storyContainer && storyTexts.length > 0) {
                    let progress = -storyRectTop / (storyRectHeight - windowHeight);
                    progress = Math.max(0, Math.min(1, progress));

                    const numTexts = storyTexts.length;
                    const segment = 1 / numTexts;

                    storyTexts.forEach((text, index) => {
                        const start = index * segment;
                        const end = start + segment;

                        let opacity = 0;
                        let translateY = 50;

                        if (progress >= start && progress <= end) {
                            const localProgress = (progress - start) / segment;
                            translateY = 50 - (localProgress * 100);

                            if (localProgress < 0.25) {
                                opacity = localProgress / 0.25;
                            } else if (localProgress > 0.75) {
                                if (index === numTexts - 1) {
                                    opacity = 1;
                                } else {
                                    opacity = 1 - ((localProgress - 0.75) / 0.25);
                                }
                            } else {
                                opacity = 1;
                            }
                        } else if (progress > end && index === numTexts - 1) {
                            opacity = 1;
                            translateY = 50 - 100; // Final shifted up position
                        }

                        text.style.opacity = opacity.toFixed(3);
                        text.style.transform = `translateY(${translateY.toFixed(1)}px)`;
                    });
                }

                // 3. Scroll Reveal Text Lines
                if (revealLines.length > 0) {
                    const triggerPoint = windowHeight * 0.85;
                    revealLines.forEach((line, index) => {
                        if (revealLineRects[index] < triggerPoint) {
                            line.classList.add('revealed');
                        } else {
                            line.classList.remove('revealed');
                        }
                    });
                }

                isTicking = false;
            });
            isTicking = true;
        }
    }, { passive: true });

    // Trigger initial calculation
    setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
    }, 50);

});
