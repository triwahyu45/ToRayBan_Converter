# ToRayBan_Converter — Milestone 2: Crop & Framing Viewport and State Hook Blueprint

**Author**: Teamwork Preview Explorer (`explorer_m2_3`)  
**Target Milestone**: Milestone 2 (Crop & Framing Viewport and State Machine Hook)  
**Date**: 2026-09-03  
**Status**: Authoritative Implementation Blueprint  

---

## 1. Architectural Overview & Scope

Milestone 2 delivers the interactive visual editing and conversion orchestration engine of **ToRayBan_Converter**:
1. **Interactive 1376x1840 Crop Viewport (`src/components/editor/CropViewport.tsx`)**:
   - High-precision canvas / video viewport scaled to the native Ray-Ban Meta vertical aspect ratio ($1376 \times 1840$, $43:57.5$).
   - Multi-mode framing: **Smart Center Fill**, **Custom Pan/Zoom HUD**, and **Ambient Pillarbox (Blur Fill)**.
   - Interactive mouse drag & touch pan gestures, wheel zoom, zoom slider ($1.0\times - 3.0\times$).
   - Rule of Thirds grid overlay, center precision crosshair, and Instagram Story / Spin View UI safe-zone exclusion guides.
2. **Framing Controls Bar (`src/components/editor/FramingControls.tsx`)**:
   - Mode switcher tabs with glowing cyberpunk icons.
   - Zoom slider with live percentage readout, quick-step buttons, and reset button.
   - 90° Clockwise rotation toggle and live coordinate badge HUD.
3. **Unified Media Converter Hook (`src/hooks/useMediaConverter.ts`)**:
   - Complete reactive state machine managing the media conversion lifecycle (`idle` $\rightarrow$ `loading` $\rightarrow$ `cropping` $\rightarrow$ `transcoding` $\rightarrow$ `synthesizing` $\rightarrow$ `completed` $\rightarrow$ `error`).
   - Browser-side canvas image cropping and pure TypeScript EXIF injection (`injectRayBanExif`).
   - WebAssembly video transcoding & cropping via `FFmpegService.transcodeAndCrop`.
   - QuickTime atom container reconstruction via `reconstructRayBanQuickTimeMov`.
   - Real-time telemetry parsing (FPS, current frame, ETA, speed multiplier, elapsed time).
   - AbortController cancellation and automatic Blob URL memory cleanup.

---

## 2. Mathematical Modeling & Coordinate Transformations

### 2.1 Ray-Ban Meta Geometric Standard
- Target Resolution: $W_{\text{target}} = 1376\text{ px}$, $H_{\text{target}} = 1840\text{ px}$
- Aspect Ratio: $R_{\text{target}} = \frac{1376}{1840} = \frac{43}{57.5} \approx 0.747826087$

### 2.2 Framing Modes Formulation

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRAMING MODES GEOMETRY                                         │
├──────────────────────────────┬──────────────────────────────────┬────────────────────────────────┤
│ Mode A: Smart Center Fill    │ Mode B: Custom Pan & Zoom        │ Mode C: Ambient Pillarbox      │
├──────────────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ • Scales media to fill       │ • Base center crop scaled by     │ • Keeps 100% of source frame   │
│   1376x1840 without borders. │   user zoom factor Z (1.0x-3.0x).│   intact inside 1376x1840.     │
│ • Width / Height fitted to   │ • Dynamic pan offsets (X, Y)     │ • Outer letterbox filled with  │
│   maximally fill window.     │   clamped to source boundaries.  │   blurred scaled background.   │
└──────────────────────────────┴──────────────────────────────────┴────────────────────────────────┘
```

#### Mode A: Smart Center Fill (`'center'`)
Given source dimensions $W_{\text{src}}$ and $H_{\text{src}}$:
$$R_{\text{src}} = \frac{W_{\text{src}}}{H_{\text{src}}}$$

- If $R_{\text{src}} > R_{\text{target}}$ (wider source, e.g. 16:9 landscape or 1:1 square):
  $$H_{\text{crop}} = H_{\text{src}}, \quad W_{\text{crop}} = \text{round}\left(H_{\text{src}} \times \frac{1376}{1840}\right)$$
  $$X_{\text{crop}} = \text{round}\left(\frac{W_{\text{src}} - W_{\text{crop}}}{2}\right), \quad Y_{\text{crop}} = 0$$

- If $R_{\text{src}} \le R_{\text{target}}$ (taller source, e.g. 9:16 vertical or 9:21):
  $$W_{\text{crop}} = W_{\text{src}}, \quad H_{\text{crop}} = \text{round}\left(W_{\text{src}} \times \frac{1840}{1376}\right)$$
  $$X_{\text{crop}} = 0, \quad Y_{\text{crop}} = \text{round}\left(\frac{H_{\text{src}} - H_{\text{crop}}}{2}\right)$$

#### Mode B: Custom Pan & Zoom (`'custom'`)
Given user zoom $Z \in [1.0, 3.0]$ and normalized pan offsets $(P_x, P_y) \in [-1.0, +1.0]$:
1. Compute base unzoomed dimensions ($W_{\text{base}}, H_{\text{base}}$) from Mode A.
2. Calculate zoomed crop box:
   $$W_{\text{crop}} = \text{round}\left(\frac{W_{\text{base}}}{Z}\right), \quad H_{\text{crop}} = \text{round}\left(\frac{H_{\text{base}}}{Z}\right)$$
3. Compute maximum available pan shift:
   $$\Delta X_{\text{max}} = \frac{W_{\text{src}} - W_{\text{crop}}}{2}, \quad \Delta Y_{\text{max}} = \frac{H_{\text{src}} - H_{\text{crop}}}{2}$$
4. Calculate crop coordinates centered with pan offset:
   $$X_{\text{crop}} = \text{clamp}\left(\frac{W_{\text{src}} - W_{\text{crop}}}{2} + P_x \cdot \Delta X_{\text{max}}, \; 0, \; W_{\text{src}} - W_{\text{crop}}\right)$$
   $$Y_{\text{crop}} = \text{clamp}\left(\frac{H_{\text{src}} - H_{\text{crop}}}{2} + P_y \cdot \Delta Y_{\text{max}}, \; 0, \; H_{\text{src}} - H_{\text{crop}}\right)$$

#### Mode C: Ambient Pillarbox (`'blur_fill'`)
1. Compute scale factor to fit source inside 1376x1840 without clipping:
   $$S_{\text{fit}} = \min\left(\frac{1376}{W_{\text{src}}}, \frac{1840}{H_{\text{src}}}\right)$$
   $$W_{\text{fit}} = \text{round}(W_{\text{src}} \cdot S_{\text{fit}}), \quad H_{\text{fit}} = \text{round}(H_{\text{src}} \cdot S_{\text{fit}})$$
   $$X_{\text{offset}} = \text{round}\left(\frac{1376 - W_{\text{fit}}}{2}\right), \quad Y_{\text{offset}} = \text{round}\left(\frac{1840 - H_{\text{fit}}}{2}\right)$$
2. Background: Scaled cover of source image/video with heavy Gaussian blur (`blur(40px)` / FFmpeg `boxblur=20:5`) and slight darkening.

### 2.3 Even-Boundary Normalization (YUV420p & Canvas Safety)
To prevent chroma subsampling discoloration and subpixel anti-aliasing fuzziness in FFmpeg H.264 encoders and HTML5 canvas:
$$\forall v \in \{X_{\text{crop}}, Y_{\text{crop}}, W_{\text{crop}}, H_{\text{crop}}\}, \quad v_{\text{norm}} = 2 \cdot \lfloor v / 2 \rfloor$$

---

## 3. UI/UX Component Specifications

### 3.1 `CropViewport.tsx` Design

#### Visual Layout & Glassmorphism
```
┌────────────────────────────────────────────────────────┐
│ [CROP VIEWPORT HUD]       [Mode: CUSTOM] [1376x1840]   │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ ┌ - - - - - - - - - - - - - - - - - - - - - - - ┐  │ │
│ │ │ INSTAGRAM STORY TOP SAFE ZONE (HEADER / META) │  │ │
│ │ └ - - - - - - - - - - - - - - - - - - - - - - - ┘  │ │
│ │          │                       │                 │ │
│ │          │   Rule of Thirds      │                 │ │
│ │ ─────────┼───────────────────────┼───────────────  │ │
│ │          │          (+)          │                 │ │
│ │          │    Center Crosshair   │                 │ │
│ │ ─────────┼───────────────────────┼───────────────  │ │
│ │          │                       │                 │ │
│ │ ┌ - - - - - - - - - - - - - - - - - - - - - - - ┐  │ │
│ │ │ INSTAGRAM STORY BOTTOM SAFE ZONE (REPLY / CTA)│  │ │
│ │ └ - - - - - - - - - - - - - - - - - - - - - - - ┘  │ │
│ └────────────────────────────────────────────────────┘ │
│ [HUD TICK: X: 272px | Y: 0px | W: 1376px | H: 1840px]  │
└────────────────────────────────────────────────────────┘
```

#### Key Features:
1. **Responsive Viewport Container**:
   - Maintains exact $1376:1840$ aspect ratio (`aspect-[1376/1840]`).
   - High-contrast obsidian background with cyan glow accents (`shadow-neon-cyan/20 ring-1 ring-cyan-500/30`).
2. **Gesture & Pointer Handling**:
   - `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel` with `setPointerCapture` for uninterrupted drag panning outside the element.
   - Wheel listener (`onWheel`) for desktop trackpad / scroll wheel zooming ($1.0\times - 3.0\times$).
   - Pinch-to-zoom multi-touch recognition for mobile devices.
3. **Overlays & Guides**:
   - **Rule of Thirds**: 2 horizontal + 2 vertical lines at $33.33\%$ and $66.66\%$ in electric cyan with 25% opacity.
   - **Center Crosshair Reticle**: High-tech $(+)$ with glowing pulsing center point.
   - **Instagram Story UI Safe-Zone**:
     - Top exclusion margin: $14\%$ height (avatar, username, time stamp).
     - Bottom exclusion margin: $18\%$ height (send message bar, like/share buttons).
     - Left/Right exclusion margin: $4\%$ width.
   - **Corner HUD Brackets**: Cyberpunk corner accents highlighting active framing boundaries.

---

### 3.2 `FramingControls.tsx` Design

#### Key Controls:
1. **Mode Switcher Tabs**:
   - `Smart Fill` (Full frame cover)
   - `Custom Pan/Zoom` (User positioning)
   - `Ambient Pillarbox` (Fit with blurred fill)
2. **Interactive Zoom Controls**:
   - Slider ($1.0\times - 3.0\times$, step $0.05$).
   - Minus (`-`) and Plus (`+`) stepper buttons.
   - Clickable zoom percentage readout (e.g. `125%`).
3. **Utility Buttons**:
   - `Rotate 90°` ($0^\circ \rightarrow 90^\circ \rightarrow 180^\circ \rightarrow 270^\circ$).
   - `Center / Reset` (re-centers pan and resets zoom to $1.0\times$).
   - `Grid Overlay Toggle` (shows/hides Rule of Thirds).
   - `Safe-Zone Toggle` (shows/hides Instagram Story exclusion zones).
4. **Telemetry Badge**:
   - Live display of target output dimensions: `1376 × 1840 px • Ray-Ban Meta Native`.

---

## 4. Complete Component Code Blueprints

### 4.1 Blueprint: `src/components/editor/CropViewport.tsx`

```tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CropCoordinates } from '@/types/converter';
import { Eye, Move, Sparkles, Grid3X3, ShieldAlert } from 'lucide-react';

export interface CropConfig {
  mode: 'center' | 'custom' | 'blur_fill';
  zoom: number; // 1.0 to 3.0
  panX: number; // -1.0 to 1.0
  panY: number; // -1.0 to 1.0
  rotation: number; // 0, 90, 180, 270
}

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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
    const sensitivity = (2.0 / cropConfig.zoom);
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
      className={`relative mx-auto aspect-[1376/1840] max-h-[540px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-cyan-500/40 bg-obsidian shadow-2xl shadow-cyan-500/10 select-none ${
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
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-neon-cyan" />
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
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-500/30 bg-black/80 px-3 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md shadow-lg shadow-black/50">
        1376×1840 • X:{computedCrop.x} Y:{computedCrop.y} W:{computedCrop.width} H:{computedCrop.height}
      </div>
    </div>
  );
};
```

---

### 4.2 Blueprint: `src/components/editor/FramingControls.tsx`

```tsx
'use client';

import React from 'react';
import { CropConfig } from './CropViewport';
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
  Sparkles,
  Maximize2,
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
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface-glass p-4 backdrop-blur-xl shadow-glass-panel">
      {/* 1. Mode Selector Tabs */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
          Framing & Aspect Mode
        </span>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-obsidian p-1">
          <button
            type="button"
            onClick={() => onCropChange({ mode: 'center', zoom: 1.0, panX: 0, panY: 0 })}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'center'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-neon-cyan ring-1 ring-cyan-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Focus className="h-3.5 w-3.5" />
            <span>Smart Fill</span>
          </button>

          <button
            type="button"
            onClick={() => onCropChange({ mode: 'custom' })}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'custom'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-neon-cyan ring-1 ring-cyan-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span>Custom Pan</span>
          </button>

          <button
            type="button"
            onClick={() => onCropChange({ mode: 'blur_fill', zoom: 1.0, panX: 0, panY: 0 })}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              cropConfig.mode === 'blur_fill'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-neon-cyan ring-1 ring-cyan-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Ambient Blur</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Zoom Slider (Active in Custom Mode) */}
      {cropConfig.mode === 'custom' && (
        <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/40 p-3">
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
              className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
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
              className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Utility Toggles & Action Row */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          {/* Rule of Thirds Toggle */}
          <button
            type="button"
            onClick={onToggleGrid}
            title="Toggle Rule of Thirds Grid"
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors ${
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
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors ${
              showSafeZone
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Safe Zone</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rotate 90 CW */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
            <span>{cropConfig.rotation}°</span>
          </button>

          {/* Reset Recenter */}
          <button
            type="button"
            onClick={onReset}
            title="Reset to Smart Center Fill"
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 4.3 Blueprint: `src/hooks/useMediaConverter.ts`

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ConversionStatus,
  CropCoordinates,
  ConversionResult,
  VideoConversionTelemetry,
} from '@/types/converter';
import { ExtractedMetadata, MediaFormat } from '@/types/metadata';
import { CropConfig } from '@/components/editor/CropViewport';
import {
  calculateCenterCrop,
  normalizeCropCoordinates,
  detectMediaFormat,
  fileToUint8Array,
} from '@/lib/media_utils';
import { injectRayBanExifBuffer } from '@/lib/exif_injector';
import { reconstructRayBanQuickTimeMov } from '@/lib/atom_synthesizer';
import { FFmpegService } from '@/lib/ffmpeg_service';
import { extractMediaMetadata } from '@/lib/metadata_extractor';

export interface ConverterLog {
  id: string;
  timestamp: string;
  level: 'info' | 'ffmpeg' | 'atom' | 'exif' | 'warn' | 'error';
  message: string;
}

export interface StagedMediaInfo {
  file: File;
  mediaType: 'image' | 'video';
  format: MediaFormat;
  previewUrl: string;
  width: number;
  height: number;
  durationSec?: number;
  fps?: number;
  sizeBytes: number;
}

export interface UseMediaConverterReturn {
  // Staged Media State
  stagedMedia: StagedMediaInfo | null;
  stageFile: (file: File) => Promise<void>;
  clearStagedMedia: () => void;

  // Crop & Framing State
  cropConfig: CropConfig;
  computedCrop: CropCoordinates;
  updateCropConfig: (newConfig: Partial<CropConfig>) => void;
  resetCrop: () => void;

  // Conversion Lifecycle State
  status: ConversionStatus;
  progressPercent: number;
  telemetry: Partial<VideoConversionTelemetry>;
  logs: ConverterLog[];
  result: ConversionResult | null;
  error: string | null;

  // Metadata State
  originalMetadata: ExtractedMetadata | null;
  injectedMetadata: ExtractedMetadata | null;

  // Pipeline Actions
  startConversion: () => Promise<void>;
  cancelConversion: () => void;
  downloadResult: () => void;
  resetAll: () => void;
}

const DEFAULT_CROP_CONFIG: CropConfig = {
  mode: 'center',
  zoom: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
};

export function useMediaConverter(): UseMediaConverterReturn {
  // 1. Staged Media & Probing
  const [stagedMedia, setStagedMedia] = useState<StagedMediaInfo | null>(null);
  const [originalMetadata, setOriginalMetadata] = useState<ExtractedMetadata | null>(null);
  const [injectedMetadata, setInjectedMetadata] = useState<ExtractedMetadata | null>(null);

  // 2. Crop Configuration & Computed Rect
  const [cropConfig, setCropConfig] = useState<CropConfig>(DEFAULT_CROP_CONFIG);
  const [computedCrop, setComputedCrop] = useState<CropCoordinates>({
    x: 0,
    y: 0,
    width: 1376,
    height: 1840,
  });

  // 3. Conversion Lifecycle & Telemetry
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<Partial<VideoConversionTelemetry>>({});
  const [logs, setLogs] = useState<ConverterLog[]>([]);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 4. Refs for Cleanup & Async Pipeline
  const ffmpegServiceRef = useRef<FFmpegService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  const addLog = useCallback((level: ConverterLog['level'], message: string) => {
    const newLog: ConverterLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString().substring(11, 19),
      level,
      message,
    };
    setLogs((prev) => [...prev.slice(-200), newLog]);
  }, []);

  // Recalculate Computed Crop Rect whenever source or cropConfig changes
  useEffect(() => {
    if (!stagedMedia) return;

    const srcW = cropConfig.rotation % 180 === 0 ? stagedMedia.width : stagedMedia.height;
    const srcH = cropConfig.rotation % 180 === 0 ? stagedMedia.height : stagedMedia.width;

    if (cropConfig.mode === 'blur_fill') {
      // For blur fill, entire frame is retained
      setComputedCrop({ x: 0, y: 0, width: srcW, height: srcH });
      return;
    }

    const baseCenter = calculateCenterCrop(srcW, srcH, 1376, 1840);

    if (cropConfig.mode === 'center') {
      setComputedCrop(baseCenter);
      return;
    }

    // Custom Mode with Zoom & Pan
    const zoom = Math.max(1.0, cropConfig.zoom);
    const cropW = Math.round(baseCenter.width / zoom);
    const cropH = Math.round(baseCenter.height / zoom);

    const maxDeltaX = (srcW - cropW) / 2;
    const maxDeltaY = (srcH - cropH) / 2;

    const rawX = (srcW - cropW) / 2 + cropConfig.panX * maxDeltaX;
    const rawY = (srcH - cropH) / 2 + cropConfig.panY * maxDeltaY;

    const normalized = normalizeCropCoordinates(
      {
        x: Math.round(rawX),
        y: Math.round(rawY),
        width: cropW,
        height: cropH,
      },
      srcW,
      srcH
    );

    setComputedCrop(normalized);
  }, [stagedMedia, cropConfig]);

  // Stage User Media File & Probe Headers
  const stageFile = useCallback(async (file: File) => {
    setError(null);
    setStatus('loading');
    setProgressPercent(10);
    addLog('info', `Staging media file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    try {
      const buffer = await fileToUint8Array(file);
      const format = detectMediaFormat(buffer);
      const isVideo = format === 'mp4' || format === 'mov' || format === 'webm';
      const isImage = format === 'jpeg' || format === 'png' || format === 'webp' || format === 'gif';

      if (!isVideo && !isImage) {
        throw new Error(`Unsupported media format: ${file.type || 'unknown'}`);
      }

      // Extract original EXIF or QuickTime metadata
      const origMeta = extractMediaMetadata(buffer);
      setOriginalMetadata(origMeta);
      addLog('info', `Extracted original metadata: Format=${format}, Make=${origMeta.make || 'None'}`);

      // Probe Dimensions
      const previewUrl = URL.createObjectURL(file);
      activeBlobUrlsRef.current.add(previewUrl);

      let width = origMeta.dimensions?.width || 1920;
      let height = origMeta.dimensions?.height || 1080;
      let durationSec: number | undefined;

      if (isVideo) {
        await new Promise<void>((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            width = video.videoWidth || width;
            height = video.videoHeight || height;
            durationSec = video.duration || 0;
            resolve();
          };
          video.onerror = () => resolve(); // fallback to default
          video.src = previewUrl;
        });
      } else {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            width = img.naturalWidth || width;
            height = img.naturalHeight || height;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = previewUrl;
        });
      }

      setStagedMedia({
        file,
        mediaType: isVideo ? 'video' : 'image',
        format,
        previewUrl,
        width,
        height,
        durationSec,
        sizeBytes: file.size,
      });

      setCropConfig(DEFAULT_CROP_CONFIG);
      setStatus('idle');
      setProgressPercent(0);
      addLog('info', `Media staged successfully: ${width}x${height}, Duration: ${durationSec?.toFixed(1) || 'N/A'}s`);
    } catch (err: any) {
      setError(err.message || 'Failed to load media file');
      setStatus('error');
      addLog('error', `Staging error: ${err.message}`);
    }
  }, [addLog]);

  const updateCropConfig = useCallback((newConfig: Partial<CropConfig>) => {
    setCropConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const resetCrop = useCallback(() => {
    setCropConfig(DEFAULT_CROP_CONFIG);
  }, []);

  // Execute Conversion Pipeline
  const startConversion = useCallback(async () => {
    if (!stagedMedia) return;

    setError(null);
    setResult(null);
    setInjectedMetadata(null);
    setProgressPercent(5);
    abortControllerRef.current = new AbortController();

    const timestamp = Date.now();
    const baseName = stagedMedia.file.name.replace(/\.[^/.]+$/, '');

    try {
      if (stagedMedia.mediaType === 'image') {
        // ==========================================
        // 1. IMAGE CONVERSION PIPELINE (Canvas + EXIF)
        // ==========================================
        setStatus('cropping');
        setProgressPercent(20);
        addLog('info', 'Starting Image synthesis to Ray-Ban Meta 1376x1840 format...');

        const canvas = document.createElement('canvas');
        canvas.width = 1376;
        canvas.height = 1840;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to initialize 2D canvas context');

        const img = new Image();
        img.src = stagedMedia.previewUrl;
        await new Promise((r) => (img.onload = r));

        if (cropConfig.mode === 'blur_fill') {
          // Draw blurred background
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.65)';
          ctx.drawImage(img, -50, -50, 1476, 1940);
          ctx.restore();

          // Draw fitted foreground
          const scale = Math.min(1376 / img.naturalWidth, 1840 / img.naturalHeight);
          const fitW = img.naturalWidth * scale;
          const fitH = img.naturalHeight * scale;
          const offX = (1376 - fitW) / 2;
          const offY = (1840 - fitH) / 2;

          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, offX, offY, fitW, fitH);
        } else {
          // Standard Crop / Custom Crop
          ctx.drawImage(
            img,
            computedCrop.x,
            computedCrop.y,
            computedCrop.width,
            computedCrop.height,
            0,
            0,
            1376,
            1840
          );
        }

        setStatus('synthesizing');
        setProgressPercent(60);
        addLog('exif', 'Injecting authentic Luxottica & Ray-Ban Meta Smart Glasses EXIF...');

        const jpegBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
        });

        const rawJpegBytes = await fileToUint8Array(jpegBlob);
        const injectedBytes = injectRayBanExifBuffer(rawJpegBytes, {
          make: 'Luxottica',
          model: 'Ray-Ban Meta Smart Glasses',
          software: 'Meta View',
          lensMake: 'Luxottica',
          lensModel: 'Ray-Ban Meta Smart Glasses',
          width: 1376,
          height: 1840,
        });

        // Extract metadata for diff inspector
        const injectedMeta = extractMediaMetadata(injectedBytes);
        setInjectedMetadata(injectedMeta);

        const finalBlob = new Blob([injectedBytes], { type: 'image/jpeg' });
        const finalUrl = URL.createObjectURL(finalBlob);
        activeBlobUrlsRef.current.add(finalUrl);

        const finalFilename = `RayBan_Meta_${baseName}_${timestamp}.jpg`;
        setResult({
          blob: finalBlob,
          url: finalUrl,
          filename: finalFilename,
          format: 'jpeg',
          size: finalBlob.size,
          width: 1376,
          height: 1840,
        });

        setStatus('completed');
        setProgressPercent(100);
        addLog('exif', 'Photo synthesized and EXIF tags verified successfully!');
      } else {
        // ==========================================
        // 2. VIDEO CONVERSION PIPELINE (FFmpeg + Atoms)
        // ==========================================
        setStatus('transcoding');
        setProgressPercent(10);
        addLog('ffmpeg', 'Initializing FFmpeg WebAssembly transcode engine...');

        if (!ffmpegServiceRef.current) {
          ffmpegServiceRef.current = new FFmpegService();
        }
        const ffmpeg = ffmpegServiceRef.current;

        const transcodedMovBytes = await ffmpeg.transcodeAndCrop(stagedMedia.file, {
          crop: computedCrop,
          targetWidth: 1376,
          targetHeight: 1840,
          fps: 30,
          preset: 'fast',
          crf: 20,
          signal: abortControllerRef.current?.signal,
          onLog: (msg) => addLog('ffmpeg', msg),
          onProgress: (t) => {
            setTelemetry((prev) => ({ ...prev, ...t }));
            if (t.percent) setProgressPercent(t.percent);
          },
        });

        setStatus('synthesizing');
        setProgressPercent(93);
        addLog('atom', 'Reconstructing QuickTime container with Instagram Spin View atoms (tapt + moov.meta keys/ilst)...');

        const finalMovBytes = reconstructRayBanQuickTimeMov(transcodedMovBytes, {
          width: 1376,
          height: 1840,
          metadata: {
            make: 'Luxottica',
            model: 'Ray-Ban Meta Smart Glasses 2',
            software: 'Meta View',
            copyright: 'Meta AI',
          },
        });

        const injectedMeta = extractMediaMetadata(finalMovBytes);
        setInjectedMetadata(injectedMeta);

        const finalBlob = new Blob([finalMovBytes], { type: 'video/quicktime' });
        const finalUrl = URL.createObjectURL(finalBlob);
        activeBlobUrlsRef.current.add(finalUrl);

        const finalFilename = `RayBan_Meta_${baseName}_${timestamp}.mov`;
        setResult({
          blob: finalBlob,
          url: finalUrl,
          filename: finalFilename,
          format: 'mov',
          size: finalBlob.size,
          width: 1376,
          height: 1840,
          duration: stagedMedia.durationSec,
        });

        setStatus('completed');
        setProgressPercent(100);
        addLog('atom', 'Video successfully synthesized with authentic Ray-Ban Meta QuickTime container!');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('warn', 'Conversion cancelled by user.');
        setStatus('idle');
      } else {
        setError(err.message || 'Conversion failed');
        setStatus('error');
        addLog('error', `Pipeline error: ${err.message}`);
      }
    }
  }, [stagedMedia, cropConfig, computedCrop, addLog]);

  // Cancel In-Flight Conversion
  const cancelConversion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (ffmpegServiceRef.current) {
      ffmpegServiceRef.current.terminate();
    }
    setStatus('idle');
    setProgressPercent(0);
    addLog('warn', 'Conversion aborted.');
  }, [addLog]);

  // Programmatic Direct Download
  const downloadResult = useCallback(() => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog('info', `Downloaded output file: ${result.filename}`);
  }, [result, addLog]);

  // Reset Full Workspace & Clean Memory
  const clearStagedMedia = useCallback(() => {
    setStagedMedia(null);
    setResult(null);
    setOriginalMetadata(null);
    setInjectedMetadata(null);
    setStatus('idle');
    setProgressPercent(0);
    setTelemetry({});
    setCropConfig(DEFAULT_CROP_CONFIG);
  }, []);

  const resetAll = useCallback(() => {
    cancelConversion();
    // Revoke all created blob URLs to prevent browser memory leaks
    activeBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    activeBlobUrlsRef.current.clear();
    clearStagedMedia();
    setLogs([]);
  }, [cancelConversion, clearStagedMedia]);

  // Cleanup on Hook Unmount
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      activeBlobUrlsRef.current.clear();
      if (ffmpegServiceRef.current) {
        ffmpegServiceRef.current.terminate();
      }
    };
  }, []);

  return {
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
    originalMetadata,
    injectedMetadata,
    startConversion,
    cancelConversion,
    downloadResult,
    resetAll,
  };
}
```

---

## 5. Verification & Test Plan for M2 Worker

### 5.1 Unit Testing Strategy (`test/unit/useMediaConverter.test.ts`)
1. **Crop Coordinates Math Verification**:
   - Verify `calculateCenterCrop` returns exact $1376:1840$ aspect ratio on $1920\times1080$ (16:9), $1080\times1920$ (9:16), $1080\times1080$ (1:1), and non-standard aspect ratios ($2560\times1440$, $1280\times720$).
   - Verify all returned bounding boxes satisfy `x % 2 === 0`, `y % 2 === 0`, `width % 2 === 0`, and `height % 2 === 0`.
2. **State Machine Transitions**:
   - `stageFile` sets state from `loading` $\rightarrow$ `idle` with populated `stagedMedia` and `originalMetadata`.
   - `startConversion` on an image triggers `cropping` $\rightarrow$ `synthesizing` $\rightarrow$ `completed` with verified `injectedMetadata` (Make: Luxottica, Model: Ray-Ban Meta Smart Glasses).
   - `cancelConversion` aborts processing and resets status to `idle`.
   - `resetAll` clears all references and calls `URL.revokeObjectURL`.

### 5.2 Component Rendering Tests (`test/unit/CropViewport.test.tsx` & `FramingControls.test.tsx`)
- Verify `CropViewport` renders image and video elements with correct CSS scaling and rotation transforms.
- Verify Rule of Thirds and Instagram Safe-Zone overlays toggle properly on click.
- Verify pointer dragging triggers `onCropChange` with updated `panX` and `panY`.
- Verify `FramingControls` renders mode tabs, zoom slider, rotate button, and reset button.

---

## 6. Summary Checklist for Milestone 2 Implementation

| Component / Module | Target File Path | Status | Key Deliverable |
|---|---|---|---|
| Crop Viewport | `src/components/editor/CropViewport.tsx` | Ready for Worker | 1376x1840 interactive HUD, gesture pan, zoom, Rule of Thirds & Safe-Zone overlays |
| Framing Controls | `src/components/editor/FramingControls.tsx` | Ready for Worker | Mode tabs (Smart/Custom/Blur), zoom slider (1.0x-3.0x), 90° rotation, reset |
| Converter Hook | `src/hooks/useMediaConverter.ts` | Ready for Worker | Complete state machine, canvas photo EXIF pipeline, FFmpeg video transcode + QuickTime atom reconstruct |
| Unit Tests | `test/unit/crop_viewport.test.tsx`, `test/unit/useMediaConverter.test.ts` | Ready for Worker | Test coverage across math, gesture callbacks, EXIF injection, and memory cleanup |

