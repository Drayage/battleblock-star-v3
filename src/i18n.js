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

const SHAPE_LABELS = {
  en: {
    I: 'I Mino', J: 'J Mino', L: 'L Mino', O: 'O Mino', S: 'S Mino', T: 'T Mino', Z: 'Z Mino',
    CROSS5: 'Cross Mino', HEAVY5: 'Heavy Mino', WIDE6: 'Wide Mino', HOOK5: 'Hook Mino',
    PENTA_T: 'T Pento', OVERDRIVE6: 'Overdrive Mino'
  },
  ja: {
    I: 'Iミノ', J: 'Jミノ', L: 'Lミノ', O: 'Oミノ', S: 'Sミノ', T: 'Tミノ', Z: 'Zミノ',
    CROSS5: 'クロスミノ', HEAVY5: 'ヘビーミノ', WIDE6: 'ワイドミノ', HOOK5: 'フックミノ',
    PENTA_T: 'Tペント', OVERDRIVE6: 'オーバードライブミノ'
  }
};

const ABILITY_LABELS = {
  en: {
    none: '', highPower: 'Power', oddPower: 'Efficient', bomb: 'Bomb', manaBonus: 'Mana',
    purgeGarbage: 'Cleanse', instantAttack: 'Strike', instantGuard: 'Guard', instantMana: 'Mana Burst',
    instantPurge: 'Purge', curse: 'Junk', wideCurse: 'Wide Junk', coolant: 'Coolant',
    comboCharge: 'Combo', bounty: 'Bounty', unstable: 'Unstable', leadPower: 'Lead',
    wardBlock: 'Ward', glass: 'Glass', timeBomb: 'Time Bomb', overdrive: 'Overdrive',
    megaCleanse: 'Mega Cleanse', panicWall: 'Panic Wall', flashStrike: 'Flash',
    aidCleanse: 'Aid Cleanse', crush: 'Crusher', dispel: 'Dispel'
  },
  ja: {
    none: '', highPower: 'パワー', oddPower: '高効率', bomb: 'ボム', manaBonus: 'マナ',
    purgeGarbage: 'クレンズ', instantAttack: '即時攻撃', instantGuard: '即時防御', instantMana: '即時マナ',
    instantPurge: '即時パージ', curse: 'ジャンク', wideCurse: 'ワイドジャンク', coolant: '冷却',
    comboCharge: 'コンボ', bounty: '賞金', unstable: '不安定', leadPower: '鉛',
    wardBlock: 'ブロック', glass: 'ガラス', timeBomb: '時限爆弾', overdrive: 'オーバードライブ',
    megaCleanse: 'メガクレンズ', panicWall: 'パニックウォール', flashStrike: '閃光',
    aidCleanse: '応急クレンズ', crush: '圧縮', dispel: '解除'
  }
};

const ABILITY_DESCS = {
  en: {
    none: 'A standard block for stable stacking.',
    highPower: 'Cleared cells deal 0.3 attack each.',
    oddPower: 'Harder to place, but stronger than a normal block.',
    bomb: 'When cleared, it destroys a 3x3 area around the bomb.',
    manaBonus: 'Cleared cells restore extra MP.',
    purgeGarbage: 'When cleared, cleanse cells remove garbage rows from your field.',
    instantAttack: 'Fires 1.2 attack immediately when placed.',
    instantGuard: 'Blocks up to 3 incoming garbage rows when placed.',
    instantMana: 'Restores 18 MP immediately when placed.',
    instantPurge: 'Removes 1 garbage row immediately when placed.',
    curse: 'A nuisance block that clogs your deck.',
    wideCurse: 'A wide 6-cell nuisance block that clogs your deck.',
    coolant: 'Slows the enemy briefly when cleared.',
    comboCharge: 'Charges bonus attack for your next line clear.',
    bounty: 'Grants gold when cleared.',
    unstable: 'Adds 1 garbage row to both fields when placed.',
    leadPower: 'Deals 0.5 attack per cell, locks instantly, and cannot be held.',
    wardBlock: 'Blocks 2 incoming garbage rows when placed. It deals no attack when cleared.',
    glass: 'Deals 0.5 attack per cell, but shatters on hard drop impact.',
    timeBomb: 'Counts down after placement. Clearing it triggers a 5x5 blast.',
    overdrive: 'Fires 4.0 attack immediately when placed.',
    megaCleanse: 'Removes 6 garbage rows immediately when placed.',
    panicWall: 'Blocks up to 8 incoming garbage rows immediately when placed.',
    flashStrike: 'Fires 2.0 attack immediately when placed.',
    aidCleanse: 'Removes 2 garbage rows immediately when placed.',
    crush: 'Compacts every occupied column when placed.',
    dispel: 'Temporarily removes the enemy special effect and clears its ability gauge.'
  },
  ja: {
    none: '安定して積める標準ブロックです。',
    highPower: '消したセル1つにつき攻撃力0.3。',
    oddPower: '置きにくいかわりに通常より高い攻撃力を持ちます。',
    bomb: '消すと爆弾の周囲3x3を破壊します。',
    manaBonus: '消したセルが追加MPを回復します。',
    purgeGarbage: '消したクレンズセル数に応じて自分のゴミ行を除去します。',
    instantAttack: '配置時に即座に攻撃力1.2を発射します。',
    instantGuard: '配置時に受けるゴミを最大3行ブロックします。',
    instantMana: '配置時にMPを18回復します。',
    instantPurge: '配置時にゴミ行を1行除去します。',
    curse: 'デッキを詰まらせる妨害ブロックです。',
    wideCurse: 'デッキを詰まらせる6セルの広い妨害ブロックです。',
    coolant: 'ラインクリア時に敵を短時間遅くします。',
    comboCharge: '次のラインクリアの攻撃力を蓄積して強化します。',
    bounty: 'ラインクリア時にゴールドを獲得します。',
    unstable: '配置時に自分と敵のフィールドへゴミを1行ずつ追加します。',
    leadPower: 'セルごとに攻撃力0.5。着地時に即固定され、ホールドできません。',
    wardBlock: '配置時に敵攻撃を2行ブロックします。消しても攻撃力は0です。',
    glass: 'セルごとに攻撃力0.5。ただしハードドロップ衝撃で割れます。',
    timeBomb: '配置後にカウントダウンし、消すと5x5の大爆発を起こします。',
    overdrive: '配置時に即座に攻撃力4.0を発射します。',
    megaCleanse: '配置時にゴミ行を6行除去します。',
    panicWall: '配置時に受けるゴミを最大8行ブロックします。',
    flashStrike: '配置時に即座に攻撃力2.0を発射します。',
    aidCleanse: '配置時にゴミ行を2行除去します。',
    crush: '配置時に占有した列を下へ圧縮します。',
    dispel: '敵の現在の特殊効果を一時解除し、能力ゲージを空にします。'
  }
};

const DATA = {
  skill: {
    minor_purge: { en: ['Minor Purge', 'Remove the lowest garbage row.'], ja: ['小パージ', '一番下のゴミ行を1行除去します。'] },
    double_shot: { en: ['Double Shot', 'Your next line clear deals double attack.'], ja: ['ダブルショット', '次のラインクリアの攻撃力が2倍になります。'] },
    quick_cycle: { en: ['Quick Cycle', 'Discard the current block and draw the next one.'], ja: ['クイック循環', '現在のブロックを捨てて次のブロックを引きます。'] },
    emergency_shard: { en: ['Emergency Shard', 'Compress the current block into a 1x1 shard and place it immediately.'], ja: ['緊急破片', '現在のブロックを1x1の破片に圧縮して即配置します。'] },
    bomb_piece: { en: ['Bomb Conversion', 'Turn the current block into a 1x1 bomb. Clearing it causes a 3x3 blast.'], ja: ['爆弾変換', '現在のブロックを1x1爆弾に変えます。消すと3x3爆発。'] },
    line_shave: { en: ['Line Shave', 'Delete the bottom 2 occupied rows of your field.'], ja: ['ライン削り', '自分のフィールド下部の占有行を2行削除します。'] },
    panic_guard: { en: ['Panic Guard', 'Immediately blocks all queued garbage attacks.'], ja: ['パニックガード', '予定されたゴミ攻撃をすべて即時ブロックします。'] },
    overcharge: { en: ['Overcharge', 'Your next 3 line clears deal 50% more attack.'], ja: ['過充電', '次の3回のラインクリア攻撃力が50%増加します。'] },
    hyper_force: { en: ['Hyper Force', 'For 1.5 seconds, force enemy blocks down early to disrupt placement.'], ja: ['ハイパーフォース', '1.5秒間、敵ブロックを早めに強制落下させて配置を乱します。'] },
    purge: { en: ['Purge', 'Remove the lowest 3 garbage rows without taking damage.'], ja: ['パージ', 'ダメージなしで一番下のゴミ行を3行除去します。'] },
    all_i_mode: { en: ['All-I Mode', 'The next 4 blocks are all I minos.'], ja: ['オールIモード', '次の4個のブロックがすべてIミノになります。'] },
    time_warp: { en: ['Time Warp', 'Slow enemy actions for 5 seconds.'], ja: ['タイムワープ', '5秒間、敵の行動速度を低下させます。'] },
    magnetic_collapse: { en: ['Weight Injection', 'Make the next block a crusher that compacts occupied columns.'], ja: ['重量注入', '次のブロックを、置いた列を圧縮する重量ブロックにします。'] },
    garbage_barrage: { en: ['Garbage Barrage', 'Send 2 garbage rows to the enemy immediately.'], ja: ['ゴミ一斉射撃', '敵へゴミ2行を即時送ります。'] },
    scramble_strike: { en: ['Row Scramble', 'Randomly shift every row on the enemy field left or right.'], ja: ['列スクランブル', '敵フィールドの全行を左右へランダムにずらします。'] },
    rotate_seal: { en: ['Rotation Seal', 'Prevent the enemy from rotating blocks for 3.5 seconds.'], ja: ['回転封印', '3.5秒間、敵がブロックを回転できなくなります。'] },
    gauge_stall: { en: ['Gauge Stall', 'For 10 seconds, incoming attacks take 2 seconds longer to arrive and convert.'], ja: ['ゲージ遅延', '10秒間、受ける攻撃の到着・変換時間が2秒長くなります。'] },
    ward_pulse: { en: ['Gauge Block', 'Immediately blocks 4 rows of attacks stored in the gauge.'], ja: ['ゲージブロック', 'ゲージに溜まった敵攻撃を即座に4行ブロックします。'] },
    hold_lock: { en: ['Hold Lock', 'Lock the enemy hold slot for 20 seconds.'], ja: ['ホールドロック', '20秒間、敵のホールド枠をロックします。'] },
    mana_burn: { en: ['Mana Burn', 'Remove all garbage rows from your field and attack for 0.5 per row removed.'], ja: ['マナ燃焼', '自分のゴミ行をすべて除去し、除去数x0.5で即攻撃します。'] },
    mana_barrage: { en: ['Mana Barrage', 'Send 5 garbage rows immediately and slow the enemy for 3 seconds.'], ja: ['マナ砲撃', '敵へゴミ5行を即送信し、3秒間遅くします。'] },
    resonance: { en: ['Resonance', 'Your next 6 line clears deal 50% more attack.'], ja: ['共鳴', '次の6回のラインクリア攻撃力が50%増加します。'] }
  },
  consumable: {
    battery: { en: ['MP Battery', 'Gain 35 MP immediately.'], ja: ['MPバッテリー', 'MPを35即時獲得します。'] },
    shield: { en: ['Garbage Shield', 'Remove all queued garbage.'], ja: ['ゴミシールド', '予定されたゴミをすべて除去します。'] },
    bomb: { en: ['Floor Bomb', 'Delete the lowest 2 occupied rows without damage.'], ja: ['床爆弾', 'ダメージなしで一番下の占有行を2行削除します。'] },
    focus: { en: ['Focus Chip', 'Slow enemy actions for 10 seconds.'], ja: ['集中チップ', '10秒間、敵の行動速度を低下させます。'] },
    cleanse: { en: ['Universal Cleanse', 'Cleanse 4 garbage rows from your field.'], ja: ['万能クレンズ', '自分のゴミ行を4行浄化します。'] },
    reroll_token: { en: ['Reroll Token', 'Reroll the upcoming block queue.'], ja: ['リロールトークン', '次に出るブロックキューを引き直します。'] },
    gold_pouch: { en: ['Gold Pouch', 'Gain 20-40 gold immediately.'], ja: ['ゴールド袋', '20-40ゴールドを即時獲得します。'] },
    hp_patch: { en: ['HP Patch', 'Increase max HP (field height) by 2 rows.'], ja: ['HPパッチ', '最大HP(フィールド高)を2行増やします。'] },
    time_stop: { en: ['Time Stop', 'Stop your block from falling for 3 seconds.'], ja: ['時間停止', '3秒間、自分のブロックの落下を止めます。'] },
    igniter: { en: ['Igniter', 'Detonate all bomb and time-bomb blocks on your field.'], ja: ['点火器', '自分の爆弾・時限爆弾ブロックをすべて即起爆します。'] },
    hole_grenade: { en: ['Hole Grenade', 'Punch 5 random holes in the enemy field.'], ja: ['穴グレネード', '敵フィールドにランダムな穴を5つ開けます。'] },
    blackout_packet: { en: ['Blackout Packet', 'Seal enemy hold and rotation for 3 seconds.'], ja: ['停電パケット', '3秒間、敵のホールドと回転を同時に封印します。'] }
  },
  relic: {
    combo_amp: { en: ['Combo Amplifier', 'At 2+ combo, attack is increased by 25%.'], ja: ['コンボ増幅器', '2コンボ以上で攻撃力が25%増加します。'] },
    mana_lens: { en: ['Mana Lens', 'After line clears, recover 35% extra base MP.'], ja: ['マナレンズ', 'ラインクリア後、基本MP回復量の35%を追加回復します。'] },
    garbage_buffer: { en: ['Garbage Buffer', 'Each enemy hit is reduced by 1 garbage row.'], ja: ['ゴミ緩衝器', '敵の攻撃が命中するたびゴミが1行減ります。'] },
    hold_cache: { en: ['Hold Cache', 'If hold is empty during battle, MP recovery increases by 50%.'], ja: ['ホールドキャッシュ', '戦闘中ホールド枠が空ならMP回復量が50%増加します。'] },
    steel_heart: { en: ['Steel Heart', 'At the start of each battle, max HP increases by 1.'], ja: ['鋼の心臓', '戦闘開始ごとに最大HPが1増加します。'] },
    natural_heal: { en: ['Natural Heal', 'At the start of each battle, cleanse 2 garbage rows.'], ja: ['自然治癒', '戦闘開始ごとに自分のゴミ2行を浄化します。'] },
    first_strike: { en: ['First-Move Bonus', 'The first line clear each battle deals triple attack.'], ja: ['初手ボーナス', '各戦闘の最初のラインクリア攻撃力が3倍になります。'] },
    merchant_token: { en: ['Merchant Token', 'Shop prices are 25% cheaper.'], ja: ['商人の証', 'ショップ商品の価格が25%安くなります。'] },
    warehouse_key: { en: ['Warehouse Key', 'Buying an item restocks a new item of the same type indefinitely.'], ja: ['倉庫番の鍵', 'ショップで購入すると同種の商品が無限に再入荷します。'] },
    phoenix_feather: { en: ['Phoenix Feather', 'Once, when you would fall, remove all garbage rows and survive.'], ja: ['不死鳥の羽', '倒れる危機に一度だけ、全ゴミ行を除去して耐えます。'] },
    greed: { en: ['Greed', 'Gold rewards from battle victories increase by 20%.'], ja: ['欲張り', '戦闘勝利のゴールド報酬が20%増加します。'] },
    first_aid: { en: ['First Aid', 'If your field has 6+ garbage rows, attack increases by 30%.'], ja: ['応急処置', '自分のフィールドにゴミが6行以上あると攻撃力が30%増加します。'] },
    combo_keeper: { en: ['Combo Keeper', 'One miss will not break your combo. Recharges on the next clear.'], ja: ['コンボ保存', '一度のミスではコンボが切れません。次のクリアで再充電。'] },
    mana_surge: { en: ['Mana Surge', 'Max MP increases from 100 to 120.'], ja: ['マナ過給', '最大MPが100から120に増加します。'] },
    chain_reactor: { en: ['Chain Reactor', 'Explosions chain into other bombs and time bombs in range.'], ja: ['連鎖反応炉', '爆発範囲内の他の爆弾・時限爆弾も連鎖起爆します。'] },
    bounty_market: { en: ['Bounty Market', 'Gold gained from bounty blocks is doubled.'], ja: ['賞金取引所', '賞金ブロックで得るゴールドが2倍になります。'] },
    preservation_seal: { en: ['Preservation Seal', 'Exhaust/one-use blocks remain in the deck instead of exhausting.'], ja: ['消滅封印', '消滅/一回用ブロックが消滅せずデッキに残ります。'] },
    alchemy_core: { en: ['Alchemy Core', 'On pickup, transform each basic block in your deck into a random special block.'], ja: ['錬金術核', '獲得時、自分の基本ブロックをそれぞれランダムな特殊ブロックに変換します。'] },
    set_overload: { en: ['Overload Core', '[Power Set] If one clear deals 2+ attack, add +1 damage.'], ja: ['過負荷コア', '[パワーセット] 1回のクリア攻撃力が2以上なら+1追加ダメージ。'] },
    set_blastcap: { en: ['Blast Cap', '[Bomb Set] All explosion radii increase by +1.'], ja: ['大爆発信管', '[ボムセット] すべての爆発半径が+1増加します。'] },
    set_manawell: { en: ['Mana Well', '[Mana Set] All skill cooldowns are reduced by 50%.'], ja: ['マナ井戸', '[マナセット] すべてのスキルクールタイムが50%減少します。'] },
    set_sanctuary: { en: ['Cleansing Sanctuary', '[Cleanse Set] Each cleansed garbage row grants +0.5 attack.'], ja: ['浄化の聖域', '[クレンズセット] ゴミ行を浄化するたび攻撃力+0.5。'] },
    set_abszero: { en: ['Absolute Zero', '[Coolant Set] Slow duration is doubled. While slowed, your attack +1 and damage taken -1.'], ja: ['絶対零度', '[冷却セット] 冷却鈍化が2倍。鈍化中は自分の攻撃+1、被害-1。'] },
    set_goldhand: { en: ['Golden Hand', '[Bounty Set] Damage scales with held gold, up to +100% at 200 gold.'], ja: ['黄金の手', '[賞金セット] 所持ゴールドに比例して与ダメージ強化。200Gで最大+100%。'] },
    set_bulwark: { en: ['Bulwark Veil', '[Ward Set] Incoming attacks take +2s to arrive and +2s to convert.'], ja: ['鉄壁の幕', '[ブロックセット] 受ける攻撃の到着と変換がそれぞれ+2秒。'] },
    ward_delay: { en: ['Delay Veil', 'Incoming attacks take 1 second longer to arrive.'], ja: ['遅延の幕', '受ける攻撃の到着が1秒遅くなります。'] },
    set_comboengine: { en: ['Combo Engine', '[Combo Set] Combo attack scaling is improved.'], ja: ['コンボエンジン', '[コンボセット] コンボ攻撃倍率の伸びが強化されます。'] },
    foresight: { en: ['Foresight Eye', 'Next preview increases from 3 blocks to 5.'], ja: ['予知の眼', '次ブロックのプレビューが3個から5個に増えます。'] },
    frost_lock: { en: ['Frost Lock', 'Applying slow to an already slowed enemy also stuns them for half that duration.'], ja: ['霜の錠', 'すでに鈍化中の敵へ新たに鈍化をかけると、その半分の時間スタンします。'] },
    charge_capacitor: { en: ['Charge Capacitor', 'Combo charge max stacks increase from 3 to 5, and half remain after use.'], ja: ['電荷蓄電器', 'コンボチャージ最大が3から5になり、消費後に半分残ります。'] },
    instant_gauge: { en: ['Instant Alarm', 'Incoming attacks arrive immediately. Max garbage taken at once is capped at 3.'], ja: ['即時警報', '受ける攻撃ゲージが即座に到着します。一度に受ける最大ゴミは3行。'] }
  },
  enemy: {
    soft_starter: { en: ['Soft Starter', 'Slow stacker. Low HP and gentle pressure.'], ja: ['ソフトスターター', '遅い積み手。低HPで圧力は弱め。'] },
    line_hunter: { en: ['Line Hunter', 'Clears singles often and applies steady pressure.'], ja: ['ラインハンター', '単発クリアを多用し、着実に圧をかけます。'] },
    speed_drone: { en: ['Speed Drone', 'Very fast but fragile. High stress, higher reward.'], ja: ['スピードドローン', '非常に速いが脆い。緊張度が高く報酬も高め。'] },
    opener_script: { en: ['Opener Script', 'OPENER pattern: explosive setup, very low HP.'], ja: ['オープナースクリプト', 'OPENER型: 爆発的な準備、非常に低いHP。'] },
    stride_engine: { en: ['Stride Engine', 'STRIDE pattern: steady quad and spin pressure.'], ja: ['ストライドエンジン', 'STRIDE型: 安定したクアッドとスピン圧。'] },
    plonk_gambler: { en: ['Plonk Gambler', 'PLONK pattern: endures pressure, then aims for burst damage.'], ja: ['プロンクギャンブラー', 'PLONK型: 圧を耐えて爆発的ダメージを狙います。'] },
    infds_shell: { en: ['INF DS Shell', 'INF DS pattern: defensive downstacking and field cleanup.'], ja: ['INF DSシェル', 'INF DS型: 防御的なダウンスタックと整地。'] },
    bomb_adept: { en: ['Bomb Adept', 'Adds bomb blocks from midgame onward.'], ja: ['ボム使い', '中盤から爆弾ブロックを追加します。'] },
    mana_thief: { en: ['Mana Thief', 'Midgame caster that periodically slows the player.'], ja: ['マナ盗賊', '定期的にプレイヤーを遅くする中盤キャスター。'] },
    cleanse_warden: { en: ['Cleanse Warden', 'Uses cleanse blocks and resists garbage pressure.'], ja: ['クレンズ番人', 'クレンズブロックを使い、ゴミ圧に抵抗します。'] },
    berserker: { en: ['Berserker', 'AGGRO pattern: stacks fast and attacks endlessly, even when messy.'], ja: ['狂戦士', 'AGGRO型: 荒れても速く積み、絶えず攻撃します。'] },
    ward_mage: { en: ['Ward Mage', 'Clears the gauge with ward blocks and builds pressure with combo charge.'], ja: ['防壁術師', 'ブロックでゲージを空にし、コンボチャージで圧を重ねます。'] },
    rush_drone: { en: ['Rush Drone', 'Gauge rush: accelerates arrival and conversion of incoming attacks.'], ja: ['催促ドローン', 'ゲージ加速: 攻撃の到着・変換を短縮して圧を速めます。'] },
    demolitionist: { en: ['Demolitionist', 'Sets time bombs and bombs while polluting your deck.'], ja: ['爆破工', '時限爆弾と爆弾を置き、デッキを汚染します。'] },
    turtle_gatekeeper: { en: ['Turtle Gatekeeper', 'TURTLE pattern: avoids holes and drags the battle out.'], ja: ['亀の門番', 'TURTLE型: 穴を極力避け、長期戦に持ち込みます。'] },
    glass_dancer: { en: ['Glass Dancer', 'SPIKER pattern: digs a well and aims for huge quad bursts.'], ja: ['ガラスの舞姫', 'SPIKER型: 井戸を掘り、大量クアッド爆発を狙います。'] },
    mirror_image: { en: ['Mirror Image', 'MIRROR: uses your deck at your falling speed. No skills, relics, or items.'], ja: ['鏡像', 'MIRROR: 自分と同じデッキを同じ落下速度で使う分身。スキル・遺物・アイテムなし。'] },
    elite_ceiling: { en: ['Elite: Ceiling Crusher', 'High HP, early pressure, rare block rewards.'], ja: ['エリート: 天井圧迫機', '高HP、序盤圧、希少ブロック報酬。'] },
    elite_power: { en: ['Elite: Power Core', 'Deals huge burst damage with many power blocks.'], ja: ['エリート: パワーコア', '多数のパワーブロックで大きな爆発ダメージ。'] },
    elite_cross: { en: ['Elite: Cross Engine', 'Odd shapes, high variance, elite rewards.'], ja: ['エリート: クロスエンジン', '特殊な形、高い分散、エリート報酬。'] },
    elite_opener: { en: ['Elite: Opener Lab', 'OPENER elite: very low HP, extremely fast early burst.'], ja: ['エリート: オープナー研究所', 'OPENERエリート: 低HP、極端に速い序盤爆発。'] },
    elite_plonk: { en: ['Elite: Plonk Bolt', 'PLONK elite: endures pressure and counters hard.'], ja: ['エリート: プロンクボルト', 'PLONKエリート: 圧を耐えて強く反撃。'] },
    elite_aggro: { en: ['Elite: Frenzy Core', 'AGGRO elite: relentless extreme offense.'], ja: ['エリート: 狂乱コア', 'AGGROエリート: 止まらない極端攻撃。'] },
    elite_crusher: { en: ['Elite: Heavy Crusher', 'Crushes you with a heavy lead deck and rotation seal.'], ja: ['エリート: 重量粉砕機', '重い鉛デッキと回転封印で押しつぶします。'] },
    elite_polluter: { en: ['Elite: Polluter', 'CHEESE elite: odd pressure and constant deck pollution.'], ja: ['エリート: 汚染源', 'CHEESEエリート: 変則圧と継続デッキ汚染。'] },
    boss_overload: { en: ['Final Boss: Overload Core', 'OVERLOAD: when the gauge fills, casts random fog, invert, rotation seal, hyper, slow, or durable garbage.'], ja: ['最終ボス: オーバーロードコア', 'OVERLOAD: ゲージが溜まると霧・反転・回転封印・ハイパー・鈍化・持続ゴミをランダムに使用。'] }
  }
};

const ENEMY_ABILITIES = {
  spike: { en: ['Garbage Spike', 'Immediately sends +1 garbage row.'], ja: ['ゴミ急増', 'ゴミ行+1を即時送信します。'] },
  slowPlayer: { en: ['Gravity Slow', 'For 3 seconds, fall speed is reduced and hard drop is disabled.'], ja: ['重力鈍化', '3秒間、落下速度低下・ハードドロップ不可。'] },
  power: { en: ['Power Burst', 'Immediately sends +2 garbage rows.'], ja: ['パワー爆発', 'ゴミ行+2を即時送信します。'] },
  rotateLockPlayer: { en: ['Rotation Seal', 'Seals block rotation for 2 seconds.'], ja: ['回転封印', '2秒間、ブロック回転を封印します。'] },
  hyperBurst: { en: ['Hyper Fall', 'Blocks fall extremely fast for 5 seconds.'], ja: ['ハイパー落下', '5秒間、ブロックが極端に速く落下します。'] },
  polluteDeck: { en: ['Deck Pollution', 'Injects one nuisance lead block into your deck.'], ja: ['デッキ汚染', '自分のデッキに妨害ブロック(鉛の塊)を1枚注入します。'] },
  rushGauge: { en: ['Gauge Rush', 'Enemy attacks arrive faster in the gauge for 5 seconds.'], ja: ['ゲージ加速', '5秒間、敵攻撃がゲージでより速く到着します。'] },
  overload: { en: ['OVERLOAD', 'When the gauge fills, casts a random debuff.'], ja: ['OVERLOAD', 'ゲージが溜まるとランダムなデバフを使用します。'] }
};

const CHALLENGES = {
  noHold: { en: ['No Hold', 'Win without using hold'], ja: ['ホールド禁止', 'ホールドを一度も使わず勝利'] },
  noSkill: { en: ['No Skills', 'Win without using any skills'], ja: ['スキル禁止', 'スキルを一度も使わず勝利'] },
  noHardDrop: { en: ['No Hard Drop', 'Win without using hard drop'], ja: ['ハードドロップ禁止', 'ハードドロップを使わず勝利'] },
  cwOnly: { en: ['Clockwise Only', 'Win using only clockwise rotation'], ja: ['時計回転のみ', '反時計回転なしで時計回転だけ使って勝利'] },
  ccwOnly: { en: ['Counterclockwise Only', 'Win using only counterclockwise rotation'], ja: ['反時計回転のみ', '時計回転なしで反時計回転だけ使って勝利'] },
  timeAttack: { en: ['Time Attack', p => `Win within ${p.limit} seconds`], ja: ['タイムアタック', p => `${p.limit}秒以内に勝利`] },
  clearLines: { en: ['Line Rush', p => `Clear at least ${p.target} lines in this battle and win`], ja: ['ラインラッシュ', p => `この戦闘で${p.target}ライン以上消して勝利`] }
};

const UI = {
  ko: {
    gold: '골드',
    nextBattle: '다음 전투',
    deal: '특가 ',
    locked: '고정됨',
    lock: '고정',
    reroll: '리롤',
    rerollDesc: '상점 상품을 새로 뽑습니다. 리롤할 때마다 비용이 10G씩 증가합니다.',
    soldOut: '품절',
    buy: '구매',
    skills: '스킬',
    consumables: '소모품',
    relics: '유물',
    cardPickRemove: '제거할 카드 선택',
    hpRows: n => `HP +${n}줄`
  },
  en: {
    round: n => `${n} Round`, roundClear: n => `Round ${n} Clear`, gold: 'Gold', deck: 'Deck',
    cardsUnit: 'cards', chooseOne: 'Choose one', challenge: 'Challenge', reward: 'Reward', ability: 'Ability',
    nextBattle: 'Next Battle', deal: 'Deal ', locked: 'Locked', lock: 'Lock', reroll: 'Reroll',
    rerollDesc: 'Draw a fresh set of shop items. The cost increases by 10G each time you reroll.',
    close: 'Close', skills: 'Skills', consumables: 'Consumables', relics: 'Relics',
    noneSkills: 'No equipped skills.', noneConsumables: 'No consumables owned.', noneRelics: 'No relics owned.',
    remove: 'Remove', cardPickRemove: 'Choose a card to remove', added: 'added', obtained: 'obtained',
    event: 'Event', bet: 'Bet', cleanup: 'Clean up carried garbage', gain: 'Gain',
    starterTitle: 'Choose Starting Skill', starterMeta: 'Choose a skill to start the run.',
    startEvent: 'Starting Event', afterRound: n => `After Round ${n}`, oneChoice: 'Choose one',
    spendRows: n => `Spend ${n} max HP rows to obtain it.`, itemFull: 'If item slots are full, replace one or skip.',
    skillFull: 'If skill slots are full, replace one or skip.', skip: 'Skip', empty: 'Empty',
    removeCardTitle: 'Remove Card', removeCardDesc: price => `Pay ${price}G to remove 1 card from your deck.`,
    equip: 'Equip', acquire: 'Acquire', slot: 'Slot', hpRows: n => `HP +${n} rows`,
    blockReward: 'Block reward', buy: 'Buy', specialEffect: 'Special effect',
    fallbackCardDesc: 'Add this block to your deck.', soldOut: 'Sold Out'
  },
  ja: {
    round: n => `${n}ラウンド`, roundClear: n => `${n}ラウンドクリア`, gold: 'ゴールド', deck: 'デッキ',
    cardsUnit: '枚', chooseOne: '1つ選択', challenge: '挑戦', reward: '報酬', ability: '能力',
    nextBattle: '次の戦闘', deal: '特価 ', locked: 'ロック中', lock: 'ロック', reroll: 'リロール',
    rerollDesc: 'ショップ商品を新しく引き直します。リロールするたび費用が10G増加します。',
    close: '閉じる', skills: 'スキル', consumables: '消耗品', relics: '遺物',
    noneSkills: '装備中のスキルなし。', noneConsumables: '所持消耗品なし。', noneRelics: '所持遺物なし。',
    remove: '除去', cardPickRemove: 'カード選択除去', added: '追加', obtained: '獲得',
    event: 'イベント', bet: 'ベット', cleanup: '持ち越しゴミ除去', gain: '獲得',
    starterTitle: '開始スキル選択', starterMeta: 'ランを開始するスキルを選んでください。',
    startEvent: '開始イベント', afterRound: n => `${n}ラウンド後`, oneChoice: '1つ選択',
    spendRows: n => `最大HP ${n}行を消費して獲得します。`, itemFull: 'アイテム枠が満杯なら交換するかスキップします。',
    skillFull: 'スキル枠が満杯なら交換するかスキップします。', skip: 'スキップ', empty: '空き',
    removeCardTitle: 'カード除去', removeCardDesc: price => `${price}Gを支払い、デッキからカードを1枚除去します。`,
    equip: '装備', acquire: '獲得', slot: 'スロット', hpRows: n => `HP +${n}行`,
    blockReward: 'ブロック報酬', buy: '購入', specialEffect: '特殊効果',
    fallbackCardDesc: 'このブロックをデッキに追加します。', soldOut: '売り切れ'
  }
};

function langTable(table) {
  return table?.[current] || table?.en || table?.ko;
}

function dataEntry(kind, id) {
  return DATA[kind]?.[id]?.[current];
}

export function ui(key, ...args) {
  const value = UI[current]?.[key] || UI.en[key] || key;
  return typeof value === 'function' ? value(...args) : value;
}

export function dataName(kind, objOrId, fallback = '') {
  const id = typeof objOrId === 'string' ? objOrId : objOrId?.id;
  if (current === 'ko') return fallback || (typeof objOrId === 'object' ? objOrId?.name : id);
  return dataEntry(kind, id)?.[0] || fallback || id;
}

export function dataDesc(kind, objOrId, fallback = '') {
  const id = typeof objOrId === 'string' ? objOrId : objOrId?.id;
  if (current === 'ko') return fallback || (typeof objOrId === 'object' ? objOrId?.desc : '');
  return dataEntry(kind, id)?.[1] || fallback || '';
}

export function trCardName(cardOrId, fallback = '') {
  const card = typeof cardOrId === 'object' ? cardOrId : null;
  if (current === 'ko' || !card) return fallback || card?.name || String(cardOrId || '');
  const shape = SHAPE_LABELS[current]?.[card.shapeId] || card.shapeId || '';
  const ability = ABILITY_LABELS[current]?.[card.abilityId] || '';
  if (!ability) return shape;
  if (card.abilityId === 'curse') return current === 'ja' ? `ジャンク${shape}` : `Junk ${shape}`;
  if (card.abilityId === 'wideCurse') return current === 'ja' ? `ワイドジャンク${shape}` : `Wide Junk ${shape}`;
  return current === 'ja' ? `${ability}${shape}` : `${ability} ${shape}`;
}

export function trCardDesc(cardOrId, fallback = '') {
  const card = typeof cardOrId === 'object' ? cardOrId : null;
  if (current === 'ko' || !card) return fallback || '';
  const desc = ABILITY_DESCS[current]?.[card.abilityId] || UI[current]?.fallbackCardDesc || fallback;
  const once = card.exhaust ? (current === 'ja' ? ' 戦闘ごとに一度だけ登場します。' : ' Appears only once per battle.') : '';
  return `${desc}${once}`;
}

export function trEnemyName(enemy, fallback = '') {
  if (current === 'ko') return fallback || enemy?.name || '';
  return dataEntry('enemy', enemy?.i18nKey)?.[0] || fallback || enemy?.name || '';
}

export function trEnemyStyle(enemy, fallback = '') {
  if (current === 'ko') return fallback || enemy?.style || '';
  return dataEntry('enemy', enemy?.i18nKey)?.[1] || fallback || enemy?.style || '';
}

export function trAbilityName(id, fallback = '') {
  if (current === 'ko') return fallback || id;
  return ENEMY_ABILITIES[id]?.[current]?.[0] || fallback || id;
}

export function trAbilityDesc(id, fallback = '') {
  if (current === 'ko') return fallback || '';
  return ENEMY_ABILITIES[id]?.[current]?.[1] || fallback || '';
}

export function trChallengeLabel(challenge, fallback = '') {
  if (current === 'ko') return fallback || challenge?.label || '';
  return CHALLENGES[challenge?.id]?.[current]?.[0] || fallback || challenge?.label || '';
}

export function trChallengeCond(challenge, fallback = '') {
  if (current === 'ko') return fallback || challenge?.cond || '';
  const entry = CHALLENGES[challenge?.id]?.[current]?.[1];
  return typeof entry === 'function' ? entry(challenge?.params || {}) : entry || fallback || challenge?.cond || '';
}

export function trRewardLabel(reward, fallback = '') {
  if (current === 'ko') return fallback || reward?.label || '';
  if (!reward) return fallback;
  if (reward.kind === 'gold') return `${ui('gold')} +${reward.amount}`;
  if (reward.kind === 'consumable') return `${ui('consumables')} "${dataName('consumable', reward.id, reward.label)}"`;
  if (reward.kind === 'relic') return `${ui('relics')} "${dataName('relic', reward.id, reward.label)}"`;
  if (reward.kind === 'skill') return `${ui('skills')} "${dataName('skill', reward.id, reward.label)}"`;
  return fallback || reward.label || '';
}

export function trRewardDetail(reward, fallback = '') {
  if (current === 'ko') return fallback || reward?.detail || '';
  if (!reward) return fallback;
  if (reward.kind === 'gold') return current === 'ja'
    ? `戦闘報酬として${reward.amount}ゴールドを受け取ります。`
    : `Receive ${reward.amount} gold as a battle reward.`;
  if (reward.kind === 'consumable') return dataDesc('consumable', reward.id, reward.detail);
  if (reward.kind === 'relic') return dataDesc('relic', reward.id, reward.detail);
  if (reward.kind === 'skill') return dataDesc('skill', reward.id, reward.detail);
  return fallback || reward.detail || '';
}
