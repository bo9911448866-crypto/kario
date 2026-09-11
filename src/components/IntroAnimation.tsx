import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, ArrowRight, Flame } from 'lucide-react';
import { DarkPurpleFire } from './DarkPurpleFire';

interface IntroAnimationProps {
  onComplete: () => void;
  autoDismissDelay?: number;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  onComplete,
  autoDismissDelay = 2600,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [autoDismissDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const soundBars = [16, 28, 44, 20, 36, 48, 24, 38, 18];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="kairo-intro-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07020d] text-slate-100 overflow-hidden select-none cursor-pointer"
          onClick={handleDismiss}
        >
          {/* Atmospheric Dark Purple Fire Backdrop Canvas */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <DarkPurpleFire
              intensity="blazing"
              emberCount={45}
              interactive={true}
              className="w-full h-full"
            />
          </div>

          {/* Deep Ambient Radial Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.3, 1.1], opacity: [0.35, 0.6, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-950 via-violet-900/40 to-fuchsia-950/40 blur-3xl pointer-events-none"
            />
            <div className="absolute inset-0 bg-[radial-gradient(#581c87_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
          </div>

          {/* Top Controls: Flame Badge & Skip Intro */}
          <div className="absolute top-6 inset-x-6 z-20 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 backdrop-blur-md shadow-lg shadow-purple-950/50 text-[11px] font-medium text-purple-300">
              <Flame className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              <span>Dark Purple Flame</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-purple-800/40 text-xs font-medium text-purple-200 hover:text-white hover:bg-purple-950/70 hover:border-purple-600 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-lg shadow-purple-950/30"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Central Animated Composition */}
          <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
            {/* Pulsing Dark Purple Fire Emblem */}
            <div className="relative flex items-center justify-center mb-8">
              {/* Concentric Flame Wave Rings */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: [0.9, 1.5, 2.0], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border border-purple-500/40 pointer-events-none"
              />
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: [0.9, 1.4, 1.7], opacity: [0.7, 0.35, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 0.45, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border border-fuchsia-500/50 pointer-events-none"
              />

              {/* Glowing Icon Core with Dark Purple Flame Gradient */}
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 0.1 }}
                className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-950 via-purple-700 to-violet-600 text-white shadow-2xl shadow-purple-600/50 ring-2 ring-purple-400/40"
              >
                <Mic className="h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(243,232,255,0.7)]" />

                {/* Dark Purple Fire Sparkle Crest */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-300 text-slate-950 shadow-lg shadow-purple-500/60 ring-2 ring-[#07020d]"
                >
                  <Flame className="h-4 w-4 text-purple-950" />
                </motion.div>
              </motion.div>
            </div>

            {/* Dark Purple Flame Visualizer Bars */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center justify-center gap-1.5 h-10 mb-6 px-4"
            >
              {soundBars.map((height, i) => (
                <motion.span
                  key={i}
                  initial={{ height: 6 }}
                  animate={{
                    height: [6, height, 10, height * 0.75, 6],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: 'easeInOut',
                  }}
                  className="w-1.5 rounded-full bg-gradient-to-t from-purple-900 via-purple-500 to-fuchsia-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                />
              ))}
            </motion.div>

            {/* Brand Title "KAIRO" with Dark Purple Flame Glow */}
            <motion.div
              initial={{ opacity: 0, y: 16, letterSpacing: '0.35em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.22em' }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mb-2 relative"
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-purple-100 via-violet-200 to-fuchsia-300 drop-shadow-[0_0_24px_rgba(168,85,247,0.5)]">
                KAIRO
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-xs sm:text-sm font-medium text-purple-300/90 tracking-wide"
            >
              Intelligent Audio Notes & Academic AI Summaries
            </motion.p>

            {/* Hint / Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-8 flex flex-col items-center gap-2 w-48"
            >
              <div className="w-full h-1.5 bg-purple-950/80 rounded-full overflow-hidden border border-purple-900/40">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: autoDismissDelay / 1000, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-purple-700 via-fuchsia-500 to-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                />
              </div>
              <span className="text-[11px] text-purple-400/80 font-mono tracking-wide">
                tap anywhere to continue
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
