/* ==========================================================================
   TimePro - Advanced Stopwatch & Precision Timer Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. SOUND & AUDIO SYNTHESIZER (Web Audio API)
    // =========================================================================
    class SoundEngine {
        constructor() {
            this.audioCtx = null;
            this.muted = localStorage.getItem('chrono_muted') === 'true';
            this.initUI();
        }

        initContext() {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioCtx = new AudioContext();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('chrono_muted', this.muted);
            this.updateUI();
        }

        initUI() {
            this.updateUI();
            const btnSound = document.getElementById('btn-sound');
            if (btnSound) {
                btnSound.addEventListener('click', () => {
                    this.initContext();
                    this.toggleMute();
                });
            }
        }

        updateUI() {
            const btnSound = document.getElementById('btn-sound');
            if (!btnSound) return;
            const iconOn = btnSound.querySelector('.sound-on-icon');
            const iconOff = btnSound.querySelector('.sound-off-icon');

            if (this.muted) {
                iconOn.classList.add('hidden');
                iconOff.classList.remove('hidden');
                btnSound.title = "Unmute Sound (M)";
            } else {
                iconOn.classList.remove('hidden');
                iconOff.classList.add('hidden');
                btnSound.title = "Mute Sound (M)";
            }
        }

        playClick() {
            if (this.muted) return;
            this.initContext();
            if (!this.audioCtx) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.05);

                gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.05);
            } catch (e) {
                console.warn('Audio click error:', e);
            }
        }

        playAlarm() {
            if (this.muted) return;
            this.initContext();
            if (!this.audioCtx) return;

            try {
                const now = this.audioCtx.currentTime;
                // Play 3 pulsing chime tones
                [0, 0.25, 0.5, 0.75].forEach((delay) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(880, now + delay); // A5 note

                    gain.gain.setValueAtTime(0.3, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);

                    osc.start(now + delay);
                    osc.stop(now + delay + 0.2);
                });
            } catch (e) {
                console.warn('Audio alarm error:', e);
            }
        }
    }

    const sound = new SoundEngine();

    // =========================================================================
    // 2. THEME & FULLSCREEN CONTROLLER
    // =========================================================================
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    let currentTheme = localStorage.getItem('chrono_theme') || 'dark';
    // Migration fallback if old theme was cyber, midnight, or oled
    if (['cyber', 'midnight', 'oled'].includes(currentTheme)) {
        currentTheme = 'dark';
    }
    
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('chrono_theme', theme);

        if (btnThemeToggle) {
            const sunIcon = btnThemeToggle.querySelector('.sun-icon');
            const moonIcon = btnThemeToggle.querySelector('.moon-icon');
            if (theme === 'light') {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
                btnThemeToggle.title = "Switch to Dark Mode";
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
                btnThemeToggle.title = "Switch to Light Mode";
            }
        }
    }

    applyTheme(currentTheme);

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            sound.playClick();
        });
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    function toggleFullscreen() {
        sound.playClick();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Fullscreen error: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if (!btnFullscreen) return;
        const expandIcon = btnFullscreen.querySelector('.expand-icon');
        const compressIcon = btnFullscreen.querySelector('.compress-icon');
        if (document.fullscreenElement) {
            expandIcon.classList.add('hidden');
            compressIcon.classList.remove('hidden');
        } else {
            expandIcon.classList.remove('hidden');
            compressIcon.classList.add('hidden');
        }
    });

    // =========================================================================
    // 3. MODE NAVIGATION CONTROLLER
    // =========================================================================
    const modeBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const lapsPanel = document.getElementById('laps-panel');
    let currentMode = 'stopwatch';

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
            sound.playClick();
        });
    });

    function switchMode(mode) {
        currentMode = mode;
        modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        viewSections.forEach(s => s.classList.toggle('active', s.id === `view-${mode}`));
        
        // Only show laps panel on stopwatch mode
        if (lapsPanel) {
            lapsPanel.style.display = (mode === 'stopwatch') ? 'flex' : 'none';
        }
    }

    // =========================================================================
    // 4. TIME FORMATTING HELPER FUNCTIONS
    // =========================================================================
    function padZero(num, size = 2) {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    function parseTimeMs(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const millis = Math.floor((ms % 1000) / 10);
        return { hours, minutes, seconds, millis };
    }

    function formatTimeFull(ms) {
        const { hours, minutes, seconds, millis } = parseTimeMs(ms);
        return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${padZero(millis, 2)}`;
    }

    function formatTimeShort(ms) {
        const { hours, minutes, seconds, millis } = parseTimeMs(ms);
        if (hours > 0) {
            return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${padZero(millis, 2)}`;
        }
        return `${padZero(minutes)}:${padZero(seconds)}.${padZero(millis, 2)}`;
    }

    // =========================================================================
    // 5. STOPWATCH MODULE
    // =========================================================================
    let swState = 'idle'; // 'idle', 'running', 'paused'
    let swStartTime = 0;
    let swElapsedTime = 0;
    let swLapStartTime = 0;
    let swAnimFrame = null;
    let laps = [];

    // DOM Elements
    const swElHours = document.getElementById('sw-hours');
    const swElMinutes = document.getElementById('sw-minutes');
    const swElSeconds = document.getElementById('sw-seconds');
    const swElMillis = document.getElementById('sw-millis');
    const swElCurrentLap = document.getElementById('sw-current-lap-time');
    const swElStatus = document.getElementById('sw-status');
    const swProgressRing = document.getElementById('sw-progress-ring');

    const swBtnStart = document.getElementById('sw-btn-start');
    const swBtnLap = document.getElementById('sw-btn-lap');
    const swBtnReset = document.getElementById('sw-btn-reset');
    const swStartLabel = document.getElementById('sw-start-label');
    const swIconPlay = swBtnStart ? swBtnStart.querySelector('.icon-play') : null;
    const swIconPause = swBtnStart ? swBtnStart.querySelector('.icon-pause') : null;

    if (swBtnStart) swBtnStart.addEventListener('click', toggleStopwatch);
    if (swBtnLap) swBtnLap.addEventListener('click', recordLap);
    if (swBtnReset) swBtnReset.addEventListener('click', resetStopwatch);

    function toggleStopwatch() {
        sound.playClick();
        if (swState === 'idle' || swState === 'paused') {
            startStopwatch();
        } else {
            pauseStopwatch();
        }
    }

    function startStopwatch() {
        swState = 'running';
        const now = Date.now();
        swStartTime = now - swElapsedTime;
        if (laps.length === 0) {
            swLapStartTime = now;
        } else {
            // Adjust lap start time for pause duration
            const lastLapEnd = laps[0].overallMs;
            swLapStartTime = now - (swElapsedTime - lastLapEnd);
        }

        updateStopwatchUI();
        swAnimFrame = requestAnimationFrame(updateStopwatchLoop);
    }

    function pauseStopwatch() {
        swState = 'paused';
        cancelAnimationFrame(swAnimFrame);
        swElapsedTime = Date.now() - swStartTime;
        updateStopwatchUI();
    }

    function resetStopwatch() {
        sound.playClick();
        swState = 'idle';
        cancelAnimationFrame(swAnimFrame);
        swStartTime = 0;
        swElapsedTime = 0;
        swLapStartTime = 0;
        laps = [];
        
        renderDisplay(0);
        if (swElCurrentLap) swElCurrentLap.textContent = "00:00.00";
        if (swProgressRing) swProgressRing.style.strokeDashoffset = '0';

        updateStopwatchUI();
        renderLaps();
    }

    function updateStopwatchLoop() {
        if (swState !== 'running') return;
        swElapsedTime = Date.now() - swStartTime;
        renderDisplay(swElapsedTime);

        // Update current lap timer
        const currentLapMs = swElapsedTime - (laps.length > 0 ? laps[0].overallMs : 0);
        if (swElCurrentLap) swElCurrentLap.textContent = formatTimeShort(currentLapMs);

        // Circular Progress Ring (Completes 1 full revolution every 60 seconds)
        if (swProgressRing) {
            const currentSecMillis = swElapsedTime % 60000;
            const progressFraction = currentSecMillis / 60000;
            const circumference = 848; // 2 * PI * 135
            const offset = circumference * (1 - progressFraction);
            swProgressRing.style.strokeDashoffset = offset;
        }

        swAnimFrame = requestAnimationFrame(updateStopwatchLoop);
    }

    function renderDisplay(ms) {
        const { hours, minutes, seconds, millis } = parseTimeMs(ms);
        if (swElHours) swElHours.textContent = padZero(hours);
        if (swElMinutes) swElMinutes.textContent = padZero(minutes);
        if (swElSeconds) swElSeconds.textContent = padZero(seconds);
        if (swElMillis) swElMillis.textContent = padZero(millis, 2);
    }

    function updateStopwatchUI() {
        if (!swBtnStart) return;

        if (swState === 'running') {
            swElStatus.textContent = 'RUNNING';
            swStartLabel.textContent = 'Pause';
            swBtnStart.classList.add('btn-running');
            swIconPlay.classList.add('hidden');
            swIconPause.classList.remove('hidden');
            swBtnLap.disabled = false;
            swBtnReset.disabled = false;
        } else if (swState === 'paused') {
            swElStatus.textContent = 'PAUSED';
            swStartLabel.textContent = 'Resume';
            swBtnStart.classList.remove('btn-running');
            swIconPlay.classList.remove('hidden');
            swIconPause.classList.add('hidden');
            swBtnLap.disabled = true;
            swBtnReset.disabled = false;
        } else {
            swElStatus.textContent = 'READY';
            swStartLabel.textContent = 'Start';
            swBtnStart.classList.remove('btn-running');
            swIconPlay.classList.remove('hidden');
            swIconPause.classList.add('hidden');
            swBtnLap.disabled = true;
            swBtnReset.disabled = true;
        }
    }

    function recordLap() {
        if (swState !== 'running') return;
        sound.playClick();

        const previousOverallMs = laps.length > 0 ? laps[0].overallMs : 0;
        const lapDurationMs = swElapsedTime - previousOverallMs;

        const lapData = {
            id: laps.length + 1,
            durationMs: lapDurationMs,
            overallMs: swElapsedTime,
            formattedDuration: formatTimeFull(lapDurationMs),
            formattedOverall: formatTimeFull(swElapsedTime)
        };

        // Unshift to place newest lap at the top of the array
        laps.unshift(lapData);
        renderLaps();
    }

    // =========================================================================
    // 6. LAPS & ANALYTICS RENDERER
    // =========================================================================
    const lapsList = document.getElementById('laps-list');
    const statTotalLaps = document.getElementById('stat-total-laps');
    const statFastestLap = document.getElementById('stat-fastest-lap');
    const statSlowestLap = document.getElementById('stat-slowest-lap');
    const statAvgLap = document.getElementById('stat-avg-lap');
    const btnClearLaps = document.getElementById('btn-clear-laps');

    if (btnClearLaps) btnClearLaps.addEventListener('click', () => {
        sound.playClick();
        laps = [];
        renderLaps();
    });

    function renderLaps() {
        if (!lapsList) return;

        if (laps.length === 0) {
            lapsList.innerHTML = `<tr class="empty-row"><td colspan="4">No laps recorded yet. Press "Lap / Split" while timer is running.</td></tr>`;
            if (statTotalLaps) statTotalLaps.textContent = '0';
            if (statFastestLap) statFastestLap.textContent = '--:--.--';
            if (statSlowestLap) statSlowestLap.textContent = '--:--.--';
            if (statAvgLap) statAvgLap.textContent = '--:--.--';
            if (btnClearLaps) btnClearLaps.disabled = true;
            return;
        }

        if (btnClearLaps) btnClearLaps.disabled = false;

        // Compute Fastest & Slowest Lap durations
        let minDuration = Infinity;
        let maxDuration = -1;
        let totalDuration = 0;

        laps.forEach(l => {
            if (l.durationMs < minDuration) minDuration = l.durationMs;
            if (l.durationMs > maxDuration) maxDuration = l.durationMs;
            totalDuration += l.durationMs;
        });

        const avgDuration = totalDuration / laps.length;

        // Update stats bar
        if (statTotalLaps) statTotalLaps.textContent = laps.length;
        if (statFastestLap) statFastestLap.textContent = formatTimeShort(minDuration);
        if (statSlowestLap) statSlowestLap.textContent = formatTimeShort(maxDuration);
        if (statAvgLap) statAvgLap.textContent = formatTimeShort(avgDuration);

        // Build HTML Table Rows
        let html = '';
        laps.forEach((lap, index) => {
            let rowClass = '';
            let badgeHtml = '';

            // Only highlight fastest/slowest if at least 2 laps exist
            if (laps.length > 1) {
                if (lap.durationMs === minDuration) {
                    rowClass = 'badge-fastest';
                    badgeHtml = ' ⚡ (Fastest)';
                } else if (lap.durationMs === maxDuration) {
                    rowClass = 'badge-slowest';
                    badgeHtml = ' 🐢 (Slowest)';
                }
            }

            // Delta vs previous lap
            let deltaText = '--';
            const nextLapInArray = laps[index + 1]; // Array is sorted descending (newest first)
            if (nextLapInArray) {
                const diff = lap.durationMs - nextLapInArray.durationMs;
                const sign = diff > 0 ? '+' : '';
                deltaText = `${sign}${(diff / 1000).toFixed(2)}s`;
            }

            html += `
                <tr class="${rowClass}">
                    <td><strong>Lap ${lap.id}</strong>${badgeHtml}</td>
                    <td>${lap.formattedDuration}</td>
                    <td>${lap.formattedOverall}</td>
                    <td>${deltaText}</td>
                </tr>
            `;
        });

        lapsList.innerHTML = html;
    }



    // =========================================================================
    // 7. COUNTDOWN TIMER MODULE
    // =========================================================================
    let tmState = 'idle'; // 'idle', 'running', 'paused'
    let tmTotalMs = 0;
    let tmRemainingMs = 0;
    let tmEndTime = 0;
    let tmAnimFrame = null;

    const tmInputGroup = document.getElementById('tm-input-group');
    const tmDisplay = document.getElementById('tm-display');
    const tmInputH = document.getElementById('tm-input-h');
    const tmInputM = document.getElementById('tm-input-m');
    const tmInputS = document.getElementById('tm-input-s');

    const tmElHours = document.getElementById('tm-hours');
    const tmElMinutes = document.getElementById('tm-minutes');
    const tmElSeconds = document.getElementById('tm-seconds');
    const tmElStatus = document.getElementById('tm-status');
    const tmProgressRing = document.getElementById('tm-progress-ring');

    const tmBtnStart = document.getElementById('tm-btn-start');
    const tmBtnCancel = document.getElementById('tm-btn-cancel');
    const tmStartLabel = document.getElementById('tm-start-label');
    const tmPresets = document.querySelectorAll('.preset-btn');

    if (tmBtnStart) tmBtnStart.addEventListener('click', toggleTimer);
    if (tmBtnCancel) tmBtnCancel.addEventListener('click', cancelTimer);

    tmPresets.forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playClick();
            const sec = parseInt(btn.dataset.time, 10);
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            if (tmInputH) tmInputH.value = padZero(h);
            if (tmInputM) tmInputM.value = padZero(m);
            if (tmInputS) tmInputS.value = padZero(s);
        });
    });

    function getTimerInputMs() {
        const h = parseInt(tmInputH.value || 0, 10);
        const m = parseInt(tmInputM.value || 0, 10);
        const s = parseInt(tmInputS.value || 0, 10);
        return ((h * 3600) + (m * 60) + s) * 1000;
    }

    function toggleTimer() {
        sound.playClick();
        if (tmState === 'idle') {
            const inputMs = getTimerInputMs();
            if (inputMs <= 0) {
                alert('Please enter a valid time greater than 0 seconds.');
                return;
            }
            tmTotalMs = inputMs;
            tmRemainingMs = inputMs;
            startTimer();
        } else if (tmState === 'running') {
            pauseTimer();
        } else if (tmState === 'paused') {
            startTimer();
        }
    }

    function startTimer() {
        tmState = 'running';
        tmEndTime = Date.now() + tmRemainingMs;
        
        tmInputGroup.classList.add('hidden');
        tmDisplay.classList.remove('hidden');

        updateTimerUI();
        tmAnimFrame = requestAnimationFrame(updateTimerLoop);
    }

    function pauseTimer() {
        tmState = 'paused';
        cancelAnimationFrame(tmAnimFrame);
        tmRemainingMs = Math.max(0, tmEndTime - Date.now());
        updateTimerUI();
    }

    function cancelTimer() {
        sound.playClick();
        tmState = 'idle';
        cancelAnimationFrame(tmAnimFrame);
        tmTotalMs = 0;
        tmRemainingMs = 0;

        tmInputGroup.classList.remove('hidden');
        tmDisplay.classList.add('hidden');
        if (tmProgressRing) tmProgressRing.style.strokeDashoffset = '0';

        updateTimerUI();
    }

    function updateTimerLoop() {
        if (tmState !== 'running') return;
        tmRemainingMs = Math.max(0, tmEndTime - Date.now());

        const { hours, minutes, seconds } = parseTimeMs(tmRemainingMs);
        if (tmElHours) tmElHours.textContent = padZero(hours);
        if (tmElMinutes) tmElMinutes.textContent = padZero(minutes);
        if (tmElSeconds) tmElSeconds.textContent = padZero(seconds);

        // Progress ring depletion
        if (tmProgressRing && tmTotalMs > 0) {
            const fraction = tmRemainingMs / tmTotalMs;
            const circumference = 848;
            const offset = circumference * (1 - fraction);
            tmProgressRing.style.strokeDashoffset = offset;
        }

        if (tmRemainingMs <= 0) {
            // Timer Finished!
            tmState = 'idle';
            cancelAnimationFrame(tmAnimFrame);
            sound.playAlarm();
            alert('⏰ Countdown Timer Finished!');
            cancelTimer();
            return;
        }

        tmAnimFrame = requestAnimationFrame(updateTimerLoop);
    }

    function updateTimerUI() {
        if (!tmBtnStart) return;

        if (tmState === 'running') {
            tmElStatus.textContent = 'TIMING';
            tmStartLabel.textContent = 'Pause Timer';
            tmBtnStart.classList.add('btn-running');
            tmBtnCancel.disabled = false;
        } else if (tmState === 'paused') {
            tmElStatus.textContent = 'PAUSED';
            tmStartLabel.textContent = 'Resume Timer';
            tmBtnStart.classList.remove('btn-running');
            tmBtnCancel.disabled = false;
        } else {
            tmElStatus.textContent = 'SET TIME';
            tmStartLabel.textContent = 'Start Timer';
            tmBtnStart.classList.remove('btn-running');
            tmBtnCancel.disabled = true;
        }
    }

    // =========================================================================
    // 8. LIVE DIGITAL CLOCK MODULE
    // =========================================================================
    const clkTime = document.getElementById('clk-time');
    const clkAmPm = document.getElementById('clk-ampm');
    const clkDate = document.getElementById('clk-date');
    const clkTimezone = document.getElementById('clk-timezone');

    function updateClock() {
        const now = new Date();
        
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // 0 becomes 12

        if (clkTime) clkTime.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        if (clkAmPm) clkAmPm.textContent = ampm;

        if (clkDate) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            clkDate.textContent = now.toLocaleDateString(undefined, options);
        }

        if (clkTimezone) {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            clkTimezone.textContent = `Timezone: ${tz}`;
        }
    }

    setInterval(updateClock, 1000);
    updateClock();

    // =========================================================================
    // 9. KEYBOARD SHORTCUTS CONTROLLER
    // =========================================================================
    document.addEventListener('keydown', (e) => {
        // Ignore keypresses inside input fields
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (currentMode === 'stopwatch') toggleStopwatch();
                else if (currentMode === 'timer') toggleTimer();
                break;
            case 'KeyL':
                if (currentMode === 'stopwatch') {
                    e.preventDefault();
                    recordLap();
                }
                break;
            case 'KeyR':
                e.preventDefault();
                if (currentMode === 'stopwatch') resetStopwatch();
                else if (currentMode === 'timer') cancelTimer();
                break;
            case 'KeyM':
                e.preventDefault();
                sound.toggleMute();
                break;
            case 'KeyF':
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    });
});
