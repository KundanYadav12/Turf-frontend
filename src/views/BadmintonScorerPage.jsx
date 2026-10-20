'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from '../lib/routerCompat';
import axios from 'axios';
import { socket } from '../services/socket';
import {
  Trophy, ArrowLeft, RotateCcw, AlertTriangle, CheckCircle,
  Zap, Award, Play, Shield, ChevronRight
} from 'lucide-react';
import BadmintonCourt, { getServeState } from '../components/court/BadmintonCourt';

export default function BadmintonScorerPage({ matchId: propsMatchId } = {}) {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastEventType, setLastEventType] = useState(null);

  // Fetch full scorer state
  const fetchState = useCallback(async () => {
    try {
      const res = await axios.get(`/api/matches/${id}/badminton`);
      if (res.data.success) {
        setState(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load badminton scorer state.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Socket.IO Room Hook
  useEffect(() => {
    if (!id) return;
    socket.emit('join:match', { matchId: id });

    const handleUpdate = () => {
      fetchState();
    };

    socket.on('match:badmintonEvent', handleUpdate);
    return () => {
      socket.off('match:badmintonEvent', handleUpdate);
      socket.emit('leave:match', { matchId: id });
    };
  }, [id, fetchState]);

  // Start Match Live
  const handleStartMatch = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/badminton/start`);
      if (res.data.success) {
        setNotification('Badminton match is now LIVE!');
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to start match.');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Point (+1 Team A or +1 Team B)
  const handleRecordPoint = async (scoringSide) => {
    setActionLoading(true);
    try {
      setLastEventType('POINT');
      const res = await axios.post(`/api/matches/${id}/badminton/point`, {
        scoringSide
      });
      if (res.data.success) {
        if (res.data.isCompleted) {
          setNotification(`Match Completed! ${res.data.resultSummary}`);
        }
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to record point.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Point
  const handleUndo = async () => {
    setActionLoading(true);
    try {
      setLastEventType('UNDO');
      const res = await axios.post(`/api/matches/${id}/badminton/undo`);
      if (res.data.success) {
        setNotification('Point undone.');
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to undo point.');
    } finally {
      setActionLoading(false);
    }
  };

  const match = state?.match;
  const bState = state?.state;
  const events = state?.events || [];
  const currentGameNum = bState?.currentGame || 1;
  const currentGameObj = bState?.gameScores?.[currentGameNum - 1] || { teamA: 0, teamB: 0 };
  const isMatchLive = match?.status === 'LIVE';
  const isCompleted = match?.status === 'COMPLETED';

  // Authoritative Serve State strictly derived via pure getServeState
  const serveState = useMemo(() => {
    if (!match) return null;
    return getServeState({
      teamA: match.teamA,
      teamB: match.teamB,
      scoreA: currentGameObj.teamA,
      scoreB: currentGameObj.teamB,
      currentGame: currentGameNum,
      currentServer: bState?.currentServer,
      serverCourt: bState?.serverCourt,
      servingTeam: bState?.servingTeam || (bState?.currentServer === 'B' ? 'teamB' : 'teamA'),
      sport_state: bState,
      _eventSeq: bState?.eventSeq
    });
  }, [match, currentGameObj, currentGameNum, bState]);

  const isServingA = Boolean(serveState?.isTeamAServing);
  const isServingB = !isServingA;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Badminton Scorer Console…</div>;
  }

  if (!state || !match) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 style={{ color: '#ef4444' }}>Match not found</h2>
        <Link to="/tournaments" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Tournaments</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to={`/tournaments/${match.tournament.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted, #475569)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Tournament
        </Link>
        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
          <Zap size={13} /> {match.tournament.name} &bull; Match #{match.matchNumber}
        </span>
      </div>

      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slot-available-bg, rgba(16,185,129,0.15))', border: '1px solid var(--slot-available-border, rgba(16,185,129,0.3))', color: 'var(--slot-available-text, #047857)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 700 }}>
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 700 }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Scoring Arena Card */}
      <div className="glass-panel" style={{
        padding: 'clamp(1.5rem, 3vw, 2.5rem)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        textAlign: 'center',
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span className="badge" style={{
            background: 'var(--slot-available-bg, rgba(16,185,129,0.15))',
            color: 'var(--slot-available-text, #047857)',
            border: '1px solid var(--slot-available-border, rgba(16,185,129,0.3))',
            fontWeight: 800
          }}>
            Game {currentGameNum} of 3
          </span>
          <span className="badge" style={{
            background: 'var(--bg-tag, rgba(0,0,0,0.06))',
            color: 'var(--text-secondary, #334155)',
            border: '1px solid var(--border-color, #cbd5e1)',
            fontWeight: 700
          }}>
            BWF Standard (21 pts, win-by-2, cap 30)
          </span>
          {bState?.isMatchPoint && (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 800 }}>
              🔥 MATCH POINT
            </span>
          )}
          {bState?.isGamePoint && (
            <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#b45309', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 800 }}>
              ⚡ GAME POINT
            </span>
          )}
        </div>

        {/* Head to Head Interactive Scoring Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
          {/* Side A */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '16px',
            background: isServingA ? 'var(--slot-available-bg, rgba(16,185,129,0.12))' : 'var(--bg-secondary, rgba(0,0,0,0.02))',
            border: isServingA ? '2px solid var(--accent-primary, #059669)' : '1px solid var(--border-color, #e2e8f0)',
            boxShadow: isServingA ? '0 0 20px rgba(16,185,129,0.22)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #0f172a)' }}>
              {match.teamA.name}
            </h2>
            {isServingA ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-primary, #047857)', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                🏸 SERVING ({serveState?.serverCourt || 'RIGHT'})
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.5rem' }}>
                RECEIVING
              </div>
            )}
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--accent-primary, #059669)', lineHeight: 1.1 }}>
              {currentGameObj.teamA}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', marginTop: '0.5rem', fontWeight: 700 }}>
              Games Won: {bState?.gamesWonA || 0}
            </div>

            {isMatchLive && (
              <button
                onClick={() => handleRecordPoint('A')}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.9rem', fontSize: '1.1rem', fontWeight: 800 }}
              >
                +1 Point {match.teamA.name}
              </button>
            )}
          </div>

          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>VS</div>

          {/* Side B */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '16px',
            background: isServingB ? 'var(--slot-available-bg, rgba(16,185,129,0.12))' : 'var(--bg-secondary, rgba(0,0,0,0.02))',
            border: isServingB ? '2px solid var(--accent-primary, #059669)' : '1px solid var(--border-color, #e2e8f0)',
            boxShadow: isServingB ? '0 0 20px rgba(16,185,129,0.22)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #0f172a)' }}>
              {match.teamB.name}
            </h2>
            {isServingB ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-primary, #047857)', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                🏸 SERVING ({serveState?.serverCourt || 'RIGHT'})
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.5rem' }}>
                RECEIVING
              </div>
            )}
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--accent-primary, #059669)', lineHeight: 1.1 }}>
              {currentGameObj.teamB}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', marginTop: '0.5rem', fontWeight: 700 }}>
              Games Won: {bState?.gamesWonB || 0}
            </div>

            {isMatchLive && (
              <button
                onClick={() => handleRecordPoint('B')}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.9rem', fontSize: '1.1rem', fontWeight: 800 }}
              >
                +1 Point {match.teamB.name}
              </button>
            )}
          </div>
        </div>

        {/* Start / Undo Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          {!isMatchLive && !isCompleted && (
            <button
              onClick={handleStartMatch}
              disabled={actionLoading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', fontWeight: 800 }}
            >
              <Play size={16} /> Start Match Live
            </button>
          )}

          {isMatchLive && (
            <button
              onClick={handleUndo}
              disabled={actionLoading}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}
            >
              <RotateCcw size={16} /> Undo Last Point
            </button>
          )}

          {isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary, #059669)', fontWeight: 800, fontSize: '1.1rem' }}>
              <Trophy size={20} /> {match.resultSummary || 'Match Completed'}
            </div>
          )}
        </div>

        {/* Live Animated Court Preview for Scorer Arena */}
        <div style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <BadmintonCourt
            match={{ ...match, sport_state: bState, scoreA: currentGameObj.teamA, scoreB: currentGameObj.teamB }}
            serveState={serveState}
            courtColor="#0d5c3a"
            status={match.status}
            isGamePoint={bState?.isGamePoint}
            isMatchPoint={bState?.isMatchPoint}
            lastEventType={lastEventType}
            eventSeq={bState?.eventSeq}
            compact={true}
            showFooter={true}
          />
        </div>
      </div>

      {/* Game Scores Breakdown Strip */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-heading, #0f172a)' }}>Game Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {(bState?.gameScores || []).map((g) => (
            <div
              key={g.game}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: g.winner ? 'var(--slot-available-bg, rgba(16,185,129,0.1))' : 'var(--bg-secondary, rgba(0,0,0,0.03))',
                border: g.winner ? '1px solid var(--slot-available-border, rgba(16,185,129,0.3))' : '1px solid var(--border-color, #e2e8f0)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.25rem' }}>
                GAME {g.game}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading, #0f172a)' }}>
                {g.teamA} - {g.teamB}
              </div>
              <div style={{ fontSize: '0.75rem', color: g.winner ? 'var(--accent-primary, #047857)' : 'var(--text-muted, #64748b)', fontWeight: 700, marginTop: '0.25rem' }}>
                {g.winner ? `Winner: Team ${g.winner}` : (currentGameNum === g.game ? 'In Progress' : 'Upcoming')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point History */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-heading, #0f172a)' }}>Recent Points</h3>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted, #64748b)', fontSize: '0.88rem' }}>
            No points scored yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {events.slice(0, 15).map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: '6px', background: 'var(--bg-secondary, rgba(0,0,0,0.03))', color: 'var(--text-primary, #0f172a)', fontSize: '0.85rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <span>{ev.commentary}</span>
                <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>{ev.period}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
