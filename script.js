/* ============================================
   STATE
============================================ */
var currentPage     = 0;
var totalPages      = 6;
var isTransitioning = false;

// Halaman yang HANYA bisa pindah via tombol continue.
// Swipe, keyboard, dan nav-dot DIBLOKIR dari halaman ini.
// Page 2 juga masuk sini supaya geser card tidak pindah halaman.
var BUTTON_ONLY = { 1:true, 2:true, 4:true };

/* ============================================
   PAGE NAVIGATION
============================================ */
function goToPage(n, force) {
    if (isTransitioning || n === currentPage) return;
    if (n < 0 || n >= totalPages) return;
    // Kalau di halaman button-only dan tidak dipaksa → tolak
    if (!force && BUTTON_ONLY[currentPage]) return;

    isTransitioning = true;

    var from = document.getElementById('page-' + currentPage);
    var to   = document.getElementById('page-' + n);

    from.classList.remove('active');
    from.classList.add('exit-up');

    setTimeout(function() {
        from.classList.remove('exit-up');
        currentPage = n;
        to.classList.add('active');
        updateNavDots();
        onPageEnter(n);
        setTimeout(function() { isTransitioning = false; }, 900);
    }, 380);
}

function updateNavDots() {
    document.querySelectorAll('.nav-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === currentPage);
    });
}

/* nav dot — ikut aturan BUTTON_ONLY */
document.querySelectorAll('.nav-dot').forEach(function(dot) {
    dot.addEventListener('click', function() {
        goToPage(parseInt(dot.dataset.page), false);
    });
});

/* keyboard */
document.addEventListener('keydown', function(e) {
    if (BUTTON_ONLY[currentPage]) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (currentPage < totalPages - 1) goToPage(currentPage + 1, false);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (currentPage > 0) goToPage(currentPage - 1, false);
    }
});

/* touch/swipe:
   - Selalu blokir kalau di BUTTON_ONLY page
   - Kalau touch dimulai di dalam .letter-scroll → biarkan scroll konten, jangan pindah halaman */
var tsY = 0, tsX = 0, tsInLetterScroll = false;

document.addEventListener('touchstart', function(e) {
    tsY = e.touches[0].clientY;
    tsX = e.touches[0].clientX;
    tsInLetterScroll = false;

    var el = e.target;
    while (el) {
        if (el.id === 'letterScroll') { tsInLetterScroll = true; break; }
        el = el.parentElement;
    }
}, { passive: true });

document.addEventListener('touchend', function(e) {
    // Selalu blokir di BUTTON_ONLY pages
    if (BUTTON_ONLY[currentPage]) return;
    // Kalau sedang scroll surat → jangan pindah halaman
    if (tsInLetterScroll) return;

    var dy = tsY - e.changedTouches[0].clientY;
    var dx = tsX - e.changedTouches[0].clientX;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 55) {
        if (dy > 0 && currentPage < totalPages - 1) goToPage(currentPage + 1, false);
        if (dy < 0 && currentPage > 0)              goToPage(currentPage - 1, false);
    }
}, { passive: true });

/* ============================================
   PAGE ENTER HOOKS
============================================ */
function onPageEnter(n) {
    if (n === 1) {
        startIntroTypewriter();
        document.getElementById('pageNav').classList.add('visible');
    }
    if (n === 3) setTimeout(function() { showPopup('popup2'); }, 2200);
    if (n === 4) showLetterContinueBtn();
    if (n === 5) {
        spawnHearts(24);
        startContinuousHearts();
    }
}

/* ============================================
   ENVELOPE
============================================ */
var env = document.getElementById('envelope');
env.addEventListener('click', function() {
    if (env.classList.contains('open')) return;
    env.classList.add('open');
    setTimeout(function() {
        goToPage(1, true);
        setTimeout(function() { showPopup('popup1'); }, 1500);
    }, 1100);
});

/* ============================================
   PAGE 1 — TYPEWRITER INTRO
============================================ */
var twEl  = document.getElementById('typewriter');
var curEl = document.getElementById('cursor');
var nextL = document.getElementById('nextFromLetter');
var introTyped = false;

var introMsg = [
    "Before you continue,",
    "",
    "there's something I'd like you to know.",
    "",
    "This website isn't perfect.",
    "",
    "Neither are the words inside it.",
    "",
    "But every part of it was made while thinking about you.",
    "",
    "So take your time.",
    "",
    "\u2661" // ♡
].join('\n');

var tiIdx = 0, tiTimer = null;

function startIntroTypewriter() {
    if (introTyped) return;
    tiIdx = 0;
    twEl.textContent = '';

    tiTimer = setInterval(function() {
        if (tiIdx < introMsg.length) {
            twEl.textContent += introMsg[tiIdx++];
        } else {
            clearInterval(tiTimer);
            introTyped = true;
            setTimeout(function() {
                if (curEl) curEl.style.display = 'none';
                if (nextL) {
                    nextL.style.transition   = 'opacity .8s ease';
                    nextL.style.opacity      = '1';
                    nextL.style.pointerEvents = 'auto';
                }
            }, 600);
        }
    }, 46);
}

if (nextL) nextL.addEventListener('click', function() { goToPage(3, true); });


/* ============================================
   PAGE 3 — SONG
============================================ */
var nextFromSong = document.getElementById('nextFromSong');
if (nextFromSong) nextFromSong.addEventListener('click', function() { goToPage(4, false); });

/* ============================================
   PAGE 4 — LETTER
   Surat langsung tampil penuh, tombol continue
   muncul segera saat halaman masuk.
============================================ */
function showLetterContinueBtn() {
    var btn = document.getElementById('nextFromMainLetter');
    if (!btn) return;
    btn.style.transition    = 'opacity .8s ease';
    btn.style.opacity       = '1';
    btn.style.pointerEvents = 'auto';
}

var nextFromMainLetter = document.getElementById('nextFromMainLetter');
if (nextFromMainLetter) {
    nextFromMainLetter.addEventListener('click', function() { goToPage(5, true); });
}

/* ============================================
   POPUP
============================================ */
function showPopup(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('show');
}
function closePopupEl(el) { el.classList.remove('show'); }

document.querySelectorAll('.close-popup').forEach(function(btn) {
    btn.addEventListener('click', function() { closePopupEl(btn.closest('.overlay')); });
});
document.querySelectorAll('.overlay').forEach(function(ov) {
    ov.addEventListener('click', function(e) { if (e.target === ov) closePopupEl(ov); });
});

/* ============================================
   FINAL BUTTON & HEART
============================================ */
var finalBtn     = document.getElementById('finalBtn');
var showHeartBtn = document.getElementById('showHeartBtn');
var heartReveal  = document.getElementById('heartReveal');
var bigHeart     = document.getElementById('bigHeart');
var heartSign    = document.querySelector('.heart-sign');

if (finalBtn) finalBtn.addEventListener('click', function() { showPopup('popup3'); });

if (showHeartBtn) {
    showHeartBtn.addEventListener('click', function() {
        closePopupEl(document.getElementById('popup3'));
        finalBtn.style.display = 'none';
        heartReveal.style.display = 'flex';

        requestAnimationFrame(function() { bigHeart.classList.add('animate'); });

        setTimeout(function() {
            bigHeart.classList.remove('animate');
            bigHeart.classList.add('pulse');
            bigHeart.style.opacity   = '1';
            bigHeart.style.transform = 'scale(1)';
            spawnHearts(55);
        }, 2000);

        setTimeout(function() {
            if (heartSign) heartSign.classList.add('fade-in');
        }, 900);
    });
}

/* ============================================
   ♡ BERJATUHAN — DOM-based, karakter ♡
   Tidak pakai canvas, tidak pakai CSS var()
   Setiap ♡ punya animasi inline yang self-contained
============================================ */
var heartRain = document.getElementById('heartRain');

var H_COLORS = [
    '#ff6b8e','#ff9ab5','#f2c4ce',
    '#d4889e','#ff4f7b','#ffb3c6',
    '#e8829c','#ffd6e0','#ff82a9',
];

function dropHeart(delayMs) {
    var el    = document.createElement('span');
    el.className   = 'h-drop';
    el.textContent = '\u2661'; // ♡

    var x    = 5 + Math.random() * 90;          // % dari kiri
    var size = 13 + Math.random() * 20;          // px
    var dur  = 3.2 + Math.random() * 3.2;        // detik
    var tx   = (Math.random() - 0.5) * 140;      // drift horizontal akhir (px)
    var col  = H_COLORS[Math.floor(Math.random() * H_COLORS.length)];

    el.style.left     = x + '%';
    el.style.top      = '-44px';
    el.style.fontSize = size + 'px';
    el.style.color    = col;

    // Pakai animasi custom per-elemen via WAAPI (Web Animations API)
    // — tidak perlu CSS custom property var() sehingga lintas browser
    heartRain.appendChild(el);

    var anim = el.animate([
        { transform: 'translate(0, 0) rotate(-8deg) scale(.55)',      opacity: 0 },
        { transform: 'translate(0, 0) rotate(-8deg) scale(.55)',      opacity: 0,   offset: 0.0 },
        { transform: 'translate(0, 10px) rotate(0deg) scale(.9)',     opacity: 1,   offset: 0.08 },
        { transform: 'translate(' + (tx*0.5) + 'px, 55vh) rotate(12deg) scale(1)', opacity: 0.8, offset: 0.55 },
        { transform: 'translate(' + tx + 'px, 112vh) rotate(22deg) scale(1.05)', opacity: 0 }
    ], {
        duration: dur * 1000,
        delay:    delayMs,
        easing:   'ease-in',
        fill:     'forwards'
    });

    // Bersihkan elemen setelah animasi
    anim.onfinish = function() {
        if (el.parentNode) el.parentNode.removeChild(el);
    };
}

function spawnHearts(count) {
    for (var i = 0; i < count; i++) {
        dropHeart(i * 85);
    }
}

var contTimer   = null;
var contRunning = false;

function startContinuousHearts() {
    if (contRunning) return;
    contRunning = true;
    contTimer = setInterval(function() {
        if (currentPage === 5) {
            dropHeart(0);
        } else {
            clearInterval(contTimer);
            contRunning = false;
        }
    }, 480);
}

/* ============================================
   FALLING PETALS — canvas background
============================================ */
var canvas = document.getElementById('petalCanvas');
var ctx    = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

var PC = [
    'rgba(244,196,206,.42)', 'rgba(212,136,158,.32)',
    'rgba(155,58,92,.20)',   'rgba(255,200,215,.30)',
    'rgba(240,175,192,.38)',
];

function Petal(s) { this.reset(s); }
Petal.prototype.reset = function(s) {
    this.x  = Math.random() * canvas.width;
    this.y  = s ? -Math.random() * canvas.height : -8;
    this.sz = 4 + Math.random() * 8;
    this.sp = 0.28 + Math.random() * 0.55;
    this.dr = (Math.random() - 0.5) * 0.32;
    this.ro = Math.random() * Math.PI * 2;
    this.rs = (Math.random() - 0.5) * 0.028;
    this.cl = PC[Math.floor(Math.random() * PC.length)];
    this.wb = Math.random() * Math.PI * 2;
    this.ws = 0.008 + Math.random() * 0.009;
};
Petal.prototype.update = function() {
    this.wb += this.ws;
    this.x  += this.dr + Math.sin(this.wb) * 0.32;
    this.y  += this.sp;
    this.ro += this.rs;
    if (this.y > canvas.height + 8) this.reset(false);
};
Petal.prototype.draw = function() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ro);
    ctx.fillStyle = this.cl;
    ctx.beginPath();
    ctx.ellipse(0, -this.sz * .5, this.sz * .4, this.sz, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

var petals = [];
for (var pi = 0; pi < 18; pi++) petals.push(new Petal(true));

function animCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(function(p) { p.update(); p.draw(); });
    requestAnimationFrame(animCanvas);
}
animCanvas();

/* ============================================
   MINI FLOATING MESSAGES
============================================ */
var msgs = [
    "thinking of you...", "still here? \u2661",
    "don't leave yet.",   "keep going...",
    "you're doing great.","almost there \u2661",
    "stay a little longer.",
];
var miniEl    = document.getElementById('miniMsg');
var miniShown = false;

function showMiniMsg() {
    if (currentPage === 0 || miniShown) return;
    miniShown = true;
    miniEl.textContent  = msgs[Math.floor(Math.random() * msgs.length)];
    miniEl.style.opacity = '1';
    setTimeout(function() {
        miniEl.style.opacity = '0';
        setTimeout(function() { miniShown = false; }, 600);
    }, 3500);
}
setInterval(showMiniMsg, 13000);

document.addEventListener("click",(e)=>{

    const sparkle =
    document.createElement("div");

    sparkle.classList.add("heart");

    sparkle.innerHTML = "♡";

    sparkle.style.left =
    e.clientX + "px";

    sparkle.style.top =
    e.clientY + "px";

    sparkle.style.fontSize = "18px";

    document.body.appendChild(sparkle);

    setTimeout(()=>{

        sparkle.remove();

    },3000);

});
