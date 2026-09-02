# E2E Test Infra: ToRayBan_Converter

## Test Philosophy
- Opaque-box, requirement-driven testing based on `ORIGINAL_REQUEST.md`.
- Verifies real functional behavior without internal white-box mocks.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) |
|---|---------|----------------------|:----------------:|:-----------------:|:-----------------:|
| 1 | Client-Side Static Export & Build | ORIGINAL_REQUEST §R1, §R4 | 5 | 5 | ✓ |
| 2 | Photo EXIF/TIFF Injection Engine | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 3 | Video QuickTime Atom Reconstructor | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | FFmpeg WASM 1376x1840 Video Pipeline | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Drag & Drop Multi-Format Uploader | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | 1376x1840 Crop & Framing Viewport | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 7 | Real-Time Telemetry & Stepper HUD | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 8 | Before/After Visual Comparison Slider | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 9 | Instagram Spin View 3D Simulator | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 10 | Metadata & Atom Tree Inspector | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 11 | Transfer Guide Modal (iOS/Android) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 12 | Automated Verification & Git Remote | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- Primary Verification Runner: `python verify_converter.py`
  - Validates `npm.cmd run build` exit code 0.
  - Generates & verifies test JPEG with authentic `Luxottica` / `Ray-Ban Meta Smart Glasses` / `Meta View` EXIF tags.
  - Generates & parses test MOV with QuickTime `ftyp`, `tapt`, `moov.meta` atoms.
  - Asserts all checks exit code 0.
- Node.js Unit & Integration Test Suite: `npm.cmd test`
  - Tests EXIF injector byte streams.
  - Tests QuickTime atom reconstructor binary tree and offsets.
  - Tests media sniffer and crop math utilities.
- Python E2E Comprehensive Test Suite: `python test/e2e/test_runner.py`
  - Tier 1: 60 feature test cases (5 per feature across 12 features).
  - Tier 2: 60 boundary and edge cases (empty files, corrupt headers, zero-length streams, extreme dimensions, malformed atoms).
  - Tier 3: 15 pairwise cross-feature combination test cases.
  - Tier 4: 6 real-world application media scenarios.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | High-Res 4K Landscape Vacation Video -> 1376x1840 Instagram Spin View MOV | F1, F3, F4, F6, F7, F8, F9, F10, F11 | High |
| 2 | DSLR High-Resolution JPEG Photo -> Ray-Ban Meta Tagged Portrait JPEG | F1, F2, F5, F6, F7, F8, F10, F11 | Medium |
| 3 | Mobile Portrait Smartphone Video (9:16) -> Exact 1376x1840 Spin View MOV | F3, F4, F6, F7, F8, F9, F10 | Medium |
| 4 | PNG Screenshot with Transparency -> Stripped & Sanitized Ray-Ban Meta JPEG | F1, F2, F5, F6, F10 | Low |
| 5 | WebM Animation Clip -> Clean QuickTime Atom MOV with Stripped Metadata | F3, F4, F5, F6, F7, F10 | Medium |
| 6 | Complete Conversion + Metadata Inspection + Transfer Guide Export Workflow | F1, F2, F3, F5, F7, F8, F9, F10, F11, F12 | High |

## Coverage Thresholds
- Tier 1: ≥ 60 test cases
- Tier 2: ≥ 60 test cases
- Tier 3: ≥ 15 pairwise interaction cases
- Tier 4: ≥ 6 realistic workload scenarios
- Total E2E test cases: ≥ 141 test cases
