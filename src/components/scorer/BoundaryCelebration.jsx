'use client';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * BoundaryCelebration Component
 * Full-screen, high-energy 60fps motion animation for FOUR and SIX deliveries.
 * Non-blocking (pointer-events: none) and auto-dismissing.
 */
const BoundaryCelebration = ({ type, onDone, onComplete, zIndex = 9998 }) => {
  const handleDone = onDone || onComplete;
  const handleDoneRef = useRef(handleDone);
  useEffect(() => {
    handleDoneRef.current = handleDone;
  }, [handleDone]);

  const normalizedType = String(type || '').toUpperCase();
  const isFour = normalizedType === 'FOUR';
  const isSix = normalizedType === 'SIX';

  // Check user motion preferences
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Pre-generate 18 particles for the FOUR streak boundary burst
  const fourParticles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * 360 + (Math.random() * 20 - 10);
      const rad = (angle * Math.PI) / 180;
      const distance = 40 + Math.random() * 85;
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      const size = 4 + Math.random() * 6;
      const color = ['#34d399', '#10b981', '#059669', '#6ee7b7', '#ffffff', '#2dd4bf'][i % 6];
      return { id: i, x, y, size, color };
    });
  }, []);

  useEffect(() => {
    if (!isFour && !isSix) return;

    // 1. Mobile Haptic Feedback (Feature-detected)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (isFour) {
          navigator.vibrate([35, 25, 45]);
        } else if (isSix) {
          navigator.vibrate([50, 30, 80, 30, 100]);
        }
      } catch (e) {
        // Ignore haptic errors on unsupported devices
      }
    }

    // 2. Confetti Burst for SIX (Purple, Gold & White Theme)
    let confettiTimer = null;
    if (isSix && !prefersReducedMotion) {
      confettiTimer = setTimeout(() => {
        try {
          confetti({
            particleCount: 55,
            spread: 85,
            origin: { x: 0.5, y: 0.38 },
            colors: ['#a855f7', '#c084fc', '#fbbf24', '#f59e0b', '#ffffff', '#e879f9'],
            gravity: 0.85,
            ticks: 140,
            scalar: 1.1,
            disableForReducedMotion: true
          });
        } catch (e) {
          // Ignore
        }
      }, 150);
    }

    // 3. Auto-dismiss timer (FOUR: ~1400ms, SIX: ~2000ms)
    const duration = isFour ? 1400 : 2000;
    const dismissTimer = setTimeout(() => {
      if (handleDoneRef.current) handleDoneRef.current();
    }, duration);

    return () => {
      clearTimeout(dismissTimer);
      if (confettiTimer) clearTimeout(confettiTimer);
      try {
        confetti.reset();
      } catch (e) {}
    };
  }, [isFour, isSix, prefersReducedMotion]);

  // Render nothing if not a 4 or 6
  if (!isFour && !isSix) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex || 9998,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* 1. Subtle Backdrop Tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isFour
            ? 'radial-gradient(ellipse at center, rgba(6, 78, 59, 0.4) 0%, rgba(4, 47, 46, 0.25) 50%, rgba(0, 0, 0, 0.1) 100%)'
            : 'radial-gradient(ellipse at center, rgba(88, 28, 135, 0.45) 0%, rgba(59, 7, 100, 0.3) 50%, rgba(0, 0, 0, 0.15) 100%)',
          animation: prefersReducedMotion
            ? 'backdropFadeReduced 1.2s ease forwards'
            : isFour
            ? 'fourBackdrop 1.4s ease forwards'
            : 'sixBackdrop 2.0s ease forwards'
        }}
      />

      {/* 2. Light Flash for SIX */}
      {isSix && !prefersReducedMotion && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.35) 0%, rgba(192, 132, 252, 0.25) 40%, transparent 75%)',
            animation: 'sixFlash 0.32s ease-out forwards'
          }}
        />
      )}

      {/* 3. Screen Shake Container for SIX */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isSix && !prefersReducedMotion ? 'sixShake 0.32s ease-out forwards' : 'none'
        }}
      >
        {/* Soft Radial Glow behind text */}
        <div
          style={{
            position: 'absolute',
            width: isFour ? '600px' : '750px',
            height: isFour ? '600px' : '750px',
            borderRadius: '50%',
            background: isFour
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.42) 0%, rgba(20, 184, 166, 0.18) 45%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168, 85, 247, 0.48) 0%, rgba(245, 158, 11, 0.25) 45%, transparent 70%)',
            filter: 'blur(35px)',
            animation: prefersReducedMotion
              ? 'none'
              : isFour
              ? 'glowPulseFour 1.4s ease forwards'
              : 'glowPulseSix 2.0s ease forwards',
            transform: 'translate3d(0, 0, 0)'
          }}
        />

        {/* Shockwave Rings for SIX */}
        {isSix && !prefersReducedMotion && (
          <>
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: '3px solid rgba(251, 191, 36, 0.85)',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.7)',
                animation: 'shockwave 0.85s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: '2px solid rgba(192, 132, 252, 0.7)',
                animation: 'shockwave 0.95s cubic-bezier(0.1, 0.8, 0.3, 1) 0.12s forwards'
              }}
            />
          </>
        )}

        {/* FOUR: Streaking Ball & Motion Speed Lines */}
        {isFour && !prefersReducedMotion && (
          <>
            {/* Speed Lines */}
            <div
              style={{
                position: 'absolute',
                top: '55%',
                left: 0,
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.2) 20%, rgba(52, 211, 153, 0.9) 80%, #ffffff 100%)',
                animation: 'speedLineStreak 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transformOrigin: 'left center'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '56.5%',
                left: 0,
                width: '85%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(20, 184, 166, 0.4) 30%, #34d399 90%, transparent 100%)',
                animation: 'speedLineStreak 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards'
              }}
            />

            {/* Glowing Ball Streaking Horizontally */}
            <div
              style={{
                position: 'absolute',
                top: '53.5%',
                left: 0,
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #34d399 50%, #059669 100%)',
                boxShadow: '0 0 20px #34d399, 0 0 45px #10b981, -25px 0 35px rgba(52, 211, 153, 0.9)',
                animation: 'fourBallStreak 0.65s cubic-bezier(0.2, 0.9, 0.2, 1) forwards'
              }}
            />

            {/* Boundary Rope Ripple / Shockwave & Particles at ~88vw */}
            <div
              style={{
                position: 'absolute',
                top: '55%',
                right: '10vw',
                transform: 'translate(50%, -50%)',
                pointerEvents: 'none'
              }}
            >
              {/* Boundary Ripple Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '-90px',
                  left: '0',
                  width: '6px',
                  height: '180px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(180deg, transparent 0%, #34d399 30%, #ffffff 50%, #34d399 70%, transparent 100%)',
                  boxShadow: '0 0 25px rgba(52, 211, 153, 0.9)',
                  animation: 'boundaryRopeRipple 0.55s ease-out 0.45s forwards',
                  opacity: 0
                }}
              />

              {/* Boundary Particles Burst (18-20 particles) */}
              {fourParticles.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: '50%',
                    background: p.color,
                    boxShadow: `0 0 8px ${p.color}`,
                    '--tx': `${p.x}px`,
                    '--ty': `${p.y}px`,
                    animation: 'particleBurst 0.65s ease-out 0.45s forwards',
                    opacity: 0
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* SIX: Parabolic Arcing Ball flying off the top of the viewport */}
        {isSix && !prefersReducedMotion && (
          <div
            style={{
              position: 'absolute',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #fde047 35%, #f59e0b 70%, #9333ea 100%)',
              boxShadow: '0 0 25px #fbbf24, 0 0 55px #a855f7, 0 20px 40px rgba(168, 85, 247, 0.7)',
              animation: 'sixParabolicBall 1.25s cubic-bezier(0.22, 0.8, 0.36, 1) forwards'
            }}
          />
        )}

        {/* Central High-Energy Typography & Subtext */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            userSelect: 'none'
          }}
        >
          {/* Main Hero Word: FOUR or SIX */}
          <div
            style={{
              fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: isFour ? 'clamp(5.5rem, 18vw, 12rem)' : 'clamp(6.5rem, 22vw, 14.5rem)',
              fontWeight: 950,
              lineHeight: 0.9,
              letterSpacing: isFour ? '-2px' : '-4px',
              textTransform: 'uppercase',
              color: '#ffffff',
              background: isFour
                ? 'linear-gradient(135deg, #ffffff 0%, #6ee7b7 30%, #10b981 70%, #047857 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #fde047 20%, #fbbf24 40%, #c084fc 75%, #9333ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: isFour
                ? 'drop-shadow(0 0 35px rgba(16, 185, 129, 0.9)) drop-shadow(0 15px 35px rgba(0, 0, 0, 0.8))'
                : 'drop-shadow(0 0 45px rgba(168, 85, 247, 0.95)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.8)) drop-shadow(0 20px 45px rgba(0, 0, 0, 0.9))',
              animation: prefersReducedMotion
                ? 'textFadeReduced 1.2s ease forwards'
                : isFour
                ? 'fourTextSlam 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'sixTextScaleBounce 2.0s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards',
              willChange: 'transform, opacity'
            }}
          >
            {isFour ? 'FOUR' : 'SIX'}
          </div>

          {/* Polish Subtext */}
          <div
            style={{
              marginTop: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: 'clamp(1rem, 3.2vw, 1.85rem)',
              fontWeight: 900,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: isFour ? '#34d399' : '#fbbf24',
              textShadow: isFour
                ? '0 0 15px rgba(16, 185, 129, 0.8), 0 2px 8px rgba(0,0,0,0.8)'
                : '0 0 18px rgba(251, 191, 36, 0.9), 0 2px 8px rgba(0,0,0,0.8)',
              animation: prefersReducedMotion
                ? 'textFadeReduced 1.2s ease forwards'
                : isFour
                ? 'subtextFade 1.4s ease forwards'
                : 'subtextFade 2.0s ease forwards',
              opacity: 0
            }}
          >
            <span>{isFour ? '+4 RUNS' : '+6 MAXIMUM'}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ fontSize: '0.85em', opacity: 0.9 }}>
              {isFour ? 'BOUNDARY ROPE' : 'INTO THE STANDS'}
            </span>
          </div>
        </div>
      </div>

      {/* Pure CSS Keyframes for 60fps transform & opacity animations */}
      <style>{`
        /* --- Backdrop Animations --- */
        @keyframes fourBackdrop {
          0% { opacity: 0; }
          15% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes sixBackdrop {
          0% { opacity: 0; }
          12% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes backdropFadeReduced {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        /* --- Glow Pulses --- */
        @keyframes glowPulseFour {
          0% { opacity: 0; transform: scale(0.6); }
          20% { opacity: 1; transform: scale(1.15); }
          40% { transform: scale(1); }
          75% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(0.9); }
        }

        @keyframes glowPulseSix {
          0% { opacity: 0; transform: scale(0.5); }
          25% { opacity: 1; transform: scale(1.25); }
          50% { transform: scale(1.05); }
          80% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(0.85); }
        }

        /* --- FOUR: Text Slam & Overshoot --- */
        @keyframes fourTextSlam {
          0% {
            opacity: 0;
            transform: translateX(-120vw) skewX(-20deg) scale(0.85);
          }
          20% {
            opacity: 1;
            transform: translateX(4vw) skewX(-6deg) scale(1.12);
          }
          30% {
            transform: translateX(-1.5vw) skewX(2deg) scale(0.98);
          }
          38% {
            transform: translateX(0) skewX(0deg) scale(1);
          }
          75% {
            opacity: 1;
            transform: translateX(0) skewX(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(120vw) skewX(16deg) scale(1.05);
          }
        }

        /* --- FOUR: Ball Streak --- */
        @keyframes fourBallStreak {
          0% {
            opacity: 0;
            transform: translate(-15vw, 0) scale(0.7);
          }
          15% {
            opacity: 1;
            transform: translate(10vw, 0) scale(1);
          }
          70% {
            opacity: 1;
            transform: translate(88vw, 0) scale(1.25);
          }
          85% {
            opacity: 0.8;
            transform: translate(96vw, 0) scale(1.4);
          }
          100% {
            opacity: 0;
            transform: translate(110vw, 0) scale(0.5);
          }
        }

        /* --- FOUR: Speed Lines --- */
        @keyframes speedLineStreak {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          30% {
            opacity: 1;
            transform: scaleX(1);
          }
          70% {
            opacity: 1;
            transform: scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleX(1.1);
          }
        }

        /* --- FOUR: Boundary Ripple --- */
        @keyframes boundaryRopeRipple {
          0% {
            opacity: 0;
            transform: scaleY(0.4) scaleX(0.5);
          }
          30% {
            opacity: 1;
            transform: scaleY(1.3) scaleX(1.8);
          }
          100% {
            opacity: 0;
            transform: scaleY(1.8) scaleX(3.5);
          }
        }

        /* --- Particles Burst --- */
        @keyframes particleBurst {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0);
          }
        }

        /* --- SIX: Flash & Screen Shake --- */
        @keyframes sixFlash {
          0% { opacity: 0; }
          25% { opacity: 0.38; }
          100% { opacity: 0; }
        }

        @keyframes sixShake {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-5px, 4px) rotate(-0.5deg); }
          35% { transform: translate(5px, -4px) rotate(0.5deg); }
          55% { transform: translate(-4px, -2px); }
          75% { transform: translate(3px, 2px); }
          100% { transform: translate(0, 0); }
        }

        /* --- SIX: Shockwave Ring --- */
        @keyframes shockwave {
          0% {
            opacity: 0.9;
            transform: scale(0.2);
          }
          100% {
            opacity: 0;
            transform: scale(2.8);
          }
        }

        /* --- SIX: Parabolic Ball Flight --- */
        @keyframes sixParabolicBall {
          0% {
            opacity: 0;
            bottom: 8%;
            left: 48%;
            transform: scale(0.7) rotate(0deg);
          }
          20% {
            opacity: 1;
            bottom: 30%;
            left: 50%;
            transform: scale(1.1) rotate(90deg);
          }
          50% {
            bottom: 65%;
            left: 54%;
            transform: scale(1.4) rotate(220deg);
          }
          80% {
            opacity: 1;
            bottom: 105%;
            left: 58%;
            transform: scale(1.6) rotate(360deg);
          }
          100% {
            opacity: 0;
            bottom: 125%;
            left: 60%;
            transform: scale(1.8) rotate(450deg);
          }
        }

        /* --- SIX: Text Scale Bounce --- */
        @keyframes sixTextScaleBounce {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-6deg);
          }
          22% {
            opacity: 1;
            transform: scale(1.24) rotate(2deg);
          }
          34% {
            transform: scale(0.94) rotate(-1deg);
          }
          46% {
            transform: scale(1.05) rotate(0.5deg);
          }
          58% {
            transform: scale(1) rotate(0deg);
          }
          82% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }

        /* --- Subtext Fade --- */
        @keyframes subtextFade {
          0% { opacity: 0; transform: translateY(12px); }
          25% { opacity: 0; transform: translateY(12px); }
          38% { opacity: 1; transform: translateY(0); }
          78% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }

        /* --- Reduced Motion Fallback --- */
        @keyframes textFadeReduced {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default BoundaryCelebration;
