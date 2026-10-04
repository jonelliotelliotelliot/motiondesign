// About page easter egg: a small dot in the circle's colour wanders the
// window. It travels somewhere at random along a curving, slightly wobbly
// path, stops there for a few seconds drifting a little, then moves on; it
// pulses gently all the while (CSS). Hovering it stops it and grows it a
// little. Click it and the character pops up there in its orange circle,
// playing from a random point in the video, until the mouse leaves the
// circle. On touch screens, where there's no mouse to leave, the next tap
// sends it away. Pops with back.out, leaves with back.in (GSAP, loaded in
// about.html). The dot hides while the character is up and carries on after.
//
// Styles under .about-egg and .about-dot in style.css.
document.addEventListener('DOMContentLoaded', () => {
    const egg = document.querySelector('.about-egg');
    if (!egg || !window.gsap) return;
    const video = egg.querySelector('video');
    const touch = window.matchMedia('(hover: none)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let shown = false;

    gsap.set(egg, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });

    // ---------- the character ----------
    const show = (x, y) => {
        // centred on the click, but kept inside the window
        const r = egg.offsetWidth / 2, m = 8;
        x = Math.min(Math.max(x, r + m), window.innerWidth - r - m);
        y = Math.min(Math.max(y, r + m), window.innerHeight - r - m);
        shown = true;
        gsap.killTweensOf(egg);
        gsap.set(egg, { left: x, top: y });
        // somewhere in the loop at random (once the video knows its length)
        const seek = () => { video.currentTime = Math.random() * video.duration; };
        if (video.readyState >= 1) seek();
        else video.addEventListener('loadedmetadata', seek, { once: true });
        video.play().catch(() => {});
        gsap.to(egg, calm
            ? { scale: 1, autoAlpha: 1, duration: 0.15 }
            : { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.7)' });
        dotAway();
    };

    const hide = () => {
        if (!shown) return;
        shown = false;
        gsap.killTweensOf(egg);
        gsap.to(egg, {
            ...(calm
                ? { scale: 1, autoAlpha: 0, duration: 0.15 }
                : { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.in(1.7)' }),
            onComplete: () => { video.pause(); dotBack(); },
        });
    };

    // touch: the next tap anywhere (but a link) puts the character away
    document.addEventListener('click', (e) => {
        if (touch && shown && !e.target.closest('a, .about-dot')) hide();
    });
    egg.addEventListener('mouseleave', hide);
    // scrolling the page out from under a still mouse counts as leaving too
    window.addEventListener('scroll', () => { if (shown && !touch && !egg.matches(':hover')) hide(); }, { passive: true });

    // ---------- the dot ----------
    const dot = document.createElement('div');
    dot.className = 'about-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<span></span>';
    document.body.appendChild(dot);

    const rand = gsap.utils.random;
    // Where it may go: across, between the page's content edges (the same
    // lines as the nav and the text, so on a wide screen it stays off the
    // empty margins); down, the window, clear of the navbar at the top.
    const content = document.querySelector('.resume');
    const area = () => {
        const r = content.getBoundingClientRect();
        return {
            x0: Math.max(r.left, 40), x1: Math.min(r.right, window.innerWidth - 40),
            y0: 100, y1: window.innerHeight - 60,
        };
    };
    const spot = () => {
        const a = area();
        return { x: rand(a.x0, a.x1), y: rand(a.y0, a.y1) };
    };

    let journey = null;
    // One leg: travel to a new spot, then rest there, drifting a few px,
    // then the next leg. The path is a curve that bows out to either side
    // (two random bends), with a small wobble on top that dies away at both
    // ends, so the dot lands exactly where it was headed.
    const SPEED = 110;   // px a second, roughly
    const wander = () => {
        const p0 = { x: gsap.getProperty(dot, 'x'), y: gsap.getProperty(dot, 'y') };
        const p3 = spot();
        const dx = p3.x - p0.x, dy = p3.y - p0.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;            // across the line of travel
        const b1 = rand(-0.35, 0.35) * len, b2 = rand(-0.35, 0.35) * len;
        const p1 = { x: p0.x + dx / 3 + nx * b1, y: p0.y + dy / 3 + ny * b1 };
        const p2 = { x: p0.x + dx * 2 / 3 + nx * b2, y: p0.y + dy * 2 / 3 + ny * b2 };
        const wobble = rand(3, 7), waves = rand(1, 2.5), phase = rand(0, Math.PI * 2);
        const travel = gsap.utils.clamp(1.6, 6, len / SPEED);
        const rest = rand(2.5, 6);
        const go = { t: 0 };
        const box = area();      // the curve can bow outwards; it stays in here
        const keepIn = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
        journey = gsap.timeline({ onComplete: wander })
            .to(go, {
                t: 1, duration: travel, ease: 'sine.inOut',
                onUpdate: () => {
                    const t = go.t, u = 1 - t;
                    const w = Math.sin(t * Math.PI * 2 * waves + phase) * wobble * Math.sin(Math.PI * t);
                    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x + nx * w;
                    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y + ny * w;
                    gsap.set(dot, { x: keepIn(x, box.x0, box.x1), y: keepIn(y, box.y0, box.y1) });
                },
            })
            .to(dot, {
                x: keepIn(p3.x + rand(-6, 6), box.x0, box.x1),
                y: keepIn(p3.y + rand(-6, 6), box.y0, box.y1),
                duration: rest, ease: 'sine.inOut',
            });
    };

    const start = spot();
    gsap.set(dot, { x: start.x, y: start.y, autoAlpha: 0 });
    gsap.to(dot, { autoAlpha: 1, duration: 1, delay: 1.5 });
    // with reduced motion it stays put (and doesn't pulse; see style.css)
    if (!calm) wander();

    // hovering holds it still (style.css grows it); leaving lets it go on
    let hovered = false;
    dot.addEventListener('mouseenter', () => { hovered = true; if (journey) journey.pause(); });
    dot.addEventListener('mouseleave', () => { hovered = false; if (journey && !shown) journey.resume(); });
    dot.addEventListener('click', () => {
        const r = dot.getBoundingClientRect();
        show(r.left + r.width / 2, r.top + r.height / 2);
    });

    // out of the way while the character is up, then back where it was
    function dotAway() {
        if (journey) journey.pause();
        gsap.to(dot, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
    }
    function dotBack() {
        gsap.to(dot, { autoAlpha: 1, duration: 0.6, delay: 0.4, overwrite: 'auto' });
        if (journey && !hovered) journey.resume();
    }
});
