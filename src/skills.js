export const SKILLS = {
  emergency_shard: {
    id: 'emergency_shard',
    name: 'Emergency Shard',
    tier: 'bronze',
    cost: 25,
    cooldown: 2500,
    desc: 'Compress the current block into a 1x1 shard and place it immediately.',
    activate({ player, resolve }) {
      const result = player.emergencyShard();
      if (!result) return false;
      resolve(result, player);
      return true;
    }
  },
  purge: {
    id: 'purge',
    name: 'Purge',
    tier: 'silver',
    cost: 55,
    cooldown: 4500,
    desc: 'Remove the lowest 3 garbage rows without dealing damage.',
    activate({ player }) {
      return player.purgeGarbageRows(3) > 0;
    }
  },
  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    tier: 'silver',
    cost: 40,
    cooldown: 6000,
    desc: 'Slow enemy AI actions for 4 seconds.',
    activate({ game }) {
      game.enemySlowTimer = 4000;
      return true;
    }
  },
  magnetic_collapse: {
    id: 'magnetic_collapse',
    name: 'Magnetic Collapse',
    tier: 'gold',
    cost: 70,
    cooldown: 5000,
    desc: 'Drop every block in your field straight downward.',
    activate({ player }) {
      player.magneticCollapse();
      return true;
    }
  },
  hold_lock: {
    id: 'hold_lock',
    name: 'Hold Lock',
    tier: 'bronze',
    cost: 30,
    cooldown: 6500,
    desc: 'Lock the enemy hold slot for 5 seconds.',
    activate({ game, enemy }) {
      enemy.holdLocked = true;
      game.scheduleBattleTimeout(() => {
        if (game.enemy === enemy) enemy.holdLocked = false;
      }, 5000);
      return true;
    }
  }
};
