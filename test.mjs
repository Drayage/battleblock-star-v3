import assert from 'node:assert/strict';
import { Deck } from './src/deck.js';
import { CARD_LIBRARY, BASE_TYPES, TIERS, TYPES, SET_DEFINITIONS, SET_RELICS } from './src/constants.js';
import { Board, Mino, SPAWN_Y } from './src/board.js';
import { AI, canReachCandidate } from './src/ai.js';
import { CONSUMABLES } from './src/consumables.js';
import { SKILLS } from './src/skills.js';
import { RELICS, applyReward, completedAbilitySets, grantEliteRelic, isShopRound, makeBoss, makeEnemy, makeEnemyChoices, makeEventChoices, makeRewards, makeShopItems, removableDeckCards, rerollShopStock, restockShopItem, RunState, setProgress, shopItemKey, shouldShowEvent, upgradeDeckCards } from './src/progression.js';

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
queuedMoveAi.queue = ['left', 'hard'];
queuedMoveAi.lastPlanCard = queuedMoveAi.cacheKey(queuedMoveBoard);
const queuedMoveResult = queuedMoveAi.step(queuedMoveBoard);
assert.equal(queuedMoveResult, null);
assert.equal(queuedMoveAi.lastAction, 'left');
assert.equal(queuedMoveBoard.current.x, 2);
assert.equal(queuedMoveBoard.grid.some(row => row.some(Boolean)), false);

const unreachableBoard = new Board({ rows: 20 });
unreachableBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 3, 10);
unreachableBoard.grid[10][2] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
unreachableBoard.grid[11][2] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
assert.equal(unreachableBoard.ok(new Mino(CARD_LIBRARY[TYPES.O], 0, 10)), true);
assert.equal(canReachCandidate(unreachableBoard, { x: 0, rot: 0, hold: false }), false);

const stalePlanBoard = new Board({ rows: 20 });
const stalePlanAi = new AI('balanced');
stalePlanAi.queue = ['left'];
stalePlanAi.lastPlanCard = stalePlanAi.cacheKey(stalePlanBoard);
stalePlanBoard.nextQueue[0] = CARD_LIBRARY[TYPES.Z];
stalePlanAi.step(stalePlanBoard);
assert.equal(stalePlanAi.lastPlanCard.includes('|none|Z/'), true);

const nearCeilingBoard = new Board({ rows: 20 });
nearCeilingBoard.grid = Array.from({ length: 20 }, (_, r) => Array.from({ length: 10 }, (_, c) => r >= 2 && c !== 5 ? { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] } : null));
nearCeilingBoard.current = new Mino(CARD_LIBRARY[TYPES.I], 3, SPAWN_Y);
const survivalAi = new AI('plonk');
let nearCeilingResult = null;
for (let i = 0; i < 12 && !nearCeilingResult; i++) nearCeilingResult = survivalAi.step(nearCeilingBoard);
assert.notEqual(nearCeilingResult?.topOut, true);
assert.equal(nearCeilingBoard.defeated, false);
const pressureAi = new AI('balanced');
pressureAi.setPressure({ mistake: 0.12, noise: 1.5, hold: 0.18 });
const holdLimitBoard = new Board({ rows: 20 });
const holdLimitAi = new AI('balanced');
holdLimitAi.queue = ['hold'];
holdLimitAi.lastPlanCard = holdLimitAi.cacheKey(holdLimitBoard);
holdLimitAi.step(holdLimitBoard);
const heldOnce = holdLimitBoard.held.id;
const currentAfterHold = holdLimitBoard.current.card.id;
holdLimitBoard.holdUsed = false;
holdLimitAi.queue = ['hold'];
holdLimitAi.lastPlanCard = holdLimitAi.cacheKey(holdLimitBoard);
holdLimitAi.step(holdLimitBoard);
assert.equal(holdLimitBoard.held.id, heldOnce);
assert.equal(holdLimitBoard.current.card.id, currentAfterHold);

const expandedPersist = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
expandedPersist[19][0] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const expandedBoard = new Board({ rows: 25, persistentGrid: expandedPersist });
assert.equal(expandedBoard.rows, 25);
assert.equal(expandedBoard.grid.length, 25);
assert.equal(expandedBoard.grid[24][0].type, TYPES.GARBAGE);
assert.equal(expandedBoard.defeated, false);

assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].shapeId, 'CROSS5');
assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.POWER_CROSS].tier, TIERS.SILVER);
assert.equal(CARD_LIBRARY[TYPES.MANA_T].tier, TIERS.SILVER);
assert.equal(CARD_LIBRARY[TYPES.POWER_T].tier, TIERS.GOLD);
assert.equal(CARD_LIBRARY[TYPES.MANA_L].tier, TIERS.SILVER);
assert.equal(CARD_LIBRARY[TYPES.BOUNTY].tier, TIERS.SILVER);
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
for (const pool of ['normal', 'silver', 'gold', 'elite', 'elite:gold']) {
  for (let i = 0; i < 20; i++) assert.equal(makeRewards(pool).some(reward => reward.id === TYPES.CROSS), false);
}
assert.equal(isShopRound(5), false);
assert.equal(isShopRound(6), true);
assert.equal(isShopRound(10), false);
assert.equal(isShopRound(11), true);
assert.equal(isShopRound(19), false);
assert.equal(isShopRound(20), true);
assert.equal(Object.values(SKILLS).every(skill => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(skill.tier)), true);
assert.equal(Object.values(CONSUMABLES).every(item => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(item.tier)), true);
assert.equal(Object.values(RELICS).every(relic => [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD].includes(relic.tier)), true);

const shopRun = new RunState();
shopRun.round = 12;
const shopItems = makeShopItems(shopRun);
const shopGoldCard = shopItems.find(item => item.kind === 'card' && CARD_LIBRARY[item.id].tier === TIERS.GOLD);
const shopSilverCard = shopItems.find(item => item.kind === 'card' && CARD_LIBRARY[item.id].tier === TIERS.SILVER);
if (shopGoldCard && shopSilverCard) assert.equal(shopGoldCard.price > shopSilverCard.price, true);
assert.equal(shopItems.some(item => item.kind === 'card' && item.id === TYPES.CROSS), false);
assert.equal(shopItems.some(item => item.kind === 'removeChoice' && item.title === '정밀 덱 수술' && item.tier === TIERS.GOLD), true);
const secondShopItems = makeShopItems(shopRun);
assert.deepEqual(secondShopItems, shopItems);
assert.equal(shopRun.shopStock[String(shopRun.round)].locked.length, 0);
assert.equal(shopItems.some(item => shopItemKey(item) === shopRun.shopStock[String(shopRun.round)].dealKey), true);
shopRun.shopStock[String(shopRun.round)].sold.push(shopItemKey(shopItems[0]));
assert.equal(shopRun.shopStock[String(shopRun.round)].sold.includes(shopItemKey(shopItems[0])), true);
shopRun.shopStock[String(shopRun.round)].locked.push(shopItemKey(shopItems[1]));
const rerolledStock = rerollShopStock(shopRun);
assert.equal(rerolledStock.locked.includes(shopItemKey(shopItems[1])), true);
assert.equal(rerolledStock.items.some(item => shopItemKey(item) === shopItemKey(shopItems[1])), true);
assert.equal('dealKey' in rerolledStock, false);

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
assert.equal(shouldShowEvent(eventRun), 'start');
assert.equal(removableDeckCards(eventRun).includes(TYPES.HEAVY_JUNK), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.I && upgrade.to === TYPES.POWER_I), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.I && upgrade.to === TYPES.MANA_I), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.J && upgrade.to === TYPES.COOLANT_J), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.L && upgrade.to === TYPES.POWER_L), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.O && upgrade.to === TYPES.BOUNTY_O), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.S && upgrade.to === TYPES.CLEANSE_S), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.T && upgrade.to === TYPES.BOMB_T), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.Z && upgrade.to === TYPES.CHAIN_Z), true);
assert.equal(upgradeDeckCards(eventRun).every(upgrade => CARD_LIBRARY[upgrade.from].shapeId === CARD_LIBRARY[upgrade.to].shapeId), true);
assert.equal(upgradeDeckCards(eventRun).some(upgrade => upgrade.from === TYPES.O && upgrade.to === TYPES.PURGE_O), true);
assert.equal(makeEventChoices(eventRun, 'start').some(choice => choice.kind === 'upgradeCard'), true);
const removeChoice = makeEventChoices(eventRun, 'start').find(choice => choice.kind === 'removeCard');
assert.equal(!!removeChoice && removeChoice.tier === TIERS.BRONZE && !!removeChoice.id, true);
assert.equal(makeEventChoices(eventRun, 'start').some(choice => choice.kind === 'removeChoice'), false);
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
eventRun.round = 21;
assert.equal(shouldShowEvent(eventRun), null);
const contractChoices = Array.from({ length: 40 }, () => makeEventChoices(eventRun, 'after-2')).flat().filter(choice => choice.kind === 'contract');
if (contractChoices.length) assert.equal(contractChoices.every(choice => choice.desc.includes(CARD_LIBRARY[choice.id].name) && choice.desc.includes('배치 즉시')), true);

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

// --- 1차 신규 콘텐츠 ---

// Z 보강 4종
assert.equal(CARD_LIBRARY[TYPES.POWER_Z].shapeId, 'Z');
assert.equal(CARD_LIBRARY[TYPES.POWER_Z].abilityId, 'highPower');
assert.equal(CARD_LIBRARY[TYPES.POWER_Z].cellAttack, 0.3);
assert.equal(CARD_LIBRARY[TYPES.MANA_Z].abilityId, 'manaBonus');
assert.equal(CARD_LIBRARY[TYPES.BOMB_Z].traits.includes('bomb'), true);
assert.equal(CARD_LIBRARY[TYPES.CLEANSE_Z].abilityId, 'purgeGarbage');

// 7종 기본 모양별 특수 블록 보강
const addedShapeSpecials = [
  [TYPES.MANA_I, 'I', TIERS.GOLD, 'manaBonus'],
  [TYPES.CHAIN_I, 'I', TIERS.GOLD, 'chain'],
  [TYPES.COOLANT_J, 'J', TIERS.SILVER, 'coolant'],
  [TYPES.BOMB_J, 'J', TIERS.GOLD, 'bomb'],
  [TYPES.POWER_L, 'L', TIERS.GOLD, 'highPower'],
  [TYPES.BOMB_L, 'L', TIERS.GOLD, 'bomb'],
  [TYPES.BOUNTY_O, 'O', TIERS.SILVER, 'bounty'],
  [TYPES.MANA_O, 'O', TIERS.SILVER, 'manaBonus'],
  [TYPES.CLEANSE_S, 'S', TIERS.SILVER, 'purgeGarbage'],
  [TYPES.BOUNTY_S, 'S', TIERS.SILVER, 'bounty'],
  [TYPES.BOMB_T, 'T', TIERS.GOLD, 'bomb'],
  [TYPES.COOLANT_T, 'T', TIERS.SILVER, 'coolant'],
  [TYPES.CHAIN_Z, 'Z', TIERS.SILVER, 'chain'],
  [TYPES.COOLANT_Z, 'Z', TIERS.SILVER, 'coolant']
];
for (const [id, shapeId, tier, trait] of addedShapeSpecials) {
  assert.equal(CARD_LIBRARY[id].shapeId, shapeId);
  assert.equal(CARD_LIBRARY[id].cellCount, 4);
  assert.equal(CARD_LIBRARY[id].tier, tier);
  assert.equal(CARD_LIBRARY[id].traits.includes(trait), true);
}

// 신규 펜토미노
assert.equal(CARD_LIBRARY[TYPES.POWER_PENTA].cellCount, 5);
assert.equal(CARD_LIBRARY[TYPES.POWER_PENTA].shapeId, 'PENTA_T');
assert.equal(CARD_LIBRARY[TYPES.POWER_PENTA].shape.every(rot => rot.flat().filter(Boolean).length === 5), true);

// 패널티/즉발 표식
assert.equal(CARD_LIBRARY[TYPES.LEAD].cellAttack, 0.5);
assert.equal(CARD_LIBRARY[TYPES.LEAD].traits.includes('heavy'), true);
assert.equal(CARD_LIBRARY[TYPES.LEAD].penalty, true);
assert.equal(CARD_LIBRARY[TYPES.UNSTABLE].penalty, true);
assert.equal(CARD_LIBRARY[TYPES.UNSTABLE].onPlace.selfGarbage, 1);
assert.equal(CARD_LIBRARY[TYPES.UNSTABLE].onPlace.enemyGarbage, 1);

// 봄브 폭발 후 해당 폭탄 열의 위쪽만 아래로 당김
const collapseBoard = new Board({ rows: 20 });
collapseBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
collapseBoard.grid[5][2] = { type: TYPES.I, attack: 0.1, traits: [] };
collapseBoard.collapseColumns();
assert.equal(collapseBoard.grid[5][2], null);
assert.equal(collapseBoard.grid[19][2].type, TYPES.I);

const bombGravityBoard = new Board({ rows: 20 });
bombGravityBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
bombGravityBoard.grid[10][3] = { type: TYPES.S, attack: 0.1, traits: [] };
bombGravityBoard.grid[10][4] = { type: TYPES.I, attack: 0.1, traits: [] };
bombGravityBoard.grid[10][8] = { type: TYPES.Z, attack: 0.1, traits: [] };
bombGravityBoard.grid[18][4] = { type: TYPES.L, attack: 0.1, traits: [] };
bombGravityBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.BOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['bomb'] : [] }));
const bombGravity = bombGravityBoard.clearLines();
bombGravityBoard.flushPendingDrops();
assert.equal(bombGravity.cleared, 1);
assert.equal(bombGravityBoard.grid[19][3].type, TYPES.S);
assert.equal(bombGravityBoard.grid[19][4].type, TYPES.I);
assert.equal(bombGravityBoard.grid[18][4], null);
assert.equal(bombGravityBoard.grid[11][8]?.type, TYPES.Z);

const doubleBombGravityBoard = new Board({ rows: 20 });
doubleBombGravityBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
doubleBombGravityBoard.grid[10][3] = { type: TYPES.S, attack: 0.1, traits: [] };
doubleBombGravityBoard.grid[10][4] = { type: TYPES.I, attack: 0.1, traits: [] };
doubleBombGravityBoard.grid[18] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.BOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['bomb'] : [] }));
doubleBombGravityBoard.grid[19] = Array.from({ length: 10 }, () => ({ type: TYPES.I, attack: 0.1, traits: [] }));
const doubleBombGravity = doubleBombGravityBoard.clearLines();
doubleBombGravityBoard.flushPendingDrops();
assert.equal(doubleBombGravity.cleared, 2);
assert.equal(doubleBombGravityBoard.grid[19][3].type, TYPES.S);
assert.equal(doubleBombGravityBoard.grid[19][4].type, TYPES.I);
assert.equal(doubleBombGravityBoard.grid[18][4], null);

// 냉각 타일 — 셀당 500ms 누적
const coolantBoard = new Board({ rows: 20 });
coolantBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c < 3 ? TYPES.COOLANT : TYPES.I, attack: 0.1, traits: c < 3 ? ['coolant'] : [] }));
const coolantClear = coolantBoard.clearLines();
assert.equal(coolantClear.cleared, 1);
assert.equal(coolantClear.slow, 1500);

// 현상금 타일 — 제거 시 셀 수 반환 (상한 없음)
const bountyBoard = new Board({ rows: 20 });
bountyBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c < 6 ? TYPES.BOUNTY : TYPES.I, attack: 0.1, traits: c < 6 ? ['bounty'] : [] }));
assert.equal(bountyBoard.clearLines().gold, 6);

// 콤보 차지 — 누적 획득 + 다음 클리어 배수
const chargeGainBoard = new Board({ rows: 20 });
chargeGainBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 0 ? TYPES.COMBO_CHARGE : TYPES.I, attack: 0.1, traits: c === 0 ? ['comboCharge'] : [] }));
assert.equal(chargeGainBoard.clearLines().chargeGained, 1);

const chargeApplyBoard = new Board({ rows: 20 });
chargeApplyBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
chargeApplyBoard.grid[19] = Array.from({ length: 10 }, (_, c) => [4, 5].includes(c) ? null : { type: TYPES.I, attack: 0.1, traits: [] });
chargeApplyBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 4, 18);
chargeApplyBoard.attackChargeStacks = 2;
const chargeApply = chargeApplyBoard.lock();
assert.equal(chargeApply.cleared, 1);
assert.equal(chargeApply.attack, 1.4);
assert.equal(chargeApplyBoard.attackChargeStacks, 0);

// 불안정 타일 — 락 시 자기 필드 가비지 + 적 필드 가비지 신호
const unstableBoard = new Board({ rows: 20 });
unstableBoard.current = new Mino(CARD_LIBRARY[TYPES.UNSTABLE], 3, 8);
const unstableRes = unstableBoard.lock();
assert.equal(unstableRes.instant.enemyGarbage, 1);
assert.equal(unstableBoard.garbageQueue, 1);

// 납 타일 — 홀드 불가
const leadHoldBoard = new Board({ rows: 20 });
leadHoldBoard.current = new Mino(CARD_LIBRARY[TYPES.LEAD], 3, 5);
assert.equal(leadHoldBoard.hold(), false);

// Z 업그레이드 경로
const zUpgradeRun = new RunState();
zUpgradeRun.starterPicked = true;
assert.equal(upgradeDeckCards(zUpgradeRun).some(u => u.from === TYPES.Z && u.to === TYPES.POWER_Z), true);

// --- 2차 신규 콘텐츠 ---

// 카드 속성
assert.equal(CARD_LIBRARY[TYPES.GLASS].cellAttack, 0.5);
assert.equal(CARD_LIBRARY[TYPES.GLASS].penalty, true);
assert.equal(CARD_LIBRARY[TYPES.TIMEBOMB].fuse, 5);
assert.equal(CARD_LIBRARY[TYPES.TIMEBOMB].penalty, true);
assert.equal(CARD_LIBRARY[TYPES.CHAIN].traits.includes('chain'), true);

// 2차 업그레이드 경로
const phase2UpRun = new RunState();
phase2UpRun.starterPicked = true;
const phase2Ups = upgradeDeckCards(phase2UpRun);
assert.equal(phase2Ups.some(u => u.from === TYPES.T && u.to === TYPES.CHAIN), true);
assert.equal(phase2Ups.some(u => u.from === TYPES.S && u.to === TYPES.GLASS), true);
assert.equal(phase2Ups.some(u => u.from === TYPES.O && u.to === TYPES.TIMEBOMB), true);

// 사슬 캐스케이드 — 한 줄 클리어 시 연결된 다른 줄도 절반 효과로 제거
// 사슬 캐스케이드는 서로 다른 사슬 미노 2개 이상이 연결됐을 때만 발동
const chainBoard = new Board({ rows: 20 });
chainBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
chainBoard.grid[18][0] = { type: TYPES.CHAIN, attack: 0.1, traits: ['chain'], pieceId: 1 };
chainBoard.grid[19][0] = { type: TYPES.CHAIN, attack: 0.1, traits: ['chain'], pieceId: 2 };
for (let c = 1; c < 10; c++) chainBoard.grid[19][c] = { type: TYPES.I, attack: 0.1, traits: [] };
const chainClear = chainBoard.clearLines();
assert.equal(chainClear.fullCleared, 1);
assert.equal(chainClear.cleared, 2);
assert.equal(chainClear.attack, 1.05);
assert.equal(chainBoard.grid.flat().some(c => c?.type === TYPES.CHAIN), false);

// 사슬 미노 하나(같은 pieceId)만으로는 캐스케이드가 발동하지 않는다(일반 블록처럼 동작)
const chainSoloBoard = new Board({ rows: 20 });
chainSoloBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
chainSoloBoard.grid[18][0] = { type: TYPES.CHAIN, attack: 0.1, traits: ['chain'], pieceId: 7 };
chainSoloBoard.grid[19][0] = { type: TYPES.CHAIN, attack: 0.1, traits: ['chain'], pieceId: 7 };
for (let c = 1; c < 10; c++) chainSoloBoard.grid[19][c] = { type: TYPES.I, attack: 0.1, traits: [] };
const chainSolo = chainSoloBoard.clearLines();
assert.equal(chainSolo.cleared, 1);
assert.equal(chainSoloBoard.grid.flat().some(c => c?.type === TYPES.CHAIN), true);

// 사슬이 가득 찬 줄에 닿지 않으면 캐스케이드 없음
const chainNoTriggerBoard = new Board({ rows: 20 });
chainNoTriggerBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
chainNoTriggerBoard.grid[18][0] = { type: TYPES.CHAIN, attack: 0.1, traits: ['chain'] };
chainNoTriggerBoard.grid[19] = Array.from({ length: 10 }, () => ({ type: TYPES.I, attack: 0.1, traits: [] }));
const chainNoTrigger = chainNoTriggerBoard.clearLines();
assert.equal(chainNoTrigger.fullCleared, 1);
assert.equal(chainNoTrigger.cleared, 1);
assert.equal(chainNoTriggerBoard.grid.flat().some(c => c?.type === TYPES.CHAIN), true);

// 유리 — 하드드롭한 그 블록만 깨지고, 옆에 있던 다른 블록의 하드드롭에는 영향 없음
const glassBoard = new Board({ rows: 20 });
glassBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
glassBoard.current = new Mino(CARD_LIBRARY[TYPES.GLASS], 3, 5);
glassBoard.hardDrop();
assert.equal(glassBoard.grid.flat().some(c => c?.traits?.includes('glass')), false);
assert.equal(glassBoard.bombFx.some(fx => fx.kind === 'glass'), true);

// 시한폭탄 — 카운트다운 후 자기 칸만 소멸
const fuseBoard = new Board({ rows: 20 });
fuseBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
fuseBoard.grid[19][0] = { type: TYPES.TIMEBOMB, attack: 0.1, traits: ['timeBomb'], fuse: 2 };
fuseBoard.tickTimeBombs();
assert.equal(fuseBoard.grid[19][0].fuse, 1);
fuseBoard.tickTimeBombs();
assert.equal(fuseBoard.grid[19][0], null);

const fuseFxGarbageBoard = new Board({ rows: 20 });
fuseFxGarbageBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
fuseFxGarbageBoard.grid[18][0] = { type: TYPES.TIMEBOMB, attack: 0.1, traits: ['timeBomb'], fuse: 1 };
fuseFxGarbageBoard.receiveGarbage(1);
fuseFxGarbageBoard.tickGarbage(3000);
fuseFxGarbageBoard.tickTimeBombs();
fuseFxGarbageBoard.applyReadyGarbage();
assert.equal(fuseFxGarbageBoard.bombFx[0].kind, 'fuse');
assert.equal(fuseFxGarbageBoard.bombFx[0].y, 17);

// 시한폭탄 fuse 1이어도 줄 완성 판정이 먼저 적용됨
const fuseLineBoard = new Board({ rows: 20 });
fuseLineBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
fuseLineBoard.grid[16][4] = { type: TYPES.I, attack: 0.1, traits: [] };
fuseLineBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.TIMEBOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['timeBomb'] : [], fuse: c === 4 ? 1 : undefined }));
const fuseLineClear = fuseLineBoard.clearLines();
assert.equal(fuseLineClear.cleared, 1);
assert.equal(fuseLineBoard.grid.flat().some(Boolean), false);

// 실제 배치 경로에서도 fuse 1 시한폭탄 줄은 사라지기 전에 먼저 클리어됨
const fuseLockBoard = new Board({ rows: 20 });
fuseLockBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
for (let c = 0; c < 10; c++) {
  if (c === 8 || c === 9) continue;
  fuseLockBoard.grid[19][c] = { type: c === 4 ? TYPES.TIMEBOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['timeBomb'] : [], fuse: c === 4 ? 1 : undefined };
}
fuseLockBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 8, 18);
const fuseLockClear = fuseLockBoard.lock();
assert.equal(fuseLockClear.cleared, 1);
assert.equal(fuseLockClear.fullCleared, 1);
assert.equal(fuseLockBoard.grid.flat().some(c => c?.traits?.includes('timeBomb')), false);

// 시한폭탄 셀은 배치 시 fuse를 가짐
const placeTimeBombBoard = new Board({ rows: 20 });
placeTimeBombBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
placeTimeBombBoard.current = new Mino(CARD_LIBRARY[TYPES.TIMEBOMB], 3, 17);
placeTimeBombBoard.lock();
const placedFuses = placeTimeBombBoard.grid.flat().filter(c => c?.type === TYPES.TIMEBOMB);
assert.equal(placedFuses.length > 0, true);
assert.equal(placedFuses.every(c => c.fuse === 5), true);

// 폭발 반경 — 5×5
const radiusBoard = new Board({ rows: 20 });
radiusBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
for (let r = 13; r <= 19; r++) for (let c = 1; c <= 7; c++) radiusBoard.grid[r][c] = { type: TYPES.I, attack: 0.1, traits: [] };
radiusBoard.explodeBombAt(4, 16, 2);
for (let r = 14; r <= 18; r++) for (let c = 2; c <= 6; c++) assert.equal(radiusBoard.grid[r][c], null);
assert.notEqual(radiusBoard.grid[13][4], null);

// 시한폭탄 줄 제거 시 5×5 대폭발
const tbLineBoard = new Board({ rows: 20 });
tbLineBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
tbLineBoard.grid[16][4] = { type: TYPES.I, attack: 0.1, traits: [] };
tbLineBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.TIMEBOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['timeBomb'] : [] }));
tbLineBoard.clearLines();
assert.equal(tbLineBoard.grid.flat().some(Boolean), false);

// 패널티/즉발 카드 선택지 오염 방지 (세트당 각 최대 1개)
for (let i = 0; i < 60; i++) {
  const rewards = makeRewards('gold');
  assert.equal(rewards.filter(r => CARD_LIBRARY[r.id].penalty).length <= 1, true);
  assert.equal(rewards.filter(r => CARD_LIBRARY[r.id].onPlace).length <= 1, true);
  const shopRunPenalty = new RunState();
  shopRunPenalty.round = 15;
  const shop = makeShopItems(shopRunPenalty).filter(item => item.kind === 'card');
  assert.equal(shop.filter(item => CARD_LIBRARY[item.id].penalty).length <= 1, true);
  assert.equal(shop.filter(item => CARD_LIBRARY[item.id].onPlace).length <= 1, true);
}

// 1회용/소멸 카드: 전투당 최대 1회 등장
for (const t of [TYPES.OVERDRIVE_PENTA, TYPES.MEGA_CLEANSE, TYPES.PANIC_WALL, TYPES.FLASH_I, TYPES.AID_O]) {
  assert.equal(CARD_LIBRARY[t].exhaust, true, `${t} should be exhaust`);
  assert.equal(CARD_LIBRARY[t].traits.includes('exhaust'), true, `${t} traits include exhaust`);
}
assert.equal(CARD_LIBRARY[TYPES.OVERDRIVE_PENTA].onPlace.attack, 4);
assert.equal(CARD_LIBRARY[TYPES.MEGA_CLEANSE].onPlace.purgeGarbageRows, 6);
const exhaustDeck = new Deck([TYPES.FLASH_I, TYPES.FLASH_I, TYPES.FLASH_I]);
exhaustDeck.beginBattle();
let flashSeen = 0;
for (let i = 0; i < 120; i++) if (exhaustDeck.next()?.id === TYPES.FLASH_I) flashSeen++;
assert.equal(flashSeen <= 1, true, 'exhaust card appears at most once per battle');
const restoredExhaustDeck = Deck.fromState(exhaustDeck.toState());
let restoredFlashSeen = 0;
for (let i = 0; i < 120; i++) if (restoredExhaustDeck.next()?.id === TYPES.FLASH_I) restoredFlashSeen++;
assert.equal(restoredFlashSeen, 0, 'exhaust state survives save/load within a battle');

// 회전 봉인 / 강제 I / 폭탄 변환
const lockBoard = new Board({ rows: 20 });
lockBoard.rotateLocked = true;
assert.equal(lockBoard.rotate(1), false, 'rotate blocked when rotateLocked');
const iBoard = new Board({ rows: 20 });
iBoard.iPieceForce = 2;
iBoard.spawn();
assert.equal(iBoard.current.card.id, TYPES.I, 'forced I piece on spawn');
const shardBoard = new Board({ rows: 20 });
assert.equal(shardBoard.bombShard(), true);
assert.equal(shardBoard.current.card.traits.includes('bomb'), true, 'bombShard yields bomb piece');

// 지속 가비지: 첫 클리어에는 숫자만 줄고 제거되지 않음
const durBoard = new Board({ rows: 12, deck: new Deck() });
durBoard.addDurableGarbage(1, 2);
const durRow = durBoard.grid.findIndex(r => r.some(c => c?.traits.includes('durable')));
assert.equal(durRow >= 0, true, 'durable garbage row added');
const durHole = durBoard.grid[durRow].findIndex(c => !c);
durBoard.grid[durRow][durHole] = { type: TYPES.I, attack: 0.1, traits: [] };
const durRes = durBoard.clearLines();
assert.equal(durRes.cleared, 0, 'durable row not cleared on first hit');
assert.equal(durBoard.grid.some(r => r.some(c => c?.traits.includes('durable') && c.hp === 1)), true, 'durable hp decremented');

// detonateAll: 폭탄 칸을 모두 터뜨림
const detBoard = new Board({ rows: 12, deck: new Deck() });
detBoard.grid[10][4] = { type: TYPES.BOMB, attack: 0.1, traits: ['bomb'] };
detBoard.grid[10][5] = { type: TYPES.I, attack: 0.1, traits: [] };
assert.equal(detBoard.detonateAll() >= 1, true, 'detonateAll explodes bomb cells');

// 최종 보스: 20라운드는 단일 보스(overload)
const bossChoices = makeEnemyChoices(20);
assert.equal(bossChoices.length, 1, 'round 20 offers single boss');
assert.equal(bossChoices[0].type, 'boss');
assert.equal(bossChoices[0].ability, 'overload');

// 상점 재입고 헬퍼는 같은 종류의 아이템을 반환
const restockRun = new RunState();
restockRun.round = 11;
const restocked = restockShopItem(restockRun, { kind: 'consumable', tier: TIERS.SILVER });
assert.equal(restocked.kind, 'consumable', 'restockShopItem keeps kind');
assert.equal(RELICS.merchant_token.desc.includes('25%'), true, 'merchant token is discount-only');
assert.equal(RELICS.warehouse_key.desc.includes('재입고'), true, 'warehouse key owns restock effect');

// 누락 보강 항목: 유물/스킬/소모품 신규 정의 존재
for (const id of ['greed', 'first_aid', 'combo_keeper', 'mana_surge', 'chain_reactor', 'bounty_market', 'warehouse_key']) {
  assert.ok(RELICS[id], `relic ${id} defined`);
}
for (const id of ['line_shave', 'panic_guard', 'overcharge', 'hyper_force']) {
  assert.ok(SKILLS[id], `skill ${id} defined`);
}
assert.ok(CONSUMABLES.reroll_token, 'reroll_token consumable defined');

// 연쇄 반응로: 인접 폭탄이 연쇄로 터진다
const reactorBoard = new Board({ rows: 12, deck: new Deck() });
reactorBoard.chainReactor = true;
reactorBoard.grid[10][4] = { type: TYPES.BOMB, attack: 0.1, traits: ['bomb'] };
reactorBoard.grid[10][5] = { type: TYPES.BOMB, attack: 0.1, traits: ['bomb'] };
reactorBoard.explodeBombAt(4, 10, 1);
assert.equal(reactorBoard.grid[10][5], null, 'chain reactor detonates adjacent bomb');

// 콤보 보존: 충전된 보호막이 1회 미스를 막는다
const cgBoard = new Board({ rows: 12, deck: new Deck() });
cgBoard.combo = 3;
cgBoard.comboGuard = true;
cgBoard.comboGuardCharged = true;
cgBoard.grid = Array.from({ length: 12 }, () => Array.from({ length: 10 }, () => null));
cgBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 0, 0);
const cgRes = cgBoard.lock();
assert.equal(cgBoard.combo, 3, 'combo preserved by guard on miss');
assert.equal(cgBoard.comboGuardCharged, false, 'combo guard consumed');

// 마나 과급: mpCap 상향 반영
const capBoard = new Board({ rows: 12, deck: new Deck() });
capBoard.mpCap = 120;
capBoard.mp = 119;
capBoard.applyOnPlace({ onPlace: { mana: 10 } });
assert.equal(capBoard.mp, 120, 'mana respects raised mpCap');

// 덱 오염: pollute가 방해 블록을 주입
const polDeck = new Deck();
const before = polDeck.draw.length;
polDeck.pollute(TYPES.HEAVY_JUNK, 2);
assert.equal(polDeck.draw.length, before + 2, 'pollute injects junk cards');

// shaveBottom / rerollQueue 동작
const shaveBoard = new Board({ rows: 12, deck: new Deck() });
shaveBoard.grid[11] = Array.from({ length: 10 }, () => ({ type: TYPES.I, attack: 0.1, traits: [] }));
assert.equal(shaveBoard.shaveBottom(1), 1, 'shaveBottom removes occupied row');

// 몬스터 다양성: 신규 AI 프로파일이 보드를 정상 진행하고 블록을 배치
for (const profile of ['aggro', 'turtle', 'spiker', 'cheese']) {
  const profBoard = new Board({ rows: 20, deck: new Deck() });
  const profAi = new AI(profile);
  let placed = false;
  for (let i = 0; i < 60 && !placed; i++) {
    const res = profAi.step(profBoard);
    if (res) placed = true;
  }
  assert.equal(placed, true, `AI profile ${profile} places a piece`);
  assert.equal(profBoard.defeated, false, `AI profile ${profile} survives early placement`);
}

// 신규 적 등장: 충분히 진행하면 신규 적/엘리트가 풀에 나타나고 능력 키가 유효
const validAbilities = new Set(['spike', 'slowPlayer', 'power', 'rotateLockPlayer', 'hyperBurst', 'polluteDeck', 'overload', undefined, null]);
const newNames = new Set();
for (let round = 5; round <= 16; round++) {
  for (let trial = 0; trial < 40; trial++) {
    for (const enemy of makeEnemyChoices(round)) {
      assert.ok(validAbilities.has(enemy.ability), `enemy ${enemy.name} has valid ability key (${enemy.ability})`);
      assert.ok(enemy.aiProfile, `enemy ${enemy.name} has an AI profile`);
      newNames.add(enemy.name);
    }
  }
}
for (const expected of ['광전사', '거북 수문장', '유리 무희', '엘리트: 광란 코어', '엘리트: 오염원']) {
  assert.ok(newNames.has(expected), `new enemy ${expected} appears in pools`);
}

// 초반(round 1~2) 풀은 신규 적으로 오염되지 않음
for (let round = 1; round <= 2; round++) {
  for (let trial = 0; trial < 40; trial++) {
    for (const enemy of makeEnemyChoices(round)) {
      assert.ok(['소프트 스타터', '라인 헌터', '스피드 드론'].includes(enemy.name), `round ${round} only starter enemies, got ${enemy.name}`);
    }
  }
}

// 유리 블록: 하드드롭한 그 블록만 깨지고, 옆/기존 유리는 유지
const glassDropBoard = new Board({ rows: 20, deck: new Deck() });
glassDropBoard.current = new Mino(CARD_LIBRARY[TYPES.GLASS], 3, SPAWN_Y);
glassDropBoard.hardDrop();
assert.equal(glassDropBoard.grid.flat().some(c => c?.traits?.includes('glass')), false, 'hard-dropped glass piece shatters');

const glassKeepBoard = new Board({ rows: 20, deck: new Deck() });
glassKeepBoard.grid[19][0] = { type: TYPES.GLASS, attack: 0.5, traits: ['glass'] };
glassKeepBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 4, SPAWN_Y);
glassKeepBoard.hardDrop();
assert.equal(glassKeepBoard.grid[19][0]?.traits.includes('glass'), true, 'existing glass survives when a different piece is hard-dropped');

const glassSoftBoard = new Board({ rows: 20, deck: new Deck() });
glassSoftBoard.current = new Mino(CARD_LIBRARY[TYPES.GLASS], 3, SPAWN_Y);
while (glassSoftBoard.move(0, 1)) {}
glassSoftBoard.lock();
assert.equal(glassSoftBoard.grid.flat().some(c => c?.traits?.includes('glass')), true, 'soft-dropped (locked) glass is preserved');

// 유리 조건 2: 다른 블록이 유리 바로 위로 하드드롭되면 그 유리가 깨진다
const glassOnTopBoard = new Board({ rows: 20, deck: new Deck() });
glassOnTopBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
glassOnTopBoard.grid[19][3] = { type: TYPES.GLASS, attack: 0.5, traits: ['glass'] };
glassOnTopBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 3, 5);
glassOnTopBoard.hardDrop();
assert.equal(glassOnTopBoard.grid[19][3], null, 'glass shatters when a block is hard-dropped directly on top');

// 유리 조건 2 음성: 옆 칸(바로 위 아님)에 하드드롭하면 유지된다
const glassBesideBoard = new Board({ rows: 20, deck: new Deck() });
glassBesideBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
glassBesideBoard.grid[19][0] = { type: TYPES.GLASS, attack: 0.5, traits: ['glass'] };
glassBesideBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 4, 5);
glassBesideBoard.hardDrop();
assert.equal(glassBesideBoard.grid[19][0]?.traits.includes('glass'), true, 'glass beside (not under) the drop stays intact');

// 오버드라이브 헥사: 6칸 골드 1회용
assert.equal(CARD_LIBRARY[TYPES.OVERDRIVE_PENTA].cellCount, 6, 'overdrive is a 6-cell block');
assert.equal(CARD_LIBRARY[TYPES.OVERDRIVE_PENTA].tier, TIERS.GOLD, 'overdrive is gold tier');
assert.equal(CARD_LIBRARY[TYPES.OVERDRIVE_PENTA].exhaust, true, 'overdrive is once-per-battle');

// 폭발 후 위 칸 낙하는 약간 지연된 뒤 적용된다
const delayDropBoard = new Board({ rows: 20, deck: new Deck() });
delayDropBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
delayDropBoard.grid[10][4] = { type: TYPES.S, attack: 0.1, traits: [] };
delayDropBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.BOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['bomb'] : [] }));
delayDropBoard.clearLines();
assert.ok(delayDropBoard.pendingDropTimer > 0, 'explosion schedules a delayed drop');
assert.equal(delayDropBoard.grid[19][4], null, 'cell above does not fall immediately');
delayDropBoard.tickEffects(1000);
assert.equal(delayDropBoard.pendingDropTimer, 0, 'pending drop resolves after delay');
assert.equal(delayDropBoard.grid[19][4]?.type, TYPES.S, 'cell above falls once the delay elapses');

// 다음 블록이 잠기면 보류된 낙하가 먼저 정리된다
const flushOnLockBoard = new Board({ rows: 20, deck: new Deck() });
flushOnLockBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
flushOnLockBoard.grid[10][4] = { type: TYPES.S, attack: 0.1, traits: [] };
flushOnLockBoard.grid[19] = Array.from({ length: 10 }, (_, c) => ({ type: c === 4 ? TYPES.BOMB : TYPES.I, attack: 0.1, traits: c === 4 ? ['bomb'] : [] }));
flushOnLockBoard.clearLines();
flushOnLockBoard.current = new Mino(CARD_LIBRARY[TYPES.O], 0, SPAWN_Y);
flushOnLockBoard.lock();
assert.equal(flushOnLockBoard.pendingDropTimer, 0, 'locking flushes pending drops');

// Phase 6: 세트 정의 — 8능력 각 7형태가 카드로 존재하고 abilityId 일치
assert.equal(Object.keys(SET_DEFINITIONS).length, 8, '8 ability sets defined');
for (const ab of Object.keys(SET_DEFINITIONS)) {
  const shapes = Object.keys(SET_DEFINITIONS[ab]);
  assert.equal(shapes.length, 7, `${ab} set has 7 shapes`);
  for (const sh of shapes) {
    const id = SET_DEFINITIONS[ab][sh];
    assert.ok(CARD_LIBRARY[id], `${ab}.${sh} card exists`);
    assert.equal(CARD_LIBRARY[id].abilityId, ab, `${ab}.${sh} has matching ability`);
  }
}

// completedAbilitySets / setProgress
const setRun = new RunState();
setRun.round = 4;
assert.equal(completedAbilitySets(setRun).length, 0, 'no sets complete initially');
for (const id of Object.values(SET_DEFINITIONS.highPower)) setRun.deck.addCard(id);
assert.deepEqual(completedAbilitySets(setRun), ['highPower'], 'highPower set detected when all 7 present');
assert.deepEqual(setProgress(setRun, 'highPower'), { have: 7, total: 7 }, 'setProgress 7/7');

// 세트 완성 시 다음 이벤트에 setRelic 확정 포함, 제시 후 소비(재등장 안 함)
const setChoices = makeEventChoices(setRun, 'after-2');
assert.ok(setChoices.some(c => c.kind === 'setRelic' && c.id === SET_RELICS.highPower), 'setRelic injected into next event');
assert.ok(setRun.seenSets.has('highPower'), 'set marked seen on present');
const setChoices2 = makeEventChoices(setRun, 'after-4');
assert.ok(!setChoices2.some(c => c.kind === 'setRelic'), 'setRelic not offered again after consumed');

// 중량 블록: 놓인 열 빈칸 압착(compactColumns)
const crushBoard = new Board({ rows: 20, deck: new Deck() });
crushBoard.grid = Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => null));
crushBoard.grid[5][2] = { type: TYPES.I, attack: 0.1, traits: [] };
crushBoard.grid[10][2] = { type: TYPES.I, attack: 0.1, traits: [] };
crushBoard.grid[18][2] = { type: TYPES.I, attack: 0.1, traits: [] };
crushBoard.compactColumns([2]);
assert.equal(crushBoard.grid[19][2]?.type, TYPES.I, 'compact pulls cells to bottom');
assert.equal(crushBoard.grid[18][2]?.type, TYPES.I, 'compact stacks with no gaps');
assert.equal(crushBoard.grid[17][2]?.type, TYPES.I, 'all three cells compacted to bottom');
assert.equal(crushBoard.grid[16][2], null, 'no floating cells remain');

// forceCrushNext: 다음 스폰이 CRUSHER
const fcBoard = new Board({ rows: 20, deck: new Deck() });
fcBoard.forceCrushNext = 1;
fcBoard.spawn();
assert.equal(fcBoard.current.card.id, TYPES.CRUSHER, 'forceCrushNext spawns crusher');

// 소멸 면역: exhaust 카드가 battleExhausted에 등록되지 않음
const exDeck = new Deck();
exDeck.beginBattle();
exDeck.draw = [TYPES.FLASH_I];
exDeck.next();
assert.ok(exDeck.battleExhausted.has(TYPES.FLASH_I), 'exhaust normally registered');
const immDeck = new Deck();
immDeck.beginBattle();
immDeck.exhaustImmune = true;
immDeck.draw = [TYPES.FLASH_I];
immDeck.next();
assert.equal(immDeck.battleExhausted.has(TYPES.FLASH_I), false, 'exhaust immune skips registration');

// dispel 카드 onPlace 플래그
assert.equal(CARD_LIBRARY[TYPES.DISPEL_T].onPlace?.dispelEnemy, true, 'dispel block carries dispelEnemy');
assert.equal(CARD_LIBRARY[TYPES.DISPEL_T].exhaust, false, 'dispel block is not exhaust (reward pool)');

// 버그 수정: applyOnPlace가 dispelEnemy를 instant 결과로 전달
const dispBoard = new Board({ rows: 20, deck: new Deck() });
const dispRes = dispBoard.applyOnPlace(CARD_LIBRARY[TYPES.DISPEL_T]);
assert.equal(dispRes.dispelEnemy, true, 'applyOnPlace propagates dispelEnemy to result');
assert.equal(dispRes.triggered, true, 'dispel produces a triggered instant result');

// 버그 수정: 정화의 성소 — onPlace 정화가 줄당 +0.5 공격을 실제 공격으로 반영
const sancBoard = new Board({ rows: 20, deck: new Deck() });
sancBoard.sanctuaryActive = true;
for (let c = 0; c < sancBoard.cols; c++) {
  sancBoard.grid[19][c] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
  sancBoard.grid[18][c] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
}
const sancRes = sancBoard.applyOnPlace(CARD_LIBRARY[TYPES.AID_O]); // onPlace purgeGarbageRows 2
assert.equal(sancRes.purgedRows, 2, 'aid cleanse purges 2 garbage rows');
assert.ok(Math.abs(sancRes.attack - 1.0) < 1e-6, 'sanctuary grants +0.5 attack per purged row (2 -> +1.0)');
const noSancBoard = new Board({ rows: 20, deck: new Deck() });
for (let c = 0; c < noSancBoard.cols; c++) noSancBoard.grid[19][c] = { type: TYPES.GARBAGE, attack: 0, traits: ['garbage'] };
const noSancRes = noSancBoard.applyOnPlace(CARD_LIBRARY[TYPES.AID_O]);
assert.equal(noSancRes.attack, 0, 'no sanctuary -> purge grants no bonus attack');

console.log('All Battle Block Star v3.0 checks passed.');
