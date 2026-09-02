import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          void: '#050608',
          obsidian: '#090B10',
          dark: '#0d111a',
          slate: '#131929',
          card: 'rgba(15, 20, 32, 0.75)',
          'card-hover': 'rgba(20, 27, 44, 0.85)',
          border: 'rgba(0, 240, 255, 0.18)',
          'border-subtle': 'rgba(255, 255, 255, 0.08)',
        },
        neon: {
          cyan: '#00F0FF',
          'cyan-bright': '#38F8FF',
          violet: '#8B5CF6',
          'violet-bright': '#A78BFA',
          emerald: '#00FF9D',
          'emerald-bright': '#34D399',
          amber: '#FBBF24',
          'amber-bright': '#FCD34D',
          rose: '#FF007A',
          'rose-bright': '#FF2E93',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.35)',
        'glow-cyan-lg': '0 0 35px rgba(0, 240, 255, 0.55)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.35)',
        'glow-violet-lg': '0 0 35px rgba(139, 92, 246, 0.55)',
        'glow-emerald': '0 0 20px rgba(0, 255, 157, 0.35)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.35)',
        'glow-rose': '0 0 20px rgba(255, 0, 122, 0.35)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-panel': '0 12px 40px 0 rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'radar': 'radar 4s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.55)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
        display: [
          'Space Grotesk',
          'Inter',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
