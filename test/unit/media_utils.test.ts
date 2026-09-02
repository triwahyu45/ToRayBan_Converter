import { describe, it, expect } from 'vitest';
import {
  detectMediaFormat,
  calculateCenterCrop,
  normalizeCropCoordinates,
  bufferToDataUrl,
  dataUrlToUint8Array,
} from '@/lib/media_utils';
import { extractMediaMetadata } from '@/lib/metadata_extractor';
import { injectRayBanExifBuffer } from '@/lib/exif_injector';
import { reconstructRayBanQuickTimeMov } from '@/lib/atom_synthesizer';

describe('Media Utils & Metadata Extractor', () => {
  describe('detectMediaFormat', () => {
    it('detects JPEG from magic bytes FF D8 FF', () => {
      const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMediaFormat(jpeg)).toBe('jpeg');
    });

    it('detects PNG from 8-byte signature', () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMediaFormat(png)).toBe('png');
    });

    it('detects WebP from RIFF and WEBP signature', () => {
      const webp = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectMediaFormat(webp)).toBe('webp');
    });

    it('detects GIF from GIF89a / GIF87a signature', () => {
      const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(detectMediaFormat(gif)).toBe('gif');
    });

    it('detects WebM from EBML header', () => {
      const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
      expect(detectMediaFormat(webm)).toBe('webm');
    });

    it('detects MOV / MP4 from ftyp box', () => {
      const mov = new Uint8Array([
        0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      ]);
      expect(detectMediaFormat(mov)).toBe('mov');

      const mp4 = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      expect(detectMediaFormat(mp4)).toBe('mp4');
    });

    it('returns unknown for unrecognized buffers', () => {
      const unknown = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      expect(detectMediaFormat(unknown)).toBe('unknown');
    });
  });

  describe('calculateCenterCrop & normalizeCropCoordinates', () => {
    it('calculates 1376x1840 center crop on 16:9 landscape image (1920x1080)', () => {
      const crop = calculateCenterCrop(1920, 1080, 1376, 1840);
      expect(crop.height).toBe(1080);
      // cropWidth = round(1080 * 1376 / 1840) = round(807.65) = 808 -> mod 2 even = 808
      expect(crop.width).toBe(808);
      expect(crop.x).toBe(Math.floor((1920 - 808) / 2 / 2) * 2);
      expect(crop.y).toBe(0);
      expect(crop.width % 2).toBe(0);
      expect(crop.height % 2).toBe(0);
    });

    it('calculates 1376x1840 center crop on 9:16 portrait image (1080x1920)', () => {
      const crop = calculateCenterCrop(1080, 1920, 1376, 1840);
      expect(crop.width).toBe(1080);
      // cropHeight = round(1080 * 1840 / 1376) = round(1444.18) = 1444
      expect(crop.height).toBe(1444);
      expect(crop.x).toBe(0);
      expect(crop.y).toBe(Math.floor((1920 - 1444) / 2 / 2) * 2);
    });

    it('normalizes crop coordinates to even bounds inside dimensions', () => {
      const normalized = normalizeCropCoordinates(
        { x: 5, y: 7, width: 101, height: 203 },
        500,
        500
      );
      expect(normalized.x % 2).toBe(0);
      expect(normalized.y % 2).toBe(0);
      expect(normalized.width % 2).toBe(0);
      expect(normalized.height % 2).toBe(0);
      expect(normalized.x + normalized.width).toBeLessThanOrEqual(500);
      expect(normalized.y + normalized.height).toBeLessThanOrEqual(500);
    });
  });

  describe('bufferToDataUrl & dataUrlToUint8Array', () => {
    it('roundtrips buffer to data url and back', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60]);
      const dataUrl = bufferToDataUrl(original, 'application/octet-stream');
      expect(dataUrl.startsWith('data:application/octet-stream;base64,')).toBe(true);

      const recovered = dataUrlToUint8Array(dataUrl);
      expect(recovered).toEqual(original);
    });
  });

  describe('extractMediaMetadata', () => {
    it('extracts metadata from injected JPEG', () => {
      const minimalJpeg = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xc0, 0x00, 0x11, 0x08,
        0x07, 0x30, // height 1840
        0x05, 0x60, // width 1376
        0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
        0x00, 0x00,
        0xff, 0xd9,
      ]);

      const injected = injectRayBanExifBuffer(minimalJpeg, {
        make: 'Luxottica',
        model: 'Ray-Ban Meta Smart Glasses',
        software: 'Meta View',
        iso: 100,
      });

      const meta = extractMediaMetadata(injected);
      expect(meta.format).toBe('jpeg');
      expect(meta.make).toBe('Luxottica');
      expect(meta.model).toBe('Ray-Ban Meta Smart Glasses');
      expect(meta.software).toBe('Meta View');
      expect(meta.iso).toBe(100);
      expect(meta.hasGps).toBe(false);
    });

    it('extracts metadata from reconstructed QuickTime MOV', () => {
      const mov = reconstructRayBanQuickTimeMov(new Uint8Array(0), {
        width: 1376,
        height: 1840,
        metadata: {
          make: 'Luxottica',
          model: 'Ray-Ban Meta Smart Glasses 2',
          software: 'Meta View',
        },
      });

      const meta = extractMediaMetadata(mov);
      expect(meta.format).toBe('mov');
      expect(meta.quickTime?.majorBrand).toBe('qt  ');
      expect(meta.quickTime?.movieTimescale).toBe(48000);
      expect(meta.quickTime?.hasTapt).toBe(true);
      expect(meta.quickTime?.hasSpinViewMeta).toBe(true);
      expect(meta.model).toBe('Ray-Ban Meta Smart Glasses 2');
      expect(meta.make).toBe('Luxottica');
      expect(meta.software).toBe('Meta View');
    });
  });
});
