'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../services/socket';
import {
  Trophy, ArrowLeft, Clock, Play, Pause, RotateCcw, AlertTriangle,
  CheckCircle, Plus, Users, Shield, Zap, Sparkles, Send
} from 'lucide-react';

export default function FootballScorerPage({ matchId: propsMatchId } = {}) {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Clock
  const [minute, setMinute] = useState(1);

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTeam, setGoalTeam] = useState('A');
  const [goalScorerName, setGoalScorerName] = useState('');
  const [goalAssistName, setGoalAssistName] = useState('');
  const [isPenalty, setIsPenalty] = useState(false);
  const [isOwnGoal, setIsOwnGoal] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardTeam, setCardTeam] = useState('A');
  const [cardPlayerName, setCardPlayerName] = useState('');
  const [cardType, setCardType] = useState('YELLOW');

  const [showSubModal, setShowSubModal] = useState(false);
  const [subTeam, setSubTeam] = useState('A');
  const [subPlayerOff, setSubPlayerOff] = useState('');
  const [subPlayerOn, setSubPlayerOn] = useState('');

  // Fetch match and scorer state
  const fetchState = useCallback(async () => {
    try {
      const res = await axios.get(`/api/matches/${id}/football`);
      if (res.data.success) {
        setState(res.data.data);
        if (res.data.data?.state?.minute) {
          setMinute(res.data.data.state.minute);
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load football match state.');
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

    socket.on('match:footballEvent', handleUpdate);
    return () => {
      socket.off('match:footballEvent', handleUpdate);
      socket.emit('leave:match', { matchId: id });
    };
  }, [id, fetchState]);

  // Period / Clock change
  const handleUpdatePeriod = async (period) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/period`, {
        period,
        minute: parseInt(minute, 10) || 1
      });
      if (res.data.success) {
        setNotification(`Match period set to ${period.replace('_', ' ')}`);
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update period.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Goal
  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    if (!state) return;
    const teamId = goalTeam === 'A' ? state.match.teamA.internalId : state.match.teamB.internalId;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/goal`, {
        teamId,
        scorerName: goalScorerName || 'Player',
        assistName: goalAssistName || null,
        minute: parseInt(minute, 10) || 1,
        isPenalty,
        isOwnGoal
      });
      if (res.data.success) {
        setNotification(`⚽ Goal Recorded! ${res.data.scoreSummary}`);
        setShowGoalModal(false);
        setGoalScorerName('');
        setGoalAssistName('');
        setIsPenalty(false);
        setIsOwnGoal(false);
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to record goal.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Card
  const handleSubmitCard = async (e) => {
    e.preventDefault();
    if (!state) return;
    const teamId = cardTeam === 'A' ? state.match.teamA.internalId : state.match.teamB.internalId;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/card`, {
        teamId,
        playerName: cardPlayerName || 'Player',
        cardType,
        minute: parseInt(minute, 10) || 1
      });
      if (res.data.success) {
        setNotification(`Card recorded for ${cardPlayerName}`);
        setShowCardModal(false);
        setCardPlayerName('');
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to record card.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Substitution
  const handleSubmitSub = async (e) => {
    e.preventDefault();
    if (!state) return;
    const teamId = subTeam === 'A' ? state.match.teamA.internalId : state.match.teamB.internalId;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/sub`, {
        teamId,
        playerOffName: subPlayerOff || 'Player Off',
        playerOnName: subPlayerOn || 'Player On',
        minute: parseInt(minute, 10) || 1
      });
      if (res.data.success) {
        setNotification(`Substitution recorded.`);
        setShowSubModal(false);
        setSubPlayerOff('');
        setSubPlayerOn('');
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to record substitution.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Event
  const handleUndo = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/undo`);
      if (res.data.success) {
        setNotification('Last event undone.');
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to undo last event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Match
  const handleCompleteMatch = async () => {
    if (!window.confirm('Are you sure you want to finalize and complete this football match? Standings will be recalculated automatically.')) return;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/matches/${id}/football/complete`, {});
      if (res.data.success) {
        setNotification(`Match completed: ${res.data.resultSummary}`);
        fetchState();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to complete match.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Football Scorer Console…</div>;
  }

  if (!state) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 style={{ color: '#ef4444' }}>Match not found</h2>
        <Link to="/tournaments" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Tournaments</Link>
      </div>
    );
  }

  const { match, state: fState, events = [] } = state;
  const teamAScore = fState?.teamAScore || 0;
  const teamBScore = fState?.teamBScore || 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to={`/tournaments/${match.tournament.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Tournament
        </Link>
        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Trophy size={13} /> {match.tournament.name} &bull; Match #{match.matchNumber}
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

      {/* Main Scoreboard Glass Panel */}
      <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          <Clock size={14} />
          <span>{fState?.period ? fState.period.replace('_', ' ') : 'NOT STARTED'} ({minute}')</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Team A */}
          <div style={{ flex: '1 1 200px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              {match.teamA.name}
            </h2>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)' }}>
              {teamAScore}
            </div>
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>

          {/* Team B */}
          <div style={{ flex: '1 1 200px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              {match.teamB.name}
            </h2>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)' }}>
              {teamBScore}
            </div>
          </div>
        </div>
      </div>

      {/* Scorer Action Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Goal Button */}
        <button
          onClick={() => setShowGoalModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.05rem', fontWeight: 800 }}
        >
          ⚽ Record Goal
        </button>

        {/* Card Button */}
        <button
          onClick={() => setShowCardModal(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: '#eab308', color: '#000', border: 'none', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer' }}
        >
          🟨 / 🟥 Card
        </button>

        {/* Substitution Button */}
        <button
          onClick={() => setShowSubModal(true)}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.05rem', fontWeight: 800 }}
        >
          🔄 Substitution
        </button>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={actionLoading || events.length === 0}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
        >
          <RotateCcw size={16} /> Undo Last
        </button>
      </div>

      {/* Match Clock & Period Controller */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-heading)' }}>Match Period & Clock Control</h3>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Minute:</span>
            <input
              type="number"
              min="1"
              max="130"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              style={{ width: '65px', padding: '0.4rem', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', textAlign: 'center', fontWeight: 700 }}
            />
          </div>

          <button onClick={() => handleUpdatePeriod('1ST_HALF')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>1st Half</button>
          <button onClick={() => handleUpdatePeriod('HALF_TIME')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Half Time</button>
          <button onClick={() => handleUpdatePeriod('2ND_HALF')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>2nd Half</button>
          <button onClick={() => handleUpdatePeriod('EXTRA_TIME_1')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Extra Time</button>
          <button onClick={() => handleUpdatePeriod('PENALTIES')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Penalties</button>
          <button onClick={handleCompleteMatch} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', marginLeft: 'auto' }}>Finalize Match</button>
        </div>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-modal, var(--bg-card))', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading)' }}>⚽ Record Goal</h3>
            <form onSubmit={handleSubmitGoal}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Scoring Team</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setGoalTeam('A')}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: goalTeam === 'A' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: goalTeam === 'A' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalTeam('B')}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: goalTeam === 'B' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: goalTeam === 'B' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamB.name}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Goalscorer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe (or squad player)"
                  value={goalScorerName}
                  onChange={(e) => setGoalScorerName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Assist Provider (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Playmaker Name"
                  value={goalAssistName}
                  onChange={(e) => setGoalAssistName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isPenalty} onChange={(e) => setIsPenalty(e.target.checked)} />
                  Penalty Goal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isOwnGoal} onChange={(e) => setIsOwnGoal(e.target.checked)} />
                  Own Goal
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowGoalModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">Confirm Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {showCardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-modal, var(--bg-card))', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading)' }}>Card Discipline</h3>
            <form onSubmit={handleSubmitCard}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Team</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCardTeam('A')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: cardTeam === 'A' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: cardTeam === 'A' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardTeam('B')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: cardTeam === 'B' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: cardTeam === 'B' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamB.name}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Card Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCardType('YELLOW')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer', background: cardType === 'YELLOW' ? '#eab308' : 'var(--bg-elevated)', color: cardType === 'YELLOW' ? '#000' : 'var(--text-main)' }}
                  >
                    🟨 Yellow
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType('RED')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer', background: cardType === 'RED' ? '#ef4444' : 'var(--bg-elevated)', color: cardType === 'RED' ? '#fff' : 'var(--text-main)' }}
                  >
                    🟥 Red
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Player Name</label>
                <input
                  type="text"
                  placeholder="Player name"
                  value={cardPlayerName}
                  onChange={(e) => setCardPlayerName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCardModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">Confirm Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Substitution Modal */}
      {showSubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-modal, var(--bg-card))', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading)' }}>🔄 Substitution</h3>
            <form onSubmit={handleSubmitSub}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Team</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSubTeam('A')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: subTeam === 'A' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: subTeam === 'A' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTeam('B')}
                    style={{ padding: '0.65rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: subTeam === 'B' ? 'var(--accent-primary, #10b981)' : 'var(--bg-elevated)', color: subTeam === 'B' ? '#000' : 'var(--text-main)' }}
                  >
                    {match.teamB.name}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Player OFF 🔽</label>
                <input
                  type="text"
                  placeholder="Leaving player name"
                  value={subPlayerOff}
                  onChange={(e) => setSubPlayerOff(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Player ON 🔼</label>
                <input
                  type="text"
                  placeholder="Entering player name"
                  value={subPlayerOn}
                  onChange={(e) => setSubPlayerOn(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSubModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">Confirm Sub</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Events Timeline */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)' }}>
          Match Event Timeline ({events.length} Events)
        </h3>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No match events recorded yet. Click "Record Goal" or "Card" to add timeline events.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'var(--bg-elevated)',
                  borderLeft: ev.event_type === 'GOAL' ? '4px solid #10b981' : (ev.event_type === 'RED_CARD' ? '4px solid #ef4444' : '4px solid #eab308')
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--accent-primary, #10b981)', minWidth: '40px' }}>
                  {ev.minute}'
                </span>
                <span style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  {ev.commentary}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
