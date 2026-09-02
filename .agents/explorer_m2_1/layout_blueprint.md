# ToRayBan_Converter — Milestone 2 Architectural Blueprint: UI Layout, Cyberpunk Theme, Font & Static Export

**Author**: Teamwork Preview Explorer (Agent 1 - `explorer_m2_1`)  
**Milestone**: Milestone 2 (UI Layout, Cyberpunk Theme, Font & Static Export Config)  
**Target Date**: 2026-09-03  
**Status**: Ready for Implementation  

---

## 1. Executive Summary

This blueprint provides the complete, authoritative implementation architecture for **Milestone 2** of the **ToRayBan_Converter** project. It addresses all aspects of:
1. **Zero-Network Static Export & Font Architecture** (`next.config.mjs`, `src/app/layout.tsx`): Ensuring 100% offline static exports (`output: 'export'`) with zero remote network font dependencies.
2. **Cyberpunk Obsidian Design System** (`tailwind.config.ts`, `src/app/globals.css`): Establishing obsidian glassmorphism tokens, neon glowing borders, cyber grid backdrop, custom scrollbars, and keyframe animations.
3. **Core Layout Components**:
   - `src/components/layout/Header.tsx` (sticky glassmorphic navigation with branding, WASM status pill, guide modal trigger, and GitHub repo link).
   - `src/components/layout/Footer.tsx` (client-side privacy guarantee, format specifications, and repository attribution).
   - `src/components/layout/CyberBackground.tsx` (lightweight, zero-CPU GPU-accelerated cyber grid & ambient neon glow canvas).
4. **Core UI Atomic Components**:
   - `src/components/ui/Button.tsx` (cyberpunk button with neon glows, loading states, and size variants).
   - `src/components/ui/Badge.tsx` (futuristic HUD status tags with glowing pulse dots).
   - `src/components/ui/Toast.tsx` (reactive toast notification context, provider, and glassmorphic toast stack).
5. **Responsive Breakpoint Strategy**: Detailed grid mechanics for mobile (<640px), tablet (640-1023px), desktop (1024-1535px), and ultra-wide (>=1536px) screens.

---

## 2. Static Export & Font Loading Architecture

### 2.1 Problem Analysis: Why Remote Font Loading Fails Static Exports
In standard Next.js setups, using `next/font/google` requires internet access during `next build` static page generation. When building in offline environments, air-gapped CI/CD, or restricted network runners, `next/font/google` throws build-blocking HTTP connection errors.

### 2.2 Concrete Solution: Resilient System Font Fallback Chains
We configure Next.js without `next/font/google` and instead define native typography stacks in `tailwind.config.ts` and `globals.css`:
- **Sans (Interface & Headings)**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Mono (Telemetry & Codec Tags)**: `'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace`
- **Display (Cyberpunk Brand & HUD)**: `'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`

### 2.3 `next.config.mjs` Implementation Blueprint
```javascript
/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  assetPrefix: basePath,
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Polyfill or stub Node.js built-ins in browser context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Enable WebAssembly support for FFmpeg and custom container processing
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
```

### 2.4 `src/app/layout.tsx` Implementation Blueprint
```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import CyberBackground from '@/components/layout/CyberBackground';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'ToRayBan_Converter | Ray-Ban Meta Smart Glasses Media Converter',
  description:
    'Client-side web application converting photos and videos into authentic Ray-Ban Meta Smart Glasses format (1376x1840 vertical resolution, QuickTime .MOV atom container with Instagram Spin View metadata injection, and EXIF camera tags).',
  keywords: [
    'Ray-Ban Meta',
    'Instagram Spin View',
    'Smart Glasses',
    '1376x1840',
    'QuickTime MOV',
    'EXIF Injector',
    'Luxottica',
    'Meta View',
    'Client-Side Converter',
  ],
  authors: [{ name: 'ToRayBan_Converter Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#050608',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#050608] text-slate-100 min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col font-sans relative overflow-x-hidden">
        <ToastProvider>
          <CyberBackground />
          <div className="relative z-10 flex flex-col min-h-screen">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
```

---

## 3. Cyberpunk Obsidian Styling System

### 3.1 `tailwind.config.ts` Implementation Blueprint
```typescript
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
```

### 3.2 `src/app/globals.css` Implementation Blueprint
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-void: #050608;
  --bg-obsidian: #090B10;
  --bg-card: rgba(15, 20, 32, 0.75);
  --foreground: #f8fafc;
  --neon-cyan: #00F0FF;
  --neon-violet: #8B5CF6;
  --neon-emerald: #00FF9D;
  --neon-amber: #FBBF24;
  --neon-rose: #FF007A;
}

/* Base Body Styles */
body {
  color: var(--foreground);
  background-color: var(--bg-void);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

/* Glassmorphism & Cyber Card Utilities */
@layer components {
  .glass-card {
    background: rgba(15, 20, 32, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(0, 240, 255, 0.18);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
  }

  .glass-card-subtle {
    background: rgba(10, 14, 24, 0.65);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.4);
  }

  .glass-card-interactive {
    background: rgba(15, 20, 32, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(0, 240, 255, 0.18);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glass-card-interactive:hover {
    background: rgba(20, 27, 44, 0.85);
    border-color: rgba(0, 240, 255, 0.45);
    box-shadow: 0 12px 40px 0 rgba(0, 240, 255, 0.15);
  }

  .neon-glow-cyan {
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
  }

  .neon-glow-violet {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
  }

  .neon-glow-emerald {
    box-shadow: 0 0 20px rgba(0, 255, 157, 0.35);
  }

  .neon-glow-rose {
    box-shadow: 0 0 20px rgba(255, 0, 122, 0.35);
  }

  .neon-text-cyan {
    color: #00F0FF;
    text-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
  }

  .neon-text-violet {
    color: #A78BFA;
    text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  }

  .neon-text-emerald {
    color: #00FF9D;
    text-shadow: 0 0 12px rgba(0, 255, 157, 0.5);
  }

  .hud-bracket-box {
    position: relative;
  }

  .hud-bracket-box::before,
  .hud-bracket-box::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: rgba(0, 240, 255, 0.6);
    pointer-events: none;
  }

  .hud-bracket-box::before {
    top: 0;
    left: 0;
    border-top: 2px solid;
    border-left: 2px solid;
  }

  .hud-bracket-box::after {
    bottom: 0;
    right: 0;
    border-bottom: 2px solid;
    border-right: 2px solid;
  }
}

/* Custom Cyberpunk Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #050608;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 240, 255, 0.25);
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.6);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

/* Reduced Motion Override */
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 4. Layout Components Blueprint

### 4.1 `src/components/layout/CyberBackground.tsx`
This component creates an atmospheric, cyberpunk backdrop utilizing hardware-accelerated CSS radial gradients and an SVG dot grid. It introduces zero CPU overhead during WebAssembly media conversion.

```tsx
'use client';

import React, { memo } from 'react';

const CyberBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#050608]"
      aria-hidden="true"
    >
      {/* Ambient Neon Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px]" />
      <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-violet-600/10 rounded-full blur-[160px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />

      {/* Cyberpunk Grid Pattern with Radial Vignette */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="cyber-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#00F0FF" fillOpacity="0.35" />
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(0, 240, 255, 0.04)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyber-grid)" />
      </svg>

      {/* Subtle Horizontal Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_51%)] bg-[length:100%_4px] opacity-15" />
    </div>
  );
};

export default memo(CyberBackground);
```

---

### 4.2 `src/components/layout/Header.tsx`
The primary navigation bar rendered at the top of every page. It features the brand logo, live WASM engine health indicator, quick action for the Transfer Guide Modal, and external GitHub repo link.

```tsx
'use client';

import React from 'react';
import { Glasses, HelpCircle, Github, Cpu, ExternalLink } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export interface HeaderProps {
  onOpenTransferGuide?: () => void;
  engineStatus?: 'ready' | 'loading' | 'processing' | 'error';
  engineStatusText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTransferGuide,
  engineStatus = 'ready',
  engineStatusText = 'WASM CORE READY',
}) => {
  const getStatusBadgeVariant = () => {
    switch (engineStatus) {
      case 'ready':
        return 'emerald';
      case 'processing':
      case 'loading':
        return 'cyan';
      case 'error':
        return 'rose';
      default:
        return 'slate';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#050608]/80 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-violet-500/20 border border-cyan-500/30 shadow-glow-cyan/20">
            <Glasses className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
                ToRayBan_<span className="text-cyan-400">Converter</span>
              </span>
              <Badge variant="cyan" size="sm" mono className="hidden sm:inline-flex">
                GEN 2 PROFILE
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline-block">
              1376×1840 • QuickTime MOV & EXIF Synthesizer
            </span>
          </div>
        </div>

        {/* Right: Telemetry Status, Transfer Guide & GitHub Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WASM Engine Status Pill */}
          <div className="hidden sm:flex items-center">
            <Badge
              variant={getStatusBadgeVariant()}
              size="md"
              dot
              dotPulse={engineStatus === 'loading' || engineStatus === 'processing'}
              mono
            >
              <Cpu className="w-3.5 h-3.5 mr-1 inline opacity-80" />
              {engineStatusText}
            </Badge>
          </div>

          {/* Transfer Guide Button */}
          {onOpenTransferGuide && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenTransferGuide}
              leftIcon={<HelpCircle className="w-4 h-4 text-cyan-400" />}
              className="text-xs"
            >
              <span className="hidden sm:inline">Transfer Guide</span>
              <span className="sm:hidden">Guide</span>
            </Button>
          )}

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/triwahyu45/ToRayBan_Converter"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
            aria-label="GitHub Repository"
            title="View Source on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

---

### 4.3 `src/components/layout/Footer.tsx`
The application footer presenting data privacy disclaimers, format technical summaries, and open-source project links.

```tsx
'use client';

import React from 'react';
import { Github, ShieldCheck, Cpu, Sparkles, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#050608]/90 backdrop-blur-xl mt-auto py-8 text-xs text-slate-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Section: Technical Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-white/5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">100% Client-Side Privacy</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All video and image transcoding occurs in-browser via WebAssembly. Zero files are uploaded to any server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Layers className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">1376×1840 Ray-Ban Meta Standard</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Formats media to exact Luxottica Gen 2 specs with smart center fill, custom crop, or ambient pillarbox.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Instagram Spin View Ready</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reconstructs QuickTime <code className="text-violet-300">udta/meta/ilst</code> atom trees and EXIF TIFF tags.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright & Repository Attribution */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-medium text-slate-300">ToRayBan_Converter</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Client-Side Meta Smart Glasses Media Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/triwahyu45/ToRayBan_Converter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none focus:underline"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```

---

## 5. Core UI Atoms Blueprint

### 5.1 `src/components/ui/Button.tsx`
A robust cyberpunk button component featuring electric cyan glow, glass frosted styling, loading spinners, and active press feedback.

```tsx
'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'violet'
    | 'emerald'
    | 'danger'
    | 'ghost'
    | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    // Base styles: positioning, transition, focus ring
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050608] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.98]';

    // Size variants
    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 gap-1.5',
      sm: 'text-xs sm:text-sm px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
      xl: 'text-lg px-8 py-3.5 gap-3 font-semibold',
    };

    // Color/Visual variants
    const variantStyles = {
      primary:
        'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-semibold shadow-glow-cyan hover:shadow-glow-cyan-lg border border-cyan-300/60 focus:ring-cyan-400',
      secondary:
        'bg-white/5 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/70 shadow-sm focus:ring-cyan-400',
      violet:
        'bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white shadow-glow-violet hover:shadow-glow-violet-lg border border-violet-400/50 focus:ring-violet-400',
      emerald:
        'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-semibold shadow-glow-emerald border border-emerald-300/60 focus:ring-emerald-400',
      danger:
        'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:border-rose-500/80 shadow-glow-rose/20 focus:ring-rose-500',
      ghost:
        'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent focus:ring-slate-400',
      glass:
        'backdrop-blur-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 hover:border-white/20 shadow-glass-card focus:ring-cyan-400',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
```

---

### 5.2 `src/components/ui/Badge.tsx`
A cyberpunk badge/tag component supporting glow dots, monospace typography, and color variants for format badges, status pills, and atom tags.

```tsx
'use client';

import React from 'react';

export interface BadgeProps {
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotPulse?: boolean;
  mono?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  size = 'md',
  dot = false,
  dotPulse = false,
  mono = false,
  className = '',
  children,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md border select-none';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    cyan: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]',
    violet: 'bg-violet-950/40 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,157,0.15)]',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.15)]',
    rose: 'bg-rose-950/40 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(255,0,122,0.15)]',
    slate: 'bg-slate-900/60 text-slate-300 border-slate-700/60',
    outline: 'bg-transparent text-slate-400 border-white/10',
  };

  const dotColors = {
    cyan: 'bg-cyan-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
    outline: 'bg-white/40',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        mono ? 'font-mono' : 'font-sans'
      } ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
```

---

### 5.3 `src/components/ui/Toast.tsx`
A unified, zero-dependency Toast notification provider and hook system with auto-dismiss timers, animated glassmorphic notifications, and color-coded cyberpunk glows.

```tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  success: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type,
      title,
      description,
      duration = 4500,
    }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'success', title, description }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'info', title, description }),
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'warning', title, description }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'error', title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider
      value={{ toast, success, info, warning, error, dismiss }}
    >
      {children}
      {/* Fixed Toast Stack Viewport */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      border: 'border-emerald-500/40',
      shadow: 'shadow-[0_0_25px_rgba(0,255,157,0.25)]',
      progressBg: 'bg-emerald-400',
    },
    info: {
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
      border: 'border-cyan-500/40',
      shadow: 'shadow-[0_0_25px_rgba(0,240,255,0.25)]',
      progressBg: 'bg-cyan-400',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      border: 'border-amber-500/40',
      shadow: 'shadow-[0_0_25px_rgba(251,191,36,0.25)]',
      progressBg: 'bg-amber-400',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      border: 'border-rose-500/40',
      shadow: 'shadow-[0_0_25px_rgba(255,0,122,0.25)]',
      progressBg: 'bg-rose-400',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      role="status"
      className={`pointer-events-auto relative overflow-hidden rounded-xl bg-[#090B10]/95 backdrop-blur-2xl border ${config.border} ${config.shadow} p-4 text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1 pr-2">
          <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
          {toast.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss Countdown Indicator Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${config.progressBg} opacity-80`}
          style={{
            width: '100%',
            animation: `toastCountdown ${toast.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
};

export default ToastProvider;
```

---

## 6. Responsive Breakpoint & Studio Grid Architecture

### 6.1 Viewport Breakpoint Matrix
| Breakpoint | Width (px) | Layout Strategy | Interaction Adaptations |
|---|---|---|---|
| **Mobile (`< 640px`)** | `320px - 639px` | Single-column stacked vertical flow. | Full-width buttons, collapsible HUD telemetry drawer, fixed sticky conversion CTA bar at viewport bottom. |
| **Tablet (`640px - 1023px`)** | `640px - 1023px` | Single-column wide flow with side-by-side sub-panels. | 2-column control buttons, larger framing viewport (400px height). |
| **Desktop (`1024px - 1535px`)** | `1024px - 1535px` | 2-Column Asymmetric Studio Layout (`45%` Left : `55%` Right). | Left: Uploader, Framing Viewport, Config. Right: Telemetry, Before/After Slider, Inspector. |
| **Ultra-Wide (`>= 1536px`)** | `1536px+` | Max-width bounded studio container (`max-w-7xl` / `1440px`). | Centered stage, higher fidelity before/after slider preview, spacious padding. |

### 6.2 Studio Grid Layout Implementation Pattern
```tsx
<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
    {/* Left Column: Media Staging, Crop & Framing Viewport (5 of 12 cols on desktop) */}
    <section className="lg:col-span-5 flex flex-col gap-6">
      {/* Dropzone Uploader */}
      {/* Crop & Framing Viewport (1376x1840) */}
      {/* Action Synthesis Trigger Button */}
    </section>

    {/* Right Column: Telemetry HUD, Before/After Slider, Metadata Inspector (7 of 12 cols on desktop) */}
    <section className="lg:col-span-7 flex flex-col gap-6">
      {/* Stepper HUD & Progress Ring */}
      {/* Comparison Preview Stage */}
      {/* Metadata Inspector & QuickTime Atom Tree */}
    </section>
  </div>
</main>
```

---

## 7. Implementation & Verification Plan for Builder Agent

### Step-by-Step Implementation Sequence:
1. **Config & Styling Updates**:
   - Update `next.config.mjs` with Webpack fallback and WebAssembly configuration.
   - Update `tailwind.config.ts` with cyber/neon palettes, glowing shadows, and backdrop filters.
   - Update `src/app/globals.css` with custom glassmorphic utility classes, neon text glows, and custom scrollbar styles.
2. **Atomic UI Components**:
   - Create `src/components/ui/Button.tsx`.
   - Create `src/components/ui/Badge.tsx`.
   - Create `src/components/ui/Toast.tsx`.
3. **Layout Components**:
   - Create `src/components/layout/CyberBackground.tsx`.
   - Create `src/components/layout/Header.tsx`.
   - Create `src/components/layout/Footer.tsx`.
4. **App Router Layout & Page Integration**:
   - Update `src/app/layout.tsx` to wrap children with `ToastProvider` and mount `CyberBackground`.
   - Update `src/app/page.tsx` to render `Header`, hero studio scaffolding, and `Footer`.
5. **Static Export Build Verification**:
   - Run `npm.cmd run build` to guarantee 100% clean static export with 0 errors and 0 remote network font requests.
   - Run `npm.cmd run test` to guarantee all 70 unit tests continue to pass.
