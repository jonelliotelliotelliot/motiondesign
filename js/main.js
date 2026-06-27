document.addEventListener("DOMContentLoaded", () => {

    //logo home ---
    document.addEventListener('click', (event) => {
        const logoHome = event.target.closest('.header-image');
        if (logoHome) {
            event.preventDefault();
            window.location.href = 'index.html'; // Redirect to homepage
        }
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
            // A. For long videos (>= 30s), switch to native browser controls.
            if (video.duration >= 30) {
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
    let isMotionReduced = false;
    // NEW: Define header video names without suffixes
    // const headerVideoBases = ['je-1', 'je-2', 'je-3', 'je-4', 'je-5'];

    const headerVideoBases = ['je-inflate', 'je-fluid', 'je-molecular', 'je-blocks'];
    let currentHeaderVideoIndex = 0; // Keep track of the current video

    // NEW: Function to swap header video based on theme
    const updateHeaderVideoTheme = () => {
        const videoElement = document.querySelector('.header-image video');
        if (videoElement) {
            const isDarkMode = document.body.classList.contains('dark-mode');
            const theme = isDarkMode ? 'dark' : 'light';
            const newSrc = `assets/videos/${headerVideoBases[currentHeaderVideoIndex]}-${theme}.webm`;
            if (videoElement.src !== newSrc) {
                videoElement.src = newSrc;
            }
        }
    };

   // This function initializes the navbar's buttons.
    const initializeNavbar = () => {
        const reduceMotionBtn = document.getElementById('reduce-motion-btn');
        if (reduceMotionBtn) {
            const path = window.location.pathname;
            // Check if the current page is the homepage (handles root '/' and '/index.html')
            const isHomePage = path === '/' || path.endsWith('/index.html');

            if (isHomePage) {
                // If it's the homepage, add the event listener
                reduceMotionBtn.addEventListener('click', () => {
                    isMotionReduced = !isMotionReduced;
                    reduceMotionBtn.textContent = isMotionReduced ? 'enable motion' : 'reduce motion';

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
                updateHeaderVideoTheme(); // Swap video on toggle
            });
        }
    };

    // This function initializes the random video header.
    const initializeHeader = () => {
        const hc = document.querySelector('.header-image');
        if (hc) {
            // Select a random video index
            currentHeaderVideoIndex = Math.floor(Math.random() * headerVideoBases.length);
            const videoBaseName = headerVideoBases[currentHeaderVideoIndex];

            // Determine theme and set the correct video source
            const isDarkMode = document.body.classList.contains('dark-mode');
            const theme = isDarkMode ? 'dark' : 'light';
            const videoSrc = `assets/videos/${videoBaseName}-${theme}.webm`;

            const videoElement = document.createElement('video');
            videoElement.src = videoSrc;
            videoElement.muted = true;
            videoElement.loop = true;
            videoElement.playsInline = true;
            videoElement.autoplay = true;
            hc.appendChild(videoElement);
            if (isMotionReduced) videoElement.pause();
        }
    };

   // This function adds posters to standard autoplay videos and ensures
    // the video only loads AFTER the poster is visible.
    const initializeAutoplayVideoPosters = () => {
        // Select all videos with a 'autoplay' attribute that are not interactive
        const autoplayVideos = document.querySelectorAll('video[autoplay]:not(.interactive-video video)');

        autoplayVideos.forEach(video => {
            const videoSrc = video.dataset.src;
            if (videoSrc) {
                const posterUrl = videoSrc.substring(0, videoSrc.lastIndexOf('.')) + '.avif';

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
                    video.preload = 'none'; //
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
                }
                if (img) {
                    img.src = img.dataset.src; //
                    img.removeAttribute('data-src'); //
                }
            };

            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('loaded');
                        lazyLoadMedia(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -150px 0px' });

            gridItems.forEach(item => {
                // Keep your existing observer and hover-to-play logic
                observer.observe(item);
                const video = item.querySelector('video');
                if (video) {
                    item.addEventListener('mouseenter', () => { if (isMotionReduced) video.play(); });
                    item.addEventListener('mouseleave', () => { if (isMotionReduced) video.pause(); });
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
                    button.innerHTML = 'see more <i class="fa-regular fa-square-plus"></i>';

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
        }
    };

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
        loadComponent('#navbar-placeholder', '_navbar.html'),
        loadComponent('#header-placeholder', '_header.html')
    ]).then(() => {
        initializePage();
    });

    // --- NEW: Add event listener for the pageshow event ---
    // This will re-run the nav logic when a page is shown from the back-forward cache
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) { // Check if the page was loaded from the cache
            updateActiveNav();
        }
    });

});