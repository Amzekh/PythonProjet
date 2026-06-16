// effects.js — pooled particles, tracers, impacts, explosions, screen shake, damage numbers.
import * as THREE from 'three';

const Z = new THREE.Vector3(0, 0, 1);
const tmp = new THREE.Vector3();

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.tex = this._softTex();
    this.active = [];
    this.pool = [];
    for (let i = 0; i < 360; i++) {
      const m = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s); this.pool.push(s);
    }
    // tracers
    this.tracers = [];
    this.tracerPool = [];
    const tgeo = new THREE.BoxGeometry(0.05, 0.05, 1);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(tgeo, m); mesh.visible = false; scene.add(mesh); this.tracerPool.push(mesh);
    }
    // flash lights
    this.lights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 14, 2); l.visible = false; scene.add(l); this.lights.push({ l, life: 0 });
    }
    this.numbers = [];
    this.shakeAmt = 0;
    this._shakeOff = new THREE.Vector3();
  }

  _softTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _get() {
    const s = this.pool.pop();
    if (!s) return null;
    s.visible = true;
    return s;
  }

  _spawn(pos, color, opts = {}) {
    const s = this._get();
    if (!s) return;
    s.position.copy(pos);
    s.material.color.set(color);
    const scale = opts.size || 0.3;
    s.scale.setScalar(scale);
    s.material.opacity = opts.opacity != null ? opts.opacity : 1;
    s.material.blending = opts.blending != null ? opts.blending : THREE.AdditiveBlending;
    this.active.push({
      s,
      vel: opts.vel || new THREE.Vector3(),
      life: opts.life || 0.5, maxLife: opts.life || 0.5,
      grav: opts.grav || 0, drag: opts.drag != null ? opts.drag : 0.9,
      scale0: scale, scale1: opts.scaleEnd != null ? opts.scaleEnd : scale,
      op0: s.material.opacity,
    });
  }

  burst(pos, color, n, spd, opts = {}) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1));
      if (opts.dir) v.add(opts.dir.clone().multiplyScalar(opts.dirBias || 1.5));
      v.normalize().multiplyScalar(spd * (0.4 + Math.random() * 0.6));
      this._spawn(pos, color, {
        vel: v, life: (opts.life || 0.5) * (0.6 + Math.random() * 0.6),
        grav: opts.grav || 0, drag: opts.drag,
        size: (opts.size || 0.25) * (0.6 + Math.random() * 0.8),
        scaleEnd: opts.scaleEnd, opacity: opts.opacity, blending: opts.blending,
      });
    }
  }

  muzzle(pos, dir, color = 0xfff2a8) {
    this._spawn(pos, color, { life: 0.06, size: 0.7, scaleEnd: 0.1, vel: dir.clone().multiplyScalar(2) });
    this.burst(pos, 0xffd76b, 5, 6, { dir, dirBias: 2, life: 0.12, size: 0.15, drag: 0.8 });
    this.flash(pos, color, 4, 0.06);
  }

  tracer(from, to, color = 0xfff2a8) {
    const mesh = this.tracerPool.pop();
    if (!mesh) return;
    mesh.visible = true;
    mesh.material.color.set(color);
    mesh.material.opacity = 0.9;
    tmp.copy(to).sub(from);
    const len = tmp.length();
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(Z, tmp.normalize());
    mesh.scale.set(1, 1, len);
    this.tracers.push({ mesh, life: 0.06, max: 0.06 });
  }

  impactWall(pos, normal, color = 0xbcd0ff) {
    const dir = normal ? normal.clone() : new THREE.Vector3(0, 1, 0);
    this.burst(pos, color, 8, 7, { dir, dirBias: 1, life: 0.3, size: 0.12, grav: -14, drag: 0.86 });
    this._spawn(pos, 0xffffff, { life: 0.08, size: 0.4, scaleEnd: 0.05 });
    this.flash(pos, color, 2, 0.06);
  }

  blood(pos, dir, color = 0xff4d6d) {
    this.burst(pos, color, 10, 6, { dir: dir || new THREE.Vector3(0, 1, 0), dirBias: 1.2, life: 0.4, size: 0.16, grav: -18, drag: 0.88 });
    this._spawn(pos, 0xff8aa0, { life: 0.1, size: 0.45, scaleEnd: 0.1 });
  }

  explosion(pos) {
    this._spawn(pos, 0xfff0c0, { life: 0.16, size: 0.6, scaleEnd: 5.5, opacity: 1 });
    this.burst(pos, 0xffb347, 26, 16, { life: 0.5, size: 0.4, grav: -10, drag: 0.9, scaleEnd: 0.1 });
    this.burst(pos, 0xff5a3c, 16, 9, { life: 0.6, size: 0.5, grav: -6, drag: 0.92 });
    // smoke
    for (let i = 0; i < 12; i++) {
      const v = new THREE.Vector3((Math.random() * 2 - 1), Math.random() * 1.5, (Math.random() * 2 - 1)).multiplyScalar(3);
      this._spawn(pos, 0x222428, { vel: v, life: 1.2, size: 0.6, scaleEnd: 2.4, grav: 2, drag: 0.94, opacity: 0.7, blending: THREE.NormalBlending });
    }
    this.flash(pos, 0xffaa55, 18, 0.4, 22);
    this.addShake(1.1);
  }

  flash(pos, color, intensity, life, dist = 14) {
    const slot = this.lights.find(s => s.life <= 0);
    if (!slot) return;
    slot.l.visible = true; slot.l.color.set(color); slot.l.intensity = intensity;
    slot.l.distance = dist; slot.l.position.copy(pos);
    slot.life = life; slot.max = life; slot.peak = intensity;
  }

  number(pos, amount, opts = {}) {
    const txt = String(Math.round(amount));
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 44px Orbitron, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)';
    g.fillStyle = opts.color || '#ffd56b';
    g.strokeText(txt, 64, 32); g.fillText(txt, 64, 32);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos); s.position.y += 0.4;
    const sc = opts.scale || 1;
    s.scale.set(1.2 * sc, 0.6 * sc, 1);
    s.renderOrder = 999;
    this.scene.add(s);
    this.numbers.push({ s, tex, life: 0.8, max: 0.8, vy: 1.6 });
  }

  addShake(a) { this.shakeAmt = Math.min(2, this.shakeAmt + a); }
  shakeOffset() {
    const a = this.shakeAmt * 0.12;
    this._shakeOff.set((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
    return this._shakeOff;
  }

  update(dt) {
    // particles
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; this.pool.push(p.s); this.active.splice(i, 1); continue; }
      p.vel.y += p.grav * dt;
      p.vel.multiplyScalar(p.drag);
      p.s.position.addScaledVector(p.vel, dt);
      const f = p.life / p.maxLife;
      p.s.material.opacity = p.op0 * f;
      p.s.scale.setScalar(p.scale1 + (p.scale0 - p.scale1) * f);
    }
    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) { t.mesh.visible = false; this.tracerPool.push(t.mesh); this.tracers.splice(i, 1); continue; }
      t.mesh.material.opacity = 0.9 * (t.life / t.max);
    }
    // lights
    for (const s of this.lights) {
      if (s.life > 0) {
        s.life -= dt;
        if (s.life <= 0) { s.l.visible = false; s.l.intensity = 0; }
        else s.l.intensity = s.peak * (s.life / s.max);
      }
    }
    // numbers
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt;
      n.s.position.y += n.vy * dt; n.vy *= 0.96;
      n.s.material.opacity = Math.min(1, n.life / (n.max * 0.5));
      if (n.life <= 0) { this.scene.remove(n.s); n.tex.dispose(); n.s.material.dispose(); this.numbers.splice(i, 1); }
    }
    // shake decay
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 3.2);
  }
}
