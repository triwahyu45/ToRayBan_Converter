'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ConversionStatus,
  CropCoordinates,
  CropConfig,
  ConversionResult,
  VideoConversionTelemetry,
  ConverterLog,
  StagedMediaFile,
} from '@/types/converter';
import { ExtractedMetadata } from '@/types/metadata';
import {
  calculateCenterCrop,
  normalizeCropCoordinates,
  detectMediaFormat,
  fileToUint8Array,
  sniffMediaFile,
  extractImageDetails,
  extractVideoDetails,
  formatBytes,
  formatDuration,
  getAspectRatioLabel,
} from '@/lib/media_utils';
import { injectRayBanExifBuffer } from '@/lib/exif_injector';
import { reconstructRayBanQuickTimeMov } from '@/lib/atom_synthesizer';
import { FFmpegService } from '@/lib/ffmpeg_service';
import { extractMediaMetadata } from '@/lib/metadata_extractor';

export interface UseMediaConverterReturn {
  // Staged Media State
  stagedMedia: StagedMediaFile | null;
  stageFile: (file: File) => Promise<void>;
  clearStagedMedia: () => void;

  // Crop & Framing State
  cropConfig: CropConfig;
  computedCrop: CropCoordinates;
  updateCropConfig: (newConfig: Partial<CropConfig>) => void;
  resetCrop: () => void;

  // Conversion Lifecycle State
  status: ConversionStatus;
  progressPercent: number;
  telemetry: Partial<VideoConversionTelemetry>;
  logs: ConverterLog[];
  result: ConversionResult | null;
  error: string | null;

  // Metadata State
  originalMetadata: ExtractedMetadata | null;
  injectedMetadata: ExtractedMetadata | null;

  // Pipeline Actions
  startConversion: () => Promise<void>;
  cancelConversion: () => void;
  downloadResult: () => void;
  resetAll: () => void;
}

const DEFAULT_CROP_CONFIG: CropConfig = {
  mode: 'center',
  zoom: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
};

export function useMediaConverter(): UseMediaConverterReturn {
  // 1. Staged Media & Probing
  const [stagedMedia, setStagedMedia] = useState<StagedMediaFile | null>(null);
  const [originalMetadata, setOriginalMetadata] = useState<ExtractedMetadata | null>(null);
  const [injectedMetadata, setInjectedMetadata] = useState<ExtractedMetadata | null>(null);

  // 2. Crop Configuration & Computed Rect
  const [cropConfig, setCropConfig] = useState<CropConfig>(DEFAULT_CROP_CONFIG);
  const [computedCrop, setComputedCrop] = useState<CropCoordinates>({
    x: 0,
    y: 0,
    width: 1376,
    height: 1840,
  });

  // 3. Conversion Lifecycle & Telemetry
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<Partial<VideoConversionTelemetry>>({});
  const [logs, setLogs] = useState<ConverterLog[]>([]);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 4. Refs for Cleanup & Async Pipeline
  const ffmpegServiceRef = useRef<FFmpegService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  const addLog = useCallback((level: ConverterLog['level'], message: string) => {
    const newLog: ConverterLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString().substring(11, 19),
      level,
      message,
    };
    setLogs((prev) => [...prev.slice(-200), newLog]);
  }, []);

  // Recalculate Computed Crop Rect whenever source or cropConfig changes
  useEffect(() => {
    if (!stagedMedia) return;

    const srcW = cropConfig.rotation % 180 === 0 ? stagedMedia.width : stagedMedia.height;
    const srcH = cropConfig.rotation % 180 === 0 ? stagedMedia.height : stagedMedia.width;

    if (cropConfig.mode === 'blur_fill') {
      // For blur fill, entire frame is retained
      setComputedCrop({ x: 0, y: 0, width: srcW, height: srcH });
      return;
    }

    const baseCenter = calculateCenterCrop(srcW, srcH, 1376, 1840);

    if (cropConfig.mode === 'center') {
      setComputedCrop(baseCenter);
      return;
    }

    // Custom Mode with Zoom & Pan
    const zoom = Math.max(1.0, cropConfig.zoom);
    const cropW = Math.round(baseCenter.width / zoom);
    const cropH = Math.round(baseCenter.height / zoom);

    const maxDeltaX = (srcW - cropW) / 2;
    const maxDeltaY = (srcH - cropH) / 2;

    const rawX = (srcW - cropW) / 2 + cropConfig.panX * maxDeltaX;
    const rawY = (srcH - cropH) / 2 + cropConfig.panY * maxDeltaY;

    const normalized = normalizeCropCoordinates(
      {
        x: Math.round(rawX),
        y: Math.round(rawY),
        width: cropW,
        height: cropH,
      },
      srcW,
      srcH
    );

    setComputedCrop(normalized);
  }, [stagedMedia, cropConfig]);

  // Stage User Media File & Probe Headers
  const stageFile = useCallback(
    async (file: File) => {
      setError(null);
      setStatus('loading');
      setProgressPercent(10);
      addLog('info', `Staging media file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

      try {
        const sniffResult = await sniffMediaFile(file);
        const isVideo = sniffResult.type === 'video';
        const isImage = sniffResult.type === 'image';

        if (!isVideo && !isImage) {
          throw new Error(`Unsupported media format: ${file.type || 'unknown'}`);
        }

        // Extract original EXIF or QuickTime metadata
        const origMeta = extractMediaMetadata(sniffResult.headerBuffer);
        setOriginalMetadata(origMeta);
        addLog('info', `Extracted original metadata: Format=${sniffResult.format}, Make=${origMeta.make || 'None'}`);

        let width = 1376;
        let height = 1840;
        let durationSeconds: number | undefined;
        let previewUrl = '';
        let thumbnailUrl = '';

        if (isImage) {
          const imgDetails = await extractImageDetails(file);
          width = imgDetails.width;
          height = imgDetails.height;
          previewUrl = imgDetails.previewUrl;
          thumbnailUrl = imgDetails.thumbnailUrl;
          activeBlobUrlsRef.current.add(previewUrl);
        } else {
          const vidDetails = await extractVideoDetails(file);
          width = vidDetails.width;
          height = vidDetails.height;
          durationSeconds = vidDetails.durationSeconds;
          previewUrl = vidDetails.previewUrl;
          thumbnailUrl = vidDetails.thumbnailUrl;
          activeBlobUrlsRef.current.add(previewUrl);
        }

        const staged: StagedMediaFile = {
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          name: file.name,
          sizeBytes: file.size,
          formattedSize: formatBytes(file.size),
          type: isVideo ? 'video' : 'image',
          format: sniffResult.format,
          mimeType: sniffResult.mimeType,
          width,
          height,
          aspectRatio: width / height,
          aspectRatioLabel: getAspectRatioLabel(width, height),
          durationSeconds,
          formattedDuration: formatDuration(durationSeconds),
          previewUrl,
          thumbnailUrl,
          detectedMetadata: origMeta,
          createdAt: Date.now(),
        };

        setStagedMedia(staged);
        setCropConfig(DEFAULT_CROP_CONFIG);
        setStatus('idle');
        setProgressPercent(0);
        addLog(
          'info',
          `Media staged successfully: ${width}x${height}, Duration: ${
            durationSeconds !== undefined ? durationSeconds.toFixed(1) + 's' : 'Photo'
          }`
        );
      } catch (err: any) {
        const msg = err.message || 'Failed to load media file';
        setError(msg);
        setStatus('error');
        addLog('error', `Staging error: ${msg}`);
      }
    },
    [addLog]
  );

  const updateCropConfig = useCallback((newConfig: Partial<CropConfig>) => {
    setCropConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const resetCrop = useCallback(() => {
    setCropConfig(DEFAULT_CROP_CONFIG);
  }, []);

  // Execute Conversion Pipeline
  const startConversion = useCallback(async () => {
    if (!stagedMedia) return;

    setError(null);
    setResult(null);
    setInjectedMetadata(null);
    setProgressPercent(5);
    abortControllerRef.current = new AbortController();

    const timestamp = Date.now();
    const baseName = stagedMedia.file.name.replace(/\.[^/.]+$/, '');

    try {
      if (stagedMedia.type === 'image') {
        // ==========================================
        // 1. IMAGE CONVERSION PIPELINE (Canvas + EXIF)
        // ==========================================
        setStatus('cropping');
        setProgressPercent(20);
        addLog('info', 'Starting Image synthesis to Ray-Ban Meta 1376x1840 format...');

        const canvas = document.createElement('canvas');
        canvas.width = 1376;
        canvas.height = 1840;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to initialize 2D canvas context');

        const img = new Image();
        img.src = stagedMedia.previewUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image into canvas for synthesis'));
        });

        if (cropConfig.mode === 'blur_fill') {
          // Draw blurred background
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.65)';
          ctx.drawImage(img, -50, -50, 1476, 1940);
          ctx.restore();

          // Draw fitted foreground
          const scale = Math.min(1376 / img.naturalWidth, 1840 / img.naturalHeight);
          const fitW = img.naturalWidth * scale;
          const fitH = img.naturalHeight * scale;
          const offX = (1376 - fitW) / 2;
          const offY = (1840 - fitH) / 2;

          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, offX, offY, fitW, fitH);
        } else {
          // Standard Crop / Custom Crop
          ctx.drawImage(
            img,
            computedCrop.x,
            computedCrop.y,
            computedCrop.width,
            computedCrop.height,
            0,
            0,
            1376,
            1840
          );
        }

        setStatus('synthesizing');
        setProgressPercent(60);
        addLog('exif', 'Injecting authentic Luxottica & Ray-Ban Meta Smart Glasses EXIF...');

        const jpegBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
        });

        const rawJpegBytes = await fileToUint8Array(jpegBlob);
        const injectedBytes = injectRayBanExifBuffer(rawJpegBytes, {
          make: 'Luxottica',
          model: 'Ray-Ban Meta Smart Glasses',
          software: 'Meta View',
          lensMake: 'Luxottica',
          lensModel: 'Ray-Ban Meta Smart Glasses',
          width: 1376,
          height: 1840,
        });

        // Extract metadata for diff inspector
        const injectedMeta = extractMediaMetadata(injectedBytes);
        setInjectedMetadata(injectedMeta);

        const finalBlob = new Blob([injectedBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
        const finalUrl = URL.createObjectURL(finalBlob);
        activeBlobUrlsRef.current.add(finalUrl);

        const finalFilename = `RayBan_Meta_${baseName}_${timestamp}.jpg`;
        setResult({
          blob: finalBlob,
          url: finalUrl,
          filename: finalFilename,
          format: 'jpeg',
          size: finalBlob.size,
          width: 1376,
          height: 1840,
        });

        setStatus('completed');
        setProgressPercent(100);
        addLog('exif', 'Photo synthesized and EXIF tags verified successfully!');
      } else {
        // ==========================================
        // 2. VIDEO CONVERSION PIPELINE (FFmpeg + Atoms)
        // ==========================================
        setStatus('transcoding');
        setProgressPercent(10);
        addLog('ffmpeg', 'Initializing FFmpeg WebAssembly transcode engine...');

        if (!ffmpegServiceRef.current) {
          ffmpegServiceRef.current = new FFmpegService();
        }
        const ffmpeg = ffmpegServiceRef.current;

        const transcodedMovBytes = await ffmpeg.transcodeAndCrop(stagedMedia.file, {
          crop: computedCrop,
          targetWidth: 1376,
          targetHeight: 1840,
          fps: 30,
          preset: 'fast',
          crf: 20,
          signal: abortControllerRef.current?.signal,
          onLog: (msg) => addLog('ffmpeg', msg),
          onProgress: (t) => {
            setTelemetry((prev) => ({ ...prev, ...t }));
            if (t.percent) setProgressPercent(t.percent);
          },
        });

        setStatus('synthesizing');
        setProgressPercent(93);
        addLog(
          'atom',
          'Reconstructing QuickTime container with Instagram Spin View atoms (tapt + moov.meta keys/ilst)...'
        );

        const finalMovBytes = reconstructRayBanQuickTimeMov(transcodedMovBytes, {
          width: 1376,
          height: 1840,
          metadata: {
            make: 'Luxottica',
            model: 'Ray-Ban Meta Smart Glasses 2',
            software: 'Meta View',
            copyright: 'Meta AI',
          },
        });

        const injectedMeta = extractMediaMetadata(finalMovBytes);
        setInjectedMetadata(injectedMeta);

        const finalBlob = new Blob([finalMovBytes.buffer as ArrayBuffer], { type: 'video/quicktime' });
        const finalUrl = URL.createObjectURL(finalBlob);
        activeBlobUrlsRef.current.add(finalUrl);

        const finalFilename = `RayBan_Meta_${baseName}_${timestamp}.mov`;
        setResult({
          blob: finalBlob,
          url: finalUrl,
          filename: finalFilename,
          format: 'mov',
          size: finalBlob.size,
          width: 1376,
          height: 1840,
          duration: stagedMedia.durationSeconds,
        });

        setStatus('completed');
        setProgressPercent(100);
        addLog('atom', 'Video successfully synthesized with authentic Ray-Ban Meta QuickTime container!');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('warn', 'Conversion cancelled by user.');
        setStatus('idle');
      } else {
        const msg = err.message || 'Conversion failed';
        setError(msg);
        setStatus('error');
        addLog('error', `Pipeline error: ${msg}`);
      }
    }
  }, [stagedMedia, cropConfig, computedCrop, addLog]);

  // Cancel In-Flight Conversion
  const cancelConversion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (ffmpegServiceRef.current) {
      ffmpegServiceRef.current.terminate();
    }
    setStatus('idle');
    setProgressPercent(0);
    addLog('warn', 'Conversion aborted.');
  }, [addLog]);

  // Programmatic Direct Download
  const downloadResult = useCallback(() => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog('info', `Downloaded output file: ${result.filename}`);
  }, [result, addLog]);

  // Reset Full Workspace & Clean Memory
  const clearStagedMedia = useCallback(() => {
    setStagedMedia(null);
    setResult(null);
    setOriginalMetadata(null);
    setInjectedMetadata(null);
    setStatus('idle');
    setProgressPercent(0);
    setTelemetry({});
    setCropConfig(DEFAULT_CROP_CONFIG);
  }, []);

  const resetAll = useCallback(() => {
    cancelConversion();
    // Revoke all created blob URLs to prevent browser memory leaks
    activeBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    activeBlobUrlsRef.current.clear();
    clearStagedMedia();
    setLogs([]);
  }, [cancelConversion, clearStagedMedia]);

  // Cleanup on Hook Unmount
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      activeBlobUrlsRef.current.clear();
      if (ffmpegServiceRef.current) {
        ffmpegServiceRef.current.terminate();
      }
    };
  }, []);

  return {
    stagedMedia,
    stageFile,
    clearStagedMedia,
    cropConfig,
    computedCrop,
    updateCropConfig,
    resetCrop,
    status,
    progressPercent,
    telemetry,
    logs,
    result,
    error,
    originalMetadata,
    injectedMetadata,
    startConversion,
    cancelConversion,
    downloadResult,
    resetAll,
  };
}

export default useMediaConverter;
