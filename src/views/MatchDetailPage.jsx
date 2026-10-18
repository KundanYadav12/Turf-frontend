'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useMatchLive } from '../hooks/useMatchLive';
import { Radio, ArrowLeft, Send, Trophy, MapPin, Calendar, Clock, ExternalLink, Zap } from 'lucide-react';
import ScoreCelebration from '../components/scorer/ScoreCelebration';

const MatchDetailPage = () => {
  const { id } = useParams();

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsPagination, setEventsPagination] = useState({ hasMore: false, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [ads, setAds] = useState({ topAd: null, bottomAd: null });

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
    const fetchMatch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/matches/${id}`);
        if (res.data.success && isMounted) {
          setMatch(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load match:', err);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Fetch ads
      try {
        const adsRes = await axios.get(`/api/matches/${id}/ads`);
        if (adsRes.data.success && isMounted) {
          setAds(adsRes.data.data);
        }
      } catch (e) {}
    };
    fetchMatch();
    return () => { isMounted = false; };
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

      {/* Back link & Scorer Launcher */}
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
    </div>
  );
};

export default MatchDetailPage;
