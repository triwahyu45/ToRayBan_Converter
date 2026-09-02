/**
 * Converter pipeline state and telemetry type definitions
 */

import { ExtractedMetadata, MediaFormat } from './metadata';

export type MediaKind = 'image' | 'video';

export type ConversionStatus =
  | 'idle'
  | 'loading'
  | 'cropping'
  | 'transcoding'
  | 'synthesizing'
  | 'completed'
  | 'error';

export interface CropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropConfig {
  mode: 'center' | 'custom' | 'blur_fill';
  zoom: number; // 1.0 to 3.0
  panX: number; // -1.0 to 1.0
  panY: number; // -1.0 to 1.0
  rotation: number; // 0, 90, 180, 270
}

export interface VideoConversionTelemetry {
  phase: 'init' | 'demux' | 'transcoding' | 'synthesizing' | 'completed' | 'error';
  percent: number;
  currentFrame: number;
  fps: number;
  speed: number;
  currentTimeSec: number;
  totalDurationSec: number;
  elapsedSec: number;
  etaSec: number;
  bitrate: string;
  logLine: string;
}

export interface ConversionResult {
  blob: Blob;
  url: string;
  filename: string;
  format: 'jpeg' | 'mov';
  size: number;
  width: number;
  height: number;
  duration?: number;
}

export interface StagedMediaFile {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  type: MediaKind;
  format: MediaFormat;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  aspectRatioLabel: string; // e.g. "16:9 Landscape", "9:16 Portrait", "1:1 Square"
  durationSeconds?: number;
  formattedDuration?: string; // e.g. "00:15.4" or "Still Photo"
  previewUrl: string;
  thumbnailUrl: string;
  detectedMetadata?: ExtractedMetadata;
  createdAt: number;
}

export interface DropzoneState {
  isDraggingOver: boolean;
  isValidating: boolean;
  validationProgress: number; // 0 - 100
  validationStatusText: string;
  validationError: string | null;
  stagedMedia: StagedMediaFile | null;
}

export interface UseDropzoneOptions {
  maxVideoSizeBytes?: number; // Default 500MB (524,288,000 bytes)
  maxImageSizeBytes?: number; // Default 50MB (52,428,800 bytes)
  maxVideoDurationSec?: number; // Default 180 seconds
  onFileAccepted?: (staged: StagedMediaFile) => void;
  onFileRejected?: (errorMessage: string) => void;
  autoRevokeUrls?: boolean;
}

export interface ConverterLog {
  id: string;
  timestamp: string;
  level: 'info' | 'ffmpeg' | 'atom' | 'exif' | 'warn' | 'error';
  message: string;
}
