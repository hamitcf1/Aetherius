import React, { useEffect } from 'react';

// Simple snowflake generator for Skyrim-style snow
const SNOWFLAKE_COUNT = 60;

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const SnowEffect: React.FC = () => {
  useEffect(() => {
    const snowflakes: HTMLDivElement[] = [];
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.className = 'skyrim-snow-effect';
    document.body.appendChild(container);

    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      const flake = document.createElement('div');
      flake.style.position = 'absolute';
      flake.style.left = `${random(0, 100)}vw`;
      flake.style.top = `${random(-10, 100)}vh`;
      flake.style.width = `${random(2, 6)}px`;
      flake.style.height = flake.style.width;
      flake.style.background = 'white';
      flake.style.borderRadius = '50%';
      flake.style.opacity = String(random(0.7, 1));
      flake.style.filter = 'blur(0.5px)';
      flake.style.boxShadow = '0 0 8px 2px #fff8';
      flake.style.transition = 'top 0.2s linear';
      flake.style.pointerEvents = 'none';
      flake.style.zIndex = 'inherit';
      container.appendChild(flake);
      snowflakes.push(flake);
    }

    let running = true;
    function animate() {
      if (!running) return;
      snowflakes.forEach(flake => {
        let top = parseFloat(flake.style.top);
        let speed = (flake as any)._speed || 0.4;
        top += speed;
        if (top > 100) {
          // Instantly move to above the viewport, randomize left and speed, fade in
          top = random(-10, 0);
          flake.style.transition = 'none';
          flake.style.top = `${top}vh`;
          flake.style.left = `${random(0, 100)}vw`;
          (flake as any)._speed = random(0.2, 0.7);
          flake.style.opacity = '0';
          // Force reflow for transition
          void flake.offsetHeight;
          flake.style.transition = 'top 0.2s linear, opacity 0.5s';
          setTimeout(() => {
            flake.style.opacity = String(random(0.7, 1));
          }, 10);
        } else {
          flake.style.top = `${top}vh`;
        }
      });
      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      running = false;
      container.remove();
    };
  }, []);

  return null;
};

export default SnowEffect;
