'use client';
import React, { useMemo } from 'react';
import CourtView from './CourtView';
import { getServeState, getCourtState } from './courtUtils';

export { getServeState, getCourtState };

/**
 * Shared Badminton Court Component.
 * Guaranteed zero divergence between Admin Scorer and TV Display views.
 *
 * All visual indicators (shuttle position, server racket glow, target box highlight,
 * badges, and footer text) are strictly derived from getServeState(match).
 *
 * @param {Object} props
 * @param {Object} props.match - Authoritative match state object.
 * @param {Object} props.serveState - Precomputed serve state (optional).
 * @param {string} props.courtColor - Court surface color hex (default #0d5c3a).
 * @param {Array} props.courtAds - Sponsor decals.
 * @param {string} props.theme - 'dark' | 'light'.
 * @param {boolean} props.ambientRally - Whether to run gentle idle rally.
 * @param {string} props.lastEventType - 'POINT' | 'UNDO'.
 * @param {number} props.eventSeq - Monotonic event sequence.
 */
export default function BadmintonCourt({
  match = null,
  serveState: propServeState = null,
  courtColor = '#0d5c3a',
  courtAds = [],
  theme = 'dark',
  showFooter = false,
  ambientRally = true,
  lastEventType = null,
  eventSeq = null,
  isGamePoint = false,
  isMatchPoint = false,
  status = 'LIVE',
  compact = false,
  className = '',
  style = {}
}) {
  // Single source of truth derivation
  const serveState = useMemo(() => {
    if (propServeState) return propServeState;
    return getServeState(match);
  }, [propServeState, match]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CourtView
        match={match}
        serveState={serveState}
        sport="badminton"
        format="DOUBLES"
        courtColor={courtColor}
        courtAds={courtAds}
        theme={theme}
        ambientRally={ambientRally}
        lastEventType={lastEventType}
        eventSeq={eventSeq}
        isGamePoint={isGamePoint}
        isMatchPoint={isMatchPoint}
        status={status}
        compact={compact}
        className={className}
        style={style}
      />
      {showFooter && serveState.label && (
        <div style={{
          marginTop: '0.65rem',
          fontSize: 'clamp(0.75rem, 1vw, 0.9rem)',
          fontWeight: 700,
          color: theme === 'dark' ? '#94a3b8' : 'var(--text-secondary, #334155)',
          textAlign: 'center'
        }}>
          {serveState.label}
        </div>
      )}
    </div>
  );
}
