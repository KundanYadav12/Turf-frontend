import React from 'react';

const CricketLiveCard = ({ score, teamA, teamB }) => {
  const details = score?.details;
  const striker = details?.striker;
  const nonStriker = details?.nonStriker;
  const bowler = details?.bowler;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
          {score?.summary || 'Yet to Start'}
        </span>
        {details?.target && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
            Target: {details.target}
          </span>
        )}
      </div>

      {score?.subtext && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.6rem' }}>
          {score.subtext}
        </div>
      )}

      {/* Crease snapshot (striker, non-striker & bowler) */}
      {striker && (
        <div className="live-score-strip" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.75rem',
          marginTop: '0.25rem'
        }}>
          <div>
            <span style={{ color: 'var(--accent-primary, #10b981)', fontWeight: 600 }}>* {striker.name}</span>: {striker.runs} ({striker.balls})
            {nonStriker && (
              <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                {nonStriker.name}: {nonStriker.runs} ({nonStriker.balls})
              </div>
            )}
          </div>
          {bowler && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>Bowl: {bowler.name}</span>
              <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                {bowler.overs} ov | {bowler.wickets}/{bowler.runs}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CricketLiveCard;
