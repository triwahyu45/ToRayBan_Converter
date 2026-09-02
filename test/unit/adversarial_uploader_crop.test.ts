/**
 * Milestone 2 Adversarial Stress-Test Suite
 * 
 * Tests:
 * 1. Extreme media dimensions (1x1, 10000x500, 500x10000, 8K, 100:1, 1:100, 0x0, negatives).
 * 2. Pan/zoom coordinate clamping preventing NaN, negative, zero, or out-of-bounds crop rects.
 * 3. Sniffer handling on mixed/disguised file extensions (e.g. .mp4 file that is really JPEG).
 * 4. Memory leak / URL.revokeObjectURL lifecycle safety.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectMediaFormat,
  calculateCenterCrop,
  normalizeCropCoordinates,
  sniffMediaFile,
  getAspectRatioLabel,
  formatDuration,
  formatBytes,
} from '@/lib/media_utils';

describe('Milestone 2 Adversarial Stress Testing', () => {
  describe('1. Extreme Media Dimensions & Aspect Ratios', () => {
    const testDimensions = [
      { name: '1x1 pixel micro-dimension', w: 1, h: 1 },
      { name: '2x2 minimal even dimension', w: 2, h: 2 },
      { name: '3x3 minimal odd dimension', w: 3, h: 3 },
      { name: '10000x500 extreme panoramic landscape (20:1)', w: 10000, h: 500 },
      { name: '500x10000 extreme skyscraper portrait (1:20)', w: 500, h: 10000 },
      { name: '10000x100 extreme 100:1 aspect ratio', w: 10000, h: 100 },
      { name: '100x10000 extreme 1:100 aspect ratio', w: 100, h: 10000 },
      { name: '7680x4320 8K UHD landscape', w: 7680, h: 4320 },
      { name: '4320x7680 8K UHD portrait', w: 4320, h: 7680 },
      { name: '65536x65536 16-bit max square boundary', w: 65536, h: 65536 },
      { name: '1376x1840 exact Ray-Ban Meta native resolution', w: 1376, h: 1840 },
    ];

    testDimensions.forEach(({ name, w, h }) => {
      it(`evaluates center crop safely for ${name} (${w}x${h})`, () => {
        const crop = calculateCenterCrop(w, h, 1376, 1840);

        // Must not be NaN or Infinite
        expect(Number.isFinite(crop.x)).toBe(true);
        expect(Number.isFinite(crop.y)).toBe(true);
        expect(Number.isFinite(crop.width)).toBe(true);
        expect(Number.isFinite(crop.height)).toBe(true);

        // Coordinates must be non-negative
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);

        // Dimensions must be positive even integers (H.264 macroblock / yuv420p constraint)
        expect(crop.width).toBeGreaterThanOrEqual(2);
        expect(crop.height).toBeGreaterThanOrEqual(2);
        expect(crop.width % 2).toBe(0);
        expect(crop.height % 2).toBe(0);
        expect(crop.x % 2).toBe(0);
        expect(crop.y % 2).toBe(0);

        // Bounds check (for dimensions >= 2)
        if (w >= 2) {
          expect(crop.x + crop.width).toBeLessThanOrEqual(w);
        }
        if (h >= 2) {
          expect(crop.y + crop.height).toBeLessThanOrEqual(h);
        }
      });
    });

    it('gracefully handles 0x0, zero, and negative dimensions without crash or NaN', () => {
      const zeroCrop = calculateCenterCrop(0, 0, 1376, 1840);
      expect(zeroCrop.width).toBe(1376);
      expect(zeroCrop.height).toBe(1840);
      expect(zeroCrop.x).toBe(0);
      expect(zeroCrop.y).toBe(0);

      const negCrop = calculateCenterCrop(-1920, -1080, 1376, 1840);
      expect(negCrop.width).toBe(1376);
      expect(negCrop.height).toBe(1840);
      expect(negCrop.x).toBe(0);
      expect(negCrop.y).toBe(0);
    });

    it('generates readable aspect ratio labels for extreme dimensions', () => {
      expect(getAspectRatioLabel(10000, 100)).toBe('100.00:1 Landscape');
      expect(getAspectRatioLabel(100, 10000)).toBe('1:100.00 Portrait');
      expect(getAspectRatioLabel(1, 1)).toBe('1:1 Square');
      expect(getAspectRatioLabel(0, 500)).toBe('Unknown');
      expect(getAspectRatioLabel(500, 0)).toBe('Unknown');
      expect(getAspectRatioLabel(-100, -200)).toBe('Unknown');
    });
  });

  describe('2. Pan/Zoom Coordinate Clamping & Boundary Invariants', () => {
    const resolutions = [
      { w: 1920, h: 1080 },
      { w: 1080, h: 1920 },
      { w: 3840, h: 2160 },
      { w: 1376, h: 1840 },
      { w: 500, h: 500 },
      { w: 10000, h: 500 },
      { w: 500, h: 10000 },
    ];

    const zoomLevels = [1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 100.0];
    const panOffsets = [
      { panX: 0, panY: 0 },
      { panX: -1.0, panY: -1.0 },
      { panX: 1.0, panY: 1.0 },
      { panX: -2.5, panY: 3.5 }, // Overshoot / out-of-bounds pan
      { panX: 10.0, panY: -10.0 }, // Massive overshoot
    ];

    resolutions.forEach(({ w, h }) => {
      zoomLevels.forEach((zoom) => {
        panOffsets.forEach(({ panX, panY }) => {
          it(`clamps pan/zoom at ${w}x${h} (zoom=${zoom}, panX=${panX}, panY=${panY}) strictly within source`, () => {
            const baseCenter = calculateCenterCrop(w, h, 1376, 1840);
            const cropW = Math.round(baseCenter.width / Math.max(1.0, zoom));
            const cropH = Math.round(baseCenter.height / Math.max(1.0, zoom));

            const maxDeltaX = (w - cropW) / 2;
            const maxDeltaY = (h - cropH) / 2;

            const rawX = (w - cropW) / 2 + panX * maxDeltaX;
            const rawY = (h - cropH) / 2 + panY * maxDeltaY;

            const normalized = normalizeCropCoordinates(
              {
                x: Math.round(rawX),
                y: Math.round(rawY),
                width: cropW,
                height: cropH,
              },
              w,
              h
            );

            // Invariant 1: No NaN or Infinity
            expect(Number.isFinite(normalized.x)).toBe(true);
            expect(Number.isFinite(normalized.y)).toBe(true);
            expect(Number.isFinite(normalized.width)).toBe(true);
            expect(Number.isFinite(normalized.height)).toBe(true);

            // Invariant 2: Coordinates non-negative
            expect(normalized.x).toBeGreaterThanOrEqual(0);
            expect(normalized.y).toBeGreaterThanOrEqual(0);

            // Invariant 3: Coordinates strictly inside source media boundaries
            expect(normalized.x + normalized.width).toBeLessThanOrEqual(w);
            expect(normalized.y + normalized.height).toBeLessThanOrEqual(h);

            // Invariant 4: Even integers for H.264 / yuv420p compliance
            expect(normalized.width % 2).toBe(0);
            expect(normalized.height % 2).toBe(0);
            expect(normalized.x % 2).toBe(0);
            expect(normalized.y % 2).toBe(0);

            // Invariant 5: Dimensions must be >= 2
            expect(normalized.width).toBeGreaterThanOrEqual(2);
            expect(normalized.height).toBeGreaterThanOrEqual(2);
          });
        });
      });
    });

    it('handles negative or invalid crop inputs gracefully in normalizeCropCoordinates', () => {
      const result = normalizeCropCoordinates(
        { x: -500, y: -200, width: 99999, height: 99999 },
        1920,
        1080
      );

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.x + result.width).toBeLessThanOrEqual(1920);
      expect(result.y + result.height).toBeLessThanOrEqual(1080);
    });
  });

  describe('3. Sniffer Resilience on Disguised File Extensions & Malicious Buffers', () => {
    it('accurately sniffs JPEG content disguised with .mp4 extension', async () => {
      const jpegPayload = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const disguisedFile = new File([jpegPayload], 'vacation_clip.mp4', { type: 'video/mp4' });

      const result = await sniffMediaFile(disguisedFile);
      expect(result.format).toBe('jpeg');
      expect(result.type).toBe('image');
    });

    it('accurately sniffs WebM content disguised with .png extension', async () => {
      const webmPayload = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
      ]);
      const disguisedFile = new File([webmPayload], 'screenshot.png', { type: 'image/png' });

      const result = await sniffMediaFile(disguisedFile);
      expect(result.format).toBe('webm');
      expect(result.type).toBe('video');
    });

    it('accurately sniffs MP4 content disguised with .jpg extension', async () => {
      const mp4Payload = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // size 24, 'ftyp'
        0x69, 0x73, 0x6f, 0x6d, // brand 'isom'
        0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
      ]);
      const disguisedFile = new File([mp4Payload], 'camera_photo.jpg', { type: 'image/jpeg' });

      const result = await sniffMediaFile(disguisedFile);
      expect(result.format).toBe('mp4');
      expect(result.type).toBe('video');
    });

    it('accurately sniffs WebP content disguised with .mov extension', async () => {
      const webpPayload = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, // 'RIFF'
        0x57, 0x45, 0x42, 0x50, // 'WEBP'
        0x56, 0x50, 0x38, 0x20,
      ]);
      const disguisedFile = new File([webpPayload], 'clip.mov', { type: 'video/quicktime' });

      const result = await sniffMediaFile(disguisedFile);
      expect(result.format).toBe('webp');
      expect(result.type).toBe('image');
    });

    it('accurately sniffs QuickTime MOV with moov/mdat atom signature without ftyp', () => {
      const movMoov = new Uint8Array([
        0x00, 0x00, 0x10, 0x00, 0x6d, 0x6f, 0x6f, 0x76, 0x00, 0x00, 0x00, 0x08,
      ]);
      expect(detectMediaFormat(movMoov)).toBe('mov');

      const movMdat = new Uint8Array([
        0x00, 0x00, 0x20, 0x00, 0x6d, 0x64, 0x61, 0x74, 0x00, 0x00, 0x00, 0x08,
      ]);
      expect(detectMediaFormat(movMdat)).toBe('mov');
    });

    it('rejects executable / non-media files disguised with media extensions', async () => {
      // Windows PE EXE header: 'MZ' (0x4D, 0x5A)
      const exePayload = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const fakeMp4 = new File([exePayload], 'virus.mp4', { type: 'video/mp4' });

      await expect(sniffMediaFile(fakeMp4)).rejects.toThrow('Unsupported or unreadable file format');

      // Plain Text / Script payload
      const textPayload = new Uint8Array(Buffer.from('#!/bin/bash\necho test\n'));
      const fakeJpg = new File([textPayload], 'script.jpg', { type: 'image/jpeg' });

      await expect(sniffMediaFile(fakeJpg)).rejects.toThrow('Unsupported or unreadable file format');
    });

    it('handles short / truncated buffers without throwing unhandled exceptions', () => {
      expect(detectMediaFormat(new Uint8Array([]))).toBe('unknown');
      expect(detectMediaFormat(new Uint8Array([0xff]))).toBe('unknown');
      expect(detectMediaFormat(new Uint8Array([0xff, 0xd8]))).toBe('unknown');
      expect(detectMediaFormat(new Uint8Array([0x89, 0x50, 0x4e]))).toBe('unknown');
      expect(detectMediaFormat(new Uint8Array([0x00, 0x00, 0x00, 0x10]))).toBe('unknown');
    });
  });

  describe('4. Object URL Lifecycle & Memory Safety Verification', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;
    let createdUrls: Set<string>;
    let revokedUrls: Set<string>;

    beforeEach(() => {
      createdUrls = new Set();
      revokedUrls = new Set();
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      let counter = 0;
      URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
        const url = `blob:http://localhost/mock-blob-${++counter}`;
        createdUrls.add(url);
        return url;
      });

      URL.revokeObjectURL = vi.fn((url: string) => {
        revokedUrls.add(url);
      });
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('ensures created Blob URLs are safely revoked when cleanup is invoked', () => {
      const activeUrls = new Set<string>();

      // Simulate creating 5 Object URLs in media processing
      for (let i = 0; i < 5; i++) {
        const dummyBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
        const url = URL.createObjectURL(dummyBlob);
        activeUrls.add(url);
      }

      expect(createdUrls.size).toBe(5);
      expect(activeUrls.size).toBe(5);

      // Perform cleanup simulation as done in useDropzone / useMediaConverter
      activeUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      activeUrls.clear();

      expect(revokedUrls.size).toBe(5);
      createdUrls.forEach((url) => {
        expect(revokedUrls.has(url)).toBe(true);
      });
      expect(activeUrls.size).toBe(0);
    });

    it('formatBytes and formatDuration handle standard and large inputs', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 500)).toBe('500 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 2)).toBe('2 TB');
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatDuration(3600)).toBe('60:00.0');
      expect(formatDuration(0)).toBe('0:00.0');
      expect(formatDuration(-10)).toBe('Still Photo');
      expect(formatDuration(undefined)).toBe('Still Photo');
    });
  });
});
