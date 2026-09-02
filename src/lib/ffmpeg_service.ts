/**
 * ToRayBan_Converter - Client-Side FFmpeg WebAssembly Service
 * In-browser video transcode, crop (1376x1840 @ 30fps), lanczos scaling, and telemetry engine.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { CropCoordinates, VideoConversionTelemetry } from '@/types/converter';
import { normalizeCropCoordinates } from './media_utils';

export interface TranscodeOptions {
  crop?: CropCoordinates;
  targetWidth?: number;  // Default: 1376
  targetHeight?: number; // Default: 1840
  fps?: number;          // Default: 30
  crf?: number;          // Default: 20
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  onProgress?: (telemetry: Partial<VideoConversionTelemetry>) => void;
  onLog?: (log: string) => void;
  signal?: AbortSignal;
}

const WASM_SOURCES = [
  { name: 'unpkg CDN', base: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm' },
  { name: 'jsdelivr CDN', base: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm' },
  { name: 'local fallback', base: '/ffmpeg' },
];

export class TelemetryParser {
  private totalDurationSec: number = 0;
  private startTime: number = Date.now();

  public reset(): void {
    this.totalDurationSec = 0;
    this.startTime = Date.now();
  }

  public setDuration(seconds: number): void {
    if (seconds > 0) this.totalDurationSec = seconds;
  }

  public parseLog(log: string): Partial<VideoConversionTelemetry> {
    const result: Partial<VideoConversionTelemetry> = { logLine: log };

    // 1. Detect source duration: "Duration: 00:00:15.34, start: ..."
    const durationMatch = log.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1], 10);
      const mins = parseInt(durationMatch[2], 10);
      const secs = parseInt(durationMatch[3], 10);
      const centis = parseInt(durationMatch[4], 10);
      this.totalDurationSec = hours * 3600 + mins * 60 + secs + centis / 100;
      result.totalDurationSec = this.totalDurationSec;
    }

    // 2. Parse progress metrics line
    if (log.includes('frame=') || log.includes('time=')) {
      // Frame
      const frameMatch = log.match(/frame=\s*(\d+)/);
      if (frameMatch) result.currentFrame = parseInt(frameMatch[1], 10);

      // FPS
      const fpsMatch = log.match(/fps=\s*([\d.]+)/);
      if (fpsMatch) result.fps = parseFloat(fpsMatch[1]);

      // Bitrate
      const brMatch = log.match(/bitrate=\s*([\d.]+\s*\w+\/s)/);
      if (brMatch) result.bitrate = brMatch[1];

      // Speed
      const speedMatch = log.match(/speed=\s*([\d.]+)x/);
      if (speedMatch) result.speed = parseFloat(speedMatch[1]);

      // Time: "time=00:00:04.73"
      const timeMatch = log.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch) {
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = parseInt(timeMatch[3], 10);
        const cs = parseInt(timeMatch[4], 10);
        const currentSec = h * 3600 + m * 60 + s + cs / 100;
        result.currentTimeSec = currentSec;

        // Calculate Elapsed Time
        const elapsedSec = (Date.now() - this.startTime) / 1000;
        result.elapsedSec = Math.round(elapsedSec);

        // Calculate Percentage & ETA
        if (this.totalDurationSec > 0) {
          const ratio = Math.min(1.0, currentSec / this.totalDurationSec);
          result.percent = Math.min(95, Math.max(5, Math.round(ratio * 100)));

          if (result.speed && result.speed > 0) {
            const remainingVideoSec = Math.max(0, this.totalDurationSec - currentSec);
            result.etaSec = Math.round(remainingVideoSec / result.speed);
          } else if (ratio > 0.05) {
            const totalEstimatedSec = elapsedSec / ratio;
            result.etaSec = Math.max(0, Math.round(totalEstimatedSec - elapsedSec));
          }
        }
      }
    }

    return result;
  }
}

export class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private telemetryParser: TelemetryParser = new TelemetryParser();

  /**
   * Initializes the FFmpeg WebAssembly instance with cascade fallback.
   */
  public async load(onLog?: (msg: string) => void): Promise<boolean> {
    if (this.isLoaded && this.ffmpeg) return true;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.ffmpeg = new FFmpeg();

    for (const src of WASM_SOURCES) {
      try {
        onLog?.(`[FFmpegService] Attempting to load WASM binaries from: ${src.name}...`);
        const coreURL = await toBlobURL(`${src.base}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${src.base}/ffmpeg-core.wasm`, 'application/wasm');

        await this.ffmpeg.load({ coreURL, wasmURL });
        this.isLoaded = true;
        this.isLoading = false;
        onLog?.(`[FFmpegService] Successfully loaded FFmpeg WASM core from: ${src.name}`);
        return true;
      } catch (e) {
        onLog?.(`[FFmpegService] Failed loading from ${src.name}: ${(e as Error).message}. Trying next fallback...`);
      }
    }

    this.isLoading = false;
    throw new Error('Unable to load FFmpeg WebAssembly core from all available CDN and local sources.');
  }

  /**
   * Transcodes and crops user video to 1376x1840 Ray-Ban Meta specification.
   */
  public async transcodeAndCrop(
    file: File | Blob | Uint8Array,
    options: TranscodeOptions = {}
  ): Promise<Uint8Array> {
    if (!this.isLoaded || !this.ffmpeg) {
      await this.load(options.onLog);
    }

    const ffmpeg = this.ffmpeg!;
    const timestamp = Date.now();
    const inputName = `input_${timestamp}.mp4`;
    const outputName = `output_${timestamp}.mov`;

    this.telemetryParser.reset();
    options.onProgress?.({
      phase: 'init',
      percent: 5,
      logLine: 'Initializing FFmpeg transcoding graph...',
    });

    const logCallback = ({ message }: { message: string }) => {
      options.onLog?.(message);
      const telemetry = this.telemetryParser.parseLog(message);
      if (Object.keys(telemetry).length > 1) {
        options.onProgress?.({ phase: 'transcoding', ...telemetry });
      }
    };
    ffmpeg.on('log', logCallback);

    try {
      // 1. Fetch & Write Input Data into virtual MEMFS
      options.onProgress?.({
        phase: 'demux',
        percent: 10,
        logLine: 'Loading video payload into WebAssembly MEMFS...',
      });

      let inputBytes: Uint8Array;
      if (file instanceof Uint8Array) {
        inputBytes = file;
      } else {
        inputBytes = await fetchFile(file);
      }
      await ffmpeg.writeFile(inputName, inputBytes);

      // Nullify local reference to avoid memory leaks
      inputBytes = new Uint8Array(0);

      // 2. Build Filter Graph & Command Arguments
      const targetW = options.targetWidth ?? 1376;
      const targetH = options.targetHeight ?? 1840;
      const crop = options.crop ?? { x: 0, y: 0, width: targetW, height: targetH };
      const normCrop = normalizeCropCoordinates(crop, crop.width + crop.x, crop.height + crop.y);
      const fps = options.fps ?? 30;
      const crf = options.crf ?? 20;
      const preset = options.preset ?? 'fast';

      const vf = `crop=${normCrop.width}:${normCrop.height}:${normCrop.x}:${normCrop.y},scale=${targetW}:${targetH}:flags=lanczos,setsar=1`;

      const args = [
        '-i',
        inputName,
        '-vf',
        vf,
        '-r',
        fps.toString(),
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-level',
        '4.2',
        '-preset',
        preset,
        '-crf',
        crf.toString(),
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        outputName,
      ];

      options.onProgress?.({
        phase: 'transcoding',
        percent: 15,
        logLine: 'Starting H.264 / AAC transcoding pipeline...',
      });

      // 3. Execute FFmpeg Command
      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg transcoding failed with exit code ${exitCode}`);
      }

      options.onProgress?.({
        phase: 'synthesizing',
        percent: 92,
        logLine: 'Extracting transcoded QuickTime stream...',
      });

      // 4. Read Output Buffer
      const resultData = await ffmpeg.readFile(outputName);
      const outBuffer =
        typeof resultData === 'string'
          ? new TextEncoder().encode(resultData)
          : new Uint8Array(resultData.buffer);

      options.onProgress?.({
        phase: 'completed',
        percent: 100,
        logLine: 'Transcoding completed successfully.',
      });

      return outBuffer;
    } finally {
      // Detach log listener
      ffmpeg.off('log', logCallback);

      // Memory cleanup: guaranteed deletion of virtual MEMFS files
      try {
        await ffmpeg.deleteFile(inputName);
      } catch {}
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {}
    }
  }

  /**
   * Terminates the FFmpeg worker instance and clears WebAssembly heap memory.
   */
  public terminate(): void {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch {}
      this.ffmpeg = null;
      this.isLoaded = false;
      this.isLoading = false;
    }
  }
}
