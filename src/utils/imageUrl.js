/**
 * Utility for generating high-performance, compressed, responsive image URLs.
 * Routes images through the backend sharp image optimization pipeline (/api/images/optimize).
 */

const getBackendBaseUrl = () => {
  // Always return empty string so image requests are relative to current site origin (/api/images/optimize).
  // This ensures zero loopback/CORS issues and allows seamless domain migration without hardcoded URLs.
  return '';
};

/**
 * Transforms an image source into an optimized, cached, responsive variant
 * @param {string} src - Local /uploads path or external HTTP/HTTPS URL
 * @param {object} options - Sizing and format options
 * @returns {string} Optimized URL
 */
export const getOptimizedImageUrl = (src, options = {}) => {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return '';
  }

  const cleanSrc = src.trim();

  // Do not transform vector SVGs or inline data URIs
  if (cleanSrc.startsWith('data:') || cleanSrc.toLowerCase().endsWith('.svg')) {
    return cleanSrc;
  }

  const {
    width,
    height,
    quality = 82,
    format = 'auto',
    fit
  } = options;

  const baseUrl = getBackendBaseUrl();
  const params = new URLSearchParams();

  params.set('url', cleanSrc);
  if (width) params.set('w', String(width));
  if (height) params.set('h', String(height));
  if (quality) params.set('q', String(quality));
  if (format && format !== 'auto') params.set('fmt', format);
  if (fit) params.set('fit', fit);

  return `${baseUrl}/api/images/optimize?${params.toString()}`;
};

/**
 * Generate responsive srcSet with 1x and 2x pixel densities
 */
export const getOptimizedSrcSet = (src, baseWidth = 400, options = {}) => {
  if (!src || typeof src !== 'string' || src.startsWith('data:') || src.toLowerCase().endsWith('.svg')) {
    return undefined;
  }

  const url1x = getOptimizedImageUrl(src, { ...options, width: baseWidth });
  const url2x = getOptimizedImageUrl(src, { ...options, width: baseWidth * 2 });

  return `${url1x} 1x, ${url2x} 2x`;
};

// Preset Helpers
export const getAvatarUrl = (src, size = 128) =>
  getOptimizedImageUrl(src, { width: size, height: size, fit: 'cover', quality: 80 });

export const getTeamLogoUrl = (src, size = 96) =>
  getOptimizedImageUrl(src, { width: size, height: size, fit: 'contain', quality: 85 });

export const getThumbnailUrl = (src, width = 240) =>
  getOptimizedImageUrl(src, { width, quality: 78 });

export const getCardImageUrl = (src, width = 450) =>
  getOptimizedImageUrl(src, { width, quality: 82 });

export const getBannerImageUrl = (src, width = 1200) =>
  getOptimizedImageUrl(src, { width, quality: 84 });

export default {
  getOptimizedImageUrl,
  getOptimizedSrcSet,
  getAvatarUrl,
  getTeamLogoUrl,
  getThumbnailUrl,
  getCardImageUrl,
  getBannerImageUrl
};

