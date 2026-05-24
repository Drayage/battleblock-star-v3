// 게임 데이터 번역 — 스킬/소모품/유물/적/카드/능력의 name·desc·style 등.
// 한국어가 기본(원본). 영어·일본어 번역이 누락된 항목은 한국어 fallback.
// 추가 번역은 해당 키 아래 { en, ja } 형태로 채우면 자동 반영.

import { getLang } from './i18n.js?v=20260524-audio4';

// === 스킬 ===
const SKILL = {
  minor_purge:   { name: { en: 'Minor Purge',      ja: 'マイナーパージ' }, desc: { en: 'Removes the lowest 1 garbage row.', ja: '最下段のガベージ1行を除去。' } },
  double_shot:   { name: { en: 'Double Shot',      ja: 'ダブルショット' }, desc: { en: 'Next line clear deals double attack.', ja: '次のラインクリアの攻撃力が2倍。' } },
  quick_cycle:   { name: { en: 'Quick Cycle',      ja: 'クイックサイクル' }, desc: { en: 'Discard current piece and draw next.', ja: '現ブロックを捨てて次を引く。' } },
  emergency_shard: { name: { en: 'Emergency Shard', ja: '緊急シャード' }, desc: { en: 'Compress current piece into a 1×1 shard and place instantly.', ja: '現ブロックを1×1シャードに圧縮して即配置。' } },
  bomb_piece:    { name: { en: 'Bomb Conversion',  ja: 'ボム変換' }, desc: { en: 'Turns current piece into a 1×1 bomb. Detonates 3×3 when cleared.', ja: '現ブロックを1×1ボムに変える。ライン消去で3×3爆発。' } },
  line_shave:    { name: { en: 'Line Shave',       ja: 'ラインシェイブ' }, desc: { en: 'Deletes 2 lowest occupied rows on your field.', ja: '自フィールド最下段の占有2行を削除。' } },
  panic_guard:   { name: { en: 'Panic Guard',      ja: 'パニックガード' }, desc: { en: 'Instantly blocks all incoming garbage.', ja: '予定中の全ガベージを即遮断。' } },
  overcharge:    { name: { en: 'Overcharge',       ja: 'オーバーチャージ' }, desc: { en: 'Next 3 line clears deal +50% attack.', ja: '次の3回のラインクリアの攻撃力+50%。' } },
  hyper_force:   { name: { en: 'Hyper Force',      ja: 'ハイパーフォース' }, desc: { en: 'For 1.5s, force-drops enemy pieces to ruin placement.', ja: '1.5秒間、敵のブロックを強制落下させる。' } },
  purge:         { name: { en: 'Purge',            ja: 'パージ' }, desc: { en: 'Removes 3 lowest garbage rows with no damage.', ja: '被害なしで最下段のガベージ3行を除去。' } },
  all_i_mode:    { name: { en: 'All-I Mode',       ja: 'オールIモード' }, desc: { en: 'Next 4 pieces are all I tetrominoes.', ja: '次の4ブロックがすべてIミノ。' } },
  time_warp:     { name: { en: 'Time Warp',        ja: 'タイムワープ' }, desc: { en: 'Slows enemy actions for 5s.', ja: '5秒間、敵の行動速度を遅くする。' } },
  magnetic_collapse: { name: { en: 'Heavy Inject', ja: '重量注入' }, desc: { en: 'Next piece becomes a heavy block (collapses empty cells in its columns).', ja: '次ブロックが重量ブロックに（占有列の空白を圧着）。' } },
  garbage_barrage: { name: { en: 'Garbage Barrage', ja: 'ガベージバラージ' }, desc: { en: 'Sends 2 garbage rows to the enemy instantly.', ja: '敵に即座にガベージ2行を送る。' } },
  scramble_strike: { name: { en: 'Scramble Strike', ja: 'スクランブルストライク' }, desc: { en: 'Randomly shifts all enemy rows left/right.', ja: '敵フィールドの全行を左右にランダムシフト。' } },
  rotate_seal:   { name: { en: 'Rotate Seal',      ja: '回転封印' }, desc: { en: 'Prevents enemy from rotating for 3.5s.', ja: '3.5秒間、敵が回転できなくなる。' } },
  gauge_stall:   { name: { en: 'Gauge Stall',      ja: 'ゲージ遅延' }, desc: { en: 'For 10s, incoming garbage takes 2s longer to arrive/turn red.', ja: '10秒間、被ダメージがゲージに到達/赤転換する時間が2秒延長。' } },
  ward_pulse:    { name: { en: 'Ward Pulse',       ja: 'ガードパルス' }, desc: { en: 'Wards off 4 lines of pending garbage instantly.', ja: 'ゲージにある敵攻撃を即座に4行遮断。' } },
  hold_lock:     { name: { en: 'Hold Lock',        ja: 'ホールドロック' }, desc: { en: 'Locks enemy hold slot for 20s.', ja: '20秒間、敵のホールドスロットを封じる。' } },
  mana_burn:     { name: { en: 'Mana Burn',        ja: 'マナバーン' }, desc: { en: 'Removes all garbage rows; attacks for cleared count × 0.5.', ja: '自フィールドのガベージ全消去。消去行数×0.5で即攻撃。' } },
  mana_barrage:  { name: { en: 'Mana Barrage',     ja: 'マナバラージ' }, desc: { en: 'Sends 5 garbage rows and slows enemy for 3s.', ja: '敵にガベージ5行を送り3秒間鈍化させる。' } },
  resonance:     { name: { en: 'Resonance',        ja: 'レゾナンス' }, desc: { en: 'Next 6 line clears deal +50% attack.', ja: '次の6回のラインクリアの攻撃力+50%。' } }
};

// === 소모품 ===
const CONSUMABLE = {
  battery:      { name: { en: 'MP Battery',     ja: 'MPバッテリー' }, desc: { en: 'Gain 35 MP instantly.', ja: 'MPを35即獲得。' } },
  shield:       { name: { en: 'Garbage Shield', ja: 'ガベージシールド' }, desc: { en: 'Removes all pending garbage.', ja: '予定中の全ガベージを除去。' } },
  bomb:         { name: { en: 'Floor Bomb',     ja: 'フロアボム' }, desc: { en: 'Deletes 2 lowest occupied rows with no damage.', ja: '被害なしで最下段の占有2行を削除。' } },
  focus:        { name: { en: 'Focus Chip',     ja: 'フォーカスチップ' }, desc: { en: 'Slows enemy actions for 10s.', ja: '10秒間、敵の行動速度を遅くする。' } },
  cleanse:      { name: { en: 'Universal Cleanse', ja: 'ユニバーサルクレンズ' }, desc: { en: 'Purges 4 garbage rows.', ja: '自ガベージ4行を浄化。' } },
  reroll_token: { name: { en: 'Reroll Token',   ja: 'リロールトークン' }, desc: { en: 'Redraws the upcoming piece queue.', ja: '次に出るブロックキューを引き直す。' } },
  gold_pouch:   { name: { en: 'Gold Pouch',     ja: 'ゴールドポーチ' }, desc: { en: 'Gain 20–40 gold instantly.', ja: '20〜40ゴールド即獲得。' } },
  hp_patch:     { name: { en: 'HP Patch',       ja: 'HPパッチ' }, desc: { en: 'Increases max HP (field height) by 2 rows.', ja: '最大HP(フィールド高)を2行拡張。' } },
  time_stop:    { name: { en: 'Time Stop',      ja: 'タイムストップ' }, desc: { en: 'Stops your own block falling for 3s.', ja: '3秒間、自ブロックの落下を停止。' } },
  igniter:      { name: { en: 'Igniter',        ja: 'イグナイター' }, desc: { en: 'Instantly detonates all bombs/time-bombs on your field.', ja: '自フィールドの全ボム/時限爆弾を即起爆。' } },
  hole_grenade: { name: { en: 'Hole Grenade',   ja: 'ホールグレネード' }, desc: { en: 'Punches 5 random holes in the enemy field.', ja: '敵フィールドにランダムな穴を5個開ける。' } },
  blackout_packet: { name: { en: 'Blackout Packet', ja: 'ブラックアウトパケット' }, desc: { en: 'Locks enemy hold and rotation for 3s.', ja: '3秒間、敵のホールドと回転を同時封印。' } }
};

// === 유물 ===
const RELIC = {
  combo_amp:        { name: { en: 'Combo Amplifier',     ja: 'コンボアンプ' }, desc: { en: 'At combo 2+, attack +25%.', ja: '2コンボ以上で攻撃力+25%。' } },
  mana_lens:        { name: { en: 'Mana Lens',           ja: 'マナレンズ' }, desc: { en: 'After line clears, restore +35% bonus mana.', ja: 'ラインクリア後、基本マナ回復量の35%を追加回復。' } },
  garbage_buffer:   { name: { en: 'Garbage Buffer',      ja: 'ガベージバッファ' }, desc: { en: 'Each enemy hit lands with 1 fewer garbage row.', ja: '敵攻撃が命中するたびガベージが1行減少。' } },
  hold_cache:       { name: { en: 'Hold Cache',          ja: 'ホールドキャッシュ' }, desc: { en: 'While hold slot is empty in battle, mana gain +50%.', ja: '戦闘中、ホールド空きでマナ回復+50%。' } },
  steel_heart:      { name: { en: 'Steel Heart',         ja: 'スチールハート' }, desc: { en: 'Max HP (field height) +1 at the start of each battle.', ja: '戦闘開始ごとに最大HP(フィールド高)が1増加。' } },
  natural_heal:     { name: { en: 'Natural Heal',        ja: 'ナチュラルヒール' }, desc: { en: 'Purges 2 garbage rows at battle start.', ja: '戦闘開始時、自ガベージ2行を浄化。' } },
  first_strike:     { name: { en: 'First Strike',        ja: 'ファーストストライク' }, desc: { en: "First line clear of each battle deals 3× attack.", ja: '各戦闘の最初のラインクリア攻撃力が3倍。' } },
  merchant_token:   { name: { en: "Merchant's Token",    ja: '商人の証' }, desc: { en: 'Shop items cost 25% less.', ja: 'ショップ品の価格が25%安くなる。' } },
  warehouse_key:    { name: { en: "Warehouse Keeper's Key", ja: '倉庫番の鍵' }, desc: { en: 'Buying a shop item restocks it (same kind) indefinitely.', ja: 'ショップ品購入で同種が無限再入荷。' } },
  phoenix_feather:  { name: { en: 'Phoenix Feather',     ja: '不死鳥の羽' }, desc: { en: 'When defeated, clear all garbage and survive once (per run).', ja: '敗北寸前で全ガベージ除去し1回耐える(ラン1回)。' } },
  greed:            { name: { en: 'Greedy',              ja: '欲深き者' }, desc: { en: 'Victory gold reward +20%.', ja: '勝利時のゴールド報酬+20%。' } },
  first_aid:        { name: { en: 'First Aid',           ja: 'ファーストエイド' }, desc: { en: 'When 6+ garbage rows are stacked, attack +30%.', ja: '自フィールドにガベージ6行以上で攻撃+30%。' } },
  combo_keeper:     { name: { en: 'Combo Keeper',        ja: 'コンボキーパー' }, desc: { en: 'A single miss does not break combo (recharges next clear).', ja: 'ミス1回ではコンボ切れない(次クリアで再充電)。' } },
  mana_surge:       { name: { en: 'Mana Surge',          ja: 'マナサージ' }, desc: { en: 'Max MP from 100 to 120.', ja: '最大MPが100から120に増加。' } },
  chain_reactor:    { name: { en: 'Chain Reactor',       ja: 'チェーンリアクター' }, desc: { en: 'Explosions chain to nearby bombs/time-bombs.', ja: '爆発が範囲内の他ボム/時限爆弾を連鎖。' } },
  bounty_market:    { name: { en: 'Bounty Market',       ja: 'バウンティマーケット' }, desc: { en: 'Gold from bounty blocks doubled.', ja: 'バウンティブロックから得るゴールドが2倍。' } },
  preservation_seal: { name: { en: 'Preservation Seal',  ja: '消滅封印' }, desc: { en: 'Single-use/extinguish cards stay in the deck.', ja: '消滅/1回使い切りブロックが消えずにデッキに残る。' } },
  alchemy_core:     { name: { en: 'Alchemy Core',        ja: 'アルケミーコア' }, desc: { en: 'On pickup: each basic block in your deck becomes a random special block.', ja: '入手即時、自デッキの基本ブロックをそれぞれランダム特殊に変換。' } },
  set_overload:     { name: { en: 'Overload Core',       ja: '過負荷コア' }, desc: { en: '[Power Set] Clears dealing 2+ attack gain +1 bonus damage.', ja: '[パワーセット]攻撃力2以上のクリアで+1ボーナス。' } },
  set_blastcap:     { name: { en: 'Blast Cap',           ja: 'ブラストキャップ' }, desc: { en: '[Bomb Set] All blast radii +1.', ja: '[ボムセット]全爆発半径+1。' } },
  set_manawell:     { name: { en: 'Mana Well',           ja: 'マナウェル' }, desc: { en: '[Mana Set] All skill cooldowns -50%.', ja: '[マナセット]全スキルクールタイム-50%。' } },
  set_sanctuary:    { name: { en: 'Sanctuary',           ja: '聖域' }, desc: { en: '[Cleanse Set] +0.5 attack per garbage row purged.', ja: '[クレンズセット]ガベージ浄化のたび攻撃+0.5。' } },
  set_abszero:      { name: { en: 'Absolute Zero',       ja: '絶対零度' }, desc: { en: '[Coolant Set] Slow duration ×2. While slowed: +1 attack, -1 damage taken.', ja: '[冷却セット]鈍化持続2倍。鈍化中は与+1/受-1。' } },
  set_goldhand:     { name: { en: 'Golden Hand',         ja: '黄金の手' }, desc: { en: '[Bounty Set] Damage scales with gold (up to +100% at 200g).', ja: '[バウンティセット]所持ゴールドに比例して攻撃強化(200で最大+100%)。' } },
  set_bulwark:      { name: { en: 'Bulwark',             ja: '鉄壁の幕' }, desc: { en: '[Ward Set] Garbage gauge red-arrival/turn time +2s each.', ja: '[ガードセット]ゲージの赤到達時間+2秒、青→赤遷移も+2秒。' } },
  ward_delay:       { name: { en: 'Ward Delay',          ja: '遅延の幕' }, desc: { en: 'Incoming garbage takes 1s longer to turn red.', ja: '受け攻撃が赤に変わる時間が1秒延長。' } },
  set_comboengine:  { name: { en: 'Combo Engine',        ja: 'コンボエンジン' }, desc: { en: '[Combo Set] Combo multiplier growth increased.', ja: '[コンボセット]コンボ倍率の伸び強化。' } },
  foresight:        { name: { en: 'Eye of Foresight',    ja: '予見の眼' }, desc: { en: 'Next-block preview from 3 to 5.', ja: 'NEXTプレビューが3→5に増加。' } },
  frost_lock:       { name: { en: 'Frost Lock',          ja: 'フロストロック' }, desc: { en: 'When enemy is already slowed, 50% of new slow time becomes stun.', ja: '敵が鈍化中なら新規鈍化時間の50%だけ敵を停止(スタン)。' } },
  charge_capacitor: { name: { en: 'Charge Capacitor',    ja: 'チャージキャパシタ' }, desc: { en: 'Combo charge cap 3→5; half remains after consumption.', ja: 'コンボチャージ蓄積上限3→5、消費後に半分(切捨)残留。' } },
  instant_gauge:    { name: { en: 'Instant Alert',       ja: '即時警報' }, desc: { en: 'Incoming garbage turns red immediately and cannot be reverted by clears. Max 3 lines per receive.', ja: '受け攻撃ゲージが即赤に。クリアで青に戻せない。1回受領は最大3行に制限。' } }
};

// === 능력(블록 ability) ===
const ABILITY = {
  none:          { name: { en: 'Normal',         ja: '通常' }, desc: { en: 'Default tetromino cell.', ja: '基本テトロミノセル。' } },
  highPower:     { name: { en: 'High Power',     ja: '高出力' }, desc: { en: '0.3 attack per cleared cell.', ja: 'クリアされたセルあたり0.3攻撃力。' } },
  oddPower:      { name: { en: 'Efficient',      ja: '高効率' }, desc: { en: 'Awkward to place; higher per-cell attack than basic.', ja: '配置が難しい代わり、基本より高い攻撃力。' } },
  bomb:          { name: { en: 'Bomb',           ja: 'ボム' }, desc: { en: 'Detonates a 3×3 area when cleared.', ja: 'クリア時、中心3×3エリアを破壊。' } },
  manaBonus:     { name: { en: 'Mana',           ja: 'マナ' }, desc: { en: 'Cleared cells grant bonus MP.', ja: 'クリアされたセルが追加MPを提供。' } },
  purgeGarbage:  { name: { en: 'Cleanse',        ja: 'クレンズ' }, desc: { en: 'When cleared in a row, purges 1 garbage row per cleanse cell in that row.', ja: 'ラインクリア時、含まれるクレンズセルの数だけガベージ行を除去(1セル=1行)。' } },
  instantAttack: { name: { en: 'Instant Strike', ja: '即発攻撃' }, desc: { en: 'Fires 1.2 attack on placement.', ja: '配置即時に1.2攻撃力を発射。' } },
  instantGuard:  { name: { en: 'Instant Guard',  ja: '即発ガード' }, desc: { en: 'Blocks up to 3 incoming gauge on placement.', ja: '配置即時、ゲージ攻撃を最大3遮断。' } },
  instantMana:   { name: { en: 'Instant Mana',   ja: '即発マナ' }, desc: { en: 'Restores 18 MP on placement.', ja: '配置即時にMPを18回復。' } },
  instantPurge:  { name: { en: 'Instant Purge',  ja: '即発パージ' }, desc: { en: 'Removes 1 garbage row on placement.', ja: '配置即時にガベージ1行を除去。' } },
  curse:         { name: { en: 'Curse',          ja: '呪い' }, desc: { en: 'Deck-clogging hindrance block.', ja: 'デッキを塞ぐ妨害ブロック。' } },
  wideCurse:     { name: { en: 'Wide Curse',     ja: '広域呪い' }, desc: { en: '6-cell deck-clogging hindrance block.', ja: '6セルの妨害ブロック。' } },
  coolant:       { name: { en: 'Coolant',        ja: '冷却' }, desc: { en: 'On line clear, briefly slows enemy actions.', ja: 'ラインクリア時、敵の行動を一時的に遅くする。' } },
  comboCharge:   { name: { en: 'Combo Charge',   ja: 'コンボチャージ' }, desc: { en: 'On clear, next clear gains accumulated bonus attack.', ja: 'クリア時、次クリアの攻撃力が累積上昇。' } },
  bounty:        { name: { en: 'Bounty',         ja: 'バウンティ' }, desc: { en: 'On clear, earns gold.', ja: 'ラインクリア時、ゴールド獲得。' } },
  unstable:      { name: { en: 'Unstable',       ja: '不安定' }, desc: { en: 'On place, adds 1 garbage row to both fields.', ja: '配置時、自分と敵フィールドにガベージ1行ずつ追加。' } },
  leadPower:     { name: { en: 'Lead',           ja: '鉛' }, desc: { en: 'Heavy. 0.5 atk/cell. Locks on landing; cannot hold.', ja: 'セルあたり0.5攻撃力。着地即固定。ホールド不可。' } },
  wardBlock:     { name: { en: 'Ward',           ja: 'ガード' }, desc: { en: 'On place, removes 2 lines of pending enemy gauge. 0 attack.', ja: '配置即時、ゲージの敵攻撃2行を遮断。クリアしても攻撃力は0。' } },
  glass:         { name: { en: 'Glass',          ja: 'ガラス' }, desc: { en: 'Hard-drop or being landed on shatters it. Soft drop preserves.', ja: 'ハードドロップや上から落下されると割れて空白に。ソフトドロップなら維持。' } },
  timeBomb:      { name: { en: 'Time Bomb',      ja: '時限爆弾' }, desc: { en: 'Counts down each turn. At 0 the cell vanishes; cleared in a row → 5×5 detonation.', ja: '毎ターンカウントダウン。0で消失。ラインで消去すると5×5大爆発。' } },
  overdrive:     { name: { en: 'Overdrive',      ja: 'オーバードライブ' }, desc: { en: 'Fires 4.0 attack on placement.', ja: '配置即時に4.0攻撃力を発射。' } },
  megaCleanse:   { name: { en: 'Mega Cleanse',   ja: 'メガクレンズ' }, desc: { en: 'Removes 6 garbage rows on placement.', ja: '配置即時にガベージ6行を除去。' } },
  panicWall:     { name: { en: 'Panic Wall',     ja: 'パニックウォール' }, desc: { en: 'Blocks up to 8 incoming gauge on placement.', ja: '配置即時、ゲージ攻撃を最大8遮断。' } },
  flashStrike:   { name: { en: 'Flash Strike',   ja: 'フラッシュストライク' }, desc: { en: 'Fires 2.0 attack on placement.', ja: '配置即時に2.0攻撃力を発射。' } },
  aidCleanse:    { name: { en: 'Aid Cleanse',    ja: 'エイドクレンズ' }, desc: { en: 'Removes 2 garbage rows on placement.', ja: '配置即時にガベージ2行を除去。' } },
  crush:         { name: { en: 'Crush',          ja: '圧着' }, desc: { en: 'On place, compresses empty cells in occupied columns downward.', ja: '配置時、占有列の空白を全て下に圧着。' } },
  dispel:        { name: { en: 'Dispel',         ja: 'ディスペル' }, desc: { en: 'On place, removes enemy current ability and clears their gauge.', ja: '配置即時、敵の現特殊能力を一時除去しゲージを空にする。' } }
};

// === 적 ===
const ENEMY = {
  '소프트 스타터':       { en: 'Soft Starter',           ja: 'ソフトスターター' },
  '라인 헌터':           { en: 'Line Hunter',            ja: 'ラインハンター' },
  '스피드 드론':         { en: 'Speed Drone',            ja: 'スピードドローン' },
  '오프너 스크립트':     { en: 'Opener Script',          ja: 'オープナースクリプト' },
  '스트라이드 엔진':     { en: 'Stride Engine',          ja: 'ストライドエンジン' },
  '플롱크 겜블러':       { en: 'Plonk Gambler',          ja: 'プロンクギャンブラー' },
  'INF DS 쉘':           { en: 'INF DS Shell',           ja: 'INF DS シェル' },
  '봄브 어뎁트':         { en: 'Bomb Adept',             ja: 'ボムアデプト' },
  '마나 도둑':           { en: 'Mana Thief',             ja: 'マナ泥棒' },
  '클렌즈 워든':         { en: 'Cleanse Warden',         ja: 'クレンズワーデン' },
  '광전사':              { en: 'Berserker',              ja: 'バーサーカー' },
  '방벽술사':            { en: 'Wardcaster',             ja: '防壁術士' },
  '재촉 드론':           { en: 'Rush Drone',             ja: '催促ドローン' },
  '폭파공':              { en: 'Demolisher',             ja: '爆破工' },
  '거북 수문장':         { en: 'Turtle Sentinel',        ja: '亀の守護者' },
  '유리 무희':           { en: 'Glass Dancer',           ja: 'グラスダンサー' },
  '거울상':              { en: 'Mirror Image',           ja: '鏡像' },
  '엘리트: 천장 압박기': { en: 'Elite: Ceiling Crusher', ja: 'エリート:天井プレッサー' },
  '엘리트: 파워 코어':   { en: 'Elite: Power Core',      ja: 'エリート:パワーコア' },
  '엘리트: 크로스 엔진': { en: 'Elite: Cross Engine',    ja: 'エリート:クロスエンジン' },
  '엘리트: 오프너 랩':   { en: 'Elite: Opener Lab',      ja: 'エリート:オープナーラボ' },
  '엘리트: 플롱크 볼트': { en: 'Elite: Plonk Vault',     ja: 'エリート:プロンクヴォルト' },
  '엘리트: 광란 코어':   { en: 'Elite: Frenzy Core',     ja: 'エリート:狂乱コア' },
  '엘리트: 중량 분쇄기': { en: 'Elite: Heavy Crusher',   ja: 'エリート:重量粉砕機' },
  '엘리트: 오염원':      { en: 'Elite: Contaminator',    ja: 'エリート:汚染源' },
  '최종 보스: 오버로드 코어': { en: 'Final Boss: Overload Core', ja: '最終ボス:オーバーロードコア' }
};

// === 카테고리 라벨 (kindLabel) ===
const KIND_LABEL = {
  '블록':  { en: 'Block',     ja: 'ブロック' },
  '스킬':  { en: 'Skill',     ja: 'スキル' },
  '소모품': { en: 'Item',      ja: 'アイテム' },
  '유물':  { en: 'Relic',     ja: 'レリック' },
  'HP':   { en: 'HP',        ja: 'HP' },
  '제거':  { en: 'Remove',    ja: '除去' },
  '도박':  { en: 'Gamble',    ja: 'ギャンブル' },
  '정리':  { en: 'Cleanup',   ja: '整理' },
  '골드':  { en: 'Gold',      ja: 'ゴールド' }
};

const fieldsTable = { skill: SKILL, consumable: CONSUMABLE, relic: RELIC, ability: ABILITY };

export function tField(category, id, field) {
  const tbl = fieldsTable[category]?.[id]?.[field];
  if (!tbl) return null;
  const lang = getLang();
  return tbl[lang] || null;
}

export function tEnemyName(koName) {
  const lang = getLang();
  return ENEMY[koName]?.[lang] || koName;
}

export function tKindLabel(koLabel) {
  const lang = getLang();
  return KIND_LABEL[koLabel]?.[lang] || koLabel;
}

// Proxy 래퍼: 데이터 객체의 name/desc 필드를 현재 언어로 자동 변환.
// 원본 구조는 유지하고, getter만 오버라이드 (mutation 안 함).
export function wrapDataMap(map, category) {
  const cache = {};
  return new Proxy(map, {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      const orig = target[key];
      if (!orig || typeof orig !== 'object' || Array.isArray(orig)) return orig;
      if (!cache[key]) {
        cache[key] = new Proxy(orig, {
          get(t, f) {
            if (f === 'name') { const tr = tField(category, t.id || key, 'name'); if (tr) return tr; }
            if (f === 'desc') { const tr = tField(category, t.id || key, 'desc'); if (tr) return tr; }
            return t[f];
          }
        });
      }
      return cache[key];
    },
    ownKeys(target) { return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) { return Reflect.getOwnPropertyDescriptor(target, key); }
  });
}
