# Independent Review & Adversarial Report: Milestone 2 (Crop Viewport & Converter State Machine)

**Reviewer**: `teamwork_preview_reviewer` (Reviewer 2)  
**Roles**: Reviewer, Critic  
**Working Directory**: `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\reviewer_m2_2`  
**Target Milestone**: Milestone 2 (UI System, Media Uploader & Crop/Framing Viewport)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Directly Observed Code Artifacts & Evidence:

1. **Crop Viewport & Visual HUD (`src/components/editor/CropViewport.tsx`)**:
   - Aspect ratio container uses `aspect-[1376/1840]` matching $43:57.5$ perfectly.
   - Interactive pointer drag gestures utilize `setPointerCapture` / `releasePointerCapture` and scale sensitivity based on `2.0 / Math.max(1.0, cropConfig.zoom)` (lines 64-66).
   - Wheel listener handles zooming between `1.0` and `3.0` with step clamping (lines 79-85).
   - Rule of Thirds grid is rendered via a 3x3 CSS grid (`grid grid-cols-3 grid-rows-3`, lines 168-180).
   - Instagram Stories safe-zone overlay implements top exclusion margin ($14\%$, lines 194-200) and bottom exclusion margin ($18\%$, lines 209-215).
   - Live telemetry badge displays exact pixel coordinates: `1376×1840 • X:{computedCrop.x} Y:{computedCrop.y} W:{computedCrop.width} H:{computedCrop.height}` (lines 226-228).

2. **Framing Controls (`src/components/editor/FramingControls.tsx`)**:
   - Implements 3 framing modes: `Smart Fill` (`center`), `Custom Pan` (`custom`), and `Ambient Blur` (`blur_fill`) (lines 53-93).
   - Zoom slider operates in `custom` mode between `1.0x` and `3.0x` with $+/-$ stepper buttons (lines 96-140).
   - Rotation button increments rotation by 90° clockwise: `(cropConfig.rotation + 90) % 360` (lines 36-39, 178-186).
   - Reset button calls `onReset` to revert to Smart Fill (lines 189-197).

3. **Media Converter State Machine Hook (`src/hooks/useMediaConverter.ts`)**:
   - State machine tracks status: `'idle' | 'loading' | 'cropping' | 'transcoding' | 'synthesizing' | 'completed' | 'error'`.
   - `useEffect` (lines 108-151) dynamically recalculates `computedCrop` on `stagedMedia` or `cropConfig` mutation:
     - Handles 90°/270° orientation swaps: `cropConfig.rotation % 180 === 0 ? stagedMedia.width : stagedMedia.height`.
     - In custom mode, clamps pan offsets: `rawX = (srcW - cropW) / 2 + cropConfig.panX * maxDeltaX`.
     - Normalizes coordinates via `normalizeCropCoordinates` to enforce even integers (`mod 2 == 0`).
   - Image conversion pipeline uses HTML5 Canvas $(1376\times1840)$ and injects Ray-Ban Meta EXIF via `injectRayBanExifBuffer` (lines 261-352).
   - Video conversion pipeline invokes `FFmpegService.transcodeAndCrop` and reconstructs QuickTime atom container via `reconstructRayBanQuickTimeMov` (lines 354-421).
   - Blob URLs are tracked in `activeBlobUrlsRef` and revoked on `resetAll` and hook unmount (lines 472-498), preventing memory leaks.

4. **Studio Application Layout (`src/app/page.tsx` & `src/app/layout.tsx`)**:
   - Comprehensive two-column workstation connecting Dropzone, Viewport, Framing Controls, Telemetry HUD, Result Card, and Live Terminal.
   - Offline-safe typography and Cyberpunk design tokens in `layout.tsx` and `globals.css`.

5. **Command Executions & Verbatim Results**:
   - **Unit Tests (`npm.cmd test`)**:
     ```
     ✓ test/unit/atom_synthesizer.test.ts (4 tests) 7ms
     ✓ test/unit/use_media_converter.test.ts (5 tests) 5ms
     ✓ test/unit/use_dropzone.test.ts (12 tests) 14ms
     ✓ test/unit/exif_injector.test.ts (6 tests) 12ms
     ✓ test/unit/media_utils.test.ts (13 tests) 19ms
     ✓ test/unit/exif_injector_adversarial.test.ts (22 tests) 29ms
     ✓ test/unit/atom_adversarial.test.ts (25 tests) 172ms
     ✓ test/unit/crop_viewport.test.tsx (7 tests) 223ms
     ✓ test/unit/ui_atoms.test.tsx (8 tests) 241ms

     Test Files  9 passed (9)
          Tests  102 passed (102)
     ```
     **Result**: PASSED (102/102 tests).

   - **Static Export Build (`npm.cmd run build`)**:
     ```
     > torayban_converter@1.0.0 build
     > next build

       ▲ Next.js 14.2.35

        Creating an optimized production build ...
      ✓ Compiled successfully
        Linting and checking validity of types ...
        Collecting page data ...
     unhandledRejection Error: ENOENT: no such file or directory, open 'D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.next\server\pages-manifest.json'
         at readFileSync (node:fs:442:20)
         at loadManifest (...\node_modules\next\dist\server\load-manifest.js:36:52)
         at loadComponentsImpl (...\node_modules\next\dist\server\load-components.js:71:33)
     ```
     **Result**: FAILED with exit code 1.

   - **Full Verification Script (`python verify_converter.py`)**:
     ```
     >>> VERIFICATION SUMMARY REPORT
       [PASS]  Build    | package.json Presence Check
       [FAIL]  Build    | npm run build Execution -> Exit code 1
       [PASS]  EXIF     | 0th IFD Make Tag (0x010F) -> Make='Luxottica'
       [PASS]  EXIF     | 0th IFD Model Tag (0x0110) -> Model='Ray-Ban Meta Smart Glasses'
       [PASS]  EXIF     | 0th IFD Software Tag (0x0131) -> Software='Meta View'
       [PASS]  EXIF     | ExifIFD FNumber (0x829D) -> FNumber=(22, 10) (f/2.2)
       [PASS]  EXIF     | ExifIFD FocalLength (0x920A) -> FocalLength=(22, 10) (2.2mm)
       [PASS]  EXIF     | ExifIFD 35mm Equivalent (0xA405) -> FocalLengthIn35mm=15mm
       [PASS]  EXIF     | ExifIFD LensModel Tag (0xA434) -> LensModel='Ray-Ban Meta Smart Glasses'
       [PASS]  EXIF     | Privacy / GPS Sanitization -> GPS IFD fully stripped
       [PASS]  Video    | Container File Type Box (ftyp) -> major_brand='qt  '
       [PASS]  Video    | Movie Header Box (moov) -> moov atom positioned before mdat
       [PASS]  Video    | mvhd Timescale Normalization -> timescale=48000 (Normalized to 48kHz)
       [PASS]  Video    | Track Aperture Dimensions Atom (tapt) -> 68 bytes with clef, prof, enof (1376x1840)
       [PASS]  Video    | QuickTime moov.meta Direct Child -> QuickTime metadata box attached directly to moov
       [PASS]  Video    | Instagram Spin View Keys & ilst Values -> Authentic model, make, and software metadata keys
       [PASS]  Video    | Stream Track Sanitization -> Exactly 2 tracks (Track 1: Video, Track 2: Audio)
       [PASS]  E2E      | 141/141 Test Cases Pass -> Tier 1 (60), Tier 2 (60), Tier 3 (15), Tier 4 (6)
     ================================================================================
       Total Checks:  18
       Passed:        17
       Failed:        1
     ================================================================================
     [FAILURE] VERIFICATION CHECKS FAILED. EXIT CODE: 1
     ```
     **Result**: FAILED with exit code 1 (17/18 passed, failed on static build check).

---

## 2. Logic Chain

1. **Static Build Requirement**:
   - `ORIGINAL_REQUEST.md §R4` and §Acceptance Criteria mandate:
     *"Project builds cleanly (`npm run build`) with zero compilation or TypeScript errors"* and
     *"Automated verification script executes with exit code 0 and reports all media synthesis assertions PASSED."*
2. **Root Cause of Build Failure**:
   - In Next.js 14 App Router with `output: 'export'`, prerendering fails during `/_not-found` page generation because Next.js expects a custom `src/app/not-found.tsx` component in pure App Router configurations. Without `src/app/not-found.tsx`, Next.js attempts to resolve the legacy Pages router fallback, resulting in `ENOENT: open ...\.next\server\pages-manifest.json`.
   - Because `npm.cmd run build` exits with code 1, `verify_converter.py` fails check 1 and exits with code 1.
3. **Integrity & Code Quality Assessment**:
   - The core mathematical logic for Smart Center Fill, Pan/Zoom clamping, Rule of Thirds grid, and Instagram safe-zone margins is genuinely implemented and mathematically verified.
   - All 102 unit tests in Vitest pass cleanly.
   - All 141 E2E tests (Tiers 1-4) in Python test runner pass cleanly.
   - No mock bypasses, hardcoded test strings, or facade logic were found in the source code.
   - However, because the build step fails, the milestone cannot be approved until this build issue is resolved.

---

## 3. Findings

### [Critical] Finding 1: Static Export Build Fails with `ENOENT: pages-manifest.json`

- **What**: `npm.cmd run build` fails during static export page data collection / prerendering of `/_not-found`.
- **Where**: Next.js App Router root / `src/app/` (missing `not-found.tsx`).
- **Why**: In Next.js 14 static export (`output: 'export'`), missing `src/app/not-found.tsx` causes Next.js to seek `pages-manifest.json` from the legacy Pages router, throwing `ENOENT` and aborting the build with exit code 1. This also breaks step 1 of `verify_converter.py`.
- **Suggestion**: Create `src/app/not-found.tsx` with a responsive Cyberpunk 404 layout and verify that `npm.cmd run build` exits with code 0.

### [Minor] Finding 2: Image Canvas Context Missing Rotation Transformation

- **What**: When `cropConfig.rotation` is non-zero (90°, 180°, 270°), `computedCrop` is correctly calculated on swapped dimensions, but `ctx.drawImage` in `useMediaConverter.ts:298-310` draws the unrotated image directly without performing `ctx.translate` and `ctx.rotate`.
- **Where**: `src/hooks/useMediaConverter.ts:282-310`
- **Why**: Photos taken in orientation requiring rotation in framing controls will not have the rotation applied to the exported JPEG canvas output.
- **Suggestion**: In `startConversion` for images, apply `ctx.translate(1376/2, 1840/2)` and `ctx.rotate((cropConfig.rotation * Math.PI) / 180)` or create an intermediate rotated offscreen canvas before cropping.

---

## 4. Adversarial Challenge & Stress-Testing

### Challenge 1: Extreme Aspect Ratio Boundary Conditions
- **Scenario Tested**: Ultra-panoramic $32:9$ ($5120\times1440$) and ultra-tall $9:32$ ($1080\times3840$).
- **Result**: `calculateCenterCrop` and `normalizeCropCoordinates` accurately clamp dimensions to even integers and keep crop rectangles strictly within source boundaries without overflow or negative coordinates. **PASSED**.

### Challenge 2: Zoom & Pan Coordinate Clamping
- **Scenario Tested**: Zoom $3.0\times$ with maximum pan offsets ($\text{panX} = \pm 1.0, \text{panY} = \pm 1.0$).
- **Result**: `maxDeltaX` and `maxDeltaY` properly constrain the crop box to the physical bounds of the image ($0 \le X \le \text{srcW} - \text{cropW}$). `normalizeCropCoordinates` further enforces modulo 2 even numbers. **PASSED**.

### Challenge 3: Object URL Memory Leak Mitigation
- **Scenario Tested**: Staging multiple media files sequentially and calling `resetAll`.
- **Result**: `activeBlobUrlsRef` records all created URLs and invokes `URL.revokeObjectURL` upon reset or component unmount. **PASSED**.

---

## 5. Verified Claims Summary

| Claim | Upstream Assertion | Verification Method | Status |
|---|---|---|---|
| Unit Test Suite | 102/102 unit tests pass | `npm.cmd test` | **PASS** (102 passed in 9 suites) |
| E2E Test Suite | 141/141 E2E tests pass | `python -m unittest test/e2e/test_runner.py` | **PASS** (141 passed) |
| Aspect Ratio Math | Exact $1376\times1840$ center crop & even modulo 2 | Inspect `media_utils.ts` & unit test assertions | **PASS** |
| Safe-Zone Overlay | $14\%$ top margin, $18\%$ bottom margin | Inspect `CropViewport.tsx:194-215` | **PASS** |
| Static Export Build | `npm.cmd run build` exits 0 | `npm.cmd run build` execution | **FAIL** (Exit code 1, `pages-manifest.json ENOENT`) |
| Full Verification Script | `python verify_converter.py` 18/18 checks pass | `python verify_converter.py` execution | **FAIL** (17/18 passed, failed on build check) |

---

## 6. Caveats

1. **FFmpeg WebAssembly Multi-Threading**: FFmpeg WASM operates in single-threaded mode unless Cross-Origin Isolation headers (`COOP`/`COEP`) are enabled on the host server. The single-threaded engine functions as expected.
2. **Milestone 3 Extension Points**: Components for Metadata Inspector diff table and 3D Spin View simulator are scheduled for Milestone 3. The current studio page provides clean modular placeholders for them.

---

## 7. Conclusion

While the implementation of the UI system, Dropzone, 1376x1840 Crop Viewport, Framing Controls, and Media Converter state machine is of high quality and mathematically sound, the failure of `npm.cmd run build` and `python verify_converter.py` violates the required acceptance criteria.

**Explicit Verdict**: **REQUEST_CHANGES**

**Action Required**:
1. Add `src/app/not-found.tsx` to fix Next.js 14 App Router static export prerendering.
2. Ensure `npm.cmd run build` builds cleanly with exit code 0.
3. Verify that `python verify_converter.py` reports 18/18 checks passed with exit code 0.

---

## 8. Verification Method

To independently re-verify once the worker submits fixes:
1. Run `npm.cmd test` (Expect 102/102 unit tests to pass).
2. Run `npm.cmd run build` (Expect exit code 0 and clean export to `out/`).
3. Run `python verify_converter.py` (Expect 18/18 checks to pass with exit code 0).
