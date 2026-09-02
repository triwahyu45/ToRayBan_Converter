# Milestone 1 Technical Specification & Binary Contracts: Core Engines & Infrastructure
**Document ID**: SPEC-M1-CORE-001  
**Author**: teamwork_preview_spec_miner  
**Milestone**: M1 (Core Engines & Infrastructure)  
**Date**: 2026-09-03  
**Status**: Authoritative Technical Specification  

---

## 1. Executive Summary & Component Architecture

Milestone 1 implements the core client-side media synthesis and metadata processing engines for **ToRayBan_Converter**. These engines operate entirely in the browser and Node.js test runtime with **zero server-side dependencies**, providing:

1. **`src/lib/exif_injector.ts`**: Pure TypeScript JPEG APP1 / TIFF / EXIF injection engine that builds and injects verified Ray-Ban Meta Smart Glasses hardware, optics, and software tags while stripping private metadata and GPS tags.
2. **`src/lib/atom_synthesizer.ts`**: Pure TypeScript QuickTime `.MOV` atom container parser, mutator, and serializer that reconstructs video containers with the exact QuickTime atom hierarchy (`ftyp`, `wide`, `mdat`, `moov`, `mvhd`, `tapt`, `moov.meta`) required by Instagram Stories for **Spin View** interactive detection.
3. **`src/lib/metadata_extractor.ts`**: Fast, lightweight binary parser extracting EXIF and QuickTime metadata from raw user files for the Before-vs-After metadata inspector diff table.
4. **`src/lib/media_utils.ts`**: File format sniffer using magic bytes, data URL converters, and canvas framing calculations.

```
+----------------------------------------------------------------------------------------------------+
|                                    ToRayBan_Converter Core M1                                      |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   [ Photo Engine: exif_injector.ts ]                              [ Video Engine: atom_synthesizer.ts ]
   ├── Input: JPEG Uint8Array / DataURL                            ├── Input: Raw MOV/MP4 Uint8Array Buffer
   ├── Parse JPEG APP markers                                      ├── Parse Atom Hierarchy (parseAtomHierarchy)
   ├── Strip source APP1 / GPS / Serials                           ├── Rewrite ftyp: major_brand 'qt  '
   ├── Build Little-Endian TIFF Header ('II')                      ├── Normalize mvhd timescale to 48000
   ├── Synthesize 0th IFD (Make, Model, Soft, ExifOffset)          ├── Inject trak.tapt (clef, prof, enof 1376x1840)
   ├── Synthesize Exif SubIFD (f/2.2, 2.2mm, ISO 100)              ├── Rewrite mdhd video ts 600, audio ts 48000
   ├── Assemble APP1 (0xFFE1) Segment                              ├── Inject moov.meta (hdlr mdta, keys, ilst)
   └── Splice APP1 immediately after SOI (0xFFD8)                  ├── Recalculate Chunk Offsets (stco / co64 delta)
                                                                   └── Output: Verified Spin View .MOV Buffer
```

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | EXIF Engine | JPEG Marker Splicer | Locates JPEG markers (SOI, APPn, DQT, DHT, SOFn, SOS) and splices synthetic APP1 directly after SOI while stripping old APP1/APP2 markers. | Raw JPEG `Uint8Array` | Spliced JPEG `Uint8Array` | Throws `Error('Invalid JPEG: Missing SOI marker')` if first 2 bytes are not `0xFF, 0xD8`. | JPEG ISO/IEC 10918-1 & EXIF 2.32 |
| 2 | EXIF Engine | TIFF Header Builder | Builds 8-byte Little-Endian (`II`) TIFF header with 4-byte 0th IFD pointer offset `0x00000008`. | Target byte order (`II`) | 8-byte TIFF header `Uint8Array` | N/A (deterministic). | TIFF Revision 6.0 Specification |
| 3 | EXIF Engine | 0th IFD Camera Serialization | Serializes primary camera tags: Make (`Luxottica`), Model (`Ray-Ban Meta Smart Glasses`), Software (`Meta View`), Orientation (`1`), X/YResolution (`72/1`), DateTime (`YYYY:MM:DD HH:MM:SS`), and ExifIFD pointer (`0x8769`). | `RayBanExifOptions` dictionary | Binary IFD0 Directory + String Data blocks | Tags outside spec are omitted. | Ray-Ban Meta Photo EXIF sample analysis |
| 4 | EXIF Engine | Exif SubIFD Optical Serialization | Serializes optical tags: FNumber (`22/10`), ExposureTime (`1/120`), ISOSpeedRatings (`100`), FocalLength (`22/10`), FocalLengthIn35mmFilm (`15`), LensMake (`Luxottica`), LensModel (`Ray-Ban Meta Smart Glasses`), ColorSpace (`1`), PixelDimensions (`1376x1840` or `3024x4032`). | Width, Height, Options | Binary Exif SubIFD Directory + Rational blocks | Fallback to default `1376x1840` if dimensions omitted. | Ray-Ban Meta Camera Sensor Specs |
| 5 | EXIF Engine | Standalone Buffer & DataURL Engine | Exposes overloaded APIs that accept both `Uint8Array` / `ArrayBuffer` and `string` (Base64 data URL), executing synchronously without DOM `HTMLCanvasElement` or window dependencies. | `Uint8Array` or DataURL string | `Uint8Array` or DataURL string | Throws descriptive error on malformed base64 or empty buffer. | Node.js Test Harness & Browser Worker Specs |
| 6 | Atom Engine | QuickTime Atom Tree Parser | Recursively parses ISO/QuickTime atom boxes (`ftyp`, `moov`, `trak`, `mdia`, `minf`, `stbl`, `meta`, `ilst`, `tapt`) into structured `AtomNode[]` tree with offsets and sizes. | Raw MOV/MP4 `Uint8Array` | `AtomNode[]` tree with headers and child atoms | Gracefully handles truncated or malformed atom headers without crashing. | QuickTime File Format Spec (Apple) |
| 7 | Atom Engine | QuickTime `ftyp` Normalizer | Replaces or synthesizes file type box with major brand `'qt  '` (0x71742020), minor version `0x00000200`, and compatible brands `['qt  ']`. | Source atom list | Serialized 32-byte `ftyp` atom | If missing, prepends new `ftyp` before `mdat`. | QuickTime File Format Spec |
| 8 | Atom Engine | QuickTime `wide` Atom Placeholder | Inserts 8-byte `wide` atom (`0x00000008, 'wide'`) directly preceding `mdat` if not present. | Atom stream | Atom stream with `wide` atom | N/A | Apple QuickTime Writer Convention |
| 9 | Atom Engine | Track Aperture Mode Dimensions (`tapt`) Builder | Constructs 68-byte `tapt` atom containing `clef`, `prof`, and `enof` sub-atoms with fixed-point 16.16 dimensions (1376.0 x 1840.0 = `0x05600000`, `0x07300000`) and injects it into video `trak`. | Target Width (1376), Target Height (1840) | 68-byte binary `tapt` atom | Invalid if inserted outside video `trak`. | Apple QuickTime File Format Spec |
| 10 | Atom Engine | Timescale Normalizer (`mvhd` & `mdhd`) | Rewrites Movie Header (`mvhd`) timescale to `48000` and video Media Header (`mdhd`) timescale to `600`, proportionally rescaling all duration fields (`duration = round(old_dur * new_ts / old_ts)`). | Source `moov` atom | Mutated `moov` atom with aligned timescales | If old timescale is 0, duration is preserved as 0. | Meta View Video Container Specification |
| 11 | Atom Engine | QuickTime Direct `moov.meta` Synthesizer | Constructs a non-FullBox QuickTime `meta` atom containing `hdlr` (`mdta`/`appl`), `keys` atom (6 device keys), and `ilst` atom (1-indexed typed data entries). | Metadata options (model, make, software, comment, creationDate) | Binary `meta` atom block | Wrong index mapping or ISO FullBox header causes Instagram to reject Spin View. | Reverse-engineered Instagram Stories Parser |
| 12 | Atom Engine | Sample Table Chunk Offset Relocator (`stco` / `co64`) | Computes exact byte offset shift caused by inserted/modified `moov`, `ftyp`, `wide`, and `meta` atoms, and updates all entries in `stco` (32-bit) or `co64` (64-bit). | Shift delta (bytes), `stbl` atom | Updated `stco` / `co64` sample table | Video streams become unplayable if chunk offsets are not adjusted by exact byte delta. | ISO/IEC 14496-12 & QuickTime Specs |
| 13 | Media Utils | Magic Byte Format Sniffer | Fast multi-byte header inspecter identifying JPEG, PNG, WebP, MP4/MOV, WebM, and GIF formats from first 16 bytes. | First 16-64 bytes of buffer | Format identifier: `'jpeg' \| 'png' \| 'webp' \| 'mov' \| 'mp4' \| 'webm' \| 'unknown'` | Returns `'unknown'` for unrecognized headers. | Standard MIME/Magic Byte Specs |
| 14 | Metadata Extractor | Fast Pure-JS EXIF & QuickTime Inspector | Parses raw buffers and extracts human-readable metadata tags without external dependencies for the UI Before/After diff table. | Raw Image/Video Buffer | Structured `ExtractedMetadata` object | Returns partial metadata if file has corrupted segments. | Application Architecture Requirements |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior | Handling / Resolution Strategy |
|---|---------|-------|-------------------|--------------------------------|
| 1 | EXIF Injection | JPEG with existing bloated APP1 (e.g. Adobe XMP, existing camera EXIF) | Multiple conflicting APP1 segments confuse image viewers. | Locate and strip all existing `0xFFE1` (APP1), `0xFFE2` (ICC/FPX), and `0xFFED` (Photoshop) segments before prepending the clean Ray-Ban Meta APP1. |
| 2 | EXIF Injection | JPEG without APP0 (JFIF) marker | Valid JPEG starts directly with `0xFF, 0xD8, 0xFF, 0xDB` (DQT). | Insert synthetic APP1 immediately after `0xFFD8` without requiring an APP0 marker. |
| 3 | EXIF Injection | Data URL input with prefix `data:image/jpeg;base64,...` | Non-binary string passed to function. | Automatically strip prefix, decode base64 to `Uint8Array`, inject EXIF, and re-encode to Base64 data URL. |
| 4 | Atom Synthesis | Source MOV has `moov` at the end of file (after `mdat`) | Standard transcoders place `moov` after `mdat`. | Atom reconstructor parses top-level atoms, moves `moov` after `mdat` (or before `mdat` with offset adjustment), and updates `stco`/`co64` chunk offsets with exact delta. |
| 5 | Atom Synthesis | 64-bit Chunk Offsets (`co64` atom instead of `stco`) | High-resolution or large files use `co64` with 8-byte chunk offsets. | Support both `stco` (4-byte offsets) and `co64` (8-byte BigInt offsets) during chunk table relocation. |
| 6 | Atom Synthesis | Video with 64-bit large atom size (`size === 1`) | Atom header has 4-byte size = 1 followed by 8-byte extended length. | `parseAtomHierarchy` checks `size === 1` and reads 64-bit size from bytes 8..15. |
| 7 | Atom Synthesis | Existing MP4-style `udta.meta` or `moov.meta` with ISO FullBox header | MP4 `meta` contains 4-byte version/flags (`0x00000000`) before child atoms; QuickTime `meta` does NOT have version/flags. | Strip existing `udta.meta` or `moov.meta` and replace with authentic QuickTime non-FullBox `meta`. |
| 8 | Atom Synthesis | Missing Audio Track (Single Video Track) | Video has 0 audio tracks. Instagram Spin View requires 2 tracks. | Synthesize or allow atom synthesizer to configure video track while tagging warning for FFmpeg pipeline to insert silent AAC audio track. |
| 9 | Format Sniffing | WebP file with RIFF container | First 4 bytes are `'RIFF'`, but bytes 8..11 are `'WEBP'`. | Check both offset 0 (`0x52, 0x49, 0x46, 0x46`) and offset 8 (`0x57, 0x45, 0x42, 0x50`). |
| 10 | Format Sniffing | MP4 with brand `'isom'` or `'mp42'` at offset 4 | Bytes 4..7 are `'ftyp'`, bytes 8..11 are brand name. | Identify `'ftyp'` at offset 4 as MP4/MOV container. |

---

## 4. Deep Technical Specification: `src/lib/exif_injector.ts`

### 4.1 Binary Structure of Synthesized JPEG APP1 Segment

```
Offset   Size   Value (Hex)           Description
---------------------------------------------------------------------------------
0x0000   2      0xFF 0xE1             JPEG APP1 Marker
0x0002   2      Variable (Big-Endian) APP1 Payload Length (len(payload) + 2)
0x0004   6      45 78 69 66 00 00     Exif Header: "Exif\0\0"
---------------------------------------------------------------------------------
-- TIFF Header (Offset 0 relative to TIFF start at 0x000A) --
0x000A   2      49 49                 Byte Order: Little-Endian ("II")
0x000C   2      2A 00                 TIFF Version: 42 (0x002A)
0x000E   4      08 00 00 00           Offset to 0th IFD: 8 bytes
---------------------------------------------------------------------------------
-- 0th IFD (Starts at TIFF + 0x0008) --
0x0012   2      09 00                 Number of Directory Entries: 9 (0x0009)
0x0014   12     Tag: Make             Tag ID 0x010F, Type ASCII (2), Count 10, Offset -> "Luxottica\0"
0x0020   12     Tag: Model            Tag ID 0x0110, Type ASCII (2), Count 28, Offset -> "Ray-Ban Meta Smart Glasses\0"
0x002C   12     Tag: Orientation      Tag ID 0x0112, Type SHORT (3), Count 1, Value 1 (0x00010000)
0x0038   12     Tag: XResolution      Tag ID 0x011A, Type RATIONAL (5), Count 1, Offset -> 72/1
0x0044   12     Tag: YResolution      Tag ID 0x011B, Type RATIONAL (5), Count 1, Offset -> 72/1
0x0050   12     Tag: ResolutionUnit   Tag ID 0x0128, Type SHORT (3), Count 1, Value 2 (0x00020000)
0x005C   12     Tag: Software         Tag ID 0x0131, Type ASCII (2), Count 10, Offset -> "Meta View\0"
0x0068   12     Tag: DateTime         Tag ID 0x0132, Type ASCII (2), Count 20, Offset -> "YYYY:MM:DD HH:MM:SS\0"
0x0074   12     Tag: ExifIFD (Offset) Tag ID 0x8769, Type LONG (4), Count 1, Offset -> Exif SubIFD
0x0080   4      00 00 00 00           Next IFD Offset: 0 (No 1st IFD thumbnail)
---------------------------------------------------------------------------------
-- Exif SubIFD --
...      2      13 00                 Number of Exif SubIFD Entries: 19 (0x0013)
...      12     Tag: ExposureTime     Tag ID 0x829A, Type RATIONAL (5), Count 1, Offset -> 1/120
...      12     Tag: FNumber          Tag ID 0x829D, Type RATIONAL (5), Count 1, Offset -> 22/10
...      12     Tag: ExposureProgram  Tag ID 0x8822, Type SHORT (3), Count 1, Value 2
...      12     Tag: ISOSpeedRatings  Tag ID 0x8827, Type SHORT (3), Count 1, Value 100
...      12     Tag: ExifVersion      Tag ID 0x9000, Type UNDEFINED (7), Count 4, Value "0232" (0x32333230)
...      12     Tag: DateTimeOriginal Tag ID 0x9003, Type ASCII (2), Count 20, Offset -> "YYYY:MM:DD HH:MM:SS\0"
...      12     Tag: DateTimeDigitizedTag ID 0x9004, Type ASCII (2), Count 20, Offset -> "YYYY:MM:DD HH:MM:SS\0"
...      12     Tag: ShutterSpeedVal  Tag ID 0x9201, Type SRATIONAL (10), Count 1, Offset -> 690/100
...      12     Tag: ApertureValue    Tag ID 0x9202, Type RATIONAL (5), Count 1, Offset -> 227/100
...      12     Tag: ExposureBiasVal  Tag ID 0x9204, Type SRATIONAL (10), Count 1, Offset -> 0/1
...      12     Tag: MeteringMode     Tag ID 0x9207, Type SHORT (3), Count 1, Value 2
...      12     Tag: LightSource      Tag ID 0x9208, Type SHORT (3), Count 1, Value 0
...      12     Tag: Flash            Tag ID 0x9209, Type SHORT (3), Count 1, Value 0
...      12     Tag: FocalLength      Tag ID 0x920A, Type RATIONAL (5), Count 1, Offset -> 22/10
...      12     Tag: ColorSpace       Tag ID 0xA001, Type SHORT (3), Count 1, Value 1
...      12     Tag: PixelXDimension  Tag ID 0xA002, Type LONG (4), Count 1, Value 1376 (or 3024)
...      12     Tag: PixelYDimension  Tag ID 0xA003, Type LONG (4), Count 1, Value 1840 (or 4032)
...      12     Tag: SceneCaptureType Tag ID 0xA302, Type SHORT (3), Count 1, Value 0
...      12     Tag: FocalLengthIn35mmTag ID 0xA405, Type SHORT (3), Count 1, Value 15
...      12     Tag: LensMake         Tag ID 0xA433, Type ASCII (2), Count 10, Offset -> "Luxottica\0"
...      12     Tag: LensModel        Tag ID 0xA434, Type ASCII (2), Count 28, Offset -> "Ray-Ban Meta Smart Glasses\0"
...      4      00 00 00 00           Next IFD Offset: 0
---------------------------------------------------------------------------------
-- Data Values Area (Strings, Rationals, SRationals) --
```

### 4.2 Code Interface Contract (`src/lib/exif_injector.ts`)

```typescript
export interface RayBanExifOptions {
  make?: string;                  // Default: "Luxottica"
  model?: string;                 // Default: "Ray-Ban Meta Smart Glasses"
  software?: string;              // Default: "Meta View"
  lensMake?: string;              // Default: "Luxottica"
  lensModel?: string;             // Default: "Ray-Ban Meta Smart Glasses"
  fNumber?: [number, number];     // Default: [22, 10] (f/2.2)
  focalLength?: [number, number]; // Default: [22, 10] (2.2mm)
  focalLength35mm?: number;       // Default: 15 (15mm equivalent)
  iso?: number;                   // Default: 100
  exposureTime?: [number, number];// Default: [1, 120] (1/120s)
  dateTime?: Date;                // Default: new Date()
  width?: number;                 // Default: 1376 (or 3024)
  height?: number;                // Default: 1840 (or 4032)
}

/**
 * Injects authentic Ray-Ban Meta Smart Glasses EXIF metadata into a JPEG.
 * Accepts either a Uint8Array binary buffer or a Base64 Data URL string.
 */
export function injectRayBanExif(
  input: Uint8Array | string,
  options?: RayBanExifOptions
): Uint8Array | string;

/**
 * Binary-only variant guaranteeing Uint8Array output.
 */
export function injectRayBanExifBuffer(
  jpegBuffer: Uint8Array,
  options?: RayBanExifOptions
): Uint8Array;

/**
 * Extracts parsed EXIF tags from a JPEG buffer into a key-value record.
 */
export function extractExif(
  jpegBuffer: Uint8Array
): Record<string, any>;
```

---

## 5. Deep Technical Specification: `src/lib/atom_synthesizer.ts`

### 5.1 QuickTime Atom Tree Layout for Instagram Spin View

```
[ftyp] - Size: 32 bytes (major_brand: 'qt  ', minor_version: 512, compatible_brands: ['qt  '])
[wide] - Size: 8 bytes (type: 'wide')
[mdat] - Size: variable (raw audio/video stream frames)
[moov] - Movie Box
  ├── [mvhd] - Timescale: 48000, Duration: scaled, Unity matrix
  ├── [trak] (Video Track, ID: 1)
  │     ├── [tkhd] - Track Header (flags: 0x0F, width: 1376.0, height: 1840.0)
  │     ├── [tapt] - Track Aperture Mode Dimensions (68 bytes)
  │     │     ├── [clef] - Clean Aperture (1376.0 x 1840.0) -> Fixed Point: 0x05600000, 0x07300000
  │     │     ├── [prof] - Production Aperture (1376.0 x 1840.0) -> Fixed Point: 0x05600000, 0x07300000
  │     │     └── [enof] - Encoded Pixels (1376.0 x 1840.0) -> Fixed Point: 0x05600000, 0x07300000
  │     ├── [edts] - Edit List (optional)
  │     └── [mdia]
  │           ├── [mdhd] - Timescale: 600, Duration: scaled, Language: 'und'
  │           ├── [hdlr] - Type: 'mhlr', Subtype: 'vide', Name: 'Core Media Video'
  │           └── [minf]
  │                 ├── [vmhd] - Video Media Information
  │                 ├── [dinf] - Data Information
  │                 └── [stbl] - Sample Table (stsd, stts, stss, stsc, stsz, stco/co64)
  ├── [trak] (Audio Track, ID: 2)
  │     ├── [tkhd] - Track Header (volume: 1.0)
  │     └── [mdia]
  │           ├── [mdhd] - Timescale: 48000, Duration: scaled
  │           ├── [hdlr] - Type: 'mhlr', Subtype: 'soun', Name: 'Core Media Audio'
  │           └── [minf] (smhd, dinf, stbl)
  └── [meta] - QuickTime Metadata Container (Direct child of moov, NO version/flags FullBox header!)
        ├── [hdlr] - Subtype: 'mdta', Manufacturer: 'appl', Name: 'Core Media Data Handler'
        ├── [keys] - Keys Count: 6
        │     ├── Key 1: 'mdta' / "com.apple.quicktime.copyright"
        │     ├── Key 2: 'mdta' / "com.apple.quicktime.comment"
        │     ├── Key 3: 'mdta' / "com.apple.quicktime.model"
        │     ├── Key 4: 'mdta' / "com.apple.quicktime.creationdate"
        │     ├── Key 5: 'mdta' / "com.apple.quicktime.software"
        │     └── Key 6: 'mdta' / "com.apple.quicktime.make"
        └── [ilst] - 1-Indexed Items List
              ├── Item 1 (data type 1 UTF-8): "Meta AI"
              ├── Item 2 (data type 1 UTF-8): "app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id={UUID}"
              ├── Item 3 (data type 1 UTF-8): "Ray-Ban Meta Smart Glasses 2"
              ├── Item 4 (data type 1 UTF-8): "YYYY-MM-DDTHH:MM:SSZ"
              ├── Item 5 (data type 1 UTF-8): "Meta View"
              └── Item 6 (data type 1 UTF-8): "Luxottica"
```

### 5.2 Byte-Level Hexadecimal Specifications

#### 5.2.1 `tapt` Atom (68 Bytes)
```
00000000: 00 00 00 44 74 61 70 74  00 00 00 14 63 6c 65 66  |...Dtapt....clef|
00000010: 00 00 00 00 05 60 00 00  07 30 00 00 00 00 00 14  |.....`...0......|
00000020: 70 72 6f 66 00 00 00 00  05 60 00 00 07 30 00 00  |prof.....`...0..|
00000030: 00 00 00 14 65 6e 6f 66  00 00 00 00 05 60 00 00  |....enof.....`..|
00000040: 07 30 00 00                                       |..0.|
```

#### 5.2.2 `moov.meta` Atom (Non-FullBox)
```
00000000: [4-byte total_meta_size] 6d 65 74 61              |....meta|
00000008: 00 00 00 21 68 64 6c 72  00 00 00 00 00 00 00 00  |...!hdlr........|
00000018: 6d 64 74 61 61 70 70 6c  00 00 00 00 00 00 00 00  |mdtaappl........|
00000028: 00                                                |.| (hdlr end)
-- keys Atom --
00000029: [4-byte keys_size] 6b 65  79 73 00 00 00 00 00 00  |..keys......|
00000035: 00 06                                             |..| (6 keys follow)
...
-- ilst Atom --
...       [4-byte ilst_size] 69 6c  73 74                   |..ilst|
...       [4-byte item1_size] 00 00 00 01                   |....| (Item 1)
...       [4-byte data_size] 64 61  74 61 00 00 00 01 00 00  |..data....|
...       00 00 [UTF-8 string payload]                      |..|
```

### 5.3 Code Interface Contract (`src/lib/atom_synthesizer.ts`)

```typescript
export interface QuickTimeMetadata {
  model: string;          // Default: "Ray-Ban Meta Smart Glasses 2"
  make: string;           // Default: "Luxottica"
  software: string;       // Default: "Meta View"
  comment: string;        // Default: "app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id={UUID}"
  copyright: string;      // Default: "Meta AI"
  creationDate: string;   // ISO 8601 UTC string (e.g. "2026-09-03T06:15:00Z")
}

export interface ReconstructOptions {
  width?: number;         // Default: 1376
  height?: number;        // Default: 1840
  videoTimescale?: number;// Default: 600
  movieTimescale?: number;// Default: 48000
  metadata?: Partial<QuickTimeMetadata>;
}

export interface AtomNode {
  type: string;           // 4-character ASCII atom type (e.g. 'moov', 'trak')
  size: number;           // Total atom size in bytes
  offset: number;         // Byte offset in source buffer
  headerSize: number;     // 8 or 16 bytes
  children?: AtomNode[];  // Child atoms if container box
  data?: Uint8Array;      // Raw payload buffer
}

/**
 * Fast recursive parser for QuickTime / MP4 atom hierarchies.
 */
export function parseAtomHierarchy(buffer: Uint8Array): AtomNode[];

/**
 * Reconstructs a MOV/MP4 buffer into an authentic Ray-Ban Meta QuickTime container
 * compatible with Instagram Stories Spin View.
 */
export function reconstructRayBanQuickTimeMov(
  rawMovBuffer: Uint8Array,
  options?: ReconstructOptions
): Uint8Array;

/**
 * Helper to construct the 68-byte tapt atom.
 */
export function buildTaptAtom(width?: number, height?: number): Uint8Array;

/**
 * Helper to construct the QuickTime moov.meta atom.
 */
export function buildQuickTimeMetaAtom(metadata?: Partial<QuickTimeMetadata>): Uint8Array;
```

---

## 6. Deep Technical Specification: `src/lib/metadata_extractor.ts` & `src/lib/media_utils.ts`

### 6.1 Magic Byte Detection Table

```typescript
export type MediaFormat = "jpeg" | "png" | "webp" | "mov" | "mp4" | "webm" | "gif" | "unknown";
```

| Format | Magic Bytes (Hex) | Offset | Secondary Validation |
|---|---|---|---|
| **JPEG** | `FF D8 FF` | 0 | Byte 3 is `E0` (JFIF), `E1` (EXIF), or `DB` (DQT) |
| **PNG** | `89 50 4E 47 0D 0A 1A 0A` | 0 | Exact 8-byte PNG signature |
| **WebP** | `52 49 46 46` ("RIFF") | 0 | Offset 8..11 contains `57 45 42 50` ("WEBP") |
| **MP4 / MOV**| `66 74 79 70` ("ftyp") | 4 | Offset 8..11 contains brand (`qt  `, `isom`, `mp42`) |
| **WebM** | `1A 45 DF A3` | 0 | EBML container header |
| **GIF** | `47 49 46 38` ("GIF8") | 0 | Offset 4..5 is `37 61` (87a) or `39 61` (89a) |

### 6.2 Code Interface Contract (`src/lib/media_utils.ts`)

```typescript
/**
 * Detects media format from magic bytes in the initial buffer chunk.
 */
export function detectMediaFormat(buffer: Uint8Array): MediaFormat;

/**
 * Converts a Blob or File to Uint8Array.
 */
export function fileToUint8Array(file: Blob): Promise<Uint8Array>;

/**
 * Converts a Uint8Array to a Base64 Data URL.
 */
export function bufferToDataUrl(buffer: Uint8Array, mimeType: string): string;

/**
 * Calculates optimal 1376x1840 center-crop coordinates from source dimensions.
 */
export function calculateCenterCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth?: number,  // Default: 1376
  targetHeight?: number  // Default: 1840
): { x: number; y: number; width: number; height: number };
```

### 6.3 Code Interface Contract (`src/lib/metadata_extractor.ts`)

```typescript
export interface ExtractedMetadata {
  format: MediaFormat;
  dimensions?: { width: number; height: number };
  make?: string;
  model?: string;
  software?: string;
  lensModel?: string;
  fNumber?: number;
  focalLength?: number;
  iso?: number;
  dateTime?: string;
  hasGps: boolean;
  quickTime?: {
    majorBrand?: string;
    movieTimescale?: number;
    videoTimescale?: number;
    hasTapt: boolean;
    hasSpinViewMeta: boolean;
    metaKeys?: Record<string, string>;
  };
  rawTags: Record<string, any>;
}

/**
 * High-speed client-side metadata reader for images and video containers.
 */
export function extractMediaMetadata(
  buffer: Uint8Array
): ExtractedMetadata;
```

---

## 7. Verification Test Vectors & Validation Protocol

### 7.1 Test Vector 1: JPEG EXIF Injection
1. **Input**: Clean 1376x1840 JPEG without APP1 segment.
2. **Execute**: `injectRayBanExif(inputBuffer)`
3. **Assertions**:
   - `outputBuffer[0..1] === [0xFF, 0xD8]` (SOI)
   - `outputBuffer[2..3] === [0xFF, 0xE1]` (APP1)
   - `outputBuffer[4..9] === "Exif\0\0"`
   - `extractExif(outputBuffer).Make === "Luxottica"`
   - `extractExif(outputBuffer).Model === "Ray-Ban Meta Smart Glasses"`
   - `extractExif(outputBuffer).Software === "Meta View"`
   - `extractExif(outputBuffer).FNumber === 2.2`
   - `extractExif(outputBuffer).FocalLength === 2.2`
   - `extractExif(outputBuffer).FocalLengthIn35mmFilm === 15`
   - `extractExif(outputBuffer).GPS === undefined` (Zero geolocation leaks)

### 7.2 Test Vector 2: QuickTime Atom Reconstructor
1. **Input**: Standard MP4 / MOV video buffer with `isom` brand and arbitrary timescales.
2. **Execute**: `reconstructRayBanQuickTimeMov(inputBuffer)`
3. **Assertions**:
   - `parseAtomHierarchy(outputBuffer)` top-level sequence contains `ftyp`, `wide`, `mdat`, `moov`.
   - `ftyp.major_brand === "qt  "`
   - `moov.mvhd.timescale === 48000`
   - Video track `trak` contains `tapt` atom with size 68.
   - `tapt.clef.width === 1376` and `tapt.clef.height === 1840`
   - Video track `hdlr.name === "Core Media Video"`
   - Audio track `hdlr.name === "Core Media Audio"`
   - `moov.meta.hdlr.subtype === "mdta"`
   - `moov.meta.keys` contains `"com.apple.quicktime.model"`
   - `moov.meta.ilst` contains value `"Ray-Ban Meta Smart Glasses 2"`

---

## 8. Implementation Checklist for Milestone 1

- [ ] `src/types/metadata.ts`: Export `RayBanExifOptions`, `QuickTimeMetadata`, `ExtractedMetadata`.
- [ ] `src/types/atoms.ts`: Export `AtomNode`, `ReconstructOptions`.
- [ ] `src/lib/media_utils.ts`: Implement `detectMediaFormat`, `calculateCenterCrop`, `bufferToDataUrl`.
- [ ] `src/lib/exif_injector.ts`: Implement pure TypeScript Little-Endian EXIF injector and extractor.
- [ ] `src/lib/atom_synthesizer.ts`: Implement recursive atom parser, `tapt` builder, `moov.meta` builder, chunk offset updater, and container reconstructor.
- [ ] `src/lib/metadata_extractor.ts`: Implement unified metadata extractor for UI diffing.
- [ ] `test/unit/exif_injector.test.ts`: 100% unit test coverage on synthetic JPEG buffers.
- [ ] `test/unit/atom_synthesizer.test.ts`: 100% unit test coverage on QuickTime atom trees.
