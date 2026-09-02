# ToRayBan_Converter — Comprehensive UI/UX Architecture & Interactive Feature Specification

**Author**: Teamwork Preview Explorer (`explorer_ui_survey`)  
**Date**: 2026-09-03  
**Status**: Authoritative Architectural Survey & Specification  
**Target Platform**: Next.js 14+ / React 18+, Tailwind CSS 3.4+, Framer Motion / Lucide Icons, Client-Side WebAssembly (FFmpeg.wasm / ExifTool-JS / custom atom container synthesis)  
**Deployment**: Static Export (GitHub Pages / Vercel / Netlify)

---

## 1. Executive Summary & Design Philosophy

### 1.1 Project Objective
**ToRayBan_Converter** is a high-performance, purely client-side web application designed to transform any standard user photo or video into an authentic **Ray-Ban Meta Smart Glasses** asset (1376x1840 vertical resolution, QuickTime `.MOV` atom container reconstruction compatible with Instagram Spin View, and camera EXIF metadata injection).

### 1.2 Design Language: "Cyberpunk Glassmorphism"
The interface combines the futuristic aesthetic of wearable smart glasses with high-utility studio production tools:
- **Obsidian Void & Deep Glass**: Ultra-dark, high-contrast backdrops (`#050608` to `#0B0E17`) with multi-layered blurred glass panels (`backdrop-blur-2xl`, subtle `rgba(255, 255, 255, 0.05)` borders).
- **Neon Energy Accents**:
  - **Electric Cyan (`#00F0FF`)**: Primary action, brand focal points, viewport framing, and active states.
  - **Cyber Violet (`#8B5CF6` / `#A855F7`)**: Secondary accents, container atom structures, and FFmpeg telemetry.
  - **Matrix Emerald (`#00FF9D` / `#10B981`)**: Successful validation, injected metadata confirmation, and ready-to-download status.
  - **Amber Glow (`#F59E0B` / `#FBBF24`)**: Warning tags, non-destructive crop notices, and telemetry metrics.
  - **Neon Rose / Crimson (`#FF2E63` / `#EF4444`)**: File validation errors, memory pressure alerts, and failure logs.
- **Futuristic Typography & Micro-HUDs**: Geometric sans-serif headers paired with crisp monospace telemetry readouts (`Space Grotesk` / `Geist Sans` + `JetBrains Mono` / `Geist Mono`), featuring HUD brackets, glowing crosshairs, and live coordinate ticks.

---

## 2. Design System & Token Architecture

### 2.1 Color Palette & CSS Variables
```css
:root {
  /* Surface & Backgrounds */
  --bg-void: #050608;
  --bg-obsidian: #090B10;
  --bg-surface-elevated: rgba(15, 18, 28, 0.75);
  --bg-surface-glass: rgba(18, 24, 38, 0.6);
  --bg-surface-sunken: #030406;
  
  /* Borders & Highlights */
  --border-glass: rgba(255, 255, 255, 0.08);
  --border-glass-hover: rgba(0, 240, 255, 0.35);
  --border-glass-active: rgba(0, 240, 255, 0.8);
  --border-violet: rgba(139, 92, 246, 0.4);
  
  /* Neon Accents */
  --neon-cyan: #00F0FF;
  --neon-cyan-glow: 0 0 20px rgba(0, 240, 255, 0.45);
  --neon-violet: #8B5CF6;
  --neon-violet-glow: 0 0 20px rgba(139, 92, 246, 0.45);
  --neon-emerald: #00FF9D;
  --neon-emerald-glow: 0 0 20px rgba(0, 255, 157, 0.45);
  --neon-amber: #FBBF24;
  --neon-amber-glow: 0 0 20px rgba(251, 191, 36, 0.45);
  --neon-rose: #FF2E63;
  --neon-rose-glow: 0 0 20px rgba(255, 46, 99, 0.45);
  
  /* Text */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-accent: #38BDF8;
}
```

### 2.2 Tailwind Utility Classes & Glassmorphism Recipes
```javascript
// tailwind.config.js extension profile
module.exports = {
  theme: {
    extend: {
      colors: {
        void: '#050608',
        obsidian: '#090B10',
        cyber: {
          cyan: '#00F0FF',
          violet: '#8B5CF6',
          emerald: '#00FF9D',
          amber: '#FBBF24',
          rose: '#FF2E63',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.35)',
        'neon-cyan-lg': '0 0 35px rgba(0, 240, 255, 0.55)',
        'neon-violet': '0 0 20px rgba(139, 92, 246, 0.35)',
        'neon-emerald': '0 0 20px rgba(0, 255, 157, 0.35)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        '2xl': '24px',
        '3xl': '32px',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-space-grotesk)', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-grid': 'radial-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 0)',
        'scanlines': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
      }
    },
  },
};
```

---

## 3. Complete Component Architecture & Information Layout

```
AppLayout (Root)
│
├── HeaderNavbar (Sticky Glassmorphic HUD)
│   ├── LogoBadge (Ray-Ban Meta Glasses Icon + Neon Cyberpunk Wordmark)
│   ├── StatusIndicator (WASM Engine Status: Ready / Core Loaded / Standby)
│   ├── GuideModalTrigger (Help / "Transfer Guide" Button with Glow)
│   └── GitHubRepoLink (External Link with Star/Fork Badge)
│
├── MainWorkspace (Dynamic 2-Column Desktop / Stacked Mobile Layout)
│   │
│   ├── LeftPanel: Media Input & Configuration (Primary Studio Controls)
│   │   ├── DragDropUploader (Multi-format dropzone, paste handler, validator)
│   │   │   ├── DropzoneIdleView (Format Badges, Upload CTA, Clipboard trigger)
│   │   │   ├── DropzoneActiveState (Pulsing neon ring, drag telemetry)
│   │   │   └── FileStagedCard (Thumbnail chip, Original codec/dimension tags, reset btn)
│   │   │
│   │   ├── FramingAndCropTool (1376x1840 viewport control)
│   │   │   ├── ModeSelector (Smart Center / Custom Pan-Zoom / Ambient Blur Fill)
│   │   │   ├── AspectRatioPresets (16:9, 1:1, 4:5, 9:16 -> 1376:1840)
│   │   │   └── ViewportControls (Zoom Slider 1x-3x, Rotate 90°, Center Reset)
│   │   │
│   │   ├── ConversionConfigCard (Settings Drawer)
│   │   │   ├── OutputFormatSelector (QuickTime .MOV for Video / .JPG for Photo)
│   │   │   ├── FrameRateSelector (Auto / 30fps / 60fps)
│   │   │   ├── SpinViewMetaToggle (Enable Ray-Ban Meta udta/ilst Atom Injection)
│   │   │   └── PrivacySanitizerToggle (Strip GPS & Personal Camera serials)
│   │   │
│   │   └── ConversionActionTrigger (Glowing CTA Button: "Synthesize Ray-Ban Meta Media")
│   │
│   └── RightPanel: Interactive Studio & Real-time Telemetry
│       ├── ConversionEngineTelemetry (Active during & after processing)
│       │   ├── PhaseStepper (1. Analyze -> 2. Transcode -> 3. Inject Atoms -> 4. Finalize)
│       │   ├── CyberProgressBar (Neon bar + Percentage + Glow particles)
│       │   ├── TelemetryHUD (Speed FPS, Time Elapsed, ETA, RAM Heap)
│       │   └── CollapsibleTerminal (Live FFmpeg / Atom synthesis log viewer)
│       │
│       ├── BeforeAfterPreviewStage (Dual-Mode Interactive Viewer)
│       │   ├── ModeToggleTabs (Split Slider Comparison vs Side-by-Side Sync Player)
│       │   ├── SplitSliderComparison (Interactive Draggable Curtain with Neon Grip)
│       │   ├── SynchronizedVideoPlayer (Scrub bar, loop, play/pause, timecode)
│       │   └── InstagramSpin3DTiltPreview (Gyro / Cursor 3D Parallax Simulator)
│       │
│       ├── MetadataInspectorCard (Interactive Tree & Diff Table)
│       │   ├── InspectorSearchBar (Filter by tag name or atom code)
│       │   ├── DiffTableView (Side-by-side Original vs Injected Ray-Ban Meta tags)
│       │   ├── QuickTimeAtomTree (Hierarchical ftyp > moov > udta > meta > ilst view)
│       │   └── ExportMetadataJSONButton (Download raw schema)
│       │
│       └── FinalOutputDownloadCard (Action Center upon Completion)
│           ├── DownloadButton (Direct Instant Blob Download: `RayBan_Meta_[timestamp].MOV`)
│           ├── OpenTransferGuideCTA (Prompts user to view AirDrop / USB instructions)
│           └── BatchConvertAnotherCTA (Reset workspace for next file)
│
├── TransferGuideModal (Interactive Overlay / Dialog)
│   ├── PlatformTabSelector (iOS AirDrop vs Android QuickShare/USB)
│   ├── StepByStepInteractiveGuide (Step cards with completion checkmarks)
│   ├── PreventionAlerts (Red flags: "Do NOT edit in CapCut/TikTok or send via WhatsApp")
│   └── VerificationChecklist (How to verify EXIF/Spin View on device)
│
└── ToastNotificationSystem (Fixed top-right stacking notifications)
    ├── SuccessToast ("Ray-Ban Meta Injected Successfully")
    ├── WarningToast ("Non-standard framerate detected; normalizing")
    └── ErrorToast ("Media decoding failed; fallback triggered")
```

---

## 4. Drag-and-Drop Media Uploader Component Specification

### 4.1 Functional Requirements & Format Support
- **Supported Video Containers & Codecs**:
  - MP4 (`video/mp4` with H.264 / H.265 / AV1 / VP9)
  - QuickTime MOV (`video/quicktime`)
  - WebM (`video/webm` with VP8 / VP9 / AV1)
- **Supported Image Formats**:
  - JPEG / JPG (`image/jpeg`)
  - PNG (`image/png`)
  - WebP (`image/webp`)
  - HEIC / HEIF (`image/heic` with browser-supported / wasm decoding fallback)
- **File Constraints**:
  - Maximum Recommended Video Size: `500 MB` (browser memory limit protection)
  - Maximum Image Size: `50 MB`
  - Max Video Duration: `180 seconds` (optimal Ray-Ban Meta spin clips are 5–60s)
- **Input Channels**:
  - Direct Drag-and-Drop anywhere over the dropzone or whole viewport.
  - File picker input (`<input type="file" accept="video/*,image/*" />`).
  - System Clipboard Paste (`Ctrl+V` / `Cmd+V` event listener on `window`).
  - Drag from URL (with CORS check).

### 4.2 Interactive States & Micro-interactions
1. **Idle State**:
   - Subtle animated gradient border (`border-dashed border-white/15 hover:border-cyan-400/50`).
   - Central icon: Ray-Ban Meta Glasses wireframe pulsing slowly at 0.5Hz.
   - Format badges displayed in a glowing pill container: `MP4`, `MOV`, `WEBM`, `JPG`, `PNG`, `WEBP`.
   - Microcopy: *"Drag & drop media, click to browse, or paste from clipboard (Ctrl+V)"*.
2. **Drag-Active State (`isDraggingOver`)**:
   - Dropzone elevates with `scale(1.02)` and intense cyan glow (`box-shadow: 0 0 30px rgba(0,240,255,0.4)`).
   - Dashed border transitions into a solid animated running marquee stroke.
   - Central icon shifts to an animated suction arrow indicating capture readiness.
   - Microcopy: *"Release to Load into Ray-Ban Synthesis Engine"*.
3. **Validation & Sniffing State**:
   - Inspects file magic numbers (e.g. `ftyp`, `RIFF`, `\xFF\xD8\xFF`, `\x89PNG`) to guarantee format integrity beyond file extension spoofing.
   - Extracts initial video/image headers: Dimensions, Aspect Ratio, Frame Rate, Duration, File Size.
4. **Staged State (File Ready)**:
   - Displays miniature media card with glowing border.
   - Badges: `[ORIGINAL: 1920x1080 @ 60fps | 24.5 MB | MP4/H.264]`.
   - Mini thumbnail preview with "Replace File" and "Clear" buttons.

### 4.3 UI Component Implementation Spec (React/Tailwind)
```tsx
interface MediaFileStaged {
  file: File;
  type: 'video' | 'image';
  previewUrl: string;
  name: string;
  sizeBytes: number;
  width: number;
  height: number;
  aspectRatio: number;
  durationSeconds?: number;
  frameRate?: number;
  originalCodec?: string;
}
```

---

## 5. Media Crop & Framing Viewport (1376x1840) Specification

### 5.1 The Ray-Ban Meta Framing Standard
Ray-Ban Meta Smart Glasses capture photos and videos at an exact native vertical aspect ratio and resolution:
- **Exact Pixel Dimensions**: **`1376 x 1840` pixels**
- **Aspect Ratio**: `43:57.5` ($\approx 0.747826...$, close to 3:4 vertical).
- **Target Frame Rates**: `30.00 fps` or `60.00 fps`.

### 5.2 Framing Modes
The framing tool provides three distinct framing modes tailored for different source content:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRAMING MODES COMPARISON                        │
├───────────────────┬────────────────────────────┬───────────────────────┤
│ Mode A: Smart     │ Mode B: Custom Pan & Zoom  │ Mode C: Ambient Blur  │
│ Center Crop       │ Interactive Viewport       │ Pillarbox Fill        │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ • Scales media to │ • Full touch & mouse drag  │ • Keeps entire        │
│   fill 1376x1840  │ • Pinch-to-zoom / Slider   │   landscape intact    │
│ • Centers subject │ • Manual pan offsets (X,Y) │ • 1376x1840 canvas    │
│ • No black bars   │ • 90° rotation controls    │   with blurred mirror │
│ • Instant 1-click │ • Rule-of-thirds grid HUD  │   background fill     │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

### 5.3 Interactive Pan/Zoom Viewport HUD
- **HUD Grid & Overlays**:
  - **Cyan Rule-of-Thirds Grid**: Delicate `rgba(0, 240, 255, 0.25)` lines dividing the 1376x1840 viewport into 9 quadrants.
  - **Center Crosshair (`+`)**: High-precision targeting reticle with glowing pulse.
  - **Instagram Spin View Safe-Zone**: Outer 8% boundary guide showing where Instagram UI (username, captions, like buttons) overlays the video during Spin View mode.
  - **Live Crop Coordinates HUD**:
    ```
    [CROP HUD: X=272px | Y=0px | W=1376px | H=1840px | SCALE=1.25x | ROT=0°]
    ```
- **Touch & Mouse Controls**:
  - Pan: Click and drag / single finger swipe on viewport canvas.
  - Zoom: Mouse wheel scroll / two-finger pinch / dedicated HUD slider (`1.0x` to `3.0x`).
  - Rotation: Quick rotate button (`+90° CW`).
  - Reset Button: Snaps immediately back to smart center fill.

### 5.4 Crop Math & Filter Graph Translation
When the user adjusts the viewport, the UI computes normalized and absolute crop parameters passed directly to the conversion engine:

$$\text{Target Aspect Ratio } R_{\text{target}} = \frac{1376}{1840} \approx 0.747826$$

$$\text{Scale Factor } S = \max\left(\frac{1376}{W_{\text{src}}}, \frac{1840}{H_{\text{src}}}\right) \times \text{UserZoom}$$

$$\text{FFmpeg Filter Expression}: \quad \texttt{crop=w=1376:h=1840:x=offsetX:y=offsetY,scale=1376:1840}$$

---

## 6. Real-Time Conversion Engine UI & Telemetry Pipeline Specification

### 6.1 Multi-Stage Pipeline Stepper
The conversion engine features 4 discrete phases with visual status indicators:

```
[ PHASE 1: PROBE ] ──► [ PHASE 2: TRANSCODE ] ──► [ PHASE 3: ATOM INJECT ] ──► [ PHASE 4: FINALIZE ]
  - Container Scan       - 1376x1840 Scaling        - QuickTime 'udta' Atoms      - Blob URL Ready
  - Audio/Video Codec    - H.264 High Profile       - 'moov' Hierarchy Fix        - Integrity Check
  - EXIF Extraction      - AAC Audio Normalization  - EXIF 'Luxottica' Meta       - Ready to Download
```

### 6.2 Animated Cyberpunk Progress Ring & Telemetry HUD
- **Progress Bar**: Dual-layer animated gradient (`bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400`) with particle shimmer and glowing tip.
- **Telemetry HUD Cards**:
  - **Processing Speed**: Live frame rate `34.2 fps` (for video) or `18.4 MB/s`.
  - **Time Elapsed / ETA**: `00:04.8 / ETA: ~00:07.1`.
  - **Frames Processed**: `Frame 289 / 720 (40.1%)`.
  - **WASM Memory Heap**: `Heap: 245 MB / 1024 MB`.

### 6.3 Collapsible Interactive Log Terminal
- **Visual Design**: Dark matrix console (`bg-black/95 text-xs font-mono border border-emerald-500/30 rounded-lg p-3 shadow-inner`).
- **Log Formatting & Color Highlights**:
  - `[INFO]`: Electric Cyan (`#00F0FF`)
  - `[FFMPEG]`: Cyber Violet (`#A855F7`)
  - `[ATOM]`: Neon Amber (`#FBBF24`)
  - `[EXIF]`: Matrix Emerald (`#00FF9D`)
  - `[WARN/ERR]`: Neon Rose (`#FF2E63`)
- **Terminal Features**:
  - Auto-scroll lock toggle (checkbox / button).
  - Clear Terminal button.
  - Copy Full Log to Clipboard button.
  - Filter by Log Level dropdown (`ALL`, `FFMPEG`, `ATOM`, `ERRORS`).

---

## 7. Side-by-Side Before/After Preview Player & Split Comparison Slider

### 7.1 Split Slider Mode (Curtain Comparison)
- **Interactive Divider**:
  - Vertical glowing cyan line with centered dual-arrow circular handle (`< | >`).
  - Draggable across `0%` to `100%` viewport width.
  - Smooth touch/mouse tracking with linear spring physics.
- **Left Side ("Original Source")**:
  - Displays original frame in source aspect ratio (e.g. 16:9 / 1:1).
  - Corner Badge: `ORIGINAL SOURCE [1920x1080 | Standard MOV]`.
- **Right Side ("Ray-Ban Meta Synthesized")**:
  - Displays formatted `1376x1840` output with authentic color tone and framing.
  - Corner Badge: `RAY-BAN META [1376x1840 | Instagram Spin Ready]`.

### 7.2 Synchronized Dual Video Player
- When video is converted, both Before and After players play synchronously:
  - Global Play / Pause button (`Spacebar` shortcut).
  - Synchronized timeline scrubber with hover timestamp preview.
  - Playback speed toggle (`0.5x`, `1.0x`, `2.0x`).
  - Loop playback toggle.
  - Audio mute / volume slider.

### 7.3 Simulated Instagram Spin View 3D Parallax Preview
To demonstrate why the `.MOV` atom injection matters, the interface includes an interactive 3D simulated Instagram Spin View:
- **Mechanism**: Utilizes CSS 3D Transforms (`perspective(1200px)`, `rotateY(calc(deg))`, `rotateX(calc(deg))`) hooked into cursor mouse coordinates or mobile device gyroscope (`DeviceOrientationEvent`).
- **Visual Effect**: Tilting the viewport mimics how Instagram's mobile app shifts the photo/video in 3D parallax when the user moves their phone, confirming that the Ray-Ban Meta motion vectors and camera profiles are fully active!

---

## 8. Interactive Metadata Inspector & Atom Tree Viewer

### 8.1 Dual-Column Diff Table
The Metadata Inspector displays an exhaustive property-by-property comparison between the original input file and the synthesized Ray-Ban Meta output:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   METADATA INSPECTOR & ATOM DIFF                                 │
├──────────────────────────┬─────────────────────────────────┬─────────────────────────────────────┤
│ Property / Tag Key       │ Original Input Metadata         │ Ray-Ban Meta Injected Metadata      │
├──────────────────────────┼─────────────────────────────────┼─────────────────────────────────────┤
│ Camera Make              │ Apple / Sony / Samsung / None   │ Luxottica [INJECTED]                │
│ Camera Model             │ iPhone 15 / Galaxy S24 / None   │ Ray-Ban Meta Smart Glasses [INJECT] │
│ Software / Firmware      │ iOS 17.4 / Adobe Premiere       │ Meta View v3.0.0 [INJECTED]         │
│ Resolution               │ 1920 x 1080 (16:9)              │ 1376 x 1840 (Vertical 43:57.5)      │
│ Video Codec              │ Variable (H.264 / HEVC / VP9)   │ AVC1 / H.264 High Profile @ L4.2    │
│ Frame Rate               │ 24.00 / 29.97 / 59.94 fps       │ 30.000 / 60.000 fps (Normalized)    │
│ QuickTime Major Brand    │ mp42 / isom / qt                │ qt   (Authentic QuickTime MOV)      │
│ QuickTime Compatible     │ mp41, mp42, isom                │ qt  , isom, mp42                    │
│ udta > meta > ilst > ©mak│ [MISSING]                       │ Luxottica                           │
│ udta > meta > ilst > ©mod│ [MISSING]                       │ Ray-Ban Meta Smart Glasses          │
│ udta > meta > ilst > ©swr│ [MISSING]                       │ Meta View                           │
│ GPS Geolocation Data     │ Lat: 37.7749, Lon: -122.4194    │ [STRIPPED FOR PRIVACY]              │
│ Audio Codec / Sample     │ Variable                        │ mp4a (AAC-LC) @ 48000 Hz Stereo     │
└──────────────────────────┴─────────────────────────────────┴─────────────────────────────────────┘
```

### 8.2 Hierarchical Atom Tree Viewer (QuickTime Container)
An expandable tree component visualizing the ISO Base Media File Format (ISOBMFF) / QuickTime atom hierarchy:
```
▼ [ftyp] File Type Box (major_brand: 'qt  ', minor_version: 0)
▼ [moov] Movie Box
  ├── [mvhd] Movie Header Box (timescale: 600, duration: 1800)
  ├── ▼ [trak] Video Track (track_ID: 1, 1376x1840)
  │     ├── [tkhd] Track Header Box
  │     └── ▼ [mdia] Media Box
  │           ├── [mdhd] Media Header Box
  │           ├── [hdlr] Handler Reference Box (vide)
  │           └── ▼ [minf] Media Information Box
  │                 └── ▼ [stbl] Sample Table Box
  │                       └── [stsd] Sample Description (avc1)
  ├── ▼ [trak] Audio Track (track_ID: 2, 48000Hz Stereo)
  │     └── ... [stsd] (mp4a)
  └── ▼ [udta] User Data Box
        └── ▼ [meta] Metadata Box
              └── ▼ [ilst] Item List Box (Instagram Spin View Triggers)
                    ├── [©mak] -> "Luxottica"
                    ├── [©mod] -> "Ray-Ban Meta Smart Glasses"
                    ├── [©swr] -> "Meta View"
                    └── [©xyz] -> Location / Gyro tag
```

### 8.3 Inspector Controls
- **Search Filter**: Real-time fuzzy search across atom names, keys, and values.
- **Copy Key/Value**: 1-click clipboard copy for any metadata field.
- **Download JSON**: Generates and downloads a complete `metadata_report.json` containing the entire atom structure and EXIF dump.

---

## 9. Interactive Transfer Guide Modal Specification

### 9.1 The Transfer Problem Statement
When users download the synthesized `.MOV` or `.JPG` on their PC or Mac and attempt to send it to their mobile device via standard messaging platforms (WhatsApp, Telegram, Messenger, Discord), the platform re-compresses the video, converts it to standard MP4, and **strips the vital `udta`/`ilst` QuickTime atoms and EXIF tags**. This breaks Instagram's glasses detection algorithm and prevents the Spin View feature from activating.

### 9.2 Modal Tab Architecture
The Transfer Guide Modal provides an interactive, platform-tailored transfer guide:

#### Tab 1: iOS (iPhone / iPad — Lossless Transfer)
1. **Method A: Direct Download on iPhone** (Recommended for web users on mobile Safari):
   - Tap "Download .MOV" -> Tap Safari Downloads Manager -> Tap Share Icon -> Tap **"Save Video"** to save directly into Apple Photos Camera Roll.
2. **Method B: AirDrop from Mac / PC**:
   - Select the file on Mac -> AirDrop to iPhone -> On iPhone prompt, select **"Photos"** (NOT Files / iCloud Drive).
3. **Method C: iTunes / Finder Cable Sync**:
   - Connect via Lightning/USB-C -> Drag file into Apple TV / Photos sync directory.
4. **Verification in Apple Photos**:
   - Open video in Photos app -> Swipe UP on the media -> Look for the camera info card displaying: **`Luxottica Ray-Ban Meta Smart Glasses`**.
5. **Posting to Instagram**:
   - Open Instagram -> Create Story / Reel / Post -> Select the video from Recents -> Instagram automatically identifies the metadata and displays the **"Glasses / Spin View"** badge!

#### Tab 2: Android (Samsung, Google Pixel, Xiaomi, OnePlus)
1. **Method A: Direct Mobile Download** (Chrome / Samsung Internet):
   - Tap "Download .MOV" -> Open Google Photos or Native Gallery -> File appears under "Downloads" or "Camera".
2. **Method B: Quick Share / Nearby Share from Windows PC**:
   - Use Windows Quick Share app -> Send to Android device -> Accept transfer into Gallery.
3. **Method C: USB-C Direct File Transfer**:
   - Connect phone via USB-C cable -> Set USB mode to "File Transfer (MTP)" -> Copy file directly into the internal storage directory: `/DCIM/Camera/`.
4. **Verification in Google Photos**:
   - Open video -> Tap three dots (⋮) -> Confirm Camera Details: `Luxottica - Ray-Ban Meta Smart Glasses`.

#### Tab 3: "Dos and Don'ts" Interactive Safety Rules
- ❌ **DON'T** send via WhatsApp, Messenger, or Telegram as standard video/photo (recompression destroys atoms).
- ❌ **DON'T** edit or trim the video in CapCut, InShot, or TikTok before posting (these apps re-render without `udta` atoms).
- ✅ **DO** send via Telegram or WhatsApp ONLY as **"Uncompressed File / Document"**.
- ✅ **DO** keep video duration between 5 and 60 seconds for the highest Instagram Spin View reliability.

---

## 10. Accessibility, Error Handling & Notification System

### 10.1 Accessibility (a11y) Conformance
- **WCAG 2.1 AA / AAA Compliance**:
  - Color contrast ratio: High-contrast neon text on deep obsidian surfaces exceeds `7:1` for normal text and `4.5:1` for UI components.
  - Full Keyboard Navigation:
    - `Tab` / `Shift+Tab` across all interactive elements with glowing focus rings (`focus:ring-2 focus:ring-cyan-400 focus:outline-none`).
    - `Space` / `Enter` for buttons, toggles, and video playback.
    - Arrow keys (`Left`/`Right`/`Up`/`Down`) for framing pan coordinates and comparison slider scrubber.
    - `Escape` for instant modal and terminal dismissal.
- **Screen Reader Support**:
  - `aria-live="polite"` on conversion status and progress updates.
  - `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
  - Accessible labels (`aria-label`) on all icon-only buttons (e.g. "Rotate 90 degrees", "Reset Crop", "Copy Metadata").
  - `role="dialog"` with focus trap and `aria-modal="true"` on the Transfer Guide Modal.
- **Reduced Motion Support**:
  - Automatically queries `@media (prefers-reduced-motion: reduce)`.
  - Disables background particle sweeps, pulsing glows, and scanline animations when reduced motion is preferred.

### 10.2 Error Handling & Resilient Recovery
- **WebAssembly Memory Exhaustion Protection**:
  - If a 4K 60fps video exceeds browser WebAssembly heap limits, the engine gracefully catches the error, notifies the user via an amber toast, and offers automated client-side downscaling to 1080p before processing.
- **Corrupted / Unsupported Codec Fallback**:
  - If direct container synthesis fails, the pipeline automatically routes the file through FFmpeg WASM transcode fallback.
- **Network / Offline Resilience**:
  - The entire application, WebAssembly core, and workers are cached via Service Worker / PWA manifest, allowing 100% offline conversions.

### 10.3 Toast Notification Architecture
- Toasts render in a fixed glassmorphic stack at the top-right corner (`z-50`).
- Auto-dismisses after 5000ms with a smooth swipe-to-dismiss gesture.
- Notification types:
  - **Success**: Emerald glow, checkmark icon, action button.
  - **Info**: Cyan glow, info pulse icon.
  - **Warning**: Amber glow, triangle warning icon.
  - **Error**: Neon rose glow, alert octagon icon, retry CTA.

---

## 11. Responsive Layout & Viewport Adaptations

### 11.1 Desktop Widescreen Layout (>= 1024px)
- **Two-Column High-Productivity Studio Layout**:
  - **Left Column (45% width)**: Uploader, Framing/Crop tool, Aspect ratio presets, and Action controls.
  - **Right Column (55% width)**: Real-time Telemetry, Before/After preview slider, Metadata inspector, and Log console.

### 11.2 Tablet & Mobile Layout (< 1024px)
- **Single-Column Stacked / Tabbed Workflow**:
  - **Step 1: Upload & Frame**: Top-level sticky uploader and interactive touch-optimized crop viewport.
  - **Step 2: Synthesize & Telemetry**: Progress bar and collapsible terminal.
  - **Step 3: Review & Download**: Touch-friendly comparison slider, metadata inspector accordion, and prominent sticky download button at the bottom of the mobile viewport.

---

## 12. Implementation Roadmap & Interface Contracts for Worker Agents

To ensure seamless integration across the project milestones, the following UI component contracts and state interfaces are established:

### 12.1 Core State Management Model (`useConverterStore` / React Context)
```typescript
export interface ConversionState {
  // Media Input State
  stagedMedia: MediaFileStaged | null;
  cropConfig: {
    mode: 'center' | 'custom' | 'blur_fill';
    zoom: number; // 1.0 to 3.0
    panX: number; // pixel offset
    panY: number; // pixel offset
    rotation: number; // 0, 90, 180, 270
    targetWidth: 1376;
    targetHeight: 1840;
  };
  
  // Engine & Processing State
  phase: 'idle' | 'probing' | 'transcoding' | 'injecting_atoms' | 'finalizing' | 'completed' | 'error';
  progressPercent: number; // 0 - 100
  telemetry: {
    fps: number;
    timeElapsedSeconds: number;
    estimatedTimeRemainingSeconds: number;
    currentFrame: number;
    totalFrames: number;
    heapMemoryMB: number;
  };
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'info' | 'ffmpeg' | 'atom' | 'exif' | 'warn' | 'error';
    message: string;
  }>;
  
  // Output & Metadata State
  convertedBlobUrl: string | null;
  convertedFileName: string | null;
  originalMetadata: Record<string, any> | null;
  injectedMetadata: Record<string, any> | null;
  quickTimeAtomTree: any | null;
  
  // UI & Modal States
  isTransferGuideOpen: boolean;
  activePreviewTab: 'split_slider' | 'side_by_side' | 'spin_3d';
  isTerminalOpen: boolean;
  toasts: Array<{
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    description: string;
  }>;
}
```

### 12.2 Component File Structure
```
src/
├── app/
│   ├── layout.tsx                # Root HTML, fonts, SEO & OpenGraph tags
│   ├── page.tsx                  # Main Studio Page mounting StudioLayout
│   └── globals.css               # Cyberpunk glassmorphic design tokens & animations
├── components/
│   ├── navbar/
│   │   ├── HeaderNavbar.tsx      # Sticky glass header with HUD indicators
│   │   └── StatusPill.tsx        # WASM engine health indicator
│   ├── uploader/
│   │   ├── DragDropUploader.tsx  # Multi-format dropzone & paste handler
│   │   ├── FormatBadges.tsx      # Neon format tag chips
│   │   └── StagedMediaCard.tsx   # File chip with resolution/duration stats
│   ├── framing/
│   │   ├── FramingViewport.tsx   # Interactive 1376x1840 crop canvas with HUD
│   │   ├── FramingControls.tsx   # Zoom slider, rotate button, preset toggles
│   │   └── SafeZoneOverlay.tsx   # Instagram Spin View safe-zone boundary
│   ├── engine/
│   │   ├── ProgressHUD.tsx       # Glowing progress bar & phase stepper
│   │   ├── TelemetryGrid.tsx     # Speed, ETA, frame counter badges
│   │   └── TerminalViewer.tsx    # Collapsible dark matrix log console
│   ├── preview/
│   │   ├── BeforeAfterStage.tsx  # Master container for comparison
│   │   ├── SplitSlider.tsx       # Draggable curtain comparison component
│   │   ├── DualPlayerSync.tsx    # Synchronized dual video player controls
│   │   └── Spin3DPreview.tsx     # 3D Gyro / Parallax tilt simulator
│   ├── inspector/
│   │   ├── MetadataInspector.tsx # Dual-column diff & search bar
│   │   ├── AtomTreeView.tsx      # Expandable QuickTime atom hierarchy
│   │   └── HexDumpViewer.tsx     # Raw atom byte inspector
│   ├── guide/
│   │   ├── TransferGuideModal.tsx# Tabbed iOS / Android transfer instructions
│   │   └── TransferChecklist.tsx # Interactive step checkmarks & warning alerts
│   └── ui/
│       ├── Button.tsx            # Cyberpunk neon button variants
│       ├── GlassCard.tsx         # Standard glassmorphic container
│       ├── ToastContainer.tsx    # Stacking notification manager
│       └── Dialog.tsx            # Accessible modal dialog primitive
└── lib/
    ├── store/                    # Zustand / React Context state management
    ├── converter/                # FFmpeg WASM / Atom synthesis bridge
    └── utils/                    # Math, formatters, and clipboard helpers
```

---

## 13. Summary & Delivery Verification Checklist

| Requirement | Specification Location | Architectural Readiness |
|---|---|---|
| Modern / Cyberpunk Glassmorphic Design System | Section 1, 2 | Complete tokens, palettes, Tailwind recipes, typography |
| Drag-and-drop Media Uploader | Section 4 | Multi-format validation, clipboard paste, staged card |
| Media Crop & Framing Tool (1376x1840) | Section 5 | Smart Center, Custom Pan/Zoom, Ambient Blur, Math specs |
| Real-time Conversion Engine UI & Telemetry | Section 6 | 4-Phase Stepper, Progress Ring, Speed/ETA HUD, Terminal |
| Before/After Preview & Split Comparison Slider | Section 7 | Draggable Curtain, Dual Player Sync, 3D Spin Parallax |
| Interactive Metadata Inspector & Atom Tree | Section 8 | Diff Table, ISO Atom Tree, Search, JSON Export |
| Interactive Transfer Guide Modal (iOS/Android) | Section 9 | Lossless AirDrop/USB flows, anti-compression warnings |
| Accessibility, Error Handling & Toasts | Section 10 | WCAG AA/AAA, Keyboard nav, ARIA, OOM resilience |
| Component Hierarchy & Interface Contracts | Section 12 | Complete TypeScript models, folder layouts, and store |

This concludes the architectural survey and interactive feature specification for the UI/UX layer of **ToRayBan_Converter**.
