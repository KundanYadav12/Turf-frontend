'use client';
import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import CricketLiveCard from './CricketLiveCard';
import FootballLiveCard from './FootballLiveCard';
import BadmintonLiveCard from './BadmintonLiveCard';
import { Radio } from 'lucide-react';

/**
 * High-performance memoized Live Match Card.
 * Re-renders only when this specific match's score or status changes.
 */
const LiveMatchCard = memo(({ match }) => {
  const { id, matchNumber, status, courtName, venueName, sportSlug, teamA, teamB, score } = match;

  const renderSportCard = () => {
    switch (sportSlug?.toLowerCase()) {
      case 'cricket':
        return <CricketLiveCard score={score} teamA={teamA} teamB={teamB} />;
      case 'football':
        return <FootballLiveCard score={score} teamA={teamA} teamB={teamB} />;
      case 'badminton':
        return <BadmintonLiveCard score={score} teamA={teamA} teamB={teamB} />;
      default:
        return (
          <div style={{ marginTop: '0.75rem', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary, #10b981)' }}>
            {score?.summary || 'LIVE'}
          </div>
        );
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card-solid, #1e293b)',
      borderRadius: 'var(--radius-md, 12px)',
      padding: '1.25rem',
      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
      position: 'relative',
      boxShadow: 'var(--shadow-card)'
    }}>
      {/* Top Header: Court & LIVE Pulse indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-heading, #f8fafc)' }}>
            Match #{matchNumber}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '0.5rem' }}>
            {courtName} ({venueName})
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--accent-rose, #ef4444)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.72rem',
          fontWeight: 800
        }}>
          <Radio size={12} className="animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Teams Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading, #ffffff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          {teamA?.logo && (
            <img src={teamA.logo} alt={teamA.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <span>{teamA?.name}</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', margin: '0 0.5rem' }}>vs</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', flex: 1 }}>
          <span>{teamB?.name}</span>
          {teamB?.logo && (
            <img src={teamB.logo} alt={teamB.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
          )}
        </div>
      </div>

      {/* Dynamic Sport-Specific Scoreboard */}
      {renderSportCard()}

      {/* Action CTA */}
      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to={`/matches/${id}/scorer`}
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--accent-secondary, #06b6d4)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          🏏 Scorer Console
        </Link>

        <Link
          to={`/matches/${id}`}
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--accent-primary, #10b981)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          Live Display →
        </Link>
      </div>
    </div>
  );
});

export default LiveMatchCard;
