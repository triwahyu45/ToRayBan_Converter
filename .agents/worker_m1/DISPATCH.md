## 2026-09-02T23:15:00Z

You are teamwork_preview_worker for Milestone 1: Core Engines & Infrastructure of ToRayBan_Converter.
Your working directory is: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\worker_m1
Authoritative request: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\ORIGINAL_REQUEST.md
Project plan: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\PROJECT.md
Specification: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_m1\m1_specs.md
Project Config Blueprint: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\explorer_m1_1\project_config.md
FFmpeg WASM Blueprint: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\explorer_m1_2\ffmpeg_pipeline.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- `src/types/converter.ts`, `src/types/metadata.ts`, `src/types/atoms.ts`
- `src/lib/exif_injector.ts`
- `src/lib/atom_synthesizer.ts`
- `src/lib/ffmpeg_service.ts`
- `src/lib/metadata_extractor.ts`
- `src/lib/media_utils.ts`
- `test/unit/exif_injector.test.ts`, `test/unit/atom_synthesizer.test.ts`, `test/unit/media_utils.test.ts`

Your mission:
1. Initialize project structure, dependencies (`package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`). Note: On Windows, use `npm.cmd` rather than `npm`.
2. Implement `src/lib/exif_injector.ts` with authentic binary JPEG EXIF injection (Make="Luxottica", Model="Ray-Ban Meta Smart Glasses", Software="Meta View", Lens="f/2.2", etc.) handling both browser Canvas/DataURL and raw Uint8Array buffers.
3. Implement `src/lib/atom_synthesizer.ts` with binary QuickTime atom parser (`parseAtomHierarchy`) and reconstructor (`reconstructRayBanQuickTimeMov`) for `ftyp` (brand `qt  `), `tapt` (`clef`, `prof`, `enof` fixed point 1376x1840), `mvhd` timescale 48000, `moov.meta` (`hdlr` mdta, `keys` table, `ilst` data boxes).
4. Implement `src/lib/ffmpeg_service.ts` with single-threaded `@ffmpeg/core` loader (CDN + fallback), crop coordinate normalization, lanczos scaling to 1376x1840, stderr log telemetry parsing, and memory cleanup.
5. Implement `src/lib/metadata_extractor.ts` and `src/lib/media_utils.ts` (magic byte sniffing, image/video aspect ratio math).
6. Implement comprehensive unit tests in `test/unit/` for EXIF injection, atom reconstruction/parsing, and media utilities.
7. Run `npm.cmd install`, `npm.cmd test`, and `npm.cmd run build`. Ensure all unit tests pass 100% and the build compiles with 0 errors.
8. Document all commands, execution outputs, and verification results in `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\worker_m1\handoff.md`.
9. Send a message when done.
