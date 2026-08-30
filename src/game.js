import { Board } from './board.js?v=20260830-vs6';
import { ABILITY_GLYPH, ABILITY_LIBRARY, BASE_TYPES, CARD_DESCRIPTIONS, CARD_LIBRARY, COLORS, GAME_TIMING, SET_DEFINITIONS, SET_LABELS, TYPES } from './constants.js?v=20260830-vs6';
import { Deck } from './deck.js?v=20260830-vs6';
import { AI } from './ai.js?v=20260830-vs6';
import { Renderer } from './renderer.js?v=20260830-vs6';
import { InputController } from './input.js?v=20260830-vs6';
import { AudioManager } from './audio.js?v=20260830-vs6';
import {
  t,
  getLang,
  setLang,
  onLangChange,
  applyDomTranslations,
  LANGS,
  ui,
  dataName,
  dataDesc,
  trCardName,
  trCardDesc,
  trEnemyName,
  trEnemyStyle,
  trAbilityName,
  trAbilityDesc,
  trChallengeLabel,
  trChallengeCond,
  trRewardLabel,
  trRewardDetail
} from './i18n.js?v=20260830-vs6';
import { tEnemyName, tKindLabel } from './i18n-data.js?v=20260830-vs6';
import { SKILLS } from './skills.js?v=20260830-vs6';
import { CONSUMABLES } from './consumables.js?v=20260830-vs6';
import {
  RunState,
  RELICS,
  BLOCK_UPGRADES,
  applyReward,
  grantEliteRelic,
  isRunComplete,
  isShopRound,
  makeEnemy,
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
  abilityOf,
  ACHIEVEMENTS,
  ASCENSION_MODS
} from './progression.js?v=20260830-vs6';

window.BBS_SKILLS = SKILLS;
window.BBS_CONSUMABLES = CONSUMABLES;
window.BBS_RELICS = RELICS;

const RECORD_KEY = 'battleBlockStar.records.v1';
const SAVE_KEY = 'battleBlockStar.save.v1';
const CODEX_KEY = 'battleBlockStar.codexSeen.v1';
const ACHIEVEMENT_KEY = 'bbs.achievements.v1';
const ASCENSION_KEY = 'bbs.ascension.v1';     // 선택된 레벨
const ASCENSION_MAX_KEY = 'bbs.ascension.max.v1'; // 최대 해금 레벨
const LIFETIME_KEY = 'bbs.lifetime.v1';
const META_KEY = 'bbs.meta.v1';

const META_UPGRADES = [
  { id: 'startGold',       icon: '💰',  name: '초기 자금',    desc: '런 시작 골드 +15',                    maxLevel: 4, costs: [1, 1, 1, 2] },
  { id: 'rerollDiscount',  icon: '🔄',  name: '리롤 할인',    desc: '상점 리롤 비용 -5G',                  maxLevel: 3, costs: [1, 1, 1] },
  { id: 'startCons',       icon: '💊',  name: '비상 소모품',  desc: '런 시작 소모품 +1',                   maxLevel: 2, costs: [1, 2] },
  { id: 'startHp',         icon: '❤️',  name: '체력 강화',    desc: '런 시작 HP(필드 높이) +1',            maxLevel: 3, costs: [1, 2, 2] },
  { id: 'shopDeals',       icon: '🏪',  name: '상점 특가',    desc: '상점 할인 아이템 +1칸',               maxLevel: 2, costs: [2, 3] },
  { id: 'startRewardTier', icon: '🎁',  name: '보상 강화',    desc: '1라운드 보상 티어 +1 (최대 2단계)',    maxLevel: 2, costs: [1, 3] },
  { id: 'startCardAdd',    icon: '🃏',  name: '덱 확장',      desc: '시작 덱에 랜덤 특수 카드 +1',         maxLevel: 3, costs: [2, 3, 4] },
  { id: 'startCardRem',    icon: '✂️',  name: '덱 정리',      desc: '런 시작 전 카드 무료 제거 +1',        maxLevel: 2, costs: [3, 4] },
  { id: 'startRelic',      icon: '📦',  name: '유물 상자',    desc: '런 시작시 랜덤 유물 1개',             maxLevel: 1, costs: [5] },
  { id: 'rewardReroll',    icon: '🎲',  name: '보상 재굴리기', desc: '런 당 보상 재굴리기 +1회',           maxLevel: 4, costs: [1, 2, 3, 4] },
  { id: 'battleRecovery',  icon: '💉',  name: '전투 회복',    desc: '적 처치 후 가비지 1줄 회복',         maxLevel: 3, costs: [2, 3, 4] },
];
// 합계 포인트: 5+3+3+5+5+4+9+7+5+10+9 = 65 (업적 전부 달성 시 전부 최대)

// Standard Tetris Guideline gravity: (0.8-(level-1)*0.007)^(level-1) seconds, min 17ms
const SOLO_FALL_SPEEDS = [1000, 793, 617, 473, 356, 262, 190, 135, 94, 64, 43, 29, 18, 17, 17];
const SOLO_RECORD_KEY = 'bbs.solo.records.v1';
const SOLO_MODES = {
  sprint40:    { name: '40줄 스프린트', goalLines: 40,  timeLimit: 0,      speedRamp: true,  unit: 'time'  },
  timeatk2:   { name: '타임어택 2분',  goalLines: 0,   timeLimit: 120000, speedRamp: true,  unit: 'lines' },
  timeatk3:   { name: '타임어택 3분',  goalLines: 0,   timeLimit: 180000, speedRamp: true,  unit: 'lines' },
  marathon150: { name: '마라톤 150줄', goalLines: 150, timeLimit: 0,      speedRamp: true,  unit: 'time'  },
  marathon300: { name: '마라톤 300줄', goalLines: 300, timeLimit: 0,      speedRamp: true,  unit: 'time'  },
  endless:    { name: '엔드리스',     goalLines: 0,   timeLimit: 0,      speedRamp: false, unit: 'lines' },
};

// 적 능력은 마나 게이지에 묶인다. 비용/쿨다운은 플레이어 스킬보다 크게 잡고,
// 스킬/소모품 → SFX 카테고리 매핑. 신규 스킬 추가 시 여기에 등록한다.
const SKILL_SFX = {
  // 공격형
  double_shot: 'strike', bomb_piece: 'explosion', overcharge: 'strike',
  hyper_force: 'strike', garbage_barrage: 'penalty', mana_barrage: 'explosion',
  mana_burn: 'strike', magnetic_collapse: 'crush', scramble_strike: 'dispel',
  resonance: 'comboCharge',
  // 방어/회복형
  panic_guard: 'shield', emergency_shard: 'shield', ward_pulse: 'shield',
  gauge_stall: 'shield',
  // 정화/유틸
  minor_purge: 'purge', purge: 'purge', line_shave: 'purge',
  // 컨트롤(적 디버프)
  rotate_seal: 'dispel', hold_lock: 'dispel', time_warp: 'freeze',
  // 자기 강화
  quick_cycle: 'mana', all_i_mode: 'mana'
};
const CONSUMABLE_SFX = {
  battery: 'mana', shield: 'shield', bomb: 'explosion', focus: 'mana',
  cleanse: 'purge', reroll_token: 'comboCharge', gold_pouch: 'coin',
  hp_patch: 'mana', time_stop: 'freeze', igniter: 'strike',
  hole_grenade: 'explosion', blackout_packet: 'dispel'
};

// 플레이어에게 직접 효과가 가는 능력일수록 비용을 더 높인다.
const ENEMY_ABILITIES = {
  spike: {
    label: '쓰레기 급증',
    desc: '쓰레기 행 +1을 즉시 전송합니다.',
    cost: 55,
    cooldown: 18000,
    cast(g) {
      g.player.receiveGarbage(1);
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('spike', '쓰레기 급증')} +1`);
    }
  },
  slowPlayer: {
    label: '중력 둔화',
    desc: '3초 동안 낙하 속도 감소·하드드랍 불가.',
    cost: 75,
    cooldown: 22000,
    cast(g) {
      g.playerSlowTimer = 3000;
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('slowPlayer', '중력 둔화')} (3s)`);
    }
  },
  power: {
    label: '파워 폭발',
    desc: '쓰레기 행 +2를 즉시 전송합니다.',
    cost: 80,
    cooldown: 24000,
    cast(g) {
      g.player.receiveGarbage(2);
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('power', '파워 폭발')} +2`);
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
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('rotateLockPlayer', '회전 봉인')} (2s)`);
    }
  },
  hyperBurst: {
    label: '하이퍼 낙하',
    desc: '5초 동안 블록이 극도로 빠르게 낙하합니다.',
    cost: 65,
    cooldown: 24000,
    cast(g) {
      g.playerHyperTimer = 5000;
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('hyperBurst', '하이퍼 낙하')} (5s)`);
    }
  },
  polluteDeck: {
    label: '덱 오염',
    desc: '내 덱에 방해 블록(납 덩어리)을 1장 주입합니다.',
    cost: 60,
    cooldown: 26000,
    cast(g) {
      g.player.deck.pollute(TYPES.HEAVY_JUNK, 1);
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('polluteDeck', '덱 오염')}`);
    }
  },
  rushGauge: {
    label: '게이지 가속',
    desc: '5초 동안 적 공격이 게이지에서 더 빠르게 도달합니다.',
    cost: 60,
    cooldown: 20000,
    cast(g) {
      g.playerGaugeRushTimer = 5000;
      g.flashAlert(`${trEnemyName(g.enemyCard, g.enemyCard.name)} ${ui('ability')}: ${trAbilityName('rushGauge', '게이지 가속')} (5s)`);
    }
  }
};

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputController(this);
    this.audio = new AudioManager();
    this.run = new RunState();
    this.lastRunResult = null;
    this.codexSeen = this.loadCodexSeen();
    this.codexTab = 'cards';
    this.solo = null;
    this.soloPaused = false;
    this.vs = null;
    this._vsGameEndHandled = false;
    this.practiceMode = localStorage.getItem('bbs_practice') === '1';
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
    applyDomTranslations();
    this.refreshLangButtons();
    onLangChange(() => {
      applyDomTranslations();
      this.refreshLangButtons();
      // 동적 토글/메뉴 라벨도 갱신
      this.audio._emit?.();
      this.refreshMenu();
      this.refreshCurrentScreenText();
    });
    this.refreshMenu();
    requestAnimationFrame(t => this.loop(t));
  }

  refreshCurrentScreenText() {
    if (this.screen === 'mapScreen') this.showMap();
    else if (this.screen === 'shopScreen') this.showShop();
    else if (this.screen === 'gameScreen') {
      document.getElementById('battleTitle').textContent = ui('round', this.run.round) + (this.run.practiceMode ? ' [Practice]' : '');
      document.getElementById('battleMeta').textContent = trEnemyName(this.enemyCard, this.enemyCard?.name);
      this.renderTouchSlots();
    } else if (this.screen === 'menu') this.refreshMenu();
  }

  bindUi() {
    document.getElementById('practiceToggleBtn').addEventListener('click', () => this.togglePracticeMode());
    this.refreshPracticeToggle();
    // 첫 사용자 입력 시 AudioContext 활성화 (브라우저 자동재생 정책).
    const audioInit = () => { this.audio.ensureInit(); this.updateSceneBgm(); };
    window.addEventListener('pointerdown', audioInit, { once: true });
    window.addEventListener('keydown', audioInit, { once: true });
    // 페이지 진입 시 BGM이 막혀있다면 짧은 안내.
    setTimeout(() => {
      if (this.audio.isUninitialized() && this.audio.bgmEnabled) {
        this.showToast?.(t('screen.audioHint'), 'elite');
      }
    }, 800);
    // 음악·SFX 토글 버튼 (메뉴/일시정지 오버레이 공통)
    const wireToggle = (id, get, set) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const refresh = () => {
        const lbl = btn.dataset.i18nLabel ? t(btn.dataset.i18nLabel) : btn.dataset.label;
        btn.textContent = `${lbl}: ${get() ? t('common.on') : t('common.off')}`;
        btn.classList.toggle('off', !get());
      };
      btn.addEventListener('click', () => { this.audio.ensureInit(); set(!get()); refresh(); });
      this.audio.onChange(refresh);
      refresh();
    };
    wireToggle('bgmToggleBtn', () => this.audio.bgmEnabled, v => this.audio.setBgmEnabled(v));
    wireToggle('sfxToggleBtn', () => this.audio.sfxEnabled, v => this.audio.setSfxEnabled(v));
    wireToggle('bgmToggleBtnPause', () => this.audio.bgmEnabled, v => this.audio.setBgmEnabled(v));
    wireToggle('sfxToggleBtnPause', () => this.audio.sfxEnabled, v => this.audio.setSfxEnabled(v));
    const wireSlider = (sliderId, labelId, get, set) => {
      const slider = document.getElementById(sliderId);
      const label = document.getElementById(labelId);
      if (!slider || !label) return;
      const refresh = () => { const v = get(); slider.value = Math.round(v * 100); label.textContent = `${Math.round(v * 100)}%`; };
      slider.addEventListener('input', () => { this.audio.ensureInit(); set(parseFloat(slider.value) / 100); });
      this.audio.onChange(refresh);
      refresh();
    };
    wireSlider('bgmVolSlider', 'bgmVolLabel', () => this.audio.bgmVolume, v => this.audio.setBgmVolume(v));
    wireSlider('sfxVolSlider', 'sfxVolLabel', () => this.audio.sfxVolume, v => this.audio.setSfxVolume(v));
    wireSlider('bgmVolSliderPause', 'bgmVolLabelPause', () => this.audio.bgmVolume, v => this.audio.setBgmVolume(v));
    wireSlider('sfxVolSliderPause', 'sfxVolLabelPause', () => this.audio.sfxVolume, v => this.audio.setSfxVolume(v));
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => { setLang(btn.dataset.lang); });
    });
    document.getElementById('codexBtn')?.addEventListener('click', () => this.openCodex());
    document.getElementById('recordsBtn')?.addEventListener('click', () => this.openMenuPanel('records'));
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openMenuPanel('settings'));
    document.getElementById('noFlashToggleBtn')?.addEventListener('click', () => {
      const cur = localStorage.getItem('bbs.settings.noFlash') === '1';
      localStorage.setItem('bbs.settings.noFlash', cur ? '0' : '1');
      this._refreshNoFlashBtn();
    });
    document.getElementById('devCodeSubmitBtn')?.addEventListener('click', () => {
      const val = document.getElementById('devCodeInput')?.value?.trim().toUpperCase();
      if (val === 'LSDKK') {
        const records = this.loadRecords();
        if (!records.some(r => r.result === 'win')) {
          records.unshift({ date: new Date().toISOString(), result: 'win', floor: 20, gold: 0, deckSize: 21, ascension: 0 });
          localStorage.setItem(RECORD_KEY, JSON.stringify(records.slice(0, 20)));
        }
        if (document.getElementById('devCodeInput')) document.getElementById('devCodeInput').value = '';
        this.refreshMenu();
        this.showToast('🔓 개발자 코드 적용: 클리어 해금', 'elite', 3000);
      } else if (val) {
        this.showToast('❌ 잘못된 코드', 'challenge-fail', 2000);
      }
    });
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
    document.getElementById('achievementsBtn')?.addEventListener('click', () => this.showAchievementsModal());
    document.getElementById('metaBtn')?.addEventListener('click', () => this.showMetaScreen());
    document.getElementById('soloModesBtn')?.addEventListener('click', () => this.showSoloSelect());
    document.getElementById('soloBackBtn')?.addEventListener('click', () => {
      this.solo = null;
      document.getElementById('gameScreen').classList.remove('solo-active');
      if (!this.run) this.run = new RunState();
      this.refreshMenu();
      this.show('menu');
    });
    document.querySelectorAll('.solo-lb-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showSoloLeaderboard(btn.dataset.mode));
    });
    document.querySelectorAll('.solo-start-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const startLevel = mode === 'endless' ? parseInt(document.getElementById('endlessSpeedSelect')?.value || '0', 10) : 0;
        this.startSoloMode(mode, startLevel);
      });
    });
    document.getElementById('soloPauseBtn')?.addEventListener('click', () => this.toggleSoloPause());
    document.getElementById('soloQuitBtn')?.addEventListener('click', () => {
      if (!this.solo) return;
      document.getElementById('gameScreen').classList.remove('solo-active');
      this.solo = null;
      this.player = null;
      this.showSoloSelect();
    });
    document.getElementById('vsModeBtn')?.addEventListener('click', () => this.showVsSelect());
    document.getElementById('vsBackBtn')?.addEventListener('click', () => { this.show('menu'); });
    document.querySelectorAll('.vs-start-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const diffSel = document.querySelector(`.vs-diff-select[data-mode="${mode}"]`);
        const diff = diffSel ? parseInt(diffSel.value, 10) : 1;
        this.startVsMode(mode, diff);
      });
    });
    document.getElementById('forfeitBtn').addEventListener('click', () => this.endRun(false));
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('shopDeckBtn')?.addEventListener('click', () => this.openDeckOverlay());
    document.getElementById('eventDeckBtn')?.addEventListener('click', () => this.openDeckOverlay());
    window.addEventListener('resize', () => {
      if (this.player && this.enemy) this.renderer.resize(this.player.rows, this.enemy.rows);
      else if (this.solo && this.player) this.renderer.resizeSolo(this.player.rows);
    });
  }

  refreshLangButtons() {
    const cur = getLang();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === cur);
    });
  }

  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.documentElement.classList.toggle('in-game', id === 'gameScreen');
    document.body.classList.toggle('in-game', id === 'gameScreen');
    this.screen = id;
    // Clear gamepad focus highlights on every screen transition
    document.querySelectorAll('.gp-focused').forEach(el => el.classList.remove('gp-focused'));
    if (this.input) { this.input.gpMenuIdx = 0; this.input.gpMenuRepeat = {}; this.input.gpPrev = {}; }
    this.updateSceneBgm();
  }

  updateSceneBgm() {
    const id = this.screen;
    if (id === 'menu') return this.audio.setScene('title');
    if (id === 'mapScreen') return this.audio.setScene('select');
    if (id === 'eventScreen') return this.audio.setScene('select');
    if (id === 'shopScreen') return this.audio.setScene('shop');
    if (id === 'endScreen') return this.audio.setScene(this.lastRunResult === 'win' ? 'clear' : 'gameover');
    if (id === 'gameScreen') {
      const e = this.enemyCard;
      if (e?.type === 'boss') return this.audio.setScene('boss');
      if (e?.type === 'elite') return this.audio.setScene('elite');
      return this.audio.setScene('battle');
    }
  }

  refreshMenu() {
    const _c = document.getElementById('codexBtn'); if (_c) _c.textContent = this.menuText('codex');
    const _r = document.getElementById('recordsBtn'); if (_r) _r.textContent = this.menuText('records');
    const _s = document.getElementById('settingsBtn'); if (_s) _s.textContent = this.menuText('settings');
    document.getElementById('startRunBtn').textContent = this.practiceMode ? `${t('menu.startRun')} (Practice)` : t('menu.startRun');
    if (this.run) {
      document.getElementById('menuRound').textContent = `${this.run.round} / 20`;
      document.getElementById('menuGold').textContent = this.run.gold;
      document.getElementById('menuHp').textContent = `${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows}`;
      document.getElementById('menuDeck').textContent = `${this.run.deckCount()} ${t('menu.cards')}`;
      this.discoverRunState();
    }
    document.getElementById('loadRunBtn').disabled = !localStorage.getItem(SAVE_KEY);
    document.getElementById('deleteSaveBtn').disabled = !localStorage.getItem(SAVE_KEY);
    this.renderRecords();
    this.refreshAscensionDisplay();
    const cleared = this.hasEverCleared();
    const soloBtn = document.getElementById('soloModesBtn');
    if (soloBtn) soloBtn.classList.toggle('hidden', !cleared);
    const vsBtn = document.getElementById('vsModeBtn');
    if (vsBtn) vsBtn.classList.toggle('hidden', !cleared);
    this._refreshNoFlashBtn();
  }

  menuText(key) {
    const lang = getLang();
    const map = {
      codex: { ko: '도감', en: 'Codex', ja: '図鑑' },
      records: { ko: '기록', en: 'Records', ja: '記録' },
      settings: { ko: '설정', en: 'Settings', ja: '設定' },
      close: { ko: '닫기', en: 'Close', ja: '閉じる' },
      unknown: { ko: '???', en: '???', ja: '???' }
    };
    return map[key]?.[lang] || map[key]?.ko || key;
  }

  renderRecords() {
    const el = document.getElementById('recordList');
    const records = this.loadRecords();
    const best = records.reduce((top, r) => Math.max(top, r.round), 0);
    if (!records.length) {
      el.innerHTML = `<span class="muted">${getLang() === 'ja' ? '記録なし。' : getLang() === 'en' ? 'No records.' : '기록 없음.'}</span>`;
      return;
    }
    const bestText = getLang() === 'ja' ? `最高記録: ${best}ラウンド` : getLang() === 'en' ? `Best Record: Round ${best}` : `최고 기록 ${best}라운드`;
    const resultText = r => r.result === 'win'
      ? (getLang() === 'ja' ? '勝利' : getLang() === 'en' ? 'Win' : '승리')
      : (getLang() === 'ja' ? '敗北' : getLang() === 'en' ? 'Loss' : '패배');
    const locale = getLang() === 'ja' ? 'ja-JP' : getLang() === 'en' ? 'en-US' : 'ko-KR';
    el.innerHTML = `<strong>${bestText}</strong>` + records.slice(0, 10).map(r => `
      <div class="record-entry">
        <strong><span>${resultText(r)} · ${ui('round', r.round)}</span><span>${r.gold}G</span></strong>
        <small>HP ${r.hpRows ?? '-'} · ${ui('deck')} ${r.deckCount ?? '-'} · ${ui('skills')} ${r.skillCount ?? 0} · ${ui('relics')} ${r.relicCount ?? 0} · ${ui('consumables')} ${r.consumableCount ?? 0}</small>
        <small>${r.at ? new Date(r.at).toLocaleString(locale) : ''}</small>
      </div>
    `).join('');
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  loadCodexSeen() {
    const empty = { cards: [], relics: [], consumables: [], skills: [], enemies: [] };
    try { return { ...empty, ...JSON.parse(localStorage.getItem(CODEX_KEY) || '{}') }; }
    catch { return empty; }
  }

  saveCodexSeen() {
    localStorage.setItem(CODEX_KEY, JSON.stringify(this.codexSeen));
  }

  discover(kind, id) {
    if (!id || !this.codexSeen[kind] || this.codexSeen[kind].includes(id)) return;
    this.codexSeen[kind].push(id);
    this.saveCodexSeen();
  }

  discoverItem(item) {
    if (!item) return;
    if (item.kind === 'card' || item.kind === 'contract' || item.kind === 'grantCard') this.discover('cards', item.id);
    if (item.kind === 'relic' || item.kind === 'relicDig' || item.kind === 'setRelic') this.discover('relics', item.id);
    if (item.kind === 'skill' || item.kind === 'starterSkill') this.discover('skills', item.id);
    if (item.kind === 'consumable') this.discover('consumables', item.id);
    if (item.kind === 'upgradeCard') { this.discover('cards', item.from); this.discover('cards', item.to); }
    if (item.kind === 'hpForCurse') this.discover('cards', item.card);
  }

  discoverRunState() {
    for (const id of this.run.deck.draw || []) this.discover('cards', id);
    for (const id of this.run.deck.discard || []) this.discover('cards', id);
    for (const id of this.run.deck.extraCards || []) this.discover('cards', id);
    for (const id of this.run.relics || []) this.discover('relics', id);
    for (const id of this.run.ownedSkills || []) this.discover('skills', id);
    for (const id of this.run.equippedSkills || []) this.discover('skills', id);
    for (const id of this.run.consumables || []) this.discover('consumables', id);
  }

  enemyCodexKey(enemy) {
    return enemy?.i18nKey || enemy?.name || enemy?.id;
  }

  allCodexEnemies() {
    const map = new Map();
    for (let round = 1; round <= 20; round++) {
      for (const enemy of makeEnemyChoices(round, [])) {
        const key = this.enemyCodexKey(enemy);
        if (!map.has(key) || (enemy.type === 'boss' && map.get(key).type !== 'boss')) map.set(key, enemy);
      }
    }
    const typeRank = enemy => ({ normal: 0, elite: 1, boss: 2 }[enemy?.type] ?? 0);
    return [...map.values()].sort((a, b) =>
      typeRank(a) - typeRank(b)
      || this.tierRank(a.tier) - this.tierRank(b.tier)
      || trEnemyName(a, a.name).localeCompare(trEnemyName(b, b.name), this.currentLocale())
    );
  }

  tierRank(tier) {
    return { bronze: 0, silver: 1, gold: 2, diamond: 3 }[tier] ?? 9;
  }

  currentLocale() {
    return getLang() === 'ja' ? 'ja-JP' : getLang() === 'en' ? 'en-US' : 'ko-KR';
  }

  sortByTierName(items, nameOf) {
    return [...items].sort((a, b) =>
      this.tierRank(a.tier) - this.tierRank(b.tier)
      || String(nameOf(a)).localeCompare(String(nameOf(b)), this.currentLocale())
    );
  }

  sortedCodexCards() {
    const abilityOrder = [
      'none',
      'highPower', 'bomb', 'manaBonus', 'purgeGarbage', 'coolant', 'bounty', 'wardBlock', 'comboCharge',
      'dispel', 'instantAttack', 'instantGuard', 'instantMana', 'instantPurge', 'oddPower'
    ];
    const shapeOrder = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'CROSS5', 'HEAVY5', 'WIDE6', 'HOOK5', 'PENTA_T', 'OVERDRIVE6'];
    const abilityRank = id => {
      const rank = abilityOrder.indexOf(id);
      return rank >= 0 ? rank : abilityOrder.length;
    };
    const shapeRank = id => {
      const rank = shapeOrder.indexOf(id);
      return rank >= 0 ? rank : shapeOrder.length;
    };
    return Object.values(CARD_LIBRARY).sort((a, b) =>
      abilityRank(a.abilityId) - abilityRank(b.abilityId)
      || shapeRank(a.shapeId) - shapeRank(b.shapeId)
      || this.tierRank(a.tier) - this.tierRank(b.tier)
      || trCardName(a, a.name).localeCompare(trCardName(b, b.name), this.currentLocale())
    );
  }

  ensureMenuModal() {
    let modal = document.getElementById('menuModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'menuModal';
      modal.className = 'menu-modal';
      modal.innerHTML = '<div class="menu-modal-inner"><div class="menu-modal-head"><h2></h2><button class="ghost" data-close="1"></button></div><div class="menu-modal-body"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => {
        if (e.target === modal || e.target.dataset.close) {
          modal.classList.remove('active');
          this.returnMenuPanels();
        }
      });
    }
    modal.querySelector('[data-close]').textContent = this.menuText('close');
    return modal;
  }

  returnMenuPanels() {
    const menu = document.getElementById('menu');
    const anchor = document.getElementById('startRunBtn');
    ['.menu-records-panel', '.menu-settings-panel'].forEach(selector => {
      const panel = document.querySelector(selector);
      if (!panel) return;
      panel.classList.remove('in-modal');
      if (panel.parentElement?.classList.contains('menu-modal-body')) menu.insertBefore(panel, anchor);
    });
  }

  openMenuPanel(kind) {
    const modal = this.ensureMenuModal();
    const body = modal.querySelector('.menu-modal-body');
    this.returnMenuPanels();
    body.innerHTML = '';
    if (kind === 'records') {
      modal.querySelector('h2').textContent = this.menuText('records');
      this.renderRecords();
      const panel = document.querySelector('.menu-records-panel');
      panel.classList.add('in-modal');
      body.appendChild(panel);
    } else {
      modal.querySelector('h2').textContent = this.menuText('settings');
      const panel = document.querySelector('.menu-settings-panel');
      panel.classList.add('in-modal');
      body.appendChild(panel);
    }
    modal.classList.add('active');
    this.input?.resetMenuFocus();
  }

  openCodex() {
    const modal = this.ensureMenuModal();
    modal.querySelector('h2').textContent = this.menuText('codex');
    const body = modal.querySelector('.menu-modal-body');
    this.returnMenuPanels();
    body.innerHTML = '<div class="codex-tabs"></div><div class="codex-grid"></div>';
    this.renderCodex(body);
    modal.classList.add('active');
    this.input?.resetMenuFocus();
  }

  renderCodex(body) {
    const tabs = [
      ['cards', getLang() === 'ja' ? 'ブロック' : getLang() === 'en' ? 'Blocks' : '블록'],
      ['relics', ui('relics')],
      ['consumables', ui('consumables')],
      ['skills', ui('skills')],
      ['enemies', getLang() === 'ja' ? 'モンスター' : getLang() === 'en' ? 'Monsters' : '몬스터']
    ];
    const tabWrap = body.querySelector('.codex-tabs');
    const grid = body.querySelector('.codex-grid');
    tabWrap.innerHTML = '';
    for (const [key, label] of tabs) {
      const btn = document.createElement('button');
      btn.className = `ghost${this.codexTab === key ? ' active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', () => { this.codexTab = key; this.renderCodex(body); });
      tabWrap.appendChild(btn);
    }
    grid.innerHTML = '';
    const seen = new Set(this.codexSeen[this.codexTab] || []);
    const locked = () => `<div class="codex-card locked">${this.menuText('unknown')}</div>`;
    if (this.codexTab === 'cards') this.sortedCodexCards().forEach(card => {
      if (!seen.has(card.id)) return grid.insertAdjacentHTML('beforeend', locked());
      const node = document.createElement('div');
      node.className = `codex-card ${this.tierClass(card.tier)}`;
      node.innerHTML = `<strong>${this.escapeHtml(trCardName(card, card.name))}</strong><span class="codex-meta">${card.cellCount} cells · ${card.shapeId}</span><small>${this.escapeHtml(trCardDesc(card, CARD_DESCRIPTIONS[card.id] || ''))}</small>`;
      node.appendChild(this.blockPreview(card, 7));
      grid.appendChild(node);
    });
    if (this.codexTab === 'relics') this.sortByTierName(Object.values(RELICS), relic => dataName('relic', relic, relic.name)).forEach(relic => grid.insertAdjacentHTML('beforeend', seen.has(relic.id) ? `<div class="codex-card ${this.tierClass(relic.tier)}"><strong>${relic.icon || 'R'} ${this.escapeHtml(dataName('relic', relic, relic.name))}</strong><span class="codex-meta">${relic.tier}</span><small>${this.escapeHtml(dataDesc('relic', relic, relic.desc))}</small></div>` : locked()));
    if (this.codexTab === 'consumables') this.sortByTierName(Object.values(CONSUMABLES), item => dataName('consumable', item, item.name)).forEach(item => grid.insertAdjacentHTML('beforeend', seen.has(item.id) ? `<div class="codex-card ${this.tierClass(item.tier)}"><strong>${item.icon || item.short} ${this.escapeHtml(dataName('consumable', item, item.name))}</strong><span class="codex-meta">${item.tier}</span><small>${this.escapeHtml(dataDesc('consumable', item, item.desc))}</small></div>` : locked()));
    if (this.codexTab === 'skills') this.sortByTierName(Object.values(SKILLS), skill => dataName('skill', skill, skill.name)).forEach(skill => grid.insertAdjacentHTML('beforeend', seen.has(skill.id) ? `<div class="codex-card ${this.tierClass(skill.tier)}"><strong>${skill.icon || 'S'} ${this.escapeHtml(dataName('skill', skill, skill.name))}</strong><span class="codex-meta">${skill.cost} MP · ${skill.tier}</span><small>${this.escapeHtml(dataDesc('skill', skill, skill.desc))}</small></div>` : locked()));
    if (this.codexTab === 'enemies') this.allCodexEnemies().forEach(enemy => {
      const key = this.enemyCodexKey(enemy);
      grid.insertAdjacentHTML('beforeend', seen.has(key) ? `<div class="codex-card ${this.tierClass(enemy.tier)}"><strong>${enemy.icon || ''} ${this.escapeHtml(trEnemyName(enemy, enemy.name))}</strong><span class="codex-meta">${enemy.type.toUpperCase()} · HP ${enemy.startingRows} · ${enemy.rewardGold}G</span><small>${this.escapeHtml(trEnemyStyle(enemy, enemy.style))}</small><small>AI ${enemy.aiProfile} · Speed ${enemy.speed} · Garbage ${enemy.startingGarbage}</small></div>` : locked());
    });
  }

  togglePracticeMode() {
    this.practiceMode = !this.practiceMode;
    localStorage.setItem('bbs_practice', this.practiceMode ? '1' : '0');
    this.refreshPracticeToggle();
  }

  refreshPracticeToggle() {
    const btn = document.getElementById('practiceToggleBtn');
    if (!btn) return;
    btn.textContent = this.practiceMode ? 'ON' : 'OFF';
    btn.classList.toggle('practice-active', this.practiceMode);
    const startBtn = document.getElementById('startRunBtn');
    if (startBtn) startBtn.textContent = this.practiceMode ? `${t('menu.startRun')} (Practice)` : t('menu.startRun');
  }

  newRun() {
    document.getElementById('endScreen').classList.remove('run-clear');
    this.run = new RunState();
    this.run.practiceMode = this.practiceMode;
    this.discoverRunState();
    this.runShopSpent = 0;
    this.runBattleTetris = false;
    this.runGarbageNuke = false;
    this.runEliteKills = 0;
    this.runConsUsed = 0;
    this.runMaxGold = 0;
    this.runChallengeSuccess = 0;
    const ascMod = this.currentAscMod();
    if (ascMod.playerStartHp != null) this.run.hpRows = ascMod.playerStartHp;
    for (let i = 0; i < (ascMod.startCurseCards ?? 0); i++) {
      this.run.deck.addCard(i % 2 === 0 ? 'HEAVY_JUNK' : 'WIDE_JUNK');
    }
    this.applyMetaUpgrades(this.run);
    const remCount = this.run._metaStartCardRem || 0;
    delete this.run._metaStartCardRem;
    if (remCount > 0) {
      this._metaStartCardRemFlow(remCount, () => { this.routeNextScreen(); this.autoSave(); });
    } else {
      this.routeNextScreen();
      this.autoSave();
    }
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
    document.getElementById('mapTitle').textContent = ui('round', this.run.round);
    document.getElementById('mapMeta').textContent = `${ui('gold')} ${this.run.gold} · HP ${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows} · ${ui('deck')} ${this.run.deckCount()}${ui('cardsUnit')}`;
    document.getElementById('rewardPanel').classList.add('hidden');
    this.renderDeckViewer();
    const wrap = document.getElementById('enemyChoices');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    const ascMod = this.currentAscMod();
    for (const enemy of makeEnemyChoices(this.run.round, this.run.relics, ascMod)) {
      this.discover('enemies', this.enemyCodexKey?.(enemy) || enemy.id || '');
      const btn = document.createElement('button');
      btn.className = `choice ${enemy.type} ${this.tierClass(enemy.tier)}`;
      const challengeHtml = enemy.challenge
        ? (enemy.challenge.condOk
          ? `<small class="challenge-tag">🏆 도전:<br>　🥇 대성공: ${enemy.challenge.cond} → ${enemy.challenge.reward.label}<br>　🥈 성공: ${enemy.challenge.condOk} → ${enemy.challenge.rewardOk?.label || ''}</small>`
          : `<small class="challenge-tag">🏆 도전: ${enemy.challenge.cond}<br>　└ 보상 ${enemy.challenge.reward.label}${enemy.challenge.reward.detail ? ` — ${enemy.challenge.reward.detail}` : ''}</small>`)
        : '';
      const abilityDef = enemy.ability && enemy.ability !== 'overload' ? ENEMY_ABILITIES[enemy.ability] : null;
      const abilityHtml = abilityDef
        ? `<small class="ability-tag">⚔️ 능력: [${abilityDef.label}] ${abilityDef.desc}</small>`
        : (enemy.ability === 'overload' ? `<small class="ability-tag">⚔️ 능력: [OVERLOAD] 게이지가 차면 무작위 디버프를 시전합니다.</small>` : '');
      let starCount;
      if (enemy.type === 'boss') {
        starCount = 5;
      } else {
        const speedScore = Math.max(0, Math.min(1, (430 - enemy.speed) / 348));
        const hpScore = Math.max(0, Math.min(1, (enemy.startingRows - 10) / 18));
        const eliteBonus = enemy.type === 'elite' ? 0.2 : 0;
        const diffScore = speedScore * 0.6 + hpScore * 0.4 + eliteBonus;
        starCount = Math.max(1, Math.min(4, Math.ceil(diffScore * 4)));
      }
      const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
      const diffHtml = `<span class="diff-stars" title="난이도">${stars}</span>`;
      btn.innerHTML = `
        <strong>${enemy.icon ? `${enemy.icon} ` : ''}${trEnemyName(enemy, enemy.name)} ${diffHtml}</strong>
        <span>${enemy.type.toUpperCase()} - ${enemy.rewardGold}G - HP ${enemy.startingRows}</span>
        <small>${trEnemyStyle(enemy, enemy.style)}</small>
        <small>AI ${enemy.aiProfile} - Speed ${enemy.speed} - Garbage ${enemy.startingGarbage}</small>
        ${abilityHtml}
        ${challengeHtml}
      `;
      btn.addEventListener('click', () => { this.audio.playSfx('select'); this.startBattle(enemy); });
      wrap.appendChild(btn);
    }
  }

  showEvent(eventKey) {
    this.show('eventScreen');
    const completed = this.run.round - 1;
    if (eventKey === 'starter') {
      document.getElementById('eventTitle').textContent = ui('starterTitle');
      document.getElementById('eventMeta').textContent = ui('starterMeta');
    } else {
      document.getElementById('eventTitle').textContent = eventKey === 'start' ? ui('startEvent') : ui('afterRound', completed);
      document.getElementById('eventMeta').textContent = `${ui('gold')} ${this.run.gold} · HP ${this.run.hpRows - this.garbageRowCount()}/${this.run.hpRows} · ${ui('oneChoice')}`;
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
      this.discoverItem(choice);
      const btn = document.createElement('button');
      btn.className = `choice event ${this.tierClass(choice.tier)}`;
      btn.innerHTML = `<strong>${this.kindLabel(choice.kind)}${this.kindIcon(choice)}${this.eventTitle(choice)}</strong><span>${this.eventName(choice)}</span><small>${this.eventDesc(choice)}</small>`;
      try {
        this.attachEventPreview(btn, choice);
      } catch {
        btn.insertAdjacentHTML('beforeend', '<small>Preview unavailable.</small>');
      }
      btn.disabled = !this.canUseEvent(choice);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.audio.playSfx('select');
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
    this.input?.resetMenuFocus();
  }

  eventName(choice) {
    if (choice.kind === 'removeCard') return `${choice.price}G · ${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)} ${ui('remove')}`;
    if (choice.kind === 'removeChoice') return `${choice.price}G · ${ui('cardPickRemove')}`;
    if (choice.kind === 'upgradeCard') return `${trCardName(CARD_LIBRARY[choice.from], CARD_LIBRARY[choice.from]?.name)} → ${trCardName(CARD_LIBRARY[choice.to], CARD_LIBRARY[choice.to]?.name)}${this.setTag(choice.to)}`;
    if (choice.kind === 'hpForCurse') return `HP +${choice.amount}, ${trCardName(CARD_LIBRARY[choice.card], CARD_LIBRARY[choice.card]?.name)} ${ui('added')}`;
    if (choice.kind === 'consumable') return dataName('consumable', CONSUMABLES[choice.id], CONSUMABLES[choice.id]?.name);
    if (choice.kind === 'skill') return `${dataName('skill', SKILLS[choice.id], SKILLS[choice.id]?.name)} (MP ${SKILLS[choice.id].cost})`;
    if (choice.kind === 'starterSkill') return `MP ${SKILLS[choice.id].cost}`;
    if (choice.kind === 'gold') return `${choice.amount}G ${ui('gain')}`;
    if (choice.kind === 'cleanup') return ui('cleanup');
    if (choice.kind === 'relicDig') return `HP -${choice.amount} · ${dataName('relic', RELICS[choice.id], RELICS[choice.id]?.name)}`;
    if (choice.kind === 'gamble') return `${choice.bet}G ${ui('bet')}`;
    if (choice.kind === 'contract') return trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name);
    if (choice.kind === 'setRelic') return dataName('relic', RELICS[choice.id], RELICS[choice.id]?.name);
    if (choice.kind === 'grantCard') return `${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)} ${ui('obtained')}`;
    return ui('event');
  }

  eventTitle(choice) {
    if (choice.kind === 'gamble') {
      const labels = {
        bronze: { en: 'Gamble', ja: '賭博' },
        silver: { en: 'Silver Gamble', ja: 'シルバー賭博' },
        gold: { en: 'Gold Gamble', ja: 'ゴールド賭博' }
      };
      return getLang() === 'ko' ? choice.title : labels[choice.gtier || 'bronze']?.[getLang()] || labels.bronze.en;
    }
    if (choice.kind === 'starterSkill') return dataName('skill', SKILLS[choice.id], choice.title);
    if (choice.kind === 'skill') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? 'スキル教官' : 'Skill Trainer');
    if (choice.kind === 'consumable') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '補給キャッシュ' : 'Supply Cache');
    if (choice.kind === 'relicDig') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '遺物発掘' : 'Relic Dig');
    if (choice.kind === 'setRelic') return getLang() === 'ko' ? choice.title : `${dataName('relic', RELICS[choice.id], RELICS[choice.id]?.name)} ${getLang() === 'ja' ? 'セット完成' : 'Set Complete'}`;
    if (choice.kind === 'upgradeCard') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? 'ブロック注入' : 'Block Injection');
    if (choice.kind === 'removeCard') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? 'デッキ手術' : 'Deck Surgery');
    if (choice.kind === 'removeChoice') return ui('cardPickRemove');
    if (choice.kind === 'hpForCurse') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '強化フィールド' : 'Reinforced Field');
    if (choice.kind === 'cleanup') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? 'フィールド清掃' : 'Field Cleanup');
    if (choice.kind === 'gold') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '余分なゴールド' : 'Extra Gold');
    if (choice.kind === 'contract') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '契約' : 'Contract');
    if (choice.kind === 'grantCard') return getLang() === 'ko' ? choice.title : (getLang() === 'ja' ? '捨てられた重量機' : 'Abandoned Crusher');
    if (choice.kind === 'gamble') return getLang() === 'ko' ? choice.title : (choice.gtier === 'gold' ? (getLang() === 'ja' ? 'ゴールド賭博' : 'Gold Gamble') : choice.gtier === 'silver' ? (getLang() === 'ja' ? 'シルバー賭博' : 'Silver Gamble') : (getLang() === 'ja' ? '賭博' : 'Gamble'));
    return choice.title;
  }

  eventDesc(choice) {
    if (getLang() === 'ko') return choice.desc;
    if (choice.kind === 'gamble') {
      const chance = Math.round((choice.chance ?? 0.55) * 100);
      return getLang() === 'ja'
        ? `${choice.bet}ゴールドを賭けます。成功率${chance}%で${choice.reward}ゴールドを受け取り、失敗すると失います。`
        : `Bet ${choice.bet} gold. ${chance}% chance to win ${choice.reward} gold; lose it on failure.`;
    }
    if (choice.kind === 'starterSkill') return dataDesc('skill', SKILLS[choice.id], choice.desc);
    if (choice.kind === 'removeCard') return getLang() === 'ja'
      ? `デッキから${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)}を1枚除去します。`
      : `Remove 1 ${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)} from your deck.`;
    if (choice.kind === 'removeChoice') return getLang() === 'ja' ? 'デッキから好きなカードを1枚選んで除去します。' : 'Choose 1 card from your deck and remove it.';
    if (choice.kind === 'upgradeCard') return `${trCardName(CARD_LIBRARY[choice.from], CARD_LIBRARY[choice.from]?.name)} → ${trCardName(CARD_LIBRARY[choice.to], CARD_LIBRARY[choice.to]?.name)} · ${ui('specialEffect')}: ${trCardDesc(CARD_LIBRARY[choice.to], choice.desc)}`;
    if (choice.kind === 'skill') return `${dataName('skill', SKILLS[choice.id], SKILLS[choice.id]?.name)} (MP ${SKILLS[choice.id].cost}): ${dataDesc('skill', SKILLS[choice.id], SKILLS[choice.id]?.desc)} ${ui('skillFull')}`;
    if (choice.kind === 'hpForCurse') return getLang() === 'ja'
      ? `最大HP行が増えますが、${trCardName(CARD_LIBRARY[choice.card], CARD_LIBRARY[choice.card]?.name)}がデッキに追加されます。`
      : `Max HP rows increase, but ${trCardName(CARD_LIBRARY[choice.card], CARD_LIBRARY[choice.card]?.name)} is added to your deck.`;
    if (choice.kind === 'consumable') return `${dataName('consumable', CONSUMABLES[choice.id], CONSUMABLES[choice.id]?.name)}: ${dataDesc('consumable', CONSUMABLES[choice.id], CONSUMABLES[choice.id]?.desc)} ${ui('itemFull')}`;
    if (choice.kind === 'relicDig') return `${dataName('relic', RELICS[choice.id], RELICS[choice.id]?.name)}: ${dataDesc('relic', RELICS[choice.id], RELICS[choice.id]?.desc)} ${ui('spendRows', choice.amount)}`;
    if (choice.kind === 'contract') return `${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)}: ${trCardDesc(CARD_LIBRARY[choice.id], choice.desc)} ${getLang() === 'ja' ? 'デッキに永続追加されます。' : 'Permanently added to your deck.'}`;
    if (choice.kind === 'grantCard') return `${trCardName(CARD_LIBRARY[choice.id], CARD_LIBRARY[choice.id]?.name)}: ${trCardDesc(CARD_LIBRARY[choice.id], choice.desc)}`;
    if (choice.kind === 'cleanup') return getLang() === 'ja' ? '持ち越しフィールドのゴミ行を最大5行除去し、残りのゴミ行を下へ整列します。' : 'Remove up to 5 carried garbage rows and align the remaining garbage rows downward.';
    if (choice.kind === 'gold') return getLang() === 'ja' ? '少量のゴールドを受け取ります。' : 'Take a small amount of gold.';
    if (choice.kind === 'setRelic') return `${dataName('relic', RELICS[choice.id], RELICS[choice.id]?.name)}: ${dataDesc('relic', RELICS[choice.id], RELICS[choice.id]?.desc)}`;
    if (choice.kind === 'gamble') return getLang() === 'ja'
      ? `${choice.bet}ゴールドを賭けます。成功率${Math.round(choice.chance * 100)}%で${choice.reward}ゴールドを受け取り、失敗すると失います。`
      : `Bet ${choice.bet} gold. ${Math.round(choice.chance * 100)}% chance to win ${choice.reward} gold; lose it on failure.`;
    return choice.desc;
  }

  kindLabel(kind) {
    const map = {
      card: getLang() === 'ja' ? 'ブロック' : getLang() === 'en' ? 'Block' : '블록',
      grantCard: getLang() === 'ja' ? 'ブロック' : getLang() === 'en' ? 'Block' : '블록',
      contract: getLang() === 'ja' ? 'ブロック' : getLang() === 'en' ? 'Block' : '블록',
      upgradeCard: getLang() === 'ja' ? 'ブロック' : getLang() === 'en' ? 'Block' : '블록',
      skill: getLang() === 'ja' ? 'スキル' : getLang() === 'en' ? 'Skill' : '스킬',
      starterSkill: getLang() === 'ja' ? 'スキル' : getLang() === 'en' ? 'Skill' : '스킬',
      consumable: getLang() === 'ja' ? '消耗品' : getLang() === 'en' ? 'Item' : '소모품',
      relic: getLang() === 'ja' ? '遺物' : getLang() === 'en' ? 'Relic' : '유물',
      relicDig: getLang() === 'ja' ? '遺物' : getLang() === 'en' ? 'Relic' : '유물',
      setRelic: getLang() === 'ja' ? '遺物' : getLang() === 'en' ? 'Relic' : '유물',
      hp: 'HP', hpForCurse: 'HP',
      removeCard: ui('remove'), removeChoice: ui('remove'), gamble: getLang() === 'ja' ? '賭博' : getLang() === 'en' ? 'Gamble' : '도박',
      cleanup: getLang() === 'ja' ? '整理' : getLang() === 'en' ? 'Clean' : '정리',
      gold: ui('gold')
    };
    return map[kind] ? `<em class="kind-tag">[${tKindLabel(map[kind])}]</em> ` : '';
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
      this.incrementLifetime('cardRemoves', 5, 'deck_cleaner');
      if (CARD_LIBRARY[choice.id]?.shapeId === 'L') this.unlockAchievement('l_clear');
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
    if (choice.kind === 'gold') this.run.gold += Math.round(choice.amount * (this.currentAscMod().goldFactor ?? 1.0));
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
      let alchemyResult = null;
      this.run.gold -= choice.bet;
      const won = Math.random() < (choice.chance ?? 0.55);
      if (won) {
        this.incrementLifetime('gambleWins', 1, 'lucky_gambler');
        this.run.gold += choice.reward ?? 60;
        if (tier === 'bronze') this.run.gambleNext = 'silver';
        else if (tier === 'silver') this.run.gambleNext = 'gold';
        else if (tier === 'gold') {
          if (!this.run.relics.includes('alchemy_core')) this.run.relics.push('alchemy_core');
          this.discover('relics', 'alchemy_core');
          alchemyResult = this.applyAlchemyCore();
          this.run.gambleNext = null;
          this.run.gambleClosed = true;
        }
      } else {
        if (tier !== 'bronze') this.run.gambleClosed = true;
        this.run.gambleNext = null;
      }
      return this.playGambleEffect(won, choice.bet, () => {
        if (alchemyResult) this.showAlchemyCoreToast(alchemyResult);
        done();
      }, choice.reward ?? 60);
    }
    if (choice.kind === 'contract') this.run.deck.addCard(choice.id);
    done();
  }

  applyAlchemyCore() {
    let transformed = 0;
    const added = [];
    const removed = new Map();
    for (const id of this.run.deck.removedBase || []) removed.set(id, (removed.get(id) || 0) + 1);
    for (const base of BASE_TYPES) {
      const pool = BLOCK_UPGRADES[base];
      if (!pool || !pool.length) continue;
      const remaining = Math.max(0, 3 - (removed.get(base) || 0));
      for (let i = 0; i < remaining; i++) {
        const to = pool[Math.floor(Math.random() * pool.length)];
        this.run.deck.removedBase.push(base);
        this.run.deck.extraCards.push(to);
        this.discover('cards', to);
        added.push(to);
        transformed++;
      }
    }
    this.run.deck.refill();
    return { transformed, added };
  }

  showAlchemyCoreToast(result = {}) {
    const relic = RELICS.alchemy_core;
    const count = result.transformed || 0;
    const text = getLang() === 'ja'
      ? `${relic.icon ?? ''}${dataName('relic', relic, relic.name)}獲得! 基本ブロック${count}枚を特殊ブロックに変換`
      : getLang() === 'en'
        ? `${relic.icon ?? ''}${dataName('relic', relic, relic.name)} obtained! Transformed ${count} basic blocks into special blocks`
        : `${relic.icon ?? ''}${relic.name} 획득! 기본 블록 ${count}장을 특수 블록으로 변환`;
    this.showToast(text, 'elite', 3600);
    this.renderDeckViewer();
  }

  playGambleEffect(won, bet, done = () => {}, reward = 60) {
    const lang = getLang();
    const rollingText = lang === 'ja' ? '運命をめくっています…' : lang === 'en' ? 'Turning fate...' : '운명을 뒤집는 중…';
    const winText = lang === 'ja' ? '大当たり! 賭け成功' : lang === 'en' ? 'Jackpot! Bet won' : '대박! 베팅 성공';
    const loseText = lang === 'ja' ? 'ハズレ… 賭け失敗' : lang === 'en' ? 'Bust... Bet lost' : '꽝… 베팅 실패';
    const host = document.getElementById('app') || document.body;
    const overlay = document.createElement('div');
    overlay.className = 'gamble-overlay';
    const card = document.createElement('div');
    card.className = 'gamble-card';
    card.textContent = '?';
    const label = document.createElement('div');
    label.className = 'gamble-result';
    label.textContent = rollingText;
    overlay.append(card, label);
    host.appendChild(overlay);

    let finished = false;
    const reveal = () => {
      if (finished) return;
      finished = true;
      card.classList.add('reveal', won ? 'win' : 'lose');
      card.textContent = won ? `+${reward}G` : `-${bet}G`;
      label.textContent = won ? winText : loseText;
      label.classList.add(won ? 'win' : 'lose');
      setTimeout(() => { overlay.remove(); done(); }, 1150);
    };
    card.addEventListener('animationend', reveal, { once: true });
    setTimeout(reveal, 1300);
  }

  showShop() {
    this.show('shopScreen');
    document.getElementById('leaveShopBtn').textContent = ui('nextBattle');
    document.getElementById('shopGold').textContent = `${ui('gold')} ${this.run.gold}`;
    const wrap = document.getElementById('shopItems');
    wrap.innerHTML = '';
    const shopKey = String(this.run.round);
    const items = makeShopItems(this.run);
    const stock = this.run.shopStock?.[shopKey] || {};
    const sold = new Set(stock.sold || []);
    const locked = new Set(stock.locked || []);
    const dealKey = stock.dealKey || null;
    const bonusDeals = this.run.bonusShopDeals || 0;
    let extraDealCount = bonusDeals;
    const dealKeys = new Set([dealKey]);
    if (bonusDeals > 0) {
      for (const it of items) {
        if (extraDealCount <= 0) break;
        const k = shopItemKey(it);
        if (!dealKeys.has(k)) { dealKeys.add(k); extraDealCount--; }
      }
    }
    for (const item of items) {
      this.discoverItem(item);
      const key = shopItemKey(item);
      const soldOut = sold.has(key);
      const isDeal = dealKeys.has(key) && !soldOut;
      const price = this.effectivePrice(item, isDeal);
      const slot = document.createElement('div');
      slot.className = `shop-slot${locked.has(key) ? ' locked' : ''}${isDeal ? ' deal' : ''}`;
      const btn = document.createElement('button');
      btn.className = `choice shop ${this.tierClass(item.tier)}`;
      btn.innerHTML = `<strong>${this.kindLabel(item.kind)}${this.kindIcon(item)}${this.shopItemTitle(item)}</strong><span>${soldOut ? ui('soldOut') : `${isDeal ? ui('deal') : ''}${price} ${ui('gold')}`}</span><small>${this.itemDesc(item)}</small>`;
      this.attachItemPreview(btn, item);
      btn.disabled = soldOut || this.run.gold < price || (item.kind === 'skill' && this.run.ownedSkills.includes(item.id));
      btn.addEventListener('click', () => {
        if (btn.disabled || this.run.gold < price) return;
        this.audio.playSfx('purchase');
        this.buyShopItem(item);
      });
      const lockBtn = document.createElement('button');
      lockBtn.className = 'shop-lock';
      lockBtn.textContent = locked.has(key) ? ui('locked') : ui('lock');
      lockBtn.disabled = soldOut;
      lockBtn.addEventListener('click', () => { this.audio.playSfx('click'); this.toggleShopLock(item); });
      slot.appendChild(btn);
      slot.appendChild(lockBtn);
      wrap.appendChild(slot);
    }
    const rerollCost = this.shopRerollCost();
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'choice shop';
    rerollBtn.innerHTML = `<strong>${ui('reroll')}</strong><span>${rerollCost} ${ui('gold')}</span><small>${ui('rerollDesc')}</small>`;
    rerollBtn.disabled = this.run.gold < rerollCost;
    rerollBtn.addEventListener('click', () => {
      if (this.run.gold < rerollCost) return;
      this.audio.playSfx('reroll');
      this.rerollShop();
    });
    wrap.appendChild(rerollBtn);
    this.input?.resetMenuFocus();
  }

  shopItemTitle(item) {
    if (item.kind === 'card') return `${ui('buy')} ${trCardName(CARD_LIBRARY[item.id], CARD_LIBRARY[item.id]?.name)}`;
    if (item.kind === 'skill') return `${ui('skills')}: ${dataName('skill', SKILLS[item.id], SKILLS[item.id]?.name)} (MP ${SKILLS[item.id].cost})`;
    if (item.kind === 'relic') return `${ui('relics')}: ${dataName('relic', RELICS[item.id], RELICS[item.id]?.name)}`;
    if (item.kind === 'consumable') return `${ui('consumables')}: ${dataName('consumable', CONSUMABLES[item.id], CONSUMABLES[item.id]?.name)}`;
    if (item.kind === 'removeChoice') return ui('cardPickRemove');
    if (item.kind === 'hp') return `Max HP +${item.amount}`;
    return item.title;
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
    return Math.max(0, 20 + n * 10 - (this.run.rerollDiscount || 0));
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
        + '<button class="ghost wide" data-close="1"></button>'
        + '<div class="deck-section"><h3 data-section="deck"></h3><div id="mDeckList" class="deck-list"></div></div>'
        + '<div class="deck-section"><h3 data-section="skills"></h3><div id="mSkillList" class="loadout-list"></div></div>'
        + '<div class="deck-section"><h3 data-section="consumables"></h3><div id="mConsumableList" class="loadout-list"></div></div>'
        + '<div class="deck-section"><h3 data-section="relics"></h3><div id="mRelicList" class="loadout-list"></div></div>'
        + '</div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov || e.target.dataset.close) ov.classList.remove('active'); });
    }
    ov.querySelector('[data-close]').textContent = ui('close');
    ov.querySelector('[data-section="deck"]').textContent = ui('deck');
    ov.querySelector('[data-section="skills"]').textContent = ui('skills');
    ov.querySelector('[data-section="consumables"]').textContent = ui('consumables');
    ov.querySelector('[data-section="relics"]').textContent = ui('relics');
    this.renderDeckSections({
      deck: ov.querySelector('#mDeckList'),
      skill: ov.querySelector('#mSkillList'),
      consumable: ov.querySelector('#mConsumableList'),
      relic: ov.querySelector('#mRelicList')
    });
    ov.classList.add('active');
  }

  renderDeckSections({ deck, skill, consumable, relic }) {
    this.discoverRunState();
    if (deck) {
      const counts = new Map();
      for (const id of this.run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
      for (const id of this.run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
      for (const id of this.run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
      deck.innerHTML = '';
      // 모양별 요약 (모든 shapeId 표시)
      const SHAPE_LABEL = getLang() === 'ja'
        ? { I:'I', J:'J', L:'L', O:'O', S:'S', T:'T', Z:'Z', CROSS5:'クロス', HEAVY5:'重量', WIDE6:'6セル', HOOK5:'フック', PENTA_T:'ペンT' }
        : getLang() === 'en'
          ? { I:'I', J:'J', L:'L', O:'O', S:'S', T:'T', Z:'Z', CROSS5:'Cross', HEAVY5:'Heavy', WIDE6:'6-cell', HOOK5:'Hook', PENTA_T:'PenT' }
          : { I:'I', J:'J', L:'L', O:'O', S:'S', T:'T', Z:'Z', CROSS5:'십자', HEAVY5:'중량', WIDE6:'6칸', HOOK5:'훅', PENTA_T:'펜T' };
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
      [...counts.entries()].sort((a, b) => trCardName(CARD_LIBRARY[a[0]], CARD_LIBRARY[a[0]].name).localeCompare(trCardName(CARD_LIBRARY[b[0]], CARD_LIBRARY[b[0]].name))).forEach(([id, count]) => {
        const card = CARD_LIBRARY[id];
        const item = document.createElement('div');
        item.className = `deck-card ${this.tierClass(card.tier)}`;
        item.appendChild(this.blockPreview(card, 7));
        item.insertAdjacentHTML('beforeend', `<span>${trCardName(card, card.name)}${this.setTag(id)}</span><strong>x${count}</strong>`);
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
      skillWrap.innerHTML = `<span class="muted">${ui('noneSkills')}</span>`;
    } else {
      this.run.equippedSkills.forEach((id, index) => {
        const skill = SKILLS[id];
        if (!skill) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(skill.tier)}`;
        item.innerHTML = `<span class="item-chip">${skill.icon || index + 1}</span><span><strong>${index + 1}. ${dataName('skill', skill, skill.name)}</strong><small>${dataDesc('skill', skill, skill.desc)}</small><small class="cost">${skill.cost} MP</small></span>`;
        skillWrap.appendChild(item);
      });
    }

    if (!this.run.consumables.length) {
      consumableWrap.innerHTML = `<span class="muted">${ui('noneConsumables')}</span>`;
    } else {
      this.run.consumables.forEach((id, index) => {
        const itemDef = CONSUMABLES[id];
        if (!itemDef) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(itemDef.tier)}`;
        item.innerHTML = `<span class="item-chip">${itemDef.icon || itemDef.short}</span><span><strong>${index + 4}. ${dataName('consumable', itemDef, itemDef.name)}</strong><small>${dataDesc('consumable', itemDef, itemDef.desc)}</small></span>`;
        consumableWrap.appendChild(item);
      });
    }

    if (!this.run.relics.length) {
      relicWrap.innerHTML = `<span class="muted">${ui('noneRelics')}</span>`;
    } else {
      this.run.relics.forEach(id => {
        const relic = RELICS[id];
        if (!relic) return;
        const item = document.createElement('div');
        item.className = `loadout-card ${this.tierClass(relic.tier)}`;
        item.innerHTML = `<span class="item-chip">${relic.icon || 'R'}</span><span><strong>${dataName('relic', relic, relic.name)}</strong><small>${dataDesc('relic', relic, relic.desc)}</small></span>`;
        relicWrap.appendChild(item);
      });
    }
  }

  itemDesc(item) {
    if (item.kind === 'card') {
      const card = CARD_LIBRARY[item.id];
      return `${trCardName(card, card.name)}${this.setTag(item.id)} (${card.cellCount}${getLang() === 'ja' ? 'セル' : getLang() === 'en' ? ' cells' : '칸'}): ${trCardDesc(card, CARD_DESCRIPTIONS[item.id] || ui('fallbackCardDesc'))}`;
    }
    if (item.kind === 'skill') return dataDesc('skill', SKILLS[item.id], SKILLS[item.id].desc);
    if (item.kind === 'consumable') return `${dataName('consumable', CONSUMABLES[item.id], CONSUMABLES[item.id].name)}: ${dataDesc('consumable', CONSUMABLES[item.id], CONSUMABLES[item.id].desc)}`;
    if (item.kind === 'relic') return dataDesc('relic', RELICS[item.id], RELICS[item.id].desc);
    if (item.kind === 'removeChoice') return getLang() === 'ja' ? 'デッキから好きなカードを1枚選んで除去します。' : getLang() === 'en' ? 'Choose 1 card from your deck and remove it.' : '덱에서 원하는 카드 1장을 선택해 제거합니다.';
    return getLang() === 'ja' ? `生存空間を${item.amount}行追加。` : getLang() === 'en' ? `Add ${item.amount} rows of survival space.` : `생존 공간 ${item.amount}줄 추가.`;
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
      const paidPrice = priceOverride ?? this.effectivePrice(item, stock.dealKey === key);
      this.run.gold -= paidPrice;
      this.runShopSpent = (this.runShopSpent || 0) + paidPrice;
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
    this.discoverItem(item);
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
      title: ui('removeCardTitle'),
      desc: ui('removeCardDesc', price),
      slots: cards,
      labels: id => { const cnt = counts.get(id) || 1; const name = trCardName(CARD_LIBRARY[id], CARD_LIBRARY[id]?.name || id); return cnt > 1 ? `${name} x${cnt}` : name; },
      preview: id => this.blockPreview(CARD_LIBRARY[id], 8),
      slotLabel: getLang() === 'ja' ? 'カード' : getLang() === 'en' ? 'Card' : '카드',
      onPick: index => {
        const id = cards[index];
        if (!id || this.run.gold < price) return skipped(false);
        this.run.gold -= price;
        this.run.deck.removeCard(id);
        this.run.deck.refill();
        this.incrementLifetime('cardRemoves', 5, 'deck_cleaner');
        if (CARD_LIBRARY[id]?.shapeId === 'L') this.unlockAchievement('l_clear');
        done(true);
      },
      onSkip: () => skipped(false)
    });
  }

  acquireSkill(id, done = () => {}, skipped = done) {
    if (this.run.ownedSkills.includes(id)) return skipped(false);
    this.discover('skills', id);
    const add = slot => {
      this.run.ownedSkills.push(id);
      if (slot == null && this.run.equippedSkills.length < 3) this.run.equippedSkills.push(id);
      else if (slot != null) this.run.equippedSkills[slot] = id;
      done(true);
    };
    if (this.run.equippedSkills.length < 3) return add(null);
    this.showSlotPicker({
      title: `${dataName('skill', SKILLS[id], SKILLS[id].name)} ${ui('equip')}`,
      desc: dataDesc('skill', SKILLS[id], SKILLS[id].desc),
      slots: this.run.equippedSkills,
      labels: slotId => dataName('skill', SKILLS[slotId], SKILLS[slotId]?.name) || ui('empty'),
      onPick: add,
      onSkip: () => skipped(false)
    });
  }

  acquireConsumable(id, done = () => {}, skipped = done) {
    this.discover('consumables', id);
    this.trackSeenConsumable?.(id);
    const add = slot => {
      if (slot == null && this.run.consumables.length < 3) this.run.consumables.push(id);
      else if (slot != null) this.run.consumables[slot] = id;
      done(true);
    };
    if (this.run.consumables.length < 3) return add(null);
    this.showSlotPicker({
      title: `${dataName('consumable', CONSUMABLES[id], CONSUMABLES[id].name)} ${ui('acquire')}`,
      desc: dataDesc('consumable', CONSUMABLES[id], CONSUMABLES[id].desc),
      slots: this.run.consumables,
      labels: slotId => dataName('consumable', CONSUMABLES[slotId], CONSUMABLES[slotId]?.name) || ui('empty'),
      onPick: add,
      onSkip: () => skipped(false)
    });
  }

  showSlotPicker({ title, desc, slots, labels, onPick, onSkip, slotLabel = ui('slot'), preview = null }) {
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
        this.input?.resetMenuFocus();
        onPick(index);
      });
      options.appendChild(btn);
    });
    overlay.querySelector('[data-skip]').textContent = ui('skip');
    overlay.querySelector('[data-skip]').onclick = () => {
      overlay.classList.remove('active');
      this.input?.resetMenuFocus();
      onSkip();
    };
    overlay.classList.add('active');
    this.input?.resetMenuFocus();
  }

  startBattle(enemyCard) {
    this.clearBattleTimeouts();
    this.enemyCard = enemyCard;
    this.discover('enemies', this.enemyCodexKey(enemyCard));
    if (this.run.relics.includes('steel_heart')) {
      this.run.hpRows = Math.min(28, this.run.hpRows + 1);
    }
    this.run.deck.beginBattle();
    this.run.deck.exhaustImmune = this.run.relics.includes('preservation_seal');
    this.player = new Board({ rows: this.run.hpRows, deck: this.run.deck, persistentGrid: this.run.persistentGrid });
    const ascMod = this.currentAscMod();
    if (ascMod.purgeFactor != null) this.player.purgeFactor = ascMod.purgeFactor;
    const enemyDeck = enemyCard.mirror ? new Deck([...this.run.deck.extraCards]) : new Deck(enemyCard.deckExtras || []);
    this.enemy = new Board({ rows: enemyCard.startingRows, deck: enemyDeck });
    this.enemy.receiveGarbage(enemyCard.startingGarbage);
    for (const entry of this.enemy.garbageEntries) { entry.timer = 0; entry.instant = true; }
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
    if (this.run.practiceMode) this.player.practiceMode = true;
    this.player.onGarbageLanded = () => this.input.vibrate('garbage');
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
    this.enemyForceDropSteps = 0;
    this.bossOverloadCharge = 0;
    this.bossRhythmSent = 0;
    this.bossRhythmRestTimer = 0;
    this.enemyDebuffs = {};
    this.playerDebuffs = {};
    this.battleUsedHold = false;
    this.battleUsedSkill = false;
    this.battleUsedHardDrop = false;
    this.battleUsedCounterClockwise = false;
    this.battleUsedClockwise = false;
    this.battleMaxSingleAttack = 0;
    this.battleMaxExplodeCells = 0;
    this.battleMaxManaGain = 0;
    this.battleTotalSlow = 0;
    this.battleBountyGold = 0;
    this.battleWardCanceled = 0;
    this.battleMaxCombo = 0;
    this.activeChallenge = enemyCard.challenge || null;
    this.challengeRewarded = false;
    this.paused = false;
    this.autoSaveTimer = 0;
    this.skillCooldowns = {};
    this.message = getLang() === 'ja' ? '戦闘開始' : getLang() === 'en' ? 'Battle start' : '전투 시작';
    document.getElementById('battleTitle').textContent = `${ui('round', this.run.round)}${this.run.practiceMode ? ' [Practice]' : ''}`;
    document.getElementById('battleMeta').textContent = trEnemyName(enemyCard, enemyCard.name);
    document.getElementById('pauseBtn').textContent = t('screen.pause');
    document.getElementById('forfeitBtn').textContent = t('screen.forfeit');
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
      btn.innerHTML = `<span>${skill.icon ? `${skill.icon} ` : ''}${i + 1}. ${dataName('skill', skill, skill.name)}<b class="key-label"></b></span><small>${skill.cost}MP</small>`;
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
      btn.innerHTML = `${i + 4}. ${CONSUMABLES[id].icon || CONSUMABLES[id].short}<b class="key-label"></b>`;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.useConsumable(i);
      });
      consWrap.appendChild(btn);
    });
    this.input?.applyGamepadLabels(this.input?.gamepadIndex >= 0);
  }

  inBattle() {
    return this.screen === 'gameScreen' && this.player && this.enemy;
  }

  inSolo() { return this.screen === 'gameScreen' && !!this.solo && !this.solo.ended; }

  showSoloSelect() {
    this.show('soloSelectScreen');
    this.refreshSoloRecords();
  }

  refreshSoloRecords() {
    let records = {};
    try { records = JSON.parse(localStorage.getItem(SOLO_RECORD_KEY) || '{}'); } catch {}
    const fmtMs = ms => {
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      return `${min}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    };
    for (const [key, cfg] of Object.entries(SOLO_MODES)) {
      const el = document.getElementById(`rec-${key}`);
      if (!el) continue;
      const rec = records[key];
      if (!rec) { el.textContent = '기록 없음'; continue; }
      const parts = [];
      if (cfg.unit === 'time' && rec.timeTop10?.length) {
        parts.push(`⏱ ${fmtMs(rec.timeTop10[0].ms)}`);
      }
      if (rec.scoreTop10?.length) {
        parts.push(`💥 ${rec.scoreTop10[0].score}`);
      }
      el.textContent = parts.length ? parts.join(' · ') : '기록 없음';
    }
  }

  showSoloLeaderboard(modeKey) {
    const modeConfig = SOLO_MODES[modeKey];
    if (!modeConfig) return;
    let records = {};
    try { records = JSON.parse(localStorage.getItem(SOLO_RECORD_KEY) || '{}'); } catch {}
    const rec = records[modeKey] || {};
    const fmtMs = ms => {
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      return `${min}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    };
    const rowHtml = (entries, cols) => {
      if (!entries?.length) return '<p style="color:#8590ac;font-size:13px">기록 없음</p>';
      return `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="color:#8590ac">${cols.map(c => `<th style="text-align:left;padding:3px 6px;border-bottom:1px solid #2a3458">${c}</th>`).join('')}</tr>
        ${entries.map((e, i) => `<tr style="color:${i === 0 ? '#ffe082' : '#d7e5ff'}">
          <td style="padding:3px 6px">${i + 1}</td>
          <td style="padding:3px 6px">💥 ${e.score}</td>
          ${e.ms != null ? `<td style="padding:3px 6px">⏱ ${fmtMs(e.ms)}</td>` : ''}
          <td style="padding:3px 6px">${e.date || ''}</td>
        </tr>`).join('')}
      </table>`;
    };
    const hasTime = modeConfig.unit === 'time';
    const modal = document.createElement('div');
    modal.className = 'deck-modal active';
    modal.innerHTML = `
      <div class="deck-modal-inner" style="min-width:320px;max-width:480px">
        <h3>🏆 ${modeConfig.name} 순위</h3>
        ${hasTime ? `<h4 style="color:#8dcfff;margin:12px 0 6px">⏱ 시간 Top 10 (완료 기준)</h4>
          ${rowHtml(rec.timeTop10, ['#', '점수', '시간', '날짜'])}` : ''}
        <h4 style="color:#ffe082;margin:12px 0 6px">💥 점수 Top 10</h4>
        ${rowHtml(rec.scoreTop10, ['#', '점수', '시간', '날짜'])}
        <button class="ghost" id="soloLbCloseBtn" style="margin-top:14px">닫기</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('soloLbCloseBtn').addEventListener('click', () => modal.remove());
  }

  startSoloMode(modeKey, startLevel = 0) {
    const modeConfig = SOLO_MODES[modeKey];
    if (!modeConfig) return;
    this.solo = { mode: modeKey, linesCleared: 0, elapsed: 0, level: startLevel, startLevel, score: 0, ended: false, topOut: false };
    this.player = new Board({ rows: 20, deck: new Deck() });
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.groundTouched = false;
    this.soloPaused = false;
    document.getElementById('soloModeName').textContent = modeConfig.name;
    const pauseBtn = document.getElementById('soloPauseBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸';
    document.getElementById('soloScore').textContent = '💥 0';
    document.getElementById('gameScreen').classList.add('solo-active');
    this.show('gameScreen');
    this.renderer.resizeSolo(20);
    this.updateSoloStats();
  }

  updateSoloStats() {
    if (!this.solo) return;
    const modeConfig = SOLO_MODES[this.solo.mode];
    const isCountdown = modeConfig.timeLimit > 0;
    const displayMs = isCountdown ? Math.max(0, modeConfig.timeLimit - this.solo.elapsed) : this.solo.elapsed;
    const min = Math.floor(displayMs / 60000);
    const sec = Math.floor((displayMs % 60000) / 1000);
    const cs = Math.floor((displayMs % 1000) / 10);
    const timeStr = `${min}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    const linesStr = modeConfig.goalLines > 0
      ? `${this.solo.linesCleared} / ${modeConfig.goalLines}줄`
      : `${this.solo.linesCleared}줄`;
    const lvlStr = modeConfig.speedRamp ? ` · Lv.${this.solo.level + 1}` : '';
    document.getElementById('soloStats').textContent = `${timeStr} · ${linesStr}${lvlStr}`;
    document.getElementById('soloScore').textContent = `💥 ${Math.round((this.solo.score || 0) * 100) / 100}`;
  }

  updateSolo(dt, now) {
    if (this.soloPaused) {
      this.renderer.drawSolo(this.player, this.solo, SOLO_MODES[this.solo.mode]);
      return;
    }
    this.solo.elapsed += dt;
    const modeConfig = SOLO_MODES[this.solo.mode];
    if (modeConfig.timeLimit > 0 && this.solo.elapsed >= modeConfig.timeLimit) {
      return this.finishSolo(false);
    }
    this.input.update(now);
    this.player.flash = Math.max(0, this.player.flash - dt);
    this.player.tickEffects(dt);
    this.player.comboBreakFlash = Math.max(0, this.player.comboBreakFlash - dt);
    this.player.clearTextFlash = Math.max(0, this.player.clearTextFlash - dt);
    this.updatePlayerGravity(dt);
    if (this.player.defeated) return this.finishSolo(true);
    this.updateSoloStats();
    this.renderer.drawSolo(this.player, this.solo, modeConfig);
  }

  resolveSolo(result) {
    if (!result || !this.solo || this.solo.ended) return;
    this.emitPlaceSfx(result);
    this.solo.score = (this.solo.score || 0) + (result.attack || 0);
    if (result.cleared > 0) {
      this.solo.linesCleared += result.cleared;
      const modeConfig = SOLO_MODES[this.solo.mode];
      if (modeConfig.speedRamp) {
        this.solo.level = Math.min(SOLO_FALL_SPEEDS.length - 1, Math.floor(this.solo.linesCleared / 10));
      }
      if (modeConfig.goalLines > 0 && this.solo.linesCleared >= modeConfig.goalLines) {
        this.solo.linesCleared = modeConfig.goalLines;
        return this.finishSolo(false);
      }
    }
    if (this.player.defeated) this.finishSolo(true);
  }

  finishSolo(topOut = false) {
    if (!this.solo || this.solo.ended) return;
    this.solo.ended = true;
    this.solo.topOut = topOut;
    const modeConfig = SOLO_MODES[this.solo.mode];
    const date = new Date().toISOString().slice(0, 10);
    let records = {};
    try { records = JSON.parse(localStorage.getItem(SOLO_RECORD_KEY) || '{}'); } catch {}
    const modeRec = records[this.solo.mode] || { timeTop10: [], scoreTop10: [] };
    let isBestTime = false, isBestScore = false;

    // scoreTop10: all modes, sorted DESC by score
    const scoreEntry = { score: Math.round((this.solo.score || 0) * 100) / 100, ms: this.solo.elapsed, lines: this.solo.linesCleared, topOut, date };
    modeRec.scoreTop10 = [...(modeRec.scoreTop10 || []), scoreEntry]
      .sort((a, b) => b.score - a.score || a.ms - b.ms)
      .slice(0, 10);
    if (modeRec.scoreTop10[0] === scoreEntry) isBestScore = true;

    // timeTop10: only for time-unit modes and only completed runs
    if (modeConfig.unit === 'time' && !topOut) {
      const timeEntry = { ms: this.solo.elapsed, score: this.solo.score || 0, lines: this.solo.linesCleared, date };
      modeRec.timeTop10 = [...(modeRec.timeTop10 || []), timeEntry]
        .sort((a, b) => a.ms - b.ms)
        .slice(0, 10);
      if (modeRec.timeTop10[0] === timeEntry) isBestTime = true;
    }

    records[this.solo.mode] = modeRec;
    try { localStorage.setItem(SOLO_RECORD_KEY, JSON.stringify(records)); } catch {}
    const isBest = isBestTime || isBestScore;
    // solo achievements
    if (!topOut) this._checkSoloAchievements(this.solo.mode, this.solo.elapsed, this.solo.score || 0);
    // draw final frame with end overlay
    this.renderer.drawSolo(this.player, this.solo, modeConfig, true);
    // show result overlay after short delay
    setTimeout(() => this.showSoloResult(isBest, isBestTime, isBestScore), 800);
  }

  _checkSoloAchievements(mode, ms, score) {
    if (mode === 'sprint40') {
      if (ms <= 55000) this.unlockAchievement('sprint_55s');
      if (ms <= 40000) this.unlockAchievement('sprint_40s');
    } else if (mode === 'marathon150') {
      if (ms <= 180000) this.unlockAchievement('marathon150_3m');
    } else if (mode === 'marathon300') {
      if (ms <= 360000) this.unlockAchievement('marathon300_6m');
    } else if (mode === 'timeatk2') {
      if (score >= 100) this.unlockAchievement('timeatk2_100');
    } else if (mode === 'timeatk3') {
      if (score >= 150) this.unlockAchievement('timeatk3_150');
    }
  }

  showSoloResult(isBest = false, isBestTime = false, isBestScore = false) {
    const modeConfig = SOLO_MODES[this.solo.mode];
    const topOut = this.solo.topOut;
    const modal = document.createElement('div');
    modal.className = 'deck-modal active';
    const fmtMs = ms => {
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      return `${min}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    };
    const timeStr = fmtMs(this.solo.elapsed);
    const resultLine = topOut
      ? `게임 오버 · ${this.solo.linesCleared}줄`
      : modeConfig.unit === 'time'
        ? `${modeConfig.name} 클리어! · ${timeStr}`
        : `${modeConfig.name} 종료 · ${this.solo.linesCleared}줄 · ${timeStr}`;
    const bestTag = isBestTime && isBestScore ? '⏱+💥 신기록!'
      : isBestTime ? '⏱ 최고 기록 (시간)!'
      : isBestScore ? '💥 최고 기록 (점수)!'
      : '';
    modal.innerHTML = `
      <div class="deck-modal-inner">
        <h3>${topOut ? '💀 게임 오버' : '🎉 ' + (isBest ? '신기록!' : '완료!')}</h3>
        <p style="color:#d7e5ff;margin:8px 0">${resultLine}</p>
        <p style="color:#ffe082;font-size:14px;margin:4px 0">💥 점수: ${Math.round((this.solo.score || 0) * 100) / 100}</p>
        ${bestTag ? `<p style="color:#ffe082;font-size:13px">✨ ${bestTag}</p>` : ''}
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <button class="ghost" id="soloRetryBtn">다시 하기</button>
          <button class="ghost" id="soloLbResultBtn">순위 보기</button>
          <button class="ghost" id="soloMenuBtn">모드 선택</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const savedMode = this.solo.mode;
    const savedStartLevel = this.solo.startLevel;
    document.getElementById('soloRetryBtn').addEventListener('click', () => {
      modal.remove();
      this.startSoloMode(savedMode, savedStartLevel);
    });
    document.getElementById('soloLbResultBtn').addEventListener('click', () => {
      this.showSoloLeaderboard(savedMode);
    });
    document.getElementById('soloMenuBtn').addEventListener('click', () => {
      modal.remove();
      document.getElementById('gameScreen').classList.remove('solo-active');
      this.solo = null;
      this.player = null;
      this.showSoloSelect();
    });
  }

  action(action) {
    if (!this.inBattle() && !this.inSolo()) return;
    if (action === 'pause') {
      if (this.inSolo()) return this.toggleSoloPause();
      return this.togglePause();
    }
    if (this.paused || this.soloPaused) return;
    if (this.playerInvertTimer > 0) {
      if (action === 'left') action = 'right';
      else if (action === 'right') action = 'left';
    }
    if (action === 'left') { if (this.groundAdjust(() => this.player.move(-1, 0))) this.audio.playSfx('move'); }
    if (action === 'right') { if (this.groundAdjust(() => this.player.move(1, 0))) this.audio.playSfx('move'); }
    if (action === 'soft') {
      if (this.player.move(0, 1)) { this.resetLockDelay(); this.audio.playSfx('softDrop'); }
      else this.message = 'Grounded';
    }
    if (action === 'rotate') { if (this.groundAdjust(() => this.player.rotate(1))) this.audio.playSfx('rotate'); this.battleUsedClockwise = true; }
    if (action === 'ccw') { if (this.groundAdjust(() => this.player.rotate(-1))) this.audio.playSfx('rotate'); this.battleUsedCounterClockwise = true; }
    if (action === 'hold') { if (this.player.hold()) { this.battleUsedHold = true; this.audio.playSfx('hold'); } }
    if (action === 'hard') {
      if (!this.solo && this.playerSlowTimer > 0) return;
      if (!this.solo) this.battleUsedHardDrop = true;
      this.input.vibrate('harddrop');
      this.audio.playSfx('hardDrop');
      const result = this.player.hardDrop();
      if (this.solo) this.resolveSolo(result);
      else this.resolve(result, this.player);
    }
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
    if (this.solo) return SOLO_FALL_SPEEDS[this.solo.level] ?? 800;
    const base = GAME_TIMING.PLAYER_FALL_INTERVAL * (this.currentAscMod().playerFallFactor ?? 1.0);
    if (this.playerHyperTimer > 0) return base * 0.12;
    return base;
  }

  useSkill(index) {
    if (this.paused) return;
    const id = this.run.equippedSkills[index];
    const skill = SKILLS[id];
    if (!skill || this.player.mp < skill.cost) return;
    if ((this.skillCooldowns[id] || 0) > 0) {
      this.message = getLang() === 'ja' ? `${dataName('skill', skill, skill.name)} クールタイム` : getLang() === 'en' ? `${dataName('skill', skill, skill.name)} cooldown` : `${skill.name} 쿨타임`;
      return;
    }
    const ok = skill.activate({ game: this, player: this.player, enemy: this.enemy, resolve: (result, attacker) => this.resolve(result, attacker) }) !== false;
    if (!ok) {
      this.message = getLang() === 'ja' ? `${dataName('skill', skill, skill.name)} 失敗` : getLang() === 'en' ? `${dataName('skill', skill, skill.name)} failed` : `${skill.name} 실패`;
      return;
    }
    this.battleUsedSkill = true;
    this.player.mp -= skill.cost;
    const cdFactor = this.run.relics.includes('set_manawell') ? 0.5 : 1;
    this.skillCooldowns[id] = (skill.cooldown || 0) * cdFactor;
    this.message = getLang() === 'ja' ? `${dataName('skill', skill, skill.name)} 発動` : getLang() === 'en' ? `${dataName('skill', skill, skill.name)} activated` : `${skill.name} 발동`;
    this.audio.playSfx(SKILL_SFX[id] || 'strike');
  }

  useConsumable(index) {
    if (this.paused) return;
    const id = this.run.consumables[index];
    const item = CONSUMABLES[id];
    if (!item) return;
    this.run.consumables.splice(index, 1);
    this.runConsUsed = (this.runConsUsed || 0) + 1;
    this.message = item.use({ game: this, player: this.player, enemy: this.enemy });
    this.audio.playSfx(CONSUMABLE_SFX[id] || 'mana');
    if (this.player && this.enemy) this.renderer.resize(this.player.rows, this.enemy.rows);
    this.renderTouchSlots();
  }

  resolve(result, attacker) {
    if (!result) return;
    const defender = attacker === this.player ? this.enemy : this.player;
    if (attacker === this.player) this.emitPlaceSfx(result);
    if (result.cleared > 0) this.battleClearedLines += result.cleared;
    if (result.cleared > 0 && attacker === this.player) {
      this.battlePlayerClearedLines += result.cleared;
      // 한 번에 쓰레기 8줄 이상 제거 (직접 클리어 + 클렌즈 onPlace 포함)
      const totalGarbage = (result.garbageCleared || 0) + (result.instant?.purgedRows || 0);
      if (totalGarbage >= 8) this.runGarbageNuke = true;
      this.input.vibrate(`clear${Math.min(4, result.cleared)}`);
    }
    if (attacker === this.player) this.battlePlayerPieces++;
    else if (attacker === this.enemy) this.battleEnemyPieces++;
    let mult = attacker === this.player && this.run.relics.includes('combo_amp') && this.player.combo >= 2 ? 1.25 : 1;
    if (attacker === this.player && result.cleared > 0 && !this.battleFirstClearUsed && this.run.relics.includes('first_strike')) {
      mult *= 3;
      this.battleFirstClearUsed = true;
      this.message = getLang() === 'ja' ? '初手ボーナス!' : getLang() === 'en' ? 'First-move bonus!' : '첫수 보너스!';
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
        const coolantFactor = this.currentAscMod().coolantFactor ?? 1.0;
        const slowAdd = (this.run.relics.includes('set_abszero') ? result.slow * 2 : result.slow) * coolantFactor;
        this.enemySlowTimer += slowAdd;
        this.battleTotalSlow += slowAdd;
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
          this.battleBountyGold += earned;
          this.bountyBank -= earned;
        }
      }
      if (result.explodedCells > 0) this.battleMaxExplodeCells = Math.max(this.battleMaxExplodeCells, result.explodedCells);
      if (result.canceled > 0) this.battleWardCanceled += result.canceled;
      if (result.cleared >= 1) this.battleMaxCombo = Math.max(this.battleMaxCombo, this.player.combo);
    }
    if (result.instant?.enemyGarbage) defender.receiveGarbage(result.instant.enemyGarbage);
    if (result.instant?.dispelEnemy && attacker === this.player) this.dispelEnemyAbilities();
    if (result.comboBreak && attacker === this.player) this.message = getLang() === 'ja' ? `${result.comboBreak}コンボ終了` : getLang() === 'en' ? `${result.comboBreak} combo ended` : `${result.comboBreak}콤보 종료`;
    const manaFactor = this.currentAscMod().manaFactor ?? 1.0;
    if (attacker === this.player && result.cleared > 0 && this.run.relics.includes('mana_lens')) {
      const gain = result.mana * 0.35 * manaFactor;
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + gain);
      this.battleMaxManaGain = Math.max(this.battleMaxManaGain, gain);
    }
    if (attacker === this.player && result.cleared > 0 && !this.player.held && this.run.relics.includes('hold_cache')) {
      const gain = result.mana * 0.5 * manaFactor;
      this.player.mp = Math.min(this.player.mpCap, this.player.mp + gain);
      this.battleMaxManaGain = Math.max(this.battleMaxManaGain, gain);
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
      const enemyAtk = (attacker === this.enemy) ? (this.currentAscMod().enemyAttackFactor ?? 1.0) : 1.0;
      const scaledAttack = attack * enemyAtk;
      const buffered = defender === this.player && this.run.relics.includes('garbage_buffer') ? Math.max(0, scaledAttack - 1) : scaledAttack;
      if (buffered > 0) {
        attacker.attackPool += buffered;
        const toSend = Math.floor(attacker.attackPool);
        attacker.attackPool = Number((attacker.attackPool - toSend).toFixed(4));
        if (toSend > 0) {
          defender.receiveGarbage(toSend);
          if (attacker === this.player) this.battleMaxSingleAttack = Math.max(this.battleMaxSingleAttack, toSend);
        }
      }
    }
    this.emitResolveSfx(result, attacker, defender);
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
    this.flashAlert(getLang() === 'ja' ? '敵の特殊能力を解除!' : getLang() === 'en' ? 'Enemy special ability dispelled!' : '적 특수능력 해제!');
  }

  playerSurvivesLethal() {
    if (!this.run.relics.includes('phoenix_feather')) return false;
    this.player.clearAllGarbage();
    this.player.defeated = false;
    if (!this.player.current) this.player.spawn();
    this.run.relics = this.run.relics.filter(r => r !== 'phoenix_feather');
    this.message = getLang() === 'ja' ? '不死鳥の羽発動! 一度耐えます' : getLang() === 'en' ? 'Phoenix Feather activated! You survive once' : '불사조 깃털 발동! 한 번 버팁니다';
    return true;
  }

  queueBattleEnd(result) {
    if (this.battleEndResult) return;
    this.battleEndResult = result;
    this.clearBattleTimeouts();
    this.battleEndDelay = result === 'win' ? GAME_TIMING.BATTLE_WIN_DELAY : GAME_TIMING.BATTLE_LOSS_DELAY;
    this.message = result === 'win'
      ? (getLang() === 'ja' ? '敵撃破' : getLang() === 'en' ? 'Enemy defeated' : '적 처치')
      : (getLang() === 'ja' ? '戦闘敗北' : getLang() === 'en' ? 'Battle lost' : '전투 패배');
    this.input.vibrate(result === 'win' ? 'win' : 'hurt');
    this.audio.playSfx(result === 'win' ? 'victory' : 'defeat');
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
    if (this.vs) {
      if (!this._vsGameEndHandled) {
        this._vsGameEndHandled = true;
        this._handleVsGameEnd(true);
      }
      return;
    }
    this.pendingChallengeText = '';
    if (this.activeChallenge && !this.challengeRewarded) {
      const st = this.challengeStatus();
      if (st && st.ok) {
        this.challengeRewarded = true;
        const isGreat = !st.grade || st.grade === 'great';
        const reward = isGreat ? this.activeChallenge.reward : (this.activeChallenge.rewardOk || this.activeChallenge.reward);
        const rewardDesc = this.grantChallengeReward(reward);
        const gradeLabel = isGreat
          ? (getLang() === 'ja' ? '大成功' : getLang() === 'en' ? 'Complete' : '대성공')
          : (getLang() === 'ja' ? '成功' : getLang() === 'en' ? 'OK' : '성공');
        // challenge achievement tracking
        if (isGreat) this.unlockAchievement('challenge_great');
        this.runChallengeSuccess = (this.runChallengeSuccess || 0) + 1;
        if (this.runChallengeSuccess >= 3) this.unlockAchievement('challenge_run3');
        this.incrementLifetime('challengeSuccesses', 10, 'challenge_10');
        this.pendingChallengeText = getLang() === 'ja' ? ` · 挑戦${gradeLabel}! ${rewardDesc}` : getLang() === 'en' ? ` · Challenge ${gradeLabel}! ${rewardDesc}` : ` · 도전 ${gradeLabel}! ${rewardDesc}`;
        this.showToast(getLang() === 'ja' ? `🏆 挑戦${gradeLabel}!  ${rewardDesc}` : getLang() === 'en' ? `🏆 Challenge ${gradeLabel}!  ${rewardDesc}` : `🏆 도전 ${gradeLabel}!  ${rewardDesc}`, 'challenge-ok');
        this.audio.playSfx('challengeWin');
      } else {
        this.pendingChallengeText = getLang() === 'ja' ? ' · 挑戦失敗(ボーナスなし)' : getLang() === 'en' ? ' · Challenge failed (no bonus)' : ' · 도전 실패(보너스 없음)';
        this.showToast(getLang() === 'ja' ? '❌ 挑戦失敗 — ボーナスなし' : getLang() === 'en' ? '❌ Challenge failed — no bonus' : '❌ 도전 실패 — 보너스 없음', 'challenge-fail');
        this.audio.playSfx('challengeFail');
      }
    }
    this.checkBattleAchievements(this.enemyCard.type);
    this.checkBattleMilestoneAchievements();
    const goldMult = (this.run.relics.includes('greed') ? 1.2 : 1) * (this.currentAscMod().goldFactor ?? 1.0);
    this.run.gold += Math.round(this.enemyCard.rewardGold * goldMult);
    this.runMaxGold = Math.max(this.runMaxGold || 0, this.run.gold);
    const relicId = (this.enemyCard.type === 'elite' || this.enemyCard.type === 'boss') ? grantEliteRelic(this.run) : null;
    if (relicId) {
      this.discover('relics', relicId);
      const r = RELICS[relicId];
      this.showToast(getLang() === 'ja'
        ? `⚔️ エリート撃破!  ${r.icon ?? ''}${dataName('relic', r, r.name)} 遺物獲得`
        : getLang() === 'en'
          ? `⚔️ Elite defeated!  ${r.icon ?? ''}${dataName('relic', r, r.name)} relic obtained`
          : `⚔️ 엘리트 격파!  ${r.icon ?? ''}${r.name} 유물 획득`, 'elite');
    }
    this.run.persistentGrid = this.player.grid.map(row => row.map(cell => cell?.type === 'garbage' ? { ...cell } : null));
    this.run.hpRows = this.player.rows;
    // 전투 회복: 적 처치 후 가비지 줄 제거
    if (this.run.battleRecovery) {
      let recovered = 0;
      for (let r = this.run.persistentGrid.length - 1; r >= 0 && recovered < this.run.battleRecovery; r--) {
        if (this.run.persistentGrid[r].some(cell => cell?.type === 'garbage')) {
          this.run.persistentGrid[r] = Array.from({ length: 10 }, () => null);
          recovered++;
        }
      }
    }
    this.run.deck.refill();
    if (this.enemyCard?.type === 'boss' || isRunComplete(this.run)) {
      this.run.round = Math.max(this.run.round, 20);
      this.checkSetAchievements?.();
      this.endRun(true);
      return;
    }
    this.checkSetAchievements?.();
    const baseTierPenalty = this.currentAscMod().rewardTierPenalty ?? 0;
    const tierBonus = this.run.round === 1 ? (this.run.startRewardTierBonus || 0) : 0;
    this.showRewards(makeRewards(this.enemyCard.rewardPool, baseTierPenalty - tierBonus), relicId);
    this.autoSave();
  }

  showRewards(rewards, grantedRelic = null) {
    this.show('mapScreen');
    document.getElementById('mapTitle').textContent = ui('roundClear', this.run.round);
    const relicText = grantedRelic ? ` · ${ui('relics')} ${ui('obtained')}: ${dataName('relic', RELICS[grantedRelic], RELICS[grantedRelic].name)}` : '';
    document.getElementById('mapMeta').textContent = `+${this.enemyCard.rewardGold}G${relicText}${this.pendingChallengeText || ''} · ${ui('reward')} ${ui('chooseOne')}`;
    document.getElementById('enemyChoices').innerHTML = '';
    this.renderDeckViewer();
    const panel = document.getElementById('rewardPanel');
    const wrap = document.getElementById('rewardChoices');
    panel.classList.remove('hidden');
    wrap.classList.remove('single-choice');
    wrap.innerHTML = '';
    rewards.forEach(reward => {
      this.discoverItem(reward);
      const btn = document.createElement('button');
      btn.className = `choice reward ${this.tierClass(reward.tier)}`;
      btn.innerHTML = `<strong>${this.kindLabel(reward.kind)}${this.kindIcon(reward)}${this.rewardTitle(reward)}</strong><span>${this.rewardName(reward)}</span><small>${this.itemDesc(reward)}</small>`;
      this.attachItemPreview(btn, reward);
      btn.addEventListener('click', () => {
        this.audio.playSfx('select');
        this.discoverItem(reward);
        applyReward(this.run, reward);
        this.normalizePersistentGrid();
        this.run.round++;
        this.routeNextScreen();
        this.autoSave();
      });
      wrap.appendChild(btn);
    });
    // 보상 재굴리기 버튼
    if ((this.run.rewardRerolls || 0) > 0) {
      const rerollBtn = document.createElement('button');
      rerollBtn.className = 'ghost wide';
      const rerollLabel = getLang() === 'en'
        ? `🎲 Reroll Rewards (${this.run.rewardRerolls} left)`
        : getLang() === 'ja'
          ? `🎲 報酬引き直し (残り${this.run.rewardRerolls}回)`
          : `🎲 보상 재굴리기 (${this.run.rewardRerolls}회 남음)`;
      rerollBtn.textContent = rerollLabel;
      rerollBtn.addEventListener('click', () => {
        this.run.rewardRerolls--;
        const basePenalty = this.currentAscMod().rewardTierPenalty ?? 0;
        const tierBonus = this.run.round === 1 ? (this.run.startRewardTierBonus || 0) : 0;
        this.showRewards(makeRewards(this.enemyCard.rewardPool, basePenalty - tierBonus), grantedRelic);
      });
      panel.appendChild(rerollBtn);
    }
    this.input?.resetMenuFocus();
  }

  rewardName(reward) {
    if (reward.kind === 'card') return trCardName(CARD_LIBRARY[reward.id], CARD_LIBRARY[reward.id].name);
    if (reward.kind === 'skill') return `${dataName('skill', SKILLS[reward.id], SKILLS[reward.id].name)} (MP ${SKILLS[reward.id].cost})`;
    if (reward.kind === 'consumable') return dataName('consumable', CONSUMABLES[reward.id], CONSUMABLES[reward.id].name);
    if (reward.kind === 'relic') return dataName('relic', RELICS[reward.id], RELICS[reward.id].name);
    return ui('hpRows', reward.amount);
  }

  rewardTitle(reward) {
    if (getLang() === 'ko') return reward.title;
    if (reward.kind === 'card') return ui('blockReward');
    if (reward.kind === 'hp') return ui('hpRows', reward.amount);
    return ui('reward');
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
    if (this.vs) {
      if (!win && !this._vsGameEndHandled) {
        this._vsGameEndHandled = true;
        this._handleVsGameEnd(false);
      }
      return;
    }
    this.clearBattleTimeouts();
    this.lastRunResult = win ? 'win' : 'loss';
    if (win) this.audio.playSfx('runClear');
    if (!this.run?.practiceMode) {
      this.updateLifetimeSeen?.(this.run);
      this.checkCompendiumAchievements?.();
    }
    const prevCleared = this.hasEverCleared?.() || false;
    this.saveRecord(win);
    this.deleteSave(true);
    document.getElementById('endScreen').classList.toggle('run-clear', win);
    this.show('endScreen');
    document.getElementById('endTitle').textContent = win ? 'RUN COMPLETE!' : 'RUN FAILED';
    document.getElementById('endSummary').textContent = `${ui('round', Math.min(this.run.round, 20))} · ${ui('gold')} ${this.run.gold} · HP ${this.run.hpRows}${getLang() === 'ja' ? '行' : getLang() === 'en' ? ' rows' : '줄'}`;
    if (!win && !this.run?.practiceMode) {
      const lt = this.loadLifetime?.();
      if (lt) { lt.winStreak = 0; this.saveLifetime?.(lt); }
    }
    if (win) {
      const lvl = this.getAscensionLevel?.() ?? 0;
      this.checkRunAchievements?.(lvl);
      // 단계별 해금: 이번 레벨 클리어 시 다음 레벨 해금
      const prevMax = this.getMaxAscension?.() ?? 0;
      if (!prevCleared) {
        this.setMaxAscension?.(1); // 첫 클리어 → A1 해금
      } else if (lvl >= prevMax && lvl < 10) {
        this.setMaxAscension?.(lvl + 1);
      }
      const newMax = this.getMaxAscension?.() ?? 0;
      const box = document.getElementById('ascensionUnlockBox');
      if (box) {
        if (!prevCleared) {
          box.classList.remove('hidden');
          box.textContent = '🔓 승천 시스템 해금! 메인 메뉴에서 A1 이상을 선택하세요.';
          setTimeout(() => box.classList.add('hidden'), 6000);
        } else if (newMax > prevMax && lvl < 10) {
          box.classList.remove('hidden');
          box.textContent = `🌟 ${ASCENSION_MODS[lvl]?.label} 클리어! ${ASCENSION_MODS[newMax]?.label ?? 'A10'} 해금!`;
          setTimeout(() => box.classList.add('hidden'), 4000);
        } else if (lvl >= 10) {
          box.classList.remove('hidden');
          box.textContent = '👑 신화(A10) 클리어! 최고 난이도 정복!';
          setTimeout(() => box.classList.add('hidden'), 5000);
        } else {
          box.classList.add('hidden');
        }
      }
    }
  }

  saveRecord(win) {
    if (this.run.practiceMode) return;
    const records = this.loadRecords();
    records.unshift({
      round: Math.min(this.run.round, 20),
      gold: this.run.gold,
      result: win ? 'win' : 'loss',
      hpRows: this.run.hpRows,
      deckCount: this.run.deckCount(),
      relicCount: this.run.relics.length,
      skillCount: this.run.ownedSkills.length,
      consumableCount: this.run.consumables.length,
      at: Date.now()
    });
    localStorage.setItem(RECORD_KEY, JSON.stringify(records.slice(0, 20)));
  }

  loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]');
    } catch {
      return [];
    }
  }

  // ===== 업적 =====
  loadAchievements() {
    try { return new Set(JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || '[]')); }
    catch { return new Set(); }
  }

  saveAchievements(set) {
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...set]));
  }

  unlockAchievement(id) {
    const set = this.loadAchievements();
    if (set.has(id)) return;
    set.add(id);
    this.saveAchievements(set);
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
      const lang = getLang();
      const name = lang === 'en' ? ach.en : lang === 'ja' ? ach.ja : ach.ko;
      this.showToast(`🏅 ${lang === 'en' ? 'Achievement: ' : lang === 'ja' ? '実績解除: ' : '업적 해금: '}${ach.icon} ${name}`, 'elite', 3500);
    }
    // Award 1 meta point per achievement
    const meta = this.loadMeta();
    meta.points = (meta.points || 0) + 1;
    meta.totalEarned = (meta.totalEarned || 0) + 1;
    this.saveMeta(meta);
  }

  // ===== 영구 업그레이드 (메타) =====
  loadMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
  }
  saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
  }

  applyMetaUpgrades(run) {
    const meta = this.loadMeta();
    const upgs = meta.upgrades || {};
    const lvl = id => upgs[id] || 0;

    if (lvl('startHp')) run.hpRows = Math.min(28, run.hpRows + lvl('startHp'));
    if (lvl('startGold')) run.gold += lvl('startGold') * 15;
    if (lvl('rerollDiscount')) run.rerollDiscount = lvl('rerollDiscount') * 5;
    if (lvl('shopDeals')) run.bonusShopDeals = lvl('shopDeals');

    // 시작 유물
    if (lvl('startRelic')) {
      const available = Object.keys(RELICS).filter(id => !run.relics.includes(id));
      if (available.length) run.relics.push(available[Math.floor(Math.random() * available.length)]);
    }
    // 시작 소모품
    const consIds = Object.keys(CONSUMABLES);
    for (let i = 0; i < lvl('startCons') && run.consumables.length < 3; i++) {
      run.consumables.push(consIds[Math.floor(Math.random() * consIds.length)]);
    }
    // 시작 카드 추가
    const specials = Object.values(CARD_LIBRARY).filter(c => c.abilityId && c.abilityId !== 'none');
    for (let i = 0; i < lvl('startCardAdd'); i++) {
      const card = specials[Math.floor(Math.random() * specials.length)];
      if (card) run.deck.addCard(card.id);
    }
    // 1라운드 보상 티어 보너스
    if (lvl('startRewardTier')) run.startRewardTierBonus = lvl('startRewardTier');
    // 시작 카드 제거 횟수 (newRun에서 처리)
    run._metaStartCardRem = lvl('startCardRem');
    // 보상 재굴리기 횟수
    if (lvl('rewardReroll')) run.rewardRerolls = lvl('rewardReroll');
    // 전투 회복 레벨
    if (lvl('battleRecovery')) run.battleRecovery = lvl('battleRecovery');
  }

  showMetaScreen() {
    const meta = this.loadMeta();
    const upgs = meta.upgrades || {};
    const pts = meta.points || 0;
    const totalEarned = meta.totalEarned || 0;
    const maxPts = ACHIEVEMENTS.length;
    const spentTotal = META_UPGRADES.reduce((sum, upg) => {
      const cur = upgs[upg.id] || 0;
      return sum + upg.costs.slice(0, cur).reduce((a, b) => a + b, 0);
    }, 0);

    const modal = document.createElement('div');
    modal.className = 'deck-modal active';

    const rows = META_UPGRADES.map(upg => {
      const cur = upgs[upg.id] || 0;
      const maxed = cur >= upg.maxLevel;
      const nextCost = maxed ? 0 : upg.costs[cur];
      const canAfford = pts >= nextCost;
      const barWidth = Math.round((cur / upg.maxLevel) * 100);
      return `
        <div class="meta-upg-row" data-id="${upg.id}">
          <div class="meta-upg-info">
            <span class="meta-upg-icon">${upg.icon}</span>
            <div>
              <div class="meta-upg-name">${upg.name}</div>
              <div class="meta-upg-desc">${upg.desc}</div>
              <div class="meta-upg-bar-wrap"><div class="meta-upg-bar" style="width:${barWidth}%"></div></div>
            </div>
          </div>
          <div class="meta-upg-right">
            <div class="meta-upg-level">Lv ${cur}/${upg.maxLevel}</div>
            ${maxed
              ? `<button class="ghost" disabled>MAX</button>`
              : `<button class="ghost meta-buy-btn${canAfford ? '' : ' dim'}" data-id="${upg.id}" ${canAfford ? '' : 'disabled'}>${nextCost}P ↑</button>`
            }
          </div>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="deck-modal-inner meta-modal">
        <h3>🌟 영구 업그레이드</h3>
        <div class="meta-pts">포인트: <strong>${pts}</strong> / ${maxPts} &nbsp;(총 획득 ${totalEarned})</div>
        <div class="meta-upg-list">${rows}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="ghost wide" id="metaCloseBtn">닫기</button>
          <button class="ghost wide danger" id="metaRefundBtn" ${spentTotal === 0 ? 'disabled' : ''}>↩ 전체 환불 (+${spentTotal}P)</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('.meta-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const upg = META_UPGRADES.find(u => u.id === id);
        if (!upg) return;
        const cur = (meta.upgrades || {})[id] || 0;
        if (cur >= upg.maxLevel) return;
        const cost = upg.costs[cur];
        if ((meta.points || 0) < cost) return;
        meta.points = (meta.points || 0) - cost;
        meta.upgrades = meta.upgrades || {};
        meta.upgrades[id] = cur + 1;
        this.saveMeta(meta);
        modal.remove();
        this.showMetaScreen();
      });
    });
    document.getElementById('metaCloseBtn').addEventListener('click', () => modal.remove());
    document.getElementById('metaRefundBtn')?.addEventListener('click', () => {
      meta.points = (meta.totalEarned || 0);
      meta.upgrades = {};
      this.saveMeta(meta);
      modal.remove();
      this.showMetaScreen();
    });
  }

  _metaStartCardRemFlow(count, onDone) {
    if (count <= 0) { onDone(); return; }
    const allIds = [...this.run.deck.draw, ...this.run.deck.discard, ...this.run.deck.extraCards];
    if (!allIds.length) { onDone(); return; }
    const modal = document.createElement('div');
    modal.className = 'deck-modal active';
    const cards = [...new Set(allIds)].map(id => CARD_LIBRARY[id]).filter(Boolean);
    const cardHtml = cards.map(c => `<button class="choice meta-rem-card" data-id="${c.id}" style="padding:6px 10px;font-size:12px;margin:3px"><strong>${c.name}</strong></button>`).join('');
    modal.innerHTML = `
      <div class="deck-modal-inner">
        <h3>✂️ 덱 정리 (${count}회 남음)</h3>
        <p style="color:#8590ac;font-size:13px;margin:6px 0">제거할 카드를 선택하세요 (무료)</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:240px;overflow-y:auto;margin:8px 0">${cardHtml}</div>
        <button class="ghost" id="metaRemSkipBtn" style="margin-top:8px">건너뛰기</button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.meta-rem-card').forEach(btn => {
      btn.addEventListener('click', () => {
        this.run.deck.removeCard(btn.dataset.id);
        this.run.deck.refill();
        modal.remove();
        this._metaStartCardRemFlow(count - 1, onDone);
      });
    });
    document.getElementById('metaRemSkipBtn').addEventListener('click', () => {
      modal.remove();
      this._metaStartCardRemFlow(count - 1, onDone);
    });
  }

  checkRunAchievements(ascensionLevel) {
    if (this.run.practiceMode) return;
    this.unlockAchievement('first_clear');
    if (this.run.gold >= 200) this.unlockAchievement('rich');
    if ((this.runMaxGold || 0) >= 500) this.unlockAchievement('gold_500');
    if (this.run.equippedSkills.length >= 3) this.unlockAchievement('skill_master');
    if (this.run.relics.length >= 5) this.unlockAchievement('relic_hunter');
    if ((this.runEliteKills || 0) >= 3) this.unlockAchievement('elite_hunter');
    if ((this.runConsUsed || 0) >= 5) this.unlockAchievement('cons_user');
    // 한 종류 10개: 덱의 카드 shapeId 카운트
    const allCards = [...(this.run.deck.draw || []), ...(this.run.deck.discard || [])];
    const shapeCounts = {};
    for (const id of allCards) {
      const card = CARD_LIBRARY?.[id];
      if (card?.shapeId) shapeCounts[card.shapeId] = (shapeCounts[card.shapeId] || 0) + 1;
    }
    if (Object.values(shapeCounts).some(n => n >= 10)) this.unlockAchievement('mono_deck');
    if (ascensionLevel >= 1) this.unlockAchievement('ascension_1');
    if (ascensionLevel >= 2) this.unlockAchievement('asc_clear_2');
    if (ascensionLevel >= 3) this.unlockAchievement('ascension_3');
    if (ascensionLevel >= 4) this.unlockAchievement('asc_clear_4');
    if (ascensionLevel >= 5) this.unlockAchievement('ascension_5');
    if (ascensionLevel >= 6) this.unlockAchievement('asc_clear_6');
    if (ascensionLevel >= 7) this.unlockAchievement('asc_clear_7');
    if (ascensionLevel >= 8) this.unlockAchievement('ascension_8');
    if (ascensionLevel >= 9) this.unlockAchievement('asc_clear_9');
    if (ascensionLevel >= 10) this.unlockAchievement('ascension_10');
    // 영구업글 없이 승천 클리어
    const metaUpgs = this.loadMeta().upgrades || {};
    const hasMetaUpgrades = Object.values(metaUpgs).some(v => v > 0);
    if (!hasMetaUpgrades) {
      if (ascensionLevel >= 1) this.unlockAchievement('nometa_asc1');
      if (ascensionLevel >= 3) this.unlockAchievement('nometa_asc3');
      if (ascensionLevel >= 5) this.unlockAchievement('nometa_asc5');
      if (ascensionLevel >= 8) this.unlockAchievement('nometa_asc8');
      if (ascensionLevel >= 10) this.unlockAchievement('nometa_asc10');
    }
    const lt = this.loadLifetime();
    lt.totalWins = (lt.totalWins || 0) + 1;
    lt.winStreak = (lt.winStreak || 0) + 1;
    this.saveLifetime(lt);
    if (lt.totalWins >= 3) this.unlockAchievement('three_wins');
    if (lt.winStreak >= 10) this.unlockAchievement('win_streak_10');
  }

  checkBattleAchievements(enemyType) {
    if (this.run?.practiceMode) return;
    if (enemyType === 'boss') this.unlockAchievement('boss_kill');
    if (enemyType === 'elite') {
      this.runEliteKills = (this.runEliteKills || 0) + 1;
      const lt = this.loadLifetime();
      lt.eliteKills = (lt.eliteKills || 0) + 1;
      this.saveLifetime(lt);
      if (lt.eliteKills >= 5) this.unlockAchievement('elite_killer');
    }
  }

  checkBattleMilestoneAchievements() {
    if (this.run?.practiceMode) return;
    // 한 번에 큰 공격
    if (this.battleMaxSingleAttack >= 5) this.unlockAchievement('atk_big');
    // 폭발 대량 제거
    if (this.battleMaxExplodeCells >= 20) this.unlockAchievement('explode_big');
    // 마나 대량 회복
    if (this.battleMaxManaGain >= 40) this.unlockAchievement('mana_burst');
    // 한 전투 냉각 누적
    if (this.battleTotalSlow >= 20000) this.unlockAchievement('coolant_master');
    // 한 전투 현상금 골드
    if (this.battleBountyGold >= 40) this.unlockAchievement('bounty_hunter');
    // 차단 누적
    if (this.battleWardCanceled >= 8) this.unlockAchievement('ward_master');
    // 콤보
    if (this.battleMaxCombo >= 10) this.unlockAchievement('combo_master');
    // 한 번에 쓰레기 8줄 이상 제거
    if (this.runGarbageNuke) this.unlockAchievement('garbage_nuke');
    // 덱 크기 (승리 시)
    const deckSize = this.run.deck.draw.length + this.run.deck.discard.length;
    if (deckSize >= 35) this.unlockAchievement('deck_overload');
    if (deckSize <= 10) this.unlockAchievement('deck_minimalist');
    // 장기전: 적이 100개 이상 피스를 놓은 전투에서 승리
    if (this.battleEnemyPieces >= 100) this.unlockAchievement('long_battle');
    // 상점 지출 (런 전체 누적)
    if ((this.runShopSpent || 0) >= 100) this.unlockAchievement('shop_spender');
  }

  checkSetAchievements() {
    if (this.run?.practiceMode) return;
    const allCards = new Set([...this.run.deck.draw, ...this.run.deck.discard]);
    let completedCount = 0;
    for (const [setId, setDef] of Object.entries(SET_DEFINITIONS)) {
      if (Object.values(setDef).every(id => allCards.has(id))) {
        completedCount++;
        this.unlockAchievement(`set_${setId}`);
      }
    }
    if (completedCount === Object.keys(SET_DEFINITIONS).length) {
      this.unlockAchievement('all_sets');
    }
  }

  updateLifetimeSeen(run) {
    const lt = this.loadLifetime();
    const sc = new Set(lt.seenCards || []);
    const ss = new Set(lt.seenSkills || []);
    const sr = new Set(lt.seenRelics || []);
    const sCons = new Set(lt.seenCons || []);
    for (const id of [...run.deck.draw, ...run.deck.discard, ...(run.deck.extraCards || [])]) sc.add(id);
    for (const id of run.ownedSkills) ss.add(id);
    for (const id of run.relics) sr.add(id);
    for (const id of run.consumables) sCons.add(id);
    lt.seenCards = [...sc];
    lt.seenSkills = [...ss];
    lt.seenRelics = [...sr];
    lt.seenCons = [...sCons];
    this.saveLifetime(lt);
    return { sc, ss, sr, sCons };
  }

  trackSeenConsumable(id) {
    if (this.run?.practiceMode || !id) return;
    const lt = this.loadLifetime();
    const s = new Set(lt.seenCons || []);
    s.add(id);
    lt.seenCons = [...s];
    this.saveLifetime(lt);
    this.checkCompendiumAchievements();
  }

  checkCompendiumAchievements() {
    if (this.run?.practiceMode) return;
    const lt = this.loadLifetime();
    const playerCardIds = new Set(
      Object.values(CARD_LIBRARY)
        .filter(c => c.tier && c.rarity !== 'base' && c.rarity !== 'curse' && !c.exhaust)
        .map(c => c.id)
    );
    const seenCards = new Set(lt.seenCards || []);
    const seenSkills = new Set(lt.seenSkills || []);
    const seenRelics = new Set(lt.seenRelics || []);
    const seenCons = new Set(lt.seenCons || []);
    const totalSkills = Object.keys(SKILLS).length;
    const totalRelics = Object.keys(RELICS).length;
    const totalCons = Object.keys(CONSUMABLES).length;
    const cardsOk = [...playerCardIds].every(id => seenCards.has(id));
    const skillsOk = seenSkills.size >= totalSkills;
    const relicsOk = seenRelics.size >= totalRelics;
    const consOk = seenCons.size >= totalCons;
    if (cardsOk) this.unlockAchievement('compendium_cards');
    if (skillsOk) this.unlockAchievement('compendium_skills');
    if (relicsOk) this.unlockAchievement('compendium_relics');
    if (consOk) this.unlockAchievement('compendium_cons');
    if (cardsOk && skillsOk && relicsOk && consOk) this.unlockAchievement('compendium_all');
  }

  // ===== 평생 통계 =====
  loadLifetime() {
    try { return JSON.parse(localStorage.getItem(LIFETIME_KEY) || '{}'); }
    catch { return {}; }
  }

  saveLifetime(lt) {
    localStorage.setItem(LIFETIME_KEY, JSON.stringify(lt));
  }

  incrementLifetime(key, threshold, achievementId) {
    const lt = this.loadLifetime();
    lt[key] = (lt[key] || 0) + 1;
    this.saveLifetime(lt);
    if (lt[key] >= threshold) this.unlockAchievement(achievementId);
  }

  // ===== 승천 =====
  getMaxAscension() {
    const n = parseInt(localStorage.getItem(ASCENSION_MAX_KEY) || '0', 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
  }

  setMaxAscension(n) {
    const clamped = Math.max(0, Math.min(10, n));
    if (clamped > this.getMaxAscension()) localStorage.setItem(ASCENSION_MAX_KEY, String(clamped));
  }

  getAscensionLevel() {
    const n = parseInt(localStorage.getItem(ASCENSION_KEY) || '0', 10);
    const max = this.getMaxAscension();
    return isNaN(n) ? 0 : Math.max(0, Math.min(max, n));
  }

  setAscensionLevel(n) {
    const max = this.getMaxAscension();
    localStorage.setItem(ASCENSION_KEY, String(Math.max(0, Math.min(max, n))));
  }

  hasEverCleared() {
    return this.loadRecords().some(r => r.result === 'win');
  }

  currentAscMod() {
    return ASCENSION_MODS[this.getAscensionLevel()] || ASCENSION_MODS[0];
  }

  refreshAscensionDisplay() {
    const el = document.getElementById('ascensionDisplay');
    if (!el) return;
    if (!this.hasEverCleared()) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const lvl = this.getAscensionLevel();
    const max = this.getMaxAscension();
    const mod = ASCENSION_MODS[lvl];
    const lang = getLang();
    const modName = lang === 'en' ? mod.en : lang === 'ja' ? mod.ja : mod.ko;
    const downBtn = lvl > 0 ? `<button class="ghost asc-btn" data-asc="${lvl - 1}">◀</button>` : `<button class="ghost asc-btn" disabled>◀</button>`;
    const upBtn = lvl < max ? `<button class="ghost asc-btn" data-asc="${lvl + 1}">▶</button>` : `<button class="ghost asc-btn" disabled title="${lvl < 10 ? (lang === 'en' ? 'Clear this level to unlock' : '이 레벨 클리어 시 해금') : ''}">▶</button>`;
    const mods = [];
    if (mod.garbage > 0) mods.push(`적 쓰레기 +${mod.garbage}`);
    if (mod.speedFactor < 1.0) mods.push(`적 속도 +${Math.round((1 - mod.speedFactor) * 100)}%`);
    if (mod.eliteChanceBonus > 0) mods.push(`엘리트 확률 +${Math.round(mod.eliteChanceBonus * 100)}%`);
    if (mod.playerFallFactor < 1.0) mods.push(`내 낙하속도 +${Math.round((1 - mod.playerFallFactor) * 100)}%`);
    if (mod.manaFactor < 1.0) mods.push(`마나 회복 -${Math.round((1 - mod.manaFactor) * 100)}%`);
    if (mod.playerStartHp != null) mods.push(`시작 체력 ${mod.playerStartHp}줄`);
    if (mod.enemyAttackFactor > 1.0) mods.push(`적 공격력 +${Math.round((mod.enemyAttackFactor - 1) * 100)}%`);
    if (mod.goldFactor != null && mod.goldFactor < 1.0) mods.push(`골드 획득 -${Math.round((1 - mod.goldFactor) * 100)}%`);
    if (mod.coolantFactor != null && mod.coolantFactor < 1.0) mods.push(`냉각 효과 -${Math.round((1 - mod.coolantFactor) * 100)}%`);
    if (mod.purgeFactor != null && mod.purgeFactor < 1.0) mods.push(`클렌즈 효과 -${Math.round((1 - mod.purgeFactor) * 100)}%`);
    if (mod.rewardTierPenalty > 0) mods.push(`보상 티어 -${mod.rewardTierPenalty}`);
    if (mod.startCurseCards > 0) mods.push(`시작 저주카드 ${mod.startCurseCards}장`);
    const lockHint = lvl >= max && lvl < 10 ? `<small class="asc-lock">🔒 ${lang === 'en' ? 'Clear to unlock next' : '클리어하면 다음 단계 해금'}</small>` : '';
    el.innerHTML = `<span>${lang === 'ja' ? '昇天レベル' : lang === 'en' ? 'Ascension' : '승천'}: ${downBtn} <strong>${mod.label} ${modName}</strong> ${upBtn}</span>${mods.length ? `<small class="asc-mods">${mods.join(' · ')}</small>` : ''}${lockHint}`;
    el.querySelectorAll('.asc-btn[data-asc]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setAscensionLevel(parseInt(btn.dataset.asc, 10));
        this.refreshAscensionDisplay();
      });
    });
  }

  showAchievementsModal() {
    const unlocked = this.loadAchievements();
    const lang = getLang();
    const count = unlocked.size;
    const total = ACHIEVEMENTS.length;
    const pct = Math.round(count / total * 100);
    const meta = this.loadMeta();
    const pts = meta.points || 0;

    const rows = ACHIEVEMENTS.map(a => {
      const isUnlocked = unlocked.has(a.id);
      const name = lang === 'en' ? a.en : lang === 'ja' ? a.ja : a.ko;
      const desc = isUnlocked ? (lang === 'en' ? a.en_d : lang === 'ja' ? a.ja_d : a.ko_d) : '???';
      return `<div class="achievement-row ${isUnlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${isUnlocked ? a.icon : '🔒'}</span>
        <div><strong>${name}</strong><small>${desc}</small></div>
      </div>`;
    }).join('');

    const titleText = `${lang === 'ja' ? '実績' : lang === 'en' ? 'Achievements' : '업적'} ${count}/${total}`;
    const progressHtml = `
      <div class="ach-progress-wrap">
        <div class="ach-progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="ach-progress-label">${pct}% 달성 · 포인트 보유 ${pts}P</div>`;

    let ov = document.getElementById('achievementsModal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'achievementsModal';
      ov.className = 'deck-modal';
      ov.innerHTML = `<div class="deck-modal-inner">
        <button class="ghost wide" data-close="1">✕ 닫기</button>
        <h2 id="achModalTitle"></h2>
        <div id="achProgress"></div>
        <div id="achModalList" class="achievements-list"></div>
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov || e.target.dataset.close) ov.classList.remove('active'); });
    }
    ov.querySelector('#achModalTitle').textContent = titleText;
    ov.querySelector('#achProgress').innerHTML = progressHtml;
    ov.querySelector('#achModalList').innerHTML = rows;
    ov.classList.add('active');
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
      gambleClosed: !!this.run.gambleClosed,
      practiceMode: !!this.run.practiceMode
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
    run.practiceMode = !!state.practiceMode;
    return run;
  }

  autoSave() {
    if (this.vs) return; // VS mode doesn't use the save system
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
        battleUsedCounterClockwise: this.battleUsedCounterClockwise,
        battleUsedClockwise: this.battleUsedClockwise,
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
        enemyForceDropSteps: this.enemyForceDropSteps || 0,
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
        this.battleUsedCounterClockwise = !!(state.battle.battleUsedCounterClockwise ?? state.battle.battleUsedCcw);
        this.battleUsedClockwise = !!(state.battle.battleUsedClockwise ?? state.battle.battleUsedCw);
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
        this.enemyForceDropSteps = state.battle.enemyForceDropSteps || 0;
        this.bossOverloadCharge = state.battle.bossOverloadCharge || 0;
        this.bossRhythmSent = state.battle.bossRhythmSent || 0;
        this.bossRhythmRestTimer = state.battle.bossRhythmRestTimer || 0;
        this.playerDebuffs = { ...(state.battle.playerDebuffs || {}) };
        this.enemyDebuffs = { ...(state.battle.enemyDebuffs || {}) };
        this.syncTimedLocks();
        this.paused = state.battle.paused ?? true;
        this.message = state.battle.message || (getLang() === 'ja' ? '読み込み済み' : getLang() === 'en' ? 'Loaded' : '불러옴');
        document.getElementById('battleTitle').textContent = ui('round', this.run.round);
        document.getElementById('battleMeta').textContent = trEnemyName(this.enemyCard, this.enemyCard?.name || 'Enemy');
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
      this.discoverRunState();
      this.discover('enemies', this.enemyCodexKey(this.enemyCard));
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
    document.getElementById('pauseBtn').textContent = this.paused ? t('screen.resume') : t('screen.pause');
    document.getElementById('pauseOverlay')?.classList.toggle('hidden', !this.paused);
    this.message = this.paused ? t('screen.pauseTitle') : t('screen.resume');
    this.audio.playSfx(this.paused ? 'pause' : 'resume');
    this.autoSave();
  }

  toggleSoloPause() {
    if (!this.solo || this.solo.ended) return;
    this.soloPaused = !this.soloPaused;
    const btn = document.getElementById('soloPauseBtn');
    if (btn) btn.textContent = this.soloPaused ? '▶' : '⏸';
    this.audio.playSfx(this.soloPaused ? 'pause' : 'resume');
  }

  // 즉발 효과(onPlace)에 따른 SFX. result.instant는 board.applyOnPlace에서 채워진다.
  emitPlaceSfx(result) {
    const ins = result?.instant;
    if (!ins) return;
    if (ins.attack > 0) this.audio.playSfx('strike');
    if (ins.canceled > 0) this.audio.playSfx('shield');
    if (ins.purgedRows > 0) this.audio.playSfx('purge');
    if (ins.mana > 0) this.audio.playSfx('mana');
    if (ins.dispelEnemy) this.audio.playSfx('dispel');
    if (ins.selfGarbage > 0) this.audio.playSfx('penalty');
  }

  // 위급 판정 = 보드 스택 높이(어떤 셀이든 있는 영역) + 게이지에 예정된 쓰레기 합산(>=70%).
  // 일반 블록이든 쓰레기든 보드를 위쪽까지 채우면 탑아웃 위험이므로 동일하게 취급.
  // 보스/엘리트는 자기 테마의 긴박 버전으로 전환.
  updateDangerAudio() {
    if (!this.inBattle() || this.battleEndResult) return;
    const rows = this.player?.rows || 1;
    let stackHeight = 0;
    if (this.player?.grid) {
      for (let r = 0; r < rows; r++) {
        if (this.player.grid[r]?.some(c => c)) { stackHeight = rows - r; break; }
      }
    }
    const pending = (this.player?.garbageEntries || []).reduce((s, e) => s + Math.ceil(e.amount || 0), 0);
    const danger = (stackHeight + pending) / rows >= 0.7;
    if (danger) this.audio.playHeartbeat();
    const e = this.enemyCard;
    let baseScene, tenseScene;
    if (e?.type === 'boss') { baseScene = 'boss'; tenseScene = 'bossTense'; }
    else if (e?.type === 'elite') { baseScene = 'elite'; tenseScene = 'eliteTense'; }
    else { baseScene = 'battle'; tenseScene = 'battleTense'; }
    this.audio.setIntensity(danger ? tenseScene : baseScene);
  }

  emitResolveSfx(result, attacker, defender) {
    if (attacker === this.player) {
      const c = result.cleared || 0;
      if (c >= 4) this.audio.playSfx('clear4');
      else if (c === 3) this.audio.playSfx('clear3');
      else if (c === 2) this.audio.playSfx('clear2');
      else if (c === 1) this.audio.playSfx('clear1');
      if (result.exploded || (result.bombRows && result.bombRows.length)) this.audio.playSfx('explosion');
      if (result.glassBroken) this.audio.playSfx('glassBreak');
      if (result.slow) this.audio.playSfx('freeze');
      if (result.gold) this.audio.playSfx('coin');
      if (result.chargeGained) this.audio.playSfx('comboCharge');
      if (this.player?.combo >= 2 && c > 0) this.audio.playSfx('combo', this.player.combo);
    } else if (attacker === this.enemy) {
      if (result.glassBroken) this.audio.playSfx('glassBreak');
      if (result.attack > 0 || result.cleared > 0) this.audio.playSfx('enemyHit');
    }
  }

  loop(now) {
    const dt = Math.min(50, now - (this.last || now));
    this.last = now;
    if (this.inBattle()) this.updateBattle(dt, now);
    else if (this.inSolo()) this.updateSolo(dt, now);
    else this.input?.update(now);
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
      this.input.update(now);
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
    this.enemyStunTimer = Math.max(0, (this.enemyStunTimer ?? 0) - dt);
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
    if (this.enemyForceDropTimer <= 0) this.enemyForceDropSteps = 0;
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
    this.updateDangerAudio();
    this.updateSkillButtons();
    if (this.enemy.defeated) this.queueBattleEnd('win');
    this.renderer.gpConnected = (this.input?.gamepadIndex ?? -1) >= 0;
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
      alert: this.alertTimer > 0 ? this.alertText : null,
      noFlash: this.isNoFlash()
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
    if (relics.includes('set_goldhand')) player.push(`${getLang() === 'ja' ? '金貨' : getLang() === 'en' ? 'GOLD' : '금화'}+${Math.round(Math.min(1, this.run.gold / 200) * 100)}%`);
    if (relics.includes('set_overload')) player.push(getLang() === 'ja' ? '過負荷' : getLang() === 'en' ? 'OVERLOAD' : '과부하');
    if (relics.includes('set_abszero') && this.enemySlowTimer > 0) player.push(getLang() === 'ja' ? '絶対零度' : getLang() === 'en' ? 'ABS ZERO' : '절대영도');
    if (relics.includes('set_sanctuary')) player.push(getLang() === 'ja' ? '聖域' : getLang() === 'en' ? 'SANCTUARY' : '성소');
    const ch = this.challengeStatus();
    if (ch) player.unshift(`${ui('challenge')} ${ch.text}`);
    return { player, enemy };
  }

  challengeStatus() {
    const c = this.activeChallenge;
    if (!c) return null;
    const fail = getLang() === 'ja' ? '失敗' : getLang() === 'en' ? 'fail' : '실패';
    const keep = getLang() === 'ja' ? '維持' : getLang() === 'en' ? 'ok' : '유지';
    const label = trChallengeLabel(c, c.label);
    if (c.id === 'noHold') return { ok: !this.battleUsedHold, grade: 'great', text: `${label}(${this.battleUsedHold ? fail : keep})` };
    if (c.id === 'noSkill') return { ok: !this.battleUsedSkill, grade: 'great', text: `${label}(${this.battleUsedSkill ? fail : keep})` };
    if (c.id === 'noHardDrop') return { ok: !this.battleUsedHardDrop, grade: 'great', text: `${label}(${this.battleUsedHardDrop ? fail : keep})` };
    if (c.id === 'cwOnly') return { ok: !this.battleUsedCounterClockwise, grade: 'great', text: `${label}(${this.battleUsedCounterClockwise ? fail : keep})` };
    if (c.id === 'ccwOnly') return { ok: !this.battleUsedClockwise, grade: 'great', text: `${label}(${this.battleUsedClockwise ? fail : keep})` };
    if (c.id === 'timeAttack') {
      const great = this.battleElapsedSec <= c.params.limit;
      const ok = c.paramsOk ? this.battleElapsedSec <= c.paramsOk.limit : great;
      const grade = great ? 'great' : ok ? 'ok' : null;
      return { ok: !!grade, grade, text: `${getLang() === 'ja' ? 'タイムアタック' : getLang() === 'en' ? 'Time Attack' : label} ${Math.floor(this.battleElapsedSec)}/${c.params.limit}s` };
    }
    if (c.id === 'clearLines') {
      const great = this.battlePlayerClearedLines >= c.params.target;
      const ok = c.paramsOk ? this.battlePlayerClearedLines >= c.paramsOk.target : great;
      const grade = great ? 'great' : ok ? 'ok' : null;
      return { ok: !!grade, grade, text: `${getLang() === 'ja' ? 'ラインラッシュ' : getLang() === 'en' ? 'Line Rush' : label} ${this.battlePlayerClearedLines}/${c.params.target}${getLang() === 'ja' ? '行' : getLang() === 'en' ? ' lines' : '줄'}` };
    }
    return null;
  }

  grantChallengeReward(reward) {
    if (!reward) return '';
    const gf = this.currentAscMod().goldFactor ?? 1.0;
    if (reward.kind === 'gold') this.run.gold += Math.round(reward.amount * gf);
    else if (reward.kind === 'relic') { if (!this.run.relics.includes(reward.id)) this.run.relics.push(reward.id); else this.run.gold += Math.round(40 * gf); }
    else if (reward.kind === 'consumable') { if (this.run.consumables.length < 3) this.run.consumables.push(reward.id); else this.run.gold += Math.round(20 * gf); }
    else if (reward.kind === 'skill') {
      if (!this.run.ownedSkills.includes(reward.id)) {
        this.run.ownedSkills.push(reward.id);
        if (this.run.equippedSkills.length < 3) this.run.equippedSkills.push(reward.id);
      } else this.run.gold += Math.round(30 * gf);
    }
    return trRewardLabel(reward, reward.label);
  }

  resolveEnemyStep() {
    if (this.enemyForceDropTimer > 0 && this.enemy?.current && !this.enemy.defeated) {
      const result = this.ai.step(this.enemy);
      if (result) {
        this.enemyForceDropSteps = 0;
        this.enemyActionStall = 0;
        return result;
      }
      this.enemyForceDropSteps = (this.enemyForceDropSteps || 0) + 1;
      if (this.enemyForceDropSteps >= 3) {
        this.enemyForceDropSteps = 0;
        this.ai.queue = [];
        return this.enemy.hardDrop();
      }
      return null;
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
        const lockResult = this.player.lock();
        if (this.solo) this.resolveSolo(lockResult);
        else this.resolve(lockResult, this.player);
        return;
      }
      this.lockTimer += dt;
      if (this.lockTimer >= this.currentLockDelay()) {
        this.lockTimer = 0;
        this.lockResets = 0;
        this.groundTouched = false;
        const lockResult = this.player.lock();
        if (this.solo) this.resolveSolo(lockResult);
        else this.resolve(lockResult, this.player);
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
    this.audio.playSfx('enemySkill');
    cfg.cast(this);
  }

  updateBossOverload(dt) {
    this.bossOverloadCharge += dt;
    const chargeTime = Math.max(14000, 20000 - this.battleElapsedSec * 70);
    if (this.bossOverloadCharge < chargeTime) return;
    if ((this.enemy?.mp || 0) < 50) return;
    this.bossOverloadCharge = 0;
    this.enemy.mp = Math.max(0, this.enemy.mp - 50);
    this.audio.playSfx('enemySkill');
    this.castBossDebuff();
  }

  // ===== VS 모드 =====

  showVsSelect() {
    this.show('vsSelectScreen');
    const relayBest = localStorage.getItem('bbs.vs.relay.record');
    const el = document.getElementById('rec-vs-relay');
    if (el) el.textContent = relayBest ? `최고: ${relayBest}킬` : '기록 없음';
  }

  _refreshNoFlashBtn() {
    const btn = document.getElementById('noFlashToggleBtn');
    if (!btn) return;
    const on = localStorage.getItem('bbs.settings.noFlash') === '1';
    btn.textContent = on ? 'ON' : 'OFF';
    btn.classList.toggle('active', on);
  }

  isNoFlash() {
    return localStorage.getItem('bbs.settings.noFlash') === '1';
  }

  startVsMode(mode, difficulty = 1) {
    this.vs = { mode, difficulty, wins: [0, 0], game: 1, relayKills: 0, ended: false };
    this._vsGameEndHandled = false;
    this._startVsGame();
  }

  _makeVsDummyRun() {
    return {
      relics: [], consumables: [], equippedSkills: [],
      ownedSkills: [], gold: 0, round: 1, hpRows: 20,
      deckCount: () => 21, persistentGrid: null, practiceMode: false
    };
  }

  _startVsGame() {
    this.clearBattleTimeouts();
    this.vs.ended = false;
    this._vsGameEndHandled = false;
    const { mode, difficulty } = this.vs;

    // Build enemy card
    const seed = Date.now();
    if (mode === 'relay') {
      const firstEnemy = makeEnemy(1);
      this.enemyCard = { ...firstEnemy, vsMode: true, rewardGold: 0, startingRows: 20 };
    } else {
      const speeds = [280, 200, 140];
      this.enemyCard = {
        type: 'normal', name: 'VS 배틀', aiProfile: 'balanced',
        speed: speeds[difficulty] ?? 200, mirror: false, ability: null,
        rewardGold: 0, rewardPool: 'normal', startingRows: 20,
        startingGarbage: 0, deckExtras: [], vsMode: true
      };
    }

    // Build decks
    const playerDeck = mode === 'random' ? this.makeRandomDeck(seed) : new Deck();
    const enemyDeckCards = mode === 'relay' ? (this.enemyCard.deckExtras || []) : (mode === 'random' ? [] : []);
    const enemyDeck = mode === 'random' ? this.makeRandomDeck((seed ^ 0xdeadbeef) >>> 0) : new Deck(enemyDeckCards);

    this.player = new Board({ rows: 20, deck: playerDeck });
    this.player.delaysGarbageOnClear = true;
    this.player.onGarbageLanded = () => this.input.vibrate('garbage');
    this.enemy = new Board({ rows: 20, deck: enemyDeck });
    this.enemy.delaysGarbageOnClear = false;
    if (mode === 'relay' && this.enemyCard.startingGarbage > 0) {
      this.enemy.receiveGarbage(Math.min(this.enemyCard.startingGarbage, 5));
      for (const entry of this.enemy.garbageEntries) { entry.timer = 0; entry.instant = true; }
    }

    this.ai = mode === 'relay'
      ? new AI(this.enemyCard.aiProfile || 'balanced', this.enemyCard.aiSkill || {})
      : new AI('balanced', {}, difficulty);

    // Reset all battle state
    this.fallTimer = 0; this.lockTimer = 0; this.lockResets = 0; this.groundTouched = false;
    this.enemyTimer = 0; this.enemyActionStall = 0; this.enemyAbilityTimer = 0;
    this.enemyAbilitySuppressTimer = 0; this.gaugeStallTimer = 0; this.playerGaugeRushTimer = 0;
    this.enemySlowTimer = 0; this.enemyStunTimer = 0; this.playerSlowTimer = 0;
    this.battleClearedLines = 0; this.battlePlayerClearedLines = 0;
    this.battlePlayerPieces = 0; this.battlePlayerAttacks = 0;
    this.battleEnemyPieces = 0; this.battleEnemyAttacks = 0; this.battleElapsedSec = 0;
    this.aiFocusActivations = 0; this.aiFocusInEpisode = false;
    this.battleEndDelay = 0; this.battleEndResult = null;
    this.playerFreezeTimer = 0; this.playerFogTimer = 0; this.playerHyperTimer = 0;
    this.playerInvertTimer = 0; this.enemyForceDropTimer = 0;
    this.bossOverloadCharge = 0; this.bossRhythmSent = 0; this.bossRhythmRestTimer = 0;
    this.enemyDebuffs = {}; this.playerDebuffs = {};
    this.battleUsedHold = false; this.battleUsedSkill = false; this.battleUsedHardDrop = false;
    this.battleUsedCounterClockwise = false; this.battleUsedClockwise = false;
    this.battleMaxSingleAttack = 0; this.battleMaxExplodeCells = 0; this.battleMaxManaGain = 0;
    this.battleTotalSlow = 0; this.battleBountyGold = 0; this.battleWardCanceled = 0;
    this.battleMaxCombo = 0; this.activeChallenge = null; this.challengeRewarded = false;
    this.paused = false; this.autoSaveTimer = 0; this.skillCooldowns = {};
    this.message = 'VS 배틀'; this.alertText = ''; this.alertTimer = 0;
    this.battleFirstClearUsed = false; this.bountyBank = 0;

    this.run = this._makeVsDummyRun();

    const modeName = { normal: '일반 배틀', random: '랜덤 배틀', relay: '이어달리기' }[mode] || 'VS';
    const seriesLabel = mode === 'relay' ? `${this.vs.relayKills}킬` : `게임 ${this.vs.game} · ${this.vs.wins[0]}:${this.vs.wins[1]}`;
    document.getElementById('battleTitle').textContent = 'VS 모드';
    document.getElementById('battleMeta').textContent = `${modeName} · ${seriesLabel}`;
    this.renderTouchSlots();
    this.renderer.resize(this.player.rows, this.enemy.rows);
    this.show('gameScreen');
  }

  makePureDeck() {
    // Standard 7-bag × 3 deck, base cards have no abilities (abilityId: 'none')
    return new Deck();
  }

  makeRandomDeck(seed) {
    const SHAPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const allCards = Object.values(CARD_LIBRARY);
    let rng = (seed >>> 0);
    const rand = () => {
      rng = ((Math.imul(rng, 1664525) + 1013904223) >>> 0);
      return rng / 0x100000000;
    };
    const cards = [];
    for (let r = 0; r < 3; r++) {
      for (const s of SHAPES) {
        const baseCard = CARD_LIBRARY[s];
        const donor = allCards[Math.floor(rand() * allCards.length)];
        const ability = ABILITY_LIBRARY[donor.abilityId] || ABILITY_LIBRARY.none;
        const exactCard = allCards.find(c => c.shapeId === s && c.abilityId === ability.id);
        const cardName = exactCard ? exactCard.name
          : ability.id === 'none' ? (baseCard.name || s)
          : `${ability.name} ${baseCard.shapeName || s}`;
        cards.push({
          id: `rnd_${s}_${r}`,
          name: cardName,
          shapeId: s,
          shapeName: baseCard.shapeName,
          abilityId: ability.id,
          abilityName: ability.name,
          cellCount: baseCard.cellCount,
          shape: baseCard.shape,
          cellAttack: ability.cellAttack,
          traits: [...ability.traits],
          onPlace: ability.onPlace ? { ...ability.onPlace } : null,
          penalty: !!ability.penalty,
          fuse: ability.fuse || 0,
          exhaust: false,
          rarity: 'base',
          tier: 'bronze'
        });
      }
    }
    return new VsDeck(cards);
  }

  _handleVsGameEnd(playerWon) {
    if (!this.vs) return;
    if (playerWon) this.vs.wins[0]++;
    else this.vs.wins[1]++;

    if (this.vs.mode === 'relay') {
      if (playerWon) {
        this.vs.relayKills++;
        this._relayKillReward();
        setTimeout(() => this._startNextRelayEnemy(), 800);
      } else {
        this.vs.ended = true;
        const best = parseInt(localStorage.getItem('bbs.vs.relay.record') || '0', 10);
        if (this.vs.relayKills > best) {
          localStorage.setItem('bbs.vs.relay.record', String(this.vs.relayKills));
        }
        this._showVsResult(false);
      }
      return;
    }

    // Series mode (best-of-3)
    const [pw, ew] = this.vs.wins;
    if (pw >= 2 || ew >= 2) {
      this.vs.ended = true;
      this._showVsResult(pw >= 2);
    } else {
      this.vs.game++;
      this._showVsInterGame(playerWon);
    }
  }

  _relayKillReward() {
    const kills = this.vs.relayKills;
    const EXCLUDED_RELICS = new Set(['merchant_token', 'warehouse_key', 'greed', 'bounty_market', 'set_goldhand', 'instant_gauge']);

    // 매 킬: 랜덤 특수 카드
    const specialCards = Object.values(CARD_LIBRARY).filter(c => c.abilityId && c.abilityId !== 'none');
    if (specialCards.length) {
      const card = specialCards[Math.floor(Math.random() * specialCards.length)];
      this.player.deck.addCard(card.id);
      this.showToast(`🃏 카드 획득: ${card.name}`, 'normal', 2500);
    }

    // 매 킬: 랜덤 소모품
    const consIds = Object.keys(CONSUMABLES);
    if (consIds.length && this.run.consumables.length < 3) {
      const consId = consIds[Math.floor(Math.random() * consIds.length)];
      this.run.consumables.push(consId);
      this.renderTouchSlots();
      this.showToast(`💊 소모품 획득: ${CONSUMABLES[consId]?.name || consId}`, 'normal', 2500);
    }

    // 1킬, 3킬, 5킬... (홀수 킬): 랜덤 스킬
    if (kills === 1 || (kills > 1 && (kills - 1) % 2 === 0)) {
      const skillIds = Object.keys(SKILLS);
      const available = skillIds.filter(id => !this.run.ownedSkills.includes(id));
      if (available.length) {
        const skillId = available[Math.floor(Math.random() * available.length)];
        this.run.ownedSkills.push(skillId);
        if (this.run.equippedSkills.length < 3) {
          this.run.equippedSkills.push(skillId);
          this.renderTouchSlots();
        }
        this.showToast(`✨ 스킬 획득: ${SKILLS[skillId]?.name || skillId}`, 'elite', 3000);
      }
    }

    // 3킬마다: 전투용 유물
    if (kills % 3 === 0) {
      const relicIds = Object.keys(RELICS).filter(id => !EXCLUDED_RELICS.has(id) && !this.run.relics.includes(id));
      if (relicIds.length) {
        const relicId = relicIds[Math.floor(Math.random() * relicIds.length)];
        this.run.relics.push(relicId);
        this.showToast(`🎁 유물 획득: ${RELICS[relicId]?.name || relicId}`, 'elite', 3500);
      }
    }
  }

  _startNextRelayEnemy() {
    if (!this.vs || this.vs.ended) return;
    const kills = this.vs.relayKills;
    const isElite = kills > 0 && kills % 5 === 0;
    const round = Math.min(kills + 1, 18);
    const nextEnemy = makeEnemy(round, isElite);
    this.enemyCard = { ...nextEnemy, vsMode: true, rewardGold: 0, startingRows: 20 };
    this.enemy = new Board({ rows: 20, deck: new Deck(nextEnemy.deckExtras || []) });
    this.enemy.delaysGarbageOnClear = false;
    if (nextEnemy.startingGarbage > 0) {
      this.enemy.receiveGarbage(Math.min(nextEnemy.startingGarbage, 6));
      for (const entry of this.enemy.garbageEntries) { entry.timer = 0; entry.instant = true; }
    }
    this.ai = new AI(nextEnemy.aiProfile || 'balanced', nextEnemy.aiSkill || {});
    this._vsGameEndHandled = false;
    this.battleEndResult = null;
    this.battleEndDelay = 0;
    this.enemyTimer = 0; this.enemyActionStall = 0; this.enemyAbilityTimer = 0;
    this.enemyAbilitySuppressTimer = 0; this.enemySlowTimer = 0; this.enemyStunTimer = 0;
    this.enemyForceDropTimer = 0; this.bossOverloadCharge = 0;
    this.bossRhythmSent = 0; this.bossRhythmRestTimer = 0;
    this.enemyDebuffs = {}; this.battleEnemyPieces = 0; this.battleEnemyAttacks = 0;
    this.aiFocusActivations = 0; this.aiFocusInEpisode = false;
    this.message = `${kills}킬! 다음 적 등장`;
    document.getElementById('battleMeta').textContent = `이어달리기 · ${kills}킬`;
    this.renderer.resize(this.player.rows, this.enemy.rows);
    const typeLabel = isElite ? '⭐ 엘리트' : '⚔️';
    this.showToast(`${typeLabel} ${kills}번째 적: ${nextEnemy.name}`, 'elite', 3500);
  }

  _showVsInterGame(playerWon) {
    const modal = document.createElement('div');
    modal.className = 'deck-modal active';
    modal.innerHTML = `
      <div class="deck-modal-inner">
        <h3>라운드 ${this.vs.game - 1} — ${playerWon ? '승리 🎉' : '패배 💀'}</h3>
        <p style="color:#d7e5ff;font-size:22px;margin:10px 0">${this.vs.wins[0]} : ${this.vs.wins[1]}</p>
        <button class="ghost" id="vsNextGameBtn">다음 게임 →</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('vsNextGameBtn').addEventListener('click', () => {
      modal.remove();
      this._startVsGame();
    });
  }

  _showVsResult(playerWon) {
    const modal = document.createElement('div');
    modal.className = 'deck-modal active';
    const label = this.vs.mode === 'relay'
      ? `이어달리기 종료 · ${this.vs.relayKills}킬`
      : `시리즈 ${playerWon ? '승리' : '패배'} (${this.vs.wins[0]}:${this.vs.wins[1]})`;
    modal.innerHTML = `
      <div class="deck-modal-inner">
        <h3>${playerWon ? '🏆 승리!' : '💀 패배'}</h3>
        <p style="color:#d7e5ff;margin:8px 0">${label}</p>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="ghost" id="vsRetryBtn">다시 하기</button>
          <button class="ghost" id="vsMenuBtn">VS 메뉴</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('vsRetryBtn').addEventListener('click', () => {
      modal.remove();
      this.startVsMode(this.vs.mode, this.vs.difficulty);
    });
    document.getElementById('vsMenuBtn').addEventListener('click', () => {
      modal.remove();
      this.vs = null;
      this.player = null;
      this.enemy = null;
      this.run = new RunState();
      this.showVsSelect();
    });
  }

  castBossDebuff() {
    const name = trEnemyName(this.enemyCard, this.enemyCard?.name);
    const kinds = ['fog', 'invert', 'rotate', 'hyper', 'slow', 'garbage'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'fog') {
      this.playerFogTimer = 4000;
      this.flashAlert(`${name} OVERLOAD: ${getLang() === 'ja' ? '霧' : getLang() === 'en' ? 'Fog' : '안개'} (4s)`);
    } else if (kind === 'invert') {
      this.playerInvertTimer = 3500;
      this.flashAlert(`${name} OVERLOAD: ${getLang() === 'ja' ? '左右反転' : getLang() === 'en' ? 'Invert controls' : '좌우 반전'} (3.5s)`);
    } else if (kind === 'rotate') {
      this.player.rotateLocked = true;
      this.applyPlayerDebuff('rotate', 3000);
      const target = this.player;
      this.scheduleBattleTimeout(() => { if (this.player === target) target.rotateLocked = false; }, 3000);
      this.flashAlert(`${name} OVERLOAD: ${trAbilityName('rotateLockPlayer', '회전 봉인')} (3s)`);
    } else if (kind === 'hyper') {
      this.playerHyperTimer = 5000;
      this.flashAlert(`${name} OVERLOAD: ${trAbilityName('hyperBurst', '하이퍼 낙하')} (5s)`);
    } else if (kind === 'slow') {
      this.playerSlowTimer = 3500;
      this.flashAlert(`${name} OVERLOAD: ${trAbilityName('slowPlayer', '중력 둔화')} (3.5s)`);
    } else {
      this.player.addDurableGarbage(2, 2);
      this.flashAlert(`${name} OVERLOAD: ${getLang() === 'ja' ? '持続ゴミ2行' : getLang() === 'en' ? '2 durable garbage rows' : '지속 가비지 2줄'}`);
    }
  }
}

// VsDeck: wraps pre-built card objects for VS/random modes
class VsDeck {
  constructor(cardObjects) {
    this._all = [...cardObjects];
    this._byId = {};
    for (const c of cardObjects) this._byId[c.id] = c;
    this.draw = [...cardObjects.map(c => c.id)];
    this.discard = [];
    this.extraCards = [];
    this.removedBase = [];
    this._vshuffle(this.draw);
  }
  _vshuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  refill() {
    this.draw = [...this._all.map(c => c.id)];
    this.discard = [];
    this._vshuffle(this.draw);
  }
  beginBattle() { this.battleExhausted = new Set(); }
  size() { return this.draw.length + this.discard.length; }
  next() {
    if (!this.draw.length) this.refill();
    const id = this.draw.shift();
    this.discard.push(id);
    return this._byId[id];
  }
  preview(n = 3) {
    while (this.draw.length < n) this.refill();
    return this.draw.slice(0, n).map(id => this._byId[id]);
  }
  addCard() {}
  removeCard() { return false; }
  pollute() {}
  toState() { return { extraCards: [], removedBase: [], draw: [...this.draw], discard: [...this.discard] }; }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260829-vs1').catch(() => {});
  });
}
