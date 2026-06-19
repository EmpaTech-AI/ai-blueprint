'use client';

import { useEffect, useRef } from 'react';

export function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const count = 80;
    const stars: Array<{ el: HTMLDivElement; initialY: number; speed: number }> = [];

    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'star';

      const x        = Math.random() * 100;
      const y        = Math.random() * 100;
      const isStatic = Math.random() < 0.3;
      const z        = isStatic ? 0 : 0.2 + Math.random() * 0.6;
      const size     = isStatic ? 1 + Math.random() * 0.8 : 1 + Math.random() * 2;

      s.style.left   = `${x}%`;
      s.style.top    = `${y}%`;
      s.style.width  = `${size}px`;
      s.style.height = `${size}px`;
      s.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
      s.style.animationDelay = `${Math.random() * 5}s`;

      container.appendChild(s);
      stars.push({ el: s, initialY: y, speed: z });
    }

    // Smooth scroll — replicates Lenis 1.0 easing without the package
    let smoothScroll = window.scrollY;
    let rawScroll    = window.scrollY;
    let prevSmooth   = smoothScroll;
    let rafId: number;

    const onScroll = () => { rawScroll = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    function updateStars(scroll: number, velocity: number) {
      const stretch = Math.max(1, Math.min(1 + Math.abs(velocity) * 0.15, 4));
      for (const star of stars) {
        if (star.speed === 0) {
          star.el.style.transform = 'scaleY(1)';
          continue;
        }
        let pos = (star.initialY - scroll * star.speed * 0.05) % 100;
        if (pos < 0) pos += 100;
        star.el.style.top       = `${pos}%`;
        star.el.style.transform = `scaleY(${stretch})`;
      }
    }

    function loop() {
      prevSmooth    = smoothScroll;
      const diff    = rawScroll - smoothScroll;
      smoothScroll += diff * 0.085; // lerp factor ≈ Lenis duration 1.2
      if (Math.abs(diff) < 0.05) smoothScroll = rawScroll;
      const velocity = smoothScroll - prevSmooth;
      updateStars(smoothScroll, velocity);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      while (container.firstChild) container.removeChild(container.firstChild);
    };
  }, []);

  return (
    <div
      id="star-container"
      ref={containerRef}
      aria-hidden="true"
    />
  );
}
