import { Board } from './board.js?v=20260518-garbageflush1';
import { CARD_LIBRARY, COLORS } from './constants.js?v=20260518-garbageflush1';
import { Deck } from './deck.js?v=20260518-garbageflush1';
import { AI } from './ai.js?v=20260518-garbageflush1';
import { Renderer } from './renderer.js?v=20260518-garbageflush1';
import { InputController } from './input.js?v=20260518-garbageflush1';
import { SKILLS } from './skills.js?v=20260518-garbageflush1';
import { CONSUMABLES } from './consumables.js?v=20260518-garbageflush1';
import {
  RunState,
  RELICS,
  applyReward,
  isRunComplete,
  isShopRound,
  makeEnemyChoices,
  makeEventChoices,
  makeRewards,
  makeShopItems,
  shouldShowEvent
} from './progression.js?v=20260518-garbageflush1';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;
window.BBS_RELICS = RELICS;

const RECORD_KEY = 'battleBlockStar.records.v1';
const SAVE_KEY = 'battleBlockStar.save.v1';
const LOCK_DELAY_START = 520;
const LOCK_DELAY_STEP = 55;
const LOCK_DELAY_MIN = 120;

const CARD_DESCRIPTIONS = {
  POWER_I: 'High-power cells. Each cleared cell deals 0.3 attack.',
  POWER_T: 'T shape with high-power cells. Strong for T-spin style clears.',
  POWER_S: 'S shape with high-power cells. Harder to place, stronger clears.',
  CROSS: 'Five-cell cross. Awkward shape, higher clear value.',
  BOMB: 'Clearing this block destroys nearby garbage.',
  BOMB_I: 'I shape that also destroys nearby garbage when cleared.',
  MANA_T: 'Cleared cells grant bonus MP.',
  MANA_L: 'L shape that grants bonus MP when cleared.',
  PURGE_O: 'Clearing this block removes a garbage row.',
  CLEANSE_J: 'J shape that removes a garbage row when cleared.',
  HEAVY_JUNK: 'Five-cell burden shape. Low attack, mostly a deck tax.',
  POWER_CROSS: 'Five-cell cross shape with high-power cells.',
  WIDE_JUNK: 'Six-cell wide burden. Clogs the deck and attacks poorly.'
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
    this.lockTimer = 0;
    this.lockResets = 0;
    this.groundTouched = false;
    this.enemyTimer = 0;
    this.enemyAbilityTimer = 0;
    this.enemySlowTimer = 0;
    this.playerSlowTimer = 0;
    this.battleEndDelay = 0;
    this.battleEndResult = null;
    this.paused = false;
    this.autoSaveTimer = 0;
    this.message = '';
    this.bindUi();
    this.refreshMenu();
    requestAnimationFrame(t => this.loop(t));
  }

  bindUi() {
    document.getElementById('startRunBtn').addEventListener('click', () => this.newRun());
    document.getElementById('loadRunBtn').addEventListener('click', () => this.loadGame());
    document.getElementById('deleteSaveBtn').addEventListener('click', () => this.deleteSave());
    document.getElementById('restartRunBtn').addEventListener('click', () => this.newRun());
    document.getElementById('mainMenuBtn').addEventListener('click', () => {
      this.refreshMenu();
      this.show('menu');
    });
    document.getElementById('leaveShopBtn').addEventListener('click', () => {
      if (isShopRound(this.run.round)) this.run.visitedShops.add(this.run.round);
      this.showMap();
      this.autoSave();
    });
    document.getElementById('forfeitBtn').addEventListener('click', () => this.endRun(false));
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
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
    document.getElementById('loadRunBtn').disabled = !localStorage.getItem(SAVE_KEY);
    document.getElementById('deleteSaveBtn').disabled = !localStorage.getItem(SAVE_KEY);
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
    this.routeNextScreen();
    this.autoSave();
  }

  routeNextScreen() {
    const eventKey = shouldShowEvent(this.run);
    if (eventKey) return this.showEvent(eventKey);
    return this.showMap();
  }

  showMap() {
    if (isRunComplete(this.run)) return this.endRun(true);
    if (isShopRound(this.run.round) && !this.run.visitedShops.has(this.run.round)) return this.showShop();
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = `Round ${this.run.round}`;
    document.getElementById('mapMeta').textContent = `Gold ${this.run.gold} - HP ${this.run.hpRows} - Deck ${this.run.deckCount()}`;
    document.getElementById('rewardPanel').classList.add('hidden');
    this.renderDeckViewer();
    const wrap = document.getElementById('enemyChoices');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    for (const enemy of makeEnemyChoices(this.run.round)) {
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type}`;
      btn.innerHTML = `
        <strong>${enemy.name}</strong>
        <span>${enemy.type.toUpperCase()} - ${enemy.rewardGold}G - HP ${enemy.startingRows}</span>
        <small>${enemy.style}</small>
        <small>AI ${enemy.aiProfile} - Speed ${enemy.speed} - Garbage ${enemy.startingGarbage}</small>
      `;
      btn.addEventListener('click', () => this.startBattle(enemy));
      wrap.appendChild(btn);
    }
  }

  showEvent(eventKey) {
    this.show('eventScreen');
    const completed = this.run.round - 1;
    document.getElementById('eventTitle').textContent = eventKey === 'start' ? 'Opening Event' : `After Round ${completed}`;
    document.getElementById('eventMeta').textContent = `Gold ${this.run.gold} - HP ${this.run.hpRows} - choose one`;
    const wrap = document.getElementById('eventChoices');
    wrap.innerHTML = '';
    let choices = [];
    try {
      choices = makeEventChoices(this.run, eventKey);
    } catch (err) {
      console.warn('Event choices failed', err);
      choices = [];
    }
    if (!choices.length) choices = [{ kind: 'gold', amount: 10, title: 'Loose Gold', desc: 'Take a small gold pouch and move on.' }];
    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.className = 'choice event';
      btn.innerHTML = `<strong>${choice.title}</strong><span>${this.eventName(choice)}</span><small>${choice.desc}</small>`;
      try {
        this.attachEventPreview(btn, choice);
      } catch {
        btn.insertAdjacentHTML('beforeend', '<small>Preview unavailable.</small>');
      }
      btn.disabled = !this.canUseEvent(choice);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.applyEventChoice(choice);
        this.run.seenEvents.add(eventKey);
        this.normalizePersistentGrid();
        this.showMap();
        this.autoSave();
      });
      wrap.appendChild(btn);
    }
  }

  eventName(choice) {
    if (choice.kind === 'removeCard') return `${choice.price}G - remove ${CARD_LIBRARY[choice.id].name}`;
    if (choice.kind === 'upgradeCard') return `${CARD_LIBRARY[choice.from].name} -> ${CARD_LIBRARY[choice.to].name}`;
    if (choice.kind === 'hpForCurse') return `HP +${choice.amount}, add ${CARD_LIBRARY[choice.card].name}`;
    if (choice.kind === 'consumable') return CONSUMABLES[choice.id].name;
    if (choice.kind === 'gold') return `Gain ${choice.amount}G`;
    if (choice.kind === 'cleanup') return 'Clean carried garbage';
    return 'Event';
  }

  attachEventPreview(node, choice) {
    if (choice.kind === 'removeCard') node.appendChild(this.blockPreview(CARD_LIBRARY[choice.id], 8));
    if (choice.kind === 'upgradeCard') {
      node.appendChild(this.blockPreview(CARD_LIBRARY[choice.from], 8));
      node.appendChild(this.blockPreview(CARD_LIBRARY[choice.to], 8));
    }
    if (choice.kind === 'hpForCurse') node.appendChild(this.blockPreview(CARD_LIBRARY[choice.card], 8));
    if (choice.kind === 'consumable') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = CONSUMABLES[choice.id].short;
      node.appendChild(chip);
    }
  }

  canUseEvent(choice) {
    if (choice.kind === 'removeCard') return this.run.gold >= choice.price;
    if (choice.kind === 'upgradeCard') return true;
    if (choice.kind === 'consumable') return this.run.consumables.length < 3;
    if (choice.kind === 'cleanup') return this.hasCarriedGarbage();
    return true;
  }

  applyEventChoice(choice) {
    if (choice.kind === 'removeCard') {
      this.run.gold -= choice.price;
      this.run.deck.removeCard(choice.id);
      this.run.deck.refill();
    }
    if (choice.kind === 'upgradeCard') {
      this.run.deck.replaceCard(choice.from, choice.to);
      this.run.deck.refill();
    }
    if (choice.kind === 'hpForCurse') {
      this.run.hpRows += choice.amount;
      this.run.deck.addCard(choice.card);
    }
    if (choice.kind === 'consumable') this.run.consumables.push(choice.id);
    if (choice.kind === 'gold') this.run.gold += choice.amount;
    if (choice.kind === 'cleanup') this.cleanCarriedGarbageRow();
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
        this.autoSave();
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
    this.renderLoadoutViewer();
  }

  renderLoadoutViewer() {
    const skillWrap = document.getElementById('skillList');
    const consumableWrap = document.getElementById('consumableList');
    const relicWrap = document.getElementById('relicList');
    skillWrap.innerHTML = '';
    consumableWrap.innerHTML = '';
    relicWrap.innerHTML = '';

    if (!this.run.equippedSkills.length) {
      skillWrap.innerHTML = '<span class="muted">No skills equipped.</span>';
    } else {
      this.run.equippedSkills.forEach((id, index) => {
        const skill = SKILLS[id];
        if (!skill) return;
        const item = document.createElement('div');
        item.className = 'loadout-card';
        item.innerHTML = `<span class="item-chip">${index + 1}</span><span><strong>${skill.name}</strong><small>${skill.desc}</small><small class="cost">${skill.cost} MP</small></span>`;
        skillWrap.appendChild(item);
      });
    }

    if (!this.run.consumables.length) {
      consumableWrap.innerHTML = '<span class="muted">No consumables held.</span>';
    } else {
      this.run.consumables.forEach((id, index) => {
        const itemDef = CONSUMABLES[id];
        if (!itemDef) return;
        const item = document.createElement('div');
        item.className = 'loadout-card';
        item.innerHTML = `<span class="item-chip">${itemDef.short}</span><span><strong>${index + 4}. ${itemDef.name}</strong><small>${itemDef.desc}</small></span>`;
        consumableWrap.appendChild(item);
      });
    }

    if (!this.run.relics.length) {
      relicWrap.innerHTML = '<span class="muted">No relics owned.</span>';
    } else {
      this.run.relics.forEach(id => {
        const relic = RELICS[id];
        if (!relic) return;
        const item = document.createElement('div');
        item.className = 'loadout-card';
        item.innerHTML = `<span class="item-chip">R</span><span><strong>${relic.name}</strong><small>${relic.desc}</small></span>`;
        relicWrap.appendChild(item);
      });
    }
  }

  itemDesc(item) {
    if (item.kind === 'card') {
      const card = CARD_LIBRARY[item.id];
      return `${card.shapeName} + ${card.abilityName} (${card.cellCount} cells): ${CARD_DESCRIPTIONS[item.id] || 'Adds this shape and ability combo to your deck.'}`;
    }
    if (item.kind === 'skill') return SKILLS[item.id].desc;
    if (item.kind === 'consumable') return CONSUMABLES[item.id].desc;
    if (item.kind === 'relic') return RELICS[item.id].desc;
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
    if (item.kind === 'relic') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = 'R';
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
    if (this.run.relics.includes('hold_cache') && !this.player.held) this.player.mp = Math.min(100, this.player.mp + 15);
    this.ai = new AI(enemyCard.aiProfile);
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.groundTouched = false;
    this.enemyTimer = 0;
    this.enemyAbilityTimer = 0;
    this.battleEndDelay = 0;
    this.battleEndResult = null;
    this.paused = false;
    this.autoSaveTimer = 0;
    this.message = 'Battle start';
    document.getElementById('battleTitle').textContent = `Round ${this.run.round}`;
    document.getElementById('battleMeta').textContent = enemyCard.name;
    this.renderTouchSlots();
    this.renderer.resize(this.player.rows, this.enemy.rows);
    this.show('gameScreen');
    this.autoSave();
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
    if (action === 'pause') return this.togglePause();
    if (this.paused) return;
    if (action === 'left') this.groundAdjust(() => this.player.move(-1, 0));
    if (action === 'right') this.groundAdjust(() => this.player.move(1, 0));
    if (action === 'soft') {
      if (this.player.move(0, 1)) this.resetLockDelay();
      else this.lockTimer += 90;
    }
    if (action === 'rotate') this.groundAdjust(() => this.player.rotate(1));
    if (action === 'ccw') this.groundAdjust(() => this.player.rotate(-1));
    if (action === 'hold') this.player.hold();
    if (action === 'hard') this.resolve(this.player.hardDrop(), this.player);
    if (action.startsWith('skill')) this.useSkill(Number(action.slice(5)));
    if (action.startsWith('consumable')) this.useConsumable(Number(action.slice(10)));
  }

  groundAdjust(fn) {
    const wasGrounded = this.isPlayerGrounded();
    const changed = fn();
    if (changed && (wasGrounded || this.isPlayerGrounded())) this.resetLockDelay(true);
    return changed;
  }

  isPlayerGrounded() {
    return !!this.player?.current && !this.player.ok(this.player.current, 0, 1);
  }

  resetLockDelay(countReset = false) {
    this.lockTimer = 0;
    if (countReset) this.lockResets++;
  }

  currentLockDelay() {
    return Math.max(LOCK_DELAY_MIN, LOCK_DELAY_START - this.lockResets * LOCK_DELAY_STEP);
  }

  currentFallInterval() {
    return this.groundTouched ? this.currentLockDelay() : 760;
  }

  useSkill(index) {
    if (this.paused) return;
    const id = this.run.equippedSkills[index];
    const skill = SKILLS[id];
    if (!skill || this.player.mp < skill.cost) return;
    this.player.mp -= skill.cost;
    skill.activate({ game: this, player: this.player, enemy: this.enemy, resolve: (result, attacker) => this.resolve(result, attacker) });
    this.message = `${skill.name} activated`;
  }

  useConsumable(index) {
    if (this.paused) return;
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
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('mana_lens')) {
      this.player.mp = Math.min(100, this.player.mp + result.mana * 0.35);
    }
    if (result.attack > 0) {
      const attack = result.attack * mult;
      const buffered = defender === this.player && this.run.relics.includes('garbage_buffer') ? Math.max(0, attack - 1) : attack;
      defender.receiveGarbage(buffered);
    }
    if (this.player.defeated) return this.queueBattleEnd('loss');
    if (this.enemy.defeated) return this.queueBattleEnd('win');
    this.autoSave();
  }

  queueBattleEnd(result) {
    if (this.battleEndResult) return;
    this.battleEndResult = result;
    this.battleEndDelay = result === 'win' ? 1400 : 1200;
    this.message = result === 'win' ? 'Enemy defeated' : 'You were defeated';
    this.autoSave();
  }

  winBattle() {
    this.run.gold += this.enemyCard.rewardGold;
    this.run.persistentGrid = this.player.grid.map(row => row.map(cell => cell?.type === 'garbage' ? { ...cell } : null));
    this.run.hpRows = this.player.rows;
    this.run.deck.refill();
    this.showRewards(makeRewards(this.enemyCard.rewardPool));
    this.autoSave();
  }

  showRewards(rewards) {
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = `Round ${this.run.round} Clear`;
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold} Gold - choose one reward`;
    document.getElementById('enemyChoices').innerHTML = '';
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    rewards.forEach(reward => {
      const btn = document.createElement('button');
      btn.className = 'choice reward';
      btn.innerHTML = `<strong>${reward.title}</strong><span>${this.rewardName(reward)}</span><small>${this.itemDesc(reward)}</small>`;
      this.attachItemPreview(btn, reward);
      btn.addEventListener('click', () => {
        applyReward(this.run, reward);
        this.normalizePersistentGrid();
        this.run.round++;
        this.routeNextScreen();
        this.autoSave();
      });
      wrap.appendChild(btn);
    });
  }

  rewardName(reward) {
    if (reward.kind === 'card') return CARD_LIBRARY[reward.id].name;
    if (reward.kind === 'skill') return SKILLS[reward.id].name;
    if (reward.kind === 'consumable') return CONSUMABLES[reward.id].name;
    if (reward.kind === 'relic') return RELICS[reward.id].name;
    return `+${reward.amount} rows`;
  }

  normalizePersistentGrid() {
    if (!this.run.persistentGrid) return;
    while (this.run.persistentGrid.length < this.run.hpRows) {
      this.run.persistentGrid.unshift(Array.from({ length: 10 }, () => null));
    }
    while (this.run.persistentGrid.length > this.run.hpRows) this.run.persistentGrid.shift();
    this.run.persistentGrid = this.run.persistentGrid.map(row =>
      Array.from({ length: 10 }, (_, c) => row[c] ? { ...row[c], traits: [...row[c].traits] } : null)
    );
  }

  hasCarriedGarbage() {
    return !!this.run.persistentGrid?.some(row => row.some(cell => cell?.type === 'garbage'));
  }

  cleanCarriedGarbageRow() {
    if (!this.run.persistentGrid) return;
    for (let r = this.run.persistentGrid.length - 1; r >= 0; r--) {
      if (this.run.persistentGrid[r].some(cell => cell?.type === 'garbage')) {
        this.run.persistentGrid[r] = Array.from({ length: 10 }, () => null);
        return;
      }
    }
  }

  endRun(win) {
    this.saveRecord(win);
    this.deleteSave(true);
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

  runToState() {
    return {
      round: this.run.round,
      gold: this.run.gold,
      hpRows: this.run.hpRows,
      deck: this.run.deck.toState(),
      persistentGrid: this.run.persistentGrid,
      ownedSkills: [...this.run.ownedSkills],
      equippedSkills: [...this.run.equippedSkills],
      consumables: [...this.run.consumables],
      relics: [...this.run.relics],
      visitedShops: [...this.run.visitedShops],
      seenEvents: [...this.run.seenEvents]
    };
  }

  restoreRun(state = {}) {
    const run = new RunState();
    run.round = state.round || 1;
    run.gold = state.gold || 0;
    run.hpRows = state.hpRows || run.hpRows;
    run.deck = Deck.fromState(state.deck);
    run.persistentGrid = state.persistentGrid || null;
    run.ownedSkills = [...(state.ownedSkills || [])];
    run.equippedSkills = [...(state.equippedSkills || [])];
    run.consumables = [...(state.consumables || [])];
    run.relics = [...(state.relics || [])];
    run.visitedShops = new Set(state.visitedShops || []);
    run.seenEvents = new Set(state.seenEvents || []);
    return run;
  }

  autoSave() {
    this.saveGame(true);
  }

  saveGame(silent = false) {
    const state = {
      version: 1,
      savedAt: Date.now(),
      screen: this.screen,
      run: this.runToState(),
      battle: this.player && this.enemy ? {
        player: this.player.toState(),
        enemy: this.enemy.toState(),
        enemyCard: this.enemyCard,
        fallTimer: this.fallTimer,
        lockTimer: this.lockTimer,
        lockResets: this.lockResets,
        groundTouched: this.groundTouched,
        enemyTimer: this.enemyTimer,
        enemyAbilityTimer: this.enemyAbilityTimer,
        enemySlowTimer: this.enemySlowTimer,
        playerSlowTimer: this.playerSlowTimer,
        battleEndDelay: this.battleEndDelay,
        battleEndResult: this.battleEndResult,
        paused: this.paused,
        message: this.message
      } : null
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (!silent) this.message = 'Saved';
    this.refreshMenu();
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      this.run = this.restoreRun(state.run);
      if (state.battle && state.screen === 'gameScreen') {
        this.player = Board.fromState(state.battle.player);
        this.enemy = Board.fromState(state.battle.enemy);
        this.enemyCard = state.battle.enemyCard;
        this.ai = new AI(this.enemyCard?.aiProfile || 'balanced');
        this.fallTimer = state.battle.fallTimer || 0;
        this.lockTimer = state.battle.lockTimer || 0;
        this.lockResets = state.battle.lockResets || 0;
        this.groundTouched = !!state.battle.groundTouched;
        this.enemyTimer = state.battle.enemyTimer || 0;
        this.enemyAbilityTimer = state.battle.enemyAbilityTimer || 0;
        this.enemySlowTimer = state.battle.enemySlowTimer || 0;
        this.playerSlowTimer = state.battle.playerSlowTimer || 0;
        this.autoSaveTimer = 0;
        this.battleEndDelay = state.battle.battleEndDelay || 0;
        this.battleEndResult = state.battle.battleEndResult || null;
        this.paused = state.battle.paused ?? true;
        this.message = state.battle.message || 'Loaded';
        document.getElementById('battleTitle').textContent = `Round ${this.run.round}`;
        document.getElementById('battleMeta').textContent = this.enemyCard?.name || 'Enemy';
        this.renderTouchSlots();
        this.renderer.resize(this.player.rows, this.enemy.rows);
        this.show('gameScreen');
      } else {
        this.player = null;
        this.enemy = null;
        this.enemyCard = null;
        this.ai = null;
        this.paused = false;
        this.routeNextScreen();
      }
      this.refreshMenu();
    } catch (err) {
      console.warn('Save load failed', err);
      this.deleteSave();
    }
  }

  deleteSave(silent = false) {
    localStorage.removeItem(SAVE_KEY);
    if (!silent) this.refreshMenu();
  }

  togglePause() {
    if (!this.inBattle() || this.battleEndResult) return;
    this.paused = !this.paused;
    document.getElementById('pauseBtn').textContent = this.paused ? 'Resume' : 'Pause';
    this.message = this.paused ? 'Paused' : 'Resumed';
    this.autoSave();
  }

  loop(now) {
    const dt = Math.min(50, now - (this.last || now));
    this.last = now;
    if (this.inBattle()) this.updateBattle(dt, now);
    requestAnimationFrame(t => this.loop(t));
  }

  updateBattle(dt, now) {
    document.getElementById('pauseBtn').textContent = this.paused ? 'Resume' : 'Pause';
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
    if (this.paused) {
      this.renderer.draw({
        player: this.player,
        enemy: this.enemy,
        run: this.run,
        battle: 'PAUSED',
        enemyCard: this.enemyCard,
        message: 'Paused'
      });
      return;
    }
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 5000) {
      this.autoSaveTimer = 0;
      this.autoSave();
    }
    this.input.update(now);
    this.player.flash = Math.max(0, this.player.flash - dt);
    this.enemy.flash = Math.max(0, this.enemy.flash - dt);
    this.enemySlowTimer = Math.max(0, this.enemySlowTimer - dt);
    this.playerSlowTimer = Math.max(0, this.playerSlowTimer - dt);
    this.updatePlayerGravity(this.playerSlowTimer > 0 ? dt * 0.55 : dt);
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

  updatePlayerGravity(dt) {
    if (!this.player?.current || this.player.defeated) return;
    if (this.isPlayerGrounded()) {
      this.groundTouched = true;
      this.lockTimer += dt;
      this.fallTimer = 0;
      if (this.lockTimer >= this.currentLockDelay()) {
        this.lockTimer = 0;
        this.lockResets = 0;
        this.groundTouched = false;
        this.resolve(this.player.lock(), this.player);
      }
      return;
    }

    this.lockTimer = 0;
    this.fallTimer += dt;
    if (this.fallTimer >= this.currentFallInterval()) {
      this.fallTimer = 0;
      if (this.player.move(0, 1) && this.isPlayerGrounded()) this.resetLockDelay();
    }
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
    navigator.serviceWorker.register('./sw.js?v=20260518-garbageflush1').catch(() => {});
  });
}
