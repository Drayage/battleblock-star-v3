export const CONSUMABLES = {
  battery: {
    id: 'battery',
    name: 'MP Battery',
    tier: 'bronze',
    short: 'B',
    desc: 'Gain 35 MP immediately.',
    use({ player }) {
      player.mp = Math.min(100, player.mp + 35);
      return 'MP Battery used';
    }
  },
  shield: {
    id: 'shield',
    name: 'Garbage Shield',
    tier: 'silver',
    short: 'S',
    desc: 'Remove all pending incoming garbage.',
    use({ player }) {
      player.garbageQueue = 0;
      return 'Garbage Shield used';
    }
  },
  bomb: {
    id: 'bomb',
    name: 'Bottom Bomb',
    tier: 'gold',
    short: 'X',
    desc: 'Delete the lowest 2 occupied rows without damage.',
    use({ player }) {
      let removed = 0;
      for (let r = player.rows - 1; r >= 0 && removed < 2; r--) {
        if (player.grid[r].some(Boolean)) {
          player.grid.splice(r, 1);
          player.grid.unshift(Array.from({ length: player.cols }, () => null));
          removed++;
          r++;
        }
      }
      return 'Bottom Bomb used';
    }
  },
  focus: {
    id: 'focus',
    name: 'Focus Chip',
    tier: 'silver',
    short: 'F',
    desc: 'Slow enemy actions for 15 seconds.',
    use({ game }) {
      game.enemySlowTimer = Math.max(game.enemySlowTimer, 15000);
      return 'Focus Chip used';
    }
  }
};
