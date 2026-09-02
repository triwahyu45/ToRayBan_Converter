import { describe, it, expect } from 'vitest';
import {
  injectRayBanExif,
  injectRayBanExifBuffer,
  extractExif,
  buildRayBanTiffPayload,
  formatExifDate,
} from '@/lib/exif_injector';
import { extractMediaMetadata } from '@/lib/metadata_extractor';
import { bufferToDataUrl } from '@/lib/media_utils';

describe('EXIF Injector Adversarial & Stress Test Suite', () => {
  // Helper to create a minimal valid JPEG
  const createMinimalJpeg = (width: number = 1376, height: number = 1840): Uint8Array => {
    return new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0
      (height >> 8) & 0xff, height & 0xff,
      (width >> 8) & 0xff, width & 0xff,
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, // SOS
      0x12, 0x34, 0x56, 0x78, // image stream
      0xff, 0xd9, // EOI
    ]);
  };

  // Helper to create a synthetic APP segment: marker (2 bytes) + length (2 bytes BE) + payload
  const createSegment = (markerHigh: number, markerLow: number, payload: Uint8Array): Uint8Array => {
    const segLen = payload.length + 2;
    const seg = new Uint8Array(4 + payload.length);
    seg[0] = markerHigh;
    seg[1] = markerLow;
    seg[2] = (segLen >> 8) & 0xff;
    seg[3] = segLen & 0xff;
    seg.set(payload, 4);
    return seg;
  };

  // =========================================================================
  // 1. Bloated EXIF and Multiple APP Segments (APP0, APP1, APP2, APP13, APP14, APP15)
  // =========================================================================
  describe('1. Bloated EXIF & Multi-APP Segments', () => {
    it('handles JPEG with multiple APP segments (APP0, APP1, APP2, APP13, APP14) and strips old APP1/APP2/APP13 while preserving APP0/APP14', () => {
      const app0 = createSegment(0xff, 0xe0, new Uint8Array([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00])); // JFIF
      const oldApp1 = createSegment(0xff, 0xe1, new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44])); // Old EXIF
      const oldApp2 = createSegment(0xff, 0xe2, new Uint8Array([0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45])); // ICC
      const oldApp13 = createSegment(0xff, 0xed, new Uint8Array([0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20])); // Photoshop IPTC
      const app14 = createSegment(0xff, 0xee, new Uint8Array([0x41, 0x64, 0x6f, 0x62, 0x65, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00])); // Adobe

      const sof0 = new Uint8Array([
        0xff, 0xc0, 0x00, 0x11, 0x08,
        0x07, 0x30, 0x05, 0x60, // 1840 x 1376
        0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      ]);
      const sosAndData = new Uint8Array([
        0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
        0xaa, 0xbb, 0xcc, 0xdd,
        0xff, 0xd9,
      ]);

      const totalLen = 2 + app0.length + oldApp1.length + oldApp2.length + oldApp13.length + app14.length + sof0.length + sosAndData.length;
      const complexJpeg = new Uint8Array(totalLen);
      let p = 0;
      complexJpeg[p++] = 0xff; complexJpeg[p++] = 0xd8;
      complexJpeg.set(app0, p); p += app0.length;
      complexJpeg.set(oldApp1, p); p += oldApp1.length;
      complexJpeg.set(oldApp2, p); p += oldApp2.length;
      complexJpeg.set(oldApp13, p); p += oldApp13.length;
      complexJpeg.set(app14, p); p += app14.length;
      complexJpeg.set(sof0, p); p += sof0.length;
      complexJpeg.set(sosAndData, p); p += sosAndData.length;

      const injected = injectRayBanExifBuffer(complexJpeg, {
        make: 'Luxottica',
        model: 'Ray-Ban Meta Smart Glasses',
      });

      // Verify structure: SOI followed by new synthetic APP1
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);

      // Verify old APP1, APP2, APP13 are gone, but APP0, APP14 and SOF0 are preserved
      let offset = 2;
      const markersFound: number[] = [];
      while (offset < injected.length - 1) {
        if (injected[offset] !== 0xff) { offset++; continue; }
        const m = (injected[offset] << 8) | injected[offset + 1];
        markersFound.push(m);
        if (m === 0xffd9 || m === 0xffda) break;
        if (offset + 4 > injected.length) break;
        const sLen = (injected[offset + 2] << 8) | injected[offset + 3];
        offset += 2 + sLen;
      }

      expect(markersFound).toContain(0xffe1); // synthetic APP1
      expect(markersFound).toContain(0xffe0); // preserved APP0
      expect(markersFound).toContain(0xffee); // preserved APP14
      expect(markersFound).toContain(0xffc0); // preserved SOF0
      expect(markersFound).not.toContain(0xffe2); // stripped APP2
      expect(markersFound).not.toContain(0xffed); // stripped APP13

      // Verify metadata tags in new buffer
      const meta = extractExif(injected);
      expect(meta.Make).toBe('Luxottica');
      expect(meta.Model).toBe('Ray-Ban Meta Smart Glasses');
      expect(Object.keys(meta.GPS).length).toBe(0);
    });

    it('handles giant/bloated existing APP1 payload (60KB) without buffer overrun or crash', () => {
      const hugePayload = new Uint8Array(60000);
      hugePayload.fill(0x55);
      const hugeApp1 = createSegment(0xff, 0xe1, hugePayload);

      const minimal = createMinimalJpeg();
      const bloatedJpeg = new Uint8Array(2 + hugeApp1.length + (minimal.length - 2));
      bloatedJpeg[0] = 0xff; bloatedJpeg[1] = 0xd8;
      bloatedJpeg.set(hugeApp1, 2);
      bloatedJpeg.set(minimal.subarray(2), 2 + hugeApp1.length);

      expect(bloatedJpeg.length).toBeGreaterThan(60000);

      const injected = injectRayBanExifBuffer(bloatedJpeg);
      expect(injected.length).toBeLessThan(5000);

      const meta = extractExif(injected);
      expect(meta.Make).toBe('Luxottica');
      expect(meta.Model).toBe('Ray-Ban Meta Smart Glasses');
    });
  });

  // =========================================================================
  // 2. Corrupt Markers, Truncated Streams, 0-byte Images, and Boundary Cases
  // =========================================================================
  describe('2. Corrupt Markers, Truncated Streams & Boundary Cases', () => {
    it('rejects 0-byte buffer with explicit Error', () => {
      expect(() => injectRayBanExifBuffer(new Uint8Array(0))).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('rejects 1-byte buffer [0xFF] with explicit Error', () => {
      expect(() => injectRayBanExifBuffer(new Uint8Array([0xff]))).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('rejects 2-byte invalid buffer [0x00, 0x00] with explicit Error', () => {
      expect(() => injectRayBanExifBuffer(new Uint8Array([0x00, 0x00]))).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('handles minimal 2-byte JPEG [0xFF, 0xD8] safely by synthesizing SOI + APP1 + EOI', () => {
      const minimal2Byte = new Uint8Array([0xff, 0xd8]);
      const injected = injectRayBanExifBuffer(minimal2Byte);
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);
      expect(injected[injected.length - 2]).toBe(0xff);
      expect(injected[injected.length - 1]).toBe(0xd9);

      const meta = extractExif(injected);
      expect(meta.Make).toBe('Luxottica');
    });

    it('handles minimal 4-byte JPEG [0xFF, 0xD8, 0xFF, 0xD9] safely', () => {
      const minimal4Byte = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
      const injected = injectRayBanExifBuffer(minimal4Byte);
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);

      const meta = extractExif(injected);
      expect(meta.Make).toBe('Luxottica');
    });

    it('handles truncated stream (SOI + incomplete segment header) without infinite loop or throw', () => {
      const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x05]);
      const injected = injectRayBanExifBuffer(truncated);
      expect(injected.length).toBeGreaterThan(0);
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);
    });

    it('handles stream with oversized declared segment length (segLen > buffer size)', () => {
      const corruptLenJpeg = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xe0, 0xea, 0x60, // segLen = 60000
        0x01, 0x02, 0x03, 0x04,
        0xff, 0xd9,
      ]);
      const injected = injectRayBanExifBuffer(corruptLenJpeg);
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);
    });

    it('handles stream with standalone restart markers (0xFFD0..0xFFD7, 0xFF00, 0xFF01)', () => {
      const rstJpeg = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xd0, // RST0
        0xff, 0xd1, // RST1
        0xff, 0x00, // Byte stuffing
        0xff, 0x01, // TEM
        0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
        0x11, 0x22,
        0xff, 0xd9,
      ]);
      const injected = injectRayBanExifBuffer(rstJpeg);
      expect(injected[0]).toBe(0xff);
      expect(injected[1]).toBe(0xd8);
      expect(injected[2]).toBe(0xff);
      expect(injected[3]).toBe(0xe1);
    });

    it('extractExif gracefully handles empty, corrupt, truncated, or garbage buffers without crashing', () => {
      expect(extractExif(new Uint8Array(0))).toEqual({ '0th': {}, Exif: {}, GPS: {} });
      expect(extractExif(new Uint8Array([0x00, 0x01, 0x02]))).toEqual({ '0th': {}, Exif: {}, GPS: {} });
      expect(extractExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toEqual({ '0th': {}, Exif: {}, GPS: {} });
      
      const badTiffApp1 = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xe1, 0x00, 0x16, // len 22
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
        0x49, 0x49, 0x99, 0x99, // 'II', bad magic 0x9999 (not 42)
        0x08, 0x00, 0x00, 0x00,
        0xff, 0xd9,
      ]);
      const res = extractExif(badTiffApp1);
      expect(res.Make).toBeUndefined();
      expect(res['0th']).toEqual({});
    });
  });

  // =========================================================================
  // 3. Non-JPEG Images and Malformed Data URLs
  // =========================================================================
  describe('3. Non-JPEG Images & Malformed Data URLs', () => {
    it('throws error when PNG bytes are passed to injectRayBanExifBuffer', () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(() => injectRayBanExifBuffer(pngHeader)).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('throws error when WebP bytes are passed to injectRayBanExifBuffer', () => {
      const webpHeader = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      expect(() => injectRayBanExifBuffer(webpHeader)).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('throws error when MP4/MOV bytes are passed to injectRayBanExifBuffer', () => {
      const mp4Header = new Uint8Array([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
      expect(() => injectRayBanExifBuffer(mp4Header)).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('throws error when PNG Data URL is passed to injectRayBanExif', () => {
      const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(() => injectRayBanExif(pngDataUrl)).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('throws error when malformed string or empty string is passed to injectRayBanExif', () => {
      expect(() => injectRayBanExif('')).toThrow();
      expect(() => injectRayBanExif('not_a_valid_data_url')).toThrow();
      expect(() => injectRayBanExif('data:image/jpeg;base64,AAAA')).toThrow('Missing SOI marker (0xFFD8)');
    });

    it('extractMediaMetadata returns format: "unknown" for zero-length buffer without crashing', () => {
      const res = extractMediaMetadata(new Uint8Array(0));
      expect(res.format).toBe('unknown');
      expect(res.hasGps).toBe(false);
    });
  });

  // =========================================================================
  // 4. Idempotency & Re-Injection Stress
  // =========================================================================
  describe('4. Idempotency & Re-Injection Stress', () => {
    it('produces constant size and identical single-APP1 structure after multiple injection passes with same option lengths', () => {
      const baseJpeg = createMinimalJpeg(1376, 1840);

      // Pass 1
      const pass1 = injectRayBanExifBuffer(baseJpeg, {
        software: 'Meta View 1.0',
        iso: 100,
      });

      // Pass 2
      const pass2 = injectRayBanExifBuffer(pass1, {
        software: 'Meta View 2.0',
        iso: 200,
      });

      // Pass 2 size matches Pass 1 (both have same string length and exactly 1 APP1 segment)
      expect(pass2.length).toBe(pass1.length);

      // Perform 10 consecutive injections in loop with same length software strings
      let currentBuffer = pass2;
      for (let i = 3; i <= 9; i++) {
        currentBuffer = injectRayBanExifBuffer(currentBuffer, {
          software: `Meta View ${i}.0`,
          iso: 100 * i,
        });
        expect(currentBuffer.length).toBe(pass1.length);
      }

      // Verify the 9th pass has updated tags and exactly one APP1
      const finalMeta = extractExif(currentBuffer);
      expect(finalMeta.Software).toBe('Meta View 9.0');
      expect(finalMeta.ISOSpeedRatings).toBe(900);
      expect(finalMeta.Make).toBe('Luxottica');
      expect(finalMeta.Model).toBe('Ray-Ban Meta Smart Glasses');

      // Verify only 1 APP1 marker exists in final buffer
      let app1Count = 0;
      let offset = 2;
      while (offset < currentBuffer.length - 1) {
        if (currentBuffer[offset] !== 0xff) { offset++; continue; }
        const m = (currentBuffer[offset] << 8) | currentBuffer[offset + 1];
        if (m === 0xffe1) app1Count++;
        if (m === 0xffd9 || m === 0xffda) break;
        if (offset + 4 > currentBuffer.length) break;
        const sLen = (currentBuffer[offset + 2] << 8) | currentBuffer[offset + 3];
        offset += 2 + sLen;
      }
      expect(app1Count).toBe(1);
    });

    it('DataURL roundtrip is idempotent across multiple iterations', () => {
      const baseJpeg = createMinimalJpeg(1376, 1840);
      let dataUrl = bufferToDataUrl(baseJpeg, 'image/jpeg');

      for (let i = 0; i < 5; i++) {
        const result = injectRayBanExif(dataUrl, {
          software: `Meta View Iteration ${i}`,
        });
        expect(typeof result).toBe('string');
        expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
        dataUrl = result as string;
      }

      const finalMeta = extractMediaMetadata(
        Uint8Array.from(Buffer.from(dataUrl.replace('data:image/jpeg;base64,', ''), 'base64'))
      );
      expect(finalMeta.software).toBe('Meta View Iteration 4');
      expect(finalMeta.model).toBe('Ray-Ban Meta Smart Glasses');
    });
  });

  // =========================================================================
  // 5. Byte-Level Little-Endian & Big-Endian TIFF Parsing and Tag Preservation
  // =========================================================================
  describe('5. Little-Endian & Big-Endian Byte Parsing & Tag Preservation', () => {
    it('verifies exact Little-Endian TIFF structure and byte offsets', () => {
      const payload = buildRayBanTiffPayload();

      // Marker 0xFFE1
      expect(payload[0]).toBe(0xff);
      expect(payload[1]).toBe(0xe1);

      // Total Segment Length (Big-Endian per JPEG standard)
      const segLen = (payload[2] << 8) | payload[3];
      expect(segLen).toBe(payload.length - 2);

      // "Exif\0\0" Header at payload[4..9]
      expect(payload[4]).toBe(0x45); // E
      expect(payload[5]).toBe(0x78); // x
      expect(payload[6]).toBe(0x69); // i
      expect(payload[7]).toBe(0x66); // f
      expect(payload[8]).toBe(0x00);
      expect(payload[9]).toBe(0x00);

      // TIFF Header at payload[10..17]
      // Little-Endian 'II' (0x49 0x49)
      expect(payload[10]).toBe(0x49);
      expect(payload[11]).toBe(0x49);

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      // Magic 42 (0x002A) in Little-Endian
      const magic = view.getUint16(12, true);
      expect(magic).toBe(42);

      // IFD0 Offset at byte 14 (should be 8)
      const ifd0Offset = view.getUint32(14, true);
      expect(ifd0Offset).toBe(8);

      // TIFF offset 8 corresponds to payload[10 + 8] = payload[18]
      // Number of entries in IFD0
      const ifd0Count = view.getUint16(18, true);
      expect(ifd0Count).toBe(9); // 9 entries in IFD0
    });

    it('correctly parses Big-Endian (MM) TIFF EXIF blocks from third-party cameras', () => {
      const tiffBuf = new Uint8Array(120);
      const tv = new DataView(tiffBuf.buffer);

      // Header: MM, 42, offset 8
      tiffBuf[0] = 0x4d; tiffBuf[1] = 0x4d;
      tv.setUint16(2, 42, false); // Big-Endian
      tv.setUint32(4, 8, false);

      // IFD0 at 8
      tv.setUint16(8, 3, false); // 3 entries
      // Entry 1: Make (0x010F)
      tv.setUint16(10, 0x010f, false);
      tv.setUint16(12, 2, false); // ASCII
      tv.setUint32(14, 6, false); // count 6 ("Canon\0")
      tv.setUint32(18, 50, false); // offset 50
      // Entry 2: Model (0x0110)
      tv.setUint16(22, 0x0110, false);
      tv.setUint16(24, 2, false); // ASCII
      tv.setUint32(26, 6, false); // count 6 ("EOS R\0")
      tv.setUint32(30, 56, false); // offset 56
      // Entry 3: ExifIFD (0x8769)
      tv.setUint16(34, 0x8769, false);
      tv.setUint16(36, 4, false); // LONG
      tv.setUint32(38, 1, false); // count 1
      tv.setUint32(42, 64, false); // offset 64
      // Next IFD = 0
      tv.setUint32(46, 0, false);

      // Data at 50: "Canon\0"
      const canon = [0x43, 0x61, 0x6e, 0x6f, 0x6e, 0x00];
      for (let i = 0; i < 6; i++) tiffBuf[50 + i] = canon[i];
      // Data at 56: "EOS R\0"
      const eosr = [0x45, 0x4f, 0x53, 0x20, 0x52, 0x00];
      for (let i = 0; i < 6; i++) tiffBuf[56 + i] = eosr[i];

      // ExifSubIFD at 64
      tv.setUint16(64, 2, false); // 2 entries
      // Entry 1: ISO 0x8827
      tv.setUint16(66, 0x8827, false);
      tv.setUint16(68, 3, false); // SHORT
      tv.setUint32(70, 1, false); // count 1
      tv.setUint16(74, 400, false); // ISO 400 (inline)
      // Entry 2: FocalLength35 0xA405
      tv.setUint16(78, 0xa405, false);
      tv.setUint16(80, 3, false); // SHORT
      tv.setUint32(82, 1, false); // count 1
      tv.setUint16(86, 28, false); // 28mm (inline)
      // Next IFD = 0
      tv.setUint32(90, 0, false);

      // Wrap in JPEG APP1 segment
      const app1 = createSegment(0xff, 0xe1, new Uint8Array([
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
        ...tiffBuf,
      ]));

      const minimal = createMinimalJpeg();
      const beJpeg = new Uint8Array(2 + app1.length + (minimal.length - 2));
      beJpeg[0] = 0xff; beJpeg[1] = 0xd8;
      beJpeg.set(app1, 2);
      beJpeg.set(minimal.subarray(2), 2 + app1.length);

      const parsed = extractExif(beJpeg);
      expect(parsed.Make).toBe('Canon');
      expect(parsed.Model).toBe('EOS R');
      expect(parsed.ISOSpeedRatings).toBe(400);
      expect(parsed.FocalLengthIn35mmFilm).toBe(28);
    });

    it('extractMediaMetadata accurately computes SOF0 dimensions when no EXIF dimensions exist', () => {
      const customSof0 = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xc0, 0x00, 0x11, 0x08,
        0x04, 0x38, // Height 1080 (0x0438)
        0x07, 0x80, // Width 1920 (0x0780)
        0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
        0x00, 0xff, 0xd9,
      ]);

      const meta = extractMediaMetadata(customSof0);
      expect(meta.format).toBe('jpeg');
      expect(meta.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(meta.make).toBeUndefined();
    });
  });
});
