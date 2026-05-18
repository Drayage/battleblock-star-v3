import { Mino } from './board.js?v=20260518-aisurvive1';
import { COLS } from './constants.js?v=20260518-aisurvive1';

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
  const topCells = grid.slice(0, 3).reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const rightWell = Math.max(0, Math.min(...heights.slice(0, -1)) - heights[COLS - 1]);
  const garbage = grid.reduce((sum, row) => sum + row.filter(c => c?.type === 'garbage').length, 0);
  return { rows, heights, totalHeight, maxHeight, topCells, holes, bump, lines, rightWell, garbage };
}

function scoreGrid(grid, cleared, profile) {
  const ev = analyzeGrid(grid);
  const p = {
    balanced: { line: 8, hole: -2.8, height: -0.35, bump: -0.55, well: 0.15, garbage: -0.12 },
    fast: { line: 7.5, hole: -2.1, height: -0.26, bump: -0.35, well: 0.05, garbage: -0.06 },
    opener: { line: 11, hole: -1.7, height: -0.2, bump: -0.25, well: 0.1, garbage: -0.04 },
    stride: { line: 13, hole: -3.1, height: -0.32, bump: -0.42, well: 1.4, garbage: -0.08 },
    plonk: { line: 15, hole: -1.3, height: 0.12, bump: -0.18, well: 0.9, garbage: 0.04 },
    infds: { line: 6.5, hole: -4.2, height: -0.62, bump: -0.85, well: 0.25, garbage: -0.55 },
    stacker: { line: 8.5, hole: -3.7, height: -0.48, bump: -0.8, well: 0.5, garbage: -0.25 },
    elite: { line: 12, hole: -2.8, height: -0.22, bump: -0.4, well: 0.8, garbage: -0.08 }
  }[profile] || {
    line: 8, hole: -2.8, height: -0.35, bump: -0.55, well: 0.15, garbage: -0.12
  };
  const burst = cleared >= 4 ? 18 : cleared >= 2 ? 5 : 0;
  const dangerRows = Math.max(0, ev.maxHeight - (ev.rows - 5));
  const survival = dangerRows * -24 + ev.topCells * -10;
  return cleared * p.line + burst + ev.holes * p.hole + ev.totalHeight * p.height + ev.bump * p.bump + ev.rightWell * p.well + ev.garbage * p.garbage + survival;
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
    if (y < 0) return -1e9;
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
  return scoreGrid(grid, cleared, profile);
}

export class AI {
  constructor(profile = 'balanced') {
    this.profile = profile;
    this.queue = [];
    this.lastPlanCard = null;
  }

  plan(board) {
    if (!board.current) return;
    const cardKey = `${board.current.card.id}-${board.current.x}-${board.current.y}`;
    if (this.queue.length && this.lastPlanCard === cardKey) return;
    this.lastPlanCard = cardKey;
    let best = null;
    let bestScore = -Infinity;
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS + 2; x++) {
        const m = new Mino(board.current.card, x, board.current.y);
        m.rot = rot;
        if (!board.ok(m)) continue;
        const s = simulate(board, m, this.profile) + (this.profile === 'elite' ? Math.random() * 2 : 0);
        if (s > bestScore) {
          bestScore = s;
          best = { x, rot };
        }
      }
    }
    if (!best) return;
    const turns = (best.rot - board.current.rot + 4) % 4;
    this.queue = [];
    for (let i = 0; i < turns; i++) this.queue.push('rotate');
    const dx = best.x - board.current.x;
    for (let i = 0; i < Math.abs(dx); i++) this.queue.push(dx > 0 ? 'right' : 'left');
    this.queue.push('hard');
  }

  step(board) {
    this.plan(board);
    const action = this.queue.shift();
    if (action === 'left') board.move(-1, 0);
    if (action === 'right') board.move(1, 0);
    if (action === 'rotate') board.rotate(1);
    if (action === 'hard') return board.hardDrop();
    if (board.current && !board.defeated) return board.hardDrop();
    return null;
  }
}
