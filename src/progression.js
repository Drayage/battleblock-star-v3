import { BASE_TYPES, CARD_LIBRARY, DEFAULT_ROWS, MAX_ROUND, TYPES } from './constants.js?v=20260518-death1';
import { Deck, shuffle } from './deck.js?v=20260518-death1';
import { SKILLS } from './skills.js?v=20260518-death1';
import { CONSUMABLES } from './consumables.js?v=20260518-death1';

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
  { name: 'Soft Starter', style: 'Slow stacker. Low HP and weak pressure.', profile: 'balanced', rows: -5, speed: 520, garbage: 0 },
  { name: 'Line Hunter', style: 'Clears singles often and attacks steadily.', profile: 'balanced', rows: -4, speed: 470, garbage: 0 },
  { name: 'Speed Drone', style: 'Fast drops, messy board, low defense.', profile: 'fast', rows: -3, speed: 390, garbage: 0 },
  { name: 'Bomb Adept', style: 'Adds Bomb O blocks from midgame.', profile: 'balanced', rows: 0, speed: 420, garbage: 1, deckExtras: [TYPES.BOMB] },
  { name: 'Mana Thief', style: 'Midgame caster that periodically slows you.', profile: 'balanced', rows: 1, speed: 405, garbage: 1, ability: 'slowPlayer' },
  { name: 'Cleanse Warden', style: 'Uses Cleanse O and resists garbage pressure.', profile: 'tetris', rows: 2, speed: 380, garbage: 2, deckExtras: [TYPES.PURGE_O] }
];

const ELITES = [
  { name: 'Elite: Ceiling Press', style: 'High HP, starts with pressure, rewards rare blocks.', profile: 'elite', rows: 5, speed: 310, garbage: 3, ability: 'spike' },
  { name: 'Elite: Power Core', style: 'Uses Power I and sends larger bursts.', profile: 'fast', rows: 4, speed: 260, garbage: 2, deckExtras: [TYPES.POWER_I, TYPES.POWER_I], ability: 'power' },
  { name: 'Elite: Cross Engine', style: 'Odd shapes, high variance, elite rewards.', profile: 'elite', rows: 6, speed: 300, garbage: 2, deckExtras: [TYPES.CROSS], ability: 'spike' }
];

export function makeEnemyChoices(round) {
  const count = round % 3 === 0 ? 3 : 2;
  const normalPool = shuffle(ENEMIES);
  const elitePool = shuffle(ELITES);
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
  const roundOneRows = round === 1 ? 15 : DEFAULT_ROWS + (base.rows || 0) + Math.floor(level / 6);
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: base.name,
    style: base.style,
    aiProfile: base.profile,
    rewardGold: elite ? 26 + level * 3 : 9 + level * 2,
    rewardPool: elite ? 'elite' : 'normal',
    startingRows: elite ? Math.max(18, DEFAULT_ROWS + base.rows + Math.floor(level / 4)) : Math.max(15, roundOneRows),
    startingGarbage: (base.garbage || 0) + (elite ? Math.floor(level / 4) : Math.floor(level / 8)),
    speed: Math.max(100, (base.speed || 430) - level * (elite ? 7 : 5)),
    deckExtras: base.deckExtras || [],
    ability: round >= 7 || elite ? base.ability : null
  };
}

export function makeRewards(pool = 'normal') {
  const normalCards = [TYPES.BOMB, TYPES.MANA_T, TYPES.POWER_I, TYPES.PURGE_O];
  const eliteCards = [TYPES.POWER_I, TYPES.CROSS, TYPES.PURGE_O, TYPES.BOMB];
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
    { kind: 'card', id: TYPES.MANA_T, title: 'Buy Mana T', price: 30 },
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
  choices.push({
    kind: 'hpForCurse',
    amount: eventKey === 'start' ? 2 : 3,
    card: TYPES.HEAVY_JUNK,
    title: 'Reinforced Field',
    desc: `Gain max HP rows, but add ${CARD_LIBRARY[TYPES.HEAVY_JUNK].name}.`
  });
  choices.push({
    kind: 'consumable',
    id: randomConsumable(),
    title: 'Supply Cache',
    desc: 'Gain one consumable. Max 3 can be carried.'
  });
  if (eventKey !== 'start') {
    choices.push({
      kind: 'cleanup',
      title: 'Field Sweep',
      desc: 'Remove one bottom garbage row from your carried field.'
    });
  } else {
    choices.push({
      kind: 'gold',
      amount: 12,
      title: 'Loose Gold',
      desc: 'Take a small gold pouch and move on.'
    });
  }
  return shuffle(choices).slice(0, 3);
}

export function removableDeckCards(run) {
  const counts = new Map();
  for (const id of run.deck.draw) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.discard) counts.set(id, (counts.get(id) || 0) + 1);
  for (const id of run.deck.extraCards) counts.set(id, Math.max(counts.get(id) || 0, 1));
  return [...counts.keys()]
    .filter(id => CARD_LIBRARY[id] && (run.deck.extraCards.includes(id) || BASE_TYPES.includes(id)))
    .sort((a, b) => {
      const ar = CARD_LIBRARY[a].rarity === 'base' ? 1 : 0;
      const br = CARD_LIBRARY[b].rarity === 'base' ? 1 : 0;
      return ar - br || CARD_LIBRARY[a].name.localeCompare(CARD_LIBRARY[b].name);
    });
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
