import { COLS, COLORS, TYPES } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(playerRows, enemyRows) {
    const mobile = window.innerWidth < 720;
    const rows = Math.max(playerRows, enemyRows);
    const cell = mobile ? Math.max(13, Math.min(22, Math.floor((window.innerWidth - 34) / 15))) : 25;
    this.layout = {
      mobile,
      cell,
      rows,
      w: mobile ? 390 : 940,
      h: Math.max(590, rows * cell + 150),
      pX: mobile ? 12 : 150,
      eX: mobile ? 272 : 600,
      y: 72
    };
    this.canvas.width = this.layout.w;
    this.canvas.height = this.layout.h;
    const scale = Math.min(1, (window.innerWidth - 8) / this.layout.w, (window.innerHeight - 162) / this.layout.h);
    this.canvas.style.transform = `scale(${scale})`;
    this.canvas.parentElement.style.height = `${Math.ceil(this.layout.h * scale)}px`;
  }

  draw({ player, enemy, run, battle, enemyCard, message }) {
    if (!this.layout) this.resize(player.rows, enemy.rows);
    const L = this.layout;
    const ctx = this.ctx;
    ctx.fillStyle = '#090b14';
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.fillStyle = '#d7e5ff';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`Round ${run.round} / 20`, L.w / 2, 26);
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#7f8ca8';
    ctx.fillText(`${enemyCard.name} · Gold ${run.gold} · HP ${run.hpRows}`, L.w / 2, 47);
    ctx.textAlign = 'left';
    this.board(player, L.pX, L.y, L.cell, 'YOU');
    this.garbageMeter(player.garbageQueue, L.pX - 10, L.y, player.rows * L.cell);
    if (L.mobile) {
      const sideX = L.pX + COLS * L.cell + 10;
      this.sidePanel(player, sideX, L.y, L.cell, run, true);
      this.miniEnemy(enemy, sideX, L.y + 236);
    } else {
      this.board(enemy, L.eX, L.y, L.cell, 'ENEMY');
      this.garbageMeter(enemy.garbageQueue, L.eX - 12, L.y, enemy.rows * L.cell);
      this.sidePanel(player, 20, L.y, L.cell, run);
    }
    this.status(player, enemy, run, battle, message);
  }

  board(board, ox, oy, cs, label) {
    const ctx = this.ctx;
    const bw = COLS * cs;
    const bh = board.rows * cs;
    ctx.fillStyle = '#111526';
    ctx.fillRect(ox, oy, bw, bh);
    ctx.strokeStyle = board.defeated ? '#ff405c' : '#2a3e78';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, bw, bh);
    ctx.fillStyle = '#a9b7d6';
    ctx.font = `bold ${Math.max(9, cs * 0.45)}px Courier New`;
    ctx.fillText(label, ox, oy - 6);
    ctx.strokeStyle = '#1f2840';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < board.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cs);
      ctx.lineTo(ox + bw, oy + r * cs);
      ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cs, oy);
      ctx.lineTo(ox + c * cs, oy + bh);
      ctx.stroke();
    }
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board.grid[r][c]) this.cell(ox + c * cs, oy + r * cs, cs, board.grid[r][c].type);
      }
    }
    if (board.current && !board.defeated) {
      const gy = board.ghostY();
      const ghost = board.current.clone();
      ghost.y = gy;
      ctx.strokeStyle = COLORS[board.current.card.id] || '#fff';
      ctx.globalAlpha = 0.55;
      for (const { x, y } of ghost.cells) if (y >= 0) ctx.strokeRect(ox + x * cs + 3, oy + y * cs + 3, cs - 6, cs - 6);
      ctx.globalAlpha = 1;
      for (const { x, y } of board.current.cells) if (y >= 0) this.cell(ox + x * cs, oy + y * cs, cs, board.current.card.id);
    }
    if (board.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, board.flash / 300)})`;
      ctx.fillRect(ox, oy, bw, bh);
    }
  }

  cell(x, y, cs, type) {
    const ctx = this.ctx;
    const pad = Math.max(1, Math.floor(cs * 0.08));
    ctx.fillStyle = COLORS[type] || '#d9e0ef';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, Math.max(2, Math.floor(cs * 0.15)));
    if (type === TYPES.GARBAGE) return;
    if (cs >= 16) {
      const mark = type === TYPES.BOMB ? 'B' : type === TYPES.POWER_I ? 'P' : type === TYPES.CROSS ? '+' : type === TYPES.MANA_T ? 'M' : type === TYPES.PURGE_O ? 'C' : '';
      if (mark) {
        ctx.fillStyle = '#06101d';
        ctx.font = `bold ${Math.floor(cs * 0.48)}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(mark, x + cs / 2, y + cs * 0.68);
        ctx.textAlign = 'left';
      }
    }
  }

  sidePanel(board, ox, oy, cs, run, compact = false) {
    const ctx = this.ctx;
    const width = compact ? 104 : 110;
    ctx.fillStyle = '#0f1424';
    ctx.fillRect(ox, oy, width, 160);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox, oy, width, 160);
    ctx.fillStyle = '#9fb2dc';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText('HOLD', ox + 8, oy + 18);
    if (board.held) this.preview(board.held, ox + 20, oy + 28, Math.max(7, cs * 0.48));
    ctx.fillText('NEXT', ox + 8, oy + 78);
    board.nextQueue.slice(0, 3).forEach((card, i) => this.preview(card, ox + 14, oy + 88 + i * 23, Math.max(6, cs * 0.38)));
    ctx.fillStyle = '#10192d';
    ctx.fillRect(ox, oy + 172, width, 14);
    ctx.fillStyle = '#38d0ff';
    ctx.fillRect(ox, oy + 172, Math.min(width, board.mp * (width / 100)), 14);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox, oy + 172, width, 14);
    ctx.fillStyle = '#e2efff';
    ctx.font = '10px Courier New';
    ctx.fillText(`MP ${Math.floor(board.mp)}`, ox + 6, oy + 183);
    run.equippedSkills.forEach((id, i) => {
      ctx.fillStyle = board.mp >= window.BBS_SKILLS[id].cost ? '#172d44' : '#111522';
      ctx.fillRect(ox, oy + 196 + i * 25, width, 20);
      ctx.strokeStyle = '#24415d';
      ctx.strokeRect(ox, oy + 196 + i * 25, width, 20);
      ctx.fillStyle = '#b7c8e8';
      ctx.fillText(`${i + 1}. ${window.BBS_SKILLS[id].name}`, ox + 5, oy + 210 + i * 25);
    });
  }

  preview(card, ox, oy, cs) {
    const shape = card.shape[0];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) this.cell(ox + c * cs, oy + r * cs, cs, card.id);
      }
    }
  }

  miniEnemy(enemy, ox, oy) {
    const cs = 5;
    this.ctx.fillStyle = '#a9b7d6';
    this.ctx.font = 'bold 9px Courier New';
    this.ctx.fillText('ENEMY', ox, oy - 5);
    this.board(enemy, ox, oy, cs, '');
    this.garbageMeter(enemy.garbageQueue, ox + COLS * cs + 5, oy, enemy.rows * cs);
  }

  garbageMeter(amount, ox, oy, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#080a10';
    ctx.fillRect(ox, oy, 7, h);
    const cells = Math.min(Math.ceil(amount), Math.floor(h / 8));
    for (let i = 0; i < cells; i++) {
      ctx.fillStyle = amount >= 8 ? '#ff335f' : amount >= 4 ? '#ff9f2f' : '#d7c64a';
      ctx.fillRect(ox + 1, oy + h - 7 - i * 8, 5, 6);
    }
    ctx.strokeStyle = '#29344f';
    ctx.strokeRect(ox, oy, 7, h);
  }

  status(player, enemy, run, battle, message) {
    const ctx = this.ctx;
    const y = this.layout.h - 58;
    ctx.fillStyle = '#101522';
    ctx.fillRect(18, y, this.layout.w - 36, 40);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(18, y, this.layout.w - 36, 40);
    ctx.fillStyle = '#dbe7ff';
    ctx.font = '12px Courier New';
    const text = message || `Incoming shown by side meters | Last Attack ${player.lastAttack.toFixed(1)} | ${battle}`;
    ctx.fillText(text, 28, y + 25);
  }
}
