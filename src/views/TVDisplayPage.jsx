'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { socket } from '../services/socket';
import LiveBallCelebrationOverlay from '../components/signage/LiveBallCelebrationOverlay';
import SignageAdSlot from '../components/signage/SignageAdSlot';
import CourtView, { getServeState, getCourtState, parseRacquetScoreDetails } from '../components/court/CourtView';
import BadmintonCourt from '../components/court/BadmintonCourt';
import {
  Radio, Maximize2, Minimize2, Trophy, Clock,
  Calendar, Table, Award, Play, Pause, RefreshCw,
  Sun, Moon, Shield, Tv, Sparkles, ChevronRight,
  AlertCircle, Users, Activity, Flame, Target
} from 'lucide-react';

/**
 * Team Logo or Fallback Monogram Avatar
 */
function TeamLogoAvatar({ logoUrl, teamName = 'Team', size = 52, theme = 'dark' }) {
  const [imgError, setImgError] = useState(!logoUrl);

  useEffect(() => {
    setImgError(!logoUrl);
  }, [logoUrl]);

  const getInitials = (name) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getTeamGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Emerald
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
      'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', // Red
      'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', // Cyan
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
      'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'  // Indigo
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  const isNumeric = typeof size === 'number';
  const sizeValue = isNumeric ? `${size}px` : size;
  const borderRadius = isNumeric ? Math.round(size * 0.22) : '12px';

  return (
    <div
      style={{
        width: sizeValue,
        height: sizeValue,
        minWidth: sizeValue,
        minHeight: sizeValue,
        borderRadius: borderRadius,
        background: !imgError && logoUrl
          ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
          : getTeamGradient(teamName),
        border: theme === 'dark' ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid rgba(0, 0, 0, 0.12)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: !imgError && logoUrl ? (isNumeric ? Math.max(3, Math.round(size * 0.08)) : '4px') : 0,
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {!imgError && logoUrl ? (
        <img
          src={logoUrl}
          alt={teamName}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        />
      ) : (
        <span
          style={{
            fontWeight: 900,
            fontSize: isNumeric ? Math.max(12, Math.round(size * 0.38)) : 'clamp(0.85rem, 1.2vw, 1.5rem)',
            color: '#ffffff',
            letterSpacing: '0.5px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          {getInitials(teamName)}
        </span>
      )}
    </div>
  );
}


export default function TVDisplayPage({ displayId = 'tv_arena_main_01' }) {
  // Core Display State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({
    layoutType: 'AUTO',
    matchCount: 4,
    featuredMatchId: null,
    showCompletedMatches: false,
    rotationEnabled: true,
    rotationInterval: 15,
    activeScenes: ['SCOREBOARD', 'FIXTURES', 'STANDINGS', 'LEADERBOARD', 'SPONSORS', 'RESULTS'],
    adTopEnabled: true,
    adBottomEnabled: true,
    adSidebarsEnabled: true,
    adCenterEnabled: false,
    theme: 'dark',
    animationSpeed: 'normal'
  });

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ title: 'Top Tournament Performers', items: [] });
  const [ads, setAds] = useState({ topAds: [], bottomAds: [], leftAds: [], rightAds: [], centerAds: [] });
  const [playbackState, setPlaybackState] = useState({
    adsEnabled: true,
    topAdMode: 'STATIC',
    bottomAdMode: 'MOTION',
    bottomAdPaused: false,
    sidebarAdsEnabled: true,
    leftSidebarPaused: false,
    rightSidebarPaused: false,
    zoneSettings: { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 },
    venueZoneSettings: {}
  });

  // Theme & Clock
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(socket.connected);
  }, []);

  // Scene Rotation State
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isRotationPaused, setIsRotationPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Live Celebration Overlay
  const [celebration, setCelebration] = useState(null);

  // 1. Digital Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Authoritative Snapshot from Backend
  const fetchDisplaySnapshot = useCallback(async () => {
    try {
      const res = await axios.get(`/api/tv/display/${displayId}`);
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        if (d.config) {
          setConfig(prev => ({ ...prev, ...d.config }));
          if (d.config.theme) setTheme(d.config.theme);
        }
        if (d.tournament) {
          setTournament(d.tournament);
          if (d.tournament.uuid || d.tournament.id) {
            socket.emit('join:tournament', { tournamentId: d.tournament.uuid || d.tournament.id });
          }
        }
        if (d.matches) {
          setMatches(d.matches);
          d.matches.forEach(m => {
            const mid = m.uuid || m.id || m.matchId;
            if (mid) socket.emit('join:match', { matchId: mid });
          });
        }
        if (d.fixtures) setFixtures(d.fixtures);
        if (d.standings) setStandings(d.standings);
        if (d.results) setResults(d.results);
        if (d.leaderboard) setLeaderboard(d.leaderboard);
        if (d.ads) {
          setAds(d.ads);
          if (d.ads.state) {
            setPlaybackState(prev => ({
              ...prev,
              ...d.ads.state,
              zoneSettings: d.ads.zoneSettings || d.ads.state.zoneSettings || prev.zoneSettings,
              venueZoneSettings: d.ads.venueZoneSettings || d.ads.state.venueZoneSettings || prev.venueZoneSettings
            }));
          } else if (d.ads.zoneSettings) {
            setPlaybackState(prev => ({ ...prev, zoneSettings: d.ads.zoneSettings }));
          }
        }
        setError(null);
      }
    } catch (err) {
      console.warn('TV Display fetch error:', err);
      setError('Connecting to stadium TV broadcast feed...');
    } finally {
      setLoading(false);
    }
  }, [displayId]);

  useEffect(() => {
    setLoading(true);
    fetchDisplaySnapshot();
  }, [fetchDisplaySnapshot]);

  // 3. Socket.IO Real-Time Subscriptions
  useEffect(() => {
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      fetchDisplaySnapshot();
    };
    const onDisconnect = () => setIsConnected(false);

    // Live score match updates (supports cricket, football, pickleball, badminton, etc.)
    const onMatchUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.matchId || payload.id;
      const targetNum = payload.matchNumber;

      setMatches(prev => prev.map(m => {
        if ((targetId && (m.id === targetId || m.matchId === targetId || m.uuid === targetId)) || (targetNum && m.matchNumber === targetNum)) {
          // Monotonic sequence check: ignore stale or out-of-order events
          if (payload.eventSeq && m._eventSeq && payload.eventSeq < m._eventSeq) {
            return m;
          }
          return {
            ...m,
            _eventSeq: payload.eventSeq || Date.now(),
            _lastEventType: payload.type || null,
            status: payload.status || m.status,
            courtColor: payload.courtColor || m.courtColor,
            score: {
              ...m.score,
              summary: payload.scoreSummary || payload.liveScoreSummary || payload.summary || m.score?.summary,
              subtext: payload.subtext || payload.liveSubtext || m.score?.subtext,
              details: payload.details || payload.state || m.score?.details
            }
          };
        }
        return m;
      }));

      // Trigger Celebration Animation if 4, 6, WICKET, GOAL, or MATCH_POINT
      // IMPORTANT: Clear celebration immediately on UNDO; do not celebrate undos
      if (payload.type === 'UNDO') {
        setCelebration(null);
      } else {
        const rawEvent = payload.celebration || payload.event || payload.type;
        if (rawEvent) {
          const ev = String(rawEvent).toUpperCase();
          if (['4', 'FOUR', '6', 'SIX', 'WICKET', 'W', 'GOAL', 'MATCH_POINT'].includes(ev)) {
            setCelebration({
              type: ev.includes('4') ? 'FOUR' : ev.includes('6') ? 'SIX' : ev.includes('W') ? 'WICKET' : ev.includes('GOAL') ? 'GOAL' : 'FOUR',
              matchNumber: payload.matchNumber || targetNum || 1,
              timestamp: Date.now()
            });
            setTimeout(() => setCelebration(null), 3500);
          }
        }
      }
    };

    // Live remote TV Configuration updates (Owner changes layout, rotation, ads from dashboard)
    const onConfigUpdate = (data) => {
      if (data?.config) {
        setConfig(prev => ({ ...prev, ...data.config }));
        if (data.config.theme) setTheme(data.config.theme);
      }
    };

    // Live Advertisement and Real-time Playback State updates
    const onPlaybackUpdate = (data) => {
      if (data?.playbackState) {
        setPlaybackState(prev => ({
          ...prev,
          ...data.playbackState,
          zoneSettings: data.playbackState.zoneSettings || prev.zoneSettings,
          venueZoneSettings: data.playbackState.venueZoneSettings || prev.venueZoneSettings
        }));
      }
      fetchDisplaySnapshot();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('signage:matchUpdate', onMatchUpdate);
    socket.on('signage:emitMatchUpdate', onMatchUpdate);
    socket.on('tournament:matchUpdated', onMatchUpdate);
    socket.on('match:pickleballScore', onMatchUpdate);
    socket.on('match:badmintonEvent', onMatchUpdate);
    socket.on('match:ballEvent', onMatchUpdate);
    socket.on('signage:tvConfigUpdated', onConfigUpdate);
    socket.on('signage:playbackUpdated', onPlaybackUpdate);
    socket.on('signage:adUpdated', onPlaybackUpdate);
    socket.on('signage:adAdded', onPlaybackUpdate);
    socket.on('signage:adRemoved', onPlaybackUpdate);
    socket.on('signage:adPaused', (d) => setPlaybackState(prev => ({ ...prev, bottomAdPaused: true, ...(d?.playbackState || {}) })));
    socket.on('signage:adResumed', (d) => setPlaybackState(prev => ({ ...prev, bottomAdPaused: false, ...(d?.playbackState || {}) })));
    socket.on('signage:adsDisabled', (d) => setPlaybackState(prev => ({ ...prev, adsEnabled: false, ...(d?.playbackState || {}) })));
    socket.on('signage:adsEnabled', (d) => setPlaybackState(prev => ({ ...prev, adsEnabled: true, ...(d?.playbackState || {}) })));
    socket.on('tournament:matchDisplayUpdated', fetchDisplaySnapshot);
    socket.on('display:matchesUpdated', fetchDisplaySnapshot);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('signage:matchUpdate', onMatchUpdate);
      socket.off('signage:emitMatchUpdate', onMatchUpdate);
      socket.off('tournament:matchUpdated', onMatchUpdate);
      socket.off('match:pickleballScore', onMatchUpdate);
      socket.off('match:badmintonEvent', onMatchUpdate);
      socket.off('match:ballEvent', onMatchUpdate);
      socket.off('signage:tvConfigUpdated', onConfigUpdate);
      socket.off('signage:playbackUpdated', onPlaybackUpdate);
      socket.off('signage:adUpdated', onPlaybackUpdate);
      socket.off('signage:adAdded', onPlaybackUpdate);
      socket.off('signage:adRemoved', onPlaybackUpdate);
      socket.off('signage:adPaused');
      socket.off('signage:adResumed');
      socket.off('signage:adsDisabled');
      socket.off('signage:adsEnabled');
      socket.off('tournament:matchDisplayUpdated', fetchDisplaySnapshot);
      socket.off('display:matchesUpdated', fetchDisplaySnapshot);
    };
  }, [fetchDisplaySnapshot]);

  // 4. Scene Rotation Engine
  const activeScenes = config.activeScenes || ['SCOREBOARD', 'FIXTURES', 'STANDINGS', 'LEADERBOARD', 'SPONSORS', 'RESULTS'];

  useEffect(() => {
    if (!config.rotationEnabled || isRotationPaused || activeScenes.length <= 1) return;

    const intervalMs = Math.max((config.rotationInterval || 15) * 1000, 5000);
    const rotationTimer = setInterval(() => {
      setCurrentSceneIndex(prev => (prev + 1) % activeScenes.length);
    }, intervalMs);

    return () => clearInterval(rotationTimer);
  }, [config.rotationEnabled, config.rotationInterval, isRotationPaused, activeScenes.length]);

  // 5. Smart TV Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 'f' -> Toggle Fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      // ' ' (Spacebar) -> Toggle Rotation Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRotationPaused(prev => !prev);
      }
      // 'ArrowRight' -> Next Scene
      if (e.key === 'ArrowRight') {
        setCurrentSceneIndex(prev => (prev + 1) % activeScenes.length);
      }
      // 'ArrowLeft' -> Prev Scene
      if (e.key === 'ArrowLeft') {
        setCurrentSceneIndex(prev => (prev - 1 + activeScenes.length) % activeScenes.length);
      }
      // 't' -> Toggle Theme
      if (e.key === 't' || e.key === 'T') {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
      }
      // 'r' -> Force snapshot refresh
      if (e.key === 'r' || e.key === 'R') {
        fetchDisplaySnapshot();
      }
      // Show controls on any interaction
      revealControls();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScenes.length, fetchDisplaySnapshot]);

  // 6. Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // 7. Auto-Hiding Controls for Clean TV Viewing
  const revealControls = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  };

  const handleMouseMove = () => revealControls();

  const currentScene = activeScenes[currentSceneIndex] || 'SCOREBOARD';

  // Dynamic Zone Dimension & Auto-Collapse Resolution
  const venueId = tournament?.venue_id || tournament?.venueId || config?.venue_id || config?.venueId || null;
  const activeZoneSettings = useMemo(() => {
    const defaults = { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 };
    const globalZones = { ...defaults, ...(playbackState?.zoneSettings || {}) };
    if (venueId && playbackState?.venueZoneSettings?.[String(venueId)]) {
      return { ...globalZones, ...playbackState.venueZoneSettings[String(venueId)] };
    }
    return globalZones;
  }, [playbackState, venueId]);

  // Helper to resolve dimension between live zone slider and ad-specific custom setting
  const resolveZoneDimension = (zoneVal, defaultVal, adVal) => {
    if (zoneVal && Number(zoneVal) !== defaultVal) {
      return typeof zoneVal === 'number' ? `${zoneVal}px` : zoneVal;
    }
    if (adVal && adVal !== 'auto' && adVal !== '100%') {
      if (typeof adVal === 'number' || String(adVal).match(/^\d+$/)) {
        return `${adVal}px`;
      }
      return String(adVal);
    }
    const finalVal = zoneVal || defaultVal;
    return typeof finalVal === 'number' ? `${finalVal}px` : finalVal;
  };

  // Top Banner
  const isTopAdActive = Boolean(
    config.adTopEnabled !== false &&
    playbackState.adsEnabled !== false &&
    ads.topAds &&
    ads.topAds.length > 0
  );
  const activeTopAd = ads.topAds?.[0];
  const resolvedTopHeight = isTopAdActive
    ? resolveZoneDimension(activeZoneSettings?.topHeight, 120, activeTopAd?.height)
    : '0px';

  // Sidebars
  const isSidebarEnabled = Boolean(
    config.adSidebarsEnabled !== false &&
    playbackState.adsEnabled !== false &&
    playbackState.sidebarAdsEnabled !== false
  );
  const isLeftAdActive = isSidebarEnabled && ads.leftAds && ads.leftAds.length > 0;
  const activeLeftAd = ads.leftAds?.[0];
  const resolvedLeftWidth = isLeftAdActive
    ? resolveZoneDimension(activeZoneSettings?.leftWidth, 220, activeLeftAd?.width)
    : '0px';

  const isRightAdActive = isSidebarEnabled && ads.rightAds && ads.rightAds.length > 0;
  const activeRightAd = ads.rightAds?.[0];
  const resolvedRightWidth = isRightAdActive
    ? resolveZoneDimension(activeZoneSettings?.rightWidth, 220, activeRightAd?.width)
    : '0px';

  // Bottom Ticker
  const isBottomAdActive = Boolean(
    config.adBottomEnabled !== false &&
    playbackState.adsEnabled !== false &&
    ads.bottomAds &&
    ads.bottomAds.length > 0
  );
  const activeBottomAd = ads.bottomAds?.[0];
  const resolvedBottomHeight = isBottomAdActive
    ? resolveZoneDimension(activeZoneSettings?.bottomHeight, 70, activeBottomAd?.height)
    : '0px';

  // Determine Effective Match Layout and Slices
  let displayMatches = [...matches];
  if (config.featuredMatchId) {
    const featIdx = displayMatches.findIndex(m => m.id === config.featuredMatchId || m.matchNumber === config.featuredMatchId);
    if (featIdx > 0) {
      const [feat] = displayMatches.splice(featIdx, 1);
      displayMatches.unshift(feat);
    }
  }
  displayMatches = displayMatches.slice(0, config.matchCount || 4);
  const layout = config.layoutType || 'AUTO';

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: theme === 'dark' ? '#090d16' : '#f8fafc',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* ── TOP ADVERTISEMENT BANNER (Full-width, pushes content down, collapses to 0 when inactive) ── */}
      {isTopAdActive && (
        <div style={{
          height: resolvedTopHeight,
          width: '100%',
          flexShrink: 0,
          background: 'rgba(10, 15, 26, 0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          transition: 'height 0.25s ease'
        }}>
          <SignageAdSlot placement="TOP" ads={ads.topAds} isPaused={false} style={{ height: '100%', marginBottom: 0 }} />
        </div>
      )}

      {/* ── TV HEADER BAR ── */}
      <header
        style={{
          height: 'clamp(44px, 5.2vh, 54px)',
          padding: '0 clamp(0.85rem, 1.8vw, 1.5rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          zIndex: 20,
          flexShrink: 0
        }}
      >
        {/* Left: Tournament Branding */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          minWidth: 0,
          flexShrink: 0,
          maxWidth: '32%',
          overflow: 'hidden'
        }}>
          <div
            style={{
              width: 'clamp(32px, 3.2vw, 42px)',
              height: 'clamp(32px, 3.2vw, 42px)',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Trophy size={20} />
          </div>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1
              style={{
                fontSize: 'clamp(0.95rem, 1.5vw, 1.4rem)',
                fontWeight: 900,
                margin: 0,
                color: theme === 'dark' ? '#fff' : '#0f172a',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {tournament?.name || 'Live Sports Arena TV'}
            </h1>
            <div style={{
              fontSize: 'clamp(0.68rem, 0.82vw, 0.8rem)',
              color: theme === 'dark' ? '#94a3b8' : '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {tournament?.city || 'Sports Arena'} • Smart TV Broadcast Display
            </div>
          </div>
        </div>

        {/* Center: Active Scene Indicator Pills */}
        {activeScenes.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            opacity: controlsVisible ? 1 : 0.6,
            transition: 'opacity 0.3s',
            flexShrink: 1,
            minWidth: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {activeScenes.map((scene, idx) => (
              <button
                key={scene}
                onClick={() => setCurrentSceneIndex(idx)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentSceneIndex === idx
                    ? '#10b981'
                    : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: currentSceneIndex === idx
                    ? '#fff'
                    : theme === 'dark' ? '#94a3b8' : '#64748b'
                }}
              >
                {scene}
              </button>
            ))}
          </div>
        )}

        {/* Right: Status Pill, Clock & Smart TV Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {/* LIVE Pill */}
          <div
            suppressHydrationWarning
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isConnected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isConnected ? '#ef4444' : '#f59e0b'}`,
              color: isConnected ? '#ef4444' : '#f59e0b',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 'clamp(0.68rem, 0.85vw, 0.76rem)',
              fontWeight: 900,
              letterSpacing: '0.5px'
            }}
          >
            <span
              suppressHydrationWarning
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isConnected ? '#ef4444' : '#f59e0b',
                display: 'inline-block'
              }}
              className={isConnected ? 'animate-pulse' : ''}
            />
            {isConnected ? 'LIVE FEED' : 'RECONNECTING'}
          </div>

          {/* Clock */}
          <div
            suppressHydrationWarning
            style={{
              fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)',
              fontWeight: 800,
              color: '#10b981',
              fontVariantNumeric: 'tabular-nums',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              padding: '3px 9px',
              borderRadius: 8
            }}
          >
            {currentTime}
          </div>

          {/* Controls Bar (Fades out for clean TV experience) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: controlsVisible ? 1 : 0.2,
              transition: 'opacity 0.4s'
            }}
          >
            {/* Play/Pause Rotation */}
            {config.rotationEnabled && (
              <button
                onClick={() => setIsRotationPaused(!isRotationPaused)}
                title={isRotationPaused ? 'Resume Scene Rotation (Space)' : 'Pause Scene Rotation (Space)'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: isRotationPaused ? '#f59e0b' : '#10b981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isRotationPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchDisplaySnapshot}
              title="Refresh Data (R)"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: theme === 'dark' ? '#fff' : '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={15} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme (T)"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: theme === 'dark' ? '#fff' : '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Smart TV Fullscreen (F)"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #10b981',
                background: '#10b981',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE AREA WITH DYNAMIC SIDEBAR ADS & AUTO-EXPANDING GRID ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Left Sidebar Ad (collapses to 0 width when inactive/hidden, giving space back to grid) */}
        {isLeftAdActive && (
          <aside style={{
            width: resolvedLeftWidth,
            height: '100%',
            flexShrink: 0,
            background: 'rgba(10, 15, 26, 0.98)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '0.35rem',
            transition: 'width 0.25s ease'
          }}>
            <SignageAdSlot placement="LEFT" ads={ads.leftAds} isPaused={playbackState.leftSidebarPaused} />
          </aside>
        )}

        {/* Center Canvas: Active Scene Rendering */}
        <main
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 'clamp(0.4rem, 0.75vw, 0.75rem)',
            overflow: 'hidden',
            minWidth: 0,
            position: 'relative'
          }}
        >
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#94a3b8' }}>
              <Radio size={48} className="animate-pulse" color="#10b981" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Connecting to Arena Smart TV Feed...</h2>
            </div>
          ) : currentScene === 'SCOREBOARD' ? (
            /* ── SCENE 1: LIVE SCOREBOARD (MULTI-MATCH LAYOUT ENGINE) ── */
            <ScoreboardScene
              matches={displayMatches}
              layoutType={layout}
              theme={theme}
              centerAdEnabled={config.adCenterEnabled}
              centerAds={ads.centerAds || []}
            />
          ) : currentScene === 'FIXTURES' ? (
            /* ── SCENE 2: UPCOMING FIXTURES & SCHEDULE ── */
            <FixturesScene fixtures={fixtures} theme={theme} />
          ) : currentScene === 'STANDINGS' ? (
            /* ── SCENE 3: TOURNAMENT STANDINGS & POINTS TABLE ── */
            <StandingsScene standings={standings} theme={theme} />
          ) : currentScene === 'LEADERBOARD' ? (
            /* ── SCENE 4: TOP PLAYER STATISTICS & AWARDS ── */
            <LeaderboardScene leaderboard={leaderboard} theme={theme} />
          ) : currentScene === 'SPONSORS' ? (
            /* ── SCENE 5: SPONSORS & PROMOTIONS ── */
            <SponsorsScene ads={ads} theme={theme} />
          ) : (
            /* ── SCENE 6: RECENT RESULTS ── */
            <ResultsScene results={results} theme={theme} />
          )}

          {/* Celebration Animation Trigger */}
          {celebration && (
            <LiveBallCelebrationOverlay
              event={celebration.type}
              matchNumber={celebration.matchNumber}
            />
          )}
        </main>

        {/* Right Sidebar Ad (collapses to 0 width when inactive/hidden, giving space back to grid) */}
        {isRightAdActive && (
          <aside style={{
            width: resolvedRightWidth,
            height: '100%',
            flexShrink: 0,
            background: 'rgba(10, 15, 26, 0.98)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '0.35rem',
            transition: 'width 0.25s ease'
          }}>
            <SignageAdSlot placement="RIGHT" ads={ads.rightAds} isPaused={playbackState.rightSidebarPaused} />
          </aside>
        )}
      </div>

      {/* ── BOTTOM MOVING TICKER STRIP (Scales to set height, collapses when inactive) ── */}
      {isBottomAdActive && (
        <div style={{
          height: resolvedBottomHeight,
          width: '100%',
          flexShrink: 0,
          background: 'rgba(10, 15, 26, 0.98)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          transition: 'height 0.25s ease'
        }}>
          <SignageAdSlot placement="BOTTOM" ads={ads.bottomAds} isPaused={playbackState.bottomAdPaused} style={{ marginTop: 0, height: '100%', minHeight: 0, borderRadius: 0, border: 'none' }} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 1: LIVE MULTI-MATCH SCOREBOARD LAYOUT ENGINE
   Supports: 1_HERO, 2_SPLIT, 3_BALANCED, 4_GRID, 6_GRID, 8_GRID
   ══════════════════════════════════════════════════════════════════════ */
function ScoreboardScene({ matches, layoutType, theme, centerAdEnabled, centerAds }) {
  const count = matches.length;

  if (count === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: theme === 'dark' ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)',
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <Radio size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 900, margin: 0 }}>
          No matches selected for display
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.5rem', maxWidth: 500 }}>
          No matches are currently selected for Smart TV display. Organizers can select matches in the Live Matches tab.
        </p>
      </div>
    );
  }

  // 1 Match -> Full-Screen Stadium Hero
  if (layoutType === '1_HERO' || (layoutType === 'AUTO' && count === 1)) {
    return <TVMatchCardHero match={matches[0]} theme={theme} />;
  }

  // 2 Matches -> Equal 50-50 Split (stretches full height)
  if (layoutType === '2_SPLIT' || (layoutType === 'AUTO' && count === 2)) {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: '1fr', gap: 'clamp(0.6rem, 1.2vw, 1.2rem)' }}>
        {matches.slice(0, 2).map(m => (
          <TVMatchCardGrid key={m.id} match={m} theme={theme} size="large" />
        ))}
      </div>
    );
  }

  // 3 Matches -> 3 Equal Columns or 1 Hero + 2 Stacked
  if (layoutType === '3_BALANCED') {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: '1.35fr 1fr', gridTemplateRows: '1fr', gap: 'clamp(0.55rem, 1.1vw, 1.1rem)' }}>
        <TVMatchCardGrid match={matches[0]} theme={theme} size="large" isFeatured />
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(0.55rem, 1.1vw, 1rem)', height: '100%', minHeight: 0 }}>
          <TVMatchCardGrid match={matches[1]} theme={theme} size="medium" />
          <TVMatchCardGrid match={matches[2]} theme={theme} size="medium" />
        </div>
      </div>
    );
  }
  if (layoutType === 'AUTO' && count === 3) {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gridTemplateRows: '1fr', gap: 'clamp(0.5rem, 1vw, 1rem)' }}>
        {matches.slice(0, 3).map(m => (
          <TVMatchCardGrid key={m.id} match={m} theme={theme} size="medium" />
        ))}
      </div>
    );
  }

  // 4 Matches -> 2x2 Balanced Grid (stretches full height)
  if (layoutType === '4_GRID' || (layoutType === 'AUTO' && count === 4)) {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(0.45rem, 0.8vw, 0.85rem)' }}>
        <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(0.5rem, 0.9vw, 0.95rem)' }}>
          {matches.slice(0, 4).map(m => (
            <TVMatchCardGrid key={m.id} match={m} theme={theme} size="medium" />
          ))}
        </div>
        {centerAdEnabled && centerAds && centerAds.length > 0 && (
          <div style={{ height: 42, background: 'rgba(15, 23, 42, 0.9)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <SignageAdSlot placement="CENTER" ads={centerAds} isPaused={false} />
          </div>
        )}
      </div>
    );
  }

  // 5–6 Matches -> 3 Columns x 2 Rows (stretches full height)
  if (layoutType === '6_GRID' || (layoutType === 'AUTO' && (count === 5 || count === 6))) {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(0.4rem, 0.75vw, 0.8rem)' }}>
        {matches.slice(0, 6).map(m => (
          <TVMatchCardGrid key={m.id} match={m} theme={theme} size="compact" />
        ))}
      </div>
    );
  }

  // 7–8 Matches -> 4 Columns x 2 Rows (stretches full height)
  if (layoutType === '8_GRID' || (layoutType === 'AUTO' && (count === 7 || count === 8))) {
    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(0.35rem, 0.65vw, 0.7rem)' }}>
        {matches.slice(0, 8).map(m => (
          <TVMatchCardGrid key={m.id} match={m} theme={theme} size="mini" />
        ))}
      </div>
    );
  }

  // 9+ Matches -> Auto-adjusted grid
  const cols = count > 10 ? 5 : 4;
  const rows = Math.ceil(Math.min(count, 12) / cols);
  return (
    <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, gap: 'clamp(0.35rem, 0.6vw, 0.65rem)' }}>
      {matches.slice(0, cols * rows).map(m => (
        <TVMatchCardGrid key={m.id} match={m} theme={theme} size="mini" />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HERO MATCH SCORECARD (1-Match Full Stadium Display)
   Dispatches to Cricket, Football, or Racquet sports based on sportSlug
   ══════════════════════════════════════════════════════════════════════ */
function TVMatchCardHero({ match, theme }) {
  const sportSlug = match.sportSlug || (match.score?.summary?.includes('/') ? 'cricket' : 'football');

  if (sportSlug === 'football') {
    return <TVMatchCardHeroFootball match={match} theme={theme} />;
  }

  if (['badminton', 'pickleball', 'tennis', 'table-tennis'].includes(sportSlug)) {
    return <TVMatchCardHeroRacquet match={match} theme={theme} />;
  }

  return <TVMatchCardHeroCricket match={match} theme={theme} />;
}

/* ── Cricket Hero Layout ── */
function TVMatchCardHeroCricket({ match, theme }) {
  const state = match.score?.details || {};
  const striker = state.striker;
  const nonStriker = state.nonStriker;
  const bowler = state.bowler;
  const currentOverBalls = state.currentOverBalls || [];

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: 'clamp(1rem, 2vw, 2rem)',
        background: theme === 'dark' ? 'rgba(30, 41, 59, 0.55)' : '#ffffff',
        borderRadius: 20,
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        padding: 'clamp(1.25rem, 2.5vw, 2.25rem)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}
    >
      {/* Left: Giant Teams & Score */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem' }}>
            <span>🏏 CRICKET</span> • <span>{match.courtName || 'Main Pitch'}</span> • <span>Match #{match.matchNumber}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
              <TeamLogoAvatar logoUrl={match.teamA?.logo} teamName={match.teamA?.name} size={54} theme={theme} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.5rem)', fontWeight: 900, color: theme === 'dark' ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {match.teamA?.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>Innings 1</div>
              </div>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#94a3b8' }}>VS</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.5rem)', fontWeight: 900, color: theme === 'dark' ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {match.teamB?.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>Innings 2</div>
              </div>
              <TeamLogoAvatar logoUrl={match.teamB?.logo} teamName={match.teamB?.name} size={54} theme={theme} />
            </div>
          </div>
        </div>

        {/* Primary Giant Score Display */}
        <div
          style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
            padding: 'clamp(1.25rem, 2.5vw, 2.25rem)',
            borderRadius: 16,
            textAlign: 'center',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(3.5rem, 6.5vw, 6.2rem)',
              fontWeight: 950,
              color: '#10b981',
              lineHeight: 1,
              letterSpacing: '-2px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {match.score?.summary || '0/0'}
          </div>
          {match.score?.subtext && (
            <div style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.4rem)', fontWeight: 700, color: '#f59e0b', marginTop: '0.65rem' }}>
              {match.score.subtext}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Batters, Bowler, and Ball Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', justifyContent: 'space-between' }}>
        {/* Batters */}
        <div style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', padding: '1.1rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Current Batters
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: theme === 'dark' ? '#fff' : '#0f172a' }}>
              🏏 {striker?.name || 'Active Batter'} *
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
              {striker?.runs ?? 0} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>({striker?.balls ?? 0}b)</span>
            </span>
          </div>
          {nonStriker && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              <span>{nonStriker?.name || 'Non-Striker'}</span>
              <span>{nonStriker?.runs ?? 0} ({nonStriker?.balls ?? 0}b)</span>
            </div>
          )}
        </div>

        {/* Bowler */}
        <div style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', padding: '1.1rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Current Bowler
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: theme === 'dark' ? '#fff' : '#0f172a' }}>
              🎯 {bowler?.name || 'Active Bowler'}
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#94a3b8' }}>
              {bowler?.wickets ?? 0}/{bowler?.runsConceded ?? 0} <span style={{ fontSize: '0.82rem' }}>({bowler?.overs ?? '0.0'} ov)</span>
            </span>
          </div>
        </div>

        {/* This Over Chips */}
        <div style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', padding: '1.1rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
            This Over
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {currentOverBalls.length > 0 ? (
              currentOverBalls.map((b, i) => (
                <span
                  key={i}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    background: b === '4' ? '#10b981' : b === '6' ? '#8b5cf6' : b === 'W' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                    color: '#fff'
                  }}
                >
                  {b}
                </span>
              ))
            ) : (
              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>Over in progress...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Football Hero Layout ── */
function TVMatchCardHeroFootball({ match, theme }) {
  const state = match.score?.details || {};
  const matchClock = state.matchClock || state.minute || '74\'';
  const period = state.period || (match.status === 'LIVE' ? '2ND HALF' : match.status);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: theme === 'dark' ? 'rgba(30, 41, 59, 0.55)' : '#ffffff',
        borderRadius: 20,
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        padding: 'clamp(1.5rem, 3vw, 2.5rem)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
      }}
    >
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '4px 14px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 800 }}>
          <span>⚽ FOOTBALL</span> • <span>{match.courtName || 'Stadium Arena'}</span> • <span>Match #{match.matchNumber}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 900 }}>
          <Clock size={15} /> {matchClock} • {period}
        </div>
      </div>

      {/* Main Pitch Scoreboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem', margin: '2rem 0' }}>
        {/* Team A */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <TeamLogoAvatar logoUrl={match.teamA?.logo} teamName={match.teamA?.name} size={90} theme={theme} />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)', fontWeight: 950, margin: '1rem 0 0.25rem', color: theme === 'dark' ? '#fff' : '#0f172a' }}>
            {match.teamA?.name}
          </h2>
          <span style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 700 }}>HOME</span>
        </div>

        {/* Center Huge Score */}
        <div
          style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
            padding: '1.5rem 3rem',
            borderRadius: 20,
            border: theme === 'dark' ? '2px solid rgba(255,255,255,0.08)' : '2px solid rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(4rem, 8vw, 7.5rem)',
              fontWeight: 950,
              color: '#10b981',
              lineHeight: 1,
              letterSpacing: '-2px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {match.score?.summary || '0 - 0'}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.75rem' }}>
            {match.score?.subtext || 'Live Stadium Broadcast'}
          </div>
        </div>

        {/* Team B */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <TeamLogoAvatar logoUrl={match.teamB?.logo} teamName={match.teamB?.name} size={90} theme={theme} />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)', fontWeight: 950, margin: '1rem 0 0.25rem', color: theme === 'dark' ? '#fff' : '#0f172a' }}>
            {match.teamB?.name}
          </h2>
          <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 700 }}>AWAY</span>
        </div>
      </div>

      {/* Footer Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
        <span>Venue: {match.venueName || 'Turf Arena'}</span>
        <span>Status: {match.status === 'LIVE' ? '🔴 Match in Progress' : match.status}</span>
      </div>
    </div>
  );
}

/* ── Racquet Sports Hero Layout (Badminton, Pickleball, Tennis) ── */
function TVMatchCardHeroRacquet({ match, theme }) {
  const courtState = getCourtState(match);
  const serveState = courtState.serveState || getServeState(match);
  const {
    sport: sportSlug,
    mainScoreText,
    gamesWonText,
    servingTeam,
    isTeamAServing,
    serverBox: serverCourt,
    serverNumber,
    servingTeamName,
    servingStatusText,
    isGamePoint,
    isMatchPoint
  } = courtState;

  const sportLabel = sportSlug === 'badminton' ? '🏸 BADMINTON' : '🎾 PICKLEBALL';

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: theme === 'dark' ? 'rgba(30, 41, 59, 0.55)' : '#ffffff',
        borderRadius: 20,
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        padding: 'clamp(1rem, 1.8vw, 1.8rem)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}
    >
      {/* Top Banner Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '0.4rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 14px', borderRadius: 20, fontSize: '0.88rem', fontWeight: 800 }}>
          <span>{sportLabel}</span> • <span>{match.courtName || 'Court 1'}</span> • <span>Match #{match.matchNumber}</span>
        </div>
        <div style={{ background: match.status === 'LIVE' ? '#10b981' : '#64748b', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 900, boxShadow: match.status === 'LIVE' ? '0 0 14px rgba(16, 185, 129, 0.45)' : 'none' }}>
          {match.status === 'LIVE' ? '🔴 LIVE ON DISPLAY' : match.status}
        </div>
      </div>

      {/* Symmetrical 3-Column Header Strip with Non-Wrapping Live Score */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 'clamp(0.5rem, 2vw, 2rem)',
        flexShrink: 0,
        padding: '0.2rem 0',
        marginBottom: '0.4rem'
      }}>
        {/* Team A */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
          <TeamLogoAvatar logoUrl={match.teamA?.logo} teamName={match.teamA?.name} size={64} theme={theme} />
          <h2 style={{
            fontSize: 'clamp(1.15rem, 2vw, 1.85rem)',
            fontWeight: 950,
            margin: '0.35rem 0 0.15rem',
            color: theme === 'dark' ? '#fff' : '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>
            {match.teamA?.name}
          </h2>
          {isTeamAServing ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 10px',
              borderRadius: 20,
              background: '#10b981',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
              marginTop: '0.15rem'
            }}>
              🏸 SERVE
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 10px',
              borderRadius: 20,
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              color: theme === 'dark' ? '#94a3b8' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginTop: '0.15rem'
            }}>
              RECEIVING
            </span>
          )}
        </div>

        {/* Center Live Game Score & Sets Won Pill */}
        <div
          style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
            padding: 'clamp(0.5rem, 1vw, 0.9rem) clamp(1rem, 2vw, 2.2rem)',
            borderRadius: 18,
            border: theme === 'dark' ? '2px solid rgba(255,255,255,0.08)' : '2px solid rgba(0,0,0,0.08)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 'clamp(140px, 18vw, 220px)'
          }}
        >
          {/* Main Game Score (Stays strictly on one line, never wraps) */}
          <div
            style={{
              fontSize: 'clamp(2.4rem, 4.8vw, 4.2rem)',
              fontWeight: 950,
              color: '#10b981',
              lineHeight: 1,
              letterSpacing: '-1px',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap'
            }}
          >
            {mainScoreText}
          </div>

          {/* Sets / Games Won Pill (Clean separate row) */}
          {gamesWonText && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: 'clamp(0.7rem, 0.95vw, 0.85rem)',
                fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.14)',
                border: '1px solid rgba(245, 158, 11, 0.28)',
                padding: '2px 10px',
                borderRadius: 20,
                marginTop: '0.35rem',
                whiteSpace: 'nowrap'
              }}
            >
              {gamesWonText}
            </div>
          )}
        </div>

        {/* Team B */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
          <TeamLogoAvatar logoUrl={match.teamB?.logo} teamName={match.teamB?.name} size={64} theme={theme} />
          <h2 style={{
            fontSize: 'clamp(1.15rem, 2vw, 1.85rem)',
            fontWeight: 950,
            margin: '0.35rem 0 0.15rem',
            color: theme === 'dark' ? '#fff' : '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>
            {match.teamB?.name}
          </h2>
          {!isTeamAServing ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 10px',
              borderRadius: 20,
              background: '#10b981',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
              marginTop: '0.15rem'
            }}>
              🏸 SERVE
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 10px',
              borderRadius: 20,
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              color: theme === 'dark' ? '#94a3b8' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginTop: '0.15rem'
            }}>
              RECEIVING
            </span>
          )}
        </div>
      </div>

      {/* Main Animated Court Visual Filling Center Area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.2rem 0',
        width: '100%'
      }}>
        <CourtView
          match={match}
          serveState={serveState}
          courtColor={match.courtColor || '#0d5c3a'}
          courtAds={match.courtAds}
          theme={theme}
          ambientRally={true}
        />
      </div>

      {/* Serving Status & Venue Details Strip Under Court */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        paddingTop: '0.6rem',
        color: theme === 'dark' ? '#94a3b8' : '#475569',
        fontSize: 'clamp(0.75rem, 0.95vw, 0.9rem)',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <span style={{ color: '#10b981', fontWeight: 800 }}>
          {serveState?.label || servingStatusText}
        </span>
        <span>Court: {match.courtName || 'Court 1'} • Format: Best of 3 Games</span>
      </div>
    </div>
  );
}

/* ── Racquet Sports Grid Card Layout ── */
function TVMatchCardGridRacquet({ match, theme, size = 'medium', isFeatured = false }) {
  const courtState = getCourtState(match);
  const serveState = courtState?.serveState || getServeState(match);
  const parsed = parseRacquetScoreDetails(match);
  const {
    sportSlug,
    mainScoreText,
    gamesWonText,
    serverCourt,
    serverNumber,
    servingTeamName,
    isGamePoint,
    isMatchPoint
  } = parsed;

  const showCourt = size !== 'mini' && size !== 'compact';

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        background: isFeatured
          ? (theme === 'dark' ? 'linear-gradient(165deg, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.98) 100%)' : '#ffffff')
          : (theme === 'dark' ? 'linear-gradient(165deg, rgba(26, 36, 56, 0.94) 0%, rgba(12, 17, 28, 0.98) 100%)' : '#ffffff'),
        borderRadius: 14,
        border: isFeatured ? '2px solid #10b981' : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0,0,0,0.1)'),
        padding: size === 'mini' ? 'clamp(0.45rem, 0.8vw, 0.65rem)' : '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isFeatured ? '0 12px 32px rgba(16, 185, 129, 0.25)' : '0 8px 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.35rem', borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: 4 }}>
            {sportSlug === 'badminton' ? '🏸 BADMINTON' : '🎾 PICKLEBALL'} • {match.courtName || 'Court'}
          </span>
          <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>M#{match.matchNumber}</span>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: match.status === 'LIVE' ? '#10b981' : (theme === 'dark' ? '#94a3b8' : '#64748b') }}>
          {match.status === 'LIVE' ? '🔴 LIVE' : match.status}
        </div>
      </div>

      {/* Teams Lineup & Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem', margin: '0.4rem 0' }}>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: size === 'mini' ? '0.88rem' : '1.05rem', color: theme === 'dark' ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.teamA?.name}
          </div>
          {serveState.isTeamAServing && (
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
              SERVE
            </span>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: size === 'mini' ? '1.4rem' : '1.8rem', fontWeight: 950, color: '#10b981', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {mainScoreText}
          </div>
          {gamesWonText && (
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', marginTop: 2, whiteSpace: 'nowrap' }}>
              {gamesWonText}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: size === 'mini' ? '0.88rem' : '1.05rem', color: theme === 'dark' ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.teamB?.name}
          </div>
          {!serveState.isTeamAServing && (
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
              SERVE
            </span>
          )}
        </div>
      </div>

      {/* Compact Animated Court if medium/large */}
      {showCourt && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.2rem 0', maxHeight: '160px', overflow: 'hidden' }}>
          <CourtView
            match={match}
            serveState={serveState}
            courtColor={match.courtColor || '#0d5c3a'}
            compact={true}
            theme={theme}
            ambientRally={true}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', paddingTop: '0.3rem', fontSize: '0.72rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
        <span>Serving: <strong style={{ color: '#10b981' }}>{serveState.serverTeamName || servingTeamName}</strong></span>
        <span>{match.venueName || 'Turf Arena'}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   GRID MATCH CARD (Symmetrical Multi-Match Display)
   Supports size: 'large', 'medium', 'compact', 'mini'
   Optimized for 16:9 Smart TV full-screen stadium viewing distance
   ══════════════════════════════════════════════════════════════════════ */
function TVMatchCardGrid({ match, theme, size = 'medium', isFeatured = false }) {
  const sportSlug = match.sportSlug || 'cricket';

  // Court-based sports dispatch to racquet layout
  if (['badminton', 'pickleball', 'tennis', 'table-tennis'].includes(sportSlug.toLowerCase())) {
    return <TVMatchCardGridRacquet match={match} theme={theme} size={size} isFeatured={isFeatured} />;
  }
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';
  const isScheduled = !isLive && !isCompleted;

  // Responsive Logo Size (prominent for Smart TV distance viewing)
  const logoSize = size === 'mini' ? 'clamp(46px, 3.8vw, 72px)' : size === 'compact' ? 'clamp(56px, 4.8vw, 86px)' : size === 'medium' ? 'clamp(68px, 5.8vw, 106px)' : 'clamp(84px, 7vw, 130px)';

  // Extract deep scoring details if available
  const state = match.score?.details || {};
  const crr = state.crr;
  const target = state.target;
  const rrr = state.rrr;
  const striker = state.striker;
  const nonStriker = state.nonStriker;
  const bowler = state.bowler;
  const currentOverBalls = state.currentOverBalls || [];

  // Parse cricket score and overs cleanly
  const parseScore = (summary) => {
    if (!summary || summary === '0/0' || summary === 'Yet to Start' || summary === 'Upcoming') {
      if (isLive) {
        return { main: '0 / 0', overs: '1st Innings • In Play', isDefault: true };
      }
      return { main: 'YET TO START', overs: null, isDefault: true };
    }
    const matchOv = summary.match(/^(.*?)\s*\((.*?)\)$/);
    if (matchOv) {
      return {
        main: matchOv[1].trim(),
        overs: matchOv[2].toLowerCase().includes('ov') ? matchOv[2].trim() : `${matchOv[2].trim()} ov`,
        isDefault: false
      };
    }
    return { main: summary, overs: null, isDefault: false };
  };

  const { main: scoreMain, overs: scoreOvers, isDefault: scoreIsDefault } = parseScore(match.score?.summary);

  // Clean subtext - eliminate any "undefined Batting" or undefined strings
  const getCleanSubtext = () => {
    const raw = match.score?.subtext;
    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      if (isLive) {
        const battingName = state.battingTeamName || (match.teamA?.name ? `${match.teamA.name} Batting` : 'Live In Play');
        return battingName;
      }
      return '';
    }
    if (raw.toLowerCase().includes('undefined')) {
      const battingName = state.battingTeamName;
      if (battingName) return `${battingName} Batting`;
      if (match.teamA?.name && isLive) return `${match.teamA.name} Batting`;
      return isLive ? 'Batting in Progress' : '';
    }
    return raw.trim();
  };

  const subtext = getCleanSubtext();

  // Determine winner for completed matches
  const subLower = (subtext || '').toLowerCase();
  const teamAName = match.teamA?.name || 'Team 1';
  const teamBName = match.teamB?.name || 'Team 2';
  const isWinnerA = isCompleted && (
    match.winnerTeamId === match.teamA?.id ||
    subLower.includes(teamAName.toLowerCase()) ||
    subLower.includes('team 1 won') ||
    subLower.includes('team a won')
  );
  const isWinnerB = isCompleted && !isWinnerA && (
    match.winnerTeamId === match.teamB?.id ||
    subLower.includes(teamBName.toLowerCase()) ||
    subLower.includes('team 2 won') ||
    subLower.includes('team b won')
  );

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        background: isFeatured
          ? (theme === 'dark' ? 'linear-gradient(165deg, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.98) 100%)' : '#ffffff')
          : (theme === 'dark'
              ? 'linear-gradient(165deg, rgba(26, 36, 56, 0.94) 0%, rgba(12, 17, 28, 0.98) 100%)'
              : '#ffffff'),
        borderRadius: 14,
        border: isFeatured
          ? '2px solid #10b981'
          : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0,0,0,0.1)'),
        padding: size === 'mini' ? 'clamp(0.45rem, 0.8vw, 0.65rem)' : size === 'compact' ? '0.75rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isFeatured
          ? '0 12px 32px rgba(16, 185, 129, 0.25), 0 4px 16px rgba(0,0,0,0.5)'
          : '0 8px 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Header Tag & Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: size === 'mini' ? '0.25rem' : '0.4rem',
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        flexShrink: 0,
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
          <span
            title={match.courtName || 'Court'}
            style={{
              fontSize: size === 'mini' ? 'clamp(0.72rem, 0.85vw, 0.82rem)' : '0.82rem',
              fontWeight: 800,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            🏏 {match.courtName || 'Court'} • M#{match.matchNumber}
          </span>
          <span
            style={{
              fontSize: size === 'mini' ? '0.66rem' : '0.72rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 6,
              background: match.category === 'Final'
                ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(16, 185, 129, 0.25))'
                : match.category === 'Semi-Final'
                ? 'rgba(244, 63, 94, 0.2)'
                : match.category === 'Quarter-Final'
                ? 'rgba(245, 158, 11, 0.2)'
                : match.category === 'Knockout'
                ? 'rgba(168, 85, 247, 0.2)'
                : 'rgba(56, 189, 248, 0.18)',
              color: match.category === 'Final'
                ? '#eab308'
                : match.category === 'Semi-Final'
                ? '#fb7185'
                : match.category === 'Quarter-Final'
                ? '#fbbf24'
                : match.category === 'Knockout'
                ? '#c084fc'
                : '#38bdf8',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {match.category || 'League'}
          </span>
        </div>

        {isLive ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            color: '#ef4444',
            fontSize: size === 'mini' ? '0.7rem' : '0.76rem',
            fontWeight: 900,
            padding: '2px 9px',
            borderRadius: 20,
            letterSpacing: '0.6px',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} className="animate-pulse" />
            LIVE
          </span>
        ) : isCompleted ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontSize: size === 'mini' ? '0.68rem' : '0.74rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 20
          }}>
            ✓ FINAL
          </span>
        ) : (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: size === 'mini' ? '0.68rem' : '0.74rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 20
          }}>
            ⏰ SCHEDULED
          </span>
        )}
      </div>

      {/* 2. Teams Matchup Block with Prominent Logos & 2-Line Full Names */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: size === 'mini' ? '0.35rem' : '0.65rem',
        padding: size === 'mini' ? '0.25rem 0' : '0.45rem 0',
        flexShrink: 0
      }}>
        {/* Team A */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, position: 'relative' }}>
          <div style={{
            position: 'relative',
            borderRadius: 14,
            boxShadow: isWinnerA ? '0 0 16px rgba(16, 185, 129, 0.8)' : 'none',
            border: isWinnerA ? '2px solid #10b981' : 'none',
            transition: 'all 0.3s'
          }}>
            <TeamLogoAvatar
              logoUrl={match.teamA?.logo}
              teamName={match.teamA?.name}
              size={logoSize}
              theme={theme}
            />
            {isWinnerA && (
              <span style={{
                position: 'absolute',
                bottom: -6,
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.58rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: 10,
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap'
              }}>
                🏆 WINNER
              </span>
            )}
          </div>
          <div style={{
            fontSize: size === 'mini' ? 'clamp(0.85rem, 1.05vw, 1.05rem)' : size === 'compact' ? 'clamp(0.95rem, 1.2vw, 1.2rem)' : 'clamp(1.05rem, 1.35vw, 1.38rem)',
            fontWeight: 800,
            color: isWinnerA ? '#34d399' : (theme === 'dark' ? '#f8fafc' : '#0f172a'),
            marginTop: '0.35rem',
            lineHeight: 1.18,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            width: '100%',
            minHeight: '2.35em',
            maxHeight: '2.35em'
          }}>
            {teamAName}
          </div>
        </div>

        {/* VS Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 0.15rem' }}>
          <span style={{
            fontSize: size === 'mini' ? '0.68rem' : '0.76rem',
            fontWeight: 900,
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            padding: '3px 7px',
            borderRadius: 12,
            letterSpacing: '1px'
          }}>
            VS
          </span>
        </div>

        {/* Team B */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, position: 'relative' }}>
          <div style={{
            position: 'relative',
            borderRadius: 14,
            boxShadow: isWinnerB ? '0 0 16px rgba(16, 185, 129, 0.8)' : 'none',
            border: isWinnerB ? '2px solid #10b981' : 'none',
            transition: 'all 0.3s'
          }}>
            <TeamLogoAvatar
              logoUrl={match.teamB?.logo}
              teamName={match.teamB?.name}
              size={logoSize}
              theme={theme}
            />
            {isWinnerB && (
              <span style={{
                position: 'absolute',
                bottom: -6,
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.58rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: 10,
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap'
              }}>
                🏆 WINNER
              </span>
            )}
          </div>
          <div style={{
            fontSize: size === 'mini' ? 'clamp(0.85rem, 1.05vw, 1.05rem)' : size === 'compact' ? 'clamp(0.95rem, 1.2vw, 1.2rem)' : 'clamp(1.05rem, 1.35vw, 1.38rem)',
            fontWeight: 800,
            color: isWinnerB ? '#34d399' : (theme === 'dark' ? '#f8fafc' : '#0f172a'),
            marginTop: '0.35rem',
            lineHeight: 1.18,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            width: '100%',
            minHeight: '2.35em',
            maxHeight: '2.35em'
          }}>
            {teamBName}
          </div>
        </div>
      </div>

      {/* 3. Primary Center Display Box (Eliminates dead space with rich sport details) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
          borderRadius: 12,
          border: isLive
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : isCompleted
            ? '1px solid rgba(52, 211, 153, 0.3)'
            : '1px solid rgba(56, 189, 248, 0.3)',
          padding: size === 'mini' ? '0.35rem 0.6rem' : '0.65rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          textAlign: 'center',
          margin: '0.2rem 0',
          position: 'relative',
          overflow: 'hidden',
          gap: '0.25rem'
        }}
      >
        {isLive ? (
          <>
            {/* Primary Score Numbers */}
            <div style={{
              fontSize: size === 'mini' ? 'clamp(2.1rem, 3.2vw, 3rem)' : size === 'compact' ? 'clamp(2.5rem, 3.8vw, 3.6rem)' : 'clamp(3rem, 4.6vw, 4.6rem)',
              fontWeight: 950,
              color: '#10b981',
              lineHeight: 1,
              letterSpacing: '-1px',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 24px rgba(16, 185, 129, 0.4)'
            }}>
              {scoreMain}
            </div>

            {/* Overs, CRR, Target & RRR Line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.45rem',
              fontSize: size === 'mini' ? 'clamp(0.72rem, 0.9vw, 0.88rem)' : '0.88rem',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap'
            }}>
              {scoreOvers && <span style={{ color: '#cbd5e1' }}>{scoreOvers}</span>}
              {target ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ color: '#f59e0b', fontWeight: 800 }}>Target: {target}</span>
                </>
              ) : null}
              {crr ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ color: '#38bdf8' }}>CRR: {crr}</span>
                </>
              ) : null}
              {rrr ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ color: '#ec4899', fontWeight: 800 }}>RRR: {rrr}</span>
                </>
              ) : null}
            </div>

            {/* Current Over Balls Chips or Striker/Bowler Info */}
            {currentOverBalls && currentOverBalls.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', marginRight: 2 }}>THIS OVER:</span>
                {currentOverBalls.slice(-6).map((ball, bIdx) => {
                  const bStr = String(ball).toUpperCase();
                  const isFour = bStr === '4';
                  const isSix = bStr === '6';
                  const isWicket = bStr === 'W' || bStr === 'WICKET';
                  const isDot = bStr === '0' || bStr === '•' || bStr === '.';
                  return (
                    <span
                      key={bIdx}
                      style={{
                        width: 'clamp(20px, 1.8vw, 26px)',
                        height: 'clamp(20px, 1.8vw, 26px)',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)',
                        fontWeight: 900,
                        background: isFour
                          ? 'rgba(16, 185, 129, 0.25)'
                          : isSix
                          ? 'rgba(168, 85, 247, 0.25)'
                          : isWicket
                          ? 'rgba(239, 68, 68, 0.25)'
                          : isDot
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(59, 130, 246, 0.18)',
                        color: isFour ? '#10b981' : isSix ? '#c084fc' : isWicket ? '#ef4444' : isDot ? '#94a3b8' : '#60a5fa',
                        border: `1px solid ${isFour ? 'rgba(16, 185, 129, 0.5)' : isSix ? 'rgba(168, 85, 247, 0.5)' : isWicket ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`
                      }}
                    >
                      {isDot ? '•' : bStr}
                    </span>
                  );
                })}
              </div>
            ) : striker && size !== 'mini' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                fontSize: '0.74rem',
                color: '#cbd5e1',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '96%'
              }}>
                <span>🏏 {striker.name?.split(' ')[0]} {striker.runs}* ({striker.balls}b)</span>
                {bowler && (
                  <>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span>🎯 {bowler.name?.split(' ')[0]} {bowler.wickets ?? 0}/{bowler.runs ?? bowler.runsConceded ?? 0}</span>
                  </>
                )}
              </div>
            ) : null}

            {/* Batting Team pill */}
            {subtext && (
              <div style={{
                fontSize: size === 'mini' ? 'clamp(0.68rem, 0.85vw, 0.78rem)' : '0.82rem',
                fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '2px 8px',
                borderRadius: 6,
                maxWidth: '96%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                ⚡ {subtext}
              </div>
            )}
          </>
        ) : isCompleted ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%' }}>
            {/* Prominent Result Headline */}
            <div style={{
              fontSize: size === 'mini' ? 'clamp(1rem, 1.4vw, 1.35rem)' : 'clamp(1.2rem, 1.7vw, 1.65rem)',
              fontWeight: 950,
              color: '#34d399',
              letterSpacing: '0.3px',
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '96%'
            }}>
              {subtext && !subtext.toLowerCase().includes('concluded')
                ? subtext
                : `${isWinnerA ? teamAName : isWinnerB ? teamBName : 'Match Won'} • Final`}
            </div>

            {/* Score Comparison */}
            {!scoreIsDefault && match.score?.summary && match.score.summary !== 'Result' && (
              <div style={{
                fontSize: size === 'mini' ? '0.78rem' : '0.88rem',
                fontWeight: 800,
                color: '#cbd5e1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                Score: {match.score.summary}
              </div>
            )}

            <div style={{
              fontSize: size === 'mini' ? '0.68rem' : '0.74rem',
              fontWeight: 800,
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 10px',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              Match Concluded • Official Result
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%' }}>
            {/* Prominent Start Time */}
            <div style={{
              fontSize: size === 'mini' ? 'clamp(1.25rem, 1.8vw, 1.8rem)' : 'clamp(1.45rem, 2.2vw, 2.2rem)',
              fontWeight: 950,
              color: '#38bdf8',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Clock size={size === 'mini' ? 18 : 22} color="#38bdf8" />
              <span>{match.startTime || match.scheduledTime || 'STARTS AT 07:30 PM'}</span>
            </div>

            {/* Subtitle Line */}
            <div style={{
              fontSize: size === 'mini' ? '0.72rem' : '0.82rem',
              fontWeight: 800,
              color: '#94a3b8',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '2px 10px',
              borderRadius: 20
            }}>
              🏏 {match.courtName ? match.courtName : 'Court 1'} • T20 Format
            </div>

            <div style={{
              fontSize: size === 'mini' ? '0.66rem' : '0.72rem',
              fontWeight: 700,
              color: '#64748b'
            }}>
              Toss scheduled prior to start
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Details */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: size === 'mini' ? '0.25rem' : '0.35rem',
        borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
        fontSize: size === 'mini' ? '0.68rem' : '0.74rem',
        color: '#94a3b8',
        fontWeight: 600,
        flexShrink: 0
      }}>
        <span style={{ color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🏏 {sportSlug.toUpperCase()}
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
          {match.venueName || 'Turf Arena'}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 2: FIXTURES & UPCOMING MATCHES
   ══════════════════════════════════════════════════════════════════════ */
function FixturesScene({ fixtures, theme }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={22} color="#10b981" />
        <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.8rem)', fontWeight: 900, margin: 0 }}>
          Upcoming Fixtures &amp; Arena Schedule
        </h2>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', overflowY: 'auto' }}>
        {fixtures && fixtures.length > 0 ? (
          fixtures.slice(0, 8).map(f => (
            <div
              key={f.public_id || f.match_number}
              style={{
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                borderRadius: 14,
                padding: '1rem 1.25rem',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>
                <span>Match #{f.match_number}</span>
                <span>{f.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{f.team_a_name || 'Team 1'}</span>
                <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: '0.8rem' }}>VS</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{f.team_b_name || 'Team 2'}</span>
              </div>
              <div suppressHydrationWarning style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {f.court_name || 'Main Court'} • {f.match_date ? new Date(f.match_date).toLocaleDateString() : 'Today'}
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No upcoming fixtures scheduled.
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 3: STANDINGS & POINTS TABLE
   ══════════════════════════════════════════════════════════════════════ */
function StandingsScene({ standings, theme }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Table size={22} color="#10b981" />
        <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.8rem)', fontWeight: 900, margin: 0 }}>
          Tournament Standings &amp; Points Table
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          background: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
          borderRadius: 16,
          border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'clamp(0.8rem, 1vw, 1rem)' }}>
          <thead>
            <tr style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Rank</th>
              <th style={{ padding: '0.85rem 1rem' }}>Team</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>P</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>W</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>L</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>T/D</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>NRR/Diff</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#10b981', fontWeight: 900 }}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings && standings.length > 0 ? (
              standings.slice(0, 10).map((row, idx) => (
                <tr
                  key={row.teamId || idx}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx === 0 ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: idx === 0 ? '#10b981' : 'inherit' }}>
                    #{row.rank || idx + 1}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {row.teamName}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.played}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{row.won}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#ef4444' }}>{row.lost}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.drawn || row.tied || 0}</td>
                  <td style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: (() => {
                      const val = row.netRunRate != null && row.netRunRate !== ''
                        ? Number(row.netRunRate)
                        : Number(row.goalDifference ?? row.pointDifference ?? 0);
                      if (val > 0) return '#10b981';
                      if (val < 0) return '#ef4444';
                      return 'inherit';
                    })()
                  }}>
                    {(() => {
                      if (row.netRunRate != null && row.netRunRate !== '') {
                        const n = Number(row.netRunRate);
                        if (n > 0) return `+${n.toFixed(2)}`;
                        if (n < 0) return n.toFixed(2);
                        return '0.00';
                      }
                      const diff = Number(row.goalDifference ?? row.pointDifference ?? 0);
                      if (diff > 0) return `+${diff}`;
                      if (diff < 0) return `${diff}`;
                      return '0.00';
                    })()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>
                    {row.points}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No standings records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 4: TOP PLAYER STATISTICS & LEADERBOARD
   ══════════════════════════════════════════════════════════════════════ */
function LeaderboardScene({ leaderboard, theme }) {
  const items = leaderboard?.items || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Flame size={24} color="#f59e0b" />
        <div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.8rem)', fontWeight: 900, margin: 0 }}>
            {leaderboard?.title || 'Tournament Player Leaderboard & Awards'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Leading athletes, top scorers, and tournament award contenders</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', overflowY: 'auto' }}>
        {items.length > 0 ? (
          items.map((player, idx) => (
            <div
              key={player.player_id || idx}
              style={{
                background: idx === 0
                  ? (theme === 'dark' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)' : '#ffffff')
                  : (theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#ffffff'),
                borderRadius: 16,
                border: idx === 0 ? '2px solid #f59e0b' : (theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'),
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      background: idx === 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                      color: idx === 0 ? '#000' : '#fff',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 12
                    }}
                  >
                    RANK #{idx + 1}
                  </span>
                  {player.badge && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                      ⭐ {player.badge}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', margin: '0.5rem 0' }}>
                  <TeamLogoAvatar teamName={player.player_name} size={48} theme={theme} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>{player.player_name}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{player.team_name || 'Tournament Team'}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
                  borderRadius: 12,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>{player.metric_label || 'Stat'}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 950, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                  {player.metric_value}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No player stats recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 5: SPONSORS & ADVERTISEMENTS
   ══════════════════════════════════════════════════════════════════════ */
function SponsorsScene({ ads, theme }) {
  const allAds = [...(ads.topAds || []), ...(ads.bottomAds || []), ...(ads.leftAds || []), ...(ads.rightAds || []), ...(ads.centerAds || [])];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981' }}>
          Official Tournament Partners
        </span>
        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 900, margin: '0.35rem 0', color: theme === 'dark' ? '#fff' : '#0f172a' }}>
          Our Sponsors &amp; Brand Advertisers
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 960 }}>
        {allAds.length > 0 ? (
          allAds.slice(0, 6).map((ad, i) => (
            <div
              key={ad.id || i}
              style={{
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                borderRadius: 16,
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 260,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
              }}
            >
              {ad.imageUrl ? (
                <img src={ad.imageUrl} alt={ad.title || 'Sponsor'} style={{ maxHeight: 85, maxWidth: '100%', objectFit: 'contain', marginBottom: '1rem' }} />
              ) : (
                <Sparkles size={44} color="#10b981" style={{ marginBottom: '1rem' }} />
              )}
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, fontSize: '1.1rem' }}>{ad.title || ad.name || 'Official Partner'}</h4>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TurfSpot Arena Sponsor</span>
            </div>
          ))
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Powered by TurfSpot Sports Platform &amp; Stadium Management.
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCENE 6: RECENT MATCH RESULTS
   ══════════════════════════════════════════════════════════════════════ */
function ResultsScene({ results, theme }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Award size={22} color="#10b981" />
        <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.8rem)', fontWeight: 900, margin: 0 }}>
          Recent Match Results &amp; Final Scores
        </h2>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', overflowY: 'auto' }}>
        {results && results.length > 0 ? (
          results.slice(0, 8).map(r => (
            <div
              key={r.public_id || r.match_number}
              style={{
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                borderRadius: 14,
                padding: '1.25rem',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>
                <span>Match #{r.match_number}</span>
                <span style={{ color: '#f59e0b' }}>FINAL RESULT</span>
              </div>
              <div style={{ margin: '0.75rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  <span>{r.team_a_name}</span>
                  <span style={{ color: '#10b981' }}>{r.team_a_score || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>{r.team_b_name}</span>
                  <span style={{ color: '#10b981' }}>{r.team_b_score || '-'}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                {r.result_summary || 'Match concluded'}
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No completed match results recorded today.
          </div>
        )}
      </div>
    </div>
  );
}
