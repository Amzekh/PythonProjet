// fighter.js — articulated procedural humanoid (2-bone limbs) + animation.
import * as THREE from 'three';

const damp = (obj, axis, target, dt, rate) => { obj[axis] += (target - obj[axis]) * Math.min(1, dt * rate); };

function segment(parent, x, y, z, len, w, d, mat, taper = 1) {
  const pivot = new THREE.Object3D();
  pivot.position.set(x, y, z);
  const geo = new THREE.BoxGeometry(w, len, d);
  geo.translate(0, -len / 2, 0);
  if (taper !== 1) { // scale the bottom face inward for a tapered look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -len * 0.49) { pos.setX(i, pos.getX(i) * taper); pos.setZ(i, pos.getZ(i) * taper); }
    }
    pos.needsUpdate = true;
  }
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  return pivot;
}
function box(parent, x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

export function buildFighter(opts = {}) {
  const primary = new THREE.Color(opts.primary || 0x3aa0ff);
  const accentC = new THREE.Color(opts.accent || 0x7ff0ff);
  const suitC = primary.clone().multiplyScalar(0.32);
  const plateC = primary.clone().multiplyScalar(0.85);

  const matSuit = new THREE.MeshStandardMaterial({ color: suitC, roughness: 0.62, metalness: 0.25 });
  const matPlate = new THREE.MeshStandardMaterial({ color: plateC, roughness: 0.42, metalness: 0.55 });
  const matJoint = new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.5, metalness: 0.6 });
  const matHelm = new THREE.MeshStandardMaterial({ color: 0x0e1119, roughness: 0.3, metalness: 0.7 });
  const matAccent = new THREE.MeshBasicMaterial({ color: accentC });
  const matCoat = new THREE.MeshStandardMaterial({ color: suitC, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide });

  const root = new THREE.Group();

  // ---- pelvis / hips ----
  const hips = new THREE.Object3D(); hips.position.set(0, 0.92, 0); root.add(hips);
  box(hips, 0, 0, 0, 0.5, 0.3, 0.32, matPlate);
  box(hips, 0, -0.02, 0.17, 0.2, 0.16, 0.04, matAccent);           // belt buckle glow

  // ---- coat tails (sway) ----
  const tailL = new THREE.Object3D(); tailL.position.set(0.16, -0.05, -0.02); hips.add(tailL);
  box(tailL, 0, -0.42, 0, 0.26, 0.86, 0.05, matCoat);
  const tailR = new THREE.Object3D(); tailR.position.set(-0.16, -0.05, -0.02); hips.add(tailR);
  box(tailR, 0, -0.42, 0, 0.26, 0.86, 0.05, matCoat);

  // ---- spine / torso ----
  const spine = new THREE.Object3D(); spine.position.set(0, 0.30, 0); hips.add(spine);
  const torso = box(spine, 0, 0.12, 0, 0.6, 0.56, 0.32, matSuit);
  box(spine, 0, 0.16, 0.17, 0.34, 0.42, 0.02, matPlate);          // chest plate
  box(spine, 0, 0.2, 0.19, 0.12, 0.12, 0.02, matAccent);          // core light
  box(spine, 0.18, 0.1, 0.16, 0.1, 0.3, 0.02, matAccent);        // rib trim L
  box(spine, -0.18, 0.1, 0.16, 0.1, 0.3, 0.02, matAccent);       // rib trim R

  // ---- head ----
  const head = new THREE.Object3D(); head.position.set(0, 0.5, 0); spine.add(head);
  box(head, 0, 0.12, 0, 0.34, 0.36, 0.34, matHelm);              // helmet
  box(head, 0, 0.12, 0.16, 0.3, 0.1, 0.06, matAccent);          // visor band
  box(head, 0, 0.34, -0.02, 0.06, 0.12, 0.22, matPlate);        // crest fin
  box(head, 0, -0.04, 0, 0.16, 0.1, 0.16, matJoint);            // neck

  // ---- shoulders + arms (upper + forearm + hand) ----
  function arm(side) {
    const sh = new THREE.Object3D(); sh.position.set(0.36 * side, 0.30, 0); spine.add(sh);
    box(sh, 0.04 * side, 0.04, 0, 0.22, 0.2, 0.26, matPlate);     // shoulder pad
    segment(sh, 0, -0.02, 0, 0.4, 0.16, 0.16, matSuit, 0.85);     // upper arm
    const el = new THREE.Object3D(); el.position.set(0, -0.42, 0); sh.add(el);
    segment(el, 0, 0, 0, 0.38, 0.14, 0.14, matPlate, 0.8);        // forearm
    const hand = box(el, 0, -0.44, 0.02, 0.13, 0.16, 0.15, matJoint);
    return { sh, el, hand };
  }
  const L = arm(1), R = arm(-1);

  // weapon mount in the right hand (sword) + body mount (guns)
  const weaponMount = new THREE.Object3D(); weaponMount.position.set(0, -0.5, 0.04); R.el.add(weaponMount);
  const gunMount = new THREE.Object3D(); gunMount.position.set(0.24, 1.24, 0.2); root.add(gunMount);

  // ---- legs (thigh + shin + foot) ----
  function leg(side) {
    const hip = new THREE.Object3D(); hip.position.set(0.16 * side, -0.02, 0); hips.add(hip);
    segment(hip, 0, 0, 0, 0.48, 0.2, 0.22, matSuit, 0.8);         // thigh
    const kn = new THREE.Object3D(); kn.position.set(0, -0.48, 0); hip.add(kn);
    segment(kn, 0, 0, 0, 0.44, 0.17, 0.18, matPlate, 0.85);       // shin
    box(kn, 0, -0.5, 0.06, 0.18, 0.13, 0.34, matJoint);           // boot
    box(kn, 0, -0.46, 0.22, 0.14, 0.08, 0.06, matAccent);         // toe glow
    return { hip, kn };
  }
  const LL = leg(1), RL = leg(-1);

  return {
    root, hips, spine, torso, head,
    shL: L.sh, elL: L.el, shR: R.sh, elR: R.el,
    hipL: LL.hip, knL: LL.kn, hipR: RL.hip, knR: RL.kn,
    tailL, tailR, weaponMount, gunMount, _t: Math.random() * 6,
  };
}

// modes: 'idle' | 'run' | 'air' | 'slash' | 'dead'
export function animateFighter(f, dt, p = {}) {
  f._t += dt;
  const t = f._t;
  const speed = p.speed || 0;
  const mode = p.mode || 'idle';
  const aim = p.aim != null ? p.aim : 0;
  const slash = p.slash != null ? p.slash : 0;

  if (mode === 'dead') {
    damp(f.root.rotation, 'x', Math.PI * 0.48, dt, 4);
    damp(f.hipL.rotation, 'x', -1.2, dt, 6); damp(f.hipR.rotation, 'x', -0.8, dt, 6);
    damp(f.knL.rotation, 'x', 1.4, dt, 6); damp(f.knR.rotation, 'x', 1.0, dt, 6);
    return;
  }
  damp(f.root.rotation, 'x', 0, dt, 8);

  const cadence = 9 * (0.6 + speed);
  const ph = t * cadence;
  const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);

  // ---- legs ----
  if (mode === 'air') {
    damp(f.hipL.rotation, 'x', -0.5, dt, 8); damp(f.hipR.rotation, 'x', 0.35, dt, 8);
    damp(f.knL.rotation, 'x', 0.9, dt, 8); damp(f.knR.rotation, 'x', 0.5, dt, 8);
    f.hips.position.y = 0.92;
  } else {
    const amp = 0.15 + speed * 0.85;
    damp(f.hipL.rotation, 'x', sw * amp, dt, 16);
    damp(f.hipR.rotation, 'x', sw2 * amp, dt, 16);
    // knees bend on the back-swing of each leg
    damp(f.knL.rotation, 'x', Math.max(0, -sw) * (0.4 + speed * 0.9) + 0.08, dt, 16);
    damp(f.knR.rotation, 'x', Math.max(0, -sw2) * (0.4 + speed * 0.9) + 0.08, dt, 16);
    f.hips.position.y = 0.92 + (speed > 0.08 ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 2) * 0.012);
  }

  // ---- torso lean + coat ----
  damp(f.spine.rotation, 'x', speed * 0.18 + (mode === 'air' ? 0.1 : 0), dt, 8);
  const tailSwing = (mode === 'air' ? 0.5 : 0.15 + speed * 0.5);
  damp(f.tailL.rotation, 'x', tailSwing + Math.sin(ph * 0.5) * 0.08, dt, 6);
  damp(f.tailR.rotation, 'x', tailSwing + Math.sin(ph * 0.5 + 1) * 0.08, dt, 6);

  // ---- arms ----
  if (slash > 0.01) {
    const a = 1 - slash;                       // 0 -> 1 through the swing
    damp(f.shR.rotation, 'x', -2.5 + a * 3.7, dt, 22);
    damp(f.elR.rotation, 'x', 0.2 + Math.sin(a * Math.PI) * 0.5, dt, 22);
    damp(f.shR.rotation, 'z', -0.35 + a * 0.5, dt, 18);
    damp(f.shL.rotation, 'x', -0.5, dt, 12); damp(f.elL.rotation, 'x', 0.7, dt, 12);
  } else if (aim > 0.5) {
    // two-handed aim stance, both hands brought up front
    damp(f.shR.rotation, 'x', -1.25, dt, 14); damp(f.elR.rotation, 'x', 0.95, dt, 14);
    damp(f.shR.rotation, 'z', -0.18, dt, 12);
    damp(f.shL.rotation, 'x', -1.15, dt, 14); damp(f.elL.rotation, 'x', 1.1, dt, 14);
    damp(f.shL.rotation, 'z', 0.22, dt, 12);
  } else {
    const armAmp = 0.25 + speed * 0.7;
    damp(f.shR.rotation, 'x', sw2 * armAmp, dt, 14); damp(f.shR.rotation, 'z', -0.06, dt, 10);
    damp(f.shL.rotation, 'x', sw * armAmp, dt, 14); damp(f.shL.rotation, 'z', 0.06, dt, 10);
    damp(f.elR.rotation, 'x', 0.25 + Math.max(0, sw2) * 0.4, dt, 12);
    damp(f.elL.rotation, 'x', 0.25 + Math.max(0, sw) * 0.4, dt, 12);
  }
}
