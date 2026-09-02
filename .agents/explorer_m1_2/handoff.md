# Milestone 1: FFmpeg WASM Service & Processing Pipeline Handoff Report

## 1. Observation
- **Authoritative Requirements**:
  - `ORIGINAL_REQUEST.md` (§R2): Video conversion pipeline must transcode and crop video to `1376x1840` vertical resolution (30/60 fps) and strip original identifying device tags, GPS coordinates, and extraneous tracks while preserving high audio/video fidelity.
  - `ORIGINAL_REQUEST.md` (§R1, §R4): Client-side static export (`output: 'export'`) deployable to GitHub Pages / Vercel with automated test verification.
- **Specification Discovery**:
  - `survey_spec.md` (lines 88-160): Ray-Ban Meta video exports require 1376x1840 vertical dimensions, H.264 High Profile Level 4.2 (`avc1`), 30/60 fps, `yuv420p` pixel format, 48 kHz stereo AAC audio, `-map_metadata -1`, and `-movflags +faststart`.
- **Environment Findings**:
  - `survey_env.md`: Node `v22.14.0`, npm `10.9.2`, Python `3.12.0`. WebAssembly single-threaded runtime (`@ffmpeg/core@0.12.6`) runs seamlessly in modern browsers without requiring `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` server headers.

## 2. Logic Chain
1. *Observation 1*: GitHub Pages and standard static hosting environments do not allow setting arbitrary HTTP headers (`COOP: same-origin` / `COEP: require-corp`).
   *Inference*: Multi-threaded `@ffmpeg/core-mt` (which relies on `SharedArrayBuffer` and `Atomics`) will fail to initialize on standard static hosting without headers.
   *Decision*: Use single-threaded `@ffmpeg/core@0.12.6` with `@ffmpeg/ffmpeg@0.12.10` and `@ffmpeg/util@0.12.1`.
2. *Observation 2*: External public CDNs (unpkg, jsdelivr) may occasionally experience rate limiting, regional network blockages, or offline restrictions.
   *Inference*: Hardcoding a single CDN endpoint creates a single point of failure.
   *Decision*: Implement a 3-tier cascade fallback: Primary CDN (unpkg) -> Secondary CDN (jsdelivr) -> Local Fallback (`/ffmpeg/` in Next.js public directory) using `toBlobURL`.
3. *Observation 3*: H.264 `yuv420p` encoder strictly requires even macroblock dimensions ($w \pmod 2 = 0, h \pmod 2 = 0, x \pmod 2 = 0, y \pmod 2 = 0$), and Instagram requires exact 1376x1840 geometry.
   *Inference*: Any odd pixel crop coordinates produced by interactive pan/zoom or rounding will crash the libx264 encoder.
   *Decision*: Implement `normalizeCropRect` ensuring coordinate bounds clamping and mod-2 bitwise alignment before building the filter graph.
4. *Observation 4*: FFmpeg stderr output streams rich real-time progress tokens (`frame=`, `fps=`, `q=`, `time=`, `speed=`, `bitrate=`).
   *Inference*: Parsing stderr log messages with regex allows computing exact frame progress, encoding speed, elapsed time, and dynamic ETA for the user interface HUD.
   *Decision*: Implement `TelemetryParser` class with dual detection (stream duration header + continuous per-frame log parsing).
5. *Observation 5*: In-browser WebAssembly virtual MEMFS memory accumulates data unless deleted explicitly.
   *Inference*: Transcoding consecutive video files without deleting MEMFS files causes browser tab memory exhaustion (OOM).
   *Decision*: Wrap `ffmpeg.exec` in a `try / finally` block that unconditionally calls `ffmpeg.deleteFile(inputName)` and `ffmpeg.deleteFile(outputName)` and dereferences ArrayBuffers.

## 3. Caveats
- **Large Video Memory Constraints**: Processing extremely large 4K files (> 500MB) or videos longer than 3 minutes inside browser WebAssembly may reach browser 32-bit WASM memory limits (~2GB-4GB). The UI should recommend videos <= 60 seconds (matching native Ray-Ban Meta glasses recording clip limit).
- **Silent Video Audio Generation**: Videos with no audio track will be transcoded with video stream, but the QuickTime atom reconstructor requires 2 tracks (Track 1 Video, Track 2 Audio) for Instagram Spin View. A fallback silent audio track synthesis option is provided in the specification.

## 4. Conclusion
The client-side FFmpeg WebAssembly service (`src/lib/ffmpeg_service.ts`) architecture and processing pipeline design is fully specified, verified against Ray-Ban Meta video standards, and documented in detail in `.agents/explorer_m1_2/ffmpeg_pipeline.md`. It provides complete TypeScript interface contracts, cascade binary loader, mod-2 crop normalizer, CLI arguments, telemetry parser, and memory cleanup safety hooks ready for Milestone 1 implementation.

## 5. Verification Method
1. Inspect the generated specification:
   `view_file D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\explorer_m1_2\ffmpeg_pipeline.md`
2. Validate TypeScript interface contracts:
   Verify `FFmpegService`, `TranscodeOptions`, `VideoConversionTelemetry`, `TelemetryParser`, and `normalizeCropRect` match `PROJECT.md` interface specifications.
3. Test pipeline execution in implementation phase:
   - Run `npm run build` to verify clean static export.
   - Run `verify_converter.py` to assert correct video dimensions (`1376x1840`), H.264 stream profile, and atom reconstructor output.