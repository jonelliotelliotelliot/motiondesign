document.addEventListener("DOMContentLoaded", () => {

    // The logo goes home from every page, except home itself, where it goes
    // to the page about its typeface (type/). initializeHeader sets the href.
    document.addEventListener('click', (event) => {
        const logoLink = event.target.closest('.header-image');
        if (logoLink) {
            event.preventDefault();
            window.location.href = logoLink.href;
        }
    });

    // "back to top" in the footer. A plain href="#" would leave pages in a
    // folder (type/, whose <base> is the site root) for the homepage.
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.footer-top')) return;
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Banner Showcase Logic ---
const bannerShowcases = document.querySelectorAll('[data-banner-src]');

bannerShowcases.forEach(showcase => {
    const bannerSrc = showcase.dataset.bannerSrc;
    const codeTargetId = showcase.dataset.codeTarget;
    const codeElement = document.getElementById(codeTargetId);

    if (bannerSrc && codeElement) {
        // Fetch the banner's HTML file as plain text
        fetch(bannerSrc)
            .then(response => response.text())
            .then(text => {
                // Display the raw text as the code
                codeElement.textContent = text;
            })
            .catch(error => {
                codeElement.textContent = 'Error loading code.';
                console.error('Error fetching banner code:', error);
            });
    }
});

// --- Interactive Video Poster Logic (FIXED) ---
const interactiveVideos = document.querySelectorAll('.interactive-video');

// Helper function to pause all videos except the one that's about to play
// and any videos that are autoplaying, looping, and muted.
const pauseAllOtherVideos = (currentVideo) => {
    document.querySelectorAll('video').forEach(otherVideo => {
        const isBackgroundVideo = otherVideo.autoplay && otherVideo.loop && otherVideo.muted;
        if (otherVideo !== currentVideo && !otherVideo.paused && !isBackgroundVideo) {
            otherVideo.pause();
        }
    });
};

// When any video finishes, reset it so its poster frame shows again.
// load() keeps the src but returns the element to its initial poster state.
// Capture phase, since 'ended' doesn't bubble.
document.addEventListener('ended', (e) => {
    const v = e.target;
    if (v.tagName === 'VIDEO' && v.poster) {
        v.load();
    }
}, true);

interactiveVideos.forEach(container => {
    const video = container.querySelector('video');
    const controlButton = container.querySelector('.play-button-overlay');

    if (video && controlButton) {
        // 1. Get the video's path from data-src and generate the poster URL.
        const videoSrc = video.dataset.src;
        if (videoSrc) {
            const posterUrl = videoSrc.substring(0, videoSrc.lastIndexOf('.')) + '.avif';
            video.poster = posterUrl;
        }

        // --- FIX: Attach UI state listeners immediately ---
        // These listeners toggle the CSS class that controls the UI state (e.g., hiding the central button).
        // By attaching them now, we guarantee they will catch the very first 'play' event.
        video.addEventListener('play', () => container.classList.add('is-playing'));
        video.addEventListener('pause', () => container.classList.remove('is-playing'));
        // --- END FIX ---

        // This function now only sets up controls that depend on the video's duration.
        const setupFinalControls = () => {
            // A. For long videos (>= 30s), switch to native browser controls,
            //    unless the page opts out with <body data-simple-controls>.
            const forceSimpleControls = document.body.hasAttribute('data-simple-controls');
            if (video.duration >= 30 && !forceSimpleControls) {
                container.classList.add('native-controls-active');
                video.controls = true;
                controlButton.style.display = 'none'; // Hide our custom button
            } else {
            // B. For short videos (< 30s), set up our custom play/pause icon updates.
                container.classList.add('custom-controls');

                const updateButtonUI = () => {
                    if (video.paused) {
                        controlButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                    } else {
                        controlButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
                    }
                };

                // These listeners are only for the button's icon, not the container's state.
                video.addEventListener('play', updateButtonUI);
                video.addEventListener('pause', updateButtonUI);
                updateButtonUI(); // Initialize button icon
            }
        };

        // Listen for metadata to load ONCE, then set up the final controls.
        video.addEventListener('loadedmetadata', setupFinalControls, { once: true });

        // This click handler remains the same.
        controlButton.addEventListener('click', (e) => {
            e.stopPropagation();

            if (video.paused) {
                // Load the video source on the first click
                if (!video.getAttribute('src')) {
                    video.src = video.dataset.src;
                    video.load();
                }

                pauseAllOtherVideos(video);
                // On the very first play for this video, unmute it.
                if (!container.dataset.hasPlayed) {
                    video.muted = false;
                    container.dataset.hasPlayed = 'true';
                }
                video.play();
            } else {
                // This pause functionality will only be used by short videos.
                video.pause();
            }
        });
    }
});

    // Reusable function to load an HTML component and then run its callback
    const loadComponent = (selector, url) => {
        const element = document.querySelector(selector);
        if (element) {
            return fetch(url)
                .then(response => response.text())
                .then(data => {
                    element.innerHTML = data;
                })
                .catch(error => console.error(`Error loading ${url}:`, error));
        }
        return Promise.resolve(); // Return an empty promise if the placeholder doesn't exist
    };

    // --- GLOBAL STATE AND INITIALIZATION FUNCTIONS ---
    // Bump with the ?v= on style.css / main.js in the pages, so returning
    // visitors fetch fresh copies of everything main.js loads too.
    const ASSET_VERSION = '1.27';
    // On a desktop (mouse) the homepage grid starts still: each video plays
    // while its card is hovered. The header logo keeps moving regardless.
    // Touch screens can't hover, so they keep autoplaying.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isHomeGrid = !!document.querySelector('.grid-container');
    let isMotionReduced = canHover && isHomeGrid;
   // This function initializes the navbar's buttons.
    const initializeNavbar = () => {
        // Parked: the motion toggle. Its button was taken out of navbar.html;
        // to bring it back, put <button type="button" id="reduce-motion-btn">
        // at the start of .navbar-icons there (its styles are still in style.css).
        const reduceMotionBtn = document.getElementById('reduce-motion-btn');
        if (reduceMotionBtn) {
            const path = window.location.pathname;
            // Check if the current page is the homepage (handles root '/' and '/index.html')
            const isHomePage = path === '/' || path.endsWith('/index.html');

            if (isHomePage) {
                reduceMotionBtn.textContent = isMotionReduced ? 'enable motion' : 'reduce motion';
                // If it's the homepage, add the event listener
                reduceMotionBtn.addEventListener('click', () => {
                    isMotionReduced = !isMotionReduced;
                    reduceMotionBtn.textContent = isMotionReduced ? 'enable motion' : 'reduce motion';

                    // the header logo always animates; this only affects the grid
                    const grid = document.querySelector('.grid-container');
                    if (grid) grid.classList.toggle('autoplaying', !isMotionReduced);

                    const allVideos = document.querySelectorAll('video');
                    if (isMotionReduced) {
                        allVideos.forEach(video => video.pause());
                    } else {
                        allVideos.forEach(video => video.play().catch(() => {}));
                    }
                });
            } else {
                // If it's not the homepage, hide the button
                reduceMotionBtn.style.display = 'none';
            }
        }

        // NEW: Dark Mode Toggle Logic
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            });
        }
    };

    // Homepage: hovering the logo pops up a small "about this" bubble beside
    // it (styles under .logo-hint in style.css), with a little rounded
    // triangle that points at the cursor. The triangle rides an invisible
    // track round the bubble (the bubble's pill shape, grown by TRACK cells),
    // stopping at the spot nearest the cursor. It's part of the link, so it
    // can be clicked too. It stays put beside the logo, out of the way of the
    // logo's own pointer effect; only the bubble leans a hair toward the cursor.
    const addLogoHint = (logoLink) => {
        const TRACK = 0.45;   // gap from the bubble's edge to the track, in cells
        const hint = document.createElement('span');
        hint.className = 'logo-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.innerHTML =
            '<span class="logo-hint-bubble">about this</span>' +
            // a squat triangle pointing up, its corners rounded by the stroke
            '<svg class="logo-hint-pointer" viewBox="0 0 20 20">' +
                '<path d="M10 5 L16.5 15 L3.5 15 Z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
            '</svg>';
        logoLink.appendChild(hint);
        if (!canHover) return;
        const logo = logoLink.querySelector('#jonelliot-logo');
        const bubble = hint.querySelector('.logo-hint-bubble');
        const pointer = hint.querySelector('.logo-hint-pointer');
        logoLink.addEventListener('pointermove', (e) => {
            const r = logo.getBoundingClientRect();
            const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
            hint.style.setProperty('--mx', clamp((e.clientX - r.left - r.width / 2) / (r.width / 2)).toFixed(3));
            hint.style.setProperty('--my', clamp((e.clientY - r.top - r.height / 2) / (r.height / 2)).toFixed(3));

            // the cursor, in the hint's own pixels (layout boxes, so the
            // bubble's pop-in scale and lean don't move the track)
            const h = hint.getBoundingClientRect();
            const px = e.clientX - h.left, py = e.clientY - h.top;
            const radius = bubble.offsetHeight / 2;
            const cy = bubble.offsetTop + radius;
            const x0 = bubble.offsetLeft + radius, x1 = bubble.offsetLeft + bubble.offsetWidth - radius;
            // nearest point on the pill's centre line, then out along the
            // line to the cursor as far as the track
            const qx = clamp(px, x0, x1);
            const dx = px - qx, dy = py - cy;
            const d = Math.hypot(dx, dy) || 1;
            const reach = radius + TRACK * (r.width / 9);
            const tx = qx + dx / d * reach, ty = cy + dy / d * reach;
            const size = parseFloat(getComputedStyle(pointer).width);   // an svg has no offsetWidth
            pointer.style.left = (tx - size / 2).toFixed(1) + 'px';
            pointer.style.top = (ty - size / 2).toFixed(1) + 'px';
            const angle = Math.atan2(py - ty, px - tx) * 180 / Math.PI + 90;
            pointer.style.rotate = angle.toFixed(1) + 'deg';
        });
        logoLink.addEventListener('pointerleave', () => {
            hint.style.setProperty('--mx', 0);
            hint.style.setProperty('--my', 0);
        });
    };

    // This function starts the animated logo in the header: the typeface
    // (grid-type.js) first, then the motion engine (grid-motion.js), then the
    // logo that runs on it.
    const initializeHeader = () => {
        if (!document.getElementById('jonelliot-logo')) return;
        // the page's heading shares the header row with the logo (see .header in style.css)
        const heading = document.getElementById('heading');
        if (heading) document.querySelector('.header').appendChild(heading);
        if (isHomeGrid) {
            const logoLink = document.querySelector('.header-image');
            logoLink.href = 'type/';
            logoLink.setAttribute('aria-label', 'jonelliot \u2014 about the type');
            addLogoHint(logoLink);
        }
        const loadScript = src => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
        loadScript(`js/grid-type.js?v=${ASSET_VERSION}`)
            .then(() => loadScript(`js/grid-motion.js?v=${ASSET_VERSION}`))
            .then(() => loadScript(`js/jonelliot-logo.js?v=${ASSET_VERSION}`))
            .catch(error => console.error('Error loading header logo:', error));
    };

   // This function adds posters to standard autoplay videos and ensures
    // the video only loads AFTER the poster is visible.
    const initializeAutoplayVideoPosters = () => {
        // Select all videos with a 'autoplay' attribute that are not interactive
        const autoplayVideos = document.querySelectorAll('video[autoplay]:not(.interactive-video video)');

        autoplayVideos.forEach(video => {
            const videoSrc = video.dataset.src;
            if (videoSrc) {
                // the video's name with .avif, unless data-poster names another file
                const posterUrl = video.dataset.poster || videoSrc.substring(0, videoSrc.lastIndexOf('.')) + '.avif';

                // 1. Set the poster on the video element so it's ready to be displayed.
                video.poster = posterUrl;

                // 2. Create an in-memory image to detect when the poster has finished loading.
                const posterImg = new Image();

                // 3. Define what happens AFTER the poster is successfully loaded.
                posterImg.onload = () => {
                    // The poster is now loaded and visible.
                    // Now, we can set the video's source and initiate playback.
                    video.src = videoSrc;
                    video.load();

                    // Manually trigger play, but respect the global motion setting.
                    if (!isMotionReduced) {
                        video.play().catch(error => console.error("Autoplay failed:", error));
                    }
                };

                // 4. (Optional but good practice) Handle cases where the poster image fails to load.
                posterImg.onerror = () => {
                    console.error(`Poster image failed to load: ${posterUrl}`);
                    // Fallback: load the video directly anyway.
                    video.src = videoSrc;
                    video.load();
                    if (!isMotionReduced) {
                        video.play().catch(error => console.error("Autoplay failed:", error));
                    }
                };

                // 5. This is the trigger: by setting the 'src' on our in-memory image,
                //    we start the download process for the poster.
                posterImg.src = posterUrl;
            }
        });
    };

// --- NEW: Create a reusable function for the nav logic ---
    const updateActiveNav = () => {
        const currentPagePath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar-links a');

        navLinks.forEach(link => {
            // First, remove the active class from all links
            link.classList.remove('active');

            const linkPath = new URL(link.href).pathname;
            if (linkPath === currentPagePath) {
                link.classList.add('active');
            }
        });
    };


    // This function runs after the main components are loaded
    const initializePage = () => {
        // Run the global initializers
        initializeNavbar();
        initializeHeader();
        initializeAutoplayVideoPosters();
        initializeCrosshair();
        // design tool: the grid controls panel (press G). Remove this line to drop it.
        loadGridControls();
        // temporary: the logo colour picker for Lauren (type "lauren"). Remove this line to drop it.
        addScript(`js/lauren.js?v=${ASSET_VERSION}`);
        // design tool: the homepage layout editor (press E), only on a local copy
        const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (isLocal && document.querySelector('.grid-container')) addScript(`js/layout-editor.js?v=${ASSET_VERSION}`);

         // Call the new function for the initial page load
        updateActiveNav();


        // --- HOMEPAGE-SPECIFIC LOGIC ---
        const isHomePage = document.querySelector('.grid-container');
        if (isHomePage) {
            const gridItems = document.querySelectorAll('.grid-item');

           const lazyLoadMedia = (target) => {
                const video = target.querySelector('video[data-src]');
                const img = target.querySelector('img[data-src]');

                if (video) {
                    const videoSrc = video.dataset.src;

                    // --- NEW: Generate and set the poster image ---
                    // This creates the poster URL by swapping the file extension.
                    const posterUrl = videoSrc.substring(0, videoSrc.lastIndexOf('.')) + '.avif';
                    video.poster = posterUrl;
                    // --- END NEW ---

                    video.playsInline = true; //
                    video.muted = true; //
                    video.loop = true; //
                    // hover-to-play needs the video ready before the cursor arrives
                    video.preload = canHover ? 'auto' : 'none';
                    const source = document.createElement('source'); //
                    source.src = videoSrc; //
                    source.type = 'video/webm'; //
                    video.innerHTML = ''; //
                    video.appendChild(source); //
                    video.load(); //
                    if (!isMotionReduced) {
                        video.play().catch(error => console.error("Video play failed:", error)); //
                    }
                    video.removeAttribute('data-src'); //
                    syncAutoplay();
                }
                if (img) {
                    img.src = img.dataset.src; //
                    img.removeAttribute('data-src'); //
                }
            };

            // Cards that come into view together (the first screen on load, or
            // a few at once while scrolling) fade and rise in turn, top to
            // bottom, rather than all at once.
            const STAGGER = 60, MAX_STAGGER = 600;   // ms
            const observer = new IntersectionObserver((entries, observer) => {
                entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) ||
                                    (a.boundingClientRect.left - b.boundingClientRect.left))
                    .forEach((entry, i) => {
                        const item = entry.target;
                        item.style.transitionDelay = `${Math.min(i * STAGGER, MAX_STAGGER)}ms`;
                        // clear it once in, so hover transitions don't wait
                        item.addEventListener('transitionend', () => { item.style.transitionDelay = ''; }, { once: true });
                        item.classList.add('loaded');
                        lazyLoadMedia(item);
                        observer.unobserve(item);
                    });
            }, { rootMargin: '0px 0px -24px 0px' });   // in as soon as a card peeks into view

            // On desktop, the cards marked data-autoplay play by themselves
            // while they're on screen; the rest play only while hovered.
            // Hovering any other card pauses the autoplaying ones until the
            // cursor leaves it. The mark is read each time, so the layout
            // editor can switch it on and off (it fires 'autoplaychange').
            const videoCards = [...gridItems].filter(i => i.querySelector('video'));
            const autoplays = (item) => item.hasAttribute('data-autoplay');
            const onScreen = new Set();
            let hoveredCard = null;
            const syncAutoplay = () => {
                if (!isMotionReduced) return;   // touch screens: everything autoplays already
                videoCards.forEach(item => {
                    const video = item.querySelector('video');
                    if (item === hoveredCard) return;
                    if (autoplays(item) && onScreen.has(item) && !hoveredCard) video.play().catch(() => {});
                    else video.pause();
                });
            };
            const visibility = new IntersectionObserver((entries) => {
                entries.forEach(e => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
                syncAutoplay();
            });
            videoCards.forEach(item => visibility.observe(item));
            document.addEventListener('autoplaychange', syncAutoplay);

            gridItems.forEach(item => {
                // Keep your existing observer and hover-to-play logic
                observer.observe(item);
                const video = item.querySelector('video');
                item.addEventListener('mouseenter', () => {
                    hoveredCard = item;
                    if (video && isMotionReduced) video.play().catch(() => {});
                    syncAutoplay();
                });
                item.addEventListener('mouseleave', () => {
                    hoveredCard = null;
                    if (video && isMotionReduced && !autoplays(item)) video.pause();
                    syncAutoplay();
                });

                if (canHover) followSeeMore(item);

                // corner icon: a play mark on hover-to-play cards, otherwise a
                // fanned stack of cards (the project has more inside)
                const icon = item.querySelector('.multi-icon-fa');
                if (icon) icon.outerHTML = (canHover && video) ? PLAY_ICON : STACK_ICON;
                // the play mark hides while the video is actually playing
                if (video) {
                    video.addEventListener('play', () => item.classList.add('is-playing'));
                    video.addEventListener('pause', () => item.classList.remove('is-playing'));
                }

                // Get the project ID and the id-tab element
                const projectId = item.dataset.projectId;
                const idTab = item.querySelector('.id-tab');

                // Proceed only if a project ID exists
                if (projectId) {
                    // Create the 'see more' button and set its link correctly
                    const button = document.createElement('a');
                    button.href = `${projectId}.html`;
                    button.className = 'see-more-btn';
                    button.innerHTML = '<i class="fa-regular fa-square-plus"></i><span>see more</span>';

                    // Add the button to the grid item
                    if (idTab) {
                        item.insertBefore(button, idTab);
                    } else {
                        item.appendChild(button);
                    }

                    // Add a smart click listener to the parent grid item
                    item.addEventListener('click', (event) => {
                        // If the user clicked the button, let the browser handle the link
                        if (event.target.closest('.see-more-btn')) {
                            return;
                        }

                        // Otherwise, navigate using the entire grid item
                        window.location.href = `${projectId}.html`;
                    });
                }
            });

            animateLayoutChanges(isHomePage, gridItems);
            scrollDrift(isHomePage, gridItems);
        }
    };

    // Scroll drift: each card follows the scroll a little behind the page and
    // eases into its grid position once the page stops, with no overshoot.
    // Every card follows at its own rate (smaller cards trail more and arrive
    // later, and a fixed per-card variation keeps neighbours out of step), so
    // they settle one after another rather than as a block.
    //   DRIFT      how much of each card's lag shows (0 turns it off)
    //   MAX_DRIFT  a soft limit on the offset, in cells
    //   EASE       follow rates per frame, lightest card to heaviest
    //   WEIGHT     how much each trails, lightest card to heaviest
    // Desktop only.
    const DRIFT = 0.1, MAX_DRIFT = 4, EASE = [0.035, 0.14], WEIGHT = [2.4, 0.3];
    const scrollDrift = (grid, items) => {
        if (!DRIFT || !canHover || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        items = [...items];
        // size: 0 for the smallest card, 1 for the largest
        const areas = items.map(el => {
            const s = el.style;
            return (parseFloat(s.getPropertyValue('--w')) || 1) * (parseFloat(s.getPropertyValue('--h')) || 1);
        });
        const lo = Math.min(...areas), hi = Math.max(...areas);
        const y0 = window.scrollY;
        const cards = items.map((el, i) => {
            const size = hi > lo ? (areas[i] - lo) / (hi - lo) : 0.5;
            const jitter = ((i * 7919) % 97) / 97;   // a fixed 0..1 per card
            const t = Math.min(1, Math.max(0, 0.65 * Math.sqrt(size) + 0.35 * jitter));
            return { el, rate: EASE[0] + (EASE[1] - EASE[0]) * t, weight: WEIGHT[0] + (WEIGHT[1] - WEIGHT[0]) * t, pos: y0 };
        });
        const visible = new Set();
        const onScreen = new IntersectionObserver((entries) => {
            entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
        }, { rootMargin: '200px 0px' });
        cards.forEach(c => onScreen.observe(c.el));

        let running = false;
        const cell = () => parseFloat(getComputedStyle(grid).gridAutoRows) || 16;
        const tick = () => {
            const y = window.scrollY, max = MAX_DRIFT * cell();
            const editing = document.body.classList.contains('le-on');
            let moving = false;
            cards.forEach(c => {
                // each card's own position eases toward the page's
                c.pos = editing ? y : c.pos + (y - c.pos) * c.rate;
                const lag = (y - c.pos) * DRIFT * c.weight;
                let off = 0;
                if (Math.abs(lag) > 0.2) { off = max * Math.tanh(lag / max); moving = true; }
                else c.pos = y;
                if (visible.has(c.el) || !off) c.el.style.translate = off ? `0 ${off.toFixed(1)}px` : '';
            });
            if (moving) requestAnimationFrame(tick);
            else running = false;
        };
        window.addEventListener('scroll', () => {
            if (!running) { running = true; requestAnimationFrame(tick); }
        }, { passive: true });
    };

    // When the window crosses a breakpoint and the cards rearrange (wide,
    // narrow, stacked), each card glides from where it was to where it now
    // sits, rather than jumping. Positions are kept in page coordinates, taken
    // on every resize, so the last ones are always from the old layout.
    const animateLayoutChanges = (grid, items) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const layoutOf = () => getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
        const measure = () => new Map([...items].map(el => {
            const r = el.getBoundingClientRect();
            return [el, { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }];
        }));
        let layout = layoutOf(), rects = measure(), queued = false;

        window.addEventListener('resize', () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                const now = measure(), next = layoutOf();
                if (next !== layout) {
                    items.forEach(el => {
                        const a = rects.get(el), b = now.get(el);
                        if (!b.w || !b.h) return;
                        el.animate([
                            { transformOrigin: '0 0', transform: `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${a.w / b.w}, ${a.h / b.h})` },
                            { transformOrigin: '0 0', transform: 'none' },
                        ], { duration: 700, easing: 'cubic-bezier(.2, .7, .2, 1)' });
                    });
                }
                layout = next;
                rects = now;
            });
        });
    };

    // Rounded play triangle: the stroke, joined round, softens the corners
    const PLAY_ICON = '<svg class="card-icon play-icon" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M5 3.2 L12.8 8 L5 12.8 Z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' +
        '</svg>';
    // Two rounded cards fanned apart, the back one fainter
    const STACK_ICON = '<svg class="card-icon" viewBox="0 0 16 16" aria-hidden="true">' +
        '<rect x="3.6" y="3.2" width="8.8" height="10.6" rx="2" transform="rotate(-12 8 13.8)" fill="currentColor" opacity=".45"/>' +
        '<rect x="3.6" y="3.2" width="8.8" height="10.6" rx="2" transform="rotate(8 8 13.8)" fill="currentColor"/>' +
        '</svg>';

    // On hover, a grid card's 'see more' button trails the cursor on a soft
    // spring. It fades in a short way back along the cursor's path and glides
    // into place, and on leaving drifts a little further out the way the
    // cursor went as it fades. Mouse only; touch keeps the static button.
    const followSeeMore = (item) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        item.classList.add('follows-cursor');
        const NUDGE = 18;   // px the button travels on the way in / out
        const pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, target = { x: 0, y: 0 };
        let running = false;

        const tick = () => {
            const btn = item.querySelector('.see-more-btn');
            if (!btn) { running = false; return; }
            // spring: pull toward the target, keep a little of last frame's velocity
            vel.x = (vel.x + (target.x - pos.x) * 0.08) * 0.68;
            vel.y = (vel.y + (target.y - pos.y) * 0.08) * 0.68;
            pos.x += vel.x;
            pos.y += vel.y;
            btn.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
            const settled = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) + Math.abs(vel.x) + Math.abs(vel.y) < 0.2;
            if (settled) { running = false; return; }
            requestAnimationFrame(tick);
        };
        const run = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

        // the offset (from the button's resting corner) that puts its top-left
        // just below-right of the cursor, kept inside the card
        const aim = (e) => {
            const btn = item.querySelector('.see-more-btn');
            if (!btn) return false;
            const card = item.getBoundingClientRect();
            const w = btn.offsetWidth, h = btn.offsetHeight, margin = 8;
            const homeX = card.width - margin - w, homeY = card.height - margin - h;
            const x = Math.min(Math.max(e.clientX - card.left + 14, margin), card.width - margin - w);
            const y = Math.min(Math.max(e.clientY - card.top + 14, margin), card.height - margin - h);
            target.x = x - homeX;
            target.y = y - homeY;
            return true;
        };
        // unit vector pointing out through the card edge nearest the cursor —
        // the side it came in by, or is leaving by
        const outward = (e) => {
            const r = item.getBoundingClientRect();
            const d = [
                [e.clientX - r.left, -1, 0], [r.right - e.clientX, 1, 0],
                [e.clientY - r.top, 0, -1], [r.bottom - e.clientY, 0, 1],
            ].sort((a, b) => a[0] - b[0])[0];
            return { x: d[1], y: d[2] };
        };

        item.addEventListener('mouseenter', (e) => {
            if (!aim(e)) return;
            const out = outward(e);
            pos.x = target.x + out.x * NUDGE;
            pos.y = target.y + out.y * NUDGE;
            vel.x = vel.y = 0;
            // place it now, not next frame, so it never flashes at its old spot
            item.querySelector('.see-more-btn').style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            run();
        });
        item.addEventListener('mousemove', (e) => { if (aim(e)) run(); });
        item.addEventListener('mouseleave', (e) => {
            const out = outward(e);
            target.x = pos.x + out.x * NUDGE;
            target.y = pos.y + out.y * NUDGE;
            run();
        });
    };

    // Homepage cursor: a thin crosshair in place of the arrow. It follows the
    // mouse exactly, or with CROSSHAIR_SNAP (or ?snap in the address, or the
    // grid controls' snap switch, which sets <body data-crosshair="snap">) it
    // glides from one grid intersection to the next. Mouse only.
    const CROSSHAIR_SNAP = new URLSearchParams(window.location.search).has('snap');
    const snapOn = () => CROSSHAIR_SNAP || document.body.dataset.crosshair === 'snap';
    const initializeCrosshair = () => {
        const grid = document.querySelector('.grid-container');
        if (!canHover || !document.body.classList.contains('home') || !grid) return;
        const cross = document.createElement('div');
        cross.className = 'crosshair';
        cross.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cross);
        document.body.classList.add('has-crosshair');

        const mouse = { x: 0, y: 0 }, pos = { x: 0, y: 0 };
        let running = false, placed = false;
        // positioned with `translate`, which the browser applies after the
        // hover `scale`, so the crosshair shrinks in place
        const place = () => { cross.style.translate = `${pos.x}px ${pos.y}px`; };

        // the grid intersection nearest the mouse; the lines run from the
        // cards' grid, which starts on a line
        const snapped = () => {
            const cell = parseFloat(getComputedStyle(grid).gridAutoRows);
            const r = grid.getBoundingClientRect();
            if (!(cell > 0)) return { x: mouse.x, y: mouse.y };
            return {
                x: r.left + Math.round((mouse.x - r.left) / cell) * cell,
                y: r.top + Math.round((mouse.y - r.top) / cell) * cell,
            };
        };
        const tick = () => {
            const t = snapped();
            pos.x += (t.x - pos.x) * 0.35;
            pos.y += (t.y - pos.y) * 0.35;
            if (Math.abs(t.x - pos.x) + Math.abs(t.y - pos.y) < 0.1) {
                pos.x = t.x; pos.y = t.y; running = false;
            }
            place();
            if (running) requestAnimationFrame(tick);
        };
        const update = () => {
            if (!snapOn()) { pos.x = mouse.x; pos.y = mouse.y; place(); return; }
            if (!placed) { Object.assign(pos, snapped()); placed = true; place(); }
            if (!running) { running = true; requestAnimationFrame(tick); }
        };

        document.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            cross.classList.add('visible');
            cross.classList.toggle('over', !!e.target.closest?.('a, button, label, input, .grid-item'));
            update();
        });
        // scrolling moves the grid under a still mouse
        window.addEventListener('scroll', () => { if (placed && snapOn()) update(); }, { passive: true });
        document.documentElement.addEventListener('mouseleave', () => cross.classList.remove('visible'));
    };

    const addScript = (src) => {
        const script = document.createElement('script');
        script.src = src;
        document.body.appendChild(script);
    };
    const loadGridControls = () => addScript(`js/grid-controls.js?v=${ASSET_VERSION}`);

    // --- SCRIPT ENTRY POINT ---

    // NEW: Apply theme from localStorage on initial load
    const applyInitialTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    };

    applyInitialTheme(); // Run before loading components

    // Load the universal components, then initialize the page
    Promise.all([
        loadComponent('#navbar-placeholder', `navbar.html?v=${ASSET_VERSION}`),
        loadComponent('#header-placeholder', `header.html?v=${ASSET_VERSION}`)
    ]).then(() => {
        initializePage();
    });

    // The footer, on every page: after the page's <main>, or at the end.
    const footerSlot = document.createElement('div');
    footerSlot.id = 'footer-placeholder';
    const main = document.querySelector('main');
    if (main) main.after(footerSlot); else document.body.appendChild(footerSlot);
    loadComponent('#footer-placeholder', `footer.html?v=${ASSET_VERSION}`).then(() => {
        const year = footerSlot.querySelector('.footer-year');
        if (year) year.textContent = new Date().getFullYear();
    });

    // --- NEW: Add event listener for the pageshow event ---
    // This will re-run the nav logic when a page is shown from the back-forward cache
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) { // Check if the page was loaded from the cache
            updateActiveNav();
        }
    });

});