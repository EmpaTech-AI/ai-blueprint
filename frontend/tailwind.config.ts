import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy — kept for any missed references
        brand: {
          blue: '#6366F1',
          'blue-light': 'rgba(99,102,241,0.2)',
          'blue-dark': '#4F46E5',
        },
        // New accent system
        accent: {
          indigo: '#6366F1',
          'indigo-light': '#818CF8',
          'indigo-dark': '#4F46E5',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          'cyan-dark': '#0891B2',
        },
        // Surface layers (dark backgrounds)
        surface: {
          '01': '#0A0A0F',
          '02': '#0F0F1A',
          '03': '#13131F',
          '04': '#1A1A2E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
        'glass-hover': '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.4)',
        'glow-indigo-lg': '0 0 40px rgba(99,102,241,0.25)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.35)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        fadeIn:  'fadeIn 300ms ease forwards',
      },
    },
  },
  plugins: [],
};
export default config;
