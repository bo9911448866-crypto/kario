import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration: initialDuration, compact = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Playback error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="audio-player-container"
      className={`flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 transition-all ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        id="audio-player-toggle"
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      {/* Seek Progress & Time */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            {isPlaying && (
              <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping mr-1" />
                Playing
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Custom Range Slider */}
        <div className="relative flex items-center group">
          <input
            id="audio-seek-slider"
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Controls: Speed, Restart, Mute */}
      <div className="flex items-center gap-1 shrink-0 text-slate-600 dark:text-slate-400">
        <button
          id="audio-player-speed-button"
          type="button"
          onClick={handleSpeedChange}
          className="px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        <button
          id="audio-player-restart-button"
          type="button"
          onClick={restart}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Restart playback"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          id="audio-player-mute-button"
          type="button"
          onClick={toggleMute}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-500" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};
