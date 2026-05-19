import assert from 'node:assert/strict';
import { Deck } from './src/deck.js';
import { CARD_LIBRARY, BASE_TYPES, TIERS, TYPES } from './src/constants.js';
import { Board, Mino, SPAWN_Y } from './src/board.js';
import { AI } from './src/ai.js';
import { CONSUMABLES } from './src/consumables.js';
import { SKILLS } from './src/skills.js';
import { RELICS, applyReward, grantEliteRelic, makeEnemy, makeEnemyChoices, makeEventChoices, makeRewards, makeShopItems, removableDeckCards, RunState, shopItemKey, shouldShowEvent, upgradeDeckCards } from './src/progression.js';

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
assert.equal(clear.mana, 5);
assert.equal(CARD_LIBRARY[TYPES.HEAVY_JUNK].cellAttack, 0.1);
assert.equal(CARD_LIBRARY[TYPES.WIDE_JUNK].cellAttack, 0.1);

const bombBoard = new Board({ rows: 20 });
bombBoard.grid[18][3] = { type: TYPES.I, attack: 0.1, traits: [] };
bombBoard.grid[18][4] = { type: TYPES.I, attack: 0.1, traits: [] };
bombBoard.grid[18][5] = { type: TYPES.I, attack: 0.1, traits: [] };
bombBoard.grid[18][6] = { type: TYPES.I, attack: 0.1, traits: [] };
bombBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.BOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['bomb'] : [] }));
const bombClear = bombBoard.clearLines();
assert.equal(bombClear.cleared, 1);
assert.equal(bombBoard.grid[19][3], null);
assert.equal(bombBoard.grid[19][4], null);
assert.equal(bombBoard.grid[19][5], null);
assert.notEqual(bombBoard.grid[19][6], null);
assert.equal(bombBoard.bombFx.length, 1);

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

const alignedGarbageBoard = new Board({ rows: 20 });
alignedGarbageBoard.applyGarbage(4);
const garbageHoles = alignedGarbageBoard.grid.slice(-4).map(row => row.findIndex(cell => !cell));
assert.equal(new Set(garbageHoles).size, 1);

const lethalQueuedBoard = new Board({ rows: 20 });
lethalQueuedBoard.grid[4][0] = { type: TYPES.I, attack: 0.1, traits: [] };
lethalQueuedBoard.receiveGarbage(5);
assert.equal(lethalQueuedBoard.garbageQueue, 5);
assert.equal(lethalQueuedBoard.defeated, false);
lethalQueuedBoard.tickGarbage(3000);
lethalQueuedBoard.applyReadyGarbage();
assert.equal(lethalQueuedBoard.garbageQueue, 0);
assert.equal(lethalQueuedBoard.defeated, true);

const nonlethalQueuedBoard = new Board({ rows: 20 });
nonlethalQueuedBoard.grid[4][0] = { type: TYPES.I, attack: 0.1, traits: [] };
nonlethalQueuedBoard.receiveGarbage(4);
assert.equal(nonlethalQueuedBoard.garbageQueue, 4);
assert.equal(nonlethalQueuedBoard.defeated, false);
nonlethalQueuedBoard.tickGarbage(2999);
assert.equal(nonlethalQueuedBoard.readyGarbage(), 0);
nonlethalQueuedBoard.tickGarbage(1);
assert.equal(nonlethalQueuedBoard.readyGarbage(), 4);

const cancelQueuedBoard = new Board({ rows: 20 });
cancelQueuedBoard.receiveGarbage(4);
assert.equal(cancelQueuedBoard.cancelGarbage(2), 2);
cancelQueuedBoard.tickGarbage(3000);
cancelQueuedBoard.applyReadyGarbage();
assert.equal(cancelQueuedBoard.garbageQueue, 0);
assert.equal(cancelQueuedBoard.grid.slice(-2).every(row => row.filter(Boolean).length === 9), true);

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

const stalledEnemyBoard = new Board({ rows: 20 });
stalledEnemyBoard.grid[0] = Array.from({ length: 10 }, () => ({ type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] }));
stalledEnemyBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 3, SPAWN_Y);
const stalledAi = new AI('fast');
let stalledResult = null;
for (let i = 0; i < 12 && !stalledResult; i++) stalledResult = stalledAi.step(stalledEnemyBoard);
assert.equal(stalledResult.topOut, true);
assert.equal(stalledEnemyBoard.defeated, true);

const queuedMoveBoard = new Board({ rows: 20 });
const queuedMoveAi = new AI('balanced');
queuedMoveAi.lastPlanCard = `${queuedMoveBoard.current.card.id}-${queuedMoveBoard.current.x}-${queuedMoveBoard.current.y}-none`;
queuedMoveAi.queue = ['left', 'hard'];
const queuedMoveResult = queuedMoveAi.step(queuedMoveBoard);
assert.equal(queuedMoveResult, null);
assert.equal(queuedMoveBoard.current.x, 2);
assert.equal(queuedMoveBoard.grid.some(row => row.some(Boolean)), false);

const nearCeilingBoard = new Board({ rows: 20 });
nearCeilingBoard.grid = Array.from({ length: 20 }, (_, r) => Array.from({ length: 10 }, (_, c) => r >= 2 && c !== 5 ? { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] } : null));
nearCeilingBoard.current = new Mino(CARD_LIBRARY[TYPES.I], 3, SPAWN_Y);
const survivalAi = new AI('plonk');
let nearCeilingResult = null;
for (let i = 0; i < 12 && !nearCeilingResult; i++) nearCeilingResult = survivalAi.step(nearCeilingBoard);
assert.notEqual(nearCeilingResult?.topOut, true);
assert.equal(nearCeilingBoard.defeated, false);
const pressureAi = new AI('balanced', { mistakeRate: 0.1, holdMistakeRate: 0.2 });
pressureAi.setPressure({ mistake: 0.12, noise: 1.5, hold: 0.18 });
assert.deepEqual(pressureAi.pressure, { mistake: 0.12, noise: 1.5, hold: 0.18 });

const expandedPersist = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
expandedPersist[19][0] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const expandedBoard = new Board({ rows: 25, persistentGrid: expandedPersist });
assert.equal(expandedBoard.rows, 25);
assert.equal(expandedBoard.grid.length, 25);
assert.equal(expandedBoard.grid[24][0].type, TYPES.GARBAGE);
assert.equal(expandedBoard.defeated, false);

assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].shapeId, 'CROSS5');
assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].tier, TIERS.GOLD);
assert.equal(CARD_LIBRARY[TYPES.MANA_T].tier, TIERS.SILVER);
assert.equal(CARD_LIBRARY[TYPES.WIDE_JUNK].cellCount, 6);
assert.equal(CARD_LIBRARY[TYPES.POWER_T].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.BOMB_I].shapeId, 'I');
assert.equal(CARD_LIBRARY[TYPES.CLEANSE_J].abilityId, 'purgeGarbage');
assert.equal(CARD_LIBRARY[TYPES.INSTANT_STRIKE].cellAttack, 0.1);
assert.equal(CARD_LIBRARY[TYPES.INSTANT_STRIKE].onPlace.attack, 1.2);
assert.equal(CARD_LIBRARY[TYPES.INSTANT_GUARD].onPlace.cancelGarbage, 3);
assert.equal(CARD_LIBRARY[TYPES.INSTANT_MANA].onPlace.mana, 18);
assert.equal(CARD_LIBRARY[TYPES.INSTANT_PURGE].onPlace.purgeGarbageRows, 1);

const instantStrikeBoard = new Board({ rows: 20 });
instantStrikeBoard.current = new Mino(CARD_LIBRARY[TYPES.INSTANT_STRIKE], 3, 8);
const instantStrike = instantStrikeBoard.lock();
assert.equal(instantStrike.cleared, 0);
assert.equal(instantStrike.attack, 1.2);
assert.equal(instantStrikeBoard.grid[10][3].attack, 0.1);

const instantGuardBoard = new Board({ rows: 20 });
instantGuardBoard.receiveGarbage(4);
instantGuardBoard.current = new Mino(CARD_LIBRARY[TYPES.INSTANT_GUARD], 3, 8);
const instantGuard = instantGuardBoard.lock();
assert.equal(instantGuard.instant.canceled, 3);
assert.equal(instantGuardBoard.garbageQueue, 1);

const instantManaBoard = new Board({ rows: 20 });
instantManaBoard.mp = 5;
instantManaBoard.current = new Mino(CARD_LIBRARY[TYPES.INSTANT_MANA], 3, 8);
const instantMana = instantManaBoard.lock();
assert.equal(instantMana.instant.mana, 18);
assert.equal(instantManaBoard.mp, 23);

const instantPurgeBoard = new Board({ rows: 20 });
instantPurgeBoard.grid[19] = Array.from({ length: 10 }, (_, c) => c === 0 ? null : { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] });
instantPurgeBoard.current = new Mino(CARD_LIBRARY[TYPES.INSTANT_PURGE], 3, 8);
const instantPurge = instantPurgeBoard.lock();
assert.equal(instantPurge.instant.purgedRows, 1);
assert.equal(instantPurgeBoard.grid[19].some(Boolean), false);

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
assert.equal(tetrisClear.clearText, 'QUAD');
assert.equal(tetrisBoard.clearText, 'QUAD');
assert.equal(tetrisBoard.clearTextFlash > 0, true);

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
assert.equal(tSpinClear.clearText, 'T-SPIN');

const comboBreakBoard = new Board({ rows: 20 });
comboBreakBoard.combo = 3;
comboBreakBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 4, 0);
const comboBreak = comboBreakBoard.lock();
assert.equal(comboBreak.comboBreak, 3);
assert.equal(comboBreakBoard.combo, 0);
assert.equal(comboBreakBoard.comboBreakFlash > 0, true);

const queuedGarbageBoard = new Board({ rows: 20 });
queuedGarbageBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
queuedGarbageBoard.grid[0][0] = { type: TYPES.I, attack: 0.1, traits: [] };
queuedGarbageBoard.grid[19] = Array.from({ length: 10 }, (_, c) => [4, 5].includes(c) ? null : { type: TYPES.I, attack: 0.1, traits: [] });
queuedGarbageBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 4, 18);
queuedGarbageBoard.garbageQueue = 3;
const queuedClear = queuedGarbageBoard.lock();
assert.equal(queuedClear.cleared, 1);
assert.equal(queuedGarbageBoard.garbageQueue, 0);
assert.equal(queuedGarbageBoard.defeated, true);

const run = new RunState();
const persistBoard = new Board({ rows: 20, deck: run.deck });
persistBoard.grid[18][0] = { type: TYPES.I, attack: 0.1, traits: [] };
persistBoard.grid[19][0] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const persisted = persistBoard.grid.map(row => row.map(cell => cell?.type === TYPES.GARBAGE ? { ...cell } : null));
assert.equal(persisted[18][0], null);
assert.equal(persisted[19][0].type, TYPES.GARBAGE);

const roundOneEnemies = makeEnemyChoices(1);
assert.equal(roundOneEnemies.every(enemy => enemy.startingRows <= 13), true);
assert.equal(roundOneEnemies.every(enemy => !enemy.name.includes('Bomb') && !enemy.name.includes('Thief') && !enemy.name.includes('Warden')), true);
const speedDrone = makeEnemy(1, false, { name: 'Speed Drone', style: '', profile: 'fast', rows: -8, speed: 365, garbage: 0, risk: 1.55, rewardBonus: 6, openingRows: 12 });
const lineHunter = makeEnemy(1, false, { name: 'Line Hunter', style: '', profile: 'balanced', rows: -5, speed: 485, garbage: 0, risk: 1, rewardBonus: 1, openingRows: 14 });
assert.equal(speedDrone.startingRows < lineHunter.startingRows, true);
assert.equal(speedDrone.rewardGold > lineHunter.rewardGold, true);
const tunedSpeedDrone = makeEnemy(1, false, { name: 'Speed Drone', style: '', profile: 'fast', rows: -10, speed: 390, garbage: 0, risk: 1.55, rewardBonus: 8, openingRows: 10, aiSkill: { mistakeRate: 0.18, noise: 2.8, hesitateRate: 0.12 } });
assert.equal(tunedSpeedDrone.startingRows, 10);
assert.equal(tunedSpeedDrone.aiSkill.mistakeRate > 0.1, true);
assert.equal(tunedSpeedDrone.aiSkill.holdMistakeRate > 0.08, true);
assert.equal(tunedSpeedDrone.speed > 300, true);
const openerEnemy = makeEnemy(3, false, { name: 'Opener Script', style: '', profile: 'opener', rows: -9, speed: 300, garbage: 0, risk: 1.85, rewardBonus: 10, openingRows: 11, minRound: 3, deckExtras: [TYPES.POWER_T] });
assert.equal(openerEnemy.aiProfile, 'opener');
assert.equal(openerEnemy.speed < lineHunter.speed, true);
const strideEnemy = makeEnemy(6, false, { name: 'Stride Engine', tier: TIERS.GOLD, style: '', profile: 'stride', rows: -2, speed: 340, garbage: 1, risk: 1.65, rewardBonus: 7, deckExtras: [TYPES.POWER_I, TYPES.POWER_T] });
assert.equal(strideEnemy.aiProfile, 'stride');
assert.equal(strideEnemy.rewardGold > lineHunter.rewardGold, true);
assert.equal(strideEnemy.tier, TIERS.GOLD);
assert.equal(makeEnemy(6, false, { name: 'Soft Starter', style: '', profile: 'balanced', rows: -6, speed: 540, garbage: 0, risk: 0.75, openingRows: 13 }).startingRows > makeEnemy(5, false, { name: 'Soft Starter', style: '', profile: 'balanced', rows: -6, speed: 540, garbage: 0, risk: 0.75, openingRows: 13 }).startingRows, true);
assert.equal(makeEnemy(11, false, { name: 'Line Hunter', style: '', profile: 'balanced', rows: -5, speed: 485, garbage: 0, risk: 1, openingRows: 14 }).startingGarbage > makeEnemy(10, false, { name: 'Line Hunter', style: '', profile: 'balanced', rows: -5, speed: 485, garbage: 0, risk: 1, openingRows: 14 }).startingGarbage, true);
assert.equal(makeRewards('normal').every(reward => reward.kind === 'card'), true);
assert.equal(makeRewards('elite').every(reward => reward.kind === 'card'), true);
assert.equal(makeRewards('elite').some(reward => reward.tier !== TIERS.BRONZE), true);
assert.equal(Object.values(SKILLS).every(skill => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(skill.tier)), true);
assert.equal(Object.values(CONSUMABLES).every(item => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(item.tier)), true);
assert.equal(Object.values(RELICS).every(relic => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(relic.tier)), true);

const shopRun = new RunState();
shopRun.round = 12;
const shopItems = makeShopItems(shopRun);
const shopGoldCard = shopItems.find(item => item.kind === 'card' && CARD_LIBRARY[item.id].tier === TIERS.GOLD);
const shopSilverCard = shopItems.find(item => item.kind === 'card' && CARD_LIBRARY[item.id].tier === TIERS.SILVER);
if (shopGoldCard && shopSilverCard) assert.equal(shopGoldCard.price > shopSilverCard.price, true);
const secondShopItems = makeShopItems(shopRun);
assert.deepEqual(secondShopItems, shopItems);
shopRun.shopStock[String(shopRun.round)].sold.push(shopItemKey(shopItems[0]));
assert.equal(shopRun.shopStock[String(shopRun.round)].sold.includes(shopItemKey(shopItems[0])), true);

const relicRun = new RunState();
applyReward(relicRun, { kind: 'relic', id: 'combo_amp' });
assert.equal(relicRun.relics.includes('combo_amp'), true);
assert.equal(typeof RELICS.combo_amp.name, 'string');
assert.equal(RELICS.combo_amp.name.length > 0, true);
const eliteRelicRun = new RunState();
const eliteRelicId = grantEliteRelic(eliteRelicRun);
assert.equal(RELICS[eliteRelicId].tier !== TIERS.BRONZE, true);
assert.equal(eliteRelicRun.relics.includes(eliteRelicId), true);

const eventRun = new RunState();
assert.equal(shouldShowEvent(eventRun), 'starter');
eventRun.starterPicked = true;
eventRun.deck.addCard(TYPES.HEAVY_JUNK);
assert.equal(removableDeckCards(eventRun).includes(TYPES.HEAVY_JUNK), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.I && upgrade.to === TYPES.POWER_I), true);
assert.equal(upgradeDeckCards(eventRun).every(upgrade => CARD_LIBRARY[upgrade.from].shapeId === CARD_LIBRARY[upgrade.to].shapeId), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.O && upgrade.to === TYPES.PURGE_O), true);
assert.equal(makeEventChoices(eventRun, 'start').some(choice => choice.kind === 'upgradeCard'), true);
assert.equal(makeEventChoices(eventRun, 'start').every(choice => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(choice.tier)), true);
assert.equal(Array.from({ length: 20 }, () => makeEventChoices(eventRun, 'start')).some(choices => choices.some(choice => choice.kind === 'skill')), true);

const baseRemoveRun = new RunState();
assert.equal(removableDeckCards(baseRemoveRun).length, BASE_TYPES.length);
assert.equal(BASE_TYPES.every(id => removableDeckCards(baseRemoveRun).includes(id)), true);
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

const emptyPurgeBoard = new Board({ rows: 20 });
assert.equal(SKILLS.purge.activate({ player: emptyPurgeBoard }), false);
const holdEnemy = { holdLocked: false };
let scheduled = null;
const fakeGame = {
  enemy: holdEnemy,
  scheduleBattleTimeout(fn) {
    scheduled = fn;
  }
};
assert.equal(SKILLS.hold_lock.activate({ game: fakeGame, enemy: holdEnemy }), true);
assert.equal(holdEnemy.holdLocked, true);
fakeGame.enemy = {};
scheduled();
assert.equal(holdEnemy.holdLocked, true);

console.log('All Battle Block Star v3.0 checks passed.');
