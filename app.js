(async function () {
    const BASE_PAGES = ['home', 'about', 'timeline', 'experience', 'connect'];
    const EASTER_EGG_REQUIRED_PAGES = ['about', 'timeline', 'experience', 'connect'];
    const EASTER_EGG_PAGE = 'easter-egg';
    const TABS_VISITED_STORAGE_KEY = 'biography-tabs-visited';
    const EASTER_EGG_UNLOCKED_STORAGE_KEY = 'biography-easter-egg-unlocked';
    let PAGES = [...BASE_PAGES];
    let easterEggUnlocked = false;
    const SINGLE_STEP_DURATION = 110;
    const MULTI_STEP_DURATION = 60;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentPage = 'home';
    let isTransitioning = false;
    let dateInterval = null;
    let weatherInterval = null;
    let pageToastContent = {};
    let toastScheduleTimer = null;
    let pageToastStackEl = null;
    const activePageToasts = new Map();
    let toastNavigationInterrupted = false;
    let pdfPreviewEl = null;
    let emailPopupEl = null;
    let closePdfPreviewFn = null;
    let closeEmailPopupFn = null;
    let experiencePopupEl = null;
    let closeExperiencePopupFn = null;
    let experienceItemData = {};
    let homeWelcomeWavePlayed = false;
    const SPARKS_CANVAS_ID = 'easterEggSparksCanvas';
    const FIREFLY_CANVAS_ID = 'easterEggFireflyCanvas';
    const FIREWORKS_CANVAS_ID = 'easterEggFireworksCanvas';
    const EASTER_EGG_DURATION_MS = 134000;
    const EASTER_EGG_FIRST_START_MS = 33500;
    const EASTER_EGG_FIRST_STOP_MS = 59500;
    const EASTER_EGG_SECOND_START_MS = 107000;
    const EASTER_EGG_SECOND_STOP_MS = 132500;
    const EASTER_EGG_EFFECTS_FADE_MS = 1500;
    const EASTER_EGG_DARK_TRANSITION_MS = 12000;
    const EASTER_EGG_GIF_INTRO_SRC = 'misc/easter-egg/ee-intro.gif';
    const EASTER_EGG_GIF_SPIN_SRC = 'misc/easter-egg/ee-spin.gif';
    const SPARKS_MAX_PARTICLES = 440;
    const SPARKS_EMITTER_GAP = 18;
    const SPARKS_MIN_EMITTERS = 12;
    const SPARKS_MAX_DPR = 1;
    const FIREFLY_MAX_DPR = 1;
    const FIREFLY_FADE_MS = 2800;
    const FIREFLY_MOUSE_TRAIL_MS = 200;
    const FIREFLY_MOUSE_TRAIL_MAX = 14;
    const FIREFLY_MOUSE_REPEL_RADIUS = 72;
    const FIREFLY_MOUSE_REPEL_STRENGTH = 0.11;
    const FIREFLY_VELOCITY_DAMPING = 0.986;
    const FIREFLY_MAX_SPEED = 1.35;
    const FIREWORKS_MAX_DPR = 1;
    const FIREWORKS_MAX_ROCKETS = 32;
    const FIREWORKS_MAX_PARTICLES = 900;

    let sparksCanvas = null;
    let sparksCtx = null;
    let sparksParticles = [];
    let sparksAnimationId = null;
    let sparksActive = false;
    let sparksViewport = { width: 0, height: 0 };
    let sparkEmitters = [];
    let sparkEmitterOffset = 0;
    let sparksResizeHandler = null;
    let fireflyCanvas = null;
    let fireflyCtx = null;
    let fireflies = [];
    let fireflyAnimationId = null;
    let fireflyActive = false;
    let fireflyViewport = { width: 0, height: 0 };
    let fireflyResizeHandler = null;
    let fireflyPointerHandler = null;
    const fireflyMouse = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        lastX: 0,
        lastY: 0,
        lastMoveAt: 0,
        trail: []
    };
    let fireworksCanvas = null;
    let fireworksCtx = null;
    let fireworksRockets = [];
    let fireworksParticles = [];
    let fireworksAnimationId = null;
    let fireworksActive = false;
    let fireworksSpawning = false;
    let fireworksViewport = { width: 0, height: 0 };
    let fireworksResizeHandler = null;
    let easterEggTimelineScheduled = false;
    let easterEggTimelineRaf = null;
    let easterEggMilestonesFired = new Set();
    let easterEggShowEnded = false;
    let finaleEffectsIntensity = 0;
    let finaleEffectsSpawning = false;
    let finaleEffectsFadeOnComplete = null;
    let fireflyFadeCancel = null;
    let fireflyVisibilityFadeTimer = null;
    let finaleFadeCancel = null;
    let easterEggFinaleActive = false;
    let easterEggMusicActive = false;
    let easterEggDarkModeTimer = null;
    let easterEggGifSwapTimer = null;
    let pageViewportEl = null;
    let navEl = null;

    const TOAST_DELAY_MS = 400;
    const TOAST_INITIAL_DELAY_MS = 800;
    const TOAST_DURATION_MS = 10000;
    const TOAST_HIDE_MS = 550;
    const TOAST_STORAGE_KEY = 'biography-page-toasts';

    function isEasterEggUnlockedInSession() {
        try {
            return sessionStorage.getItem(EASTER_EGG_UNLOCKED_STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    function persistEasterEggUnlocked() {
        try {
            sessionStorage.setItem(EASTER_EGG_UNLOCKED_STORAGE_KEY, 'true');
        } catch {
            // Ignore storage failures; unlock still works for this page load.
        }
    }

    function getVisitedPages() {
        try {
            const stored = sessionStorage.getItem(TABS_VISITED_STORAGE_KEY);
            if (!stored) {
                return [];
            }
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed.filter((page) => EASTER_EGG_REQUIRED_PAGES.includes(page)) : [];
        } catch {
            return [];
        }
    }

    function hasVisitedAllRequiredTabs() {
        const visited = new Set(getVisitedPages());
        return EASTER_EGG_REQUIRED_PAGES.every((page) => visited.has(page));
    }

    function markPageVisited(page) {
        if (!EASTER_EGG_REQUIRED_PAGES.includes(page)) {
            return;
        }

        const visited = new Set(getVisitedPages());
        visited.add(page);
        sessionStorage.setItem(TABS_VISITED_STORAGE_KEY, JSON.stringify([...visited]));

        if (hasVisitedAllRequiredTabs()) {
            unlockEasterEgg();
        }
    }

    function createEasterEggNavLink() {
        const nav = document.querySelector('nav');
        const musicPlayer = document.querySelector('.music-player');
        if (!nav || !musicPlayer || nav.querySelector(`a[data-page="${EASTER_EGG_PAGE}"]`)) {
            return;
        }

        const navLink = document.createElement('a');
        navLink.href = `#${EASTER_EGG_PAGE}`;
        navLink.dataset.page = EASTER_EGG_PAGE;
        navLink.className = 'nav-easter-egg';
        navLink.textContent = 'Easter Egg';
        nav.insertBefore(navLink, musicPlayer);
    }

    function ensureEasterEggPanel() {
        if (!panels[EASTER_EGG_PAGE]) {
            panels[EASTER_EGG_PAGE] = document.querySelector(`.page-panel[data-page="${EASTER_EGG_PAGE}"]`);
        }

        return panels[EASTER_EGG_PAGE];
    }

    function unlockEasterEgg() {
        if (easterEggUnlocked) {
            return;
        }

        easterEggUnlocked = true;
        persistEasterEggUnlocked();

        if (!PAGES.includes(EASTER_EGG_PAGE)) {
            PAGES.push(EASTER_EGG_PAGE);
        }

        createEasterEggNavLink();

        const panel = ensureEasterEggPanel();
        const nav = document.querySelector('nav');

        if (panel) {
            panel.hidden = false;
        }
        nav?.classList.add('has-easter-egg');
    }

    function initEasterEgg() {
        document.querySelector('nav')?.classList.remove('has-easter-egg');
        document.querySelector(`nav a[data-page="${EASTER_EGG_PAGE}"]`)?.remove();

        const panel = ensureEasterEggPanel();
        const shouldUnlock = isEasterEggUnlockedInSession() || hasVisitedAllRequiredTabs();

        if (panel) {
            panel.hidden = !shouldUnlock;
        }

        if (shouldUnlock) {
            unlockEasterEgg();
        }
    }

    function isOnEasterEggPage() {
        return easterEggUnlocked && currentPage === EASTER_EGG_PAGE;
    }

    function updateSparkEmitters() {
        const { width, height } = sparksViewport;
        const edgePadding = 20;

        if (width <= edgePadding * 2 || height <= 0) {
            return;
        }

        const available = width - edgePadding * 2;
        const count = Math.max(SPARKS_MIN_EMITTERS, Math.floor(available / SPARKS_EMITTER_GAP) + 1);
        const step = count > 1 ? available / (count - 1) : 0;

        const bottomEmitters = Array.from({ length: count }, (_, index) => ({
            x: edgePadding + step * index,
            y: height
        }));

        sparkEmitters = bottomEmitters;
    }

    function resizeSparksCanvas() {
        if (!sparksCanvas || !sparksCtx) {
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = SPARKS_MAX_DPR;

        sparksViewport.width = width;
        sparksViewport.height = height;
        updateSparkEmitters();

        Object.assign(sparksCanvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            zIndex: '10000'
        });

        sparksCanvas.width = Math.floor(width * ratio);
        sparksCanvas.height = Math.floor(height * ratio);
        sparksCtx = sparksCanvas.getContext('2d');
        sparksCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function ensureSparksCanvas() {
        sparksCanvas = document.getElementById(SPARKS_CANVAS_ID);
        if (!sparksCanvas) {
            sparksCanvas = document.createElement('canvas');
            sparksCanvas.id = SPARKS_CANVAS_ID;
            sparksCanvas.className = 'easter-egg-sparks';
            sparksCanvas.setAttribute('aria-hidden', 'true');
            document.documentElement.appendChild(sparksCanvas);
        }

        return sparksCanvas;
    }

    function createFountainSpark(emitter) {
        const { width } = sparksViewport;
        const centerX = width / 2;
        const spread = (Math.random() - 0.5) * 0.32;
        const sideBias = width > 0 ? ((emitter.x - centerX) / centerX) * 0.34 : 0;
        const speed = 8 + Math.random() * 7;
        const angle = -Math.PI / 2 + spread + sideBias;

        return {
            x: emitter.x + (Math.random() - 0.5) * 10,
            y: emitter.y - 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.9 + Math.random() * 0.1,
            decay: 0.009 + Math.random() * 0.006,
            streak: 8 + Math.random() * 16,
            warmth: Math.random()
        };
    }

    function reflectSparkHorizontally(particle) {
        const { width } = sparksViewport;

        return {
            x: width - particle.x,
            y: particle.y,
            vx: -particle.vx,
            vy: particle.vy,
            life: particle.life,
            decay: particle.decay,
            streak: particle.streak,
            warmth: particle.warmth
        };
    }

    function spawnFountainSparks() {
        if (!finaleEffectsSpawning || finaleEffectsIntensity < 0.02) {
            return;
        }

        const emitters = sparkEmitters;
        if (!emitters.length) {
            return;
        }

        const headroom = SPARKS_MAX_PARTICLES - sparksParticles.length;
        if (headroom <= 0) {
            return;
        }

        const spawnChance = (emitters.length > 24 ? 0.65 : 0.85) * finaleEffectsIntensity;
        const maxPerFrame = Math.min(
            headroom,
            Math.max(1, Math.ceil(emitters.length * 0.45 * finaleEffectsIntensity))
        );
        let spawned = 0;
        const centerX = sparksViewport.width / 2;

        for (let i = 0; i < emitters.length && spawned < maxPerFrame; i += 1) {
            const emitter = emitters[(sparkEmitterOffset + i) % emitters.length];
            if (Math.random() > spawnChance) {
                continue;
            }

            const spark = createFountainSpark(emitter);
            sparksParticles.push(spark);
            spawned += 1;

            const isNearCenter = Math.abs(emitter.x - centerX) < 10;
            if (!isNearCenter && sparksParticles.length < SPARKS_MAX_PARTICLES) {
                sparksParticles.push(reflectSparkHorizontally(spark));
                spawned += 1;
            }

            if (spawned < maxPerFrame && sparksParticles.length < SPARKS_MAX_PARTICLES && Math.random() < 0.25) {
                const extraSpark = createFountainSpark(emitter);
                sparksParticles.push(extraSpark);
                spawned += 1;

                if (!isNearCenter && sparksParticles.length < SPARKS_MAX_PARTICLES) {
                    sparksParticles.push(reflectSparkHorizontally(extraSpark));
                    spawned += 1;
                }
            }
        }

        sparkEmitterOffset = (sparkEmitterOffset + 1) % emitters.length;
    }

    function hslToRgba(h, s, l, a) {
        const hue = ((h % 360) + 360) % 360;
        const sat = Math.max(0, Math.min(100, s)) / 100;
        const lit = Math.max(0, Math.min(100, l)) / 100;
        const chroma = (1 - Math.abs(2 * lit - 1)) * sat;
        const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = lit - chroma / 2;
        let r = 0;
        let g = 0;
        let b = 0;

        if (hue < 60) {
            r = chroma;
            g = x;
        } else if (hue < 120) {
            r = x;
            g = chroma;
        } else if (hue < 180) {
            g = chroma;
            b = x;
        } else if (hue < 240) {
            g = x;
            b = chroma;
        } else if (hue < 300) {
            r = x;
            b = chroma;
        } else {
            r = chroma;
            b = x;
        }

        return `rgba(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}, ${a})`;
    }

    function drawFountainSpark(particle) {
        const alpha = Math.min(1, particle.life * 1.15) * finaleEffectsIntensity;
        if (alpha <= 0.01) {
            return;
        }

        const warmth = particle.warmth;
        const speed = Math.hypot(particle.vx, particle.vy) || 1;
        const trail = particle.streak * particle.life;
        const tipX = particle.x - (particle.vx / speed) * trail * 0.2;
        const tipY = particle.y - (particle.vy / speed) * trail;
        const red = 255;
        const green = Math.round(228 + warmth * 22 * particle.life);
        const blue = Math.round(168 + warmth * 36 * (1 - particle.life));

        sparksCtx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        sparksCtx.lineWidth = warmth < 0.35 ? 1.6 : 1;
        sparksCtx.lineCap = 'round';
        sparksCtx.beginPath();
        sparksCtx.moveTo(particle.x, particle.y);
        sparksCtx.lineTo(tipX, tipY);
        sparksCtx.stroke();

        if (warmth < 0.45) {
            sparksCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
            sparksCtx.beginPath();
            sparksCtx.arc(particle.x, particle.y, 1.1, 0, Math.PI * 2);
            sparksCtx.fill();
        }
    }

    function animateSparks() {
        if (!sparksActive || !isOnEasterEggPage() || !sparksCanvas || !sparksCtx) {
            sparksAnimationId = null;
            return;
        }

        if (!sparksViewport.width || !sparksViewport.height) {
            resizeSparksCanvas();
        }

        const { width, height } = sparksViewport;

        spawnFountainSparks();
        sparksCtx.clearRect(0, 0, width, height);

        let writeIndex = 0;
        for (let i = 0; i < sparksParticles.length; i += 1) {
            const particle = sparksParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.16;
            particle.vx *= 0.992;
            particle.life -= particle.decay;

            if (particle.life <= 0 || particle.y < -40) {
                continue;
            }

            drawFountainSpark(particle);
            sparksParticles[writeIndex] = particle;
            writeIndex += 1;
        }

        sparksParticles.length = writeIndex;
        sparksAnimationId = window.requestAnimationFrame(animateSparks);
    }

    function startEasterEggSparks() {
        if (prefersReducedMotion || !isOnEasterEggPage()) {
            return;
        }

        ensureSparksCanvas();
        sparksCanvas.classList.add('is-active');
        sparksCtx = sparksCanvas.getContext('2d');
        resizeSparksCanvas();
        sparksActive = true;

        if (!sparksResizeHandler) {
            sparksResizeHandler = () => resizeSparksCanvas();
            window.addEventListener('resize', sparksResizeHandler);
        }

        if (!sparksAnimationId) {
            sparksAnimationId = window.requestAnimationFrame(animateSparks);
        }
    }

    function stopEasterEggSparks() {
        sparksActive = false;

        if (sparksResizeHandler) {
            window.removeEventListener('resize', sparksResizeHandler);
            sparksResizeHandler = null;
        }

        if (sparksAnimationId) {
            window.cancelAnimationFrame(sparksAnimationId);
            sparksAnimationId = null;
        }

        sparksParticles = [];
        sparksViewport = { width: 0, height: 0 };
        sparkEmitters = [];
        sparkEmitterOffset = 0;

        if (sparksCanvas) {
            sparksCanvas.classList.remove('is-active');
        }

        if (sparksCtx && sparksCanvas) {
            sparksCtx.clearRect(0, 0, sparksCanvas.width, sparksCanvas.height);
        }
    }

    function resizeFireworksCanvas() {
        if (!fireworksCanvas || !fireworksCtx) {
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = FIREWORKS_MAX_DPR;

        fireworksViewport.width = width;
        fireworksViewport.height = height;

        Object.assign(fireworksCanvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            zIndex: '8500'
        });

        fireworksCanvas.width = Math.floor(width * ratio);
        fireworksCanvas.height = Math.floor(height * ratio);
        fireworksCtx = fireworksCanvas.getContext('2d');
        fireworksCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function createFireworkRocket(width, height) {
        const margin = 48;
        const launchFromBottom = Math.random() < 0.72;
        let startX;
        let startY;

        if (launchFromBottom) {
            startX = margin + Math.random() * (width - margin * 2);
            startY = height - 8 - Math.random() * 24;
        } else {
            const fromLeft = Math.random() < 0.5;
            startX = fromLeft ? margin * 0.5 : width - margin * 0.5;
            startY = height * 0.45 + Math.random() * height * 0.45;
        }

        const targetX = margin + Math.random() * (width - margin * 2);
        const targetY = height * 0.08 + Math.random() * height * 0.62;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.hypot(dx, dy) || 1;
        const speed = 6.5 + Math.random() * 5;

        return {
            x: startX,
            y: startY,
            targetX,
            targetY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            hue: Math.random() * 360,
            trail: []
        };
    }

    function explodeFirework(x, y, hue) {
        const burstCount = 36 + Math.floor(Math.random() * 28);
        const headroom = FIREWORKS_MAX_PARTICLES - fireworksParticles.length;
        const count = Math.min(burstCount, headroom);

        for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
            const speed = 1.8 + Math.random() * 5.5;

            fireworksParticles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.95 + Math.random() * 0.05,
                decay: 0.01 + Math.random() * 0.012,
                hue: hue + (Math.random() - 0.5) * 36,
                size: 1.2 + Math.random() * 2.2,
                sparkle: Math.random() < 0.35
            });
        }

        if (fireworksParticles.length < FIREWORKS_MAX_PARTICLES && Math.random() < 0.65) {
            const ringCount = 14 + Math.floor(Math.random() * 10);
            for (let i = 0; i < ringCount; i += 1) {
                const angle = (Math.PI * 2 * i) / ringCount;
                const speed = 0.8 + Math.random() * 2.2;
                fireworksParticles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.7 + Math.random() * 0.2,
                    decay: 0.018 + Math.random() * 0.01,
                    hue: hue + 180 + (Math.random() - 0.5) * 40,
                    size: 1 + Math.random(),
                    sparkle: true
                });
            }
        }
    }

    function spawnFireworks() {
        if (!fireworksSpawning || finaleEffectsIntensity < 0.02) {
            return;
        }

        const { width, height } = fireworksViewport;
        if (!width || !height) {
            return;
        }

        const launchBudget = Math.ceil((3 + Math.random() * 3) * finaleEffectsIntensity);
        for (let i = 0; i < launchBudget; i += 1) {
            if (fireworksRockets.length >= FIREWORKS_MAX_ROCKETS) {
                break;
            }

            fireworksRockets.push(createFireworkRocket(width, height));
        }
    }

    function drawFireworkRocket(rocket) {
        const intensity = finaleEffectsIntensity;
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 10) {
            rocket.trail.shift();
        }

        fireworksCtx.lineCap = 'round';
        for (let i = 0; i < rocket.trail.length; i += 1) {
            const point = rocket.trail[i];
            const trailAlpha = ((i + 1) / rocket.trail.length) * 0.75 * intensity;
            fireworksCtx.fillStyle = hslToRgba(rocket.hue, 95, 72, trailAlpha);
            fireworksCtx.beginPath();
            fireworksCtx.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
            fireworksCtx.fill();
        }

        fireworksCtx.fillStyle = hslToRgba(rocket.hue, 100, 88, intensity);
        fireworksCtx.beginPath();
        fireworksCtx.arc(rocket.x, rocket.y, 2.2, 0, Math.PI * 2);
        fireworksCtx.fill();
    }

    function drawFireworkParticle(particle) {
        const alpha = particle.life * finaleEffectsIntensity;
        if (alpha <= 0.01) {
            return;
        }

        const lightness = particle.sparkle ? 78 + particle.life * 18 : 58 + particle.life * 22;
        fireworksCtx.fillStyle = hslToRgba(particle.hue, 92, lightness, alpha);
        fireworksCtx.beginPath();
        fireworksCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        fireworksCtx.fill();

        if (particle.sparkle && alpha > 0.2) {
            fireworksCtx.fillStyle = hslToRgba(particle.hue, 70, 95, alpha * 0.55);
            fireworksCtx.beginPath();
            fireworksCtx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2);
            fireworksCtx.fill();
        }
    }

    function animateFireworks() {
        if (!fireworksActive || !isOnEasterEggPage() || !fireworksCanvas || !fireworksCtx) {
            fireworksAnimationId = null;
            return;
        }

        if (!fireworksViewport.width || !fireworksViewport.height) {
            resizeFireworksCanvas();
        }

        const { width, height } = fireworksViewport;

        spawnFireworks();
        fireworksCtx.clearRect(0, 0, width, height);

        fireworksRockets = fireworksRockets.filter((rocket) => {
            rocket.x += rocket.vx;
            rocket.y += rocket.vy;

            const dist = Math.hypot(rocket.x - rocket.targetX, rocket.y - rocket.targetY);
            const reachedTarget = dist < 12;
            const overshot = (rocket.vy < 0 && rocket.y <= rocket.targetY)
                || (rocket.vy > 0 && rocket.y >= rocket.targetY)
                || rocket.x < -20
                || rocket.x > width + 20
                || rocket.y < -20
                || rocket.y > height + 20;

            if (reachedTarget || overshot) {
                explodeFirework(rocket.x, rocket.y, rocket.hue);
                return false;
            }

            drawFireworkRocket(rocket);
            return true;
        });

        let writeIndex = 0;
        for (let i = 0; i < fireworksParticles.length; i += 1) {
            const particle = fireworksParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.07;
            particle.vx *= 0.985;
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                continue;
            }

            drawFireworkParticle(particle);
            fireworksParticles[writeIndex] = particle;
            writeIndex += 1;
        }

        fireworksParticles.length = writeIndex;
        fireworksAnimationId = window.requestAnimationFrame(animateFireworks);
    }

    function ensureFireworksCanvas() {
        fireworksCanvas = document.getElementById(FIREWORKS_CANVAS_ID);
        if (!fireworksCanvas) {
            fireworksCanvas = document.createElement('canvas');
            fireworksCanvas.id = FIREWORKS_CANVAS_ID;
            fireworksCanvas.className = 'easter-egg-fireworks';
            fireworksCanvas.setAttribute('aria-hidden', 'true');
            document.documentElement.appendChild(fireworksCanvas);
        }

        return fireworksCanvas;
    }

    function startEasterEggFireworks() {
        if (prefersReducedMotion || !isOnEasterEggPage()) {
            return;
        }

        ensureFireworksCanvas();
        fireworksCanvas.classList.add('is-active');
        fireworksCtx = fireworksCanvas.getContext('2d');
        resizeFireworksCanvas();
        fireworksActive = true;
        fireworksSpawning = true;

        if (!fireworksResizeHandler) {
            fireworksResizeHandler = () => resizeFireworksCanvas();
            window.addEventListener('resize', fireworksResizeHandler);
        }

        if (!fireworksAnimationId) {
            fireworksAnimationId = window.requestAnimationFrame(animateFireworks);
        }
    }

    function stopEasterEggFireworks() {
        fireworksActive = false;
        fireworksSpawning = false;

        if (fireworksResizeHandler) {
            window.removeEventListener('resize', fireworksResizeHandler);
            fireworksResizeHandler = null;
        }

        if (fireworksAnimationId) {
            window.cancelAnimationFrame(fireworksAnimationId);
            fireworksAnimationId = null;
        }

        fireworksRockets = [];
        fireworksParticles = [];
        fireworksViewport = { width: 0, height: 0 };

        if (fireworksCanvas) {
            fireworksCanvas.classList.remove('is-active');
        }

        if (fireworksCtx && fireworksCanvas) {
            fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        }
    }

    function resizeFireflyCanvas() {
        if (!fireflyCanvas || !fireflyCtx) {
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = FIREFLY_MAX_DPR;

        fireflyViewport.width = width;
        fireflyViewport.height = height;

        Object.assign(fireflyCanvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none'
        });

        fireflyCanvas.width = Math.floor(width * ratio);
        fireflyCanvas.height = Math.floor(height * ratio);
        fireflyCtx = fireflyCanvas.getContext('2d');
        fireflyCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function createFirefly(width, height) {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            size: 0.75 + Math.random() * 1,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: 0.018 + Math.random() * 0.035,
            baseOpacity: 0.65 + Math.random() * 0.35,
            wanderPhase: Math.random() * Math.PI * 2,
            hueShift: Math.random()
        };
    }

    function seedFireflies(width, height) {
        const count = Math.min(90, Math.max(36, Math.floor((width * height) / 18000)));
        fireflies = Array.from({ length: count }, () => createFirefly(width, height));
    }

    function drawFirefly(firefly) {
        const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(firefly.phase));
        const alpha = pulse * firefly.baseOpacity;
        const glowRadius = firefly.size * (1.15 + pulse * 2.1);
        const cool = firefly.hueShift;

        const coreR = Math.round(228 + cool * 20);
        const coreG = Math.round(240 + cool * 12);
        const coreB = 255;
        const midR = Math.round(170 + cool * 30);
        const midG = Math.round(205 + cool * 20);
        const midB = 255;

        const gradient = fireflyCtx.createRadialGradient(
            firefly.x,
            firefly.y,
            0,
            firefly.x,
            firefly.y,
            glowRadius
        );
        gradient.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(${midR}, ${midG}, ${midB}, ${alpha * 0.42})`);
        gradient.addColorStop(1, 'rgba(120, 170, 255, 0)');

        fireflyCtx.fillStyle = gradient;
        fireflyCtx.beginPath();
        fireflyCtx.arc(firefly.x, firefly.y, glowRadius, 0, Math.PI * 2);
        fireflyCtx.fill();
    }

    function updateFireflyMouseTrail(clientX, clientY) {
        const now = performance.now();

        if (fireflyMouse.lastMoveAt) {
            fireflyMouse.vx = clientX - fireflyMouse.lastX;
            fireflyMouse.vy = clientY - fireflyMouse.lastY;
            fireflyMouse.speed = Math.hypot(fireflyMouse.vx, fireflyMouse.vy);
        }

        fireflyMouse.x = clientX;
        fireflyMouse.y = clientY;
        fireflyMouse.lastX = clientX;
        fireflyMouse.lastY = clientY;
        fireflyMouse.lastMoveAt = now;
        fireflyMouse.trail.push({ x: clientX, y: clientY, t: now });

        while (fireflyMouse.trail.length > FIREFLY_MOUSE_TRAIL_MAX) {
            fireflyMouse.trail.shift();
        }

        while (fireflyMouse.trail.length && now - fireflyMouse.trail[0].t > FIREFLY_MOUSE_TRAIL_MS) {
            fireflyMouse.trail.shift();
        }
    }

    function applyFireflyMouseRepulsion(firefly) {
        const now = performance.now();

        if (!fireflyMouse.trail.length || now - fireflyMouse.lastMoveAt > 280) {
            return;
        }

        let strongest = 0;
        let pushX = 0;
        let pushY = 0;
        const speedFactor = Math.min(1, fireflyMouse.speed / 10);

        fireflyMouse.trail.forEach((point) => {
            const dx = firefly.x - point.x;
            const dy = firefly.y - point.y;
            const dist = Math.hypot(dx, dy);

            if (dist >= FIREFLY_MOUSE_REPEL_RADIUS || dist < 0.001) {
                return;
            }

            const falloff = 1 - dist / FIREFLY_MOUSE_REPEL_RADIUS;
            const force = falloff * falloff * FIREFLY_MOUSE_REPEL_STRENGTH * (0.4 + speedFactor * 0.6);

            if (force > strongest) {
                strongest = force;
                pushX = (dx / dist) * force;
                pushY = (dy / dist) * force;
            }
        });

        firefly.vx += pushX;
        firefly.vy += pushY;
    }

    function bindFireflyPointerTracking() {
        if (fireflyPointerHandler) {
            return;
        }

        fireflyPointerHandler = (event) => {
            updateFireflyMouseTrail(event.clientX, event.clientY);
        };

        window.addEventListener('pointermove', fireflyPointerHandler, { passive: true });
    }

    function unbindFireflyPointerTracking() {
        if (!fireflyPointerHandler) {
            return;
        }

        window.removeEventListener('pointermove', fireflyPointerHandler);
        fireflyPointerHandler = null;
        fireflyMouse.trail = [];
        fireflyMouse.lastMoveAt = 0;
        fireflyMouse.speed = 0;
        fireflyMouse.vx = 0;
        fireflyMouse.vy = 0;
    }

    function animateFireflies() {
        if (!fireflyActive || !fireflyCanvas || !fireflyCtx) {
            fireflyAnimationId = null;
            return;
        }

        if (!isFireflyDarkModeActive()) {
            fireflyCanvas.classList.remove('is-active');

            if (fireflyCtx) {
                fireflyCtx.clearRect(0, 0, fireflyCanvas.width, fireflyCanvas.height);
            }

            fireflyAnimationId = null;
            return;
        }

        fireflyCanvas.classList.add('is-active');

        if (!fireflyViewport.width || !fireflyViewport.height) {
            resizeFireflyCanvas();
        }

        const { width, height } = fireflyViewport;

        fireflyCtx.clearRect(0, 0, width, height);

        fireflies.forEach((firefly) => {
            firefly.wanderPhase += 0.012;
            firefly.phase += firefly.phaseSpeed;
            firefly.vx += Math.sin(firefly.wanderPhase) * 0.0025;
            firefly.vy += Math.cos(firefly.wanderPhase * 0.9) * 0.0025;

            applyFireflyMouseRepulsion(firefly);

            firefly.vx *= FIREFLY_VELOCITY_DAMPING;
            firefly.vy *= FIREFLY_VELOCITY_DAMPING;

            const speed = Math.hypot(firefly.vx, firefly.vy);
            if (speed > FIREFLY_MAX_SPEED) {
                const scale = FIREFLY_MAX_SPEED / speed;
                firefly.vx *= scale;
                firefly.vy *= scale;
            }

            firefly.x += firefly.vx;
            firefly.y += firefly.vy;

            if (firefly.x < -12) {
                firefly.x = width + 12;
            } else if (firefly.x > width + 12) {
                firefly.x = -12;
            }

            if (firefly.y < -12) {
                firefly.y = height + 12;
            } else if (firefly.y > height + 12) {
                firefly.y = -12;
            }

            drawFirefly(firefly);
        });

        fireflyAnimationId = window.requestAnimationFrame(animateFireflies);
    }

    function ensureFireflyAnimationLoop() {
        if (fireflyActive && isFireflyDarkModeActive() && !fireflyAnimationId) {
            fireflyAnimationId = window.requestAnimationFrame(animateFireflies);
        }
    }

    function ensureFireflyCanvas() {
        fireflyCanvas = document.getElementById(FIREFLY_CANVAS_ID);
        if (!fireflyCanvas) {
            fireflyCanvas = document.createElement('canvas');
            fireflyCanvas.id = FIREFLY_CANVAS_ID;
            fireflyCanvas.className = 'easter-egg-fireflies';
            fireflyCanvas.setAttribute('aria-hidden', 'true');
            document.documentElement.appendChild(fireflyCanvas);
        }

        return fireflyCanvas;
    }

    function isFireflyDarkModeActive() {
        const html = document.documentElement;
        return html.classList.contains('system-dark-mode') || html.classList.contains('easter-egg-dark-mode');
    }

    function startEasterEggFireflies() {
        if (prefersReducedMotion || !isFireflyDarkModeActive()) {
            return;
        }

        ensureFireflyCanvas();
        fireflyCanvas.classList.add('is-active');
        fireflyCtx = fireflyCanvas.getContext('2d');
        resizeFireflyCanvas();

        if (!fireflies.length) {
            seedFireflies(fireflyViewport.width, fireflyViewport.height);
        }

        fireflyActive = true;
        bindFireflyPointerTracking();

        if (!fireflyResizeHandler) {
            fireflyResizeHandler = () => resizeFireflyCanvas();
            window.addEventListener('resize', fireflyResizeHandler);
        }

        if (!fireflyAnimationId) {
            fireflyAnimationId = window.requestAnimationFrame(animateFireflies);
        }
    }

    function stopEasterEggFireflies() {
        fireflyActive = false;
        cancelFireflyVisibilityFade();
        unbindFireflyPointerTracking();

        if (fireflyResizeHandler) {
            window.removeEventListener('resize', fireflyResizeHandler);
            fireflyResizeHandler = null;
        }

        if (fireflyAnimationId) {
            window.cancelAnimationFrame(fireflyAnimationId);
            fireflyAnimationId = null;
        }

        fireflies = [];
        fireflyViewport = { width: 0, height: 0 };

        if (fireflyCanvas) {
            fireflyCanvas.classList.remove('is-active', 'is-fading-in', 'is-continuous');
            fireflyCanvas.style.removeProperty('opacity');
        }

        if (fireflyCtx && fireflyCanvas) {
            fireflyCtx.clearRect(0, 0, fireflyCanvas.width, fireflyCanvas.height);
        }
    }

    function cancelFireflyVisibilityFade() {
        if (fireflyVisibilityFadeTimer) {
            window.clearTimeout(fireflyVisibilityFadeTimer);
            fireflyVisibilityFadeTimer = null;
        }
    }

    function markFirefliesContinuous() {
        if (!fireflyCanvas) {
            return;
        }

        fireflyCanvas.classList.add('is-continuous');
        fireflyCanvas.style.opacity = '1';
    }

    function fadeInFirefliesCanvas() {
        if (!fireflyCanvas) {
            return;
        }

        cancelFireflyVisibilityFade();
        fireflyCanvas.style.removeProperty('opacity');
        fireflyCanvas.classList.remove('is-continuous');

        if (prefersReducedMotion) {
            fireflyCanvas.classList.add('is-fading-in');
            markFirefliesContinuous();
            return;
        }

        const onFadeInEnd = (event) => {
            if (event.target !== fireflyCanvas || event.propertyName !== 'opacity') {
                return;
            }

            fireflyCanvas.removeEventListener('transitionend', onFadeInEnd);
            markFirefliesContinuous();
        };

        fireflyCanvas.addEventListener('transitionend', onFadeInEnd);
        fireflyVisibilityFadeTimer = window.setTimeout(() => {
            fireflyCanvas.removeEventListener('transitionend', onFadeInEnd);
            if (fireflyCanvas.classList.contains('is-fading-in')) {
                markFirefliesContinuous();
            }
        }, FIREFLY_FADE_MS + 80);

        fireflyCanvas.classList.remove('is-fading-in');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                fireflyCanvas?.classList.add('is-fading-in');
            });
        });
    }

    function fadeOutFirefliesCanvas(onComplete) {
        if (!fireflyCanvas) {
            onComplete?.();
            return;
        }

        cancelFireflyVisibilityFade();

        if (prefersReducedMotion || !fireflyCanvas.classList.contains('is-fading-in')) {
            onComplete?.();
            return;
        }

        const finish = () => {
            cancelFireflyVisibilityFade();
            onComplete?.();
        };

        const onTransitionEnd = (event) => {
            if (event.target !== fireflyCanvas || event.propertyName !== 'opacity') {
                return;
            }

            fireflyCanvas.removeEventListener('transitionend', onTransitionEnd);
            finish();
        };

        fireflyCanvas.addEventListener('transitionend', onTransitionEnd);
        fireflyCanvas.classList.remove('is-fading-in');
        fireflyVisibilityFadeTimer = window.setTimeout(() => {
            fireflyCanvas.removeEventListener('transitionend', onTransitionEnd);
            finish();
        }, FIREFLY_FADE_MS + 80);
    }

    function syncFireflies() {
        if (isFireflyDarkModeActive() && !prefersReducedMotion) {
            const isAlreadyContinuous = fireflyCanvas?.classList.contains('is-continuous');
            const shouldFadeIn = !fireflyActive || (!fireflyCanvas?.classList.contains('is-fading-in') && !isAlreadyContinuous);
            startEasterEggFireflies();

            if (shouldFadeIn) {
                fadeInFirefliesCanvas();
            } else {
                ensureFireflyAnimationLoop();
            }

            return;
        }

        if (fireflyActive && fireflyCanvas?.classList.contains('is-continuous')) {
            fireflyCanvas.classList.remove('is-continuous');
            fireflyCanvas.classList.add('is-fading-in');
            fadeOutFirefliesCanvas(() => stopEasterEggFireflies());
            return;
        }

        if (fireflyActive && fireflyCanvas?.classList.contains('is-fading-in')) {
            fadeOutFirefliesCanvas(() => stopEasterEggFireflies());
            return;
        }

        stopEasterEggFireflies();
    }

    function runPauseAwareFade(durationMs, onProgress, onComplete) {
        let startWall = null;
        let pausedAt = null;
        let cancelled = false;
        let rafId = null;

        function cancel() {
            cancelled = true;
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        function tick(wallNow) {
            if (cancelled) {
                return;
            }

            if (window.isEasterEggAudioPaused?.()) {
                if (pausedAt === null) {
                    pausedAt = wallNow;
                }
                rafId = window.requestAnimationFrame(tick);
                return;
            }

            if (pausedAt !== null) {
                startWall += wallNow - pausedAt;
                pausedAt = null;
            }

            if (startWall === null) {
                startWall = wallNow;
            }

            const progress = Math.min(1, (wallNow - startWall) / durationMs);
            const eased = progress * (2 - progress);
            onProgress(eased);

            if (progress < 1) {
                rafId = window.requestAnimationFrame(tick);
                return;
            }

            rafId = null;
            onComplete?.();
        }

        rafId = window.requestAnimationFrame(tick);
        return cancel;
    }

    function clearEasterEggTimeline() {
        easterEggTimelineScheduled = false;
        pauseEasterEggTimelineDriver();
        easterEggMilestonesFired.clear();
    }

    let easterEggAudioListenersBound = false;

    function handleEasterEggAudioPlay() {
        if (!isOnEasterEggPage()) {
            return;
        }

        if (easterEggShowEnded) {
            restartEasterEggShow();
            return;
        }

        if (!easterEggTimelineScheduled) {
            scheduleEasterEggTimeline();
            return;
        }

        resumeEasterEggTimelineDriver();
    }

    function bindEasterEggAudioListeners() {
        if (easterEggAudioListenersBound) {
            return;
        }

        easterEggAudioListenersBound = true;
        window.addEventListener('easter-egg-audio-play', handleEasterEggAudioPlay);
        window.addEventListener('easter-egg-audio-pause', pauseEasterEggTimelineDriver);
        window.addEventListener('easter-egg-audio-ended', finalizeEasterEggShow);
    }

    function unbindEasterEggAudioListeners() {
        if (!easterEggAudioListenersBound) {
            return;
        }

        easterEggAudioListenersBound = false;
        window.removeEventListener('easter-egg-audio-play', handleEasterEggAudioPlay);
        window.removeEventListener('easter-egg-audio-pause', pauseEasterEggTimelineDriver);
        window.removeEventListener('easter-egg-audio-ended', finalizeEasterEggShow);
    }

    function getEasterEggAudioTimeMs() {
        return window.getEasterEggAudioTimeMs?.() ?? null;
    }

    function processEasterEggTimeline(audioTimeMs) {
        const milestones = [
            { at: EASTER_EGG_FIRST_START_MS, id: 'first-start', handler: startEasterEggFirstSegment },
            { at: EASTER_EGG_FIRST_STOP_MS, id: 'first-stop', handler: stopEasterEggAllAnimations },
            { at: EASTER_EGG_SECOND_START_MS, id: 'second-start', handler: startEasterEggSecondSegment },
            { at: EASTER_EGG_SECOND_STOP_MS, id: 'second-stop', handler: stopEasterEggAllAnimations },
            { at: EASTER_EGG_DURATION_MS, id: 'end', handler: finalizeEasterEggShow }
        ];

        milestones.forEach((milestone) => {
            if (easterEggMilestonesFired.has(milestone.id) || audioTimeMs < milestone.at) {
                return;
            }

            easterEggMilestonesFired.add(milestone.id);
            milestone.handler();
        });
    }

    function tickEasterEggTimeline() {
        if (!isOnEasterEggPage() || easterEggShowEnded) {
            pauseEasterEggTimelineDriver();
            return;
        }

        const audioTimeMs = getEasterEggAudioTimeMs();
        if (audioTimeMs === null) {
            easterEggTimelineRaf = window.requestAnimationFrame(tickEasterEggTimeline);
            return;
        }

        if (window.isEasterEggAudioPaused?.()) {
            easterEggTimelineRaf = null;
            return;
        }

        processEasterEggTimeline(audioTimeMs);
        easterEggTimelineRaf = window.requestAnimationFrame(tickEasterEggTimeline);
    }

    function resumeEasterEggTimelineDriver() {
        if (!easterEggTimelineScheduled || easterEggShowEnded || !isOnEasterEggPage()) {
            return;
        }

        if (!easterEggTimelineRaf) {
            easterEggTimelineRaf = window.requestAnimationFrame(tickEasterEggTimeline);
        }
    }

    function pauseEasterEggTimelineDriver() {
        if (easterEggTimelineRaf) {
            window.cancelAnimationFrame(easterEggTimelineRaf);
            easterEggTimelineRaf = null;
        }
    }

    function scheduleEasterEggTimeline() {
        if (easterEggTimelineScheduled) {
            resumeEasterEggTimelineDriver();
            return;
        }

        if (prefersReducedMotion || !isOnEasterEggPage() || easterEggShowEnded) {
            return;
        }

        easterEggTimelineScheduled = true;
        easterEggMilestonesFired.clear();

        const audioTimeMs = getEasterEggAudioTimeMs();
        if (audioTimeMs !== null && !window.isEasterEggAudioPaused?.()) {
            processEasterEggTimeline(audioTimeMs);
        }

        resumeEasterEggTimelineDriver();
    }

    function applyFinaleEffectsIntensity(intensity) {
        finaleEffectsIntensity = Math.max(0, Math.min(1, intensity));
        pageViewportEl?.style.setProperty('--shake-intensity', String(finaleEffectsIntensity));
        navEl?.style.setProperty('--shake-intensity', String(finaleEffectsIntensity));
    }

    function fadeFinaleEffectsTo(targetIntensity, onComplete) {
        cancelFinaleEffectsFade();

        const from = finaleEffectsIntensity;
        const to = Math.max(0, Math.min(1, targetIntensity));
        finaleEffectsFadeOnComplete = onComplete || null;

        finaleFadeCancel = runPauseAwareFade(EASTER_EGG_EFFECTS_FADE_MS, (progress) => {
            applyFinaleEffectsIntensity(from + (to - from) * progress);
        }, () => {
            finaleFadeCancel = null;
            const complete = finaleEffectsFadeOnComplete;
            finaleEffectsFadeOnComplete = null;
            complete?.();
        });
    }

    function cancelFinaleEffectsFade() {
        if (finaleFadeCancel) {
            finaleFadeCancel();
            finaleFadeCancel = null;
        }

        finaleEffectsFadeOnComplete = null;
    }

    function hardStopFinaleEffectsVisuals() {
        cancelFinaleEffectsFade();
        finaleEffectsSpawning = false;
        applyFinaleEffectsIntensity(0);
        stopEasterEggShake();
        stopEasterEggSparks();
        stopEasterEggFireworks();
        pageViewportEl?.style.removeProperty('--shake-intensity');
        navEl?.style.removeProperty('--shake-intensity');
    }

    function fadeOutEasterEggFinaleEffects(onComplete) {
        if (prefersReducedMotion) {
            hardStopFinaleEffectsVisuals();
            onComplete?.();
            return;
        }

        finaleEffectsSpawning = false;
        fireworksSpawning = false;
        fadeFinaleEffectsTo(0, () => {
            hardStopFinaleEffectsVisuals();
            onComplete?.();
        });
    }

    function startEasterEggFinaleEffectsSudden(includeFireworks = false) {
        if (!easterEggFinaleActive || prefersReducedMotion) {
            return;
        }

        cancelFinaleEffectsFade();
        finaleEffectsSpawning = true;
        fireworksSpawning = includeFireworks;
        startEasterEggShake();
        startEasterEggSparks();
        applyFinaleEffectsIntensity(1);

        if (includeFireworks) {
            startEasterEggFireworks();
        }
    }

    function syncEasterEggMusicCover(useIntro) {
        window.setEasterEggMusicCover?.(useIntro ? EASTER_EGG_GIF_INTRO_SRC : EASTER_EGG_GIF_SPIN_SRC);
    }

    function setStableEasterEggCat() {
        resetEasterEggGifToSingle(true);
        syncEasterEggMusicCover(true);
    }

    function setSpinningEasterEggCats(count) {
        setEasterEggGifCount(count);
        syncEasterEggMusicCover(false);
    }

    function startEasterEggFirstSegment() {
        if (!isOnEasterEggPage() || easterEggShowEnded) {
            return;
        }

        easterEggFinaleActive = true;
        startEasterEggFinaleEffectsSudden(false);
        setSpinningEasterEggCats(12);
    }

    function startEasterEggSecondSegment() {
        if (!isOnEasterEggPage() || easterEggShowEnded) {
            return;
        }

        easterEggFinaleActive = true;
        startEasterEggFinaleEffectsSudden(true);
        setSpinningEasterEggCats(24);
    }

    function stopEasterEggAllAnimations() {
        fadeOutEasterEggFinaleEffects(() => {
            setStableEasterEggCat();
            easterEggFinaleActive = false;
        });
    }

    function finalizeEasterEggShow() {
        if (easterEggShowEnded) {
            return;
        }

        easterEggShowEnded = true;
        clearEasterEggTimeline();
        finaleEffectsSpawning = false;
        fireworksSpawning = false;
        easterEggFinaleActive = false;
        hardStopFinaleEffectsVisuals();
        syncFireflies();

        if (easterEggGifSwapTimer) {
            window.clearTimeout(easterEggGifSwapTimer);
            easterEggGifSwapTimer = null;
        }

        setStableEasterEggCat();
    }

    function restartEasterEggShow() {
        if (!isOnEasterEggPage() || prefersReducedMotion) {
            return;
        }

        clearEasterEggTimeline();
        cancelFinaleEffectsFade();
        cancelFireflyFade();
        hardStopFinaleEffectsVisuals();

        easterEggShowEnded = false;
        easterEggFinaleActive = false;
        finaleEffectsSpawning = false;
        fireworksSpawning = false;
        easterEggMilestonesFired.clear();
        easterEggTimelineScheduled = false;

        window.resetEasterEggAudioPosition?.();
        setStableEasterEggCat();
        startEasterEggDarkMode();
        scheduleEasterEggTimeline();
    }

    function getEasterEggGifStage() {
        return document.querySelector('.easter-egg-gif-stage');
    }

    function getEasterEggBubble() {
        return document.querySelector('.easter-egg-bubble');
    }

    function createEasterEggGifElement(src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'U I A cat';
        img.className = 'easter-egg-gif';
        img.width = 200;
        img.height = 200;
        img.loading = 'lazy';
        img.decoding = 'async';
        return img;
    }

    function setEasterEggGifCount(count) {
        const stage = getEasterEggGifStage();
        const bubble = getEasterEggBubble();
        if (!stage) {
            return;
        }

        if (easterEggGifSwapTimer) {
            window.clearTimeout(easterEggGifSwapTimer);
            easterEggGifSwapTimer = null;
        }

        stage.replaceChildren();

        if (count <= 1) {
            stage.classList.remove('is-multi');
            stage.removeAttribute('data-count');
            bubble?.classList.remove('is-multi-cats');
            stage.appendChild(createEasterEggGifElement(EASTER_EGG_GIF_SPIN_SRC));
            return;
        }

        stage.classList.add('is-multi');
        stage.dataset.count = String(count);
        bubble?.classList.add('is-multi-cats');

        for (let i = 0; i < count; i += 1) {
            stage.appendChild(createEasterEggGifElement(EASTER_EGG_GIF_SPIN_SRC));
        }
    }

    function resetEasterEggGifToSingle(useIntro = false) {
        const stage = getEasterEggGifStage();
        const bubble = getEasterEggBubble();
        if (!stage) {
            return;
        }

        if (easterEggGifSwapTimer) {
            window.clearTimeout(easterEggGifSwapTimer);
            easterEggGifSwapTimer = null;
        }

        stage.classList.remove('is-multi');
        stage.removeAttribute('data-count');
        bubble?.classList.remove('is-multi-cats');
        stage.replaceChildren();

        const img = createEasterEggGifElement(useIntro ? EASTER_EGG_GIF_INTRO_SRC : EASTER_EGG_GIF_SPIN_SRC);
        stage.appendChild(img);
    }

    function cancelFireflyFade() {
        if (fireflyFadeCancel) {
            fireflyFadeCancel();
            fireflyFadeCancel = null;
        }
    }

    function fadeOutFireflies(onComplete) {
        if (!fireflyActive || !fireflyCanvas) {
            onComplete?.();
            return;
        }

        if (prefersReducedMotion) {
            stopEasterEggFireflies();
            onComplete?.();
            return;
        }

        cancelFireflyFade();
        const fromOpacity = parseFloat(fireflyCanvas.style.opacity || '1');

        fireflyFadeCancel = runPauseAwareFade(EASTER_EGG_EFFECTS_FADE_MS, (progress) => {
            fireflyCanvas.style.opacity = String(fromOpacity * (1 - progress));
        }, () => {
            fireflyFadeCancel = null;
            fireflyCanvas.style.removeProperty('opacity');
            syncFireflies();
            onComplete?.();
        });
    }

    function startEasterEggFirefliesSudden() {
        cancelFireflyFade();

        if (!fireflyActive) {
            startEasterEggFireflies();
        }

        if (fireflyCanvas) {
            fireflyCanvas.style.opacity = '1';
        }
    }

    function startEasterEggShake() {
        document.documentElement.classList.add('easter-egg-finale-active');
        pageViewportEl?.classList.add('easter-egg-finale-shake');
        navEl?.classList.add('easter-egg-finale-shake');
        applyFinaleEffectsIntensity(finaleEffectsIntensity);
    }

    function stopEasterEggShake() {
        document.documentElement.classList.remove('easter-egg-finale-active');
        pageViewportEl?.classList.remove('easter-egg-finale-shake');
        navEl?.classList.remove('easter-egg-finale-shake');
    }

    function stopEasterEggFinale() {
        clearEasterEggTimeline();
        cancelFinaleEffectsFade();
        cancelFireflyFade();
        easterEggFinaleActive = false;
        hardStopFinaleEffectsVisuals();
    }

    function initEasterEggGif() {
        const stage = getEasterEggGifStage();
        if (!stage) {
            return;
        }

        if (easterEggGifSwapTimer) {
            window.clearTimeout(easterEggGifSwapTimer);
            easterEggGifSwapTimer = null;
        }

        stage.classList.remove('is-multi');
        stage.removeAttribute('data-count');
        getEasterEggBubble()?.classList.remove('is-multi-cats');
        stage.replaceChildren();
        stage.appendChild(createEasterEggGifElement(EASTER_EGG_GIF_INTRO_SRC));
        syncEasterEggMusicCover(true);
    }

    function resetEasterEggGif() {
        setStableEasterEggCat();
    }

    function syncEasterEggMusic(page) {
        if (page === EASTER_EGG_PAGE) {
            if (!easterEggMusicActive) {
                window.setEasterEggMusicTrack?.();
                easterEggMusicActive = true;
            }

            if (window.isMusicPaused?.()) {
                window.playMusic?.();
            }

            return;
        }

        if (easterEggMusicActive) {
            window.setDefaultMusicTrack?.();
            easterEggMusicActive = false;
        }
    }

    function startEasterEggDarkMode() {
        const html = document.documentElement;
        if (html.classList.contains('easter-egg-dark-mode')) {
            syncFireflies();
            return;
        }

        if (easterEggDarkModeTimer) {
            window.clearTimeout(easterEggDarkModeTimer);
            easterEggDarkModeTimer = null;
        }

        html.classList.add('easter-egg-dark-transition');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                html.classList.add('easter-egg-dark-mode');
                syncFireflies();
            });
        });
    }

    function stopEasterEggDarkMode() {
        const html = document.documentElement;
        if (!html.classList.contains('easter-egg-dark-transition') && !html.classList.contains('easter-egg-dark-mode')) {
            return;
        }

        if (easterEggDarkModeTimer) {
            window.clearTimeout(easterEggDarkModeTimer);
        }

        html.classList.remove('easter-egg-dark-mode');

        const transitionMs = prefersReducedMotion ? 0 : EASTER_EGG_DARK_TRANSITION_MS;
        easterEggDarkModeTimer = window.setTimeout(() => {
            easterEggDarkModeTimer = null;
            if (!html.classList.contains('easter-egg-dark-mode')) {
                html.classList.remove('easter-egg-dark-transition');
            }

            syncFireflies();
        }, transitionMs);

        syncFireflies();
    }

    function syncEasterEggEffects() {
        if (isOnEasterEggPage()) {
            bindEasterEggAudioListeners();
            startEasterEggDarkMode();

            if (!easterEggShowEnded) {
                scheduleEasterEggTimeline();
            }
            return;
        }

        easterEggShowEnded = false;
        unbindEasterEggAudioListeners();
        stopEasterEggFinale();
        stopEasterEggDarkMode();
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderParagraphs(paragraphs) {
        return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
    }

    function renderSectionHeader(container, heading, subtitle) {
        if (!container) {
            return;
        }
        container.innerHTML = `<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(subtitle)}</p>`;
    }

    function renderTimelineEvents(events) {
        return events.map((event) => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <time class="timeline-date">${escapeHtml(event.date)}</time>
                <p class="timeline-text">${escapeHtml(event.text)}</p>
            </div>
        `).join('');
    }

    function renderBubbleTrack(innerHtml) {
        return `<div class="about-bubbles-track">${innerHtml}</div>`;
    }

    function renderBubbleSections(sections) {
        return renderBubbleTrack(sections.map((section) => `
            <div class="bubble about-bubble">
                <h3>${escapeHtml(section.heading)}</h3>
                ${renderParagraphs(section.paragraphs)}
            </div>
        `).join(''));
    }

    function renderExperienceLabelParts(item) {
        const parts = item.labelParts.map((part) => {
            if (part.image) {
                return `<img class="experience-label-icon" src="${escapeHtml(part.image)}" alt="" width="36" height="36" loading="lazy" decoding="async" aria-hidden="true">`;
            }

            return `<span class="experience-label-part">${escapeHtml((part.text || '').trim())}</span>`;
        }).join('');

        return `<span class="experience-label-even">${parts}</span>`;
    }

    function renderExperienceIcon(item) {
        const image = item.image || item.images?.[0];

        if (!image) {
            return { html: '' };
        }

        return {
            html: `<span class="experience-icon" aria-hidden="true"><img class="experience-icon-img" src="${escapeHtml(image)}" alt="" width="36" height="36" loading="lazy" decoding="async"></span>`
        };
    }

    function registerExperienceItems(section, category) {
        if (!section?.items) {
            return;
        }

        section.items.forEach((item) => {
            experienceItemData[item.id] = { ...item, experienceCategory: category };
        });
    }

    function getExperiencePopupLogos(item) {
        if (item.popup?.logos?.length) {
            return item.popup.logos;
        }

        const logos = [];
        if (item.image) {
            logos.push(item.image);
        }

        if (item.labelParts) {
            item.labelParts.forEach((part) => {
                if (part.image) {
                    logos.push(part.image);
                }
            });
        }

        return logos;
    }

    function getExperienceOrganization(item) {
        if (item.popup?.organization) {
            return item.popup.organization;
        }

        if (item.labelParts) {
            return item.labelParts
                .map((part) => part.text || '')
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        return item.label || '';
    }

    function renderExperienceStatusDot(item) {
        const isCurrent = Boolean(item.current);
        const isInProgress = item.status === 'in-progress' || Boolean(item.inProgress);
        let statusClass = 'experience-status-dot';
        let label = 'Past';

        if (isCurrent) {
            statusClass += ' is-current';
            label = 'Current';
        } else if (isInProgress) {
            statusClass += ' is-in-progress';
            label = 'In progress';
        }

        return `<span class="${statusClass}" role="img" aria-label="${escapeHtml(label)}"></span>`;
    }

    function renderExperienceItems(items) {
        return items.map((item) => {
            const icon = renderExperienceIcon(item);
            const hasLabelParts = Boolean(item.labelParts?.length);
            const labelHtml = hasLabelParts
                ? renderExperienceLabelParts(item)
                : `<span class="experience-label">${escapeHtml(item.label || '')}</span>`;

            return `
            <button type="button" class="bubble experience-bubble${hasLabelParts ? ' experience-bubble-even' : ''}" data-experience="${escapeHtml(item.id)}" aria-haspopup="dialog" aria-controls="experiencePopup">
                ${icon.html}
                ${labelHtml}
                ${renderExperienceStatusDot(item)}
            </button>
        `;
        }).join('');
    }

    function renderExperienceColumn(headingEl, itemsEl, section) {
        if (headingEl && section?.heading) {
            headingEl.textContent = section.heading;
        }

        if (itemsEl && section?.items) {
            itemsEl.innerHTML = renderExperienceItems(section.items);
        }
    }

    function renderWaveSpans(text, startIndex = 0) {
        let index = startIndex;
        const html = [...text].map((char) => {
            if (char === ' ') {
                return '<span class="wave-space"> </span>';
            }
            const span = `<span class="wave-char" style="--wave-i:${index}">${escapeHtml(char)}</span>`;
            index += 1;
            return span;
        }).join('');

        return { html, nextIndex: index };
    }

    function initHomeWelcomeWave() {
        if (homeWelcomeWavePlayed || prefersReducedMotion) {
            return;
        }

        const welcomeLines = document.querySelectorAll('.home-welcome');
        if (!welcomeLines.length || welcomeLines[0].classList.contains('is-wave-ready')) {
            return;
        }

        let waveIndex = 0;
        let hasText = false;

        welcomeLines.forEach((welcomeEl) => {
            const text = welcomeEl.dataset.welcomeText || welcomeEl.textContent.trim();
            if (!text) {
                return;
            }

            hasText = true;
            const wave = renderWaveSpans(text, waveIndex);
            waveIndex = wave.nextIndex;
            welcomeEl.innerHTML = wave.html;
            welcomeEl.classList.add('is-wave-ready', 'is-waving');
        });

        if (hasText) {
            homeWelcomeWavePlayed = true;
        }
    }

    function renderContent(content) {
        const siteTitle = document.querySelector('[data-content="site-title"]');
        if (siteTitle && content.site?.title) {
            siteTitle.textContent = content.site.title;
        }

        const brandDates = document.querySelector('[data-content="brand-dates"]');
        if (brandDates && content.site?.dates) {
            brandDates.innerHTML = content.site.dates
                .map((line) => `<li role="none">${escapeHtml(line)}</li>`)
                .join('');
        }

        const homeBubble = document.querySelector('[data-content="home-bubble"]');
        if (homeBubble && content.home) {
            const paragraphs = content.home.paragraphs || [];
            homeBubble.innerHTML = `
                <h2>${escapeHtml(content.home.heading)}</h2>
                ${paragraphs.map((paragraph) => `
                    <p class="home-welcome" data-welcome-text="${escapeHtml(paragraph)}">${escapeHtml(paragraph)}</p>
                `).join('')}
            `;
        }

        const homeImage = document.querySelector('[data-content="home-image"]');
        if (homeImage && content.home?.imageAlt) {
            homeImage.alt = content.home.imageAlt;
        }

        if (content.home?.downloads) {
            content.home.downloads.forEach((download) => {
                const button = document.querySelector(`[data-download-id="${download.id}"]`);
                if (!button) {
                    return;
                }
                button.dataset.pdf = download.pdf;
                button.dataset.title = download.label;
                button.setAttribute('aria-label', download.ariaLabel);
                button.querySelector('span').textContent = download.label;
            });
        }

        PAGES.forEach((page) => {
            if (content[page]?.toast) {
                pageToastContent[page] = content[page].toast;
            }
        });

        renderSectionHeader(
            document.querySelector('[data-content="about-header"]'),
            content.about?.heading,
            content.about?.subtitle
        );

        const aboutBubbles = document.querySelector('[data-content="about-bubbles"]');
        if (aboutBubbles && content.about?.sections) {
            aboutBubbles.innerHTML = renderBubbleSections(content.about.sections);
        }

        renderSectionHeader(
            document.querySelector('[data-content="timeline-header"]'),
            content.timeline?.heading,
            content.timeline?.subtitle
        );

        const timelineSections = document.querySelector('[data-content="timeline-sections"]');
        if (timelineSections && content.timeline?.sections) {
            timelineSections.innerHTML = content.timeline.sections.map((section) => `
                <div class="timeline-section">
                    <h3 class="timeline-subheader">${escapeHtml(section.heading)}</h3>
                    <div class="bubble timeline-bubble">
                        <div class="timeline">${renderTimelineEvents(section.events)}</div>
                    </div>
                </div>
            `).join('');
        }

        renderSectionHeader(
            document.querySelector('[data-content="experience-header"]'),
            content.experience?.heading,
            content.experience?.subtitle
        );

        renderExperienceColumn(
            document.querySelector('[data-content="experience-professional-heading"]'),
            document.querySelector('[data-content="experience-professional-items"]'),
            content.experience?.professional
        );
        registerExperienceItems(content.experience?.professional, 'professional');

        renderExperienceColumn(
            document.querySelector('[data-content="experience-academic-heading"]'),
            document.querySelector('[data-content="experience-academic-items"]'),
            content.experience?.academic
        );
        registerExperienceItems(content.experience?.academic, 'academic');

        renderExperienceColumn(
            document.querySelector('[data-content="experience-projects-heading"]'),
            document.querySelector('[data-content="experience-projects-items"]'),
            content.experience?.projects
        );
        registerExperienceItems(content.experience?.projects, 'project');

        renderSectionHeader(
            document.querySelector('[data-content="connect-header"]'),
            content.connect?.heading,
            content.connect?.subtitle
        );

        if (content.connect?.links) {
            content.connect.links.forEach((link) => {
                const element = document.querySelector(`[data-connect="${link.id}"]`);
                const label = element?.querySelector('span:not(.connect-icon-at)');
                if (label) {
                    label.textContent = link.label;
                }
            });
        }

        const footer = document.querySelector('[data-content="footer"]');
        if (footer && content.footer) {
            footer.textContent = content.footer;
        }
    }

    async function loadContent() {
        const response = await fetch('content.json');
        if (!response.ok) {
            throw new Error('Failed to load content.json');
        }
        return response.json();
    }

    function showContentLoadError() {
        const homeBubble = document.querySelector('[data-content="home-bubble"]');
        if (homeBubble) {
            homeBubble.innerHTML = '<p>Content could not be loaded. Open the site through a local server or GitHub Pages.</p>';
        }
    }

    const WEATHER_CODES = {
        0: 'Clear',
        1: 'Mostly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light drizzle',
        53: 'Drizzle',
        55: 'Heavy drizzle',
        61: 'Light rain',
        63: 'Rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Rain showers',
        81: 'Rain showers',
        82: 'Heavy showers',
        85: 'Snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with hail'
    };

    const FALLBACK_LOCATION = { latitude: 38.9897, longitude: -76.9378 };
    const isFileProtocol = window.location.protocol === 'file:';

    const panels = {};
    PAGES.forEach((page) => {
        panels[page] = document.querySelector(`.page-panel[data-page="${page}"]`);
    });
    ensureEasterEggPanel();

    function pageFromHash() {
        const hash = window.location.hash.slice(1).toLowerCase();
        if (hash === 'technicalities' || hash === 'skill' || hash === 'skills') {
            history.replaceState(null, '', '#experience');
            return 'experience';
        }
        return PAGES.includes(hash) ? hash : 'home';
    }

    function setActiveNav(page) {
        document.querySelectorAll('nav a[data-page]').forEach((link) => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    function updateAnalogClock(now) {
        const clockEl = document.getElementById('local-analog-clock');
        if (!clockEl) {
            return;
        }

        const hourHand = clockEl.querySelector('.analog-clock-hour');
        const minuteHand = clockEl.querySelector('.analog-clock-minute');
        const secondHand = clockEl.querySelector('.analog-clock-second');
        if (!hourHand || !minuteHand || !secondHand) {
            return;
        }

        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const hourDeg = (hours + minutes / 60 + seconds / 3600) * 30;
        const minuteDeg = (minutes + seconds / 60) * 6;
        const secondDeg = seconds * 6;

        hourHand.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
        minuteHand.setAttribute('transform', `rotate(${minuteDeg} 50 50)`);
        secondHand.setAttribute('transform', `rotate(${secondDeg} 50 50)`);
    }

    function initHomeFeatures() {
        const localDate = document.getElementById('local-date');
        if (!localDate || dateInterval) {
            return;
        }

        function updateLocalDateTime() {
            const now = new Date();
            updateAnalogClock(now);
            localDate.textContent = now.toLocaleString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
            localDate.dateTime = now.toISOString();
        }

        updateLocalDateTime();
        dateInterval = window.setInterval(updateLocalDateTime, 1000);
        initWeather();
    }

    function weatherLabel(code) {
        return WEATHER_CODES[code] || 'Unknown';
    }

    async function fetchWeather(latitude, longitude) {
        const params = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: 'temperature_2m,weather_code',
            temperature_unit: 'fahrenheit'
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!response.ok) {
            throw new Error('Weather request failed');
        }

        const data = await response.json();
        const current = data.current;
        if (!current) {
            throw new Error('Weather data unavailable');
        }

        const label = weatherLabel(current.weather_code);
        const temp = Math.round(current.temperature_2m);
        return `${label} · ${temp}°F`;
    }

    function initWeather() {
        const weatherEl = document.getElementById('local-weather');
        if (!weatherEl || weatherEl.dataset.initialized) {
            return;
        }
        weatherEl.dataset.initialized = 'true';

        async function loadWeather(latitude, longitude) {
            try {
                weatherEl.textContent = await fetchWeather(latitude, longitude);
            } catch {
                weatherEl.textContent = 'Weather unavailable';
            }
        }

        function requestWeather() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => loadWeather(position.coords.latitude, position.coords.longitude),
                    () => loadWeather(FALLBACK_LOCATION.latitude, FALLBACK_LOCATION.longitude),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 }
                );
            } else {
                loadWeather(FALLBACK_LOCATION.latitude, FALLBACK_LOCATION.longitude);
            }
        }

        requestWeather();
        weatherInterval = window.setInterval(requestWeather, 30 * 60 * 1000);
    }

    function getPopupDialog(popupRoot) {
        return popupRoot.querySelector('.pdf-preview-dialog, .email-popup-dialog, .experience-popup-dialog');
    }

    function resetPopupFullscreen(popupRoot) {
        const dialog = getPopupDialog(popupRoot);
        const fullscreenBtn = popupRoot.querySelector('.window-control-maximize');

        if (dialog) {
            dialog.classList.remove('is-fullscreen');
        }

        if (fullscreenBtn) {
            fullscreenBtn.setAttribute('aria-label', 'Enter full screen');
            fullscreenBtn.setAttribute('aria-pressed', 'false');
        }
    }

    function initPopupFullscreen(popupRoot) {
        const dialog = getPopupDialog(popupRoot);
        const fullscreenBtn = popupRoot.querySelector('.window-control-maximize');

        if (!dialog || !fullscreenBtn || fullscreenBtn.dataset.fullscreenBound) {
            return;
        }

        fullscreenBtn.dataset.fullscreenBound = 'true';
        fullscreenBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isFullscreen = dialog.classList.toggle('is-fullscreen');
            fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
            fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
        });
    }

    function initEmailPopup() {
        const emailPopup = document.getElementById('emailPopup');
        const emailBubble = document.getElementById('emailBubble');
        const emailForm = document.getElementById('emailForm');
        const emailFormStatus = document.getElementById('emailFormStatus');
        const emailSubmitBtn = document.getElementById('emailSubmitBtn');
        if (!emailPopup || !emailBubble || emailPopup.dataset.initialized) {
            return;
        }
        emailPopup.dataset.initialized = 'true';
        initPopupFullscreen(emailPopup);

        const recipientEmail = ['tw.song01', 'gmail.com'].join('@');
        const submitEndpoint = `https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`;

        function setFormStatus(message, type) {
            if (!emailFormStatus) {
                return;
            }
            emailFormStatus.hidden = !message;
            emailFormStatus.textContent = message || '';
            emailFormStatus.classList.toggle('is-error', type === 'error');
            emailFormStatus.classList.toggle('is-success', type === 'success');
        }

        function resetEmailForm() {
            if (emailForm) {
                emailForm.reset();
            }
            if (emailSubmitBtn) {
                emailSubmitBtn.disabled = false;
                emailSubmitBtn.textContent = 'Send Email';
            }
            setFormStatus('', null);
        }

        function openEmailPopup() {
            emailPopup.hidden = false;
            requestAnimationFrame(() => {
                emailPopup.classList.add('is-open');
                emailForm?.querySelector('input:not(.email-honey)')?.focus();
            });
            document.body.style.overflow = 'hidden';
        }

        function closeEmailPopup() {
            emailPopup.classList.remove('is-open');
            document.body.style.overflow = '';
            resetPopupFullscreen(emailPopup);
            window.setTimeout(() => {
                emailPopup.hidden = true;
                resetEmailForm();
            }, 300);
        }

        emailPopupEl = emailPopup;
        closeEmailPopupFn = closeEmailPopup;

        emailBubble.addEventListener('click', openEmailPopup);

        document.querySelectorAll('[data-close-email]').forEach((element) => {
            element.addEventListener('click', closeEmailPopup);
        });

        if (emailForm) {
            emailForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                if (!emailForm.checkValidity()) {
                    emailForm.reportValidity();
                    return;
                }

                const honey = emailForm.querySelector('[name="_honey"]');
                if (honey?.value) {
                    return;
                }

                const formData = new FormData(emailForm);
                const payload = {
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message'),
                    _subject: `Biography: ${formData.get('subject')}`,
                    _template: 'table'
                };

                if (emailSubmitBtn) {
                    emailSubmitBtn.disabled = true;
                    emailSubmitBtn.textContent = 'Sending…';
                }
                setFormStatus('', null);

                try {
                    const response = await fetch(submitEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json().catch(() => ({}));

                    if (response.ok && (result.success === true || result.success === 'true')) {
                        emailForm.reset();
                        setFormStatus('Message sent! I\'ll get back to you soon.', 'success');
                    } else {
                        throw new Error(result.message || 'Failed to send message.');
                    }
                } catch {
                    setFormStatus('Something went wrong. Please try again.', 'error');
                } finally {
                    if (emailSubmitBtn) {
                        emailSubmitBtn.disabled = false;
                        emailSubmitBtn.textContent = 'Send Email';
                    }
                }
            });
        }
    }

    function initExperiencePopup() {
        const experiencePopup = document.getElementById('experiencePopup');
        const experienceMain = document.querySelector('.experience-main');
        const logosEl = document.getElementById('experiencePopupLogos');
        const organizationEl = document.getElementById('experiencePopupOrganization');
        const locationEl = document.getElementById('experiencePopupLocation');
        const durationEl = document.getElementById('experiencePopupDuration');
        const locationCombinedEl = document.getElementById('experiencePopupLocationCombined');
        const durationCombinedEl = document.getElementById('experiencePopupDurationCombined');
        const subheaderCombinedEl = document.getElementById('experiencePopupSubheaderCombined');
        const locationSectionEl = document.getElementById('experiencePopupLocationSection');
        const durationSectionEl = document.getElementById('experiencePopupDurationSection');
        const typeSectionEl = document.getElementById('experiencePopupTypeSection');
        const typeEl = document.getElementById('experiencePopupType');
        const titleSectionEl = document.getElementById('experiencePopupTitleSection');
        const titleEl = document.getElementById('experiencePopupTitle');
        const unitSectionEl = document.getElementById('experiencePopupUnitSection');
        const unitEl = document.getElementById('experiencePopupUnit');
        const focusEl = document.getElementById('experiencePopupFocus');
        const secondaryFocusEl = document.getElementById('experiencePopupSecondaryFocus');
        const majorSectionEl = document.getElementById('experiencePopupMajorSection');
        const minorSectionEl = document.getElementById('experiencePopupMinorSection');
        const websiteSectionEl = document.getElementById('experiencePopupWebsiteSection');
        const websiteEl = document.getElementById('experiencePopupWebsite');
        const bodyEl = document.getElementById('experiencePopupBody');
        const coursesEl = document.getElementById('experiencePopupCourses');
        const courseListEl = document.getElementById('experiencePopupCourseList');
        const languageEl = document.getElementById('experiencePopupLanguage');
        const languageListEl = document.getElementById('experiencePopupLanguageList');
        const toolsEl = document.getElementById('experiencePopupTools');
        const toolsListEl = document.getElementById('experiencePopupToolsList');
        const servicesEl = document.getElementById('experiencePopupServices');
        const servicesListEl = document.getElementById('experiencePopupServicesList');
        const resourcesEl = document.getElementById('experiencePopupResources');
        const resourcesListEl = document.getElementById('experiencePopupResourcesList');
        const credentialsEl = document.getElementById('experiencePopupCredentials');
        const credentialsListEl = document.getElementById('experiencePopupCredentialsList');

        if (!experiencePopup || !experienceMain || experiencePopup.dataset.initialized) {
            return;
        }
        experiencePopup.dataset.initialized = 'true';
        initPopupFullscreen(experiencePopup);

        let courseLinkObserver = null;
        let courseLinkGlowScrollRoot = null;
        let courseLinkGlowScrollHandler = null;
        const EXPERIENCE_LINK_VISIBLE_RATIO = 0.15;

        function isExperienceLinkVisible(link, scrollRoot) {
            const rootRect = scrollRoot.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();
            const visibleTop = Math.max(linkRect.top, rootRect.top);
            const visibleBottom = Math.min(linkRect.bottom, rootRect.bottom);
            const visibleLeft = Math.max(linkRect.left, rootRect.left);
            const visibleRight = Math.min(linkRect.right, rootRect.right);
            const visibleHeight = visibleBottom - visibleTop;
            const visibleWidth = visibleRight - visibleLeft;

            if (visibleHeight <= 0 || visibleWidth <= 0) {
                return false;
            }

            const linkArea = linkRect.width * linkRect.height;
            if (linkArea <= 0) {
                return false;
            }

            return (visibleHeight * visibleWidth) / linkArea >= EXPERIENCE_LINK_VISIBLE_RATIO;
        }

        function markVisibleExperienceLinks(links, scrollRoot) {
            if (!experiencePopup.classList.contains('is-open')) {
                return;
            }

            links.forEach((link) => {
                if (link.classList.contains('is-in-view') || !link.isConnected) {
                    return;
                }

                if (isExperienceLinkVisible(link, scrollRoot)) {
                    link.classList.remove('is-in-view');
                    void link.offsetWidth;
                    link.classList.add('is-in-view');
                    courseLinkObserver?.unobserve(link);
                }
            });
        }

        function resetCourseLinkGlow() {
            if (courseLinkObserver) {
                courseLinkObserver.disconnect();
                courseLinkObserver = null;
            }

            if (courseLinkGlowScrollRoot && courseLinkGlowScrollHandler) {
                courseLinkGlowScrollRoot.removeEventListener('scroll', courseLinkGlowScrollHandler);
            }
            courseLinkGlowScrollRoot = null;
            courseLinkGlowScrollHandler = null;

            experiencePopup.querySelectorAll('.experience-course-link.is-in-view').forEach((link) => {
                link.classList.remove('is-in-view');
            });
        }

        function initCourseLinkGlow() {
            resetCourseLinkGlow();

            const scrollRoot = experiencePopup.querySelector('.experience-popup-content');
            if (!scrollRoot) {
                return;
            }

            const links = [...experiencePopup.querySelectorAll('.experience-course-link')];
            if (!links.length) {
                return;
            }

            const markVisible = () => markVisibleExperienceLinks(links, scrollRoot);

            courseLinkObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.target.classList.contains('is-in-view')) {
                        return;
                    }

                    if (entry.isIntersecting && entry.intersectionRatio >= EXPERIENCE_LINK_VISIBLE_RATIO) {
                        entry.target.classList.remove('is-in-view');
                        void entry.target.offsetWidth;
                        entry.target.classList.add('is-in-view');
                        courseLinkObserver.unobserve(entry.target);
                    }
                });
            }, {
                root: scrollRoot,
                threshold: [0, 0.15, 0.35, 0.55, 0.75, 1]
            });

            links.forEach((link) => courseLinkObserver.observe(link));

            courseLinkGlowScrollRoot = scrollRoot;
            courseLinkGlowScrollHandler = markVisible;
            scrollRoot.addEventListener('scroll', courseLinkGlowScrollHandler, { passive: true });

            requestAnimationFrame(() => {
                requestAnimationFrame(markVisible);
            });
        }

        function populateExperiencePopup(item) {
            const popup = item.popup || {};
            const isAcademic = item.experienceCategory === 'academic';
            const isProfessional = item.experienceCategory === 'professional';
            const usesLabeledMetaSections = isAcademic || isProfessional;
            const locationText = popup.location || 'Location TBD';
            const durationText = popup.duration || 'Duration TBD';
            const typeText = popup.type || 'Type TBD';
            const titleText = popup.title || 'Title TBD';
            const websiteUrl = popup.website?.trim() || '';
            const logos = getExperiencePopupLogos(item);

            if (logosEl) {
                logosEl.innerHTML = logos.map((src) => `
                    <img class="experience-popup-logo" src="${escapeHtml(src)}" alt="" width="40" height="40" loading="lazy" decoding="async" aria-hidden="true">
                `).join('');
            }

            if (organizationEl) {
                organizationEl.textContent = getExperienceOrganization(item);
            }

            if (subheaderCombinedEl) {
                subheaderCombinedEl.hidden = usesLabeledMetaSections;
            }

            if (locationSectionEl) {
                locationSectionEl.hidden = !usesLabeledMetaSections;
            }

            if (durationSectionEl) {
                durationSectionEl.hidden = !usesLabeledMetaSections;
            }

            if (typeSectionEl) {
                typeSectionEl.hidden = !isProfessional;
            }

            if (titleSectionEl) {
                titleSectionEl.hidden = !isProfessional;
            }

            if (usesLabeledMetaSections) {
                if (locationEl) {
                    locationEl.textContent = locationText;
                }

                if (durationEl) {
                    durationEl.textContent = durationText;
                }
            } else {
                if (locationCombinedEl) {
                    locationCombinedEl.textContent = locationText;
                }

                if (durationCombinedEl) {
                    durationCombinedEl.textContent = durationText;
                }
            }

            if (isProfessional) {
                if (typeEl) {
                    typeEl.textContent = typeText;
                }

                if (titleEl) {
                    titleEl.textContent = titleText;
                }
            } else {
                if (typeEl) {
                    typeEl.textContent = '';
                }

                if (titleEl) {
                    titleEl.textContent = '';
                }
            }

            const unitText = popup.unit?.trim() || '';
            if (unitSectionEl && unitEl) {
                if (unitText) {
                    unitEl.textContent = unitText;
                    unitSectionEl.hidden = false;
                } else {
                    unitEl.textContent = '';
                    unitSectionEl.hidden = true;
                }
            }

            const hasFocus = Boolean(popup.focus);
            const hasSecondaryFocus = Boolean(popup['secondary-focus']);

            if (isAcademic) {
                if (majorSectionEl) {
                    majorSectionEl.hidden = !hasFocus;
                }

                if (minorSectionEl) {
                    minorSectionEl.hidden = !hasSecondaryFocus;
                }

                if (focusEl) {
                    focusEl.textContent = hasFocus ? popup.focus : '';
                }

                if (secondaryFocusEl) {
                    secondaryFocusEl.textContent = hasSecondaryFocus ? popup['secondary-focus'] : '';
                }
            } else {
                if (majorSectionEl) {
                    majorSectionEl.hidden = true;
                }

                if (minorSectionEl) {
                    minorSectionEl.hidden = true;
                }

                if (focusEl) {
                    focusEl.textContent = '';
                }

                if (secondaryFocusEl) {
                    secondaryFocusEl.textContent = '';
                }
            }

            if (websiteSectionEl && websiteEl) {
                if (websiteUrl) {
                    websiteEl.href = websiteUrl;
                    websiteEl.textContent = websiteUrl;
                    websiteSectionEl.hidden = false;
                } else {
                    websiteEl.href = '#';
                    websiteEl.textContent = '';
                    websiteSectionEl.hidden = true;
                }
            }

            if (bodyEl) {
                const paragraphs = popup.body?.length ? popup.body : ['The quick brown fox jumps over the lazy dog.'];
                bodyEl.innerHTML = paragraphs.map((paragraph) => `
                    <p>${escapeHtml(paragraph)}</p>
                `).join('');
            }

            if (coursesEl && courseListEl) {
                const courses = popup.courses;
                const courseLinkBase = popup.courseLinkBase;
                if (courses?.length) {
                    courseListEl.innerHTML = courses.map((course) => {
                        const label = escapeHtml(course);
                        if (courseLinkBase) {
                            const href = `${courseLinkBase}${encodeURIComponent(course.toLowerCase())}`;
                            return `<a class="sub-bubble bubble experience-course-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
                        }
                        return `<span class="sub-bubble bubble">${label}</span>`;
                    }).join('');
                    coursesEl.hidden = false;
                } else {
                    courseListEl.innerHTML = '';
                    coursesEl.hidden = true;
                }
            }

            const toolCategorySections = [
                { key: 'language', sectionEl: languageEl, listEl: languageListEl },
                { key: 'tools', sectionEl: toolsEl, listEl: toolsListEl },
                { key: 'services', sectionEl: servicesEl, listEl: servicesListEl },
                { key: 'resources', sectionEl: resourcesEl, listEl: resourcesListEl }
            ];

            function renderToolTags(listEl, items) {
                if (!listEl) {
                    return false;
                }

                if (items?.length) {
                    listEl.innerHTML = items.map((item) => `
                        <span class="sub-bubble bubble">${escapeHtml(item)}</span>
                    `).join('');
                    return true;
                }

                listEl.innerHTML = '';
                return false;
            }

            const toolsData = popup.toolsAndResources;

            if (Array.isArray(toolsData)) {
                toolCategorySections.forEach(({ sectionEl, listEl }) => {
                    if (sectionEl) {
                        sectionEl.hidden = true;
                    }
                    if (listEl) {
                        listEl.innerHTML = '';
                    }
                });

                if (toolsEl && toolsListEl && toolsData.length) {
                    renderToolTags(toolsListEl, toolsData);
                    toolsEl.hidden = false;
                }
            } else if (toolsData && typeof toolsData === 'object') {
                toolCategorySections.forEach(({ key, sectionEl, listEl }) => {
                    const hasItems = renderToolTags(listEl, toolsData[key]);
                    if (sectionEl) {
                        sectionEl.hidden = !hasItems;
                    }
                });
            } else {
                toolCategorySections.forEach(({ sectionEl, listEl }) => {
                    if (sectionEl) {
                        sectionEl.hidden = true;
                    }
                    if (listEl) {
                        listEl.innerHTML = '';
                    }
                });
            }

            if (credentialsEl && credentialsListEl) {
                const credentials = popup.credentials;

                if (credentials?.length) {
                    credentialsEl.hidden = false;
                    credentialsListEl.hidden = false;
                    credentialsListEl.innerHTML = credentials.map((credential) => {
                        const label = escapeHtml(
                            typeof credential === 'object'
                                ? (credential.label || credential.name || 'Credential')
                                : credential
                        );
                        const href = typeof credential === 'object'
                            ? (credential.url || credential.link || '')
                            : '';

                        if (href) {
                            return `<a class="sub-bubble bubble experience-course-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
                        }

                        return `<span class="sub-bubble bubble">${label}</span>`;
                    }).join('');
                } else {
                    credentialsListEl.innerHTML = '';
                    credentialsListEl.hidden = true;
                    credentialsEl.hidden = true;
                }
            }
        }

        function openExperiencePopup(itemId) {
            const item = experienceItemData[itemId];
            if (!item) {
                return;
            }

            populateExperiencePopup(item);

            const scrollRoot = experiencePopup.querySelector('.experience-popup-content');
            if (scrollRoot) {
                scrollRoot.scrollTop = 0;
            }

            experiencePopup.hidden = false;
            requestAnimationFrame(() => {
                experiencePopup.classList.add('is-open');
                requestAnimationFrame(() => {
                    initCourseLinkGlow();
                });
            });
            document.body.style.overflow = 'hidden';
        }

        function closeExperiencePopup() {
            experiencePopup.classList.remove('is-open');
            document.body.style.overflow = '';
            resetPopupFullscreen(experiencePopup);
            resetCourseLinkGlow();
            window.setTimeout(() => {
                experiencePopup.hidden = true;
            }, 300);
        }

        experiencePopupEl = experiencePopup;
        closeExperiencePopupFn = closeExperiencePopup;

        experienceMain.addEventListener('click', (event) => {
            const bubble = event.target.closest('.experience-bubble');
            if (!bubble?.dataset.experience) {
                return;
            }

            openExperiencePopup(bubble.dataset.experience);
        });

        document.querySelectorAll('[data-close-experience]').forEach((element) => {
            element.addEventListener('click', closeExperiencePopup);
        });
    }

    function initPdfPreview() {
        const pdfPreview = document.getElementById('pdfPreview');
        if (!pdfPreview || pdfPreview.dataset.initialized) {
            return;
        }
        pdfPreview.dataset.initialized = 'true';
        initPopupFullscreen(pdfPreview);

        const pdfPreviewDialog = pdfPreview.querySelector('.pdf-preview-dialog');
        const pdfPreviewFrame = document.getElementById('pdfPreviewFrame');
        const pdfPreviewTitle = document.getElementById('pdfPreviewTitle');
        let activePreviewButton = null;
        let isPreviewAnimating = false;

        const PREVIEW_OPEN_MS = 450;
        const PREVIEW_CLOSE_MS = 400;
        let pendingPreviewSrc = '';

        function resetPreviewDialogStyles() {
            pdfPreviewDialog.style.transition = '';
            pdfPreviewDialog.style.transform = '';
            pdfPreviewDialog.classList.remove('is-flip-animating');
        }

        function onPreviewTransitionEnd(event, callback) {
            if (event.target !== pdfPreviewDialog || event.propertyName !== 'transform') {
                return;
            }
            callback();
        }

        function openPdfPreview(button, src, title) {
            if (isPreviewAnimating) {
                return;
            }

            if (isFileProtocol) {
                window.open(new URL(src, window.location.href).href, '_blank', 'noopener,noreferrer');
                return;
            }

            activePreviewButton = button;
            pendingPreviewSrc = src;
            const bubbleRect = button.getBoundingClientRect();

            pdfPreviewTitle.textContent = title;
            pdfPreviewFrame.src = '';
            pdfPreview.hidden = false;
            pdfPreview.classList.remove('is-closing', 'is-content-visible');
            pdfPreview.classList.add('is-open');
            document.body.style.overflow = 'hidden';

            resetPreviewDialogStyles();

            const dialogRect = pdfPreviewDialog.getBoundingClientRect();
            const deltaX = bubbleRect.left + bubbleRect.width / 2 - (dialogRect.left + dialogRect.width / 2);
            const deltaY = bubbleRect.top + bubbleRect.height / 2 - (dialogRect.top + dialogRect.height / 2);
            const scaleX = bubbleRect.width / dialogRect.width;
            const scaleY = bubbleRect.height / dialogRect.height;

            isPreviewAnimating = true;
            pdfPreviewDialog.classList.add('is-flip-animating');
            pdfPreviewDialog.style.transition = 'none';
            pdfPreviewDialog.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    pdfPreviewDialog.style.transition = `transform ${PREVIEW_OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                    pdfPreviewDialog.style.transform = 'translate3d(0, 0, 0) scale(1)';
                });
            });

            let openFinished = false;
            const finishOpen = () => {
                if (openFinished) {
                    return;
                }
                openFinished = true;
                pdfPreviewDialog.removeEventListener('transitionend', openTransitionEnd);
                resetPreviewDialogStyles();
                pdfPreviewFrame.src = pendingPreviewSrc;
                pdfPreview.classList.add('is-content-visible');
                isPreviewAnimating = false;
            };

            function openTransitionEnd(event) {
                onPreviewTransitionEnd(event, finishOpen);
            }

            pdfPreviewDialog.addEventListener('transitionend', openTransitionEnd);
            window.setTimeout(finishOpen, PREVIEW_OPEN_MS + 20);
        }

        function closePdfPreview() {
            if (isPreviewAnimating || pdfPreview.hidden) {
                return;
            }

            resetPopupFullscreen(pdfPreview);

            if (!activePreviewButton) {
                pdfPreview.hidden = true;
                pdfPreview.classList.remove('is-open', 'is-closing', 'is-content-visible');
                pdfPreviewFrame.src = '';
                resetPreviewDialogStyles();
                resetPopupFullscreen(pdfPreview);
                document.body.style.overflow = '';
                return;
            }

            pdfPreviewFrame.src = '';
            pdfPreview.classList.remove('is-content-visible');
            pdfPreview.classList.add('is-closing');
            pdfPreview.classList.remove('is-open');

            const bubbleRect = activePreviewButton.getBoundingClientRect();
            const dialogRect = pdfPreviewDialog.getBoundingClientRect();
            const deltaX = bubbleRect.left + bubbleRect.width / 2 - (dialogRect.left + dialogRect.width / 2);
            const deltaY = bubbleRect.top + bubbleRect.height / 2 - (dialogRect.top + dialogRect.height / 2);
            const scaleX = bubbleRect.width / dialogRect.width;
            const scaleY = bubbleRect.height / dialogRect.height;

            isPreviewAnimating = true;
            pdfPreviewDialog.classList.add('is-flip-animating');
            pdfPreviewDialog.style.transition = 'none';
            pdfPreviewDialog.style.transform = 'translate3d(0, 0, 0) scale(1)';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    pdfPreviewDialog.style.transition = `transform ${PREVIEW_CLOSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    pdfPreviewDialog.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
                });
            });

            let closeFinished = false;
            const finishClose = () => {
                if (closeFinished) {
                    return;
                }
                closeFinished = true;
                pdfPreviewDialog.removeEventListener('transitionend', closeTransitionEnd);
                pdfPreview.hidden = true;
                pdfPreview.classList.remove('is-closing');
                pdfPreviewFrame.src = '';
                resetPreviewDialogStyles();
                resetPopupFullscreen(pdfPreview);
                document.body.style.overflow = '';
                activePreviewButton = null;
                isPreviewAnimating = false;
            };

            function closeTransitionEnd(event) {
                onPreviewTransitionEnd(event, finishClose);
            }

            pdfPreviewDialog.addEventListener('transitionend', closeTransitionEnd);
            window.setTimeout(finishClose, PREVIEW_CLOSE_MS + 20);
        }

        pdfPreviewEl = pdfPreview;
        closePdfPreviewFn = closePdfPreview;

        document.querySelectorAll('.bubble-preview-btn').forEach((button) => {
            button.addEventListener('click', () => {
                openPdfPreview(button, button.dataset.pdf, button.dataset.title);
            });
        });

        document.querySelectorAll('[data-close-preview]').forEach((element) => {
            element.addEventListener('click', closePdfPreview);
        });
    }

    function getToastStorage() {
        try {
            return JSON.parse(sessionStorage.getItem(TOAST_STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function hasShownPageToast(page) {
        return getToastStorage().includes(page);
    }

    function markPageToastShown(page) {
        try {
            const shown = getToastStorage();
            if (!shown.includes(page)) {
                shown.push(page);
                sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(shown));
            }
        } catch {
            // Ignore storage failures in private browsing modes.
        }
    }

    function playToastSound() {
        if (prefersReducedMotion) {
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                return;
            }

            const context = new AudioContext();
            const tones = [
                { frequency: 880, start: 0, duration: 0.1 },
                { frequency: 1108.73, start: 0.11, duration: 0.1 },
                { frequency: 1318.51, start: 0.22, duration: 0.16 }
            ];

            tones.forEach(({ frequency, start, duration }) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;
                oscillator.connect(gain);
                gain.connect(context.destination);

                const startTime = context.currentTime + start;
                gain.gain.setValueAtTime(0.0001, startTime);
                gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration + 0.02);
            });

            window.setTimeout(() => {
                context.close().catch(() => {});
            }, 600);
        } catch {
            // Ignore audio failures when autoplay is blocked.
        }
    }

    function ensurePageToastElements() {
        if (!pageToastStackEl) {
            initPageToast();
        }
    }

    function syncToastStackVisibility() {
        if (!pageToastStackEl) {
            return;
        }

        if (pageToastStackEl.children.length === 0) {
            pageToastStackEl.setAttribute('hidden', '');
        } else {
            pageToastStackEl.removeAttribute('hidden');
        }
    }

    function hasVisiblePageToasts() {
        ensurePageToastElements();
        return Boolean(pageToastStackEl?.querySelector('.page-toast.is-visible'));
    }

    function createPageToastElement(page, title, message) {
        const toastEl = document.createElement('div');
        toastEl.className = 'page-toast';
        toastEl.dataset.toastPage = page;
        toastEl.innerHTML = `
            <div class="page-toast-inner">
                <button type="button" class="page-toast-close" aria-label="Close message">×</button>
                <div class="page-toast-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    </svg>
                </div>
                <div class="page-toast-body">
                    <p class="page-toast-title">${escapeHtml(title)}</p>
                    <p class="page-toast-message">${escapeHtml(message)}</p>
                </div>
            </div>
        `;

        const closeBtn = toastEl.querySelector('.page-toast-close');
        closeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            dismissPageToast(page);
        });

        return toastEl;
    }

    function dismissPageToast(page) {
        const record = activePageToasts.get(page);
        if (!record) {
            return;
        }

        const { el, hideTimer, removeTimer } = record;

        if (hideTimer) {
            window.clearTimeout(hideTimer);
        }
        if (removeTimer) {
            window.clearTimeout(removeTimer);
        }

        if (el.classList.contains('is-visible')) {
            markPageToastShown(page);
        }

        activePageToasts.delete(page);
        el.classList.remove('is-visible');
        el.classList.add('is-hiding');

        window.setTimeout(() => {
            el.remove();
            syncToastStackVisibility();
        }, prefersReducedMotion ? 200 : TOAST_HIDE_MS);
    }

    function showPageToast(page) {
        ensurePageToastElements();
        if (!pageToastStackEl || page !== currentPage) {
            return;
        }

        const toastData = pageToastContent[page];
        if (!toastData || hasShownPageToast(page) || activePageToasts.has(page)) {
            toastNavigationInterrupted = false;
            return;
        }

        const interrupted = toastNavigationInterrupted;
        toastNavigationInterrupted = false;

        const title = interrupted ? 'Messages' : (toastData.title || 'Messages');
        const toastEl = createPageToastElement(page, title, toastData.message || '');

        pageToastStackEl.appendChild(toastEl);
        syncToastStackVisibility();
        toastEl.classList.remove('is-hiding', 'is-visible');
        void toastEl.offsetWidth;
        toastEl.classList.add('is-visible');

        playToastSound();

        const hideTimer = window.setTimeout(() => {
            dismissPageToast(page);
        }, TOAST_DURATION_MS);

        activePageToasts.set(page, { el: toastEl, hideTimer, removeTimer: null });
    }

    function initPageToast() {
        pageToastStackEl = document.getElementById('pageToastStack');
    }

    function queuePageToast(page, delay = TOAST_DELAY_MS) {
        if (!PAGES.includes(page)) {
            return;
        }

        if (toastScheduleTimer) {
            window.clearTimeout(toastScheduleTimer);
            toastScheduleTimer = null;
        }

        toastScheduleTimer = window.setTimeout(() => {
            toastScheduleTimer = null;
            showPageToast(page);
        }, delay);
    }

    function onPageReady(page, toastDelay = TOAST_DELAY_MS, previousPage = currentPage) {
        markPageVisited(page);

        currentPage = page;
        setActiveNav(page);

        if (page === 'home') {
            initHomeFeatures();
            initHomeWelcomeWave();
        }

        syncEasterEggMusic(page);
        syncEasterEggEffects();
        syncFireflies();
        queuePageToast(page, toastDelay);

        if (page === EASTER_EGG_PAGE) {
            initEasterEggGif();
            window.requestAnimationFrame(() => {
                syncEasterEggEffects();
            });
        } else if (previousPage === EASTER_EGG_PAGE) {
            resetEasterEggGif();
        }
    }

    function activatePage(page) {
        if (page === EASTER_EGG_PAGE) {
            ensureEasterEggPanel();
        }

        PAGES.forEach((id) => {
            const panel = panels[id];
            panel?.classList.remove('is-active', 'is-animating', 'is-entering', 'is-exiting');
        });

        panels[page]?.classList.add('is-active');
        onPageReady(page, TOAST_DELAY_MS, currentPage);
    }

    const pageViewport = document.getElementById('pageViewport');
    pageViewportEl = pageViewport;
    navEl = document.querySelector('nav');

    function getStepDuration(stepCount) {
        return stepCount > 1 ? MULTI_STEP_DURATION : SINGLE_STEP_DURATION;
    }

    function transitionStep(fromPage, toPage, forward, duration) {
        return new Promise((resolve) => {
            const outgoing = panels[fromPage];
            const incoming = panels[toPage];

            if (!outgoing || !incoming) {
                resolve();
                return;
            }

            if (pageViewport) {
                pageViewport.style.setProperty('--page-transition-duration', `${duration}ms`);
            }

            incoming.classList.add('is-active', 'is-animating', 'is-entering');
            outgoing.classList.add('is-animating', 'is-exiting');

            if (forward) {
                incoming.classList.add('from-right');
                outgoing.classList.add('to-left');
            } else {
                incoming.classList.add('from-left');
                outgoing.classList.add('to-right');
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    incoming.classList.add('is-visible');
                    outgoing.classList.add('is-visible');
                });
            });

            window.setTimeout(() => {
                outgoing.classList.remove('is-active', 'is-animating', 'is-exiting', 'to-left', 'to-right', 'is-visible');
                incoming.classList.remove('is-animating', 'is-entering', 'from-right', 'from-left', 'is-visible');
                outgoing.style.transform = '';
                incoming.style.transform = '';
                resolve();
            }, duration);
        });
    }

    async function navigateTo(page, options = {}) {
        const { animate = true } = options;

        if (!PAGES.includes(page) || page === currentPage || isTransitioning) {
            return;
        }

        if (page === EASTER_EGG_PAGE) {
            ensureEasterEggPanel();
        }

        if (hasVisiblePageToasts()) {
            toastNavigationInterrupted = true;
        }

        const oldIndex = PAGES.indexOf(currentPage);
        const newIndex = PAGES.indexOf(page);
        const forward = newIndex > oldIndex;

        if (!animate || prefersReducedMotion) {
            activatePage(page);
            return;
        }

        isTransitioning = true;
        const previousPage = currentPage;

        const steps = [];
        if (forward) {
            for (let i = oldIndex; i < newIndex; i++) {
                steps.push({ from: PAGES[i], to: PAGES[i + 1], forward: true });
            }
        } else {
            for (let i = oldIndex; i > newIndex; i--) {
                steps.push({ from: PAGES[i], to: PAGES[i - 1], forward: false });
            }
        }

        const stepDuration = getStepDuration(steps.length);

        for (const step of steps) {
            await transitionStep(step.from, step.to, step.forward, stepDuration);
        }

        isTransitioning = false;
        onPageReady(page, TOAST_DELAY_MS, previousPage);
    }

    function initBrandMenu() {
        const brandMenuBtn = document.getElementById('brandMenuBtn');
        const brandMenu = document.getElementById('brandMenu');
        if (!brandMenuBtn || !brandMenu) {
            return null;
        }

        function closeBrandMenu() {
            brandMenu.hidden = true;
            brandMenuBtn.classList.remove('is-open');
            brandMenuBtn.setAttribute('aria-expanded', 'false');
        }

        function openBrandMenu() {
            brandMenu.hidden = false;
            brandMenuBtn.classList.add('is-open');
            brandMenuBtn.setAttribute('aria-expanded', 'true');
        }

        brandMenuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (brandMenu.hidden) {
                openBrandMenu();
            } else {
                closeBrandMenu();
            }
        });

        document.addEventListener('click', (event) => {
            if (!brandMenu.hidden && !brandMenu.contains(event.target) && !brandMenuBtn.contains(event.target)) {
                closeBrandMenu();
            }
        });

        window.addEventListener('hashchange', closeBrandMenu);

        return closeBrandMenu;
    }

    const nav = document.querySelector('nav');
    nav?.addEventListener('click', (event) => {
        const link = event.target.closest('a[data-page]');
        if (!link) {
            return;
        }

        event.preventDefault();
        const page = link.dataset.page;
        if (page !== currentPage && !isTransitioning) {
            window.location.hash = page;
        }
    });

    window.addEventListener('hashchange', () => {
        const page = pageFromHash();
        navigateTo(page, { animate: !prefersReducedMotion });
    });

    const THEME_STORAGE_KEY = 'theme-preference';

    function getThemePreference() {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            return stored === 'light' || stored === 'dark' ? stored : null;
        } catch {
            return null;
        }
    }

    function resolveDarkMode(preference = getThemePreference()) {
        if (preference === 'dark') {
            return true;
        }

        if (preference === 'light') {
            return false;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyTheme(isDark) {
        const html = document.documentElement;

        html.classList.remove('easter-egg-dark-transition');
        html.classList.toggle('system-dark-mode', isDark);
        html.style.colorScheme = isDark ? 'dark' : 'light';

        html.classList.add('theme-changing');
        window.setTimeout(() => {
            html.classList.remove('theme-changing');
        }, 220);

        const themeBtn = document.getElementById('musicThemeBtn');
        themeBtn?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');

        syncFireflies();
    }

    function initThemeControl() {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const themeBtn = document.getElementById('musicThemeBtn');

        function refresh() {
            applyTheme(resolveDarkMode());
        }

        themeBtn?.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('system-dark-mode');
            const nextTheme = isDark ? 'light' : 'dark';

            try {
                localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
            } catch {
                // Ignore storage failures and still apply the chosen theme.
            }

            applyTheme(nextTheme === 'dark');
        });

        media.addEventListener('change', () => {
            if (!getThemePreference()) {
                refresh();
            }
        });

        refresh();
    }

    initThemeControl();
    initPdfPreview();
    initEmailPopup();
    initExperiencePopup();
    initPageToast();
    initEasterEgg();
    const closeBrandMenu = initBrandMenu();

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') {
            return;
        }
        if (pdfPreviewEl && !pdfPreviewEl.hidden) {
            closePdfPreviewFn?.();
        } else if (experiencePopupEl && !experiencePopupEl.hidden) {
            closeExperiencePopupFn?.();
        } else if (emailPopupEl && !emailPopupEl.hidden) {
            closeEmailPopupFn?.();
        } else {
            closeBrandMenu?.();
        }
    });

    try {
        renderContent(await loadContent());
    } catch {
        showContentLoadError();
    }

    initHomeFeatures();

    const initialPage = pageFromHash();
    if (initialPage !== 'home') {
        activatePage(initialPage);
    } else {
        currentPage = 'home';
        setActiveNav('home');
        initHomeWelcomeWave();
        queuePageToast('home', TOAST_INITIAL_DELAY_MS);
    }

    if (!window.location.hash) {
        history.replaceState(null, '', '#home');
    }
})();
