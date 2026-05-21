export const SKILLS = {
  minor_purge: {
    id: 'minor_purge',
    name: '마이너 퍼지',
    tier: 'bronze',
    cost: 16,
    cooldown: 9000,
    desc: '가장 낮은 쓰레기 행 1줄을 제거합니다.',
    activate({ player }) {
      return player.purgeGarbageRows(1) > 0;
    }
  },
  double_shot: {
    id: 'double_shot',
    name: '더블샷',
    tier: 'bronze',
    cost: 50,
    cooldown: 10000,
    desc: '다음 라인 클리어의 공격력이 2배가 됩니다.',
    activate({ player }) {
      if (!player.current || player.defeated) return false;
      player.nextAttackDouble = true;
      return true;
    }
  },
  quick_cycle: {
    id: 'quick_cycle',
    name: '빠른 순환',
    tier: 'bronze',
    cost: 26,
    cooldown: 10000,
    desc: '현재 블록을 버리고 다음 블록을 뽑습니다.',
    activate({ player }) {
      if (!player.current || player.defeated) return false;
      player.spawn();
      return true;
    }
  },
  emergency_shard: {
    id: 'emergency_shard',
    name: '긴급 파편',
    tier: 'bronze',
    cost: 16,
    cooldown: 6000,
    desc: '현재 블록을 1×1 파편으로 압축하여 즉시 배치합니다.',
    activate({ player, resolve }) {
      const result = player.emergencyShard();
      if (!result) return false;
      resolve(result, player);
      return true;
    }
  },
  bomb_piece: {
    id: 'bomb_piece',
    name: '폭탄 변환',
    tier: 'silver',
    cost: 38,
    cooldown: 9000,
    desc: '현재 블록을 1×1 폭탄 블록으로 바꿉니다. 줄로 제거하면 3×3 폭발.',
    activate({ player }) {
      return player.bombShard();
    }
  },
  purge: {
    id: 'purge',
    name: '퍼지',
    tier: 'silver',
    cost: 38,
    cooldown: 11000,
    desc: '피해 없이 가장 낮은 쓰레기 행 3줄을 제거합니다.',
    activate({ player }) {
      return player.purgeGarbageRows(3) > 0;
    }
  },
  all_i_mode: {
    id: 'all_i_mode',
    name: '올 I 모드',
    tier: 'silver',
    cost: 45,
    cooldown: 14000,
    desc: '다음 4개의 블록이 모두 I 미노로 나옵니다.',
    activate({ player }) {
      if (player.defeated) return false;
      player.iPieceForce = 4;
      return true;
    }
  },
  time_warp: {
    id: 'time_warp',
    name: '타임 워프',
    tier: 'silver',
    cost: 40,
    cooldown: 12000,
    desc: '5초 동안 적의 행동 속도를 늦춥니다.',
    activate({ game }) {
      game.enemySlowTimer = 5000;
      return true;
    }
  },
  magnetic_collapse: {
    id: 'magnetic_collapse',
    name: '자기 붕괴',
    tier: 'gold',
    cost: 50,
    cooldown: 12000,
    desc: '필드의 모든 블록을 수직으로 낙하시킵니다.',
    activate({ player }) {
      player.magneticCollapse();
      return true;
    }
  },
  garbage_barrage: {
    id: 'garbage_barrage',
    name: '쓰레기 일제',
    tier: 'bronze',
    cost: 35,
    cooldown: 9000,
    desc: '적에게 즉시 쓰레기 2줄을 보냅니다.',
    activate({ enemy }) {
      if (!enemy || enemy.defeated) return false;
      enemy.receiveGarbage(2);
      return true;
    }
  },
  scramble_strike: {
    id: 'scramble_strike',
    name: '줄 뒤틀기',
    tier: 'silver',
    cost: 55,
    cooldown: 11000,
    desc: '적 필드의 모든 줄을 좌우로 무작위 시프트합니다.',
    activate({ enemy }) {
      if (!enemy || enemy.defeated) return false;
      enemy.scramble();
      return true;
    }
  },
  rotate_seal: {
    id: 'rotate_seal',
    name: '회전 봉인',
    tier: 'silver',
    cost: 45,
    cooldown: 12000,
    desc: '3.5초 동안 적이 블록을 회전할 수 없게 만듭니다.',
    activate({ game, enemy }) {
      if (!enemy || enemy.defeated) return false;
      enemy.rotateLocked = true;
      game.applyEnemyDebuff?.('rotate', 3500);
      game.scheduleBattleTimeout(() => {
        if (game.enemy === enemy) enemy.rotateLocked = false;
      }, 3500);
      return true;
    }
  },
  hold_lock: {
    id: 'hold_lock',
    name: '홀드 잠금',
    tier: 'bronze',
    cost: 30,
    cooldown: 13000,
    desc: '20초 동안 적의 홀드 슬롯을 잠급니다.',
    activate({ game, enemy }) {
      enemy.holdLocked = true;
      game.scheduleBattleTimeout(() => {
        if (game.enemy === enemy) enemy.holdLocked = false;
      }, 20000);
      return true;
    }
  }
};
