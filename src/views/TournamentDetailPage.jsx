import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  setTournamentLiveMatches,
  updateLiveMatchSummary
} from '../features/tournament/tournamentSlice';
import { useTournamentLive } from '../hooks/useTournamentLive';
import LiveMatchCard from '../components/live/LiveMatchCard';
import TournamentAuctionTab from '../components/auction/TournamentAuctionTab';
import { Trophy, Calendar, MapPin, Users, Radio, Monitor, ArrowLeft, Shield, Gavel, Tv, Eye } from 'lucide-react';

const TournamentDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('live');
  const [tournament, setTournament] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Tab data caches
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  // Redux live matches for this specific tournament
  const liveMatchIds = useSelector((state) => state.tournament.liveMatchesByTournament[id] || []);
  const liveMatchesById = useSelector((state) => state.tournament.liveMatchesById);
  const liveMatches = liveMatchIds.map((mId) => liveMatchesById[mId]).filter(Boolean);

  // 1. Initial Overview Fetch
  useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      setLoadingOverview(true);
      try {
        const res = await axios.get(`/api/tournaments/${id}`);
        if (res.data.success && isMounted) {
          setTournament(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load tournament overview:', err);
      } finally {
        if (isMounted) setLoadingOverview(false);
      }
    };
    fetchOverview();
    return () => { isMounted = false; };
  }, [id]);

  // View Tracking Hook: Record view once per session, deduplicated with 15-min cooldown
  useEffect(() => {
    if (!id) return;

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

    const sessionKey = `viewed_tournament_${id}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Ignore private mode storage errors
    }

    const token = typeof window !== 'undefined' ? (localStorage.getItem('turf_auth_token') || localStorage.getItem('token')) : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.post(`/api/tournaments/${id}/view`, {
      viewerId,
      platform: 'WEB'
    }, { headers })
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setTournament((prev) => prev ? ({
            ...prev,
            totalViews: res.data.data.totalViews,
            uniqueViewers: res.data.data.uniqueViewers,
            total_views: res.data.data.totalViews,
            unique_viewers: res.data.data.uniqueViewers,
            lastViewedAt: res.data.data.lastViewedAt
          }) : prev);
        }
      })
      .catch(() => {
        // Non-blocking: analytics failures should never disrupt tournament experience
      });
  }, [id]);

  // 2. Tab Lazy Loader (Only fetch data when user clicks the tab)
  useEffect(() => {
    let isMounted = true;
    const loadTabData = async () => {
      setLoadingTab(true);
      try {
        if (activeTab === 'live') {
          const res = await axios.get(`/api/tournaments/${id}/live`);
          if (res.data.success && isMounted) {
            dispatch(setTournamentLiveMatches({
              tournamentId: id,
              matches: res.data.data.items || []
            }));
          }
        } else if (activeTab === 'matches') {
          const res = await axios.get(`/api/tournaments/${id}/matches`);
          if (res.data.success && isMounted) {
            setFixtures(res.data.data.items || []);
          }
        } else if (activeTab === 'teams') {
          const res = await axios.get(`/api/tournaments/${id}/teams`);
          if (res.data.success && isMounted) {
            setTeams(res.data.data.items || []);
          }
        }
      } catch (err) {
        console.error(`Failed to load tab ${activeTab}:`, err);
      } finally {
        if (isMounted) setLoadingTab(false);
      }
    };

    loadTabData();
    return () => { isMounted = false; };
  }, [id, activeTab, dispatch]);

  // 3. Socket.IO Room Hook: Subscribe strictly when on 'live' tab
  const handleLiveMatchUpdate = useCallback((data) => {
    dispatch(updateLiveMatchSummary({
      matchId: data.matchId,
      liveScoreSummary: data.liveScoreSummary,
      liveSubtext: data.liveSubtext,
      status: data.status
    }));
  }, [dispatch]);

  // Hook automatically joins room on mount and leaves on unmount
  useTournamentLive(activeTab === 'live' ? id : null, handleLiveMatchUpdate);

  if (loadingOverview && !tournament) {
    return (
      <div style={{ maxWidth: 1200, margin: '3rem auto', textAlign: 'center', color: '#94a3b8' }}>
        Loading tournament details...
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ maxWidth: 1200, margin: '3rem auto', textAlign: 'center' }}>
        <h2>Tournament Not Found</h2>
        <Link to="/tournaments" style={{ color: 'var(--accent-primary, #10b981)' }}>Back to Tournaments</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(0.75rem, 2vw, 1.25rem)' }}>
      {/* Breadcrumb / Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          to="/tournaments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted, #94a3b8)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Back to Tournaments
        </Link>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            to={`/display/tournament/${id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              color: 'var(--text-main, #fff)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <Monitor size={15} color="var(--accent-primary, #10b981)" /> Open Digital Signage
          </Link>
          <Link
            to={`/tv/${id}`}
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              border: '1px solid #10b981',
              color: '#ffffff',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.8rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Tv size={15} color="#ffffff" /> Launch Smart TV Mode
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{
        background: 'var(--bg-card-solid, #1e293b)',
        borderRadius: 'var(--radius-md, 12px)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        padding: 'clamp(1rem, 2.5vw, 1.75rem)',
        marginBottom: '1.5rem',
        position: 'relative',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-primary, #10b981)', padding: '3px 10px', borderRadius: 4 }}>
                {tournament.sport?.name}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: 'var(--accent-secondary, #3b82f6)', padding: '3px 10px', borderRadius: 4 }}>
                {tournament.format}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #ffffff)', lineHeight: 1.25 }}>
              {tournament.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(0.75rem, 2vw, 1.25rem)', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={15} color="var(--accent-primary, #10b981)" style={{ flexShrink: 0 }} /> {tournament.city} {tournament.venue ? `(${tournament.venue.name})` : ''}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={15} color="var(--accent-secondary, #3b82f6)" style={{ flexShrink: 0 }} /> {new Date(tournament.dates.start).toLocaleDateString()} - {new Date(tournament.dates.end).toLocaleDateString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users size={15} color="var(--accent-amber, #f59e0b)" style={{ flexShrink: 0 }} /> {tournament.registeredTeamsCount} / {tournament.maxTeams} Teams
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Eye size={15} color="var(--accent-primary, #10b981)" style={{ flexShrink: 0 }} />
                {(tournament.totalViews || tournament.total_views || 0).toLocaleString()} views
                {((tournament.uniqueViewers || tournament.unique_viewers || 0) > 0) && (
                  <> • {(tournament.uniqueViewers || tournament.unique_viewers).toLocaleString()} unique viewers</>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lazy Tab Navigation Bar (Swipeable on touch devices) */}
      <div className="touch-tabs-bar" style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '0.35rem'
      }}>
        {[
          { key: 'live', label: '⚡ Live Matches', badge: liveMatches.length },
          { key: 'overview', label: 'Overview' },
          { key: 'matches', label: 'Fixtures & Schedule' },
          { key: 'teams', label: 'Teams' },
          { key: 'auction', label: '🔨 Player Auction' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary, #10b981)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-primary, #10b981)' : 'var(--text-muted, #94a3b8)',
              padding: '0.65rem 1.15rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: 10,
                fontWeight: 800
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Live Matches (Simultaneous Match Grid) */}
      {activeTab === 'live' && (
        <div>
          {loadingTab && liveMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>Checking live matches...</div>
          ) : liveMatches.length === 0 ? (
            <div style={{
              background: 'var(--bg-card, #1e293b)',
              padding: '3rem 1.5rem',
              borderRadius: 'var(--radius-md, 12px)',
              textAlign: 'center',
              border: '1px dashed var(--border-color, rgba(255,255,255,0.1))',
              boxShadow: 'var(--shadow-card)'
            }}>
              <Radio size={36} color="var(--text-dim, #64748b)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading, #ffffff)' }}>No Active Live Matches</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                There are no matches currently in progress for this tournament. Check the Fixtures tab for upcoming matches.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Showing {liveMatches.length} simultaneous live match{liveMatches.length > 1 ? 'es' : ''} on court resources.
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary, #10b981)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  ● Connected to Live Room (tournament:{id.substring(0, 8)}...)
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: '1.25rem'
              }}>
                {liveMatches.map((m) => (
                  <LiveMatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Overview */}
      {activeTab === 'overview' && (
        <div style={{
          background: 'var(--bg-card, #1e293b)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-heading, #ffffff)', fontSize: '1.15rem' }}>Tournament Rules & Guidelines</h3>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, fontSize: '0.9rem' }}>
            {tournament.rules || 'Standard rules apply. Artificial turf rules strictly in effect.'}
          </p>

          <h3 style={{ marginTop: '1.75rem', color: 'var(--text-heading, #ffffff)', fontSize: '1.15rem' }}>Venue Details</h3>
          {tournament.venue ? (
            <div style={{ color: 'var(--text-secondary, #cbd5e1)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-heading, #ffffff)' }}>{tournament.venue.name}</strong>
              <div>{tournament.venue.address}, {tournament.venue.city}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted, #94a3b8)' }}>Venue details will be announced soon.</div>
          )}
        </div>
      )}

      {/* Tab 3: Fixtures */}
      {activeTab === 'matches' && (
        <div style={{
          background: 'var(--bg-card, #1e293b)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          boxShadow: 'var(--shadow-card)'
        }}>
          {fixtures.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '2rem' }}>No fixtures scheduled yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fixtures.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
                    borderRadius: 'var(--radius-sm, 8px)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading, #ffffff)' }}>
                      {f.teamA?.name} <span style={{ color: 'var(--text-dim, #94a3b8)', margin: '0 4px', fontWeight: 500 }}>vs</span> {f.teamB?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 3 }}>
                      {f.courtName} | {new Date(f.date).toLocaleDateString()} at {f.startTime}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: f.status === 'LIVE' ? 'rgba(239,68,68,0.2)' : 'var(--bg-tag, rgba(255,255,255,0.06))',
                      color: f.status === 'LIVE' ? 'var(--accent-rose, #ef4444)' : 'var(--text-muted, #94a3b8)'
                    }}>
                      {f.status}
                    </span>
                    <Link
                      to={`/matches/${f.id}`}
                      style={{ fontSize: '0.78rem', color: 'var(--accent-primary, #10b981)', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Teams */}
      {activeTab === 'teams' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
          gap: '1rem'
        }}>
          {teams.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', gridColumn: '1/-1', padding: '2rem' }}>No teams registered yet.</div>
          ) : (
            teams.map((tm) => (
              <div
                key={tm.id}
                style={{
                  background: 'var(--bg-card, #1e293b)',
                  borderRadius: 'var(--radius-sm, 8px)',
                  padding: '1rem',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: 'var(--shadow-card)'
                }}
              >
                {tm.logo ? (
                  <img src={tm.logo} alt={tm.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <Shield size={34} color="var(--accent-primary, #10b981)" />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading, #ffffff)' }}>{tm.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>Status: {tm.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Auction */}
      {activeTab === 'auction' && (
        <TournamentAuctionTab tournamentId={id} tournament={tournament} />
      )}
    </div>
  );
};

export default TournamentDetailPage;
