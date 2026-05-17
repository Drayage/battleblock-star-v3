import { DEFAULT_ROWS, MAX_ROUND, TYPES } from './constants.js';
import { Deck, shuffle } from './deck.js';
import { SKILLS } from './skills.js';

export class RunState {
  constructor() {
    this.round = 1;
    this.gold = 20;
    this.hpRows = DEFAULT_ROWS;
    this.deck = new Deck();
    this.persistentGrid = null;
    this.ownedSkills = [];
    this.equippedSkills = [];
    this.relics = [];
  }

  deckCount() {
    return this.deck.size();
  }
}

const ENEMY_NAMES = ['불안정한 복제체', '라인 사냥꾼', '구멍술사', '네온 기사', '압축 드론', '폐허 관리자'];
const ELITE_NAMES = ['엘리트: 천장 압박자', '엘리트: 쓰레기 군주', '엘리트: 초고속 코어'];

export function makeEnemyChoices(round) {
  const count = round % 3 === 0 ? 3 : 2;
  const choices = [];
  for (let i = 0; i < count; i++) {
    const elite = round >= 4 && Math.random() < 0.28 + round * 0.01;
    choices.push(makeEnemy(round, elite));
  }
  return choices;
}

export function makeEnemy(round, elite = false) {
  const level = Math.max(1, round);
  return {
    id: `${elite ? 'elite' : 'mob'}-${round}-${Math.random().toString(16).slice(2)}`,
    type: elite ? 'elite' : 'normal',
    name: elite ? ELITE_NAMES[Math.floor(Math.random() * ELITE_NAMES.length)] : ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
    aiProfile: elite ? 'elite' : round > 12 ? 'fast' : 'balanced',
    rewardGold: elite ? 28 + level * 3 : 12 + level * 2,
    rewardPool: elite ? 'elite' : 'normal',
    startingRows: elite ? DEFAULT_ROWS + 4 : DEFAULT_ROWS,
    startingGarbage: elite ? Math.floor(level / 3) : Math.floor(level / 6),
    speed: Math.max(95, elite ? 280 - level * 8 : 430 - level * 9)
  };
}

export function makeRewards(pool = 'normal') {
  const cards = pool === 'elite'
    ? [TYPES.POWER_I, TYPES.CROSS, TYPES.PURGE_O, TYPES.BOMB]
    : [TYPES.BOMB, TYPES.MANA_T, TYPES.POWER_I];
  const skillIds = Object.keys(SKILLS);
  return shuffle([
    { kind: 'card', id: cards[Math.floor(Math.random() * cards.length)], title: '블록 카드 추가' },
    { kind: 'skill', id: skillIds[Math.floor(Math.random() * skillIds.length)], title: '스킬 획득' },
    { kind: 'hp', amount: 2, title: '최대 HP +2행' }
  ]);
}

export function makeShopItems(run) {
  const skillIds = Object.keys(SKILLS).filter(id => !run.ownedSkills.includes(id));
  return [
    { kind: 'card', id: TYPES.POWER_I, title: '고화력 I 추가', price: 42 },
    { kind: 'card', id: TYPES.MANA_T, title: '마나 T 추가', price: 30 },
    { kind: 'card', id: TYPES.PURGE_O, title: '정화 O 추가', price: 46 },
    { kind: 'hp', amount: 5, title: '최대 HP +5행', price: 55 },
    { kind: 'skill', id: skillIds[0] || 'purge', title: skillIds[0] ? `스킬: ${SKILLS[skillIds[0]].name}` : '스킬 강화: 정화', price: 50 }
  ];
}

export function applyReward(run, reward) {
  if (reward.kind === 'card') run.deck.addCard(reward.id);
  if (reward.kind === 'skill' && !run.ownedSkills.includes(reward.id)) {
    run.ownedSkills.push(reward.id);
    if (run.equippedSkills.length < 3) run.equippedSkills.push(reward.id);
  }
  if (reward.kind === 'hp') run.hpRows += reward.amount;
}

export function isShopRound(round) {
  return [5, 10, 15].includes(round);
}

export function isRunComplete(run) {
  return run.round > MAX_ROUND;
}
