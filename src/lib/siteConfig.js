/**
 * Centralized Domain & Public URL Configuration (Frontend)
 * Reads base domain from NEXT_PUBLIC_APP_URL with safe fallbacks and trailing-slash normalization.
 */

const normalizeUrl = (url, fallback = '') => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }
  return url.trim().replace(/\/+$/, '');
};

// 1. Centralized Public Web Application URL
export const APP_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL,
  'https://playzo.duckdns.org'
);

// 2. Centralized Public API URL (e.g. https://playzo.duckdns.org/api)
export const API_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL || `${APP_URL}/api`,
  'https://playzo.duckdns.org/api'
);

// 3. Server-side Backend URL for Next.js SSR & API Rewrites (internal network address)
export const BACKEND_URL = normalizeUrl(
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL,
  'http://localhost:5008'
);

// 4. Real-time WebSocket connection URL
export const SOCKET_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL,
  APP_URL
);

// 5. App Brand Name
export const SITE_NAME = 'TurfSpot';

/**
 * Builds an absolute public URL with path cleanly normalized
 * Avoids malformed URLs and duplicate slashes.
 * @param {string} path - e.g. '/tournaments' or 'venue/1'
 * @returns {string} - e.g. 'https://playzo.duckdns.org/tournaments'
 */
export const buildAbsoluteUrl = (path = '') => {
  if (!path || path === '/') return APP_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const trimmed = cleanPath.length > 1 && cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;
  return `${APP_URL}${trimmed}`;
};

/**
 * Builds a public shareable URL
 * @param {string} resource - 'tournaments' | 'matches' | 'teams' | 'venue' | 'tv'
 * @param {string|number} idOrSlug
 * @returns {string}
 */
export const buildShareUrl = (resource, idOrSlug) => {
  if (!idOrSlug) return buildAbsoluteUrl(resource);
  return buildAbsoluteUrl(`/${resource}/${idOrSlug}`);
};

/**
 * Builds a Smart TV full-screen signage display URL
 * @param {string|number} displayId
 * @returns {string} - e.g. 'https://playzo.duckdns.org/tv/tv_arena_main_01'
 */
export const buildTVDisplayUrl = (displayId = '') => {
  return buildAbsoluteUrl(`/tv/${displayId}`);
};

export default {
  APP_URL,
  API_URL,
  BACKEND_URL,
  SOCKET_URL,
  SITE_NAME,
  buildAbsoluteUrl,
  buildShareUrl,
  buildTVDisplayUrl
};
