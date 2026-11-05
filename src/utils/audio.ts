/**
 * Audio processing and recording utilities for Vocalis AI Studio
 */

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || 'audio/wav';
      resolve({ base64, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export function downloadAudioFile(
  base64: string,
  filename = 'vocalis-synthesized-audio.wav',
  mimeType = 'audio/wav'
) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Backwards compatibility alias
export function downloadWav(base64: string, filename = 'vocalis-synthesized-audio.wav') {
  downloadAudioFile(base64, filename, 'audio/wav');
}

export class MicRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  async start(onVolume?: (vol: number) => void): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else {
        mimeType = '';
      }
    }

    const options = mimeType ? { mimeType } : undefined;
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    if (onVolume) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        onVolume(normalized);
        this.animFrameId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    }

    this.mediaRecorder.start(100);
  }

  async stop(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('MediaRecorder not initialized');
      }

      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => {});
        this.audioCtx = null;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const base64 = await blobToBase64(blob);

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve({ blob, base64, mimeType });
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }
}

export const SAMPLE_PROMPTS = [
  {
    category: 'Seductive & Sensual 🔥',
    title: 'Midnight Secret',
    text: "You know, there's something thrilling about the quiet of midnight. Lean in closer... let's see where this night takes us.",
    recommendedTone: 'seductive',
    asmr: true,
  },
  {
    category: 'ASMR Whispers 🪶',
    title: 'Gentle Tingle Whispers',
    text: "<breath> Softly now... relax your shoulders, close your eyes. |mhm| Just breathe in deeply, and let the gentle whisper melt your stress away.",
    recommendedTone: 'asmr-whisper',
    asmr: true,
  },
  {
    category: 'British Aristocratic 👑',
    title: 'The Manor Library',
    text: "Good evening. Precision and composure are the hallmarks of true distinction. Shall we review the archives together?",
    recommendedTone: 'corporate-executive',
    accent: 'British (RP)',
    asmr: false,
  },
  {
    category: 'Deep Cinematic 🎬',
    title: 'Edge of the Abyss',
    text: "Before the empires rose, there was only silence. And in that darkness, a single spark rewrote the destiny of mankind.",
    recommendedTone: 'dramatic-cinematic',
    asmr: false,
  },
  {
    category: 'Warm & Empathetic ☀️',
    title: 'Peaceful Affirmation',
    text: "I want you to know how proud I am of you. You've worked so hard, and you deserve every moment of joy coming your way.",
    recommendedTone: 'warm-empathetic',
    asmr: false,
  },
  {
    category: 'High Energy ⚡',
    title: 'Launch Keynote',
    text: "Are you ready?! Today marks the dawn of true neural voice synthesis. We are launching into a whole new sonic universe!",
    recommendedTone: 'energetic-hype',
    asmr: false,
  },
];

export const VOICE_RECORDING_SCRIPTS = [
  "Hello, I am recording this speech sample so Vocalis AI can learn the natural timbre, resonance, and pacing of my authentic voice.",
  "The quiet rhythm of the evening brings a special clarity. I love how sound travels, soft and steady, carrying every nuance of emotion.",
  "Whispering or speaking with energy, my voice shifts like colors in the light. Listen closely to the breath and the warmth in these words.",
];
