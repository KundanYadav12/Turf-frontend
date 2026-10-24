'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Plus,
  RefreshCw,
  Zap,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Filter,
  Layers,
  GitBranch,
  List,
  Check,
  X,
  Shield,
  ChevronRight,
  Info,
  Radio,
  Play
} from 'lucide-react';

const CATEGORY_STYLES = {
  League: {
    bg: 'rgba(56, 189, 248, 0.12)',
    text: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.3)'
  },
  Knockout: {
    bg: 'rgba(168, 85, 247, 0.12)',
    text: '#c084fc',
    border: 'rgba(168, 85, 247, 0.3)'
  },
  'Quarter-Final': {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  'Semi-Final': {
    bg: 'rgba(244, 63, 94, 0.12)',
    text: '#fb7185',
    border: 'rgba(244, 63, 94, 0.3)'
  },
  Final: {
    bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(16, 185, 129, 0.2))',
    text: '#eab308',
    border: 'rgba(234, 179, 8, 0.4)'
  }
};

const STATUS_STYLES = {
  SCHEDULED: {
    bg: 'rgba(56, 189, 248, 0.12)',
    text: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.35)',
    label: 'Scheduled'
  },
  LIVE: {
    bg: 'rgba(239, 68, 68, 0.18)',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.5)',
    label: 'Live Now'
  },
  COMPLETED: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#34d399',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Completed'
  }
};

const formatDateForInput = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') {
    if (raw.includes('T')) return raw.split('T')[0];
    if (raw.length === 10 && raw.includes('-')) return raw;
  }
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const formatFriendlyDate = (raw) => {
  if (!raw) return '';
  try {
    const dateStr = typeof raw === 'string' && raw.includes('T') ? raw.split('T')[0] : raw;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  return String(raw).slice(0, 10);
};

const formatFriendlyTime = (raw) => {
  if (!raw) return '';
  const timeStr = String(raw).trim();
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    if (!isNaN(hour)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${formattedHour}:${min} ${ampm}`;
    }
  }
  return timeStr;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function TournamentFixturesManager({
  tournament,
  canManage,
  fixtures = [],
  teams = [],
  onRefresh,
  currentUser = null
}) {
  const tournamentId = tournament?.uuid || tournament?.id;
  const isPickleball = tournament?.sport?.slug === 'pickleball' || tournament?.name?.toLowerCase().includes('pickleball');

  // View state: 'list' | 'bracket'
  const [viewMode, setViewMode] = useState('list');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'League' | 'Knockout' | 'Quarter-Final' | 'Semi-Final' | 'Final'
  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Bracket state
  const [bracketData, setBracketData] = useState(null);
  const [loadingBracket, setLoadingBracket] = useState(false);

  // Action loading state (e.g. while toggling LIVE status)
  const [actionLoadingMatchId, setActionLoadingMatchId] = useState(null);

  // Available courts
  const [courts, setCourts] = useState([]);

  // Internal Teams (with auto-fallback fetch if prop is empty)
  const [internalTeams, setInternalTeams] = useState(teams || []);

  useEffect(() => {
    if (teams && teams.length > 0) {
      setInternalTeams(teams);
    } else if (tournamentId) {
      axios.get(`/api/tournaments/${tournamentId}/teams`).then(res => {
        if (res.data?.success) {
          setInternalTeams(res.data.data?.items || res.data.data || []);
        }
      }).catch(() => {});
    }
  }, [teams, tournamentId]);

  // Modal States
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [fixtureForm, setFixtureForm] = useState({
    category: 'League',
    status: 'SCHEDULED',
    matchNumber: '',
    roundNumber: 1,
    teamAId: '',
    teamBId: '',
    groupName: 'Group 1',
    matchDate: '',
    startTime: '09:00:00',
    endTime: '10:00:00',
    courtId: '',
    courtName: '',
    scorerId: '',
    countsInStandings: true,
    allowConflictOverride: false
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Auto-League Modal
  const [showAutoLeagueModal, setShowAutoLeagueModal] = useState(false);
  const [autoLeagueForm, setAutoLeagueForm] = useState({
    groupName: 'ALL',
    startDate: tournament?.startDate ? formatDateForInput(tournament.startDate) : new Date().toISOString().slice(0, 10),
    dailyStartTime: '09:00:00',
    matchDurationMinutes: 60
  });
  const [autoLeagueSubmitting, setAutoLeagueSubmitting] = useState(false);

  // Auto-Knockout Modal
  const [showAutoKnockoutModal, setShowAutoKnockoutModal] = useState(false);
  const [autoKnockoutForm, setAutoKnockoutForm] = useState({
    seedFromStandings: true,
    startDate: tournament?.startDate ? formatDateForInput(tournament.startDate) : new Date().toISOString().slice(0, 10)
  });
  const [autoKnockoutSubmitting, setAutoKnockoutSubmitting] = useState(false);

  // Delete Confirm
  const [deletingFixture, setDeletingFixture] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Load venue courts
  useEffect(() => {
    if (tournament?.venueId || tournament?.venue_id) {
      const vId = tournament.venueId || tournament.venue_id;
      axios.get(`/api/venues/${vId}/courts`).then(res => {
        if (res.data?.success) {
          setCourts(res.data.data || []);
        }
      }).catch(() => {});
    }
  }, [tournament]);

  // Load Bracket Data
  const fetchBracket = useCallback(async () => {
    setLoadingBracket(true);
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/fixtures/bracket`);
      if (res.data?.success) {
        setBracketData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load bracket tree:', err);
    } finally {
      setLoadingBracket(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (viewMode === 'bracket') {
      fetchBracket();
    }
  }, [viewMode, fetchBracket]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: fixtures.length, League: 0, Knockout: 0, 'Quarter-Final': 0, 'Semi-Final': 0, Final: 0 };
    for (const f of fixtures) {
      const cat = f.category || 'League';
      if (counts[cat] !== undefined) counts[cat]++;
    }
    return counts;
  }, [fixtures]);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    if (categoryFilter === 'ALL') return fixtures;
    return fixtures.filter(f => (f.category || 'League') === categoryFilter);
  }, [fixtures, categoryFilter]);

  // Quick 1-click Set Match Status (SCHEDULED / LIVE / COMPLETED)
  const handleQuickSetStatus = async (fixture, newStatus) => {
    const matchId = fixture.id || fixture.uuid || fixture.internalId;
    setActionLoadingMatchId(matchId);
    setErrorMsg('');
    try {
      const res = await axios.put(
        `/api/tournaments/${tournamentId}/fixtures/${matchId}/status`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        if (newStatus === 'LIVE') {
          setNotification(`🔥 Match #${fixture.matchNumber} is now LIVE on TV & Displays!`);
        } else if (newStatus === 'COMPLETED') {
          setNotification(`✅ Match #${fixture.matchNumber} marked as COMPLETED.`);
        } else {
          setNotification(`Match #${fixture.matchNumber} updated to ${newStatus}.`);
        }
        if (onRefresh) onRefresh();
        if (viewMode === 'bracket') fetchBracket();
        setTimeout(() => setNotification(''), 4500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to set match #${fixture.matchNumber} to ${newStatus}.`);
    } finally {
      setActionLoadingMatchId(null);
    }
  };

  // Open Create Fixture Modal
  const handleOpenCreateFixture = () => {
    setEditingFixture(null);
    setConflictWarning(null);
    setFixtureForm({
      category: categoryFilter !== 'ALL' ? categoryFilter : 'League',
      status: 'SCHEDULED',
      matchNumber: '',
      roundNumber: 1,
      teamAId: '',
      teamBId: '',
      groupName: 'Group 1',
      matchDate: formatDateForInput(tournament?.startDate) || new Date().toISOString().slice(0, 10),
      startTime: '09:00:00',
      endTime: '10:00:00',
      courtId: courts[0]?.id || '',
      courtName: courts[0]?.name || '',
      scorerId: '',
      countsInStandings: (categoryFilter !== 'ALL' ? categoryFilter : 'League') === 'League',
      allowConflictOverride: false
    });
    setShowFixtureModal(true);
  };

  // Open Edit Fixture Modal
  const handleOpenEditFixture = (fixture) => {
    setEditingFixture(fixture);
    setConflictWarning(null);
    setFixtureForm({
      category: fixture.category || 'League',
      status: fixture.status || 'SCHEDULED',
      matchNumber: fixture.matchNumber || '',
      roundNumber: fixture.roundNumber || 1,
      teamAId: fixture.teamA?.internalId || fixture.teamA?.id || fixture.teamAId || fixture.team_a_id || '',
      teamBId: fixture.teamB?.internalId || fixture.teamB?.id || fixture.teamBId || fixture.team_b_id || '',
      groupName: fixture.groupName || fixture.group_name || 'Group 1',
      matchDate: formatDateForInput(fixture.date || fixture.match_date || fixture.matchDate),
      startTime: fixture.startTime || fixture.start_time || '09:00:00',
      endTime: fixture.endTime || fixture.end_time || '10:00:00',
      courtId: fixture.courtId || fixture.court_id || '',
      courtName: fixture.courtName || fixture.court_name || '',
      scorerId: fixture.scorerId || fixture.scorer_id || '',
      countsInStandings: fixture.countsInStandings !== undefined ? fixture.countsInStandings : (fixture.category === 'League'),
      allowConflictOverride: false
    });
    setShowFixtureModal(true);
  };

  // Submit Fixture Form (Create or Edit)
  const handleFixtureFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        category: fixtureForm.category,
        status: fixtureForm.status,
        matchNumber: fixtureForm.matchNumber ? parseInt(fixtureForm.matchNumber, 10) : undefined,
        roundNumber: fixtureForm.roundNumber ? parseInt(fixtureForm.roundNumber, 10) : 1,
        teamAId: fixtureForm.teamAId ? parseInt(fixtureForm.teamAId, 10) : null,
        teamBId: fixtureForm.teamBId ? parseInt(fixtureForm.teamBId, 10) : null,
        groupName: fixtureForm.groupName,
        matchDate: fixtureForm.matchDate,
        startTime: fixtureForm.startTime,
        endTime: fixtureForm.endTime,
        courtId: fixtureForm.courtId ? parseInt(fixtureForm.courtId, 10) : null,
        courtName: fixtureForm.courtName,
        scorerId: fixtureForm.scorerId ? parseInt(fixtureForm.scorerId, 10) : null,
        countsInStandings: fixtureForm.countsInStandings,
        allowConflictOverride: fixtureForm.allowConflictOverride
      };

      let res;
      if (editingFixture) {
        res = await axios.put(
          `/api/tournaments/${tournamentId}/fixtures/${editingFixture.id || editingFixture.internalId || editingFixture.uuid}`,
          payload,
          { headers: getAuthHeaders() }
        );
      } else {
        res = await axios.post(
          `/api/tournaments/${tournamentId}/fixtures`,
          payload,
          { headers: getAuthHeaders() }
        );
      }

      if (res.data?.requiresConfirmation) {
        setConflictWarning(res.data);
        return;
      }

      if (res.data?.success) {
        setNotification(res.data.message || 'Fixture saved successfully!');
        setShowFixtureModal(false);
        setEditingFixture(null);
        setConflictWarning(null);
        if (onRefresh) onRefresh();
        if (viewMode === 'bracket') fetchBracket();
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save fixture.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Fixture Submit
  const handleDeleteFixtureSubmit = async () => {
    if (!deletingFixture) return;
    setDeleteSubmitting(true);
    try {
      const res = await axios.delete(
        `/api/tournaments/${tournamentId}/fixtures/${deletingFixture.id || deletingFixture.internalId}?force=true`,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setNotification(`Match #${deletingFixture.matchNumber} deleted.`);
        setDeletingFixture(null);
        if (onRefresh) onRefresh();
        if (viewMode === 'bracket') fetchBracket();
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete fixture.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Auto-League Submit
  const handleAutoLeagueSubmit = async (e) => {
    e.preventDefault();
    setAutoLeagueSubmitting(true);
    setErrorMsg('');
    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/fixtures/auto-league`,
        autoLeagueForm,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setNotification(res.data.message);
        setShowAutoLeagueModal(false);
        if (onRefresh) onRefresh();
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate league fixtures.');
    } finally {
      setAutoLeagueSubmitting(false);
    }
  };

  // Auto-Knockout Submit
  const handleAutoKnockoutSubmit = async (e) => {
    e.preventDefault();
    setAutoKnockoutSubmitting(true);
    setErrorMsg('');
    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/fixtures/auto-knockout`,
        autoKnockoutForm,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setNotification(res.data.message);
        setShowAutoKnockoutModal(false);
        setViewMode('bracket');
        fetchBracket();
        if (onRefresh) onRefresh();
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate knockout bracket.');
    } finally {
      setAutoKnockoutSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Feedback */}
      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header and Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
        backdropFilter: 'blur(10px)',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-heading, #fff)' }}>
            <Calendar size={22} style={{ color: '#38bdf8' }} /> Fixtures & Schedule ({fixtures.length} Total)
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
            Official tournament matches across League and Knockout playoff stages.
          </p>
        </div>

        {/* View Toggle + Organizer Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Toggle Switch */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--accent-primary, #10b981)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-muted, #94a3b8)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <List size={14} /> List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bracket')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'bracket' ? 'var(--accent-primary, #10b981)' : 'transparent',
                color: viewMode === 'bracket' ? '#fff' : 'var(--text-muted, #94a3b8)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <GitBranch size={14} /> Knockout Bracket
            </button>
          </div>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setShowAutoLeagueModal(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                title="Auto-generate round-robin league matches"
              >
                <Layers size={14} /> Auto League
              </button>
              <button
                type="button"
                onClick={() => setShowAutoKnockoutModal(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                title="Generate Quarter-Finals to Final knockout bracket"
              >
                <Trophy size={14} /> Generate Bracket
              </button>
              <button
                type="button"
                onClick={handleOpenCreateFixture}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', border: 'none', fontWeight: 700 }}
              >
                <Plus size={15} /> Create Fixture
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Filter Pills (in List View) */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {['ALL', 'League', 'Knockout', 'Quarter-Final', 'Semi-Final', 'Final'].map((cat) => {
            const isSelected = categoryFilter === cat;
            const style = CATEGORY_STYLES[cat] || { bg: 'rgba(255,255,255,0.06)', text: '#cbd5e1', border: 'rgba(255,255,255,0.1)' };
            const count = categoryCounts[cat] || 0;

            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '20px',
                  background: isSelected ? style.bg : 'var(--bg-card, rgba(30, 41, 59, 0.4))',
                  border: isSelected ? `2px solid ${style.text}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  color: isSelected ? style.text : 'var(--text-muted, #94a3b8)',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat === 'ALL' ? 'All Fixtures' : cat}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 1. KNOCKOUT BRACKET VIEW ── */}
      {viewMode === 'bracket' && (
        <div style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          padding: '1.5rem',
          overflowX: 'auto'
        }}>
          {loadingBracket ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted, #94a3b8)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#10b981' }} />
              <div>Loading tournament playoff bracket...</div>
            </div>
          ) : !bracketData || (bracketData.quarters.length === 0 && bracketData.semis.length === 0 && !bracketData.final) ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <Trophy size={48} style={{ color: 'var(--text-muted, #64748b)', margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #fff)' }}>
                No Knockout Bracket Generated Yet
              </h4>
              <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                Generate a single-elimination playoff bracket seeded from current Points Table standings or approved tournament teams.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowAutoKnockoutModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', border: 'none' }}
                >
                  <Trophy size={16} /> Generate Knockout Bracket
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Bracket Header with Round Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: bracketData.quarters.length > 0 ? 'repeat(3, minmax(280px, 1fr))' : 'repeat(2, minmax(300px, 1fr))', gap: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                {bracketData.quarters.length > 0 && (
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>
                    QUARTER-FINALS
                  </div>
                )}
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', color: '#fb7185', fontWeight: 800, fontSize: '0.9rem' }}>
                  SEMI-FINALS
                </div>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(16, 185, 129, 0.2))', color: '#eab308', fontWeight: 800, fontSize: '0.9rem' }}>
                  CHAMPIONSHIP FINAL
                </div>
              </div>

              {/* Bracket Tree Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: bracketData.quarters.length > 0 ? 'repeat(3, minmax(280px, 1fr))' : 'repeat(2, minmax(300px, 1fr))',
                gap: '2rem',
                alignItems: 'center'
              }}>
                {/* 1. Quarter-Finals Column */}
                {bracketData.quarters.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {bracketData.quarters.map((m) => (
                      <BracketMatchCard key={m.id || m.uuid} match={m} isPickleball={isPickleball} />
                    ))}
                  </div>
                )}

                {/* 2. Semi-Finals Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
                  {bracketData.semis.map((m) => (
                    <BracketMatchCard key={m.id || m.uuid} match={m} isPickleball={isPickleball} />
                  ))}
                </div>

                {/* 3. Final Column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {bracketData.final && (
                    <BracketMatchCard match={bracketData.final} isFinal isPickleball={isPickleball} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. LIST VIEW ── */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredFixtures.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              background: 'var(--bg-card, rgba(30, 41, 59, 0.5))',
              borderRadius: '16px',
              border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.12))'
            }}>
              <Calendar size={40} style={{ color: 'var(--text-muted, #64748b)', margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-heading, #fff)' }}>
                No Fixtures Found in {categoryFilter === 'ALL' ? 'Tournament' : categoryFilter}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 1.25rem 0' }}>
                Use &quot;Create Fixture&quot; to add a match or &quot;Auto League&quot; to schedule all group pairings.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenCreateFixture}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', border: 'none' }}
                >
                  <Plus size={15} /> Create Match Fixture
                </button>
              )}
            </div>
          ) : (
            filteredFixtures.map((f) => {
              const cat = f.category || 'League';
              const catStyle = CATEGORY_STYLES[cat] || CATEGORY_STYLES.League;
              const isLive = f.status === 'LIVE';
              const isCompleted = f.status === 'COMPLETED';
              const isActionLoading = actionLoadingMatchId === (f.id || f.uuid || f.internalId);

              return (
                <div
                  key={f.id || f.uuid || f.internalId}
                  style={{
                    background: isLive
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card, rgba(30, 41, 59, 0.75)) 100%)'
                      : 'var(--bg-card, rgba(30, 41, 59, 0.7))',
                    borderRadius: '16px',
                    border: isLive
                      ? '1px solid rgba(239, 68, 68, 0.45)'
                      : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    borderLeft: isLive
                      ? '5px solid #ef4444'
                      : isCompleted
                      ? '5px solid #10b981'
                      : '5px solid #38bdf8',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    boxShadow: isLive ? '0 8px 24px -4px rgba(239, 68, 68, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Left: Metadata & Teams */}
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    {/* Badges Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                      {/* Category Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`
                      }}>
                        {cat}
                      </span>

                      {/* Match Number */}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted, #94a3b8)'
                      }}>
                        Match #{f.matchNumber}
                      </span>

                      {/* Status */}
                      {isLive ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.55)',
                          boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)'
                        }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                          LIVE NOW
                        </span>
                      ) : isCompleted ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.35)'
                        }}>
                          <CheckCircle size={12} /> COMPLETED
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                          SCHEDULED
                        </span>
                      )}

                      {/* Standings inclusion indicator */}
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: f.countsInStandings ? '#10b981' : 'var(--text-muted, #64748b)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {f.countsInStandings ? '• Standings: Included' : '• Standings: Excluded'}
                      </span>
                    </div>

                    {/* Team Matchup Title */}
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-heading, #fff)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-heading, #fff)' }}>{f.teamA?.name || f.teamAName || 'TBD (Seed / Winner)'}</span>
                      <span style={{
                        color: '#10b981',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        VS
                      </span>
                      <span style={{ color: 'var(--text-heading, #fff)' }}>{f.teamB?.name || f.teamBName || 'TBD (Seed / Winner)'}</span>
                    </div>

                    {/* Schedule & Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--text-muted, #94a3b8)' }}>
                      {(f.date || f.match_date) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={14} style={{ color: '#38bdf8' }} /> {formatFriendlyDate(f.date || f.match_date)}
                        </span>
                      )}
                      {(f.startTime || f.start_time) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={14} style={{ color: '#fbbf24' }} /> {formatFriendlyTime(f.startTime || f.start_time)} {(f.endTime || f.end_time) ? `- ${formatFriendlyTime(f.endTime || f.end_time)}` : ''}
                        </span>
                      )}
                      {(f.courtName || f.venueName) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={14} style={{ color: '#34d399' }} /> {f.courtName || f.venueName}
                        </span>
                      )}
                      {f.groupName && f.groupName !== 'null' && (
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', fontWeight: 600 }}>
                          {f.groupName}
                        </span>
                      )}
                    </div>

                    {/* Result or Live Summary */}
                    {(f.resultSummary || (f.liveScoreSummary && f.liveScoreSummary !== 'Yet to Start')) && (
                      <div style={{
                        marginTop: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        background: isLive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        border: isLive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.88rem',
                        color: isLive ? '#f87171' : '#34d399',
                        fontWeight: 800
                      }}>
                        {f.resultSummary ? `🏆 Result: ${f.resultSummary}` : `⚡ Live Score: ${f.liveScoreSummary}`}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {/* Quick 1-click GO LIVE button when not LIVE */}
                    {canManage && !isLive && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleQuickSetStatus(f, 'LIVE')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.52rem 1.05rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Set match to LIVE on displays and scoring immediately"
                      >
                        {isActionLoading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Starting...
                          </>
                        ) : (
                          <>
                            <Radio size={14} /> 🔴 Go Live
                          </>
                        )}
                      </button>
                    )}

                    {/* Quick action to Mark Completed when LIVE */}
                    {canManage && isLive && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleQuickSetStatus(f, 'COMPLETED')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.52rem 0.95rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          background: 'rgba(16, 185, 129, 0.18)',
                          color: '#34d399',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                        title="Conclude match and mark as Completed"
                      >
                        {isActionLoading ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={14} /> End Match
                          </>
                        )}
                      </button>
                    )}

                    {/* Live Scorer Button */}
                    <Link
                      href={isPickleball ? `/matches/${f.id || f.uuid}/pickleball-scorer` : `/matches/${f.id || f.uuid}/scorer`}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: isLive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(16, 185, 129, 0.18)',
                        color: isLive ? '#ffffff' : '#34d399',
                        border: isLive ? 'none' : '1px solid rgba(16, 185, 129, 0.4)',
                        fontWeight: 800,
                        padding: '0.52rem 1rem',
                        borderRadius: '10px',
                        boxShadow: isLive ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                        textDecoration: 'none',
                        fontSize: '0.82rem'
                      }}
                    >
                      <Zap size={14} /> Live Scorer
                    </Link>

                    {/* Organizer Actions */}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditFixture(f)}
                          className="btn btn-outline btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.5rem 0.8rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.82rem'
                          }}
                          title="Edit / Reschedule Fixture"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFixture(f)}
                          className="btn btn-outline btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                            padding: '0.5rem 0.7rem',
                            borderRadius: '10px',
                            fontSize: '0.82rem'
                          }}
                          title="Delete Fixture"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CREATE / EDIT FIXTURE MODAL ── */}
      {showFixtureModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-modal, var(--bg-card, #1e293b))',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-elevated, 0 20px 45px rgba(0,0,0,0.5))',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calendar size={22} style={{ color: '#10b981' }} />
                <h4 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>
                  {editingFixture ? `Edit Match #${editingFixture.matchNumber}` : 'Create Tournament Fixture'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowFixtureModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFixtureFormSubmit} spellCheck={false} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Conflict Warning Alert */}
              {conflictWarning && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                    <AlertTriangle size={18} />
                    <span>Scheduling Conflict Detected!</span>
                  </div>
                  <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                    {conflictWarning.conflicts.map((c, idx) => (
                      <li key={idx}>{c.message}</li>
                    ))}
                  </ul>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={fixtureForm.allowConflictOverride}
                      onChange={(e) => setFixtureForm(prev => ({ ...prev, allowConflictOverride: e.target.checked }))}
                    />
                    <span>Override warning and schedule anyway</span>
                  </label>
                </div>
              )}

              {/* 1. Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-heading, #ffffff)' }}>
                  Fixture Category *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem' }}>
                  {['League', 'Knockout', 'Quarter-Final', 'Semi-Final', 'Final'].map((cat) => {
                    const isSelected = fixtureForm.category === cat;
                    const style = CATEGORY_STYLES[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFixtureForm(prev => ({
                            ...prev,
                            category: cat,
                            countsInStandings: cat === 'League'
                          }));
                        }}
                        style={{
                          padding: '0.55rem 0.35rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${style.text}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          background: isSelected ? style.bg : 'var(--bg-elevated, rgba(255, 255, 255, 0.05))',
                          color: isSelected ? style.text : 'var(--text-muted, #94a3b8)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1b. Match Status Selector (SCHEDULED / LIVE / COMPLETED) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-heading, #ffffff)' }}>
                  Match Status *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {[
                    { key: 'SCHEDULED', label: '📅 Scheduled', bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' },
                    { key: 'LIVE', label: '🔴 Live Now', bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: '#ef4444' },
                    { key: 'COMPLETED', label: '✅ Completed', bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' }
                  ].map((st) => {
                    const isSelected = fixtureForm.status === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setFixtureForm(prev => ({ ...prev, status: st.key }))}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${st.border}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                          background: isSelected ? st.bg : 'var(--bg-elevated, rgba(255, 255, 255, 0.04))',
                          color: isSelected ? st.text : 'var(--text-muted, #94a3b8)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? `0 0 12px ${st.border}33` : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
                {fixtureForm.status === 'LIVE' && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={13} /> Setting to LIVE activates Smart TV broadcast mode and scoring displays.
                  </div>
                )}
              </div>

              {/* 2. Team A vs Team B */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                    Team A
                  </label>
                  <select
                    value={fixtureForm.teamAId}
                    onChange={(e) => setFixtureForm(prev => ({ ...prev, teamAId: e.target.value }))}
                    className="form-control"
                    spellCheck={false}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-heading, #ffffff)',
                      borderRadius: '8px',
                      padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="">-- Select Team A / TBD --</option>
                    {internalTeams.map(t => (
                      <option key={t.id || t.team_id || t.uuid} value={t.id || t.team_id}>
                        {t.name || t.teamName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                    Team B
                  </label>
                  <select
                    value={fixtureForm.teamBId}
                    onChange={(e) => setFixtureForm(prev => ({ ...prev, teamBId: e.target.value }))}
                    className="form-control"
                    spellCheck={false}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-heading, #ffffff)',
                      borderRadius: '8px',
                      padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="">-- Select Team B / TBD --</option>
                    {internalTeams.map(t => (
                      <option key={t.id || t.team_id || t.uuid} value={t.id || t.team_id}>
                        {t.name || t.teamName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Date & Times */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                    Match Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={fixtureForm.matchDate}
                    onChange={(e) => setFixtureForm(prev => ({ ...prev, matchDate: e.target.value }))}
                    className="form-control"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-heading, #ffffff)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={fixtureForm.startTime}
                    onChange={(e) => setFixtureForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="form-control"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-heading, #ffffff)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={fixtureForm.endTime}
                    onChange={(e) => setFixtureForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="form-control"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-heading, #ffffff)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* 4. Court / Venue */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading, #ffffff)' }}>
                  Court / Turf
                </label>
                <select
                  value={fixtureForm.courtId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const found = courts.find(c => String(c.id) === String(cId));
                    setFixtureForm(prev => ({ ...prev, courtId: cId, courtName: found ? found.name : '' }));
                  }}
                  className="form-control"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                    color: 'var(--text-heading, #ffffff)',
                    borderRadius: '8px',
                    padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">-- Default / Center Court --</option>
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 5. Counts in Standings Checkbox */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'var(--bg-elevated, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <input
                  type="checkbox"
                  id="countsInStandingsCheck"
                  checked={fixtureForm.countsInStandings}
                  onChange={(e) => setFixtureForm(prev => ({ ...prev, countsInStandings: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="countsInStandingsCheck" style={{ fontSize: '0.85rem', color: 'var(--text-heading, #ffffff)', cursor: 'pointer' }}>
                  <strong>Count match toward League Standings Table</strong> (Standard for League fixtures; excluded for Knockouts)
                </label>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFixtureModal(false)}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem 1.35rem', borderRadius: '10px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.6rem', background: '#10b981', border: 'none', fontWeight: 800, borderRadius: '10px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                >
                  {formSubmitting ? 'Saving...' : editingFixture ? 'Update Fixture' : 'Create Fixture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUTO-LEAGUE MODAL ── */}
      {showAutoLeagueModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-modal, var(--bg-card))',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-elevated)'
          }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Auto-Generate League Fixtures
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Generates round-robin pairings for all approved tournament teams across groups. All matches will be categorized as &quot;League&quot; and counted toward the standings table.
            </p>

            <form onSubmit={handleAutoLeagueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={autoLeagueForm.startDate}
                  onChange={(e) => setAutoLeagueForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-control"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', padding: '0.55rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Daily Start Time
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  value={autoLeagueForm.dailyStartTime}
                  onChange={(e) => setAutoLeagueForm(prev => ({ ...prev, dailyStartTime: e.target.value }))}
                  className="form-control"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', padding: '0.55rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAutoLeagueModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={autoLeagueSubmitting} className="btn btn-primary" style={{ background: '#10b981', border: 'none', fontWeight: 700 }}>
                  {autoLeagueSubmitting ? 'Generating...' : 'Generate League Fixtures'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUTO-KNOCKOUT MODAL ── */}
      {showAutoKnockoutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-modal, var(--bg-card))',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-elevated)'
          }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Generate Knockout Bracket
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Creates Quarter-Finals, Semi-Finals, and Final matches with automated bracket advancement (winners of Quarter-Finals advance to Semi-Finals; winners of Semi-Finals advance to Final).
            </p>

            <form onSubmit={handleAutoKnockoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <input
                  type="checkbox"
                  id="seedStandingsCheck"
                  checked={autoKnockoutForm.seedFromStandings}
                  onChange={(e) => setAutoKnockoutForm(prev => ({ ...prev, seedFromStandings: e.target.checked }))}
                />
                <label htmlFor="seedStandingsCheck" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <strong>Seed from Points Table standings</strong> (Rank 1 vs 8, 2 vs 7, etc.)
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Playoff Start Date
                </label>
                <input
                  type="date"
                  required
                  value={autoKnockoutForm.startDate}
                  onChange={(e) => setAutoKnockoutForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-control"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', padding: '0.55rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAutoKnockoutModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={autoKnockoutSubmitting} className="btn btn-primary" style={{ background: '#10b981', border: 'none', fontWeight: 700 }}>
                  {autoKnockoutSubmitting ? 'Generating...' : 'Create Knockout Bracket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deletingFixture && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-modal, var(--bg-card))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-elevated)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              <Trash2 size={24} />
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Delete Match #{deletingFixture.matchNumber}?</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete this fixture ({deletingFixture.teamA?.name || 'Team A'} vs {deletingFixture.teamB?.name || 'Team B'})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDeletingFixture(null)} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFixtureSubmit}
                disabled={deleteSubmitting}
                className="btn btn-danger"
                style={{ background: '#ef4444', borderColor: '#ef4444', fontWeight: 700 }}
              >
                {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Visualizer Card for Bracket View
 */
function BracketMatchCard({ match, isFinal = false, isPickleball = false }) {
  const cat = match.category || 'Knockout';
  const catStyle = CATEGORY_STYLES[cat] || CATEGORY_STYLES.Knockout;
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  return (
    <div style={{
      background: isFinal ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(16, 185, 129, 0.12))' : 'var(--bg-card)',
      border: isFinal ? '2px solid rgba(234, 179, 8, 0.4)' : isLive ? '1px solid #ef4444' : '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '0.9rem 1rem',
      boxShadow: isFinal ? '0 10px 25px -5px rgba(234, 179, 8, 0.2)' : 'none',
      position: 'relative'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.72rem' }}>
        <span style={{ fontWeight: 800, color: catStyle.text }}>
          {cat} • M#{match.match_number || match.matchNumber}
        </span>
        <span style={{
          fontWeight: 800,
          color: isLive ? '#ef4444' : isCompleted ? '#34d399' : '#94a3b8'
        }}>
          {match.status}
        </span>
      </div>

      {/* Team A Slot */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.35rem 0.5rem',
        borderRadius: '6px',
        background: match.winner_team_id && match.winner_team_id === match.team_a_id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
        marginBottom: '0.3rem'
      }}>
        <span style={{
          fontWeight: match.winner_team_id && match.winner_team_id === match.team_a_id ? 800 : 600,
          color: match.winner_team_id && match.winner_team_id === match.team_a_id ? '#34d399' : '#fff',
          fontSize: '0.85rem'
        }}>
          {match.team_a_name || 'TBD (Winner)'}
        </span>
        {match.winner_team_id && match.winner_team_id === match.team_a_id && (
          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#10b981', color: '#fff', fontWeight: 800 }}>WINNER</span>
        )}
      </div>

      {/* Team B Slot */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.35rem 0.5rem',
        borderRadius: '6px',
        background: match.winner_team_id && match.winner_team_id === match.team_b_id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)'
      }}>
        <span style={{
          fontWeight: match.winner_team_id && match.winner_team_id === match.team_b_id ? 800 : 600,
          color: match.winner_team_id && match.winner_team_id === match.team_b_id ? '#34d399' : '#fff',
          fontSize: '0.85rem'
        }}>
          {match.team_b_name || 'TBD (Winner)'}
        </span>
        {match.winner_team_id && match.winner_team_id === match.team_b_id && (
          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#10b981', color: '#fff', fontWeight: 800 }}>WINNER</span>
        )}
      </div>

      {/* Footer Scorer Link */}
      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
          {match.match_date ? `${match.match_date} ${match.start_time || ''}` : 'Scheduled'}
        </span>
        <Link
          href={isPickleball ? `/matches/${match.uuid || match.id}/pickleball-scorer` : `/matches/${match.uuid || match.id}/scorer`}
          style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textDecoration: 'none' }}
        >
          Open Scorer &rarr;
        </Link>
      </div>
    </div>
  );
}
