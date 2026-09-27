// 'use client'

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private musicGain: GainNode | null = null;
  private staticGain: GainNode | null = null;
  private staticFilter: BiquadFilterNode | null = null;
  private staticSource: AudioBufferSourceNode | null = null;
  private staticBuffer: AudioBuffer | null = null;
  private audio: HTMLAudioElement | null = null;
  private musicSource: MediaElementAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));
  private onPlaybackStateChange: ((playing: boolean) => void) | null = null;
  private onAudioErrorCallback: (() => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTrackUrl: string | null = null;
  private userHasInteracted = false;
  private isExplicitlyPaused = false;

  public init(): AudioContext {
    this.userHasInteracted = true;
    const context = this.ensureContext();
    if (this.audio && this.pendingTrackUrl && this.audio.paused && !this.isExplicitlyPaused) {
      if (this.audio.src !== this.pendingTrackUrl) {
        this.audio.src = this.pendingTrackUrl;
      }
      this.audio
        .play()
        .then(() => {
          this.onPlaybackStateChange?.(true);
          if (this.musicGain) this.fade(this.musicGain, 0.85, 0.3);
        })
        .catch(() => {});
    }
    return context;
  }

  public setPlaybackCallback(cb: (playing: boolean) => void): void {
    this.onPlaybackStateChange = cb;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupNodes();
    }
    if (this.ctx.state === 'suspended' && this.userHasInteracted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupNodes(): void {
    if (!this.ctx) return;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.musicGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.staticFilter = this.ctx.createBiquadFilter();
    this.staticFilter.type = 'bandpass';
    this.staticFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.staticFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.staticFilter.connect(this.staticGain);
    this.staticGain.connect(this.ctx.destination);

    this.staticBuffer = this.createPinkNoiseBuffer(this.ctx);

    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.loop = false;

    this.audio.addEventListener('play', () => this.onPlaybackStateChange?.(true));
    this.audio.addEventListener('pause', () => this.onPlaybackStateChange?.(false));
    this.audio.addEventListener('ended', () => {
      this.onPlaybackStateChange?.(false);
      this.onEndedCallback?.();
    });
    this.audio.addEventListener('error', () => {
      this.onPlaybackStateChange?.(false);
      this.onAudioErrorCallback?.();
    });

    this.musicSource = this.ctx.createMediaElementSource(this.audio);
    this.musicSource.connect(this.musicGain);
  }

  public setErrorCallback(cb: () => void): void {
    this.onAudioErrorCallback = cb;
  }

  public setEndedCallback(cb: () => void): void {
    this.onEndedCallback = cb;
  }

  private createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.153852;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.76160 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return buffer;
  }

  private startStaticLoop(): void {
    if (this.staticSource || !this.ctx || !this.staticBuffer || !this.staticFilter) return;
    this.staticSource = this.ctx.createBufferSource();
    this.staticSource.buffer = this.staticBuffer;
    this.staticSource.loop = true;
    this.staticSource.connect(this.staticFilter);
    this.staticSource.start();
  }

  private fade(gainNode: GainNode, target: number, duration: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), now);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(target, 0.0001), now + duration);
    if (target === 0) gainNode.gain.setValueAtTime(0, now + duration);
  }

  public togglePlayPause(): boolean {
    this.userHasInteracted = true;
    this.ensureContext();
    if (!this.audio) return false;

    if (this.audio.paused) {
      this.isExplicitlyPaused = false;
      if (this.audio.src || this.pendingTrackUrl) {
        if ((!this.audio.src || this.audio.src !== this.pendingTrackUrl) && this.pendingTrackUrl) {
          this.audio.src = this.pendingTrackUrl;
        }
        this.audio
          .play()
          .then(() => {
            this.onPlaybackStateChange?.(true);
            if (this.musicGain) this.fade(this.musicGain, 0.85, 0.3);
          })
          .catch(() => {});
        return true;
      }
      return false;
    } else {
      this.isExplicitlyPaused = true;
      this.audio.pause();
      this.onPlaybackStateChange?.(false);
      return false;
    }
  }

  public startTuning(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.pendingTrackUrl = null;
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.onPlaybackStateChange?.(false);
    }
    if (!this.userHasInteracted) return;
    this.ensureContext();
    this.startStaticLoop();

    if (this.musicGain) this.fade(this.musicGain, 0, 0.1);
    if (this.staticGain) this.fade(this.staticGain, 0.10, 0.2);
  }

  public stopTuning(newUrl: string): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.isExplicitlyPaused = false;
    this.ensureContext();
    this.pendingTrackUrl = newUrl || null;

    if (this.staticGain) this.fade(this.staticGain, 0, 0.3);

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;

      if (newUrl) {
        this.audio.src = newUrl;
        this.audio.load();
        // Solo llamar a .play() si el usuario ya interactuó con el DOM para evitar errores de extensiones/autoplay
        if (this.userHasInteracted) {
          this.audio
            .play()
            .then(() => {
              this.onPlaybackStateChange?.(true);
              if (this.musicGain) this.fade(this.musicGain, 0.85, 0.35);
            })
            .catch(() => {
              this.onPlaybackStateChange?.(false);
            });
        }
      } else {
        this.audio.removeAttribute('src');
        this.onPlaybackStateChange?.(false);
      }
    }
  }

  /**
   * Transición suave con sonido de estática FM audible (~600ms) y click mecánico
   * al pasar de una canción a la siguiente automáticamente o por sintonizador.
   */
  public transitionBetweenTracks(newUrl: string, onTransitionStart?: () => void): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.isExplicitlyPaused = false;
    this.ensureContext();
    this.pendingTrackUrl = newUrl || null;

    // 1. Iniciar estática FM procedural claramente audible y click mecánico
    this.startStaticLoop();
    if (this.musicGain) this.fade(this.musicGain, 0, 0.12);
    if (this.staticGain) this.fade(this.staticGain, 0.13, 0.15);
    this.playClick();

    onTransitionStart?.();

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.onPlaybackStateChange?.(false);
    }

    // 2. Mantener la estática ~600ms para que se perciba claramente el cambio de emisora/música
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      if (this.staticGain) this.fade(this.staticGain, 0, 0.35);

      if (this.audio) {
        if (newUrl) {
          this.audio.src = newUrl;
          this.audio.load();
          if (this.userHasInteracted) {
            this.audio
              .play()
              .then(() => {
                this.onPlaybackStateChange?.(true);
                if (this.musicGain) this.fade(this.musicGain, 0.85, 0.35);
              })
              .catch(() => {
                this.onPlaybackStateChange?.(false);
              });
          }
        } else {
          this.audio.removeAttribute('src');
          this.onPlaybackStateChange?.(false);
        }
      }
    }, 600);
  }

  public playClick(): void {
    this.userHasInteracted = true;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.006);
  }

  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (this.analyser) this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  public getAverageFrequency(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return data.length > 0 ? sum / data.length : 0;
  }

  public dispose(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    if (this.staticSource) {
      try {
        this.staticSource.stop();
      } catch {}
      this.staticSource.disconnect();
      this.staticSource = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
    this.musicGain = null;
    this.staticGain = null;
    this.staticFilter = null;
    this.musicSource = null;
    this.staticBuffer = null;
  }
}

export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null;
