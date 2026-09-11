import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  CloudRain,
  Flame,
  Radio,
  Sparkles,
  Eye,
  EyeOff,
  ChevronDown,
  Shield,
  Palette,
  Layers,
  Film,
  Check,
  Trash2,
} from 'lucide-react';
import { CustomThemeConfig } from '../types';
import { ambientAudioEngine } from '../services/AmbientAudioService';
import { CURATED_AUDIO, CURATED_VIDEOS } from '../services/ThemePresets';

interface AmbientAudioBarProps {
  config: CustomThemeConfig;
  onUpdateConfig: (config: CustomThemeConfig) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  onOpenSettings?: () => void;
}

export const AmbientAudioBar: React.FC<AmbientAudioBarProps> = ({
  config,
  onUpdateConfig,
  isZenMode = false,
  onToggleZenMode,
  onOpenSettings,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(config.audioVolume ?? 0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVideoDropdownOpen, setIsVideoDropdownOpen] = useState(false);
  const [isContrastMenuOpen, setIsContrastMenuOpen] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(
    config.audioTrackTitle || 'Gentle Rain & Distant Thunder'
  );
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const videoDropdownRef = useRef<HTMLDivElement | null>(null);
  const contrastRef = useRef<HTMLDivElement | null>(null);

  const currentScrim = config.contentScrimOpacity ?? 0.75;
  const currentCardStyle = config.cardStyle ?? 'solid';

  const activeVideo = CURATED_VIDEOS.find((v) => v.videoUrl === config.liveVideoUrl);

  // Sync volume with ambient audio engine
  useEffect(() => {
    ambientAudioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (videoDropdownRef.current && !videoDropdownRef.current.contains(e.target as Node)) {
        setIsVideoDropdownOpen(false);
      }
      if (contrastRef.current && !contrastRef.current.contains(e.target as Node)) {
        setIsContrastMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      ambientAudioEngine.stop();
      setIsPlaying(false);
      onUpdateConfig({ ...config, isAudioPlaying: false });
    } else {
      // Start current track
      if (config.liveAudioUrl) {
        ambientAudioEngine.playUrl(config.liveAudioUrl, currentTrackTitle);
      } else {
        ambientAudioEngine.playProcedural('rain');
        setCurrentTrackTitle('Gentle Rain & Distant Thunder');
      }
      setIsPlaying(true);
      onUpdateConfig({ ...config, isAudioPlaying: true });
    }
  };

  const handleSelectProcedural = (soundType: 'rain' | 'fireplace' | 'cosmic' | 'lofi', title: string) => {
    ambientAudioEngine.playProcedural(soundType);
    setIsPlaying(true);
    setCurrentTrackTitle(title);
    setIsDropdownOpen(false);
    onUpdateConfig({
      ...config,
      liveAudioUrl: undefined,
      audioTrackTitle: title,
      isAudioPlaying: true,
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    onUpdateConfig({ ...config, audioVolume: newVol });
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      ambientAudioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      ambientAudioEngine.setVolume(0);
    }
  };

  const handleCycleContrast = () => {
    // Cycle between 0.85 (Deep High Contrast) -> 0.70 (Balanced) -> 0.40 (Vivid)
    let nextScrim = 0.75;
    if (currentScrim >= 0.8) {
      nextScrim = 0.55;
    } else if (currentScrim >= 0.5) {
      nextScrim = 0.85;
    } else {
      nextScrim = 0.75;
    }
    onUpdateConfig({
      ...config,
      contentScrimOpacity: nextScrim,
      presetId: 'custom',
    });
  };

  return (
    <div
      id="ambient-audio-bar"
      className="flex items-center justify-between gap-3 flex-wrap p-2 px-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all"
    >
      {/* Left: Ambient Soundscape Controller */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-purple-900/60 bg-slate-50 dark:bg-slate-950 shadow-xs overflow-hidden">
            {/* Play/Pause Button */}
            <button
              id="ambient-play-btn"
              type="button"
              onClick={handleTogglePlay}
              className={`p-1.5 px-3 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-700 dark:text-purple-300 hover:text-purple-600 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-950/50'
              }`}
              title={isPlaying ? 'Pause ambient audio' : 'Play ambient audio'}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Soundscape</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span className="text-[11px]">Ambience</span>
                </>
              )}
            </button>

            {/* Sound wave animation if playing */}
            {isPlaying && (
              <div className="flex items-center gap-0.5 px-2 py-1">
                <span className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse" />
                <span className="w-0.5 h-4 bg-purple-400 rounded-full animate-pulse delay-75" />
                <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse delay-150" />
              </div>
            )}

            {/* Track Selector Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-1.5 px-2.5 text-slate-600 dark:text-purple-300 hover:text-purple-600 dark:hover:text-white border-l border-slate-200 dark:border-purple-900/50 transition-colors cursor-pointer flex items-center gap-1"
              title="Choose ambient soundscape"
            >
              <Music className="h-3.5 w-3.5 text-purple-500" />
              <span className="hidden sm:inline text-[11px] font-medium max-w-[130px] truncate">
                {currentTrackTitle}
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Volume Control Button & Mini Slider */}
            <div className="hidden md:flex items-center border-l border-slate-200 dark:border-purple-900/50 px-2.5 py-1 gap-1.5">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 accent-purple-600 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0e0a19] border border-slate-200 dark:border-purple-900/60 shadow-xl shadow-purple-950/40 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-purple-400">
                Study Soundscapes
              </div>

              <div className="space-y-1">
                {CURATED_AUDIO.map((snd) => (
                  <button
                    key={snd.id}
                    type="button"
                    onClick={() => handleSelectProcedural(snd.soundType, snd.name)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isPlaying && currentTrackTitle === snd.name
                        ? 'bg-purple-600 text-white font-medium shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    }`}
                  >
                    {snd.soundType === 'rain' && <CloudRain className="h-4 w-4 shrink-0" />}
                    {snd.soundType === 'fireplace' && <Flame className="h-4 w-4 shrink-0" />}
                    {snd.soundType === 'cosmic' && <Radio className="h-4 w-4 shrink-0" />}
                    {snd.soundType === 'lofi' && <Sparkles className="h-4 w-4 shrink-0" />}
                    <div className="truncate">
                      <div className="font-medium truncate">{snd.name}</div>
                      <div className="text-[10px] opacity-75 truncate">{snd.tagline}</div>
                    </div>
                  </button>
                ))}
              </div>

              {config.liveAudioUrl && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => {
                      if (config.liveAudioUrl) {
                        ambientAudioEngine.playUrl(config.liveAudioUrl, 'Custom Audio Track');
                        setIsPlaying(true);
                        setCurrentTrackTitle('Custom Audio Track');
                        setIsDropdownOpen(false);
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium flex items-center gap-2"
                  >
                    <Music className="h-4 w-4 shrink-0" />
                    <span className="truncate">Play Custom Track</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Wallpaper Quick Switcher */}
        <div className="relative" ref={videoDropdownRef}>
          <button
            id="live-wallpaper-toggle-btn"
            type="button"
            onClick={() => setIsVideoDropdownOpen(!isVideoDropdownOpen)}
            className={`p-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              config.liveVideoUrl
                ? 'border-purple-500/70 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'border-slate-200 dark:border-purple-900/40 bg-white/70 dark:bg-[#07020d]/70 text-slate-600 dark:text-purple-300 hover:border-purple-400'
            }`}
            title="Choose a live video wallpaper background"
          >
            <Film className="h-3.5 w-3.5 text-purple-500" />
            <span className="hidden sm:inline text-[11px] max-w-[110px] truncate">
              {activeVideo ? activeVideo.name : config.liveVideoUrl ? 'Custom Video' : 'Live Wallpaper'}
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isVideoDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Live Wallpaper Dropdown */}
          {isVideoDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0e0a19] border border-slate-200 dark:border-purple-900/60 shadow-xl shadow-purple-950/40 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-purple-400">
                <span>Live Video Wallpapers</span>
                {config.liveVideoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        liveVideoUrl: undefined,
                        presetId: 'custom',
                      });
                      setIsVideoDropdownOpen(false);
                    }}
                    className="text-rose-500 hover:text-rose-600 text-[10px] normal-case flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {CURATED_VIDEOS.map((vid) => {
                  const isSelected = config.liveVideoUrl === vid.videoUrl;
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => {
                        onUpdateConfig({
                          ...config,
                          liveVideoUrl: vid.videoUrl,
                          contentScrimOpacity: Math.max(0.75, config.contentScrimOpacity ?? 0.75),
                          videoOpacity: config.videoOpacity ?? 0.55,
                          presetId: 'custom',
                        });
                        setIsVideoDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white font-medium shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                      }`}
                    >
                      <img
                        src={vid.thumbnail}
                        alt=""
                        className="w-9 h-6 object-cover rounded-md shrink-0"
                      />
                      <div className="truncate flex-1">
                        <div className="font-medium truncate">{vid.name}</div>
                        <div className="text-[10px] opacity-75 truncate">{vid.category}</div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {onOpenSettings && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVideoDropdownOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full text-center px-3 py-1.5 rounded-xl text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium cursor-pointer"
                  >
                    Custom Video Upload & Blur Settings →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Instant Readability Contrast Shield & Zen Mode */}
      <div className="flex items-center gap-2">
        {/* Contrast Shield Toggle / Quick Calibrator */}
        <div className="relative" ref={contrastRef}>
          <button
            id="contrast-shield-toggle-btn"
            type="button"
            onClick={handleCycleContrast}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs cursor-pointer ${
              currentScrim >= 0.7
                ? 'border-emerald-500/70 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/70 bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
            }`}
            title={`Readability Dimmer is at ${Math.round(currentScrim * 100)}%. Tap to cycle high contrast (85%), balanced (75%), or light (55%).`}
          >
            <Shield className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Readability Shield: {Math.round(currentScrim * 100)}%</span>
          </button>
        </div>

        {/* Solid vs Frosted Cards Toggle */}
        <button
          id="card-contrast-style-btn"
          type="button"
          onClick={() =>
            onUpdateConfig({
              ...config,
              cardStyle: currentCardStyle === 'solid' ? 'frosted' : 'solid',
              presetId: 'custom',
            })
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title={`Cards are currently ${currentCardStyle === 'solid' ? 'Solid High-Contrast' : 'Frosted Glass'}. Tap to switch.`}
        >
          <Layers className="h-3.5 w-3.5 text-purple-500" />
          <span className="hidden sm:inline">
            {currentCardStyle === 'solid' ? 'Solid Cards' : 'Frosted Glass'}
          </span>
        </button>

        {/* Zen / Screensaver Mode Toggle */}
        {onToggleZenMode && (
          <button
            id="zen-mode-toggle-btn"
            type="button"
            onClick={onToggleZenMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs cursor-pointer ${
              isZenMode
                ? 'border-purple-500 bg-purple-600 text-white shadow-purple-600/30 ring-2 ring-purple-500/40'
                : 'border-slate-200 dark:border-purple-900/40 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-purple-300 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-200'
            }`}
            title={
              isZenMode
                ? 'Exit Zen Screensaver Mode (Reveal Notes UI)'
                : 'Zen Ambient Mode: Hide page UI so you only see the background & sound'
            }
          >
            {isZenMode ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Zen</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-purple-500" />
                <span className="hidden sm:inline">Zen View</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
