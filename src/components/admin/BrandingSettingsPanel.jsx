'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Palette, Upload, RefreshCw, RotateCcw, CheckCircle, AlertTriangle,
  Image as ImageIcon, Trash2, Eye, ShieldCheck, HelpCircle, History, Sparkles
} from 'lucide-react';
import {
  getBrandingAdminApi,
  updateBrandingAdminApi,
  resetBrandingAdminApi,
  getBrandingAuditLogsApi
} from '../../services/adminService';
import { useBranding } from '../providers/BrandingProvider';

export default function BrandingSettingsPanel() {
  const { refreshBranding } = useBranding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form states
  const [appName, setAppName] = useState('TurfSpot');
  const [appTagline, setAppTagline] = useState('Sports Hub');
  const [contactEmail, setContactEmail] = useState('');
  
  // Current saved assets
  const [currentLogoUrl, setCurrentLogoUrl] = useState('/logo.png');
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState('/favicon.ico');
  const [isCustomLogo, setIsCustomLogo] = useState(false);
  const [isCustomFavicon, setIsCustomFavicon] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Staged files for upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);

  // Removal flags
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);

  // Preview contrast toggles
  const [previewDarkBg, setPreviewDarkBg] = useState(true);

  // Status and notifications
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  useEffect(() => {
    loadBrandingData();
    loadAuditLogs();
  }, []);

  const loadBrandingData = async () => {
    try {
      setLoading(true);
      const res = await getBrandingAdminApi();
      if (res.success && res.data) {
        const d = res.data;
        setAppName(d.appName || 'TurfSpot');
        setAppTagline(d.appTagline || 'Sports Hub');
        setContactEmail(d.contactEmail || '');
        setCurrentLogoUrl(d.logoUrl || '/logo.png');
        setCurrentFaviconUrl(d.faviconUrl || '/favicon.ico');
        setIsCustomLogo(!!d.isCustomLogo);
        setIsCustomFavicon(!!d.isCustomFavicon);
        setLastUpdated(d.updatedAt);
        setLogoFile(null);
        setLogoPreview(null);
        setFaviconFile(null);
        setFaviconPreview(null);
        setRemoveLogo(false);
        setRemoveFavicon(false);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to load software branding settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await getBrandingAuditLogsApi({ limit: 15 });
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.warn('Could not load branding audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Handle Logo File Selection
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed types: PNG, JPG, JPEG, WEBP, SVG
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setFeedback({
        type: 'error',
        message: 'Invalid logo format. Please upload PNG, JPG, WEBP, or SVG.'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'File size exceeds 10MB limit.'
      });
      return;
    }

    setLogoFile(file);
    setRemoveLogo(false);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setFeedback(null);
  };

  // Handle Favicon File Selection
  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml', 'image/jpeg'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.ico')) {
      setFeedback({
        type: 'error',
        message: 'Invalid favicon format. Please upload an .ico, .png, or .svg file.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'Favicon size exceeds 5MB limit.'
      });
      return;
    }

    setFaviconFile(file);
    setRemoveFavicon(false);
    const objectUrl = URL.createObjectURL(file);
    setFaviconPreview(objectUrl);
    setFeedback(null);
  };

  // Handle Remove Logo (reverts to default)
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Handle Remove Favicon (reverts to default)
  const handleRemoveFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview(null);
    setRemoveFavicon(true);
    if (faviconInputRef.current) faviconInputRef.current.value = '';
  };

  // Save branding changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appName.trim()) {
      setFeedback({ type: 'error', message: 'Application Name cannot be blank.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append('appName', appName.trim());
      formData.append('appTagline', appTagline.trim());
      formData.append('contactEmail', contactEmail.trim());

      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (faviconFile) {
        formData.append('favicon', faviconFile);
      }
      if (removeLogo) {
        formData.append('removeLogo', 'true');
      }
      if (removeFavicon) {
        formData.append('removeFavicon', 'true');
      }

      const res = await updateBrandingAdminApi(formData);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Software branding updated successfully! Changes have been broadcast to all users.'
        });
        await loadBrandingData();
        await loadAuditLogs();
        refreshBranding();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save branding updates.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Restore Default Branding
  const handleResetToDefault = async () => {
    try {
      setResetting(true);
      setFeedback(null);
      const res = await resetBrandingAdminApi();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Software branding restored to default settings successfully.'
        });
        setShowResetConfirm(false);
        await loadBrandingData();
        await loadAuditLogs();
        refreshBranding();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to reset branding.'
      });
    } finally {
      setResetting(false);
    }
  };

  // Display Logo source currently showing in preview
  const displayLogoSrc = removeLogo
    ? '/logo.png'
    : logoPreview || currentLogoUrl || '/logo.png';

  const displayFaviconSrc = removeFavicon
    ? '/favicon.ico'
    : faviconPreview || currentFaviconUrl || '/favicon.ico';

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin-animate" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading software branding settings...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header card */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Palette color="var(--accent-primary)" size={24} />
              Software Branding Management
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
              Customize application name, tagline, logo, and favicon. All updates are automatically broadcast in real-time across Web, Mobile, and TV Displays.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
          >
            <RotateCcw size={14} /> Restore Defaults
          </button>
        </div>

        {lastUpdated && (
          <div style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={13} color="var(--accent-primary)" />
            Last branding update: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: feedback.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '0.92rem',
            fontWeight: 600
          }}
        >
          {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Section 1: Application Identity */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
              Application Identity
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-heading)' }}>
                Application / Software Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                maxLength={80}
                required
                className="input-field"
                placeholder="e.g. TurfSpot, PlayZone Pro"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                Appears in headers, browser tab titles, system notifications, emails, and signage.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-heading)' }}>
                Application Tagline
              </label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                maxLength={120}
                className="input-field"
                placeholder="e.g. Sports Hub, Turf & Tournament Management"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                Secondary label shown beneath the logo in the sidebar and navigation.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-heading)' }}>
                Support / Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-field"
                placeholder="support@turfspot.com"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
              />
            </div>
          </div>

          {/* Section 2: Logo Management */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Application Logo</span>
              {isCustomLogo && !removeLogo && (
                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Custom Logo Active</span>
              )}
            </h3>

            {/* Logo Preview area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Live Preview</span>
                <button
                  type="button"
                  onClick={() => setPreviewDarkBg(!previewDarkBg)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Eye size={13} /> {previewDarkBg ? 'Preview Light' : 'Preview Dark'}
                </button>
              </div>

              <div
                style={{
                  background: previewDarkBg ? '#0b1120' : '#f8fafc',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  minHeight: '100px',
                  transition: 'background 0.2s ease'
                }}
              >
                <img
                  src={displayLogoSrc}
                  alt="App Logo Preview"
                  style={{
                    maxHeight: '70px',
                    maxWidth: '180px',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: previewDarkBg ? '#ffffff' : '#0f172a' }}>
                    {appName || 'TurfSpot'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {appTagline || 'Sports Hub'}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload & controls */}
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                <Upload size={15} /> Upload New Logo
              </button>

              {(logoPreview || (isCustomLogo && !removeLogo)) && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Remove custom logo and revert to default"
                >
                  <Trash2 size={15} /> Revert
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: 0 }}>
              Supports PNG, JPG, WEBP, SVG. Auto-optimized to crisp 512×512 resolution. Max size: 10MB.
            </p>
          </div>

          {/* Section 3: Browser Favicon */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Browser Favicon</span>
              {isCustomFavicon && !removeFavicon && (
                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Custom Favicon Active</span>
              )}
            </h3>

            {/* Favicon Preview */}
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.45rem' }}>
                Browser Tab Simulation
              </span>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px 10px 0 0',
                  padding: '0.6rem 0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  maxWidth: '240px'
                }}
              >
                <img
                  src={displayFaviconSrc}
                  alt="Favicon Preview"
                  style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: '3px' }}
                  onError={(e) => {
                    e.currentTarget.src = '/favicon.ico';
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-heading)' }}>
                  {appName || 'TurfSpot'} — Sports
                </span>
              </div>
            </div>

            {/* Favicon Upload */}
            <input
              type="file"
              ref={faviconInputRef}
              onChange={handleFaviconChange}
              accept=".ico,image/x-icon,image/png,image/svg+xml"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                <Upload size={15} /> Upload Favicon (.ico / .png)
              </button>

              {(faviconPreview || (isCustomFavicon && !removeFavicon)) && (
                <button
                  type="button"
                  onClick={handleRemoveFavicon}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Remove custom favicon and revert to default"
                >
                  <Trash2 size={15} /> Revert
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: 0 }}>
              Recommended: 32×32 or 64×64 .ico or .png.
            </p>
          </div>

        </div>

        {/* Action bar */}
        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="spin-animate" /> Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle size={16} /> Save &amp; Broadcast Branding
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.4)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} /> Restore Default Branding?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              This will restore the application name back to <strong>TurfSpot</strong> and reset the logo and favicon to default system assets.
              This change takes effect immediately across all active user sessions.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="btn btn-danger"
                disabled={resetting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                {resetting ? <RefreshCw size={15} className="spin-animate" /> : <RotateCcw size={15} />}
                Yes, Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Audit Logs History */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="var(--accent-primary)" />
          Branding Audit History
        </h3>

        {loadingLogs ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Loading audit history...</p>
        ) : auditLogs.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No branding changes recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Changed By</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${(log.action === 'RESET_DEFAULT' || log.action_type === 'RESET_TO_DEFAULT') ? 'badge-warning' : 'badge-success'}`}>
                        {log.action || log.action_type || 'UPDATE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                      {log.user_email || log.changed_by_name || `User #${log.user_id || log.changed_by_user_id || 'Admin'}`}
                      {log.user_role && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                          ({log.user_role})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {(() => {
                        try {
                          const raw = log.details || log.changes_json;
                          const details = typeof raw === 'string' ? JSON.parse(raw) : raw;
                          if (!details) return '—';
                          if (details.resetToDefault) return 'Restored default application branding';
                          if (details.updated) {
                            return Object.keys(details.updated).map((k) => `${k}: ${details.updated[k]}`).join(', ');
                          }
                          const keys = Object.keys(details);
                          if (keys.length === 0) return 'Settings refreshed';
                          return keys.map((k) => `${k}: ${typeof details[k]?.to !== 'undefined' ? details[k].to : details[k]}`).join(', ');
                        } catch (e) {
                          return 'Updated';
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
