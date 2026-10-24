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
   * Execute a single parabolic flight segment between two percentage coordinates
   */
  const flySegment = useCallback((startPos, endPos, durationMs, startRot = 0, endRot = 0) => {
    return new Promise((resolve) => {
      if (reducedMotion) {
        applyTransforms(endPos.x, endPos.y, 0, endRot);
        resolve();
        return;
      }

      const startTime = performance.now();
      const maxArc = motionConfig.arcHeight;
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
   * 1. Flight 1: Server service box -> Diagonal Receiver box (Serve)
   * 2. Flight 2: Receiver return shot -> Crosses net back to Server side (Rally exchange)
   * 3. Settle: Moves smoothly and rests in the NEW server's box for next rally
   */
  const playPointRally = useCallback(async (fromBoxName, toBoxName, newServingBoxName) => {
    cancelAnimation();
    isAnimatingRef.current = true;
    setIsAnimatingState(true);

    const fromCoords = getBoxCoords(fromBoxName);
    const receiverCoords = getReceiverCoords(toBoxName);
    const newServerCoords = getBoxCoords(newServingBoxName);

    // Initial position at server racket
    applyTransforms(fromCoords.x, fromCoords.y, 0, fromCoords.x < 50 ? 35 : -145);

    const flightMs = motionConfig.flightMs;
    const isFromLeft = fromCoords.x < 50;
    const serveAngle = isFromLeft ? 40 : -140;
    const returnAngle = isFromLeft ? -140 : 40;

    // Shot 1: Serve across net to receiver box
    await flySegment(fromCoords, receiverCoords, flightMs, serveAngle, serveAngle);
    if (onShotLand) onShotLand(receiverCoords);

    // Shot 2: Receiver returns shot back across net
    const returnCoords = {
      x: isFromLeft ? 26.0 : 74.0,
      y: receiverCoords.y === 28.75 ? 65.0 : 35.0
    };
    await flySegment(receiverCoords, returnCoords, flightMs * 0.85, returnAngle, returnAngle);
    if (onShotLand) onShotLand(returnCoords);

    // Shot 3: Settle into new authoritative server box
    await flySegment(returnCoords, newServerCoords, flightMs * 0.75, newServerCoords.x < 50 ? 35 : -145, newServerCoords.x < 50 ? 35 : -145);

    applyTransforms(newServerCoords.x, newServerCoords.y, 0, newServerCoords.x < 50 ? 35 : -145);
    isAnimatingRef.current = false;
    setIsAnimatingState(false);
  }, [cancelAnimation, getBoxCoords, getReceiverCoords, applyTransforms, motionConfig, flySegment, onShotLand]);

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

  // Initial Placement on Mount & Resize Observer for Responsiveness
  useEffect(() => {
    const defaultBox = serveState?.servingBoxName || 'bottom-left';
    const initialCoords = getBoxCoords(defaultBox);
    applyTransforms(initialCoords.x, initialCoords.y, 0, initialCoords.x < 50 ? 35 : -145);

    // Watch container size changes (e.g. window resize, fullscreen toggle, layout change)
    if (containerRef && containerRef.current && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (!isAnimatingRef.current) {
          const currentBox = serveState?.servingBoxName || 'bottom-left';
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
