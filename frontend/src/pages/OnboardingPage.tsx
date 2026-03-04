import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import './OnboardingPage.css';

// Reordered: Profile → Login → Scraping → Ready
type OnboardingStep = 'profile' | 'login' | 'scraping' | 'ready';

function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<OnboardingStep>('profile'); // Start with profile
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    // Profile form state
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [skills, setSkills] = useState('');
    const [resumeText, setResumeText] = useState('');

    // Login credentials state (stored in memory only, not localStorage)
    const [internshalaEmail, setInternshalaEmail] = useState('');
    const [internshalaPassword, setInternshalaPassword] = useState('');

    // Check if user already exists
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const hasProfile = localStorage.getItem('hasProfile');
        const hasLogin = localStorage.getItem('hasInternshalaLogin');

        if (storedUserId && hasProfile && hasLogin) {
            // User is fully set up, go to feed
            navigate(`/?userId=${storedUserId}`);
        } else if (storedUserId && hasProfile && !hasLogin) {
            // Has profile but no login - go to login step
            setUserId(storedUserId);
            setStep('login');
        } else if (storedUserId && hasProfile) {
            // Has profile, ready for scraping
            setUserId(storedUserId);
            setStep('scraping');
        }
    }, [navigate]);

    // Step 1: Save profile FIRST
    const handleSaveProfile = async () => {
        // Validation logic
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        const trimmedFullname = fullname.trim();
        const trimmedEmail = email.trim();
        const trimmedResumeText = resumeText.trim();

        if (!trimmedFullname) {
            newErrors.fullname = 'Full Name is required';
            isValid = false;
        }

        if (!trimmedEmail) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = 'Invalid email format';
            isValid = false;
        }

        if (!trimmedResumeText) {
            newErrors.resume = 'Resume text is required';
            isValid = false;
        } else if (trimmedResumeText.length < 50) {
            newErrors.resume = 'Please provide a more detailed resume (at least 50 characters)';
            isValid = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const skillsArray = skills
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            const response = await api.createUser({
                fullname: trimmedFullname,
                email: trimmedEmail,
                masterResumeText: trimmedResumeText,
                skills: skillsArray,
            });

            setUserId(response.id);
            localStorage.setItem('userId', response.id);
            localStorage.setItem('hasProfile', 'true');

            // Move to login step
            setStep('login');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    // Complete login and move to scraping
    const handleLoginComplete = async () => {
        // Store credentials temporarily in sessionStorage (cleared when tab closes)
        // This is more secure than localStorage as it's not persistent and scoped to the tab
        if (internshalaEmail && internshalaPassword) {
            sessionStorage.setItem('internshala_email', internshalaEmail);
            sessionStorage.setItem('internshala_password', internshalaPassword);
        }
        localStorage.setItem('hasInternshalaLogin', internshalaEmail && internshalaPassword ? 'true' : 'false');
        setStep('scraping');
        setLoading(true);

        // Auto-start scraping
        await handleStartScraping();
    };

    // Skip login for now
    const handleSkipLogin = async () => {
        setLoading(true);
        setStep('scraping');
        await handleStartScraping();
    };

    // Step 3: Scrape jobs
    const handleStartScraping = async () => {
        setLoading(true);
        setError(null);

        try {
            await api.scrapeJobs();
            setStep('ready');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to scrape jobs');
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Go to feed
    const handleGoToFeed = () => {
        navigate(`/?userId=${userId}`);
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="steps-indicator">
                    <div className={`step ${step === 'profile' ? 'active' : 'completed'}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Profile</span>
                    </div>
                    <div className={`step ${step === 'login' ? 'active' : (step === 'scraping' || step === 'ready') ? 'completed' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Login</span>
                    </div>
                    <div className={`step ${step === 'scraping' ? 'active' : step === 'ready' ? 'completed' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">Jobs</span>
                    </div>
                    <div className={`step ${step === 'ready' ? 'active' : ''}`}>
                        <span className="step-number">4</span>
                        <span className="step-label">Ready!</span>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Step 1: Profile Setup FIRST */}
                {step === 'profile' && (
                    <div className="step-content">
                        <h1>👤 Create Your Profile</h1>
                        <p className="step-description">
                            Tell us about yourself so we can find the best matching jobs for you.
                        </p>

                        <form className="profile-form" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                            <div className="form-group">
                                <label htmlFor="fullname">Full Name *</label>
                                <input
                                    type="text"
                                    id="fullname"
                                    value={fullname}
                                    onChange={(e) => {
                                        setFullname(e.target.value);
                                        if (errors.fullname) setErrors({ ...errors, fullname: '' });
                                    }}
                                    placeholder="John Doe"
                                    required
                                    className={errors.fullname ? 'error-border' : ''}
                                />
                                {errors.fullname && <span className="input-error">{errors.fullname}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors({ ...errors, email: '' });
                                    }}
                                    placeholder="john@example.com"
                                    required
                                    className={errors.email ? 'error-border' : ''}
                                />
                                {errors.email && <span className="input-error">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="skills">Skills (comma-separated)</label>
                                <input
                                    type="text"
                                    id="skills"
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    placeholder="React, Node.js, Python, Machine Learning"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="resume">Your Resume/CV (paste text) *</label>
                                <textarea
                                    id="resume"
                                    value={resumeText}
                                    onChange={(e) => {
                                        setResumeText(e.target.value);
                                        if (errors.resume) setErrors({ ...errors, resume: '' });
                                    }}
                                    required
                                    className={errors.resume ? 'error-border' : ''}
                                    placeholder={`Paste your complete resume here. Include education, experience, projects, and skills...

Example:
JOHN DOE
Software Engineer | john@example.com

EXPERIENCE
Software Developer at ABC Corp (2022-Present)
- Developed React applications
- Built REST APIs with Node.js

EDUCATION
B.Tech in Computer Science, XYZ University (2022)

SKILLS
JavaScript, React, Node.js, Python, SQL`}
                                    rows={12}
                                />
                                {errors.resume && <span className="input-error">{errors.resume}</span>}
                                <p className="help-text">
                                    💡 The more detailed your resume, the better job matches you'll get!
                                </p>
                            </div>

                            <button type="submit" className="primary-btn" disabled={loading}>
                                {loading ? '⏳ Saving...' : '💾 Save Profile & Continue'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 2: Login to Internshala */}
                {step === 'login' && (
                    <div className="step-content">
                        <h1>🔐 Internshala Credentials</h1>
                        <p className="step-description">
                            Enter your Internshala login details. We'll use these to automatically log in when applying for jobs.
                        </p>

                        <form className="profile-form" onSubmit={(e) => { e.preventDefault(); handleLoginComplete(); }}>
                            <div className="form-group">
                                <label htmlFor="internshala-email">Internshala Email</label>
                                <input
                                    type="email"
                                    id="internshala-email"
                                    placeholder="your-email@example.com"
                                    value={internshalaEmail}
                                    onChange={(e) => setInternshalaEmail(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="internshala-password">Internshala Password</label>
                                <input
                                    type="password"
                                    id="internshala-password"
                                    placeholder="Your password"
                                    value={internshalaPassword}
                                    onChange={(e) => setInternshalaPassword(e.target.value)}
                                />
                            </div>

                            <p className="help-text" style={{ marginBottom: '20px' }}>
                                🔒 Your credentials are stored locally and used only for automated job applications.
                            </p>

                            <div className="action-buttons">
                                <button type="submit" className="primary-btn" disabled={loading}>
                                    {loading ? '⏳ Saving...' : '✅ Save & Continue'}
                                </button>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={handleSkipLogin}
                                    disabled={loading}
                                >
                                    Skip for now →
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 3: Scraping Jobs */}
                {step === 'scraping' && (
                    <div className="step-content">
                        <h1>🔍 Finding Jobs For You</h1>
                        <p className="step-description">
                            We're scraping the latest jobs from Internshala and matching them to your profile...
                        </p>

                        <div className="loading-animation">
                            <div className="spinner-large"></div>
                            <p>Scraping jobs from Internshala...</p>
                            <p className="help-text">This may take a minute</p>
                        </div>
                    </div>
                )}

                {/* Step 4: Ready */}
                {step === 'ready' && (
                    <div className="step-content">
                        <h1>🎉 You're All Set!</h1>
                        <p className="step-description">
                            Your profile is ready and we've found jobs matching your skills. Let's start applying!
                        </p>

                        <div className="ready-animation">
                            <span className="checkmark">✓</span>
                        </div>

                        <button className="primary-btn large" onClick={handleGoToFeed}>
                            🚀 View Matching Jobs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OnboardingPage;
