/**
 * ToRayBan_Converter - Authentic JPEG EXIF & TIFF Metadata Injector
 * Pure TypeScript binary engine injecting Ray-Ban Meta Smart Glasses hardware,
 * optics, and software tags while stripping private data and GPS coordinates.
 */

import { RayBanExifOptions } from '@/types/metadata';
import { bufferToDataUrl, dataUrlToUint8Array } from './media_utils';

// TIFF Data Types
const TYPE_BYTE = 1;
const TYPE_ASCII = 2;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const TYPE_UNDEFINED = 7;
const TYPE_SRATIONAL = 10;

interface IFDEntryDef {
  tag: number;
  type: number;
  count: number;
  data: number | string | number[] | [number, number] | [number, number][] | Uint8Array;
}

/**
 * Formats a JavaScript Date into EXIF standard "YYYY:MM:DD HH:MM:SS" string.
 */
export function formatExifDate(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Builds a binary TIFF APP1 payload for Ray-Ban Meta Smart Glasses.
 */
export function buildRayBanTiffPayload(options: RayBanExifOptions = {}): Uint8Array {
  const make = options.make ?? 'Meta AI';
  const model = options.model ?? 'Ray-Ban Meta Smart Glasses 2';
  const software = options.software ?? 'Meta View';
  const lensMake = options.lensMake ?? 'Luxottica';
  const lensModel = options.lensModel ?? 'Ray-Ban Meta Smart Glasses 2';
  const width = options.width ?? 3024;
  const height = options.height ?? 4032;
  const iso = options.iso ?? 100;
  const fNumber = Array.isArray(options.fNumber) ? options.fNumber : [22, 10];
  const focalLength = Array.isArray(options.focalLength) ? options.focalLength : [22, 10];
  const focal35 = options.focalLength35mm ?? 15;
  const exposureTime = options.exposureTime ?? [1, 120];
  const dateStr = formatExifDate(options.dateTime ?? new Date());

  // 1. Prepare 0th IFD entries (must be sorted in ascending order by tag)
  const ifd0Entries: IFDEntryDef[] = [
    { tag: 0x010f, type: TYPE_ASCII, count: make.length + 1, data: make + '\0' }, // Make
    { tag: 0x0110, type: TYPE_ASCII, count: model.length + 1, data: model + '\0' }, // Model
    { tag: 0x0112, type: TYPE_SHORT, count: 1, data: 1 }, // Orientation
    { tag: 0x011a, type: TYPE_RATIONAL, count: 1, data: [72, 1] }, // XResolution
    { tag: 0x011b, type: TYPE_RATIONAL, count: 1, data: [72, 1] }, // YResolution
    { tag: 0x0128, type: TYPE_SHORT, count: 1, data: 2 }, // ResolutionUnit (Inches)
    { tag: 0x0131, type: TYPE_ASCII, count: software.length + 1, data: software + '\0' }, // Software
    { tag: 0x0132, type: TYPE_ASCII, count: dateStr.length + 1, data: dateStr + '\0' }, // DateTime
    { tag: 0x8769, type: TYPE_LONG, count: 1, data: 0 }, // ExifIFDPointer (offset computed later)
  ].sort((a, b) => a.tag - b.tag);

  // 2. Prepare Exif SubIFD entries (must be sorted in ascending order by tag)
  const exifSubEntries: IFDEntryDef[] = [
    { tag: 0x829a, type: TYPE_RATIONAL, count: 1, data: exposureTime }, // ExposureTime
    { tag: 0x829d, type: TYPE_RATIONAL, count: 1, data: fNumber }, // FNumber
    { tag: 0x8822, type: TYPE_SHORT, count: 1, data: 2 }, // ExposureProgram (Normal)
    { tag: 0x8827, type: TYPE_SHORT, count: 1, data: iso }, // ISOSpeedRatings
    {
      tag: 0x9000,
      type: TYPE_UNDEFINED,
      count: 4,
      data: new Uint8Array([0x30, 0x32, 0x33, 0x32]),
    }, // ExifVersion "0232"
    { tag: 0x9003, type: TYPE_ASCII, count: dateStr.length + 1, data: dateStr + '\0' }, // DateTimeOriginal
    { tag: 0x9004, type: TYPE_ASCII, count: dateStr.length + 1, data: dateStr + '\0' }, // DateTimeDigitized
    { tag: 0x9201, type: TYPE_SRATIONAL, count: 1, data: [690, 100] }, // ShutterSpeedValue (log2)
    { tag: 0x9202, type: TYPE_RATIONAL, count: 1, data: [227, 100] }, // ApertureValue (log2)
    { tag: 0x9204, type: TYPE_SRATIONAL, count: 1, data: [0, 1] }, // ExposureBiasValue
    { tag: 0x9207, type: TYPE_SHORT, count: 1, data: 2 }, // MeteringMode
    { tag: 0x9208, type: TYPE_SHORT, count: 1, data: 0 }, // LightSource
    { tag: 0x9209, type: TYPE_SHORT, count: 1, data: 0 }, // Flash
    { tag: 0x920a, type: TYPE_RATIONAL, count: 1, data: focalLength }, // FocalLength
    { tag: 0xa001, type: TYPE_SHORT, count: 1, data: 1 }, // ColorSpace (sRGB)
    { tag: 0xa002, type: TYPE_LONG, count: 1, data: width }, // PixelXDimension
    { tag: 0xa003, type: TYPE_LONG, count: 1, data: height }, // PixelYDimension
    { tag: 0xa302, type: TYPE_SHORT, count: 1, data: 0 }, // SceneCaptureType
    { tag: 0xa405, type: TYPE_SHORT, count: 1, data: focal35 }, // FocalLengthIn35mmFilm
    { tag: 0xa433, type: TYPE_ASCII, count: lensMake.length + 1, data: lensMake + '\0' }, // LensMake
    { tag: 0xa434, type: TYPE_ASCII, count: lensModel.length + 1, data: lensModel + '\0' }, // LensModel
  ].sort((a, b) => a.tag - b.tag);

  // 3. Calculate Layout Offsets
  // TIFF Header: 8 bytes
  // IFD0: 2 (count) + ifd0Entries.length * 12 + 4 (next offset = 0)
  const ifd0Start = 8;
  const ifd0Size = 2 + ifd0Entries.length * 12 + 4;
  const exifSubStart = ifd0Start + ifd0Size;
  const exifSubSize = 2 + exifSubEntries.length * 12 + 4;
  let dataPoolStart = exifSubStart + exifSubSize;

  // Set ExifIFD pointer in IFD0
  const exifPtrEntry = ifd0Entries.find((e) => e.tag === 0x8769);
  if (exifPtrEntry) {
    exifPtrEntry.data = exifSubStart;
  }

  // Pre-calculate data buffer size
  const dataBlobs: { offset: number; bytes: Uint8Array }[] = [];
  let currentDataOffset = dataPoolStart;

  const processEntry = (entry: IFDEntryDef) => {
    let rawBytes: Uint8Array | null = null;

    if (entry.type === TYPE_ASCII) {
      const str = typeof entry.data === 'string' ? entry.data : '';
      const b = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) b[i] = str.charCodeAt(i);
      rawBytes = b;
    } else if (entry.type === TYPE_RATIONAL || entry.type === TYPE_SRATIONAL) {
      const isSigned = entry.type === TYPE_SRATIONAL;
      const val = entry.data as [number, number];
      const b = new Uint8Array(8);
      const dv = new DataView(b.buffer);
      if (isSigned) {
        dv.setInt32(0, val[0], true);
        dv.setInt32(4, val[1], true);
      } else {
        dv.setUint32(0, val[0], true);
        dv.setUint32(4, val[1], true);
      }
      rawBytes = b;
    } else if (entry.type === TYPE_UNDEFINED) {
      rawBytes = entry.data as Uint8Array;
    }

    if (rawBytes && rawBytes.length > 4) {
      dataBlobs.push({ offset: currentDataOffset, bytes: rawBytes });
      const allocatedOffset = currentDataOffset;
      currentDataOffset += rawBytes.length + (rawBytes.length % 2); // align to even byte boundary
      return allocatedOffset;
    }
    return null;
  };

  const ifd0Offsets = ifd0Entries.map(processEntry);
  const exifOffsets = exifSubEntries.map(processEntry);

  const totalTiffSize = currentDataOffset;
  const tiffBuffer = new Uint8Array(totalTiffSize);
  const view = new DataView(tiffBuffer.buffer);

  // Write TIFF Header (Little-Endian 'II')
  tiffBuffer[0] = 0x49; // 'I'
  tiffBuffer[1] = 0x49; // 'I'
  view.setUint16(2, 42, true); // Magic 42
  view.setUint32(4, ifd0Start, true); // Offset of IFD0

  // Helper to write IFD
  const writeIFD = (
    entries: IFDEntryDef[],
    offsets: (number | null)[],
    startOffset: number
  ) => {
    view.setUint16(startOffset, entries.length, true);
    let entryOffset = startOffset + 2;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const dataOffset = offsets[i];

      view.setUint16(entryOffset, entry.tag, true);
      view.setUint16(entryOffset + 2, entry.type, true);
      view.setUint32(entryOffset + 4, entry.count, true);

      if (dataOffset !== null) {
        // Stored in data area
        view.setUint32(entryOffset + 8, dataOffset, true);
      } else {
        // Stored inline in 4 bytes
        if (entry.type === TYPE_SHORT) {
          view.setUint16(entryOffset + 8, entry.data as number, true);
          view.setUint16(entryOffset + 10, 0, true);
        } else if (entry.type === TYPE_LONG) {
          view.setUint32(entryOffset + 8, entry.data as number, true);
        } else if (entry.type === TYPE_UNDEFINED) {
          const b = entry.data as Uint8Array;
          for (let j = 0; j < b.length && j < 4; j++) {
            tiffBuffer[entryOffset + 8 + j] = b[j];
          }
        } else if (entry.type === TYPE_BYTE) {
          view.setUint8(entryOffset + 8, entry.data as number);
        }
      }
      entryOffset += 12;
    }
    // Next IFD Offset = 0
    view.setUint32(entryOffset, 0, true);
  };

  // Write IFD0 & ExifSubIFD
  writeIFD(ifd0Entries, ifd0Offsets, ifd0Start);
  writeIFD(exifSubEntries, exifOffsets, exifSubStart);

  // Write Data Blobs
  for (const blob of dataBlobs) {
    tiffBuffer.set(blob.bytes, blob.offset);
  }

  // Wrap in APP1 Marker + Length + "Exif\0\0"
  const app1PayloadLen = 6 + tiffBuffer.length;
  const app1Segment = new Uint8Array(4 + app1PayloadLen);
  const app1View = new DataView(app1Segment.buffer);

  app1Segment[0] = 0xff;
  app1Segment[1] = 0xe1; // APP1
  app1View.setUint16(2, app1PayloadLen + 2, false); // Length (Big-Endian)

  // Exif\0\0
  app1Segment[4] = 0x45; // E
  app1Segment[5] = 0x78; // x
  app1Segment[6] = 0x69; // i
  app1Segment[7] = 0x66; // f
  app1Segment[8] = 0x00;
  app1Segment[9] = 0x00;

  app1Segment.set(tiffBuffer, 10);
  return app1Segment;
}

/**
 * Injects authentic Ray-Ban Meta Smart Glasses EXIF into a raw JPEG buffer or Base64 Data URL.
 */
export function injectRayBanExif(
  input: Uint8Array | string,
  options?: RayBanExifOptions
): Uint8Array | string {
  const isStringInput = typeof input === 'string';
  const jpegBytes = isStringInput ? dataUrlToUint8Array(input) : input;

  const resultBuffer = injectRayBanExifBuffer(jpegBytes, options);

  if (isStringInput) {
    return bufferToDataUrl(resultBuffer, 'image/jpeg');
  }
  return resultBuffer;
}

/**
 * Pure binary JPEG injector guaranteeing Uint8Array output.
 */
export function injectRayBanExifBuffer(
  jpegBuffer: Uint8Array,
  options?: RayBanExifOptions
): Uint8Array {
  if (jpegBuffer.length < 2 || jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) {
    throw new Error('Invalid JPEG: Missing SOI marker (0xFFD8)');
  }

  const syntheticApp1 = buildRayBanTiffPayload(options);

  // If buffer is just SOI/EOI (2 or 4 bytes)
  if (jpegBuffer.length <= 4) {
    const out = new Uint8Array(2 + syntheticApp1.length + 2);
    out[0] = 0xff;
    out[1] = 0xd8; // SOI
    out.set(syntheticApp1, 2);
    out[out.length - 2] = 0xff;
    out[out.length - 1] = 0xd9; // EOI
    return out;
  }

  // Scan segments and strip existing APP1 (0xFFE1), APP2 (0xFFE2), APP13 (0xFFED)
  const remainingChunks: Uint8Array[] = [];
  let offset = 2;

  while (offset < jpegBuffer.length - 1) {
    if (jpegBuffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = (jpegBuffer[offset] << 8) | jpegBuffer[offset + 1];

    // EOI or SOS (start of scan - rest is image bitstream)
    if (marker === 0xffd9 || marker === 0xffda) {
      remainingChunks.push(jpegBuffer.subarray(offset));
      break;
    }

    // Standalone markers without length
    if (
      (marker >= 0xffd0 && marker <= 0xffd7) ||
      marker === 0xff01 ||
      marker === 0xff00
    ) {
      remainingChunks.push(jpegBuffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > jpegBuffer.length) {
      remainingChunks.push(jpegBuffer.subarray(offset));
      break;
    }

    const segLen = (jpegBuffer[offset + 2] << 8) | jpegBuffer[offset + 3];
    const segEnd = Math.min(jpegBuffer.length, offset + 2 + segLen);

    // Strip old APP1, APP2, APP13 markers
    if (marker !== 0xffe1 && marker !== 0xffe2 && marker !== 0xffed) {
      remainingChunks.push(jpegBuffer.subarray(offset, segEnd));
    }

    offset = segEnd;
  }

  // Calculate total buffer size: SOI (2) + syntheticApp1 + remainingChunks
  let totalSize = 2 + syntheticApp1.length;
  for (const chunk of remainingChunks) {
    totalSize += chunk.length;
  }

  const finalJpeg = new Uint8Array(totalSize);
  finalJpeg[0] = 0xff;
  finalJpeg[1] = 0xd8; // SOI
  finalJpeg.set(syntheticApp1, 2);

  let writePos = 2 + syntheticApp1.length;
  for (const chunk of remainingChunks) {
    finalJpeg.set(chunk, writePos);
    writePos += chunk.length;
  }

  return finalJpeg;
}

/**
 * Extracts and decodes EXIF tags from a JPEG buffer into a key-value record.
 */
export function extractExif(jpegBuffer: Uint8Array): Record<string, any> {
  const result: Record<string, any> = {
    '0th': {},
    Exif: {},
    GPS: {},
  };

  if (!jpegBuffer || jpegBuffer.length < 4 || jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) {
    return result;
  }

  let offset = 2;
  while (offset < jpegBuffer.length - 4) {
    if (jpegBuffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = (jpegBuffer[offset] << 8) | jpegBuffer[offset + 1];
    if (marker === 0xffd9 || marker === 0xffda) break;

    if ((marker >= 0xffd0 && marker <= 0xffd7) || marker === 0xff01) {
      offset += 2;
      continue;
    }

    const segLen = (jpegBuffer[offset + 2] << 8) | jpegBuffer[offset + 3];
    if (marker === 0xffe1) {
      const app1 = jpegBuffer.subarray(offset + 4, offset + 2 + segLen);
      if (
        app1.length >= 14 &&
        app1[0] === 0x45 &&
        app1[1] === 0x78 &&
        app1[2] === 0x69 &&
        app1[3] === 0x66 &&
        app1[4] === 0x00 &&
        app1[5] === 0x00
      ) {
        parseTiffBlock(app1.subarray(6), result);
      }
    }
    offset += 2 + segLen;
  }

  // Populate top-level friendly convenience keys
  if (result['0th']) {
    if (result['0th'][0x010f]) result.Make = result['0th'][0x010f];
    if (result['0th'][0x0110]) result.Model = result['0th'][0x0110];
    if (result['0th'][0x0131]) result.Software = result['0th'][0x0131];
    if (result['0th'][0x0132]) result.DateTime = result['0th'][0x0132];
    if (result['0th'][0x0112]) result.Orientation = result['0th'][0x0112];
  }

  if (result.Exif) {
    if (result.Exif[0x829d]) {
      const f = result.Exif[0x829d];
      result.FNumber = Array.isArray(f) && f.length === 2 && f[1] !== 0 ? f[0] / f[1] : f;
    }
    if (result.Exif[0x920a]) {
      const f = result.Exif[0x920a];
      result.FocalLength = Array.isArray(f) && f.length === 2 && f[1] !== 0 ? f[0] / f[1] : f;
    }
    if (result.Exif[0xa405]) result.FocalLengthIn35mmFilm = result.Exif[0xa405];
    if (result.Exif[0x8827]) result.ISOSpeedRatings = result.Exif[0x8827];
    if (result.Exif[0xa434]) result.LensModel = result.Exif[0xa434];
    if (result.Exif[0xa433]) result.LensMake = result.Exif[0xa433];
    if (result.Exif[0xa002]) result.PixelXDimension = result.Exif[0xa002];
    if (result.Exif[0xa003]) result.PixelYDimension = result.Exif[0xa003];
  }

  return result;
}

function parseTiffBlock(tiffData: Uint8Array, out: Record<string, any>): void {
  if (tiffData.length < 8) return;
  const isLittle = tiffData[0] === 0x49 && tiffData[1] === 0x49;
  const isBig = tiffData[0] === 0x4d && tiffData[1] === 0x4d;
  if (!isLittle && !isBig) return;

  const view = new DataView(tiffData.buffer, tiffData.byteOffset, tiffData.byteLength);
  const magic = view.getUint16(2, isLittle);
  if (magic !== 42) return;

  const ifd0Offset = view.getUint32(4, isLittle);
  if (ifd0Offset >= tiffData.length) return;

  const { exifOffset, gpsOffset } = parseIFD(tiffData, view, ifd0Offset, isLittle, out['0th']);

  if (exifOffset && exifOffset < tiffData.length) {
    parseIFD(tiffData, view, exifOffset, isLittle, out.Exif);
  }

  if (gpsOffset && gpsOffset < tiffData.length) {
    parseIFD(tiffData, view, gpsOffset, isLittle, out.GPS);
  }
}

function parseIFD(
  tiffData: Uint8Array,
  view: DataView,
  offset: number,
  isLittle: boolean,
  targetObj: Record<number, any>
): { exifOffset?: number; gpsOffset?: number } {
  let exifOffset: number | undefined;
  let gpsOffset: number | undefined;

  if (offset + 2 > tiffData.length) return {};
  const numEntries = view.getUint16(offset, isLittle);
  let entryPos = offset + 2;

  for (let i = 0; i < numEntries; i++) {
    if (entryPos + 12 > tiffData.length) break;

    const tag = view.getUint16(entryPos, isLittle);
    const type = view.getUint16(entryPos + 2, isLittle);
    const count = view.getUint32(entryPos + 4, isLittle);

    let val: any;

    if (type === TYPE_BYTE) {
      val = count === 1 ? view.getUint8(entryPos + 8) : count;
    } else if (type === TYPE_SHORT) {
      val = count === 1 ? view.getUint16(entryPos + 8, isLittle) : count;
    } else if (type === TYPE_LONG) {
      val = view.getUint32(entryPos + 8, isLittle);
      if (tag === 0x8769) exifOffset = val;
      if (tag === 0x8825) gpsOffset = val;
    } else if (type === TYPE_ASCII) {
      const dataOffset = count > 4 ? view.getUint32(entryPos + 8, isLittle) : entryPos + 8;
      if (dataOffset + count <= tiffData.length) {
        let str = '';
        for (let j = 0; j < count; j++) {
          const ch = tiffData[dataOffset + j];
          if (ch === 0) break;
          str += String.fromCharCode(ch);
        }
        val = str;
      }
    } else if (type === TYPE_RATIONAL || type === TYPE_SRATIONAL) {
      const isSigned = type === TYPE_SRATIONAL;
      const dataOffset = view.getUint32(entryPos + 8, isLittle);
      if (dataOffset + 8 <= tiffData.length) {
        const num = isSigned
          ? view.getInt32(dataOffset, isLittle)
          : view.getUint32(dataOffset, isLittle);
        const den = isSigned
          ? view.getInt32(dataOffset + 4, isLittle)
          : view.getUint32(dataOffset + 4, isLittle);
        val = [num, den];
      }
    } else if (type === TYPE_UNDEFINED) {
      val = 'UNDEFINED';
    }

    targetObj[tag] = val;
    entryPos += 12;
  }

  return { exifOffset, gpsOffset };
}
