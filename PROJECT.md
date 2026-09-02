# Project: ToRayBan_Converter

## Architecture
ToRayBan_Converter is a client-side modern web application (Next.js App Router with Static Export `output: 'export'`, React, TypeScript, and Tailwind CSS) designed to transform any user-uploaded photo or video into authentic Ray-Ban Meta Smart Glasses format (1376x1840 vertical resolution, QuickTime `.MOV` atom container reconstruction compatible with Instagram Spin View, and camera EXIF metadata injection).

### System Diagram & Data Flow
```
User Media (JPG/PNG/WebP/MP4/MOV/WebM)
             │
             ▼
[Dropzone / Paste Uploader] ──► [Format & Magic Byte Sniffer]
             │
             ▼
[Interactive Crop & Framing Viewport (1376x1840)]
             │
      ┌──────┴─────────────────────────────────┐
      │ (Image Path)                           │ (Video Path)
      ▼                                        ▼
[HTML5 Canvas Resizer]                 [FFmpeg WebAssembly Transcoder]
      │                                (1376x1840 @ 30fps, H.264/AAC)
      ▼                                        │
[EXIF Injector (piexifjs / pure TS)]          ▼
(Make: Luxottica, Model: Ray-Ban Meta, [QuickTime Atom Reconstructor]
 Software: Meta View, Lens: f/2.2)     (ftyp: qt  , tapt: 1376x1840,
      │                                 moov.mvhd: 48000, moov.meta keys/ilst)
      └──────────────┬─────────────────────────┘
                     ▼
[Processed Media Output (.JPG / .MOV)]
                     │
       ┌─────────────┼─────────────────────────┐
       ▼             ▼                         ▼
[Visual Preview &   [Metadata Inspector        [Transfer Guide Modal
 Before/After Slider] (EXIF & Atom Tree Diff)]  (iOS AirDrop / Android DCIM)]
```

### Code Layout
```
ToRayBan_Converter/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── public/
│   ├── favicon.ico
│   └── samples/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── CyberBackground.tsx
│   │   ├── uploader/
│   │   │   ├── Dropzone.tsx
│   │   │   └── FileCard.tsx
│   │   ├── editor/
│   │   │   ├── CropViewport.tsx
│   │   │   └── FramingControls.tsx
│   │   ├── telemetry/
│   │   │   ├── StepperHUD.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   └── TerminalViewer.tsx
│   │   ├── preview/
│   │   │   ├── ComparisonSlider.tsx
│   │   │   ├── SpinViewSimulator.tsx
│   │   │   └── MediaViewer.tsx
│   │   ├── inspector/
│   │   │   ├── MetadataInspector.tsx
│   │   │   ├── ExifDiffTable.tsx
│   │   │   └── QuickTimeAtomTree.tsx
│   │   ├── guide/
│   │   │   ├── TransferGuideModal.tsx
│   │   │   ├── AirDropGuide.tsx
│   │   │   └── AndroidGuide.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useMediaConverter.ts
│   │   └── useDropzone.ts
│   ├── lib/
│   │   ├── atom_synthesizer.ts   (QuickTime atom container parser & builder)
│   │   ├── exif_injector.ts      (Ray-Ban Meta EXIF & TIFF injector)
│   │   ├── ffmpeg_service.ts     (FFmpeg WASM wrapper & crop pipeline)
│   │   ├── metadata_extractor.ts (Client-side EXIF/QuickTime reader)
│   │   └── media_utils.ts        (File sniffer, canvas cropping helpers)
│   └── types/
│       ├── converter.ts
│       ├── metadata.ts
│       └── atoms.ts
├── test/
│   ├── unit/
│   │   ├── exif_injector.test.ts
│   │   ├── atom_synthesizer.test.ts
│   │   ├── atom_adversarial.test.ts
│   │   └── media_utils.test.ts
│   └── e2e/
│       ├── test_runner.py
│       └── fixtures/
├── verify_converter.py
└── README.md
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Client-Side Project Setup & Static Export | Next.js App Router, Tailwind CSS, TypeScript, Static Export (`output: 'export'`) | M1 | ORIGINAL_REQUEST §R1, §R4 |
| 2 | Pure TypeScript EXIF Injection Engine | Injects Make=Luxottica, Model=Ray-Ban Meta Smart Glasses, Software=Meta View, Lens=f/2.2 into JPEGs | M1 | ORIGINAL_REQUEST §R3 |
| 3 | Pure TypeScript QuickTime Atom Reconstructor | Reconstructs .MOV atom hierarchy (`ftyp qt  `, `tapt clef/prof/enof 1376x1840`, `moov.mvhd 48000`, `moov.meta keys/ilst` for Instagram Spin View) | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Client-Side FFmpeg WebAssembly Video Pipeline | In-browser video transcoding & 1376x1840 cropping (30/60 fps, H.264/AAC) with progress hooks | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Cyberpunk / Modern Glassmorphic UI System | Obsidian dark theme, frosted glass cards, neon cyan/violet/emerald accents, HUD badges, responsive layout | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Drag-and-Drop Multi-Format Media Uploader | Supports MP4, MOV, WebM, JPG, PNG, WebP with drag-and-drop, file picker, clipboard paste, magic byte detection | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Interactive 1376x1840 Crop & Framing Viewport | Smart Center Fill, Custom Pan/Zoom Canvas HUD, Rule of Thirds grid, Instagram Safe-Zone overlay | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Media Converter State Machine Hook | Reactive TypeScript hook managing conversion lifecycle, abort controller, and telemetry | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Real-Time Conversion Telemetry HUD | 4-Phase Stepper, Dual Progress Ring, ETA/Speed metrics, and Collapsible Log Terminal | M3 | ORIGINAL_REQUEST §R1 |
| 10 | Before/After Visual Comparison Player | Draggable split-curtain slider and synchronized dual video player controls | M3 | ORIGINAL_REQUEST §R1 |
| 11 | Instagram Spin View 3D Parallax Simulator | Simulated 3D gyroscope/cursor tilt effect visualizing the interactive Instagram Spin View experience | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Interactive Metadata & QuickTime Atom Inspector | Side-by-side diff table (Original vs Injected), interactive expandable ISO QuickTime atom tree, JSON export | M3 | ORIGINAL_REQUEST §R1 |
| 13 | Interactive Mobile Transfer Guide Modal | Lossless AirDrop (iOS) and USB/QuickShare (Android) instructions, anti-compression safety checklist | M3 | ORIGINAL_REQUEST §R1 |
| 14 | Automated Verification Script (`verify_converter.py`) | Programmatic verification runner validating static build, image EXIF injection, and video atom hierarchy | M4 | ORIGINAL_REQUEST §R4 |
| 15 | E2E Testing Suite (Tiers 1-4) & Coverage Hardening | Comprehensive test coverage across all features, boundaries, combinations, and real-world media | M4 | ORIGINAL_REQUEST §R4 |
| 16 | GitHub Integration & Remote Push | Initialize repository, commit clean codebase, push to `https://github.com/triwahyu45/ToRayBan_Converter` | M4 | ORIGINAL_REQUEST §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Engines & Infrastructure | Next.js/Tailwind setup, `exif_injector.ts`, `atom_synthesizer.ts`, `ffmpeg_service.ts`, and core unit tests | none | DONE |
| M2 | UI System, Uploader & Crop Viewport | Cyberpunk glassmorphism layout, Dropzone uploader, 1376x1840 Pan/Zoom Crop viewport, `useMediaConverter` hook | M1 | PLANNED |
| M3 | Telemetry, Spin Preview, Inspector & Guide | Stepper HUD, Terminal, Comparison slider, 3D Spin simulator, Metadata diff table, Atom tree, Transfer guide modal | M2 | PLANNED |
| M4 | E2E Testing Pass, Verification Script & GitHub Push | `verify_converter.py`, 100% E2E test pass (Tiers 1-4), Tier 5 adversarial hardening, Git commit & push | M3, E2E Test Suite | PLANNED |
