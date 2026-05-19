import { BASE_TYPES, CARD_LIBRARY, DEFAULT_ROWS, MAX_ROUND, TYPES } from './constants.js?v=20260519-garbage1';
import { Deck, shuffle } from './deck.js?v=20260519-garbage1';
import { SKILLS } from './skills.js?v=20260519-garbage1';
import { CONSUMABLES } from './consumables.js?v=20260519-garbage1';

export const RELICS = {
  combo_amp: {
    id: 'combo_amp',
    name: 'Combo Amplifier',
    desc: 'At 2+ combo, your attacks deal 25% more damage.'
  },
  mana_lens: {
    id: 'mana_lens',
    name: 'Mana Lens',
    desc: 'Line clears restore 35% more MP after the base gain.'
  },
  garbage_buffer: {
    id: 'garbage_buffer',
    name: 'Garbage Buffer',
    desc: 'Enemy attacks send 1 less garbage whenever they hit you.'
  },
  hold_cache: {
    id: 'hold_cache',
    name: 'Hold Cache',
    desc: 'Start each battle with +15 MP if your hold slot is empty.'
  }
};

export const BLOCK_UPGRADES = {
  [TYPES.I]: TYPES.POWER_I,
  [TYPES.J]: TYPES.CLEANSE_J,
  [TYPES.L]: TYPES.MANA_L,
  [TYPES.O]: TYPES.BOMB,
  [TYPES.S]: TYPES.POWER_S,
  [TYPES.T]: TYPES.POWER_T,
  [TYPES.Z]: TYPES.MANA_T
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
  { name: 'Soft Starter', style: 'Slow stacker. Low HP and weak pressure.', profile: 'balanced', rows: -6, speed: 540, garbage: 0, risk: 0.75, rewardBonus: 0, openingRows: 13 },
  { name: 'Line Hunter', style: 'Clears singles often and attacks steadily.', profile: 'balanced', rows: -5, speed: 485, garbage: 0, risk: 1, rewardBonus: 1, openingRows: 14 },
  { name: 'Speed Drone', style: 'Very fast but fragile. Pays extra because it is stressful.', profile: 'fast', rows: -9, speed: 320, garbage: 0, risk: 1.7, rewardBonus: 8, openingRows: 11 },
  { name: 'Opener Script', style: 'OPENER pattern: explosive prepared starts, tiny HP pool.', profile: 'opener', rows: -9, speed: 300, garbage: 0, risk: 1.85, rewardBonus: 10, openingRows: 11, minRound: 3, deckExtras: [TYPES.POWER_T] },
  { name: 'Stride Engine', style: 'STRIDE pattern: steady quad and spin pressure over time.', profile: 'stride', rows: -2, speed: 340, garbage: 1, risk: 1.65, rewardBonus: 7, minRound: 6, deckExtras: [TYPES.POWER_I, TYPES.POWER_T] },
  { name: 'Plonk Gambler', style: 'PLONK pattern: accepts pressure, then looks for burst damage.', profile: 'plonk', rows: -4, speed: 360, garbage: 2, risk: 1.6, rewardBonus: 7, minRound: 7, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I] },
  { name: 'Inf DS Shell', style: 'INF DS pattern: defensive downstacking and field cleanup.', profile: 'infds', rows: 3, speed: 430, garbage: 1, risk: 1.35, rewardBonus: 4, minRound: 8, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J] },
  { name: 'Bomb Adept', style: 'Adds bomb blocks from midgame.', profile: 'balanced', rows: 0, speed: 420, garbage: 1, risk: 1.25, rewardBonus: 3, deckExtras: [TYPES.BOMB, TYPES.BOMB_I] },
  { name: 'Mana Thief', style: 'Midgame caster that periodically slows you.', profile: 'balanced', rows: 1, speed: 405, garbage: 1, risk: 1.35, rewardBonus: 4, deckExtras: [TYPES.MANA_L], ability: 'slowPlayer' },
  { name: 'Cleanse Warden', style: 'Uses cleanse blocks and resists garbage pressure.', profile: 'stacker', rows: 2, speed: 380, garbage: 2, risk: 1.45, rewardBonus: 5, deckExtras: [TYPES.PURGE_O, TYPES.CLEANSE_J] }
];

const ELITES = [
  { name: 'Elite: Ceiling Press', style: 'High HP, starts with pressure, rewards rare blocks.', profile: 'elite', rows: 5, speed: 310, garbage: 3, risk: 1.85, rewardBonus: 9, ability: 'spike' },
  { name: 'Elite: Power Core', style: 'Uses multiple power blocks and sends larger bursts.', profile: 'fast', rows: 4, speed: 260, garbage: 2, risk: 2.05, rewardBonus: 13, deckExtras: [TYPES.POWER_I, TYPES.POWER_T, TYPES.POWER_S], ability: 'power' },
  { name: 'Elite: Cross Engine', style: 'Odd shapes, high variance, elite rewards.', profile: 'elite', rows: 6, speed: 300, garbage: 2, risk: 1.95, rewardBonus: 11, deckExtras: [TYPES.CROSS], ability: 'spike' },
  { name: 'Elite: Opener Lab', style: 'OPENER elite: very low HP, extremely fast early burst.', profile: 'opener', rows: -5, speed: 235, garbage: 1, risk: 2.25, rewardBonus: 16, minRound: 6, deckExtras: [TYPES.POWER_T, TYPES.POWER_I], ability: 'power' },
  { name: 'Elite: Plonk Vault', style: 'PLONK elite: survives pressure and swings back hard.', profile: 'plonk', rows: 1, speed: 285, garbage: 4, risk: 2.1, rewardBonus: 14, minRound: 9, deckExtras: [TYPES.POWER_CROSS, TYPES.BOMB_I], ability: 'spike' }
];

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
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: base.name,
    style: base.style,
    aiProfile: base.profile,
    rewardGold,
    rewardPool: elite ? 'elite' : 'normal',
    startingRows: elite ? Math.max(18, eliteRows) : Math.max(round === 1 ? 10 : 12, normalRows),
    startingGarbage,
    speed,
    deckExtras: base.deckExtras || [],
    ability: round >= 7 || elite ? base.ability : null
  };
}

export function makeRewards(pool = 'normal') {
  const normalCards = [TYPES.BOMB, TYPES.MANA_T, TYPES.MANA_L, TYPES.POWER_I, TYPES.POWER_S, TYPES.PURGE_O, TYPES.CLEANSE_J];
  const eliteCards = [TYPES.POWER_I, TYPES.POWER_T, TYPES.POWER_S, TYPES.POWER_CROSS, TYPES.CROSS, TYPES.PURGE_O, TYPES.BOMB_I, TYPES.CLEANSE_J];
  const cards = pool === 'elite' ? eliteCards : normalCards;
  if (pool === 'elite') {
    const skillIds = Object.keys(SKILLS);
    const relicIds = Object.keys(RELICS);
    const rareCard = shuffle(cards)[0];
    return shuffle([
      { kind: 'card', id: rareCard, title: 'Rare block reward' },
      { kind: 'skill', id: skillIds[Math.floor(Math.random() * skillIds.length)], title: 'Special skill reward' },
      { kind: 'relic', id: relicIds[Math.floor(Math.random() * relicIds.length)], title: 'Elite relic reward' },
      { kind: 'consumable', id: randomConsumable(), title: 'Elite consumable kit' }
    ]);
  }
  return shuffle(cards).slice(0, 3).map(id => ({ kind: 'card', id, title: 'Block reward' }));
}

export function makeShopItems(run) {
  const skillIds = Object.keys(SKILLS).filter(id => !run.ownedSkills.includes(id));
  return [
    { kind: 'card', id: TYPES.POWER_I, title: 'Buy Power I', price: 42 },
    { kind: 'card', id: TYPES.POWER_T, title: 'Buy Power T', price: 44 },
    { kind: 'card', id: TYPES.MANA_T, title: 'Buy Mana T', price: 30 },
    { kind: 'card', id: TYPES.MANA_L, title: 'Buy Mana L', price: 32 },
    { kind: 'card', id: TYPES.PURGE_O, title: 'Buy Cleanse O', price: 46 },
    { kind: 'hp', amount: 5, title: 'Max HP +5 rows', price: 55 },
    { kind: 'skill', id: skillIds[0] || 'purge', title: skillIds[0] ? `Skill: ${SKILLS[skillIds[0]].name}` : 'Skill upgrade: Purge', price: 50 },
    { kind: 'consumable', id: randomConsumable(), title: 'Consumable pack', price: 22 }
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
      title: 'Block Infusion',
      desc: `Upgrade 1 ${CARD_LIBRARY[upgrade.from].name} into ${CARD_LIBRARY[upgrade.to].name}.`
    });
  }
  sideChoices.push({
    kind: 'hpForCurse',
    amount: eventKey === 'start' ? 2 : 3,
    card: eventKey === 'start' ? TYPES.HEAVY_JUNK : TYPES.WIDE_JUNK,
    title: 'Reinforced Field',
    desc: 'Gain max HP rows, but add an awkward 5-6 cell burden block.'
  });
  sideChoices.push({
    kind: 'consumable',
    id: randomConsumable(),
    title: 'Supply Cache',
    desc: 'Gain one consumable. Max 3 can be carried.'
  });
  if (eventKey !== 'start') {
    sideChoices.push({
      kind: 'cleanup',
      title: 'Field Sweep',
      desc: 'Remove one bottom garbage row from your carried field.'
    });
  } else {
    sideChoices.push({
      kind: 'gold',
      amount: 12,
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
  return [...counts.keys()]
    .filter(id => CARD_LIBRARY[id] && (run.deck.extraCards.includes(id) || BASE_TYPES.includes(id)))
    .sort((a, b) => {
      const score = id => {
        const card = CARD_LIBRARY[id];
        if (card.traits.includes('curse')) return 0;
        if (run.deck.extraCards.includes(id) && card.rarity !== 'base') return 1;
        if ([TYPES.S, TYPES.Z].includes(id)) return 2;
        if ([TYPES.J, TYPES.L].includes(id)) return 3;
        if ([TYPES.O, TYPES.T].includes(id)) return 4;
        if (id === TYPES.I) return 5;
        return 6;
      };
      return score(a) - score(b) || CARD_LIBRARY[a].name.localeCompare(CARD_LIBRARY[b].name);
    });
}

export function upgradeDeckCards(run) {
  const counts = new Map();
  for (const id of run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
  return BASE_TYPES
    .filter(id => (counts.get(id) || 0) > 0 && BLOCK_UPGRADES[id])
    .map(id => ({ from: id, to: BLOCK_UPGRADES[id] }))
    .sort((a, b) => CARD_LIBRARY[a.from].name.localeCompare(CARD_LIBRARY[b.from].name));
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

export function randomConsumable() {
  const ids = Object.keys(CONSUMABLES);
  return ids[Math.floor(Math.random() * ids.length)];
}

export function isShopRound(round) {
  return [5, 10, 15].includes(round);
}

export function isRunComplete(run) {
  return run.round > MAX_ROUND;
}
