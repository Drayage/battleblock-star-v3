import { GAME_TIMING } from './constants.js?v=20260521-ko50';

// Standard gamepad button mapping (Xbox / PS layout)
const BTN_ONE_SHOT = {
  0:  'hard',        // A / Cross
  1:  'rotate',      // B / Circle
  2:  'ccw',         // X / Square
  3:  'hold',        // Y / Triangle
  4:  'skill0',      // LB / L1
  5:  'skill1',      // RB / R1
  6:  'skill2',      // LT / L2
  7:  'consumable0', // RT / R2
  9:  'pause',       // Start / Options
  12: 'rotate',      // D-up (rotate alternate)
  // 13 D-down, 14 D-left, 15 D-right handled via directional repeat
};

const VIBRATE_PATTERNS = {
  harddrop: { duration: 80,  strongMagnitude: 0.5,  weakMagnitude: 0.2 },
  clear1:   { duration: 150, strongMagnitude: 0.55, weakMagnitude: 0.25 },
  clear2:   { duration: 220, strongMagnitude: 0.7,  weakMagnitude: 0.35 },
  clear3:   { duration: 300, strongMagnitude: 0.85, weakMagnitude: 0.5  },
  clear4:   { duration: 420, strongMagnitude: 1.0,  weakMagnitude: 0.7  },
  garbage:  { duration: 120, strongMagnitude: 0.35, weakMagnitude: 0.15 },
  hurt:     { duration: 320, strongMagnitude: 0.9,  weakMagnitude: 0.4  },
  win:      { duration: 600, strongMagnitude: 0.4,  weakMagnitude: 0.9  },
};

export class InputController {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.repeat = new Map();    // keyboard DAS repeats
    this.gpRepeat = new Map();  // gamepad directional repeats (battle)
    this.gpPrev = {};           // prev button pressed states
    this.gamepadIndex = -1;
    this.gpMenuIdx = 0;         // focused element index in current menu screen
    this.gpMenuRepeat = {};     // { next: time, count } for directional menu nav
    this.gpLastScreen = null;   // detect screen changes to reset menu focus
    this.cleanups = [];
    this.bindKeys();
    this.bindTouch();
    this.bindGamepad();
  }

  bindKeys() {
    const down = e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      if (this.keys.has(e.code)) return;
      this.keys.add(e.code);
      this.handleKey(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) {
        this.repeat.set(e.code, { next: performance.now() + GAME_TIMING.KEY_REPEAT_FIRST_DELAY, count: 0 });
      }
    };
    const up = e => {
      this.keys.delete(e.code);
      this.repeat.delete(e.code);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this.cleanups.push(() => window.removeEventListener('keydown', down));
    this.cleanups.push(() => window.removeEventListener('keyup', up));
  }

  bindGamepad() {
    const onconnect = e => {
      this.gamepadIndex = e.gamepad.index;
      this.gpPrev = {};
      this.gpRepeat.clear();
      this.game.message = `컨트롤러 연결: ${e.gamepad.id.slice(0, 32)}`;
    };
    const ondisconnect = e => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = -1;
        this.gpRepeat.clear();
        this.gpPrev = {};
        this.game.message = '컨트롤러 연결 해제';
      }
    };
    window.addEventListener('gamepadconnected', onconnect);
    window.addEventListener('gamepaddisconnected', ondisconnect);
    this.cleanups.push(() => window.removeEventListener('gamepadconnected', onconnect));
    this.cleanups.push(() => window.removeEventListener('gamepaddisconnected', ondisconnect));

    // Scan for already-connected gamepads (e.g. page reload while connected)
    const already = [...(navigator.getGamepads?.() || [])].find(g => g?.connected);
    if (already) {
      this.gamepadIndex = already.index;
      this.game.message = `컨트롤러 감지: ${already.id.slice(0, 32)}`;
    }
  }

  update(now) {
    for (const [code, rep] of this.repeat.entries()) {
      if (now < rep.next) continue;
      rep.count++;
      rep.next = now + (rep.count < 4 ? GAME_TIMING.KEY_REPEAT_DELAY : GAME_TIMING.KEY_REPEAT_FAST_DELAY);
      this.handleKey(code, true);
    }
    if (this.game.inBattle()) this.updateGamepad(now);
    else this.updateGamepadMenu(now);
  }

  // Returns all currently focusable buttons in the active screen (visible, not disabled)
  _menuFocusables() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return [];
    return [...activeScreen.querySelectorAll('button:not([disabled])')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  updateGamepadMenu(now) {
    if (!navigator.getGamepads) return;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp?.connected) {
      const found = [...(navigator.getGamepads() || [])].find(g => g?.connected);
      if (!found) return;
      this.gamepadIndex = found.index;
    }
    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return;

    // Reset focus index when screen changes
    const screenId = document.querySelector('.screen.active')?.id;
    if (screenId !== this.gpLastScreen) {
      this.gpLastScreen = screenId;
      this.gpMenuIdx = 0;
      this.gpMenuRepeat = {};
    }

    const focusables = this._menuFocusables();
    if (focusables.length === 0) { this._clearGpFocus(); return; }
    this.gpMenuIdx = Math.max(0, Math.min(focusables.length - 1, this.gpMenuIdx));

    // Apply visual focus
    focusables.forEach((el, i) => el.classList.toggle('gp-focused', i === this.gpMenuIdx));

    const DEAD = 0.4;
    const lx = gamepad.axes[0] || 0;
    const ly = gamepad.axes[1] || 0;
    const navNext = ly > DEAD || lx > DEAD || !!(gamepad.buttons[13]?.pressed) || !!(gamepad.buttons[15]?.pressed);
    const navPrev = ly < -DEAD || lx < -DEAD || !!(gamepad.buttons[12]?.pressed) || !!(gamepad.buttons[14]?.pressed);

    const move = (dir) => {
      const n = focusables.length;
      this.gpMenuIdx = dir === 1 ? (this.gpMenuIdx + 1) % n : (this.gpMenuIdx - 1 + n) % n;
      focusables[this.gpMenuIdx]?.scrollIntoView({ block: 'nearest' });
    };

    for (const [key, active, dir] of [['next', navNext, 1], ['prev', navPrev, -1]]) {
      if (active) {
        if (!this.gpMenuRepeat[key]) {
          move(dir);
          this.gpMenuRepeat[key] = { next: now + 380 };
        } else if (now >= this.gpMenuRepeat[key].next) {
          move(dir);
          this.gpMenuRepeat[key].next = now + 160;
        }
      } else {
        delete this.gpMenuRepeat[key];
      }
    }

    // One-shot buttons: A=click, B=back (last ghost/cancel btn), Start=primary
    gamepad.buttons.forEach((btn, i) => {
      const pressed = btn.pressed || btn.value > 0.5;
      const prev = this.gpPrev[i] || false;
      if (pressed && !prev) {
        if (i === 0 || i === 9) {
          // A or Start: click focused element
          focusables[this.gpMenuIdx]?.click();
        } else if (i === 1) {
          // B: click the last ghost/secondary button (cancel/back)
          const backs = focusables.filter(el => el.classList.contains('ghost') || el.classList.contains('danger'));
          if (backs.length) backs[backs.length - 1].click();
        }
      }
      this.gpPrev[i] = pressed;
    });
  }

  _clearGpFocus() {
    document.querySelectorAll('.gp-focused').forEach(el => el.classList.remove('gp-focused'));
  }

  updateGamepad(now) {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    let gp = gamepads[this.gamepadIndex];
    if (!gp?.connected) {
      gp = [...gamepads].find(g => g?.connected);
      if (!gp) return;
      this.gamepadIndex = gp.index;
    }

    const DEAD = 0.4;
    const lx = gp.axes[0] || 0;
    const ly = gp.axes[1] || 0;

    // Directional movement: D-pad OR left stick, merged into one repeat per direction
    const dirActive = {
      left:  lx < -DEAD || !!(gp.buttons[14]?.pressed),
      right: lx > DEAD  || !!(gp.buttons[15]?.pressed),
      soft:  ly > DEAD  || !!(gp.buttons[13]?.pressed),
    };

    for (const [dir, active] of Object.entries(dirActive)) {
      if (active) {
        if (!this.gpRepeat.has(dir)) {
          this.game.action(dir);
          this.gpRepeat.set(dir, { next: now + GAME_TIMING.KEY_REPEAT_FIRST_DELAY, count: 0 });
        } else {
          const rep = this.gpRepeat.get(dir);
          if (now >= rep.next) {
            rep.count++;
            rep.next = now + (rep.count < 4 ? GAME_TIMING.KEY_REPEAT_DELAY : GAME_TIMING.KEY_REPEAT_FAST_DELAY);
            this.game.action(dir);
          }
        }
      } else {
        this.gpRepeat.delete(dir);
      }
    }

    // One-shot buttons
    gp.buttons.forEach((btn, i) => {
      const pressed = btn.pressed || btn.value > 0.5;
      const prev = this.gpPrev[i] || false;
      if (pressed && !prev && BTN_ONE_SHOT[i]) {
        this.game.action(BTN_ONE_SHOT[i]);
      }
      this.gpPrev[i] = pressed;
    });
  }

  // Call this from game.js at key moments to trigger rumble
  vibrate(type) {
    if (this.gamepadIndex < 0) return;
    const gp = navigator.getGamepads?.()[this.gamepadIndex];
    if (!gp?.vibrationActuator) return;
    const p = VIBRATE_PATTERNS[type];
    if (!p) return;
    gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, ...p }).catch(() => {});
  }

  handleKey(code, repeated = false) {
    if (!this.game.inBattle()) return;
    const map = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'soft',
      ArrowUp: 'rotate',
      KeyX: 'rotate',
      KeyZ: 'ccw',
      Space: 'hard',
      KeyC: 'hold',
      Digit1: 'skill0',
      Digit2: 'skill1',
      Digit3: 'skill2',
      Digit4: 'consumable0',
      Digit5: 'consumable1',
      Digit6: 'consumable2',
      KeyP: 'pause',
      Escape: 'pause'
    };
    const action = map[code];
    if (!action) return;
    if (repeated && !['left', 'right', 'soft'].includes(action)) return;
    this.game.action(action);
  }

  bindTouch() {
    const pad = document.getElementById('mobilePad');
    if (pad) {
      const prevent = e => e.preventDefault();
      pad.addEventListener('contextmenu', prevent);
      pad.addEventListener('selectstart', prevent);
      pad.addEventListener('dragstart', prevent);
      this.cleanups.push(() => pad.removeEventListener('contextmenu', prevent));
      this.cleanups.push(() => pad.removeEventListener('selectstart', prevent));
      this.cleanups.push(() => pad.removeEventListener('dragstart', prevent));
    }
    document.querySelectorAll('[data-action]').forEach(btn => {
      let timer = null;
      const action = btn.dataset.action;
      const repeatable = ['left', 'right', 'soft'].includes(action);
      const firstDelay = action === 'soft' ? GAME_TIMING.TOUCH_SOFT_FIRST_DELAY : GAME_TIMING.TOUCH_FIRST_DELAY;
      const repeatDelay = action === 'soft' ? GAME_TIMING.TOUCH_SOFT_REPEAT_DELAY : GAME_TIMING.TOUCH_REPEAT_DELAY;
      const fire = () => { this.game.action(action); };
      const down = e => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        fire();
        if (repeatable) {
          timer = setTimeout(function repeat() {
            fire();
            timer = setTimeout(repeat, repeatDelay);
          }, firstDelay);
        }
      };
      const stop = () => { clearTimeout(timer); timer = null; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointercancel', stop);
      this.cleanups.push(() => btn.removeEventListener('pointerdown', down));
      this.cleanups.push(() => btn.removeEventListener('pointerup', stop));
      this.cleanups.push(() => btn.removeEventListener('pointercancel', stop));
    });
  }

  dispose() {
    this._clearGpFocus();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.repeat.clear();
    this.gpRepeat.clear();
    this.keys.clear();
  }
}
