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
  PURGE_O: 'PURGE_O'
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
  [TYPES.GARBAGE]: '#4a4b56'
};

export const SHAPES = {
  [TYPES.I]: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  [TYPES.J]: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  [TYPES.L]: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ],
  [TYPES.O]: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  [TYPES.S]: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ],
  [TYPES.T]: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  [TYPES.Z]: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ],
  [TYPES.POWER_I]: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  [TYPES.CROSS]: [
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]]
  ],
  [TYPES.BOMB]: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  [TYPES.MANA_T]: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  [TYPES.PURGE_O]: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ]
};

export const CARD_LIBRARY = {
  [TYPES.I]: { id: TYPES.I, name: 'I Mino', shape: SHAPES[TYPES.I], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.J]: { id: TYPES.J, name: 'J Mino', shape: SHAPES[TYPES.J], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.L]: { id: TYPES.L, name: 'L Mino', shape: SHAPES[TYPES.L], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.O]: { id: TYPES.O, name: 'O Mino', shape: SHAPES[TYPES.O], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.S]: { id: TYPES.S, name: 'S Mino', shape: SHAPES[TYPES.S], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.T]: { id: TYPES.T, name: 'T Mino', shape: SHAPES[TYPES.T], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.Z]: { id: TYPES.Z, name: 'Z Mino', shape: SHAPES[TYPES.Z], cellAttack: 0.1, traits: [], rarity: 'base' },
  [TYPES.POWER_I]: { id: TYPES.POWER_I, name: '고화력 I', shape: SHAPES[TYPES.POWER_I], cellAttack: 0.3, traits: ['highPower'], rarity: 'rare' },
  [TYPES.CROSS]: { id: TYPES.CROSS, name: '기형 십자', shape: SHAPES[TYPES.CROSS], cellAttack: 0.16, traits: ['oddShape'], rarity: 'rare' },
  [TYPES.BOMB]: { id: TYPES.BOMB, name: '폭탄 O', shape: SHAPES[TYPES.BOMB], cellAttack: 0.1, traits: ['bomb'], rarity: 'uncommon' },
  [TYPES.MANA_T]: { id: TYPES.MANA_T, name: '마나 T', shape: SHAPES[TYPES.MANA_T], cellAttack: 0.1, traits: ['manaBonus'], rarity: 'uncommon' },
  [TYPES.PURGE_O]: { id: TYPES.PURGE_O, name: '정화 O', shape: SHAPES[TYPES.PURGE_O], cellAttack: 0.1, traits: ['purgeGarbage'], rarity: 'rare' }
};
