'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Dropzone from '@/components/uploader/Dropzone';
import CropViewport from '@/components/editor/CropViewport';
import FramingControls from '@/components/editor/FramingControls';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useMediaConverter } from '@/hooks/useMediaConverter';
import { useToast } from '@/components/ui/Toast';
import {
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Share2,
  Terminal,
  Layers,
  Cpu,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function StudioPage() {
  const {
    stagedMedia,
    stageFile,
    clearStagedMedia,
    cropConfig,
    computedCrop,
    updateCropConfig,
    resetCrop,
    status,
    progressPercent,
    telemetry,
    logs,
    result,
    error,
    startConversion,
    cancelConversion,
    downloadResult,
    resetAll,
  } = useMediaConverter();

  const { success, error: toastError } = useToast();
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const isConverting = status === 'loading' || status === 'cropping' || status === 'transcoding' || status === 'synthesizing';
  const isCompleted = status === 'completed';

  const handleStartConversion = async () => {
    try {
      await startConversion();
      if (status === 'completed' || result) {
        success('Ray-Ban Media Synthesized!', 'Ready for lossless export and Instagram Spin View.');
      }
    } catch (err: any) {
      toastError('Synthesis Error', err?.message || 'Failed to convert media');
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'loading':
        return 'PROBING MEDIA HEADERS...';
      case 'cropping':
        return 'APPLYING 1376x1840 CROP...';
      case 'transcoding':
        return `TRANSCODING H.264/AAC (${progressPercent}%)...`;
      case 'synthesizing':
        return stagedMedia?.type === 'video'
          ? 'RECONSTRUCTING QUICKTIME ATOM TREE...'
          : 'INJECTING LUXOTTICA EXIF...';
      case 'completed':
        return 'RAY-BAN SYNTHESIS COMPLETED';
      case 'error':
        return 'PIPELINE ERROR';
      default:
        return stagedMedia ? 'READY TO SYNTHESIZE' : 'STANDBY - DROP MEDIA';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation Bar */}
      <Header
        onOpenTransferGuide={() => setIsGuideOpen(true)}
        engineStatus={
          status === 'error'
            ? 'error'
            : isConverting
            ? 'processing'
            : 'ready'
        }
        engineStatusText={
          status === 'error'
            ? 'WASM ERROR'
            : isConverting
            ? 'WASM SYNTHESIZING'
            : 'WASM CORE READY'
        }
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Studio Hero Banner */}
        <div className="mb-6 sm:mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
              <Badge variant="cyan" size="sm" mono>
                RAY-BAN META SMART GLASSES (GEN 2)
              </Badge>
              <Badge variant="emerald" size="sm" mono dot>
                ZERO SERVER UPLOAD
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              Studio Framing &amp; <span className="text-cyan-400">Synthesis Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Transform any photo or video into genuine 1376&times;1840 Ray-Ban Meta format with QuickTime atom reconstruction for Instagram Spin View &amp; Luxottica EXIF injection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsGuideOpen(true)}
              leftIcon={<Smartphone className="w-4 h-4 text-cyan-400" />}
            >
              Transfer Guide
            </Button>
            {stagedMedia && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                leftIcon={<RotateCcw className="w-4 h-4 text-slate-400" />}
              >
                Reset Studio
              </Button>
            )}
          </div>
        </div>

        {/* Studio 2-Column Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Uploader, Crop Viewport, Framing Controls */}
          {/* ======================================================== */}
          <section className="lg:col-span-6 flex flex-col gap-6">
            {/* Uploader Dropzone / Staged File Card */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Media Intake &amp; Staging
              </span>
              <Dropzone
                stagedMedia={stagedMedia}
                onMediaStaged={(media) => stageFile(media.file)}
                onMediaCleared={clearStagedMedia}
              />
            </div>

            {/* Interactive Crop & Framing Viewport (When media is staged) */}
            {stagedMedia && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    1376&times;1840 Framing Viewport
                  </span>
                  <Badge variant="cyan" size="sm" mono>
                    ASPECT 43:57.5
                  </Badge>
                </div>

                <CropViewport
                  mediaUrl={stagedMedia.previewUrl}
                  mediaType={stagedMedia.type}
                  sourceWidth={stagedMedia.width}
                  sourceHeight={stagedMedia.height}
                  cropConfig={cropConfig}
                  computedCrop={computedCrop}
                  showGrid={showGrid}
                  showSafeZone={showSafeZone}
                  onCropChange={updateCropConfig}
                />

                {/* Framing Control Bar */}
                <FramingControls
                  cropConfig={cropConfig}
                  showGrid={showGrid}
                  showSafeZone={showSafeZone}
                  onCropChange={updateCropConfig}
                  onToggleGrid={() => setShowGrid((prev) => !prev)}
                  onToggleSafeZone={() => setShowSafeZone((prev) => !prev)}
                  onReset={resetCrop}
                />

                {/* Conversion Primary Action Trigger */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant={isCompleted ? 'emerald' : 'primary'}
                    size="lg"
                    className="flex-1 text-sm sm:text-base font-bold shadow-glow-cyan"
                    onClick={handleStartConversion}
                    disabled={isConverting}
                    isLoading={isConverting}
                    leftIcon={
                      isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-black" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-black" />
                      )
                    }
                  >
                    {isConverting
                      ? 'Synthesizing Media...'
                      : isCompleted
                      ? 'Re-Synthesize Ray-Ban Media'
                      : `Synthesize Ray-Ban ${stagedMedia.type === 'video' ? 'Video (.MOV)' : 'Photo (.JPG)'}`}
                  </Button>

                  {isConverting && (
                    <Button
                      variant="danger"
                      size="lg"
                      onClick={cancelConversion}
                      className="text-xs font-mono"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Telemetry HUD, Results & Live Terminal */}
          {/* ======================================================== */}
          <section className="lg:col-span-6 flex flex-col gap-6">
            {/* Telemetry & Progress Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-cyan-500/25 shadow-glass-card">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                    Engine Telemetry HUD
                  </h3>
                </div>
                <Badge
                  variant={
                    status === 'error'
                      ? 'rose'
                      : isCompleted
                      ? 'emerald'
                      : isConverting
                      ? 'cyan'
                      : 'slate'
                  }
                  size="sm"
                  dot
                  dotPulse={isConverting}
                  mono
                >
                  {status.toUpperCase()}
                </Badge>
              </div>

              {/* Status Banner */}
              <div className="mb-4 p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300 font-semibold truncate">
                  {getStatusLabel()}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 ml-2">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 mb-5 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-violet-500 to-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Target Specs Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Resolution</span>
                  <span className="text-cyan-400 font-bold">1376 &times; 1840</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Aspect Ratio</span>
                  <span className="text-slate-200">43:57.5 (Vertical)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Camera Make</span>
                  <span className="text-slate-200">Luxottica</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Camera Model</span>
                  <span className="text-slate-200">Ray-Ban Meta</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Software Tag</span>
                  <span className="text-slate-200">Meta View</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Spin View Atoms</span>
                  <span className="text-emerald-400 font-semibold">Active &amp; Ready</span>
                </div>
              </div>

              {/* Conversion Result Download Card (When completed) */}
              {isCompleted && result && (
                <div className="mt-5 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">
                          {result.filename}
                        </h4>
                        <p className="text-[11px] text-emerald-300 font-mono">
                          {(result.size / (1024 * 1024)).toFixed(2)} MB &bull; 1376&times;1840 &bull; {result.format.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="emerald"
                      size="md"
                      className="flex-1 font-bold"
                      onClick={downloadResult}
                      leftIcon={<Download className="w-4 h-4 text-black" />}
                    >
                      Download Output File
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setIsGuideOpen(true)}
                      leftIcon={<Share2 className="w-4 h-4 text-cyan-400" />}
                    >
                      How to Transfer
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Alert Display */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold font-mono uppercase mb-0.5">Synthesis Engine Error</h4>
                    <p className="text-rose-200/90">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Telemetry Log Terminal */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-glass-card">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Live Synthesis Telemetry Logs
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {logs.length} entries
                </span>
              </div>

              <div className="bg-black/60 rounded-xl p-3 max-h-56 overflow-y-auto font-mono text-[11px] space-y-1 border border-slate-900">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">
                    Awaiting media selection. Telemetry logs will stream here during processing.
                  </p>
                ) : (
                  logs.map((log) => {
                    const levelColors = {
                      info: 'text-slate-300',
                      ffmpeg: 'text-cyan-400',
                      atom: 'text-violet-400',
                      exif: 'text-emerald-400',
                      warn: 'text-amber-400',
                      error: 'text-rose-400 font-bold',
                    };
                    return (
                      <div key={log.id} className="flex items-start gap-2 leading-tight">
                        <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                        <span className={`uppercase text-[10px] px-1 rounded bg-white/5 shrink-0 ${levelColors[log.level]}`}>
                          {log.level}
                        </span>
                        <span className={`flex-1 break-all ${levelColors[log.level]}`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile / Desktop Transfer Guide Modal */}
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
            {/* iOS AirDrop Guide */}
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

            {/* Android USB / Nearby Share Guide */}
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
