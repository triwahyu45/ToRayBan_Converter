'use client';

import React from 'react';
import { CropConfig } from '@/types/converter';
import {
  Focus,
  Move,
  Layers,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  ShieldAlert,
} from 'lucide-react';

interface FramingControlsProps {
  cropConfig: CropConfig;
  showGrid: boolean;
  showSafeZone: boolean;
  onCropChange: (config: Partial<CropConfig>) => void;
  onToggleGrid: () => void;
  onToggleSafeZone: () => void;
  onReset: () => void;
}

export const FramingControls: React.FC<FramingControlsProps> = ({
  cropConfig,
  showGrid,
  showSafeZone,
  onCropChange,
  onToggleGrid,
  onToggleSafeZone,
  onReset,
}) => {
  const handleRotate = () => {
    const nextRot = (cropConfig.rotation + 90) % 360;
    onCropChange({ rotation: nextRot });
  };

  const handleZoomStep = (delta: number) => {
    const nextZoom = Math.max(1.0, Math.min(3.0, parseFloat((cropConfig.zoom + delta).toFixed(2))));
    onCropChange({ zoom: nextZoom });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#090B10]/90 p-4 sm:p-5 backdrop-blur-xl shadow-glass-card">
      {/* 1. Mode Selector Tabs */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
          Framing &amp; Aspect Mode
        </span>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => onCropChange({ mode: 'center', zoom: 1.0, panX: 0, panY: 0 })}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'center'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan/30 ring-1 ring-cyan-400 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Focus className="h-3.5 w-3.5 text-cyan-400" />
            <span>Smart Fill</span>
          </button>

          <button
            type="button"
            onClick={() => onCropChange({ mode: 'custom' })}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'custom'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan/30 ring-1 ring-cyan-400 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Move className="h-3.5 w-3.5 text-cyan-400" />
            <span>Custom Pan</span>
          </button>

          <button
            type="button"
            onClick={() => onCropChange({ mode: 'blur_fill', zoom: 1.0, panX: 0, panY: 0 })}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'blur_fill'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan/30 ring-1 ring-cyan-400 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-violet-400" />
            <span>Ambient Blur</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Zoom Slider (Active in Custom Mode) */}
      {cropConfig.mode === 'custom' && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/40 p-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
              <ZoomIn className="h-3.5 w-3.5 text-cyan-400" />
              Framing Zoom Level
            </span>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {Math.round(cropConfig.zoom * 100)}% ({cropConfig.zoom.toFixed(2)}x)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomStep(-0.1)}
              disabled={cropConfig.zoom <= 1.0}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={cropConfig.zoom}
              onChange={(e) => onCropChange({ zoom: parseFloat(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleZoomStep(0.1)}
              disabled={cropConfig.zoom >= 3.0}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Utility Toggles & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          {/* Rule of Thirds Toggle */}
          <button
            type="button"
            onClick={onToggleGrid}
            title="Toggle Rule of Thirds Grid"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors ${
              showGrid
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          {/* Instagram Story Safe-Zone Toggle */}
          <button
            type="button"
            onClick={onToggleSafeZone}
            title="Toggle Instagram Safe Zone Guides"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors ${
              showSafeZone
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">Safe Zone</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rotate 90 CW */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
            <span>{cropConfig.rotation}&deg;</span>
          </button>

          {/* Reset Recenter */}
          <button
            type="button"
            onClick={onReset}
            title="Reset to Smart Center Fill"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FramingControls;
