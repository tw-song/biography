(function () {
    const DEFAULT_VOLUME = 0.1;

    const audio = document.getElementById('audio');
    if (!audio) {
        return;
    }

    const playPauseBtn = document.getElementById('playPause');
    const volumeControl = document.getElementById('volumeControl');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const musicTitle = document.getElementById('musicTitle');
    const musicTitleTrack = musicTitle?.querySelector('.music-title-track');
    const musicLink = document.querySelector('.music-link');
    const musicCover = document.querySelector('.music-cover');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DEFAULT_TRACK = {
        src: 'misc/nav/audio1.mp3',
        title: 'Porter Robinson - Lifelike (Official Audio)',
        youtube: 'https://youtu.be/ijmUdI_c-fk?si=U2_dOmO92Yh82moR',
        cover: 'misc/nav/audio-cover.jpg',
        coverAlt: 'Porter Robinson - Lifelike cover',
        loop: true
    };

    const EASTER_EGG_TRACK = {
        src: 'misc/easter-egg/audio2.mp3',
        title: 'W&W - OIIA OIIA (Spinning Cat)',
        youtube: 'https://youtu.be/IxX_QHay02M?si=ITrJk4lm41yCAv8w',
        cover: 'misc/easter-egg/ee-intro.gif',
        coverAlt: 'U I A cat',
        loop: false
    };

    function setPlayingState(isPlaying) {
        playIcon.classList.toggle('hidden', isPlaying);
        pauseIcon.classList.toggle('hidden', !isPlaying);
        playPauseBtn.classList.toggle('is-playing', isPlaying);
        playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
        playPauseBtn.setAttribute('aria-pressed', String(isPlaying));

        if (musicTitle) {
            musicTitle.classList.toggle('is-marquee-paused', !isPlaying);
        }
    }

    volumeControl.value = DEFAULT_VOLUME;
    audio.volume = DEFAULT_VOLUME;
    setPlayingState(false);

    function hasEasterEggAudioFinished() {
        return audio.ended
            || (Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.1);
    }

    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            if (isEasterEggAudioActive() && hasEasterEggAudioFinished()) {
                audio.currentTime = 0;
            }

            audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
        } else {
            audio.pause();
        }
    });

    volumeControl.addEventListener('input', () => {
        audio.volume = volumeControl.value;
    });

    audio.addEventListener('play', () => setPlayingState(true));
    audio.addEventListener('pause', () => setPlayingState(false));

    function tryAutoplay() {
        audio.play().catch(() => {
            function startOnInteraction() {
                audio.play().catch(() => {});
                document.removeEventListener('click', startOnInteraction);
                document.removeEventListener('keydown', startOnInteraction);
            }

            document.addEventListener('click', startOnInteraction);
            document.addEventListener('keydown', startOnInteraction);
        });
    }

    tryAutoplay();

    function setMusicTrack(track) {
        const wasPlaying = !audio.paused;
        const source = audio.querySelector('source');

        if (source) {
            source.src = track.src;
        } else {
            audio.src = track.src;
        }

        audio.load();

        audio.loop = track.loop !== false;

        if (musicTitleTrack) {
            const copies = musicTitleTrack.querySelectorAll('.music-title-copy');
            copies.forEach((copy) => {
                copy.textContent = track.title;
            });
        }

        if (musicLink) {
            musicLink.href = track.youtube;
            musicLink.setAttribute('aria-label', `Open ${track.title} on YouTube`);
        }

        if (musicCover) {
            musicCover.src = track.cover;
            musicCover.alt = track.coverAlt;
        }

        updateMusicTitleMarquee();

        if (wasPlaying) {
            audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
        }
    }

    function isEasterEggAudioActive() {
        const source = audio.querySelector('source');
        const currentSrc = source?.getAttribute('src') || audio.getAttribute('src') || audio.currentSrc || '';
        return currentSrc.includes('audio2.mp3');
    }

    function notifyEasterEggAudio(eventName) {
        if (!isEasterEggAudioActive()) {
            return;
        }

        window.dispatchEvent(new CustomEvent(eventName));
    }

    audio.addEventListener('play', () => notifyEasterEggAudio('easter-egg-audio-play'));
    audio.addEventListener('pause', () => notifyEasterEggAudio('easter-egg-audio-pause'));
    audio.addEventListener('ended', () => {
        if (!isEasterEggAudioActive()) {
            return;
        }

        audio.loop = false;
        setPlayingState(false);
        notifyEasterEggAudio('easter-egg-audio-ended');
    });

    window.getEasterEggAudioTimeMs = () => {
        if (!isEasterEggAudioActive()) {
            return null;
        }

        return audio.currentTime * 1000;
    };

    window.isEasterEggAudioPaused = () => audio.paused;
    window.isMusicPaused = () => audio.paused;

    window.playMusic = () => {
        if (isEasterEggAudioActive() && hasEasterEggAudioFinished()) {
            audio.currentTime = 0;
        }

        return audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
    };

    window.setDefaultMusicTrack = () => setMusicTrack(DEFAULT_TRACK);
    window.setEasterEggMusicTrack = () => {
        setMusicTrack(EASTER_EGG_TRACK);
        audio.currentTime = 0;
        audio.loop = false;
    };

    window.setEasterEggMusicCover = (src) => {
        if (!musicCover || !isEasterEggAudioActive()) {
            return;
        }

        musicCover.src = src;
    };
    window.resetEasterEggAudioPosition = () => {
        if (!isEasterEggAudioActive()) {
            return;
        }

        audio.currentTime = 0;
    };

    window.pauseEasterEggMusic = () => {
        if (!isEasterEggAudioActive()) {
            return;
        }

        audio.pause();
    };

    function updateMusicTitleMarquee() {
        if (!musicTitle || !musicTitleTrack || prefersReducedMotion) {
            return;
        }

        musicTitle.classList.remove('is-scrolling');
        musicTitle.style.removeProperty('--marquee-distance');
        musicTitle.style.removeProperty('--scroll-duration');

        const copies = musicTitle.querySelectorAll('.music-title-copy');
        if (copies.length < 2) {
            return;
        }

        const copyWidth = copies[0].offsetWidth;
        const gapWidth = parseFloat(getComputedStyle(copies[1]).paddingLeft) || 0;
        const marqueeDistance = copyWidth + gapWidth;
        const overflow = marqueeDistance - musicTitle.clientWidth;

        if (overflow <= 2) {
            return;
        }

        const duration = Math.max(10, marqueeDistance / 22);
        musicTitle.style.setProperty('--marquee-distance', `${marqueeDistance}px`);
        musicTitle.style.setProperty('--scroll-duration', `${duration}s`);
        musicTitle.classList.add('is-scrolling');

        if (playPauseBtn.getAttribute('aria-pressed') !== 'true') {
            musicTitle.classList.add('is-marquee-paused');
        }
    }

    updateMusicTitleMarquee();
    window.addEventListener('resize', updateMusicTitleMarquee);

    if (musicTitleTrack && 'ResizeObserver' in window) {
        const titleObserver = new ResizeObserver(updateMusicTitleMarquee);
        titleObserver.observe(musicTitleTrack);
    }
})();
