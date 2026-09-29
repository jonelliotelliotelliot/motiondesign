// About page: the speech bubble wanders near the character, and the emojis
// drift around the whole window. Uses GSAP (loaded in about.html). Both stay
// still for anyone who has asked their system for reduced motion.
document.addEventListener('DOMContentLoaded', () => {
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bubble = document.querySelector('.about-bubble');
    const wander = () => gsap.to(bubble, {
        x: gsap.utils.random(0, 300),
        y: gsap.utils.random(0, 300),
        duration: gsap.utils.random(2, 3),
        ease: 'power1.inOut',
        onComplete: wander,
    });
    if (bubble) wander();

    // each emoji drifts to a random spot in the window, then another, forever
    const emojis = document.querySelectorAll('.about-emojis .emoji');
    const drift = (emoji) => gsap.to(emoji, {
        x: gsap.utils.random(0, window.innerWidth),
        y: gsap.utils.random(0, window.innerHeight),
        duration: gsap.utils.random(4, 6),
        ease: 'power1.inOut',
        onComplete: drift,
        onCompleteParams: [emoji],
    });
    emojis.forEach((emoji) => {
        gsap.set(emoji, { x: gsap.utils.random(0, window.innerWidth), y: gsap.utils.random(0, window.innerHeight) });
        drift(emoji);
    });

    // after a resize, head somewhere inside the new window size
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => emojis.forEach((emoji) => {
            gsap.killTweensOf(emoji);
            drift(emoji);
        }), 250);
    });
});
