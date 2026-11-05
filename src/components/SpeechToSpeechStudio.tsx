import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Radio,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Volume2,
  Wand2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Repeat,
  Check,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  FileAudio,
  Plus,
  Database,
  Save,
  X,
} from 'lucide-react';
import { VoiceProfile, ModulationSettings, GeneratedClip, AudioFormat, SampleRate } from '../types';
import { ToneAndEmotionControls } from './ToneAndEmotionControls';
import { AudioPlayerCard } from './AudioPlayerCard';
import { MicRecorder, fileToBase64, VOICE_RECORDING_SCRIPTS } from '../utils/audio';

function cleanDisplayError(err: any): string {
  if (!err) return 'An error occurred during operation.';
  const msg = typeof err === 'string' ? err : err.message || '';
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg || 'An error occurred during operation.';
}

interface SpeechToSpeechStudioProps {
  voices: VoiceProfile[];
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  settings: ModulationSettings;
  onSettingsChange: (settings: ModulationSettings) => void;
  onOpenVoiceSelector: () => void;
  onAddClipToHistory: (clip: GeneratedClip) => void;
  onAuditionVoice?: (voice: VoiceProfile) => void;
  auditioningVoiceId?: string | null;
  onSaveClone?: (clone: VoiceProfile) => void;
  onNavigateToClone?: () => void;
}

export const SpeechToSpeechStudio: React.FC<SpeechToSpeechStudioProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  settings,
  onSettingsChange,
  onOpenVoiceSelector,
  onAddClipToHistory,
  onAuditionVoice,
  auditioningVoiceId = null,
  onSaveClone,
  onNavigateToClone,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [sourceAudio, setSourceAudio] = useState<{
    base64: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [convertedClip, setConvertedClip] = useState<GeneratedClip | null>(null);
  const [guidedText, setGuidedText] = useState('');

  // Filter for inline voice selector
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'prebuilt' | 'cloned' | 'seductive'>('prebuilt');
  const [showAllVoices, setShowAllVoices] = useState(true);

  // In-STS direct voice cloning state
  const [isCloningFromSource, setIsCloningFromSource] = useState(false);
  const [cloneModelName, setCloneModelName] = useState('My Voice Clone Model');
  const [clonedSuccessMessage, setClonedSuccessMessage] = useState<string | null>(null);
  const [showQuickCloneModal, setShowQuickCloneModal] = useState(false);

  // Quick Clone Modal internal states
  const [modalIsRecording, setModalIsRecording] = useState(false);
  const [modalRecordSeconds, setModalRecordSeconds] = useState(0);
  const [modalVolume, setModalVolume] = useState(0);
  const [modalAudio, setModalAudio] = useState<{
    base64: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);
  const [modalScriptIdx, setModalScriptIdx] = useState(0);
  const [modalModelName, setModalModelName] = useState('My Custom Voice Model');
  const [isModalCloning, setIsModalCloning] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const recorderRef = useRef<MicRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modalRecorderRef = useRef<MicRecorder | null>(null);
  const modalTimerRef = useRef<number | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (modalIsRecording) {
      setModalRecordSeconds(0);
      modalTimerRef.current = window.setInterval(() => {
        setModalRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    }
    return () => {
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    };
  }, [modalIsRecording]);

  // Clone from already captured speech in Step 1
  const handleCloneFromSourceAudio = async () => {
    if (!sourceAudio || !onSaveClone) return;
    setIsCloningFromSource(true);
    setClonedSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/clone-voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: sourceAudio.base64,
          mimeType: sourceAudio.mimeType,
          cloneName: cloneModelName.trim() || 'My Voice Clone Model',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Acoustic timbre analysis failed.');
      }

      const clone: VoiceProfile = {
        id: data.clonedVoice.id,
        name: data.clonedVoice.name,
        gender: data.clonedVoice.gender,
        geminiVoice: data.clonedVoice.geminiVoice,
        category: 'Custom Voice Clone',
        description: data.clonedVoice.timbreDescription || 'Custom cloned acoustic profile.',
        tags: ['Cloned', data.clonedVoice.pitchRange?.split(' ')[0] || 'Vocal', 'Custom', 'Permanent Model'],
        sampleText: 'This is your personalized neural voice clone model.',
        isCloned: true,
        isPermanentModel: true,
        createdAt: data.clonedVoice.createdAt,
        pitchRange: data.clonedVoice.pitchRange,
        timbreDescription: data.clonedVoice.timbreDescription,
        breathinessScore: data.clonedVoice.breathinessScore,
        vocalFryScore: data.clonedVoice.vocalFryScore,
        warmthScore: data.clonedVoice.warmthScore,
        cadence: data.clonedVoice.cadence,
        detectedAccent: data.clonedVoice.detectedAccent,
        synthesisPrompt: data.clonedVoice.synthesisPrompt,
        sampleAudioBase64: sourceAudio.base64,
        defaultSettings: {
          speed: data.clonedVoice.recommendedSettings?.speed || 1.0,
          pitch: data.clonedVoice.recommendedSettings?.pitch || 0,
          accent: data.clonedVoice.detectedAccent || 'Neutral American',
          tone: data.clonedVoice.recommendedSettings?.tone || 'warm-empathetic',
          asmr: { enabled: false, style: 'soft-whisper', intensity: 0.5 },
          emotion: {
            seduction: 0.3,
            joy: 0.6,
            seriousness: 0.4,
            intimacy: 0.6,
            excitement: 0.3,
            breathiness: data.clonedVoice.breathinessScore || 0.4,
          },
        },
      };

      onSaveClone(clone);
      onSelectVoice(clone);
      setVoiceFilter('cloned');
      setClonedSuccessMessage(`"${clone.name}" has been permanently saved as a model and set as your active Target Voice!`);
    } catch (err: any) {
      console.error('STS Clone error:', err);
      setError(cleanDisplayError(err));
    } finally {
      setIsCloningFromSource(false);
    }
  };

  // Quick Modal Recording Handlers
  const handleModalStartRecording = async () => {
    try {
      setModalError(null);
      modalRecorderRef.current = new MicRecorder();
      await modalRecorderRef.current.start((vol) => setModalVolume(vol));
      setModalIsRecording(true);
    } catch (err: any) {
      console.error('Modal mic access error:', err);
      setModalError('Microphone permission denied or device unavailable.');
    }
  };

  const handleModalStopRecording = async () => {
    if (!modalRecorderRef.current) return;
    try {
      setModalIsRecording(false);
      const res = await modalRecorderRef.current.stop();
      const blobUrl = URL.createObjectURL(res.blob);
      setModalAudio({ base64: res.base64, mimeType: res.mimeType, blobUrl });
    } catch (err: any) {
      console.error('Modal stop recording error:', err);
      setModalError('Failed to capture audio from microphone.');
    }
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setModalError(null);
      const { base64, mimeType } = await fileToBase64(file);
      const blobUrl = URL.createObjectURL(file);
      setModalAudio({ base64, mimeType, blobUrl });
    } catch (err: any) {
      console.error('Modal upload error:', err);
      setModalError('Could not process selected audio file.');
    }
  };

  const handleModalAnalyzeAndSave = async () => {
    if (!modalAudio || !onSaveClone) return;
    setIsModalCloning(true);
    setModalError(null);

    try {
      const response = await fetch('/api/clone-voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: modalAudio.base64,
          mimeType: modalAudio.mimeType,
          cloneName: modalModelName.trim() || 'My Studio Voice Model',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Acoustic timbre analysis failed.');
      }

      const clone: VoiceProfile = {
        id: data.clonedVoice.id,
        name: data.clonedVoice.name,
        gender: data.clonedVoice.gender,
        geminiVoice: data.clonedVoice.geminiVoice,
        category: 'Custom Voice Clone',
        description: data.clonedVoice.timbreDescription || 'Custom cloned acoustic profile.',
        tags: ['Cloned', data.clonedVoice.pitchRange?.split(' ')[0] || 'Vocal', 'Custom', 'Permanent Model'],
        sampleText: 'This is your personalized neural voice clone model.',
        isCloned: true,
        isPermanentModel: true,
        createdAt: data.clonedVoice.createdAt,
        pitchRange: data.clonedVoice.pitchRange,
        timbreDescription: data.clonedVoice.timbreDescription,
        breathinessScore: data.clonedVoice.breathinessScore,
        vocalFryScore: data.clonedVoice.vocalFryScore,
        warmthScore: data.clonedVoice.warmthScore,
        cadence: data.clonedVoice.cadence,
        detectedAccent: data.clonedVoice.detectedAccent,
        synthesisPrompt: data.clonedVoice.synthesisPrompt,
        sampleAudioBase64: modalAudio.base64,
        defaultSettings: {
          speed: data.clonedVoice.recommendedSettings?.speed || 1.0,
          pitch: data.clonedVoice.recommendedSettings?.pitch || 0,
          accent: data.clonedVoice.detectedAccent || 'Neutral American',
          tone: data.clonedVoice.recommendedSettings?.tone || 'warm-empathetic',
          asmr: { enabled: false, style: 'soft-whisper', intensity: 0.5 },
          emotion: {
            seduction: 0.3,
            joy: 0.6,
            seriousness: 0.4,
            intimacy: 0.6,
            excitement: 0.3,
            breathiness: data.clonedVoice.breathinessScore || 0.4,
          },
        },
      };

      onSaveClone(clone);
      onSelectVoice(clone);
      setVoiceFilter('cloned');
      setShowQuickCloneModal(false);
      setModalAudio(null);
      setClonedSuccessMessage(`"${clone.name}" has been permanently added to your models and selected as active Target Voice!`);
    } catch (err: any) {
      console.error('Modal clone error:', err);
      setModalError(cleanDisplayError(err));
    } finally {
      setIsModalCloning(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

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

  const handleStartRecording = async () => {
    try {
      setError(null);
      setConvertedClip(null);
      setTranscription(null);
      recorderRef.current = new MicRecorder();
      await recorderRef.current.start((vol) => {
        setVolumeLevel(vol);
      });
      setIsRecording(true);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setError(
        err?.message?.includes('Permission')
          ? 'Microphone permission denied. Please allow mic access.'
          : 'Could not access microphone.'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    try {
      setIsRecording(false);
      const result = await recorderRef.current.stop();
      const blobUrl = URL.createObjectURL(result.blob);
      setSourceAudio({
        base64: result.base64,
        mimeType: result.mimeType,
        blobUrl,
      });
    } catch (err: any) {
      console.error('Stop recording error:', err);
      setError('Failed to capture speech recording.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setConvertedClip(null);
      setTranscription(null);
      const { base64, mimeType } = await fileToBase64(file);
      const blobUrl = URL.createObjectURL(file);
      setSourceAudio({
        base64,
        mimeType,
        blobUrl,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      setError('Could not process the selected audio file.');
    }
  };

  const handleConvertSpeech = async () => {
    if (!sourceAudio) {
      setError('Please record or upload your speech first.');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const response = await fetch('/api/speech-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: sourceAudio.base64,
          mimeType: sourceAudio.mimeType,
          manualTranscript: guidedText.trim() || undefined,
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
        throw new Error(data.error || 'Speech-to-speech transformation failed.');
      }

      setTranscription(data.transcription);

      const newClip: GeneratedClip = {
        id: `sts_${Date.now()}`,
        mode: 'sts',
        timestamp: Date.now(),
        text: data.transcription,
        originalAudioBase64: sourceAudio.base64,
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

      setConvertedClip(newClip);
      onAddClipToHistory(newClip);
    } catch (err: any) {
      console.error('STS Conversion error:', err);
      setError(cleanDisplayError(err));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl bg-gradient-to-r from-neutral-900 via-emerald-950/20 to-neutral-900 border border-neutral-800 p-6">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 w-fit">
          <Radio className="w-3.5 h-3.5" />
          <span>Neural Speech-to-Speech Transformation</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Speak in Your Voice → Transform with Clones, Accents & ASMR
        </h2>
        <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
          Record yourself speaking naturally in your own voice. Vocalis AI will transcribe your words,
          re-synthesize them in your selected Target Voice (such as your cloned voice or a prebuilt persona),
          and apply your chosen accent, seductive tone, and ASMR whispers.
        </p>
      </div>

      {/* ---------------- PROMINENT TARGET AI VOICE SELECTOR SECTION ---------------- */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Select Target AI Voice (Prebuilt Library & Clones)
              </h3>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Active Target: {selectedVoice.name}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select which AI voice your speech will be converted into. Choose a prebuilt voice or your own voice clone.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {onSaveClone && (
              <button
                type="button"
                onClick={() => setShowQuickCloneModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition hover:scale-105 active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Clone My Voice</span>
              </button>
            )}

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
                      ? 'bg-neutral-800/90 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/50'
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
                              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
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
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shrink-0">
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
                            ? 'bg-emerald-600 text-white'
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

      {/* Main Grid: Left Source Audio & Output | Right Acoustic Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Source Audio Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400" />
                Step 1: Input Your Spoken Speech
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] font-mono bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800 text-neutral-400">
                  <span className="text-amber-400 font-bold uppercase">{settings.audioFormat}</span>
                  <span>•</span>
                  <span>{Math.round(settings.sampleRate / 1000)} kHz</span>
                </div>
                {sourceAudio && (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Speech Ready
                  </span>
                )}
              </div>
            </div>

            {/* Recording / Uploading Box */}
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              {isRecording ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-500 opacity-30"></span>
                      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-950/50">
                        <Mic className="w-8 h-8" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-mono font-bold text-white tracking-wider">
                      00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </div>
                    <p className="text-xs text-emerald-400 animate-pulse mt-1 font-medium">
                      Recording your voice in real-time...
                    </p>
                  </div>

                  {/* VU Meter */}
                  <div className="max-w-xs mx-auto">
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(5, volumeLevel * 100))}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-950/50 transition hover:scale-105 active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Done Speaking</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleStartRecording}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition hover:scale-105 active:scale-95 w-full sm:w-auto"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Record Speech</span>
                    </button>

                    <span className="text-xs text-neutral-500 uppercase font-bold">OR</span>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-sm font-semibold transition w-full sm:w-auto"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Speech File</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Speak any sentence in your normal voice (e.g. telling a story or reading a line).
                  </p>
                </div>
              )}
            </div>

            {/* Audio Preview of Source */}
            {sourceAudio && !isRecording && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-300">Original Voice Recording</span>
                  <button
                    onClick={() => {
                      setSourceAudio(null);
                      setGuidedText('');
                    }}
                    className="text-neutral-500 hover:text-red-400 transition"
                  >
                    Clear & Re-record
                  </button>
                </div>
                {sourceAudio.blobUrl && (
                  <audio controls src={sourceAudio.blobUrl} className="w-full h-8 rounded-lg" />
                )}

                <div className="pt-2 border-t border-neutral-900">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Speech Script / Guidance (Optional):</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {guidedText ? 'Guided' : 'Auto-Transcribe'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={guidedText}
                    onChange={(e) => setGuidedText(e.target.value)}
                    placeholder="Leave blank for automatic speech detection, or type words if audio was quiet or whispered..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Direct Clone My Voice Feature in Speech-to-Speech */}
                {onSaveClone && (
                  <div className="pt-2.5 border-t border-neutral-900">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/40 via-neutral-900/80 to-rose-950/20 border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                          <span>Clone this Recording as a Permanent Voice Model</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Database className="w-2.5 h-2.5" />
                          Stored Forever
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        Turn your spoken audio into a reusable AI Voice Model saved forever in your library.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
                        <input
                          type="text"
                          value={cloneModelName}
                          onChange={(e) => setCloneModelName(e.target.value)}
                          placeholder="Model Name (e.g. My STS Voice Model)"
                          className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          disabled={isCloningFromSource}
                          onClick={handleCloneFromSourceAudio}
                          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {isCloningFromSource ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Analyzing & Saving Model...</span>
                            </>
                          ) : (
                            <>
                              <Database className="w-3.5 h-3.5" />
                              <span>Save as Permanent Model</span>
                            </>
                          )}
                        </button>
                      </div>

                      {clonedSuccessMessage && (
                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{clonedSuccessMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Format & Sample Rate Selection Bar */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                  Target Audio Format & Sample Rate:
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

            {/* Transform Button */}
            <button
              onClick={handleConvertSpeech}
              disabled={isConverting || !sourceAudio || isRecording}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {settings.audioFormat.toUpperCase()} ({settings.sampleRate} Hz)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Transform Speech to {selectedVoice.name} ({settings.audioFormat.toUpperCase()})
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

          {/* Side-by-Side Comparison if Converted */}
          {convertedClip && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Transformation Complete ({convertedClip.audioFormat.toUpperCase()})
                </h4>
                <p className="text-xs text-neutral-300">
                  Transcribed: <span className="italic text-white">"{convertedClip.text}"</span>
                </p>
              </div>

              {/* Transformed Audio Player */}
              <AudioPlayerCard
                audioBase64={convertedClip.audioBase64}
                title={`${convertedClip.voiceName} (Transformed)`}
                subtitle={`Target Voice with ${settings.accent} Accent • ${settings.tone} Tone • ASMR: ${
                  settings.asmr.enabled ? 'ON' : 'OFF'
                }`}
                transcription={convertedClip.text}
                duration={convertedClip.duration}
                mimeType={convertedClip.mimeType}
                audioFormat={convertedClip.audioFormat}
                sampleRate={convertedClip.sampleRate}
                tags={[
                  convertedClip.isClonedVoice ? 'Cloned Voice' : 'Target Voice',
                  settings.accent,
                  settings.tone,
                  settings.asmr.enabled ? 'ASMR' : 'Standard',
                ]}
                appliedStyle={convertedClip.appliedStyle}
                accentColor="emerald"
              />
            </div>
          )}
        </div>

        {/* Right Column: Acoustic Shaper Controls (5 cols) */}
        <div className="lg:col-span-5">
          <ToneAndEmotionControls settings={settings} onChange={onSettingsChange} />
        </div>
      </div>

      {/* ---------------- IN-STS QUICK VOICE CLONE MODAL ---------------- */}
      {showQuickCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Clone Voice & Save Forever
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      Permanent Model
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Create an AI voice model calibrated to your vocal resonance and airflow.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickCloneModal(false);
                  setModalError(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If source audio from STS is already recorded, give option to use it directly! */}
            {sourceAudio && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-neutral-200 block">Use Current Speech Recording:</span>
                  <p className="text-[11px] text-neutral-400 truncate">
                    You already recorded speech in Step 1. You can clone it instantly!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalAudio({ base64: sourceAudio.base64, mimeType: sourceAudio.mimeType, blobUrl: sourceAudio.blobUrl });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition shrink-0"
                >
                  Load Current Audio
                </button>
              </div>
            )}

            {/* Model Name Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Voice Model Name
              </label>
              <input
                type="text"
                value={modalModelName}
                onChange={(e) => setModalModelName(e.target.value)}
                placeholder="e.g. My Persona Model"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {/* Script to read */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  Guide Reading Script:
                </span>
                <div className="flex gap-1 text-[10px]">
                  {VOICE_RECORDING_SCRIPTS.slice(0, 3).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModalScriptIdx(idx)}
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        modalScriptIdx === idx ? 'bg-rose-500 text-white font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-neutral-300 italic bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80 leading-relaxed">
                "{VOICE_RECORDING_SCRIPTS[modalScriptIdx]}"
              </p>
            </div>

            {/* Live Recorder in Modal */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              {modalIsRecording ? (
                <div className="space-y-3">
                  <div className="text-xl font-mono font-bold text-white tracking-wider">
                    00:{modalRecordSeconds < 10 ? `0${modalRecordSeconds}` : modalRecordSeconds}
                  </div>
                  <p className="text-xs text-rose-400 animate-pulse font-medium">
                    Listening to voice resonance and airflow...
                  </p>
                  <div className="max-w-xs mx-auto">
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(5, modalVolume * 100))}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleModalStopRecording}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Done Recording</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleModalStartRecording}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition w-full sm:w-auto"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Record Voice Sample</span>
                    </button>
                    <span className="text-xs text-neutral-500 uppercase font-bold">OR</span>
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition w-full sm:w-auto"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Audio File</span>
                    </button>
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleModalFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    10-30 seconds of clean speech recommended for highest clone fidelity.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Captured Audio Preview & Submit */}
            {modalAudio && !modalIsRecording && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Voice Audio Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalAudio(null)}
                    className="text-neutral-500 hover:text-red-400 transition"
                  >
                    Clear & Re-record
                  </button>
                </div>
                {modalAudio.blobUrl && (
                  <audio controls src={modalAudio.blobUrl} className="w-full h-8 rounded-lg" />
                )}

                <button
                  type="button"
                  disabled={isModalCloning}
                  onClick={handleModalAnalyzeAndSave}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
                >
                  {isModalCloning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Acoustics & Saving Model Forever...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Analyze & Save Model Forever to Library</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {modalError && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
                {modalError}
              </div>
            )}

            {/* Switch to Full Studio footer link */}
            {onNavigateToClone && (
              <div className="pt-2 border-t border-neutral-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCloneModal(false);
                    onNavigateToClone();
                  }}
                  className="text-xs text-neutral-400 hover:text-rose-400 transition underline underline-offset-4"
                >
                  Need full acoustic formant charts & advanced calibration? Open Voice Clone Studio →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
