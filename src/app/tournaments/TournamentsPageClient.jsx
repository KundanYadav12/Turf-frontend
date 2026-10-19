'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  setTournamentsLoading,
  setTournamentsFeed
} from '../../features/tournament/tournamentSlice';
import { Trophy, Calendar, MapPin, Users, Radio, Search, Monitor, ArrowRight, PlusCircle } from 'lucide-react';
import CreateTournamentModal from '../../components/tournament/CreateTournamentModal';

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

export default function TournamentsPageClient({ initialTournaments = [], initialPagination = {} }) {
  const dispatch = useDispatch();
  const { tournamentsById, allTournamentIds, feedPagination, loading } = useSelector((state) => state.tournament);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Redux store with initial server data
  useEffect(() => {
    if (initialTournaments.length > 0 && allTournamentIds.length === 0) {
      dispatch(setTournamentsFeed({
        items: initialTournaments,
        pagination: initialPagination,
        isAppend: false
      }));
    }
  }, [initialTournaments, initialPagination, allTournamentIds.length, dispatch]);

  const canCreateTournament = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'VENUE_OWNER');

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

  const handleLoadMore = () => {
    if (feedPagination?.nextCursor && !loading) {
      fetchTournaments(feedPagination.nextCursor, true);
    }
  };

  // Derive tournament list: prefer redux if loaded, fallback to initial SSR tournaments
  const tournaments = allTournamentIds.length > 0
    ? allTournamentIds.map((id) => tournamentsById[id]).filter(Boolean)
    : initialTournaments;

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
            Discover multi-city leagues, live simultaneous matches &amp; interactive digital signage.
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

          {isMounted && canCreateTournament && (
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
              Host Tournament
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '0 0.75rem', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search tournament title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTournaments(null, false)}
            style={{ width: '100%', padding: '0.65rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); }}
          className="form-input"
          style={{ width: 'auto', minWidth: '130px', margin: 0, padding: '0.65rem 0.75rem', fontSize: '0.85rem' }}
        >
          <option value="">All Cities</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Delhi NCR">Delhi NCR</option>
        </select>

        <select
          value={sportFilter}
          onChange={(e) => { setSportFilter(e.target.value); }}
          className="form-input"
          style={{ width: 'auto', minWidth: '130px', margin: 0, padding: '0.65rem 0.75rem', fontSize: '0.85rem' }}
        >
          <option value="">All Sports</option>
          <option value="cricket">Cricket</option>
          <option value="football">Football</option>
          <option value="badminton">Badminton</option>
        </select>

        <button
          onClick={() => fetchTournaments(null, false)}
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.1rem', fontSize: '0.85rem' }}
        >
          Filter
        </button>
      </div>

      {/* Tournaments Grid */}
      {tournaments.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
          <Trophy size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Tournaments Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            There are currently no tournaments matching your filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="glass-panel tournament-card"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                position: 'relative'
              }}
            >
              {/* Banner or Header Accent */}
              <div style={{
                height: '120px',
                background: t.bannerUrl
                  ? `url(${t.bannerUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                position: 'relative',
                padding: '0.85rem'
              }}>
                <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', display: 'flex', gap: '0.4rem' }}>
                  {t.isLive && (
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', animation: 'pulse 2s infinite' }}>
                      <Radio size={12} /> LIVE NOW
                    </span>
                  )}
                  <span className="badge badge-info">{t.sport?.name || 'Cricket'}</span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.65rem', color: 'var(--text-heading)' }}>
                  {t.name}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <MapPin size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span>{t.venue?.name || 'Multi-Venue League'}, {t.city || 'India'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span suppressHydrationWarning>{t.startDate ? formatTournamentDate(t.startDate) : 'Upcoming'} - {t.endDate ? formatTournamentDate(t.endDate) : 'TBD'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span>{(t.registeredTeamsCount ?? t.registeredTeams ?? t.teamsCount ?? 0)} Registered Teams</span>
                  </div>
                </div>

                {/* Footer Action Links */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <Link
                    href={`/tournaments/${t.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    View Fixtures <ArrowRight size={14} />
                  </Link>

                  <Link
                    href={`/display/tournament/${t.id}`}
                    target="_blank"
                    className="btn btn-outline btn-sm"
                    title="Launch Live Signage Scoreboard Display"
                    style={{ padding: '0.4rem 0.65rem' }}
                  >
                    <Monitor size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Load More */}
      {feedPagination?.hasMore && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}
          >
            {loading ? 'Loading More Leagues…' : 'Load More Tournaments'}
          </button>
        </div>
      )}

      {/* Create Tournament Modal */}
      {isCreateModalOpen && (
        <CreateTournamentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchTournaments(null, false);
          }}
          onTournamentCreated={() => {
            setIsCreateModalOpen(false);
            fetchTournaments(null, false);
          }}
        />
      )}
    </div>
  );
}
