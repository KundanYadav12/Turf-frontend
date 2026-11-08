'use client';
import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Trophy, Award, Users, Table, EyeOff, ChevronRight, Star, AlertTriangle, RefreshCw } from 'lucide-react';
import { socket } from '../../services/socket';

/**
 * TV-Broadcast Quality Overlay Panel for Live Streams
 * Renders Group Standings / Points Table or Tournament Awards & Leaders over the video.
 * Positioned clear of corner logos and lower-third score strip.
 */
const StreamOverlayPanel = memo(function StreamOverlayPanel({
  activePanel = 'none', // 'none' | 'points' | 'awards'
  tournamentId = null,
  currentPlayingTeamNames = [], // e.g. ['A1', 'A4']
  panelTimer = 0,
  panelUpdatedAt = null,
  onClose = null,
  isBroadcaster = false,
  isFullscreen = false
}) {
  const [standingsData, setStandingsData] = useState(null);
  const [awardsData, setAwardsData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  const lastFetchTimeRef = useRef(0);
  const throttleTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Format team matching for highlight
  const isPlayingTeam = useCallback((teamName) => {
    if (!teamName || !currentPlayingTeamNames || currentPlayingTeamNames.length === 0) return false;
    const clean = String(teamName).trim().toLowerCase();
    return currentPlayingTeamNames.some(t => String(t || '').trim().toLowerCase() === clean);
  }, [currentPlayingTeamNames]);

  // Fetch Standings function
  const fetchStandings = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(prev => (standingsData ? false : true));
      const res = await axios.get(`/api/tournaments/${tournamentId}/standings`);
      if (res.data?.success) {
        setStandingsData(res.data.data);
        setFetchError(false);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.warn('[StreamOverlayPanel] Failed to fetch standings:', err.message);
      setFetchError(true);
      // Auto-retry every 5 seconds on error
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        fetchStandings();
      }, 5000);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, standingsData]);

  // Throttled Standings Refresh (throttled to at most 1 update per second)
  const throttledFetchStandings = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFetchTimeRef.current;
    if (elapsed >= 1000) {
      lastFetchTimeRef.current = now;
      fetchStandings();
    } else {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = setTimeout(() => {
        lastFetchTimeRef.current = Date.now();
        fetchStandings();
      }, 1000 - elapsed);
    }
  }, [fetchStandings]);

  // Initial and activePanel trigger for Standings
  useEffect(() => {
    if (activePanel !== 'points' || !tournamentId) return;
    fetchStandings();
  }, [activePanel, tournamentId, fetchStandings]);

  // Real-time socket subscription for instant points table synchronization
  useEffect(() => {
    if (activePanel !== 'points' || !tournamentId) return;

    const onUpdate = () => throttledFetchStandings();

    socket.on('tournament:standingsUpdated', onUpdate);
    socket.on('tournament:matchesUpdated', onUpdate);
    socket.on('match:completed', onUpdate);
    socket.on('match:undone', onUpdate);
    socket.on('score:updated', onUpdate);
    socket.on('match:pointScored', onUpdate);

    return () => {
      socket.off('tournament:standingsUpdated', onUpdate);
      socket.off('tournament:matchesUpdated', onUpdate);
      socket.off('match:completed', onUpdate);
      socket.off('match:undone', onUpdate);
      socket.off('score:updated', onUpdate);
      socket.off('match:pointScored', onUpdate);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [activePanel, tournamentId, throttledFetchStandings]);

  // Fetch Awards & Player Leaderboard
  useEffect(() => {
    if (activePanel !== 'awards' || !tournamentId) return;

    let isMounted = true;
    const fetchAwards = async () => {
      try {
        setLoading(true);
        const [awardsRes, lbRes] = await Promise.all([
          axios.get(`/api/tournaments/${tournamentId}/awards`).catch(() => ({ data: { success: false } })),
          axios.get(`/api/tournaments/${tournamentId}/player-leaderboard?limit=5`).catch(() => ({ data: { success: false } }))
        ]);

        if (isMounted) {
          if (awardsRes.data?.success) setAwardsData(awardsRes.data.data);
          if (lbRes.data?.success) {
            const raw = lbRes.data.data;
            const list = Array.isArray(raw)
              ? raw
              : (raw?.leaderboard || raw?.players || raw?.items || []);
            setLeaderboardData(Array.isArray(list) ? list : []);
          }
        }
      } catch (err) {
        console.warn('[StreamOverlayPanel] Failed to fetch awards:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAwards();
    return () => { isMounted = false; };
  }, [activePanel, tournamentId]);

  // Parse and normalize groups (handles both Object maps { "Group 1": [...] } and Array of groups)
  const groups = useMemo(() => {
    if (!standingsData) return [];
    const raw = standingsData.groups || standingsData.standings;
    if (!raw) return [];

    let list = [];
    if (Array.isArray(raw)) {
      if (raw.length > 0 && (raw[0].standings || raw[0].teams)) {
        list = raw.map((g, idx) => ({
          groupName: g.groupName || g.name || `Group ${idx + 1}`,
          standings: Array.isArray(g.standings) ? g.standings : (Array.isArray(g.teams) ? g.teams : [])
        }));
      } else {
        list = [{
          groupName: 'Overall Standings',
          standings: raw
        }];
      }
    } else if (typeof raw === 'object') {
      list = Object.entries(raw).map(([groupName, items]) => ({
        groupName: groupName || 'Group Standings',
        standings: Array.isArray(items) ? items : (Array.isArray(items?.standings) ? items.standings : (Array.isArray(items?.teams) ? items.teams : []))
      }));
    }

    // Step B Requirement: Show the match's group first, then cycle the other groups every 6 seconds!
    if (currentPlayingTeamNames && currentPlayingTeamNames.length > 0 && list.length > 1) {
      const matchGroupIdx = list.findIndex(g =>
        g.standings.some(row => isPlayingTeam(row.teamName || row.name || row.team?.name))
      );
      if (matchGroupIdx > 0) {
        const prioritized = [...list];
        const [matchGroup] = prioritized.splice(matchGroupIdx, 1);
        prioritized.unshift(matchGroup);
        return prioritized;
      }
    }

    return list;
  }, [standingsData, currentPlayingTeamNames, isPlayingTeam]);

  // Group rotation interval if multi-group tournament (cycles every 6 seconds)
  useEffect(() => {
    if (activePanel !== 'points' || groups.length <= 1) {
      setActiveGroupIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveGroupIndex((prev) => (prev + 1) % groups.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activePanel, groups.length]);

  if (!activePanel || activePanel === 'none') {
    return null;
  }

  const currentGroup = groups[activeGroupIndex] || groups[0] || null;
  const standingsRows = currentGroup?.standings || [];

  // Extract leading team safely from array or object
  const leadingTeam = Array.isArray(awardsData)
    ? (awardsData.find(a =>
        a.name?.toLowerCase().includes('leading') ||
        a.key === 'MOST_MATCH_WINS' ||
        a.recipientType === 'TEAM'
      ) || awardsData[0] || null)
    : (awardsData?.leadingTeam || awardsData?.tournamentLeadingTeam ||
       (Array.isArray(awardsData?.items) ? awardsData.items.find(a => a.key === 'LEADING_TEAM' || a.title?.toLowerCase().includes('leading')) : null));

  // Extract leaderboard list safely
  const rawLb = Array.isArray(leaderboardData)
    ? leaderboardData
    : (leaderboardData?.leaderboard || leaderboardData?.players || leaderboardData?.items || []);
  const safeLeaderboard = Array.isArray(rawLb) ? rawLb : [];

  return (
    <>
      <style>{`
        @keyframes streamPanelSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .stream-panel-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .stream-panel-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}</style>

      <div
        className="stream-panel-scroll"
        style={{
          position: 'absolute',
          top: isFullscreen ? 'clamp(68px, 12vh, 85px)' : 'clamp(55px, 11%, 70px)',
          left: isFullscreen ? 'clamp(12px, 2vw, 24px)' : 'clamp(10px, 2.5%, 20px)',
          zIndex: 26,
          width: isFullscreen ? 'clamp(280px, 42vw, 420px)' : 'clamp(280px, 42vw, 440px)',
          maxWidth: isFullscreen ? '45vw' : '90vw',
          maxHeight: isFullscreen ? 'min(60vh, calc(100% - 170px))' : 'calc(100% - 150px)',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '14px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          color: '#ffffff',
          padding: '10px 12px',
          pointerEvents: 'auto',
          animation: 'streamPanelSlideIn 0.25s ease-out forwards'
        }}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {activePanel === 'points' ? (
              <Table size={15} style={{ color: '#10b981', flexShrink: 0 }} />
            ) : (
              <Trophy size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activePanel === 'points' ? (currentGroup?.groupName || 'Points Table') : 'Awards & Leaders'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {groups.length > 1 && activePanel === 'points' && (
              <span style={{ fontSize: '0.66rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                {activeGroupIndex + 1}/{groups.length}
              </span>
            )}
            {isBroadcaster && onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Hide Panel"
              >
                <EyeOff size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && !standingsData && (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', color: '#94a3b8', fontSize: '0.78rem' }}>
            Updating live broadcast data...
          </div>
        )}

        {/* Standings Unavailable Error with Auto-retry */}
        {fetchError && !standingsData && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Standings unavailable • Retrying...
          </div>
        )}

        {/* ── POINTS TABLE MODE ── */}
        {!loading && activePanel === 'points' && (
          <div>
            {standingsRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                No completed matches yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                    <th style={{ textAlign: 'left', padding: '3px 4px', fontWeight: 800, width: '22px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '3px 6px', fontWeight: 800 }}>TEAM</th>
                    <th style={{ padding: '3px 4px', fontWeight: 800 }}>P</th>
                    <th style={{ padding: '3px 4px', fontWeight: 800 }}>W</th>
                    <th style={{ padding: '3px 4px', fontWeight: 800 }}>L</th>
                    <th style={{ padding: '3px 4px', fontWeight: 800 }}>DIFF</th>
                    <th style={{ padding: '3px 4px', fontWeight: 900, color: '#10b981' }}>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsRows.map((row, idx) => {
                    const teamName = row.teamName || row.name || row.team?.name || `Team ${idx + 1}`;
                    const isPlaying = isPlayingTeam(teamName);
                    const diff = row.diff !== undefined ? row.diff : (row.pointDifference || (row.pointsFor - row.pointsAgainst) || 0);
                    const pts = row.points !== undefined ? row.points : (row.won ? row.won * 2 : 0);

                    return (
                      <tr
                        key={row.teamId || idx}
                        style={{
                          background: isPlaying
                            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)'
                            : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'),
                          borderLeft: isPlaying ? '3px solid #10b981' : '3px solid transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          textAlign: 'center',
                          fontWeight: isPlaying ? 800 : 500
                        }}
                      >
                        <td style={{ textAlign: 'left', padding: '4px', color: isPlaying ? '#34d399' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {row.rank || idx + 1}
                        </td>
                        <td style={{ textAlign: 'left', padding: '4px 6px', color: isPlaying ? '#ffffff' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {teamName}
                            {isPlaying && (
                              <span style={{ fontSize: '0.6rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.25)', padding: '0 4px', borderRadius: '4px', fontWeight: 800 }}>
                                LIVE
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: '4px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                          {row.played || row.matchesPlayed || 0}
                        </td>
                        <td style={{ padding: '4px', color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                          {row.won || 0}
                        </td>
                        <td style={{ padding: '4px', color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                          {row.lost || 0}
                        </td>
                        <td style={{ padding: '4px', color: diff >= 0 ? '#38bdf8' : '#fb7185', fontVariantNumeric: 'tabular-nums' }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td style={{ padding: '4px', color: '#10b981', fontWeight: 900, fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
                          {pts}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── AWARDS & LEADERS MODE ── */}
        {!loading && activePanel === 'awards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Leading Team Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(180, 83, 9, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🏆 Tournament Leading Team
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', marginTop: '1px' }}>
                  {leadingTeam?.recipientName || leadingTeam?.teamName || leadingTeam?.name || leadingTeam?.winner || 'A1'}
                </div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fef08a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                {leadingTeam?.statValue || leadingTeam?.wins || leadingTeam?.record || 'Top Seed'}
              </div>
            </div>

            {/* Top 5 Player Scorers */}
            <div>
              <div style={{ fontSize: '0.66rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={12} color="#38bdf8" /> Top Player Scorers
              </div>

              {safeLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8', fontSize: '0.72rem' }}>
                  Leaderboard stats compiling...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {safeLeaderboard.slice(0, 5).map((player, pIdx) => {
                    const pName = player.playerName || player.name || player.user_name || `Player ${pIdx + 1}`;
                    const pTeam = player.teamName || player.team || '';
                    const pPoints = player.pointsScored !== undefined ? player.pointsScored : (player.points || player.totalPoints || player.score || 0);

                    return (
                      <div
                        key={pIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '0.72rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ color: pIdx === 0 ? '#facc15' : pIdx === 1 ? '#e2e8f0' : pIdx === 2 ? '#b45309' : '#94a3b8', fontWeight: 900, width: '14px', fontVariantNumeric: 'tabular-nums' }}>
                            {player.rank || pIdx + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                            {pName}
                          </span>
                          {pTeam && (
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '1px 4px', borderRadius: '4px' }}>
                              {pTeam}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 900, color: '#10b981', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                          {pPoints} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});

StreamOverlayPanel.displayName = 'StreamOverlayPanel';

export default StreamOverlayPanel;
