import React from 'react';
import { History, Sparkles, Trash2, Volume2, Radio, Download } from 'lucide-react';
import { GeneratedClip } from '../types';
import { AudioPlayerCard } from './AudioPlayerCard';

interface HistoryReelProps {
  clips: GeneratedClip[];
  onClearHistory: () => void;
  onDeleteClip: (id: string) => void;
  onNavigateToTTS: () => void;
}

export const HistoryReel: React.FC<HistoryReelProps> = ({
  clips,
  onClearHistory,
  onDeleteClip,
  onNavigateToTTS,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Studio Session Reel</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Archive of your synthesized speech clips, voice transformations, and acoustic master files.
          </p>
        </div>

        {clips.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all session clips from history?')) {
                onClearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-red-400 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Reel</span>
          </button>
        )}
      </div>

      {/* Clips List */}
      {clips.length > 0 ? (
        <div className="space-y-4">
          {clips.map((clip) => (
            <div key={clip.id} className="relative group">
              <AudioPlayerCard
                audioBase64={clip.audioBase64}
                title={`${clip.voiceName} • ${clip.mode === 'sts' ? 'Speech-to-Speech' : 'Text-to-Speech'}`}
                subtitle={`Accent: ${clip.settings.accent} • Speed: ${clip.settings.speed}x • Tone: ${
                  clip.settings.tone
                } • ASMR: ${clip.settings.asmr.enabled ? 'ON' : 'OFF'}`}
                transcription={clip.text}
                duration={clip.duration}
                mimeType={clip.mimeType}
                audioFormat={clip.audioFormat}
                sampleRate={clip.sampleRate}
                tags={[
                  clip.mode === 'sts' ? 'Speech to Speech' : 'Text to Speech',
                  clip.isClonedVoice ? 'Cloned Voice' : 'AI Voice',
                  clip.settings.tone,
                  clip.settings.asmr.enabled ? 'ASMR Whisper' : 'Studio',
                ]}
                appliedStyle={clip.appliedStyle}
                accentColor={clip.mode === 'sts' ? 'emerald' : 'rose'}
              />

              <button
                onClick={() => onDeleteClip(clip.id)}
                title="Delete from reel"
                className="absolute top-5 right-24 p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded-lg hover:bg-neutral-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
          <Volume2 className="w-10 h-10 mx-auto text-neutral-700" />
          <h3 className="text-sm font-semibold text-neutral-300">No session recordings yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Generate speech using Text-to-Speech or transform your speech in Speech-to-Speech to start building your session reel.
          </p>
          <button
            onClick={onNavigateToTTS}
            className="mt-2 px-4 py-2 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition"
          >
            Go to Text to Speech
          </button>
        </div>
      )}
    </div>
  );
};
