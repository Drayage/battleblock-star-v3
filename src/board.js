import { CARD_LIBRARY, COLS, DEFAULT_ROWS, GAME_TIMING, SHAPES, TYPES } from './constants.js?v=20260521-ko25';
import { Deck } from './deck.js?v=20260521-ko25';

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
  const made = { type: card.id, attack: card.cellAttack, traits: [...card.traits] };
  if (card.fuse) made.fuse = card.fuse;
  return made;
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
    this.pieceSerial = 0;
    this.garbageEntries = [];
    this.mp = 0;
    this.combo = 0;
    this.comboBreakFlash = 0;
    this.clearText = '';
    this.clearTextFlash = 0;
    this.bombFx = [];
    this.defeated = false;
    this.lastAttack = 0;
    this.lastMoveWasRotate = false;
    this.flash = 0;
    this.attackPool = 0;
    this.nextAttackDouble = false;
    this.attackChargeStacks = 0;
    this.rotateLocked = false;
    this.iPieceForce = 0;
    this.mpCap = 100;
    this.comboGuard = false;
    this.comboGuardCharged = false;
    this.chainReactor = false;
    this.overchargeShots = 0;
    this.forceCrushNext = 0;
    this.explodeRadiusBonus = 0;
    this.sanctuaryActive = false;
    this.chainResonator = false;
    this.comboEngine = false;
    this.pendingDrops = [];
    this.pendingDropTimer = 0;
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
    board.pieceSerial = state.pieceSerial || 0;
    board.garbageEntries = Board.garbageEntriesFromState(state);
    board.mp = state.mp || 0;
    board.combo = state.combo || 0;
    board.comboBreakFlash = state.comboBreakFlash || 0;
    board.clearText = state.clearText || '';
    board.clearTextFlash = state.clearTextFlash || 0;
    board.bombFx = (state.bombFx || []).map(fx => ({ ...fx }));
    board.defeated = !!state.defeated;
    board.lastAttack = state.lastAttack || 0;
    board.lastMoveWasRotate = !!state.lastMoveWasRotate;
    board.flash = state.flash || 0;
    board.attackPool = state.attackPool || 0;
    board.nextAttackDouble = !!state.nextAttackDouble;
    board.attackChargeStacks = state.attackChargeStacks || 0;
    board.rotateLocked = !!state.rotateLocked;
    board.iPieceForce = state.iPieceForce || 0;
    board.mpCap = state.mpCap || 100;
    board.comboGuard = !!state.comboGuard;
    board.comboGuardCharged = !!state.comboGuardCharged;
    board.chainReactor = !!state.chainReactor;
    board.overchargeShots = state.overchargeShots || 0;
    board.forceCrushNext = state.forceCrushNext || 0;
    board.explodeRadiusBonus = state.explodeRadiusBonus || 0;
    board.sanctuaryActive = !!state.sanctuaryActive;
    board.chainResonator = !!state.chainResonator;
    board.comboEngine = !!state.comboEngine;
    board.pendingDrops = (state.pendingDrops || []).map(d => ({ ...d }));
    board.pendingDropTimer = state.pendingDropTimer || 0;
    board.fillQueue();
    return board;
  }

  static minoFromState(state) {
    const mino = new Mino(CARD_LIBRARY[state.cardId] || CARD_LIBRARY[TYPES.I], state.x, state.y);
    mino.rot = state.rot || 0;
    return mino;
  }

  static garbageEntriesFromState(state = {}) {
    if (Array.isArray(state.garbageEntries)) {
      return state.garbageEntries
        .map(entry => ({ amount: Math.max(0, Math.ceil(entry.amount || 0)), timer: Math.max(0, entry.timer || 0), delayed: !!entry.delayed }))
        .filter(entry => entry.amount > 0);
    }
    const amount = Math.max(0, Math.ceil(state.garbageQueue || 0));
    return amount > 0 ? [{ amount, timer: 0 }] : [];
  }

  get garbageQueue() {
    return this.garbageEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }

  set garbageQueue(amount) {
    const n = Math.max(0, Math.ceil(amount || 0));
    this.garbageEntries = n > 0 ? [{ amount: n, timer: 0 }] : [];
  }

  fillQueue() {
    while (this.nextQueue.length < 4) this.nextQueue.push(this.deck.next());
  }

  expandRows(amount = 5) {
    for (let i = 0; i < amount; i++) this.grid.unshift(emptyRow());
    this.rows += amount;
  }

  spawn() {
    let card = this.nextQueue.shift();
    this.fillQueue();
    if (this.iPieceForce > 0) {
      card = CARD_LIBRARY[TYPES.I];
      this.iPieceForce--;
    }
    if (this.forceCrushNext > 0) {
      card = CARD_LIBRARY[TYPES.CRUSHER];
      this.forceCrushNext--;
    }
    this.pieceSerial++;
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
    if (!this.current || this.defeated || this.rotateLocked) return false;
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
    if (this.current.card.traits.includes('heavy')) return false;
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
    return this.lock(true);
  }

  emergencyShard() {
    if (!this.current || this.defeated) return null;
    this.current.card = {
      ...CARD_LIBRARY[TYPES.O],
      id: 'SHARD',
      name: 'Emergency Shard',
      cellAttack: 0.05,
      traits: ['shard'],
      shape: [[[1]], [[1]], [[1]], [[1]]]
    };
    while (this.move(0, 1)) {}
    return this.lock();
  }

  bombShard() {
    if (!this.current || this.defeated) return false;
    this.current = new Mino({
      ...CARD_LIBRARY[TYPES.O],
      id: 'BOMB_SHARD',
      name: '폭탄 파편',
      cellAttack: 0.1,
      traits: ['bomb'],
      shape: [[[1]], [[1]], [[1]], [[1]]]
    }, 4, SPAWN_Y);
    this.holdUsed = true;
    if (!this.ok(this.current)) this.defeated = true;
    return true;
  }

  lock(hardDropped = false) {
    this.flushPendingDrops();
    const placed = [];
    const wasTSpin = this.isTSpin();
    const cells = this.current.cells;
    if (cells.some(pos => pos.y < 0) || !cells.some(pos => pos.y >= 0)) {
      this.defeated = true;
      return { cleared: 0, attack: 0, mana: 0, bombRows: [], purge: false, tetris: false, tSpin: false, topOut: true };
    }
    for (const pos of cells) {
      const made = cell(this.current.card);
      if (made.traits.includes('chain')) made.pieceId = this.pieceSerial;
      this.grid[pos.y][pos.x] = made;
      placed.push({ ...pos, card: this.current.card });
    }
    if (hardDropped) {
      const isGlassPiece = this.current.card.traits.includes('glass');
      const shatter = new Set();
      for (const pos of cells) {
        // 1) 하드드롭한 그 블록이 유리면 깨진다
        if (isGlassPiece) shatter.add(`${pos.y},${pos.x}`);
        // 2) 하드드롭한 블록 바로 아래(=이 블록이 그 위에 떨어진) 유리가 깨진다
        const belowY = pos.y + 1;
        if (belowY < this.rows && this.grid[belowY][pos.x]?.traits.includes('glass')) {
          shatter.add(`${belowY},${pos.x}`);
        }
      }
      for (const key of shatter) {
        const [gy, gx] = key.split(',').map(Number);
        this.grid[gy][gx] = null;
        this.bombFx.push({ x: gx, y: gy, timer: GAME_TIMING.BOMB_FX_FLASH, kind: 'glass', radius: 0 });
      }
    }
    if (this.current.card.traits.includes('heavyCrush')) {
      this.compactColumns([...new Set(cells.map(p => p.x))]);
    }
    const placedCard = this.current.card;
    const result = this.clearLines();
    if (result.cleared > 0) {
      result.tSpin = wasTSpin;
      // 사슬 공명기: 멀티라인 폭발 배수 판정에 사슬로 함께 지워진 줄도 합산(공격/마나 0.5배는 유지).
      const burstLines = this.chainResonator ? result.cleared : result.fullCleared;
      result.tetris = burstLines >= 4;
      result.clearText = this.clearLabel(result);
      const multiplier = (result.tetris ? 1.5 : 1) * (result.tSpin ? 1.2 : 1);
      result.attack = Number((result.attack * multiplier).toFixed(2));
      this.combo++;
      const comboStep = this.comboEngine ? 0.15 : 0.1;
      const comboMult = this.combo >= 2 ? 1.0 + this.combo * comboStep : 1.0;
      result.attack = Number((result.attack * comboMult).toFixed(2));
      this.mp = Math.min(this.mpCap, this.mp + result.mana);
      if (this.comboGuard) this.comboGuardCharged = true;
      this.flash = 180;
      this.comboBreakFlash = 0;
      this.clearText = result.clearText;
      this.clearTextFlash = result.clearText ? GAME_TIMING.CLEAR_FEEDBACK_FLASH : 0;
      if (this.nextAttackDouble) {
        result.attack = Number((result.attack * 2).toFixed(2));
        this.nextAttackDouble = false;
      }
      if (this.overchargeShots > 0) {
        result.attack = Number((result.attack * 1.5).toFixed(2));
        this.overchargeShots--;
      }
      if (this.attackChargeStacks > 0) {
        result.attack = Number((result.attack * (1 + 0.2 * this.attackChargeStacks)).toFixed(2));
        this.attackChargeStacks = 0;
      }
      this.attackChargeStacks = Math.min(3, this.attackChargeStacks + (result.chargeGained || 0));
      this.attackPool += result.attack;
      const cancel = Math.min(this.garbageQueue, Math.floor(this.attackPool));
      this.cancelGarbage(cancel);
      this.attackPool = Number(Math.max(0, this.attackPool - cancel).toFixed(4));
      result.attack = this.attackPool;
      this.attackPool = 0;
    } else if (this.comboGuard && this.comboGuardCharged && this.combo > 0) {
      // 콤보 보존: 충전된 보호막이 한 번의 미스로부터 콤보를 지킨다(다음 클리어 시 재충전).
      this.comboGuardCharged = false;
    } else {
      if (this.combo > 1) result.comboBreak = this.combo;
      this.combo = 0;
      this.comboBreakFlash = result.comboBreak ? GAME_TIMING.COMBO_BREAK_FLASH : 0;
      this.clearTextFlash = 0;
    }
    const instant = this.applyOnPlace(placedCard);
    if (instant.triggered) {
      result.attack = Number((result.attack + instant.attack).toFixed(2));
      result.instant = instant;
      if (result.cleared === 0) {
        this.clearText = instant.text;
        this.clearTextFlash = GAME_TIMING.CLEAR_FEEDBACK_FLASH;
      }
    }
    this.tickTimeBombs(new Set(placed.map(pos => `${pos.x},${pos.y}`)));
    // 줄을 지운 턴에는 이미 도착 대기(빨간) 중인 가비지를 즉시 떨구지 않고 1초 미룬다(파란색 표시).
    if (result.cleared > 0) {
      for (const entry of this.garbageEntries) {
        if (entry.timer <= 0) {
          entry.timer = GAME_TIMING.GARBAGE_DELAY_ON_CLEAR;
          entry.delayed = true;
        }
      }
    }
    this.applyReadyGarbage();
    this.lastAttack = result.attack;
    if (this.defeated) return result;
    this.spawn();
    return result;
  }

  applyOnPlace(card) {
    const effect = card?.onPlace;
    const result = { triggered: false, attack: 0, canceled: 0, mana: 0, purgedRows: 0, text: '' };
    if (!effect) return result;
    const labels = [];
    if (effect.attack) {
      result.attack = Number(effect.attack.toFixed(2));
      labels.push(`STRIKE +${result.attack.toFixed(1)}`);
    }
    if (effect.cancelGarbage) {
      result.canceled = this.cancelGarbage(effect.cancelGarbage);
      if (result.canceled > 0) labels.push(`GAUGE -${result.canceled}`);
      else labels.push('GAUGE BLOCK');
    }
    if (effect.mana) {
      result.mana = effect.mana;
      this.mp = Math.min(this.mpCap, this.mp + effect.mana);
      labels.push(`MP +${effect.mana}`);
    }
    if (effect.purgeGarbageRows) {
      result.purgedRows = this.purgeGarbageRows(effect.purgeGarbageRows);
      if (result.purgedRows > 0) labels.push(`GARBAGE -${result.purgedRows}`);
      else labels.push('PURGE READY');
      if (this.sanctuaryActive && result.purgedRows > 0) result.attack = Number((result.attack + result.purgedRows * 0.5).toFixed(2));
    }
    if (effect.selfGarbage) {
      this.receiveGarbage(effect.selfGarbage);
      labels.push(`SELF +${effect.selfGarbage}`);
    }
    if (effect.enemyGarbage) {
      result.enemyGarbage = effect.enemyGarbage;
      labels.push(`ENEMY +${effect.enemyGarbage}`);
    }
    if (effect.dispelEnemy) {
      result.dispelEnemy = true;
      labels.push('DISPEL');
    }
    result.triggered = labels.length > 0;
    result.text = labels.join(' ');
    return result;
  }

  clearLines() {
    const empty = { cleared: 0, fullCleared: 0, attack: 0, mana: 0, bombRows: [], purge: false, slow: 0, gold: 0, chargeGained: 0, tetris: false, tSpin: false };
    const fullRows = new Set();
    for (let r = 0; r < this.rows; r++) if (this.grid[r].every(Boolean)) fullRows.add(r);
    if (!fullRows.size) return empty;

    // 지속 가비지: 완성된 줄에 지속 가비지 칸이 있으면 즉시 제거하지 않고 숫자를 1 줄인다.
    // 숫자가 남아있으면 플레이어가 채운 칸을 비워 다시 구멍을 만들고, 0이 되면 정상 제거한다.
    for (const r of [...fullRows]) {
      const row = this.grid[r];
      if (!row.some(c => c?.traits.includes('durable'))) continue;
      let alive = false;
      for (const c of row) {
        if (c?.traits.includes('durable')) {
          c.hp = (c.hp || 1) - 1;
          if (c.hp > 0) alive = true;
        }
      }
      if (alive) {
        for (let x = 0; x < this.cols; x++) {
          if (!row[x]?.traits.includes('durable')) row[x] = null;
        }
        fullRows.delete(r);
      }
    }
    if (!fullRows.size) return empty;

    // 사슬 캐스케이드: 서로 다른 사슬 미노 2개 이상이 연결된 그룹만 발동한다.
    // (사슬 블록 하나만으로는 일반 블록과 동일하게 작동.)
    const bonusRows = new Set();
    for (const comp of this.chainComponents()) {
      const pieceIds = new Set(comp.map(({ x, y }) => this.grid[y][x]?.pieceId));
      pieceIds.delete(undefined);
      if (pieceIds.size < 2) continue;
      if (comp.some(({ y }) => fullRows.has(y))) {
        for (const { y } of comp) if (!fullRows.has(y)) bonusRows.add(y);
      }
    }

    let attack = 0;
    let mana = 0;
    let coolantCells = 0;
    let gold = 0;
    let chargeGained = 0;
    const bombRows = [];
    const bombCells = [];
    const timeBombCells = [];
    let purge = false;

    const rows = [...fullRows, ...bonusRows];
    for (const r of rows) {
      const row = this.grid[r];
      const factor = bonusRows.has(r) ? 0.5 : 1;
      attack += row.reduce((sum, c) => sum + (c ? c.attack : 0), 0) * factor;
      mana += (row.reduce((sum, c) => sum + (c ? (c.traits.includes('garbage') ? 0.4 : 0.5) : 0), 0)
              + row.filter(c => c && c.traits.includes('manaBonus')).length * 4) * factor;
      row.forEach((c, x) => {
        if (!c) return;
        if (c.traits.includes('bomb')) bombCells.push({ x, y: r });
        if (c.traits.includes('timeBomb')) timeBombCells.push({ x, y: r });
      });
      if (row.some(c => c?.traits.includes('bomb'))) bombRows.push(r);
      if (row.some(c => c?.traits.includes('purgeGarbage'))) purge = true;
      coolantCells += row.filter(c => c?.traits.includes('coolant')).length;
      gold += row.filter(c => c?.traits.includes('bounty')).length;
      chargeGained += row.filter(c => c?.traits.includes('comboCharge')).length;
    }

    const clearSet = new Set(rows);
    const kept = this.grid.filter((_, r) => !clearSet.has(r));
    while (kept.length < this.rows) kept.unshift(emptyRow());
    this.grid = kept;

    const clearedBelow = y => rows.filter(r => r > y).length;
    const drops = [];
    const bombR = 1 + this.explodeRadiusBonus;
    const timeR = 2 + this.explodeRadiusBonus;
    for (const { x, y } of bombCells) {
      const targetY = Math.min(this.rows - 1, y + clearedBelow(y));
      this.explodeBombAt(x, targetY, bombR);
      drops.push({ x, y: targetY, radius: bombR });
    }
    for (const { x, y } of timeBombCells) {
      const targetY = Math.min(this.rows - 1, y + clearedBelow(y));
      this.explodeBombAt(x, targetY, timeR);
      drops.push({ x, y: targetY, radius: timeR });
    }
    if (drops.length) this.queueExplosionDrops(drops);
    if (purge) {
      const purgedRows = this.purgeGarbageRows(1);
      if (this.sanctuaryActive && purgedRows > 0) attack += purgedRows * 0.5;
    }
    return {
      cleared: rows.length,
      fullCleared: fullRows.size,
      attack: Number(attack.toFixed(2)),
      mana: Number(mana.toFixed(2)),
      bombRows,
      purge,
      slow: coolantCells * GAME_TIMING.COOLANT_SLOW,
      gold,
      chargeGained,
      tetris: false,
      tSpin: false
    };
  }

  chainComponents() {
    const seen = Array.from({ length: this.rows }, () => new Array(this.cols).fill(false));
    const comps = [];
    const isChain = (y, x) => y >= 0 && y < this.rows && x >= 0 && x < this.cols && !!this.grid[y][x]?.traits.includes('chain');
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!isChain(r, c) || seen[r][c]) continue;
        const comp = [];
        const stack = [[r, c]];
        seen[r][c] = true;
        while (stack.length) {
          const [y, x] = stack.pop();
          comp.push({ x, y });
          for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = y + dy;
            const nx = x + dx;
            if (isChain(ny, nx) && !seen[ny][nx]) {
              seen[ny][nx] = true;
              stack.push([ny, nx]);
            }
          }
        }
        comps.push(comp);
      }
    }
    return comps;
  }

  tickTimeBombs(skip = new Set()) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const target = this.grid[r][c];
        if (skip.has(`${c},${r}`)) continue;
        if (!target || !(target.fuse > 0)) continue;
        target.fuse -= 1;
        if (target.fuse <= 0) {
          this.grid[r][c] = null;
          this.bombFx.push({ x: c, y: r, timer: GAME_TIMING.BOMB_FX_FLASH, kind: 'fuse', radius: 0 });
        }
      }
    }
  }

  explodeBombAt(x, y, radius = 1) {
    this.bombFx.push({ x, y, timer: GAME_TIMING.BOMB_FX_FLASH, radius });
    const chained = [];
    for (let r = Math.max(0, y - radius); r <= Math.min(this.rows - 1, y + radius); r++) {
      for (let c = Math.max(0, x - radius); c <= Math.min(this.cols - 1, x + radius); c++) {
        const cell = this.grid[r][c];
        if (this.chainReactor && cell && !(r === y && c === x)) {
          if (cell.traits.includes('bomb')) chained.push({ x: c, y: r, radius: 1 });
          else if (cell.traits.includes('timeBomb')) chained.push({ x: c, y: r, radius: 2 });
        }
        this.grid[r][c] = null;
      }
    }
    for (const ch of chained) this.explodeBombAt(ch.x, ch.y, ch.radius);
  }

  dropCellsAbove(x, y) {
    const targetY = Math.min(this.rows - 1, y);
    let write = targetY;
    for (let r = targetY; r >= 0; r--) {
      if (this.grid[r][x]) {
        if (write !== r) {
          this.grid[write][x] = this.grid[r][x];
          this.grid[r][x] = null;
        }
        write--;
      }
    }
  }

  compactColumns(cols) {
    for (const x of cols) {
      const stack = [];
      for (let r = this.rows - 1; r >= 0; r--) if (this.grid[r][x]) stack.push(this.grid[r][x]);
      for (let r = this.rows - 1; r >= 0; r--) this.grid[r][x] = stack.length ? stack.shift() : null;
    }
  }

  dropCellsAboveExplosion(x, y, radius = 1) {
    const bottomY = Math.min(this.rows - 1, y + radius);
    for (let c = Math.max(0, x - radius); c <= Math.min(this.cols - 1, x + radius); c++) {
      this.dropCellsAbove(c, bottomY);
    }
  }

  // 폭발로 비운 직후 위 칸을 곧바로 당기지 않고, 잠깐 뒤에 떨어뜨려 자연스럽게 보이게 한다.
  queueExplosionDrops(drops) {
    this.flushPendingDrops();
    this.pendingDrops = drops.map(d => ({ ...d }));
    this.pendingDropTimer = GAME_TIMING.EXPLOSION_DROP_DELAY;
  }

  flushPendingDrops() {
    if (!this.pendingDrops?.length) {
      this.pendingDropTimer = 0;
      return;
    }
    const drops = this.pendingDrops;
    this.pendingDrops = [];
    this.pendingDropTimer = 0;
    for (const d of drops) this.dropCellsAboveExplosion(d.x, d.y, d.radius);
  }

  detonateAll() {
    const targets = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell?.traits.includes('bomb')) targets.push({ x: c, y: r, radius: 1 });
        else if (cell?.traits.includes('timeBomb')) targets.push({ x: c, y: r, radius: 2 });
      }
    }
    for (const t of targets) this.explodeBombAt(t.x, t.y, t.radius);
    if (targets.length) this.queueExplosionDrops(targets.map(t => ({ x: t.x, y: t.y, radius: t.radius })));
    return targets.length;
  }

  clearLabel(result) {
    const parts = [];
    if (result.tSpin) parts.push('T-SPIN');
    if (result.cleared >= 5) parts.push(`OVERKILL x${result.cleared}`);
    else if (result.cleared === 4) parts.push('QUAD');
    else if (result.cleared === 3) parts.push('TRIPLE');
    else if (result.cleared === 2) parts.push('DOUBLE');
    if (!parts.length && result.cleared === 1) parts.push('SINGLE');
    return parts.join(' ');
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
    const n = Math.max(0, Math.ceil(amount));
    if (n > 0) this.garbageEntries.push({ amount: n, timer: GAME_TIMING.GARBAGE_ARM_DELAY });
  }

  addDurableGarbage(lines, hp = 2) {
    const hole = Math.floor(Math.random() * this.cols);
    for (let i = 0; i < lines; i++) {
      if (this.grid[0].some(Boolean)) {
        this.defeated = true;
        return;
      }
      this.grid.shift();
      this.bombFx.forEach(fx => { fx.y -= 1; });
      this.bombFx = this.bombFx.filter(fx => fx.y >= 0);
      this.grid.push(Array.from({ length: this.cols }, (_, c) => c === hole
        ? null
        : { type: TYPES.GARBAGE, attack: 0.08, traits: ['garbage', 'durable'], hp }));
    }
  }

  wouldOverflowGarbage(lines) {
    const n = Math.max(0, Math.ceil(lines));
    return this.grid.slice(0, Math.min(n, this.rows)).some(row => row.some(Boolean));
  }

  tickGarbage(dt) {
    for (const entry of this.garbageEntries) entry.timer = Math.max(0, entry.timer - dt);
  }

  tickEffects(dt) {
    this.bombFx.forEach(fx => { fx.timer = Math.max(0, fx.timer - dt); });
    this.bombFx = this.bombFx.filter(fx => fx.timer > 0);
    if (this.pendingDropTimer > 0) {
      this.pendingDropTimer = Math.max(0, this.pendingDropTimer - dt);
      if (this.pendingDropTimer === 0) this.flushPendingDrops();
    }
  }

  readyGarbage() {
    return this.garbageEntries.reduce((sum, entry) => sum + (entry.timer <= 0 ? entry.amount : 0), 0);
  }

  cancelGarbage(amount) {
    let remaining = Math.max(0, Math.floor(amount));
    if (remaining <= 0) return 0;
    let canceled = 0;
    for (const entry of this.garbageEntries) {
      if (remaining <= 0) break;
      const take = Math.min(entry.amount, remaining);
      entry.amount -= take;
      remaining -= take;
      canceled += take;
    }
    this.garbageEntries = this.garbageEntries.filter(entry => entry.amount > 0);
    return canceled;
  }

  applyReadyGarbage() {
    const ready = this.readyGarbage();
    if (ready <= 0) return 0;
    this.garbageEntries = this.garbageEntries.filter(entry => entry.timer > 0);
    this.applyGarbage(ready);
    return ready;
  }

  applyGarbage(lines) {
    this.flushPendingDrops();
    const hole = Math.floor(Math.random() * this.cols);
    for (let i = 0; i < lines; i++) {
      if (this.grid[0].some(Boolean)) {
        this.defeated = true;
        return;
      }
      this.grid.shift();
      this.bombFx.forEach(fx => { fx.y -= 1; });
      this.bombFx = this.bombFx.filter(fx => fx.y >= 0);
      this.grid.push(Array.from({ length: this.cols }, (_, c) => c === hole ? null : { type: TYPES.GARBAGE, attack: 0.08, traits: ['garbage'] }));
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

  scramble() {
    for (let r = 0; r < this.rows; r++) {
      const row = this.grid[r];
      if (!row.some(Boolean)) continue;
      const shift = Math.random() < 0.5 ? -1 : 1;
      const next = Array.from({ length: this.cols }, () => null);
      for (let c = 0; c < this.cols; c++) {
        if (!row[c]) continue;
        const nc = c + shift;
        if (nc >= 0 && nc < this.cols) next[nc] = row[c];
        else next[c] = row[c];
      }
      this.grid[r] = next;
    }
  }

  punchHoles(count = 5) {
    const filled = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) filled.push([r, c]);
      }
    }
    for (let i = filled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filled[i], filled[j]] = [filled[j], filled[i]];
    }
    let punched = 0;
    for (const [r, c] of filled) {
      if (punched >= count) break;
      this.grid[r][c] = null;
      punched++;
    }
    return punched;
  }

  shaveBottom(count = 2) {
    let removed = 0;
    for (let r = this.rows - 1; r >= 0 && removed < count; r--) {
      if (this.grid[r].some(Boolean)) {
        this.grid.splice(r, 1);
        this.grid.unshift(emptyRow());
        removed++;
        r++;
      }
    }
    return removed;
  }

  rerollQueue() {
    this.deck.refill();
    this.nextQueue = [];
    this.fillQueue();
  }

  clearAllGarbage() {
    const kept = this.grid.filter(row => !row.some(c => c?.type === TYPES.GARBAGE));
    const removed = this.rows - kept.length;
    while (kept.length < this.rows) kept.unshift(emptyRow());
    this.grid = kept;
    this.garbageEntries = [];
    return removed;
  }

  collapseColumns() {
    for (let c = 0; c < this.cols; c++) {
      const stack = [];
      for (let r = 0; r < this.rows; r++) if (this.grid[r][c]) stack.push(this.grid[r][c]);
      for (let r = this.rows - 1; r >= 0; r--) this.grid[r][c] = stack.pop() || null;
    }
  }

  magneticCollapse() {
    this.collapseColumns();
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
      pieceSerial: this.pieceSerial,
      garbageEntries: this.garbageEntries.map(entry => ({ ...entry })),
      garbageQueue: this.garbageQueue,
      mp: this.mp,
      combo: this.combo,
      comboBreakFlash: this.comboBreakFlash,
      clearText: this.clearText,
      clearTextFlash: this.clearTextFlash,
      bombFx: this.bombFx.map(fx => ({ ...fx })),
      defeated: this.defeated,
      lastAttack: this.lastAttack,
      lastMoveWasRotate: this.lastMoveWasRotate,
      flash: this.flash,
      attackPool: this.attackPool,
      nextAttackDouble: this.nextAttackDouble,
      attackChargeStacks: this.attackChargeStacks,
      rotateLocked: this.rotateLocked,
      iPieceForce: this.iPieceForce,
      mpCap: this.mpCap,
      comboGuard: this.comboGuard,
      comboGuardCharged: this.comboGuardCharged,
      chainReactor: this.chainReactor,
      overchargeShots: this.overchargeShots,
      forceCrushNext: this.forceCrushNext,
      explodeRadiusBonus: this.explodeRadiusBonus,
      sanctuaryActive: this.sanctuaryActive,
      chainResonator: this.chainResonator,
      comboEngine: this.comboEngine,
      pendingDrops: this.pendingDrops.map(d => ({ ...d })),
      pendingDropTimer: this.pendingDropTimer
    };
  }
}
