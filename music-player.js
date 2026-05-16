/**
 * music-player.js (FIXED VERSION)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Fixes:
 * ✓ Music wapas chal raha hai (Web Audio API hata di — CORS issue tha)
 * ✓ Volume slider = audio.volume (sirf is player ki awaaz, device volume alag)
 * ✓ Small screen par bhi popup auto-show
 * ✓ First click par play, first click par pause (double-click bug fix)
 */

(function () {
  'use strict';

  var MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  var CONFIG = {
    DEFAULT_VOL: 0.18,
    POPUP_DELAY: 4000,
    DB_NAME: 'MusicPlayerDB',
    DB_STORE: 'playerState',
    DB_VERSION: 1
  };

  // ════════════════════════════════════════════════════════════════════════
  // INDEXED DB
  // ════════════════════════════════════════════════════════════════════════

  var db = null;

  function initDB() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) { resolve(); return; }
      var req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      req.onerror = function () { resolve(); };
      req.onsuccess = function () { db = req.result; resolve(); };
      req.onupgradeneeded = function (e) {
        var database = e.target.result;
        if (!database.objectStoreNames.contains(CONFIG.DB_STORE)) {
          database.createObjectStore(CONFIG.DB_STORE);
        }
      };
    });
  }

  function getFromDB(key) {
    return new Promise(function (resolve) {
      if (!db) { resolve(null); return; }
      try {
        var tx = db.transaction(CONFIG.DB_STORE, 'readonly');
        var store = tx.objectStore(CONFIG.DB_STORE);
        var req = store.get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function saveToDB(key, value) {
    return new Promise(function (resolve) {
      if (!db) { resolve(); return; }
      try {
        var tx = db.transaction(CONFIG.DB_STORE, 'readwrite');
        var store = tx.objectStore(CONFIG.DB_STORE);
        store.put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // STORAGE
  // ════════════════════════════════════════════════════════════════════════

  function getSavedState() {
    return new Promise(async function (resolve) {
      var dbState = await getFromDB('playerState');
      if (dbState) { resolve(dbState); return; }
      try {
        var lsState = localStorage.getItem('playerState');
        if (lsState) { resolve(JSON.parse(lsState)); return; }
      } catch (e) {}
      resolve({ isPlaying: false, volume: CONFIG.DEFAULT_VOL, isMuted: false, currentTime: 0, hasInteracted: false, popupShown: false });
    });
  }

  function saveState(state) {
    var obj = { isPlaying: state.isPlaying, volume: state.volume, isMuted: state.isMuted, currentTime: state.currentTime, hasInteracted: state.hasInteracted, popupShown: state.popupShown };
    saveToDB('playerState', obj).catch(function () {});
    try { localStorage.setItem('playerState', JSON.stringify(obj)); } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUDIO
  // audio.volume controls THIS player's volume (0.0–1.0)
  // Device/system volume is NOT affected
  // ════════════════════════════════════════════════════════════════════════

  var audio = new Audio(MUSIC_SRC);
  audio.loop = true;
  audio.preload = 'metadata';

  // Single-click fix: track the play() promise
  var playPromise = null;

  var playerState = { isPlaying: false, volume: CONFIG.DEFAULT_VOL, isMuted: false, currentTime: 0, hasInteracted: false, popupShown: false };

  audio.volume = playerState.volume;
  audio.muted = playerState.isMuted;

  getSavedState().then(function (saved) {
    playerState = saved;
    audio.volume = playerState.volume;
    audio.muted = playerState.isMuted;
    if (playerState.currentTime > 0) audio.currentTime = playerState.currentTime;
    if (playerState.isPlaying && playerState.hasInteracted) attemptPlay();
  });

  setInterval(function () {
    if (playerState.isPlaying) { playerState.currentTime = audio.currentTime; saveState(playerState); }
  }, 1000);

  // ════════════════════════════════════════════════════════════════════════
  // PLAYBACK — SINGLE CLICK FIX
  // ════════════════════════════════════════════════════════════════════════

  function attemptPlay() {
    if (playerState.isPlaying) return;
    if (playPromise !== null) return; // play() in-flight hai, wait karo

    updateUI();

    var p = audio.play();

    if (p !== undefined) {
      playPromise = p;
      p.then(function () {
        playPromise = null;
        playerState.isPlaying = true;
        playerState.hasInteracted = true;
        saveState(playerState);
        updateUI();
      }).catch(function (err) {
        playPromise = null;
        console.log('Autoplay blocked:', err);
        updateUI();
      });
    } else {
      playPromise = null;
      playerState.isPlaying = true;
      playerState.hasInteracted = true;
      saveState(playerState);
      updateUI();
    }
  }

  function togglePlayPause() {
    if (playPromise !== null) return;
    if (playerState.isPlaying) {
      audio.pause();
      playerState.isPlaying = false;
      saveState(playerState);
      updateUI();
    } else {
      attemptPlay();
    }
  }

  // Sirf audio.volume badlta hai — device volume same rehta hai
  function setVolume(newVol) {
    playerState.volume = newVol;
    audio.volume = newVol;
    audio.muted = (newVol === 0);
    playerState.isMuted = (newVol === 0);
    saveState(playerState);
    updateUI();
  }

  function toggleMute() {
    playerState.isMuted = !playerState.isMuted;
    audio.muted = playerState.isMuted;
    saveState(playerState);
    updateUI();
  }

  // ════════════════════════════════════════════════════════════════════════
  // USER INTERACTION
  // ════════════════════════════════════════════════════════════════════════

  function onUserInteraction() {
    if (!playerState.hasInteracted && !playerState.isPlaying) {
      playerState.hasInteracted = true;
      attemptPlay();
    }
  }

  document.addEventListener('click', onUserInteraction, { capture: true });
  document.addEventListener('touchstart', onUserInteraction, { capture: true, passive: true });
  document.addEventListener('keydown', onUserInteraction, { capture: true });
  document.addEventListener('scroll', onUserInteraction, { capture: true, passive: true });
  document.addEventListener('mousedown', onUserInteraction, { capture: true });

  window.addEventListener('load', function () {
    setTimeout(function () { if (!playerState.isPlaying && playerState.hasInteracted) attemptPlay(); }, 500);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && playerState.hasInteracted && playerState.isPlaying && !audio.currentTime) {
      setTimeout(attemptPlay, 200);
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════════════════════════

  var styles = document.createElement('style');
  styles.textContent = `
    #mp-side-btn {
      position: fixed; right: 24px; top: 50%; transform: translateY(-50%);
      z-index: 9998; width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #C8922A, #f8ba46);
      border: 2px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(250, 242, 242, 0.35);
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      backdrop-filter: blur(10px);
    }
    #mp-side-btn:hover { transform: translateY(-50%) scale(1.15); box-shadow: 0 12px 48px rgba(14, 10, 10, 0.5); border-color: rgba(255,255,255,0.4); }
    #mp-side-btn:active { transform: translateY(-50%) scale(0.95); }
    #mp-side-btn.playing { animation: mpGlow 1.5s ease-in-out infinite; }
    @keyframes mpGlow {
      0%,100% { box-shadow: 0 8px 32px rgba(7, 2, 2, 0.35); }
      50% { box-shadow: 0 8px 48px #C8922A; }
    }
    #mp-side-btn svg { width: 32px; height: 32px; fill: currentColor; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }

    #mp-popup {
      position: fixed; right: -450px; top: 50%; transform: translateY(-50%);
      z-index: 9999; width: min(380px, calc(100vw - 40px));
      background: linear-gradient(135deg, #0d0d0d, #030303);
      border: 1px solid rgba(5, 5, 5, 0.57); border-radius: 8px;
      box-shadow: 0 20px 80px rgba(0,0,0,0.85); overflow: hidden;
      transition: right 0.65s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'Montserrat', sans-serif;
    }
    #mp-popup.mp-open { right: 100px; }
    #mp-popup .mp-bar { height: 4px; background: linear-gradient(90deg,#C8922A, #f8ba46,#C8922A); background-size: 200%; animation: mpBar 2.5s linear infinite; }
    @keyframes mpBar { 0% { background-position: 0%; } 100% { background-position: 200%; } }
    #mp-popup .mp-body { padding: 28px 24px 20px; position: relative; }
    #mp-popup .mp-x {
      position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
      border-radius: 50%; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #aaa; font-size: 14px; transition: all 0.3s; padding: 0; font-weight: bold;
    }
    #mp-popup .mp-x:hover { background: #f5f3f0; color: #fff; border-color: #C8922A; }
    #mp-popup .mp-header { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    #mp-popup .mp-circle {
      width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
      background: rgba(128,0,0,0.12); border: 2px solid rgba(252, 252, 252, 0.57);
      display: flex; align-items: center; justify-content: center;
      animation: mpPulse 2.8s ease-in-out infinite;
    }
    @keyframes mpPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255, 253, 253, 0.35); } 50% { box-shadow: 0 0 0 12px rgba(128,0,0,0); } }
    #mp-popup .mp-circle svg { width: 26px; height: 26px; fill: #fdc764; }
    #mp-popup .mp-title { font-family: 'Raleway',sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; margin: 0 0 4px; }
    #mp-popup .mp-sub { font-size: 12px; color: #888; letter-spacing: 1px; margin: 0; font-weight: 500; }
    #mp-popup .mp-line { height: 1px; background: rgba(255,255,255,0.08); margin: 16px 0; }
    #mp-popup .mp-msg { font-size: 13px; color: #999; line-height: 1.7; margin-bottom: 18px; }
    #mp-popup .mp-msg strong { color: #e0c090; font-weight: 700; }
    #mp-popup .mp-ctrl { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 13px 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 4px; }
    #mp-popup .mp-ctrl-ico { flex-shrink: 0; color: #f8c567; font-size: 16px; }
    #mp-popup .mp-ctrl-lbl { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #666; min-width: 28px; }
    #mp-popup input[type='range'] {
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 4px; border-radius: 2px; outline: none; cursor: pointer;
      background: linear-gradient(90deg, #C8922A 0%, #C8922A var(--vf,18%), rgba(255,255,255,0.12) var(--vf,18%));
    }
    #mp-popup input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid #800000; cursor: pointer; box-shadow: 0 0 6px rgba(128,0,0,0.6); transition: transform 0.2s; }
    #mp-popup input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.25); }
    #mp-popup input[type='range']::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid #800000; cursor: pointer; box-shadow: 0 0 6px rgba(128,0,0,0.6); transition: transform 0.2s; }
    #mp-popup input[type='range']::-moz-range-thumb:hover { transform: scale(1.25); }
    #mp-popup .mp-pct { font-size: 11px; color: #888; min-width: 35px; text-align: right; font-weight: 600; }
    #mp-popup .mp-btn-group { display: flex; gap: 10px; }
    #mp-popup .mp-btn { flex: 1; padding: 11px 13px; background: transparent; border: 1px solid rgba(248, 239, 239, 0.4); color: #aaa; font-family: 'Montserrat',sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 3px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 6px; }
    #mp-popup .mp-btn:hover { background: #C8922A; border-color: #C8922A; color: #fff; }
    #mp-popup .mp-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    #mp-popup .mp-play-btn svg { width: 14px; height: 14px; fill: currentColor; }

    @media (max-width: 1024px) { #mp-popup.mp-open { right: 90px; } }
    @media (max-width: 768px) {
      #mp-side-btn { width: 56px; height: 56px; right: 16px; }
      #mp-side-btn svg { width: 26px; height: 26px; }
      #mp-popup { width: calc(100vw - 32px); }
      #mp-popup.mp-open { right: 16px; }
    }
    @media (max-width: 480px) {
      #mp-side-btn { width: 46px; height: 46px; right: 12px; }
      #mp-popup { width: calc(100vw - 24px); }
      #mp-popup.mp-open { right: 12px; }
      #mp-popup .mp-body { padding: 20px 18px 16px; }
    }
  `;
  document.head.appendChild(styles);

  // ════════════════════════════════════════════════════════════════════════
  // DOM ELEMENTS
  // ════════════════════════════════════════════════════════════════════════

  var sideBtn = document.createElement('button');
  sideBtn.id = 'mp-side-btn';
  sideBtn.type = 'button';
  sideBtn.title = 'Toggle Music Player';
  sideBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>';

  var popup = document.createElement('div');
  popup.id = 'mp-popup';
  var vol = Math.round(playerState.volume * 100);
  popup.innerHTML = `
    <div class="mp-bar"></div>
    <div class="mp-body">
      <button class="mp-x" id="mpX">✕</button>
      <div class="mp-header">
        <div class="mp-circle">
          <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>
        </div>
        <div>
          <p class="mp-title">Sweet Ambience</p>
          <p class="mp-sub">Romantic Atmosphere</p>
        </div>
      </div>
      <div class="mp-line"></div>
      <p class="mp-msg">Experience <strong>elegant romantic music</strong> while browsing. Adjust volume below or enjoy seamlessly.</p>
      <div class="mp-ctrl">
        <span class="mp-ctrl-ico">♪</span>
        <span class="mp-ctrl-lbl">Vol</span>
        <input type="range" id="mpSlider" min="0" max="100" value="${vol}" style="--vf:${vol}%">
        <span class="mp-pct" id="mpPct">${vol}%</span>
      </div>
      <div class="mp-btn-group">
        <button class="mp-btn mp-play-btn" id="mpPlayBtn">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> PLAY
        </button>
        <button class="mp-btn" id="mpMuteBtn">🔇 MUTE</button>
      </div>
    </div>
  `;

  document.body.appendChild(sideBtn);
  document.body.appendChild(popup);

  // ════════════════════════════════════════════════════════════════════════
  // UPDATE UI
  // ════════════════════════════════════════════════════════════════════════

  function updateUI() {
    playerState.isPlaying ? sideBtn.classList.add('playing') : sideBtn.classList.remove('playing');

    var playBtn = document.getElementById('mpPlayBtn');
    if (playBtn) {
      if (playPromise !== null) {
        playBtn.innerHTML = '⏳ LOADING...'; playBtn.disabled = true;
      } else if (playerState.isPlaying) {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> PAUSE'; playBtn.disabled = false;
      } else {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> PLAY'; playBtn.disabled = false;
      }
    }

    var muteBtn = document.getElementById('mpMuteBtn');
    if (muteBtn) {
      if (playerState.isMuted) {
        muteBtn.innerHTML = '🔊 UNMUTE'; muteBtn.style.background = 'rgba(128,0,0,0.15)'; muteBtn.style.borderColor = 'rgba(128,0,0,0.6)'; muteBtn.style.color = '#c0392b';
      } else {
        muteBtn.innerHTML = '🔇 MUTE'; muteBtn.style.background = 'transparent'; muteBtn.style.borderColor = 'rgba(128,0,0,0.4)'; muteBtn.style.color = '#aaa';
      }
    }

    var slider = document.getElementById('mpSlider');
    if (slider) {
      var pct = Math.round(playerState.volume * 100);
      slider.value = pct;
      slider.style.setProperty('--vf', pct + '%');
      document.getElementById('mpPct').textContent = pct + '%';
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════════════════════════════════════

  sideBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); popup.classList.toggle('mp-open'); onUserInteraction(); });
  document.getElementById('mpX').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); popup.classList.remove('mp-open'); });
  document.getElementById('mpPlayBtn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePlayPause(); });
  document.getElementById('mpMuteBtn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggleMute(); });
  document.getElementById('mpSlider').addEventListener('input', function (e) { e.stopPropagation(); setVolume(parseInt(this.value) / 100); });

  document.addEventListener('click', function (e) { if (!popup.contains(e.target) && e.target !== sideBtn) popup.classList.remove('mp-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') popup.classList.remove('mp-open'); });

  // ════════════════════════════════════════════════════════════════════════
  // POPUP AUTO-SHOW — SAB SCREEN SIZES (pehle wali > 1024px condition hata di)
  // ════════════════════════════════════════════════════════════════════════

  if (!playerState.popupShown) {
    setTimeout(function () {
      popup.classList.add('mp-open');
      playerState.popupShown = true;
      saveState(playerState);
      setTimeout(function () { popup.classList.remove('mp-open'); }, 6000);
    }, CONFIG.POPUP_DELAY);
  }

  // ════════════════════════════════════════════════════════════════════════
  // GLOBAL ACCESS
  // ════════════════════════════════════════════════════════════════════════

  window._bgAudio = audio;
  window._bgPlayer = { play: togglePlayPause, mute: toggleMute, setVolume: setVolume, getState: function () { return playerState; } };

  updateUI();

  initDB().then(function () {
    getSavedState().then(function (saved) {
      if (saved.isPlaying && saved.hasInteracted) setTimeout(attemptPlay, 300);
    });
  });

})();