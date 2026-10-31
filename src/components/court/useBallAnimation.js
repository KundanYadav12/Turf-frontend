import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../services/socket';

/**
 * Sport-Specific Motion Configuration
 */
export const BALL_MOTION = {
  badminton:   { flightMs: 450, arcHeight: 40, easing: 'ease-out', rotate: true },
  pickleball:  { flightMs: 700, arcHeight: 25, easing: 'ease-in-out', rotate: false },
  tennis:      { flightMs: 800, arcHeight: 35, easing: 'ease-in-out', rotate: false },
  tabletennis: { flightMs: 350, arcHeight: 15, easing: 'linear', rotate: false },
  default:     { flightMs: 600, arcHeight: 25, easing: 'ease-in-out', rotate: false }
};

/**
 * Percentage Coordinates for Court Service Boxes (Relative to 800x400 Court Container)
 * Top-left: x=12.5%, y=28.75% | Bottom-left: x=12.5%, y=71.25%
 * Top-right: x=87.5%, y=28.75% | Bottom-right: x=87.5%, y=71.25%
 */
export const BOX_PERCENTAGES = {
  'bottom-left': { x: 12.5, y: 71.25 },
  'top-left':    { x: 12.5, y: 28.75 },
  'top-right':   { x: 87.5, y: 28.75 },
  'bottom-right':{ x: 87.5, y: 71.25 }
};

/**
 * Diagonal Cross-Court Receiver Box Target Landing Percentages
 */
export const RECEIVER_TARGET_PERCENTAGES = {
  'top-right':   { x: 74.0, y: 28.75 },
  'bottom-right':{ x: 74.0, y: 71.25 },
  'top-left':    { x: 26.0, y: 28.75 },
  'bottom-left': { x: 26.0, y: 71.25 }
};

/**
 * Easing Evaluation Functions
 */
function evaluateEasing(t, easing) {
  switch (easing) {
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'linear':
      return t;
    default:
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

/**
 * Shared Hook for Authoritative 60fps Ball & Shuttle Animation across Scorer, TV, and Signage.
 *
 * Guaranteed Behaviors:
 * 1. 60fps GPU acceleration via CSS translate3d + requestAnimationFrame (zero layout reflows).
 * 2. Responsive percentage-based positioning for any viewport / 4K / mobile screen.
 * 3. Parabolic arc elevation with dynamic ground shadow scaling.
 * 4. Continuous left <-> right rally motion during rallies, settling into new server box.
 * 5. Real-time idempotent socket sync with sequence/eventId de-duplication.
 * 6. Rapid-click safety (cancels ongoing flights instantly without stacking).
 * 7. Instant / smooth reverse on Undo.
 * 8. Respects prefers-reduced-motion.
 */
export function useBallAnimation({
  serveState = null,
  sport = 'pickleball',
  containerRef = null,
  pointEvent = null,
  lastEventType = null,
  eventSeq = null,
  matchId = null,
  rallyMode = false,
  ambientRally = true,
  reducedMotion = false,
  onShotLand = null
} = {}) {
  const sportKey = (sport || 'default').toLowerCase().replace(/[^a-z]/g, '');
  const motionConfig = BALL_MOTION[sportKey] || BALL_MOTION.default;

  // DOM node references for direct 60fps transform updates without React state lag
  const ballRef = useRef(null);
  const shadowRef = useRef(null);

  // Animation controller refs
  const rafIdRef = useRef(null);
  const lastProcessedSeqRef = useRef(0);
  const initialMountTimeRef = useRef(Date.now());
  const isAnimatingRef = useRef(false);
  const isRallyModeActiveRef = useRef(rallyMode);
  isRallyModeActiveRef.current = rallyMode;

  // Track current ball position in percentages
  const currentPosRef = useRef({ x: 12.5, y: 71.25, rotation: 35 });
  const [isAnimatingState, setIsAnimatingState] = useState(false);

  // Resolve Box Coordinates Helper
  const getBoxCoords = useCallback((boxName) => {
    if (!boxName) return BOX_PERCENTAGES['bottom-left'];
    return BOX_PERCENTAGES[boxName] || BOX_PERCENTAGES['bottom-left'];
  }, []);

  const getReceiverCoords = useCallback((targetBoxName) => {
    if (!targetBoxName) return RECEIVER_TARGET_PERCENTAGES['top-right'];
    return RECEIVER_TARGET_PERCENTAGES[targetBoxName] || RECEIVER_TARGET_PERCENTAGES['top-right'];
  }, []);

  // Compute container dimensions safely
  const getContainerDimensions = useCallback(() => {
    if (containerRef && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width || 800, height: rect.height || 400 };
    }
    return { width: 800, height: 400 };
  }, [containerRef]);

  // Apply translate3d and shadow transform directly
  const applyTransforms = useCallback((xPct, yPct, arcPx = 0, rotationDeg = 0) => {
    currentPosRef.current = { x: xPct, y: yPct, rotation: rotationDeg };

    const { width, height } = getContainerDimensions();
    const xPx = (xPct / 100) * width;
    const yPx = (yPct / 100) * height;

    const ballYPx = yPx - arcPx;
    const shadowYPx = yPx + 8; // Slight ground offset under ball

    const maxArc = motionConfig.arcHeight || 25;
    const heightRatio = Math.max(0, Math.min(1, arcPx / maxArc));
    const shadowScale = Math.max(0.35, 1 - heightRatio * 0.45);
    const shadowOpacity = Math.max(0.12, 0.45 - heightRatio * 0.25);

    if (ballRef.current) {
      const rot = motionConfig.rotate ? `rotate(${rotationDeg}deg)` : '';
      const scale = `scale(${1 + heightRatio * 0.15})`;
      ballRef.current.style.transform = `translate3d(${xPx}px, ${ballYPx}px, 0) ${scale} ${rot}`.trim();
    }

    if (shadowRef.current) {
      shadowRef.current.style.transform = `translate3d(${xPx}px, ${shadowYPx}px, 0) scale(${shadowScale})`;
      shadowRef.current.style.opacity = `${shadowOpacity}`;
    }
  }, [getContainerDimensions, motionConfig]);

  // Cancel any running animation loop
  const cancelAnimation = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isAnimatingRef.current = false;
    setIsAnimatingState(false);
  }, []);

  /**
   * Deterministic PRNG seeded from matchId and eventSeq.
   * Guarantees Web, Mobile, TV, and Signage all render the exact same rally choreography!
   */
  const createRng = useCallback((seedStr) => {
    let h = 1779033703 ^ String(seedStr).length;
    for (let i = 0; i < String(seedStr).length; i++) {
      h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h >>> 0) / 4294967296);
    };
  }, []);

  /**
   * Pickleball Ground Bounce: A small, snappy rebound arc upon landing in the court.
   */
  const bounceSegment = useCallback((pos, durationMs = 85, bounceHeight = 12) => {
    return new Promise((resolve) => {
      if (reducedMotion) {
        resolve();
        return;
      }
      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, elapsed / durationMs);
        const arc = 4 * bounceHeight * rawT * (1 - rawT);
        applyTransforms(pos.x, pos.y, arc, 0);
        if (rawT < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          applyTransforms(pos.x, pos.y, 0, 0);
          resolve();
        }
      };
      rafIdRef.current = requestAnimationFrame(step);
    });
  }, [reducedMotion, applyTransforms]);

  /**
   * Execute a single parabolic flight segment between two percentage coordinates
   */
  const flySegment = useCallback((startPos, endPos, durationMs, startRot = 0, endRot = 0, customArc = null) => {
    return new Promise((resolve) => {
      if (reducedMotion) {
        applyTransforms(endPos.x, endPos.y, 0, endRot);
        resolve();
        return;
      }

      const startTime = performance.now();
      const maxArc = customArc !== null ? customArc : motionConfig.arcHeight;
      const easingType = motionConfig.easing;

      const step = (now) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, elapsed / durationMs);
        const progress = evaluateEasing(rawT, easingType);

        const currentX = startPos.x + (endPos.x - startPos.x) * progress;
        const currentY = startPos.y + (endPos.y - startPos.y) * progress;
        const arc = 4 * maxArc * rawT * (1 - rawT); // Parabola with peak at t=0.5
        const rot = startRot + (endRot - startRot) * progress;

        applyTransforms(currentX, currentY, arc, rot);

        if (rawT < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          applyTransforms(endPos.x, endPos.y, 0, endRot);
          resolve();
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    });
  }, [reducedMotion, motionConfig, applyTransforms]);

  /**
   * Run authoritatively choreographed Point Scored sequence:
   * 1. 2 to 5 exchanges seeded deterministically from (matchId, eventSeq)
   * 2. Server racket swipe arc & parabolic flight into diagonal box
   * 3. Pickleball bounces once in box; Badminton decelerates and drops steeply
   * 4. Alternating rally exchanges with impact ripples and player nudges
   * 5. Point end lands on correct side per outcome:
   *    - Serving team won -> lands on receiver's side
   *    - Receiver won -> lands on server's side
   * 6. Smooth settle to new server's racket position (<2.2s total duration)
   */
  const playPointRally = useCallback(async (fromBoxName, toBoxName, newServingBoxName, rallyContext = {}) => {
    cancelAnimation();
    isAnimatingRef.current = true;
    setIsAnimatingState(true);

    const fromCoords = getBoxCoords(fromBoxName);
    const receiverCoords = getReceiverCoords(toBoxName);
    const newServerCoords = getBoxCoords(newServingBoxName);

    // Initial position at server racket
    applyTransforms(fromCoords.x, fromCoords.y, 0, fromCoords.x < 50 ? 35 : -145);

    // Deterministic RNG from matchId and sequence number
    const seed = `${matchId || 'match'}_${eventSeq || rallyContext.eventSeq || 1}`;
    const rng = createRng(seed);

    // Determine total exchanges:
    // If serving team won -> odd count (3 or 5), final shot lands on receiver side!
    // If receiving team won -> even count (2 or 4), final shot lands on server side!
    const isServingTeamWinner = rallyContext.isServingTeamWinner !== undefined
      ? rallyContext.isServingTeamWinner
      : (fromCoords.x < 50 ? (rallyContext.scoringTeam !== 'teamB') : (rallyContext.scoringTeam !== 'teamA'));

    let totalShots = isServingTeamWinner
      ? (rng() > 0.65 ? 5 : 3)
      : (rng() > 0.65 ? 4 : 2);

    // Budget total duration under 2.2 seconds
    const totalDurationBudget = Math.min(2100, (sportKey === 'badminton' ? 1750 : 1950));
    const perShotMs = Math.floor(totalDurationBudget / (totalShots + 0.8));

    const isFromLeft = fromCoords.x < 50;
    const isPb = sportKey === 'pickleball';

    let currentPos = fromCoords;
    let currentSide = isFromLeft ? 'left' : 'right';

    // Shot 1: The Serve from Server Box into Diagonal Receiver Box
    const serveAngle = isFromLeft ? 40 : -140;
    const serveArc = motionConfig.arcHeight * (0.85 + rng() * 0.3);

    await flySegment(fromCoords, receiverCoords, perShotMs, serveAngle, serveAngle, serveArc);
    currentPos = receiverCoords;
    currentSide = isFromLeft ? 'right' : 'left';

    if (onShotLand) {
      onShotLand(receiverCoords, { shotIndex: 1, totalShots, isLastShot: totalShots === 1 });
    }

    // Pickleball: bounces once in the box beyond kitchen
    if (isPb) {
      await bounceSegment(receiverCoords, 85, 12);
    }

    // Shots 2 through totalShots: Alternating Rally Exchanges
    for (let shotIdx = 2; shotIdx <= totalShots; shotIdx++) {
      const isNextToLeft = currentSide === 'right';
      const isLast = shotIdx === totalShots;

      // Coordinate on opposite half
      const targetSideX = isNextToLeft ? (18.0 + rng() * 16.0) : (66.0 + rng() * 16.0);
      const targetSideY = 22.0 + rng() * 56.0;
      const nextPos = { x: targetSideX, y: targetSideY };

      const shotAngle = isNextToLeft ? -135 : 45;
      const shotArc = motionConfig.arcHeight * (0.75 + rng() * 0.5);

      await flySegment(currentPos, nextPos, perShotMs * 0.9, shotAngle, shotAngle, shotArc);
      currentPos = nextPos;
      currentSide = isNextToLeft ? 'left' : 'right';

      if (onShotLand) {
        onShotLand(nextPos, { shotIndex: shotIdx, totalShots, isLastShot: isLast });
      }

      // Small bounce on final ground impact if pickleball
      if (isLast && isPb) {
        await bounceSegment(nextPos, 70, 8);
      }
    }

    // Point concluded! Settle ball smoothly to rest at latest authoritative server's racket
    const activeBox = serveStateRef.current?.servingBoxName || newServingBoxName || 'bottom-left';
    const finalServerCoords = getBoxCoords(activeBox);
    const settleDuration = Math.min(380, perShotMs * 0.8);
    const finalRot = finalServerCoords.x < 50 ? 35 : -145;
    await flySegment(currentPos, finalServerCoords, settleDuration, finalRot, finalRot, 15);

    applyTransforms(finalServerCoords.x, finalServerCoords.y, 0, finalRot);
    isAnimatingRef.current = false;
    setIsAnimatingState(false);
  }, [
    cancelAnimation, getBoxCoords, getReceiverCoords, applyTransforms,
    motionConfig, flySegment, bounceSegment, onShotLand, createRng,
    matchId, eventSeq, sportKey
  ]);

  /**
   * Undo Point Handler: Quick snap/glide back to previous server position without long animation
   */
  const playUndoSnap = useCallback(async (targetServingBoxName) => {
    cancelAnimation();
    const targetCoords = getBoxCoords(targetServingBoxName);
    const startPos = currentPosRef.current;

    if (reducedMotion) {
      applyTransforms(targetCoords.x, targetCoords.y, 0, targetCoords.x < 50 ? 35 : -145);
      return;
    }

    isAnimatingRef.current = true;
    setIsAnimatingState(true);

    // Short 200ms quick rewind
    await flySegment(startPos, targetCoords, 200, startPos.rotation, targetCoords.x < 50 ? 35 : -145);
    applyTransforms(targetCoords.x, targetCoords.y, 0, targetCoords.x < 50 ? 35 : -145);

    isAnimatingRef.current = false;
    setIsAnimatingState(false);
  }, [cancelAnimation, getBoxCoords, reducedMotion, applyTransforms, flySegment]);

  // Keep ref synchronized with current serveState
  const serveStateRef = useRef(serveState);
  useEffect(() => {
    serveStateRef.current = serveState;
    if (!isAnimatingRef.current) {
      const currentBox = serveState?.servingBoxName || 'bottom-left';
      const coords = getBoxCoords(currentBox);
      applyTransforms(coords.x, coords.y, 0, coords.x < 50 ? 35 : -145);
    }
  }, [serveState, getBoxCoords, applyTransforms]);

  // Initial Placement on Mount & Resize Observer for Responsiveness
  useEffect(() => {
    const defaultBox = serveState?.servingBoxName || 'bottom-left';
    const initialCoords = getBoxCoords(defaultBox);
    applyTransforms(initialCoords.x, initialCoords.y, 0, initialCoords.x < 50 ? 35 : -145);

    // Watch container size changes (e.g. window resize, fullscreen toggle, layout change)
    if (containerRef && containerRef.current && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (!isAnimatingRef.current) {
          const currentBox = serveStateRef.current?.servingBoxName || serveState?.servingBoxName || 'bottom-left';
          const coords = getBoxCoords(currentBox);
          applyTransforms(coords.x, coords.y, 0, coords.x < 50 ? 35 : -145);
        }
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [containerRef, serveState?.servingBoxName, getBoxCoords, applyTransforms]);

  // Listen to pointEvent prop changes or socket events
  useEffect(() => {
    if (!pointEvent) return;

    // Idempotency: Ignore already processed events
    const seq = pointEvent.seq || pointEvent.eventSeq;
    if (seq && seq <= lastProcessedSeqRef.current) {
      return;
    }

    // Skip animation if event is older than 4 seconds (e.g. on fresh page load or reconnect)
    const eventTime = pointEvent.timestamp || 0;
    const isStale = eventTime && Date.now() - eventTime > 4000;
    if (isStale) {
      if (seq) lastProcessedSeqRef.current = seq;
      const targetBox = serveState?.servingBoxName || 'bottom-left';
      const coords = getBoxCoords(targetBox);
      applyTransforms(coords.x, coords.y, 0, coords.x < 50 ? 35 : -145);
      return;
    }

    if (seq) lastProcessedSeqRef.current = seq;

    if (pointEvent.type === 'UNDO') {
      playUndoSnap(serveState?.servingBoxName || 'bottom-left');
      return;
    }

    if (pointEvent.type === 'POINT_SCORED' || pointEvent.type === 'POINT') {
      const fromBox = pointEvent.from?.boxName || pointEvent.fromBox || serveState?.servingBoxName || 'bottom-left';
      const toBox = pointEvent.to?.boxName || pointEvent.toBox || serveState?.targetBoxName || 'top-right';
      const nextBox = serveState?.servingBoxName || fromBox;

      playPointRally(fromBox, toBox, nextBox);
    }
  }, [pointEvent, serveState?.servingBoxName, serveState?.targetBoxName, getBoxCoords, applyTransforms, playPointRally, playUndoSnap]);

  // Listen for Undo event
  useEffect(() => {
    if (lastEventType === 'UNDO') {
      playUndoSnap(serveState?.servingBoxName || 'bottom-left');
    }
  }, [lastEventType, serveState?.servingBoxName, playUndoSnap]);

  // Real-Time Socket.IO Channel Listener for TV & Signage Sync
  useEffect(() => {
    if (!matchId) return;

    const handleSocketPointScored = (payload) => {
      if (!payload) return;
      const targetMatchId = payload.matchId || payload.id;
      if (targetMatchId && targetMatchId !== matchId) return;

      const seq = payload.seq || payload.eventSeq;
      if (seq && seq <= lastProcessedSeqRef.current) return;

      // Skip animations that happened before page mount
      if (payload.timestamp && payload.timestamp < initialMountTimeRef.current - 1000) {
        return;
      }

      if (seq) lastProcessedSeqRef.current = seq;

      if (payload.type === 'UNDO') {
        playUndoSnap(serveState?.servingBoxName || 'bottom-left');
        return;
      }

      const fromBox = payload.from?.boxName || payload.fromBox || serveState?.servingBoxName || 'bottom-left';
      const toBox = payload.to?.boxName || payload.toBox || serveState?.targetBoxName || 'top-right';
      const nextBox = serveState?.servingBoxName || fromBox;

      playPointRally(fromBox, toBox, nextBox);
    };

    const handleSocketUndo = (payload) => {
      if (!payload) return;
      const targetMatchId = payload.matchId || payload.id;
      if (targetMatchId && targetMatchId !== matchId) return;
      playUndoSnap(serveState?.servingBoxName || 'bottom-left');
    };

    socket.on('match:pointScored', handleSocketPointScored);
    socket.on('signage:pointScored', handleSocketPointScored);
    socket.on('match:undoPoint', handleSocketUndo);

    return () => {
      socket.off('match:pointScored', handleSocketPointScored);
      socket.off('signage:pointScored', handleSocketPointScored);
      socket.off('match:undoPoint', handleSocketUndo);
    };
  }, [matchId, serveState?.servingBoxName, serveState?.targetBoxName, playPointRally, playUndoSnap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  return {
    ballRef,
    shadowRef,
    motionConfig,
    isAnimating: isAnimatingState,
    currentPos: currentPosRef.current,
    playPointRally,
    playUndoSnap,
    cancelAnimation
  };
}
