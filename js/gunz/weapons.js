// weapons.js — weapon configs, weapon meshes, projectiles.
import * as THREE from 'three';

export const WEAPONS = [
  { id: 'sword', name: 'ÉPÉE', icon: '⚔️', type: 'melee',
    dmg: 36, rate: 0.40, range: 2.7, arcCos: 0.45, mag: Infinity, reload: 0, color: 0x7ff0ff },
  { id: 'pistol', name: 'PISTOLETS', icon: '🔫', type: 'hitscan',
    dmg: 17, rate: 0.13, auto: true, spread: 0.012, pellets: 1, mag: 24, reload: 1.2,
    range: 130, recoil: 0.006, shake: 0.12, sfx: 'revolver', color: 0x9be7ff },
  { id: 'smg', name: 'SMG', icon: '🔩', type: 'hitscan',
    dmg: 11, rate: 0.066, auto: true, spread: 0.035, pellets: 1, mag: 40, reload: 1.6,
    range: 110, recoil: 0.004, shake: 0.08, sfx: 'mg', color: 0xfff2a8 },
  { id: 'shotgun', name: 'SHOTGUN', icon: '💥', type: 'hitscan',
    dmg: 9, rate: 0.8, auto: false, spread: 0.10, pellets: 9, mag: 8, reload: 2.0,
    range: 42, recoil: 0.02, shake: 0.5, sfx: 'shotgun', color: 0xffd76b },
  { id: 'rocket', name: 'ROQUETTE', icon: '🚀', type: 'projectile',
    dmg: 95, splash: 6, splashDmg: 70, rate: 1.1, auto: false, mag: 4, reload: 2.4,
    speed: 46, range: 160, shake: 0.6, sfx: 'rocket', color: 0xff7a3c },
];

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// jittered direction within a cone of half-angle `spread` (radians)
export function spreadDir(dir, spread, out) {
  out.copy(dir);
  if (spread > 0) {
    out.x += (Math.random() * 2 - 1) * spread;
    out.y += (Math.random() * 2 - 1) * spread;
    out.z += (Math.random() * 2 - 1) * spread;
    out.normalize();
  }
  return out;
}

// ---------- weapon meshes ----------
export function buildWeaponMesh(type) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a3146, roughness: 0.4, metalness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.6, metalness: 0.5 });
  const neon = new THREE.MeshBasicMaterial({ color: 0x7ff0ff });
  const orange = new THREE.MeshBasicMaterial({ color: 0xff8a3c });

  const add = (mat, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };

  if (type === 'sword') {
    // grip at origin, blade extends +Y (held upward in hand)
    add(dark, 0.07, 0.26, 0.07, 0, -0.05, 0);            // handle
    add(steel, 0.26, 0.06, 0.1, 0, 0.1, 0);              // guard
    add(steel, 0.05, 1.25, 0.14, 0, 0.78, 0);            // blade
    add(neon, 0.025, 1.2, 0.02, 0.03, 0.78, 0);          // glowing edge
    add(neon, 0.025, 1.2, 0.02, -0.03, 0.78, 0);
  } else if (type === 'pistol') {
    // barrel along +Z, grip down
    add(steel, 0.1, 0.16, 0.34, 0, 0, 0.05);
    add(dark, 0.08, 0.2, 0.1, 0, -0.16, -0.05);          // grip
    add(neon, 0.03, 0.03, 0.12, 0, 0.04, 0.2);           // sight glow
  } else if (type === 'smg') {
    add(dark, 0.12, 0.18, 0.5, 0, 0, 0.1);
    add(steel, 0.06, 0.06, 0.3, 0, 0.02, 0.32);          // barrel
    add(dark, 0.08, 0.24, 0.1, 0, -0.18, -0.02);         // grip
    add(dark, 0.06, 0.2, 0.1, 0, -0.14, 0.16);           // mag
    add(neon, 0.02, 0.02, 0.2, 0, 0.1, 0.1);
  } else if (type === 'shotgun') {
    add(dark, 0.13, 0.13, 0.66, 0, 0, 0.18);
    add(steel, 0.12, 0.06, 0.4, 0, 0.05, 0.34);          // double barrel top
    add(dark, 0.1, 0.18, 0.14, 0, -0.14, -0.16);         // grip/stock
    add(orange, 0.02, 0.02, 0.16, 0, 0.1, 0.34);
  } else if (type === 'rocket') {
    add(dark, 0.18, 0.18, 0.8, 0, 0, 0.2);               // tube
    add(steel, 0.2, 0.2, 0.14, 0, 0, 0.5);               // muzzle ring
    add(dark, 0.08, 0.2, 0.1, 0, -0.16, 0.02);           // grip
    add(orange, 0.06, 0.06, 0.06, 0, 0.12, 0.0);         // sight
  }
  return g;
}

// muzzle local offset (+Z forward) for each gun, in mount space
export function muzzleOffset(type) {
  switch (type) {
    case 'pistol': return 0.26;
    case 'smg': return 0.5;
    case 'shotgun': return 0.55;
    case 'rocket': return 0.62;
    default: return 0.3;
  }
}

// ---------- projectiles (rockets) ----------
export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.geo = new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8);
    this.geo.rotateX(Math.PI / 2); // align +Z
    this.mat = new THREE.MeshStandardMaterial({ color: 0x3a3f52, metalness: 0.7, roughness: 0.4, emissive: 0xff5a1e, emissiveIntensity: 0.6 });
  }

  spawn(pos, dir, owner, weapon) {
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    this.game.scene.add(mesh);
    this.list.push({
      mesh, dir: dir.clone().normalize(), speed: weapon.speed,
      dmg: weapon.dmg, splash: weapon.splash, splashDmg: weapon.splashDmg,
      owner, life: weapon.range / weapon.speed + 0.5, _trail: 0,
    });
  }

  _explode(r, pos) {
    const g = this.game;
    g.effects.explosion(pos);
    g.audio.explosion();
    if (r.owner === 'player') {
      g.bots.aoe(pos, r.splash, r.splashDmg, true);
      // mild self splash
      const d = g.player.center.distanceTo(pos);
      if (d < r.splash) g.player.takeDamage(r.splashDmg * 0.3 * (1 - d / r.splash), pos);
    } else {
      const d = g.player.center.distanceTo(pos);
      if (d < r.splash) g.player.takeDamage(r.splashDmg * (1 - d / r.splash), pos);
    }
    g.scene.remove(r.mesh);
  }

  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i];
      r.life -= dt;
      const step = r.speed * dt;
      // world collision over the step
      const hit = g.world.raycast(r.mesh.position, r.dir, step + 0.2);
      let exploded = false;
      if (hit) { this._explode(r, hit.point); exploded = true; }

      if (!exploded) {
        r.mesh.position.addScaledVector(r.dir, step);
        // smoke trail
        r._trail += dt;
        if (r._trail > 0.02) { r._trail = 0; g.effects.burst(r.mesh.position, 0xffaa66, 1, 1.5, { life: 0.3, size: 0.18, drag: 0.9 }); }
        // entity collision
        if (r.owner === 'player') {
          const b = g.bots.nearestWithin(r.mesh.position, 1.2);
          if (b) { this._explode(r, r.mesh.position); exploded = true; }
        } else {
          if (g.player.center.distanceTo(r.mesh.position) < 1.2) { this._explode(r, r.mesh.position); exploded = true; }
        }
      }
      if (exploded || r.life <= 0) {
        if (!exploded) g.scene.remove(r.mesh);
        this.list.splice(i, 1);
      }
    }
  }
}
