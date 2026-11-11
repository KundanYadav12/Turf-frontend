'use client';
import React, { useState, useEffect } from 'react';
import {
  Sliders, MapPin, Calendar, Image as ImageIcon,
  CheckCircle, AlertCircle, RefreshCw, Shield, Info, Lock
} from 'lucide-react';
import { getBrandingAdminApi, updateFeatureTogglesApi } from '../../services/adminService';
import { useBranding } from '../providers/BrandingProvider';

export default function FeatureTogglesPanel() {
  const { refreshBranding, updateBrandingState } = useBranding();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null); // which toggle is saving
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  const [toggles, setToggles] = useState({
    showExploreVenues: true,
    showMyBookings: true,
    showChatImageUpload: true,
    disableRightClick: false
  });

  useEffect(() => {
    loadToggleSettings();
  }, []);

  const loadToggleSettings = async () => {
    try {
      setLoading(true);
      const res = await getBrandingAdminApi();
      if (res.success && res.data) {
        setToggles({
          showExploreVenues: res.data.showExploreVenues !== false,
          showMyBookings: res.data.showMyBookings !== false,
          showChatImageUpload: res.data.showChatImageUpload !== false,
          disableRightClick: res.data.disableRightClick === true
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to load platform feature settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const nextVal = !toggles[key];
    const newToggles = { ...toggles, [key]: nextVal };

    // Optimistic UI update
    setToggles(newToggles);
    setSavingKey(key);
    setFeedback(null);

    try {
      const res = await updateFeatureTogglesApi(newToggles);
      if (res.success) {
        if (updateBrandingState && res.data) {
          updateBrandingState(res.data);
        }
        const featureName =
          key === 'showExploreVenues'
            ? 'Explore Venues'
            : key === 'showMyBookings'
            ? 'My Bookings'
            : key === 'showChatImageUpload'
            ? 'Chat Image Upload'
            : 'Mouse Right-Click Security';

        const stateLabel =
          key === 'disableRightClick'
            ? nextVal
              ? 'ON (Right-Click & Inspect Disabled for Security)'
              : 'OFF (Right-Click Allowed)'
            : nextVal
            ? 'ON (Visible to Everyone)'
            : 'OFF (Hidden Across Platform)';

        setFeedback({
          type: 'success',
          message: `Successfully updated ${featureName} to ${stateLabel}.`
        });
        refreshBranding();
      }
    } catch (err) {
      // Revert on error
      setToggles((prev) => ({ ...prev, [key]: !nextVal }));
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update feature toggle setting.'
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading platform feature controls...</p>
      </div>
    );
  }

  const toggleConfigs = [
    {
      key: 'showExploreVenues',
      title: 'Explore Venues Navigation Tab',
      description: "Controls the visibility of the 'Explore Venues' tab in the top navigation bar and left sidebar navigation. When OFF, the tab is completely hidden across the platform.",
      icon: MapPin,
      iconColor: '#10b981',
      activeLabel: 'VISIBLE TO EVERYONE',
      inactiveLabel: 'HIDDEN ACROSS PLATFORM'
    },
    {
      key: 'showMyBookings',
      title: 'My Bookings Navigation Tab',
      description: "Controls the visibility of the 'My Bookings' tab in the top navbar and left sidebar for all users. When OFF, the tab is completely hidden across the platform.",
      icon: Calendar,
      iconColor: '#3b82f6',
      activeLabel: 'VISIBLE TO EVERYONE',
      inactiveLabel: 'HIDDEN ACROSS PLATFORM'
    },
    {
      key: 'showChatImageUpload',
      title: 'Chat System: Image Upload Option',
      description: "Controls the 'Attach images' button in the chat system input bar. When OFF, the image upload option is completely hidden in the chat and uploads are blocked on the server.",
      icon: ImageIcon,
      iconColor: '#8b5cf6',
      activeLabel: 'IMAGE UPLOADS ENABLED',
      inactiveLabel: 'IMAGE UPLOADS HIDDEN & DISABLED'
    },
    {
      key: 'disableRightClick',
      title: 'Mouse Right-Click & DevTools Prevention (Security Protection)',
      description: "Disables mouse right-click context menu and developer inspection shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U) across the web platform to prevent users from inspecting tokens or frontend code. Changes apply immediately in real time.",
      icon: Lock,
      iconColor: '#f59e0b',
      activeLabel: 'RIGHT-CLICK DISABLED (Security Active)',
      inactiveLabel: 'RIGHT-CLICK ENABLED (Default)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sliders size={22} color="var(--accent-primary)" /> Platform Feature Toggles
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 700 }}>
              Instantly show or hide user-facing navigation tabs and chat features. Changes apply immediately in real-time across both desktop and mobile applications without needing a deployment.
            </p>
          </div>
          <button
            onClick={loadToggleSettings}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderRadius: '10px' }}
            title="Refresh current settings"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '0.85rem 1.1rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.88rem',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: feedback.type === 'success' ? '#10b981' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Toggles List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {toggleConfigs.map((cfg) => {
          const isEnabled = !!toggles[cfg.key];
          const isSaving = savingKey === cfg.key;
          const Icon = cfg.icon;

          return (
            <div
              key={cfg.key}
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                border: isEnabled ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Left Details */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', maxWidth: '75%' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: isEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={20} color={isEnabled ? cfg.iconColor : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {cfg.title}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isEnabled ? '#10b981' : '#ef4444',
                        border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}
                    >
                      {isEnabled ? cfg.activeLabel : cfg.inactiveLabel}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.45' }}>
                    {cfg.description}
                  </p>
                </div>
              </div>

              {/* Right Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {isSaving && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <RefreshCw size={12} className="spin-animation" /> Saving...
                  </span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isSaving}
                  onClick={() => handleToggle(cfg.key)}
                  style={{
                    position: 'relative',
                    width: 54,
                    height: 30,
                    borderRadius: 15,
                    border: 'none',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    background: isEnabled ? 'var(--accent-primary, #10b981)' : 'rgba(255, 255, 255, 0.18)',
                    transition: 'background 0.25s ease',
                    padding: 0,
                    outline: 'none',
                    boxShadow: isEnabled ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none'
                  }}
                  title={isEnabled ? `Turn OFF to hide ${cfg.title}` : `Turn ON to show ${cfg.title}`}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: isEnabled ? 27 : 3,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      transition: 'left 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      color: isEnabled ? '#10b981' : '#64748b'
                    }}
                  >
                    {isEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info notice */}
      <div
        style={{
          padding: '0.85rem 1.15rem',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-primary)' }} />
        <span>
          Toggle states persist in the database and are broadcast via WebSockets. Connected users will see the navigation tabs and chat image upload button show or hide immediately without requiring a full browser refresh.
        </span>
      </div>
    </div>
  );
}
