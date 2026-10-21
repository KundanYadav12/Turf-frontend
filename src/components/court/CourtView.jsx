'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trophy, Palette, RotateCcw, Check, Sparkles, Undo2 } from 'lucide-react';
import { getServeState, getCourtState, parseRacquetScoreDetails, getCourtContrastColor } from './courtUtils';

export { getServeState, getCourtState, parseRacquetScoreDetails, getCourtContrastColor };

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
  servingSide: propServingSide = null,
  serverCourt: propServerCourt = null,
  serverNumber: propServerNumber = 1,
  courtColor: initialCourtColor = '#0d5c3a',
  courtAds = DEFAULT_ADS,
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
  lastEventType = null,
  eventSeq = null,
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
        _lastEventType: lastEventType || match._lastEventType,
        _eventSeq: eventSeq || match._eventSeq
      };
    }
    return {
      serveState: propServeState,
      sportSlug: sport,
      matchFormat: format,
      teamA,
      teamB,
      lineup,
      live_score_summary: scoreSummary,
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
      _lastEventType: lastEventType,
      _eventSeq: eventSeq
    };
  }, [
    match, propServeState, sport, format,
    teamA?.id, teamA?.name, teamA?.score,
    teamB?.id, teamB?.name, teamB?.score,
    lineup, scoreSummary,
    propServingSide, propServerCourt, propServerNumber,
    initialCourtColor, courtAds?.length, lastEventType, eventSeq,
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

  // References for monotonic queue and timing
  const prevCourtRef = useRef(courtState);
  const isInitialMount = useRef(true);
  const choreographyTimerRef = useRef(null);
  const ambientTimerRef = useRef(null);
  const lastEventTimestampRef = useRef(Date.now());
  const isChoreographingRef = useRef(false);

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

  // ── 4. EVENT-TO-CHOREOGRAPHY PIPELINE ──
  useEffect(() => {
    // Initial mount: authoritative ballState already initialized in useState
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

    // Cancel active timers
    if (choreographyTimerRef.current) clearTimeout(choreographyTimerRef.current);
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    lastEventTimestampRef.current = Date.now();

    // ── SCENARIO A: AUTHORITATIVE UNDO ──
    if (isUndo) {
      isChoreographingRef.current = false;
      setUndoActive(true);
      setScoringGlow(null);
      setScorePop(false);
      setFloatingPlusOne(null);
      setCelebrationActive(false);
      setImpactRipple(null);

      // Smooth reverse glide of ball to the restored server's racket
      setBallState({
        x: courtState.defaultBallCoords.x,
        y: courtState.defaultBallCoords.y,
        elevation: 0,
        rotation: courtState.teamSides[courtState.servingTeam] === 'LEFT' ? 35 : -145,
        trail: []
      });

      choreographyTimerRef.current = setTimeout(() => {
        setUndoActive(false);
      }, 700);

      prevCourtRef.current = courtState;
      return;
    }

    // ── SCENARIO B: FORWARD POINT CHOREOGRAPHY ──
    if (isScoreChanged) {
      isChoreographingRef.current = true;
      const scoringTeam = courtState.scoreA > prev.scoreA ? 'teamA' : 'teamB';
      const isTeamALeading = courtState.scoreA > courtState.scoreB;
      const isWinner = courtState.isMatchWon || courtState.winner;

      if (prefersReducedMotion) {
        // Reduced motion: instant snap without heavy transitions
        setBallState({
          x: courtState.defaultBallCoords.x,
          y: courtState.defaultBallCoords.y,
          elevation: 0,
          rotation: courtState.teamSides[courtState.servingTeam] === 'LEFT' ? 35 : -145,
          trail: []
        });
        setScoringGlow(scoringTeam);
        setScorePop(true);
        setTimeout(() => {
          setScoringGlow(null);
          setScorePop(false);
        }, 600);
        prevCourtRef.current = courtState;
        return;
      }

      // Calculate Deterministic Rally Waypoints
      // Start at previous server
      const prevServerSide = prev.teamSides?.[prev.servingTeam] || 'LEFT';
      const prevServerBox = prev.serverBox || 'RIGHT';
      const startX = prevServerSide === 'LEFT' ? 101 : 699;
      const startY = prevServerBox === 'RIGHT' ? 285 : 115;
      const startSlot = `${prevServerSide}_${prevServerBox}`;

      // Target diagonal receiver
      const prevReceiverSide = prevServerSide === 'LEFT' ? 'RIGHT' : 'LEFT';
      const prevReceiverBox = prev.receiverBox || 'RIGHT';
      const recX = prevReceiverSide === 'LEFT' ? 120 : 680;
      const recY = prevReceiverBox === 'RIGHT' ? 285 : 115;
      const recSlot = `${prevReceiverSide}_${prevReceiverBox}`;

      // Final landing spot in losing side's court
      const losingSide = scoringTeam === 'teamA' ? courtState.teamSides.teamB : courtState.teamSides.teamA;
      const landX = losingSide === 'LEFT' ? 180 : 620;
      const landY = (courtState.scoreA + courtState.scoreB) % 2 === 0 ? 270 : 130;

      // Deterministic exchange count (2 to 4 shots) based on score seed
      const seed = courtState.scoreA * 7 + courtState.scoreB * 13;
      const exchanges = (seed % 3) + 2;

      // Timeline Sequence:
      // Phase 1 (0ms): Serve swing
      triggerSwing(startSlot, prevServerSide === 'LEFT' ? 38 : -38);

      // Phase 1.5 (100ms - 550ms): Flight to receiver
      setTimeout(() => {
        setBallState({
          x: recX,
          y: recY,
          elevation: 35,
          rotation: prevServerSide === 'LEFT' ? 40 : -140,
          trail: [{ x: startX, y: startY }]
        });
      }, 100);

      // Phase 2 (600ms): Receiver return
      setTimeout(() => {
        triggerSwing(recSlot, prevReceiverSide === 'LEFT' ? 38 : -38);
        triggerRipple(recX, recY);

        if (exchanges === 2) {
          // Direct shot to winning point landing
          setBallState({
            x: landX,
            y: landY,
            elevation: 20,
            rotation: prevReceiverSide === 'LEFT' ? 40 : -140,
            trail: [{ x: recX, y: recY }]
          });
        } else {
          // Additional mid-rally exchange across net
          const midX = prevServerSide === 'LEFT' ? 200 : 600;
          const midY = 200;
          setBallState({
            x: midX,
            y: midY,
            elevation: 40,
            rotation: prevReceiverSide === 'LEFT' ? 40 : -140,
            trail: [{ x: recX, y: recY }]
          });
        }
      }, 620);

      // Phase 3 (1250ms): Final Winner / Fault Landing
      setTimeout(() => {
        setBallState({
          x: landX,
          y: landY,
          elevation: 0,
          rotation: losingSide === 'LEFT' ? -150 : 30,
          trail: []
        });
        triggerRipple(landX, landY);

        // Point scored celebrations
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
      }, 1250);

      // Phase 4 (1950ms): Settle & Serve Handover
      choreographyTimerRef.current = setTimeout(() => {
        setScorePop(false);
        setFloatingPlusOne(null);
        setScoringGlow(null);
        isChoreographingRef.current = false;

        // Reset ball to the new authoritative server's racket
        setBallState({
          x: courtState.defaultBallCoords.x,
          y: courtState.defaultBallCoords.y,
          elevation: 0,
          rotation: courtState.teamSides[courtState.servingTeam] === 'LEFT' ? 35 : -145,
          trail: []
        });
      }, 2050);

      prevCourtRef.current = courtState;
      return;
    }

    // ── SCENARIO C: SERVER / END CHANGE WITHOUT SCORE ──
    const prevServingSide = prev.teamSides?.[prev.servingTeam];
    const currServingSide = courtState.teamSides?.[courtState.servingTeam];
    const prevCoords = prev.defaultBallCoords;
    const currCoords = courtState.defaultBallCoords;

    const isPositionChanged = (
      prev.servingTeam !== courtState.servingTeam ||
      prev.serverBox !== courtState.serverBox ||
      prevServingSide !== currServingSide ||
      prevCoords?.x !== currCoords?.x ||
      prevCoords?.y !== currCoords?.y
    );

    prevCourtRef.current = courtState;

    if (!isPositionChanged) {
      return;
    }

    const targetRotation = currServingSide === 'LEFT' ? 35 : -145;
    setBallState(curr => {
      if (
        curr.x === currCoords.x &&
        curr.y === currCoords.y &&
        curr.elevation === 0 &&
        curr.rotation === targetRotation &&
        (!curr.trail || curr.trail.length === 0)
      ) {
        return curr;
      }
      return {
        x: currCoords.x,
        y: currCoords.y,
        elevation: 0,
        rotation: targetRotation,
        trail: []
      };
    });

    return () => {
      if (choreographyTimerRef.current) clearTimeout(choreographyTimerRef.current);
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    };
  }, [courtState, unifiedMatch._lastEventType, prefersReducedMotion, triggerRipple, triggerSwing]);

  // ── 5. AMBIENT IDLE RALLY LOOP ──
  // Decorative, slow background motion between points. Stops immediately on real live events.
  const ballCoordsRef = useRef(ballState);
  ballCoordsRef.current = ballState;

  useEffect(() => {
    if (!ambientRally || !isTabVisible || courtState.status !== 'LIVE' || courtState.isMatchWon) {
      return;
    }

    const ambientInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimestampRef.current;
      if (timeSinceLastEvent > 4500 && !isChoreographingRef.current && !undoActive) {
        // Play a gentle, slow decorative pass across the net
        const currentSide = (ballCoordsRef.current?.x || 0) < 400 ? 'LEFT' : 'RIGHT';
        const targetX = currentSide === 'LEFT' ? 680 : 120;
        const targetY = (Date.now() % 2 === 0) ? 275 : 125;

        setBallState(prev => ({
          ...prev,
          x: targetX,
          y: targetY,
          elevation: 25,
          rotation: currentSide === 'LEFT' ? 40 : -140
        }));

        // Settle back to server after 2 seconds
        setTimeout(() => {
          if (!isChoreographingRef.current && !undoActive) {
            setBallState({
              x: courtState.defaultBallCoords.x,
              y: courtState.defaultBallCoords.y,
              elevation: 0,
              rotation: courtState.teamSides[courtState.servingTeam] === 'LEFT' ? 35 : -145,
              trail: []
            });
          }
        }, 2100);
      }
    }, 5000);

    return () => {
      clearInterval(ambientInterval);
    };
  }, [
    ambientRally,
    isTabVisible,
    courtState.status,
    courtState.isMatchWon,
    courtState.defaultBallCoords?.x,
    courtState.defaultBallCoords?.y,
    courtState.servingTeam,
    undoActive
  ]);

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
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.4rem'
        }}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Palette size={13} color={courtColor} />
            <span>Court Color</span>
          </button>
        </div>
      )}

      {/* Court Canvas Area with 800:400 (2:1) aspect ratio */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '2 / 1',
        borderRadius: '16px',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 50%, ${courtColor}ee 0%, ${courtColor} 100%)`,
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 12px 30px rgba(0,0,0,0.35)',
        border: '3px solid rgba(255,255,255,0.12)'
      }}>

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

        {/* Undo Cue */}
        {undoActive && (
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

          {/* ── PARABOLIC SURFACE SHADOW ── */}
          <ellipse
            cx={ballState.x}
            cy={ballState.y + 12 + ballState.elevation * 0.4}
            rx={Math.max(4, 12 - ballState.elevation * 0.15)}
            ry={Math.max(2, 6 - ballState.elevation * 0.08)}
            fill="rgba(0, 0, 0, 0.35)"
            filter="url(#ballShadowFilter)"
            style={{
              transition: undoActive
                ? 'all 0.35s ease'
                : 'all 0.52s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* ── SHUTTLECOCK / WIFFLE BALL IN FLIGHT ── */}
          <g
            transform={`translate(${ballState.x}, ${ballState.y - ballState.elevation * 0.7})`}
            style={{
              transition: undoActive
                ? 'transform 0.35s ease-out'
                : 'transform 0.52s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          >
            {courtState.sport === 'badminton' ? (
              /* Vector Badminton Shuttlecock */
              <g transform={`rotate(${ballState.rotation}) scale(${1 + ballState.elevation * 0.008})`}>
                <circle cx="0" cy="0" r="14" fill="rgba(34, 211, 238, 0.35)" />
                <polygon points="0,0 -8,-16 8,-16" fill="rgba(255,255,255,0.95)" stroke="#cbd5e1" strokeWidth="0.8" />
                <line x1="-4" y1="-16" x2="-1" y2="0" stroke="#94a3b8" strokeWidth="0.7" />
                <line x1="0" y1="-16" x2="0" y2="0" stroke="#94a3b8" strokeWidth="0.7" />
                <line x1="4" y1="-16" x2="1" y2="0" stroke="#94a3b8" strokeWidth="0.7" />
                <circle cx="0" cy="2" r="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
                <ellipse cx="0" cy="3" rx="4" ry="2.5" fill="#e2e8f0" />
              </g>
            ) : (
              /* Vector Pickleball Wiffle Ball */
              <g transform={`scale(${1 + ballState.elevation * 0.008})`}>
                <circle cx="0" cy="0" r="15" fill="rgba(250, 204, 21, 0.4)" />
                <circle cx="0" cy="0" r="11" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="-3" cy="-3" r="1.6" fill="#854d0e" />
                <circle cx="3" cy="-3" r="1.6" fill="#854d0e" />
                <circle cx="-3" cy="3" r="1.6" fill="#854d0e" />
                <circle cx="3" cy="3" r="1.6" fill="#854d0e" />
              </g>
            )}
          </g>
        </svg>

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
