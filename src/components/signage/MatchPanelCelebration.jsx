'use client';
import React, { useEffect, useState } from 'react';

/**
 * High-energy, non-blocking sports celebration overlay scoped strictly to an individual match panel.
 * Supported types: 'FOUR', 'SIX', 'WICKET', 'WIDE', 'NO_BALL'
 */
const MatchPanelCelebration = ({ event, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const duration = event.type === 'SIX' ? 2400 : event.type === 'WICKET' ? 2200 : 1800;
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [event, onDismiss]);

  if (!visible || !event) return null;

  const type = event.type || 'EVENT';

  const config = {
    SIX: {
      title: 'MASSIVE SIX!',
      badge: '+6 MAXIMUM',
      color: '#facc15',
      bgGlow: 'radial-gradient(circle, rgba(250,204,21,0.35) 0%, rgba(234,88,12,0.15) 50%, rgba(0,0,0,0) 80%)',
      borderColor: 'rgba(250,204,21,0.6)',
      textColor: '#fef08a'
    },
    FOUR: {
      title: 'CRACKING FOUR!',
      badge: '+4 BOUNDARY',
      color: '#10b981',
      bgGlow: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.15) 50%, rgba(0,0,0,0) 80%)',
      borderColor: 'rgba(16,185,129,0.6)',
      textColor: '#a7f3d0'
    },
    WICKET: {
      title: 'WICKET FALLS!',
      badge: 'OUT',
      color: '#ef4444',
      bgGlow: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(185,28,28,0.2) 50%, rgba(0,0,0,0) 80%)',
      borderColor: 'rgba(239,68,68,0.7)',
      textColor: '#fca5a5'
    },
    WIDE: {
      title: 'WIDE BALL',
      badge: '+1 EXTRA',
      color: '#f59e0b',
      bgGlow: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(0,0,0,0) 70%)',
      borderColor: 'rgba(245,158,11,0.6)',
      textColor: '#fde68a'
    },
    NO_BALL: {
      title: 'NO BALL!',
      badge: 'FREE HIT NEXT',
      color: '#ec4899',
      bgGlow: 'radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(0,0,0,0) 70%)',
      borderColor: 'rgba(236,72,153,0.6)',
      textColor: '#fbcfe8'
    }
  }[type] || {
    title: 'LIVE EVENT',
    badge: 'UPDATE',
    color: '#38bdf8',
    bgGlow: 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(0,0,0,0) 70%)',
    borderColor: 'rgba(56,189,248,0.5)',
    textColor: '#bae6fd'
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bgGlow,
        borderRadius: 16,
        overflow: 'hidden',
        backdropFilter: 'blur(2px)',
        animation: 'signageCelebrationPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      {/* Dynamic Animated Rays */}
      <div
        style={{
          position: 'absolute',
          width: '180%',
          height: '180%',
          background: `conic-gradient(from 0deg, transparent 0deg, ${config.color}22 30deg, transparent 60deg, ${config.color}22 90deg, transparent 120deg, ${config.color}22 150deg, transparent 180deg, ${config.color}22 210deg, transparent 240deg, ${config.color}22 270deg, transparent 300deg, ${config.color}22 330deg, transparent 360deg)`,
          animation: 'signageRaysSpin 8s linear infinite',
          zIndex: 1
        }}
      />

      {/* Main Celebration Banner Box */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(0.6rem, 1.5vh, 1.2rem) clamp(1.5rem, 3vw, 2.5rem)',
          background: 'rgba(10, 15, 29, 0.92)',
          border: `2px solid ${config.borderColor}`,
          borderRadius: 16,
          textAlign: 'center',
          boxShadow: `0 0 40px ${config.color}66, 0 10px 30px rgba(0,0,0,0.8)`,
          transform: 'scale(1)',
          animation: 'signagePulseGlow 1.2s ease-in-out infinite alternate'
        }}
      >
        <div
          style={{
            fontSize: 'clamp(0.85rem, 1.5vw, 1.2rem)',
            fontWeight: 900,
            letterSpacing: '2px',
            color: config.textColor,
            textTransform: 'uppercase',
            marginBottom: '0.2rem'
          }}
        >
          {config.title}
        </div>
        <div
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 3.2rem)',
            fontWeight: 950,
            color: '#fff',
            textShadow: `0 0 20px ${config.color}, 0 0 40px ${config.color}`,
            lineHeight: 1.1,
            letterSpacing: '-1px'
          }}
        >
          {config.badge}
        </div>
      </div>

      <style>{`
        @keyframes signageCelebrationPop {
          0% { opacity: 0; transform: scale(0.6); }
          70% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes signageRaysSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes signagePulseGlow {
          0% { transform: scale(0.98); }
          100% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default MatchPanelCelebration;
