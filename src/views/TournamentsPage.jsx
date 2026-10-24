import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  setTournamentsLoading,
  setTournamentsFeed
} from '../features/tournament/tournamentSlice';
import { Trophy, Calendar, MapPin, Users, Radio, Search, Monitor, ArrowRight, PlusCircle, Tv, Eye } from 'lucide-react';
import CreateTournamentModal from '../components/tournament/CreateTournamentModal';

const TournamentsPage = () => {
  const dispatch = useDispatch();
  const { tournamentsById, allTournamentIds, feedPagination, loading } = useSelector((state) => state.tournament);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreateTournament = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'VENUE_OWNER');

  // Fetch paginated feed using modern useCallback
  const fetchTournaments = useCallback(async (cursor = null, isAppend = false) => {
    dispatch(setTournamentsLoading(true));
    try {
      const params = { limit: 12 };
      if (cursor) params.cursor = cursor;
      if (cityFilter) params.city = cityFilter;
      if (sportFilter) params.sportSlug = sportFilter;
      if (search) params.search = search;

      const res = await axios.get('/api/tournaments', { params });
      if (res.data.success) {
        dispatch(setTournamentsFeed({
          items: res.data.data,
          pagination: res.data.pagination,
          isAppend
        }));
      }
    } catch (err) {
      console.error('Failed to load tournaments feed:', err);
    } finally {
      dispatch(setTournamentsLoading(false));
    }
  }, [cityFilter, sportFilter, search, dispatch]);

  // Initial load or filter change
  useEffect(() => {
    fetchTournaments(null, false);
  }, [fetchTournaments]);

  const handleLoadMore = () => {
    if (feedPagination?.nextCursor && !loading) {
      fetchTournaments(feedPagination.nextCursor, true);
    }
  };

  const tournaments = allTournamentIds.map((id) => tournamentsById[id]).filter(Boolean);

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(0.75rem, 2vw, 1.25rem)' }}>
      {/* Header Banner */}
      <div className="tournament-hero-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Trophy size={28} color="var(--accent-primary, #10b981)" />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #ffffff)' }}>
              Tournaments Hub
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted, #94a3b8)', margin: 0, fontSize: '0.95rem' }}>
            Discover multi-city leagues, live simultaneous matches & interactive digital signage.
          </p>
        </div>

        {/* Global Stats Counter & Actions */}
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
              {tournaments.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Active Leagues</div>
          </div>

          {canCreateTournament && (
            <button
              id="create-tournament-header-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.72rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm, 8px)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={18} />
              <span>+ Create Tournament</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls (City, Sport, Search) */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-card, #1e293b)',
          padding: '0.55rem 0.85rem',
          borderRadius: 'var(--radius-sm, 8px)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          flex: '1 1 240px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <Search size={16} color="var(--text-dim, #94a3b8)" />
          <input
            type="text"
            placeholder="Search tournament name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main, #ffffff)',
              fontSize: '0.85rem',
              width: '100%'
            }}
          />
        </div>

        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['', 'Mumbai', 'Pune', 'Bengaluru', 'Delhi'].map((c) => (
            <button
              key={c || 'all-cities'}
              onClick={() => setCityFilter(c)}
              className={`tournament-filter-pill ${cityFilter === c ? 'active' : ''}`}
            >
              {c || 'All Cities'}
            </button>
          ))}
        </div>
      </div>

      {/* Tournaments Grid (Minimal Summary Cards) */}
      {loading && tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted, #94a3b8)' }}>
          Loading tournaments...
        </div>
      ) : tournaments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          color: 'var(--text-muted, #94a3b8)',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: 12,
          border: '1px dashed var(--border-color, rgba(255,255,255,0.12))',
          margin: '1.5rem 0'
        }}>
          <Trophy size={48} style={{ opacity: 0.35, marginBottom: '1rem', color: 'var(--accent-primary, #10b981)' }} />
          <h3 style={{ color: 'var(--text-heading, #ffffff)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>
            No Tournaments Found
          </h3>
          <p style={{ maxWidth: 440, margin: '0 auto 1.5rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
            {canCreateTournament
              ? 'No tournaments match your current filter, or none have been published yet. Launch a new tournament now!'
              : 'There are currently no tournaments matching your search or filters.'}
          </p>
          {canCreateTournament && (
            <button
              id="create-tournament-empty-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                borderRadius: 'var(--radius-sm, 8px)'
              }}
            >
              <PlusCircle size={18} />
              <span>+ Create Tournament</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
          gap: '1.25rem'
        }}>
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="tournament-card"
            >
              {/* Banner / Header */}
              <div style={{
                height: 120,
                position: 'relative',
                background: t.bannerUrl
                  ? `url(${t.bannerUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #065f46, #0f766e)'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)'
                }} />
                {/* Status Badges */}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {t.sport?.name || 'Sports'}
                  </span>
                  {t.liveMatchCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Radio size={10} />
                      {t.liveMatchCount} LIVE NOW
                    </span>
                  )}
                </div>

                {/* View Count Badge */}
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(4px)',
                    color: '#e2e8f0',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Eye size={11} color="#34d399" />
                    {(t.totalViews || t.total_views || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #ffffff)' }}>
                  {t.name}
                </h3>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="var(--accent-primary, #10b981)" />
                    <span>{t.city}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} color="var(--accent-secondary, #3b82f6)" />
                    <span>{new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} color="var(--accent-amber, #f59e0b)" />
                    <span>{t.registeredTeams} / {t.totalTeams} Teams Registered ({t.format})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Eye size={14} color="#10b981" />
                    <span>{(t.totalViews || t.total_views || 0).toLocaleString()} views</span>
                  </div>
                </div>

                {/* Card Action CTAs */}
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  gap: '0.5rem',
                  borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                  paddingTop: '0.85rem'
                }}>
                  <Link
                    to={`/tournaments/${t.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: 'var(--accent-primary, #10b981)',
                      color: '#fff',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    View League <ArrowRight size={14} />
                  </Link>

                  <Link
                    to={`/display/tournament/${t.id}`}
                    title="Open Signage Screen"
                    style={{
                      background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                      color: 'var(--text-secondary, #cbd5e1)',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    <Monitor size={15} />
                  </Link>

                  <Link
                    to={`/tv/${t.id}`}
                    target="_blank"
                    title="Launch Smart TV Mode"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(4, 120, 87, 0.3) 100%)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    <Tv size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Load More Button */}
      {feedPagination?.hasMore && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loading}
            style={{
              background: 'var(--bg-card, #1e293b)',
              color: 'var(--text-main, #fff)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
              padding: '0.7rem 2rem',
              borderRadius: 'var(--radius-sm, 8px)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {loading ? 'Loading more...' : 'Load More Tournaments'}
          </button>
        </div>
      )}

      {/* Create Tournament Modal Form */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTournamentCreated={() => {
          fetchTournaments(null, false);
        }}
      />
    </div>
  );
};

export default TournamentsPage;
