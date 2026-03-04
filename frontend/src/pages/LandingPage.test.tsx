import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('LandingPage', () => {
  it('renders the hero section with title', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText('HIRE')).toBeInTheDocument();
    expect(screen.getByText('Automated job application system')).toBeInTheDocument();
  });

  it('renders the main description', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText(/HIRE discovers job opportunities/i)).toBeInTheDocument();
  });

  it('renders the call-to-action buttons', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText(/Let's get started/i)).toBeInTheDocument();
    expect(screen.getByText('View on GitHub')).toBeInTheDocument();
    expect(screen.getByText('View Feed')).toBeInTheDocument();
  });

  it('renders all pipeline steps', () => {
    renderWithRouter(<LandingPage />);
    
    const steps = ['Scrape', 'Match', 'Tailor', 'Apply', 'Track'];
    steps.forEach(step => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
  });

  it('renders pipeline step descriptions', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText('Collects job listings across platforms')).toBeInTheDocument();
    expect(screen.getByText('Vector similarity against user profile')).toBeInTheDocument();
    expect(screen.getByText('LLM-powered resume customization')).toBeInTheDocument();
    expect(screen.getByText('Playwright-based form automation')).toBeInTheDocument();
    expect(screen.getByText('Application status monitoring')).toBeInTheDocument();
  });

  it('renders the tech stack section', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText('Stack')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('renders tech stack items', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText('NestJS')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vite')).toBeInTheDocument();
  });

  it('pipeline nodes can be hovered', () => {
    renderWithRouter(<LandingPage />);
    
    const scrapeNode = screen.getByText('Scrape').closest('.pipeline-node');
    expect(scrapeNode).not.toHaveClass('active');
    
    if (scrapeNode) {
      fireEvent.mouseEnter(scrapeNode);
      expect(scrapeNode).toHaveClass('active');
      
      fireEvent.mouseLeave(scrapeNode);
      expect(scrapeNode).not.toHaveClass('active');
    }
  });

  it('renders GitHub link with correct attributes', () => {
    renderWithRouter(<LandingPage />);
    
    const githubLink = screen.getByText('View on GitHub').closest('a');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/JAYATIAHUJA/HIRE');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders contribution link', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText('Contributions Welcome')).toBeInTheDocument();
  });
});
