import React, { useEffect, useMemo, memo } from 'react';

/**
 * Clean Snow Effect using CSS animations only.
 * - GPU-accelerated transforms
 * - No visual bugs
 * - Configurable intensity
 */

export interface SnowSettings {
  intensity: 'light' | 'normal' | 'heavy' | 'blizzard';
  enableMouseInteraction?: boolean;
  enableAccumulation?: boolean;
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
    duration: 8 + Math.random() * 12,
    opacity: 0.5 + Math.random() * 0.5,
    drift: -15 + Math.random() * 30,
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
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
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
