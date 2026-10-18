import React from 'react';

const FootballLiveCard = ({ score, teamA, teamB }) => {
  const details = score?.details;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
          {score?.summary || '0 - 0'}
        </span>
        {details?.minute && (
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            {details.minute}'
          </span>
        )}
      </div>

      {score?.subtext && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.5rem' }}>
          {score.subtext}
        </div>
      )}

      {/* Scorers List */}
      {(details?.homeScorers || details?.awayScorers) && (
        <div className="live-score-strip" style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #cbd5e1)',
          marginTop: '0.25rem'
        }}>
          {details.homeScorers && <div>⚽ {details.homeScorers.join(', ')}</div>}
          {details.awayScorers && <div>⚽ {details.awayScorers.join(', ')}</div>}
        </div>
      )}
    </div>
  );
};

export default FootballLiveCard;
