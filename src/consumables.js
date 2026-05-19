export const CONSUMABLES = {
  battery: {
    id: 'battery',
    name: 'MP 배터리',
    tier: 'bronze',
    short: 'B',
    desc: 'MP를 35 즉시 획득합니다.',
    use({ player }) {
      player.mp = Math.min(100, player.mp + 35);
      return 'MP 배터리 사용';
    }
  },
  shield: {
    id: 'shield',
    name: '쓰레기 방어막',
    tier: 'silver',
    short: 'S',
    desc: '예정된 모든 쓰레기를 제거합니다.',
    use({ player }) {
      player.garbageQueue = 0;
      return '쓰레기 방어막 사용';
    }
  },
  bomb: {
    id: 'bomb',
    name: '바닥 폭탄',
    tier: 'gold',
    short: 'X',
    desc: '피해 없이 가장 낮은 점유 행 2줄을 삭제합니다.',
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
      return '바닥 폭탄 사용';
    }
  },
  focus: {
    id: 'focus',
    name: '집중 칩',
    tier: 'silver',
    short: 'F',
    desc: '10초 동안 적의 행동 속도를 늦춥니다.',
    use({ game }) {
      game.enemySlowTimer = Math.max(game.enemySlowTimer, 10000);
      return '집중 칩 사용';
    }
  }
};
