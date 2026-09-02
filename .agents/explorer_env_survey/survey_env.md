# Environment & Technical Architecture Survey Report
**Project:** ToRayBan_Converter  
**Target:** Client-Side Web Application for Ray-Ban Meta Smart Glasses Photo & Video Conversion  
**Date:** 2026-09-03  
**Surveyor:** `teamwork_preview_explorer` (Role: Explorer)

---

## 1. System Environment & Toolchain Audit

| Tool / Runtime | Version / Status | Path / Invocation Method | Notes |
| :--- | :--- | :--- | :--- |
| **OS** | Windows (x64) | `win32` | Windows PowerShell environment |
| **Node.js** | `v22.14.0` | `node` | Active LTS Node.js runtime |
| **npm** | `10.9.2` | `npm.cmd` / `npx.cmd` | Note: Use `.cmd` suffix in Windows PowerShell scripts to bypass script execution policy restrictions |
| **Python** | `3.12.0` | `python` | Standard Python 3.12 (AMD64) |
| **Python Libraries** | `Pillow (PIL)`, `requests`, `urllib3` | Verified available | Perfect for automated verification script (`verify_converter.py`) |
| **Git** | `2.49.0.windows.1` | `git` | Git CLI operational |
| **Git User Name** | `Tri Wahyu` | `git config --global user.name` | Configured globally |
| **Git User Email** | `handoyotriwahyu@gmail.com` | `git config --global user.email` | Configured globally |
| **Remote Repository** | `https://github.com/triwahyu45/ToRayBan_Converter.git` | Verified via `git ls-remote` (exit 0) | Accessible and ready for initial push |

---

## 2. Workspace Status

* **Root Path:** `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter`
* **Current Structure:** Clean repository state with `.agents` metadata workspace.
* **Git Status:** Git repository is not yet initialized in the root folder (`.git` directory will be initialized during project bootstrapping).

---

## 3. Recommended Frontend & Client-Side Architecture

### 3.1 Framework & Build Stack
* **Next.js 14/15 App Router** (`next`, `react`, `react-dom`, `typescript`)
* **Static Export Configuration:**
  ```javascript
  // next.config.mjs
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
    trailingSlash: true,
    // When deploying to GitHub Pages with repository subpath:
    // basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  };
  export default nextConfig;
  ```
* **Styling & UI Components:**
  * **Tailwind CSS v3/v4** with `@tailwindcss/typography`
  * **Lucide React** (`lucide-react`): Modern crisp icons (Glasses, Camera, Video, Sparkles, Sliders, ShieldCheck, Download, Smartphone, Info, Layers, RefreshCw)
  * **Framer Motion** (`framer-motion`): Smooth transitions, conversion progress bars, and modal animations
  * **Theme:** Sleek Cyberpunk / Meta Dark aesthetic (Matte dark obsidian `#0a0c14`, deep indigo/slate `#131726`, neon cyan `#06b6d4`, electric emerald `#10b981`, glassmorphism backdrop blur cards)

---

## 4. Media Processing Engine & Specifications

### 4.1 Photo EXIF Injection Engine (R3)
Ray-Ban Meta Smart Glasses produce authentic vertical captures with specific EXIF/TIFF tags recognized by Meta View and Instagram.

* **Target Output:**
  * Aspect Ratio: `1376 x 1840` (or `3024 x 4032` high-res mode)
  * Format: High-quality JPEG (`image/jpeg`, 0.95–1.0 quality)
* **Metadata Profile (Piexif / Binary EXIF Injector):**
  * `0th IFD`:
    * `Make (0x010F)`: `"Luxottica"`
    * `Model (0x0110)`: `"Ray-Ban Meta Smart Glasses"`
    * `Software (0x0131)`: `"Meta View 1.0"`
    * `Orientation (0x0112)`: `1` (Normal)
    * `DateTime (0x0132)`: ISO/EXIF format `"YYYY:MM:DD HH:MM:SS"`
  * `Exif IFD`:
    * `LensModel (0xA434)`: `"Ray-Ban Meta Smart Glasses Lens 12MP f/2.2"`
    * `FocalLength (0x920A)`: `(22, 10)` [2.2 mm]
    * `FocalLengthIn35mmFilm (0xA405)`: `14`
    * `FNumber (0x829D)`: `(22, 10)` [f/2.2]
    * `ExposureTime (0x829A)`: `(1, 120)`
    * `ISOSpeedRatings (0x8827)`: `100`
    * `ExifVersion (0x9000)`: `"0232"`
    * `ColorSpace (0xA001)`: `1` (sRGB)
    * `PixelXDimension (0xA002)`: `1376`
    * `PixelYDimension (0xA003)`: `1840`

---

### 4.2 Video QuickTime Atom Pipeline & Instagram Spin View (R2)
Instagram inspects the QuickTime `.MOV` container atom hierarchy rather than pixel content to detect Ray-Ban Meta capture and unlock the interactive **Spin View** feature (based on the `metaspin` reverse-engineered specification).

#### Atom Structure Requirements:
1. **Container (`ftyp`):**
   * Major Brand: `qt  ` (`0x71 0x74 0x20 0x20`)
   * Compatible Brands: `qt  `
2. **Movie Header (`moov.mvhd`):**
   * Movie timescale: `48000` (or `600`)
3. **Video Track (`moov.trak.tapt`):**
   * Dimensions: `1376 x 1840`
   * **`tapt` Box** containing:
     * `clef` (Clean Aperture): width `1376.0`, height `1840.0`
     * `prof` (Production Aperture): width `1376.0`, height `1840.0`
     * `enof` (Encoded Aperture): width `1376.0`, height `1840.0`
   * Handler (`hdlr`): Component Type `mhlr`, Subtype `vide`, Manufacturer `appl`, Name: `Core Media Video`
4. **Audio Track (`moov.trak`):**
   * Handler (`hdlr`): Component Type `mhlr`, Subtype `soun`, Manufacturer `appl`, Name: `Core Media Audio`
   * Sample Rate: `48000 Hz`
5. **Metadata Atom (`moov.meta`):**
   * In QuickTime format (no version/flags byte after 8-byte header; child atoms start immediately at offset 8).
   * Handler (`hdlr`): Subtype `mdta`
   * `keys` atom:
     * `com.apple.quicktime.copyright` -> `"Meta AI"`
     * `com.apple.quicktime.model` -> `"Ray-Ban Meta Smart Glasses 2"`
     * `com.apple.quicktime.comment` -> `"app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=<UUID>"`
     * `com.apple.quicktime.creationdate` -> ISO-8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`)
     * `com.apple.quicktime.software` -> `"Meta View"`
   * `ilst` atom:
     * Data boxes matching the 1-indexed key positions (`type=1` for UTF-8 string).

#### WebAssembly & Client Execution Strategy:
* **Dual-Tier Video Processing:**
  * **Tier 1 (FFmpeg WASM)**: Using `@ffmpeg/ffmpeg` + `@ffmpeg/core` (single-thread mode default) for re-encoding and cropping to 1376x1840 @ 30/60 fps with AAC audio.
  * **Tier 2 (Pure TypeScript QuickTime Atom Synthesizer)**: In-browser binary atom builder (`quicktime_synthesizer.ts`) that directly processes the MP4/MOV container bitstream and injects the `tapt`, `hdlr`, and `meta` atoms.
* **COOP/COEP Headers & Static Hosting:**
  * Single-threaded `@ffmpeg/core` operates without requiring `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` headers, ensuring seamless zero-config deployment on GitHub Pages and Vercel.
  * Optionally include `coi-serviceworker` if multi-threaded WebAssembly performance is enabled.

---

## 5. UI Features & UX Workflows (R1)

1. **Media Uploader Dropzone:**
   * Multi-format support: Video (`MP4`, `MOV`, `WebM`) & Image (`JPG`, `PNG`, `WebP`).
   * Drag-and-drop with instant thumbnail generation.
2. **Crop & Framing Selector:**
   * Live preview with 1376x1840 framing overlay.
   * Smart Center Crop, Pan & Zoom, and Fit/Fill modes.
3. **Real-Time Conversion Telemetry:**
   * Visual progress ring/bar with stage breakdown (Demuxing -> Cropping -> Re-encoding -> Atom Synthesizing -> EXIF Injection -> Done).
4. **Interactive Metadata & Atom Inspector:**
   * Live tree view comparing Before vs After metadata.
   * Displays EXIF tags (Make, Model, Lens, Focal Length) and QuickTime Atoms (`ftyp`, `tapt`, `meta/keys`).
5. **Interactive Transfer Guide Modal:**
   * Step-by-step instructions for transferring converted files to iPhone (AirDrop directly to Photos / Files without compression) and Android (USB / Nearby Share / Quick Share to DCIM) to preserve Spin View triggering on Instagram.

---

## 6. Automated Testing & Verification Strategy (R4)

We will provide a dedicated verification test suite executable with a single command:
* **`verify_converter.py`**:
  1. **Build Validation:** Runs `npm.cmd run build` (or `npm run build`) and asserts exit code `0` with valid static export in `out/`.
  2. **Image EXIF Injection Validation:** Ingests a synthetic test image, processes it through the EXIF injection logic, and uses Python Pillow (`PIL.ExifTags`) to verify `Make == "Luxottica"`, `Model == "Ray-Ban Meta Smart Glasses"`, `Software == "Meta View"`.
  3. **Video Atom Reconstruction Validation:** Synthesizes a test MOV container, parses the binary atom box hierarchy, and asserts existence of `ftyp (qt  )`, `moov.trak.tapt (clef, prof, enof)` with dimensions `1376x1840`, and `moov.meta` with `com.apple.quicktime.model`.
* **CI / Test Script Execution:**
  ```powershell
  python verify_converter.py
  ```

---

## 7. Next Steps & Recommendations for Implementation

1. **Bootstrap Next.js App:** Initialize project with TypeScript, Tailwind CSS, Lucide icons, and `output: 'export'`.
2. **Implement Core Media Libraries:**
   * `src/lib/exif_injector.ts`: Pure TypeScript EXIF injection engine.
   * `src/lib/atom_synthesizer.ts`: Pure TypeScript QuickTime atom parser & reconstructor.
   * `src/lib/ffmpeg_pipeline.ts`: FFmpeg WebAssembly loader with fallback.
3. **Build Modern Cyberpunk UI Components:**
   * `Header`, `UploaderDropzone`, `CropFramingModal`, `ConversionProgress`, `MetadataInspector`, `TransferGuideModal`, `BeforeAfterPreview`.
4. **Implement Verification Script & Git Setup:**
   * Create `verify_converter.py`.
   * Initialize git, commit all files, and link origin to `https://github.com/triwahyu45/ToRayBan_Converter`.
