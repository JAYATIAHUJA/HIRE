import JobCardSkeleton from '../components/JobCardSkeleton';
import React, { useState, useEffect, useMemo } from 'react';
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
  const [platformFilter, setPlatformFilter] = useState<'all' | 'internshala' | 'linkedin' | 'other'>('all');
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

  // Manual Job Addition State
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState('');
  const [addingJob, setAddingJob] = useState(false);

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
      // Modified logic to include 'other' and robust null checking
      const matchesPlatform = platformFilter === 'all' || 
        (platformFilter === 'other' 
          ? (!job.platform || !['internshala', 'linkedin'].includes(job.platform))
          : job.platform === platformFilter);

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

  const [scraping, setScraping] = useState(false);

  const handleScrapeAll = async () => {
    try {
      setScraping(true);
      const res = await api.scrapeJobs(); 
      alert(res.message || 'Scraping started in background.');
      // Wait a partial moment just to give UI feedback, but don't block
      setTimeout(() => loadFeed(), 2000);
    } catch (err: any) {
      console.error('Scrape error:', err);
      alert('Failed to start scraping: ' + err.message);
    } finally {
      setScraping(false);
    }
  };

  const loadFeed = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const feed = await api.getFeed(userId);
      console.log('Feed loaded:', feed);
      setJobs(Array.isArray(feed) ? feed : []);
    } catch (err: any) {
      console.error('Feed load error:', err);
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

  const handleScrapeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobUrl) return;

    try {
      setAddingJob(true);
      await api.scrapeUniversal(newJobUrl);
      setNewJobUrl('');
      setShowAddUrl(false);
      alert('Job scraped successfully! Reloading feed...');
      loadFeed();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to scrape job');
    } finally {
      setAddingJob(false);
    }
  };

  const getPlatformBadge = (platform?: string) => {
    if (!platform) return 'Unknown';
    switch (platform.toLowerCase()) {
      case 'internshala': return 'Internshala';
      case 'linkedin': return 'LinkedIn';
      case 'indeed': return 'Indeed';
      case 'glassdoor': return 'Glassdoor';
      case 'monster': return 'Monster';
      case 'ziprecruiter': return 'ZipRecruiter';
      default: return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  const getPlatformColor = (platform?: string) => {
    if (!platform) return '#666';
    switch (platform.toLowerCase()) {
      case 'internshala': return '#00a5ec';
      case 'linkedin': return '#0077b5';
      case 'indeed': return '#003A9B';       // Indeed Blue
      case 'glassdoor': return '#0CAA41';    // Glassdoor Green
      case 'monster': return '#6e46ae';      // Monster Purple
      case 'ziprecruiter': return '#35d082'; // ZipRecruiter Green
      default: return '#666';                // Grey for others
    }
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
          <button 
            onClick={() => setShowAddUrl(!showAddUrl)} 
            className="secondary-btn"
            style={{ backgroundColor: showAddUrl ? '#eef' : '' }}
          >
            ➕ Add Job
          </button>
          <button onClick={() => navigate('/applications')} className="secondary-btn">
            📋 History
          </button>
          <button onClick={() => navigate('/onboarding')} className="secondary-btn">
            ⚙️ Settings
          </button>
          <button 
            onClick={handleScrapeAll} 
            className="secondary-btn" 
            disabled={scraping}
            style={{ backgroundColor: scraping ? '#ffeeba' : '' }}
          >
            {scraping ? '⏳ Scraping...' : '🕵️ Scrape New Jobs'}
          </button>
          <button onClick={loadFeed} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </header>

      {showAddUrl && (
        <div className="add-job-panel" style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #eee',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ marginTop: 0 }}>📥 Add Job from URL</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
            Paste a job posting URL from any site and our AI will extract the details.
          </p>
          
          <form onSubmit={handleScrapeUrl} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="url"
              placeholder="https://www.indeed.com/viewjob?..."
              value={newJobUrl}
              onChange={(e) => setNewJobUrl(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              required
            />
            <button 
              type="submit" 
              className="primary-btn"
              disabled={addingJob}
            >
              {addingJob ? 'Scraping...' : 'Scrape & Add'}
            </button>
          </form>

          <div className="quick-links" style={{ fontSize: '0.85rem' }}>
            <strong>Supported Platforms:</strong>{' '}
            <a href="https://www.indeed.com" target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#003A9B' }}>Indeed</a>
            <a href="https://www.linkedin.com/jobs" target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#0077b5' }}>LinkedIn</a>
            <a href="https://www.glassdoor.com" target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#0CAA41' }}>Glassdoor</a>
            <a href="https://www.ziprecruiter.com" target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#35d082' }}>ZipRecruiter</a>
            <a href="https://www.monster.com" target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#6e46ae' }}>Monster</a>
          </div>
        </div>
      )}

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
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Platforms</option>
              <option value="internshala">Internshala</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other (Indeed, etc.)</option>
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
