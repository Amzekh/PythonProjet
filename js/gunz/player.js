// player.js — third-person controller: K-style movement, camera, combat.
import * as THREE from 'three';
import { buildFighter, animateFighter } from './fighter.js';
import { WEAPONS, buildWeaponMesh, spreadDir, muzzleOffset } from './weapons.js';

const H = 1.85, R = 0.42;
const MOVE = 11.5, GACCEL = 95, AIRACCEL = 60, FRICTION = 11;
const JUMP = 11.8, GRAV = 27, MAXFALL = 42;
const DASH = 30, DASH_CD = 0.62, DASH_TIME = 0.16;
const WALLRUN_GRAV = 0.3, WALL_PUSH = 9.5, WALL_CLIMB = 11, WALL_TIME = 0.0;

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.center = new THREE.Vector3();
    this.radius = 0.6;
    this.yaw = 0; this.pitch = 0.05;
    this.lookDir = new THREE.Vector3(0, 0, 1);
    this.fwd = new THREE.Vector3(0, 0, 1);
    this.right = new THREE.Vector3(1, 0, 0);

    this.grounded = false; this.wallrunning = false;
    this.usedDouble = false;
    this.wallNormal = new THREE.Vector3();
    this.wallCoyote = 0; this.wallCd = 0; this.announcedWall = false;
    this.dashCd = 0; this.dashTime = 0;

    this.maxHp = 100; this.maxAp = 60;
    this.hp = 100; this.ap = 60;
    this.alive = true; this.respawn = 0; this.invuln = 0;
    this.frags = 0; this.deaths = 0; this.shotsFired = 0; this.shotsHit = 0;

    this.weaponIndex = 0;
    this.ammo = WEAPONS.map(w => w.mag);
    this.fireTimer = 0; this.reloadTimer = 0; this.reloading = false;
    this.slashTimer = 0; this.slashCd = 0; this.didSlashHit = false;
    this.blocking = false;

    // model + weapon meshes
    this.fighter = buildFighter({ primary: 0x2f7fff, accent: 0x7ff0ff });
    game.scene.add(this.fighter.root);
    this.wmeshes = WEAPONS.map(w => buildWeaponMesh(w.id));
    this.curMesh = null;
    this._equipMesh(0);

    this.camDist = 5.2;
    this._tmp = new THREE.Vector3(); this._tmp2 = new THREE.Vector3();
  }

  get weapon() { return WEAPONS[this.weaponIndex]; }

  spawnAt(p) {
    this.pos.copy(p); this.vel.set(0, 0, 0);
    this.hp = this.maxHp; this.ap = this.maxAp;
    this.alive = true; this.respawn = 0; this.invuln = 1.0;
    this.grounded = false; this.wallrunning = false; this.usedDouble = false;
    this.ammo = WEAPONS.map(w => w.mag);
    this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0;
    this.fighter.root.rotation.set(0, this.yaw, 0);
    this.fighter.root.visible = true;
    this.game.audio.spawn();
    this.game.hud.setLowHp(false);
  }

  _equipMesh(i) {
    if (this.curMesh && this.curMesh.parent) this.curMesh.parent.remove(this.curMesh);
    const mesh = this.wmeshes[i];
    const w = WEAPONS[i];
    if (w.type === 'melee') this.fighter.weaponMount.add(mesh);
    else this.fighter.gunMount.add(mesh);
    this.curMesh = mesh;
  }

  switchTo(i) {
    if (i < 0 || i >= WEAPONS.length || i === this.weaponIndex) return;
    this.weaponIndex = i; this._equipMesh(i);
    this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0.05;
    this.game.audio.ui();
    this._hudWeapon();
  }

  // ---------------- update ----------------
  update(dt) {
    const { input } = this.game;
    this._aim(dt, input);

    if (!this.alive) { this._dead(dt); return; }

    // timers
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.wallCd = Math.max(0, this.wallCd - dt);
    this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    this.dashTime = Math.max(0, this.dashTime - dt);
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.slashCd = Math.max(0, this.slashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.slashTimer > 0) this.slashTimer = Math.max(0, this.slashTimer - dt);

    // movement
    const wish = this._wishDir(input);
    this._handleDash(input, wish);
    this._accelerate(dt, wish);
    this._handleJump(input);
    this._gravity(dt);
    this._integrate(dt);

    if (this.grounded) { this.usedDouble = false; }

    // combat
    this._combat(dt, input);
    this._reload(dt, input);

    // present
    this.center.copy(this.pos); this.center.y += 1.1;
    this.fighter.root.position.copy(this.pos);
    this.fighter.root.rotation.y = this.yaw;
    this._animate(dt);
    this._camera(dt);
    this._hud();
  }

  _aim(dt, input) {
    if (input.locked) {
      this.yaw += input.mouse.dx * input.sensitivity;
      this.pitch -= input.mouse.dy * input.sensitivity;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
    }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.lookDir.set(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp).normalize();
    this.fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  _wishDir(input) {
    const f = (input.down('KeyW') || input.down('KeyZ') || input.down('ArrowUp') ? 1 : 0)
            - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    const s = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0)
            - (input.down('KeyA') || input.down('KeyQ') || input.down('ArrowLeft') ? 1 : 0);
    const d = this._tmp.set(0, 0, 0);
    d.addScaledVector(this.fwd, f).addScaledVector(this.right, s);
    if (d.lengthSq() > 0) d.normalize();
    return d.clone();
  }

  _handleDash(input, wish) {
    const want = input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')
      || ['KeyW', 'KeyZ', 'KeyS', 'KeyA', 'KeyQ', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(input.doubleTap);
    if (!want || this.dashCd > 0) return;
    const dir = wish.lengthSq() > 0 ? wish.clone() : this.fwd.clone();
    this.vel.x = dir.x * DASH; this.vel.z = dir.z * DASH;
    if (this.grounded) this.vel.y = Math.max(this.vel.y, 2.5);
    this.dashCd = DASH_CD; this.dashTime = DASH_TIME;
    this.slashTimer = 0; // dash cancels slash (K-style)
    this.game.audio.dash();
    this.game.effects.burst(this.center, 0x9be7ff, 8, 5, { dir: dir.clone().negate(), dirBias: 1.5, life: 0.25, size: 0.18 });
  }

  _accelerate(dt, wish) {
    const onGround = this.grounded && this.dashTime <= 0;
    if (onGround) {
      // friction
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0) {
        const drop = sp * FRICTION * dt;
        const k = Math.max(0, sp - drop) / sp;
        this.vel.x *= k; this.vel.z *= k;
      }
      // accel toward wish
      if (wish.lengthSq() > 0) {
        const cur = this.vel.x * wish.x + this.vel.z * wish.z;
        const add = Math.min(MOVE - cur, GACCEL * dt);
        if (add > 0) { this.vel.x += wish.x * add; this.vel.z += wish.z * add; }
      }
    } else if (this.dashTime <= 0 && wish.lengthSq() > 0) {
      // air control that preserves momentum (dash/jump carry)
      const proj = this.vel.x * wish.x + this.vel.z * wish.z;
      let add = AIRACCEL * dt;
      if (proj + add > MOVE) add = Math.max(0, MOVE - proj);
      this.vel.x += wish.x * add; this.vel.z += wish.z * add;
    }
  }

  _handleJump(input) {
    if (!input.justPressed('Space')) return;
    if (this.grounded) {
      this.vel.y = JUMP; this.grounded = false; this.usedDouble = false;
      this.game.audio.jump();
    } else if (this.wallrunning || this.wallCoyote > 0) {
      // wall-jump: launch away from the wall
      this.vel.x += this.wallNormal.x * WALL_PUSH;
      this.vel.z += this.wallNormal.z * WALL_PUSH;
      this.vel.x += this.fwd.x * 3; this.vel.z += this.fwd.z * 3;
      this.vel.y = JUMP;
      this.wallrunning = false; this.wallCoyote = 0; this.wallCd = 0.18; this.usedDouble = false;
      this.game.audio.wall(); this.game.audio.jump();
      this.game.hud.announce('WALL JUMP', true);
    } else if (!this.usedDouble) {
      this.vel.y = JUMP * 0.92; this.usedDouble = true;
      this.vel.x += this.fwd.x * 1.5; this.vel.z += this.fwd.z * 1.5;
      this.game.audio.dbljump();
      this.game.effects.burst(this.pos.clone().setY(this.pos.y + 0.2), 0x7ff0ff, 10, 4, { life: 0.3, size: 0.16, grav: -6 });
    }
  }

  _gravity(dt) {
    const g = this.wallrunning ? GRAV * WALLRUN_GRAV : GRAV;
    this.vel.y -= g * dt;
    if (this.vel.y < -MAXFALL) this.vel.y = -MAXFALL;
  }

  _integrate(dt) {
    const world = this.game.world;
    const disp = Math.hypot(this.vel.x, this.vel.y, this.vel.z) * dt;
    const steps = Math.min(6, Math.max(1, Math.ceil(disp / 0.35)));
    const h = dt / steps;
    let wallHit = null, wasGrounded = this.grounded;
    this.grounded = false;

    for (let s = 0; s < steps; s++) {
      this.pos.addScaledVector(this.vel, h);
      const feetY = this.pos.y, headY = this.pos.y + H;
      // horizontal walls
      const contacts = world.resolveHorizontal(this.pos, R, feetY, headY);
      for (const n of contacts) {
        if (Math.abs(n.x) < 1e-3 && Math.abs(n.z) < 1e-3) continue;
        const into = this.vel.x * n.x + this.vel.z * n.z;
        if (into < 0) { this.vel.x -= n.x * into; this.vel.z -= n.z * into; }
        wallHit = n;
      }
      // ground
      const g = world.groundHeight(this.pos.x, this.pos.z, R, this.pos.y, 0.55);
      if (this.vel.y <= 0 && g > -Infinity && this.pos.y <= g + 0.12) {
        this.pos.y = g; this.vel.y = 0; this.grounded = true;
      }
      // ceiling
      const c = world.ceilingHeight(this.pos.x, this.pos.z, R, this.pos.y + H);
      if (c < Infinity && this.pos.y + H > c) { this.pos.y = c - H; if (this.vel.y > 0) this.vel.y = 0; }
      // hard arena clamp (safety net against clipping over walls)
      const cm = world.clampToArena(this.pos, R);
      if (cm & 1) this.vel.x = 0;
      if (cm & 2) this.vel.z = 0;
    }

    // wall-run logic
    this.wallrunning = false;
    if (!this.grounded && wallHit && this.wallCd <= 0) {
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > 3.5) {
        this.wallNormal.set(wallHit.x, 0, wallHit.z).normalize();
        this.wallrunning = true; this.wallCoyote = 0.12;
        // climb assist when pushing toward the wall
        if (this.vel.y < 4 && this.pos.y < 10) this.vel.y += WALL_CLIMB * (1 / 60);
        if (this.vel.y < -3) this.vel.y = -3;
        if (!this.announcedWall) { this.game.hud.announce('WALL RUN', true); this.announcedWall = true; }
        if (Math.random() < 0.3) this.game.effects.burst(this.center, 0xbcd0ff, 2, 3, { life: 0.2, size: 0.12 });
      }
    }
    if (this.grounded) this.announcedWall = false;

    if (!wasGrounded && this.grounded && this.vel.y === 0) {
      // landing dust
      this.game.effects.burst(this.pos.clone().setY(this.pos.y + 0.1), 0x9fb6d8, 6, 3, { life: 0.25, size: 0.14, grav: -6 });
    }
  }

  // ---------------- combat ----------------
  _combat(dt, input) {
    const w = this.weapon;
    this.blocking = (input.mouse.right && w.type === 'melee');

    if (w.type === 'melee') {
      if ((input.mouse.leftPressed) && this.slashCd <= 0) this._startSlash();
      if (this.slashTimer > 0) this._slashHitCheck();
    } else if (w.type === 'projectile') {
      if (input.mouse.leftPressed && this.fireTimer <= 0) this._fireRocket();
    } else {
      const trigger = w.auto ? input.mouse.left : input.mouse.leftPressed;
      if (trigger && this.fireTimer <= 0) this._fireHitscan();
    }

    // weapon switching
    for (let i = 0; i < 5; i++) if (input.justPressed('Digit' + (i + 1))) this.switchTo(i);
    if (input.mouse.wheel) {
      let i = (this.weaponIndex + (input.mouse.wheel > 0 ? 1 : -1) + WEAPONS.length) % WEAPONS.length;
      this.switchTo(i);
    }
  }

  _startSlash() {
    this.slashTimer = 0.36; this.slashCd = 0.40; this.didSlashHit = false;
    this.dashTime = 0; // slash cancels dash momentum slightly? keep dash; just mark
    this.game.audio.swing();
  }

  _slashHitCheck() {
    // hit happens in the middle of the swing
    if (this.didSlashHit || this.slashTimer > 0.22 || this.slashTimer < 0.1) return;
    this.didSlashHit = true;
    const w = this.weapon;
    const hits = this.game.bots.meleeHits(this.center, this.fwd, w.range, w.arcCos);
    if (hits.length) {
      this.game.audio.swordHit();
      this.game.effects.addShake(0.25);
      this.game.hud.hitmarker();
      for (const b of hits) {
        const p = b.center.clone();
        this.game.effects.blood(p, this.fwd.clone());
        this.game.effects.number(p, w.dmg);
        const r = this.game.bots.damage(b, w.dmg, this.center);
        if (r.killed) this._onFrag(b, w);
      }
    }
    // sword energy slash arc
    this.game.effects.burst(this.center.clone().addScaledVector(this.fwd, 1.6), 0x7ff0ff, 10, 8,
      { dir: this.fwd.clone(), dirBias: 2, life: 0.18, size: 0.22 });
  }

  _muzzlePos() {
    const off = muzzleOffset(this.weapon.id);
    return this.center.clone().addScaledVector(this.lookDir, 0.6).addScaledVector(this.right, 0.25).addScaledVector(this.lookDir, off - 0.3);
  }

  _fireHitscan() {
    const w = this.weapon;
    if (this.ammo[this.weaponIndex] <= 0) { this._beginReload(); return; }
    this.ammo[this.weaponIndex]--;
    this.fireTimer = w.rate;
    this.shotsFired++;
    const origin = this.center, muzzle = this._muzzlePos();
    let hitAny = false;
    const dir = new THREE.Vector3();
    for (let p = 0; p < (w.pellets || 1); p++) {
      spreadDir(this.lookDir, w.spread, dir);
      const wHit = this.game.world.raycast(origin, dir, w.range);
      const bHit = this.game.bots.raycast(origin, dir, w.range);
      if (bHit && (!wHit || bHit.dist < wHit.dist)) {
        hitAny = true;
        this.game.effects.tracer(muzzle, bHit.point, w.color);
        this.game.effects.blood(bHit.point, dir.clone());
        const r = this.game.bots.damage(bHit.bot, w.dmg, origin);
        this.game.effects.number(bHit.point, w.dmg);
        if (r.killed) this._onFrag(bHit.bot, w);
      } else if (wHit) {
        this.game.effects.tracer(muzzle, wHit.point, w.color);
        this.game.effects.impactWall(wHit.point, wHit.normal);
      } else {
        this.game.effects.tracer(muzzle, origin.clone().addScaledVector(dir, w.range), w.color);
      }
    }
    this.game.effects.muzzle(muzzle, this.lookDir, w.color);
    this.game.audio.shot(w.sfx);
    this.game.effects.addShake(w.shake);
    this.pitch = Math.min(1.2, this.pitch + (w.recoil || 0));
    if (hitAny) { this.shotsHit++; this.game.hud.hitmarker(); }
    if (this.ammo[this.weaponIndex] <= 0) this._beginReload();
    this._hudWeapon();
  }

  _fireRocket() {
    const w = this.weapon;
    if (this.ammo[this.weaponIndex] <= 0) { this._beginReload(); return; }
    this.ammo[this.weaponIndex]--;
    this.fireTimer = w.rate;
    this.shotsFired++;
    const muzzle = this._muzzlePos();
    this.game.projectiles.spawn(muzzle, this.lookDir.clone(), 'player', w);
    this.game.audio.shot('rocket');
    this.game.effects.muzzle(muzzle, this.lookDir, 0xffaa55);
    this.game.effects.addShake(w.shake);
    if (this.ammo[this.weaponIndex] <= 0) this._beginReload();
    this._hudWeapon();
  }

  _reload(dt, input) {
    if (input.justPressed('KeyR')) this._beginReload();
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo[this.weaponIndex] = this.weapon.mag;
        this._hudWeapon();
      }
    }
  }

  _beginReload() {
    const w = this.weapon;
    if (w.type === 'melee' || this.reloading || this.ammo[this.weaponIndex] >= w.mag) return;
    this.reloading = true; this.reloadTimer = w.reload;
    this.game.audio.reload();
  }

  _onFrag(bot, w) { this.creditFrag(bot, w.icon); }

  creditFrag(bot, icon) {
    this.frags++;
    this.game.audio.frag();
    this.game.hud.killfeed('VOUS', bot.name, icon, false);
    this.game.hud.setScore(this.frags, this.game.bots.enemyScore);
    this.game.onFrag && this.game.onFrag('player');
  }

  takeDamage(amount, fromPos) {
    if (!this.alive || this.invuln > 0) return;
    let dmg = amount;
    if (fromPos) {
      const d = this._tmp2.copy(fromPos).sub(this.center); d.y = 0; d.normalize();
      const facing = this.fwd.dot(d); // 1 = attacker in front
      if (this.blocking && facing > 0.3) { dmg *= 0.25; this.game.audio.block(); }
    }
    if (this.ap > 0) {
      const absorb = Math.min(this.ap, dmg * 0.6);
      this.ap -= absorb; dmg -= absorb;
    }
    this.hp -= dmg;
    this.game.hud.damage();
    this.game.effects.addShake(0.3);
    this.game.audio.hurt();
    if (this.hp <= 0) { this.hp = 0; this._die(fromPos); }
    else this.game.hud.setLowHp(this.hp < 30);
  }

  _die(fromPos) {
    this.alive = false; this.respawn = 2.6; this.deaths++;
    this.game.audio.die();
    this.game.effects.blood(this.center, new THREE.Vector3(0, 1, 0));
    this.game.effects.addShake(0.6);
    this.game.hud.setLowHp(false);
    this.game.bots.creditPlayerDeath(fromPos);
    this.game.hud.setScore(this.frags, this.game.bots.enemyScore);
  }

  _dead(dt) {
    this.respawn -= dt;
    this._animate(dt, true);
    this.center.copy(this.pos); this.center.y += 0.4;
    this._camera(dt);
    if (this.respawn <= 0) {
      const p = this.game.world.randomSpawn(this.center, 14);
      this.spawnAt(p);
    }
  }

  // ---------------- presentation ----------------
  _animate(dt, dead = false) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const speed = Math.min(1, hs / MOVE);
    let mode = 'idle';
    if (dead) mode = 'dead';
    else if (!this.grounded) mode = 'air';
    else if (speed > 0.08) mode = 'run';
    const aim = this.weapon.type === 'melee' ? 0 : 1;
    const slash = this.slashTimer > 0 ? this.slashTimer / 0.36 : 0;
    animateFighter(this.fighter, dt, { speed, mode, aim, slash });
  }

  _camera(dt) {
    const cam = this.game.camera;
    const target = this._tmp.copy(this.pos); target.y += 1.5;
    // desired distance with wall pull-in
    let dist = 5.2;
    const back = this._tmp2.copy(this.lookDir).negate();
    const hit = this.game.world.raycast(target, back, dist + 0.5);
    if (hit) dist = Math.max(1.6, hit.dist - 0.35);
    this.camDist += (dist - this.camDist) * Math.min(1, dt * 14);
    cam.position.copy(target).addScaledVector(this.lookDir, -this.camDist);
    cam.position.add(this.game.effects.shakeOffset());
    cam.lookAt(target);
  }

  _hud() {
    const hud = this.game.hud;
    hud.setHealth(this.hp, this.maxHp, this.ap, this.maxAp);
    hud.setAbility(1 - this.dashCd / DASH_CD, !this.usedDouble || this.grounded);
    let st = 'AU SOL';
    if (this.dashTime > 0) st = 'DASH';
    else if (this.wallrunning) st = 'WALL-RUN';
    else if (!this.grounded) st = this.vel.y > 0 ? 'SAUT' : 'CHUTE';
    hud.setState(st);
    hud.setReloading(this.reloading);
  }

  _hudWeapon() {
    const w = this.weapon;
    const cur = w.mag === Infinity ? '∞' : this.ammo[this.weaponIndex];
    const max = w.mag === Infinity ? '∞' : w.mag;
    this.game.hud.setWeapon(w.name, this.weaponIndex, cur, max, this.ammo);
  }

  accuracy() { return this.shotsFired ? Math.round(this.shotsHit / this.shotsFired * 100) : 0; }
}
