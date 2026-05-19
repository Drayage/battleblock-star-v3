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
  WIDE_JUNK: 'WIDE_JUNK'
};

export const BASE_TYPES = [TYPES.I, TYPES.J, TYPES.L, TYPES.O, TYPES.S, TYPES.T, TYPES.Z];

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
  [TYPES.GARBAGE]: '#4a4b56'
};

export const SHAPE_LIBRARY = {
  I: {
    name: 'I Shape',
    cells: 4,
    shape: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ]
  },
  J: {
    name: 'J Shape',
    cells: 4,
    shape: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
    ]
  },
  L: {
    name: 'L Shape',
    cells: 4,
    shape: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
    ]
  },
  O: {
    name: 'O Shape',
    cells: 4,
    shape: [
    [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]]
    ]
  },
  S: {
    name: 'S Shape',
    cells: 4,
    shape: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
    ]
  },
  T: {
    name: 'T Shape',
    cells: 4,
    shape: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
    ]
  },
  Z: {
    name: 'Z Shape',
    cells: 4,
    shape: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
    ]
  },
  CROSS5: {
    name: 'Cross Shape',
    cells: 5,
    shape: [
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]]
    ]
  },
  HEAVY5: {
    name: 'Heavy Shape',
    cells: 5,
    shape: [
    [[1,1,1],[0,1,0],[0,1,0]],
    [[0,0,1],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1],[1,0,0]]
    ]
  },
  WIDE6: {
    name: 'Wide Shape',
    cells: 6,
    shape: [
      [[1,1,1,1],[0,1,1,0]],
      [[0,1],[1,1],[1,1],[0,1]],
      [[0,1,1,0],[1,1,1,1]],
      [[1,0],[1,1],[1,1],[1,0]]
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
  [TYPES.WIDE_JUNK]: 'WIDE6'
}).map(([id, shapeId]) => [id, SHAPE_LIBRARY[shapeId].shape]));

export const ABILITY_LIBRARY = {
  none: { id: 'none', name: 'No ability', cellAttack: 0.1, traits: [], desc: 'Standard tetromino cell.' },
  highPower: { id: 'highPower', name: 'High Power', cellAttack: 0.3, traits: ['highPower'], desc: 'Cleared cells deal 0.3 attack.' },
  oddPower: { id: 'oddPower', name: 'Odd Power', cellAttack: 0.16, traits: ['oddShape'], desc: 'Larger awkward shape with higher return.' },
  bomb: { id: 'bomb', name: 'Bomb', cellAttack: 0.1, traits: ['bomb'], desc: 'Clearing this block destroys a 3x3 area centered on it.' },
  manaBonus: { id: 'manaBonus', name: 'Mana', cellAttack: 0.1, traits: ['manaBonus'], desc: 'Cleared cells grant bonus MP.' },
  purgeGarbage: { id: 'purgeGarbage', name: 'Cleanse', cellAttack: 0.1, traits: ['purgeGarbage'], desc: 'Clearing this block removes a garbage row.' },
  curse: { id: 'curse', name: 'Burden', cellAttack: 0.1, traits: ['curse'], desc: 'Awkward junk shape that clogs the deck.' },
  wideCurse: { id: 'wideCurse', name: 'Wide Burden', cellAttack: 0.1, traits: ['curse', 'wide'], desc: 'Six-cell obstruction that clogs the deck.' }
};

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
    rarity
  };
};

export const CARD_LIBRARY = {
  [TYPES.I]: blockCard(TYPES.I, 'I Mino', 'I'),
  [TYPES.J]: blockCard(TYPES.J, 'J Mino', 'J'),
  [TYPES.L]: blockCard(TYPES.L, 'L Mino', 'L'),
  [TYPES.O]: blockCard(TYPES.O, 'O Mino', 'O'),
  [TYPES.S]: blockCard(TYPES.S, 'S Mino', 'S'),
  [TYPES.T]: blockCard(TYPES.T, 'T Mino', 'T'),
  [TYPES.Z]: blockCard(TYPES.Z, 'Z Mino', 'Z'),
  [TYPES.POWER_I]: blockCard(TYPES.POWER_I, 'Power I', 'I', 'highPower', 'rare'),
  [TYPES.POWER_T]: blockCard(TYPES.POWER_T, 'Power T', 'T', 'highPower', 'rare'),
  [TYPES.POWER_S]: blockCard(TYPES.POWER_S, 'Power S', 'S', 'highPower', 'rare'),
  [TYPES.CROSS]: blockCard(TYPES.CROSS, 'Cross Mino', 'CROSS5', 'oddPower', 'rare'),
  [TYPES.BOMB]: blockCard(TYPES.BOMB, 'Bomb O', 'O', 'bomb', 'uncommon'),
  [TYPES.BOMB_I]: blockCard(TYPES.BOMB_I, 'Bomb I', 'I', 'bomb', 'rare'),
  [TYPES.MANA_T]: blockCard(TYPES.MANA_T, 'Mana T', 'T', 'manaBonus', 'uncommon'),
  [TYPES.MANA_L]: blockCard(TYPES.MANA_L, 'Mana L', 'L', 'manaBonus', 'uncommon'),
  [TYPES.PURGE_O]: blockCard(TYPES.PURGE_O, 'Cleanse O', 'O', 'purgeGarbage', 'rare'),
  [TYPES.CLEANSE_J]: blockCard(TYPES.CLEANSE_J, 'Cleanse J', 'J', 'purgeGarbage', 'rare'),
  [TYPES.HEAVY_JUNK]: blockCard(TYPES.HEAVY_JUNK, 'Heavy Junk', 'HEAVY5', 'curse', 'curse'),
  [TYPES.POWER_CROSS]: blockCard(TYPES.POWER_CROSS, 'Power Cross', 'CROSS5', 'highPower', 'rare'),
  [TYPES.WIDE_JUNK]: blockCard(TYPES.WIDE_JUNK, 'Wide Junk', 'WIDE6', 'wideCurse', 'curse')
};
