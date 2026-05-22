export const CONSUMABLES = {
  battery: {
    id: 'battery',
    icon: '🔋',
    name: 'MP 배터리',
    tier: 'bronze',
    short: 'B',
    desc: 'MP를 35 즉시 획득합니다.',
    use({ player }) {
      player.mp = Math.min(player.mpCap || 100, player.mp + 35);
      return 'MP 배터리 사용';
    }
  },
  shield: {
    id: 'shield',
    icon: '🛡️',
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
    icon: '💥',
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
    icon: '🎯',
    name: '집중 칩',
    tier: 'silver',
    short: 'F',
    desc: '10초 동안 적의 행동 속도를 늦춥니다.',
    use({ game }) {
      game.enemySlowTimer = Math.max(game.enemySlowTimer, 10000);
      return '집중 칩 사용';
    }
  },
  cleanse: {
    id: 'cleanse',
    icon: '🧹',
    name: '만능 클렌즈',
    tier: 'silver',
    short: 'C',
    desc: '내 쓰레기 행 4줄을 정화합니다.',
    use({ player }) {
      player.purgeGarbageRows(4);
      return '만능 클렌즈 사용';
    }
  },
  reroll_token: {
    id: 'reroll_token',
    icon: '🎲',
    name: '리롤 토큰',
    tier: 'silver',
    short: 'R',
    desc: '다음에 나올 블록 큐를 새로 뽑습니다.',
    use({ player }) {
      player.rerollQueue();
      return '리롤 토큰 사용';
    }
  },
  gold_pouch: {
    id: 'gold_pouch',
    icon: '💰',
    name: '골드 주머니',
    tier: 'bronze',
    short: 'G',
    desc: '20~40 골드를 즉시 획득합니다.',
    use({ game }) {
      const amount = 20 + Math.floor(Math.random() * 21);
      game.run.gold += amount;
      return `골드 +${amount}`;
    }
  },
  hp_patch: {
    id: 'hp_patch',
    icon: '❤️',
    name: 'HP 패치',
    tier: 'gold',
    short: 'H',
    desc: '최대 HP(필드 높이)를 2줄 늘립니다.',
    use({ player }) {
      player.expandRows(2);
      return 'HP 패치 사용';
    }
  },
  time_stop: {
    id: 'time_stop',
    icon: '⏸️',
    name: '시간 정지',
    tier: 'gold',
    short: 'T',
    desc: '3초 동안 내 블록의 낙하를 멈춥니다.',
    use({ game }) {
      game.playerFreezeTimer = Math.max(game.playerFreezeTimer || 0, 3000);
      return '시간 정지 사용';
    }
  },
  igniter: {
    id: 'igniter',
    icon: '🔥',
    name: '점화기',
    tier: 'silver',
    short: 'I',
    desc: '내 필드의 모든 폭탄·시한폭탄 블록을 즉시 터뜨립니다.',
    use({ player }) {
      const n = player.detonateAll();
      return n > 0 ? `점화기: ${n}개 폭발` : '점화기 (대상 없음)';
    }
  },
  hole_grenade: {
    id: 'hole_grenade',
    icon: '🕳️',
    name: '구멍 수류탄',
    tier: 'silver',
    short: 'O',
    desc: '적 필드에 무작위 구멍 5개를 뚫습니다.',
    use({ game }) {
      if (!game.enemy || game.enemy.defeated) return '구멍 수류탄 (대상 없음)';
      game.enemy.punchHoles(5);
      return '구멍 수류탄 사용';
    }
  },
  blackout_packet: {
    id: 'blackout_packet',
    icon: '📵',
    name: '정전 패킷',
    tier: 'gold',
    short: 'P',
    desc: '3초 동안 적의 홀드와 회전을 동시에 봉인합니다.',
    use({ game }) {
      const enemy = game.enemy;
      if (!enemy || enemy.defeated) return '정전 패킷 (대상 없음)';
      enemy.holdLocked = true;
      enemy.rotateLocked = true;
      game.applyEnemyDebuff?.('blackout', 3000);
      game.scheduleBattleTimeout(() => {
        if (game.enemy === enemy) {
          enemy.holdLocked = false;
          enemy.rotateLocked = false;
        }
      }, 3000);
      return '정전 패킷 사용';
    }
  }
};
