import { Board } from './board.js?v=20260521-ko20';
import { CARD_DESCRIPTIONS, CARD_LIBRARY, COLORS, GAME_TIMING, TYPES } from './constants.js?v=20260521-ko20';
import { Deck } from './deck.js?v=20260521-ko20';
import { AI } from './ai.js?v=20260521-ko20';
import { Renderer } from './renderer.js?v=20260521-ko20';
import { InputController } from './input.js?v=20260521-ko20';
import { SKILLS } from './skills.js?v=20260521-ko20';
import { CONSUMABLES } from './consumables.js?v=20260521-ko20';
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
  removableDeckCards,
  rerollShopStock,
  restockShopItem,
  shopItemKey,
  shouldShowEvent
} from './progression.js?v=20260521-ko20';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;
window.BBS_RELICS = RELICS;

const RECORD_KEY = 'battleBlockStar.records.v1';
const SAVE_KEY = 'battleBlockStar.save.v1';

// 적 능력은 마나 게이지에 묶인다. 비용/쿨다운은 플레이어 스킬보다 크게 잡고,
// 플레이어에게 직접 효과가 가는 능력일수록 비용을 더 높인다.
const ENEMY_ABILITIES = {
  spike: {
    cost: 55,
    cooldown: 18000,
    cast(g) {
      g.player.receiveGarbage(1);
      g.message = `${g.enemyCard.name} 능력: 쓰레기 급증 +1`;
    }
  },
  slowPlayer: {
    cost: 75,
    cooldown: 22000,
    cast(g) {
      g.playerSlowTimer = 3000;
      g.message = `${g.enemyCard.name} 능력: 중력 둔화 (3초)`;
    }
  },
  power: {
    cost: 80,
    cooldown: 24000,
    cast(g) {
      g.player.receiveGarbage(2);
      g.message = `${g.enemyCard.name} 능력: 파워 폭발 +2`;
    }
  },
  rotateLockPlayer: {
    cost: 60,
    cooldown: 22000,
    cast(g) {
      g.player.rotateLocked = true;
      g.applyPlayerDebuff?.('rotate', 2000);
      const target = g.player;
      g.scheduleBattleTimeout(() => { if (g.player === target) target.rotateLocked = false; }, 2000);
      g.message = `${g.enemyCard.name} 능력: 회전 봉인 (2초)`;
    }
  },
  hyperBurst: {
    cost: 65,
    cooldown: 24000,
    cast(g) {
      g.playerHyperTimer = 2500;
      g.message = `${g.enemyCard.name} 능력: 하이퍼 낙하 (2.5초)`;
    }
  },
  polluteDeck: {
    cost: 60,
    cooldown: 26000,
    cast(g) {
      g.player.deck.pollute(TYPES.HEAVY_JUNK, 1);
      g.message = `${g.enemyCard.name} 능력: 덱 오염 (방해 블록 주입)`;
    }
  }
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
    this.enemyActionStall = 0;
    this.enemyAbilityTimer = 0;
    this.enemySlowTimer = 0;
    this.playerSlowTimer = 0;
    this.battleClearedLines = 0;
    this.battlePlayerPieces = 0;
    this.battlePlayerAttacks = 0;
    this.battleEnemyPieces = 0;
    this.battleEnemyAttacks = 0;
    this.battleElapsedSec = 0;
    this.aiFocusActivations = 0;
    this.aiFocusInEpisode = false;
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
    document.getElementById('menuHp').textContent = `${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows}`;
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
    document.getElementById('mapMeta').textContent = `골드 ${this.run.gold} · HP ${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows} · 덱 ${this.run.deckCount()}장`;
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
      document.getElementById('eventMeta').textContent = `골드 ${this.run.gold} · HP ${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows} · 하나 선택`;
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
          this.routeNextScreen();
          this.autoSave();
        });
      });
      wrap.appendChild(btn);
    }
  }

  eventName(choice) {
    if (choice.kind === 'removeCard') return `${choice.price}G · ${CARD_LIBRARY[choice.id].name} 제거`;
    if (choice.kind === 'removeChoice') return `${choice.price}G · 카드 선택 제거`;
    if (choice.kind === 'upgradeCard') return `${CARD_LIBRARY[choice.from].name} → ${CARD_LIBRARY[choice.to].name}`;
    if (choice.kind === 'hpForCurse') return `HP +${choice.amount}, ${CARD_LIBRARY[choice.card].name} 추가`;
    if (choice.kind === 'consumable') return CONSUMABLES[choice.id].name;
    if (choice.kind === 'skill') return SKILLS[choice.id].name;
    if (choice.kind === 'starterSkill') return `MP ${SKILLS[choice.id].cost} 소모`;
    if (choice.kind === 'gold') return `${choice.amount}G 획득`;
    if (choice.kind === 'cleanup') return '이월 쓰레기 제거';
    if (choice.kind === 'relicDig') return `HP -${choice.amount} · ${RELICS[choice.id].name}`;
    if (choice.kind === 'gamble') return `${choice.bet}G 베팅`;
    if (choice.kind === 'contract') return CARD_LIBRARY[choice.id].name;
    return '이벤트';
  }

  attachEventPreview(node, choice) {
    if (choice.kind === 'removeCard') {
      node.appendChild(this.blockPreview(CARD_LIBRARY[choice.id], 8));
    }
    if (choice.kind === 'removeChoice') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = 'CUT';
      node.appendChild(chip);
    }
    if (choice.kind === 'upgradeCard') {
      node.appendChild(this.blockPreview(CARD_LIBRARY[choice.from], 8));
      node.appendChild(this.blockPreview(CARD_LIBRARY[choice.to], 8));
    }
    if (choice.kind === 'hpForCurse') node.appendChild(this.blockPreview(CARD_LIBRARY[choice.card], 8));
    if (choice.kind === 'contract') node.appendChild(this.blockPreview(CARD_LIBRARY[choice.id], 8));
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
    if (choice.kind === 'removeChoice') return this.run.gold >= choice.price;
    if (choice.kind === 'upgradeCard') return true;
    if (choice.kind === 'skill') return !this.run.ownedSkills.includes(choice.id);
    if (choice.kind === 'starterSkill') return true;
    if (choice.kind === 'cleanup') return this.hasCarriedGarbage();
    if (choice.kind === 'relicDig') return this.run.hpRows - choice.amount >= 8 && !this.run.relics.includes(choice.id);
    if (choice.kind === 'gamble') return this.run.gold >= choice.bet;
    return true;
  }

  applyEventChoice(choice, done = () => {}) {
    if (choice.kind === 'removeCard') {
      this.run.gold -= choice.price;
      this.run.deck.removeCard(choice.id);
      this.run.deck.refill();
    }
    if (choice.kind === 'removeChoice') return this.chooseRemoveCard(choice.price, done);
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
    if (choice.kind === 'relicDig') {
      this.run.hpRows = Math.max(8, this.run.hpRows - choice.amount);
      if (!this.run.relics.includes(choice.id)) this.run.relics.push(choice.id);
    }
    if (choice.kind === 'gamble') {
      this.run.gold -= choice.bet;
      const won = Math.random() < 0.55;
      if (won) this.run.gold += 60;
      return this.playGambleEffect(won, choice.bet, done);
    }
    if (choice.kind === 'contract') this.run.deck.addCard(choice.id);
    done();
  }

  playGambleEffect(won, bet, done = () => {}) {
    const host = document.getElementById('app') || document.body;
    const overlay = document.createElement('div');
    overlay.className = 'gamble-overlay';
    const card = document.createElement('div');
    card.className = 'gamble-card';
    card.textContent = '?';
    const label = document.createElement('div');
    label.className = 'gamble-result';
    label.textContent = '운명을 뒤집는 중…';
    overlay.append(card, label);
    host.appendChild(overlay);

    let finished = false;
    const reveal = () => {
      if (finished) return;
      finished = true;
      card.classList.add('reveal', won ? 'win' : 'lose');
      card.textContent = won ? '+60G' : `-${bet}G`;
      label.textContent = won ? '대박! 베팅 성공' : '꽝… 베팅 실패';
      label.classList.add(won ? 'win' : 'lose');
      setTimeout(() => { overlay.remove(); done(); }, 1150);
    };
    card.addEventListener('animationend', reveal, { once: true });
    setTimeout(reveal, 1300);
  }

  showShop() {
    this.show('shopScreen');
    document.getElementById('leaveShopBtn').textContent = '다음 전투';
    document.getElementById('shopGold').textContent = `골드 ${this.run.gold}`;
    const wrap = document.getElementById('shopItems');
    wrap.innerHTML = '';
    const shopKey = String(this.run.round);
    const items = makeShopItems(this.run);
    const stock = this.run.shopStock?.[shopKey] || {};
    const sold = new Set(stock.sold || []);
    const locked = new Set(stock.locked || []);
    const dealKey = stock.dealKey || null;
    for (const item of items) {
      const key = shopItemKey(item);
      const soldOut = sold.has(key);
      const isDeal = key === dealKey && !soldOut;
      const price = this.effectivePrice(item, isDeal);
      const slot = document.createElement('div');
      slot.className = `shop-slot${locked.has(key) ? ' locked' : ''}${isDeal ? ' deal' : ''}`;
      const btn = document.createElement('button');
      btn.className = `choice shop ${this.tierClass(item.tier)}`;
      btn.innerHTML = `<strong>${item.title}</strong><span>${soldOut ? 'Sold Out' : `${isDeal ? '특가 ' : ''}${price} Gold`}</span><small>${this.itemDesc(item)}</small>`;
      this.attachItemPreview(btn, item);
      btn.disabled = soldOut || this.run.gold < price || (item.kind === 'skill' && this.run.ownedSkills.includes(item.id));
      btn.addEventListener('click', () => {
        if (btn.disabled || this.run.gold < price) return;
        this.buyShopItem(item);
      });
      const lockBtn = document.createElement('button');
      lockBtn.className = 'shop-lock';
      lockBtn.textContent = locked.has(key) ? '잠금됨' : '잠금';
      lockBtn.disabled = soldOut;
      lockBtn.addEventListener('click', () => this.toggleShopLock(item));
      slot.appendChild(btn);
      slot.appendChild(lockBtn);
      wrap.appendChild(slot);
    }
    const rerollCost = this.shopRerollCost();
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'choice shop';
    rerollBtn.innerHTML = `<strong>리롤</strong><span>${rerollCost} Gold</span><small>상점 물건을 새로 뽑습니다. 리롤할 때마다 비용이 10G 증가합니다.</small>`;
    rerollBtn.disabled = this.run.gold < rerollCost;
    rerollBtn.addEventListener('click', () => {
      if (this.run.gold < rerollCost) return;
      this.rerollShop();
    });
    wrap.appendChild(rerollBtn);
  }

  effectivePrice(item, isDeal = false) {
    const base = item.price || 0;
    const merchantPrice = this.run.relics.includes('merchant_token') ? base * 0.75 : base;
    return Math.ceil(isDeal ? merchantPrice * 0.6 : merchantPrice);
  }

  toggleShopLock(item) {
    const shopKey = String(this.run.round);
    const stock = this.run.shopStock?.[shopKey];
    if (!stock) return;
    const key = shopItemKey(item);
    const locked = new Set(stock.locked || []);
    if (locked.has(key)) locked.delete(key);
    else locked.add(key);
    stock.locked = [...locked];
    this.showShop();
    this.autoSave();
  }

  shopRerollCost() {
    const key = String(this.run.round);
    const n = this.run.shopStock?.[key]?.rerolls || 0;
    return 20 + n * 10;
  }

  rerollShop() {
    const cost = this.shopRerollCost();
    if (this.run.gold < cost) return;
    this.run.gold -= cost;
    rerollShopStock(this.run);
    this.showShop();
    this.autoSave();
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
      return `${card.name} (${card.cellCount}칸): ${CARD_DESCRIPTIONS[item.id] || '이 블록을 덱에 추가합니다.'}`;
    }
    if (item.kind === 'skill') return SKILLS[item.id].desc;
    if (item.kind === 'consumable') return `${CONSUMABLES[item.id].name}: ${CONSUMABLES[item.id].desc}`;
    if (item.kind === 'relic') return RELICS[item.id].desc;
    if (item.kind === 'removeChoice') return '덱에서 원하는 카드 1장을 선택해 제거합니다.';
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
    if (item.kind === 'removeChoice') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = 'CUT';
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
    const finish = (accepted, priceOverride = null) => {
      if (!accepted) return;
      const shopKey = String(this.run.round);
      if (!this.run.shopStock[shopKey]) this.run.shopStock[shopKey] = { items: makeShopItems(this.run), sold: [], locked: [] };
      const stock = this.run.shopStock[shopKey];
      const key = shopItemKey(item);
      this.run.gold -= priceOverride ?? this.effectivePrice(item, stock.dealKey === key);
      stock.locked = (stock.locked || []).filter(lockedKey => lockedKey !== key);
      if (this.run.relics.includes('warehouse_key')) {
        const idx = stock.items.findIndex(it => shopItemKey(it) === key);
        const replacement = restockShopItem(this.run, item);
        if (idx >= 0 && replacement) stock.items[idx] = replacement;
        else if (!stock.sold.includes(key)) stock.sold.push(key);
      } else if (!stock.sold.includes(key)) {
        stock.sold.push(key);
      }
      this.normalizePersistentGrid();
      this.showShop();
      this.autoSave();
    };
    if (item.kind === 'skill') return this.acquireSkill(item.id, () => finish(true), () => finish(false));
    if (item.kind === 'consumable') return this.acquireConsumable(item.id, () => finish(true), () => finish(false));
    if (item.kind === 'removeChoice') {
      const shopKey = String(this.run.round);
      const stock = this.run.shopStock?.[shopKey] || {};
      const price = this.effectivePrice(item, stock.dealKey === shopItemKey(item));
      return this.chooseRemoveCard(price, () => finish(true, 0), () => finish(false));
    }
    applyReward(this.run, item);
    finish(true);
  }

  chooseRemoveCard(price, done = () => {}, skipped = () => {}) {
    const cards = removableDeckCards(this.run);
    if (!cards.length || this.run.gold < price) return skipped(false);
    this.showSlotPicker({
      title: '카드 제거',
      desc: `${price}G를 지불하고 덱에서 카드 1장을 제거합니다.`,
      slots: cards,
      labels: id => CARD_LIBRARY[id]?.name || id,
      slotLabel: '카드',
      onPick: index => {
        const id = cards[index];
        if (!id || this.run.gold < price) return skipped(false);
        this.run.gold -= price;
        this.run.deck.removeCard(id);
        this.run.deck.refill();
        done(true);
      },
      onSkip: () => skipped(false)
    });
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

  showSlotPicker({ title, desc, slots, labels, onPick, onSkip, slotLabel = '슬롯' }) {
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
    slots.forEach((slotId, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerHTML = `<strong>${slotLabel} ${index + 1}</strong><span>${labels(slotId)}</span>`;
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
    if (this.run.relics.includes('steel_heart')) {
      this.run.hpRows = Math.min(28, this.run.hpRows + 1);
    }
    this.run.deck.beginBattle();
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    this.enemy = new Board({ rows: enemyCard.startingRows, deck: new Deck(enemyCard.deckExtras || []) });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    if (this.run.relics.includes('natural_heal')) this.player.purgeGarbageRows(2);
    if (this.run.relics.includes('mana_surge')) this.player.mpCap = 120;
    if (this.run.relics.includes('combo_keeper')) this.player.comboGuard = true;
    if (this.run.relics.includes('chain_reactor')) this.player.chainReactor = true;
    this.battleFirstClearUsed = false;
    this.ai = new AI(enemyCard.aiProfile, enemyCard.aiSkill);
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.groundTouched = false;
    this.enemyTimer = 0;
    this.enemyActionStall = 0;
    this.enemyAbilityTimer = 0;
    this.battleClearedLines = 0;
    this.battlePlayerPieces = 0;
    this.battlePlayerAttacks = 0;
    this.battleEnemyPieces = 0;
    this.battleEnemyAttacks = 0;
    this.battleElapsedSec = 0;
    this.aiFocusActivations = 0;
    this.aiFocusInEpisode = false;
    this.battleEndDelay = 0;
    this.battleEndResult = null;
    this.playerFreezeTimer = 0;
    this.playerFogTimer = 0;
    this.playerHyperTimer = 0;
    this.playerInvertTimer = 0;
    this.enemyForceDropTimer = 0;
    this.bossOverloadCharge = 0;
    this.enemyDebuffs = {};
    this.playerDebuffs = {};
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
    if (this.playerInvertTimer > 0) {
      if (action === 'left') action = 'right';
      else if (action === 'right') action = 'left';
    }
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
    if (this.playerHyperTimer > 0) return GAME_TIMING.PLAYER_FALL_INTERVAL * 0.12;
    return GAME_TIMING.PLAYER_FALL_INTERVAL;
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
    if (result.cleared > 0) this.battleClearedLines += result.cleared;
    if (attacker === this.player) this.battlePlayerPieces++;
    else if (attacker === this.enemy) this.battleEnemyPieces++;
    let mult = attacker === this.player && this.run.relics.includes('combo_amp') && this.player.combo >= 2 ? 1.25 : 1;
    if (attacker === this.player && result.cleared > 0 && !this.battleFirstClearUsed && this.run.relics.includes('first_strike')) {
      mult *= 3;
      this.battleFirstClearUsed = true;
      this.message = '첫수 보너스!';
    }
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('first_aid')) {
      const gRows = this.player.grid.filter(row => row.some(c => c?.traits?.includes('garbage'))).length;
      if (gRows >= 6) mult *= 1.3;
    }
    if (attacker === this.player) {
      if (result.slow) this.enemySlowTimer += result.slow;
      if (result.gold) {
        const bountyRate = this.run.relics.includes('bounty_market') ? 1.0 : 0.5;
        this.bountyBank = (this.bountyBank || 0) + result.gold * bountyRate;
        const earned = Math.floor(this.bountyBank);
        if (earned > 0) {
          this.run.gold += earned;
          this.bountyBank -= earned;
        }
      }
    }
    if (result.instant?.enemyGarbage) defender.receiveGarbage(result.instant.enemyGarbage);
    if (result.comboBreak && attacker === this.player) this.message = `${result.comboBreak}콤보 종료`;
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('mana_lens')) {
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + result.mana * 0.35);
    }
    if (attacker === this.player && result.cleared > 0 && !this.player.held && this.run.relics.includes('hold_cache')) {
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + result.mana * 0.5);
    }
    if (result.attack > 0) {
      const attack = (result.attack + this.battleHeatAttackBonus()) * mult;
      if (attacker === this.player) this.battlePlayerAttacks += attack;
      else if (attacker === this.enemy) this.battleEnemyAttacks += attack;
      const buffered = defender === this.player && this.run.relics.includes('garbage_buffer') ? Math.max(0, attack - 1) : attack;
      if (buffered > 0) {
        attacker.attackPool += buffered;
        const toSend = Math.floor(attacker.attackPool);
        attacker.attackPool = Number((attacker.attackPool - toSend).toFixed(4));
        if (toSend > 0) defender.receiveGarbage(toSend);
      }
    }
    if (this.player.defeated && !this.playerSurvivesLethal()) return this.queueBattleEnd('loss');
    if (this.enemy.defeated) return this.queueBattleEnd('win');
    this.autoSave();
  }

  playerSurvivesLethal() {
    if (!this.run.relics.includes('phoenix_feather')) return false;
    this.player.clearAllGarbage();
    this.player.defeated = false;
    if (!this.player.current) this.player.spawn();
    this.run.relics = this.run.relics.filter(r => r !== 'phoenix_feather');
    this.message = '불사조 깃털 발동! 한 번 버팁니다';
    return true;
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
    const goldMult = this.run.relics.includes('greed') ? 1.2 : 1;
    this.run.gold += Math.round(this.enemyCard.rewardGold * goldMult);
    const relicId = (this.enemyCard.type === 'elite' || this.enemyCard.type === 'boss') ? grantEliteRelic(this.run) : null;
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

  garbageRowCount() {
    if (!this.run.persistentGrid) return 0;
    return this.run.persistentGrid.filter(row => row.some(c => c?.type === 'garbage')).length;
  }

  cleanCarriedGarbageRow() {
    if (!this.run.persistentGrid) return;
    let removed = 0;
    for (let r = this.run.persistentGrid.length - 1; r >= 0 && removed < 5; r--) {
      if (this.run.persistentGrid[r].some(cell => cell?.type === 'garbage')) {
        this.run.persistentGrid[r] = Array.from({ length: 10 }, () => null);
        removed++;
      }
    }
    if (removed > 0) {
      const nullRows = this.run.persistentGrid.filter(row => !row.some(c => c?.type === 'garbage'));
      const garbageRows = this.run.persistentGrid.filter(row => row.some(c => c?.type === 'garbage'));
      this.run.persistentGrid = [...nullRows, ...garbageRows];
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
        enemyActionStall: this.enemyActionStall,
        enemyAbilityTimer: this.enemyAbilityTimer,
        enemySlowTimer: this.enemySlowTimer,
        playerSlowTimer: this.playerSlowTimer,
        battleClearedLines: this.battleClearedLines,
        battlePlayerPieces: this.battlePlayerPieces,
        battlePlayerAttacks: this.battlePlayerAttacks,
        battleEnemyPieces: this.battleEnemyPieces,
        battleEnemyAttacks: this.battleEnemyAttacks,
        battleElapsedSec: this.battleElapsedSec,
        aiFocusActivations: this.aiFocusActivations,
        aiFocusInEpisode: this.aiFocusInEpisode,
        battleEndDelay: this.battleEndDelay,
        battleEndResult: this.battleEndResult,
        skillCooldowns: { ...this.skillCooldowns },
        playerFreezeTimer: this.playerFreezeTimer || 0,
        playerFogTimer: this.playerFogTimer || 0,
        playerHyperTimer: this.playerHyperTimer || 0,
        playerInvertTimer: this.playerInvertTimer || 0,
        enemyForceDropTimer: this.enemyForceDropTimer || 0,
        bossOverloadCharge: this.bossOverloadCharge || 0,
        playerDebuffs: { ...(this.playerDebuffs || {}) },
        enemyDebuffs: { ...(this.enemyDebuffs || {}) },
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
        this.enemyActionStall = state.battle.enemyActionStall || 0;
        this.enemyAbilityTimer = state.battle.enemyAbilityTimer || 0;
        this.enemySlowTimer = state.battle.enemySlowTimer || 0;
        this.playerSlowTimer = state.battle.playerSlowTimer || 0;
        this.battleClearedLines = state.battle.battleClearedLines || 0;
        this.battlePlayerPieces = state.battle.battlePlayerPieces || 0;
        this.battlePlayerAttacks = state.battle.battlePlayerAttacks || 0;
        this.battleEnemyPieces = state.battle.battleEnemyPieces || 0;
        this.battleEnemyAttacks = state.battle.battleEnemyAttacks || 0;
        this.battleElapsedSec = state.battle.battleElapsedSec || 0;
        this.aiFocusActivations = state.battle.aiFocusActivations || 0;
        this.aiFocusInEpisode = state.battle.aiFocusInEpisode || false;
        this.autoSaveTimer = 0;
        this.battleEndDelay = state.battle.battleEndDelay || 0;
        this.battleEndResult = state.battle.battleEndResult || null;
        this.skillCooldowns = { ...(state.battle.skillCooldowns || {}) };
        this.playerFreezeTimer = state.battle.playerFreezeTimer || 0;
        this.playerFogTimer = state.battle.playerFogTimer || 0;
        this.playerHyperTimer = state.battle.playerHyperTimer || 0;
        this.playerInvertTimer = state.battle.playerInvertTimer || 0;
        this.enemyForceDropTimer = state.battle.enemyForceDropTimer || 0;
        this.bossOverloadCharge = state.battle.bossOverloadCharge || 0;
        this.playerDebuffs = { ...(state.battle.playerDebuffs || {}) };
        this.enemyDebuffs = { ...(state.battle.enemyDebuffs || {}) };
        this.syncTimedLocks();
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
        message: this.battleEndResult === 'win' ? 'Enemy defeated' : 'You were defeated',
        skillCooldowns: this.skillCooldowns,
        effects: this.currentEffectBadges(),
        playerFog: this.playerFogTimer
      });
      if (this.battleEndDelay <= 0) {
        if (this.battleEndResult === 'win') this.winBattle();
        else this.endRun(false);
      }
      return;
    }
    if (this.paused) {
      const sec = Math.max(0.0001, this.battleElapsedSec);
      const pps = this.battlePlayerPieces / sec;
      const apm = this.battlePlayerAttacks / (sec / 60);
      const ePps = this.battleEnemyPieces / sec;
      const eApm = this.battleEnemyAttacks / (sec / 60);
      this.renderer.draw({
        player: this.player,
        enemy: this.enemy,
        run: this.run,
        battle: 'PAUSED',
        enemyCard: this.enemyCard,
        message: `Paused | YOU ${pps.toFixed(2)}pps ${apm.toFixed(1)}apm | ENEMY ${ePps.toFixed(2)}pps ${eApm.toFixed(1)}apm`,
        skillCooldowns: this.skillCooldowns,
        effects: this.currentEffectBadges(),
        playerFog: this.playerFogTimer
      });
      return;
    }
    this.battleElapsedSec += dt / 1000;
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
    this.playerFreezeTimer = Math.max(0, (this.playerFreezeTimer || 0) - dt);
    this.playerFogTimer = Math.max(0, (this.playerFogTimer || 0) - dt);
    this.playerHyperTimer = Math.max(0, (this.playerHyperTimer || 0) - dt);
    this.playerInvertTimer = Math.max(0, (this.playerInvertTimer || 0) - dt);
    this.enemyForceDropTimer = Math.max(0, (this.enemyForceDropTimer || 0) - dt);
    this.tickDebuffs(dt);
    Object.keys(this.skillCooldowns).forEach(id => {
      this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt);
    });
    this.updatePlayerGravity(this.playerSlowTimer > 0 ? dt * GAME_TIMING.PLAYER_SLOW_FACTOR : dt);
    this.ai.setPressure(this.currentAiPressure());
    this.enemyTimer += dt;
    const enemyDelay = this.currentEnemyDelay();
    if (this.enemyTimer >= enemyDelay) {
      this.enemyTimer = 0;
      this.resolve(this.resolveEnemyStep(), this.enemy);
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
      message: this.message,
      skillCooldowns: this.skillCooldowns,
      effects: this.currentEffectBadges(),
        playerFog: this.playerFogTimer
    });
    this.message = '';
  }

  currentEnemyDelay() {
    const base = this.enemySlowTimer > 0 ? this.enemyCard.speed * GAME_TIMING.ENEMY_SLOW_FACTOR : this.enemyCard.speed;
    return Math.round(base * this.playerPressureRelief() * this.enemyActionStallFactor() * this.aiFocusSlowFactor() * this.playerPpsCatchup() * this.playerMercyFactor());
  }

  applyPlayerDebuff(key, ms) {
    this.playerDebuffs[key] = Math.max(this.playerDebuffs[key] || 0, ms);
  }

  applyEnemyDebuff(key, ms) {
    this.enemyDebuffs[key] = Math.max(this.enemyDebuffs[key] || 0, ms);
  }

  tickDebuffs(dt) {
    for (const store of [this.playerDebuffs, this.enemyDebuffs]) {
      if (!store) continue;
      for (const k of Object.keys(store)) {
        store[k] = Math.max(0, store[k] - dt);
        if (store[k] <= 0) delete store[k];
      }
    }
    this.syncTimedLocks();
  }

  syncTimedLocks() {
    if (this.player) {
      this.player.rotateLocked = (this.playerDebuffs?.rotate || 0) > 0;
    }
    if (this.enemy) {
      this.enemy.rotateLocked = (this.enemyDebuffs?.rotate || 0) > 0 || (this.enemyDebuffs?.blackout || 0) > 0;
      this.enemy.holdLocked = (this.enemyDebuffs?.hold || 0) > 0 || (this.enemyDebuffs?.blackout || 0) > 0;
    }
  }

  currentEffectBadges() {
    const fmt = ms => `${Math.ceil(ms / 1000)}s`;
    const player = [];
    const enemy = [];
    if (this.playerSlowTimer > 0) player.push(`SLOW ${fmt(this.playerSlowTimer)}`);
    if (this.enemySlowTimer > 0) enemy.push(`SLOW ${fmt(this.enemySlowTimer)}`);
    if (this.playerFreezeTimer > 0) player.push(`FREEZE ${fmt(this.playerFreezeTimer)}`);
    if (this.playerFogTimer > 0) player.push(`FOG ${fmt(this.playerFogTimer)}`);
    if (this.playerHyperTimer > 0) player.push(`HYPER ${fmt(this.playerHyperTimer)}`);
    if (this.playerInvertTimer > 0) player.push(`INVERT ${fmt(this.playerInvertTimer)}`);
    if (this.player?.rotateLocked) player.push('ROT-LOCK');
    if (this.aiFocusInEpisode) enemy.push(`FOCUS x${this.aiFocusActivations}`);
    if (this.player?.holdLocked) player.push('HOLD LOCK');
    if (this.enemy?.holdLocked) enemy.push('HOLD LOCK');
    if (this.enemy?.rotateLocked) enemy.push('ROT-LOCK');
    if (this.enemyCard?.ability === 'overload') {
      const chargeTime = Math.max(9000, 14000 - this.battleElapsedSec * 70);
      const pct = Math.min(100, Math.floor((this.bossOverloadCharge / chargeTime) * 100));
      enemy.push(`OVERLOAD ${pct}%`);
    }
    for (const [k, ms] of Object.entries(this.playerDebuffs || {})) player.push(`${k.toUpperCase()} ${fmt(ms)}`);
    for (const [k, ms] of Object.entries(this.enemyDebuffs || {})) enemy.push(`${k.toUpperCase()} ${fmt(ms)}`);
    return { player, enemy };
  }

  resolveEnemyStep() {
    if (this.enemyForceDropTimer > 0 && this.enemy?.current && !this.enemy.defeated) {
      this.ai.queue = [];
      return this.enemy.hardDrop();
    }
    const result = this.ai.step(this.enemy);
    if (result) {
      this.enemyActionStall = 0;
      return result;
    }
    if (['left', 'right', 'rotate', 'hold', 'wait'].includes(this.ai.lastAction)) this.enemyActionStall++;
    else this.enemyActionStall = 0;
    if (this.enemyActionStall >= 6 && this.enemy?.current && !this.enemy.defeated) {
      this.enemyActionStall = 0;
      this.ai.queue = [];
      return this.enemy.hardDrop();
    }
    return null;
  }

  enemyActionStallFactor() {
    return Math.max(0.38, 1 - this.enemyActionStall * 0.14);
  }

  battleHeatAttackBonus() {
    return Math.floor(this.battleClearedLines / 10) * 0.1;
  }

  roundCatchupFactor() {
    const round = this.run?.round || 1;
    if (round <= 10) return 1;
    return Math.max(0, 1 - (round - 10) / 7);
  }

  playerIncomingPressure() {
    if (!this.player) return 0;
    const height = this.boardMaxHeight(this.player);
    return this.player.garbageQueue + this.player.readyGarbage() + Math.max(0, height - (this.player.rows - 8)) * 0.5;
  }

  playerPpsCatchup() {
    if (this.battleElapsedSec < 3.5 || this.battlePlayerPieces < 3) return 1;
    const pps = this.battlePlayerPieces / this.battleElapsedSec;
    if (pps >= 1) return 1;
    const gate = Math.min(1, this.playerIncomingPressure() / 3);
    if (gate <= 0) return 1;
    const deficit = Math.min(0.7, 1 - pps);
    return 1 + deficit * 0.55 * this.roundCatchupFactor() * gate;
  }

  playerMercyDanger() {
    if (!this.player) return 0;
    const projected = this.boardMaxHeight(this.player) + this.player.garbageQueue;
    return projected - (this.player.rows - 3);
  }

  playerMercyFactor() {
    const danger = this.playerMercyDanger();
    if (danger <= 0) return 1;
    return 1 + Math.min(0.6, danger * 0.24) * this.roundCatchupFactor();
  }

  currentAiPressure() {
    const confidence = this.aiConfidence();
    const fatigue = Math.min(0.08, Math.floor(this.battleClearedLines / 12) * 0.015);
    return {
      mistake: Math.min(0.16, fatigue + confidence.mistake),
      hesitate: Math.min(0.85, confidence.hesitate),
      focus: this.aiFocus()
    };
  }

  aiFocus() {
    if (!this.enemy) return 0;
    const enemyHeight = this.boardMaxHeight(this.enemy);
    const projectedHeight = enemyHeight + this.enemy.garbageQueue;
    const danger = projectedHeight - (this.enemy.rows - 3);
    if (danger < 0) {
      this.aiFocusInEpisode = false;
      return 0;
    }
    if (!this.aiFocusInEpisode) {
      this.aiFocusInEpisode = true;
      this.aiFocusActivations++;
    }
    return Math.min(1, Math.max(0.5, (danger + 1) / 3));
  }

  aiFocusSlowFactor() {
    if (!this.aiFocusInEpisode || this.aiFocusActivations < 2) return 1;
    return 1 + Math.min(1.2, (this.aiFocusActivations - 1) * 0.22);
  }

  aiConfidence() {
    if (!this.player || !this.enemy) return { mistake: 0, hesitate: 0 };
    const playerHeight = this.boardMaxHeight(this.player);
    const enemyHeight = this.boardMaxHeight(this.enemy);
    const playerPressure = playerHeight + this.player.garbageQueue * 0.75 + this.player.readyGarbage() * 1.1;
    const enemyComfort = Math.max(0, this.enemy.rows - enemyHeight - 9);
    const gap = playerPressure - enemyHeight;
    if (playerPressure < this.player.rows * 0.48 || enemyComfort < 3 || gap < 4) return { mistake: 0, hesitate: 0 };
    return {
      mistake: Math.min(0.09, 0.02 + gap * 0.006 + enemyComfort * 0.005),
      hesitate: Math.min(0.55, 0.1 + gap * 0.025 + enemyComfort * 0.02)
    };
  }

  boardMaxHeight(board) {
    let max = 0;
    for (let c = 0; c < board.cols; c++) {
      for (let r = 0; r < board.rows; r++) {
        if (board.grid[r][c]) {
          max = Math.max(max, board.rows - r);
          break;
        }
      }
    }
    return max;
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
    if (this.playerFreezeTimer > 0) return;
    if (this.isPlayerGrounded()) {
      this.groundTouched = true;
      this.fallTimer = 0;
      if (this.player.current.card.traits.includes('heavy')) {
        this.lockTimer = 0;
        this.lockResets = 0;
        this.groundTouched = false;
        this.resolve(this.player.lock(), this.player);
        return;
      }
      this.lockTimer += dt;
      if (this.lockTimer >= this.currentLockDelay()) {
        this.lockTimer = 0;
        this.lockResets = 0;
        this.groundTouched = false;
        this.resolve(this.player.lock(), this.player);
      }
      return;
    }

    this.lockTimer = 0;
    this.groundTouched = false;
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
      const pct = cd > 0 ? 1 - cd / skill.cooldown : 0;
      btn.style.setProperty('--cd-pct', pct.toFixed(3));
      btn.classList.toggle('has-mp', this.player.mp >= skill.cost);
      btn.classList.toggle('mp-ready', this.player.mp >= skill.cost && cd === 0);
      btn.classList.toggle('on-cooldown', cd > 0);
      const small = btn.querySelector('small');
      if (small) small.textContent = cd > 0 ? `${(cd / 1000).toFixed(1)}s` : `${skill.cost}MP`;
    });
  }

  updateEnemyAbility(dt) {
    const ability = this.enemyCard.ability;
    if (!ability) return;
    if (ability === 'overload') return this.updateBossOverload(dt);
    // 적 능력은 마나 게이지에 묶인다: 적이 마나를 모으고 쿨다운이 끝나야 발동.
    const cfg = ENEMY_ABILITIES[ability];
    if (!cfg) return;
    this.enemyAbilityTimer += dt;
    if (this.enemyAbilityTimer < cfg.cooldown) return;
    if ((this.enemy?.mp || 0) < cfg.cost) return;
    this.enemyAbilityTimer = 0;
    this.enemy.mp = Math.max(0, this.enemy.mp - cfg.cost);
    cfg.cast(this);
  }

  updateBossOverload(dt) {
    this.bossOverloadCharge += dt;
    const chargeTime = Math.max(9000, 14000 - this.battleElapsedSec * 70);
    if (this.bossOverloadCharge < chargeTime) return;
    if ((this.enemy?.mp || 0) < 40) return;
    this.bossOverloadCharge = 0;
    this.enemy.mp = Math.max(0, this.enemy.mp - 40);
    this.castBossDebuff();
  }

  castBossDebuff() {
    const name = this.enemyCard.name;
    const kinds = ['fog', 'invert', 'rotate', 'hyper', 'slow', 'garbage'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'fog') {
      this.playerFogTimer = 4000;
      this.message = `${name} OVERLOAD: 안개 (4초)`;
    } else if (kind === 'invert') {
      this.playerInvertTimer = 3500;
      this.message = `${name} OVERLOAD: 좌우 반전 (3.5초)`;
    } else if (kind === 'rotate') {
      this.player.rotateLocked = true;
      this.applyPlayerDebuff('rotate', 3000);
      const target = this.player;
      this.scheduleBattleTimeout(() => { if (this.player === target) target.rotateLocked = false; }, 3000);
      this.message = `${name} OVERLOAD: 회전 봉인 (3초)`;
    } else if (kind === 'hyper') {
      this.playerHyperTimer = 2500;
      this.message = `${name} OVERLOAD: 하이퍼 낙하 (2.5초)`;
    } else if (kind === 'slow') {
      this.playerSlowTimer = 3500;
      this.message = `${name} OVERLOAD: 중력 둔화 (3.5초)`;
    } else {
      this.player.addDurableGarbage(2, 2);
      this.message = `${name} OVERLOAD: 지속 가비지 2줄`;
    }
  }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260521-ko20').catch(() => {});
  });
}
