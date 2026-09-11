// Procedural Web Audio + HTML5 Audio Engine for Ambient Backgrounds

class AmbientAudioService {
  private audioCtx: AudioContext | null = null;
  private currentHtmlAudio: HTMLAudioElement | null = null;
  private proceduralNodes: {
    gainNode?: GainNode;
    stop?: () => void;
  } | null = null;

  private isPlaying = false;
  private volume = 0.5;
  private currentTrackId: string | null = null;
  private currentTrackTitle = '';

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentHtmlAudio) {
      this.currentHtmlAudio.volume = this.volume;
    }
    if (this.proceduralNodes?.gainNode && this.audioCtx) {
      this.proceduralNodes.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTitle(): string {
    return this.currentTrackTitle;
  }

  public stop() {
    this.isPlaying = false;
    if (this.currentHtmlAudio) {
      this.currentHtmlAudio.pause();
      this.currentHtmlAudio.src = '';
      this.currentHtmlAudio = null;
    }
    if (this.proceduralNodes) {
      try {
        this.proceduralNodes.stop?.();
      } catch {}
      this.proceduralNodes = null;
    }
  }

  public playUrl(url: string, title = 'Custom Audio Track') {
    this.stop();
    this.currentTrackId = url;
    this.currentTrackTitle = title;

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = this.volume;
      audio.crossOrigin = 'anonymous';

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.currentHtmlAudio = audio;
          })
          .catch(() => {
            this.isPlaying = false;
          });
      }
    } catch {
      this.isPlaying = false;
    }
  }

  public playProcedural(type: 'rain' | 'fireplace' | 'cosmic' | 'lofi') {
    this.stop();
    const ctx = this.getAudioContext();
    this.isPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    let active = true;

    if (type === 'rain') {
      this.currentTrackTitle = 'Gentle Rain & Distant Thunder';
      // Pink/Brown noise generator for rain
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      this.proceduralNodes = {
        gainNode: masterGain,
        stop: () => {
          try {
            whiteNoise.stop();
            whiteNoise.disconnect();
          } catch {}
        },
      };
    } else if (type === 'fireplace') {
      this.currentTrackTitle = 'Crackling Fireplace Embers';
      // Low rumble drone + intermittent crackle pops
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();

      // Periodic wood pops
      const popInterval = window.setInterval(() => {
        if (!active) return;
        try {
          const popOsc = ctx.createOscillator();
          const popGain = ctx.createGain();
          popOsc.type = 'triangle';
          popOsc.frequency.setValueAtTime(800 + Math.random() * 1200, ctx.currentTime);

          popGain.gain.setValueAtTime(0.12 * Math.random(), ctx.currentTime);
          popGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04 + Math.random() * 0.05);

          popOsc.connect(popGain);
          popGain.connect(masterGain);
          popOsc.start();
          popOsc.stop(ctx.currentTime + 0.1);
        } catch {}
      }, 180);

      this.proceduralNodes = {
        gainNode: masterGain,
        stop: () => {
          active = false;
          clearInterval(popInterval);
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        },
      };
    } else if (type === 'cosmic') {
      this.currentTrackTitle = 'Deep Cosmic Binaural Tone (432Hz)';
      // Warm detuned sine waves
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(108, ctx.currentTime); // 432 / 4
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(109.5, ctx.currentTime); // subtle binaural beat
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(216, ctx.currentTime);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.09, ctx.currentTime);

      osc1.connect(subGain);
      osc2.connect(subGain);
      osc3.connect(subGain);
      subGain.connect(masterGain);

      osc1.start();
      osc2.start();
      osc3.start();

      this.proceduralNodes = {
        gainNode: masterGain,
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
            osc3.stop();
            osc1.disconnect();
            osc2.disconnect();
            osc3.disconnect();
          } catch {}
        },
      };
    } else if (type === 'lofi') {
      this.currentTrackTitle = 'Lo-Fi Ambient Piano Chords';
      // Procedural electric piano arpeggiations
      const chords = [
        [220.0, 261.63, 329.63, 392.0], // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 349.23], // G7
        [164.81, 207.65, 246.94, 329.63], // Em7
      ];
      let chordIndex = 0;

      const chordInterval = window.setInterval(() => {
        if (!active) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;

        currentChord.forEach((freq, i) => {
          window.setTimeout(() => {
            if (!active) return;
            try {
              const noteOsc = ctx.createOscillator();
              const noteGain = ctx.createGain();
              noteOsc.type = 'sine';
              noteOsc.frequency.setValueAtTime(freq, ctx.currentTime);

              noteGain.gain.setValueAtTime(0.06, ctx.currentTime);
              noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

              noteOsc.connect(noteGain);
              noteGain.connect(masterGain);
              noteOsc.start();
              noteOsc.stop(ctx.currentTime + 2.0);
            } catch {}
          }, i * 160);
        });
      }, 2600);

      this.proceduralNodes = {
        gainNode: masterGain,
        stop: () => {
          active = false;
          clearInterval(chordInterval);
        },
      };
    }
  }
}

export const ambientAudioEngine = new AmbientAudioService();
