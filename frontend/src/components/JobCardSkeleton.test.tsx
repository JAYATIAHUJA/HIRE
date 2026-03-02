import { render } from '../test/test-utils';
import JobCardSkeleton from './JobCardSkeleton';

describe('JobCardSkeleton component', () => {
  it('renders with default variant', () => {
    render(<JobCardSkeleton />);
    const skeleton = document.querySelector('.job-card.skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('variant-1');
  });

  it('renders with variant 2', () => {
    render(<JobCardSkeleton variant={2} />);
    const skeleton = document.querySelector('.job-card.skeleton');
    expect(skeleton).toHaveClass('variant-2');
  });

  it('renders with variant 3', () => {
    render(<JobCardSkeleton variant={3} />);
    const skeleton = document.querySelector('.job-card.skeleton');
    expect(skeleton).toHaveClass('variant-3');
  });

  it('renders skeleton lines', () => {
    render(<JobCardSkeleton />);
    const lines = document.querySelectorAll('.skeleton-line');
    expect(lines.length).toBe(4);
  });

  it('renders skeleton pill', () => {
    render(<JobCardSkeleton />);
    const pill = document.querySelector('.skeleton-pill');
    expect(pill).toBeInTheDocument();
  });
});
