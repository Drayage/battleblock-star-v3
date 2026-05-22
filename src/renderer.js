import { ABILITY_GLYPH, CARD_LIBRARY, COLS, COLORS, GAME_TIMING, TYPES } from './constants.js?v=20260521-ko41';

// 특수블록이면 글리프+이름을 돌려준다(기본 미노는 null). 이름을 계속 노출해 익히게 한다.
// 일부 글리프는 폰트상 작게 렌더돼 키워서 그린다.
const GLYPH_SCALE = { '✻': 1.2, '◷': 1.45, '⊘': 1.4, '▽': 1.3, '◈': 1.2, '⊟': 1.2 };

function blockTag(card) {
  const glyph = card && ABILITY_GLYPH[card.abilityId];
  return glyph ? { glyph, name: card.name } : null;
}

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
    const mobileY = 68;
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
      ? Math.min(1, (window.innerWidth - 4) / this.layout.w, (viewportH - 190) / this.layout.h)
      : Math.min(1, (window.innerWidth - 8) / this.layout.w, (window.innerHeight - 162) / this.layout.h);
    this.canvas.style.transform = `scale(${scale})`;
    this.canvas.parentElement.style.height = `${Math.ceil(this.layout.h * scale)}px`;
  }

  draw({ player, enemy, run, battle, enemyCard, message, skillCooldowns = {}, effects = { player: [], enemy: [] }, playerFog = 0, alert = null }) {
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
    let stackH = 0;
    for (let r = 0; r < player.rows; r++) {
      if (player.grid[r] && player.grid[r].some(c => c)) { stackH = player.rows - r; break; }
    }
    ctx.fillText(`${enemyCard.name} - Gold ${run.gold} - HP ${run.hpRows - stackH}/${run.hpRows}`, L.w / 2, 47);
    ctx.textAlign = 'left';
    const curTag = blockTag(player.current?.card);
    const youLabel = L.mobile
      ? (curTag ? `${curTag.glyph} ${curTag.name}` : '')
      : (curTag ? `YOU ▸ ${curTag.glyph} ${curTag.name}` : 'YOU');
    this.board(player, L.pX, L.y, L.cell, youLabel, playerFog);
    this.garbageMeter(player, L.pX - 10, L.y, player.rows * L.cell);
    this.effectBadges(effects.player, L.pX, L.y + player.rows * L.cell + 6, L.cell);
    if (L.mobile) {
      this.mobileInfo(player, enemy, run, L.pX, L.y + player.rows * L.cell + 18, L.cell, effects.enemy);
    } else {
      this.board(enemy, L.eX, L.y, L.cell, 'ENEMY');
      this.garbageMeter(enemy, L.eX - 12, L.y, enemy.rows * L.cell);
      this.effectBadges(effects.enemy, L.eX, L.y + enemy.rows * L.cell + 6, L.cell);
      this.sidePanel(player, 20, L.y, L.cell, run, false, skillCooldowns);
    }
    if (alert) this.alertBanner(alert, L);
    if (battle === 'VICTORY' || battle === 'DEFEAT') this.battleOverlay(battle, L);
    if (battle === 'PAUSED' && L.mobile) this.pauseOverlay(message, L);
    if (!L.mobile) this.status(player, enemy, run, battle, message);
  }

  alertBanner(text, L) {
    const ctx = this.ctx;
    ctx.font = `bold ${L.mobile ? 13 : 17}px Courier New`;
    const w = Math.min(L.w - 16, ctx.measureText(text).width + 28);
    const x = (L.w - w) / 2;
    const y = L.mobile ? 30 : 52;
    ctx.fillStyle = 'rgba(255,90,110,.92)';
    ctx.fillRect(x, y, w, L.mobile ? 22 : 26);
    ctx.strokeStyle = '#ffd0d6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, L.mobile ? 22 : 26);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, L.w / 2, y + (L.mobile ? 15 : 18));
    ctx.textAlign = 'left';
  }

  pauseOverlay(message, L) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,7,14,.62)';
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.fillStyle = '#ffd97a';
    ctx.font = 'bold 26px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', L.w / 2, 110);
    ctx.fillStyle = '#d7e5ff';
    ctx.font = '11px Courier New';
    const parts = String(message || '').split('|').map(s => s.trim()).filter(s => s && s !== 'Paused');
    parts.forEach((line, i) => ctx.fillText(line, L.w / 2, 140 + i * 18));
    ctx.textAlign = 'left';
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

  effectBadges(items, ox, oy, cs) {
    if (!items?.length) return;
    const ctx = this.ctx;
    ctx.font = `bold ${Math.max(8, Math.floor(cs * 0.38))}px Courier New`;
    let x = ox;
    for (const item of items.slice(0, 5)) {
      const w = Math.max(42, ctx.measureText(item).width + 12);
      ctx.fillStyle = '#182538';
      ctx.fillRect(x, oy, w, 14);
      ctx.strokeStyle = '#456990';
      ctx.strokeRect(x, oy, w, 14);
      ctx.fillStyle = '#bfe8ff';
      ctx.fillText(item, x + 6, oy + 10);
      x += w + 4;
    }
  }

  board(board, ox, oy, cs, label, fog = 0) {
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
        const cell = board.grid[r][c];
        if (!cell) continue;
        this.cell(ox + c * cs, oy + r * cs, cs, cell.type, cell.fuse || 0);
        if (cell.hp > 0) {
          ctx.fillStyle = '#ffe27a';
          ctx.font = `bold ${Math.max(9, cs * 0.5)}px Courier New`;
          ctx.textAlign = 'center';
          ctx.fillText(String(cell.hp), ox + c * cs + cs / 2, oy + r * cs + cs * 0.7);
          ctx.textAlign = 'left';
        }
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
      for (const { x, y } of board.current.cells) if (y >= 0) this.cell(ox + x * cs, oy + y * cs, cs, board.current.card.id, board.current.card.fuse || 0);
    }
    if (board.flash > 0) {
      ctx.fillStyle = `rgba(210,230,255,${Math.min(0.18, board.flash / 700)})`;
      ctx.fillRect(ox, oy, bw, bh);
    }
    for (const fx of board.bombFx || []) {
      const alpha = Math.min(0.55, fx.timer / GAME_TIMING.BOMB_FX_FLASH);
      const px = ox + fx.x * cs;
      const py = oy + fx.y * cs;
      if (fx.kind === 'glass') {
        ctx.strokeStyle = `rgba(190,239,255,${Math.min(1, alpha + 0.4)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + alpha;
          ctx.beginPath();
          ctx.moveTo(px + cs * 0.5, py + cs * 0.5);
          ctx.lineTo(px + cs * 0.5 + Math.cos(a) * cs, py + cs * 0.5 + Math.sin(a) * cs);
          ctx.stroke();
        }
        continue;
      }
      const radius = fx.radius == null ? 1 : fx.radius;
      const span = radius * 2 + 1;
      ctx.fillStyle = fx.kind === 'fuse' ? `rgba(255,80,80,${alpha})` : `rgba(255,128,32,${alpha})`;
      ctx.fillRect(px - radius * cs, py - radius * cs, cs * span, cs * span);
      ctx.strokeStyle = `rgba(255,220,120,${Math.min(1, alpha + 0.25)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(px - radius * cs + 1, py - radius * cs + 1, cs * span - 2, cs * span - 2);
      ctx.fillStyle = `rgba(255,245,180,${Math.min(0.75, alpha + 0.15)})`;
      ctx.beginPath();
      ctx.arc(px + cs * 0.5, py + cs * 0.5, cs * ((radius + 0.35) - alpha * 0.35), 0, Math.PI * 2);
      ctx.fill();
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
      const valueText = board.lastAttack > 0 ? `+${board.lastAttack.toFixed(1)}` : 'PLACE EFFECT';
      ctx.fillText(valueText, ox + bw / 2, oy + Math.max(cs * 3.0, 58) - lift);
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
    if (fog > 0) {
      ctx.fillStyle = 'rgba(120,130,150,.82)';
      ctx.fillRect(ox, oy, bw, bh * 0.62);
      ctx.fillStyle = '#dfe6f5';
      ctx.font = `bold ${Math.max(11, Math.floor(cs * 0.55))}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText('FOG', ox + bw / 2, oy + bh * 0.32);
      ctx.textAlign = 'left';
    }
  }

  cell(x, y, cs, type, fuse = 0) {
    const ctx = this.ctx;
    const pad = Math.max(1, Math.floor(cs * 0.08));
    ctx.fillStyle = COLORS[type] || '#d9e0ef';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, Math.max(2, Math.floor(cs * 0.15)));
    if (type === TYPES.GARBAGE) return;
    if (cs >= 16) {
      const mark = fuse > 0 ? String(fuse)
        : type === TYPES.CROSS ? '+'
        : ABILITY_GLYPH[CARD_LIBRARY[type]?.abilityId] || '';
      if (mark) {
        ctx.fillStyle = '#06101d';
        ctx.font = `bold ${Math.floor(cs * 0.48 * (GLYPH_SCALE[mark] || 1))}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(mark, x + cs / 2, y + cs * 0.68);
        ctx.textAlign = 'left';
      }
    }
  }

  sidePanel(board, ox, oy, cs, run, compact = false, skillCooldowns = {}) {
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
    const nextCount = run?.relics?.includes('foresight') ? 5 : 3;
    ctx.fillText('NEXT', ox + 8, oy + 78);
    board.nextQueue.slice(0, nextCount).forEach((card, i) => {
      const rowY = oy + 88 + i * 23;
      this.preview(card, ox + 14, rowY, Math.max(6, cs * 0.38));
      const tag = blockTag(card); // 데스크탑: NEXT의 모든 특수블록 이름 표기
      if (tag) {
        ctx.fillStyle = '#ffe27a';
        ctx.font = '8px Courier New';
        ctx.fillText(tag.name.slice(0, 6), ox + 56, rowY + 12);
        ctx.fillStyle = '#9fb2dc';
        ctx.font = 'bold 11px Courier New';
      }
    });
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
      const skill = window.BBS_SKILLS[id];
      if (!skill) return;
      const cd = skillCooldowns[id] || 0;
      const hasMp = board.mp >= skill.cost;
      const slotY = oy + 196 + i * 25;
      ctx.globalAlpha = (!hasMp && cd === 0) ? 0.35 : 1;
      if (cd > 0) {
        const pct = 1 - cd / skill.cooldown;
        ctx.fillStyle = '#0c1318';
        ctx.fillRect(ox, slotY, width, 20);
        ctx.fillStyle = hasMp ? '#1a4268' : '#152035';
        ctx.fillRect(ox, slotY, Math.ceil(width * pct), 20);
        ctx.strokeStyle = '#1a2a3a';
        ctx.strokeRect(ox, slotY, width, 20);
        ctx.fillStyle = hasMp ? '#5a7898' : '#3a4e5e';
      } else if (hasMp) {
        ctx.fillStyle = '#172d44';
        ctx.fillRect(ox, slotY, width, 20);
        ctx.strokeStyle = '#24415d';
        ctx.strokeRect(ox, slotY, width, 20);
        ctx.fillStyle = '#b7c8e8';
      } else {
        ctx.fillStyle = '#111522';
        ctx.fillRect(ox, slotY, width, 20);
        ctx.strokeStyle = '#24415d';
        ctx.strokeRect(ox, slotY, width, 20);
        ctx.fillStyle = '#7a8ca0';
      }
      ctx.font = '9px Courier New';
      ctx.fillText(`${skill.icon ? `${skill.icon} ` : ''}${i + 1}. ${skill.name}`, ox + 5, slotY + 9);
      ctx.fillText(`${skill.cost}MP`, ox + 5, slotY + 17);
      ctx.globalAlpha = 1;
    });
    ctx.font = '10px Courier New';
    run.consumables.forEach((id, i) => {
      const item = window.BBS_CONSUMABLES[id];
      ctx.fillStyle = '#1f1a2d';
      ctx.fillRect(ox, oy + 276 + i * 22, width, 18);
      ctx.strokeStyle = '#534875';
      ctx.strokeRect(ox, oy + 276 + i * 22, width, 18);
      ctx.fillStyle = '#ded4ff';
      ctx.fillText(`${item?.icon ? `${item.icon} ` : ''}${i + 4}. ${item?.name || id}`, ox + 5, oy + 289 + i * 22);
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
    this.garbageMeter(enemy, ox + COLS * cs + 5, oy, enemy.rows * cs);
  }

  mobileInfo(player, enemy, run, ox, oy, cs, enemyEffects = []) {
    const ctx = this.ctx;
    const panelW = COLS * cs;
    const enemyCs = Math.max(2, Math.min(4, Math.floor(88 / Math.max(1, enemy.rows))));
    const enemyX = ox + Math.floor(panelW * 0.73);
    const leftW = Math.max(150, enemyX - ox - 12);
    ctx.fillStyle = '#0f1424';
    ctx.fillRect(ox, oy, panelW, 158);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox, oy, panelW, 158);
    ctx.fillStyle = '#9fb2dc';
    ctx.font = 'bold 10px Courier New';
    ctx.fillText('HOLD', ox + 8, oy + 17);
    ctx.fillText('NEXT', ox + Math.floor(panelW * 0.38), oy + 17);
    ctx.fillText('ENEMY', enemyX, oy + 17);
    if (player.held) this.preview(player.held, ox + 10, oy + 28, 8);
    const nextCount = run?.relics?.includes('foresight') ? 5 : 3;
    const nextX = ox + Math.floor(panelW * 0.38);
    const step = Math.min(28, Math.max(14, Math.floor((enemyX - nextX - 6) / nextCount)));
    player.nextQueue.slice(0, nextCount).forEach((card, i) => this.preview(card, nextX + i * step, oy + 28, step >= 18 ? 7 : 5));
    this.board(enemy, enemyX, oy + 27, enemyCs, '');
    this.garbageMeter(enemy, ox + panelW - 12, oy + 27, enemy.rows * enemyCs);
    this.effectBadges(enemyEffects, enemyX, oy + 120, enemyCs + 10);

    const mpY = oy + 96;
    ctx.fillStyle = '#10192d';
    ctx.fillRect(ox + 8, mpY, leftW - 8, 10);
    ctx.fillStyle = '#38d0ff';
    ctx.fillRect(ox + 8, mpY, Math.min(leftW - 8, player.mp * ((leftW - 8) / 100)), 10);
    ctx.strokeStyle = '#26375f';
    ctx.strokeRect(ox + 8, mpY, leftW - 8, 10);
    ctx.fillStyle = '#e2efff';
    ctx.font = '9px Courier New';
    ctx.fillText(`MP ${Math.floor(player.mp)}`, ox + 12, mpY + 8);
    run.consumables.forEach((id, i) => {
      const x = ox + 8 + i * Math.floor((leftW - 8) / 3);
      const w = Math.floor((leftW - 18) / 3);
      ctx.fillStyle = '#1f1a2d';
      ctx.fillRect(x, oy + 116, w, 18);
      ctx.strokeStyle = '#534875';
      ctx.strokeRect(x, oy + 116, w, 18);
      ctx.fillStyle = '#ded4ff';
      ctx.font = '9px Courier New';
      const cinfo = window.BBS_CONSUMABLES[id];
      ctx.fillText(`${i + 4}.${cinfo?.icon || cinfo?.short || id}`, x + 4, oy + 129);
    });
  }

  garbageMeter(source, ox, oy, h) {
    const ctx = this.ctx;
    const entries = Array.isArray(source?.garbageEntries)
      ? source.garbageEntries
      : [{ amount: Math.max(0, Math.ceil(Number(source) || 0)), timer: 0 }];
    const amount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    ctx.fillStyle = '#080a10';
    ctx.fillRect(ox, oy, 7, h);
    const cap = Math.floor(h / 8);
    let drawn = 0;
    for (const entry of entries) {
      const cells = Math.min(entry.amount, cap - drawn);
      ctx.fillStyle = entry.timer <= 0 ? '#ff335f' : entry.delayed ? '#3aa0ff' : '#777f91';
      for (let i = 0; i < cells; i++) {
        ctx.fillRect(ox + 1, oy + h - 7 - (drawn + i) * 8, 5, 6);
      }
      drawn += cells;
      if (drawn >= cap) break;
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
