'use client';

import { useEffect } from 'react';

/* ─── Toast — exported for programmatic use ─────────────────────────────── */

const TOAST_ICONS: Record<string, string> = {
  success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
};
const TOAST_LABELS: Record<string, string> = {
  success: 'Success', error: 'Error', warning: 'Warning', info: 'Info',
};

export const GlassToast = {
  show(type: string, title?: string, desc?: string, duration?: number) {
    const region = document.getElementById('toast-region');
    if (!region) return;

    const toast = document.createElement('div');
    toast.className = `glass glass-toast glass-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
      `<span class="glass-toast__icon" aria-hidden="true">${TOAST_ICONS[type] ?? 'ℹ'}</span>` +
      `<div class="glass-toast__body">` +
      `<div class="glass-toast__title">${title ?? TOAST_LABELS[type] ?? type}</div>` +
      (desc ? `<div class="glass-toast__desc">${desc}</div>` : '') +
      `</div>` +
      `<span class="glass-toast__close" aria-label="Dismiss">✕</span>`;

    region.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('is-exiting');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.glass-toast__close')?.addEventListener('click', dismiss);
    toast.addEventListener('click', dismiss);
    if (duration !== 0) setTimeout(dismiss, duration ?? 4000);
  },
};

/* ─── Focus utilities ────────────────────────────────────────────────────── */

function getFocusable(container: Element): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])',
    ),
  );
}

function trapFocus(container: Element, evt: KeyboardEvent) {
  const focusable = getFocusable(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (evt.key === 'Tab') {
    if (evt.shiftKey && document.activeElement === first) {
      evt.preventDefault(); last.focus();
    } else if (!evt.shiftKey && document.activeElement === last) {
      evt.preventDefault(); first.focus();
    }
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function GlassKit() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    /* ── Theme toggle ────────────────────────────────────────────────── */
    const THEME_KEY = 'glass-theme';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    const themeBtn = document.getElementById('theme-toggle');
    const onThemeClick = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    };
    themeBtn?.addEventListener('click', onThemeClick);
    cleanups.push(() => themeBtn?.removeEventListener('click', onThemeClick));

    /* ── Ripple (click feedback on interactive surfaces) ─────────────── */
    const RIPPLE_SEL = '.glass-btn, .glass-card, .glass, .btn-primary, .btn-secondary, .btn-ghost, .notif';

    function spawnRipple(el: HTMLElement, evt: MouseEvent) {
      if (el.querySelectorAll('[data-ripple]').length > 3) return;
      const ripple = document.createElement('span');
      ripple.setAttribute('data-ripple', '');
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.2;
      Object.assign(ripple.style, {
        position:     'absolute',
        left:         `${evt.clientX - rect.left - size / 2}px`,
        top:          `${evt.clientY - rect.top  - size / 2}px`,
        width:        `${size}px`,
        height:       `${size}px`,
        borderRadius: '50%',
        background:   'rgba(255,255,255,0.18)',
        transform:    'scale(0)',
        pointerEvents:'none',
        animation:    'ripple 600ms ease-out forwards',
        zIndex:       '999',
      });
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    const onDocRipple = (evt: MouseEvent) => {
      const el = (evt.target as Element).closest(RIPPLE_SEL) as HTMLElement | null;
      if (el) spawnRipple(el, evt);
    };
    document.addEventListener('click', onDocRipple);
    cleanups.push(() => document.removeEventListener('click', onDocRipple));

    /* ── Accordion (.glass-accordion) ───────────────────────────────── */
    document.querySelectorAll('.glass-accordion').forEach((container) => {
      container.querySelectorAll<HTMLElement>('.glass-accordion-trigger').forEach((trigger) => {
        const onTriggerClick = () => {
          const item = trigger.closest('.glass-accordion-item');
          if (!item) return;
          const isOpen = item.classList.contains('is-open');
          item.classList.toggle('is-open', !isOpen);
          trigger.setAttribute('aria-expanded', String(!isOpen));
        };
        const onTriggerKey = (evt: Event) => {
          const k = (evt as KeyboardEvent).key;
          if (k === 'Enter' || k === ' ') { evt.preventDefault(); trigger.click(); }
        };
        trigger.addEventListener('click', onTriggerClick);
        trigger.addEventListener('keydown', onTriggerKey);
        cleanups.push(() => {
          trigger.removeEventListener('click', onTriggerClick);
          trigger.removeEventListener('keydown', onTriggerKey);
        });
      });
    });

    /* ── Tabs (.glass-tabs) ──────────────────────────────────────────── */
    document.querySelectorAll('.glass-tabs').forEach((container) => {
      const tabs   = Array.from(container.querySelectorAll<HTMLElement>('.glass-tab'));
      const panels = Array.from(container.querySelectorAll<HTMLElement>('.glass-tab-panel'));

      const activate = (i: number) => {
        tabs.forEach((t, j) => {
          const on = j === i;
          t.setAttribute('aria-selected', String(on));
          t.setAttribute('tabindex', on ? '0' : '-1');
        });
        panels.forEach((p, j) => p.classList.toggle('is-active', j === i));
      };

      tabs.forEach((tab, i) => {
        const onClick = () => activate(i);
        const onKey = (evt: Event) => {
          const k = (evt as KeyboardEvent).key;
          if (k === 'ArrowRight') { evt.preventDefault(); const n = (i + 1) % tabs.length; activate(n); tabs[n].focus(); }
          if (k === 'ArrowLeft')  { evt.preventDefault(); const p = (i - 1 + tabs.length) % tabs.length; activate(p); tabs[p].focus(); }
          if (k === 'Home')       { evt.preventDefault(); activate(0); tabs[0].focus(); }
          if (k === 'End')        { evt.preventDefault(); const last = tabs.length - 1; activate(last); tabs[last].focus(); }
        };
        tab.addEventListener('click', onClick);
        tab.addEventListener('keydown', onKey);
        cleanups.push(() => { tab.removeEventListener('click', onClick); tab.removeEventListener('keydown', onKey); });
      });
    });

    /* ── Dropdown (.glass-dropdown) ─────────────────────────────────── */
    document.querySelectorAll<HTMLElement>('.glass-dropdown').forEach((container) => {
      const trigger = container.querySelector<HTMLElement>('.glass-dropdown-trigger');
      const menu    = container.querySelector<HTMLElement>('.glass-dropdown-menu');

      const onOutside = (e: Event) => { if (!container.contains(e.target as Node)) closeDD(); };

      const openDD = () => {
        container.classList.add('is-open');
        trigger?.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', onOutside);
        setTimeout(() => menu?.querySelector<HTMLElement>('.glass-dropdown-item')?.focus(), 20);
      };
      const closeDD = () => {
        container.classList.remove('is-open');
        trigger?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onOutside);
      };

      if (trigger) {
        const onTriggerClick = (e: Event) => {
          e.stopPropagation();
          container.classList.contains('is-open') ? closeDD() : openDD();
        };
        const onTriggerKey = (e: Event) => {
          const k = (e as KeyboardEvent).key;
          if (k === 'ArrowDown') { e.preventDefault(); openDD(); }
          if (k === 'Escape')    closeDD();
        };
        trigger.addEventListener('click', onTriggerClick);
        trigger.addEventListener('keydown', onTriggerKey);
        cleanups.push(() => {
          trigger.removeEventListener('click', onTriggerClick);
          trigger.removeEventListener('keydown', onTriggerKey);
        });
      }

      menu?.querySelectorAll<HTMLElement>('.glass-dropdown-item').forEach((item) => {
        const onItemClick = () => closeDD();
        const onItemKey = (e: Event) => {
          const k = (e as KeyboardEvent).key;
          if (k === 'Escape') { closeDD(); trigger?.focus(); }
          if (k === 'ArrowDown') {
            e.preventDefault();
            let next = item.nextElementSibling as HTMLElement | null;
            while (next?.classList.contains('glass-dropdown-divider')) next = next.nextElementSibling as HTMLElement | null;
            next?.focus();
          }
          if (k === 'ArrowUp') {
            e.preventDefault();
            let prev = item.previousElementSibling as HTMLElement | null;
            while (prev?.classList.contains('glass-dropdown-divider')) prev = prev.previousElementSibling as HTMLElement | null;
            if (prev) prev.focus(); else trigger?.focus();
          }
        };
        item.addEventListener('click', onItemClick);
        item.addEventListener('keydown', onItemKey);
        cleanups.push(() => {
          item.removeEventListener('click', onItemClick);
          item.removeEventListener('keydown', onItemKey);
        });
      });
    });

    /* ── Toast (data-toast trigger attributes) ───────────────────────── */
    const onDataToast = (evt: Event) => {
      const btn = (evt.target as Element).closest<HTMLElement>('[data-toast]');
      if (!btn) return;
      GlassToast.show(btn.dataset.toast ?? 'info', btn.dataset.toastTitle, btn.dataset.toastDesc);
    };
    document.addEventListener('click', onDataToast);
    cleanups.push(() => document.removeEventListener('click', onDataToast));

    /* ── Modal (#modal-backdrop) ─────────────────────────────────────── */
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      const modal = backdrop.querySelector<HTMLElement>('.glass-modal');
      let lastFocus: HTMLElement | null = null;

      const onModalKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { closeModal(); return; }
        if (modal) trapFocus(modal, e);
      };
      const openModal = () => {
        lastFocus = document.activeElement as HTMLElement;
        backdrop.removeAttribute('inert');
        backdrop.classList.add('is-open');
        document.addEventListener('keydown', onModalKey);
        setTimeout(() => getFocusable(modal!)[0]?.focus(), 50);
      };
      const closeModal = () => {
        backdrop.classList.remove('is-open');
        backdrop.setAttribute('inert', '');
        document.removeEventListener('keydown', onModalKey);
        lastFocus?.focus();
      };

      document.querySelectorAll<HTMLElement>('[data-modal-open], #modal-open').forEach((el) => {
        el.addEventListener('click', openModal);
        cleanups.push(() => el.removeEventListener('click', openModal));
      });
      backdrop.querySelectorAll<HTMLElement>('[id^="modal-close"], [id^="modal-confirm"], [id^="modal-cancel"]').forEach((el) => {
        el.addEventListener('click', closeModal);
        cleanups.push(() => el.removeEventListener('click', closeModal));
      });
      const onBackdropClick = (e: Event) => { if (e.target === backdrop) closeModal(); };
      backdrop.addEventListener('click', onBackdropClick);
      cleanups.push(() => backdrop.removeEventListener('click', onBackdropClick));
    }

    /* ── Nav tabs pill (.glass-nav) ──────────────────────────────────── */
    document.querySelectorAll<HTMLElement>('.glass-nav').forEach((nav) => {
      const onNavClick = (e: Event) => {
        const item = (e.target as Element).closest<HTMLElement>('.glass-nav__item');
        if (!item) return;
        nav.querySelectorAll('.glass-nav__item').forEach((el) => el.classList.remove('glass-nav__item--active'));
        item.classList.add('glass-nav__item--active');
      };
      const onNavKey = (e: Event) => {
        const item = (e.target as Element).closest<HTMLElement>('.glass-nav__item');
        if (!item) return;
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter' || k === ' ') { e.preventDefault(); item.click(); }
      };
      nav.addEventListener('click', onNavClick);
      nav.addEventListener('keydown', onNavKey);
      cleanups.push(() => {
        nav.removeEventListener('click', onNavClick);
        nav.removeEventListener('keydown', onNavKey);
      });
    });

    /* ── Toggle / segmented control (.glass-toggle) ──────────────────── */
    document.querySelectorAll<HTMLElement>('.glass-toggle').forEach((toggle) => {
      const onToggleClick = (e: Event) => {
        const opt = (e.target as Element).closest<HTMLElement>('.glass-toggle__opt');
        if (!opt) return;
        toggle.querySelectorAll('.glass-toggle__opt').forEach((el) => el.classList.remove('is-on'));
        opt.classList.add('is-on');
      };
      toggle.addEventListener('click', onToggleClick);
      cleanups.push(() => toggle.removeEventListener('click', onToggleClick));
    });

    /* ── Chips (dismiss + selectable) ───────────────────────────────── */
    const onChipDismiss = (e: Event) => {
      const btn  = (e.target as Element).closest<HTMLElement>('.glass-chip__dismiss');
      if (!btn) return;
      const chip = btn.closest<HTMLElement>('.glass-chip');
      if (!chip) return;
      chip.classList.add('is-exiting');
      chip.addEventListener('animationend', () => chip.remove(), { once: true });
    };
    document.addEventListener('click', onChipDismiss);
    cleanups.push(() => document.removeEventListener('click', onChipDismiss));

    const filterGroup = document.getElementById('filter-chips');
    if (filterGroup) {
      const toggleChip = (chip: HTMLElement) => {
        const on = !chip.classList.contains('is-selected');
        chip.classList.toggle('is-selected', on);
        chip.setAttribute('aria-checked', String(on));
      };
      const onFGClick = (e: Event) => {
        const c = (e.target as Element).closest<HTMLElement>('.js-selectable');
        if (c) toggleChip(c);
      };
      const onFGKey = (e: Event) => {
        const k = (e as KeyboardEvent).key;
        const c = (e.target as Element).closest<HTMLElement>('.js-selectable');
        if (c && (k === 'Enter' || k === ' ')) { e.preventDefault(); toggleChip(c); }
      };
      filterGroup.addEventListener('click', onFGClick);
      filterGroup.addEventListener('keydown', onFGKey);
      cleanups.push(() => {
        filterGroup.removeEventListener('click', onFGClick);
        filterGroup.removeEventListener('keydown', onFGKey);
      });
    }

    /* ── Avatar group z-index (.glass-avatar-group) ──────────────────── */
    document.querySelectorAll('.glass-avatar-group').forEach((group) => {
      const avatars = Array.from(group.querySelectorAll<HTMLElement>('.glass-avatar'));
      avatars.forEach((av, i) => {
        av.style.zIndex = String(i + 1);
        const onEnter = () => { av.style.zIndex = String(avatars.length + 10); };
        const onLeave = () => { av.style.zIndex = String(i + 1); };
        av.addEventListener('mouseenter', onEnter);
        av.addEventListener('mouseleave', onLeave);
        cleanups.push(() => {
          av.removeEventListener('mouseenter', onEnter);
          av.removeEventListener('mouseleave', onLeave);
        });
      });
    });

    /* ── Breadcrumb ellipsis (#bc-ellipsis-wrap) ─────────────────────── */
    const bcWrap = document.getElementById('bc-ellipsis-wrap');
    const bcBtn  = document.getElementById('bc-ellipsis');
    if (bcWrap && bcBtn) {
      const closeBc = () => { bcWrap.classList.remove('is-open'); bcBtn.setAttribute('aria-expanded', 'false'); };
      const onBcClick = (e: Event) => {
        e.stopPropagation();
        const open = bcWrap.classList.toggle('is-open');
        bcBtn.setAttribute('aria-expanded', String(open));
      };
      const onBcOutside = (e: Event) => { if (!bcWrap.contains(e.target as Node)) closeBc(); };
      const onBcKey = (e: Event) => { if ((e as KeyboardEvent).key === 'Escape') closeBc(); };
      bcBtn.addEventListener('click', onBcClick);
      document.addEventListener('click', onBcOutside);
      document.addEventListener('keydown', onBcKey);
      cleanups.push(() => {
        bcBtn.removeEventListener('click', onBcClick);
        document.removeEventListener('click', onBcOutside);
        document.removeEventListener('keydown', onBcKey);
      });
    }

    /* ── Stepper (#stepper-h) ────────────────────────────────────────── */
    const stepperEl = document.getElementById('stepper-h');
    const prevBtn   = document.getElementById('stepper-prev') as HTMLButtonElement | null;
    const nextBtn   = document.getElementById('stepper-next') as HTMLButtonElement | null;
    if (stepperEl && prevBtn && nextBtn) {
      const steps = Array.from(stepperEl.querySelectorAll<HTMLElement>('.glass-step'));
      let current = steps.findIndex((s) => s.classList.contains('is-active'));

      const updateStepper = (idx: number) => {
        steps.forEach((step, i) => {
          step.classList.toggle('is-complete', i < idx);
          step.classList.toggle('is-active',   i === idx);
          step.classList.toggle('is-pending',  i > idx);
          const node = step.querySelector<HTMLElement>('.glass-step__node');
          if (node) {
            node.textContent = i < idx ? '✓' : String(i + 1);
            if (i === idx) node.setAttribute('aria-current', 'step');
            else           node.removeAttribute('aria-current');
          }
        });
        current = idx;
        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx === steps.length - 1;
      };

      const onPrev = () => { if (current > 0) updateStepper(current - 1); };
      const onNext = () => { if (current < steps.length - 1) updateStepper(current + 1); };
      prevBtn.addEventListener('click', onPrev);
      nextBtn.addEventListener('click', onNext);
      updateStepper(current >= 0 ? current : 0);
      cleanups.push(() => {
        prevBtn.removeEventListener('click', onPrev);
        nextBtn.removeEventListener('click', onNext);
      });
    }

    return () => cleanups.forEach((fn) => fn());
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
