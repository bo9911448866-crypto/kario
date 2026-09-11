import React, { useEffect, useRef } from 'react';

interface DarkPurpleFireProps {
  className?: string;
  intensity?: 'off' | 'subtle' | 'normal' | 'blazing';
  showBaseFlames?: boolean;
  emberCount?: number;
  height?: string | number;
  interactive?: boolean;
  accentColor?: string;
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  colorType: number; // 0: core hot violet, 1: rich purple, 2: dark obsidian purple
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
  wobble: number;
}

export const DarkPurpleFire: React.FC<DarkPurpleFireProps> = ({
  className = '',
  intensity = 'normal',
  showBaseFlames = true,
  emberCount = 35,
  height = '100%',
  interactive = true,
  accentColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (intensity === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 400);
    let heightPx = (canvas.height = canvas.offsetHeight || 300);

    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!canvas) return;
        for (const entry of entries) {
          if (entry.contentRect.width && entry.contentRect.height) {
            width = canvas.width = Math.floor(entry.contentRect.width);
            heightPx = canvas.height = Math.floor(entry.contentRect.height);
          }
        }
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Particle arrays
    const fireParticles: FireParticle[] = [];
    const embers: EmberParticle[] = [];

    // Configuration based on intensity
    const spawnRate = intensity === 'blazing' ? 8 : intensity === 'subtle' ? 2 : 5;
    const speedMult = intensity === 'blazing' ? 1.3 : intensity === 'subtle' ? 0.7 : 1;
    const baseEmberTotal = intensity === 'blazing' ? emberCount * 1.5 : emberCount;

    // Palette: dark purple fire gradient
    const fireColors = [
      { r: 243, g: 232, b: 255, a: 0.9 }, // 0: Hot lavender core (#f3e8ff)
      { r: 192, g: 132, b: 252, a: 0.8 }, // 1: Neon violet (#c084fc)
      { r: 147, g: 51, b: 234, a: 0.7 },  // 2: Electric purple (#9333ea)
      { r: 88, g: 28, b: 135, a: 0.5 },   // 3: Dark violet (#581c87)
      { r: 46, g: 16, b: 101, a: 0.3 },   // 4: Deep obsidian purple (#2e1065)
    ];

    const spawnFireParticle = (originX?: number, originY?: number) => {
      const x = originX !== undefined ? originX : width / 2 + (Math.random() - 0.5) * (width * 0.55);
      const y = originY !== undefined ? originY : heightPx - 10 + (Math.random() - 0.5) * 15;
      const maxLife = 35 + Math.random() * 35;
      const maxRadius = (16 + Math.random() * 26) * (intensity === 'blazing' ? 1.3 : 1);

      fireParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(1.8 + Math.random() * 2.6) * speedMult,
        radius: maxRadius * 0.4,
        maxRadius,
        life: 0,
        maxLife,
        wobbleSpeed: 0.04 + Math.random() * 0.08,
        wobbleOffset: Math.random() * Math.PI * 2,
        colorType: Math.random() < 0.25 ? 0 : Math.random() < 0.65 ? 1 : 2,
      });
    };

    const spawnEmber = () => {
      embers.push({
        x: width / 2 + (Math.random() - 0.5) * (width * 0.75),
        y: heightPx - Math.random() * 30,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -(1.5 + Math.random() * 3.8) * speedMult,
        size: 1.2 + Math.random() * 2.8,
        life: 0,
        maxLife: 50 + Math.random() * 60,
        opacity: 0.4 + Math.random() * 0.6,
        wobble: Math.random() * Math.PI * 2,
      });
    };

    // Pre-populate some embers
    for (let i = 0; i < baseEmberTotal; i++) {
      spawnEmber();
      const last = embers[embers.length - 1];
      if (last) {
        last.y = Math.random() * heightPx;
        last.life = Math.random() * last.maxLife;
      }
    }

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, heightPx);

      // Mouse interactive spark spawn
      if (mousePosRef.current && interactive) {
        const { x, y } = mousePosRef.current;
        for (let i = 0; i < 2; i++) {
          spawnFireParticle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
        }
      }

      // Spawn regular fire particles
      for (let i = 0; i < spawnRate; i++) {
        spawnFireParticle();
      }

      // Keep ember count filled
      if (embers.length < baseEmberTotal && Math.random() < 0.6) {
        spawnEmber();
      }

      // Draw bottom ambient dark purple glow
      const baseGlow = ctx.createRadialGradient(
        width / 2,
        heightPx - 10,
        10,
        width / 2,
        heightPx - 10,
        width * 0.5
      );
      baseGlow.addColorStop(0, 'rgba(147, 51, 234, 0.45)');
      baseGlow.addColorStop(0.4, 'rgba(88, 28, 135, 0.3)');
      baseGlow.addColorStop(0.8, 'rgba(46, 16, 101, 0.15)');
      baseGlow.addColorStop(1, 'rgba(15, 5, 29, 0)');
      ctx.fillStyle = baseGlow;
      ctx.fillRect(0, heightPx - heightPx * 0.45, width, heightPx * 0.45);

      // Set blend mode for hot fire combustion
      ctx.globalCompositeOperation = 'screen';

      // Update & Draw Fire Particles
      for (let i = fireParticles.length - 1; i >= 0; i--) {
        const p = fireParticles[i];
        p.life++;

        if (p.life >= p.maxLife) {
          fireParticles.splice(i, 1);
          continue;
        }

        const progress = p.life / p.maxLife;
        p.y += p.vy;
        p.x += p.vx + Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * 0.8;

        // Radius expands quickly then tapers off
        const currentRadius =
          progress < 0.2
            ? p.maxRadius * (progress / 0.2)
            : p.maxRadius * (1 - (progress - 0.2) / 0.8);

        if (currentRadius <= 0.5) continue;

        // Color transition: white/lavender -> electric violet -> deep dark purple
        let cStart = fireColors[0];
        let cEnd = fireColors[2];

        if (p.colorType === 1) {
          cStart = fireColors[1];
          cEnd = fireColors[3];
        } else if (p.colorType === 2) {
          cStart = fireColors[2];
          cEnd = fireColors[4];
        }

        const alpha = (1 - progress) * 0.75;
        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius);

        radGrad.addColorStop(
          0,
          `rgba(${cStart.r}, ${cStart.g}, ${cStart.b}, ${alpha * cStart.a})`
        );
        radGrad.addColorStop(
          0.4,
          `rgba(147, 51, 234, ${alpha * 0.6})`
        );
        radGrad.addColorStop(
          0.8,
          `rgba(88, 28, 135, ${alpha * 0.3})`
        );
        radGrad.addColorStop(
          1,
          `rgba(46, 16, 101, 0)`
        );

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & Draw Rising Embers
      for (let i = embers.length - 1; i >= 0; i--) {
        const em = embers[i];
        em.life++;

        if (em.life >= em.maxLife || em.y < 0) {
          embers.splice(i, 1);
          continue;
        }

        const prog = em.life / em.maxLife;
        em.y += em.vy;
        em.x += em.vx + Math.sin(time * 3 + em.wobble) * 0.9;

        const currentOpacity = (1 - prog) * em.opacity;
        const pulse = 0.8 + 0.4 * Math.sin(time * 5 + em.wobble);

        // Glowing ember spark
        const emberGrad = ctx.createRadialGradient(
          em.x,
          em.y,
          0,
          em.x,
          em.y,
          em.size * 2.2 * pulse
        );
        emberGrad.addColorStop(0, `rgba(243, 232, 255, ${currentOpacity})`);
        emberGrad.addColorStop(0.3, `rgba(192, 132, 252, ${currentOpacity * 0.85})`);
        emberGrad.addColorStop(0.7, `rgba(147, 51, 234, ${currentOpacity * 0.5})`);
        emberGrad.addColorStop(1, `rgba(88, 28, 135, 0)`);

        ctx.fillStyle = emberGrad;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size * 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current = null;
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [intensity, emberCount, interactive, accentColor]);

  if (intensity === 'off') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden pointer-events-none ${className}`}
      style={{ height }}
    >
      {/* Dynamic Animated Canvas for Particles & Embers */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
      />

      {/* Stylized Multi-Layer SVG Flame Tongues (Flickering undulating dark purple fire) */}
      {showBaseFlames && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden h-36 flex items-end">
          {/* Back flame layer - Deep Obsidian Purple */}
          <svg
            className="absolute bottom-0 w-full h-32 opacity-70 animate-pulse text-purple-950/80"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            style={{ animationDuration: '3.2s' }}
          >
            <path
              d="M0,120 L0,50 Q100,10 200,60 T400,45 T600,65 T800,35 T1000,55 T1200,40 L1200,120 Z"
              fill="currentColor"
            />
          </svg>

          {/* Middle flame layer - Royal Dark Purple */}
          <svg
            className="absolute bottom-0 w-full h-24 opacity-80 text-purple-900/70"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 L0,70 Q150,20 300,75 T600,40 T900,70 T1200,50 L1200,120 Z"
              fill="currentColor"
            />
          </svg>

          {/* Front flame layer - Electric Neon Violet Flame Licks */}
          <svg
            className="absolute bottom-0 w-full h-16 opacity-60 text-purple-600/50"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 L0,85 Q120,45 240,90 T480,60 T720,85 T960,55 T1200,75 L1200,120 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
