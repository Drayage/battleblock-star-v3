import { Mino } from './board.js?v=20260524-audio2';
import { COLS } from './constants.js?v=20260524-audio2';

function analyzeGrid(grid) {
  const rows = grid.length;
  const heights = Array(COLS).fill(0);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[r][c]) {
        heights[c] = rows - r;
        break;
      }
    }
  }
  let holes = 0;
  for (let c = 0; c < COLS; c++) {
    let seen = false;
    for (let r = 0; r < rows; r++) {
      if (grid[r][c]) seen = true;
      else if (seen) holes++;
    }
  }
  let bump = 0;
  for (let c = 0; c < COLS - 1; c++) bump += Math.abs(heights[c] - heights[c + 1]);
  let lines = 0;
  for (const row of grid) if (row.every(Boolean)) lines++;
  const totalHeight = heights.reduce((a, b) => a + b, 0);
  const maxHeight = Math.max(...heights);
  const secondHeight = [...heights].sort((a, b) => b - a)[1] || 0;
  const minHeight = Math.min(...heights);
  const spire = Math.max(0, maxHeight - secondHeight - 2);
  const roughness = maxHeight - minHeight;
  const topCells = grid.slice(0, 3).reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const bestWell = Math.max(...heights.map((height, c) => {
    const left = c === 0 ? height + 4 : heights[c - 1];
    const right = c === COLS - 1 ? height + 4 : heights[c + 1];
    return Math.max(0, Math.min(left, right) - height);
  }));
  const garbage = grid.reduce((sum, row) => sum + row.filter(c => c?.type === 'garbage').length, 0);
  return { rows, heights, totalHeight, maxHeight, secondHeight, spire, roughness, topCells, holes, bump, lines, bestWell, garbage };
}

function scoreGrid(grid, cleared, profile) {
  const ev = analyzeGrid(grid);
  const p = {
    balanced: { line: 13, hole: -7.5, height: -0.68, bump: -1.05, well: 0.18, garbage: -0.16 },
    fast: { line: 12, hole: -6.5, height: -0.55, bump: -0.9, well: 0.12, garbage: -0.08 },
    opener: { line: 16, hole: -6, height: -0.5, bump: -0.8, well: 0.22, garbage: -0.06 },
    stride: { line: 13, hole: -8.5, height: -0.7, bump: -1.1, well: 0.65, garbage: -0.12 },
    plonk: { line: 14, hole: -6.8, height: -0.45, bump: -0.95, well: 0.45, garbage: 0.02 },
    infds: { line: 7, hole: -10, height: -0.95, bump: -1.5, well: 0.1, garbage: -0.65 },
    stacker: { line: 9, hole: -9, height: -0.85, bump: -1.45, well: 0.25, garbage: -0.3 },
    elite: { line: 12, hole: -8, height: -0.62, bump: -1.05, well: 0.35, garbage: -0.1 },
    aggro: { line: 16, hole: -5.0, height: -0.42, bump: -0.7, well: 0.1, garbage: 0.06 },
    turtle: { line: 8, hole: -11, height: -1.0, bump: -1.6, well: 0.06, garbage: -0.72 },
    spiker: { line: 14, hole: -9, height: -0.72, bump: -1.15, well: 1.05, garbage: -0.12 },
    cheese: { line: 11, hole: -5.5, height: -0.5, bump: -0.85, well: 0.28, garbage: 0.08 }
  }[profile] || {
    line: 9, hole: -8, height: -0.75, bump: -1.25, well: 0.1, garbage: -0.2
  };
  const burst = cleared >= 4 ? 24 : cleared >= 2 ? 8 : cleared > 0 ? 3 : 0;
  const dangerRows = Math.max(0, ev.maxHeight - (ev.rows - 5));
  const survival = dangerRows * -30 + ev.topCells * -14;
  const spirePenalty = ev.spire * ev.spire * -9;
  const roughnessPenalty = Math.max(0, ev.roughness - 7) * -5;
  const wellReward = ev.maxHeight < ev.rows - 7 ? ev.bestWell * p.well : 0;
  return cleared * p.line + burst + ev.holes * p.hole + ev.totalHeight * p.height + ev.bump * p.bump + wellReward + ev.garbage * p.garbage + survival + spirePenalty + roughnessPenalty;
}

function tryReachOrder(board, playCard, startX, startY, startRot, targetX, targetRot, rotateFirst) {
  const sim = Object.create(Object.getPrototypeOf(board));
  Object.assign(sim, board);
  const test = new Mino(playCard, startX, startY);
  test.rot = startRot;
  if (!board.ok(test)) return null;
  sim.current = test;
  const actions = [];
  const turns = (targetRot - startRot + 4) % 4;
  const doRotates = () => {
    for (let i = 0; i < turns; i++) {
      if (!sim.rotate(1)) return false;
      actions.push('rotate');
    }
    return true;
  };
  const doMovesTo = toX => {
    while (sim.current.x !== toX) {
      const step = toX > sim.current.x ? 1 : -1;
      if (!board.ok(sim.current, step, 0)) return false;
      sim.current.x += step;
      actions.push(step > 0 ? 'right' : 'left');
    }
    return true;
  };
  if (rotateFirst) {
    if (!doRotates() || !doMovesTo(targetX)) return null;
  } else {
    if (!doMovesTo(targetX) || !doRotates() || !doMovesTo(targetX)) return null;
  }
  if (sim.current.x !== targetX || sim.current.rot !== targetRot) return null;
  return actions;
}

export function findReachPlan(board, { x, rot, hold = false }) {
  if (!board.current) return null;
  const playCard = hold ? board.held || board.nextQueue[0] : board.current.card;
  if (!playCard) return null;
  const startX = hold ? 3 : board.current.x;
  const startY = board.current.y;
  const startRot = hold ? 0 : board.current.rot;
  return tryReachOrder(board, playCard, startX, startY, startRot, x, rot, true)
    || tryReachOrder(board, playCard, startX, startY, startRot, x, rot, false);
}

export function canReachCandidate(board, target) {
  return findReachPlan(board, target) !== null;
}

function simulate(board, mino, profile) {
  const grid = board.grid.map(r => [...r]);
  const test = mino.clone();
  const fits = candidate => candidate.cells.every(({ x, y }) => x >= 0 && x < COLS && y < board.rows && (y < 0 || !grid[y][x]));
  while (true) {
    const next = test.clone();
    next.y++;
    if (!fits(next)) break;
    test.y++;
  }
  for (const { x, y } of test.cells) {
    if (y < 0) return { s: -1e9, danger: 1e9 };
    if (y >= 0 && y < board.rows) grid[y][x] = { type: test.card.id, attack: test.card.cellAttack, traits: [] };
  }
  let cleared = 0;
  for (let r = grid.length - 1; r >= 0; r--) {
    if (grid[r].every(Boolean)) {
      grid.splice(r, 1);
      grid.unshift(Array.from({ length: COLS }, () => null));
      cleared++;
      r++;
    }
  }
  const ev = analyzeGrid(grid);
  const dangerRows = Math.max(0, ev.maxHeight - (ev.rows - 5));
  const danger = dangerRows * 4 + ev.topCells + ev.spire * 0.5;
  return { s: scoreGrid(grid, cleared, profile), danger };
}

export class AI {
  constructor(profile = 'balanced', skill = {}) {
    this.profile = profile;
    this.mistakeRate = skill.mistakeRate || 0;
    this.mistakeGap = skill.mistakeGap || 12;
    this.hesitateRate = skill.hesitateRate || 0;
    this.confidenceHesitate = 0;
    this.mistakePressure = 0;
    this.focus = 0;
    this.mistakeCooldown = 0;
    this.lastPieceSerial = null;
    this.lastHoldSerial = null;
    this.lastAction = null;
    this.queue = [];
    this.lastPlanCard = null;
  }

  setPressure({ mistake = 0, hesitate = 0, focus = 0 } = {}) {
    this.mistakePressure = mistake;
    this.confidenceHesitate = hesitate;
    this.focus = focus;
  }

  pickSafeMistake(candidates) {
    if (candidates.length <= 1) return candidates[0];
    const best = candidates[0];
    const pool = candidates
      .slice(1, 7)
      .filter(c => c.s > -1e8 && best.s - c.s < 8 && c.danger <= best.danger + 0.5);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  cacheKey(board) {
    const next = board.nextQueue.slice(0, 2).map(card => card?.id || 'none').join('/');
    const held = board.held?.id || 'none';
    return [
      board.pieceSerial,
      board.current?.card.id,
      board.current?.x,
      board.current?.y,
      board.current?.rot,
      board.holdUsed ? 'h1' : 'h0',
      board.holdLocked ? 'l1' : 'l0',
      held,
      next
    ].join('|');
  }

  plan(board) {
    if (!board.current) return;
    const cardKey = this.cacheKey(board);
    if (this.queue.length && this.lastPlanCard === cardKey) return;
    this.lastPlanCard = cardKey;
    if (board.pieceSerial !== this.lastPieceSerial) {
      this.lastPieceSerial = board.pieceSerial;
      if (this.mistakeCooldown > 0) this.mistakeCooldown--;
    }
    const candidates = [];
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS + 2; x++) {
        const m = new Mino(board.current.card, x, board.current.y);
        m.rot = rot;
        if (!board.ok(m)) continue;
        const path = findReachPlan(board, { x, rot, hold: false });
        if (!path) continue;
        const { s, danger } = simulate(board, m, this.profile);
        candidates.push({ x, rot, hold: false, s, danger, path });
      }
    }
    const canHoldThisPiece = !board.holdUsed && !board.holdLocked && this.lastHoldSerial !== board.pieceSerial;
    if (canHoldThisPiece) {
      const playCard = board.held || board.nextQueue[0];
      if (playCard) {
        for (let rot = 0; rot < 4; rot++) {
          for (let x = -2; x < COLS + 2; x++) {
            const m = new Mino(playCard, x, board.current.y);
            m.rot = rot;
            if (!board.ok(m)) continue;
            const path = findReachPlan(board, { x, rot, hold: true });
            if (!path) continue;
            const { s, danger } = simulate(board, m, this.profile);
            candidates.push({ x, rot, hold: true, s, danger, path });
          }
        }
      }
    }
    candidates.sort((a, b) => b.s - a.s);
    let best = candidates[0];
    if (!best) return;
    const effectiveMistake = (this.mistakeRate + this.mistakePressure) * (1 - this.focus);
    if (this.mistakeCooldown === 0 && effectiveMistake > 0 && Math.random() < effectiveMistake) {
      const alt = this.pickSafeMistake(candidates);
      if (alt) {
        best = alt;
        this.mistakeCooldown = this.mistakeGap;
      }
    }
    this.queue = [];
    if (best.hold) this.queue.push('hold');
    for (const action of best.path) this.queue.push(action);
    const hesitateChance = Math.max(0, Math.min(0.9, this.hesitateRate + this.confidenceHesitate) * (1 - this.focus));
    if (Math.random() < hesitateChance) this.queue.push('wait');
    this.queue.push('hard');
  }

  step(board) {
    this.plan(board);
    const action = this.queue.shift();
    this.lastAction = action || null;
    if (action === 'left') { board.move(-1, 0); return null; }
    if (action === 'right') { board.move(1, 0); return null; }
    if (action === 'rotate') { board.rotate(1); return null; }
    if (action === 'hold') {
      if (!board.holdUsed && this.lastHoldSerial !== board.pieceSerial && board.hold()) {
        this.lastHoldSerial = board.pieceSerial;
      }
      return null;
    }
    if (action === 'wait') return null;
    if (action === 'hard') return board.hardDrop();
    if (board.current && !board.defeated) return board.hardDrop();
    return null;
  }
}
