'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { socket } from '../../services/socket';
import {
  X, Radio, Camera, Video, Youtube, Settings, Copy,
  Check, RefreshCw, Eye, EyeOff, Play, Pause, Square,
  Shield, AlertCircle, CheckCircle, Smartphone, ExternalLink,
  Layers, Volume2, VolumeX, RotateCw, Monitor, Sparkles,
  Minimize2, Maximize2, Coffee, Clock
} from 'lucide-react';
import { startMatchBreakApi, endMatchBreakApi, getMatchBreakApi } from '../../services/advertisementService';

export default function LiveStreamManagerModal({
  matchId,
  match,
  matchData: matchDataProp,
  isOpen,
  onClose,
  onStreamUpdated,
  onStreamStatusChange
}) {
  const matchData = match || matchDataProp || {};
  const teamAName = matchData.teamA?.name || matchData.team_a_name || matchData.teamAName || 'Team A';
  const teamBName = matchData.teamB?.name || matchData.team_b_name || matchData.teamBName || 'Team B';
  const matchNumber = matchData.matchNumber || matchData.match_number || 1;
  const courtName = matchData.court?.name || matchData.court_name || matchData.courtName || '';

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
      const sA = m.scores.teamA ?? 0;
      const sB = m.scores.teamB ?? 0;
      return `${sA} - ${sB}`;
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

  const [liveScore, setLiveScore] = useState(() => resolveScore(matchData));

  // Match Break State
  const [breakState, setBreakState] = useState({ isBreak: false, reason: 'Interval', durationMinutes: null });
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState('Interval');
  const [breakDuration, setBreakDuration] = useState('2');
  const [breakActionLoading, setBreakActionLoading] = useState(false);

  // Sync real-time score & break state in modal
  useEffect(() => {
    if (matchId) {
      getMatchBreakApi(matchId).then(res => {
        if (res?.success && res.data) {
          setBreakState(res.data);
        }
      }).catch(() => {});
    }

    const onScoreChange = (payload) => {
      if (!payload) return;
      const tId = payload.matchId || payload.matchUuid || payload.id;
      if (tId && String(tId) !== String(matchId)) return;

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
        startedAt: data.startedAt,
        expectedEndAt: data.expectedEndAt
      });
    };

    const handleBreakEnd = (data) => {
      if (data) {
        const tId = data.matchId || data.id;
        if (tId && String(tId) !== String(matchId)) return;
      }
      setBreakState({ isBreak: false, reason: '', startedAt: null, expectedEndAt: null });
    };

    socket.on('score:updated', onScoreChange);
    socket.on('match:pickleballScore', onScoreChange);
    socket.on('signage:matchUpdate', onScoreChange);
    socket.on('match:break:start', handleBreakStart);
    socket.on('match:break:end', handleBreakEnd);
    socket.on('match:break_updated', handleBreakStart);
    socket.on('stream:break_state', handleBreakStart);

    return () => {
      socket.off('score:updated', onScoreChange);
      socket.off('match:pickleballScore', onScoreChange);
      socket.off('signage:matchUpdate', onScoreChange);
      socket.off('match:break:start', handleBreakStart);
      socket.off('match:break:end', handleBreakEnd);
      socket.off('match:break_updated', handleBreakStart);
      socket.off('stream:break_state', handleBreakStart);
    };
  }, [matchId]);

  const handleToggleBreak = async () => {
    if (breakState.isBreak) {
      setBreakActionLoading(true);
      try {
        await endMatchBreakApi(matchId);
        setBreakState({ isBreak: false, reason: '', startedAt: null, expectedEndAt: null });
      } catch (err) {
        console.warn('End break error:', err);
      } finally {
        setBreakActionLoading(false);
      }
    } else {
      setShowBreakModal(true);
    }
  };

  const handleConfirmStartBreak = async () => {
    setBreakActionLoading(true);
    try {
      const durNum = breakDuration ? parseInt(breakDuration, 10) : null;
      const res = await startMatchBreakApi(matchId, {
        reason: breakReason,
        durationMinutes: isNaN(durNum) ? null : durNum
      });
      if (res?.success && res.data) {
        setBreakState(res.data);
      }
      setShowBreakModal(false);
    } catch (err) {
      console.warn('Start break error:', err);
    } finally {
      setBreakActionLoading(false);
    }
  };


  const [activeTab, setActiveTab] = useState('mobile'); // 'mobile' | 'external' | 'youtube' | 'overlay'
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mobile Camera Broadcasting State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'acquiring' | 'active' | 'lost' | 'denied' | 'error'
  const [cameraErrorType, setCameraErrorType] = useState(null);
  const [cameraErrorDetail, setCameraErrorDetail] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [streamStatus, setStreamStatus] = useState('IDLE');
  const [viewerCount, setViewerCount] = useState(0);

  // Grace period when live broadcast loses camera
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [graceTimeLeft, setGraceTimeLeft] = useState(30);
  const graceTimerRef = useRef(null);

  // External Camera (RTMP / OBS) State
  const [revealStreamKey, setRevealStreamKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedIngest, setCopiedIngest] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);

  // YouTube Live State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState('PUBLIC');
  const [youtubeVerified, setYoutubeVerified] = useState(false);

  // Overlay Settings State
  const [overlayConfig, setOverlayConfig] = useState({
    enabled: true,
    position: 'bottom',
    theme: 'modern_dark',
    showBallByBall: true,
    showTeamLogos: true
  });

  const videoPreviewRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const candidateQueuesRef = useRef(new Map());
  const pendingViewersRef = useRef(new Set());
  const isBroadcastingRef = useRef(isBroadcasting);
  const facingModeRef = useRef(facingMode);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    isBroadcastingRef.current = isBroadcasting;
  }, [isBroadcasting]);

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  const getAuthHeaders = () => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('turf_token') || localStorage.getItem('token') || sessionStorage.getItem('turf_token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // OBS Overlay URL
  const obsOverlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/matches/${matchId}/overlay`
    : `/matches/${matchId}/overlay`;

  // 1. Fetch current stream configuration
  const fetchStreamConfig = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`/api/matches/${matchId}/stream`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setStreamData(d);
        if (d.stream) {
          setStreamStatus(d.stream.status || 'IDLE');
          setIsBroadcasting(d.stream.status === 'LIVE');
          setViewerCount(d.stream.viewerCount || 0);
          if (d.stream.overlayConfig) setOverlayConfig(d.stream.overlayConfig);
          if (d.stream.youtubeLiveUrl) setYoutubeUrl(d.stream.youtubeLiveUrl);

          // Select tab matching stream method
          if (d.stream.streamingMethod === 'EXTERNAL_RTMP') setActiveTab('external');
          else if (d.stream.streamingMethod === 'YOUTUBE_LIVE') setActiveTab('youtube');
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load stream settings.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchStreamConfig();
  }, [fetchStreamConfig]);

  // Grace Period Management (30 seconds)
  const startGracePeriod = useCallback(() => {
    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    setIsGracePeriod(true);
    setGraceTimeLeft(30);
    socket.emit('stream:camera_paused', { matchId });

    let remaining = 30;
    graceTimerRef.current = setInterval(() => {
      remaining -= 1;
      setGraceTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(graceTimerRef.current);
        graceTimerRef.current = null;
        setIsGracePeriod(false);
      }
    }, 1000);
  }, [matchId]);

  const cancelGracePeriod = useCallback(() => {
    if (graceTimerRef.current) {
      clearInterval(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    setIsGracePeriod(false);
    setGraceTimeLeft(30);
  }, []);

  // Replace media tracks in all active WebRTC peer connections
  const replaceTracksInPeerConnections = useCallback((newStream) => {
    const videoTrack = newStream.getVideoTracks()[0];
    const audioTrack = newStream.getAudioTracks()[0];

    peerConnectionsRef.current.forEach((pc, socketId) => {
      try {
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track?.kind === 'video' && videoTrack) {
            sender.replaceTrack(videoTrack).catch((e) => console.warn(`[WebRTC] Video replaceTrack error (${socketId}):`, e));
          } else if (sender.track?.kind === 'audio' && audioTrack) {
            sender.replaceTrack(audioTrack).catch((e) => console.warn(`[WebRTC] Audio replaceTrack error (${socketId}):`, e));
          }
        });
      } catch (err) {
        console.warn(`[WebRTC] Peer track update warning (${socketId}):`, err);
      }
    });
  }, []);

  // Handle sudden camera loss (track ended or permission revoked mid-stream)
  const handleCameraLost = useCallback(() => {
    console.warn('[CameraManager] Camera track ended or muted');
    setCameraActive(false);
    setCameraState('lost');
    setCameraErrorType('NotAllowedError');
    setCameraErrorDetail('Camera stream was interrupted or permission was disabled. Click "Retry Camera" to re-enable.');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    if (isBroadcastingRef.current) {
      startGracePeriod();
    }
  }, [startGracePeriod]);

  // Attach track.onended and track.onmute listeners
  const attachTrackListeners = useCallback((stream) => {
    stream.getTracks().forEach((track) => {
      const onEnded = () => {
        handleCameraLost();
      };
      const onMute = () => {
        if (track.readyState === 'ended' || track.muted) {
          handleCameraLost();
        }
      };
      track.addEventListener('ended', onEnded);
      track.addEventListener('mute', onMute);
    });
  }, [handleCameraLost]);

  // 2. Camera Management (Mobile / Web Phone Camera)
  const startCamera = async (mode = facingModeRef.current, isRelaxed = false) => {
    setCameraState('acquiring');
    setErrorMsg('');
    setCameraErrorType(null);
    setCameraErrorDetail('');

    // Rule 1: Always stop all old tracks and set videoEl.srcObject = null before every new getUserMedia
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    try {
      const constraints = isRelaxed
        ? { video: true, audio: true }
        : {
            video: {
              facingMode: mode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            },
            audio: true
          };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Rule 2: Listen for ended and mute events on every track
      attachTrackListeners(stream);

      // Rule 4: Set muted, playsInline and autoPlay, and call videoEl.play() in try/catch
      if (videoPreviewRef.current) {
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true;
        videoPreviewRef.current.autoplay = true;
        videoPreviewRef.current.srcObject = stream;

        const playPromise = videoPreviewRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[CameraManager] Preview play deferred:', err.message);
          });
        }

        videoPreviewRef.current.onloadedmetadata = () => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.play().catch(() => {});
          }
        };
      }

      setCameraActive(true);
      setCameraState('active');

      // Rule 7: If broadcast is live, resume on same session and replace track in existing connections
      if (isBroadcastingRef.current) {
        cancelGracePeriod();
        replaceTracksInPeerConnections(stream);
        socket.emit('stream:camera_resumed', { matchId });
        socket.emit('stream:broadcaster_ready', { matchId });
      }

      // Automatically connect any viewers who joined before camera finished initializing
      if (pendingViewersRef.current.size > 0) {
        pendingViewersRef.current.forEach((socketId) => {
          handleViewerJoined({ socketId });
        });
        pendingViewersRef.current.clear();
      }

      return stream;
    } catch (err) {
      console.error('[CameraManager] Camera error:', err);
      setCameraActive(false);

      // Rule 5: OverconstrainedError -> retry automatically with relaxed constraints
      if (err.name === 'OverconstrainedError' && !isRelaxed) {
        console.warn('[CameraManager] Overconstrained, retrying with relaxed constraints...');
        return startCamera(mode, true);
      }

      // Rule 5: Handle errors separately with friendly messages
      let errType = 'Unknown';
      let friendlyMsg = err.message || 'Unable to access camera.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errType = 'NotAllowedError';
        friendlyMsg = 'Camera permission is blocked or was turned off. Please allow camera & microphone access in your browser address bar (lock icon) and click "Retry Camera".';
        setCameraState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errType = 'NotFoundError';
        friendlyMsg = 'No camera device found on this system. Please connect a webcam or use your phone camera.';
        setCameraState('error');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errType = 'NotReadableError';
        friendlyMsg = 'Camera is currently in use by another app or browser tab. Please close other applications using the camera and click "Retry Camera".';
        setCameraState('error');
      } else if (err.name === 'AbortError') {
        errType = 'AbortError';
        friendlyMsg = 'Camera initialization was aborted. Please click "Retry Camera" to reconnect.';
        setCameraState('error');
      } else if (err.name === 'OverconstrainedError') {
        errType = 'OverconstrainedError';
        friendlyMsg = 'Camera constraints could not be satisfied. Please click "Retry Camera" to use standard settings.';
        setCameraState('error');
      } else {
        setCameraState('error');
      }

      setCameraErrorType(errType);
      setCameraErrorDetail(friendlyMsg);
      setErrorMsg(friendlyMsg);

      if (isBroadcastingRef.current) {
        startGracePeriod();
      }
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraState('idle');
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    facingModeRef.current = nextMode;
    if (cameraActive) {
      await startCamera(nextMode);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMuted = !isAudioMuted;
      audioTracks.forEach((t) => {
        t.enabled = !nextMuted;
      });
      setIsAudioMuted(nextMuted);
    }
  };

  // Rule 3: navigator.permissions.query for camera with change event (auto-reacquire on granted)
  useEffect(() => {
    let permStatus = null;
    let micStatus = null;
    let mounted = true;

    const setupPermissionsObserver = async () => {
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          permStatus = await navigator.permissions.query({ name: 'camera' });
          const onCameraChange = () => {
            if (!mounted) return;
            console.log('[CameraManager] Permission state change:', permStatus.state);
            if (permStatus.state === 'granted') {
              startCamera(facingModeRef.current);
            } else if (permStatus.state === 'denied') {
              setCameraState('denied');
              setCameraActive(false);
              setCameraErrorType('NotAllowedError');
              setCameraErrorDetail('Camera permission was blocked. Please click the address bar lock icon, set Camera to Allow, and click "Retry Camera".');
              stopCamera();
            }
          };
          permStatus.addEventListener('change', onCameraChange);
        } catch (e) {
          // Firefox / Safari partial permissions support
        }

        try {
          micStatus = await navigator.permissions.query({ name: 'microphone' });
          const onMicChange = () => {
            if (!mounted) return;
            if (micStatus.state === 'denied') {
              setIsAudioMuted(true);
            }
          };
          micStatus.addEventListener('change', onMicChange);
        } catch (e) {}
      }
    };

    setupPermissionsObserver();

    // Rule 8: Document visibility change handler (tab hidden/shown)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (!videoTrack || videoTrack.readyState === 'ended') {
            console.warn('[CameraManager] Track ended while backgrounded, re-acquiring...');
            startCamera(facingModeRef.current);
          } else if (videoPreviewRef.current && videoPreviewRef.current.paused) {
            videoPreviewRef.current.play().catch(() => {});
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (permStatus) {
        try { permStatus.removeEventListener('change', () => {}); } catch (e) {}
      }
    };
  }, []);

  // Rule 8: Clean up all tracks, timers and listeners on modal close and unmount
  useEffect(() => {
    return () => {
      cancelGracePeriod();
      stopCamera();
    };
  }, [cancelGracePeriod]);

  // 3. WebRTC Broadcaster Pipeline (Distribute mobile camera stream to viewers)
  useEffect(() => {
    if (!matchId) return;

    const handleConnect = () => {
      socket.emit('stream:join', { matchId, isBroadcaster: true });
      if (isBroadcastingRef.current) {
        socket.emit('stream:broadcaster_ready', { matchId });
      }
    };

    socket.emit('stream:join', { matchId, isBroadcaster: true });
    socket.on('connect', handleConnect);

    // When a viewer joins or requests an offer, create a WebRTC PeerConnection and send an Offer
    const handleViewerJoined = async ({ socketId }) => {
      if (!localStreamRef.current) {
        // Record pending viewer until camera starts
        pendingViewersRef.current.add(socketId);
        return;
      }

      try {
        if (peerConnectionsRef.current.has(socketId)) {
          try {
            peerConnectionsRef.current.get(socketId).close();
          } catch (e) {}
          peerConnectionsRef.current.delete(socketId);
        }

        const iceServers = streamData?.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' }
        ];

        const pc = new RTCPeerConnection({ iceServers });

        peerConnectionsRef.current.set(socketId, pc);

        // Add local camera tracks to the peer connection
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('stream:signal:candidate', {
              targetSocketId: socketId,
              candidate: event.candidate
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('stream:signal:offer', {
          targetSocketId: socketId,
          sdp: offer
        });
      } catch (err) {
        console.warn('[Broadcaster] WebRTC offer creation warning:', err);
      }
    };

    // When viewer answers with SDP
    const handleAnswer = async ({ senderSocketId, sdp }) => {
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Drain queued ICE candidates received before answer/remoteDescription was established
          const queue = candidateQueuesRef.current.get(senderSocketId) || [];
          for (const cand of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[Broadcaster] Queued candidate error:', e);
            }
          }
          candidateQueuesRef.current.delete(senderSocketId);
        } catch (err) {
          console.warn('[Broadcaster] Set remote description warning:', err);
        }
      }
    };

    // When viewer sends ICE candidate
    const handleCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (!pc || !candidate) return;
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[Broadcaster] Add ICE candidate notice:', err);
        }
      } else {
        const queue = candidateQueuesRef.current.get(senderSocketId) || [];
        queue.push(candidate);
        candidateQueuesRef.current.set(senderSocketId, queue);
      }
    };

    const handleViewerLeft = ({ socketId, viewerCount: count }) => {
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      candidateQueuesRef.current.delete(socketId);
      pendingViewersRef.current.delete(socketId);
      if (count !== undefined) setViewerCount(count);
    };

    const handleViewerCount = ({ viewerCount: count }) => {
      if (count !== undefined) setViewerCount(count);
    };

    socket.on('stream:viewer_joined', handleViewerJoined);
    socket.on('stream:request_offer', handleViewerJoined);
    socket.on('stream:signal:answer', handleAnswer);
    socket.on('stream:signal:candidate', handleCandidate);
    socket.on('stream:viewer_left', handleViewerLeft);
    socket.on('stream:viewer_count', handleViewerCount);

    return () => {
      socket.emit('stream:leave', { matchId });
      socket.off('connect', handleConnect);
      socket.off('stream:viewer_joined', handleViewerJoined);
      socket.off('stream:signal:answer', handleAnswer);
      socket.off('stream:signal:candidate', handleCandidate);
      socket.off('stream:viewer_left', handleViewerLeft);
      socket.off('stream:viewer_count', handleViewerCount);

      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [matchId]);

  // 4. Start / Stop Broadcast Actions
  const handleStartMobileStream = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      if (!cameraActive) {
        await startCamera();
      }

      // Initialize or update stream on backend
      await axios.post(
        `/api/matches/${matchId}/stream`,
        { streamingMethod: 'MOBILE_CAMERA', title: `${matchData?.teamAName || 'Team A'} vs ${matchData?.teamBName || 'Team B'} - Live Camera Stream` },
        { headers: getAuthHeaders() }
      );

      // Set status to LIVE
      await axios.put(
        `/api/matches/${matchId}/stream/status`,
        { status: 'LIVE' },
        { headers: getAuthHeaders() }
      );

      setIsBroadcasting(true);
      setStreamStatus('LIVE');
      setSuccessMsg('🔴 Broadcaster is LIVE! Viewers can now watch your mobile camera feed.');
      socket.emit('stream:broadcaster_ready', { matchId });
      if (onStreamUpdated) onStreamUpdated();
      if (onStreamStatusChange) onStreamStatusChange({ status: 'LIVE', isLive: true });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to start mobile live stream.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndStream = async () => {
    if (!window.confirm('Are you sure you want to end this live broadcast? Viewers will be notified.')) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      await axios.put(
        `/api/matches/${matchId}/stream/status`,
        { status: 'ENDED' },
        { headers: getAuthHeaders() }
      );

      stopCamera();
      setIsBroadcasting(false);
      setStreamStatus('ENDED');
      setSuccessMsg('Live stream ended.');
      if (onStreamUpdated) onStreamUpdated();
      if (onStreamStatusChange) onStreamStatusChange({ status: 'ENDED', isLive: false });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to end stream.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. External RTMP Stream Setup
  const handleSetupExternal = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      await axios.post(
        `/api/matches/${matchId}/stream`,
        { streamingMethod: 'EXTERNAL_RTMP' },
        { headers: getAuthHeaders() }
      );
      await fetchStreamConfig();
      setSuccessMsg('External encoder configured! Paste the RTMP Ingest URL and Stream Key into OBS Studio.');
      if (onStreamUpdated) onStreamUpdated();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to setup external streaming.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating will invalidate your current stream key in OBS. Continue?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post(
        `/api/matches/${matchId}/stream/regenerate-key`,
        {},
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setSuccessMsg('Stream key regenerated successfully.');
        await fetchStreamConfig();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to regenerate stream key.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. YouTube Live Setup
  const handleSaveYouTube = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      setErrorMsg('Please enter a valid YouTube Live URL or Video ID.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      await axios.post(
        `/api/matches/${matchId}/stream`,
        {
          streamingMethod: 'YOUTUBE_LIVE',
          youtubeLiveUrl: youtubeUrl.trim(),
          title: youtubeTitle.trim(),
          privacyStatus: youtubePrivacy
        },
        { headers: getAuthHeaders() }
      );

      await axios.put(
        `/api/matches/${matchId}/stream/status`,
        { status: 'LIVE' },
        { headers: getAuthHeaders() }
      );

      await fetchStreamConfig();
      setSuccessMsg('YouTube Live broadcast linked! Viewers on Turf will now watch your YouTube live stream.');
      if (onStreamUpdated) onStreamUpdated();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to link YouTube broadcast.');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Save Overlay Config
  const handleSaveOverlay = async (updates) => {
    const next = { ...overlayConfig, ...updates };
    setOverlayConfig(next);
    try {
      await axios.put(
        `/api/matches/${matchId}/stream/overlay`,
        next,
        { headers: getAuthHeaders() }
      );
    } catch (err) {
      console.warn('Failed to save overlay config:', err);
    }
  };

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '14px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
          padding: '0.75rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          color: '#ffffff'
        }}
      >
        <Radio size={18} className="animate-pulse" color="#ef4444" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
            {isBroadcasting ? '🔴 LIVE Camera Active' : 'Camera On'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {viewerCount} Viewer{viewerCount === 1 ? '' : 's'} watching
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Expand Controls
        </button>
        <button
          type="button"
          onClick={async () => {
            if (isBroadcasting) {
              if (window.confirm('End the live broadcast?')) {
                await handleEndStream();
                onClose();
              }
            } else {
              stopCamera();
              onClose();
            }
          }}
          title="End broadcast"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '0.2rem'
          }}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #0f172a)',
          borderRadius: '20px',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: isBroadcasting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                color: isBroadcasting ? '#ef4444' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Radio size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>
                Live Match Streaming
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                {teamAName} vs {teamBName} • Match #{matchNumber}{courtName ? ` • ${courtName}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {isBroadcasting && (
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize (Keep broadcasting in background)"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Minimize2 size={13} />
                <span>Minimize</span>
              </button>
            )}

            <button
              onClick={async () => {
                if (isBroadcasting) {
                  const endNow = window.confirm(
                    'You are currently broadcasting live.\n\n• Click OK to END the stream.\n• Click Cancel to MINIMIZE and keep streaming in the background.'
                  );
                  if (endNow) {
                    await handleEndStream();
                    onClose();
                  } else {
                    setIsMinimized(true);
                  }
                  return;
                }
                stopCamera();
                onClose();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '0.3rem'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            background: 'rgba(0, 0, 0, 0.2)',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'mobile', label: '📱 Mobile Camera', icon: <Smartphone size={15} /> },
            { id: 'external', label: '🎥 External Camera / OBS', icon: <Video size={15} /> },
            { id: 'youtube', label: '▶️ YouTube Live', icon: <Youtube size={15} /> },
            { id: 'overlay', label: '✨ Scoreboard Overlay', icon: <Sparkles size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.85rem 1rem',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
                color: activeTab === tab.id ? '#10b981' : 'var(--text-muted, #94a3b8)',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Notification Messages */}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.86rem' }}>
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.86rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 1: MOBILE CAMERA STREAMING                              */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'mobile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#f8fafc', fontWeight: 800 }}>
                    Stream Directly from Mobile Phone / Browser Camera
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Broadcast match video directly to viewers with live scoreboard compositing.
                  </p>
                </div>

                {isBroadcasting && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 800, fontSize: '0.75rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    LIVE • {viewerCount} Viewers
                  </span>
                )}
              </div>

              {/* Camera Preview Area with Live Scoreboard Overlay */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#090d16',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {/* Active Grace Period Overlay during Live Broadcast */}
                {isGracePeriod && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(15, 23, 42, 0.92)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                      textAlign: 'center',
                      zIndex: 10
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.85rem',
                        border: '1.5px solid rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      <AlertCircle size={26} color="#ef4444" />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '0.35rem' }}>
                      Camera Lost — Reconnecting...
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '340px', marginBottom: '1.1rem', lineHeight: 1.45 }}>
                      Live session maintained. Grace period: <strong style={{ color: '#38bdf8' }}>{graceTimeLeft}s</strong> remaining before stream pauses.
                    </div>
                    <button
                      onClick={() => startCamera(facingModeRef.current)}
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: 700,
                        padding: '0.55rem 1.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <RefreshCw size={15} />
                      Retry Camera Now
                    </button>
                  </div>
                )}

                {/* Offline / Acquiring / Denied / Error Preview States */}
                {!cameraActive && !isGracePeriod && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', maxWidth: '440px' }}>
                    {cameraState === 'acquiring' ? (
                      <div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                          <RotateCw size={22} color="#38bdf8" style={{ animation: 'spin 1.5s linear infinite' }} />
                        </div>
                        <h5 style={{ margin: '0 0 0.35rem 0', color: '#ffffff', fontWeight: 700 }}>Starting Camera...</h5>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                          Requesting camera & microphone access...
                        </p>
                      </div>
                    ) : cameraState === 'denied' || cameraErrorType === 'NotAllowedError' ? (
                      <div>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', border: '1.5px solid rgba(239, 68, 68, 0.3)' }}>
                          <Shield size={24} color="#ef4444" />
                        </div>
                        <h5 style={{ margin: '0 0 0.35rem 0', color: '#f87171', fontWeight: 800 }}>Camera Permission Blocked</h5>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                          Camera permission was turned off. To re-enable: click the <strong>lock/tune icon</strong> in your browser address bar, set Camera to <strong>Allow</strong>, and click Retry below.
                        </p>
                        <button
                          onClick={() => startCamera(facingModeRef.current)}
                          className="btn btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: '8px', fontWeight: 700, padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <RefreshCw size={14} />
                          Retry Camera
                        </button>
                      </div>
                    ) : cameraState === 'lost' ? (
                      <div>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                          <AlertCircle size={24} color="#f59e0b" />
                        </div>
                        <h5 style={{ margin: '0 0 0.35rem 0', color: '#fbbf24', fontWeight: 700 }}>Camera Lost</h5>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                          Camera feed was disconnected or permission revoked.
                        </p>
                        <button
                          onClick={() => startCamera(facingModeRef.current)}
                          className="btn btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: '8px', fontWeight: 700, padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <RefreshCw size={14} />
                          Retry Camera
                        </button>
                      </div>
                    ) : cameraState === 'error' ? (
                      <div>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                          <AlertCircle size={24} color="#ef4444" />
                        </div>
                        <h5 style={{ margin: '0 0 0.35rem 0', color: '#ffffff', fontWeight: 700 }}>
                          {cameraErrorType === 'NotReadableError' ? 'Camera In Use by Another App' :
                           cameraErrorType === 'NotFoundError' ? 'No Camera Device Found' :
                           cameraErrorType === 'OverconstrainedError' ? 'Camera Constraints Error' :
                           cameraErrorType === 'AbortError' ? 'Camera Initialization Aborted' : 'Camera Error'}
                        </h5>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                          {cameraErrorDetail || 'An error occurred while accessing the camera.'}
                        </p>
                        <button
                          onClick={() => startCamera(facingModeRef.current)}
                          className="btn btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: '8px', fontWeight: 700, padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        >
                          <RefreshCw size={14} />
                          Retry Camera
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Camera size={42} color="#64748b" style={{ margin: '0 auto 0.75rem auto' }} />
                        <h5 style={{ margin: '0 0 0.35rem 0', color: '#ffffff' }}>Camera Preview Offline</h5>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                          Click below to enable your camera and microphone preview.
                        </p>
                        <button
                          onClick={() => startCamera(facingModeRef.current)}
                          className="btn btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: '8px', fontWeight: 700, padding: '0.55rem 1.25rem' }}
                        >
                          Enable Camera Preview
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Scoreboard Overlay Preview on Camera */}
                {cameraActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0.75rem',
                      left: '0.75rem',
                      right: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '10px',
                      padding: '0.5rem 0.85rem',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                      {teamAName} vs {teamBName}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8' }}>
                      {liveScore}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera & Broadcast Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={toggleCameraFacing}
                    disabled={!cameraActive}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                  >
                    <RotateCw size={14} />
                    {facingMode === 'user' ? 'Front Camera' : 'Rear Camera'}
                  </button>

                  <button
                    onClick={toggleAudio}
                    disabled={!cameraActive}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px', color: isAudioMuted ? '#f87171' : 'inherit' }}
                  >
                    {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {isAudioMuted ? 'Muted' : 'Mic Active'}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleBreak}
                    disabled={breakActionLoading}
                    className="btn btn-outline btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderRadius: '8px',
                      background: breakState.isBreak ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                      color: breakState.isBreak ? '#fbbf24' : 'inherit',
                      borderColor: breakState.isBreak ? '#fbbf24' : 'inherit',
                      fontWeight: 700
                    }}
                    title="Display Match Break sponsor ads & countdown to viewers"
                  >
                    <Coffee size={14} />
                    {breakState.isBreak ? '⏸️ On Break • End' : 'Break'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!isBroadcasting ? (
                    <button
                      onClick={handleStartMobileStream}
                      disabled={actionLoading}
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '0.55rem 1.25rem',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      <Radio size={16} />
                      Go Live (Start Stream)
                    </button>
                  ) : (
                    <button
                      onClick={handleEndStream}
                      disabled={actionLoading}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        fontWeight: 800,
                        padding: '0.55rem 1.25rem',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}
                    >
                      <Square size={14} />
                      End Live Broadcast
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 2: EXTERNAL CAMERA & OBS RTMP SETUP                     */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'external' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontWeight: 800 }}>
                  External Camera & Professional Streaming Setup (OBS / RTMP)
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Stream using OBS Studio, vMix, Wirecast, or external RTMP hardware encoders.
                </p>
              </div>

              {(() => {
                const activeStreamObj = streamData?.stream || streamData;
                const streamKey = activeStreamObj?.streamKey;
                const ingestUrl = activeStreamObj?.ingestUrl || 'rtmp://playzo.duckdns.org/live';

                if (!streamKey) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <Video size={36} color="#60a5fa" style={{ margin: '0 auto 0.75rem auto' }} />
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>Initialize External Ingest Credentials</h5>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Generate your unique RTMP ingest endpoint and stream key for this match.
                      </p>
                      <button
                        onClick={handleSetupExternal}
                        disabled={actionLoading}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: '8px', fontWeight: 700 }}
                      >
                        Generate RTMP Stream Key
                      </button>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* RTMP Ingest Endpoint */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                        Server / Ingest URL
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          readOnly
                          value={ingestUrl}
                          style={{
                            flex: 1,
                            padding: '0.55rem 0.85rem',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#f8fafc',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                          }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ingestUrl);
                            setCopiedIngest(true);
                            setTimeout(() => setCopiedIngest(false), 2500);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {copiedIngest ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          {copiedIngest ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Masked Stream Key */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                          Stream Key (Keep Private)
                        </label>
                        <button
                          onClick={handleRegenerateKey}
                          disabled={actionLoading}
                          style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <RefreshCw size={12} />
                          Regenerate Key
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type={revealStreamKey ? 'text' : 'password'}
                          readOnly
                          value={streamKey}
                          style={{
                            flex: 1,
                            padding: '0.55rem 0.85rem',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#f8fafc',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                          }}
                        />
                        <button
                          onClick={() => setRevealStreamKey(!revealStreamKey)}
                          className="btn btn-outline btn-sm"
                          style={{ borderRadius: '8px', padding: '0.55rem 0.75rem' }}
                        >
                          {revealStreamKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(streamKey);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2500);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          {copiedKey ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                  {/* OBS Browser Source Live Scoreboard Overlay URL */}
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                      <Monitor size={16} color="#10b981" />
                      <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>OBS Browser Source Score Overlay</strong>
                    </div>
                    <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Add this URL as a Browser Source in OBS Studio (1920x1080, transparent background) for automated TV broadcast graphics:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={obsOverlayUrl}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(obsOverlayUrl);
                          setCopiedOverlay(true);
                          setTimeout(() => setCopiedOverlay(false), 2500);
                        }}
                        className="btn btn-sm"
                        style={{ background: '#10b981', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                      >
                        {copiedOverlay ? <Check size={14} /> : <Copy size={14} />}
                        {copiedOverlay ? 'Copied' : 'Copy Overlay URL'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: YOUTUBE LIVE INTEGRATION                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'youtube' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontWeight: 800 }}>
                  YouTube Live Broadcast Integration
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Link an existing YouTube Live stream URL or broadcast ID to this match.
                </p>
              </div>

              <form onSubmit={handleSaveYouTube} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    YouTube Live URL or Video ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://youtube.com/live/dQw4w9WgXcQ or https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                    Supported formats: <code>youtube.com/live/ID</code>, <code>youtube.com/watch?v=ID</code>, <code>youtu.be/ID</code>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Stream Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Grand Final Match Live"
                      value={youtubeTitle}
                      onChange={(e) => setYoutubeTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div style={{ width: '150px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Privacy Setting
                    </label>
                    <select
                      value={youtubePrivacy}
                      onChange={(e) => setYoutubePrivacy(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 2.5rem 0.55rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-card, #0f172a)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="UNLISTED">Unlisted</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </div>
                </div>

                {/* YouTube Requirements Notice */}
                <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <strong style={{ color: '#f87171', display: 'block', marginBottom: '0.2rem' }}>
                    📌 YouTube Live Requirements:
                  </strong>
                  • Ensure your YouTube channel has live streaming enabled (may take up to 24 hrs for brand new accounts).<br />
                  • If streaming from OBS to YouTube, copy the OBS Browser Source overlay from the External Camera tab for automatic on-screen scoreboards.
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: '8px',
                    fontWeight: 700,
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  }}
                >
                  Link & Activate YouTube Live Stream
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 4: SCOREBOARD OVERLAY CONFIG                            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'overlay' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontWeight: 800 }}>
                  Live Scoreboard Overlay Configuration
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Customize the dynamic scoreboard displayed on OBS broadcasts and viewer video players.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Overlay Enable/Disable */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={overlayConfig.enabled !== false}
                      onChange={(e) => handleSaveOverlay({ enabled: e.target.checked })}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>Enable Overlay</span>
                  </label>
                  <p style={{ margin: '0.35rem 0 0 1.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Show scoreboard on top of the live video broadcast.
                  </p>
                </div>

                {/* Position */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                    Screen Position
                  </label>
                  <select
                    value={overlayConfig.position || 'bottom'}
                    onChange={(e) => handleSaveOverlay({ position: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem 2.5rem 0.45rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    <option value="bottom">Lower Third (Bottom)</option>
                    <option value="top">Top Header Bar</option>
                  </select>
                </div>

                {/* Theme */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                    Graphics Theme
                  </label>
                  <select
                    value={overlayConfig.theme || 'modern_dark'}
                    onChange={(e) => handleSaveOverlay({ theme: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem 2.5rem 0.45rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    <option value="modern_dark">Modern Dark Glass</option>
                    <option value="broadcast_pro">Broadcast Pro Metallic</option>
                    <option value="vibrant">Vibrant Emerald Sports</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Break Config Modal */}
      {showBreakModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coffee size={18} color="#fbbf24" /> Start Match Break
              </h3>
              <button
                type="button"
                onClick={() => setShowBreakModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.4 }}>
              While the match is on break, live stream viewers will see your configured sponsor ad-break screen with a countdown. Video and audio stream continue uninterrupted.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                Break Reason
              </label>
              <select
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="Timeout">Timeout</option>
                <option value="Interval">Interval / Water Break</option>
                <option value="Game break">Game / Set Break</option>
                <option value="Technical">Technical / Injury Break</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                Expected Duration
              </label>
              <select
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="1">1 Minute</option>
                <option value="2">2 Minutes (Standard Timeout)</option>
                <option value="3">3 Minutes</option>
                <option value="5">5 Minutes (Extended Interval)</option>
                <option value="">Manual (No Countdown)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBreakModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartBreak}
                disabled={breakActionLoading}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 800
                }}
              >
                {breakActionLoading ? 'Starting…' : 'Start Break Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

