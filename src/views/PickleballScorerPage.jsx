'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../services/socket';
import {
  Trophy, ArrowLeft, Users, Zap, RotateCcw, Edit3, CheckCircle,
  AlertCircle, Play, Shield, Clock, Award, Sparkles, ChevronRight
} from 'lucide-react';

export default function PickleballScorerPage() {
  const { id } = useParams();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lineup selection state
  const [selectedLineupA, setSelectedLineupA] = useState([]);
  const [selectedLineupB, setSelectedLineupB] = useState([]);

  // Score correction modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionScoreA, setCorrectionScoreA] = useState(0);
  const [correctionScoreB, setCorrectionScoreB] = useState(0);
  const [correctionNotes, setCorrectionNotes] = useState('');

  // Fetch full scorer state
  const fetchState = useCallback(async () => {
    try {
      const res = await axios.get(`/api/matches/${id}/pickleball`);
      if (res.data.success) {
        const d = res.data.data;
        setState(d);
        if (d.lineup) {
          if (Array.isArray(d.lineup.teamA) && d.lineup.teamA.length > 0) {
            setSelectedLineupA(d.lineup.teamA);
          }
          if (Array.isArray(d.lineup.teamB) && d.lineup.teamB.length > 0) {
            setSelectedLineupB(d.lineup.teamB);
          }
        }
        setCorrectionScoreA(d.scores.teamA);
        setCorrectionScoreB(d.scores.teamB);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load match scorer details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time socket sync
  useEffect(() => {
    socket.emit('join:match', { matchId: id });

    const handleScore = (payload) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status,
          scores: {
            teamA: payload.teamAScore,
            teamB: payload.teamBScore
          },
          winner: payload.winnerTeamId
            ? (payload.winnerTeamId === prev.teamA.id ? 'team_a' : 'team_b')
            : null,
          resultSummary: payload.resultSummary || prev.resultSummary
        };
      });
      // Refresh full logs
      fetchState();
    };

    socket.on('match:pickleballScore', handleScore);

    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('match:pickleballScore', handleScore);
    };
  }, [id, fetchState]);

  // Set Lineup handler
  const handleSaveLineup = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`/api/matches/${id}/pickleball/lineup`, {
        teamALineup: selectedLineupA,
        teamBLineup: selectedLineupB
      });
      if (res.data.success) {
        setState(res.data.data);
        setSuccess('Active lineup confirmed successfully!');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to set lineup.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start match handler
  const handleStartMatch = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await axios.post(`/api/matches/${id}/pickleball/start`);
      if (res.data.success) {
        setState(res.data.data);
        setSuccess('Match is now LIVE! Ready for live scoring.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start match.');
    } finally {
      setActionLoading(false);
    }
  };

  // Record point (+1)
  const handleRecordPoint = async (pointTo) => {
    if (state.status !== 'LIVE') return;
    setActionLoading(true);
    setError('');
    try {
      const res = await axios.post(`/api/matches/${id}/pickleball/point`, { pointTo });
      if (res.data.success) {
        setState(res.data.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record point.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo point
  const handleUndo = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await axios.post(`/api/matches/${id}/pickleball/undo`);
      if (res.data.success) {
        setState(res.data.data);
        setSuccess('Last point undone successfully.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to undo action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit score correction
  const handleScoreCorrection = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await axios.post(`/api/matches/${id}/pickleball/correct`, {
        teamAScore: correctionScoreA,
        teamBScore: correctionScoreB,
        notes: correctionNotes || 'Manual Scorer Correction'
      });
      if (res.data.success) {
        setState(res.data.data);
        setShowCorrectionModal(false);
        setSuccess('Match score updated and audit logged!');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to correct score.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-muted)' }}>
        <Zap size={48} className="animate-spin" color="var(--accent-primary, #10b981)" style={{ margin: '0 auto 1rem auto' }} />
        <h2>Loading Pickleball Live Scorer Console…</h2>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
        <h2>Match Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Unable to retrieve match details.'}</p>
        <Link href="/tournaments" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const { tournament, rules, teamA, teamB, scores, status, winner, resultSummary, lineup, logs } = state;
  const isSingles = rules.matchFormat === 'SINGLES';
  const expectedLineupCount = isSingles ? 1 : 2;
  const isLineupReady = selectedLineupA.length === expectedLineupCount && selectedLineupB.length === expectedLineupCount;

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2vw, 2rem) clamp(0.75rem, 1.5vw, 1.25rem)', maxWidth: '1080px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Link
          href={`/tournaments/${tournament.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Back to {tournament.name}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-info">{state.groupName}</span>
          <span className={`badge ${status === 'LIVE' ? 'badge-success' : status === 'COMPLETED' ? 'badge-warning' : 'badge-neutral'}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Match Header / Header Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(6,78,59,0.25))', border: '1px solid rgba(16,185,129,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pickleball {rules.matchFormat} Match #{state.matchNumber}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.25rem, 2.8vw, 1.8rem)', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#fff' }}>
              {teamA.name} vs {teamB.name}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tournament: {tournament.name} &bull; Target: {rules.targetScore} points {rules.winByTwo ? '(Win by 2)' : ''} {rules.maxScore ? `&bull; Cap: ${rules.maxScore}` : ''}
            </p>
          </div>

          {/* Quick Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit3 size={15} /> Correct Score
            </button>
            {status === 'LIVE' && (
              <button
                onClick={handleUndo}
                disabled={actionLoading || logs.length === 0}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
              >
                <RotateCcw size={15} /> Undo Point
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Scoreboard Arena */}
      <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', borderRadius: '20px', marginBottom: '1.75rem', textAlign: 'center', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.12), rgba(15,23,42,0.95))', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 20px 45px -10px rgba(0,0,0,0.5)' }}>
        {status === 'COMPLETED' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '30px', color: '#34d399', fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem' }}>
            <Trophy size={20} />
            <span>MATCH CONCLUDED &bull; {resultSummary}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)' }}>
          {/* Team A Card */}
          <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '16px', background: winner === 'team_a' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: winner === 'team_a' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
              {teamA.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#fff' }}>
              {teamA.name}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {lineup.teamA && lineup.teamA.length > 0 ? lineup.teamA.join(' & ') : 'Lineup Not Set'}
            </div>
            <div style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', fontWeight: 900, color: winner === 'team_a' ? '#34d399' : '#fff', lineHeight: 1.1, margin: '0.5rem 0' }}>
              {scores.teamA}
            </div>

            {/* +1 Button Team A */}
            {status === 'LIVE' && (
              <button
                onClick={() => handleRecordPoint('team_a')}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(16,185,129,0.35)',
                  transition: 'all 0.2s'
                }}
              >
                <Zap size={20} /> +1 Point {teamA.name}
              </button>
            )}
          </div>

          {/* VS Divider */}
          <div style={{ padding: '0 0.5rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
              VS
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              FIRST TO {rules.targetScore}
            </div>
          </div>

          {/* Team B Card */}
          <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '16px', background: winner === 'team_b' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: winner === 'team_b' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
              {teamB.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#fff' }}>
              {teamB.name}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {lineup.teamB && lineup.teamB.length > 0 ? lineup.teamB.join(' & ') : 'Lineup Not Set'}
            </div>
            <div style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', fontWeight: 900, color: winner === 'team_b' ? '#34d399' : '#fff', lineHeight: 1.1, margin: '0.5rem 0' }}>
              {scores.teamB}
            </div>

            {/* +1 Button Team B */}
            {status === 'LIVE' && (
              <button
                onClick={() => handleRecordPoint('team_b')}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s'
                }}
              >
                <Zap size={20} /> +1 Point {teamB.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LINEUP SELECTION SECTION (When match has not started or can configure) */}
      {status === 'SCHEDULED' || status === 'READY' ? (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Users size={22} color="var(--accent-primary, #10b981)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              Select Active Lineup ({rules.matchFormat})
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Choose exactly {expectedLineupCount} player{expectedLineupCount > 1 ? 's' : ''} from each team squad before starting the match.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Team A Roster Checklist */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#10b981' }}>
                {teamA.name} Squad ({selectedLineupA.length}/{expectedLineupCount} Selected)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {teamA.squad.map((player) => {
                  const isChecked = selectedLineupA.includes(player.name);
                  return (
                    <label key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: '6px', background: isChecked ? 'rgba(16,185,129,0.15)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedLineupA(selectedLineupA.filter(p => p !== player.name));
                          } else {
                            if (selectedLineupA.length < expectedLineupCount) {
                              setSelectedLineupA([...selectedLineupA, player.name]);
                            }
                          }
                        }}
                      />
                      <span>{player.name} {player.role === 'CAPTAIN' ? '(C)' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Team B Roster Checklist */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#3b82f6' }}>
                {teamB.name} Squad ({selectedLineupB.length}/{expectedLineupCount} Selected)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {teamB.squad.map((player) => {
                  const isChecked = selectedLineupB.includes(player.name);
                  return (
                    <label key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: '6px', background: isChecked ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedLineupB(selectedLineupB.filter(p => p !== player.name));
                          } else {
                            if (selectedLineupB.length < expectedLineupCount) {
                              setSelectedLineupB([...selectedLineupB, player.name]);
                            }
                          }
                        }}
                      />
                      <span>{player.name} {player.role === 'CAPTAIN' ? '(C)' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveLineup}
              disabled={actionLoading || !isLineupReady}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Confirm Lineup
            </button>
            <button
              onClick={handleStartMatch}
              disabled={actionLoading || !isLineupReady}
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Play size={18} /> Start Match Live
            </button>
          </div>
        </div>
      ) : null}

      {/* Point Scoring History / Audit Log */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--accent-primary, #10b981)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              Scoring Event Log & Audit Trail
            </h3>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {logs.length} logged events
          </span>
        </div>

        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            No points recorded yet. Points scored will be tracked here in real-time.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                    #{log.sequence_number}
                  </span>
                  <span style={{ color: '#fff' }}>
                    {log.point_to === 'team_a' ? `Point to ${teamA.name}` : log.point_to === 'team_b' ? `Point to ${teamB.name}` : log.notes}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 800, color: '#fff' }}>
                    {log.team_a_score} - {log.team_b_score}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score Correction Modal */}
      {showCorrectionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-modal, #0f172a)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#fff' }}>
              Authorized Score Correction
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Adjust current score. Standings and match status will be automatically recalculated.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#10b981' }}>
                  {teamA.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={correctionScoreA}
                  onChange={(e) => setCorrectionScoreA(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#3b82f6' }}>
                  {teamB.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={correctionScoreB}
                  onChange={(e) => setCorrectionScoreB(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                Reason / Referee Note *
              </label>
              <input
                type="text"
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="e.g. Referee score adjustment"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleScoreCorrection}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
