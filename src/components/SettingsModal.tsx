import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Palette,
  Sliders,
  Image as ImageIcon,
  Flame,
  RotateCcw,
  Check,
  Upload,
  Link,
  Trash2,
  Sparkles,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Laptop,
  Video,
  Film,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ShieldCheck,
} from 'lucide-react';
import { CustomThemeConfig, PresetThemeId, BackgroundPatternType } from '../types';
import {
  THEME_PRESETS,
  CURATED_WALLPAPERS,
  CURATED_VIDEOS,
  CURATED_AUDIO,
  DEFAULT_THEME_CONFIG,
} from '../services/ThemePresets';
import { ambientAudioEngine } from '../services/AmbientAudioService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CustomThemeConfig;
  onUpdateConfig: (newConfig: CustomThemeConfig) => void;
  onReplayIntro?: () => void;
}

type SettingsTab = 'presets' | 'live-media' | 'background' | 'colors' | 'fire';

const QUICK_ACCENT_COLORS = [
  { name: 'Electric Violet', hex: '#9333ea' },
  { name: 'Neon Amethyst', hex: '#c084fc' },
  { name: 'Cosmic Indigo', hex: '#6366f1' },
  { name: 'Neon Cyan', hex: '#06b6d4' },
  { name: 'Emerald Focus', hex: '#10b981' },
  { name: 'Warm Amber', hex: '#d97706' },
  { name: 'Sunset Crimson', hex: '#f43f5e' },
  { name: 'Hot Magenta', hex: '#ec4899' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Cool Slate', hex: '#64748b' },
];

const QUICK_BACKGROUND_COLORS = [
  { name: 'Obsidian Fire', hex: '#07020d', dark: true },
  { name: 'Pitch Black', hex: '#000000', dark: true },
  { name: 'Deep Space', hex: '#0b0c1b', dark: true },
  { name: 'Evergreen Pine', hex: '#03140c', dark: true },
  { name: 'Dark Roasted', hex: '#120d09', dark: true },
  { name: 'Nordic Slate', hex: '#0f172a', dark: true },
  { name: 'Parchment Warm', hex: '#faf5f0', dark: false },
  { name: 'Crisp Light', hex: '#f8fafc', dark: false },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onReplayIntro,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customVideoUrlInput, setCustomVideoUrlInput] = useState('');
  const [customAudioUrlInput, setCustomAudioUrlInput] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(ambientAudioEngine.getIsPlaying());
  const [audioVolume, setAudioVolume] = useState(config.audioVolume ?? 0.5);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePresetSelect = (presetId: PresetThemeId) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onUpdateConfig({
        ...preset.config,
        // preserve custom media if already present
        customWallpaperUrl: config.customWallpaperUrl,
        liveVideoUrl: config.liveVideoUrl,
        liveAudioUrl: config.liveAudioUrl,
        contentScrimOpacity: config.contentScrimOpacity ?? 0.35,
        cardStyle: config.cardStyle ?? 'solid',
      });
    }
  };

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor' | 'customBackgroundColor', value: string) => {
    onUpdateConfig({
      ...config,
      presetId: 'custom',
      [field]: value,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpdateConfig({
        ...config,
        customWallpaperUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    onUpdateConfig({
      ...config,
      customWallpaperUrl: customUrlInput.trim(),
    });
    setCustomUrlInput('');
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file (MP4, WebM, etc.).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onUpdateConfig({
      ...config,
      liveVideoUrl: objectUrl,
      presetId: 'custom',
    });
  };

  const handleApplyCustomVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoUrlInput.trim()) return;
    onUpdateConfig({
      ...config,
      liveVideoUrl: customVideoUrlInput.trim(),
      presetId: 'custom',
    });
    setCustomVideoUrlInput('');
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, AAC, etc.).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    ambientAudioEngine.playUrl(objectUrl, file.name);
    setIsPlayingAudio(true);
    onUpdateConfig({
      ...config,
      liveAudioUrl: objectUrl,
      audioTrackTitle: file.name,
      isAudioPlaying: true,
      presetId: 'custom',
    });
  };

  const handleApplyCustomAudioUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAudioUrlInput.trim()) return;
    const url = customAudioUrlInput.trim();
    ambientAudioEngine.playUrl(url, 'Custom Audio Stream');
    setIsPlayingAudio(true);
    onUpdateConfig({
      ...config,
      liveAudioUrl: url,
      audioTrackTitle: 'Custom Audio Stream',
      isAudioPlaying: true,
      presetId: 'custom',
    });
    setCustomAudioUrlInput('');
  };

  const handleSelectProceduralAudio = (soundType: 'rain' | 'fireplace' | 'cosmic' | 'lofi', title: string) => {
    ambientAudioEngine.playProcedural(soundType);
    setIsPlayingAudio(true);
    onUpdateConfig({
      ...config,
      liveAudioUrl: undefined,
      audioTrackTitle: title,
      isAudioPlaying: true,
    });
  };

  const handleToggleAudioPlay = () => {
    if (isPlayingAudio) {
      ambientAudioEngine.stop();
      setIsPlayingAudio(false);
      onUpdateConfig({ ...config, isAudioPlaying: false });
    } else {
      if (config.liveAudioUrl) {
        ambientAudioEngine.playUrl(config.liveAudioUrl, config.audioTrackTitle || 'Custom Audio');
      } else {
        ambientAudioEngine.playProcedural('rain');
        onUpdateConfig({ ...config, audioTrackTitle: 'Gentle Rain & Distant Thunder' });
      }
      setIsPlayingAudio(true);
      onUpdateConfig({ ...config, isAudioPlaying: true });
    }
  };

  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setAudioVolume(v);
    ambientAudioEngine.setVolume(v);
    onUpdateConfig({ ...config, audioVolume: v });
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all themes, custom backgrounds, and color styles back to Obsidian Flame default?')) {
      ambientAudioEngine.stop();
      setIsPlayingAudio(false);
      onUpdateConfig(DEFAULT_THEME_CONFIG);
    }
  };

  return (
    <div
      id="kairo-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0c0915] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-purple-900/40 shadow-2xl shadow-purple-950/40 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-purple-950/60 bg-slate-50/70 dark:bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md shadow-purple-600/20"
              style={{ backgroundColor: config.primaryColor }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Theme & Appearance Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                  Kairo Customizer
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize themes, custom backgrounds, color palettes, and fire animations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset all themes to Obsidian Flame default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-purple-950/60 bg-white dark:bg-[#0c0915] px-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>Theme Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'colors'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Colors & Styles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live-media')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'live-media'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Live Video & Audio</span>
            {(config.liveVideoUrl || config.liveAudioUrl || config.isAudioPlaying) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'background'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Wallpapers & Veil</span>
            {config.customWallpaperUrl && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fire')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'fire'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>Fire & Effects</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: THEME PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Handcrafted Theme Presets
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select a curated archetype with tailored colors, textures, and atmospheres
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {THEME_PRESETS.map((preset) => {
                  const isSelected = config.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`group relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/15 ring-2 ring-purple-500/40'
                          : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-purple-800/60 hover:bg-white dark:hover:bg-slate-850'
                      }`}
                    >
                      {/* Color swatch trio */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {preset.previewColors.map((c, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        {isSelected && (
                          <span className="ml-auto flex items-center justify-center h-5 w-5 rounded-full bg-purple-600 text-white text-xs">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-0.5">
                        {preset.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {preset.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: COLORS & STYLES */}
          {activeTab === 'colors' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Dark / Light Mode Switch */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Base Appearance Mode
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle high-contrast dark room aesthetics or clean daylight mode
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        ...config,
                        mode: 'dark',
                        presetId: 'custom',
                        customBackgroundColor: config.customBackgroundColor || '#07020d',
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      config.mode === 'dark'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        ...config,
                        mode: 'light',
                        presetId: 'custom',
                        customBackgroundColor: '#f8fafc',
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      config.mode === 'light'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Primary Accent Color Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Primary Accent Color
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Used for primary buttons, active tabs, recording badges, and key glows
                    </p>
                  </div>
                  {/* Native Color Picker & Hex preview */}
                  <div className="flex items-center gap-2">
                    <label className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer overflow-hidden">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: config.primaryColor }}
                      />
                    </label>
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      placeholder="#9333ea"
                      className="w-24 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase"
                    />
                  </div>
                </div>

                {/* Quick Swatch Chips */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACCENT_COLORS.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleColorChange('primaryColor', swatch.hex)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        config.primaryColor.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span>{swatch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Highlight Color */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Secondary Highlight Color
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Used for secondary accents, flame licks, and gradient wave tips
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer overflow-hidden">
                      <input
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: config.secondaryColor }}
                      />
                    </label>
                    <input
                      type="text"
                      value={config.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      placeholder="#c084fc"
                      className="w-24 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Canvas Background Color */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Canvas Background Tone
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Base shade for the underlying application canvas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer overflow-hidden">
                      <input
                        type="color"
                        value={config.customBackgroundColor || (config.mode === 'dark' ? '#07020d' : '#f8fafc')}
                        onChange={(e) => handleColorChange('customBackgroundColor', e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor:
                            config.customBackgroundColor || (config.mode === 'dark' ? '#07020d' : '#f8fafc'),
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={config.customBackgroundColor || (config.mode === 'dark' ? '#07020d' : '#f8fafc')}
                      onChange={(e) => handleColorChange('customBackgroundColor', e.target.value)}
                      className="w-24 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_BACKGROUND_COLORS.map((bg) => (
                    <button
                      key={bg.hex}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          presetId: 'custom',
                          customBackgroundColor: bg.hex,
                          mode: bg.dark ? 'dark' : 'light',
                        })
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        (config.customBackgroundColor || '').toLowerCase() === bg.hex.toLowerCase()
                          ? 'border-purple-500 ring-1 ring-purple-500 text-purple-700 dark:text-purple-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-700"
                        style={{ backgroundColor: bg.hex }}
                      />
                      <span>{bg.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Surface Border Radius & Card Glow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Card Corner Curvature
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sm', 'md', 'lg'] as const).map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => onUpdateConfig({ ...config, borderRadius: rad, presetId: 'custom' })}
                        className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-all cursor-pointer ${
                          config.borderRadius === rad
                            ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rad === 'sm' ? 'Modern 8px' : rad === 'md' ? 'Smooth 14px' : 'Curved 20px'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Card Border Luminescence
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'subtle', 'vibrant'] as const).map((glow) => (
                      <button
                        key={glow}
                        type="button"
                        onClick={() => onUpdateConfig({ ...config, cardGlow: glow, presetId: 'custom' })}
                        className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-all cursor-pointer ${
                          config.cardGlow === glow
                            ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {glow}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE VIDEO & AUDIO (MP4 / MP3) */}
          {activeTab === 'live-media' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* SECTION A: LIVE MP4 VIDEO BACKGROUNDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Film className="h-4 w-4 text-purple-500" />
                      <span>Live Video Background (MP4 / WebM)</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Looping ambient motion backdrops that run seamlessly behind your workspace
                    </p>
                  </div>
                  {config.liveVideoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          liveVideoUrl: undefined,
                          presetId: 'custom',
                        })
                      }
                      className="px-2.5 py-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove Video</span>
                    </button>
                  )}
                </div>

                {/* Curated Video Loops Gallery */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {CURATED_VIDEOS.map((vid) => {
                    const isSelected = config.liveVideoUrl === vid.videoUrl;
                    return (
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            ...config,
                            liveVideoUrl: vid.videoUrl,
                            contentScrimOpacity: Math.max(0.75, config.contentScrimOpacity ?? 0.75),
                            videoOpacity: config.videoOpacity ?? 0.55,
                            presetId: 'custom',
                          })
                        }
                        className={`group relative rounded-xl overflow-hidden aspect-video border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-purple-500 border-purple-500 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-purple-400'
                        }`}
                      >
                        <img
                          src={vid.thumbnail}
                          alt={vid.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-2">
                          <span className="text-[10px] font-bold text-white truncate drop-shadow">
                            {vid.name}
                          </span>
                          <span className="text-[9px] text-purple-300 truncate">
                            {vid.category}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] shadow">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white text-[9px]">
                          <Play className="h-2 w-2 fill-current" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Video File Upload & URL Paste */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-purple-500" />
                    <span>Upload Custom MP4 / WebM Video</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/*"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-purple-400 dark:border-purple-800 hover:border-purple-500 bg-white dark:bg-slate-900/80 text-xs font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose Video File (.mp4 / .webm)</span>
                      </button>
                    </div>

                    <form onSubmit={handleApplyCustomVideoUrl} className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste MP4 direct URL (https://...mp4)"
                        value={customVideoUrlInput}
                        onChange={(e) => setCustomVideoUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={!customVideoUrlInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  </div>
                </div>

                {/* Video Clarity Calibration Sliders */}
                {config.liveVideoUrl && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-purple-900/30 bg-purple-950/10">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Video Opacity
                        </span>
                        <span className="text-purple-500 font-mono">
                          {Math.round((config.videoOpacity ?? 0.55) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={config.videoOpacity ?? 0.55}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            videoOpacity: parseFloat(e.target.value),
                            presetId: 'custom',
                          })
                        }
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Control how intensely the video shines through the background
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Video Soft Blur
                        </span>
                        <span className="text-purple-500 font-mono">
                          {config.videoBlur ?? 1}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="1"
                        value={config.videoBlur ?? 1}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            videoBlur: parseInt(e.target.value, 10),
                            presetId: 'custom',
                          })
                        }
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Subtle blur prevents video movement from distracting your eyes
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: LIVE AMBIENT AUDIO SOUNDSCAPES */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-purple-950/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Music className="h-4 w-4 text-purple-500" />
                      <span>Live Ambient Audio (MP3 & Procedural Soundscapes)</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Soothing study soundscapes and customizable background music
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleAudioPlay}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-purple-600 text-white'
                          : 'border border-purple-400 dark:border-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pause Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Play Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Curated Soundscapes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CURATED_AUDIO.map((snd) => {
                    const isCurrent =
                      isPlayingAudio &&
                      (config.audioTrackTitle === snd.name ||
                        (!config.liveAudioUrl && snd.soundType === 'rain'));
                    return (
                      <div
                        key={snd.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {snd.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {snd.tagline}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectProceduralAudio(snd.soundType, snd.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50'
                          }`}
                        >
                          {isCurrent ? 'Playing' : 'Listen'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Upload MP3 or Enter Stream URL */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-purple-500" />
                    <span>Upload Custom MP3 / Audio Track</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/mp3,audio/wav,audio/aac,audio/m4a,audio/*"
                        onChange={handleAudioFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-purple-400 dark:border-purple-800 hover:border-purple-500 bg-white dark:bg-slate-900/80 text-xs font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose Audio File (.mp3 / .wav)</span>
                      </button>
                    </div>

                    <form onSubmit={handleApplyCustomAudioUrl} className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste MP3 stream URL (https://...mp3)"
                        value={customAudioUrlInput}
                        onChange={(e) => setCustomAudioUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={!customAudioUrlInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="p-4 rounded-xl border border-purple-900/30 bg-purple-950/10 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>Ambient Soundscape Volume</span>
                    </span>
                    <span className="text-purple-500 font-mono">
                      {Math.round(audioVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={handleAudioVolumeChange}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* SECTION C: READABILITY & BACKGROUND VEIL (DIMMER) */}
              <div className="p-4 rounded-2xl border border-purple-900/40 bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Content Readability & Background Veil</span>
                  </h4>
                  <span className="text-xs text-purple-400 font-mono">
                    {Math.round((config.contentScrimOpacity ?? 0.75) * 100)}% Dimmer
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Darkens whatever background video or texture is playing so that your notes, text, and buttons remain 100% sharp and easy to see.
                </p>

                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={config.contentScrimOpacity ?? 0.75}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      contentScrimOpacity: parseFloat(e.target.value),
                      presetId: 'custom',
                    })
                  }
                  className="w-full accent-purple-600 cursor-pointer"
                />

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ ...config, contentScrimOpacity: 0.90, presetId: 'custom' })
                    }
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    Ultra Dimmer (90%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ ...config, contentScrimOpacity: 0.75, presetId: 'custom' })
                    }
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    High-Contrast (75%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ ...config, contentScrimOpacity: 0.55, presetId: 'custom' })
                    }
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800"
                  >
                    Balanced (55%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ ...config, contentScrimOpacity: 0.35, presetId: 'custom' })
                    }
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800"
                  >
                    Subtle (35%)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM BACKGROUNDS */}
          {activeTab === 'background' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Procedural Pattern Selector */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Ambient Procedural Texture
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(
                    [
                      { id: 'fire', name: 'Dark Purple Fire', desc: 'Combustion flames & rising embers' },
                      { id: 'grid', name: 'Cyberpunk Grid', desc: 'Futuristic geometric mesh' },
                      { id: 'nebula', name: 'Cosmic Nebula', desc: 'Starfield dust clouds' },
                      { id: 'waves', name: 'Acoustic Waves', desc: 'Flowing audio topography' },
                      { id: 'none', name: 'Minimal Solid', desc: 'Clean distraction-free canvas' },
                    ] as const
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          backgroundPattern: pat.id as BackgroundPatternType,
                          presetId: 'custom',
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        config.backgroundPattern === pat.id
                          ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
                      }`}
                    >
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {pat.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {pat.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Wallpaper Library */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Curated Study Wallpapers
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      High-resolution backdrops calibrated for reading clarity
                    </p>
                  </div>
                  {config.customWallpaperUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          customWallpaperUrl: '',
                          presetId: 'custom',
                        })
                      }
                      className="px-2 py-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove Wallpaper</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {CURATED_WALLPAPERS.map((wp) => {
                    const isSelected = config.customWallpaperUrl === wp.fullUrl;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            ...config,
                            customWallpaperUrl: wp.fullUrl,
                            contentScrimOpacity: Math.max(0.75, config.contentScrimOpacity ?? 0.75),
                            wallpaperOpacity: config.wallpaperOpacity ?? 0.45,
                            presetId: 'custom',
                          })
                        }
                        className={`group relative rounded-xl overflow-hidden aspect-video border transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-purple-500 border-purple-500 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-purple-400'
                        }`}
                      >
                        <img
                          src={wp.thumbnail}
                          alt={wp.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                          <span className="text-[11px] font-medium text-white truncate drop-shadow">
                            {wp.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-xs shadow">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom Image or Enter URL */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-purple-500" />
                  <span>Use Your Own Custom Image</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl border border-dashed border-purple-400 dark:border-purple-800 hover:border-purple-500 bg-white dark:bg-slate-900/80 text-xs font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Image from Device</span>
                    </button>
                  </div>

                  {/* Image URL Input Form */}
                  <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL (https://...)"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!customUrlInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              </div>

              {/* Wallpaper Clarity Controls (Opacity & Blur) */}
              {config.customWallpaperUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-purple-900/30 bg-purple-950/10">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Wallpaper Opacity
                      </span>
                      <span className="text-purple-500 font-mono">
                        {Math.round(config.wallpaperOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={config.wallpaperOpacity}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          wallpaperOpacity: parseFloat(e.target.value),
                          presetId: 'custom',
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Lower opacity provides higher text contrast
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Soft Focus Blur
                      </span>
                      <span className="text-purple-500 font-mono">
                        {config.wallpaperBlur}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={config.wallpaperBlur}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          wallpaperBlur: parseInt(e.target.value, 10),
                          presetId: 'custom',
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Blurs sharp background lines to reduce eye fatigue
                    </span>
                  </div>
                </div>
              )}

              {/* Readability Veil & Card Backing */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-purple-950/60 bg-slate-50/70 dark:bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Background Dimmer & Note Readability</span>
                  </h4>
                  <span className="text-xs text-purple-500 font-mono">
                    {Math.round((config.contentScrimOpacity ?? 0.35) * 100)}% Dimmer
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Increase dimming if the wallpaper makes it hard to see text or lecture notes.
                </p>

                <input
                  type="range"
                  min="0.0"
                  max="0.90"
                  step="0.05"
                  value={config.contentScrimOpacity ?? 0.35}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      contentScrimOpacity: parseFloat(e.target.value),
                      presetId: 'custom',
                    })
                  }
                  className="w-full accent-purple-600 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ ...config, contentScrimOpacity: 0.75, presetId: 'custom' })
                      }
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                    >
                      Dark Veil (75%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ ...config, contentScrimOpacity: 0.35, presetId: 'custom' })
                      }
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      Balanced (35%)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Cards:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          cardStyle: config.cardStyle === 'frosted' ? 'solid' : 'frosted',
                          presetId: 'custom',
                        })
                      }
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-purple-400 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium cursor-pointer"
                    >
                      {config.cardStyle === 'frosted' ? 'Frosted Glass' : 'Solid Opaque (High Contrast)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FIRE & MOTION EFFECTS */}
          {activeTab === 'fire' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Fire Animation Intensity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-purple-500" />
                      <span>Dark Purple Fire Combustion Intensity</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Controls particle velocity, combustion rate, and upward thermal draft
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      { id: 'off', name: 'Disabled (Off)', desc: 'Zero particles, saves battery' },
                      { id: 'subtle', name: 'Subtle Embers', desc: 'Gentle occasional sparks' },
                      { id: 'normal', name: 'Standard Flame', desc: 'Balanced mystic dark purple fire' },
                      { id: 'blazing', name: 'Blazing Infernal', desc: 'High thermal heat & rapid embers' },
                    ] as const
                  ).map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          fireIntensity: lvl.id,
                          presetId: 'custom',
                          backgroundPattern: lvl.id === 'off' ? config.backgroundPattern : 'fire',
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        config.fireIntensity === lvl.id
                          ? 'border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
                      }`}
                    >
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {lvl.name}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {lvl.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ember Density Slider */}
              {config.fireIntensity !== 'off' && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Floating Ember Particle Count
                    </span>
                    <span className="text-purple-500 font-mono">
                      {config.fireEmberCount} particles
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="65"
                    step="5"
                    value={config.fireEmberCount}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        fireEmberCount: parseInt(e.target.value, 10),
                        presetId: 'custom',
                      })
                    }
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              )}

              {/* Base Flames Toggle */}
              {config.fireIntensity !== 'off' && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Multi-Layer Ground Flame Tongues
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Renders flickering stylized flame silhouettes along the canvas base
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        ...config,
                        showBaseFlames: !config.showBaseFlames,
                        presetId: 'custom',
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      config.showBaseFlames
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {config.showBaseFlames ? 'Enabled' : 'Hidden'}
                  </button>
                </div>
              )}

              {/* Replay Intro Animation */}
              {onReplayIntro && (
                <div className="p-4 rounded-xl border border-purple-900/40 bg-purple-950/20 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      <span>Replay Kairo Intro Animation</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Preview the full screen opening cinematic with dark purple flames
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReplayIntro();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 text-white text-xs font-medium shadow-md shadow-purple-950/40 transition-all cursor-pointer"
                  >
                    Play Intro
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-purple-950/60 bg-slate-50/70 dark:bg-purple-950/20">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Changes save and update your workspace live</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
