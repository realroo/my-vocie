import React from 'react';
import { Sparkles, Mic, Volume2, Radio, Library, History } from 'lucide-react';

interface HeaderProps {
  activeTab: 'clone' | 'tts' | 'sts' | 'library' | 'history';
  setActiveTab: (tab: 'clone' | 'tts' | 'sts' | 'library' | 'history') => void;
  clonedCount: number;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  clonedCount,
  historyCount,
}) => {
  const tabs = [
    {
      id: 'clone' as const,
      label: 'Voice Clone Lab',
      icon: Mic,
      badge: clonedCount > 0 ? `${clonedCount}` : 'New',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'tts' as const,
      label: 'Text to Speech',
      icon: Volume2,
      desc: 'Custom accents & ASMR',
    },
    {
      id: 'sts' as const,
      label: 'Speech to Speech',
      icon: Radio,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'library' as const,
      label: 'Voice Library',
      icon: Library,
    },
    {
      id: 'history' as const,
      label: 'Session Reel',
      icon: History,
      badge: historyCount > 0 ? `${historyCount}` : undefined,
      badgeColor: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    },
  ];

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 shadow-lg shadow-rose-950/50">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  Vocalis<span className="text-rose-400 font-extrabold">AI</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-neutral-900 text-rose-300 border border-rose-500/20 rounded-md">
                  Studio HD
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Neural Voice Clone & Multi-Horizon Acoustic Synthesizer
              </p>
            </div>
          </div>

          {/* Quick Engine Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gemini 3.8 Audio Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
              24 kHz Studio Lossless WAV
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-950/20'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-semibold border rounded-full ${
                      tab.badgeColor || 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
