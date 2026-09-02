## 2026-09-02T23:10:28Z
You are teamwork_preview_test_writer for the ToRayBan_Converter E2E Testing Track.
Your working directory is: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\test_writer_e2e
Authoritative request: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\ORIGINAL_REQUEST.md
Project plan: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\PROJECT.md
Test Infra Spec: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\TEST_INFRA.md

Your mission:
Design and implement the complete, opaque-box E2E test suite and automated verification runner based on `TEST_INFRA.md`:
1. Implement `test/e2e/test_runner.py` with full coverage for:
   - Tier 1: Feature Coverage (>=60 test cases, >=5 per feature across all 12 inventoried features).
   - Tier 2: Boundary & Corner Cases (>=60 test cases: empty buffers, 0-byte files, extreme resolutions, non-standard aspect ratios, malformed atoms, missing EXIF headers, invalid magic bytes).
   - Tier 3: Cross-Feature Combinations (>=15 pairwise combinatorial tests: e.g. Crop + EXIF + QuickTime, WebM + Pan/Zoom + Atom rebuild, PNG transparency + EXIF injection + Inspector diff).
   - Tier 4: Real-World Workload Scenarios (>=6 realistic application scenarios: 4K landscape video, DSLR JPEG portrait, Smartphone 9:16 clip, screenshot PNG, WebM clip, full end-to-end user journey).
2. Implement sample test media fixtures or procedural test media generators in `test/e2e/fixtures/` or directly inside `test_runner.py` so tests can execute standalone without external network calls.
3. Implement `verify_converter.py` at the project root which:
   - Runs `npm.cmd run build` (or validates static export output directory).
   - Runs programmatic photo EXIF verification (checks Make="Luxottica", Model="Ray-Ban Meta Smart Glasses", Software="Meta View").
   - Runs programmatic video QuickTime atom verification (checks `ftyp` brand `qt  `, `tapt` with 1376x1840 fixed point, `moov.meta` with keys and ilst).
   - Returns exit code 0 when all checks pass.
4. When test suite files are created and validated, publish `TEST_READY.md` at project root `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\TEST_READY.md` following the template in `PROJECT.md`.
5. Write your handoff to `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\test_writer_e2e\handoff.md` and send_message when done.
