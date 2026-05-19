export const COLS = 10;
export const DEFAULT_ROWS = 20;
export const MAX_ROUND = 20;
export const GAME_TIMING = {
  LOCK_DELAY_START: 520,
  LOCK_DELAY_STEP: 55,
  LOCK_DELAY_MIN: 120,
  PLAYER_FALL_INTERVAL: 760,
  PLAYER_SLOW_FACTOR: 0.55,
  ENEMY_SLOW_FACTOR: 2.8,
  GARBAGE_ARM_DELAY: 3000,
  AUTO_SAVE_INTERVAL: 5000,
  ENEMY_ABILITY_INTERVAL: 6500,
  BATTLE_WIN_DELAY: 1400,
  BATTLE_LOSS_DELAY: 1200,
  BOMB_FX_FLASH: 520,
  CLEAR_FEEDBACK_FLASH: 1100,
  COMBO_BREAK_FLASH: 900,
  TOUCH_FIRST_DELAY: 240,
  TOUCH_SOFT_FIRST_DELAY: 120,
  TOUCH_REPEAT_DELAY: 110,
  TOUCH_SOFT_REPEAT_DELAY: 70,
  KEY_REPEAT_FIRST_DELAY: 180,
  KEY_REPEAT_DELAY: 90,
  KEY_REPEAT_FAST_DELAY: 45
};

export const TYPES = {
  EMPTY: 'empty',
  GARBAGE: 'garbage',
  I: 'I',
  J: 'J',
  L: 'L',
  O: 'O',
  S: 'S',
  T: 'T',
  Z: 'Z',
  POWER_I: 'POWER_I',
  POWER_T: 'POWER_T',
  POWER_S: 'POWER_S',
  CROSS: 'CROSS',
  BOMB: 'BOMB',
  BOMB_I: 'BOMB_I',
  MANA_T: 'MANA_T',
  MANA_L: 'MANA_L',
  PURGE_O: 'PURGE_O',
  CLEANSE_J: 'CLEANSE_J',
  HEAVY_JUNK: 'HEAVY_JUNK',
  POWER_CROSS: 'POWER_CROSS',
  WIDE_JUNK: 'WIDE_JUNK',
  INSTANT_STRIKE: 'INSTANT_STRIKE',
  INSTANT_GUARD: 'INSTANT_GUARD',
  INSTANT_MANA: 'INSTANT_MANA',
  INSTANT_PURGE: 'INSTANT_PURGE'
};

export const BASE_TYPES = [TYPES.I, TYPES.J, TYPES.L, TYPES.O, TYPES.S, TYPES.T, TYPES.Z];
export const TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold'
};
export const TIER_ORDER = [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD];
export const TIER_LABELS = {
  [TIERS.BRONZE]: 'BRONZE',
  [TIERS.SILVER]: 'SILVER',
  [TIERS.GOLD]: 'GOLD'
};

export const COLORS = {
  [TYPES.I]: '#00d9e8',
  [TYPES.J]: '#3767ff',
  [TYPES.L]: '#f0a12a',
  [TYPES.O]: '#e8d93a',
  [TYPES.S]: '#23d15f',
  [TYPES.T]: '#9c54ff',
  [TYPES.Z]: '#f24b52',
  [TYPES.POWER_I]: '#ff3b8d',
  [TYPES.POWER_T]: '#d85cff',
  [TYPES.POWER_S]: '#31ff87',
  [TYPES.CROSS]: '#d8f7ff',
  [TYPES.BOMB]: '#ff6a22',
  [TYPES.BOMB_I]: '#ff8b2f',
  [TYPES.MANA_T]: '#45f0bd',
  [TYPES.MANA_L]: '#56ffd1',
  [TYPES.PURGE_O]: '#f5f2ff',
  [TYPES.CLEANSE_J]: '#c6d8ff',
  [TYPES.HEAVY_JUNK]: '#6d5f73',
  [TYPES.POWER_CROSS]: '#ffb0d0',
  [TYPES.WIDE_JUNK]: '#58515f',
  [TYPES.INSTANT_STRIKE]: '#ffcc66',
  [TYPES.INSTANT_GUARD]: '#80a8ff',
  [TYPES.INSTANT_MANA]: '#63ffdd',
  [TYPES.INSTANT_PURGE]: '#f4f7ff',
  [TYPES.GARBAGE]: '#4a4b56'
};

export const SHAPE_LIBRARY = {
  I: {
    name: 'I형',
    cells: 4,
    shape: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ]
  },
  J: {
    name: 'J형',
    cells: 4,
    shape: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
    ]
  },
  L: {
    name: 'L형',
    cells: 4,
    shape: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
    ]
  },
  O: {
    name: 'O형',
    cells: 4,
    shape: [
    [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]]
    ]
  },
  S: {
    name: 'S형',
    cells: 4,
    shape: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
    ]
  },
  T: {
    name: 'T형',
    cells: 4,
    shape: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
    ]
  },
  Z: {
    name: 'Z형',
    cells: 4,
    shape: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
    ]
  },
  CROSS5: {
    name: '크로스형',
    cells: 5,
    shape: [
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]]
    ]
  },
  HEAVY5: {
    name: '헤비형',
    cells: 5,
    shape: [
    [[1,1,1],[0,1,0],[0,1,0]],
    [[0,0,1],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1],[1,0,0]]
    ]
  },
  WIDE6: {
    name: '와이드형',
    cells: 6,
    shape: [
      [[1,1,1,1],[0,1,1,0]],
      [[0,1],[1,1],[1,1],[0,1]],
      [[0,1,1,0],[1,1,1,1]],
      [[1,0],[1,1],[1,1],[1,0]]
    ]
  },
  HOOK5: {
    name: '훅형',
    cells: 5,
    shape: [
      [[1,0,0],[1,0,0],[1,1,1]],
      [[1,1,1],[1,0,0],[1,0,0]],
      [[1,1,1],[0,0,1],[0,0,1]],
      [[0,0,1],[0,0,1],[1,1,1]]
    ]
  }
};

export const SHAPES = Object.fromEntries(Object.entries({
  [TYPES.I]: 'I',
  [TYPES.J]: 'J',
  [TYPES.L]: 'L',
  [TYPES.O]: 'O',
  [TYPES.S]: 'S',
  [TYPES.T]: 'T',
  [TYPES.Z]: 'Z',
  [TYPES.POWER_I]: 'I',
  [TYPES.POWER_T]: 'T',
  [TYPES.POWER_S]: 'S',
  [TYPES.CROSS]: 'CROSS5',
  [TYPES.BOMB]: 'O',
  [TYPES.BOMB_I]: 'I',
  [TYPES.MANA_T]: 'T',
  [TYPES.MANA_L]: 'L',
  [TYPES.PURGE_O]: 'O',
  [TYPES.CLEANSE_J]: 'J',
  [TYPES.HEAVY_JUNK]: 'HEAVY5',
  [TYPES.POWER_CROSS]: 'CROSS5',
  [TYPES.WIDE_JUNK]: 'WIDE6',
  [TYPES.INSTANT_STRIKE]: 'HOOK5',
  [TYPES.INSTANT_GUARD]: 'WIDE6',
  [TYPES.INSTANT_MANA]: 'CROSS5',
  [TYPES.INSTANT_PURGE]: 'HEAVY5'
}).map(([id, shapeId]) => [id, SHAPE_LIBRARY[shapeId].shape]));

export const ABILITY_LIBRARY = {
  none: { id: 'none', name: '일반', cellAttack: 0.1, traits: [], desc: '기본 테트로미노 셀.' },
  highPower: { id: 'highPower', name: '고출력', cellAttack: 0.3, traits: ['highPower'], desc: '클리어된 셀당 0.3 공격력.' },
  oddPower: { id: 'oddPower', name: '특수', cellAttack: 0.16, traits: ['oddShape'], desc: '특수 모양. 더 높은 반환값.' },
  bomb: { id: 'bomb', name: '폭탄', cellAttack: 0.1, traits: ['bomb'], desc: '클리어 시 중심 3×3 영역을 파괴합니다.' },
  manaBonus: { id: 'manaBonus', name: '마나', cellAttack: 0.1, traits: ['manaBonus'], desc: '클리어된 셀이 추가 MP를 제공합니다.' },
  purgeGarbage: { id: 'purgeGarbage', name: '클렌즈', cellAttack: 0.1, traits: ['purgeGarbage'], desc: '클리어 시 쓰레기 행을 제거합니다.' },
  instantAttack: { id: 'instantAttack', name: '즉발 공격', cellAttack: 0.1, traits: [], onPlace: { attack: 1.2 }, desc: '배치 즉시 1.2 공격력을 발사합니다.' },
  instantGuard: { id: 'instantGuard', name: '즉발 방어', cellAttack: 0.1, traits: [], onPlace: { cancelGarbage: 3 }, desc: '배치 즉시 들어오는 공격 게이지를 최대 3 차단합니다.' },
  instantMana: { id: 'instantMana', name: '즉발 마나', cellAttack: 0.1, traits: [], onPlace: { mana: 18 }, desc: '배치 즉시 MP를 18 회복합니다.' },
  instantPurge: { id: 'instantPurge', name: '즉발 퍼지', cellAttack: 0.1, traits: [], onPlace: { purgeGarbageRows: 1 }, desc: '배치 즉시 쓰레기 행 1줄을 제거합니다.' },
  curse: { id: 'curse', name: '방해', cellAttack: 0.1, traits: ['curse'], desc: '덱을 막는 방해형 블록.' },
  wideCurse: { id: 'wideCurse', name: '광역 방해', cellAttack: 0.1, traits: ['curse', 'wide'], desc: '덱을 막는 6칸 방해형 블록.' }
};

function tierFromRarity(rarity) {
  if (rarity === 'gold' || rarity === 'rare') return TIERS.GOLD;
  if (rarity === 'silver' || rarity === 'uncommon') return TIERS.SILVER;
  return TIERS.BRONZE;
}

function blockCard(id, name, shapeId, abilityId = 'none', rarity = 'base') {
  const shape = SHAPE_LIBRARY[shapeId];
  const ability = ABILITY_LIBRARY[abilityId];
  return {
    id,
    name,
    shapeId,
    shapeName: shape.name,
    abilityId,
    abilityName: ability.name,
    cellCount: shape.cells,
    shape: shape.shape,
    cellAttack: ability.cellAttack,
    traits: [...ability.traits],
    onPlace: ability.onPlace ? { ...ability.onPlace } : null,
    rarity,
    tier: tierFromRarity(rarity)
  };
};

export const CARD_LIBRARY = {
  [TYPES.I]: blockCard(TYPES.I, 'I Mino', 'I'),
  [TYPES.J]: blockCard(TYPES.J, 'J Mino', 'J'),
  [TYPES.L]: blockCard(TYPES.L, 'L Mino', 'L'),
  [TYPES.O]: blockCard(TYPES.O, 'O 미노', 'O'),
  [TYPES.S]: blockCard(TYPES.S, 'S 미노', 'S'),
  [TYPES.T]: blockCard(TYPES.T, 'T 미노', 'T'),
  [TYPES.Z]: blockCard(TYPES.Z, 'Z 미노', 'Z'),
  [TYPES.POWER_I]: blockCard(TYPES.POWER_I, '파워 I', 'I', 'highPower', 'rare'),
  [TYPES.POWER_T]: blockCard(TYPES.POWER_T, '파워 T', 'T', 'highPower', 'rare'),
  [TYPES.POWER_S]: blockCard(TYPES.POWER_S, '파워 S', 'S', 'highPower', 'rare'),
  [TYPES.CROSS]: blockCard(TYPES.CROSS, '크로스 미노', 'CROSS5', 'oddPower', 'rare'),
  [TYPES.BOMB]: blockCard(TYPES.BOMB, '봄브 O', 'O', 'bomb', 'uncommon'),
  [TYPES.BOMB_I]: blockCard(TYPES.BOMB_I, '봄브 I', 'I', 'bomb', 'rare'),
  [TYPES.MANA_T]: blockCard(TYPES.MANA_T, '마나 T', 'T', 'manaBonus', 'uncommon'),
  [TYPES.MANA_L]: blockCard(TYPES.MANA_L, '마나 L', 'L', 'manaBonus', 'uncommon'),
  [TYPES.PURGE_O]: blockCard(TYPES.PURGE_O, '클렌즈 O', 'O', 'purgeGarbage', 'rare'),
  [TYPES.CLEANSE_J]: blockCard(TYPES.CLEANSE_J, '클렌즈 J', 'J', 'purgeGarbage', 'rare'),
  [TYPES.HEAVY_JUNK]: blockCard(TYPES.HEAVY_JUNK, '헤비 정크', 'HEAVY5', 'curse', 'curse'),
  [TYPES.POWER_CROSS]: blockCard(TYPES.POWER_CROSS, '파워 크로스', 'CROSS5', 'highPower', 'rare'),
  [TYPES.WIDE_JUNK]: blockCard(TYPES.WIDE_JUNK, '와이드 정크', 'WIDE6', 'wideCurse', 'curse'),
  [TYPES.INSTANT_STRIKE]: blockCard(TYPES.INSTANT_STRIKE, '스트라이크 훅', 'HOOK5', 'instantAttack', 'uncommon'),
  [TYPES.INSTANT_GUARD]: blockCard(TYPES.INSTANT_GUARD, '가드 와이드', 'WIDE6', 'instantGuard', 'uncommon'),
  [TYPES.INSTANT_MANA]: blockCard(TYPES.INSTANT_MANA, '마나 크로스', 'CROSS5', 'instantMana', 'uncommon'),
  [TYPES.INSTANT_PURGE]: blockCard(TYPES.INSTANT_PURGE, '퍼지 헤비', 'HEAVY5', 'instantPurge', 'rare')
};
