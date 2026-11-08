'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPublicBrandingApi } from '../../services/adminService';
import { getSocket } from '../../services/socket';

const DEFAULT_BRANDING = {
  appName: 'TurfSpot',
  appTagline: 'Sports Hub',
  logoUrl: '/logo.png',
  faviconUrl: '/favicon.ico',
  contactEmail: 'support@turfspot.com',
  updatedAt: null,
  isCustomLogo: false,
  isCustomFavicon: false
};

const BrandingContext = createContext({
  ...DEFAULT_BRANDING,
  loading: true,
  refreshBranding: async () => {}
});

export const useBranding = () => useContext(BrandingContext);

export default function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const applyBrandingToDocument = useCallback((brandData) => {
    if (typeof window === 'undefined' || !brandData) return;

    const { appName, faviconUrl } = brandData;

    // 1. Update Document Title if it mentions TurfSpot or if title is generic
    try {
      if (appName && appName !== 'TurfSpot' && document.title) {
        if (document.title.includes('TurfSpot')) {
          document.title = document.title.replace(/TurfSpot/g, appName);
        }
      }
    } catch (e) {
      // safe fallback
    }

    // 2. Update Browser Favicon dynamically
    try {
      if (faviconUrl) {
        const timestamp = brandData.updatedAt ? new Date(brandData.updatedAt).getTime() : Date.now();
        const versionedFavicon = faviconUrl.includes('?') 
          ? `${faviconUrl}&t=${timestamp}` 
          : `${faviconUrl}?t=${timestamp}`;

        // Find or create favicon links
        let iconLinks = document.querySelectorAll("link[rel*='icon']");
        if (iconLinks.length === 0) {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = versionedFavicon;
          document.head.appendChild(newLink);
        } else {
          iconLinks.forEach((link) => {
            link.href = versionedFavicon;
          });
        }
      }
    } catch (e) {
      // safe fallback
    }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await getPublicBrandingApi();
      if (res && res.success && res.data) {
        setBranding((prev) => ({
          ...prev,
          ...res.data
        }));
        applyBrandingToDocument(res.data);
      }
    } catch (err) {
      console.warn('Could not load dynamic branding settings, using defaults.', err);
    } finally {
      setLoading(false);
    }
  }, [applyBrandingToDocument]);

  // Initial fetch on mount
  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Real-time socket subscription for instant updates across all open sessions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socket;
    try {
      socket = getSocket();
    } catch (e) {
      return;
    }

    if (!socket) return;

    const handleBrandingUpdated = (payload) => {
      if (payload) {
        setBranding((prev) => ({
          ...prev,
          ...payload
        }));
        applyBrandingToDocument(payload);
      } else {
        fetchBranding();
      }
    };

    socket.on('system:branding_updated', handleBrandingUpdated);

    return () => {
      try {
        socket.off('system:branding_updated', handleBrandingUpdated);
      } catch (e) {}
    };
  }, [applyBrandingToDocument, fetchBranding]);

  return (
    <BrandingContext.Provider
      value={{
        ...branding,
        loading,
        refreshBranding: fetchBranding
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

