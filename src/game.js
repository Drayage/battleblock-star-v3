import { Board } from './board.js';
import { CARD_LIBRARY, COLORS } from './constants.js';
import { Deck } from './deck.js';
import { AI } from './ai.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { SKILLS } from './skills.js';
import { CONSUMABLES } from './consumables.js';
import {
  RunState,
  applyReward,
  isRunComplete,
  isShopRound,
  makeEnemyChoices,
  makeRewards,
  makeShopItems
} from './progression.js';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;

const RECORD_KEY = 'battleBlockStar.records.v1';
const CARD_DESCRIPTIONS = {
  POWER_I: 'High-power cells. Each cleared cell deals 0.3 attack.',
  CROSS: 'Five-cell cross. Awkward shape, higher clear value.',
  BOMB: 'Clearing this block destroys nearby garbage.',
  MANA_T: 'Cleared cells grant bonus MP.',
  PURGE_O: 'Clearing this block removes a garbage row.'
};

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputController(this);
    this.run = new RunState();
    this.screen = 'menu';
    this.player = null;
    this.enemy = null;
    this.enemyCard = null;
    this.ai = null;
    this.last = 0;
    this.fallTimer = 0;
    this.enemyTimer = 0;
    this.enemyAbilityTimer = 0;
    this.enemySlowTimer = 0;
    this.playerSlowTimer = 0;
    this.battleEndDelay = 0;
    this.battleEndResult = null;
    this.message = '';
    this.bindUi();
    this.refreshMenu();
    requestAnimationFrame(t => this.loop(t));
  }

  bindUi() {
    document.getElementById('startRunBtn').addEventListener('click', () => this.newRun());
    document.getElementById('restartRunBtn').addEventListener('click', () => this.newRun());
    document.getElementById('mainMenuBtn').addEventListener('click', () => {
      this.refreshMenu();
      this.show('menu');
    });
    document.getElementById('leaveShopBtn').addEventListener('click', () => {
      if (isShopRound(this.run.round)) this.run.visitedShops.add(this.run.round);
      this.showMap();
    });
    document.getElementById('forfeitBtn').addEventListener('click', () => this.endRun(false));
    window.addEventListener('resize', () => {
      if (this.player && this.enemy) this.renderer.resize(this.player.rows, this.enemy.rows);
    });
  }

  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.documentElement.classList.toggle('in-game', id === 'gameScreen');
    document.body.classList.toggle('in-game', id === 'gameScreen');
    this.screen = id;
  }

  refreshMenu() {
    document.getElementById('menuRound').textContent = `${this.run.round} / 20`;
    document.getElementById('menuGold').textContent = this.run.gold;
    document.getElementById('menuHp').textContent = this.run.hpRows;
    document.getElementById('menuDeck').textContent = `${this.run.deckCount()} cards`;
    this.renderRecords();
  }

  renderRecords() {
    const el = document.getElementById('recordList');
    const records = this.loadRecords();
    const best = records.reduce((top, r) => Math.max(top, r.round), 0);
    if (!records.length) {
      el.innerHTML = '<span class="muted">No runs yet.</span>';
      return;
    }
    el.innerHTML = `<strong>Best round ${best}</strong>` + records.slice(0, 5).map(r =>
      `<span>R${r.round} · ${r.gold}G · ${r.result}</span>`
    ).join('');
  }

  newRun() {
    this.run = new RunState();
    this.showMap();
  }

  showMap() {
    if (isRunComplete(this.run)) return this.endRun(true);
    if (isShopRound(this.run.round) && !this.run.visitedShops.has(this.run.round)) return this.showShop();
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = `Round ${this.run.round}`;
    document.getElementById('mapMeta').textContent = `Gold ${this.run.gold} · HP ${this.run.hpRows} · Deck ${this.run.deckCount()}`;
    document.getElementById('rewardPanel').classList.add('hidden');
    this.renderDeckViewer();
    const wrap = document.getElementById('enemyChoices');
    const enemies = makeEnemyChoices(this.run.round);
    this.renderChoicePager(wrap, enemies, enemy => {
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type}`;
      btn.innerHTML = `
        <strong>${enemy.name}</strong>
        <span>${enemy.type.toUpperCase()} · ${enemy.rewardGold}G · HP ${enemy.startingRows}</span>
        <small>${enemy.style}</small>
        <small>AI ${enemy.aiProfile} · Speed ${enemy.speed} · Garbage ${enemy.startingGarbage}</small>
      `;
      btn.addEventListener('click', () => this.startBattle(enemy));
      return btn;
    });
  }

  showShop() {
    this.show('shopScreen');
    document.getElementById('leaveShopBtn').textContent = 'Next Battle';
    document.getElementById('shopGold').textContent = `Gold ${this.run.gold}`;
    const wrap = document.getElementById('shopItems');
    wrap.innerHTML = '';
    for (const item of makeShopItems(this.run)) {
      const btn = document.createElement('button');
      btn.className = 'choice shop';
      btn.innerHTML = `<strong>${item.title}</strong><span>${item.price} Gold</span><small>${this.itemDesc(item)}</small>`;
      this.attachItemPreview(btn, item);
      btn.disabled = this.run.gold < item.price || (item.kind === 'consumable' && this.run.consumables.length >= 3);
      btn.addEventListener('click', () => {
        if (btn.disabled || this.run.gold < item.price) return;
        this.run.gold -= item.price;
        applyReward(this.run, item);
        this.normalizePersistentGrid();
        this.showShop();
      });
      wrap.appendChild(btn);
    }
  }

  renderDeckViewer() {
    const wrap = document.getElementById('deckList');
    const counts = new Map();
    for (const id of this.run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
    for (const id of this.run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
    for (const id of this.run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
    wrap.innerHTML = '';
    [...counts.entries()].sort((a, b) => CARD_LIBRARY[a[0]].name.localeCompare(CARD_LIBRARY[b[0]].name)).forEach(([id, count]) => {
      const card = CARD_LIBRARY[id];
      const item = document.createElement('div');
      item.className = 'deck-card';
      item.appendChild(this.blockPreview(card, 7));
      item.insertAdjacentHTML('beforeend', `<span>${card.name}</span><strong>x${count}</strong>`);
      wrap.appendChild(item);
    });
  }

  itemDesc(item) {
    if (item.kind === 'card') return `${CARD_LIBRARY[item.id].name}: ${CARD_DESCRIPTIONS[item.id] || 'Adds this block to your deck.'}`;
    if (item.kind === 'skill') return SKILLS[item.id].desc;
    if (item.kind === 'consumable') return CONSUMABLES[item.id].desc;
    return `${item.amount} extra rows of survival space.`;
  }

  attachItemPreview(node, item) {
    if (item.kind === 'card') node.appendChild(this.blockPreview(CARD_LIBRARY[item.id], 8));
    if (item.kind === 'consumable') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = CONSUMABLES[item.id].short;
      node.appendChild(chip);
    }
  }

  blockPreview(card, size = 8) {
    const shape = card.shape[0];
    const preview = document.createElement('div');
    preview.className = 'block-preview';
    preview.style.setProperty('--cell', `${size}px`);
    preview.style.setProperty('--cols', String(shape[0].length));
    for (const row of shape) {
      for (const filled of row) {
        const cell = document.createElement('i');
        if (filled) cell.style.background = this.rendererColor(card.id);
        preview.appendChild(cell);
      }
    }
    return preview;
  }

  rendererColor(id) {
    return COLORS[id] || '#8fb1ff';
  }

  startBattle(enemyCard) {
    this.enemyCard = enemyCard;
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    this.enemy = new Board({ rows: enemyCard.startingRows, deck: new Deck(enemyCard.deckExtras || []) });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    this.ai = new AI(enemyCard.aiProfile);
    this.fallTimer = 0;
    this.enemyTimer = 0;
    this.enemyAbilityTimer = 0;
    this.battleEndDelay = 0;
    this.battleEndResult = null;
    this.message = 'Battle start';
    document.getElementById('battleTitle').textContent = `Round ${this.run.round}`;
    document.getElementById('battleMeta').textContent = enemyCard.name;
    this.renderTouchSlots();
    this.renderer.resize(this.player.rows, this.enemy.rows);
    this.show('gameScreen');
  }

  renderTouchSlots() {
    const skillWrap = document.getElementById('touchSkills');
    skillWrap.innerHTML = '';
    this.run.equippedSkills.forEach((id, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${SKILLS[id].name}`;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.useSkill(i);
      });
      skillWrap.appendChild(btn);
    });
    const consWrap = document.getElementById('touchConsumables');
    consWrap.innerHTML = '';
    this.run.consumables.forEach((id, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 4}. ${CONSUMABLES[id].short}`;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.useConsumable(i);
      });
      consWrap.appendChild(btn);
    });
  }

  inBattle() {
    return this.screen === 'gameScreen' && this.player && this.enemy;
  }

  action(action) {
    if (!this.inBattle()) return;
    if (action === 'left') this.player.move(-1, 0);
    if (action === 'right') this.player.move(1, 0);
    if (action === 'soft' && !this.player.move(0, 1)) this.resolve(this.player.lock(), this.player);
    if (action === 'rotate') this.player.rotate(1);
    if (action === 'ccw') this.player.rotate(-1);
    if (action === 'hold') this.player.hold();
    if (action === 'hard') this.resolve(this.player.hardDrop(), this.player);
    if (action.startsWith('skill')) this.useSkill(Number(action.slice(5)));
    if (action.startsWith('consumable')) this.useConsumable(Number(action.slice(10)));
  }

  useSkill(index) {
    const id = this.run.equippedSkills[index];
    const skill = SKILLS[id];
    if (!skill || this.player.mp < skill.cost) return;
    this.player.mp -= skill.cost;
    skill.activate({ game: this, player: this.player, enemy: this.enemy, resolve: (result, attacker) => this.resolve(result, attacker) });
    this.message = `${skill.name} activated`;
  }

  useConsumable(index) {
    const id = this.run.consumables[index];
    const item = CONSUMABLES[id];
    if (!item) return;
    this.run.consumables.splice(index, 1);
    this.message = item.use({ game: this, player: this.player, enemy: this.enemy });
    this.renderTouchSlots();
  }

  resolve(result, attacker) {
    if (!result) return;
    const defender = attacker === this.player ? this.enemy : this.player;
    const mult = attacker === this.player && this.run.relics.includes('combo_amp') && this.player.combo >= 2 ? 1.25 : 1;
    if (result.attack > 0) defender.receiveGarbage(result.attack * mult);
    if (this.player.defeated) return this.queueBattleEnd('loss');
    if (this.enemy.defeated) return this.queueBattleEnd('win');
  }

  queueBattleEnd(result) {
    if (this.battleEndResult) return;
    this.battleEndResult = result;
    this.battleEndDelay = result === 'win' ? 1400 : 1200;
    this.message = result === 'win' ? 'Enemy defeated' : 'You were defeated';
  }

  winBattle() {
    this.run.gold += this.enemyCard.rewardGold;
    this.run.persistentGrid = this.player.grid.map(row => row.map(cell => cell?.type === 'garbage' ? { ...cell } : null));
    this.run.hpRows = this.player.rows;
    this.run.deck.refill();
    this.showRewards(makeRewards(this.enemyCard.rewardPool));
  }

  showRewards(rewards) {
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = `Round ${this.run.round} Clear`;
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold} Gold · choose one reward`;
    document.getElementById('enemyChoices').innerHTML = '';
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    this.renderChoicePager(wrap, rewards, reward => {
      const btn = document.createElement('button');
      btn.className = 'choice reward';
      btn.innerHTML = `<strong>${reward.title}</strong><span>${this.rewardName(reward)}</span><small>${this.itemDesc(reward)}</small>`;
      this.attachItemPreview(btn, reward);
      btn.addEventListener('click', () => {
        applyReward(this.run, reward);
        this.normalizePersistentGrid();
        this.run.round++;
        this.showMap();
      });
      return btn;
    });
  }

  renderChoicePager(wrap, items, renderItem) {
    let index = 0;
    const render = () => {
      wrap.innerHTML = '';
      wrap.classList.add('single-choice');
      const shell = document.createElement('div');
      shell.className = 'choice-pager';
      const stage = document.createElement('div');
      stage.className = 'choice-stage';
      stage.appendChild(renderItem(items[index], index));
      const nav = document.createElement('div');
      nav.className = 'choice-nav';
      const prev = document.createElement('button');
      prev.className = 'ghost';
      prev.textContent = '<';
      prev.disabled = items.length <= 1;
      prev.addEventListener('click', () => {
        index = (index + items.length - 1) % items.length;
        render();
      });
      const count = document.createElement('span');
      count.className = 'choice-count';
      count.textContent = `${index + 1} / ${items.length}`;
      const next = document.createElement('button');
      next.className = 'ghost';
      next.textContent = '>';
      next.disabled = items.length <= 1;
      next.addEventListener('click', () => {
        index = (index + 1) % items.length;
        render();
      });
      nav.append(prev, count, next);
      shell.append(stage, nav);
      wrap.appendChild(shell);
    };
    render();
  }

  rewardName(reward) {
    if (reward.kind === 'card') return CARD_LIBRARY[reward.id].name;
    if (reward.kind === 'skill') return SKILLS[reward.id].name;
    if (reward.kind === 'consumable') return CONSUMABLES[reward.id].name;
    return `+${reward.amount} rows`;
  }

  normalizePersistentGrid() {
    if (!this.run.persistentGrid) return;
    while (this.run.persistentGrid.length < this.run.hpRows) {
      this.run.persistentGrid.unshift(Array.from({ length: 10 }, () => null));
    }
  }

  endRun(win) {
    this.saveRecord(win);
    this.show('endScreen');
    document.getElementById('endTitle').textContent = win ? 'RUN COMPLETE!' : 'RUN FAILED';
    document.getElementById('endSummary').textContent = `Round ${Math.min(this.run.round, 20)} · Gold ${this.run.gold} · HP Rows ${this.run.hpRows}`;
  }

  saveRecord(win) {
    const records = this.loadRecords();
    records.unshift({
      round: Math.min(this.run.round, 20),
      gold: this.run.gold,
      result: win ? 'win' : 'loss',
      at: Date.now()
    });
    localStorage.setItem(RECORD_KEY, JSON.stringify(records.slice(0, 5)));
  }

  loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]');
    } catch {
      return [];
    }
  }

  loop(now) {
    const dt = Math.min(50, now - (this.last || now));
    this.last = now;
    if (this.inBattle()) this.updateBattle(dt, now);
    requestAnimationFrame(t => this.loop(t));
  }

  updateBattle(dt, now) {
    if (this.battleEndResult) {
      this.battleEndDelay -= dt;
      this.renderer.draw({
        player: this.player,
        enemy: this.enemy,
        run: this.run,
        battle: this.battleEndResult === 'win' ? 'VICTORY' : 'DEFEAT',
        enemyCard: this.enemyCard,
        message: this.battleEndResult === 'win' ? 'Enemy defeated' : 'You were defeated'
      });
      if (this.battleEndDelay <= 0) {
        if (this.battleEndResult === 'win') this.winBattle();
        else this.endRun(false);
      }
      return;
    }
    this.input.update(now);
    this.player.flash = Math.max(0, this.player.flash - dt);
    this.enemy.flash = Math.max(0, this.enemy.flash - dt);
    this.enemySlowTimer = Math.max(0, this.enemySlowTimer - dt);
    this.playerSlowTimer = Math.max(0, this.playerSlowTimer - dt);
    this.fallTimer += this.playerSlowTimer > 0 ? dt * 0.55 : dt;
    if (this.fallTimer >= 760) {
      this.fallTimer = 0;
      if (!this.player.move(0, 1)) this.resolve(this.player.lock(), this.player);
    }
    this.enemyTimer += dt;
    const enemyDelay = this.enemySlowTimer > 0 ? this.enemyCard.speed * 2.8 : this.enemyCard.speed;
    if (this.enemyTimer >= enemyDelay) {
      this.enemyTimer = 0;
      this.resolve(this.ai.step(this.enemy), this.enemy);
    }
    this.updateEnemyAbility(dt);
    if (this.enemy.defeated) this.queueBattleEnd('win');
    this.renderer.draw({
      player: this.player,
      enemy: this.enemy,
      run: this.run,
      battle: this.enemySlowTimer > 0 ? 'TIME WARP' : 'ACTIVE',
      enemyCard: this.enemyCard,
      message: this.message
    });
    this.message = '';
  }

  updateEnemyAbility(dt) {
    if (!this.enemyCard.ability) return;
    this.enemyAbilityTimer += dt;
    if (this.enemyAbilityTimer < 6500) return;
    this.enemyAbilityTimer = 0;
    if (this.enemyCard.ability === 'spike') {
      this.player.receiveGarbage(1);
      this.message = `${this.enemyCard.name} spikes garbage`;
    }
    if (this.enemyCard.ability === 'slowPlayer') {
      this.playerSlowTimer = 3000;
      this.message = `${this.enemyCard.name} slows gravity`;
    }
    if (this.enemyCard.ability === 'power') {
      this.player.receiveGarbage(2);
      this.message = `${this.enemyCard.name} fires a power burst`;
    }
  }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260518-pwa2').catch(() => {});
  });
}
