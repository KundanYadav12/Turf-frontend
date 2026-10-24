'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { socket } from '../services/socket';
import { useTournamentLive } from '../hooks/useTournamentLive';
import { getActiveSignageAdsApi } from '../services/advertisementService';
import { toggleTheme } from '../features/theme/themeSlice';
import LiveBallCelebrationOverlay from '../components/signage/LiveBallCelebrationOverlay';
import SignageAdSlot from '../components/signage/SignageAdSlot';
import CourtView, { getCourtState, parseRacquetScoreDetails } from '../components/court/CourtView';
import { useBallEvents } from '../hooks/useBallEvents';
import {
  Radio,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Trophy,
  WifiOff,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  RotateCw,
  Video
} from 'lucide-react';
import LiveStreamPlayer from '../components/streaming/LiveStreamPlayer';

/**
 * Public Live Tournament Display Page
 * Responsive: Phone (360-430px), Tablet (768-1023px), Desktop (1024px+), TV (1600px+)
 * Dual Theme (Dark & Light) via pure CSS tokens with live ball-event animations.
 */
const SignageDisplayPage = ({ tournamentId: propsTournamentId } = {}) => {
  let routeParams = {};
  try {
    routeParams = useParams() || {};
  } catch (e) {
    routeParams = {};
  }
  const idFromUrl = typeof window !== 'undefined' ? (window.location.pathname.match(/\/display\/tournament\/([^/]+)/)?.[1] || window.location.pathname.match(/\/tournaments\/([^/]+)/)?.[1]) : null;
  const id = propsTournamentId || routeParams?.id || idFromUrl;
  const tournamentId = id;
  const dispatch = useDispatch();
  const reduxTheme = useSelector((state) => state.theme?.mode) || 'dark';

  // Synchronized theme state with DOM data-theme attribute (hydration-safe)
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    setMounted(true);
    const active = document.documentElement.getAttribute('data-theme') || reduxTheme || 'dark';
    setCurrentTheme(active);

    const observer = new MutationObserver(() => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setCurrentTheme(activeTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, [reduxTheme]);

  // Superadmin authorization guard
  const authUser = useSelector((state) => state.auth?.user);
  const [isSuperAdminAuthorized, setIsSuperAdminAuthorized] = useState(null);

  useEffect(() => {
    let currentUser = authUser;
    if (!currentUser && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
      } catch (e) {}
    }
    const role = (currentUser?.role || '').toUpperCase();
    const authorized = role === 'ADMIN' || role === 'SUPER_ADMIN';
    setIsSuperAdminAuthorized(authorized);
    if (!authorized && typeof window !== 'undefined') {
      const targetUrl = id ? `/tournaments/${id}` : '/tournaments';
      window.location.replace(targetUrl);
    }
  }, [authUser, id]);

  // Core Tournament & Match State
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Orientation State: AUTO (detect from aspect ratio), LANDSCAPE (16:9), PORTRAIT (9:16)
  const [displayOrientation, setDisplayOrientation] = useState('AUTO');
  const [windowAspect, setWindowAspect] = useState(16 / 9);

  useEffect(() => {
    const handleResize = () => {
      setWindowAspect(window.innerWidth / (window.innerHeight || 1));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = displayOrientation === 'PORTRAIT'
    ? true
    : displayOrientation === 'LANDSCAPE'
    ? false
    : windowAspect < 1; // Auto: height > width

  // Advertisements State
  const [adsData, setAdsData] = useState({
    topAds: [],
    bottomAds: [],
    leftAds: [],
    rightAds: [],
    courtAds: [],
    courtMiddleAds: [],
    zoneSettings: { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 },
    venueZoneSettings: {},
    portraitZoneSettings: { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' },
    venuePortraitZoneSettings: {},
    state: {
      adsEnabled: true,
      topAdMode: 'STATIC',
      bottomAdMode: 'MOTION',
      bottomAdPaused: false,
      sidebarAdsEnabled: true,
      leftSidebarPaused: false,
      rightSidebarPaused: false
    }
  });

  // Top Ad Rotation Index
  const [currentTopAdIndex, setCurrentTopAdIndex] = useState(0);

  // Live Streaming Signage State
  const [activeStreamData, setActiveStreamData] = useState(null);
  const [signageStreamMode, setSignageStreamMode] = useState(false);

  // Stable Live Stream Checker
  const checkLiveStreams = useCallback(async () => {
    try {
      const res = await axios.get('/api/streams/active');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const stream = res.data.data.find(
          (s) => (s.status === 'LIVE' || s.isLive) && (!id || !tournamentId || s.tournamentId === id || s.tournamentId === tournamentId || s.tournament_uuid === id)
        );
        if (stream) {
          setActiveStreamData(stream);
          setSignageStreamMode(true);
        } else {
          setActiveStreamData(null);
          setSignageStreamMode(false);
        }
      } else {
        setActiveStreamData(null);
        setSignageStreamMode(false);
      }
    } catch (e) {
      // non-blocking
    }
  }, [id, tournamentId]);

  useEffect(() => {
    checkLiveStreams();
    const interval = setInterval(checkLiveStreams, 25000);
    return () => clearInterval(interval);
  }, [checkLiveStreams]);

  // Live Digital Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  // Socket Connection Status Listeners & Auto-Reconcile
  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      setHasConnectedOnce(true);
    }

    const handleConnect = () => {
      setIsConnected(true);
      setHasConnectedOnce(true);
      fetchLiveMatches();
      fetchAdvertisements();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [id]);

  // Fetch Tournament, Matches, and Advertisements
  const fetchLiveMatches = async (isBackground = false) => {
    if (!isBackground && matches.length === 0) setLoading(true);
    try {
      const [tournRes, liveRes] = await Promise.all([
        axios.get(`/api/tournaments/${id}`),
        axios.get(`/api/tournaments/${id}/live`)
      ]);
      if (tournRes.data.success) setTournament(tournRes.data.data);
      if (liveRes.data.success) {
        const items = liveRes.data.data.items || [];
        setMatches(items);
        items.forEach((m) => {
          const mid = m.uuid || m.id || m.matchId;
          if (mid) socket.emit('join:match', { matchId: mid });
        });
      }
    } catch (err) {
      console.error('Failed to load tournament live matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const res = await getActiveSignageAdsApi(id);
      if (res.success && res.data) {
        setAdsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load signage advertisements:', err);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    fetchAdvertisements();
  }, [id]);

  // Real-Time Advertisement Socket.IO Listeners
  useEffect(() => {
    const handleAdUpdate = () => fetchAdvertisements();

    const handleAdPaused = (data) => {
      setAdsData((prev) => ({
        ...prev,
        state: { ...prev.state, bottomAdPaused: true, ...data?.playbackState }
      }));
    };

    const handleAdResumed = (data) => {
      setAdsData((prev) => ({
        ...prev,
        state: { ...prev.state, bottomAdPaused: false, ...data?.playbackState }
      }));
    };

    const handleAdsDisabled = (data) => {
      setAdsData((prev) => ({
        ...prev,
        state: { ...prev.state, adsEnabled: false, ...data?.playbackState }
      }));
    };

    const handleAdsEnabled = (data) => {
      setAdsData((prev) => ({
        ...prev,
        state: { ...prev.state, adsEnabled: true, ...data?.playbackState }
      }));
    };

    const handlePlaybackUpdate = (data) => {
      if (data?.playbackState) {
        setAdsData(prev => ({
          ...prev,
          state: { ...prev.state, ...data.playbackState },
          zoneSettings: data.playbackState.zoneSettings || prev.zoneSettings,
          venueZoneSettings: data.playbackState.venueZoneSettings || prev.venueZoneSettings,
          portraitZoneSettings: data.playbackState.portraitZoneSettings || prev.portraitZoneSettings,
          venuePortraitZoneSettings: data.playbackState.venuePortraitZoneSettings || prev.venuePortraitZoneSettings
        }));
      }
      fetchAdvertisements();
    };

    const onBadminton = (data) => handleLiveMatchUpdate(data);
    const onBall = (data) => handleLiveMatchUpdate(data);
    const onPickleball = (data) => handleLiveMatchUpdate(data);
    const onPointScored = (data) => handleLiveMatchUpdate({ ...data, type: 'POINT_SCORED', pointEvent: data });
    const onFootball = (data) => handleLiveMatchUpdate(data);
    const onScoreUpdated = (data) => handleLiveMatchUpdate(data);
    const onSignageUpdate = (data) => handleLiveMatchUpdate(data);

    socket.on('signage:playbackUpdated', handlePlaybackUpdate);
    socket.on('signage:adUpdated', handleAdUpdate);
    socket.on('signage:adAdded', handleAdUpdate);
    socket.on('signage:adRemoved', handleAdUpdate);
    socket.on('signage:adPaused', handleAdPaused);
    socket.on('signage:adResumed', handleAdResumed);
    socket.on('signage:adsDisabled', handleAdsDisabled);
    socket.on('signage:adsEnabled', handleAdsEnabled);
    socket.on('tournament:matchDisplayUpdated', () => fetchLiveMatches(true));
    socket.on('display:matchesUpdated', () => fetchLiveMatches(true));
    socket.on('match:badmintonEvent', onBadminton);
    socket.on('match:ballEvent', onBall);
    socket.on('match:pickleballScore', onPickleball);
    socket.on('match:footballEvent', onFootball);
    socket.on('score:updated', onScoreUpdated);
    socket.on('match:pointScored', onPointScored);
    socket.on('signage:pointScored', onPointScored);
    socket.on('signage:matchUpdate', onSignageUpdate);
    socket.on('stream:status', checkLiveStreams);
    socket.on('stream:status_changed', checkLiveStreams);
    socket.on('stream:ended', checkLiveStreams);
    socket.on('tournament:stream_status', checkLiveStreams);

    return () => {
      socket.off('signage:playbackUpdated', handlePlaybackUpdate);
      socket.off('signage:adUpdated', handleAdUpdate);
      socket.off('signage:adAdded', handleAdUpdate);
      socket.off('signage:adRemoved', handleAdUpdate);
      socket.off('signage:adPaused', handleAdPaused);
      socket.off('signage:adResumed', handleAdResumed);
      socket.off('signage:adsDisabled', handleAdsDisabled);
      socket.off('signage:adsEnabled', handleAdsEnabled);
      socket.off('tournament:matchDisplayUpdated');
      socket.off('display:matchesUpdated');
      socket.off('match:badmintonEvent', onBadminton);
      socket.off('match:ballEvent', onBall);
      socket.off('match:pickleballScore', onPickleball);
      socket.off('match:footballEvent', onFootball);
      socket.off('score:updated', onScoreUpdated);
      socket.off('match:pointScored', onPointScored);
      socket.off('signage:pointScored', onPointScored);
      socket.off('signage:matchUpdate', onSignageUpdate);
      socket.off('stream:status', checkLiveStreams);
      socket.off('stream:status_changed', checkLiveStreams);
      socket.off('stream:ended', checkLiveStreams);
      socket.off('tournament:stream_status', checkLiveStreams);
    };
  }, [id]);

  // Top Ad Rotation (Crossfade every 10 seconds if multiple active top ads)
  useEffect(() => {
    if (!adsData.topAds || adsData.topAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTopAdIndex((prev) => (prev + 1) % adsData.topAds.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [adsData.topAds]);

  // Handle incoming live score update from Socket.IO room tournament:{id} and match:{id}
  const handleLiveMatchUpdate = useCallback((data) => {
    if (!data) return;
    const targetId = data.matchId || data.id;
    if (!targetId) return;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === targetId || m.uuid === targetId || m.matchId === targetId || (data.matchNumber && m.matchNumber === data.matchNumber)) {
          if (data.eventSeq && m._eventSeq && data.eventSeq < m._eventSeq) {
            return m; // Ignore stale or out-of-order event
          }
          return {
            ...m,
            _eventSeq: data.eventSeq || data.seq || Date.now(),
            _lastEventType: data.type || null,
            _pointEvent: data.pointEvent || (data.type === 'POINT_SCORED' ? data : null),
            status: data.status || m.status,
            courtColor: data.courtColor || m.courtColor,
            score: {
              ...m.score,
              summary: data.scoreSummary || data.liveScoreSummary || m.score?.summary,
              subtext: data.liveSubtext || data.subtext || m.score?.subtext,
              details: data.state || data.details || m.score?.details
            }
          };
        }
        return m;
      })
    );
  }, []);

  useTournamentLive(id, handleLiveMatchUpdate);

  const displayMatches = matches.filter((m) => m.showOnDisplay !== false);

  // ── LIVE BALL-EVENT HOOK (STABLE MONOTONIC PIPELINE) ──
  const { activeEvent, dismissEvent } = useBallEvents(displayMatches[0]);

  // Advertisement Visibility Checks
  const isAdsGlobalEnabled = adsData.state?.adsEnabled !== false;
  const showTopAd =
    isAdsGlobalEnabled &&
    adsData.topAds &&
    adsData.topAds.length > 0 &&
    adsData.state?.topAdMode !== 'HIDDEN';

  const showBottomAd =
    isAdsGlobalEnabled &&
    adsData.bottomAds &&
    adsData.bottomAds.length > 0 &&
    adsData.state?.bottomAdMode !== 'HIDDEN';

  const isBottomAdPaused =
    adsData.state?.bottomAdPaused || adsData.state?.bottomAdMode === 'PAUSED';

  const activeTopAd = adsData.topAds?.[currentTopAdIndex] || adsData.topAds?.[0];
  const bottomTickerSpeed = adsData.bottomAds?.find((a) => a.speed)?.speed || adsData.bottomAds?.[0]?.speed || 25;
  const matchCount = displayMatches.length;

  // Unified Dynamic Ad Zone Settings Resolution
  const venueId = tournament?.venue_id || tournament?.venueId || null;
  const activeZoneSettings = useMemo(() => {
    if (isPortrait) {
      const defaults = { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' };
      const globalZones = { ...defaults, ...(adsData?.portraitZoneSettings || {}) };
      if (venueId && adsData?.venuePortraitZoneSettings?.[String(venueId)]) {
        return { ...globalZones, ...adsData.venuePortraitZoneSettings[String(venueId)] };
      }
      return globalZones;
    } else {
      const defaults = { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 };
      const globalZones = { ...defaults, ...(adsData?.zoneSettings || {}) };
      if (venueId && adsData?.venueZoneSettings?.[String(venueId)]) {
        return { ...globalZones, ...adsData.venueZoneSettings[String(venueId)] };
      }
      return globalZones;
    }
  }, [adsData, venueId, isPortrait]);

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

  const resolvedTopHeight = showTopAd
    ? resolveZoneDimension(activeZoneSettings?.topHeight, isPortrait ? 160 : 120, activeTopAd?.height)
    : '0px';

  const isSidebarEnabled = Boolean(
    isAdsGlobalEnabled &&
    adsData.state?.sidebarAdsEnabled !== false
  );
  const isLeftAdActive = isSidebarEnabled && adsData.leftAds && adsData.leftAds.length > 0;
  const isRightAdActive = isSidebarEnabled && adsData.rightAds && adsData.rightAds.length > 0;

  const resolvedLeftWidth = isLeftAdActive
    ? resolveZoneDimension(activeZoneSettings?.leftWidth, 220, adsData.leftAds?.[0]?.width)
    : '0px';

  const resolvedRightWidth = isRightAdActive
    ? resolveZoneDimension(activeZoneSettings?.rightWidth, 220, adsData.rightAds?.[0]?.width)
    : '0px';

  const resolvedBottomHeight = showBottomAd
    ? resolveZoneDimension(activeZoneSettings?.bottomHeight, isPortrait ? 80 : 70, adsData.bottomAds?.[0]?.height)
    : '0px';

  const resolvedStripHeight = resolveZoneDimension(activeZoneSettings?.sidebarStripHeight, 90);
  const sidebarsMode = activeZoneSettings?.sidebarsMode || 'STRIP';

  if (isSuperAdminAuthorized === false) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#ef4444', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Access Restricted</h2>
        <p>Signage TV Display is restricted to Superadmin users only. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="display-page-container display-theme-transition">
      {/* ── LIVE FULL-VIEWPORT BALL CELEBRATION LAYER (PORTALED TO BODY) ── */}
      <LiveBallCelebrationOverlay event={activeEvent} onDismiss={dismissEvent} />

      {/* ── CONNECTION LOSS BANNER OVERLAY (NON-DESTRUCTIVE) ── */}
      {!isConnected && hasConnectedOnce && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'var(--display-warning-amber)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
            textAlign: 'center',
            padding: '4px 12px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: 'var(--display-shadow-subtle)',
            letterSpacing: '0.5px'
          }}
        >
          <WifiOff size={16} />
          LIVE CONNECTION LOST — RECONNECTING TO STADIUM FEED...
        </div>
      )}

      {/* ── MAIN CENTERED CONTAINER (FLUID IN PORTRAIT / MAX-WIDTH IN LANDSCAPE) ── */}
      <div
        className="display-inner-wrapper"
        style={{
          maxWidth: isPortrait ? '100%' : undefined,
          width: '100%',
          flex: 1
        }}
      >
        {/* ── TOP AD BANNER WITH REAL-TIME CONFIGURABLE HEIGHT ── */}
        {showTopAd && (
          <div
            style={{
              height: resolvedTopHeight,
              width: '100%',
              overflow: 'hidden',
              flexShrink: 0,
              marginBottom: 'clamp(0.6rem, 1.2vh, 1rem)',
              borderRadius: 12,
              transition: 'height 0.25s ease'
            }}
          >
            <SignageAdSlot
              placement="TOP"
              ads={adsData.topAds}
              isPaused={!isAdsGlobalEnabled}
              style={{ height: '100%', width: '100%', marginBottom: 0 }}
            />
          </div>
        )}

        {/* ── SIDEBARS + ARENA SCOREBOARD CONTAINER (LANDSCAPE VS PORTRAIT) ── */}
        {!isPortrait ? (
          /* LANDSCAPE: Left Sidebar + Central Content + Right Sidebar */
          <div
            className="signage-layout-with-sidebars"
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 'clamp(0.75rem, 1.5vw, 1.25rem)',
              width: '100%',
              flex: 1
            }}
          >
            {/* Left Sidebar Ad Slot */}
            {isLeftAdActive && (
              <div
                style={{
                  width: resolvedLeftWidth,
                  minWidth: resolvedLeftWidth,
                  maxWidth: resolvedLeftWidth,
                  overflow: 'hidden',
                  flexShrink: 0,
                  transition: 'width 0.25s ease'
                }}
              >
                <SignageAdSlot
                  placement="LEFT"
                  ads={adsData.leftAds}
                  isPaused={adsData.state?.leftSidebarPaused}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}

            {/* Main Central Arena Content */}
            <div className="signage-main-arena-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER: ONE TIDY ROW ON DESKTOP, TWO-ROW ON MOBILE (<1024px) ── */}
        {/* 1. Desktop Header (>=1024px: One Tidy Row with No Wrapping) */}
        <header
          className="display-header-desktop display-theme-transition"
          style={{
            background: 'var(--display-surface)',
            border: '1px solid var(--display-border)',
            borderRadius: 16,
            padding: '8px 16px',
            marginBottom: 'clamp(0.6rem, 1.2vh, 1rem)',
            boxShadow: 'var(--display-shadow-subtle)',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            whiteSpace: 'nowrap'
          }}
        >
          {/* Left: Back, Trophy, Title, Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <Link
              to={`/tournaments/${id}`}
              title="Back to Tournament"
              aria-label="Back to Tournament"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                background: 'var(--display-surface-elevated)',
                border: '1px solid var(--display-border)',
                color: 'var(--display-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={18} />
            </Link>

            <div
              style={{
                width: 38,
                height: 38,
                minWidth: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--display-accent) 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--display-glow-accent, none)'
              }}
            >
              <Trophy size={18} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1rem, 1.4vw, 1.35rem)',
                  fontWeight: 900,
                  color: 'var(--display-text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {tournament?.name || 'Tournament Arena Live Display'}
              </h1>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--display-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {tournament?.city || 'Sports Arena'} • Official Live Match Broadcast
              </div>
            </div>
          </div>

          {/* Right: Active Match Info, LIVE Pill, Clock, Theme, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--display-text-muted)', fontWeight: 600 }}>
              {matchCount > 0 ? `${matchCount} Active Match${matchCount > 1 ? 'es' : ''}` : 'Arena Live'}
            </span>

            {/* LIVE Pill */}
            <div
              suppressHydrationWarning
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: isConnected
                  ? 'var(--display-live-red-subtle)'
                  : 'var(--display-warning-amber-subtle)',
                border: `1px solid ${isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)'}`,
                color: isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.75rem',
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
                  background: isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)',
                  display: 'inline-block'
                }}
                className={isConnected ? 'animate-pulse' : ''}
              />
              {isConnected ? 'LIVE' : 'RECONNECTING'}
            </div>

            {/* Stadium Digital Clock */}
            <div
              suppressHydrationWarning
              style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: 'var(--display-accent)',
                fontVariantNumeric: 'tabular-nums',
                background: 'var(--display-accent-subtle)',
                border: '1px solid var(--display-accent)',
                padding: '4px 10px',
                borderRadius: 8,
                letterSpacing: '0.5px'
              }}
            >
              {currentTime}
            </div>

            {/* Orientation Toggle Button */}
            <button
              onClick={() => {
                setDisplayOrientation(prev => {
                  if (prev === 'AUTO') return 'LANDSCAPE';
                  if (prev === 'LANDSCAPE') return 'PORTRAIT';
                  return 'AUTO';
                });
              }}
              aria-label={`Orientation: ${displayOrientation}`}
              title={`Orientation Mode: ${displayOrientation} (${isPortrait ? 'Portrait 9:16' : 'Landscape 16:9'}) - Click to toggle`}
              style={{
                height: 44,
                padding: '0 12px',
                borderRadius: 12,
                background: 'var(--display-surface-elevated)',
                border: isPortrait ? '1px solid var(--display-accent)' : '1px solid var(--display-border)',
                color: isPortrait ? 'var(--display-accent)' : 'var(--display-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCw size={16} />
              <span>{displayOrientation === 'AUTO' ? (isPortrait ? 'Auto (Portrait)' : 'Auto (Landscape)') : displayOrientation}</span>
            </button>

            {/* Theme Toggle Button (44px) */}
            <button
              onClick={() => dispatch(toggleTheme())}
              aria-label={`Switch to ${mounted && currentTheme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${mounted && currentTheme === 'light' ? 'dark' : 'light'} mode`}
              suppressHydrationWarning
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                background: 'var(--display-surface-elevated)',
                border: '1px solid var(--display-border)',
                color: 'var(--display-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {mounted && currentTheme === 'light' ? (
                <Moon size={18} color="var(--display-boundary-purple)" />
              ) : (
                <Sun size={18} color="var(--display-warning-amber)" />
              )}
            </button>

            {/* Fullscreen Button (44px) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                background: 'var(--display-surface-elevated)',
                border: '1px solid var(--display-border)',
                color: 'var(--display-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>

        {/* 2. Mobile/Tablet Header (<1024px: Two-Row Clean Layout) */}
        <header
          className="display-header-mobile display-theme-transition"
          style={{
            background: 'var(--display-surface)',
            border: '1px solid var(--display-border)',
            borderRadius: 16,
            padding: 'clamp(0.4rem, 0.8vh, 0.65rem) clamp(0.6rem, 1.2vw, 1rem)',
            marginBottom: 'clamp(0.5rem, 1vh, 0.8rem)',
            boxShadow: 'var(--display-shadow-subtle)',
            flexDirection: 'column',
            gap: 'clamp(0.3rem, 0.6vh, 0.5rem)'
          }}
        >
          {/* Row 1: Back Button, Title, Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flex: 1,
                minWidth: 0
              }}
            >
              <Link
                to={`/tournaments/${id}`}
                title="Back to Tournament"
                aria-label="Back to Tournament"
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  background: 'var(--display-surface-elevated)',
                  border: '1px solid var(--display-border)',
                  color: 'var(--display-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={18} />
              </Link>

              <div
                style={{
                  width: 'clamp(32px, 3.8vw, 38px)',
                  height: 'clamp(32px, 3.8vw, 38px)',
                  minWidth: 'clamp(32px, 3.8vw, 38px)',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--display-accent) 0%, #047857 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: 'var(--display-glow-accent, none)'
                }}
              >
                <Trophy size={18} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: 'clamp(0.95rem, 1.5vw, 1.35rem)',
                    fontWeight: 900,
                    color: 'var(--display-text-primary)',
                    margin: 0,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {tournament?.name || 'Tournament Arena Live Display'}
                </h1>
                <div
                  style={{
                    fontSize: 'clamp(0.68rem, 0.85vw, 0.78rem)',
                    color: 'var(--display-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 1
                  }}
                >
                  {tournament?.city || 'Sports Arena'} • Official Live Match Broadcast
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {/* Mobile Orientation Toggle Button */}
              <button
                onClick={() => {
                  setDisplayOrientation(prev => {
                    if (prev === 'AUTO') return 'LANDSCAPE';
                    if (prev === 'LANDSCAPE') return 'PORTRAIT';
                    return 'AUTO';
                  });
                }}
                aria-label={`Orientation: ${displayOrientation}`}
                title={`Orientation: ${displayOrientation}`}
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  background: 'var(--display-surface-elevated)',
                  border: isPortrait ? '1px solid var(--display-accent)' : '1px solid var(--display-border)',
                  color: isPortrait ? 'var(--display-accent)' : 'var(--display-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <RotateCw size={18} />
              </button>

              <button
                onClick={() => dispatch(toggleTheme())}
                aria-label={`Switch to ${mounted && currentTheme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${mounted && currentTheme === 'light' ? 'dark' : 'light'} mode`}
                suppressHydrationWarning
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  background: 'var(--display-surface-elevated)',
                  border: '1px solid var(--display-border)',
                  color: 'var(--display-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {mounted && currentTheme === 'light' ? (
                  <Moon size={18} color="var(--display-boundary-purple)" />
                ) : (
                  <Sun size={18} color="var(--display-warning-amber)" />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  background: 'var(--display-surface-elevated)',
                  border: '1px solid var(--display-border)',
                  color: 'var(--display-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              {/* Live Stream Mode Toggle Button */}
              {(activeStreamData || matches.some((m) => m.has_live_stream)) && (
                <button
                  type="button"
                  onClick={() => setSignageStreamMode((prev) => !prev)}
                  title={signageStreamMode ? 'Exit Live Stream View' : 'Watch Arena Live Broadcast'}
                  style={{
                    height: 44,
                    padding: '0 0.85rem',
                    borderRadius: 12,
                    background: signageStreamMode ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                    border: signageStreamMode ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.4)',
                    color: signageStreamMode ? '#ffffff' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.8rem'
                  }}
                >
                  <Video size={16} className={signageStreamMode ? '' : 'animate-pulse'} />
                  <span>{signageStreamMode ? 'SCOREBOARD' : '🔴 STREAM'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Subtitle on Left + LIVE Pill & Clock on Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              paddingTop: 'clamp(0.2rem, 0.4vh, 0.4rem)',
              borderTop: '1px solid var(--display-border-subtle)'
            }}
          >
            <div
              style={{
                fontSize: 'clamp(0.68rem, 0.85vw, 0.78rem)',
                color: 'var(--display-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {matchCount > 0
                ? `${matchCount} Active Match${matchCount > 1 ? 'es' : ''} on Court`
                : 'Arena Live Feed'}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <div
                suppressHydrationWarning
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isConnected
                    ? 'var(--display-live-red-subtle)'
                    : 'var(--display-warning-amber-subtle)',
                  border: `1px solid ${isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)'}`,
                  color: isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)',
                  padding: '2px 9px',
                  borderRadius: 20,
                  fontSize: 'clamp(0.66rem, 0.85vw, 0.75rem)',
                  fontWeight: 900,
                  letterSpacing: '0.5px'
                }}
              >
                <span
                  suppressHydrationWarning
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isConnected ? 'var(--display-live-red)' : 'var(--display-warning-amber)',
                    display: 'inline-block'
                  }}
                  className={isConnected ? 'animate-pulse' : ''}
                />
                {isConnected ? 'LIVE' : 'RECONNECTING'}
              </div>

              <div
                suppressHydrationWarning
                style={{
                  fontSize: 'clamp(0.75rem, 0.95vw, 0.88rem)',
                  fontWeight: 800,
                  color: 'var(--display-accent)',
                  fontVariantNumeric: 'tabular-nums',
                  background: 'var(--display-accent-subtle)',
                  border: '1px solid var(--display-accent)',
                  padding: '2px 8px',
                  borderRadius: 8,
                  letterSpacing: '0.5px'
                }}
              >
                {currentTime}
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ZONE ── */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--display-text-secondary)',
                gap: 12,
                background: 'var(--display-surface)',
                borderRadius: 18,
                border: '1px solid var(--display-border)'
              }}
            >
              <Radio size={36} className="animate-pulse" color="var(--display-accent)" />
              <div style={{ fontSize: 'clamp(1rem, 1.8vw, 1.35rem)', fontWeight: 800 }}>
                Connecting to Stadium Live Feed...
              </div>
            </div>
          ) : signageStreamMode && activeStreamData ? (
            /* ── SCENE: SIGNAGE LIVE ARENA STREAMING BROADCAST ── */
            <div style={{ flex: 1, minHeight: 0, height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <LiveStreamPlayer
                matchId={activeStreamData.matchId}
                streamData={activeStreamData}
                match={displayMatches.find((m) => m.id === activeStreamData.matchId || m.uuid === activeStreamData.matchId) || displayMatches[0] || null}
                showOverlay={true}
                autoPlay={true}
              />
            </div>
          ) : matchCount === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--display-surface)',
                borderRadius: 18,
                border: '1px dashed var(--display-border)',
                padding: '2rem',
                textAlign: 'center'
              }}
            >
              <Radio size={44} color="var(--display-text-muted)" style={{ marginBottom: '1rem' }} />
              <h2
                style={{
                  fontSize: 'clamp(1.3rem, 2.2vw, 1.8rem)',
                  margin: 0,
                  fontWeight: 900,
                  color: 'var(--display-text-primary)'
                }}
              >
                No matches selected for display
              </h2>
              <p
                style={{
                  color: 'var(--display-text-secondary)',
                  fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
                  marginTop: '0.5rem',
                  maxWidth: 480
                }}
              >
                No matches are currently selected for Signage TV display. Organizers can select matches in the Live Matches tab.
              </p>
            </div>
          ) : matchCount === 1 ? (
            /* ── 1 MATCH: STADIUM HERO PRESENTATION ── */
            <MatchCardHero match={displayMatches[0]} />
          ) : (
            /* ── 2, 3, or 4+ MATCHES: MULTI-MATCH GRID ── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  matchCount === 2
                    ? 'repeat(auto-fit, minmax(320px, 1fr))'
                    : 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'clamp(0.6rem, 1.2vw, 1rem)',
                flex: 1,
                minHeight: 0
              }}
            >
              {displayMatches.map((m) => (
                <MatchCardGrid key={m.id} match={m} matchCount={matchCount} />
              ))}
            </div>
          )}
        </main>
            </div>

            {/* Right Sidebar Ad Slot */}
            {isRightAdActive && (
              <div
                style={{
                  width: resolvedRightWidth,
                  minWidth: resolvedRightWidth,
                  maxWidth: resolvedRightWidth,
                  overflow: 'hidden',
                  flexShrink: 0,
                  transition: 'width 0.25s ease'
                }}
              >
                <SignageAdSlot
                  placement="RIGHT"
                  ads={adsData.rightAds}
                  isPaused={adsData.state?.rightSidebarPaused}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
          </div>
        ) : (
          /* PORTRAIT: Vertically Stacked Content with Optional Slim Horizontal Sponsor Strips */
          <div
            className="signage-layout-portrait"
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              flex: 1,
              gap: 'clamp(0.6rem, 1.2vh, 1rem)'
            }}
          >
            {/* Slim Horizontal Sponsor Strip Above Content */}
            {isSidebarEnabled && sidebarsMode === 'STRIP' && (adsData.leftAds?.length > 0 || adsData.rightAds?.length > 0) && (
              <div
                style={{
                  height: resolvedStripHeight,
                  width: '100%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  borderRadius: 12
                }}
              >
                <SignageAdSlot
                  placement={adsData.leftAds?.length > 0 ? 'LEFT' : 'RIGHT'}
                  ads={adsData.leftAds?.length > 0 ? adsData.leftAds : adsData.rightAds}
                  isPaused={false}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            )}

            {/* Main Arena Content in Portrait */}
            <div className="signage-main-arena-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Header inside portrait */}
              <header
                className="display-header-desktop display-theme-transition"
                style={{
                  background: 'var(--display-surface)',
                  border: '1px solid var(--display-border)',
                  borderRadius: 16,
                  padding: '8px 16px',
                  marginBottom: 'clamp(0.6rem, 1.2vh, 1rem)',
                  boxShadow: 'var(--display-shadow-subtle)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <Link
                    to={`/tournaments/${id}`}
                    title="Back to Tournament"
                    aria-label="Back to Tournament"
                    style={{
                      width: 44,
                      height: 44,
                      minWidth: 44,
                      minHeight: 44,
                      borderRadius: 12,
                      background: 'var(--display-surface-elevated)',
                      border: '1px solid var(--display-border)',
                      color: 'var(--display-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={18} />
                  </Link>
                  <div style={{ minWidth: 0 }}>
                    <h1 style={{ fontSize: 'clamp(1rem, 1.4vw, 1.35rem)', fontWeight: 900, color: 'var(--display-text-primary)', margin: 0 }}>
                      {tournament?.name || 'Tournament Arena Live Display'}
                    </h1>
                    <div style={{ fontSize: '0.78rem', color: 'var(--display-text-secondary)' }}>
                      {tournament?.city || 'Sports Arena'} • Official Live Match Broadcast
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setDisplayOrientation(prev => prev === 'LANDSCAPE' ? 'PORTRAIT' : prev === 'PORTRAIT' ? 'AUTO' : 'LANDSCAPE')}
                    aria-label="Toggle Orientation"
                    style={{
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 12,
                      background: 'var(--display-surface-elevated)',
                      border: '1px solid var(--display-accent)',
                      color: 'var(--display-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCw size={16} />
                    <span>Portrait (9:16)</span>
                  </button>
                  <button
                    onClick={() => dispatch(toggleTheme())}
                    suppressHydrationWarning
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--display-surface-elevated)',
                      border: '1px solid var(--display-border)',
                      color: 'var(--display-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {mounted && currentTheme === 'light' ? (
                      <Moon size={18} color="var(--display-boundary-purple)" />
                    ) : (
                      <Sun size={18} color="var(--display-warning-amber)" />
                    )}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--display-surface-elevated)',
                      border: '1px solid var(--display-border)',
                      color: 'var(--display-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </header>

              <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--display-text-secondary)', gap: 12, background: 'var(--display-surface)', borderRadius: 18, border: '1px solid var(--display-border)' }}>
                    <Radio size={36} className="animate-pulse" color="var(--display-accent)" />
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Connecting to Stadium Live Feed...</div>
                  </div>
                ) : matchCount === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--display-surface)', borderRadius: 18, border: '1px dashed var(--display-border)', padding: '2rem', textAlign: 'center' }}>
                    <Radio size={44} color="var(--display-text-muted)" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 900, color: 'var(--display-text-primary)' }}>No matches selected for display</h2>
                    <p style={{ color: 'var(--display-text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: 480 }}>No matches are currently selected for Signage TV display. Organizers can select matches in the Live Matches tab.</p>
                  </div>
                ) : matchCount === 1 ? (
                  <MatchCardHero match={displayMatches[0]} />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', flex: 1, minHeight: 0 }}>
                    {displayMatches.map((m) => (
                      <MatchCardGrid key={m.id} match={m} matchCount={matchCount} />
                    ))}
                  </div>
                )}
              </main>
            </div>

            {/* Optional Horizontal Sponsor Strip Below Content */}
            {isSidebarEnabled && sidebarsMode === 'STRIP' && adsData.leftAds?.length > 0 && adsData.rightAds?.length > 0 && (
              <div
                style={{
                  height: resolvedStripHeight,
                  width: '100%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  borderRadius: 12
                }}
              >
                <SignageAdSlot
                  placement="RIGHT"
                  ads={adsData.rightAds}
                  isPaused={false}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── BOTTOM AD TICKER / SPONSOR STRIP WITH REAL-TIME CONFIGURABLE HEIGHT ── */}
        {showBottomAd && (
          <div
            style={{
              height: resolvedBottomHeight,
              width: '100%',
              overflow: 'hidden',
              flexShrink: 0,
              marginTop: 'clamp(0.5rem, 1vh, 0.75rem)',
              borderRadius: 10,
              transition: 'height 0.25s ease'
            }}
          >
            <SignageAdSlot
              placement="BOTTOM"
              ads={adsData.bottomAds}
              isPaused={isBottomAdPaused}
              style={{ height: '100%', width: '100%', marginTop: 0 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   BALL CHIP OUTCOME STYLING HELPER
   dot = neutral gray, 1/2/3 = neutral, 4 = green, 6 = purple,
   wicket = red, WD/NB = amber.
   ───────────────────────────────────────────────────────────── */
const getBallChipStyle = (ball) => {
  const b = String(ball || '').trim().toUpperCase();

  if (b === '4') {
    return {
      background: 'var(--display-success-green)',
      color: '#ffffff',
      border: '1px solid var(--display-success-green)'
    };
  }
  if (b === '6') {
    return {
      background: 'var(--display-boundary-purple)',
      color: '#ffffff',
      border: '1px solid var(--display-boundary-purple)'
    };
  }
  if (b === 'W' || b.includes('OUT') || b.includes('WKT')) {
    return {
      background: 'var(--display-live-red)',
      color: '#ffffff',
      border: '1px solid var(--display-live-red)'
    };
  }
  if (b.includes('WD') || b.includes('NB') || b === 'B' || b === 'LB') {
    return {
      background: 'var(--display-warning-amber)',
      color: '#ffffff',
      border: '1px solid var(--display-warning-amber)'
    };
  }
  if (b === '•' || b === '0' || b === '.') {
    return {
      background: 'var(--display-surface-elevated)',
      color: 'var(--display-text-muted)',
      border: '1px solid var(--display-border)'
    };
  }
  // 1, 2, 3 neutral
  return {
    background: 'var(--display-chip-neutral)',
    color: 'var(--display-chip-neutral-text)',
    border: '1px solid var(--display-border)'
  };
};

/* ─────────────────────────────────────────────────────────────
   HERO MATCH CARD (1 Match Live)
   Desktop (1024px+): Grouped hero score card (left) + 3 stacked cards (right)
   Phone (<768px): Mobile layout preserved
   ───────────────────────────────────────────────────────────── */
const MatchCardHero = ({ match }) => {
  const isRacquetSport = ['pickleball', 'badminton', 'tennis', 'table-tennis'].includes(match.sportSlug?.toLowerCase());

  if (isRacquetSport) {
    const courtState = getCourtState(match);
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

    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: 'var(--display-surface)',
        border: '1px solid var(--display-border)',
        borderRadius: 18,
        padding: 'clamp(0.8rem, 1.6vh, 1.4rem)',
        boxShadow: 'var(--display-shadow)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}>
        {/* Top Header Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexShrink: 0, marginBottom: '0.35rem' }}>
          <span style={{
            fontSize: 'clamp(0.68rem, 0.9vw, 0.8rem)',
            fontWeight: 800,
            background: 'var(--display-accent-subtle)',
            border: '1px solid var(--display-accent)',
            color: 'var(--display-accent)',
            padding: '2px 10px',
            borderRadius: 20,
            textTransform: 'uppercase'
          }}>
            {match.sportSlug?.toUpperCase()} • {match.courtName || 'Court 1'} • MATCH #{match.matchNumber || 1}
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color: match.status === 'LIVE' ? '#10b981' : 'var(--display-text-muted)',
            background: match.status === 'LIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            padding: '2px 10px',
            borderRadius: 12
          }}>
            {match.status === 'LIVE' ? '🔴 LIVE ON DISPLAY' : match.status}
          </span>
        </div>

        {/* 3-Column Header Strip with Non-Wrapping Score */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 'clamp(0.5rem, 1.5vw, 1.5rem)',
          width: '100%',
          flexShrink: 0,
          margin: '0.2rem 0'
        }}>
          {/* Team A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
            {match.teamA?.logo ? (
              <img
                src={match.teamA.logo}
                alt={match.teamA.name}
                style={{ width: 'clamp(44px, 4.5vw, 64px)', height: 'clamp(44px, 4.5vw, 64px)', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--display-border)' }}
              />
            ) : (
              <div style={{
                width: 'clamp(44px, 4.5vw, 64px)',
                height: 'clamp(44px, 4.5vw, 64px)',
                borderRadius: '50%',
                background: 'var(--display-accent-subtle)',
                color: 'var(--display-accent)',
                fontWeight: 900,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {(match.teamA?.name || 'A').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
              fontWeight: 900,
              color: 'var(--display-text-primary)',
              marginTop: '0.3rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {match.teamA?.name}
            </div>
            {isTeamAServing ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 9px',
                borderRadius: 14,
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                marginTop: '0.15rem'
              }}>
                🏸 SERVE
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 9px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--display-text-muted)',
                fontSize: '0.68rem',
                fontWeight: 700,
                marginTop: '0.15rem'
              }}>
                RECEIVING
              </span>
            )}
          </div>

          {/* Center Point Score & Sets Won */}
          <div style={{
            background: 'var(--display-surface-elevated, rgba(15, 23, 42, 0.8))',
            padding: 'clamp(0.4rem, 0.8vh, 0.75rem) clamp(0.9rem, 1.8vw, 1.8rem)',
            borderRadius: 16,
            border: '2px solid var(--display-border)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: 'clamp(2rem, 4vw, 3.8rem)',
              fontWeight: 950,
              color: 'var(--display-accent)',
              lineHeight: 1,
              letterSpacing: '-1px',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap'
            }}>
              {mainScoreText}
            </div>
            {gamesWonText && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 'clamp(0.68rem, 0.9vw, 0.82rem)',
                fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '2px 9px',
                borderRadius: 14,
                marginTop: '0.3rem',
                whiteSpace: 'nowrap'
              }}>
                {gamesWonText}
              </div>
            )}
          </div>

          {/* Team B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
            {match.teamB?.logo ? (
              <img
                src={match.teamB.logo}
                alt={match.teamB.name}
                style={{ width: 'clamp(44px, 4.5vw, 64px)', height: 'clamp(44px, 4.5vw, 64px)', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--display-border)' }}
              />
            ) : (
              <div style={{
                width: 'clamp(44px, 4.5vw, 64px)',
                height: 'clamp(44px, 4.5vw, 64px)',
                borderRadius: '50%',
                background: 'var(--display-accent-subtle)',
                color: 'var(--display-accent)',
                fontWeight: 900,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {(match.teamB?.name || 'B').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
              fontWeight: 900,
              color: 'var(--display-text-primary)',
              marginTop: '0.3rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {match.teamB?.name}
            </div>
            {!isTeamAServing ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 9px',
                borderRadius: 14,
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                marginTop: '0.15rem'
              }}>
                🏸 SERVE
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 9px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--display-text-muted)',
                fontSize: '0.68rem',
                fontWeight: 700,
                marginTop: '0.15rem'
              }}>
                RECEIVING
              </span>
            )}
          </div>
        </div>

        {/* Central Responsive Animated Court Visual */}
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
            courtColor={match.courtColor || '#0d5c3a'}
            courtAds={match.courtAds || []}
            courtMiddleAds={adsData.courtMiddleAds || []}
            ambientRally={true}
          />
        </div>

        {/* Serving Status Strip Under Court */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--display-border)',
          paddingTop: '0.5rem',
          color: 'var(--display-text-muted)',
          fontSize: 'clamp(0.72rem, 0.9vw, 0.85rem)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '0.4rem'
        }}>
          <span style={{ color: '#34d399', fontWeight: 800 }}>
            {servingStatusText}
          </span>
          <span>{match.venueName || 'Turf Arena'}</span>
        </div>
      </div>
    );
  }

  const state = match.score?.details || {};
  const striker = state.striker;
  const nonStriker = state.nonStriker;
  const bowler = state.bowler;
  const currentOverBalls = state.currentOverBalls || [];

  const summaryRaw = match.score?.summary || '0/0';
  const matchParts = summaryRaw.match(/^([^\(]+?)(?:\s*\(([^)]+)\))?$/);
  const mainScoreText = matchParts ? matchParts[1].trim() : summaryRaw;
  const oversExtracted =
    matchParts && matchParts[2]
      ? matchParts[2].trim()
      : state.overs
      ? `${state.overs} ov`
      : '';

  const isTeamABatting = state.battingTeamName === match.teamA?.name;
  const isTeamBBatting = state.battingTeamName === match.teamB?.name;
  const isMatchCompleted = match.status === 'COMPLETED' || match.status === 'FINISHED';

  return (
    <div
      className="display-match-layout display-theme-transition"
      style={{
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* ── LEFT COLUMN: HERO SCORE CARD ── */}
      <div
        className="display-theme-transition"
        style={{
          background: 'var(--display-surface)',
          border: '1px solid var(--display-border)',
          borderRadius: 18,
          padding: 'clamp(0.8rem, 1.8vh, 1.6rem)',
          boxShadow: 'var(--display-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.6rem, 1.2vh, 1.2rem)',
          justifyContent: 'flex-start',
          position: 'relative'
        }}
      >
        {/* Match Tag & Venue Hierarchy */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span
            style={{
              fontSize: 'clamp(0.68rem, 0.9vw, 0.8rem)',
              fontWeight: 800,
              background: 'var(--display-accent-subtle)',
              border: '1px solid var(--display-accent)',
              color: 'var(--display-accent)',
              padding: '2px 10px',
              borderRadius: 20,
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}
          >
            {match.courtName || 'Main Pitch'} • MATCH #{match.matchNumber || 1}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isMatchCompleted && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  background: 'var(--display-accent)',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <CheckCircle2 size={12} /> WON
              </span>
            )}
            <span
              style={{
                fontSize: 'clamp(0.68rem, 0.85vw, 0.78rem)',
                fontWeight: 600,
                color: 'var(--display-text-muted)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              {match.venueName || 'Sports Stadium'}
            </span>
          </div>
        </div>

        {/* Teams Row: Grouped & Balanced at Top */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 'clamp(0.5rem, 1.2vw, 1.2rem)',
            background: 'var(--display-surface-elevated)',
            border: '1px solid var(--display-border-subtle)',
            borderRadius: 14,
            padding: 'clamp(0.5rem, 1vh, 0.9rem) clamp(0.75rem, 1.5vw, 1.2rem)'
          }}
        >
          {/* Team A */}
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div
              style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
                fontWeight: 900,
                color: 'var(--display-text-primary)',
                letterSpacing: '-0.3px',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {match.teamA?.name}
            </div>
            <div
              style={{
                fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)',
                fontWeight: 800,
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: isTeamABatting ? 'var(--display-accent)' : 'var(--display-text-muted)'
              }}
            >
              {isTeamABatting ? (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--display-accent)',
                      display: 'inline-block'
                    }}
                    className="animate-pulse"
                  />
                  BATTING NOW
                </>
              ) : (
                'BOWLING'
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div
            style={{
              background: 'var(--display-surface)',
              border: '1px solid var(--display-border)',
              borderRadius: '50%',
              width: 'clamp(30px, 3.2vw, 38px)',
              height: 'clamp(30px, 3.2vw, 38px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(0.7rem, 0.85vw, 0.8rem)',
              fontWeight: 900,
              color: 'var(--display-text-muted)',
              flexShrink: 0
            }}
          >
            VS
          </div>

          {/* Team B */}
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div
              style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
                fontWeight: 900,
                color: 'var(--display-text-primary)',
                letterSpacing: '-0.3px',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {match.teamB?.name}
            </div>
            <div
              style={{
                fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)',
                fontWeight: 800,
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 5,
                color: isTeamBBatting ? 'var(--display-accent)' : 'var(--display-text-muted)'
              }}
            >
              {isTeamBBatting ? (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--display-accent)',
                      display: 'inline-block'
                    }}
                    className="animate-pulse"
                  />
                  BATTING NOW
                </>
              ) : (
                'BOWLING'
              )}
            </div>
          </div>
        </div>

        {/* Directly Below: Very Large Bold Score with Tabular Numerals (No Dead Space) */}
        <div
          style={{
            textAlign: 'center',
            padding: 'clamp(0.5rem, 1.5vh, 1.2rem) 0'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(3.5rem, 6.5vw, 5.8rem)',
              fontWeight: 950,
              color: 'var(--display-accent)',
              letterSpacing: '-2px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              animation: 'scoreNumberUpdate 0.3s ease-out'
            }}
          >
            {mainScoreText}
          </div>

          {/* Batting Team Label / Equation Subtext */}
          <div
            style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)',
              fontWeight: 700,
              color: 'var(--display-text-primary)',
              marginTop: 'clamp(0.4rem, 0.8vh, 0.6rem)',
              letterSpacing: '0.3px'
            }}
          >
            {match.score?.subtext || `${state.battingTeamName || 'Batting Team'} Batting`}
          </div>

          {/* Stat Chips: Overs, CRR, Target, RRR */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'clamp(0.4rem, 1vw, 0.75rem)',
              marginTop: 'clamp(0.5rem, 1vh, 0.85rem)'
            }}
          >
            {(oversExtracted || state.overs) && (
              <span
                style={{
                  fontSize: 'clamp(0.72rem, 0.9vw, 0.85rem)',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--display-chip-neutral)',
                  color: 'var(--display-chip-neutral-text)',
                  border: '1px solid var(--display-border)'
                }}
              >
                OVERS{' '}
                <strong style={{ color: 'var(--display-text-primary)' }}>
                  {(oversExtracted || state.overs).replace(' ov', '')}
                </strong>
              </span>
            )}

            {state.crr && (
              <span
                style={{
                  fontSize: 'clamp(0.72rem, 0.9vw, 0.85rem)',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--display-chip-neutral)',
                  color: 'var(--display-chip-neutral-text)',
                  border: '1px solid var(--display-border)'
                }}
              >
                CRR <strong style={{ color: 'var(--display-text-primary)' }}>{state.crr}</strong>
              </span>
            )}

            {state.target && (
              <span
                style={{
                  fontSize: 'clamp(0.72rem, 0.9vw, 0.85rem)',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--display-warning-amber-subtle)',
                  color: 'var(--display-warning-amber)',
                  border: '1px solid var(--display-warning-amber)'
                }}
              >
                TARGET <strong>{state.target}</strong>
              </span>
            )}

            {state.rrr && (
              <span
                style={{
                  fontSize: 'clamp(0.72rem, 0.9vw, 0.85rem)',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--display-live-red-subtle)',
                  color: 'var(--display-live-red)',
                  border: '1px solid var(--display-live-red)'
                }}
              >
                RRR <strong>{state.rrr}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: THREE STACKED CARDS (BATTERS, BOWLER, THIS OVER) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.6rem, 1.2vh, 1rem)'
        }}
      >
        {/* Card 1: Batters */}
        <div
          className="display-theme-transition"
          style={{
            background: 'var(--display-surface)',
            border: '1px solid var(--display-border)',
            borderRadius: 18,
            padding: 'clamp(0.7rem, 1.4vh, 1.2rem)',
            boxShadow: 'var(--display-shadow)'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(0.65rem, 0.8vw, 0.72rem)',
              color: 'var(--display-text-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 6
            }}
          >
            CURRENT BATTERS
          </div>

          {/* Striker Row */}
          <div className="player-row">
            <div
              style={{
                fontSize: 'clamp(0.82rem, 1.1vw, 1rem)',
                fontWeight: 800,
                color: 'var(--display-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ color: 'var(--display-accent)' }}>🏏</span>
              <span>{striker?.name || 'Striker'}</span>
              <span style={{ color: 'var(--display-accent)', fontWeight: 900 }}>*</span>
            </div>

            {/* Fixed-Width Stats Column */}
            <div className="stats-column">
              <span
                style={{
                  fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)',
                  fontWeight: 900,
                  color: 'var(--display-text-primary)'
                }}
              >
                {striker?.runs ?? 0}
              </span>
              <span
                style={{
                  color: 'var(--display-text-muted)',
                  fontSize: '0.8em',
                  fontWeight: 500
                }}
              >
                ({striker?.balls ?? 0}b)
              </span>
              {(striker?.fours !== undefined || striker?.sixes !== undefined) && (
                <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                  <span
                    style={{
                      fontSize: '0.7em',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'var(--display-chip-neutral)',
                      color: 'var(--display-text-secondary)',
                      fontWeight: 700
                    }}
                  >
                    4s:{striker?.fours ?? 0}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7em',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'var(--display-chip-neutral)',
                      color: 'var(--display-text-secondary)',
                      fontWeight: 700
                    }}
                  >
                    6s:{striker?.sixes ?? 0}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Non-Striker Row */}
          {nonStriker && (
            <div className="player-row" style={{ marginTop: 2 }}>
              <div
                style={{
                  fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
                  fontWeight: 600,
                  color: 'var(--display-text-secondary)',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {nonStriker.name}
              </div>

              <div className="stats-column">
                <span
                  style={{
                    fontSize: 'clamp(0.82rem, 1.05vw, 1rem)',
                    fontWeight: 800,
                    color: 'var(--display-text-secondary)'
                  }}
                >
                  {nonStriker.runs ?? 0}
                </span>
                <span
                  style={{
                    color: 'var(--display-text-muted)',
                    fontSize: '0.8em',
                    fontWeight: 500
                  }}
                >
                  ({nonStriker.balls ?? 0}b)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Bowler */}
        <div
          className="display-theme-transition"
          style={{
            background: 'var(--display-surface)',
            border: '1px solid var(--display-border)',
            borderRadius: 18,
            padding: 'clamp(0.7rem, 1.4vh, 1.2rem)',
            boxShadow: 'var(--display-shadow)'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(0.65rem, 0.8vw, 0.72rem)',
              color: 'var(--display-text-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 6
            }}
          >
            CURRENT BOWLER
          </div>

          <div className="player-row">
            <div
              style={{
                fontSize: 'clamp(0.82rem, 1.1vw, 1rem)',
                fontWeight: 800,
                color: 'var(--display-text-primary)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {bowler?.name || 'Current Bowler'}
            </div>

            <div className="stats-column">
              <span
                style={{
                  fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)',
                  fontWeight: 900,
                  color: 'var(--display-text-primary)'
                }}
              >
                {bowler?.wickets ?? 0}/{bowler?.runs ?? 0}
              </span>
              <span
                style={{
                  color: 'var(--display-text-muted)',
                  fontSize: '0.8em',
                  fontWeight: 500
                }}
              >
                ({bowler?.overs ?? '0.0'} ov)
              </span>
              {bowler?.economy && (
                <span
                  style={{
                    fontSize: '0.7em',
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'var(--display-chip-neutral)',
                    color: 'var(--display-text-secondary)',
                    fontWeight: 700,
                    marginLeft: 4
                  }}
                >
                  Econ:{bowler.economy}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: This Over (Larger Ball Chips 44-56px on Desktop) */}
        <div
          className="display-theme-transition"
          style={{
            background: 'var(--display-surface)',
            border: '1px solid var(--display-border)',
            borderRadius: 18,
            padding: 'clamp(0.7rem, 1.4vh, 1.2rem)',
            boxShadow: 'var(--display-shadow)'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(0.65rem, 0.8vw, 0.72rem)',
              color: 'var(--display-text-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 8
            }}
          >
            THIS OVER
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'clamp(6px, 1.2vw, 12px)',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            {currentOverBalls.length > 0 ? (
              currentOverBalls.map((b, i) => {
                const style = getBallChipStyle(b);
                const isNewest = i === currentOverBalls.length - 1;
                return (
                  <span
                    key={`${i}-${b}`}
                    className={`this-over-ball-chip ${isNewest ? 'new-ball-enter' : ''}`}
                    style={style}
                  >
                    {b}
                  </span>
                );
              })
            ) : (
              <span
                style={{
                  fontSize: 'clamp(0.75rem, 1vw, 0.88rem)',
                  color: 'var(--display-text-muted)',
                  fontStyle: 'italic'
                }}
              >
                Over in progress...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   GRID MATCH CARD (Multi-Match Mode)
   ───────────────────────────────────────────────────────────── */
const MatchCardGrid = ({ match, matchCount }) => {
  const isRacquetSport = ['pickleball', 'badminton', 'tennis', 'table-tennis'].includes(match.sportSlug?.toLowerCase());

  if (isRacquetSport) {
    const parsed = parseRacquetScoreDetails(match);
    const { sportSlug, mainScoreText, gamesWonText, servingSide, serverCourt, serverNumber, servingTeamName } = parsed;
    return (
      <div
        className="display-theme-transition"
        style={{
          position: 'relative',
          background: 'var(--display-surface)',
          borderRadius: 16,
          border: '1px solid var(--display-border)',
          padding: 'clamp(0.6rem, 1.2vh, 1rem)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--display-shadow-subtle)',
          overflow: 'hidden',
          gap: '0.35rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'clamp(0.62rem, 0.78vw, 0.72rem)', fontWeight: 800, background: 'var(--display-accent-subtle)', border: '1px solid var(--display-accent)', color: 'var(--display-accent)', padding: '2px 8px', borderRadius: 6 }}>
            {match.courtName || 'Court'} • M#{match.matchNumber}
          </span>
          <span style={{ fontSize: 'clamp(0.62rem, 0.75vw, 0.7rem)', color: match.status === 'LIVE' ? '#10b981' : 'var(--display-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
            {match.status === 'LIVE' ? '🔴 LIVE' : match.status}
          </span>
        </div>

        {/* Teams and Score */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.4rem', margin: '2px 0' }}>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)', fontWeight: 900, color: 'var(--display-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.teamA?.name}
            </div>
            {servingSide === 'team_a' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                SERVE
              </span>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.85rem)', fontWeight: 950, color: 'var(--display-accent)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {mainScoreText}
            </div>
            {gamesWonText && (
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', marginTop: 2, whiteSpace: 'nowrap' }}>
                {gamesWonText}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)', fontWeight: 900, color: 'var(--display-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.teamB?.name}
            </div>
            {servingSide === 'team_b' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                SERVE
              </span>
            )}
          </div>
        </div>

        {/* Compact Court Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0', maxHeight: '140px', overflow: 'hidden' }}>
          <CourtView
            match={match}
            courtColor={match.courtColor || '#0d5c3a'}
            compact={true}
            ambientRally={true}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--display-border)', paddingTop: '0.25rem', fontSize: '0.68rem', color: 'var(--display-text-muted)' }}>
          <span>Serving: <strong style={{ color: '#10b981' }}>{servingTeamName}</strong></span>
          <span>{match.venueName || 'Court'}</span>
        </div>
      </div>
    );
  }

  const state = match.score?.details || {};
  const currentOverBalls = state.currentOverBalls || [];

  const summaryRaw = match.score?.summary || '0/0';
  const matchParts = summaryRaw.match(/^([^\(]+?)(?:\s*\(([^)]+)\))?$/);
  const mainScoreText = matchParts ? matchParts[1].trim() : summaryRaw;
  const oversExtracted =
    matchParts && matchParts[2]
      ? matchParts[2].trim()
      : state.overs
      ? `${state.overs} ov`
      : '';

  const isTeamABatting = state.battingTeamName === match.teamA?.name;
  const isTeamBBatting = state.battingTeamName === match.teamB?.name;

  return (
    <div
      className="display-theme-transition"
      style={{
        position: 'relative',
        background: 'var(--display-surface)',
        borderRadius: 16,
        border: '1px solid var(--display-border)',
        padding: 'clamp(0.6rem, 1.2vh, 1rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--display-shadow-subtle)',
        overflow: 'hidden',
        gap: '0.4rem'
      }}
    >
      {/* Card Header: Court & Sport Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 'clamp(0.62rem, 0.78vw, 0.72rem)',
            fontWeight: 800,
            background: 'var(--display-accent-subtle)',
            border: '1px solid var(--display-accent)',
            color: 'var(--display-accent)',
            padding: '2px 8px',
            borderRadius: 6
          }}
        >
          {match.courtName || 'Court'} • M#{match.matchNumber}
        </span>

        <span
          style={{
            fontSize: 'clamp(0.62rem, 0.75vw, 0.7rem)',
            color: 'var(--display-text-muted)',
            textTransform: 'uppercase',
            fontWeight: 700
          }}
        >
          {match.venueName || 'Pitch'}
        </span>
      </div>

      {/* Teams Lineup */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '0.4rem',
          margin: '2px 0'
        }}
      >
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div
            style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)',
              fontWeight: 900,
              color: 'var(--display-text-primary)',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {match.teamA?.name}
          </div>
          <div
            style={{
              fontSize: 'clamp(0.6rem, 0.72vw, 0.68rem)',
              color: isTeamABatting ? 'var(--display-accent)' : 'var(--display-text-muted)',
              fontWeight: 700,
              marginTop: 1
            }}
          >
            {isTeamABatting ? 'Batting' : 'Bowling'}
          </div>
        </div>

        <div style={{ fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)', fontWeight: 900, color: 'var(--display-text-muted)' }}>
          VS
        </div>

        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div
            style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)',
              fontWeight: 900,
              color: 'var(--display-text-primary)',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {match.teamB?.name}
          </div>
          <div
            style={{
              fontSize: 'clamp(0.6rem, 0.72vw, 0.68rem)',
              color: isTeamBBatting ? 'var(--display-accent)' : 'var(--display-text-muted)',
              fontWeight: 700,
              marginTop: 1
            }}
          >
            {isTeamBBatting ? 'Batting' : 'Bowling'}
          </div>
        </div>
      </div>

      {/* Main Score Box */}
      <div
        style={{
          textAlign: 'center',
          background: 'var(--display-surface-elevated)',
          padding: 'clamp(0.4rem, 1vh, 0.8rem)',
          borderRadius: 12,
          border: '1px solid var(--display-border)'
        }}
      >
        <div
          style={{
            fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
            fontWeight: 950,
            color: 'var(--display-accent)',
            letterSpacing: '-1px',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {mainScoreText}
        </div>

        {match.score?.subtext && (
          <div
            style={{
              fontSize: 'clamp(0.68rem, 0.85vw, 0.78rem)',
              color: 'var(--display-text-secondary)',
              marginTop: 3,
              fontWeight: 700
            }}
          >
            {match.score.subtext}
          </div>
        )}
      </div>

      {/* Footer Info / Overs & Ball Chips */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'clamp(0.65rem, 0.75vw, 0.72rem)',
          color: 'var(--display-text-muted)',
          fontWeight: 700,
          marginTop: 2
        }}
      >
        <span>CRR: {state.crr || '—'}</span>

        {(oversExtracted || state.overs) && (
          <span style={{ color: 'var(--display-text-primary)', fontWeight: 800 }}>
            Overs: {(oversExtracted || state.overs).replace(' ov', '')}
          </span>
        )}

        {/* Mini Ball Chips Trail */}
        {currentOverBalls.length > 0 && (
          <div style={{ display: 'flex', gap: 3 }}>
            {currentOverBalls.slice(-4).map((b, i) => {
              const style = getBallChipStyle(b);
              return (
                <span
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    ...style
                  }}
                >
                  {b}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignageDisplayPage;
