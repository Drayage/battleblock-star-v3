import { GAME_TIMING } from './constants.js?v=20260521-ko25';

export class InputController {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.repeat = new Map();
    this.cleanups = [];
    this.bindKeys();
    this.bindTouch();
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

  update(now) {
    for (const [code, rep] of this.repeat.entries()) {
      if (now < rep.next) continue;
      rep.count++;
      rep.next = now + (rep.count < 4 ? GAME_TIMING.KEY_REPEAT_DELAY : GAME_TIMING.KEY_REPEAT_FAST_DELAY);
      this.handleKey(code, true);
    }
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
      const fire = () => {
        this.game.action(action);
      };
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
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.repeat.clear();
    this.keys.clear();
  }
}
