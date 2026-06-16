// bots.js — AI opponents and their manager.
import * as THREE from 'three';
import { buildFighter, animateFighter } from './fighter.js';
import { buildWeaponMesh } from './weapons.js';

const H = 1.85, R = 0.42;
const SPEED = 8.5, ACCEL = 60, FRICTION = 9, JUMP = 10.5, GRAV = 26;

class Bot {
  constructor(game, manager, name) {
    this.game = game; this.manager = manager; this.name = name;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.center = new THREE.Vector3(); this.sphereR = 0.75;
    this.yaw = 0; this.face = new THREE.Vector3(0, 0, 1);
    this.maxHp = 100; this.hp = 100;
    this.alive = false; this.respawnTimer = 1; this.grounded = false;
    this.fireTimer = 1; this.thinkTimer = 0; this.strafeDir = 1; this.jumpTimer = 0; this.dashTimer = 0;
    this.accuracy = 0.5; this.hitFlash = 0;
    this.weapon = { dmg: 7, rate: 0.17, range: 70, spread: 0.05 };

    this.fighter = buildFighter({ primary: 0xff3b5c, accent: 0xffa6b6 });
    this.gun = buildWeaponMesh('smg');
    this.fighter.gunMount.add(this.gun);
    this.fighter.root.visible = false;
    game.scene.add(this.fighter.root);
    this._tmp = new THREE.Vector3(); this._tmp2 = new THREE.Vector3();
  }

  spawn(p, accuracy) {
    this.pos.copy(p); this.vel.set(0, 0, 0);
    this.hp = this.maxHp; this.alive = true; this.grounded = false;
    this.accuracy = accuracy;
    this.fireTimer = 0.6 + Math.random() * 0.6;
    this.thinkTimer = 0; this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.fighter.root.visible = true; this.fighter.root.rotation.x = 0;
    this.game.effects.burst(p.clone().setY(p.y + 1), 0xff6b86, 14, 6, { life: 0.4, size: 0.2 });
  }

  canSee(targetCenter, dist) {
    const dir = this._tmp.copy(targetCenter).sub(this.center).normalize();
    const hit = this.game.world.raycast(this.center, dir, dist);
    return !hit || hit.dist >= dist - 0.6;
  }

  update(dt) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      animateFighter(this.fighter, dt, { mode: 'dead' });
      if (this.respawnTimer <= 0) {
        const p = this.game.world.randomSpawn(this.game.player.center, 16);
        this.spawn(p, this.accuracy);
      }
      return;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.fireTimer -= dt; this.jumpTimer -= dt; this.dashTimer -= dt; this.thinkTimer -= dt;

    const player = this.game.player;
    const toP = this._tmp.copy(player.center).sub(this.center); toP.y = 0;
    const dist = toP.length();
    const dir = dist > 0.01 ? toP.clone().multiplyScalar(1 / dist) : new THREE.Vector3(0, 0, 1);
    const los = player.alive && this.canSee(player.center, this.center.distanceTo(player.center));

    // ---- decide movement ----
    if (this.thinkTimer <= 0) { this.thinkTimer = 0.8 + Math.random() * 0.8; this.strafeDir *= Math.random() < 0.35 ? -1 : 1; }
    const wish = this._tmp2.set(0, 0, 0);
    if (!player.alive) {
      // wander
      wish.set(Math.sin(this.manager.time * 0.5 + this.yaw), 0, Math.cos(this.manager.time * 0.4 + this.yaw));
    } else if (!los || dist > 26) {
      wish.copy(dir);                                 // approach
    } else if (dist < 8) {
      wish.copy(dir).multiplyScalar(-1);              // back off
      wish.x += -dir.z * this.strafeDir; wish.z += dir.x * this.strafeDir;
    } else {
      wish.x = -dir.z * this.strafeDir; wish.z = dir.x * this.strafeDir; // circle strafe
      wish.addScaledVector(dir, 0.25);
    }
    // obstacle avoidance
    if (wish.lengthSq() > 0) {
      wish.normalize();
      const ahead = this.game.world.raycast(this.center, wish, 2.2);
      if (ahead) {
        wish.x += ahead.normal.x; wish.z += ahead.normal.z;
        if (this.jumpTimer <= 0 && this.grounded) { this.vel.y = JUMP; this.jumpTimer = 1.2; }
        if (wish.lengthSq() > 0) wish.normalize();
      }
    }
    // separation from other bots
    for (const o of this.manager.bots) {
      if (o === this || !o.alive) continue;
      const dd = this._tmp.copy(this.center).sub(o.center); dd.y = 0;
      const l = dd.length();
      if (l > 0.01 && l < 1.6) { wish.addScaledVector(dd.multiplyScalar(1 / l), 0.8); wish.normalize(); }
    }

    // occasional GunZ-style dash
    if (los && this.dashTimer <= 0 && Math.random() < 0.012) {
      this.vel.x = wish.x * 22; this.vel.z = wish.z * 22; this.dashTimer = 1.6 + Math.random();
      this.game.audio.dash();
    }

    this._move(dt, wish);

    // ---- facing ----
    const faceDir = (los && player.alive) ? dir : (wish.lengthSq() > 0 ? wish : dir);
    this.yaw = Math.atan2(faceDir.x, faceDir.z);

    // ---- shooting ----
    if (los && player.alive && dist < this.weapon.range && this.fireTimer <= 0) {
      const aligned = (dir.x * Math.sin(this.yaw) + dir.z * Math.cos(this.yaw));
      if (aligned > 0.6) this._shoot(player, dist);
    }

    // present
    this.center.copy(this.pos); this.center.y += 1.1;
    this.fighter.root.position.copy(this.pos);
    this.fighter.root.rotation.y = this.yaw;
    const spd = Math.min(1, Math.hypot(this.vel.x, this.vel.z) / SPEED);
    animateFighter(this.fighter, dt, { speed: spd, mode: this.grounded ? (spd > 0.1 ? 'run' : 'idle') : 'air', aim: los ? 1 : 0.3 });
    // hit flash tint
    const e = this.fighter.torso.material;
    if (this.hitFlash > 0) e.emissive = new THREE.Color(0xff0000).multiplyScalar(this.hitFlash);
    else if (e.emissive) e.emissive.setRGB(0, 0, 0);
  }

  _shoot(player, dist) {
    const w = this.weapon;
    this.fireTimer = w.rate + (Math.random() < 0.2 ? 0.9 : 0); // occasional pause
    const muzzle = this.center.clone().addScaledVector(this.face.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.7);
    muzzle.y = this.center.y;
    // hit probability
    const pHit = Math.max(0.05, Math.min(0.92, this.accuracy * (1 - dist / w.range * 0.55)));
    const hit = Math.random() < pHit;
    let endPoint;
    if (hit) {
      endPoint = player.center.clone();
      player.takeDamage(w.dmg, this.center);
      this.game.effects.blood(player.center.clone(), this.center.clone().sub(player.center).normalize());
    } else {
      endPoint = player.center.clone().add(new THREE.Vector3((Math.random() * 2 - 1) * 2, (Math.random() * 2 - 1) * 2, (Math.random() * 2 - 1) * 2));
      const wHit = this.game.world.raycast(muzzle, endPoint.clone().sub(muzzle).normalize(), dist + 4);
      if (wHit) { endPoint = wHit.point; this.game.effects.impactWall(wHit.point, wHit.normal); }
    }
    this.game.effects.tracer(muzzle, endPoint, 0xff9b6b);
    this.game.effects.muzzle(muzzle, this.face, 0xffb070);
    this.game.audio.shot('mg');
  }

  _move(dt, wish) {
    const onGround = this.grounded;
    if (onGround) {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0) { const k = Math.max(0, sp - sp * FRICTION * dt) / sp; this.vel.x *= k; this.vel.z *= k; }
      if (wish.lengthSq() > 0) {
        const cur = this.vel.x * wish.x + this.vel.z * wish.z;
        const add = Math.min(SPEED - cur, ACCEL * dt);
        if (add > 0) { this.vel.x += wish.x * add; this.vel.z += wish.z * add; }
      }
    } else if (wish.lengthSq() > 0) {
      const proj = this.vel.x * wish.x + this.vel.z * wish.z;
      let add = 18 * dt; if (proj + add > SPEED) add = Math.max(0, SPEED - proj);
      this.vel.x += wish.x * add; this.vel.z += wish.z * add;
    }
    this.vel.y -= GRAV * dt; if (this.vel.y < -40) this.vel.y = -40;

    const world = this.game.world;
    const disp = Math.hypot(this.vel.x, this.vel.y, this.vel.z) * dt;
    const steps = Math.min(5, Math.max(1, Math.ceil(disp / 0.35)));
    const h = dt / steps;
    this.grounded = false;
    for (let s = 0; s < steps; s++) {
      this.pos.addScaledVector(this.vel, h);
      const feetY = this.pos.y, headY = this.pos.y + H;
      const contacts = world.resolveHorizontal(this.pos, R, feetY, headY);
      for (const n of contacts) {
        const into = this.vel.x * n.x + this.vel.z * n.z;
        if (into < 0) { this.vel.x -= n.x * into; this.vel.z -= n.z * into; }
      }
      const g = world.groundHeight(this.pos.x, this.pos.z, R, this.pos.y, 0.55);
      if (this.vel.y <= 0 && g > -Infinity && this.pos.y <= g + 0.12) { this.pos.y = g; this.vel.y = 0; this.grounded = true; }
      const c = world.ceilingHeight(this.pos.x, this.pos.z, R, this.pos.y + H);
      if (c < Infinity && this.pos.y + H > c) { this.pos.y = c - H; if (this.vel.y > 0) this.vel.y = 0; }
      const cm = world.clampToArena(this.pos, R);
      if (cm & 1) this.vel.x = 0;
      if (cm & 2) this.vel.z = 0;
    }
  }

  takeDamage(amount) {
    if (!this.alive) return { killed: false };
    this.hp -= amount; this.hitFlash = 1;
    if (this.hp <= 0) { this._die(); return { killed: true }; }
    return { killed: false };
  }

  _die() {
    this.alive = false; this.respawnTimer = 2.0 + Math.random();
    this.game.audio.die();
    this.game.effects.blood(this.center, new THREE.Vector3(0, 1, 0));
    this.game.effects.burst(this.center, 0xff3b5c, 18, 8, { life: 0.5, size: 0.2, grav: -10 });
  }
}

export class BotManager {
  constructor(game, count = 3, accuracy = 0.5) {
    this.game = game; this.bots = []; this.time = 0;
    this.enemyScore = 0; this.accuracy = accuracy;
    for (let i = 0; i < count; i++) this.bots.push(new Bot(game, this, 'BOT-' + (i + 1)));
  }

  start() {
    this.enemyScore = 0;
    this.bots.forEach((b, i) => {
      const p = this.game.world.randomSpawn(this.game.player.center, 12);
      b.spawn(p, this.accuracy);
      b.respawnTimer = 0.5 + i * 0.3;
    });
  }

  update(dt) { this.time += dt; for (const b of this.bots) b.update(dt); }

  // nearest alive bot hit by a ray (sphere test)
  raycast(origin, dir, maxDist) {
    let best = null, bestD = maxDist;
    for (const b of this.bots) {
      if (!b.alive) continue;
      const m = this._tmpSub(origin, b.center);     // origin - center
      const bproj = m.dot(dir);
      const c = m.lengthSq() - b.sphereR * b.sphereR;
      const disc = bproj * bproj - c;
      if (disc < 0) continue;
      const t = -bproj - Math.sqrt(disc);
      if (t > 0 && t < bestD) { bestD = t; best = { bot: b, dist: t, point: origin.clone().addScaledVector(dir, t) }; }
    }
    return best;
  }
  _tmpSub(a, b) { return new THREE.Vector3(a.x - b.x, a.y - b.y, a.z - b.z); }

  meleeHits(origin, forward, range, cosArc) {
    const out = [];
    for (const b of this.bots) {
      if (!b.alive) continue;
      const v = new THREE.Vector3(b.center.x - origin.x, 0, b.center.z - origin.z);
      const d = v.length();
      if (d > range + b.sphereR) continue;
      v.normalize();
      if (v.x * forward.x + v.z * forward.z >= cosArc) out.push(b);
    }
    return out;
  }

  nearestWithin(pos, radius) {
    let best = null, bd = radius;
    for (const b of this.bots) { if (!b.alive) continue; const d = b.center.distanceTo(pos); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  damage(bot, amount, fromPos) { return bot.takeDamage(amount); }

  aoe(pos, radius, maxDmg, fromPlayer) {
    const killed = [];
    for (const b of this.bots) {
      if (!b.alive) continue;
      const d = b.center.distanceTo(pos);
      if (d < radius) {
        const r = b.takeDamage(maxDmg * (1 - d / radius));
        if (r.killed) killed.push(b);
      }
    }
    if (fromPlayer) for (const b of killed) this.game.player.creditFrag(b, '🚀');
    return killed;
  }

  creditPlayerDeath(fromPos) {
    let killer = null, bd = Infinity;
    for (const b of this.bots) { if (!b.alive) continue; const d = fromPos ? b.center.distanceTo(fromPos) : 0; if (d < bd) { bd = d; killer = b; } }
    this.enemyScore++;
    this.game.hud.killfeed(killer ? killer.name : 'BOT', 'VOUS', '🔩', true);
  }

  aliveCount() { return this.bots.filter(b => b.alive).length; }
}
