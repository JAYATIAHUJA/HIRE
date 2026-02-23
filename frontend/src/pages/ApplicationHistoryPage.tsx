import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Application } from '../api/client';
import './ApplicationHistoryPage.css';

function ApplicationHistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [userId] = useState(() => {
    return localStorage.getItem('userId') || null;
  });

  useEffect(() => {
    if (!userId) {
      navigate('/onboarding');
      return;
    }

    loadApplications();
  }, [userId, navigate]);

  const loadApplications = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const apps = await api.getUserApplications(userId);
      // Sort by most recent first
      const sorted = apps.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setApplications(sorted);
    } catch (err: any) {
      // Error toast is handled by the interceptor
      setError(err.response?.data?.error || err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'Drafting': { text: '📝 Drafting', color: '#6c757d' },
      'NeedsApproval': { text: '⏳ Needs Approval', color: '#ffc107' },
      'Submitted': { text: '✅ Submitted', color: '#28a745' },
      'Failed': { text: '❌ Failed', color: '#dc3545' }
    };
    return badges[status as keyof typeof badges] || badges['Drafting'];
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'internshala' ? '#00a5ec' : '#0077b5';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="error">{error}</div>
        <button onClick={loadApplications} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <div>
          <h1>📋 Application History</h1>
          <p className="subtitle">
            {applications.length} application{applications.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/')} className="secondary-btn">
            ← Back to Feed
          </button>
          <button onClick={loadApplications} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </header>

      {applications.length === 0 ? (
        <div className="empty-state">
          <h2>📭 No Applications Yet</h2>
          <p>You haven't applied to any jobs yet. Start applying to see your history here!</p>
          <button onClick={() => navigate('/')} className="primary-btn">
            🚀 Browse Jobs
          </button>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((app) => {
            const statusBadge = getStatusBadge(app.status);
            
            return (
              <div key={app.id} className="application-card">
                <div className="application-header">
                  <div className="job-info">
                    <h3 className="job-title">{app.job.title}</h3>
                    <p className="job-company">
                      🏢 {app.job.company}
                      {app.job.location && ` • 📍 ${app.job.location}`}
                    </p>
                  </div>
                  <div
                    className="platform-badge"
                    style={{ backgroundColor: getPlatformColor(app.job.platform) }}
                  >
                    {app.job.platform === 'internshala' ? 'Internshala' : 'LinkedIn'}
                  </div>
                </div>

                <div className="application-meta">
                  <div
                    className="status-badge"
                    style={{ backgroundColor: statusBadge.color }}
                  >
                    {statusBadge.text}
                  </div>
                  <div className="timestamp">
                    🕒 Applied {formatDate(app.createdAt)}
                  </div>
                </div>

                {app.failureReason && (
                  <div className="failure-reason">
                    ⚠️ {app.failureReason}
                  </div>
                )}

                <div className="application-actions">
                  <button
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="view-btn"
                  >
                    👁️ View Details
                  </button>
                  {app.job.url && (
                    <a
                      href={app.job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-link-btn"
                    >
                      🔗 View Job
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApplicationHistoryPage;
