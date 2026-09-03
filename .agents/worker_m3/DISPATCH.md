## 2026-09-03T00:00:19Z
You are teamwork_preview_worker for Milestone 3: Telemetry, Spin Preview, Metadata Inspector & Transfer Guide.
Your working directory is: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\worker_m3
Authoritative request: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\ORIGINAL_REQUEST.md
Project plan: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\PROJECT.md
UI Blueprint: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\explorer_ui_survey\survey_ui.md
Spec Blueprint: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_survey\survey_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `src/components/telemetry/StepperHUD.tsx`, `ProgressRing.tsx`, `TerminalViewer.tsx`
- `src/components/preview/ComparisonSlider.tsx`, `SpinViewSimulator.tsx`, `MediaViewer.tsx`
- `src/components/inspector/MetadataInspector.tsx`, `ExifDiffTable.tsx`, `QuickTimeAtomTree.tsx`
- `src/components/guide/TransferGuideModal.tsx`, `AirDropGuide.tsx`, `AndroidGuide.tsx`
- `src/app/page.tsx`
- `test/unit/` (any new unit tests for M3 components)

Your mission:
1. Implement Telemetry components in `src/components/telemetry/`:
   - `StepperHUD.tsx`: 4-phase stepper (`Probe` -> `Transcode` -> `Atom/EXIF Inject` -> `Finalize`) with animated active state.
   - `ProgressRing.tsx`: Circular/linear glowing neon progress telemetry with percentage, FPS, bitrate, and ETA readout.
   - `TerminalViewer.tsx`: Collapsible console stream showing real FFmpeg/conversion logs with auto-scroll and copy button.
2. Implement Preview components in `src/components/preview/`:
   - `ComparisonSlider.tsx`: Split-curtain draggable slider comparing Before vs After media with synchronized video playback.
   - `SpinViewSimulator.tsx`: Interactive 3D gyroscope/cursor tilt parallax simulation replicating Instagram Spin View.
   - `MediaViewer.tsx`: Unified viewer with instant download trigger, filename formatting (`rayban_meta_...`), and copy/share actions.
3. Implement Inspector components in `src/components/inspector/`:
   - `MetadataInspector.tsx`: Tabbed / accordion inspector comparing Original vs Ray-Ban Meta metadata.
   - `ExifDiffTable.tsx`: Side-by-side diff table highlighting injected Make (`Luxottica`), Model (`Ray-Ban Meta Smart Glasses`), Software (`Meta View`), Lens (`f/2.2`), and stripped GPS coordinates.
   - `QuickTimeAtomTree.tsx`: Interactive expandable ISO QuickTime box tree (`ftyp` -> `moov` -> `tapt` -> `moov.meta` -> `keys` -> `ilst`) showing offsets, byte sizes, and atom data.
4. Implement Transfer Guide components in `src/components/guide/`:
   - `TransferGuideModal.tsx`: Comprehensive modal with tabbed guides for iOS (AirDrop "All Photos Data" preservation) and Android (USB `/DCIM/Camera/` & Quick Share).
   - `AirDropGuide.tsx` & `AndroidGuide.tsx`: Step-by-step visual instructions with anti-compression dos & don'ts.
5. Integrate all components into `src/app/page.tsx` to provide a complete, seamless studio application experience.
6. Verify and run:
   - `npm.cmd test`
   - `npm.cmd run build`
   - `python verify_converter.py`
7. Write your handoff to `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\worker_m3\handoff.md` and send_message when done.
