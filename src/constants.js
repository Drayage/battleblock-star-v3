export const COLS = 10;
export const DEFAULT_ROWS = 20;
export const MAX_ROUND = 20;

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
  CROSS: 'CROSS',
  BOMB: 'BOMB',
  MANA_T: 'MANA_T',
  PURGE_O: 'PURGE_O',
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
  [TYPES.CROSS]: '#d8f7ff',
  [TYPES.BOMB]: '#ff6a22',
  [TYPES.MANA_T]: '#45f0bd',
  [TYPES.PURGE_O]: '#f5f2ff',
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
  [TYPES.CROSS]: 'CROSS5',
  [TYPES.BOMB]: 'O',
  [TYPES.MANA_T]: 'T',
  [TYPES.PURGE_O]: 'O',
  [TYPES.HEAVY_JUNK]: 'HEAVY5',
  [TYPES.POWER_CROSS]: 'CROSS5',
  [TYPES.WIDE_JUNK]: 'WIDE6'
}).map(([id, shapeId]) => [id, SHAPE_LIBRARY[shapeId].shape]));

export const ABILITY_LIBRARY = {
  none: { id: 'none', name: 'No ability', cellAttack: 0.1, traits: [], desc: 'Standard tetromino cell.' },
  highPower: { id: 'highPower', name: 'High Power', cellAttack: 0.3, traits: ['highPower'], desc: 'Cleared cells deal 0.3 attack.' },
  oddPower: { id: 'oddPower', name: 'Odd Power', cellAttack: 0.16, traits: ['oddShape'], desc: 'Larger awkward shape with higher return.' },
  bomb: { id: 'bomb', name: 'Bomb', cellAttack: 0.1, traits: ['bomb'], desc: 'Clearing this block destroys nearby garbage.' },
  manaBonus: { id: 'manaBonus', name: 'Mana', cellAttack: 0.1, traits: ['manaBonus'], desc: 'Cleared cells grant bonus MP.' },
  purgeGarbage: { id: 'purgeGarbage', name: 'Cleanse', cellAttack: 0.1, traits: ['purgeGarbage'], desc: 'Clearing this block removes a garbage row.' },
  curse: { id: 'curse', name: 'Burden', cellAttack: 0.04, traits: ['curse'], desc: 'Awkward junk with weak attack.' },
  wideCurse: { id: 'wideCurse', name: 'Wide Burden', cellAttack: 0.03, traits: ['curse', 'wide'], desc: 'Six-cell obstruction that clogs the deck.' }
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
  [TYPES.CROSS]: blockCard(TYPES.CROSS, 'Cross Mino', 'CROSS5', 'oddPower', 'rare'),
  [TYPES.BOMB]: blockCard(TYPES.BOMB, 'Bomb O', 'O', 'bomb', 'uncommon'),
  [TYPES.MANA_T]: blockCard(TYPES.MANA_T, 'Mana T', 'T', 'manaBonus', 'uncommon'),
  [TYPES.PURGE_O]: blockCard(TYPES.PURGE_O, 'Cleanse O', 'O', 'purgeGarbage', 'rare'),
  [TYPES.HEAVY_JUNK]: blockCard(TYPES.HEAVY_JUNK, 'Heavy Junk', 'HEAVY5', 'curse', 'curse'),
  [TYPES.POWER_CROSS]: blockCard(TYPES.POWER_CROSS, 'Power Cross', 'CROSS5', 'highPower', 'rare'),
  [TYPES.WIDE_JUNK]: blockCard(TYPES.WIDE_JUNK, 'Wide Junk', 'WIDE6', 'wideCurse', 'curse')
};
