'use client';

import React, { useRef } from 'react';
import { CropCoordinates, CropConfig } from '@/types/converter';
import { ShieldAlert } from 'lucide-react';

interface CropViewportProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  sourceWidth: number;
  sourceHeight: number;
  cropConfig: CropConfig;
  computedCrop: CropCoordinates;
  showGrid?: boolean;
  showSafeZone?: boolean;
  onCropChange?: (newConfig: Partial<CropConfig>) => void;
  className?: string;
}

export const CropViewport: React.FC<CropViewportProps> = ({
  mediaUrl,
  mediaType,
  sourceWidth,
  sourceHeight,
  cropConfig,
  computedCrop,
  showGrid = true,
  showSafeZone = false,
  onCropChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  // Handle Drag / Pan Gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    if (cropConfig.mode === 'center' || cropConfig.mode === 'blur_fill') return;
    isDraggingRef.current = true;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: cropConfig.panX,
      initialPanY: cropConfig.panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Convert pixel delta to normalized [-1, 1] offset based on zoom factor
    const sensitivity = 2.0 / Math.max(1.0, cropConfig.zoom);
    const newPanX = Math.max(-1, Math.min(1, dragStartRef.current.initialPanX + (deltaX / rect.width) * sensitivity));
    const newPanY = Math.max(-1, Math.min(1, dragStartRef.current.initialPanY + (deltaY / rect.height) * sensitivity));

    onCropChange?.({ panX: newPanX, panY: newPanY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel Zoom Listener
  const handleWheel = (e: React.WheelEvent) => {
    if (cropConfig.mode !== 'custom') return;
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(1.0, Math.min(3.0, parseFloat((cropConfig.zoom + zoomDelta).toFixed(2))));
    onCropChange?.({ zoom: newZoom });
  };

  // Compute CSS Transform for Preview
  const getMediaStyle = (): React.CSSProperties => {
    if (cropConfig.mode === 'blur_fill') {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        transform: `rotate(${cropConfig.rotation}deg)`,
      };
    }

    const scale = cropConfig.mode === 'center' ? 1.0 : cropConfig.zoom;
    const translateX = cropConfig.mode === 'center' ? 0 : cropConfig.panX * 25; // percentage shift
    const translateY = cropConfig.mode === 'center' ? 0 : cropConfig.panY * 25;

    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: `scale(${scale}) translate(${translateX}%, ${translateY}%) rotate(${cropConfig.rotation}deg)`,
      transformOrigin: 'center center',
      transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease-out',
    };
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`relative mx-auto aspect-[1376/1840] max-h-[540px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#090B10] shadow-2xl shadow-cyan-500/10 select-none ${
        cropConfig.mode === 'custom' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${className}`}
    >
      {/* Mode C: Ambient Blurred Pillarbox Background */}
      {cropConfig.mode === 'blur_fill' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              className="h-full w-full object-cover blur-2xl scale-125 opacity-60 brightness-75"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Blurred backdrop"
              className="h-full w-full object-cover blur-2xl scale-125 opacity-60 brightness-75"
            />
          )}
        </div>
      )}

      {/* Main Interactive Media Canvas */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            style={getMediaStyle()}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Framed preview"
            style={getMediaStyle()}
            draggable={false}
          />
        )}
      </div>

      {/* Rule of Thirds Grid Overlay */}
      {showGrid && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          <div className="border-b border-r border-cyan-400/25" />
          <div className="border-b border-r border-cyan-400/25" />
          <div className="border-b border-cyan-400/25" />
          <div className="border-b border-r border-cyan-400/25" />
          <div className="border-b border-r border-cyan-400/25" />
          <div className="border-b border-cyan-400/25" />
          <div className="border-r border-cyan-400/25" />
          <div className="border-r border-cyan-400/25" />
          <div />
        </div>
      )}

      {/* Center Reticle Crosshair */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-6 w-6">
          <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-cyan-400/40" />
          <div className="absolute top-1/2 left-0 h-[1px] w-full -translate-y-1/2 bg-cyan-400/40" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-glow-cyan" />
        </div>
      </div>

      {/* Instagram Story / Spin View Safe Zone Overlay */}
      {showSafeZone && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
          {/* Top Safe-Zone Exclusion Area (14%) */}
          <div className="h-[14%] w-full rounded-lg border border-dashed border-rose-500/60 bg-rose-500/10 p-1.5 backdrop-blur-[2px]">
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-rose-300">
              <ShieldAlert className="h-3 w-3 text-rose-400" />
              IG Header / Profile Margin (14%)
            </span>
          </div>

          {/* Active Gyro & Spin Focus Center */}
          <div className="flex-1 my-2 flex items-center justify-center">
            <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-cyan-300 backdrop-blur-md border border-cyan-500/30">
              Spin View Focus Safe-Zone
            </span>
          </div>

          {/* Bottom Safe-Zone Exclusion Area (18%) */}
          <div className="h-[18%] w-full rounded-lg border border-dashed border-rose-500/60 bg-rose-500/10 p-1.5 backdrop-blur-[2px]">
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-rose-300">
              <ShieldAlert className="h-3 w-3 text-rose-400" />
              IG Action / Reply Bar Margin (18%)
            </span>
          </div>
        </div>
      )}

      {/* Corner Cyberpunk HUD Brackets */}
      <div className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-cyan-400" />
      <div className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-cyan-400" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-cyan-400" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-cyan-400" />

      {/* Floating Crop Telemetry Badge */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-500/30 bg-black/80 px-3 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md shadow-lg shadow-black/50 whitespace-nowrap">
        1376&times;1840 &bull; X:{computedCrop.x} Y:{computedCrop.y} W:{computedCrop.width} H:{computedCrop.height}
      </div>
    </div>
  );
};

export default CropViewport;
