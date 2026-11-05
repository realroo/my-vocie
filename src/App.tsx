import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VoiceCloneStudio } from './components/VoiceCloneStudio';
import { TextToSpeechStudio } from './components/TextToSpeechStudio';
import { SpeechToSpeechStudio } from './components/SpeechToSpeechStudio';
import { VoiceLibraryView } from './components/VoiceLibraryView';
import { HistoryReel } from './components/HistoryReel';
import { VoiceSelector } from './components/VoiceSelector';
import { VoiceProfile, ModulationSettings, GeneratedClip } from './types';
import { X } from 'lucide-react';

const STORAGE_KEY_CLONES = 'vocalis_ai_cloned_voices';
const STORAGE_KEY_HISTORY = 'vocalis_ai_session_history';

// Safe localStorage wrapper that gracefully tolerates iframe sandbox restrictions
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (_) {}
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (_) {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (_) {}
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'clone' | 'tts' | 'sts' | 'library' | 'history'>('tts');
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('kore');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Audition audio state
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modulation Settings
  const [settings, setSettings] = useState<ModulationSettings>({
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
    tone: 'seductive',
    emotion: {
      seduction: 0.85,
      breathiness: 0.7,
      intimacy: 0.9,
      joy: 0.3,
      seriousness: 0.3,
      excitement: 0.2,
    },
    customStyleNote: '',
  });

  // History reel
  const [historyClips, setHistoryClips] = useState<GeneratedClip[]>([]);

  // 1. Fetch prebuilt voices from backend & load cloned voices from server & localStorage
  useEffect(() => {
    async function loadVoices() {
      try {
        const res = await fetch('/api/voices');
        const data = await res.json();
        const serverVoices: VoiceProfile[] = data.voices || [];
        const serverClones: VoiceProfile[] = data.persistedClones || [];

        // Load saved clones from localStorage safely
        const savedClonesRaw = safeStorage.getItem(STORAGE_KEY_CLONES);
        let localClones: VoiceProfile[] = [];
        if (savedClonesRaw) {
          try {
            localClones = JSON.parse(savedClonesRaw);
          } catch (e) {
            console.error('Failed to parse saved clones', e);
          }
        }

        // Merge server voices and local clones, ensuring uniqueness by ID
        const cloneMap = new Map<string, VoiceProfile>();
        serverClones.forEach((c) => cloneMap.set(c.id, { ...c, isPermanentModel: true }));
        localClones.forEach((c) => {
          if (!cloneMap.has(c.id)) {
            cloneMap.set(c.id, c);
            // Sync local-only clone to server so it's persisted forever
            fetch('/api/voices/custom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(c),
            }).catch((err) => console.warn('Sync clone error:', err));
          }
        });

        const mergedClones = Array.from(cloneMap.values());
        const prebuilts = serverVoices.filter((v) => !v.isCloned);
        const combined = [...mergedClones, ...prebuilts];

        setVoices(combined);
        safeStorage.setItem(STORAGE_KEY_CLONES, JSON.stringify(mergedClones));

        // Default selected voice
        if (mergedClones.length > 0) {
          setSelectedVoiceId(mergedClones[0].id);
        } else if (prebuilts.length > 0) {
          setSelectedVoiceId(prebuilts[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
      }
    }

    loadVoices();

    // Load session history safely
    const savedHistoryRaw = safeStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistoryRaw) {
      try {
        setHistoryClips(JSON.parse(savedHistoryRaw));
      } catch (e) {
        console.error('Failed to parse saved history', e);
      }
    }
  }, []);

  // Save clones to storage & persist forever to server
  const handleSaveClone = async (newClone: VoiceProfile) => {
    const cloneWithModelFlag: VoiceProfile = {
      ...newClone,
      isCloned: true,
      isPermanentModel: true,
    };

    // Update React state immediately
    setVoices((prev) => {
      const existing = prev.filter((v) => v.id !== cloneWithModelFlag.id);
      const updated = [cloneWithModelFlag, ...existing];
      const clonesOnly = updated.filter((v) => v.isCloned);
      safeStorage.setItem(STORAGE_KEY_CLONES, JSON.stringify(clonesOnly));
      return updated;
    });

    setSelectedVoiceId(cloneWithModelFlag.id);
    if (cloneWithModelFlag.defaultSettings) {
      setSettings((prev) => ({
        ...prev,
        accent: cloneWithModelFlag.defaultSettings?.accent || prev.accent,
        speed: cloneWithModelFlag.defaultSettings?.speed || prev.speed,
        pitch: cloneWithModelFlag.defaultSettings?.pitch || prev.pitch,
        tone: (cloneWithModelFlag.defaultSettings?.tone as any) || prev.tone,
        emotion: cloneWithModelFlag.defaultSettings?.emotion || prev.emotion,
      }));
    }

    // Persist to server disk storage so it is kept forever as a model
    try {
      await fetch('/api/voices/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloneWithModelFlag),
      });
    } catch (err) {
      console.warn('Failed to persist clone to server:', err);
    }
  };

  const handleDeleteClonedVoice = async (id: string) => {
    setVoices((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      const clonesOnly = updated.filter((v) => v.isCloned);
      safeStorage.setItem(STORAGE_KEY_CLONES, JSON.stringify(clonesOnly));
      return updated;
    });

    if (selectedVoiceId === id) {
      setSelectedVoiceId('kore');
    }

    // Delete from server disk storage
    try {
      await fetch(`/api/voices/custom/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete clone from server:', err);
    }
  };

  // Add clip to history
  const handleAddClipToHistory = (clip: GeneratedClip) => {
    setHistoryClips((prev) => {
      const updated = [clip, ...prev.slice(0, 49)];
      safeStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistoryClips([]);
    safeStorage.removeItem(STORAGE_KEY_HISTORY);
  };

  const handleDeleteClip = (id: string) => {
    setHistoryClips((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      safeStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  // Voice audition preview handler
  const handleAuditionVoice = async (voice: VoiceProfile) => {
    if (auditioningVoiceId === voice.id) {
      // Stop current playback
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
      }
      setAuditioningVoiceId(null);
      return;
    }

    try {
      setAuditioningVoiceId(voice.id);
      const sampleText =
        voice.sampleText ||
        `Hello, I am ${voice.name}. This is a demonstration of my vocal timbre and acoustic resonance.`;

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voiceName: voice.geminiVoice,
          accent: voice.detectedAccent || voice.defaultSettings?.accent || 'Neutral American',
          speed: voice.defaultSettings?.speed || 1.0,
          audioFormat: 'wav',
          sampleRate: 24000,
          tone: voice.defaultSettings?.tone || 'warm-empathetic',
          asmr: voice.defaultSettings?.asmr || { enabled: false },
          emotion: voice.defaultSettings?.emotion,
          clonedVoiceBlueprint: voice.isCloned ? voice.synthesisPrompt : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.audioBase64) {
        if (!auditionAudioRef.current) {
          auditionAudioRef.current = new Audio();
        }
        auditionAudioRef.current.src = `data:audio/wav;base64,${data.audioBase64}`;
        auditionAudioRef.current.onended = () => setAuditioningVoiceId(null);
        try {
          await auditionAudioRef.current.play();
        } catch (playErr) {
          console.warn('Audition playback error or auto-play prevented:', playErr);
          setAuditioningVoiceId(null);
        }
      } else {
        setAuditioningVoiceId(null);
      }
    } catch (err) {
      console.error('Audition error:', err);
      setAuditioningVoiceId(null);
    }
  };

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) ||
    voices[0] || {
      id: 'kore',
      name: 'Kore',
      gender: 'Female',
      geminiVoice: 'Kore',
      category: 'Warm & Velvety',
      description: 'Soothing, warm, velvety timbre with exceptional emotional depth.',
      tags: ['Warm', 'Soothing'],
      sampleText: 'Welcome to your sanctuary of sound.',
    };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clonedCount={voices.filter((v) => v.isCloned).length}
        historyCount={historyClips.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'clone' && (
          <VoiceCloneStudio
            onSaveClone={handleSaveClone}
            onUseInTTS={(clone) => {
              setSelectedVoiceId(clone.id);
              setActiveTab('tts');
            }}
            onUseInSTS={(clone) => {
              setSelectedVoiceId(clone.id);
              setActiveTab('sts');
            }}
          />
        )}

        {activeTab === 'tts' && (
          <TextToSpeechStudio
            voices={voices}
            selectedVoice={selectedVoice}
            onSelectVoice={(v) => {
              setSelectedVoiceId(v.id);
              if (v.defaultSettings) {
                setSettings((prev) => ({
                  ...prev,
                  accent: v.defaultSettings?.accent || prev.accent,
                  speed: v.defaultSettings?.speed || prev.speed,
                  pitch: v.defaultSettings?.pitch || prev.pitch,
                  tone: (v.defaultSettings?.tone as any) || prev.tone,
                  emotion: v.defaultSettings?.emotion || prev.emotion,
                }));
              }
            }}
            settings={settings}
            onSettingsChange={setSettings}
            onOpenVoiceSelector={() => setShowVoiceModal(true)}
            onAddClipToHistory={handleAddClipToHistory}
            onAuditionVoice={handleAuditionVoice}
            auditioningVoiceId={auditioningVoiceId}
          />
        )}

        {activeTab === 'sts' && (
          <SpeechToSpeechStudio
            voices={voices}
            selectedVoice={selectedVoice}
            onSelectVoice={(v) => {
              setSelectedVoiceId(v.id);
              if (v.defaultSettings) {
                setSettings((prev) => ({
                  ...prev,
                  accent: v.defaultSettings?.accent || prev.accent,
                  speed: v.defaultSettings?.speed || prev.speed,
                  pitch: v.defaultSettings?.pitch || prev.pitch,
                  tone: (v.defaultSettings?.tone as any) || prev.tone,
                  emotion: v.defaultSettings?.emotion || prev.emotion,
                }));
              }
            }}
            settings={settings}
            onSettingsChange={setSettings}
            onOpenVoiceSelector={() => setShowVoiceModal(true)}
            onAddClipToHistory={handleAddClipToHistory}
            onAuditionVoice={handleAuditionVoice}
            auditioningVoiceId={auditioningVoiceId}
            onSaveClone={handleSaveClone}
            onNavigateToClone={() => setActiveTab('clone')}
          />
        )}

        {activeTab === 'library' && (
          <VoiceLibraryView
            voices={voices}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={(v) => setSelectedVoiceId(v.id)}
            onDeleteClonedVoice={handleDeleteClonedVoice}
            onAuditionVoice={handleAuditionVoice}
            auditioningVoiceId={auditioningVoiceId}
            onNavigateToClone={() => setActiveTab('clone')}
            onNavigateToTTS={(v) => {
              setSelectedVoiceId(v.id);
              setActiveTab('tts');
            }}
            onNavigateToSTS={(v) => {
              setSelectedVoiceId(v.id);
              setActiveTab('sts');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryReel
            clips={historyClips}
            onClearHistory={handleClearHistory}
            onDeleteClip={handleDeleteClip}
            onNavigateToTTS={() => setActiveTab('tts')}
          />
        )}
      </main>

      {/* Modal Voice Selector Drawer */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Select Synthesis Voice</h3>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <VoiceSelector
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onSelectVoice={(voice) => {
                  setSelectedVoiceId(voice.id);
                  if (voice.defaultSettings) {
                    setSettings((prev) => ({
                      ...prev,
                      accent: voice.defaultSettings?.accent || prev.accent,
                      speed: voice.defaultSettings?.speed || prev.speed,
                      pitch: voice.defaultSettings?.pitch || prev.pitch,
                      tone: (voice.defaultSettings?.tone as any) || prev.tone,
                      emotion: voice.defaultSettings?.emotion || prev.emotion,
                    }));
                  }
                  setShowVoiceModal(false);
                }}
                onDeleteClonedVoice={handleDeleteClonedVoice}
                onAuditionVoice={handleAuditionVoice}
                isAuditioning={Boolean(auditioningVoiceId)}
                auditioningVoiceId={auditioningVoiceId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
