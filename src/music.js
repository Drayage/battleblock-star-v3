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

// === 1. 타이틀 — 평화로운 아르페지오, E단조, 느린 4/4 ===
const TITLE_LEAD = [
  ['E5', 3], ['G5', 1], ['B5', 2], ['A5', 2],
  ['G5', 2], ['F#5', 1], ['E5', 1], ['D5', 4],
  ['C5', 3], ['B4', 1], ['A4', 2], ['B4', 2],
  ['E5', 4], ['D5', 2], ['B4', 2],
  ['G4', 2], ['A4', 2], ['B4', 2], ['C5', 2],
  ['D5', 3], ['B4', 1], ['E5', 4],
  ['F#5', 2], ['E5', 2], ['D5', 2], ['C5', 2],
  ['B4', 4], ['E5', 4]
];
const TITLE_ARP = [
  ['E4', 1], ['G4', 1], ['B4', 1], ['E5', 1], ['B4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['E4', 1], ['G4', 1], ['B4', 1], ['E5', 1], ['B4', 1], ['G4', 1], ['B4', 1], ['G4', 1],
  ['A3', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['C4', 1],
  ['A3', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['C4', 1],
  ['G3', 1], ['B3', 1], ['D4', 1], ['G4', 1], ['D4', 1], ['B3', 1], ['D4', 1], ['B3', 1],
  ['F#3', 1], ['A3', 1], ['D4', 1], ['F#4', 1], ['D4', 1], ['A3', 1], ['D4', 1], ['A3', 1],
  ['E3', 1], ['G3', 1], ['B3', 1], ['E4', 1], ['B3', 1], ['G3', 1], ['B3', 1], ['G3', 1],
  ['E3', 1], ['B3', 1], ['E4', 1], ['B3', 1], ['E3', 1], ['B3', 1], ['E4', 1], ['B3', 1]
];
const TITLE_BASS = [
  ['E2', 8], ['E2', 8], ['A2', 8], ['A2', 8],
  ['G2', 8], ['F#2', 8], ['E2', 8], ['B2', 8]
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
  ['G5', 4]
];
const SHOP_BASS = [
  ['G3', 2], ['D3', 2], ['E3', 2], ['B2', 2],
  ['C3', 2], ['G3', 2], ['A2', 2], ['D3', 2],
  ['G3', 2], ['D3', 2], ['E3', 2], ['B2', 2],
  ['C3', 2], ['D3', 2], ['G3', 4]
];

// === 3. 선택 화면 — 명상적 앰비언트, 긴 음표 위주 ===
const SELECT_LEAD = [
  ['B4', 4], ['D5', 4], ['E5', 8],
  ['A4', 4], ['C5', 4], ['E5', 8],
  ['F#4', 4], ['A4', 4], ['D5', 8],
  ['G4', 4], ['B4', 4], ['E5', 8]
];
const SELECT_PAD = [
  ['E3', 16], ['A3', 16], ['D3', 16], ['E3', 16]
];

// === 4. 전투 — 메인 테마, 코로베이니키 모티브 인용 + 변주 ===
const BATTLE_LEAD = [
  ['E5', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1],
  ['A4', 1], ['B4', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['D5', 1], ['C5', 2],
  ['B4', 1], ['A4', 1], ['G4', 1], ['A4', 1], ['B4', 2], ['C5', 2],
  ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1], ['A4', 4],
  ['E5', 2], ['G5', 1], ['F#5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
  ['B4', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['F#5', 1], ['E5', 1], ['D5', 2],
  ['C5', 1], ['B4', 1], ['A4', 1], ['B4', 1], ['C5', 4],
  ['B4', 2], ['A4', 2], ['E5', 4]
];
const BATTLE_BASS = [
  ['E3', 2], ['B3', 2], ['E3', 2], ['G3', 2],
  ['A3', 2], ['E3', 2], ['G3', 2], ['D3', 2],
  ['F#3', 2], ['B3', 2], ['E3', 2], ['B3', 2],
  ['E3', 2], ['G3', 2], ['B3', 2], ['E4', 2],
  ['E3', 2], ['B3', 2], ['E3', 2], ['G3', 2],
  ['A3', 2], ['E3', 2], ['G3', 2], ['D3', 2],
  ['F#3', 2], ['B3', 2], ['E3', 2], ['B3', 2],
  ['E3', 4], ['E3', 4]
];

// === 5. 전투 긴박 — 16분 음표 오스티나토, D단조, 공격적 ===
const TENSE_LEAD = [
  ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5], ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5],
  ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5], ['E5', 0.5], ['F5', 0.5], ['G5', 0.5], ['F5', 0.5],
  ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5],
  ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5], ['C5', 0.5], ['D5', 0.5], ['Eb5', 0.5], ['D5', 0.5],
  ['C5', 0.5], ['G4', 0.5], ['E5', 0.5], ['G4', 0.5], ['C5', 0.5], ['G4', 0.5], ['E5', 0.5], ['G4', 0.5],
  ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5],
  ['A4', 0.5], ['E4', 0.5], ['C5', 0.5], ['E4', 0.5], ['A4', 0.5], ['E4', 0.5], ['C#5', 0.5], ['E4', 0.5],
  ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['D5', 1], ['A4', 1],
  ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5], ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5],
  ['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['A4', 0.5], ['E5', 0.5], ['F5', 0.5], ['G5', 0.5], ['F5', 0.5],
  ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5], ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5],
  ['Bb4', 0.5], ['F4', 0.5], ['D5', 0.5], ['F4', 0.5], ['C5', 0.5], ['D5', 0.5], ['Eb5', 0.5], ['D5', 0.5],
  ['C5', 0.5], ['G4', 0.5], ['E5', 0.5], ['G4', 0.5], ['C5', 0.5], ['G4', 0.5], ['E5', 0.5], ['G4', 0.5],
  ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5],
  ['A4', 0.5], ['E4', 0.5], ['C5', 0.5], ['E4', 0.5], ['A4', 0.5], ['E4', 0.5], ['C#5', 0.5], ['E4', 0.5],
  ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['D5', 2]
];
const TENSE_BASS = [
  ['D2', 4], ['D2', 4], ['Bb1', 4], ['Bb1', 4], ['C2', 4], ['C2', 4], ['A1', 4], ['D2', 4],
  ['D2', 4], ['D2', 4], ['Bb1', 4], ['Bb1', 4], ['C2', 4], ['C2', 4], ['A1', 4], ['D2', 4]
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
  ['E5', 3]
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
  ['E2', 1], ['B3', 1], ['E4', 1]
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
  ['E5', 8]
];
const BOSS_BASS = [
  ['E2', 4], ['E2', 4], ['E2', 4], ['E2', 4],
  ['A2', 4], ['A2', 4], ['E2', 4], ['B2', 4],
  ['C3', 4], ['C3', 4], ['A2', 4], ['A2', 4],
  ['B2', 4], ['B2', 4], ['E2', 4], ['E2', 4]
];
const BOSS_PAD = [
  ['G4', 8], ['G4', 8], ['C5', 8], ['B4', 8],
  ['A4', 8], ['G4', 8], ['F#4', 8], ['G4', 8]
];

export const PRESETS = {
  title: {
    label: '타이틀',
    bpm: 78,
    tracks: [
      { notes: TITLE_LEAD, type: 'triangle', vol: 0.18 },
      { notes: TITLE_ARP, type: 'sine', vol: 0.10 },
      { notes: TITLE_BASS, type: 'sine', vol: 0.16 }
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
    bpm: 64,
    tracks: [
      { notes: SELECT_LEAD, type: 'sine', vol: 0.15 },
      { notes: SELECT_PAD, type: 'triangle', vol: 0.09 }
    ]
  },
  battle: {
    label: '전투',
    bpm: 142,
    tracks: [
      { notes: BATTLE_LEAD, type: 'square', vol: 0.17 },
      { notes: BATTLE_BASS, type: 'sawtooth', vol: 0.13 }
    ]
  },
  battleTense: {
    label: '전투 긴박',
    bpm: 168,
    tracks: [
      { notes: TENSE_LEAD, type: 'square', vol: 0.16, detune: 4 },
      { notes: TENSE_LEAD, type: 'square', vol: 0.08, detune: -8 },
      { notes: TENSE_BASS, type: 'sawtooth', vol: 0.18 }
    ]
  },
  elite: {
    label: '엘리트',
    bpm: 132,
    tracks: [
      { notes: ELITE_LEAD, type: 'square', vol: 0.17 },
      { notes: ELITE_BASS, type: 'triangle', vol: 0.16 }
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
  }
};

export class BGMPlayer {
  constructor(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    this.master.connect(lp);
    lp.connect(ctx.destination);
    this.activeNodes = [];
    this.loopTimer = null;
    this.currentPreset = null;
  }

  setVolume(v) {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
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

  play(presetName) {
    this.stop();
    const preset = PRESETS[presetName];
    if (!preset) return;
    this.currentPreset = presetName;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const schedule = () => {
      if (this.currentPreset !== presetName) return;
      const start = this.ctx.currentTime + 0.05;
      let loopLen = 0;
      for (const track of preset.tracks) {
        loopLen = Math.max(loopLen, this.scheduleTrack(track, preset.bpm, start));
      }
      this.loopTimer = setTimeout(schedule, (loopLen - 0.08) * 1000);
    };
    schedule();
  }

  stop() {
    this.currentPreset = null;
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
    const now = this.ctx.currentTime;
    for (const osc of this.activeNodes.slice()) {
      try { osc.stop(now + 0.05); } catch {}
    }
  }
}
