'use client';

import React from 'react';
import { Glasses, HelpCircle, Github, Cpu } from 'lucide-react';
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
              1376&times;1840 &bull; QuickTime MOV &amp; EXIF Synthesizer
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

          {/* Live Web Link */}
          <a
            href="https://triwahyu45.github.io/ToRayBan_Converter/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
            title="Live Web Deployment"
          >
            <span>🌐 Live Web</span>
          </a>

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
