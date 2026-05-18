import { Mino } from './board.js?v=20260518-lockdelay1';
import { COLS } from './constants.js?v=20260518-lockdelay1';

function scoreGrid(grid) {
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
  return lines * 8 - holes * 2.8 - heights.reduce((a, b) => a + b, 0) * 0.35 - bump * 0.55;
}

function simulate(board, mino) {
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
    if (y >= 0 && y < board.rows) grid[y][x] = { type: test.card.id, attack: test.card.cellAttack, traits: [] };
  }
  return scoreGrid(grid);
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
        const m = new Mino(board.current.card, x, 0);
        m.rot = rot;
        if (!board.ok(m)) continue;
        const s = simulate(board, m) + (this.profile === 'elite' ? Math.random() * 2 : 0);
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
    return null;
  }
}
