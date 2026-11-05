import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  RefreshCw,
  Sliders,
  Send,
  Wand2,
  BookOpen,
  Mic,
  Flame,
  Headphones,
  Check,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  FileAudio,
} from 'lucide-react';
import { VoiceProfile, ModulationSettings, GeneratedClip, AudioFormat, SampleRate } from '../types';
import { ToneAndEmotionControls } from './ToneAndEmotionControls';
import { AudioPlayerCard } from './AudioPlayerCard';
import { SAMPLE_PROMPTS } from '../utils/audio';

interface TextToSpeechStudioProps {
  voices: VoiceProfile[];
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  settings: ModulationSettings;
  onSettingsChange: (settings: ModulationSettings) => void;
  onOpenVoiceSelector: () => void;
  onAddClipToHistory: (clip: GeneratedClip) => void;
  onAuditionVoice?: (voice: VoiceProfile) => void;
  auditioningVoiceId?: string | null;
}

export const TextToSpeechStudio: React.FC<TextToSpeechStudioProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  settings,
  onSettingsChange,
  onOpenVoiceSelector,
  onAddClipToHistory,
  onAuditionVoice,
  auditioningVoiceId = null,
}) => {
  const [text, setText] = useState(
    "You know, there's something thrilling about the quiet of midnight. Lean in closer... let's see where this night takes us."
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedClip, setLastGeneratedClip] = useState<GeneratedClip | null>(null);

  // Filter for inline voice selector
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'prebuilt' | 'cloned' | 'seductive'>('prebuilt');
  const [showAllVoices, setShowAllVoices] = useState(true);

  const filteredVoices = voices.filter((v) => {
    if (voiceFilter === 'prebuilt') return !v.isCloned;
    if (voiceFilter === 'cloned') return v.isCloned;
    if (voiceFilter === 'seductive') {
      return (
        v.tags?.some((t) => /seductive|sensual|asmr|whisper/i.test(t)) ||
        v.id === 'aria-velvet' ||
        v.id === 'zephyr'
      );
    }
    return true;
  });

  const handleInsertTag = (tag: string) => {
    setText((prev) => `${prev} ${tag}`);
  };

  const handleSelectSample = (sample: (typeof SAMPLE_PROMPTS)[0]) => {
    setText(sample.text);
    if (sample.recommendedTone) {
      onSettingsChange({
        ...settings,
        tone: sample.recommendedTone as any,
        asmr: {
          ...settings.asmr,
          enabled: Boolean(sample.asmr),
        },
        accent: sample.accent || settings.accent,
      });
    }
  };

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }

    setIsSynthesizing(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceName: selectedVoice.geminiVoice,
          accent: settings.accent,
          accentStrength: settings.accentStrength,
          speed: settings.speed,
          pitch: settings.pitch,
          audioFormat: settings.audioFormat,
          sampleRate: settings.sampleRate,
          asmr: settings.asmr,
          tone: settings.tone,
          emotion: settings.emotion,
          clonedVoiceBlueprint: selectedVoice.isCloned ? selectedVoice.synthesisPrompt : undefined,
          customStyleNote: settings.customStyleNote,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize speech.');
      }

      const newClip: GeneratedClip = {
        id: `clip_${Date.now()}`,
        mode: 'tts',
        timestamp: Date.now(),
        text: text.trim(),
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav',
        audioFormat: data.audioFormat || settings.audioFormat,
        sampleRate: data.sampleRate || settings.sampleRate,
        duration: data.duration || 3.5,
        voiceName: selectedVoice.name,
        voiceId: selectedVoice.id,
        isClonedVoice: selectedVoice.isCloned,
        settings: { ...settings },
        appliedStyle: data.appliedStyle,
      };

      setLastGeneratedClip(newClip);
      onAddClipToHistory(newClip);
    } catch (err: any) {
      console.error('TTS Synthesis error:', err);
      setError(err.message || 'Speech generation encountered an issue.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- PROMINENT AI VOICE SELECTION SECTION ---------------- */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Select AI Voice (Prebuilt Library & Clones)
              </h3>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Active: {selectedVoice.name}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Choose from prebuilt studio voices (no voice cloning required) or pick your custom cloned voice.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              {[
                { id: 'prebuilt', label: 'Prebuilt AI Voices' },
                { id: 'cloned', label: `My Clones (${voices.filter((v) => v.isCloned).length})` },
                { id: 'seductive', label: 'Seductive & ASMR' },
                { id: 'all', label: 'All Voices' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setVoiceFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    voiceFilter === f.id
                      ? 'bg-rose-500 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAllVoices(!showAllVoices)}
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition"
              title={showAllVoices ? 'Collapse voice tray' : 'Expand voice tray'}
            >
              {showAllVoices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Voice Cards Grid */}
        {showAllVoices && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 pt-1">
            {filteredVoices.map((voice) => {
              const isSelected = voice.id === selectedVoice.id;
              const isAuditioning = auditioningVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left relative ${
                    isSelected
                      ? 'bg-neutral-800/90 border-rose-500 shadow-md shadow-rose-950/30 ring-1 ring-rose-500/50'
                      : 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-xs shrink-0 ${
                            voice.isCloned
                              ? 'bg-gradient-to-br from-rose-500 to-pink-600'
                              : voice.gender === 'Female'
                              ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}
                        >
                          {voice.isCloned ? <Mic className="w-3.5 h-3.5" /> : voice.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                            {voice.name}
                            {voice.isCloned && (
                              <span className="px-1 py-0.2 text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded uppercase">
                                Clone
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-neutral-400 block truncate">
                            {voice.category}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-tight mb-2">
                      {voice.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/80">
                    <span className="text-[10px] font-mono text-neutral-500">
                      Anchor: {voice.geminiVoice}
                    </span>

                    {onAuditionVoice && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAuditionVoice(voice);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                          isAuditioning
                            ? 'bg-rose-500 text-white'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                        }`}
                      >
                        {isAuditioning ? (
                          <>
                            <Pause className="w-2.5 h-2.5 fill-current" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            <span>Audition</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Left Script & Synthesis (7 cols) | Right Acoustic Controls (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Text Area Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-400" />
                Script to Synthesize
              </label>
              <div className="flex items-center gap-2">
                {/* Audio format quick pills */}
                <div className="flex items-center gap-1 text-[11px] font-mono bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800 text-neutral-400">
                  <span className="text-amber-400 font-bold uppercase">{settings.audioFormat}</span>
                  <span>•</span>
                  <span>{Math.round(settings.sampleRate / 1000)} kHz</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">
                  {text.length} chars
                </span>
              </div>
            </div>

            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your script here... Use <breath> or |mhm| for realistic ASMR and conversational inflection."
              className="w-full p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition resize-y font-sans leading-relaxed"
            />

            {/* Quick Sample Prompts Carousel */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Try Curated Sample Scripts:</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {SAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSample(prompt)}
                    className="px-2.5 py-1 text-xs bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg whitespace-nowrap transition flex items-center gap-1 shrink-0"
                  >
                    <span>{prompt.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal burst insert bar */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-400">Insert vocal burst:</span>
              {['<breath>', '<whisper>', '<sigh>', '<laugh>', '<gasp>', '|mhm|', '|yeah|'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2 py-0.5 text-[11px] font-mono bg-neutral-950 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 border border-neutral-800 hover:border-rose-500/30 rounded transition"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Audio Format & Sample Rate Selection Bar */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                  Audio Format & Sample Rate Output:
                </span>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                  {settings.audioFormat.toUpperCase()} • {Math.round(settings.sampleRate / 1000)} kHz
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Format buttons */}
                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  {(['wav', 'mp3', 'flac'] as AudioFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, audioFormat: fmt })}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition uppercase flex items-center justify-center gap-1 ${
                        settings.audioFormat === fmt
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>{fmt}</span>
                      <span className="text-[9px] font-normal lowercase opacity-80">
                        {fmt === 'wav' ? 'pcm' : fmt === 'mp3' ? '192k' : 'lossless'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Sample Rate selection buttons */}
                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  {([16000, 22050, 24000, 44100, 48000] as SampleRate[]).map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, sampleRate: rate })}
                      className={`flex-1 py-1.5 text-[11px] font-mono font-medium rounded-lg transition ${
                        settings.sampleRate === rate
                          ? 'bg-neutral-800 text-amber-300 font-bold border border-amber-500/40'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title={`${rate} Hz`}
                    >
                      {rate === 16000 ? '16k' : rate === 22050 ? '22k' : rate === 24000 ? '24k' : rate === 44100 ? '44k' : '48k'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Synthesize Button */}
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !text.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-rose-950/40 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {settings.audioFormat.toUpperCase()} ({settings.sampleRate} Hz)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Synthesize {settings.audioFormat.toUpperCase()} Audio ({selectedVoice.name})
                  </span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Generated Result Card */}
          {lastGeneratedClip && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-rose-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Latest Synthesized Master ({lastGeneratedClip.audioFormat.toUpperCase()})
                </span>
                <span>{new Date(lastGeneratedClip.timestamp).toLocaleTimeString()}</span>
              </div>
              <AudioPlayerCard
                audioBase64={lastGeneratedClip.audioBase64}
                title={`${lastGeneratedClip.voiceName} - ${settings.tone}`}
                subtitle={`Accent: ${settings.accent} • Speed: ${settings.speed}x • ASMR: ${
                  settings.asmr.enabled ? 'ON' : 'OFF'
                }`}
                transcription={lastGeneratedClip.text}
                duration={lastGeneratedClip.duration}
                mimeType={lastGeneratedClip.mimeType}
                audioFormat={lastGeneratedClip.audioFormat}
                sampleRate={lastGeneratedClip.sampleRate}
                tags={[
                  lastGeneratedClip.isClonedVoice ? 'Cloned Voice' : 'AI Voice',
                  settings.tone,
                  settings.asmr.enabled ? 'ASMR Whisper' : 'Studio',
                ]}
                appliedStyle={lastGeneratedClip.appliedStyle}
                accentColor="rose"
              />
            </div>
          )}
        </div>

        {/* Right Column: Acoustic Controls (5 cols) */}
        <div className="lg:col-span-5">
          <ToneAndEmotionControls
            settings={settings}
            onChange={onSettingsChange}
            onInsertTag={handleInsertTag}
          />
        </div>
      </div>
    </div>
  );
};
