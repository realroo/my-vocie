export type GeminiBaseVoice = 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';

export type AudioFormat = 'wav' | 'mp3' | 'flac';
export type SampleRate = 16000 | 22050 | 24000 | 44100 | 48000;

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  geminiVoice: GeminiBaseVoice;
  category: string;
  description: string;
  tags: string[];
  sampleText: string;
  isCloned?: boolean;
  isPermanentModel?: boolean;
  createdAt?: string;
  // Acoustic traits (from analysis)
  pitchRange?: string;
  timbreDescription?: string;
  breathinessScore?: number;
  vocalFryScore?: number;
  warmthScore?: number;
  cadence?: string;
  detectedAccent?: string;
  synthesisPrompt?: string;
  sampleAudioBase64?: string;
  defaultSettings?: {
    speed: number;
    pitch: number;
    accent: string;
    tone: string;
    asmr: {
      enabled: boolean;
      style: string;
      intensity: number;
    };
    emotion: {
      seduction: number;
      joy: number;
      seriousness: number;
      intimacy: number;
      excitement: number;
      breathiness: number;
    };
  };
}

export type ToneType =
  | 'seductive'
  | 'sensual-intimate'
  | 'asmr-whisper'
  | 'warm-empathetic'
  | 'energetic-hype'
  | 'corporate-executive'
  | 'dramatic-cinematic'
  | 'melancholic-emotional'
  | 'hypnotic-mystic'
  | 'casual-conversational';

export type ASMRStyle = 'soft-whisper' | 'binaural-whisper' | 'close-mic-breathy' | 'gentle-murmur';

export interface EmotionSettings {
  seduction: number;
  breathiness: number;
  intimacy: number;
  joy: number;
  seriousness: number;
  excitement: number;
}

export interface ModulationSettings {
  accent: string;
  accentStrength: number;
  speed: number;
  pitch: number;
  audioFormat: AudioFormat;
  sampleRate: SampleRate;
  asmr: {
    enabled: boolean;
    style: ASMRStyle;
    intensity: number;
  };
  tone: ToneType;
  emotion: EmotionSettings;
  customStyleNote?: string;
}

export interface GeneratedClip {
  id: string;
  mode: 'tts' | 'sts';
  timestamp: number;
  text?: string;
  originalAudioBase64?: string;
  audioBase64: string;
  mimeType: string;
  audioFormat: AudioFormat;
  sampleRate: number;
  duration: number;
  voiceName: string;
  voiceId: string;
  isClonedVoice?: boolean;
  settings: ModulationSettings;
  appliedStyle: string;
}
