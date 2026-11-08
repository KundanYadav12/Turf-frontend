'use client';
import React, { memo, useEffect, useState, useRef } from 'react';
import { YellowPickleballIcon } from './StreamScoreboardStrip';

/**
 * Score Celebration Animation Overlay on Live Stream
 * Displays TV broadcast celebration banners on +1 point and game/match victories.
 * Includes confetti sparkles, glowing borders, deduplication via event IDs,
 * respects prefers-reduced-motion, and streamer On/Off toggle.
 */
const StreamCelebrationBanner = memo(({
  celebrationEvent = null,
  enabled = true,
  onCelebrationComplete = null
}) => {
  const [activeCelebration, setActiveCelebration] = useState(null);
  const playedEventsRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !celebrationEvent) return;

    const {
      eventId,
      eventSeq,
      matchId,
      teamName = 'Team',
      isGamePoint = false,
      isMatchPoint = false,
      scoreSummary = '',
      isServing = false,
      teamColor = '#10b981',
      isUndo = false
    } = celebrationEvent;

    // Strict safety: ignore undo, correct or missing events
    if (isUndo) {
      setActiveCelebration(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Unique Event Deduplication key
    const uniqueKey = String(eventId || `${matchId}-${eventSeq || Date.now()}`);
    if (playedEventsRef.current.has(uniqueKey)) {
      return; // Already played or duplicate socket message
    }
    playedEventsRef.current.add(uniqueKey);

    // Keep deduplication set memory bounded
    if (playedEventsRef.current.size > 200) {
      const arr = Array.from(playedEventsRef.current);
      playedEventsRef.current = new Set(arr.slice(arr.length - 100));
    }

    const isVictory = Boolean(isMatchPoint || isGamePoint);
    const duration = isVictory ? 4800 : 2500;

    setActiveCelebration({
      uniqueKey,
      teamName,
      isVictory,
      isMatchPoint,
      isGamePoint,
      scoreSummary,
      isServing,
      teamColor: teamColor || '#10b981',
      bannerText: isMatchPoint
        ? `${teamName.toUpperCase()} WINS THE MATCH! 🏆`
        : isGamePoint
        ? `GAME ${teamName.toUpperCase()}! 🎾`
        : `${teamName.toUpperCase()} SCORES! 💥`
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveCelebration(null);
      if (onCelebrationComplete) onCelebrationComplete();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [celebrationEvent, enabled, onCelebrationComplete]);

  if (!enabled || !activeCelebration) return null;

  const { teamName, isVictory, scoreSummary, isServing, teamColor, bannerText } = activeCelebration;

  return (
    <>
      <style>{`
        @keyframes streamCelebrationPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.85);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.05);
          }
          25% {
            transform: translate(-50%, 0) scale(1);
          }
          85% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -15px) scale(0.92);
          }
        }

        @keyframes streamSparkleFloat {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          50% {
            opacity: 1;
            transform: translateY(-20px) rotate(180deg) scale(1.2);
          }
          100% {
            transform: translateY(-40px) rotate(360deg) scale(0);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .stream-celebration-box {
            animation: none !important;
            opacity: 1 !important;
            transform: translate(-50%, 0) !important;
          }
          .stream-sparkle {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="stream-celebration-box"
        style={{
          position: 'absolute',
          top: isVictory ? '28%' : '20%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          zIndex: 35,
          pointerEvents: 'none',
          animation: 'streamCelebrationPop 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '90%',
          width: isVictory ? '460px' : '360px'
        }}
      >
        {/* Floating Sparkles & Confetti */}
        <div style={{ position: 'relative', width: '100%', height: '0px' }}>
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="stream-sparkle"
              style={{
                position: 'absolute',
                left: `${15 + i * 14}%`,
                top: '-15px',
                fontSize: i % 2 === 0 ? '1.2rem' : '1.5rem',
                color: i % 2 === 0 ? '#facc15' : '#38bdf8',
                animation: `streamSparkleFloat ${1.8 + (i % 3) * 0.4}s ease-out infinite`,
                animationDelay: `${i * 0.15}s`
              }}
            >
              {i % 3 === 0 ? '✨' : i % 3 === 1 ? '🎉' : '⭐'}
            </span>
          ))}
        </div>

        {/* Main Banner Card */}
        <div
          style={{
            width: '100%',
            background: isVictory
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(180, 83, 9, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 14, 26, 0.98) 100%)',
            border: isVictory ? '2px solid #fde047' : `2px solid ${teamColor || '#10b981'}`,
            borderRadius: '16px',
            padding: isVictory ? '14px 20px' : '10px 18px',
            boxShadow: isVictory
              ? '0 12px 35px rgba(245, 158, 11, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              : `0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px ${teamColor}55`,
            backdropFilter: 'blur(12px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {/* Headline */}
          <div
            style={{
              fontSize: isVictory ? 'clamp(1.1rem, 2.5vw, 1.35rem)' : 'clamp(0.95rem, 2vw, 1.15rem)',
              fontWeight: 900,
              color: isVictory ? '#ffffff' : '#f8fafc',
              letterSpacing: '0.04em',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)'
            }}
          >
            {bannerText}
          </div>

          {/* Subtext: Score & Serve info */}
          {scoreSummary && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '2px',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '2px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                  fontWeight: 900,
                  color: isVictory ? '#fef08a' : '#38bdf8',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.05em'
                }}
              >
                {scoreSummary}
              </span>
              {isServing && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#facc15', fontWeight: 800 }}>
                  <YellowPickleballIcon size={14} />
                  <span>SERVES</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default StreamCelebrationBanner;

