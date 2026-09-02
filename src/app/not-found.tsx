'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  Glasses,
  Home,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Info,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function NotFound() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation Header */}
      <Header
        onOpenTransferGuide={() => setIsGuideOpen(true)}
        engineStatus="ready"
        engineStatusText="WASM CORE READY"
      />

      {/* Main 404 Not Found Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex items-center justify-center">
        <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-cyan-500/30 shadow-glass-card text-center relative overflow-hidden hud-bracket-box">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Icon Reticle */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-rose-500/20 border border-cyan-500/40 shadow-glow-cyan/30">
              <Glasses className="w-10 h-10 text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping opacity-75" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full" />
            </div>

            {/* Error Pill */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <Badge variant="rose" size="sm" mono dot dotPulse>
                STATUS: 404 // SIGNAL LOST
              </Badge>
              <Badge variant="cyan" size="sm" mono>
                GEN 2 HUD
              </Badge>
            </div>

            {/* Error Title */}
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white mb-2">
              404 <span className="text-cyan-400">Not Found</span>
            </h1>

            <p className="text-xs sm:text-sm font-mono text-cyan-300/80 mb-4 uppercase tracking-widest">
              [ Optical Route Disconnected ]
            </p>

            <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
              The requested coordinate or media pipeline does not exist in the Ray-Ban Meta synthesis registry.
            </p>

            {/* Telemetry Diagnostic Box */}
            <div className="p-4 rounded-xl bg-black/50 border border-slate-800 text-left font-mono text-xs space-y-1.5 mb-8">
              <div className="flex justify-between text-slate-400">
                <span>DIAGNOSTIC_ERR:</span>
                <span className="text-rose-400 font-bold">ERR_PAGE_UNRESOLVED</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TARGET_RESOLUTION:</span>
                <span className="text-cyan-400">1376 &times; 1840</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>METADATA_ENGINE:</span>
                <span className="text-emerald-400">LUXOTTICA_EXIF_V2</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ACTION_RECOMMENDED:</span>
                <span className="text-amber-400">RETURN_TO_STUDIO</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto font-bold shadow-glow-cyan"
                  leftIcon={<Home className="w-4 h-4 text-black" />}
                >
                  Return to Studio
                </Button>
              </Link>

              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setIsGuideOpen(true)}
                leftIcon={<Smartphone className="w-4 h-4 text-cyan-400" />}
              >
                Transfer Guide
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Transfer Guide Modal */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Ray-Ban Meta Transfer & Instagram Spin View Guide"
        subtitle="How to import converted .MOV / photos to your smartphone without triggering compression."
        maxWidth="2xl"
      >
        <div className="space-y-5 text-xs sm:text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Instagram only unlocks the <strong className="text-cyan-300">Glasses / Spin View</strong> badge when the media retains its exact 1376&times;1840 resolution and untouched QuickTime/EXIF metadata tags. Do <strong>not</strong> send via WhatsApp, Telegram, or Discord without &quot;Document / File&quot; mode.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Smartphone className="w-4 h-4" />
                <span>iPhone / iOS Transfer</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
                <li>Send the generated <code className="text-cyan-300">.MOV</code> or <code className="text-cyan-300">.JPG</code> via <strong>AirDrop</strong> from Mac / PC.</li>
                <li>Tap <strong>Accept</strong> &rarr; Save to <strong>Photos</strong> (Camera Roll).</li>
                <li>Open Instagram Story &rarr; Select the photo/video.</li>
                <li>Instagram will detect the Luxottica metadata and enable the <strong>Spin View</strong> gyroscope icon!</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                <Smartphone className="w-4 h-4" />
                <span>Android Transfer</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
                <li>Transfer via <strong>Quick Share</strong> or USB Cable directly to the <code className="text-emerald-300">DCIM/Camera</code> folder.</li>
                <li>Do not share through standard cloud albums that strip EXIF.</li>
                <li>Open Google Photos or Gallery to verify 1376&times;1840 dimensions.</li>
                <li>Upload to Instagram Story / Reel.</li>
              </ol>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              All metadata is 100% compliant with Ray-Ban Meta Gen 2 profiles.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGuideOpen(false)}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* Application Footer */}
      <Footer />
    </div>
  );
}
