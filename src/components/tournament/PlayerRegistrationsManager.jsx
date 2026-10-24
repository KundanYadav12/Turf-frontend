'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import {
  UserPlus,
  QrCode,
  Copy,
  Check,
  Share2,
  Download,
  Printer,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  CheckSquare,
  AlertCircle,
  Settings,
  ListFilter,
  RefreshCw,
  Search,
  Users,
  ChevronDown,
  Lock,
  Plus,
  Trash2
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
  APPROVED: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  WAITLISTED: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  CONFIRMED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  DENIED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  WITHDRAWN: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' }
};

export default function PlayerRegistrationsManager({ tournament, canManage, teams = [] }) {
  const tournamentId = tournament?.uuid || tournament?.id;
  const [subTab, setSubTab] = useState('requests'); // 'requests' | 'settings' | 'poster'
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Config State
  const [config, setConfig] = useState({
    isOpen: true,
    registrationDeadline: '',
    maxPlayers: 64,
    minAge: '',
    maxAge: '',
    consentText: 'I consent to the collection and verification of my details for this tournament. Sensitive identity data (such as Aadhaar and address) is securely encrypted and accessible only to authorized organizers.',
    fieldsConfig: {
      fullName: { status: 'REQUIRED', label: 'Full Name' },
      dateOfBirth: { status: 'REQUIRED', label: 'Date of Birth' },
      age: { status: 'OPTIONAL', label: 'Age (Auto-calculated)' },
      playingHand: { status: 'REQUIRED', label: 'Playing Hand' },
      phone: { status: 'REQUIRED', label: 'Phone Number' },
      email: { status: 'OPTIONAL', label: 'Email Address' },
      address: { status: 'HIDDEN', label: 'Residential Address' },
      aadhaar: { status: 'HIDDEN', label: 'Aadhaar Number (12-Digit)' },
      photo: { status: 'OPTIONAL', label: 'Player Photo' },
      preferredRole: { status: 'OPTIONAL', label: 'Preferred Role / Position' },
      preferredTeam: { status: 'OPTIONAL', label: 'Preferred Team' },
      jerseySize: { status: 'OPTIONAL', label: 'Jersey Size' },
      customFields: []
    }
  });

  // Registrations Table State
  const [registrations, setRegistrations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [confirmModalData, setConfirmModalData] = useState(null); // { regId, playerName, teamId, role }
  const [denyModalData, setDenyModalData] = useState(null); // { regId, playerName, reason }
  const [revealModalData, setRevealModalData] = useState(null); // { regId, playerName, reason, revealedData, loading }
  const [newCustomField, setNewCustomField] = useState({ name: '', label: '', type: 'text', options: '' });
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);

  const qrCanvasRef = useRef(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  };

  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const registrationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tournaments/${tournamentId}/register`
    : `/tournaments/${tournamentId}/register`;

  // Fetch initial config and registrations
  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch public registration configuration (always accessible, does not require authentication)
      try {
        const cfgRes = await axios.get(`/api/tournaments/${tournamentId}/registration-config`);
        if (cfgRes.data?.data) {
          const c = cfgRes.data.data;
          setConfig({
            isOpen: c.isOpen ?? true,
            registrationDeadline: c.registrationDeadline ? c.registrationDeadline.substring(0, 16) : '',
            maxPlayers: c.maxPlayers || '',
            minAge: c.minAge || '',
            maxAge: c.maxAge || '',
            consentText: c.consentText || '',
            fieldsConfig: c.fieldsConfig || config.fieldsConfig
          });
        }
      } catch (cfgErr) {
        console.warn('Registration config load note:', cfgErr?.message);
      }

      // 2. Fetch registrations list (sanitized for public visitors, full details for tournament organizers)
      try {
        const regRes = await axios.get(`/api/tournaments/${tournamentId}/player-registrations`, {
          headers
        });
        if (regRes.data?.data) {
          setRegistrations(regRes.data.data);
        }
      } catch (regErr) {
        if (regErr?.response?.status === 401) {
          setRegistrations([]);
        } else {
          console.warn('Player registrations load note:', regErr?.message);
        }
      }

      // 3. If user is logged in, fetch their own registration status for this tournament
      if (token) {
        try {
          const myRegRes = await axios.get(`/api/tournaments/${tournamentId}/my-registration`, {
            headers
          });
          if (myRegRes.data?.data) {
            setMyRegistration(myRegRes.data.data);
          } else {
            setMyRegistration(null);
          }
        } catch (myErr) {
          setMyRegistration(null);
        }
      } else {
        setMyRegistration(null);
      }
    } catch (err) {
      console.warn('Failed to load tournament registration data:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [tournamentId]);

  // Save Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMessage('');
    setErrorMsg('');
    try {
      const payload = {
        isOpen: config.isOpen,
        registrationDeadline: config.registrationDeadline || null,
        maxPlayers: config.maxPlayers ? parseInt(config.maxPlayers, 10) : null,
        minAge: config.minAge ? parseInt(config.minAge, 10) : null,
        maxAge: config.maxAge ? parseInt(config.maxAge, 10) : null,
        consentText: config.consentText,
        fieldsConfig: config.fieldsConfig
      };

      const res = await axios.put(`/api/tournaments/${tournamentId}/registration-config`, payload, {
        headers: getAuthHeaders()
      });

      if (res.data.success) {
        setMessage('Registration settings saved successfully!');
        setTimeout(() => setMessage(''), 3500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save registration configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Native Share
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `Register for ${tournament?.name || 'Tournament'}`,
        text: `Player registrations are open for ${tournament?.name || 'Tournament'}. Register now!`,
        url: registrationUrl
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  // Download QR Code PNG
  const handleDownloadQR = () => {
    const canvas = document.getElementById('registration-qr-canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${(tournament?.name || 'tournament').replace(/[^a-z0-9]/gi, '_')}_registration_qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Status Actions
  const handleUpdateStatus = async (regId, status, extra = {}) => {
    setMessage('');
    setErrorMsg('');
    try {
      const res = await axios.put(
        `/api/tournaments/${tournamentId}/player-registrations/${regId}/status`,
        { status, ...extra },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setMessage(`Status updated to ${status}.`);
        setConfirmModalData(null);
        setDenyModalData(null);
        // refresh list
        const regRes = await axios.get(`/api/tournaments/${tournamentId}/player-registrations`, {
          headers: getAuthHeaders()
        });
        setRegistrations(regRes.data?.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to update status to ${status}.`);
    }
  };

  // Bulk Status Update
  const handleBulkUpdate = async (status) => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to mark ${selectedIds.length} players as ${status}?`)) return;

    setMessage('');
    setErrorMsg('');
    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/player-registrations/bulk-status`,
        { registrationIds: selectedIds, status },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setMessage(`Bulk updated ${selectedIds.length} players to ${status}.`);
        setSelectedIds([]);
        const regRes = await axios.get(`/api/tournaments/${tournamentId}/player-registrations`, {
          headers: getAuthHeaders()
        });
        setRegistrations(regRes.data?.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Bulk update failed.`);
    }
  };

  // Reveal Sensitive Data
  const handleRevealSensitive = async () => {
    if (!revealModalData || !revealModalData.reason.trim()) {
      alert('Please state a reason for accessing sensitive identity data.');
      return;
    }
    setRevealModalData(prev => ({ ...prev, loading: true }));
    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/player-registrations/${revealModalData.regId}/reveal-sensitive`,
        { reason: revealModalData.reason },
        { headers: getAuthHeaders() }
      );
      setRevealModalData(prev => ({
        ...prev,
        revealedData: res.data?.data || null,
        loading: false
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reveal sensitive data.');
      setRevealModalData(prev => ({ ...prev, loading: false }));
    }
  };

  // Add Custom Field
  const handleAddCustomField = () => {
    if (!newCustomField.name.trim() || !newCustomField.label.trim()) {
      alert('Please specify field identifier and label.');
      return;
    }
    const key = newCustomField.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const opts = newCustomField.type === 'dropdown'
      ? newCustomField.options.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const updatedCustom = [
      ...(config.fieldsConfig.customFields || []),
      {
        id: key,
        name: key,
        label: newCustomField.label,
        type: newCustomField.type,
        options: opts,
        status: 'OPTIONAL'
      }
    ];

    setConfig(prev => ({
      ...prev,
      fieldsConfig: {
        ...prev.fieldsConfig,
        customFields: updatedCustom
      }
    }));
    setNewCustomField({ name: '', label: '', type: 'text', options: '' });
    setShowAddCustomField(false);
  };

  const handleRemoveCustomField = (idx) => {
    const updated = [...(config.fieldsConfig.customFields || [])];
    updated.splice(idx, 1);
    setConfig(prev => ({
      ...prev,
      fieldsConfig: {
        ...prev.fieldsConfig,
        customFields: updated
      }
    }));
  };

  // Filtered registrations
  const filteredRegistrations = registrations.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch = !searchQuery.trim() ||
      r.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone?.includes(searchQuery) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.preferredRole?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Alert Notices */}
      {message && (
        <div style={{
          padding: '0.8rem 1.2rem',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '0.8rem 1.2rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setSubTab('requests')}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: subTab === 'requests' ? 'var(--accent-primary, #10b981)' : 'var(--bg-card, rgba(255,255,255,0.05))',
              color: subTab === 'requests' ? '#fff' : 'var(--text-heading)',
              border: '1px solid var(--border-color)',
              fontWeight: 600
            }}
          >
            <Users size={15} />
            Player Requests ({registrations.length})
          </button>

          {canManage && (
            <>
              <button
                onClick={() => setSubTab('settings')}
                className="btn btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: subTab === 'settings' ? 'var(--accent-primary, #10b981)' : 'var(--bg-card, rgba(255,255,255,0.05))',
                  color: subTab === 'settings' ? '#fff' : 'var(--text-heading)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600
                }}
              >
                <Settings size={15} />
                Form Fields & Rules
              </button>

              <button
                onClick={() => setSubTab('poster')}
                className="btn btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: subTab === 'poster' ? 'var(--accent-primary, #10b981)' : 'var(--bg-card, rgba(255,255,255,0.05))',
                  color: subTab === 'poster' ? '#fff' : 'var(--text-heading)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600
                }}
              >
                <QrCode size={15} />
                Share Link & Print Poster
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. PLAYER REQUESTS TAB                                   */}
      {/* ───────────────────────────────────────────────────────── */}
      {subTab === 'requests' && (
        <div>
          {/* Quick Share Banner */}
          <div className="glass-panel" style={{
            padding: '1.15rem 1.35rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))',
            borderRadius: '12px',
            border: '1px solid rgba(16,185,129,0.2)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '0.15rem 0.55rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: config.isOpen ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: config.isOpen ? '#10b981' : '#ef4444'
                }}>
                  {config.isOpen ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}
                </span>
                {config.maxPlayers && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    • Capacity: {registrations.filter(r => r.status === 'CONFIRMED').length} / {config.maxPlayers} confirmed
                  </span>
                )}
                {config.registrationDeadline && (
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> Deadline: {new Date(config.registrationDeadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Direct Link: <code style={{ color: 'var(--text-heading)', background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{registrationUrl}</code>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                <UserPlus size={14} />
                Register to Play
              </a>
              <button
                onClick={handleCopyLink}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copiedLink ? 'Copied Link!' : 'Copy Link'}
              </button>
              <button
                onClick={handleShareLink}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Share2 size={14} />
                Share
              </button>
              {canManage && (
                <button
                  onClick={() => setSubTab('poster')}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <QrCode size={14} />
                  QR Poster
                </button>
              )}
            </div>
          </div>

          {/* User's own registration status banner if submitted */}
          {myRegistration && (
            <div className="glass-panel" style={{
              padding: '1.15rem 1.35rem',
              marginBottom: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#60a5fa' }}>
                    Your Registration Status:
                  </span>
                  <span style={{
                    padding: '0.15rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: STATUS_COLORS[myRegistration.status]?.bg || 'rgba(59, 130, 246, 0.2)',
                    color: STATUS_COLORS[myRegistration.status]?.text || '#60a5fa',
                    border: `1px solid ${STATUS_COLORS[myRegistration.status]?.border || 'rgba(59, 130, 246, 0.4)'}`
                  }}>
                    {myRegistration.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Name: <strong style={{ color: 'var(--text-heading)' }}>{myRegistration.fullName}</strong>
                  {myRegistration.assignedTeam && (
                    <span> • Assigned Team: <strong style={{ color: '#10b981' }}>{myRegistration.assignedTeam.name}</strong></span>
                  )}
                  {myRegistration.preferredRole && (
                    <span> • Role: {myRegistration.preferredRole}</span>
                  )}
                  {myRegistration.denialReason && (
                    <span style={{ color: '#ef4444', display: 'block', marginTop: '0.2rem' }}>
                      Reason: {myRegistration.denialReason}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={registrationUrl}
                  className="btn btn-outline btn-sm"
                  style={{ textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  View / Edit Application
                </a>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {['ALL', 'PENDING', 'APPROVED', 'WAITLISTED', 'CONFIRMED', 'DENIED'].map(st => {
                const count = st === 'ALL'
                  ? registrations.length
                  : registrations.filter(r => r.status === st).length;
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: active ? 700 : 500,
                      background: active ? 'var(--accent-primary, #10b981)' : 'var(--bg-card, rgba(255,255,255,0.05))',
                      color: active ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search player, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {canManage && selectedIds.length > 0 && (
            <div style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6' }}>
                {selectedIds.length} player(s) selected
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleBulkUpdate('APPROVED')}
                  className="btn btn-sm"
                  style={{ background: '#3b82f6', color: '#fff', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => handleBulkUpdate('WAITLISTED')}
                  className="btn btn-sm"
                  style={{ background: '#a855f7', color: '#fff', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Waitlist Selected
                </button>
                <button
                  onClick={() => handleBulkUpdate('CONFIRMED')}
                  className="btn btn-sm"
                  style={{ background: '#10b981', color: '#fff', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Confirm Selected
                </button>
                <button
                  onClick={() => handleBulkUpdate('DENIED')}
                  className="btn btn-sm"
                  style={{ background: '#ef4444', color: '#fff', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Deny Selected
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Registrations Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading player registration requests…
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '12px' }}>
              <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>No Registrations Found</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No player applications match your current filters.'
                  : 'No players have submitted a registration request yet.'}
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      {canManage && (
                        <th style={{ padding: '0.75rem 1rem', width: '30px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.length > 0 && selectedIds.length === filteredRegistrations.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(filteredRegistrations.map(r => r.id));
                              } else {
                                setSelectedIds([]);
                              }
                            }}
                          />
                        </th>
                      )}
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Player</th>
                      {canManage && (
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contact</th>
                      )}
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role / Hand</th>
                      {canManage && (
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aadhaar / ID</th>
                      )}
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Team</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                      {canManage && (
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => {
                      const stStyle = STATUS_COLORS[reg.status] || STATUS_COLORS.PENDING;
                      const isSelected = selectedIds.includes(reg.id);

                      return (
                        <tr
                          key={reg.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                          }}
                        >
                          {canManage && (
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds(prev => [...prev, reg.id]);
                                  } else {
                                    setSelectedIds(prev => prev.filter(id => id !== reg.id));
                                  }
                                }}
                              />
                            </td>
                          )}

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}>
                                {reg.fullName ? reg.fullName.charAt(0).toUpperCase() : 'P'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                                  {reg.fullName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {reg.age ? `${reg.age} yrs` : (reg.dateOfBirth ? reg.dateOfBirth.substring(0, 10) : 'DOB N/A')}
                                  {reg.jerseySize ? ` • Size ${reg.jerseySize}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {canManage && (
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                              <div style={{ color: 'var(--text-heading)' }}>{reg.phone || '—'}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{reg.email || '—'}</div>
                            </td>
                          )}

                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>
                              {reg.preferredRole || 'Player'}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {reg.playingHand ? `${reg.playingHand}-Handed` : '—'}
                            </div>
                          </td>

                          {canManage && (
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                              {reg.maskedAadhaar ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontFamily: 'monospace', color: 'var(--text-heading)' }}>
                                    {reg.maskedAadhaar}
                                  </span>
                                  <button
                                    onClick={() => setRevealModalData({
                                      regId: reg.id,
                                      playerName: reg.fullName,
                                      reason: '',
                                      revealedData: null,
                                      loading: false
                                    })}
                                    title="Verify full Aadhaar & Address (Audit logged)"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#60a5fa',
                                      cursor: 'pointer',
                                      padding: '0.1rem'
                                    }}
                                  >
                                    <Eye size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Not submitted</span>
                              )}
                            </td>
                          )}

                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                            {reg.assignedTeam ? (
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                background: 'rgba(16,185,129,0.1)',
                                color: '#10b981',
                                fontWeight: 600
                              }}>
                                {reg.assignedTeam.name}
                              </span>
                            ) : reg.preferredTeam ? (
                              <span style={{ color: 'var(--text-muted)' }}>
                                Prefers: {reg.preferredTeam.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: stStyle.bg,
                              color: stStyle.text,
                              border: `1px solid ${stStyle.border}`,
                              display: 'inline-block'
                            }}>
                              {reg.status}
                            </span>
                            {reg.denialReason && (
                              <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', maxWidth: '140px' }}>
                                Reason: {reg.denialReason}
                              </div>
                            )}
                          </td>

                          {canManage && (
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                                {reg.status !== 'APPROVED' && reg.status !== 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(reg.id, 'APPROVED')}
                                    title="Approve Player"
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '0.3rem 0.5rem' }}
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                )}

                                {reg.status !== 'CONFIRMED' && (
                                  <button
                                    onClick={() => setConfirmModalData({
                                      regId: reg.id,
                                      playerName: reg.fullName,
                                      teamId: reg.preferredTeam?.id || (teams[0]?.id || ''),
                                      role: reg.preferredRole || 'PLAYER'
                                    })}
                                    title="Confirm Spot & Assign Squad"
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '0.3rem 0.5rem' }}
                                  >
                                    <CheckSquare size={14} />
                                  </button>
                                )}

                                {reg.status !== 'WAITLISTED' && reg.status !== 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(reg.id, 'WAITLISTED')}
                                    title="Place on Waitlist"
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', padding: '0.3rem 0.5rem' }}
                                  >
                                    <Clock size={14} />
                                  </button>
                                )}

                                {reg.status !== 'DENIED' && (
                                  <button
                                    onClick={() => setDenyModalData({
                                      regId: reg.id,
                                      playerName: reg.fullName,
                                      reason: ''
                                    })}
                                    title="Deny Application"
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.5rem' }}
                                  >
                                    <XCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. FORM FIELDS & RULES CONFIGURATION                     */}
      {/* ───────────────────────────────────────────────────────── */}
      {subTab === 'settings' && canManage && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
            Player Registration Form & Rules
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Configure registration availability, age constraints, and choose which fields players are required or allowed to fill out.
          </p>

          {/* Top Controls Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            padding: '1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            {/* Open / Closed Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Registration Status
              </label>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, isOpen: !prev.isOpen }))}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: config.isOpen ? '#10b981' : '#ef4444',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
              >
                {config.isOpen ? '✓ Applications Open' : '✕ Applications Closed'}
              </button>
            </div>

            {/* Deadline */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={config.registrationDeadline}
                onChange={(e) => setConfig(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Max Players Limit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Max Players Capacity
              </label>
              <input
                type="number"
                placeholder="e.g. 64 (Empty = unlimited)"
                value={config.maxPlayers}
                onChange={(e) => setConfig(prev => ({ ...prev, maxPlayers: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Min Age / Max Age */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Age Limits (Min - Max)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={config.minAge}
                  onChange={(e) => setConfig(prev => ({ ...prev, minAge: e.target.value }))}
                  style={{
                    width: '50%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.85rem'
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={config.maxAge}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxAge: e.target.value }))}
                  style={{
                    width: '50%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form Fields Configurator */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text-heading)' }}>
            Form Fields Visibility & Requirement
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            {[
              { key: 'fullName', label: 'Full Name', note: 'Standard identity' },
              { key: 'dateOfBirth', label: 'Date of Birth & Age', note: 'Enforces tournament age rules' },
              { key: 'playingHand', label: 'Playing Hand', note: 'Right / Left hand' },
              { key: 'phone', label: 'Phone Number', note: 'Verification contact' },
              { key: 'email', label: 'Email Address', note: 'Email notifications' },
              { key: 'photo', label: 'Player Photo', note: 'Display on profile and TV' },
              { key: 'preferredRole', label: 'Preferred Role / Position', note: 'Batsman, Keeper, Defender, etc.' },
              { key: 'preferredTeam', label: 'Preferred Team', note: 'Player specifies desired team' },
              { key: 'jerseySize', label: 'Jersey Size', note: 'S, M, L, XL, XXL' },
              { key: 'address', label: 'Residential Address', note: 'Encrypted & consent protected' },
              { key: 'aadhaar', label: '12-Digit Aadhaar Number', note: 'Verhoeff checksum + encrypted at rest' }
            ].map(f => {
              const currentStatus = config.fieldsConfig[f.key]?.status || 'OPTIONAL';
              return (
                <div
                  key={f.key}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'var(--bg-card, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.88rem' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {f.note}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {['REQUIRED', 'OPTIONAL', 'HIDDEN'].map(st => {
                      const isSel = currentStatus === st;
                      const col = st === 'REQUIRED' ? '#10b981' : st === 'OPTIONAL' ? '#3b82f6' : '#6b7280';
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              fieldsConfig: {
                                ...prev.fieldsConfig,
                                [f.key]: {
                                  ...(prev.fieldsConfig[f.key] || {}),
                                  status: st,
                                  label: f.label
                                }
                              }
                            }));
                          }}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: isSel ? 700 : 500,
                            background: isSel ? col : 'transparent',
                            color: isSel ? '#fff' : 'var(--text-muted)',
                            border: `1px solid ${isSel ? col : 'var(--border-color)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Fields Section */}
          <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-heading)' }}>
                  Organizer Custom Fields
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add custom questions such as T-shirt name, medical clearance, or emergency contact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomField(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} /> Add Custom Field
              </button>
            </div>

            {/* List Custom Fields */}
            {config.fieldsConfig.customFields && config.fieldsConfig.customFields.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {config.fieldsConfig.customFields.map((cf, idx) => (
                  <div
                    key={cf.id || idx}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'var(--bg-card, rgba(255,255,255,0.03))',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.85rem' }}>{cf.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {cf.type} • Status: {cf.status}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No custom fields added yet.
              </div>
            )}
          </div>

          {/* Privacy Consent Text */}
          <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.4rem' }}>
              Privacy & Consent Text (Displayed before sensitive data submission)
            </label>
            <textarea
              rows={2}
              value={config.consentText}
              onChange={(e) => setConfig(prev => ({ ...prev, consentText: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card, #111)',
                color: 'var(--text-heading)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Save Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem' }}
            >
              {savingConfig ? 'Saving...' : 'Save Registration Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. SHARE LINK & PRINT POSTER VIEW                        */}
      {/* ───────────────────────────────────────────────────────── */}
      {subTab === 'poster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Controls & QR Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Tournament Registration QR & Links
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Share this QR code on social media, WhatsApp groups, or print it at the turf/stadium entrance for direct player onboarding.
            </p>

            <div style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'inline-block',
              margin: '0 auto 1.25rem auto',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
            }}>
              <QRCodeCanvas
                id="registration-qr-canvas"
                value={registrationUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleDownloadQR}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Download size={15} /> Download PNG
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Printer size={15} /> Print Poster
                </button>
              </div>

              <button
                onClick={handleCopyLink}
                className="btn btn-outline"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {copiedLink ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                {copiedLink ? 'Copied Registration URL!' : 'Copy Direct Registration URL'}
              </button>
            </div>
          </div>

          {/* Printable Poster Mockup */}
          <div
            id="printable-poster-view"
            style={{
              background: '#0d1117',
              color: '#ffffff',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '440px'
            }}
          >
            <div>
              <div style={{
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontSize: '0.75rem',
                color: '#10b981',
                fontWeight: 800,
                marginBottom: '0.5rem'
              }}>
                TURFSPOT TOURNAMENT ENTRANCE
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.4rem 0', color: '#fff' }}>
                {tournament?.name || 'Tournament'}
              </h2>
              <div style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
                {tournament?.sport_name || 'Sports'} • {tournament?.city || 'Sports Arena'}
              </div>

              {/* QR Code Frame */}
              <div style={{
                background: '#ffffff',
                padding: '1.2rem',
                borderRadius: '12px',
                display: 'inline-block',
                margin: '0 auto 1.25rem auto'
              }}>
                <QRCodeCanvas
                  value={registrationUrl}
                  size={180}
                  level="H"
                />
              </div>

              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginBottom: '0.2rem' }}>
                Scan to Register as Player
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 1rem 0' }}>
                Fast verification • Safe data encryption • Instant squad placement
              </p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Powered by TurfSpot Sports League System
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* CONFIRMATION & SQUAD ASSIGNMENT MODAL                     */}
      {/* ───────────────────────────────────────────────────────── */}
      {confirmModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Confirm Player & Assign to Squad
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Confirm spot for <strong>{confirmModalData.playerName}</strong>. This adds the player directly into the chosen team roster.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Assign to Participating Team
              </label>
              <select
                value={confirmModalData.teamId}
                onChange={(e) => setConfirmModalData(prev => ({ ...prev, teamId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.88rem'
                }}
              >
                <option value="">-- Choose Registered Team --</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.team_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Player Role / Position
              </label>
              <input
                type="text"
                value={confirmModalData.role}
                onChange={(e) => setConfirmModalData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Batsman, Bowler, Defender, Singles"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(confirmModalData.regId, 'CONFIRMED', {
                  assignedTeamId: confirmModalData.teamId,
                  assignedRole: confirmModalData.role
                })}
                className="btn btn-primary btn-sm"
              >
                Confirm Spot & Add to Squad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* DENIAL REASON MODAL                                      */}
      {/* ───────────────────────────────────────────────────────── */}
      {denyModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ef4444' }}>
              Deny Player Registration
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Deny application for <strong>{denyModalData.playerName}</strong>. You may provide a reason that will be displayed to the player.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Reason for Denial (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Age criteria not met, tournament slots filled, or incomplete documents"
                value={denyModalData.reason}
                onChange={(e) => setDenyModalData(prev => ({ ...prev, reason: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDenyModalData(null)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(denyModalData.regId, 'DENIED', {
                  denialReason: denyModalData.reason
                })}
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* SENSITIVE DATA REVEAL (AUDIT LOGGED) MODAL               */}
      {/* ───────────────────────────────────────────────────────── */}
      {revealModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid rgba(59, 130, 246, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lock size={18} color="#60a5fa" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                Access Sensitive Identity Data
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Player Aadhaar and address data are encrypted at rest. Every access event is logged with your user ID and IP address in the security audit trail.
            </p>

            {revealModalData.revealedData ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                    12-Digit Aadhaar Number
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-heading)' }}>
                    {revealModalData.revealedData.aadhaarNumber || revealModalData.revealedData.aadhaar || 'Not provided'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                    Residential Address
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                    {revealModalData.revealedData.address || 'Not provided'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Reason for access (Required for audit log)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Identity verification, prize distribution, jersey delivery"
                  value={revealModalData.reason}
                  onChange={(e) => setRevealModalData(prev => ({ ...prev, reason: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRevealModalData(null)}
                className="btn btn-outline btn-sm"
              >
                Close
              </button>
              {!revealModalData.revealedData && (
                <button
                  type="button"
                  onClick={handleRevealSensitive}
                  disabled={revealModalData.loading}
                  className="btn btn-primary btn-sm"
                >
                  {revealModalData.loading ? 'Verifying...' : 'Reveal & Log Access'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* ADD CUSTOM FIELD MODAL                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      {showAddCustomField && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Add Custom Question
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Collect additional details tailored to this tournament.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Field Label (Shown to player)
              </label>
              <input
                type="text"
                placeholder="e.g. Jersey Name, Emergency Contact"
                value={newCustomField.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCustomField(prev => ({
                    ...prev,
                    label: val,
                    name: prev.name ? prev.name : val.toLowerCase().replace(/[^a-z0-9]/g, '_')
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Field Type
              </label>
              <select
                value={newCustomField.type}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #111)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="text">Single-line Text</option>
                <option value="dropdown">Dropdown Selection</option>
                <option value="checkbox">Checkbox (Yes / No)</option>
              </select>
            </div>

            {newCustomField.type === 'dropdown' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Options (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian, Non-Vegetarian, Jain"
                  value={newCustomField.options}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, options: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAddCustomField(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="btn btn-primary btn-sm"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
