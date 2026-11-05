import React, { useState } from 'react';
import {
  Flame,
  Heart,
  Feather,
  Sun,
  Zap,
  Briefcase,
  Film,
  CloudRain,
  Sparkles,
  MessageCircle,
  Sliders,
  Volume2,
  Wind,
  Headphones,
  RotateCcw,
  Gauge,
  Globe2,
  Disc3,
  FileAudio,
} from 'lucide-react';
import { ModulationSettings, ToneType, ASMRStyle, AudioFormat, SampleRate } from '../types';

interface ToneAndEmotionControlsProps {
  settings: ModulationSettings;
  onChange: (settings: ModulationSettings) => void;
  onInsertTag?: (tag: string) => void;
  compact?: boolean;
}

export const ToneAndEmotionControls: React.FC<ToneAndEmotionControlsProps> = ({
  settings,
  onChange,
  onInsertTag,
}) => {
  const [activeTab, setActiveTab] = useState<'tone' | 'asmr' | 'accent' | 'format' | 'emotion'>('tone');

  const tones: { id: ToneType; label: string; icon: any; color: string; desc: string }[] = [
    {
      id: 'seductive',
      label: 'Seductive & Sultry',
      icon: Flame,
      color: 'from-rose-500 to-red-600',
      desc: 'Velvet bedroom eyes, sultry resonance, soft vocal fry, late-night intimacy',
    },
    {
      id: 'sensual-intimate',
      label: 'Sensual & Romantic',
      icon: Heart,
      color: 'from-pink-500 to-rose-600',
      desc: 'Warm alluring cadence, emotional proximity, tender whispers',
    },
    {
      id: 'asmr-whisper',
      label: 'ASMR Whispering',
      icon: Feather,
      color: 'from-purple-500 to-indigo-600',
      desc: 'Delicate close-mic whispering, soft breath onsets, tingle-inducing',
    },
    {
      id: 'warm-empathetic',
      label: 'Warm & Empathetic',
      icon: Sun,
      color: 'from-amber-500 to-orange-600',
      desc: 'Deeply comforting, compassionate, nurturing cadence',
    },
    {
      id: 'energetic-hype',
      label: 'Energetic & Hype',
      icon: Zap,
      color: 'from-emerald-500 to-teal-600',
      desc: 'High adrenaline, vibrant, rapid and punchy delivery',
    },
    {
      id: 'corporate-executive',
      label: 'Corporate Executive',
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-600',
      desc: 'Articulate, authoritative, prestigious, crisp articulation',
    },
    {
      id: 'dramatic-cinematic',
      label: 'Dramatic & Movie Trailer',
      icon: Film,
      color: 'from-amber-600 to-red-700',
      desc: 'Epic gravitas, commanding, suspenseful cinematic baritone',
    },
    {
      id: 'melancholic-emotional',
      label: 'Poetic & Melancholic',
      icon: CloudRain,
      color: 'from-cyan-500 to-blue-600',
      desc: 'Emotional vulnerability, fragile tremolo, sorrowful beauty',
    },
    {
      id: 'hypnotic-mystic',
      label: 'Hypnotic & Mystic',
      icon: Sparkles,
      color: 'from-violet-500 to-purple-700',
      desc: 'Trance-inducing rhythm, ethereal cadence, meditative flow',
    },
    {
      id: 'casual-conversational',
      label: 'Natural Conversational',
      icon: MessageCircle,
      color: 'from-neutral-500 to-neutral-700',
      desc: 'Everyday authentic spontaneity, friendly and relaxed',
    },
  ];

  const accents = [
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
  ];

  const asmrStyles: { id: ASMRStyle; label: string; desc: string }[] = [
    {
      id: 'binaural-whisper',
      label: 'Ear-to-Ear Binaural Whisper',
      desc: 'Pans intimately between left and right ear with delicate micro-whispers',
    },
    {
      id: 'close-mic-breathy',
      label: 'Close-Mic Breathy',
      desc: 'Sensual audible breaths, soft vocal fry, velvety mouth closeness',
    },
    {
      id: 'soft-whisper',
      label: 'Soft Studio Whisper',
      desc: 'Classic gentle whisper with clean articulation and peaceful presence',
    },
    {
      id: 'gentle-murmur',
      label: 'Hypnotic Bedtime Murmur',
      desc: 'Ultra-low volume soothing murmur for deep relaxation and sleep',
    },
  ];

  const audioFormats: { id: AudioFormat; label: string; desc: string; ext: string }[] = [
    { id: 'wav', label: 'WAV', desc: 'Studio Lossless Uncompressed (Best Fidelity)', ext: '.wav' },
    { id: 'mp3', label: 'MP3', desc: 'Universal Broadcast 192 kbps (Compact & Mobile)', ext: '.mp3' },
    { id: 'flac', label: 'FLAC', desc: 'Audiophile Free Lossless Audio Codec (Compact Master)', ext: '.flac' },
  ];

  const sampleRates: { rate: SampleRate; label: string; desc: string }[] = [
    { rate: 16000, label: '16 kHz', desc: 'Speech / Low Latency' },
    { rate: 22050, label: '22.05 kHz', desc: 'Classic Radio Frequency' },
    { rate: 24000, label: '24 kHz', desc: 'Gemini Studio Native Reference' },
    { rate: 44100, label: '44.1 kHz', desc: 'CD Quality Master' },
    { rate: 48000, label: '48 kHz', desc: 'Pro Studio & Film Standard' },
  ];

  const vocalBurstTags = [
    { tag: '<breath>', label: 'Breath', desc: 'Natural audible inhalation' },
    { tag: '<whisper>', label: 'Whisper', desc: 'Transition into whisper' },
    { tag: '|mhm|', label: '|mhm|', desc: 'Affirmative backchannel' },
    { tag: '|yeah|', label: '|yeah|', desc: 'Natural agree pulse' },
    { tag: '<sigh>', label: 'Sigh', desc: 'Sensual or relaxed release' },
    { tag: '<gasp>', label: 'Gasp', desc: 'Sudden breath intake' },
    { tag: '<laugh>', label: 'Soft Laugh', desc: 'Light vocal laugh' },
  ];

  const applyTonePreset = (toneId: ToneType) => {
    let newEmotion = { ...settings.emotion };
    let newAsmr = { ...settings.asmr };
    let newSpeed = settings.speed;

    if (toneId === 'seductive') {
      newEmotion = { seduction: 0.95, breathiness: 0.8, intimacy: 0.95, joy: 0.2, seriousness: 0.4, excitement: 0.2 };
      newAsmr = { enabled: true, style: 'close-mic-breathy', intensity: 0.8 };
      newSpeed = 0.88;
    } else if (toneId === 'sensual-intimate') {
      newEmotion = { seduction: 0.85, breathiness: 0.7, intimacy: 0.9, joy: 0.3, seriousness: 0.3, excitement: 0.2 };
      newAsmr = { enabled: true, style: 'binaural-whisper', intensity: 0.75 };
      newSpeed = 0.9;
    } else if (toneId === 'asmr-whisper') {
      newEmotion = { seduction: 0.4, breathiness: 0.9, intimacy: 0.95, joy: 0.3, seriousness: 0.2, excitement: 0.1 };
      newAsmr = { enabled: true, style: 'binaural-whisper', intensity: 0.9 };
      newSpeed = 0.85;
    } else if (toneId === 'energetic-hype') {
      newEmotion = { seduction: 0.1, breathiness: 0.2, intimacy: 0.2, joy: 0.85, seriousness: 0.2, excitement: 0.95 };
      newAsmr = { enabled: false, style: 'soft-whisper', intensity: 0.3 };
      newSpeed = 1.15;
    } else if (toneId === 'corporate-executive') {
      newEmotion = { seduction: 0.2, breathiness: 0.2, intimacy: 0.3, joy: 0.4, seriousness: 0.85, excitement: 0.3 };
      newAsmr = { enabled: false, style: 'soft-whisper', intensity: 0.2 };
      newSpeed = 1.0;
    } else if (toneId === 'dramatic-cinematic') {
      newEmotion = { seduction: 0.4, breathiness: 0.3, intimacy: 0.5, joy: 0.1, seriousness: 0.95, excitement: 0.4 };
      newAsmr = { enabled: false, style: 'close-mic-breathy', intensity: 0.4 };
      newSpeed = 0.9;
    } else if (toneId === 'warm-empathetic') {
      newEmotion = { seduction: 0.2, breathiness: 0.4, intimacy: 0.75, joy: 0.65, seriousness: 0.3, excitement: 0.2 };
      newAsmr = { enabled: false, style: 'soft-whisper', intensity: 0.4 };
      newSpeed = 0.95;
    }

    onChange({
      ...settings,
      tone: toneId,
      emotion: newEmotion,
      asmr: newAsmr,
      speed: newSpeed,
    });
  };

  const resetDefaults = () => {
    onChange({
      accent: 'Neutral American',
      accentStrength: 0.8,
      speed: 1.0,
      pitch: 0,
      audioFormat: 'wav',
      sampleRate: 24000,
      asmr: {
        enabled: false,
        style: 'soft-whisper',
        intensity: 0.6,
      },
      tone: 'warm-empathetic',
      emotion: {
        seduction: 0.3,
        breathiness: 0.4,
        intimacy: 0.5,
        joy: 0.5,
        seriousness: 0.4,
        excitement: 0.3,
      },
      customStyleNote: '',
    });
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Acoustic & Modulation Shaper
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
            {settings.audioFormat.toUpperCase()} • {Math.round(settings.sampleRate / 1000)} kHz
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-lg transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-neutral-950 rounded-xl mb-5 border border-neutral-800/80 text-[11px] sm:text-xs font-medium">
        <button
          onClick={() => setActiveTab('tone')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition truncate ${
            activeTab === 'tone'
              ? 'bg-rose-500 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Tone</span>
        </button>
        <button
          onClick={() => setActiveTab('asmr')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition relative truncate ${
            activeTab === 'asmr'
              ? 'bg-purple-600 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">ASMR</span>
          {settings.asmr.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('accent')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition truncate ${
            activeTab === 'accent'
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Accent</span>
        </button>
        <button
          onClick={() => setActiveTab('format')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition truncate ${
            activeTab === 'format'
              ? 'bg-amber-600 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <FileAudio className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Format</span>
        </button>
        <button
          onClick={() => setActiveTab('emotion')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition truncate ${
            activeTab === 'emotion'
              ? 'bg-pink-600 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Emotion</span>
        </button>
      </div>

      {/* ----------------- TAB 1: TONE SETTER ----------------- */}
      {activeTab === 'tone' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Select Expressive Tone Persona</span>
            <span className="text-neutral-400">Affects vocal tract geometry & pacing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {tones.map((tone) => {
              const Icon = tone.icon;
              const isSelected = settings.tone === tone.id;
              return (
                <button
                  key={tone.id}
                  onClick={() => applyTonePreset(tone.id)}
                  className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-neutral-800/90 border-rose-500 shadow-md shadow-rose-950/30 ring-1 ring-rose-500/50'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${tone.color} text-white shrink-0 shadow-sm`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">{tone.label}</span>
                        {isSelected && (
                          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                        {tone.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Seductive Tone Depth Fine-Tuner if Seductive is active */}
          {settings.tone === 'seductive' && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-neutral-950 border border-rose-500/30 mt-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Seductive Intensity & Late-Night Vocal Fry
                </span>
                <span className="text-rose-400 font-mono font-bold">
                  {Math.round(settings.emotion.seduction * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.05"
                value={settings.emotion.seduction}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, seduction: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-rose-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
              />
              <p className="text-[11px] text-neutral-400 mt-2">
                Increases velvety chest resonance, sultry bedroom pauses, soft breath onsets, and subtle lower vocal fry.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: ASMR ENGINE (SHOW WHETHER TO ADD ASMR OR NOT) ----------------- */}
      {activeTab === 'asmr' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition ${
                  settings.asmr.enabled
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">ASMR Acoustic Mode</h4>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                      settings.asmr.enabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {settings.asmr.enabled ? 'ACTIVE: ON' : 'DISABLED: OFF'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Injects binaural whispered proximity, delicate breath sounds, and sensory tingle acoustics.
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                onChange({
                  ...settings,
                  asmr: { ...settings.asmr, enabled: !settings.asmr.enabled },
                  emotion: {
                    ...settings.emotion,
                    breathiness: !settings.asmr.enabled ? Math.max(0.7, settings.emotion.breathiness) : settings.emotion.breathiness,
                    intimacy: !settings.asmr.enabled ? Math.max(0.8, settings.emotion.intimacy) : settings.emotion.intimacy,
                  },
                })
              }
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.asmr.enabled ? 'bg-purple-600' : 'bg-neutral-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.asmr.enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.asmr.enabled ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  ASMR Style & Spatialization
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {asmrStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        onChange({
                          ...settings,
                          asmr: { ...settings.asmr, style: style.id },
                        })
                      }
                      className={`text-left p-3 rounded-xl border text-xs transition ${
                        settings.asmr.style === style.id
                          ? 'bg-purple-950/40 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-white mb-1 flex items-center justify-between">
                        <span>{style.label}</span>
                        {settings.asmr.style === style.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-normal">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-neutral-300 font-medium">ASMR Tingle & Whisper Intensity</span>
                  <span className="text-purple-400 font-mono font-bold">
                    {Math.round(settings.asmr.intensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={settings.asmr.intensity}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      asmr: { ...settings.asmr, intensity: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                  <span>Subtle Whisper</span>
                  <span>Medium Soft</span>
                  <span>Hyper-Intimate Ear-to-Ear</span>
                </div>
              </div>

              {onInsertTag && (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-300">
                      Insert Natural ASMR Vocal Bursts:
                    </span>
                    <span className="text-[10px] text-neutral-500">Click to append to text</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vocalBurstTags.map((v) => (
                      <button
                        key={v.tag}
                        onClick={() => onInsertTag(v.tag)}
                        title={v.desc}
                        className="px-2.5 py-1 text-xs font-mono bg-neutral-900 hover:bg-purple-900/40 text-purple-300 hover:text-purple-100 border border-purple-500/30 hover:border-purple-500 rounded-lg transition"
                      >
                        {v.tag} <span className="text-[10px] text-neutral-400 font-sans">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-neutral-950/60 border border-neutral-800/60 text-xs text-neutral-400">
              <p>ASMR is currently <strong className="text-neutral-300">OFF</strong>. Audio will be synthesized with standard studio acoustic clarity.</p>
              <button
                onClick={() =>
                  onChange({
                    ...settings,
                    asmr: { ...settings.asmr, enabled: true },
                  })
                }
                className="mt-3 px-4 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
              >
                Turn ASMR Mode ON
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: ACCENT & SPEED ----------------- */}
      {activeTab === 'accent' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Select Regional Dialect & Accent
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {accents.map((acc) => {
                const isSelected = settings.accent === acc;
                return (
                  <button
                    key={acc}
                    onClick={() => onChange({ ...settings, accent: acc })}
                    className={`text-left px-3 py-2 rounded-xl text-xs border transition ${
                      isSelected
                        ? 'bg-blue-950/50 border-blue-500 text-blue-200 font-semibold ring-1 ring-blue-500/40'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    {acc}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-neutral-300 font-medium">Accent Inflection Strength</span>
              <span className="text-blue-400 font-mono font-bold">
                {Math.round(settings.accentStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={settings.accentStrength}
              onChange={(e) =>
                onChange({ ...settings, accentStrength: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
              <span>Subtle (30%)</span>
              <span>Natural Dialect (70%)</span>
              <span>Strong Native (100%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  Speaking Pace / Speed
                </span>
                <span className="text-blue-400 font-mono font-bold">{settings.speed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={settings.speed}
                onChange={(e) => onChange({ ...settings, speed: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
              />
              <div className="flex justify-between gap-1 mt-2">
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange({ ...settings, speed: s })}
                    className={`px-2 py-0.5 text-[10px] rounded font-mono transition ${
                      settings.speed === s
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  Pitch Register Semitones
                </span>
                <span className="text-blue-400 font-mono font-bold">
                  {settings.pitch > 0 ? `+${settings.pitch}` : settings.pitch} st
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="1"
                value={settings.pitch}
                onChange={(e) => onChange({ ...settings, pitch: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-2 font-mono">
                <span>-5 (Deep Chest)</span>
                <span>0 (Natural)</span>
                <span>+5 (Bright Head)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: AUDIO FORMAT & SAMPLE RATE ----------------- */}
      {activeTab === 'format' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-amber-400" />
                Audio Encoding Container & Codec
              </span>
              <span className="text-[11px] text-amber-400 font-bold uppercase">
                {settings.audioFormat.toUpperCase()} Selected
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {audioFormats.map((fmt) => {
                const isSelected = settings.audioFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => onChange({ ...settings, audioFormat: fmt.id })}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{fmt.label}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{fmt.ext}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">{fmt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-amber-400" />
                Target Sample Rate (Frequency Resolution)
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                {settings.sampleRate} Hz ({Math.round(settings.sampleRate / 1000)} kHz)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sampleRates.map((sr) => {
                const isSelected = settings.sampleRate === sr.rate;
                return (
                  <button
                    key={sr.rate}
                    onClick={() => onChange({ ...settings, sampleRate: sr.rate })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white">{sr.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate">{sr.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400">
            <span className="text-neutral-200 font-semibold block mb-0.5">Studio Export Specs:</span>
            Synthesizes into <strong className="text-white">{settings.audioFormat.toUpperCase()}</strong> format at{' '}
            <strong className="text-white">{settings.sampleRate} Hz</strong>. Perfect for lossless editing, mobile streaming, or archival master storage.
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: EMOTION MODULATION & VOCAL FRY ----------------- */}
      {activeTab === 'emotion' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>Granular Psychoacoustic & Emotion Sliders</span>
            <span>0% to 100% fine blend</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-rose-300 font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Sensuality & Seduction
                </span>
                <span className="text-rose-400 font-mono font-bold">
                  {Math.round(settings.emotion.seduction * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.seduction}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, seduction: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-rose-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-purple-300 font-medium flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-purple-400" />
                  Airflow & Breathiness
                </span>
                <span className="text-purple-400 font-mono font-bold">
                  {Math.round(settings.emotion.breathiness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.breathiness}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, breathiness: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-pink-300 font-medium flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                  Intimate Proximity
                </span>
                <span className="text-pink-400 font-mono font-bold">
                  {Math.round(settings.emotion.intimacy * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.intimacy}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, intimacy: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-pink-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-amber-300 font-medium flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Joy & Warmth
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  {Math.round(settings.emotion.joy * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.joy}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, joy: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-blue-300 font-medium flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  Gravitas & Seriousness
                </span>
                <span className="text-blue-400 font-mono font-bold">
                  {Math.round(settings.emotion.seriousness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.seriousness}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, seriousness: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Energy & Excitement
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {Math.round(settings.emotion.excitement * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.emotion.excitement}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    emotion: { ...settings.emotion, excitement: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Custom Director Directive (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Speak like a mysterious late-night host leaning into the microphone under neon rain..."
              value={settings.customStyleNote || ''}
              onChange={(e) => onChange({ ...settings, customStyleNote: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
