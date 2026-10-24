'use client';
import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import CricketLiveCard from './CricketLiveCard';
import FootballLiveCard from './FootballLiveCard';
import BadmintonLiveCard from './BadmintonLiveCard';
import CourtView from '../court/CourtView';
import { Radio, Eye, EyeOff, Video } from 'lucide-react';

/**
 * High-performance memoized Live Match Card.
 * Re-renders only when this specific match's score or status changes.
 */
const LiveMatchCard = memo(({ match, canManage = false, onToggleDisplay }) => {
  const { id, uuid, matchNumber, status, courtName, venueName, sportSlug, teamA, teamB, score, showOnDisplay = true, has_live_stream, streamStatus } = match;
  const matchIdentifier = uuid || id;
  const isLiveStream = Boolean(has_live_stream || streamStatus === 'LIVE' || match.hasLiveStream);

  const renderSportCard = () => {
    switch (sportSlug?.toLowerCase()) {
      case 'cricket':
        return <CricketLiveCard score={score} teamA={teamA} teamB={teamB} />;
      case 'football':
        return <FootballLiveCard score={score} teamA={teamA} teamB={teamB} />;
      case 'pickleball':
      case 'badminton':
      case 'tennis':
      case 'table-tennis':
        return (
          <div style={{ marginTop: '0.75rem' }}>
            <CourtView
              sport={sportSlug?.toLowerCase()}
              compact={true}
              teamA={teamA}
              teamB={teamB}
              scoreSummary={score?.summary}
              courtColor={match.courtColor || '#0d5c3a'}
              status={status}
            />
          </div>
        );
      default:
        return (
          <div style={{ marginTop: '0.75rem', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary, #10b981)' }}>
            {score?.summary || 'LIVE'}
          </div>
        );
    }
  };

  const isVisibleOnDisplay = showOnDisplay !== false;

  return (
    <div style={{
      background: 'var(--bg-card-solid, #1e293b)',
      borderRadius: 'var(--radius-md, 12px)',
      padding: '1.25rem',
      border: isVisibleOnDisplay
        ? '1px solid var(--border-color, rgba(255,255,255,0.08))'
        : '1px dashed rgba(239, 68, 68, 0.4)',
      opacity: isVisibleOnDisplay ? 1 : 0.78,
      position: 'relative',
      boxShadow: 'var(--shadow-card)',
      transition: 'all 0.2s ease'
    }}>
      {/* Top Header: Court & LIVE Pulse indicator + TV Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '6px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-heading, #f8fafc)' }}>
            Match #{matchNumber}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '0.5rem' }}>
            {courtName} ({venueName})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onToggleDisplay) onToggleDisplay(id, !isVisibleOnDisplay);
              }}
              title={isVisibleOnDisplay ? "Visible on TV & Signage (Click to hide)" : "Hidden from TV & Signage (Click to show)"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: isVisibleOnDisplay ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isVisibleOnDisplay ? '#10b981' : '#ef4444',
                border: `1px solid ${isVisibleOnDisplay ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                padding: '2px 7px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isVisibleOnDisplay ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>{isVisibleOnDisplay ? 'TV: ON' : 'TV: OFF'}</span>
            </button>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: isLiveStream ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
            color: 'var(--accent-rose, #ef4444)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: isLiveStream ? '1px solid rgba(239, 68, 68, 0.4)' : 'none'
          }}>
            <Radio size={12} className="animate-pulse" />
            <span>{isLiveStream ? 'LIVE STREAM' : 'LIVE'}</span>
          </div>
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
      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to={`/matches/${matchIdentifier}/live`}
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#ef4444',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Radio size={12} /> Live Score
          </Link>

          <Link
            to={`/matches/${matchIdentifier}/scorer`}
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
            🏏 Scorer
          </Link>

          {isLiveStream && (
            <Link
              to={`/matches/${matchIdentifier}/watch`}
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#ef4444',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.12)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              <Video size={12} />
              <span>Watch Live</span>
            </Link>
          )}
        </div>

        <Link
          to={`/matches/${matchIdentifier}`}
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
