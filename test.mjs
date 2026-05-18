import assert from 'node:assert/strict';
import { Deck } from './src/deck.js';
import { CARD_LIBRARY, BASE_TYPES, TYPES } from './src/constants.js';
import { Board, Mino, SPAWN_Y } from './src/board.js';
import { CONSUMABLES } from './src/consumables.js';
import { RELICS, applyReward, makeEnemyChoices, makeEventChoices, makeRewards, removableDeckCards, RunState, shouldShowEvent, upgradeDeckCards } from './src/progression.js';

const deck = new Deck();
const cycle = deck.draw.slice(0, 21);
for (let i = 0; i < 3; i++) {
  const bag = cycle.slice(i * 7, i * 7 + 7).sort();
  assert.deepEqual(bag, [...BASE_TYPES].sort(), `bag ${i + 1} should contain every base mino once`);
}

const board = new Board({ rows: 20 });
board.grid[19] = Array.from({ length: 10 }, () => ({ type: TYPES.I, attack: 0.1, traits: [] }));
board.grid[19][0] = { type: TYPES.POWER_I, attack: 0.3, traits: ['highPower'] };
const clear = board.clearLines();
assert.equal(clear.cleared, 1);
assert.equal(clear.attack, 1.2);
assert.equal(clear.mana, 0.5);

const garbageBoard = new Board({ rows: 20 });
for (let r = 17; r < 20; r++) {
  garbageBoard.grid[r] = Array.from({ length: 10 }, () => ({ type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] }));
}
assert.equal(garbageBoard.purgeGarbageRows(3), 3);
assert.equal(garbageBoard.grid.slice(17).some(row => row.some(Boolean)), false);

const survivalBoard = new Board({ rows: 20 });
survivalBoard.grid[0][0] = { type: TYPES.I, attack: 0.1, traits: [] };
assert.equal(survivalBoard.defeated, false);

const garbageOverflowBoard = new Board({ rows: 20 });
garbageOverflowBoard.grid[0][0] = { type: TYPES.I, attack: 0.1, traits: [] };
garbageOverflowBoard.applyGarbage(1);
assert.equal(garbageOverflowBoard.defeated, true);

const garbageSurvivalBoard = new Board({ rows: 20 });
garbageSurvivalBoard.grid[1][0] = { type: TYPES.I, attack: 0.1, traits: [] };
garbageSurvivalBoard.applyGarbage(1);
assert.equal(garbageSurvivalBoard.defeated, false);
assert.equal(survivalBoard.defeated, false);

const spawnBufferBoard = new Board({ rows: 20 });
assert.equal(spawnBufferBoard.current.y, SPAWN_Y);
assert.equal(spawnBufferBoard.defeated, false);
assert.equal(spawnBufferBoard.move(0, 1), true);
assert.equal(spawnBufferBoard.move(0, 1), true);
assert.equal(spawnBufferBoard.current.y, 0);

const blockedSpawnBoard = new Board({ rows: 20 });
blockedSpawnBoard.nextQueue = [CARD_LIBRARY[TYPES.O]];
blockedSpawnBoard.spawn();
const topOut = blockedSpawnBoard.lock();
assert.equal(topOut.topOut, true);
assert.equal(blockedSpawnBoard.defeated, true);

const expandedPersist = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
expandedPersist[19][0] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const expandedBoard = new Board({ rows: 25, persistentGrid: expandedPersist });
assert.equal(expandedBoard.rows, 25);
assert.equal(expandedBoard.grid.length, 25);
assert.equal(expandedBoard.grid[24][0].type, TYPES.GARBAGE);
assert.equal(expandedBoard.defeated, false);

assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].shapeId, 'CROSS5');
assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.WIDE_JUNK].cellCount, 6);
assert.equal(CARD_LIBRARY[TYPES.POWER_T].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.BOMB_I].shapeId, 'I');
assert.equal(CARD_LIBRARY[TYPES.CLEANSE_J].abilityId, 'purgeGarbage');

const tetrisBoard = new Board({ rows: 20 });
tetrisBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
for (let r = 16; r < 20; r++) {
  tetrisBoard.grid[r] = Array.from({ length: 10 }, (_, c) => c === 5 ? null : { type: TYPES.I, attack: 0.1, traits: [] });
}
tetrisBoard.current = new Mino(CARD_LIBRARY[TYPES.I], 3, 16);
tetrisBoard.current.rot = 1;
const tetrisClear = tetrisBoard.lock();
assert.equal(tetrisClear.cleared, 4);
assert.equal(tetrisClear.tetris, true);
assert.equal(tetrisClear.attack, 6);

const tSpinBoard = new Board({ rows: 20 });
tSpinBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
tSpinBoard.grid[19] = Array.from({ length: 10 }, (_, c) => [4, 5, 6].includes(c) ? null : { type: TYPES.I, attack: 0.1, traits: [] });
tSpinBoard.grid[18][4] = { type: TYPES.I, attack: 0.1, traits: [] };
tSpinBoard.grid[18][6] = { type: TYPES.I, attack: 0.1, traits: [] };
tSpinBoard.grid[19][4] = { type: TYPES.I, attack: 0.1, traits: [] };
tSpinBoard.current = new Mino(CARD_LIBRARY[TYPES.T], 4, 18);
tSpinBoard.lastMoveWasRotate = true;
const tSpinClear = tSpinBoard.lock();
assert.equal(tSpinClear.cleared, 1);
assert.equal(tSpinClear.tSpin, true);
assert.equal(tSpinClear.attack, 1.2);

const run = new RunState();
const persistBoard = new Board({ rows: 20, deck: run.deck });
persistBoard.grid[18][0] = { type: TYPES.I, attack: 0.1, traits: [] };
persistBoard.grid[19][0] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const persisted = persistBoard.grid.map(row => row.map(cell => cell?.type === TYPES.GARBAGE ? { ...cell } : null));
assert.equal(persisted[18][0], null);
assert.equal(persisted[19][0].type, TYPES.GARBAGE);

assert.equal(makeEnemyChoices(1).every(enemy => enemy.startingRows === 15), true);
assert.equal(makeRewards('normal').every(reward => reward.kind === 'card'), true);
assert.equal(makeRewards('elite').some(reward => reward.kind === 'relic'), true);

const relicRun = new RunState();
applyReward(relicRun, { kind: 'relic', id: 'combo_amp' });
assert.equal(relicRun.relics.includes('combo_amp'), true);
assert.equal(RELICS.combo_amp.name, 'Combo Amplifier');

const eventRun = new RunState();
assert.equal(shouldShowEvent(eventRun), 'start');
eventRun.deck.addCard(TYPES.HEAVY_JUNK);
assert.equal(removableDeckCards(eventRun)[0], TYPES.HEAVY_JUNK);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.I && upgrade.to === TYPES.POWER_I), true);
assert.equal(makeEventChoices(eventRun, 'start').some(choice => choice.kind === 'upgradeCard'), true);

const baseRemoveRun = new RunState();
assert.notEqual(removableDeckCards(baseRemoveRun)[0], TYPES.I);
eventRun.seenEvents.add('start');
assert.equal(shouldShowEvent(eventRun), null);
eventRun.round = 3;
assert.equal(shouldShowEvent(eventRun), 'after-2');
assert.equal(makeEventChoices(eventRun, 'after-2').length, 3);

const trimmedDeck = new Deck();
assert.equal(trimmedDeck.removeCard(TYPES.I), true);
trimmedDeck.refill();
assert.equal(trimmedDeck.draw.filter(id => id === TYPES.I).length, 2);

const savedDeck = Deck.fromState(trimmedDeck.toState());
assert.deepEqual(savedDeck.draw, trimmedDeck.draw);
assert.deepEqual(savedDeck.removedBase, trimmedDeck.removedBase);

const savedBoard = Board.fromState(tetrisBoard.toState());
assert.equal(savedBoard.rows, tetrisBoard.rows);
assert.equal(savedBoard.current.card.id, tetrisBoard.current.card.id);
assert.equal(savedBoard.deck.draw.length, tetrisBoard.deck.draw.length);

const itemBoard = new Board({ rows: 20 });
itemBoard.receiveGarbage(4);
CONSUMABLES.shield.use({ player: itemBoard });
assert.equal(itemBoard.garbageQueue, 0);

console.log('All Battle Block Star v3.0 checks passed.');
