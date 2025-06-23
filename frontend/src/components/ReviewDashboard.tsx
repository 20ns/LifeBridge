import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';
import './ReviewDashboard.css';
import { API_BASE_URL } from '../config';

interface ReviewRequest {
  requestId: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  qualityMetrics: {
    confidence: number;
    medical_accuracy: number;
    cultural_appropriateness: number;
    emergency_urgency_preserved: boolean;
    terminology_consistency: number;
    bias_score: number;
    hallucination_risk: number;
    overall_quality: number;
  };
  flaggedIssues: string[];
  timestamp: string;
  sessionId: string;
  reviewStatus: 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_revision';
}

interface ReviewMetrics {
  totalReviews: number;
  pendingReviews: number;
  emergencyReviews: number;
  averageReviewTime: string;
  qualityImprovements: {
    approved: number;
    requiresRevision: number;
    rejected: number;
  };
}

const ReviewDashboard: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<ReviewRequest[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewRequest | null>(null);
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'emergency' | 'high' | 'medium' | 'low'>('all');
  const [reviewerId] = useState('reviewer-' + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    loadPendingReviews();
    loadMetrics();
    const interval = setInterval(loadPendingReviews, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);
  const loadPendingReviews = async () => {
    try {
      const emergency = filter === 'emergency';
      const priority = filter !== 'all' && filter !== 'emergency' ? filter : undefined;
      
      const response = await fetch(`${API_BASE_URL}/review/pending?${new URLSearchParams({
        ...(priority && { priority }),
        ...(emergency && { emergency: 'true' })
      })}`);
      
      if (!response.ok) throw new Error('Failed to load pending reviews');
        const data = await response.json();
      setPendingReviews(data.data?.pendingReviews || []);
    } catch (err) {
      setError('Failed to load pending reviews');
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };
  const loadMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/review/metrics`);
      if (!response.ok) throw new Error('Failed to load metrics');
        const data = await response.json();
      setMetrics(data.data?.metrics || data.metrics);
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  };
  const submitReview = async (
    reviewId: string,
    reviewStatus: 'approved' | 'rejected' | 'requires_revision',
    reviewNotes: string,
    finalTranslation?: string
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/review/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          reviewStatus,
          reviewerId,
          reviewNotes,
          finalTranslation
        })
      });

      if (!response.ok) throw new Error('Failed to submit review');

      // Refresh the reviews list
      await loadPendingReviews();
      setSelectedReview(null);
      
    } catch (err) {
      setError('Failed to submit review');
      console.error('Error submitting review:', err);
    }
  };
  const escalateReview = async (reviewId: string, escalationReason: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/review/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          escalationReason,
          urgentContact: reviewerId
        })
      });

      if (!response.ok) throw new Error('Failed to escalate review');

      await loadPendingReviews();
      
    } catch (err) {
      setError('Failed to escalate review');
      console.error('Error escalating review:', err);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="priority-icon critical" />;
      case 'high':
        return <AlertTriangle className="priority-icon high" />;
      case 'medium':
        return <Clock className="priority-icon medium" />;
      default:
        return <Clock className="priority-icon low" />;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'quality-high';
    if (score >= 0.6) return 'quality-medium';
    return 'quality-low';
  };

  if (loading) {
    return (
      <div className="review-dashboard loading">
        <div className="loading-wrapper" role="status" aria-live="polite">
          <div className="loading-spinner" />
          <span className="loading-text">Loading review dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="review-dashboard">
      <div className="dashboard-header">
        <h1>Medical Translation Review Dashboard</h1>
        <div className="metrics-summary">
          {metrics && (
            <>
              <div className="metric-card">
                <Users className="metric-icon" />
                <div>
                  <div className="metric-value">{metrics.pendingReviews}</div>
                  <div className="metric-label">Pending Reviews</div>
                </div>
              </div>
              <div className="metric-card emergency">
                <AlertTriangle className="metric-icon" />
                <div>
                  <div className="metric-value">{metrics.emergencyReviews}</div>
                  <div className="metric-label">Emergency Reviews</div>
                </div>
              </div>
              <div className="metric-card">
                <TrendingUp className="metric-icon" />
                <div>
                  <div className="metric-value">{metrics.averageReviewTime}</div>
                  <div className="metric-label">Avg Review Time</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="dashboard-filters">
        <div className="filter-buttons">
          {['all', 'emergency', 'critical', 'high', 'medium', 'low'].map(filterType => (
            <button
              key={filterType}
              className={`filter-button ${filter === filterType ? 'active' : ''}`}
              onClick={() => setFilter(filterType as any)}
            >
              {filterType === 'all' ? 'All Reviews' : 
               filterType === 'emergency' ? 'Emergency' : 
               filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        <div className={`reviews-list ${pendingReviews.length === 0 ? 'no-reviews' : ''}`}>
          <h2>Pending Reviews ({pendingReviews.length})</h2>
          {pendingReviews.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <p>No pending reviews</p>
              <p className="empty-state-subtitle">All translations are currently up to date</p>
            </div>
          ) : (
            pendingReviews.map(review => (
              <div
                key={review.requestId}
                className={`review-card ${review.priority} ${selectedReview?.requestId === review.requestId ? 'selected' : ''}`}
                onClick={() => setSelectedReview(review)}
              >
                <div className="review-header">
                  {getPriorityIcon(review.priority)}
                  <div className="review-info">
                    <div className="language-pair">
                      {review.sourceLanguage} → {review.targetLanguage}
                    </div>
                    <div className="review-context">{review.context}</div>
                  </div>
                  <div className="review-timestamp">
                    {new Date(review.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="review-preview">
                  <div className="text-preview">
                    <strong>Original:</strong> {review.originalText.substring(0, 100)}...
                  </div>
                  <div className="text-preview">
                    <strong>Translation:</strong> {review.translatedText.substring(0, 100)}...
                  </div>
                </div>

                <div className="review-metrics">
                  <div className={`quality-score ${getQualityColor(review.qualityMetrics.overall_quality)}`}>
                    Quality: {Math.round(review.qualityMetrics.overall_quality * 100)}%
                  </div>
                  {review.flaggedIssues.length > 0 && (
                    <div className="flagged-issues">
                      <AlertTriangle size={14} />
                      {review.flaggedIssues.length} issue{review.flaggedIssues.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedReview && (
          <ReviewPanel
            review={selectedReview}
            onSubmit={submitReview}
            onEscalate={escalateReview}
            onClose={() => setSelectedReview(null)}
          />
        )}
      </div>
    </div>
  );
};

interface ReviewPanelProps {
  review: ReviewRequest;
  onSubmit: (reviewId: string, status: 'approved' | 'rejected' | 'requires_revision', notes: string, finalTranslation?: string) => void;
  onEscalate: (reviewId: string, reason: string) => void;
  onClose: () => void;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ review, onSubmit, onEscalate, onClose }) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [finalTranslation, setFinalTranslation] = useState(review.translatedText);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  const handleSubmit = (status: 'approved' | 'rejected' | 'requires_revision') => {
    onSubmit(review.requestId, status, reviewNotes, finalTranslation !== review.translatedText ? finalTranslation : undefined);
  };

  const handleEscalate = () => {
    onEscalate(review.requestId, escalationReason);
    setShowEscalation(false);
  };

  return (
    <div className="review-panel">
      <div className="review-panel-header">
        <h3>Review Translation</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="review-details">
        <div className="detail-row">
          <span className="detail-label">Priority:</span>
          <span className={`priority-badge ${review.priority}`}>{review.priority.toUpperCase()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Context:</span>
          <span>{review.context}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Languages:</span>
          <span>{review.sourceLanguage} → {review.targetLanguage}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Session ID:</span>
          <span className="session-id">{review.sessionId}</span>
        </div>
      </div>

      <div className="translation-comparison">
        <div className="text-section">
          <h4>Original Text</h4>
          <div className="text-content original">{review.originalText}</div>
        </div>
        
        <div className="text-section">
          <h4>Translated Text</h4>
          <textarea
            className="text-content translation"
            value={finalTranslation}
            onChange={(e) => setFinalTranslation(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div className="quality-details">
        <h4>Quality Metrics</h4>
        <div className="metrics-grid">
          <div className="metric">
            <span>Overall Quality:</span>
            <span className={getQualityColor(review.qualityMetrics.overall_quality)}>
              {Math.round(review.qualityMetrics.overall_quality * 100)}%
            </span>
          </div>
          <div className="metric">
            <span>Medical Accuracy:</span>
            <span className={getQualityColor(review.qualityMetrics.medical_accuracy)}>
              {Math.round(review.qualityMetrics.medical_accuracy * 100)}%
            </span>
          </div>
          <div className="metric">
            <span>Cultural Appropriateness:</span>
            <span className={getQualityColor(review.qualityMetrics.cultural_appropriateness)}>
              {Math.round(review.qualityMetrics.cultural_appropriateness * 100)}%
            </span>
          </div>
          <div className="metric">
            <span>Bias Score:</span>
            <span className={review.qualityMetrics.bias_score > 0.3 ? 'quality-low' : 'quality-high'}>
              {Math.round(review.qualityMetrics.bias_score * 100)}%
            </span>
          </div>
        </div>
      </div>

      {review.flaggedIssues.length > 0 && (
        <div className="flagged-issues-section">
          <h4>Flagged Issues</h4>
          <ul>
            {review.flaggedIssues.map((issue, index) => (
              <li key={index} className="flagged-issue">
                <AlertTriangle size={14} />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="review-notes">
        <h4>Review Notes</h4>
        <textarea
          placeholder="Add your review notes here..."
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="review-actions">
        <button 
          className="action-button approve"
          onClick={() => handleSubmit('approved')}
        >
          <CheckCircle size={16} />
          Approve
        </button>
        
        <button 
          className="action-button revise"
          onClick={() => handleSubmit('requires_revision')}
        >
          <Clock size={16} />
          Requires Revision
        </button>
        
        <button 
          className="action-button reject"
          onClick={() => handleSubmit('rejected')}
        >
          <XCircle size={16} />
          Reject
        </button>
        
        <button 
          className="action-button escalate"
          onClick={() => setShowEscalation(true)}
        >
          <AlertTriangle size={16} />
          Escalate
        </button>
      </div>

      {showEscalation && (
        <div className="escalation-modal">
          <div className="modal-backdrop" onClick={() => setShowEscalation(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h4>Escalate Review</h4>
              <textarea
                placeholder="Reason for escalation..."
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={3}
              />
              <div className="modal-actions">
                <button onClick={handleEscalate} className="escalate-confirm">
                  Escalate
                </button>
                <button onClick={() => setShowEscalation(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function getQualityColor(score: number): string {
    if (score >= 0.8) return 'quality-high';
    if (score >= 0.6) return 'quality-medium';
    return 'quality-low';
  }
};

export default ReviewDashboard;
