// music.js의 PRESETS를 WAV 파일로 오프라인 렌더링.
// 브라우저 Web Audio 없이 PCM 샘플을 직접 합성한다.
import { PRESETS } from './src/music.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAMPLE_RATE = 22050;

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
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function osc(type, phase) {
  const t = phase - Math.floor(phase);
  switch (type) {
    case 'sine': return Math.sin(phase * 2 * Math.PI);
    case 'square': return t < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * t - 1;
    case 'triangle': return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
    default: return 0;
  }
}

// 1차 저역통과 필터 (브라우저 BiquadFilter 대신 단순 IIR)
function lowpass(buf, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SAMPLE_RATE;
  const a = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + a * (buf[i] - prev);
    buf[i] = prev;
  }
}

function renderNote(buf, startSample, freq, durSec, type, vol, detune) {
  if (!freq) return;
  const f = freq * Math.pow(2, (detune || 0) / 1200);
  const totalSamples = Math.floor(durSec * SAMPLE_RATE);
  const attack = Math.max(1, Math.floor(0.008 * SAMPLE_RATE));
  const release = Math.max(1, Math.floor(Math.min(0.08, durSec * 0.3) * SAMPLE_RATE));
  const sustainStart = attack;
  const sustainEnd = totalSamples - release;
  const phaseInc = f / SAMPLE_RATE;
  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const idx = startSample + i;
    if (idx >= buf.length) break;
    let env;
    if (i < sustainStart) env = i / attack;
    else if (i > sustainEnd) env = Math.max(0, (totalSamples - i) / release);
    else env = 1;
    buf[idx] += osc(type, phase) * vol * env;
    phase += phaseInc;
  }
}

function renderTrack(buf, track, bpm, startSec) {
  const beat = 60 / bpm;
  let tSec = startSec;
  for (const [note, d] of track.notes) {
    const midi = noteToMidi(note);
    const freq = midi == null ? 0 : midiToFreq(midi);
    const dur = d * beat * 0.92;
    renderNote(buf, Math.floor(tSec * SAMPLE_RATE), freq, dur, track.type, track.vol, track.detune || 0);
    tSec += d * beat;
  }
  return tSec - startSec;
}

function renderPreset(preset, loops = 2, masterVol = 0.6) {
  const beat = 60 / preset.bpm;
  const loopBeats = preset.tracks.reduce((max, t) => Math.max(max, t.notes.reduce((s, [, d]) => s + d, 0)), 0);
  const loopSec = loopBeats * beat;
  const totalSec = loopSec * loops + 0.5;
  const buf = new Float32Array(Math.floor(totalSec * SAMPLE_RATE));
  for (let i = 0; i < loops; i++) {
    for (const track of preset.tracks) {
      renderTrack(buf, track, preset.bpm, i * loopSec);
    }
  }
  // 마스터 게인 + 저역통과 (music.js의 BiquadFilter lowpass 4200 Hz와 동일)
  lowpass(buf, 4200);
  for (let i = 0; i < buf.length; i++) buf[i] *= masterVol;
  // 클리핑 방지
  let peak = 0;
  for (let i = 0; i < buf.length; i++) if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i]);
  if (peak > 0.95) {
    const k = 0.95 / peak;
    for (let i = 0; i < buf.length; i++) buf[i] *= k;
  }
  return buf;
}

function toWav(samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);            // PCM chunk size
  buf.writeUInt16LE(1, 20);              // PCM
  buf.writeUInt16LE(1, 22);              // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);              // block align
  buf.writeUInt16LE(16, 34);             // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

mkdirSync('bgm-out', { recursive: true });
for (const [key, preset] of Object.entries(PRESETS)) {
  const samples = renderPreset(preset, 2);
  const wav = toWav(samples);
  const path = `bgm-out/${key}.wav`;
  writeFileSync(path, wav);
  console.log(`✔ ${path}  (${preset.label}, ${(samples.length / SAMPLE_RATE).toFixed(1)}s)`);
}
