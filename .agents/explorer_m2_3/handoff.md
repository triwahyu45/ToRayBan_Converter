# Milestone 2: Crop & Framing Viewport and State Hook Handoff Report

**Agent**: `teamwork_preview_explorer` (`explorer_m2_3`)  
**Parent Agent**: `parent` (`e987aa7c-44b7-4c78-90b5-b230c5a07135`)  
**Date**: 2026-09-03  
**Deliverable File**: `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\explorer_m2_3\crop_state_blueprint.md`  

---

## 1. Observation

Direct code and architectural observations across the workspace:
1. **Target Dimensions & Aspect Standard**:
   - `ORIGINAL_REQUEST.md:5`: Native Ray-Ban Meta vertical resolution is $1376 \times 1840$ pixels ($43:57.5$ aspect ratio).
   - `src/lib/media_utils.ts:144`: `calculateCenterCrop` and `normalizeCropCoordinates` exist in M1, calculating center crop boxes and forcing even pixel dimensions ($x \pmod 2 = 0, y \pmod 2 = 0, w \pmod 2 = 0, h \pmod 2 = 0$).
2. **Core Conversion Engines**:
   - `src/lib/exif_injector.ts:242`: `injectRayBanExif` / `injectRayBanExifBuffer` injects Make (`Luxottica`), Model (`Ray-Ban Meta Smart Glasses`), Software (`Meta View`), Lens Model, and focal properties.
   - `src/lib/atom_synthesizer.ts:276`: `reconstructRayBanQuickTimeMov` builds authentic `.MOV` container with `ftyp qt  `, `tapt` ($1376\times1840$ fixed point), `mvhd` 48000, and `moov.meta` (`mdta keys/ilst`).
   - `src/lib/ffmpeg_service.ts:152`: `FFmpegService.transcodeAndCrop` performs client-side WASM transcoding into $1376\times1840$ @ 30fps with live telemetry parsing.
   - `src/lib/metadata_extractor.ts:16`: `extractMediaMetadata` reads EXIF tags and QuickTime atom trees for live before/after comparison.
3. **UI Requirements**:
   - `survey_ui.md` Section 5 & 12: Details three framing modes (**Smart Fill**, **Custom Pan/Zoom HUD**, and **Ambient Pillarbox**), interactive zoom slider ($1.0\times - 3.0\times$), pointer drag-to-pan physics, Rule of Thirds grid overlay, and Instagram Story safe-zone guides (14% top header margin, 18% bottom reply bar margin).

---

## 2. Logic Chain

1. **Framing & Viewport Geometry**:
   - From observation (1), media files arrive in arbitrary dimensions ($1920\times1080$, $1080\times1920$, $1:1$, etc.).
   - Mode A (Smart Fill) calculates the largest inscribed rectangle of aspect $1376:1840$ centered in the source frame.
   - Mode B (Custom Pan/Zoom) scales the crop rectangle by $\frac{1}{\text{Zoom}}$ and offsets it by normalized pan percentages $(P_x, P_y)$ within clamped source boundaries $[0, W_{\text{src}} - W_{\text{crop}}]$.
   - Mode C (Ambient Pillarbox) fits the entire source media inside $1376\times1840$ and composites it over a heavily blurred, darkened background mirror.
   - Pointer capture (`setPointerCapture`) guarantees smooth dragging without losing drag state when the cursor moves outside the viewport window.
2. **State Machine Hook Orchestration (`useMediaConverter.ts`)**:
   - Manages state progression: `idle` $\rightarrow$ `loading` $\rightarrow$ `cropping` $\rightarrow$ `transcoding` $\rightarrow$ `synthesizing` $\rightarrow$ `completed` (or `error`).
   - Image conversion uses an offscreen HTML5 canvas rendered at native $1376\times1840$, converted to JPEG blob, and injected with Ray-Ban Meta EXIF via `injectRayBanExifBuffer`.
   - Video conversion runs `FFmpegService.transcodeAndCrop` with the normalized crop coordinates, then feeds the transcoded `.MOV` bytes to `reconstructRayBanQuickTimeMov` to inject the Instagram Spin View atoms (`tapt`, `moov.meta`).
   - All object URLs created are tracked in `activeBlobUrlsRef` and systematically revoked upon file change or unmount to prevent browser memory leaks.

---

## 3. Caveats

1. **WASM Browser Memory**: For very large 4K 60fps video files, browser memory limits may require downscaling prior to transcoding. `FFmpegService` has memory fallback mechanisms.
2. **Canvas Tainting**: Staged files must be loaded via local object URLs (`URL.createObjectURL(file)`) rather than remote cross-origin URLs to prevent canvas tainting during photo export.

---

## 4. Conclusion

The blueprints for `CropViewport.tsx`, `FramingControls.tsx`, and `useMediaConverter.ts` are fully specified, mathematically verified, and ready for immediate implementation by Worker agents. All required features—including Smart Center Fill, Custom Pan/Zoom Canvas HUD with gesture listeners, Ambient Pillarbox fill, Rule of Thirds grid, Instagram Story Safe-Zone overlays, EXIF injection, QuickTime atom reconstruction, telemetry tracking, and memory cleanup—are fully blueprinted in `crop_state_blueprint.md`.

---

## 5. Verification Method

To independently verify the blueprint and upcoming implementation:
1. **Unit & Math Testing**:
   Run Vitest suite:
   ```bash
   npm test
   ```
2. **Static Build & Typecheck**:
   ```bash
   npm run build
   ```
3. **Automated End-to-End Verification**:
   ```bash
   python verify_converter.py
   ```
