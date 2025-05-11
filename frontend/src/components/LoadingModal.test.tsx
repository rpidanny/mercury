import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingModal from './LoadingModal';

describe('LoadingModal', () => {
  it('renders nothing when no message is provided', () => {
    render(<LoadingModal message={null} />);
    
    const modal = document.querySelector('div[class*="opacity-0"]');
    expect(modal).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('displays the loading message when provided', () => {
    const testMessage = 'Processing data...';
    render(<LoadingModal message={testMessage} />);
    
    const modal = document.querySelector('div[class*="opacity-100"]');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });

  it('contains a loading indicator element', () => {
    render(<LoadingModal message="Loading" />);
    
    const indicator = document.getElementById('loading-indicator');
    expect(indicator).toBeInTheDocument();
  });
}); 