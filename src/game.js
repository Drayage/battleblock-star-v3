import { Board } from './board.js?v=20260521-ko50';
import { ABILITY_GLYPH, BASE_TYPES, CARD_DESCRIPTIONS, CARD_LIBRARY, COLORS, GAME_TIMING, SET_DEFINITIONS, TYPES } from './constants.js?v=20260521-ko50';
import { Deck } from './deck.js?v=20260521-ko50';
import { AI } from './ai.js?v=20260521-ko50';
import { Renderer } from './renderer.js?v=20260521-ko50';
import { InputController } from './input.js?v=20260521-ko50';
import { SKILLS } from './skills.js?v=20260521-ko50';
import { CONSUMABLES } from './consumables.js?v=20260521-ko50';
import {
  RunState,
  RELICS,
  BLOCK_UPGRADES,
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
  shouldShowEvent,
  setProgress,
  abilityOf
} from './progression.js?v=20260521-ko50';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;
window.BBS_RELICS = RELICS;

const RECORD_KEY = 'battleBlockStar.records.v1';
const SAVE_KEY = 'battleBlockStar.save.v1';

// 적 능력은 마나 게이지에 묶인다. 비용/쿨다운은 플레이어 스킬보다 크게 잡고,
// 플레이어에게 직접 효과가 가는 능력일수록 비용을 더 높인다.
const ENEMY_ABILITIES = {
  spike: {
    label: '쓰레기 급증',
    desc: '쓰레기 행 +1을 즉시 전송합니다.',
    cost: 55,
    cooldown: 18000,
    cast(g) {
      g.player.receiveGarbage(1);
      g.flashAlert(`${g.enemyCard.name} 능력: 쓰레기 급증 +1`);
    }
  },
  slowPlayer: {
    label: '중력 둔화',
    desc: '3초 동안 낙하 속도 감소·하드드랍 불가.',
    cost: 75,
    cooldown: 22000,
    cast(g) {
      g.playerSlowTimer = 3000;
      g.flashAlert(`${g.enemyCard.name} 능력: 중력 둔화 (3초)`);
    }
  },
  power: {
    label: '파워 폭발',
    desc: '쓰레기 행 +2를 즉시 전송합니다.',
    cost: 80,
    cooldown: 24000,
    cast(g) {
      g.player.receiveGarbage(2);
      g.flashAlert(`${g.enemyCard.name} 능력: 파워 폭발 +2`);
    }
  },
  rotateLockPlayer: {
    label: '회전 봉인',
    desc: '2초 동안 블록 회전을 봉인합니다.',
    cost: 60,
    cooldown: 22000,
    cast(g) {
      g.player.rotateLocked = true;
      g.applyPlayerDebuff?.('rotate', 2000);
      const target = g.player;
      g.scheduleBattleTimeout(() => { if (g.player === target) target.rotateLocked = false; }, 2000);
      g.flashAlert(`${g.enemyCard.name} 능력: 회전 봉인 (2초)`);
    }
  },
  hyperBurst: {
    label: '하이퍼 낙하',
    desc: '5초 동안 블록이 극도로 빠르게 낙하합니다.',
    cost: 65,
    cooldown: 24000,
    cast(g) {
      g.playerHyperTimer = 5000;
      g.flashAlert(`${g.enemyCard.name} 능력: 하이퍼 낙하 (5초)`);
    }
  },
  polluteDeck: {
    label: '덱 오염',
    desc: '내 덱에 방해 블록(납 덩어리)을 1장 주입합니다.',
    cost: 60,
    cooldown: 26000,
    cast(g) {
      g.player.deck.pollute(TYPES.HEAVY_JUNK, 1);
      g.flashAlert(`${g.enemyCard.name} 능력: 덱 오염 (방해 블록 주입)`);
    }
  },
  rushGauge: {
    label: '게이지 가속',
    desc: '5초 동안 적 공격이 게이지에서 더 빠르게 도달합니다.',
    cost: 60,
    cooldown: 20000,
    cast(g) {
      g.playerGaugeRushTimer = 5000;
      g.flashAlert(`${g.enemyCard.name} 능력: 게이지 가속 (5초)`);
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
    this.enemyStunTimer = 0;
    this.playerSlowTimer = 0;
    this.battleClearedLines = 0;
    this.battlePlayerClearedLines = 0;
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
    document.getElementById('shopDeckBtn')?.addEventListener('click', () => this.openDeckOverlay());
    document.getElementById('eventDeckBtn')?.addEventListener('click', () => this.openDeckOverlay());
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
    for (const enemy of makeEnemyChoices(this.run.round, this.run.relics)) {
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type} ${this.tierClass(enemy.tier)}`;
      const challengeHtml = enemy.challenge
        ? `<small class="challenge-tag">🏆 도전: ${enemy.challenge.cond}<br>　└ 보상 ${enemy.challenge.reward.label}${enemy.challenge.reward.detail ? ` — ${enemy.challenge.reward.detail}` : ''}</small>`
        : '';
      const abilityDef = enemy.ability && enemy.ability !== 'overload' ? ENEMY_ABILITIES[enemy.ability] : null;
      const abilityHtml = abilityDef
        ? `<small class="ability-tag">⚔️ 능력: [${abilityDef.label}] ${abilityDef.desc}</small>`
        : (enemy.ability === 'overload' ? `<small class="ability-tag">⚔️ 능력: [OVERLOAD] 게이지가 차면 무작위 디버프를 시전합니다.</small>` : '');
      btn.innerHTML = `
        <strong>${enemy.icon ? `${enemy.icon} ` : ''}${enemy.name}</strong>
        <span>${enemy.type.toUpperCase()} - ${enemy.rewardGold}G - HP ${enemy.startingRows}</span>
        <small>${enemy.style}</small>
        <small>AI ${enemy.aiProfile} - Speed ${enemy.speed} - Garbage ${enemy.startingGarbage}</small>
        ${abilityHtml}
        ${challengeHtml}
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
    const offeredGamble = (eventKey === 'starter' || eventKey === 'start') ? null : this.run.gambleNext;
    let choices = [];
    try {
      choices = eventKey === 'starter' ? makeStarterChoices() : makeEventChoices(this.run, eventKey);
    } catch (err) {
      console.warn('Event choices failed', err);
      choices = [];
    }
    // 제시된 상위 도박을 '살 수 있었는데' 안 골랐을 때만 체인을 닫는다(골드 부족으로 강제 종료 방지).
    const offeredGambleAffordable = offeredGamble
      && choices.some(c => c.kind === 'gamble' && this.canUseEvent(c));
    if (!choices.length) choices = [{ kind: 'gold', amount: 10, title: '여분의 골드', desc: '소량의 골드를 가져갑니다.' }];
    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.className = `choice event ${this.tierClass(choice.tier)}`;
      btn.innerHTML = `<strong>${this.kindLabel(choice.kind)}${this.kindIcon(choice)}${choice.title}</strong><span>${this.eventName(choice)}</span><small>${choice.desc}</small>`;
      try {
        this.attachEventPreview(btn, choice);
      } catch {
        btn.insertAdjacentHTML('beforeend', '<small>Preview unavailable.</small>');
      }
      btn.disabled = !this.canUseEvent(choice);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (offeredGambleAffordable && choice.kind !== 'gamble') {
          this.run.gambleClosed = true;
          this.run.gambleNext = null;
        }
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
    if (choice.kind === 'upgradeCard') return `${CARD_LIBRARY[choice.from].name} → ${CARD_LIBRARY[choice.to].name}${this.setTag(choice.to)}`;
    if (choice.kind === 'hpForCurse') return `HP +${choice.amount}, ${CARD_LIBRARY[choice.card].name} 추가`;
    if (choice.kind === 'consumable') return CONSUMABLES[choice.id].name;
    if (choice.kind === 'skill') return `${SKILLS[choice.id].name} (MP ${SKILLS[choice.id].cost})`;
    if (choice.kind === 'starterSkill') return `MP ${SKILLS[choice.id].cost} 소모`;
    if (choice.kind === 'gold') return `${choice.amount}G 획득`;
    if (choice.kind === 'cleanup') return '이월 쓰레기 제거';
    if (choice.kind === 'relicDig') return `HP -${choice.amount} · ${RELICS[choice.id].name}`;
    if (choice.kind === 'gamble') return `${choice.bet}G 베팅`;
    if (choice.kind === 'contract') return CARD_LIBRARY[choice.id].name;
    if (choice.kind === 'setRelic') return RELICS[choice.id].name;
    if (choice.kind === 'grantCard') return `${CARD_LIBRARY[choice.id].name} 획득`;
    return '이벤트';
  }

  kindLabel(kind) {
    const map = {
      card: '블록', grantCard: '블록', contract: '블록', upgradeCard: '블록',
      skill: '스킬', starterSkill: '스킬',
      consumable: '소모품',
      relic: '유물', relicDig: '유물', setRelic: '유물',
      hp: 'HP', hpForCurse: 'HP',
      removeCard: '제거', removeChoice: '제거', gamble: '도박', cleanup: '정리', gold: '골드'
    };
    return map[kind] ? `<em class="kind-tag">[${map[kind]}]</em> ` : '';
  }

  kindIcon(choice) {
    if (!choice) return '';
    const k = choice.kind;
    if (k === 'skill' || k === 'starterSkill') return SKILLS[choice.id]?.icon ? `${SKILLS[choice.id].icon} ` : '';
    if (k === 'consumable') return CONSUMABLES[choice.id]?.icon ? `${CONSUMABLES[choice.id].icon} ` : '';
    if (k === 'relic' || k === 'relicDig' || k === 'setRelic') return RELICS[choice.id]?.icon ? `${RELICS[choice.id].icon} ` : '';
    if (k === 'card' || k === 'grantCard' || k === 'contract' || k === 'upgradeCard') {
      const cardId = k === 'upgradeCard' ? choice.to : choice.id;
      const glyph = ABILITY_GLYPH[CARD_LIBRARY[cardId]?.abilityId];
      return `${glyph || '🧩'} `;
    }
    const fallback = {
      hp: '❤️', hpForCurse: '❤️',
      removeCard: '✂️', removeChoice: '✂️', gamble: '🎰', cleanup: '🧽', gold: '💰'
    };
    return fallback[k] ? `${fallback[k]} ` : '';
  }

  setTag(cardId) {
    const ab = abilityOf(cardId);
    if (!ab) return '';
    // 7형태 세트 구성원(I~Z)만 진행도를 표기한다. 펜토/크로스 등 변종은 제외.
    if (!Object.values(SET_DEFINITIONS[ab] || {}).includes(cardId)) return '';
    const p = setProgress(this.run, ab);
    return p ? ` (${p.have}/${p.total})` : '';
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
    if (choice.kind === 'grantCard') node.appendChild(this.blockPreview(CARD_LIBRARY[choice.id], 8));
    if (choice.kind === 'setRelic') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = 'SET';
      node.appendChild(chip);
    }
    if (choice.kind === 'consumable') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = CONSUMABLES[choice.id].icon || CONSUMABLES[choice.id].short;
      node.appendChild(chip);
    }
    if (choice.kind === 'skill') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = SKILLS[choice.id]?.icon || 'S';
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
    if (choice.kind === 'setRelic') {
      if (!this.run.relics.includes(choice.id)) this.run.relics.push(choice.id);
    }
    if (choice.kind === 'grantCard') {
      this.run.deck.addCard(choice.id);
      if (choice.eventTag) this.run.seenEvents.add(choice.eventTag);
    }
    if (choice.kind === 'gamble') {
      const tier = choice.gtier || 'bronze';
      this.run.gold -= choice.bet;
      const won = Math.random() < (choice.chance ?? 0.55);
      if (won) {
        this.run.gold += choice.reward ?? 60;
        if (tier === 'bronze') this.run.gambleNext = 'silver';
        else if (tier === 'silver') this.run.gambleNext = 'gold';
        else if (tier === 'gold') {
          if (!this.run.relics.includes('alchemy_core')) this.run.relics.push('alchemy_core');
          this.applyAlchemyCore();
          this.run.gambleNext = null;
          this.run.gambleClosed = true;
        }
      } else {
        if (tier !== 'bronze') this.run.gambleClosed = true;
        this.run.gambleNext = null;
      }
      return this.playGambleEffect(won, choice.bet, done, choice.reward ?? 60);
    }
    if (choice.kind === 'contract') this.run.deck.addCard(choice.id);
    done();
  }

  applyAlchemyCore() {
    for (const base of BASE_TYPES) {
      const pool = BLOCK_UPGRADES[base];
      if (!pool || !pool.length) continue;
      const to = pool[Math.floor(Math.random() * pool.length)];
      this.run.deck.replaceCard(base, to);
    }
    this.run.deck.refill();
  }

  playGambleEffect(won, bet, done = () => {}, reward = 60) {
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
      card.textContent = won ? `+${reward}G` : `-${bet}G`;
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
      btn.innerHTML = `<strong>${this.kindLabel(item.kind)}${this.kindIcon(item)}${item.title}</strong><span>${soldOut ? 'Sold Out' : `${isDeal ? '특가 ' : ''}${price} Gold`}</span><small>${this.itemDesc(item)}</small>`;
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
    this.renderDeckSections({
      deck: document.getElementById('deckList'),
      skill: document.getElementById('skillList'),
      consumable: document.getElementById('consumableList'),
      relic: document.getElementById('relicList')
    });
  }

  openDeckOverlay() {
    let ov = document.getElementById('deckModal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'deckModal';
      ov.innerHTML = '<div class="deck-modal-inner">'
        + '<button class="ghost wide" data-close="1">닫기</button>'
        + '<div class="deck-section"><h3>덱</h3><div id="mDeckList" class="deck-list"></div></div>'
        + '<div class="deck-section"><h3>스킬</h3><div id="mSkillList" class="loadout-list"></div></div>'
        + '<div class="deck-section"><h3>소모품</h3><div id="mConsumableList" class="loadout-list"></div></div>'
        + '<div class="deck-section"><h3>유물</h3><div id="mRelicList" class="loadout-list"></div></div>'
        + '</div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov || e.target.dataset.close) ov.classList.remove('active'); });
    }
    this.renderDeckSections({
      deck: ov.querySelector('#mDeckList'),
      skill: ov.querySelector('#mSkillList'),
      consumable: ov.querySelector('#mConsumableList'),
      relic: ov.querySelector('#mRelicList')
    });
    ov.classList.add('active');
  }

  renderDeckSections({ deck, skill, consumable, relic }) {
    if (deck) {
      const counts = new Map();
      for (const id of this.run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
      for (const id of this.run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
      for (const id of this.run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
      deck.innerHTML = '';
      // 모양별 요약 (모든 shapeId 표시)
      const SHAPE_LABEL = { I:'I', J:'J', L:'L', O:'O', S:'S', T:'T', Z:'Z', CROSS5:'십자', HEAVY5:'중량', WIDE6:'6칸', HOOK5:'훅', PENTA_T:'펜T' };
      const SHAPE_ORDER = ['I','J','L','O','S','T','Z','CROSS5','HEAVY5','WIDE6','HOOK5','PENTA_T'];
      const shapeCounts = new Map();
      for (const [id, cnt] of counts) {
        const sid = CARD_LIBRARY[id]?.shapeId;
        if (sid) shapeCounts.set(sid, (shapeCounts.get(sid) || 0) + cnt);
      }
      const parts = SHAPE_ORDER.filter(s => shapeCounts.has(s)).map(s => `${SHAPE_LABEL[s] ?? s}×${shapeCounts.get(s)}`);
      if (parts.length) {
        const summary = document.createElement('div');
        summary.className = 'deck-shape-summary';
        summary.textContent = parts.join('  ');
        deck.appendChild(summary);
      }
      [...counts.entries()].sort((a, b) => CARD_LIBRARY[a[0]].name.localeCompare(CARD_LIBRARY[b[0]].name)).forEach(([id, count]) => {
        const card = CARD_LIBRARY[id];
        const item = document.createElement('div');
        item.className = `deck-card ${this.tierClass(card.tier)}`;
        item.appendChild(this.blockPreview(card, 7));
        item.insertAdjacentHTML('beforeend', `<span>${card.name}${this.setTag(id)}</span><strong>x${count}</strong>`);
        deck.appendChild(item);
      });
    }
    this.renderLoadoutViewer(skill, consumable, relic);
  }

  renderLoadoutViewer(skillWrap = document.getElementById('skillList'), consumableWrap = document.getElementById('consumableList'), relicWrap = document.getElementById('relicList')) {
    if (!skillWrap || !consumableWrap || !relicWrap) return;
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
        item.innerHTML = `<span class="item-chip">${skill.icon || index + 1}</span><span><strong>${index + 1}. ${skill.name}</strong><small>${skill.desc}</small><small class="cost">${skill.cost} MP</small></span>`;
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
        item.innerHTML = `<span class="item-chip">${itemDef.icon || itemDef.short}</span><span><strong>${index + 4}. ${itemDef.name}</strong><small>${itemDef.desc}</small></span>`;
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
        item.innerHTML = `<span class="item-chip">${relic.icon || 'R'}</span><span><strong>${relic.name}</strong><small>${relic.desc}</small></span>`;
        relicWrap.appendChild(item);
      });
    }
  }

  itemDesc(item) {
    if (item.kind === 'card') {
      const card = CARD_LIBRARY[item.id];
      return `${card.name}${this.setTag(item.id)} (${card.cellCount}칸): ${CARD_DESCRIPTIONS[item.id] || '이 블록을 덱에 추가합니다.'}`;
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
      chip.textContent = CONSUMABLES[item.id].icon || CONSUMABLES[item.id].short;
      node.appendChild(chip);
    }
    if (item.kind === 'relic') {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.textContent = RELICS[item.id]?.icon || 'R';
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
    const allCards = [...this.run.deck.draw, ...this.run.deck.discard];
    const counts = new Map();
    for (const id of allCards) counts.set(id, (counts.get(id) || 0) + 1);
    this.showSlotPicker({
      title: '카드 제거',
      desc: `${price}G를 지불하고 덱에서 카드 1장을 제거합니다.`,
      slots: cards,
      labels: id => { const cnt = counts.get(id) || 1; const name = CARD_LIBRARY[id]?.name || id; return cnt > 1 ? `${name} x${cnt}` : name; },
      preview: id => this.blockPreview(CARD_LIBRARY[id], 8),
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

  showSlotPicker({ title, desc, slots, labels, onPick, onSkip, slotLabel = '슬롯', preview = null }) {
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
      if (preview) {
        try { btn.appendChild(preview(slotId)); } catch { /* preview optional */ }
      }
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
    this.run.deck.exhaustImmune = this.run.relics.includes('preservation_seal');
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    const enemyDeck = enemyCard.mirror ? new Deck([...this.run.deck.extraCards]) : new Deck(enemyCard.deckExtras || []);
    this.enemy = new Board({ rows: enemyCard.startingRows, deck: enemyDeck });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    for (const entry of this.enemy.garbageEntries) entry.timer = 0;
    if (this.run.relics.includes('natural_heal')) this.player.purgeGarbageRows(2);
    if (this.run.relics.includes('mana_surge')) this.player.mpCap = 120;
    if (this.run.relics.includes('combo_keeper')) this.player.comboGuard = true;
    if (this.run.relics.includes('chain_reactor')) this.player.chainReactor = true;
    if (this.run.relics.includes('set_blastcap')) this.player.explodeRadiusBonus = 1;
    if (this.run.relics.includes('set_sanctuary')) this.player.sanctuaryActive = true;
    if (this.run.relics.includes('set_comboengine')) this.player.comboEngine = true;
    if (this.run.relics.includes('charge_capacitor')) {
      this.player.chargeCapBonus = true;
      this.player.chargeCarryOver = true;
    }
    if (this.run.relics.includes('instant_gauge')) this.player.instantGarbage = true;
    // 클리어 지연(파란색)은 플레이어만, AI는 미적용 → 포커스 중에도 정상 착탄.
    this.player.delaysGarbageOnClear = true;
    this.enemy.delaysGarbageOnClear = false;
    this.gaugeStallTimer = 0;
    this.playerGaugeRushTimer = 0;
    this.enemyAbilitySuppressTimer = 0;
    this.alertText = '';
    this.alertTimer = 0;
    this.battleFirstClearUsed = false;
    this.ai = new AI(enemyCard.aiProfile, enemyCard.aiSkill);
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.groundTouched = false;
    this.enemyTimer = 0;
    this.enemyStunTimer = 0;
    this.enemyActionStall = 0;
    this.enemyAbilityTimer = 0;
    this.battleClearedLines = 0;
    this.battlePlayerClearedLines = 0;
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
    this.bossRhythmSent = 0;
    this.bossRhythmRestTimer = 0;
    this.enemyDebuffs = {};
    this.playerDebuffs = {};
    this.battleUsedHold = false;
    this.battleUsedSkill = false;
    this.battleUsedHardDrop = false;
    this.battleUsedCcw = false;
    this.battleUsedCw = false;
    this.activeChallenge = enemyCard.challenge || null;
    this.challengeRewarded = false;
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
      btn.innerHTML = `<span>${skill.icon ? `${skill.icon} ` : ''}${i + 1}. ${skill.name}</span><small>${skill.cost}MP</small>`;
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
      btn.textContent = `${i + 4}. ${CONSUMABLES[id].icon || CONSUMABLES[id].short}`;
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
    if (action === 'rotate') { this.groundAdjust(() => this.player.rotate(1)); this.battleUsedCw = true; }
    if (action === 'ccw') { this.groundAdjust(() => this.player.rotate(-1)); this.battleUsedCcw = true; }
    if (action === 'hold') { if (this.player.hold()) this.battleUsedHold = true; }
    if (action === 'hard') { if (this.playerSlowTimer > 0) return; this.battleUsedHardDrop = true; this.resolve(this.player.hardDrop(), this.player); }
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
    this.battleUsedSkill = true;
    this.player.mp -= skill.cost;
    const cdFactor = this.run.relics.includes('set_manawell') ? 0.5 : 1;
    this.skillCooldowns[id] = (skill.cooldown || 0) * cdFactor;
    this.message = `${skill.name} 발동`;
  }

  useConsumable(index) {
    if (this.paused) return;
    const id = this.run.consumables[index];
    const item = CONSUMABLES[id];
    if (!item) return;
    this.run.consumables.splice(index, 1);
    this.message = item.use({ game: this, player: this.player, enemy: this.enemy });
    if (this.player && this.enemy) this.renderer.resize(this.player.rows, this.enemy.rows);
    this.renderTouchSlots();
  }

  resolve(result, attacker) {
    if (!result) return;
    const defender = attacker === this.player ? this.enemy : this.player;
    if (result.cleared > 0) this.battleClearedLines += result.cleared;
    if (result.cleared > 0 && attacker === this.player) this.battlePlayerClearedLines += result.cleared;
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
    if (attacker === this.player && this.run.relics.includes('set_goldhand')) {
      mult *= 1 + Math.min(1, this.run.gold / 200);
    }
    if (attacker === this.player) {
      if (result.slow) {
        const wasSlowed = this.enemySlowTimer > 0;
        const slowAdd = this.run.relics.includes('set_abszero') ? result.slow * 2 : result.slow;
        this.enemySlowTimer += slowAdd;
        if (wasSlowed && this.run.relics.includes('frost_lock')) {
          this.enemyStunTimer += Math.floor(slowAdd * 0.5);
        }
      }
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
    if (result.instant?.dispelEnemy && attacker === this.player) this.dispelEnemyAbilities();
    if (result.comboBreak && attacker === this.player) this.message = `${result.comboBreak}콤보 종료`;
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('mana_lens')) {
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + result.mana * 0.35);
    }
    if (attacker === this.player && result.cleared > 0 && !this.player.held && this.run.relics.includes('hold_cache')) {
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + result.mana * 0.5);
    }
    if (result.attack > 0) {
      // Heat and power scaling are shared battle pressure and apply to both sides.
      const heat = this.battleHeatAttackBonus();
      const powerBonus = (result.powerCells || 0) * 0.01 * Math.floor(this.battleClearedLines / 10);
      let attack = (result.attack + heat + powerBonus) * mult;
      if (attacker === this.player) {
        if (this.run.relics.includes('set_overload') && attack >= 2) attack += 1;
        if (this.run.relics.includes('set_abszero') && this.enemySlowTimer > 0) attack += 1;
      }
      if (defender === this.player && this.run.relics.includes('set_abszero') && this.enemySlowTimer > 0) {
        attack = Math.max(0, attack - 1);
      }
      if (attacker === this.player) this.battlePlayerAttacks += attack;
      else if (attacker === this.enemy) {
        this.battleEnemyAttacks += attack;
        if (this.enemyCard?.ability === 'overload' && this.bossRhythmRestTimer <= 0) {
          this.bossRhythmSent = (this.bossRhythmSent || 0) + attack;
          if (this.bossRhythmSent >= 20) {
            this.bossRhythmSent = 0;
            this.bossRhythmRestTimer = 4500;
          }
        }
      }
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

  flashAlert(text, ms = 1600) {
    this.alertText = text;
    this.alertTimer = ms;
    this.message = text;
  }

  showToast(text, kind = 'elite', ms = 2800) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    container.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  dispelEnemyAbilities() {
    this.playerFogTimer = 0;
    this.playerInvertTimer = 0;
    this.playerHyperTimer = 0;
    this.playerSlowTimer = 0;
    this.playerFreezeTimer = 0;
    if (this.player) this.player.rotateLocked = false;
    this.playerDebuffs = {};
    this.enemyAbilityTimer = 0;
    this.bossOverloadCharge = 0;
    this.enemyAbilitySuppressTimer = 8000;
    this.flashAlert('적 특수능력 해제!');
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
    this.pendingChallengeText = '';
    if (this.activeChallenge && !this.challengeRewarded) {
      const st = this.challengeStatus();
      if (st && st.ok) {
        this.challengeRewarded = true;
        const rewardDesc = this.grantChallengeReward(this.activeChallenge.reward);
        this.pendingChallengeText = ` · 도전 성공! ${rewardDesc}`;
        this.showToast(`🏆 도전 성공!  ${rewardDesc}`, 'challenge-ok');
      } else {
        this.pendingChallengeText = ' · 도전 실패(보너스 없음)';
        this.showToast('❌ 도전 실패 — 보너스 없음', 'challenge-fail');
      }
    }
    const goldMult = this.run.relics.includes('greed') ? 1.2 : 1;
    this.run.gold += Math.round(this.enemyCard.rewardGold * goldMult);
    const relicId = (this.enemyCard.type === 'elite' || this.enemyCard.type === 'boss') ? grantEliteRelic(this.run) : null;
    if (relicId) {
      const r = RELICS[relicId];
      this.showToast(`⚔️ 엘리트 격파!  ${r.icon ?? ''}${r.name} 유물 획득`, 'elite');
    }
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
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold}G${relicText}${this.pendingChallengeText || ''} · 보상 선택`;
    document.getElementById('enemyChoices').innerHTML = '';
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    rewards.forEach(reward => {
      const btn = document.createElement('button');
      btn.className = `choice reward ${this.tierClass(reward.tier)}`;
      btn.innerHTML = `<strong>${this.kindLabel(reward.kind)}${this.kindIcon(reward)}${reward.title}</strong><span>${this.rewardName(reward)}</span><small>${this.itemDesc(reward)}</small>`;
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
    if (reward.kind === 'skill') return `${SKILLS[reward.id].name} (MP ${SKILLS[reward.id].cost})`;
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
      starterPicked: this.run.starterPicked,
      seenSets: [...this.run.seenSets],
      gambleNext: this.run.gambleNext,
      gambleClosed: !!this.run.gambleClosed
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
    run.seenSets = new Set(state.seenSets || []);
    run.gambleNext = state.gambleNext || null;
    run.gambleClosed = !!state.gambleClosed;
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
        enemyAbilitySuppressTimer: this.enemyAbilitySuppressTimer,
        gaugeStallTimer: this.gaugeStallTimer || 0,
        playerGaugeRushTimer: this.playerGaugeRushTimer || 0,
        enemySlowTimer: this.enemySlowTimer,
        enemyStunTimer: this.enemyStunTimer,
        playerSlowTimer: this.playerSlowTimer,
        battleClearedLines: this.battleClearedLines,
        battlePlayerClearedLines: this.battlePlayerClearedLines,
        battleUsedHold: this.battleUsedHold,
        battleUsedSkill: this.battleUsedSkill,
        battleUsedHardDrop: this.battleUsedHardDrop,
        battleUsedCcw: this.battleUsedCcw,
        battleUsedCw: this.battleUsedCw,
        activeChallenge: this.activeChallenge,
        challengeRewarded: this.challengeRewarded,
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
        bossRhythmSent: this.bossRhythmSent || 0,
        bossRhythmRestTimer: this.bossRhythmRestTimer || 0,
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
        this.player.delaysGarbageOnClear = true;
        this.enemy.delaysGarbageOnClear = false;
        this.enemyCard = state.battle.enemyCard;
        this.ai = new AI(this.enemyCard?.aiProfile || 'balanced', this.enemyCard?.aiSkill);
        this.fallTimer = state.battle.fallTimer || 0;
        this.lockTimer = state.battle.lockTimer || 0;
        this.lockResets = state.battle.lockResets || 0;
        this.groundTouched = !!state.battle.groundTouched;
        this.enemyTimer = state.battle.enemyTimer || 0;
        this.enemyActionStall = state.battle.enemyActionStall || 0;
        this.enemyAbilityTimer = state.battle.enemyAbilityTimer || 0;
        this.enemyAbilitySuppressTimer = state.battle.enemyAbilitySuppressTimer || 0;
        this.gaugeStallTimer = state.battle.gaugeStallTimer || 0;
        this.playerGaugeRushTimer = state.battle.playerGaugeRushTimer || 0;
        this.enemySlowTimer = state.battle.enemySlowTimer || 0;
        this.enemyStunTimer = state.battle.enemyStunTimer || 0;
        this.playerSlowTimer = state.battle.playerSlowTimer || 0;
        this.battleClearedLines = state.battle.battleClearedLines || 0;
        this.battlePlayerClearedLines = state.battle.battlePlayerClearedLines || 0;
        this.battleUsedHold = !!state.battle.battleUsedHold;
        this.battleUsedSkill = !!state.battle.battleUsedSkill;
        this.battleUsedHardDrop = !!state.battle.battleUsedHardDrop;
        this.battleUsedCcw = !!state.battle.battleUsedCcw;
        this.battleUsedCw = !!state.battle.battleUsedCw;
        this.activeChallenge = state.battle.activeChallenge || null;
        this.challengeRewarded = !!state.battle.challengeRewarded;
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
        this.bossRhythmSent = state.battle.bossRhythmSent || 0;
        this.bossRhythmRestTimer = state.battle.bossRhythmRestTimer || 0;
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
        playerFog: this.playerFogTimer,
        alert: this.alertTimer > 0 ? this.alertText : null
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
        playerFog: this.playerFogTimer,
        alert: this.alertTimer > 0 ? this.alertText : null
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
    this.enemyStunTimer = Math.max(0, this.enemyStunTimer - dt);
    this.bossRhythmRestTimer = Math.max(0, (this.bossRhythmRestTimer || 0) - dt);
    this.playerSlowTimer = Math.max(0, this.playerSlowTimer - dt);
    this.gaugeStallTimer = Math.max(0, (this.gaugeStallTimer || 0) - dt);
    this.playerGaugeRushTimer = Math.max(0, (this.playerGaugeRushTimer || 0) - dt);
    this.applyGaugeBonuses();
    this.playerFreezeTimer = Math.max(0, (this.playerFreezeTimer || 0) - dt);
    this.playerFogTimer = Math.max(0, (this.playerFogTimer || 0) - dt);
    this.playerHyperTimer = Math.max(0, (this.playerHyperTimer || 0) - dt);
    this.playerInvertTimer = Math.max(0, (this.playerInvertTimer || 0) - dt);
    this.enemyForceDropTimer = Math.max(0, (this.enemyForceDropTimer || 0) - dt);
    this.alertTimer = Math.max(0, (this.alertTimer || 0) - dt);
    this.tickDebuffs(dt);
    Object.keys(this.skillCooldowns).forEach(id => {
      this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt);
    });
    this.updatePlayerGravity(this.playerSlowTimer > 0 ? dt * GAME_TIMING.PLAYER_SLOW_FACTOR : dt);
    this.ai.setPressure(this.currentAiPressure());
    if (this.enemyStunTimer <= 0) this.enemyTimer += dt;
    const enemyDelay = this.currentEnemyDelay();
    if (this.enemyStunTimer <= 0 && this.enemyTimer >= enemyDelay) {
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
        playerFog: this.playerFogTimer,
        alert: this.alertTimer > 0 ? this.alertText : null
    });
    this.message = '';
  }

  applyGaugeBonuses() {
    const relics = this.run.relics;
    let arm = 0;
    let clr = 0;
    if (relics.includes('ward_delay')) arm += 1000;
    if (relics.includes('set_bulwark')) { arm += 2000; clr += 2000; }
    if (this.gaugeStallTimer > 0) { arm += 2000; clr += 2000; }
    if (this.playerGaugeRushTimer > 0) { arm -= 1500; clr -= 700; }
    if (this.playerMercyDanger() > 0) arm += 500;
    this.player.armDelayBonus = arm;
    this.player.clearDelayBonus = clr;
  }

  currentEnemyDelay() {
    // Mirror enemies follow player piece pace, but AI needs several actions to place one piece.
    if (this.enemyCard.mirror) {
      if (this.battlePlayerPieces >= 3 && this.battleElapsedSec > 0) {
        const pieceMs = (this.battleElapsedSec * 1000) / this.battlePlayerPieces;
        return Math.round(Math.max(90, Math.min(320, pieceMs * 0.2)));
      }
      return Math.min(this.enemyCard.speed, 260);
    }
    const base = this.enemySlowTimer > 0 ? this.enemyCard.speed * GAME_TIMING.ENEMY_SLOW_FACTOR : this.enemyCard.speed;
    const rhythmFactor = (this.enemyCard?.ability === 'overload' && this.bossRhythmRestTimer > 0) ? 3.5 : 1;
    return Math.round(base * rhythmFactor * this.playerPressureRelief() * this.enemyActionStallFactor() * this.aiFocusSlowFactor() * this.playerPpsCatchup() * this.playerMercyFactor());
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
    if (this.enemyStunTimer > 0) enemy.push(`STUN ${fmt(this.enemyStunTimer)}`);
    if (this.player?.attackChargeStacks > 0) {
      const s = this.player.attackChargeStacks;
      player.push(`CHARGE x${s} (+${s * 20}%)`);
    }
    if (this.enemy?.attackChargeStacks > 0) {
      const s = this.enemy.attackChargeStacks;
      enemy.push(`CHARGE x${s} (+${s * 20}%)`);
    }
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
      if (this.bossRhythmRestTimer > 0) {
        enemy.push(`BREATHER ${fmt(this.bossRhythmRestTimer)}`);
      } else {
        const chargeTime = Math.max(14000, 20000 - this.battleElapsedSec * 70);
        const pct = Math.min(100, Math.floor((this.bossOverloadCharge / chargeTime) * 100));
        enemy.push(`OVERLOAD ${pct}%`);
      }
    }
    // 'rotate'는 ROT-LOCK 배지로 이미 표시되므로 중복 표기를 막는다.
    for (const [k, ms] of Object.entries(this.playerDebuffs || {})) if (k !== 'rotate') player.push(`${k.toUpperCase()} ${fmt(ms)}`);
    for (const [k, ms] of Object.entries(this.enemyDebuffs || {})) if (k !== 'rotate') enemy.push(`${k.toUpperCase()} ${fmt(ms)}`);
    // 활성 패시브 유물(눈에 잘 안 보이는 효과)을 확인할 수 있게 표시. 디버프 뒤에 붙여 우선순위 양보.
    const relics = this.run?.relics || [];
    if (relics.includes('set_goldhand')) player.push(`금화+${Math.round(Math.min(1, this.run.gold / 200) * 100)}%`);
    if (relics.includes('set_overload')) player.push('과부하');
    if (relics.includes('set_abszero') && this.enemySlowTimer > 0) player.push('절대영도');
    if (relics.includes('set_sanctuary')) player.push('성소');
    const ch = this.challengeStatus();
    if (ch) player.unshift(`도전 ${ch.text}`);
    return { player, enemy };
  }

  challengeStatus() {
    const c = this.activeChallenge;
    if (!c) return null;
    if (c.id === 'noHold') return { ok: !this.battleUsedHold, text: `${c.label}(${this.battleUsedHold ? '실패' : '유지'})` };
    if (c.id === 'noSkill') return { ok: !this.battleUsedSkill, text: `${c.label}(${this.battleUsedSkill ? '실패' : '유지'})` };
    if (c.id === 'noHardDrop') return { ok: !this.battleUsedHardDrop, text: `${c.label}(${this.battleUsedHardDrop ? '실패' : '유지'})` };
    if (c.id === 'cwOnly') return { ok: !this.battleUsedCcw, text: `${c.label}(${this.battleUsedCcw ? '실패' : '유지'})` };
    if (c.id === 'ccwOnly') return { ok: !this.battleUsedCw, text: `${c.label}(${this.battleUsedCw ? '실패' : '유지'})` };
    if (c.id === 'timeAttack') return { ok: this.battleElapsedSec <= c.params.limit, text: `${c.label} ${Math.floor(this.battleElapsedSec)}/${c.params.limit}s` };
    if (c.id === 'clearLines') return { ok: this.battlePlayerClearedLines >= c.params.target, text: `${c.label} ${this.battlePlayerClearedLines}/${c.params.target}줄` };
    return null;
  }

  grantChallengeReward(reward) {
    if (!reward) return '';
    if (reward.kind === 'gold') this.run.gold += reward.amount;
    else if (reward.kind === 'relic') { if (!this.run.relics.includes(reward.id)) this.run.relics.push(reward.id); else this.run.gold += 40; }
    else if (reward.kind === 'consumable') { if (this.run.consumables.length < 3) this.run.consumables.push(reward.id); else this.run.gold += 20; }
    else if (reward.kind === 'skill') {
      if (!this.run.ownedSkills.includes(reward.id)) {
        this.run.ownedSkills.push(reward.id);
        if (this.run.equippedSkills.length < 3) this.run.equippedSkills.push(reward.id);
      } else this.run.gold += 30;
    }
    return reward.label;
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
    return 1 + Math.min(0.6, danger * 0.24);
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
    if (this.enemyAbilitySuppressTimer > 0) {
      this.enemyAbilitySuppressTimer = Math.max(0, this.enemyAbilitySuppressTimer - dt);
      return;
    }
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
    const chargeTime = Math.max(14000, 20000 - this.battleElapsedSec * 70);
    if (this.bossOverloadCharge < chargeTime) return;
    if ((this.enemy?.mp || 0) < 50) return;
    this.bossOverloadCharge = 0;
    this.enemy.mp = Math.max(0, this.enemy.mp - 50);
    this.castBossDebuff();
  }

  castBossDebuff() {
    const name = this.enemyCard.name;
    const kinds = ['fog', 'invert', 'rotate', 'hyper', 'slow', 'garbage'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'fog') {
      this.playerFogTimer = 4000;
      this.flashAlert(`${name} OVERLOAD: 안개 (4초)`);
    } else if (kind === 'invert') {
      this.playerInvertTimer = 3500;
      this.flashAlert(`${name} OVERLOAD: 좌우 반전 (3.5초)`);
    } else if (kind === 'rotate') {
      this.player.rotateLocked = true;
      this.applyPlayerDebuff('rotate', 3000);
      const target = this.player;
      this.scheduleBattleTimeout(() => { if (this.player === target) target.rotateLocked = false; }, 3000);
      this.flashAlert(`${name} OVERLOAD: 회전 봉인 (3초)`);
    } else if (kind === 'hyper') {
      this.playerHyperTimer = 5000;
      this.flashAlert(`${name} OVERLOAD: 하이퍼 낙하 (5초)`);
    } else if (kind === 'slow') {
      this.playerSlowTimer = 3500;
      this.flashAlert(`${name} OVERLOAD: 중력 둔화 (3.5초)`);
    } else {
      this.player.addDurableGarbage(2, 2);
      this.flashAlert(`${name} OVERLOAD: 지속 가비지 2줄`);
    }
  }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260521-ko50').catch(() => {});
  });
}
