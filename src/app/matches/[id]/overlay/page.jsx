'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { socket } from '../../../../services/socket';

export default function MatchOBSOverlayPage({ params }) {
  const routeParams = useParams();
  const matchId = routeParams?.id || params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState(null);

  // Fetch initial overlay data
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`/api/matches/${matchId}/stream/overlay-data`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load OBS overlay data:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!matchId) return;

    socket.emit('join:match', { matchId });

    const handleMatchUpdate = (payload) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status || prev.status,
          scoreSummary: payload.scoreSummary || payload.live_score_summary || prev.scoreSummary,
          subtext: payload.subtext || payload.live_subtext || prev.subtext,
          sportState: payload.sportState || payload.sport_state || prev.sportState
        };
      });
    };

    const handleBallEvent = (eventData) => {
      if (eventData.celebration) {
        setCelebration(eventData.celebration);
        setTimeout(() => setCelebration(null), 3000);
      } else if (['FOUR', 'SIX', 'WICKET'].includes(eventData.type)) {
        setCelebration(eventData.type);
        setTimeout(() => setCelebration(null), 3000);
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scoreSummary: eventData.scoreSummary || prev.scoreSummary,
          subtext: eventData.subtext || prev.subtext,
          sportState: eventData.sportState || prev.sportState
        };
      });
    };

    const handlePointScored = (payload) => {
      if (payload.celebration) {
        setCelebration(payload.celebration);
        setTimeout(() => setCelebration(null), 2500);
      }
      fetchData();
    };

    const handleOverlayUpdated = ({ overlayConfig }) => {
      setData((prev) => prev ? { ...prev, overlayConfig } : prev);
    };

    socket.on('match:update', handleMatchUpdate);
    socket.on('ball:event', handleBallEvent);
    socket.on('match:pointScored', handlePointScored);
    socket.on('match:undoPoint', fetchData);
    socket.on('stream:overlay_updated', handleOverlayUpdated);

    return () => {
      socket.emit('leave:match', { matchId });
      socket.off('match:update', handleMatchUpdate);
      socket.off('ball:event', handleBallEvent);
      socket.off('match:pointScored', handlePointScored);
      socket.off('match:undoPoint', fetchData);
      socket.off('stream:overlay_updated', handleOverlayUpdated);
    };
  }, [matchId, fetchData]);

  if (loading || !data) {
    return (
      <div style={{ background: 'transparent', minHeight: '100vh', width: '100vw' }} />
    );
  }

  const {
    teamA,
    teamB,
    scoreSummary,
    subtext,
    sportSlug,
    tournamentName,
    status,
    sportState,
    overlayConfig
  } = data;

  if (overlayConfig?.enabled === false) {
    return <div style={{ background: 'transparent', minHeight: '100vh', width: '100vw' }} />;
  }

  const isCricket = sportSlug === 'cricket' || (!sportSlug && scoreSummary?.includes('/'));
  const isPickleball = sportSlug === 'pickleball';
  const isBadminton = sportSlug === 'badminton';
  const isFootball = sportSlug === 'football';

  const isTop = overlayConfig?.position === 'top';

  return (
    <div
      style={{
        background: 'transparent',
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isTop ? 'flex-start' : 'flex-end',
        padding: '2.5rem 3rem',
        boxSizing: 'border-box',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Point Celebration Banner */}
      {celebration && (
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '1rem 3rem',
            borderRadius: '50px',
            background: celebration === 'WICKET'
              ? 'linear-gradient(135deg, #ef4444, #991b1b)'
              : (celebration === 'SIX' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #10b981, #059669)'),
            color: '#fff',
            fontWeight: 900,
            fontSize: '2.2rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            border: '2px solid rgba(255,255,255,0.4)',
            animation: 'celebratePulse 0.4s ease-in-out'
          }}
        >
          {celebration}
        </div>
      )}

      {/* Main Broadcast Lower-Third Overlay Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          borderRadius: '18px',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 20px rgba(16, 185, 129, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header Strip: Tournament & Live Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.45rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.45)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>🏆 {tournamentName || 'TURF TOURNAMENT'}</span>
            <span>•</span>
            <span style={{ color: '#cbd5e1' }}>{data.sportName || 'LIVE MATCH'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: status === 'LIVE' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                color: status === 'LIVE' ? '#ef4444' : '#60a5fa',
                padding: '0.2rem 0.65rem',
                borderRadius: '20px',
                border: `1px solid ${status === 'LIVE' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
                fontWeight: 800,
                fontSize: '0.72rem'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'LIVE' ? '#ef4444' : '#60a5fa', display: 'inline-block' }} />
              {status || 'LIVE'}
            </span>
          </div>
        </div>

        {/* Middle Main Content Strip: Teams & Scores */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.5rem',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Team A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '220px' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #047857)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
              }}
            >
              {teamA?.name ? teamA.name.slice(0, 2).toUpperCase() : 'TA'}
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.15rem' }}>
                {teamA?.name || 'Team A'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isCricket && sportState?.battingTeamName === teamA?.name ? '🏏 Batting' : 'Playing Squad'}
              </div>
            </div>
          </div>

          {/* Center Score Display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 1.5rem',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              borderRight: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              {scoreSummary || '0 - 0'}
            </div>
            {subtext && (
              <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600, marginTop: '0.15rem' }}>
                {subtext}
              </div>
            )}
          </div>

          {/* Team B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '220px', justifyContent: 'flex-end', textAlign: 'right' }}>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.15rem' }}>
                {teamB?.name || 'Team B'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isCricket && sportState?.battingTeamName === teamB?.name ? '🏏 Batting' : 'Playing Squad'}
              </div>
            </div>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              }}
            >
              {teamB?.name ? teamB.name.slice(0, 2).toUpperCase() : 'TB'}
            </div>
          </div>
        </div>

        {/* Cricket Specific Details (Overs, Batsmen, Bowler, Current Over Balls) */}
        {isCricket && sportState && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.55rem 1.5rem',
              background: 'rgba(0, 0, 0, 0.35)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.85rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            {/* Striker & Non-Striker */}
            <div style={{ display: 'flex', gap: '1rem', color: '#cbd5e1' }}>
              {sportState.striker && (
                <span>
                  <strong style={{ color: '#ffffff' }}>{sportState.striker.name}*</strong> {sportState.striker.runs} ({sportState.striker.balls})
                </span>
              )}
              {sportState.nonStriker && (
                <span style={{ color: '#94a3b8' }}>
                  {sportState.nonStriker.name} {sportState.nonStriker.runs} ({sportState.nonStriker.balls})
                </span>
              )}
            </div>

            {/* Current Over Balls */}
            {Array.isArray(sportState.currentOverBalls) && sportState.currentOverBalls.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.2rem' }}>This Over:</span>
                {sportState.currentOverBalls.map((b, idx) => {
                  const isW = String(b).toUpperCase() === 'W';
                  const is4 = String(b) === '4';
                  const is6 = String(b) === '6';
                  let bg = 'rgba(255, 255, 255, 0.15)';
                  let color = '#fff';
                  if (isW) { bg = '#ef4444'; color = '#fff'; }
                  else if (is6) { bg = '#8b5cf6'; color = '#fff'; }
                  else if (is4) { bg = '#10b981'; color = '#fff'; }

                  return (
                    <span
                      key={idx}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: bg,
                        color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}
                    >
                      {b}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Bowler */}
            {sportState.bowler && (
              <div style={{ color: '#94a3b8' }}>
                Bowler: <strong style={{ color: '#ffffff' }}>{sportState.bowler.name}</strong> {sportState.bowler.wickets}/{sportState.bowler.runs} ({sportState.bowler.overs})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
