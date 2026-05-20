import { BASE_TYPES, CARD_LIBRARY, DEFAULT_ROWS, MAX_ROUND, TIER_LABELS, TIER_ORDER, TIERS, TYPES } from './constants.js?v=20260521-ko10';
import { Deck, shuffle } from './deck.js?v=20260521-ko10';
import { SKILLS } from './skills.js?v=20260521-ko10';
import { CONSUMABLES } from './consumables.js?v=20260521-ko10';

export const RELICS = {
  combo_amp: {
    id: 'combo_amp',
    name: '콤보 증폭기',
    tier: TIERS.GOLD,
    desc: '2콤보 이상 시 공격력이 25% 증가합니다.'
  },
  mana_lens: {
    id: 'mana_lens',
    name: '마나 렌즈',
    tier: TIERS.SILVER,
    desc: '라인 클리어 후 기본 마나 회복량의 35%를 추가 회복합니다.'
  },
  garbage_buffer: {
    id: 'garbage_buffer',
    name: '쓰레기 완충기',
    tier: TIERS.GOLD,
    desc: '적의 공격이 명중할 때마다 쓰레기가 1줄 줄어듭니다.'
  },
  hold_cache: {
    id: 'hold_cache',
    name: '홀드 캐시',
    tier: TIERS.BRONZE,
    desc: '홀드 슬롯이 비어있으면 전투 시작 시 MP +15.'
  }
};

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
  [TYPES.I]: [TYPES.POWER_I, TYPES.BOMB_I, TYPES.COOLANT],
  [TYPES.J]: [TYPES.CLEANSE_J, TYPES.UNSTABLE],
  [TYPES.L]: [TYPES.MANA_L, TYPES.BOUNTY],
  [TYPES.O]: [TYPES.BOMB, TYPES.PURGE_O, TYPES.LEAD, TYPES.TIMEBOMB],
  [TYPES.S]: [TYPES.POWER_S, TYPES.GLASS],
  [TYPES.T]: [TYPES.POWER_T, TYPES.MANA_T, TYPES.COMBO_CHARGE, TYPES.CHAIN],
  [TYPES.Z]: [TYPES.POWER_Z, TYPES.MANA_Z, TYPES.BOMB_Z, TYPES.CLEANSE_Z]
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
  }

  deckCount() {
    return this.deck.size();
  }
}

const ENEMIES = [
  { name: '소프트 스타터', tier: TIERS.BRONZE, style: '느린 스태커. 낮은 HP와 약한 압박.', profile: 'balanced', rows: -7, speed: 455, garbage: 0, risk: 0.72, rewardBonus: 0, openingRows: 12, aiSkill: { mistakeRate: 0.012, noise: 0, hesitateRate: 0.24, holdMistakeRate: 0.025 } },
  { name: '라인 헌터', tier: TIERS.BRONZE, style: '단일 클리어를 자주 하며 꾸준히 압박합니다.', profile: 'balanced', rows: -6, speed: 420, garbage: 0, risk: 0.98, rewardBonus: 1, openingRows: 13, aiSkill: { mistakeRate: 0.009, noise: 0, hesitateRate: 0.2, holdMistakeRate: 0.018 } },
  { name: '스피드 드론', tier: TIERS.SILVER, style: '매우 빠르지만 취약합니다. 스트레스가 심해 보상이 높습니다.', profile: 'fast', rows: -10, speed: 285, garbage: 0, risk: 1.62, rewardBonus: 8, openingRows: 10, aiSkill: { mistakeRate: 0.007, noise: 0, hesitateRate: 0.16, holdMistakeRate: 0.014 } },
  { name: '오프너 스크립트', tier: TIERS.SILVER, style: 'OPENER 패턴: 폭발적인 준비 오프닝, 매우 낮은 HP.', profile: 'opener', rows: -9, speed: 260, garbage: 0, risk: 1.82, rewardBonus: 10, openingRows: 11, minRound: 3, deckExtras: [TYPES.POWER_T], aiSkill: { mistakeRate: 0.005, noise: 0, hesitateRate: 0.12, holdMistakeRate: 0.01 } },
  { name: '스트라이드 엔진', tier: TIERS.GOLD, style: 'STRIDE 패턴: 꾸준한 쿼드 및 스핀 압박.', profile: 'stride', rows: -2, speed: 340, garbage: 1, risk: 1.65, rewardBonus: 7, minRound: 6, deckExtras: [TYPES.POWER_I, TYPES.POWER_T], aiSkill: { mistakeRate: 0.0015, noise: 0, hesitateRate: 0.1 } },
  { name: '플롱크 겜블러', tier: TIERS.GOLD, style: 'PLONK 패턴: 압박을 버티다가 폭발적 피해를 노립니다.', profile: 'plonk', rows: -4, speed: 360, garbage: 2, risk: 1.6, rewardBonus: 7, minRound: 7, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE], aiSkill: { mistakeRate: 0.002, noise: 0, hesitateRate: 0.12 } },
  { name: 'INF DS 쉘', tier: TIERS.SILVER, style: 'INF DS 패턴: 방어적 다운스태킹과 필드 정리.', profile: 'infds', rows: 3, speed: 450, garbage: 1, risk: 1.3, rewardBonus: 4, minRound: 8, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J, TYPES.INSTANT_GUARD], aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.15 } },
  { name: '봄브 어뎁트', tier: TIERS.SILVER, style: '중반부터 폭탄 블록을 추가합니다.', profile: 'balanced', rows: 0, speed: 445, garbage: 1, risk: 1.2, rewardBonus: 3, deckExtras: [TYPES.BOMB, TYPES.BOMB_I], aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.16 } },
  { name: '마나 도둑', tier: TIERS.SILVER, style: '주기적으로 플레이어를 느리게 하는 중반 캐스터.', profile: 'balanced', rows: 1, speed: 430, garbage: 1, risk: 1.3, rewardBonus: 4, deckExtras: [TYPES.MANA_L], ability: 'slowPlayer', aiSkill: { mistakeRate: 0.003, noise: 0, hesitateRate: 0.12 } },
  { name: '클렌즈 워든', tier: TIERS.GOLD, style: '클렌즈 블록을 사용하며 쓰레기 압박에 저항합니다.', profile: 'stacker', rows: 2, speed: 390, garbage: 2, risk: 1.45, rewardBonus: 5, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J], aiSkill: { mistakeRate: 0.001, noise: 0, hesitateRate: 0.09 } }
];

const ELITES = [
  { name: '엘리트: 천장 압박기', tier: TIERS.GOLD, style: '높은 HP, 초반 압박, 희귀 블록 보상.', profile: 'elite', rows: 5, speed: 310, garbage: 3, risk: 1.85, rewardBonus: 9, ability: 'spike' },
  { name: '엘리트: 파워 코어', tier: TIERS.GOLD, style: '다수의 파워 블록으로 큰 폭발 피해를 줍니다.', profile: 'fast', rows: 4, speed: 260, garbage: 2, risk: 2.05, rewardBonus: 13, deckExtras: [TYPES.POWER_I, TYPES.POWER_T, TYPES.POWER_S], ability: 'power' },
  { name: '엘리트: 크로스 엔진', tier: TIERS.GOLD, style: '특이한 모양, 높은 분산, 엘리트 보상.', profile: 'elite', rows: 6, speed: 300, garbage: 2, risk: 1.95, rewardBonus: 11, deckExtras: [TYPES.CROSS], ability: 'spike' },
  { name: '엘리트: 오프너 랩', tier: TIERS.GOLD, style: 'OPENER 엘리트: 매우 낮은 HP, 극도로 빠른 초반 폭발.', profile: 'opener', rows: -5, speed: 235, garbage: 1, risk: 2.25, rewardBonus: 16, minRound: 6, deckExtras: [TYPES.POWER_T, TYPES.POWER_I], ability: 'power' },
  { name: '엘리트: 플롱크 볼트', tier: TIERS.GOLD, style: 'PLONK 엘리트: 압박을 버티다가 강력하게 반격합니다.', profile: 'plonk', rows: 1, speed: 285, garbage: 4, risk: 2.1, rewardBonus: 14, minRound: 9, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE], ability: 'spike' }
];

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

// 한 선택 세트에 패널티/즉발 카드가 각각 최대 1개만 등장하도록, 한 장 뽑힌 뒤 같은 계열의 나머지를 제외한다.
function categoryBlocklist(source, card) {
  const blocked = [];
  if (card.penalty) blocked.push(...Object.values(source).filter(c => c.penalty && c.id !== card.id).map(c => c.id));
  if (card.onPlace) blocked.push(...Object.values(source).filter(c => c.onPlace && c.id !== card.id).map(c => c.id));
  return blocked;
}

function isPlayerRewardCard(card) {
  return card.tier && card.rarity !== 'base' && card.rarity !== 'curse' && card.id !== TYPES.CROSS;
}

export function makeEnemyChoices(round) {
  const count = round % 3 === 0 ? 3 : 2;
  const unlocked = ENEMIES.filter(enemy => !enemy.minRound || round >= enemy.minRound);
  const normalPool = shuffle(round <= 2 ? unlocked.filter(enemy => ['소프트 스타터', '라인 헌터', '스피드 드론'].includes(enemy.name)) : round <= 5 ? unlocked.filter(enemy => !['마나 도둑', '클렌즈 워든'].includes(enemy.name)) : unlocked);
  const elitePool = shuffle(ELITES.filter(enemy => !enemy.minRound || round >= enemy.minRound));
  const eliteSlot = round >= 4 && Math.random() < 0.3 + round * 0.01;
  const choices = [];
  for (let i = 0; i < count; i++) {
    const elite = eliteSlot && i === count - 1;
    const base = elite ? elitePool.shift() : normalPool.shift();
    choices.push(makeEnemy(round, elite, base));
  }
  return choices;
}

export function makeEnemy(round, elite = false, selectedBase = null) {
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
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: base.name,
    tier: rewardTier,
    style: base.style,
    aiProfile: base.profile,
    aiSkill,
    rewardGold,
    rewardPool: elite ? `elite:${rewardTier}` : rewardTier,
    startingRows: elite ? Math.max(18, eliteRows) : Math.max(round === 1 ? 10 : 12, normalRows),
    startingGarbage,
    speed,
    deckExtras: base.deckExtras || [],
    ability: round >= 7 || elite ? base.ability : null
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
  const relic = pickByTier(RELICS, tier, { exclude: run.relics });
  const hpTier = tier;
  const items = [
    ...cardItems.map(id => ({ kind: 'card', id, tier: CARD_LIBRARY[id].tier, title: `Buy ${CARD_LIBRARY[id].name}`, price: shopPrice('card', CARD_LIBRARY[id].tier) })),
    { kind: 'hp', amount: 5, tier: hpTier, title: 'Max HP +5 rows', price: shopPrice('hp', hpTier) },
    ...(skill ? [{ kind: 'skill', id: skill.id, tier: skill.tier, title: `Skill: ${SKILLS[skill.id].name}`, price: shopPrice('skill', skill.tier) }] : []),
    ...(relic ? [{ kind: 'relic', id: relic.id, tier: relic.tier, title: `Relic: ${RELICS[relic.id].name}`, price: shopPrice('relic', relic.tier) }] : []),
    { kind: 'consumable', id: consumable.id, tier: consumable.tier, title: `Consumable: ${CONSUMABLES[consumable.id].name}`, price: shopPrice('consumable', consumable.tier) }
  ];
  if (run.shopStock) run.shopStock[key] = { items, sold: [] };
  return items;
}

export function shopItemKey(item) {
  return `${item.kind}:${item.id || item.amount || 'slot'}:${item.tier || 'base'}`;
}

export function shouldShowEvent(run) {
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
      tier: CARD_LIBRARY[id].tier || TIERS.BRONZE,
      price: eventKey === 'start' ? 8 : 15,
      title: '덱 수술',
      desc: `덱에서 ${CARD_LIBRARY[id].name} 1장을 제거합니다.`
    });
  }
  const upgrade = upgradeDeckCards(run)[0];
  if (upgrade) {
    choices.push({
      kind: 'upgradeCard',
      from: upgrade.from,
      to: upgrade.to,
      tier: CARD_LIBRARY[upgrade.to].tier || TIERS.BRONZE,
      title: '블록 주입',
      desc: `${CARD_LIBRARY[upgrade.from].name}을(를) ${CARD_LIBRARY[upgrade.to].name}으로 업그레이드합니다.`
    });
  }
  const skill = pickByTier(SKILLS, roundTier(run.round), { exclude: run.ownedSkills });
  if (skill) {
    sideChoices.push({
      kind: 'skill',
      id: skill.id,
      tier: skill.tier,
      title: '스킬 교관',
      desc: `${skill.name}을(를) 배웁니다. 슬롯이 가득 찼으면 교체하거나 건너뜁니다.`
    });
  }
  sideChoices.push({
    kind: 'hpForCurse',
    amount: eventKey === 'start' ? 2 : 3,
    card: eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK,
    tier: eventKey === 'start' ? TIERS.BRONZE : TIERS.SILVER,
    title: '강화 필드',
    desc: '최대 HP 행이 증가하지만, 방해 블록이 덱에 추가됩니다.'
  });
  const supply = pickByTier(CONSUMABLES, roundTier(run.round));
  sideChoices.push({
    kind: 'consumable',
    id: supply.id,
    tier: supply.tier,
    title: '보급 캐시',
    desc: `${supply.name}: ${supply.desc} 아이템 슬롯이 가득 찼으면 교체하거나 건너뜁니다.`
  });
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
  return [...choices, ...shuffle(sideChoices)].slice(0, 3);
}

export function removableDeckCards(run) {
  const counts = new Map();
  for (const id of run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
  return shuffle([...counts.keys()]
    .filter(id => CARD_LIBRARY[id] && (run.deck.extraCards.includes(id) || BASE_TYPES.includes(id))));
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
  const relic = pickByTier(RELICS, TIERS.GOLD, { elite: true, minTier: TIERS.SILVER, exclude: run.relics });
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
