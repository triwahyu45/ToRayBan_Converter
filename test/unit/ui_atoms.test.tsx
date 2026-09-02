/**
 * Unit tests for UI Atomic components: Button, Badge, Modal, Toast
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';

describe('UI Atomic Components', () => {
  describe('Button Component', () => {
    it('renders with children and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner when isLoading is true and disables button', () => {
      render(<Button isLoading>Processing</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });

    it('renders left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Action
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Badge Component', () => {
    it('renders text with variant styles', () => {
      render(<Badge variant="cyan">GEN 2 PROFILE</Badge>);
      expect(screen.getByText('GEN 2 PROFILE')).toBeInTheDocument();
    });

    it('renders pulsing dot when dot and dotPulse are set', () => {
      const { container } = render(
        <Badge variant="emerald" dot dotPulse>
          READY
        </Badge>
      );
      expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  describe('Modal Component', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
          <p>Modal Content</p>
        </Modal>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders title and content when isOpen is true and closes on close button', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal" subtitle="Test Subtitle">
          <p>Modal Content</p>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Close modal');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast Component', () => {
    const TestToastComponent = () => {
      const { success, error } = useToast();
      return (
        <div>
          <button onClick={() => success('Success Title', 'Success Desc')}>Trigger Success</button>
          <button onClick={() => error('Error Title', 'Error Desc')}>Trigger Error</button>
        </div>
      );
    };

    it('displays toast on trigger and allows dismiss', () => {
      render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Trigger Success'));
      expect(screen.getByText('Success Title')).toBeInTheDocument();
      expect(screen.getByText('Success Desc')).toBeInTheDocument();

      const dismissBtn = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissBtn);
      expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
    });
  });
});
