'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  X, Search, Users, Shield, Crown, Star, UserPlus,
  RefreshCw, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  Sparkles, Award, Zap, Pencil, Trash2
} from 'lucide-react';
import {
  getSportRoles,
  getRoleCategories,
  getRoleConfig,
  CRICKET_EXTRAS
} from '../../config/sportRoles';

export default function TeamRosterDrawer({
  isOpen,
  onClose,
  team,
  tournament,
  onRosterUpdated
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rosterData, setRosterData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add Player form state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('');
  const [newPlayerLeadership, setNewPlayerLeadership] = useState('PLAYER'); // 'PLAYER' | 'CAPTAIN' | 'VICE_CAPTAIN'
  const [newPlayerBattingStyle, setNewPlayerBattingStyle] = useState('');
  const [newPlayerBowlingStyle, setNewPlayerBowlingStyle] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sportSlug = tournament?.sport?.slug || tournament?.sportSlug || (tournament?.sport?.name ? tournament.sport.name.toLowerCase() : '') || 'cricket';
  const isCricket = sportSlug.includes('cricket');

  // Available roles for the current tournament sport
  const sportRoles = useMemo(() => getSportRoles(sportSlug), [sportSlug]);
  const roleCategories = useMemo(() => getRoleCategories(sportSlug), [sportSlug]);

  // Set default role when roles load
  useEffect(() => {
    if (sportRoles.length > 0 && !newPlayerRole) {
      setNewPlayerRole(sportRoles[0].label);
    }
  }, [sportRoles, newPlayerRole]);

  // Fetch Squad Roster
  const fetchRoster = useCallback(async () => {
    if (!tournament?.id || !team?.id) return;
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('turf_token') || localStorage.getItem('token'))
        : null;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `/api/tournaments/${tournament.id}/teams/${team.id}/players`,
        { headers }
      );

      if (res.data?.success) {
        setRosterData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to load team squad.');
      }
    } catch (err) {
      console.error('Error loading team roster:', err);
      // Fallback: if tournament team roster API fails, try direct team API or local members
      if (team.members && Array.isArray(team.members) && team.members.length > 0) {
        setRosterData({
          tournament: {
            id: tournament.id,
            name: tournament.name,
            sportSlug
          },
          team: {
            id: team.id,
            name: team.name,
            logoUrl: team.logo,
            groupName: team.groupName || 'Group 1',
            totalPlayers: team.members.length,
            captainName: team.members.find(m => m.isCaptain)?.name || null,
            viceCaptainName: team.members.find(m => m.isViceCaptain)?.name || null
          },
          canManage: false,
          players: team.members
        });
      } else {
        setError(err.response?.data?.message || 'Failed to load squad roster. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [tournament?.id, team?.id, team, sportSlug]);

  // Load roster whenever drawer opens
  useEffect(() => {
    if (isOpen && team) {
      fetchRoster();
      setSearchQuery('');
      setSelectedCategory('All');
      setShowAddPlayer(false);
      setAddError('');
      setAddSuccess('');
    }
  }, [isOpen, team, fetchRoster]);

  // Keyboard accessibility: Close on ESC key & trap body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Start Editing Player
  const handleStartEdit = (player) => {
    setEditingPlayerId(player.id);
    setNewPlayerName(player.name || '');
    setNewPlayerJersey(player.jerseyNumber != null ? String(player.jerseyNumber) : '');
    setNewPlayerRole(player.role || (sportRoles[0]?.label || 'Player'));
    setNewPlayerLeadership(player.isCaptain ? 'CAPTAIN' : player.isViceCaptain ? 'VICE_CAPTAIN' : 'PLAYER');
    setNewPlayerBattingStyle(player.battingStyle || '');
    setNewPlayerBowlingStyle(player.bowlingStyle || '');
    setAddError('');
    setAddSuccess('');
    setShowAddPlayer(true);
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setNewPlayerName('');
    setNewPlayerJersey('');
    setNewPlayerLeadership('PLAYER');
    setNewPlayerBattingStyle('');
    setNewPlayerBowlingStyle('');
    setAddError('');
    setAddSuccess('');
    setShowAddPlayer(false);
  };

  // Handle Add / Edit Player submission
  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      setAddError('Player name is required.');
      return;
    }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('turf_token') || localStorage.getItem('token'))
        : null;

      if (!token) {
        setAddError('Authentication required. Please sign in as an admin or organizer to save player details.');
        setAddLoading(false);
        return;
      }

      const payload = {
        name: newPlayerName.trim(),
        jerseyNumber: newPlayerJersey ? parseInt(newPlayerJersey, 10) : null,
        role: newPlayerRole || 'Player',
        isCaptain: newPlayerLeadership === 'CAPTAIN',
        isViceCaptain: newPlayerLeadership === 'VICE_CAPTAIN',
        battingStyle: isCricket ? newPlayerBattingStyle || null : null,
        bowlingStyle: isCricket ? newPlayerBowlingStyle || null : null
      };

      const isEdit = Boolean(editingPlayerId);
      const url = isEdit
        ? `/api/tournaments/${tournament.id}/teams/${team.id}/players/${editingPlayerId}`
        : `/api/tournaments/${tournament.id}/teams/${team.id}/players`;

      const res = await (isEdit ? axios.put(url, payload, { headers: { Authorization: `Bearer ${token}` } })
                               : axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } }));

      if (res.data?.success) {
        setAddSuccess(isEdit ? `Updated "${newPlayerName.trim()}" successfully!` : `Added "${newPlayerName.trim()}" to squad successfully!`);
        setNewPlayerName('');
        setNewPlayerJersey('');
        setNewPlayerLeadership('PLAYER');
        setNewPlayerBattingStyle('');
        setNewPlayerBowlingStyle('');
        setEditingPlayerId(null);

        // Refresh roster
        await fetchRoster();
        if (onRosterUpdated) {
          onRosterUpdated();
        }

        setTimeout(() => {
          setShowAddPlayer(false);
          setAddSuccess('');
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to save squad player:', err);
      setAddError(err.response?.data?.message || 'Failed to save player. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Delete Player Submission
  const handleDeletePlayerSubmit = async () => {
    if (!deleteConfirmPlayer) return;
    setDeleteLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('turf_token') || localStorage.getItem('token'))
        : null;
      const res = await axios.delete(
        `/api/tournaments/${tournament.id}/teams/${team.id}/players/${deleteConfirmPlayer.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setDeleteConfirmPlayer(null);
        await fetchRoster();
        if (onRosterUpdated) {
          onRosterUpdated();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove player from squad.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered Players
  const allPlayers = rosterData?.players || [];
  const filteredPlayers = useMemo(() => {
    let list = [...allPlayers];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const roleMatch = (p.role || '').toLowerCase().includes(q);
        const jerseyMatch = String(p.jerseyNumber || '').includes(q);
        const batMatch = (p.battingStyle || '').toLowerCase().includes(q);
        const bowlMatch = (p.bowlingStyle || '').toLowerCase().includes(q);
        return nameMatch || roleMatch || jerseyMatch || batMatch || bowlMatch;
      });
    }

    // Role category filter
    if (selectedCategory !== 'All') {
      list = list.filter((p) => {
        const conf = getRoleConfig(sportSlug, p.role);
        return conf.category?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    return list;
  }, [allPlayers, searchQuery, selectedCategory, sportSlug]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: allPlayers.length };
    allPlayers.forEach((p) => {
      const conf = getRoleConfig(sportSlug, p.role);
      const cat = conf.category || 'Players';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allPlayers, sportSlug]);

  if (!isOpen) return null;

  const teamName = rosterData?.team?.name || team?.name || 'Team Squad';
  const teamLogo = rosterData?.team?.logoUrl || team?.logo;
  const groupName = rosterData?.team?.groupName || team?.groupName || 'Group 1';
  const totalCount = rosterData?.team?.totalPlayers ?? allPlayers.length;
  const captainName = rosterData?.team?.captainName || allPlayers.find(p => p.isCaptain)?.name || null;
  const viceCaptainName = rosterData?.team?.viceCaptainName || allPlayers.find(p => p.isViceCaptain)?.name || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-drawer-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'opacity 0.25s ease'
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Slide-over Drawer Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '540px',
          height: '100%',
          background: 'var(--bg-modal, #0f172a)',
          borderLeft: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'var(--text-main, #e2e8f0)'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
            position: 'relative'
          }}
        >
          {/* Top row: Tournament info + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              <Shield size={14} color="var(--accent-primary, #10b981)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
                {tournament?.name || 'Tournament Squad'}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close squad roster"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main, #ffffff)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'var(--text-main, #ffffff)';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Team identity card in header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {teamLogo ? (
              <img
                src={teamLogo}
                alt={teamName}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  objectFit: 'cover',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  flexShrink: 0
                }}
              >
                {teamName.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3
                  id="roster-drawer-title"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-heading, #ffffff)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {teamName}
                </h3>
                {groupName && (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--accent-primary, #34d399)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {groupName}
                  </span>
                )}
              </div>

              {/* Meta stats pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: 'var(--text-main, #cbd5e1)' }}>
                  <Users size={13} color="var(--accent-primary, #10b981)" /> {totalCount} Squad {totalCount === 1 ? 'Player' : 'Players'}
                </span>
                {captainName && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#d97706', fontWeight: 600 }}>
                    <Crown size={12} /> C: <strong style={{ color: 'var(--text-heading)' }}>{captainName}</strong>
                  </span>
                )}
                {viceCaptainName && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#0284c7', fontWeight: 600 }}>
                    <Star size={12} /> VC: <strong style={{ color: 'var(--text-heading)' }}>{viceCaptainName}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Search bar & Add Player Button */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Search squad players by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: '8px',
                  background: 'var(--input-bg, rgba(255, 255, 255, 0.06))',
                  border: '1px solid var(--input-border, rgba(255, 255, 255, 0.15))',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary, #10b981)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--input-border, rgba(255, 255, 255, 0.15))')}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (showAddPlayer) {
                  handleCancelEdit();
                } else {
                  setEditingPlayerId(null);
                  setShowAddPlayer(true);
                }
              }}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <UserPlus size={14} />
              <span>{showAddPlayer ? 'Cancel' : 'Add Player'}</span>
            </button>
          </div>

          {/* Role Filter Chips Bar */}
          {roleCategories.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                paddingTop: '0.75rem',
                paddingBottom: '0.2rem',
                scrollbarWidth: 'none'
              }}
            >
              {roleCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      background: isSelected
                        ? 'var(--accent-primary, #10b981)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                      border: isSelected
                        ? '1px solid var(--accent-primary, #10b981)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{cat}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        opacity: isSelected ? 0.9 : 0.6,
                        background: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '10px'
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Expandable Add Player to Squad Form */}
        {showAddPlayer && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(16, 185, 129, 0.04)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={15} color="var(--accent-primary, #10b981)" /> {editingPlayerId ? `Edit Squad Player: ${newPlayerName || ''}` : `Add Player to ${teamName}`}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {tournament?.sport?.name || 'Tournament'} Squad
              </span>
            </div>

            {addError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={14} /> {addError}
              </div>
            )}

            {addSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <CheckCircle size={14} /> {addSuccess}
              </div>
            )}

            <form onSubmit={handleAddPlayerSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jasprit Bumrah"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '6px',
                      background: 'var(--input-bg, rgba(255, 255, 255, 0.06))',
                      border: '1px solid var(--input-border, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                    Jersey #
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="e.g. 93"
                    value={newPlayerJersey}
                    onChange={(e) => setNewPlayerJersey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '6px',
                      background: 'var(--input-bg, rgba(255, 255, 255, 0.06))',
                      border: '1px solid var(--input-border, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Role dropdown populated dynamically from sportRoles config */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                    Sport Role / Position *
                  </label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2.5rem 0.5rem 0.65rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    {sportRoles.map((r) => (
                      <option key={r.id} value={r.label} style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>
                        {r.icon ? `${r.icon} ` : ''}{r.label}
                      </option>
                    ))}
                    {!sportRoles.some(r => r.label === 'Player') && (
                      <option value="Player" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>
                        Player (Generic)
                      </option>
                    )}
                  </select>
                </div>

                {/* Leadership Selector: Ensures only one captain and one vice-captain */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Squad Role
                  </label>
                  <select
                    value={newPlayerLeadership}
                    onChange={(e) => setNewPlayerLeadership(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2.5rem 0.5rem 0.65rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="PLAYER" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>Regular Squad Member</option>
                    <option value="CAPTAIN" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>👑 Team Captain (C)</option>
                    <option value="VICE_CAPTAIN" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>⭐ Vice-Captain (VC)</option>
                  </select>
                </div>
              </div>

              {/* Cricket Extras: Batting Hand & Bowling Style */}
              {isCricket && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Batting Style (Optional)
                    </label>
                    <select
                      value={newPlayerBattingStyle}
                      onChange={(e) => setNewPlayerBattingStyle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 2.5rem 0.45rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>-- Not specified --</option>
                      {CRICKET_EXTRAS.battingHands.map((bh) => (
                        <option key={bh} value={bh} style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>{bh}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Bowling Style (Optional)
                    </label>
                    <select
                      value={newPlayerBowlingStyle}
                      onChange={(e) => setNewPlayerBowlingStyle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 2.5rem 0.45rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="" style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>-- Not specified --</option>
                      {CRICKET_EXTRAS.bowlingStyles.map((bs) => (
                        <option key={bs} value={bs} style={{ background: 'var(--bg-modal)', color: 'var(--text-main)' }}>{bs}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {addLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Saving...
                    </>
                  ) : editingPlayerId ? (
                    <>
                      <CheckCircle size={13} /> Save Player Changes
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} /> Add to Squad
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Players List Section (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Loading Skeletons */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem'
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      animation: 'pulse 1.5s infinite'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: '55%',
                        height: 14,
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.08)',
                        marginBottom: '0.4rem',
                        animation: 'pulse 1.5s infinite'
                      }}
                    />
                    <div
                      style={{
                        width: '35%',
                        height: 10,
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.05)',
                        animation: 'pulse 1.5s infinite'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 70,
                      height: 22,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.06)',
                      animation: 'pulse 1.5s infinite'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Error State with Retry Button */}
          {!loading && error && (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px'
              }}
            >
              <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)', marginBottom: '0.35rem' }}>
                Unable to load squad roster
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '1rem', maxWidth: '360px', margin: '0 auto 1rem auto' }}>
                {error}
              </p>
              <button
                onClick={fetchRoster}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={13} /> Retry Loading
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && allPlayers.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.12)'
              }}
            >
              <Users size={42} color="var(--text-muted, #94a3b8)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)', marginBottom: '0.35rem' }}>
                No Players Added Yet
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '320px', margin: '0 auto 1.25rem auto' }}>
                This team does not have any squad players registered in this tournament yet.
              </p>
              <button
                onClick={() => setShowAddPlayer(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={14} /> Add First Player
              </button>
            </div>
          )}

          {/* No search matches */}
          {!loading && !error && allPlayers.length > 0 && filteredPlayers.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--text-muted, #94a3b8)'
              }}
            >
              <Search size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-main, #ffffff)' }}>
                No players match your search filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="btn btn-outline btn-sm"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Player Cards */}
          {!loading && !error && filteredPlayers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredPlayers.map((player, idx) => {
                const roleConfig = getRoleConfig(sportSlug, player.role);
                const isCap = Boolean(player.isCaptain);
                const isVC = Boolean(player.isViceCaptain);

                return (
                  <div
                    key={player.id || `${player.name}-${idx}`}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: isCap
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                        : isVC
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isCap
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : isVC
                        ? '1px solid rgba(56, 189, 248, 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.background = isCap
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)'
                        : 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.background = isCap
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                        : isVC
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                        : 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    {/* Left: Avatar / Initials + Jersey Number */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {player.avatar ? (
                          <img
                            src={player.avatar}
                            alt={player.name}
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isCap ? '2px solid #f59e0b' : isVC ? '2px solid #38bdf8' : '2px solid rgba(255, 255, 255, 0.15)'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              background: isCap
                                ? 'linear-gradient(135deg, #d97706, #b45309)'
                                : isVC
                                ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              border: isCap ? '2px solid #f59e0b' : isVC ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)'
                            }}
                          >
                            {(player.name || 'P').charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Jersey Number badge overlay */}
                        {player.jerseyNumber != null && (
                          <span
                            title={`Jersey #${player.jerseyNumber}`}
                            style={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              background: '#1e293b',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              padding: '0.05rem 0.3rem',
                              borderRadius: '10px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              lineHeight: 1.2
                            }}
                          >
                            #{player.jerseyNumber}
                          </span>
                        )}
                      </div>

                      {/* Name & Subtitles */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: 'var(--text-heading, #ffffff)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {player.name}
                          </span>

                          {/* Captain Badge */}
                          {isCap && (
                            <span
                              title="Team Captain"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.45)',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                letterSpacing: '0.04em'
                              }}
                            >
                              <Crown size={10} /> C
                            </span>
                          )}

                          {/* Vice-Captain Badge */}
                          {isVC && (
                            <span
                              title="Vice-Captain"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.3))',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                letterSpacing: '0.04em'
                              }}
                            >
                              <Star size={10} /> VC
                            </span>
                          )}
                        </div>

                        {/* Extra metadata: Batting / Bowling style / Position Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                          {player.battingStyle && (
                            <span>{player.battingStyle}</span>
                          )}
                          {player.battingStyle && player.bowlingStyle && (
                            <span>&bull;</span>
                          )}
                          {player.bowlingStyle && (
                            <span>{player.bowlingStyle}</span>
                          )}
                          {!player.battingStyle && !player.bowlingStyle && player.experienceLevel && (
                            <span>{player.experienceLevel}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Colored Sport Role Caption Badge + Actions */}
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: roleConfig.badgeBg || 'rgba(100, 116, 139, 0.15)',
                          color: roleConfig.badgeColor || '#94a3b8',
                          border: `1px solid ${roleConfig.borderColor || 'rgba(100, 116, 139, 0.3)'}`,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          boxShadow: `0 2px 6px ${roleConfig.badgeBg || 'transparent'}`
                        }}
                      >
                        {roleConfig.icon && <span style={{ fontSize: '0.85rem' }}>{roleConfig.icon}</span>}
                        <span>{roleConfig.label || player.role || 'Player'}</span>
                      </span>

                      {rosterData?.canManage && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(player);
                            }}
                            title="Edit player details"
                            style={{
                              background: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              borderRadius: '6px',
                              padding: '0.3rem 0.45rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)')}
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmPlayer({ id: player.id, name: player.name });
                            }}
                            title="Remove player from squad"
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '0.3rem 0.45rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer with count and quick summary */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #94a3b8)'
          }}
        >
          <span>
            Showing <strong style={{ color: 'var(--text-heading, #ffffff)' }}>{filteredPlayers.length}</strong> of{' '}
            <strong style={{ color: 'var(--text-heading, #ffffff)' }}>{allPlayers.length}</strong> players
          </span>

          <button
            onClick={fetchRoster}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Delete Player Confirmation Modal */}
      {deleteConfirmPlayer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'var(--bg-modal, #0f172a)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f87171' }}>
              Remove Player from Squad?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Are you sure you want to remove <strong>{deleteConfirmPlayer.name}</strong> from {teamName}?
              <br /><br />
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Note: The player will be removed from this team's squad roster. Historical match scorecards and achievements will remain intact.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmPlayer(null)}
                disabled={deleteLoading}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlayerSubmit}
                disabled={deleteLoading}
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#ffffff' }}
              >
                {deleteLoading ? 'Removing...' : 'Remove Player'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
