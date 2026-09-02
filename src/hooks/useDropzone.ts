'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { StagedMediaFile, UseDropzoneOptions } from '@/types/converter';
import {
  sniffMediaFile,
  extractImageDetails,
  extractVideoDetails,
  formatBytes,
  formatDuration,
  getAspectRatioLabel,
} from '@/lib/media_utils';
import { extractMediaMetadata } from '@/lib/metadata_extractor';

const DEFAULT_MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50 MB
const DEFAULT_MAX_VIDEO_DURATION = 180;          // 180 seconds

export function useDropzone(options: UseDropzoneOptions = {}) {
  const {
    maxVideoSizeBytes = DEFAULT_MAX_VIDEO_SIZE,
    maxImageSizeBytes = DEFAULT_MAX_IMAGE_SIZE,
    maxVideoDurationSec = DEFAULT_MAX_VIDEO_DURATION,
    onFileAccepted,
    onFileRejected,
  } = options;

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationStatusText, setValidationStatusText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [stagedMedia, setStagedMedia] = useState<StagedMediaFile | null>(null);

  // Drag counter ref to handle nested element enter/leave smoothly
  const dragCounterRef = useRef(0);
  const activeUrlsRef = useRef<Set<string>>(new Set());

  // Revoke allocated Object URLs on unmount or replace
  const cleanupUrls = useCallback(() => {
    activeUrlsRef.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    activeUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, [cleanupUrls]);

  /**
   * Main asynchronous pipeline to validate and stage a File
   */
  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;

      setValidationError(null);
      setIsValidating(true);
      setValidationProgress(15);
      setValidationStatusText('Sniffing media magic bytes...');

      try {
        // Step 1: Sniff format and validate basic limits
        const sniffResult = await sniffMediaFile(file);
        setValidationProgress(40);

        if (sniffResult.type === 'image' && file.size > maxImageSizeBytes) {
          throw new Error(
            `Image size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxImageSizeBytes)}.`
          );
        }

        if (sniffResult.type === 'video' && file.size > maxVideoSizeBytes) {
          throw new Error(
            `Video size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxVideoSizeBytes)}.`
          );
        }

        setValidationStatusText(`Extracting ${sniffResult.type} metadata & telemetry...`);
        setValidationProgress(65);

        // Step 2: Extract spatial dimensions and thumbnail
        let width = 1376;
        let height = 1840;
        let aspectRatio = 1376 / 1840;
        let durationSeconds: number | undefined;
        let previewUrl = '';
        let thumbnailUrl = '';

        if (sniffResult.type === 'image') {
          const imgDetails = await extractImageDetails(file);
          width = imgDetails.width;
          height = imgDetails.height;
          aspectRatio = imgDetails.aspectRatio;
          previewUrl = imgDetails.previewUrl;
          thumbnailUrl = imgDetails.thumbnailUrl;
          activeUrlsRef.current.add(previewUrl);
        } else if (sniffResult.type === 'video') {
          const vidDetails = await extractVideoDetails(file);
          width = vidDetails.width;
          height = vidDetails.height;
          durationSeconds = vidDetails.durationSeconds;
          aspectRatio = vidDetails.aspectRatio;
          previewUrl = vidDetails.previewUrl;
          thumbnailUrl = vidDetails.thumbnailUrl;
          activeUrlsRef.current.add(previewUrl);

          if (durationSeconds > maxVideoDurationSec) {
            throw new Error(
              `Video duration (${formatDuration(durationSeconds)}) exceeds recommended limit of ${maxVideoDurationSec}s for Ray-Ban Spin View.`
            );
          }
        }

        setValidationProgress(85);
        setValidationStatusText('Reading existing EXIF / QuickTime atom trees...');

        // Step 3: Extract container metadata
        const metadata = extractMediaMetadata(sniffResult.headerBuffer);

        // Step 4: Assemble StagedMediaFile
        const staged: StagedMediaFile = {
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          name: file.name,
          sizeBytes: file.size,
          formattedSize: formatBytes(file.size),
          type: sniffResult.type === 'video' ? 'video' : 'image',
          format: sniffResult.format,
          mimeType: sniffResult.mimeType,
          width,
          height,
          aspectRatio,
          aspectRatioLabel: getAspectRatioLabel(width, height),
          durationSeconds,
          formattedDuration: formatDuration(durationSeconds),
          previewUrl,
          thumbnailUrl,
          detectedMetadata: metadata,
          createdAt: Date.now(),
        };

        setValidationProgress(100);
        setValidationStatusText('Media staged successfully!');
        setStagedMedia(staged);
        onFileAccepted?.(staged);
      } catch (err: any) {
        const message = err?.message || 'An unknown error occurred while processing the file.';
        setValidationError(message);
        onFileRejected?.(message);
      } finally {
        setIsValidating(false);
      }
    },
    [maxImageSizeBytes, maxVideoSizeBytes, maxVideoDurationSec, onFileAccepted, onFileRejected]
  );

  /**
   * Drag Event Handlers
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOver(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    },
    [processFile]
  );

  /**
   * File Picker Handler
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        processFile(file);
      }
      // Reset input value to allow selecting same file again
      e.target.value = '';
    },
    [processFile]
  );

  /**
   * Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
   */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInput && !e.clipboardData?.files?.length) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              const ext = blob.type.includes('png')
                ? 'png'
                : blob.type.includes('jpeg')
                ? 'jpg'
                : blob.type.includes('mp4')
                ? 'mp4'
                : 'bin';
              const file = new File([blob], `clipboard-${Date.now()}.${ext}`, {
                type: blob.type,
              });
              processFile(file);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processFile]);

  /**
   * Reset staged media
   */
  const clearStagedMedia = useCallback(() => {
    cleanupUrls();
    setStagedMedia(null);
    setValidationError(null);
    setValidationProgress(0);
    setValidationStatusText('');
  }, [cleanupUrls]);

  return {
    isDraggingOver,
    isValidating,
    validationProgress,
    validationStatusText,
    validationError,
    stagedMedia,
    processFile,
    clearStagedMedia,
    setValidationError,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    handleFileInputChange,
  };
}

export default useDropzone;
