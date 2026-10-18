'use client';
import React, { useEffect, useState } from 'react';

/**
 * ScoreCelebration Component
 * Non-blocking, fast (1.5-2.0s), professional celebration animation
 * for FOUR, SIX, and WICKET events.
 */
const ScoreCelebration = ({ type, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!type) return;
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [type, onComplete]);

  if (!visible || !type) return null;

  const isFour = type === 'FOUR';
  const isSix = type === 'SIX';
  const isWicket = type === 'WICKET';

  // Aesthetic configs per event type
  const config = {
    FOUR: {
      title: 'BOUNDARY FOUR!',
      tag: '+4 RUNS',
      icon: '🔥',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
      glow: 'rgba(16, 185, 129, 0.6)',
      textColor: '#ffffff',
      subtext: 'Crisp shot racing through the ropes!'
    },
    SIX: {
      title: 'MASSIVE SIX!',
      tag: '+6 MAXIMUM',
      icon: '🚀',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
      glow: 'rgba(139, 92, 246, 0.7)',
      textColor: '#ffffff',
      subtext: 'High, handsome and straight into the stands!'
    },
    WICKET: {
      title: 'OUT! WICKET!',
      tag: 'DISMISSAL',
      icon: '⚡',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
      glow: 'rgba(239, 68, 68, 0.7)',
      textColor: '#ffffff',
      subtext: 'Huge breakthrough for the bowling side!'
    }
  }[type] || {
    title: 'BIG PLAY!',
    tag: type,
    icon: '✨',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    glow: 'rgba(59, 130, 246, 0.5)',
    textColor: '#ffffff',
    subtext: ''
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '18%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        pointerEvents: 'none', // Strictly non-blocking so scorer can keep operating
        animation: 'celebrationPop 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div
        style={{
          background: config.gradient,
          borderRadius: '24px',
          padding: '1.25rem 2.5rem',
          color: config.textColor,
          textAlign: 'center',
          boxShadow: `0 20px 50px ${config.glow}, 0 0 0 1px rgba(255,255,255,0.2) inset`,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.4rem',
          minWidth: '280px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}
      >
        <div style={{ fontSize: '2.5rem', lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
          {config.icon}
        </div>
        
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: '900',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontFamily: "'Outfit', sans-serif",
            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {config.title}
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.22)',
            padding: '0.2rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.95rem',
            fontWeight: '800',
            letterSpacing: '0.5px'
          }}
        >
          {config.tag}
        </div>

        {config.subtext && (
          <div
            style={{
              fontSize: '0.8rem',
              opacity: 0.9,
              marginTop: '0.2rem',
              fontWeight: '500'
            }}
          >
            {config.subtext}
          </div>
        )}
      </div>

      <style>{`
        @keyframes celebrationPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.85);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.06);
          }
          25% {
            transform: translate(-50%, 0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -30px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
};

export default ScoreCelebration;
