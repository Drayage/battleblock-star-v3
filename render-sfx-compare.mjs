// 8-bit 칩튠 vs 모던 톤 SFX 비교 렌더링.
// 동일한 7개 효과음을 두 스타일로 합성해 wav 한 파일에 시퀀스로 담는다.
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 22050;

function osc(type, phase) {
  const t = phase - Math.floor(phase);
  switch (type) {
    case 'sine': return Math.sin(phase * 2 * Math.PI);
    case 'square': return t < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * t - 1;
    case 'triangle': return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
    case 'noise': return Math.random() * 2 - 1;
  }
}

function lowpass(buf, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SR;
  const a = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) { prev = prev + a * (buf[i] - prev); buf[i] = prev; }
}

// 단일 음 렌더: 시간에 따라 변하는 주파수(피치 슬라이드) + 엔벨로프
function renderTone(buf, start, dur, freqFn, type, attack, release, vol) {
  const total = Math.floor(dur * SR);
  const att = Math.max(1, Math.floor(attack * SR));
  const rel = Math.max(1, Math.floor(release * SR));
  const sustEnd = total - rel;
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const t = i / SR;
    const f = freqFn(t / dur);
    phase += f / SR;
    let env;
    if (i < att) env = i / att;
    else if (i > sustEnd) env = Math.max(0, (total - i) / rel);
    else env = 1;
    buf[idx] += osc(type, phase) * vol * env;
  }
}

function renderNoise(buf, start, dur, vol, cutoffFn) {
  const total = Math.floor(dur * SR);
  // 별도 작은 버퍼에 노이즈+로우패스
  const tmp = new Float32Array(total);
  let prev = 0;
  for (let i = 0; i < total; i++) {
    const t = i / total;
    const c = cutoffFn ? cutoffFn(t) : 8000;
    const rc = 1 / (2 * Math.PI * c);
    const dt = 1 / SR;
    const a = dt / (rc + dt);
    prev = prev + a * ((Math.random() * 2 - 1) - prev);
    const env = Math.pow(1 - t, 1.5);
    tmp[i] = prev * vol * env;
  }
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= buf.length) break;
    buf[idx] += tmp[i];
  }
}

// ===== 8-bit 칩튠 SFX =====
const SFX_8BIT = {
  rotate(buf, s) {
    renderTone(buf, s, 0.06, () => 600, 'square', 0.001, 0.02, 0.25);
  },
  hardDrop(buf, s) {
    renderTone(buf, s, 0.12, p => 180 - p * 120, 'square', 0.001, 0.04, 0.3);
    renderNoise(buf, s, 0.08, 0.2, p => 2000 - p * 1500);
  },
  lineClear(buf, s) {
    [523, 659, 784].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.05 * SR), 0.1, () => f, 'square', 0.002, 0.05, 0.22);
    });
  },
  tetrisClear(buf, s) {
    [523, 659, 784, 1047, 1318].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.05 * SR), 0.18, () => f, 'square', 0.002, 0.08, 0.22);
      renderTone(buf, s + Math.floor(i * 0.05 * SR), 0.18, () => f * 2, 'square', 0.002, 0.08, 0.10);
    });
  },
  skill(buf, s) {
    renderTone(buf, s, 0.4, p => 200 + p * p * 1400, 'sawtooth', 0.002, 0.1, 0.20);
    renderNoise(buf, s, 0.15, 0.10, p => 4000 - p * 3000);
  },
  coin(buf, s) {
    renderTone(buf, s, 0.05, () => 988, 'square', 0.001, 0.02, 0.25);
    renderTone(buf, s + Math.floor(0.06 * SR), 0.12, () => 1318, 'square', 0.001, 0.05, 0.25);
  },
  victory(buf, s) {
    [523, 659, 784, 1047].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.1 * SR), 0.25, () => f, 'square', 0.005, 0.12, 0.22);
      renderTone(buf, s + Math.floor(i * 0.1 * SR), 0.25, () => f * 1.5, 'triangle', 0.005, 0.12, 0.12);
    });
  }
};

// ===== 모던 톤 SFX (사인/트라이앵글 + 부드러운 envelope + 로우패스) =====
const SFX_MODERN = {
  rotate(buf, s) {
    renderTone(buf, s, 0.10, p => 700 - p * 80, 'sine', 0.008, 0.06, 0.30);
    renderTone(buf, s, 0.10, p => 1400 - p * 160, 'sine', 0.008, 0.06, 0.12);
  },
  hardDrop(buf, s) {
    renderTone(buf, s, 0.20, p => 120 - p * 60, 'sine', 0.005, 0.12, 0.40);
    renderTone(buf, s, 0.20, p => 240 - p * 120, 'triangle', 0.005, 0.12, 0.18);
    renderNoise(buf, s, 0.06, 0.10, p => 1200 - p * 1000);
  },
  lineClear(buf, s) {
    [523, 659, 784].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.06 * SR), 0.2, () => f, 'sine', 0.01, 0.12, 0.28);
      renderTone(buf, s + Math.floor(i * 0.06 * SR), 0.2, () => f * 2, 'triangle', 0.01, 0.12, 0.10);
    });
  },
  tetrisClear(buf, s) {
    [523, 659, 784, 1047, 1318].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.06 * SR), 0.3, () => f, 'sine', 0.01, 0.18, 0.26);
      renderTone(buf, s + Math.floor(i * 0.06 * SR), 0.3, () => f * 2, 'triangle', 0.01, 0.18, 0.12);
      renderTone(buf, s + Math.floor(i * 0.06 * SR), 0.3, () => f * 3, 'sine', 0.01, 0.18, 0.06);
    });
  },
  skill(buf, s) {
    renderTone(buf, s, 0.5, p => 300 + p * p * 1200, 'sine', 0.01, 0.15, 0.30);
    renderTone(buf, s, 0.5, p => (300 + p * p * 1200) * 1.5, 'triangle', 0.01, 0.15, 0.12);
    renderTone(buf, s, 0.5, p => (300 + p * p * 1200) * 2, 'sine', 0.02, 0.2, 0.06);
  },
  coin(buf, s) {
    renderTone(buf, s, 0.08, () => 1175, 'sine', 0.005, 0.04, 0.30);
    renderTone(buf, s, 0.08, () => 1175 * 2, 'triangle', 0.005, 0.04, 0.12);
    renderTone(buf, s + Math.floor(0.08 * SR), 0.16, () => 1568, 'sine', 0.005, 0.08, 0.30);
    renderTone(buf, s + Math.floor(0.08 * SR), 0.16, () => 1568 * 2, 'triangle', 0.005, 0.08, 0.12);
  },
  victory(buf, s) {
    [523, 659, 784, 1047].forEach((f, i) => {
      renderTone(buf, s + Math.floor(i * 0.12 * SR), 0.4, () => f, 'sine', 0.02, 0.2, 0.26);
      renderTone(buf, s + Math.floor(i * 0.12 * SR), 0.4, () => f * 1.5, 'triangle', 0.02, 0.2, 0.14);
      renderTone(buf, s + Math.floor(i * 0.12 * SR), 0.4, () => f * 2, 'sine', 0.02, 0.25, 0.08);
    });
  }
};

const SEQUENCE = ['rotate', 'hardDrop', 'lineClear', 'tetrisClear', 'skill', 'coin', 'victory'];
const GAP_MS = 700;

function renderSequence(sfxSet, modernFilter) {
  const totalSec = SEQUENCE.length * (GAP_MS / 1000) + 1.0;
  const buf = new Float32Array(Math.floor(totalSec * SR));
  let t = 0.2;
  for (const name of SEQUENCE) {
    sfxSet[name](buf, Math.floor(t * SR));
    t += GAP_MS / 1000;
  }
  // 모던 톤은 마스터 로우패스로 더 부드럽게
  if (modernFilter) lowpass(buf, 6000);
  // 클리핑 방지
  let peak = 0;
  for (let i = 0; i < buf.length; i++) if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i]);
  if (peak > 0.95) { const k = 0.95 / peak; for (let i = 0; i < buf.length; i++) buf[i] *= k; }
  return buf;
}

function toWav(samples) {
  const n = samples.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

mkdirSync('bgm-out', { recursive: true });
writeFileSync('bgm-out/sfx-8bit.wav', toWav(renderSequence(SFX_8BIT, false)));
writeFileSync('bgm-out/sfx-modern.wav', toWav(renderSequence(SFX_MODERN, true)));
console.log(`✔ sfx-8bit.wav, sfx-modern.wav`);
console.log(`시퀀스: ${SEQUENCE.join(' → ')}`);
