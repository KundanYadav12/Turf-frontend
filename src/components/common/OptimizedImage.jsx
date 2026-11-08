'use client';
import React, { useState, useEffect } from 'react';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../../utils/imageUrl';

const PRESET_CONFIGS = {
  avatar: { width: 128, height: 128, fit: 'cover', quality: 80 },
  logo: { width: 96, height: 96, fit: 'contain', quality: 85 },
  card: { width: 450, fit: 'inside', quality: 82 },
  banner: { width: 1200, fit: 'inside', quality: 84 },
  thumbnail: { width: 240, fit: 'inside', quality: 78 }
};

/**
 * Universal Optimized Image Component for Next.js / React:
 * - Automatically resizes, compresses & converts images via backend /api/images/optimize
 * - Modern WebP/AVIF format negotiation
 * - Native lazy loading & async decoding (with priority override for hero banners)
 * - Anti-CLS lightweight shimmer skeleton placeholder
 * - Graceful fade-in on load
 * - Fallback handling on network/image load failure
 */
export const OptimizedImage = ({
  src,
  alt = 'Image',
  width,
  height,
  preset,
  quality = 82,
  fit,
  priority = false,
  className = '',
  style = {},
  objectFit = 'cover',
  fallbackSrc,
  fallbackText,
  onClick,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src && !fallbackSrc && !fallbackText) {
    return (
      <div
        className={`image-placeholder ${className}`}
        style={{
          width: width || '100%',
          height: height || '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: style.borderRadius || 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '0.75rem',
          ...style
        }}
      >
        <span>No image</span>
      </div>
    );
  }

  // Resolve preset sizing
  const presetConfig = preset ? PRESET_CONFIGS[preset] || {} : {};
  const targetWidth = width || presetConfig.width;
  const targetHeight = height || presetConfig.height;
  const targetFit = fit || presetConfig.fit || (targetHeight ? 'cover' : 'inside');
  const targetQuality = quality || presetConfig.quality || 82;

  // Resolve optimized URL
  const optimizedUrl = getOptimizedImageUrl(src || fallbackSrc, {
    width: targetWidth,
    height: targetHeight,
    quality: targetQuality,
    fit: targetFit
  });

  const srcSet = targetWidth && !src?.toLowerCase().endsWith('.svg')
    ? getOptimizedSrcSet(src || fallbackSrc, targetWidth, {
        height: targetHeight,
        quality: targetQuality,
        fit: targetFit
      })
    : undefined;

  if (hasError && fallbackText) {
    return (
      <div
        className={`image-fallback-text ${className}`}
        style={{
          width: width || '100%',
          height: height || '100%',
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          fontWeight: 800,
          borderRadius: style.borderRadius || 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typeof targetWidth === 'number' ? Math.max(targetWidth * 0.38, 12) : '1rem',
          textTransform: 'uppercase',
          ...style
        }}
        onClick={onClick}
      >
        {String(fallbackText).slice(0, 2)}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: style.display || 'inline-block',
        width: width || (style.width ? style.width : '100%'),
        height: height || (style.height ? style.height : '100%'),
        overflow: 'hidden',
        borderRadius: style.borderRadius || 0,
        backgroundColor: 'rgba(255, 255, 255, 0.04)'
      }}
      className={className}
    >
      {/* Lightweight CSS Shimmer Placeholder */}
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
            backgroundSize: '200% 100%',
            animation: 'optimizedImageShimmer 1.6s infinite linear',
            borderRadius: style.borderRadius || 0,
            zIndex: 1
          }}
        />
      )}

      {/* Optimized Native Image */}
      <img
        src={hasError && fallbackSrc ? fallbackSrc : (optimizedUrl || src)}
        srcSet={hasError ? undefined : srcSet}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError && fallbackSrc) {
            setHasError(true);
          } else {
            setHasError(true);
            setIsLoaded(true);
          }
        }}
        onClick={onClick}
        style={{
          width: '100%',
          height: '100%',
          objectFit: objectFit || style.objectFit || 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.22s ease-in-out',
          display: 'block',
          ...style
        }}
        {...props}
      />

      <style jsx global>{`
        @keyframes optimizedImageShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default OptimizedImage;

