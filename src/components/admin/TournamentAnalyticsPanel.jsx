'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  getTournamentAnalyticsOverviewApi,
  getTournamentAnalyticsDetailApi
} from '../../services/adminService';
import {
  Trophy, Eye, Users, Calendar, Clock, BarChart3, TrendingUp, TrendingDown,
  Filter, Search, RefreshCw, Smartphone, Globe, ChevronRight, X, ExternalLink,
  Crown, ArrowUpDown, ChevronLeft, ShieldCheck, Zap
} from 'lucide-react';

const formatTimestamp = (ts) => {
  if (!ts) return 'Never';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function TournamentAnalyticsPanel() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [sportSlug, setSportSlug] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState('ALL');
  const [platform, setPlatform] = useState('ALL');
  const [sortBy, setSortBy] = useState('views_desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Drilldown modal state
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPeriodDays, setDetailPeriodDays] = useState(30);

  // Fetch overview data
  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await getTournamentAnalyticsOverviewApi({
        search: search.trim() || undefined,
        sportSlug: sportSlug || undefined,
        status: status && status !== 'ALL' ? status : undefined,
        dateRange,
        platform: platform && platform !== 'ALL' ? platform : undefined,
        sortBy,
        page,
        limit
      });
      if (res.success) {
        setOverview(res.data);
      } else {
        setError(res.message || 'Failed to load tournament analytics');
      }
    } catch (err) {
      console.error('Failed to load tournament analytics overview:', err);
      setError('Error connecting to analytics service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, sportSlug, status, dateRange, platform, sortBy, page, limit]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Open detail drilldown modal
  const handleOpenDetail = async (tourneyId) => {
    setSelectedTournamentId(tourneyId);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await getTournamentAnalyticsDetailApi(tourneyId, {
        periodDays: detailPeriodDays
      });
      if (res.success) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch tournament detail analytics:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Re-fetch detail when period days change
  useEffect(() => {
    if (selectedTournamentId) {
      getTournamentAnalyticsDetailApi(selectedTournamentId, { periodDays: detailPeriodDays })
        .then((res) => {
          if (res.success) setDetailData(res.data);
        })
        .catch(console.error);
    }
  }, [selectedTournamentId, detailPeriodDays]);

  const handleResetFilters = () => {
    setSearch('');
    setSportSlug('');
    setStatus('');
    setDateRange('ALL');
    setPlatform('ALL');
    setSortBy('views_desc');
    setPage(1);
    setLimit(10);
  };

  const summary = overview?.summary || {
    totalViews: 0,
    totalUniqueViewers: 0,
    totalTournamentsTracked: 0,
    viewsToday: 0,
    views7Days: 0,
    views30Days: 0,
    platformBreakdown: { web: 0, mobile: 0 }
  };

  const tournaments = overview?.tournaments || [];
  const pagination = overview?.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  return (
    <div>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            margin: '0 0 0.35rem 0',
            color: 'var(--text-heading, #ffffff)'
          }}>
            <Eye color="var(--accent-primary, #10b981)" size={24} />
            Tournament Views &amp; Viewer Analytics
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem' }}>
            Comprehensive view tracking, deduplicated viewer counts, and Superadmin performance rankings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing || loading}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--btn-secondary-bg, rgba(255,255,255,0.06))',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
              color: 'var(--text-main, #ffffff)',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid (6 cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Total Views */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.2))',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Views
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={15} color="#34d399" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.totalViews.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Across all tournaments
          </div>
        </div>

        {/* Card 2: Unique Viewers */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(76, 29, 149, 0.2))',
          border: '1px solid rgba(139, 92, 246, 0.35)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Unique Viewers
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="#a78bfa" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.totalUniqueViewers.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Identified distinct viewers
          </div>
        </div>

        {/* Card 3: Tracked Tournaments */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(120, 53, 15, 0.2))',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tracked Leagues
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={15} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.totalTournamentsTracked.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            With view activity recorded
          </div>
        </div>

        {/* Card 4: Views Today */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Views Today
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.viewsToday.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Since midnight UTC
          </div>
        </div>

        {/* Card 5: Views Last 7 Days */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Last 7 Days
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(129, 140, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.views7Days.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Rolling 7-day total
          </div>
        </div>

        {/* Card 6: Views Last 30 Days */}
        <div className="glass-panel" style={{
          padding: '1.15rem',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Last 30 Days
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={15} color="#ec4899" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
            {summary.views30Days.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Rolling 30-day total
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel" style={{
        padding: '1.1rem',
        borderRadius: '14px',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.85rem',
        alignItems: 'center'
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
          borderRadius: '8px',
          padding: '0.55rem 0.85rem',
          flex: '1 1 230px'
        }}>
          <Search size={16} color="var(--text-muted, #94a3b8)" />
          <input
            type="text"
            placeholder="Search tournament name, ID, or creator..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              width: '100%'
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sport Dropdown */}
        <select
          value={sportSlug}
          onChange={(e) => { setSportSlug(e.target.value); setPage(1); }}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        >
          <option value="">All Sports</option>
          <option value="cricket">Cricket</option>
          <option value="football">Football</option>
          <option value="pickleball">Pickleball</option>
          <option value="badminton">Badminton</option>
        </select>

        {/* Status Dropdown */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ONGOING">ONGOING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="DRAFT">DRAFT</option>
        </select>

        {/* Date Range Selector */}
        <select
          value={dateRange}
          onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        >
          <option value="ALL">All-Time Views</option>
          <option value="TODAY">Views Today</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="LAST_30_DAYS">Last 30 Days</option>
        </select>

        {/* Platform Selector */}
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        >
          <option value="ALL">All Platforms</option>
          <option value="WEB">🌐 Web Only</option>
          <option value="MOBILE">📱 Mobile Only</option>
        </select>

        {/* Sort By Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowUpDown size={14} color="var(--text-muted, #94a3b8)" />
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0.55rem 2.5rem 0.55rem 0.85rem',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          >
            <option value="views_desc">Views (High → Low)</option>
            <option value="views_asc">Views (Low → High)</option>
            <option value="unique_desc">Unique Viewers (High → Low)</option>
            <option value="recent_desc">Recently Viewed</option>
            <option value="created_desc">Creation Date (Newest)</option>
          </select>
        </div>

        {/* Reset button */}
        {(search || sportSlug || status || dateRange !== 'ALL' || platform !== 'ALL' || sortBy !== 'views_desc') && (
          <button
            onClick={handleResetFilters}
            className="btn btn-sm btn-outline"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.8rem',
              borderRadius: '8px',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.4)'
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Highest-Viewed Tournament Ranking Table */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        borderRadius: '14px',
        marginBottom: '1.5rem',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏆 Tournament Performance Rankings</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>
              {pagination.totalCount} Tournaments
            </span>
          </h3>

          {/* Rows per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            <span>Show:</span>
            {[10, 25, 50].map((num) => (
              <button
                key={num}
                onClick={() => { setLimit(num); setPage(1); }}
                style={{
                  background: limit === num ? 'var(--accent-primary, #10b981)' : 'rgba(255,255,255,0.06)',
                  color: limit === num ? '#022c22' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted, #94a3b8)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', display: 'block', color: 'var(--accent-primary, #10b981)' }} />
            Loading tournament analytics ranking…
          </div>
        ) : tournaments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted, #94a3b8)' }}>
            <Trophy size={42} style={{ opacity: 0.3, marginBottom: '0.75rem', color: '#10b981' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>No Tournaments Found</div>
            <div style={{ fontSize: '0.85rem', maxWidth: 400, margin: '0 auto 1.25rem' }}>
              No tournaments match the selected filters. Try resetting the filters to view all tournaments.
            </div>
            <button
              onClick={handleResetFilters}
              className="btn btn-sm btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.12))', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '55px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Tournament Name</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Tournament ID</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Organizer / Creator</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Sport</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Total Views</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Unique Viewers</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Today</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>7 Days</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>30 Days</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Last Viewed</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => {
                  const isTopRanked = t.rank === 1 && t.totalViews > 0;
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                        background: isTopRanked ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        transition: 'background 0.2s ease'
                      }}
                      className="tournament-rank-row"
                    >
                      {/* 1. Rank */}
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                        {isTopRanked ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                          }}>
                            👑
                          </div>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            width: 26,
                            height: 26,
                            lineHeight: '26px',
                            borderRadius: '50%',
                            background: t.rank <= 3 ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: t.rank <= 3 ? '#ffffff' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.82rem'
                          }}>
                            #{t.rank}
                          </span>
                        )}
                      </td>

                      {/* 2. Tournament Name */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem' }}>
                            {t.name}
                          </span>
                          {isTopRanked && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid rgba(245, 158, 11, 0.5)',
                              color: '#fbbf24',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              <Crown size={10} /> #1 Most Viewed
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                          {t.city} • {t.format}
                        </div>
                      </td>

                      {/* 3. Tournament ID */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <code style={{
                          fontSize: '0.74rem',
                          background: 'rgba(0,0,0,0.4)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          color: '#38bdf8',
                          letterSpacing: '0.02em'
                        }}>
                          {t.uuid ? `${t.uuid.slice(0, 8)}…` : `#${t.id}`}
                        </code>
                      </td>

                      {/* 4. Organizer */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>
                          {t.organizer?.name || 'Admin'}
                        </div>
                        {t.organizer?.email && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {t.organizer.email}
                          </div>
                        )}
                      </td>

                      {/* 5. Sport */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 700,
                          fontSize: '0.74rem'
                        }}>
                          {t.sport?.name || 'Sports'}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: t.status === 'ONGOING' ? 'rgba(239, 68, 68, 0.2)' :
                                      t.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)',
                          color: t.status === 'ONGOING' ? '#f87171' :
                                 t.status === 'PUBLISHED' ? '#34d399' : '#cbd5e1'
                        }}>
                          {t.status}
                        </span>
                      </td>

                      {/* 7. Total Views */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: isTopRanked ? '#34d399' : '#ffffff', fontSize: '0.95rem' }}>
                          {t.totalViews.toLocaleString()}
                        </span>
                      </td>

                      {/* 8. Unique Viewers */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.9rem' }}>
                          {t.uniqueViewers.toLocaleString()}
                        </span>
                      </td>

                      {/* 9. Views Today */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: t.viewsToday > 0 ? '#38bdf8' : '#64748b', fontWeight: t.viewsToday > 0 ? 700 : 500 }}>
                          {t.viewsToday.toLocaleString()}
                        </span>
                      </td>

                      {/* 10. Views 7 Days */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: t.views7Days > 0 ? '#818cf8' : '#64748b' }}>
                          {t.views7Days.toLocaleString()}
                        </span>
                      </td>

                      {/* 11. Views 30 Days */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: t.views30Days > 0 ? '#ec4899' : '#64748b' }}>
                          {t.views30Days.toLocaleString()}
                        </span>
                      </td>

                      {/* 12. Last Viewed */}
                      <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {formatTimestamp(t.lastViewedAt)}
                      </td>

                      {/* 13. Actions */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenDetail(t.uuid || t.id)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title="Open detailed views drilldown and trend chart"
                        >
                          <span>Insights</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            marginTop: '0.75rem',
            borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#94a3b8'
          }}>
            <div>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalCount} total tournaments)
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1 || loading}
                className="btn btn-sm btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="btn btn-sm btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tournament Analytics Detail Drilldown Modal */}
      {selectedTournamentId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399'
                  }}>
                    {detailData?.tournament?.sport?.name || 'Tournament'}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#cbd5e1'
                  }}>
                    {detailData?.tournament?.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {detailData?.tournament?.name || 'Tournament View Analytics'}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                  Organizer: <strong>{detailData?.tournament?.organizer?.name || 'Super Admin'}</strong> ({detailData?.tournament?.organizer?.email})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {detailData?.tournament?.uuid && (
                  <a
                    href={`/tournaments/${detailData.tournament.uuid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}
                  >
                    <span>Public Page</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedTournamentId(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {detailLoading || !detailData ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem auto', display: 'block', color: '#10b981' }} />
                  Loading in-depth tournament view metrics…
                </div>
              ) : (
                <>
                  {/* KPI Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.85rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Total Views</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                        {detailData.metrics.totalViews.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Unique Viewers</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', marginTop: '2px' }}>
                        {detailData.metrics.uniqueViewers.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Period Comparison</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                          {detailData.metrics.comparison.currentPeriodViews} vs {detailData.metrics.comparison.previousPeriodViews}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: detailData.metrics.comparison.isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: detailData.metrics.comparison.isPositive ? '#34d399' : '#f87171',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {detailData.metrics.comparison.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {detailData.metrics.comparison.percentageChange}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                        vs previous {detailPeriodDays} days
                      </div>
                    </div>
                  </div>

                  {/* Platform Split Bar */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        Platform Breakdown
                      </span>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                        <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={13} /> Web: <strong>{detailData.metrics.platformBreakdown.web}</strong> ({detailData.metrics.platformBreakdown.webPercentage}%)
                        </span>
                        <span style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Smartphone size={13} /> Mobile: <strong>{detailData.metrics.platformBreakdown.mobile}</strong> ({detailData.metrics.platformBreakdown.mobilePercentage}%)
                        </span>
                      </div>
                    </div>
                    {/* Visual progress bar */}
                    <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${detailData.metrics.platformBreakdown.webPercentage}%`, background: '#38bdf8' }} />
                      <div style={{ width: `${detailData.metrics.platformBreakdown.mobilePercentage}%`, background: '#a78bfa' }} />
                    </div>
                  </div>

                  {/* Daily Views Bar Chart */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                          Daily Views Time Series
                        </h4>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                          Daily view activity &amp; unique audience trend
                        </div>
                      </div>

                      {/* Period Switcher */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {[7, 14, 30].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDetailPeriodDays(d)}
                            style={{
                              background: detailPeriodDays === d ? 'var(--accent-primary, #10b981)' : 'rgba(255,255,255,0.06)',
                              color: detailPeriodDays === d ? '#022c22' : '#cbd5e1',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {d} Days
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chart visualization */}
                    {detailData.timeSeries.every(pt => pt.views === 0) ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                        No view events recorded in the last {detailPeriodDays} days.
                      </div>
                    ) : (
                      <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '1.5rem', position: 'relative' }}>
                        {(() => {
                          const maxViews = Math.max(...detailData.timeSeries.map(p => p.views), 1);
                          return detailData.timeSeries.map((pt, idx) => {
                            const heightPct = Math.max((pt.views / maxViews) * 100, pt.views > 0 ? 8 : 2);
                            return (
                              <div
                                key={idx}
                                title={`${pt.date}: ${pt.views} views (${pt.uniqueViewers} unique)`}
                                style={{
                                  flex: 1,
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'flex-end',
                                  alignItems: 'center',
                                  position: 'relative'
                                }}
                              >
                                {pt.views > 0 && (
                                  <div style={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 700, marginBottom: '2px' }}>
                                    {pt.views}
                                  </div>
                                )}
                                <div
                                  style={{
                                    width: '100%',
                                    maxWidth: '22px',
                                    height: `${heightPct}%`,
                                    background: pt.views > 0 ? 'linear-gradient(to top, #059669, #34d399)' : 'rgba(255,255,255,0.06)',
                                    borderRadius: '3px 3px 0 0',
                                    transition: 'height 0.3s ease'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '-18px',
                                  fontSize: '0.58rem',
                                  color: '#64748b',
                                  whiteSpace: 'nowrap',
                                  transform: 'rotate(-45deg)',
                                  transformOrigin: 'top left'
                                }}>
                                  {idx % Math.ceil(detailPeriodDays / 10) === 0 ? pt.displayDate : ''}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity Stream */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '1.25rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      Recent View Activity (Latest 25 Events)
                    </h4>
                    {detailData.recentEvents.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>No recent events logged yet.</div>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {detailData.recentEvents.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: ev.platform === 'MOBILE' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: ev.platform === 'MOBILE' ? '#a78bfa' : '#38bdf8',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }}>
                                {ev.platform}
                              </span>
                              <span style={{ color: '#e2e8f0' }}>{ev.viewerTag}</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.74rem' }}>
                              {formatTimestamp(ev.viewedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
