"use strict";

/* ===== CONFIG ===== */
const TOTAL_PROMPTS = 100;
const TIME_PER_PROMPT_MS = 1000;
const MAX_MISSES = 3;

// Must exist in repo root
const WINNER_AUDIO_SRC = "Winner.mp3";

const DIRS = ["UP","DOWN","LEFT","RIGHT"];
const SYMBOL = { UP:"▲", DOWN:"▼", LEFT:"◀", RIGHT:"▶" };

/* ===== DOM ===== */
const screenIntro = document.getElementById("screenIntro");
const screenTitle = document.getElementById("screenTitle");
const screenGame  = document.getElementById("screenGame");

const btnStart = document.getElementById("btnStart");
const btnPlay = document.getElementById("btnPlay");
const btnRestart = document.getElementById("btnRestart");

const progressEl = document.getElementById("progress");
const missesEl = document.getElementById("misses");

const promptEl = document.getElementById("prompt");
const timerEl = document.getElementById("timer");
const feedbackEl = document.getElementById("feedback");

const arrowBtns = Array.from(document.querySelectorAll(".arrow"));

const modalWin = document.getElementById("modalWin");
const btnClaim = document.getElementById("btnClaim");
const btnBackTitle = document.getElementById("btnBackTitle");

const modalLose = document.getElementById("modalLose");
const btnRetry = document.getElementById("btnRetry");
const btnLoseTitle = document.getElementById("btnLoseTitle");

// Grand prize overlay + confetti
const modalGrand = document.getElementById("modalGrand");
const confettiCanvas = document.getElementById("confetti");
const cctx = confettiCanvas.getContext("2d");

/* ===== STATE ===== */
let idx = 0;
let misses = 0;
let current = null;
let active = false;
let answered = false;

let promptTimer = null;
let tickTimer = null;
let endAt = 0;

// Winner audio (plays once on claim)
let winnerAudio = null;

// Confetti
let confetti = [];
let confettiRAF = null;

/* ===== UI helpers ===== */
function showScreen(s){
  hideAllOverlays();
  screenIntro.classList.remove("active");
  screenTitle.classList.remove("active");
  screenGame.classList.remove("active");
  s.classList.add("active");
}

function setFeedback(msg, kind=""){
  feedbackEl.textContent = msg;
  feedbackEl.style.color =
    kind === "ok" ? "rgba(124,255,161,.95)" :
    kind === "bad" ? "rgba(255,107,107,.95)" :
    "rgba(255,255,255,.86)";
}

function showModal(el){
  el.classList.add("show");
  el.setAttribute("aria-hidden","false");
}
function hideModal(el){
  el.classList.remove("show");
  el.setAttribute("aria-hidden","true");
}

function showGrand(){
  modalGrand.classList.add("show");
  modalGrand.setAttribute("aria-hidden","false");
}
function hideGrand(){
  modalGrand.classList.remove("show");
  modalGrand.setAttribute("aria-hidden","true");
}

function hideAllOverlays(){
  hideModal(modalWin);
  hideModal(modalLose);
  hideGrand();
}

function updateStats(){
  progressEl.textContent = `${idx} / ${TOTAL_PROMPTS}`;
  missesEl.textContent = `${misses} / ${MAX_MISSES}`;
}

function randDir(){
  return DIRS[Math.floor(Math.random() * DIRS.length)];
}

/* ===== Timing ===== */
function clearTimers(){
  if(promptTimer){ clearTimeout(promptTimer); promptTimer = null; }
  if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
}

function startCountdown(){
  endAt = Date.now() + TIME_PER_PROMPT_MS;

  tickTimer = setInterval(() => {
    const msLeft = Math.max(0, endAt - Date.now());
    timerEl.textContent = (msLeft / 1000).toFixed(2);
  }, 50);

  promptTimer = setTimeout(() => {
    if(!active || answered) return;
    answered = true;
    registerMiss("Too slow.");
  }, TIME_PER_PROMPT_MS);
}

/* ===== Game flow ===== */
function nextPrompt(){
  if(!active) return;

  if(idx >= TOTAL_PROMPTS){
    win();
    return;
  }

  answered = false;
  clearTimers();

  current = randDir();
  promptEl.textContent = SYMBOL[current];
  timerEl.textContent = "1.00";
  setFeedback("Tap the matching arrow.", "");
  updateStats();

  startCountdown();
}

function registerHit(){
  idx++;
  setFeedback("Correct.", "ok");
  clearTimers();
  setTimeout(() => nextPrompt(), 120);
}

function registerMiss(reason){
  misses++;
  setFeedback(`Miss. ${reason}`, "bad");
  clearTimers();
  updateStats();

  if(misses >= MAX_MISSES){
    lose();
    return;
  }
  setTimeout(() => nextPrompt(), 160);
}

function handleInput(dir){
  if(!active) return;
  if(answered) return;
  answered = true;

  if(dir === current){
    registerHit();
  }else{
    registerMiss("Wrong input.");
  }
}

function win(){
  active = false;
  clearTimers();
  updateStats();

  promptEl.textContent = "✓";
  timerEl.textContent = "0.00";
  showModal(modalWin);
}

function lose(){
  active = false;
  clearTimers();
  updateStats();

  promptEl.textContent = "✕";
  timerEl.textContent = "0.00";
  showModal(modalLose);
}

function startGame(){
  hideAllOverlays();
  stopConfetti();

  idx = 0;
  misses = 0;
  current = null;
  active = true;
  answered = false;

  promptEl.textContent = "—";
  timerEl.textContent = "1.00";
  setFeedback("Tap the matching arrow.", "");
  updateStats();

  setTimeout(() => nextPrompt(), 300);
}

/* ===== Winner audio + Grand prize overlay ===== */
function ensureWinnerAudio(){
  if(!winnerAudio){
    winnerAudio = new Audio(WINNER_AUDIO_SRC);
    winnerAudio.preload = "auto";
  }
}

async function claimGrandPrize(){
  // Hide the "Success" modal, then show the permanent overlay
  hideModal(modalWin);

  ensureWinnerAudio();

  // Attempt to play Winner.mp3 once
  // (User gesture is this click, so iOS allows it)
  try{
    winnerAudio.currentTime = 0;
    winnerAudio.loop = false;
    await winnerAudio.play();
  }catch{
    // If audio fails, still proceed to grand overlay
  }

  showGrand();
  startConfetti();
}

/* ===== Confetti ===== */
function resizeConfettiCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  confettiCanvas.width = w;
  confettiCanvas.height = h;
  confettiCanvas.style.width = "100%";
  confettiCanvas.style.height = "100%";
  cctx.setTransform(dpr,0,0,dpr,0,0);
}

function rand(min, max){ return min + Math.random() * (max - min); }

function spawnConfetti(count=220){
  confetti = [];
  const w = window.innerWidth;
  const h = window.innerHeight;

  for(let i=0;i<count;i++){
    confetti.push({
      x: rand(0, w),
      y: rand(-h, 0),
      vx: rand(-40, 40),
      vy: rand(120, 300),
      rot: rand(0, Math.PI*2),
      vr: rand(-4, 4),
      size: rand(6, 14),
      hue: rand(0, 360),
      alpha: rand(0.7, 1.0),
      shape: Math.random() < 0.5 ? "rect" : "circle"
    });
  }
}

function drawConfetti(dt){
  const w = window.innerWidth;
  const h = window.innerHeight;

  cctx.clearRect(0,0,w,h);

  for(const p of confetti){
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;

    // wrap
    if(p.y > h + 30){
      p.y = rand(-120, -30);
      p.x = rand(0, w);
    }
    if(p.x < -30) p.x = w + 30;
    if(p.x > w + 30) p.x = -30;

    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.globalAlpha = p.alpha;
    cctx.fillStyle = `hsl(${p.hue} 95% 60%)`;

    if(p.shape === "rect"){
      cctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.65);
    }else{
      cctx.beginPath();
      cctx.arc(0,0,p.size*0.45,0,Math.PI*2);
      cctx.fill();
    }
    cctx.restore();
  }
}

function startConfetti(){
  resizeConfettiCanvas();
  spawnConfetti(260);

  let last = performance.now();
  function loop(now){
    // keep looping forever
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    drawConfetti(dt);
    confettiRAF = requestAnimationFrame(loop);
  }
  if(confettiRAF) cancelAnimationFrame(confettiRAF);
  confettiRAF = requestAnimationFrame(loop);
}

function stopConfetti(){
  if(confettiRAF){
    cancelAnimationFrame(confettiRAF);
    confettiRAF = null;
  }
  confetti = [];
}

/* ===== Events ===== */
btnStart.addEventListener("click", () => showScreen(screenTitle));
btnPlay.addEventListener("click", () => { showScreen(screenGame); startGame(); });
btnRestart.addEventListener("click", () => startGame());

arrowBtns.forEach(b => {
  b.addEventListener("click", () => handleInput(b.dataset.dir));
});

window.addEventListener("keydown", (e) => {
  if(!active) return;
  if(e.key === "ArrowUp") handleInput("UP");
  if(e.key === "ArrowDown") handleInput("DOWN");
  if(e.key === "ArrowLeft") handleInput("LEFT");
  if(e.key === "ArrowRight") handleInput("RIGHT");
});

// Win step-1 buttons
btnClaim.addEventListener("click", () => claimGrandPrize());
btnBackTitle.addEventListener("click", () => { hideAllOverlays(); showScreen(screenTitle); });

// Lose buttons
btnRetry.addEventListener("click", () => startGame());
btnLoseTitle.addEventListener("click", () => { hideAllOverlays(); showScreen(screenTitle); });

// Keep confetti full-screen on rotate/resize
window.addEventListener("resize", () => {
  if(modalGrand.classList.contains("show")){
    resizeConfettiCanvas();
  }
});

/* ===== Boot ===== */
showScreen(screenIntro);
