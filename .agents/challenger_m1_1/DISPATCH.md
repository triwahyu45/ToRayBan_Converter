## 2026-09-02T23:21:29Z
You are teamwork_preview_challenger (Challenger 1) for Milestone 1: Core Engines & Infrastructure.
Your working directory is: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\challenger_m1_1
Authoritative request: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\ORIGINAL_REQUEST.md
Project plan: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\PROJECT.md
Worker Handoff: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\worker_m1\handoff.md

Your mission:
Adversarially challenge and stress-test the EXIF Injection Engine (`src/lib/exif_injector.ts` and `src/lib/metadata_extractor.ts`):
1. Write and execute a dedicated stress-test script in your working directory (e.g. `test_exif_adversarial.ts` or Python equivalent) that tests:
   - JPEGs with existing bloated EXIF, multiple APP segments (APP0, APP1, APP2, APP13, APP14).
   - JPEGs with corrupt markers, truncated streams, 0-byte images, and oversized payloads.
   - Non-JPEG images (PNG, WebP) and invalid data URLs passed to EXIF injector.
   - Idempotency: injecting EXIF multiple times on the same image.
   - Tag preservation and verification of exact Little-Endian / Big-Endian byte parsing.
2. Evaluate if any crash, unhandled rejection, or invalid byte structure occurs.
3. Record your stress test results and explicit verdict (`APPROVE` or `REQUEST_CHANGES`) in `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\challenger_m1_1\handoff.md`.
4. Send a message to orchestrator with your verdict and findings.
