/**
 * Metadata type definitions for ToRayBan_Converter
 */

export interface RayBanExifOptions {
  make?: string;                  // Default: "Luxottica"
  model?: string;                 // Default: "Ray-Ban Meta Smart Glasses"
  software?: string;              // Default: "Meta View"
  lensMake?: string;              // Default: "Luxottica"
  lensModel?: string;             // Default: "Ray-Ban Meta Smart Glasses"
  fNumber?: [number, number] | number;     // Default: [22, 10] (f/2.2)
  focalLength?: [number, number] | number; // Default: [22, 10] (2.2mm)
  focalLength35mm?: number;       // Default: 15 (15mm equivalent)
  iso?: number;                   // Default: 100
  exposureTime?: [number, number];// Default: [1, 120] (1/120s)
  dateTime?: Date;                // Default: new Date()
  width?: number;                 // Default: 1376 (or 3024)
  height?: number;                // Default: 1840 (or 4032)
}

export interface QuickTimeMetadata {
  model: string;          // Default: "Ray-Ban Meta Smart Glasses 2"
  make: string;           // Default: "Luxottica"
  software: string;       // Default: "Meta View"
  comment: string;        // Default: "app=Meta AI&device=Ray-Ban Meta Smart Glasses 2&id=..."
  copyright: string;      // Default: "Meta AI"
  creationDate: string;   // ISO 8601 UTC string (e.g. "2026-09-03T06:15:00Z")
}

export type MediaFormat = 'jpeg' | 'png' | 'webp' | 'mov' | 'mp4' | 'webm' | 'gif' | 'unknown';

export interface ExtractedMetadata {
  format: MediaFormat;
  dimensions?: { width: number; height: number };
  make?: string;
  model?: string;
  software?: string;
  lensModel?: string;
  fNumber?: number;
  focalLength?: number;
  iso?: number;
  dateTime?: string;
  hasGps: boolean;
  quickTime?: {
    majorBrand?: string;
    movieTimescale?: number;
    videoTimescale?: number;
    hasTapt: boolean;
    hasSpinViewMeta: boolean;
    metaKeys?: Record<string, string>;
  };
  rawTags: Record<string, any>;
}
