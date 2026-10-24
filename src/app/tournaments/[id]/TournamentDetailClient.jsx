'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  setTournamentLiveMatches,
  updateLiveMatchSummary
} from '../../../features/tournament/tournamentSlice';
import { logout, isTokenExpired } from '../../../features/auth/authSlice';
import { useTournamentLive } from '../../../hooks/useTournamentLive';
import LiveMatchCard from '../../../components/live/LiveMatchCard';
import TournamentAuctionTab from '../../../components/auction/TournamentAuctionTab';
import {
  Trophy, Calendar, MapPin, Users, Radio, Monitor, ArrowLeft,
  Shield, Gavel, Table, UserPlus, Play, CheckCircle, AlertCircle, RefreshCw, Zap, Award, Tv,
  ChevronRight, Trash2, Search, Check, Filter, X, ClipboardList, Settings, AlertTriangle, Info, Clock, ExternalLink,
  Eye, Activity, Video
} from 'lucide-react';
import TeamRosterDrawer from '../../../components/tournament/TeamRosterDrawer';
import PlayerRegistrationsManager from '../../../components/tournament/PlayerRegistrationsManager';
import OfficialScorersManager from '../../../components/tournament/OfficialScorersManager';
import TournamentFixturesManager from '../../../components/tournament/TournamentFixturesManager';
import TournamentStreamingPermissionsManager from '../../../components/streaming/TournamentStreamingPermissionsManager';

const EMPTY_ARRAY = [];

const formatTournamentDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function TournamentDetailClient({ tournament: initialTournament, tournamentId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const urlTab = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'overview');

  useEffect(() => {
    const qTab = searchParams?.get('tab');
    if (qTab && qTab !== activeTab) {
      setActiveTab(qTab);
    }
  }, [searchParams]);
  const [tournament, setTournament] = useState(initialTournament);
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState(null);
  const [groupsData, setGroupsData] = useState(null);
  const [awardsData, setAwardsData] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Tournament modal & action state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleteConfirmationWord, setDeleteConfirmationWord] = useState('');
  const [deletingTournament, setDeletingTournament] = useState(false);

  // Team Squad Roster drawer state
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);
  const [showRosterDrawer, setShowRosterDrawer] = useState(false);

  const handleOpenTeamRoster = (tm) => {
    setSelectedRosterTeam(tm);
    setShowRosterDrawer(true);
  };

  // Add Team Modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('Group 1');
  const [newTeamRosterText, setNewTeamRosterText] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedExistingTeamId, setSelectedExistingTeamId] = useState('');
  const [registrationMode, setRegistrationMode] = useState('existing'); // 'existing' | 'new'

  // Auth state from Redux - memoized individual selector subscriptions
  const user = useSelector((state) => state.auth?.user);
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);

  // Organizer / Admin permission check with mounted guard to guarantee identical SSR & client hydration
  const userRole = (user?.role || '').toUpperCase();
  const isSuperAdmin = Boolean(mounted && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'));
  const isCreator = Boolean(
    mounted &&
    user?.id && (
      Number(user.id) === Number(tournament?.createdBy) ||
      Number(user.id) === Number(tournament?.created_by) ||
      Number(user.id) === Number(tournament?.venueOwnerId) ||
      Number(user.id) === Number(tournament?.venue_owner_id)
    )
  );
  const canManage = Boolean(mounted && user && (isSuperAdmin || isCreator));
  const canDeleteTournament = Boolean(mounted && user && (isSuperAdmin || isCreator));
  const canScore = Boolean(mounted && user && (isSuperAdmin || isCreator || userRole === 'SCORER' || userRole === 'ORGANIZER'));

  // Module A1: Remove Team Confirmation State
  const [teamToRemove, setTeamToRemove] = useState(null);
  const [removeImpact, setRemoveImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [removeMode, setRemoveMode] = useState('CANCEL_FIXTURES'); // 'CANCEL_FIXTURES' | 'DELETE_FIXTURES' | 'BLOCK'
  const [confirmWordInput, setConfirmWordInput] = useState('');
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  // Module A2: Bulk Add Teams State
  const [bulkSelectedTeamIds, setBulkSelectedTeamIds] = useState([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamDivisionFilter, setTeamDivisionFilter] = useState('ALL');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Module D: Live match display selection state
  const [displayUpdating, setDisplayUpdating] = useState(false);

  // Redux live matches with stable selector and memoization
  const liveMatchIds = useSelector((state) => state.tournament?.liveMatchesByTournament?.[tournamentId] || EMPTY_ARRAY);
  const liveMatchesById = useSelector((state) => state.tournament?.liveMatchesById);
  const liveMatches = useMemo(() => (liveMatchIds || []).map((mId) => liveMatchesById?.[mId]).filter(Boolean), [liveMatchIds, liveMatchesById]);

  const isPickleball = tournament?.sport?.slug === 'pickleball' || tournament?.name?.toLowerCase().includes('pickleball');

  // Load Tab Data dynamically
  const loadTabData = useCallback(async (isBackground = false) => {
    const hasData = (activeTab === 'live' && liveMatches.length > 0) ||
      (activeTab === 'teams' && teams.length > 0) ||
      (activeTab === 'matches' && fixtures.length > 0) ||
      (activeTab === 'overview' && fixtures.length > 0);

    if (!isBackground && !hasData) {
      setLoadingTab(true);
    }
    setErrorMsg('');
    try {
      if (activeTab === 'overview') {
        const [resM, resT, resL] = await Promise.allSettled([
          axios.get(`/api/tournaments/${tournamentId}/matches`),
          axios.get(`/api/tournaments/${tournamentId}/teams`),
          axios.get(`/api/tournaments/${tournamentId}/live`)
        ]);
        if (resM.status === 'fulfilled' && resM.value?.data?.success) {
          setFixtures(resM.value.data.data.items || []);
        }
        if (resT.status === 'fulfilled' && resT.value?.data?.success) {
          const teamItems = resT.value.data.data.items || [];
          setTeams(teamItems);
          setTournament(prev => ({
            ...prev,
            registeredTeamsCount: teamItems.length,
            registeredTeams: teamItems.length,
            teamsCount: teamItems.length
          }));
        }
        if (resL.status === 'fulfilled' && resL.value?.data?.success) {
          dispatch(setTournamentLiveMatches({
            tournamentId,
            matches: resL.value.data.data.items || []
          }));
        }
      } else if (activeTab === 'live') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/live`);
        if (res.data.success) {
          dispatch(setTournamentLiveMatches({
            tournamentId,
            matches: res.data.data.items || []
          }));
        }
      } else if (activeTab === 'matches') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/matches`);
        if (res.data.success) {
          setFixtures(res.data.data.items || []);
        }
      } else if (activeTab === 'teams') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/teams`);
        if (res.data.success) {
          const teamItems = res.data.data.items || [];
          setTeams(teamItems);
          setTournament(prev => ({
            ...prev,
            registeredTeamsCount: teamItems.length,
            registeredTeams: teamItems.length,
            teamsCount: teamItems.length
          }));
        }
      } else if (activeTab === 'standings') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/standings`);
        if (res.data.success) {
          setStandings(res.data.data);
        }
      } else if (activeTab === 'groups') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/groups`);
        if (res.data.success) {
          setGroupsData(res.data.data);
        }
      } else if (activeTab === 'awards') {
        const res = await axios.get(`/api/tournaments/${tournamentId}/awards`);
        if (res.data.success) {
          setAwardsData(res.data.data || []);
        }
      } else if (activeTab === 'scorers') {
        if (fixtures.length === 0) {
          const res = await axios.get(`/api/tournaments/${tournamentId}/matches`);
          if (res.data.success) {
            setFixtures(res.data.data.items || []);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to load tab ${activeTab}:`, err);
    } finally {
      setLoadingTab(false);
    }
  }, [tournamentId, activeTab, dispatch, fixtures.length, teams.length, liveMatches.length]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Socket.IO Room Hook: Subscribe continuously to tournament live updates
  const handleLiveMatchUpdate = useCallback((data) => {
    if (!data) return;
    if (data?.matchId && data?.showOnDisplay !== undefined) {
      loadTabData(true);
      return;
    }
    dispatch(updateLiveMatchSummary({
      matchId: data.matchId || data.public_id || data.id,
      liveScoreSummary: data.liveScoreSummary || data.scoreSummary,
      liveSubtext: data.liveSubtext || data.subtext,
      status: data.status
    }));
    // If fixtures or standings tab is open, also refresh in background
    if (activeTab === 'matches' || activeTab === 'standings' || activeTab === 'overview') {
      loadTabData(true);
    }
  }, [dispatch, activeTab, loadTabData]);

  useTournamentLive(tournamentId, handleLiveMatchUpdate);

  // Module D: Toggle single match display on TV/Signage
  const handleToggleMatchDisplay = async (matchId, showOnDisplay) => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to configure display matches.');
      return;
    }
    setDisplayUpdating(true);
    try {
      const res = await axios.put(`/api/tournaments/${tournamentId}/matches/${matchId}/display`, {
        showOnDisplay
      }, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        setNotification(res.data.message || `Match display updated to ${showOnDisplay ? 'Visible' : 'Hidden'}.`);
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update match display visibility.');
    } finally {
      setDisplayUpdating(false);
    }
  };

  // Module D: Bulk toggle all matches display on TV/Signage
  const handleBulkToggleDisplay = async (showAll) => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to configure display matches.');
      return;
    }
    setDisplayUpdating(true);
    try {
      const res = await axios.put(`/api/tournaments/${tournamentId}/matches/display-bulk`, {
        selectAll: showAll ? true : false,
        clearAll: !showAll ? true : false
      }, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        setNotification(res.data.message || (showAll ? 'All matches set to show on TV displays.' : 'All matches hidden from TV displays.'));
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update matches display visibility.');
    } finally {
      setDisplayUpdating(false);
    }
  };

  // Helper to obtain fresh valid authorization token, purging if expired
  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') return null;
    if (isTokenExpired(token)) {
      localStorage.removeItem('turf_token');
      localStorage.removeItem('turf_user');
      localStorage.removeItem('token');
      dispatch(logout());
      return null;
    }
    return token;
  }, [dispatch]);

  // Helper to obtain fresh authorization header
  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAuthToken]);

  // View Tracking Hook: Record view once per session, deduplicated with 15-min cooldown
  useEffect(() => {
    if (!tournamentId) return;

    let viewerId = null;
    try {
      viewerId = localStorage.getItem('turf_viewer_uuid');
      if (!viewerId) {
        viewerId = 'v_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('turf_viewer_uuid', viewerId);
      }
    } catch {
      viewerId = 'v_' + Date.now().toString(36);
    }

    const sessionKey = `viewed_tournament_${tournamentId}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Ignore storage errors in private mode
    }

    axios.post(`/api/tournaments/${tournamentId}/view`, {
      viewerId,
      platform: 'WEB'
    }, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setTournament((prev) => ({
            ...prev,
            totalViews: res.data.data.totalViews,
            uniqueViewers: res.data.data.uniqueViewers,
            total_views: res.data.data.totalViews,
            unique_viewers: res.data.data.uniqueViewers,
            lastViewedAt: res.data.data.lastViewedAt
          }));
        }
      })
      .catch(() => {
        // Non-blocking: analytics failures should never disrupt page experience
      });
  }, [tournamentId, getAuthHeaders]);

  // Open Delete Tournament modal & fetch record impact analysis
  const handleOpenDeleteModal = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to delete this tournament.');
      return;
    }
    setShowDeleteModal(true);
    setLoadingImpact(true);
    setDeleteConfirmationWord('');
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/delete-impact`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setDeleteImpact(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tournament delete impact:', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to inspect tournament records before deletion.');
    } finally {
      setLoadingImpact(false);
    }
  };

  // Safe Permanent Tournament Deletion
  const handleConfirmDeleteTournament = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication session expired. Please sign in again.');
      return;
    }
    setDeletingTournament(true);
    setErrorMsg('');
    try {
      const res = await axios.delete(`/api/tournaments/${tournamentId}?force=true`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setShowDeleteModal(false);
        router.push('/tournaments');
      }
    } catch (err) {
      console.error('Failed to delete tournament:', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to delete tournament. Please try again.');
      setDeletingTournament(false);
    }
  };

  // Generate Round-Robin Fixtures handler
  const handleGenerateFixtures = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to generate fixtures.');
      return;
    }
    if (!confirm('Generate a round-robin schedule for all groups? Existing unplayed scheduled matches will be refreshed.')) return;
    setActionLoading(true);
    setErrorMsg('');
    setNotification('');
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/generate-fixtures`, {
        mode: 'ROUND_ROBIN'
      }, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        setNotification(res.data.message || 'Round-robin fixtures generated successfully!');
        loadTabData();
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setErrorMsg('Authentication session expired. Please sign in again.');
      } else if (err?.response?.status === 403) {
        setErrorMsg('Unauthorized. Only administrators, venue owners, or tournament organizers can generate fixtures.');
      } else {
        setErrorMsg(err?.response?.data?.message || 'Failed to generate fixtures.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-Distribute Teams handler
  const handleAutoDistribute = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to distribute teams.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setNotification('');
    try {
      const res = await axios.put(`/api/tournaments/${tournamentId}/groups`, {
        autoDistribute: true,
        groupsCount: tournament.groupsCount || 2
      }, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        setNotification('Teams automatically distributed across groups!');
        loadTabData();
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setErrorMsg('Authentication session expired. Please sign in again.');
      } else if (err?.response?.status === 403) {
        setErrorMsg('Unauthorized. Only administrators, venue owners, or tournament organizers can auto-distribute teams.');
      } else {
        setErrorMsg(err?.response?.data?.message || 'Failed to auto-distribute teams.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Compute Tournament Awards handler
  const handleCalculateAwards = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to calculate tournament awards.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setNotification('');
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/awards/calculate`, {}, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        setNotification('Tournament awards & leaderboards calculated successfully!');
        setAwardsData(res.data.data || []);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setErrorMsg('Authentication session expired. Please sign in again.');
      } else if (err?.response?.status === 403) {
        setErrorMsg('Unauthorized. You do not have permission to compute awards.');
      } else {
        setErrorMsg(err?.response?.data?.message || 'Failed to compute awards.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Load available teams for modal
  useEffect(() => {
    if (showAddTeamModal) {
      axios.get('/api/teams?limit=100', { headers: getAuthHeaders() }).then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setAvailableTeams(res.data.data);
          if (res.data.data.length > 0 && !selectedExistingTeamId) {
            setSelectedExistingTeamId(res.data.data[0].id);
          }
        }
      }).catch((err) => {
        console.error('Failed to load available teams:', err);
      });
    }
  }, [showAddTeamModal, selectedExistingTeamId, getAuthHeaders]);

  // Set of already registered team IDs and names in this tournament
  const registeredTeamIds = useMemo(() => {
    const ids = new Set();
    teams.forEach(t => {
      if (t.id) ids.add(String(t.id));
      if (t.internalId) ids.add(String(t.internalId));
      if (t.name) ids.add(t.name.toLowerCase().trim());
    });
    return ids;
  }, [teams]);

  // Filtered available teams by sport, division, and search
  const filteredAvailableTeams = useMemo(() => {
    return availableTeams.filter(t => {
      const tournSportId = tournament?.sport_id || tournament?.sport?.id;
      const tournSportSlug = tournament?.sport_slug || tournament?.sport?.slug;
      if (tournSportId && t.sportId && t.sportId !== tournSportId) return false;
      if (tournSportSlug && t.sportSlug && t.sportSlug !== tournSportSlug) return false;

      if (teamDivisionFilter !== 'ALL' && t.division !== teamDivisionFilter) return false;

      if (teamSearchQuery) {
        const q = teamSearchQuery.toLowerCase();
        const matchesName = t.name && t.name.toLowerCase().includes(q);
        const matchesCity = t.homeLocation && t.homeLocation.toLowerCase().includes(q);
        if (!matchesName && !matchesCity) return false;
      }
      return true;
    });
  }, [availableTeams, tournament, teamDivisionFilter, teamSearchQuery]);

  const handleToggleSelectTeam = (teamId) => {
    setBulkSelectedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllFiltered = () => {
    const selectable = filteredAvailableTeams
      .filter(t => !registeredTeamIds.has(String(t.id)) && !registeredTeamIds.has(t.name?.toLowerCase().trim()))
      .map(t => t.id);
    setBulkSelectedTeamIds(Array.from(new Set([...bulkSelectedTeamIds, ...selectable])));
  };

  const handleClearSelection = () => {
    setBulkSelectedTeamIds([]);
  };

  // Module A1: Prompt team removal & fetch impact
  const handlePromptRemoveTeam = async (targetTeam) => {
    setTeamToRemove(targetTeam);
    setRemoveImpact(null);
    setImpactLoading(true);
    setRemoveMode('CANCEL_FIXTURES');
    setConfirmWordInput('');
    try {
      const res = await axios.get(
        `/api/tournaments/${tournamentId}/teams/${targetTeam.id}/impact`,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setRemoveImpact(res.data.data);
        if (res.data.data.completedMatchesCount > 0) {
          setRemoveMode('DELETE_FIXTURES');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch team removal impact:', err);
    } finally {
      setImpactLoading(false);
    }
  };

  // Module A1: Confirm team removal
  const handleConfirmRemoveTeam = async () => {
    if (!teamToRemove) return;
    setRemoveSubmitting(true);
    setErrorMsg('');
    try {
      const res = await axios.delete(
        `/api/tournaments/${tournamentId}/teams/${teamToRemove.id}`,
        {
          headers: getAuthHeaders(),
          data: {
            mode: removeMode,
            confirmWord: confirmWordInput
          }
        }
      );
      if (res.data?.success) {
        setNotification(res.data.message || `Team "${teamToRemove.name}" removed from tournament successfully.`);
        setTeamToRemove(null);
        setRemoveImpact(null);
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove team from tournament.');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  // Module A2: Bulk Add Teams handler
  const handleBulkAddTeams = async (e) => {
    e.preventDefault();
    if (bulkSelectedTeamIds.length === 0) return;
    setBulkSubmitting(true);
    setErrorMsg('');
    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/teams/bulk`,
        {
          teamIds: bulkSelectedTeamIds,
          groupName: newTeamGroup
        },
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setNotification(res.data.message || `Registered ${bulkSelectedTeamIds.length} teams successfully!`);
        setBulkSelectedTeamIds([]);
        setShowAddTeamModal(false);
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to bulk register teams.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Add Team to Tournament handler (supporting single new team creation)
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (registrationMode === 'existing') {
      return handleBulkAddTeams(e);
    }

    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Authentication required. Please sign in to register teams.');
      return;
    }
    const teamNameToRegister = newTeamName.trim();
    if (!teamNameToRegister) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const playerNames = newTeamRosterText
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean);

      const res = await axios.post(`/api/tournaments/${tournamentId}/teams`, {
        name: teamNameToRegister,
        groupName: newTeamGroup,
        playerNames: playerNames.length > 0 ? playerNames : undefined
      }, {
        headers: getAuthHeaders()
      });

      if (res.data.success) {
        setNotification(`Team "${teamNameToRegister}" registered successfully!`);
        setNewTeamName('');
        setNewTeamRosterText('');
        setShowAddTeamModal(false);
        loadTabData();
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setErrorMsg('Authentication session expired. Please sign in again.');
      } else if (err?.response?.status === 403) {
        setErrorMsg('Unauthorized. Only administrators, venue owners, or tournament organizers can add teams to tournaments.');
      } else {
        setErrorMsg(err?.response?.data?.message || 'Failed to add team.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(0.75rem, 2vw, 1.25rem)' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Tournaments Hub
        </Link>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          {(errorMsg.toLowerCase().includes('sign in') || errorMsg.toLowerCase().includes('log in') || errorMsg.toLowerCase().includes('auth')) && (
            <Link
              href={`/login?redirect=/tournaments/${tournamentId}`}
              className="btn btn-sm btn-outline"
              style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fff', fontSize: '0.8rem', padding: '0.3rem 0.75rem', textDecoration: 'none' }}
            >
              Sign In Now &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Header Banner Card */}
      <div
        className="tournament-detail-hero"
        style={{
          padding: 'clamp(1.5rem, 3vw, 2.25rem)',
          marginBottom: '1.75rem',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle ambient lighting accent */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span className="tournament-pill-sport" style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                {tournament.sport?.name || (isPickleball ? 'Pickleball' : 'Cricket')}
              </span>
              {isPickleball && (
                <>
                  <span className="tournament-pill-format" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    letterSpacing: '0.04em'
                  }}>
                    {tournament.matchFormat || 'DOUBLES'}
                  </span>
                  <span className="tournament-pill-neutral" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.78rem'
                  }}>
                    Target: {tournament.targetScore || 15} pts {tournament.winByTwo ? '(Win-by-2)' : ''}
                  </span>
                  <span className="tournament-pill-neutral" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.78rem'
                  }}>
                    {tournament.groupsCount || 2} Groups • Squad: {tournament.rosterSize || 12} Players
                  </span>
                </>
              )}
              {(tournament.isLive || (fixtures && fixtures.some(f => f.status === 'LIVE'))) && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                  LIVE MATCHES ACTIVE
                </span>
              )}
            </div>

            <h1 className="tournament-hero-title" style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 900,
              margin: '0 0 0.95rem 0',
              letterSpacing: '-0.025em',
              lineHeight: 1.2
            }}>
              {tournament.name}
            </h1>

            <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', fontSize: '0.9rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapPin size={16} color="#059669" />
                <span className="tournament-hero-meta-text">{tournament.venue?.name || 'Sports Arena'}, {tournament.city || 'India'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={16} color="#0284c7" />
                <span suppressHydrationWarning className="tournament-hero-meta-text">
                  {tournament.startDate ? formatTournamentDate(tournament.startDate) : 'Active'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={16} color="#7c3aed" />
                <span className="tournament-hero-meta-text">
                  {(teams && teams.length > 0 ? teams.length : (tournament?.registeredTeamsCount ?? tournament?.registeredTeams ?? tournament?.teamsCount ?? 0))} Registered Teams
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Eye size={16} color="#10b981" />
                <span className="tournament-hero-meta-text">
                  {(tournament?.totalViews ?? tournament?.total_views ?? 0).toLocaleString()} views
                  {((tournament?.uniqueViewers ?? tournament?.unique_viewers ?? 0) > 0) && (
                    <> • {(tournament?.uniqueViewers ?? tournament?.unique_viewers).toLocaleString()} unique viewers</>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="tournament-hero-action-buttons">
            {/* 1. Register as Player */}
            <Link
              href={`/tournaments/${tournamentId}/register`}
              className="btn tournament-btn-player"
            >
              <UserPlus size={16} /> Register as Player
            </Link>

            {/* 2. Live Score (Read-Only Live Viewer - Visible to ALL users) */}
            {liveMatches.length === 1 ? (
              <Link
                href={`/matches/${liveMatches[0].uuid || liveMatches[0].id}/live`}
                className="btn tournament-btn-live-scorer"
              >
                <Activity size={16} /> Live Score
              </Link>
            ) : liveMatches.length > 1 ? (
              <Link
                href={`/tournaments/${tournamentId}/live`}
                className="btn tournament-btn-live-scorer"
              >
                <Activity size={16} /> Live Score ({liveMatches.length} Live)
              </Link>
            ) : (
              <Link
                href={`/tournaments/${tournamentId}/live`}
                className="btn tournament-btn-live-scorer"
                title="View live score arena and upcoming matches"
              >
                <Activity size={16} /> Live Score (No live match)
              </Link>
            )}

            {/* 2b. Scorer Console (Visible ONLY to users with scoring access: Organizer, Scorer, Admin) */}
            {canScore && (
              <Link
                href={liveMatches.length > 0
                  ? `/matches/${liveMatches[0].uuid || liveMatches[0].id}/scorer`
                  : `/tournaments/${tournamentId}?tab=matches`}
                className="btn tournament-btn-scorer-console"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                }}
                title="Open Official Scorer Console"
              >
                <Zap size={16} /> Scorer Console
              </Link>
            )}

            {/* 3. Smart TV Broadcast Mode (Visible to ALL users) */}
            <Link
              href={`/tv/${tournamentId}`}
              target="_blank"
              className="btn tournament-btn-tv"
            >
              <Tv size={16} /> Smart TV Broadcast Mode
            </Link>

            {/* 4. Signage TV Display (Visible ONLY to Superadmin) */}
            {isSuperAdmin && (
              <Link
                href={`/display/tournament/${tournamentId}`}
                target="_blank"
                className="btn tournament-btn-display"
              >
                <Monitor size={16} /> Signage TV Display
              </Link>
            )}

            {/* Delete Tournament (Admin/Creator only) */}
            {canDeleteTournament && (
              <button
                type="button"
                onClick={handleOpenDeleteModal}
                className="btn tournament-btn-delete"
                title="Delete this tournament"
              >
                <Trash2 size={16} /> Delete Tournament
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.75rem', overflowX: 'auto' }}>
        {[
          { key: 'overview', label: 'Overview', icon: <Trophy size={15} /> },
          { key: 'matches', label: 'Fixtures & Schedule', icon: <Calendar size={15} /> },
          { key: 'live', label: 'Live Matches', icon: <Radio size={15} />, badge: liveMatches.length > 0 ? `${liveMatches.length}` : null },
          { key: 'teams', label: 'Registered Teams', icon: <Shield size={15} /> },
          { key: 'standings', label: 'Results & Points Table', icon: <Table size={15} /> },
          { key: 'registrations', label: 'Player Registrations', icon: <UserPlus size={15} /> },
          { key: 'scorers', label: 'Official Scorers', icon: <ClipboardList size={15} /> },
          { key: 'streaming', label: 'Live Streaming Access', icon: <Video size={15} /> },
          { key: 'awards', label: 'Awards & Leaders', icon: <Award size={15} /> },
          ...(isPickleball ? [{ key: 'groups', label: 'Groups & Squads', icon: <Users size={15} /> }] : []),
          ...(tournament.hasAuction ? [{ key: 'auction', label: 'Player Auction', icon: <Gavel size={15} /> }] : []),
          ...(canManage ? [{ key: 'settings', label: 'Settings & Management', icon: <Settings size={15} /> }] : [])
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--accent-primary, #10b981)' : '3px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-primary, #10b981)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 800 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '9999px',
                marginLeft: '0.2rem'
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div
                onClick={() => setActiveTab('teams')}
                className="tournament-metric-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Registered Teams</span>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} />
                  </div>
                </div>
                <div className="scorer-text-heading" style={{ fontSize: '1.85rem', fontWeight: 900 }}>
                  {teams.length > 0 ? teams.length : (tournament?.registeredTeamsCount ?? tournament?.registeredTeams ?? tournament?.teamsCount ?? 0)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                  <span>View teams roster →</span>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('matches')}
                className="tournament-metric-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Fixtures</span>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={18} />
                  </div>
                </div>
                <div className="scorer-text-heading" style={{ fontSize: '1.85rem', fontWeight: 900 }}>
                  {fixtures.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '0.35rem', fontWeight: 600 }}>
                  {fixtures.filter(f => f.status === 'COMPLETED').length} played • {fixtures.filter(f => f.status === 'SCHEDULED' || !f.status).length} scheduled
                </div>
              </div>

              <div
                onClick={() => setActiveTab('live')}
                className="tournament-metric-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  border: liveMatches.length > 0 ? '1.5px solid rgba(239, 68, 68, 0.45)' : undefined,
                  background: liveMatches.length > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Live Matches</span>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: liveMatches.length > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(100, 116, 139, 0.12)', color: liveMatches.length > 0 ? '#dc2626' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: liveMatches.length > 0 ? '#dc2626' : 'var(--text-heading, #0f172a)' }}>
                  {liveMatches.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: liveMatches.length > 0 ? '#dc2626' : '#64748b', marginTop: '0.35rem', fontWeight: 600 }}>
                  {liveMatches.length > 0 ? 'Active on scorer & TV →' : 'No live match right now'}
                </div>
              </div>

              <div
                onClick={() => setActiveTab('standings')}
                className="tournament-metric-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Format & Groups</span>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Table size={18} />
                  </div>
                </div>
                <div className="scorer-text-heading" style={{ fontSize: '1.35rem', fontWeight: 800, textTransform: 'capitalize' }}>
                  {tournament.sport?.name || (isPickleball ? 'Pickleball' : 'Cricket')}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: '0.35rem', fontWeight: 600 }}>
                  {tournament.matchFormat || 'Round-Robin'} • Points Table →
                </div>
              </div>
            </div>

            {/* Quick Actions Bar for Tournament Organizers & Superadmins */}
            {canManage && (
              <div
                className="tournament-quick-actions-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 className="scorer-text-heading" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                      Organizer Quick Actions
                    </h4>
                    <p className="scorer-text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem' }}>
                      Fast-track your tournament setup, match scheduling, team assignments, and live scoring.
                    </p>
                  </div>
                  <span className="quick-btn-emerald" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                    {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? 'Superadmin Mode' : 'Organizer Mode'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddTeamModal(true)}
                    className="btn btn-sm quick-btn-emerald"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px'
                    }}
                  >
                    <UserPlus size={15} /> Add / Register Teams
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('matches')}
                    className="btn btn-sm quick-btn-sky"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px'
                    }}
                  >
                    <Calendar size={15} /> Schedule Matches & Fixtures
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateFixtures}
                    disabled={actionLoading}
                    className="btn btn-sm quick-btn-neutral"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px'
                    }}
                  >
                    <RefreshCw size={15} className={actionLoading ? 'spin' : ''} /> Generate Round-Robin Fixtures
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('scorers')}
                    className="btn btn-sm quick-btn-neutral"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 600,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px'
                    }}
                  >
                    <ClipboardList size={15} /> Assign Official Scorers
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="btn btn-sm quick-btn-neutral"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 600,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px'
                    }}
                  >
                    <Settings size={15} /> Tournament Settings & Danger Zone
                  </button>
                </div>
              </div>
            )}

            {/* Tournament Overview Details & Rules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <div className="tournament-info-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <h4 className="scorer-text-heading" style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={18} color="#0284c7" /> Tournament Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Status</span>
                    <span style={{ fontWeight: 700, color: tournament.isLive ? '#dc2626' : '#059669' }}>
                      {tournament.isLive ? '🔴 LIVE NOW' : (tournament.status || 'SCHEDULED')}
                    </span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Sport & Category</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>
                      {tournament.sport?.name || 'Pickleball'} • {tournament.matchFormat || 'Open'}
                    </span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Venue</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>
                      {tournament.venue?.name || 'Sports Arena'} ({tournament.city || 'India'})
                    </span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Dates</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>
                      {tournament.startDate ? formatTournamentDate(tournament.startDate) : 'TBD'}
                      {tournament.endDate ? ` — ${formatTournamentDate(tournament.endDate)}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="scorer-text-muted">Player Auction</span>
                    <span style={{ fontWeight: 600, color: tournament.hasAuction ? '#d97706' : '#64748b' }}>
                      {tournament.hasAuction ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="tournament-info-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <h4 className="scorer-text-heading" style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} color="#d97706" /> Match Rules & Format
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Target Winning Score</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{tournament.targetScore || 15} Points</span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Win by Two Margin</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>{tournament.winByTwo ? 'Enforced (+2 difference)' : 'Sudden Death'}</span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Squad Roster Size</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>{tournament.rosterSize || 12} Players / Team</span>
                  </div>
                  <div className="tournament-row-divider" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                    <span className="scorer-text-muted">Tournament Structure</span>
                    <span className="scorer-text-heading" style={{ fontWeight: 600 }}>{tournament.groupsCount || 2} Groups • Round Robin</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="scorer-text-muted">Points Table Calculation</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>Wins &gt; Points For &gt; H2H &gt; Point Diff</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Live Tab ── */}
        {activeTab === 'live' && (
          <div>
            {/* TV Display Selection Bar */}
            {liveMatches.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Tv size={18} color="var(--accent-primary, #10b981)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                    Showing {liveMatches.filter((m) => m.showOnDisplay !== false).length} of {liveMatches.length} matches on TV
                  </span>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => handleBulkToggleDisplay(true)}
                      disabled={displayUpdating}
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        cursor: displayUpdating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => handleBulkToggleDisplay(false)}
                      disabled={displayUpdating}
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 12px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        cursor: displayUpdating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            {loadingTab && liveMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading live matches…</div>
            ) : liveMatches.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Radio size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Simultaneous Live Matches</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  There are currently no active matches with live scoring in this tournament. Check the fixtures tab for scheduled match times.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {liveMatches.map((m) => (
                  <LiveMatchCard
                    key={m.id}
                    match={m}
                    canManage={canManage}
                    onToggleDisplay={handleToggleMatchDisplay}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Matches/Fixtures Tab ── */}
        {activeTab === 'matches' && (
          <TournamentFixturesManager
            tournament={tournament}
            canManage={canManage}
            fixtures={fixtures}
            teams={teams}
            onRefresh={loadTabData}
            currentUser={user}
          />
        )}

        {/* ── Pickleball Group Standings Tab ── */}
        {activeTab === 'standings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-heading)' }}>
                  Pickleball Group Points Table
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--slot-available-bg, rgba(16,185,129,0.12))', color: 'var(--accent-primary, #059669)', border: '1px solid var(--border-glow, rgba(16,185,129,0.3))', fontWeight: 700 }}>
                    1. Most Wins
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.06))', color: 'var(--text-secondary, #475569)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', fontWeight: 600 }}>
                    2. Higher Points Scored (PF)
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.06))', color: 'var(--text-secondary, #475569)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', fontWeight: 600 }}>
                    3. Head-to-Head Result
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.06))', color: 'var(--text-secondary, #475569)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', fontWeight: 600 }}>
                    4. Point Difference (PD)
                  </span>
                </div>
              </div>

              <button
                onClick={loadTabData}
                disabled={loadingTab}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loadingTab && !standings ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating standings…</div>
            ) : (!standings || Object.keys(standings.groups || standings.standings || {}).length === 0) ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Table size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>No Standings Available</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Standings will generate once teams are assigned and matches conclude.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {(() => {
                  const groupsMap = standings.groups || standings.standings || {};
                  const currentSportSlug = (tournament.sport?.slug || tournament.sportSlug || (tournament.sport?.name ? tournament.sport.name.toLowerCase() : '') || '').toLowerCase();
                  const isFootball = currentSportSlug === 'football';
                  const isCricket = currentSportSlug === 'cricket';

                  return Object.keys(groupsMap).sort().map((groupName) => {
                    const groupTeams = groupsMap[groupName];
                    return (
                      <div key={groupName} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary, #10b981)', boxShadow: '0 0 8px var(--accent-primary-glow, rgba(16,185,129,0.3))' }} />
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                              {groupName} Standings
                            </h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              ({groupTeams.length} Teams)
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>
                            {isFootball ? '3-1-0 Point System • GD Tiebreaker' : isCricket ? 'NRR Tiebreaker' : 'Win-Loss • Point Diff'}
                          </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Rank</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Team</th>
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Played</th>
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Won</th>
                                {isFootball && (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Drawn</th>
                                )}
                                {isCricket && (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Tied</th>
                                )}
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Lost</th>
                                {isFootball ? (
                                  <>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>GF</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>GA</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>GD</th>
                                  </>
                                ) : isCricket ? (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>NRR</th>
                                ) : (
                                  <>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>PF</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>PA</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Diff</th>
                                  </>
                                )}
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupTeams.map((row) => (
                                <tr
                                  key={row.teamId || row.internalTeamId || row.name}
                                  className="tournament-standings-row"
                                  style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    background: row.rank === 1 ? 'var(--slot-available-bg, rgba(16,185,129,0.08))' : 'transparent',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: row.rank === 1 ? 'var(--accent-primary, #10b981)' : 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                      <span>#{row.rank}</span>
                                      {row.isQualified && (
                                        <span
                                          title="Qualified for Playoffs"
                                          style={{
                                            fontSize: '0.65rem',
                                            background: 'var(--slot-available-bg, rgba(16,185,129,0.2))',
                                            color: 'var(--accent-primary, #059669)',
                                            border: '1px solid var(--border-glow, rgba(16,185,129,0.35))',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            fontWeight: 800
                                          }}
                                        >
                                          Q
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                                    {row.name || row.teamName}
                                  </td>
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>{row.played}</td>
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: row.won > 0 ? 'var(--accent-primary, #059669)' : 'var(--text-primary)' }}>{row.won}</td>
                                  {isFootball && (
                                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>{row.drawn ?? 0}</td>
                                  )}
                                  {isCricket && (
                                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>{row.drawn ?? row.tied ?? 0}</td>
                                  )}
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: row.lost > 0 ? 'var(--accent-rose, #e11d48)' : 'var(--text-muted)' }}>{row.lost}</td>
                                  {isFootball ? (
                                    <>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{row.goalsFor ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.goalsAgainst ?? 0}</td>
                                      <td style={{
                                        padding: '0.85rem 0.75rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        color: (row.goalDifference ?? 0) > 0 ? 'var(--accent-primary, #059669)' : (row.goalDifference ?? 0) < 0 ? 'var(--accent-rose, #e11d48)' : 'var(--text-muted)'
                                      }}>
                                        {(row.goalDifference ?? 0) > 0 ? `+${row.goalDifference}` : (row.goalDifference ?? 0) < 0 ? `${row.goalDifference}` : '0'}
                                      </td>
                                    </>
                                  ) : isCricket ? (
                                    <td style={{
                                      padding: '0.85rem 0.75rem',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      color: Number(row.netRunRate || 0) > 0 ? 'var(--accent-primary, #059669)' : Number(row.netRunRate || 0) < 0 ? 'var(--accent-rose, #e11d48)' : 'var(--text-muted)'
                                    }}>
                                      {row.netRunRate != null && row.netRunRate !== '' ? (
                                        Number(row.netRunRate) > 0 ? `+${Number(row.netRunRate).toFixed(3)}` : Number(row.netRunRate) < 0 ? Number(row.netRunRate).toFixed(3) : '0.000'
                                      ) : '0.000'}
                                    </td>
                                  ) : (
                                    <>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{row.pointsScored ?? row.pointsFor ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.pointsConceded ?? row.pointsAgainst ?? 0}</td>
                                      <td style={{
                                        padding: '0.85rem 0.75rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        color: (row.pointDifference ?? 0) > 0 ? 'var(--accent-primary, #059669)' : (row.pointDifference ?? 0) < 0 ? 'var(--accent-rose, #e11d48)' : 'var(--text-muted)'
                                      }}>
                                        {(row.pointDifference ?? 0) > 0 ? `+${row.pointDifference}` : (row.pointDifference ?? 0) < 0 ? `${row.pointDifference}` : '0'}
                                      </td>
                                    </>
                                  )}
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: 'var(--accent-primary, #059669)', fontSize: '1.05rem' }}>
                                    {row.points}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── Groups & Squads Tab (Pickleball) ── */}
        {activeTab === 'groups' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-heading)' }}>
                  Group Assignments & Team Squads
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Organize tournament groups, balance teams, and view squad rosters
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleAutoDistribute}
                  disabled={actionLoading}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} /> Auto-Distribute Evenly
                </button>
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <UserPlus size={14} /> Add Team to Tournament
                </button>
              </div>
            </div>

            {loadingTab && !groupsData ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading groups…</div>
            ) : !groupsData || Object.keys(groupsData.groups || {}).length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Shield size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>No Groups Configured</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click &quot;Add Team to Tournament&quot; to begin building your tournament groups.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                {Object.keys(groupsData.groups).sort().map((groupName) => {
                  const gTeams = groupsData.groups[groupName];
                  return (
                    <div key={groupName} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--accent-primary, #059669)' }}>
                          {groupName}
                        </h4>
                        <span className="badge badge-info">
                          {gTeams.length} Teams
                        </span>
                      </div>

                      {gTeams.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0' }}>No teams assigned to this group yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {gTeams.map((t, idx) => (
                            <div
                              key={t.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenTeamRoster(t)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleOpenTeamRoster(t);
                                }
                              }}
                              className="tournament-squad-row"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{t.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.playerCount || t.members?.length || 12} Squad Members</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                                  {t.status || 'APPROVED'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary, #10b981)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                  View Squad <ChevronRight size={13} />
                                </span>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePromptRemoveTeam(t);
                                    }}
                                    title="Remove team from tournament"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.12)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      color: '#f87171',
                                      borderRadius: '6px',
                                      padding: '0.25rem 0.5rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
                                  >
                                    <Trash2 size={12} />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Classic Teams Tab (Cricket/Other) ── */}
        {activeTab === 'teams' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-heading)' }}>
                  Registered Teams ({teams.length})
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Participating squads and rosters registered in {tournament?.name || 'this tournament'}.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <UserPlus size={14} /> Add Team to Tournament
                </button>
                <button
                  onClick={loadTabData}
                  disabled={loadingTab}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {loadingTab && teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading participating teams…</div>
            ) : teams.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Shield size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>No Registered Teams</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Teams will appear here once registered.</p>
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <UserPlus size={16} /> Register First Team
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {teams.map((tm) => (
                  <div
                    key={tm.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenTeamRoster(tm)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenTeamRoster(tm);
                      }
                    }}
                    className="tournament-team-card glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      outline: 'none',
                      position: 'relative',
                      gap: '1rem',
                      transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary, #10b981)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-primary-glow, rgba(16, 185, 129, 0.3))';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    {/* Header Row: Logo + Team Name + Group Pill + Remove Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        {/* Team logo or initial */}
                        {tm.logo ? (
                          <img
                            src={tm.logo}
                            alt={tm.name}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              objectFit: 'cover',
                              border: '1.5px solid var(--border-color)',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background: 'var(--accent-primary-glow, rgba(16, 185, 129, 0.15))',
                              color: 'var(--accent-primary, #10b981)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.15rem',
                              flexShrink: 0,
                              border: '1.5px solid rgba(16, 185, 129, 0.3)',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                            }}
                          >
                            {tm.name ? tm.name.slice(0, 2).toUpperCase() : 'T'}
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 800,
                              margin: '0 0 0.25rem 0',
                              color: 'var(--text-heading)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.25
                            }}
                            title={tm.name}
                          >
                            {tm.name}
                          </h4>
                          {tm.groupName ? (
                            <span
                              className="badge badge-accent"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                display: 'inline-block'
                              }}
                            >
                              {tm.groupName}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Registered Team
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromptRemoveTeam(tm);
                          }}
                          title="Remove team from tournament"
                          className="tournament-team-remove-btn"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            borderRadius: '8px',
                            padding: '0.35rem 0.6rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Middle Row: Stats & Registered Players Strip */}
                    <div
                      className="tournament-team-meta-strip"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
                        <Users size={15} color="var(--accent-primary, #10b981)" />
                        <span style={{ fontWeight: 600 }}>
                          {tm.members?.length || tm.playersCount || 0} Registered Players
                        </span>
                      </div>
                      {tm.seed && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Seed #{tm.seed}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: View Squad Full-Width Action */}
                    <div
                      className="tournament-team-squad-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--accent-primary, #10b981)',
                        padding: '0.55rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.22)',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span>View Squad & Roster</span>
                      <ChevronRight size={15} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Awards & Leaderboards Tab ── */}
        {activeTab === 'awards' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#f59e0b" /> Tournament Awards &amp; Leaderboards
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Authoritative statistical awards calculated strictly from verified match scorecards and events.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCalculateAwards}
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                >
                  <Trophy size={14} /> {actionLoading ? 'Calculating…' : 'Compute Awards & Leaderboards'}
                </button>
                <button
                  onClick={loadTabData}
                  disabled={loadingTab}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {loadingTab && awardsData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating awards…</div>
            ) : awardsData.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Award size={48} color="#f59e0b" style={{ margin: '0 auto 1rem auto', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>No Awards Computed Yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                  Awards and leaderboards can be generated automatically once tournament matches have concluded and stats are recorded.
                </p>
                <button
                  onClick={handleCalculateAwards}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Zap size={16} /> Compute Official Awards Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.25rem' }}>
                {awardsData.map((award) => (
                  <div
                    key={award.id || award.key}
                    className="glass-panel"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '16px',
                      border: '1.5px solid rgba(245, 158, 11, 0.3)',
                      background: 'var(--bg-card)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trophy size={22} color="#fbbf24" />
                      </div>
                      {award.isManualOverride && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          Organizer Override
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#d97706', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      {award.name}
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.25rem' }}>
                      {award.recipientType === 'PLAYER' && award.recipientId ? (
                        <Link href={`/players/${award.recipientId}`} style={{ color: 'var(--text-heading)', textDecoration: 'none' }}>
                          {award.recipientName || 'Unassigned'}
                        </Link>
                      ) : (
                        award.recipientName || 'Unassigned'
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {award.teamName ? `Team: ${award.teamName}` : (award.recipientType === 'TEAM' ? 'Team Accolade' : 'Individual Accolade')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Record</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary, #059669)', background: 'var(--slot-available-bg, rgba(16,185,129,0.1))', border: '1px solid var(--border-glow, rgba(16,185,129,0.3))', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        {award.statValue}
                      </span>
                    </div>

                    {award.calculationMethod && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Method: {award.calculationMethod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Player Registrations Tab ── */}
        {activeTab === 'registrations' && (
          <PlayerRegistrationsManager
            tournament={tournament}
            canManage={canManage}
            teams={teams}
          />
        )}

        {/* ── Official Scorers Tab ── */}
        {activeTab === 'scorers' && (
          <OfficialScorersManager
            tournament={tournament}
            canManage={canManage}
            matches={fixtures}
            currentUser={user}
          />
        )}

        {/* ── Live Streaming Access Tab ── */}
        {activeTab === 'streaming' && (
          <TournamentStreamingPermissionsManager
            tournament={tournament}
            canManage={canManage}
            matches={fixtures}
            currentUser={user}
          />
        )}

        {/* ── Auction Tab ── */}
        {activeTab === 'auction' && (
          <TournamentAuctionTab tournamentId={tournamentId} />
        )}

        {/* ── Settings & Management Tab ── */}
        {activeTab === 'settings' && canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings size={20} color="var(--accent-primary, #059669)" /> Tournament Administration & Settings
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
                Manage tournament configuration, access permissions, official display boards, and administrative safeguards.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Tournament ID</span>
                  <code style={{ fontSize: '0.88rem', color: 'var(--accent-primary, #059669)', wordBreak: 'break-all', fontWeight: 700 }}>{tournamentId}</code>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Your Permission Level</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isSuperAdmin ? '#d97706' : '#0284c7' }}>
                    {isSuperAdmin ? 'Superadmin (Platform-wide)' : 'Tournament Organizer / Creator'}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Signage Display Link</span>
                  <Link href={`/display/tournament/${tournamentId}`} target="_blank" style={{ fontSize: '0.88rem', color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                    Open Public Display <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            {canDeleteTournament && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1.5px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  boxShadow: '0 10px 30px rgba(239, 68, 68, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.4rem' }}>
                      <AlertTriangle size={22} />
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                        Danger Zone: Delete Tournament
                      </h4>
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--accent-rose, #dc2626)', lineHeight: 1.5, fontWeight: 600 }}>
                      Permanently delete this tournament and its fixtures, live matches, cricket balls, points tables, and player registrations.
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ✓ <strong>Safe Cascade Guarantee:</strong> Shared clubs, team profiles, and unrelated tournament records will remain intact.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenDeleteModal}
                    className="btn btn-danger"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#ef4444',
                      borderColor: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.75rem 1.4rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} /> Delete This Tournament
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddTeamModal(false); }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
        >
          <div style={{ backgroundColor: 'var(--bg-modal, #0f172a)', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px', color: 'var(--text-main)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              Register Team to Tournament
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Select an existing club or create a new team, assign to a group, and configure squad players.
            </p>

            {/* Mode Selector */}
            <div style={{ display: 'flex', background: 'var(--bg-card, rgba(255,255,255,0.05))', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setRegistrationMode('existing')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: registrationMode === 'existing' ? 'var(--accent-primary, #10b981)' : 'transparent',
                  color: registrationMode === 'existing' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Choose Existing Team
              </button>
              <button
                type="button"
                onClick={() => setRegistrationMode('new')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: registrationMode === 'new' ? 'var(--accent-primary, #10b981)' : 'transparent',
                  color: registrationMode === 'new' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Create New Team
              </button>
            </div>

            <form onSubmit={handleAddTeam}>
              {registrationMode === 'existing' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                      Select Teams to Register *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                        {bulkSelectedTeamIds.length} Selected
                      </span>
                      {filteredAvailableTeams.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleSelectAllFiltered}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                          >
                            Select All
                          </button>
                          {bulkSelectedTeamIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearSelection}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                            >
                              Clear
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Search and Division Filter Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search teams by name or city..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.5rem 0.45rem 2rem',
                          borderRadius: '6px',
                          background: 'var(--input-bg, rgba(255,255,255,0.06))',
                          border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                          color: 'var(--text-main, #ffffff)',
                          fontSize: '0.82rem'
                        }}
                      />
                      {teamSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTeamSearchQuery('')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <select
                      value={teamDivisionFilter}
                      onChange={(e) => setTeamDivisionFilter(e.target.value)}
                      style={{
                        padding: '0.45rem 2.5rem 0.45rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-modal, #0f172a)',
                        border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                        color: 'var(--text-main, #ffffff)',
                        fontSize: '0.82rem',
                        maxWidth: '140px'
                      }}
                    >
                      <option value="ALL">All Divisions</option>
                      <option value="Open">Open</option>
                      <option value="Division 1">Division 1</option>
                      <option value="Division 2">Division 2</option>
                      <option value="Corporate">Corporate</option>
                    </select>
                  </div>

                  {/* Scrollable Team List */}
                  <div
                    style={{
                      maxHeight: '230px',
                      overflowY: 'auto',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.35rem'
                    }}
                  >
                    {filteredAvailableTeams.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No matching teams found. Switch to &quot;Create New Team&quot;.
                      </div>
                    ) : (
                      filteredAvailableTeams.map((at) => {
                        const isAlreadyRegistered = registeredTeamIds.has(String(at.id)) || registeredTeamIds.has(at.name?.toLowerCase().trim());
                        const isSelected = bulkSelectedTeamIds.includes(at.id);

                        return (
                          <div
                            key={at.id}
                            onClick={() => {
                              if (!isAlreadyRegistered) handleToggleSelectTeam(at.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '6px',
                              marginBottom: '0.25rem',
                              background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(16, 185, 129, 0.4)' : 'transparent'}`,
                              cursor: isAlreadyRegistered ? 'not-allowed' : 'pointer',
                              opacity: isAlreadyRegistered ? 0.5 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                              <input
                                type="checkbox"
                                disabled={isAlreadyRegistered}
                                checked={isSelected}
                                onChange={() => {
                                  if (!isAlreadyRegistered) handleToggleSelectTeam(at.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ cursor: isAlreadyRegistered ? 'not-allowed' : 'pointer', width: 16, height: 16, accentColor: 'var(--accent-primary, #10b981)' }}
                              />
                              {at.logoUrl ? (
                                <img src={at.logoUrl} alt={at.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-primary, #10b981)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(at.name || 'T').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#34d399' : 'var(--text-main, #ffffff)' }}>
                                  {at.name}
                                </span>
                                {at.division && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                                    ({at.division})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              {isAlreadyRegistered ? (
                                <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                  Registered
                                </span>
                              ) : isSelected ? (
                                <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                  <Check size={10} style={{ marginRight: 2 }} /> Selected
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {at.membersCount || at.rosterSize || 12} players
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Kandivali Super Strikers"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'var(--input-bg, rgba(255,255,255,0.06))',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                  Assign to Group *
                </label>
                <select
                  value={newTeamGroup}
                  onChange={(e) => setNewTeamGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-modal, #0f172a)',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                    color: 'var(--text-main, #ffffff)',
                    fontSize: '0.9rem',
                    colorScheme: 'light dark'
                  }}
                >
                  <option value="Group 1" style={{ background: 'var(--bg-modal, #0f172a)', color: 'var(--text-main, #ffffff)' }}>Group 1</option>
                  <option value="Group 2" style={{ background: 'var(--bg-modal, #0f172a)', color: 'var(--text-main, #ffffff)' }}>Group 2</option>
                  <option value="Group 3" style={{ background: 'var(--bg-modal, #0f172a)', color: 'var(--text-main, #ffffff)' }}>Group 3</option>
                  <option value="Group 4" style={{ background: 'var(--bg-modal, #0f172a)', color: 'var(--text-main, #ffffff)' }}>Group 4</option>
                </select>
              </div>

              {registrationMode === 'new' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Squad Players (One name per line, optional)
                  </label>
                  <textarea
                    rows="3"
                    value={newTeamRosterText}
                    onChange={(e) => setNewTeamRosterText(e.target.value)}
                    placeholder="Player 1&#10;Player 2&#10;Player 3..."
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'var(--input-bg, rgba(255,255,255,0.06))',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                      color: 'var(--text-main, #ffffff)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || bulkSubmitting || (registrationMode === 'existing' && bulkSelectedTeamIds.length === 0)}
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  {bulkSubmitting || actionLoading
                    ? 'Registering…'
                    : registrationMode === 'existing'
                    ? `Register ${bulkSelectedTeamIds.length} Team${bulkSelectedTeamIds.length === 1 ? '' : 's'}`
                    : 'Register Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module A1: Confirmation Dialog for Removing Team */}
      {teamToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>
                  Remove {teamToRemove.name}?
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Tournament: {tournament?.name}
                </p>
              </div>
            </div>

            {/* Impact Analysis Warning */}
            {impactLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Analyzing tournament impact…
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                    Impact of Removal:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <li>
                      Completed matches: <strong style={{ color: removeImpact?.completedMatchesCount > 0 ? '#ef4444' : '#34d399' }}>{removeImpact?.completedMatchesCount || 0}</strong>
                    </li>
                    <li>
                      Scheduled fixtures: <strong style={{ color: '#fbbf24' }}>{removeImpact?.scheduledFixturesCount || 0}</strong>
                    </li>
                    <li>
                      Points table records: <strong style={{ color: 'var(--text-heading)' }}>{removeImpact?.standingsCount || 0}</strong>
                    </li>
                    <li style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                      (The team profile itself will remain intact in TurfSpot)
                    </li>
                  </ul>
                </div>

                {/* If completed matches exist, require mode selection & confirmation word */}
                {removeImpact && removeImpact.completedMatchesCount > 0 ? (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                      ⚠️ <strong>Warning:</strong> This team has {removeImpact.completedMatchesCount} completed match(es). Removing it will affect standings and past records.
                    </div>

                    <div style={{ marginBottom: '0.85rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Removal Mode:
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="removeMode"
                          value="DELETE_FIXTURES"
                          checked={removeMode === 'DELETE_FIXTURES'}
                          onChange={() => setRemoveMode('DELETE_FIXTURES')}
                          style={{ accentColor: '#ef4444' }}
                        />
                        <span>Remove team and delete all its matches and fixtures</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="removeMode"
                          value="BLOCK"
                          checked={removeMode === 'BLOCK'}
                          onChange={() => setRemoveMode('BLOCK')}
                          style={{ accentColor: '#ef4444' }}
                        />
                        <span>Block removal (keep team in tournament)</span>
                      </label>
                    </div>

                    {removeMode === 'DELETE_FIXTURES' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fca5a5' }}>
                          Type <strong>REMOVE</strong> or <strong>{teamToRemove.name}</strong> to confirm:
                        </label>
                        <input
                          type="text"
                          value={confirmWordInput}
                          onChange={(e) => setConfirmWordInput(e.target.value)}
                          placeholder="Type REMOVE to confirm"
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            borderRadius: '6px',
                            background: 'var(--input-bg, rgba(255,255,255,0.06))',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#ffffff',
                            fontSize: '0.88rem'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Scheduled fixtures for {teamToRemove.name} will be removed from the tournament schedule and standings recalculated.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setTeamToRemove(null);
                  setRemoveImpact(null);
                }}
                disabled={removeSubmitting}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveTeam}
                disabled={
                  removeSubmitting ||
                  impactLoading ||
                  removeMode === 'BLOCK' ||
                  (removeImpact?.completedMatchesCount > 0 &&
                    removeMode === 'DELETE_FIXTURES' &&
                    !['remove', teamToRemove.name.toLowerCase().trim()].includes(confirmWordInput.toLowerCase().trim()))
                }
                className="btn btn-danger"
                style={{
                  flex: 1,
                  background: '#ef4444',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700
                }}
              >
                {removeSubmitting ? 'Removing…' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Deletion Safe Confirmation Modal ── */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1.25rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              borderRadius: '20px',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.2)',
              background: 'linear-gradient(180deg, #180d0d 0%, #0d0f12 100%)',
              color: '#ffffff'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Trash2 size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                  Delete Tournament?
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#fca5a5' }}>
                  This will permanently delete <strong style={{ color: '#fff' }}>{tournament?.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingTournament}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Impact Details */}
            {loadingImpact ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
                Checking dependent tournament records…
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.86rem'
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <AlertTriangle size={16} />
                    Records to be safely cascaded & removed:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Total Matches</span>
                      <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{deleteImpact?.matches?.total ?? 0}</strong>
                      <span style={{ fontSize: '0.74rem', color: '#fbbf24', marginLeft: '0.4rem' }}>
                        ({deleteImpact?.matches?.live ?? 0} live, {deleteImpact?.matches?.completed ?? 0} completed)
                      </span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Registered Teams</span>
                      <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{deleteImpact?.teamsCount ?? teams.length}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Player Registrations</span>
                      <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{deleteImpact?.playerRegistrationsCount ?? 0}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Auction Records</span>
                      <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{deleteImpact?.auctionCount ? `${deleteImpact.auctionCount} auctions` : 'None'}</strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.82rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5
                  }}
                >
                  <strong style={{ color: '#34d399' }}>✓ Safe Deletion Safeguards:</strong>
                  <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.2rem' }}>
                    <li>Teams and Player profiles will <strong>NOT</strong> be deleted from the platform.</li>
                    <li>Shared venue bookings and unrelated tournaments remain untouched.</li>
                    <li>All tournament-specific matches, cricket balls, and points table rows are deleted safely in a database transaction.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#e2e8f0' }}>
                    Please type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm permanent deletion:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationWord}
                    onChange={(e) => setDeleteConfirmationWord(e.target.value)}
                    placeholder="Type DELETE"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1.5px solid rgba(239, 68, 68, 0.5)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingTournament}
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.75rem', color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTournament}
                disabled={deletingTournament || loadingImpact || (deleteConfirmationWord.trim().toUpperCase() !== 'DELETE' && deleteConfirmationWord.trim().toLowerCase() !== (tournament?.name || '').trim().toLowerCase())}
                className="btn btn-danger"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: (deleteConfirmationWord.trim().toUpperCase() === 'DELETE' || deleteConfirmationWord.trim().toLowerCase() === (tournament?.name || '').trim().toLowerCase()) ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: (deleteConfirmationWord.trim().toUpperCase() === 'DELETE' || deleteConfirmationWord.trim().toLowerCase() === (tournament?.name || '').trim().toLowerCase()) ? 'pointer' : 'not-allowed'
                }}
              >
                {deletingTournament ? 'Deleting Tournament…' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Squad Roster Drawer */}
      <TeamRosterDrawer
        isOpen={showRosterDrawer}
        onClose={() => {
          setShowRosterDrawer(false);
          setSelectedRosterTeam(null);
        }}
        team={selectedRosterTeam}
        tournament={tournament}
        onRosterUpdated={loadTabData}
      />
    </div>
  );
}
