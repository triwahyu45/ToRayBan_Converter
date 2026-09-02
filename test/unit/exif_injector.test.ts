import { describe, it, expect } from 'vitest';
import {
  injectRayBanExif,
  injectRayBanExifBuffer,
  extractExif,
  buildRayBanTiffPayload,
  formatExifDate,
} from '@/lib/exif_injector';

describe('EXIF Injector Engine', () => {
  // Minimal synthetic JPEG buffer: SOI + SOF0 + SOS + EOI
  const createMinimalJpeg = (width: number = 1376, height: number = 1840): Uint8Array => {
    const header = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0 length 17, precision 8
      (height >> 8) & 0xff, height & 0xff,
      (width >> 8) & 0xff, width & 0xff,
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, // SOS
      0x00, 0x01, 0x02, 0x03, // dummy image scan data
      0xff, 0xd9, // EOI
    ]);
    return header;
  };

  it('throws error when buffer does not start with SOI (0xFFD8)', () => {
    const invalidBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => injectRayBanExifBuffer(invalidBuffer)).toThrow('Missing SOI marker');
  });

  it('formats Date according to EXIF YYYY:MM:DD HH:MM:SS format', () => {
    const d = new Date('2026-09-03T12:30:45Z');
    const formatted = formatExifDate(d);
    expect(formatted).toMatch(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('builds a valid Little-Endian APP1 TIFF payload', () => {
    const payload = buildRayBanTiffPayload({
      make: 'Luxottica',
      model: 'Ray-Ban Meta Smart Glasses',
      software: 'Meta View',
    });

    expect(payload[0]).toBe(0xff);
    expect(payload[1]).toBe(0xe1); // APP1
    // Check "Exif\0\0"
    expect(String.fromCharCode(payload[4], payload[5], payload[6], payload[7])).toBe('Exif');
    expect(payload[8]).toBe(0x00);
    expect(payload[9]).toBe(0x00);
    // TIFF header: "II", magic 42
    expect(payload[10]).toBe(0x49); // 'I'
    expect(payload[11]).toBe(0x49); // 'I'
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    expect(view.getUint16(12, true)).toBe(42);
  });

  it('injects authentic Ray-Ban Meta tags into binary JPEG buffer', () => {
    const rawJpeg = createMinimalJpeg(1376, 1840);
    const injected = injectRayBanExifBuffer(rawJpeg, {
      make: 'Luxottica',
      model: 'Ray-Ban Meta Smart Glasses',
      software: 'Meta View',
      fNumber: [22, 10],
      focalLength: [22, 10],
      focalLength35mm: 15,
      iso: 100,
    });

    // Check SOI
    expect(injected[0]).toBe(0xff);
    expect(injected[1]).toBe(0xd8);
    // Check APP1 follows immediately
    expect(injected[2]).toBe(0xff);
    expect(injected[3]).toBe(0xe1);

    const parsed = extractExif(injected);
    expect(parsed.Make).toBe('Luxottica');
    expect(parsed.Model).toBe('Ray-Ban Meta Smart Glasses');
    expect(parsed.Software).toBe('Meta View');
    expect(parsed.FNumber).toBeCloseTo(2.2, 2);
    expect(parsed.FocalLength).toBeCloseTo(2.2, 2);
    expect(parsed.FocalLengthIn35mmFilm).toBe(15);
    expect(parsed.ISOSpeedRatings).toBe(100);
    expect(parsed.PixelXDimension).toBe(1376);
    expect(parsed.PixelYDimension).toBe(1840);
    expect(parsed.LensModel).toBe('Ray-Ban Meta Smart Glasses');
  });

  it('strips existing APP1 segments and sanitizes GPS coordinates', () => {
    // Inject first time
    const initialJpeg = createMinimalJpeg(1376, 1840);
    const withExif = injectRayBanExifBuffer(initialJpeg);

    // Re-inject with new options
    const reinjected = injectRayBanExifBuffer(withExif, {
      software: 'Meta View 2.0',
      iso: 200,
    });

    const parsed = extractExif(reinjected);
    expect(parsed.Software).toBe('Meta View 2.0');
    expect(parsed.ISOSpeedRatings).toBe(200);

    // Verify GPS is empty
    expect(Object.keys(parsed.GPS).length).toBe(0);
  });

  it('handles Base64 Data URL input and returns Base64 Data URL output', () => {
    const rawJpeg = createMinimalJpeg(1376, 1840);
    let binary = '';
    for (let i = 0; i < rawJpeg.length; i++) {
      binary += String.fromCharCode(rawJpeg[i]);
    }
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(binary, 'binary').toString('base64')}`;

    const result = injectRayBanExif(dataUrl, {
      make: 'Luxottica',
      model: 'Ray-Ban Meta Smart Glasses',
    });

    expect(typeof result).toBe('string');
    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);

    const base64Data = (result as string).replace('data:image/jpeg;base64,', '');
    const outBytes = Buffer.from(base64Data, 'base64');
    const parsed = extractExif(new Uint8Array(outBytes));

    expect(parsed.Make).toBe('Luxottica');
    expect(parsed.Model).toBe('Ray-Ban Meta Smart Glasses');
  });
});
