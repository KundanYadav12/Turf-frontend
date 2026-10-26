'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  setTeamLoading,
  setMyTeams,
  setDiscoverTeams,
  removeTeam
} from '../features/team/teamSlice';
import {
  Shield, Plus, Users, MapPin, Search, Trash2, CheckCircle2,
  Trophy, ChevronRight, User, Phone
} from 'lucide-react';

const SPORTS_OPTIONS = [
  { slug: 'cricket', name: 'Cricket', id: 1 },
  { slug: 'football', name: 'Football', id: 2 },
  { slug: 'badminton', name: 'Badminton', id: 3 },
  { slug: 'pickleball', name: 'Pickleball', id: 4 },
  { slug: 'tennis', name: 'Tennis', id: 5 },
  { slug: 'table-tennis', name: 'Table Tennis', id: 6 },
  { slug: 'volleyball', name: 'Volleyball', id: 7 },
  { slug: 'basketball', name: 'Basketball', id: 8 }
];

const TeamsPage = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const { myTeams, discoverTeams: publicTeams, loading } = useSelector((state) => state.team);

  const isOwner = user?.role === 'VENUE_OWNER' || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('discover');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user?.role === 'VENUE_OWNER' || user?.role === 'ADMIN') {
      setActiveTab('my-teams');
    }
  }, [user]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');

  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [teamSportId, setTeamSportId] = useState(1);
  const [teamDivision, setTeamDivision] = useState('Open');
  const [coachName, setCoachName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [initialPlayersText, setInitialPlayersText] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // 1. Fetch MY TEAMS
  const fetchMyTeams = useCallback(async () => {
    if (!token) return;
    dispatch(setTeamLoading(true));
    try {
      const res = await axios.get('/api/teams/my-teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        dispatch(setMyTeams(res.data.data));
      }
    } catch (err) {
      console.error('Failed to load my teams:', err);
    } finally {
      dispatch(setTeamLoading(false));
    }
  }, [token, dispatch]);

  // 2. Fetch PUBLIC DISCOVERY Teams
  const fetchDiscoverTeams = useCallback(async () => {
    dispatch(setTeamLoading(true));
    try {
      const params = {};
      if (search) params.search = search;
      if (sportFilter) params.sportSlug = sportFilter;

      const res = await axios.get('/api/teams', { params });
      if (res.data.success) {
        dispatch(setDiscoverTeams(res.data.data));
      }
    } catch (err) {
      console.error('Failed to load discover teams:', err);
    } finally {
      dispatch(setTeamLoading(false));
    }
  }, [search, sportFilter, dispatch]);

  useEffect(() => {
    if (activeTab === 'my-teams' && isAuthenticated) {
      fetchMyTeams();
    } else {
      fetchDiscoverTeams();
    }
  }, [activeTab, isAuthenticated, fetchMyTeams, fetchDiscoverTeams]);

  // Handle Team Creation
  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const initialPlayers = initialPlayersText
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean)
        .map(name => ({ fullName: name, role: 'PLAYER' }));

      const res = await axios.post('/api/teams', {
        name: teamName.trim(),
        logoUrl: teamLogo.trim() || undefined,
        sportId: teamSportId,
        division: teamDivision,
        coachName: coachName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        homeLocation: homeLocation.trim() || undefined,
        description: teamDesc.trim() || undefined,
        initialPlayers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setTeamName('');
        setTeamLogo('');
        setCoachName('');
        setContactPhone('');
        setHomeLocation('');
        setTeamDesc('');
        setInitialPlayersText('');
        fetchMyTeams();
        fetchDiscoverTeams();
      }
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Failed to create team.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? Historical tournament records will remain intact.')) return;

    try {
      const res = await axios.delete(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        dispatch(removeTeam(teamId));
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete team.');
    }
  };

  const displayedTeams = activeTab === 'my-teams' ? myTeams : publicTeams;

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 2rem) clamp(0.75rem, 2vw, 1.5rem)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.8vw, 2.2rem)', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #0f172a)', lineHeight: 1.25 }}>
            Sports Teams &amp; Squad Rosters
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
            Discover clubs, manage tournament rosters, track win-loss records, and build championship squads.
          </p>
        </div>

        {isMounted && isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Plus size={16} /> Create New Team
          </button>
        )}
      </div>

      {/* Tabs & Filters Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.08))',
        paddingBottom: '0.85rem'
      }}>
        {/* Tabs */}
        <div
          className="touch-tabs-bar"
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: '2px'
          }}
        >
          {isMounted && isAuthenticated && isOwner && (
            <button
              onClick={() => setActiveTab('my-teams')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid ' + (activeTab === 'my-teams' ? 'var(--accent-primary, #059669)' : 'var(--border-color, rgba(0,0,0,0.08))'),
                background: activeTab === 'my-teams' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary, rgba(0,0,0,0.03))',
                color: activeTab === 'my-teams' ? 'var(--accent-primary, #059669)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'my-teams' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
            >
              My Managed Teams ({myTeams.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('discover')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid ' + (activeTab === 'discover' ? 'var(--accent-primary, #059669)' : 'var(--border-color, rgba(0,0,0,0.08))'),
              background: activeTab === 'discover' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary, rgba(0,0,0,0.03))',
              color: activeTab === 'discover' ? 'var(--accent-primary, #059669)' : 'var(--text-muted, #64748b)',
              fontWeight: activeTab === 'discover' ? 800 : 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            All Sports Teams ({publicTeams.length})
          </button>
        </div>

        {/* Search & Sport Filter */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', width: '100%', maxWidth: '460px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-input, #ffffff)',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
            flex: '1 1 180px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <Search size={15} color="var(--text-muted, #94a3b8)" />
            <input
              type="text"
              placeholder="Search team or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.85rem',
                width: '100%'
              }}
            />
          </div>

          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input, #ffffff)',
              border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
              color: 'var(--text-primary, #0f172a)',
              padding: '0.45rem 2.5rem 0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <option value="">All Sports</option>
            {SPORTS_OPTIONS.map(s => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="teams-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton-card" style={{ height: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="skeleton-box" style={{ width: 52, height: 52, borderRadius: 14 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton-box" style={{ height: 18, width: '80%' }} />
                  <div className="skeleton-box" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton-box" style={{ height: 14, width: '90%', marginTop: 8 }} />
              <div className="skeleton-box" style={{ height: 14, width: '65%' }} />
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-box" style={{ height: 20, width: '35%' }} />
                <div className="skeleton-box" style={{ height: 32, width: '30%', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayedTeams.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem', borderRadius: '16px' }}>
          <Shield size={48} color="var(--text-muted, #64748b)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading, #0f172a)' }}>No Teams Found</h3>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            {activeTab === 'my-teams'
              ? 'You have not registered any sports teams yet. Click "Create New Team" to build your squad.'
              : 'No teams match your search criteria. Try clearing the filter or search term.'}
          </p>
          {isMounted && isAuthenticated && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus size={16} /> Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="teams-grid">
          {displayedTeams.map((team) => (
            <div key={team.id} className="team-card card-interactive">
              <div>
                {/* Header: Logo, Name & Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        minWidth: 52,
                        borderRadius: '14px',
                        background: team.logoUrl
                          ? `url(${team.logoUrl}) center/cover no-repeat`
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        border: '2px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {!team.logoUrl && (team.name ? team.name.charAt(0).toUpperCase() : 'T')}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <Link
                        href={`/teams/${team.id}`}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: 'var(--text-heading, #0f172a)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          lineHeight: 1.3,
                          wordBreak: 'break-word'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</span>
                        <ChevronRight size={15} color="var(--text-muted, #94a3b8)" style={{ flexShrink: 0 }} />
                      </Link>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          color: 'var(--accent-primary, #059669)',
                          fontWeight: 800,
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '0.12rem 0.5rem',
                          borderRadius: 6
                        }}>
                          {team.sport?.name || 'Sports'}
                        </span>
                        {team.division && (
                          <span style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary, #475569)',
                            fontWeight: 600,
                            background: 'var(--bg-secondary, rgba(0,0,0,0.04))',
                            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                            padding: '0.12rem 0.5rem',
                            borderRadius: 6
                          }}>
                            {team.division}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: '20px',
                      background: team.status === 'ACTIVE'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(100, 116, 139, 0.12)',
                      color: team.status === 'ACTIVE'
                        ? 'var(--accent-primary, #059669)'
                        : 'var(--text-muted, #64748b)',
                      border: `1px solid ${team.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.25)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: team.status === 'ACTIVE' ? '#10b981' : '#94a3b8',
                        boxShadow: team.status === 'ACTIVE' ? '0 0 6px #10b981' : 'none'
                      }}
                    />
                    {team.status || 'ACTIVE'}
                  </span>
                </div>

                {team.description && (
                  <p style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-muted, #64748b)',
                    margin: '0 0 1rem 0',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {team.description}
                  </p>
                )}

                {/* Team Details Summary */}
                <div style={{
                  fontSize: '0.83rem',
                  color: 'var(--text-secondary, #475569)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Users size={15} color="#d97706" />
                    <span><strong style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>{team.memberCount || 0}</strong> Registered Players</span>
                  </div>
                  {team.captainName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <User size={15} color="#0284c7" />
                      <span>Captain: <strong style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>{team.captainName}</strong></span>
                    </div>
                  )}
                  {team.venue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <MapPin size={15} color="#e11d48" />
                      <span>{team.venue.name} ({team.venue.city})</span>
                    </div>
                  )}
                </div>

                {/* W/L Record Box */}
                <div style={{
                  background: 'var(--bg-secondary, rgba(0, 0, 0, 0.03))',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--border-color, rgba(0, 0, 0, 0.07))',
                  flexWrap: 'wrap',
                  gap: '0.4rem'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Record
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    <span style={{ color: '#10b981', fontWeight: 900 }}>{team.won || 0}W</span>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 4px' }}>-</span>
                    <span style={{ color: '#ef4444', fontWeight: 900 }}>{team.lost || 0}L</span>
                    {team.drawn ? <span style={{ color: 'var(--text-muted, #64748b)' }}> - {team.drawn}D</span> : ''}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#d97706',
                    fontWeight: 800,
                    background: 'rgba(217, 119, 6, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(217, 119, 6, 0.2)'
                  }}>
                    {team.winPercentage || '0%'} Win
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-color, rgba(0, 0, 0, 0.07))',
                gap: '0.75rem'
              }}>
                {activeTab === 'my-teams' && (
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}

                <Link
                  href={`/teams/${team.id}`}
                  className="btn btn-primary btn-sm"
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '0.48rem 1rem',
                    borderRadius: '8px'
                  }}
                >
                  <span>View Squad Roster</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0.8))', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-modal, var(--bg-card))', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.75rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-elevated)' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Create New Sports Team
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              Create your squad, assign sport rules, division, and seed initial players.
            </p>

            {createError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Blasters"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Sport *
                  </label>
                  <select
                    value={teamSportId}
                    onChange={(e) => setTeamSportId(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: 8, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  >
                    {SPORTS_OPTIONS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Division / Category
                  </label>
                  <select
                    value={teamDivision}
                    onChange={(e) => setTeamDivision(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: 8, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  >
                    <option value="Open">Open Category</option>
                    <option value="Corporate">Corporate Cup</option>
                    <option value="Under-19">Under-19 (Youth)</option>
                    <option value="Under-16">Under-16 (Junior)</option>
                    <option value="Senior">Senior Masters</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Coach / Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Dravid"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Home City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={homeLocation}
                    onChange={(e) => setHomeLocation(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={teamLogo}
                    onChange={(e) => setTeamLogo(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-heading)' }}>
                  Initial Players (Optional, one name per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Player 1&#10;Player 2&#10;Player 3..."
                  value={initialPlayersText}
                  onChange={(e) => setInitialPlayersText(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-heading)' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Team history, home turf, or tournament ambitions..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {createSubmitting ? 'Creating Team…' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
