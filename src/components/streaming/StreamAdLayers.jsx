'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Clock, ExternalLink, Sparkles } from 'lucide-react';

/**
 * Top Ad Strip for Live Stream Player
 * Continuous marquee moving Right -> Left above the 16:9 player
 */
export function StreamTopAdStrip({
  ads = [],
  height = 48,
  speed = 45,
  paused = false,
  adsEnabled = true
}) {
  const [containerWidth, setContainerWidth] = useState(640);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth || 640);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!adsEnabled || !ads || ads.length === 0) return null;

  const estimatedItemWidth = 200;
  const singleSetWidth = Math.max(1, ads.length * estimatedItemWidth);
  const minRequiredCycleWidth = Math.max(containerWidth * 1.5, 600);
  const repeatCount = Math.max(1, Math.ceil(minRequiredCycleWidth / singleSetWidth));

  const cycleItems = [];
  for (let r = 0; r < repeatCount; r++) {
    ads.forEach((ad, idx) => {
      cycleItems.push({ ...ad, _uniqueKey: `${ad.id || idx}-${r}` });
    });
  }

  const approxCyclePx = Math.max(containerWidth, cycleItems.length * estimatedItemWidth);
  const safeSpeed = Math.max(15, Number(speed) || 45);
  const durationSec = Math.max(8, approxCyclePx / safeSpeed);

  const renderItem = (ad, key) => {
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
              maxHeight: `${Math.max(26, height - 10)}px`,
              width: 'auto',
              objectFit: fit,
              borderRadius: '6px',
              display: 'block'
            }}
            loading="eager"
          />
        ) : (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
            {ad.title}
          </span>
        )}
        <span
          style={{
            fontSize: '8px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 5px',
            borderRadius: '4px',
            lineHeight: 1
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
          style={{ height: '100%', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          title={ad.title || 'Open sponsor link'}
        >
          {content}
        </a>
      );
    }
    return content;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(10, 15, 29, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        zIndex: 5
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '100%',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: `marqueeScrollR2L ${durationSec}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
          {cycleItems.map((ad, idx) => renderItem(ad, `top-c1-${ad._uniqueKey || idx}`))}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
          {cycleItems.map((ad, idx) => renderItem(ad, `top-c2-${ad._uniqueKey || idx}`))}
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom Ad Strip for Live Stream Player
 * Continuous marquee moving Left -> Right below the 16:9 player
 */
export function StreamBottomAdStrip({
  ads = [],
  height = 52,
  speed = 45,
  paused = false,
  adsEnabled = true
}) {
  const [containerWidth, setContainerWidth] = useState(640);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth || 640);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!adsEnabled || !ads || ads.length === 0) return null;

  const estimatedItemWidth = 200;
  const singleSetWidth = Math.max(1, ads.length * estimatedItemWidth);
  const minRequiredCycleWidth = Math.max(containerWidth * 1.5, 600);
  const repeatCount = Math.max(1, Math.ceil(minRequiredCycleWidth / singleSetWidth));

  const cycleItems = [];
  for (let r = 0; r < repeatCount; r++) {
    ads.forEach((ad, idx) => {
      cycleItems.push({ ...ad, _uniqueKey: `${ad.id || idx}-${r}` });
    });
  }

  const approxCyclePx = Math.max(containerWidth, cycleItems.length * estimatedItemWidth);
  const safeSpeed = Math.max(15, Number(speed) || 45);
  const durationSec = Math.max(8, approxCyclePx / safeSpeed);

  const renderItem = (ad, key) => {
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
              maxHeight: `${Math.max(26, height - 10)}px`,
              width: 'auto',
              objectFit: fit,
              borderRadius: '6px',
              display: 'block'
            }}
            loading="eager"
          />
        ) : (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
            {ad.title}
          </span>
        )}
        <span
          style={{
            fontSize: '8px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 5px',
            borderRadius: '4px',
            lineHeight: 1
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
          style={{ height: '100%', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          title={ad.title || 'Open sponsor link'}
        >
          {content}
        </a>
      );
    }
    return content;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(10, 15, 29, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        zIndex: 5
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '100%',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: `marqueeScrollL2R ${durationSec}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
          {cycleItems.map((ad, idx) => renderItem(ad, `bot-c1-${ad._uniqueKey || idx}`))}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
          {cycleItems.map((ad, idx) => renderItem(ad, `bot-c2-${ad._uniqueKey || idx}`))}
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar Ad Zone (Left or Right of player)
 * Rotating sponsor card with smooth crossfade
 */
export function StreamSidebarAdZone({
  position = 'left',
  ads = [],
  width = 140,
  interval = 6,
  paused = false,
  adsEnabled = true
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!ads || ads.length <= 1 || paused) return;
    const durMs = Math.max(3000, (Number(interval) || 6) * 1000);
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % ads.length);
    }, durMs);
    return () => clearInterval(timer);
  }, [ads, interval, paused]);

  if (!adsEnabled || !ads || ads.length === 0) return null;

  const currentAd = ads[activeIndex % ads.length];
  if (!currentAd) return null;

  const clickUrl = currentAd.clickUrl || currentAd.linkUrl || currentAd.click_url || currentAd.link_url;
  const isLeft = position === 'left';

  const content = (
    <div
      style={{
        width: `${width}px`,
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 15, 29, 0.92)',
        borderRight: isLeft ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        borderLeft: !isLeft ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        padding: '12px 8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
        cursor: clickUrl ? 'pointer' : 'default',
        textDecoration: 'none'
      }}
    >
      <div
        key={currentAd.id || activeIndex}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.5s ease-in-out',
          gap: '8px'
        }}
      >
        <span
          style={{
            fontSize: '8px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          Partner
        </span>

        {(currentAd.imageUrl || currentAd.image_url) ? (
          <img
            src={currentAd.imageUrl || currentAd.image_url}
            alt={currentAd.title || 'Sponsor Ad'}
            style={{
              maxWidth: '100%',
              maxHeight: '180px',
              objectFit: currentAd.imageFit || 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          />
        ) : (
          <div
            style={{
              padding: '8px',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#f8fafc'
            }}
          >
            {currentAd.title}
          </div>
        )}

        {currentAd.description && (
          <span
            style={{
              fontSize: '0.72rem',
              color: '#cbd5e1',
              textAlign: 'center',
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {currentAd.description}
          </span>
        )}
      </div>
    </div>
  );

  if (clickUrl) {
    return (
      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', height: '100%' }}
        title={currentAd.title || 'Open sponsor link'}
      >
        {content}
      </a>
    );
  }

  return content;
}

/**
 * Match Break Mode Overlay
 * Appears over the video area during match breaks/timeouts/intervals.
 * Rotates full-player STREAM_BREAK sponsor creatives with countdown.
 * The underlying stream keeps playing undisturbed.
 */
export function MatchBreakOverlay({
  breakState = {},
  breakAds = [],
  fallbackAds = [],
  breakInterval = 5
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(null);

  const activeAds = breakAds.length > 0 ? breakAds : fallbackAds;

  // Rotate through break ads every breakInterval seconds
  useEffect(() => {
    if (activeAds.length <= 1) return;
    const durMs = Math.max(3000, (Number(breakInterval) || 5) * 1000);
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % activeAds.length);
    }, durMs);
    return () => clearInterval(timer);
  }, [activeAds, breakInterval]);

  // Live countdown to expectedEndAt
  useEffect(() => {
    if (!breakState?.expectedEndAt) {
      setRemainingSecs(null);
      return;
    }

    const updateTimer = () => {
      const endMs = new Date(breakState.expectedEndAt).getTime();
      const diffSec = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setRemainingSecs(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [breakState?.expectedEndAt]);

  const formatCountdown = (secs) => {
    if (secs == null) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentAd = activeAds.length > 0 ? activeAds[activeIndex % activeAds.length] : null;
  const clickUrl = currentAd?.clickUrl || currentAd?.linkUrl || currentAd?.click_url || currentAd?.link_url;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.94), rgba(15, 23, 42, 0.97))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'clamp(12px, 2.5vw, 24px)',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.4s ease-out',
        color: '#ffffff'
      }}
    >
      {/* Top Header: Break Status Badge & Countdown */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          zIndex: 2
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.25)'
            }}
          >
            <Coffee size={14} />
            Break • Back Soon
          </span>

          {breakState.reason && (
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0'
              }}
            >
              {breakState.reason}
            </span>
          )}
        </div>

        {remainingSecs != null && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              background: remainingSecs > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${remainingSecs > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: remainingSecs > 0 ? '#34d399' : '#f87171'
            }}
          >
            <Clock size={14} />
            {remainingSecs > 0 ? `${formatCountdown(remainingSecs)} remaining` : 'Resuming momentarily…'}
          </div>
        )}
      </div>

      {/* Center: Full-player Sponsor Creative Carousel */}
      <div
        style={{
          flex: '1 1 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '8px 0',
          boxSizing: 'border-box'
        }}
      >
        {currentAd ? (
          <div
            key={currentAd.id || activeIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              maxWidth: '90%',
              maxHeight: '100%'
            }}
          >
            {(currentAd.imageUrl || currentAd.image_url) ? (
              <a
                href={clickUrl || '#'}
                target={clickUrl ? '_blank' : '_self'}
                rel={clickUrl ? 'noopener noreferrer' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  cursor: clickUrl ? 'pointer' : 'default',
                  maxHeight: 'min(240px, 45vh)'
                }}
              >
                <img
                  src={currentAd.imageUrl || currentAd.image_url}
                  alt={currentAd.title || 'Break Sponsor'}
                  style={{
                    maxHeight: 'min(240px, 45vh)',
                    maxWidth: '100%',
                    objectFit: currentAd.imageFit || 'contain',
                    borderRadius: '12px',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
                  }}
                />
              </a>
            ) : null}

            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(56, 189, 248, 0.25)'
                  }}
                >
                  Break Sponsor
                </span>
                {clickUrl && (
                  <a
                    href={clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <h4 style={{ margin: '4px 0 2px 0', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                {currentAd.title}
              </h4>
              {currentAd.description && (
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', maxWidth: '480px' }}>
                  {currentAd.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Clean fallback card when zero break ads exist */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '12px',
              padding: '2rem'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              <Coffee size={28} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                Match Break In Progress
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
                Teams are taking a quick interval. Live action will resume shortly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer so overlay doesn't collide with lower-third scoreboard */}
      <div style={{ height: '40px', width: '100%' }} />
    </div>
  );
}
