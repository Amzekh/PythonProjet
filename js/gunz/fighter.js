// fighter.js — stylized humanoid built from primitives, with animatable limb pivots.
import * as THREE from 'three';

function limb(len, w, d, mat) {
  // pivot at the top; mesh hangs downward so rotating the pivot swings the limb
  const pivot = new THREE.Object3D();
  const geo = new THREE.BoxGeometry(w, len, d);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  pivot.add(mesh);
  pivot.userData.len = len;
  return pivot;
}

export function buildFighter(opts = {}) {
  const primary = new THREE.Color(opts.primary || 0x3aa0ff);
  const dark = primary.clone().multiplyScalar(0.5);
  const accent = new THREE.Color(opts.accent || 0x7ff0ff);

  const matBody = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.4 });
  const matLimb = new THREE.MeshStandardMaterial({ color: primary, roughness: 0.55, metalness: 0.35 });
  const matHead = new THREE.MeshStandardMaterial({ color: 0x11161f, roughness: 0.3, metalness: 0.6 });
  const matGlow = new THREE.MeshBasicMaterial({ color: accent });

  const root = new THREE.Group();      // origin at feet (y=0)

  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), matBody);
  torso.position.y = 1.18; torso.castShadow = true;
  root.add(torso);
  // chest emblem
  const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), matGlow);
  emblem.position.set(0, 1.25, 0.18); root.add(emblem);

  // pelvis
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.32), matBody);
  pelvis.position.y = 0.82; pelvis.castShadow = true; root.add(pelvis);

  // head + visor
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), matBody);
  neck.position.y = 1.62; root.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), matHead);
  head.position.y = 1.84; head.castShadow = true; root.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.04), matGlow);
  visor.position.set(0, 1.86, 0.18); root.add(visor);

  // shoulders / arms
  const larm = limb(0.62, 0.17, 0.17, matLimb); larm.position.set(0.39, 1.5, 0); root.add(larm);
  const rarm = limb(0.62, 0.17, 0.17, matLimb); rarm.position.set(-0.39, 1.5, 0); root.add(rarm);

  // hips / legs
  const lleg = limb(0.86, 0.2, 0.22, matLimb); lleg.position.set(0.17, 0.82, 0); root.add(lleg);
  const rleg = limb(0.86, 0.2, 0.22, matLimb); rleg.position.set(-0.17, 0.82, 0); root.add(rleg);

  // sword mount at the right hand (swings with the arm)
  const weaponMount = new THREE.Object3D();
  weaponMount.position.set(0, -0.62, 0.06);
  rarm.add(weaponMount);

  // gun mount on the body (held forward, decoupled from arm swing)
  const gunMount = new THREE.Object3D();
  gunMount.position.set(0.26, 1.22, 0.18);
  root.add(gunMount);

  // rest pose: arms slightly down
  larm.rotation.x = 0.15; rarm.rotation.x = 0.15;

  return { root, torso, pelvis, head, larm, rarm, lleg, rleg, weaponMount, gunMount, _t: 0 };
}

// Procedural animation. mode: 'idle'|'run'|'air'|'slash'|'dash'|'dead'
export function animateFighter(f, dt, p = {}) {
  f._t += dt;
  const t = f._t;
  const speed = p.speed || 0;       // 0..1 of max
  const mode = p.mode || 'idle';
  const aim = p.aim || 0;           // 0..1 how much arms point forward (aiming)
  const slash = p.slash != null ? p.slash : 0; // 0..1 slash progress (1->0)

  if (mode === 'dead') {
    f.root.rotation.x = Math.min(f.root.rotation.x + dt * 4, Math.PI / 2 * 0.9);
    return;
  }
  f.root.rotation.x += (0 - f.root.rotation.x) * Math.min(1, dt * 10);

  // legs
  const stride = speed > 0.05 ? Math.sin(t * 10 * (0.6 + speed)) : Math.sin(t * 2) * 0.06;
  const amp = 0.1 + speed * 0.85;
  if (mode === 'air') {
    f.lleg.rotation.x += (-0.5 - f.lleg.rotation.x) * Math.min(1, dt * 10);
    f.rleg.rotation.x += (0.35 - f.rleg.rotation.x) * Math.min(1, dt * 10);
  } else {
    f.lleg.rotation.x += (stride * amp - f.lleg.rotation.x) * Math.min(1, dt * 16);
    f.rleg.rotation.x += (-stride * amp - f.rleg.rotation.x) * Math.min(1, dt * 16);
  }

  // body bob
  const bob = speed > 0.05 ? Math.abs(Math.sin(t * 10 * (0.6 + speed))) * 0.05 : Math.sin(t * 2) * 0.02;
  f.torso.position.y = 1.18 + bob;
  f.head.position.y = 1.84 + bob;

  // arms
  let rTarget, lTarget;
  if (slash > 0.01) {
    // big overhead slash arc on the right arm
    const a = 1 - slash; // 0->1 through the swing
    rTarget = -2.4 + a * 3.6;
    lTarget = -0.6;
    f.rarm.rotation.z = -0.3 + a * 0.4;
  } else {
    f.rarm.rotation.z += (0 - f.rarm.rotation.z) * Math.min(1, dt * 10);
    const armSwing = -stride * amp * 0.8;
    const aimPose = -1.35;            // arms forward when aiming
    rTarget = aim * aimPose + (1 - aim) * (0.15 + armSwing);
    lTarget = aim * (aimPose * 0.7) + (1 - aim) * (0.15 - armSwing);
    if (mode === 'air') { rTarget = aim * aimPose + (1 - aim) * (-0.5); lTarget = -0.5; }
  }
  f.rarm.rotation.x += (rTarget - f.rarm.rotation.x) * Math.min(1, dt * 18);
  f.larm.rotation.x += (lTarget - f.larm.rotation.x) * Math.min(1, dt * 14);
}
