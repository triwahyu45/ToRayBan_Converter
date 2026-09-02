'use client';

import React, { useRef } from 'react';
import { UploadCloud, Sparkles, AlertTriangle, X } from 'lucide-react';
import { StagedMediaFile } from '@/types/converter';
import { useDropzone } from '@/hooks/useDropzone';
import { FileCard } from './FileCard';

interface DropzoneProps {
  stagedMedia: StagedMediaFile | null;
  onMediaStaged: (media: StagedMediaFile) => void;
  onMediaCleared: () => void;
}

const SUPPORTED_FORMAT_BADGES = [
  { label: 'MP4', type: 'video', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  { label: 'MOV', type: 'video', color: 'border-violet-500/40 text-violet-400 bg-violet-500/10' },
  { label: 'WEBM', type: 'video', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  { label: 'JPG', type: 'image', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { label: 'PNG', type: 'image', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { label: 'WEBP', type: 'image', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
];

export function Dropzone({ stagedMedia: externalStaged, onMediaStaged, onMediaCleared }: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isDraggingOver,
    isValidating,
    validationProgress,
    validationStatusText,
    validationError,
    stagedMedia,
    clearStagedMedia,
    setValidationError,
    dragProps,
    handleFileInputChange,
  } = useDropzone({
    onFileAccepted: (staged) => {
      onMediaStaged(staged);
    },
  });

  const activeMedia = externalStaged || stagedMedia;

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    clearStagedMedia();
    onMediaCleared();
  };

  if (activeMedia) {
    return (
      <FileCard
        stagedMedia={activeMedia}
        onReplace={handleBrowseClick}
        onClear={handleClear}
      />
    );
  }

  return (
    <div className="w-full relative">
      {/* Hidden native file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        id="torayban-file-input"
        data-testid="file-picker-input"
      />

      {/* Main Interactive Dropzone Box */}
      <div
        {...dragProps}
        onClick={handleBrowseClick}
        className={`
          relative overflow-hidden cursor-pointer rounded-2xl p-8 sm:p-10
          transition-all duration-300 ease-out flex flex-col items-center justify-center text-center
          glass-panel border-2 border-dashed
          ${
            isDraggingOver
              ? 'border-cyan-400 bg-cyan-500/10 shadow-glow-cyan scale-[1.01]'
              : 'border-cyan-500/25 hover:border-cyan-400/60 hover:bg-white/[0.02]'
          }
        `}
      >
        {/* Futuristic Corner HUD Reticles */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

        {/* Laser Sweep Scanline Animation during Validation */}
        {isValidating && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
          </div>
        )}

        {/* Central Icon Reticle */}
        <div className="relative mb-5">
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${
                isDraggingOver
                  ? 'bg-cyan-400 text-black shadow-glow-cyan scale-110'
                  : 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 shadow-glass-card'
              }
            `}
          >
            {isDraggingOver ? (
              <Sparkles className="w-8 h-8 animate-bounce" />
            ) : (
              <UploadCloud className="w-8 h-8 group-hover:scale-110 transition-transform" />
            )}
          </div>
        </div>

        {/* Title & Call to Action */}
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2">
          {isDraggingOver ? (
            <span className="text-cyan-400 font-mono uppercase tracking-wider">
              [ Release to Synthesize Ray-Ban Media ]
            </span>
          ) : (
            <>
              Drop Media Here, <span className="text-cyan-400 underline decoration-cyan-400/40">Browse</span>, or Paste
            </>
          )}
        </h3>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Supports video &amp; photo formats. Media is automatically framed to Ray-Ban Meta native{' '}
          <span className="text-cyan-400 font-mono font-medium">1376&times;1840</span>.
        </p>

        {/* Format Badge Chips */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
          {SUPPORTED_FORMAT_BADGES.map((badge) => (
            <span
              key={badge.label}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-md border ${badge.color}`}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Keyboard Paste Shortcut Tooltip */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]">
            Ctrl + V
          </kbd>
          <span>/</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]">
            Cmd + V
          </kbd>
          <span className="text-slate-400">Direct Clipboard Paste</span>
        </div>

        {/* Validation Progress HUD */}
        {isValidating && (
          <div className="w-full max-w-sm mt-6 p-4 rounded-xl bg-black/60 border border-cyan-500/30 text-left">
            <div className="flex justify-between items-center text-xs font-mono text-cyan-400 mb-2">
              <span>{validationStatusText}</span>
              <span>{validationProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${validationProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-rose-500/5 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <h4 className="font-bold font-mono uppercase tracking-wide mb-0.5 text-rose-300">Media Validation Error</h4>
            <p className="text-rose-200/90 text-xs">{validationError}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setValidationError(null);
            }}
            className="text-rose-400 hover:text-white p-1 transition-colors"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Dropzone;
