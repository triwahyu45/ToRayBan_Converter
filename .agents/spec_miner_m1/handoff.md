# Handoff Report: Milestone 1 Specification Mining

## 1. Observation
- Inspected user requirements from `ORIGINAL_REQUEST.md` (lines 20-31), `PROJECT.md` (lines 88-97, 137-185), and survey findings in `survey_spec.md` (lines 88-223, 342-429).
- Verified JPEG APP1 / EXIF tag definitions required for Ray-Ban Meta photo validation:
  - 0th IFD: Make `0x010F` (`"Luxottica"`), Model `0x0110` (`"Ray-Ban Meta Smart Glasses"`), Software `0x0131` (`"Meta View"`), Orientation `0x0112` (`1`), DateTime `0x0132`, ExifIFD pointer `0x8769`.
  - Exif SubIFD: FNumber `0x829D` (`22/10`), ExposureTime `0x829A` (`1/120`), ISOSpeedRatings `0x8827` (`100`), FocalLength `0x920A` (`22/10`), FocalLengthIn35mmFilm `0xA405` (`15`), LensMake `0xA433` (`"Luxottica"`), LensModel `0xA434` (`"Ray-Ban Meta Smart Glasses"`).
- Verified QuickTime `.MOV` atom structures for Instagram Spin View detection:
  - `ftyp` (major brand `'qt  '`, minor version 512, compatible brands `['qt  ']`).
  - `wide` placeholder (8 bytes) preceding `mdat`.
  - `tapt` (Track Aperture Mode Dimensions) in video `trak` containing `clef`, `prof`, `enof` with fixed-point 16.16 `1376x1840` (`0x05600000`, `0x07300000`).
  - Timescales: `mvhd` timescale normalized to `48000`, `mdhd` video timescale to `600`, audio to `48000`.
  - `moov.meta`: Non-FullBox QuickTime metadata box containing `hdlr` (`mdta`), `keys` (6 entries), and `ilst` (1-indexed UTF-8 items for copyright, comment with random UUID, model, creationdate, software, make).
- Verified format sniffer magic byte signatures: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46 ... 57 45 42 50`), MP4/MOV (`ftyp` at offset 4), WebM (`1A 45 DF A3`).

## 2. Logic Chain
1. From the observation that Instagram and Meta View applications rely on deterministic binary container and EXIF tags, the synthesizer engines must construct exact binary layouts rather than relying on high-level lossy tools.
2. From the observation that `moov.meta` in Apple QuickTime files is a standard container box without version/flags (unlike ISO MP4 `meta` which is a FullBox), our `buildQuickTimeMetaAtom` function must omit the 4-byte version/flags header to prevent Instagram's Spin View parser from failing.
3. From the observation that injecting or modifying atoms shifts the starting byte offsets of media samples in `mdat`, our `reconstructRayBanQuickTimeMov` function must calculate the delta offset and update all entries in `stco` (32-bit) or `co64` (64-bit).
4. From the observation that both browser workers and Node.js test runners need to invoke these engines, all binary functions in `exif_injector.ts` and `atom_synthesizer.ts` are designed around pure `Uint8Array` / `DataView` operations without DOM dependencies.

## 3. Caveats
- Browser canvas rendering for image cropping will run in the UI layer (`media_utils.ts` / `CropViewport.tsx`), while `exif_injector.ts` operates on binary buffers.
- For videos with no audio track in the source file, FFmpeg transcoding must synthesize a silent 48kHz stereo AAC stream because Instagram Spin View requires exactly 2 tracks.

## 4. Conclusion
- Complete technical specification, binary layouts, code interfaces, edge cases, and test assertions have been compiled and documented in `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_m1\m1_specs.md`.
- Milestone 1 implementation can proceed with zero ambiguity across `exif_injector.ts`, `atom_synthesizer.ts`, `metadata_extractor.ts`, and `media_utils.ts`.

## 5. Verification Method
- Inspect specification file: `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_m1\m1_specs.md`.
- Review binary layouts against QuickTime File Format specification and EXIF 2.32 standard.
- Implementation verification: Unit test suites in `test/unit/exif_injector.test.ts` and `test/unit/atom_synthesizer.test.ts` passing all test vectors specified in §7 of `m1_specs.md`.
