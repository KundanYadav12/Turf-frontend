'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getPublicBrandingApi } from '../../services/adminService';
import { getSocket } from '../../services/socket';

const DEFAULT_BRANDING = {
  appName: 'TurfSpot',
  appTagline: 'Sports Hub',
  logoUrl: '/logo.png',
  faviconUrl: '/favicon.ico',
  contactEmail: 'support@turfspot.com',
  showExploreVenues: true,
  showMyBookings: true,
  showChatImageUpload: true,
  disableRightClick: false,
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

  const updateBrandingState = useCallback((newBranding) => {
    if (!newBranding) return;
    setBranding((prev) => ({
      ...prev,
      ...newBranding
    }));
    applyBrandingToDocument(newBranding);
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

  // Security Feature: Mouse Right-Click & DevTools Prevention Toggle
  const [securityToast, setSecurityToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showSecurityWarning = useCallback((message = 'Right click is disabled') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSecurityToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setSecurityToast(null);
    }, 2000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!branding.disableRightClick) {
      return;
    }

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Right click is disabled');
      return false;
    };

    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Right click is disabled');
        return false;
      }
      // Ctrl+Shift+I / J / C (Inspect / Console)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Right click is disabled');
        return false;
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Right click is disabled');
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [branding.disableRightClick, showSecurityWarning]);

  return (
    <BrandingContext.Provider
      value={{
        ...branding,
        loading,
        refreshBranding: fetchBranding,
        updateBrandingState
      }}
    >
      {children}
      {securityToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <span>{securityToast}</span>
        </div>
      )}
    </BrandingContext.Provider>
  );
}

