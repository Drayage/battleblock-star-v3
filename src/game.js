import { Board } from './board.js?v=20260519-ko';
import { CARD_LIBRARY, COLORS, GAME_TIMING } from './constants.js?v=20260519-ko';
import { Deck } from './deck.js?v=20260519-ko';
import { AI } from './ai.js?v=20260519-ko';
import { Renderer } from './renderer.js?v=20260519-ko';
import { InputController } from './input.js?v=20260519-ko';
import { SKILLS } from './skills.js?v=20260519-ko';
import { CONSUMABLES } from './consumables.js?v=20260519-ko';
import {
  RunState,
  RELICS,
  applyReward,
  grantEliteRelic,
  isRunComplete,
  isShopRound,
  makeEnemyChoices,
  makeEventChoices,
  makeStarterChoices,
  makeRewards,
  makeShopItems,
  shopItemKey,
  shouldShowEvent
} from './progression.js?v=20260519-ko';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;
window.BBS_RELICS = RELICS;

const RECORD_KEY = 'battleBlockStar.records.v1';
const SAVE_KEY = 'battleBlockStar.save.v1';
const CARD_DESCRIPTIONS = {
  POWER_I: '고출력 셀. 클리어된 셀당 0.3 공격력.',
  POWER_T: '고출력 T형. T스핀 클리어에 강합니다.',
  POWER_S: '고출력 S형. 배치가 까다롭지만 강력한 클리어.',
  CROSS: '5칸 십자형. 배치가 어렵지만 클리어 가치가 높습니다.',
  BOMB: '클리어 시 주변 쓰레기를 파괴합니다.',
  BOMB_I: '클리어 시 주변 쓰레기를 파괴하는 I형.',
  MANA_T: '클리어된 셀이 추가 MP를 제공합니다.',
  MANA_L: '클리어 시 추가 MP를 제공하는 L형.',
  PURGE_O: '클리어 시 쓰레기 행을 제거합니다.',
  CLEANSE_J: '클리어 시 쓰레기 행을 제거하는 J형.',
  HEAVY_JUNK: '5칸 방해형. 배치가 까다롭고 덱의 부담이 됩니다.',
  POWER_CROSS: '고출력 5칸 십자형.',
  WIDE_JUNK: '6칸 방해형. 까다로운 모양으로 덱을 막습니다.',
  INSTANT_STRIKE: '배치 즉시 1.2 공격력을 발사합니다.',
  INSTANT_GUARD: '배치 즉시 들어오는 공격 게이지를 최대 3 차단합니다.',
  INSTANT_MANA: '배치 즉시 MP를 18 회복합니다.',
  INSTANT_PURGE: '배치 즉시 쓰레기 행 1줄을 제거합니다.'
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
    this.skillCooldowns = {};
    this.battleTimeouts = new Set();
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
    document.getElementById('menuDeck').textContent = `${this.run.deckCount()}장`;
    document.getElementById('loadRunBtn').disabled = !localStorage.getItem(SAVE_KEY);
    document.getElementById('deleteSaveBtn').disabled = !localStorage.getItem(SAVE_KEY);
    this.renderRecords();
  }

  renderRecords() {
    const el = document.getElementById('recordList');
    const records = this.loadRecords();
    const best = records.reduce((top, r) => Math.max(top, r.round), 0);
    if (!records.length) {
      el.innerHTML = '<span class="muted">기록 없음.</span>';
      return;
    }
    el.innerHTML = `<strong>최고 기록 ${best}라운드</strong>` + records.slice(0, 5).map(r =>
      `<span>${r.round}라운드 · ${r.gold}G · ${r.result === 'win' ? '승리' : '패배'}</span>`
    ).join('');
  }

  newRun() {
    document.getElementById('endScreen').classList.remove('run-clear');
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
    document.getElementById('mapTitle').textContent = `${this.run.round}라운드`;
    document.getElementById('mapMeta').textContent = `골드 ${this.run.gold} · HP ${this.run.hpRows} · 덱 ${this.run.deckCount()}장`;
    document.getElementById('rewardPanel').classList.add('hidden');
    this.renderDeckViewer();
    const wrap = document.getElementById('enemyChoices');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    for (const enemy of makeEnemyChoices(this.run.round)) {
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type} ${this.tierClass(enemy.tier)}`;
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
    if (eventKey === 'starter') {
      document.getElementById('eventTitle').textContent = '시작 스킬 선택';
      document.getElementById('eventMeta').textContent = '런을 시작할 스킬을 선택하세요.';
    } else {
      document.getElementById('eventTitle').textContent = eventKey === 'start' ? '시작 이벤트' : `${completed}라운드 이후`;
      document.getElementById('eventMeta').textContent = `골드 ${this.run.gold} · HP ${this.run.hpRows} · 하나 선택`;
    }
    const wrap = document.getElementById('eventChoices');
    wrap.innerHTML = '';
    let choices = [];
    try {
      choices = eventKey === 'starter' ? makeStarterChoices() : makeEventChoices(this.run, eventKey);
    } catch (err) {
      console.warn('Event choices failed', err);
      choices = [];
    }
    if (!choices.length) choices = [{ kind: 'gold', amount: 10, title: '여분의 골드', desc: '소량의 골드를 가져갑니다.' }];
    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.className = `choice event ${this.tierClass(choice.tier)}`;
      btn.innerHTML = `<strong>${choice.title}</strong><span>${this.eventName(choice)}</span><small>${choice.desc}</small>`;
      try {
        this.attachEventPreview(btn, choice);
      } catch {
        btn.insertAdjacentHTML('beforeend', '<small>Preview unavailable.</small>');
      }
      btn.disabled = !this.canUseEvent(choice);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.applyEventChoice(choice, () => {
          this.run.seenEvents.add(eventKey);
          this.normalizePersistentGrid();
          this.showMap();
          this.autoSave();
        });
      });
      wrap.appendChild(btn);
    }
  }

  eventName(choice) {
    if (choice.kind === 'removeCard') return `${choice.price}G · ${CARD_LIBRARY[choice.id].name} 제거`;
    if (choice.kind === 'upgradeCard') return `${CARD_LIBRARY[choice.from].name} → ${CARD_LIBRARY[choice.to].name}`;
    if (choice.kind === 'hpForCurse') return `HP +${choice.amount}, ${CARD_LIBRARY[choice.card].name} 추가`;
    if (choice.kind === 'consumable') return CONSUMABLES[choice.id].name;
    if (choice.kind === 'skill') return SKILLS[choice.id].name;
    if (choice.kind === 'starterSkill') return `MP ${SKILLS[choice.id].cost} 소모`;
    if (choice.kind === 'gold') return `${choice.amount}G 획득`;
    if (choice.kind === 'cleanup') return '이월 쓰레기 제거';
    return '이벤트';
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
    if (choice.kind === 'skill') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = 'S';
      node.appendChild(chip);
    }
  }

  canUseEvent(choice) {
    if (choice.kind === 'removeCard') return this.run.gold >= choice.price;
    if (choice.kind === 'upgradeCard') return true;
    if (choice.kind === 'skill') return !this.run.ownedSkills.includes(choice.id);
    if (choice.kind === 'starterSkill') return true;
    if (choice.kind === 'cleanup') return this.hasCarriedGarbage();
    return true;
  }

  applyEventChoice(choice, done = () => {}) {
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
    if (choice.kind === 'skill') return this.acquireSkill(choice.id, done);
    if (choice.kind === 'starterSkill') {
      this.run.starterPicked = true;
      return this.acquireSkill(choice.id, done);
    }
    if (choice.kind === 'consumable') return this.acquireConsumable(choice.id, done);
    if (choice.kind === 'gold') this.run.gold += choice.amount;
    if (choice.kind === 'cleanup') this.cleanCarriedGarbageRow();
    done();
  }

  showShop() {
    this.show('shopScreen');
    document.getElementById('leaveShopBtn').textContent = '다음 전투';
    document.getElementById('shopGold').textContent = `골드 ${this.run.gold}`;
    const wrap = document.getElementById('shopItems');
    wrap.innerHTML = '';
    const shopKey = String(this.run.round);
    const sold = new Set(this.run.shopStock?.[shopKey]?.sold || []);
    for (const item of makeShopItems(this.run)) {
      const soldOut = sold.has(shopItemKey(item));
      const btn = document.createElement('button');
      btn.className = `choice shop ${this.tierClass(item.tier)}`;
      btn.innerHTML = `<strong>${item.title}</strong><span>${soldOut ? 'Sold Out' : `${item.price} Gold`}</span><small>${this.itemDesc(item)}</small>`;
      this.attachItemPreview(btn, item);
      btn.disabled = soldOut || this.run.gold < item.price || (item.kind === 'skill' && this.run.ownedSkills.includes(item.id));
      btn.addEventListener('click', () => {
        if (btn.disabled || this.run.gold < item.price) return;
        this.buyShopItem(item);
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
      item.className = `deck-card ${this.tierClass(card.tier)}`;
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
      skillWrap.innerHTML = '<span class="muted">장착된 스킬 없음.</span>';
    } else {
      this.run.equippedSkills.forEach((id, index) => {
        const skill = SKILLS[id];
        if (!skill) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(skill.tier)}`;
        item.innerHTML = `<span class="item-chip">${index + 1}</span><span><strong>${skill.name}</strong><small>${skill.desc}</small><small class="cost">${skill.cost} MP</small></span>`;
        skillWrap.appendChild(item);
      });
    }

    if (!this.run.consumables.length) {
      consumableWrap.innerHTML = '<span class="muted">보유 소모품 없음.</span>';
    } else {
      this.run.consumables.forEach((id, index) => {
        const itemDef = CONSUMABLES[id];
        if (!itemDef) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(itemDef.tier)}`;
        item.innerHTML = `<span class="item-chip">${itemDef.short}</span><span><strong>${index + 4}. ${itemDef.name}</strong><small>${itemDef.desc}</small></span>`;
        consumableWrap.appendChild(item);
      });
    }

    if (!this.run.relics.length) {
      relicWrap.innerHTML = '<span class="muted">보유 유물 없음.</span>';
    } else {
      this.run.relics.forEach(id => {
        const relic = RELICS[id];
        if (!relic) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(relic.tier)}`;
        item.innerHTML = `<span class="item-chip">R</span><span><strong>${relic.name}</strong><small>${relic.desc}</small></span>`;
        relicWrap.appendChild(item);
      });
    }
  }

  itemDesc(item) {
    if (item.kind === 'card') {
      const card = CARD_LIBRARY[item.id];
      return `${card.shapeName} + ${card.abilityName} (${card.cellCount}칸): ${CARD_DESCRIPTIONS[item.id] || '이 블록을 덱에 추가합니다.'}`;
    }
    if (item.kind === 'skill') return SKILLS[item.id].desc;
    if (item.kind === 'consumable') return `${CONSUMABLES[item.id].name}: ${CONSUMABLES[item.id].desc}`;
    if (item.kind === 'relic') return RELICS[item.id].desc;
    return `생존 공간 ${item.amount}줄 추가.`;
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

  tierClass(tier) {
    return `tier-${tier || 'bronze'}`;
  }

  buyShopItem(item) {
    const finish = accepted => {
      if (!accepted) return;
      this.run.gold -= item.price;
      const shopKey = String(this.run.round);
      if (!this.run.shopStock[shopKey]) this.run.shopStock[shopKey] = { items: makeShopItems(this.run), sold: [] };
      const sold = this.run.shopStock[shopKey].sold;
      const key = shopItemKey(item);
      if (!sold.includes(key)) sold.push(key);
      this.normalizePersistentGrid();
      this.showShop();
      this.autoSave();
    };
    if (item.kind === 'skill') return this.acquireSkill(item.id, () => finish(true), () => finish(false));
    if (item.kind === 'consumable') return this.acquireConsumable(item.id, () => finish(true), () => finish(false));
    applyReward(this.run, item);
    finish(true);
  }

  acquireSkill(id, done = () => {}, skipped = done) {
    if (this.run.ownedSkills.includes(id)) return skipped(false);
    const add = slot => {
      this.run.ownedSkills.push(id);
      if (slot == null && this.run.equippedSkills.length < 3) this.run.equippedSkills.push(id);
      else if (slot != null) this.run.equippedSkills[slot] = id;
      done(true);
    };
    if (this.run.equippedSkills.length < 3) return add(null);
    this.showSlotPicker({
      title: `${SKILLS[id].name} 장착`,
      desc: SKILLS[id].desc,
      slots: this.run.equippedSkills,
      labels: slotId => SKILLS[slotId]?.name || '비어있음',
      onPick: add,
      onSkip: () => skipped(false)
    });
  }

  acquireConsumable(id, done = () => {}, skipped = done) {
    const add = slot => {
      if (slot == null && this.run.consumables.length < 3) this.run.consumables.push(id);
      else if (slot != null) this.run.consumables[slot] = id;
      done(true);
    };
    if (this.run.consumables.length < 3) return add(null);
    this.showSlotPicker({
      title: `${CONSUMABLES[id].name} 획득`,
      desc: CONSUMABLES[id].desc,
      slots: this.run.consumables,
      labels: slotId => CONSUMABLES[slotId]?.name || '비어있음',
      onPick: add,
      onSkip: () => skipped(false)
    });
  }

  showSlotPicker({ title, desc, slots, labels, onPick, onSkip }) {
    let overlay = document.getElementById('slotPicker');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'slotPicker';
      overlay.innerHTML = '<div class="slot-dialog"><h2></h2><p></p><div class="slot-options"></div><button class="ghost wide" data-skip="1">Skip</button></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('h2').textContent = title;
    overlay.querySelector('p').textContent = desc;
    const options = overlay.querySelector('.slot-options');
    options.innerHTML = '';
    slots.slice(0, 3).forEach((slotId, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerHTML = `<strong>슬롯 ${index + 1}</strong><span>${labels(slotId)}</span>`;
      btn.addEventListener('click', () => {
        overlay.classList.remove('active');
        onPick(index);
      });
      options.appendChild(btn);
    });
    overlay.querySelector('[data-skip]').textContent = '건너뛰기';
    overlay.querySelector('[data-skip]').onclick = () => {
      overlay.classList.remove('active');
      onSkip();
    };
    overlay.classList.add('active');
  }

  startBattle(enemyCard) {
    this.clearBattleTimeouts();
    this.enemyCard = enemyCard;
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    this.enemy = new Board({ rows: enemyCard.startingRows, deck: new Deck(enemyCard.deckExtras || []) });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    if (this.run.relics.includes('hold_cache') && !this.player.held) this.player.mp = Math.min(100, this.player.mp + 15);
    this.ai = new AI(enemyCard.aiProfile, enemyCard.aiSkill);
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
    this.skillCooldowns = {};
    this.message = '전투 시작';
    document.getElementById('battleTitle').textContent = `${this.run.round}라운드`;
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
      const skill = SKILLS[id];
      const btn = document.createElement('button');
      btn.dataset.skillId = id;
      btn.dataset.skillIdx = i;
      btn.innerHTML = `<span>${i + 1}. ${skill.name}</span><small>${skill.cost}MP</small>`;
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
      else this.message = 'Grounded';
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
    return Math.max(GAME_TIMING.LOCK_DELAY_MIN, GAME_TIMING.LOCK_DELAY_START - this.lockResets * GAME_TIMING.LOCK_DELAY_STEP);
  }

  currentFallInterval() {
    return this.groundTouched ? this.currentLockDelay() : GAME_TIMING.PLAYER_FALL_INTERVAL;
  }

  useSkill(index) {
    if (this.paused) return;
    const id = this.run.equippedSkills[index];
    const skill = SKILLS[id];
    if (!skill || this.player.mp < skill.cost) return;
    if ((this.skillCooldowns[id] || 0) > 0) {
      this.message = `${skill.name} 쿨타임`;
      return;
    }
    const ok = skill.activate({ game: this, player: this.player, enemy: this.enemy, resolve: (result, attacker) => this.resolve(result, attacker) }) !== false;
    if (!ok) {
      this.message = `${skill.name} 실패`;
      return;
    }
    this.player.mp -= skill.cost;
    this.skillCooldowns[id] = skill.cooldown || 0;
    this.message = `${skill.name} 발동`;
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
    if (result.comboBreak && attacker === this.player) this.message = `${result.comboBreak}콤보 종료`;
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('mana_lens')) {
      this.player.mp = Math.min(100, this.player.mp + result.mana * 0.35);
    }
    if (result.attack > 0) {
      const attack = result.attack * mult;
      const buffered = defender === this.player && this.run.relics.includes('garbage_buffer') ? Math.max(0, attack - 1) : attack;
      if (buffered > 0) {
        attacker.attackPool += buffered;
        const toSend = Math.floor(attacker.attackPool);
        attacker.attackPool = Number((attacker.attackPool - toSend).toFixed(4));
        if (toSend > 0) defender.receiveGarbage(toSend);
      }
    }
    if (this.player.defeated) return this.queueBattleEnd('loss');
    if (this.enemy.defeated) return this.queueBattleEnd('win');
    this.autoSave();
  }

  queueBattleEnd(result) {
    if (this.battleEndResult) return;
    this.battleEndResult = result;
    this.clearBattleTimeouts();
    this.battleEndDelay = result === 'win' ? GAME_TIMING.BATTLE_WIN_DELAY : GAME_TIMING.BATTLE_LOSS_DELAY;
    this.message = result === 'win' ? '적 처치' : '전투 패배';
    this.autoSave();
  }

  scheduleBattleTimeout(fn, delay) {
    const id = setTimeout(() => {
      this.battleTimeouts.delete(id);
      fn();
    }, delay);
    this.battleTimeouts.add(id);
    return id;
  }

  clearBattleTimeouts() {
    for (const id of this.battleTimeouts) clearTimeout(id);
    this.battleTimeouts.clear();
  }

  winBattle() {
    this.run.gold += this.enemyCard.rewardGold;
    const relicId = this.enemyCard.type === 'elite' ? grantEliteRelic(this.run) : null;
    this.run.persistentGrid = this.player.grid.map(row => row.map(cell => cell?.type === 'garbage' ? { ...cell } : null));
    this.run.hpRows = this.player.rows;
    this.run.deck.refill();
    this.showRewards(makeRewards(this.enemyCard.rewardPool), relicId);
    this.autoSave();
  }

  showRewards(rewards, grantedRelic = null) {
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = `${this.run.round}라운드 클리어`;
    const relicText = grantedRelic ? ` · 유물 획득: ${RELICS[grantedRelic].name}` : '';
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold}G${relicText} · 보상 선택`;
    document.getElementById('enemyChoices').innerHTML = '';
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    rewards.forEach(reward => {
      const btn = document.createElement('button');
      btn.className = `choice reward ${this.tierClass(reward.tier)}`;
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
    return `HP +${reward.amount}줄`;
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
    this.clearBattleTimeouts();
    this.saveRecord(win);
    this.deleteSave(true);
    document.getElementById('endScreen').classList.toggle('run-clear', win);
    this.show('endScreen');
    document.getElementById('endTitle').textContent = win ? 'RUN COMPLETE!' : 'RUN FAILED';
    document.getElementById('endSummary').textContent = `${Math.min(this.run.round, 20)}라운드 · 골드 ${this.run.gold} · HP ${this.run.hpRows}줄`;
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
      shopStock: this.run.shopStock,
      seenEvents: [...this.run.seenEvents],
      starterPicked: this.run.starterPicked
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
    run.shopStock = state.shopStock || {};
    run.seenEvents = new Set(state.seenEvents || []);
    run.starterPicked = state.starterPicked ?? false;
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
        skillCooldowns: { ...this.skillCooldowns },
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
      this.clearBattleTimeouts();
      const state = JSON.parse(raw);
      if (!this.isValidSaveState(state)) throw new Error('Invalid save data');
      this.run = this.restoreRun(state.run);
      if (state.battle && state.screen === 'gameScreen') {
        this.player = Board.fromState(state.battle.player);
        this.enemy = Board.fromState(state.battle.enemy);
        this.enemyCard = state.battle.enemyCard;
        this.ai = new AI(this.enemyCard?.aiProfile || 'balanced', this.enemyCard?.aiSkill);
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
        this.skillCooldowns = { ...(state.battle.skillCooldowns || {}) };
        this.paused = state.battle.paused ?? true;
        this.message = state.battle.message || '불러옴';
        document.getElementById('battleTitle').textContent = `${this.run.round}라운드`;
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

  isValidSaveState(state) {
    if (!state || state.version !== 1 || !state.run) return false;
    const run = state.run;
    if (!Number.isFinite(run.round) || run.round < 1 || run.round > 21) return false;
    if (!Number.isFinite(run.gold) || run.gold < 0) return false;
    if (!Number.isFinite(run.hpRows) || run.hpRows < 10 || run.hpRows > 40) return false;
    if (!run.deck || !Array.isArray(run.deck.draw) || !Array.isArray(run.deck.discard)) return false;
    if (run.persistentGrid && (!Array.isArray(run.persistentGrid) || run.persistentGrid.some(row => !Array.isArray(row)))) return false;
    if (state.battle) {
      if (!state.battle.player || !state.battle.enemy || !state.battle.enemyCard) return false;
      if (!Array.isArray(state.battle.player.grid) || !Array.isArray(state.battle.enemy.grid)) return false;
    }
    return true;
  }

  deleteSave(silent = false) {
    localStorage.removeItem(SAVE_KEY);
    if (!silent) this.refreshMenu();
  }

  togglePause() {
    if (!this.inBattle() || this.battleEndResult) return;
    this.paused = !this.paused;
    document.getElementById('pauseBtn').textContent = this.paused ? '재개' : '일시정지';
    this.message = this.paused ? '일시정지' : '재개';
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
    if (this.autoSaveTimer >= GAME_TIMING.AUTO_SAVE_INTERVAL) {
      this.autoSaveTimer = 0;
      this.autoSave();
    }
    this.input.update(now);
    this.player.flash = Math.max(0, this.player.flash - dt);
    this.enemy.flash = Math.max(0, this.enemy.flash - dt);
    this.player.tickGarbage(dt);
    this.enemy.tickGarbage(dt);
    this.player.tickEffects(dt);
    this.enemy.tickEffects(dt);
    this.player.comboBreakFlash = Math.max(0, this.player.comboBreakFlash - dt);
    this.enemy.comboBreakFlash = Math.max(0, this.enemy.comboBreakFlash - dt);
    this.player.clearTextFlash = Math.max(0, this.player.clearTextFlash - dt);
    this.enemy.clearTextFlash = Math.max(0, this.enemy.clearTextFlash - dt);
    this.enemySlowTimer = Math.max(0, this.enemySlowTimer - dt);
    this.playerSlowTimer = Math.max(0, this.playerSlowTimer - dt);
    Object.keys(this.skillCooldowns).forEach(id => {
      this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt);
    });
    this.updatePlayerGravity(this.playerSlowTimer > 0 ? dt * GAME_TIMING.PLAYER_SLOW_FACTOR : dt);
    this.enemyTimer += dt;
    const enemyDelay = this.currentEnemyDelay();
    if (this.enemyTimer >= enemyDelay) {
      this.enemyTimer = 0;
      this.resolve(this.ai.step(this.enemy), this.enemy);
    }
    this.updateEnemyAbility(dt);
    this.updateSkillButtons();
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

  currentEnemyDelay() {
    const base = this.enemySlowTimer > 0 ? this.enemyCard.speed * GAME_TIMING.ENEMY_SLOW_FACTOR : this.enemyCard.speed;
    return Math.round(base * this.playerPressureRelief());
  }

  playerPressureRelief() {
    if (!this.player) return 1;
    const heights = Array.from({ length: this.player.cols }, (_, c) => {
      for (let r = 0; r < this.player.rows; r++) if (this.player.grid[r][c]) return this.player.rows - r;
      return 0;
    });
    const maxHeight = Math.max(...heights);
    const topPressure = Math.max(0, maxHeight - (this.player.rows - 8));
    const queued = this.player.garbageQueue;
    const ready = this.player.readyGarbage();
    let relief = 1;
    if (topPressure >= 2) relief += Math.min(0.28, topPressure * 0.055);
    if (queued >= 4) relief += Math.min(0.22, (queued - 3) * 0.035);
    if (ready >= 2) relief += Math.min(0.16, ready * 0.035);
    return Math.min(1.58, relief);
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

  updateSkillButtons() {
    if (!this.player || this.player.defeated) return;
    document.querySelectorAll('#touchSkills button[data-skill-id]').forEach(btn => {
      const id = btn.dataset.skillId;
      const skill = SKILLS[id];
      if (!skill) return;
      const cd = this.skillCooldowns[id] || 0;
      const pct = cd > 0 ? 1 - cd / skill.cooldown : 1;
      btn.style.setProperty('--cd-pct', pct.toFixed(3));
      btn.classList.toggle('mp-ready', this.player.mp >= skill.cost && cd === 0);
      btn.classList.toggle('on-cooldown', cd > 0);
    });
  }

  updateEnemyAbility(dt) {
    if (!this.enemyCard.ability) return;
    this.enemyAbilityTimer += dt;
    if (this.enemyAbilityTimer < GAME_TIMING.ENEMY_ABILITY_INTERVAL) return;
    this.enemyAbilityTimer = 0;
    if (this.enemyCard.ability === 'spike') {
      this.player.receiveGarbage(1);
      this.message = `${this.enemyCard.name} 쓰레기 급증`;
    }
    if (this.enemyCard.ability === 'slowPlayer') {
      this.playerSlowTimer = 3000;
      this.message = `${this.enemyCard.name} 중력 둔화`;
    }
    if (this.enemyCard.ability === 'power') {
      this.player.receiveGarbage(2);
      this.message = `${this.enemyCard.name} 파워 폭발`;
    }
  }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260519-ko').catch(() => {});
  });
}
