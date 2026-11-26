import { GravityPreset, SkillId, WeaponId, ZoneId } from './types';

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private stepIndex = 0;

  private _sfxEnabled = true;
  private _musicEnabled = true;
  private _currentZone: ZoneId = 1;
  private _isBoss = false;
  private _isPlayingMusic = false;

  constructor() {
    try {
      const savedSfx = localStorage.getItem('aethershift_sfx');
      const savedMusic = localStorage.getItem('aethershift_music');
      if (savedSfx !== null) this._sfxEnabled = savedSfx === 'true';
      if (savedMusic !== null) this._musicEnabled = savedMusic === 'true';
    } catch {
      // Ignore storage access errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxEnabled ? 0.55 : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._musicEnabled ? 0.24 : 0;
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public get sfxEnabled() {
    return this._sfxEnabled;
  }

  public get musicEnabled() {
    return this._musicEnabled;
  }

  public get allMuted() {
    return !this._sfxEnabled && !this._musicEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this._sfxEnabled = enabled;
    try {
      localStorage.setItem('aethershift_sfx', String(enabled));
    } catch {}
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(enabled ? 0.55 : 0, this.ctx.currentTime, 0.03);
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this._musicEnabled = enabled;
    try {
      localStorage.setItem('aethershift_music', String(enabled));
    } catch {}
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.24 : 0, this.ctx.currentTime, 0.05);
    }
    if (!enabled) {
      this.stopMusic();
    } else if (this._isPlayingMusic) {
      this.startMusic(this._currentZone, this._isBoss);
    }
  }

  public toggleMuteAll() {
    const target = this.allMuted;
    this.setSfxEnabled(target);
    this.setMusicEnabled(target);
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    dest: 'sfx' | 'music' = 'sfx',
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (dest === 'sfx' && !this._sfxEnabled) return;
    if (dest === 'music' && !this._musicEnabled) return;
    const targetNode = dest === 'sfx' ? this.sfxGain : this.musicGain;
    if (!targetNode) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), start);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(targetNode);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private playNoise(duration: number, filterFreq: number, volume: number, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this._sfxEnabled || !this.sfxGain) return;

    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime + delay);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(ctx.currentTime + delay);
  }

  public playJump(gravityFactor: number) {
    const base = gravityFactor < 0 ? 440 : gravityFactor < 0.5 ? 390 : 310;
    this.playTone(base, base * 1.9, 0.14, 'triangle', 0.32);
  }

  public playLand(gravityFactor: number) {
    const thud = Math.abs(gravityFactor) > 1.4 ? 95 : 130;
    this.playTone(thud, 48, 0.09, 'sine', 0.28);
  }

  public playGravityShift(preset: GravityPreset) {
    switch (preset) {
      case 'zero':
        this.playTone(320, 740, 0.24, 'sine', 0.28);
        this.playTone(480, 960, 0.2, 'triangle', 0.14, 'sfx', 0.04);
        break;
      case 'low':
        this.playTone(280, 560, 0.18, 'triangle', 0.26);
        break;
      case 'normal':
        this.playTone(440, 260, 0.14, 'sine', 0.24);
        break;
      case 'heavy':
        this.playTone(240, 82, 0.22, 'sawtooth', 0.24);
        break;
      case 'inverted':
        this.playTone(220, 880, 0.26, 'sawtooth', 0.2);
        this.playTone(440, 1120, 0.22, 'sine', 0.22, 'sfx', 0.03);
        break;
    }
  }

  public playAttack(weapon: WeaponId, comboStep: number) {
    if (weapon === 'sword') {
      const pitch = comboStep === 1 ? 420 : comboStep === 2 ? 560 : 720;
      this.playNoise(0.11, 2400 + comboStep * 600, 0.28);
      this.playTone(pitch, pitch * 0.42, 0.14, 'sawtooth', 0.2);
      if (comboStep === 3) {
        this.playTone(180, 65, 0.24, 'triangle', 0.35, 'sfx', 0.04);
      }
    } else if (weapon === 'gun') {
      if (comboStep === 1) {
        this.playTone(920, 260, 0.1, 'square', 0.18);
      } else if (comboStep === 2) {
        this.playTone(1040, 320, 0.1, 'square', 0.18);
        this.playTone(1240, 380, 0.1, 'square', 0.16, 'sfx', 0.05);
      } else {
        this.playTone(1380, 180, 0.26, 'sawtooth', 0.26);
        this.playNoise(0.18, 3200, 0.26);
      }
    } else if (weapon === 'staff') {
      const base = 460 + comboStep * 130;
      this.playTone(base, base * 1.45, 0.18, 'sine', 0.24);
      this.playTone(base * 1.5, base * 0.9, 0.2, 'triangle', 0.16, 'sfx', 0.03);
      if (comboStep === 3) {
        this.playNoise(0.22, 1800, 0.24, 0.06);
      }
    } else if (weapon === 'super_spread_fireball') {
      this.playNoise(0.16, 2200, 0.3);
      this.playTone(460, 150, 0.18, 'sawtooth', 0.24);
    } else if (weapon === 'super_ultra_laser') {
      this.playTone(180, 620, 0.36, 'sawtooth', 0.28);
      this.playTone(720, 240, 0.4, 'square', 0.18, 'sfx', 0.04);
      this.playNoise(0.32, 3600, 0.3);
    } else if (weapon === 'super_laser_sword') {
      this.playNoise(0.14, 3400, 0.26);
      this.playTone(780, 320, 0.18, 'sawtooth', 0.24);
      this.playTone(1120, 680, 0.16, 'sine', 0.2, 'sfx', 0.03);
    } else if (weapon === 'super_round_fireball') {
      this.playTone(220, 90, 0.28, 'sawtooth', 0.32);
      this.playNoise(0.24, 1500, 0.32);
    } else {
      // super_machine_gun
      this.playTone(880 + comboStep * 90, 260, 0.06, 'square', 0.15);
      this.playNoise(0.05, 2800, 0.16);
    }
  }

  public playDeflect() {
    this.playTone(980, 1650, 0.12, 'triangle', 0.28);
  }

  public playGemPickup(comboMult: number) {
    const semitones = Math.min(12, (comboMult - 1) * 2);
    const freq = 587.33 * Math.pow(2, semitones / 12);
    this.playTone(freq, freq * 1.25, 0.12, 'sine', 0.26);
    if (comboMult >= 2) {
      this.playTone(freq * 1.5, freq * 2, 0.14, 'triangle', 0.18, 'sfx', 0.04);
    }
  }

  public playHealCoin() {
    this.playTone(523.25, 783.99, 0.14, 'sine', 0.24);
    this.playTone(659.25, 1046.5, 0.18, 'triangle', 0.2, 'sfx', 0.05);
  }

  public playHiddenPower() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.15, 0.22, 'triangle', 0.28, 'sfx', idx * 0.06);
    });
  }

  public playLifeRevive() {
    this.playTone(392, 784, 0.25, 'triangle', 0.32);
    this.playTone(523.25, 1046.5, 0.32, 'sine', 0.26, 'sfx', 0.1);
  }

  public playEnemyHit() {
    this.playTone(210, 95, 0.09, 'square', 0.22);
    this.playNoise(0.06, 1500, 0.18);
  }

  public playEnemyExplode() {
    this.playNoise(0.28, 1200, 0.36);
    this.playTone(240, 48, 0.28, 'sawtooth', 0.28);
    this.playTone(620, 980, 0.16, 'sine', 0.14, 'sfx', 0.05);
  }

  public playBossTelegraph() {
    this.playTone(165, 220, 0.24, 'sawtooth', 0.24);
    this.playTone(165, 220, 0.24, 'sawtooth', 0.24, 'sfx', 0.26);
  }

  public playBossExplode() {
    for (let i = 0; i < 4; i++) {
      this.playNoise(0.38, 1400 - i * 180, 0.4, i * 0.14);
      this.playTone(190 - i * 25, 38, 0.38, 'sawtooth', 0.32, 'sfx', i * 0.14);
    }
    this.playTone(523.25, 1046.5, 0.45, 'triangle', 0.24, 'sfx', 0.52);
  }

  public playPlayerHurt(infiniteLife: boolean) {
    if (infiniteLife) {
      this.playTone(360, 680, 0.16, 'sine', 0.24);
    } else {
      this.playTone(220, 85, 0.22, 'sawtooth', 0.3);
      this.playNoise(0.14, 900, 0.24);
    }
  }

  public playSkill(skill: SkillId) {
    const map: Record<SkillId, [number, number]> = {
      tidal_shield: [330, 780],
      aether_wings: [440, 1100],
      crystal_quake: [180, 60],
      chrono_dilation: [880, 220],
      astral_supernova: [523, 1568],
    };
    const [a, b] = map[skill];
    this.playTone(a, b, 0.34, 'triangle', 0.3);
    this.playTone(a * 1.5, b * 1.25, 0.28, 'sine', 0.2, 'sfx', 0.06);
  }

  public playStageClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.22, 'triangle', 0.28, 'sfx', idx * 0.11);
    });
  }

  public playRewardChime() {
    this.playTone(659.25, 659.25, 0.12, 'sine', 0.26, 'sfx', 0);
    this.playTone(880, 880, 0.18, 'sine', 0.26, 'sfx', 0.09);
    this.playTone(1318.5, 1318.5, 0.28, 'triangle', 0.24, 'sfx', 0.18);
  }

  public playUiClick() {
    this.playTone(620, 740, 0.05, 'sine', 0.14);
  }

  public startMusic(zone: ZoneId, isBoss = false) {
    this._currentZone = zone;
    this._isBoss = isBoss;
    this._isPlayingMusic = true;
    this.stopTimerOnly();
    if (!this._musicEnabled) return;

    this.ensureContext();
    const tier = Math.floor((Math.max(1, zone) - 1) / 5);
    const tierTempoBoost = Math.min(45, tier * 3);
    const zoneSlot = ((Math.max(1, zone) - 1) % 5) + 1;
    const tempoMs = Math.max(
      110,
      (isBoss ? 145 : zoneSlot === 2 ? 190 : zoneSlot === 4 ? 175 : 205) - tierTempoBoost
    );

    const scales: Record<number, number[]> = {
      1: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63],
      2: [329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 493.88],
      3: [220.0, 261.63, 293.66, 329.63, 392.0, 329.63, 261.63, 196.0],
      4: [246.94, 293.66, 369.99, 440.0, 493.88, 587.33, 440.0, 369.99],
      5: [261.63, 311.13, 392.0, 466.16, 523.25, 622.25, 466.16, 392.0],
    };

    const tick = () => {
      if (!this._musicEnabled || !this._isPlayingMusic) return;
      const slot = ((Math.max(1, this._currentZone) - 1) % 5) + 1;
      const scale = scales[slot] || scales[1];
      const idx = this.stepIndex % scale.length;
      const note = scale[idx];
      const bass = note * 0.25;

      if (this._isBoss) {
        this.playTone(bass, bass * 0.96, 0.12, 'sawtooth', 0.28, 'music');
        if (this.stepIndex % 2 === 0) {
          this.playTone(note * 1.5, note * 1.5, 0.11, 'square', 0.14, 'music');
        }
      } else {
        const wave: OscillatorType = slot === 1 || slot === 3 ? 'sine' : 'triangle';
        this.playTone(note, note, 0.17, wave, 0.18, 'music');
        if (this.stepIndex % 4 === 0) {
          this.playTone(bass, bass, 0.34, 'triangle', 0.26, 'music');
        }
      }
      this.stepIndex++;
    };

    tick();
    this.musicTimer = window.setInterval(tick, tempoMs);
  }

  private stopTimerOnly() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public stopMusic() {
    this._isPlayingMusic = false;
    this.stopTimerOnly();
  }
}

export const gameAudio = new GameAudioEngine();
