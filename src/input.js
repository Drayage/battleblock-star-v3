export class InputController {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.repeat = new Map();
    this.bindKeys();
    this.bindTouch();
  }

  bindKeys() {
    window.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      if (this.keys.has(e.code)) return;
      this.keys.add(e.code);
      this.handleKey(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) {
        this.repeat.set(e.code, { next: performance.now() + 180, count: 0 });
      }
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      this.repeat.delete(e.code);
    });
  }

  update(now) {
    for (const [code, rep] of this.repeat.entries()) {
      if (now < rep.next) continue;
      rep.count++;
      rep.next = now + (rep.count < 4 ? 90 : 45);
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
      pad.addEventListener('contextmenu', e => e.preventDefault());
      pad.addEventListener('selectstart', e => e.preventDefault());
      pad.addEventListener('dragstart', e => e.preventDefault());
    }
    document.querySelectorAll('[data-action]').forEach(btn => {
      let timer = null;
      const action = btn.dataset.action;
      const repeatable = ['left', 'right', 'soft'].includes(action);
      const firstDelay = action === 'soft' ? 120 : 240;
      const repeatDelay = action === 'soft' ? 70 : 110;
      const fire = () => {
        this.game.action(action);
      };
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        fire();
        if (repeatable) {
          timer = setTimeout(function repeat() {
            fire();
            timer = setTimeout(repeat, repeatDelay);
          }, firstDelay);
        }
      });
      btn.addEventListener('pointerup', () => { clearTimeout(timer); timer = null; });
      btn.addEventListener('pointercancel', () => { clearTimeout(timer); timer = null; });
    });
  }
}
