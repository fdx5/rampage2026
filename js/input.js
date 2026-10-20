// Keyboard, gamepad and touch input for up to three simultaneous players
// (the original cabinet had three control panels: George, Lizzie, Ralph).
const KEYMAPS = [
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], punch: ['KeyZ', 'Space'], jump: ['KeyX'], start: ['Enter', 'Digit1'] },
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], punch: ['KeyF'], jump: ['KeyG'], start: ['Digit2'] },
  { left: ['KeyJ'], right: ['KeyL'], up: ['KeyI'], down: ['KeyK'], punch: ['KeyO'], jump: ['KeyP'], start: ['Digit3'] },
];
const BUTTONS = ['left', 'right', 'up', 'down', 'punch', 'jump', 'start'];

export const KEY_HELP = [
  '방향키 + Z 펀치 / X 점프  (시작: Enter/1)',
  'WASD + F 펀치 / G 점프  (참가: 2)',
  'IJKL + O 펀치 / P 점프  (참가: 3)',
];

export class Input {
  constructor() {
    this.down = new Set();
    this.touch = {};
    this.prev = [{}, {}, {}];
    this.state = [{}, {}, {}];
    this.anyPressed = false;
    this.keyPressed = new Set();
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.keyPressed.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  }

  setTouch(btn, on) { this.touch[btn] = on; }

  update() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    this.anyPressed = this.keyPressed.size > 0;
    for (let i = 0; i < 3; i++) {
      const s = {};
      for (const b of BUTTONS) s[b] = KEYMAPS[i][b].some((k) => this.down.has(k));
      if (i === 0) for (const b of BUTTONS) s[b] = s[b] || !!this.touch[b];
      const p = pads[i];
      if (p) {
        const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0, bt = (n) => p.buttons[n]?.pressed;
        s.left ||= ax < -0.4 || bt(14); s.right ||= ax > 0.4 || bt(15);
        s.up ||= ay < -0.4 || bt(12); s.down ||= ay > 0.4 || bt(13);
        s.jump ||= bt(0); s.punch ||= bt(2) || bt(1) || bt(3); s.start ||= bt(9);
      }
      for (const b of BUTTONS) {
        // taps shorter than a frame still count as a press
        const tapped = KEYMAPS[i][b].some((k) => this.keyPressed.has(k));
        s[b + 'Pressed'] = (s[b] && !this.prev[i][b]) || tapped;
        s[b] = s[b] || tapped;
        if (s[b + 'Pressed']) this.anyPressed = true;
      }
      this.prev[i] = s;
      this.state[i] = s;
    }
  }

  // Clears per-frame edge state. Call at the end of each frame.
  endFrame() { this.keyPressed.clear(); }

  pressed(code) { return this.keyPressed.has(code); }

  player(i) { return this.state[i]; }
}
