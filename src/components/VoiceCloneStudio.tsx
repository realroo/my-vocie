import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  Sliders,
  AudioWaveform as WaveformIcon,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { MicRecorder, fileToBase64, VOICE_RECORDING_SCRIPTS } from '../utils/audio';
import { VoiceProfile } from '../types';
import { AudioPlayerCard } from './AudioPlayerCard';

function cleanDisplayError(err: any): string {
  if (!err) return 'An error occurred during voice analysis.';
  const msg = typeof err === 'string' ? err : err.message || '';
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg || 'Failed to analyze voice sample.';
}

interface VoiceCloneStudioProps {
  onSaveClone: (clone: VoiceProfile) => void;
  onUseInTTS: (clone: VoiceProfile) => void;
  onUseInSTS: (clone: VoiceProfile) => void;
}

export const VoiceCloneStudio: React.FC<VoiceCloneStudioProps> = ({
  onSaveClone,
  onUseInTTS,
  onUseInSTS,
}) => {
  const [cloneName, setCloneName] = useState('My Studio Voice Clone');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0);

  // Audio state
  const [recordedAudio, setRecordedAudio] = useState<{
    base64: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [clonedProfile, setClonedProfile] = useState<VoiceProfile | null>(null);

  // Test synthesis preview state
  const [isSynthesizingTest, setIsSynthesizingTest] = useState(false);
  const [testAudioBase64, setTestAudioBase64] = useState<string | null>(null);

  const recorderRef = useRef<MicRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recording timer
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

  const handleStartRecording = async () => {
    try {
      setAnalysisError(null);
      setClonedProfile(null);
      setTestAudioBase64(null);
      recorderRef.current = new MicRecorder();
      await recorderRef.current.start((vol) => {
        setVolumeLevel(vol);
      });
      setIsRecording(true);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setAnalysisError(
        err?.message?.includes('Permission')
          ? 'Microphone permission denied. Please allow microphone access in your browser.'
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
      setRecordedAudio({
        base64: result.base64,
        mimeType: result.mimeType,
        blobUrl,
      });
    } catch (err: any) {
      console.error('Stop recording error:', err);
      setAnalysisError('Failed to capture audio from recording.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalysisError(null);
      setClonedProfile(null);
      setTestAudioBase64(null);
      const { base64, mimeType } = await fileToBase64(file);
      const blobUrl = URL.createObjectURL(file);
      setRecordedAudio({
        base64,
        mimeType,
        blobUrl,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      setAnalysisError('Could not process the selected audio file.');
    }
  };

  // Run AI acoustic analysis
  const handleAnalyzeVoice = async () => {
    if (!recordedAudio) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/clone-voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: recordedAudio.base64,
          mimeType: recordedAudio.mimeType,
          cloneName: cloneName.trim() || 'My Studio Voice Clone',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Acoustic analysis failed');
      }

      const clone: VoiceProfile = {
        id: data.clonedVoice.id,
        name: data.clonedVoice.name,
        gender: data.clonedVoice.gender,
        geminiVoice: data.clonedVoice.geminiVoice,
        category: 'Custom Voice Clone',
        description: data.clonedVoice.timbreDescription || 'Custom cloned acoustic profile.',
        tags: ['Cloned', data.clonedVoice.pitchRange?.split(' ')[0] || 'Vocal', 'Custom', 'Permanent Model'],
        sampleText:
          'This is your personalized neural voice clone model. Calibrated and saved permanently to your library.',
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
        sampleAudioBase64: recordedAudio.base64,
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

      setClonedProfile(clone);
      onSaveClone(clone);

      // Auto-synthesize a test phrase
      handleSynthesizeTest(clone);
    } catch (err: any) {
      console.error('Error analyzing voice clone:', err);
      setAnalysisError(cleanDisplayError(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSynthesizeTest = async (clone: VoiceProfile) => {
    setIsSynthesizingTest(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hello! This is a test of your new voice clone, ${clone.name}. My neural profile is calibrated to your acoustic resonance and breath cadence.`,
          voiceName: clone.geminiVoice,
          accent: clone.detectedAccent || 'Neutral American',
          speed: clone.defaultSettings?.speed || 1.0,
          clonedVoiceBlueprint: clone.synthesisPrompt,
          tone: 'warm-empathetic',
          emotion: clone.defaultSettings?.emotion,
        }),
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        setTestAudioBase64(data.audioBase64);
      }
    } catch (err) {
      console.error('Error synthesizing test:', err);
    } finally {
      setIsSynthesizingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-neutral-900 via-rose-950/20 to-neutral-900 border border-neutral-800 p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Shot Acoustic Cloning Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Clone Your Own Voice in Seconds
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Record a short 10 to 30 second voice sample or upload an audio clip. Our acoustic neural engine
            extracts your vocal tract formant resonance, pitch range, airflow breathiness, and cadence to build
            your custom AI Voice Clone.
          </p>
        </div>
      </div>

      {/* Recording Studio Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input options & Recorder (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Clone Name Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Voice Clone Name
            </label>
            <input
              type="text"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="e.g. My Natural Studio Voice"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Guide Scripts to Read */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                Recommended Reading Script:
              </span>
              <div className="flex gap-1 text-[11px]">
                {VOICE_RECORDING_SCRIPTS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedScriptIndex(idx)}
                    className={`px-2 py-0.5 rounded font-mono transition ${
                      selectedScriptIndex === idx
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Script #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-neutral-300 italic bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/80 leading-relaxed">
              "{VOICE_RECORDING_SCRIPTS[selectedScriptIndex]}"
            </p>
          </div>

          {/* Live Recording Area */}
          <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center relative overflow-hidden">
            {isRecording ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-rose-500 opacity-30"></span>
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl shadow-rose-950/50">
                      <Mic className="w-9 h-9" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-mono font-bold text-white tracking-wider">
                    00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                  </div>
                  <p className="text-xs text-rose-400 animate-pulse mt-1 font-medium">
                    Listening to vocal acoustics & breath patterns...
                  </p>
                </div>

                {/* Live VU / Volume meter */}
                <div className="max-w-xs mx-auto">
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-rose-500 rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(100, Math.max(5, volumeLevel * 100))}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleStopRecording}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-950/50 transition hover:scale-105 active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Finish Recording</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-semibold shadow-lg shadow-rose-950/40 transition hover:scale-105 active:scale-95 w-full sm:w-auto"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Live Recording</span>
                  </button>

                  <span className="text-xs text-neutral-500 uppercase font-bold">OR</span>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-sm font-semibold transition hover:border-neutral-700 w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Audio File</span>
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
                  Supported formats: WAV, MP3, M4A, WEBM. 10 to 30 seconds of clean speech recommended.
                </p>
              </div>
            )}
          </div>

          {/* Captured Audio Preview Card */}
          {recordedAudio && !isRecording && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Voice Sample Captured</span>
                </div>
                <button
                  onClick={() => setRecordedAudio(null)}
                  className="text-xs text-neutral-400 hover:text-red-400 transition"
                >
                  Discard & Re-record
                </button>
              </div>

              {recordedAudio.blobUrl && (
                <audio controls src={recordedAudio.blobUrl} className="w-full h-9 rounded-lg" />
              )}

              <button
                onClick={handleAnalyzeVoice}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting Acoustic Timbre & Formants...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Voice Clone Profile</span>
                  </>
                )}
              </button>
            </div>
          )}

          {analysisError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}
        </div>

        {/* Right: Acoustic Blueprint Analysis & Audition (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <WaveformIcon className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">Acoustic Fingerprint</h3>
              </div>
              {clonedProfile && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Profile Calibrated
                </span>
              )}
            </div>

            {clonedProfile ? (
              <div className="space-y-4">
                {/* Acoustic traits grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Pitch Register</span>
                    <span className="font-semibold text-white mt-0.5 block truncate">
                      {clonedProfile.pitchRange || 'Baritone / Tenor'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Detected Accent</span>
                    <span className="font-semibold text-white mt-0.5 block truncate">
                      {clonedProfile.detectedAccent || 'Neutral American'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Harmonic Warmth</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.round((clonedProfile.warmthScore || 0.8) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-rose-300">
                        {Math.round((clonedProfile.warmthScore || 0.8) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Breathiness / Airflow</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.round((clonedProfile.breathinessScore || 0.4) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-purple-300">
                        {Math.round((clonedProfile.breathinessScore || 0.4) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clinical Timbre description */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                    Vocal Tract Formant Signature
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {clonedProfile.timbreDescription}
                  </p>
                </div>

                {/* Synthesis Test Playback */}
                {testAudioBase64 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block mb-1.5">
                      Synthesized Clone Audition
                    </span>
                    <AudioPlayerCard
                      audioBase64={testAudioBase64}
                      title={`${clonedProfile.name} (Test Synthesis)`}
                      subtitle="Synthesized using calibrated neural voice clone"
                      duration={4.8}
                      tags={['Cloned AI', '24kHz Lossless']}
                      accentColor="rose"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-500 text-xs space-y-2">
                <WaveformIcon className="w-8 h-8 mx-auto text-neutral-700" />
                <p>Record or upload your voice sample on the left to extract your neural acoustic fingerprint.</p>
              </div>
            )}
          </div>

          {/* Bottom Actions to launch in TTS / STS */}
          {clonedProfile && (
            <div className="pt-4 border-t border-neutral-800 space-y-2 mt-4">
              <button
                onClick={() => onUseInTTS(clonedProfile)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
              >
                <span>Use Voice in Text-to-Speech</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUseInSTS(clonedProfile)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold transition"
              >
                <span>Use Voice in Speech-to-Speech</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
