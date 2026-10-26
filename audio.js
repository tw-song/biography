(function () {
    const DEFAULT_VOLUME = 0.1;

    const audio = document.getElementById('audio');
    if (!audio) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isSeeking = false;

    function playPauseBtns() {
        return document.querySelectorAll('[data-music-play]');
    }

    function replayBtns() {
        return document.querySelectorAll('[data-music-replay]');
    }

    function nextBtns() {
        return document.querySelectorAll('[data-music-next]');
    }

    function volumeControls() {
        return document.querySelectorAll('[data-music-volume]');
    }

    function seekControls() {
        return document.querySelectorAll('[data-music-seek]');
    }

    function currentTimeEls() {
        return document.querySelectorAll('[data-music-time-current]');
    }

    function durationEls() {
        return document.querySelectorAll('[data-music-time-duration]');
    }

    function musicTitles() {
        return document.querySelectorAll('[data-music-title]');
    }

    function musicLinks() {
        return document.querySelectorAll('[data-music-link]');
    }

    function musicCovers() {
        return document.querySelectorAll('[data-music-cover]');
    }

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
        playPauseBtns().forEach((button) => {
            button.classList.toggle('is-playing', isPlaying);
            button.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
            button.setAttribute('aria-pressed', String(isPlaying));
            button.querySelector('[data-music-play-icon]')?.classList.toggle('hidden', isPlaying);
            button.querySelector('[data-music-pause-icon]')?.classList.toggle('hidden', !isPlaying);
        });

        musicTitles().forEach((title) => {
            title.classList.toggle('is-marquee-paused', !isPlaying);
        });
    }

    function setVolume(value) {
        audio.volume = value;
        volumeControls().forEach((control) => {
            control.value = value;
        });
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return '0:00';
        }

        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60);
        return `${minutes}:${String(remainder).padStart(2, '0')}`;
    }

    function updateTimeline() {
        const duration = audio.duration;
        const current = audio.currentTime || 0;

        currentTimeEls().forEach((el) => {
            el.textContent = formatTime(current);
        });
        durationEls().forEach((el) => {
            const remaining = Number.isFinite(duration) ? Math.max(0, duration - current) : 0;
            el.textContent = `-${formatTime(remaining)}`;
        });

        if (isSeeking || !Number.isFinite(duration) || duration <= 0) {
            return;
        }

        seekControls().forEach((control) => {
            control.max = String(Math.round(duration * 100));
            control.value = String(Math.round(current * 100));
        });
    }

    function replayTrack() {
        audio.currentTime = 0;
        updateTimeline();
        audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
    }

    function skipToNext() {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const nextTime = (audio.currentTime || 0) + 10;
        audio.currentTime = duration > 0 ? nextTime % duration : 0;
        updateTimeline();
    }

    setVolume(DEFAULT_VOLUME);
    setPlayingState(false);
    updateTimeline();

    function hasEasterEggAudioFinished() {
        return audio.ended
            || (Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.1);
    }

    function togglePlayback() {
        if (audio.paused) {
            if (isEasterEggAudioActive() && hasEasterEggAudioFinished()) {
                audio.currentTime = 0;
            }

            audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
        } else {
            audio.pause();
        }
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-music-play]')) {
            togglePlayback();
            return;
        }
        if (event.target.closest('[data-music-replay]')) {
            replayTrack();
            return;
        }
        if (event.target.closest('[data-music-next]')) {
            skipToNext();
        }
    });

    document.addEventListener('input', (event) => {
        const volume = event.target.closest('[data-music-volume]');
        if (volume) {
            setVolume(volume.value);
            return;
        }

        const seek = event.target.closest('[data-music-seek]');
        if (!seek) {
            return;
        }

        const duration = audio.duration;
        const max = Number(seek.max) || 1000;
        if (!Number.isFinite(duration) || duration <= 0) {
            return;
        }

        audio.currentTime = (Number(seek.value) / max) * duration;
        currentTimeEls().forEach((el) => {
            el.textContent = formatTime(audio.currentTime);
        });
    });

    document.addEventListener('pointerdown', (event) => {
        if (event.target.closest('[data-music-seek]')) {
            isSeeking = true;
        }
    });

    document.addEventListener('change', (event) => {
        if (event.target.closest('[data-music-seek]')) {
            isSeeking = false;
            updateTimeline();
        }
    });

    document.addEventListener('pointerup', () => {
        if (!isSeeking) {
            return;
        }

        isSeeking = false;
        updateTimeline();
    });

    audio.addEventListener('play', () => setPlayingState(true));
    audio.addEventListener('pause', () => setPlayingState(false));
    audio.addEventListener('timeupdate', updateTimeline);
    audio.addEventListener('loadedmetadata', updateTimeline);
    audio.addEventListener('durationchange', updateTimeline);

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

        musicTitles().forEach((title) => {
            title.querySelectorAll('.music-title-copy').forEach((copy) => {
                copy.textContent = track.title;
            });
        });

        musicLinks().forEach((link) => {
            link.href = track.youtube;
            link.setAttribute('aria-label', `Open ${track.title} on YouTube`);
        });

        musicCovers().forEach((cover) => {
            cover.src = track.cover;
            cover.alt = track.coverAlt;
        });

        updateMusicTitleMarquees();
        updateTimeline();

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
        if (!isEasterEggAudioActive()) {
            return;
        }

        musicCovers().forEach((cover) => {
            cover.src = src;
        });
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

    function updateMusicTitleMarquee(musicTitle) {
        const musicTitleTrack = musicTitle.querySelector('.music-title-track');
        if (!musicTitleTrack || prefersReducedMotion) {
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

        const isPlaying = [...playPauseBtns()].some((button) => button.getAttribute('aria-pressed') === 'true');
        musicTitle.classList.toggle('is-marquee-paused', !isPlaying);
    }

    function updateMusicTitleMarquees() {
        musicTitles().forEach(updateMusicTitleMarquee);
    }

    updateMusicTitleMarquees();
    window.addEventListener('resize', updateMusicTitleMarquees);

    if ('ResizeObserver' in window) {
        const titleObserver = new ResizeObserver(updateMusicTitleMarquees);
        musicTitles().forEach((title) => {
            const track = title.querySelector('.music-title-track');
            if (track) {
                titleObserver.observe(track);
            }
        });
    }
})();
