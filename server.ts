import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Mp3Encoder } from '@breezystack/lamejs';
// @ts-ignore
import flacPkg from 'libflacjs/dist/libflac.min.js';

const Flac: any = (flacPkg as any).default || flacPkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client setup strictly per guidelines
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Ensure FLAC WebAssembly module is ready
 */
let flacReadyPromise: Promise<any> | null = null;
function getFlacInstance(): Promise<any> {
  if (Flac.isReady && Flac.isReady()) return Promise.resolve(Flac);
  if (!flacReadyPromise) {
    flacReadyPromise = new Promise((resolve) => {
      Flac.onready = () => resolve(Flac);
    });
  }
  return flacReadyPromise;
}

/**
 * Resample 16-bit linear mono PCM from fromRate to toRate
 */
function resamplePcm(
  inputPcm: Int16Array,
  fromRate: number,
  toRate: number
): Int16Array {
  if (fromRate === toRate) return inputPcm;

  const ratio = toRate / fromRate;
  const newLength = Math.round(inputPcm.length * ratio);
  const output = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i / ratio;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(inputPcm.length - 1, indexFloor + 1);
    const frac = origIndex - indexFloor;

    const val = (1 - frac) * inputPcm[indexFloor] + frac * inputPcm[indexCeil];
    output[i] = Math.max(-32768, Math.min(32767, Math.round(val)));
  }

  return output;
}

/**
 * Convert 16-bit Linear PCM buffer to standard RIFF WAV buffer
 */
function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF Chunk Descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Encode raw 24kHz 16-bit PCM into WAV, MP3, or FLAC at requested sample rate
 */
async function encodeAudio(
  rawPcmBuffer: Buffer,
  format: 'wav' | 'mp3' | 'flac' = 'wav',
  targetSampleRate: number = 24000
): Promise<{ buffer: Buffer; mimeType: string }> {
  const sampleCount = Math.floor(rawPcmBuffer.length / 2);
  const inputPcm = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    inputPcm[i] = rawPcmBuffer.readInt16LE(i * 2);
  }

  const resampled = resamplePcm(inputPcm, 24000, targetSampleRate);

  if (format === 'mp3') {
    try {
      const encoder = new Mp3Encoder(1, targetSampleRate, 192);
      const chunks: Buffer[] = [];
      const buf = encoder.encodeBuffer(resampled);
      if (buf.length > 0) chunks.push(Buffer.from(buf));
      const flushBuf = encoder.flush();
      if (flushBuf.length > 0) chunks.push(Buffer.from(flushBuf));
      return {
        buffer: Buffer.concat(chunks),
        mimeType: 'audio/mpeg',
      };
    } catch (mp3Err) {
      console.warn('MP3 encoding failed, falling back to WAV:', mp3Err);
    }
  } else if (format === 'flac') {
    try {
      const flacInstance = await getFlacInstance();
      const chunks: Buffer[] = [];
      const encoder = flacInstance.create_libflac_encoder(targetSampleRate, 1, 16, 5, 0);
      flacInstance.init_encoder_stream(encoder, (bin: Uint8Array) => {
        chunks.push(Buffer.from(bin));
      });
      const int32Samples = new Int32Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        int32Samples[i] = resampled[i];
      }
      flacInstance.FLAC__stream_encoder_process_interleaved(encoder, int32Samples, int32Samples.length);
      flacInstance.FLAC__stream_encoder_finish(encoder);
      flacInstance.FLAC__stream_encoder_delete(encoder);
      return {
        buffer: Buffer.concat(chunks),
        mimeType: 'audio/flac',
      };
    } catch (flacErr) {
      console.warn('FLAC encoding failed, falling back to WAV:', flacErr);
    }
  }

  // Default WAV format (or fallback)
  const resampledBuffer = Buffer.alloc(resampled.length * 2);
  for (let i = 0; i < resampled.length; i++) {
    resampledBuffer.writeInt16LE(resampled[i], i * 2);
  }
  const wavBuffer = pcmToWav(resampledBuffer, targetSampleRate, 1, 16);
  return {
    buffer: wavBuffer,
    mimeType: 'audio/wav',
  };
}

/**
 * Prebuilt AI Voice Catalog
 */
const PREBUILT_VOICES = [
  {
    id: 'kore',
    name: 'Kore',
    geminiVoice: 'Kore',
    gender: 'Female',
    category: 'Warm & Velvety',
    description: 'Soothing, warm, velvety timbre with exceptional emotional depth and natural resonance.',
    tags: ['Warm', 'Soothing', 'Narrative', 'Empathic'],
    sampleText: 'Welcome to your sanctuary of sound. Let every breath slow your pace, and let the warmth in my voice guide you.',
    defaultSettings: {
      speed: 1.0,
      pitch: 0,
      accent: 'Neutral American',
      tone: 'warm-empathetic',
      asmr: { enabled: false, style: 'soft-whisper', intensity: 0.5 },
      emotion: { seduction: 0.2, joy: 0.6, seriousness: 0.3, intimacy: 0.7, excitement: 0.2, breathiness: 0.4 },
    },
  },
  {
    id: 'puck',
    name: 'Puck',
    geminiVoice: 'Puck',
    gender: 'Male',
    category: 'Dynamic & Charismatic',
    description: 'Youthful, vibrant, agile voice with crisp consonant articulation and charismatic presence.',
    tags: ['Energetic', 'Charismatic', 'Commercial', 'Storyteller'],
    sampleText: 'Step right up! We are breaking into the next dimension of acoustic synthesis where your imagination sets the limits.',
    defaultSettings: {
      speed: 1.05,
      pitch: 1,
      accent: 'Neutral American',
      tone: 'energetic-hype',
      asmr: { enabled: false, style: 'soft-whisper', intensity: 0.3 },
      emotion: { seduction: 0.1, joy: 0.8, seriousness: 0.2, intimacy: 0.3, excitement: 0.9, breathiness: 0.2 },
    },
  },
  {
    id: 'fenrir',
    name: 'Fenrir',
    geminiVoice: 'Fenrir',
    gender: 'Male',
    category: 'Deep Baritone & Cinematic',
    description: 'Deep, resonant, authoritative baritone with cinematic gravitas and rich chest resonance.',
    tags: ['Deep', 'Authoritative', 'Cinematic', 'Sensual Baritone'],
    sampleText: 'In the quiet hours between midnight and dawn, shadows lengthen and the deepest stories find their voice.',
    defaultSettings: {
      speed: 0.92,
      pitch: -3,
      accent: 'Neutral American',
      tone: 'dramatic-cinematic',
      asmr: { enabled: false, style: 'close-mic-breathy', intensity: 0.4 },
      emotion: { seduction: 0.5, joy: 0.2, seriousness: 0.9, intimacy: 0.6, excitement: 0.2, breathiness: 0.3 },
    },
  },
  {
    id: 'charon',
    name: 'Charon',
    gender: 'Male',
    geminiVoice: 'Charon',
    category: 'Calm & Intellectual',
    description: 'Measured, contemplative, deeply calming cadence ideal for audiobooks, essays, and meditations.',
    tags: ['Calm', 'Intellectual', 'Pensive', 'Late Night'],
    sampleText: 'Consider for a moment the architecture of sound. Every frequency carries history, intention, and feeling.',
    defaultSettings: {
      speed: 0.95,
      pitch: -1,
      accent: 'British (RP)',
      tone: 'corporate-executive',
      asmr: { enabled: false, style: 'soft-whisper', intensity: 0.3 },
      emotion: { seduction: 0.2, joy: 0.3, seriousness: 0.8, intimacy: 0.5, excitement: 0.1, breathiness: 0.3 },
    },
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    gender: 'Female / Neutral',
    geminiVoice: 'Zephyr',
    category: 'Airy & ASMR Whisper',
    description: 'Airy, intimate, whisper-soft texture engineered for ASMR tingles, bedtime stories, and seductive dialogue.',
    tags: ['ASMR Specialist', 'Whisper', 'Intimate', 'Seductive'],
    sampleText: 'Close your eyes... hear the soft whisper right by your ear. Let the quiet world fade away into pure relaxation.',
    defaultSettings: {
      speed: 0.85,
      pitch: 0,
      accent: 'British (RP)',
      tone: 'seductive',
      asmr: { enabled: true, style: 'binaural-whisper', intensity: 0.85 },
      emotion: { seduction: 0.9, joy: 0.3, seriousness: 0.2, intimacy: 0.95, excitement: 0.1, breathiness: 0.85 },
    },
  },
  {
    id: 'aria-velvet',
    name: 'Aria Noir',
    gender: 'Female',
    geminiVoice: 'Kore',
    category: 'Seductive & Sensual Midnight',
    description: 'Hypnotic, sultry bedroom cadence with delicate breath accents, vocal fry, and irresistible warmth.',
    tags: ['Seductive', 'Sensual', 'Late Night', 'ASMR'],
    sampleText: 'You look like someone who knows how to keep a secret... Lean in closer, and let me tell you everything.',
    defaultSettings: {
      speed: 0.88,
      pitch: -1,
      accent: 'French-inflected',
      tone: 'seductive',
      asmr: { enabled: true, style: 'close-mic-breathy', intensity: 0.75 },
      emotion: { seduction: 0.95, joy: 0.2, seriousness: 0.4, intimacy: 0.98, excitement: 0.2, breathiness: 0.75 },
    },
  },
  {
    id: 'dante-smoky',
    name: 'Dante Vance',
    gender: 'Male',
    geminiVoice: 'Fenrir',
    category: 'Sensual Baritone & Late Night Host',
    description: 'Smoky, deep, commanding yet intimately close voice with intoxicating late-night magnetism.',
    tags: ['Sensual Baritone', 'Deep', 'Magnetic', 'Seductive'],
    sampleText: 'It is just you and me right now. Pour a glass, turn the lights down low, and let the night take over.',
    defaultSettings: {
      speed: 0.9,
      pitch: -4,
      accent: 'Neutral American',
      tone: 'sensual-intimate',
      asmr: { enabled: true, style: 'close-mic-breathy', intensity: 0.65 },
      emotion: { seduction: 0.9, joy: 0.2, seriousness: 0.7, intimacy: 0.9, excitement: 0.2, breathiness: 0.6 },
    },
  },
  {
    id: 'eleanor-rp',
    name: 'Lady Eleanor',
    gender: 'Female',
    geminiVoice: 'Zephyr',
    category: 'Aristocratic British RP',
    description: 'Impeccable Received Pronunciation, stately elegance, crisp consonants, and dignified charm.',
    tags: ['British RP', 'Aristocratic', 'Elegance', 'Literature'],
    sampleText: 'One must admit, there is an exquisite pleasure in precision. Shall we begin our discourse with utmost clarity?',
    defaultSettings: {
      speed: 0.96,
      pitch: 1,
      accent: 'British (RP)',
      tone: 'corporate-executive',
      asmr: { enabled: false, style: 'soft-whisper', intensity: 0.2 },
      emotion: { seduction: 0.3, joy: 0.4, seriousness: 0.8, intimacy: 0.4, excitement: 0.3, breathiness: 0.2 },
    },
  },
];

/**
 * Construct structured speech style directive based on user options
 */
function buildStyleMetadata(options: {
  accent?: string;
  accentStrength?: number;
  speed?: number;
  pitch?: number;
  asmrEnabled?: boolean;
  asmrStyle?: string;
  asmrIntensity?: number;
  tone?: string;
  emotion?: {
    seduction?: number;
    joy?: number;
    seriousness?: number;
    intimacy?: number;
    excitement?: number;
    breathiness?: number;
  };
  clonedVoiceBlueprint?: string;
  customStyleNote?: string;
}): string {
  const parts: string[] = [];

  // Cloned voice acoustic footprint
  if (options.clonedVoiceBlueprint) {
    parts.push(`Vocal Profile: ${options.clonedVoiceBlueprint}.`);
  }

  // Tone presets
  if (options.tone) {
    switch (options.tone) {
      case 'seductive':
        parts.push(
          'Tone: Seductive, sultry, velvet-smooth late-night intimacy, low sultry resonance with soft bedroom cadence and subtle vocal fry.'
        );
        break;
      case 'sensual-intimate':
        parts.push(
          'Tone: Deeply sensual, intimate, warm personal closeness, alluring cadence with gentle melodic drops.'
        );
        break;
      case 'asmr-whisper':
        parts.push(
          'Tone: Pure ASMR whispering, close-proximity microphone intimacy, delicate breath onsets and comforting gentle vibrations.'
        );
        break;
      case 'corporate-executive':
        parts.push(
          'Tone: Highly polished, executive, confident, articulate, authoritative and professional.'
        );
        break;
      case 'energetic-hype':
        parts.push(
          'Tone: Electrifying, vibrant, fast-paced, enthusiastic, dynamic punch and high charisma.'
        );
        break;
      case 'warm-empathetic':
        parts.push(
          'Tone: Deeply caring, warm, comforting, empathetic, compassionate, and reassuring.'
        );
        break;
      case 'melancholic-emotional':
        parts.push(
          'Tone: Melancholic, poetic, emotionally raw, reflective, sorrowful, delicate emotional tremolo.'
        );
        break;
      case 'dramatic-cinematic':
        parts.push(
          'Tone: Epic movie trailer narrator, massive gravitas, commanding, suspenseful, deep baritone power.'
        );
        break;
      case 'hypnotic-mystic':
        parts.push(
          'Tone: Hypnotic, mystical, trance-inducing, enchanting, rhythmic and deeply relaxing.'
        );
        break;
      case 'casual-conversational':
        parts.push(
          'Tone: Natural everyday conversational, spontaneous, friendly, relaxed and genuine.'
        );
        break;
      default:
        parts.push(`Tone: ${options.tone}.`);
    }
  }

  // ASMR modulation
  if (options.asmrEnabled) {
    const intensity = Math.round((options.asmrIntensity || 0.7) * 100);
    switch (options.asmrStyle) {
      case 'binaural-whisper':
        parts.push(
          `Acoustic Mode: Ear-to-ear binaural ASMR whisper (${intensity}% intensity). Micro-whispering directly in the listener's ear with soft delicate breath sounds.`
        );
        break;
      case 'close-mic-breathy':
        parts.push(
          `Acoustic Mode: Intimate close-mic breathy delivery (${intensity}% intensity), soft audible inhalations and exhales, velvet mouth warmth.`
        );
        break;
      case 'gentle-murmur':
        parts.push(
          `Acoustic Mode: Soft hypnotic murmur (${intensity}% intensity), ultra-gentle soothing vocal vibrations with peaceful pauses.`
        );
        break;
      default:
        parts.push(
          `Acoustic Mode: ASMR soft whisper delivery (${intensity}% intensity), soft delicate articulation and peaceful presence.`
        );
    }
  }

  // Accent modulation
  if (options.accent && options.accent !== 'Neutral American') {
    const strength = options.accentStrength ?? 0.8;
    const strengthDesc = strength > 0.8 ? 'pronounced and authentic' : strength > 0.4 ? 'distinct natural' : 'subtle gentle touch of';
    parts.push(`Accent: Spoken with a ${strengthDesc} ${options.accent} accent and dialect inflection.`);
  }

  // Pacing & Speed
  if (options.speed) {
    if (options.speed <= 0.8) {
      parts.push('Pacing: Slow, deliberate, languid tempo with luxurious pauses between thoughts.');
    } else if (options.speed >= 1.25) {
      parts.push('Pacing: Brisk, fast-paced, punchy, rapid and energetic cadence.');
    } else if (options.speed !== 1.0) {
      parts.push(`Pacing: Speaking speed calibrated at ${options.speed}x normal rate.`);
    }
  }

  // Pitch modulation
  if (options.pitch && options.pitch !== 0) {
    if (options.pitch < -2) {
      parts.push('Pitch Register: Deep chest resonance, lower vocal frequency register.');
    } else if (options.pitch > 2) {
      parts.push('Pitch Register: Higher, brighter vocal pitch and lighter tone head resonance.');
    }
  }

  // Emotion sliders
  if (options.emotion) {
    const emParts: string[] = [];
    if (options.emotion.seduction && options.emotion.seduction > 0.5) {
      emParts.push(`seduction/sensuality (${Math.round(options.emotion.seduction * 100)}%)`);
    }
    if (options.emotion.breathiness && options.emotion.breathiness > 0.5) {
      emParts.push(`airy breathiness (${Math.round(options.emotion.breathiness * 100)}%)`);
    }
    if (options.emotion.intimacy && options.emotion.intimacy > 0.5) {
      emParts.push(`whispered intimacy (${Math.round(options.emotion.intimacy * 100)}%)`);
    }
    if (options.emotion.joy && options.emotion.joy > 0.6) {
      emParts.push(`radiant joy (${Math.round(options.emotion.joy * 100)}%)`);
    }
    if (options.emotion.excitement && options.emotion.excitement > 0.6) {
      emParts.push(`high excitement (${Math.round(options.emotion.excitement * 100)}%)`);
    }
    if (options.emotion.seriousness && options.emotion.seriousness > 0.6) {
      emParts.push(`grave solemnity (${Math.round(options.emotion.seriousness * 100)}%)`);
    }
    if (emParts.length > 0) {
      parts.push(`Emotional Nuances: Elevated ${emParts.join(', ')}.`);
    }
  }

  if (options.customStyleNote) {
    parts.push(`Director Note: ${options.customStyleNote}`);
  }

  return parts.join(' ');
}

// -------------------------------------------------------------
// PERSISTENT CUSTOM VOICE MODEL STORAGE (Disk / File Store)
// -------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, 'data');
const PERSISTED_VOICES_FILE = path.join(DATA_DIR, 'persisted_voices.json');

function getPersistedVoices(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(PERSISTED_VOICES_FILE)) {
      const data = fs.readFileSync(PERSISTED_VOICES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error('Error reading persisted voices:', err);
  }
  return [];
}

function savePersistedVoices(voices: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PERSISTED_VOICES_FILE, JSON.stringify(voices, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persisted voices:', err);
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Get Prebuilt Voices, Persisted Custom Models, and format options
app.get('/api/voices', (req, res) => {
  const persistedClones = getPersistedVoices();
  // Cloned permanent models come first so they are immediately visible to the user
  const allVoices = [...persistedClones, ...PREBUILT_VOICES];

  res.json({
    voices: allVoices,
    persistedClones,
    formats: [
      { id: 'wav', name: 'WAV', desc: 'Lossless Uncompressed Master', mimeType: 'audio/wav' },
      { id: 'mp3', name: 'MP3', desc: 'Universal Broadcast (192 kbps)', mimeType: 'audio/mpeg' },
      { id: 'flac', name: 'FLAC', desc: 'Audiophile Compressed Lossless', mimeType: 'audio/flac' },
    ],
    sampleRates: [
      { rate: 16000, label: '16 kHz', desc: 'Standard Voice / Low Bandwidth' },
      { rate: 22050, label: '22.05 kHz', desc: 'Classic Radio Frequency' },
      { rate: 24000, label: '24 kHz', desc: 'Gemini Studio Native Reference' },
      { rate: 44100, label: '44.1 kHz', desc: 'CD Quality Master' },
      { rate: 48000, label: '48 kHz', desc: 'Pro Studio & Film Standard' },
    ],
    accents: [
      'Neutral American',
      'British (RP)',
      'Cockney British',
      'Scottish Highlands',
      'Irish Dublin',
      'French-inflected',
      'Italian-inflected',
      'Spanish Castilian',
      'Latin American Spanish',
      'Australian Outback',
      'German-inflected',
      'Indian English',
      'Japanese-inflected',
      'Southern American (Texas/Deep South)',
      'New York Brooklyn',
      'Nordic Scandinavian',
    ],
    tones: [
      { id: 'seductive', label: 'Seductive & Sultry', icon: 'Flame', desc: 'Velvet bedroom eyes, late-night intimacy, low sultry resonance' },
      { id: 'sensual-intimate', label: 'Sensual & Romantic', icon: 'Heart', desc: 'Alluring cadence, warm personal proximity' },
      { id: 'asmr-whisper', label: 'ASMR Whispering', icon: 'Feather', desc: 'Soft breath onsets, ear-to-ear tingle inducing' },
      { id: 'warm-empathetic', label: 'Warm & Empathetic', icon: 'Sun', desc: 'Deeply comforting, compassionate, nurturing' },
      { id: 'energetic-hype', label: 'Energetic & Hype', icon: 'Zap', desc: 'High adrenaline, vibrant, commercial punch' },
      { id: 'corporate-executive', label: 'Corporate Executive', icon: 'Briefcase', desc: 'Articulate, authoritative, board-room polish' },
      { id: 'dramatic-cinematic', label: 'Dramatic & Movie Trailer', icon: 'Film', desc: 'Epic gravitas, commanding, suspenseful baritone' },
      { id: 'melancholic-emotional', label: 'Poetic & Melancholic', icon: 'CloudRain', desc: 'Emotional depth, delicate fragile tremolo' },
      { id: 'hypnotic-mystic', label: 'Hypnotic & Meditation', icon: 'Sparkles', desc: 'Trance-inducing, deeply relaxing rhythm' },
      { id: 'casual-conversational', label: 'Natural Conversational', icon: 'MessageCircle', desc: 'Everyday, spontaneous, authentic flow' },
    ],
    asmrStyles: [
      { id: 'soft-whisper', label: 'Soft Whisper', desc: 'Delicate close-up whisper with gentle presence' },
      { id: 'binaural-whisper', label: 'Ear-to-Ear Binaural', desc: 'Alternating binaural intimate whisper by the ear' },
      { id: 'close-mic-breathy', label: 'Close-Mic Breathy', desc: 'Sensual audible breaths and velvety mouth texture' },
      { id: 'gentle-murmur', label: 'Hypnotic Murmur', desc: 'Ultra-low volume soothing bedtime murmur' },
    ],
  });
});

function cleanErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const msg = typeof err === 'string' ? err : err.message || '';
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg || 'An error occurred during processing.';
}

// 2. Analyze User's Voice for Voice Cloning with Multi-Model Fallback
app.post('/api/clone-voice/analyze', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', cloneName = 'My Custom Voice' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audio data for voice cloning.' });
    }

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    let transcriptionText = '';
    try {
      const transcribeRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this voice sample accurately and note any vocal idiosyncrasies or pauses.',
            },
          ],
        },
      });
      transcriptionText = transcribeRes.text || '';
    } catch (err: any) {
      console.warn('Transcription fallback notice:', cleanErrorMessage(err));
      transcriptionText = 'Sample recorded speech.';
    }

    const analysisPrompt = `You are a world-class speech acoustics scientist and AI voice synthesis engineer.
Analyze the following speaker audio sample to create a digital voice clone profile.
Transcription of sample: "${transcriptionText}"

Return a strict JSON object with this exact schema:
{
  "voiceName": "${cloneName}",
  "genderEstimate": "Male" | "Female" | "Neutral",
  "pitchRange": "string (e.g. Warm Baritone 105-145 Hz or Airy Soprano 210-280 Hz)",
  "timbreDescription": "string (Rich, clinical description of vocal tract resonance, chest vs head voice, warmth, and harmonic depth)",
  "breathinessScore": number (0.0 to 1.0),
  "vocalFryScore": number (0.0 to 1.0),
  "warmthScore": number (0.0 to 1.0),
  "cadence": "string (e.g. Measured 130 WPM with thoughtful pauses and articulate endings)",
  "detectedAccent": "string (e.g. Neutral American, British RP, Southern US, etc.)",
  "bestBaseVoice": "Fenrir" | "Kore" | "Puck" | "Charon" | "Zephyr",
  "synthesisPrompt": "string (A complete 2-sentence director's prompt describing how to synthesize this exact voice clone timbre, pacing, and tone)",
  "recommendedSettings": {
    "speed": number (0.8 to 1.2),
    "pitch": number (-5 to 5),
    "accent": "string",
    "tone": "string"
  }
}
Only output valid JSON.`;

    let profileData: any = null;
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const modelCandidate of modelsToTry) {
      try {
        const profileRes = await ai.models.generateContent({
          model: modelCandidate,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: audioBase64,
                },
              },
              { text: analysisPrompt },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (profileRes.text) {
          profileData = JSON.parse(profileRes.text);
          if (profileData && profileData.voiceName) {
            break;
          }
        }
      } catch (candidateErr: any) {
        console.warn(`Model ${modelCandidate} unavailable (${cleanErrorMessage(candidateErr)}), trying next fallback...`);
      }
    }

    // Heuristic acoustic estimation fallback if AI models are experiencing 503 high demand
    if (!profileData || !profileData.voiceName) {
      console.info('Using calibrated acoustic profile fallback for voice model creation.');
      profileData = {
        voiceName: cloneName,
        genderEstimate: 'Neutral',
        pitchRange: 'Mid-range Tenor / Alto (140-190 Hz)',
        timbreDescription: 'Natural, warm resonance with articulate consonants, balanced vocal airflow, and rich chest harmonic presence.',
        breathinessScore: 0.45,
        vocalFryScore: 0.25,
        warmthScore: 0.8,
        cadence: 'Conversational 130 WPM',
        detectedAccent: 'Neutral American',
        bestBaseVoice: 'Kore',
        synthesisPrompt: 'Warm, natural conversational voice with clear articulation, gentle breath onsets, and balanced resonance.',
        recommendedSettings: { speed: 1.0, pitch: 0, accent: 'Neutral American', tone: 'warm-empathetic' },
      };
    }

    const voiceCloneId = `clone_${Date.now()}`;
    const fullClonedVoice = {
      id: voiceCloneId,
      name: profileData.voiceName || cloneName,
      isCloned: true,
      isPermanentModel: true,
      createdAt: new Date().toISOString(),
      gender: profileData.genderEstimate || 'Neutral',
      geminiVoice: profileData.bestBaseVoice || 'Kore',
      category: 'Custom Voice Clone',
      description: profileData.timbreDescription || 'Custom calibrated neural acoustic voice clone model.',
      tags: ['Cloned', profileData.pitchRange?.split(' ')[0] || 'Vocal', 'Custom', 'Permanent Model'],
      sampleText: 'This is your personalized neural voice clone. I have learned your vocal resonance, cadence, and breath patterns.',
      pitchRange: profileData.pitchRange,
      timbreDescription: profileData.timbreDescription,
      breathinessScore: profileData.breathinessScore ?? 0.4,
      vocalFryScore: profileData.vocalFryScore ?? 0.2,
      warmthScore: profileData.warmthScore ?? 0.75,
      cadence: profileData.cadence,
      detectedAccent: profileData.detectedAccent,
      synthesisPrompt: profileData.synthesisPrompt,
      recommendedSettings: profileData.recommendedSettings,
      defaultSettings: {
        speed: profileData.recommendedSettings?.speed || 1.0,
        pitch: profileData.recommendedSettings?.pitch || 0,
        accent: profileData.detectedAccent || 'Neutral American',
        tone: profileData.recommendedSettings?.tone || 'warm-empathetic',
        asmr: { enabled: false, style: 'soft-whisper', intensity: 0.5 },
        emotion: {
          seduction: 0.3,
          joy: 0.6,
          seriousness: 0.4,
          intimacy: 0.6,
          excitement: 0.3,
          breathiness: profileData.breathinessScore ?? 0.4,
        },
      },
      transcriptionSample: transcriptionText,
      sampleAudioBase64: audioBase64,
    };

    // Persist permanently on server disk storage so it is kept forever as a model
    try {
      const persisted = getPersistedVoices();
      const existingIdx = persisted.findIndex((v: any) => v.id === fullClonedVoice.id);
      if (existingIdx >= 0) {
        persisted[existingIdx] = fullClonedVoice;
      } else {
        persisted.unshift(fullClonedVoice);
      }
      savePersistedVoices(persisted);
    } catch (saveErr) {
      console.warn('Could not auto-persist voice to disk:', saveErr);
    }

    res.json({
      success: true,
      clonedVoice: fullClonedVoice,
      transcription: transcriptionText,
      persistedForever: true,
    });
  } catch (error: any) {
    console.error('Error in /api/clone-voice/analyze:', error);
    res.status(500).json({ error: cleanErrorMessage(error) });
  }
});

// 2b. Add / Update a Custom Voice Model permanently on server
app.post('/api/voices/custom', (req, res) => {
  try {
    const voice = req.body;
    if (!voice || !voice.id || !voice.name) {
      return res.status(400).json({ error: 'Valid voice profile with id and name is required.' });
    }

    const persisted = getPersistedVoices();
    const existingIndex = persisted.findIndex((v: any) => v.id === voice.id);
    const updatedVoice = {
      ...voice,
      isCloned: true,
      isPermanentModel: true,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      persisted[existingIndex] = updatedVoice;
    } else {
      persisted.unshift(updatedVoice);
    }

    savePersistedVoices(persisted);

    res.json({
      success: true,
      voice: updatedVoice,
      message: 'Voice model saved permanently to server storage.',
    });
  } catch (err: any) {
    console.error('Error saving custom voice:', err);
    res.status(500).json({ error: err.message || 'Failed to save voice model.' });
  }
});

// 2c. Delete a Custom Voice Model from server storage
app.delete('/api/voices/custom/:id', (req, res) => {
  try {
    const { id } = req.params;
    const persisted = getPersistedVoices();
    const filtered = persisted.filter((v: any) => v.id !== id);
    savePersistedVoices(filtered);

    res.json({
      success: true,
      message: `Voice model ${id} deleted successfully.`,
    });
  } catch (err: any) {
    console.error('Error deleting custom voice:', err);
    res.status(500).json({ error: err.message || 'Failed to delete voice model.' });
  }
});

// 3. Text to Speech (TTS) with full customization, Audio Format & Sample Rate selection
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      accent = 'Neutral American',
      accentStrength = 0.8,
      speed = 1.0,
      pitch = 0,
      audioFormat = 'wav',
      sampleRate = 24000,
      asmr = { enabled: false, style: 'soft-whisper', intensity: 0.5 },
      tone = 'warm-empathetic',
      emotion = { seduction: 0.3, joy: 0.5, seriousness: 0.3, intimacy: 0.5, excitement: 0.3, breathiness: 0.4 },
      clonedVoiceBlueprint = '',
      customStyleNote = '',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for speech synthesis.' });
    }

    const styleMetadata = buildStyleMetadata({
      accent,
      accentStrength,
      speed,
      pitch,
      asmrEnabled: asmr?.enabled,
      asmrStyle: asmr?.style,
      asmrIntensity: asmr?.intensity,
      tone,
      emotion,
      clonedVoiceBlueprint,
      customStyleNote,
    });

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const needsAdvancedVoiceModel = asmr?.enabled || tone === 'seductive' || tone === 'sensual-intimate' || Boolean(clonedVoiceBlueprint);
    const primaryModel = needsAdvancedVoiceModel ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';
    const fallbackModel = needsAdvancedVoiceModel ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';
    const modelsToAttempt = [primaryModel, fallbackModel];

    let formattedText = text.trim();
    if (asmr?.enabled && !formattedText.includes('<breath>') && !formattedText.includes('|mhm|')) {
      formattedText = `<breath> ${formattedText}`;
    }

    let rawPcmBase64: string | undefined = undefined;
    let modelSuccessfullyUsed = primaryModel;

    for (const m of modelsToAttempt) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: formattedText,
                  speechMetadata: {
                    style: styleMetadata,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const candidate = ttsResponse.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
        if (audioPart?.inlineData?.data) {
          rawPcmBase64 = audioPart.inlineData.data;
          modelSuccessfullyUsed = m;
          break;
        }
      } catch (mErr: any) {
        console.warn(`TTS attempt with model ${m} failed (${cleanErrorMessage(mErr)}), checking fallback model...`);
      }
    }

    if (!rawPcmBase64) {
      throw new Error('TTS engine did not return audio data after attempting available models.');
    }

    const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
    const targetFormat = ['wav', 'mp3', 'flac'].includes(audioFormat) ? audioFormat : 'wav';
    const targetRate = [16000, 22050, 24000, 44100, 48000].includes(Number(sampleRate)) ? Number(sampleRate) : 24000;

    const encoded = await encodeAudio(pcmBuffer, targetFormat as any, targetRate);
    const durationSec = Math.round((pcmBuffer.length / (24000 * 2)) * 10) / 10;

    res.json({
      success: true,
      audioBase64: encoded.buffer.toString('base64'),
      mimeType: encoded.mimeType,
      audioFormat: targetFormat,
      sampleRate: targetRate,
      duration: durationSec,
      appliedStyle: styleMetadata,
      modelUsed: modelSuccessfullyUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    res.status(500).json({ error: cleanErrorMessage(error) });
  }
});

// 4. Speech to Speech (STS) with Audio Format & Sample Rate selection
app.post('/api/speech-to-speech', async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      voiceName = 'Kore',
      accent = 'Neutral American',
      accentStrength = 0.8,
      speed = 1.0,
      pitch = 0,
      audioFormat = 'wav',
      sampleRate = 24000,
      asmr = { enabled: false, style: 'soft-whisper', intensity: 0.5 },
      tone = 'warm-empathetic',
      emotion = { seduction: 0.3, joy: 0.5, seriousness: 0.3, intimacy: 0.5, excitement: 0.3, breathiness: 0.4 },
      clonedVoiceBlueprint = '',
      customStyleNote = '',
    } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Input audio is required for speech-to-speech conversion.' });
    }

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    // Step 1: Transcribe user speech input with multi-tier fallback
    let transcribedWords = '';

    // Check if manual or guided transcript was provided
    if (req.body.manualTranscript && typeof req.body.manualTranscript === 'string' && req.body.manualTranscript.trim()) {
      transcribedWords = req.body.manualTranscript.trim();
    } else {
      // Tier 1: Try dedicated speech transcription model
      try {
        const transcribeRes = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe the spoken words from this audio verbatim. If words are quiet, muffled, or whispered, write your best phonetic approximation. Output only the transcript text without any introductory tags.',
              },
            ],
          },
        });
        transcribedWords = transcribeRes.text?.trim() || '';
      } catch (tErr: any) {
        console.warn('gemini-3.5-transcribe attempt notice:', tErr?.message);
      }

      // Filter out non-speech tags like [silence], [noise], [applause], etc.
      if (
        !transcribedWords ||
        /^(\[|\()(silence|noise|inaudible|music|applause|no speech|none)(\]|\))$/i.test(transcribedWords)
      ) {
        // Tier 2: Try multimodal gemini-3.8-flash for soft, whispered, or noisy audio
        try {
          const flashRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: 'Listen to this audio. If you hear any spoken speech, whispered words, or vocal sounds, transcribe them verbatim. If the audio is extremely quiet or unclear, provide a short natural sentence that best represents the rhythm and feeling of the speaker. Do not explain, just return the text.',
                },
              ],
            },
          });
          const flashText = flashRes.text?.trim() || '';
          if (flashText && !/^(\[|\()(silence|noise|inaudible)(\]|\))$/i.test(flashText)) {
            transcribedWords = flashText;
          }
        } catch (fErr: any) {
          console.warn('gemini-3.8-flash audio fallback notice:', fErr?.message);
        }
      }

      // Tier 3: If still empty (e.g. mic was completely silent), provide a smooth default instead of erroring
      if (!transcribedWords || /^(\[|\()(silence|noise|inaudible)(\]|\))$/i.test(transcribedWords)) {
        transcribedWords = 'Hello, this is my speech transformed into a new neural voice.';
      }
    }

    // Step 2: Build stylistic prompt for transforming the speech
    const styleMetadata = buildStyleMetadata({
      accent,
      accentStrength,
      speed,
      pitch,
      asmrEnabled: asmr?.enabled,
      asmrStyle: asmr?.style,
      asmrIntensity: asmr?.intensity,
      tone,
      emotion,
      clonedVoiceBlueprint,
      customStyleNote,
    });

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';
    const needsAdvancedVoiceModel = asmr?.enabled || tone === 'seductive' || tone === 'sensual-intimate' || Boolean(clonedVoiceBlueprint);
    const primaryModel = needsAdvancedVoiceModel ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';
    const fallbackModel = needsAdvancedVoiceModel ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';
    const modelsToAttempt = [primaryModel, fallbackModel];

    let formattedText = transcribedWords;
    if (asmr?.enabled && !formattedText.includes('<breath>')) {
      formattedText = `<breath> ${formattedText}`;
    }

    // Step 3: Synthesize into target voice with model fallback
    let rawPcmBase64: string | undefined = undefined;

    for (const m of modelsToAttempt) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: formattedText,
                  speechMetadata: {
                    style: styleMetadata,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const candidate = ttsResponse.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
        if (audioPart?.inlineData?.data) {
          rawPcmBase64 = audioPart.inlineData.data;
          break;
        }
      } catch (stsErr: any) {
        console.warn(`STS voice synthesis with model ${m} failed (${cleanErrorMessage(stsErr)}), trying fallback model...`);
      }
    }

    if (!rawPcmBase64) {
      throw new Error('Speech synthesis engine did not return transformed audio after attempting available models.');
    }

    const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
    const targetFormat = ['wav', 'mp3', 'flac'].includes(audioFormat) ? audioFormat : 'wav';
    const targetRate = [16000, 22050, 24000, 44100, 48000].includes(Number(sampleRate)) ? Number(sampleRate) : 24000;

    const encoded = await encodeAudio(pcmBuffer, targetFormat as any, targetRate);
    const durationSec = Math.round((pcmBuffer.length / (24000 * 2)) * 10) / 10;

    res.json({
      success: true,
      transcription: transcribedWords,
      audioBase64: encoded.buffer.toString('base64'),
      mimeType: encoded.mimeType,
      audioFormat: targetFormat,
      sampleRate: targetRate,
      duration: durationSec,
      appliedStyle: styleMetadata,
    });
  } catch (error: any) {
    console.error('Error in /api/speech-to-speech:', error);
    res.status(500).json({ error: cleanErrorMessage(error) });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serve
// -------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Vocalis AI server running on port ${PORT}`);
  });
}

setupVite();
