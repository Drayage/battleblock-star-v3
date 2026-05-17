import { Board } from './board.js';
import { CARD_LIBRARY } from './constants.js';
import { AI } from './ai.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { SKILLS } from './skills.js';
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
    this.enemySlowTimer = 0;
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
    this.screen = id;
  }

  refreshMenu() {
    document.getElementById('menuRound').textContent = `${this.run.round} / 20`;
    document.getElementById('menuGold').textContent = this.run.gold;
    document.getElementById('menuHp').textContent = this.run.hpRows;
    document.getElementById('menuDeck').textContent = `${this.run.deckCount()} cards`;
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
    const wrap = document.getElementById('enemyChoices');
    wrap.innerHTML = '';
    for (const enemy of makeEnemyChoices(this.run.round)) {
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type}`;
      btn.innerHTML = `<strong>${enemy.name}</strong><span>${enemy.type.toUpperCase()} · reward ${enemy.rewardGold}G</span><small>Rows ${enemy.startingRows} · Garbage ${enemy.startingGarbage} · AI ${enemy.aiProfile}</small>`;
      btn.addEventListener('click', () => this.startBattle(enemy));
      wrap.appendChild(btn);
    }
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
      btn.disabled = this.run.gold < item.price;
      btn.addEventListener('click', () => {
        if (this.run.gold < item.price) return;
        this.run.gold -= item.price;
        applyReward(this.run, item);
        this.normalizePersistentGrid();
        this.showShop();
      });
      wrap.appendChild(btn);
    }
  }

  itemDesc(item) {
    if (item.kind === 'card') return CARD_LIBRARY[item.id].name;
    if (item.kind === 'skill') return SKILLS[item.id].desc;
    return `${item.amount}행만큼 버틸 공간이 늘어납니다.`;
  }

  startBattle(enemyCard) {
    this.enemyCard = enemyCard;
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    this.enemy = new Board({ rows: enemyCard.startingRows });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    this.ai = new AI(enemyCard.aiProfile);
    this.fallTimer = 0;
    this.enemyTimer = 0;
    this.message = 'Battle start';
    document.getElementById('battleTitle').textContent = `Round ${this.run.round}`;
    document.getElementById('battleMeta').textContent = enemyCard.name;
    this.renderTouchSkills();
    this.renderer.resize(this.player.rows, this.enemy.rows);
    this.show('gameScreen');
  }

  renderTouchSkills() {
    const wrap = document.getElementById('touchSkills');
    wrap.innerHTML = '';
    this.run.equippedSkills.forEach((id, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${SKILLS[id].name}`;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.useSkill(i);
      });
      wrap.appendChild(btn);
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
  }

  useSkill(index) {
    const id = this.run.equippedSkills[index];
    const skill = SKILLS[id];
    if (!skill || this.player.mp < skill.cost) return;
    this.player.mp -= skill.cost;
    skill.activate({ game: this, player: this.player, enemy: this.enemy, resolve: (result, attacker) => this.resolve(result, attacker) });
    this.message = `${skill.name} activated`;
  }

  resolve(result, attacker) {
    if (!result) return;
    const defender = attacker === this.player ? this.enemy : this.player;
    if (result.attack > 0) defender.receiveGarbage(result.attack);
    if (this.player.defeated) return this.endRun(false);
    if (this.enemy.defeated) return this.winBattle();
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
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold} Gold · 보상을 하나 선택하세요`;
    document.getElementById('enemyChoices').innerHTML = '';
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    wrap.innerHTML = '';
    rewards.forEach(reward => {
      const btn = document.createElement('button');
      btn.className = 'choice reward';
      btn.innerHTML = `<strong>${reward.title}</strong><span>${this.rewardName(reward)}</span><small>${this.itemDesc(reward)}</small>`;
      btn.addEventListener('click', () => {
        applyReward(this.run, reward);
        this.normalizePersistentGrid();
        this.run.round++;
        this.showMap();
      });
      wrap.appendChild(btn);
    });
  }

  rewardName(reward) {
    if (reward.kind === 'card') return CARD_LIBRARY[reward.id].name;
    if (reward.kind === 'skill') return SKILLS[reward.id].name;
    return `+${reward.amount} rows`;
  }

  normalizePersistentGrid() {
    if (!this.run.persistentGrid) return;
    while (this.run.persistentGrid.length < this.run.hpRows) {
      this.run.persistentGrid.unshift(Array.from({ length: 10 }, () => null));
    }
  }

  endRun(win) {
    this.show('endScreen');
    document.getElementById('endTitle').textContent = win ? 'RUN COMPLETE!' : 'RUN FAILED';
    document.getElementById('endSummary').textContent = `Round ${Math.min(this.run.round, 20)} · Gold ${this.run.gold} · HP Rows ${this.run.hpRows}`;
  }

  loop(now) {
    const dt = Math.min(50, now - (this.last || now));
    this.last = now;
    if (this.inBattle()) this.updateBattle(dt, now);
    requestAnimationFrame(t => this.loop(t));
  }

  updateBattle(dt, now) {
    this.input.update(now);
    this.player.flash = Math.max(0, this.player.flash - dt);
    this.enemy.flash = Math.max(0, this.enemy.flash - dt);
    this.enemySlowTimer = Math.max(0, this.enemySlowTimer - dt);
    this.fallTimer += dt;
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
    if (this.enemy.defeated) this.winBattle();
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
}

new Game();
