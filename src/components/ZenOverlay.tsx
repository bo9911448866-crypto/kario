import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EyeOff, Volume2, VolumeX, Play, Pause, Music, Sliders } from 'lucide-react';
import { CustomThemeConfig } from '../types';
import { ambientAudioEngine } from '../services/AmbientAudioService';

interface ZenOverlayProps {
  isOpen: boolean;
  onExit: () => void;
  config: CustomThemeConfig;
  onOpenSettings: () => void;
}

export const ZenOverlay: React.FC<ZenOverlayProps> = ({
  isOpen,
  onExit,
  config,
  onOpenSettings,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(ambientAudioEngine.getIsPlaying());
  const [volume, setVolume] = React.useState(ambientAudioEngine.getVolume());

  // Listen for Escape key to exit Zen mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onExit]);

  if (!isOpen) return null;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      ambientAudioEngine.stop();
      setIsPlaying(false);
    } else {
      if (config.liveAudioUrl) {
        ambientAudioEngine.playUrl(config.liveAudioUrl);
      } else {
        ambientAudioEngine.playProcedural('rain');
      }
      setIsPlaying(true);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const v = parseFloat(e.target.value);
    setVolume(v);
    ambientAudioEngine.setVolume(v);
  };

  return (
    <div
      id="kairo-zen-screensaver"
      onClick={onExit}
      className="fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-10 cursor-pointer select-none animate-in fade-in duration-300"
      title="Click anywhere to return to workspace"
    >
      {/* Top Subtle Status */}
      <div className="flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs shadow-lg">
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
          <span className="font-semibold tracking-wide">Kairo Zen View</span>
          <span className="text-white/60">• Pure Live Background</span>
        </div>

        <div className="text-xs text-white/60 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 hidden sm:block">
          Press <kbd className="font-mono text-purple-300">Esc</kbd> or click anywhere to exit
        </div>
      </div>

      {/* Center Ambient Message */}
      <div className="text-center pointer-events-none my-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-md mx-auto space-y-2"
        >
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            Focus & Calm
          </h1>
          <p className="text-sm sm:text-base text-purple-200/80 drop-shadow">
            Immerse yourself in live ambient visuals and calming soundscapes
          </p>
        </motion.div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-2xl pointer-events-auto cursor-default"
      >
        <button
          type="button"
          onClick={togglePlay}
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
          title={isPlaying ? 'Pause Audio' : 'Play Audio'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </button>

        <div className="flex items-center gap-2 px-2 border-r border-white/10">
          <Volume2 className="h-3.5 w-3.5 text-purple-300" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            className="w-20 accent-purple-500 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sliders className="h-3.5 w-3.5 text-purple-400" />
          <span>Customize</span>
        </button>

        <button
          type="button"
          onClick={onExit}
          className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
        >
          <EyeOff className="h-3.5 w-3.5 text-purple-600" />
          <span>Exit Zen View</span>
        </button>
      </div>
    </div>
  );
};
