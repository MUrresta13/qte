"use strict";

/* ===== CONFIG ===== */
const TOTAL_PROMPTS = 100;
const TIME_PER_PROMPT_MS = 1000;
const MAX_MISSES = 3;
const PASSCODE = "SNOWCOVERSWHATBLED";

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
const btnCopy = document.getElementById("btnCopy");
const btnAgain = document.getElementById("btnAgain");
const btnBackTitle = document.getElementById("btnBackTitle");
const copyMsg = document.getElementById("copyMsg");

const modalLose = document.getElementById("modalLose");
const btnRetry = document.getElementById("btnRetry");
const btnLoseTitle = document.getElementById("btnLoseTitle");

/* ===== STATE ===== */
let idx = 0;                 // how many prompts completed
let misses = 0;
let current = null;          // current direction string
let active = false;          // game running?
let answered = false;        // already answered this prompt?

let promptTimer = null;      // setTimeout
let tickTimer = null;        // interval for countdown
let endAt = 0;               // timestamp for countdown

/* ===== UI helpers ===== */
function showScreen(s){
  hideAllModals();
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
function hideAllModals(){
  hideModal(modalWin);
  hideModal(modalLose);
  copyMsg.textContent = "";
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

  // tick about 20x/sec (smooth enough)
  tickTimer = setInterval(() => {
    const msLeft = Math.max(0, endAt - Date.now());
    timerEl.textContent = (msLeft / 1000).toFixed(2);
  }, 50);

  promptTimer = setTimeout(() => {
    // time ran out
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

  // short delay so it feels responsive
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
  hideAllModals();
  clearTimers();

  idx = 0;
  misses = 0;
  current = null;
  active = true;
  answered = false;

  promptEl.textContent = "—";
  timerEl.textContent = "1.00";
  setFeedback("Tap the matching arrow.", "");
  updateStats();

  // small delay before first prompt
  setTimeout(() => nextPrompt(), 300);
}

/* ===== Clipboard ===== */
async function copyToClipboard(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

/* ===== Events ===== */
btnStart.addEventListener("click", () => showScreen(screenTitle));
btnPlay.addEventListener("click", () => { showScreen(screenGame); startGame(); });
btnRestart.addEventListener("click", () => startGame());

arrowBtns.forEach(b => {
  b.addEventListener("click", () => handleInput(b.dataset.dir));
});

// keyboard arrows for desktop
window.addEventListener("keydown", (e) => {
  if(!active) return;
  const key = e.key;
  if(key === "ArrowUp") handleInput("UP");
  if(key === "ArrowDown") handleInput("DOWN");
  if(key === "ArrowLeft") handleInput("LEFT");
  if(key === "ArrowRight") handleInput("RIGHT");
});

btnCopy.addEventListener("click", async () => {
  try{
    const ok = await copyToClipboard(PASSCODE);
    copyMsg.textContent = ok ? "Copied to clipboard." : "Copy failed — copy manually.";
  }catch{
    copyMsg.textContent = "Copy failed — copy manually.";
  }
});

btnAgain.addEventListener("click", () => startGame());
btnBackTitle.addEventListener("click", () => { hideAllModals(); showScreen(screenTitle); });

btnRetry.addEventListener("click", () => startGame());
btnLoseTitle.addEventListener("click", () => { hideAllModals(); showScreen(screenTitle); });

/* ===== Boot ===== */
showScreen(screenIntro);
