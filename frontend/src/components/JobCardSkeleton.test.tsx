import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import JobCardSkeleton from './JobCardSkeleton';

describe('JobCardSkeleton', () => {
  it('renders with default variant', () => {
    render(<JobCardSkeleton />);
    
    const skeleton = screen.getByRole('generic', { name: '' });
    expect(skeleton).toHaveClass('job-card', 'skeleton', 'variant-1');
  });

  it('renders with variant 1', () => {
    render(<JobCardSkeleton variant={1} />);
    
    const skeleton = document.querySelector('.job-card.skeleton.variant-1');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders with variant 2', () => {
    render(<JobCardSkeleton variant={2} />);
    
    const skeleton = document.querySelector('.job-card.skeleton.variant-2');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders with variant 3', () => {
    render(<JobCardSkeleton variant={3} />);
    
    const skeleton = document.querySelector('.job-card.skeleton.variant-3');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders all skeleton elements', () => {
    render(<JobCardSkeleton />);
    
    const titleLine = document.querySelector('.skeleton-line.title');
    const line1 = document.querySelector('.skeleton-line.line-1');
    const line2 = document.querySelector('.skeleton-line.line-2');
    const line3 = document.querySelector('.skeleton-line.line-3');
    const pill = document.querySelector('.skeleton-pill');

    expect(titleLine).toBeInTheDocument();
    expect(line1).toBeInTheDocument();
    expect(line2).toBeInTheDocument();
    expect(line3).toBeInTheDocument();
    expect(pill).toBeInTheDocument();
  });
});
