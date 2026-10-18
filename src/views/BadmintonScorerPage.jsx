'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../services/socket';
import {
  Trophy, ArrowLeft, RotateCcw, AlertTriangle, CheckCircle,
  Zap, Award, Play, Shield, ChevronRight
} from 'lucide-react';

export default function BadmintonScorerPage() {
  const { id } = useParams();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Badminton Scorer Console…</div>;
  }

  if (!state) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 style={{ color: '#ef4444' }}>Match not found</h2>
        <Link to="/tournaments" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Tournaments</Link>
      </div>
    );
  }

  const { match, state: bState, events = [] } = state;
  const currentGameNum = bState?.currentGame || 1;
  const currentGameObj = bState?.gameScores?.[currentGameNum - 1] || { teamA: 0, teamB: 0 };
  const isMatchLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to={`/tournaments/${match.tournament.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Tournament
        </Link>
        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Zap size={13} /> {match.tournament.name} &bull; Match #{match.matchNumber}
        </span>
      </div>

      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 600 }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Scoring Arena Card */}
      <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 800 }}>
            Game {currentGameNum} of 3
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
            BWF Standard (21 pts, win-by-2, cap 30)
          </span>
          {bState?.isMatchPoint && (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 800 }}>
              🔥 MATCH POINT
            </span>
          )}
          {bState?.isGamePoint && (
            <span className="badge" style={{ background: 'rgba(234,179,8,0.25)', color: '#eab308', fontWeight: 800 }}>
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
            background: bState?.currentServer === 'A' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
            border: bState?.currentServer === 'A' ? '2px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff' }}>
              {match.teamA.name}
            </h2>
            {bState?.currentServer === 'A' && (
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                🏸 SERVING ({bState.serverCourt || 'RIGHT'})
              </div>
            )}
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)', lineHeight: 1.1 }}>
              {currentGameObj.teamA}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
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

          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>

          {/* Side B */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '16px',
            background: bState?.currentServer === 'B' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
            border: bState?.currentServer === 'B' ? '2px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff' }}>
              {match.teamB.name}
            </h2>
            {bState?.currentServer === 'B' && (
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                🏸 SERVING ({bState.serverCourt || 'RIGHT'})
              </div>
            )}
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)', lineHeight: 1.1 }}>
              {currentGameObj.teamB}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
            >
              <RotateCcw size={16} /> Undo Last Point
            </button>
          )}

          {isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 800, fontSize: '1.1rem' }}>
              <Trophy size={20} /> {match.resultSummary || 'Match Completed'}
            </div>
          )}
        </div>
      </div>

      {/* Game Scores Breakdown Strip */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Game Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {(bState?.gameScores || []).map((g) => (
            <div
              key={g.game}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: g.winner ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                border: g.winner ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>
                GAME {g.game}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                {g.teamA} - {g.teamB}
              </div>
              <div style={{ fontSize: '0.75rem', color: g.winner ? '#34d399' : 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>
                {g.winner ? `Winner: Team ${g.winner}` : (currentGameNum === g.game ? 'In Progress' : 'Upcoming')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point History */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Recent Points</h3>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No points scored yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {events.slice(0, 15).map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                <span>{ev.commentary}</span>
                <span style={{ color: 'var(--text-muted)' }}>{ev.period}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
