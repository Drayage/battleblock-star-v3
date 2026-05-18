import assert from 'node:assert/strict';
import { Deck } from './src/deck.js';
import { BASE_TYPES, TYPES } from './src/constants.js';
import { Board } from './src/board.js';
import { CONSUMABLES } from './src/consumables.js';
import { RELICS, applyReward, makeEnemyChoices, makeEventChoices, makeRewards, RunState, shouldShowEvent } from './src/progression.js';

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
survivalBoard.applyGarbage(1);
assert.equal(survivalBoard.defeated, false);

const blockedSpawnBoard = new Board({ rows: 20 });
blockedSpawnBoard.grid[1][3] = { type: TYPES.I, attack: 0.1, traits: [] };
blockedSpawnBoard.spawn();
assert.equal(blockedSpawnBoard.defeated, true);

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
eventRun.seenEvents.add('start');
assert.equal(shouldShowEvent(eventRun), null);
eventRun.round = 3;
assert.equal(shouldShowEvent(eventRun), 'after-2');
assert.equal(makeEventChoices(eventRun, 'after-2').length, 3);

const trimmedDeck = new Deck();
assert.equal(trimmedDeck.removeCard(TYPES.I), true);
trimmedDeck.refill();
assert.equal(trimmedDeck.draw.filter(id => id === TYPES.I).length, 2);

const itemBoard = new Board({ rows: 20 });
itemBoard.receiveGarbage(4);
CONSUMABLES.shield.use({ player: itemBoard });
assert.equal(itemBoard.garbageQueue, 0);

console.log('All Battle Block Star v3.0 checks passed.');
