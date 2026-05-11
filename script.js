// ── Navbar sticky
const navbar = document.getElementById('mainNavbar');

// Page load pe bhi check karo
function checkScroll() {
  if (window.scrollY > 10) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', checkScroll);
checkScroll(); // load pe turant check karo

// ── Search toggle
const searchBtn   = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const searchClose = document.getElementById('searchClose');
const searchInput = document.getElementById('searchInput');

searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  searchModal.classList.toggle('open');
  if (searchModal.classList.contains('open')) {
    setTimeout(() => searchInput.focus(), 200);
  }
});

searchClose.addEventListener('click', () => {
  searchModal.classList.remove('open');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') searchModal.classList.remove('open');
});

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    console.log('Search:', query);
    searchModal.classList.remove('open');
  }
});

  // Carousel text animation fix
  const heroCarousel = document.getElementById('heroCarousel');

  heroCarousel.addEventListener('slid.bs.carousel', function (e) {

    const activeSlide = e.relatedTarget;

    const elements = activeSlide.querySelectorAll(
      '.slide-tag, .slide-heading, .slide-sub, .slide-btn'
    );

    elements.forEach(el => {

      el.style.animation = 'none';

      el.offsetHeight;

      el.style.animation = '';

    });

  });
const track = document.getElementById('productsTrack');
const prevBtn = document.getElementById('productsPrev');
const nextBtn = document.getElementById('productsNext');

let currentIndex = 0;

function getVisibleCount() {
  const w = window.innerWidth;
  if (w >= 1200) return 4;
  if (w >= 992) return 3;
  if (w >= 576) return 2;
  return 1;
}

function getCardWidth() {
  const card = track.querySelector('.prod-card');
  const style = window.getComputedStyle(track);
  const gap = parseFloat(style.gap) || 20;
  return card.offsetWidth + gap;
}

function totalCards() {
  return track.querySelectorAll('.prod-card').length;
}

function updateCarousel(animate = true) {
  if (!animate) track.style.transition = 'none';
  else track.style.transition = 'transform 0.45s ease';
  track.style.transform = `translateX(-${currentIndex * getCardWidth()}px)`;
}

nextBtn.addEventListener('click', () => {
  const max = totalCards() - getVisibleCount();
  if (currentIndex >= max) {
    currentIndex = 0; // end pe wapas pehle pe
  } else {
    currentIndex++;
  }
  updateCarousel();
});

prevBtn.addEventListener('click', () => {
  if (currentIndex <= 0) {
    currentIndex = totalCards() - getVisibleCount(); // start pe wapas end pe
  } else {
    currentIndex--;
  }
  updateCarousel();
});

window.addEventListener('resize', () => {
  currentIndex = 0;
  updateCarousel(false);
  setTimeout(() => { track.style.transition = 'transform 0.45s ease'; }, 50);
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});