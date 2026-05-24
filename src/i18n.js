// i18n 모듈 — 한글(기본) / 영어 / 일본어 지원.
// 게임 내 정적 UI 텍스트만 번역. 카드·스킬·적 등 데이터 영역은 추후 단계적으로 확장.

const STORAGE_KEY = 'bbs_lang_v1';

export const LANGS = {
  ko: { label: '한국어', flag: '🇰🇷' },
  en: { label: 'English', flag: '🇺🇸' },
  ja: { label: '日本語', flag: '🇯🇵' }
};

const STRINGS = {
  // ===== 메인 메뉴 =====
  'menu.subtitle': {
    ko: 'Block roguelike 1v1 battle action v3.0',
    en: 'Block roguelike 1v1 battle action v3.0',
    ja: 'ブロックローグライク1v1バトル v3.0'
  },
  'menu.runStatus': { ko: 'Run Status', en: 'Run Status', ja: 'ラン状況' },
  'menu.round': { ko: 'Round', en: 'Round', ja: 'ラウンド' },
  'menu.gold': { ko: 'Gold', en: 'Gold', ja: 'ゴールド' },
  'menu.hpLabel': { ko: 'HP (쓰레기/최대)', en: 'HP (Garbage/Max)', ja: 'HP (ガベージ/最大)' },
  'menu.deck': { ko: 'Deck', en: 'Deck', ja: 'デッキ' },
  'menu.cards': { ko: 'cards', en: 'cards', ja: '枚' },
  'menu.controls': { ko: 'Controls', en: 'Controls', ja: '操作' },
  'menu.records': { ko: 'Records', en: 'Records', ja: '記録' },
  'menu.settings': { ko: '설정', en: 'Settings', ja: '設定' },
  'menu.practiceMode': { ko: '초보자 연습 모드', en: 'Beginner Practice Mode', ja: '初心者練習モード' },
  'menu.practiceModeNote': { ko: '(쓰레기줄 없음)', en: '(no garbage rows)', ja: '(ガベージ無し)' },
  'menu.gamepad': { ko: '컨트롤러', en: 'Gamepad', ja: 'コントローラー' },
  'menu.gamepadDisconnected': { ko: '연결 안됨 — 연결 후 아무 버튼 누르세요', en: 'Disconnected — connect and press any button', ja: '未接続 — 接続後にボタンを押してください' },
  'menu.language': { ko: '언어', en: 'Language', ja: '言語' },
  'menu.startRun': { ko: 'Start Run', en: 'Start Run', ja: 'ラン開始' },
  'menu.loadSave': { ko: 'Load Save', en: 'Load Save', ja: 'セーブ読込' },
  'menu.deleteSave': { ko: 'Delete Save', en: 'Delete Save', ja: 'セーブ削除' },
  'menu.music': { ko: '음악', en: 'Music', ja: '音楽' },
  'menu.sfx': { ko: '효과음', en: 'SFX', ja: '効果音' },

  // ===== 컨트롤 안내 =====
  'controls.arrows': { ko: 'Move / soft drop', en: 'Move / soft drop', ja: '移動 / ソフトドロップ' },
  'controls.rotate': { ko: 'Rotate', en: 'Rotate', ja: '回転' },
  'controls.hardHold': { ko: 'Hard drop / hold', en: 'Hard drop / hold', ja: 'ハードドロップ / ホールド' },
  'controls.skills': { ko: 'Skills', en: 'Skills', ja: 'スキル' },
  'controls.consumables': { ko: 'Consumables', en: 'Consumables', ja: 'アイテム' },
  'controls.hardDrop': { ko: '하드 드롭', en: 'Hard drop', ja: 'ハードドロップ' },
  'controls.rotateCW': { ko: '회전 (시계)', en: 'Rotate (CW)', ja: '回転(時計回り)' },
  'controls.rotateCCW': { ko: '회전 (반시계)', en: 'Rotate (CCW)', ja: '回転(反時計回り)' },
  'controls.hold': { ko: '홀드', en: 'Hold', ja: 'ホールド' },
  'controls.moveSoft': { ko: '이동 / 소프트 드롭', en: 'Move / Soft drop', ja: '移動 / ソフトドロップ' },
  'controls.skillN': { ko: '스킬 1 · 2 · 3', en: 'Skill 1 · 2 · 3', ja: 'スキル 1 · 2 · 3' },
  'controls.consN': { ko: '소모품 1 · 2 · 3', en: 'Item 1 · 2 · 3', ja: 'アイテム 1 · 2 · 3' },
  'controls.pauseMenu': { ko: '일시정지 / 메뉴 선택', en: 'Pause / Menu select', ja: 'ポーズ / メニュー選択' },

  // ===== 화면 공통 =====
  'screen.deckViewer': { ko: 'View Deck / Skills / Items', en: 'View Deck / Skills / Items', ja: 'デッキ / スキル / アイテム表示' },
  'screen.skills': { ko: 'Skills', en: 'Skills', ja: 'スキル' },
  'screen.consumables': { ko: 'Consumables', en: 'Consumables', ja: 'アイテム' },
  'screen.relics': { ko: 'Relics', en: 'Relics', ja: 'レリック' },
  'screen.deckBtn': { ko: '덱 보기', en: 'View Deck', ja: 'デッキを見る' },
  'screen.nextBattle': { ko: 'Next Battle', en: 'Next Battle', ja: '次のバトル' },
  'screen.checkpointShop': { ko: 'Checkpoint Shop', en: 'Checkpoint Shop', ja: 'チェックポイントショップ' },
  'screen.runEvent': { ko: 'Run Event', en: 'Run Event', ja: 'ランイベント' },
  'screen.chooseOne': { ko: 'Choose one path', en: 'Choose one path', ja: '一つ選択' },
  'screen.chooseEnemy': { ko: 'Choose an enemy', en: 'Choose an enemy', ja: '敵を選択' },
  'screen.reward': { ko: 'Reward', en: 'Reward', ja: '報酬' },
  'screen.pause': { ko: 'Pause', en: 'Pause', ja: 'ポーズ' },
  'screen.resume': { ko: '재개', en: 'Resume', ja: '再開' },
  'screen.pauseTitle': { ko: '일시정지', en: 'Paused', ja: 'ポーズ中' },
  'screen.pauseNote': { ko: '일시정지 버튼을 다시 누르면 재개됩니다.', en: 'Press the pause button again to resume.', ja: 'ポーズボタンを再度押すと再開します。' },
  'screen.forfeit': { ko: 'Forfeit', en: 'Forfeit', ja: '降参' },
  'screen.runComplete': { ko: 'Run Complete', en: 'Run Complete', ja: 'ラン完了' },
  'screen.restartRun': { ko: 'Restart Run', en: 'Restart Run', ja: 'ランを再開' },
  'screen.mainMenu': { ko: 'Main Menu', en: 'Main Menu', ja: 'メインメニュー' },
  'screen.audioHint': { ko: '🔊 화면 클릭 시 음악 시작', en: '🔊 Click anywhere to enable audio', ja: '🔊 画面をクリックして音楽開始' },

  // ===== 자주 쓰이는 동사·라벨 =====
  'common.on': { ko: 'ON', en: 'ON', ja: 'ON' },
  'common.off': { ko: 'OFF', en: 'OFF', ja: 'OFF' }
};

let current = 'ko';
try { const saved = localStorage.getItem(STORAGE_KEY); if (saved && LANGS[saved]) current = saved; } catch {}

const listeners = [];

export function getLang() { return current; }
export function setLang(lang) {
  if (!LANGS[lang] || lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  listeners.forEach(fn => { try { fn(lang); } catch {} });
}
export function onLangChange(fn) { listeners.push(fn); }

// 번역 조회. 키 없거나 해당 언어 누락 시 한국어 fallback, 그것도 없으면 키 그대로.
export function t(key, vars) {
  const entry = STRINGS[key];
  let str;
  if (!entry) str = key;
  else str = entry[current] || entry.ko || key;
  if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return str;
}

// DOM 갱신 헬퍼: [data-i18n="key"] 요소의 텍스트를 자동으로 t(key)로 채움.
export function applyDomTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.dataset.i18nLabel;
    if (key) {
      el.setAttribute('data-label', t(key));
      // 버튼 텍스트도 동기화
      const cur = el.textContent.trim();
      if (cur === el.dataset.prevLabel || !el.dataset.prevLabel) el.textContent = t(key);
      el.dataset.prevLabel = t(key);
    }
  });
}
