'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { socket } from '../../services/socket';
import {
  Trophy, Search, Filter, ChevronLeft, ChevronRight, X, ExternalLink,
  Award, Zap, CheckCircle2, AlertCircle, RefreshCw, User
} from 'lucide-react';
import { Link } from '../../lib/routerCompat';

/**
 * PlayerScoringLeaderboard Component
 * Renders the tournament-wide Player Scoring Leaderboard and Player History Drawer/Modal.
 */
export default function PlayerScoringLeaderboard({ tournamentId, refreshTrigger = 0 }) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [hasAttributedPoints, setHasAttributedPoints] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Player Scoring History Modal State
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async (isSilent = false) => {
    if (!tournamentId) return;
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedTeam && selectedTeam !== 'ALL') params.set('teamId', selectedTeam);
      params.set('page', page);
      params.set('limit', limit);

      const res = await axios.get(`/api/tournaments/${tournamentId}/player-leaderboard?${params.toString()}`);
      if (res.data?.success) {
        setLeaderboardData(res.data.data.leaderboard || []);
        setTeams(res.data.data.teams || []);
        setHasAttributedPoints(Boolean(res.data.data.hasAttributedPoints));
        setPagination(res.data.data.pagination || { page, limit, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch player leaderboard:', err);
      if (!isSilent) {
        setError(err?.response?.data?.message || 'Failed to load player scoring leaderboard.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [tournamentId, search, selectedTeam, page, limit]);

  // Initial and reactive load
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, refreshTrigger]);

  // Real-time socket sync
  useEffect(() => {
    if (!tournamentId) return;
    socket.emit('join:tournament', { tournamentId });

    const handleRealTimeUpdate = () => {
      fetchLeaderboard(true);
    };

    socket.on('match:pointScored', handleRealTimeUpdate);
    socket.on('pickleball:scoreUpdated', handleRealTimeUpdate);
    socket.on('match:badmintonPoint', handleRealTimeUpdate);
    socket.on('match:badmintonEvent', handleRealTimeUpdate);
    socket.on('match:undone', handleRealTimeUpdate);
    socket.on('score:updated', handleRealTimeUpdate);
    socket.on('tournament:matchUpdated', handleRealTimeUpdate);

    return () => {
      socket.off('match:pointScored', handleRealTimeUpdate);
      socket.off('pickleball:scoreUpdated', handleRealTimeUpdate);
      socket.off('match:badmintonPoint', handleRealTimeUpdate);
      socket.off('match:badmintonEvent', handleRealTimeUpdate);
      socket.off('match:undone', handleRealTimeUpdate);
      socket.off('score:updated', handleRealTimeUpdate);
      socket.off('tournament:matchUpdated', handleRealTimeUpdate);
      socket.emit('leave:tournament', { tournamentId });
    };
  }, [tournamentId, fetchLeaderboard]);

  // Fetch Player History when a player is clicked
  const handleOpenPlayerHistory = async (playerId) => {
    setSelectedPlayerId(playerId);
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryData(null);
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/players/${playerId}/scoring-history`);
      if (res.data?.success) {
        setHistoryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load player scoring history:', err);
      setHistoryError(err?.response?.data?.message || 'Failed to load player scoring history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setSelectedPlayerId(null);
    setHistoryData(null);
    setHistoryError('');
  };

  // Close history modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedPlayerId) {
        handleCloseHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayerId]);

  // Get player initials fallback
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ marginTop: '2.5rem' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            margin: '0 0 0.35rem 0',
            color: 'var(--text-heading)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trophy size={20} color="#10b981" />
            Player Scoring Leaderboard
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Official tournament leaderboard tracking individual points scored, match appearances, and team win records.
          </p>
        </div>

        {/* Quick Search and Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', width: '100%', maxWidth: '480px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search player name…"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '34px', padding: '0 0.65rem' }}
            title="Refresh Leaderboard"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          marginBottom: '1rem',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State: No player-level points exist yet */}
      {!loading && !hasAttributedPoints && !search && selectedTeam === 'ALL' && (
        <div className="glass-panel" style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          borderRadius: '16px',
          border: '1px dashed rgba(245, 158, 11, 0.4)',
          background: 'var(--bg-card)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <Zap size={24} color="#f59e0b" />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: 'var(--text-heading)' }}>
            No Player Points Tracked Yet
          </h4>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            maxWidth: '460px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            Enable <strong>&apos;Track points by player&apos;</strong> in the scorer to build this leaderboard. Points scored with player tracking enabled will immediately attribute to players here.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
          <div>Loading player leaderboard…</div>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && leaderboardData.length > 0 && (
        <div className="glass-panel" style={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.88rem'
            }}>
              <thead>
                <tr style={{
                  background: 'var(--table-header-bg, rgba(255, 255, 255, 0.03))',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '0.75rem 1rem', width: '60px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '0.75rem 1rem', width: '56px', textAlign: 'center' }}>Photo</th>
                  <th style={{ padding: '0.75rem 1rem', minWidth: '160px' }}>Player Name</th>
                  <th style={{ padding: '0.75rem 1rem', minWidth: '120px' }}>Team</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '80px' }}>Played</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '70px', color: '#10b981' }}>Won</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '70px', color: '#ef4444' }}>Lost</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '110px' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((player) => {
                  const isTop3 = player.rank <= 3 && player.pointsScored > 0;
                  const rankBadgeColor = player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#94a3b8' : player.rank === 3 ? '#d97706' : 'var(--text-muted)';
                  return (
                    <tr
                      key={player.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                      className="leaderboard-row"
                    >
                      {/* Rank */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          fontSize: '0.8rem',
                          background: isTop3 ? `${rankBadgeColor}22` : 'transparent',
                          color: rankBadgeColor,
                          border: isTop3 ? `1px solid ${rankBadgeColor}66` : 'none'
                        }}>
                          {player.rank}
                        </span>
                      </td>

                      {/* Photo / Avatar */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={player.name}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              margin: '0 auto',
                              display: 'block',
                              border: '1.5px solid var(--border-color)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #047857)',
                            color: '#fff',
                            display: player.photo ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            margin: '0 auto',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          {getInitials(player.name)}
                        </div>
                      </td>

                      {/* Player Name (Clickable link for scoring history) */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenPlayerHistory(player.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            color: 'var(--text-heading)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textDecoration: 'none'
                          }}
                          className="hover:underline"
                          title="Click to view player scoring history"
                        >
                          <span>{player.name}</span>
                          <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                        </button>
                      </td>

                      {/* Team */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'var(--tag-bg, rgba(255, 255, 255, 0.05))',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)'
                        }}>
                          {player.teamName}
                        </span>
                      </td>

                      {/* Matches Played */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {player.matchesPlayed}
                      </td>

                      {/* Matches Won */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                        {player.matchesWon}
                      </td>

                      {/* Matches Lost */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>
                        {player.matchesLost}
                      </td>

                      {/* Points Scored */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          background: player.pointsScored > 0 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: player.pointsScored > 0 ? '#10b981' : 'var(--text-muted)',
                          border: player.pointsScored > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                          fontWeight: 900,
                          fontSize: '1rem',
                          lineHeight: 1
                        }}>
                          {player.pointsScored}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} players
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem' }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, padding: '0 0.5rem', color: 'var(--text-heading)' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty Filter Results */}
      {!loading && leaderboardData.length === 0 && (search || selectedTeam !== 'ALL') && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
          <User size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
          <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-heading)' }}>No matching players found</h4>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Try adjusting your search query or selecting &apos;All Teams&apos;.
          </p>
        </div>
      )}

      {/* Counting Rules Caption */}
      <div style={{
        marginTop: '0.85rem',
        padding: '0.65rem 0.85rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5
      }}>
        ℹ️ <strong>Counting rules:</strong> <em>Points Scored</em> counts every non-voided attributed point from live and completed tournament matches. <em>Matches Played, Won, and Lost</em> count completed matches only, for players who were in that match&apos;s active lineup, where Won/Lost reflects the player&apos;s team match result.
      </div>

      {/* ============================================================== */}
      {/* PLAYER SCORING HISTORY MODAL / DRAWER                          */}
      {/* ============================================================== */}
      {selectedPlayerId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={handleCloseHistory}
        >
          <div
            style={{
              background: 'var(--bg-card, #111827)',
              borderRadius: '20px',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
              padding: '1.75rem',
              boxSizing: 'border-box',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={handleCloseHistory}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              aria-label="Close"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            {historyLoading && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                <div>Loading scoring history…</div>
              </div>
            )}

            {historyError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                fontSize: '0.88rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{historyError}</span>
              </div>
            )}

            {!historyLoading && historyData && (
              <div>
                {/* Player Profile Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                  {historyData.player?.photo ? (
                    <img
                      src={historyData.player.photo}
                      alt={historyData.player.name}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--accent-primary, #10b981)',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      flexShrink: 0
                    }}>
                      {getInitials(historyData.player?.name)}
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-heading)' }}>
                      {historyData.player?.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#10b981'
                      }}>
                        {historyData.player?.team}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat Counters Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.65rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Points</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                      {historyData.summary?.totalPoints || 0}
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Matches</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-heading)', marginTop: '0.2rem' }}>
                      {historyData.summary?.matchesPlayed || 0}
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Won</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                      {historyData.summary?.matchesWon || 0}
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Lost</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ef4444', marginTop: '0.2rem' }}>
                      {historyData.summary?.matchesLost || 0}
                    </div>
                  </div>
                </div>

                {/* Match-by-Match History List */}
                <h4 style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  margin: '0 0 0.75rem 0',
                  color: 'var(--text-heading)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <span>Scoring Match Log</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    ({historyData.history?.length || 0} matches)
                  </span>
                </h4>

                {(!historyData.history || historyData.history.length === 0) ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px'
                  }}>
                    No scoring history yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {historyData.history.map((item, idx) => (
                      <div
                        key={item.matchId || idx}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                                {item.matchName}
                              </span>
                              {item.category && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                                  {item.category}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {item.date ? new Date(item.date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Tournament fixture'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: item.result === 'WON' ? 'rgba(16, 185, 129, 0.15)' : item.result === 'LOST' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: item.result === 'WON' ? '#10b981' : item.result === 'LOST' ? '#ef4444' : '#38bdf8'
                            }}>
                              {item.result}
                            </span>
                            <Link
                              href={`/matches/${item.matchId}`}
                              style={{
                                color: 'var(--accent-primary, #10b981)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.78rem',
                                fontWeight: 700
                              }}
                              title="Open Match View"
                            >
                              <span>View</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>

                        {/* Points breakdown */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.4rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Breakdown:</span>
                            {item.gameBreakdown && item.gameBreakdown.length > 0 ? (
                              item.gameBreakdown.map((g, gIdx) => (
                                <span key={gIdx} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  G{g.game}: {g.points} pts{gIdx < item.gameBreakdown.length - 1 ? ' • ' : ''}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No game data</span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, color: '#10b981' }}>
                            +{item.playerPoints} Pts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
