import { describe, it, expect } from 'vitest';
import {
  buildAtom,
  buildTaptAtom,
  buildQuickTimeMetaAtom,
  parseAtomHierarchy,
  reconstructRayBanQuickTimeMov,
} from '@/lib/atom_synthesizer';

describe('QuickTime Atom Synthesizer & Parser', () => {
  it('builds a generic atom box with big-endian size and type', () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const atom = buildAtom('free', payload);

    expect(atom.length).toBe(12);
    const view = new DataView(atom.buffer);
    expect(view.getUint32(0, false)).toBe(12);
    expect(String.fromCharCode(atom[4], atom[5], atom[6], atom[7])).toBe('free');
    expect(atom[8]).toBe(1);
    expect(atom[9]).toBe(2);
    expect(atom[10]).toBe(3);
    expect(atom[11]).toBe(4);
  });

  it('builds authentic 68-byte tapt atom with clef, prof, enof fixed-point dimensions', () => {
    const tapt = buildTaptAtom(1376, 1840);
    expect(tapt.length).toBe(68);

    const atoms = parseAtomHierarchy(tapt);
    expect(atoms.length).toBe(1);
    expect(atoms[0].type).toBe('tapt');
    expect(atoms[0].size).toBe(68);

    const children = atoms[0].children;
    expect(children).toBeDefined();
    expect(children!.length).toBe(3);
    expect(children![0].type).toBe('clef');
    expect(children![1].type).toBe('prof');
    expect(children![2].type).toBe('enof');

    for (const sub of children!) {
      expect(sub.size).toBe(20);
      const view = new DataView(tapt.buffer, sub.offset, sub.size);
      // Fixed point width (1376.0 -> 0x05600000) and height (1840.0 -> 0x07300000)
      const w = view.getUint32(sub.headerSize + 4, false);
      const h = view.getUint32(sub.headerSize + 8, false);
      expect(w).toBe(1376 << 16);
      expect(h).toBe(1840 << 16);
    }
  });

  it('builds authentic QuickTime moov.meta atom with mdta keys and ilst items', () => {
    const meta = buildQuickTimeMetaAtom({
      model: 'Ray-Ban Meta Smart Glasses 2',
      make: 'Luxottica',
      software: 'Meta View',
    });

    const atoms = parseAtomHierarchy(meta);
    expect(atoms.length).toBe(1);
    expect(atoms[0].type).toBe('meta');

    const children = atoms[0].children;
    expect(children).toBeDefined();
    expect(children!.some((c) => c.type === 'hdlr')).toBe(true);
    expect(children!.some((c) => c.type === 'keys')).toBe(true);
    expect(children!.some((c) => c.type === 'ilst')).toBe(true);

    // Verify string contents in binary
    const metaStr = new TextDecoder().decode(meta);
    expect(metaStr).toContain('com.apple.quicktime.model');
    expect(metaStr).toContain('Ray-Ban Meta Smart Glasses 2');
    expect(metaStr).toContain('com.apple.quicktime.make');
    expect(metaStr).toContain('Luxottica');
    expect(metaStr).toContain('com.apple.quicktime.software');
    expect(metaStr).toContain('Meta View');
  });

  it('reconstructs complete QuickTime MOV container with Ray-Ban Meta specifications', () => {
    const emptySource = new Uint8Array(0);
    const mov = reconstructRayBanQuickTimeMov(emptySource, {
      width: 1376,
      height: 1840,
    });

    const atoms = parseAtomHierarchy(mov);
    expect(atoms.length).toBeGreaterThanOrEqual(3);

    // 1. First atom is ftyp with major brand 'qt  '
    expect(atoms[0].type).toBe('ftyp');
    const brand = String.fromCharCode(mov[atoms[0].offset + 8], mov[atoms[0].offset + 9], mov[atoms[0].offset + 10], mov[atoms[0].offset + 11]);
    expect(brand).toBe('qt  ');

    // 2. moov atom
    const moov = atoms.find((a) => a.type === 'moov');
    expect(moov).toBeDefined();
    expect(moov!.children).toBeDefined();

    // 3. mvhd timescale is 48000
    const mvhd = moov!.children!.find((c) => c.type === 'mvhd');
    expect(mvhd).toBeDefined();
    const mvhdView = new DataView(mov.buffer, mvhd!.offset + 8, mvhd!.size - 8);
    expect(mvhdView.getUint32(12, false)).toBe(48000);

    // 4. Video trak with tapt
    const traks = moov!.children!.filter((c) => c.type === 'trak');
    expect(traks.length).toBe(2);

    const videoTrak = traks[0];
    const tapt = videoTrak.children!.find((c) => c.type === 'tapt');
    expect(tapt).toBeDefined();
    expect(tapt!.size).toBe(68);

    // 5. moov.meta is direct child of moov
    const meta = moov!.children!.find((c) => c.type === 'meta');
    expect(meta).toBeDefined();

    // 6. mdat atom exists
    const mdat = atoms.find((a) => a.type === 'mdat');
    expect(mdat).toBeDefined();
  });
});
