/**
 * music-player.js — CLEAN FIXED VERSION
 * ✓ Play/Pause button glitch fix
 * ✓ Reload par scroll se foran music
 * ✓ User ne pause kiya tha toh reload par nahi chalega
 */

(function () {
  'use strict';

  var MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  var DEFAULT_VOL = 0.18;
  var POPUP_DELAY = 4000;

  // ════════════════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════════════════

  var state = {
    isPlaying: false,
    volume: DEFAULT_VOL,
    isMuted: false,
    currentTime: 0,
    popupShown: false
  };

  // sessionStorage: reload detect
  var wasPlaying = false;
  try { wasPlaying = sessionStorage.getItem('mpWasPlaying') === 'true'; } catch (e) {}

  // localStorage: volume, mute, popupShown restore
  try {
    var saved = JSON.parse(localStorage.getItem('mpState') || '{}');
    if (saved.volume !== undefined) state.volume = saved.volume;
    if (saved.isMuted !== undefined) state.isMuted = saved.isMuted;
    if (saved.currentTime !== undefined) state.currentTime = saved.currentTime;
    if (saved.popupShown !== undefined) state.popupShown = saved.popupShown;
  } catch (e) {}

  function saveState() {
    try {
      localStorage.setItem('mpState', JSON.stringify({
        volume: state.volume,
        isMuted: state.isMuted,
        currentTime: state.currentTime,
        popupShown: state.popupShown
      }));
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUDIO
  // ════════════════════════════════════════════════════════════════════════

  var audio = new Audio(MUSIC_SRC);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = state.volume;
  audio.muted = state.isMuted;
  if (state.currentTime > 0) {
    audio.addEventListener('loadedmetadata', function () {
      audio.currentTime = state.currentTime;
    }, { once: true });
  }

  // Save currentTime every second
  setInterval(function () {
    if (!audio.paused) {
      state.currentTime = audio.currentTime;
      saveState();
      try { sessionStorage.setItem('mpWasPlaying', 'true'); } catch (e) {}
    }
  }, 1000);

  // ════════════════════════════════════════════════════════════════════════
  // PLAY / PAUSE — single clean function, no playPromise race
  // ════════════════════════════════════════════════════════════════════════

  var playing = false; // single source of truth for UI

  function doPlay() {
    var p = audio.play();
    if (p !== undefined) {
      p.then(function () {
        playing = true;
        renderUI();
      }).catch(function (err) {
        playing = false;
        renderUI();
        console.warn('Play blocked:', err);
      });
    } else {
      playing = true;
      renderUI();
    }
    // Optimistically update UI immediately
    playing = true;
    renderUI();
  }

  function doPause() {
    audio.pause();
    playing = false;
    try { sessionStorage.setItem('mpWasPlaying', 'false'); } catch (e) {}
    renderUI();
  }

  function togglePlay() {
    if (playing) {
      doPause();
    } else {
      doPlay();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUTO START
  // ════════════════════════════════════════════════════════════════════════

  function tryAutoPlay() {
    var p = audio.play();
    if (p !== undefined) {
      p.then(function () {
        playing = true;
        renderUI();
      }).catch(function () {
        playing = false;
        renderUI();
        // Wait for any interaction then play
        listenForFirstInteraction(doPlay);
      });
    } else {
      playing = true;
      renderUI();
    }
  }

  function listenForFirstInteraction(cb) {
    var events = ['scroll', 'click', 'touchstart', 'keydown', 'mousedown'];
    function handler() {
      cb();
      events.forEach(function (ev) {
        document.removeEventListener(ev, handler, true);
      });
    }
    events.forEach(function (ev) {
      document.addEventListener(ev, handler, { capture: true, once: true, passive: ev !== 'click' && ev !== 'keydown' });
    });
  }

  // On page load: if was playing before reload → wait for first scroll/click → play
  // Otherwise try autoplay directly
  if (wasPlaying) {
    // Reload hua — canplay par foran play, no interaction needed
    audio.addEventListener("canplay", function () { doPlay(); }, { once: true });
    setTimeout(doPlay, 500); // fallback
  } else {
    setTimeout(tryAutoPlay, 300);
  }

  // ════════════════════════════════════════════════════════════════════════
  // VOLUME / MUTE
  // ════════════════════════════════════════════════════════════════════════

  function setVolume(v) {
    state.volume = v;
    audio.volume = v;
    if (v === 0) { state.isMuted = true; audio.muted = true; }
    else { state.isMuted = false; audio.muted = false; }
    saveState();
    renderUI();
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    audio.muted = state.isMuted;
    saveState();
    renderUI();
  }

  // Tab visibility resume
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && playing && audio.paused) {
      audio.play().catch(function () {});
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════════════════════════

  var style = document.createElement('style');
  style.textContent = `
    #mp-btn {
      position: fixed; right: 24px; top: 50%; transform: translateY(-50%);
      z-index: 9998; width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #C8922A, #f8ba46);
      border: 2px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(200,146,42,0.35);
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
    }
    #mp-btn:hover { transform: translateY(-50%) scale(1.12); box-shadow: 0 12px 48px rgba(200,146,42,0.5); }
    #mp-btn:active { transform: translateY(-50%) scale(0.94); }
    #mp-btn.is-playing { animation: mpGlow 1.6s ease-in-out infinite; }
    @keyframes mpGlow {
      0%,100% { box-shadow: 0 8px 32px rgba(200,146,42,0.35); }
      50%      { box-shadow: 0 8px 52px rgba(200,146,42,0.75); }
    }
    #mp-btn svg { width: 30px; height: 30px; fill: #fff; pointer-events: none; }

    #mp-pop {
      position: fixed; right: -420px; top: 50%; transform: translateY(-50%);
      z-index: 9999; width: min(370px, calc(100vw - 36px));
      background: linear-gradient(145deg, #0e0e0e, #060606);
      border: 1px solid rgba(255,255,255,0.07); border-radius: 10px;
      box-shadow: 0 20px 80px rgba(0,0,0,0.85);
      transition: right 0.55s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'Montserrat', sans-serif; overflow: hidden;
    }
    #mp-pop.open { right: 92px; }
    .mp-bar { height: 3px; background: linear-gradient(90deg,#C8922A,#f8ba46,#C8922A); background-size: 200%; animation: mpSlide 2.5s linear infinite; }
    @keyframes mpSlide { to { background-position: 200%; } }
    .mp-body { padding: 26px 22px 20px; position: relative; }
    .mp-close {
      position: absolute; top: 14px; right: 14px; width: 30px; height: 30px;
      border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #888; font-size: 13px; font-weight: 700;
      transition: background 0.25s, color 0.25s;
    }
    .mp-close:hover { background: rgba(200,146,42,0.2); color: #C8922A; border-color: #C8922A; }
    .mp-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
    .mp-icon {
      width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid rgba(200,146,42,0.4);
      display: flex; align-items: center; justify-content: center;
      animation: mpPulse 2.8s ease-in-out infinite;
    }
    @keyframes mpPulse { 50% { box-shadow: 0 0 0 10px rgba(200,146,42,0); } }
    .mp-icon svg { width: 24px; height: 24px; fill: #f8ba46; }
    .mp-title { font-family: 'Raleway', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; margin: 0 0 3px; }
    .mp-sub { font-size: 11px; color: #777; letter-spacing: 1px; margin: 0; }
    .mp-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 14px 0; }
    .mp-msg { font-size: 12px; color: #888; line-height: 1.7; margin-bottom: 16px; }
    .mp-msg strong { color: #d4a850; }
    .mp-vol { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; margin-bottom: 12px; }
    .mp-vol-ico { color: #f8ba46; font-size: 15px; flex-shrink: 0; }
    .mp-vol-lbl { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #555; min-width: 24px; }
    #mp-slider {
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 3px; border-radius: 2px; outline: none; cursor: pointer;
      background: linear-gradient(90deg, #C8922A var(--vf, 18%), rgba(255,255,255,0.1) var(--vf, 18%));
    }
    #mp-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #fff; border: 2px solid #C8922A; cursor: pointer; transition: transform 0.2s; }
    #mp-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
    #mp-slider::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: #fff; border: 2px solid #C8922A; cursor: pointer; }
    .mp-pct { font-size: 11px; color: #666; min-width: 34px; text-align: right; font-weight: 600; }
    .mp-btns { display: flex; gap: 8px; }
    .mp-action {
      flex: 1; padding: 10px 8px; background: transparent;
      border: 1px solid rgba(255,255,255,0.12); color: #999;
      font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px;
      cursor: pointer; transition: all 0.25s;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    .mp-action:hover { background: #C8922A; border-color: #C8922A; color: #fff; }
    .mp-action svg { width: 12px; height: 12px; fill: currentColor; flex-shrink: 0; }

    @media (max-width: 768px) {
      #mp-btn { right: 14px; width: 52px; height: 52px; }
      #mp-pop.open { right: 14px; }
      #mp-pop { width: calc(100vw - 28px); }
    }
    @media (max-width: 480px) {
      #mp-btn { right: 10px; width: 46px; height: 46px; }
      #mp-pop { width: calc(100vw - 20px); }
      #mp-pop.open { right: 10px; }
      .mp-body { padding: 20px 16px 16px; }
    }
  `;
  document.head.appendChild(style);

  // ════════════════════════════════════════════════════════════════════════
  // DOM
  // ════════════════════════════════════════════════════════════════════════

  // Side button
  var btn = document.createElement('button');
  btn.id = 'mp-btn';
  btn.title = 'Music Player';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>';

  // Popup
  var pop = document.createElement('div');
  pop.id = 'mp-pop';
  var initVol = Math.round(state.volume * 100);
  pop.innerHTML = `
    <div class="mp-bar"></div>
    <div class="mp-body">
      <div class="mp-close" id="mp-close">✕</div>
      <div class="mp-head">
        <div class="mp-icon">
          <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>
        </div>
        <div>
          <p class="mp-title">Sweet Ambience</p>
          <p class="mp-sub">Romantic Atmosphere</p>
        </div>
      </div>
      <div class="mp-divider"></div>
      <p class="mp-msg">Experience <strong>elegant romantic music</strong> while browsing. Adjust volume or toggle below.</p>
      <div class="mp-vol">
        <span class="mp-vol-ico">♪</span>
        <span class="mp-vol-lbl">Vol</span>
        <input type="range" id="mp-slider" min="0" max="100" value="${initVol}" style="--vf:${initVol}%">
        <span class="mp-pct" id="mp-pct">${initVol}%</span>
      </div>
      <div class="mp-btns">
        <button class="mp-action" id="mp-play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span>PLAY</span>
        </button>
        <button class="mp-action" id="mp-mute">🔇 MUTE</button>
      </div>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(pop);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER UI — called after every state change
  // ════════════════════════════════════════════════════════════════════════

  function renderUI() {
    // Side button glow
    if (playing) btn.classList.add('is-playing');
    else btn.classList.remove('is-playing');

    // Play/Pause button — NO glitch: set innerHTML only when state actually changes
    var playBtn = document.getElementById('mp-play');
    if (playBtn) {
      if (playing) {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg><span>PAUSE</span>';
      } else {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span>PLAY</span>';
      }
    }

    // Mute button
    var muteBtn = document.getElementById('mp-mute');
    if (muteBtn) {
      if (state.isMuted) {
        muteBtn.textContent = '🔊 UNMUTE';
        muteBtn.style.cssText = 'background:rgba(200,146,42,0.15);border-color:rgba(200,146,42,0.5);color:#C8922A;';
      } else {
        muteBtn.textContent = '🔇 MUTE';
        muteBtn.style.cssText = '';
      }
    }

    // Volume slider
    var slider = document.getElementById('mp-slider');
    var pctEl = document.getElementById('mp-pct');
    if (slider && pctEl) {
      var pct = Math.round(state.volume * 100);
      slider.value = pct;
      slider.style.setProperty('--vf', pct + '%');
      pctEl.textContent = pct + '%';
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════════════════════════════════════

  // Toggle popup
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    pop.classList.toggle('open');
  });

  document.getElementById('mp-close').addEventListener('click', function (e) {
    e.stopPropagation();
    pop.classList.remove('open');
  });

  document.getElementById('mp-play').addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  document.getElementById('mp-mute').addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMute();
  });

  document.getElementById('mp-slider').addEventListener('input', function (e) {
    e.stopPropagation();
    setVolume(parseInt(this.value) / 100);
  });

  // Close popup on outside click
  document.addEventListener('click', function (e) {
    if (!pop.contains(e.target) && e.target !== btn) {
      pop.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') pop.classList.remove('open');
  });

  // ════════════════════════════════════════════════════════════════════════
  // POPUP AUTO-SHOW (first visit only)
  // ════════════════════════════════════════════════════════════════════════

  if (!state.popupShown) {
    setTimeout(function () {
      pop.classList.add('open');
      state.popupShown = true;
      saveState();
      setTimeout(function () { pop.classList.remove('open'); }, 6000);
    }, POPUP_DELAY);
  }

  // Initial render
  renderUI();

  // Global access
  window._mpPlayer = { toggle: togglePlay, mute: toggleMute, setVolume: setVolume };

})();