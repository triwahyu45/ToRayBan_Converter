/**
 * Adversarial Stress-Test Suite for useMediaConverter & Conversion Lifecycle
 * Teamwork Preview Challenger 2 (Empirical Adversarial Validation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaConverter } from '@/hooks/useMediaConverter';
import * as mediaUtils from '@/lib/media_utils';
import * as exifInjector from '@/lib/exif_injector';
import * as atomSynthesizer from '@/lib/atom_synthesizer';
import { FFmpegService } from '@/lib/ffmpeg_service';

// Mock FFmpegService
vi.mock('@/lib/ffmpeg_service', () => {
  return {
    FFmpegService: vi.fn().mockImplementation(() => {
      return {
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: vi.fn().mockResolvedValue(
          new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20])
        ),
        terminate: vi.fn(),
      };
    }),
  };
});

describe('useMediaConverter Adversarial Stress & Lifecycle Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(
      (blob) => `blob:http://localhost/${Math.random().toString(36).substring(7)}`
    );
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockImageFile = (name = 'test.jpg', size = 1024) => {
    const bytes = new Uint8Array(size);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    bytes[3] = 0xe0;
    return new File([bytes], name, { type: 'image/jpeg' });
  };

  const createMockVideoFile = (name = 'test.mp4', size = 2048) => {
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 20, false);
    bytes.set(new TextEncoder().encode('ftypisom'), 4);
    return new File([bytes], name, { type: 'video/mp4' });
  };

  describe('1. State Transition Lifecycle (Idle -> Staged -> Cropping/Transcoding -> Synthesizing -> Completed/Error)', () => {
    it('initializes in idle state with pristine defaults', () => {
      const { result } = renderHook(() => useMediaConverter());
      expect(result.current.status).toBe('idle');
      expect(result.current.stagedMedia).toBeNull();
      expect(result.current.progressPercent).toBe(0);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.logs).toEqual([]);
      expect(result.current.cropConfig).toEqual({
        mode: 'center',
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
      });
    });

    it('stages image and properly computes 1376x1840 center crop coordinates', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'jpeg',
        type: 'image',
        mimeType: 'image/jpeg',
        headerBuffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      });

      vi.spyOn(mediaUtils, 'extractImageDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-preview',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      const { result } = renderHook(() => useMediaConverter());
      const file = createMockImageFile();

      await act(async () => {
        await result.current.stageFile(file);
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.stagedMedia).not.toBeNull();
      expect(result.current.stagedMedia?.type).toBe('image');
      expect(result.current.stagedMedia?.width).toBe(1920);
      expect(result.current.stagedMedia?.height).toBe(1080);
      expect(result.current.computedCrop.width).toBe(808);
      expect(result.current.computedCrop.height).toBe(1080);
    });

    it('stages video and populates duration, format and computed rect', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mp4',
        type: 'video',
        mimeType: 'video/mp4',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });

      vi.spyOn(mediaUtils, 'extractVideoDetails').mockResolvedValue({
        width: 1080,
        height: 1920,
        durationSeconds: 15.4,
        aspectRatio: 1080 / 1920,
        previewUrl: 'blob:http://localhost/mock-video',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      const { result } = renderHook(() => useMediaConverter());
      const file = createMockVideoFile();

      await act(async () => {
        await result.current.stageFile(file);
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.stagedMedia).not.toBeNull();
      expect(result.current.stagedMedia?.type).toBe('video');
      expect(result.current.stagedMedia?.durationSeconds).toBe(15.4);
      expect(result.current.computedCrop.width).toBe(1080);
      expect(result.current.computedCrop.height).toBe(1444);
    });

    it('completes video conversion lifecycle with proper state transitions and telemetry', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mp4',
        type: 'video',
        mimeType: 'video/mp4',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });

      vi.spyOn(mediaUtils, 'extractVideoDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        durationSeconds: 10,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-video',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      (FFmpegService as any).mockImplementation(() => ({
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: vi.fn().mockImplementation(async (_, opts) => {
          opts.onProgress?.({ percent: 50, fps: 30, speed: 2.1 });
          opts.onLog?.('Transcoding frame 150/300');
          return new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
        }),
        terminate: vi.fn(),
      }));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockVideoFile());
      });

      await act(async () => {
        await result.current.startConversion();
      });

      expect(result.current.status).toBe('completed');
      expect(result.current.progressPercent).toBe(100);
      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.format).toBe('mov');
      expect(result.current.result?.width).toBe(1376);
      expect(result.current.result?.height).toBe(1840);
      expect(result.current.telemetry.fps).toBe(30);
      expect(result.current.telemetry.speed).toBe(2.1);
    });
  });

  describe('2. Error Handling & Simulated Failures', () => {
    it('sets status to error and captures message when file sniffing fails', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockRejectedValue(new Error('Corrupted or unsupported format'));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockImageFile());
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Corrupted or unsupported format');
      expect(result.current.stagedMedia).toBeNull();
      expect(result.current.logs.some((l) => l.level === 'error')).toBe(true);
    });

    it('sets status to error when video extraction throws error (e.g. invalid codec / corrupt container)', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mov',
        type: 'video',
        mimeType: 'video/quicktime',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });
      vi.spyOn(mediaUtils, 'extractVideoDetails').mockRejectedValue(new Error('Media contains no valid video stream.'));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockVideoFile());
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Media contains no valid video stream.');
      expect(result.current.stagedMedia).toBeNull();
    });

    it('captures FFmpeg transcoding failure and sets status to error with log trace', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mp4',
        type: 'video',
        mimeType: 'video/mp4',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });
      vi.spyOn(mediaUtils, 'extractVideoDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        durationSeconds: 5,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-video',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      const mockTranscode = vi.fn().mockRejectedValue(new Error('FFmpeg WebAssembly Core crashed: OOM'));
      (FFmpegService as any).mockImplementation(() => ({
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: mockTranscode,
        terminate: vi.fn(),
      }));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockVideoFile());
      });

      await act(async () => {
        await result.current.startConversion();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('FFmpeg WebAssembly Core crashed: OOM');
      expect(result.current.result).toBeNull();
      expect(
        result.current.logs.some((l) => l.level === 'error' && l.message.includes('FFmpeg WebAssembly Core crashed'))
      ).toBe(true);
    });

    it('recovers from error state when user clears or stages a new valid file', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockRejectedValueOnce(new Error('Corrupt file'));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockImageFile('bad.jpg'));
      });
      expect(result.current.status).toBe('error');

      // Now stage a valid file
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'jpeg',
        type: 'image',
        mimeType: 'image/jpeg',
        headerBuffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      });
      vi.spyOn(mediaUtils, 'extractImageDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-preview',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      await act(async () => {
        await result.current.stageFile(createMockImageFile('good.jpg'));
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.stagedMedia).not.toBeNull();
    });
  });

  describe('3. Cancellation & Abort Interruption Scenarios', () => {
    it('sets status to idle and records cancellation warning log when user cancels conversion', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mp4',
        type: 'video',
        mimeType: 'video/mp4',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });
      vi.spyOn(mediaUtils, 'extractVideoDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        durationSeconds: 5,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-video',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      const mockTerminate = vi.fn();
      let rejectTranscode!: (err: any) => void;
      const transcodePromise = new Promise<Uint8Array>((_, reject) => {
        rejectTranscode = reject;
      });

      (FFmpegService as any).mockImplementation(() => ({
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: vi.fn().mockReturnValue(transcodePromise),
        terminate: mockTerminate,
      }));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockVideoFile());
      });

      let conversionPromise: Promise<void>;
      act(() => {
        conversionPromise = result.current.startConversion();
      });

      expect(result.current.status).toBe('transcoding');

      // Cancel while conversion is in flight
      act(() => {
        result.current.cancelConversion();
      });

      expect(mockTerminate).toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
      expect(result.current.progressPercent).toBe(0);

      // Settle promise with AbortError
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';

      await act(async () => {
        rejectTranscode(abortErr);
        await conversionPromise;
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.logs.some((l) => l.level === 'warn' && l.message.includes('aborted'))).toBe(true);
    });

    it('handles multiple rapid cancelConversion calls idempotently without throwing', () => {
      const { result } = renderHook(() => useMediaConverter());
      expect(() => {
        act(() => {
          result.current.cancelConversion();
          result.current.cancelConversion();
          result.current.cancelConversion();
        });
      }).not.toThrow();
      expect(result.current.status).toBe('idle');
    });

    it('unmount hook terminates FFmpeg and cleans up registered object URLs', async () => {
      const mockTerminate = vi.fn();
      (FFmpegService as any).mockImplementation(() => ({
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: vi.fn().mockResolvedValue(new Uint8Array(10)),
        terminate: mockTerminate,
      }));

      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'jpeg',
        type: 'image',
        mimeType: 'image/jpeg',
        headerBuffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      });
      vi.spyOn(mediaUtils, 'extractImageDetails').mockResolvedValue({
        width: 1000,
        height: 1000,
        aspectRatio: 1,
        previewUrl: 'blob:http://localhost/preview-1',
        thumbnailUrl: 'blob:http://localhost/thumb-1',
      });

      const { result, unmount } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockImageFile());
      });

      unmount();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('4. Sequential Rapid Triggers, Reentrancy & Memory Lifecycle', () => {
    it('handles multiple rapid file stages sequentially without unhandled rejection', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'jpeg',
        type: 'image',
        mimeType: 'image/jpeg',
        headerBuffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      });
      vi.spyOn(mediaUtils, 'extractImageDetails').mockImplementation(async (file) => ({
        width: 1000,
        height: 1000,
        aspectRatio: 1,
        previewUrl: `blob:http://localhost/${file.name}`,
        thumbnailUrl: `blob:http://localhost/${file.name}-thumb`,
      }));

      const { result } = renderHook(() => useMediaConverter());

      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await result.current.stageFile(createMockImageFile(`seq_${i}.jpg`));
        }
      });

      expect(result.current.stagedMedia?.name).toBe('seq_4.jpg');
      expect(result.current.status).toBe('idle');
    });

    it('resetAll systematically wipes staged media, results, logs and revokes URLs', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'jpeg',
        type: 'image',
        mimeType: 'image/jpeg',
        headerBuffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      });
      vi.spyOn(mediaUtils, 'extractImageDetails').mockResolvedValue({
        width: 1000,
        height: 1000,
        aspectRatio: 1,
        previewUrl: 'blob:http://localhost/mock-image-reset',
        thumbnailUrl: 'blob:http://localhost/mock-thumb-reset',
      });

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockImageFile());
      });

      expect(result.current.stagedMedia).not.toBeNull();

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.stagedMedia).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.logs).toEqual([]);
      expect(result.current.status).toBe('idle');
      expect(result.current.progressPercent).toBe(0);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-image-reset');
    });

    it('caps log entries at 200 items to prevent unbounded memory growth', async () => {
      vi.spyOn(mediaUtils, 'sniffMediaFile').mockResolvedValue({
        format: 'mp4',
        type: 'video',
        mimeType: 'video/mp4',
        headerBuffer: new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]),
      });
      vi.spyOn(mediaUtils, 'extractVideoDetails').mockResolvedValue({
        width: 1920,
        height: 1080,
        durationSeconds: 10,
        aspectRatio: 1920 / 1080,
        previewUrl: 'blob:http://localhost/mock-video',
        thumbnailUrl: 'blob:http://localhost/mock-thumb',
      });

      (FFmpegService as any).mockImplementation(() => ({
        load: vi.fn().mockResolvedValue(true),
        transcodeAndCrop: vi.fn().mockImplementation(async (_, opts) => {
          for (let i = 0; i < 250; i++) {
            opts.onLog?.(`Telemetry Frame ${i}`);
          }
          return new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
        }),
        terminate: vi.fn(),
      }));

      const { result } = renderHook(() => useMediaConverter());
      await act(async () => {
        await result.current.stageFile(createMockVideoFile());
      });

      await act(async () => {
        await result.current.startConversion();
      });

      expect(result.current.logs.length).toBeLessThanOrEqual(201);
    });

    it('does not crash if startConversion is called when stagedMedia is null', async () => {
      const { result } = renderHook(() => useMediaConverter());
      expect(result.current.stagedMedia).toBeNull();

      await act(async () => {
        await result.current.startConversion();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.result).toBeNull();
    });
  });
});
