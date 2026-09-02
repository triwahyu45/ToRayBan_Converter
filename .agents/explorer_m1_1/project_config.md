# Project Configuration & Architecture Blueprint (Milestone 1)

**Project:** ToRayBan_Converter  
**Target:** Client-Side Web Application for Ray-Ban Meta Smart Glasses Media Conversion  
**Author:** `teamwork_preview_explorer` (Agent 1 - M1 Explorer)  
**Date:** 2026-09-03  
**Status:** Recommended for Implementation  

---

## Executive Summary

ToRayBan_Converter is a client-side modern web application engineered to convert any photo or video into authentic Ray-Ban Meta Smart Glasses format (1376x1840 vertical resolution, QuickTime `.MOV` atom container hierarchy for Instagram Spin View, and camera EXIF metadata injection).

This document details the complete, validated project setup, package dependencies, configuration files, and unit testing infrastructure designed for zero-backend static export (`output: 'export'`) deployable to GitHub Pages and Vercel.

---

## 1. Directory Structure & Layout

Following the architecture defined in `PROJECT.md`:

```
ToRayBan_Converter/
├── package.json                   # NPM dependencies and pipeline scripts
├── tsconfig.json                  # Strict TypeScript configuration with @/* aliases
├── next.config.mjs                # Next.js Static Export & WebAssembly configuration
├── tailwind.config.ts             # Cyberpunk palette & glassmorphic utilities
├── postcss.config.mjs             # PostCSS Tailwind & Autoprefixer plugin config
├── vitest.config.ts               # Unit test runner configuration
├── public/
│   ├── favicon.ico
│   ├── samples/                   # Sample test assets (images/videos)
│   └── ffmpeg/                    # Optional local fallback for @ffmpeg/core
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with Cyberpunk theme & fonts
│   │   ├── page.tsx               # Main converter workspace view
│   │   └── globals.css            # Tailwind directives, animations & glass styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Cyberpunk nav bar with badges & GitHub link
│   │   │   ├── Footer.tsx         # System status and build metadata
│   │   │   └── CyberBackground.tsx # Glowing grid, particles, and gradient mesh
│   │   ├── uploader/
│   │   │   ├── Dropzone.tsx       # Drag-and-drop multi-format uploader
│   │   │   └── FileCard.tsx       # Active file thumbnail and format indicator
│   │   ├── editor/
│   │   │   ├── CropViewport.tsx   # 1376x1840 interactive canvas & framing HUD
│   │   │   └── FramingControls.tsx# Pan, zoom, center-fill & fit controls
│   │   ├── telemetry/
│   │   │   ├── StepperHUD.tsx     # 4-stage processing progress indicator
│   │   │   ├── ProgressRing.tsx   # Circular HUD progress ring with ETA/speed
│   │   │   └── TerminalViewer.tsx # Collapsible real-time FFmpeg & atom log feed
│   │   ├── preview/
│   │   │   ├── ComparisonSlider.tsx # Before/After split curtain slider
│   │   │   ├── SpinViewSimulator.tsx # 3D gyroscope/cursor tilt Instagram simulator
│   │   │   └── MediaViewer.tsx    # Responsive high-fidelity media player
│   │   ├── inspector/
│   │   │   ├── MetadataInspector.tsx # Tabbed inspector for EXIF & QuickTime atoms
│   │   │   ├── ExifDiffTable.tsx  # Side-by-side original vs injected EXIF diff
│   │   │   └── QuickTimeAtomTree.tsx # Expandable ISO QuickTime box tree viewer
│   │   ├── guide/
│   │   │   ├── TransferGuideModal.tsx # Mobile transfer instructions modal
│   │   │   ├── AirDropGuide.tsx   # Lossless iOS AirDrop step-by-step
│   │   │   └── AndroidGuide.tsx   # Lossless Android DCIM / QuickShare step-by-step
│   │   └── ui/
│   │       ├── Button.tsx         # Cyberpunk styled buttons (neon cyan/violet/amber)
│   │       ├── Modal.tsx          # Frosted glass modal overlay
│   │       ├── Badge.tsx          # Neon HUD status badges
│   │       └── Toast.tsx          # Toast notification provider
│   ├── hooks/
│   │   ├── useMediaConverter.ts   # Core state machine hook for media pipeline
│   │   └── useDropzone.ts         # Hook handling drag, drop, and paste events
│   ├── lib/
│   │   ├── atom_synthesizer.ts    # QuickTime MOV atom container reconstructor & parser
│   │   ├── exif_injector.ts       # Ray-Ban Meta EXIF/TIFF metadata injector
│   │   ├── ffmpeg_service.ts      # WebAssembly video transcoder & cropper
│   │   ├── metadata_extractor.ts  # Client-side EXIF and QuickTime atom parser
│   │   └── media_utils.ts         # Magic byte sniffer, canvas cropping calculations
│   └── types/
│       ├── atoms.ts               # QuickTime atom node interfaces
│       ├── converter.ts           # Conversion status, stages, and options types
│       ├── metadata.ts            # Ray-Ban EXIF and QuickTime metadata types
│       └── piexifjs.d.ts          # Type declarations for piexifjs library
├── test/
│   ├── unit/
│   │   ├── exif_injector.test.ts  # Unit tests for EXIF injection & extraction
│   │   ├── atom_synthesizer.test.ts # Unit tests for QuickTime atom hierarchy
│   │   └── media_utils.test.ts    # Unit tests for magic bytes & crop calculations
│   └── e2e/
│       ├── test_runner.py         # Python E2E test suite (Tiers 1-4)
│       └── fixtures/              # Test fixtures for E2E validation
├── verify_converter.py            # Automated verification runner (build + test + EXIF/MOV)
└── README.md                      # Project documentation and deployment instructions
```

---

## 2. Recommended Dependency Architecture (`package.json`)

### 2.1 Dependencies Analysis
- **Framework Core**: `next@^14.2.24`, `react@^18.3.1`, `react-dom@^18.3.1`. (Provides optimal stability and zero peer-dependency friction with WebAssembly and legacy EXIF libraries while supporting full App Router features).
- **TypeScript**: `typescript@^5.6.3` with `@types/react@^18.3.18`, `@types/react-dom@^18.3.5`, `@types/node@^22.10.7`.
- **Styling & UI**:
  - `tailwindcss@^3.4.17` + `postcss@^8.4.49` + `autoprefixer@^10.4.20`
  - `@tailwindcss/typography@^0.5.15`
  - `lucide-react@^0.475.0` (Comprehensive iconography: Glasses, Sparkles, Sliders, ShieldCheck, Download, Smartphone, Info, Layers, RefreshCw)
  - `clsx@^2.1.1` & `tailwind-merge@^2.6.0` (Reliable dynamic className construction)
  - `framer-motion@^11.18.2` (Smooth UI micro-interactions, modal transitions, and progress rings)
  - `canvas-confetti@^1.9.4` & `@types/canvas-confetti@^1.9.0` (Conversion completion celebration)
- **Media & Binary Processing**:
  - `@ffmpeg/ffmpeg@^0.12.15`: Client-side WebAssembly FFmpeg orchestration.
  - `@ffmpeg/util@^0.12.2`: Buffer/Blob utilities for FFmpeg WASM.
  - `@ffmpeg/core@^0.12.10`: Single-threaded WebAssembly FFmpeg core binaries (runs without COOP/COEP header constraints on static hosts).
  - `piexifjs@^1.0.6`: Pure JavaScript JPEG EXIF binary manipulator.
- **Testing & Verification**:
  - `vitest@^2.1.8`: Lightning-fast pure TypeScript unit test runner.
  - `@vitest/coverage-v8@^2.1.8`: Built-in code coverage reporter.
  - `jsdom@^25.0.1`: DOM environment for unit testing canvas & browser APIs.
  - `@testing-library/react@^16.1.0` & `@testing-library/jest-dom@^6.6.3`: React component test utilities.

### 2.2 Complete `package.json` File Template

```json
{
  "name": "torayban_converter",
  "version": "1.0.0",
  "description": "Client-side modern web application transforming media into authentic Ray-Ban Meta Smart Glasses format (1376x1840 MOV/EXIF)",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "python test/e2e/test_runner.py",
    "verify": "python verify_converter.py"
  },
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.15",
    "@ffmpeg/util": "^0.12.2",
    "@ffmpeg/core": "^0.12.10",
    "canvas-confetti": "^1.9.4",
    "clsx": "^2.1.1",
    "framer-motion": "^11.18.2",
    "lucide-react": "^0.475.0",
    "next": "^14.2.24",
    "piexifjs": "^1.0.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.15",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^22.10.7",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitest/coverage-v8": "^2.1.8",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

---

## 3. Next.js Static Export Configuration (`next.config.mjs`)

### 3.1 Design Rationale
1. **`output: 'export'`**: Generates an `out/` static directory containing HTML, JS, CSS, and assets with no Node.js runtime requirement.
2. **`images: { unoptimized: true }`**: Required for `next/image` in static export mode.
3. **`basePath` & `assetPrefix`**: Dynamic resolution based on `process.env.NEXT_PUBLIC_BASE_PATH` ensures flawless routing both at root domains (Vercel) and subpath repositories (GitHub Pages: `/ToRayBan_Converter`).
4. **`trailingSlash: true`**: Ensures static web servers resolve routes as `route/index.html` preventing 404s on page refresh.
5. **Webpack WASM & Fallback Configuration**: Ensures Node.js modules (`fs`, `path`, `crypto`) are safely stubbed for browser builds, and asynchronous WebAssembly loading is enabled.

### 3.2 Complete `next.config.mjs` File Template

```javascript
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  assetPrefix: basePath,
  webpack: (config, { isServer }) => {
    // Stub Node.js built-ins in browser context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
```

---

## 4. TypeScript Configuration (`tsconfig.json`)

### 4.1 Key Settings
- **Strict Typing**: `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` to eliminate runtime type errors.
- **Path Aliases**: `"@/*": ["./src/*"]` for clean module imports.
- **Modern Target**: `"target": "ES2022"`, `"moduleResolution": "bundler"`.

### 4.2 Complete `tsconfig.json` File Template

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "out",
    ".next"
  ]
}
```

---

## 5. Tailwind CSS & Cyberpunk Glassmorphism Theme (`tailwind.config.ts`)

### 5.1 Color Matrix & Cyberpunk Design System
- **Obsidian Dark Surface**:
  - `cyber-black`: `#050608` (Deep void background)
  - `cyber-dark`: `#0a0c14` (Page canvas background)
  - `cyber-slate`: `#111625` (Elevated card background)
  - `cyber-border`: `rgba(0, 240, 255, 0.15)` (Luminous border line)
- **Neon Glow Accents**:
  - `neon-cyan`: `#00F0FF` (Primary actions, scan lines, laser glow)
  - `neon-violet`: `#8B5CF6` (Secondary accents, gradient stops)
  - `neon-emerald`: `#00FF9D` (Success telemetry, validated badges)
  - `neon-amber`: `#FBBF24` (Telemetry in-progress, warning states)
  - `neon-rose`: `#FF007A` (Error states, high-priority highlights)
- **Glowing Box Shadows**:
  - `glow-cyan`: `0 0 20px rgba(0, 240, 255, 0.4)`
  - `glow-violet`: `0 0 20px rgba(139, 92, 246, 0.4)`
  - `glow-emerald`: `0 0 20px rgba(0, 255, 157, 0.4)`
  - `glow-amber`: `0 0 20px rgba(251, 191, 36, 0.4)`

### 5.2 Complete `tailwind.config.ts` File Template

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#050608',
          dark: '#0a0c14',
          slate: '#111625',
          card: 'rgba(17, 22, 37, 0.75)',
          border: 'rgba(0, 240, 255, 0.18)',
        },
        neon: {
          cyan: '#00F0FF',
          violet: '#8B5CF6',
          emerald: '#00FF9D',
          amber: '#FBBF24',
          rose: '#FF007A',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.4)',
        'glow-cyan-lg': '0 0 35px rgba(0, 240, 255, 0.6)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-emerald': '0 0 20px rgba(0, 255, 157, 0.4)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.4)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.6)' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### 5.3 PostCSS Configuration (`postcss.config.mjs`)

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## 6. Unit Testing Infrastructure (`vitest.config.ts`)

### 6.1 Design Rationale
Vitest provides native TypeScript execution without Babel/Webpack overhead, exact `@/*` path alias resolution, and seamless `jsdom` support for browser Canvas and Blob tests.

### 6.2 Complete `vitest.config.ts` File Template

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.next/', 'out/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 7. Core Pure TypeScript Library Specs (Milestone 1 Implementation)

### 7.1 `src/lib/exif_injector.ts` Interface & Logic Specification
Responsible for JPEG EXIF metadata injection conforming to Ray-Ban Meta Smart Glasses:
- **0th IFD**:
  - `Make (0x010F)`: `"Luxottica"`
  - `Model (0x0110)`: `"Ray-Ban Meta Smart Glasses"`
  - `Software (0x0131)`: `"Meta View 1.0"`
  - `Orientation (0x0112)`: `1`
  - `DateTime (0x0132)`: `"YYYY:MM:DD HH:MM:SS"`
- **Exif IFD**:
  - `LensModel (0xA434)`: `"Ray-Ban Meta Smart Glasses Lens 12MP f/2.2"`
  - `FocalLength (0x920A)`: `[22, 10]` (2.2 mm)
  - `FocalLengthIn35mmFilm (0xA405)`: `14`
  - `FNumber (0x829D)`: `[22, 10]` (f/2.2)
  - `ExposureTime (0x829A)`: `[1, 120]`
  - `ISOSpeedRatings (0x8827)`: `100`
  - `ExifVersion (0x9000)`: `"0232"`
  - `ColorSpace (0xA001)`: `1`
  - `PixelXDimension (0xA002)`: `1376`
  - `PixelYDimension (0xA003)`: `1840`

### 7.2 `src/lib/atom_synthesizer.ts` Interface & Atom Structure
Responsible for QuickTime `.MOV` container atom parsing and reconstruction:
1. Top-level **`ftyp`** box with Major Brand `qt  ` (`0x71 0x74 0x20 0x20`).
2. Track Aperture Mode **`moov.trak.tapt`** container:
   - `clef` (Clean Aperture): width `1376.0`, height `1840.0`
   - `prof` (Production Aperture): width `1376.0`, height `1840.0`
   - `enof` (Encoded Aperture): width `1376.0`, height `1840.0`
3. Metadata Box **`moov.meta`** containing:
   - `hdlr` with component subtype `mdta`
   - `keys` atom registering keys:
     - `com.apple.quicktime.copyright` (`"Meta AI"`)
     - `com.apple.quicktime.model` (`"Ray-Ban Meta Smart Glasses 2"`)
     - `com.apple.quicktime.comment` (`"app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=..."`)
     - `com.apple.quicktime.creationdate` (ISO-8601 UTC timestamp)
     - `com.apple.quicktime.software` (`"Meta View"`)
   - `ilst` atom with UTF-8 data containers matching key indexes.

---

## 8. TypeScript Type Declarations

### 8.1 `src/types/piexifjs.d.ts`
```typescript
declare module 'piexifjs' {
  export interface IExif {
    '0th'?: Record<number, any>;
    Exif?: Record<number, any>;
    GPS?: Record<number, any>;
    Interop?: Record<number, any>;
    '1st'?: Record<number, any>;
    thumbnail?: string | null;
  }

  export const TagValues: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
  };

  export function load(jpegBinary: string): IExif;
  export function dump(exifObj: IExif): string;
  export function insert(exifBinary: string, jpegBinary: string): string;
  export function remove(jpegBinary: string): string;
}
```

---

## 9. Verification & Execution Instructions

### 9.1 Package Installation & Build Validation
```powershell
# Install all dependencies
npm.cmd install

# Run unit tests via Vitest
npm.cmd test

# Verify production static export
npm.cmd run build
```

### 9.2 Expected Outputs
- `npm.cmd test`: All unit tests in `test/unit/` pass with exit code `0`.
- `npm.cmd run build`: Generates static export directory `out/` with `index.html` and assets.
- `python verify_converter.py`: Runs end-to-end verification and confirms all assertions PASSED.
