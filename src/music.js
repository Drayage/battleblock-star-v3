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

// Korobeiniki 멜로디 — A섹션 + B섹션 (E단조). 단위: 4분음표 = 1박.
const KOROBEINIKI_LEAD = [
  // A
  ['E5', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1],
  ['A4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
  ['B4', 3], ['C5', 1], ['D5', 2], ['E5', 2],
  ['C5', 2], ['A4', 2], ['A4', 4],
  // B
  ['D5', 3], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
  ['E5', 3], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
  ['B4', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['E5', 2],
  ['C5', 2], ['A4', 2], ['A4', 4]
];

// 베이스(E단조 → Am → B7 → Em 진행 단순화)
const KOROBEINIKI_BASS = [
  ['E3', 4], ['E3', 4], ['A3', 4], ['B2', 2], ['E3', 2],
  ['A3', 4], ['E3', 4], ['B2', 2], ['E3', 2], ['E3', 4],
  ['E3', 4], ['E3', 4], ['A3', 4], ['B2', 2], ['E3', 2],
  ['A3', 4], ['E3', 4], ['B2', 2], ['E3', 2], ['E3', 4]
];

// 화음 패드(보스/엘리트용)
const KOROBEINIKI_PAD = [
  ['E4', 8], ['A4', 8], ['B3', 4], ['E4', 4],
  ['A4', 8], ['E4', 8], ['B3', 4], ['E4', 4]
];

export const PRESETS = {
  title: {
    label: '타이틀',
    bpm: 96,
    tracks: [
      { notes: KOROBEINIKI_LEAD, type: 'triangle', vol: 0.18, detune: 0 },
      { notes: KOROBEINIKI_BASS, type: 'sine', vol: 0.16 }
    ]
  },
  shop: {
    label: '상점',
    bpm: 78,
    tracks: [
      { notes: transpose(KOROBEINIKI_LEAD, -2), type: 'triangle', vol: 0.16 },
      { notes: transpose(KOROBEINIKI_BASS, -2), type: 'sine', vol: 0.12 }
    ]
  },
  select: {
    label: '선택 화면',
    bpm: 84,
    tracks: [
      { notes: transpose(KOROBEINIKI_LEAD, -5), type: 'triangle', vol: 0.14 }
    ]
  },
  battle: {
    label: '전투',
    bpm: 138,
    tracks: [
      { notes: KOROBEINIKI_LEAD, type: 'square', vol: 0.16 },
      { notes: KOROBEINIKI_BASS, type: 'sawtooth', vol: 0.12 }
    ]
  },
  battleTense: {
    label: '전투 긴박',
    bpm: 168,
    tracks: [
      { notes: KOROBEINIKI_LEAD, type: 'square', vol: 0.18, detune: 5 },
      { notes: KOROBEINIKI_LEAD, type: 'square', vol: 0.10, detune: -8 },
      { notes: transpose(KOROBEINIKI_BASS, -12), type: 'sawtooth', vol: 0.16 }
    ]
  },
  elite: {
    label: '엘리트',
    bpm: 116,
    tracks: [
      { notes: transpose(KOROBEINIKI_LEAD, -3), type: 'square', vol: 0.17 },
      { notes: transpose(KOROBEINIKI_BASS, -15), type: 'sawtooth', vol: 0.18 },
      { notes: transpose(KOROBEINIKI_PAD, -3), type: 'triangle', vol: 0.08 }
    ]
  },
  boss: {
    label: '보스',
    bpm: 96,
    tracks: [
      { notes: transpose(KOROBEINIKI_LEAD, -7), type: 'sawtooth', vol: 0.18, detune: 6 },
      { notes: transpose(KOROBEINIKI_LEAD, -7), type: 'square', vol: 0.10, detune: -10 },
      { notes: transpose(KOROBEINIKI_BASS, -19), type: 'sawtooth', vol: 0.22 },
      { notes: transpose(KOROBEINIKI_PAD, -7), type: 'triangle', vol: 0.10 }
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
