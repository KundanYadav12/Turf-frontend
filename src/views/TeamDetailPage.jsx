'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Shield, Users, Trophy, Calendar, MapPin, ArrowLeft,
  UserPlus, Trash2, CheckCircle2, AlertCircle, Phone,
  User, Award, ChevronRight, Activity, Clock, Search,
  Camera, Upload, Sparkles, Loader2, AtSign, Check
} from 'lucide-react';
import { compressAndOptimizeImage } from '../lib/imageOptimizer';

export default function TeamDetailPage({ teamId }) {
  const { user, token } = useSelector((state) => state.auth);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Player Modal & Registration Modes ('search' = Option A, 'create' = Option B)
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addMode, setAddMode] = useState('search');
  
  // Option A: Search existing user
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Option B: Register new player
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerUsername, setNewPlayerUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [playerPhotoFile, setPlayerPhotoFile] = useState(null);
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState(null);

  // Common team-specific fields
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('PLAYER');
  const [newPlayerJersey, setNewPlayerJersey] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('Player');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Tab: 'roster', 'matches', 'fixtures'
  const [activeTab, setActiveTab] = useState('roster');

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`/api/teams/${teamId}`, config);
      if (res.data.success) {
        setTeam(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load team details.');
    } finally {
      setLoading(false);
    }
  }, [teamId, token]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Debounced search for existing players
  useEffect(() => {
    if (!showAddPlayerModal || addMode !== 'search') return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(q)}`, config);
        if (res.data.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, showAddPlayerModal, addMode, token]);

  // Debounced username availability checker for Option B
  useEffect(() => {
    if (!showAddPlayerModal || addMode !== 'create') return;
    const u = newPlayerUsername.trim().toLowerCase();
    if (u.length < 3) {
      setUsernameStatus(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      setUsernameStatus({ available: false, message: 'Invalid username format' });
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`/api/users/check-username?username=${encodeURIComponent(u)}`, config);
        if (res.data.success) {
          setUsernameStatus(res.data.data);
        }
      } catch (err) {
        setUsernameStatus(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newPlayerUsername, showAddPlayerModal, addMode, token]);

  // Handle Photo selection with client-side compression
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await compressAndOptimizeImage(file, 512, 512, 0.85);
      setPlayerPhotoFile(optimized.file);
      setPlayerPhotoPreview(optimized.previewUrl);
    } catch (err) {
      setErrorMsg(err.message || 'Error processing photo');
    }
  };

  // Handle Add Player to Roster (Option A or Option B)
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      if (addMode === 'search') {
        // Option A: Add existing user
        if (!selectedUser) {
          setErrorMsg('Please search and select an existing user.');
          setIsSubmitting(false);
          return;
        }

        const res = await axios.post(`/api/teams/${teamId}/players`, {
          existingUserId: selectedUser.id,
          fullName: selectedUser.fullName,
          role: newPlayerRole,
          jerseyNumber: newPlayerJersey ? parseInt(newPlayerJersey, 10) : undefined,
          position: newPlayerPosition,
          isCaptain: newPlayerRole === 'CAPTAIN',
          isViceCaptain: newPlayerRole === 'VICE_CAPTAIN'
        }, config);

        if (res.data.success) {
          setSuccessMsg(res.data.message || 'Existing player added to roster!');
          resetAddModal();
          fetchTeam();
        }
      } else {
        // Option B: Register new player with photo upload
        if (!newPlayerName.trim()) {
          setErrorMsg('Please enter player name.');
          setIsSubmitting(false);
          return;
        }
        if (usernameStatus && !usernameStatus.available) {
          setErrorMsg('Please choose an available username.');
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('fullName', newPlayerName.trim());
        if (newPlayerUsername.trim()) {
          formData.append('username', newPlayerUsername.trim().toLowerCase());
        }
        if (newPlayerPhone.trim()) {
          formData.append('phone', newPlayerPhone.trim());
        }
        if (newPlayerEmail.trim()) {
          formData.append('email', newPlayerEmail.trim());
        }
        formData.append('role', newPlayerRole);
        if (newPlayerJersey) {
          formData.append('jerseyNumber', newPlayerJersey);
        }
        formData.append('position', newPlayerPosition);
        formData.append('isCaptain', String(newPlayerRole === 'CAPTAIN'));
        formData.append('isViceCaptain', String(newPlayerRole === 'VICE_CAPTAIN'));

        if (playerPhotoFile) {
          formData.append('photo', playerPhotoFile);
        }

        const res = await axios.post(`/api/teams/${teamId}/players`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (res.data.success) {
          setSuccessMsg(res.data.message || 'New player registered to squad!');
          resetAddModal();
          fetchTeam();
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to add player.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddModal = () => {
    setShowAddPlayerModal(false);
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setNewPlayerName('');
    setNewPlayerUsername('');
    setUsernameStatus(null);
    setPlayerPhotoFile(null);
    setPlayerPhotoPreview(null);
    setNewPlayerPhone('');
    setNewPlayerEmail('');
    setNewPlayerJersey('');
  };

  // Handle Remove Player
  const handleRemovePlayer = async (memberId, playerName) => {
    if (!confirm(`Remove ${playerName} from the squad roster? Historical match records will be preserved.`)) return;

    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.delete(`/api/teams/${teamId}/players/${memberId}`, config);
      if (res.data.success) {
        setSuccessMsg(`Player ${playerName} removed from squad.`);
        fetchTeam();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to remove player.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
        Loading team information…
      </div>
    );
  }

  if (errorMsg && !team) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={44} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Team Not Found</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <Link href="/teams" className="btn btn-outline">
          &larr; Back to Teams Directory
        </Link>
      </div>
    );
  }

  const stats = team.statistics || {};

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 2rem) clamp(0.75rem, 2vw, 1.5rem)', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href="/teams"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '0.88rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Teams Directory
        </Link>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hero Banner Header */}
      <div
        className="glass-panel"
        style={{
          padding: 'clamp(1.5rem, 3vw, 2rem)',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.3))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                background: team.logoUrl
                  ? `url(${team.logoUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 900,
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                flexShrink: 0
              }}
            >
              {!team.logoUrl && (team.name ? team.name.charAt(0).toUpperCase() : 'T')}
            </div>

            {/* Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span className="badge badge-info">{team.sport?.name || 'Cricket'}</span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                  {team.division || 'Open Division'}
                </span>
                <span className="badge badge-success">{team.status}</span>
              </div>

              <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff' }}>
                {team.name}
              </h1>

              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                {team.captain?.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={14} color="#f59e0b" />
                    <span>Captain: <strong style={{ color: '#fff' }}>{team.captain.name}</strong></span>
                  </div>
                )}
                {team.coachName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={14} color="#38bdf8" />
                    <span>Coach: {team.coachName}</span>
                  </div>
                )}
                {team.homeLocation && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="#ef4444" />
                    <span>{team.homeLocation}</span>
                  </div>
                )}
                {team.tournamentName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Trophy size={14} color="#fbbf24" />
                    <span>{team.tournamentName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Organizer Manage Actions */}
          {team.canManage && (
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserPlus size={16} /> Add Player to Roster
            </button>
          )}
        </div>

        {team.description && (
          <p style={{ marginTop: '1.25rem', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', margin: '1.25rem 0 0 0' }}>
            {team.description}
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Squad Size</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8' }}>{team.memberCount || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Players Registered</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Matches</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{stats.matchesPlayed || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Played</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Wins</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399' }}>{stats.won || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Victories</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Losses</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171' }}>{stats.lost || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Defeats</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Win Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24' }}>{stats.winPercentage || '0%'}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Success Rate</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.75rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { key: 'roster', label: `Squad Roster (${team.members?.length || 0})`, icon: <Users size={15} /> },
          { key: 'matches', label: `Recent Results (${team.recentMatches?.length || 0})`, icon: <Trophy size={15} /> },
          { key: 'fixtures', label: `Upcoming Fixtures (${team.upcomingFixtures?.length || 0})`, icon: <Calendar size={15} /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === tab.key ? '#34d399' : 'var(--text-muted, #94a3b8)',
              fontWeight: activeTab === tab.key ? 800 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {/* 1. SQUAD ROSTER */}
      {activeTab === 'roster' && (
        <div>
          {(!team.members || team.members.length === 0) ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '16px' }}>
              <Users size={44} color="#64748b" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Players Registered Yet</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Add players to register this squad for tournaments and track individual performances.
              </p>
              {team.canManage && (
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <UserPlus size={16} /> Add First Player
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              {team.members.map((member) => (
                <div
                  key={member.memberId}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    border: member.isCaptain ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: member.profilePhoto
                            ? `url(${member.profilePhoto}) center/cover no-repeat`
                            : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          border: '2px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        {!member.profilePhoto && (member.name ? member.name.charAt(0).toUpperCase() : 'P')}
                      </div>

                      <div>
                        {member.userId ? (
                          <Link
                            href={`/players/${member.userId}`}
                            style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>{member.name}</span>
                            <ChevronRight size={14} color="#94a3b8" />
                          </Link>
                        ) : (
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{member.name}</div>
                        )}
                        {member.username && (
                          <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                            @{member.username}
                          </div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {member.position || 'Player'}
                        </div>
                      </div>
                    </div>

                    {member.jerseyNumber && (
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        #{member.jerseyNumber}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {member.isCaptain && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                          CAPTAIN
                        </span>
                      )}
                      {member.isViceCaptain && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                          VICE-CAPTAIN
                        </span>
                      )}
                      <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                        {member.role}
                      </span>
                    </div>

                    {team.canManage && (
                      <button
                        onClick={() => handleRemovePlayer(member.memberId, member.name)}
                        title="Remove Player from Squad"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. RECENT RESULTS */}
      {activeTab === 'matches' && (
        <div>
          {(!team.recentMatches || team.recentMatches.length === 0) ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '16px' }}>
              <Trophy size={40} color="#64748b" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Matches Completed Yet</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>Match scorecards and results will appear here once played.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {team.recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                      {m.tournamentName} &bull; {m.date ? new Date(m.date).toLocaleDateString() : 'Recent'}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      {team.name} vs {m.opponent}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700, marginTop: '0.2rem' }}>
                      {m.result}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                      {m.scoreSummary || 'Completed'}
                    </div>
                    <Link href={`/matches/${m.id}`} className="btn btn-outline btn-sm">
                      View Scorecard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. UPCOMING FIXTURES */}
      {activeTab === 'fixtures' && (
        <div>
          {(!team.upcomingFixtures || team.upcomingFixtures.length === 0) ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '16px' }}>
              <Calendar size={40} color="#64748b" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Upcoming Fixtures</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>Check tournament fixtures to see newly scheduled match dates.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {team.upcomingFixtures.map((f) => (
                <div
                  key={f.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                      {f.tournamentName} &bull; Match #{f.matchNumber}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      {team.name} vs {f.opponent}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={13} color="#10b981" />
                      <span>{f.date ? new Date(f.date).toLocaleDateString() : 'Scheduled'} at {f.startTime || 'TBD'} &bull; {f.courtName || 'Court'}</span>
                    </div>
                  </div>

                  <Link href={`/matches/${f.id}`} className="btn btn-primary btn-sm">
                    Match Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Player to Roster Modal (Option A: Existing User, Option B: Register New Player) */}
      {showAddPlayerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-modal, #0f172a)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '18px', padding: '1.75rem', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Add Player to {team.name} Roster
              </h3>
              <button
                type="button"
                onClick={resetAddModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Option A / Option B Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setAddMode('search')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: addMode === 'search' ? '#10b981' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Search size={14} /> Option A: Existing User
              </button>
              <button
                type="button"
                onClick={() => setAddMode('create')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: addMode === 'create' ? '#10b981' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <UserPlus size={14} /> Option B: New Player
              </button>
            </div>

            <form onSubmit={handleAddPlayer}>
              {/* ─── OPTION A: SEARCH EXISTING USER ─── */}
              {addMode === 'search' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                    Search Player by Name or @username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Search size={15} />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type name or @username (e.g. rahul)..."
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem 0.65rem 2.1rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                    {isSearching && (
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <Loader2 size={15} className="spin" color="#38bdf8" />
                      </div>
                    )}
                  </div>

                  {/* Selected User Preview Card */}
                  {selectedUser && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: selectedUser.profilePhoto
                            ? `url(${selectedUser.profilePhoto}) center/cover no-repeat`
                            : '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.9rem'
                        }}>
                          {!selectedUser.profilePhoto && (selectedUser.fullName?.charAt(0) || 'U')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
                            {selectedUser.fullName}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                            @{selectedUser.username}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem' }}>
                        <Check size={12} /> Selected
                      </span>
                    </div>
                  )}

                  {/* Autocomplete Search Dropdown */}
                  {!selectedUser && searchResults.length > 0 && (
                    <div style={{ marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                      {searchResults.map((usr) => (
                        <div
                          key={usr.id}
                          onClick={() => setSelectedUser(usr)}
                          style={{
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: usr.profilePhoto
                                ? `url(${usr.profilePhoto}) center/cover no-repeat`
                                : '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {!usr.profilePhoto && usr.fullName?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{usr.fullName}</div>
                              <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'monospace' }}>@{usr.username}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Select &rarr;</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── OPTION B: REGISTER NEW PLAYER WITH PHOTO ─── */}
              {addMode === 'create' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                      Player Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="e.g. Rohit Sharma"
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Unique Username with Availability Check */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                        Unique Handle (@username)
                      </label>
                      {isCheckingUsername && (
                        <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Loader2 size={11} className="spin" /> Checking...
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <AtSign size={15} />
                      </div>
                      <input
                        type="text"
                        value={newPlayerUsername}
                        onChange={(e) => setNewPlayerUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="e.g. rohit_sharma"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.65rem 0.65rem 2.1rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)',
                          border: usernameStatus?.available
                            ? '1px solid #10b981'
                            : usernameStatus?.available === false
                            ? '1px solid #ef4444'
                            : '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '0.88rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    {usernameStatus && (
                      <div style={{ marginTop: '0.35rem' }}>
                        {usernameStatus.available ? (
                          <span style={{ fontSize: '0.74rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Available
                          </span>
                        ) : (
                          <div>
                            <span style={{ fontSize: '0.74rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={12} /> Taken. Pick an alternative:
                            </span>
                            {usernameStatus.suggestions?.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 4 }}>
                                {usernameStatus.suggestions.map((sug) => (
                                  <button
                                    key={sug}
                                    type="button"
                                    onClick={() => setNewPlayerUsername(sug)}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      color: '#38bdf8',
                                      fontSize: '0.72rem',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                      fontFamily: 'monospace'
                                    }}
                                  >
                                    @{sug}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player Photo Upload */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                      Player Photo (Auto-compressed to WebP)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: playerPhotoPreview
                          ? `url(${playerPhotoPreview}) center/cover no-repeat`
                          : 'rgba(255,255,255,0.06)',
                        border: '2px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        overflow: 'hidden'
                      }}>
                        {!playerPhotoPreview && <Camera size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          style={{
                            fontSize: '0.8rem',
                            color: '#cbd5e1'
                          }}
                        />
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                          Square avatar 512x512 WebP generated before upload
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ─── COMMON TEAM SPECIFIC FIELDS (Jersey, Role, Position) ─── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    value={newPlayerJersey}
                    onChange={(e) => setNewPlayerJersey(e.target.value)}
                    placeholder="e.g. 18"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={newPlayerPosition}
                    onChange={(e) => setNewPlayerPosition(e.target.value)}
                    placeholder="e.g. Opening Batsman"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                  Squad Role
                </label>
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.75rem', borderRadius: '8px', backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="PLAYER">Player</option>
                  <option value="CAPTAIN">Captain</option>
                  <option value="VICE_CAPTAIN">Vice-Captain</option>
                  <option value="GOALKEEPER">Goalkeeper</option>
                  <option value="SUBSTITUTE">Substitute</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={resetAddModal}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (addMode === 'search' && !selectedUser)}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {isSubmitting ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                  {isSubmitting ? 'Registering...' : addMode === 'search' ? 'Add to Squad' : 'Create & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
