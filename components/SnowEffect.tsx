import React, { useEffect, useMemo, memo } from 'react';

/**
 * Performance-optimized snow effect using CSS animations.
 * - Uses CSS transforms (GPU-accelerated) instead of JS-driven animation
 * - Reduces reflows/repaints by using transform instead of top/left
 * - Uses will-change hint for compositor optimization
 * - Memoized to prevent unnecessary re-renders
 * - Configurable intensity levels
 */

export interface SnowSettings {
  intensity: 'light' | 'normal' | 'heavy' | 'blizzard';
}

const INTENSITY_MAP = {
  light: 25,
  normal: 50,
  heavy: 100,
  blizzard: 180,
};

interface Snowflake {
  id: number;
  size: number;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
  drift: number;
}

// Generate snowflake data
const generateSnowflakes = (count: number): Snowflake[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 8 + Math.random() * 12, // 8-20 seconds to fall
    opacity: 0.5 + Math.random() * 0.5,
    drift: -15 + Math.random() * 30, // Horizontal drift
  }));
};

// CSS keyframes injected once
const injectStyles = () => {
  const styleId = 'snowflake-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes snowfall {
      0% {
        transform: translate3d(0, -10vh, 0) rotate(0deg);
      }
      100% {
        transform: translate3d(var(--drift), 110vh, 0) rotate(360deg);
      }
    }

    @keyframes snowflake-shimmer {
      0%, 100% { opacity: var(--base-opacity); }
      50% { opacity: calc(var(--base-opacity) * 0.6); }
    }

    .snowflake {
      position: fixed;
      top: 0;
      background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0.8) 40%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      will-change: transform;
      animation: 
        snowfall var(--duration) linear infinite,
        snowflake-shimmer 3s ease-in-out infinite;
      animation-delay: var(--delay);
      z-index: 9999;
    }

    .snow-container {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
};

const SnowflakeElement: React.FC<{ flake: Snowflake }> = memo(({ flake }) => (
  <div
    className="snowflake"
    style={{
      left: `${flake.left}%`,
      width: `${flake.size}px`,
      height: `${flake.size}px`,
      '--duration': `${flake.duration}s`,
      '--delay': `${-flake.delay}s`,
      '--drift': `${flake.drift}px`,
      '--base-opacity': flake.opacity,
      boxShadow: `0 0 ${flake.size * 2}px ${flake.size / 2}px rgba(255,255,255,0.3)`,
    } as React.CSSProperties}
  />
));

SnowflakeElement.displayName = 'SnowflakeElement';

interface SnowEffectProps {
  settings?: Partial<SnowSettings>;
}

const SnowEffect: React.FC<SnowEffectProps> = memo(({ settings }) => {
  const intensity = settings?.intensity || 'normal';
  const snowflakeCount = INTENSITY_MAP[intensity];
  
  // Generate snowflakes based on intensity
  const snowflakes = useMemo(() => generateSnowflakes(snowflakeCount), [snowflakeCount]);

  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <div className="snow-container" aria-hidden="true">
      {snowflakes.map((flake) => (
        <SnowflakeElement key={flake.id} flake={flake} />
      ))}
    </div>
  );
});

SnowEffect.displayName = 'SnowEffect';

export default SnowEffect;
