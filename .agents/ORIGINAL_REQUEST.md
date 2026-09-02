# Original User Request

## 2026-09-02T23:05:38Z

Build a client-side modern web application named "ToRayBan_Converter" that transforms any user-uploaded photo or video into authentic Ray-Ban Meta Smart Glasses format (1376x1840 vertical resolution, QuickTime `.MOV` atom container reconstruction compatible with Instagram Spin View, and camera EXIF metadata injection), deployable to GitHub Pages / Vercel.

Working directory: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter
Integrity mode: development

## Requirements

### R1. Sleek Cyberpunk/Modern Client-Side Web UI
Develop a responsive, high-performance web application (Next.js / React with Tailwind CSS) featuring:
- Drag-and-drop media uploader supporting video formats (MP4, MOV, WebM) and image formats (JPG, PNG, WebP).
- Aspect ratio crop selector (smart center crop or custom pan/zoom) to 1376x1840.
- Real-time conversion progress indicator with status telemetry.
- Side-by-side visual preview (Before vs After) and an interactive **Metadata Inspector** displaying the injected Ray-Ban Meta EXIF/QuickTime properties.
- Interactive **Transfer Guide Modal** explaining how to transfer the `.MOV` / image to iPhone (AirDrop) or Android (USB/Nearby Share) without triggering compression.

### R2. Core Video Synthesis & QuickTime Atom Pipeline (Instagram Spin View)
Implement the client-side video conversion pipeline (using FFmpeg WebAssembly or in-browser container synthesis based on the `metaspin` specification):
- Transcode and crop video to `1376 x 1840` vertical resolution (30/60 fps).
- Reconstruct the `.MOV` QuickTime container atom hierarchy to match the Ray-Ban Meta Smart Glasses (Gen 2) profile, ensuring compatibility with Instagram's glasses detection algorithms to unlock the "Spin View" interactive feature.
- Strip original identifying device tags, GPS coordinates, and extraneous tracks while preserving high audio/video fidelity.

### R3. High-Fidelity Photo EXIF Injection Engine
Implement an in-browser image processor that:
- Formats photos into authentic Ray-Ban Meta aspect ratio and resolution.
- Injects authentic EXIF and TIFF metadata tags: Make (`Luxottica`), Camera Model Name (`Ray-Ban Meta Smart Glasses`), Lens Model, Focal Length, and Software (`Meta View`).
- Allows instant download of the sanitized, tagged image.

### R4. Automated Testing, Verification & GitHub Integration
- Initialize the project in `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter`.
- Integrate with remote GitHub repository `https://github.com/triwahyu45/ToRayBan_Converter`.
- Provide an automated test script (`verify_converter.py` or Node test runner) that programmatically validates:
  1. Successful static export / build (`npm run build` exits 0).
  2. Sample image EXIF injection correctness.
  3. Sample video atom synthesis verification.
- Ensure the static build can be served and tested locally with a single command.

## Acceptance Criteria

### Build & Verification Checks
- [ ] Project builds cleanly (`npm run build`) with zero compilation or TypeScript errors.
- [ ] Automated verification script executes with exit code 0 and reports all media synthesis assertions PASSED.
- [ ] Converting a test image produces a downloadable image containing verified Ray-Ban Meta EXIF tags (`Luxottica`, `Ray-Ban Meta Smart Glasses`).
- [ ] Converting a test video outputs a valid 1376x1840 `.MOV` container with the expected QuickTime structure for Instagram Spin View.
- [ ] Transfer Guide and Metadata Inspector render responsively on both desktop and mobile viewports.
- [ ] Codebase is cleanly committed and pushed to `https://github.com/triwahyu45/ToRayBan_Converter`.
