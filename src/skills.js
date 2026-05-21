export const SKILLS = {
  minor_purge: {
    id: 'minor_purge',
    name: '마이너 퍼지',
    tier: 'bronze',
    cost: 28,
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
  line_shave: {
    id: 'line_shave',
    name: '라인 셰이브',
    tier: 'silver',
    cost: 40,
    cooldown: 9000,
    desc: '내 필드 바닥의 점유 행 2줄을 삭제합니다.',
    activate({ player }) {
      return player.shaveBottom(2) > 0;
    }
  },
  panic_guard: {
    id: 'panic_guard',
    name: '패닉 가드',
    tier: 'bronze',
    cost: 30,
    cooldown: 9000,
    desc: '예정된 모든 쓰레기 공격을 즉시 차단합니다.',
    activate({ player }) {
      player.garbageQueue = 0;
      return true;
    }
  },
  overcharge: {
    id: 'overcharge',
    name: '과충전',
    tier: 'gold',
    cost: 60,
    cooldown: 13000,
    desc: '다음 3회 라인 클리어의 공격력이 50% 증가합니다.',
    activate({ player }) {
      if (player.defeated) return false;
      player.overchargeShots = 3;
      return true;
    }
  },
  hyper_force: {
    id: 'hyper_force',
    name: '하이퍼 강제',
    tier: 'gold',
    cost: 55,
    cooldown: 12000,
    desc: '4초 동안 적의 블록을 즉시 강제 낙하시켜 배치를 망칩니다.',
    activate({ game, enemy }) {
      if (!enemy || enemy.defeated) return false;
      game.enemyForceDropTimer = 4000;
      game.applyEnemyDebuff?.('hyper', 4000);
      return true;
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
      game.applyEnemyDebuff?.('hold', 20000);
      game.scheduleBattleTimeout(() => {
        if (game.enemy === enemy) enemy.holdLocked = false;
      }, 20000);
      return true;
    }
  }
};
