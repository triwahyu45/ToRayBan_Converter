/**
 * QuickTime / ISO Base Media Atom Type Definitions
 */

import { QuickTimeMetadata } from './metadata';

export interface AtomNode {
  type: string;           // 4-character ASCII atom type (e.g. 'moov', 'trak')
  size: number;           // Total atom size in bytes
  offset: number;         // Byte offset in source buffer
  headerSize: number;     // 8 or 16 bytes
  children?: AtomNode[];  // Child atoms if container box
  data?: Uint8Array;      // Raw payload buffer
}

export interface ReconstructOptions {
  width?: number;         // Default: 1376
  height?: number;        // Default: 1840
  videoTimescale?: number;// Default: 600
  movieTimescale?: number;// Default: 48000
  metadata?: Partial<QuickTimeMetadata>;
}
