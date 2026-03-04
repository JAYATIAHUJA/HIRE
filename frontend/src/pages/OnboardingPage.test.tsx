import { render, screen } from '../test/test-utils';
import OnboardingPage from './OnboardingPage';
import { vi } from 'vitest';

// Mock the api client
vi.mock('../api/client', () => ({
  api: {
    createUser: vi.fn(),
    scrapeJobs: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('OnboardingPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('renders onboarding container', () => {
    render(<OnboardingPage />);
    const container = document.querySelector('.onboarding-container');
    expect(container).toBeInTheDocument();
  });

  it('renders onboarding card', () => {
    render(<OnboardingPage />);
    const card = document.querySelector('.onboarding-card');
    expect(card).toBeInTheDocument();
  });

  it('renders steps indicator', () => {
    render(<OnboardingPage />);
    const stepsIndicator = document.querySelector('.steps-indicator');
    expect(stepsIndicator).toBeInTheDocument();
  });

  it('renders all 4 step indicators', () => {
    render(<OnboardingPage />);
    const steps = document.querySelectorAll('.step');
    expect(steps.length).toBe(4);
  });

  it('starts with profile step active', () => {
    render(<OnboardingPage />);
    const activeStep = document.querySelector('.step.active');
    expect(activeStep).toBeInTheDocument();
    expect(activeStep?.textContent).toContain('Profile');
  });

  it('starts with profile step by default', () => {
    render(<OnboardingPage />);
    // Profile step should show fullname input
    const fullnameInput = screen.getByLabelText(/full name/i);
    expect(fullnameInput).toBeInTheDocument();
  });

  it('renders email input in profile step', () => {
    render(<OnboardingPage />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });

  it('renders resume textarea in profile step', () => {
    render(<OnboardingPage />);
    const resumeTextarea = screen.getByLabelText(/resume/i);
    expect(resumeTextarea).toBeInTheDocument();
  });

  it('renders skills input in profile step', () => {
    render(<OnboardingPage />);
    const skillsInput = screen.getByLabelText(/skills/i);
    expect(skillsInput).toBeInTheDocument();
  });

  it('renders continue button in profile step', () => {
    render(<OnboardingPage />);
    const continueButton = screen.getByRole('button', { name: /save profile/i });
    expect(continueButton).toBeInTheDocument();
  });

  it('renders profile form heading', () => {
    render(<OnboardingPage />);
    const heading = screen.getByRole('heading', { name: /create your profile/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders step description', () => {
    render(<OnboardingPage />);
    const description = screen.getByText(/tell us about yourself/i);
    expect(description).toBeInTheDocument();
  });
});
