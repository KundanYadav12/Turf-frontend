'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from '../lib/routerCompat';
import axios from 'axios';
import { socket } from '../services/socket';
import {
  Trophy, ArrowLeft, Users, Zap, RotateCcw, Edit3, CheckCircle,
  AlertCircle, Play, Shield, Clock, Award, Sparkles, ChevronRight
} from 'lucide-react';
import CourtView, { getServeState } from '../components/court/CourtView';

export default function PickleballScorerPage({ matchId: propsMatchId } = {}) {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastEventType, setLastEventType] = useState(null);
  const [pointEvent, setPointEvent] = useState(null);

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

    const handleCourtColor = (data) => {
      if (data?.courtColor) {
        setState((prev) => prev ? {
          ...prev,
          tournament: { ...prev.tournament, courtColor: data.courtColor }
        } : prev);
      }
    };

    socket.on('match:pickleballScore', handleScore);
    socket.on('tournament:courtColorUpdated', handleCourtColor);
    socket.on('court:colorUpdated', handleCourtColor);

    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('match:pickleballScore', handleScore);
      socket.off('tournament:courtColorUpdated', handleCourtColor);
      socket.off('court:colorUpdated', handleCourtColor);
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
      // Compute current serve state prior to score increment
      const currentServeState = getServeState({
        ...state,
        scores: state.scores,
        sportSlug: 'pickleball',
        matchFormat: state.rules?.matchFormat || 'DOUBLES',
        teamA: state.teamA,
        teamB: state.teamB
      });

      const nextSeq = (state.logs?.length || 0) + 1;
      const eventId = `pt-${id}-${nextSeq}-${Date.now()}`;
      const ptEvent = {
        type: 'POINT_SCORED',
        matchId: id,
        tournamentId: state.tournament?.id || state.tournament?.uuid,
        eventId,
        seq: nextSeq,
        from: {
          side: currentServeState.serverSide,
          box: currentServeState.serviceBox,
          boxName: currentServeState.servingBoxName
        },
        to: {
          side: currentServeState.receiverSide,
          box: currentServeState.targetBox.box,
          boxName: currentServeState.targetBoxName
        },
        timestamp: Date.now()
      };

      setPointEvent(ptEvent);
      setLastEventType('POINT_SCORED');

      // Immediate socket broadcast for TV and Signage 0ms sync
      socket.emit('match:pointScored', ptEvent);

      const res = await axios.post(`/api/matches/${id}/pickleball/point`, {
        pointTo,
        from: ptEvent.from,
        to: ptEvent.to,
        eventId,
        seq: nextSeq
      });
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
      setLastEventType('UNDO');
      const undoEvent = {
        type: 'UNDO',
        matchId: id,
        tournamentId: state?.tournament?.id || state?.tournament?.uuid,
        timestamp: Date.now()
      };
      setPointEvent(undoEvent);
      socket.emit('match:undoPoint', undoEvent);

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

  // Update tournament court color live across all displays
  const handleCourtColorChange = async (newColor) => {
    try {
      const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
      await axios.put(`/api/tournaments/${tournament.id}/court-color`, { courtColor: newColor }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSuccess('Court color updated live across all displays!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.warn('Failed to update court color:', err);
    }
  };

  const courtTeamA = useMemo(() => ({
    id: state?.teamA?.id,
    name: state?.teamA?.name || 'Team A',
    score: state?.scores?.teamA || 0
  }), [state?.teamA?.id, state?.teamA?.name, state?.scores?.teamA]);

  const courtTeamB = useMemo(() => ({
    id: state?.teamB?.id,
    name: state?.teamB?.name || 'Team B',
    score: state?.scores?.teamB || 0
  }), [state?.teamB?.id, state?.teamB?.name, state?.scores?.teamB]);

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
    <div className="container scorer-page-wrapper" style={{ padding: 'clamp(1rem, 2vw, 2rem) 16px', maxWidth: '1080px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', width: '100%' }}>
        <Link
          href={`/tournaments/${tournament.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            textDecoration: 'none',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          <ArrowLeft size={16} style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Back to {tournament.name}
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span className="badge badge-info" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{state.groupName}</span>
          <span
            className={`badge ${status === 'LIVE' ? 'badge-success' : status === 'COMPLETED' ? 'badge-warning' : 'badge-neutral'}`}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Match Header / Header Card */}
      <div className="scorer-header-card" style={{ padding: '1.25rem 1rem', borderRadius: '16px', marginBottom: '1.5rem', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pickleball {rules.matchFormat} Match #{state.matchNumber}
              </span>
            </div>
            <h1 className="scorer-text-heading" style={{ fontSize: 'clamp(1.2rem, 2.8vw, 1.8rem)', fontWeight: 800, margin: '0 0 0.5rem 0', wordBreak: 'break-word' }}>
              {teamA.name} vs {teamB.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              <span className="scorer-meta-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                <span className="scorer-meta-chip-label" style={{ fontWeight: 700 }}>Tournament:</span> {tournament.name}
              </span>
              <span className="scorer-meta-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                <span className="scorer-meta-chip-label" style={{ fontWeight: 700 }}>Target:</span> {rules.targetScore} pts {rules.winByTwo ? '(Win by 2)' : ''}
              </span>
              {rules.maxScore && (
                <span className="scorer-meta-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                  <span className="scorer-meta-chip-label" style={{ fontWeight: 700 }}>Cap:</span> {rules.maxScore}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="scorer-quick-actions" style={{ display: 'grid', gridTemplateColumns: status === 'LIVE' ? '1fr 1fr' : '1fr', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
            <button
              type="button"
              onClick={() => setShowCorrectionModal(true)}
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minHeight: '40px',
                height: '40px',
                fontSize: '0.84rem',
                fontWeight: 700,
                padding: '0.45rem 0.65rem',
                borderRadius: '10px',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                width: '100%'
              }}
            >
              <Edit3 size={15} style={{ flexShrink: 0 }} /> Correct Score
            </button>
            {status === 'LIVE' && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={actionLoading || logs.length === 0}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  minHeight: '40px',
                  height: '40px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  padding: '0.45rem 0.65rem',
                  borderRadius: '10px',
                  color: '#d97706',
                  borderColor: 'rgba(217,119,6,0.4)',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}
              >
                <RotateCcw size={15} style={{ flexShrink: 0 }} /> Undo Point
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Scoreboard Arena */}
      <div className="scorer-arena-card" style={{ padding: 'clamp(1rem, 2.5vw, 2.25rem)', borderRadius: '20px', marginBottom: '1.75rem', textAlign: 'center', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
        {status === 'COMPLETED' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '30px', color: '#059669', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Trophy size={20} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>MATCH CONCLUDED • {resultSummary}</span>
          </div>
        )}

        <div className="scorer-arena-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'clamp(0.4rem, 1.5vw, 1.5rem)', width: '100%', boxSizing: 'border-box' }}>
          {/* Team A Card */}
          <div
            className={`scorer-team-card-a ${winner === 'team_a' ? 'scorer-team-winner' : ''}`}
            style={{
              textAlign: 'center',
              padding: 'clamp(0.65rem, 1.8vw, 1.25rem)',
              borderRadius: '16px',
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{
              width: 'clamp(44px, 10vw, 64px)',
              height: 'clamp(44px, 10vw, 64px)',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem auto',
              boxShadow: '0 4px 15px rgba(16,185,129,0.35)',
              flexShrink: 0
            }}>
              {teamA.name.slice(0, 2).toUpperCase()}
            </div>
            <h3
              className="scorer-text-heading"
              style={{
                fontSize: 'clamp(0.95rem, 2vw, 1.35rem)',
                fontWeight: 800,
                margin: '0 0 0.25rem 0',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={teamA.name}
            >
              {teamA.name}
            </h3>
            <div
              className="scorer-text-muted"
              style={{
                fontSize: '0.78rem',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '0.25rem'
              }}
              title={lineup.teamA && lineup.teamA.length > 0 ? lineup.teamA.join(' & ') : 'Lineup Not Set'}
            >
              {lineup.teamA && lineup.teamA.length > 0 ? lineup.teamA.join(' & ') : 'Lineup Not Set'}
            </div>
            <div
              className={winner === 'team_a' ? 'scorer-score-num-win-a' : 'scorer-score-num'}
              style={{
                fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
                fontWeight: 900,
                lineHeight: 1,
                margin: '0.25rem 0 0.5rem 0'
              }}
            >
              {scores.teamA}
            </div>

            {/* +1 Button Team A */}
            {status === 'LIVE' && (
              <button
                type="button"
                onClick={() => handleRecordPoint('team_a')}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.1rem',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.1 }}>
                  <Zap size={15} /> +1
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.95, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Point
                </span>
              </button>
            )}
          </div>

          {/* VS Divider */}
          <div style={{ padding: '0 0.25rem', flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 900, color: 'var(--accent-primary, #10b981)', letterSpacing: '0.12em' }}>
              VS
            </div>
            <div className="scorer-text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '0.25rem', whiteSpace: 'nowrap' }}>
              FIRST TO {rules.targetScore}
            </div>
          </div>

          {/* Team B Card */}
          <div
            className={`scorer-team-card-b ${winner === 'team_b' ? 'scorer-team-winner' : ''}`}
            style={{
              textAlign: 'center',
              padding: 'clamp(0.65rem, 1.8vw, 1.25rem)',
              borderRadius: '16px',
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{
              width: 'clamp(44px, 10vw, 64px)',
              height: 'clamp(44px, 10vw, 64px)',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem auto',
              boxShadow: '0 4px 15px rgba(59,130,246,0.35)',
              flexShrink: 0
            }}>
              {teamB.name.slice(0, 2).toUpperCase()}
            </div>
            <h3
              className="scorer-text-heading"
              style={{
                fontSize: 'clamp(0.95rem, 2vw, 1.35rem)',
                fontWeight: 800,
                margin: '0 0 0.25rem 0',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={teamB.name}
            >
              {teamB.name}
            </h3>
            <div
              className="scorer-text-muted"
              style={{
                fontSize: '0.78rem',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '0.25rem'
              }}
              title={lineup.teamB && lineup.teamB.length > 0 ? lineup.teamB.join(' & ') : 'Lineup Not Set'}
            >
              {lineup.teamB && lineup.teamB.length > 0 ? lineup.teamB.join(' & ') : 'Lineup Not Set'}
            </div>
            <div
              className={winner === 'team_b' ? 'scorer-score-num-win-b' : 'scorer-score-num'}
              style={{
                fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
                fontWeight: 900,
                lineHeight: 1,
                margin: '0.25rem 0 0.5rem 0'
              }}
            >
              {scores.teamB}
            </div>

            {/* +1 Button Team B */}
            {status === 'LIVE' && (
              <button
                type="button"
                onClick={() => handleRecordPoint('team_b')}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '0.45rem 0.5rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.1rem',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.1 }}>
                  <Zap size={15} /> +1
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.95, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Point
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Animated Recolorable Court Visualization */}
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CourtView
            sport="pickleball"
            format={rules?.matchFormat || 'DOUBLES'}
            teamA={courtTeamA}
            teamB={courtTeamB}
            lineup={lineup}
            scores={scores}
            scoreSummary={`${scores.teamA} - ${scores.teamB}`}
            servingSide={scores.teamA % 2 === 0 ? 'team_a' : 'team_b'}
            serverCourt={scores.teamA % 2 === 0 ? 'RIGHT' : 'LEFT'}
            courtColor={tournament?.courtColor || '#0d5c3a'}
            canEditColor={true}
            onColorChange={handleCourtColorChange}
            status={status}
            winner={winner}
            lastEventType={lastEventType}
            eventSeq={logs?.length || 1}
            pointEvent={pointEvent}
            ambientRally={false}
            match={{
              id,
              uuid: id,
              sportSlug: 'pickleball',
              matchFormat: rules?.matchFormat || 'DOUBLES',
              teamA: courtTeamA,
              teamB: courtTeamB,
              scores,
              status,
              winner,
              tournament,
              courtColor: tournament?.courtColor || '#0d5c3a',
              lineup,
              _pointEvent: pointEvent,
              _lastEventType: lastEventType,
              _eventSeq: logs?.length || 1
            }}
          />
        </div>
      </div>

      {/* LINEUP SELECTION SECTION (When match has not started or can configure) */}
      {status === 'SCHEDULED' || status === 'READY' ? (
        <div className="scorer-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Users size={22} color="var(--accent-primary, #10b981)" />
            <h3 className="scorer-text-heading" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Select Active Lineup ({rules.matchFormat})
            </h3>
          </div>
          <p className="scorer-text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Choose exactly {expectedLineupCount} player{expectedLineupCount > 1 ? 's' : ''} from each team squad before starting the match.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Team A Roster Checklist */}
            <div className="scorer-subcard" style={{ padding: '1rem', borderRadius: '12px' }}>
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
            <div className="scorer-subcard" style={{ padding: '1rem', borderRadius: '12px' }}>
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
      <div className="scorer-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--accent-primary, #10b981)" />
            <h3 className="scorer-text-heading" style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Scoring Event Log & Audit Trail
            </h3>
          </div>
          <span className="scorer-text-muted" style={{ fontSize: '0.82rem' }}>
            {logs.length} logged events
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="scorer-text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>
            No points recorded yet. Points scored will be tracked here in real-time.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {logs.map((log) => (
              <div key={log.id} className="scorer-subcard" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                    #{log.sequence_number}
                  </span>
                  <span className="scorer-text-heading" style={{ fontWeight: 600 }}>
                    {log.point_to === 'team_a' ? `Point to ${teamA.name}` : log.point_to === 'team_b' ? `Point to ${teamB.name}` : log.notes}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="scorer-text-heading" style={{ fontWeight: 800 }}>
                    {log.team_a_score} - {log.team_b_score}
                  </span>
                  <span className="scorer-text-muted" style={{ fontSize: '0.78rem' }} suppressHydrationWarning>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="scorer-panel" style={{ borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <h3 className="scorer-text-heading" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
              Authorized Score Correction
            </h3>
            <p className="scorer-text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
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
                  className="scorer-subcard"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
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
                  className="scorer-subcard"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="scorer-text-muted" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Reason / Referee Note *
              </label>
              <input
                type="text"
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="e.g. Referee score adjustment"
                className="scorer-subcard"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontSize: '0.9rem' }}
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
