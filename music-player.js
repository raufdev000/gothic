/**
 * music-player.js
 * Har page ke </body> se pehle lagao
 * <script src="music-player.js"></script>
 *
 * FIX: Nav links click intercept — pehle audio unlock,
 *      phir navigate. Is se wapis aane pe bhi music chalta hai.
 */

(function () {

  // ══ CONFIG ══
  var MUSIC_SRC   = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
  var DEFAULT_VOL = 0.22;
  var POPUP_DELAY = 3000;

  // ══ STORAGE ══
  function getSavedVol()   { try { var v = localStorage.getItem('mp_vol');   return v !== null ? parseFloat(v) : DEFAULT_VOL; } catch(e){ return DEFAULT_VOL; } }
  function getSavedMuted() { try { return localStorage.getItem('mp_muted') === '1'; } catch(e){ return false; } }
  function saveVol(v)      { try { localStorage.setItem('mp_vol',   v);           } catch(e){} }
  function saveMuted(m)    { try { localStorage.setItem('mp_muted', m ? '1':'0'); } catch(e){} }
  function popupDone()     { try { return sessionStorage.getItem('mp_popup') === '1'; } catch(e){ return false; } }
  function markPopupDone() { try { sessionStorage.setItem('mp_popup', '1');           } catch(e){} }

  // ══ AUDIO ══
  var audio    = new Audio(MUSIC_SRC);
  audio.loop   = true;
  audio.volume = getSavedVol();
  audio.muted  = getSavedMuted();

  var unlocked = false; // kya browser ne audio allow kar diya?
  var playing  = false; // kya abhi play ho raha hai?

  // Silently unlock audio context — actually play nahi karta
  // Sirf browser ko batata hai ke user ne interact kiya
  function unlockAudio() {
    if (unlocked) return;
    // Zero-duration play/pause se unlock hota hai
    audio.play().then(function () {
      unlocked = true;
      playing  = true;
      // Muted state apply karo
      audio.muted = getSavedMuted();
    }).catch(function () {
      // still blocked — koi baat nahi
    });
  }

  function resumeAudio() {
    if (!playing) {
      audio.play().then(function () {
        playing  = true;
        unlocked = true;
        audio.muted = getSavedMuted();
      }).catch(function () {});
    }
  }

  // ══ NAV LINK INTERCEPT ══
  // Jab koi link click kare — pehle audio unlock karo
  // phir normal navigation hone do
  // Is se naye page load pe audio already unlocked hoga
  document.addEventListener('click', function (e) {
    // Audio unlock/play
    unlockAudio();

    // Agar anchor tag click hua
    var target = e.target.closest('a[href]');
    if (!target) return;

    var href = target.getAttribute('href');
    if (!href || href === '#' || href.startsWith('javascript')) return;
    // External links skip
    if (href.startsWith('http') || href.startsWith('//')) return;

    // Internal page navigation
    e.preventDefault();

    // Pehle audio play karo — 80ms baad navigate karo
    // Is tiny delay mein browser audio unlock ho jata hai
    audio.play().then(function () {
      unlocked = true;
      playing  = true;
      audio.muted = getSavedMuted();
    }).catch(function () {}).finally(function () {
      window.location.href = href;
    });

    // Safety: agar finally kaam na kare toh bhi navigate karo
    setTimeout(function () {
      window.location.href = href;
    }, 150);

  }, true); // capture phase — sabse pehle milega

  // ══ PAGE LOAD PE PLAY ══
  window.addEventListener('load', function () {
    unlockAudio();
  });

  // ══ VISIBILITY CHANGE ══
  // Tab switch ke baad wapis aaye toh resume karo
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && unlocked && !playing) {
      resumeAudio();
    }
  });

  window._bgAudio = audio;

  // ══ CSS ══
  var css = document.createElement('style');
  css.textContent =
    '#mp-popup{position:fixed;bottom:24px;right:-460px;z-index:999999;width:min(370px,calc(100vw - 32px));background:linear-gradient(135deg,#0d0d0d,#1a0a0a);border:1px solid rgba(128,0,0,.45);border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.75);overflow:hidden;transition:right .65s cubic-bezier(.34,1.56,.64,1);font-family:"Montserrat",sans-serif;}' +
    '#mp-popup.mp-open{right:24px;}' +
    '#mp-popup .mp-bar{height:3px;background:linear-gradient(90deg,#800000,#c0392b,#800000);background-size:200%;animation:mpBar 3s linear infinite;}' +
    '@keyframes mpBar{0%{background-position:0%}100%{background-position:200%}}' +
    '#mp-popup .mp-body{padding:20px 20px 16px;position:relative;}' +
    '#mp-popup .mp-x{position:absolute;top:12px;right:12px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#aaa;font-size:12px;line-height:1;transition:background .3s,color .3s,border-color .3s;}' +
    '#mp-popup .mp-x:hover{background:#800000;color:#fff;border-color:#800000;}' +
    '#mp-popup .mp-row{display:flex;align-items:center;gap:13px;margin-bottom:14px;}' +
    '#mp-popup .mp-circle{width:50px;height:50px;border-radius:50%;flex-shrink:0;background:rgba(128,0,0,.12);border:1px solid rgba(128,0,0,.4);display:flex;align-items:center;justify-content:center;animation:mpPulse 2.5s ease-in-out infinite;}' +
    '@keyframes mpPulse{0%,100%{box-shadow:0 0 0 0 rgba(128,0,0,.35)}50%{box-shadow:0 0 0 10px rgba(128,0,0,0)}}' +
    '#mp-popup .mp-circle svg{width:23px;height:23px;fill:#c0392b;}' +
    '#mp-popup .mp-title{font-family:"Raleway",sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fff;margin:0 0 3px;}' +
    '#mp-popup .mp-sub{font-size:11px;color:#777;letter-spacing:1px;margin:0;}' +
    '#mp-popup .mp-line{height:1px;background:rgba(255,255,255,.07);margin:12px 0;}' +
    '#mp-popup .mp-msg{font-size:12.5px;color:#999;line-height:1.65;margin-bottom:16px;}' +
    '#mp-popup .mp-msg strong{color:#e0c090;font-weight:600;}' +
    '#mp-popup .mp-ctrl{display:flex;align-items:center;gap:9px;margin-bottom:12px;padding:11px 13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:3px;}' +
    '#mp-popup .mp-ctrl-ico{flex-shrink:0;color:#800000;font-size:15px;}' +
    '#mp-popup .mp-ctrl-lbl{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#555;white-space:nowrap;}' +
    '#mp-popup .mp-pct{font-size:11px;color:#777;min-width:28px;text-align:right;}' +
    '#mp-popup input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer;background:linear-gradient(90deg,#800000 0%,#800000 var(--vf,22%),rgba(255,255,255,.12) var(--vf,22%));}' +
    '#mp-popup input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid #800000;cursor:pointer;box-shadow:0 0 5px rgba(128,0,0,.5);transition:transform .2s;}' +
    '#mp-popup input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.2);}' +
    '#mp-popup .mp-mute{width:100%;padding:10px;background:transparent;border:1px solid rgba(128,0,0,.4);color:#aaa;font-family:"Montserrat",sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-radius:2px;cursor:pointer;transition:background .3s,color .3s,border-color .3s;display:flex;align-items:center;justify-content:center;gap:7px;}' +
    '#mp-popup .mp-mute:hover{background:#800000;border-color:#800000;color:#fff;}' +
    '#mp-popup .mp-mute.is-muted{background:rgba(128,0,0,.12);color:#c0392b;border-color:rgba(128,0,0,.45);}' +
    '@media(max-width:480px){#mp-popup{bottom:12px;right:-120vw;}#mp-popup.mp-open{right:16px;}}';
  document.head.appendChild(css);

  // ══ POPUP HTML ══
  var vol   = getSavedVol();
  var pct   = Math.round(vol * 100);
  var muted = getSavedMuted();

  var popup = document.createElement('div');
  popup.id  = 'mp-popup';
  popup.innerHTML =
    '<div class="mp-bar"></div>' +
    '<div class="mp-body">' +
      '<button class="mp-x" id="mpX">&#x2715;</button>' +
      '<div class="mp-row">' +
        '<div class="mp-circle">' +
          '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>' +
        '</div>' +
        '<div>' +
          '<p class="mp-title">Enhance Your Experience</p>' +
          '<p class="mp-sub">Ambient Atmosphere Active</p>' +
        '</div>' +
      '</div>' +
      '<div class="mp-line"></div>' +
      '<p class="mp-msg"><strong>Plug in your headphones</strong> for the finest Gothic &amp; Classic atmosphere. Adjust volume to your preference below.</p>' +
      '<div class="mp-ctrl">' +
        '<span class="mp-ctrl-ico">&#9835;</span>' +
        '<span class="mp-ctrl-lbl">Vol</span>' +
        '<input type="range" id="mpSlider" min="0" max="100" value="' + pct + '" style="--vf:' + pct + '%">' +
        '<span class="mp-pct" id="mpPct">' + pct + '%</span>' +
      '</div>' +
      '<button class="mp-mute' + (muted ? ' is-muted' : '') + '" id="mpMute">' +
        (muted ? icoMute() + ' Music Muted &mdash; Click to Unmute' : icoSound() + ' Music Playing &mdash; Click to Mute') +
      '</button>' +
    '</div>';

  document.body.appendChild(popup);

  // ══ SHOW POPUP ══
  if (!popupDone()) {
    setTimeout(function () {
      popup.classList.add('mp-open');
      markPopupDone();
    }, POPUP_DELAY);
  }

  // ══ POPUP EVENTS ══
  document.getElementById('mpX').addEventListener('click', function () {
    popup.classList.remove('mp-open');
  });

  document.getElementById('mpSlider').addEventListener('input', function () {
    var p = parseInt(this.value);
    var v = p / 100;
    audio.volume = v;
    audio.muted  = (p === 0);
    saveVol(v);
    saveMuted(p === 0);
    document.getElementById('mpPct').textContent = p + '%';
    this.style.setProperty('--vf', p + '%');
    refreshBtn(p === 0);
  });

  document.getElementById('mpMute').addEventListener('click', function () {
    var m = !audio.muted;
    audio.muted = m;
    saveMuted(m);
    refreshBtn(m);
  });

  function refreshBtn(m) {
    var b = document.getElementById('mpMute');
    if (!b) return;
    if (m) {
      b.classList.add('is-muted');
      b.innerHTML = icoMute() + ' Music Muted &mdash; Click to Unmute';
    } else {
      b.classList.remove('is-muted');
      b.innerHTML = icoSound() + ' Music Playing &mdash; Click to Mute';
    }
  }

  function icoSound() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77S18.01 4.14 14 3.23z"/></svg>';
  }
  function icoMute() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
  }

})();