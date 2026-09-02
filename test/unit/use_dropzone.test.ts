/**
 * Unit tests for Dropzone media utilities, sniffer and telemetry
 */

import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatDuration,
  getAspectRatioLabel,
  sniffMediaFile,
  calculateCenterCrop,
  normalizeCropCoordinates,
  detectMediaFormat,
} from '@/lib/media_utils';

describe('Media Utilities & Dropzone Sniffer', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('formats Kilobytes, Megabytes, and Gigabytes accurately', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576 * 2.5)).toBe('2.5 MB');
      expect(formatBytes(1073741824 * 1.8)).toBe('1.8 GB');
    });
  });

  describe('formatDuration', () => {
    it('formats undefined or negative seconds as Still Photo', () => {
      expect(formatDuration(undefined)).toBe('Still Photo');
      expect(formatDuration(-5)).toBe('Still Photo');
      expect(formatDuration(NaN)).toBe('Still Photo');
    });

    it('formats video duration in minutes and seconds', () => {
      expect(formatDuration(15.4)).toBe('0:15.4');
      expect(formatDuration(75.2)).toBe('1:15.2');
      expect(formatDuration(5.0)).toBe('0:05.0');
    });
  });

  describe('getAspectRatioLabel', () => {
    it('identifies standard aspect ratio categories', () => {
      expect(getAspectRatioLabel(1920, 1080)).toBe('16:9 Landscape');
      expect(getAspectRatioLabel(1080, 1920)).toBe('9:16 Portrait');
      expect(getAspectRatioLabel(1080, 1080)).toBe('1:1 Square');
      expect(getAspectRatioLabel(1440, 1080)).toBe('4:3 Standard');
      expect(getAspectRatioLabel(1080, 1440)).toBe('3:4 Portrait');
      expect(getAspectRatioLabel(1376, 1840)).toBe('Ray-Ban Meta (43:57.5)');
    });

    it('handles custom aspect ratios gracefully', () => {
      expect(getAspectRatioLabel(2000, 1000)).toBe('2.00:1 Landscape');
      expect(getAspectRatioLabel(1000, 2000)).toBe('1:2.00 Portrait');
      expect(getAspectRatioLabel(0, 0)).toBe('Unknown');
    });
  });

  describe('sniffMediaFile', () => {
    it('throws on empty 0-byte file', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      await expect(sniffMediaFile(emptyFile)).rejects.toThrow('File is empty (0 bytes)');
    });

    it('correctly sniffs JPEG binary', async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });
      const result = await sniffMediaFile(file);
      expect(result.format).toBe('jpeg');
      expect(result.type).toBe('image');
    });

    it('correctly sniffs PNG binary', async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const file = new File([pngBytes], 'test.png', { type: 'image/png' });
      const result = await sniffMediaFile(file);
      expect(result.format).toBe('png');
      expect(result.type).toBe('image');
    });

    it('correctly sniffs WebM binary', async () => {
      const webmBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
      const file = new File([webmBytes], 'clip.webm', { type: 'video/webm' });
      const result = await sniffMediaFile(file);
      expect(result.format).toBe('webm');
      expect(result.type).toBe('video');
    });

    it('correctly sniffs QuickTime MOV with ftyp qt  ', async () => {
      const movBytes = new Uint8Array([
        0x00, 0x00, 0x00, 0x14, // size = 20
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x71, 0x74, 0x20, 0x20, // 'qt  '
        0x00, 0x00, 0x00, 0x00,
        0x71, 0x74, 0x20, 0x20,
      ]);
      const file = new File([movBytes], 'video.mov', { type: 'video/quicktime' });
      const result = await sniffMediaFile(file);
      expect(result.format).toBe('mov');
      expect(result.type).toBe('video');
    });

    it('rejects unsupported unknown formats', async () => {
      const badBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
      const file = new File([badBytes], 'document.pdf', { type: 'application/pdf' });
      await expect(sniffMediaFile(file)).rejects.toThrow('Unsupported or unreadable file format');
    });
  });
});
