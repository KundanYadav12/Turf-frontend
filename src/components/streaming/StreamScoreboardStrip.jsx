'use client';
import React, { memo } from 'react';

/**
 * Yellow ball icon representing active server
 */
export const YellowPickleballIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{
      flexShrink: 0,
      filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.9))',
      animation: 'streamPulseGlow 1.8s ease-in-out infinite'
    }}
  >
    <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
    <circle cx="9" cy="8" r="1.4" fill="#854d0e" />
    <circle cx="15" cy="8" r="1.4" fill="#854d0e" />
    <circle cx="7.5" cy="12" r="1.4" fill="#854d0e" />
    <circle cx="12" cy="12" r="1.4" fill="#854d0e" />
    <circle cx="16.5" cy="12" r="1.4" fill="#854d0e" />
    <circle cx="9" cy="16" r="1.4" fill="#854d0e" />
    <circle cx="15" cy="16" r="1.4" fill="#854d0e" />
  </svg>
);

/**
 * Modern Colourful Glassmorphic Lower-Third Score Strip for Live Streaming
 * TV broadcast styling with team gradient badges, tabular digits, serving indicators,
 * game number chips, and live pulsing indicators.
 */
const StreamScoreboardStrip = memo(({
  leftTeam = { name: 'Team A', score: 0, isServing: false, serverNum: null, logo: null },
  rightTeam = { name: 'Team B', score: 0, isServing: false, serverNum: null, logo: null },
  gameInfo = 'Game 1',
  isLive = true,
  isBreak = false,
  isBroadcaster = false,
  customStyle = {}
}) => {
  // Helper to extract 2-letter monogram for team badge
  const getMonogram = (name) => {
    if (!name) return 'TM';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes streamPulseGlow {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.85));
          }
          50% {
            transform: scale(1.18);
            filter: drop-shadow(0 0 10px rgba(250, 204, 21, 1));
          }
        }
        @keyframes streamLiveDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.85);
          }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          bottom: isBroadcaster ? '0.75rem' : 'clamp(10px, 2.5%, 28px)',
          left: 'clamp(8px, 3%, 24px)',
          right: 'clamp(8px, 3%, 24px)',
          zIndex: 25,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          ...customStyle
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(9, 14, 26, 0.97) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'clamp(6px, 1.5vw, 12px)',
            pointerEvents: 'auto',
            color: '#ffffff'
          }}
        >
          {/* ── LEFT TEAM BLOCK (Emerald / Green Accent Gradient) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(6px, 1.2vw, 10px)',
              flex: '1 1 0%',
              minWidth: 0,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.06) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '12px',
              padding: '4px 8px',
              boxShadow: leftTeam.isServing ? '0 0 14px rgba(16, 185, 129, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Team Monogram Badge / Logo */}
            {leftTeam.logo ? (
              <img
                src={leftTeam.logo}
                alt={leftTeam.name}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(16, 185, 129, 0.6)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                }}
              >
                {getMonogram(leftTeam.name)}
              </div>
            )}

            {/* Serving Indicator */}
            {leftTeam.isServing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                <YellowPickleballIcon size={16} />
                {leftTeam.serverNum && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '5px',
                      background: 'rgba(250, 204, 21, 0.22)',
                      color: '#fef08a',
                      border: '1px solid rgba(250, 204, 21, 0.45)',
                      lineHeight: 1.2
                    }}
                  >
                    S{leftTeam.serverNum}
                  </span>
                )}
              </div>
            )}

            {/* Team Name */}
            <span
              style={{
                fontWeight: 800,
                fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '0.01em'
              }}
              title={leftTeam.name}
            >
              {leftTeam.name}
            </span>

            {/* Tabular Score Badge */}
            <div
              style={{
                marginLeft: 'auto',
                minWidth: '32px',
                padding: '2px 8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: '#ffffff',
                fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
                fontWeight: 900,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.45)',
                flexShrink: 0
              }}
            >
              {leftTeam.score}
            </div>
          </div>

          {/* ── CENTER PILL (Game Status, Amber Chip & Pulse Dot) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              flexShrink: 0,
              padding: '0 4px'
            }}
          >
            {/* Live Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isBreak ? '#f59e0b' : '#10b981',
                  boxShadow: isBreak ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
                  animation: 'streamLiveDot 1.5s ease-in-out infinite'
                }}
              />
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: isBreak ? '#fbbf24' : '#34d399',
                  textTransform: 'uppercase'
                }}
              >
                {isBreak ? 'BREAK' : 'LIVE'}
              </span>
            </div>

            {/* Amber Game / Match Chip */}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.22)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap'
              }}
            >
              {isBreak ? '⏸ On Break' : gameInfo}
            </span>
          </div>

          {/* ── RIGHT TEAM BLOCK (Blue / Violet Accent Gradient) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 'clamp(6px, 1.2vw, 10px)',
              flex: '1 1 0%',
              minWidth: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0.18) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '12px',
              padding: '4px 8px',
              boxShadow: rightTeam.isServing ? '0 0 14px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Tabular Score Badge */}
            <div
              style={{
                marginRight: 'auto',
                minWidth: '32px',
                padding: '2px 8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
                fontWeight: 900,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.45)',
                flexShrink: 0
              }}
            >
              {rightTeam.score}
            </div>

            {/* Team Name */}
            <span
              style={{
                fontWeight: 800,
                fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'right',
                letterSpacing: '0.01em'
              }}
              title={rightTeam.name}
            >
              {rightTeam.name}
            </span>

            {/* Serving Indicator */}
            {rightTeam.isServing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                <YellowPickleballIcon size={16} />
                {rightTeam.serverNum && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '5px',
                      background: 'rgba(250, 204, 21, 0.22)',
                      color: '#fef08a',
                      border: '1px solid rgba(250, 204, 21, 0.45)',
                      lineHeight: 1.2
                    }}
                  >
                    S{rightTeam.serverNum}
                  </span>
                )}
              </div>
            )}

            {/* Team Monogram Badge / Logo */}
            {rightTeam.logo ? (
              <img
                src={rightTeam.logo}
                alt={rightTeam.name}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(59, 130, 246, 0.6)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)'
                }}
              >
                {getMonogram(rightTeam.name)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default StreamScoreboardStrip;

