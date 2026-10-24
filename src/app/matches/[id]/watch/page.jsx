'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LiveStreamPlayer from '../../../../components/streaming/LiveStreamPlayer';
import { Radio, ArrowLeft, Share2, Check, Trophy, MapPin, Calendar, Clock, Tv } from 'lucide-react';

export default function MatchWatchPage({ params }) {
  const routeParams = useParams();
  const matchId = routeParams?.id || params?.id;

  const [match, setMatch] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!matchId) return;
    try {
      const [mRes, sRes] = await Promise.all([
        axios.get(`/api/matches/${matchId}`),
        axios.get(`/api/matches/${matchId}/stream`)
      ]);

      if (mRes.data?.success) setMatch(mRes.data.data);
      if (sRes.data?.success && sRes.data?.data) {
        const streamPayload = sRes.data.data.stream || sRes.data.data;
        setStream(streamPayload);
      }
    } catch (err) {
      console.warn('Watch page load note:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCopy = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Loading live match broadcast…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem' }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          href={`/matches/${matchId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#94a3b8',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Back to Match Scorecard
        </Link>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCopy}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
          >
            {copiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
            {copiedLink ? 'Copied Link!' : 'Share Stream'}
          </button>

          {match?.tournament?.id && (
            <Link
              href={`/tournaments/${match.tournament.id}`}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px', textDecoration: 'none' }}
            >
              <Trophy size={14} color="#10b981" />
              Tournament
            </Link>
          )}
        </div>
      </div>

      {/* Main Video Player Container */}
      <div style={{ marginBottom: '1.5rem' }}>
        <LiveStreamPlayer
          matchId={matchId}
          stream={stream}
          matchData={{
            teamAName: match?.teamAName || match?.team_a_name,
            teamBName: match?.teamBName || match?.team_b_name,
            liveScoreSummary: match?.score?.summary || match?.live_score_summary,
            liveSubtext: match?.score?.subtext || match?.live_subtext
          }}
          onRefresh={fetchDetails}
        />
      </div>

      {/* Match Meta Information Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: stream?.status === 'LIVE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                color: stream?.status === 'LIVE' ? '#ef4444' : '#94a3b8',
                border: `1px solid ${stream?.status === 'LIVE' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: stream?.status === 'LIVE' ? '#ef4444' : '#94a3b8' }} />
              {stream?.status === 'LIVE' ? 'LIVE STREAM' : (stream?.status || 'OFFLINE')}
            </span>

            {match?.tournament?.name && (
              <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                • {match.tournament.name}
              </span>
            )}
          </div>

          <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>
            {match?.teamAName || 'Team A'} vs {match?.teamBName || 'Team B'}
          </h2>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#94a3b8' }}>
            {match?.venueName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={13} /> {match.venueName} {match.courtName ? `• ${match.courtName}` : ''}
              </span>
            )}
            {match?.matchDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} /> {match.matchDate} {match.startTime ? `at ${match.startTime}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Live Scorecard Preview */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#38bdf8' }}>
            {match?.score?.summary || match?.live_score_summary || '0 - 0'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
            {match?.score?.subtext || match?.live_subtext || match?.status || 'Scheduled'}
          </div>
        </div>
      </div>
    </div>
  );
}
