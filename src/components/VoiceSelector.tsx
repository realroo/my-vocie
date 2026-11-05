import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  Flame,
  Feather,
  Film,
  Sun,
  User,
  Trash2,
  Play,
  Pause,
  Check,
} from 'lucide-react';
import { VoiceProfile } from '../types';

interface VoiceSelectorProps {
  voices: VoiceProfile[];
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceProfile) => void;
  onDeleteClonedVoice?: (id: string) => void;
  onAuditionVoice?: (voice: VoiceProfile) => void;
  isAuditioning?: boolean;
  auditioningVoiceId?: string | null;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  onDeleteClonedVoice,
  onAuditionVoice,
  isAuditioning = false,
  auditioningVoiceId = null,
}) => {
  const [filter, setFilter] = useState<'all' | 'cloned' | 'seductive' | 'deep' | 'warm'>('all');

  const filteredVoices = voices.filter((v) => {
    if (filter === 'cloned') return v.isCloned;
    if (filter === 'seductive') {
      return (
        v.tags?.some((t) => /seductive|sensual|asmr|whisper/i.test(t)) ||
        v.id === 'aria-velvet' ||
        v.id === 'zephyr'
      );
    }
    if (filter === 'deep') {
      return (
        v.tags?.some((t) => /deep|baritone|cinematic/i.test(t)) ||
        v.id === 'fenrir' ||
        v.id === 'dante-smoky'
      );
    }
    if (filter === 'warm') {
      return (
        v.tags?.some((t) => /warm|soothing|narrative|empathic/i.test(t)) ||
        v.id === 'kore' ||
        v.id === 'charon'
      );
    }
    return true;
  });

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Select Active Neural Voice
          </h3>
          <span className="text-xs text-neutral-400">
            ({voices.length} voices available)
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Voices' },
            { id: 'cloned', label: 'My Cloned Voices' },
            { id: 'seductive', label: 'Seductive & ASMR' },
            { id: 'deep', label: 'Deep & Cinematic' },
            { id: 'warm', label: 'Warm & Soothing' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg transition font-medium whitespace-nowrap ${
                filter === cat.id
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
        {filteredVoices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          const isPlayingThis = isAuditioning && auditioningVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice)}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-800/90 border-rose-500 shadow-md shadow-rose-950/30 ring-1 ring-rose-500/40'
                  : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50'
              }`}
            >
              {/* Top details */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-xs ${
                        voice.isCloned
                          ? 'bg-gradient-to-br from-rose-500 to-pink-600'
                          : voice.gender === 'Female'
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}
                    >
                      {voice.isCloned ? <Mic className="w-3.5 h-3.5" /> : voice.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {voice.name}
                        {voice.isCloned && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded uppercase font-semibold">
                            Custom Clone
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-neutral-400">{voice.category}</p>
                    </div>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mb-2.5">
                  {voice.description}
                </p>
              </div>

              {/* Bottom tags & Audition button */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {voice.tags?.slice(0, 2).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 text-[9px] bg-neutral-900 text-neutral-400 rounded border border-neutral-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onAuditionVoice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAuditionVoice(voice);
                      }}
                      title="Audition Voice Sample"
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                        isPlayingThis
                          ? 'bg-rose-500 text-white'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Playing</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                          <span>Audition</span>
                        </>
                      )}
                    </button>
                  )}

                  {voice.isCloned && onDeleteClonedVoice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete cloned voice "${voice.name}"?`)) {
                          onDeleteClonedVoice(voice.id);
                        }
                      }}
                      title="Delete Clone"
                      className="p-1 text-neutral-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVoices.length === 0 && (
        <div className="text-center py-8 text-neutral-400 text-xs">
          No voices match the selected category.
        </div>
      )}
    </div>
  );
};
