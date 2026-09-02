## 2026-09-02T23:10:28Z

You are teamwork_preview_spec_miner for Milestone 1: Core Engines & Infrastructure.
Your working directory is: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_m1
Authoritative request: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\ORIGINAL_REQUEST.md
Project plan: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\PROJECT.md
Survey spec: D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_survey\survey_spec.md

Your mission:
Provide exact technical specifications and code contracts for Milestone 1 implementation:
1. `src/lib/exif_injector.ts`:
   - Exact binary layout for JPEG APP1 / Exif segment insertion.
   - Tag IDs for Make (0x010F), Model (0x0110), Software (0x0131), Orientation (0x0112), DateTime (0x0132), ExifIFD (0x8769), FNumber (0x829D), ExposureTime (0x829A), ISOSpeedRatings (0x8827), FocalLength (0x920A), FocalLengthIn35mmFilm (0xA405), LensMake (0xA433), LensModel (0xA434).
   - TypeScript function signatures, parameter validation, and standalone execution without browser canvas if buffer is passed.
2. `src/lib/atom_synthesizer.ts`:
   - Exact binary construction of QuickTime atoms: `ftyp` (major brand `qt  `, compatible brands `qt  `), `wide`, `mdat`, `moov`, `mvhd` (timescale 48000), `trak`, `tkhd`, `mdia`, `mdhd` (video timescale 600, audio timescale 48000), `hdlr` ("Core Media Video", "Core Media Audio"), `minf`, `stbl`, `tapt` (`clef`, `prof`, `enof` with fixed-point 16.16 1376x1840 = 0x05600000, 0x07300000), and `moov.meta` (`hdlr` mdta, `keys` table, `ilst` data boxes with model, make, software, comment, creationdate).
   - Fast parser `parseAtomHierarchy(buffer: Uint8Array): AtomNode[]` and reconstructor `reconstructRayBanQuickTimeMov(buffer: Uint8Array, options?: ...): Uint8Array`.
3. `src/lib/metadata_extractor.ts` & `src/lib/media_utils.ts`:
   - Fast pure-JS parser to extract metadata for the UI diff table.
   - Format sniffer using magic bytes: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46 ... 57 45 42 50`), MP4/MOV (`ftyp` at offset 4), WebM (`1A 45 DF A3`).

Write your findings to `D:\Data_Lokal\Kuliah\Tri Wahyu (22518241023)\ToRayBan_Converter\.agents\spec_miner_m1\m1_specs.md` and handoff to `handoff.md`. Notify orchestrator via send_message.
