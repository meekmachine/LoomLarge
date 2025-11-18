/**
 * TTS Scheduler
 * Manages timeline execution and coordinates with LipSync and Prosodic agencies
 */

import type { TimelineEvent } from './types';

export interface TTSSchedulerHost {
  // Callbacks to agencies
  onWordBoundary?: (word: string, wordIndex: number) => void;
  onViseme?: (visemeId: number, duration: number) => void;
  onEmoji?: (emoji: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface TTSSchedulerConfig {
  rate: number;
  pitch: number;
  volume: number;
}

export class TTSScheduler {
  private host: TTSSchedulerHost;
  private config: TTSSchedulerConfig;

  // Timeline execution state
  private timelineTimeouts: number[] = [];
  private timelineStartTime: number = 0;
  private wordIndex: number = 0;

  // Web Speech API
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentVoiceName: string = '';

  // Audio playback (SAPI mode)
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;

  constructor(host: TTSSchedulerHost, config?: Partial<TTSSchedulerConfig>) {
    this.host = host;
    this.config = {
      rate: config?.rate ?? 1.0,
      pitch: config?.pitch ?? 1.0,
      volume: config?.volume ?? 1.0,
    };

    // Initialize Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  /**
   * Load available voices
   */
  private async loadVoices(): Promise<void> {
    if (!this.synthesis) return;

    return new Promise((resolve) => {
      const loadVoicesImpl = () => {
        this.voices = this.synthesis!.getVoices();
        console.log(`[TTS Scheduler] Loaded ${this.voices.length} voices`);
        resolve();
      };

      if (this.synthesis.getVoices().length > 0) {
        loadVoicesImpl();
      } else {
        this.synthesis.addEventListener('voiceschanged', loadVoicesImpl, { once: true });
      }
    });
  }

  /**
   * Get available voices
   */
  public getVoices(): Array<{ name: string; lang: string; localService: boolean; default: boolean }> {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default,
    }));
  }

  /**
   * Set voice by name
   */
  public setVoice(voiceName: string): boolean {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.currentVoiceName = voiceName;
      console.log(`[TTS Scheduler] Voice set to: ${voiceName}`);
      return true;
    }
    console.warn(`[TTS Scheduler] Voice not found: ${voiceName}`);
    return false;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TTSSchedulerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Schedule speech using Web Speech API
   */
  public async scheduleWebSpeech(
    text: string,
    timeline: TimelineEvent[]
  ): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Web Speech API not available');
    }

    // Reset word index
    this.wordIndex = 0;

    // Create utterance
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = this.config.rate;
    this.utterance.pitch = this.config.pitch;
    this.utterance.volume = this.config.volume;

    // Set voice if specified
    if (this.currentVoiceName) {
      const voice = this.voices.find(v => v.name === this.currentVoiceName);
      if (voice) {
        this.utterance.voice = voice;
      }
    }

    // Set up event handlers
    this.utterance.onstart = () => {
      console.log('[TTS Scheduler] Speech started');
      this.host.onSpeechStart?.();
      this.executeTimeline(timeline);
    };

    this.utterance.onend = () => {
      console.log('[TTS Scheduler] Speech ended');
      this.clearTimelineTimeouts();
      this.host.onSpeechEnd?.();
    };

    this.utterance.onerror = (event) => {
      console.error('[TTS Scheduler] Speech error:', event.error);
      this.clearTimelineTimeouts();
      this.host.onError?.(new Error(event.error));
    };

    this.utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const word = text.substring(event.charIndex, event.charIndex + (event.charLength || 0));
        this.host.onWordBoundary?.(word, this.wordIndex);
        this.wordIndex++;
      }
    };

    // Speak
    console.log(`[TTS Scheduler] Starting speech: "${text.substring(0, 50)}..."`);
    this.synthesis.speak(this.utterance);
  }

  /**
   * Schedule speech using SAPI (server-based)
   */
  public async scheduleSAPI(
    audioData: string,
    timeline: TimelineEvent[]
  ): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Reset word index
    this.wordIndex = 0;

    // Decode audio
    const audioBuffer = await this.decodeBase64Audio(audioData);

    // Create audio source
    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = audioBuffer;
    this.audioSource.connect(this.audioContext.destination);

    // Set up event handlers
    this.audioSource.onended = () => {
      console.log('[TTS Scheduler] SAPI audio ended');
      this.clearTimelineTimeouts();
      this.host.onSpeechEnd?.();
    };

    // Start playback
    console.log('[TTS Scheduler] Starting SAPI playback');
    this.host.onSpeechStart?.();
    this.executeTimeline(timeline);
    this.audioSource.start();
  }

  /**
   * Execute timeline events
   */
  private executeTimeline(timeline: TimelineEvent[]): void {
    this.clearTimelineTimeouts();
    this.timelineStartTime = Date.now();

    console.log(`[TTS Scheduler] Executing timeline with ${timeline.length} events`);

    for (const event of timeline) {
      const timeout = window.setTimeout(() => {
        this.handleTimelineEvent(event);
      }, event.offsetMs);

      this.timelineTimeouts.push(timeout);
    }
  }

  /**
   * Handle timeline event
   */
  private handleTimelineEvent(event: TimelineEvent): void {
    switch (event.type) {
      case 'WORD':
        // Word boundaries are handled by Web Speech API onboundary
        // For SAPI mode, we need to manually trigger
        if (this.audioSource) {
          this.host.onWordBoundary?.(event.word, this.wordIndex);
          this.wordIndex++;
        }
        break;

      case 'VISEME':
        this.host.onViseme?.(event.visemeId, event.durMs || 0);
        break;

      case 'EMOJI':
        this.host.onEmoji?.(event.emoji);
        break;

      case 'PHONEME':
        // Phoneme events can be used for advanced processing
        break;
    }
  }

  /**
   * Clear timeline timeouts
   */
  private clearTimelineTimeouts(): void {
    for (const timeout of this.timelineTimeouts) {
      clearTimeout(timeout);
    }
    this.timelineTimeouts = [];
  }

  /**
   * Decode base64 audio data
   */
  private async decodeBase64Audio(base64Data: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode audio
    return await this.audioContext.decodeAudioData(bytes.buffer);
  }

  /**
   * Stop current speech
   */
  public stop(): void {
    console.log('[TTS Scheduler] Stopping speech');

    // Stop Web Speech API
    if (this.synthesis) {
      this.synthesis.cancel();
    }

    // Stop SAPI audio
    if (this.audioSource) {
      try {
        this.audioSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.audioSource = null;
    }

    this.clearTimelineTimeouts();
  }

  /**
   * Pause speech
   */
  public pause(): void {
    console.log('[TTS Scheduler] Pausing speech');

    if (this.synthesis) {
      this.synthesis.pause();
    }

    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * Resume speech
   */
  public resume(): void {
    console.log('[TTS Scheduler] Resuming speech');

    if (this.synthesis) {
      this.synthesis.resume();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Cleanup and release resources
   */
  public dispose(): void {
    console.log('[TTS Scheduler] Disposing scheduler');

    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.utterance = null;
  }
}
