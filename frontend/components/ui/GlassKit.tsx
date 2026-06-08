'use client';

import { useEffect } from 'react';

/**
 * GlassKit — mounts liquid-glass interactive effects across the whole app:
 *   • Ripple on click  (.glass, .glass-card, .glass-btn, .btn-primary, .btn-secondary, .btn-ghost)
 *   • Parallax tilt on hover  (.glass, .glass-card)
 *   • Toast region anchor  (#toast-region)
 *   • Theme toggle  (#theme-toggle)
 *
 * Drop <GlassKit /> once anywhere in the layout body.
 */
export function GlassKit() {
  useEffect(() => {
    /* ── Ripple ─────────────────────────────────────────────────────────── */
    const RIPPLE_SEL =
      '.glass, .glass-card, .glass-btn, .btn-primary, .btn-secondary, .btn-ghost, .notif';

    function spawnRipple(el: HTMLElement, evt: MouseEvent) {
      if (el.querySelectorAll('[data-ripple]').length > 3) return;

      const ripple = document.createElement('span');
      ripple.setAttribute('data-ripple', '');

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;

      Object.assign(ripple.style, {
        position:     'absolute',
        left:         `${evt.clientX - rect.left  - size / 2}px`,
        top:          `${evt.clientY - rect.top   - size / 2}px`,
        width:        `${size}px`,
        height:       `${size}px`,
        borderRadius: '50%',
        background:   'rgba(255,255,255,0.14)',
        transform:    'scale(0)',
        pointerEvents:'none',
        animation:    'ripple 650ms ease-out forwards',
        zIndex:       '9',
      });

      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    const onDocClick = (evt: MouseEvent) => {
      const el = (evt.target as Element).closest(RIPPLE_SEL) as HTMLElement | null;
      if (el) spawnRipple(el, evt);
    };

    document.addEventListener('click', onDocClick);

    /* ── Parallax tilt ──────────────────────────────────────────────────── */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch   = window.matchMedia('(hover: none)').matches;
    const bound   = new WeakSet<HTMLElement>();

    function bindTilt(card: HTMLElement) {
      if (bound.has(card)) return;
      bound.add(card);

      card.style.transformStyle = 'preserve-3d';

      card.addEventListener('mousemove', (evt) => {
        const rect = card.getBoundingClientRect();
        const dx   = (evt.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
        const dy   = (evt.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
        card.style.transform  = `translateY(-5px) scale(1.01) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
        card.style.transition = 'none';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform  = '';
        card.style.transition = '';
      });
    }

    function initTilt() {
      if (reduced || touch) return;
      document.querySelectorAll<HTMLElement>('.glass-card, .glass').forEach(bindTilt);
    }

    initTilt();

    const observer = new MutationObserver(initTilt);
    observer.observe(document.body, { childList: true, subtree: true });

    /* ── Theme toggle ───────────────────────────────────────────────────── */
    const themeBtn = document.getElementById('theme-toggle');
    const THEME_KEY = 'glass-theme';
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    const onThemeClick = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    };

    themeBtn?.addEventListener('click', onThemeClick);

    return () => {
      document.removeEventListener('click', onDocClick);
      observer.disconnect();
      themeBtn?.removeEventListener('click', onThemeClick);
    };
  }, []);

  return (
    <div
      id="toast-region"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    />
  );
}
