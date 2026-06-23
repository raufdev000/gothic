(function () {

  /* ── CONFIG ── */
  var SRC         = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  var POPUP_DELAY = 4000;
  var SAVE_KEY    = '_mp';

  /* ── RESTORE SAVED STATE ── */
  var vol       = 0.18;
  var isMuted   = false;
  var savedTime = 0;
  var popShown  = false;

  try {
    var s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (s.vol     != null) vol       = s.vol;
    if (s.muted   != null) isMuted   = s.muted;
    if (s.time    != null) savedTime = s.time;
    if (s.popShown)        popShown  = true;
  } catch(e){}

  /* ── AUDIO SETUP ── */
  var audio     = new Audio(SRC);
  audio.loop    = true;
  audio.volume  = vol;
  audio.muted   = isMuted;
  audio.preload = 'auto';

  /* ── STATE ── */
  var going        = false;   // successfully playing at least once
  var gestureReady = false;   // gesture listener attached

  /* ── SAVE every 1.5s ── */
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        vol      : audio.volume,
        muted    : audio.muted,
        time     : audio.currentTime,
        popShown : popShown
      }));
    } catch(e){}
  }
  setInterval(save, 1500);
  window.addEventListener('pagehide', save);   // save on tab close / navigate
  window.addEventListener('beforeunload', save);

  /* ── RESUME POSITION ── */
  function resumeTime() {
    if (savedTime > 0) {
      // canplay ke bad set karo
      if (audio.readyState >= 3) {
        audio.currentTime = savedTime;
        savedTime = 0;
      } else {
        audio.addEventListener('canplay', function setT() {
          audio.removeEventListener('canplay', setT);
          audio.currentTime = savedTime;
          savedTime = 0;
        });
      }
    }
  }

  /* ── CORE PLAY ── */
  function tryPlay() {
    if (going) return;
    resumeTime();
    var p = audio.play();
    if (p && p.then) {
      p.then(function () {
        going = true;
        attachRestartListeners();
      }).catch(function () {
        // autoplay blocked → wait for first user gesture
        if (!gestureReady) attachGestureListeners();
      });
    } else {
      going = true;
      attachRestartListeners();
    }
  }

  /* ── GESTURE UNLOCK ── */
  var GESTURES = ['click','mousedown','keydown','touchstart',
                  'touchend','scroll','wheel','pointerdown'];

  function attachGestureListeners() {
    gestureReady = true;
    var tried = false;
    function onGesture() {
      if (tried) return;
      tried = true;
      GESTURES.forEach(function(ev) {
        document.removeEventListener(ev, onGesture, true);
      });
      resumeTime();
      audio.play().then(function() {
        going = true;
        attachRestartListeners();
      }).catch(function(){});
    }
    GESTURES.forEach(function(ev) {
      document.addEventListener(ev, onGesture, { capture: true, passive: true });
    });
  }

  /* ── KEEP ALIVE: restart if browser pauses ── */
  function attachRestartListeners() {
    // Tab becomes visible again
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && audio.paused && going) {
        audio.play().catch(function(){});
      }
    });

    // Browser ke pause event pr dobara play
    audio.addEventListener('pause', function() {
      if (going) {
        setTimeout(function() {
          if (audio.paused) audio.play().catch(function(){});
        }, 400);
      }
    });

    // Network issue se rukne pr retry
    audio.addEventListener('stalled', function() {
      setTimeout(function() {
        if (audio.paused) audio.play().catch(function(){});
      }, 1000);
    });

    audio.addEventListener('error', function() {
      setTimeout(function() {
        audio.load();
        if (savedTime > 0) audio.currentTime = savedTime;
        audio.play().catch(function(){});
      }, 2000);
    });

    // Window focus — tab pe wapis aao to resume
    window.addEventListener('focus', function() {
      if (audio.paused && going) audio.play().catch(function(){});
    });
  }

  /* ── START ── */
  // DOM ready hone par try karo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPlay);
  } else {
    tryPlay();
  }
  // Page fully load hone par bhi try (fallback)
  window.addEventListener('load', function() {
    if (!going) tryPlay();
  });

  /* ── VOLUME / MUTE ── */
  function setVol(v) {
    audio.volume = v;
    audio.muted  = (v === 0);
    renderUI();
    save();
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    renderUI();
    save();
  }

  /* ── STYLES ── */
  var css = document.createElement('style');
  css.textContent = `
    #mp-btn {
      position:fixed; right:24px; top:63%; transform:translateY(-50%);
      z-index:9998; width:58px; height:58px; border-radius:50%;
      background:linear-gradient(135deg,#C8922A,#f8ba46);
      border:2px solid rgba(255,255,255,.2); color:#fff; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 8px 32px rgba(200,146,42,.35);
      transition:transform .4s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;
      animation:mpGlow 1.6s ease-in-out infinite;
    }
    #mp-btn:hover{transform:translateY(-50%) scale(1.12);box-shadow:0 12px 48px rgba(200,146,42,.5);}
    #mp-btn:active{transform:translateY(-50%) scale(.94);}
    @keyframes mpGlow{0%,100%{box-shadow:0 8px 32px rgba(200,146,42,.35);}50%{box-shadow:0 8px 52px rgba(200,146,42,.75);}}
    #mp-btn svg{width:30px;height:30px;fill:#fff;pointer-events:none;}

    #mp-pop{
      position:fixed; right:-430px; top:50%; transform:translateY(-50%);
      z-index:9999; width:min(370px,calc(100vw - 36px));
      background:linear-gradient(145deg,#0e0e0e,#060606);
      border:1px solid rgba(255,255,255,.07); border-radius:10px;
      box-shadow:0 20px 80px rgba(0,0,0,.85);
      transition:right .55s cubic-bezier(.34,1.56,.64,1);
      font-family:'Montserrat',sans-serif; overflow:hidden;
    }
    #mp-pop.open{right:92px;}
    .mp-bar{height:3px;background:linear-gradient(90deg,#C8922A,#f8ba46,#C8922A);background-size:200%;animation:mpSlide 2.5s linear infinite;}
    @keyframes mpSlide{to{background-position:200%;}}
    .mp-body{padding:26px 22px 20px;position:relative;}
    .mp-close{
      position:absolute;top:14px;right:14px;width:30px;height:30px;
      border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;color:#888;font-size:13px;font-weight:700;
      transition:background .25s,color .25s;
    }
    .mp-close:hover{background:rgba(200,146,42,.2);color:#C8922A;border-color:#C8922A;}
    .mp-head{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
    .mp-icon{
      width:52px;height:52px;border-radius:50%;flex-shrink:0;
      border:2px solid rgba(200,146,42,.4);
      display:flex;align-items:center;justify-content:center;
      animation:mpPulse 2.8s ease-in-out infinite;
    }
    @keyframes mpPulse{50%{box-shadow:0 0 0 10px rgba(200,146,42,0);}}
    .mp-icon svg{width:24px;height:24px;fill:#f8ba46;}
    .mp-title{font-family:'Raleway',sans-serif;font-size:15px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin:0 0 3px;}
    .mp-sub{font-size:11px;color:#777;letter-spacing:1px;margin:0;}
    .mp-divider{height:1px;background:rgba(255,255,255,.07);margin:14px 0;}
    .mp-msg{font-size:12px;color:#888;line-height:1.7;margin-bottom:16px;}
    .mp-msg strong{color:#d4a850;}
    .mp-vol{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:6px;margin-bottom:12px;}
    .mp-vol-ico{color:#f8ba46;font-size:15px;flex-shrink:0;}
    .mp-vol-lbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#555;min-width:24px;}
    #mp-slider{
      flex:1;-webkit-appearance:none;appearance:none;
      height:3px;border-radius:2px;outline:none;cursor:pointer;
      background:linear-gradient(90deg,#C8922A var(--vf,18%),rgba(255,255,255,.1) var(--vf,18%));
    }
    #mp-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid #C8922A;cursor:pointer;transition:transform .2s;}
    #mp-slider::-webkit-slider-thumb:hover{transform:scale(1.3);}
    #mp-slider::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid #C8922A;cursor:pointer;}
    .mp-pct{font-size:11px;color:#666;min-width:34px;text-align:right;font-weight:600;}
    .mp-btns{display:flex;gap:8px;}
    .mp-action{
      flex:1;padding:10px 8px;background:transparent;
      border:1px solid rgba(255,255,255,.12);color:#999;
      font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;
      letter-spacing:1.5px;text-transform:uppercase;border-radius:4px;
      cursor:pointer;transition:all .25s;
      display:flex;align-items:center;justify-content:center;gap:5px;
    }
    .mp-action:hover{background:#C8922A;border-color:#C8922A;color:#fff;}
    @media(max-width:768px){
      #mp-btn{right:14px;width:52px;height:52px;}
      #mp-pop.open{right:14px;}
      #mp-pop{width:calc(100vw - 28px);}
    }
    @media(max-width:480px){
      #mp-btn{right:10px;width:46px;height:46px;}
      #mp-pop{width:calc(100vw - 20px);}
      #mp-pop.open{right:10px;}
      .mp-body{padding:20px 16px 16px;}
    }
  `;
  document.head.appendChild(css);

  /* ── DOM ── */
  var btn = document.createElement('button');
  btn.id    = 'mp-btn';
  btn.title = 'Music Player';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg>';

  var pop = document.createElement('div');
  pop.id  = 'mp-pop';
  var iv  = Math.round(vol * 100);
  pop.innerHTML =
    '<div class="mp-bar"></div>' +
    '<div class="mp-body">' +
      '<div class="mp-close" id="mp-close">\u2715</div>' +
      '<div class="mp-head">' +
        '<div class="mp-icon"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5.07A7 7 0 0 1 12 5a7 7 0 0 1 6.93 7H17a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9z"/></svg></div>' +
        '<div><p class="mp-title">Sweet Ambience</p><p class="mp-sub">Romantic Atmosphere</p></div>' +
      '</div>' +
      '<div class="mp-divider"></div>' +
      '<p class="mp-msg">Experience <strong>elegant romantic music</strong> while browsing. Adjust volume or toggle below.</p>' +
      '<div class="mp-vol">' +
        '<span class="mp-vol-ico">\u266b</span>' +
        '<span class="mp-vol-lbl">Vol</span>' +
        '<input type="range" id="mp-slider" min="0" max="100" value="' + iv + '" style="--vf:' + iv + '%">' +
        '<span class="mp-pct" id="mp-pct">' + iv + '%</span>' +
      '</div>' +
      '<div class="mp-btns"><button class="mp-action" id="mp-mute">\ud83d\udd07 MUTE</button></div>' +
    '</div>';

  document.body.appendChild(btn);
  document.body.appendChild(pop);

  /* ── RENDER UI ── */
  function renderUI() {
    var mb = document.getElementById('mp-mute');
    if (mb) {
      if (audio.muted) {
        mb.innerHTML = '\ud83d\udd0a UNMUTE';
        mb.style.cssText = 'background:rgba(200,146,42,.15);border-color:rgba(200,146,42,.5);color:#C8922A;';
      } else {
        mb.innerHTML = '\ud83d\udd07 MUTE';
        mb.style.cssText = '';
      }
    }
    var sl = document.getElementById('mp-slider');
    var pc = document.getElementById('mp-pct');
    if (sl && pc) {
      var p = Math.round(audio.volume * 100);
      sl.value = p;
      sl.style.setProperty('--vf', p + '%');
      pc.textContent = p + '%';
    }
  }

  /* ── EVENTS ── */
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    pop.classList.toggle('open');
    // Button click = first gesture → play if not started
    if (!going) tryPlay();
  });

  document.getElementById('mp-close').addEventListener('click', function(e) {
    e.stopPropagation();
    pop.classList.remove('open');
  });

  document.getElementById('mp-mute').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMute();
  });

  document.getElementById('mp-slider').addEventListener('input', function(e) {
    e.stopPropagation();
    setVol(parseInt(this.value) / 100);
  });

  document.addEventListener('click', function(e) {
    if (!pop.contains(e.target) && e.target !== btn) pop.classList.remove('open');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') pop.classList.remove('open');
  });

  /* ── POPUP FIRST VISIT ── */
  if (!popShown) {
    setTimeout(function() {
      pop.classList.add('open');
      popShown = true;
      save();
      setTimeout(function() { pop.classList.remove('open'); }, 6000);
    }, POPUP_DELAY);
  }

  renderUI();

})();