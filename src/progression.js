import { BASE_TYPES, CARD_DESCRIPTIONS, CARD_LIBRARY, DEFAULT_ROWS, MAX_ROUND, SET_DEFINITIONS, SET_LABELS, SET_RELICS, TIER_LABELS, TIER_ORDER, TIERS, TYPES } from './constants.js?v=20260524-audio4';
import { Deck, shuffle } from './deck.js?v=20260524-audio4';
import { SKILLS } from './skills.js?v=20260524-audio4';
import { CONSUMABLES } from './consumables.js?v=20260524-audio4';
import { wrapDataMap } from "./i18n-data.js?v=20260524-audio4";

const RELICS_KO = {
  combo_amp: {
    id: 'combo_amp',
    icon: '🔥',
    name: '콤보 증폭기',
    tier: TIERS.GOLD,
    desc: '2콤보 이상 시 공격력이 25% 증가합니다.'
  },
  mana_lens: {
    id: 'mana_lens',
    icon: '🔷',
    name: '마나 렌즈',
    tier: TIERS.SILVER,
    desc: '라인 클리어 후 기본 마나 회복량의 35%를 추가 회복합니다.'
  },
  garbage_buffer: {
    id: 'garbage_buffer',
    icon: '🧱',
    name: '쓰레기 완충기',
    tier: TIERS.GOLD,
    desc: '적의 공격이 명중할 때마다 쓰레기가 1줄 줄어듭니다.'
  },
  hold_cache: {
    id: 'hold_cache',
    icon: '📥',
    name: '홀드 캐시',
    tier: TIERS.BRONZE,
    desc: '전투 중 홀드 슬롯이 비어있으면 마나 회복량이 50% 증가합니다.'
  },
  steel_heart: {
    id: 'steel_heart',
    icon: '🛡️',
    name: '강철 심장',
    tier: TIERS.SILVER,
    desc: '전투를 시작할 때마다 최대 HP(필드 높이)가 1 증가합니다.'
  },
  natural_heal: {
    id: 'natural_heal',
    icon: '💚',
    name: '자연 치유',
    tier: TIERS.SILVER,
    desc: '전투를 시작할 때마다 내 쓰레기 2줄을 정화합니다.'
  },
  first_strike: {
    id: 'first_strike',
    icon: '🥇',
    name: '첫수 보너스',
    tier: TIERS.SILVER,
    desc: '매 전투의 첫 라인 클리어 공격력이 3배가 됩니다.'
  },
  merchant_token: {
    id: 'merchant_token',
    icon: '🏷️',
    name: '상인의 증표',
    tier: TIERS.GOLD,
    desc: '상점 물품 가격이 25% 저렴해집니다.'
  },
  warehouse_key: {
    id: 'warehouse_key',
    icon: '🔑',
    name: '창고지기의 열쇠',
    tier: TIERS.GOLD,
    desc: '상점에서 물건을 구매하면 같은 종류의 새 물건으로 무한 재입고됩니다.'
  },
  phoenix_feather: {
    id: 'phoenix_feather',
    icon: '🐦‍🔥',
    name: '불사조 깃털',
    tier: TIERS.GOLD,
    desc: '쓰러질 위기에 처하면 모든 쓰레기 줄을 제거하고 한 번 버팁니다. (전투 무관 1회용)'
  },
  greed: {
    id: 'greed',
    icon: '💰',
    name: '욕심쟁이',
    tier: TIERS.BRONZE,
    desc: '전투 승리 보상 골드가 20% 증가합니다.'
  },
  first_aid: {
    id: 'first_aid',
    icon: '🚑',
    name: '응급 처치',
    tier: TIERS.GOLD,
    desc: '내 필드에 쓰레기가 6줄 이상 쌓여 있으면 공격력이 30% 증가합니다.'
  },
  combo_keeper: {
    id: 'combo_keeper',
    icon: '🔗',
    name: '콤보 보존',
    tier: TIERS.GOLD,
    desc: '한 번의 미스로는 콤보가 끊기지 않습니다(다음 클리어 시 재충전).'
  },
  mana_surge: {
    id: 'mana_surge',
    icon: '🔋',
    name: '마나 과급',
    tier: TIERS.SILVER,
    desc: '최대 MP가 100에서 120으로 증가합니다.'
  },
  chain_reactor: {
    id: 'chain_reactor',
    icon: '💥',
    name: '연쇄 반응로',
    tier: TIERS.GOLD,
    desc: '폭발이 범위 내의 다른 폭탄·시한폭탄을 연쇄로 터뜨립니다.'
  },
  bounty_market: {
    id: 'bounty_market',
    icon: '🪙',
    name: '현상금 거래소',
    tier: TIERS.GOLD,
    desc: '현상금 블록으로 얻는 골드가 2배가 됩니다.'
  },
  preservation_seal: {
    id: 'preservation_seal',
    icon: '🔏',
    name: '소멸 봉인',
    tier: TIERS.GOLD,
    desc: '소멸/1회용 블록이 소멸되지 않고 계속 덱에 남습니다.'
  },
  alchemy_core: {
    id: 'alchemy_core',
    icon: '⚗️',
    name: '연금술 핵',
    tier: TIERS.DIAMOND,
    desc: '획득 즉시 내 덱의 기본 블록을 각각 랜덤한 특수 블록으로 변환합니다.'
  },
  set_overload: {
    id: 'set_overload',
    icon: '⚡',
    name: '과부하 코어',
    tier: TIERS.DIAMOND,
    desc: '[파워 세트] 한 클리어의 공격력이 2 이상이면 +1 추가 피해(상쇄에 밀리지 않도록 공격력 기준).'
  },
  set_blastcap: {
    id: 'set_blastcap',
    icon: '💣',
    name: '대폭발 신관',
    tier: TIERS.DIAMOND,
    desc: '[봄브 세트] 모든 폭발 반경이 +1 증가합니다.'
  },
  set_manawell: {
    id: 'set_manawell',
    icon: '🌊',
    name: '마나 우물',
    tier: TIERS.DIAMOND,
    desc: '[마나 세트] 모든 스킬 쿨타임이 50% 감소합니다.'
  },
  set_sanctuary: {
    id: 'set_sanctuary',
    icon: '✨',
    name: '정화의 성소',
    tier: TIERS.DIAMOND,
    desc: '[클렌즈 세트] 쓰레기 줄을 정화할 때마다 공격력 +0.5.'
  },
  set_abszero: {
    id: 'set_abszero',
    icon: '❄️',
    name: '절대영도',
    tier: TIERS.DIAMOND,
    desc: '[냉각 세트] 냉각 둔화 지속 2배. 둔화 중 내 공격 +1, 받는 피해 -1.'
  },
  set_goldhand: {
    id: 'set_goldhand',
    icon: '🤚',
    name: '황금의 손',
    tier: TIERS.DIAMOND,
    desc: '[현상금 세트] 보유 골드에 비례해 적에게 주는 피해 강화(200골드에서 최대 +100%, 골드를 쓰면 그만큼 감소).'
  },
  set_bulwark: {
    id: 'set_bulwark',
    icon: '🛡️',
    name: '철벽 장막',
    tier: TIERS.DIAMOND,
    desc: '[차단 세트] 받는 공격이 게이지에서 빨간색(도착)으로 바뀌는 시간 +2초, 파란색→빨간색 전환 시간도 +2초.'
  },
  ward_delay: {
    id: 'ward_delay',
    icon: '⏳',
    name: '지연 장막',
    tier: TIERS.SILVER,
    desc: '받는 공격이 게이지에서 빨간색(도착)으로 바뀌는 시간이 1초 늘어납니다.'
  },
  set_comboengine: {
    id: 'set_comboengine',
    icon: '🧮',
    name: '콤보 엔진',
    tier: TIERS.DIAMOND,
    desc: '[콤보 세트] 콤보 공격 배수 증가폭이 강화됩니다.'
  },
  foresight: {
    id: 'foresight',
    icon: '👁️',
    name: '예지의 눈',
    tier: TIERS.SILVER,
    desc: '다음 블록 미리보기가 3개에서 5개로 늘어납니다.'
  },
  frost_lock: {
    id: 'frost_lock',
    icon: '🥶',
    name: '성에 자물쇠',
    tier: TIERS.GOLD,
    desc: '적이 이미 둔화 중일 때 새로 적용되는 둔화 시간의 50%만큼 적이 행동을 멈춥니다(스턴).'
  },
  charge_capacitor: {
    id: 'charge_capacitor',
    icon: '⚡',
    name: '전하 축전기',
    tier: TIERS.GOLD,
    desc: '콤보 차지 최대 누적이 3에서 5로 증가하고, 소모 후 절반(내림)이 잔류합니다.'
  },
  instant_gauge: {
    id: 'instant_gauge',
    icon: '🔴',
    name: '즉각 경보',
    tier: TIERS.GOLD,
    desc: '받는 공격 게이지가 즉시 빨간색이 됩니다(지연 없음). 라인 클리어로 파란색으로 되돌릴 수 없습니다. 대신 한 번에 받는 최대 쓰레기는 3줄로 제한됩니다.'
  }
};
export const RELICS = wrapDataMap(RELICS_KO, "relic");

const PROFILE_ICON = {
  balanced: '⚖️', fast: '⚡', opener: '🚀', turtle: '🐢', spiker: '🔱',
  stacker: '🧱', aggro: '😡', cheese: '🤡', stride: '🏃', plonk: '💣',
  infds: '🌀', elite: '👑'
};

function enemyIcon(base, type) {
  if (type === 'boss') return '💀';
  if (base.mirror) return '🪞';
  if (type === 'elite') return '👑';
  return PROFILE_ICON[base.profile] || '👾';
}

const TIER_WEIGHTS = {
  [TIERS.BRONZE]: { bronze: 72, silver: 26, gold: 2 },
  [TIERS.SILVER]: { bronze: 24, silver: 56, gold: 20 },
  [TIERS.GOLD]: { bronze: 8, silver: 37, gold: 55 },
  elite: { bronze: 0, silver: 45, gold: 55 }
};

const SHOP_PRICE = {
  card: { bronze: 24, silver: 38, gold: 56 },
  skill: { bronze: 36, silver: 52, gold: 76 },
  consumable: { bronze: 16, silver: 25, gold: 36 },
  relic: { bronze: 48, silver: 72, gold: 104 },
  hp: { bronze: 45, silver: 55, gold: 68 }
};

export const BLOCK_UPGRADES = {
  [TYPES.I]: [TYPES.POWER_I, TYPES.BOMB_I, TYPES.COOLANT, TYPES.MANA_I, TYPES.WARD_I, TYPES.CLEANSE_I, TYPES.BOUNTY_I, TYPES.COMBO_I],
  [TYPES.J]: [TYPES.CLEANSE_J, TYPES.UNSTABLE, TYPES.COOLANT_J, TYPES.BOMB_J, TYPES.POWER_J, TYPES.MANA_J, TYPES.BOUNTY_J, TYPES.WARD_J, TYPES.COMBO_J],
  [TYPES.L]: [TYPES.MANA_L, TYPES.BOUNTY, TYPES.POWER_L, TYPES.BOMB_L, TYPES.CLEANSE_L, TYPES.COOLANT_L, TYPES.WARD_L, TYPES.COMBO_L],
  [TYPES.O]: [TYPES.BOMB, TYPES.PURGE_O, TYPES.LEAD, TYPES.TIMEBOMB, TYPES.BOUNTY_O, TYPES.MANA_O, TYPES.POWER_O, TYPES.COOLANT_O, TYPES.WARD_O, TYPES.COMBO_O],
  [TYPES.S]: [TYPES.POWER_S, TYPES.GLASS, TYPES.CLEANSE_S, TYPES.BOUNTY_S, TYPES.BOMB_S, TYPES.MANA_S, TYPES.COOLANT_S, TYPES.WARD_S, TYPES.COMBO_S],
  [TYPES.T]: [TYPES.POWER_T, TYPES.MANA_T, TYPES.COMBO_CHARGE, TYPES.WARD_T, TYPES.BOMB_T, TYPES.COOLANT_T, TYPES.CLEANSE_T, TYPES.BOUNTY_T],
  [TYPES.Z]: [TYPES.POWER_Z, TYPES.MANA_Z, TYPES.BOMB_Z, TYPES.CLEANSE_Z, TYPES.WARD_Z, TYPES.COOLANT_Z, TYPES.BOUNTY_Z, TYPES.COMBO_Z]
};

export class RunState {
  constructor() {
    this.round = 1;
    this.gold = 20;
    this.hpRows = DEFAULT_ROWS;
    this.deck = new Deck();
    this.persistentGrid = null;
    this.ownedSkills = [];
    this.equippedSkills = [];
    this.consumables = [];
    this.relics = [];
    this.visitedShops = new Set();
    this.shopStock = {};
    this.seenEvents = new Set();
    this.starterPicked = false;
    this.seenSets = new Set();
    this.gambleNext = null;
    this.practiceMode = false;
  }

  deckCount() {
    return this.deck.size();
  }
}

const ENEMIES = [
  { name: '소프트 스타터', tier: TIERS.BRONZE, style: '느린 스태커. 낮은 HP와 약한 압박.', profile: 'balanced', rows: -7, speed: 455, garbage: 0, risk: 0.72, rewardBonus: 0, openingRows: 12, aiSkill: { mistakeRate: 0.012, noise: 0, hesitateRate: 0.24, holdMistakeRate: 0.025 } },
  { name: '라인 헌터', tier: TIERS.BRONZE, style: '단일 클리어를 자주 하며 꾸준히 압박합니다.', profile: 'balanced', rows: -6, speed: 420, garbage: 0, risk: 0.98, rewardBonus: 1, openingRows: 13, ability: 'spike', aiSkill: { mistakeRate: 0.009, noise: 0, hesitateRate: 0.2, holdMistakeRate: 0.018 } },
  { name: '스피드 드론', tier: TIERS.SILVER, style: '매우 빠르지만 취약합니다. 스트레스가 심해 보상이 높습니다.', profile: 'fast', rows: -10, speed: 285, garbage: 0, risk: 1.62, rewardBonus: 8, openingRows: 10, ability: 'hyperBurst', aiSkill: { mistakeRate: 0.007, noise: 0, hesitateRate: 0.16, holdMistakeRate: 0.014 } },
  { name: '오프너 스크립트', tier: TIERS.SILVER, style: 'OPENER 패턴: 폭발적인 준비 오프닝, 매우 낮은 HP.', profile: 'opener', rows: -9, speed: 260, garbage: 0, risk: 1.82, rewardBonus: 10, openingRows: 11, minRound: 3, deckExtras: [TYPES.POWER_T], ability: 'power', aiSkill: { mistakeRate: 0.005, noise: 0, hesitateRate: 0.12, holdMistakeRate: 0.01 } },
  { name: '스트라이드 엔진', tier: TIERS.GOLD, style: 'STRIDE 패턴: 꾸준한 쿼드 및 스핀 압박.', profile: 'stride', rows: -2, speed: 340, garbage: 1, risk: 1.65, rewardBonus: 7, minRound: 6, deckExtras: [TYPES.POWER_I, TYPES.POWER_T], ability: 'rotateLockPlayer', aiSkill: { mistakeRate: 0.0015, noise: 0, hesitateRate: 0.1 } },
  { name: '플롱크 겜블러', tier: TIERS.GOLD, style: 'PLONK 패턴: 압박을 버티다가 폭발적 피해를 노립니다.', profile: 'plonk', rows: -4, speed: 360, garbage: 2, risk: 1.6, rewardBonus: 7, minRound: 7, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE], ability: 'spike', aiSkill: { mistakeRate: 0.002, noise: 0, hesitateRate: 0.12 } },
  { name: 'INF DS 쉘', tier: TIERS.SILVER, style: 'INF DS 패턴: 방어적 다운스태킹과 필드 정리.', profile: 'infds', rows: 3, speed: 450, garbage: 1, risk: 1.3, rewardBonus: 4, minRound: 8, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J, TYPES.INSTANT_GUARD], ability: 'polluteDeck', aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.15 } },
  { name: '봄브 어뎁트', tier: TIERS.SILVER, style: '중반부터 폭탄 블록을 추가합니다.', profile: 'balanced', rows: 0, speed: 445, garbage: 1, risk: 1.2, rewardBonus: 3, deckExtras: [TYPES.BOMB, TYPES.BOMB_I], ability: 'spike', aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.16 } },
  { name: '마나 도둑', tier: TIERS.SILVER, style: '주기적으로 플레이어를 느리게 하는 중반 캐스터.', profile: 'balanced', rows: 1, speed: 430, garbage: 1, risk: 1.3, rewardBonus: 4, deckExtras: [TYPES.MANA_L], ability: 'slowPlayer', aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.12 } },
  { name: '클렌즈 워든', tier: TIERS.GOLD, style: '클렌즈 블록을 사용하며 쓰레기 압박에 저항합니다.', profile: 'stacker', rows: 2, speed: 390, garbage: 2, risk: 1.45, rewardBonus: 5, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J], ability: 'polluteDeck', aiSkill: { mistakeRate: 0.001, noise: 0, hesitateRate: 0.09 } },
  { name: '광전사', tier: TIERS.SILVER, style: 'AGGRO 패턴: 지저분해도 빠르게 쌓아 끝없이 공격합니다.', profile: 'aggro', rows: -8, speed: 300, garbage: 0, risk: 1.7, rewardBonus: 8, minRound: 5, deckExtras: [TYPES.POWER_I, TYPES.POWER_Z, TYPES.UNSTABLE], ability: 'power', aiSkill: { mistakeRate: 0.006, noise: 0, hesitateRate: 0.14 } },
  { name: '방벽술사', tier: TIERS.SILVER, style: '차단 블록으로 게이지를 비우며 콤보 차지로 누적 압박합니다.', profile: 'stride', rows: 0, speed: 410, garbage: 1, risk: 1.35, rewardBonus: 5, minRound: 6, deckExtras: [TYPES.WARD_T, TYPES.COMBO_CHARGE], ability: 'spike', aiSkill: { mistakeRate: 0.004, noise: 0, hesitateRate: 0.13 } },
  { name: '재촉 드론', tier: TIERS.SILVER, style: '게이지 가속: 내 공격이 게이지에서 도착·전환되는 시간을 잠시 단축시켜 압박을 가속합니다.', profile: 'fast', rows: -8, speed: 320, garbage: 0, risk: 1.55, rewardBonus: 7, minRound: 7, ability: 'rushGauge', aiSkill: { mistakeRate: 0.006, noise: 0, hesitateRate: 0.15, holdMistakeRate: 0.013 } },
  { name: '폭파공', tier: TIERS.SILVER, style: '시한폭탄과 폭탄을 깔고 덱을 오염시킵니다.', profile: 'plonk', rows: -2, speed: 380, garbage: 1, risk: 1.5, rewardBonus: 6, minRound: 7, deckExtras: [TYPES.TIMEBOMB, TYPES.BOMB], ability: 'polluteDeck', aiSkill: { mistakeRate: 0.004, noise: 0, hesitateRate: 0.12 } },
  { name: '거북 수문장', tier: TIERS.GOLD, style: 'TURTLE 패턴: 구멍을 극도로 피하며 장기전으로 끕니다.', profile: 'turtle', rows: 4, speed: 430, garbage: 2, risk: 1.4, rewardBonus: 5, minRound: 8, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J, TYPES.COOLANT], ability: 'slowPlayer', aiSkill: { mistakeRate: 0.0025, noise: 0, hesitateRate: 0.1 } },
  { name: '유리 무희', tier: TIERS.GOLD, style: 'SPIKER 패턴: 우물을 파 쿼드 대량 폭발을 노립니다.', profile: 'spiker', rows: -3, speed: 320, garbage: 1, risk: 1.75, rewardBonus: 9, minRound: 9, deckExtras: [TYPES.GLASS, TYPES.POWER_S], ability: 'hyperBurst', aiSkill: { mistakeRate: 0.002, noise: 0, hesitateRate: 0.1 } },
  { name: '거울상', tier: TIERS.SILVER, style: 'MIRROR: 내 덱과 똑같은 블록을 내 낙하 속도에 맞춰 사용하는 도플갱어(스킬·유물·소모품은 없음).', profile: 'balanced', rows: -4, speed: 430, garbage: 0, risk: 1.5, rewardBonus: 7, minRound: 4, mirror: true, aiSkill: { mistakeRate: 0.006, noise: 0, hesitateRate: 0.14, holdMistakeRate: 0.012 } }
];

const ELITES = [
  { name: '엘리트: 천장 압박기', tier: TIERS.GOLD, style: '높은 HP, 초반 압박, 희귀 블록 보상.', profile: 'elite', rows: 5, speed: 310, garbage: 3, risk: 1.85, rewardBonus: 9, ability: 'spike' },
  { name: '엘리트: 파워 코어', tier: TIERS.GOLD, style: '다수의 파워 블록으로 큰 폭발 피해를 줍니다.', profile: 'fast', rows: 4, speed: 260, garbage: 2, risk: 2.05, rewardBonus: 13, deckExtras: [TYPES.POWER_I, TYPES.POWER_T, TYPES.POWER_S], ability: 'power' },
  { name: '엘리트: 크로스 엔진', tier: TIERS.GOLD, style: '특이한 모양, 높은 분산, 엘리트 보상.', profile: 'elite', rows: 6, speed: 300, garbage: 2, risk: 1.95, rewardBonus: 11, deckExtras: [TYPES.CROSS], ability: 'spike' },
  { name: '엘리트: 오프너 랩', tier: TIERS.GOLD, style: 'OPENER 엘리트: 매우 낮은 HP, 극도로 빠른 초반 폭발.', profile: 'opener', rows: -5, speed: 235, garbage: 1, risk: 2.25, rewardBonus: 16, minRound: 6, deckExtras: [TYPES.POWER_T, TYPES.POWER_I], ability: 'power' },
  { name: '엘리트: 플롱크 볼트', tier: TIERS.GOLD, style: 'PLONK 엘리트: 압박을 버티다가 강력하게 반격합니다.', profile: 'plonk', rows: 1, speed: 285, garbage: 4, risk: 2.1, rewardBonus: 14, minRound: 9, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE], ability: 'spike' },
  { name: '엘리트: 광란 코어', tier: TIERS.GOLD, style: 'AGGRO 엘리트: 멈추지 않는 극단 공격으로 몰아칩니다.', profile: 'aggro', rows: 3, speed: 250, garbage: 3, risk: 2.2, rewardBonus: 14, minRound: 7, deckExtras: [TYPES.POWER_I, TYPES.POWER_Z, TYPES.POWER_CROSS], ability: 'power' },
  { name: '엘리트: 중량 분쇄기', tier: TIERS.GOLD, style: '무거운 납 덱과 회전 봉인으로 짓누릅니다.', profile: 'stacker', rows: 5, speed: 300, garbage: 3, risk: 2.0, rewardBonus: 13, minRound: 9, deckExtras: [TYPES.LEAD, TYPES.POWER_CROSS], ability: 'rotateLockPlayer' },
  { name: '엘리트: 오염원', tier: TIERS.GOLD, style: 'CHEESE 엘리트: 변칙 압박과 지속 덱 오염을 겁니다.', profile: 'cheese', rows: 2, speed: 300, garbage: 3, risk: 2.05, rewardBonus: 14, minRound: 10, deckExtras: [TYPES.UNSTABLE, TYPES.BOMB_I], ability: 'polluteDeck' }
];

const BOSS = {
  name: '최종 보스: 오버로드 코어',
  tier: TIERS.GOLD,
  style: 'OVERLOAD: 게이지가 차면 안개·반전·회전봉인·하이퍼·둔화·지속 가비지를 무작위로 시전합니다.',
  profile: 'stride',
  rows: 7,
  speed: 300,
  garbage: 2,
  risk: 2.4,
  rewardBonus: 30,
  deckExtras: [TYPES.POWER_I, TYPES.POWER_T, TYPES.BOMB_I],
  ability: 'overload',
  aiSkill: { mistakeRate: 0.001, noise: 0, hesitateRate: 0.08 }
};

export function tierLabel(tier) {
  return TIER_LABELS[tier] || TIER_LABELS[TIERS.BRONZE];
}

function tierRank(tier) {
  return Math.max(0, TIER_ORDER.indexOf(tier));
}

function roundTier(round) {
  if (round >= 15) return TIERS.GOLD;
  if (round >= 6) return TIERS.SILVER;
  return TIERS.BRONZE;
}

function maxTier(a, b) {
  return TIER_ORDER[Math.max(tierRank(a), tierRank(b))] || TIERS.BRONZE;
}

function weightedTier(sourceTier, elite = false) {
  const weights = elite ? TIER_WEIGHTS.elite : TIER_WEIGHTS[sourceTier] || TIER_WEIGHTS[TIERS.BRONZE];
  const total = Object.values(weights).reduce((sum, n) => sum + n, 0);
  let roll = Math.random() * total;
  for (const tier of TIER_ORDER) {
    roll -= weights[tier] || 0;
    if (roll <= 0) return tier;
  }
  return TIERS.BRONZE;
}

function byTier(source, tier, { minTier = null } = {}) {
  const entries = Object.values(source).filter(item => item?.tier);
  if (minTier) return entries.filter(item => tierRank(item.tier) >= tierRank(minTier));
  return entries.filter(item => item.tier === tier);
}

function pickByTier(source, sourceTier, { elite = false, minTier = null, exclude = [] } = {}) {
  const excluded = new Set(exclude);
  for (let i = 0; i < 8; i++) {
    const tier = minTier ? maxTier(weightedTier(sourceTier, elite), minTier) : weightedTier(sourceTier, elite);
    const pool = byTier(source, tier, { minTier }).filter(item => !excluded.has(item.id));
    if (pool.length) return shuffle(pool)[0];
  }
  const fallback = Object.values(source).filter(item => item?.tier && !excluded.has(item.id) && (!minTier || tierRank(item.tier) >= tierRank(minTier)));
  return shuffle(fallback)[0];
}

function shopPrice(kind, tier) {
  return SHOP_PRICE[kind]?.[tier] || SHOP_PRICE[kind]?.bronze || 20;
}

function makeHpShopItem(tier) {
  const amount = 3 + Math.floor(Math.random() * 3);
  const price = Math.round(shopPrice('hp', tier) * amount / 5);
  return { kind: 'hp', amount, tier, title: `Max HP +${amount} rows`, price };
}

// 한 선택 세트에 패널티/즉발 카드가 각각 최대 1개만 등장하도록, 한 장 뽑힌 뒤 같은 계열의 나머지를 제외한다.
function categoryBlocklist(source, card) {
  const blocked = [];
  if (card.penalty) blocked.push(...Object.values(source).filter(c => c.penalty && c.id !== card.id).map(c => c.id));
  if (card.onPlace) blocked.push(...Object.values(source).filter(c => c.onPlace && c.id !== card.id).map(c => c.id));
  return blocked;
}

function isPlayerRewardCard(card) {
  return card.tier && card.rarity !== 'base' && card.rarity !== 'curse' && card.id !== TYPES.CROSS && !card.exhaust;
}

export function setProgress(run, ability) {
  const def = SET_DEFINITIONS[ability];
  if (!def) return null;
  const owned = new Set(run.deck.extraCards);
  const have = Object.values(def).filter(id => owned.has(id)).length;
  return { have, total: 7 };
}

export function abilityOf(cardId) {
  return CARD_LIBRARY[cardId]?.abilityId;
}

const REMOVABLE_SHAPE_ORDER = new Map(BASE_TYPES.map((id, index) => [CARD_LIBRARY[id]?.shapeId || id, index]));

function compareRemovableCards(a, b) {
  const ca = CARD_LIBRARY[a];
  const cb = CARD_LIBRARY[b];
  const shapeA = REMOVABLE_SHAPE_ORDER.get(ca?.shapeId) ?? 99;
  const shapeB = REMOVABLE_SHAPE_ORDER.get(cb?.shapeId) ?? 99;
  if (shapeA !== shapeB) return shapeA - shapeB;
  const baseA = BASE_TYPES.includes(a) ? 0 : 1;
  const baseB = BASE_TYPES.includes(b) ? 0 : 1;
  if (baseA !== baseB) return baseA - baseB;
  const tierA = TIER_ORDER[ca?.tier] ?? 99;
  const tierB = TIER_ORDER[cb?.tier] ?? 99;
  if (tierA !== tierB) return tierA - tierB;
  return (ca?.name || a).localeCompare(cb?.name || b, 'ko') || a.localeCompare(b);
}

export function completedAbilitySets(run) {
  const owned = new Set(run.deck.extraCards);
  return Object.keys(SET_DEFINITIONS).filter(ability =>
    Object.values(SET_DEFINITIONS[ability]).every(id => owned.has(id)));
}

// 세트/연금술 유물은 전용 경로(세트 완성·도박 체인)로만 획득 → 무작위 유물 풀에서 제외.
const EARNED_ONLY_RELICS = [...Object.values(SET_RELICS), 'alchemy_core'];
// 상점 전용 유물 → 전투 보상·도전과제·발굴·엘리트 보상 풀에서 제외, 상점에서만 등장.
const SHOP_ONLY_RELICS = ['instant_gauge'];

const GAMBLE_TIERS = {
  bronze: { gtier: 'bronze', tier: TIERS.BRONZE, bet: 20, reward: 60, chance: 0.55, title: '도박', desc: '20골드를 겁니다. 55% 확률로 60골드를 받고, 실패하면 잃습니다. (성공 시 다음 이벤트에 실버 도박 등장)' },
  silver: { gtier: 'silver', tier: TIERS.SILVER, bet: 40, reward: 130, chance: 0.45, title: '실버 도박', desc: '40골드를 겁니다. 45% 확률로 130골드. 성공 시 다음 이벤트에 골드 도박 등장. 안 하면 이후 도박이 사라집니다.' },
  gold: { gtier: 'gold', tier: TIERS.GOLD, bet: 80, reward: 220, chance: 0.4, title: '골드 도박', desc: '80골드를 겁니다. 40% 확률로 220골드 + 연금술 핵(유물). 안 하면 이후 도박이 사라집니다.' }
};

export function makeBoss(round) {
  const card = makeEnemy(round, true, BOSS);
  card.type = 'boss';
  card.icon = '💀';
  card.ability = 'overload';
  card.name = BOSS.name;
  card.style = BOSS.style;
  card.startingRows = Math.round(card.startingRows * 1.25);
  card.startingGarbage = card.startingGarbage + 1;
  card.rewardGold = Math.round(card.rewardGold * 1.4);
  return card;
}

export const CHALLENGES = {
  noHold: { id: 'noHold', label: '홀드 금지', desc: () => '홀드를 한 번도 쓰지 않고 승리' },
  noSkill: { id: 'noSkill', label: '스킬 금지', desc: () => '스킬을 한 번도 쓰지 않고 승리' },
  noHardDrop: { id: 'noHardDrop', label: '하드드랍 금지', desc: () => '하드드랍을 쓰지 않고 승리' },
  cwOnly: { id: 'cwOnly', label: '시계회전만', desc: () => '반시계 회전 없이 시계방향 회전만 써서 승리' },
  ccwOnly: { id: 'ccwOnly', label: '반시계회전만', desc: () => '시계 회전 없이 반시계 회전만 써서 승리' },
  timeAttack: { id: 'timeAttack', label: '타임어택', desc: p => `${p.limit}초 안에 승리` },
  clearLines: { id: 'clearLines', label: '라인 러시', desc: p => `이 전투에서 ${p.target}라인 이상 지우고 승리` }
};

function rollChallengeReward(round, ownedRelics = []) {
  const tier = roundTier(round);
  const roll = Math.random();
  if (roll < 0.4) {
    const amount = 30 + round * 4;
    return { kind: 'gold', amount, label: `골드 +${amount}`, detail: `전투 보상으로 ${amount}골드를 받습니다.` };
  }
  if (roll < 0.65) {
    const c = pickByTier(CONSUMABLES, tier);
    if (c) return { kind: 'consumable', id: c.id, label: `소모품 「${c.name}」`, detail: c.desc || '' };
    return { kind: 'gold', amount: 40, label: '골드 +40', detail: '전투 보상으로 40골드를 받습니다.' };
  }
  if (roll < 0.85) {
    const r = pickByTier(RELICS, tier, { exclude: [...ownedRelics, ...EARNED_ONLY_RELICS, ...SHOP_ONLY_RELICS] });
    if (r) return { kind: 'relic', id: r.id, label: `유물 「${RELICS[r.id].name}」`, detail: RELICS[r.id].desc || '' };
    return { kind: 'gold', amount: 50, label: '골드 +50', detail: '전투 보상으로 50골드를 받습니다.' };
  }
  const s = pickByTier(SKILLS, tier);
  if (s) return { kind: 'skill', id: s.id, label: `스킬 「${s.name}」 (MP ${s.cost})`, detail: s.desc || '' };
  return { kind: 'gold', amount: 50, label: '골드 +50', detail: '전투 보상으로 50골드를 받습니다.' };
}

export function makeChallenge(round, exclude = [], ownedRelics = []) {
  const ids = ['noHold', 'noSkill', 'noHardDrop', 'cwOnly', 'ccwOnly', 'timeAttack', 'clearLines'].filter(id => !exclude.includes(id));
  if (!ids.length) return null;
  const id = ids[Math.floor(Math.random() * ids.length)];
  const params = id === 'timeAttack' ? { limit: 40 + round * 2 }
    : id === 'clearLines' ? { target: Math.min(40, 14 + round) }
      : {};
  const tpl = CHALLENGES[id];
  return { id, label: tpl.label, cond: tpl.desc(params), params, reward: rollChallengeReward(round, ownedRelics) };
}

export function makeEnemyChoices(round, ownedRelics = []) {
  if (round === MAX_ROUND) return [makeBoss(round)];
  const count = round % 3 === 0 ? 3 : 2;
  const unlocked = ENEMIES.filter(enemy => !enemy.minRound || round >= enemy.minRound);
  const mirrorAllowed = Math.random() < 0.35;
  const normalCandidates = unlocked.filter(enemy => !enemy.mirror || mirrorAllowed);
  const normalPool = shuffle(round <= 2 ? normalCandidates.filter(enemy => ['소프트 스타터', '라인 헌터', '스피드 드론'].includes(enemy.name)) : round <= 5 ? normalCandidates.filter(enemy => !['마나 도둑', '클렌즈 워든'].includes(enemy.name)) : normalCandidates);
  const elitePool = shuffle(ELITES.filter(enemy => !enemy.minRound || round >= enemy.minRound));
  const eliteSlot = round >= 4 && Math.random() < 0.3 + round * 0.01;
  const choices = [];
  const usedChallengeIds = [];
  for (let i = 0; i < count; i++) {
    const elite = eliteSlot && i === count - 1;
    const base = elite ? elitePool.shift() : normalPool.shift();
    const challenge = (!elite && round >= 3 && Math.random() < 0.33) ? makeChallenge(round, usedChallengeIds, ownedRelics) : null;
    if (challenge) usedChallengeIds.push(challenge.id);
    choices.push(makeEnemy(round, elite, base, challenge, ownedRelics));
  }
  return choices;
}

export function makeEnemy(round, elite = false, selectedBase = null, preChallenge = undefined, ownedRelics = []) {
  const pool = elite ? ELITES : ENEMIES;
  const base = selectedBase || pool[Math.floor(Math.random() * pool.length)];
  const level = Math.max(1, round);
  const tier = round >= 16 ? 3 : round >= 11 ? 2 : round >= 6 ? 1 : 0;
  const risk = base.risk || 1;
  const rewardBase = elite ? 24 + level * 3 : 7 + level * 2;
  const rewardGold = Math.round(rewardBase + tier * (elite ? 9 : 5) + (base.rewardBonus || 0) + risk * (elite ? 5 : 3));
  const normalRows = round === 1
    ? base.openingRows || 13
    : DEFAULT_ROWS + (base.rows || 0) + Math.floor(level / 5) + tier * 2;
  const eliteRows = DEFAULT_ROWS + (base.rows || 0) + Math.floor(level / 3) + tier * 3;
  const startingGarbage = (base.garbage || 0) + Math.floor(level / 7) + tier + (elite ? 1 + tier : 0);
  const speed = Math.max(82, (base.speed || 430) - level * (elite ? 8 : 5) - tier * (elite ? 32 : 24));
  const baseSkill = base.aiSkill || {};
  const aiSkill = {
    mistakeRate: Math.max(0, (baseSkill.mistakeRate || 0) - level * 0.004 - tier * 0.012 - (elite ? 0.03 : 0)),
    noise: Math.max(0, (baseSkill.noise || 0) - level * 0.012 - tier * 0.04 - (elite ? 0.08 : 0)),
    hesitateRate: Math.max(0, (baseSkill.hesitateRate || 0) - level * 0.012 - tier * 0.035 - (elite ? 0.07 : 0)),
    holdMistakeRate: Math.max(0, (baseSkill.holdMistakeRate ?? (baseSkill.mistakeRate || 0) * 0.6) - level * 0.006 - tier * 0.018 - (elite ? 0.04 : 0))
  };
  const rewardTier = elite ? TIERS.GOLD : maxTier(base.tier || TIERS.BRONZE, roundTier(round));
  const mirror = !!base.mirror;
  const challenge = preChallenge !== undefined ? preChallenge : ((!elite && round >= 3 && Math.random() < 0.33) ? makeChallenge(round, [], ownedRelics) : null);
  const goldMult = challenge ? 0.9 : 1; // 도전과제 적은 일반 보상 골드가 약간 적다.
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: base.name,
    tier: rewardTier,
    style: base.style,
    aiProfile: base.profile,
    aiSkill,
    rewardGold: Math.round(rewardGold * goldMult),
    rewardPool: elite ? `elite:${rewardTier}` : rewardTier,
    startingRows: elite ? Math.max(18, eliteRows) : Math.max(round === 1 ? 10 : 12, normalRows),
    startingGarbage,
    speed,
    deckExtras: base.deckExtras || [],
    ability: round >= 4 || elite ? base.ability : null,
    mirror,
    challenge,
    icon: enemyIcon(base, elite ? 'elite' : 'normal')
  };
}

export function makeRewards(pool = 'normal') {
  const elite = String(pool).startsWith('elite');
  const sourceTier = String(pool).includes(TIERS.GOLD) ? TIERS.GOLD
    : String(pool).includes(TIERS.SILVER) ? TIERS.SILVER
      : pool === 'normal' ? TIERS.BRONZE : pool;
  const rewardCards = Object.fromEntries(Object.values(CARD_LIBRARY)
    .filter(isPlayerRewardCard)
    .map(card => [card.id, card]));
  const picked = [];
  const blocked = [];
  while (picked.length < 3) {
    const card = pickByTier(rewardCards, elite ? TIERS.GOLD : sourceTier, { elite, exclude: [...picked, ...blocked] });
    if (!card || picked.includes(card.id)) break;
    picked.push(card.id);
    blocked.push(...categoryBlocklist(rewardCards, card));
  }
  return picked.map(id => ({ kind: 'card', id, tier: CARD_LIBRARY[id].tier, title: 'Block reward' }));
}

export function makeShopItems(run) {
  const key = String(run.round);
  if (run.shopStock?.[key]?.items) return run.shopStock[key].items;
  const tier = roundTier(run.round);
  const rewardCards = Object.fromEntries(Object.values(CARD_LIBRARY)
    .filter(isPlayerRewardCard)
    .map(card => [card.id, card]));
  const cardItems = [];
  const blocked = [];
  while (cardItems.length < 4) {
    const card = pickByTier(rewardCards, tier, { exclude: [...cardItems, ...blocked] });
    if (!card || cardItems.includes(card.id)) break;
    cardItems.push(card.id);
    blocked.push(...categoryBlocklist(rewardCards, card));
  }
  const skill = pickByTier(SKILLS, tier, { exclude: run.ownedSkills });
  const consumable = pickByTier(CONSUMABLES, tier);
  const relic = pickByTier(RELICS, tier, { exclude: [...run.relics, ...EARNED_ONLY_RELICS] });
  const removable = removableDeckCards(run);
  const hpTier = tier;
  const items = [
    ...cardItems.map(id => ({ kind: 'card', id, tier: CARD_LIBRARY[id].tier, title: `Buy ${CARD_LIBRARY[id].name}`, price: shopPrice('card', CARD_LIBRARY[id].tier) })),
    makeHpShopItem(hpTier),
    ...(removable.length ? [{ kind: 'removeChoice', tier: TIERS.GOLD, title: '정밀 덱 수술', price: 56 }] : []),
    ...(skill ? [{ kind: 'skill', id: skill.id, tier: skill.tier, title: `Skill: ${SKILLS[skill.id].name} (MP ${SKILLS[skill.id].cost})`, price: shopPrice('skill', skill.tier) }] : []),
    ...(relic ? [{ kind: 'relic', id: relic.id, tier: relic.tier, title: `Relic: ${RELICS[relic.id].name}`, price: shopPrice('relic', relic.tier) }] : []),
    { kind: 'consumable', id: consumable.id, tier: consumable.tier, title: `Consumable: ${CONSUMABLES[consumable.id].name}`, price: shopPrice('consumable', consumable.tier) }
  ];
  if (run.shopStock) {
    const deal = items[Math.floor(Math.random() * items.length)];
    run.shopStock[key] = { items, sold: [], locked: [], dealKey: shopItemKey(deal) };
  }
  return items;
}

export function shopItemKey(item) {
  return `${item.kind}:${item.id || item.amount || 'slot'}:${item.tier || 'base'}`;
}

export function restockShopItem(run, item) {
  const tier = roundTier(run.round);
  if (item.kind === 'hp') {
    return makeHpShopItem(tier);
  }
  if (item.kind === 'skill') {
    const s = pickByTier(SKILLS, tier, { exclude: run.ownedSkills });
    return s ? { kind: 'skill', id: s.id, tier: s.tier, title: `Skill: ${SKILLS[s.id].name} (MP ${SKILLS[s.id].cost})`, price: shopPrice('skill', s.tier) } : null;
  }
  if (item.kind === 'relic') {
    const r = pickByTier(RELICS, tier, { exclude: [...run.relics, ...EARNED_ONLY_RELICS] });
    return r ? { kind: 'relic', id: r.id, tier: r.tier, title: `Relic: ${RELICS[r.id].name}`, price: shopPrice('relic', r.tier) } : null;
  }
  if (item.kind === 'consumable') {
    const c = pickByTier(CONSUMABLES, tier);
    return c ? { kind: 'consumable', id: c.id, tier: c.tier, title: `Consumable: ${CONSUMABLES[c.id].name}`, price: shopPrice('consumable', c.tier) } : null;
  }
  if (item.kind === 'removeChoice') {
    return removableDeckCards(run).length ? { kind: 'removeChoice', tier: TIERS.GOLD, title: '정밀 덱 수술', price: 56 } : null;
  }
  const rewardCards = Object.fromEntries(Object.values(CARD_LIBRARY).filter(isPlayerRewardCard).map(card => [card.id, card]));
  const card = pickByTier(rewardCards, tier);
  return card ? { kind: 'card', id: card.id, tier: card.tier, title: `Buy ${CARD_LIBRARY[card.id].name}`, price: shopPrice('card', card.tier) } : null;
}

export function rerollShopStock(run) {
  const key = String(run.round);
  const previous = run.shopStock?.[key] || {};
  const rerolls = (previous.rerolls || 0) + 1;
  const locked = new Set(previous.locked || []);
  const previousItems = previous.items || makeShopItems(run);
  const nextItems = previousItems
    .map(item => locked.has(shopItemKey(item)) ? item : restockShopItem(run, item))
    .filter(Boolean);
  run.shopStock[key] = {
    items: nextItems,
    sold: [],
    locked: [...locked].filter(lockKey => nextItems.some(item => shopItemKey(item) === lockKey)),
    rerolls
  };
  return run.shopStock[key];
}

export function shouldShowEvent(run) {
  if (run.round > MAX_ROUND) return null;
  if (!run.starterPicked) return 'starter';
  if (run.round === 1 && !run.seenEvents.has('start')) return 'start';
  const completed = run.round - 1;
  const key = `after-${completed}`;
  if (completed > 0 && completed % 2 === 0 && !run.seenEvents.has(key)) return key;
  return null;
}

export function makeStarterChoices() {
  return [
    { kind: 'starterSkill', id: 'minor_purge', tier: TIERS.BRONZE, title: SKILLS.minor_purge.name, desc: SKILLS.minor_purge.desc },
    { kind: 'starterSkill', id: 'double_shot', tier: TIERS.BRONZE, title: SKILLS.double_shot.name, desc: SKILLS.double_shot.desc },
    { kind: 'starterSkill', id: 'quick_cycle', tier: TIERS.BRONZE, title: SKILLS.quick_cycle.name, desc: SKILLS.quick_cycle.desc }
  ];
}

export function makeEventChoices(run, eventKey) {
  const choices = [];
  const sideChoices = [];
  const removable = removableDeckCards(run);
  if (removable.length) {
    const id = removable[0];
    choices.push({
      kind: 'removeCard',
      id,
      tier: TIERS.BRONZE,
      price: eventKey === 'start' ? 8 : 15,
      title: '덱 수술',
      desc: `덱에서 ${CARD_LIBRARY[id].name} 1장을 제거합니다.`
    });
    if (eventKey !== 'start') {
      sideChoices.push({
        kind: 'removeChoice',
        tier: TIERS.GOLD,
        price: 30,
        title: '정밀 덱 수술',
        desc: '덱에서 원하는 카드 1장을 선택해 제거합니다.'
      });
    }
  }
  const upgrade = upgradeDeckCards(run)[0];
  if (upgrade) {
    choices.push({
      kind: 'upgradeCard',
      from: upgrade.from,
      to: upgrade.to,
      tier: CARD_LIBRARY[upgrade.to].tier || TIERS.BRONZE,
      title: '블록 주입',
      desc: `${CARD_LIBRARY[upgrade.from].name} → ${CARD_LIBRARY[upgrade.to].name} · 특수효과: ${CARD_DESCRIPTIONS[upgrade.to] || '이 블록으로 업그레이드합니다.'}`
    });
  }
  const skill = pickByTier(SKILLS, roundTier(run.round), { exclude: run.ownedSkills });
  if (skill) {
    sideChoices.push({
      kind: 'skill',
      id: skill.id,
      tier: skill.tier,
      title: '스킬 교관',
      desc: `${skill.name} (MP ${SKILLS[skill.id].cost}): ${SKILLS[skill.id].desc} 슬롯이 가득 찼으면 교체하거나 건너뜁니다.`
    });
  }
  sideChoices.push({
    kind: 'hpForCurse',
    amount: eventKey === 'start' ? 2 : 3,
    card: eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK,
    tier: eventKey === 'start' ? TIERS.BRONZE : TIERS.SILVER,
    title: '강화 필드',
    desc: `최대 HP 행이 증가하지만, ${CARD_LIBRARY[eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK].name}(${CARD_DESCRIPTIONS[eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK]})이 덱에 추가됩니다.`
  });
  const supply = pickByTier(CONSUMABLES, roundTier(run.round));
  sideChoices.push({
    kind: 'consumable',
    id: supply.id,
    tier: supply.tier,
    title: '보급 캐시',
    desc: `${supply.name}: ${supply.desc} 아이템 슬롯이 가득 찼으면 교체하거나 건너뜁니다.`
  });
  const digRelic = pickByTier(RELICS, roundTier(run.round), { exclude: [...run.relics, ...EARNED_ONLY_RELICS, ...SHOP_ONLY_RELICS] });
  if (digRelic && eventKey !== 'start') {
    const digCost = { [TIERS.BRONZE]: 1, [TIERS.SILVER]: 2, [TIERS.GOLD]: 3 }[digRelic.tier] || 2;
    sideChoices.push({
      kind: 'relicDig',
      id: digRelic.id,
      amount: digCost,
      tier: digRelic.tier,
      title: '유물 발굴',
      desc: `${RELICS[digRelic.id].name}: ${RELICS[digRelic.id].desc} 최대 HP ${digCost}줄을 소모하여 획득합니다.`
    });
  }
  if (eventKey !== 'start' && !run.gambleClosed && !run.gambleNext) {
    sideChoices.push({ kind: 'gamble', ...GAMBLE_TIERS.bronze });
  }
  if (eventKey !== 'start') {
    const contractCard = shuffle([TYPES.OVERDRIVE_PENTA, TYPES.MEGA_CLEANSE, TYPES.PANIC_WALL, TYPES.FLASH_I])[0];
    sideChoices.push({
      kind: 'contract',
      id: contractCard,
      tier: CARD_LIBRARY[contractCard].tier,
      title: '계약',
      desc: `${CARD_LIBRARY[contractCard].name}: ${CARD_DESCRIPTIONS[contractCard]} 덱에 영구 추가됩니다.`
    });
    if (Math.random() < 0.16 && !run.seenEvents.has('crusher')) {
      sideChoices.push({
        kind: 'grantCard',
        id: TYPES.CRUSHER,
        eventTag: 'crusher',
        tier: TIERS.GOLD,
        title: '버려진 중량기',
        desc: `${CARD_LIBRARY[TYPES.CRUSHER].name}: ${CARD_DESCRIPTIONS[TYPES.CRUSHER]}`
      });
    }
  }
  if (eventKey !== 'start') {
    sideChoices.push({
      kind: 'cleanup',
      tier: TIERS.BRONZE,
      title: '필드 청소',
      desc: '이월 필드의 쓰레기 행을 최대 5줄 제거하고, 남은 쓰레기 행을 아래로 정렬합니다.'
    });
  } else {
    sideChoices.push({
      kind: 'gold',
      amount: 12,
      tier: TIERS.BRONZE,
      title: '여분의 골드',
      desc: '소량의 골드를 가져갑니다.'
    });
  }
  const forced = [];
  // 도박 체인: 직전 단계 성공으로 예약된 상위 등급 도박을 다음 이벤트에 확정 포함.
  if (eventKey !== 'start' && (run.gambleNext === 'silver' || run.gambleNext === 'gold')) {
    forced.push({ kind: 'gamble', ...GAMBLE_TIERS[run.gambleNext] });
  }
  // 세트 완성: 미수령 완성 세트가 있으면 전용 유물을 확정 포함하고, 제시 시점에 소비(seenSets).
  if (eventKey !== 'start') {
    const ready = completedAbilitySets(run).find(ab => !run.seenSets.has(ab) && !run.relics.includes(SET_RELICS[ab]));
    if (ready) {
      const rid = SET_RELICS[ready];
      run.seenSets.add(ready);
      forced.unshift({
        kind: 'setRelic',
        id: rid,
        ability: ready,
        tier: TIERS.GOLD,
        title: `${SET_LABELS[ready]} 세트 완성`,
        desc: `${RELICS[rid].name}: ${RELICS[rid].desc}`
      });
    }
  }
  return [...forced, ...choices, ...shuffle(sideChoices)].slice(0, 3);
}

export function removableDeckCards(run) {
  const counts = new Map();
  for (const id of run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
  return [...counts.keys()]
    .filter(id => CARD_LIBRARY[id] && (run.deck.extraCards.includes(id) || BASE_TYPES.includes(id)))
    .sort(compareRemovableCards);
}

export function upgradeDeckCards(run) {
  const counts = new Map();
  for (const id of run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
  return shuffle(BASE_TYPES
    .filter(id => (counts.get(id) || 0) > 0 && BLOCK_UPGRADES[id])
    .flatMap(id => shuffle(BLOCK_UPGRADES[id]).map(to => ({ from: id, to }))));
}

export function applyReward(run, reward) {
  if (reward.kind === 'card') run.deck.addCard(reward.id);
  if (reward.kind === 'skill' && !run.ownedSkills.includes(reward.id)) {
    run.ownedSkills.push(reward.id);
    if (run.equippedSkills.length < 3) run.equippedSkills.push(reward.id);
  }
  if (reward.kind === 'consumable') addConsumable(run, reward.id);
  if (reward.kind === 'hp') run.hpRows += reward.amount;
  if (reward.kind === 'relic' && !run.relics.includes(reward.id)) run.relics.push(reward.id);
}

export function addConsumable(run, id) {
  if (run.consumables.length < 3) run.consumables.push(id);
}

export function grantEliteRelic(run) {
  const relic = pickByTier(RELICS, TIERS.GOLD, { elite: true, minTier: TIERS.SILVER, exclude: [...run.relics, ...EARNED_ONLY_RELICS, ...SHOP_ONLY_RELICS] });
  if (!relic) return null;
  if (!run.relics.includes(relic.id)) run.relics.push(relic.id);
  return relic.id;
}

export function randomConsumable(sourceTier = TIERS.BRONZE) {
  return pickByTier(CONSUMABLES, sourceTier).id;
}

export function isShopRound(round) {
  return [6, 11, 16, 20].includes(round);
}

export function isRunComplete(run) {
  return run.round > MAX_ROUND;
}
