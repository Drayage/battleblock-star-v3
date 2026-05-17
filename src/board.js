import { CARD_LIBRARY, COLS, DEFAULT_ROWS, SHAPES, TYPES } from './constants.js?v=20260518-event5';
import { Deck } from './deck.js?v=20260518-event5';

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];

function emptyRow() {
  return Array.from({ length: COLS }, () => null);
}

function cell(card) {
  return { type: card.id, attack: card.cellAttack, traits: [...card.traits] };
}

export class Mino {
  constructor(card, x = 3, y = 0) {
    this.card = card;
    this.x = x;
    this.y = y;
    this.rot = 0;
  }

  get shape() {
    return this.card.shape[this.rot];
  }

  get cells() {
    const out = [];
    const s = this.shape;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (s[r][c]) out.push({ x: this.x + c, y: this.y + r });
      }
    }
    return out;
  }

  clone() {
    const m = new Mino(this.card, this.x, this.y);
    m.rot = this.rot;
    return m;
  }
}

export class Board {
  constructor({ rows = DEFAULT_ROWS, deck = new Deck(), persistentGrid = null } = {}) {
    this.rows = rows;
    this.cols = COLS;
    this.deck = deck;
    this.grid = persistentGrid ? persistentGrid.map(r => [...r]) : Array.from({ length: rows }, emptyRow);
    this.current = null;
    this.held = null;
    this.holdUsed = false;
    this.holdLocked = false;
    this.nextQueue = [];
    this.garbageQueue = 0;
    this.mp = 0;
    this.combo = 0;
    this.defeated = false;
    this.lastAttack = 0;
    this.flash = 0;
    this.fillQueue();
    this.spawn();
  }

  fillQueue() {
    while (this.nextQueue.length < 4) this.nextQueue.push(this.deck.next());
  }

  expandRows(amount = 5) {
    for (let i = 0; i < amount; i++) this.grid.unshift(emptyRow());
    this.rows += amount;
  }

  spawn() {
    const card = this.nextQueue.shift();
    this.fillQueue();
    this.current = new Mino(card, 3, 0);
    this.holdUsed = false;
    if (!this.ok(this.current)) this.defeated = true;
  }

  ok(mino, dx = 0, dy = 0, rot = null) {
    const test = mino.clone();
    test.x += dx;
    test.y += dy;
    if (rot !== null) test.rot = rot;
    return test.cells.every(({ x, y }) => x >= 0 && x < this.cols && y < this.rows && (y < 0 || !this.grid[y][x]));
  }

  move(dx, dy) {
    if (!this.current || this.defeated) return false;
    if (!this.ok(this.current, dx, dy)) return false;
    this.current.x += dx;
    this.current.y += dy;
    return true;
  }

  rotate(dir = 1) {
    if (!this.current || this.defeated) return false;
    const nextRot = (this.current.rot + (dir > 0 ? 1 : 3)) % 4;
    for (const [kx, ky] of KICKS) {
      if (this.ok(this.current, kx, ky, nextRot)) {
        this.current.x += kx;
        this.current.y += ky;
        this.current.rot = nextRot;
        return true;
      }
    }
    return false;
  }

  hold() {
    if (!this.current || this.holdUsed || this.holdLocked || this.defeated) return false;
    if (!this.held) {
      this.held = this.current.card;
      this.spawn();
    } else {
      const old = this.held;
      this.held = this.current.card;
      this.current = new Mino(old, 3, 0);
    }
    this.holdUsed = true;
    return true;
  }

  ghostY() {
    if (!this.current) return 0;
    let y = this.current.y;
    while (this.ok(this.current, 0, y - this.current.y + 1)) y++;
    return y;
  }

  hardDrop() {
    if (!this.current || this.defeated) return null;
    while (this.move(0, 1)) {}
    return this.lock();
  }

  emergencyShard() {
    if (!this.current || this.defeated) return null;
    this.current.card = {
      ...CARD_LIBRARY[TYPES.O],
      id: 'SHARD',
      name: '긴급 조각',
      cellAttack: 0.05,
      traits: ['shard'],
      shape: [[[1]], [[1]], [[1]], [[1]]]
    };
    while (this.move(0, 1)) {}
    return this.lock();
  }

  lock() {
    const placed = [];
    for (const pos of this.current.cells) {
      if (pos.y < 0) continue;
      this.grid[pos.y][pos.x] = cell(this.current.card);
      placed.push({ ...pos, card: this.current.card });
    }
    const result = this.clearLines();
    if (result.cleared > 0) {
      this.combo++;
      result.attack += Math.max(0, this.combo - 1) * 0.3;
      this.mp = Math.min(100, this.mp + result.mana);
      this.flash = 180;
      const cancel = Math.min(this.garbageQueue, Math.floor(result.attack));
      this.garbageQueue -= cancel;
      result.attack = Math.max(0, result.attack - cancel);
    } else {
      this.combo = 0;
      if (this.garbageQueue > 0) {
        this.applyGarbage(this.garbageQueue);
        this.garbageQueue = 0;
      }
    }
    this.lastAttack = result.attack;
    this.spawn();
    return result;
  }

  clearLines() {
    let cleared = 0;
    let attack = 0;
    let mana = 0;
    let bombRows = [];
    let purge = false;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(Boolean)) {
        const row = this.grid[r];
        attack += row.reduce((sum, c) => sum + c.attack, 0);
        mana += row.length * 1.5 + row.filter(c => c.traits.includes('manaBonus')).length * 8;
        if (row.some(c => c.traits.includes('bomb'))) bombRows.push(r);
        if (row.some(c => c.traits.includes('purgeGarbage'))) purge = true;
        this.grid.splice(r, 1);
        this.grid.unshift(emptyRow());
        cleared++;
        r++;
      }
    }
    for (const r of bombRows) this.clearGarbageAround(r);
    if (purge) this.purgeGarbageRows(1);
    return { cleared, attack: Number(attack.toFixed(2)), mana: Math.round(mana), bombRows, purge };
  }

  clearGarbageAround(row) {
    for (let r = Math.max(0, row - 1); r <= Math.min(this.rows - 1, row + 1); r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]?.type === TYPES.GARBAGE) this.grid[r][c] = null;
      }
    }
  }

  receiveGarbage(amount) {
    this.garbageQueue += Math.max(0, Math.ceil(amount));
  }

  applyGarbage(lines) {
    for (let i = 0; i < lines; i++) {
      if (this.grid[0].some(Boolean)) {
        this.defeated = true;
        return;
      }
      this.grid.shift();
      const hole = Math.floor(Math.random() * this.cols);
      this.grid.push(Array.from({ length: this.cols }, (_, c) => c === hole ? null : { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] }));
    }
  }

  purgeGarbageRows(count = 3) {
    let removed = 0;
    while (removed < count) {
      let r = -1;
      for (let i = this.rows - 1; i >= 0; i--) {
        if (this.grid[i].some(c => c?.type === TYPES.GARBAGE)) {
          r = i;
          break;
        }
      }
      if (r < 0) break;
      if (this.grid[r].some(c => c?.type === TYPES.GARBAGE)) {
        this.grid.splice(r, 1);
        this.grid.unshift(emptyRow());
        removed++;
      }
    }
    return removed;
  }

  magneticCollapse() {
    for (let c = 0; c < this.cols; c++) {
      const stack = [];
      for (let r = 0; r < this.rows; r++) if (this.grid[r][c]) stack.push(this.grid[r][c]);
      for (let r = this.rows - 1; r >= 0; r--) this.grid[r][c] = stack.pop() || null;
    }
  }
}
