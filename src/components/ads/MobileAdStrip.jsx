'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * MobileAdStrip: Continuous, GPU-Accelerated, Seamless Infinite Loop Ad Strip
 * Supports:
 * - position='top' (Right to Left marquee)
 * - position='bottom' (Left to Right marquee, docked with safe-area support)
 * - Constant px/second speed
 * - Zero gaps/jumps (seamless cycle duplication)
 * - Preloaded images
 * - prefers-reduced-motion crossfade fallback
 * - Tab visibility detection & Hold Ticker pause
 * - Complete collapse when 0 ads or ads disabled
 */
export default function MobileAdStrip({
  ads = [],
  position = 'top', // 'top' | 'bottom'
  height = position === 'top' ? 64 : 56,
  speed = position === 'top' ? 50 : 40, // px per second
  paused = false,
  adsEnabled = true,
  theme = 'dark',
  className = '',
  style = {}
}) {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeReducedIndex, setActiveReducedIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(480);
  const [isDismissed, setIsDismissed] = useState(false);
  const containerRef = useRef(null);

  // Check session dismissal for bottom strip
  useEffect(() => {
    if (position === 'bottom' && typeof window !== 'undefined') {
      if (sessionStorage.getItem('dismissed_mobile_bottom_ad') === 'true') {
        setIsDismissed(true);
      }
    }
  }, [position]);

  // 1. Detect Tab Visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 2. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // 3. Preload Images
  useEffect(() => {
    if (ads && ads.length > 0) {
      ads.forEach((ad) => {
        const src = ad?.imageUrl || ad?.image_url;
        if (src) {
          const img = new Image();
          img.src = src;
        }
      });
    }
  }, [ads]);

  // 4. Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 480);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // 5. Crossfade rotation for reduced-motion mode
  useEffect(() => {
    if (!prefersReducedMotion || ads.length <= 1) return;
    const interval = setInterval(() => {
      if (isTabVisible && !paused) {
        setActiveReducedIndex((prev) => (prev + 1) % ads.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, ads.length, isTabVisible, paused]);

  // If ads are disabled globally or no ads or dismissed, collapse completely
  if (!adsEnabled || !ads || ads.length === 0 || isDismissed) {
    return null;
  }

  // Calculate repeat count to ensure cycle is wider than screen
  // Assume each ad banner has an average width around 220px
  const estimatedAdWidth = 220;
  const singleSetWidth = Math.max(1, ads.length * estimatedAdWidth);
  const minRequiredCycleWidth = Math.max(containerWidth * 1.5, 600);
  const repeatCount = Math.max(1, Math.ceil(minRequiredCycleWidth / singleSetWidth));

  // Build one single cycle of repeated items
  const cycleItems = [];
  for (let r = 0; r < repeatCount; r++) {
    ads.forEach((ad, idx) => {
      cycleItems.push({
        ...ad,
        _uniqueKey: `${ad.id || idx}-${r}`
      });
    });
  }

  // Animation duration: constant speed (px / second)
  // One cycle length in pixels roughly = cycleItems.length * estimatedAdWidth
  const approxCyclePx = Math.max(containerWidth, cycleItems.length * estimatedAdWidth);
  const safeSpeed = Math.max(15, Number(speed) || 40);
  const durationSec = Math.max(8, approxCyclePx / safeSpeed);

  const isR2L = position === 'top';
  const animationName = isR2L ? 'marqueeScrollR2L' : 'marqueeScrollL2R';
  const isAnimationPaused = paused || !isTabVisible;

  // Render individual ad item
  const renderAdItem = (ad, key) => {
    const clickUrl = ad.clickUrl || ad.linkUrl || ad.click_url || ad.link_url;
    const fit = ad.imageFit || 'contain';

    const content = (
      <div
        key={key}
        style={{
          height: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          boxSizing: 'border-box',
          flexShrink: 0,
          gap: '8px'
        }}
      >
        {(ad.imageUrl || ad.image_url) ? (
          <img
            src={ad.imageUrl || ad.image_url}
            alt={ad.title || 'Sponsor Ad'}
            style={{
              height: `calc(100% - 10px)`,
              maxHeight: `${Math.max(28, height - 10)}px`,
              width: 'auto',
              objectFit: fit,
              borderRadius: '6px',
              display: 'block'
            }}
            loading="eager"
          />
        ) : (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            {ad.title}
          </div>
        )}
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            padding: '2px 5px',
            borderRadius: '4px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Ad
        </span>
      </div>
    );

    if (clickUrl) {
      return (
        <a
          key={key}
          href={clickUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            height: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
            cursor: 'pointer'
          }}
          title={ad.title || 'Open sponsor link'}
        >
          {content}
        </a>
      );
    }

    return content;
  };

  // Base Docking & Wrapper Styles
  const isBottom = position === 'bottom';
  const wrapperStyle = isBottom
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: theme === 'dark' ? 'rgba(10, 15, 29, 0.95)' : 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.35)',
        boxSizing: 'border-box',
        ...style
      }
    : {
        width: '100%',
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.9)',
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '0.85rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
        boxSizing: 'border-box',
        ...style
      };

  return (
    <div
      ref={containerRef}
      className={`mobile-ad-strip mobile-ad-strip-${position} ${className}`}
      style={wrapperStyle}
    >
      {/* Keyframe definitions injected once per component */}
      <style>{`
        @keyframes marqueeScrollR2L {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes marqueeScrollL2R {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      {/* Reduced Motion Crossfade Fallback */}
      {prefersReducedMotion ? (
        <div
          style={{
            height: `${height}px`,
            maxWidth: '480px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {ads.map((ad, idx) => {
            const isCurrent = idx === activeReducedIndex;
            return (
              <div
                key={ad.id || idx}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isCurrent ? 1 : 0,
                  transition: 'opacity 0.6s ease-in-out',
                  pointerEvents: isCurrent ? 'auto' : 'none'
                }}
              >
                {renderAdItem(ad, `reduced-${ad.id || idx}`)}
              </div>
            );
          })}
        </div>
      ) : (
        /* Continuous Seamless Infinite Marquee Track */
        <div
          style={{
            height: `${height}px`,
            maxWidth: isBottom ? '480px' : '100%',
            margin: '0 auto',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            paddingRight: isBottom ? '44px' : '0',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '100%',
              whiteSpace: 'nowrap',
              willChange: 'transform',
              animation: `${animationName} ${durationSec}s linear infinite`,
              animationPlayState: isAnimationPaused ? 'paused' : 'running'
            }}
          >
            {/* First Cycle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
              {cycleItems.map((ad, idx) => renderAdItem(ad, `c1-${ad._uniqueKey || idx}`))}
            </div>
            {/* Duplicate Second Cycle (Seamless loop connector) */}
            <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
              {cycleItems.map((ad, idx) => renderAdItem(ad, `c2-${ad._uniqueKey || idx}`))}
            </div>
          </div>
        </div>
      )}

      {/* Dismiss Button for bottom strip */}
      {isBottom && (
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem('dismissed_mobile_bottom_ad', 'true');
            } catch (e) {}
            setIsDismissed(true);
          }}
          aria-label="Close sponsor banner"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
            border: 'none',
            color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1
          }}
          title="Dismiss ad for this session"
        >
          ✕
        </button>
      )}
    </div>
  );
}
