export const SKILLS = {
  emergency_shard: {
    id: 'emergency_shard',
    name: '긴급 하강',
    cost: 25,
    desc: '현재 블록을 1x1 조각으로 압축해 즉시 드롭합니다.',
    activate({ player, resolve }) {
      const result = player.emergencyShard();
      if (result) resolve(result, player);
    }
  },
  purge: {
    id: 'purge',
    name: '정화',
    cost: 55,
    desc: '필드 하단 방해 줄 3개를 피해 없이 제거합니다.',
    activate({ player }) {
      player.purgeGarbageRows(3);
    }
  },
  time_warp: {
    id: 'time_warp',
    name: '시간 왜곡',
    cost: 40,
    desc: '4초 동안 적 AI 갱신 속도를 늦춥니다.',
    activate({ game }) {
      game.enemySlowTimer = 4000;
    }
  },
  magnetic_collapse: {
    id: 'magnetic_collapse',
    name: '자기 붕괴',
    cost: 70,
    desc: '내 필드의 모든 블록을 아래로 압축합니다.',
    activate({ player }) {
      player.magneticCollapse();
    }
  },
  hold_lock: {
    id: 'hold_lock',
    name: '홀드 잠금',
    cost: 30,
    desc: '5초 동안 적 홀드를 봉인합니다.',
    activate({ enemy }) {
      enemy.holdLocked = true;
      setTimeout(() => { enemy.holdLocked = false; }, 5000);
    }
  }
};
