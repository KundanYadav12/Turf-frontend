'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Radio,
  Video,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  Calendar,
  Eye,
  Camera,
  Youtube,
  X,
  Play
} from 'lucide-react';
import LiveStreamManagerModal from './LiveStreamManagerModal';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  const token =
    localStorage.getItem('turf_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('turf_token') ||
    sessionStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function TournamentStreamingPermissionsManager({
  tournament,
  canManage = false,
  matches = [],
  currentUser = null
}) {
  const tournamentId = tournament?.uuid || tournament?.id;

  const [permissions, setPermissions] = useState([]);
  const [streamingOverview, setStreamingOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active match for LiveStreamManagerModal
  const [activeModalMatch, setActiveModalMatch] = useState(null);

  // Grant Access Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [scopeType, setScopeType] = useState('TOURNAMENT'); // 'TOURNAMENT' | 'MATCH'
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [grantNotes, setGrantNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  // Revoke Confirmation Modal State
  const [permissionToRevoke, setPermissionToRevoke] = useState(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  // Filter & Search in permissions list
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'REVOKED'

  // Fetch permissions list
  const fetchPermissions = useCallback(async () => {
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`/api/tournaments/${tournamentId}/streaming-permissions`, {
        headers
      });
      if (res.data?.success) {
        setPermissions(res.data.data || []);
      }
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.warn('Stream permissions fetch note:', err?.message);
        setErrorMsg(err?.response?.data?.message || 'Failed to load streaming permissions.');
      }
    }
  }, [tournamentId]);

  // Fetch tournament streaming matches overview
  const fetchStreamingOverview = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`/api/tournaments/${tournamentId}/streaming-overview`, {
        headers
      });
      if (res.data?.success) {
        setStreamingOverview(res.data.data || []);
      }
    } catch (err) {
      console.warn('Streaming overview fetch note:', err?.message);
    }
  }, [tournamentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchPermissions(), fetchStreamingOverview()]);
    setLoading(false);
  }, [fetchPermissions, fetchStreamingOverview]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const socketModule = require('../../services/socket');
    const socket = socketModule.socket || socketModule.default;
    if (!socket) return;

    const onPermUpdate = () => {
      fetchPermissions();
      fetchStreamingOverview();
    };

    const onStreamStatus = () => {
      fetchStreamingOverview();
    };

    socket.on('tournament:stream_permissions_updated', onPermUpdate);
    socket.on('tournament:stream_status', onStreamStatus);

    return () => {
      socket.off('tournament:stream_permissions_updated', onPermUpdate);
      socket.off('tournament:stream_status', onStreamStatus);
    };
  }, [fetchPermissions, fetchStreamingOverview]);

  // Debounced User Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get('/api/tournaments/streaming/search-users', {
          params: { q: searchQuery.trim() },
          headers: getAuthHeaders()
        });
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.warn('User search error:', err.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Submit Grant Permission
  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('Please select a registered user to grant streaming access.');
      return;
    }

    if (scopeType === 'MATCH' && !selectedMatchId) {
      setErrorMsg('Please select a specific match for match-scoped access.');
      return;
    }

    setGrantSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/streaming-permissions`,
        {
          userId: selectedUser.id,
          scope: scopeType,
          matchId: scopeType === 'MATCH' ? selectedMatchId : null,
          notes: grantNotes.trim() || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        },
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setSuccessMsg(res.data.message || `Successfully granted streaming access to ${selectedUser.full_name}.`);
        setShowGrantModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setGrantNotes('');
        setExpiresAt('');
        fetchPermissions();
        fetchStreamingOverview();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to grant streaming permission.');
    } finally {
      setGrantSubmitting(false);
    }
  };

  // Submit Revoke Permission
  const handleRevokeConfirm = async () => {
    if (!permissionToRevoke) return;

    setRevokeSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axios.delete(
        `/api/tournaments/${tournamentId}/streaming-permissions/${permissionToRevoke.uuid || permissionToRevoke.id}`,
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Streaming permission revoked successfully.');
        setPermissionToRevoke(null);
        fetchPermissions();
        fetchStreamingOverview();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to revoke streaming permission.');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      return (
        p.fullName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.scopeLabel?.toLowerCase().includes(q) ||
        p.granterName?.toLowerCase().includes(q)
      );
    });
  }, [permissions, statusFilter, filterQuery]);

  // Current user's own delegated permissions
  const myDelegatedPermissions = useMemo(() => {
    if (!currentUser?.id) return [];
    return permissions.filter((p) => Number(p.userId) === Number(currentUser.id) && p.isActive);
  }, [permissions, currentUser]);

  const isDelegatedStreamer = myDelegatedPermissions.length > 0;

  // Key metrics
  const activeCount = permissions.filter((p) => p.isActive).length;
  const tournamentWideCount = permissions.filter((p) => p.isActive && p.scope === 'TOURNAMENT').length;
  const matchSpecificCount = permissions.filter((p) => p.isActive && p.scope === 'MATCH').length;
  const liveStreamsCount = streamingOverview.filter((m) => m.hasLiveStream).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Alerts & Notifications ── */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '0.85rem 1.25rem',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '0.85rem 1.25rem',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Delegated Streamer Personal Welcome Banner ── */}
      {isDelegatedStreamer && !canManage && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 78, 59, 0.3) 100%)',
            border: '2px solid rgba(16, 185, 129, 0.45)',
            borderRadius: 16,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.5)'
              }}
            >
              <Video size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 800 }}>
                You have active Live Streaming permission!
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                The tournament organizer has authorized your account to broadcast live streams. Use the &quot;Go Live&quot;
                action on your permitted matches below.
              </p>
            </div>
          </div>
          <span
            style={{
              background: 'rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}
          >
            ACTIVE STREAMER
          </span>
        </div>
      )}

      {/* ── Main Dashboard Header ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          borderRadius: 18,
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <Radio size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Live Streaming Access & Delegated Control
              </h3>
            </div>
            <p style={{ margin: '0.4rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem', maxWidth: 680 }}>
              Authorize registered player accounts and crew members to live broadcast matches using mobile cameras,
              external RTMP encoders (OBS / vMix), or YouTube Live. Delegated users cannot change scores or tournament settings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                padding: '0.55rem 0.9rem',
                borderRadius: 10
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                  setScopeType('TOURNAMENT');
                  setSelectedMatchId('');
                  setGrantNotes('');
                  setExpiresAt('');
                  setShowGrantModal(true);
                }}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  fontWeight: 700
                }}
              >
                <UserPlus size={16} /> Grant Streaming Access
              </button>
            )}
          </div>
        </div>

        {/* ── Metrics Cards Strip ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.25rem'
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Active Live Streams</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: liveStreamsCount > 0 ? '#ef4444' : '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {liveStreamsCount > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} className="animate-pulse" />}
              {liveStreamsCount}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Authorized Streamers</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#10b981', marginTop: 4 }}>
              {activeCount}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Tournament-Wide Access</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>
              {tournamentWideCount}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Match-Specific Access</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#f59e0b', marginTop: 4 }}>
              {matchSpecificCount}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Active Match Streams Broadcast Hub ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 16,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 800 }}>
              Tournament Matches Live Stream Hub
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Launch or monitor camera broadcasts across tournament fixtures.
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {streamingOverview.length} Match{streamingOverview.length === 1 ? '' : 'es'}
          </span>
        </div>

        {streamingOverview.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            No matches scheduled for this tournament yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: '1rem'
            }}
          >
            {streamingOverview.map((m) => (
              <div
                key={m.matchId}
                style={{
                  background: m.hasLiveStream ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  border: m.hasLiveStream ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: 14,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                      Match #{m.matchNumber} • {m.matchStatus}
                    </span>
                    {m.hasLiveStream ? (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} className="animate-pulse" />
                        LIVE STREAM
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4 }}>
                        OFFLINE
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {m.teamAName || 'Team A'} <span style={{ color: '#64748b', fontWeight: 400 }}>vs</span> {m.teamBName || 'Team B'}
                  </div>

                  {m.stream && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>Method: <strong style={{ color: '#cbd5e1' }}>{m.stream.streamingMethod}</strong></span>
                      {m.stream.streamerName && <span>Streamer: <strong style={{ color: '#10b981' }}>{m.stream.streamerName}</strong></span>}
                      {m.stream.viewerCount > 0 && <span>👁 {m.stream.viewerCount} Viewers</span>}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Watch Stream Button (Always accessible to viewers when live) */}
                  {m.hasLiveStream && (
                    <Link
                      href={`/matches/${m.matchId || m.uuid || m.id || ''}/watch`}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '0.45rem 0.75rem',
                        borderRadius: 8,
                        textDecoration: 'none'
                      }}
                    >
                      <Radio size={14} className="animate-pulse" /> Watch Stream
                    </Link>
                  )}

                  {/* Go Live / Manage Stream Button (Only if authorized creator, superadmin, or delegated streamer) */}
                  {m.canManageStream && (
                    <button
                      type="button"
                      onClick={() => setActiveModalMatch(m)}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: m.hasLiveStream
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '0.48rem 0.75rem',
                        borderRadius: 8,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Camera size={14} /> {m.hasLiveStream ? 'Manage Live Stream' : 'Go Live'}
                    </button>
                  )}

                  <Link
                    href={`/matches/${m.matchId || m.uuid || m.id || ''}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#cbd5e1',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.8rem',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 8,
                      textDecoration: 'none'
                    }}
                    title="Match Scoreboard & Details"
                  >
                    Match →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Authorized Delegated Streamers Roster ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 16,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 800 }}>
              Authorized Streaming Accounts
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Registered accounts with active live broadcast authorization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
              <input
                type="text"
                placeholder="Filter streamers..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '0.4rem 0.75rem 0.4rem 2rem',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '0.4rem 0.75rem',
                color: '#cbd5e1',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="REVOKED">Revoked Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <div>Loading streaming permissions...</div>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#94a3b8',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              borderRadius: 12
            }}
          >
            <UserCheck size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
            <h5 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.98rem' }}>No Delegated Streamers Found</h5>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem' }}>
              {canManage
                ? 'Click "Grant Streaming Access" above to authorize registered players or camera operators.'
                : 'No delegated streaming permissions have been assigned yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPermissions.map((perm) => (
              <div
                key={perm.id || perm.uuid}
                style={{
                  background: perm.isActive ? 'rgba(255, 255, 255, 0.02)' : 'rgba(239, 68, 68, 0.03)',
                  border: perm.isActive ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 12,
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {perm.avatarUrl ? (
                    <img
                      src={perm.avatarUrl}
                      alt={perm.fullName}
                      style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.9rem'
                      }}
                    >
                      {perm.fullName?.charAt(0) || 'U'}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                        {perm.fullName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: perm.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: perm.isActive ? '#10b981' : '#f87171'
                        }}
                      >
                        {perm.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                      {perm.email && <span>{perm.email} • </span>}
                      <span>Scope: <strong style={{ color: perm.scope === 'TOURNAMENT' ? '#60a5fa' : '#34d399' }}>{perm.scopeLabel}</strong></span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Granted by {perm.granterName || 'Organizer'} on {new Date(perm.createdAt).toLocaleDateString()}
                      {perm.notes && ` • "${perm.notes}"`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Revoke Permission (Creator / Superadmin only) */}
                  {canManage && perm.isActive && (
                    <button
                      type="button"
                      onClick={() => setPermissionToRevoke(perm)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.75rem',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                      title="Revoke live streaming permission"
                    >
                      <Trash2 size={13} /> Revoke Access
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL: Grant Live Streaming Permission ── */}
      {showGrantModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                  Grant Live Streaming Access
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Step 1: User Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  1. Search Registered Account *
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search by full name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Live Search Results Dropdown */}
                {isSearching && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>Searching users...</div>
                )}

                {searchResults.length > 0 && !selectedUser && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      maxHeight: 180,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          padding: '0.6rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: '#ffffff'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {u.email || u.phone || 'Registered User'}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#cbd5e1',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}
                        >
                          {u.role || 'PLAYER'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected User Badge */}
                {selectedUser && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#10b981' }}>
                        Selected: {selectedUser.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                        {selectedUser.email || selectedUser.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Scope Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  2. Permission Scope *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setScopeType('TOURNAMENT')}
                    style={{
                      background: scopeType === 'TOURNAMENT' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: scopeType === 'TOURNAMENT' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: scopeType === 'TOURNAMENT' ? '#ffffff' : '#94a3b8',
                      borderRadius: 10,
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    🏆 All Matches (Tournament-Wide)
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopeType('MATCH')}
                    style={{
                      background: scopeType === 'MATCH' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: scopeType === 'MATCH' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: scopeType === 'MATCH' ? '#ffffff' : '#94a3b8',
                      borderRadius: 10,
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    ⚡ Specific Match Only
                  </button>
                </div>
              </div>

              {/* Specific Match Dropdown if Scope is MATCH */}
              {scopeType === 'MATCH' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                    Select Match Fixture *
                  </label>
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose a Match --</option>
                    {(matches.length > 0 ? matches : streamingOverview).map((m) => (
                      <option key={m.matchId || m.id} value={m.matchId || m.uuid || m.id}>
                        Match #{m.matchNumber || m.match_number}: {m.teamAName || m.team_a_name || 'Team A'} vs{' '}
                        {m.teamBName || m.team_b_name || 'Team B'} ({m.status || m.matchStatus || 'SCHEDULED'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Role / Crew Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Court 1 mobile camera crew, OBS operator"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  maxLength={255}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 10 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantSubmitting || !selectedUser}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    fontWeight: 700
                  }}
                >
                  {grantSubmitting ? 'Granting...' : 'Authorize Live Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Revoke Permission Confirmation ── */}
      {permissionToRevoke && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 440,
              padding: '1.75rem',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}
            >
              <Trash2 size={24} />
            </div>

            <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
              Revoke Live Streaming Access?
            </h4>
            <p style={{ margin: '0.5rem 0 1.25rem 0', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Are you sure you want to revoke live streaming permissions for{' '}
              <strong style={{ color: '#ffffff' }}>{permissionToRevoke.fullName}</strong>?
              They will no longer be able to start broadcasts or access private stream keys.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPermissionToRevoke(null)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.65rem', borderRadius: 10 }}
              >
                Keep Access
              </button>
              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={revokeSubmitting}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: 10,
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {revokeSubmitting ? 'Revoking...' : 'Yes, Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Live Stream Manager Modal (Camera / RTMP / YouTube) ── */}
      {activeModalMatch && (
        <LiveStreamManagerModal
          matchId={activeModalMatch.matchId || activeModalMatch.id}
          matchData={activeModalMatch}
          onClose={() => {
            setActiveModalMatch(null);
            fetchStreamingOverview();
          }}
          onStreamUpdated={() => {
            fetchStreamingOverview();
          }}
        />
      )}
    </div>
  );
}
