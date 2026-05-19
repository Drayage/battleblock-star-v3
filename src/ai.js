import { Mino } from './board.js?v=20260519-ko';
import { COLS } from './constants.js?v=20260519-ko';

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
  const rightWell = Math.max(0, Math.min(...heights.slice(0, -1)) - heights[COLS - 1]);
  const garbage = grid.reduce((sum, row) => sum + row.filter(c => c?.type === 'garbage').length, 0);
  return { rows, heights, totalHeight, maxHeight, secondHeight, spire, roughness, topCells, holes, bump, lines, rightWell, garbage };
}

function scoreGrid(grid, cleared, profile) {
  const ev = analyzeGrid(grid);
  const p = {
    balanced: { line: 9, hole: -8, height: -0.75, bump: -1.25, well: 0.1, garbage: -0.2 },
    fast: { line: 8, hole: -7, height: -0.62, bump: -1.05, well: 0.05, garbage: -0.1 },
    opener: { line: 12, hole: -6.5, height: -0.55, bump: -0.95, well: 0.15, garbage: -0.08 },
    stride: { line: 13, hole: -8.5, height: -0.7, bump: -1.1, well: 0.65, garbage: -0.12 },
    plonk: { line: 14, hole: -6.8, height: -0.45, bump: -0.95, well: 0.45, garbage: 0.02 },
    infds: { line: 7, hole: -10, height: -0.95, bump: -1.5, well: 0.1, garbage: -0.65 },
    stacker: { line: 9, hole: -9, height: -0.85, bump: -1.45, well: 0.25, garbage: -0.3 },
    elite: { line: 12, hole: -8, height: -0.62, bump: -1.05, well: 0.35, garbage: -0.1 }
  }[profile] || {
    line: 9, hole: -8, height: -0.75, bump: -1.25, well: 0.1, garbage: -0.2
  };
  const burst = cleared >= 4 ? 18 : cleared >= 2 ? 5 : 0;
  const dangerRows = Math.max(0, ev.maxHeight - (ev.rows - 5));
  const survival = dangerRows * -30 + ev.topCells * -14;
  const spirePenalty = ev.spire * ev.spire * -9;
  const roughnessPenalty = Math.max(0, ev.roughness - 7) * -5;
  const wellReward = ev.maxHeight < ev.rows - 7 ? ev.rightWell * p.well : 0;
  return cleared * p.line + burst + ev.holes * p.hole + ev.totalHeight * p.height + ev.bump * p.bump + wellReward + ev.garbage * p.garbage + survival + spirePenalty + roughnessPenalty;
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
  constructor(profile = 'balanced', skill = {}) {
    this.profile = profile;
    this.mistakeRate = skill.mistakeRate || 0;
    this.noise = skill.noise || 0;
    this.hesitateRate = skill.hesitateRate || 0;
    this.queue = [];
    this.lastPlanCard = null;
  }

  plan(board) {
    if (!board.current) return;
    const cardKey = `${board.current.card.id}-${board.current.x}-${board.current.y}-${board.held?.id || 'none'}`;
    if (this.queue.length && this.lastPlanCard === cardKey) return;
    this.lastPlanCard = cardKey;
    const noise = () => (this.profile === 'elite' ? Math.random() * 2 : 0) + Math.random() * this.noise;
    const candidates = [];
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS + 2; x++) {
        const m = new Mino(board.current.card, x, board.current.y);
        m.rot = rot;
        if (!board.ok(m)) continue;
        const s = simulate(board, m, this.profile) + noise();
        candidates.push({ x, rot, hold: false, s });
      }
    }
    if (!board.holdUsed && !board.holdLocked) {
      const playCard = board.held || board.nextQueue[0];
      if (playCard) {
        for (let rot = 0; rot < 4; rot++) {
          for (let x = -2; x < COLS + 2; x++) {
            const m = new Mino(playCard, x, board.current.y);
            m.rot = rot;
            if (!board.ok(m)) continue;
            const s = simulate(board, m, this.profile) + noise();
            candidates.push({ x, rot, hold: true, s });
          }
        }
      }
    }
    candidates.sort((a, b) => b.s - a.s);
    const mistakeWindow = Math.min(candidates.length - 1, 2 + Math.floor(Math.random() * 7));
    const best = Math.random() < this.mistakeRate ? candidates[Math.max(0, mistakeWindow)] : candidates[0];
    if (!best) return;
    this.queue = [];
    if (best.hold) this.queue.push('hold');
    const startRot = best.hold ? 0 : board.current.rot;
    const startX = best.hold ? 3 : board.current.x;
    const turns = (best.rot - startRot + 4) % 4;
    for (let i = 0; i < turns; i++) this.queue.push('rotate');
    const dx = best.x - startX;
    for (let i = 0; i < Math.abs(dx); i++) this.queue.push(dx > 0 ? 'right' : 'left');
    if (Math.random() < this.hesitateRate) this.queue.push('wait');
    this.queue.push('hard');
  }

  step(board) {
    this.plan(board);
    const action = this.queue.shift();
    if (action === 'left') { board.move(-1, 0); return null; }
    if (action === 'right') { board.move(1, 0); return null; }
    if (action === 'rotate') { board.rotate(1); return null; }
    if (action === 'hold') { board.hold(); return null; }
    if (action === 'wait') return null;
    if (action === 'hard') return board.hardDrop();
    if (board.current && !board.defeated) return board.hardDrop();
    return null;
  }
}
