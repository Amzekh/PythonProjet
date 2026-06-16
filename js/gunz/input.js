// input.js — keyboard + mouse with pointer lock, edge detection and double-tap.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();          // currently held (by e.code)
    this.pressed = new Set();       // pressed this frame
    this.released = new Set();      // released this frame
    this.locked = false;
    this.enabled = false;           // ignore gameplay input when false (menus)
    this.mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, rightPressed: false, wheel: 0 };
    this._tap = {};                 // code -> last tap time (ms)
    this.doubleTap = null;          // code double-tapped this frame
    this.sensitivity = 0.0024;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (!this.keys.has(e.code)) {
        this.pressed.add(e.code);
        const now = performance.now();
        if (this._tap[e.code] && now - this._tap[e.code] < 280) this.doubleTap = e.code;
        this._tap[e.code] = now;
      }
      this.keys.add(e.code);
      if (this.locked && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.add(e.code); });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; }
    });
    addEventListener('wheel', (e) => { if (this.locked) this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this._onLockChange) this._onLockChange(this.locked);
    });
  }

  onLockChange(fn) { this._onLockChange = fn; }
  lock() { if (this.canvas.requestPointerLock) this.canvas.requestPointerLock(); }
  unlock() { if (document.exitPointerLock) document.exitPointerLock(); }

  down(code) { return this.enabled && this.keys.has(code); }
  justPressed(code) { return this.enabled && this.pressed.has(code); }
  justReleased(code) { return this.released.has(code); }

  // call after all systems have read input for the frame
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.leftPressed = false; this.mouse.rightPressed = false;
    this.doubleTap = null;
  }
}
