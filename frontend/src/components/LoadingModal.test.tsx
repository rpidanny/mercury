import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import LoadingModal from './LoadingModal';

describe('LoadingModal', () => {
  // Mock timers for testing timeout-related behavior
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('overflow-hidden');
  });

  it('renders nothing when no message is provided', () => {
    render(<LoadingModal message={null} />);
    
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(document.querySelector('.loading-modal')).not.toBeInTheDocument();
  });

  it('displays the loading message when provided', () => {
    const testMessage = 'Processing data...';
    render(<LoadingModal message={testMessage} />);
    
    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(document.querySelector('.loading-modal')).toBeInTheDocument();
  });

  it('contains spinner rings for the loading animation', () => {
    render(<LoadingModal message="Loading" />);
    
    const spinnerRings = document.querySelectorAll('.spinner-ring');
    expect(spinnerRings.length).toBe(3);
  });

  it('adds overflow-hidden class to body when visible', () => {
    render(<LoadingModal message="Loading" />);
    
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
  });

  it('removes overflow-hidden class from body when removed', () => {
    const { rerender } = render(<LoadingModal message="Loading" />);
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
    
    rerender(<LoadingModal message={null} />);
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });

  it('shows extended loading message after timeout', async () => {
    render(<LoadingModal message="Loading" />);
    
    // Initially, the extended message should not be present
    expect(screen.queryByText(/taking longer than expected/i)).not.toBeInTheDocument();
    
    // Advance timers to trigger the extended loading state
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    
    // Now the extended message should be visible
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    expect(document.querySelector('.loading-modal.extended-loading')).toBeInTheDocument();
  });

  it('clears timeout when component unmounts', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<LoadingModal message="Loading" />);
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('clears timeout when message becomes null', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { rerender } = render(<LoadingModal message="Loading" />);
    
    rerender(<LoadingModal message={null} />);
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
}); 