'use client';

import React from 'react';
import { Film, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { StagedMediaFile } from '@/types/converter';

interface FileCardProps {
  stagedMedia: StagedMediaFile;
  onReplace: () => void;
  onClear: () => void;
}

export function FileCard({ stagedMedia, onReplace, onClear }: FileCardProps) {
  const isVideo = stagedMedia.type === 'video';
  const hasGps = stagedMedia.detectedMetadata?.hasGps;

  return (
    <div className="w-full glass-panel rounded-2xl p-5 sm:p-6 border border-cyan-500/30 shadow-glass-card relative overflow-hidden">
      {/* Reticle HUD Corners */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

      {/* Header Status Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                {stagedMedia.format.toUpperCase()} {isVideo ? 'VIDEO' : 'PHOTO'} STAGED
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md" title={stagedMedia.name}>
              {stagedMedia.name}
            </h4>
          </div>
        </div>

        {/* Action Controls: Replace & Clear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReplace}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 bg-white/5 hover:bg-white/10 hover:text-cyan-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            title="Replace with another file"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Replace</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            title="Remove media"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Layout: Thumbnail Preview & Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left Column: Media Thumbnail Preview with Aspect Guide */}
        <div className="sm:col-span-4 flex justify-center">
          <div className="relative rounded-xl overflow-hidden bg-black/80 border border-cyan-500/20 shadow-inner group max-h-48 aspect-[3/4] flex items-center justify-center w-full">
            {isVideo ? (
              <img
                src={stagedMedia.thumbnailUrl}
                alt="Video Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={stagedMedia.previewUrl}
                alt="Image Preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay Target Crop Framing Guides */}
            <div className="absolute inset-0 border border-cyan-400/40 pointer-events-none" />
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
              {stagedMedia.width}&times;{stagedMedia.height}
            </div>
          </div>
        </div>

        {/* Right Column: Cyberpunk Telemetry Stat Cards */}
        <div className="sm:col-span-8 grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Original Resolution</span>
            <span className="text-slate-200 font-semibold">{stagedMedia.width} &times; {stagedMedia.height} px</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/20">
            <span className="text-cyan-400/80 block text-[10px] uppercase">Target Resolution</span>
            <span className="text-cyan-400 font-bold">1376 &times; 1840 (Ray-Ban)</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Aspect Ratio</span>
            <span className="text-slate-200">{stagedMedia.aspectRatioLabel}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">
              {isVideo ? 'Duration' : 'Payload Size'}
            </span>
            <span className="text-slate-200">
              {isVideo ? stagedMedia.formattedDuration : 'Still Photo'} &bull; {stagedMedia.formattedSize}
            </span>
          </div>

          {/* Privacy & Camera Source Detection Bar */}
          <div className="col-span-2 p-2 rounded-lg bg-white/[0.02] border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Source: {stagedMedia.detectedMetadata?.make || stagedMedia.detectedMetadata?.model || 'Generic / Standard Camera'}
            </span>
            {hasGps ? (
              <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                <ShieldAlert className="w-3 h-3" /> GPS Detected (Will Strip)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Clean EXIF
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileCard;
