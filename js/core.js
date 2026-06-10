'use strict';

/* ============================================================
   PROFILE & PERSISTENCE
   ============================================================ */
const STORE_KEY = 'kidlearn.v2';
const DEFAULT_PROFILE = {
  name: '', avatar: '🦊', stars: 0, badges: [], played: [],
  best: {}, sound: true, streak: 0, lastDay: '', dailyDone: ''
};

let P = loadProfile();

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign({}, DEFAULT_PROFILE, JSON.parse(raw));
  } catch (e) { /* storage unavailable */ }
  const legacy = parseInt(localStorage.getItem('kidlearn-score') || '0', 10);
  return Object.assign({}, DEFAULT_PROFILE, { stars: isNaN(legacy) ? 0 : legacy });
}

function saveProfile() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* ignore */ }
}

/* ============================================================
   GAMES REGISTRY
   ============================================================ */
const GAMES = [
  { id: 'math',     icon: '🔢', title: 'Calcul Magique',     desc: 'Additions, soustractions et plus', c: '#FF6B6B', cd: '#E14B4B', cs: '#FFE3E3' },
  { id: 'memory',   icon: '🃏', title: 'Mémo Rigolo',        desc: 'Retrouve les paires cachées',      c: '#34C8BE', cd: '#1FA89F', cs: '#D9F7F5' },
  { id: 'alphabet', icon: '🔤', title: 'Aventure Alphabet',  desc: 'Lettres et premiers mots',         c: '#FFB703', cd: '#DE9E00', cs: '#FFF1CC' },
  { id: 'animals',  icon: '🦁', title: 'Quiz Animaux',       desc: 'Les secrets des animaux',          c: '#52B788', cd: '#3E9A70', cs: '#DDF3E8' },
  { id: 'counting', icon: '🌟', title: 'Compte les Étoiles', desc: 'Apprends à compter',               c: '#FF7AA2', cd: '#E25C85', cs: '#FFE4ED' },
  { id: 'truefals', icon: '🤔', title: 'Vrai ou Faux',       desc: 'Des faits étonnants',              c: '#9B5DE5', cd: '#7F44C6', cs: '#EFE2FC' },
  { id: 'scramble', icon: '🧩', title: 'Mots Mélangés',      desc: 'Remets les lettres en ordre',      c: '#F4845F', cd: '#D96A47', cs: '#FDE7DE' },
  { id: 'geo',      icon: '🌍', title: 'Tour du Monde',      desc: 'Pays, drapeaux et capitales',      c: '#3FA7D6', cd: '#2C8DB8', cs: '#DFF1FA' },
  { id: 'colors',   icon: '🎨', title: 'Magie des Couleurs', desc: 'Reconnais et mélange',             c: '#EF5DA8', cd: '#D14390', cs: '#FDE2F0' },
  { id: 'drawing',  icon: '✏️', title: 'Atelier Dessin',     desc: 'Crée tes chefs-d’œuvre', c: '#7BC950', cd: '#62AC3B', cs: '#E8F7DD' },
];

const GAME_INIT = {}; // filled by games.js

/* ============================================================
   BADGES
   ============================================================ */
const BADGES = [
  { id: 'first',      icon: '🎈', name: 'Première partie', desc: 'Termine un jeu' },
  { id: 'perfect',    icon: '💯', name: 'Sans faute',      desc: 'Score parfait' },
  { id: 'threestars', icon: '🏆', name: 'Champion',        desc: '3 étoiles à un jeu' },
  { id: 'explorer',   icon: '🧭', name: 'Explorateur',     desc: 'Joue à 5 jeux' },
  { id: 'allgames',   icon: '🌍', name: 'Globe-trotteur',  desc: 'Joue aux 10 jeux' },
  { id: 'star300',    icon: '⭐', name: 'Collectionneur',  desc: 'Gagne 300 étoiles' },
  { id: 'star1000',   icon: '🌠', name: 'Superstar',       desc: 'Gagne 1000 étoiles' },
  { id: 'artist',     icon: '🎨', name: 'Artiste',         desc: 'Sauvegarde un dessin' },
  { id: 'streak3',    icon: '🔥', name: 'En feu !',        desc: '3 jours d’affilée' },
];

const badgeQueue = [];
let badgeShowing = false;

function awardBadge(id) {
  if (P.badges.includes(id)) return;
  P.badges.push(id);
  saveProfile();
  const b = BADGES.find(x => x.id === id);
  if (b) badgeQueue.push(`${b.icon} Nouveau badge : ${b.name} !`);
  pumpBadgeQueue();
}

function pumpBadgeQueue() {
  if (badgeShowing || badgeQueue.length === 0) return;
  badgeShowing = true;
  const el = document.getElementById('badge-toast');
  el.textContent = badgeQueue.shift();
  el.classList.add('show');
  SFX.fanfare();
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { badgeShowing = false; pumpBadgeQueue(); }, 500);
  }, 2600);
}

function checkBadges(ctx = {}) {
  if (P.played.length >= 1) awardBadge('first');
  if (ctx.ratio === 1) awardBadge('perfect');
  if (ctx.stars === 3) awardBadge('threestars');
  if (P.played.length >= 5) awardBadge('explorer');
  if (P.played.length >= 10) awardBadge('allgames');
  if (P.stars >= 300) awardBadge('star300');
  if (P.stars >= 1000) awardBadge('star1000');
  if (P.streak >= 3) awardBadge('streak3');
}

/* ============================================================
   SOUND ENGINE (Web Audio, synthesized — no assets)
   ============================================================ */
const SFX = {
  ctx: null,
  ensure() {
    if (!P.sound) return false;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    } catch (e) { return false; }
  },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.16, delay = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },
  click()   { this.tone(620, 0.06, 'triangle', 0.12); },
  flip()    { this.tone(440, 0.08, 'sine', 0.1); this.tone(560, 0.08, 'sine', 0.1, 0.05); },
  correct() { this.tone(660, 0.1, 'sine', 0.18); this.tone(880, 0.16, 'sine', 0.18, 0.09); },
  wrong()   { this.tone(200, 0.22, 'sawtooth', 0.08); this.tone(160, 0.25, 'sawtooth', 0.07, 0.08); },
  pop()     { this.tone(900, 0.05, 'triangle', 0.1); },
  star(i)   { this.tone(700 + i * 180, 0.18, 'sine', 0.2); },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, i * 0.11));
  },
};

// Unlock audio context on first interaction (browser autoplay policy)
document.addEventListener('pointerdown', () => { if (P.sound) SFX.ensure(); }, { once: true });

function toggleSound() {
  P.sound = !P.sound;
  saveProfile();
  document.getElementById('sound-btn').textContent = P.sound ? '🔊' : '🔇';
  if (P.sound) SFX.click();
}

/* ===== Speech synthesis (French) ===== */
function speak(text) {
  if (!P.sound || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.92;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (e) { /* unsupported */ }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
let activeTimers = [];
function trackTimer(t) { activeTimers.push(t); return t; }
function stopAllTimers() { activeTimers.forEach(clearInterval); activeTimers = []; }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  window.scrollTo({ top: 0 });
}

function goHome() {
  stopAllTimers();
  closeResult();
  showScreen('home');
  renderHome();
}

function openGame(id) {
  SFX.click();
  stopAllTimers();
  showScreen(id);
  if (GAME_INIT[id]) GAME_INIT[id]();
}

/* ============================================================
   HOME RENDERING
   ============================================================ */
const fineMotion = window.matchMedia('(pointer: fine)').matches &&
                   !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderHome() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '';
  GAMES.forEach((g, i) => {
    const earned = P.best[g.id] || 0;
    const stars = '★'.repeat(earned) + `<span class="off">${'★'.repeat(3 - earned)}</span>`;
    const card = document.createElement('button');
    card.className = 'game-card';
    card.style.setProperty('--c', g.c);
    card.style.setProperty('--cd', g.cd);
    card.style.setProperty('--cs', g.cs);
    card.style.animationDelay = (i * 0.045) + 's';
    card.innerHTML =
      `<span class="card-icon">${g.icon}</span>` +
      `<span class="card-title">${g.title}</span>` +
      `<span class="card-desc">${g.desc}</span>` +
      `<span class="card-foot"><span class="card-stars">${stars}</span><span class="card-go">➜</span></span>`;
    card.addEventListener('click', () => openGame(g.id));
    if (fineMotion) addTilt(card);
    grid.appendChild(card);
  });
  updateHUD();
  updateGreeting();
  updateDaily();
}

function addTilt(card) {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
    card.style.transform = `translateY(-7px) perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
}

function updateGreeting() {
  const name = P.name || 'champion';
  document.getElementById('greeting').innerHTML = `Salut, ${escapeHtml(name)}&nbsp;! 👋`;
  document.getElementById('hero-avatar').textContent = P.avatar;
  document.getElementById('avatar-btn').textContent = P.avatar;
}

function dailyGame() {
  const day = Math.floor(Date.now() / 86400000);
  return GAMES[day % GAMES.length];
}

function updateDaily() {
  const g = dailyGame();
  const chip = document.getElementById('daily-chip');
  const done = P.dailyDone === new Date().toDateString();
  chip.innerHTML = done
    ? `✅ Défi du jour réussi : ${g.title} !`
    : `🎯 Défi du jour : ${g.title}`;
  chip.onclick = () => openGame(g.id);
}

/* ============================================================
   HUD (stars, level, streak)
   ============================================================ */
const LEVEL_STEP = 150;

function updateHUD() {
  document.getElementById('star-count').textContent = P.stars;
  document.getElementById('streak-count').textContent = P.streak;
  const lvl = Math.floor(P.stars / LEVEL_STEP) + 1;
  const pct = (P.stars % LEVEL_STEP) / LEVEL_STEP * 100;
  document.getElementById('level-label').textContent = 'Niv. ' + lvl;
  document.getElementById('level-fill').style.width = pct + '%';
  document.getElementById('sound-btn').textContent = P.sound ? '🔊' : '🔇';
}

function addStars(n, { silent = false } = {}) {
  P.stars += n;
  saveProfile();
  updateHUD();
  if (!silent && n > 0) starPop(n);
}

function starPop(n) {
  const chip = document.querySelector('.chip-stars');
  if (!chip) return;
  const r = chip.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'star-fly';
  el.textContent = `+${n} ⭐`;
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top = (r.bottom + 8) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function touchStreak() {
  const today = new Date().toDateString();
  if (P.lastDay === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  P.streak = (P.lastDay === yesterday) ? P.streak + 1 : 1;
  P.lastDay = today;
}

/* ============================================================
   RESULT OVERLAY (shared by all games)
   ============================================================ */
let replayFn = null;

function finishGame(gameId, { score = 0, total = 10, text = '', stars } = {}) {
  stopAllTimers();
  const ratio = total > 0 ? score / total : 0;
  if (stars === undefined) {
    stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.45 ? 1 : 0;
  }
  const bonus = stars * 20 + 10;
  P.stars += bonus;
  if ((P.best[gameId] || 0) < stars) P.best[gameId] = stars;
  if (!P.played.includes(gameId)) P.played.push(gameId);
  touchStreak();
  if (dailyGame().id === gameId && stars >= 1) P.dailyDone = new Date().toDateString();
  saveProfile();
  updateHUD();
  checkBadges({ ratio, stars });

  const titles = ['Pas grave, réessaie !', 'Bien joué !', 'Super travail !', 'Incroyable !'];
  const mascots = ['😅', '🙂', '😄', '🤩'];
  document.getElementById('result-mascot').textContent = mascots[stars];
  document.getElementById('result-title').textContent = titles[stars];
  document.getElementById('result-text').textContent =
    text || `Tu as réussi ${score} question${score > 1 ? 's' : ''} sur ${total} !`;
  document.getElementById('result-xp').textContent = `+${bonus} ⭐ bonus`;

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById('rstar-' + i);
    el.classList.remove('lit');
    if (i < stars) {
      setTimeout(() => { el.classList.add('lit'); SFX.star(i); }, 500 + i * 380);
    }
  }

  replayFn = () => { closeResult(); GAME_INIT[gameId](); };
  document.getElementById('result-overlay').classList.remove('hidden');

  if (stars >= 2) setTimeout(confettiBurst, 400);
  if (stars >= 1) SFX.fanfare(); else SFX.wrong();
}

function closeResult() {
  document.getElementById('result-overlay').classList.add('hidden');
}

document.getElementById('result-replay').addEventListener('click', () => {
  SFX.click();
  if (replayFn) replayFn();
});

/* ============================================================
   CONFETTI (canvas)
   ============================================================ */
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParts = [];
let confettiRunning = false;

function confettiBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const colors = ['#FF6B6B', '#FFB703', '#34C8BE', '#9B5DE5', '#EF5DA8', '#52B788'];
  for (let i = 0; i < 90; i++) {
    confettiParts.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * 80,
      w: 7 + Math.random() * 7,
      h: 5 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 3,
      vy: 2.5 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      color: colors[i % colors.length],
    });
  }
  if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(confettiTick); }
}

function confettiTick() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParts = confettiParts.filter(p => p.y < confettiCanvas.height + 30);
  confettiParts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.04;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });
  if (confettiParts.length > 0) {
    requestAnimationFrame(confettiTick);
  } else {
    confettiRunning = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ============================================================
   PROFILE MODAL
   ============================================================ */
function openProfile() {
  SFX.click();
  document.getElementById('profile-avatar').textContent = P.avatar;
  document.getElementById('profile-name').textContent = P.name || 'Champion';
  document.getElementById('profile-level').textContent = Math.floor(P.stars / LEVEL_STEP) + 1;
  document.getElementById('profile-stars').textContent = P.stars;
  document.getElementById('profile-streak').textContent = P.streak;
  document.getElementById('profile-level-fill').style.width =
    (P.stars % LEVEL_STEP) / LEVEL_STEP * 100 + '%';

  const grid = document.getElementById('badges-grid');
  grid.innerHTML = '';
  BADGES.forEach(b => {
    const unlocked = P.badges.includes(b.id);
    const div = document.createElement('div');
    div.className = 'badge-item ' + (unlocked ? 'unlocked' : 'locked');
    div.innerHTML =
      `<span class="b-icon">${b.icon}</span>` +
      `<span class="b-name">${b.name}</span>` +
      `<span class="b-desc">${b.desc}</span>`;
    grid.appendChild(div);
  });
  document.getElementById('profile-overlay').classList.remove('hidden');
}

function closeProfile() {
  document.getElementById('profile-overlay').classList.add('hidden');
}

/* ============================================================
   ONBOARDING
   ============================================================ */
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦄', '🐙', '🐯', '🐰'];
let pickedAvatar = P.avatar;

function showOnboarding(editing = false) {
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = '';
  pickedAvatar = P.avatar;
  AVATARS.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'avatar-opt' + (a === pickedAvatar ? ' selected' : '');
    btn.textContent = a;
    btn.addEventListener('click', () => {
      SFX.pop();
      pickedAvatar = a;
      grid.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });
  document.getElementById('name-input').value = editing ? P.name : '';
  document.getElementById('onboarding').classList.remove('hidden');
}

function finishOnboarding() {
  const name = document.getElementById('name-input').value.trim();
  P.name = name || P.name || 'Champion';
  P.avatar = pickedAvatar;
  saveProfile();
  document.getElementById('onboarding').classList.add('hidden');
  updateGreeting();
  SFX.fanfare();
  confettiBurst();
  showToast(`Bienvenue, ${P.name} ! 🎉`);
}

/* ============================================================
   UTILS
   ============================================================ */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wrongNumbers(correct, count, min = 0, max = 100) {
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 500) {
    const n = correct + rand(-10, 10);
    if (n !== correct && n >= min && n <= max) set.add(n);
  }
  return [...set];
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function stripEmoji(s) {
  return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
}

/* ===== Shared MCQ helpers ===== */
function buildOptions(container, items, onPick) {
  container.innerHTML = '';
  const buttons = items.map(item => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.textContent = item;
    btn.addEventListener('click', () => onPick(item, btn, buttons));
    container.appendChild(btn);
    return btn;
  });
  return buttons;
}

function lockOptions(buttons) {
  buttons.forEach(b => b.classList.add('locked'));
}

function setDots(elId, current, total) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('span');
    d.className = 'qdot' + (i < current ? ' done' : i === current ? ' now' : '');
    el.appendChild(d);
  }
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  renderHome();
  if (!P.name) showOnboarding();
}
document.addEventListener('DOMContentLoaded', boot);
