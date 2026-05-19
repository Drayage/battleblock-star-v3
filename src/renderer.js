import { COLS, COLORS, GAME_TIMING, TYPES } from './constants.js?v=20260519-garbage1';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(playerRows, enemyRows) {
    const mobile = window.innerWidth < 720;
    const rows = Math.max(playerRows, enemyRows);
    const mobileWidth = Math.max(320, Math.min(430, window.innerWidth));
    const viewportH = Math.floor(window.visualViewport?.height || window.innerHeight);
    const mobileY = 52;
    const widthCell = Math.floor((mobileWidth - 44) / COLS);
    const heightCell = Math.floor((viewportH - 228) / playerRows);
    const cell = mobile ? Math.max(15, Math.min(24, widthCell, heightCell)) : 25;
    const mobileBoardBottom = mobileY + playerRows * cell;
    this.layout = {
      mobile,
      cell,
      rows,
      w: mobile ? mobileWidth : 940,
      h: mobile ? mobileBoardBottom + 160 : Math.max(590, rows * cell + 150),
      pX: mobile ? Math.floor((mobileWidth - COLS * cell) / 2) : 150,
      eX: mobile ? 272 : 600,
      y: mobile ? mobileY : 72
    };
    this.canvas.width = this.layout.w;
    this.canvas.height = this.layout.h;
    const scale = mobile
      ? Math.min(1, (window.innerWidth - 4) / this.layout.w)
      : Math.min(1, (window.innerWidth - 8) / this.layout.w, (window.innerHeight - 162) / this.layout.h);
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
    ctx.fillText(`${enemyCard.name} - Gold ${run.gold} - HP ${run.hpRows}`, L.w / 2, 47);
    ctx.textAlign = 'left';
    this.board(player, L.pX, L.y, L.cell, 'YOU');
    this.garbageMeter(player.garbageQueue, L.pX - 10, L.y, player.rows * L.cell);
    if (L.mobile) {
      this.mobileInfo(player, enemy, run, L.pX, L.y + player.rows * L.cell + 18, L.cell);
    } else {
      this.board(enemy, L.eX, L.y, L.cell, 'ENEMY');
      this.garbageMeter(enemy.garbageQueue, L.eX - 12, L.y, enemy.rows * L.cell);
      this.sidePanel(player, 20, L.y, L.cell, run);
    }
    if (battle === 'VICTORY' || battle === 'DEFEAT') this.battleOverlay(battle, L);
    if (!L.mobile) this.status(player, enemy, run, battle, message);
  }

  battleOverlay(kind, L) {
    const ctx = this.ctx;
    const text = kind === 'VICTORY' ? 'VICTORY' : 'DEFEAT';
    ctx.fillStyle = 'rgba(5,7,14,.58)';
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.fillStyle = kind === 'VICTORY' ? '#8dffb0' : '#ffcad5';
    ctx.font = `bold ${L.mobile ? 30 : 46}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText(text, L.w / 2, L.mobile ? 120 : L.h / 2);
    ctx.font = `${L.mobile ? 12 : 16}px Courier New`;
    ctx.fillStyle = '#d7e5ff';
    ctx.fillText(kind === 'VICTORY' ? 'Reward incoming...' : 'Run ending...', L.w / 2, L.mobile ? 146 : L.h / 2 + 38);
    ctx.textAlign = 'left';
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
      ctx.fillStyle = `rgba(210,230,255,${Math.min(0.18, board.flash / 700)})`;
      ctx.fillRect(ox, oy, bw, bh);
    }
    if (board.combo >= 2 || board.comboBreakFlash > 0) {
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(11, Math.floor(cs * 0.55))}px Courier New`;
      ctx.fillStyle = board.comboBreakFlash > 0 ? '#ffcad5' : '#ffe082';
      const label = board.comboBreakFlash > 0 ? 'COMBO BREAK' : `COMBO x${board.combo - 1}`;
      ctx.fillText(label, ox + bw / 2, oy + Math.max(18, cs));
      ctx.textAlign = 'left';
    }
    if (board.clearTextFlash > 0 && board.clearText) {
      const alpha = Math.min(1, board.clearTextFlash / 280);
      const lift = (1 - board.clearTextFlash / GAME_TIMING.CLEAR_FEEDBACK_FLASH) * cs * 1.2;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0.25, alpha);
      ctx.fillStyle = board.clearText.includes('T-SPIN') ? '#d8b4ff' : '#8dffcc';
      ctx.font = `bold ${Math.max(15, Math.floor(cs * 0.82))}px Courier New`;
      ctx.fillText(board.clearText, ox + bw / 2, oy + Math.max(cs * 2.1, 38) - lift);
      ctx.font = `bold ${Math.max(10, Math.floor(cs * 0.45))}px Courier New`;
      ctx.fillStyle = '#f4f8ff';
      ctx.fillText(`+${board.lastAttack.toFixed(1)}`, ox + bw / 2, oy + Math.max(cs * 3.0, 58) - lift);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
    if (board.defeated) {
      ctx.fillStyle = 'rgba(5,7,14,.72)';
      ctx.fillRect(ox, oy, bw, bh);
      ctx.fillStyle = '#ffcad5';
      ctx.font = `bold ${Math.max(13, Math.floor(cs * 0.8))}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText('DEFEATED', ox + bw / 2, oy + bh / 2);
      ctx.textAlign = 'left';
    }
  }

  cell(x, y, cs, type) {
    const ctx = this.ctx;
    const pad = Math.max(1, Math.floor(cs * 0.08));
    ctx.fillStyle = COLORS[type] || '#d9e0ef';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, Math.max(2, Math.floor(cs * 0.15)));
    if (type === TYPES.GARBAGE) return;
    if (cs >= 16) {
      const mark = type === TYPES.BOMB ? 'B'
        : type === TYPES.POWER_I || type === TYPES.POWER_CROSS ? 'P'
        : type === TYPES.CROSS ? '+'
        : type === TYPES.MANA_T ? 'M'
        : type === TYPES.PURGE_O ? 'C'
        : type === TYPES.HEAVY_JUNK || type === TYPES.WIDE_JUNK ? '!'
        : '';
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
    run.consumables.forEach((id, i) => {
      const item = window.BBS_CONSUMABLES[id];
      ctx.fillStyle = '#1f1a2d';
      ctx.fillRect(ox, oy + 276 + i * 22, width, 18);
      ctx.strokeStyle = '#534875';
      ctx.strokeRect(ox, oy + 276 + i * 22, width, 18);
      ctx.fillStyle = '#ded4ff';
      ctx.fillText(`${i + 4}. ${item?.name || id}`, ox + 5, oy + 289 + i * 22);
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

  mobileInfo(player, enemy, run, ox, oy, cs) {
    const ctx = this.ctx;
    const panelW = COLS * cs;
    ctx.fillStyle = '#0f1424';
    ctx.fillRect(ox, oy, panelW, 158);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox, oy, panelW, 158);
    ctx.fillStyle = '#9fb2dc';
    ctx.font = 'bold 10px Courier New';
    ctx.fillText('HOLD', ox + 8, oy + 17);
    ctx.fillText('NEXT', ox + Math.floor(panelW * 0.38), oy + 17);
    ctx.fillText('ENEMY', ox + Math.floor(panelW * 0.72), oy + 17);
    if (player.held) this.preview(player.held, ox + 10, oy + 28, 8);
    player.nextQueue.slice(0, 3).forEach((card, i) => this.preview(card, ox + Math.floor(panelW * 0.38) + i * 28, oy + 28, 7));
    this.board(enemy, ox + Math.floor(panelW * 0.72), oy + 27, 4, '');
    this.garbageMeter(enemy.garbageQueue, ox + panelW - 12, oy + 27, enemy.rows * 4);

    const mpY = oy + 96;
    ctx.fillStyle = '#10192d';
    ctx.fillRect(ox + 8, mpY, panelW - 16, 12);
    ctx.fillStyle = '#38d0ff';
    ctx.fillRect(ox + 8, mpY, Math.min(panelW - 16, player.mp * ((panelW - 16) / 100)), 12);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox + 8, mpY, panelW - 16, 12);
    ctx.fillStyle = '#e2efff';
    ctx.font = '9px Courier New';
    ctx.fillText(`MP ${Math.floor(player.mp)}`, ox + 12, mpY + 9);
    run.equippedSkills.forEach((id, i) => {
      const x = ox + 8 + i * Math.floor((panelW - 16) / 3);
      const w = Math.floor((panelW - 24) / 3);
      ctx.fillStyle = player.mp >= window.BBS_SKILLS[id].cost ? '#172d44' : '#111522';
      ctx.fillRect(x, oy + 112, w, 18);
      ctx.strokeStyle = '#24415d';
      ctx.strokeRect(x, oy + 112, w, 18);
    });
    run.consumables.forEach((id, i) => {
      const x = ox + 8 + i * Math.floor((panelW - 16) / 3);
      const w = Math.floor((panelW - 24) / 3);
      ctx.fillStyle = '#1f1a2d';
      ctx.fillRect(x, oy + 134, w, 18);
      ctx.strokeStyle = '#534875';
      ctx.strokeRect(x, oy + 134, w, 18);
      ctx.fillStyle = '#ded4ff';
      ctx.font = '9px Courier New';
      ctx.fillText(`${i + 4}.${window.BBS_CONSUMABLES[id]?.short || id}`, x + 4, oy + 147);
    });
  }

  garbageMeter(amount, ox, oy, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#080a10';
    ctx.fillRect(ox, oy, 7, h);
    const cells = Math.min(Math.ceil(amount), Math.floor(h / 8));
    const cap = Math.floor(h / 8);
    for (let i = 0; i < cells; i++) {
      ctx.fillStyle = amount >= 8 ? '#ff335f' : amount >= 4 ? '#ff9f2f' : '#d7c64a';
      ctx.fillRect(ox + 1, oy + h - 7 - i * 8, 5, 6);
    }
    if (amount > cap) {
      ctx.fillStyle = '#ffcad5';
      ctx.font = 'bold 9px Courier New';
      ctx.fillText(`+${Math.ceil(amount)}`, ox - 2, oy - 4);
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
