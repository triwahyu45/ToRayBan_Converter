# ToRayBan_Converter — Milestone 2: Dropzone Uploader & Format Validation Blueprint

**Author**: Teamwork Preview Explorer (Agent 2 - `explorer_m2_2`)  
**Target Milestone**: Milestone 2 — UI Layout, Uploader & Format Validation  
**Status**: Authoritative Architectural & Implementation Blueprint  
**Dependencies**: `src/lib/media_utils.ts`, `src/lib/metadata_extractor.ts`, `src/lib/exif_injector.ts`, `src/lib/atom_synthesizer.ts`  

---

## 1. Executive Summary & Objective

The **Dropzone Uploader & Format Validation** system serves as the primary media intake gateway for **ToRayBan_Converter**. It accepts user-provided photos (JPG, PNG, WebP) and videos (MP4, MOV, WebM), validates their structural integrity via binary magic byte sniffing, extracts high-fidelity spatial/temporal telemetry (dimensions, aspect ratio, frame duration, file size, codec/container atoms), generates responsive thumbnail previews, and stages the media for framing, cropping (to 1376×1840), and Ray-Ban Meta synthesis.

### Core Capabilities Covered
1. **Multi-Channel Media Ingestion**: Drag-and-drop onto dropzone or window viewport, system file picker dialog, and global clipboard paste listener (`Ctrl+V` / `Cmd+V`) for images and videos.
2. **Binary Magic Byte Sniffing (`detectMediaFormat` / `sniffMediaType`)**: Inspects initial byte signatures to prevent file extension spoofing and reliably detect MP4, QuickTime MOV, WebM, JPEG, PNG, and WebP.
3. **Automated Telemetry & Thumbnail Extraction**: Asynchronously measures natural dimensions, calculates original aspect ratio vs. Ray-Ban target ($1376:1840 \approx 0.7478$), extracts video duration/frames, captures a crisp middle-frame video thumbnail using HTML5 Canvas, and extracts preliminary EXIF / QuickTime atom metadata.
4. **Cyberpunk Glassmorphic Staging HUD (`FileCard.tsx`)**: High-contrast, dark-mode preview card displaying thumbnails, telemetry badges, codec information, and one-click "Replace" or "Remove" actions.
5. **Robust Error Boundaries & Resilient Recovery**: Catches corrupted headers, zero-byte empty files, unsupported formats, and WebAssembly memory limits gracefully with explanatory user-facing diagnosis.

---

## 2. System Architecture & Data Ingestion Flow

```
                                  [ User Media Ingestion ]
                                              │
              ┌───────────────────────────────┼──────────────────────────────┐
              ▼                               ▼                              ▼
      [ Drag-and-Drop ]              [ System File Picker ]          [ Global Paste (Ctrl+V) ]
     (onDragOver, onDrop)         (<input type="file" accept>)      (window.addEventListener)
              │                               │                              │
              └───────────────────────────────┼──────────────────────────────┘
                                              │
                                              ▼
                             [ File Validation & Sniffing ]
                        ┌─────────────────────────────────────────┐
                        │ 1. Zero-byte check (file.size === 0)    │
                        │ 2. Max size check (500MB video / 50MB)  │
                        │ 3. Read first 64KB slice                │
                        │ 4. Magic byte sniffing (detectFormat)   │
                        └─────────────────────────────────────────┘
                                       │            │
                    [ Supported Format ]            [ Unsupported / Corrupt ]
                             │                              │
                             ▼                              ▼
             [ Telemetry & Thumbnail Pipeline ]     [ Error Banner / Toast ]
            ┌──────────────────────────────────┐    (Neon Rose HUD Alert)
     Image  │ • HTMLImageElement (natural WxH) │
   ────────►│ • extractMediaMetadata (EXIF)    │
            │ • Object URL Thumbnail           │
            ├──────────────────────────────────┤
     Video  │ • Offscreen <video> element      │
   ────────►│ • Read videoWidth/Height/Duration│
            │ • Canvas 2D Seeked Frame Capture │
            │ • extractMediaMetadata (Atoms)   │
            └──────────────────────────────────┘
                             │
                             ▼
                 [ StagedMedia State Object ]
            ┌──────────────────────────────────┐
            │ - id, file, name, sizeBytes      │
            │ - width, height, aspectRatio     │
            │ - durationSeconds, format, type  │
            │ - previewUrl, thumbnailUrl       │
            │ - detectedMetadata (EXIF/Atoms)  │
            └──────────────────────────────────┘
                             │
                             ▼
              [ Render <FileCard /> Staging HUD ]
           (Ready for Pan/Zoom Crop & Framing Viewport)
```

---

## 3. Format Support & Magic Byte Sniffing Specification

### 3.1 Magic Byte Signature Matrix

| Format | File Extensions | MIME Types | Magic Byte Signature | Offset & Header Structure |
|---|---|---|---|---|
| **JPEG** | `.jpg`, `.jpeg`, `.jfif` | `image/jpeg` | `FF D8 FF` | Byte `0..2`: SOI marker followed by `FFE0` (JFIF) or `FFE1` (EXIF). |
| **PNG** | `.png` | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | Byte `0..7`: 8-byte standard PNG signature (`\x89PNG\r\n\x1a\n`). |
| **WebP** | `.webp` | `image/webp` | `RIFF....WEBP` | Bytes `0..3` = `RIFF` (`52 49 46 46`), Bytes `8..11` = `WEBP` (`57 45 42 50`). |
| **QuickTime MOV** | `.mov`, `.qt` | `video/quicktime` | `ftypqt  ` or `moov`/`mdat` | Byte `4..7` = `ftyp`, Bytes `8..11` = `qt  `, or top-level atom `moov`/`mdat`/`wide`. |
| **MP4** | `.mp4`, `.m4v` | `video/mp4` | `ftypisom` / `ftypmp42` | Byte `4..7` = `ftyp`, Major brand in `isom`, `iso2`, `mp41`, `mp42`, `avc1`. |
| **WebM** | `.webm` | `video/webm` | `1A 45 DF A3` | Bytes `0..3` = EBML Header (`1A 45 DF A3`) followed by DocType `webm`. |

### 3.2 High-Performance Sniffing Strategy
To avoid loading entire multi-hundred megabyte video files into RAM during drag-and-drop:
1. Extract a memory-safe **64 KB slice**: `const chunk = await file.slice(0, 65536).arrayBuffer();`
2. Pass `new Uint8Array(chunk)` to `detectMediaFormat(buffer)`.
3. If sniffing returns `'unknown'` or an unsupported format (e.g. `.exe`, `.pdf`, `.zip`, `.mp3`), throw a typed `ValidationError` with remediation instructions.

### 3.3 Validation & Error Decision Matrix

```
┌───────────────────────────┬─────────────────────────────────┬──────────────────────────────────────────┐
│ Condition                 │ Root Cause                      │ User Remediation Message                 │
├───────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
│ File size == 0 bytes      │ Empty / zero-byte binary        │ "File is empty (0 bytes). Select valid." │
│ File size > 500 MB        │ Browser memory limits           │ "Video exceeds 500MB max limit."         │
│ File size > 50 MB (Image) │ Image payload too large         │ "Image exceeds 50MB max limit."          │
│ Spoofed Extension         │ e.g. .mp4 file containing text  │ "File signature does not match format."  │
│ Corrupted Header          │ Malformed JPEG/MOV atom headers │ "Corrupted media header. Cannot decode." │
│ Audio-only Container      │ MP4/MOV without video track     │ "No video stream found in media file."   │
│ WebAssembly Memory Warn   │ 4K 60fps Video > 250MB          │ "Large video: downscaling recommended."  │
└───────────────────────────┴─────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 4. Global Clipboard Paste Architecture (`Ctrl+V` / `Cmd+V`)

### 4.1 Event Handling Architecture
1. **Window-Level Listener**: Attach a passive listener on `window` (`window.addEventListener('paste', handleGlobalPaste)`).
2. **Context Guard**:
   - Check `document.activeElement`. If the user is currently typing in an `<input>`, `<textarea>`, or content-editable field, do **not** intercept text clipboard events.
   - If the clipboard payload contains actual file binary items (`event.clipboardData.items` or `event.clipboardData.files`), intercept and call `event.preventDefault()`.
3. **Payload Extraction**:
   - Traverse `event.clipboardData.items`:
     - Look for items where `item.kind === 'file'`.
     - Support direct screenshot captures (e.g., Windows `Win+Shift+S`, macOS `Cmd+Shift+4`, or copied image from web) which provide `image/png` or `image/jpeg` blobs.
   - Convert `item.getAsFile()` to a standard `File` instance with a human-readable synthesized filename (`pasted-media-${Date.now()}.${ext}`).
4. **Immediate Ingestion**:
   - Invoke `processFile(pastedFile)` through `useDropzone`.
   - Dispatch toast notification: *"Clipboard media loaded successfully!"*.

---

## 5. Metadata & Thumbnail Extraction Pipeline

### 5.1 Image Processing Flow
```typescript
async function extractImageTelemetry(file: File): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  previewUrl: string;
  thumbnailUrl: string;
  metadata: ExtractedMetadata;
}>
```
1. Create blob URL via `URL.createObjectURL(file)`.
2. Construct `new Image()` and await `img.onload`.
3. Capture `img.naturalWidth` and `img.naturalHeight`.
4. Read first 128KB of image buffer and run `extractMediaMetadata(buffer)` to obtain camera make, model, EXIF tags, and GPS presence.
5. Store blob URL as `previewUrl` and `thumbnailUrl`.

### 5.2 Video Processing & Canvas Thumbnail Flow
```typescript
async function extractVideoTelemetry(file: File): Promise<{
  width: number;
  height: number;
  durationSeconds: number;
  aspectRatio: number;
  previewUrl: string;
  thumbnailUrl: string;
  metadata: ExtractedMetadata;
}>
```
1. Create blob URL via `URL.createObjectURL(file)`.
2. Construct offscreen `<video preload="metadata" muted playsInline />`.
3. Await `loadedmetadata` event: extract `video.videoWidth`, `video.videoHeight`, and `video.duration`.
4. Seek video to snapshot frame: `video.currentTime = Math.min(0.5, video.duration / 2)`.
5. On `seeked` event:
   - Create offscreen `<canvas width="320" height="auto" />` preserving aspect ratio.
   - Draw current frame: `ctx.drawImage(video, 0, 0, canvas.width, canvas.height)`.
   - Export thumbnail: `const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85)`.
6. Read first 256KB of video buffer and run `extractMediaMetadata(buffer)` to inspect QuickTime atoms (`ftyp`, `moov`, `mvhd`, `tapt`).
7. Return complete video telemetry.

### 5.3 Memory Leak Prevention & Lifecycle
- Every `URL.createObjectURL` is registered in an internal tracker ref (`objectUrlsRef`).
- When a new file is uploaded, the staged file is cleared, or the component unmounts, all active Object URLs are immediately revoked via `URL.revokeObjectURL(url)`.

---

## 6. Concrete Implementation Blueprints

### 6.1 Type Definitions (`src/types/converter.ts` & `src/types/metadata.ts`)

```typescript
// Path: src/types/converter.ts

import { ExtractedMetadata, MediaFormat } from './metadata';

export type MediaKind = 'image' | 'video';

export interface StagedMediaFile {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  type: MediaKind;
  format: MediaFormat;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  aspectRatioLabel: string; // e.g. "16:9 Landscape", "9:16 Portrait", "1:1 Square"
  durationSeconds?: number;
  formattedDuration?: string; // e.g. "00:15.4" or "Still Photo"
  previewUrl: string;
  thumbnailUrl: string;
  detectedMetadata?: ExtractedMetadata;
  createdAt: number;
}

export interface DropzoneState {
  isDraggingOver: boolean;
  isValidating: boolean;
  validationProgress: number; // 0 - 100
  validationStatusText: string;
  validationError: string | null;
  stagedMedia: StagedMediaFile | null;
}

export interface UseDropzoneOptions {
  maxVideoSizeBytes?: number; // Default 500MB (524,288,000 bytes)
  maxImageSizeBytes?: number; // Default 50MB (52,428,800 bytes)
  maxVideoDurationSec?: number; // Default 180 seconds
  onFileAccepted?: (staged: StagedMediaFile) => void;
  onFileRejected?: (errorMessage: string) => void;
  autoRevokeUrls?: boolean;
}
```

---

### 6.2 Extended Media Utilities (`src/lib/media_utils.ts`)

```typescript
// Path: src/lib/media_utils.ts additions

/**
 * Formats byte size into human readable string (e.g. 24.5 MB, 820 KB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats duration in seconds into MM:SS.S format.
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds) || seconds < 0) return 'Still Photo';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  const formattedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
  return `${mins}:${formattedSecs}`;
}

/**
 * Returns a human-friendly aspect ratio label.
 */
export function getAspectRatioLabel(width: number, height: number): string {
  if (width <= 0 || height <= 0) return 'Unknown';
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 Landscape';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 Portrait';
  if (Math.abs(ratio - 1.0) < 0.05) return '1:1 Square';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3 Standard';
  if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4 Portrait';
  if (Math.abs(ratio - 1376 / 1840) < 0.03) return 'Ray-Ban Meta (43:57.5)';
  return ratio > 1 ? `${ratio.toFixed(2)}:1 Landscape` : `1:${(1 / ratio).toFixed(2)} Portrait`;
}

/**
 * Asynchronously sniffs file format and validates media integrity.
 */
export async function sniffMediaFile(file: File): Promise<{
  format: MediaFormat;
  type: 'image' | 'video' | 'unsupported';
  mimeType: string;
  headerBuffer: Uint8Array;
}> {
  if (!file || file.size === 0) {
    throw new Error('File is empty (0 bytes). Please upload a valid media file.');
  }

  // Read first 64KB
  const sliceBlob = file.slice(0, 65536);
  const arrayBuffer = await sliceBlob.arrayBuffer();
  const headerBuffer = new Uint8Array(arrayBuffer);
  const format = detectMediaFormat(headerBuffer);

  if (format === 'unknown') {
    throw new Error(
      `Unsupported or unreadable file format (${file.name}). Please upload MP4, MOV, WebM, JPG, PNG, or WebP.`
    );
  }

  const isImage = ['jpeg', 'png', 'webp', 'gif'].includes(format);
  const isVideo = ['mp4', 'mov', 'webm'].includes(format);

  return {
    format,
    type: isImage ? 'image' : isVideo ? 'video' : 'unsupported',
    mimeType: file.type || `media/${format}`,
    headerBuffer,
  };
}

/**
 * Extracts dimensions and thumbnail for an image file.
 */
export async function extractImageDetails(file: File): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  previewUrl: string;
  thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || 1376;
      const height = img.naturalHeight || 1840;
      const aspectRatio = width / height;
      resolve({
        width,
        height,
        aspectRatio,
        previewUrl: objectUrl,
        thumbnailUrl: objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image data. The file may be corrupted.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Extracts dimensions, duration, and captures a mid-frame video thumbnail via Canvas.
 */
export async function extractVideoDetails(file: File): Promise<{
  width: number;
  height: number;
  durationSeconds: number;
  aspectRatio: number;
  previewUrl: string;
  thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let hasHandledLoaded = false;

    const timeout = setTimeout(() => {
      if (!hasHandledLoaded) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Video header loading timed out. The file may have an unsupported codec.'));
      }
    }, 8000);

    video.onloadedmetadata = () => {
      hasHandledLoaded = true;
      clearTimeout(timeout);

      const width = video.videoWidth;
      const height = video.videoHeight;
      const durationSeconds = video.duration || 0;

      if (width === 0 || height === 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Media contains no valid video stream.'));
        return;
      }

      const aspectRatio = width / height;

      // Seek to capture thumbnail
      video.currentTime = Math.min(0.5, Math.max(0.1, durationSeconds / 2));
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumbW = 320;
        const scale = Math.min(1, maxThumbW / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            durationSeconds: video.duration,
            aspectRatio: video.videoWidth / video.videoHeight,
            previewUrl: objectUrl,
            thumbnailUrl,
          });
          return;
        }
      } catch {
        // Fallback to video element preview if canvas draw fails (e.g. cross-origin)
      }

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: video.duration,
        aspectRatio: video.videoWidth / video.videoHeight,
        previewUrl: objectUrl,
        thumbnailUrl: objectUrl,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Browser failed to decode video stream. Ensure format is H.264, VP9, or AV1.'));
    };

    video.src = objectUrl;
  });
}
```

---

### 6.3 Dropzone Custom Hook (`src/hooks/useDropzone.ts`)

```typescript
// Path: src/hooks/useDropzone.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { StagedMediaFile, UseDropzoneOptions } from '@/types/converter';
import {
  sniffMediaFile,
  extractImageDetails,
  extractVideoDetails,
  formatBytes,
  formatDuration,
  getAspectRatioLabel,
} from '@/lib/media_utils';
import { extractMediaMetadata } from '@/lib/metadata_extractor';

const DEFAULT_MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50 MB
const DEFAULT_MAX_VIDEO_DURATION = 180;          // 180 seconds

export function useDropzone(options: UseDropzoneOptions = {}) {
  const {
    maxVideoSizeBytes = DEFAULT_MAX_VIDEO_SIZE,
    maxImageSizeBytes = DEFAULT_MAX_IMAGE_SIZE,
    maxVideoDurationSec = DEFAULT_MAX_VIDEO_DURATION,
    onFileAccepted,
    onFileRejected,
  } = options;

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationStatusText, setValidationStatusText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [stagedMedia, setStagedMedia] = useState<StagedMediaFile | null>(null);

  // Drag counter ref to handle nested element enter/leave smoothly
  const dragCounterRef = useRef(0);
  const activeUrlsRef = useRef<Set<string>>(new Set());

  // Revoke allocated Object URLs on unmount or replace
  const cleanupUrls = useCallback(() => {
    activeUrlsRef.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    activeUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, [cleanupUrls]);

  /**
   * Main asynchronous pipeline to validate and stage a File
   */
  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;

      setValidationError(null);
      setIsValidating(true);
      setValidationProgress(15);
      setValidationStatusText('Sniffing media magic bytes...');

      try {
        // Step 1: Sniff format and validate basic limits
        const sniffResult = await sniffMediaFile(file);
        setValidationProgress(40);

        if (sniffResult.type === 'image' && file.size > maxImageSizeBytes) {
          throw new Error(
            `Image size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxImageSizeBytes)}.`
          );
        }

        if (sniffResult.type === 'video' && file.size > maxVideoSizeBytes) {
          throw new Error(
            `Video size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxVideoSizeBytes)}.`
          );
        }

        setValidationStatusText(`Extracting ${sniffResult.type} metadata & telemetry...`);
        setValidationProgress(65);

        // Step 2: Extract spatial dimensions and thumbnail
        let width = 1376;
        let height = 1840;
        let aspectRatio = 1376 / 1840;
        let durationSeconds: number | undefined;
        let previewUrl = '';
        let thumbnailUrl = '';

        if (sniffResult.type === 'image') {
          const imgDetails = await extractImageDetails(file);
          width = imgDetails.width;
          height = imgDetails.height;
          aspectRatio = imgDetails.aspectRatio;
          previewUrl = imgDetails.previewUrl;
          thumbnailUrl = imgDetails.thumbnailUrl;
          activeUrlsRef.current.add(previewUrl);
        } else if (sniffResult.type === 'video') {
          const vidDetails = await extractVideoDetails(file);
          width = vidDetails.width;
          height = vidDetails.height;
          durationSeconds = vidDetails.durationSeconds;
          aspectRatio = vidDetails.aspectRatio;
          previewUrl = vidDetails.previewUrl;
          thumbnailUrl = vidDetails.thumbnailUrl;
          activeUrlsRef.current.add(previewUrl);

          if (durationSeconds > maxVideoDurationSec) {
            throw new Error(
              `Video duration (${formatDuration(durationSeconds)}) exceeds recommended limit of ${maxVideoDurationSec}s for Ray-Ban Spin View.`
            );
          }
        }

        setValidationProgress(85);
        setValidationStatusText('Reading existing EXIF / QuickTime atom trees...');

        // Step 3: Extract container metadata
        const metadata = extractMediaMetadata(sniffResult.headerBuffer);

        // Step 4: Assemble StagedMediaFile
        const staged: StagedMediaFile = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          file,
          name: file.name,
          sizeBytes: file.size,
          formattedSize: formatBytes(file.size),
          type: sniffResult.type === 'video' ? 'video' : 'image',
          format: sniffResult.format,
          mimeType: sniffResult.mimeType,
          width,
          height,
          aspectRatio,
          aspectRatioLabel: getAspectRatioLabel(width, height),
          durationSeconds,
          formattedDuration: formatDuration(durationSeconds),
          previewUrl,
          thumbnailUrl,
          detectedMetadata: metadata,
          createdAt: Date.now(),
        };

        setValidationProgress(100);
        setValidationStatusText('Media staged successfully!');
        setStagedMedia(staged);
        onFileAccepted?.(staged);
      } catch (err: any) {
        const message = err?.message || 'An unknown error occurred while processing the file.';
        setValidationError(message);
        onFileRejected?.(message);
      } finally {
        setIsValidating(false);
      }
    },
    [maxImageSizeBytes, maxVideoSizeBytes, maxVideoDurationSec, onFileAccepted, onFileRejected]
  );

  /**
   * Drag Event Handlers
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOver(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    },
    [processFile]
  );

  /**
   * File Picker Handler
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        processFile(file);
      }
      // Reset input value to allow selecting same file again
      e.target.value = '';
    },
    [processFile]
  );

  /**
   * Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
   */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInput && !e.clipboardData?.files?.length) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              const ext = blob.type.includes('png')
                ? 'png'
                : blob.type.includes('jpeg')
                ? 'jpg'
                : blob.type.includes('mp4')
                ? 'mp4'
                : 'bin';
              const file = new File([blob], `clipboard-${Date.now()}.${ext}`, {
                type: blob.type,
              });
              processFile(file);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processFile]);

  /**
   * Reset staged media
   */
  const clearStagedMedia = useCallback(() => {
    cleanupUrls();
    setStagedMedia(null);
    setValidationError(null);
    setValidationProgress(0);
    setValidationStatusText('');
  }, [cleanupUrls]);

  return {
    isDraggingOver,
    isValidating,
    validationProgress,
    validationStatusText,
    validationError,
    stagedMedia,
    processFile,
    clearStagedMedia,
    setValidationError,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    handleFileInputChange,
  };
}
```

---

### 6.4 Dropzone UI Component (`src/components/uploader/Dropzone.tsx`)

```tsx
// Path: src/components/uploader/Dropzone.tsx

'use client';

import React, { useRef } from 'react';
import { UploadCloud, Sparkles, AlertTriangle, Layers, Film, Image as ImageIcon, X } from 'lucide-react';
import { StagedMediaFile } from '@/types/converter';
import { useDropzone } from '@/hooks/useDropzone';
import { FileCard } from './FileCard';

interface DropzoneProps {
  stagedMedia: StagedMediaFile | null;
  onMediaStaged: (media: StagedMediaFile) => void;
  onMediaCleared: () => void;
}

const SUPPORTED_FORMAT_BADGES = [
  { label: 'MP4', type: 'video', color: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10' },
  { label: 'MOV', type: 'video', color: 'border-neon-violet/40 text-neon-violet bg-neon-violet/10' },
  { label: 'WEBM', type: 'video', color: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10' },
  { label: 'JPG', type: 'image', color: 'border-neon-emerald/40 text-neon-emerald bg-neon-emerald/10' },
  { label: 'PNG', type: 'image', color: 'border-neon-emerald/40 text-neon-emerald bg-neon-emerald/10' },
  { label: 'WEBP', type: 'image', color: 'border-neon-amber/40 text-neon-amber bg-neon-amber/10' },
];

export function Dropzone({ stagedMedia: externalStaged, onMediaStaged, onMediaCleared }: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isDraggingOver,
    isValidating,
    validationProgress,
    validationStatusText,
    validationError,
    stagedMedia,
    clearStagedMedia,
    setValidationError,
    dragProps,
    handleFileInputChange,
  } = useDropzone({
    onFileAccepted: (staged) => {
      onMediaStaged(staged);
    },
    onFileRejected: () => {
      // rejection handled via validationError state
    },
  });

  const activeMedia = externalStaged || stagedMedia;

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    clearStagedMedia();
    onMediaCleared();
  };

  if (activeMedia) {
    return (
      <FileCard
        stagedMedia={activeMedia}
        onReplace={handleBrowseClick}
        onClear={handleClear}
      />
    );
  }

  return (
    <div className="w-full relative">
      {/* Hidden native file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        id="torayban-file-input"
        data-testid="file-picker-input"
      />

      {/* Main Interactive Dropzone Box */}
      <div
        {...dragProps}
        onClick={handleBrowseClick}
        className={`
          relative overflow-hidden cursor-pointer rounded-2xl p-8 sm:p-10
          transition-all duration-300 ease-out flex flex-col items-center justify-center text-center
          glass-panel border-2 border-dashed
          ${
            isDraggingOver
              ? 'border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan scale-[1.01]'
              : 'border-cyan-500/25 hover:border-neon-cyan/60 hover:bg-cyber-slate/50'
          }
        `}
      >
        {/* Futuristic Corner HUD Reticles */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-neon-cyan/60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-neon-cyan/60 pointer-events-none" />

        {/* Laser Sweep Scanline Animation during Validation */}
        {isValidating && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse" />
          </div>
        )}

        {/* Central Icon Reticle */}
        <div className="relative mb-5">
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${
                isDraggingOver
                  ? 'bg-neon-cyan text-cyber-black shadow-glow-cyan scale-110'
                  : 'bg-cyber-slate/80 text-neon-cyan border border-neon-cyan/30 shadow-glass-card'
              }
            `}
          >
            {isDraggingOver ? (
              <Sparkles className="w-8 h-8 animate-bounce" />
            ) : (
              <UploadCloud className="w-8 h-8 group-hover:scale-110 transition-transform" />
            )}
          </div>
        </div>

        {/* Title & Call to Action */}
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2">
          {isDraggingOver ? (
            <span className="text-neon-cyan font-mono uppercase tracking-wider">
              [ Release to Synthesize Ray-Ban Media ]
            </span>
          ) : (
            <>
              Drop Media Here, <span className="text-neon-cyan underline decoration-neon-cyan/40">Browse</span>, or Paste
            </>
          )}
        </h3>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Supports video &amp; photo formats. Media is automatically framed to Ray-Ban Meta native{' '}
          <span className="text-neon-cyan font-mono font-medium">1376&times;1840</span>.
        </p>

        {/* Format Badge Chips */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
          {SUPPORTED_FORMAT_BADGES.map((badge) => (
            <span
              key={badge.label}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-md border ${badge.color}`}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Keyboard Paste Shortcut Tooltip */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]">
            Ctrl + V
          </kbd>
          <span>/</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]">
            Cmd + V
          </kbd>
          <span className="text-slate-400">Direct Clipboard Paste</span>
        </div>

        {/* Validation Progress HUD */}
        {isValidating && (
          <div className="w-full max-w-sm mt-6 p-4 rounded-xl bg-black/60 border border-neon-cyan/30 text-left">
            <div className="flex justify-between items-center text-xs font-mono text-neon-cyan mb-2">
              <span>{validationStatusText}</span>
              <span>{validationProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-neon-cyan to-neon-emerald h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${validationProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div className="mt-4 p-4 rounded-xl bg-neon-rose/10 border border-neon-rose/40 text-neon-rose text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-neon-rose/5 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-neon-rose" />
          <div className="flex-1">
            <h4 className="font-bold font-mono uppercase tracking-wide mb-0.5">Media Validation Error</h4>
            <p className="text-rose-200/90 text-xs">{validationError}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setValidationError(null);
            }}
            className="text-rose-400 hover:text-white p-1 transition-colors"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 6.5 Staged File HUD Card (`src/components/uploader/FileCard.tsx`)

```tsx
// Path: src/components/uploader/FileCard.tsx

'use client';

import React from 'react';
import { Film, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { StagedMediaFile } from '@/types/converter';

interface FileCardProps {
  stagedMedia: StagedMediaFile;
  onReplace: () => void;
  onClear: () => void;
}

export function FileCard({ stagedMedia, onReplace, onClear }: FileCardProps) {
  const isVideo = stagedMedia.type === 'video';
  const hasGps = stagedMedia.detectedMetadata?.hasGps;

  return (
    <div className="w-full glass-panel rounded-2xl p-5 sm:p-6 border border-neon-cyan/30 shadow-glass-card relative overflow-hidden">
      {/* Reticle HUD Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-cyan" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-cyan" />

      {/* Header Status Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
            {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neon-cyan">
                {stagedMedia.format.toUpperCase()} {isVideo ? 'VIDEO' : 'PHOTO'} STAGED
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md" title={stagedMedia.name}>
              {stagedMedia.name}
            </h4>
          </div>
        </div>

        {/* Action Controls: Replace & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReplace}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 bg-cyber-slate/90 hover:bg-slate-800 hover:text-neon-cyan border border-slate-700/60 transition-colors flex items-center gap-1.5"
            title="Replace with another file"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Replace</span>
          </button>
          <button
            onClick={onClear}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-neon-rose hover:bg-neon-rose/10 border border-transparent hover:border-neon-rose/30 transition-colors"
            title="Remove media"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Layout: Thumbnail Preview & Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left Column: Media Thumbnail Preview with Aspect Guide */}
        <div className="sm:col-span-4 flex justify-center">
          <div className="relative rounded-xl overflow-hidden bg-black/80 border border-cyan-500/20 shadow-inner group max-h-48 aspect-[3/4] flex items-center justify-center">
            {isVideo ? (
              <img
                src={stagedMedia.thumbnailUrl}
                alt="Video Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={stagedMedia.previewUrl}
                alt="Image Preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay Target Crop Framing Guides */}
            <div className="absolute inset-0 border border-neon-cyan/40 pointer-events-none" />
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-neon-cyan border border-neon-cyan/30">
              {stagedMedia.width}&times;{stagedMedia.height}
            </div>
          </div>
        </div>

        {/* Right Column: Cyberpunk Telemetry Stat Cards */}
        <div className="sm:col-span-8 grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Original Resolution</span>
            <span className="text-slate-200 font-semibold">{stagedMedia.width} &times; {stagedMedia.height} px</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-neon-cyan/20">
            <span className="text-neon-cyan/80 block text-[10px] uppercase">Target Resolution</span>
            <span className="text-neon-cyan font-bold">1376 &times; 1840 (Ray-Ban)</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Aspect Ratio</span>
            <span className="text-slate-200">{stagedMedia.aspectRatioLabel}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">
              {isVideo ? 'Duration / FPS' : 'Media Payload'}
            </span>
            <span className="text-slate-200">
              {isVideo ? stagedMedia.formattedDuration : 'Still Photo'} &bull; {stagedMedia.formattedSize}
            </span>
          </div>

          {/* Privacy & Camera Source Detection Bar */}
          <div className="col-span-2 p-2 rounded-lg bg-cyber-slate/50 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-neon-violet" />
              Source: {stagedMedia.detectedMetadata?.make || stagedMedia.detectedMetadata?.model || 'Generic / Standard Camera'}
            </span>
            {hasGps ? (
              <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                <ShieldAlert className="w-3 h-3" /> GPS Detected (Will Strip)
              </span>
            ) : (
              <span className="text-neon-emerald flex items-center gap-1 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Clean EXIF
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 6.6 Uploader Error Boundary (`src/components/uploader/UploaderErrorBoundary.tsx`)

```tsx
// Path: src/components/uploader/UploaderErrorBoundary.tsx

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class UploaderErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[UploaderErrorBoundary] Unhandled uploader exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full glass-panel p-6 rounded-2xl border border-neon-rose/40 bg-neon-rose/5 text-center shadow-glow-rose/20">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neon-rose/10 border border-neon-rose/30 flex items-center justify-center text-neon-rose">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold font-mono text-white mb-1">
            UPLOADER ENGINE FAULT
          </h3>
          <p className="text-xs text-rose-200/80 mb-4 max-w-md mx-auto">
            {this.state.error?.message || this.props.fallbackMessage || 'An unexpected error occurred during media staging.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-neon-rose/20 text-neon-rose border border-neon-rose/50 hover:bg-neon-rose hover:text-white transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Uploader &amp; Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 7. Cyberpunk UI Styling Tokens & Visual States

### 7.1 Tailwind Class Composition Recipes
- **Dropzone Idle Box**: `glass-panel rounded-2xl border-2 border-dashed border-cyan-500/25 hover:border-neon-cyan/60 hover:bg-cyber-slate/50 transition-all duration-300 p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer`
- **Dropzone Drag Active**: `border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan scale-[1.01]`
- **Staged FileCard**: `glass-panel rounded-2xl p-5 sm:p-6 border border-neon-cyan/30 shadow-glass-card relative overflow-hidden`
- **Format Tag Badge**: `px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-md border`
- **HUD Reticle Corners**: `absolute w-2.5 h-2.5 border-neon-cyan pointer-events-none`

---

## 8. Comprehensive Unit & Integration Test Plan

### 8.1 Unit Tests for `useDropzone` & Sniffer (`test/unit/use_dropzone.test.ts`)
1. **Magic Byte Accuracy**:
   - `detectMediaFormat` correctly identifies JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`RIFF/WEBP`), WebM (`1A 45 DF A3`), MOV (`ftypqt  `), and MP4 (`ftypisom`).
2. **Rejection of Malformed / Empty Payloads**:
   - Throws clear error on 0-byte input (`sample_zero_byte.bin`).
   - Throws error on truncated/malformed headers (`sample_corrupt_header.jpg`).
   - Rejects files exceeding 500MB (video) or 50MB (image).
3. **Clipboard Paste Processing**:
   - Verifies simulated `paste` event extracts image File and executes stage pipeline.
4. **Thumbnail Generation Lifecycle**:
   - Verifies canvas drawImage occurs on seeked event and returns data URL.
   - Verifies `URL.revokeObjectURL` is invoked on reset/unmount to prevent memory leaks.
5. **Telemetry Calculation Accuracy**:
   - Correctly derives `aspectRatioLabel` for 16:9, 9:16, 1:1, 4:3, and custom formats.
   - Formats file size into KB / MB accurately.

---

## 9. Conclusion & Delivery Check

This blueprint provides the complete, production-ready implementation plan for Milestone 2 Dropzone Uploader & Format Validation. All components, hooks, sniffer algorithms, error boundaries, and unit tests are fully architected in compliance with project standards.
