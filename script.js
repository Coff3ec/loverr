/* ============================================
   STATE
============================================ */
var currentPage     = 0;
var totalPages      = 6;
var isTransitioning = false;

// Halaman yang HANYA bisa pindah via tombol continue.
// Swipe, keyboard, dan nav-dot DIBLOKIR dari halaman ini.
// Page 2 juga masuk sini supaya geser card tidak pindah halaman.
var BUTTON_ONLY = { 1:true, 3:true, 4:true };

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
    if (n === 2) setTimeout(function() { showPopup('popup2'); }, 2200);
    if (n === 3) initGame();
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
    "there's something i want you to know.",
    "I spent a lot of time making this.",
    "Maybe it's not perfect.",
    "Maybe some parts are a little cheesy.",
    "But every page, every word, and every little detail was made while thinking about you.",
    "So... take your time, kaa.",
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
   PAGE 2 — MINI GAME
   "Catch the Hearts" — move cursor/finger to
   catch falling ♡. Miss 3 → game over.
============================================ */
var gameState = {
    running:   false,
    score:     0,
    missed:    0,
    lives:     3,
    started:   false,
    raf:       null,
    hearts:    [],
    lastSpawn: 0,
    spawnRate: 1100,   // ms between spawns
    speed:     1.5,    // initial fall speed (px/frame at 60fps)
    gameOver:  false,
    played:    false
};

var gameCanvas  = document.getElementById('gameCanvas');
var gCtx        = gameCanvas ? gameCanvas.getContext('2d') : null;
var gameField   = document.getElementById('gameField');
var catcherEl   = document.getElementById('catcher');
var gScoreEl    = document.getElementById('gScore');
var gMissedEl   = document.getElementById('gMissed');
var gameOverlay = document.getElementById('gameOverlay');
var overlayTitle= document.getElementById('overlayTitle');
var overlaySub  = document.getElementById('overlaySub');
var startBtn    = document.getElementById('startGameBtn');
var nextFromGame= document.getElementById('nextFromGame');
var playAgainBtn= document.getElementById('playAgainBtn');
var continueFromGameBtn = document.getElementById('continueFromGameBtn');

var catcherX = 0;   // centre of catcher in field coords
var fieldRect = null;

var HEART_COLORS = [
    '#ff6b8e','#ff9ab5','#f2c4ce',
    '#ffb3c6','#e8829c','#ff82a9'
];

// Result popup (reuse)
var popupGameResult = document.getElementById('popupGameResult');

function initGame() {
    // size canvas to field
    if (!gameCanvas || !gameField) return;
    resizeGameCanvas();

    // set catcher to centre
    catcherX = gameCanvas.width / 2;
    updateCatcherPos();

    // reset if first time or replay
    resetGameState();

    // show overlay
    if (gameOverlay) gameOverlay.classList.remove('hidden');
    if (overlayTitle) overlayTitle.textContent = 'ready?';
    if (overlaySub) overlaySub.innerHTML = 'catch as many hearts as you can.<br>don\'t let too many fall.';
}

function resizeGameCanvas() {
    if (!gameCanvas || !gameField) return;
    fieldRect = gameField.getBoundingClientRect();
    gameCanvas.width  = gameField.offsetWidth;
    gameCanvas.height = gameField.offsetHeight;
}

function resetGameState() {
    if (gameState.raf) cancelAnimationFrame(gameState.raf);
    gameState.running   = false;
    gameState.score     = 0;
    gameState.missed    = 0;
    gameState.lives     = 3;
    gameState.hearts    = [];
    gameState.lastSpawn = 0;
    gameState.spawnRate = 1100;
    gameState.speed     = 1.5;
    gameState.gameOver  = false;

    if (gCtx && gameCanvas) gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    updateScoreUI();
    resetLivesUI();

    if (nextFromGame) {
        nextFromGame.style.opacity       = '0';
        nextFromGame.style.pointerEvents = 'none';
    }
}

function updateScoreUI() {
    if (gScoreEl)  gScoreEl.textContent  = gameState.score;
    if (gMissedEl) gMissedEl.textContent = gameState.missed;
}

function resetLivesUI() {
    document.querySelectorAll('.life-heart').forEach(function(h) {
        h.classList.remove('lost');
    });
}

function updateLivesUI() {
    var hearts = document.querySelectorAll('.life-heart');
    hearts.forEach(function(h, i) {
        if (i >= gameState.lives) {
            h.classList.add('lost');
        } else {
            h.classList.remove('lost');
        }
    });
}

function startGame() {
    if (!gameCanvas) return;
    resizeGameCanvas();
    gameState.running   = true;
    gameState.lastSpawn = performance.now();
    gameState.raf       = requestAnimationFrame(gameLoop);
}

/* Mouse tracking */
if (gameField) {
    gameField.addEventListener('mousemove', function(e) {
        if (!gameState.running) return;
        fieldRect = gameField.getBoundingClientRect();
        catcherX = e.clientX - fieldRect.left;
        catcherX = Math.max(28, Math.min(gameCanvas.width - 28, catcherX));
        updateCatcherPos();
    });

    /* Touch tracking */
    gameField.addEventListener('touchmove', function(e) {
        if (!gameState.running) return;
        e.preventDefault();
        fieldRect = gameField.getBoundingClientRect();
        var touch = e.touches[0];
        catcherX = touch.clientX - fieldRect.left;
        catcherX = Math.max(28, Math.min(gameCanvas.width - 28, catcherX));
        updateCatcherPos();
    }, { passive: false });
}

function updateCatcherPos() {
    if (!catcherEl || !gameCanvas) return;
    // catcherEl is 56px wide; position left edge so center = catcherX
    var leftPct = (catcherX / gameCanvas.width) * 100;
    catcherEl.style.left       = leftPct + '%';
    catcherEl.style.transform  = 'translateX(-50%)';
}

/* Spawn a heart */
function spawnGameHeart(now) {
    if (!gameCanvas) return;
    var x     = 30 + Math.random() * (gameCanvas.width - 40);
    var size  = 14 + Math.random() * 10;
    var speed = gameState.speed * (0.8 + Math.random() * 0.55);
    var color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    var wobble = (Math.random() - 0.5) * 0.5;

    gameState.hearts.push({
        x: x, y: -size,
        size: size,
        speed: speed,
        color: color,
        wobble: wobble,
        wobbleT: Math.random() * Math.PI * 2,
        caught: false,
        missed: false
    });
}

/* Draw a heart shape on canvas */
function drawHeart(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    var s = size * 0.5;
    ctx.moveTo(cx, cy + s * 0.35);
    ctx.bezierCurveTo(cx, cy,           cx - s, cy,        cx - s, cy - s * 0.5);
    ctx.bezierCurveTo(cx - s, cy - s,   cx,     cy - s,    cx,     cy - s * 0.4);
    ctx.bezierCurveTo(cx,     cy - s,   cx + s, cy - s,    cx + s, cy - s * 0.5);
    ctx.bezierCurveTo(cx + s, cy,       cx,     cy,        cx,     cy + s * 0.35);
    ctx.fill();
    ctx.restore();
}

/* Main game loop */
function gameLoop(now) {
    if (!gameState.running) return;

    gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Spawn
    if (now - gameState.lastSpawn > gameState.spawnRate) {
        spawnGameHeart(now);
        gameState.lastSpawn = now;
        // Gradually get harder
        if (gameState.spawnRate > 500)  gameState.spawnRate  -= 8;
        if (gameState.speed < 3.5)      gameState.speed      += 0.04;
    }

    // Catcher bounds (in canvas coords)
    var catcherLeft   = catcherX - 28;
    var catcherRight  = catcherX + 28;
    var catcherTop    = gameCanvas.height - 18 - 56;
    var catcherBottom = gameCanvas.height - 18;

    // Update & draw hearts
    var stillAlive = [];
    for (var i = 0; i < gameState.hearts.length; i++) {
        var h = gameState.hearts[i];
        if (h.caught || h.missed) continue;

        h.wobbleT += 0.04;
        h.x += Math.sin(h.wobbleT) * h.wobble;
        h.y += h.speed;

        // Check catch
        var hx = h.x, hy = h.y;
        if (hy + h.size > catcherTop && hy - h.size < catcherBottom &&
            hx + h.size * 0.5 > catcherLeft && hx - h.size * 0.5 < catcherRight) {
            // Caught!
            h.caught = true;
            gameState.score++;
            updateScoreUI();
            flashCatcher();
            spawnScorePop(hx, hy, '+1', false);
            continue;
        }

        // Missed
        if (hy > gameCanvas.height + h.size) {
            h.missed = true;
            gameState.missed++;
            gameState.lives--;
            updateScoreUI();
            updateLivesUI();
            spawnScorePop(hx, gameCanvas.height - 20, '♡', true);
            shakeField();

            if (gameState.lives <= 0) {
                endGame(false);
                return;
            }
            continue;
        }

        drawHeart(gCtx, h.x, h.y, h.size, h.color);
        stillAlive.push(h);
    }
    gameState.hearts = stillAlive;

    // Win condition: 20 caught
    if (gameState.score >= 30) {
        endGame(true);
        return;
    }

    gameState.raf = requestAnimationFrame(gameLoop);
}

function endGame(won) {
    gameState.running = false;
    gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    var resultDeco = document.getElementById('resultDeco');
    var resultMsg  = document.getElementById('resultMsg');

    if (won) {
        if (resultDeco) resultDeco.textContent = '♡';
        if (resultMsg) resultMsg.innerHTML =
            'you caught <strong style="color:#ffb3c6">' + gameState.score + '</strong> hearts!<br><br>' +
            'just like how you caught mine. ♡';
    } else {
        if (resultDeco) resultDeco.textContent = '♡';
        if (resultMsg) resultMsg.innerHTML =
            'you caught <strong style="color:#ffb3c6">' + gameState.score + '</strong> hearts.<br><br>' +
            'that\'s okay — you already have mine. ♡';
    }

    if (popupGameResult) {
        popupGameResult.classList.add('show');
    }

    // Always show continue button after playing
    if (nextFromGame) {
        nextFromGame.style.transition    = 'opacity .8s ease';
        nextFromGame.style.opacity       = '1';
        nextFromGame.style.pointerEvents = 'auto';
    }
}

function flashCatcher() {
    if (!catcherEl) return;
    catcherEl.classList.add('catch-anim');
    setTimeout(function() { catcherEl.classList.remove('catch-anim'); }, 300);
}

function shakeField() {
    if (!gameField) return;
    gameField.classList.remove('field-shake');
    void gameField.offsetWidth; // reflow
    gameField.classList.add('field-shake');
    setTimeout(function() { gameField.classList.remove('field-shake'); }, 400);
}

function spawnScorePop(x, y, text, isMiss) {
    if (!gameField || !gameCanvas) return;
    var pop = document.createElement('div');
    pop.className = 'score-pop' + (isMiss ? ' miss-pop' : '');
    pop.textContent = text;
    var pctX = (x / gameCanvas.width)  * 100;
    var pctY = (y / gameCanvas.height) * 100;
    pop.style.left = pctX + '%';
    pop.style.top  = pctY + '%';
    gameField.appendChild(pop);
    setTimeout(function() { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 850);
}

if (startBtn) {
    startBtn.addEventListener('click', function() {
        if (gameOverlay) gameOverlay.classList.add('hidden');
        startGame();
    });
}

if (playAgainBtn) {
    playAgainBtn.addEventListener('click', function() {
        if (popupGameResult) popupGameResult.classList.remove('show');
        resetGameState();
        if (gameOverlay) {
            gameOverlay.classList.remove('hidden');
            if (overlayTitle) overlayTitle.textContent = 'try again?';
            if (overlaySub) overlaySub.innerHTML = 'catch 20 hearts to win. ♡';
        }
    });
}

if (continueFromGameBtn) {
    continueFromGameBtn.addEventListener('click', function() {
        if (popupGameResult) popupGameResult.classList.remove('show');
        goToPage(4, true);
    });
}

if (nextFromGame) {
    nextFromGame.addEventListener('click', function() { goToPage(4, true); });
}



/* ============================================
   PAGE 3 — SONG
============================================ */
var nextFromSong = document.getElementById('nextFromSong');
if (nextFromSong) nextFromSong.addEventListener('click', function() { goToPage(2, true); });

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
    var dur  = 