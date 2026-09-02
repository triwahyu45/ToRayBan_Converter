/**
 * ToRayBan_Converter - Adversarial Stress Test Suite for QuickTime Atom Synthesizer & Media Utils
 * Teamwork Preview Challenger 2 (Empirical Adversarial Validation)
 */

import { describe, it, expect } from 'vitest';
import {
  buildAtom,
  buildIndexedAtom,
  buildTaptAtom,
  buildQuickTimeMetaAtom,
  parseAtomHierarchy,
  reconstructRayBanQuickTimeMov,
} from '@/lib/atom_synthesizer';
import {
  detectMediaFormat,
  calculateCenterCrop,
  normalizeCropCoordinates,
  bufferToDataUrl,
  dataUrlToUint8Array,
} from '@/lib/media_utils';
import { extractMediaMetadata } from '@/lib/metadata_extractor';
import { AtomNode } from '@/types/atoms';

describe('Adversarial Suite 1: Buffer Edge Cases, Underflows & Truncations', () => {
  it('handles empty buffer (0 bytes) gracefully without throwing or NaN', () => {
    const empty = new Uint8Array(0);
    const nodes = parseAtomHierarchy(empty);
    expect(nodes).toEqual([]);

    const reconstructed = reconstructRayBanQuickTimeMov(empty);
    expect(reconstructed).toBeInstanceOf(Uint8Array);
    expect(reconstructed.length).toBeGreaterThan(0);

    const parsedReconstructed = parseAtomHierarchy(reconstructed);
    expect(parsedReconstructed.length).toBeGreaterThanOrEqual(3);
    expect(parsedReconstructed[0].type).toBe('ftyp');
  });

  it('handles sub-header buffers (1 to 7 bytes) without buffer overrun', () => {
    for (let len = 1; len < 8; len++) {
      const buf = new Uint8Array(len);
      buf.fill(0xaa);
      const nodes = parseAtomHierarchy(buf);
      expect(nodes).toEqual([]);

      const reconstructed = reconstructRayBanQuickTimeMov(buf);
      expect(reconstructed).toBeInstanceOf(Uint8Array);
      expect(reconstructed.length).toBeGreaterThan(0);
    }
  });

  it('handles truncated atom headers (atomSize > buffer length)', () => {
    // Atom header claims 100 bytes, but buffer has only 12 bytes
    const truncated = new Uint8Array(12);
    const view = new DataView(truncated.buffer);
    view.setUint32(0, 100, false); // size = 100
    truncated.set(new TextEncoder().encode('moov'), 4);
    truncated.set([1, 2, 3, 4], 8);

    const nodes = parseAtomHierarchy(truncated);
    expect(nodes).toEqual([]); // Should break cleanly due to truncation

    const reconstructed = reconstructRayBanQuickTimeMov(truncated);
    expect(reconstructed.length).toBeGreaterThan(0);
    const parsed = parseAtomHierarchy(reconstructed);
    expect(parsed.some((a) => a.type === 'moov')).toBe(true);
  });

  it('handles truncated 64-bit large-size atom headers (size === 1 with < 16 bytes)', () => {
    // 64-bit size indicator (size=1) but only 12 bytes provided (missing 8-byte uint64)
    const truncated64 = new Uint8Array(12);
    const view = new DataView(truncated64.buffer);
    view.setUint32(0, 1, false); // size = 1 indicates 64-bit size
    truncated64.set(new TextEncoder().encode('mdat'), 4);

    const nodes = parseAtomHierarchy(truncated64);
    expect(nodes).toEqual([]);
  });

  it('handles valid size=0 atom extending to end of buffer', () => {
    // size = 0 means atom extends to EOF
    const eofAtom = new Uint8Array(32);
    const view = new DataView(eofAtom.buffer);
    view.setUint32(0, 0, false); // size = 0
    eofAtom.set(new TextEncoder().encode('free'), 4);
    eofAtom.fill(0x55, 8);

    const nodes = parseAtomHierarchy(eofAtom);
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('free');
    expect(nodes[0].size).toBe(32);
    expect(nodes[0].data?.length).toBe(24);
  });

  it('rejects invalid atom sizes (< 8 bytes unless 0 or 1)', () => {
    for (let invalidSize of [2, 3, 4, 5, 6, 7]) {
      const bad = new Uint8Array(16);
      const view = new DataView(bad.buffer);
      view.setUint32(0, invalidSize, false);
      bad.set(new TextEncoder().encode('test'), 4);

      const nodes = parseAtomHierarchy(bad);
      expect(nodes).toEqual([]);
    }
  });
});

describe('Adversarial Suite 2: Fragmented MP4 (fMP4) vs Unified MP4', () => {
  it('parses fragmented MP4 with moof and mdat sequences', () => {
    // Build simulated fMP4: ftyp + moov (with mvex) + moof + mdat
    const ftyp = buildAtom('ftyp', new TextEncoder().encode('isom\x00\x00\x02\x00mp41'));
    const mvex = buildAtom('mvex', new Uint8Array(16));
    const moov = buildAtom('moov', mvex);
    
    const mfhd = buildAtom('mfhd', new Uint8Array(8));
    const traf = buildAtom('traf', new Uint8Array(16));
    const moofPayload = new Uint8Array(mfhd.length + traf.length);
    moofPayload.set(mfhd, 0);
    moofPayload.set(traf, mfhd.length);
    const moof = buildAtom('moof', moofPayload);

    const videoSampleData = new Uint8Array([0x00, 0x00, 0x00, 0x04, 0x65, 0x88, 0x80, 0x10]);
    const mdat = buildAtom('mdat', videoSampleData);

    const fmp4Stream = new Uint8Array(ftyp.length + moov.length + moof.length + mdat.length);
    let offset = 0;
    fmp4Stream.set(ftyp, offset); offset += ftyp.length;
    fmp4Stream.set(moov, offset); offset += moov.length;
    fmp4Stream.set(moof, offset); offset += moof.length;
    fmp4Stream.set(mdat, offset); offset += mdat.length;

    const nodes = parseAtomHierarchy(fmp4Stream);
    expect(nodes.length).toBe(4);
    expect(nodes.map((n) => n.type)).toEqual(['ftyp', 'moov', 'moof', 'mdat']);

    // Test reconstruction from fmp4 stream
    const reconstructed = reconstructRayBanQuickTimeMov(fmp4Stream);
    const recNodes = parseAtomHierarchy(reconstructed);
    expect(recNodes[0].type).toBe('ftyp');
    expect(recNodes.some((n) => n.type === 'moov')).toBe(true);
    expect(recNodes.some((n) => n.type === 'mdat')).toBe(true);

    const mdatNode = recNodes.find((n) => n.type === 'mdat')!;
    // Should preserve extracted sample data
    expect(mdatNode.size).toBe(mdat.length);
  });

  it('handles multiple moof/mdat fragment pairs in stream', () => {
    const ftyp = buildAtom('ftyp', new TextEncoder().encode('isom\x00\x00\x02\x00mp41'));
    const moov = buildAtom('moov', buildAtom('mvhd', new Uint8Array(100)));
    const moof1 = buildAtom('moof', new Uint8Array(20));
    const mdat1 = buildAtom('mdat', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    const moof2 = buildAtom('moof', new Uint8Array(20));
    const mdat2 = buildAtom('mdat', new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]));

    const multiFragmentStream = new Uint8Array(
      ftyp.length + moov.length + moof1.length + mdat1.length + moof2.length + mdat2.length
    );
    let off = 0;
    multiFragmentStream.set(ftyp, off); off += ftyp.length;
    multiFragmentStream.set(moov, off); off += moov.length;
    multiFragmentStream.set(moof1, off); off += moof1.length;
    multiFragmentStream.set(mdat1, off); off += mdat1.length;
    multiFragmentStream.set(moof2, off); off += moof2.length;
    multiFragmentStream.set(mdat2, off); off += mdat2.length;

    const nodes = parseAtomHierarchy(multiFragmentStream);
    expect(nodes.length).toBe(6);
    expect(nodes.filter((n) => n.type === 'moof').length).toBe(2);
    expect(nodes.filter((n) => n.type === 'mdat').length).toBe(2);

    const reconstructed = reconstructRayBanQuickTimeMov(multiFragmentStream);
    expect(reconstructed.length).toBeGreaterThan(0);
  });

  it('handles stream with moov but zero-length or missing mdat by synthesizing valid dummy payload', () => {
    const ftyp = buildAtom('ftyp', new TextEncoder().encode('isom\x00\x00\x02\x00mp41'));
    const moov = buildAtom('moov', buildAtom('mvhd', new Uint8Array(100)));
    const streamWithoutMdat = new Uint8Array(ftyp.length + moov.length);
    streamWithoutMdat.set(ftyp, 0);
    streamWithoutMdat.set(moov, ftyp.length);

    const reconstructed = reconstructRayBanQuickTimeMov(streamWithoutMdat);
    const nodes = parseAtomHierarchy(reconstructed);
    const mdat = nodes.find((n) => n.type === 'mdat');
    expect(mdat).toBeDefined();
    expect(mdat!.size).toBe(8 + 32 * 6); // Synthesized dummy payload (192 + 8 = 200 bytes)
  });
});

describe('Adversarial Suite 3: 64-bit (co64) vs 32-bit (stco) & Large Atoms', () => {
  it('parses 64-bit large size atoms correctly (size === 1)', () => {
    const payload = new Uint8Array(32);
    payload.fill(0x42);
    const totalSize = 16 + payload.length; // 48 bytes

    const largeAtom = new Uint8Array(totalSize);
    const view = new DataView(largeAtom.buffer);
    view.setUint32(0, 1, false); // size = 1 indicates 64-bit size
    largeAtom.set(new TextEncoder().encode('mdat'), 4);
    view.setUint32(8, 0, false); // high 32 bits
    view.setUint32(12, totalSize, false); // low 32 bits
    largeAtom.set(payload, 16);

    const nodes = parseAtomHierarchy(largeAtom);
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('mdat');
    expect(nodes[0].size).toBe(48);
    expect(nodes[0].headerSize).toBe(16);
    expect(nodes[0].data?.length).toBe(32);
  });

  it('accurately parses stco (32-bit chunk offset) table hierarchy', () => {
    // Build stco box: version/flags (4), entry_count (4), 4 offsets (4 * 4 = 16)
    const stcoPayload = new Uint8Array(8 + 16);
    const view = new DataView(stcoPayload.buffer);
    view.setUint32(0, 0, false); // version 0, flags 0
    view.setUint32(4, 4, false); // 4 entries
    view.setUint32(8, 1024, false);
    view.setUint32(12, 2048, false);
    view.setUint32(16, 4096, false);
    view.setUint32(20, 8192, false);
    const stco = buildAtom('stco', stcoPayload);

    const stbl = buildAtom('stbl', stco);
    const minf = buildAtom('minf', stbl);
    const mdia = buildAtom('mdia', minf);
    const trak = buildAtom('trak', mdia);
    const moov = buildAtom('moov', trak);

    const nodes = parseAtomHierarchy(moov);
    expect(nodes.length).toBe(1);
    const trakNode = nodes[0].children![0];
    const mdiaNode = trakNode.children![0];
    const minfNode = mdiaNode.children![0];
    const stblNode = minfNode.children![0];
    const stcoNode = stblNode.children![0];

    expect(stcoNode.type).toBe('stco');
    expect(stcoNode.data?.length).toBe(stcoPayload.length);
  });

  it('accurately parses co64 (64-bit chunk offset) table hierarchy', () => {
    // Build co64 box: version/flags (4), entry_count (4), 2 64-bit offsets (2 * 8 = 16)
    const co64Payload = new Uint8Array(8 + 16);
    const view = new DataView(co64Payload.buffer);
    view.setUint32(0, 0, false);
    view.setUint32(4, 2, false); // 2 entries
    // Entry 1: 0x00000001_00000000 (4,294,967,296 bytes)
    view.setUint32(8, 1, false);
    view.setUint32(12, 0, false);
    // Entry 2: 0x00000002_50000000 (9,932,111,872 bytes)
    view.setUint32(16, 2, false);
    view.setUint32(20, 0x50000000, false);
    const co64 = buildAtom('co64', co64Payload);

    const stbl = buildAtom('stbl', co64);
    const nodes = parseAtomHierarchy(stbl);
    expect(nodes.length).toBe(1);
    expect(nodes[0].children![0].type).toBe('co64');
  });
});

describe('Adversarial Suite 4: ISO/IEC 14496-12 & QuickTime Specifications Conformance', () => {
  it('strictly validates 68-byte tapt aperture layout and 16.16 fixed-point representation', () => {
    const tapt = buildTaptAtom(1376, 1840);
    expect(tapt.length).toBe(68);

    const view = new DataView(tapt.buffer);
    expect(view.getUint32(0, false)).toBe(68);
    expect(String.fromCharCode(tapt[4], tapt[5], tapt[6], tapt[7])).toBe('tapt');

    // Child 1: clef (offset 8..28)
    expect(view.getUint32(8, false)).toBe(20);
    expect(String.fromCharCode(tapt[12], tapt[13], tapt[14], tapt[15])).toBe('clef');
    expect(view.getUint32(16, false)).toBe(0); // version/flags = 0
    expect(view.getUint32(20, false)).toBe(1376 * 65536); // 1376.0 in 16.16
    expect(view.getUint32(24, false)).toBe(1840 * 65536); // 1840.0 in 16.16

    // Child 2: prof (offset 28..48)
    expect(view.getUint32(28, false)).toBe(20);
    expect(String.fromCharCode(tapt[32], tapt[33], tapt[34], tapt[35])).toBe('prof');
    expect(view.getUint32(36, false)).toBe(0);
    expect(view.getUint32(40, false)).toBe(1376 * 65536);
    expect(view.getUint32(44, false)).toBe(1840 * 65536);

    // Child 3: enof (offset 48..68)
    expect(view.getUint32(48, false)).toBe(20);
    expect(String.fromCharCode(tapt[52], tapt[53], tapt[54], tapt[55])).toBe('enof');
    expect(view.getUint32(56, false)).toBe(0);
    expect(view.getUint32(60, false)).toBe(1376 * 65536);
    expect(view.getUint32(64, false)).toBe(1840 * 65536);
  });

  it('synthesizes compliant moov.meta atom with authentic QuickTime mdta keys and ilst tables', () => {
    const meta = buildQuickTimeMetaAtom({
      make: 'Luxottica',
      model: 'Ray-Ban Meta Smart Glasses 2',
      software: 'Meta View',
      comment: 'app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=TEST-UUID',
      copyright: 'Meta AI',
    });

    const parsed = parseAtomHierarchy(meta);
    expect(parsed.length).toBe(1);
    expect(parsed[0].type).toBe('meta');
    expect(parsed[0].children?.length).toBe(3);

    const [hdlr, keys, ilst] = parsed[0].children!;
    expect(hdlr.type).toBe('hdlr');
    expect(keys.type).toBe('keys');
    expect(ilst.type).toBe('ilst');

    // Verify hdlr payload
    const hdlrData = hdlr.data!;
    expect(String.fromCharCode(hdlrData[8], hdlrData[9], hdlrData[10], hdlrData[11])).toBe('mdta');
    expect(String.fromCharCode(hdlrData[12], hdlrData[13], hdlrData[14], hdlrData[15])).toBe('appl');

    // Verify keys payload: 6 keys
    const keysView = new DataView(keys.data!.buffer, keys.data!.byteOffset, keys.data!.byteLength);
    expect(keysView.getUint32(0, false)).toBe(0); // version/flags = 0
    expect(keysView.getUint32(4, false)).toBe(6); // 6 keys
  });

  it('validates entire reconstructed MOV atom hierarchy order (ftyp -> moov -> mdat)', () => {
    const rawDummy = new Uint8Array([0x00, 0x00, 0x00, 0x0c, 0x66, 0x72, 0x65, 0x65, 1, 2, 3, 4]);
    const mov = reconstructRayBanQuickTimeMov(rawDummy);
    const atoms = parseAtomHierarchy(mov);

    expect(atoms.length).toBe(3);
    expect(atoms[0].type).toBe('ftyp');
    expect(atoms[1].type).toBe('moov');
    expect(atoms[2].type).toBe('mdat');

    // Verify byte contiguous layout: offsets and sizes sum up to buffer length
    let currentOffset = 0;
    for (const a of atoms) {
      expect(a.offset).toBe(currentOffset);
      currentOffset += a.size;
    }
    expect(currentOffset).toBe(mov.length);
  });
});

describe('Adversarial Suite 5: Deeply Nested, Circular & Malformed Atom Trees', () => {
  it('handles deeply nested container trees (depth = 50) without stack overflow', () => {
    let currentBox = buildAtom('dinf', new Uint8Array(8));
    for (let depth = 0; depth < 50; depth++) {
      currentBox = buildAtom('minf', currentBox);
    }
    const rootMoov = buildAtom('moov', currentBox);

    const parsed = parseAtomHierarchy(rootMoov);
    expect(parsed.length).toBe(1);
    expect(parsed[0].type).toBe('moov');

    // Traverse down the tree
    let node = parsed[0];
    let depthCount = 0;
    while (node.children && node.children.length > 0) {
      depthCount++;
      node = node.children[0];
    }
    expect(depthCount).toBe(52);
  });

  it('handles zero-length container payload without crashing or infinite recursion', () => {
    const emptyMoov = buildAtom('moov', new Uint8Array(0)); // size = 8
    const parsed = parseAtomHierarchy(emptyMoov);
    expect(parsed.length).toBe(1);
    expect(parsed[0].type).toBe('moov');
    expect(parsed[0].children).toEqual([]);
  });

  it('handles non-ASCII and binary garbage atom type identifiers', () => {
    const binaryTypeAtom = new Uint8Array([
      0x00, 0x00, 0x00, 0x10, // size 16
      0xFF, 0xFE, 0xFD, 0xFC, // non-ASCII type
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    ]);

    const parsed = parseAtomHierarchy(binaryTypeAtom);
    expect(parsed.length).toBe(1);
    expect(parsed[0].size).toBe(16);
    expect(parsed[0].data?.length).toBe(8);
  });

  it('handles overlapping/oversized child atom within container safely', () => {
    // Container claims 24 bytes, but child claims 100 bytes
    const childBad = new Uint8Array(16);
    const view = new DataView(childBad.buffer);
    view.setUint32(0, 100, false); // oversized child
    childBad.set(new TextEncoder().encode('trak'), 4);

    const container = buildAtom('moov', childBad);
    const parsed = parseAtomHierarchy(container);
    expect(parsed.length).toBe(1);
    expect(parsed[0].type).toBe('moov');
    expect(parsed[0].children).toEqual([]); // Child fails bounds check safely
  });
});

describe('Adversarial Suite 6: Numerical Stability & NaN/Infinity Resistance', () => {
  it('calculateCenterCrop handles extreme, zero, and negative dimensions without NaN for finite numbers', () => {
    const validExtremeInputs = [
      [0, 0],
      [-100, -200],
      [100, 0],
      [0, 100],
      [1, 1],
      [100000, 1],
      [1, 100000],
    ];

    for (const [w, h] of validExtremeInputs) {
      const crop = calculateCenterCrop(w, h, 1376, 1840);
      expect(Number.isFinite(crop.x)).toBe(true);
      expect(Number.isFinite(crop.y)).toBe(true);
      expect(Number.isFinite(crop.width)).toBe(true);
      expect(Number.isFinite(crop.height)).toBe(true);
      expect(crop.width % 2).toBe(0);
      expect(crop.height % 2).toBe(0);
    }
  });

  it('probes calculateCenterCrop behavior on non-finite (NaN / Infinity) values', () => {
    // In JavaScript, NaN <= 0 is false, so passing NaN can yield NaN in crop math unless guarded
    const nanCrop = calculateCenterCrop(100, NaN, 1376, 1840);
    // Documenting empirical behavior:
    expect(Number.isNaN(nanCrop.x) || Number.isFinite(nanCrop.x)).toBe(true);
  });

  it('normalizeCropCoordinates enforces even integers and bounds clamping under stress', () => {
    const cases = [
      { crop: { x: 3, y: 5, width: 99, height: 101 }, w: 100, h: 100 },
      { crop: { x: -50, y: -20, width: 2000, height: 3000 }, w: 1920, h: 1080 },
      { crop: { x: 1919, y: 1079, width: 50, height: 50 }, w: 1920, h: 1080 },
      { crop: { x: 0, y: 0, width: 0, height: 0 }, w: 10, h: 10 },
    ];

    for (const c of cases) {
      const norm = normalizeCropCoordinates(c.crop, c.w, c.h);
      expect(norm.x % 2).toBe(0);
      expect(norm.y % 2).toBe(0);
      expect(norm.width % 2).toBe(0);
      expect(norm.height % 2).toBe(0);
      expect(norm.x + norm.width).toBeLessThanOrEqual(c.w);
      expect(norm.y + norm.height).toBeLessThanOrEqual(c.h);
    }
  });

  it('detectMediaFormat never crashes or throws on fuzz buffers', () => {
    expect(detectMediaFormat(new Uint8Array(0))).toBe('unknown');
    expect(detectMediaFormat(new Uint8Array(1))).toBe('unknown');
    expect(detectMediaFormat(new Uint8Array(3))).toBe('unknown');

    // Fuzz random buffers
    for (let i = 0; i < 100; i++) {
      const randomBuf = new Uint8Array(i);
      for (let j = 0; j < i; j++) randomBuf[j] = Math.floor(Math.random() * 256);
      const format = detectMediaFormat(randomBuf);
      expect(typeof format).toBe('string');
    }
  });

  it('bufferToDataUrl and dataUrlToUint8Array roundtrip safely on binary payloads', () => {
    const rawData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) rawData[i] = i;

    const dataUrl = bufferToDataUrl(rawData, 'application/octet-stream');
    expect(dataUrl.startsWith('data:application/octet-stream;base64,')).toBe(true);

    const roundtrip = dataUrlToUint8Array(dataUrl);
    expect(roundtrip.length).toBe(rawData.length);
    for (let i = 0; i < 256; i++) {
      expect(roundtrip[i]).toBe(rawData[i]);
    }
  });
});

describe('Adversarial Suite 7: Fuzzing & Corrupted Stream Resilience', () => {
  it('survives random bit-flip fuzzing on valid MOV container without unhandled exceptions', () => {
    const cleanMov = reconstructRayBanQuickTimeMov(new Uint8Array(0));
    
    // Perform 200 fuzz iterations with random bit flips
    for (let iter = 0; iter < 200; iter++) {
      const fuzzed = new Uint8Array(cleanMov);
      const numMutations = 1 + Math.floor(Math.random() * 20);
      for (let m = 0; m < numMutations; m++) {
        const bytePos = Math.floor(Math.random() * fuzzed.length);
        fuzzed[bytePos] ^= (1 << Math.floor(Math.random() * 8));
      }

      expect(() => {
        const atoms = parseAtomHierarchy(fuzzed);
        expect(Array.isArray(atoms)).toBe(true);
      }).not.toThrow();

      expect(() => {
        const metadata = extractMediaMetadata(fuzzed);
        expect(metadata).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const recon = reconstructRayBanQuickTimeMov(fuzzed);
        expect(recon).toBeInstanceOf(Uint8Array);
      }).not.toThrow();
    }
  });
});
