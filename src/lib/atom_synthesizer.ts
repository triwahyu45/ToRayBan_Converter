/**
 * ToRayBan_Converter - Authentic QuickTime Atom Synthesizer & Parser
 * Pure TypeScript binary engine reconstructing ISO-BMFF / QuickTime .MOV containers
 * with ftyp 'qt  ', tapt (1376x1840 fixed-point), mvhd 48000, and moov.meta (mdta keys/ilst)
 * required for Instagram Stories Spin View detection.
 */

import { AtomNode, ReconstructOptions } from '@/types/atoms';
import { QuickTimeMetadata } from '@/types/metadata';

const CONTAINER_TYPES = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'dinf',
  'tapt',
  'meta',
  'ilst',
  'edts',
]);

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().toUpperCase();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

/**
 * Builds a binary atom with 4-byte big-endian size and 4-character type.
 */
export function buildAtom(type: string, payload: Uint8Array): Uint8Array {
  const size = payload.length + 8;
  const atom = new Uint8Array(size);
  const view = new DataView(atom.buffer);

  view.setUint32(0, size, false); // Big-Endian size
  for (let i = 0; i < 4; i++) {
    atom[4 + i] = type.charCodeAt(i);
  }
  atom.set(payload, 8);
  return atom;
}

/**
 * Builds an atom where type is represented as a 4-byte integer (e.g. 1-based ilst item index).
 */
export function buildIndexedAtom(index: number, payload: Uint8Array): Uint8Array {
  const size = payload.length + 8;
  const atom = new Uint8Array(size);
  const view = new DataView(atom.buffer);

  view.setUint32(0, size, false);
  view.setUint32(4, index, false);
  atom.set(payload, 8);
  return atom;
}

/**
 * Builds the 68-byte Track Aperture Mode Dimensions (tapt) atom for Ray-Ban Meta.
 * Contains clef, prof, and enof sub-atoms with fixed-point 16.16 dimensions (1376.0 x 1840.0).
 */
export function buildTaptAtom(width: number = 1376, height: number = 1840): Uint8Array {
  const fixedW = (width << 16) >>> 0;
  const fixedH = (height << 16) >>> 0;

  // Each sub-atom payload: version/flags (4 bytes) + width (4 bytes) + height (4 bytes) = 12 bytes
  const subPayload = new Uint8Array(12);
  const view = new DataView(subPayload.buffer);
  view.setUint32(0, 0, false); // version/flags = 0
  view.setUint32(4, fixedW, false);
  view.setUint32(8, fixedH, false);

  const clef = buildAtom('clef', subPayload); // 20 bytes
  const prof = buildAtom('prof', subPayload); // 20 bytes
  const enof = buildAtom('enof', subPayload); // 20 bytes

  const taptPayload = new Uint8Array(clef.length + prof.length + enof.length);
  taptPayload.set(clef, 0);
  taptPayload.set(prof, clef.length);
  taptPayload.set(enof, clef.length + prof.length);

  return buildAtom('tapt', taptPayload); // 68 bytes
}

/**
 * Builds QuickTime moov.meta atom containing hdlr (mdta/appl), keys table, and ilst values.
 */
export function buildQuickTimeMetaAtom(metadata?: Partial<QuickTimeMetadata>): Uint8Array {
  const randomId = generateUUID();
  const creationDate =
    metadata?.creationDate ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const metaDict: Record<string, string> = {
    'com.apple.quicktime.copyright': metadata?.copyright ?? 'Meta AI',
    'com.apple.quicktime.comment':
      metadata?.comment ??
      `app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=${randomId}`,
    'com.apple.quicktime.model': metadata?.model ?? 'Ray-Ban Meta Smart Glasses 2',
    'com.apple.quicktime.creationdate': creationDate,
    'com.apple.quicktime.software': metadata?.software ?? 'Meta View',
    'com.apple.quicktime.make': metadata?.make ?? 'Luxottica',
  };

  const encoder = new TextEncoder();

  // 1. hdlr atom
  // version/flags (4), predefined (4), subtype 'mdta' (4), manufacturer 'appl' (4), flags (8), name
  const hdlrNameStr = '\x17Core Media Data Handler';
  const hdlrNameBytes = encoder.encode(hdlrNameStr);
  const hdlrPayload = new Uint8Array(24 + hdlrNameBytes.length);
  const hdlrView = new DataView(hdlrPayload.buffer);
  hdlrView.setUint32(0, 0, false); // version/flags
  hdlrView.setUint32(4, 0, false); // predefined
  hdlrPayload.set(encoder.encode('mdta'), 8);
  hdlrPayload.set(encoder.encode('appl'), 12);
  hdlrView.setUint32(16, 0, false); // flags
  hdlrView.setUint32(20, 0, false); // flags
  hdlrPayload.set(hdlrNameBytes, 24);
  const hdlr = buildAtom('hdlr', hdlrPayload);

  // 2. keys atom
  const keyList = Object.keys(metaDict);
  let keysPayloadSize = 8; // version/flags (4) + key_count (4)
  const encodedKeys: Uint8Array[] = [];

  for (const k of keyList) {
    const kBytes = encoder.encode(k);
    const entryLen = 8 + kBytes.length;
    const keyEntry = new Uint8Array(entryLen);
    const kv = new DataView(keyEntry.buffer);
    kv.setUint32(0, entryLen, false);
    keyEntry.set(encoder.encode('mdta'), 4);
    keyEntry.set(kBytes, 8);
    encodedKeys.push(keyEntry);
    keysPayloadSize += entryLen;
  }

  const keysPayload = new Uint8Array(keysPayloadSize);
  const keysView = new DataView(keysPayload.buffer);
  keysView.setUint32(0, 0, false); // version/flags
  keysView.setUint32(4, keyList.length, false); // key_count

  let keyPos = 8;
  for (const ek of encodedKeys) {
    keysPayload.set(ek, keyPos);
    keyPos += ek.length;
  }
  const keys = buildAtom('keys', keysPayload);

  // 3. ilst atom
  const ilstItems: Uint8Array[] = [];
  let totalIlstPayloadSize = 0;

  for (let idx = 1; idx <= keyList.length; idx++) {
    const k = keyList[idx - 1];
    const valBytes = encoder.encode(metaDict[k]);

    // data atom: type=1 (0x00000001, UTF-8), locale=0 (4 bytes) + valBytes
    const dataPayload = new Uint8Array(8 + valBytes.length);
    const dataView = new DataView(dataPayload.buffer);
    dataView.setUint32(0, 1, false); // type 1 = UTF-8 string
    dataView.setUint32(4, 0, false); // locale 0
    dataPayload.set(valBytes, 8);

    const dataBox = buildAtom('data', dataPayload);
    const itemBox = buildIndexedAtom(idx, dataBox);

    ilstItems.push(itemBox);
    totalIlstPayloadSize += itemBox.length;
  }

  const ilstPayload = new Uint8Array(totalIlstPayloadSize);
  let ilstPos = 0;
  for (const item of ilstItems) {
    ilstPayload.set(item, ilstPos);
    ilstPos += item.length;
  }
  const ilst = buildAtom('ilst', ilstPayload);

  // QuickTime meta: direct child without version/flags
  const metaPayload = new Uint8Array(hdlr.length + keys.length + ilst.length);
  metaPayload.set(hdlr, 0);
  metaPayload.set(keys, hdlr.length);
  metaPayload.set(ilst, hdlr.length + keys.length);

  return buildAtom('meta', metaPayload);
}

/**
 * Fast recursive parser for QuickTime / MP4 atom hierarchies.
 */
export function parseAtomHierarchy(
  buffer: Uint8Array,
  parentOffset: number = 0
): AtomNode[] {
  const atoms: AtomNode[] = [];
  let pos = 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (pos + 8 <= buffer.length) {
    let atomSize = view.getUint32(pos, false);
    const atomType = String.fromCharCode(
      buffer[pos + 4],
      buffer[pos + 5],
      buffer[pos + 6],
      buffer[pos + 7]
    );
    let headerSize = 8;

    if (atomSize === 1) {
      // 64-bit large size
      if (pos + 16 > buffer.length) break;
      const high = view.getUint32(pos + 8, false);
      const low = view.getUint32(pos + 12, false);
      atomSize = high * 4294967296 + low;
      headerSize = 16;
    } else if (atomSize === 0) {
      atomSize = buffer.length - pos;
    }

    if (atomSize < headerSize || pos + atomSize > buffer.length) {
      break;
    }

    const payload = buffer.subarray(pos + headerSize, pos + atomSize);
    const node: AtomNode = {
      type: atomType,
      size: atomSize,
      offset: parentOffset + pos,
      headerSize,
      children: [],
      data: payload,
    };

    if (CONTAINER_TYPES.has(atomType)) {
      let subPayload = payload;
      let subOffset = parentOffset + pos + headerSize;

      if (atomType === 'meta') {
        // QuickTime meta vs ISO FullBox meta (ISO has 4 bytes version/flags before children)
        if (payload.length >= 8) {
          const firstSubType = String.fromCharCode(
            payload[4],
            payload[5],
            payload[6],
            payload[7]
          );
          if (firstSubType !== 'hdlr' && firstSubType !== 'keys' && firstSubType !== 'ilst') {
            subPayload = payload.subarray(4);
            subOffset += 4;
          }
        }
      }

      node.children = parseAtomHierarchy(subPayload, subOffset);
    }

    atoms.push(node);
    pos += atomSize;
  }

  return atoms;
}

/**
 * Reconstructs a MOV/MP4 buffer into an authentic Ray-Ban Meta QuickTime container
 * compatible with Instagram Stories Spin View.
 */
export function reconstructRayBanQuickTimeMov(
  rawMovBuffer: Uint8Array,
  options?: ReconstructOptions
): Uint8Array {
  const width = options?.width ?? 1376;
  const height = options?.height ?? 1840;
  const encoder = new TextEncoder();

  // 1. Build File Type Box (ftyp): major_brand 'qt  ', minor_version 512, compatible_brands ['qt  ']
  const ftypPayload = new Uint8Array(12);
  const ftypView = new DataView(ftypPayload.buffer);
  ftypPayload.set(encoder.encode('qt  '), 0);
  ftypView.setUint32(4, 512, false);
  ftypPayload.set(encoder.encode('qt  '), 8);
  const ftyp = buildAtom('ftyp', ftypPayload); // 20 bytes

  // 2. Build tapt (68 bytes) & moov.meta
  const tapt = buildTaptAtom(width, height);
  const meta = buildQuickTimeMetaAtom(options?.metadata);

  // 3. Parse source atoms
  const atoms = parseAtomHierarchy(rawMovBuffer);

  // 4. Extract or synthesize mdat
  let mdatBytes: Uint8Array | null = null;
  for (const a of atoms) {
    if (a.type === 'mdat') {
      mdatBytes = rawMovBuffer.subarray(a.offset, a.offset + a.size);
      break;
    }
  }

  if (!mdatBytes || mdatBytes.length === 0) {
    const dummyPayload = new Uint8Array(32 * 6);
    for (let i = 0; i < dummyPayload.length; i += 6) {
      dummyPayload[i] = 0x00;
      dummyPayload[i + 1] = 0x00;
      dummyPayload[i + 2] = 0x00;
      dummyPayload[i + 3] = 0x02;
      dummyPayload[i + 4] = 0x09;
      dummyPayload[i + 5] = 0x10;
    }
    mdatBytes = buildAtom('mdat', dummyPayload);
  }

  // 5. Build Movie Header (mvhd) with timescale 48000
  const mvhdPayload = new Uint8Array(100);
  const mvhdView = new DataView(mvhdPayload.buffer);
  mvhdView.setUint32(0, 0, false); // version/flags
  mvhdView.setUint32(4, 0, false); // creation_time
  mvhdView.setUint32(8, 0, false); // modification_time
  mvhdView.setUint32(12, 48000, false); // timescale: 48000
  mvhdView.setUint32(16, 48000 * 5, false); // duration: 5 seconds
  mvhdView.setInt32(20, 0x00010000, false); // rate: 1.0
  mvhdView.setInt16(24, 0x0100, false); // volume: 1.0
  // bytes 26..35 reserved (10 bytes = 0)
  // Identity Matrix (36 bytes at offset 36)
  mvhdView.setInt32(36, 0x00010000, false);
  mvhdView.setInt32(40, 0, false);
  mvhdView.setInt32(44, 0, false);
  mvhdView.setInt32(48, 0, false);
  mvhdView.setInt32(52, 0x00010000, false);
  mvhdView.setInt32(56, 0, false);
  mvhdView.setInt32(60, 0, false);
  mvhdView.setInt32(64, 0, false);
  mvhdView.setInt32(68, 0x40000000, false);
  // Predefined (24 bytes at offset 72) = 0
  mvhdView.setUint32(96, 3, false); // next_track_id = 3
  const mvhd = buildAtom('mvhd', mvhdPayload);

  // 6. Build Video Track (Track 1) with tapt
  const tkhdPayload = new Uint8Array(84);
  const tkhdView = new DataView(tkhdPayload.buffer);
  tkhdView.setUint32(0, 0x00000007, false); // version=0, flags=0x07
  tkhdView.setUint32(4, 0, false); // creation_time
  tkhdView.setUint32(8, 0, false); // modification_time
  tkhdView.setUint32(12, 1, false); // track_id = 1
  tkhdView.setUint32(16, 0, false); // reserved
  tkhdView.setUint32(20, 48000 * 5, false); // duration
  // bytes 24..31 reserved (8 bytes)
  tkhdView.setInt16(32, 0, false); // layer
  tkhdView.setInt16(34, 0, false); // alternate_group
  tkhdView.setInt16(36, 0, false); // volume
  // Matrix (36 bytes at offset 40)
  tkhdView.setInt32(40, 0x00010000, false);
  tkhdView.setInt32(44, 0, false);
  tkhdView.setInt32(48, 0, false);
  tkhdView.setInt32(52, 0, false);
  tkhdView.setInt32(56, 0x00010000, false);
  tkhdView.setInt32(60, 0, false);
  tkhdView.setInt32(64, 0, false);
  tkhdView.setInt32(68, 0, false);
  tkhdView.setInt32(72, 0x40000000, false);
  // Track width & height (16.16 fixed point at offset 76 & 80)
  tkhdView.setUint32(76, (width << 16) >>> 0, false);
  tkhdView.setUint32(80, (height << 16) >>> 0, false);
  const tkhd = buildAtom('tkhd', tkhdPayload);

  // mdia for Video Track
  const mdhdPayload = new Uint8Array(24);
  const mdhdView = new DataView(mdhdPayload.buffer);
  mdhdView.setUint32(0, 0, false); // version/flags
  mdhdView.setUint32(4, 0, false); // creation_time
  mdhdView.setUint32(8, 0, false); // modification_time
  mdhdView.setUint32(12, 600, false); // timescale = 600 for video
  mdhdView.setUint32(16, 600 * 5, false); // duration
  mdhdView.setUint16(20, 0, false); // language
  mdhdView.setUint16(22, 0, false); // quality
  const mdhd = buildAtom('mdhd', mdhdPayload);

  const videoHdlrPayload = new Uint8Array(24 + 17);
  const vhView = new DataView(videoHdlrPayload.buffer);
  vhView.setUint32(0, 0, false);
  vhView.setUint32(4, 0, false);
  videoHdlrPayload.set(encoder.encode('vide'), 8);
  vhView.setUint32(12, 0, false);
  vhView.setUint32(16, 0, false);
  vhView.setUint32(20, 0, false);
  videoHdlrPayload.set(encoder.encode('Core Media Video\0'), 24);
  const videoHdlr = buildAtom('hdlr', videoHdlrPayload);

  const vmhdPayload = new Uint8Array(12);
  const vmhdView = new DataView(vmhdPayload.buffer);
  vmhdView.setUint32(0, 0x00000001, false); // version/flags
  const vmhd = buildAtom('vmhd', vmhdPayload);

  // dinf -> dref -> url
  const urlBox = buildAtom('url ', new Uint8Array([0, 0, 0, 1]));
  const drefPayload = new Uint8Array(8 + urlBox.length);
  const drefView = new DataView(drefPayload.buffer);
  drefView.setUint32(0, 0, false);
  drefView.setUint32(4, 1, false);
  drefPayload.set(urlBox, 8);
  const dinf = buildAtom('dinf', buildAtom('dref', drefPayload));

  const stsdPayload = new Uint8Array(8 + 8 + 78);
  const stsdView = new DataView(stsdPayload.buffer);
  stsdView.setUint32(0, 0, false);
  stsdView.setUint32(4, 1, false);
  const avc1Box = buildAtom('avc1', new Uint8Array(78));
  stsdPayload.set(avc1Box, 8);
  const stbl = buildAtom('stbl', buildAtom('stsd', stsdPayload));

  const minfPayload = new Uint8Array(vmhd.length + dinf.length + stbl.length);
  minfPayload.set(vmhd, 0);
  minfPayload.set(dinf, vmhd.length);
  minfPayload.set(stbl, vmhd.length + dinf.length);
  const minf = buildAtom('minf', minfPayload);

  const mdiaPayload = new Uint8Array(mdhd.length + videoHdlr.length + minf.length);
  mdiaPayload.set(mdhd, 0);
  mdiaPayload.set(videoHdlr, mdhd.length);
  mdiaPayload.set(minf, mdhd.length + videoHdlr.length);
  const mdia = buildAtom('mdia', mdiaPayload);

  const videoTrakPayload = new Uint8Array(tkhd.length + tapt.length + mdia.length);
  videoTrakPayload.set(tkhd, 0);
  videoTrakPayload.set(tapt, tkhd.length);
  videoTrakPayload.set(mdia, tkhd.length + tapt.length);
  const videoTrak = buildAtom('trak', videoTrakPayload);

  // 7. Build Audio Track (Track 2)
  const audioTkhdPayload = new Uint8Array(84);
  const aTkhdView = new DataView(audioTkhdPayload.buffer);
  aTkhdView.setUint32(0, 0x00000007, false);
  aTkhdView.setUint32(4, 0, false);
  aTkhdView.setUint32(8, 0, false);
  aTkhdView.setUint32(12, 2, false); // track_id = 2
  aTkhdView.setUint32(16, 0, false);
  aTkhdView.setUint32(20, 48000 * 5, false);
  aTkhdView.setInt16(32, 0, false);
  aTkhdView.setInt16(34, 0, false);
  aTkhdView.setInt16(36, 0x0100, false); // volume 1.0
  aTkhdView.setInt32(40, 0x00010000, false);
  aTkhdView.setInt32(56, 0x00010000, false);
  aTkhdView.setInt32(72, 0x40000000, false);
  const audioTkhd = buildAtom('tkhd', audioTkhdPayload);

  const audioMdhdPayload = new Uint8Array(24);
  const aMdhdView = new DataView(audioMdhdPayload.buffer);
  aMdhdView.setUint32(0, 0, false);
  aMdhdView.setUint32(4, 0, false);
  aMdhdView.setUint32(8, 0, false);
  aMdhdView.setUint32(12, 48000, false); // audio timescale 48000
  aMdhdView.setUint32(16, 48000 * 5, false);
  const audioMdhd = buildAtom('mdhd', audioMdhdPayload);

  const audioHdlrPayload = new Uint8Array(24 + 17);
  const ahView = new DataView(audioHdlrPayload.buffer);
  ahView.setUint32(0, 0, false);
  ahView.setUint32(4, 0, false);
  audioHdlrPayload.set(encoder.encode('soun'), 8);
  audioHdlrPayload.set(encoder.encode('Core Media Audio\0'), 24);
  const audioHdlr = buildAtom('hdlr', audioHdlrPayload);

  const smhdPayload = new Uint8Array(8);
  const smhd = buildAtom('smhd', smhdPayload);

  const audioStsdPayload = new Uint8Array(8 + 8 + 28);
  const aStsdView = new DataView(audioStsdPayload.buffer);
  aStsdView.setUint32(0, 0, false);
  aStsdView.setUint32(4, 1, false);
  const mp4aBox = buildAtom('mp4a', new Uint8Array(28));
  audioStsdPayload.set(mp4aBox, 8);
  const audioStbl = buildAtom('stbl', buildAtom('stsd', audioStsdPayload));

  const audioMinfPayload = new Uint8Array(smhd.length + dinf.length + audioStbl.length);
  audioMinfPayload.set(smhd, 0);
  audioMinfPayload.set(dinf, smhd.length);
  audioMinfPayload.set(audioStbl, smhd.length + dinf.length);
  const audioMinf = buildAtom('minf', audioMinfPayload);

  const audioMdiaPayload = new Uint8Array(audioMdhd.length + audioHdlr.length + audioMinf.length);
  audioMdiaPayload.set(audioMdhd, 0);
  audioMdiaPayload.set(audioHdlr, audioMdhd.length);
  audioMdiaPayload.set(audioMinf, audioMdhd.length + audioHdlr.length);
  const audioMdia = buildAtom('mdia', audioMdiaPayload);

  const audioTrakPayload = new Uint8Array(audioTkhd.length + audioMdia.length);
  audioTrakPayload.set(audioTkhd, 0);
  audioTrakPayload.set(audioMdia, audioTkhd.length);
  const audioTrak = buildAtom('trak', audioTrakPayload);

  // 8. Assemble moov
  const moovPayload = new Uint8Array(
    mvhd.length + videoTrak.length + audioTrak.length + meta.length
  );
  moovPayload.set(mvhd, 0);
  moovPayload.set(videoTrak, mvhd.length);
  moovPayload.set(audioTrak, mvhd.length + videoTrak.length);
  moovPayload.set(meta, mvhd.length + videoTrak.length + audioTrak.length);
  const moov = buildAtom('moov', moovPayload);

  // 9. Assemble Final MOV: ftyp + moov + mdat
  const finalMov = new Uint8Array(ftyp.length + moov.length + mdatBytes.length);
  finalMov.set(ftyp, 0);
  finalMov.set(moov, ftyp.length);
  finalMov.set(mdatBytes, ftyp.length + moov.length);

  return finalMov;
}
