// BGM과 SFX를 묶어서 게임 씬에 따라 자동 전환하는 코디네이터.
// 브라우저 자동재생 정책 때문에 첫 사용자 입력 전에는 AudioContext를 만들지 않는다.
import { BGMPlayer, PRESETS as BGM_PRESETS } from './music.js?v=20260524-audio2';
import { SFXPlayer } from './sfx.js?v=20260524-audio2';

const STORAGE_KEY = 'bbs_audio_v1';

export class AudioManager {
  constructor() {
    this.audio = null;
    this.bgm = null;
    this.sfx = null;
    this.scene = null;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.bgmVolume = 0.6;
    this.sfxVolume = 0.7;
    this._loadSettings();
    this._listeners = [];
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.bgmEnabled = s.bgmEnabled !== false;
      this.sfxEnabled = s.sfxEnabled !== false;
      if (typeof s.bgmVolume === 'number') this.bgmVolume = s.bgmVolume;
      if (typeof s.sfxVolume === 'number') this.sfxVolume = s.sfxVolume;
    } catch {}
  }

  _saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bgmEnabled: this.bgmEnabled, sfxEnabled: this.sfxEnabled,
        bgmVolume: this.bgmVolume, sfxVolume: this.sfxVolume
      }));
    } catch {}
  }

  // 첫 사용자 입력 이후에 호출. 그 전에 호출돼도 무해(no-op).
  ensureInit() {
    if (this.audio) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.audio = new Ctx();
    this.bgm = new BGMPlayer(this.audio);
    this.sfx = new SFXPlayer(this.audio);
    this.bgm.setVolume(this.bgmVolume);
    this.sfx.setVolume(this.sfxVolume);
    // 초기화 직전에 요청된 씬이 있으면 적용
    if (this.scene && this.bgmEnabled) this.bgm.play(this.scene);
    this._emit();
  }

  // 사용자 입력 전이라 AudioContext가 비어있는지 확인.
  isUninitialized() { return !this.audio; }

  onChange(fn) { this._listeners.push(fn); }
  _emit() { this._listeners.forEach(fn => { try { fn(this); } catch {} }); }

  setScene(scene) {
    if (scene && !BGM_PRESETS[scene]) return;
    if (this.scene === scene) return;
    this.scene = scene;
    if (!this.audio) return;
    // 씬 전환 시 잔여 SFX(승리/패배 등) 즉시 중단해서 새 씬으로 끌고가지 않음.
    this.sfx?.stopAll();
    if (!this.bgmEnabled || !scene) { this.bgm.stop(); return; }
    this.bgm.play(scene);
  }

  // 현재 씬에서 강도만 바꾼다(예: battle → battleTense). null 주면 원래 씬으로.
  // 위급 전환은 빠른 페이드(70ms)로 즉각 반응.
  setIntensity(overrideScene) {
    if (overrideScene === undefined) return;
    const target = overrideScene || this.scene;
    if (!target || !BGM_PRESETS[target]) return;
    if (!this.audio || !this.bgmEnabled) return;
    if (this.bgm.currentPreset === target) return;
    this.bgm.play(target, 70);
  }

  playSfx(name, arg) {
    if (!this.sfxEnabled || !this.audio) return;
    this.sfx.play(name, arg);
  }

  playHeartbeat() {
    if (!this.sfxEnabled || !this.audio) return;
    this.sfx.playHeartbeat();
  }

  setBgmEnabled(v) {
    this.bgmEnabled = !!v;
    this._saveSettings();
    if (!this.audio) { this._emit(); return; }
    if (this.bgmEnabled && this.scene) this.bgm.play(this.scene);
    else this.bgm.stop();
    this._emit();
  }

  setSfxEnabled(v) {
    this.sfxEnabled = !!v;
    this._saveSettings();
    this._emit();
  }

  toggleBgm() { this.setBgmEnabled(!this.bgmEnabled); }
  toggleSfx() { this.setSfxEnabled(!this.sfxEnabled); }
}
