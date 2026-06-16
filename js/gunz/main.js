// main.js — bootstrap, game loop, menu / pause / game-over flow.
import * as THREE from 'three';
import { Input } from './input.js';
import { AudioFX } from './audio.js';
import { Effects } from './effects.js';
import { World } from './world.js';
import { HUD } from './hud.js';
import { Player } from './player.js';
import { BotManager } from './bots.js';
import { Projectiles } from './weapons.js';

const FRAG_TARGET = 25;
const MODES = {
  deathmatch: { bots: 3, accuracy: 0.46, target: FRAG_TARGET },
  training: { bots: 2, accuracy: 0.28, target: Infinity },
};

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 500);
camera.position.set(0, 8, 18);

// --- game context ---
const game = {
  THREE, scene, camera, renderer,
  state: 'menu', mode: null,
  input: new Input(canvas),
  audio: new AudioFX(),
  effects: new Effects(scene),
  hud: new HUD(),
  world: null, player: null, bots: null, projectiles: null,
};

game.world = new World(scene);
game.player = new Player(game);
game.projectiles = new Projectiles(game);
game.bots = new BotManager(game, MODES.deathmatch.bots, MODES.deathmatch.accuracy);
game.player.fighter.root.visible = false;

// --- overlays ---
const ov = {
  loading: document.getElementById('loading'),
  menu: document.getElementById('menu'),
  controls: document.getElementById('controls'),
  pause: document.getElementById('pause'),
  gameover: document.getElementById('gameover'),
};
const showOnly = (...keys) => {
  for (const k in ov) ov[k].classList.toggle('hidden', !keys.includes(k));
};

// --- flow ---
function startGame(modeName) {
  const cfg = MODES[modeName] || MODES.deathmatch;
  game.mode = modeName; game.target = cfg.target;
  // rebuild bot manager to match mode count/accuracy
  game.bots.bots.forEach(b => game.scene.remove(b.fighter.root));
  game.bots = new BotManager(game, cfg.bots, cfg.accuracy);
  game.player.frags = 0; game.player.deaths = 0;
  game.player.shotsFired = 0; game.player.shotsHit = 0;
  game.player.weaponIndex = 0; game.player._equipMesh(0);
  game.player.yaw = 0; game.player.pitch = 0.05;
  game.player.spawnAt(game.world.randomSpawn(new THREE.Vector3(0, 0, 0), 0));
  game.bots.start();
  game.hud.setScore(0, 0);
  game.hud.setTimer(cfg.target === Infinity ? '∞' : '0/' + cfg.target);
  game.player._hudWeapon();
  game.audio.resume();
  game.state = 'starting';
  showOnly();
  game.input.lock();
}

function pause() {
  if (game.state !== 'playing') return;
  game.state = 'paused'; game.input.enabled = false;
  showOnly('pause');
}
function resume() { if (game.state === 'paused') { game.audio.resume(); game.input.lock(); } }
function quitToMenu() {
  game.state = 'menu'; game.input.enabled = false; game.input.unlock();
  game.hud.show(false); showOnly('menu');
}
function gameOver(win) {
  game.state = 'over'; game.input.enabled = false; game.input.unlock();
  document.getElementById('go-title').textContent = win ? 'VICTOIRE' : 'DÉFAITE';
  document.getElementById('go-title').style.color = win ? '#7ef0ff' : '#fb7185';
  document.getElementById('go-sub').textContent = win
    ? 'Tu as dominé l’arène. K-style impeccable.'
    : 'Les bots t’ont eu cette fois. Réessaie !';
  document.getElementById('go-frags').textContent = game.player.frags;
  document.getElementById('go-deaths').textContent = game.player.deaths;
  document.getElementById('go-acc').textContent = game.player.accuracy() + '%';
  game.hud.show(false); showOnly('gameover');
}

game.input.onLockChange((locked) => {
  if (locked) {
    if (game.state === 'starting' || game.state === 'paused') {
      game.state = 'playing'; game.input.enabled = true; game.hud.show(true); showOnly();
    }
  } else {
    if (game.state === 'playing') pause();
  }
});

// click-to-lock fallback (e.g. resuming, or if the first lock request was dismissed)
canvas.addEventListener('click', () => {
  if (game.state === 'starting' || game.state === 'paused') game.input.lock();
});

// --- menu wiring ---
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => { game.audio.resume(); game.audio.ui(); startGame(card.dataset.mode); });
});
document.getElementById('btn-controls').addEventListener('click', () => showOnly('menu', 'controls'));
document.getElementById('btn-controls-close').addEventListener('click', () => showOnly('menu'));
document.getElementById('btn-pause-controls').addEventListener('click', () => showOnly('pause', 'controls'));
document.getElementById('btn-resume').addEventListener('click', resume);
document.getElementById('btn-quit').addEventListener('click', quitToMenu);
document.getElementById('btn-again').addEventListener('click', () => startGame(game.mode || 'deathmatch'));
document.getElementById('btn-menu').addEventListener('click', quitToMenu);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- main loop ---
const clock = new THREE.Clock();
let menuAngle = 0;

function checkWin() {
  if (game.target === Infinity) return;
  if (game.player.frags >= game.target) gameOver(true);
  else if (game.bots.enemyScore >= game.target) gameOver(false);
}

renderer.setAnimationLoop(() => {
  let dt = clock.getDelta();
  if (dt > 0.05) dt = 0.05;

  if (game.state === 'playing') {
    game.player.update(dt);
    game.bots.update(dt);
    game.projectiles.update(dt);
    game.effects.update(dt);
    if (game.target !== Infinity) game.hud.setTimer(game.player.frags + '/' + game.target);
    checkWin();
  } else if (game.state === 'menu' || game.state === 'over' || game.state === 'starting') {
    // slow cinematic orbit of the arena
    menuAngle += dt * 0.12;
    const r = 30;
    camera.position.set(Math.sin(menuAngle) * r, 12 + Math.sin(menuAngle * 0.6) * 3, Math.cos(menuAngle) * r);
    camera.lookAt(0, 3, 0);
    game.effects.update(dt);
  }

  renderer.render(scene, camera);
  game.input.endFrame();
});

// reveal
window.__GUNZ_READY = true;
requestAnimationFrame(() => ov.loading.classList.add('hidden'));
