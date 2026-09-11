import React, { useEffect, useRef, useState } from 'react';
import { CustomThemeConfig } from '../types';
import { DarkPurpleFire } from './DarkPurpleFire';

interface BackgroundAtmosphereProps {
  config: CustomThemeConfig;
}

export const BackgroundAtmosphere: React.FC<BackgroundAtmosphereProps> = ({ config }) => {
  const isDark = config.mode === 'dark';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // High-contrast readability floor: minimum 0.65, default 0.85
  // Ensures cards, text, and inputs remain crisp and 100% legible on every theme
  const effectiveScrim = Math.max(
    0.60,
    config.contentScrimOpacity ?? (isDark ? 0.85 : 0.80)
  );
  const bgColor = config.customBackgroundColor || (isDark ? '#07020d' : '#f8fafc');

  // Explicitly ensure autoplay works reliably in all browsers/iframes
  useEffect(() => {
    setVideoLoadError(false);
    setIsVideoLoaded(false);

    if (config.liveVideoUrl && videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;

      const attemptPlay = () => {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Live wallpaper autoplay prevented or waiting for user interaction:', err?.message || 'blocked');
          });
        }
      };

      attemptPlay();
      videoEl.addEventListener('canplay', attemptPlay, { once: true });
    }
  }, [config.liveVideoUrl]);

  return (
    <div
      id="kairo-background-atmosphere"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. Live Video Background (MP4 / WebM) */}
      {config.liveVideoUrl && !videoLoadError && (
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={videoRef}
            key={config.liveVideoUrl}
            src={config.liveVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
            onError={() => {
              console.warn('Video failed to load or play:', config.liveVideoUrl);
              setVideoLoadError(true);
            }}
            className={`w-full h-full object-cover object-center transform scale-105 transition-all duration-700 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              opacity: isVideoLoaded ? (config.videoOpacity ?? 0.55) : 0,
              filter: `blur(${config.videoBlur ?? 1}px)`,
            }}
          />
        </div>
      )}

      {/* 2. Custom Wallpaper Image Layer (if provided and no video, or if video failed) */}
      {(!config.liveVideoUrl || videoLoadError) && config.customWallpaperUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={config.customWallpaperUrl}
            alt=""
            className="w-full h-full object-cover object-center transform scale-105 transition-all duration-700"
            style={{
              opacity: config.wallpaperOpacity ?? 0.45,
              filter: `blur(${config.wallpaperBlur ?? 2}px)`,
            }}
          />
        </div>
      )}

      {/* 3. Procedural Pattern Layers (flames, grid, nebula, waves) */}
      {config.backgroundPattern === 'fire' && config.fireIntensity !== 'off' && (
        <DarkPurpleFire
          intensity={config.fireIntensity}
          showBaseFlames={config.showBaseFlames}
          emberCount={config.fireEmberCount}
          accentColor={config.primaryColor}
          className={`w-full h-full transition-opacity duration-700 ${
            isDark ? 'opacity-35 sm:opacity-45' : 'opacity-20 sm:opacity-25'
          }`}
        />
      )}

      {config.backgroundPattern === 'grid' && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundImage: isDark
              ? `linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
            opacity: 0.7,
          }}
        >
          {/* Subtle Cyberpunk Accent Crosses */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(${config.primaryColor}33 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
            }}
          />
        </div>
      )}

      {config.backgroundPattern === 'nebula' && (
        <div className="absolute inset-0">
          {/* Cosmic aura blobs */}
          <div
            className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: `${config.primaryColor}22` }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: `${config.secondaryColor}1f` }}
          />
          {/* Distant starlight speckles */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 0.75px, transparent 0.75px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>
      )}

      {config.backgroundPattern === 'waves' && (
        <div className="absolute inset-0 opacity-30">
          <svg
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 1440 800"
          >
            <path
              d="M0,160 C320,300, 420,100, 720,220 C1020,340, 1120,120, 1440,240 L1440,800 L0,800 Z"
              fill="none"
              stroke={config.primaryColor}
              strokeWidth="1.5"
              strokeOpacity="0.25"
            />
            <path
              d="M0,320 C320,440, 520,240, 820,380 C1120,500, 1280,260, 1440,360 L1440,800 L0,800 Z"
              fill="none"
              stroke={config.secondaryColor}
              strokeWidth="1.2"
              strokeOpacity="0.2"
            />
            <path
              d="M0,480 C360,580, 580,380, 900,520 C1200,640, 1340,420, 1440,500 L1440,800 L0,800 Z"
              fill="none"
              stroke={config.primaryColor}
              strokeWidth="1"
              strokeOpacity="0.15"
            />
          </svg>
        </div>
      )}

      {/* 4. Readability Scrim Veil: Full contrast shield protecting cards & text across all themes */}
      <div
        className="absolute inset-0 transition-all duration-500 pointer-events-none"
        style={{
          background: isDark
            ? `radial-gradient(ellipse at 50% 35%, rgba(7, 2, 13, ${Math.min(0.98, effectiveScrim + 0.10)}) 0%, rgba(7, 2, 13, ${effectiveScrim}) 100%)`
            : `radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, ${Math.min(0.98, effectiveScrim + 0.10)}) 0%, rgba(248, 250, 252, ${effectiveScrim}) 100%)`,
        }}
      />
    </div>
  );
};
