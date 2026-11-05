import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Copy, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { downloadAudioFile } from '../utils/audio';

interface AudioPlayerCardProps {
  audioBase64: string;
  title: string;
  subtitle?: string;
  transcription?: string;
  duration?: number;
  tags?: string[];
  appliedStyle?: string;
  mimeType?: string;
  audioFormat?: 'wav' | 'mp3' | 'flac';
  sampleRate?: number;
  accentColor?: 'rose' | 'emerald' | 'purple' | 'amber';
  onDelete?: () => void;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  audioBase64,
  title,
  subtitle,
  transcription,
  duration: initialDuration,
  tags = [],
  appliedStyle,
  mimeType = 'audio/wav',
  audioFormat = 'wav',
  sampleRate,
  accentColor = 'rose',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Audio source Data URL
  const audioSrc = `data:${mimeType};base64,${audioBase64}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioBase64, mimeType]);

  // Waveform canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        const harmonic = Math.sin((i / numBars) * Math.PI * 3 + phase);
        const subHarmonic = Math.cos((i / numBars) * Math.PI * 2);
        const activity = isPlaying ? 0.3 + 0.7 * Math.abs(harmonic * subHarmonic) : 0.15;
        const barHeight = Math.max(4, activity * (height - 6));
        const y = (height - barHeight) / 2;

        const progress = currentTime / (duration || 1);
        const isPast = i / numBars <= progress;

        if (isPast) {
          ctx.fillStyle = accentColor === 'emerald' ? '#34d399' : accentColor === 'purple' ? '#c084fc' : '#fb7185';
        } else {
          ctx.fillStyle = '#262626';
        }

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, barWidth, barHeight, 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.12;
      }
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTime, duration, accentColor]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback error or blocked by autoplay policy:', e);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        console.warn('Playback error on replay:', e);
        setIsPlaying(false);
      });
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCopyTranscription = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const cleanName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ext = audioFormat.toLowerCase();
    const filename = `${cleanName}-${sampleRate ? `${Math.round(sampleRate / 1000)}k` : 'studio'}.${ext}`;
    downloadAudioFile(audioBase64, filename, mimeType);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div className="relative rounded-2xl bg-neutral-900/90 border border-neutral-800 p-5 shadow-xl transition-all hover:border-neutral-700/80">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-base font-semibold text-white truncate">{title}</h4>
            {/* Audio format badge */}
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md">
              {audioFormat.toUpperCase()} {sampleRate ? `${Math.round(sampleRate / 1000)} kHz` : ''}
            </span>
            {tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700/50"
              >
                {tag}
              </span>
            ))}
          </div>
          {subtitle && <p className="text-xs text-neutral-400 line-clamp-1">{subtitle}</p>}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {transcription && (
            <button
              onClick={handleCopyTranscription}
              title="Copy Transcription"
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-lg transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleDownload}
            title={`Download ${audioFormat.toUpperCase()} Audio`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{audioFormat.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative bg-neutral-950/80 rounded-xl p-3 border border-neutral-800/80 my-3">
        <canvas
          ref={canvasRef}
          width={480}
          height={48}
          className="w-full h-12 block cursor-pointer"
          onClick={togglePlay}
        />
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-rose-500 cursor-pointer h-1.5 bg-transparent opacity-80 hover:opacity-100 transition mt-2"
        />
      </div>

      {/* Playback Controls & Times */}
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-950/40 hover:scale-105 active:scale-95 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <button
            onClick={handleRestart}
            title="Replay from start"
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-lg transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <span className="font-mono text-neutral-300 ml-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-0.5 text-[11px] rounded transition font-mono ${
                playbackRate === rate
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Transcription snippet */}
      {transcription && (
        <div className="mt-3.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60 text-xs text-neutral-300">
          <p className="font-medium text-neutral-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>Spoken Transcription</span>
          </p>
          <p className="italic text-neutral-200">"{transcription}"</p>
        </div>
      )}

      {/* Blueprint details */}
      {appliedStyle && (
        <div className="mt-2.5">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
          >
            <Sparkles className="w-3 h-3" />
            <span>{showDetails ? 'Hide Acoustic Blueprint' : 'Show Acoustic Blueprint'}</span>
          </button>
          {showDetails && (
            <div className="mt-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 font-mono leading-relaxed">
              {appliedStyle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
