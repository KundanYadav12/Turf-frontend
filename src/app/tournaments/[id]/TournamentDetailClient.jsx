'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  setTournamentLiveMatches,
  updateLiveMatchSummary
} from '../../../features/tournament/tournamentSlice';
import { useTournamentLive } from '../../../hooks/useTournamentLive';
import LiveMatchCard from '../../../components/live/LiveMatchCard';
import TournamentAuctionTab from '../../../components/auction/TournamentAuctionTab';
import {
  Trophy, Calendar, MapPin, Users, Radio, Monitor, ArrowLeft,
  Shield, Gavel, Table, UserPlus, Play, CheckCircle, AlertCircle, RefreshCw, Zap, Award, Tv
} from 'lucide-react';

export default function TournamentDetailClient({ tournament: initialTournament, tournamentId }) {
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('live');
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

  // Add Team Modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('Group 1');
  const [newTeamRosterText, setNewTeamRosterText] = useState('');

  // Redux live matches
  const liveMatchIds = useSelector((state) => state.tournament.liveMatchesByTournament[tournamentId] || []);
  const liveMatchesById = useSelector((state) => state.tournament.liveMatchesById);
  const liveMatches = liveMatchIds.map((mId) => liveMatchesById[mId]).filter(Boolean);

  const isPickleball = tournament?.sport?.slug === 'pickleball' || tournament?.name?.toLowerCase().includes('pickleball');

  // Load Tab Data dynamically
  const loadTabData = useCallback(async () => {
    setLoadingTab(true);
    setErrorMsg('');
    try {
      if (activeTab === 'live') {
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
          setTeams(res.data.data.items || []);
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
      }
    } catch (err) {
      console.error(`Failed to load tab ${activeTab}:`, err);
    } finally {
      setLoadingTab(false);
    }
  }, [tournamentId, activeTab, dispatch]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Socket.IO Room Hook: Subscribe strictly when on 'live' tab
  const handleLiveMatchUpdate = useCallback((data) => {
    dispatch(updateLiveMatchSummary({
      matchId: data.matchId,
      liveScoreSummary: data.liveScoreSummary,
      liveSubtext: data.liveSubtext,
      status: data.status
    }));
    // If fixtures or standings tab is open, also refresh
    if (activeTab === 'matches' || activeTab === 'standings') {
      loadTabData();
    }
  }, [dispatch, activeTab, loadTabData]);

  useTournamentLive(activeTab === 'live' ? tournamentId : null, handleLiveMatchUpdate);

  // Generate Round-Robin Fixtures handler
  const handleGenerateFixtures = async () => {
    if (!confirm('Generate a round-robin schedule for all groups? Existing unplayed scheduled matches will be refreshed.')) return;
    setActionLoading(true);
    setErrorMsg('');
    setNotification('');
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/generate-fixtures`, {
        mode: 'ROUND_ROBIN'
      });
      if (res.data.success) {
        setNotification(res.data.message || 'Round-robin fixtures generated successfully!');
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to generate fixtures.');
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-Distribute Teams handler
  const handleAutoDistribute = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setNotification('');
    try {
      const res = await axios.put(`/api/tournaments/${tournamentId}/groups`, {
        autoDistribute: true,
        groupsCount: tournament.groupsCount || 2
      });
      if (res.data.success) {
        setNotification('Teams automatically distributed across groups!');
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to auto-distribute teams.');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute Tournament Awards handler
  const handleCalculateAwards = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/awards/calculate`);
      if (res.data.success) {
        setNotification('Tournament awards & leaderboards calculated successfully!');
        setAwardsData(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to compute awards.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Team to Tournament handler
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const playerNames = newTeamRosterText
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean);

      const res = await axios.post(`/api/tournaments/${tournamentId}/teams`, {
        name: newTeamName.trim(),
        groupName: newTeamGroup,
        playerNames: playerNames.length > 0 ? playerNames : undefined
      });

      if (res.data.success) {
        setNotification(`Team "${newTeamName}" registered successfully!`);
        setNewTeamName('');
        setNewTeamRosterText('');
        setShowAddTeamModal(false);
        loadTabData();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to add team.');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 2.5vw, 2rem)', marginBottom: '1.75rem', borderRadius: 'var(--radius-lg)', background: isPickleball ? 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(6,78,59,0.3))' : undefined, border: isPickleball ? '1px solid rgba(16,185,129,0.3)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">{tournament.sport?.name || (isPickleball ? 'Pickleball' : 'Cricket')}</span>
              {isPickleball && (
                <>
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 800 }}>
                    {tournament.matchFormat || 'DOUBLES'}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                    Target: {tournament.targetScore || 15} pts {tournament.winByTwo ? '(Win-by-2)' : ''}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                    {tournament.groupsCount || 2} Groups &bull; Squad: {tournament.rosterSize || 12} Players
                  </span>
                </>
              )}
              {tournament.isLive && (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Radio size={12} /> LIVE MATCHES ACTIVE
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '0 0 0.85rem 0', color: 'var(--text-heading)' }}>
              {tournament.name}
            </h1>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} color="var(--accent-primary)" />
                <span>{tournament.venue?.name || 'Sports Arena'}, {tournament.city || 'India'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={15} color="var(--accent-primary)" />
                <span>{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'Active'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={15} color="var(--accent-primary)" />
                <span>{tournament.registeredTeamsCount || tournament.teamsCount || 10} Registered Teams</span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href={`/display/tournament/${tournamentId}`}
              target="_blank"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Monitor size={16} /> Signage TV Display
            </Link>
            <Link
              href={`/tv/${tournamentId}`}
              target="_blank"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', borderColor: '#10b981' }}
            >
              <Tv size={16} /> Smart TV Broadcast Mode
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.75rem', overflowX: 'auto' }}>
        {[
          { key: 'live', label: 'Live Matches', icon: <Radio size={15} /> },
          { key: 'matches', label: 'Fixtures & Schedule', icon: <Calendar size={15} /> },
          { key: 'standings', label: 'Standings & Table', icon: <Table size={15} /> },
          { key: 'teams', label: 'Registered Teams', icon: <Shield size={15} /> },
          { key: 'awards', label: 'Awards & Leaders', icon: <Award size={15} /> },
          ...(isPickleball ? [{ key: 'groups', label: 'Groups & Squads', icon: <Users size={15} /> }] : []),
          ...(tournament.hasAuction ? [{ key: 'auction', label: 'Player Auction', icon: <Gavel size={15} /> }] : [])
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
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {/* ── Live Tab ── */}
        {activeTab === 'live' && (
          <div>
            {loadingTab ? (
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
                  <LiveMatchCard key={m.id} match={m} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Matches/Fixtures Tab ── */}
        {activeTab === 'matches' && (
          <div>
            {/* Fixture Actions Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#fff' }}>
                  Tournament Fixtures ({fixtures.length} Total)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {tournament?.format || 'Round-robin'} schedule with automated court & ground allocation
                </p>
              </div>

              <button
                onClick={handleGenerateFixtures}
                disabled={actionLoading}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={15} /> Generate Fixtures Schedule
              </button>
            </div>

            {loadingTab ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading tournament fixtures…</div>
            ) : fixtures.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Fixtures Scheduled</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Tournament fixtures have not been generated yet. Ensure approved teams are registered and click Generate Fixtures.
                </p>
                <button
                  onClick={handleGenerateFixtures}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Play size={16} /> Generate Tournament Schedule
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {fixtures.map((f) => (
                  <div key={f.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-info">{f.groupName || 'Group Stage'}</span>
                        <span className="badge badge-neutral">Match #{f.matchNumber}</span>
                        <span className={`badge ${f.status === 'LIVE' ? 'badge-success' : f.status === 'COMPLETED' ? 'badge-warning' : 'badge-neutral'}`}>
                          {f.status}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {f.date} {f.startTime ? `&bull; ${f.startTime}` : ''} &bull; {f.courtName}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                        {f.teamA?.name || f.teamAName || 'Team A'} <span style={{ color: 'var(--accent-primary)', margin: '0 0.35rem' }}>vs</span> {f.teamB?.name || f.teamBName || 'Team B'}
                      </div>
                      {f.resultSummary && (
                        <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700, marginTop: '0.25rem' }}>
                          Result: {f.resultSummary}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        href={isPickleball ? `/matches/${f.id}/pickleball-scorer` : `/matches/${f.id}/scorer`}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Zap size={14} /> Live Scorer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pickleball Group Standings Tab ── */}
        {activeTab === 'standings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: '#fff' }}>
                  Pickleball Group Points Table
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                    1. Most Wins
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                    2. Higher Points Scored (PF)
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                    3. Head-to-Head Result
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
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
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Standings Available</h3>
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
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                              {groupName} Standings
                            </h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              ({groupTeams.length} Teams)
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                            {isFootball ? '3-1-0 Point System • GD Tiebreaker' : isCricket ? 'NRR Tiebreaker' : 'Win-Loss • Point Diff'}
                          </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Team</th>
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Played</th>
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Won</th>
                                {isFootball && (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Drawn</th>
                                )}
                                {isCricket && (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Tied</th>
                                )}
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Lost</th>
                                {isFootball ? (
                                  <>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>GF</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>GA</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>GD</th>
                                  </>
                                ) : isCricket ? (
                                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>NRR</th>
                                ) : (
                                  <>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>PF</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>PA</th>
                                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Diff</th>
                                  </>
                                )}
                                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#10b981' }}>Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupTeams.map((row) => (
                                <tr key={row.teamId || row.internalTeamId || row.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: row.rank === 1 ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: row.rank === 1 ? '#34d399' : '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span>#{row.rank}</span>
                                      {row.isQualified && (
                                        <span title="Qualified for Playoffs" style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>Q</span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fff' }}>
                                    {row.name || row.teamName}
                                  </td>
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>{row.played}</td>
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: row.won > 0 ? '#34d399' : 'inherit' }}>{row.won}</td>
                                  {isFootball && (
                                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>{row.drawn ?? 0}</td>
                                  )}
                                  {isCricket && (
                                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>{row.drawn ?? row.tied ?? 0}</td>
                                  )}
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: row.lost > 0 ? '#f87171' : 'inherit' }}>{row.lost}</td>
                                  {isFootball ? (
                                    <>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{row.goalsFor ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>{row.goalsAgainst ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: (row.goalDifference ?? 0) > 0 ? '#34d399' : (row.goalDifference ?? 0) < 0 ? '#f87171' : 'inherit' }}>
                                        {(row.goalDifference ?? 0) > 0 ? `+${row.goalDifference}` : row.goalDifference ?? 0}
                                      </td>
                                    </>
                                  ) : isCricket ? (
                                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: (row.netRunRate ?? 0) >= 0 ? '#34d399' : '#f87171' }}>
                                      {row.netRunRate != null ? (row.netRunRate > 0 ? `+${Number(row.netRunRate).toFixed(3)}` : Number(row.netRunRate).toFixed(3)) : '0.000'}
                                    </td>
                                  ) : (
                                    <>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{row.pointsScored ?? row.pointsFor ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>{row.pointsConceded ?? row.pointsAgainst ?? 0}</td>
                                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: (row.pointDifference ?? 0) > 0 ? '#34d399' : (row.pointDifference ?? 0) < 0 ? '#f87171' : 'inherit' }}>
                                        {(row.pointDifference ?? 0) > 0 ? `+${row.pointDifference}` : row.pointDifference ?? 0}
                                      </td>
                                    </>
                                  )}
                                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: '#fff' }}>
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
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Groups Configured</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click &quot;Add Team to Tournament&quot; to begin building your tournament groups.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                {Object.keys(groupsData.groups).sort().map((groupName) => {
                  const gTeams = groupsData.groups[groupName];
                  return (
                    <div key={groupName} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#34d399' }}>
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
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#fff' }}>{t.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.playerCount || 12} Squad Members</div>
                                </div>
                              </div>
                              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                                {t.status || 'APPROVED'}
                              </span>
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
            {loadingTab ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading participating teams…</div>
            ) : teams.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <Shield size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Registered Teams</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Teams will appear here once registered.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
                {teams.map((tm) => (
                  <div key={tm.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                      {tm.name ? tm.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-heading)' }}>{tm.name}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tm.members?.length || tm.playersCount || 0} Registered Players</span>
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Awards Computed Yet</h3>
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
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
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

                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      {award.name}
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                      {award.recipientType === 'PLAYER' && award.recipientId ? (
                        <Link href={`/players/${award.recipientId}`} style={{ color: '#fff', textDecoration: 'none' }}>
                          {award.recipientName || 'Unassigned'}
                        </Link>
                      ) : (
                        award.recipientName || 'Unassigned'
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {award.teamName ? `Team: ${award.teamName}` : (award.recipientType === 'TEAM' ? 'Team Accolade' : 'Individual Accolade')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Record</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        {award.statValue}
                      </span>
                    </div>

                    {award.calculationMethod && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Method: {award.calculationMethod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Auction Tab ── */}
        {activeTab === 'auction' && (
          <TournamentAuctionTab tournamentId={tournamentId} />
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-modal, #0f172a)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#fff' }}>
              Register Team to Tournament
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Enter team details, assign to a group, and configure squad players.
            </p>

            <form onSubmit={handleAddTeam}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Smashers A1"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
                  Assign to Group *
                </label>
                <select
                  value={newTeamGroup}
                  onChange={(e) => setNewTeamGroup(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Group 1">Group 1</option>
                  <option value="Group 2">Group 2</option>
                  <option value="Group 3">Group 3</option>
                  <option value="Group 4">Group 4</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  Squad Players (One name per line, optional)
                </label>
                <textarea
                  rows="4"
                  value={newTeamRosterText}
                  onChange={(e) => setNewTeamRosterText(e.target.value)}
                  placeholder="Player 1&#10;Player 2&#10;Player 3..."
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Register Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
