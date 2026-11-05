'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Preload and cache HTMLImageElements with crossOrigin="anonymous"
 * for safe canvas drawing without tainting.
 */
const imageCache = new Map();

export function getCachedLogoImage(src) {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  img.onload = () => {
    img._isLoaded = true;
  };
  img.onerror = () => {
    img._hasError = true;
  };
  imageCache.set(src, img);
  return img;
}

/**
 * Helper to parse size percentage from sizePreset or width string.
 * Small -> 8%, Medium -> 12% (default), Large -> 16%
 */
export function resolveLogoSizePercent(ad) {
  if (!ad) return 12;
  const preset = String(ad.sizePreset || ad.size_preset || '').toUpperCase();
  if (preset === 'SMALL' || preset === 'SM' || preset === '8%') return 8;
  if (preset === 'LARGE' || preset === 'LG' || preset === '16%') return 16;
  if (preset === 'MEDIUM' || preset === 'MD' || preset === '12%') return 12;

  // Try parsing width string like '8%', '12%', '16%'
  const wStr = String(ad.width || '');
  const match = wStr.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val >= 4 && val <= 30) return val;
  }
  return 12; // default Medium (12%)
}

/**
 * Helper to resolve margin percentage (default 2% of video width)
 */
export function resolveLogoMargin(ad) {
  if (!ad) return '2%';
  const m = String(ad.margin || '2%').trim();
  if (m.endsWith('%') || m.endsWith('px') || m.endsWith('rem') || m.endsWith('vw')) {
    return m;
  }
  const num = parseFloat(m);
  return !isNaN(num) ? `${num}%` : '2%';
}

/**
 * Helper to resolve logo opacity (30-100%, default 100%)
 */
export function resolveLogoOpacity(ad) {
  if (!ad) return 1;
  const op = ad.opacity != null ? Number(ad.opacity) : 100;
  if (isNaN(op)) return 1;
  const clamped = Math.min(100, Math.max(30, op));
  return clamped / 100;
}

/**
 * StreamCornerLogo Component
 * Renders Top-Left or Top-Right logo overlay inside live video frame.
 */
export function StreamCornerLogo({
  position = 'top-left', // 'top-left' | 'top-right' | 'STREAM_TOP_LEFT' | 'STREAM_TOP_RIGHT'
  logos = [],
  adsEnabled = true,
  isBroadcastPreview = false,
  customStyle = {}
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState(new Set());
  const [fadeState, setFadeState] = useState('visible'); // 'visible' | 'fading'

  const isTopLeft = position === 'top-left' || position === 'STREAM_TOP_LEFT' || position === 'top_left';
  
  // Filter out logos that have failed to load or are inactive
  const validLogos = (Array.isArray(logos) ? logos : []).filter(
    (logo) => logo && logo.status !== 'INACTIVE' && (logo.imageUrl || logo.image_url) && !failedUrls.has(logo.imageUrl || logo.image_url)
  );

  // Preload images into cache
  useEffect(() => {
    validLogos.forEach(l => {
      const src = l.imageUrl || l.image_url;
      if (src) getCachedLogoImage(src);
    });
  }, [validLogos]);

  // Rotation timer if multiple logos exist
  useEffect(() => {
    if (validLogos.length <= 1) return;

    const currentLogo = validLogos[activeIndex % validLogos.length];
    const intervalSec = Math.max(3, parseInt(currentLogo?.slideInterval || currentLogo?.slide_interval || 8, 10));
    const intervalMs = intervalSec * 1000;

    const timer = setInterval(() => {
      // Begin fade out
      setFadeState('fading');
      setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % validLogos.length);
        setFadeState('visible');
      }, 350); // 350ms transition
    }, intervalMs);

    return () => clearInterval(timer);
  }, [validLogos.length, activeIndex, validLogos]);

  if (!adsEnabled || validLogos.length === 0) return null;

  const currentLogo = validLogos[activeIndex % validLogos.length];
  if (!currentLogo) return null;

  const imageUrl = currentLogo.imageUrl || currentLogo.image_url;
  const clickUrl = currentLogo.clickUrl || currentLogo.linkUrl || currentLogo.click_url || currentLogo.link_url;
  const sizePercent = resolveLogoSizePercent(currentLogo);
  const margin = resolveLogoMargin(currentLogo);
  const opacity = resolveLogoOpacity(currentLogo);

  const handleImageError = () => {
    console.warn(`[StreamCornerLogo] Logo failed to load: ${imageUrl}`);
    setFailedUrls(prev => new Set([...prev, imageUrl]));
  };

  const cornerPositionStyle = isTopLeft
    ? {
        top: `max(${margin}, env(safe-area-inset-top, 0px))`,
        left: `max(${margin}, env(safe-area-inset-left, 0px))`
      }
    : {
        top: `max(${margin}, env(safe-area-inset-top, 0px))`,
        right: `max(${margin}, env(safe-area-inset-right, 0px))`
      };

  const logoContent = (
    <div
      style={{
        position: 'absolute',
        ...cornerPositionStyle,
        width: `${sizePercent}%`,
        maxWidth: '160px',
        minWidth: '36px',
        aspectRatio: 'auto',
        zIndex: 22,
        pointerEvents: (!isBroadcastPreview && clickUrl) ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isTopLeft ? 'flex-start' : 'flex-end',
        transition: 'opacity 0.35s ease-in-out',
        opacity: fadeState === 'fading' ? 0 : opacity,
        filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.65))',
        ...customStyle
      }}
      title={currentLogo.title || 'Corner Logo'}
    >
      <img
        src={imageUrl}
        alt={currentLogo.title || 'Tournament / Sponsor Logo'}
        crossOrigin="anonymous"
        onError={handleImageError}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '18vh',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        loading="eager"
      />
    </div>
  );

  // Link is active ONLY on web viewer player, never on broadcast preview
  if (!isBroadcastPreview && clickUrl) {
    return (
      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', zIndex: 22 }}
        title={currentLogo.title || 'Visit Sponsor'}
      >
        {logoContent}
      </a>
    );
  }

  return logoContent;
}

/**
 * Canvas Drawing Helper for Burned-in Broadcast Video
 * Draws active corner logos directly onto a 2D canvas context.
 */
export function drawCornerLogosToCanvas(ctx, width, height, { topLeftAd = null, topRightAd = null }) {
  if (!ctx || !width || !height) return;

  const drawLogo = (ad, isTopLeft) => {
    if (!ad) return;
    const src = ad.imageUrl || ad.image_url;
    if (!src) return;

    const img = getCachedLogoImage(src);
    if (!img || !img._isLoaded || img._hasError || !img.naturalWidth) return;

    const sizePercent = resolveLogoSizePercent(ad);
    const logoWidth = width * (sizePercent / 100);
    const aspect = img.naturalHeight / img.naturalWidth;
    const logoHeight = logoWidth * aspect;

    const marginPercent = 0.02; // 2%
    const marginPx = width * marginPercent;

    const x = isTopLeft ? marginPx : width - logoWidth - marginPx;
    const y = marginPx;

    const opacity = resolveLogoOpacity(ad);

    ctx.save();
    ctx.globalAlpha = opacity;
    // Add subtle broadcast shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.drawImage(img, x, y, logoWidth, logoHeight);
    ctx.restore();
  };

  if (topLeftAd) drawLogo(topLeftAd, true);
  if (topRightAd) drawLogo(topRightAd, false);
}

export default StreamCornerLogo;

