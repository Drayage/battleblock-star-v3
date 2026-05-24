// Korobeiniki(코로베이니키, 트로이카) — 러시아 민요(퍼블릭 도메인) 기반 BGM 모듈.
// Web Audio API로 절차적으로 합성(8-bit 칩튠 톤). 외부 오디오 파일 불필요.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(name) {
  if (!name || name === '-') return null;
  const m = name.match(/^([A-G])(#|b)?(-?\d)$/);
  if (!m) return null;
  let n = NOTE_BASE[m[1]];
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return n + (parseInt(m[3], 10) + 1) * 12;
}

function midiToNote(midi) {
  const oct = Math.floor(midi / 12) - 1;
  const pitch = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pitch]}${oct}`;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function transpose(track, semitones) {
  return track.map(([note, d]) => {
    if (!note || note === '-') return [note, d];
    const midi = noteToMidi(note);
    return midi == null ? [note, d] : [midiToNote(midi + semitones), d];
  });
}

// 각 곡은 Korobeiniki의 모티브(하행 E-D-C-B, Em-Am-B7-Em 진행)만 빌려와
// 독자적인 멜로디/리듬/조성으로 재작곡되었다. 단위: 4분음표 = 1박.

// === 1. 타이틀 — 활기찬 G장조 행진곡 (밝고 빠르게, 페이지 진입 환영용) ===
const TITLE_LEAD = [
  ['D5', 1], ['G5', 1], ['B5', 1], ['A5', 1],
  ['G5', 1], ['F#5', 1], ['E5', 1], ['D5', 1],
  ['G5', 1], ['A5', 1], ['B5', 2],
  ['D6', 1], ['B5', 1], ['A5', 2],
  ['G5', 1], ['B5', 1], ['D6', 1], ['B5', 1],
  ['G5', 1], ['A5', 1], ['F#5', 2],
  ['E5', 1], ['G5', 1], ['A5', 1], ['B5', 1],
  ['G5', 1], ['A5', 1], ['D5', 1], ['G5', 1]
];
const TITLE_ARP = [
  ['G4', 1], ['B4', 1], ['D5', 1], ['B4', 1],
  ['G4', 1], ['B4', 1], ['D5', 1], ['B4', 1],
  ['F#4', 1], ['A4', 1], ['D5', 1], ['A4', 1],
  ['F#4', 1], ['A4', 1], ['D5', 1], ['A4', 1],
  ['E4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['E4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['C4', 1], ['E4', 1], ['G4', 1], ['E4', 1],
  ['C4', 1], ['E4', 1], ['D4', 1], ['F#4', 1]
];
const TITLE_BASS = [
  ['G2', 2], ['D3', 2], ['G2', 2], ['B2', 2],
  ['D2', 2], ['A2', 2], ['D2', 2], ['F#2', 2],
  ['E2', 2], ['B2', 2], ['E2', 2], ['G2', 2],
  ['C2', 2], ['G2', 2], ['D2', 2], ['F#2', 2]
];

// === 게임오버 — 기존 차분한 E단조 곡을 게임오버 화면에 (회상/여운) ===
const GAMEOVER_LEAD = [
  ['E5', 3], ['G5', 1], ['B5', 2], ['A5', 2],
  ['G5', 2], ['F#5', 1], ['E5', 1], ['D5', 4],
  ['C5', 3], ['B4', 1], ['A4', 2], ['B4', 2],
  ['E5', 4], ['D5', 2], ['B4', 2],
  ['G4', 2], ['A4', 2], ['B4', 2], ['C5', 2],
  ['D5', 3], ['B4', 1], ['E5', 4],
  ['F#5', 2], ['E5', 2], ['D5', 2], ['C5', 2],
  ['B4', 1], ['A4', 1], ['B4', 1], ['D5', 1], ['F#5', 1], ['E5', 1], ['D5', 1], ['B4', 1]
];
const GAMEOVER_ARP = [
  ['E4', 1], ['G4', 1], ['B4', 1], ['E5', 1], ['B4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['E4', 1], ['G4', 1], ['B4', 1], ['E5', 1], ['B4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['A3', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['C4', 1],
  ['A3', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['C4', 1],
  ['G3', 1], ['B3', 1], ['D4', 1], ['G4', 1], ['D4', 1], ['B3', 1], ['D4', 1], ['B3', 1],
  ['F#3', 1], ['A3', 1], ['D4', 1], ['F#4', 1], ['D4', 1], ['A3', 1], ['D4', 1], ['A3', 1],
  ['E3', 1], ['G3', 1], ['B3', 1], ['E4', 1], ['B3', 1], ['G3', 1], ['B3', 1], ['G3', 1],
  ['E3', 1], ['B3', 1], ['E4', 1], ['B3', 1], ['E3', 1], ['B3', 1], ['E4', 1], ['B3', 1]
];
const GAMEOVER_BASS = [
  ['E2', 8], ['E2', 8], ['A2', 8], ['A2', 8],
  ['G2', 8], ['F#2', 8], ['E2', 8], ['B2', 4], ['F#2', 4]
];

// === 2. 상점 — 흥겨운 마켓플레이스, G장조, 통통 튀는 8박 ===
const SHOP_LEAD = [
  ['D5', 1], ['G5', 1], ['D5', 1], ['B4', 1],
  ['G5', 1], ['A5', 1], ['B5', 2],
  ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 1],
  ['G5', 2], ['A5', 2],
  ['B5', 1], ['A5', 1], ['G5', 1], ['E5', 1],
  ['D5', 1], ['G5', 1], ['B5', 2],
  ['A5', 1], ['D5', 1], ['B4', 1], ['D5', 1],
  ['A5', 1], ['G5', 1], ['F#5', 1], ['E5', 1]
];
const SHOP_BASS = [
  ['G3', 2], ['D3', 2], ['E3', 2], ['B2', 2],
  ['C3', 2], ['G3', 2], ['A2', 2], ['D3', 2],
  ['G3', 2], ['D3', 2], ['E3', 2], ['B2', 2],
  ['C3', 2], ['D3', 2], ['A2', 2], ['F#3', 2]
];

// === 3. 선택 화면 — 밝고 가벼운 D장조 산책 (부드러운 픽업 시작) ===
const SELECT_LEAD = [
  ['A4', 1], ['D5', 1], ['F#5', 2],
  ['E5', 1], ['D5', 1], ['F#5', 2],
  ['G5', 1], ['F#5', 1], ['E5', 2],
  ['D5', 2], ['A4', 2],
  ['D5', 1], ['F#5', 1], ['A5', 2],
  ['G5', 1], ['F#5', 1], ['E5', 2],
  ['F#5', 1], ['D5', 1], ['E5', 2],
  ['A4', 2], ['F#4', 1], ['A4', 1]
];
const SELECT_PAD = [
  ['D3', 4], ['A3', 4],
  ['D3', 4], ['F#3', 4],
  ['G3', 4], ['B3', 4],
  ['A3', 4], ['E3', 4],
  ['D3', 4], ['A3', 4],
  ['G3', 4], ['B3', 4],
  ['A3', 4], ['C#4', 4],
  ['D3', 4], ['A3', 4]
];

// === 4. 전투 — 메인 테마, E장조(밝은 톤), 코로베이니키 모티브 변주 ===
// 진행: E - C#m - A - B - E - A - B - E
const BATTLE_LEAD = [
  ['E5', 2], ['B4', 1], ['C#5', 1], ['D#5', 2], ['C#5', 1], ['B4', 1],
  ['A4', 1], ['B4', 1], ['C#5', 1], ['D#5', 1], ['E5', 1], ['D#5', 1], ['C#5', 2],
  ['B4', 1], ['A4', 1], ['G#4', 1], ['A4', 1], ['B4', 2], ['C#5', 2],
  ['E5', 1], ['D#5', 1], ['C#5', 1], ['B4', 1], ['A4', 4],
  ['E5', 2], ['G#5', 1], ['F#5', 1], ['E5', 2], ['D#5', 1], ['C#5', 1],
  ['B4', 1], ['C#5', 1], ['D#5', 1], ['E5', 1], ['F#5', 1], ['E5', 1], ['D#5', 2],
  ['C#5', 1], ['B4', 1], ['A4', 1], ['B4', 1], ['C#5', 4],
  ['B4', 2], ['A4', 2], ['B4', 1], ['C#5', 1], ['D#5', 1], ['B4', 1]
];
const BATTLE_BASS = [
  ['E3', 2], ['B3', 2], ['E3', 2], ['G#3', 2],
  ['A3', 2], ['E3', 2], ['G#3', 2], ['C#4', 2],
  ['F#3', 2], ['B3', 2], ['E3', 2], ['B3', 2],
  ['E3', 2], ['G#3', 2], ['B3', 2], ['E4', 2],
  ['E3', 2], ['B3', 2], ['E3', 2], ['G#3', 2],
  ['A3', 2], ['E3', 2], ['G#3', 2], ['C#4', 2],
  ['F#3', 2], ['B3', 2], ['E3', 2], ['B3', 2],
  ['E3', 2], ['B3', 2], ['F#3', 2], ['B3', 2]
];

// === 5. 전투 긴박 — battle의 고강도 리믹스 ===
// 동일 키(E장조)·동일 멜로디 골격·동일 코드 진행을 공유.
// 차이는 BPM↑, 베이스 옥타브 다운+16분 펄스, 디튠 듀얼 리드, 톱 옥타브 카운터.
const TENSE_LEAD = BATTLE_LEAD;
const TENSE_BASS = [
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['G#2', 0.5], ['G#3', 0.5], ['G#2', 0.5], ['G#3', 0.5],
  ['A2', 0.5], ['A3', 0.5], ['A2', 0.5], ['A3', 0.5], ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5],
  ['G#2', 0.5], ['G#3', 0.5], ['G#2', 0.5], ['G#3', 0.5], ['C#3', 0.5], ['C#4', 0.5], ['C#3', 0.5], ['C#4', 0.5],
  ['F#2', 0.5], ['F#3', 0.5], ['F#2', 0.5], ['F#3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['G#2', 0.5], ['G#3', 0.5], ['G#2', 0.5], ['G#3', 0.5],
  ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5], ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['G#2', 0.5], ['G#3', 0.5], ['G#2', 0.5], ['G#3', 0.5],
  ['A2', 0.5], ['A3', 0.5], ['A2', 0.5], ['A3', 0.5], ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5],
  ['G#2', 0.5], ['G#3', 0.5], ['G#2', 0.5], ['G#3', 0.5], ['C#3', 0.5], ['C#4', 0.5], ['C#3', 0.5], ['C#4', 0.5],
  ['F#2', 0.5], ['F#3', 0.5], ['F#2', 0.5], ['F#3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['E2', 0.5], ['E3', 0.5], ['E2', 0.5], ['E3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5],
  ['F#2', 0.5], ['F#3', 0.5], ['F#2', 0.5], ['F#3', 0.5], ['B2', 0.5], ['B3', 0.5], ['B2', 0.5], ['B3', 0.5]
];
// 톱 옥타브 카운터멜로디 (battle 멜로디를 옥타브 위로, 일부 음만 강조)
const TENSE_COUNTER = [
  ['E6', 2], ['-', 2], ['D#6', 2], ['-', 2],
  ['-', 4], ['E6', 4],
  ['-', 4], ['C#6', 4],
  ['-', 4], ['A5', 4],
  ['E6', 2], ['-', 2], ['G#6', 2], ['-', 2],
  ['-', 4], ['F#6', 4],
  ['-', 4], ['C#6', 4],
  ['B5', 2], ['A5', 2], ['B5', 1], ['C#6', 1], ['D#6', 1], ['B5', 1]
];

// === 6. 엘리트 — 어두운 왈츠 3/4, E하모닉 단조 ===
const ELITE_LEAD = [
  ['B4', 2], ['E5', 0.5], ['F#5', 0.5],
  ['G5', 2], ['F#5', 1],
  ['E5', 1], ['D#5', 1], ['E5', 1],
  ['B4', 3],
  ['C5', 2], ['D5', 1],
  ['B4', 2], ['A4', 1],
  ['G4', 1], ['F#4', 1], ['G4', 1],
  ['A4', 3],
  ['F#5', 2], ['G5', 1],
  ['F#5', 2], ['E5', 1],
  ['D#5', 1], ['E5', 1], ['F#5', 1],
  ['B4', 3],
  ['A4', 2], ['B4', 1],
  ['C5', 2], ['D5', 1],
  ['E5', 1], ['D#5', 1], ['B4', 1],
  ['G4', 1], ['A4', 1], ['B4', 1]
];
const ELITE_BASS = [
  ['E2', 1], ['B3', 1], ['B3', 1],
  ['E2', 1], ['G3', 1], ['G3', 1],
  ['B2', 1], ['F#3', 1], ['F#3', 1],
  ['E2', 1], ['B3', 1], ['B3', 1],
  ['A2', 1], ['C4', 1], ['C4', 1],
  ['F#2', 1], ['A3', 1], ['A3', 1],
  ['B2', 1], ['F#3', 1], ['F#3', 1],
  ['E2', 1], ['B3', 1], ['B3', 1],
  ['D2', 1], ['F#3', 1], ['F#3', 1],
  ['A2', 1], ['E3', 1], ['E3', 1],
  ['B2', 1], ['F#3', 1], ['F#3', 1],
  ['E2', 1], ['B3', 1], ['B3', 1],
  ['A2', 1], ['E3', 1], ['E3', 1],
  ['F#2', 1], ['C4', 1], ['C4', 1],
  ['B2', 1], ['D#3', 1], ['F#3', 1],
  ['B2', 1], ['F#3', 1], ['B3', 1]
];

// === 7. 보스 — 묵직한 슬로우 테마, 저음역 페달 + 고음 리드 ===
const BOSS_LEAD = [
  ['E5', 6], ['D5', 2],
  ['C5', 6], ['B4', 2],
  ['A4', 6], ['G#4', 2],
  ['E5', 8],
  ['F5', 6], ['E5', 2],
  ['D5', 6], ['C5', 2],
  ['B4', 2], ['A#4', 2], ['B4', 4],
  ['F#5', 2], ['E5', 2], ['D5', 2], ['B4', 2]
];
const BOSS_BASS = [
  ['E2', 4], ['E2', 4], ['E2', 4], ['E2', 4],
  ['A2', 4], ['A2', 4], ['E2', 4], ['B2', 4],
  ['C3', 4], ['C3', 4], ['A2', 4], ['A2', 4],
  ['B2', 4], ['B2', 4], ['F#2', 2], ['G#2', 2], ['F#2', 2], ['D#2', 2]
];
const BOSS_PAD = [
  ['G4', 8], ['G4', 8], ['C5', 8], ['B4', 8],
  ['A4', 8], ['G4', 8], ['F#4', 8], ['A#4', 4], ['B4', 4]
];

export const PRESETS = {
  title: {
    label: '타이틀',
    bpm: 132,
    tracks: [
      { notes: TITLE_LEAD, type: 'square', vol: 0.18 },
      { notes: TITLE_LEAD, type: 'triangle', vol: 0.10, detune: 8 },
      { notes: TITLE_ARP, type: 'triangle', vol: 0.12 },
      { notes: TITLE_BASS, type: 'sawtooth', vol: 0.16 }
    ]
  },
  gameover: {
    label: '게임 오버',
    bpm: 78,
    tracks: [
      { notes: GAMEOVER_LEAD, type: 'triangle', vol: 0.18 },
      { notes: GAMEOVER_ARP, type: 'sine', vol: 0.10 },
      { notes: GAMEOVER_BASS, type: 'sine', vol: 0.16 }
    ]
  },
  shop: {
    label: '상점',
    bpm: 116,
    tracks: [
      { notes: SHOP_LEAD, type: 'square', vol: 0.14 },
      { notes: SHOP_LEAD, type: 'triangle', vol: 0.08, detune: 8 },
      { notes: SHOP_BASS, type: 'triangle', vol: 0.14 }
    ]
  },
  select: {
    label: '선택 화면',
    bpm: 96,
    tracks: [
      { notes: SELECT_LEAD, type: 'triangle', vol: 0.16 },
      { notes: SELECT_LEAD, type: 'sine', vol: 0.08, detune: 6 },
      { notes: SELECT_PAD, type: 'sine', vol: 0.11 }
    ]
  },
  battle: {
    label: '전투',
    bpm: 164,
    tracks: [
      { notes: BATTLE_LEAD, type: 'square', vol: 0.17 },
      { notes: BATTLE_BASS, type: 'sawtooth', vol: 0.13 }
    ]
  },
  battleTense: {
    label: '전투 긴박',
    bpm: 196,
    tracks: [
      { notes: TENSE_LEAD, type: 'square', vol: 0.15, detune: 6 },
      { notes: TENSE_LEAD, type: 'sawtooth', vol: 0.08, detune: -10 },
      { notes: TENSE_COUNTER, type: 'triangle', vol: 0.10 },
      { notes: TENSE_BASS, type: 'sawtooth', vol: 0.16 }
    ]
  },
  elite: {
    label: '엘리트',
    bpm: 172,
    tracks: [
      { notes: ELITE_LEAD, type: 'square', vol: 0.17 },
      { notes: ELITE_BASS, type: 'triangle', vol: 0.16 }
    ]
  },
  eliteTense: {
    label: '엘리트 긴박',
    bpm: 220,
    tracks: [
      { notes: ELITE_LEAD, type: 'square', vol: 0.17, detune: 6 },
      { notes: ELITE_LEAD, type: 'sawtooth', vol: 0.09, detune: -8 },
      { notes: ELITE_BASS, type: 'sawtooth', vol: 0.18 }
    ]
  },
  boss: {
    label: '보스',
    bpm: 80,
    tracks: [
      { notes: BOSS_LEAD, type: 'sawtooth', vol: 0.17, detune: 5 },
      { notes: BOSS_LEAD, type: 'square', vol: 0.08, detune: -10 },
      { notes: BOSS_BASS, type: 'sawtooth', vol: 0.22 },
      { notes: BOSS_PAD, type: 'triangle', vol: 0.10 }
    ]
  },
  bossTense: {
    label: '보스 긴박',
    bpm: 132,
    tracks: [
      { notes: BOSS_LEAD, type: 'sawtooth', vol: 0.18, detune: 8 },
      { notes: BOSS_LEAD, type: 'square', vol: 0.10, detune: -12 },
      { notes: BOSS_BASS, type: 'sawtooth', vol: 0.24 },
      { notes: BOSS_PAD, type: 'sawtooth', vol: 0.12 }
    ]
  }
};

export class BGMPlayer {
  constructor(ctx) {
    this.ctx = ctx;
    this.targetVolume = 0.6;
    this.master = ctx.createGain();
    this.master.gain.value = this.targetVolume;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    this.master.connect(lp);
    lp.connect(ctx.destination);
    this.activeNodes = [];
    this.loopTimer = null;
    this.currentPreset = null;
    this._pendingPlay = null;
  }

  setVolume(v) {
    this.targetVolume = Math.max(0, Math.min(1, v));
    this.master.gain.setTargetAtTime(this.targetVolume, this.ctx.currentTime, 0.05);
  }

  scheduleNote(time, freq, dur, type, vol, detune = 0) {
    if (!freq) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    osc.connect(gain);
    gain.connect(this.master);
    const attack = 0.008;
    const release = Math.min(0.08, dur * 0.3);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + attack);
    gain.gain.setValueAtTime(vol, time + dur - release);
    gain.gain.linearRampToValueAtTime(0, time + dur);
    osc.start(time);
    osc.stop(time + dur + 0.03);
    this.activeNodes.push(osc);
    osc.onended = () => {
      const i = this.activeNodes.indexOf(osc);
      if (i >= 0) this.activeNodes.splice(i, 1);
    };
  }

  scheduleTrack(track, bpm, startTime) {
    const beat = 60 / bpm;
    let t = startTime;
    let totalBeats = 0;
    for (const [note, d] of track.notes) {
      const midi = noteToMidi(note);
      const freq = midi == null ? 0 : midiToFreq(midi);
      this.scheduleNote(t, freq, d * beat * 0.92, track.type, track.vol, track.detune || 0);
      t += d * beat;
      totalBeats += d;
    }
    return totalBeats * beat;
  }

  // 부드러운 크로스페이드: 현재 트랙을 fadeMs 동안 페이드아웃 후 새 트랙을 페이드인.
  play(presetName, fadeMs = 350) {
    const preset = PRESETS[presetName];
    if (!preset) return;
    if (this.currentPreset === presetName) return; // 동일 곡이면 무시
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this._pendingPlay) clearTimeout(this._pendingPlay);
    const wasPlaying = this.currentPreset != null;
    // 재진입 방지: 새 곡을 요청하는 즉시 currentPreset을 갱신해
    // 매 프레임의 setIntensity가 또 play를 호출하지 않게 한다.
    this.currentPreset = presetName;
    const start = () => {
      if (this.currentPreset !== presetName) return;
      if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
      const now = this.ctx.currentTime;
      for (const osc of this.activeNodes.slice()) { try { osc.stop(now); } catch {} }
      this.activeNodes = [];
      // 페이드인
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0, now);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, now + Math.max(0.05, fadeMs / 1000));
      const schedule = () => {
        if (this.currentPreset !== presetName) return;
        const t = this.ctx.currentTime + 0.05;
        let loopLen = 0;
        for (const track of preset.tracks) {
          loopLen = Math.max(loopLen, this.scheduleTrack(track, preset.bpm, t));
        }
        this.loopTimer = setTimeout(schedule, (loopLen - 0.08) * 1000);
      };
      schedule();
    };
    if (wasPlaying) {
      const now = this.ctx.currentTime;
      const fadeSec = fadeMs / 1000;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + fadeSec);
      this._pendingPlay = setTimeout(start, fadeMs + 10);
    } else {
      start();
    }
  }

  stop(fadeMs = 250) {
    this.currentPreset = null;
    if (this._pendingPlay) { clearTimeout(this._pendingPlay); this._pendingPlay = null; }
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
    const now = this.ctx.currentTime;
    const fadeSec = Math.max(0.02, fadeMs / 1000);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + fadeSec);
    setTimeout(() => {
      for (const osc of this.activeNodes.slice()) { try { osc.stop(); } catch {} }
      this.activeNodes = [];
    }, fadeMs + 20);
  }
}
