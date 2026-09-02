/**
 * ToRayBan_Converter - Unified Metadata Extractor
 * High-speed client-side metadata reader for images and video containers
 * powering the Before-vs-After metadata inspector diff table.
 */

import { ExtractedMetadata, MediaFormat } from '@/types/metadata';
import { detectMediaFormat } from './media_utils';
import { extractExif } from './exif_injector';
import { parseAtomHierarchy } from './atom_synthesizer';
import { AtomNode } from '@/types/atoms';

/**
 * High-speed client-side metadata reader for images and video containers.
 */
export function extractMediaMetadata(buffer: Uint8Array): ExtractedMetadata {
  const format: MediaFormat = detectMediaFormat(buffer);

  const result: ExtractedMetadata = {
    format,
    hasGps: false,
    rawTags: {},
  };

  if (!buffer || buffer.length === 0) {
    return result;
  }

  // 1. JPEG Metadata Extraction
  if (format === 'jpeg') {
    const exifData = extractExif(buffer);
    result.rawTags = exifData;

    if (exifData.Make) result.make = exifData.Make;
    if (exifData.Model) result.model = exifData.Model;
    if (exifData.Software) result.software = exifData.Software;
    if (exifData.LensModel) result.lensModel = exifData.LensModel;
    if (exifData.FNumber) result.fNumber = exifData.FNumber;
    if (exifData.FocalLength) result.focalLength = exifData.FocalLength;
    if (exifData.ISOSpeedRatings) result.iso = exifData.ISOSpeedRatings;
    if (exifData.DateTime) result.dateTime = exifData.DateTime;

    if (exifData.GPS && Object.keys(exifData.GPS).length > 0) {
      result.hasGps = true;
    }

    if (exifData.PixelXDimension && exifData.PixelYDimension) {
      result.dimensions = {
        width: exifData.PixelXDimension,
        height: exifData.PixelYDimension,
      };
    } else {
      // Parse SOF0 / SOF2 marker for image dimensions
      const dims = parseJpegDimensions(buffer);
      if (dims) result.dimensions = dims;
    }

    return result;
  }

  // 2. MOV / MP4 QuickTime Atom Tree Extraction
  if (format === 'mov' || format === 'mp4') {
    try {
      const atoms = parseAtomHierarchy(buffer);
      result.rawTags = { atomCount: atoms.length, atoms };

      let majorBrand: string | undefined;
      let movieTimescale: number | undefined;
      let videoTimescale: number | undefined;
      let hasTapt = false;
      let hasSpinViewMeta = false;
      const metaKeys: Record<string, string> = {};

      // 1. Locate ftyp
      const ftypNode = atoms.find((a) => a.type === 'ftyp');
      if (ftypNode && buffer.length >= ftypNode.offset + 12) {
        majorBrand = String.fromCharCode(
          buffer[ftypNode.offset + 8],
          buffer[ftypNode.offset + 9],
          buffer[ftypNode.offset + 10],
          buffer[ftypNode.offset + 11]
        );
      }

      // 2. Locate moov
      const moovNode = atoms.find((a) => a.type === 'moov');
      if (moovNode && moovNode.children) {
        // mvhd
        const mvhdNode = moovNode.children.find((c) => c.type === 'mvhd');
        if (mvhdNode && buffer.length >= mvhdNode.offset + 24) {
          const view = new DataView(
            buffer.buffer,
            buffer.byteOffset + mvhdNode.offset,
            mvhdNode.size
          );
          movieTimescale = view.getUint32(12 + 8, false); // header is 8 bytes, timescale at offset 12 in payload
        }

        // Search tracks
        const traks = moovNode.children.filter((c) => c.type === 'trak');
        for (const trak of traks) {
          if (!trak.children) continue;

          // Check for tapt in trak
          const taptNode = trak.children.find((c) => c.type === 'tapt');
          if (taptNode) hasTapt = true;

          // Check tkhd for dimensions
          const tkhdNode = trak.children.find((c) => c.type === 'tkhd');
          if (tkhdNode && buffer.length >= tkhdNode.offset + 84 + 8) {
            const view = new DataView(
              buffer.buffer,
              buffer.byteOffset + tkhdNode.offset,
              tkhdNode.size
            );
            // In tkhd payload, width is at 76, height at 80
            const w = view.getUint32(8 + 76, false) >> 16;
            const h = view.getUint32(8 + 80, false) >> 16;
            if (w > 0 && h > 0) {
              result.dimensions = { width: w, height: h };
            }
          }

          // Check mdia -> mdhd
          const mdiaNode = trak.children.find((c) => c.type === 'mdia');
          if (mdiaNode && mdiaNode.children) {
            const mdhdNode = mdiaNode.children.find((c) => c.type === 'mdhd');
            if (mdhdNode && buffer.length >= mdhdNode.offset + 20 + 8) {
              const view = new DataView(
                buffer.buffer,
                buffer.byteOffset + mdhdNode.offset,
                mdhdNode.size
              );
              videoTimescale = view.getUint32(8 + 12, false);
            }
          }
        }

        // Check moov.meta
        const metaNode = moovNode.children.find((c) => c.type === 'meta');
        if (metaNode && metaNode.children) {
          const keysNode = metaNode.children.find((c) => c.type === 'keys');
          const ilstNode = metaNode.children.find((c) => c.type === 'ilst');

          if (keysNode && ilstNode) {
            const parsedKeys = parseQuickTimeKeysAndIlst(buffer, keysNode, ilstNode);
            Object.assign(metaKeys, parsedKeys);
            if (metaKeys['com.apple.quicktime.model'] || metaKeys['com.apple.quicktime.comment']) {
              hasSpinViewMeta = true;
            }
            if (metaKeys['com.apple.quicktime.make']) result.make = metaKeys['com.apple.quicktime.make'];
            if (metaKeys['com.apple.quicktime.model']) result.model = metaKeys['com.apple.quicktime.model'];
            if (metaKeys['com.apple.quicktime.software']) result.software = metaKeys['com.apple.quicktime.software'];
            if (metaKeys['com.apple.quicktime.creationdate']) result.dateTime = metaKeys['com.apple.quicktime.creationdate'];
          }
        }
      }

      result.quickTime = {
        majorBrand,
        movieTimescale,
        videoTimescale,
        hasTapt,
        hasSpinViewMeta,
        metaKeys,
      };
    } catch {
      // Fallback gracefully on partial or non-standard containers
    }
    return result;
  }

  // 3. PNG Dimensions
  if (format === 'png' && buffer.length >= 24) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    result.dimensions = {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
    return result;
  }

  // 4. WebP Dimensions
  if (format === 'webp' && buffer.length >= 30) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const chunkType = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
    if (chunkType === 'VP8X' && buffer.length >= 30) {
      const width = 1 + (view.getUint32(24, true) & 0x00ffffff);
      const height = 1 + (view.getUint32(27, true) & 0x00ffffff);
      result.dimensions = { width, height };
    } else if (chunkType === 'VP8 ' && buffer.length >= 30) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      result.dimensions = { width, height };
    }
  }

  return result;
}

function parseJpegDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = (buffer[offset] << 8) | buffer[offset + 1];
    if (marker === 0xffd9 || marker === 0xffda) break;

    // SOF0 (0xFFC0) or SOF2 (0xFFC2)
    if (marker === 0xffc0 || marker === 0xffc1 || marker === 0xffc2) {
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      return { width, height };
    }

    if (offset + 4 > buffer.length) break;
    const segLen = view.getUint16(offset + 2, false);
    offset += 2 + segLen;
  }
  return null;
}

function parseQuickTimeKeysAndIlst(
  buffer: Uint8Array,
  keysNode: AtomNode,
  ilstNode: AtomNode
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!keysNode.data || !ilstNode.data) return result;

  const keysView = new DataView(
    keysNode.data.buffer,
    keysNode.data.byteOffset,
    keysNode.data.byteLength
  );
  if (keysNode.data.length < 8) return result;

  const keyCount = keysView.getUint32(4, false);
  const keyList: string[] = [];
  let kPos = 8;
  const decoder = new TextDecoder();

  for (let i = 0; i < keyCount && kPos + 8 <= keysNode.data.length; i++) {
    const entryLen = keysView.getUint32(kPos, false);
    if (entryLen < 8 || kPos + entryLen > keysNode.data.length) break;
    const keyNameBytes = keysNode.data.subarray(kPos + 8, kPos + entryLen);
    keyList.push(decoder.decode(keyNameBytes));
    kPos += entryLen;
  }

  // Parse ilst items: each item has [size (4), 1-based index (4), data_atom...]
  const ilstBuffer = ilstNode.data;
  const ilstView = new DataView(
    ilstBuffer.buffer,
    ilstBuffer.byteOffset,
    ilstBuffer.byteLength
  );
  let itemPos = 0;

  while (itemPos + 8 <= ilstBuffer.length) {
    const itemSize = ilstView.getUint32(itemPos, false);
    if (itemSize < 8 || itemPos + itemSize > ilstBuffer.length) break;

    const itemIdx = ilstView.getUint32(itemPos + 4, false);
    if (itemIdx >= 1 && itemIdx <= keyList.length) {
      const keyName = keyList[itemIdx - 1];

      // Look for data atom at offset itemPos + 8
      if (itemPos + 24 <= ilstBuffer.length) {
        const dataSize = ilstView.getUint32(itemPos + 8, false);
        const dataTag = String.fromCharCode(
          ilstBuffer[itemPos + 12],
          ilstBuffer[itemPos + 13],
          ilstBuffer[itemPos + 14],
          ilstBuffer[itemPos + 15]
        );
        if (dataTag === 'data' && dataSize >= 16) {
          const valEnd = Math.min(itemPos + 8 + dataSize, ilstBuffer.length);
          const valBytes = ilstBuffer.subarray(itemPos + 24, valEnd);
          result[keyName] = decoder.decode(valBytes);
        }
      }
    }
    itemPos += itemSize;
  }

  return result;
}

