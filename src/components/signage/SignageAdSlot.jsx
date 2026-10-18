'use client';
import React, { useState, useEffect, useRef } from 'react';

/**
 * Modern Multi-Layout Advertising Component
 * Supports TOP, BOTTOM, LEFT, RIGHT placements with Configurable Dimensions,
 * Preset Sizes, Static, Scrolling, Carousel, Slide-In and Marquee motion modes.
 */
export default function SignageAdSlot({
  placement = 'TOP',
  ads = [],
  isPaused = false,
  className = '',
  style = {}
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef(null);

  // Filter ads for this placement
  const placementAds = Array.isArray(ads)
    ? ads.filter(a => {
        if (!a || a.status === 'INACTIVE') return false;
        if (placement === 'LEFT') return a.position === 'LEFT' || a.position === 'BOTH_SIDEBARS';
        if (placement === 'RIGHT') return a.position === 'RIGHT' || a.position === 'BOTH_SIDEBARS';
        if (placement === 'TOP') return a.position === 'TOP';
        if (placement === 'BOTTOM') return a.position === 'BOTTOM';
        return a.position === placement;
      })
    : [];

  const activeAd = placementAds[currentIndex] || placementAds[0];

  // Carousel / Auto-rotation for multiple ads in static or carousel mode
  useEffect(() => {
    if (placementAds.length <= 1) return;
    const intervalSec = activeAd?.slideInterval || 6;

    const timer = setInterval(() => {
      if (!isPaused && (!isHovered || !activeAd?.pauseOnHover)) {
        setCurrentIndex((prev) => (prev + 1) % placementAds.length);
      }
    }, Math.max(3000, intervalSec * 1000));

    return () => clearInterval(timer);
  }, [placementAds.length, activeAd?.slideInterval, isPaused, isHovered]);

  if (placementAds.length === 0 || !activeAd) {
    return null;
  }

  // Parse dimension helper
  const resolveDimension = (val, fallback) => {
    if (!val || val === 'auto') return fallback;
    if (typeof val === 'number') return `${val}px`;
    if (/^\d+$/.test(val)) return `${val}px`;
    return val;
  };

  // Sizing Presets mapping
  const getPresetStyles = (preset, pos) => {
    switch (preset) {
      case 'LEADERBOARD': // 728x90
        return { maxWidth: '728px', height: '90px' };
      case 'LARGE_LEADERBOARD': // 970x90
        return { maxWidth: '970px', height: '90px' };
      case 'BILLBOARD': // 970x250
        return { maxWidth: '970px', height: '250px' };
      case 'BANNER': // 468x60
        return { maxWidth: '468px', height: '60px' };
      case 'MEDIUM_RECTANGLE': // 300x250
        return { width: '300px', height: '250px' };
      case 'SKYSCRAPER': // 160x600
        return { width: '160px', height: '600px' };
      case 'WIDE_SKYSCRAPER': // 300x600
        return { width: '260px', height: '600px' };
      case 'SIGNAGE_TOP_BANNER':
        return { width: '100%', height: '76px' };
      case 'SIGNAGE_BOTTOM_TICKER':
        return { width: '100%', height: '48px' };
      case 'SIGNAGE_SIDEBAR_TALL':
        return { width: '220px', height: '680px' };
      case 'FULL_WIDTH':
        return { width: '100%', height: 'auto' };
      case 'RESPONSIVE':
      default:
        if (pos === 'LEFT' || pos === 'RIGHT') {
          return { width: '220px', height: '100%', minHeight: '400px' };
        }
        if (pos === 'BOTTOM') {
          return { width: '100%', height: '48px' };
        }
        return { width: '100%', height: 'auto', maxHeight: '110px' };
    }
  };

  const presetStyle = getPresetStyles(activeAd.sizePreset, placement);
  const containerWidth = resolveDimension(activeAd.width, presetStyle.width || '100%');
  const containerHeight = resolveDimension(activeAd.height, presetStyle.height || 'auto');
  const imageFit = activeAd.imageFit || 'contain';
  const motionType = activeAd.motionType || (placement === 'BOTTOM' ? 'SCROLL' : 'STATIC');
  const speed = activeAd.speed || 25;
  const direction = activeAd.movementDirection || (placement === 'LEFT' || placement === 'RIGHT' ? 'BOTTOM_TO_TOP' : 'RIGHT_TO_LEFT');

  const shouldPause = isPaused || (isHovered && activeAd.pauseOnHover);

  // ── 1. LEFT & RIGHT SIDEBAR PLACEMENT ──
  if (placement === 'LEFT' || placement === 'RIGHT') {
    return (
      <aside
        className={`signage-ad-sidebar signage-ad-${placement.toLowerCase()} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          height: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '12px',
          background: 'rgba(10, 15, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          padding: 0,
          flexShrink: 0,
          transition: 'all 0.3s ease',
          ...style
        }}
      >
        {/* Floating Sponsor Tag Overlay */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <span style={{
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            color: '#10b981',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Official Sponsor
          </span>
          {placementAds.length > 1 && (
            <span style={{
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(6px)',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '0.6rem',
              fontWeight: 800
            }}>
              {currentIndex + 1}/{placementAds.length}
            </span>
          )}
        </div>

        {/* Content Body based on Motion Type */}
        {motionType === 'SCROLL' || motionType === 'VERTICAL_BTT' || motionType === 'VERTICAL_TTB' ? (
          // Continuous Vertical Scrolling Track
          <div
            ref={scrollRef}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                animation: direction === 'TOP_TO_BOTTOM'
                  ? `signageVerticalScrollReverse ${speed}s linear infinite`
                  : `signageVerticalScroll ${speed}s linear infinite`,
                animationPlayState: shouldPause ? 'paused' : 'running'
              }}
            >
              {[...placementAds, ...placementAds].map((ad, idx) => (
                <div key={`${ad.id}-${idx}`} style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    style={{
                      width: '100%',
                      height: 'auto',
                      minHeight: '180px',
                      maxHeight: '380px',
                      objectFit: ad.imageFit || imageFit,
                      display: 'block'
                    }}
                  />
                  {ad.title && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '1rem 0.5rem 0.4rem',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}>
                      {ad.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Static or Crossfade Full-Bleed Image
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img
              key={activeAd.id}
              src={activeAd.imageUrl}
              alt={activeAd.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: activeAd.imageFit || imageFit,
                animation: 'signageAdFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            {activeAd.title && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '1.25rem 0.6rem 0.5rem',
                background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'center',
                lineHeight: 1.25,
                zIndex: 5
              }}>
                {activeAd.title}
              </div>
            )}
          </div>
        )}
      </aside>
    );
  }

  // ── 2. TOP BANNER PLACEMENT ──
  if (placement === 'TOP') {
    return (
      <div
        className={`signage-ad-top-slot ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          ...style
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {motionType === 'SCROLL' || motionType === 'MARQUEE' ? (
            // Continuous Horizontal Marquee
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                width: 'max-content',
                height: '100%',
                animation: direction === 'LEFT_TO_RIGHT'
                  ? `signageTickerScrollReverse ${speed}s linear infinite`
                  : `signageTickerScroll ${speed}s linear infinite`,
                animationPlayState: shouldPause ? 'paused' : 'running',
                paddingLeft: '100%'
              }}
            >
              {[...placementAds, ...placementAds].map((ad, idx) => (
                <div
                  key={`${ad.id}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginRight: '3rem',
                    height: '100%'
                  }}
                >
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    style={{
                      height: '90%',
                      maxHeight: '100%',
                      objectFit: ad.imageFit || imageFit,
                      borderRadius: '6px'
                    }}
                  />
                  {ad.title && (
                    <span style={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: 'var(--display-text-primary, #ffffff)',
                      letterSpacing: '0.3px'
                    }}>
                      {ad.title}
                    </span>
                  )}
                  <span style={{ color: 'var(--display-border, rgba(255,255,255,0.2))' }}>•</span>
                </div>
              ))}
            </div>
          ) : (
            // Static or Crossfade Image Banner filling the zone
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <img
                key={activeAd.id}
                src={activeAd.imageUrl}
                alt={activeAd.title}
                style={{
                  width: activeAd.sizePreset === 'FULL_WIDTH' || activeAd.imageFit === 'fill' ? '100%' : 'auto',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: activeAd.imageFit || imageFit,
                  animation: 'signageAdFadeIn 0.8s ease-in-out'
                }}
              />
              {placementAds.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 8,
                  background: 'rgba(0,0,0,0.65)',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 800
                }}>
                  {currentIndex + 1}/{placementAds.length}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 3. BOTTOM TICKER / SPONSOR PLACEMENT ──
  return (
    <footer
      className={`signage-ad-bottom-slot ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '100%',
        minHeight: '36px',
        background: 'var(--display-surface, #0f172a)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      {/* Fixed SPONSORS Pill Tag */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, var(--display-surface, #0f172a) 82%, transparent 100%)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          fontWeight: 900,
          fontSize: 'clamp(0.68rem, 0.85vw, 0.82rem)',
          color: 'var(--display-accent, #10b981)',
          zIndex: 10,
          letterSpacing: '0.8px',
          textTransform: 'uppercase'
        }}
      >
        SPONSORS
      </div>

      {motionType === 'STATIC' ? (
        // Static Center Strip
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2.5rem',
            paddingLeft: 100,
            paddingRight: 16
          }}
        >
          {placementAds.map((ad) => (
            <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
              <img
                src={ad.imageUrl}
                alt={ad.title}
                style={{
                  height: 'calc(100% - 12px)',
                  maxHeight: '100%',
                  objectFit: ad.imageFit || 'contain',
                  borderRadius: 4
                }}
              />
              {ad.title && (
                <span
                  style={{
                    fontSize: 'clamp(0.75rem, calc(1.4vh + 0.2vw), 1.05rem)',
                    fontWeight: 700,
                    color: 'var(--display-text-primary, #ffffff)'
                  }}
                >
                  {ad.title}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Continuous Marquee Scrolling Track
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            width: 'max-content',
            height: '100%',
            animation: direction === 'LEFT_TO_RIGHT'
              ? `signageTickerScrollReverse ${speed}s linear infinite`
              : `signageTickerScroll ${speed}s linear infinite`,
            animationPlayState: shouldPause ? 'paused' : 'running',
            paddingLeft: '100vw'
          }}
        >
          {[...placementAds, ...placementAds].map((ad, idx) => (
            <div
              key={`${ad.id}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'clamp(8px, 1.2vw, 14px)',
                marginRight: 'clamp(2.5rem, 5vw, 5rem)',
                height: '100%'
              }}
            >
              <img
                src={ad.imageUrl}
                alt={ad.title}
                style={{
                  height: 'calc(100% - 12px)',
                  maxHeight: '100%',
                  objectFit: ad.imageFit || 'contain',
                  borderRadius: 4
                }}
              />
              <span
                style={{
                  fontSize: 'clamp(0.75rem, calc(1.4vh + 0.2vw), 1.05rem)',
                  fontWeight: 800,
                  color: 'var(--display-text-primary, #ffffff)',
                  letterSpacing: '0.4px'
                }}
              >
                {ad.title}
              </span>
              <span style={{ color: 'var(--display-border, rgba(255,255,255,0.2))', fontSize: '1.2rem' }}>•</span>
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
