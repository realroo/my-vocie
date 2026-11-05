import React, { useState } from 'react';
import {
  Library,
  Mic,
  Volume2,
  Sparkles,
  Flame,
  Play,
  Pause,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { VoiceProfile } from '../types';

interface VoiceLibraryViewProps {
  voices: VoiceProfile[];
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceProfile) => void;
  onDeleteClonedVoice?: (id: string) => void;
  onAuditionVoice: (voice: VoiceProfile) => void;
  auditioningVoiceId: string | null;
  onNavigateToClone: () => void;
  onNavigateToTTS: (voice: VoiceProfile) => void;
  onNavigateToSTS: (voice: VoiceProfile) => void;
}

export const VoiceLibraryView: React.FC<VoiceLibraryViewProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  onDeleteClonedVoice,
  onAuditionVoice,
  auditioningVoiceId,
  onNavigateToClone,
  onNavigateToTTS,
  onNavigateToSTS,
}) => {
  const [filter, setFilter] = useState<'all' | 'cloned' | 'prebuilt' | 'seductive'>('all');

  const filteredVoices = voices.filter((v) => {
    if (filter === 'cloned') return v.isCloned;
    if (filter === 'prebuilt') return !v.isCloned;
    if (filter === 'seductive') {
      return (
        v.tags?.some((t) => /seductive|sensual|asmr|whisper/i.test(t)) ||
        v.id === 'aria-velvet' ||
        v.id === 'zephyr'
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Library className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Acoustic Voice Library & Neural Models
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Browse calibrated prebuilt AI voices, seductive personas, ASMR whisper specialists, and your custom cloned voices.
          </p>
        </div>

        <button
          onClick={onNavigateToClone}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Clone a New Voice</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        {[
          { id: 'all', label: `All Voices (${voices.length})` },
          {
            id: 'cloned',
            label: `My Voice Clones (${voices.filter((v) => v.isCloned).length})`,
          },
          {
            id: 'prebuilt',
            label: `Prebuilt AI Library (${voices.filter((v) => !v.isCloned).length})`,
          },
          { id: 'seductive', label: 'Seductive & ASMR Voices' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === tab.id
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVoices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          const isAuditioning = auditioningVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
                isSelected
                  ? 'bg-neutral-850/90 border-rose-500 shadow-xl shadow-rose-950/20 ring-1 ring-rose-500/40'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
              }`}
            >
              <div>
                {/* Top Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl text-white font-bold text-sm shadow-md ${
                        voice.isCloned
                          ? 'bg-gradient-to-br from-rose-500 to-pink-600'
                          : voice.gender === 'Female'
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}
                    >
                      {voice.isCloned ? <Mic className="w-5 h-5" /> : voice.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{voice.name}</h3>
                        {voice.isCloned && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded uppercase font-bold flex items-center gap-1">
                            <span>Cloned</span>
                            <span className="text-[8px] text-pink-300">• Saved Forever</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400">{voice.category}</p>
                    </div>
                  </div>

                  {/* Audition Button */}
                  <button
                    onClick={() => onAuditionVoice(voice)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      isAuditioning
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-950/40'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {isAuditioning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Playing</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        <span>Audition</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  {voice.description}
                </p>

                {/* Acoustic traits */}
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-[11px] space-y-1.5 mb-3 font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Base Engine Anchor:</span>
                    <span className="text-neutral-200">{voice.geminiVoice}</span>
                  </div>
                  {voice.pitchRange && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Pitch Register:</span>
                      <span className="text-neutral-200">{voice.pitchRange}</span>
                    </div>
                  )}
                  {voice.detectedAccent && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Native Accent:</span>
                      <span className="text-neutral-200">{voice.detectedAccent}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {voice.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] bg-neutral-950 text-neutral-400 rounded-md border border-neutral-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onSelectVoice(voice);
                      onNavigateToTTS(voice);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition"
                  >
                    Use in TTS
                  </button>
                  <button
                    onClick={() => {
                      onSelectVoice(voice);
                      onNavigateToSTS(voice);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition"
                  >
                    Use in STS
                  </button>
                </div>

                {voice.isCloned && onDeleteClonedVoice && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete clone "${voice.name}"?`)) {
                        onDeleteClonedVoice(voice.id);
                      }
                    }}
                    title="Delete Cloned Voice"
                    className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
