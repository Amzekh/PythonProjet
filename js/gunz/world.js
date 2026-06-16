// world.js — arena geometry, AABB colliders, lighting, and physics queries.
import * as THREE from 'three';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];          // array of THREE.Box3 (static)
    this.spawns = [];             // array of THREE.Vector3
    this.bounds = 30;             // half-size of arena floor
    this._ray = new THREE.Ray();
    this._build();
  }

  // ---------- builders ----------
  _gridTexture(px = 512, cells = 8, bg = '#0d1322', line = '#27d6ee', glow = 0.5) {
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, px, px);
    const step = px / cells;
    g.strokeStyle = line; g.lineWidth = 2; g.globalAlpha = 0.9;
    g.shadowColor = line; g.shadowBlur = 8 * glow;
    for (let i = 0; i <= cells; i++) {
      const p = Math.round(i * step) + 0.5;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, px); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(px, p); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  _box(cx, cy, cz, sx, sy, sz, mat, { collider = true } = {}) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (collider) {
      const half = new THREE.Vector3(sx / 2, sy / 2, sz / 2);
      const c = new THREE.Vector3(cx, cy, cz);
      this.colliders.push(new THREE.Box3(c.clone().sub(half), c.clone().add(half)));
    }
    return mesh;
  }

  // neon edge strip (decorative, no collider)
  _strip(cx, cy, cz, sx, sy, sz, color) {
    const m = new THREE.MeshBasicMaterial({ color });
    const mesh = this._box(cx, cy, cz, sx, sy, sz, m, { collider: false });
    return mesh;
  }

  _build() {
    const B = this.bounds;

    // materials
    const floorMat = new THREE.MeshStandardMaterial({
      map: this._gridTexture(512, 1, '#0c1020', '#1f6f8c', 0.6),
      roughness: 0.85, metalness: 0.1,
    });
    floorMat.map.repeat.set(15, 15);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x10162a, roughness: 0.7, metalness: 0.25 });
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x161d36, roughness: 0.6, metalness: 0.3 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x24304f, roughness: 0.55, metalness: 0.35 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0e1730, roughness: 0.5, metalness: 0.45 });

    // floor
    this._box(0, -1, 0, B * 2, 2, B * 2, floorMat);

    // boundary walls (tall — great for wall-running)
    const WH = 16, WT = 2;
    this._box(0, WH / 2, -B, B * 2, WH, WT, wallMat);
    this._box(0, WH / 2, B, B * 2, WH, WT, wallMat);
    this._box(-B, WH / 2, 0, WT, WH, B * 2, wallMat);
    this._box(B, WH / 2, 0, WT, WH, B * 2, wallMat);
    // neon trims along top of walls
    this._strip(0, WH, -B + 0.05, B * 2, 0.3, 0.3, 0x22d3ee);
    this._strip(0, WH, B - 0.05, B * 2, 0.3, 0.3, 0xf43f5e);
    this._strip(-B + 0.05, WH, 0, 0.3, 0.3, B * 2, 0xfbbf24);
    this._strip(B - 0.05, WH, 0, 0.3, 0.3, B * 2, 0xa78bfa);

    // four corner towers
    const towers = [[-19, -19], [19, -19], [-19, 19], [19, 19]];
    for (const [x, z] of towers) {
      this._box(x, 6, z, 5, 12, 5, pillarMat);
      this._strip(x, 12.1, z, 5.2, 0.25, 5.2, 0x22d3ee);
    }

    // central raised dais (2 tiers) — capture-the-high-ground
    this._box(0, 1, 0, 14, 2, 14, wallMat2);       // tier 1 top y=2
    this._box(0, 2.5, 0, 8, 3, 8, wallMat2);        // tier 2 top y=4
    this._strip(0, 2.02, 0, 14.2, 0.12, 14.2, 0x2dd4bf);
    this._strip(0, 4.02, 0, 8.2, 0.12, 8.2, 0xf59e0b);
    // steps up to the dais (north & south) — tallest next to the dais
    for (let i = 0; i < 4; i++) {
      const h = 2 - i * 0.5;                 // 2.0, 1.5, 1.0, 0.5
      this._box(0, h / 2, -7 - i, 5, h, 1, crateMat);
      this._box(0, h / 2, 7 + i, 5, h, 1, crateMat);
    }

    // mid-field pillars for wall-running
    const pillars = [[-10, 0], [10, 0], [0, -12], [0, 12]];
    for (const [x, z] of pillars) {
      this._box(x, 5, z, 2, 10, 2, pillarMat);
      this._strip(x, 10.1, z, 2.2, 0.2, 2.2, 0x60a5fa);
    }

    // scattered crates (cover)
    const crates = [
      [-15, 6, 2], [15, -6, 2], [-7, -16, 2], [7, 16, 2],
      [-16, 14, 2.5], [16, -14, 2.5], [12, 12, 2], [-12, -12, 2],
    ];
    for (const [x, z, s] of crates) this._box(x, s / 2, z, s, s, s, crateMat);

    // side elevated platforms (reachable by wall-run/jump) with railings
    const plats = [[-22, 5, 0, 8, 6], [22, 5, 0, 8, 6]];
    for (const [x, y, z, w, d] of plats) {
      this._box(x, y, z, w, 0.6, d, wallMat2);
      this._strip(x, y + 0.32, z, w + 0.1, 0.1, d + 0.1, 0x22d3ee);
      // railing facing center
      const railX = x < 0 ? x + w / 2 : x - w / 2;
      this._box(railX, y + 0.7, z, 0.2, 1.4, d, pillarMat);
    }

    // spawn points
    this.spawns = [
      new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 0, 20),
      new THREE.Vector3(-20, 0, 20), new THREE.Vector3(20, 0, -20),
      new THREE.Vector3(0, 0, -24), new THREE.Vector3(0, 0, 24),
      new THREE.Vector3(-24, 0, 0), new THREE.Vector3(24, 0, 0),
      new THREE.Vector3(0, 4.2, 0),
    ];

    this._buildLights();
    this._buildSky();
  }

  _buildLights() {
    const scene = this.scene;
    scene.add(new THREE.HemisphereLight(0x5577aa, 0x141622, 0.7));
    const sun = new THREE.DirectionalLight(0xbfd4ff, 1.1);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = 40;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 90; sun.shadow.bias = -0.0004;
    scene.add(sun);
    // colored accent lights
    const p1 = new THREE.PointLight(0x22d3ee, 0.8, 50, 2); p1.position.set(-18, 8, -18); scene.add(p1);
    const p2 = new THREE.PointLight(0xf43f5e, 0.8, 50, 2); p2.position.set(18, 8, 18); scene.add(p2);
    const p3 = new THREE.PointLight(0xfbbf24, 0.5, 40, 2); p3.position.set(0, 10, 0); scene.add(p3);
  }

  _buildSky() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#05060f');
    grd.addColorStop(0.5, '#0a1226');
    grd.addColorStop(0.85, '#16203f');
    grd.addColorStop(1, '#243156');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2(0x0a1020, 0.012);
  }

  // ---------- physics queries ----------
  // push a cylinder (radius r, vertical span feetY..headY) out of walls.
  // returns array of horizontal contact normals {x,z}.
  resolveHorizontal(pos, r, feetY, headY) {
    const contacts = [];
    for (const b of this.colliders) {
      if (b.max.y <= feetY + 0.08 || b.min.y >= headY - 0.05) continue;
      const cx = clamp(pos.x, b.min.x, b.max.x);
      const cz = clamp(pos.z, b.min.z, b.max.z);
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-7) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, push = r - d;
        pos.x += nx * push; pos.z += nz * push;
        contacts.push({ x: nx, z: nz });
      } else {
        const pxL = pos.x - b.min.x, pxR = b.max.x - pos.x;
        const pzL = pos.z - b.min.z, pzR = b.max.z - pos.z;
        const m = Math.min(pxL, pxR, pzL, pzR);
        if (m === pxL) { pos.x = b.min.x - r; contacts.push({ x: -1, z: 0 }); }
        else if (m === pxR) { pos.x = b.max.x + r; contacts.push({ x: 1, z: 0 }); }
        else if (m === pzL) { pos.z = b.min.z - r; contacts.push({ x: 0, z: -1 }); }
        else { pos.z = b.max.z + r; contacts.push({ x: 0, z: 1 }); }
      }
    }
    return contacts;
  }

  // highest surface under the footprint at/below feet (+ step tolerance)
  groundHeight(x, z, r, feetY, step = 0.35) {
    let g = -Infinity;
    for (const b of this.colliders) {
      const cx = clamp(x, b.min.x, b.max.x), cz = clamp(z, b.min.z, b.max.z);
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz > r * r) continue;
      if (b.max.y <= feetY + step && b.max.y > g) g = b.max.y;
    }
    return g;
  }

  // lowest ceiling above the head within footprint (for head bonk)
  ceilingHeight(x, z, r, headY) {
    let c = Infinity;
    for (const b of this.colliders) {
      const cx = clamp(x, b.min.x, b.max.x), cz = clamp(z, b.min.z, b.max.z);
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz > r * r) continue;
      if (b.min.y >= headY - 0.05 && b.min.y < c) c = b.min.y;
    }
    return c;
  }

  // raycast against static colliders. returns {dist, point, normal} or null.
  raycast(origin, dir, maxDist = 200) {
    this._ray.origin.copy(origin);
    this._ray.direction.copy(dir).normalize();
    let best = null, bestD = maxDist;
    const p = new THREE.Vector3();
    for (const b of this.colliders) {
      if (this._ray.intersectBox(b, p)) {
        const d = origin.distanceTo(p);
        if (d < bestD) { bestD = d; best = { dist: d, point: p.clone(), box: b }; }
      }
    }
    if (!best) return null;
    best.normal = this._boxNormal(best.box, best.point);
    return best;
  }

  _boxNormal(b, p) {
    const e = 0.02;
    if (Math.abs(p.x - b.min.x) < e) return new THREE.Vector3(-1, 0, 0);
    if (Math.abs(p.x - b.max.x) < e) return new THREE.Vector3(1, 0, 0);
    if (Math.abs(p.y - b.min.y) < e) return new THREE.Vector3(0, -1, 0);
    if (Math.abs(p.y - b.max.y) < e) return new THREE.Vector3(0, 1, 0);
    if (Math.abs(p.z - b.min.z) < e) return new THREE.Vector3(0, 0, -1);
    return new THREE.Vector3(0, 0, 1);
  }

  // hard safety clamp: keep an entity inside the arena no matter what.
  // returns bitmask: 1 = clamped on X, 2 = clamped on Z.
  clampToArena(pos, r) {
    const lim = this.bounds - 1 - r; // inner wall face minus radius
    let m = 0;
    if (pos.x > lim) { pos.x = lim; m |= 1; } else if (pos.x < -lim) { pos.x = -lim; m |= 1; }
    if (pos.z > lim) { pos.z = lim; m |= 2; } else if (pos.z < -lim) { pos.z = -lim; m |= 2; }
    return m;
  }

  randomSpawn(awayFrom = null, minDist = 12) {
    let pick = this.spawns[(Math.random() * this.spawns.length) | 0];
    if (awayFrom) {
      for (let i = 0; i < 6; i++) {
        const c = this.spawns[(Math.random() * this.spawns.length) | 0];
        if (c.distanceTo(awayFrom) > minDist) { pick = c; break; }
      }
    }
    return pick.clone();
  }
}
