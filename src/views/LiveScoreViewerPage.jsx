'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { socket } from '../services/socket';
import { getActiveSignageAdsApi } from '../services/advertisementService';
import LiveStreamPlayer from '../components/streaming/LiveStreamPlayer';
import TeamLogoAvatar from '../components/common/TeamLogoAvatar';
import CourtView from '../components/court/CourtView';
import MobileAdStrip from '../components/ads/MobileAdStrip';
import {
  Radio, ArrowLeft, Share2, Check, Wifi, WifiOff,
  Clock, Calendar, Trophy, AlertCircle, RefreshCw, Zap,
  ExternalLink, X, Shield, Users, Activity, Eye
} from 'lucide-react';

/**
 * Mobile-First Read-Only Live Score & Stream Viewer
 * Compatible with all sports: Pickleball, Cricket, Football, Badminton, Tennis, etc.
 * Zero write endpoints. Accessible to guests and all user roles.
 */
export default function LiveScoreViewerPage({
  tournamentId: propsTournamentId,
  matchId: propsMatchId
}) {
  const nextParams = useParams() || {};
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Determine if this route is specifically for a match or tournament
  const isMatchRoute = Boolean(propsMatchId) || (pathname ? pathname.includes('/matches/') : false);
  const isTournamentRoute = Boolean(propsTournamentId) || (pathname ? pathname.includes('/tournaments/') : false);

  // Extract IDs from pathname
  const pathMatchId = pathname && pathname.includes('/matches/') ? pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const pathTournId = pathname && pathname.includes('/tournaments/') ? pathname.match(/\/tournaments\/([^/]+)/)?.[1] : null;

  // Resolve initial tournamentId and matchId accurately
  const initialTournamentId = propsTournamentId || pathTournId || (
    !isMatchRoute && nextParams?.id ? nextParams.id : null
  );

  const initialMatchId = propsMatchId || pathMatchId || (
    isMatchRoute && nextParams?.id ? nextParams.id : null
  ) || (
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('matchId') : null
  );

  const [tournamentId, setTournamentId] = useState(initialTournamentId);
  const [activeMatchId, setActiveMatchId] = useState(initialMatchId);

  // Core Data States
  const [tournament, setTournament] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [events, setEvents] = useState([]);
  const [adsData, setAdsData] = useState({
    topAds: [],
    bottomAds: [],
    leftAds: [],
    rightAds: [],
    mobileTopAds: [],
    mobileBottomAds: [],
    courtMiddleAds: [],
    mobileZoneSettings: { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 },
    state: { adsEnabled: true, bottomAdPaused: false }
  });

  // UI & Network States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'reconnecting');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [shareToast, setShareToast] = useState(false);
  const [dismissedBottomAd, setDismissedBottomAd] = useState(false);

  // Active ad rotating indices
  const [adBannerIndex, setAdBannerIndex] = useState(0);

  // Theme Sync with DOM data-theme attribute
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const active = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(active);
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Track Tab Visibility (Pause timers & video when backgrounded)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 1. Fetch Tournament Info & Live Match List (Read-Only)
  const fetchTournamentData = useCallback(async (explicitTId) => {
    const tId = explicitTId || tournamentId || currentMatch?.tournament?.id || currentMatch?.tournament_id;
    if (!tId) return;

    try {
      const [tRes, liveRes, fixRes] = await Promise.allSettled([
        axios.get(`/api/tournaments/${tId}`),
        axios.get(`/api/tournaments/${tId}/live`),
        axios.get(`/api/tournaments/${tId}/matches`)
      ]);

      if (tRes.status === 'fulfilled' && tRes.value.data?.success) {
        setTournament(tRes.value.data.data);
      }

      if (liveRes.status === 'fulfilled' && liveRes.value.data?.success) {
        const items = liveRes.value.data.data?.items || [];
        setLiveMatches(items);

        // If no match selected yet, auto-select first live match
        if (!activeMatchId && items.length > 0) {
          setActiveMatchId(items[0].uuid || items[0].id);
        }
      }

      if (fixRes.status === 'fulfilled' && fixRes.value.data?.success) {
        const allMatches = fixRes.value.data.data?.items || [];
        const upcoming = allMatches.filter(m => m.status === 'SCHEDULED' || m.status === 'READY');
        setUpcomingMatches(upcoming.slice(0, 5));
      }
    } catch (err) {
      console.warn('Live score tournament fetch notice:', err.message);
    }
  }, [tournamentId, activeMatchId, currentMatch?.tournament?.id, currentMatch?.tournament_id]);

  // 2. Fetch Match Details & Stream (Read-Only)
  const fetchMatchDetails = useCallback(async (mId) => {
    if (!mId) return null;
    try {
      const [matchRes, streamRes, eventsRes] = await Promise.allSettled([
        axios.get(`/api/matches/${mId}`),
        axios.get(`/api/matches/${mId}/stream`),
        axios.get(`/api/matches/${mId}/events`)
      ]);

      let mData = null;
      if (matchRes.status === 'fulfilled' && matchRes.value.data?.success) {
        mData = matchRes.value.data.data;
        setCurrentMatch(mData);

        // If match includes sport-specific details, preserve them
        if (mData.sportSlug === 'pickleball' || mData.sport?.slug === 'pickleball') {
          try {
            const pbRes = await axios.get(`/api/matches/${mId}/pickleball`);
            if (pbRes.data?.success) {
              mData = { ...mData, ...pbRes.data.data };
              setCurrentMatch(prev => ({ ...(prev || mData), ...pbRes.data.data }));
            }
          } catch (e) {}
        } else if (mData.sportSlug === 'badminton' || mData.sport?.slug === 'badminton') {
          try {
            const bmRes = await axios.get(`/api/matches/${mId}/badminton`);
            if (bmRes.data?.success) {
              mData = { ...mData, ...bmRes.data.data };
              setCurrentMatch(prev => ({ ...(prev || mData), ...bmRes.data.data }));
            }
          } catch (e) {}
        }
      }

      if (streamRes.status === 'fulfilled' && streamRes.value.data?.success) {
        setStreamData(streamRes.value.data.data);
      } else {
        setStreamData(null);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value.data?.success) {
        const evList = eventsRes.value.data.data?.events || eventsRes.value.data.data || [];
        if (Array.isArray(evList)) {
          // Strictly strip any undo or correction events from viewer screen
          const cleanEvents = evList.filter(ev => {
            const txt = (ev.notes || ev.type || '').toLowerCase();
            return !txt.includes('undo') && !txt.includes('correct');
          });
          setEvents(cleanEvents.slice(0, 10));
        }
      }

      return mData;
    } catch (err) {
      console.warn('Match details fetch notice:', err.message);
      return null;
    }
  }, []);

  // 3. Fetch Active Advertisements (Targeted to Tournament/Venue + Mobile Ads)
  const fetchAds = useCallback(async (explicitTId) => {
    const tId = explicitTId || tournamentId || currentMatch?.tournament?.id || currentMatch?.tournament_id;
    try {
      const res = await getActiveSignageAdsApi({ tournamentId: tId, device: 'MOBILE' });
      const data = (res && res.data && typeof res.data === 'object' && !Array.isArray(res.data))
        ? res.data
        : (res || {});

      if (data) {
        setAdsData({
          topAds: data.topAds || [],
          bottomAds: data.bottomAds || [],
          leftAds: data.leftAds || [],
          rightAds: data.rightAds || [],
          mobileTopAds: (data.mobileTopAds && data.mobileTopAds.length > 0) ? data.mobileTopAds : (data.topAds || []),
          mobileBottomAds: (data.mobileBottomAds && data.mobileBottomAds.length > 0) ? data.mobileBottomAds : (data.bottomAds || []),
          courtMiddleAds: data.courtMiddleAds || [],
          mobileZoneSettings: data.mobileZoneSettings || { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 },
          state: data.state || { adsEnabled: true, bottomAdPaused: false }
        });
      }
    } catch (e) {
      console.warn('Live viewer ads fetch notice:', e.message);
    }
  }, [tournamentId, currentMatch?.tournament?.id, currentMatch?.tournament_id]);

  const isFirstLoad = useRef(true);

  // Initial Load
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      setError('');
      try {
        let currentTournId = tournamentId;

        if (activeMatchId) {
          const matchData = await fetchMatchDetails(activeMatchId);
          if (matchData) {
            const discoveredTournId = matchData.tournament?.id || matchData.tournament_id;
            if (discoveredTournId) {
              currentTournId = discoveredTournId;
              if (mounted) setTournamentId(discoveredTournId);
            }
          }
        }

        if (currentTournId) {
          await fetchTournamentData(currentTournId);
        }
        await fetchAds(currentTournId);
      } catch (err) {
        if (mounted) setError('Unable to load live scoreboard.');
      } finally {
        if (mounted) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, [activeMatchId, fetchMatchDetails, fetchTournamentData, fetchAds]);

  // Real-Time Socket Connection & Match Room Subscriptions
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('reconnecting');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Join Tournament Room if available
    const tId = tournamentId || currentMatch?.tournament?.id || currentMatch?.tournament_id;
    if (tId) {
      socket.emit('join:tournament', { tournamentId: tId });
    }

    // Join Match Room if available
    if (activeMatchId) {
      socket.emit('join:match', { matchId: activeMatchId });
    }

    // Handle real-time score updates
    const handleScoreUpdate = (payload) => {
      setConnectionStatus('connected');
      if (!payload) return;

      const targetId = payload.matchId || payload.matchUuid || payload.id;
      if (targetId && String(targetId) === String(activeMatchId)) {
        setCurrentMatch((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status || prev.status,
            scores: {
              ...(prev.scores || {}),
              teamA: payload.teamAScore ?? payload.scoreA ?? prev.scores?.teamA,
              teamB: payload.teamBScore ?? payload.scoreB ?? prev.scores?.teamB
            },
            score: {
              ...(prev.score || {}),
              summary: payload.summary || `${payload.teamAScore ?? ''} - ${payload.teamBScore ?? ''}`,
              details: payload.details || prev.score?.details
            },
            resultSummary: payload.resultSummary || prev.resultSummary,
            winner: payload.winnerTeamId ? (payload.winnerTeamId === prev.teamA?.id ? 'team_a' : 'team_b') : prev.winner
          };
        });

        // Add to live events feed (Strictly omit undo / edit from viewers)
        if (payload.notes || payload.point_to || payload.type) {
          const isUndoType = payload.type === 'UNDO' || String(payload.notes || '').toLowerCase().includes('undo');
          if (!isUndoType) {
            setEvents((prev) => [
              {
                id: Date.now(),
                sequence_number: prev.length + 1,
                point_to: payload.point_to,
                notes: payload.notes || 'Point scored',
                created_at: new Date().toISOString()
              },
              ...prev.slice(0, 9)
            ]);
          }
        }
      }

      // Also refresh summary list if tournament match updated
      fetchTournamentData();
    };

    const handleStreamUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.matchId || payload.matchUuid || payload.id;
      if (targetId && String(targetId) !== String(activeMatchId)) return;

      setStreamData((prev) => {
        const prevStream = prev?.stream || prev || {};
        return {
          ...prev,
          exists: true,
          status: payload.status,
          isLive: payload.status === 'LIVE',
          stream: {
            ...prevStream,
            status: payload.status,
            isLive: payload.status === 'LIVE',
            streamingMethod: payload.streamingMethod || prevStream.streamingMethod,
            youtubeUrl: payload.youtubeUrl || prevStream.youtubeUrl,
            playbackUrl: payload.playbackUrl || prevStream.playbackUrl
          }
        };
      });
    };

    // Real-Time Ad & Playback Updates
    const handleAdUpdate = () => {
      fetchAds();
    };
    const handlePlaybackUpdate = (payload) => {
      if (payload?.playbackState) {
        setAdsData((prev) => ({
          ...prev,
          state: payload.playbackState,
          mobileZoneSettings: payload.playbackState.mobileZoneSettings || prev.mobileZoneSettings
        }));
      } else {
        fetchAds();
      }
    };

    socket.on('match:pickleballScore', handleScoreUpdate);
    socket.on('match:pointScored', handleScoreUpdate);
    socket.on('signage:pointScored', handleScoreUpdate);
    socket.on('match:undoPoint', handleScoreUpdate);
    socket.on('match:undone', handleScoreUpdate);
    socket.on('match:ballEvent', handleScoreUpdate);
    socket.on('score:updated', handleScoreUpdate);
    socket.on('match:footballEvent', handleScoreUpdate);
    socket.on('match:badmintonEvent', handleScoreUpdate);
    socket.on('tournament:matchUpdated', handleScoreUpdate);
    socket.on('signage:matchUpdate', handleScoreUpdate);
    socket.on('stream:status', handleStreamUpdate);
    socket.on('stream:status_changed', handleStreamUpdate);

    socket.on('signage:adAdded', handleAdUpdate);
    socket.on('signage:adUpdated', handleAdUpdate);
    socket.on('signage:adRemoved', handleAdUpdate);
    socket.on('signage:playbackUpdated', handlePlaybackUpdate);
    socket.on('signage:adsDisabled', () => setAdsData(prev => ({ ...prev, state: { ...(prev.state || {}), adsEnabled: false } })));
    socket.on('signage:adsEnabled', () => setAdsData(prev => ({ ...prev, state: { ...(prev.state || {}), adsEnabled: true } })));
    socket.on('signage:adPaused', () => setAdsData(prev => ({ ...prev, state: { ...(prev.state || {}), bottomAdPaused: true } })));
    socket.on('signage:adResumed', () => setAdsData(prev => ({ ...prev, state: { ...(prev.state || {}), bottomAdPaused: false } })));

    return () => {
      if (tId) socket.emit('leave:tournament', { tournamentId: tId });
      if (activeMatchId) socket.emit('leave:match', { matchId: activeMatchId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('match:pickleballScore', handleScoreUpdate);
      socket.off('match:pointScored', handleScoreUpdate);
      socket.off('signage:pointScored', handleScoreUpdate);
      socket.off('match:undoPoint', handleScoreUpdate);
      socket.off('match:undone', handleScoreUpdate);
      socket.off('match:ballEvent', handleScoreUpdate);
      socket.off('score:updated', handleScoreUpdate);
      socket.off('match:footballEvent', handleScoreUpdate);
      socket.off('match:badmintonEvent', handleScoreUpdate);
      socket.off('tournament:matchUpdated', handleScoreUpdate);
      socket.off('signage:matchUpdate', handleScoreUpdate);
      socket.off('stream:status', handleStreamUpdate);
      socket.off('stream:status_changed', handleStreamUpdate);

      socket.off('signage:adAdded', handleAdUpdate);
      socket.off('signage:adUpdated', handleAdUpdate);
      socket.off('signage:adRemoved', handleAdUpdate);
      socket.off('signage:playbackUpdated', handlePlaybackUpdate);
      socket.off('signage:adsDisabled');
      socket.off('signage:adsEnabled');
      socket.off('signage:adPaused');
      socket.off('signage:adResumed');
    };
  }, [tournamentId, activeMatchId, currentMatch?.tournament?.id, currentMatch?.tournament_id, fetchTournamentData, fetchAds]);

  // Fallback Polling (Every 5s when tab is active and match is live)
  useEffect(() => {
    if (!isTabVisible || !activeMatchId) return;

    const interval = setInterval(() => {
      fetchMatchDetails(activeMatchId);
    }, 5000);

    return () => clearInterval(interval);
  }, [isTabVisible, activeMatchId, fetchMatchDetails]);

  // Ad Rotation Interval (Every 6s, pauses when tab is hidden)
  const activeAdList = useMemo(() => {
    return [...(adsData.topAds || []), ...(adsData.courtAds || []), ...(adsData.bottomAds || [])].filter(Boolean);
  }, [adsData]);

  useEffect(() => {
    if (!isTabVisible || activeAdList.length <= 1) return;

    const adTimer = setInterval(() => {
      setAdBannerIndex((prev) => (prev + 1) % activeAdList.length);
    }, 6000);

    return () => clearInterval(adTimer);
  }, [isTabVisible, activeAdList.length]);

  // Handle Share Click
  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      });
    }
  };

  // Check if live stream is currently active for this match
  const activeStreamObj = streamData?.stream || streamData;
  const isStreamActive = Boolean(
    (activeStreamObj?.status === 'LIVE' ||
     activeStreamObj?.isLive ||
     currentMatch?.has_live_stream ||
     currentMatch?.hasLiveStream ||
     (activeStreamObj?.streamingMethod === 'YOUTUBE' && (activeStreamObj?.youtubeUrl || activeStreamObj?.youtubeLiveUrl))) &&
    activeStreamObj?.status !== 'ENDED' &&
    activeStreamObj?.status !== 'OFFLINE'
  );

  // Derive scores & sport info
  const sportSlug = (
    currentMatch?.sportSlug ||
    currentMatch?.sport?.slug ||
    tournament?.sport?.slug ||
    'pickleball'
  ).toLowerCase();

  const isPickleballOrRacquet = ['pickleball', 'badminton', 'tennis', 'table-tennis'].includes(sportSlug);
  const isCricket = sportSlug === 'cricket';
  const isFootball = sportSlug === 'football';

  const scoreA = currentMatch?.scores?.teamA ?? currentMatch?.teamA_score ?? currentMatch?.score?.teamA ?? 0;
  const scoreB = currentMatch?.scores?.teamB ?? currentMatch?.teamB_score ?? currentMatch?.score?.teamB ?? 0;

  const teamAName = currentMatch?.teamA?.name || 'Team A';
  const teamBName = currentMatch?.teamB?.name || 'Team B';

  const rules = currentMatch?.rules || tournament?.rules || {};
  const isLive = currentMatch?.status === 'LIVE';

  // ── LOADING SKELETON ──
  if (loading && !currentMatch && liveMatches.length === 0) {
    return (
      <div className="live-viewer-wrapper" style={{ padding: '2rem 16px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite', margin: '3rem auto 1rem' }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading, #fff)' }}>Connecting to Live Arena…</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Synchronizing live scores and broadcast stream.</p>
      </div>
    );
  }

  return (
    <div className="live-viewer-wrapper" style={{ width: '100%', maxWidth: '720px', margin: '0 auto', boxSizing: 'border-box', padding: '1rem 16px 85px 16px', overflowX: 'hidden' }}>
      
      {/* ── TOP NAVIGATION BAR ── */}
      <div className="live-viewer-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', width: '100%' }}>
        <Link
          href={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '0.86rem',
            fontWeight: 700,
            textDecoration: 'none',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          <ArrowLeft size={16} style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Back to {tournament?.name || 'Tournament'}
          </span>
        </Link>

        {/* Right Badges & Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Connection Status Pill */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: connectionStatus === 'connected' ? '#10b981' : '#f59e0b',
              border: `1px solid ${connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connectionStatus === 'connected' ? '#10b981' : '#f59e0b' }} />
            {connectionStatus === 'connected' ? 'Live Sync' : 'Reconnecting…'}
          </span>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
              background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.06))',
              color: 'var(--text-heading, #fff)',
              cursor: 'pointer'
            }}
            title="Share Live Score Link"
          >
            {shareToast ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
          </button>
        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div style={{ background: '#10b981', color: '#fff', fontSize: '0.82rem', fontWeight: 800, textAlign: 'center', padding: '0.4rem', borderRadius: '8px', marginBottom: '0.85rem' }}>
          ✓ Live score link copied to clipboard!
        </div>
      )}

      {/* ── TOP AD STRIP (Mobile Right → Left Continuous Seamless Marquee) ── */}
      <MobileAdStrip
        ads={adsData.mobileTopAds}
        position="top"
        height={adsData.mobileZoneSettings?.topHeight || 64}
        speed={adsData.mobileZoneSettings?.topSpeed || 50}
        paused={Boolean(adsData.state?.bottomAdPaused)}
        adsEnabled={Boolean(adsData.state?.adsEnabled !== false)}
        theme={theme}
      />

      {/* ── MULTI-LIVE-MATCHES SWITCHER (When >1 match is live) ── */}
      {liveMatches.length > 1 && (
        <div style={{ marginBottom: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={14} className="pulse" /> {liveMatches.length} Live Matches in Tournament
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {liveMatches.map((lm) => {
              const lmId = lm.uuid || lm.id;
              const isSelected = String(lmId) === String(activeMatchId);
              return (
                <button
                  key={lmId}
                  type="button"
                  onClick={() => {
                    setActiveMatchId(lmId);
                    fetchMatchDetails(lmId);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 800 : 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.15))'
                      : 'var(--bg-card-subtle, rgba(255, 255, 255, 0.05))',
                    border: isSelected
                      ? '1.5px solid #ef4444'
                      : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    color: isSelected ? '#fff' : 'var(--text-muted, #94a3b8)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                  <span>{lm.teamA?.name || 'A'} vs {lm.teamB?.name || 'B'}</span>
                  {lm.score?.summary && (
                    <span style={{ fontWeight: 800, color: '#10b981', marginLeft: '0.2rem' }}>
                      ({lm.score.summary})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 1. STICKY LIVE STREAM PLAYER (If Streaming is ON) ── */}
      {isStreamActive && (
        <div className="live-viewer-stream-sticky" style={{ position: 'sticky', top: 0, zIndex: 30, width: '100%', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem', background: '#000', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)' }}>
          <LiveStreamPlayer
            matchId={activeMatchId}
            streamData={activeStreamObj}
            match={currentMatch}
            autoPlay={true}
            showScoreOverlay={false}
          />
        </div>
      )}

      {/* ── 2. MAIN LIVE SCORE CARD (1fr auto 1fr Symmetrical Mobile Layout) ── */}
      {currentMatch ? (
        <div className="live-viewer-card" style={{ padding: '1.25rem 1rem', borderRadius: '18px', marginBottom: '1.15rem', boxSizing: 'border-box', width: '100%' }}>
          {/* Card Top Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>
                {sportSlug === 'cricket' ? '🏏 CRICKET' : sportSlug === 'football' ? '⚽ FOOTBALL' : sportSlug === 'badminton' ? '🏸 BADMINTON' : '🎾 PICKLEBALL'}
              </span>
              <span>•</span>
              <span>{currentMatch.groupName || `Match #${currentMatch.matchNumber || 1}`}</span>
              {currentMatch.courtName && (
                <>
                  <span>•</span>
                  <span>{currentMatch.courtName}</span>
                </>
              )}
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                background: isLive ? '#ef4444' : currentMatch.status === 'COMPLETED' ? '#10b981' : '#64748b',
                color: '#ffffff'
              }}
            >
              {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite' }} />}
              {currentMatch.status}
            </span>
          </div>

          {/* Symmetrical 1fr auto 1fr Header Grid (Compact, No Duplicate Score for Court Sports) */}
          <div className="live-viewer-arena-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'clamp(0.4rem, 2vw, 1.25rem)', width: '100%', boxSizing: 'border-box' }}>
            {/* Team A Side */}
            <div className="live-viewer-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <TeamLogoAvatar logoUrl={currentMatch.teamA?.logo} teamName={teamAName} size={46} theme={theme} />
              <h3 className="live-viewer-team-name" style={{ fontWeight: 800, fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', margin: '0.35rem 0 0.15rem 0', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={teamAName}>
                {teamAName}
              </h3>
              {!isPickleballOrRacquet && (
                <div className="live-viewer-score-num" style={{ fontWeight: 950, fontSize: 'clamp(2rem, 5vw, 2.75rem)', lineHeight: 1, margin: '0.2rem 0' }}>
                  {scoreA}
                </div>
              )}
            </div>

            {/* Center VS & Format / Target / Cap Info */}
            <div style={{ padding: '0 0.35rem', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 'clamp(1rem, 2.2vw, 1.25rem)', fontWeight: 900, color: 'var(--accent-primary, #10b981)', letterSpacing: '0.12em' }}>
                VS
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginTop: '0.25rem', whiteSpace: 'nowrap' }}>
                {rules.targetScore || currentMatch.targetScore ? `TARGET ${rules.targetScore || currentMatch.targetScore}` : 'LIVE MATCH'}
                {rules.winByTwo || rules.winBy2 ? ' • Win by 2' : ''}
                {rules.cap || rules.maxPoints || currentMatch.scoringCap ? ` • Cap ${rules.cap || rules.maxPoints || currentMatch.scoringCap}` : ''}
              </div>
            </div>

            {/* Team B Side */}
            <div className="live-viewer-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <TeamLogoAvatar logoUrl={currentMatch.teamB?.logo} teamName={teamBName} size={46} theme={theme} />
              <h3 className="live-viewer-team-name" style={{ fontWeight: 800, fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', margin: '0.35rem 0 0.15rem 0', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={teamBName}>
                {teamBName}
              </h3>
              {!isPickleballOrRacquet && (
                <div className="live-viewer-score-num" style={{ fontWeight: 950, fontSize: 'clamp(2rem, 5vw, 2.75rem)', lineHeight: 1, margin: '0.2rem 0' }}>
                  {scoreB}
                </div>
              )}
            </div>
          </div>

          {/* Result summary banner if finished */}
          {currentMatch.resultSummary && (
            <div style={{ marginTop: '0.85rem', padding: '0.5rem 0.85rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', textAlign: 'center' }}>
              🏆 {currentMatch.resultSummary}
            </div>
          )}
        </div>
      ) : null}

      {/* ── 3. SPORT-SPECIFIC VISUALIZATION / DETAILS ── */}
      {currentMatch && isPickleballOrRacquet && (
        <div className="live-viewer-card" style={{ padding: '1rem', borderRadius: '16px', marginBottom: '1.15rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.65rem', textAlign: 'center' }}>
            Live Court Position & Service Radar
          </div>
          <CourtView
            match={currentMatch}
            variant="viewer"
            showScoreOnCourt={true}
            sport={sportSlug}
            format={rules.matchFormat || currentMatch.matchFormat || 'DOUBLES'}
            courtColor={tournament?.courtColor || currentMatch.courtColor || '#0d5c3a'}
            courtMiddleAds={adsData.courtMiddleAds || []}
            canEditColor={false}
            status={currentMatch.status}
            winner={currentMatch.winner}
            compact={false}
          />
        </div>
      )}

      {/* Cricket Crease & Overs Snapshot */}
      {currentMatch && isCricket && currentMatch.score?.details && (
        <div className="live-viewer-card" style={{ padding: '1rem', borderRadius: '16px', marginBottom: '1.15rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Active Batters</span>
              <div style={{ fontWeight: 800, marginTop: '0.2rem' }}>
                🏏 {currentMatch.score.details.striker?.name || 'Striker'} *: {currentMatch.score.details.striker?.runs ?? 0} ({currentMatch.score.details.striker?.balls ?? 0}b)
              </div>
              {currentMatch.score.details.nonStriker && (
                <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                  {currentMatch.score.details.nonStriker.name}: {currentMatch.score.details.nonStriker.runs} ({currentMatch.score.details.nonStriker.balls}b)
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Current Bowler</span>
              <div style={{ fontWeight: 800, marginTop: '0.2rem' }}>
                🎯 {currentMatch.score.details.bowler?.name || 'Bowler'}
              </div>
              <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                {currentMatch.score.details.bowler?.overs ?? '0.0'} ov | {currentMatch.score.details.bowler?.wickets ?? 0}/{currentMatch.score.details.bowler?.runsConceded ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. AD PLACEMENT A: ROTATING SPONSOR BANNER (Below Score Card) ── */}
      {activeAdList.length > 0 && (
        <div className="live-viewer-ad-banner" style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '1.15rem', position: 'relative', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
          {(() => {
            const ad = activeAdList[adBannerIndex] || activeAdList[0];
            return (
              <a
                href={ad.linkUrl || ad.targetUrl || '#'}
                target={ad.linkUrl ? '_blank' : '_self'}
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'block', position: 'relative' }}
              >
                <div style={{ position: 'absolute', top: 6, left: 8, zIndex: 5, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Official Sponsor
                </div>
                <img
                  src={ad.imageUrl}
                  alt={ad.title || 'Sponsor'}
                  style={{ width: '100%', height: 'auto', maxHeight: '110px', objectFit: ad.imageFit || 'contain', display: 'block' }}
                />
              </a>
            );
          })()}
        </div>
      )}

      {/* ── 5. RECENT POINTS / EVENT TIMELINE ── */}
      {events.length > 0 && (
        <div className="live-viewer-card" style={{ padding: '1rem', borderRadius: '16px', marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
            <Activity size={16} color="var(--accent-primary, #10b981)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Recent Points & Scoring Feed
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
            {events.map((ev, i) => (
              <div key={ev.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', borderRadius: '8px', background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-heading, #fff)' }}>
                  {ev.point_to ? `Point to ${ev.point_to === 'team_a' ? teamAName : teamBName}` : ev.notes || 'Point Recorded'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {ev.created_at ? new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. AD PLACEMENT B: AD CARD BETWEEN SECTIONS ── */}
      {adsData.leftAds?.length > 0 && (
        <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '1.15rem', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Featured Partner
          </div>
          <a href={adsData.leftAds[0].linkUrl || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <img
              src={adsData.leftAds[0].imageUrl}
              alt="Partner"
              style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </a>
        </div>
      )}

      {/* ── 7. EMPTY STATE (When No Match is Live in Tournament) ── */}
      {!currentMatch && liveMatches.length === 0 && (
        <div className="live-viewer-card" style={{ padding: '2rem 1.25rem', textAlign: 'center', borderRadius: '18px', marginBottom: '1.25rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Radio size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: 'var(--text-heading, #fff)' }}>
            No live match right now
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)', margin: '0 auto 1.5rem auto', maxWidth: '380px' }}>
            Live scores and real-time streaming will appear here as soon as the next scheduled match begins.
          </p>

          <Link
            href={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: '10px', textDecoration: 'none' }}
          >
            <Calendar size={15} /> View Tournament Fixtures
          </Link>
        </div>
      )}

      {/* ── 8. UPCOMING MATCHES SECTION ── */}
      {upcomingMatches.length > 0 && (
        <div className="live-viewer-card" style={{ padding: '1rem', borderRadius: '16px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
            <Calendar size={16} color="var(--accent-primary, #10b981)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Next Scheduled Matches
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingMatches.map((um) => (
              <div key={um.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: '10px', background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading, #fff)' }}>
                    {um.teamA?.name || 'TBD'} vs {um.teamB?.name || 'TBD'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {um.groupName || `Match #${um.matchNumber}`} {um.courtName ? `• ${um.courtName}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  {um.scheduledTime ? new Date(um.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. BOTTOM DOCKED AD STRIP (Mobile Left → Right Continuous Seamless Marquee) ── */}
      <MobileAdStrip
        ads={adsData.mobileBottomAds}
        position="bottom"
        height={adsData.mobileZoneSettings?.bottomHeight || 56}
        speed={adsData.mobileZoneSettings?.bottomSpeed || 40}
        paused={Boolean(adsData.state?.bottomAdPaused)}
        adsEnabled={Boolean(adsData.state?.adsEnabled !== false)}
        theme={theme}
      />

    </div>
  );
}
