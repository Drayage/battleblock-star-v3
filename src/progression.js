import { BASE_TYPES, CARD_LIBRARY, DEFAULT_ROWS, MAX_ROUND, TIER_LABELS, TIER_ORDER, TIERS, TYPES } from './constants.js?v=20260519-tier1';
import { Deck, shuffle } from './deck.js?v=20260519-tier1';
import { SKILLS } from './skills.js?v=20260519-tier1';
import { CONSUMABLES } from './consumables.js?v=20260519-tier1';

export const RELICS = {
  combo_amp: {
    id: 'combo_amp',
    name: 'Combo Amplifier',
    tier: TIERS.GOLD,
    desc: 'At 2+ combo, your attacks deal 25% more damage.'
  },
  mana_lens: {
    id: 'mana_lens',
    name: 'Mana Lens',
    tier: TIERS.SILVER,
    desc: 'Line clears restore 35% more MP after the base gain.'
  },
  garbage_buffer: {
    id: 'garbage_buffer',
    name: 'Garbage Buffer',
    tier: TIERS.SILVER,
    desc: 'Enemy attacks send 1 less garbage whenever they hit you.'
  },
  hold_cache: {
    id: 'hold_cache',
    name: 'Hold Cache',
    tier: TIERS.BRONZE,
    desc: 'Start each battle with +15 MP if your hold slot is empty.'
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
  [TYPES.I]: [TYPES.POWER_I, TYPES.BOMB_I],
  [TYPES.J]: [TYPES.CLEANSE_J],
  [TYPES.L]: [TYPES.MANA_L],
  [TYPES.O]: [TYPES.BOMB, TYPES.PURGE_O],
  [TYPES.S]: [TYPES.POWER_S],
  [TYPES.T]: [TYPES.POWER_T, TYPES.MANA_T]
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
    this.seenEvents = new Set();
  }

  deckCount() {
    return this.deck.size();
  }
}

const ENEMIES = [
  { name: 'Soft Starter', tier: TIERS.BRONZE, style: 'BRONZE - Slow stacker. Low HP and weak pressure.', profile: 'balanced', rows: -6, speed: 540, garbage: 0, risk: 0.75, rewardBonus: 0, openingRows: 13 },
  { name: 'Line Hunter', tier: TIERS.BRONZE, style: 'BRONZE - Clears singles often and attacks steadily.', profile: 'balanced', rows: -5, speed: 485, garbage: 0, risk: 1, rewardBonus: 1, openingRows: 14 },
  { name: 'Speed Drone', tier: TIERS.SILVER, style: 'SILVER - Very fast but fragile. Pays extra because it is stressful.', profile: 'fast', rows: -9, speed: 320, garbage: 0, risk: 1.7, rewardBonus: 8, openingRows: 11 },
  { name: 'Opener Script', tier: TIERS.SILVER, style: 'SILVER OPENER - Explosive prepared starts, tiny HP pool.', profile: 'opener', rows: -9, speed: 300, garbage: 0, risk: 1.85, rewardBonus: 10, openingRows: 11, minRound: 3, deckExtras: [TYPES.POWER_T] },
  { name: 'Stride Engine', tier: TIERS.GOLD, style: 'GOLD STRIDE - Steady quad and spin pressure over time.', profile: 'stride', rows: -2, speed: 340, garbage: 1, risk: 1.65, rewardBonus: 7, minRound: 6, deckExtras: [TYPES.POWER_I, TYPES.POWER_T] },
  { name: 'Plonk Gambler', tier: TIERS.GOLD, style: 'GOLD PLONK - Accepts pressure, then looks for burst damage.', profile: 'plonk', rows: -4, speed: 360, garbage: 2, risk: 1.6, rewardBonus: 7, minRound: 7, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE] },
  { name: 'Inf DS Shell', tier: TIERS.SILVER, style: 'SILVER INF DS - Defensive downstacking and field cleanup.', profile: 'infds', rows: 3, speed: 430, garbage: 1, risk: 1.35, rewardBonus: 4, minRound: 8, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J, TYPES.INSTANT_GUARD] },
  { name: 'Bomb Adept', tier: TIERS.SILVER, style: 'SILVER - Adds bomb blocks from midgame.', profile: 'balanced', rows: 0, speed: 420, garbage: 1, risk: 1.25, rewardBonus: 3, deckExtras: [TYPES.BOMB, TYPES.BOMB_I] },
  { name: 'Mana Thief', tier: TIERS.SILVER, style: 'SILVER - Midgame caster that periodically slows you.', profile: 'balanced', rows: 1, speed: 405, garbage: 1, risk: 1.35, rewardBonus: 4, deckExtras: [TYPES.MANA_L], ability: 'slowPlayer' },
  { name: 'Cleanse Warden', tier: TIERS.GOLD, style: 'GOLD - Uses cleanse blocks and resists garbage pressure.', profile: 'stacker', rows: 2, speed: 380, garbage: 2, risk: 1.45, rewardBonus: 5, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J] }
];

const ELITES = [
  { name: 'Elite: Ceiling Press', tier: TIERS.GOLD, style: 'GOLD ELITE - High HP, starts with pressure, rewards rare blocks.', profile: 'elite', rows: 5, speed: 310, garbage: 3, risk: 1.85, rewardBonus: 9, ability: 'spike' },
  { name: 'Elite: Power Core', tier: TIERS.GOLD, style: 'GOLD ELITE - Uses multiple power blocks and sends larger bursts.', profile: 'fast', rows: 4, speed: 260, garbage: 2, risk: 2.05, rewardBonus: 13, deckExtras: [TYPES.POWER_I, TYPES.POWER_T, TYPES.POWER_S], ability: 'power' },
  { name: 'Elite: Cross Engine', tier: TIERS.GOLD, style: 'GOLD ELITE - Odd shapes, high variance, elite rewards.', profile: 'elite', rows: 6, speed: 300, garbage: 2, risk: 1.95, rewardBonus: 11, deckExtras: [TYPES.CROSS], ability: 'spike' },
  { name: 'Elite: Opener Lab', tier: TIERS.GOLD, style: 'GOLD OPENER ELITE - Very low HP, extremely fast early burst.', profile: 'opener', rows: -5, speed: 235, garbage: 1, risk: 2.25, rewardBonus: 16, minRound: 6, deckExtras: [TYPES.POWER_T, TYPES.POWER_I], ability: 'power' },
  { name: 'Elite: Plonk Vault', tier: TIERS.GOLD, style: 'GOLD PLONK ELITE - Survives pressure and swings back hard.', profile: 'plonk', rows: 1, speed: 285, garbage: 4, risk: 2.1, rewardBonus: 14, minRound: 9, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I, TYPES.INSTANT_STRIKE], ability: 'spike' }
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

export function makeEnemyChoices(round) {
  const count = round % 3 === 0 ? 3 : 2;
  const unlocked = ENEMIES.filter(enemy => !enemy.minRound || round >= enemy.minRound);
  const normalPool = shuffle(round <= 2 ? unlocked.filter(enemy => ['Soft Starter', 'Line Hunter', 'Speed Drone'].includes(enemy.name)) : round <= 5 ? unlocked.filter(enemy => !['Mana Thief', 'Cleanse Warden'].includes(enemy.name)) : unlocked);
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
  const rewardTier = elite ? TIERS.GOLD : maxTier(base.tier || TIERS.BRONZE, roundTier(round));
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: base.name,
    tier: rewardTier,
    style: base.style,
    aiProfile: base.profile,
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
    .filter(card => card.tier && card.rarity !== 'base' && card.rarity !== 'curse')
    .map(card => [card.id, card]));
  if (elite) {
    const rareCard = pickByTier(rewardCards, TIERS.GOLD, { elite: true });
    const skill = pickByTier(SKILLS, TIERS.GOLD, { elite: true });
    const relic = pickByTier(RELICS, TIERS.GOLD, { elite: true, minTier: TIERS.SILVER });
    const consumable = pickByTier(CONSUMABLES, TIERS.GOLD, { elite: true });
    return shuffle([
      { kind: 'card', id: rareCard.id, tier: rareCard.tier, title: `${tierLabel(rareCard.tier)} block reward` },
      { kind: 'skill', id: skill.id, tier: skill.tier, title: `${tierLabel(skill.tier)} skill reward` },
      { kind: 'relic', id: relic.id, tier: relic.tier, title: `${tierLabel(relic.tier)} elite relic choice` },
      { kind: 'consumable', id: consumable.id, tier: consumable.tier, title: `${tierLabel(consumable.tier)} consumable kit` }
    ]);
  }
  const picked = [];
  while (picked.length < 3) {
    const card = pickByTier(rewardCards, sourceTier, { exclude: picked });
    if (!card || picked.includes(card.id)) break;
    picked.push(card.id);
  }
  return picked.map(id => ({ kind: 'card', id, tier: CARD_LIBRARY[id].tier, title: `${tierLabel(CARD_LIBRARY[id].tier)} block reward` }));
}

export function makeShopItems(run) {
  const tier = roundTier(run.round);
  const rewardCards = Object.fromEntries(Object.values(CARD_LIBRARY)
    .filter(card => card.tier && card.rarity !== 'base' && card.rarity !== 'curse')
    .map(card => [card.id, card]));
  const cardItems = [];
  while (cardItems.length < 4) {
    const card = pickByTier(rewardCards, tier, { exclude: cardItems });
    if (!card || cardItems.includes(card.id)) break;
    cardItems.push(card.id);
  }
  const skill = pickByTier(SKILLS, tier, { exclude: run.ownedSkills });
  const consumable = pickByTier(CONSUMABLES, tier);
  const relic = pickByTier(RELICS, tier, { exclude: run.relics });
  const hpTier = tier;
  return [
    ...cardItems.map(id => ({ kind: 'card', id, tier: CARD_LIBRARY[id].tier, title: `Buy ${CARD_LIBRARY[id].name}`, price: shopPrice('card', CARD_LIBRARY[id].tier) })),
    { kind: 'hp', amount: 5, tier: hpTier, title: 'Max HP +5 rows', price: shopPrice('hp', hpTier) },
    ...(skill ? [{ kind: 'skill', id: skill.id, tier: skill.tier, title: `Skill: ${SKILLS[skill.id].name}`, price: shopPrice('skill', skill.tier) }] : []),
    ...(relic ? [{ kind: 'relic', id: relic.id, tier: relic.tier, title: `Relic: ${RELICS[relic.id].name}`, price: shopPrice('relic', relic.tier) }] : []),
    { kind: 'consumable', id: consumable.id, tier: consumable.tier, title: `Consumable: ${CONSUMABLES[consumable.id].name}`, price: shopPrice('consumable', consumable.tier) }
  ];
}

export function shouldShowEvent(run) {
  if (run.round === 1 && !run.seenEvents.has('start')) return 'start';
  const completed = run.round - 1;
  const key = `after-${completed}`;
  if (completed > 0 && completed % 2 === 0 && !run.seenEvents.has(key)) return key;
  return null;
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
      title: 'Deck Surgery',
      desc: `Pay gold to remove 1 ${CARD_LIBRARY[id].name} from your deck.`
    });
  }
  const upgrade = upgradeDeckCards(run)[0];
  if (upgrade) {
    choices.push({
      kind: 'upgradeCard',
      from: upgrade.from,
      to: upgrade.to,
      tier: CARD_LIBRARY[upgrade.to].tier || TIERS.BRONZE,
      title: 'Block Infusion',
      desc: `Upgrade 1 ${CARD_LIBRARY[upgrade.from].name} into ${CARD_LIBRARY[upgrade.to].name}.`
    });
  }
  sideChoices.push({
    kind: 'hpForCurse',
    amount: eventKey === 'start' ? 2 : 3,
    card: eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK,
    tier: eventKey === 'start' ? TIERS.BRONZE : TIERS.SILVER,
    title: 'Reinforced Field',
    desc: 'Gain max HP rows, but add an awkward 5-6 cell burden block.'
  });
  const supply = pickByTier(CONSUMABLES, roundTier(run.round));
  sideChoices.push({
    kind: 'consumable',
    id: supply.id,
    tier: supply.tier,
    title: 'Supply Cache',
    desc: 'Gain one consumable. Max 3 can be carried.'
  });
  if (eventKey !== 'start') {
    sideChoices.push({
      kind: 'cleanup',
      tier: TIERS.BRONZE,
      title: 'Field Sweep',
      desc: 'Remove one bottom garbage row from your carried field.'
    });
  } else {
    sideChoices.push({
      kind: 'gold',
      amount: 12,
      tier: TIERS.BRONZE,
      title: 'Loose Gold',
      desc: 'Take a small gold pouch and move on.'
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
  return [5, 10, 15].includes(round);
}

export function isRunComplete(run) {
  return run.round > MAX_ROUND;
}
