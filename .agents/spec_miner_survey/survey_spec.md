# Ray-Ban Meta Smart Glasses Media Synthesis Specification
**Document ID**: SPEC-RAYBAN-META-001  
**Author**: teamwork_preview_spec_miner  
**Date**: 2026-09-03  
**Status**: Authoritative Survey Specification  

---

## 1. Executive Summary & Architecture Overview

The purpose of the **ToRayBan_Converter** engine is to synthesize standard user-provided images (JPEG, PNG, WebP) and videos (MP4, MOV, WebM) into byte-for-byte compliant media matching the hardware and software signature of the **Ray-Ban Meta Smart Glasses (Gen 2)** ecosystem.

Instagram and Meta applications identify smart glasses media not through pixel analysis or neural watermarks, but through deterministic binary inspection of container metadata:
1. **Video Media**: Instagram inspects the QuickTime container (`.MOV`) structure, specifically searching for a `meta` atom positioned directly under `moov` (QuickTime style metadata), containing Apple metadata keys (`mdta/com.apple.quicktime.*`), track aperture mode dimensions (`tapt`), standard audio/video timescales (48000 / 600), and specific Core Media stream handlers. When these criteria are met, Instagram automatically unlocks the **"Spin View"** interactive experience on Instagram Stories.
2. **Photo Media**: Social platforms and photo managers inspect the EXIF/TIFF directory markers (APP1 segment in JPEG), identifying `Make: "Luxottica"`, `Model: "Ray-Ban Meta Smart Glasses"`, `Software: "Meta View"`, fixed aperture `f/2.2` (FNumber `22/10`), physical focal length `2.2mm` (FocalLength `22/10`), 35mm equivalent focal length `15mm`, and native 3:4 portrait resolution (`1376x1840` or `3024x4032`).

```
+--------------------------------------------------------------------------------------------------+
|                                    ToRayBan_Converter Engine                                     |
+--------------------------------------------------------------------------------------------------+
                                                  |
                 +--------------------------------+--------------------------------+
                 |                                                                 |
                 v                                                                 v
     [ Video Synthesis Engine ]                                        [ Photo Synthesis Engine ]
                 |                                                                 |
  1. Client-Side Decoupled Crop/Scale                               1. HTML5 Canvas Resizer / Cropper
     - Target: 1376 x 1840 (0.7478 Aspect Ratio)                       - Target: 1376x1840 or 3024x4032 (3:4)
     - Smart Center Crop / Custom Pan-Zoom                             - High-Quality Bicubic Resampling
                 |                                                                 |
  2. FFmpeg WebAssembly Transcode (@ffmpeg/ffmpeg)                  2. JPEG Binary Stream Serialization
     - Codec: H.264 (libx264) / AAC-LC                                 - Strip source EXIF/GPS segments
     - Video: 30 fps, 1376x1840, yuv420p                               - Strip camera serials & location
     - Audio: 48000 Hz, 2 Channels Stereo                              - Re-encode baseline JPEG (quality 0.95)
     - Color: BT.2020 / HLG or BT.709                                              |
                 |                                                  3. In-Browser EXIF/TIFF Injection (piexifjs)
  3. Binary QuickTime Atom Reconstructor                               - Inject IFD0: Make="Luxottica", Model, Soft
     - Rebuild atom order: ftyp -> wide -> mdat -> moov                - Inject ExifIFD: f/2.2, 2.2mm (15mm eq), ISO
     - Inject `moov.trak.tapt` (clef, prof, enof)                      - Inject Interop & Resolution Tags
     - Rewrite `moov.mvhd` timescale to 48000                                      |
     - Inject `moov.meta` with Core Media Data Handler                             v
     - Write `keys` + `ilst` (Meta AI / Ray-Ban Meta tags)              [ Ray-Ban Meta Verified JPEG ]
                 |
                 v
   [ Ray-Ban Meta Spin View .MOV ]
```

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Video Transcoding | 1376x1840 Rescaling & Aspect Crop | Scales and crops input video from arbitrary aspect ratios (16:9, 1:1, 4:3) into exact 1376x1840 vertical resolution (Ray-Ban Meta standard video dimension). | Video File (MP4, MOV, WebM), Crop Configuration (center / offset) | Transcoded Video Frame Buffer (1376x1840, 30 fps, YUV420P) | FFmpeg filter parse error if dimensions are odd or invalid; fallback to center-crop. | Official Meta View video export specifications & `loui89/metaspin` |
| 2 | Video Container | QuickTime `.MOV` Container Formulation | Formats the video container as QuickTime Movie (`qt  ` brand) with exact atom sequence (`ftyp`, `wide`, `mdat`, `moov`). | Elementary video and audio streams | Valid QuickTime File Header and Sample Tables | Fallback to standard MP4 container if QuickTime muxing fails. | QuickTime File Format Specification (Apple) |
| 3 | Video Atom Layout | Direct `moov.meta` Atom Placement | Inserts a QuickTime-style `meta` atom as a direct child of `moov` (without MP4 version/flags header) rather than inside `udta`. | Metadata key-value dictionary | Binary `meta` atom block containing `hdlr`, `keys`, `ilst` | Missing `meta` results in failure of Instagram Spin View detection. | Reverse-engineering of Instagram Stories parser |
| 4 | Video Metadata | QuickTime Metadata Keys (`mdta`) | Encodes device identifying keys (`com.apple.quicktime.model`, `com.apple.quicktime.make`, `com.apple.quicktime.copyright`, `com.apple.quicktime.comment`, `com.apple.quicktime.software`, `com.apple.quicktime.creationdate`). | Device identity strings ("Luxottica", "Ray-Ban Meta Smart Glasses 2", "Meta View") | Binary `keys` atom and 1-indexed `ilst` data boxes (UTF-8 payload) | Malformed index mapping breaks QuickTime parser. | QuickTime metadata specification (`mdta` namespace) |
| 5 | Video Atom Layout | Track Aperture Mode Dimensions (`tapt`) | Inserts `tapt` atom into video `trak` containing `clef`, `prof`, and `enof` sub-atoms with fixed-point 16.16 dimensions (1376.0 x 1840.0). | Width: 1376, Height: 1840 | 68-byte binary `tapt` atom block in video `trak` | Video aspect ratio distortion in Apple QuickTime Player if missing. | Apple QuickTime File Format specification |
| 6 | Video Timing | Movie & Track Timescale Normalization | Normalizes Movie Header (`mvhd`) timescale to `48000` and video media header (`mdhd`) timescale to `600`. | Raw timescale from transcoder | Rescaled duration and timescale fields in `mvhd` and `mdhd` | Desynchronization if duration is not rescaled proportionally (`old_dur * new_ts / old_ts`). | Ray-Ban Meta video telemetry analysis |
| 7 | Video Stream | Stream Track Cleanup | Ensures exactly two tracks exist (Track 1 = Video, Track 2 = Audio) with handlers `"Core Media Video"` and `"Core Media Audio"`. | Multiplexed container streams | Stripped container with exactly 2 tracks | Instagram rejects Spin View if auxiliary data/timecode tracks are present. | `loui89/metaspin` compatibility experiments |
| 8 | Privacy / Sanitization | Video Metadata Stripping | Strips source GPS coordinates (`©xyz`, `udta.xyz`), original camera model, and recording device telemetry. | Source video file | Clean video without private metadata | N/A (all non-whitelisted atoms dropped). | Security & privacy requirement |
| 9 | Photo Processing | Aspect Ratio Formatting | Crops and scales source photo to 3:4 portrait aspect ratio (either 1376x1840 or native 12MP 3024x4032). | Image file (JPEG, PNG, WebP) | Resized canvas pixel data (ImageData / Blob) | Graceful upscale/downscale handling. | Ray-Ban Meta hardware camera specs |
| 10 | Photo EXIF | IFD0 Camera Make & Model Injection | Injects TIFF/EXIF primary tags: Make=`"Luxottica"`, Model=`"Ray-Ban Meta Smart Glasses"`, Software=`"Meta View"`, Orientation=`1`. | Clean JPEG Blob / DataURL | JPEG byte stream with synthesized APP1 EXIF marker | Corrupted EXIF if byte offsets in TIFF header are miscalculated. | EXIF 2.32 Standard & Meta View photo exports |
| 11 | Photo EXIF | ExifIFD Optical Properties Injection | Injects lens optics: FNumber=`22/10` (f/2.2), FocalLength=`22/10` (2.2mm), FocalLengthIn35mmFilm=`15`, LensMake=`"Luxottica"`, LensModel=`"Ray-Ban Meta Smart Glasses"`, ISOSpeedRatings=`100`, ExposureTime=`1/120`. | EXIF dictionary | Exif SubIFD directory structure inside APP1 segment | Ignored if pointer tag `0x8769` in IFD0 is missing. | Ray-Ban Meta camera hardware analysis |
| 12 | Photo Privacy | Photo GPS & Metadata Sanitization | Drops original location tags (GPS IFD), personal serial numbers, and device unique IDs. | Source image metadata | Sanitized EXIF containing only synthetic Ray-Ban Meta parameters | Default to empty GPS IFD. | Privacy specification |
| 13 | Mobile Transfer | iOS AirDrop Native Container Preservation | Provides actionable user steps to send `.MOV` via AirDrop with "All Photos Data" enabled to prevent iOS re-encoding. | Exported `.MOV` file | Raw `.MOV` imported directly into iOS Photos Camera Roll | If sent via WhatsApp/Telegram/Shared Album, container is transcoded to MP4 and Spin View is broken. | iOS Photos & AirDrop transfer specification |
| 14 | Mobile Transfer | Android MTP & Quick Share Direct Transfer | Provides step-by-step instructions to copy `.MOV` directly into Android `/DCIM/Camera/` via USB MTP or Quick Share. | Exported `.MOV` file | Native `.MOV` stored in device storage | Google Photos cloud backup may re-encode if not accessed from local storage. | Android MediaStore & Gallery specifications |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior | Handling / Resolution Strategy |
|---|---------|-------|-------------------|--------------------------------|
| 1 | Video Crop | Landscape 16:9 4K Video (3840x2160) | High aspect distortion if stretched without cropping. | Apply smart center crop to 1620x2160 (3:4 ratio), then downscale to 1376x1840 using bicubic lanczos. |
| 2 | Video Crop | Extreme Panoramic Video (32:9 or 21:9) | Center crop results in loss of horizontal context. | Provide interactive Pan/Zoom UI allowing user to choose focal bounding box before encoding. |
| 3 | Video Frame Rate | Variable Frame Rate (VFR) source (e.g. mobile screen recording) | Audio/Video sync drift during WebAssembly encoding. | Force constant frame rate `-r 30` and `-vsync cfr` during FFmpeg WASM transcode. |
| 4 | Video Audio | Silent Video (No Audio Track) | QuickTime atom reconstructor expects exactly 2 tracks (video + audio). Single-track video breaks Instagram Spin View parser. | Synthesize a silent 48kHz stereo AAC audio track (`-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000`) if source has no audio. |
| 5 | Video Duration | Long Video (> 60 seconds) | Ray-Ban Meta hardware limits recording to 60s clips; Instagram Stories limit to 60s. | Display UI alert recommending trimming to <= 60 seconds; provide built-in trim slider. |
| 6 | Container Parsing | Existing `moov` atom located at the end of file (`moov` after `mdat`) | WebAssembly streaming buffer requires reading entire file to locate `moov`. | Execute `-movflags +faststart` during FFmpeg transcode to relocate `moov` to file start before binary reconstruction. |
| 7 | Photo Format | PNG with Alpha Channel (Transparency) | EXIF standard does not natively attach to PNG in standard gallery apps; JPEG is required by Meta View. | Render canvas onto solid background (default black or white) and serialize as standard JPEG (`image/jpeg`) prior to EXIF injection. |
| 8 | Photo Resolution | Small Low-Resolution Input (e.g. 400x300) | Blurry output if upscaled to 3024x4032. | Offer two resolution presets: Native Frame (1376x1840) and High-Res 12MP (3024x4032). |
| 9 | EXIF Byte Order | Endianness Mismatch (Little-Endian `II` vs Big-Endian `MM`) | Reading libraries crash if byte order tag is corrupted. | Standardize EXIF encoder on Little-Endian (`II` / `0x4949`) TIFF header with verified pointer offsets. |
| 10 | AirDrop Handling | User transfers via iOS Share Sheet with default settings | iOS may transcode HDR/MOV to standard SDR MP4, stripping custom `moov.meta` atoms. | Guide user to tap "Options" at top of Share Sheet and enable "All Photos Data" or transfer directly via Mac-to-iPhone AirDrop. |

---

## 4. Deep Technical Specification: Video & QuickTime Atoms (Instagram Spin View)

### 4.1 Target Video Stream Parameters

| Property | Value | Notes |
|---|---|---|
| **Container** | QuickTime Movie (`.MOV`) | File type brand `qt  ` |
| **Video Width** | `1376` px | Exact Ray-Ban Meta video resolution |
| **Video Height** | `1840` px | 3:4 portrait orientation (~1:1.3372) |
| **Frame Rate** | `30.00` fps (or `60.00` fps) | Standard capture frame rate |
| **Video Codec** | H.264 (`avc1`) / HEVC (`hvc1`) | H.264 High Profile Level 4.2 supported by all browsers |
| **Pixel Format** | `yuv420p` (8-bit 4:2:0) | Standard chroma subsampling |
| **Color Primaries** | `9` (BT.2020) or `1` (BT.709) | Tagged in `colr` atom (`nclc` 9/18/9 or 1/1/1) |
| **Transfer Characteristics** | `18` (HLG) or `1` (BT.709) | High dynamic range or standard gamut |
| **Audio Codec** | AAC-LC (`mp4a`) | Stereo 2-channel |
| **Audio Sample Rate** | `48,000` Hz | Fixed Meta hardware rate |
| **Audio Bitrate** | `192` kbps | High fidelity stereo |
| **Movie Timescale** | `48000` | Mandatory in `mvhd` |
| **Video Timescale** | `600` | Standard video track timescale |
| **Track Count** | Exactly `2` | Track 1: Video, Track 2: Audio |

---

### 4.2 QuickTime Atom Hierarchy Tree

Instagram's media engine scans the QuickTime atom hierarchy. The required layout is structured as follows:

```
[ftyp] - File Type Box (major_brand: 'qt  ', minor_version: 512, compatible_brands: ['qt  '])
[wide] - 8-byte placeholder atom (size: 8, type: 'wide')
[mdat] - Media Data Box (contains raw H.264 NALUs and AAC frames)
[moov] - Movie Header Box
  ├── [mvhd] - Movie Header Atom (timescale: 48000, duration: calculated, matrix: unity)
  ├── [trak] - Video Track Atom (Track ID: 1)
  │     ├── [tkhd] - Track Header Atom (width: 1376.0, height: 1840.0)
  │     ├── [tapt] - Track Aperture Mode Dimensions Atom
  │     │     ├── [clef] - Clean Aperture Dimensions (width: 1376.0, height: 1840.0)
  │     │     ├── [prof] - Production Aperture Dimensions (width: 1376.0, height: 1840.0)
  │     │     └── [enof] - Encoded Pixels Dimensions (width: 1376.0, height: 1840.0)
  │     ├── [edts] - Edit Box (optional)
  │     └── [mdia] - Media Atom
  │           ├── [mdhd] - Media Header (timescale: 600, language: und)
  │           ├── [hdlr] - Handler Atom (type: 'mhlr', subtype: 'vide', name: 'Core Media Video')
  │           └── [minf] - Media Information Atom
  │                 ├── [vmhd] - Video Media Information Header
  │                 ├── [dinf] - Data Information Atom
  │                 └── [stbl] - Sample Table Atom (stsd, stts, stss, stsc, stsz, stco/co64)
  │                       └── [stsd] - Sample Description (contains 'avc1' or 'hvc1' and 'colr')
  ├── [trak] - Audio Track Atom (Track ID: 2)
  │     ├── [tkhd] - Track Header Atom (volume: 1.0)
  │     └── [mdia] - Media Atom
  │           ├── [mdhd] - Media Header (timescale: 48000)
  │           ├── [hdlr] - Handler Atom (type: 'mhlr', subtype: 'soun', name: 'Core Media Audio')
  │           └── [minf] - Media Information Atom (smhd, dinf, stbl)
  └── [meta] - QuickTime Metadata Atom (Direct child of moov; NO version/flags header)
        ├── [hdlr] - Metadata Handler Atom (subtype: 'mdta', manufacturer: 'appl', name: 'Core Media Data Handler')
        ├── [keys] - Metadata Keys Atom (key_count: 6)
        │     ├── Key 1: namespace 'mdta', key 'com.apple.quicktime.copyright'
        │     ├── Key 2: namespace 'mdta', key 'com.apple.quicktime.comment'
        │     ├── Key 3: namespace 'mdta', key 'com.apple.quicktime.model'
        │     ├── Key 4: namespace 'mdta', key 'com.apple.quicktime.creationdate'
        │     ├── Key 5: namespace 'mdta', key 'com.apple.quicktime.software'
        │     └── Key 6: namespace 'mdta', key 'com.apple.quicktime.make'
        └── [ilst] - Metadata Items List Atom
              ├── Item 1: data (type: 1 [UTF-8], value: "Meta AI")
              ├── Item 2: data (type: 1 [UTF-8], value: "app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id={RANDOM_UUID}")
              ├── Item 3: data (type: 1 [UTF-8], value: "Ray-Ban Meta Smart Glasses 2")
              ├── Item 4: data (type: 1 [UTF-8], value: "2026-09-03T06:07:00Z")
              ├── Item 5: data (type: 1 [UTF-8], value: "Meta View")
              └── Item 6: data (type: 1 [UTF-8], value: "Luxottica")
```

---

### 4.3 Binary Box Layout & Byte Definitions

#### 4.3.1 QuickTime `tapt` Atom (68 Bytes)
```
Offset  Size  Field Description                      Hex / Value
----------------------------------------------------------------------------------
0x00    4     tapt Atom Size                         0x00000044 (68 bytes)
0x04    4     tapt Atom Type                         'tapt' (0x74617074)
-- Child 1: clef (Clean Aperture) --
0x08    4     clef Atom Size                         0x00000014 (20 bytes)
0x0C    4     clef Atom Type                         'clef' (0x636C6566)
0x10    4     Version & Flags                        0x00000000
0x14    4     Width (16.16 Fixed Point)              1376 << 16 = 0x05600000
0x18    4     Height (16.16 Fixed Point)             1840 << 16 = 0x07300000
-- Child 2: prof (Production Aperture) --
0x1C    4     prof Atom Size                         0x00000014 (20 bytes)
0x20    4     prof Atom Type                         'prof' (0x70726F66)
0x24    4     Version & Flags                        0x00000000
0x28    4     Width (16.16 Fixed Point)              1376 << 16 = 0x05600000
0x2C    4     Height (16.16 Fixed Point)             1840 << 16 = 0x07300000
-- Child 3: enof (Encoded Pixels) --
0x30    4     enof Atom Size                         0x00000014 (20 bytes)
0x34    4     enof Atom Type                         'enof' (0x656E6F66)
0x38    4     Version & Flags                        0x00000000
0x3C    4     Width (16.16 Fixed Point)              1376 << 16 = 0x05600000
0x40    4     Height (16.16 Fixed Point)             1840 << 16 = 0x07300000
```

#### 4.3.2 QuickTime `moov.meta` Atom Binary Layout
Unlike MP4 ISO boxes, QuickTime `meta` is **not** a FullBox (no version/flags). Payload starts at byte offset 8.

1. **`hdlr` Atom (33 bytes)**:
   - Size: `0x00000021` (33)
   - Type: `'hdlr'`
   - Version/Flags: `0x00000000`
   - Component Type: `0x00000000` (or `'mhlr'`)
   - Component Subtype: `'mdta'`
   - Component Manufacturer: `'appl'`
   - Component Flags / Mask: `0x00000000 0x00000000`
   - Component Name: Pascal string `"\x00"` (or `"\x17Core Media Data Handler"`)

2. **`keys` Atom**:
   - Size: `4 + 4 + 4 + 4 + sum(len(key_entries))`
   - Type: `'keys'`
   - Version/Flags: `0x00000000`
   - Key Count: `0x00000006` (6 keys)
   - Key Entry Structure: `[4-byte entry_size][4-byte 'mdta'][UTF-8 key string]`

3. **`ilst` Atom**:
   - Size: `4 + 4 + sum(len(item_entries))`
   - Type: `'ilst'`
   - Item Entry Structure:
     - `[4-byte item_size]`
     - `[4-byte 1-based index]` (e.g. `0x00000001` for key 1)
     - `[data Atom]`:
       - `[4-byte data_size]` (16 + len(payload))
       - `[4-byte 'data']`
       - `[4-byte type indicator]` (`0x00000001` = UTF-8 text)
       - `[4-byte locale indicator]` (`0x00000000`)
       - `[raw UTF-8 string payload]`

---

## 5. Client-Side FFmpeg WebAssembly Conversion Pipeline

### 5.1 Architecture & Dependencies

The client-side video conversion pipeline utilizes `@ffmpeg/ffmpeg` and `@ffmpeg/util` running inside a Web Worker with SharedArrayBuffer support (or single-thread fallback):

```json
{
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.10",
    "@ffmpeg/util": "^0.12.1",
    "@ffmpeg/core": "^0.12.6"
  }
}
```

### 5.2 FFmpeg Filter Chain & Command Line

To convert any user video to Ray-Ban Meta specification:

```bash
# High-Fidelity Ray-Ban Meta Video Transcode Command
ffmpeg -i input.mp4 \
  -vf "scale=1376:1840:force_original_aspect_ratio=increase,crop=1376:1840,setsar=1" \
  -r 30 \
  -c:v libx264 \
  -profile:v high \
  -level 4.2 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -color_primaries bt2020 \
  -color_trc arib-std-b67 \
  -colorspace bt2020nc \
  -c:a aac \
  -b:a 192k \
  -ar 48000 \
  -ac 2 \
  -map_metadata -1 \
  -movflags +faststart \
  output.mov
```

### 5.3 In-Browser Binary Atom Post-Processor (TypeScript Algorithm)

After FFmpeg produces `output.mov`, the post-processor parses the ArrayBuffer to:
1. Ensure atom ordering: `ftyp` -> `wide` -> `mdat` -> `moov`.
2. Locate `moov` and patch `mvhd` timescale to `48000` and recalculate movie duration.
3. Locate video `trak` and insert the 68-byte `tapt` atom.
4. Replace or inject `moov.meta` with the authentic `mdta` keys and values.
5. Strip any extraneous tracks (preserving exactly Video Track 1 and Audio Track 2).

```typescript
/**
 * QuickTime Atom Builder for Ray-Ban Meta Spin View
 */
export function buildMetaAtom(timestamp: Date = new Date()): Uint8Array {
  const randomUUID = crypto.randomUUID().toUpperCase();
  const isoStamp = timestamp.toISOString().replace(/\.\d{3}Z$/, "Z");
  
  const fields = [
    { key: "com.apple.quicktime.copyright", value: "Meta AI" },
    { key: "com.apple.quicktime.comment", value: `app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=${randomUUID}` },
    { key: "com.apple.quicktime.model", value: "Ray-Ban Meta Smart Glasses 2" },
    { key: "com.apple.quicktime.creationdate", value: isoStamp },
    { key: "com.apple.quicktime.software", value: "Meta View" },
    { key: "com.apple.quicktime.make", value: "Luxottica" }
  ];

  // 1. Build hdlr atom
  const hdlr = buildHdlr("mdta", "appl", "Core Media Data Handler");

  // 2. Build keys atom
  let keysPayload = new Uint8Array(8); // version/flags (4) + key_count (4)
  const dvKeys = new DataView(keysPayload.buffer);
  dvKeys.setUint32(0, 0); // version/flags
  dvKeys.setUint32(4, fields.length); // count

  const keyChunks: Uint8Array[] = [keysPayload];
  for (const f of fields) {
    const keyBytes = new TextEncoder().encode(f.key);
    const entry = new Uint8Array(8 + keyBytes.length);
    const dv = new DataView(entry.buffer);
    dv.setUint32(0, 8 + keyBytes.length);
    entry.set(new TextEncoder().encode("mdta"), 4);
    entry.set(keyBytes, 8);
    keyChunks.push(entry);
  }
  const keysAtom = makeAtom("keys", concatUint8(keyChunks));

  // 3. Build ilst atom
  const itemChunks: Uint8Array[] = [];
  fields.forEach((f, idx) => {
    const valBytes = new TextEncoder().encode(f.value);
    const dataBoxPayload = new Uint8Array(8 + valBytes.length);
    const dvData = new DataView(dataBoxPayload.buffer);
    dvData.setUint32(0, 1); // type = 1 (UTF-8)
    dvData.setUint32(4, 0); // locale = 0
    dataBoxPayload.set(valBytes, 8);
    const dataAtom = makeAtom("data", dataBoxPayload);

    const itemPayload = new Uint8Array(4 + dataAtom.length);
    const dvItem = new DataView(itemPayload.buffer);
    dvItem.setUint32(0, idx + 1); // 1-based index
    itemPayload.set(dataAtom, 4);

    itemChunks.push(makeAtom(`\0\0\0${String.fromCharCode(idx + 1)}`, itemPayload, false));
  });
  const ilstAtom = makeAtom("ilst", concatUint8(itemChunks));

  return makeAtom("meta", concatUint8([hdlr, keysAtom, ilstAtom]), false);
}
```

---

## 6. Photo EXIF & TIFF Format Engine

### 6.1 Target Photo Parameters & Dimensions

Ray-Ban Meta Smart Glasses capture photos through a 12 MP ultra-wide image sensor configured to native 3:4 portrait aspect ratio:
- **Full Resolution (12MP Native)**: `3024 x 4032` pixels
- **Social / Video-Matched Resolution**: `1376 x 1840` pixels (exact 3:4 crop)
- **Container**: Baseline JPEG with APP1 EXIF segment (sRGB color space).

---

### 6.2 Complete EXIF / TIFF Metadata Directory

| IFD Directory | Tag Name | Tag ID (Hex) | Type | Exact Value | Description |
|---|---|---|---|---|---|
| **0th IFD** | Make | `0x010F` | ASCII | `"Luxottica"` | Hardware manufacturer tag |
| **0th IFD** | Model | `0x0110` | ASCII | `"Ray-Ban Meta Smart Glasses"` | Camera Model Name |
| **0th IFD** | Software | `0x0131` | ASCII | `"Meta View"` | Exporting companion software |
| **0th IFD** | Orientation | `0x0112` | Short | `1` | Normal (Top-Left) |
| **0th IFD** | XResolution | `0x011A` | Rational | `72/1` | Horizontal resolution |
| **0th IFD** | YResolution | `0x011B` | Rational | `72/1` | Vertical resolution |
| **0th IFD** | ResolutionUnit | `0x0128` | Short | `2` | Inches |
| **0th IFD** | DateTime | `0x0132` | ASCII | `"YYYY:MM:DD HH:MM:SS"` | Current capture timestamp |
| **0th IFD** | ExifOffset | `0x8769` | Long | Offset | Pointer to Exif SubIFD |
| **Exif IFD** | FNumber | `0x829D` | Rational | `22/10` | Fixed aperture `f/2.2` |
| **Exif IFD** | ExposureProgram | `0x8822` | Short | `2` | Normal Program |
| **Exif IFD** | ISOSpeedRatings | `0x8827` | Short | `100` | ISO Speed Rating (50 - 800) |
| **Exif IFD** | ExifVersion | `0x9000` | Undefined | `"0232"` | EXIF Version 2.32 |
| **Exif IFD** | DateTimeOriginal | `0x9003` | ASCII | `"YYYY:MM:DD HH:MM:SS"` | Capture timestamp |
| **Exif IFD** | DateTimeDigitized | `0x9004` | ASCII | `"YYYY:MM:DD HH:MM:SS"` | Digitization timestamp |
| **Exif IFD** | ShutterSpeedValue | `0x9201` | SRational | `690/100` | APEX value (~1/120s) |
| **Exif IFD** | ApertureValue | `0x9202` | Rational | `227/100` | APEX value (`f/2.2`) |
| **Exif IFD** | ExposureBiasValue | `0x9204` | SRational | `0/1` | 0 EV bias |
| **Exif IFD** | MeteringMode | `0x9207` | Short | `2` | CenterWeightedAverage |
| **Exif IFD** | LightSource | `0x9208` | Short | `0` | Auto / Unknown |
| **Exif IFD** | Flash | `0x9209` | Short | `0` | No Flash |
| **Exif IFD** | FocalLength | `0x920A` | Rational | `22/10` | `2.2 mm` optical focal length |
| **Exif IFD** | FocalLengthIn35mmFilm | `0xA405` | Short | `15` | `15 mm` ultra-wide field of view |
| **Exif IFD** | LensMake | `0xA433` | ASCII | `"Luxottica"` | Lens manufacturer |
| **Exif IFD** | LensModel | `0xA434` | ASCII | `"Ray-Ban Meta Smart Glasses"` | Lens model identifier |
| **Exif IFD** | ColorSpace | `0xA001` | Short | `1` | sRGB |
| **Exif IFD** | PixelXDimension | `0xA002` | Long | `3024` (or `1376`) | Pixel width |
| **Exif IFD** | PixelYDimension | `0xA003` | Long | `4032` (or `1840`) | Pixel height |
| **Exif IFD** | SceneCaptureType | `0xA302` | Short | `0` | Standard |

---

### 6.3 In-Browser EXIF Injection Implementation (piexifjs Engine)

```typescript
import piexif from "piexifjs";

export function injectRayBanExif(jpegDataUrl: string, width: number = 3024, height: number = 4032): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}:${String(now.getMonth() + 1).padStart(2, '0')}:${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const zeroth: Record<number, any> = {};
  zeroth[piexif.ImageIFD.Make] = "Luxottica";
  zeroth[piexif.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses";
  zeroth[piexif.ImageIFD.Software] = "Meta View";
  zeroth[piexif.ImageIFD.Orientation] = 1;
  zeroth[piexif.ImageIFD.XResolution] = [72, 1];
  zeroth[piexif.ImageIFD.YResolution] = [72, 1];
  zeroth[piexif.ImageIFD.ResolutionUnit] = 2;
  zeroth[piexif.ImageIFD.DateTime] = dateStr;

  const exif: Record<number, any> = {};
  exif[piexif.ExifIFD.FNumber] = [22, 10]; // f/2.2
  exif[piexif.ExifIFD.ExposureTime] = [1, 120]; // 1/120 sec
  exif[piexif.ExifIFD.ISOSpeedRatings] = 100;
  exif[piexif.ExifIFD.ExifVersion] = "0232";
  exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
  exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
  exif[piexif.ExifIFD.FocalLength] = [22, 10]; // 2.2mm
  exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = 15; // 15mm eq
  exif[piexif.ExifIFD.LensMake] = "Luxottica";
  exif[piexif.ExifIFD.LensModel] = "Ray-Ban Meta Smart Glasses";
  exif[piexif.ExifIFD.ColorSpace] = 1;
  exif[piexif.ExifIFD.PixelXDimension] = width;
  exif[piexif.ExifIFD.PixelYDimension] = height;

  // Empty GPS to ensure zero geolocation leakage
  const gps: Record<number, any> = {};

  const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, jpegDataUrl);
}
```

---

## 7. Mobile Transfer Protocols & Preservation Guide

### 7.1 Why Transcoding Breaks Spin View
Instagram's iOS and Android apps inspect the raw file on the device's local media store. If the video is transferred via standard instant messaging apps (WhatsApp, Telegram, Facebook Messenger, Discord) or synced through cloud services with preview compression (Google Drive standard export, iCloud Shared Albums), the container is transmuxed into a standard MPEG-4 stream:
1. The custom `moov.meta` atom with `mdta` keys is stripped.
2. The `tapt` (track aperture) atom is deleted.
3. Timescales are re-muxed to standard 1000/90000.
This destroys the smart glasses signature, causing Instagram to treat the video as standard mobile video and disabling the Spin View toggle.

---

### 7.2 iOS Direct Transfer Guide (AirDrop & Files)

```
+-----------------------------------------------------------------------------------------+
|                               iOS AirDrop Transfer Protocol                             |
+-----------------------------------------------------------------------------------------+

  [Step 1: Download Synthesized .MOV on Mac or PC]
     - Ensure filename ends in `.MOV` (e.g. `RayBan_Meta_Clip_001.MOV`).

  [Step 2: Mac-to-iPhone AirDrop Transfer]
     - Right click `.MOV` -> Share -> AirDrop -> Select target iPhone.
     - On iPhone prompt: Tap 'Accept'.
     - Choose 'Photos' app when prompted for destination.
     * RESULT: Raw .MOV is written directly into iOS Camera Roll (PHAsset) with zero transcoding.

  [Step 3: PC-to-iPhone (No Mac) Alternative Method]
     - Upload `.MOV` to iCloud Drive or send via Telegram as "Uncompressed File" (Document mode).
     - On iPhone: Open Files app -> Locate `.MOV` file.
     - Tap Share Sheet icon -> Tap "Save Video" (writes directly into Camera Roll).
     * CAUTION: Do NOT save from WhatsApp or Instagram Direct.

  [Step 4: Instagram Upload Verification]
     - Open Instagram -> Swipe right for Story.
     - Select the `.MOV` from Camera Roll.
     - Verify: The interactive "Spin View" orientation icon appears on the story canvas!
```

---

### 7.3 Android Direct Transfer Guide (USB MTP & Quick Share)

```
+-----------------------------------------------------------------------------------------+
|                              Android Transfer Protocol                                  |
+-----------------------------------------------------------------------------------------+

  [Step 1: Download Synthesized .MOV / .JPG on PC]
     - Keep original filename and `.MOV` container.

  [Step 2: USB MTP Direct Transfer (Recommended)]
     - Connect Android phone via USB cable (Select "File Transfer / Android Auto" mode).
     - Open Windows File Explorer: Navigate to `This PC \ [Phone Name] \ Internal Storage \ DCIM \ Camera \`.
     - Drag and drop `.MOV` / `.JPG` directly into `DCIM \ Camera \`.
     - Disconnect cable. Open Google Photos / Gallery to trigger MediaStore re-indexing.

  [Step 3: Wireless Quick Share / Nearby Share]
     - Use Windows Quick Share app -> Send to Android device.
     - Accept file -> Open Files by Google -> Move from Downloads to `DCIM/Camera`.

  [Step 4: Instagram Stories Upload]
     - Open Instagram -> Create Story -> Select file from Gallery.
     - Instagram detects QuickTime metadata and enables Spin View mode.
```

---

## 8. Automated Verification & Quality Assurance Specification

The project will include an automated test harness (`verify_converter.ts` / `verify_converter.py`) that performs programmatic validation:

### 8.1 Verification Assertions

1. **Photo EXIF Verification**:
   - `assert exif["0th"][Make] === "Luxottica"`
   - `assert exif["0th"][Model] === "Ray-Ban Meta Smart Glasses"`
   - `assert exif["0th"][Software] === "Meta View"`
   - `assert exif["Exif"][FNumber] === [22, 10]`
   - `assert exif["Exif"][FocalLength] === [22, 10]`
   - `assert exif["Exif"][FocalLengthIn35mmFilm] === 15`
   - `assert exif["GPS"] is empty (No GPS coordinates)`

2. **Video QuickTime Atom Verification**:
   - `assert ftyp.major_brand === "qt  "`
   - `assert moov.mvhd.timescale === 48000`
   - `assert video_track.tapt.clef.width === 1376 && video_track.tapt.clef.height === 1840`
   - `assert video_track.tapt.prof.width === 1376 && video_track.tapt.prof.height === 1840`
   - `assert video_track.tapt.enof.width === 1376 && video_track.tapt.enof.height === 1840`
   - `assert video_track.hdlr.name === "Core Media Video"`
   - `assert audio_track.hdlr.name === "Core Media Audio"`
   - `assert moov.meta.hdlr.subtype === "mdta"`
   - `assert moov.meta.keys contains ["com.apple.quicktime.model", "com.apple.quicktime.make", "com.apple.quicktime.software"]`
   - `assert moov.meta.ilst["com.apple.quicktime.model"] === "Ray-Ban Meta Smart Glasses 2"`
   - `assert moov.meta.ilst["com.apple.quicktime.software"] === "Meta View"`
   - `assert total_tracks === 2`

---

## 9. Conclusion & Implementation Recommendations

1. **Dual-Pipeline Separation**: Keep photo processing completely client-side in lightweight JavaScript/Canvas/piexifjs for instantaneous sub-50ms photo conversion.
2. **Video Pipeline Performance**: Load `@ffmpeg/ffmpeg` dynamically on demand. Utilize WebAssembly multi-threading when `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers are active; fallback gracefully to single-threaded WebAssembly.
3. **Container Post-Processing**: Combine FFmpeg encoding with the deterministic TypeScript atom reconstructor to guarantee strict compliance with Instagram's QuickTime Spin View detection.
