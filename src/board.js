import { CARD_LIBRARY, COLS, DEFAULT_ROWS, SHAPES, TYPES } from './constants.js?v=20260518-savepause1';
import { Deck } from './deck.js?v=20260518-savepause1';

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
export const SPAWN_Y = -2;

function emptyRow() {
  return Array.from({ length: COLS }, () => null);
}

function normalizeGrid(source, rows) {
  const grid = source
    ? source.map(row => Array.from({ length: COLS }, (_, c) => row[c] ? { ...row[c], traits: [...row[c].traits] } : null))
    : [];
  while (grid.length < rows) grid.unshift(emptyRow());
  while (grid.length > rows) grid.shift();
  return grid;
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

  toState() {
    return { cardId: this.card.id, x: this.x, y: this.y, rot: this.rot };
  }
}

export class Board {
  constructor({ rows = DEFAULT_ROWS, deck = new Deck(), persistentGrid = null } = {}) {
    this.rows = rows;
    this.cols = COLS;
    this.deck = deck;
    this.grid = normalizeGrid(persistentGrid, rows);
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
    this.lastMoveWasRotate = false;
    this.flash = 0;
    this.fillQueue();
    this.spawn();
  }

  static fromState(state = {}) {
    const board = Object.create(Board.prototype);
    board.rows = state.rows || DEFAULT_ROWS;
    board.cols = COLS;
    board.deck = Deck.fromState(state.deck);
    board.grid = normalizeGrid(state.grid, board.rows);
    board.current = state.current ? Board.minoFromState(state.current) : null;
    board.held = state.held ? CARD_LIBRARY[state.held] : null;
    board.holdUsed = !!state.holdUsed;
    board.holdLocked = !!state.holdLocked;
    board.nextQueue = (state.nextQueue || []).map(id => CARD_LIBRARY[id]).filter(Boolean);
    board.garbageQueue = state.garbageQueue || 0;
    board.mp = state.mp || 0;
    board.combo = state.combo || 0;
    board.defeated = !!state.defeated;
    board.lastAttack = state.lastAttack || 0;
    board.lastMoveWasRotate = !!state.lastMoveWasRotate;
    board.flash = state.flash || 0;
    board.fillQueue();
    return board;
  }

  static minoFromState(state) {
    const mino = new Mino(CARD_LIBRARY[state.cardId] || CARD_LIBRARY[TYPES.I], state.x, state.y);
    mino.rot = state.rot || 0;
    return mino;
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
    this.current = new Mino(card, 3, SPAWN_Y);
    this.holdUsed = false;
    this.lastMoveWasRotate = false;
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
    this.lastMoveWasRotate = false;
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
        this.lastMoveWasRotate = true;
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
      this.current = new Mino(old, 3, SPAWN_Y);
      this.lastMoveWasRotate = false;
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
    while (this.ok(this.current, 0, 1)) this.current.y++;
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
    const wasTSpin = this.isTSpin();
    const cells = this.current.cells;
    if (cells.some(pos => pos.y < 0) || !cells.some(pos => pos.y >= 0)) {
      this.defeated = true;
      return { cleared: 0, attack: 0, mana: 0, bombRows: [], purge: false, tetris: false, tSpin: false, topOut: true };
    }
    for (const pos of cells) {
      this.grid[pos.y][pos.x] = cell(this.current.card);
      placed.push({ ...pos, card: this.current.card });
    }
    const result = this.clearLines();
    if (result.cleared > 0) {
      result.tSpin = wasTSpin;
      result.tetris = result.cleared === 4;
      const multiplier = (result.tetris ? 1.5 : 1) * (result.tSpin ? 1.2 : 1);
      result.attack = Number((result.attack * multiplier).toFixed(2));
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
        mana += row.length * 0.05 + row.filter(c => c.traits.includes('manaBonus')).length * 8;
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
    return { cleared, attack: Number(attack.toFixed(2)), mana: Number(mana.toFixed(2)), bombRows, purge, tetris: false, tSpin: false };
  }

  isTSpin() {
    if (!this.current || !this.lastMoveWasRotate || this.current.card.shapeId !== 'T') return false;
    const cx = this.current.x + 1;
    const cy = this.current.y + 1;
    const corners = [[cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]];
    const blocked = corners.filter(([x, y]) => x < 0 || x >= this.cols || y < 0 || y >= this.rows || !!this.grid[y][x]).length;
    return blocked >= 3;
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

  toState() {
    return {
      rows: this.rows,
      grid: this.grid.map(row => row.map(c => c ? { ...c, traits: [...c.traits] } : null)),
      deck: this.deck.toState(),
      current: this.current?.toState() || null,
      held: this.held?.id || null,
      holdUsed: this.holdUsed,
      holdLocked: this.holdLocked,
      nextQueue: this.nextQueue.map(card => card.id),
      garbageQueue: this.garbageQueue,
      mp: this.mp,
      combo: this.combo,
      defeated: this.defeated,
      lastAttack: this.lastAttack,
      lastMoveWasRotate: this.lastMoveWasRotate,
      flash: this.flash
    };
  }
}
