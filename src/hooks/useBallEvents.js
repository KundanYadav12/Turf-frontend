import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useBallEvents Hook
 *
 * Single source of truth for deciding when live ball-event animations fire on the display.
 * - Extracts a strictly monotonic ball sequence ID from match state.
 * - Skips first load, refresh, or reconnect (silent baseline).
 * - Fires only when ballId is new and strictly greater than the last processed ballId.
 * - Ignores poll cycles that return identical data.
 * - Emits one event: { id, type: 'dot'|'run1'|'run2'|'run3'|'four'|'six'|'wicket'|'wide'|'noball'|'bye'|'legbye'|'win', runs, batter, subtext }.
 * - Holds active event in state with a fixed-duration timer stored in a ref.
 * - If a new event arrives while one is playing, cleanly replaces it.
 * - Cleans up all timers on unmount.
 */
export function useBallEvents(liveMatchData) {
  const [activeEvent, setActiveEvent] = useState(null);
  const timerRef = useRef(null);
  const lastProcessedBallIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  const lastMatchIdRef = useRef(null);
  const lastStatusRef = useRef(null);
  const prevRunsRef = useRef(0);
  const prevWicketsRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!liveMatchData) return;

    const currentMatchId = liveMatchData.id;
    const state = liveMatchData.score?.details || {};
    const currentStatus = liveMatchData.status;
    const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'FINISHED';

    // 1. Calculate legal balls bowled in match
    const oversStr = String(state.overs ?? '0.0');
    const oversFloat = parseFloat(oversStr) || 0;
    const completedOvers = Math.floor(oversFloat);
    const ballsInOver = Math.round((oversFloat % 1) * 10);
    const legalBalls = completedOvers * 6 + ballsInOver;

    // 2. Extras & runs & wickets
    const wideRuns = Number(state.extras?.wide ?? 0);
    const noBallRuns = Number(state.extras?.noBall ?? 0);
    const extrasTotal = Number(state.extras?.total ?? 0);
    const totalRuns = Number(state.totalRuns ?? 0);
    const wickets = Number(state.wickets ?? 0);
    const innings = Number(state.innings ?? 1);

    // Total deliveries in innings (legal balls + illegal extras that do not count as legal ball)
    const totalDeliveries = legalBalls + wideRuns + noBallRuns;

    // Stable, strictly monotonic numeric sequence:
    // Any legal ball increases legalBalls (+10,000)
    // Any wide/no-ball increases totalDeliveries (+10,000) and totalRuns (+1+)
    // Any wicket increases wickets (+0.01)
    // Innings switch jumps by 10,000,000
    const ballSequence =
      innings * 10000000 +
      totalDeliveries * 10000 +
      (extrasTotal * 100) +
      totalRuns +
      wickets * 0.01;

    // 3. FIRST LOAD / MATCH SWITCH: Record baseline silently, do NOT animate
    if (isFirstLoadRef.current || lastMatchIdRef.current !== currentMatchId) {
      isFirstLoadRef.current = false;
      lastMatchIdRef.current = currentMatchId;
      lastStatusRef.current = currentStatus;
      lastProcessedBallIdRef.current = ballSequence;
      prevRunsRef.current = totalRuns;
      prevWicketsRef.current = wickets;
      return;
    }

    // 4. DETECT WIN / MATCH COMPLETED (only if status changed to completed during this active session)
    if (
      isCompleted &&
      lastStatusRef.current &&
      lastStatusRef.current !== 'COMPLETED' &&
      lastStatusRef.current !== 'FINISHED'
    ) {
      lastStatusRef.current = currentStatus;
      lastProcessedBallIdRef.current = ballSequence;
      prevRunsRef.current = totalRuns;
      prevWicketsRef.current = wickets;

      clearTimer();
      const winEvent = {
        id: `win-${currentMatchId}-${ballSequence}`,
        type: 'win',
        label: 'MATCH FINISHED',
        subtext:
          liveMatchData.score?.subtext ||
          `${state.battingTeamName || liveMatchData.teamA?.name || 'Winner'} won the match`,
        runs: 0,
        batter: ''
      };
      setActiveEvent(winEvent);
      timerRef.current = setTimeout(() => {
        setActiveEvent(null);
        timerRef.current = null;
      }, 4000);
      return;
    }
    lastStatusRef.current = currentStatus;

    // 5. CHECK MONOTONIC PROGRESSION: ballSequence must be strictly greater than last processed
    if (
      lastProcessedBallIdRef.current === null ||
      ballSequence <= lastProcessedBallIdRef.current
    ) {
      // Identical or stale poll -> Ignore completely
      return;
    }

    // 6. A NEW BALL HAS BEEN RECORDED!
    const runsDiff = Math.max(0, totalRuns - prevRunsRef.current);
    const wicketsDiff = wickets - prevWicketsRef.current;
    prevRunsRef.current = totalRuns;
    prevWicketsRef.current = wickets;
    lastProcessedBallIdRef.current = ballSequence;

    // Determine ball outcome from over balls or difference
    const currentOverBalls = Array.isArray(state.currentOverBalls) ? state.currentOverBalls : [];
    const latestBall = currentOverBalls[currentOverBalls.length - 1];
    const ballStr = String(latestBall || '').toUpperCase();
    const celebrationHint = String(state.celebration || '').toUpperCase();

    let eventType = 'dot';
    let runs = runsDiff;

    if (wicketsDiff > 0 || ballStr === 'W' || ballStr.includes('WKT') || celebrationHint === 'WICKET') {
      eventType = 'wicket';
    } else if (runsDiff === 6 || ballStr === '6' || celebrationHint === 'SIX') {
      eventType = 'six';
      runs = 6;
    } else if (runsDiff === 4 || ballStr === '4' || celebrationHint === 'FOUR') {
      eventType = 'four';
      runs = 4;
    } else if (ballStr.includes('WD') || ballStr.includes('WIDE')) {
      eventType = 'wide';
      runs = runsDiff > 0 ? runsDiff : 1;
    } else if (ballStr.includes('NB') || ballStr.includes('NO')) {
      eventType = 'noball';
      runs = runsDiff > 0 ? runsDiff : 1;
    } else if (ballStr.endsWith('LB') || ballStr.includes('LEG_BYE')) {
      eventType = 'legbye';
    } else if (ballStr.endsWith('B') || ballStr.includes('BYE')) {
      eventType = 'bye';
    } else if (runsDiff === 1 || ballStr === '1') {
      eventType = 'run1';
      runs = 1;
    } else if (runsDiff === 2 || ballStr === '2') {
      eventType = 'run2';
      runs = 2;
    } else if (runsDiff === 3 || ballStr === '3') {
      eventType = 'run3';
      runs = 3;
    } else if (runsDiff === 0 || ballStr === '•' || ballStr === '0' || ballStr === '.') {
      eventType = 'dot';
      runs = 0;
    } else if (runsDiff > 0) {
      eventType = `run${runsDiff}`;
    }

    const batterName = state.striker?.name || state.striker?.player_name || '';
    const newEvent = {
      id: `ball-${currentMatchId}-${ballSequence}`,
      type: eventType,
      runs: runs,
      batter: batterName,
      subtext:
        eventType === 'wicket'
          ? (batterName ? `${batterName} OUT` : 'WICKET FALLS')
          : ''
    };


    // 7. Cleanly replace any previous playing animation
    clearTimer();
    setActiveEvent(newEvent);

    // Duration mapping (FOUR: 1400ms, SIX: 2000ms matching scorer; WICKET: 1800ms; others: 1400ms)
    const duration =
      eventType === 'four'
        ? 1400
        : eventType === 'six'
        ? 2000
        : eventType === 'wicket'
        ? 1800
        : eventType === 'win'
        ? 4000
        : 1400;

    timerRef.current = setTimeout(() => {
      setActiveEvent(null);
      timerRef.current = null;
    }, duration);
  }, [liveMatchData, clearTimer]);

  const dismissEvent = useCallback(() => {
    clearTimer();
    setActiveEvent(null);
  }, [clearTimer]);

  return { activeEvent, dismissEvent };
}
