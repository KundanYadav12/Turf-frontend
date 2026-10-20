'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import api from '../services/api';
import { setCredentials } from '../features/auth/authSlice';
import { socket } from '../services/socket';
import BoundaryCelebration from '../components/scorer/BoundaryCelebration';
import {
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  Trophy,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Clock,
  Radio,
  ExternalLink,
  Zap,
  Flame,
  Volume2,
  LogIn
} from 'lucide-react';

const CricketScorerPage = ({ matchId: propsMatchId } = {}) => {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Core State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);
  const [scorerState, setScorerState] = useState(null);
  const [celebration, setCelebration] = useState(null); // { type: 'FOUR' | 'SIX', id: number }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Tabs for bottom panel: 'keypad' | 'commentary' | 'scorecard' | 'fow'
  const [activeTab, setActiveTab] = useState('keypad');

  // Modal States
  const [showTossModal, setShowTossModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(null); // 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE'

  // Toss Form State
  const [tossWinnerTeamId, setTossWinnerTeamId] = useState('');
  const [tossDecision, setTossDecision] = useState('BAT');
  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');

  // Wicket Form State
  const [dismissedBatterId, setDismissedBatterId] = useState('');
  const [dismissalType, setDismissalType] = useState('Bowled');
  const [caughtById, setCaughtById] = useState('');
  const [runOutById, setRunOutById] = useState('');
  const [newBatterId, setNewBatterId] = useState('');

  // Bowler Switch State
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState('');

  // Ads state
  const [ads, setAds] = useState({ topAd: null, bottomAd: null });

  // Last Action State for Universal Undo
  const [lastAction, setLastAction] = useState(null);

  // 1. Fetch full authoritative scorer state from backend
  const fetchScorerState = useCallback(async () => {
    try {
      const [res, lastActionRes] = await Promise.all([
        api.get(`/matches/${id}/scorer`),
        api.get(`/matches/${id}/last-action`).catch(() => ({ data: null }))
      ]);

      if (res.data.success) {
        setScorerState(res.data.data);
        setError(null);
        setIsUnauthorized(false);

        if (lastActionRes?.data?.success) {
          setLastAction(lastActionRes.data.data);
        }

        // Auto-open toss modal if match is not yet live and has no innings
        if (
          (res.data.data.match.status === 'SCHEDULED' || res.data.data.match.status === 'READY') &&
          !res.data.data.currentInnings
        ) {
          setShowTossModal(true);
        }

        // Auto-open bowler switch modal if current over has completed (6 legal balls)
        if (res.data.data.overCompleted && res.data.data.match?.status !== 'COMPLETED') {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to load scorer state:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsUnauthorized(true);
      }
      setError(err.response?.data?.message || 'Authentication or scorer authorization required to operate scorer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Quick Demo Login for instant authorization in testing
  const handleQuickLogin = async (email, password) => {
    setQuickLoggingIn(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data?.success) {
        const token = res.data.data?.token;
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        dispatch(setCredentials(res.data.data));
        setError(null);
        setIsUnauthorized(false);
        setLoading(true);
        await fetchScorerState();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed.');
    } finally {
      setQuickLoggingIn(false);
    }
  };

  // Fetch Stadium Ads
  const fetchAds = useCallback(async () => {
    try {
      const res = await api.get(`/matches/${id}/ads`);
      if (res.data.success) {
        setAds(res.data.data);
      }
    } catch (e) {
      // Non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchScorerState();
    fetchAds();
  }, [fetchScorerState, fetchAds]);

  // 2. Setup Socket.IO subscription
  useEffect(() => {
    socket.emit('join:match', { matchId: id });

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleBallEvent = (eventData) => {
      // Trigger full-screen boundary celebration if 4 or 6
      if (eventData.celebration) {
        const cel = String(eventData.celebration).toUpperCase();
        if (cel === 'FOUR' || cel === 'SIX') {
          setCelebration({ type: cel, id: eventData.ballId || Date.now() });
        }
      }
      if (eventData.overCompleted) {
        setShowBowlerModal(true);
      }
      // Re-fetch authoritative state to ensure 100% data fidelity
      fetchScorerState();
    };

    const handleMatchUpdated = () => {
      fetchScorerState();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('score:updated', handleBallEvent);
    socket.on('match:statusChanged', handleMatchUpdated);
    socket.on('match:completed', handleMatchUpdated);
    socket.on('match:bowlerSwitched', handleMatchUpdated);
    socket.on('match:undone', handleMatchUpdated);

    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('score:updated', handleBallEvent);
      socket.off('match:statusChanged', handleMatchUpdated);
      socket.off('match:completed', handleMatchUpdated);
      socket.off('match:bowlerSwitched', handleMatchUpdated);
      socket.off('match:undone', handleMatchUpdated);
    };
  }, [id, fetchScorerState]);

  // Sync default options when toss modal opens
  useEffect(() => {
    if (scorerState?.teamA && !tossWinnerTeamId) {
      setTossWinnerTeamId(scorerState.teamA.id);
    }
  }, [scorerState, tossWinnerTeamId]);

  // Helper to determine batting & bowling rosters based on toss and active innings
  const getTossBattingRoster = () => {
    if (!scorerState) return [];
    const battingTeamId = scorerState.currentInnings?.batting_team_id || scorerState.live?.battingTeamId;
    if (battingTeamId) {
      if (scorerState.teamA?.internalId === battingTeamId || scorerState.teamA?.id === battingTeamId) {
        return scorerState.teamA?.players || [];
      }
      return scorerState.teamB?.players || [];
    }
    const isTeamAWinner = tossWinnerTeamId === scorerState.teamA?.id;
    const teamABats = (isTeamAWinner && tossDecision === 'BAT') || (!isTeamAWinner && tossDecision === 'BOWL');
    return teamABats ? scorerState.teamA?.players || [] : scorerState.teamB?.players || [];
  };

  const getTossBowlingRoster = () => {
    if (!scorerState) return [];
    const bowlingTeamId = scorerState.currentInnings?.bowling_team_id || scorerState.live?.bowlingTeamId;
    if (bowlingTeamId) {
      if (scorerState.teamA?.internalId === bowlingTeamId || scorerState.teamA?.id === bowlingTeamId) {
        return scorerState.teamA?.players || [];
      }
      return scorerState.teamB?.players || [];
    }
    const isTeamAWinner = tossWinnerTeamId === scorerState.teamA?.id;
    const teamABats = (isTeamAWinner && tossDecision === 'BAT') || (!isTeamAWinner && tossDecision === 'BOWL');
    return teamABats ? scorerState.teamB?.players || [] : scorerState.teamA?.players || [];
  };

  // 3. API ACTION: Setup Toss
  const handleTossSubmit = async (e) => {
    e.preventDefault();
    if (!tossWinnerTeamId || !openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      alert('Please fill out all toss and opening lineup selections.');
      return;
    }
    if (openingStrikerId === openingNonStrikerId) {
      alert('Opening striker and non-striker must be different players.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/matches/${id}/toss`, {
        tossWinnerTeamId,
        tossDecision,
        openingStrikerId,
        openingNonStrikerId,
        openingBowlerId
      });
      setShowTossModal(false);
      await fetchScorerState();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to setup toss.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. API ACTION: Record Normal Delivery
  const handleRecordBall = async (runs, extraType = null, extraRuns = 0) => {
    if (isSubmitting) return;

    // Check if match is in valid state
    if (scorerState?.match?.status === 'COMPLETED') {
      alert('This match is already completed.');
      return;
    }

    if (scorerState?.overCompleted) {
      setShowBowlerModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let payload = {
        runs: runs,
        batRuns: runs,
        extraType: extraType || 'NONE',
        extraRuns: extraRuns,
        isWicket: false
      };

      if (extraType === 'WIDE') {
        payload.runs = 0;
        payload.batRuns = 0;
        payload.extraRuns = 1 + extraRuns; // 1 for wide + optional additional
      } else if (extraType === 'NO_BALL') {
        payload.runs = runs;
        payload.batRuns = runs;
        payload.extraRuns = 1; // 1 for penalty + bat runs
      } else if (extraType === 'BYE' || extraType === 'LEG_BYE') {
        payload.runs = 0;
        payload.batRuns = 0;
        payload.extraRuns = extraRuns;
      }

      const res = await api.post(`/matches/${id}/deliveries`, payload);
      const cel = res.data?.celebration ? String(res.data.celebration).toUpperCase() : (runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : null);
      if (cel === 'FOUR' || cel === 'SIX') {
        setCelebration({ type: cel, id: res.data?.ballId || Date.now() });
      }
      setShowExtraModal(null);
      await fetchScorerState();

      if (res.data.overCompleted) {
        setShowBowlerModal(true);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to record delivery.';
      alert(errMsg);
      if (errMsg.toLowerCase().includes('switch bowler') || errMsg.toLowerCase().includes('over has completed')) {
        setShowBowlerModal(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. API ACTION: Record Wicket
  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    if (scorerState?.overCompleted) {
      alert('This over has completed (6 legal balls). Please switch bowler before recording next delivery.');
      setShowWicketModal(false);
      setShowBowlerModal(true);
      return;
    }
    const hasMoreBatters = eligibleBatters && eligibleBatters.length > 0;
    if (!dismissalType || (hasMoreBatters && !newBatterId)) {
      alert('Please select dismissal type and next batter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        batRuns: 0,
        extraType: 'NONE',
        extraRuns: 0,
        isWicket: true,
        dismissedPlayerId: dismissedBatterId || striker?.id,
        wicketType: dismissalType,
        caughtById: dismissalType === 'Caught' ? caughtById : null,
        runOutById: dismissalType === 'Run Out' ? runOutById : null,
        fielderId: (dismissalType === 'Caught' ? caughtById : dismissalType === 'Run Out' ? runOutById : null) || null,
        newBatterId: hasMoreBatters ? newBatterId : null
      };

      const res = await api.post(`/matches/${id}/deliveries`, payload);
      setShowWicketModal(false);
      setNewBatterId('');
      await fetchScorerState();

      if (res.data?.overCompleted) {
        setShowBowlerModal(true);
      }
    } catch (err) {
      console.error('Failed to record wicket:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to record wicket.';
      alert(errMsg);
      if (errMsg.toLowerCase().includes('switch bowler') || errMsg.toLowerCase().includes('over has completed')) {
        setShowWicketModal(false);
        setShowBowlerModal(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. API ACTION: Switch Bowler
  const handleSwitchBowlerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNextBowlerId) {
      alert('Please select a bowler.');
      return;
    }
    if (selectedNextBowlerId === scorerState?.currentBowler?.id) {
      alert('The same bowler cannot bowl consecutive overs in standard rules.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/matches/${id}/bowler`, {
        nextBowlerId: selectedNextBowlerId
      });
      setShowBowlerModal(false);
      setSelectedNextBowlerId('');
      await fetchScorerState();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to switch bowler.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. API ACTION: Undo Last Delivery
  const handleUndo = async () => {
    if (isSubmitting) return;
    const actionDesc = lastAction?.description || 'the last scoring action';
    const isCompleted = scorerState?.match?.status === 'COMPLETED';
    const confirmPrompt = isCompleted
      ? `This match has concluded. Are you sure you want to revert ${actionDesc} and resume play?`
      : `Revert ${actionDesc}?`;

    if (!window.confirm(confirmPrompt)) return;

    setIsSubmitting(true);
    try {
      const res = await api.post(`/matches/${id}/undo`);
      if (res.data?.success) {
        await fetchScorerState();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to undo ball.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. API ACTION: Start Second Innings
  const handleStartSecondInnings = async () => {
    if (!window.confirm('Start the 2nd Innings now?')) return;
    setIsSubmitting(true);
    try {
      await api.post(`/matches/${id}/second-innings`);
      await fetchScorerState();
      // Prompt toss opening for 2nd innings
      setShowTossModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start 2nd innings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. API ACTION: Finalize Match
  const handleCompleteMatch = async () => {
    if (!window.confirm('Complete and finalize match results? This will update tournament points.')) return;
    setIsSubmitting(true);
    try {
      await api.post(`/matches/${id}/complete`);
      await fetchScorerState();
      alert('Match completed and tournament points updated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={36} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
          <h3>Connecting to Match Scorer Console...</h3>
        </div>
      </div>
    );
  }

  if (error || !scorerState) {
    const isAuth = isUnauthorized || error?.toLowerCase().includes('auth') || error?.toLowerCase().includes('login');
    return (
      <div style={{ padding: '2.5rem 2rem', maxWidth: '560px', margin: '4rem auto', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-elevated)' }}>
        <AlertCircle size={48} style={{ color: isAuth ? 'var(--accent-amber)' : 'var(--accent-rose)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          {isAuth ? 'Scorer Authentication Required' : 'Access Restricted or Match Error'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {error || 'You must be logged in as an authorized Scorer, Venue Owner, or Admin to control this live match.'}
        </p>

        {isAuth && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Link
              to={`/login?redirect=/matches/${id}/scorer`}
              className="btn btn-primary"
              style={{ padding: '0.85rem', fontWeight: 800, textDecoration: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogIn size={18} /> Sign In to Your Account
            </Link>

            {/* Instant Demo Authorization in Testing */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1.1rem', borderRadius: '14px', border: '1px dashed var(--border-color)', marginTop: '0.4rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚡ Instant Quick Login (Development / Testing):
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('owner@turf.com', 'admin123')}
                  disabled={quickLoggingIn}
                  style={{
                    flex: 1,
                    padding: '0.7rem 0.5rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-primary)',
                    fontWeight: '800',
                    cursor: quickLoggingIn ? 'wait' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {quickLoggingIn ? 'Logging in...' : '👤 Sign In as Owner'}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@turf.com', 'admin123')}
                  disabled={quickLoggingIn}
                  style={{
                    flex: 1,
                    padding: '0.7rem 0.5rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    fontWeight: '800',
                    cursor: quickLoggingIn ? 'wait' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {quickLoggingIn ? 'Logging in...' : '🛡️ Sign In as Admin'}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >
          ← Return Back
        </button>
      </div>
    );
  }

  const match = scorerState?.match || {};
  const live = scorerState?.live || {};

  const currentInnings = scorerState?.currentInnings || (live.innings ? {
    runs: live.totalRuns !== undefined ? live.totalRuns : 0,
    wickets: live.wickets !== undefined ? live.wickets : 0,
    balls: (Math.floor(parseFloat(live.overs || 0)) * 6) + Math.round((parseFloat(live.overs || 0) % 1) * 10),
    batting_team_name: live.battingTeamName || match.team_a_name || 'Batting Team',
    innings_number: live.innings || 1,
    overs: live.overs || '0.0'
  } : null);

  const striker = scorerState?.striker || (live.striker ? {
    ...live.striker,
    player_name: live.striker.player_name || live.striker.name || 'Striker'
  } : null);

  const nonStriker = scorerState?.nonStriker || (live.nonStriker ? {
    ...live.nonStriker,
    player_name: live.nonStriker.player_name || live.nonStriker.name || 'Non-Striker'
  } : null);

  const currentBowler = scorerState?.currentBowler || (live.bowler ? {
    ...live.bowler,
    player_name: live.bowler.player_name || live.bowler.name || 'Bowler'
  } : null);

  const currentOverBalls = scorerState?.currentOverBalls || live.currentOverBalls || [];
  const recentBalls = scorerState?.recentBalls || [];
  const battingRoster = scorerState?.battingRoster || (live.battersList || []).map(b => ({
    ...b,
    player_name: b.player_name || b.name,
    balls_faced: b.balls_faced !== undefined ? b.balls_faced : (b.balls || 0)
  }));
  const bowlingRoster = scorerState?.bowlingRoster || (live.bowlersList || []).map(b => ({
    ...b,
    player_name: b.player_name || b.name,
    overs_bowled: b.overs_bowled !== undefined ? b.overs_bowled : (b.overs || '0.0'),
    runs_conceded: b.runs_conceded !== undefined ? b.runs_conceded : (b.runs || 0)
  }));
  const fallOfWickets = scorerState?.fallOfWickets || live.fallOfWickets || [];
  const eligibleBatters = scorerState?.eligibleBatters || [];

  const isMatchLive = match.status === 'LIVE';
  const isInningsBreak = match.status === 'INNINGS_BREAK';
  const isMatchCompleted = match.status === 'COMPLETED';

  // Calculations for display
  const oversFormatted = currentInnings?.overs !== undefined ? currentInnings.overs : `${Math.floor((currentInnings?.balls || 0) / 6)}.${(currentInnings?.balls || 0) % 6}`;
  const totalRuns = currentInnings?.runs !== undefined ? currentInnings.runs : (live.totalRuns || 0);
  const wickets = currentInnings?.wickets !== undefined ? currentInnings.wickets : (live.wickets || 0);
  const crr = live.crr || (currentInnings?.balls > 0 ? ((totalRuns / currentInnings.balls) * 6).toFixed(2) : '0.00');
  const target = match.targetRuns || live.target || (currentInnings?.innings_number === 2 && match.sport_state?.target ? match.sport_state.target : null);
  const runsRemaining = target ? Math.max(0, target - totalRuns) : null;
  const ballsRemaining = currentInnings?.innings_number === 2 ? Math.max(0, (match.overs_per_side || match.totalOvers || 20) * 6 - (currentInnings.balls || 0)) : null;
  const rrr = ballsRemaining > 0 && runsRemaining !== null ? ((runsRemaining / ballsRemaining) * 6).toFixed(2) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', paddingBottom: '3rem' }}>
      {/* 1. Full-screen Boundary Motion Celebration (FOUR / SIX) */}
      {celebration && (
        <BoundaryCelebration
          key={celebration.id}
          type={celebration.type}
          onDone={() => setCelebration(null)}
        />
      )}

      {/* 2. Top Sponsor Ad Banner (if present) */}
      {ads.topAd && (
        <div
          style={{
            background: '#060a12',
            borderBottom: '1px solid var(--border-color)',
            padding: '0.4rem 1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}
        >
          <img
            src={ads.topAd.image_url}
            alt={ads.topAd.name}
            style={{ maxHeight: '38px', objectFit: 'contain', borderRadius: '4px' }}
          />
        </div>
      )}

      {/* 3. Header Navigation & Match Context */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0.75rem 1.25rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '0.4rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {match.tournament_name || 'Tournament Match'} • Match #{match.match_number || 1}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-heading)' }}>
                {match.team_a_name} vs {match.team_b_name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Live Socket Sync Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isConnected ? 'var(--accent-primary)' : 'var(--accent-rose)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              <Radio size={12} className={isConnected ? 'animate-pulse' : ''} />
              {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
            </div>

            {/* Match Status Badge */}
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: isMatchLive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: isMatchLive ? '#022c22' : 'var(--text-primary)',
                textTransform: 'uppercase'
              }}
            >
              {match.status}
            </span>

            {/* Public Display Link */}
            <Link
              to={`/matches/${match.uuid || id}`}
              target="_blank"
              title="Open Public Match Screen"
              style={{
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '0.3rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)'
              }}
            >
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        {/* 4. Match Lifecycle Action Banners */}
        {(!currentInnings || match.status === 'SCHEDULED' || match.status === 'READY') && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} /> Match Toss & Setup Required
              </h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Configure toss winner, batting decision, and opening lineups to begin ball-by-ball scoring.
              </p>
            </div>
            <button
              onClick={() => setShowTossModal(true)}
              style={{
                background: 'var(--accent-primary)',
                color: '#022c22',
                fontWeight: '800',
                padding: '0.6rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Configure Toss & Openers <ChevronRight size={18} />
            </button>
          </div>
        )}

        {isInningsBreak && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: 'var(--accent-amber)' }}>Innings Break — 1st Innings Complete</h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Target set: <strong>{target} runs</strong> in {match.overs_per_side || 20} overs.
              </p>
            </div>
            <button
              onClick={handleStartSecondInnings}
              disabled={isSubmitting}
              style={{
                background: 'var(--accent-amber)',
                color: '#000',
                fontWeight: '800',
                padding: '0.6rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Start 2nd Innings
            </button>
          </div>
        )}

        {isMatchCompleted && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}
          >
            <Trophy size={32} style={{ color: 'var(--accent-primary)', margin: '0 auto 0.5rem' }} />
            <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text-heading)' }}>
              {match.result_summary || 'Match Finished'}
            </h2>
            <p style={{ color: 'var(--accent-primary)', fontWeight: '700', margin: 0 }}>
              Points table and player career statistics are permanently updated.
            </p>
          </div>
        )}

        {/* 5. Main Hero Scoreboard Panel */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {currentInnings?.batting_team_name || match.team_a_name} (Batting)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                  {totalRuns}/{wickets}
                </span>
                <span style={{ fontSize: '1.35rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  ({oversFormatted} ov)
                </span>
              </div>
            </div>

            {/* Run Rate & Match Equation Box */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CRR: </span>
                  <strong style={{ color: 'var(--accent-secondary)' }}>{crr}</strong>
                </div>
                {rrr && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>RRR: </span>
                    <strong style={{ color: 'var(--accent-amber)' }}>{rrr}</strong>
                  </div>
                )}
              </div>

              {target && (
                <div
                  style={{
                    marginTop: '0.4rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: 'var(--accent-amber)'
                  }}
                >
                  Need {runsRemaining} runs in {ballsRemaining} balls (Target {target})
                </div>
              )}
            </div>
          </div>

          {/* Current Over Trail Pill Badges */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              This Over:
            </span>
            {currentOverBalls && currentOverBalls.length > 0 ? (
              currentOverBalls.map((b, idx) => {
                const isObj = typeof b === 'object' && b !== null;
                const isWicket = isObj ? Boolean(b.is_wicket) : String(b) === 'W';
                const isWide = isObj ? b.extra_type === 'WIDE' : String(b).includes('Wd');
                const isNoBall = isObj ? b.extra_type === 'NO_BALL' : String(b).includes('Nb');
                const runsVal = isObj ? (b.runs || 0) : parseInt(String(b).replace(/\D/g, '') || '0', 10);
                const extraRunsVal = isObj ? (b.extra_runs || 0) : runsVal;

                let badgeBg = 'var(--bg-elevated)';
                let badgeColor = 'var(--text-primary)';
                let border = 'var(--border-color)';

                if (isWicket) {
                  badgeBg = 'var(--accent-rose)';
                  badgeColor = '#fff';
                  border = 'transparent';
                } else if (runsVal === 4) {
                  badgeBg = 'var(--accent-primary)';
                  badgeColor = '#022c22';
                  border = 'transparent';
                } else if (runsVal === 6) {
                  badgeBg = 'var(--accent-purple)';
                  badgeColor = '#fff';
                  border = 'transparent';
                } else if (isWide || isNoBall) {
                  badgeBg = 'rgba(245, 158, 11, 0.2)';
                  badgeColor = 'var(--accent-amber)';
                  border = 'rgba(245, 158, 11, 0.4)';
                } else if (runsVal === 0) {
                  badgeColor = 'var(--text-dim)';
                }

                const label = isWicket
                  ? 'W'
                  : isWide
                  ? `${extraRunsVal > 0 ? extraRunsVal : 1}Wd`
                  : isNoBall
                  ? `${runsVal + extraRunsVal}Nb`
                  : runsVal;

                return (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '32px',
                      height: '32px',
                      padding: '0 6px',
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${border}`,
                      fontSize: '0.85rem',
                      fontWeight: '800'
                    }}
                  >
                    {label}
                  </span>
                );
              })
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Over not yet started</span>
            )}

            {scorerState?.overCompleted && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: 'var(--accent-amber)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '800'
                }}
              >
                OVER COMPLETED
              </span>
            )}
          </div>
        </div>

        {/* 6. Batters & Bowler Active Play Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Batters Panel */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Batters
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>R (B) • 4s • 6s • SR</span>
            </div>

            {/* Striker */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0.8rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>⭐</span>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--text-heading)' }}>
                    {striker?.player_name || 'Striker'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: '600' }}>ON STRIKE</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                  {striker?.runs || 0}* <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({striker?.balls || 0})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {striker?.fours || 0} 4s • {striker?.sixes || 0} 6s • SR {striker?.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0'}
                </div>
              </div>
            </div>

            {/* Non-Striker */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0.8rem',
                borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {nonStriker?.player_name || 'Non-Striker'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>NON-STRIKER</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                  {nonStriker?.runs || 0} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({nonStriker?.balls || 0})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {nonStriker?.fours || 0} 4s • {nonStriker?.sixes || 0} 6s • SR {nonStriker?.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : '0.0'}
                </div>
              </div>
            </div>
          </div>

          {/* Bowler Panel */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current Bowler
                </span>
                {scorerState?.overCompleted && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      letterSpacing: '0.3px'
                    }}
                  >
                    OVER COMPLETE
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowBowlerModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Change Bowler ↻
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '1.05rem' }}>
                  {currentBowler?.player_name || 'Bowler'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Economy:{' '}
                  <strong>
                    {currentBowler?.overs > 0
                      ? ((currentBowler.runs / parseFloat(currentBowler.overs)) || 0).toFixed(2)
                      : '0.00'}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>
                  {currentBowler?.wickets || 0} / {currentBowler?.runs || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {currentBowler?.overs || '0.0'} overs • {currentBowler?.maidens || 0} maidens
                </div>
              </div>
            </div>

            {/* Quick Strike Rotation & Undo Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                onClick={handleUndo}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <RotateCcw size={14} /> Revert / Undo
              </button>

              <button
                onClick={handleCompleteMatch}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <CheckCircle size={14} /> End Match
              </button>
            </div>
          </div>
        </div>

        {/* 7. Primary Touch-Friendly Scoring Keypad */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-elevated)'
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Primary Scoring Controls (Tap to Record)
          </div>

          {scorerState?.overCompleted && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.22) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '14px',
                padding: '0.9rem 1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-amber)',
                    flexShrink: 0
                  }}
                >
                  <RotateCcw size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--accent-amber)', fontSize: '0.92rem' }}>
                    Over Completed (6 Legal Balls)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Please select the next bowler before recording deliveries for the next over.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBowlerModal(true)}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent-amber)',
                  color: '#000000',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                Change Bowler Now ↻
              </button>
            </div>
          )}

          {/* Universal Undo & Last Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '0.85rem',
              padding: '0.65rem 1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Action:</span>
              <span style={{ fontWeight: 700, color: lastAction?.canUndo ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                {lastAction?.description || (recentBalls?.[0]?.commentary || 'No deliveries recorded yet')}
              </span>
            </div>

            <button
              onClick={handleUndo}
              disabled={isSubmitting || !lastAction?.canUndo}
              title={lastAction?.description ? `Undo ${lastAction.description}` : 'Undo Last Action'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                border: lastAction?.canUndo ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: lastAction?.canUndo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: lastAction?.canUndo ? '#fbbf24' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: isSubmitting || !lastAction?.canUndo ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !lastAction?.canUndo ? 0.6 : 1
              }}
            >
              <RotateCcw size={14} /> Undo Last Action
            </button>
          </div>

          {/* Primary Runs Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}
          >
            {[
              { val: 0, label: '0', sub: 'Dot' },
              { val: 1, label: '1', sub: 'Single' },
              { val: 2, label: '2', sub: 'Two' },
              { val: 3, label: '3', sub: 'Three' },
              { val: 4, label: '4', sub: 'FOUR', isBoundary: true },
              { val: 6, label: '6', sub: 'SIX', isSix: true }
            ].map((btn) => (
              <button
                key={btn.val}
                onClick={() => handleRecordBall(btn.val)}
                disabled={isSubmitting || !isMatchLive}
                style={{
                  aspectRatio: '1',
                  borderRadius: '14px',
                  border: btn.isBoundary
                    ? '2px solid rgba(16, 185, 129, 0.5)'
                    : btn.isSix
                    ? '2px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid var(--border-color)',
                  background: btn.isBoundary
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.15) 100%)'
                    : btn.isSix
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)'
                    : 'var(--bg-elevated)',
                  color: btn.isBoundary
                    ? 'var(--accent-primary)'
                    : btn.isSix
                    ? 'var(--accent-purple)'
                    : 'var(--text-heading)',
                  fontSize: '1.75rem',
                  fontWeight: '900',
                  cursor: isSubmitting || !isMatchLive ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span>{btn.label}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.8, textTransform: 'uppercase' }}>
                  {btn.sub}
                </span>
              </button>
            ))}
          </div>

          {/* Extras and Wicket Action Bar */}
          <div className="scorer-actions-bar">
            <button
              onClick={() => {
                if (scorerState?.overCompleted) {
                  setShowBowlerModal(true);
                  return;
                }
                setShowExtraModal('WIDE');
              }}
              disabled={isSubmitting || !isMatchLive}
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--accent-amber)',
                fontWeight: '800',
                padding: '0.85rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              WD
            </button>

            <button
              onClick={() => {
                if (scorerState?.overCompleted) {
                  setShowBowlerModal(true);
                  return;
                }
                setShowExtraModal('NO_BALL');
              }}
              disabled={isSubmitting || !isMatchLive}
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--accent-amber)',
                fontWeight: '800',
                padding: '0.85rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              NB
            </button>

            <button
              onClick={() => {
                if (scorerState?.overCompleted) {
                  setShowBowlerModal(true);
                  return;
                }
                setShowExtraModal('BYE');
              }}
              disabled={isSubmitting || !isMatchLive}
              style={{
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontWeight: '800',
                padding: '0.85rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              BYE
            </button>

            <button
              onClick={() => {
                if (scorerState?.overCompleted) {
                  setShowBowlerModal(true);
                  return;
                }
                setShowExtraModal('LEG_BYE');
              }}
              disabled={isSubmitting || !isMatchLive}
              style={{
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontWeight: '800',
                padding: '0.85rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              LB
            </button>

            {/* WICKET BUTTON */}
            <button
              onClick={() => {
                if (scorerState?.overCompleted) {
                  setShowBowlerModal(true);
                  return;
                }
                setDismissedBatterId(striker?.id || '');
                setShowWicketModal(true);
              }}
              disabled={isSubmitting || !isMatchLive}
              style={{
                borderRadius: '12px',
                border: '2px solid rgba(239, 68, 68, 0.6)',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '900',
                letterSpacing: '0.5px',
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.35)'
              }}
            >
              <Zap size={18} /> OUT / WICKET
            </button>
          </div>
        </div>

        {/* 8. Tabs Panel: Commentary | Scorecard | Fall of Wickets */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            overflow: 'hidden'
          }}
        >
          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-elevated)'
            }}
          >
            {[
              { id: 'commentary', label: 'Ball Commentary' },
              { id: 'scorecard', label: 'Full Scorecard' },
              { id: 'fow', label: 'Fall of Wickets' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '1.25rem' }}>
            {/* Commentary Tab */}
            {activeTab === 'commentary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {recentBalls && recentBalls.length > 0 ? (
                  recentBalls.map((ball) => (
                    <div
                      key={ball.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span
                        style={{
                          fontWeight: '800',
                          color: 'var(--accent-secondary)',
                          minWidth: '40px'
                        }}
                      >
                        {ball.over_number}.{ball.ball_number}
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                        {ball.commentary || `${ball.bowler_name} to ${ball.striker_name} — ${ball.runs} runs`}
                      </span>
                      <span
                        style={{
                          fontWeight: '800',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: ball.is_wicket
                            ? 'var(--accent-rose)'
                            : ball.runs >= 4
                            ? 'var(--accent-primary)'
                            : 'rgba(255,255,255,0.06)',
                          color: ball.runs >= 4 && !ball.is_wicket ? '#022c22' : '#fff'
                        }}
                      >
                        {ball.is_wicket ? 'OUT' : ball.runs}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>
                    No deliveries bowled in this innings yet.
                  </div>
                )}
              </div>
            )}

            {/* Scorecard Tab */}
            {activeTab === 'scorecard' && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-heading)' }}>Batting</h4>
                <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Batter</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>R</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>B</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>4s</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>6s</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingRoster?.map((p) => {
                        const sr = p.balls_faced > 0 ? ((p.runs / p.balls_faced) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '600' }}>
                              {p.player_name}{' '}
                              {p.id === striker?.id ? '⭐' : ''}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: '700' }}>{p.runs}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)' }}>{p.balls_faced}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>{p.fours}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>{p.sixes}</td>
                            <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--accent-secondary)' }}>{sr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-heading)' }}>Bowling</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Bowler</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>O</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>M</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>R</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem' }}>W</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>ECO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingRoster?.filter(b => b.overs_bowled > 0 || b.id === currentBowler?.id).map((b) => {
                        const eco = b.overs_bowled > 0 ? (b.runs_conceded / parseFloat(b.overs_bowled)).toFixed(2) : '0.00';
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '600' }}>{b.player_name}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>{b.overs_bowled}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>{b.maidens}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: '700' }}>{b.runs_conceded}</td>
                            <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: '800', color: 'var(--accent-rose)' }}>{b.wickets}</td>
                            <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--accent-secondary)' }}>{eco}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fall of Wickets Tab */}
            {activeTab === 'fow' && (
              <div>
                {fallOfWickets && fallOfWickets.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {fallOfWickets.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--accent-rose)' }}>
                            {f.runs}/{f.wicket}
                          </strong>{' '}
                          — {f.player}
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>Over {f.overs}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>
                    No wickets have fallen in this innings.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 9. Bottom Stadium Sponsor Ad (if present) */}
      {ads.bottomAd && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#060a12',
            borderTop: '1px solid var(--border-color)',
            padding: '0.35rem 1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 90
          }}
        >
          <img
            src={ads.bottomAd.image_url}
            alt={ads.bottomAd.name}
            style={{ maxHeight: '32px', objectFit: 'contain', borderRadius: '4px' }}
          />
        </div>
      )}

      {/* =========================================================================
          MODALS SECTION: TOSS, WICKET, BOWLER SWITCH, EXTRAS
          ========================================================================= */}

      {/* TOSS SETUP MODAL */}
      {showTossModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy style={{ color: 'var(--accent-primary)' }} /> Toss & Match Lineup
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Select the toss winner, batting decision, and opening players to launch innings.
            </p>

            <form onSubmit={handleTossSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Toss Winner */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Toss Won By:
                </label>
                <select
                  value={tossWinnerTeamId}
                  onChange={(e) => setTossWinnerTeamId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value={scorerState?.teamA?.id}>{scorerState?.teamA?.name}</option>
                  <option value={scorerState?.teamB?.id}>{scorerState?.teamB?.name}</option>
                </select>
              </div>

              {/* Toss Decision */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Elected To:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['BAT', 'BOWL'].map((dec) => (
                    <button
                      type="button"
                      key={dec}
                      onClick={() => setTossDecision(dec)}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: tossDecision === dec ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: tossDecision === dec ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-elevated)',
                        color: tossDecision === dec ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {dec} FIRST
                    </button>
                  ))}
                </div>
              </div>

              {/* Opening Striker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Opening Striker:
                </label>
                <select
                  value={openingStrikerId}
                  onChange={(e) => setOpeningStrikerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">-- Choose Striker --</option>
                  {getTossBattingRoster().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Non-Striker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Opening Non-Striker:
                </label>
                <select
                  value={openingNonStrikerId}
                  onChange={(e) => setOpeningNonStrikerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">-- Choose Non-Striker --</option>
                  {getTossBattingRoster()
                    .filter((p) => p.id !== openingStrikerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Opening Bowler */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Opening Bowler:
                </label>
                <select
                  value={openingBowlerId}
                  onChange={(e) => setOpeningBowlerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">-- Choose Opening Bowler --</option>
                  {getTossBowlingRoster().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTossModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent-primary)',
                    color: '#022c22',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Starting...' : 'Start Match & Innings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WICKET ENTRY MODAL */}
      {showWicketModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap /> Record Wicket / Dismissal
            </h2>

            <form onSubmit={handleWicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {/* Dismissed Batter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Dismissed Player:
                </label>
                <select
                  value={dismissedBatterId}
                  onChange={(e) => setDismissedBatterId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value={striker?.id}>{striker?.player_name} (Striker)</option>
                  <option value={nonStriker?.id}>{nonStriker?.player_name} (Non-Striker)</option>
                </select>
              </div>

              {/* Dismissal Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Dismissal Type:
                </label>
                <select
                  value={dismissalType}
                  onChange={(e) => setDismissalType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  {[
                    'Bowled',
                    'Caught',
                    'LBW',
                    'Run Out',
                    'Stumped',
                    'Hit Wicket',
                    'Retired Hurt',
                    'Retired Out',
                    'Obstructing the Field'
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Caught By Fielder */}
              {dismissalType === 'Caught' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Caught By Fielder (Optional):
                  </label>
                  <select
                    value={caughtById}
                    onChange={(e) => setCaughtById(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">-- Bowler or Unspecified Fielder --</option>
                    {bowlingRoster?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.player_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Run Out By Fielder */}
              {dismissalType === 'Run Out' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Run Out By Fielder:
                  </label>
                  <select
                    value={runOutById}
                    onChange={(e) => setRunOutById(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">-- Unspecified Fielder --</option>
                    {bowlingRoster?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.player_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* New Incoming Batter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  New Batter (Next In):
                </label>
                <select
                  value={newBatterId}
                  onChange={(e) => setNewBatterId(e.target.value)}
                  required={eligibleBatters && eligibleBatters.length > 0}
                  disabled={!eligibleBatters || eligibleBatters.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">
                    {eligibleBatters && eligibleBatters.length > 0 ? '-- Select Incoming Batter --' : 'No more eligible batters (All Out)'}
                  </option>
                  {eligibleBatters && eligibleBatters.length > 0 &&
                    eligibleBatters.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.player_name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowWicketModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent-rose)',
                    color: '#fff',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Wicket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOWLER SWITCH MODAL */}
      {showBowlerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--accent-secondary)' }}>Select Next Bowler</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Choose the bowler for the next over. The previous bowler cannot bowl consecutive overs.
            </p>

            <form onSubmit={handleSwitchBowlerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Bowler:
                </label>
                <select
                  value={selectedNextBowlerId}
                  onChange={(e) => setSelectedNextBowlerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">-- Choose Bowler --</option>
                  {(() => {
                    const candidateBowlers = [];
                    const addedIds = new Set();
                    (bowlingRoster || []).forEach(b => {
                      const bId = String(b.id);
                      if (bId !== String(currentBowler?.id) && !addedIds.has(bId)) {
                        addedIds.add(bId);
                        candidateBowlers.push({
                          id: b.id,
                          name: b.player_name || b.name,
                          sub: `(${b.overs_bowled || b.overs || '0.0'} ov, ${b.wickets || 0} wkts)`
                        });
                      }
                    });
                    (getTossBowlingRoster() || []).forEach(p => {
                      const pId = String(p.user_id || p.id);
                      if (pId !== String(currentBowler?.id) && !addedIds.has(pId)) {
                        addedIds.add(pId);
                        candidateBowlers.push({
                          id: p.user_id || p.id,
                          name: p.name || p.player_name,
                          sub: '(Yet to bowl)'
                        });
                      }
                    });
                    if (candidateBowlers.length === 0 && currentBowler) {
                      candidateBowlers.push({
                        id: currentBowler.id,
                        name: currentBowler.player_name || currentBowler.name,
                        sub: '(Continue bowling)'
                      });
                    }
                    return candidateBowlers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.sub}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBowlerModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent-secondary)',
                    color: '#022c22',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Set Bowler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTRAS ENTRY MODAL */}
      {showExtraModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--accent-amber)' }}>
              {showExtraModal === 'WIDE' && 'Wide Ball (+ Extra Runs)'}
              {showExtraModal === 'NO_BALL' && 'No Ball (+ Bat Runs)'}
              {showExtraModal === 'BYE' && 'Byes (+ Extra Runs)'}
              {showExtraModal === 'LEG_BYE' && 'Leg Byes (+ Extra Runs)'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Select additional runs completed on this delivery:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {showExtraModal === 'WIDE' &&
                [0, 1, 2, 3, 4].map((add) => (
                  <button
                    key={add}
                    onClick={() => handleRecordBall(0, 'WIDE', add)}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--accent-amber)',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      cursor: 'pointer'
                    }}
                  >
                    +{add} ({1 + add} Wd)
                  </button>
                ))}

              {showExtraModal === 'NO_BALL' &&
                [0, 1, 2, 3, 4, 6].map((batRuns) => (
                  <button
                    key={batRuns}
                    onClick={() => handleRecordBall(batRuns, 'NO_BALL', 0)}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--accent-amber)',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      cursor: 'pointer'
                    }}
                  >
                    NB + {batRuns}
                  </button>
                ))}

              {(showExtraModal === 'BYE' || showExtraModal === 'LEG_BYE') &&
                [1, 2, 3, 4].map((runs) => (
                  <button
                    key={runs}
                    onClick={() => handleRecordBall(0, showExtraModal, runs)}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      cursor: 'pointer'
                    }}
                  >
                    +{runs}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowExtraModal(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CricketScorerPage;
