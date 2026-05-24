// 8-bit 스타일 SFX 라이브러리. Web Audio API로 절차 합성.

const PRESETS = {
  // === 블록 조작 ===
  move: ctx => beep(ctx, { freq: 480, dur: 0.025, type: 'square', vol: 0.10 }),
  rotate: ctx => beep(ctx, { freqStart: 520, freqEnd: 720, dur: 0.05, type: 'square', vol: 0.14 }),
  softDrop: ctx => beep(ctx, { freq: 260, dur: 0.02, type: 'square', vol: 0.08 }),
  hardDrop: ctx => {
    beep(ctx, { freqStart: 220, freqEnd: 90, dur: 0.12, type: 'square', vol: 0.22 });
    noiseBurst(ctx, { dur: 0.08, vol: 0.18, cutoffStart: 2000, cutoffEnd: 400 });
  },
  hold: ctx => beep(ctx, { freqStart: 380, freqEnd: 540, dur: 0.06, type: 'triangle', vol: 0.14 }),

  // === 라인 클리어 ===
  clear1: ctx => arpeggio(ctx, [523, 659], 0.06, 0.10, 'square', 0.20),
  clear2: ctx => arpeggio(ctx, [523, 659, 784], 0.05, 0.10, 'square', 0.20),
  clear3: ctx => arpeggio(ctx, [523, 659, 784, 1047], 0.05, 0.12, 'square', 0.22),
  clear4: ctx => {
    arpeggio(ctx, [523, 659, 784, 1047, 1318], 0.05, 0.18, 'square', 0.22);
    arpeggio(ctx, [1047, 1318, 1568, 2093, 2637], 0.05, 0.18, 'square', 0.10);
  },

  // === 특수 능력 ===
  strike: ctx => {
    beep(ctx, { freqStart: 200, freqEnd: 1200, dur: 0.18, type: 'sawtooth', vol: 0.22 });
    noiseBurst(ctx, { dur: 0.08, vol: 0.10, cutoffStart: 4000, cutoffEnd: 1000 });
  },
  shield: ctx => arpeggio(ctx, [659, 880, 988], 0.04, 0.12, 'square', 0.18),
  purge: ctx => beep(ctx, { freqStart: 1568, freqEnd: 392, dur: 0.22, type: 'square', vol: 0.18 }),
  mana: ctx => arpeggio(ctx, [988, 1318, 1568], 0.03, 0.10, 'triangle', 0.20),
  dispel: ctx => beep(ctx, { freqStart: 880, freqEnd: 220, dur: 0.30, type: 'sawtooth', vol: 0.18 }),
  penalty: ctx => {
    beep(ctx, { freqStart: 180, freqEnd: 80, dur: 0.18, type: 'square', vol: 0.22 });
    noiseBurst(ctx, { dur: 0.10, vol: 0.12, cutoffStart: 1500, cutoffEnd: 300 });
  },
  explosion: ctx => {
    beep(ctx, { freqStart: 140, freqEnd: 50, dur: 0.30, type: 'sawtooth', vol: 0.26 });
    noiseBurst(ctx, { dur: 0.28, vol: 0.28, cutoffStart: 3500, cutoffEnd: 200 });
  },
  freeze: ctx => arpeggio(ctx, [1568, 1175, 880, 659], 0.05, 0.15, 'triangle', 0.18),
  comboCharge: ctx => beep(ctx, { freqStart: 440, freqEnd: 660, dur: 0.08, type: 'square', vol: 0.16 }),
  coin: ctx => arpeggio(ctx, [988, 1318], 0.04, 0.10, 'square', 0.20),
  crush: ctx => {
    beep(ctx, { freqStart: 220, freqEnd: 110, dur: 0.10, type: 'square', vol: 0.22 });
    noiseBurst(ctx, { dur: 0.06, vol: 0.14, cutoffStart: 2000, cutoffEnd: 400 });
  },

  // === 콤보 — 라인 클리어 직후 살짝 지연 + 두꺼운 톤으로 묻히지 않게 ===
  combo: (ctx, n = 1) => {
    const base = 660 * Math.pow(1.122, Math.min(10, n - 1));
    setTimeout(() => {
      beep(ctx, { freqStart: base * 0.7, freqEnd: base, dur: 0.20, type: 'triangle', vol: 0.32 });
      beep(ctx, { freqStart: base * 0.7 * 2, freqEnd: base * 2, dur: 0.20, type: 'square', vol: 0.16 });
      beep(ctx, { freqStart: base * 0.7 * 0.5, freqEnd: base * 0.5, dur: 0.22, type: 'sawtooth', vol: 0.10 });
    }, 220);
  },

  // === 전투 이벤트 ===
  enemyHit: ctx => {
    beep(ctx, { freqStart: 280, freqEnd: 120, dur: 0.15, type: 'sawtooth', vol: 0.18 });
    noiseBurst(ctx, { dur: 0.10, vol: 0.10, cutoffStart: 1800, cutoffEnd: 500 });
  },
  enemySkill: ctx => {
    beep(ctx, { freqStart: 660, freqEnd: 220, dur: 0.40, type: 'sawtooth', vol: 0.18 });
    beep(ctx, { freqStart: 670, freqEnd: 225, dur: 0.40, type: 'sawtooth', vol: 0.10, detune: 12 });
  },
  alert: ctx => arpeggio(ctx, [988, 880, 988, 880], 0.06, 0.10, 'square', 0.20),
  heartbeat: ctx => {
    beep(ctx, { freq: 80, dur: 0.08, type: 'sine', vol: 0.30 });
    setTimeout(() => beep(ctx, { freq: 80, dur: 0.08, type: 'sine', vol: 0.22 }), 130);
  },

  // === 메타 ===
  challengeWin: ctx => arpeggio(ctx, [523, 659, 784, 1047], 0.08, 0.20, 'square', 0.22),
  challengeFail: ctx => {
    arpeggio(ctx, [659, 523, 392], 0.10, 0.18, 'sawtooth', 0.20);
  },
  victory: ctx => {
    arpeggio(ctx, [523, 659, 784, 1047], 0.10, 0.30, 'square', 0.22);
    arpeggio(ctx, [784, 988, 1175, 1568], 0.10, 0.30, 'triangle', 0.12);
  },
  defeat: ctx => beep(ctx, { freqStart: 440, freqEnd: 165, dur: 0.32, type: 'sawtooth', vol: 0.22 }),
  click: ctx => beep(ctx, { freq: 880, dur: 0.025, type: 'square', vol: 0.12 }),
  select: ctx => arpeggio(ctx, [659, 988], 0.03, 0.06, 'square', 0.16),
  purchase: ctx => arpeggio(ctx, [880, 1175, 1568], 0.04, 0.10, 'square', 0.20),
  reroll: ctx => arpeggio(ctx, [523, 659, 784, 659, 523], 0.04, 0.08, 'triangle', 0.18),
  glassBreak: ctx => {
    // 고주파 노이즈 + 짧은 띵 톤
    noiseBurst(ctx, { dur: 0.22, vol: 0.22, cutoffStart: 8000, cutoffEnd: 2000 });
    beep(ctx, { freqStart: 2400, freqEnd: 600, dur: 0.18, type: 'triangle', vol: 0.16 });
    setTimeout(() => beep(ctx, { freqStart: 1800, freqEnd: 400, dur: 0.12, type: 'triangle', vol: 0.10 }), 50);
  }
};

function beep(ctx, opts) {
  const { freq, freqStart, freqEnd, dur, type = 'square', vol = 0.2, detune = 0 } = opts;
  const osc = ctx.audio.createOscillator();
  const gain = ctx.audio.createGain();
  osc.type = type;
  if (freq != null) osc.frequency.value = freq;
  else {
    osc.frequency.setValueAtTime(freqStart, ctx.audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), ctx.audio.currentTime + dur);
  }
  if (detune) osc.detune.value = detune;
  osc.connect(gain);
  gain.connect(ctx.master);
  const t = ctx.audio.currentTime;
  const att = 0.005;
  const rel = Math.min(0.05, dur * 0.4);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + att);
  gain.gain.setValueAtTime(vol, t + dur - rel);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  ctx._active?.add?.(osc);
  osc.onended = () => ctx._active?.delete?.(osc);
}

function noiseBurst(ctx, { dur, vol = 0.2, cutoffStart = 4000, cutoffEnd = 800 }) {
  const samples = Math.floor(dur * ctx.audio.sampleRate);
  const buf = ctx.audio.createBuffer(1, samples, ctx.audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.audio.createBufferSource();
  src.buffer = buf;
  const filter = ctx.audio.createBiquadFilter();
  filter.type = 'lowpass';
  const t = ctx.audio.currentTime;
  filter.frequency.setValueAtTime(cutoffStart, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(100, cutoffEnd), t + dur);
  const gain = ctx.audio.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.master);
  src.start(t);
  src.stop(t + dur + 0.01);
}

function arpeggio(ctx, freqs, step, noteDur, type, vol) {
  freqs.forEach((f, i) => {
    setTimeout(() => beep(ctx, { freq: f, dur: noteDur, type, vol }), i * step * 1000);
  });
}

export class SFXPlayer {
  constructor(audioCtx, masterGain) {
    this.audio = audioCtx;
    this.master = audioCtx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(masterGain || audioCtx.destination);
    this._lastHeartbeat = 0;
    this._active = new Set();
  }

  setVolume(v) {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.audio.currentTime, 0.05);
  }

  play(name, arg) {
    const fn = PRESETS[name];
    if (!fn) return;
    if (this.audio.state === 'suspended') this.audio.resume();
    try { fn(this, arg); } catch {}
  }

  // 1초 간격 이상에서만 재생되는 심장박동(다중 호출 방지)
  playHeartbeat() {
    const now = this.audio.currentTime;
    if (now - this._lastHeartbeat < 0.9) return;
    this._lastHeartbeat = now;
    this.play('heartbeat');
  }

  // 화면 전환 시 현재 울리는 모든 SFX 즉시 중단(짧은 페이드).
  stopAll() {
    const now = this.audio.currentTime;
    for (const osc of Array.from(this._active)) {
      try { osc.stop(now + 0.04); } catch {}
    }
    this._active.clear();
  }
}
