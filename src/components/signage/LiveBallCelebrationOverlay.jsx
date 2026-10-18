'use client';
import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import BoundaryCelebration from '../scorer/BoundaryCelebration';
import { Trophy, AlertTriangle, Disc } from 'lucide-react';

/**
 * LiveBallCelebrationOverlay
 *
 * Full-viewport, non-blocking motion animation layer for live ball events.
 * Mounted via React Portal directly to document.body (zIndex: 9998)
 * so no parent container overflow, transform, or stacking context can clip it.
 *
 * - FOUR / SIX: Reuses the scorer's BoundaryCelebration
 * - WICKET: Fullscreen red flash, screen shake slam, and batter dismissal subtext
 * - RUNS (1, 2, 3), DOT, EXTRAS (WD/NB/B/LB): Positioned at the top-right of the score card area
 *   so it NEVER covers the main score digits. Plays once with a pop-in, hold, and fade-out.
 * - WIN: Trophy surge, champion banner, and confetti burst.
 */
const LiveBallCelebrationOverlay = ({ event, onDismiss }) => {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Haptic feedback & Win confetti effects
  useEffect(() => {
    if (!event) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (event.type === 'wicket') {
          navigator.vibrate([60, 40, 100, 40, 150]);
        } else if (event.type?.startsWith('run') || event.type === 'wide' || event.type === 'noball') {
          navigator.vibrate([25]);
        }
      } catch (e) {
        // Ignore haptic errors
      }
    }

    if (event.type === 'win' && !prefersReducedMotion) {
      try {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { x: 0.5, y: 0.4 },
          colors: ['#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#ffffff']
        });
        const t = setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 120,
            origin: { x: 0.5, y: 0.35 }
          });
        }, 1200);
        return () => clearTimeout(t);
      } catch (e) {
        // Ignore confetti errors
      }
    }
  }, [event, prefersReducedMotion]);

  if (!event || typeof document === 'undefined') return null;

  // 1. FOUR & SIX: Reuse identical BoundaryCelebration from scorer
  if (event.type === 'four' || event.type === 'six') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
        <BoundaryCelebration
          key={event.id}
          type={event.type === 'four' ? 'FOUR' : 'SIX'}
          onDone={onDismiss}
          zIndex={9998}
        />
      </div>,
      document.body
    );
  }

  // 2. WICKET MOMENT: Fullscreen red flash + shake + slam
  if (event.type === 'wicket') {
    return createPortal(
      <div
        key={event.id}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <style>{`
          @keyframes redScreenFlash {
            0% { opacity: 0; }
            25% { opacity: 0.95; }
            100% { opacity: 0; }
          }
          @keyframes wicketScreenShake {
            0% { transform: translate(0, 0); }
            20% { transform: translate(-6px, 4px) rotate(-0.5deg); }
            40% { transform: translate(6px, -4px) rotate(0.5deg); }
            60% { transform: translate(-4px, 2px); }
            80% { transform: translate(4px, -2px); }
            100% { transform: translate(0, 0); }
          }
          @keyframes popBadgeScale {
            0% { opacity: 0; transform: scale(0.6) translateY(-8px); }
            18% { opacity: 1; transform: scale(1.06) translateY(0); }
            26% { opacity: 1; transform: scale(1) translateY(0); }
            80% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(0.95) translateY(-6px); }
          }
        `}</style>

        {/* Fullscreen Red Flash Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at center, rgba(239, 68, 68, 0.45) 0%, rgba(185, 28, 28, 0.25) 60%, transparent 80%)',
            animation: prefersReducedMotion ? 'none' : 'redScreenFlash 0.5s ease-out forwards'
          }}
        />

        {/* Slam Card with Shake */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            animation: prefersReducedMotion
              ? 'none'
              : 'wicketScreenShake 0.45s ease-in-out, popBadgeScale 1.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}
        >
          {/* OUT Pill */}
          <div
            style={{
              display: 'inline-block',
              background: 'var(--display-live-red, #ef4444)',
              color: '#ffffff',
              padding: '4px 20px',
              borderRadius: 24,
              fontSize: 'clamp(0.85rem, 1.5vw, 1.2rem)',
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)',
              marginBottom: 8
            }}
          >
            OUT!
          </div>

          {/* WICKET! Headline */}
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(3.5rem, 9vw, 7.5rem)',
              fontWeight: 950,
              color: 'var(--display-live-red, #ef4444)',
              letterSpacing: '-1px',
              lineHeight: 1,
              textShadow: '0 0 35px rgba(239, 68, 68, 0.7), 0 4px 15px rgba(0,0,0,0.8)'
            }}
          >
            WICKET!
          </h2>

          {/* Dismissed Batter Subtext */}
          {event.subtext && (
            <div
              style={{
                marginTop: 10,
                fontSize: 'clamp(1rem, 2vw, 1.6rem)',
                fontWeight: 800,
                color: 'var(--display-text-primary, #ffffff)',
                background: 'var(--display-surface-elevated, #1e293b)',
                border: '1px solid var(--display-border, rgba(255,255,255,0.1))',
                padding: '6px 20px',
                borderRadius: 14,
                display: 'inline-block',
                boxShadow: 'var(--display-shadow, 0 8px 20px rgba(0,0,0,0.3))'
              }}
            >
              {event.subtext}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // 3. WIN / MATCH COMPLETED CELEBRATION
  if (event.type === 'win') {
    return createPortal(
      <div
        key={event.id}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <style>{`
          @keyframes trophySurge {
            0% { opacity: 0; transform: scale(0.5) translateY(30px); }
            60% { opacity: 1; transform: scale(1.05) translateY(-6px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        <div
          style={{
            textAlign: 'center',
            padding: 'clamp(1.5rem, 3vw, 3rem)',
            maxWidth: 680,
            borderRadius: 24,
            background: 'var(--display-surface, #0f172a)',
            border: '2px solid var(--display-accent, #10b981)',
            boxShadow: '0 0 50px rgba(16, 185, 129, 0.35)',
            animation: prefersReducedMotion
              ? 'none'
              : 'trophySurge 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)'
            }}
          >
            <Trophy size={40} />
          </div>

          <div
            style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1.1rem)',
              fontWeight: 900,
              letterSpacing: '2px',
              color: 'var(--display-warning-amber, #f59e0b)',
              textTransform: 'uppercase'
            }}
          >
            MATCH FINISHED
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              fontWeight: 950,
              color: 'var(--display-text-primary, #ffffff)',
              margin: '6px 0 12px 0',
              lineHeight: 1.1
            }}
          >
            {event.subtext || 'CHAMPIONS!'}
          </h2>

          <div
            style={{
              fontSize: 'clamp(0.95rem, 1.4vw, 1.25rem)',
              color: 'var(--display-accent, #10b981)',
              fontWeight: 800
            }}
          >
            🎉 Official Tournament Match Result
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 4. SMALL RUN AND EXTRAS BADGES (dot, run1, run2, run3, wide, noball, bye, legbye)
  // Positioned at the TOP-RIGHT of the score card area so it NEVER covers the main score digits!
  const isDot = event.type === 'dot';
  const isRuns = event.type?.startsWith('run');
  const isWide = event.type === 'wide';
  const isNoBall = event.type === 'noball';
  const isBye = event.type === 'bye';
  const isLegBye = event.type === 'legbye';

  let badgeBg = 'var(--display-surface-elevated, #1e293b)';
  let badgeColor = 'var(--display-text-primary, #ffffff)';
  let borderColor = 'var(--display-border, rgba(255,255,255,0.15))';
  let glow = 'none';
  let badgeLabel = '+1 RUN';

  if (isRuns) {
    badgeBg = 'var(--display-accent, #10b981)';
    badgeColor = '#ffffff';
    borderColor = 'var(--display-accent, #10b981)';
    glow = '0 0 20px rgba(16, 185, 129, 0.45)';
    badgeLabel = `+${event.runs || 1} RUN${(event.runs || 1) > 1 ? 'S' : ''}`;
  } else if (isWide) {
    badgeBg = 'var(--display-warning-amber, #f59e0b)';
    badgeColor = '#000000';
    borderColor = 'var(--display-warning-amber, #f59e0b)';
    glow = '0 0 20px rgba(245, 158, 11, 0.45)';
    badgeLabel = `WIDE BALL (+${event.runs || 1})`;
  } else if (isNoBall) {
    badgeBg = 'var(--display-warning-amber, #f59e0b)';
    badgeColor = '#000000';
    borderColor = 'var(--display-warning-amber, #f59e0b)';
    glow = '0 0 20px rgba(245, 158, 11, 0.45)';
    badgeLabel = `NO BALL (+${event.runs || 1})`;
  } else if (isLegBye) {
    badgeBg = 'var(--display-surface-elevated, #1e293b)';
    badgeColor = 'var(--display-text-primary, #ffffff)';
    borderColor = 'var(--display-border, rgba(255,255,255,0.2))';
    badgeLabel = `LEG BYE (+${event.runs || 0})`;
  } else if (isBye) {
    badgeBg = 'var(--display-surface-elevated, #1e293b)';
    badgeColor = 'var(--display-text-primary, #ffffff)';
    borderColor = 'var(--display-border, rgba(255,255,255,0.2))';
    badgeLabel = `BYE (+${event.runs || 0})`;
  } else if (isDot) {
    badgeBg = 'var(--display-surface-elevated, #1e293b)';
    badgeColor = 'var(--display-text-muted, #94a3b8)';
    borderColor = 'var(--display-border, rgba(255,255,255,0.12))';
    badgeLabel = 'DOT BALL (0)';
  }

  return createPortal(
    <div
      key={event.id}
      style={{
        position: 'fixed',
        top: 'clamp(72px, 11vh, 120px)',
        right: 'clamp(16px, 3.5vw, 44px)',
        zIndex: 9998,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
    >
      <style>{`
        @keyframes popBadgeScale {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(-8px);
          }
          18% {
            opacity: 1;
            transform: scale(1.06) translateY(0);
          }
          26% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          80% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.95) translateY(-6px);
          }
        }
        @keyframes badgeFadeSimple {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: badgeBg,
          color: badgeColor,
          border: `2px solid ${borderColor}`,
          padding: 'clamp(6px, 1.2vh, 10px) clamp(14px, 2vw, 22px)',
          borderRadius: '30px',
          boxShadow: glow !== 'none' ? glow : 'var(--display-shadow, 0 4px 16px rgba(0,0,0,0.25))',
          animation: prefersReducedMotion
            ? 'badgeFadeSimple 1.35s ease forwards'
            : 'popBadgeScale 1.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          willChange: 'transform, opacity'
        }}
      >
        {isWide || isNoBall ? (
          <AlertTriangle size={20} />
        ) : isDot ? (
          <Disc size={18} />
        ) : null}

        <span
          style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.35rem)',
            fontWeight: 950,
            letterSpacing: '0.5px'
          }}
        >
          {badgeLabel}
        </span>
      </div>
    </div>,
    document.body
  );
};

export default LiveBallCelebrationOverlay;
