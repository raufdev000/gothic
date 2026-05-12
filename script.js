// ── Navbar sticky (har page pe hai)
var navbar = document.getElementById('mainNavbar');
if (navbar) {
  function checkScroll() {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', checkScroll);
  checkScroll();
}

// ── Search toggle (har page pe hai)
var searchBtn   = document.getElementById('searchBtn');
var searchModal = document.getElementById('searchModal');
var searchClose = document.getElementById('searchClose');
var searchInput = document.getElementById('searchInput');
var searchForm  = document.getElementById('searchForm');

if (searchBtn && searchModal && searchClose && searchInput) {

  searchBtn.addEventListener('click', function (e) {
    e.preventDefault();
    searchModal.classList.toggle('open');
    if (searchModal.classList.contains('open')) {
      setTimeout(function () { searchInput.focus(); }, 200);
    }
  });

  searchClose.addEventListener('click', function () {
    searchModal.classList.remove('open');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') searchModal.classList.remove('open');
  });

  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = searchInput.value.trim();
      if (query) {
        searchModal.classList.remove('open');
      }
    });
  }
}

// ── Hero carousel text animation (sirf home page pe)
var heroCarousel = document.getElementById('heroCarousel');
if (heroCarousel) {
  heroCarousel.addEventListener('slid.bs.carousel', function (e) {
    var activeSlide = e.relatedTarget;
    var elements = activeSlide.querySelectorAll('.slide-tag, .slide-heading, .slide-sub, .slide-btn');
    elements.forEach(function (el) {
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
    });
  });
}

// ── Products carousel (sirf home page pe)
var track   = document.getElementById('productsTrack');
var prevBtn = document.getElementById('productsPrev');
var nextBtn = document.getElementById('productsNext');

if (track && prevBtn && nextBtn) {

  var currentIndex = 0;

  function getVisibleCount() {
    var w = window.innerWidth;
    if (w >= 1200) return 4;
    if (w >= 992)  return 3;
    if (w >= 576)  return 2;
    return 1;
  }

  function getCardWidth() {
    var card = track.querySelector('.prod-card');
    if (!card) return 0;
    var gap = parseFloat(window.getComputedStyle(track).gap) || 20;
    return card.offsetWidth + gap;
  }

  function totalCards() {
    return track.querySelectorAll('.prod-card').length;
  }

  function updateCarousel(animate) {
    if (animate === false) track.style.transition = 'none';
    else track.style.transition = 'transform 0.45s ease';
    track.style.transform = 'translateX(-' + (currentIndex * getCardWidth()) + 'px)';
  }

  nextBtn.addEventListener('click', function () {
    var max = totalCards() - getVisibleCount();
    currentIndex = (currentIndex >= max) ? 0 : currentIndex + 1;
    updateCarousel();
  });

  prevBtn.addEventListener('click', function () {
    var max = totalCards() - getVisibleCount();
    currentIndex = (currentIndex <= 0) ? max : currentIndex - 1;
    updateCarousel();
  });

  window.addEventListener('resize', function () {
    currentIndex = 0;
    updateCarousel(false);
    setTimeout(function () { track.style.transition = 'transform 0.45s ease'; }, 50);
  });
}

// ── Tab switching (sirf home page pe)
var tabBtns = document.querySelectorAll('.tab-btn');
if (tabBtns.length > 0) {
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
}