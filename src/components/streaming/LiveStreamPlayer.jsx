'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { socket } from '../../services/socket';
import {
  Radio, Play, Pause, Volume2, VolumeX, Maximize2,
  Minimize2, Share2, Check, RefreshCw, Eye, Sparkles, AlertCircle
} from 'lucide-react';
import { getServeState, getCourtState } from '../court/courtUtils';
import { getStreamAdsApi, getMatchBreakApi } from '../../services/advertisementService';
import {
  StreamTopAdStrip,
  StreamBottomAdStrip,
  StreamSidebarAdZone,
  MatchBreakOverlay
} from './StreamAdLayers';

export default function LiveStreamPlayer({
  matchId,
  stream,
  streamData: streamDataProp,
  match,
  matchData: matchDataProp,
  onRefresh,
  autoPlay = true,
  showOverlay,
  showScoreOverlay = true
}) {
  const activeStream = streamDataProp?.stream || streamDataProp || stream || null;
  const activeMatch = matchDataProp || match || null;
  const initialOverlay = showOverlay !== undefined ? showOverlay : showScoreOverlay;

  const [streamStatus, setStreamStatus] = useState(
    activeStream?.status || (activeStream?.isLive ? 'LIVE' : 'IDLE')
  );
  const [isMuted, setIsMuted] = useState(true); // Default muted so mobile/browser allows autoplay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewerCount, setViewerCount] = useState(activeStream?.viewerCount || 0);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [webrtcError, setWebrtcError] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(initialOverlay);

  // Real-time match state tracking for court mapping & score overlay
  const [currentMatch, setCurrentMatch] = useState(activeMatch);

  // Stream Ads & Zone Settings State
  const [streamAds, setStreamAds] = useState({ top: [], bottom: [], left: [], right: [], breakAds: [] });
  const [streamSettings, setStreamSettings] = useState({
    topHeight: 48,
    bottomHeight: 52,
    leftWidth: 140,
    rightWidth: 140,
    topSpeed: 45,
    bottomSpeed: 45,
    rotateInterval: 6,
    breakInterval: 5,
    hideSidebarsOnMobile: true
  });
  const [playbackState, setPlaybackState] = useState({ adsEnabled: true, bottomAdPaused: false });
  const [breakState, setBreakState] = useState({ isBreak: false, reason: '', startedAt: null, expectedEndAt: null });
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const streamingMethod = activeStream?.streamingMethod || stream?.streamingMethod || 'MOBILE_CAMERA';
  const isYouTube = streamingMethod === 'YOUTUBE_LIVE' || streamingMethod === 'YOUTUBE' || Boolean(activeStream?.youtubeUrl || activeStream?.youtubeLiveUrl);
  const isHls = streamingMethod === 'EXTERNAL_RTMP' && Boolean(activeStream?.playbackUrl);
  const isLive = streamStatus === 'LIVE';

  const youtubeVideoId = activeStream?.youtubeVideoId || (() => {
    const raw = activeStream?.youtubeUrl || activeStream?.youtubeLiveUrl || stream?.youtubeUrl;
    if (!raw) return null;
    const matchYt = String(raw).match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/);
    return (matchYt && matchYt[2].length === 11) ? matchYt[2] : raw;
  })();

  // Keep stream status in sync with props
  useEffect(() => {
    const status = activeStream?.status || (activeStream?.isLive ? 'LIVE' : null);
    if (status) {
      setStreamStatus(status);
    }
  }, [activeStream?.status, activeStream?.isLive]);

  // Keep match state in sync with prop updates
  useEffect(() => {
    if (activeMatch) {
      setCurrentMatch(activeMatch);
    }
  }, [activeMatch]);

  // Detect mobile viewport for sidebar ad responsiveness
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobileScreen(mq.matches);
    const handler = (e) => setIsMobileScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch Stream Ads and Match Break State
  const fetchStreamAdsAndBreak = useCallback(async () => {
    try {
      const matchObj = currentMatch || activeMatch;
      const tournamentId = matchObj?.tournamentId || matchObj?.tournament_id || matchObj?.tournament?.id;
      const venueId = matchObj?.venueId || matchObj?.venue_id || matchObj?.venue?.id;
      const res = await getStreamAdsApi({ matchId, tournamentId, venueId });
      if (res?.success && res.data) {
        setStreamAds({
          top: res.data.top || [],
          bottom: res.data.bottom || [],
          left: res.data.left || [],
          right: res.data.right || [],
          breakAds: res.data.breakAds || []
        });
        if (res.data.zoneSettings) {
          setStreamSettings(prev => ({ ...prev, ...res.data.zoneSettings }));
        }
        if (res.data.playbackState) {
          setPlaybackState(prev => ({ ...prev, ...res.data.playbackState }));
        }
      }
    } catch (err) {
      // Graceful fallback - ads failure must never disturb stream
      console.warn('[LiveStreamPlayer] Stream ads fetch note:', err?.message);
    }

    try {
      if (matchId) {
        const breakRes = await getMatchBreakApi(matchId);
        if (breakRes?.success && breakRes.data) {
          setBreakState(breakRes.data);
        }
      }
    } catch (err) {
      console.warn('[LiveStreamPlayer] Match break fetch note:', err?.message);
    }
  }, [matchId, currentMatch, activeMatch]);

  useEffect(() => {
    fetchStreamAdsAndBreak();
  }, [fetchStreamAdsAndBreak]);

  // Real-time score resolution
  const resolveScore = (m) => {
    if (!m) return '0 - 0';
    if (m.pickleball?.scores) {
      const sA = m.pickleball.scores.teamA ?? 0;
      const sB = m.pickleball.scores.teamB ?? 0;
      const srv = m.pickleball.currentServer ? ` • S${m.pickleball.currentServer}` : '';
      const gm = m.pickleball.gameNumber ? ` (Game ${m.pickleball.gameNumber})` : '';
      return `${sA} - ${sB}${srv}${gm}`;
    }
    if (m.scores) {
      return `${m.scores.teamA ?? 0} - ${m.scores.teamB ?? 0}`;
    }
    if (m.score?.summary) return m.score.summary;
    if (m.liveScoreSummary) return m.liveScoreSummary;
    if (m.scoreA !== undefined && m.scoreB !== undefined) {
      return `${m.scoreA} - ${m.scoreB}`;
    }
    if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
      return `${m.teamAScore} - ${m.teamBScore}`;
    }
    return '0 - 0';
  };

  const [liveScore, setLiveScore] = useState(() => resolveScore(activeMatch));

  // Sync real-time score updates & break events via WebSocket
  useEffect(() => {
    const onScoreChange = (payload) => {
      if (!payload) return;
      const tId = payload.matchId || payload.matchUuid || payload.id;
      if (tId && String(tId) !== String(matchId)) return;

      setCurrentMatch(prev => ({ ...(prev || {}), ...payload }));

      if (payload.scores || payload.pickleball || payload.score) {
        setLiveScore(resolveScore(payload));
      } else if (payload.liveScoreSummary || payload.scoreSummary) {
        setLiveScore(payload.liveScoreSummary || payload.scoreSummary);
      } else if (payload.teamAScore !== undefined && payload.teamBScore !== undefined) {
        setLiveScore(`${payload.teamAScore} - ${payload.teamBScore}`);
      }
    };

    const handleBreakStart = (data) => {
      if (!data) return;
      const tId = data.matchId || data.id;
      if (tId && String(tId) !== String(matchId)) return;
      setBreakState({
        isBreak: true,
        reason: data.reason || 'Interval',
        startedAt: data.startedAt || new Date().toISOString(),
        expectedEndAt: data.expectedEndAt || null
      });
    };

    const handleBreakEnd = (data) => {
      if (data) {
        const tId = data.matchId || data.id;
        if (tId && String(tId) !== String(matchId)) return;
      }
      setBreakState({ isBreak: false, reason: '', startedAt: null, expectedEndAt: null });
    };

    const handleBreakUpdated = (data) => {
      if (!data) return;
      const tId = data.matchId || data.id;
      if (tId && String(tId) !== String(matchId)) return;
      setBreakState(data);
    };

    const handleAdsUpdated = () => {
      fetchStreamAdsAndBreak();
    };

    const handlePlaybackStateChanged = (state) => {
      if (!state) return;
      setPlaybackState(prev => ({ ...prev, ...state }));
      if (state.streamZoneSettings) {
        setStreamSettings(prev => ({ ...prev, ...state.streamZoneSettings }));
      }
    };

    socket.on('score:updated', onScoreChange);
    socket.on('match:pickleballScore', onScoreChange);
    socket.on('signage:matchUpdate', onScoreChange);
    socket.on('match:break:start', handleBreakStart);
    socket.on('match:break:end', handleBreakEnd);
    socket.on('match:break_updated', handleBreakUpdated);
    socket.on('stream:break_state', handleBreakUpdated);
    socket.on('advertisements:updated', handleAdsUpdated);
    socket.on('advertisements:state_changed', handlePlaybackStateChanged);

    return () => {
      socket.off('score:updated', onScoreChange);
      socket.off('match:pickleballScore', onScoreChange);
      socket.off('signage:matchUpdate', onScoreChange);
      socket.off('match:break:start', handleBreakStart);
      socket.off('match:break:end', handleBreakEnd);
      socket.off('match:break_updated', handleBreakUpdated);
      socket.off('stream:break_state', handleBreakUpdated);
      socket.off('advertisements:updated', handleAdsUpdated);
      socket.off('advertisements:state_changed', handlePlaybackStateChanged);
    };
  }, [matchId, fetchStreamAdsAndBreak]);

  // Watch URL for sharing
  const watchUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/matches/${matchId}/live`
    : `/matches/${matchId}/live`;

  const handleCopyShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(watchUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const broadcasterSocketIdRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const remoteDescSetRef = useRef(false);

  // WebRTC Viewer Pipeline (For MOBILE_CAMERA streaming method)
  const initWebRTCViewer = useCallback(() => {
    if (isYouTube) return;

    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      remoteDescSetRef.current = false;
      candidateQueueRef.current = [];

      const iceServers = activeStream?.iceServers || streamDataProp?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      ];

      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              console.warn('[Viewer] Video play deferred:', e?.message);
            });
          }
          setWebrtcConnected(true);
          setWebrtcError('');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('stream:signal:candidate', {
            targetSocketId: broadcasterSocketIdRef.current,
            matchId,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setWebrtcConnected(true);
          setWebrtcError('');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setWebrtcConnected(false);
          setWebrtcError('Reconnecting to stream video feed…');
        }
      };

      const handleOffer = async ({ sdp, senderSocketId }) => {
        try {
          broadcasterSocketIdRef.current = senderSocketId;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          remoteDescSetRef.current = true;

          // Drain queued ICE candidates received before remoteDescription was set
          while (candidateQueueRef.current.length > 0) {
            const queuedCand = candidateQueueRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(queuedCand));
            } catch (err) {
              console.warn('[WebRTC Viewer] Queued candidate notice:', err);
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('stream:signal:answer', {
            targetSocketId: senderSocketId,
            sdp: answer
          });
        } catch (err) {
          console.warn('[WebRTC Viewer] Offer handling notice:', err);
        }
      };

      const handleCandidate = async ({ candidate }) => {
        try {
          if (!candidate) return;
          if (remoteDescSetRef.current && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue candidate until remote description is established
            candidateQueueRef.current.push(candidate);
          }
        } catch (err) {
          console.warn('[WebRTC Viewer] ICE candidate notice:', err);
        }
      };

      const handleBroadcasterDisconnected = () => {
        setWebrtcConnected(false);
        setWebrtcError('Broadcaster disconnected. Waiting for broadcaster camera signal…');
      };

      socket.on('stream:signal:offer', handleOffer);
      socket.on('stream:signal:candidate', handleCandidate);
      socket.on('stream:broadcaster_disconnected', handleBroadcasterDisconnected);

      // Join stream room as viewer and request offer from active broadcaster
      socket.emit('stream:join', { matchId, isBroadcaster: false });
      socket.emit('stream:request_offer', { matchId });

      return () => {
        socket.off('stream:signal:offer', handleOffer);
        socket.off('stream:signal:candidate', handleCandidate);
        socket.off('stream:broadcaster_disconnected', handleBroadcasterDisconnected);
        pc.close();
      };
    } catch (err) {
      setWebrtcError('Waiting for broadcaster camera signal…');
    }
  }, [matchId, isYouTube, activeStream?.iceServers, streamDataProp?.iceServers]);

  useEffect(() => {
    if (!isYouTube && isLive) {
      const cleanup = initWebRTCViewer();
      return cleanup;
    }
  }, [isYouTube, isLive, initWebRTCViewer]);

  // Socket listeners for real-time status and viewer count updates
  useEffect(() => {
    if (!matchId) return;

    const handleConnect = () => {
      socket.emit('stream:join', { matchId, isBroadcaster: false });
      socket.emit('stream:request_offer', { matchId });
      if (!isYouTube && isLive) {
        initWebRTCViewer();
      }
    };

    socket.emit('stream:join', { matchId, isBroadcaster: false });
    socket.emit('stream:request_offer', { matchId });
    socket.on('connect', handleConnect);

    const handleStatus = (data) => {
      if (!data) return;
      const targetId = data.matchId || data.matchUuid || data.id;
      if (targetId && String(targetId) !== String(matchId)) return;

      if (data.status) {
        setStreamStatus(data.status);
      }
      if (onRefresh) onRefresh();
    };

    const handleViewerCount = (data) => {
      if (data && data.viewerCount !== undefined) {
        setViewerCount(data.viewerCount);
      }
    };

    const handleBroadcasterReady = () => {
      // Re-trigger viewer connection and request offer from newly-ready broadcaster
      initWebRTCViewer();
      socket.emit('stream:request_offer', { matchId });
    };

    socket.on('stream:status', handleStatus);
    socket.on('stream:status_changed', handleStatus);
    socket.on('stream:viewer_count', handleViewerCount);
    socket.on('stream:broadcaster_ready', handleBroadcasterReady);

    return () => {
      socket.emit('stream:leave', { matchId });
      socket.off('connect', handleConnect);
      socket.off('stream:status', handleStatus);
      socket.off('stream:status_changed', handleStatus);
      socket.off('stream:viewer_count', handleViewerCount);
      socket.off('stream:broadcaster_ready', handleBroadcasterReady);
    };
  }, [matchId, onRefresh, initWebRTCViewer, isYouTube, isLive]);

  // Self-healing interval: while stream is marked LIVE and WebRTC video has not connected,
  // re-request offer periodically every 8s in case broadcaster was initializing
  useEffect(() => {
    if (!isLive || isYouTube || webrtcConnected) return;

    const interval = setInterval(() => {
      if (!webrtcConnected) {
        socket.emit('stream:request_offer', { matchId });
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isLive, isYouTube, webrtcConnected, matchId]);

  // If stream is not live, do NOT render an empty player or play button
  if (!isLive) {
    return null;
  }

  const teamAName = currentMatch?.teamA?.name || currentMatch?.team_a_name || currentMatch?.teamAName || activeMatch?.teamA?.name || activeMatch?.team_a_name || activeMatch?.teamAName || 'Team A';
  const teamBName = currentMatch?.teamB?.name || currentMatch?.team_b_name || currentMatch?.teamBName || activeMatch?.teamB?.name || activeMatch?.team_b_name || activeMatch?.teamBName || 'Team B';

  const isCourtSport = useMemo(() => {
    const m = currentMatch || activeMatch;
    const slug = (m?.sportSlug || m?.sport?.slug || m?.sport || '').toLowerCase();
    return ['pickleball', 'badminton', 'tennis', 'table_tennis', 'squash', 'padel'].includes(slug);
  }, [currentMatch, activeMatch]);

  const serveState = useMemo(() => {
    try {
      return getServeState(currentMatch || activeMatch);
    } catch {
      return null;
    }
  }, [currentMatch, activeMatch]);

  const isTeamALeft = useMemo(() => {
    if (!serveState?.teamSides?.teamA) return true;
    return String(serveState.teamSides.teamA).toLowerCase() === 'left';
  }, [serveState]);

  const leftTeam = useMemo(() => {
    if (isCourtSport && serveState) {
      return isTeamALeft
        ? { name: teamAName, score: serveState.scoreA ?? 0, isServing: Boolean(serveState.isTeamAServing) }
        : { name: teamBName, score: serveState.scoreB ?? 0, isServing: !serveState.isTeamAServing };
    }
    return {
      name: teamAName,
      score: currentMatch?.scores?.teamA ?? activeMatch?.scores?.teamA ?? activeMatch?.scoreA ?? 0,
      isServing: false
    };
  }, [isCourtSport, serveState, isTeamALeft, teamAName, teamBName, currentMatch, activeMatch]);

  const rightTeam = useMemo(() => {
    if (isCourtSport && serveState) {
      return isTeamALeft
        ? { name: teamBName, score: serveState.scoreB ?? 0, isServing: !serveState.isTeamAServing }
        : { name: teamAName, score: serveState.scoreA ?? 0, isServing: Boolean(serveState.isTeamAServing) };
    }
    return {
      name: teamBName,
      score: currentMatch?.scores?.teamB ?? activeMatch?.scores?.teamB ?? activeMatch?.scoreB ?? 0,
      isServing: false
    };
  }, [isCourtSport, serveState, isTeamALeft, teamAName, teamBName, currentMatch, activeMatch]);

  const gameInfo = useMemo(() => {
    if (isCourtSport && serveState?.currentGame) {
      return `Game ${serveState.currentGame}`;
    }
    return 'VS';
  }, [isCourtSport, serveState]);

  const currentServerNum = useMemo(() => {
    const m = currentMatch || activeMatch;
    return m?.pickleball?.currentServer || serveState?.currentServer || null;
  }, [currentMatch, activeMatch, serveState]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: isFullscreen ? 0 : '16px',
        overflow: 'hidden',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        border: isFullscreen ? 'none' : '1.5px solid rgba(255, 255, 255, 0.12)',
        boxShadow: isFullscreen ? 'none' : '0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Keyframe definitions for stream marquees */}
      <style>{`
        @keyframes marqueeScrollR2L {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes marqueeScrollL2R {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      {/* ── Top Stream Ad Strip ── */}
      <StreamTopAdStrip
        ads={streamAds.top}
        height={streamSettings.topHeight}
        speed={streamSettings.topSpeed}
        paused={playbackState.bottomAdPaused}
        adsEnabled={playbackState.adsEnabled}
      />

      {/* ── Middle Row: Left Sidebar Ad + 16:9 Video Box + Right Sidebar Ad ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          minHeight: 0,
          flex: '1 1 auto'
        }}
      >
        {/* Stream Left Ad Zone (Desktop / Wide screens) */}
        {(!isMobileScreen || !streamSettings.hideSidebarsOnMobile) && (
          <StreamSidebarAdZone
            position="left"
            ads={streamAds.left}
            width={streamSettings.leftWidth}
            interval={streamSettings.rotateInterval}
            paused={playbackState.bottomAdPaused}
            adsEnabled={playbackState.adsEnabled}
          />
        )}

        {/* 16:9 Video Box (STABLE: Video element is NEVER remounted or resized) */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 0%',
            aspectRatio: '16 / 9',
            minWidth: 0,
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* ── 1. YouTube Live Stream Player ── */}
          {isYouTube && youtubeVideoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
              title={activeStream?.title || stream?.title || 'YouTube Live Match'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : isHls ? (
            /* ── 2. External RTMP / HLS Stream Player ── */
            <video
              ref={videoRef}
              src={activeStream.playbackUrl}
              autoPlay
              playsInline
              muted={isMuted}
              controls
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                background: '#000000'
              }}
            />
          ) : (
            /* ── 3. WebRTC Mobile Camera Player ── */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  background: '#000000',
                  display: webrtcConnected ? 'block' : 'none'
                }}
              />

              {!webrtcConnected && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090d16', zIndex: 4, gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid rgba(239, 68, 68, 0.25)', borderTopColor: '#ef4444', animation: 'spin 0.8s linear infinite' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>
                      🔴 Connecting to Live Camera Feed…
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', maxWidth: '380px' }}>
                      {webrtcError || 'Establishing secure peer-to-peer broadcast signal'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWebrtcError('Re-requesting broadcast signal from camera…');
                      initWebRTCViewer();
                      socket.emit('stream:request_offer', { matchId });
                    }}
                    style={{
                      marginTop: '0.35rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#e2e8f0',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <RefreshCw size={13} /> Reconnect Signal
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Top Bar Badges: LIVE Status & Viewers ── */}
          <div
            style={{
              position: 'absolute',
              top: '0.85rem',
              left: '0.85rem',
              right: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: 'rgba(239, 68, 68, 0.92)',
                  color: '#ffffff',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.7)'
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#ffffff',
                    animation: 'pulse 1.2s infinite'
                  }}
                />
                LIVE
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                <Eye size={12} color="#38bdf8" />
                {viewerCount} Viewers
              </span>
            </div>

            {/* Controls: Unmute / Score / Share / Fullscreen */}
            <div style={{ display: 'flex', gap: '0.45rem', pointerEvents: 'auto' }}>
              {/* Mute/Unmute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Click to Unmute' : 'Mute'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '8px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.85)' : 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isMuted ? 'Unmute' : 'Audio On'}</span>
              </button>

              {/* Toggle Score Overlay */}
              <button
                type="button"
                onClick={() => setOverlayVisible(!overlayVisible)}
                title="Toggle scoreboard overlay"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '8px',
                  background: overlayVisible ? 'rgba(16, 185, 129, 0.85)' : 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Sparkles size={13} />
                Score
              </button>

              {/* Share */}
              <button
                type="button"
                onClick={handleCopyShare}
                title="Share stream link"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {copiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Toggle fullscreen"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* ── MATCH BREAK MODE OVERLAY (Full-player Sponsor Carousel) ── */}
          {breakState?.isBreak && (
            <MatchBreakOverlay
              breakState={breakState}
              breakAds={streamAds.breakAds}
              fallbackAds={[...streamAds.top, ...streamAds.bottom, ...streamAds.left, ...streamAds.right]}
              breakInterval={streamSettings.breakInterval}
            />
          )}

          {/* ── LOWER-THIRD SCOREBOARD OVERLAY ── */}
          {overlayVisible && !activeStream?.overlayConfig?.bakedIn && (
            <div
              style={{
                position: 'absolute',
                bottom: isYouTube ? '54px' : '36px',
                left: 'clamp(6px, 2%, 20px)',
                right: 'clamp(6px, 2%, 20px)',
                zIndex: 15,
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '680px',
                  background: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  pointerEvents: 'auto',
                  color: '#ffffff'
                }}
              >
                {/* Court Left Team */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 0%', minWidth: 0 }}>
                  {leftTeam.isServing && (
                    <span
                      title="Currently Serving"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 10px #10b981',
                        flexShrink: 0,
                        animation: 'pulse 1.2s infinite'
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={leftTeam.name}
                  >
                    {leftTeam.name}
                  </span>
                  {leftTeam.isServing && currentServerNum && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      S{currentServerNum}
                    </span>
                  )}
                </div>

                {/* Central Score & Info Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
                      fontWeight: 900,
                      color: '#10b981',
                      letterSpacing: '0.04em',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {leftTeam.score}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {gameInfo}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
                      fontWeight: 900,
                      color: '#38bdf8',
                      letterSpacing: '0.04em',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {rightTeam.score}
                  </span>
                </div>

                {/* Court Right Team */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flex: '1 1 0%', minWidth: 0 }}>
                  {rightTeam.isServing && currentServerNum && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      S{currentServerNum}
                    </span>
                  )}
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'right'
                    }}
                    title={rightTeam.name}
                  >
                    {rightTeam.name}
                  </span>
                  {rightTeam.isServing && (
                    <span
                      title="Currently Serving"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#38bdf8',
                        boxShadow: '0 0 10px #38bdf8',
                        flexShrink: 0,
                        animation: 'pulse 1.2s infinite'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stream Right Ad Zone (Desktop / Wide screens) */}
        {(!isMobileScreen || !streamSettings.hideSidebarsOnMobile) && (
          <StreamSidebarAdZone
            position="right"
            ads={streamAds.right}
            width={streamSettings.rightWidth}
            interval={streamSettings.rotateInterval}
            paused={playbackState.bottomAdPaused}
            adsEnabled={playbackState.adsEnabled}
          />
        )}
      </div>

      {/* ── Bottom Stream Ad Strip ── */}
      <StreamBottomAdStrip
        ads={streamAds.bottom}
        height={streamSettings.bottomHeight}
        speed={streamSettings.bottomSpeed}
        paused={playbackState.bottomAdPaused}
        adsEnabled={playbackState.adsEnabled}
      />
    </div>
  );
}
