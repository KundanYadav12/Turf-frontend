'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trophy, Palette, RotateCcw, Check, Sparkles, Undo2 } from 'lucide-react';
import { getServeState, getCourtState, parseRacquetScoreDetails, getCourtContrastColor } from './courtUtils';
import { useBallAnimation, BALL_MOTION } from './useBallAnimation';

export { getServeState, getCourtState, parseRacquetScoreDetails, getCourtContrastColor, useBallAnimation, BALL_MOTION };

/**
 * Cinematic, Rule-Accurate Vector Court Visualization with 60fps Motion Choreography.
 * Supports Badminton, Pickleball, and Tennis across TV, Signage, Scorer, and Match views.
 *
 * Implements:
 * 1. Serve swing & parabolic flight with soft elevation shadow.
 * 2. Deterministic 2-4 shot rally exchanges with alternating racket swings and player nudges.
 * 3. Point end with court glow, impact ripple, score pop, and floating "+1".
 * 4. Serve pass & doubles partner box swap per BWF / USA Pickleball rules.
 * 5. Change of ends & game/match point victory ribbons.
 * 6. Ambient idle rally between points (non-intrusive, stops immediately on live events).
 * 7. Instant authoritative undo with smooth rewind and banner clearance.
 */
const DEFAULT_TEAM_A = { name: 'Team A', score: 0 };
const DEFAULT_TEAM_B = { name: 'Team B', score: 0 };
const DEFAULT_ADS = [];

export default function CourtView({
  match = null,
  serveState: propServeState = null,
  sport = 'badminton',
  format = 'DOUBLES',
  teamA = DEFAULT_TEAM_A,
  teamB = DEFAULT_TEAM_B,
  lineup = null,
  scoreSummary = null,
  scores = null,
  servingSide: propServingSide = null,
  serverCourt: propServerCourt = null,
  serverNumber: propServerNumber = 1,
  courtColor: initialCourtColor = '#0d5c3a',
  courtAds = DEFAULT_ADS,
  courtMiddleAds = DEFAULT_ADS,
  onColorChange = null,
  canEditColor = false,
  status = 'LIVE',
  winner = null,
  isGamePoint = false,
  isMatchPoint = false,
  compact = false,
  theme = 'dark',
  orientation = 'landscape',
  showScoreReadout = false,
  showTeamLabels = false,
  variant = 'default',
  showScoreOnCourt = false,
  lastEventType = null,
  eventSeq = null,
  pointEvent = null,
  rallyMode = false,
  ambientRally = true,
  className = '',
  style = {}
}) {
  // ── 1. SINGLE SOURCE OF TRUTH EXTRACTION ──
  // Merge match or discrete props into a unified authoritative court state
  const unifiedMatch = useMemo(() => {
    if (match) {
      return {
        ...match,
        serveState: propServeState || match.serveState,
        sportSlug: match.sportSlug || sport,
        matchFormat: match.matchFormat || format,
        courtColor: match.courtColor || initialCourtColor,
        courtAds: match.courtAds || courtAds,
        courtMiddleAds: (courtMiddleAds && courtMiddleAds.length > 0) ? courtMiddleAds : (match.courtMiddleAds || courtMiddleAds),
        _lastEventType: lastEventType || match._lastEventType,
        _eventSeq: eventSeq || match._eventSeq,
        _pointEvent: pointEvent || match._pointEvent
      };
    }
    const computedScoreSummary = scoreSummary || (teamA?.score !== undefined ? `${teamA.score} - ${teamB?.score || 0}` : null);
    return {
      serveState: propServeState,
      sportSlug: sport,
      matchFormat: format,
      teamA,
      teamB,
      lineup,
      live_score_summary: computedScoreSummary,
      scores: scores || { teamA: teamA?.score || 0, teamB: teamB?.score || 0 },
      servingSide: propServingSide,
      sport_state: {
        serverCourt: propServerCourt,
        serverNumber: propServerNumber,
        isGamePoint,
        isMatchPoint
      },
      status,
      winnerTeamId: winner ? (winner === 'team_a' ? teamA?.id : teamB?.id) : null,
      courtColor: initialCourtColor,
      courtAds,
      courtMiddleAds,
      _lastEventType: lastEventType,
      _eventSeq: eventSeq,
      _pointEvent: pointEvent
    };
  }, [
    match, propServeState, sport, format,
    teamA?.id, teamA?.name, teamA?.score,
    teamB?.id, teamB?.name, teamB?.score,
    lineup, scoreSummary, scores,
    propServingSide, propServerCourt, propServerNumber,
    initialCourtColor, courtAds?.length, courtMiddleAds?.length, lastEventType, eventSeq, pointEvent,
    status, winner, isGamePoint, isMatchPoint
  ]);

  const courtState = useMemo(() => {
    const cs = getCourtState(unifiedMatch);
    if (propServeState) {
      cs.serveState = propServeState;
    }
    return cs;
  }, [unifiedMatch, propServeState]);

  // ── 2. COURT COLOR & AD STATE ──
  const [courtColor, setCourtColor] = useState(initialCourtColor || '#0d5c3a');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customHex, setCustomHex] = useState(initialCourtColor || '#0d5c3a');
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  useEffect(() => {
    if (initialCourtColor) {
      setCourtColor(prev => prev !== initialCourtColor ? initialCourtColor : prev);
      setCustomHex(prev => prev !== initialCourtColor ? initialCourtColor : prev);
    }
  }, [initialCourtColor]);

  // Tab visibility detection
  const [isTabVisible, setIsTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // In-court ad rotation
  useEffect(() => {
    if (!courtAds || courtAds.length <= 1) return;
    const interval = setInterval(() => {
      if (isTabVisible) {
        setActiveAdIndex((prev) => (prev + 1) % courtAds.length);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [courtAds?.length, isTabVisible]);

  // Middle strip ad rotation (flanking center net)
  const resolvedMiddleAds = useMemo(() => {
    return (unifiedMatch?.courtMiddleAds || []).filter(Boolean);
  }, [unifiedMatch?.courtMiddleAds]);

  const [activeMiddleAdIndex, setActiveMiddleAdIndex] = useState(0);

  useEffect(() => {
    if (!resolvedMiddleAds || resolvedMiddleAds.length <= 1) return;
    const interval = setInterval(() => {
      if (isTabVisible) {
        setActiveMiddleAdIndex((prev) => (prev + 1) % resolvedMiddleAds.length);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [resolvedMiddleAds?.length, isTabVisible]);

  // ── 3. CHOREOGRAPHY CONTROLLER STATE ──
  const [ballState, setBallState] = useState(() => ({
    x: courtState.defaultBallCoords.x,
    y: courtState.defaultBallCoords.y,
    elevation: 0, // 0 = on ground, >0 = in air
    rotation: courtState.teamSides[courtState.servingTeam] === 'LEFT' ? 35 : -145,
    trail: []
  }));

  const [racketSwings, setRacketSwings] = useState({
    LEFT_TOP: 0,
    LEFT_BOTTOM: 0,
    RIGHT_TOP: 0,
    RIGHT_BOTTOM: 0
  });

  const [playerNudges, setPlayerNudges] = useState({
    LEFT_TOP: { x: 0, y: 0 },
    LEFT_BOTTOM: { x: 0, y: 0 },
    RIGHT_TOP: { x: 0, y: 0 },
    RIGHT_BOTTOM: { x: 0, y: 0 }
  });

  const [impactRipple, setImpactRipple] = useState(null); // { x, y, visible }
  const [scoringGlow, setScoringGlow] = useState(null); // 'teamA' | 'teamB'
  const [scorePop, setScorePop] = useState(false);
  const [floatingPlusOne, setFloatingPlusOne] = useState(null); // { side, text }
  const [undoActive, setUndoActive] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);

  const courtCanvasRef = useRef(null);
  const prevCourtRef = useRef(courtState);
  const isInitialMount = useRef(true);
  const choreographyTimerRef = useRef(null);

  // Helper to trigger impact ripple
  const triggerRipple = useCallback((x, y) => {
    setImpactRipple({ x, y, id: Date.now() });
    setTimeout(() => setImpactRipple(null), 550);
  }, []);

  // Helper to trigger racket swing
  const triggerSwing = useCallback((slotKey, deg) => {
    setRacketSwings(prev => ({ ...prev, [slotKey]: deg }));
    setPlayerNudges(prev => ({
      ...prev,
      [slotKey]: { x: slotKey.startsWith('LEFT') ? 5 : -5, y: deg > 0 ? 3 : -3 }
    }));
    setTimeout(() => {
      setRacketSwings(prev => ({ ...prev, [slotKey]: 0 }));
      setPlayerNudges(prev => ({ ...prev, [slotKey]: { x: 0, y: 0 } }));
    }, 280);
  }, []);

  // Shared 60fps translate3d ball and shuttle animation hook
  const {
    ballRef,
    shadowRef,
    motionConfig,
    isAnimating: isBallAnimating,
    playPointRally,
    playUndoSnap
  } = useBallAnimation({
    serveState: courtState.serveState,
    sport: unifiedMatch.sportSlug || sport,
    containerRef: courtCanvasRef,
    pointEvent: pointEvent || unifiedMatch._pointEvent,
    lastEventType: lastEventType || unifiedMatch._lastEventType,
    eventSeq: eventSeq || unifiedMatch._eventSeq,
    matchId: unifiedMatch.id || unifiedMatch.uuid || match?.id || match?.uuid,
    rallyMode,
    ambientRally: ambientRally && courtState.status === 'LIVE' && !courtState.isMatchWon,
    reducedMotion: prefersReducedMotion,
    onShotLand: useCallback((coords) => {
      const slot = coords.x < 50
        ? (coords.y < 50 ? 'LEFT_TOP' : 'LEFT_BOTTOM')
        : (coords.y < 50 ? 'RIGHT_TOP' : 'RIGHT_BOTTOM');
      triggerSwing(slot, coords.x < 50 ? 35 : -35);
      triggerRipple((coords.x / 100) * 800, (coords.y / 100) * 400);
    }, [triggerSwing, triggerRipple])
  });

  // ── 4. EVENT-TO-CHOREOGRAPHY PIPELINE ──
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCourtRef.current = courtState;
      return;
    }

    const prev = prevCourtRef.current || courtState;
    const isScoreChanged = courtState.scoreA !== prev.scoreA || courtState.scoreB !== prev.scoreB;
    const isUndo = (
      unifiedMatch._lastEventType === 'UNDO' ||
      courtState.scoreA < prev.scoreA ||
      courtState.scoreB < prev.scoreB ||
      (courtState.eventSeq && prev.eventSeq && courtState.eventSeq < prev.eventSeq)
    );

    if (choreographyTimerRef.current) clearTimeout(choreographyTimerRef.current);

    // ── SCENARIO A: AUTHORITATIVE UNDO ──
    if (isUndo) {
      setUndoActive(true);
      setScoringGlow(null);
      setScorePop(false);
      setFloatingPlusOne(null);
      setCelebrationActive(false);
      setImpactRipple(null);

      playUndoSnap(courtState.serveState?.servingBoxName || 'bottom-left');

      choreographyTimerRef.current = setTimeout(() => {
        setUndoActive(false);
      }, 700);

      prevCourtRef.current = courtState;
      return;
    }

    // ── SCENARIO B: FORWARD POINT CHOREOGRAPHY ──
    if (isScoreChanged) {
      const scoringTeam = courtState.scoreA > prev.scoreA ? 'teamA' : 'teamB';
      const isWinner = courtState.isMatchWon || courtState.winner;

      // Calculate from and to service boxes from previous state
      const prevServerSide = prev.teamSides?.[prev.servingTeam] || 'LEFT';
      const prevServerBox = prev.serverBox || 'RIGHT';
      const fromBoxName = prev.serveState?.servingBoxName || (prevServerSide === 'LEFT' ? (prevServerBox === 'RIGHT' ? 'bottom-left' : 'top-left') : (prevServerBox === 'RIGHT' ? 'top-right' : 'bottom-right'));
      const toBoxName = prev.serveState?.targetBoxName || (fromBoxName === 'bottom-left' ? 'top-right' : fromBoxName === 'top-left' ? 'bottom-right' : fromBoxName === 'top-right' ? 'bottom-left' : 'top-left');
      const newServingBoxName = courtState.serveState?.servingBoxName || 'bottom-left';

      // Play continuous 60fps rally flight if not already triggered by socket pointEvent
      if (!isBallAnimating) {
        playPointRally(fromBoxName, toBoxName, newServingBoxName);
      }

      // Celebrations and cues
      setScoringGlow(scoringTeam);
      setScorePop(true);
      setFloatingPlusOne({
        side: scoringTeam,
        x: scoringTeam === 'teamA' ? 200 : 600,
        y: 80,
        text: `+1 ${courtState[scoringTeam].name}`
      });

      if (isWinner) {
        setCelebrationActive(true);
      }

      choreographyTimerRef.current = setTimeout(() => {
        setScorePop(false);
        setFloatingPlusOne(null);
        setScoringGlow(null);
      }, 1600);

      prevCourtRef.current = courtState;
      return;
    }

    prevCourtRef.current = courtState;
  }, [courtState, unifiedMatch._lastEventType, playPointRally, playUndoSnap, isBallAnimating]);

  // Visual Tokens & Contrast
  const contrastLinesColor = useMemo(() => getCourtContrastColor(courtColor), [courtColor]);

  const activeAd = courtAds && courtAds.length > 0 ? courtAds[activeAdIndex] : null;
  const secondaryAd = courtAds && courtAds.length > 1 ? courtAds[(activeAdIndex + 1) % courtAds.length] : null;

  // Active Server Box & Diagonal Target Box (relative to 800x400 viewBox)
  const BOX_MAP = useMemo(() => ({
    'top-left': { x: 30, y: 25, width: 280, height: 175 },
    'bottom-left': { x: 30, y: 200, width: 280, height: 175 },
    'top-right': { x: 490, y: 25, width: 280, height: 175 },
    'bottom-right': { x: 490, y: 200, width: 280, height: 175 }
  }), []);

  const activeServerBox = useMemo(() => {
    if (courtState.serveState?.servingBoxName) {
      return BOX_MAP[courtState.serveState.servingBoxName] || BOX_MAP['bottom-left'];
    }
    const isLeft = courtState.teamSides[courtState.servingTeam] === 'LEFT';
    if (isLeft) {
      return courtState.serverBox === 'RIGHT'
        ? BOX_MAP['bottom-left']
        : BOX_MAP['top-left'];
    } else {
      return courtState.serverBox === 'RIGHT'
        ? BOX_MAP['top-right']
        : BOX_MAP['bottom-right'];
    }
  }, [courtState, BOX_MAP]);

  // Diagonal Receiver Box
  const activeReceiverBox = useMemo(() => {
    if (courtState.serveState?.targetBoxName) {
      return BOX_MAP[courtState.serveState.targetBoxName] || BOX_MAP['top-right'];
    }
    const isReceiverLeft = courtState.teamSides[courtState.servingTeam] !== 'LEFT';
    if (isReceiverLeft) {
      return courtState.receiverBox === 'RIGHT'
        ? BOX_MAP['bottom-left']
        : BOX_MAP['top-left'];
    } else {
      return courtState.receiverBox === 'RIGHT'
        ? BOX_MAP['top-right']
        : BOX_MAP['bottom-right'];
    }
  }, [courtState, BOX_MAP]);

  return (
    <div
      className={`court-visualization-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        ...style
      }}
    >
      {/* 60fps Broadcast Keyframes */}
      <style>{`
        @keyframes courtPulse {
          0% { opacity: 0; }
          40% { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes bannerPulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.06); }
        }
        @keyframes shuttleHover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes popScore {
          0% { transform: scale(1); }
          40% { transform: scale(1.22); }
          100% { transform: scale(1); }
        }
        @keyframes floatPlusOne {
          0% { opacity: 0; transform: translate(-50%, 0); }
          30% { opacity: 1; transform: translate(-50%, -12px); }
          100% { opacity: 0; transform: translate(-50%, -24px); }
        }
        @keyframes rippleOut {
          0% { transform: scale(0.2); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .court-visualization-container * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Optional Color Picker for Scorer Console */}
      {canEditColor && (
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.65rem',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="court-color-toggle-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Palette size={14} color={courtColor} />
            <span>Court Color</span>
          </button>

          {showColorPicker && (
            <div
              className="scorer-panel"
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '6px',
                zIndex: 30,
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                maxWidth: 'min(90vw, 320px)',
                gap: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
              }}
            >
              {[
                { name: 'Emerald Green', hex: '#0d5c3a' },
                { name: 'US Open Blue', hex: '#1e40af' },
                { name: 'Pacific Cyan', hex: '#0284c7' },
                { name: 'Roland Clay', hex: '#c2410c' },
                { name: 'Indigo Night', hex: '#4f46e5' },
                { name: 'Vivid Mint', hex: '#059669' }
              ].map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  onClick={() => {
                    setCourtColor(swatch.hex);
                    setCustomHex(swatch.hex);
                    if (onColorChange) onColorChange(swatch.hex);
                    setShowColorPicker(false);
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: swatch.hex,
                    border: courtColor === swatch.hex ? '2.5px solid #ffffff' : '1.5px solid rgba(0,0,0,0.15)',
                    boxShadow: courtColor === swatch.hex ? '0 0 0 2px #10b981' : '0 2px 5px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Court Canvas Area with 800:400 (2:1) aspect ratio */}
      <div
        ref={courtCanvasRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          aspectRatio: '2 / 1',
          borderRadius: '16px',
          overflow: 'hidden',
          background: `radial-gradient(circle at 50% 50%, ${courtColor}ee 0%, ${courtColor} 100%)`,
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 12px 30px rgba(0,0,0,0.35)',
          border: '3px solid rgba(255,255,255,0.12)'
        }}
      >

        {/* Sponsor Decals under court lines */}
        {activeAd && (
          <div style={{
            position: 'absolute',
            top: '12%',
            left: '8%',
            width: '28%',
            height: '76%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 1
          }}>
            <img
              src={activeAd.imageUrl}
              alt={activeAd.title || 'Sponsor'}
              style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' }}
            />
          </div>
        )}

        {secondaryAd && (
          <div style={{
            position: 'absolute',
            top: '12%',
            right: '8%',
            width: '28%',
            height: '76%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 1
          }}>
            <img
              src={secondaryAd.imageUrl}
              alt={secondaryAd.title || 'Sponsor'}
              style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Radiant Scoring Side Aura Glow */}
        {scoringGlow && (
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: courtState.teamSides[scoringGlow] === 'LEFT' ? 0 : '50%',
            width: '50%',
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.42) 0%, transparent 75%)',
            animation: 'courtPulse 1.2s ease-out',
            pointerEvents: 'none',
            zIndex: 2
          }} />
        )}

        {/* Floating +1 Pill */}
        {floatingPlusOne && (
          <div style={{
            position: 'absolute',
            top: `${floatingPlusOne.y}px`,
            left: `${floatingPlusOne.x}px`,
            transform: 'translate(-50%, 0)',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            padding: '3px 12px',
            borderRadius: '20px',
            fontWeight: 900,
            fontSize: '0.82rem',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5)',
            zIndex: 12,
            animation: 'floatPlusOne 1.4s ease-out forwards',
            pointerEvents: 'none'
          }}>
            {floatingPlusOne.text}
          </div>
        )}

        {/* Undo Cue (Scorer only, never shown to viewers) */}
        {undoActive && variant !== 'viewer' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '2px solid #f59e0b',
            borderRadius: '24px',
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fbbf24',
            fontWeight: 900,
            fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)',
            letterSpacing: '0.05em',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.5)',
            zIndex: 15
          }}>
            <Undo2 size={18} />
            <span>POINT UNDONE</span>
          </div>
        )}

        {/* Match / Game Point Ribbon */}
        {(courtState.isMatchPoint || courtState.isGamePoint) && !celebrationActive && !undoActive && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: courtState.isMatchPoint
              ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            padding: '4px 16px',
            borderRadius: '20px',
            fontWeight: 900,
            fontSize: 'clamp(0.72rem, 1.2vw, 0.95rem)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'bannerPulse 1.8s infinite'
          }}>
            <Sparkles size={14} />
            <span>{courtState.isMatchPoint ? '🔥 MATCH POINT' : '⚡ GAME POINT'}</span>
          </div>
        )}

        {/* Victory Concluded Banner */}
        {celebrationActive && !undoActive && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10b981, #047857)',
            color: '#ffffff',
            padding: '5px 20px',
            borderRadius: '24px',
            fontWeight: 950,
            fontSize: 'clamp(0.8rem, 1.4vw, 1.05rem)',
            boxShadow: '0 4px 25px rgba(16, 185, 129, 0.6)',
            zIndex: 12,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'bannerPulse 1.5s infinite'
          }}>
            <Trophy size={16} />
            <span>GAME WON &bull; {courtState.winner ? courtState[courtState.winner]?.name : 'VICTORY'}</span>
          </div>
        )}

        {/* ── VECTOR SVG COURT MARKINGS, PLAYERS & BALL ── */}
        <svg
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 3,
            pointerEvents: 'none'
          }}
        >
          <defs>
            <radialGradient id="serverBoxGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.10" />
            </radialGradient>
            <radialGradient id="receiverBoxGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
            </radialGradient>
            <filter id="ballShadowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>

          {/* Outer Boundary Frame (800x400: inner 740x350 from 30,25) */}
          <rect
            x="30"
            y="25"
            width="740"
            height="350"
            fill="none"
            stroke={contrastLinesColor}
            strokeWidth="5"
          />

          {/* Kitchen / Non-Volley Lines: Left at 310, Right at 490 */}
          <line x1="310" y1="25" x2="310" y2="375" stroke={contrastLinesColor} strokeWidth="4" />
          <line x1="490" y1="25" x2="490" y2="375" stroke={contrastLinesColor} strokeWidth="4" />

          {/* Non-Volley Center Shading */}
          <rect x="312" y="27" width="176" height="346" fill="rgba(0, 0, 0, 0.12)" />

          {/* Center Dividing Service Lines */}
          <line x1="30" y1="200" x2="310" y2="200" stroke={contrastLinesColor} strokeWidth="4" />
          <line x1="490" y1="200" x2="770" y2="200" stroke={contrastLinesColor} strokeWidth="4" />

          {/* Badminton Tramlines & Long Baselines */}
          {courtState.sport === 'badminton' && (
            <>
              <line x1="30" y1="55" x2="770" y2="55" stroke={contrastLinesColor} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.85" />
              <line x1="30" y1="345" x2="770" y2="345" stroke={contrastLinesColor} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.85" />
              <line x1="65" y1="25" x2="65" y2="375" stroke={contrastLinesColor} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.85" />
              <line x1="735" y1="25" x2="735" y2="375" stroke={contrastLinesColor} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.85" />
            </>
          )}

          {/* Active Server Box Highlight */}
          <rect
            x={activeServerBox.x + 2}
            y={activeServerBox.y + 2}
            width={activeServerBox.width - 4}
            height={activeServerBox.height - 4}
            fill="url(#serverBoxGlow)"
            stroke="#10b981"
            strokeWidth="2.8"
            strokeDasharray="8 4"
            style={{ transition: 'all 0.4s ease' }}
          />

          {/* Diagonal Receiver Target Box Highlight */}
          <rect
            x={activeReceiverBox.x + 2}
            y={activeReceiverBox.y + 2}
            width={activeReceiverBox.width - 4}
            height={activeReceiverBox.height - 4}
            fill="url(#receiverBoxGlow)"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            style={{ transition: 'all 0.4s ease' }}
          />

          {/* Center Net (Dashed white bar with posts) */}
          <line x1="400" y1="18" x2="400" y2="382" stroke="#ffffff" strokeWidth="6" strokeDasharray="8 4" />
          <circle cx="400" cy="20" r="6" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          <circle cx="400" cy="380" r="6" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />

          {/* ── IMPACT RIPPLE ON BALL LANDING ── */}
          {impactRipple && (
            <circle
              cx={impactRipple.x}
              cy={impactRipple.y}
              r="22"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ animation: 'rippleOut 0.5s ease-out forwards' }}
            />
          )}

          {/* ── PLAYER RACKETS / PADDLES WITH SWING MOTION ── */}
          {/* Left Top Player */}
          <g
            transform={`translate(${60 + racketSwings.LEFT_TOP * 0.1}, 115) rotate(${-25 + racketSwings.LEFT_TOP})`}
            style={{ transition: 'transform 0.18s ease' }}
          >
            {courtState.sport === 'badminton' ? (
              <>
                <ellipse cx="0" cy="0" rx="10" ry="14" fill="none" stroke="#ffffff" strokeWidth="2.2" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="14" x2="0" y2="34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="0" y1="26" x2="0" y2="34" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <rect x="-11" y="-15" width="22" height="30" rx="6" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="0" y1="15" x2="0" y2="30" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
              </>
            )}
            {/* Server Glowing Halo */}
            {(courtState.serveState?.servingBoxName === 'top-left' || (!courtState.serveState && courtState.teamSides[courtState.servingTeam] === 'LEFT' && courtState.serverBox === 'LEFT')) && (
              <circle cx="0" cy="0" r="22" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" style={{ animation: 'shuttleHover 2s infinite' }} />
            )}
          </g>

          {/* Left Bottom Player */}
          <g
            transform={`translate(${60 + racketSwings.LEFT_BOTTOM * 0.1}, 285) rotate(${-25 + racketSwings.LEFT_BOTTOM})`}
            style={{ transition: 'transform 0.18s ease' }}
          >
            {courtState.sport === 'badminton' ? (
              <>
                <ellipse cx="0" cy="0" rx="10" ry="14" fill="none" stroke="#ffffff" strokeWidth="2.2" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="14" x2="0" y2="34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="0" y1="26" x2="0" y2="34" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <rect x="-11" y="-15" width="22" height="30" rx="6" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="0" y1="15" x2="0" y2="30" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
              </>
            )}
            {/* Server Glowing Halo */}
            {(courtState.serveState?.servingBoxName === 'bottom-left' || (!courtState.serveState && courtState.teamSides[courtState.servingTeam] === 'LEFT' && courtState.serverBox === 'RIGHT')) && (
              <circle cx="0" cy="0" r="22" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" style={{ animation: 'shuttleHover 2s infinite' }} />
            )}
          </g>

          {/* Right Top Player */}
          <g
            transform={`translate(${740 + racketSwings.RIGHT_TOP * 0.1}, 115) rotate(${25 + racketSwings.RIGHT_TOP})`}
            style={{ transition: 'transform 0.18s ease' }}
          >
            {courtState.sport === 'badminton' ? (
              <>
                <ellipse cx="0" cy="0" rx="10" ry="14" fill="none" stroke="#ffffff" strokeWidth="2.2" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="14" x2="0" y2="34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="0" y1="26" x2="0" y2="34" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <rect x="-11" y="-15" width="22" height="30" rx="6" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="0" y1="15" x2="0" y2="30" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
              </>
            )}
            {/* Server Glowing Halo */}
            {(courtState.serveState?.servingBoxName === 'top-right' || (!courtState.serveState && courtState.teamSides[courtState.servingTeam] === 'RIGHT' && courtState.serverBox === 'RIGHT')) && (
              <circle cx="0" cy="0" r="22" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" style={{ animation: 'shuttleHover 2s infinite' }} />
            )}
          </g>

          {/* Right Bottom Player */}
          <g
            transform={`translate(${740 + racketSwings.RIGHT_BOTTOM * 0.1}, 285) rotate(${25 + racketSwings.RIGHT_BOTTOM})`}
            style={{ transition: 'transform 0.18s ease' }}
          >
            {courtState.sport === 'badminton' ? (
              <>
                <ellipse cx="0" cy="0" rx="10" ry="14" fill="none" stroke="#ffffff" strokeWidth="2.2" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <line x1="0" y1="14" x2="0" y2="34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="0" y1="26" x2="0" y2="34" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <rect x="-11" y="-15" width="22" height="30" rx="6" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="0" y1="15" x2="0" y2="30" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
              </>
            )}
            {/* Server Glowing Halo */}
            {(courtState.serveState?.servingBoxName === 'bottom-right' || (!courtState.serveState && courtState.teamSides[courtState.servingTeam] === 'RIGHT' && courtState.serverBox === 'LEFT')) && (
              <circle cx="0" cy="0" r="22" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" style={{ animation: 'shuttleHover 2s infinite' }} />
            )}
          </g>

        </svg>

        {/* ── 60FPS HARDWARE-ACCELERATED BALL & SHADOW LAYER (translate3d) ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            overflow: 'visible'
          }}
        >
          {/* Dynamic Ground Elevation Shadow */}
          <div
            ref={shadowRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '26px',
              height: '12px',
              marginLeft: '-13px',
              marginTop: '-6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              filter: 'blur(3px)',
              willChange: 'transform, opacity'
            }}
          />

          {/* Flying Ball / Shuttlecock with 3D transform */}
          <div
            ref={ballRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '28px',
              height: '28px',
              marginLeft: '-14px',
              marginTop: '-14px',
              willChange: 'transform',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {courtState.sport === 'badminton' ? (
              <svg width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="13" fill="rgba(34, 211, 238, 0.3)" />
                <polygon points="14,4 7,20 21,20" fill="rgba(255,255,255,0.95)" stroke="#cbd5e1" strokeWidth="0.8" />
                <line x1="10" y1="20" x2="13" y2="4" stroke="#94a3b8" strokeWidth="0.7" />
                <line x1="14" y1="20" x2="14" y2="4" stroke="#94a3b8" strokeWidth="0.7" />
                <line x1="18" y1="20" x2="15" y2="4" stroke="#94a3b8" strokeWidth="0.7" />
                <circle cx="14" cy="6" r="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
                <ellipse cx="14" cy="7" rx="4" ry="2.5" fill="#e2e8f0" />
              </svg>
            ) : courtState.sport === 'tennis' ? (
              <svg width="26" height="26" viewBox="0 0 26 26">
                <circle cx="13" cy="13" r="12" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1.2" />
                <path d="M 4 8 C 10 10, 10 16, 4 18" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.9" />
                <path d="M 22 8 C 16 10, 16 16, 22 18" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.9" />
              </svg>
            ) : courtState.sport === 'tabletennis' ? (
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="10" fill="#f97316" stroke="#c2410c" strokeWidth="1.2" />
                <circle cx="8" cy="8" r="3" fill="rgba(255,255,255,0.4)" />
              </svg>
            ) : (
              /* Vector Pickleball Wiffle Ball */
              <svg width="26" height="26" viewBox="0 0 26 26">
                <circle cx="13" cy="13" r="13" fill="rgba(250, 204, 21, 0.35)" />
                <circle cx="13" cy="13" r="10.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="9.5" cy="9.5" r="1.6" fill="#854d0e" />
                <circle cx="16.5" cy="9.5" r="1.6" fill="#854d0e" />
                <circle cx="9.5" cy="16.5" r="1.6" fill="#854d0e" />
                <circle cx="16.5" cy="16.5" r="1.6" fill="#854d0e" />
                <circle cx="13" cy="13" r="1.6" fill="#854d0e" />
              </svg>
            )}
          </div>
        </div>

        {/* ── COURT MIDDLE STRIP ADVERTISEMENTS (Zones beside the center net) ── */}
        {resolvedMiddleAds.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 4,
              overflow: 'hidden'
            }}
          >
            {/* Left Middle Strip (x=312 to 392, between non-volley line and net) */}
            <div
              style={{
                position: 'absolute',
                left: '39.2%',
                top: '16%',
                width: '9.8%',
                height: '68%',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
            >
              {(() => {
                const ad = resolvedMiddleAds[activeMiddleAdIndex % resolvedMiddleAds.length];
                if (!ad) return null;
                const card = (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(15, 23, 42, 0.76)',
                      backdropFilter: 'blur(5px)',
                      WebkitBackdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      borderRadius: '8px',
                      padding: 'clamp(2px, 0.5vw, 5px)',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      transition: 'opacity 0.4s ease'
                    }}
                  >
                    {(ad.imageUrl || ad.image_url) && (
                      <img
                        src={ad.imageUrl || ad.image_url}
                        alt={ad.title || 'Sponsor'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '62%',
                          objectFit: ad.imageFit || 'cover',
                          borderRadius: '4px',
                          marginBottom: '3px',
                          display: 'block'
                        }}
                        loading="eager"
                      />
                    )}
                    <div style={{
                      fontSize: 'clamp(0.48rem, 1vw, 0.65rem)',
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      width: '100%',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}>
                      {ad.title}
                    </div>
                    {ad.description && (
                      <div style={{
                        fontSize: 'clamp(0.4rem, 0.85vw, 0.54rem)',
                        color: '#94a3b8',
                        lineHeight: 1.1,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                      }}>
                        {ad.description}
                      </div>
                    )}
                  </div>
                );
                const linkTarget = ad.linkUrl || ad.link_url || ad.clickUrl || ad.click_url;
                return linkTarget ? (
                  <a href={linkTarget} target="_blank" rel="noopener noreferrer" style={{ width: '100%', height: '100%', textDecoration: 'none', display: 'block' }}>
                    {card}
                  </a>
                ) : card;
              })()}
            </div>

            {/* Right Middle Strip (x=408 to 488, between net and non-volley line) */}
            <div
              style={{
                position: 'absolute',
                left: '51.0%',
                top: '16%',
                width: '9.8%',
                height: '68%',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
            >
              {(() => {
                const ad = resolvedMiddleAds.length > 1
                  ? resolvedMiddleAds[(activeMiddleAdIndex + 1) % resolvedMiddleAds.length]
                  : resolvedMiddleAds[0];
                if (!ad) return null;
                const card = (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(15, 23, 42, 0.76)',
                      backdropFilter: 'blur(5px)',
                      WebkitBackdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      borderRadius: '8px',
                      padding: 'clamp(2px, 0.5vw, 5px)',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      transition: 'opacity 0.4s ease'
                    }}
                  >
                    {(ad.imageUrl || ad.image_url) && (
                      <img
                        src={ad.imageUrl || ad.image_url}
                        alt={ad.title || 'Sponsor'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '62%',
                          objectFit: ad.imageFit || 'cover',
                          borderRadius: '4px',
                          marginBottom: '3px',
                          display: 'block'
                        }}
                        loading="eager"
                      />
                    )}
                    <div style={{
                      fontSize: 'clamp(0.48rem, 1vw, 0.65rem)',
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      width: '100%',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}>
                      {ad.title}
                    </div>
                    {ad.description && (
                      <div style={{
                        fontSize: 'clamp(0.4rem, 0.85vw, 0.54rem)',
                        color: '#94a3b8',
                        lineHeight: 1.1,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                      }}>
                        {ad.description}
                      </div>
                    )}
                  </div>
                );
                const linkTarget = ad.linkUrl || ad.link_url || ad.clickUrl || ad.click_url;
                return linkTarget ? (
                  <a href={linkTarget} target="_blank" rel="noopener noreferrer" style={{ width: '100%', height: '100%', textDecoration: 'none', display: 'block' }}>
                    {card}
                  </a>
                ) : card;
              })()}
            </div>
          </div>
        )}

        {/* ── ON-COURT SCORE & TEAM DISPLAY (Viewer mode & Court Sports) ── */}
        {(variant === 'viewer' || showScoreOnCourt) && (() => {
          const leftTeam = courtState.leftTeam || (courtState.teamSides.teamA === 'LEFT' ? courtState.teamA : courtState.teamB);
          const rightTeam = courtState.rightTeam || (courtState.teamSides.teamA === 'LEFT' ? courtState.teamB : courtState.teamA);

          const leftTeamName = leftTeam?.name || 'Team A';
          const rightTeamName = rightTeam?.name || 'Team B';

          const leftScore = leftTeam?.score !== undefined ? leftTeam.score : (courtState.leftScore ?? 0);
          const rightScore = rightTeam?.score !== undefined ? rightTeam.score : (courtState.rightScore ?? 0);

          const leftIsServing = courtState.leftIsServing !== undefined ? courtState.leftIsServing : (courtState.servingTeamSide === 'LEFT');
          const rightIsServing = !leftIsServing;

          const isPb = courtState.sport === 'pickleball';
          const pbServerNum = courtState.serverNumber || 1;

          // Game History formatted cleanly (e.g. "G1 21-18", "G2 21-19")
          let gameHistoryText = '';
          const gScores = unifiedMatch.sport_state?.gameScores || unifiedMatch.score?.details?.gameScores;
          if (Array.isArray(gScores) && gScores.length > 0) {
            const curIdx = Math.max(0, (courtState.currentGame || 1) - 1);
            const prevGames = gScores.filter((g, i) => i < curIdx && (g.winner || g.teamA > 0 || g.teamB > 0));
            if (prevGames.length > 0) {
              gameHistoryText = prevGames.map((g, i) => `G${g.game || i + 1} ${g.teamA}-${g.teamB}`).join(', ');
            }
          }

          const renderLineup = (team) => {
            const players = team?.players || [];
            if (!players || players.length === 0) {
              return (
                <span style={{ fontSize: 'clamp(0.55rem, 1.1vw, 0.72rem)', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>
                  Lineup not set
                </span>
              );
            }
            if (courtState.isSingles || players.length === 1) {
              return (
                <span style={{ fontSize: 'clamp(0.58rem, 1.2vw, 0.76rem)', color: '#e2e8f0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'clamp(85px, 20vw, 150px)' }}>
                  {players[0]}
                </span>
              );
            }
            return (
              <span style={{ fontSize: 'clamp(0.58rem, 1.2vw, 0.76rem)', color: '#e2e8f0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'clamp(85px, 20vw, 150px)' }}>
                {players[0]} &amp; {players[1]}
              </span>
            );
          };

          return (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 6,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: 'clamp(6px, 1.8vw, 16px)',
                boxSizing: 'border-box'
              }}
            >
              {/* Center Top Game / Set Info Pill */}
              <div
                style={{
                  position: 'absolute',
                  top: 'clamp(6px, 1.6vw, 12px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '20px',
                  padding: 'clamp(2px, 0.5vw, 4px) clamp(8px, 1.8vw, 14px)',
                  fontSize: 'clamp(0.6rem, 1.3vw, 0.78rem)',
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>GAME {courtState.currentGame || 1}</span>
                {gameHistoryText && (
                  <span style={{ opacity: 0.85, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
                    {gameHistoryText}
                  </span>
                )}
              </div>

              {/* Left Court Half Overlay */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  padding: 'clamp(4px, 1.2vw, 10px)',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top: Team Name Pill, SERVE/RECEIVE Badge & Players */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    maxWidth: '94%',
                    background: 'rgba(15, 23, 42, 0.76)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: `1px solid ${leftIsServing ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.12)'}`,
                    padding: 'clamp(3px, 0.8vw, 5px) clamp(8px, 1.4vw, 12px)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                    alignSelf: 'center',
                    marginTop: 'clamp(18px, 3.5vw, 24px)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 'clamp(0.68rem, 1.8vw, 0.95rem)',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 'clamp(70px, 18vw, 130px)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                      }}
                      title={leftTeamName}
                    >
                      {leftTeamName}
                    </span>
                    {leftIsServing ? (
                      <span
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: 'clamp(0.55rem, 1.1vw, 0.7rem)',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        SERVE{isPb ? ` • #${pbServerNum}` : ''}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: '#94a3b8',
                          fontSize: 'clamp(0.52rem, 1vw, 0.65rem)',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '5px',
                          textTransform: 'uppercase'
                        }}
                      >
                        RECEIVE
                      </span>
                    )}
                  </div>
                  {renderLineup(leftTeam)}
                </div>

                {/* Center: Large Bold Score */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -46%)',
                    fontWeight: 950,
                    fontSize: 'clamp(2.6rem, 8.5vw, 5rem)',
                    lineHeight: 1,
                    color: '#ffffff',
                    textShadow: '0 4px 18px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 0, 0, 0.5)',
                    letterSpacing: '-0.02em',
                    transition: 'transform 0.18s ease-out'
                  }}
                >
                  {leftScore}
                </div>

                <div style={{ height: '14px' }} />
              </div>

              {/* Right Court Half Overlay */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  padding: 'clamp(4px, 1.2vw, 10px)',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top: Team Name Pill, SERVE/RECEIVE Badge & Players */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    maxWidth: '94%',
                    background: 'rgba(15, 23, 42, 0.76)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: `1px solid ${rightIsServing ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.12)'}`,
                    padding: 'clamp(3px, 0.8vw, 5px) clamp(8px, 1.4vw, 12px)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                    alignSelf: 'center',
                    marginTop: 'clamp(18px, 3.5vw, 24px)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 'clamp(0.68rem, 1.8vw, 0.95rem)',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 'clamp(70px, 18vw, 130px)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                      }}
                      title={rightTeamName}
                    >
                      {rightTeamName}
                    </span>
                    {rightIsServing ? (
                      <span
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: 'clamp(0.55rem, 1.1vw, 0.7rem)',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        SERVE{isPb ? ` • #${pbServerNum}` : ''}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: '#94a3b8',
                          fontSize: 'clamp(0.52rem, 1vw, 0.65rem)',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '5px',
                          textTransform: 'uppercase'
                        }}
                      >
                        RECEIVE
                      </span>
                    )}
                  </div>
                  {renderLineup(rightTeam)}
                </div>

                {/* Center: Large Bold Score */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -46%)',
                    fontWeight: 950,
                    fontSize: 'clamp(2.6rem, 8.5vw, 5rem)',
                    lineHeight: 1,
                    color: '#ffffff',
                    textShadow: '0 4px 18px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 0, 0, 0.5)',
                    letterSpacing: '-0.02em',
                    transition: 'transform 0.18s ease-out'
                  }}
                >
                  {rightScore}
                </div>

                <div style={{ height: '14px' }} />
              </div>
            </div>
          );
        })()}

        {/* Optional Team Labels inside court corners if requested */}
        {showTeamLabels && (
          <>
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '12px',
              fontSize: '0.75rem',
              fontWeight: 900,
              color: '#ffffff',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '6px',
              zIndex: 4
            }}>
              {courtState.teamSides.teamA === 'LEFT' ? courtState.teamA.name : courtState.teamB.name}
              {courtState.servingTeam === (courtState.teamSides.teamA === 'LEFT' ? 'teamA' : 'teamB') && ' 🏸 SERVE'}
            </div>
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              fontSize: '0.75rem',
              fontWeight: 900,
              color: '#ffffff',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '6px',
              zIndex: 4
            }}>
              {courtState.teamSides.teamB === 'RIGHT' ? courtState.teamB.name : courtState.teamA.name}
              {courtState.servingTeam === (courtState.teamSides.teamB === 'RIGHT' ? 'teamB' : 'teamA') && ' 🏸 SERVE'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
