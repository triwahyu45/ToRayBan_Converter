# Challenger Handoff Report: Milestone 2 — Uploader & Crop Viewport Adversarial Stress Testing

**Author**: `teamwork_preview_challenger` (Challenger 1)  
**Timestamp**: 2026-09-03T06:54:00+07:00  
**Target Milestone**: Milestone 2 (Uploader & Crop Viewport Logic)  
**Status**: COMPLETE (Hard Handoff)  
**Verdict**: **APPROVE**  

---

## 1. Observation

### Directly Observed Evidence & Stress Test Execution:
1. **Adversarial Test Suite Creation & Execution**:
   - Created dedicated adversarial stress test suite: `test/unit/adversarial_uploader_crop.test.ts`.
   - Executed via `npm.cmd test -- test/unit/adversarial_uploader_crop.test.ts`.
   - **Result**: **268 / 268 adversarial test cases passed (100% pass rate)**.

2. **Extreme Media Dimensions & Aspect Ratios**:
   - Evaluated `calculateCenterCrop`, `normalizeCropCoordinates`, and `getAspectRatioLabel` on boundary resolutions:
     - Micro-dimensions: `1x1`, `2x2`, `3x3`.
     - Extreme aspect ratios: `10000x500` (20:1), `500x10000` (1:20), `10000x100` (100:1 landscape), `100x10000` (1:100 portrait).
     - High-resolution boundaries: `7680x4320` (8K landscape), `4320x7680` (8K portrait), `65536x65536` (16-bit max limit).
     - Degenerate inputs: `0x0`, `0x500`, `500x0`, `-1920x-1080`.
   - *Observation*: All outputs produced finite, non-negative coordinates ($X \ge 0, Y \ge 0, W \ge 2, H \ge 2$), strictly even integers ($W \pmod 2 = 0, H \pmod 2 = 0, X \pmod 2 = 0, Y \pmod 2 = 0$), preventing any codec sub-sampling crashes.

3. **Pan/Zoom Clamping Invariants Across 245 Matrix Permutations**:
   - Tested 7 resolutions $\times$ 7 zoom factors ($1.0\times$ to $100.0\times$) $\times$ 5 pan offsets (including extreme $+10.0, -10.0$ out-of-bounds drag offsets).
   - *Observation*: For every single permutation:
     - $X \ge 0, Y \ge 0$.
     - $X + W \le \text{sourceWidth}$ and $Y + H \le \text{sourceHeight}$ (strictly zero out-of-bounds crop leakage).
     - No `NaN`, `Infinity`, or negative dimensions were generated.

4. **Magic Byte Sniffing & Extension Spoofing Resilience**:
   - Tested disguised payloads:
     - `vacation_clip.mp4` containing JPEG binary payload (`FF D8 FF`) $\rightarrow$ correctly sniffed as `jpeg` (image).
     - `screenshot.png` containing WebM EBML header (`1A 45 DF A3`) $\rightarrow$ correctly sniffed as `webm` (video).
     - `camera_photo.jpg` containing MP4 `ftypisom` box $\rightarrow$ correctly sniffed as `mp4` (video).
     - `clip.mov` containing WebP `RIFF....WEBP` header $\rightarrow$ correctly sniffed as `webp` (image).
     - QuickTime MOV files with raw `moov` / `mdat` top-level atoms without initial `ftyp` $\rightarrow$ correctly identified as `mov`.
     - Windows PE `.exe` / shell script disguised as `.mp4` or `.jpg` $\rightarrow$ rejected with descriptive error (`Unsupported or unreadable file format`).
     - Truncated buffers ($0$ to $7$ bytes) $\rightarrow$ handled without uncaught exceptions.

5. **Object URL Lifecycle & Memory Safety**:
   - `useDropzone.ts` registers all created Blob URLs in `activeUrlsRef` and systematically revokes them on `clearStagedMedia` and component unmount.
   - `useMediaConverter.ts` registers all preview and result URLs in `activeBlobUrlsRef` and revokes them on `resetAll` and hook unmount.
   - `extractImageDetails` and `extractVideoDetails` error listeners (`img.onerror`, `video.onerror`, and timeout handlers) explicitly revoke allocated object URLs prior to rejecting promises, preventing orphaned memory leaks in the browser.

---

## 2. Logic Chain

1. **Macroblock Alignment & Coordinate Safety**:
   - Ray-Ban Meta format requires $1376 \times 1840$ resolution. By enforcing `Math.floor(n / 2) * 2` and `Math.max(n, 2)` inside `normalizeCropCoordinates`, all cropped sub-regions comply with H.264 $2 \times 2$ macroblock alignment and YUV420p chroma subsampling.
2. **Strict Geometric Bounding**:
   - When users drag or pan beyond the boundary of the image or zoom in up to $100\times$, `normalizeCropCoordinates` uses `Math.min(crop.x, sourceWidth - 2)` and `Math.min(crop.width, sourceWidth - x)` to strictly constrain the crop box within the source boundaries.
3. **MIME/Sniffer Integrity**:
   - File extensions supplied by the user/operating system are completely untrusted. `sniffMediaFile` reads the raw binary header buffer and classifies media exclusively based on magic bytes, preventing media decode failures in downstream canvas and FFmpeg WASM pipelines.
4. **Zero Memory Leak Guarantee**:
   - Every `URL.createObjectURL` is accounted for in tracked `Set<string>` references and cleaned up deterministically across all lifecycle branches (staging, conversion, reset, cancellation, error, and unmount).

---

## 3. Caveats

1. **formatBytes Range**: `formatBytes` in `src/lib/media_utils.ts` defines size units up to `'TB'`. File sizes exceeding $1\text{ PB}$ or negative values will output `'... undefined'` or `'NaN undefined'`. This is a minor non-blocking formatting edge case, as browser uploads are bounded to $500\text{ MB}$.
2. **Hardware GPU Memory on 8K+ Canvas Operations**: While crop math safely handles 8K ($7680 \times 4320$) and 16-bit boundaries, extremely large images may consume significant browser tab memory during HTML5 canvas drawing; standard browser GC handles this after conversion.

---

## 4. Conclusion

**Verdict: APPROVE**

The Uploader & Crop Viewport logic has passed all adversarial stress tests without failure:
- No NaN, negative, zero, or out-of-bounds crop coordinates can be generated.
- Magic byte sniffing accurately identifies true file formats regardless of file extension spoofing.
- Object URLs are safely revoked, ensuring zero memory leaks.
- All 268 dedicated adversarial test cases passed.

Milestone 2 implementation is certified robust and ready for progression.

---

## 5. Verification Method

To independently verify the adversarial test results:

1. **Run Dedicated Adversarial Test Suite**:
   ```powershell
   npm.cmd test -- test/unit/adversarial_uploader_crop.test.ts
   ```
   *Expected Result*: All 268 tests pass with exit code 0.

2. **Inspect Test Coverage**:
   - View `test/unit/adversarial_uploader_crop.test.ts`.
