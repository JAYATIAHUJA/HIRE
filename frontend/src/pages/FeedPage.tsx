import JobCardSkeleton from '../components/JobCardSkeleton';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, JobCard } from '../api/client';
import './FeedPage.css';

function FeedPage() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filter states
  const [titleSearch, setTitleSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'internshala' | 'linkedin'>('all');
  const [minMatchScore, setMinMatchScore] = useState(0);

  const [userId] = useState(() => {
    // Check URL parameter first
    const urlUserId = searchParams.get('userId');
    if (urlUserId) {
      localStorage.setItem('userId', urlUserId);
      return urlUserId;
    }

    // Get userId from localStorage
    const stored = localStorage.getItem('userId');
    return stored || null;
  });

  // Filtered jobs using useMemo for performance
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Title search filter
      const matchesTitle = titleSearch.trim() === '' ||
        job.title.toLowerCase().includes(titleSearch.toLowerCase());

      // Company search filter
      const matchesCompany = companySearch.trim() === '' ||
        job.company.toLowerCase().includes(companySearch.toLowerCase());

      // Platform filter
      const matchesPlatform = platformFilter === 'all' ||
        job.platform === platformFilter;

      // Match score filter
      const matchesScore = job.matchScore >= minMatchScore;

      return matchesTitle && matchesCompany && matchesPlatform && matchesScore;
    });
  }, [jobs, titleSearch, companySearch, platformFilter, minMatchScore]);

  // Clear all filters
  const clearFilters = () => {
    setTitleSearch('');
    setCompanySearch('');
    setPlatformFilter('all');
    setMinMatchScore(0);
  };

  // Check if any filters are active
  const hasActiveFilters = titleSearch !== '' || companySearch !== '' ||
    platformFilter !== 'all' || minMatchScore > 0;

  useEffect(() => {
    // If no user ID, redirect to onboarding
    if (!userId) {
      navigate('/onboarding');
      return;
    }

    loadFeed();
  }, [userId, navigate]);

  const loadFeed = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const feed = await api.getFeed(userId);
      setJobs(feed);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!userId) return;

    try {
      setApplying(jobId);
      const email = localStorage.getItem('internshala_email') || undefined;
      const password = localStorage.getItem('internshala_password') || undefined;
      const credentials = email && password ? { email, password } : undefined;

      const result = await api.swipeRight(userId, jobId, credentials);
      navigate(`/applications/${result.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to apply');
    } finally {
      setApplying(null);
    }
  };

  const getPlatformBadge = (platform: string) => {
    return platform === 'internshala' ? 'Internshala' : 'LinkedIn';
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'internshala' ? '#00a5ec' : '#0077b5';
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return '#28a745'; // Excellent match - green
    if (score >= 60) return '#17a2b8'; // Good match - blue
    if (score >= 40) return '#ffc107'; // Moderate match - yellow
    return '#dc3545'; // Low match - red
  };

  if (loading) {
    return (
      <div className="feed-container">
        <div className="jobs-grid">
          <JobCardSkeleton variant={1} />
          <JobCardSkeleton variant={2} />
          <JobCardSkeleton variant={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/onboarding')} className="refresh-btn">
          Set Up Profile
        </button>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <header className="feed-header">
        <div>
          <h1>🎯 Your Job Matches</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/applications')} className="secondary-btn">
            📋 History
          </button>
          <button onClick={() => navigate('/onboarding')} className="secondary-btn">
            ⚙️ Settings
          </button>
          <button onClick={loadFeed} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Filter Controls */}
      <div className="filter-container">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="title-search">🔍 Search by Title</label>
            <input
              id="title-search"
              type="text"
              placeholder="e.g. Software Engineer"
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="company-search">🏢 Search by Company</label>
            <input
              id="company-search"
              type="text"
              placeholder="e.g. Google"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="platform-filter">💼 Platform</label>
            <select
              id="platform-filter"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as 'all' | 'internshala' | 'linkedin')}
              className="filter-select"
            >
              <option value="all">All Platforms</option>
              <option value="internshala">Internshala</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="score-filter">
              🎯 Min Match Score: {minMatchScore}%
            </label>
            <input
              id="score-filter"
              type="range"
              min="0"
              max="100"
              step="5"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="filter-range"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-filters-btn">
            ✖ Clear All Filters
          </button>
        )}
      </div>

      {filteredJobs.length === 0 && jobs.length > 0 ? (
        <div className="empty-state">
          <h2>🔍 No matching jobs found</h2>
          <p>Try adjusting your filters to see more results.</p>
          <button onClick={clearFilters} className="primary-btn">
            Clear Filters
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <h2>📭 No jobs found</h2>
          <p>We haven't scraped any jobs yet. Let's get some!</p>
          <button onClick={() => navigate('/onboarding')} className="primary-btn">
            Set Up & Scrape Jobs
          </button>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div key={job.jobId} className="job-card">
              <div
                className="platform-badge"
                style={{ backgroundColor: getPlatformColor(job.platform) }}
              >
                {getPlatformBadge(job.platform)}
              </div>
              <h2 className="job-title">{job.title}</h2>
              <p className="job-company">🏢 {job.company}</p>
              <p className="job-location">📍 {job.location}</p>
              <div
                className="match-score"
                style={{
                  backgroundColor: getMatchColor(job.matchScore),
                  color: job.matchScore >= 40 && job.matchScore < 80 ? '#333' : 'white'
                }}
              >
                🎯 {job.matchScore}% Match
              </div>
              <p className="job-summary">{job.shortSummary}</p>
              <button
                className="apply-btn"
                onClick={() => handleApply(job.jobId)}
                disabled={applying === job.jobId}
              >
                {applying === job.jobId ? '⏳ Applying...' : '✅ Apply Now'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedPage;
