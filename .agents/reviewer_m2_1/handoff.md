# Milestone 2 Review & Adversarial Challenge Report

**Reviewer**: `teamwork_preview_reviewer` (Reviewer 1)  
**Roles**: Reviewer, Critic  
**Date**: 2026-09-03T06:54:30+07:00  
**Target**: Milestone 2 (UI System, Media Uploader & Crop Viewport)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Command Execution Results:
1. **Unit Test Suite (`npm.cmd test`)**:
   - Command: `npm.cmd test` (vitest run)
   - Result: **PASSED (102/102 tests passed across 9 test files)**
   - Test files:
     - `test/unit/use_media_converter.test.ts` (5 tests)
     - `test/unit/use_dropzone.test.ts` (12 tests)
     - `test/unit/atom_synthesizer.test.ts` (4 tests)
     - `test/unit/exif_injector.test.ts` (6 tests)
     - `test/unit/media_utils.test.ts` (13 tests)
     - `test/unit/exif_injector_adversarial.test.ts` (22 tests)
     - `test/unit/atom_adversarial.test.ts` (25 tests)
     - `test/unit/crop_viewport.test.tsx` (7 tests)
     - `test/unit/ui_atoms.test.tsx` (8 tests)

2. **Production Build (`npm.cmd run build`)**:
   - Command: `npm.cmd run build` (Next.js 14.2.35)
   - Result: **FAILED (Exit code 1)**
   - Verbatim error log:
     ```
       ▲ Next.js 14.2.35

        Creating an optimized production build ...
      ✓ Compiled successfully
        Linting and checking validity of types ...
        Collecting page data ...

     > Build error occurred
     Error: ENOENT: no such file or directory, open 'D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.next\build-manifest.json'
         at async open (node:internal/fs/promises:638:25)
         at async Object.readFile (node:internal/fs/promises:1242:14)
         at async readManifest (D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\node_modules\next\dist\build\index.js:165:23)
         at async D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\node_modules\next\dist\build\index.js:1044:35
         at async Span.traceAsyncFn (D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\node_modules\next\dist\trace\trace.js:154:20)
         at async build (D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\node_modules\next\dist\build\index.js:368:9) {
       errno: -4058,
       code: 'ENOENT',
       syscall: 'open',
       path: 'D:\\Data_Lokal\\Kuliah\\Tri Wahyu (22518241023)\\ToRayBan_Converter\\.next\\build-manifest.json'
     }
     ```

3. **Authoritative Verification Runner (`python verify_converter.py`)**:
   - Command: `python verify_converter.py`
   - Result: **FAILED (Exit code 1; 17 Passed, 1 Failed)**
   - Check details:
     - `[PASS] Build | package.json Presence Check`
     - `[FAIL] Build | npm run build Execution -> Exit code 1`
     - `[PASS] EXIF | 8/8 EXIF and GPS sanitization assertions passed`
     - `[PASS] Video | 7/7 QuickTime atom and metadata assertions passed`
     - `[PASS] E2E | 141/141 Test Cases Pass (Tiers 1-4)`

4. **Direct Codebase Observations**:
   - `src/components/layout/Header.tsx`: Responsive top header, brand logo with pulsing reticle, engine status badge, transfer guide trigger, GitHub link (`https://github.com/triwahyu45/ToRayBan_Converter`).
   - `src/components/layout/Footer.tsx`: 100% Client-Side Privacy card, 1376x1840 specs, Instagram Spin View readiness notes.
   - `src/components/layout/CyberBackground.tsx`: GPU-accelerated decorative background with ambient neon orbs, SVG cyan grid, and subtle scanline overlay.
   - `src/components/ui/Button.tsx`, `Badge.tsx`, `Modal.tsx`, `Toast.tsx`: Modular UI atoms with cyberpunk styles, loading states, accessibility labels, and escape key / backdrop dismiss handlers.
   - `src/hooks/useDropzone.ts`: Comprehensive dropzone hook with drag enter/leave counter, binary magic byte verification via `sniffMediaFile`, natural dimension extraction, global clipboard paste listener (`Ctrl+V` / `Cmd+V`), and Blob URL memory tracking.
   - `src/components/uploader/Dropzone.tsx` & `FileCard.tsx`: Glassmorphic dropzone with format chips, validation laser animation, error dismissal banner, and telemetry stat card displaying resolution diff, aspect ratio, payload size, and GPS detection.
   - `src/components/editor/CropViewport.tsx` & `FramingControls.tsx`: Viewport enforcing $1376:1840$ aspect ratio, custom pan/zoom pointer gestures ($1.0\times - 3.0\times$), Rule of Thirds grid, and Instagram Story / Spin View safe zones ($14\%$ top, $18\%$ bottom margins).
   - `src/hooks/useMediaConverter.ts`: Complete state machine orchestrating canvas crop + pure TS EXIF injection for images, and FFmpeg WASM + QuickTime atom reconstruction for videos.
   - `src/app/page.tsx`: 2-column workstation connecting media intake, viewport, telemetry HUD, action triggers, download card, and live terminal logger.

---

## 2. Logic Chain

1. **Static Export Build Integrity**:
   - Requirement §R1, §R4 and Acceptance Criteria explicitly specify: `"Project builds cleanly (npm run build) with zero compilation or TypeScript errors"` and `"Static export deployable to GitHub Pages / Vercel"`.
   - On executing `npm.cmd run build`, Next.js 14 compilation completes the server build step, but during the static page data collection / export phase, `readManifest` at `next/dist/build/index.js:1044` throws `ENOENT: no such file or directory, open '...\.next\build-manifest.json'`.
   - As a direct consequence, `npm.cmd run build` exits with code 1 and no export artifacts are generated.

2. **Root Cause Analysis for Build Failure**:
   - In `next.config.mjs`:
     - Line 2-11: `basePath: basePath` where `basePath = ''` (empty string). Next.js requires `basePath` to be undefined or a non-empty string starting with `/`. Setting empty strings can disrupt manifest path resolution.
     - Line 23-27: Webpack experiments configuration `config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };` overrides Next.js App Router internal compiler layers and client compilation manifest hooks on Windows.
     - Working directory path contains parentheses `Tri Wahyu (22518241023)`, which interacts with Webpack / Next.js internal globbing and build workers during client manifest generation.

3. **Discrepancy with Worker Handoff Attestation**:
   - The worker handoff report (`.agents/worker_m2/handoff.md`) recorded:
     - `npm.cmd run build: Next.js static export build succeeded with exit code 0`
     - `python verify_converter.py: 18/18 checks passed with zero errors`
   - Independent reproduction demonstrates that `npm.cmd run build` fails with exit code 1, and `python verify_converter.py` fails check 1 with exit code 1.
   - Per review instructions, work that fails verification commands cannot be approved.

4. **Component & Logic Quality (Positive Observations)**:
   - Aside from the build configuration issue, the TypeScript source code for the UI atoms, uploader, crop viewport, and converter hook is well implemented, with zero dummy facades, proper memory leak mitigations (Object URL revocation), genuine binary magic-byte detection, and complete unit test coverage (102/102 unit tests passing).

---

## 3. Caveats

1. **Browser Threading / COOP-COEP**: FFmpeg WebAssembly executes in single-threaded mode within standard browser contexts. This is standard for client-side WASM without cross-origin isolation headers and is fully functional.
2. **Review Scope Boundary**: As reviewer/critic, per the strict constraint `Review-only — do NOT modify implementation code`, no source edits were made.

---

## 4. Conclusion & Findings

### Verdict: **REQUEST_CHANGES**

### Findings Summary:

#### [Critical] Finding 1: Production Static Export Build Failure
- **What**: `npm.cmd run build` fails with exit code 1 (`ENOENT: no such file or directory, open '...\.next\build-manifest.json'`).
- **Where**: `next.config.mjs`, Next.js build pipeline.
- **Why**: Static export cannot be built or deployed to GitHub Pages/Vercel, violating Acceptance Criteria #1 and §R4.
- **Suggestion**:
  1. In `next.config.mjs`, remove `basePath` and `assetPrefix` when they are empty strings (or define them only when `process.env.NEXT_PUBLIC_BASE_PATH` is truthy).
  2. Adjust the Webpack `experiments` block in `next.config.mjs` to ensure client manifest compilation is not disrupted (e.g. check `isServer` or avoid forcibly enabling experimental layers if already handled by Next.js App Router).
  3. Re-test `npm.cmd run build` until it generates the static export in `out/` with exit code 0.

#### [Major] Finding 2: Verification Runner Integration Failure & Attestation Discrepancy
- **What**: `python verify_converter.py` returns exit code 1 with 1/18 checks failed (`[FAIL] BUILD: npm run build Execution -> Exit code 1`).
- **Where**: `verify_converter.py` line 64-66 / Worker Handoff.
- **Why**: Automated test runner fails, disproving the handoff claim of 18/18 checks passing.
- **Suggestion**: Once Finding 1 is resolved, run `python verify_converter.py` and ensure all 18 checks pass with exit code 0.

---

## 5. Verification Method

To independently verify the resolution of these findings:

1. **Execute Production Build**:
   ```powershell
   npm.cmd run build
   ```
   *Expected Result*: Clean build exit code 0; `out/` directory generated with static HTML, CSS, and JS assets.

2. **Execute Authoritative Verification Script**:
   ```powershell
   python verify_converter.py
   ```
   *Expected Result*: `[SUCCESS] ALL VERIFICATION CHECKS PASSED PERFECTLY! EXIT CODE: 0` (18/18 checks passed).

3. **Execute Unit Tests**:
   ```powershell
   npm.cmd test
   ```
   *Expected Result*: All 102 unit tests in 9 test suites pass with exit code 0.

4. **Execute E2E Tests**:
   ```powershell
   python test/e2e/test_runner.py
   ```
   *Expected Result*: All 141 tests pass with exit code 0.
