'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { socket } from '../services/socket';
import { useTournamentLive } from '../hooks/useTournamentLive';
import { getActiveSignageAdsApi } from '../services/advertisementService';
import { toggleTheme } from '../features/theme/themeSlice';
import LiveBallCelebrationOverlay from '../components/signage/LiveBallCelebrationOverlay';
import SignageAdSlot from '../components/signage/SignageAdSlot';
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
  CheckCircle2
} from 'lucide-react';

/**
 * Public Live Tournament Display Page
 * Responsive: Phone (360-430px), Tablet (768-1023px), Desktop (1024px+), TV (1600px+)
 * Dual Theme (Dark & Light) via pure CSS tokens with live ball-event animations.
 */
const SignageDisplayPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const reduxTheme = useSelector((state) => state.theme?.mode) || 'dark';

  // Synchronized theme state with DOM data-theme attribute
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || reduxTheme || 'dark';
    }
    return reduxTheme || 'dark';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const active = document.documentElement.getAttribute('data-theme') || 'dark';
      setCurrentTheme(active);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);

  // Core Tournament & Match State
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(socket.connected);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Advertisements State
  const [adsData, setAdsData] = useState({
    topAds: [],
    bottomAds: [],
    leftAds: [],
    rightAds: [],
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
  const fetchLiveMatches = async () => {
    try {
      const [tournRes, liveRes] = await Promise.all([
        axios.get(`/api/tournaments/${id}`),
        axios.get(`/api/tournaments/${id}/live`)
      ]);
      if (tournRes.data.success) setTournament(tournRes.data.data);
      if (liveRes.data.success) setMatches(liveRes.data.data.items || []);
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
    setLoading(true);
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

    socket.on('signage:adUpdated', handleAdUpdate);
    socket.on('signage:adAdded', handleAdUpdate);
    socket.on('signage:adRemoved', handleAdUpdate);
    socket.on('signage:adPaused', handleAdPaused);
    socket.on('signage:adResumed', handleAdResumed);
    socket.on('signage:adsDisabled', handleAdsDisabled);
    socket.on('signage:adsEnabled', handleAdsEnabled);

    return () => {
      socket.off('signage:adUpdated', handleAdUpdate);
      socket.off('signage:adAdded', handleAdUpdate);
      socket.off('signage:adRemoved', handleAdUpdate);
      socket.off('signage:adPaused', handleAdPaused);
      socket.off('signage:adResumed', handleAdResumed);
      socket.off('signage:adsDisabled', handleAdsDisabled);
      socket.off('signage:adsEnabled', handleAdsEnabled);
    };
  }, []);

  // Top Ad Rotation (Crossfade every 10 seconds if multiple active top ads)
  useEffect(() => {
    if (!adsData.topAds || adsData.topAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTopAdIndex((prev) => (prev + 1) % adsData.topAds.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [adsData.topAds]);

  // Handle incoming live score update from Socket.IO room tournament:{id}
  const handleLiveMatchUpdate = useCallback((data) => {
    if (!data?.matchId) return;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === data.matchId) {
          return {
            ...m,
            status: data.status || m.status,
            score: {
              ...m.score,
              summary: data.liveScoreSummary || m.score?.summary,
              subtext: data.liveSubtext || m.score?.subtext,
              details: data.state || m.score?.details
            }
          };
        }
        return m;
      })
    );
  }, []);

  useTournamentLive(id, handleLiveMatchUpdate);

  // ── LIVE BALL-EVENT HOOK (STABLE MONOTONIC PIPELINE) ──
  const { activeEvent, dismissEvent } = useBallEvents(matches[0]);

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
  const matchCount = matches.length;

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

      {/* ── MAIN CENTERED CONTAINER (MAX-WIDTH 1280px / FLUID PADDING) ── */}
      <div className="display-inner-wrapper">
        {/* ── TOP AD BANNER WITH CONFIGURABLE SIZING, FIT, MOTION & PRESET ── */}
        {showTopAd && (
          <SignageAdSlot
            placement="TOP"
            ads={adsData.topAds}
            isPaused={!isAdsGlobalEnabled}
          />
        )}

        {/* ── SIDEBARS + ARENA SCOREBOARD CONTAINER ── */}
        <div className="signage-layout-with-sidebars">
          {/* Left Sidebar Ad Slot */}
          {isAdsGlobalEnabled && adsData.state?.sidebarAdsEnabled !== false && adsData.leftAds && adsData.leftAds.length > 0 && (
            <SignageAdSlot
              placement="LEFT"
              ads={adsData.leftAds}
              isPaused={adsData.state?.leftSidebarPaused}
            />
          )}

          {/* Main Central Arena Content */}
          <div className="signage-main-arena-content">

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

            {/* Theme Toggle Button (44px) */}
            <button
              onClick={() => dispatch(toggleTheme())}
              aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
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
              {currentTheme === 'dark' ? (
                <Sun size={18} color="var(--display-warning-amber)" />
              ) : (
                <Moon size={18} color="var(--display-boundary-purple)" />
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
              <button
                onClick={() => dispatch(toggleTheme())}
                aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
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
                {currentTheme === 'dark' ? (
                  <Sun size={18} color="var(--display-warning-amber)" />
                ) : (
                  <Moon size={18} color="var(--display-boundary-purple)" />
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
                Waiting for Live Match
              </h2>
              <p
                style={{
                  color: 'var(--display-text-secondary)',
                  fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
                  marginTop: '0.5rem',
                  maxWidth: 480
                }}
              >
                No matches are currently active on court resources. The display will automatically
                update when play commences.
              </p>
            </div>
          ) : matchCount === 1 ? (
            /* ── 1 MATCH: STADIUM HERO PRESENTATION ── */
            <MatchCardHero match={matches[0]} />
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
              {matches.map((m) => (
                <MatchCardGrid key={m.id} match={m} matchCount={matchCount} />
              ))}
            </div>
          )}
        </main>
          </div>

          {/* Right Sidebar Ad Slot */}
          {isAdsGlobalEnabled && adsData.state?.sidebarAdsEnabled !== false && adsData.rightAds && adsData.rightAds.length > 0 && (
            <SignageAdSlot
              placement="RIGHT"
              ads={adsData.rightAds}
              isPaused={adsData.state?.rightSidebarPaused}
            />
          )}
        </div>

        {/* ── BOTTOM AD TICKER / SPONSOR STRIP (WITH ADJUSTABLE SIZING & MOTION) ── */}
        {showBottomAd && (
          <SignageAdSlot
            placement="BOTTOM"
            ads={adsData.bottomAds}
            isPaused={isBottomAdPaused}
          />
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
