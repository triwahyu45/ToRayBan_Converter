/**
 * Unit tests for useMediaConverter state calculations and transformations
 */

import { describe, it, expect } from 'vitest';
import { calculateCenterCrop, normalizeCropCoordinates } from '@/lib/media_utils';
import { CropConfig } from '@/types/converter';

describe('useMediaConverter Math & Coordinate Systems', () => {
  describe('calculateCenterCrop', () => {
    it('calculates 1376x1840 center crop on 16:9 landscape (1920x1080)', () => {
      const crop = calculateCenterCrop(1920, 1080, 1376, 1840);
      expect(crop.height).toBe(1080);
      expect(crop.width).toBe(808); // (1080 * 1376) / 1840 = 807.65 -> 808
      expect(crop.x).toBe(556); // (1920 - 808) / 2 = 556
      expect(crop.y).toBe(0);

      // Verify even numbers
      expect(crop.x % 2).toBe(0);
      expect(crop.y % 2).toBe(0);
      expect(crop.width % 2).toBe(0);
      expect(crop.height % 2).toBe(0);
    });

    it('calculates 1376x1840 center crop on 9:16 vertical (1080x1920)', () => {
      const crop = calculateCenterCrop(1080, 1920, 1376, 1840);
      expect(crop.width).toBe(1080);
      expect(crop.height).toBe(1444); // (1080 * 1840) / 1376 = 1444.18 -> 1444
      expect(crop.x).toBe(0);
      expect(crop.y).toBe(238); // (1920 - 1444) / 2 = 238

      expect(crop.x % 2).toBe(0);
      expect(crop.y % 2).toBe(0);
      expect(crop.width % 2).toBe(0);
      expect(crop.height % 2).toBe(0);
    });

    it('calculates 1376x1840 center crop on 1:1 square (1080x1080)', () => {
      const crop = calculateCenterCrop(1080, 1080, 1376, 1840);
      expect(crop.height).toBe(1080);
      expect(crop.width).toBe(808);
      expect(crop.x).toBe(136); // (1080 - 808) / 2 = 136
      expect(crop.y).toBe(0);
    });
  });

  describe('normalizeCropCoordinates', () => {
    it('clamps negative crop coordinates to 0 and rounds to even numbers', () => {
      const raw = { x: -15, y: -9, width: 501, height: 703 };
      const normalized = normalizeCropCoordinates(raw, 1000, 1000);
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.width % 2).toBe(0);
      expect(normalized.height % 2).toBe(0);
    });

    it('clamps boundaries exceeding image dimensions', () => {
      const raw = { x: 900, y: 900, width: 200, height: 200 };
      const normalized = normalizeCropCoordinates(raw, 1000, 1000);
      expect(normalized.x + normalized.width).toBeLessThanOrEqual(1000);
      expect(normalized.y + normalized.height).toBeLessThanOrEqual(1000);
    });
  });
});
