/**
 * Media Utilities for ToRayBan_Converter
 * Magic byte sniffing, aspect ratio math, buffer/dataURL conversions, and media probing.
 */

import { MediaFormat } from '@/types/metadata';
import { CropCoordinates } from '@/types/converter';

/**
 * Detects media format from magic bytes in the initial buffer chunk.
 */
export function detectMediaFormat(buffer: Uint8Array): MediaFormat {
  if (!buffer || buffer.length < 4) {
    return 'unknown';
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  // 4. GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif';
  }

  // 5. WebM: EBML header 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'webm';
  }

  // 6. MP4 / MOV: Check for 'ftyp' or top-level atom signature
  if (buffer.length >= 12) {
    const boxType = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    if (boxType === 'ftyp') {
      const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
      if (brand === 'qt  ' || brand === 'moov') {
        return 'mov';
      }
      return 'mp4';
    }
    if (boxType === 'moov' || boxType === 'mdat' || boxType === 'wide' || boxType === 'free') {
      return 'mov';
    }
  }

  return 'unknown';
}

/**
 * Converts a Blob or File to a Uint8Array.
 */
export async function fileToUint8Array(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch {
      // Fallback to FileReader if arrayBuffer call fails in jsdom
    }
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        resolve(new Uint8Array());
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob data'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts a Uint8Array to a Base64 Data URL.
 * Works in both browser and Node/Vitest environments.
 */
export function bufferToDataUrl(buffer: Uint8Array, mimeType: string): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }

  const base64 =
    typeof window !== 'undefined' && typeof window.btoa === 'function'
      ? window.btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Converts a Base64 Data URL to a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;

  const binaryStr =
    typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(base64Str)
      : Buffer.from(base64Str, 'base64').toString('binary');

  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Calculates optimal center-crop bounding box targeting 1376x1840 aspect ratio.
 */
export function calculateCenterCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number = 1376,
  targetHeight: number = 1840
): CropCoordinates {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { x: 0, y: 0, width: targetWidth, height: targetHeight };
  }

  const arIn = sourceWidth / sourceHeight;
  const arTarget = targetWidth / targetHeight;

  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;

  if (arIn > arTarget) {
    // Source is wider than target aspect ratio -> fit height, crop width
    cropHeight = sourceHeight;
    cropWidth = Math.round((sourceHeight * targetWidth) / targetHeight);
    cropX = Math.round((sourceWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    // Source is taller than target aspect ratio -> fit width, crop height
    cropWidth = sourceWidth;
    cropHeight = Math.round((sourceWidth * targetHeight) / targetWidth);
    cropX = 0;
    cropY = Math.round((sourceHeight - cropHeight) / 2);
  }

  return normalizeCropCoordinates(
    { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
    sourceWidth,
    sourceHeight
  );
}

/**
 * Normalizes crop coordinates to even integers (mod 2 == 0) and clamps inside source boundary.
 */
export function normalizeCropCoordinates(
  crop: CropCoordinates,
  sourceWidth: number,
  sourceHeight: number
): CropCoordinates {
  let x = Math.max(0, Math.min(crop.x, sourceWidth - 2));
  let y = Math.max(0, Math.min(crop.y, sourceHeight - 2));
  let width = Math.min(crop.width, sourceWidth - x);
  let height = Math.min(crop.height, sourceHeight - y);

  // Force even numbers (H.264 macroblock / yuv420p requirement)
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;
  x = Math.floor(x / 2) * 2;
  y = Math.floor(y / 2) * 2;

  width = Math.max(width, 2);
  height = Math.max(height, 2);

  return { x, y, width, height };
}

/**
 * Formats byte size into human readable string (e.g. 24.5 MB, 820 KB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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
  if (Math.abs(ratio - 1376 / 1840) < 0.001 || (width === 1376 && height === 1840)) {
    return 'Ray-Ban Meta (43:57.5)';
  }
  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9 Landscape';
  if (Math.abs(ratio - 9 / 16) < 0.02) return '9:16 Portrait';
  if (Math.abs(ratio - 1.0) < 0.02) return '1:1 Square';
  if (Math.abs(ratio - 4 / 3) < 0.02) return '4:3 Standard';
  if (Math.abs(ratio - 3 / 4) < 0.02) return '3:4 Portrait';
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

  let headerBuffer: Uint8Array;
  try {
    const sliceBlob = typeof file.slice === 'function' ? file.slice(0, 65536) : file;
    headerBuffer = await fileToUint8Array(sliceBlob);
  } catch {
    headerBuffer = await fileToUint8Array(file);
  }

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
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      objectUrl = '';
    }

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
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
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
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      objectUrl = '';
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let hasHandledLoaded = false;

    const timeout = setTimeout(() => {
      if (!hasHandledLoaded) {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        }
        reject(new Error('Video header loading timed out. The file may have an unsupported codec.'));
      }
    }, 8000);

    video.onloadedmetadata = () => {
      hasHandledLoaded = true;
      clearTimeout(timeout);

      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const durationSeconds = video.duration || 0;

      if (width === 0 || height === 0) {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        }
        reject(new Error('Media contains no valid video stream.'));
        return;
      }

      // Seek to capture thumbnail
      video.currentTime = Math.min(0.5, Math.max(0.1, durationSeconds / 2));
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumbW = 320;
        const scale = Math.min(1, maxThumbW / (video.videoWidth || 320));
        canvas.width = Math.round((video.videoWidth || 320) * scale);
        canvas.height = Math.round((video.videoHeight || 180) * scale);

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
        // Fallback to previewUrl if canvas extraction is not supported in env
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
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
      reject(new Error('Browser failed to decode video stream. Ensure format is H.264, VP9, or AV1.'));
    };

    video.src = objectUrl;
  });
}
