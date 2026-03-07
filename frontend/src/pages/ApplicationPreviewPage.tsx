import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Application } from '../api/client';
import './ApplicationPreviewPage.css';

function ApplicationPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (id) {
      loadApplication();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll for updates when status is Drafting (live streaming)
  useEffect(() => {
    if (application?.status === 'Drafting') {
      const interval = setInterval(async () => {
        try {
          const app = await api.getApplication(id!);
          setApplication(app);

          // Stop polling once we're past Drafting
          if (app.status !== 'Drafting') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [application?.status, id]);

  const loadApplication = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const app = await api.getApplication(id);
      setApplication(app);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    try {
      setApproving(true);
      await api.approveApplication(id);
      // Reload to get updated status
      await loadApplication();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Drafting':
        return '#ffc107';
      case 'NeedsApproval':
        return '#17a2b8';
      case 'Submitted':
        return '#28a745';
      case 'Failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="preview-container">
        <div className="loading">Loading application...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="preview-container">
        <div className="error">{error || 'Application not found'}</div>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <header className="preview-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Feed
        </button>
        <h1>📄 Application Preview</h1>
      </header>

      <div className="application-details">
        <div className="status-section">
          <h2>Status</h2>
          <div
            className="status-badge"
            style={{ backgroundColor: getStatusColor(application.status) }}
          >
            {application.status === 'NeedsApproval' ? '⏳ Needs Approval' :
              application.status === 'Submitted' ? '✅ Submitted' :
                application.status === 'Drafting' ? '🔄 In Progress' :
                  application.status === 'Failed' ? '❌ Failed' : application.status}
          </div>
        </div>

        <div className="job-info-section">
          <h2>📋 Job Details</h2>
          <p>
            <strong>Title:</strong> {application.job.title}
          </p>
          <p>
            <strong>Company:</strong> {application.job.company}
          </p>
          <p>
            <strong>Platform:</strong> {application.job.platform}
          </p>
          <p>
            <strong>URL:</strong>{' '}
            <a href={application.job.url} target="_blank" rel="noopener noreferrer">
              View Job Posting →
            </a>
          </p>
        </div>

        {/* LIVE STREAMING SECTION - Show when Drafting */}
        {application.status === 'Drafting' && (
          <div className="live-stream-section">
            <h2>🔴 LIVE: Watching AI Fill Your Application</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              The AI is currently filling out the application form. Watch it work in real-time!
            </p>

            {application.streamUrl ? (
              <div className="stream-container">
                <iframe
                  src={application.streamUrl}
                  width="100%"
                  height="600"
                  title="Live Browser Stream"
                  style={{
                    border: '2px solid #333',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                  }}
                  allow="autoplay"
                />
                <p style={{ textAlign: 'center', color: '#888', marginTop: '10px' }}>
                  💡 If the stream doesn't load, try opening{' '}
                  <a href="http://localhost:7900" target="_blank" rel="noopener noreferrer">
                    localhost:7900
                  </a>{' '}
                  in a new tab (noVNC viewer)
                </p>
              </div>
            ) : (
              <div className="stream-placeholder">
                <div className="spinner"></div>
                <p>Initializing browser stream...</p>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                  You can also watch at{' '}
                  <a href="http://localhost:7900" target="_blank" rel="noopener noreferrer">
                    http://localhost:7900
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {application.status === 'NeedsApproval' && (
          <div className="approval-section">
            <h2>✅ Review & Approve</h2>
            {application.previewScreenshotUrl ? (
              <div className="screenshot-container">
                <img
                  src={application.previewScreenshotUrl}
                  alt="Application form preview"
                  className="screenshot"
                />
              </div>
            ) : (
              <p>No preview screenshot available</p>
            )}

            {application.tailoredResumeUrl && (
              <div className="resume-link">
                <a
                  href={`http://localhost:3000${application.tailoredResumeUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resume-btn"
                >
                  📄 View Tailored Resume
                </a>
              </div>
            )}

            <button
              className="approve-btn"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? '⏳ Submitting...' : '✅ Approve & Submit Application'}
            </button>
          </div>
        )}

        {application.status === 'Submitted' && (
          <div className="success-section">
            <h2>🎉 Application Submitted Successfully!</h2>
            <p>Your application has been submitted to {application.job.company}.</p>
            {application.previewScreenshotUrl && (
              <div className="screenshot-container">
                <img
                  src={application.previewScreenshotUrl}
                  alt="Submission confirmation"
                  className="screenshot"
                />
              </div>
            )}
          </div>
        )}

        {application.status === 'Failed' && (
          <div className="error-section">
            <h2>❌ Application Submission Failed</h2>
            <p>There was an error submitting the application. {application.failureReason}</p>
            <button
              className="primary-btn"
              onClick={async () => {
                try {
                  setApproving(true);
                  // We can reuse the approve endpoint or add a retry one, but let's just use a simple restart logic
                  // Actually the retry endpoint exists in backend
                  const email = localStorage.getItem('internshala_email') || undefined;
                  const password = localStorage.getItem('internshala_password') || undefined;
                  const credentials = email && password ? { email, password } : undefined;

                  await api.retryApplication(id || '', credentials);
                  window.location.reload();
                } catch (e) {
                  alert('Retry failed');
                  setApproving(false);
                }
              }}
              disabled={approving}
              style={{ marginTop: '1rem', backgroundColor: '#007bff' }}
            >
              🔄 Retry Application
            </button>
            <p className="help-text">Try applying manually if this persists.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationPreviewPage;



