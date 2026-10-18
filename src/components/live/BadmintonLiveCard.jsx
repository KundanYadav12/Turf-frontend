import React from 'react';

const BadmintonLiveCard = ({ score, teamA, teamB }) => {
  const details = score?.details;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
          {score?.summary || 'Game 1'}
        </span>
        {details?.currentSet && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
            Set {details.currentSet}
          </span>
        )}
      </div>

      {score?.subtext && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.5rem' }}>
          {score.subtext}
        </div>
      )}

      {details?.server && (
        <div className="live-score-strip" style={{
          fontSize: '0.75rem',
          color: 'var(--accent-primary, #10b981)',
          fontWeight: 600,
          marginTop: '0.25rem'
        }}>
          🏸 Serving: {details.server}
        </div>
      )}
    </div>
  );
};

export default BadmintonLiveCard;
