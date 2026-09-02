/**
 * Unit tests for CropViewport and FramingControls components
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CropViewport from '@/components/editor/CropViewport';
import FramingControls from '@/components/editor/FramingControls';
import { CropConfig } from '@/types/converter';

describe('Crop & Framing Viewport Components', () => {
  const defaultCropConfig: CropConfig = {
    mode: 'center',
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
  };

  const sampleComputedCrop = {
    x: 272,
    y: 0,
    width: 1376,
    height: 1840,
  };

  describe('CropViewport Component', () => {
    it('renders image element when mediaType is image', () => {
      render(
        <CropViewport
          mediaUrl="blob:http://localhost/mock-image"
          mediaType="image"
          sourceWidth={1920}
          sourceHeight={1080}
          cropConfig={defaultCropConfig}
          computedCrop={sampleComputedCrop}
        />
      );

      const img = screen.getByAltText('Framed preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:http://localhost/mock-image');
    });

    it('renders video element when mediaType is video', () => {
      const { container } = render(
        <CropViewport
          mediaUrl="blob:http://localhost/mock-video"
          mediaType="video"
          sourceWidth={1920}
          sourceHeight={1080}
          cropConfig={defaultCropConfig}
          computedCrop={sampleComputedCrop}
        />
      );

      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'blob:http://localhost/mock-video');
    });

    it('displays telemetry badge with computed crop coordinates', () => {
      render(
        <CropViewport
          mediaUrl="blob:http://localhost/mock-image"
          mediaType="image"
          sourceWidth={1920}
          sourceHeight={1080}
          cropConfig={defaultCropConfig}
          computedCrop={sampleComputedCrop}
        />
      );

      expect(screen.getByText(/1376×1840 • X:272 Y:0 W:1376 H:1840/i)).toBeInTheDocument();
    });

    it('shows safe zone overlays when showSafeZone is true', () => {
      render(
        <CropViewport
          mediaUrl="blob:http://localhost/mock-image"
          mediaType="image"
          sourceWidth={1920}
          sourceHeight={1080}
          cropConfig={defaultCropConfig}
          computedCrop={sampleComputedCrop}
          showSafeZone={true}
        />
      );

      expect(screen.getByText(/IG Header \/ Profile Margin \(14%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/IG Action \/ Reply Bar Margin \(18%\)/i)).toBeInTheDocument();
    });
  });

  describe('FramingControls Component', () => {
    it('renders mode tabs and switches framing mode', () => {
      const onCropChange = vi.fn();
      const onToggleGrid = vi.fn();
      const onToggleSafeZone = vi.fn();
      const onReset = vi.fn();

      render(
        <FramingControls
          cropConfig={defaultCropConfig}
          showGrid={true}
          showSafeZone={false}
          onCropChange={onCropChange}
          onToggleGrid={onToggleGrid}
          onToggleSafeZone={onToggleSafeZone}
          onReset={onReset}
        />
      );

      expect(screen.getByText('Smart Fill')).toBeInTheDocument();
      expect(screen.getByText('Custom Pan')).toBeInTheDocument();
      expect(screen.getByText('Ambient Blur')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Custom Pan'));
      expect(onCropChange).toHaveBeenCalledWith({ mode: 'custom' });
    });

    it('renders zoom slider when in custom mode', () => {
      const onCropChange = vi.fn();
      render(
        <FramingControls
          cropConfig={{ ...defaultCropConfig, mode: 'custom', zoom: 1.5 }}
          showGrid={true}
          showSafeZone={false}
          onCropChange={onCropChange}
          onToggleGrid={vi.fn()}
          onToggleSafeZone={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByText(/150% \(1.50x\)/i)).toBeInTheDocument();
      const zoomInBtn = screen.getByLabelText('Zoom In');
      fireEvent.click(zoomInBtn);
      expect(onCropChange).toHaveBeenCalledWith({ zoom: 1.6 });
    });

    it('triggers rotate and reset handlers correctly', () => {
      const onCropChange = vi.fn();
      const onReset = vi.fn();

      render(
        <FramingControls
          cropConfig={defaultCropConfig}
          showGrid={true}
          showSafeZone={false}
          onCropChange={onCropChange}
          onToggleGrid={vi.fn()}
          onToggleSafeZone={vi.fn()}
          onReset={onReset}
        />
      );

      fireEvent.click(screen.getByText('0°'));
      expect(onCropChange).toHaveBeenCalledWith({ rotation: 90 });

      fireEvent.click(screen.getByText('Reset'));
      expect(onReset).toHaveBeenCalled();
    });
  });
});
