'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from '../lib/routerCompat';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { useMatchLive } from '../hooks/useMatchLive';
import {
  Radio, ArrowLeft, Send, Trophy, MapPin, Calendar, Clock,
  ExternalLink, Zap, Video, Tv, Share2, Check, Eye, EyeOff
} from 'lucide-react';
import ScoreCelebration from '../components/scorer/ScoreCelebration';
import CourtView, { getServeState, parseRacquetScoreDetails } from '../components/court/CourtView';
import LiveStreamPlayer from '../components/streaming/LiveStreamPlayer';
import LiveStreamManagerModal from '../components/streaming/LiveStreamManagerModal';
import { socket } from '../services/socket';

const MatchDetailPage = ({ matchId: propsMatchId, initialMatch = null }) => {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;

  const { user, token } = useSelector((state) => state.auth || {});

  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState([]);
  const [eventsPagination, setEventsPagination] = useState({ hasMore: false, nextCursor: null });
  const [loading, setLoading] = useState(!initialMatch);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [ads, setAds] = useState({ topAd: null, bottomAd: null });

  // Live Stream state
  const [streamData, setStreamData] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showLivePlayer, setShowLivePlayer] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scorer simulation & commentary inputs
  const [simText, setSimText] = useState('');
  const [isScoring, setIsScoring] = useState(false);

  // Mention Tagging State (@username)
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // 1. Fetch initial match details
  useEffect(() => {
    let isMounted = true;
    const fetchMatch = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        const res = await axios.get(`/api/matches/${id}`);
        if (res.data.success && isMounted) {
          setMatch(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load match:', err);
      } finally {
        if (isMounted && !isBackground) setLoading(false);
      }

      // Fetch ads in background
      try {
        const adsRes = await axios.get(`/api/matches/${id}/ads`);
        if (adsRes.data.success && isMounted) {
          setAds(adsRes.data.data);
        }
      } catch (e) {}
    };
    fetchMatch();
  }, [id]);

  // Fetch match live stream configuration & status
  const fetchStreamData = useCallback(async () => {
    if (!id) return;
    try {
      setStreamLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`/api/matches/${id}/stream`, { headers });
      if (res.data?.success) {
        const raw = res.data.data;
        const streamInfo = {
          ...(raw?.stream || {}),
          canManage: Boolean(raw?.canManage),
          exists: raw?.exists,
          stream: raw?.stream,
          match: raw?.match
        };
        setStreamData(streamInfo);
      }
    } catch (err) {
      // No active stream configured yet
    } finally {
      setStreamLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  // Real-time Match Score & Stream status updates via Socket.IO
  useEffect(() => {
    if (!id) return;

    // Join match room
    socket.emit('join:match', { matchId: id });

    const onStreamStatus = (payload) => {
      const data = payload?.stream || payload;
      if (data && (data.matchId === id || data.matchUuid === id || data.id === id || !data.matchId)) {
        setStreamData((prev) => ({
          ...(prev || {}),
          ...data,
          status: data.status,
          streamingMethod: data.streamingMethod || prev?.streamingMethod,
          youtubeUrl: data.youtubeUrl || prev?.youtubeUrl,
          hlsPlaybackUrl: data.hlsPlaybackUrl || prev?.hlsPlaybackUrl
        }));
      }
    };

    const onStreamEnded = (payload) => {
      const data = payload?.stream || payload;
      if (data && (data.matchId === id || data.matchUuid === id || data.id === id || !data.matchId)) {
        setStreamData((prev) => ({
          ...(prev || {}),
          status: 'ENDED',
          isLive: false
        }));
      }
    };

    // Live score update handler for all sports (Cricket, Pickleball, Football, Badminton)
    const onScoreUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.matchId || payload.matchUuid || payload.id;
      if (targetId && String(targetId) !== String(id)) return;

      setMatch((prev) => {
        if (!prev) return prev;
        const newSummary = payload.scoreSummary || payload.liveScoreSummary || payload.summary || prev.score?.summary;
        const newSubtext = payload.subtext || payload.liveSubtext || prev.score?.subtext;
        const newStatus = payload.status || prev.status;
        const newDetails = payload.state || payload.details || prev.score?.details;

        return {
          ...prev,
          status: newStatus,
          score: {
            ...prev.score,
            summary: newSummary,
            subtext: newSubtext,
            details: newDetails
          },
          currentInnings: payload.state?.currentInnings || prev.currentInnings,
          overs: payload.state?.overs ?? prev.overs,
          wickets: payload.state?.wickets ?? prev.wickets,
          scoreA: payload.teamAScore ?? payload.scoreA ?? prev.scoreA,
          scoreB: payload.teamBScore ?? payload.scoreB ?? prev.scoreB,
          winnerTeamId: payload.winnerTeamId || prev.winnerTeamId,
          resultSummary: payload.resultSummary || prev.resultSummary
        };
      });

      // Prepend commentary item if ball commentary or notes exist
      if (payload.commentary || payload.notes || payload.type) {
        setEvents((prev) => [
          {
            id: payload.ballId || payload.eventId || Date.now(),
            commentary: payload.commentary || payload.notes || `${payload.type || 'Point'} scored`,
            runs: payload.runs ?? 0,
            isWicket: Boolean(payload.isWicket),
            created_at: new Date().toISOString()
          },
          ...prev.slice(0, 29)
        ]);
      }
    };

    socket.on('stream:status', onStreamStatus);
    socket.on('stream:status_changed', onStreamStatus);
    socket.on('stream:ended', onStreamEnded);
    socket.on('match:ballEvent', onScoreUpdate);
    socket.on('score:updated', onScoreUpdate);
    socket.on('match:pointScored', onScoreUpdate);
    socket.on('match:pickleballScore', onScoreUpdate);
    socket.on('match:badmintonEvent', onScoreUpdate);
    socket.on('match:footballEvent', onScoreUpdate);
    socket.on('match:undone', onScoreUpdate);
    socket.on('tournament:matchUpdated', onScoreUpdate);

    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('stream:status', onStreamStatus);
      socket.off('stream:status_changed', onStreamStatus);
      socket.off('stream:ended', onStreamEnded);
      socket.off('match:ballEvent', onScoreUpdate);
      socket.off('score:updated', onScoreUpdate);
      socket.off('match:pointScored', onScoreUpdate);
      socket.off('match:pickleballScore', onScoreUpdate);
      socket.off('match:badmintonEvent', onScoreUpdate);
      socket.off('match:footballEvent', onScoreUpdate);
      socket.off('match:undone', onScoreUpdate);
      socket.off('tournament:matchUpdated', onScoreUpdate);
    };
  }, [id]);

  // 2. Fetch paginated commentary events
  const fetchEvents = useCallback(async (cursor = null, isAppend = false) => {
    setLoadingEvents(true);
    try {
      const params = { limit: 15 };
      if (cursor) params.cursor = cursor;
      const res = await axios.get(`/api/matches/${id}/events`, { params });
      if (res.data.success) {
        setEvents((prev) => (isAppend ? [...prev, ...res.data.data] : res.data.data));
        setEventsPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvents(null, false);
  }, [fetchEvents]);

  // 3. Socket.IO Room Hook: Subscribe strictly to match:{id}
  const handleBallEvent = useCallback((eventData) => {
    // Trigger celebration animation
    if (eventData.celebration) {
      setCelebration(eventData.celebration);
    } else if (['FOUR', 'SIX', 'WICKET'].includes(eventData.type)) {
      setCelebration(eventData.type);
    }

    // Micro-update current match scoreboard
    setMatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        score: {
          ...prev.score,
          summary: eventData.scoreSummary || prev.score.summary,
          subtext: eventData.subtext || prev.score.subtext
        }
      };
    });

    // Prepend new commentary event
    setEvents((prev) => [
      {
        seq: eventData.seq,
        type: eventData.type,
        commentary: eventData.commentary,
        createdAt: eventData.timestamp || new Date().toISOString()
      },
      ...prev
    ]);
  }, []);

  useMatchLive(id, handleBallEvent);

  // Mention Search Effect
  useEffect(() => {
    if (!mentionQuery) {
      setMentionSuggestions([]);
      setShowMentionPopup(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`);
        if (res.data.success && res.data.data?.length > 0) {
          setMentionSuggestions(res.data.data);
          setShowMentionPopup(true);
        } else {
          setMentionSuggestions([]);
          setShowMentionPopup(false);
        }
      } catch (e) {
        setShowMentionPopup(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Handle Input Changes with @ detection
  const handleCommentaryInputChange = (e) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setSimText(text);
    setCursorPosition(pos);

    // Look for @ preceding the cursor
    const textBeforeCursor = text.slice(0, pos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery('');
      setShowMentionPopup(false);
    }
  };

  // Insert Selected Mention into Input
  const handleSelectMention = (user) => {
    const textBeforeCursor = simText.slice(0, cursorPosition);
    const textAfterCursor = simText.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const newText = `${textBeforeCursor.slice(0, atIndex)}@${user.username} ${textAfterCursor}`;
      setSimText(newText);
    }

    setShowMentionPopup(false);
    setMentionQuery('');
  };

  // Render commentary text with highlighted, structured @mention badges
  const renderCommentaryWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]{3,30})/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            style={{
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.15)',
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 700,
              fontFamily: 'monospace'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 4. Test Scorer Actions
  const handleScoreBall = async (type, runs, commentary) => {
    setIsScoring(true);
    try {
      const currentRuns = parseInt(match.score?.summary?.split('/')[0] || 0) + runs;
      const currentWickets = parseInt(match.score?.summary?.split('/')[1]?.split(' ')[0] || 0) + (type === 'WICKET' ? 1 : 0);
      const newRuns = isNaN(currentRuns) ? runs : currentRuns;
      const newSummary = `${newRuns}/${currentWickets} (16.4 ov)`;

      await axios.post(`/api/matches/${id}/events`, {
        eventType: type,
        scoreDelta: runs,
        scoreSummary: newSummary,
        subtext: `Target 178 | Need ${Math.max(0, 178 - newRuns)} runs in 20 balls`,
        commentaryText: commentary || simText || `${type} scored!`,
        sportStateUpdate: {
          runs: newRuns,
          wickets: currentWickets,
          overs: '16.4'
        }
      });
      setSimText('');
    } catch (err) {
      console.error('Failed to submit score event:', err);
    } finally {
      setIsScoring(false);
    }
  };

  if (loading && !match) {
    return (
      <div style={{ maxWidth: 1000, margin: '3rem auto', textAlign: 'center', color: '#94a3b8' }}>
        Loading match details...
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ maxWidth: 1000, margin: '3rem auto', textAlign: 'center' }}>
        <h2>Match Not Found</h2>
        <Link to="/tournaments" style={{ color: 'var(--accent-primary, #10b981)' }}>Back to Tournaments</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(0.75rem, 2vw, 1.25rem)' }}>
      {/* Live Event Celebration Animation */}
      <ScoreCelebration type={celebration} onComplete={() => setCelebration(null)} />

      {/* Top Stadium Sponsor Banner */}
      {ads.topAd && (
        <div style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: '0.4rem', border: '1px solid var(--border-color)' }}>
          <img src={ads.topAd.image_url} alt={ads.topAd.name} style={{ maxHeight: 42, maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      )}

      {/* Back link & Actions Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          to={`/tournaments/${match.tournament?.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted, #94a3b8)',
            textDecoration: 'none',
            fontSize: '0.85rem'
          }}
        >
          <ArrowLeft size={16} /> Back to {match.tournament?.name || 'Tournament'}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Smart TV Display Link */}
          <Link
            to={`/tv/${match.uuid || id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-secondary, #cbd5e1)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              fontWeight: 600,
              padding: '0.48rem 0.85rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: '0.82rem'
            }}
          >
            <Tv size={14} /> Smart TV
          </Link>

          {/* Watch Stream Button (if stream is live) */}
          {streamData?.status === 'LIVE' && (
            <Link
              to={`/matches/${match.uuid || id}/watch`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontWeight: 700,
                padding: '0.48rem 0.9rem',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: '0.82rem'
              }}
            >
              <Radio size={14} className="animate-pulse" /> 🔴 Watch Stream
            </Link>
          )}

          {/* Go Live / Stream Settings Button (Superadmin, Creator, or Authorized Delegated Streamer) */}
          {Boolean(streamData?.canManage) && (
            <button
              type="button"
              onClick={() => setShowStreamModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: streamData?.status === 'LIVE'
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '0.5rem 1rem',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: '0.82rem',
                boxShadow: streamData?.status === 'LIVE' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Video size={15} />
              <span>{streamData?.status === 'LIVE' ? '🔴 Live Stream Controls' : '🎥 Go Live'}</span>
            </button>
          )}

          {/* Official Scorer Console Link */}
          <Link
            to={`/matches/${match.uuid || id}/scorer`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--accent-primary, #10b981)',
              color: '#022c22',
              fontWeight: 800,
              padding: '0.5rem 1.1rem',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: '0.85rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            {match.sport?.slug === 'football' ? '⚽ Open Football Scorer' :
             match.sport?.slug === 'badminton' ? '🏸 Open Badminton Scorer' :
             match.sport?.slug === 'pickleball' ? '⚡ Open Pickleball Scorer' :
             '🏏 Open Official Scorer'} <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Live Stream Broadcasting / Viewing Banner & Player */}
      {(() => {
        const activeStream = streamData?.stream || streamData;
        const isLive = activeStream && (activeStream.status === 'LIVE' || activeStream.status === 'PREVIEW' || activeStream.isLive || (activeStream.streamingMethod === 'YOUTUBE' && activeStream.youtubeUrl));
        if (!isLive) return null;

        return (
          <div style={{
            background: 'var(--bg-card-solid, #1e293b)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '1rem',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: activeStream.status === 'LIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: activeStream.status === 'LIVE' ? '#ef4444' : '#f59e0b',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  <Radio size={14} className="animate-pulse" />
                  <span>{activeStream.status === 'LIVE' ? 'MATCH BROADCAST IS LIVE' : 'STREAM PREVIEW'}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                  {activeStream.streamingMethod === 'MOBILE_CAMERA' ? '📱 Mobile Camera' :
                   activeStream.streamingMethod === 'EXTERNAL_RTMP' ? '🎥 OBS / Professional Ingest' :
                   '🔴 YouTube Live'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowLivePlayer(!showLivePlayer)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary, #cbd5e1)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {showLivePlayer ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showLivePlayer ? 'Hide Player' : 'Show Player'}</span>
                </button>

                <Link
                  to={`/matches/${match.uuid || id}/watch`}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Full Watch Page</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {showLivePlayer && (
              <div style={{ maxWidth: 880, margin: '0 auto' }}>
                <LiveStreamPlayer
                  matchId={match.uuid || id}
                  streamData={activeStream}
                  match={match}
                  showOverlay={true}
                  autoPlay={false}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Hero Match Scoreboard Header */}
      <div className="match-detail-hero" style={{ padding: 'clamp(1.25rem, 2.5vw, 2rem)' }}>
        {/* Match Meta & LIVE Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
            {match.sport?.name?.toUpperCase()} &bull; Match #{match.matchNumber} • {match.court?.name} ({match.court?.venueName}, {match.court?.city})
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: match.status === 'LIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
            color: match.status === 'LIVE' ? 'var(--accent-rose, #ef4444)' : '#cbd5e1',
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {match.status === 'LIVE' ? (
              <>
                <Radio size={14} className="animate-pulse" />
                LIVE ON AIR
              </>
            ) : match.status}
          </div>
        </div>

        {/* Head-to-Head Scoreboard Grid */}
        <div className="match-score-grid">
          {/* Team A */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>{match.teamA?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
              {match.sport?.slug === 'cricket' ? 'Batting' : (match.sport?.slug === 'football' ? 'Home' : 'Side A')}
            </div>
          </div>

          {/* Central Live Score Display */}
          <div style={{ textAlign: 'center', padding: '0 clamp(0.5rem, 1.5vw, 1.5rem)' }}>
            <div style={{ fontSize: 'clamp(2rem, 4.5vw, 2.6rem)', fontWeight: 900, color: 'var(--accent-primary, #10b981)', letterSpacing: '-0.5px' }}>
              {match.score?.summary || 'Yet to Start'}
            </div>
            {match.score?.subtext && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '0.35rem', fontWeight: 600 }}>
                {match.score.subtext}
              </div>
            )}
          </div>

          {/* Team B */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>{match.teamB?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
              {match.sport?.slug === 'cricket' ? 'Bowling' : (match.sport?.slug === 'football' ? 'Away' : 'Side B')}
            </div>
          </div>
        </div>

        {/* Animated Court for Court-Based Sports (Pickleball, Badminton, Tennis) */}
        {['pickleball', 'badminton', 'tennis', 'table-tennis'].includes(match.sport?.slug?.toLowerCase()) && (() => {
          const serveState = getServeState(match);
          const parsed = parseRacquetScoreDetails(match);
          return (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <CourtView
                match={match}
                serveState={serveState}
                courtColor={match.courtColor || match.court?.courtColor || '#0d5c3a'}
                ambientRally={true}
              />
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700 }}>
                {serveState.label || parsed.servingStatusText}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Real-time Scorer Test Panel */}
      <div style={{
        background: 'var(--bg-card-solid, #1e293b)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        borderRadius: 'var(--radius-md, 12px)',
        padding: 'clamp(1rem, 2vw, 1.25rem)',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading, #f8fafc)' }}>
            🎮 Live Scorer Control Panel (Test Multi-Match Real-Time Engine)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary, #10b981)', fontWeight: 600 }}>
            ● Socket.IO room match:{id.substring(0, 8)}...
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => handleScoreBall('DOT', 0, 'Good length ball defended to point.')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: '1px solid var(--border-color)', background: '#475569', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            0 Dot
          </button>
          <button
            onClick={() => handleScoreBall('SINGLE', 1, 'Quick single taken towards mid-off.')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: '1px solid var(--border-color)', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            +1 Single
          </button>
          <button
            onClick={() => handleScoreBall('DOUBLE', 2, 'Driven into deep extra cover for a brace.')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: '1px solid var(--border-color)', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            +2 Double
          </button>
          <button
            onClick={() => handleScoreBall('FOUR', 4, 'FOUR! Smashed through the covers with pinpoint timing.')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            +4 FOUR!
          </button>
          <button
            onClick={() => handleScoreBall('SIX', 6, 'SIX! Enormous hit! Cleared the fence with ease.')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            +6 SIX!
          </button>
          <button
            onClick={() => handleScoreBall('WICKET', 0, 'OUT! Clean bowled! Middle stump uprooted!')}
            disabled={isScoring}
            style={{ padding: '0.45rem 0.85rem', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            Wicket!
          </button>
        </div>

        {/* Commentary input with @mention autocomplete popup */}
        <div style={{ position: 'relative' }}>
          {/* Mention Suggestions Popover */}
          {showMentionPopup && mentionSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              width: 'min(100%, 320px)',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '0.4rem 0.65rem', fontSize: '0.72rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Matching players to tag:
              </div>
              {mentionSuggestions.map((usr) => (
                <div
                  key={usr.id}
                  onClick={() => handleSelectMention(usr)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: usr.profilePhoto
                      ? `url(${usr.profilePhoto}) center/cover no-repeat`
                      : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem'
                  }}>
                    {!usr.profilePhoto && usr.fullName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>{usr.fullName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'monospace' }}>@{usr.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Add commentary with player tags (type @ to tag someone)..."
              value={simText}
              onChange={handleCommentaryInputChange}
              style={{
                flex: '1 1 200px',
                background: 'var(--bg-input, rgba(255,255,255,0.04))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                color: 'var(--text-main, #fff)',
                fontSize: '0.85rem'
              }}
            />
            <button
              onClick={() => {
                handleScoreBall('BALL', 1, simText);
                setSimText('');
              }}
              disabled={isScoring || !simText}
              style={{
                background: 'var(--accent-primary, #10b981)',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.85rem'
              }}
            >
              <Send size={14} /> Send Ball
            </button>
          </div>
        </div>
      </div>

      {/* Ball-by-ball Commentary Feed (Paginated Reverse Chronological) */}
      <div style={{
        background: 'var(--bg-card-solid, #1e293b)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: 'clamp(1rem, 2vw, 1.5rem)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        boxShadow: 'var(--shadow-card)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-heading, #ffffff)' }}>
          Live Commentary & Score Events
        </h3>

        {events.length === 0 ? (
          <div style={{ color: 'var(--text-muted, #94a3b8)', textAlign: 'center', padding: '2rem' }}>
            No score events recorded yet for this match.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map((ev, idx) => (
              <div
                key={ev.seq || idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.04))'
                }}
              >
                <div style={{
                  background: ev.type === 'SIX' ? '#d97706' : ev.type === 'FOUR' ? '#059669' : ev.type === 'WICKET' ? '#dc2626' : '#475569',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 4,
                  minWidth: 45,
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  {ev.type}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main, #f8fafc)', lineHeight: 1.5, fontWeight: 500, wordBreak: 'break-word' }}>
                    {renderCommentaryWithMentions(ev.commentary)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: 3 }}>
                    Event #{ev.seq} • {new Date(ev.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cursor load more */}
        {eventsPagination?.hasMore && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              onClick={() => fetchEvents(eventsPagination.nextCursor, true)}
              disabled={loadingEvents}
              style={{
                background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                color: 'var(--text-main, #fff)',
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius-sm, 6px)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loadingEvents ? 'Loading...' : 'Load Earlier Commentary'}
            </button>
          </div>
        )}
      </div>

      {/* Live Match Streaming Broadcaster Control Modal */}
      {showStreamModal && (
        <LiveStreamManagerModal
          matchId={match.uuid || id}
          match={match}
          matchData={match}
          isOpen={showStreamModal}
          onClose={() => {
            setShowStreamModal(false);
            fetchStreamData();
          }}
          onStreamStatusChange={(updated) => {
            const streamInfo = updated?.stream || updated;
            setStreamData(streamInfo);
          }}
        />
      )}
    </div>
  );
};

export default MatchDetailPage;
