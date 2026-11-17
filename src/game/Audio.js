const STORAGE_MUTE_KEY = 'lavadash_muted';

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = this._loadMuteState();
    this.musicPlaying = false;
    this.musicTimer = null;
    this.stepIndex = 0;

    // Catchy upbeat 16-step arcade groove (C minor / F minor energetic vibe)
    this.bassNotes = [130.81, 0, 130.81, 155.56, 174.61, 0, 155.56, 130.81, 116.54, 0, 116.54, 130.81, 146.83, 155.56, 174.61, 196.0];
    this.leadNotes = [523.25, 0, 622.25, 587.33, 523.25, 0, 392.0, 466.16, 523.25, 0, 698.46, 622.25, 587.33, 523.25, 466.16, 392.0];
  }

  _loadMuteState() {
    try {
      return localStorage.getItem(STORAGE_MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  _saveMuteState() {
    try {
      localStorage.setItem(STORAGE_MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Ignore storage restrictions
    }
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.gain.value = 0.24;
      this.sfxGain.gain.value = 0.52;
      this.masterGain.gain.value = this.muted ? 0 : 0.85;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    this._saveMuteState();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }
    return this.muted;
  }

  startMusic() {
    this.unlock();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._scheduleStep();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _scheduleStep() {
    if (!this.musicPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    const stepDuration = 0.135; // ~111 BPM 16th-note pulse
    const idx = this.stepIndex % 16;

    if (!this.muted && this.ctx.state === 'running') {
      const bassFreq = this.bassNotes[idx];
      if (bassFreq > 0) {
        this._playTone(bassFreq, 'triangle', now, 0.11, 0.26, this.musicGain);
      }

      const leadFreq = this.leadNotes[idx];
      if (leadFreq > 0) {
        this._playTone(leadFreq, 'sine', now, 0.09, 0.14, this.musicGain);
      }

      // Soft percussive groove on offbeats
      if (idx % 4 === 0) {
        this._playKick(now);
      } else if (idx % 2 === 1) {
        this._playHiHat(now);
      }
    }

    this.stepIndex = (this.stepIndex + 1) % 16;
    this.musicTimer = window.setTimeout(() => this._scheduleStep(), stepDuration * 1000);
  }

  _playTone(freq, type, startTime, duration, volume, targetNode) {
    if (!this.ctx || !targetNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(targetNode);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  _playKick(startTime) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, startTime);
    osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.09);

    gain.gain.setValueAtTime(0.32, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.11);
  }

  _playHiHat(startTime) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(5200, startTime);
    gain.gain.setValueAtTime(0.035, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.025);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.03);
  }

  playClick() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this._playTone(580, 'sine', now, 0.05, 0.25, this.sfxGain);
    this._playTone(760, 'sine', now + 0.02, 0.05, 0.2, this.sfxGain);
  }

  playLane() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playJump() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.14);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playSlide() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playCollect() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this._playTone(659.25, 'sine', now, 0.08, 0.3, this.sfxGain);
    this._playTone(880.0, 'sine', now + 0.055, 0.12, 0.34, this.sfxGain);
  }

  playSpecial() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this._playTone(523.25, 'triangle', now, 0.1, 0.35, this.sfxGain);
    this._playTone(659.25, 'triangle', now + 0.07, 0.1, 0.35, this.sfxGain);
    this._playTone(783.99, 'triangle', now + 0.14, 0.12, 0.35, this.sfxGain);
    this._playTone(1046.5, 'sine', now + 0.21, 0.22, 0.4, this.sfxGain);
  }

  playCrash() {
    this.unlock();
    if (this.muted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.32);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
